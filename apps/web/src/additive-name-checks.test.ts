import { describe, expect, it } from 'vitest';
import type { FormulationRecord, IngredientRecord, ProductRecord } from '@aus-food/storage';
import { buildAdditiveNameReport } from './additive-name-checks';
import { buildIngredientRecord, emptyAdditiveSourceDraft, emptyIngredientDraft } from './ingredient-form';

const stamp = '2026-11-10T00:00:00.000Z';

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
    const report = buildAdditiveNameReport(ready, [formulation], [direct]);
    expect(report.declarations).toHaveLength(1);
    expect(report.additives[0]?.concentration).toMatchObject({ status: 'calculated', value: '100' });
    for (const sourceStatus of ['carriedOver', 'processingAid'] as const) {
      const source = direct.additiveSources![0]!;
      const result = buildAdditiveNameReport(ready, [formulation], [
        { ...direct, additiveSources: [{ ...source, sourceStatus }] },
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
    const result = buildAdditiveNameReport(ready, [formulation], [direct]).additives[0]!;
    expect(result.concentration).toMatchObject({
      status: 'calculated', value: '100', provenanceWarnings: [expect.stringContaining('no complete dated source')],
    });
    expect(result.permission.status).toBe('REVIEW REQUIRED');
  });

  it('calculates concentration entered for a direct additive ingredient without a source', () => {
      const draft = emptyIngredientDraft();
      draft.name = 'Sorbic acid';
      draft.kind = 'atomic';
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
        status: 'calculated', value: '950000', provenanceWarnings: [expect.stringContaining('no complete dated source')],
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
    expect(buildAdditiveNameReport(readyProduct, [formulation], [quantified]).additives[0]?.concentration.status)
      .toBe('calculated');
    const report = buildAdditiveNameReport(readyProduct, [withCompound], [quantified, compound]);
    expect(report.limitations.join(' ')).toContain('not included in this report');
    expect(report.additives[0]?.concentration).toMatchObject({
      status: 'review_required', reasons: expect.arrayContaining(['COMPOUND_ADDITIVES_NOT_PROPAGATED']),
    });
    expect(report.additives[0]?.permission.status).toBe('REVIEW REQUIRED');
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
