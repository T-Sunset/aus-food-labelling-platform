<template>
  <div class="recipes-page container my-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2>Recipes</h2>
      <button class="btn btn-primary" @click="openAddModal">Add Recipe</button>
    </div>

    <input
      v-model="searchQuery"
      placeholder="Search recipes..."
      class="form-control mb-3"
    />

    <table class="table table-hover">
      <thead>
        <tr>
          <th>Name</th>
          <th># Ingredients</th>
          <th>Total Weight (g)</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="recipe in filteredRecipes" :key="recipe.id">
          <td>{{ recipe.name }}</td>
          <td>{{ recipe.ingredients?.length || 0 }}</td>
          <td>{{ calculateTotalWeight(recipe) }}</td>
          <td>
            <button class="btn btn-sm btn-outline-secondary me-1" @click="editRecipe(recipe)">Edit</button>
            <button class="btn btn-sm btn-outline-danger" @click="deleteRecipe(recipe.id)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>

    <RecipeModal
      v-if="showModal"
      :recipe="editingRecipe"
      @close="closeModal"
      @save="saveRecipe"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRecipeStore } from "../stores/recipeStore";
import type { Recipe } from "../config/types";
import RecipeModal from "../components/RecipeModal.vue";

const recipeStore = useRecipeStore();
const searchQuery = ref("");
const showModal = ref(false);
const editingRecipe = ref<Recipe | null>(null);

const filteredRecipes = computed(() =>
  recipeStore.recipes.filter(r =>
    r.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
);

const calculateTotalWeight = (recipe: Recipe) =>
  recipe.ingredients?.reduce((sum, ri) => sum + (ri.quantity || 0), 0) || 0;

const openAddModal = () => {
  editingRecipe.value = null;
  showModal.value = true;
};

const editRecipe = (recipe: Recipe) => {
  editingRecipe.value = { ...recipe, ingredients: [...recipe.ingredients] };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingRecipe.value = null;
};

const saveRecipe = (recipe: Recipe) => {
  if (recipe.id && recipeStore.getRecipeById(recipe.id)) {
    recipeStore.updateRecipe(recipe);
  } else {
    const { id, ...newRecipe } = recipe;
    recipeStore.addRecipe(newRecipe);
  }
  closeModal();
};

const deleteRecipe = (id: number) => {
  if (confirm("Are you sure you want to delete this recipe?")) {
    recipeStore.removeRecipe(id);
  }
};
</script>