import { describe, expect, it } from 'vitest';
import type {
  AllergenEvidenceSource,
  AllergenVocabularyEntry,
} from '@aus-food/domain';
import { propagateAllergens } from './allergens.js';

const vocabulary: readonly AllergenVocabularyEntry[] = [
  {
    id: 'milk',
    ingredientListName: 'milk',
    summaryName: 'milk',
  },
  {
    id: 'wheat',
    ingredientListName: 'wheat',
    summaryName: 'wheat',
  },
];

function evidence(
  id: string,
  subjectId: string,
  kind: AllergenEvidenceSource['kind'],
  sourcePath: readonly string[],
  assessments: AllergenEvidenceSource['assessments'],
): AllergenEvidenceSource {
  return {
    id,
    subjectId,
    kind,
    sourceId: `source-${id}`,
    sourceDate: '2026-10-01',
    sourcePath,
    assessments,
  };
}

describe('allergen propagation', () => {
  it('unions present allergens across nested ingredients and accessory sources with paths', () => {
    expect(propagateAllergens(
      [
        evidence('ingredient-milk', 'milk-powder', 'ingredient', [
          'product',
          'filling-line',
          'filling',
          'milk-line',
          'milk-powder',
        ], { milk: 'present', wheat: 'absent' }),
        evidence('carrier-wheat', 'carrier', 'carrier', [
          'product',
          'flavour-line',
          'flavour',
          'carrier',
        ], { milk: 'absent', wheat: 'present' }),
      ],
      vocabulary,
      'complete',
    )).toEqual({
      status: 'propagated',
      allergens: [
        {
          id: 'milk',
          ingredientListName: 'milk',
          summaryName: 'milk',
          sourcePaths: [[
            'product',
            'filling-line',
            'filling',
            'milk-line',
            'milk-powder',
          ]],
        },
        {
          id: 'wheat',
          ingredientListName: 'wheat',
          summaryName: 'wheat',
          sourcePaths: [['product', 'flavour-line', 'flavour', 'carrier']],
        },
      ],
    });
  });

  it('returns review required for missing and explicitly unknown allergen evidence', () => {
    expect(propagateAllergens(
      [
        evidence('supplier', 'ingredient', 'ingredient', ['product', 'ingredient'], {
          milk: 'unknown',
        }),
      ],
      vocabulary,
      'complete',
    )).toMatchObject({
      status: 'review_required',
      reason: 'INCOMPLETE_ALLERGEN_EVIDENCE',
      unresolved: [
        {
          sourceId: 'source-supplier',
          allergenId: 'milk',
          status: 'unknown',
          sourcePath: ['product', 'ingredient'],
        },
        {
          sourceId: 'source-supplier',
          allergenId: 'wheat',
          status: 'missing',
          sourcePath: ['product', 'ingredient'],
        },
      ],
    });
  });

  it('returns review required when the full source inventory is not supplied', () => {
    expect(propagateAllergens([], vocabulary, 'incomplete')).toMatchObject({
      status: 'review_required',
      unresolved: [
        { allergenId: 'milk', status: 'missing' },
        { allergenId: 'wheat', status: 'missing' },
      ],
    });
  });

  it('keeps possible exemptions review-only', () => {
    expect(propagateAllergens(
      [
        evidence('refined-oil', 'soy-oil', 'ingredient', ['product', 'soy-oil'], {
          milk: 'absent',
          wheat: 'exemption_review',
        }),
      ],
      vocabulary,
      'complete',
    )).toMatchObject({
      status: 'review_required',
      unresolved: [{
        allergenId: 'wheat',
        status: 'exemption_review',
      }],
    });
  });

  it('does not resolve concentration-dependent allergens before final-food evaluation', () => {
    const concentrationVocabulary: readonly AllergenVocabularyEntry[] = [
      {
        id: 'sulphites',
        ingredientListName: 'sulphites',
        summaryName: 'sulphites',
        requiresFinalFoodEvaluation: true,
      },
    ];

    expect(propagateAllergens(
      [
        evidence('added-sulphites', 'preservative', 'additive', [
          'product',
          'preservative',
        ], { sulphites: 'present' }),
      ],
      concentrationVocabulary,
      'complete',
    )).toMatchObject({
      status: 'review_required',
      unresolved: [{
        allergenId: 'sulphites',
        status: 'final_food_evaluation',
      }],
      allergens: [],
    });
  });

  it('detects conflicting evidence for the same allergen and ingredient identity', () => {
    const result = propagateAllergens(
      [
        evidence('supplier-one', 'same-ingredient', 'ingredient', [
          'product',
          'first-line',
          'same-ingredient',
        ], { milk: 'present', wheat: 'absent' }),
        evidence('supplier-two', 'same-ingredient', 'ingredient', [
          'product',
          'second-line',
          'same-ingredient',
        ], { milk: 'absent', wheat: 'absent' }),
      ],
      vocabulary,
      'complete',
    );

    expect(result.status).toBe('review_required');
    if (result.status === 'review_required') {
      expect(result.unresolved).toEqual(expect.arrayContaining([
        expect.objectContaining({ allergenId: 'milk', status: 'conflict' }),
      ]));
    }
  });

  it('rejects duplicate or unknown vocabulary/source identifiers', () => {
    const validSource = evidence('source', 'ingredient', 'ingredient', ['ingredient'], {
      milk: 'absent',
      wheat: 'absent',
    });

    expect(() => propagateAllergens([validSource], [vocabulary[0]!, vocabulary[0]!], 'complete'))
      .toThrow(TypeError);
    expect(() => propagateAllergens([
      { ...validSource, assessments: { unlisted: 'present' } },
    ], vocabulary, 'complete')).toThrow(TypeError);
    expect(() => propagateAllergens([validSource, validSource], vocabulary, 'complete'))
      .toThrow(TypeError);
  });
});
