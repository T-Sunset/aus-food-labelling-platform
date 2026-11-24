import { openLocalFoodStore } from '@aus-food/storage';
import { workedExampleSet } from '../src/worked-example-data';
import { loadWorkedExamples } from '../src/worked-examples';

export async function seedWorkedExamples(): Promise<void> {
  const store = await openLocalFoodStore();
  try {
    await loadWorkedExamples(store, workedExampleSet);
  } finally {
    store.close();
  }
}
