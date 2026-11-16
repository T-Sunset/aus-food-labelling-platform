import { openLocalFoodStore } from '@aus-food/storage';

export async function createPreviousWorkspace(): Promise<void> {
  const store = await openLocalFoodStore({ name: 'aus-food-labelling' });
  try {
    await store.ingredients.create({
      id: 'legacy-cocoa', name: 'Previous cocoa', recordType: 'ingredient', kind: 'atomic', tags: [],
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    });
  } finally {
    store.close();
  }
}

export async function previousIngredientName(): Promise<string | undefined> {
  const store = await openLocalFoodStore({ name: 'aus-food-labelling' });
  try {
    return (await store.ingredients.get('legacy-cocoa'))?.name;
  } finally {
    store.close();
  }
}
