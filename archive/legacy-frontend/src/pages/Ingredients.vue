<template>
  <div class="ingredients-page container my-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2>Ingredients</h2>
      <button class="btn btn-primary" @click="openModal()">Add Ingredient</button>
    </div>

    <input
      v-model="searchQuery"
      placeholder="Search ingredients..."
      class="form-control mb-3"
    />

    <table class="table table-hover">
      <thead>
        <tr>
          <th>Name</th>
          <th>Additive Number</th>
          <th># Nutrients</th>
          <th>Allergens</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="ingredient in filteredIngredients" :key="ingredient.id">
          <td>{{ ingredient.name }}</td>
          <td>{{ ingredient.additiveNumber || '-' }}</td>
          <td>{{ Object.keys(ingredient.nutrientValues || {}).length }}</td>
          <td>
            {{
              (ingredient.allergenIDs || [])
                .map(id => allergenMap[id]?.label)
                .filter(Boolean)
                .join(', ') || '-'
            }}
          </td>
          <td>
            <button class="btn btn-sm btn-outline-secondary me-1" @click="openModal(ingredient)">Edit</button>
            <button class="btn btn-sm btn-outline-danger" @click="deleteIngredient(ingredient.id)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>

    <IngredientModal
      v-if="showModal"
      :ingredient="editingIngredient"
      @close="closeModal"
      @save="saveIngredient"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useIngredientStore } from "../stores/ingredientStore";
import type { Ingredient } from "../config/types";
import IngredientModal from "../components/IngredientModal.vue";
import { allergens } from "../config/allergens";

const ingredientStore = useIngredientStore();

const searchQuery = ref("");
const showModal = ref(false);
const editingIngredient = ref<Ingredient | null>(null);

// Map for quick allergen label lookup
const allergenMap = Object.fromEntries(allergens.map(a => [a.id, a]));

// Computed filtered ingredients
const filteredIngredients = computed(() =>
  ingredientStore.ingredients.filter(i =>
    i.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
);

// Open modal, optionally with ingredient to edit
const openModal = (ingredient?: Ingredient) => {
  editingIngredient.value = ingredient ? { ...ingredient } : null;
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingIngredient.value = null;
};

// Save or update ingredient
const saveIngredient = (ingredient: Ingredient) => {
  if (ingredient.id && ingredientStore.getIngredientById(ingredient.id)) {
    ingredientStore.updateIngredient(ingredient);
  } else {
    // Remove id when adding new
    const { id, ...newIngredient } = ingredient;
    ingredientStore.addIngredient(newIngredient);
  }
  closeModal();
};

// Delete ingredient
const deleteIngredient = (id: number) => {
  if (confirm("Are you sure you want to delete this ingredient?")) {
    ingredientStore.removeIngredient(id);
  }
};
</script>