import type { FormulationRecord, IngredientRecord } from '@aus-food/storage';

export function finishedNutritionSnapshot(
  root: FormulationRecord,
  formulations: readonly FormulationRecord[],
  ingredients: readonly IngredientRecord[],
): string {
  const recipes = new Map(formulations.map((item) => [item.id, item]));
  recipes.set(root.id, root);
  const byIngredient = new Map(ingredients.map((item) => [item.id, item]));
  const recipeIds = new Set<string>();
  const ingredientIds = new Set<string>();

  function visitRecipe(id: string): void {
    if (recipeIds.has(id)) return;
    recipeIds.add(id);
    const recipe = recipes.get(id);
    if (!recipe) return;
    for (const line of [
      ...recipe.lines,
      ...(recipe.incompleteRecipeLines?.unquantifiedLines ?? []),
      ...(recipe.supplierComposition?.unquantifiedComponents ?? []),
    ]) {
      if (line.kind === 'formulation') visitRecipe(line.formulationId);
      else visitIngredient(line.ingredientId);
    }
  }
  function visitIngredient(id: string): void {
    if (ingredientIds.has(id)) return;
    ingredientIds.add(id);
    const ingredient = byIngredient.get(id);
    if (ingredient?.compoundFormulationId) visitRecipe(ingredient.compoundFormulationId);
  }
  visitRecipe(root.id);
  return JSON.stringify({
    recipes: [...recipeIds].sort().map((id) => {
      const recipe = recipes.get(id);
      if (!recipe) return { id, missing: true };
      const process = recipe.processMassProfile;
      return {
        id, lines: recipe.lines, composition: recipe.supplierComposition,
        incomplete: recipe.incompleteRecipeLines,
        process: process && {
          complete: process.complete, entryMethod: process.entryMethod,
          declaredFinalMass: process.declaredFinalMass,
          changes: process.changes.map(({ kind, mass, material, description }) => ({ kind, mass, material, description })),
        },
      };
    }),
    ingredients: [...ingredientIds].sort().map((id) => {
      const ingredient = byIngredient.get(id);
      if (!ingredient) return { id, missing: true };
      return {
        id, name: ingredient.name, kind: ingredient.kind, supplierName: ingredient.supplierName,
        specification: ingredient.specification, compoundFormulationId: ingredient.compoundFormulationId,
        compoundNutritionBasis: ingredient.compoundNutritionBasis, nutrientProfile: ingredient.nutrientProfile,
        energyPer100g: ingredient.energyPer100g, nutritionPer100mL: ingredient.nutritionPer100mL,
        additionalNutritionPer100mL: ingredient.additionalNutritionPer100mL, ingredientDensity: ingredient.ingredientDensity,
        directAdditiveSourceId: ingredient.directAdditiveSourceId, additiveSources: ingredient.additiveSources,
      };
    }),
  });
}
