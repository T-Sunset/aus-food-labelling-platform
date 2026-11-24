import { calculateProcessMassBalance, convertMass, expandFormulation, multiplyDecimals, plainDecimal, sumDecimals } from '@aus-food/engine';
import type { DrainedNutrientId, FormulationRecord, IngredientRecord, ProductDraining, ProductPackDetails, ProductPreparation, ProductRecord } from '@aus-food/storage';
import { countAnswered, detectProductType } from './label-builder';
import { expandNutritionComponents } from './nutrition-components';
import { finishedNutritionSnapshot } from './finished-nutrition';
import { consumerDirectionsStatus } from './consumer-directions';

export type ProductFoodState = NonNullable<ProductRecord['foodState']>;

export interface ProductDraft {
  name: string;
  formulationId: string;
  foodState: ProductFoodState | '';
  consumerDirections: NonNullable<ProductRecord['consumerDirections']>;
  otherConsumerDirections: boolean;
  otherConsumerDirectionsText: string;
  servingSize: string;
  servingUnit: 'g' | 'mL' | '';
  servingsPerPack: string;
  netQuantity: string;
  netUnit: 'g' | 'mL' | '';
  nutritionFoodForm: 'solid' | 'liquid' | '';
  nutritionBasisConfirmed: boolean;
  nutritionDensity: string;
  nutritionDensityReference: string;
  nutritionDensityDate: string;
  preparationPresent: boolean;
  preparationEnabled: boolean;
  preparationKind: '' | 'reconstituted' | 'withFood';
  preparationDirections: string;
  preparationProductAmount: string;
  preparationProductUnit: 'g' | 'mL';
  preparationIngredientId: string;
  preparationAddedAmount: string;
  preparationAddedUnit: 'g' | 'mL';
  preparedServingAmount: string;
  preparedServingUnit: 'g' | 'mL';
  preparationMixingConfirmed: boolean;
  preparedDensity: string;
  preparedDensityReference: string;
  preparedDensityDate: string;
  drainingPresent: boolean;
  drainingEnabled: boolean;
  drainingDirections: string;
  drainedServingGrams: string;
  drainedSourceType: NonNullable<ProductDraining['sourceType']> | '';
  drainedSourceReference: string;
  drainedSourceDate: string;
  drainedValues: Record<DrainedNutrientId, string>;
  drainedConfirmed: boolean;
}

export const foodStateOptions: { value: ProductFoodState; label: string }[] = [
  { value: 'asSold', label: 'As sold (most products: the food as the customer receives it)' },
  { value: 'asPrepared', label: 'As prepared (the customer adds water, milk or similar)' },
  { value: 'asReconstituted', label: 'As reconstituted (a powder or concentrate mixed up)' },
  { value: 'asDrained', label: 'As drained (liquid poured off before eating)' },
  { value: 'asProcessed', label: 'As processed (cooked or otherwise processed)' },
  { value: 'asAdded', label: 'As added (as an ingredient in another food)' },
];

export function usesRoutineAsSoldMethod(draft: Pick<ProductDraft,
  'foodState' | 'consumerDirections' | 'preparationEnabled' | 'preparationKind' | 'preparationDirections'
  | 'drainingEnabled' | 'otherConsumerDirections'>): boolean {
  if (draft.foodState !== 'asSold' || draft.drainingEnabled || draft.otherConsumerDirections) return false;
  if (draft.consumerDirections === 'none') return !draft.preparationEnabled;
  return draft.consumerDirections === 'present'
    && draft.preparationEnabled
    && draft.preparationKind === 'withFood'
    && draft.preparationDirections.trim() !== '';
}

export function emptyProductDraft(): ProductDraft {
  return {
    name: '',
    formulationId: '',
    foodState: 'asSold',
    consumerDirections: 'unknown',
    otherConsumerDirections: false,
    otherConsumerDirectionsText: '',
    servingSize: '',
    servingUnit: '',
    servingsPerPack: '',
    netQuantity: '',
    netUnit: '',
    nutritionFoodForm: '',
    nutritionBasisConfirmed: false,
    nutritionDensity: '',
    nutritionDensityReference: '',
    nutritionDensityDate: '',
    preparationPresent: false,
    preparationEnabled: false,
    preparationKind: '',
    preparationDirections: '',
    preparationProductAmount: '',
    preparationProductUnit: 'g',
    preparationIngredientId: '',
    preparationAddedAmount: '',
    preparationAddedUnit: 'g',
    preparedServingAmount: '',
    preparedServingUnit: 'g',
    preparationMixingConfirmed: false,
    preparedDensity: '',
    preparedDensityReference: '',
    preparedDensityDate: '',
    drainingPresent: false,
    drainingEnabled: false,
    drainingDirections: '',
    drainedServingGrams: '',
    drainedSourceType: '',
    drainedSourceReference: '',
    drainedSourceDate: '',
    drainedValues: { energy: '', protein: '', fat: '', saturatedFat: '', carbohydrate: '', sugars: '', sodium: '' },
    drainedConfirmed: false,
  };
}

export function draftFromProduct(record: ProductRecord): ProductDraft {
  const pack = record.packDetails;
  return {
    name: record.name,
    formulationId: record.formulationId,
    foodState: record.foodState ?? '',
    consumerDirections: consumerDirectionsStatus(record),
    otherConsumerDirections: record.otherConsumerDirections ?? false,
    otherConsumerDirectionsText: record.otherConsumerDirectionsText ?? '',
    servingSize: pack?.servingSize ?? '',
    servingUnit: pack?.servingUnit ?? '',
    servingsPerPack: pack?.servingsPerPack ?? '',
    netQuantity: pack?.netQuantity ?? '',
    netUnit: pack?.netUnit ?? '',
    nutritionFoodForm: pack?.nutritionFoodForm ?? '',
    nutritionBasisConfirmed: Boolean(pack?.nutritionRecipeSignature),
    nutritionDensity: pack?.nutritionDensity?.gramsPerMillilitre ?? '',
    nutritionDensityReference: pack?.nutritionDensity?.evidenceReference ?? '',
    nutritionDensityDate: pack?.nutritionDensity?.sourceDate ?? '',
    preparationPresent: record.preparation !== undefined,
    preparationEnabled: record.preparation?.enabled ?? false,
    preparationKind: record.preparation?.kind ?? '',
    preparationDirections: record.preparation?.directions ?? '',
    preparationProductAmount: record.preparation?.productAmount?.value ?? '',
    preparationProductUnit: record.preparation?.productAmount?.unit ?? 'g',
    preparationIngredientId: record.preparation?.addedIngredientId ?? '',
    preparationAddedAmount: record.preparation?.addedAmount?.value ?? '',
    preparationAddedUnit: record.preparation?.addedAmount?.unit ?? 'g',
    preparedServingAmount: record.preparation?.preparedServing?.value ?? '',
    preparedServingUnit: record.preparation?.preparedServing?.unit ?? 'g',
    preparationMixingConfirmed: record.preparation?.mixingConfirmed ?? false,
    preparedDensity: record.preparation?.preparedDensity?.gramsPerMillilitre ?? '',
    preparedDensityReference: record.preparation?.preparedDensity?.evidenceReference ?? '',
    preparedDensityDate: record.preparation?.preparedDensity?.sourceDate ?? '',
    drainingPresent: record.draining !== undefined,
    drainingEnabled: record.draining?.enabled ?? record.foodState === 'asDrained',
    drainingDirections: record.draining?.directions ?? '',
    drainedServingGrams: record.draining?.servingGrams ?? '',
    drainedSourceType: record.draining?.sourceType ?? '',
    drainedSourceReference: record.draining?.sourceReference ?? '',
    drainedSourceDate: record.draining?.sourceDate ?? '',
    drainedValues: {
      energy: record.draining?.values.energy ?? '', protein: record.draining?.values.protein ?? '',
      fat: record.draining?.values.fat ?? '', saturatedFat: record.draining?.values.saturatedFat ?? '',
      carbohydrate: record.draining?.values.carbohydrate ?? '', sugars: record.draining?.values.sugars ?? '',
      sodium: record.draining?.values.sodium ?? '',
    },
    drainedConfirmed: Boolean(record.draining?.confirmationSnapshot),
  };
}

export function nutritionRecipeSignature(id: string, formulations: readonly FormulationRecord[], ingredients: readonly IngredientRecord[] = []): string {
  const recipe = formulations.find((item) => item.id === id);
  if (recipe?.finishedNutrition?.selected) {
    if (recipe.nutrientRetention?.selected) throw new Error('Choose one finished nutrition method.');
    const snapshot = finishedNutritionSnapshot(recipe, formulations, ingredients);
    if (!recipe.finishedNutrition.recipeSnapshot || recipe.finishedNutrition.recipeSnapshot !== snapshot) {
      throw new Error('Check that the finished-food nutrition values still describe this recipe and its processing.');
    }
    return JSON.stringify({ id, finishedNutrition: recipe.finishedNutrition });
  }
  if (recipe?.nutrientRetention?.selected) {
    const { expanded, balance } = retentionRecipeInputs(recipe, formulations, ingredients);
    return JSON.stringify({
      id, retention: recipe.nutrientRetention, expanded, balance,
      finishedEnergy: recipe.finishedNutrition && {
        value: recipe.finishedNutrition.energyPer100g,
        recipeSnapshot: recipe.finishedNutrition.recipeSnapshot,
      },
    });
  }
  const expanded = expandFormulation(id, { value: '100', unit: 'g' }, formulations);
  const nutrition = expandNutritionComponents(expanded, formulations, ingredients);
  return JSON.stringify({ id, ingredients: expanded, ...(JSON.stringify(expanded) !== JSON.stringify(nutrition) ? { nutrition } : {}) });
}

export function retentionRecipeInputs(
  recipe: FormulationRecord,
  formulations: readonly FormulationRecord[],
  ingredients: readonly IngredientRecord[],
) {
  const retention = recipe.nutrientRetention;
  if (!retention?.selected || recipe.finishedNutrition?.selected) {
    throw new Error('Choose one finished nutrition method.');
  }
  if (!retention.recipeSnapshot || retention.recipeSnapshot !== finishedNutritionSnapshot(recipe, formulations, ingredients)) {
    throw new Error('Check that the nutrient retention evidence still applies to this recipe and its processing.');
  }
  if (recipe.processMassProfile?.changes.some((change) => change.kind === 'addition')) {
    throw new Error('Processing additions need separate nutrient evidence and are not supported by this retention calculation.');
  }
  const expanded = expandNutritionComponents(
    expandFormulation(recipe.id, { value: '100', unit: 'g' }, formulations),
    formulations, ingredients, recipe.id,
  );
  if (!expanded.length) throw new Error('The recipe has no ingredients.');
  const startingMass = sumDecimals(recipe.lines.map((line) => convertMass(line.quantity, 'g').value));
  const balance = calculateProcessMassBalance({ value: startingMass, unit: 'g' }, recipe.processMassProfile);
  if (balance.status !== 'calculated') throw new Error('A complete final batch weight is needed for nutrient retention.');
  return { expanded, balance };
}

const positiveNumber = /^\d+(\.\d+)?$/;

function isPositive(value: string): boolean {
  return positiveNumber.test(value) && Number.isFinite(Number(value)) && Number(value) > 0;
}

export function suggestedNetContents(draft: Pick<ProductDraft,
  'foodState' | 'servingSize' | 'servingUnit' | 'servingsPerPack' | 'netQuantity' | 'netUnit'>):
  { value: string; unit: 'g' | 'mL' } | undefined {
  const serving = draft.servingSize.trim();
  const count = draft.servingsPerPack.trim();
  const unit = draft.servingUnit;
  if (draft.foodState !== 'asSold' || !unit || !isPositive(serving) || !isPositive(count)
    || draft.netQuantity.trim() || (draft.netUnit && draft.netUnit !== unit)) return undefined;
  const value = plainDecimal(multiplyDecimals(serving, count));
  if (!isPositive(value)) return undefined;
  return { value, unit };
}

function validOptionalDate(value: string): boolean {
  if (!value) return true;
  const date = new Date(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// Only the filled-in pack fields are kept; blank ones stay unknown, never zero.
export function buildPackDetails(draft: ProductDraft, signature?: string): ProductPackDetails | undefined {
  const entries: [string, string][] = [
    ['servingSize', draft.servingSize.trim()],
    ['servingsPerPack', draft.servingsPerPack.trim()],
    ['netQuantity', draft.netQuantity.trim()],
  ];
  const pack: Record<string, string | ProductPackDetails['nutritionDensity']> = {};
  for (const [key, value] of entries) {
    if (value === '') {
      continue;
    }
    if (!isPositive(value)) {
      throw new Error('Pack amounts must be positive numbers, for example 250 or 1.5.');
    }
    pack[key] = value;
  }
  if (draft.netUnit !== '') {
    pack.netUnit = draft.netUnit;
  }
  if (draft.servingUnit !== '') {
    pack.servingUnit = draft.servingUnit;
  }
  if (draft.nutritionFoodForm !== '') {
    pack.nutritionFoodForm = draft.nutritionFoodForm;
  }
  if (draft.nutritionBasisConfirmed) {
    if (!signature) throw new Error('Save a valid recipe before confirming the nutrition basis.');
    pack.nutritionRecipeSignature = signature;
  }
  const density = draft.nutritionDensity.trim();
  const reference = draft.nutritionDensityReference.trim();
  const date = draft.nutritionDensityDate;
  if (density || reference || date) {
    if (!isPositive(density) || !validOptionalDate(date)) {
      throw new Error('Density needs a positive value and a valid date if supplied.');
    }
    pack.nutritionDensity = { gramsPerMillilitre: density, evidenceReference: reference, sourceDate: date };
  }
  return Object.keys(pack).length === 0 ? undefined : (pack as ProductPackDetails);
}

export interface ProductChanges {
  name: string;
  formulationId: string;
  foodState: ProductFoodState | undefined;
  consumerDirections: NonNullable<ProductRecord['consumerDirections']>;
  otherConsumerDirections: boolean;
  otherConsumerDirectionsText: string;
  packDetails: ProductPackDetails | undefined;
  preparation: ProductPreparation | undefined;
  draining: ProductDraining | undefined;
}

export function drainingSnapshot(draining: ProductDraining, recipeSignature: string): string {
  return JSON.stringify({
    recipeSignature, directions: draining.directions, sourceType: draining.sourceType,
    sourceReference: draining.sourceReference, sourceDate: draining.sourceDate, values: draining.values,
  });
}

export function buildDraining(
  draft: ProductDraft,
  formulations: readonly FormulationRecord[],
  ingredients: readonly IngredientRecord[],
): ProductDraining | undefined {
  if (!draft.drainingPresent && !draft.drainingEnabled && draft.foodState !== 'asDrained') return undefined;
  const serving = draft.drainedServingGrams.trim();
  if (serving && !isPositive(serving)) throw new Error('Drained serving size must be a positive number.');
  if (!validOptionalDate(draft.drainedSourceDate)) throw new Error('Enter a valid drained nutrition source date.');
  const values: ProductDraining['values'] = {};
  for (const [id, input] of Object.entries(draft.drainedValues) as [DrainedNutrientId, string][]) {
    const value = input.trim();
    if (!value) continue;
    if (!positiveNumber.test(value) || !Number.isFinite(Number(value))) {
      throw new Error('Drained nutrient values must be non-negative numbers.');
    }
    values[id] = value;
  }
  const draining: ProductDraining = {
    enabled: draft.drainingEnabled,
    ...(draft.drainingDirections.trim() ? { directions: draft.drainingDirections.trim() } : {}),
    ...(serving ? { servingGrams: serving } : {}),
    ...(draft.drainedSourceType ? { sourceType: draft.drainedSourceType } : {}),
    ...(draft.drainedSourceReference.trim() ? { sourceReference: draft.drainedSourceReference.trim() } : {}),
    ...(draft.drainedSourceDate ? { sourceDate: draft.drainedSourceDate } : {}),
    values,
  };
  if (!draft.drainedConfirmed) return draining;
  const signature = preparationRecipeSignature(draft.formulationId, formulations, ingredients);
  if (!signature || !draining.directions || !Object.keys(values).length) {
    throw new Error('Enter the draining directions and at least one value before confirming.');
  }
  return { ...draining, confirmationSnapshot: drainingSnapshot(draining, signature) };
}

export function preparationIngredientSignature(ingredient: IngredientRecord): string {
  return JSON.stringify({
    id: ingredient.id, name: ingredient.name, kind: ingredient.kind,
    compoundNutritionBasis: ingredient.compoundNutritionBasis, nutrientProfile: ingredient.nutrientProfile,
    energyPer100g: ingredient.energyPer100g, nutritionPer100mL: ingredient.nutritionPer100mL,
    ingredientDensity: ingredient.ingredientDensity,
  });
}

export function preparationRecipeSignature(
  formulationId: string,
  formulations: readonly FormulationRecord[],
  ingredients: readonly IngredientRecord[],
): string | undefined {
  const recipe = formulations.find((item) => item.id === formulationId);
  if (!recipe) return undefined;
  return JSON.stringify({
    recipe: finishedNutritionSnapshot(recipe, formulations, ingredients),
    finishedNutrition: recipe.finishedNutrition,
    nutrientRetention: recipe.nutrientRetention,
  });
}

export function preparationSnapshot(
  preparation: ProductPreparation,
  formulationId: string,
  ingredient: IngredientRecord,
  productDensity: ProductPackDetails['nutritionDensity'],
  recipeSignature: string,
): string {
  return JSON.stringify({
    formulationId, kind: preparation.kind, directions: preparation.directions,
    productAmount: preparation.productAmount, addedAmount: preparation.addedAmount,
    productDensity: preparation.productAmount?.unit === 'mL' ? productDensity : undefined,
    ingredient: preparationIngredientSignature(ingredient),
    recipeSignature,
  });
}

export function buildPreparation(
  draft: ProductDraft,
  ingredients: readonly IngredientRecord[],
  formulations: readonly FormulationRecord[] = [],
): ProductPreparation | undefined {
  if (!draft.preparationPresent && !draft.preparationEnabled) return undefined;
  function amount(value: string, unit: 'g' | 'mL', label: string) {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (!isPositive(trimmed)) throw new Error(`${label} must be a positive number.`);
    return { value: trimmed, unit };
  }
  const productAmount = amount(draft.preparationProductAmount, draft.preparationProductUnit, 'Product amount');
  const addedAmount = amount(draft.preparationAddedAmount, draft.preparationAddedUnit, 'Added food amount');
  const preparedServing = amount(draft.preparedServingAmount, draft.preparedServingUnit, 'Prepared serving');
  const density = draft.preparedDensity.trim();
  const reference = draft.preparedDensityReference.trim();
  const date = draft.preparedDensityDate;
  if ((density || reference || date) && (!isPositive(density) || !validOptionalDate(date))) {
    throw new Error('Prepared food density needs a positive value and a valid date if supplied.');
  }
  const preparation: ProductPreparation = {
    enabled: draft.preparationEnabled,
    ...(draft.preparationKind ? { kind: draft.preparationKind } : {}),
    ...(draft.preparationDirections.trim() ? { directions: draft.preparationDirections.trim() } : {}),
    ...(productAmount ? { productAmount } : {}),
    ...(draft.preparationIngredientId ? { addedIngredientId: draft.preparationIngredientId } : {}),
    ...(addedAmount ? { addedAmount } : {}),
    ...(preparedServing ? { preparedServing } : {}),
    ...(density ? { preparedDensity: {
      gramsPerMillilitre: density, evidenceReference: reference, sourceDate: date,
    } } : {}),
  };
  if (!draft.preparationMixingConfirmed) return preparation;
  const ingredient = ingredients.find((item) => item.id === preparation.addedIngredientId);
  const recipeSignature = preparationRecipeSignature(draft.formulationId, formulations, ingredients);
  if (!preparation.kind || !preparation.directions || !productAmount || !addedAmount || !ingredient || !recipeSignature) {
    throw new Error('Enter the preparation type, directions, amounts and added food before confirming.');
  }
  const productDensity = draft.nutritionDensity.trim()
    ? { gramsPerMillilitre: draft.nutritionDensity.trim(), evidenceReference: draft.nutritionDensityReference.trim(),
      sourceDate: draft.nutritionDensityDate } : undefined;
  return { ...preparation, mixingConfirmed: true,
    confirmationSnapshot: preparationSnapshot(preparation, draft.formulationId, ingredient, productDensity, recipeSignature) };
}

// Throws a plain-English Error when the basics are missing.
export function buildProductChanges(
  draft: ProductDraft,
  recipeIds: readonly string[],
  signature?: string,
  ingredients: readonly IngredientRecord[] = [],
  formulations: readonly FormulationRecord[] = [],
): ProductChanges {
  const name = draft.name.trim();
  if (!name) {
    throw new Error('Give the product a name.');
  }
  if (!recipeIds.includes(draft.formulationId)) {
    throw new Error('Choose the recipe this product is made from.');
  }
  return {
    name,
    formulationId: draft.formulationId,
    foodState: draft.foodState || undefined,
    consumerDirections: draft.consumerDirections,
    otherConsumerDirections: draft.otherConsumerDirections,
    otherConsumerDirectionsText: draft.otherConsumerDirectionsText.trim(),
    packDetails: buildPackDetails(draft, signature),
    preparation: buildPreparation(draft, ingredients, formulations),
    draining: buildDraining(draft, formulations, ingredients),
  };
}

export function newProductRecord(
  changes: ProductChanges,
  id: string,
  now: string,
): ProductRecord {
  return {
    id,
    name: changes.name,
    recordType: 'product',
    formulationId: changes.formulationId,
    ...(changes.foodState === undefined ? {} : { foodState: changes.foodState }),
    consumerDirections: changes.consumerDirections,
    otherConsumerDirections: changes.otherConsumerDirections,
    otherConsumerDirectionsText: changes.otherConsumerDirectionsText,
    ...(changes.packDetails === undefined ? {} : { packDetails: changes.packDetails }),
    ...(changes.preparation === undefined ? {} : { preparation: changes.preparation }),
    ...(changes.draining === undefined ? {} : { draining: changes.draining }),
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
}

export interface ProductStepStatus {
  done: boolean;
  text: string;
}

export type ProductStepId = 'about' | 'type' | 'pack' | 'additives';

export function productStepStatuses(
  draft: ProductDraft,
  saved: ProductRecord | undefined,
): Record<ProductStepId, ProductStepStatus> {
  const aboutDone = draft.name.trim() !== '' && draft.formulationId !== '' && draft.foodState !== '';
  const profile = saved?.classificationProfile;
  const type = saved?.builderProductType ?? (profile === undefined ? '' : detectProductType(profile));
  let typeDone = false;
  if (type === 'other') {
    typeDone = true;
  } else if (profile !== undefined && type !== '') {
    const { answered, total } = countAnswered(profile, type);
    typeDone = answered === total;
  }
  const packDone = draft.servingUnit !== '' && draft.netUnit !== ''
    && [draft.servingSize, draft.servingsPerPack, draft.netQuantity].every(isPositive);
  const additivesDone = saved?.additiveNameInputs !== undefined;
  return {
    about: { done: aboutDone, text: aboutDone ? 'Answered' : 'Still needed' },
    type: { done: typeDone, text: typeDone ? 'Answered' : 'Still needed' },
    pack: { done: packDone, text: packDone ? 'Answered' : 'Still needed' },
    additives: { done: additivesDone, text: additivesDone ? 'Answered' : 'Still needed' },
  };
}
