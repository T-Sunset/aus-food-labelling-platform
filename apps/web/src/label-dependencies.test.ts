import { describe, expect, it } from 'vitest';
import type { FormulationRecord, IngredientRecord, ProductRecord } from '@aus-food/storage';
import { labelDependencySignature } from './label-dependencies';

const date = '2026-01-01T00:00:00.000Z';
const base = { tags: [], createdAt: date, updatedAt: date };
const ingredient: IngredientRecord = { ...base, id: 'ingredient', name: 'Ingredient', recordType: 'ingredient', kind: 'atomic' };
const added: IngredientRecord = { ...ingredient, id: 'added', name: 'Added' };
const other: IngredientRecord = { ...ingredient, id: 'other', name: 'Other' };
const nested: FormulationRecord = {
  ...base, id: 'nested', name: 'Nested', recordType: 'formulation',
  lines: [{ id: 'line', kind: 'ingredient', ingredientId: ingredient.id, quantity: { value: '1', unit: 'g' } }],
};
const recipe: FormulationRecord = {
  ...base, id: 'recipe', name: 'Recipe', recordType: 'formulation',
  lines: [{ id: 'line', kind: 'formulation', formulationId: nested.id, quantity: { value: '1', unit: 'g' } }],
};
const product: ProductRecord = {
  ...base, id: 'product', name: 'Product', recordType: 'product', formulationId: recipe.id,
  preparation: { enabled: true, addedIngredientId: added.id },
};

describe('label dependency signature', () => {
  const signature = (recipes: FormulationRecord[], ingredients: IngredientRecord[]) =>
    labelDependencySignature(product, recipes, ingredients);

  it('tracks nested recipes, their ingredients and preparation additions, but not unrelated records', () => {
    const original = signature([recipe, nested], [ingredient, added, other]);
    expect(signature([recipe, { ...nested, name: 'Changed' }], [ingredient, added, other])).not.toBe(original);
    expect(signature([recipe, nested], [{ ...ingredient, name: 'Changed' }, added, other])).not.toBe(original);
    expect(signature([recipe, nested], [ingredient, { ...added, name: 'Changed' }, other])).not.toBe(original);
    expect(signature([recipe, nested], [ingredient, added, { ...other, name: 'Changed' }])).toBe(original);
  });

  it('distinguishes missing references from present records', () => {
    const missingRecipe = signature([recipe], [ingredient, added]);
    expect(missingRecipe).not.toBe(signature([recipe, nested], [ingredient, added]));
    const missingIngredient = signature([recipe, nested], [added]);
    expect(missingIngredient).not.toBe(signature([recipe, nested], [ingredient, added]));
    expect(missingIngredient).toContain('"ingredient",null');
  });

  it('tracks compound and unquantified composition references', () => {
    const compound: IngredientRecord = { ...ingredient, id: 'compound', kind: 'compound', compoundFormulationId: nested.id };
    const root: FormulationRecord = {
      ...recipe,
      lines: [{ id: 'compound-line', kind: 'ingredient', ingredientId: compound.id, quantity: { value: '1', unit: 'g' } }],
      incompleteRecipeLines: { unquantifiedLines: [{ id: 'unknown', kind: 'ingredient', ingredientId: other.id }], lineOrder: ['compound-line', 'unknown'] },
    };
    const original = signature([root, nested], [compound, ingredient, other, added]);
    expect(signature([root, nested], [compound, { ...ingredient, name: 'Changed' }, other, added])).not.toBe(original);
    expect(signature([root, nested], [compound, ingredient, { ...other, name: 'Changed' }, added])).not.toBe(original);
  });
});
