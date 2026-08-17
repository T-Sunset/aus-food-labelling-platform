// @ts-ignore: no declaration file for nutrientDefinitions.js
import { nutrientDefinitions } from "../config/nutrientDefinitions.js";
import type { Recipe, RecipeIngredient } from "../config/types.js";
import { useIngredientStore } from "../stores/ingredientStore.js";
import { useRecipeStore } from "../stores/recipeStore.js";

/**
 * Calculate nutrition per 100g of a Recipe
 * @param recipe The recipe to calculate
 * @param claimFlags Active claims to filter nutrients
 */
export function calculateNutrition(recipe: Recipe, claimFlags: string[] = []) {
    if (!recipe.ingredients?.length) return [];

    // Recursive helper to sum nutrients for a RecipeIngredient
    function sumNutrients(ri: RecipeIngredient, multiplier: number = 1): Record<string, number> {
        const totals: Record<string, number> = {};
        nutrientDefinitions.forEach((def: { id: string }) => (totals[def.id] = 0));

        const { ingredientID, quantity } = ri;
        const qty = quantity * multiplier;
        const ingredient = useIngredientStore().getIngredientById(ingredientID);
        const recipes = useRecipeStore().recipes;
        const ingredientRecipe = recipes.find(r => r.id === ingredient?.recipeID);
        if (!ingredient) return {};

        // If ingredient has NO sub-recipe, use its base nutrients
        if (!ingredientRecipe && ingredient.nutrientValues) {
            Object.entries(ingredient.nutrientValues).forEach(([nid, val]) => {
                totals[nid] = (totals[nid] ?? 0) + Number(val) * (qty / 100);
            });
        }

        // If the ingredient has a sub-recipe
        if (ingredientRecipe !== undefined) {
                if (ingredientRecipe.ingredients?.length) {
                    ingredientRecipe.ingredients.forEach((subRI: RecipeIngredient) => {
                        const subTotals = sumNutrients(subRI, qty / 100);
                        Object.keys(subTotals).forEach(nid => {
                            totals[nid] = (totals[nid] ?? 0) + (subTotals[nid] ?? 0);
                        });
                    });
                }
        }

        return totals;
    }

    // Sum all top-level ingredients
    const rawTotals: Record<string, number> = {};
    nutrientDefinitions.forEach((def: { id: string }) => (rawTotals[def.id] = 0));

    recipe.ingredients.forEach((ri: RecipeIngredient) => {
        const totals = sumNutrients(ri);
        Object.keys(totals).forEach(nid => {
            rawTotals[nid] = (rawTotals[nid] ?? 0) + (totals[nid] ?? 0);
        });
    });

    // Calculate total weight
    const totalWeight = recipe.ingredients.reduce((sum, ri) => sum + ri.quantity, 0);
    if (!totalWeight) return [];

    // Convert totals to per 100g and apply claim filters
    return nutrientDefinitions
        .filter((def: { id: string; mandatoryBase?: boolean; claimTriggers?: string[] }) => {
            if (def.mandatoryBase) return true;
            if (def.claimTriggers?.some((trigger: string) => claimFlags.includes(trigger))) return true;
            return false;
        })
        .map((def => ({
            ...def,
            value: (((rawTotals[def.id] ?? 0) / totalWeight) * 100).toFixed(2)
        })));
}