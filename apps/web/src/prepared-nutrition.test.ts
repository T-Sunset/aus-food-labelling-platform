import { describe, expect, it } from 'vitest';
import type { FormulationRecord, IngredientRecord, ProductPreparation, ProductRecord } from '@aus-food/storage';
import { buildIngredientRecord, emptyIngredientDraft } from './ingredient-form';
import { makeNipDraft } from './nip-draft';
import { makePreparedNutritionDraft } from './prepared-nutrition';
import { makeNutritionPanel } from './nutrition-panel';
import { nutritionRecipeSignature, preparationRecipeSignature, preparationSnapshot } from './product-form';
import { finishedNutritionSnapshot } from './finished-nutrition';

const now = '2026-01-01T00:00:00.000Z';
function ingredient(id: string, protein: string, energy: string): IngredientRecord {
  const draft = emptyIngredientDraft();
  Object.assign(draft, { name: id, kind: 'atomic', specificationReference: `${id} source`,
    specificationDate: '2026-01-01', energyPer100g: energy });
  draft.nutrients = { protein, fat: '0', saturatedFat: '0', carbohydrate: '0', sugars: '0', sodium: '0' };
  return buildIngredientRecord(draft, undefined, () => id, now);
}
const powder = ingredient('Powder', '20', '400');
const water = ingredient('Water', '0', '0');
const recipe: FormulationRecord = {
  id: 'recipe', name: 'Recipe', recordType: 'formulation', tags: [], createdAt: now, updatedAt: now,
  lines: [{ id: 'one', kind: 'ingredient', ingredientId: powder.id, quantity: { value: '100', unit: 'g' } }],
};
const pack = { servingSize: '25', servingUnit: 'g' as const, nutritionFoodForm: 'solid' as const,
  nutritionRecipeSignature: nutritionRecipeSignature(recipe.id, [recipe], [powder, water]) };
const preparation: ProductPreparation = {
  enabled: true, kind: 'reconstituted', directions: 'Mix 25 g powder with 75 g water.',
  productAmount: { value: '25', unit: 'g' }, addedIngredientId: water.id,
  addedAmount: { value: '75', unit: 'g' }, preparedServing: { value: '50', unit: 'g' },
};
function productFor(prep: ProductPreparation, added: IngredientRecord = water): ProductRecord {
  return {
    id: 'product', name: 'Product', recordType: 'product', tags: [], createdAt: now, updatedAt: now,
    formulationId: recipe.id, foodState: 'asSold', packDetails: pack,
    preparation: { ...prep, mixingConfirmed: true, confirmationSnapshot: preparationSnapshot(
      prep, recipe.id, added, undefined, preparationRecipeSignature(recipe.id, [recipe], [powder, added])!,
    ) },
  };
}
function calculate(product: ProductRecord, added: IngredientRecord = water) {
  const ingredients = [powder, added];
  return makePreparedNutritionDraft(product, [recipe], ingredients, makeNipDraft(product, [recipe], ingredients));
}

describe('consumer preparation nutrition', () => {
  it('connects the reconstituted result to a clearly identified review-only panel', () => {
    const item = productFor(preparation);
    const nutrition = makeNipDraft(item, [recipe], [powder, water]);
    const result = makeNutritionPanel(item, nutrition, calculate(item));
    expect(result.basis).toBe('reconstituted');
    expect(result.rows[0]).toMatchObject({ serving: '50 kJ', unitQuantity: '100 kJ' });
    expect(result.rows[1]).toMatchObject({ serving: '2.5 g', unitQuantity: '5.0 g' });
    expect(result.servingSize).toBe('50 g');
    expect(result.servingsPerPack).toBe('Needs review');
    expect(result.missing.join(' ')).toContain('applicable provisions');
    const volumePrep = { ...preparation, preparedServing: { value: '50', unit: 'mL' as const } };
    const volume = productFor(volumePrep);
    const volumePanel = makeNutritionPanel(volume, makeNipDraft(volume, [recipe], [powder, water]), calculate(volume));
    expect(volumePanel.unitHeading).toContain('100 mL');
    expect(volumePanel.rows[1]?.unitQuantity).toBe('Not available');
  });

  it('only shows a combined-food column when its preparation matches one product serving', () => {
    const milk = ingredient('Milk', '4', '200');
    const withMilk: ProductPreparation = { ...preparation, kind: 'withFood', directions: 'Serve with milk.',
      addedIngredientId: milk.id, preparedServing: { value: '100', unit: 'g' } };
    const item = productFor(withMilk, milk);
    const nutrition = makeNipDraft(item, [recipe], [powder, milk]);
    const panel = makeNutritionPanel(item, nutrition, calculate(item, milk));
    expect(panel.basis).toBe('asSold');
    expect(panel.combinedHeading).toBe('With Milk');
    expect(panel.combinedDescription).toBe('Per serving with 75 g of Milk.');
    expect(panel.note).toContain('75 g of Milk');
    expect(panel.rows[1]).toMatchObject({ serving: '5.0 g', unitQuantity: '20.0 g', combined: '8.0 g' });
    const otherServing = productFor({ ...withMilk, preparedServing: { value: '50', unit: 'g' } }, milk);
    const unmatched = makeNutritionPanel(otherServing, makeNipDraft(otherServing, [recipe], [powder, milk]), calculate(otherServing, milk));
    expect(unmatched.rows[1]?.combined).toBe('Not available');
    expect(unmatched.combinedDescription).toBeUndefined();
    expect(unmatched.missing.join(' ')).toContain('must match one product serving');
    const uncertain = { ...item, consumerDirections: 'unknown' as const };
    const withheld = makeNutritionPanel(uncertain, makeNipDraft(uncertain, [recipe], [powder, milk]), calculate(uncertain, milk));
    expect(withheld.basis).toBe('review');
    expect(withheld.rows.every((row) => row.unitQuantity === 'Not available')).toBe(true);
  });

  it('does not use a conflicting as-sold nutrient basis in prepared calculations', () => {
    const conflictingPowder: IngredientRecord = {
      ...powder,
      ingredientDensity: { gramsPerMillilitre: '1', evidenceReference: 'Test density', sourceDate: '2026-01-01' },
      nutritionPer100mL: { protein: {
        value: '21', sourceId: 'Test volume', sourceDate: '2026-01-01', evidenceType: 'analysis',
      } },
    };
    const ingredients = [conflictingPowder, water];
    const item: ProductRecord = {
      ...productFor(preparation),
      packDetails: { ...pack, nutritionRecipeSignature: nutritionRecipeSignature(recipe.id, [recipe], ingredients) },
      preparation: { ...preparation, mixingConfirmed: true, confirmationSnapshot: preparationSnapshot(
        preparation, recipe.id, water, undefined, preparationRecipeSignature(recipe.id, [recipe], ingredients)!,
      ) },
    };
    const nutrition = makeNipDraft(item, [recipe], ingredients);
    const result = makePreparedNutritionDraft(item, [recipe], ingredients, nutrition);
    expect(nutrition.missing.join(' ')).toContain('protein values per 100 g and per 100 mL differ');
    expect(result?.rows[0]?.per100g).toBe('100 kJ');
    expect(result?.rows[1]?.per100g).toBe('Not available');
  });

  it('calculates the reconstituted basis and a separate prepared serving from evidenced ingredients', () => {
    const product = productFor(preparation);
    const result = calculate(product)!;
    expect(result.basis).toBe('reconstituted');
    expect(result.productMass).toBe('25');
    expect(result.addedMass).toBe('75');
    expect(result.rows[0]).toEqual({ label: 'Energy', per100g: '100 kJ', serving: '50 kJ' });
    expect(result.rows[1]).toEqual({ label: 'Protein', per100g: '5.0 g', serving: '2.5 g' });
    expect(result.missing).toEqual([]);
    expect(result.sources.find((source) => source.nutrient === 'Protein')).toMatchObject({
      value: '0', sourceId: 'Water source', sourceDate: '2026-01-01',
    });
    expect(makeNipDraft(product, [recipe], [powder, water]).rows[1]?.unitQuantity).toBe('Not available');
  });

  it('keeps as-sold and combined-food bases separate', () => {
    const milk = ingredient('Milk', '4', '200');
    const mixed = productFor({ ...preparation, kind: 'withFood', directions: 'Serve with milk.', addedIngredientId: milk.id }, milk);
    expect(calculate(mixed, milk)?.basis).toBe('withFood');
    expect(calculate(mixed, milk)?.rows[1]).toEqual({ label: 'Protein', per100g: '8.0 g', serving: '4.0 g' });
    expect(makeNipDraft(mixed, [recipe], [powder, milk]).rows[1]?.unitQuantity).toBe('20.0 g');
    expect(calculate({ ...mixed, foodState: 'asReconstituted' }, milk)?.missing.join(' '))
      .toContain('conflicts with the selected reconstituted food state');
    const alsoDrained = { ...mixed, draining: { enabled: true, values: {} } };
    expect(calculate(alsoDrained, milk)?.rows[1]?.per100g).toBe('Not available');
    expect(calculate(alsoDrained, milk)?.missing.join(' ')).toContain('Preparation together with draining');
    expect(calculate({ ...mixed, preparation: { ...mixed.preparation!, enabled: false } })).toBeUndefined();
  });

  it('withholds prepared values for unknown, contradictory or other consumer directions', () => {
    const recorded = productFor(preparation);
    for (const candidate of [
      { ...recorded, consumerDirections: 'unknown' as const },
      { ...recorded, consumerDirections: 'none' as const },
      { ...recorded, consumerDirections: 'present' as const, otherConsumerDirections: true },
    ]) {
      const result = calculate(candidate)!;
      expect(result.rows.every((row) => row.per100g === 'Not available')).toBe(true);
      expect(result.missing.length).toBeGreaterThan(0);
    }
  });

  it('uses selected finished-food nutrition rather than reverting to ingoing ingredients', () => {
    const finishedRecipe: FormulationRecord = { ...recipe, finishedNutrition: {
      selected: true, recipeSnapshot: finishedNutritionSnapshot(recipe, [recipe], [powder, water]),
      nutrientProfile: { ingredientId: recipe.id, values: { protein: {
        value: '12', unit: 'g/100g', sourceId: 'Finished test', sourceDate: '2026-01-01', evidenceType: 'analysis',
      } } },
      energyPer100g: { value: '300', sourceId: 'Finished test', sourceDate: '2026-01-01', evidenceType: 'analysis' },
    } };
    const recipes = [finishedRecipe];
    const ingredients = [powder, water];
    const product: ProductRecord = { ...productFor(preparation), packDetails: {
      ...pack, nutritionRecipeSignature: nutritionRecipeSignature(recipe.id, recipes, ingredients),
    }, preparation: { ...preparation, mixingConfirmed: true, confirmationSnapshot: preparationSnapshot(
      preparation, recipe.id, water, undefined, preparationRecipeSignature(recipe.id, recipes, ingredients)!,
    ) } };
    const result = makePreparedNutritionDraft(product, recipes, ingredients, makeNipDraft(product, recipes, ingredients));
    expect(result?.rows[1]?.per100g).toBe('3.0 g');
    expect(result?.rows[0]?.per100g).toBe('75 kJ');
  });

  it('does not guess missing ingredients, nutrient values, directions or confirmation', () => {
    const unknownWater = ingredient('Water', '', '0');
    const product = productFor(preparation, unknownWater);
    const missingProtein = calculate(product, unknownWater)!;
    expect(missingProtein.rows[1]?.per100g).toBe('Not available');
    expect(missingProtein.rows[0]?.per100g).toBe('100 kJ');
    expect(missingProtein.missing.join(' ')).toContain('Protein: added food nutrition');
    const noDirections = productFor({ ...preparation, directions: '' });
    expect(calculate(noDirections)?.rows[1]?.per100g).toBe('Not available');
    const changedIngredient = { ...water, name: 'Changed water' };
    expect(calculate(productFor(preparation), changedIngredient)?.missing.join(' '))
      .toContain('Confirm the amounts match the directions');
    expect(calculate(productFor(preparation), changedIngredient)?.rows[1]?.per100g).toBe('Not available');
    const changedPowder = { ...powder, name: 'Changed powder' };
    const original = productFor(preparation);
    const changedIngredients = [changedPowder, water];
    expect(makePreparedNutritionDraft(original, [recipe], changedIngredients, makeNipDraft(original, [recipe], changedIngredients))
      ?.missing.join(' ')).toContain('Confirm the amounts match the directions');
    const noAdded = { ...productFor(preparation), preparation: { ...productFor(preparation).preparation!, addedIngredientId: 'missing' } };
    expect(calculate(noAdded)?.missing.join(' ')).toContain('available added food');
    const noServing = productFor({ enabled: true, kind: 'reconstituted', directions: preparation.directions!,
      productAmount: preparation.productAmount!, addedIngredientId: water.id, addedAmount: preparation.addedAmount! });
    expect(calculate(noServing)?.rows[1]?.serving).toBe('Not available');
    expect(calculate(noServing)?.missing.join(' ')).toContain('Prepared serving size');
  });

  it('requires sourced density separately for added volume and prepared-serving volume', () => {
    const volumePrep: ProductPreparation = {
      ...preparation, addedAmount: { value: '75', unit: 'mL' }, preparedServing: { value: '50', unit: 'mL' },
    };
    const withoutDensity = calculate(productFor(volumePrep))!;
    expect(withoutDensity.rows[1]?.per100g).toBe('Not available');
    expect(withoutDensity.missing.join(' ')).toContain('Added food density');
    const waterWithDensity = { ...water, ingredientDensity: {
      gramsPerMillilitre: '1', evidenceReference: 'Test water density', sourceDate: '2026-01-01',
    } };
    const withWaterDensity = calculate(productFor(volumePrep, waterWithDensity), waterWithDensity)!;
    expect(withWaterDensity.rows[1]?.per100g).toBe('5.0 g');
    expect(withWaterDensity.rows[1]?.serving).toBe('Not available');
    expect(withWaterDensity.missing.join(' ')).toContain('Prepared food density');
    const both = { ...volumePrep, preparedDensity: {
      gramsPerMillilitre: '1.2', evidenceReference: 'Test mixture density', sourceDate: '2026-01-01',
    } };
    expect(calculate(productFor(both, waterWithDensity), waterWithDensity)?.rows[1]?.serving).toBe('3.0 g');
  });

  it('does not silently use conflicting mass and volume nutrition for an added food', () => {
    const conflictingWater: IngredientRecord = {
      ...water,
      ingredientDensity: { gramsPerMillilitre: '1', evidenceReference: 'Density test', sourceDate: '2026-01-01' },
      nutritionPer100mL: { protein: {
        value: '1', sourceId: 'Volume test', sourceDate: '2026-01-01', evidenceType: 'analysis',
      } },
    };
    const result = calculate(productFor(preparation, conflictingWater), conflictingWater)!;
    expect(result.rows[1]?.per100g).toBe('Not available');
    expect(result.missing.join(' ')).toContain('protein values per 100 g and per 100 mL differ');
  });

  it('rejects unsupported compound component calculations and an unconfirmed as-sold recipe', () => {
    const compound = { ...water, kind: 'compound' as const, compoundNutritionBasis: 'components' as const };
    const product = productFor(preparation, compound);
    expect(calculate(product, compound)?.rows[1]?.per100g).toBe('Not available');
    expect(calculate(product, compound)?.missing.join(' ')).toContain('component nutrition need review');
    const withoutSignature = { ...productFor(preparation), packDetails: { ...pack, nutritionRecipeSignature: 'stale' } };
    expect(calculate(withoutSignature)?.rows[1]?.per100g).toBe('Not available');
    expect(calculate(withoutSignature)?.missing.join(' ')).toContain('Confirm the as-sold recipe');
  });
});
