import type {
  FormulationRecord,
  IngredientRecord,
  LocalFoodStore,
  ProductRecord,
} from '@aus-food/storage';

export const workedExampleTag = 'worked-example';

export interface WorkedExampleSet {
  readonly ingredients: readonly IngredientRecord[];
  readonly formulations: readonly FormulationRecord[];
  readonly products: readonly ProductRecord[];
}

export interface LoadWorkedExamplesResult {
  readonly created: number;
  readonly skipped: number;
}

export interface RemoveWorkedExamplesResult {
  readonly removed: number;
  readonly kept: number;
}

export function workedExampleCount(set: WorkedExampleSet): number {
  return set.ingredients.length + set.formulations.length + set.products.length;
}

function isTagged(record: { readonly tags: readonly string[] }): boolean {
  return record.tags.includes(workedExampleTag);
}

// Adds any example record whose id is free. An id that already exists is left exactly as it is.
export async function loadWorkedExamples(
  store: LocalFoodStore,
  set: WorkedExampleSet,
): Promise<LoadWorkedExamplesResult> {
  const everyRecord = [...set.ingredients, ...set.formulations, ...set.products];
  const untagged = everyRecord.find((record) => !isTagged(record));
  if (untagged !== undefined) {
    throw new Error(`Worked example "${untagged.id}" is missing the ${workedExampleTag} tag.`);
  }

  const [ingredients, formulations, products] = await Promise.all([
    store.ingredients.list(),
    store.formulations.list(),
    store.products.list(),
  ]);
  const existing = new Set([...ingredients, ...formulations, ...products].map((record) => record.id));

  const undo: Array<() => Promise<void>> = [];
  let created = 0;
  try {
    for (const record of set.ingredients) {
      if (!existing.has(record.id)) {
        await store.ingredients.create(record);
        undo.push(() => store.ingredients.delete(record.id));
        created += 1;
      }
    }
    for (const record of set.formulations) {
      if (!existing.has(record.id)) {
        await store.formulations.create(record);
        undo.push(() => store.formulations.delete(record.id));
        created += 1;
      }
    }
    for (const record of set.products) {
      if (!existing.has(record.id)) {
        await store.products.create(record);
        undo.push(() => store.products.delete(record.id));
        created += 1;
      }
    }
  } catch (error) {
    const cleanupErrors: unknown[] = [];
    for (const step of undo.reverse()) {
      try {
        await step();
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
    }
    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        cleanupErrors,
        'Loading worked examples failed and cleanup was incomplete.',
        { cause: error },
      );
    }
    throw error;
  }
  return { created, skipped: everyRecord.length - created };
}

// Removes only records tagged worked-example. A tagged record is kept if the person's own
// (untagged) work or a kept example uses it, or if it has an approved version, because approved versions are immutable.
export async function removeWorkedExamples(store: LocalFoodStore): Promise<RemoveWorkedExamplesResult> {
  const [ingredients, formulations, products] = await Promise.all([
    store.ingredients.list(),
    store.formulations.list(),
    store.products.list(),
  ]);

  const ownFormulationIds = new Set<string>();
  const ownIngredientIds = new Set<string>();
  for (const product of products.filter((record) => !isTagged(record))) {
    ownFormulationIds.add(product.formulationId);
  }
  for (const formulation of formulations.filter((record) => !isTagged(record))) {
    for (const line of formulation.lines) {
      if (line.kind === 'ingredient') {
        ownIngredientIds.add(line.ingredientId);
      } else {
        ownFormulationIds.add(line.formulationId);
      }
    }
  }
  for (const ingredient of ingredients.filter((record) => !isTagged(record))) {
    if (ingredient.compoundFormulationId !== undefined) {
      ownFormulationIds.add(ingredient.compoundFormulationId);
    }
  }

  let removed = 0;
  let kept = 0;
  const attempt = async (
    record: ProductRecord | FormulationRecord | IngredientRecord,
    inUse: boolean,
    remove: () => Promise<void>,
  ): Promise<void> => {
    if (!isTagged(record)) {
      return;
    }
    const hasApprovedVersion =
      (await store.approvedVersions.list(record.recordType, record.id)).length > 0;
    if (inUse || hasApprovedVersion) {
      kept += 1;
      return;
    }
    await remove();
    removed += 1;
  };

  for (const record of products) {
    const keptBefore = kept;
    await attempt(record, false, () => store.products.delete(record.id));
    if (isTagged(record) && kept > keptBefore) {
      ownFormulationIds.add(record.formulationId);
    }
  }
  for (const record of formulations) {
    const keptBefore = kept;
    await attempt(record, ownFormulationIds.has(record.id), () => store.formulations.delete(record.id));
    if (isTagged(record) && kept > keptBefore) {
      for (const line of record.lines) {
        if (line.kind === 'ingredient') {
          ownIngredientIds.add(line.ingredientId);
        }
      }
    }
  }
  for (const record of ingredients) {
    await attempt(record, ownIngredientIds.has(record.id), () => store.ingredients.delete(record.id));
  }
  return { removed, kept };
}
