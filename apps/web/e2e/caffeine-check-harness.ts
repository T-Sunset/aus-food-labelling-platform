import { openLocalFoodStore, type FormulationRecord, type IngredientRecord, type ProductRecord } from '@aus-food/storage';
import { createEmptyProductClassificationProfile } from '@aus-food/engine';
import { applyAnswer, caffeinatedQuestions } from '../src/label-builder';
import { nutritionRecipeSignature } from '../src/product-form';

const now = '2026-11-19T00:00:00.000Z';

export async function seedCaffeineRangeCase(): Promise<void> {
  const store = await openLocalFoodStore();
  const caffeine: IngredientRecord = {
    id: 'caffeine-check-caffeine',
    name: 'Caffeine',
    recordType: 'ingredient',
    kind: 'atomic',
    tags: [],
    createdAt: now,
    updatedAt: now,
    caffeineEvidence: {
      status: 'present',
      amount: '100',
      unit: 'g/100g',
      specification: { reference: '', sourceDate: '' },
    },
  };
  const water: IngredientRecord = {
    id: 'caffeine-check-water',
    name: 'Water',
    recordType: 'ingredient',
    kind: 'atomic',
    tags: [],
    createdAt: now,
    updatedAt: now,
    caffeineEvidence: {
      status: 'absent',
      specification: { reference: '', sourceDate: '' },
    },
  };
  const formulation: FormulationRecord = {
    id: 'caffeine-check-formulation',
    name: 'Caffeine range test recipe',
    recordType: 'formulation',
    tags: [],
    createdAt: now,
    updatedAt: now,
    lines: [
      { id: 'caffeine-check-line-caffeine', kind: 'ingredient', ingredientId: caffeine.id, quantity: { value: '0.03', unit: 'g' } },
      { id: 'caffeine-check-line-water', kind: 'ingredient', ingredientId: water.id, quantity: { value: '99.97', unit: 'g' } },
    ],
  };
  let classificationProfile = createEmptyProductClassificationProfile();
  for (const question of caffeinatedQuestions) {
    classificationProfile = applyAnswer(classificationProfile, question, 'yes');
  }
  const ingredients = [caffeine, water];
  const product: ProductRecord = {
    id: 'caffeine-check-product',
    name: 'Provisional caffeine test drink',
    recordType: 'product',
    formulationId: formulation.id,
    foodState: 'asSold',
    builderProductType: 'caffeinatedBeverage',
    packDetails: {
      nutritionRecipeSignature: nutritionRecipeSignature(formulation.id, [formulation], ingredients),
      nutritionDensity: {
        gramsPerMillilitre: '1',
        evidenceReference: '',
        sourceDate: '',
      },
    },
    classificationProfile,
    consumerDirections: 'none',
    tags: [],
    createdAt: now,
    updatedAt: now,
  };

  try {
    await store.ingredients.create(caffeine);
    await store.ingredients.create(water);
    await store.formulations.create(formulation);
    await store.products.create(product);
  } finally {
    store.close();
  }
}
