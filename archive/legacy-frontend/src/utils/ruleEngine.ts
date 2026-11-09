import { claims } from "../config/claims";
import type { Product, ClaimContext, ClaimResult } from "../config/types";

export function evaluateClaims(
  product: Product,
  context: ClaimContext
): ClaimResult[] {
  return claims.map(claim => {
    const reasons: string[] = [];

    // --- Nutrient Maximums ---
    Object.entries(claim.maxThresholds).forEach(([nutrientId, max]) => {
      const nutrient = context.nutritionPer100g.find(n => n.id === nutrientId);
      if (!nutrient) return;

      if (nutrient.value > max) {
        reasons.push(
          `${nutrientId} exceeds maximum (${nutrient.value} > ${max})`
        );
      }
    });

    // --- Nutrient Minimums ---
    Object.entries(claim.minThresholds).forEach(([nutrientId, min]) => {
      const nutrient = context.nutritionPer100g.find(n => n.id === nutrientId);
      if (!nutrient) return;

      if (nutrient.value < Number(min)) {
        reasons.push(
          `${nutrientId} below minimum (${nutrient.value} < ${min})`
        );
      }
    });

    // --- Required Ingredient-Level Claims ---
    if (claim.hasRequiredIngredientClaim) {
      const missing = context.ingredients.some(
        ing => !ing.ingredientClaims?.includes(claim.id)
      );

      if (missing) {
        reasons.push(
          `Not all ingredients contain required "${claim.id}" certification`
        );
      }
    }

    return {
      id: claim.id,
      allowed: reasons.length === 0,
      reasons
    };
  });
}

export function roundToSignificantFiguresHalfDown(value: number, sigFigs = 3) {
    if (value === 0) return 0;

    const abs = Math.abs(value);
    const multiplier = Math.pow(
        10,
        sigFigs - Math.floor(Math.log10(abs)) - 1
    );

    const shifted = abs * multiplier;

    // Half-down logic
    const rounded =
        Math.floor(shifted + 0.4999999999);

    const result = rounded / multiplier;

    return value < 0 ? -result : result;
}