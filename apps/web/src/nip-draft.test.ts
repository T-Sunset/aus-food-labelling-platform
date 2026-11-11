import { describe, expect, it } from 'vitest';
import type { FormulationRecord, IngredientRecord, ProductRecord } from '@aus-food/storage';
import { buildIngredientRecord, emptyIngredientDraft } from './ingredient-form';
import { makeNipDraft } from './nip-draft';
import { nutritionRecipeSignature } from './product-form';

const now = '2026-01-01T00:00:00.000Z';
function ingredient(id: string, protein: string, energy: string): IngredientRecord {
  const draft = emptyIngredientDraft();
  Object.assign(draft, { name: id, kind: 'atomic', specificationReference: `${id} spec`, specificationDate: '2026-01-01', energyPer100g: energy });
  draft.nutrients = { protein, fat: '0', saturatedFat: '0', carbohydrate: '0', sugars: '0', sodium: '1' };
  return buildIngredientRecord(draft, undefined, () => id, now);
}
const recipes: FormulationRecord[] = [
  {
    id: 'root', name: 'Root', recordType: 'formulation', tags: [], createdAt: now, updatedAt: now,
    lines: [
      { id: 'a', kind: 'ingredient', ingredientId: 'A', quantity: { value: '25', unit: 'g' } },
      { id: 'nested', kind: 'formulation', formulationId: 'sub', quantity: { value: '75', unit: 'g' } },
    ],
  },
  {
    id: 'sub', name: 'Sub', recordType: 'formulation', tags: [], createdAt: now, updatedAt: now,
    lines: [
      { id: 'b1', kind: 'ingredient', ingredientId: 'B', quantity: { value: '1', unit: 'g' } },
      { id: 'b2', kind: 'ingredient', ingredientId: 'B', quantity: { value: '1', unit: 'g' } },
    ],
  },
];
const ingredients = [ingredient('A', '20', '500'), ingredient('B', '4', '100')];
const product: ProductRecord = {
  id: 'p', name: 'Example', recordType: 'product', tags: [], createdAt: now, updatedAt: now,
  formulationId: 'root', foodState: 'asSold',
  packDetails: {
    servingSize: '25', servingUnit: 'g', servingsPerPack: '4', netQuantity: '100', netUnit: 'g', nutritionFoodForm: 'solid',
    nutritionRecipeSignature: nutritionRecipeSignature('root', recipes),
  },
};

describe('draft nutrition information', () => {
  it('calculates independent serving and 100 g columns from nested ingoing ingredients', () => {
    const result = makeNipDraft(product, recipes, ingredients);
    expect(result.missing).toEqual([]);
    expect(result.rows[0]).toEqual({ label: 'Energy', serving: '50 kJ', unitQuantity: '200 kJ' });
    expect(result.rows[1]).toEqual({ label: 'Protein', serving: '2.0 g', unitQuantity: '8.0 g' });
    expect(result.rows[6]).toEqual({ label: 'Sodium', serving: '0 mg', unitQuantity: '1 mg' });
  });

  it('uses a compound ingredient profile without also counting its children', () => {
    const compound = { ...ingredients[0]!, kind: 'compound' as const, compoundFormulationId: 'sub' };
    const result = makeNipDraft(product, recipes, [compound, ingredients[1]!]);
    expect(result.rows[1]?.unitQuantity).toBe('8.0 g');
    expect(result.rows[0]?.unitQuantity).toBe('200 kJ');
  });

  it('requires density evidence for volume, including mixed serving and pack units', () => {
    const liquid = { ...product, packDetails: { ...product.packDetails!, servingSize: '50', servingUnit: 'mL' as const, netUnit: 'mL' as const, nutritionFoodForm: 'liquid' as const } };
    const absent = makeNipDraft(liquid, recipes, ingredients);
    expect(absent.missing.join(' ')).toContain('density');
    expect(absent.rows[0]?.serving).toBe('Not available');
    const density = { gramsPerMillilitre: '1.2', evidenceReference: 'test', sourceDate: '2026-01-01' };
    const result = makeNipDraft({ ...liquid, packDetails: { ...liquid.packDetails, nutritionDensity: density } }, recipes, ingredients);
    expect(result.unitHeading).toBe('Average per 100 mL');
    expect(result.rows[0]).toEqual({ label: 'Energy', serving: '120 kJ', unitQuantity: '240 kJ' });
    expect(result.rows[1]).toEqual({ label: 'Protein', serving: '4.8 g', unitQuantity: '9.6 g' });
    const mixed = makeNipDraft({ ...liquid, packDetails: { ...liquid.packDetails, nutritionFoodForm: 'solid', nutritionDensity: density } }, recipes, ingredients);
    expect(mixed.rows[1]?.unitQuantity).toBe('8.0 g');
  });

  it('never substitutes zero for missing energy, invalid nutrients, or an unsupported food basis', () => {
    const { energyPer100g: energy, ...noEnergy } = ingredients[0]!;
    expect(energy).toBeDefined();
    const missing = makeNipDraft(product, recipes, [noEnergy, ingredients[1]!]);
    expect(missing.missing.join(' ')).toContain('supplier energy');
    expect(missing.rows[0]?.serving).toBe('Not available');
    const invalid = { ...ingredients[0]!, nutrientProfile: { ingredientId: 'A', values: {} } };
    expect(makeNipDraft(product, recipes, [invalid, ingredients[1]!]).rows[1]?.serving).toBe('Not available');
    const prepared = makeNipDraft({ ...product, foodState: 'asPrepared' }, recipes, ingredients);
    expect(prepared.missing.join(' ')).toContain('only supported for food as sold');
    expect(prepared.rows.every((row) => row.serving === 'Not available')).toBe(true);
  });

  it('invalidates the food-basis confirmation when the recipe changes and flags claims', () => {
    const changed = [{ ...recipes[0]!, lines: [recipes[0]!.lines[0]!] }, recipes[1]!];
    const result = makeNipDraft(product, changed, ingredients);
    expect(result.missing.join(' ')).toContain('Confirm that the recipe');
    expect(result.rows[0]?.serving).toBe('Not available');
    const claimed = makeNipDraft({ ...product, claims: [{ id: 'c', text: 'Low sugars', classification: 'nutrition_content', classificationConfirmed: true }] }, recipes, ingredients);
    expect(claimed.missing.join(' ')).toContain('Claim-related nutrition rows');
  });

  it('requires an explicit food form and detects conflicting confirmed claims information', () => {
    const { nutritionFoodForm: ignored, ...pack } = product.packDetails!;
    expect(ignored).toBe('solid');
    expect(makeNipDraft({ ...product, packDetails: pack }, recipes, ingredients).missing.join(' ')).toContain('solid or liquid');
    const conflict = makeNipDraft({ ...product, claimFacts: { foodForm: 'liquid', formOfFoodConfirmed: true } }, recipes, ingredients);
    expect(conflict.missing.join(' ')).toContain('conflicts');
    expect(conflict.rows[0]?.serving).toBe('Not available');
  });
});
