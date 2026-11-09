import { describe, expect, it } from 'vitest';
import type { ExpandedIngredient, IngredientAdditiveSource } from '@aus-food/domain';
import { propagateAllergens } from './allergens.js';
import { traceAdditiveAllergenEvidence, traceAdditiveSources } from './additive-sources.js';

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
};

describe('additive source tracing', () => {
  it('preserves source details, evidence, and nested ingredient paths', () => {
    const expanded: readonly ExpandedIngredient[] = [
      {
        ingredientId: 'strawberry',
        mass: { value: '25', unit: 'g' },
        sourcePath: ['product', 'filling-line', 'filling', 'fruit-line', 'strawberry'],
      },
    ];

    expect(traceAdditiveSources(expanded, new Map([['strawberry', [source]]]))).toEqual([
      {
        ingredientId: 'strawberry',
        sourcePath: ['product', 'filling-line', 'filling', 'fruit-line', 'strawberry'],
        source,
      },
    ]);
  });

  it('keeps distinct paths when the same ingredient is used more than once', () => {
    const expanded: readonly ExpandedIngredient[] = [
      {
        ingredientId: 'salt',
        mass: { value: '2', unit: 'g' },
        sourcePath: ['product', 'first-line', 'salt'],
      },
      {
        ingredientId: 'salt',
        mass: { value: '3', unit: 'g' },
        sourcePath: ['product', 'second-line', 'salt'],
      },
    ];

    expect(traceAdditiveSources(expanded, new Map([['salt', [source]]])).map(
      ({ sourcePath }) => sourcePath,
    )).toEqual([
      ['product', 'first-line', 'salt'],
      ['product', 'second-line', 'salt'],
    ]);
  });

  it('returns an empty result where no additive source records were supplied', () => {
    const expanded: readonly ExpandedIngredient[] = [
      {
        ingredientId: 'oats',
        mass: { value: '100', unit: 'g' },
        sourcePath: ['product', 'oat-line', 'oats'],
      },
    ];

    expect(traceAdditiveSources(expanded, new Map())).toEqual([]);
  });

  it('carries additive allergen evidence along its nested ingredient path', () => {
    const additiveWithAllergenEvidence: IngredientAdditiveSource = {
      ...source,
      allergenAssessments: { milk: 'present' },
    };
    const expanded: readonly ExpandedIngredient[] = [{
      ingredientId: 'strawberry',
      mass: { value: '25', unit: 'g' },
      sourcePath: ['product', 'filling-line', 'filling', 'fruit-line', 'strawberry'],
    }];
    const evidence = traceAdditiveAllergenEvidence(
      expanded,
      new Map([['strawberry', [additiveWithAllergenEvidence]]]),
    );

    expect(evidence).toMatchObject([{
      kind: 'additive',
      subjectId: 'additive-source-1',
      sourceId: 'Supplier specification, section 4',
      sourceDate: '2026-11-09',
      sourcePath: [
        'product',
        'filling-line',
        'filling',
        'fruit-line',
        'strawberry',
        'additive-source',
        'additive-source-1',
      ],
      assessments: { milk: 'present' },
    }]);
    expect(propagateAllergens(evidence, [{
      id: 'milk',
      ingredientListName: 'milk',
      summaryName: 'milk',
    }], 'complete')).toMatchObject({
      status: 'propagated',
      allergens: [{
        id: 'milk',
        sourcePaths: [evidence[0]?.sourcePath],
      }],
    });
  });

  it('rejects additive allergen assessments without dated source evidence', () => {
    const noEvidence: IngredientAdditiveSource = {
      id: 'no-evidence',
      additiveName: 'Example additive',
      sourceStatus: 'unknown',
      allergenAssessments: { milk: 'present' },
    };

    expect(() => traceAdditiveAllergenEvidence([{
      ingredientId: 'ingredient-1',
      mass: { value: '1', unit: 'g' },
      sourcePath: ['product', 'ingredient-1'],
    }], new Map([['ingredient-1', [noEvidence]]]))).toThrowError(/without dated evidence/);
  });

  it('assigns distinct evidence IDs when the same ingredient is used on multiple paths', () => {
    const ingredient: IngredientAdditiveSource = {
      ...source,
      allergenAssessments: { milk: 'present' },
    };
    const evidence = traceAdditiveAllergenEvidence([
      {
        ingredientId: 'strawberry',
        mass: { value: '1', unit: 'g' },
        sourcePath: ['product', 'first-line', 'strawberry'],
      },
      {
        ingredientId: 'strawberry',
        mass: { value: '2', unit: 'g' },
        sourcePath: ['product', 'second-line', 'strawberry'],
      },
    ], new Map([['strawberry', [ingredient]]]));

    expect(new Set(evidence.map(({ id }) => id)).size).toBe(2);
  });
});
