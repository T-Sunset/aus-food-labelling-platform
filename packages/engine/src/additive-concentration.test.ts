import { describe, expect, it } from 'vitest';
import type {
  AdditiveConcentration,
  AdditiveDensityEvidence,
  AdditiveFinalConcentrationInput,
  ExpandedIngredient,
  IngredientAdditiveSource,
} from '@aus-food/domain';
import { calculateAdditiveFinalConcentration } from './additive-concentration.js';
import { calculateProcessMassBalance } from './process-mass.js';

const evidence = [{
  id: 'ev-1',
  reference: 'Supplier specification 4',
  sourceDate: '2026-11-01',
  kind: 'supplierSpecification' as const,
}];

function source(
  id: string,
  concentration: AdditiveConcentration | undefined,
  overrides: Partial<IngredientAdditiveSource> = {},
): IngredientAdditiveSource {
  return {
    id,
    additiveName: 'Sorbic acid',
    codeNumber: '200',
    sourceStatus: 'added',
    sourceEvidence: evidence,
    ...(concentration === undefined ? {} : { concentration }),
    ...overrides,
  };
}

const mgPerKg = (value: string): AdditiveConcentration => ({ value, unit: 'mgPerKg', basis: 'asSupplied' });

const ingredients: readonly ExpandedIngredient[] = [
  { ingredientId: 'syrup', mass: { value: '200', unit: 'g' }, sourcePath: ['p', 'l1', 'syrup'] },
  { ingredientId: 'water', mass: { value: '800', unit: 'g' }, sourcePath: ['p', 'l2', 'water'] },
];

const asSoldBalance = calculateProcessMassBalance({ value: '1', unit: 'kg' }, { changes: [] });
const density: AdditiveDensityEvidence = {
  gramsPerMillilitre: '1.05',
  evidenceReference: 'Density test 7',
  sourceDate: '2026-11-02',
};

function input(overrides: Partial<AdditiveFinalConcentrationInput> = {}): AdditiveFinalConcentrationInput {
  return {
    additiveCodeNumber: '200',
    foodState: 'asSold',
    outputUnit: 'mg/kg',
    ingredients,
    sourcesByIngredient: new Map([['syrup', [source('s1', mgPerKg('500'))]]]),
    processBalance: asSoldBalance,
    ...overrides,
  };
}

function reasonsOf(overrides: Partial<AdditiveFinalConcentrationInput>): readonly string[] {
  const result = calculateAdditiveFinalConcentration(input(overrides));
  expect(result.status).toBe('review_required');
  return result.status === 'review_required' ? result.reasons : [];
}

describe('additive final concentration', () => {
  it('sums a direct source over the documented final mass', () => {
    const result = calculateAdditiveFinalConcentration(input());
    // 500 mg/kg x 0.2 kg = 100 mg in 1 kg of final food.
    expect(result).toMatchObject({
      status: 'calculated',
      value: '100',
      unit: 'mg/kg',
      totalAdditiveMilligrams: '100',
      yieldPercentage: '100',
      foodState: 'asSold',
    });
    expect(result.status === 'calculated' && result.contributions[0]).toMatchObject({
      sourceId: 's1',
      ingredientId: 'syrup',
      sourcePath: ['p', 'l1', 'syrup'],
      additiveMilligrams: '100',
      evidenceReference: 'Supplier specification 4',
    });
  });

  it('sums sources across nested ingredients and keeps each path', () => {
    const result = calculateAdditiveFinalConcentration(input({
      sourcesByIngredient: new Map([
        ['syrup', [source('s1', mgPerKg('500'))]],
        ['water', [source('s2', { value: '0.5', unit: 'gPerKg', basis: 'asAdded' })]],
      ]),
    }));
    // 100 mg + 500 mg/kg x 0.8 kg = 400 mg.
    expect(result).toMatchObject({ status: 'calculated', value: '500' });
    expect(result.status === 'calculated' && result.contributions.map((c) => c.sourcePath)).toEqual([
      ['p', 'l1', 'syrup'],
      ['p', 'l2', 'water'],
    ]);
  });

  it('applies the documented yield to the denominator', () => {
    const concentrated = calculateProcessMassBalance(
      { value: '1', unit: 'kg' },
      { changes: [{ id: 'evaporation', kind: 'loss', mass: { value: '500', unit: 'g' } }] },
    );
    expect(calculateAdditiveFinalConcentration(input({ processBalance: concentrated }))).toMatchObject({
      status: 'calculated',
      value: '200',
      yieldPercentage: '50',
    });
  });

  it('converts per-100 g, percent and gram units explicitly', () => {
    const one = (concentration: AdditiveConcentration) =>
      calculateAdditiveFinalConcentration(input({
        sourcesByIngredient: new Map([['syrup', [source('s', concentration)]]]),
      }));
    expect(one({ value: '50', unit: 'mgPer100g', basis: 'asSupplied' })).toMatchObject({ value: '100' });
    expect(one({ value: '0.05', unit: 'percentByMass', basis: 'asSupplied' })).toMatchObject({ value: '100' });
    expect(one({ value: '0.5', unit: 'gPerKg', basis: 'asSupplied' })).toMatchObject({ value: '100' });
  });

  it('needs ingredient density evidence for per-volume sources', () => {
    const perLitre = new Map([['syrup', [source('s', { value: '500', unit: 'mgPerL', basis: 'asSupplied' })]]]);
    expect(reasonsOf({ sourcesByIngredient: perLitre })).toEqual(['INGREDIENT_DENSITY_MISSING']);
    expect(reasonsOf({
      sourcesByIngredient: perLitre,
      ingredientDensities: new Map([['syrup', { ...density, gramsPerMillilitre: '0' }]]),
    })).toEqual(['INGREDIENT_DENSITY_MISSING']);

    const result = calculateAdditiveFinalConcentration(input({
      sourcesByIngredient: new Map([['syrup', [source('s', { value: '50', unit: 'mgPer100mL', basis: 'asSupplied' })]]]),
      ingredientDensities: new Map([['syrup', { ...density, gramsPerMillilitre: '1' }]]),
    }));
    // 500 mg/L x 0.2 L = 100 mg.
    expect(result).toMatchObject({ status: 'calculated', value: '100' });
  });

  it('reports mg/L only with final-food density evidence', () => {
    expect(reasonsOf({ outputUnit: 'mg/L' })).toEqual(['FINAL_DENSITY_MISSING']);
    const result = calculateAdditiveFinalConcentration(input({ outputUnit: 'mg/L', finalDensity: density }));
    // 100 mg/kg x 1.05 kg/L = 105 mg/L.
    expect(result).toMatchObject({ status: 'calculated', value: '105', unit: 'mg/L', finalDensity: density });
  });

  it('never treats missing information as zero', () => {
    expect(reasonsOf({ additiveCodeNumber: ' ' })).toContain('ADDITIVE_CODE_MISSING');
    expect(reasonsOf({ foodState: undefined })).toEqual(['FOOD_STATE_MISSING']);
    expect(reasonsOf({ processBalance: calculateProcessMassBalance({ value: '1', unit: 'kg' }) }))
      .toEqual(['PROCESS_MASS_PROFILE_MISSING']);
    expect(reasonsOf({ additiveCodeNumber: '330' })).toEqual(['NO_MATCHING_SOURCE']);
    expect(reasonsOf({ sourcesByIngredient: new Map() })).toEqual(['NO_MATCHING_SOURCE']);
    expect(reasonsOf({ sourcesByIngredient: new Map([['syrup', [source('s', undefined)]]]) }))
      .toEqual(['CONCENTRATION_MISSING']);
    expect(reasonsOf({ sourcesByIngredient: new Map([['syrup', [source('s', mgPerKg('abc'))]]]) }))
      .toEqual(['CONCENTRATION_MISSING']);
    expect(reasonsOf({ sourcesByIngredient: new Map([['syrup', [source('s', mgPerKg('-1'))]]]) }))
      .toEqual(['CONCENTRATION_MISSING']);
    expect(reasonsOf({ sourcesByIngredient: new Map([['syrup', [source('s', mgPerKg('5'), { sourceEvidence: [] })]]]) }))
      .toEqual(['EVIDENCE_MISSING']);
  });

  it('keeps one unresolved source from being silently dropped', () => {
    expect(reasonsOf({
      sourcesByIngredient: new Map([
        ['syrup', [source('s1', mgPerKg('500'))]],
        ['water', [source('s2', undefined)]],
      ]),
    })).toEqual(['CONCENTRATION_MISSING']);
    expect(reasonsOf({
      sourcesByIngredient: new Map([
        ['syrup', [source('s1', mgPerKg('500'))]],
        ['water', [source('s2', mgPerKg('1'), { codeNumber: ' ' })]],
      ]),
    })).toEqual(['SOURCE_IDENTITY_MISSING']);
  });

  it('leaves carry-over, processing aids and other bases to review', () => {
    for (const sourceStatus of ['carriedOver', 'processingAid', 'unknown'] as const) {
      expect(reasonsOf({
        sourcesByIngredient: new Map([['syrup', [source('s', mgPerKg('5'), { sourceStatus })]]]),
      })).toEqual(['SOURCE_NOT_ADDED']);
    }
    for (const basis of ['dryMatter', 'asPrepared', 'asReconstituted', 'asDrained', 'unknown'] as const) {
      expect(reasonsOf({
        sourcesByIngredient: new Map([['syrup', [source('s', { value: '5', unit: 'mgPerKg', basis })]]]),
      })).toEqual(['BASIS_NOT_SUPPORTED']);
    }
  });

  it('ignores sources for other additives', () => {
    const result = calculateAdditiveFinalConcentration(input({
      sourcesByIngredient: new Map([
        ['syrup', [source('s1', mgPerKg('500')), source('other', mgPerKg('9999'), { codeNumber: '330' })]],
      ]),
    }));
    expect(result).toMatchObject({ status: 'calculated', value: '100' });
  });

  it('accepts a documented zero concentration', () => {
    expect(calculateAdditiveFinalConcentration(input({
      sourcesByIngredient: new Map([['syrup', [source('s', mgPerKg('0'))]]]),
    }))).toMatchObject({ status: 'calculated', value: '0' });
  });
});
