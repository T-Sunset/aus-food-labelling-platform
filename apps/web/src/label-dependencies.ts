import type { FormulationRecord, IngredientRecord, ProductRecord } from '@aus-food/storage';

export function labelDependencySignature(
  product: ProductRecord,
  formulations: readonly FormulationRecord[],
  ingredients: readonly IngredientRecord[],
): string {
  const recipes = new Map(formulations.map((item) => [item.id, item]));
  const ingredientRecords = new Map(ingredients.map((item) => [item.id, item]));
  const seenRecipes = new Set<string>();
  const seenIngredients = new Set<string>();

  function visitIngredient(id: string): void {
    if (seenIngredients.has(id)) return;
    seenIngredients.add(id);
    const ingredient = ingredientRecords.get(id);
    if (ingredient?.compoundFormulationId) visitRecipe(ingredient.compoundFormulationId);
  }
  function visitRecipe(id: string): void {
    if (seenRecipes.has(id)) return;
    seenRecipes.add(id);
    const recipe = recipes.get(id);
    if (!recipe) return;
    const lines = [
      ...recipe.lines,
      ...(recipe.incompleteRecipeLines?.unquantifiedLines ?? []),
      ...(recipe.supplierComposition?.unquantifiedComponents ?? []),
    ];
    for (const line of lines) {
      if (line.kind === 'ingredient') visitIngredient(line.ingredientId);
      else visitRecipe(line.formulationId);
    }
  }
  visitRecipe(product.formulationId);
  if (product.preparation?.addedIngredientId) visitIngredient(product.preparation.addedIngredientId);
  return JSON.stringify({
    product,
    formulations: [...seenRecipes].sort().map((id) => [id, recipes.get(id) ?? null]),
    ingredients: [...seenIngredients].sort().map((id) => [id, ingredientRecords.get(id) ?? null]),
  });
}
