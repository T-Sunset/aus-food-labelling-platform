// Ingredient-Level Claims
export const ingredientClaims = [
    {
        id: "halal",
        label: "Halal",
        requiredFor: "halal"
    },
    {
        id: "organic",
        label: "Organic",
        requiredFor: "organic"
    }
];

// Regulatory food claims
export const claims = [
    {
        id: "lowFat",
        label: "Low Fat",
        minThresholds: {},
        maxThresholds: {fat: 3, saturatedFat: 1.5}, // g per 100g
        hasRequiredIngredientClaim: false
    },
    {
        id: "lowSugar",
        label: "Low Sugar",
        minThresholds: {},
        maxThresholds: {sugars: 5}, // g per 100g
        hasRequiredIngredientClaim: false
    },
    {
        id: "lowSodium",
        label: "Low Sodium",
        minThresholds: {},
        maxThresholds: {sodium: 120}, // g per 100g
        hasRequiredIngredientClaim: false
    },
    {
        id: "glutenFree",
        label: "Gluten Free",
        minThresholds: {},
        maxThresholds: {}, // g per 100g
        hasRequiredIngredientClaim: false
    },
    {
        id: "halal",
        label: "Halal",
        minThresholds: {},
        maxThresholds: {}, // g per 100g
        hasRequiredIngredientClaim: true
    },
    {
        id: "organic",
        label: "Organic",
        minThresholds: {},
        maxThresholds: {}, // g per 100g
        hasRequiredIngredientClaim: true
    }
    // ...expandable list later
];