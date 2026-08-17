import { defineStore } from 'pinia';
import { reactive } from 'vue';
import type { Recipe, RecipeIngredient } from '../config/types';
import { useIngredientStore } from './ingredientStore';

export const useRecipeStore = defineStore('recipe', () => {
  const recipes = reactive<Recipe[]>([]);
  const ingredientStore = useIngredientStore();

  function addRecipe(recipe: Omit<Recipe, "id">) {
      recipes.push({ ...recipe, id: Date.now() });
  }

  function updateRecipe(recipe: Recipe) {
    const index = recipes.findIndex(r => r.id === recipe.id);
    if (index !== -1) {
      recipes[index] = { ...recipe };
    }
  }

  function removeRecipe(id: number) {
    const index = recipes.findIndex(r => r.id === id);
    if (index !== -1) recipes.splice(index, 1);
  }

  function getRecipeById(id: number) {
    return recipes.find(r => r.id === id);
  }

  /** NEW HELPER: resolve ingredients with full data */
  function getIngredientsWithData(recipe: Recipe) {
    return recipe.ingredients.map((ri: RecipeIngredient) => ({
      ...ri,
      ingredient: ingredientStore.getIngredientById(ri.ingredientID),
    }));
  }

  return { recipes, addRecipe, updateRecipe, removeRecipe, getRecipeById, getIngredientsWithData };
});