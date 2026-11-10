import { describe, expect, it } from 'vitest';
import type {
  FormulationRecord,
  IngredientRecord,
  LocalFoodStore,
  ProductRecord,
} from '@aus-food/storage';
import {
  loadWorkedExamples,
  removeWorkedExamples,
  workedExampleTag,
  type WorkedExampleSet,
} from './worked-examples.js';

const at = '2026-01-01T00:00:00.000Z';

function repo<T extends { id: string }>(failOnCreateId?: string) {
  const map = new Map<string, T>();
  return {
    map,
    create: async (record: T) => {
      if (record.id === failOnCreateId) {
        throw new Error('create failed');
      }
      map.set(record.id, record);
    },
    get: async (id: string) => map.get(id),
    list: async () => [...map.values()],
    update: async () => {
      throw new Error('not used');
    },
    delete: async (id: string) => {
      map.delete(id);
    },
  };
}

function fakeStore(failOnProductId?: string, approvedProductIds: string[] = []) {
  const ingredients = repo<IngredientRecord>();
  const formulations = repo<FormulationRecord>();
  const products = repo<ProductRecord>(failOnProductId);
  const store = {
    ingredients,
    formulations,
    products,
    approvedVersions: {
      list: async (type: string, id: string) =>
        type === 'product' && approvedProductIds.includes(id) ? [{ id: 'v1' }] : [],
    },
  } as unknown as LocalFoodStore;
  return { store, ingredients, formulations, products };
}

const ingredient = (id: string, tags: string[] = [workedExampleTag]): IngredientRecord => ({
  id,
  name: id,
  recordType: 'ingredient',
  kind: 'atomic',
  tags,
  createdAt: at,
  updatedAt: at,
});
const formulation = (id: string, ingredientId: string, tags: string[] = [workedExampleTag]): FormulationRecord => ({
  id,
  name: id,
  recordType: 'formulation',
  lines: [{ id: `${id}-line`, kind: 'ingredient', ingredientId, quantity: { value: '100', unit: 'g' } }],
  tags,
  createdAt: at,
  updatedAt: at,
});
const product = (id: string, formulationId: string, tags: string[] = [workedExampleTag]): ProductRecord => ({
  id,
  name: id,
  recordType: 'product',
  formulationId,
  tags,
  createdAt: at,
  updatedAt: at,
});

const set: WorkedExampleSet = {
  ingredients: [ingredient('we-ing')],
  formulations: [formulation('we-form', 'we-ing')],
  products: [product('we-prod', 'we-form')],
};

describe('worked examples', () => {
  it('loads every record into an empty workspace', async () => {
    const { store, ingredients, formulations, products } = fakeStore();
    expect(await loadWorkedExamples(store, set)).toEqual({ created: 3, skipped: 0 });
    expect(ingredients.map.size + formulations.map.size + products.map.size).toBe(3);
  });

  it('never overwrites an existing id and is safe to run twice', async () => {
    const { store, products } = fakeStore();
    const own = product('we-prod', 'own-form', ['mine']);
    await store.products.create(own);
    expect(await loadWorkedExamples(store, set)).toEqual({ created: 2, skipped: 1 });
    expect(products.map.get('we-prod')).toBe(own);
    expect(await loadWorkedExamples(store, set)).toEqual({ created: 0, skipped: 3 });
  });

  it('rejects an example that is missing the tag', async () => {
    const { store, ingredients } = fakeStore();
    await expect(
      loadWorkedExamples(store, { ...set, ingredients: [ingredient('bad', [])] }),
    ).rejects.toThrow('missing the worked-example tag');
    expect(ingredients.map.size).toBe(0);
  });

  it('rolls back everything it created if a later record fails', async () => {
    const { store, ingredients, formulations, products } = fakeStore('we-prod');
    await expect(loadWorkedExamples(store, set)).rejects.toThrow('create failed');
    expect(ingredients.map.size + formulations.map.size + products.map.size).toBe(0);
  });

  it('removes only tagged records and leaves the person\'s own work alone', async () => {
    const { store, ingredients, formulations, products } = fakeStore();
    await loadWorkedExamples(store, set);
    await store.ingredients.create(ingredient('own-ing', ['mine']));
    await store.formulations.create(formulation('own-form', 'own-ing', ['mine']));
    await store.products.create(product('own-prod', 'own-form', ['mine']));
    expect(await removeWorkedExamples(store)).toEqual({ removed: 3, kept: 0 });
    expect([...ingredients.map.keys()]).toEqual(['own-ing']);
    expect([...formulations.map.keys()]).toEqual(['own-form']);
    expect([...products.map.keys()]).toEqual(['own-prod']);
  });

  it('keeps an example that the person\'s own work uses', async () => {
    const { store, formulations, ingredients } = fakeStore();
    await loadWorkedExamples(store, set);
    await store.products.create(product('own-prod', 'we-form', ['mine']));
    expect(await removeWorkedExamples(store)).toEqual({ removed: 1, kept: 2 });
    expect(formulations.map.has('we-form')).toBe(true);
    expect(ingredients.map.has('we-ing')).toBe(true);
  });

  it('keeps an example product that has an approved version', async () => {
    const { store, products } = fakeStore(undefined, ['we-prod']);
    await loadWorkedExamples(store, set);
    expect(await removeWorkedExamples(store)).toEqual({ removed: 0, kept: 3 });
    expect(products.map.has('we-prod')).toBe(true);
  });
});
