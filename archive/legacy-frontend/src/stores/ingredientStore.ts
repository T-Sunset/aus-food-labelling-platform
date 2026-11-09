// stores/ingredientStore.ts
import { defineStore } from 'pinia';
import { reactive, computed } from 'vue';
import type { Ingredient } from '../config/types';

export const useIngredientStore = defineStore('ingredient', () => {
    const ingredients = reactive<Ingredient[]>([]);

    function addIngredient(newIngredient: Omit<Ingredient, 'id'>) {
        ingredients.push({
            id: Date.now(),
            allergenIDs: [],
            potentialAllergenIDs: [],
            ...newIngredient,
        });
        }

        function updateIngredient(updatedIngredient: Ingredient) {
        const index = ingredients.findIndex(i => i.id === updatedIngredient.id);
        if (index !== -1) {
            ingredients[index] = {
            ...ingredients[index], // keep existing arrays if missing
            allergenIDs: updatedIngredient.allergenIDs || [],
            potentialAllergenIDs: updatedIngredient.potentialAllergenIDs || [],
            ...updatedIngredient,
            };
        }
    }

    function removeIngredient(id: number) {
        const index = ingredients.findIndex((i) => i.id === id);
        if (index !== -1) ingredients.splice(index, 1);
    }

    function getIngredientById(id: number) {
        return ingredients.find((i) => i.id === id);
    }

    return { ingredients, addIngredient, removeIngredient, updateIngredient, getIngredientById };
});