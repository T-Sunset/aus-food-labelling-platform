import type {
  FormulationRecord,
  IngredientRecord,
  LocalFoodStore,
  ProductRecord,
} from '@aus-food/storage';

const demoCreatedAt = '2026-01-01T00:00:00.000Z';

export async function seedIllustrativeDemo(store: LocalFoodStore): Promise<void> {
  const [ingredients, formulations, products] = await Promise.all([
    store.ingredients.list(),
    store.formulations.list(),
    store.products.list(),
  ]);
  if (ingredients.length + formulations.length + products.length > 0) {
    throw new Error('Illustrative demo data can only be loaded into an empty workspace.');
  }
  if ((await store.approvedVersions.list('product', 'demo-product')).length > 0) {
    throw new Error('Illustrative demo identifiers are already used by a saved product version.');
  }

  const demoIngredients: IngredientRecord[] = [
    {
      id: 'demo-ingredient-base',
      name: 'Illustrative base',
      recordType: 'ingredient',
      kind: 'atomic',
      tags: ['illustrative-demo'],
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt,
    },
    {
      id: 'demo-ingredient-carrier',
      name: 'Illustrative carrier',
      recordType: 'ingredient',
      kind: 'atomic',
      tags: ['illustrative-demo'],
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt,
    },
  ];
  const demoFormulation: FormulationRecord = {
    id: 'demo-formulation-base',
    name: 'Illustrative formulation',
    recordType: 'formulation',
    lines: [
      {
        id: 'demo-line-base',
        kind: 'ingredient',
        ingredientId: 'demo-ingredient-base',
        quantity: { value: '40', unit: 'g' },
      },
      {
        id: 'demo-line-carrier',
        kind: 'ingredient',
        ingredientId: 'demo-ingredient-carrier',
        quantity: { value: '60', unit: 'g' },
      },
    ],
    tags: ['illustrative-demo'],
    createdAt: demoCreatedAt,
    updatedAt: demoCreatedAt,
  };
  const demoProduct: ProductRecord = {
    id: 'demo-product',
    name: 'Illustrative demo product',
    recordType: 'product',
    formulationId: demoFormulation.id,
    foodState: 'asSold',
    tags: ['illustrative-demo'],
    createdAt: demoCreatedAt,
    updatedAt: demoCreatedAt,
  };

  const createdIngredients: string[] = [];
  let formulationCreated = false;
  try {
    for (const ingredient of demoIngredients) {
      await store.ingredients.create(ingredient);
      createdIngredients.push(ingredient.id);
    }
    await store.formulations.create(demoFormulation);
    formulationCreated = true;
    await store.products.create(demoProduct);
  } catch (error) {
    const cleanupErrors: unknown[] = [];
    if (formulationCreated) {
      try {
        await store.formulations.delete(demoFormulation.id);
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
    }
    for (const ingredientId of createdIngredients.reverse()) {
      try {
        await store.ingredients.delete(ingredientId);
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
    }
    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        cleanupErrors,
        'Loading illustrative demo data failed and cleanup was incomplete.',
        { cause: error },
      );
    }
    throw error;
  }
}
