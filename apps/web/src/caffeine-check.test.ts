import { describe, expect, it } from 'vitest';
import type { FormulationRecord, IngredientRecord, ProductRecord } from '@aus-food/storage';
import { createEmptyProductClassificationProfile } from '@aus-food/engine';
import { applyAnswer, caffeinatedQuestions } from './label-builder';
import { makeConsultantNotes } from './consultant-notes';
import { makeLabelDraft } from './label-draft';
import { nutritionRecipeSignature } from './product-form';
import { caffeineCheckForProduct } from './caffeine-check';

const now = '2026-11-19T00:00:00.000Z';
const sourceDate = '2026-11-01';

function records(overrides: {
  readonly caffeineEvidence?: IngredientRecord['caffeineEvidence'] | null;
  readonly foodState?: ProductRecord['foodState'];
  readonly density?: NonNullable<ProductRecord['packDetails']>['nutritionDensity'];
  readonly unsourced?: boolean;
} = {}) {
  const savedCaffeineEvidence = overrides.caffeineEvidence === undefined
    ? {
        status: 'present' as const,
        amount: '100',
        unit: 'g/100g' as const,
        specification: {
          reference: overrides.unsourced ? '' : 'Caffeine supplier specification',
          sourceDate: overrides.unsourced ? '' : sourceDate,
        },
      }
    : overrides.caffeineEvidence;
  const caffeine: IngredientRecord = {
    id: 'caffeine',
    name: 'Caffeine',
    recordType: 'ingredient',
    kind: 'atomic',
    tags: [],
    createdAt: now,
    updatedAt: now,
    ...(savedCaffeineEvidence ? { caffeineEvidence: savedCaffeineEvidence } : {}),
  };
  const water: IngredientRecord = {
    id: 'water',
    name: 'Water',
    recordType: 'ingredient',
    kind: 'atomic',
    tags: [],
    createdAt: now,
    updatedAt: now,
    caffeineEvidence: {
      status: 'absent',
      specification: {
        reference: overrides.unsourced ? '' : 'Water specification',
        sourceDate: overrides.unsourced ? '' : sourceDate,
      },
    },
  };
  const formulation: FormulationRecord = {
    id: 'drink',
    name: 'Test drink',
    recordType: 'formulation',
    tags: [],
    createdAt: now,
    updatedAt: now,
    lines: [
      { id: 'line-caffeine', kind: 'ingredient', ingredientId: caffeine.id, quantity: { value: '0.03', unit: 'g' } },
      { id: 'line-water', kind: 'ingredient', ingredientId: water.id, quantity: { value: '99.97', unit: 'g' } },
    ],
  };
  let classificationProfile = createEmptyProductClassificationProfile();
  for (const question of caffeinatedQuestions) {
    classificationProfile = applyAnswer(classificationProfile, question, 'yes', overrides.unsourced ? undefined : {
      id: `evidence-${question.key}`,
      reference: 'Product specification',
      sourceDate,
      kind: 'productBrief',
    });
  }
  const ingredients = [caffeine, water];
  const product: ProductRecord = {
    id: 'product',
    name: 'Test drink',
    recordType: 'product',
    formulationId: formulation.id,
    foodState: overrides.foodState ?? 'asSold',
    builderProductType: 'caffeinatedBeverage',
    packDetails: {
      nutritionRecipeSignature: nutritionRecipeSignature(formulation.id, [formulation], ingredients),
      nutritionDensity: overrides.density ?? {
        gramsPerMillilitre: '1',
        evidenceReference: overrides.unsourced ? '' : 'Finished beverage density test',
        sourceDate: overrides.unsourced ? '' : sourceDate,
      },
    },
    classificationProfile,
    consumerDirections: 'none',
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
  return { product, formulations: [formulation], ingredients };
}

function checkWithIngredients(
  data: ReturnType<typeof records>,
  ingredients: readonly IngredientRecord[],
  formulations = data.formulations,
) {
  const product = {
    ...data.product,
    packDetails: {
      ...data.product.packDetails!,
      nutritionRecipeSignature: nutritionRecipeSignature(data.product.formulationId, formulations, ingredients),
    },
  };
  return caffeineCheckForProduct(product, '2026-11-19', formulations, ingredients);
}

describe('caffeine check product wiring', () => {
  it('derives caffeine from an ingredient nutrient value without requiring a separate caffeine record', () => {
    const data = records({ caffeineEvidence: null });
    const caffeine = {
      ...data.ingredients[0]!,
      nutrientProfile: {
        ingredientId: 'caffeine',
        values: {
          caffeine: {
            value: '100',
            unit: 'g/100g' as const,
            sourceId: 'Caffeine nutrition entry',
            sourceDate,
            evidenceType: 'supplier' as const,
          },
        },
      },
    };
    const result = checkWithIngredients(data, [caffeine, data.ingredients[1]!]);
    expect(result?.status).toBe('WITHIN RANGE');
    expect(result?.inputs).toContainEqual(expect.objectContaining({
      name: 'Caffeine content in drink > line-caffeine > caffeine',
      value: '100000',
      sourceId: 'Caffeine nutrition entry',
      unit: 'mg/100g',
    }));
  });

  it('derives caffeine from known caffeine in an expanded compound composition', () => {
    const data = records({ caffeineEvidence: null });
    const caffeine = {
      ...data.ingredients[0]!,
      nutrientProfile: {
        ingredientId: 'caffeine',
        values: {
          caffeine: {
            value: '100',
            unit: 'g/100g' as const,
            sourceId: 'Caffeine nutrition entry',
            sourceDate,
            evidenceType: 'supplier' as const,
          },
        },
      },
    };
    const compound: IngredientRecord = {
      id: 'premix',
      name: 'Caffeine premix',
      recordType: 'ingredient',
      kind: 'compound',
      compoundFormulationId: 'premix-recipe',
      compoundNutritionBasis: 'components',
      tags: [],
      createdAt: now,
      updatedAt: now,
    };
    const root: FormulationRecord = {
      ...data.formulations[0]!,
      id: 'compound-drink',
      lines: [
        { id: 'line-premix', kind: 'ingredient', ingredientId: compound.id, quantity: { value: '0.03', unit: 'g' } },
        { id: 'line-water', kind: 'ingredient', ingredientId: data.ingredients[1]!.id, quantity: { value: '99.97', unit: 'g' } },
      ],
    };
    const premix: FormulationRecord = {
      ...data.formulations[0]!,
      id: 'premix-recipe',
      name: 'Caffeine premix recipe',
      supplierComposition: { coverage: 'complete', unquantifiedComponents: [] },
      lines: [
        { id: 'line-caffeine-component', kind: 'ingredient', ingredientId: caffeine.id, quantity: { value: '1', unit: 'g' } },
      ],
    };
    const formulations = [root, premix];
    const ingredients = [compound, caffeine, data.ingredients[1]!];
    const product = { ...data.product, formulationId: root.id };
    const result = checkWithIngredients({ ...data, product, formulations }, ingredients, formulations);
    expect(result?.status).toBe('WITHIN RANGE');
    expect(result?.inputs).toContainEqual(expect.objectContaining({
      name: expect.stringContaining('Caffeine content in'),
      sourceId: 'Caffeine nutrition entry',
    }));
  });

  it('derives caffeine from a named additive concentration and does not add it twice to a nutrient total', () => {
    const data = records({ caffeineEvidence: null });
    const caffeine = {
      ...data.ingredients[0]!,
      nutrientProfile: {
        ingredientId: 'caffeine',
        values: {
          caffeine: {
            value: '100',
            unit: 'g/100g' as const,
            sourceId: 'Caffeine nutrition entry',
            sourceDate,
            evidenceType: 'supplier' as const,
          },
        },
      },
      additiveSources: [{
        id: 'caffeine-source',
        additiveName: 'Caffeine',
        concentration: { value: '100', unit: 'percentByMass' as const, basis: 'asSupplied' as const },
        sourceStatus: 'unknown' as const,
      }],
      directAdditiveSourceId: 'caffeine-source',
    };
    const result = checkWithIngredients(data, [caffeine, data.ingredients[1]!]);
    expect(result?.status).toBe('WITHIN RANGE');
    expect(result?.inputs).toContainEqual(expect.objectContaining({
      name: 'Caffeine content in drink > line-caffeine > caffeine',
      value: '100000',
      sourceId: 'Caffeine nutrition entry',
      unit: 'mg/100g',
    }));
  });

  it('uses a caffeine additive amount when no total nutrient value is available', () => {
    const data = records({ caffeineEvidence: null });
    const caffeine = {
      ...data.ingredients[0]!,
      additiveSources: [{
        id: 'caffeine-source',
        additiveName: 'Caffeine',
        concentration: { value: '100', unit: 'percentByMass' as const, basis: 'asSupplied' as const },
        sourceStatus: 'unknown' as const,
      }],
      directAdditiveSourceId: 'caffeine-source',
    };
    const result = checkWithIngredients(data, [caffeine, data.ingredients[1]!]);
    expect(result?.status).toBe('WITHIN RANGE');
  });

  it('uses volume-based caffeine nutrient data only when ingredient density is available', () => {
    const data = records({ caffeineEvidence: null });
    const caffeine = {
      ...data.ingredients[0]!,
      additionalNutritionPer100mL: {
        caffeine: {
          value: '100000',
          unit: 'ug/100mL' as const,
          sourceId: 'Volume caffeine entry',
          sourceDate,
          evidenceType: 'supplier' as const,
        },
      },
      ingredientDensity: {
        gramsPerMillilitre: '1',
        evidenceReference: 'Ingredient density',
        sourceDate,
      },
    };
    const result = checkWithIngredients(data, [caffeine, data.ingredients[1]!]);
    expect(result?.status).toBe('OUTSIDE RANGE');
    expect(result?.inputs).toContainEqual(expect.objectContaining({
      name: 'Caffeine content in drink > line-caffeine > caffeine',
      value: '100',
      sourceId: 'Volume caffeine entry',
      unit: 'mg/100mL',
    }));

    const { ingredientDensity: unusedDensity, ...withoutDensity } = caffeine;
    void unusedDensity;
    const missingDensityResult = checkWithIngredients(data, [withoutDensity, data.ingredients[1]!]);
    expect(missingDensityResult?.status).toBe('REVIEW REQUIRED');
    expect(missingDensityResult?.explanation).toContain('positive ingredient density');
  });

  it('keeps an explicit zero nutrient value known and does not infer that caffeine is absent', () => {
    const data = records({ caffeineEvidence: null });
    const caffeine = {
      ...data.ingredients[0]!,
      nutrientProfile: {
        ingredientId: 'caffeine',
        values: {
          caffeine: {
            value: '0',
            unit: 'mg/100g' as const,
            sourceId: 'Caffeine nutrition entry',
            sourceDate,
            evidenceType: 'supplier' as const,
          },
        },
      },
    };
    const result = checkWithIngredients(data, [caffeine, data.ingredients[1]!]);
    expect(result?.status).toBe('REVIEW REQUIRED');
    expect(result?.explanation).toContain('complete ingredient evidence totals zero');
    expect(result?.inputs).toContainEqual(expect.objectContaining({
      name: 'Caffeine content in drink > line-caffeine > caffeine',
      value: '0',
      sourceId: 'Caffeine nutrition entry',
    }));
    expect(result?.inputs).not.toContainEqual(expect.objectContaining({
      name: 'Caffeine status for Test drink > line-caffeine > Caffeine',
      value: 'absent',
    }));
  });

  it('calculates a provisional range result from complete, dated recipe evidence', () => {
    const { product, formulations, ingredients } = records();
    const result = caffeineCheckForProduct(product, '2026-11-19', formulations, ingredients);
    expect(result?.status).toBe('WITHIN RANGE');
    expect(result?.resultBasis).toBe('provisional');
    expect(result?.ruleReviewStatus).toBe('draft');
    expect(result?.inputs).toContainEqual(expect.objectContaining({
      name: 'Evaluated total caffeine',
      value: '300',
      unit: 'mg/L',
    }));
    expect(result?.inputs).toContainEqual(expect.objectContaining({
      name: 'Purpose of enhancing mental performance',
      value: 'yes',
    }));
    const report = makeConsultantNotes(product, formulations, ingredients, makeLabelDraft(product, formulations, ingredients));
    const caffeineSection = report.find((section) => section.heading === 'Caffeine concentration');
    expect(caffeineSection?.lines.join(' ')).toContain('REVIEW REQUIRED (unresolved; rule draft)');
    expect(caffeineSection?.lines.join(' ')).toContain('Caffeine supplier specification');
    expect(caffeineSection?.lines.join(' ')).toContain('does not certify legal compliance');
  });

  it('calculates a provisional range result from complete user-entered facts without sources', () => {
    const data = records({ unsourced: true });
    const result = caffeineCheckForProduct(data.product, '2026-11-19', data.formulations, data.ingredients);
    expect(result?.status).toBe('WITHIN RANGE');
    expect(result?.inputs.every((input) => input.sourceId === '' || input.sourceId === 'Derived from complete ingredient and density evidence')).toBe(true);
    const report = makeConsultantNotes(
      data.product, data.formulations, data.ingredients, makeLabelDraft(data.product, data.formulations, data.ingredients),
    );
    expect(report.find((section) => section.heading === 'Caffeine concentration')?.lines.join(' '))
      .toContain('not supplied (user-entered or calculated)');
  });

  it('keeps missing, changed-basis and processed recipes unresolved', () => {
    const missing = records({ caffeineEvidence: null });
    const { packDetails, ...withoutPackDetails } = missing.product;
    void packDetails;
    expect(caffeineCheckForProduct(withoutPackDetails, '2026-11-19', missing.formulations, missing.ingredients)?.status)
      .toBe('REVIEW REQUIRED');

    const unsourcedDensity = records({
      density: { gramsPerMillilitre: '1', evidenceReference: '', sourceDate: '' },
    });
    expect(caffeineCheckForProduct(
      unsourcedDensity.product,
      '2026-11-19',
      unsourcedDensity.formulations,
      unsourcedDensity.ingredients,
    )?.status).toBe('WITHIN RANGE');

    const base = records();
    const processed = {
      ...base,
      formulations: [{
        ...base.formulations[0]!,
        processMassProfile: {
          changes: [{ id: 'loss', kind: 'loss' as const, mass: { value: '1', unit: 'g' as const } }],
        },
      }],
    };
    const result = caffeineCheckForProduct(processed.product, '2026-11-19', processed.formulations, processed.ingredients);
    expect(result?.status).toBe('REVIEW REQUIRED');
    expect(result?.explanation).toContain('Recorded processing changes');
  });

  it('does not apply the range check to prepared products or contradicting caffeine records', () => {
    const prepared = records({ foodState: 'asReconstituted' });
    expect(caffeineCheckForProduct(prepared.product, '2026-11-19', prepared.formulations, prepared.ingredients)?.status)
      .toBe('REVIEW REQUIRED');

    const absent = records({
      caffeineEvidence: { status: 'absent', specification: { reference: 'Caffeine supplier specification', sourceDate } },
    });
    const result = caffeineCheckForProduct(absent.product, '2026-11-19', absent.formulations, absent.ingredients);
    expect(result?.status).toBe('REVIEW REQUIRED');
    expect(result?.explanation).toContain('recorded as present');
  });

  it('keeps both conflicting supplier statements visible in the unresolved trace', () => {
    const conflicting = records({
      caffeineEvidence: {
        status: 'conflicting',
        specification: { reference: 'First caffeine statement', sourceDate },
        statements: [
          {
            status: 'present',
            amount: '100',
            unit: 'g/100g',
            specification: { reference: 'First caffeine statement', sourceDate },
          },
          {
            status: 'absent',
            specification: { reference: 'Second caffeine statement', sourceDate },
          },
        ],
      },
    });
    const result = caffeineCheckForProduct(conflicting.product, '2026-11-19', conflicting.formulations, conflicting.ingredients);
    expect(result?.status).toBe('REVIEW REQUIRED');
    expect(result?.inputs.filter((input) => input.name.startsWith('Conflicting caffeine evidence for')))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ sourceId: 'First caffeine statement' }),
        expect.objectContaining({ sourceId: 'Second caffeine statement' }),
      ]));
  });

  it('does not count a compound ingredient component without an evidenced compound total', () => {
    const base = records();
    const compound: IngredientRecord = {
      id: 'compound',
      name: 'Caffeine premix',
      recordType: 'ingredient',
      kind: 'compound',
      compoundFormulationId: 'premix-recipe',
      compoundNutritionBasis: 'whole',
      tags: [],
      createdAt: now,
      updatedAt: now,
    };
    const root: FormulationRecord = {
      ...base.formulations[0]!,
      id: 'compound-drink',
      lines: [
        { id: 'line-premix', kind: 'ingredient', ingredientId: compound.id, quantity: { value: '100', unit: 'g' } },
      ],
    };
    const premix: FormulationRecord = {
      ...base.formulations[0]!,
      id: 'premix-recipe',
    };
    const { packDetails, ...productWithoutPackDetails } = base.product;
    void packDetails;
    const product: ProductRecord = { ...productWithoutPackDetails, formulationId: root.id };
    const result = caffeineCheckForProduct(
      product,
      '2026-11-19',
      [root, premix],
      [compound, ...base.ingredients],
    );
    expect(result?.status).toBe('REVIEW REQUIRED');
    expect(result?.explanation).toContain('Caffeine content is not established for compound-drink > line-premix > compound');
    expect(result?.inputs.some((input) => input.name.includes('Caffeine content in premix-recipe'))).toBe(false);
  });
});
