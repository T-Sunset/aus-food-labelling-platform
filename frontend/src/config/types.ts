// types.ts
export interface Ingredient {
    id: number;
    name: string;
    additiveNumber?: string | null;
    nutrientValues?: Record<string, number>;
    allergenIDs?: string[];
    potentialAllergenIDs?: string[];
    recipeID?: number; // for composite ingredients
    cOO: CountryOfOrigin;
    pMM: PreMarketClearance;
    ingredientClaims: string[];
}

export type CountryOfOrigin = 
| { type:"unset" }
| { type:"australia" }
| { type:"imported"; country:string }
| { type: "mixed"; australianPercentage: number }

export type PreMarketClearance = 
| { type:"unset" }
| { type:"gmo"; label:"(genetically modified)" }
| {type:"irradiated"; label:"(treated with radiation)" }

export function createDefaultCountryOfOrigin(): CountryOfOrigin {
    return {type:"unset"};
}

export function createDefaultPreMarketClearance(): PreMarketClearance {
    return {type:"unset"}
}

export interface RecipeIngredient {
    ingredientID: number;
    quantity: number; // grams used in this recipe
    category: string | null;
    characterising?: boolean;
    categoryCharacterising?: boolean;
}

export interface Recipe {
    id: number;
    name: string;
    ingredients: RecipeIngredient[];
}

export type ClaimContext = {
  nutritionPer100g: { id: string; value: number }[]
  ingredients: Ingredient[]
}
export type ClaimResult = {
  id: string
  allowed: boolean
  reasons: string[]
}

export interface Product {
    id: number;
    name: string;
    description: string;
    recipeID?: number;
    servingSize: number;
    servingsPerPack: number;
    claimFlags: string[];
    labelPreferences?: {
        showDI: boolean
        showAustralianPercent: boolean
        showCountryOfOriginStatement: boolean
    }
}