import { describe, expect, it } from 'vitest';
import type { FormulationRecord, IngredientRecord, ProductRecord } from '@aus-food/storage';
import { buildAdditiveNameReport } from './additive-name-checks';

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
});
