import { describe, expect, it } from 'vitest';
import type { FormulationRecord, IngredientRecord, ProductDraining, ProductRecord } from '@aus-food/storage';
import { makeDrainedNutritionDraft } from './drained-nutrition';
import { makeNipDraft } from './nip-draft';
import { makeNutritionPanel } from './nutrition-panel';
import { drainingSnapshot, preparationRecipeSignature } from './product-form';

const now = '2026-01-01T00:00:00.000Z';
const ingredient: IngredientRecord = {
  id: 'food', name: 'Food', kind: 'atomic', recordType: 'ingredient', tags: [], createdAt: now, updatedAt: now,
};
const recipe: FormulationRecord = {
  id: 'recipe', name: 'Recipe', recordType: 'formulation', tags: [], createdAt: now, updatedAt: now,
  lines: [{ id: 'line', kind: 'ingredient', ingredientId: 'food', quantity: { value: '100', unit: 'g' } }],
};
const draining: ProductDraining = {
  enabled: true, directions: 'Drain before eating.', servingGrams: '40',
  sourceType: 'analysis', sourceReference: 'Drained test analysis', sourceDate: '2026-01-01',
  values: { energy: '100', protein: '12', fat: '0', saturatedFat: '0', carbohydrate: '4', sugars: '1', sodium: '250' },
};
const signature = preparationRecipeSignature(recipe.id, [recipe], [ingredient])!;
const product: ProductRecord = {
  id: 'product', name: 'Product', recordType: 'product', formulationId: recipe.id, foodState: 'asDrained',
  tags: [], createdAt: now, updatedAt: now,
  draining: { ...draining, confirmationSnapshot: drainingSnapshot(draining, signature) },
};

function calculate(item: ProductRecord = product, recipes = [recipe], ingredients = [ingredient]) {
  return makeDrainedNutritionDraft(item, recipes, ingredients);
}

describe('drained food nutrition', () => {
  it('uses the evidenced drained values in the panel and withholds overlapping directions', () => {
    const nutrition = makeNipDraft(product, [recipe], [ingredient]);
    const panel = makeNutritionPanel(product, nutrition, undefined, calculate());
    expect(panel.basis).toBe('drained');
    expect(panel.servingSize).toBe('40 g');
    expect(panel.rows[1]).toMatchObject({ serving: '4.8 g', unitQuantity: '12.0 g' });
    expect(panel.note).toContain('Drained');
    const overlapping = { ...product, preparation: { enabled: true, kind: 'withFood' as const, directions: 'Mix with milk.' } };
    const withheld = makeNutritionPanel(overlapping, nutrition, {
      basis: 'withFood', directions: 'Mix with milk.', addedFood: 'Milk', rows: [], missing: [], sources: [], densities: [],
    }, calculate(overlapping));
    expect(withheld.basis).toBe('review');
    expect(withheld.rows.every((row) => row.unitQuantity === 'Not available')).toBe(true);
  });

  it('uses evidenced drained values per 100 g and calculates a separate serving', () => {
    const result = calculate()!;
    expect(result.rows[0]).toMatchObject({ label: 'Energy', per100g: '100 kJ', serving: '40 kJ' });
    expect(result.rows[1]).toMatchObject({ label: 'Protein', per100g: '12.0 g', serving: '4.8 g', input: '12 g/100 g' });
    expect(result.rows[2]?.per100g).toBe('0.0 g');
    expect(result.rows[6]).toMatchObject({ label: 'Sodium', per100g: '250 mg', serving: '100 mg' });
    expect(result.missing).toEqual([]);
    expect(result.sourceReference).toBe('Drained test analysis');
    expect(makeNipDraft(product, [recipe], [ingredient]).rows[1]?.unitQuantity).toBe('Not available');
  });

  it('does not use a whole-pack recipe or weight as a substitute for missing drained values', () => {
    const incomplete = { ...product, draining: { enabled: true, servingGrams: '40', values: {} } };
    const result = calculate(incomplete)!;
    expect(result.rows.every((row) => row.per100g === 'Not available')).toBe(true);
    expect(result.missing.join(' ')).toContain('Confirm that the values describe');
    expect(result.missing.join(' ')).toContain('Protein: drained food value is not recorded');
    expect(calculate({ ...product, draining: undefined })?.rows[1]?.per100g).toBe('Not available');
  });

  it('invalidates changed directions, nutrient evidence and recipe inputs', () => {
    const changedDirections = { ...product, draining: { ...product.draining!, directions: 'Rinse and drain.' } };
    expect(calculate(changedDirections)?.rows[1]?.per100g).toBe('Not available');
    expect(calculate(changedDirections)?.missing.join(' ')).toContain('Confirm that the values describe');
    const changedValues = { ...product, draining: { ...product.draining!, values: { ...draining.values, protein: '15' } } };
    expect(calculate(changedValues)?.rows[1]?.per100g).toBe('Not available');
    expect(calculate(product, [recipe], [{ ...ingredient, name: 'Changed food' }])?.rows[1]?.per100g).toBe('Not available');
    expect(calculate({ ...product, draining: { ...product.draining!, servingGrams: '50' } })?.rows[1]?.serving).toBe('6.0 g');
    expect(calculate({ ...product, packDetails: { servingUnit: 'g', servingSize: '30' } })?.rows[1]?.serving).toBe('3.6 g');
  });

  it('keeps individual missing values and missing serving unknown', () => {
    const partial: ProductDraining = { ...draining, values: { energy: '100' } };
    const { servingGrams, ...withoutServing } = partial;
    expect(servingGrams).toBe('40');
    const result = calculate({ ...product, draining: {
      ...withoutServing, confirmationSnapshot: drainingSnapshot(withoutServing, signature),
    } })!;
    expect(result.rows[0]?.per100g).toBe('100 kJ');
    expect(result.rows[0]?.serving).toBe('Not available');
    expect(result.rows[1]?.per100g).toBe('Not available');
    expect(result.missing.join(' ')).toContain('Drained serving size is not recorded');
  });

  it('leaves non-drained food alone and prevents unsupported overlapping preparation', () => {
    expect(calculate({ ...product, foodState: 'asSold', draining: undefined })).toBeUndefined();
    const disabled = { ...product, foodState: 'asSold' as const, draining: { ...product.draining!, enabled: false } };
    expect(calculate(disabled)).toBeUndefined();
    expect(makeNipDraft(disabled, [recipe], [ingredient]).missing.join(' ')).not.toContain('drained nutrition');
    const asSold = { ...product, foodState: 'asSold' as const };
    expect(calculate(asSold)?.rows[1]?.per100g).toBe('12.0 g');
    expect(makeNipDraft(asSold, [recipe], [ingredient]).missing.join(' ')).toContain('drained nutrition is not connected');
    const overlapping = { ...product, preparation: { enabled: true, kind: 'withFood' as const } };
    expect(calculate(overlapping)?.rows[1]?.per100g).toBe('Not available');
    expect(calculate(overlapping)?.missing.join(' ')).toContain('another preparation');
    const { foodState, ...unknownState } = product;
    expect(foodState).toBe('asDrained');
    expect(calculate(unknownState)?.rows[1]?.per100g).toBe('Not available');
  });

  it('withholds drained values for unknown, contradictory or other consumer directions', () => {
    for (const candidate of [
      { ...product, consumerDirections: 'unknown' as const },
      { ...product, consumerDirections: 'none' as const },
      { ...product, consumerDirections: 'present' as const, otherConsumerDirections: true },
    ]) {
      const result = calculate(candidate)!;
      expect(result.rows.every((row) => row.per100g === 'Not available')).toBe(true);
      expect(result.missing.length).toBeGreaterThan(0);
    }
  });

  it('uses confirmed values without source details but rejects an invalid supplied date', () => {
    const noSource: ProductDraining = {
      enabled: true, directions: 'Drain before eating.', servingGrams: '40', values: draining.values,
    };
    const unsourced = calculate({ ...product, draining: {
      ...noSource, confirmationSnapshot: drainingSnapshot(noSource, signature),
    } })!;
    expect(unsourced.rows[1]?.per100g).toBe('12.0 g');
    const invalidDate = { ...draining, sourceDate: '2026-02-31' };
    const result = calculate({ ...product, draining: {
      ...invalidDate, confirmationSnapshot: drainingSnapshot(invalidDate, signature),
    } })!;
    expect(result.rows[1]?.per100g).toBe('Not available');
    expect(result.missing.join(' ')).toContain('Check the drained nutrition source date');
  });
});
