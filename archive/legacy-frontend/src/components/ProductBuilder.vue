<!-- ProductBuilder.vue.
 Written by Daniel Chadderton.
 Last updated on 20/02/2026.
 
 This component will handle the actual building of a product. -->
<script setup lang="js">
import {reactive, computed, watch} from "vue";
import {nutrientDefinitions} from "../config/nutrientDefinitions";
import { calculateNutrition } from "../utils/nutritionEngine";
import {claims} from "../config/claims.js"
import {allergens} from "../config/allergens"
import {evaluateClaims, roundToSignificantFiguresHalfDown} from "../utils/ruleEngine"
import {prescribedCategories} from "../config/prescribedCategories"
import {additives} from "../config/additives"

// Product (Reactive State)
const product = reactive({
    name: "",
    ingredients: [],
    claimFlags: [], // 
    servingSize: 30, // Default in grams
    servingsPerPack: 1
});

// Add a New Ingredient
function addIngredient() {
    product.ingredients.push({
        id: Date.now(),
        name: "",
        additiveNumber:null, // If this is an additive, what's it's ID number?
        quantity: 0,
        nutrientValues: {}, // K = Nutrient IDs, V = amount (grams, kj, etc)
        allergenIDs: [],
        potentialAllergenIDs: [],
        characterising: false,
        category: null, // "Meat", "Fish", etc.
        displayAsNumber: false
    });
}

// Remove an Ingredient
function removeIngredient(id) {
    product.ingredients = product.ingredients.filter(i => i.id !== id);
}

// Ensure category & additive classification is always watching
watch(
    () => product.ingredients.map(i=>[i.additiveNumber, i.category]),
    () => {
        product.ingredients.forEach(ing => {
            if (isAdditiveCategory(ing.category)) {
                const additive = additives.find(a=>a.number === String(ing.additiveNumber));
                ing.name = additive ? additive.name : "";
            }
        });
    },
    {deep:true}
);

// Total Weight
const totalWeight = computed(() => 
    product.ingredients.reduce((sum, ing) => sum + Number(ing.quantity), 0)
);

// Calculated Nutrition per 100g
const nutritionPer100g = computed(() =>
    calculateNutrition(product.ingredients, product.claimFlags)
);

// Calculated nutrition per serving
const nutritionPerServing = computed(() => {
    if (!nutritionPer100g.value?.length) return [];

    const multiplier = product.servingSize / 100;

    return nutritionPer100g.value.map(n => ({
        ...n,
        perServing: (parseFloat(n.value) * multiplier).toFixed(2)
    }));
});

// Calculate percentage of one weight against the total weight
function calculatePercentage(weight) {
    if (!totalWeight.value) return 0;

    const percent = (weight / totalWeight.value) * 100;

    return Math.round(percent); // 1 Decimal place
}

// Update category flags as which ones are characterising for this product
const categoryFlags = reactive(
    prescribedCategories.reduce((acc, cat) => {
        acc[cat.id] = false;
        return acc;
    })
);

// Is this category an additive category?
function isAdditiveCategory(categoryID) {
    if (categoryID == undefined) return false;
    const cat = prescribedCategories.find(c => c.id === categoryID);
    return cat?.isAdditive;
}

// Ingredient List, sorted by weight
const ingredientList = computed(() => {
    // Split definitions between single ingredients and clustered ingredients
    const groups = {};
    const singles = [];

    // Go through ingredients
    product.ingredients.forEach(ing => {
        if (!ing.category) {singles.push(ing);} // If it doesn't have a category, add it as is
        else { // If it is in a category...
            if (!groups[ing.category]) { // Have we not encountered this category before? Add it as empty
                groups[ing.category] = {
                    type:"category",
                    id:ing.category,
                    ingredients:[],
                    totalQuantity:0,
                    characterising:categoryFlags[ing.category]
                };
            }

            // Now it exists, add current ingredient to current ingredient category
            groups[ing.category].ingredients.push(ing);
            groups[ing.category].totalQuantity += ing.quantity; // Add ingredient amount to total of this category
        }
    });

    // Bring groups and singles together to one dict and sort by weight
    return [
        ...singles.map(i=>({type:"ingredient", ...i})),
        ...Object.values(groups)
    ].sort((a,b) => {
        const qtyA = a.type === "category" ? a.totalQuantity : a.quantity;
        const qtyB = b.type === "category" ? b.totalQuantity : b.quantity;
        return qtyB-qtyA;
    });
});

// Does this ingredient contain at least one bold allergen?
function ingredientHasBoldAllergen(ingredient) {
    if (!ingredient.allergenIDs || !ingredient.allergenIDs.length) return false;
    return ingredient.allergenIDs.some(id=> {
        const allergen = allergens.find(a=>a.id === id);
        return allergen && allergen.boldOnLabel;
    });
}
//Does this CATEGORY contain an ingredient with at least one bold allergen?
function categoryHasBoldAllergen(category) {
    return category.ingredients.some(ing => {
        return ingredientHasBoldAllergen(ing)
    });
}

// Deal with validation warnings
const validationWarnings = computed(() => {
    if (!product || !product.ingredients) return [];
    if (!nutritionPer100g.value || !nutritionPer100g.value.length) return [];
    return validateClaims(product, nutritionPer100g.value);
});

// Format an incoming ingredient's name--is it the name to display (lowercase it) or an additive number?
function formatIngredientName(ing, index) {
    if (!ing) return "";
    else if (ing.displayAsNumber) return ing.additiveNumber;
    else return formatName(ing.name);
}

// Format general names to be lowercased
function formatName(name, index) {
  if (!name) return "";

  //return index === 0
    //? name
    //: name.toLowerCase();

    return String(name).toLowerCase();
}

// Format an incoming nutrient's value to it's proper formatted style to view in the NIP
function formatNutrientValue(value, nutrientID) {
    // Get nutrient
    const nutrient = nutrientDefinitions.find(n=>n.id === nutrientID);
    if (!nutrient) return value; // No known nutrient given

    // Parse value to a floating point num
    const num = parseFloat(value);
    if (isNaN(num)) return "0"; // Failsafe if the given value wasn't able to be parsed to a number

    // Apply universal significant figure rule
    const rounded = roundToSignificantFiguresHalfDown(num, 3);

    // Apply additional nutrient specific rules as required
    if (nutrient.displayRules?.lessThan !== undefined) { // Ensure there ARE rules for this nutrient
        if (rounded < nutrient.displayRules.lessThan) { // LESS THAN RULE
            return nutrient.displayRules.lessThanLabel;
        }
        // OTHER RULES HERE
    }

    // Otherwise, return as normal
    return rounded;
}

// Format allergens into a string
const containsAllergens = computed(() => {
    const found = new Set();

    product.ingredients.forEach(ing => {
        if (ing.allergenIDs?.length) {
            ing.allergenIDs.forEach(id=>found.add(id));
        }
    });

    // Map IDs to allergen labels
    return [...found].map(id=> {
        const allergen = allergens.find(a=>a.id === id);
        return allergen?.label || id;
    });
});
const potentialAllergens = computed(() => {
    const found = new Set();

    product.ingredients.forEach(ing => {
        if (ing.potentialAllergenIDs?.length) {
            ing.potentialAllergenIDs.forEach(id=>found.add(id));
        }
    });

    // Map IDs to allergen labels
    return [...found].map(id=> {
        const allergen = allergens.find(a=>a.id === id);
        return allergen?.label || id;
    });
});

</script>

<template>
    <div>
        <h1>Product Builder</h1>

        <label>
            Product Name:
            <input v-model="product.name"/>
        </label>

        <hr/>
        <h2>Claims</h2>
        <div v-for="claim in claims" :key="claim.id">
            <label>
                <input type="checkbox"
                    v-model="product.claimFlags"
                    :value="claim.id"/>
                {{ claim.label }}
            </label>
        </div><br/>

        <label>
            Serving size (g):
            <input type="number" v-model.number="product.servingSize" min="1" />
        </label><br/>
        <label>
            Servings per Package:
            <input type="number" v-model.number="product.servingsPerPack" min="1"/> 
        </label>
        <hr/>

        <h2>Ingredients</h2>
        <button @click="addIngredient">Add Ingredient</button>

        <div 
            v-for="ing in product.ingredients"
            :key="ing.id"
            style="margin-top:20px;border:1px solid #ccc; padding:10px">
            
            <label v-if="!isAdditiveCategory(ing.category)">
                Ingredient Name:
                <input v-model="ing.name"/>
            </label>
            <label v-else>
                Additive Number:
                <input v-model="ing.additiveNumber"/>
                <span v-if="ing.name">({{ ing.name }})</span>
                <input type="checkbox" v-model="ing.displayAsNumber">
                Display number in ingredient declaration?
            </label>
            <select v-model="ing.category">
                <option :value="null">None</option>
                <option
                    v-for="cat in prescribedCategories"
                    :key="cat.id"
                    :value="cat.id">
                {{ cat.label }}</option>
            </select>
            <label v-if="ing.category">
                <input type="checkbox" v-model="categoryFlags[ing.category]" />
                CATEGORY depicted on pack (graphic/text)?
            </label>
            <br/><label>
                Quantity (g):
                <input type="number" v-model.number="ing.quantity"/>
            </label>
            <label>
                <input type="checkbox" v-model="ing.characterising"/>
                PRODUCT depicted on pack (graphic/text)?
            </label>

            <h4>Nutrition (per 100g)</h4>
            <div v-for="def in nutrientDefinitions" :key="def.id" :style="{ marginLeft: def.parent ? '20px' : '0px'}">
                <label>
                    {{ def.label }} ({{ def.unit }} per 100g):
                    <input type="number" v-model.number="ing.nutrientValues[def.id]"/>
                </label>
            </div>

            <h4>Allergens</h4>
            <div v-for="allergen in allergens" :key="allergen.id">
                <label>
                    <input type="checkbox" :value="allergen.id" v-model="ing.allergenIDs"/>
                    {{ allergen.label }}
                </label>
            </div>
            <h4>Potential Contaminants</h4>
            <div v-for="allergen in allergens" :key="allergen.id">
                <label>
                    <input type="checkbox" :value="allergen.id" v-model="ing.potentialAllergenIDs"/>
                    {{ allergen.label }}
                </label>
            </div>

            <br/>
            <button @click="removeIngredient(ing.id)">Remove</button>
        </div>
    
        <h2>Generated Label</h2>
        <p><strong>Total Weight:</strong> {{ totalWeight }} g</p>
        <p><strong>Serving Size:</strong> {{ product.servingSize }} g<br/>
        <strong>Servings per Package:</strong> {{ product.servingsPerPack }}</p>
        <p>
            <strong>Ingredients: </strong>
            <span v-for="(item, index) in ingredientList" :key="item.id">
                <!-- Single Ingredient -->
                 <template v-if="item.type === 'ingredient'">
                    <span :style="{fontWeight: ingredientHasBoldAllergen(item) ? 'bold' : 'normal'}">
                        {{ formatIngredientName(item, index) }}
                        <span v-if="item.characterising">({{ calculatePercentage(item.quantity) }}%)</span>
                    </span>
                 </template>

                 <!-- Ingredient Category -->
                  <template v-else>
                    <span :style="{fontWeight:categoryHasBoldAllergen(item) ? 'bold' : 'normal'}">
                        {{ formatName(item.id, index) }}
                        <span v-if="item.characterising">({{ calculatePercentage(item.totalQuantity) }}%)</span>

                        <!-- Go through each sub-ingredient -->
                         [
                            <span v-for="(sub,i) in item.ingredients" :key="sub.id">
                                <span :style="{fontWeight:ingredientHasBoldAllergen(sub) ? 'bold':'normal'}">
                                    {{formatIngredientName(sub, i) }}
                                    <span v-if="sub.characterising">
                                        ({{ calculatePercentage(sub.quantity) }}%)
                                    </span>
                                </span>
                                <span v-if="i < item.ingredients.length - 1">,</span>
                            </span>
                         ]
                    </span>
                  </template>
                  <span v-if="index < ingredientList.length - 1">,</span>
            </span>
        </p>
        <div v-if="containsAllergens.length">
        <strong>Contains: {{ containsAllergens.join(", ") }}.</strong>
        </div>

        <div v-if="potentialAllergens.length">
        <strong>May be present: {{ potentialAllergens.join(", ") }}.</strong>
        </div>

        <table border="1">
            <thead>
                <tr>
                    <th>Average Quantity</th>
                    <th>Per Serving</th>
                    <th>Per 100g</th>
                </tr>
            </thead>
            <tr v-for="n in nutritionPerServing" :key="n.id">
                <td :style="{ paddingLeft: n.parent ? '20px' : '0px'}">{{ n.label }}</td>
                <td>{{ formatNutrientValue(n.perServing, n.id) }} {{ n.unit }}</td>
                <td>{{ formatNutrientValue(n.value, n.id) }} {{ n.unit }}</td>
            </tr>
        </table>

        <div v-if="validationWarnings.length">
        <h3>Validation Warnings</h3>
        <ul>
            <li v-for="(w, i) in validationWarnings" :key="i">{{ w }}</li>
        </ul>
        </div>
    </div>
</template>