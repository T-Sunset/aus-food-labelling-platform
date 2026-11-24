import { describe, expect, it } from 'vitest';
import type { FormulationRecord, IngredientRecord } from '@aus-food/storage';
import { buildIngredientRecord, emptyAdditiveSourceDraft, emptyIngredientDraft } from './ingredient-form';
import { makeFormulationSummary } from './formulation-summary';

const now = '2026-01-01T00:00:00.000Z';

function ingredient(name: string, protein: string, allergens: string[] = []): IngredientRecord {
  const draft = emptyIngredientDraft();
  draft.name = name;
  draft.kind = 'atomic';
  draft.energyPer100g = '200';
  draft.nutrients = { protein, fat: '2', saturatedFat: '1', carbohydrate: '10', sugars: '5', sodium: '100' };
  draft.knownAllergens = allergens;
  if (allergens.includes('wheat')) draft.wheatGlutenStatus = 'present';
  draft.allergensConfirmed = true;
  draft.additivesConfirmed = true;
  return buildIngredientRecord(draft, undefined, (prefix) => prefix === 'ingredient' ? name : `${name}-${prefix}`, now);
}

const additiveDraft = emptyIngredientDraft();
additiveDraft.name = 'Example additive';
additiveDraft.kind = 'atomic';
additiveDraft.nutrients.protein = '0';
additiveDraft.energyPer100g = '0';
const source = emptyAdditiveSourceDraft('source');
source.codeNumber = '999';
source.allergenIdsPresent = ['milk'];
source.showEvidence = true;
additiveDraft.additiveSources.push(source);
additiveDraft.directAdditiveSourceId = source.id;
additiveDraft.additivesConfirmed = true;
additiveDraft.allergensConfirmed = true;
const additive = buildIngredientRecord(additiveDraft, undefined, (prefix) => `${prefix}-additive`, now);
const compound: IngredientRecord = {
  ...ingredient('Blend', '4'), kind: 'compound', compoundFormulationId: 'inside', compoundNutritionBasis: 'components',
};
const inside: FormulationRecord = {
  id: 'inside', name: 'Blend recipe', recordType: 'formulation', tags: [], createdAt: now, updatedAt: now,
  supplierComposition: { coverage: 'complete', unquantifiedComponents: [] },
  lines: [
    { id: 'flour-line', kind: 'ingredient', ingredientId: 'Flour', quantity: { value: '75', unit: 'g' } },
    { id: 'additive-line', kind: 'ingredient', ingredientId: additive.id, quantity: { value: '25', unit: 'g' } },
  ],
};
const recipe: FormulationRecord = {
  id: 'recipe', name: 'Cake', recordType: 'formulation', tags: [], createdAt: now, updatedAt: now,
  lines: [{ id: 'blend-line', kind: 'ingredient', ingredientId: compound.id, quantity: { value: '2', unit: 'kg' } }],
};

describe('formulation summary', () => {
  it('shows batch and per-100 g nutrition, nested paths and recorded additive allergens', () => {
    const result = makeFormulationSummary(recipe, [recipe, inside], [compound, ingredient('Flour', '8', ['wheat']), additive]);
    expect(result.lines).toMatchObject([{ name: 'Blend', amount: '2 kg' }]);
    expect(result.breakdown).toContainEqual({ name: 'Flour', amount: '75 g', path: 'Cake → Blend → Blend recipe → Flour' });
    expect(result.nutrition.find((row) => row.label === 'Protein')).toMatchObject({ value: '6 g', batch: '120 g' });
    expect(result.nutrition.find((row) => row.label === 'Energy')).toMatchObject({ value: '150 kJ', batch: '3000 kJ' });
    expect(result.nutrition.find((row) => row.label === 'Fat, total')?.value).toBe('Not available');
    expect(result.allergens).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Wheat', status: 'present', path: 'Cake → Blend → Blend recipe → Flour' }),
      expect.objectContaining({ name: 'Milk', status: 'present', path: expect.stringContaining('Example additive') }),
    ]));
    expect(result.additiveSources[0]).toMatchObject({ path: expect.stringContaining('Blend recipe'), source: { codeNumber: '999' } });
  });

  it('retains known findings while missing amounts and partial composition block proportions', () => {
    const incomplete: FormulationRecord = {
      ...recipe, lines: [], incompleteRecipeLines: {
        unquantifiedLines: [{ id: 'blend-line', kind: 'ingredient', ingredientId: compound.id }],
        lineOrder: ['blend-line'],
      },
    };
    const partial: FormulationRecord = { ...inside, supplierComposition: { coverage: 'partial', unquantifiedComponents: [] } };
    const result = makeFormulationSummary(incomplete, [incomplete, partial], [compound, ingredient('Flour', '8', ['wheat']), additive]);
    expect(result.lines[0]).toMatchObject({ name: 'Blend', amount: 'Amount not entered' });
    expect(result.expansionIssue).toContain('amounts are unknown');
    expect(result.nutrition.every((row) => row.value === 'Not available' && row.batch === 'Not available')).toBe(true);
    expect(result.allergens.some((item) => item.name === 'Wheat')).toBe(true);
    expect(result.additiveSources).toHaveLength(1);
    expect(result.allergenGaps.join(' ')).toContain('incomplete');
    expect(result.additiveGaps.join(' ')).toContain('incomplete');
  });

  it('does not present conflicting nutrition or processed nested-recipe estimates as known', () => {
    const flour = ingredient('Flour', '8');
    const conflicting: IngredientRecord = { ...flour, nutritionPer100mL: {
      protein: { value: '20', sourceId: '', sourceDate: '' },
    }, ingredientDensity: { gramsPerMillilitre: '1', evidenceReference: '', sourceDate: '' } };
    const result = makeFormulationSummary(recipe, [recipe, inside], [compound, conflicting, additive]);
    expect(result.nutrition.find((row) => row.label === 'Protein')).toMatchObject({
      value: 'Not available', batch: 'Not available', missing: expect.arrayContaining([expect.stringContaining('differ')]),
    });
    const processed = { ...inside, processMassProfile: { changes: [], complete: false } };
    const needsReview = makeFormulationSummary(recipe, [recipe, processed], [compound, flour, additive]);
    expect(needsReview.nutritionIssue).toContain('processing effects need nutrition review');
    expect(needsReview.nutrition.every((row) => row.value === 'Not available')).toBe(true);
  });

  it('identifies conflicting allergen evidence instead of treating absence as settled', () => {
    const flour = ingredient('Flour', '8', ['wheat']);
    const first = flour.allergenEvidence![0]!;
    const conflicting: IngredientRecord = { ...flour, allergenEvidence: [
      first, { ...first, id: 'second', assessments: { wheat: 'absent' } },
    ] };
    const result = makeFormulationSummary(recipe, [recipe, inside], [compound, conflicting, additive]);
    expect(result.allergens.some((item) => item.name === 'Wheat' && item.status === 'present')).toBe(true);
    expect(result.allergenDetails).toContainEqual(expect.objectContaining({
      name: 'Wheat', status: 'absent', path: 'Cake → Blend → Blend recipe → Flour',
    }));
    expect(result.allergens.some((item) => item.status === 'absent')).toBe(false);
    expect(result.allergenGaps.join(' ')).toContain('conflicts');
  });
});
