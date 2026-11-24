import type { FormulationRecord, IngredientRecord } from '@aus-food/storage';

export function displaySourcePath(
  path: readonly string[],
  ingredients: readonly IngredientRecord[],
  formulations: readonly FormulationRecord[],
  separator = ' → ',
): string {
  return path.map((id) => ingredients.find((item) => item.id === id)?.name
    ?? formulations.find((item) => item.id === id)?.name ?? id).join(separator);
}
