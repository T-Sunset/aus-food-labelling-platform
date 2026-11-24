import { describe, expect, it } from 'vitest';
import type { IngredientNutrientInput, NutrientId } from '@aus-food/domain';
import { aggregateNutrients, calculateMixedNutrientPer100g, calculateRetainedNutrientPer100g, convertNutrientUnit, convertVolumeNutrientToMass } from './nutrition.js';

describe('mixing food for preparation', () => {
  it('weights the supplied values by their recorded masses', () => {
    expect(calculateMixedNutrientPer100g('20', '25', '4', '75')).toBe('8');
    expect(calculateMixedNutrientPer100g('0', '25', '0', '75')).toBe('0');
    expect(calculateMixedNutrientPer100g('20', '25', '0', '75')).toBe('5');
  });
  it('rejects unknown, negative or zero masses rather than guessing', () => {
    expect(() => calculateMixedNutrientPer100g('20', '0', '4', '75')).toThrow();
    expect(() => calculateMixedNutrientPer100g('20', '25', '', '75')).toThrow();
    expect(() => calculateMixedNutrientPer100g('20', '25', '-1', '75')).toThrow();
    expect(() => calculateMixedNutrientPer100g('0.00000000000000000000000000000000000000001', '1', '0', '100')).toThrow();
  });
});

describe('true nutrient retention', () => {
  it('uses starting and finished batch weights and the nutrient-specific percentage', () => {
    expect(calculateRetainedNutrientPer100g('8', '100', '80', '80')).toBe('8');
    expect(calculateRetainedNutrientPer100g('8', '100', '80', '100')).toBe('10');
    expect(calculateRetainedNutrientPer100g('8', '100', '120', '75')).toBe('5');
    expect(calculateRetainedNutrientPer100g('8', '100', '80', '0')).toBe('0');
  });

  it('rejects invalid values and nonzero results below calculation precision', () => {
    for (const values of [
      ['-1', '100', '80', '80'], ['1', '0', '80', '80'], ['1', '100', '0', '80'],
      ['1', '100', '80', '-1'], ['1', '100', '80', '100.1'],
      ['0.00000000000000000000000000000000000000001', '1', '100', '1'],
    ]) expect(() => calculateRetainedNutrientPer100g(values[0]!, values[1]!, values[2]!, values[3]!)).toThrow();
  });
});

const nutrients: readonly NutrientId[] = ['protein', 'sodium'];

describe('nutrient aggregation', () => {
  it('converts between grams, milligrams and micrograms without losing small values', () => {
    expect(convertNutrientUnit('1', 'g/100g', 'ug/100g')).toBe('1000000');
    expect(convertNutrientUnit('1', 'ug/100g', 'g/100g')).toBe('0.000001');
    expect(convertNutrientUnit('0.001', 'mg/100g', 'ug/100g')).toBe('1');
    expect(convertNutrientUnit('0', 'ug/100g', 'mg/100g')).toBe('0');
    expect(convertNutrientUnit('1e-50', 'ug/100g', 'g/100g')).toBe('1e-56');
  });

  it('converts volume values using a known density and preserves optional sources', () => {
    const evidence = { value: '12', unit: 'ug/100mL' as const, sourceId: 'Lab', sourceDate: '2026-01-01',
      evidenceType: 'analysis' as const, expression: 'cyanocobalamin', method: 'Analysis' };
    const density = { gramsPerMillilitre: '1.2', evidenceReference: 'Measurement', sourceDate: '2026-01-02' };
    expect(convertVolumeNutrientToMass(evidence, density)).toEqual({
      status: 'converted',
      evidence: { ...evidence, value: '10', unit: 'ug/100g',
        method: 'Analysis; Converted using ingredient density 1.2 g/mL, Measurement, 2026-01-02' },
    });
    expect(convertVolumeNutrientToMass(evidence, undefined)).toEqual({
      status: 'review_required', reason: 'MISSING_DENSITY_EVIDENCE',
    });
    expect(convertVolumeNutrientToMass(evidence, { ...density, evidenceReference: '', sourceDate: '' }))
      .toMatchObject({ status: 'converted', evidence: { value: '10' } });
    expect(convertVolumeNutrientToMass(evidence, { ...density, sourceDate: '2026-02-31' }).status).toBe('review_required');
    expect(() => convertVolumeNutrientToMass(evidence, { ...density, gramsPerMillilitre: '0' })).toThrow(RangeError);
    expect(convertVolumeNutrientToMass({ ...evidence, value: '0' }, density)).toMatchObject({
      status: 'converted', evidence: { value: '0' },
    });
    expect(convertVolumeNutrientToMass({ ...evidence, value: '1e-50' }, density)).toMatchObject({
      status: 'review_required', reason: 'INSUFFICIENT_NUTRIENT_PRECISION',
    });
  });

  it('aggregates compatible vitamin and mineral figures in canonical units with their evidence', () => {
    const inputs: readonly IngredientNutrientInput[] = [
      {
        ingredient: { ingredientId: 'a', mass: { value: '25', unit: 'g' }, sourcePath: ['recipe', 'a'] },
        profile: { ingredientId: 'a', values: {
          vitaminB12: { value: '0.002', unit: 'mg/100g', sourceId: 'lab', sourceDate: '2026-01-01', evidenceType: 'analysis', expression: 'cyanocobalamin' },
          calcium: { value: '0.1', unit: 'g/100g', sourceId: 'lab', sourceDate: '2026-01-01', evidenceType: 'analysis' },
        } },
      },
      {
        ingredient: { ingredientId: 'b', mass: { value: '75', unit: 'g' }, sourcePath: ['recipe', 'b'] },
        profile: { ingredientId: 'b', values: {
          vitaminB12: { value: '4', unit: 'ug/100g', sourceId: 'supplier', sourceDate: '2026-02-01', evidenceType: 'supplier', expression: 'cyanocobalamin' },
          calcium: { value: '200000', unit: 'ug/100g', sourceId: 'supplier', sourceDate: '2026-02-01', evidenceType: 'supplier' },
        } },
      },
    ];
    const result = aggregateNutrients(inputs, ['vitaminB12', 'calcium']);
    expect(result.status).toBe('calculated');
    if (result.status !== 'calculated') throw new Error('Expected calculated nutrients');
    expect(result.nutrients).toMatchObject([
      { nutrient: 'vitaminB12', value: '3.5', unit: 'ug/100g', sources: [
        { sourcePath: ['recipe', 'a'], sourceId: 'lab', expression: 'cyanocobalamin' },
        { sourcePath: ['recipe', 'b'], sourceId: 'supplier', expression: 'cyanocobalamin' },
      ] },
      { nutrient: 'calcium', value: '175', unit: 'mg/100g' },
    ]);
  });

  it('requires an appropriate expression instead of equating unknown or different chemical forms', () => {
    const ingredient = { ingredientId: 'a', mass: { value: '100', unit: 'g' as const }, sourcePath: ['a'] };
    const evidence = { value: '5', unit: 'ug/100g' as const, sourceId: 'label', sourceDate: '2026-01-01', evidenceType: 'productLabel' as const };
    expect(aggregateNutrients([{ ingredient, profile: { ingredientId: 'a', values: { vitaminA: evidence } } }], ['vitaminA']))
      .toMatchObject({ status: 'review_required', reason: 'INCOMPATIBLE_NUTRIENT_EXPRESSION',
        missing: [{ nutrient: 'vitaminA', expectedExpression: 'retinolEquivalents' }] });
    expect(aggregateNutrients([{ ingredient, profile: { ingredientId: 'a', values: {
      vitaminA: { ...evidence, expression: 'retinol' },
    } } }], ['vitaminA'])).toMatchObject({
      status: 'review_required', reason: 'INCOMPATIBLE_NUTRIENT_EXPRESSION',
      missing: [{ actualExpression: 'retinol', expectedExpression: 'retinolEquivalents' }],
    });
    expect(aggregateNutrients([{ ingredient, profile: { ingredientId: 'a', values: {
      calcium: { ...evidence, expression: 'calciumCarbonate' },
    } } }], ['calcium'])).toMatchObject({ status: 'review_required', reason: 'INCOMPATIBLE_NUTRIENT_EXPRESSION' });
    expect(aggregateNutrients([{ ingredient, profile: { ingredientId: 'a', values: {
      vitaminA: { ...evidence, expression: 'retinolEquivalents' },
    } } }], ['vitaminA'])).toMatchObject({ status: 'calculated', nutrients: [{ value: '5', unit: 'ug/100g' }] });
  });

  it('distinguishes known zero from a missing additional nutrient', () => {
    const ingredient = { ingredientId: 'a', mass: { value: '100', unit: 'g' as const }, sourcePath: ['a'] };
    const input = { ingredient, profile: { ingredientId: 'a', values: {
      folate: { value: '0', unit: 'ug/100g' as const, sourceId: '', sourceDate: '', evidenceType: 'user' as const },
    } } };
    expect(aggregateNutrients([input], ['folate'])).toMatchObject({
      status: 'calculated', nutrients: [{ nutrient: 'folate', value: '0' }],
    });

    expect(aggregateNutrients([input], ['folate', 'iodine'])).toMatchObject({
      status: 'review_required', reason: 'MISSING_NUTRIENT_EVIDENCE', missing: [{ nutrient: 'iodine' }],
    });
  });

  it('requires review rather than rounding a tiny non-zero nutrient to zero', () => {
    const ingredient = { ingredientId: 'a', mass: { value: '100', unit: 'g' as const }, sourcePath: ['a'] };
    const input = { ingredient, profile: { ingredientId: 'a', values: {
      folate: { value: '0.00000000000000000000000000000000000000000000000001',
        unit: 'ug/100g' as const, sourceId: '', sourceDate: '', evidenceType: 'user' as const },
    } } };
    expect(aggregateNutrients([input], ['folate'])).toMatchObject({
      status: 'review_required', reason: 'INSUFFICIENT_NUTRIENT_PRECISION', missing: [{ nutrient: 'folate' }],
    });
  });

  it('calculates weighted per-100 g nutrients and preserves evidence sources', () => {
    const inputs: readonly IngredientNutrientInput[] = [
      {
        ingredient: {
          ingredientId: 'ingredient-a',
          mass: { value: '50', unit: 'g' },
          sourcePath: ['product', 'line-a', 'ingredient-a'],
        },
        profile: {
          ingredientId: 'ingredient-a',
          values: {
            protein: {
              value: '10',
              unit: 'g/100g',
              sourceId: 'supplier-a',
              sourceDate: '2026-10-01',
              evidenceType: 'supplier',
            },
            sodium: {
              value: '0.2',
              unit: 'g/100g',
              sourceId: 'supplier-a',
              sourceDate: '2026-10-01',
              evidenceType: 'supplier',
              method: 'supplier specification',
            },
          },
        },
      },
      {
        ingredient: {
          ingredientId: 'ingredient-b',
          mass: { value: '50', unit: 'g' },
          sourcePath: ['product', 'line-b', 'ingredient-b'],
        },
        profile: {
          ingredientId: 'ingredient-b',
          values: {
            protein: {
              value: '20',
              unit: 'g/100g',
              sourceId: 'supplier-b',
              sourceDate: '2026-10-02',
              evidenceType: 'supplier',
            },
            sodium: {
              value: '400',
              unit: 'mg/100g',
              sourceId: 'supplier-b',
              sourceDate: '2026-10-02',
              evidenceType: 'supplier',
            },
          },
        },
      },
    ];

    expect(aggregateNutrients(inputs, nutrients)).toEqual({
      status: 'calculated',
      basis: 'ingoing',
      totalMass: { value: '100', unit: 'g' },
      nutrients: [
        {
          nutrient: 'protein',
          value: '15',
          unit: 'g/100g',
          sources: [
            {
              sourcePath: ['product', 'line-a', 'ingredient-a'],
              sourceId: 'supplier-a',
              sourceDate: '2026-10-01',
              evidenceType: 'supplier',
            },
            {
              sourcePath: ['product', 'line-b', 'ingredient-b'],
              sourceId: 'supplier-b',
              sourceDate: '2026-10-02',
              evidenceType: 'supplier',
            },
          ],
        },
        {
          nutrient: 'sodium',
          value: '300',
          unit: 'mg/100g',
          sources: [
            {
              sourcePath: ['product', 'line-a', 'ingredient-a'],
              sourceId: 'supplier-a',
              sourceDate: '2026-10-01',
              evidenceType: 'supplier',
              method: 'supplier specification',
            },
            {
              sourcePath: ['product', 'line-b', 'ingredient-b'],
              sourceId: 'supplier-b',
              sourceDate: '2026-10-02',
              evidenceType: 'supplier',
            },
          ],
        },
      ],
    });
  });

  it('returns review required without partial values when required supplier data is missing', () => {
    const inputs: readonly IngredientNutrientInput[] = [
      {
        ingredient: {
          ingredientId: 'ingredient',
          mass: { value: '100', unit: 'g' },
          sourcePath: ['product', 'line', 'ingredient'],
        },
      },
    ];

    expect(aggregateNutrients(inputs, nutrients)).toEqual({
      status: 'review_required',
      reason: 'MISSING_NUTRIENT_EVIDENCE',
      missing: [
        {
          ingredientId: 'ingredient',
          sourcePath: ['product', 'line', 'ingredient'],
          nutrient: 'protein',
        },
        {
          ingredientId: 'ingredient',
          sourcePath: ['product', 'line', 'ingredient'],
          nutrient: 'sodium',
        },
      ],
    });
  });

  it('does not replace a missing nutrient on one ingredient with zero', () => {
    const inputs: readonly IngredientNutrientInput[] = [
      {
        ingredient: {
          ingredientId: 'ingredient-a',
          mass: { value: '50', unit: 'g' },
          sourcePath: ['product', 'line-a', 'ingredient-a'],
        },
        profile: {
          ingredientId: 'ingredient-a',
          values: {
            protein: {
              value: '10',
              unit: 'g/100g',
              sourceId: 'supplier-a',
              sourceDate: '2026-10-01',
              evidenceType: 'supplier',
            },
          },
        },
      },
      {
        ingredient: {
          ingredientId: 'ingredient-b',
          mass: { value: '50', unit: 'g' },
          sourcePath: ['product', 'line-b', 'ingredient-b'],
        },
        profile: {
          ingredientId: 'ingredient-b',
          values: {
            sodium: {
              value: '100',
              unit: 'mg/100g',
              sourceId: 'supplier-b',
              sourceDate: '2026-10-02',
              evidenceType: 'supplier',
            },
          },
        },
      },
    ];

    expect(aggregateNutrients(inputs, nutrients)).toMatchObject({
      status: 'review_required',
      missing: [
        {
          ingredientId: 'ingredient-a',
          nutrient: 'sodium',
        },
        {
          ingredientId: 'ingredient-b',
          nutrient: 'protein',
        },
      ],
    });
  });

  it('uses a supplied nutrient without source metadata', () => {
    expect(aggregateNutrients(
      [
        {
          ingredient: {
            ingredientId: 'ingredient',
            mass: { value: '100', unit: 'g' },
            sourcePath: ['product', 'ingredient'],
          },
          profile: {
            ingredientId: 'ingredient',
            values: {
              protein: {
                value: '10',
                unit: 'g/100g',
                sourceId: '',
                sourceDate: '',
                evidenceType: 'supplier',
              },
            },
          },
        },
      ],
      ['protein'],
    )).toMatchObject({
      status: 'calculated',
      nutrients: [{ nutrient: 'protein', value: '10', sources: [{ sourceId: '', sourceDate: '' }] }],
    });
  });

  it('rejects invalid ingredient sets, profile identities, and negative nutrient values', () => {
    expect(() => aggregateNutrients([], ['protein'])).toThrow(RangeError);
    expect(() =>
      aggregateNutrients(
        [
          {
            ingredient: {
              ingredientId: 'ingredient-a',
              mass: { value: '100', unit: 'g' },
              sourcePath: ['ingredient-a'],
            },
          },
        ],
        [],
      ),
    ).toThrow(RangeError);

    expect(() =>
      aggregateNutrients(
        [
          {
            ingredient: {
              ingredientId: 'ingredient-a',
              mass: { value: '100', unit: 'g' },
              sourcePath: ['ingredient-a'],
            },
            profile: { ingredientId: 'ingredient-b', values: {} },
          },
        ],
        ['protein'],
      ),
    ).toThrow(TypeError);

    expect(() =>
      aggregateNutrients(
        [
          {
            ingredient: {
              ingredientId: 'ingredient-a',
              mass: { value: '100', unit: 'g' },
              sourcePath: ['ingredient-a'],
            },
            profile: {
              ingredientId: 'ingredient-a',
              values: {
                protein: {
                  value: '-1',
                  unit: 'g/100g',
                  sourceId: 'supplier-a',
                  sourceDate: '2026-10-01',
                  evidenceType: 'supplier',
                },
              },
            },
          },
        ],
        ['protein'],
      ),
    ).toThrow(RangeError);
  });

  expect(() => aggregateNutrients(
    [
      {
        ingredient: {
          ingredientId: 'zero-mass',
          mass: { value: '0', unit: 'g' },
          sourcePath: ['zero-mass'],
        },
      },
    ],
    ['protein'],
  )).toThrow(RangeError);
});
