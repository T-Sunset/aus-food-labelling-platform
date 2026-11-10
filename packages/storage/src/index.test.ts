import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import type {
  IngredientAdditiveSource,
  ProductClassificationEvidence,
  ProductClassificationProfile,
} from '@aus-food/domain';
import {
  BackupIntegrityError,
  BackupPassphraseError,
  BackupFormatError,
  openLocalFoodStore,
  RecordValidationError,
  RepositoryConflictError,
  RepositoryCycleError,
  RepositoryNotFoundError,
  RestoreConflictError,
  type ApprovedVersionRecord,
  type FormulationRecord,
  type IngredientRecord,
  type ProductRecord,
} from './index.js';

const stores: { name: string; close: () => void }[] = [];

function usageMarker(initiallyUsed = false) {
  let used = initiallyUsed;
  return {
    wasPreviouslyUsed: () => used,
    markUsed: () => { used = true; },
    isUsed: () => used,
  };
}

async function openTestStore() {
  const name = `food-test-${crypto.randomUUID()}`;
  const store = await openLocalFoodStore({
    name,
    now: () => '2026-11-09T12:00:00.000Z',
  });
  stores.push({ name, close: store.close });
  return store;
}

afterEach(async () => {
  await Promise.all(stores.splice(0).map(async ({ name, close }) => {
    close();
    await Dexie.delete(name);
  }));
});

const ingredient: IngredientRecord = {
  id: 'ing-1',
  name: 'Oats',
  recordType: 'ingredient',
  kind: 'atomic',
  tags: ['grain'],
  createdAt: '2026-11-09T10:00:00.000Z',
  updatedAt: '2026-11-09T10:00:00.000Z',
};

const formulation: FormulationRecord = {
  id: 'form-1',
  name: 'Oat base',
  recordType: 'formulation',
  lines: [{ id: 'line-1', kind: 'ingredient', ingredientId: ingredient.id, quantity: { value: '100', unit: 'g' } }],
  tags: [],
  createdAt: '2026-11-09T10:00:00.000Z',
  updatedAt: '2026-11-09T10:00:00.000Z',
};

const product: ProductRecord = {
  id: 'product-1',
  name: 'Oat drink',
  recordType: 'product',
  formulationId: formulation.id,
  foodState: 'asSold',
  tags: ['beverage'],
  createdAt: '2026-11-09T10:00:00.000Z',
  updatedAt: '2026-11-09T10:00:00.000Z',
};

function emptyClassificationProfile(): ProductClassificationProfile {
  const unknownFact = () => ({ answer: 'unknown' as const, evidence: [] });
  return {
    intendedUseDescription: '',
    intendedConsumerDescription: '',
    processingDescription: '',
    presentationDescription: '',
    identityEvidence: [],
    formulatedCaffeinatedBeverage: {
      flavoured: unknownFact(),
      nonAlcoholic: unknownFact(),
      containsCaffeine: unknownFact(),
      representedForMentalPerformance: unknownFact(),
    },
    foodForInfants: {
      intendedAsNourishmentForInfants: unknownFact(),
      infantFormulaProduct: unknownFact(),
      formulatedMealReplacement: unknownFact(),
      formulatedSupplementaryFood: unknownFact(),
      unprocessedFruitOrVegetables: unknownFact(),
    },
  };
}

function classificationEvidence(id: string): ProductClassificationEvidence {
  return {
    id,
    reference: `supplier file ${id}`,
    sourceDate: '2026-11-09',
    kind: 'supplierSpecification',
  };
}

const reviewResult = {
  title: 'Ingredient evidence review',
  whatWasChecked: 'Evidence was recorded for the ingredient.',
  rule: {
    id: 'draft.evidence',
    name: 'Draft evidence rule',
    instrument: 'Australia New Zealand Food Standards Code',
    provision: '1.2.4-2',
    sourceUrl: 'https://www.legislation.gov.au/example',
    jurisdiction: 'Australia and New Zealand',
    effectiveFrom: '2026-11-09',
    version: '0.1.0-draft',
    mappingConfidence: 'Provision',
  },
  inputs: [{
    name: 'ingredient',
    value: 'Oats',
    sourceId: 'supplier-record-1',
    sourceDate: '2026-11-09',
    sourcePath: ['ing-1'],
  }],
  explanation: 'A human review is required.',
  status: 'REVIEW REQUIRED',
  applicationMode: 'CANDIDATE',
  nonCertificationStatement: 'This result assists review and does not certify legal compliance.',
} as const;

function approvedVersion(
  snapshot: IngredientRecord | FormulationRecord | ProductRecord,
  version = 1,
): ApprovedVersionRecord {
  const id = `${snapshot.recordType}:${snapshot.id}:${version}`;
  return {
    id,
    recordType: snapshot.recordType,
    recordId: snapshot.id,
    version,
    approvedAt: '2026-11-09T11:00:00.000Z',
    approvedBy: 'reviewer-1',
    reviewDecision: {
      id: `decision:${id}`,
      versionId: id,
      decision: 'approved',
      reviewerId: 'reviewer-1',
      decidedAt: '2026-11-09T11:00:00.000Z',
      rationale: 'Reviewed for this test.',
    },
    results: [],
    snapshot,
  };
}

describe('local draft repositories', () => {
  it('creates, reads, lists, updates and deletes ingredient, formulation and product records', async () => {
    const store = await openTestStore();
    await store.ingredients.create(ingredient);
    await store.formulations.create(formulation);
    await store.products.create(product);

    expect(await store.ingredients.get(ingredient.id)).toEqual(ingredient);
    expect(await store.formulations.list()).toEqual([formulation]);
    expect(await store.products.list()).toEqual([product]);

    const updated = await store.ingredients.update(ingredient.id, { name: 'Rolled oats' });
    expect(updated).toMatchObject({
      ...ingredient,
      name: 'Rolled oats',
      updatedAt: '2026-11-09T12:00:00.000Z',
    });
    expect(await store.ingredients.get(ingredient.id)).toEqual(updated);

    await store.products.delete(product.id);
    expect(await store.products.get(product.id)).toBeUndefined();
    await expect(store.products.delete(product.id)).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it('rejects duplicate IDs, missing updates and invalid records', async () => {
    const store = await openTestStore();
    await store.ingredients.create(ingredient);
    await expect(store.ingredients.create(ingredient)).rejects.toBeInstanceOf(RepositoryConflictError);
    await expect(store.ingredients.update('missing', { name: 'Not found' }))
      .rejects.toBeInstanceOf(RepositoryNotFoundError);
    await expect(store.ingredients.create({
      ...ingredient,
      id: 'ing-invalid',
      tags: ['duplicate', 'duplicate'],
    })).rejects.toBeInstanceOf(RecordValidationError);
    await expect(store.ingredients.update(ingredient.id, {
      kind: 'atomic',
      compoundFormulationId: 'form-1',
    })).rejects.toBeInstanceOf(RecordValidationError);
  });

  it('stores additive source identity, status, concentration and dated evidence with the ingredient path', async () => {
    const source: IngredientAdditiveSource = {
    id: 'additive-source-1',
    additiveName: 'Example preservative',
    codeNumber: '999',
    technologicalPurposes: ['preservation'],
    concentration: {
      value: '12',
      unit: 'mgPerKg',
      basis: 'asSupplied',
    },
    sourceEvidence: [{
      id: 'additive-evidence-1',
      reference: 'Supplier specification, section 4',
      sourceDate: '2026-11-09',
      kind: 'supplierSpecification',
    }],
    sourceStatus: 'carriedOver',
    allergenAssessments: { milk: 'present' },
    declarationSelection: {
      route: 'schedule7Class',
      schedule7ClassName: 'Example source class',
      substanceChoice: 'schedule8Name',
    },
    };
    const ingredientWithAdditive: IngredientRecord = {
    ...ingredient,
    additiveSources: [source, {
      id: 'additive-source-2',
      additiveName: 'Unspecified additive',
      sourceStatus: 'unknown',
    }],
    };
    const store = await openTestStore();
    await store.ingredients.create(ingredientWithAdditive);

    expect(await store.ingredients.get(ingredient.id)).toEqual(ingredientWithAdditive);

    const backup = await store.exportBackup({ encryption: 'none' });
    const restored = await openTestStore();
    await restored.restoreBackup(backup);
    expect(await restored.ingredients.get(ingredient.id)).toEqual(ingredientWithAdditive);
  });

  it('rejects malformed additive concentration and evidence while allowing missing source details', async () => {
    const store = await openTestStore();
    await expect(store.ingredients.create({
    ...ingredient,
    id: 'ing-zero-additive',
    additiveSources: [{
      id: 'additive-source-zero',
      additiveName: 'Example preservative',
      sourceStatus: 'unknown',
      concentration: { value: '0', unit: 'mgPerKg', basis: 'unknown' },
    }],
    })).rejects.toBeInstanceOf(RecordValidationError);

    await expect(store.ingredients.create({
    ...ingredient,
    id: 'ing-invalid-additive-evidence',
    additiveSources: [{
      id: 'additive-source-invalid-evidence',
      additiveName: 'Example preservative',
      sourceStatus: 'added',
      sourceEvidence: [{
        id: 'invalid-evidence',
        reference: 'Supplier specification',
        sourceDate: 'not-a-date',
        kind: 'supplierSpecification',
      }],
    }],
    })).rejects.toBeInstanceOf(RecordValidationError);

    await expect(store.ingredients.create({
    ...ingredient,
    id: 'ing-additive-allergen-without-evidence',
    additiveSources: [{
      id: 'additive-source-no-allergen-evidence',
      additiveName: 'Example preservative',
      sourceStatus: 'unknown',
      allergenAssessments: { milk: 'present' },
    }],
    })).rejects.toBeInstanceOf(RecordValidationError);

    const incomplete: IngredientRecord = {
    ...ingredient,
    id: 'ing-incomplete-additive',
    additiveSources: [{
      id: 'additive-source-incomplete',
      additiveName: 'Unspecified additive',
      sourceStatus: 'unknown',
    }],
    };
    await store.ingredients.create(incomplete);
    expect(await store.ingredients.get(incomplete.id)).toEqual(incomplete);
  });

  it('stores dated classification facts and their source references with a product draft', async () => {
    const store = await openTestStore();
    const profile = emptyClassificationProfile();
    const productWithClassification: ProductRecord = {
      ...product,
      classificationProfile: {
        ...profile,
        intendedUseDescription: 'Presented as a flavoured beverage',
        formulatedCaffeinatedBeverage: {
          ...profile.formulatedCaffeinatedBeverage,
          flavoured: {
            answer: 'yes',
            evidence: [classificationEvidence('flavour-spec')],
          },
        },
      },
    };

    await store.products.create(productWithClassification);

    expect(await store.products.get(product.id)).toEqual(productWithClassification);
  });

  it('stores and validates person-entered additive and name inputs on a product', async () => {
    const store = await openTestStore();
    const withInputs: ProductRecord = {
      ...product,
      additiveNameInputs: {
        confirmedCohorts: ['food_for_infants'],
        additiveCategoryId: 'category-13-2',
        outputUnit: 'mg/kg',
        noProcessMassChangeConfirmed: true,
        gmpConfirmed: false,
        addedSugarsPer100g: '4.5',
        sugarsBasisConfirmed: true,
        evidence: { reference: 'calc sheet', sourceDate: '2026-11-10' },
        finalDensity: { gramsPerMillilitre: '1.03', evidenceReference: 'lab note', sourceDate: '2026-11-10' },
      },
    };
    await store.products.create(withInputs);
    expect(await store.products.get(product.id)).toEqual(withInputs);

    const invalid: Record<string, unknown>[] = [
      { confirmedCohorts: ['bread'] },
      { confirmedCohorts: ['food_for_infants', 'food_for_infants'] },
      { confirmedCohorts: [], addedSugarsPer100g: '-1' },
      { confirmedCohorts: [], addedSugarsPer100g: 'abc' },
      { confirmedCohorts: [], outputUnit: 'g/kg' },
      { confirmedCohorts: [], evidence: { reference: '', sourceDate: '2026-11-10' } },
      { confirmedCohorts: [], evidence: { reference: 'x', sourceDate: 'tomorrow' } },
      { confirmedCohorts: [], finalDensity: { gramsPerMillilitre: '0', evidenceReference: 'x', sourceDate: '2026-11-10' } },
      { confirmedCohorts: [], gmpConfirmed: 'yes' },
    ];
    for (const additiveNameInputs of invalid) {
      await expect(
        store.products.update(product.id, { additiveNameInputs } as never),
      ).rejects.toBeInstanceOf(RecordValidationError);
    }
  });
});

describe('immutable approved versions', () => {
  it('stores independent, read-only snapshots and supports distinct version history', async () => {
    const store = await openTestStore();
    await store.ingredients.create(ingredient);
    const snapshot = await store.ingredients.get(ingredient.id);
    if (snapshot === undefined) {
      throw new Error('Expected the ingredient draft to exist');
    }
    const first = approvedVersion(snapshot);
    await store.approvedVersions.create(first);

    await store.ingredients.update(ingredient.id, { name: 'Updated oats' });
    expect((await store.approvedVersions.get(first.id))?.snapshot.name).toBe('Oats');
    const readVersion = await store.approvedVersions.get(first.id);
    if (readVersion === undefined) {
      throw new Error('Expected the approved version to exist');
    }
    Object.assign(readVersion.snapshot, { name: 'Changed only in memory' });
    expect((await store.approvedVersions.get(first.id))?.snapshot.name).toBe('Oats');

    const updatedDraft = await store.ingredients.get(ingredient.id);
    if (updatedDraft === undefined) {
      throw new Error('Expected the ingredient draft to exist');
    }
    const second = approvedVersion(updatedDraft, 2);
    await store.approvedVersions.create(second);
    expect(await store.approvedVersions.list('ingredient', ingredient.id)).toHaveLength(2);
  });

  it('rejects overwriting approved versions and mismatched or invalid snapshots', async () => {
    const store = await openTestStore();
    await store.ingredients.create(ingredient);
    const version = approvedVersion(ingredient);
    await store.approvedVersions.create(version);
    await expect(store.approvedVersions.create(version)).rejects.toBeInstanceOf(RepositoryConflictError);
    const duplicateDecisionVersion = approvedVersion(ingredient, 2);
    await expect(store.approvedVersions.create({
      ...duplicateDecisionVersion,
      reviewDecision: {
        ...version.reviewDecision,
        versionId: duplicateDecisionVersion.id,
      },
    })).rejects.toBeInstanceOf(RepositoryConflictError);
    await expect(store.approvedVersions.create({
      ...version,
      id: 'wrong-snapshot',
      recordId: 'different-id',
    })).rejects.toBeInstanceOf(RecordValidationError);
    await expect(store.approvedVersions.create({
      ...version,
      id: 'invalid-version',
      version: 0,
    })).rejects.toBeInstanceOf(RecordValidationError);
  });
});

describe('transactional approval', () => {
  it('writes the version snapshot and review decision atomically', async () => {
    const store = await openTestStore();
    await store.ingredients.create(ingredient);
    const approved = await store.approvedVersions.approveDraft('ingredient', ingredient.id, {
      reviewDecisionId: 'decision-1',
      reviewerId: 'reviewer-1',
      rationale: 'Reviewed ingredient evidence.',
      results: [reviewResult],
    });
    expect(approved).toMatchObject({
      version: 1,
      snapshot: ingredient,
      results: [reviewResult],
      reviewDecision: {
        id: 'decision-1',
        versionId: approved.id,
        decision: 'approved',
      },
    });

    await expect(store.approvedVersions.approveDraft('ingredient', ingredient.id, {
      reviewDecisionId: 'decision-1',
      reviewerId: 'reviewer-1',
      rationale: 'Duplicate decision id forces transaction abort.',
    })).rejects.toBeInstanceOf(RepositoryConflictError);
    expect(await store.approvedVersions.list('ingredient', ingredient.id)).toHaveLength(1);
    expect(await store.recoveryPoints.list()).toHaveLength(0);
  });
});

describe('schema migrations and recovery points', () => {
  it('preserves a pre-migration snapshot and marks legacy decisions as unverified', async () => {
    const name = `food-legacy-${crypto.randomUUID()}`;
    const legacy = new Dexie(name);
    legacy.version(1).stores({
      ingredients: 'id, name, supplierName, kind, updatedAt, *tags',
      formulations: 'id, name, updatedAt, *tags',
      products: 'id, name, formulationId, updatedAt, *tags',
      approvedVersions: 'id, &[recordType+recordId+version]',
    });
    await legacy.open();
    await legacy.table('ingredients').add(ingredient);
    await legacy.table('approvedVersions').add({
      id: 'ingredient:ing-1:1',
      recordType: 'ingredient',
      recordId: 'ing-1',
      version: 1,
      approvedAt: '2026-11-09T11:00:00.000Z',
      approvedBy: 'reviewer-1',
      snapshot: ingredient,
    });
    legacy.close();

    const marker = usageMarker();
    const store = await openLocalFoodStore({ name, usageMarker: marker });
    stores.push({ name, close: store.close });
    const recoveryPoints = await store.recoveryPoints.list();
    expect(recoveryPoints).toHaveLength(1);
    expect(recoveryPoints[0]?.records.ingredients).toEqual([ingredient]);
    expect((await store.approvedVersions.get('ingredient:ing-1:1'))?.reviewDecision.decision)
      .toBe('legacy_unverified');
    expect(marker.isUsed()).toBe(true);
  });

  it('rolls back a failed upgrade and retains the original schema and records', async () => {
    const name = `food-legacy-broken-${crypto.randomUUID()}`;
    const legacy = new Dexie(name);
    legacy.version(1).stores({
      ingredients: 'id, name, supplierName, kind, updatedAt, *tags',
      formulations: 'id, name, updatedAt, *tags',
      products: 'id, name, formulationId, updatedAt, *tags',
      approvedVersions: 'id, &[recordType+recordId+version]',
    });
    await legacy.open();
    await legacy.table('ingredients').add(ingredient);
    await legacy.table('approvedVersions').add({
      id: 'broken-version',
      recordType: 'ingredient',
      recordId: 'ing-1',
      version: 1,
      approvedAt: 'not-a-date',
      approvedBy: 'reviewer-1',
      snapshot: ingredient,
    });
    legacy.close();

    await expect(openLocalFoodStore({ name })).rejects.toThrow('legacy approved version');
    const stillLegacy = new Dexie(name);
    stillLegacy.version(1).stores({
      ingredients: 'id, name, supplierName, kind, updatedAt, *tags',
      formulations: 'id, name, updatedAt, *tags',
      products: 'id, name, formulationId, updatedAt, *tags',
      approvedVersions: 'id, &[recordType+recordId+version]',
    });
    await stillLegacy.open();
    expect(await stillLegacy.table('ingredients').get(ingredient.id)).toEqual(ingredient);
    expect((await stillLegacy.table('approvedVersions').get('broken-version'))?.approvedAt).toBe('not-a-date');
    stillLegacy.close();
    await Dexie.delete(name);
  });
});

describe('versioned workspace backups', () => {
  it('exports encrypted by passphrase and restores all records on an empty profile', async () => {
    const source = await openTestStore();
    await source.ingredients.create(ingredient);
    await source.formulations.create(formulation);
    await source.products.create(product);
    await source.approvedVersions.approveDraft('ingredient', ingredient.id, {
      reviewDecisionId: 'backup-decision',
      reviewerId: 'reviewer-1',
      rationale: 'Backup fixture approval.',
      results: [reviewResult],
    });
    const backup = await source.exportBackup({
      encryption: 'passphrase',
      passphrase: 'correct horse battery staple',
    });
    expect(backup).not.toContain('Oats');
    expect(backup).not.toContain('reviewer-1');

    const target = await openTestStore();
    const inspection = await target.inspectBackup(backup, 'correct horse battery staple');
    expect(inspection).toMatchObject({
      backupCounts: { ingredients: 1, formulations: 1, products: 1, approvedVersions: 1 },
      requiresExplicitReplace: false,
    });
    await target.restoreBackup(backup, { passphrase: 'correct horse battery staple' });
    expect(await target.ingredients.list()).toEqual([ingredient]);
    expect(await target.formulations.list()).toEqual([formulation]);
    expect(await target.products.list()).toEqual([product]);
    expect(await target.approvedVersions.list('ingredient', ingredient.id)).toMatchObject([
      { results: [reviewResult] },
    ]);
  });

  it('requires a valid passphrase and rejects corrupted or unsupported backups', async () => {
    const source = await openTestStore();
    await source.ingredients.create(ingredient);
    const encrypted = await source.exportBackup({ encryption: 'passphrase', passphrase: 'secret' });
    const target = await openTestStore();
    await expect(target.inspectBackup(encrypted)).rejects.toBeInstanceOf(BackupPassphraseError);
    await expect(target.inspectBackup(encrypted, 'wrong')).rejects.toBeInstanceOf(BackupPassphraseError);

    const plaintext = await source.exportBackup({ encryption: 'none' });
    const changed = JSON.parse(plaintext) as {
      payload: { ingredients: { name: string }[] };
    };
    changed.payload.ingredients[0]!.name = 'Tampered';
    await expect(target.inspectBackup(JSON.stringify(changed))).rejects.toBeInstanceOf(BackupIntegrityError);
    await expect(target.inspectBackup('{"format":"unknown","formatVersion":1}'))
      .rejects.toBeInstanceOf(BackupFormatError);
  });

  it('exposes plaintext export warning and requires explicit replacement rather than merging', async () => {
    const source = await openTestStore();
    await source.ingredients.create(ingredient);
    await source.formulations.create(formulation);
    await source.products.create(product);
    const plaintext = await source.exportBackup({ encryption: 'none' });
    expect(JSON.parse(plaintext)).toMatchObject({
      encrypted: false,
      warning: expect.stringContaining('unencrypted'),
    });

    const target = await openTestStore();
    await target.ingredients.create({ ...ingredient, id: 'existing', name: 'Existing record' });
    const inspection = await target.inspectBackup(plaintext);
    expect(inspection.requiresExplicitReplace).toBe(true);
    expect(inspection.conflictingRecordIds).toEqual([]);
    await expect(target.restoreBackup(plaintext)).rejects.toBeInstanceOf(RestoreConflictError);

    await target.restoreBackup(plaintext, { replaceExisting: true });
    expect(await target.ingredients.list()).toEqual([ingredient]);
  });

  it('round-trips incomplete draft references without inventing related records', async () => {
    const source = await openTestStore();
    const partialProduct: ProductRecord = {
      ...product,
      id: 'partial-product',
      formulationId: 'formulation-to-be-added-later',
    };
    await source.products.create(partialProduct);
    const backup = await source.exportBackup({ encryption: 'none' });

    const target = await openTestStore();
    await target.restoreBackup(backup);
    expect(await target.products.list()).toEqual([partialProduct]);
    expect(await target.formulations.list()).toEqual([]);
  });

  it('rejects circular formulation references in imported data', async () => {
    const store = await openTestStore();
    await store.ingredients.create(ingredient);
    const first = {
      ...formulation,
      lines: [{ id: 'loop', kind: 'formulation' as const, formulationId: 'form-1', quantity: { value: '1', unit: 'g' as const } }],
    };
    await expect(store.formulations.create(first)).rejects.toBeInstanceOf(RepositoryCycleError);
    await store.formulations.create(formulation);
    await expect(store.formulations.update(formulation.id, { lines: first.lines }))
      .rejects.toBeInstanceOf(RepositoryCycleError);
    expect(await store.formulations.get(formulation.id)).toEqual(formulation);

    const plaintext = await store.exportBackup({ encryption: 'none' });
    const tampered = JSON.parse(plaintext) as {
      payload: { formulations: FormulationRecord[] };
      sha256: string;
    };
    tampered.payload = {
      ...tampered.payload,
      formulations: tampered.payload.formulations.map((record) => ({ ...record, lines: first.lines })),
    };
    const bytes = new TextEncoder().encode(JSON.stringify(tampered.payload));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    tampered.sha256 = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    await expect(store.inspectBackup(JSON.stringify(tampered))).rejects.toBeInstanceOf(BackupFormatError);
  });
});

describe('storage durability and cleared-store detection', () => {
  it('detects an empty database using a non-sensitive external usage marker', async () => {
    const name = `food-marker-${crypto.randomUUID()}`;
    const marker = usageMarker();
    const first = await openLocalFoodStore({ name, usageMarker: marker });
    await first.ingredients.create(ingredient);
    first.close();
    await Dexie.delete(name);

    const reopened = await openLocalFoodStore({ name, usageMarker: marker });
    stores.push({ name, close: reopened.close });
    expect(reopened.workspaceUsageMarkerAvailable).toBe(true);
    expect(reopened.workspaceWasPreviouslyUsed).toBe(true);
    expect(await reopened.ingredients.list()).toEqual([]);
  });

  it('reports whether the browser supports and grants durable storage', async () => {
    const store = await openTestStore();
    const status = await store.requestDurableStorage();
    expect(typeof status.supported).toBe('boolean');
    if (!status.supported) {
      expect(status.granted).toBe(false);
    }
  });
});
