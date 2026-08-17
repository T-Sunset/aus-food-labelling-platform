import { defineStore } from 'pinia';
import { reactive } from 'vue';
import type { Product } from '../config/types';
import { useRecipeStore } from './recipeStore';

export const useProductStore = defineStore('product', () => {
  const products = reactive<Product[]>([]);
  const recipeStore = useRecipeStore();

  function addProduct(product: Omit<Product, 'id'>) {
    products.push({
      ...product,
      id: Date.now(),
    });
  }

  function updateProduct(updated: Product) {
    const index = products.findIndex(p => p.id === updated.id);
    if (index !== -1) {
      products[index] = { ...updated };
    }
  }

  function removeProduct(id: number) {
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) products.splice(index, 1);
  }

  function getProductById(id: number) {
    return products.find(p => p.id === id);
  }

  /** NEW HELPER: get resolved recipe with full ingredients */
  function getResolvedRecipe(product: Product) {
    if (!product.recipeID) return undefined;
    const recipe = recipeStore.getRecipeById(product.recipeID);
    if (!recipe) return undefined;
    return {
      ...recipe,
      ingredients: recipeStore.getIngredientsWithData(recipe),
    };
  }

  return {
    products,
    addProduct,
    updateProduct,
    removeProduct,
    getProductById,
    getResolvedRecipe
  };
});