<template>
  <div class="modal-backdrop">
    <div class="modal-card">
      <h3 class="border-bottom mb-3">{{ product?.id ? "Edit" : "Add" }} Product</h3>

      <!-- Name & Description -->
      <input v-model="form.name" placeholder="Product Name" class="form-control mb-2" />
      <textarea v-model="form.description" placeholder="Description" class="form-control mb-2" />

      <!-- Recipe -->
      <select v-model="form.recipeID" class="form-select mb-2">
        <option :value="undefined">Select recipe...</option>
        <option v-for="recipe in recipes" :key="recipe.id" :value="recipe.id">{{ recipe.name }}</option>
      </select>

      <!-- Serving Info -->
      <div class="row mb-2">
        <div class="col">
          <input type="number" v-model.number="form.servingSize" placeholder="Serving Size (g)" class="form-control" />
        </div>
        <div class="col">
          <input type="number" v-model.number="form.servingsPerPack" placeholder="Servings per Pack" class="form-control" />
        </div>
        <div class="col mt-1">
          <label>Recipe Total Weight: {{ packWeight }}g</label>
        </div>
      </div>

      <!-- Claims -->
      <div class="border-top pt-3 mt-3">
        <h5>Claims</h5>
        <div class="mb-3">
          <div
            v-for="claim in localClaims"
            :key="claim.id"
            class="form-check mb-2"
          >
            <input
              class="form-check-input"
              type="checkbox"
              :id="claim.id"
              :checked="form.claimFlags.includes(claim.id)"
              :disabled="claimResultsMap[claim.id] && !claimResultsMap[claim.id].allowed"
              @change="toggleClaim(claim.id)"
            />
            <label class="form-check-label" :for="claim.id">
              {{ claim.label }}
            </label>

            <!-- Validation message for this specific claim -->
            <small
              v-if="claimResultsMap[claim.id] && !claimResultsMap[claim.id].allowed"
              class="text-danger d-block"
            >
              {{ claimResultsMap[claim.id].reasons.join(", ") }}
            </small>
          </div>
        </div>
      </div>

      <!-- Label Edits & Preferences -->
      <div class="border-top pt-3 mt-3">
        <h5>Label Preferences</h5>

        <div class="form-check">
          <input
            class="form-check-input"
            type="checkbox"
            id="showDI"
            v-model="form.labelPreferences!.showDI"
          />
          <label class="form-check-label" for="showDI">
            Show %DI column in Nutrition Panel
          </label>
        </div>

        <div class="form-check">
          <input
            class="form-check-input"
            type="checkbox"
            id="showAusPercent"
            v-model="form.labelPreferences!.showAustralianPercent"
          />
          <label class="form-check-label" for="showAusPercent">
            Show Australian Ingredient Percentage
          </label>
        </div>

        <div class="form-check">
          <input
            class="form-check-input"
            type="checkbox"
            id="showCountry"
            v-model="form.labelPreferences!.showCountryOfOriginStatement"
          />
          <label class="form-check-label" for="showCountry">
            Show Country of Origin Statement
          </label>
        </div>
      </div>

      <!-- Label Preview -->
      <div class="border-top pt-3 mt-3">
        <h5>Label Preview</h5>
        <div class="border p-3 bg-light rounded">
          <strong>{{ form.name || "Product Name" }}</strong>
          <p class="mb-1">{{ form.description }}</p>
          <p class="mb-1"><strong>Serving Size:</strong> {{ form.servingSize }}g</p>
          <p class="mb-1"><strong>Servings per Pack:</strong> {{ form.servingsPerPack }}</p>
          <p class="mb-0"><strong>Net Weight:</strong> {{ packWeight }}g</p>

          <!-- Ingredients -->
          <br /><p class="mb-0"><strong>Ingredients:</strong> <span v-html="ingredientDeclaration"></span></p>
          <!-- Allergens -->
          <br /><span v-html="allergenList"></span>

          <!-- NIP Table -->
          <table border="1" class="mx-auto mt-2">
            <thead>
              <tr>
                <th>Average Quantity</th>
                <th>Per Serving</th>
                <th>Per 100g</th>
                <th v-if="form.labelPreferences?.showDI">%DI*</th>
              </tr>
            </thead>
            <tr v-for="n in nutritionPerServing" :key="n.id">
              <td :style="{ paddingLeft: n.parent ? '20px' : '0px' }">{{ n.label }}</td>
              <td>{{ formatNutrientValue(n.perServing, n.id) }} {{ n.unit }}</td>
              <td>{{ formatNutrientValue(n.value, n.id) }} {{ n.unit }}</td>
              <td v-if="form.labelPreferences?.showDI">{{ nutritionWithDI.find(a=>a.id === n.id) ?? "-" }}%</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Buttons -->
      <div class="d-flex justify-content-end mt-3">
        <button class="btn btn-secondary me-2" @click="$emit('close')">Cancel</button>
        <button class="btn btn-primary" @click="save">Save</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch, computed } from "vue";
import { useRecipeStore } from "../stores/recipeStore";
import { useIngredientStore } from "../stores/ingredientStore";
import { claims } from "../config/claims";
import { allergens } from "../config/allergens";
import { nutrientDefinitions, dailyIntakeReference } from "../config/nutrientDefinitions";
import type { Product, Recipe, RecipeIngredient, Ingredient } from "../config/types";
import { calculateNutrition } from "../utils/nutritionEngine";
import { roundToSignificantFiguresHalfDown, evaluateClaims } from "../utils/ruleEngine";
import { prescribedCategories } from "../config/prescribedCategories";

interface Props { product: Product | null; }
const props = defineProps<Props>();
const emit = defineEmits(["close","save"]);

const recipeStore = useRecipeStore();
const ingredientStore = useIngredientStore();
const recipes = recipeStore.recipes;
const localClaims = claims;

const form = reactive<Product>({
  id: 0,
  name: "",
  description: "",
  recipeID: undefined,
  servingSize: 0,
  servingsPerPack: 0,
  claimFlags: [],
  labelPreferences: {
    showDI:false,
    showAustralianPercent:false,
    showCountryOfOriginStatement:false
  }
});

// Load product into form
watch(() => props.product, p => {
  if (p) {
    Object.assign(form, {
      ...p,
      labelPreferences: {
        showDI: false,
        showAustralianPercent: false,
        showCountryOfOriginStatement: false,
        ...p.labelPreferences
      }
    });
  } else {
    Object.assign(form, {
      id:0,
      name:"",
      description:"",
      recipeID:undefined,
      servingSize:0,
      servingsPerPack:0,
      claimFlags:[],
      labelPreferences:{
        showDI:false,
        showAustralianPercent:false,
        showCountryOfOriginStatement:false
      }
    });
  }
}, { immediate:true });

// Save
const save = () => emit("save", { ...form });

// Computed: selected recipe
const selectedRecipe = computed<Recipe | undefined>(() =>
  recipes.find(r => r.id === form.recipeID)
);

// Pack weight
const packWeight = computed(() => form.servingSize * form.servingsPerPack);

// Compute nutrition per 100g
const nutritionPer100g = computed(() => {
  if(!selectedRecipe.value) return [];
  return calculateNutrition(selectedRecipe.value, form.claimFlags) || [];
});

// Nutrition per serving
const nutritionPerServing = computed(() => {
  const multiplier = form.servingSize / 100;
  return nutritionPer100g.value.map(n => ({ ...n, perServing: (parseFloat(n.value) * multiplier).toFixed(2) }));
});

// Format nutrient value
const formatNutrientValue = (value:string, id:string) => {
  const nutrient = nutrientDefinitions.find(n=>n.id===id);
  if(!nutrient) return value;
  const num = parseFloat(value);
  if(isNaN(num)) return "0";
  const rounded = roundToSignificantFiguresHalfDown(num,3);
  if(nutrient.displayRules?.lessThan !== undefined && rounded < nutrient.displayRules.lessThan) return nutrient.displayRules.lessThanLabel;
  return rounded;
};

const nutritionWithDI = computed(() => {
  if (!form.labelPreferences?.showDI) return nutritionPerServing.value;

  return nutritionPerServing.value.map(n => {
    const ref = dailyIntakeReference[n.id];
    const percentDI = ref
      ? Math.round((parseFloat(n.perServing) / ref) * 100)
      : null;

    return {
      ...n,
      percentDI
    };
  });
});

// --- Helper to fetch ingredient object by ID ---
const getIngredient = (id:number):Ingredient|undefined => ingredientStore.getIngredientById(id);

// --- Compute ingredient list for declaration ---
type GroupedIngredient = {
  type:string,
  label:string,
  ingredients:RecipeIngredient[],
  total:number,
  characterising:boolean
}

const ingredientList = computed(() => {
  const singles:RecipeIngredient[] = [];
  const groups:Record<string,GroupedIngredient> = {};

  selectedRecipe.value?.ingredients.forEach(ri => {
    if(!ri.category) {
      singles.push(ri);
    } else {
      // Ensure group exists
      if(!groups[ri.category]) {
        groups[ri.category] = {
          type: "category",
          label:ri.category,
          ingredients: [],
          total: 0,
          characterising: prescribedCategories.some(c => c.id === ri.category && ri.categoryCharacterising)
        };
      }
      groups[ri.category]!.ingredients.push(ri);
      groups[ri.category]!.total += ri.quantity ?? 0;
    }
  });

  return [
    ...singles.map(i => ({ type: "ingredient", ...i })),
    ...Object.values(groups)
  ].sort((a, b) => {
    const aValue = a.type === "category" ? (a as GroupedIngredient).total : (a as RecipeIngredient).quantity ?? 0;
    const bValue = b.type === "category" ? (b as GroupedIngredient).total : (b as RecipeIngredient).quantity ?? 0;
    return bValue - aValue; // largest first
  });
});

// --- Check if ingredient contains bold allergen ---
const ingredientHasBoldAllergen = (ri:RecipeIngredient) => {
  const ing = getIngredient(ri.ingredientID);
  return ing?.allergenIDs?.some(id => allergens.find(a => a.id === id && a.boldOnLabel)) ?? false;
};

// --- Check if category has bold allergen ---
const categoryHasBoldAllergen = (cat?:GroupedIngredient) => cat?.ingredients?.some(ingredientHasBoldAllergen) ?? false;

// --- Calculate percentage of total weight ---
const calculatePercentage = (weight:number) => {
  const total = selectedRecipe.value?.ingredients.reduce((s,r)=>s+(r.quantity??0),0) ?? 0;
  return total ? Math.round((weight/total)*100) : 0;
};

// --- Format single ingredient ---
const formatSingleIngredient = (ri:RecipeIngredient) => {
  const ing = getIngredient(ri.ingredientID);
  const name = ing?.name?.toLowerCase() ?? "unknown";
  const bold = ingredientHasBoldAllergen(ri) ? `<strong>${name}</strong>` : name;
  const percent = ri.characterising ? `(${calculatePercentage(ri.quantity ?? 0)}%)` : "";
  return `${bold}${percent}`;
};

// --- Format composite ingredient ---
const formatCompositeIngredient = (ri: RecipeIngredient): string => {
  const ing = getIngredient(ri.ingredientID);

  if (!ing) return "unknown";

  const name = ing.name?.toLowerCase() ?? "unknown";
  const bold = ingredientHasBoldAllergen(ri)
    ? `<strong>${name}</strong>`
    : name;

  const percent = ri.characterising
    ? `(${calculatePercentage(ri.quantity ?? 0)}%)`
    : "";

  // If no recipe attached → treat as single ingredient
  if (!ing.recipeID) {
    return `${bold}${percent}`;
  }

  const recipe = recipes.find(r => r.id === ing.recipeID);

  if (!recipe?.ingredients?.length) {
    return `${bold}${percent}`;
  }

  // --- Sort sub-ingredients by weight (descending)
  const sortedSubs = [...recipe.ingredients].sort(
    (a, b) => (b.quantity ?? 0) - (a.quantity ?? 0)
  );

  const subList = sortedSubs
    .map(subRi => {
      const subIng = getIngredient(subRi.ingredientID);
      // Recursively handle nested composites
      return subIng?.recipeID
        ? formatCompositeIngredient(subRi)
        : formatSingleIngredient(subRi);
    })
    .join(", ");

  return `${bold}${percent} {${subList}}`;
};

// --- Format category safely ---
const formatCategory = (cat?:GroupedIngredient) => {
  if(!cat) return "unknown";
  const bold = categoryHasBoldAllergen(cat) ? `<strong>${cat?.label?.toLowerCase() ?? cat?.label}</strong>` : (cat.label ?? "unknown");
  const percent = cat.characterising ? `(${calculatePercentage(cat.total)}%)` : "";
  const subs = cat.ingredients?.map(i => formatSingleIngredient(i)).join(", ") ?? "";
  return `${bold}${percent} [${subs}]`;
};

// --- Ingredient declaration string ---
const ingredientDeclaration = computed(() =>
  ingredientList.value
    .map(i => {
      if (i.type === "ingredient") {
        const ri = i as RecipeIngredient;
        const ing = getIngredient(ri.ingredientID);

        return ing?.recipeID
          ? formatCompositeIngredient(ri)
          : formatSingleIngredient(ri);
      }

      return formatCategory(i as GroupedIngredient);
    })
    .join(", ")
);

// --- Allergen Collector Helper
const collectAllergens = (
  ri: RecipeIngredient,
  contains: Set<string>,
  mayContain: Set<string>,
  visited = new Set<string>()
) => {
  const ing = getIngredient(ri.ingredientID);
  if (!ing) return;

  // Prevent circular recursion
  if (visited.has(ing.id.toString())) return;
  visited.add(ing.id.toString());

  // Add direct allergens
  ing.allergenIDs?.forEach(id => contains.add(id));
  ing.potentialAllergenIDs?.forEach(id => mayContain.add(id));

  // Recurse into composite recipe
  if (ing.recipeID) {
    const recipe = recipes.find(r => r.id === ing.recipeID);
    recipe?.ingredients?.forEach(subRi => {
      collectAllergens(subRi, contains, mayContain, visited);
    });
  }
};

// --- Allergen list string ---
const allergenList = computed(() => {
  if (!selectedRecipe.value?.ingredients?.length) return "";

  const contains = new Set<string>();
  const mayContain = new Set<string>();

  selectedRecipe.value.ingredients.forEach(ri => {
    collectAllergens(ri, contains, mayContain);
  });

  const containsLabels = allergens
    .filter(a => contains.has(a.id))
    .map(a => a.label);

  const mayLabels = allergens
    .filter(a => mayContain.has(a.id))
    .map(a => a.label);

  let html = "";

  if (containsLabels.length > 0) {
    html += `<p><strong>CONTAINS: ${containsLabels.join(", ")}</strong></p>`;
  }

  if (mayLabels.length > 0) {
    html += `<p><strong>MAY BE PRESENT: ${mayLabels.join(", ")}</strong></p>`;
  }

  return html;
});

// --- Claims and Claim Allowance
const claimResults = computed(() => {
  const ingredients: Ingredient[] = (
    selectedRecipe.value?.ingredients ?? []
  )
    .map(ri => getIngredient(ri.ingredientID))
    .filter((i): i is Ingredient => Boolean(i));

  return evaluateClaims(form, {
    nutritionPer100g: nutritionPer100g.value.map(n => ({
      id: n.id,
      value: parseFloat(n.value)
    })),
    ingredients
  });
});
const claimResultsMap = computed(() => {
  const map: Record<string, any> = {}
  claimResults.value.forEach(r => {
    map[r.id] = r
  })
  return map
})
const toggleClaim = (id: string) => {
  const result = claimResults.value.find(r => r.id === id);
  if (!result?.allowed) return; // block illegal claim

  const idx = form.claimFlags.indexOf(id);
  if (idx === -1) form.claimFlags.push(id);
  else form.claimFlags.splice(idx, 1);
};
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
</style>