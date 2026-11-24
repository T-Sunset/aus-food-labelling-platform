import { expandFormulation } from '@aus-food/engine';
import type { FormulationRecord, IngredientRecord, ProductRecord } from '@aus-food/storage';
import type { LabelDraft, ReviewAction } from './label-draft';

export interface ProductCompletionItem {
  readonly message: string;
  readonly actions: readonly ReviewAction[];
  readonly details?: readonly string[];
}

export function productCompletionItems(
  product: ProductRecord,
  label: LabelDraft,
  formulations: readonly FormulationRecord[],
  ingredients: readonly IngredientRecord[],
): ProductCompletionItem[] {
  const items: ProductCompletionItem[] = label.issues
    .filter((issue) => issue.area === 'product' || issue.area === 'pack')
    .map(({ message, actions }) => ({ message, actions }));
  const recipeAction: ReviewAction = { kind: 'recipe', id: product.formulationId };
  try {
    const expanded = expandFormulation(product.formulationId, { value: '100', unit: 'g' }, formulations);
    if (expanded.some((line) => !ingredients.some((ingredient) => ingredient.id === line.ingredientId))) {
      items.push({
        message: 'A recipe ingredient is unavailable.',
        actions: [recipeAction, { kind: 'section', section: 'about' }],
      });
    }
  } catch (error) {
    items.push({
      message: 'The recipe or its ingredient amounts need attention.',
      actions: [recipeAction, { kind: 'section', section: 'about' }],
      details: [error instanceof Error ? error.message : 'The recipe could not be read.'],
    });
  }
  const panelInputIssues = label.nutritionPanel.basis === 'drained'
    ? label.drainedNutrition?.missing ?? ['Drained nutrition information is unavailable; review the recorded directions.']
    : label.nutritionPanel.basis === 'reconstituted'
      ? label.preparedNutrition?.missing ?? ['Prepared nutrition information is unavailable; review the recorded directions.']
      : label.nutritionPanel.missing;
  const nutritionIssues = [...new Set([
    ...panelInputIssues,
    ...label.issues.filter((issue) => issue.area === 'nutrition' && label.nutrition.missing.includes(issue.message))
      .map((issue) => issue.message),
  ])];
  if (nutritionIssues.length) {
    const ingredientIds = [
      ...label.declarationInputs.map((input) => input.ingredientId),
      ...(product.preparation?.addedIngredientId ? [product.preparation.addedIngredientId] : []),
    ];
    const ingredientActions: ReviewAction[] = [...new Set(ingredientIds)]
      .filter((id) => ingredients.some((ingredient) => ingredient.id === id))
      .map((id) => ({ kind: 'ingredient', id }));
    items.push({
      message: 'Nutrition or customer directions need attention.',
      actions: [{ kind: 'section', section: 'nutrition' }, recipeAction, ...ingredientActions],
      details: nutritionIssues,
    });
  }
  return items;
}
