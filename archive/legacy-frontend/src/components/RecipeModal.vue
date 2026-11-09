<template>
  <div class="modal-backdrop">
    <div class="modal-card">
      <h3>{{ recipe?.id ? "Edit" : "Add" }} Recipe</h3>

      <!-- Recipe Name -->
      <input v-model="form.name" placeholder="Recipe Name" class="form-control mb-2" />

      <!-- Ingredients Table -->
      <h5>Ingredients</h5>
      <table class="table table-sm">
        <thead>
          <tr>
            <th>Ingredient</th>
            <th>Quantity (g)</th>
            <th>Category</th>
            <th>Characterising?</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(ri, index) in form.ingredients" :key="ri.ingredientID">
            <td>{{ getIngredientName(ri.ingredientID) }}</td>
            <td>
              <input v-model.number="ri.quantity" type="number" class="form-control" />
            </td>
            <td>
              <select v-model="ri.category" class="form-select">
                <option :value="null">Select category...</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.label }}</option>
              </select>
            </td>
            <td class="text-center">
              <div>
                <label>Ingredient</label>
                <input type="checkbox" v-model="ri.characterising" />
              </div>
              <div v-if="ri.category !== null">
                <label>Category</label>
                <input type="checkbox" v-model="ri.categoryCharacterising" />
              </div>
            </td>
            <td>
              <button class="btn btn-sm btn-danger" @click="removeIngredient(index)">X</button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Add Ingredient -->
      <div class="d-flex mt-2 mb-2">
        <select v-model="selectedIngredientId" class="form-select me-2">
          <option disabled value="">Add Ingredient...</option>
          <option v-for="ing in availableIngredients" :key="ing.id" :value="ing.id">
            {{ ing.name }}
          </option>
        </select>
        <button class="btn btn-outline-primary" @click="addIngredient">Add</button>
      </div>

      <!-- Total Weight -->
      <div class="mb-2">
        <strong>Total Weight: {{ totalWeight }} g</strong>
      </div>

      <!-- Actions -->
      <div class="d-flex justify-content-end mt-3">
        <button class="btn btn-secondary me-2" @click="$emit('close')">Cancel</button>
        <button class="btn btn-primary" @click="save">Save</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from "vue";
import type { Recipe, RecipeIngredient, Ingredient } from "../config/types";
import { useIngredientStore } from "../stores/ingredientStore";
import { prescribedCategories } from "../config/prescribedCategories";

// Props & Emits
interface Props { recipe: Recipe | null; }
const props = defineProps<Props>();
const emit = defineEmits(["close", "save"]);

// Ingredient store
const ingredientStore = useIngredientStore();

// Form state
const form = reactive<Recipe>({
  id: 0,
  name: "",
  ingredients: [],
});

// Load recipe when modal opens
watch(() => props.recipe, (r) => {
  if (r) Object.assign(form, { ...r, ingredients: [...r.ingredients] });
  else form.ingredients = [], form.id = 0, form.name = "";
}, { immediate: true });

// Categories
const categories = prescribedCategories;

// Selected ingredient for adding
const selectedIngredientId = ref<number | null>(null);
const availableIngredients = computed(() =>
  ingredientStore.ingredients.filter(
    ing => !form.ingredients.some(ri => ri.ingredientID === ing.id)
  )
);

// Methods
function addIngredient() {
  if (!selectedIngredientId.value) return;
  form.ingredients.push({
    ingredientID: selectedIngredientId.value,
    quantity: 100,
    category: null,
    characterising: false,
    categoryCharacterising: false,
  });
  selectedIngredientId.value = null;
}

function removeIngredient(index: number) {
  form.ingredients.splice(index, 1);
}

// Lookup ingredient name
function getIngredientName(id: number) {
  return ingredientStore.getIngredientById(id)?.name ?? "Unknown";
}

// Computed total weight
const totalWeight = computed(() =>
  form.ingredients.reduce((sum, ri) => sum + (ri.quantity || 0), 0)
);

// Save
const save = () => emit("save", { ...form });
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 4rem;
  z-index: 1050;
}
.modal-card {
  background: white;
  padding: 1.5rem;
  border-radius: 10px;
  width: 700px;
  max-height: 90vh;
  overflow-y: auto;
}
th, td { text-align: center; }
</style>