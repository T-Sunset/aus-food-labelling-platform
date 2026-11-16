import { describe, expect, it } from 'vitest';
import type { IngredientRecord } from '@aus-food/storage';
import { buildFormulationRecord, emptyFormulationDraft } from './formulation-form';
import { buildIngredientRecord, draftFromIngredient, emptyAdditiveSourceDraft, emptyIngredientDraft } from './ingredient-form';

const now = '2026-11-11T00:00:00.000Z';
let nextId = 0;
const makeId = (prefix: string) => `${prefix}-${++nextId}`;

function supplierIngredient(
  name: string,
  identity: NonNullable<IngredientRecord['ingredientIdentity']>['code'],
  energy: string,
  sugar: string,
  compoundFormulationId?: string,
): IngredientRecord {
  const draft = emptyIngredientDraft();
  draft.name = name;
  draft.kind = compoundFormulationId ? 'compound' : 'atomic';
  draft.compoundFormulationId = compoundFormulationId ?? '';
  draft.specificationReference = `SPEC-${name.toUpperCase()}`;
  draft.specificationDate = '2026-11-01';
  draft.ingredientIdentity = identity;
  draft.caffeineStatus = identity === 'caffeine' ? 'present' : 'absent';
  if (identity === 'caffeine') {
    draft.caffeineAmount = '100';
    draft.caffeineUnit = 'g/100g';
  }
  draft.energyPer100g = energy;
  draft.nutrients = { protein: '0', fat: '0', saturatedFat: '0', carbohydrate: sugar, sugars: sugar, sodium: '0' };
  draft.allergensConfirmed = true;
  draft.additivesConfirmed = true;
  if (identity === 'citric-acid' || identity === 'caffeine') {
    const additive = emptyAdditiveSourceDraft(makeId('additive'));
    additive.additiveName = name;
    additive.sourceStatus = 'added';
    additive.declarationRoute = identity === 'caffeine' ? 'addedCaffeine' : 'unknown';
    additive.showEvidence = true;
    additive.sourceReference = draft.specificationReference;
    additive.sourceDate = draft.specificationDate;
    draft.additiveSources.push(additive);
  }
  return buildIngredientRecord(draft, undefined, makeId, now);
}

describe('fictional drink supplier data entry', () => {
  it('builds the drink and complete blend from sourced supplier data', () => {
    const water = supplierIngredient('Water', 'water', '0', '0');
    const sugar = supplierIngredient('Sugar', 'sugar', '1700', '100');
    const acid = supplierIngredient('Acid', 'citric-acid', '1000', '0');
    const caffeine = supplierIngredient('Caffeine', 'caffeine', '0', '0');
    const oilDraft = emptyIngredientDraft();
    oilDraft.name = 'Lemon oil';
    oilDraft.kind = 'atomic';
    oilDraft.specificationReference = 'SPEC-FLAVOUR';
    oilDraft.specificationDate = '2026-11-01';
    oilDraft.ingredientIdentity = 'lemon-peel-oil';
    const oil = buildIngredientRecord(oilDraft, undefined, makeId, now);
    expect(oil.caffeineEvidence).toBeUndefined();
    expect(oil.nutrientProfile).toBeUndefined();
    const blendDraft = emptyFormulationDraft();
    blendDraft.name = 'Citrus composition';
    blendDraft.compositionCoverage = 'complete';
    blendDraft.compositionReference = 'SPEC-FLAVOUR';
    blendDraft.compositionDate = '2026-11-01';
    blendDraft.lines = [
      { id: 'blend-water', kind: 'ingredient', targetId: water.id, quantity: '99.9', unit: 'g' },
      { id: 'blend-oil', kind: 'ingredient', targetId: oil.id, quantity: '0.1', unit: 'g' },
    ];
    const blendComposition = buildFormulationRecord(blendDraft, undefined, makeId, now);
    const flavour = supplierIngredient('Flavour', 'flavour-blend', '3.7', '0', blendComposition.id);
    const recipe = emptyFormulationDraft();
    recipe.name = 'Drink';
    recipe.lines = [water, sugar, acid, flavour, caffeine].map((item, index) => ({
      id: `drink-${index}`, kind: 'ingredient', targetId: item.id,
      quantity: ['93.47', '10', '0.20', '0.30', '0.030'][index]!, unit: 'kg',
    }));
    const drink = buildFormulationRecord(recipe, undefined, makeId, now);
    const edit = draftFromIngredient(flavour);
    edit.specificationDate = '2026-11-02';
    const edited = buildIngredientRecord(edit, flavour, makeId, now);
    expect(edited.ingredientIdentity?.specification.sourceDate).toBe('2026-11-01');
    expect(edited.caffeineEvidence?.specification.sourceDate).toBe('2026-11-01');
    expect(edited.nutrientProfile?.values.protein?.value).toBe('0');
    expect(caffeine.caffeineEvidence).toMatchObject({
      status: 'present', amount: '100', unit: 'g/100g',
    });
    expect(flavour.compoundFormulationId).toBe(blendComposition.id);
    expect(blendComposition.supplierComposition?.coverage).toBe('complete');
    expect(drink.lines).toHaveLength(5);
  });
});
