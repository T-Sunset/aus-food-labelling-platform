import { describe, expect, it } from 'vitest';
import type { FormulationRecord, IngredientRecord, ProductRecord } from '@aus-food/storage';
import { buildIngredientRecord, emptyIngredientDraft } from './ingredient-form';
import { makeNipDraft } from './nip-draft';
import { nutritionRecipeSignature } from './product-form';
import { finishedNutritionSnapshot } from './finished-nutrition';

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
  formulationId: 'root', foodState: 'asSold', consumerDirections: 'none',
  packDetails: {
    servingSize: '25', servingUnit: 'g', servingsPerPack: '4', netQuantity: '100', netUnit: 'g', nutritionFoodForm: 'solid',
    nutritionRecipeSignature: nutritionRecipeSignature('root', recipes),
  },
};

describe('draft nutrition information', () => {
  it('does not present an as-sold label basis when directions are unknown, inconsistent or unsupported', () => {
    const { consumerDirections: _directions, ...legacy } = product;
    expect(_directions).toBe('none');
    for (const candidate of [
      legacy,
      { ...product, consumerDirections: 'unknown' as const },
      { ...product, consumerDirections: 'present' as const },
      { ...product, consumerDirections: 'present' as const, preparation: { enabled: true, kind: 'withFood' as const } },
      { ...product, consumerDirections: 'none' as const, draining: { enabled: true, values: {} } },
      { ...product, consumerDirections: 'present' as const, otherConsumerDirections: true },
    ]) {
      const result = makeNipDraft(candidate, recipes, ingredients);
      expect(result.missing.length).toBeGreaterThan(0);
      expect(result.rows.every((row) => row.unitQuantity === 'Not available')).toBe(true);
    }
    expect(makeNipDraft(product, recipes, ingredients).rows[1]?.unitQuantity).toBe('8.0 g');
  });

  it('uses specific, sourced whole-recipe retention and yield without inventing other values', () => {
    const root: FormulationRecord = {
      ...recipes[0]!,
      processMassProfile: { changes: [{ id: 'loss', kind: 'loss', mass: { value: '20', unit: 'g' } }], declaredFinalMass: { value: '80', unit: 'g' } },
      nutrientRetention: { selected: true, factors: {
        protein: { percentage: '50', sourceId: 'Recipe-specific test evidence', sourceDate: '2026-01-02' },
        fat: { percentage: '0', sourceId: 'Recipe-specific test evidence', sourceDate: '2026-01-02' },
        vitaminC: { percentage: '25', sourceId: 'Vitamin C test evidence', sourceDate: '2026-01-02' },
      } },
    };
    const vitamins = ingredients.map((item, index) => ({
      ...item, nutrientProfile: { ...item.nutrientProfile!, values: {
        ...item.nutrientProfile!.values,
        vitaminC: { value: index === 0 ? '20' : '4', unit: 'mg/100g' as const,
          sourceId: 'Test source', sourceDate: '2026-01-01', evidenceType: 'database' as const,
          expression: 'ascorbicAndDehydroascorbicAcid' },
      } },
    }));
    const confirmed: FormulationRecord = { ...root, nutrientRetention: {
      ...root.nutrientRetention!, recipeSnapshot: finishedNutritionSnapshot(root, recipes, vitamins),
    } };
    const currentRecipes = [confirmed, recipes[1]!];
    const currentProduct = { ...product, packDetails: { ...product.packDetails!,
      nutritionRecipeSignature: nutritionRecipeSignature('root', currentRecipes, vitamins) } };
    const result = makeNipDraft(currentProduct, currentRecipes, vitamins);
    expect(result.rows[0]?.unitQuantity).toBe('Not available');
    expect(result.rows[1]).toEqual({ label: 'Protein', serving: '1.2 g', unitQuantity: '5.0 g' });
    expect(result.rows[2]?.unitQuantity).toBe('0.0 g');
    expect(result.rows[3]?.unitQuantity).toBe('Not available');
    expect(result.missing.join(' ')).toContain('energy cannot be determined');
    expect(result.missing.join(' ')).toContain('saturatedFat: an applicable nutrient retention figure is needed');
    expect(result.finishedOptionalNutrients.find((item) => item.id === 'vitaminC')?.result)
      .toEqual({ status: 'available', value: '2.5', unit: 'mg/100g' });
    expect(result.retentionSources.find((item) => item.nutrient === 'protein')).toMatchObject({
      percentage: '50', startingMass: '100', finishedMass: '80', sourceId: 'Recipe-specific test evidence',
    });
    const withEnergy: FormulationRecord = { ...confirmed, finishedNutrition: {
      selected: false, recipeSnapshot: confirmed.nutrientRetention!.recipeSnapshot!,
      energyPer100g: { value: '350', sourceId: 'Finished energy evidence', sourceDate: '2026-01-02', evidenceType: 'analysis' },
    } };
    const energyRecipes = [withEnergy, recipes[1]!];
    const energyProduct = { ...currentProduct, packDetails: { ...currentProduct.packDetails!,
      nutritionRecipeSignature: nutritionRecipeSignature('root', energyRecipes, vitamins) } };
    const energyResult = makeNipDraft(energyProduct, energyRecipes, vitamins);
    expect(energyResult.rows[0]?.unitQuantity).toBe('350 kJ');
    expect(energyResult.rows[1]?.unitQuantity).toBe('5.0 g');
    expect(energyResult.finishedSources[0]).toMatchObject({ nutrient: 'Energy', sourceId: 'Finished energy evidence' });
    const staleEnergy = { ...withEnergy, finishedNutrition: { ...withEnergy.finishedNutrition!, recipeSnapshot: 'stale' } };
    const staleEnergyRecipes = [staleEnergy, recipes[1]!];
    const staleEnergyProduct = { ...currentProduct, packDetails: { ...currentProduct.packDetails!,
      nutritionRecipeSignature: nutritionRecipeSignature('root', staleEnergyRecipes, vitamins) } };
    expect(makeNipDraft(staleEnergyProduct, staleEnergyRecipes, vitamins).rows[0]?.unitQuantity).toBe('Not available');

    const noSource = { ...confirmed, nutrientRetention: { ...confirmed.nutrientRetention!, factors: {
      ...confirmed.nutrientRetention!.factors, protein: { percentage: '50', sourceId: '', sourceDate: '' },
    } } };
    const unsourcedRecipes = [noSource, recipes[1]!];
    const unsourcedProduct = { ...currentProduct, packDetails: { ...currentProduct.packDetails!,
      nutritionRecipeSignature: nutritionRecipeSignature('root', unsourcedRecipes, vitamins) } };
    expect(makeNipDraft(unsourcedProduct, unsourcedRecipes, vitamins).rows[1]?.unitQuantity).toBe('5.0 g');
    const remainingValues = { ...vitamins[1]!.nutrientProfile!.values };
    delete remainingValues.protein;
    const missingProtein = { ...vitamins[1]!, nutrientProfile: { ...vitamins[1]!.nutrientProfile!, values: remainingValues } };
    const missingIngredients = [vitamins[0]!, missingProtein];
    const missingRoot = { ...confirmed, nutrientRetention: { ...confirmed.nutrientRetention!,
      recipeSnapshot: finishedNutritionSnapshot(confirmed, currentRecipes, missingIngredients) } };
    const missingRecipes = [missingRoot, recipes[1]!];
    const missingProduct = { ...currentProduct, packDetails: { ...currentProduct.packDetails!,
      nutritionRecipeSignature: nutritionRecipeSignature('root', missingRecipes, missingIngredients) } };
    expect(makeNipDraft(missingProduct, missingRecipes, missingIngredients).rows[1]?.unitQuantity).toBe('Not available');
    expect(makeNipDraft(currentProduct, currentRecipes, [{ ...vitamins[0]!, name: 'Changed' }, vitamins[1]!]).missing.join(' '))
      .toContain('nutrient retention evidence still applies');
    const changedRecipe = { ...confirmed, processMassProfile: { ...confirmed.processMassProfile!,
      declaredFinalMass: { value: '70', unit: 'g' as const } } };
    expect(makeNipDraft(currentProduct, [changedRecipe, recipes[1]!], vitamins).rows[1]?.unitQuantity).toBe('Not available');
    const unconfirmed = { ...confirmed, nutrientRetention: { selected: true, factors: confirmed.nutrientRetention!.factors } };
    expect(makeNipDraft(currentProduct, [unconfirmed, recipes[1]!], vitamins).rows[1]?.unitQuantity).toBe('Not available');
    const missingYield = { ...root, processMassProfile: undefined };
    const withMissingYield = { ...missingYield, nutrientRetention: { ...missingYield.nutrientRetention!,
      recipeSnapshot: finishedNutritionSnapshot(missingYield, recipes, vitamins) } };
    expect(makeNipDraft(currentProduct, [withMissingYield, recipes[1]!], vitamins).missing.join(' '))
      .toContain('complete final batch weight');
    const addition = { ...root, processMassProfile: { changes: [
      { id: 'addition', kind: 'addition' as const, mass: { value: '10', unit: 'g' as const } },
    ] } };
    const withAddition = { ...addition, nutrientRetention: { ...addition.nutrientRetention!,
      recipeSnapshot: finishedNutritionSnapshot(addition, recipes, vitamins) } };
    expect(makeNipDraft(currentProduct, [withAddition, recipes[1]!], vitamins).missing.join(' '))
      .toContain('Processing additions need separate nutrient evidence');
    const nestedProcess = { ...recipes[1]!, processMassProfile: { changes: [{ id: 'loss', kind: 'loss' as const, mass: { value: '1', unit: 'g' as const } }] } };
    const nestedRecipes = [confirmed, nestedProcess];
    const nestedRoot = { ...confirmed, nutrientRetention: { ...confirmed.nutrientRetention!,
      recipeSnapshot: finishedNutritionSnapshot(confirmed, nestedRecipes, vitamins) } };
    expect(makeNipDraft(currentProduct, [nestedRoot, nestedProcess], vitamins).missing.join(' ')).toContain('processing effects');
  });

  it('uses confirmed finished-food evidence without inventing nutrient retention from yield', () => {
    const source = { sourceId: 'Finished food lab', sourceDate: '2026-01-02', evidenceType: 'analysis' as const };
    const root: FormulationRecord = {
      ...recipes[0]!,
      processMassProfile: { changes: [{ id: 'loss', kind: 'loss', mass: { value: '20', unit: 'g' } }], declaredFinalMass: { value: '80', unit: 'g' } },
      finishedNutrition: {
        selected: true,
        energyPer100g: { value: '350', ...source },
        nutrientProfile: { ingredientId: 'root', values: {
          protein: { value: '12000', unit: 'mg/100g', ...source },
          fat: { value: '0', unit: 'g/100g', ...source },
          vitaminB12: { value: '2', unit: 'ug/100g', ...source, expression: 'cyanocobalamin' },
          vitaminA: { value: '5', unit: 'ug/100g', ...source },
        } },
      },
    };
    const confirmed: FormulationRecord = {
      ...root, finishedNutrition: { ...root.finishedNutrition!, recipeSnapshot: finishedNutritionSnapshot(root, recipes, ingredients) },
    };
    const allRecipes = [confirmed, recipes[1]!];
    const selectedProduct = { ...product, packDetails: { ...product.packDetails!,
      nutritionRecipeSignature: nutritionRecipeSignature('root', allRecipes, ingredients) } };
    const result = makeNipDraft(selectedProduct, allRecipes, ingredients);
    expect(result.rows[0]).toEqual({ label: 'Energy', serving: '88 kJ', unitQuantity: '350 kJ' });
    expect(result.rows[1]).toEqual({ label: 'Protein', serving: '3.0 g', unitQuantity: '12.0 g' });
    expect(result.rows[2]?.unitQuantity).toBe('0.0 g');
    expect(result.rows[3]?.unitQuantity).toBe('Not available');
    expect(result.missing.join(' ')).toContain('Finished food: - saturated value or source needs review');
    expect(result.finishedOptionalNutrients.find((item) => item.id === 'vitaminB12')?.result)
      .toEqual({ status: 'available', value: '2', unit: 'ug/100g' });
    expect(result.finishedOptionalNutrients.find((item) => item.id === 'vitaminA')?.result)
      .toMatchObject({ status: 'review_required', reason: 'INCOMPATIBLE_NUTRIENT_EXPRESSION' });
    expect(result.optionalNutrients).toEqual([]);
    expect(result.sources).toEqual([]);
    expect(result.finishedSources.find((item) => item.nutrient === 'Protein')).toMatchObject({
      value: '12000', unit: 'mg/100g', sourceId: 'Finished food lab',
    });

    const changedRecipe = { ...confirmed, lines: [{ ...confirmed.lines[0]!, quantity: { value: '30', unit: 'g' as const } }, confirmed.lines[1]!] };
    const stale = makeNipDraft(selectedProduct, [changedRecipe, recipes[1]!], ingredients);
    expect(stale.rows.every((row) => row.unitQuantity === 'Not available')).toBe(true);
    expect(stale.finishedOptionalNutrients).toEqual([]);
    expect(stale.missing.join(' ')).toContain('finished-food nutrition values still describe this recipe');
    const changedIngredient = { ...ingredients[1]!, name: 'Changed ingredient' };
    expect(makeNipDraft(selectedProduct, allRecipes, [ingredients[0]!, changedIngredient]).missing.join(' '))
      .toContain('finished-food nutrition values still describe this recipe');
    const allergenOnly = { ...ingredients[1]!, allergensConfirmed: true };
    expect(makeNipDraft(selectedProduct, allRecipes, [ingredients[0]!, allergenOnly]).rows[1]?.unitQuantity).toBe('12.0 g');
    const changedProcess = { ...confirmed, processMassProfile: {
      ...confirmed.processMassProfile!, declaredFinalMass: { value: '70', unit: 'g' as const },
    } };
    expect(makeNipDraft(selectedProduct, [changedProcess, recipes[1]!], ingredients).rows[1]?.unitQuantity).toBe('Not available');
    const sameProcess = { ...confirmed, processMassProfile: {
      ...confirmed.processMassProfile!, changes: [{ ...confirmed.processMassProfile!.changes[0]!, id: 'new-id' }],
    } };
    expect(makeNipDraft(selectedProduct, [sameProcess, recipes[1]!], ingredients).rows[1]?.unitQuantity).toBe('12.0 g');
    expect(makeNipDraft(product, [root, recipes[1]!], ingredients).rows[1]?.unitQuantity).toBe('Not available');
  });

  it('requires review rather than assuming a processing aid remains in the finished food', () => {
    const direct: IngredientRecord = {
      ...ingredients[0]!, directAdditiveSourceId: 'source',
      additiveSources: [{ id: 'source', additiveName: 'A', sourceStatus: 'unknown' }],
    };
    const root: FormulationRecord = {
      ...recipes[0]!,
      lines: [
        { id: 'a', kind: 'ingredient', ingredientId: 'A', quantity: { value: '25', unit: 'g' }, additiveUse: 'processingAid' },
        recipes[0]!.lines[1]!,
      ],
    };
    const result = makeNipDraft(product, [root, recipes[1]!], [direct, ingredients[1]!]);
    expect(result.missing.join(' ')).toContain('its use in this recipe needs nutrition review');
    expect(result.rows[1]?.unitQuantity).toBe('Not available');
    const stale = { ...direct, additiveSources: [] };
    const staleRecipe = { ...root, lines: [{ ...root.lines[0]!, additiveUse: 'added' as const }, root.lines[1]!] };
    expect(makeNipDraft(product, [staleRecipe, recipes[1]!], [stale, ingredients[1]!]).missing.join(' '))
      .toContain('saved additive use needs review');
  });
  it('requires review for processing changes in root and nested recipes', () => {
    const profile = { changes: [{ id: 'loss', kind: 'loss' as const, mass: { value: '1', unit: 'g' as const } }] };
    for (const index of [0, 1]) {
      const processed = recipes.map((recipe, i) => i === index ? { ...recipe, processMassProfile: profile } : recipe);
      const result = makeNipDraft(product, processed, ingredients);
      expect(result.missing.join(' ')).toContain('processing effects');
      expect(result.rows[1]?.unitQuantity).toBe('Not available');
    }
    const equalFinal = [{ ...recipes[0]!, processMassProfile: {
      changes: [], entryMethod: 'finalMass' as const, declaredFinalMass: { value: '100', unit: 'g' as const },
    } }, recipes[1]!];
    expect(makeNipDraft(product, equalFinal, ingredients).rows[1]?.unitQuantity).toBe('Not available');
    const incomplete = [{ ...recipes[0]!, processMassProfile: { changes: [], complete: false } }, recipes[1]!];
    expect(makeNipDraft(product, incomplete, ingredients).rows[1]?.unitQuantity).toBe('Not available');
  });
  it('calculates independent serving and 100 g columns from nested ingoing ingredients', () => {
    const result = makeNipDraft(product, recipes, ingredients);
    expect(result.missing).toEqual([]);
    expect(result.rows[0]).toEqual({ label: 'Energy', serving: '50 kJ', unitQuantity: '200 kJ' });
    expect(result.rows[1]).toEqual({ label: 'Protein', serving: '2.0 g', unitQuantity: '8.0 g' });
    expect(result.rows[6]).toEqual({ label: 'Sodium', serving: '0 mg', unitQuantity: '1 mg' });
  });

  it('calculates manually entered nutrition without requesting a source', () => {
    const draft = emptyIngredientDraft();
    Object.assign(draft, { name: 'A', kind: 'atomic', energyPer100g: '500' });
    draft.nutrients = { protein: '20', fat: '0', saturatedFat: '0', carbohydrate: '0', sugars: '0', sodium: '1' };
    const unsourced = buildIngredientRecord(draft, undefined, () => 'A', now);
    const result = makeNipDraft(product, recipes, [unsourced, ingredients[1]!]);
    expect(result.rows[1]?.unitQuantity).toBe('8.0 g');
    expect(result.missing.join(' ')).not.toContain('nutrition source not recorded');
  });

  it('uses a compound ingredient profile without also counting its children', () => {
    const compound = { ...ingredients[0]!, kind: 'compound' as const, compoundFormulationId: 'sub' };
    const result = makeNipDraft(product, recipes, [compound, ingredients[1]!]);
    expect(result.rows[1]?.unitQuantity).toBe('8.0 g');
    expect(result.rows[0]?.unitQuantity).toBe('200 kJ');
  });

  it('uses only component values when selected, and invalidates confirmation after composition changes', () => {
    const compound = { ...ingredients[0]!, kind: 'compound' as const, compoundFormulationId: 'sub', compoundNutritionBasis: 'components' as const };
    const completeRecipes: FormulationRecord[] = [
      recipes[0]!,
      { ...recipes[1]!, supplierComposition: { coverage: 'complete', unquantifiedComponents: [] } },
    ];
    const withCompound = [compound, ingredients[1]!];
    const confirmed = {
      ...product, packDetails: { ...product.packDetails!, nutritionRecipeSignature: nutritionRecipeSignature('root', completeRecipes, withCompound) },
    };
    const result = makeNipDraft(confirmed, completeRecipes, withCompound);
    expect(result.rows[1]?.unitQuantity).toBe('4.0 g');
    expect(result.rows[0]?.unitQuantity).toBe('100 kJ');
    expect(result.sources.filter((source) => source.nutrient === 'protein').map((source) => source.sourcePath)).toEqual([
      ['root', 'a', 'A', 'sub', 'b1', 'B'],
      ['root', 'a', 'A', 'sub', 'b2', 'B'],
      ['root', 'nested', 'sub', 'b1', 'B'],
      ['root', 'nested', 'sub', 'b2', 'B'],
    ]);
    expect(result.sources.filter((source) => source.nutrient === 'protein').map((source) => source.ingoingMass))
      .toEqual(['12.5', '12.5', '37.5', '37.5']);
    const changed = [completeRecipes[0]!, { ...completeRecipes[1]!, lines: [completeRecipes[1]!.lines[0]!] }];
    expect(makeNipDraft(confirmed, changed, withCompound).rows[1]?.unitQuantity).toBe('Not available');
    const partial = [completeRecipes[0]!, { ...completeRecipes[1]!, supplierComposition: { coverage: 'partial' as const, unquantifiedComponents: [] } }];
    expect(makeNipDraft(confirmed, partial, withCompound).rows[1]?.unitQuantity).toBe('Not available');
    const unknownAmount = [completeRecipes[0]!, { ...completeRecipes[1]!, supplierComposition: {
      coverage: 'complete' as const, unquantifiedComponents: [{ id: 'unknown', kind: 'ingredient' as const, ingredientId: 'B' }],
    } }];
    expect(makeNipDraft(confirmed, unknownAmount, withCompound).rows[1]?.unitQuantity).toBe('Not available');
    const processing = [completeRecipes[0]!, { ...completeRecipes[1]!, processMassProfile: { changes: [] } }];
    expect(makeNipDraft(confirmed, processing, withCompound).rows[1]?.unitQuantity).toBe('4.0 g');
    const special = [completeRecipes[0]!, { ...completeRecipes[1]!, lines: [
      { id: 'b1', kind: 'ingredient' as const, ingredientId: 'B', quantity: { value: '1', unit: 'g' as const }, additiveUse: 'unknown' as const },
    ] }];
    const direct = { ...ingredients[1]!, directAdditiveSourceId: 'direct', additiveSources: [
      { id: 'direct', additiveName: 'B', sourceStatus: 'unknown' as const },
    ] };
    expect(makeNipDraft(confirmed, special, [compound, direct]).missing.join(' ')).toContain('needs nutrition review');
    const missingProtein = { ...ingredients[1]!, nutrientProfile: { ingredientId: 'B', values: {} } };
    expect(makeNipDraft(confirmed, completeRecipes, [compound, missingProtein]).rows[1]?.unitQuantity).toBe('Not available');
    const whole = { ...compound, compoundNutritionBasis: 'whole' as const };
    const wholeProduct = { ...product, packDetails: { ...product.packDetails!, nutritionRecipeSignature: nutritionRecipeSignature('root', completeRecipes, [whole, ingredients[1]!]) } };
    const wholeResult = makeNipDraft(wholeProduct, completeRecipes, [whole, ingredients[1]!]);
    expect(wholeResult.rows[1]?.unitQuantity).toBe('8.0 g');
    expect(wholeResult.sources.filter((source) => source.nutrient === 'protein').map((source) => source.sourcePath)).toEqual([
      ['root', 'a', 'A'], ['root', 'nested', 'sub', 'b1', 'B'], ['root', 'nested', 'sub', 'b2', 'B'],
    ]);
  });

  it('calculates entered optional nutrients without treating missing ingredients as zero', () => {
    const a = ingredients[0]!;
    const b = ingredients[1]!;
    const fibre = { ...a.nutrientProfile!.values.protein!, value: '4', unit: 'g/100g' as const };
    const aWithFibre = { ...a, nutrientProfile: { ...a.nutrientProfile!, values: { ...a.nutrientProfile!.values, dietaryFibre: fibre } } };
    const bWithFibre = { ...b, nutrientProfile: { ...b.nutrientProfile!, values: { ...b.nutrientProfile!.values, dietaryFibre: { ...fibre, value: '2' } } } };
    const complete = makeNipDraft(product, recipes, [aWithFibre, bWithFibre]);
    const calculation = complete.optionalNutrients.find((item) => item.id === 'dietaryFibre')?.result;
    expect(calculation?.status).toBe('calculated');
    if (calculation?.status === 'calculated') {
      expect(calculation.nutrients[0]?.value).toBe('2.5');
      expect(calculation.nutrients[0]?.sources).toHaveLength(3);
    }
    const incomplete = makeNipDraft(product, recipes, [aWithFibre, b]).optionalNutrients[0]?.result;
    expect(incomplete?.status).toBe('review_required');
    if (incomplete?.status === 'review_required') expect(incomplete.missing).toHaveLength(2);
    expect(makeNipDraft(product, recipes, ingredients).optionalNutrients).toEqual([]);
    const volume = {
      ...a,
      ingredientDensity: { gramsPerMillilitre: '2', evidenceReference: 'Measurement', sourceDate: '2026-01-01' },
      additionalNutritionPer100mL: { dietaryFibre: {
        value: '8000', unit: 'mg/100mL' as const, sourceId: 'label', sourceDate: '2026-01-01', evidenceType: 'supplier' as const,
      } },
    };
    const converted = makeNipDraft(product, recipes, [volume, bWithFibre]);
    const volumeResult = converted.optionalNutrients[0]?.result;
    expect(volumeResult?.status).toBe('calculated');
    if (volumeResult?.status === 'calculated') expect(volumeResult.nutrients[0]?.value).toBe('2.5');
    expect(converted.sources.find((source) => source.nutrient === 'dietaryFibre')?.method).toContain('ingredient density');
    const { ingredientDensity: ignoredDensity, ...withoutDensity } = volume;
    expect(ignoredDensity.gramsPerMillilitre).toBe('2');
    expect(makeNipDraft(product, recipes, [withoutDensity, bWithFibre]).optionalNutrients[0]?.result.status)
      .toBe('review_required');
    const processed = [{ ...recipes[0]!, processMassProfile: { changes: [{ id: 'loss', kind: 'loss' as const, mass: { value: '1', unit: 'g' as const } }] } }, recipes[1]!];
    expect(makeNipDraft(product, processed, [aWithFibre, bWithFibre]).optionalNutrients).toEqual([]);
  });

  it('propagates expanded nutrients through repeated nested paths with unit and density conversion', () => {
    const [a, b] = ingredients;
    const aWithNutrients: IngredientRecord = {
      ...a!,
      nutrientProfile: { ...a!.nutrientProfile!, values: {
        ...a!.nutrientProfile!.values,
        vitaminB12: { value: '0.002', unit: 'mg/100g', sourceId: 'A lab', sourceDate: '2026-01-01', evidenceType: 'analysis', expression: 'cyanocobalamin' },
        calcium: { value: '0.1', unit: 'g/100g', sourceId: 'A lab', sourceDate: '2026-01-01', evidenceType: 'analysis' },
      } },
    };
    const bWithNutrients: IngredientRecord = {
      ...b!,
      nutrientProfile: { ...b!.nutrientProfile!, values: {
        ...b!.nutrientProfile!.values,
        calcium: { value: '200000', unit: 'ug/100g', sourceId: 'B lab', sourceDate: '2026-01-02', evidenceType: 'analysis' },
      } },
      ingredientDensity: { gramsPerMillilitre: '2', evidenceReference: 'Density test', sourceDate: '2026-01-02' },
      additionalNutritionPer100mL: {
        vitaminB12: { value: '8', unit: 'ug/100mL', sourceId: 'B lab', sourceDate: '2026-01-02', evidenceType: 'analysis', expression: 'cyanocobalamin', method: 'Analysis' },
      },
    };
    const result = makeNipDraft(product, recipes, [aWithNutrients, bWithNutrients]);
    const vitamin = result.optionalNutrients.find((item) => item.id === 'vitaminB12')?.result;
    expect(vitamin).toMatchObject({
      status: 'calculated', basis: 'ingoing', totalMass: { value: '100', unit: 'g' },
      nutrients: [{ nutrient: 'vitaminB12', value: '3.5', unit: 'ug/100g', sources: [
        { sourcePath: ['root', 'a', 'A'], sourceId: 'A lab', expression: 'cyanocobalamin' },
        { sourcePath: ['root', 'nested', 'sub', 'b1', 'B'], sourceId: 'B lab', expression: 'cyanocobalamin', method: expect.stringContaining('Density test') },
        { sourcePath: ['root', 'nested', 'sub', 'b2', 'B'], sourceId: 'B lab', expression: 'cyanocobalamin', method: expect.stringContaining('Density test') },
      ] }],
    });
    expect(result.optionalNutrients.find((item) => item.id === 'calcium')?.result).toMatchObject({
      status: 'calculated', nutrients: [{ value: '175', unit: 'mg/100g' }],
    });
    expect(result.sources.filter((source) => source.nutrient === 'vitaminB12').map((source) => ({
      sourcePath: source.sourcePath, mass: source.ingoingMass, value: source.value, method: source.method,
    }))).toEqual([
      { sourcePath: ['root', 'a', 'A'], mass: '25', value: '0.002', method: undefined },
      { sourcePath: ['root', 'nested', 'sub', 'b1', 'B'], mass: '37.5', value: '4', method: expect.stringContaining('Analysis; Converted using ingredient density 2') },
      { sourcePath: ['root', 'nested', 'sub', 'b2', 'B'], mass: '37.5', value: '4', method: expect.stringContaining('Density test') },
    ]);
    const { ingredientDensity: unusedDensity, ...withoutDensity } = bWithNutrients;
    expect(unusedDensity?.gramsPerMillilitre).toBe('2');
    expect(makeNipDraft(product, recipes, [aWithNutrients, withoutDensity]).optionalNutrients.find((item) => item.id === 'vitaminB12')?.result)
      .toMatchObject({ status: 'review_required', reason: 'MISSING_NUTRIENT_EVIDENCE', missing: [
        { sourcePath: ['root', 'nested', 'sub', 'b1', 'B'] },
        { sourcePath: ['root', 'nested', 'sub', 'b2', 'B'] },
      ] });
    const conflicting: IngredientRecord = {
      ...aWithNutrients,
      ingredientDensity: { gramsPerMillilitre: '1', evidenceReference: 'Density test', sourceDate: '2026-01-01' },
      additionalNutritionPer100mL: {
        vitaminB12: { value: '3', unit: 'ug/100mL', sourceId: 'A lab', sourceDate: '2026-01-01', evidenceType: 'analysis', expression: 'cyanocobalamin' },
      },
    };
    expect(makeNipDraft(product, recipes, [conflicting, bWithNutrients]).missing.join(' '))
      .toContain('vitaminB12 values per 100 g and per 100 mL differ');
  });

  it('uses either compound or component expanded nutrition, without double counting', () => {
    const vitamin = { unit: 'ug/100g' as const, sourceId: 'Lab', sourceDate: '2026-01-01', evidenceType: 'analysis' as const, expression: 'retinolEquivalents' };
    const compound: IngredientRecord = {
      ...ingredients[0]!, kind: 'compound', compoundFormulationId: 'sub', compoundNutritionBasis: 'whole',
      nutrientProfile: { ...ingredients[0]!.nutrientProfile!, values: {
        ...ingredients[0]!.nutrientProfile!.values, vitaminA: { ...vitamin, value: '99' },
      } },
    };
    const component: IngredientRecord = {
      ...ingredients[1]!, nutrientProfile: { ...ingredients[1]!.nutrientProfile!, values: {
        ...ingredients[1]!.nutrientProfile!.values, vitaminA: { ...vitamin, value: '4' },
      } },
    };
    const completeRecipes: FormulationRecord[] = [
      recipes[0]!, { ...recipes[1]!, supplierComposition: { coverage: 'complete', unquantifiedComponents: [] } },
    ];
    const whole = makeNipDraft(product, completeRecipes, [compound, component]);
    expect(whole.optionalNutrients.find((item) => item.id === 'vitaminA')?.result)
      .toMatchObject({ status: 'calculated', nutrients: [{ value: '27.75', unit: 'ug/100g' }] });
    expect(whole.sources.filter((source) => source.nutrient === 'vitaminA').map((source) => source.sourcePath))
      .toEqual([['root', 'a', 'A'], ['root', 'nested', 'sub', 'b1', 'B'], ['root', 'nested', 'sub', 'b2', 'B']]);
    const components = makeNipDraft(product, completeRecipes, [{ ...compound, compoundNutritionBasis: 'components' }, component]);
    expect(components.optionalNutrients.find((item) => item.id === 'vitaminA')?.result)
      .toMatchObject({ status: 'calculated', nutrients: [{ value: '4', unit: 'ug/100g' }] });
    expect(components.sources.filter((source) => source.nutrient === 'vitaminA').map((source) => source.sourcePath))
      .toEqual([
        ['root', 'a', 'A', 'sub', 'b1', 'B'], ['root', 'a', 'A', 'sub', 'b2', 'B'],
        ['root', 'nested', 'sub', 'b1', 'B'], ['root', 'nested', 'sub', 'b2', 'B'],
      ]);
    const partial = [completeRecipes[0]!, { ...completeRecipes[1]!, supplierComposition: { coverage: 'partial' as const, unquantifiedComponents: [] } }];
    const incomplete = makeNipDraft(product, partial, [{ ...compound, compoundNutritionBasis: 'components' }, component]);
    expect(incomplete.optionalNutrients).toEqual([]);
    expect(incomplete.missing.join(' ')).toContain('partial');
  });

  it('requires missing expanded evidence and compatible expressions, while preserving known zero', () => {
    const b12 = { value: '2', unit: 'ug/100g' as const, sourceId: 'Lab', sourceDate: '2026-01-01', evidenceType: 'analysis' as const, expression: 'cyanocobalamin' };
    const withB12 = (record: IngredientRecord, evidence: typeof b12 | Omit<typeof b12, 'expression'>): IngredientRecord => ({
      ...record, nutrientProfile: { ...record.nutrientProfile!, values: { ...record.nutrientProfile!.values, vitaminB12: evidence } },
    });
    const a = withB12(ingredients[0]!, b12);
    const b = ingredients[1]!;
    const missing = makeNipDraft(product, recipes, [a, b]).optionalNutrients.find((item) => item.id === 'vitaminB12')?.result;
    expect(missing).toMatchObject({ status: 'review_required', reason: 'MISSING_NUTRIENT_EVIDENCE', missing: [
      { ingredientId: 'B', sourcePath: ['root', 'nested', 'sub', 'b1', 'B'] },
      { ingredientId: 'B', sourcePath: ['root', 'nested', 'sub', 'b2', 'B'] },
    ] });
    const { expression: unused, ...unknownForm } = b12;
    expect(unused).toBe('cyanocobalamin');
    for (const evidence of [unknownForm, { ...b12, expression: 'another form' }]) {
      expect(makeNipDraft(product, recipes, [a, withB12(b, evidence)]).optionalNutrients.find((item) => item.id === 'vitaminB12')?.result)
        .toMatchObject({ status: 'review_required', reason: 'INCOMPATIBLE_NUTRIENT_EXPRESSION', missing: [
          { sourcePath: ['root', 'nested', 'sub', 'b1', 'B'] },
          { sourcePath: ['root', 'nested', 'sub', 'b2', 'B'] },
        ] });
    }
    expect(makeNipDraft(product, recipes, [a, withB12(b, { ...b12, value: '0' })]).optionalNutrients.find((item) => item.id === 'vitaminB12')?.result)
      .toMatchObject({ status: 'calculated', nutrients: [{ value: '0.5', unit: 'ug/100g' }] });
    expect(makeNipDraft(product, recipes, ingredients).optionalNutrients).toEqual([]);
  });

  it('flags mismatched mass and volume inputs without changing the selected mass value', () => {
    const a = ingredients[0]!;
    const both = {
      ...a,
      ingredientDensity: { gramsPerMillilitre: '1.25', evidenceReference: 'Measurement', sourceDate: '2026-01-01' },
      nutritionPer100mL: { protein: { value: '25', sourceId: 'label', sourceDate: '2026-01-01' } },
    };
    expect(makeNipDraft(product, recipes, [both, ingredients[1]!]).missing).toEqual([]);
    const mismatch = { ...both, nutritionPer100mL: { protein: { ...both.nutritionPer100mL.protein, value: '24' } } };
    const result = makeNipDraft(product, recipes, [mismatch, ingredients[1]!]);
    expect(result.rows[1]?.unitQuantity).toBe('8.0 g');
    expect(result.missing.join(' ')).toContain('protein values per 100 g and per 100 mL differ');
    const { ingredientDensity: ignoredDensity, ...noDensity } = mismatch;
    expect(ignoredDensity.gramsPerMillilitre).toBe('1.25');
    expect(makeNipDraft(product, recipes, [noDensity, ingredients[1]!]).missing.join(' '))
      .toContain('ingredient density is needed to compare protein');
  });

  it('handles microgram evidence in the existing preview without silently accepting an incompatible expression', () => {
    const a = ingredients[0]!;
    const micrograms: IngredientRecord = {
      ...a,
      nutrientProfile: { ...a.nutrientProfile!, values: {
        ...a.nutrientProfile!.values,
        protein: { ...a.nutrientProfile!.values.protein!, value: '20000000', unit: 'ug/100g' },
        dietaryFibre: { value: '1000000', unit: 'ug/100g', sourceId: 'Lab', sourceDate: '2026-01-01', evidenceType: 'analysis' },
      } },
      ingredientDensity: { gramsPerMillilitre: '2', evidenceReference: 'Measurement', sourceDate: '2026-01-01' },
      additionalNutritionPer100mL: {
        dietaryFibre: { value: '2000000', unit: 'ug/100mL', sourceId: 'Lab', sourceDate: '2026-01-01', evidenceType: 'analysis' },
      },
    };
    const result = makeNipDraft(product, recipes, [micrograms, ingredients[1]!]);
    expect(result.rows[1]?.unitQuantity).toBe('8.0 g');
    expect(result.missing.join(' ')).not.toContain('dietaryFibre values per 100 g and per 100 mL differ');
    const differentForms: IngredientRecord = {
      ...micrograms,
      additionalNutritionPer100mL: { dietaryFibre: {
        ...micrograms.additionalNutritionPer100mL!.dietaryFibre!, expression: 'anotherForm',
      } },
    };
    expect(makeNipDraft(product, recipes, [differentForms, ingredients[1]!]).missing.join(' '))
      .toContain('dietaryFibre mass and volume values use different nutrient expressions');
    const incompatible: IngredientRecord = {
      ...micrograms,
      nutrientProfile: { ...micrograms.nutrientProfile!, values: {
        ...micrograms.nutrientProfile!.values,
        protein: { ...micrograms.nutrientProfile!.values.protein!, expression: 'anotherForm' },
      } },
    };
    const reviewed = makeNipDraft(product, recipes, [incompatible, ingredients[1]!]);
    expect(reviewed.rows[1]?.unitQuantity).toBe('Not available');
    expect(reviewed.missing.join(' ')).toContain('Protein: nutrient expression needs review');
  });

  it('does not turn a tiny per-volume nutrient into zero during density conversion', () => {
    const a: IngredientRecord = {
      ...ingredients[0]!,
      ingredientDensity: { gramsPerMillilitre: '2', evidenceReference: 'Measurement', sourceDate: '2026-01-01' },
      additionalNutritionPer100mL: { dietaryFibre: {
        value: '0.00000000000000000000000000000000000000000000000001',
        unit: 'ug/100mL', sourceId: 'Lab', sourceDate: '2026-01-01', evidenceType: 'analysis',
      } },
    };
    const result = makeNipDraft(product, recipes, [a, ingredients[1]!]).optionalNutrients[0]?.result;
    expect(result).toMatchObject({ status: 'review_required', reason: 'INSUFFICIENT_NUTRIENT_PRECISION' });
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
    expect(missing.missing.join(' ')).toContain('energy per 100 g');
    expect(missing.rows[0]?.serving).toBe('Not available');
    const invalid = { ...ingredients[0]!, nutrientProfile: { ingredientId: 'A', values: {} } };
    expect(makeNipDraft(product, recipes, [invalid, ingredients[1]!]).rows[1]?.serving).toBe('Not available');
    const prepared = makeNipDraft({ ...product, foodState: 'asPrepared' }, recipes, ingredients);
    expect(prepared.missing.join(' ')).toContain('only supported for food as sold');
    expect(prepared.rows.every((row) => row.serving === 'Not available')).toBe(true);
  });

  it('does not interpret per-100 mL ingredient values as per-100 g', () => {
    const { nutrientProfile, energyPer100g, ...volumeOnly } = ingredients[0]!;
    expect(nutrientProfile).toBeDefined();
    expect(energyPer100g).toBeDefined();
    const source = { sourceId: 'label', sourceDate: '2026-01-01' };
    const result = makeNipDraft(product, recipes, [{
      ...volumeOnly,
      nutritionPer100mL: {
        energy: { value: '500', ...source },
        protein: { value: '20', ...source },
      },
    }, ingredients[1]!]);
    expect(result.rows[0]?.unitQuantity).toBe('Not available');
    expect(result.rows[1]?.unitQuantity).toBe('Not available');
    expect(result.missing.join(' ')).toContain('nutrition information');
  });

  it('uses a sourced ingredient density to calculate volume-based nutrition in a mass recipe', () => {
    const { nutrientProfile, energyPer100g, ...volumeOnly } = ingredients[0]!;
    expect(nutrientProfile).toBeDefined();
    expect(energyPer100g).toBeDefined();
    const source = { sourceId: 'Product label', sourceDate: '2026-01-01' };
    const liquid = {
      ...volumeOnly,
      ingredientDensity: { gramsPerMillilitre: '1.25', evidenceReference: 'Measurement', sourceDate: '2026-01-01' },
      nutritionPer100mL: {
        energy: { value: '500', ...source }, protein: { value: '20', ...source },
        fat: { value: '0', ...source }, saturatedFat: { value: '0', ...source },
        carbohydrate: { value: '0', ...source }, sugars: { value: '0', ...source },
        sodium: { value: '1.25', ...source },
      },
    };
    const result = makeNipDraft(product, recipes, [liquid, ingredients[1]!]);
    expect(result.missing).toEqual([]);
    expect(result.rows[0]?.unitQuantity).toBe('175 kJ');
    expect(result.rows[1]?.unitQuantity).toBe('7.0 g');
    expect(makeNipDraft(product, recipes, [{ ...liquid, ingredientDensity: { ...liquid.ingredientDensity, gramsPerMillilitre: '0' } }, ingredients[1]!]).rows[1]?.unitQuantity).toBe('Not available');
    expect(makeNipDraft(product, recipes, [{ ...liquid, ...ingredients[0] }, ingredients[1]!]).rows[1]?.unitQuantity).toBe('8.0 g');
  });

  it('invalidates the food-basis confirmation when the recipe changes and flags claims', () => {
    const changed = [{ ...recipes[0]!, lines: [recipes[0]!.lines[0]!] }, recipes[1]!];
    const result = makeNipDraft(product, changed, ingredients);
    expect(result.missing.join(' ')).toContain('Confirm that the recipe');
    expect(result.rows[0]?.serving).toBe('Not available');
    const claimed = makeNipDraft(product, recipes, ingredients, [
      { id: 'c', text: 'Low sugars', classification: 'nutrition_content', classificationConfirmed: true },
    ]);
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
