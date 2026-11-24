import { describe, expect, it } from 'vitest';
import type { FormulationRecord, IngredientRecord, ProductRecord } from '@aus-food/storage';
import { buildAdditiveNameReport } from './additive-name-checks';
import { buildIngredientRecord, emptyAdditiveSourceDraft, emptyIngredientDraft } from './ingredient-form';

const stamp = '2026-11-10T00:00:00.000Z';

function confirmAdditives(record: IngredientRecord): IngredientRecord {
  return {
    ...record, additivesConfirmed: true,
    additiveCoverage: {
      sourceType: 'user', sourceId: '', sourceDate: '',
      sourcesSnapshot: JSON.stringify(record.additiveSources ?? []),
    },
  };
}

const ingredient: IngredientRecord = {
  id: 'ing-1',
  name: 'Sweet base',
  recordType: 'ingredient',
  kind: 'atomic',
  tags: [],
  createdAt: stamp,
  updatedAt: stamp,
  additiveSources: [
    {
      id: 'src-1',
      additiveName: 'Sorbic acid',
      codeNumber: '200',
      technologicalPurposes: ['Preservative'],
      concentration: { value: '100', unit: 'mg/kg', basis: 'asAddedToIngredient' } as never,
      sourceEvidence: [{ id: 'ev-1', reference: 'spec', sourceDate: '2026-11-10', kind: 'supplierSpecification' }],
      sourceStatus: 'added',
    },
    { id: 'src-2', additiveName: 'Mystery additive', sourceStatus: 'added' },
  ],
};

const formulation: FormulationRecord = {
  id: 'form-1',
  name: 'Formulation',
  recordType: 'formulation',
  tags: [],
  createdAt: stamp,
  updatedAt: stamp,
  lines: [{ id: 'l1', kind: 'ingredient', ingredientId: 'ing-1', quantity: { value: '100', unit: 'g' } }],
};

const product: ProductRecord = {
  id: 'prod-1',
  name: 'Infant dessert',
  recordType: 'product',
  formulationId: 'form-1',
  foodState: 'asSold',
  tags: [],
  createdAt: stamp,
  updatedAt: stamp,
};

describe('buildAdditiveNameReport', () => {
  it('keeps per-use special and uncertain direct additives under review', () => {
    const direct: IngredientRecord = {
      ...ingredient, name: 'Sorbic acid', directAdditiveSourceId: 'src-1',
      additiveSources: [{
        id: 'src-1', additiveName: 'Sorbic acid', codeNumber: '200', sourceStatus: 'unknown',
        concentration: { value: '100', unit: 'mgPerKg', basis: 'asSupplied' },
      }],
    };
    const recipe: FormulationRecord = {
      ...formulation, lines: [
        { id: 'one', kind: 'ingredient', ingredientId: direct.id, quantity: { value: '50', unit: 'g' }, additiveUse: 'added' },
        { id: 'two', kind: 'ingredient', ingredientId: direct.id, quantity: { value: '50', unit: 'g' }, additiveUse: 'processingAid' },
      ],
    };
    const ready: ProductRecord = { ...product, additiveNameInputs: { confirmedCohorts: [], noProcessMassChangeConfirmed: true } };
    const report = buildAdditiveNameReport(ready, [recipe], [confirmAdditives(direct)]);
    expect(report.declarations).toHaveLength(2);
    expect(report.additives[0]?.concentration).toMatchObject({
      status: 'review_required', reasons: expect.arrayContaining(['SOURCE_NOT_ADDED']),
    });
    expect(report.additives[0]?.permission.status).toBe('REVIEW REQUIRED');
    const { directAdditiveSourceId, ...ordinary } = confirmAdditives(direct);
    expect(directAdditiveSourceId).toBe('src-1');
    expect(buildAdditiveNameReport(ready, [recipe], [ordinary]).error).toMatch(/no longer identified as an additive/);
  });
  it('does not calculate concentration when a recipe records a processing change', () => {
    const direct: IngredientRecord = {
      ...ingredient, directAdditiveSourceId: 'src-1',
      additiveSources: [{
        id: 'src-1', additiveName: 'Sorbic acid', codeNumber: '200', sourceStatus: 'unknown',
        concentration: { value: '100', unit: 'mgPerKg', basis: 'asSupplied' },
      }],
    };
    const ready: ProductRecord = {
      ...product, additiveNameInputs: { confirmedCohorts: [], noProcessMassChangeConfirmed: true },
    };
    const processed: FormulationRecord = {
      ...formulation, processMassProfile: {
        changes: [{ id: 'loss', kind: 'loss', mass: { value: '20', unit: 'g' } }],
      },
    };
    const report = buildAdditiveNameReport(ready, [processed], [confirmAdditives(direct)]);
    expect(report.additives[0]?.concentration).toMatchObject({
      status: 'review_required', reasons: expect.arrayContaining(['PROCESSING_EFFECTS_UNSUPPORTED']),
    });
    expect(report.limitations.join(' ')).toContain('recorded processing details');
    const nested: FormulationRecord = {
      ...formulation, id: 'nested',
      processMassProfile: processed.processMassProfile,
    };
    const outer: FormulationRecord = {
      ...formulation,
      lines: [{ id: 'n', kind: 'formulation', formulationId: 'nested', quantity: { value: '100', unit: 'g' } }],
    };
    expect(buildAdditiveNameReport(ready, [outer, nested], [direct]).additives[0]?.concentration)
      .toMatchObject({ status: 'review_required', reasons: expect.arrayContaining(['PROCESSING_EFFECTS_UNSUPPORTED']) });
    const equalFinal: FormulationRecord = {
      ...formulation, processMassProfile: {
        changes: [], entryMethod: 'finalMass', declaredFinalMass: { value: '100', unit: 'g' },
      },
    };
    expect(buildAdditiveNameReport(ready, [equalFinal], [direct]).additives[0]?.concentration)
      .toMatchObject({ status: 'review_required', reasons: expect.arrayContaining(['PROCESSING_EFFECTS_UNSUPPORTED']) });
    const incomplete: FormulationRecord = { ...formulation, processMassProfile: { changes: [], complete: false } };
    expect(buildAdditiveNameReport(ready, [incomplete], [direct]).additives[0]?.concentration)
      .toMatchObject({ status: 'review_required', reasons: expect.arrayContaining(['PROCESSING_EFFECTS_UNSUPPORTED']) });
  });
  it('traces a direct additive once and leaves unknown purity unresolved', () => {
    const direct: IngredientRecord = {
      ...ingredient, name: 'Sorbic acid', directAdditiveSourceId: 'src-1',
      additiveSources: [{ id: 'src-1', additiveName: 'Sorbic acid', codeNumber: '200', sourceStatus: 'unknown' }],
    };
    const report = buildAdditiveNameReport(product, [formulation], [direct]);
    expect(report.declarations).toHaveLength(1);
    expect(report.additives).toHaveLength(1);
    expect(report.additives[0]?.concentration.status).toBe('review_required');
    expect(report.additives[0]?.permission.status).toBe('REVIEW REQUIRED');
  });

  it('calculates a direct additive with known concentration and preserves explicit non-added statuses', () => {
    const direct: IngredientRecord = {
      ...ingredient, name: 'Sorbic acid', directAdditiveSourceId: 'src-1',
      additiveSources: [{
        ...ingredient.additiveSources![0]!, sourceStatus: 'unknown',
        concentration: { value: '100', unit: 'mgPerKg', basis: 'asSupplied' },
      }],
    };
    const ready: ProductRecord = {
      ...product, additiveNameInputs: { confirmedCohorts: [], noProcessMassChangeConfirmed: true },
    };
    const report = buildAdditiveNameReport(ready, [formulation], [confirmAdditives(direct)]);
    expect(report.declarations).toHaveLength(1);
    expect(report.additives[0]?.concentration).toMatchObject({ status: 'calculated', value: '100' });
    for (const sourceStatus of ['carriedOver', 'processingAid'] as const) {
      const source = direct.additiveSources![0]!;
      const result = buildAdditiveNameReport(ready, [formulation], [
        confirmAdditives({ ...direct, additiveSources: [{ ...source, sourceStatus }] }),
      ]);
      expect(result.additives[0]?.concentration).toMatchObject({
        status: 'review_required', reasons: expect.arrayContaining(['SOURCE_NOT_ADDED']),
      });
    }
  });

  it('calculates an unsourced direct additive but keeps permission under review', () => {
    const direct: IngredientRecord = {
      ...ingredient, name: 'Sorbic acid', directAdditiveSourceId: 'src-1',
      additiveSources: [{
        id: 'src-1', additiveName: 'Sorbic acid', codeNumber: '200', sourceStatus: 'unknown',
        concentration: { value: '100', unit: 'mgPerKg', basis: 'asSupplied' },
      }],
    };
    const ready: ProductRecord = {
      ...product, additiveNameInputs: { confirmedCohorts: [], noProcessMassChangeConfirmed: true,
        evidence: { reference: 'Calculation', sourceDate: '2026-11-10' } },
    };
    const result = buildAdditiveNameReport(ready, [formulation], [confirmAdditives(direct)]).additives[0]!;
    expect(result.concentration).toMatchObject({
      status: 'calculated', value: '100', provenanceWarnings: [],
    });
    expect(result.permission.status).toBe('REVIEW REQUIRED');
  });

  it('calculates concentration entered for a direct additive ingredient without a source', () => {
      const draft = emptyIngredientDraft();
      draft.name = 'Sorbic acid';
      draft.kind = 'atomic';
      draft.additivesConfirmed = true;
      const source = emptyAdditiveSourceDraft('direct');
      Object.assign(source, {
        codeNumber: '200', showAmount: true, concentrationValue: '95',
        concentrationUnit: 'percentByMass', concentrationBasis: 'asSupplied',
      });
      draft.directAdditiveSourceId = source.id;
      draft.additiveSources.push(source);
      const direct = buildIngredientRecord(draft, undefined, () => 'ing-1', stamp);
      const ready: ProductRecord = {
        ...product, additiveNameInputs: { confirmedCohorts: [], noProcessMassChangeConfirmed: true },
      };
      const result = buildAdditiveNameReport(ready, [formulation], [direct]);
      expect(result.additives[0]?.concentration).toMatchObject({
        status: 'calculated', value: '950000', provenanceWarnings: [],
      });
      expect(result.additives[0]?.permission.status).toBe('REVIEW REQUIRED');
  });

  it('does not present a partial total as calculated when a compound ingredient is present', () => {
    const quantified: IngredientRecord = {
      ...ingredient,
      additiveSources: [{
        ...ingredient.additiveSources![0]!,
        concentration: { value: '100', unit: 'mgPerKg', basis: 'asSupplied' },
      }],
    };
    const compound: IngredientRecord = {
      ...ingredient, id: 'blend', name: 'Blend', kind: 'compound', compoundFormulationId: 'inside',
      additiveSources: [],
    };
    const withCompound: FormulationRecord = {
      ...formulation,
      lines: [
        { id: 'l1', kind: 'ingredient', ingredientId: 'ing-1', quantity: { value: '50', unit: 'g' } },
        { id: 'l2', kind: 'ingredient', ingredientId: 'blend', quantity: { value: '50', unit: 'g' } },
      ],
    };
    const readyProduct: ProductRecord = {
      ...product, additiveNameInputs: { confirmedCohorts: [], noProcessMassChangeConfirmed: true },
    };
    expect(buildAdditiveNameReport(readyProduct, [formulation], [confirmAdditives(quantified)]).additives[0]?.concentration.status)
      .toBe('calculated');
    const report = buildAdditiveNameReport(readyProduct, [withCompound], [confirmAdditives(quantified), compound]);
    expect(report.limitations.join(' ')).toContain('compound composition is missing');
    expect(report.additives[0]?.concentration).toMatchObject({
      status: 'review_required', reasons: expect.arrayContaining(['COMPOUND_ADDITIVES_NOT_PROPAGATED']),
    });
    expect(report.additives[0]?.permission.status).toBe('REVIEW REQUIRED');
  });

  it('retains known additive evidence when recipe amounts are unknown', () => {
    const direct = confirmAdditives({
      ...ingredient, directAdditiveSourceId: 'src-1',
      additiveSources: [{
        id: 'src-1', additiveName: 'Sorbic acid', codeNumber: '200', sourceStatus: 'unknown',
        concentration: { value: '100', unit: 'mgPerKg', basis: 'asSupplied' },
      }],
    });
    const incomplete: FormulationRecord = {
      ...formulation, lines: [], incompleteRecipeLines: {
        unquantifiedLines: [{ id: 'unknown', kind: 'ingredient', ingredientId: direct.id }],
        lineOrder: ['unknown'],
      },
    };
    const report = buildAdditiveNameReport(product, [incomplete], [direct]);
    expect(report.error).toMatch(/unknown amounts/);
    expect(report.declarations[0]?.candidate.sourcePath).toEqual(['form-1', 'unknown', 'ing-1']);
    expect(report.additives[0]?.concentration).toMatchObject({
      status: 'review_required', reasons: expect.arrayContaining(['FORMULATION_AMOUNTS_MISSING']),
    });
    expect(report.names).toBeUndefined();
  });

  it('propagates compound additives and repeated uses once per path', () => {
    const direct = confirmAdditives({
      ...ingredient, id: 'direct', name: 'Preservative', directAdditiveSourceId: 'direct-source',
      additiveSources: [{
        id: 'direct-source', additiveName: 'Preservative', codeNumber: '200', sourceStatus: 'unknown',
        concentration: { value: '10000', unit: 'mgPerKg', basis: 'asSupplied' },
      }],
    });
    const filler = confirmAdditives({ ...ingredient, id: 'filler', name: 'Filler', additiveSources: [] });
    const compound: IngredientRecord = {
      ...ingredient, id: 'blend', name: 'Blend', kind: 'compound', compoundFormulationId: 'inside',
      additiveSources: [],
    };
    const inside: FormulationRecord = {
      ...formulation, id: 'inside', name: 'Blend recipe',
      supplierComposition: { coverage: 'complete', unquantifiedComponents: [] },
      lines: [
        { id: 'additive', kind: 'ingredient', ingredientId: direct.id, quantity: { value: '10', unit: 'g' } },
        { id: 'filler', kind: 'ingredient', ingredientId: filler.id, quantity: { value: '90', unit: 'g' } },
      ],
    };
    const outer: FormulationRecord = {
      ...formulation, lines: [
        { id: 'mix', kind: 'ingredient', ingredientId: compound.id, quantity: { value: '50', unit: 'g' } },
        { id: 'direct', kind: 'ingredient', ingredientId: direct.id, quantity: { value: '5', unit: 'g' } },
        { id: 'filler', kind: 'ingredient', ingredientId: filler.id, quantity: { value: '45', unit: 'g' } },
      ],
    };
    const ready = { ...product, additiveNameInputs: { confirmedCohorts: [], noProcessMassChangeConfirmed: true } };
    const report = buildAdditiveNameReport(ready, [outer, inside], [compound, direct, filler]);
    expect(report.declarations).toHaveLength(2);
    expect(report.additives[0]?.concentration).toMatchObject({
      status: 'calculated', value: '1000',
      contributions: [
        { sourcePath: ['form-1', 'mix', 'blend', 'inside', 'additive', 'direct'], additiveMilligrams: '50' },
        { sourcePath: ['form-1', 'direct', 'direct'], additiveMilligrams: '50' },
      ],
      provenanceWarnings: [],
    });
    expect(report.additives[0]?.permission.status).toBe('REVIEW REQUIRED');

    const special = { ...inside, lines: [{ ...inside.lines[0]!, additiveUse: 'processingAid' as const }, inside.lines[1]!] };
    expect(buildAdditiveNameReport(ready, [outer, special], [compound, direct, filler]).additives[0]?.concentration)
      .toMatchObject({ status: 'review_required', reasons: expect.arrayContaining(['SOURCE_NOT_ADDED']) });
    const overlap = { ...compound, additiveSources: direct.additiveSources! };
    expect(buildAdditiveNameReport(ready, [outer, inside], [overlap, direct, filler]).additives[0]?.concentration)
      .toMatchObject({ status: 'review_required', reasons: expect.arrayContaining(['COMPOUND_ADDITIVE_EVIDENCE_OVERLAP']) });
    expect(buildAdditiveNameReport(ready, [outer, inside], [compound, direct, { ...filler, additivesConfirmed: false }]).additives[0]?.concentration)
      .toMatchObject({ status: 'review_required', reasons: expect.arrayContaining(['ADDITIVE_COVERAGE_INCOMPLETE']) });
    expect(buildAdditiveNameReport(ready, [outer, inside], [compound, direct]).additives[0]?.concentration)
      .toMatchObject({ status: 'review_required', reasons: expect.arrayContaining(['ADDITIVE_COVERAGE_INCOMPLETE']) });
    const partial = { ...inside, lines: [inside.lines[1]!], supplierComposition: {
      coverage: 'partial' as const, unquantifiedComponents: [{ id: 'unknown', kind: 'ingredient' as const, ingredientId: direct.id }],
    } };
    const incomplete = buildAdditiveNameReport(ready, [outer, partial], [compound, direct, filler]);
    expect(incomplete.declarations).toHaveLength(2);
    expect(incomplete.additives[0]?.concentration).toMatchObject({
      status: 'review_required', reasons: expect.arrayContaining(['COMPOUND_ADDITIVES_NOT_PROPAGATED', 'FORMULATION_AMOUNTS_MISSING']),
    });
  });
  it('never produces PASS or FAIL from the shipped draft data and keeps declarations separate', () => {
    const report = buildAdditiveNameReport(
      {
        ...product,
        additiveNameInputs: {
          confirmedCohorts: ['food_for_infants'],
          additiveCategoryId: 'category-13-2',
          outputUnit: 'mg/kg',
          noProcessMassChangeConfirmed: true,
          gmpConfirmed: false,
          addedSugarsPer100g: '5',
          sugarsBasisConfirmed: true,
          evidence: { reference: 'calc', sourceDate: '2026-11-10' },
        },
      },
      [formulation],
      [ingredient],
    );
    expect(report.declarations).toHaveLength(2);
    expect(report.uncodedAdditives).toEqual(['Mystery additive']);
    expect(report.additives).toHaveLength(1);
    const statuses = [report.additives[0]?.permission.status, report.names?.status, report.sweetened?.status];
    expect(statuses).toEqual(['REVIEW REQUIRED', 'REVIEW REQUIRED', 'REVIEW REQUIRED']);
    expect(report.sweetened?.value?.reasons).toContain('RULE_NOT_APPROVED');
  });

  it('returns review reasons when no cohort, process or evidence data is entered', () => {
    const report = buildAdditiveNameReport(product, [formulation], [ingredient]);
    expect(report.names?.value?.reasons).toContain('COHORT_NOT_CONFIRMED');
    const concentration = report.additives[0]?.concentration;
    expect(concentration?.status).toBe('review_required');
    expect(report.additives[0]?.permission.status).toBe('REVIEW REQUIRED');
    expect(report.sweetened?.value?.outcome).toBe('review');
  });

  it('reports an expansion error instead of results for a missing formulation', () => {
    const report = buildAdditiveNameReport(product, [], [ingredient]);
    expect(report.error).toBeTruthy();
    expect(report.additives).toHaveLength(0);
  });

  it('adds previews only on request and never changes the official status', () => {
    const confirmed: ProductRecord = {
      ...product,
      additiveNameInputs: {
        confirmedCohorts: ['food_for_infants'],
        additiveCategoryId: 'category-13-2',
        outputUnit: 'mg/kg',
        noProcessMassChangeConfirmed: true,
        gmpConfirmed: false,
        addedSugarsPer100g: '5',
        sugarsBasisConfirmed: true,
        evidence: { reference: 'calc', sourceDate: '2026-11-10' },
      },
    };
    const off = buildAdditiveNameReport(confirmed, [formulation], [ingredient]);
    expect(off.sweetenedPreview).toBeUndefined();
    expect(off.additives[0]?.preview).toBeUndefined();

    const on = buildAdditiveNameReport(confirmed, [formulation], [ingredient], true);
    expect(on.sweetened?.status).toBe(off.sweetened?.status);
    expect(on.additives[0]?.permission.status).toBe(off.additives[0]?.permission.status);
    expect(on.names?.status).toBe('REVIEW REQUIRED');
    expect(on.sweetenedPreview?.eligible).toBe(true);
    expect(on.sweetenedPreview?.illustrativeStatus).toBeDefined();
    expect(on.additives[0]?.preview).toBeDefined();
    expect(on.sweetenedPreview).not.toHaveProperty('status');
  });

  it('does not preview when facts are missing', () => {
    const report = buildAdditiveNameReport(product, [formulation], [ingredient], true);
    expect(report.sweetenedPreview?.eligible).toBe(false);
    expect(report.additives[0]?.preview?.eligible).toBe(false);
  });});
