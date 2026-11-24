import { openLocalFoodStore, type FormulationRecord, type IngredientRecord, type ProductRecord } from '@aus-food/storage';
import { buildIngredientRecord, emptyIngredientDraft } from '../src/ingredient-form';
import { nutritionRecipeSignature } from '../src/product-form';

const stamp = '2026-11-10T00:00:00.000Z';

export async function seedClaimNutrition(): Promise<void> {
  const draft = emptyIngredientDraft();
  Object.assign(draft, { name: 'Claim ingredient', kind: 'atomic', energyPer100g: '100' });
  draft.nutrients = { protein: '1', fat: '2', saturatedFat: '0', carbohydrate: '5', sugars: '5', sodium: '120' };
  const ingredient = buildIngredientRecord(draft, undefined, () => 'claim-ingredient', stamp);
  const recipe: FormulationRecord = {
    id: 'claim-recipe', name: 'Claim recipe', recordType: 'formulation', tags: [], createdAt: stamp, updatedAt: stamp,
    lines: [{ id: 'claim-line', kind: 'ingredient', ingredientId: ingredient.id, quantity: { value: '100', unit: 'g' } }],
  };
  const product: ProductRecord = {
    id: 'claim-product', name: 'Claim product', recordType: 'product', tags: [], createdAt: stamp, updatedAt: stamp,
    formulationId: recipe.id, foodState: 'asSold', consumerDirections: 'none',
    packDetails: { nutritionFoodForm: 'solid', nutritionRecipeSignature: nutritionRecipeSignature(recipe.id, [recipe], [ingredient]),
      servingSize: '50', servingUnit: 'g' },
    claimFacts: { foodForm: 'solid', formOfFoodConfirmed: true, servingConfirmed: true,
      prohibitedContexts: { infantFormulaProduct: false, kava: false, alcoholAbove1_15Percent: false } },
  };
  const store = await openLocalFoodStore();
  try {
    await store.ingredients.create(ingredient);
    await store.formulations.create(recipe);
    await store.products.create(product);
  } finally {
    store.close();
  }
}

export async function changeClaimSugars(value: string | null): Promise<void> {
  const store = await openLocalFoodStore();
  try {
    const ingredient = await store.ingredients.get('claim-ingredient');
    if (!ingredient?.nutrientProfile?.values.sugars) throw new Error('Claim test ingredient has no sugars.');
    const values: NonNullable<IngredientRecord['nutrientProfile']>['values'] = { ...ingredient.nutrientProfile.values };
    if (value === null) delete values.sugars;
    else values.sugars = { ...ingredient.nutrientProfile.values.sugars, value };
    await store.ingredients.update(ingredient.id, { nutrientProfile: { ...ingredient.nutrientProfile, values } });
  } finally {
    store.close();
  }
}

export async function readClaimRecords(productId: string, labelName: string) {
  const store = await openLocalFoodStore();
  try {
    const product = await store.products.get(productId);
    const label = (await store.labels.list()).find((item) => item.name === labelName && item.productId === productId);
    if (!product || !label) throw new Error('Claim test product or label is missing.');
    return { productClaims: product.claims, claimFacts: product.claimFacts, labelClaims: label.claims };
  } finally {
    store.close();
  }
}
