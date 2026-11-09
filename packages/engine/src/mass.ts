import type {
  ExpandedIngredient,
  IngoingIngredientPercentage,
  MassQuantity,
  MassUnit,
} from '@aus-food/domain';
import {
  divideDecimals,
  isNegativeDecimal,
  multiplyDecimals,
  normalizeDecimal,
  sumDecimals,
} from './decimal.js';

const GRAMS_PER_UNIT: Readonly<Record<MassUnit, string>> = {
  mg: '0.001',
  g: '1',
  kg: '1000',
};

function massInGrams(quantity: MassQuantity): string {
  const value = normalizeDecimal(quantity.value);
  if (isNegativeDecimal(value)) {
    throw new RangeError('Mass cannot be negative');
  }

  return multiplyDecimals(value, GRAMS_PER_UNIT[quantity.unit]);
}

export function convertMass(quantity: MassQuantity, targetUnit: MassUnit): MassQuantity {
  return {
    value: divideDecimals(massInGrams(quantity), GRAMS_PER_UNIT[targetUnit]),
    unit: targetUnit,
  };
}

export function calculateMassPercentage(part: MassQuantity, total: MassQuantity): string {
  const totalInGrams = massInGrams(total);
  if (totalInGrams === '0') {
    throw new RangeError('Total mass must be greater than zero');
  }

  return multiplyDecimals(divideDecimals(massInGrams(part), totalInGrams), '100');
}

export function calculateIngoingMassPercentages(
  ingredients: readonly ExpandedIngredient[],
): readonly IngoingIngredientPercentage[] {
  if (ingredients.length === 0) {
    throw new RangeError('At least one expanded ingredient is required');
  }

  const massesInGrams = ingredients.map(({ mass }) => {
    const massInGramsValue = massInGrams(mass);
    if (massInGramsValue === '0') {
      throw new RangeError('Ingoing ingredient mass must be greater than zero');
    }
    return massInGramsValue;
  });
  const totalMass = sumDecimals(massesInGrams);

  return ingredients.map((ingredient, index) => {
    const ingredientMass = massesInGrams[index];
    if (ingredientMass === undefined) {
      throw new Error('Ingoing ingredient mass was not calculated');
    }

    return {
      ingredientId: ingredient.ingredientId,
      mass: { value: ingredientMass, unit: 'g' },
      percentage: multiplyDecimals(divideDecimals(ingredientMass, totalMass), '100'),
      sourcePath: ingredient.sourcePath,
    };
  });
}
