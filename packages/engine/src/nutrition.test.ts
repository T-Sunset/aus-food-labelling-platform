import { describe, expect, it } from 'vitest';
import type { IngredientNutrientInput, NutrientId } from '@aus-food/domain';
import { aggregateNutrients } from './nutrition.js';

const nutrients: readonly NutrientId[] = ['protein', 'sodium'];

describe('nutrient aggregation', () => {
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

  it('returns review required when nutrient evidence lacks source metadata', () => {
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
      status: 'review_required',
      missing: [{ ingredientId: 'ingredient', nutrient: 'protein' }],
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
