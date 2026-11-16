import { expandFormulation } from '@aus-food/engine';
import type { ExpandedIngredient } from '@aus-food/domain';
import type { FormulationRecord, IngredientRecord } from '@aus-food/storage';

export function expandNutritionComponents(
  root: readonly ExpandedIngredient[],
  formulations: readonly FormulationRecord[],
  ingredients: readonly IngredientRecord[],
): ExpandedIngredient[] {
  const byIngredient = new Map(ingredients.map((item) => [item.id, item]));
  const byFormulation = new Map(formulations.map((item) => [item.id, item]));

  function checkRecipe(id: string, stack: readonly string[]): void {
    if (stack.includes(id)) throw new Error('A circular composition needs to be fixed.');
    const recipe = byFormulation.get(id);
    if (!recipe) throw new Error('A compound composition is missing.');
    if (recipe.processMassProfile) throw new Error(`${recipe.name}: processing effects need nutrition review.`);
    for (const line of recipe.lines) {
      if (line.kind === 'formulation') checkRecipe(line.formulationId, [...stack, id]);
    }
  }

  function visit(item: ExpandedIngredient, stack: readonly string[]): ExpandedIngredient[] {
    const record = byIngredient.get(item.ingredientId);
    if (!record || record.kind !== 'compound' || record.compoundNutritionBasis !== 'components') return [item];
    if (stack.includes(record.id)) throw new Error(`${record.name}: circular composition needs to be fixed.`);
    const id = record.compoundFormulationId;
    const recipe = id ? byFormulation.get(id) : undefined;
    if (!id || !recipe || recipe.supplierComposition?.coverage !== 'complete') {
      throw new Error(`${record.name}: a complete component list is needed for nutrition.`);
    }
    checkRecipe(id, []);
    const children = expandFormulation(id, item.mass, formulations);
    return children.flatMap((child) => visit({
      ...child, sourcePath: [...item.sourcePath, ...child.sourcePath],
    }, [...stack, record.id]));
  }
  return root.flatMap((item) => visit(item, []));
}
