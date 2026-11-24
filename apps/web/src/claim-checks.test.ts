import { describe, expect, it } from 'vitest';
import type { LabelClaim } from '@aus-food/domain';
import type { FormulationRecord, IngredientRecord, ProductRecord } from '@aus-food/storage';
import { buildClaimChecks } from './claim-checks';
import { buildIngredientRecord, emptyIngredientDraft } from './ingredient-form';
import { makeNipDraft } from './nip-draft';
import { nutritionRecipeSignature } from './product-form';
import { claimRules } from './rule-data';
import { finishedNutritionSnapshot } from './finished-nutrition';
import { makeLabelDraft } from './label-draft';
import { makeConsultantNotes } from './consultant-notes';

const stamp = '2026-11-10T00:00:00.000Z';
const draft = emptyIngredientDraft();
Object.assign(draft, { name: 'Ingredient', kind: 'atomic', energyPer100g: '100' });
draft.nutrients = { protein: '1', fat: '2', saturatedFat: '0', carbohydrate: '5', sugars: '5', sodium: '120' };
const baseIngredient = buildIngredientRecord(draft, undefined, () => 'ingredient', stamp);
const ingredient: IngredientRecord = {
  ...baseIngredient,
  nutrientProfile: { ...baseIngredient.nutrientProfile!, values: {
    ...baseIngredient.nutrientProfile!.values,
    dietaryFibre: { value: '8', unit: 'g/100g', sourceId: 'fibre source', sourceDate: '', evidenceType: 'supplier' },
  } },
};
const recipe: FormulationRecord = {
  id: 'recipe', name: 'Recipe', recordType: 'formulation', tags: [], createdAt: stamp, updatedAt: stamp,
  lines: [{ id: 'line', kind: 'ingredient', ingredientId: ingredient.id, quantity: { value: '100', unit: 'g' } }],
};
const product: ProductRecord = {
  id: 'product', name: 'Food', recordType: 'product', formulationId: recipe.id,
  tags: [], createdAt: stamp, updatedAt: stamp, foodState: 'asSold', consumerDirections: 'none',
  packDetails: {
    nutritionFoodForm: 'solid', nutritionRecipeSignature: nutritionRecipeSignature(recipe.id, [recipe], [ingredient]),
    servingSize: '50', servingUnit: 'g',
  },
  claimFacts: {
    foodForm: 'solid', formOfFoodConfirmed: true, servingConfirmed: true,
    prohibitedContexts: { infantFormulaProduct: false, kava: false, alcoholAbove1_15Percent: false },
  },
};
const sugars: LabelClaim = {
  id: 'claim', text: 'Low sugars', classification: 'nutrition_content', classificationConfirmed: true,
  supportedClaimId: 'claim.low-sugars', nutrientAmount: { value: '0', unit: 'g' },
  evidence: { reference: 'old manual source', sourceDate: stamp.slice(0, 10) },
};
function check(
  candidate: ProductRecord = product,
  food: IngredientRecord = ingredient,
  formulation: FormulationRecord = recipe,
  claim: LabelClaim = sugars,
) {
  return buildClaimChecks(candidate, true, [claim], makeNipDraft(candidate, [formulation], [food]))[0]!;
}
function withNutrient(id: 'sugars' | 'fat' | 'sodium' | 'dietaryFibre', value: string): IngredientRecord {
  const existing = ingredient.nutrientProfile!.values[id]!;
  return { ...ingredient, nutrientProfile: { ...ingredient.nutrientProfile!, values: {
    ...ingredient.nutrientProfile!.values, [id]: { ...existing, value },
  } } };
}

describe('claim checks from saved nutrition', () => {
  it('uses unrounded sugars at and above the solid threshold instead of a stale manual amount', () => {
    expect(claimRules.every((rule) => rule.reviewStatus === 'draft')).toBe(true);
    const at = check();
    expect(at.nutrition?.amount).toEqual({ value: '5', unit: 'g' });
    expect(at.preview).toMatchObject({ eligible: true, illustrativeStatus: 'PASS' });
    expect(at.official.status).toBe('REVIEW REQUIRED');
    const above = check(product, withNutrient('sugars', '5.0001'));
    expect(above.nutrition?.amount?.value).toBe('5.0001');
    expect(above.preview).toMatchObject({ eligible: true, illustrativeStatus: 'FAIL' });
    const amountTrace = above.official.inputs.find((entry) => entry.name === 'Amount per 100 mL or 100 g');
    expect(amountTrace).toMatchObject({ value: '5.0001', sourceId: 'saved Product nutrition', sourcePath: ['product', 'recipe'] });
    expect(above.official.inputs.some((entry) => entry.name.includes('ingredient nutrition') && entry.sourcePath.includes('ingredient'))).toBe(true);
  });

  it('uses final-food density for liquid thresholds and never falls back to the manual value', () => {
    const liquid: ProductRecord = { ...product, packDetails: {
      ...product.packDetails!, nutritionFoodForm: 'liquid', nutritionDensity: { gramsPerMillilitre: '0.5', evidenceReference: '', sourceDate: '' },
    }, claimFacts: { ...product.claimFacts!, foodForm: 'liquid' } };
    expect(check(liquid).nutrition?.amount).toEqual({ value: '2.5', unit: 'g' });
    expect(check(liquid).preview).toMatchObject({ eligible: true, illustrativeStatus: 'PASS' });
    expect(check(liquid, withNutrient('sugars', '5.0001')).preview).toMatchObject({ eligible: true, illustrativeStatus: 'FAIL' });
    const { nutritionDensity: _density, ...withoutDensity } = liquid.packDetails!;
    expect(_density?.gramsPerMillilitre).toBe('0.5');
    const noDensity = { ...liquid, packDetails: withoutDensity };
    expect(check(noDensity).nutrition?.amount).toBeUndefined();
    expect(check(noDensity).preview?.eligible).toBe(false);
  });

  it('converts an ingredient volume value through both ingredient and final-food density', () => {
    const values = { ...ingredient.nutrientProfile!.values };
    delete values.sugars;
    const volumeIngredient: IngredientRecord = { ...ingredient,
      nutrientProfile: { ...ingredient.nutrientProfile!, values },
      nutritionPer100mL: { sugars: { value: '4', sourceId: 'volume source', sourceDate: '', evidenceType: 'supplier' } },
      ingredientDensity: { gramsPerMillilitre: '2', evidenceReference: 'ingredient density', sourceDate: '' },
    };
    const liquid: ProductRecord = { ...product, packDetails: {
      ...product.packDetails!, nutritionFoodForm: 'liquid',
      nutritionDensity: { gramsPerMillilitre: '0.5', evidenceReference: 'food density', sourceDate: '' },
    }, claimFacts: { ...product.claimFacts!, foodForm: 'liquid' } };
    const result = check(liquid, volumeIngredient);
    expect(result.nutrition?.amount).toEqual({ value: '1', unit: 'g' });
    expect(result.official.inputs.some((entry) => entry.name.includes('ingredient density 2 g/mL') && entry.sourceId === 'volume source')).toBe(true);
    expect(result.official.inputs.some((entry) => entry.name === 'Final food density' && entry.sourceId === 'food density')).toBe(true);
  });

  it('withholds missing, conflicting, stale and unsupported nutrition', () => {
    const values = { ...ingredient.nutrientProfile!.values };
    delete values.sugars;
    const missing = { ...ingredient, nutrientProfile: { ...ingredient.nutrientProfile!, values } };
    const conflict: IngredientRecord = {
      ...ingredient,
      nutritionPer100mL: { sugars: { value: '9', sourceId: '', sourceDate: '', evidenceType: 'supplier' } },
      ingredientDensity: { gramsPerMillilitre: '1', evidenceReference: '', sourceDate: '' },
    };
    const changed = { ...recipe, lines: [...recipe.lines, { ...recipe.lines[0]!, id: 'new-line' }] };
    for (const result of [
      check(product, missing), check(product, conflict), check(product, ingredient, changed),
      check({ ...product, foodState: 'asPrepared' }), check({ ...product, consumerDirections: 'unknown' }),
      check({ ...product, consumerDirections: 'present', preparation: { enabled: true, kind: 'withFood', directions: 'Serve with milk' } }),
      check({ ...product, claimFacts: { ...product.claimFacts!, foodForm: 'liquid' } }),
    ]) {
      expect(result.nutrition?.amount).toBeUndefined();
      expect(result.official.status).toBe('REVIEW REQUIRED');
      expect(result.preview?.eligible).toBe(false);
      expect(result.nutrition?.explanation).toContain('unavailable');
      expect(result.guidance.some((item) => item.action === 'product')).toBe(true);
    }
  });

  it('guides classification and rule-link gaps without asking for another nutrient amount', () => {
    const unclassified = check(product, ingredient, recipe, { ...sugars, classification: undefined, classificationConfirmed: undefined });
    expect(unclassified.guidance).toContainEqual(expect.objectContaining({
      id: 'classification', action: 'claim',
    }));
    const unlinked = check(product, ingredient, recipe, { ...sugars, supportedClaimId: undefined });
    expect(unlinked.guidance).toContainEqual(expect.objectContaining({
      id: 'rule-selection', action: 'claim',
    }));
    expect(unlinked.guidance.some((item) => item.message.includes('nutrient amount'))).toBe(false);
  });

  it.each([
    ['claim.low-energy', 'Low energy', '100', 'kJ'],
    ['claim.low-fat', 'Low fat', '2', 'g'],
    ['claim.low-sodium', 'Low sodium', '120', 'mg'],
    ['claim.good-source-dietary-fibre', 'Good source of dietary fibre', '4', 'g'],
  ])('derives %s on its rule basis', (id, text, value, unit) => {
    const result = check(product, ingredient, recipe, { ...sugars, text, supportedClaimId: id });
    expect(result.nutrition?.amount).toEqual({ value, unit });
    expect(result.preview).toMatchObject({ eligible: true, illustrativeStatus: 'PASS' });
  });

  it.each([
    ['claim.low-energy', 'Low energy', ['energy']],
    ['claim.low-fat', 'Low fat', ['fat']],
    ['claim.low-sugars', 'Low sugars', ['sugars', 'dietaryFibre']],
    ['claim.low-sodium', 'Low sodium', ['sodium', 'potassium']],
    ['claim.good-source-dietary-fibre', 'Good source of dietary fibre', ['dietaryFibre']],
  ] as const)('reports NIP rows for %s without changing the saved NIP', (id, text, rows) => {
    const result = check(product, ingredient, recipe, { ...sugars, text, supportedClaimId: id });
    expect(result.nipInteraction?.message).toContain('REVIEW REQUIRED');
    expect(result.nipInteraction?.requiredRows.map((row) => row.id)).toEqual(rows);
    expect(result.nipInteraction?.requiredRows.every((row) => row.available)).toBe(id !== 'claim.low-sodium');
    if (id === 'claim.low-sodium') {
      expect(result.nipInteraction?.requiredRows.find((row) => row.id === 'potassium')?.available).toBe(false);
    }
  });

  it.each([
    ['claim.low-energy', 'Low energy', 'energy', '170', '170.0001'],
    ['claim.low-fat', 'Low fat', 'fat', '3', '3.0001'],
    ['claim.low-sodium', 'Low sodium', 'sodium', '120', '120.0001'],
  ] as const)('compares the unrounded %s boundary', (id, text, nutrient, at, above) => {
    const claim = { ...sugars, text, supportedClaimId: id };
    const foodAt = nutrient === 'energy'
      ? { ...ingredient, energyPer100g: { ...ingredient.energyPer100g!, value: at } }
      : withNutrient(nutrient, at);
    const foodAbove = nutrient === 'energy'
      ? { ...ingredient, energyPer100g: { ...ingredient.energyPer100g!, value: above } }
      : withNutrient(nutrient, above);
    expect(check(product, foodAt, recipe, claim).preview).toMatchObject({ eligible: true, illustrativeStatus: 'PASS' });
    expect(check(product, foodAbove, recipe, claim).preview).toMatchObject({ eligible: true, illustrativeStatus: 'FAIL' });
  });

  it('requires a current serving and complete fibre for the per-serving rule', () => {
    const claim = { ...sugars, text: 'Good source of dietary fibre', supportedClaimId: 'claim.good-source-dietary-fibre' };
    expect(check(product, withNutrient('dietaryFibre', '7.999'), recipe, claim).preview)
      .toMatchObject({ eligible: true, illustrativeStatus: 'FAIL' });
    expect(check({ ...product, packDetails: { ...product.packDetails!, servingSize: '' } }, ingredient, recipe, claim).nutrition?.amount).toBeUndefined();
    const values = { ...ingredient.nutrientProfile!.values };
    delete values.dietaryFibre;
    expect(check(product, { ...ingredient, nutrientProfile: { ...ingredient.nutrientProfile!, values } }, recipe, claim).nutrition?.amount).toBeUndefined();
    expect(check({ ...product, claimFacts: { ...product.claimFacts!, servingConfirmed: false } }, ingredient, recipe, claim).preview?.eligible).toBe(false);
  });

  it('converts liquid servings using density and rejects conflicting fibre bases', () => {
    const claim = { ...sugars, text: 'Good source of dietary fibre', supportedClaimId: 'claim.good-source-dietary-fibre' };
    const liquid: ProductRecord = { ...product, packDetails: {
      ...product.packDetails!, nutritionFoodForm: 'liquid', servingSize: '50', servingUnit: 'mL',
      nutritionDensity: { gramsPerMillilitre: '1.5', evidenceReference: 'density test', sourceDate: '' },
    }, claimFacts: { ...product.claimFacts!, foodForm: 'liquid' } };
    const result = check(liquid, ingredient, recipe, claim);
    expect(result.nutrition?.amount).toEqual({ value: '6', unit: 'g' });
    expect(result.official.inputs).toContainEqual(expect.objectContaining({ name: 'Final food density', sourceId: 'density test', value: '1.5' }));
    const conflict: IngredientRecord = { ...ingredient,
      ingredientDensity: { gramsPerMillilitre: '1', evidenceReference: '', sourceDate: '' },
      additionalNutritionPer100mL: { dietaryFibre: { value: '9', unit: 'g/100mL', sourceId: '', sourceDate: '', evidenceType: 'supplier' } },
    };
    expect(check(liquid, conflict, recipe, claim).nutrition?.amount).toBeUndefined();
  });

  it('normalizes sodium evidence to the rule unit before comparing', () => {
    const sodium = { ...ingredient, nutrientProfile: { ...ingredient.nutrientProfile!, values: {
      ...ingredient.nutrientProfile!.values,
      sodium: { ...ingredient.nutrientProfile!.values.sodium!, value: '0.12', unit: 'g/100g' as const },
    } } };
    const claim = { ...sugars, text: 'Low sodium', supportedClaimId: 'claim.low-sodium' };
    expect(check(product, sodium, recipe, claim).nutrition?.amount).toEqual({ value: '120', unit: 'mg' });
  });

  it('recalculates after a changed recipe is confirmed and otherwise withholds the stale basis', () => {
    const other: IngredientRecord = { ...withNutrient('sugars', '0'), id: 'other', name: 'Other',
      nutrientProfile: { ...withNutrient('sugars', '0').nutrientProfile!, ingredientId: 'other' } };
    const mixed: FormulationRecord = { ...recipe, lines: [
      { ...recipe.lines[0]!, quantity: { value: '50', unit: 'g' } },
      { id: 'other-line', kind: 'ingredient', ingredientId: other.id, quantity: { value: '50', unit: 'g' } },
    ] };
    const foods = [ingredient, other];
    const mixedProduct = { ...product, packDetails: { ...product.packDetails!,
      nutritionRecipeSignature: nutritionRecipeSignature(recipe.id, [mixed], foods) } };
    const evaluate = (candidate: ProductRecord, formulation: FormulationRecord) =>
      buildClaimChecks(candidate, true, [sugars], makeNipDraft(candidate, [formulation], foods))[0]!;
    expect(evaluate(mixedProduct, mixed).nutrition?.amount?.value).toBe('2.5');
    const changed: FormulationRecord = { ...mixed, lines: [
      { ...mixed.lines[0]!, quantity: { value: '75', unit: 'g' } },
      { ...mixed.lines[1]!, quantity: { value: '25', unit: 'g' } },
    ] };
    expect(evaluate(mixedProduct, changed).nutrition?.amount).toBeUndefined();
    const confirmed = { ...mixedProduct, packDetails: { ...mixedProduct.packDetails!,
      nutritionRecipeSignature: nutritionRecipeSignature(recipe.id, [changed], foods) } };
    expect(evaluate(confirmed, changed).nutrition?.amount?.value).toBe('3.75');
  });

  it('does not require a serving to derive a per-100 amount or infer claim confirmations', () => {
    const noServing = { ...product, packDetails: { ...product.packDetails!, servingSize: '' } };
    expect(check(noServing).nutrition?.amount?.value).toBe('5');
    expect(check({ ...noServing, claimFacts: { ...noServing.claimFacts!, formOfFoodConfirmed: false } }).preview?.eligible).toBe(false);
    expect(check({ ...noServing, claimFacts: { ...noServing.claimFacts!, prohibitedContexts: {} } }).preview?.eligible).toBe(false);
  });

  it('uses the saved Product food form without inventing claim-specific confirmations', () => {
    const withoutClaimForm = { ...product, claimFacts: {
      formOfFoodConfirmed: true, prohibitedContexts: product.claimFacts!.prohibitedContexts,
    } };
    const result = check(withoutClaimForm);
    expect(result.preview).toMatchObject({ eligible: true, illustrativeStatus: 'PASS' });
    expect(result.official.inputs).toContainEqual(expect.objectContaining({
      name: 'Food form', value: 'solid', sourceId: 'saved Product nutrition food form', sourcePath: ['product'],
    }));
    const { claimFacts: _claimFacts, ...unknown } = product;
    expect(_claimFacts).toBeDefined();
    const unconfirmed = check(unknown);
    expect(unconfirmed.nutrition?.amount?.value).toBe('5');
    expect(unconfirmed.preview?.eligible).toBe(false);
    expect(unconfirmed.official.value?.reasons).toContain('EXCLUSIONS_NOT_CONFIRMED');
    expect(unconfirmed.official.value?.reasons).toContain('FORM_OF_FOOD_NOT_CONFIRMED');
    const conflicting = check({ ...product, claimFacts: { ...product.claimFacts!, foodForm: 'liquid' } });
    expect(conflicting.official.value?.reasons).toContain('FOOD_FORM_MISSING');
    expect(conflicting.nutrition?.amount).toBeUndefined();
  });

  it('uses current finished-food and retained nutrition, including fibre, and rejects stale evidence', () => {
    const evidence = { sourceId: 'finished test', sourceDate: '', evidenceType: 'analysis' as const };
    const initial: FormulationRecord = { ...recipe, finishedNutrition: {
      selected: true, nutrientProfile: { ingredientId: recipe.id, values: {
        sugars: { ...evidence, value: '5001', unit: 'mg/100g' },
        dietaryFibre: { ...evidence, value: '8', unit: 'g/100g' },
      } },
    } };
    const finished = { ...initial, finishedNutrition: { ...initial.finishedNutrition!,
      recipeSnapshot: finishedNutritionSnapshot(initial, [initial], [ingredient]) } };
    const finishedProduct = { ...product, packDetails: { ...product.packDetails!,
      nutritionRecipeSignature: nutritionRecipeSignature(recipe.id, [finished], [ingredient]) } };
    const fibre = { ...sugars, text: 'Good source of dietary fibre', supportedClaimId: 'claim.good-source-dietary-fibre' };
    expect(check(finishedProduct, ingredient, finished).nutrition?.amount?.value).toBe('5.001');
    expect(check(finishedProduct, ingredient, finished).official.inputs.some((entry) => entry.sourceId === 'finished test')).toBe(true);
    expect(check(finishedProduct, ingredient, finished, fibre).nutrition?.amount?.value).toBe('4');
    expect(check(finishedProduct, { ...ingredient, name: 'Changed' }, finished).nutrition?.amount).toBeUndefined();

    const initialRetention: FormulationRecord = { ...recipe,
      processMassProfile: { changes: [{ id: 'loss', kind: 'loss', mass: { value: '20', unit: 'g' } }], declaredFinalMass: { value: '80', unit: 'g' } },
      nutrientRetention: { selected: true, factors: {
        sugars: { percentage: '80', sourceId: 'retention test', sourceDate: '' },
        dietaryFibre: { percentage: '80', sourceId: 'retention test', sourceDate: '' },
      } },
    };
    const retained = { ...initialRetention, nutrientRetention: { ...initialRetention.nutrientRetention!,
      recipeSnapshot: finishedNutritionSnapshot(initialRetention, [initialRetention], [ingredient]) } };
    const retainedProduct = { ...product, packDetails: { ...product.packDetails!,
      nutritionRecipeSignature: nutritionRecipeSignature(recipe.id, [retained], [ingredient]) } };
    expect(check(retainedProduct, ingredient, retained).nutrition?.amount?.value).toBe('5');
    const retainedFibre = check(retainedProduct, ingredient, retained, fibre);
    expect(retainedFibre.nutrition?.amount?.value).toBe('4');
    expect(retainedFibre.official.inputs.some((entry) => entry.sourceId === 'retention test' && entry.value === '80')).toBe(true);
  });

  it('uses the same derived amount and ingredient trace in consultant notes', () => {
    const food = withNutrient('sugars', '5.0001');
    const nutrition = makeNipDraft(product, [recipe], [food]);
    const result = buildClaimChecks(product, false, [sugars], nutrition)[0]!;
    const label = makeLabelDraft(product, [recipe], [food], [], undefined, false, [sugars]);
    const notes = makeConsultantNotes(product, [recipe], [food], label, {
      name: 'Test label', saved: false, unsaved: true, dependenciesChanged: false,
      savedLabelChanged: false, unsavedProductChanges: false, claims: [sugars], preview: { error: 'No layout' },
    }).flatMap((section) => section.lines).join('\n');
    expect(notes).toContain(result.nutrition!.explanation);
    expect(notes).toContain('5.0001 g');
    expect(notes).toContain('product > recipe > line > ingredient');
    expect(notes).not.toContain('old manual source');
    expect(notes).toContain('Amount per 100 mL or 100 g: 5.0001 g; source saved Product nutrition');
  });
});
