import type { IngredientRecord } from '@aus-food/storage';

export function additiveSourcesInRecipe(record: IngredientRecord): NonNullable<IngredientRecord['additiveSources']> {
  return (record.additiveSources ?? []).map((source) =>
    source.id === record.directAdditiveSourceId && source.sourceStatus === 'unknown'
      ? { ...source, sourceStatus: 'added' }
      : source,
  );
}
