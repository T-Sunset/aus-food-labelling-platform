<template>
  <div class="modal-backdrop">
    <div class="modal-card">
      <h3>{{ ingredient?.id ? 'Edit' : 'Add' }} Ingredient</h3>

      <!-- Basic Info -->
       <div class="container border-bottom">
        <div class="row mb-3">
          <div class="col-2">
            <label>Name:</label>
          </div>
          <div class="col-10">
            <input v-model="formName" placeholder="Ingredient Name" class="form-control mb-2" v-if="!isAdditive"/>
            <label v-else>{{ formName }}</label>
          </div>
        </div>
        <div class="row mb-3">
          <div class="col-2">
            <label>Additive?</label>
          </div>
          <div class="col-2">
            <input type="checkbox" v-model="isAdditive"/>
          </div>
          <div class="col-8" v-if="isAdditive">
            <input v-model="form.additiveNumber" placeholder="Additive Number" class="form-control mb-2" />
          </div>
        </div>
       </div>

      <!-- Composite Ingredient Information -->
       <div class="my-3 pb-3 border-bottom">
        <div class="row">
          <h5>Composite Information</h5>
        </div>
        <div class="row">
          <div class="col-6">
            <label>Comprised of Other Ingredients?</label>
          </div>
          <div class="col-6">
            <input type="checkbox" v-model="isComposite">
          </div>
        </div>
        <div class="row" v-if="isComposite">
          <!-- Recipe -->
          <select v-model="form.recipeID" class="form-select mb-2">
            <option :value="undefined">Select recipe...</option>
            <option v-for="recipe in recipes" :key="recipe.id" :value="recipe.id">{{ recipe.name }}</option>
          </select>
        </div>
       </div>

      <!-- Country of Origin / Certification Information -->
       <div class="my-3 pb-3 border-bottom">
        <div class="row">
          <h5>Country of Origin & Certification Information</h5>
        </div>
        <div class="row mt-2">
          <div class="col-4">
            <label>Country of Origin:</label>
          </div>
          <div class="col-8">
            <select v-model="cOOType" class="form-select">
              <option value="unset">Select an Option...</option>
              <option value="australia">Australia</option>
              <option value="mixed">Mixed</option>
              <option value="imported">Imported</option>
            </select>
          </div>
        </div>
        <div class="row mt-3" v-if="form.cOO.type !== 'unset' && form.cOO.type !== 'australia'">
          <div class="col-4">
            <label v-if="form.cOO.type == 'imported'">Country:</label>
            <label v-else>Australian %:</label>
          </div>
          <div class="col-8">
            <input v-if="form.cOO.type=='imported'" v-model="listedCountryOfOrigin" placeholder="Country of Origin" class="form-control mb-2" />
            <input v-else type="number" v-model="listedAustralianPercent" placeholder="Australian%" class="form-control mb-2"/>
          </div>
        </div>
        <div class="row mt-2">
          <div class="col-4">
            <label>Pre-Market Clearance:</label>
          </div>
          <div class="col-8">
            <select v-model="listedPreMarketClearance" class="form-select">
              <option value="unset">Not GMO/Irradiated</option>
              <option value="gmo">Genetically Modified</option>
              <option value="irradiated">Irradiated</option>
            </select>
          </div>
        </div>
        <div v-for="claim in ingredientClaims" class="row mt-2">
          <div class="col-4">
            {{ claim.label }}:
          </div>
          <div class="col-8">
            <input type="checkbox" :value="claim.id" v-model="form.ingredientClaims"/>
          </div>
        </div>
       </div>

      <!-- Nutrients -->
      <div class="my-3 pb-4 border-bottom">
        <h5>Nutrient Values</h5>

        <!-- Show mandatory + active nutrients -->
        <div
          v-for="nutrient in sortedNutrients.filter(n =>
            n.mandatoryBase || activeNutrients.includes(n.id) || (n.parent && form.nutrientValues[n.parent])
          )"
          :key="nutrient.id"
          class="d-flex align-items-center mb-1"
        >
          <input
            v-model.number="form.nutrientValues[nutrient.id]"
            type="number"
            :placeholder="nutrient.label"
            class="form-control me-2"
            :disabled="!!isComposite"
          />
          <span class="me-2">{{ nutrient.unit }}</span>
          <small class="text-muted">{{ nutrient.label }}</small>
          <button
            v-if="!nutrient.mandatoryBase"
            class="btn btn-sm btn-danger ms-2"
            @click="removeNutrient(nutrient)"
          >
            X
          </button>
        </div>

        <!-- Dropdown to add optional nutrients -->
        <div class="d-flex mt-2">
          <select v-model="selectedNutrientToAdd" class="form-select me-2">
            <option disabled value="">Add Nutrient...</option>
            <option
              v-for="nutrient in availableOptionalNutrients"
              :key="nutrient.id"
              :value="nutrient.id"
            >
              {{ nutrient.label }}
            </option>
          </select>
          <button class="btn btn-outline-primary" @click="addSelectedNutrient">Add</button>
        </div>
      </div>

      <!-- Allergens -->
      <div class="my-3">
        <h5>Allergens</h5>
        <div v-for="allergen in allergens" :key="allergen.id" class="d-flex align-items-center mb-1">
          <div class="col-4">
            <span class="me-2">{{ allergen.label }}</span>
          </div>

          <!-- Included checkbox -->
          <div class="form-check me-2 col-4">
            <input
              class="form-check-input"
              type="checkbox"
              :id="`incl-${allergen.id}`"
              :value="allergen.id"
              v-model="form.allergenIDs"
            />
            <label class="form-check-label" :for="`incl-${allergen.id}`">Included</label>
          </div>

          <!-- Potential checkbox -->
          <div class="form-check col-4">
            <input
              class="form-check-input"
              type="checkbox"
              :id="`may-${allergen.id}`"
              :value="allergen.id"
              v-model="form.potentialAllergenIDs"
            />
            <label class="form-check-label" :for="`may-${allergen.id}`">May be Present</label>
          </div>
        </div>
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
import { reactive, ref, watch, computed } from "vue";
import { createDefaultCountryOfOrigin, createDefaultPreMarketClearance, type Ingredient } from "../config/types";
import { allergens } from "../config/allergens";
import { nutrientDefinitions, type NutrientDefinition } from "../config/nutrientDefinitions";
import { additives } from "../config/additives";
import { useRecipeStore } from "../stores/recipeStore";
import { calculateNutrition } from "../utils/nutritionEngine";
import type { CountryOfOrigin, PreMarketClearance } from "../config/types";
import { ingredientClaims } from "../config/claims";

// Props
interface Props { ingredient: Ingredient | null; }
const props = defineProps<Props>();
const emit = defineEmits(["close", "save"]);
const recipes = useRecipeStore().recipes

// Form state
const form = reactive<Ingredient & { nutrientValues: Record<string, number> }>({
  id: 0,
  name: "",
  additiveNumber: null,
  nutrientValues: {},
  allergenIDs: [],
  potentialAllergenIDs: [],
  recipeID: undefined,
  cOO: createDefaultCountryOfOrigin(),
  pMM: createDefaultPreMarketClearance(),
  ingredientClaims: []
});

// Track which optional nutrients are displayed
const activeNutrients = ref<string[]>([]);

// Have we selected that this is an additive?
const isAdditive = ref(false);
const formName = computed({
  get() {
    if (!isAdditive.value) return form.name;
    const match = additives.find(a => a.number === form.additiveNumber);
    return match ? match.name : "---";
  },
  set(val: string) {
    form.name = val;
  }
});

// Have we selected that this is a composite ingredient?
const isComposite = ref(false);

// Watch ingredient changes
watch(
  () => props.ingredient,
  (newVal) => {
    if (newVal) {
      Object.assign(form, newVal);
      activeNutrients.value = Object.keys(newVal.nutrientValues || {}).filter(
        (k) => !nutrientDefinitions.find(n => n.id === k)?.mandatoryBase
      );
      isComposite.value = newVal.recipeID !== undefined;
      isAdditive.value = newVal.additiveNumber !== null;
    } else {
      Object.assign(form, {
        id: 0,
        name: "",
        additiveNumber: null,
        nutrientValues: {},
        allergenIDs: [],
        potentialAllergenIDs: [],
        recipe: undefined,
      });
      activeNutrients.value = [];
    }
  },
  { immediate: true }
);

// Watch additive number and update form.name automatically
watch(
  () => form.additiveNumber,
  (num) => {
    if (isAdditive.value) {
      const match = additives.find(a => a.number === num);
      form.name = match ? match.name : "---";
    }
    else {
      form.additiveNumber = null;
    }
  },
  { immediate: true }
);

// Watch composite recipe and update form automatically
const recipe = computed(() => {
  let val = form.recipeID ? useRecipeStore().getRecipeById(form.recipeID) : null;
  return val;
});
const compositeNutrition = computed(() => {
  if (!recipe.value) return null;
  return calculateNutrition(recipe.value);
});
watch(
  () => form.recipeID,
  (recipeID) => {
    if (recipeID && compositeNutrition.value) {
      form.nutrientValues = {};
      compositeNutrition.value.forEach(n=>{
        form.nutrientValues[n.id] = Number(n.value);
      });
    }
    else {
      form.recipeID = undefined;
    }
  },
  {immediate:true}
);

// Nutrient helpers
const sortedNutrients = computed(() => [...nutrientDefinitions].sort((a, b) => a.order - b.order));
const selectedNutrientToAdd = ref("");
const availableOptionalNutrients = computed(() =>
  sortedNutrients.value.filter(n => !form.nutrientValues[n.id] && !n.mandatoryBase)
);

const addSelectedNutrient = () => {
  if (!selectedNutrientToAdd.value) return;
  const nutrientToAdd = nutrientDefinitions.find(n => n.id === selectedNutrientToAdd.value);
  if (!nutrientToAdd) return;

  const addRecursively = (n: NutrientDefinition) => {
    if (!activeNutrients.value.includes(n.id)) {
      activeNutrients.value.push(n.id);
      form.nutrientValues[n.id] = 0;
    }
    sortedNutrients.value.filter(c => c.parent === n.id).forEach(addRecursively);
  };

  addRecursively(nutrientToAdd);
  selectedNutrientToAdd.value = "";
};

const removeNutrient = (nutrient: NutrientDefinition) => {
  activeNutrients.value = activeNutrients.value.filter(id => id !== nutrient.id);
  delete form.nutrientValues[nutrient.id];
  sortedNutrients.value
    .filter(c => c.parent === nutrient.id)
    .forEach(c => {
      activeNutrients.value = activeNutrients.value.filter(id => id !== c.id);
      delete form.nutrientValues[c.id];
    });
};

// Change Country of Origin or Australian%
const cOOType = computed({
  get: () => form.cOO.type,
  set: (val: CountryOfOrigin["type"]) => {
    switch (val) {
      case "australia":
        form.cOO = { type: "australia" };
        break;
      case "mixed":
        form.cOO = { type: "mixed", australianPercentage: 0 };
        break;
      case "imported":
        form.cOO = { type: "imported", country: "" };
        break;
      default:
        form.cOO = { type: "unset" };
    }
  }
});
const listedCountryOfOrigin = computed({
  get() {
    return form.cOO.type === "imported" ? form.cOO.country : "";
  },
  set(val: string) {
    if (form.cOO.type === "imported") {
      form.cOO = { type: "imported", country: val };
    }
  }
});
const listedAustralianPercent = computed({
  get() {
    return form.cOO.type === "mixed"
      ? form.cOO.australianPercentage
      : 0;
  },
  set(val: number) {
    if (form.cOO.type === "mixed") {
      form.cOO = {
        type: "mixed",
        australianPercentage: val
      };
    }
  }
});
const listedPreMarketClearance = computed({
  get() {
    return form.pMM.type;
  },
  set(val:string) {
    if (val === "unset") form.pMM = {type:"unset"};
    else if (val === "gmo") form.pMM = {type:"gmo", label:"(genetically modified)"}
    else form.pMM = {type:"irradiated", label:"(treated with radiation)"}
  }
});

// Save
const save = () => emit("save", { ...form });
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0; /* top:0; right:0; bottom:0; left:0 */
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000; /* increase so it overlays the navbar */
}

.modal-card {
  background: white;
  padding: 1.5rem;
  border-radius: 10px;
  width: 550px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 5px 15px rgba(0,0,0,0.3); /* optional: subtle shadow */
}
</style>