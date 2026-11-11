import { describe, expect, it } from 'vitest';
import type { FormulationRecord, IngredientRecord, ProductRecord } from '@aus-food/storage';
import { buildIngredientRecord, emptyIngredientDraft } from './ingredient-form';
import { makeLabelDraft } from './label-draft';
import { nutritionRecipeSignature } from './product-form';

const now = '2026-01-01T00:00:00.000Z';

function ingredient(name: string, allergens: string[] = []): IngredientRecord {
  const draft = emptyIngredientDraft();
  draft.name = name;
  draft.kind = 'atomic';
  draft.specificationReference = `${name}-spec`;
  draft.specificationDate = '2026-01-01';
  draft.knownAllergens = allergens;
  draft.allergensConfirmed = true;
  draft.additivesConfirmed = true;
  draft.nutrients = { protein: '1', fat: '1', saturatedFat: '1', carbohydrate: '1', sugars: '1', sodium: '1' };
  draft.energyPer100g = '100';
  return buildIngredientRecord(draft, undefined, (prefix) => prefix === 'ingredient' ? name : `${name}-${prefix}`, now);
}

const recipe: FormulationRecord = {
  id: 'recipe', name: 'Recipe', recordType: 'formulation', tags: [], createdAt: now, updatedAt: now,
  lines: [
    { id: 'a', kind: 'ingredient', ingredientId: 'Sugar', quantity: { value: '10', unit: 'g' } },
    { id: 'b', kind: 'ingredient', ingredientId: 'Flour', quantity: { value: '90', unit: 'g' } },
  ],
};
const product: ProductRecord = {
  id: 'product', name: 'Product', recordType: 'product', formulationId: 'recipe', foodState: 'asSold',
  builderProductType: 'other',
  packDetails: {
    servingSize: '50', servingUnit: 'g', servingsPerPack: '2', netQuantity: '100', netUnit: 'g', nutritionFoodForm: 'solid',
    nutritionRecipeSignature: nutritionRecipeSignature('recipe', [recipe]),
  },
  tags: [], createdAt: now, updatedAt: now,
};

describe('draft label and live readiness', () => {
  it('orders ingredients by ingoing mass and includes recorded allergens', () => {
    const result = makeLabelDraft(product, [recipe], [ingredient('Sugar'), ingredient('Flour', ['milk'])]);
    expect(result.declaration).toBe('Flour, Sugar');
    expect(result.allergens).toEqual(['milk']);
    expect(result.missing).toEqual([]);
    expect(result.warnings.join(' ')).toContain('consultant');
  });

  it('blocks missing or unconfirmed data rather than treating it as absent', () => {
    const incomplete = { ...ingredient('Sugar'), allergensConfirmed: false, additivesConfirmed: false };
    const result = makeLabelDraft({ ...product, packDetails: {} }, [recipe], [incomplete, ingredient('Flour')]);
    expect(result.missing.join(' ')).toMatch(/Serving size/);
    expect(result.missing.join(' ')).toMatch(/confirm the allergen/);
    expect(result.missing.join(' ')).toMatch(/confirm the additive/);
    expect(makeLabelDraft(product, [recipe], [incomplete]).missing.join(' ')).toMatch(/unavailable/);
    const { builderProductType: ignoredType, ...noType } = product;
    expect(ignoredType).toBe('other');
    expect(makeLabelDraft(noType, [recipe], [ingredient('Sugar'), ingredient('Flour')]).missing.join(' '))
      .toMatch(/Product type/);
    const sugar = ingredient('Sugar');
    const invalidNutrition: IngredientRecord = {
      ...sugar,
      nutrientProfile: { ...sugar.nutrientProfile!, values: {
        ...sugar.nutrientProfile!.values,
        protein: { ...sugar.nutrientProfile!.values.protein!, sourceId: '' },
      } },
    };
    expect(makeLabelDraft(product, [recipe], [invalidNutrition, ingredient('Flour')]).missing.join(' '))
      .toMatch(/Sugar: nutrition information/);
    const changedSpec: IngredientRecord = {
      ...sugar, specification: { reference: 'New spec', sourceDate: '2026-02-01' },
    };
    const changed = makeLabelDraft(product, [recipe], [changedSpec, ingredient('Flour')]);
    expect(changed.missing.join(' ')).toMatch(/confirm the allergen information/);
    expect(changed.missing.join(' ')).toMatch(/confirm the additive information/);
  });

  it('keeps final-food allergen conditions as a specific review warning', () => {
    const result = makeLabelDraft(product, [recipe], [ingredient('Sugar', ['sulphites']), ingredient('Flour')]);
    expect(result.allergens).not.toContain('sulphites');
    expect(result.pendingAllergens).toEqual(['sulphites']);
    expect(result.warnings.join(' ')).toMatch(/sulphites.*final-food conditions/);
  });

  it('shows additive wording only as a review candidate', () => {
    const sugar = ingredient('Sugar');
    const withAdditive: IngredientRecord = {
      ...sugar,
      additiveSources: [{
        id: 'preservative', additiveName: 'Example', sourceStatus: 'added',
        declarationSelection: {
          route: 'schedule7Class', schedule7ClassName: 'Preservative', substanceChoice: 'schedule8Name',
        },
      }],
    };
    const result = makeLabelDraft(product, [recipe], [withAdditive, ingredient('Flour')]);
    expect(result.declaration).toContain('[additives to check: Preservative (Example)]');
    expect(result.missing).toContain('Product additive and name information');
    expect(result.warnings.join(' ')).toContain('check whether and how');
    const unknownSource = { ...withAdditive, additiveSources: [{
      ...withAdditive.additiveSources![0]!, sourceStatus: 'unknown' as const,
    }] };
    expect(makeLabelDraft(product, [recipe], [unknownSource, ingredient('Flour')]).missing.join(' '))
      .toContain('confirm the source status');
  });

  it('does not silently treat an entered, unclassified claim as complete', () => {
    const withClaim: ProductRecord = { ...product, claims: [{ id: 'claim', text: 'Low sugars' }] };
    const result = makeLabelDraft(withClaim, [recipe], [ingredient('Sugar'), ingredient('Flour')]);
    expect(result.missing).toContain('Classify and confirm the claims you entered');
    expect(result.warnings.join(' ')).toContain('Claims are not included');
  });

  it('preserves compound structure and rejects missing or circular recipes', () => {
    const compound = { ...ingredient('Flour'), kind: 'compound' as const, compoundFormulationId: 'inside' };
    const inside: FormulationRecord = {
      ...recipe, id: 'inside', lines: [{ id: 'c', kind: 'ingredient', ingredientId: 'Sugar', quantity: { value: '1', unit: 'g' } }],
    };
    expect(makeLabelDraft(product, [recipe, inside], [compound, ingredient('Sugar')]).declaration)
      .toBe('Flour [Sugar], Sugar');
    const circular = { ...compound, compoundFormulationId: 'recipe' };
    expect(makeLabelDraft(product, [recipe], [circular, ingredient('Sugar')]).missing.join(' ')).toMatch(/circular/);
    expect(makeLabelDraft(product, [], []).missing.join(' ')).toMatch(/Recipe needs attention/);
  });
});
