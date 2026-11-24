import type { IngredientAdditiveSource } from '@aus-food/domain';
import type { LabelAdditiveWording } from '@aus-food/storage';

export function labelAdditiveSelection(
  ingredientId: string,
  source: IngredientAdditiveSource,
  wording: readonly LabelAdditiveWording[],
) {
  return wording.find((item) => item.ingredientId === ingredientId && item.additiveSourceId === source.id)?.selection
    ?? source.declarationSelection;
}
