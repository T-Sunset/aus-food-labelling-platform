import type {
  AggregatedNutrient,
  IngredientNutrientInput,
  NutrientAggregationResult,
  NutrientContributionSource,
  NutrientEvidence,
  NutrientId,
  NutrientUnit,
} from '@aus-food/domain';
import {
  addDecimals,
  divideDecimals,
  isNegativeDecimal,
  multiplyDecimals,
  normalizeDecimal,
} from './decimal.js';
import { convertMass } from './mass.js';

const CANONICAL_UNIT: Readonly<Record<NutrientId, NutrientUnit>> = {
  protein: 'g/100g',
  fat: 'g/100g',
  saturatedFat: 'g/100g',
  carbohydrate: 'g/100g',
  availableCarbohydrate: 'g/100g',
  unavailableCarbohydrate: 'g/100g',
  sugars: 'g/100g',
  sodium: 'mg/100g',
  dietaryFibre: 'g/100g',
  organicAcids: 'g/100g',
  alcohol: 'g/100g',
  polyols: 'g/100g',
  erythritol: 'g/100g',
  glycerol: 'g/100g',
  dAllulose: 'g/100g',
  isomalt: 'g/100g',
  lactitol: 'g/100g',
  maltitol: 'g/100g',
  mannitol: 'g/100g',
  polydextrose: 'g/100g',
  sorbitol: 'g/100g',
  dTagatose: 'g/100g',
  xylitol: 'g/100g',
};

function normalizeNutrientValue(
  nutrient: NutrientId,
  evidence: NutrientEvidence,
): string {
  const value = normalizeDecimal(evidence.value);
  if (isNegativeDecimal(value)) {
    throw new RangeError(`Nutrient "${nutrient}" cannot have a negative value`);
  }

  const targetUnit = CANONICAL_UNIT[nutrient];
  if (evidence.unit === targetUnit) {
    return value;
  }

  return evidence.unit === 'mg/100g'
    ? divideDecimals(value, '1000')
    : multiplyDecimals(value, '1000');
}

function sourceFor(
  sourcePath: readonly string[],
  evidence: NutrientEvidence,
): NutrientContributionSource {
  return evidence.method === undefined
    ? {
        sourcePath,
        sourceId: evidence.sourceId,
        sourceDate: evidence.sourceDate,
        evidenceType: evidence.evidenceType,
      }
    : {
        sourcePath,
        sourceId: evidence.sourceId,
        sourceDate: evidence.sourceDate,
        evidenceType: evidence.evidenceType,
        method: evidence.method,
      };
}

function evidenceIsComplete(evidence: NutrientEvidence): boolean {
  return evidence.sourceId.trim().length > 0
      && evidence.sourceDate.trim().length > 0;
}

export function aggregateNutrients(
  inputs: readonly IngredientNutrientInput[],
  requiredNutrients: readonly NutrientId[],
): NutrientAggregationResult {
  if (inputs.length === 0) {
    throw new RangeError('At least one ingredient is required for nutrient aggregation');
  }
  if (requiredNutrients.length === 0) {
    throw new RangeError('At least one nutrient must be requested');
  }

  const uniqueNutrients = [...new Set(requiredNutrients)];
  const normalizedInputs = inputs.map(({ ingredient, profile }) => {
    if (profile !== undefined && profile.ingredientId !== ingredient.ingredientId) {
      throw new TypeError(
        `Nutrient profile "${profile.ingredientId}" does not match ingredient "${ingredient.ingredientId}"`,
      );
    }

    return {
      ingredient,
      profile,
      massInGrams: normalizeDecimal(convertMass(ingredient.mass, 'g').value),
    };
  });
  for (const { ingredient, massInGrams } of normalizedInputs) {
    if (massInGrams === '0') {
      throw new RangeError(`Ingoing mass for "${ingredient.ingredientId}" must be greater than zero`);
    }
  }
  const totalMassInGrams = normalizedInputs.reduce(
    (total, input) => addDecimals(total, input.massInGrams),
    '0',
  );
  if (totalMassInGrams === '0') {
    throw new RangeError('Total ingoing mass must be greater than zero');
  }

  const missing: {
    readonly ingredientId: string;
    readonly sourcePath: readonly string[];
    readonly nutrient: NutrientId;
  }[] = [];
  for (const { ingredient, profile } of normalizedInputs) {
    for (const nutrient of uniqueNutrients) {
      const evidence = profile?.values[nutrient];
      if (evidence === undefined || !evidenceIsComplete(evidence)) {
        missing.push({
          ingredientId: ingredient.ingredientId,
          sourcePath: ingredient.sourcePath,
          nutrient,
        });
      }
    }
  }

  if (missing.length > 0) {
    return {
      status: 'review_required',
      reason: 'MISSING_NUTRIENT_EVIDENCE',
      missing,
    };
  }

  const nutrients: AggregatedNutrient[] = uniqueNutrients.map((nutrient) => {
    let weightedNutrient = '0';
    const sources: NutrientContributionSource[] = [];
    for (const { ingredient, profile, massInGrams } of normalizedInputs) {
      const evidence = profile?.values[nutrient];
      if (evidence === undefined) {
        throw new Error('Required nutrient evidence was not checked');
      }

      const nutrientValue = normalizeNutrientValue(nutrient, evidence);
      weightedNutrient = addDecimals(
        weightedNutrient,
        multiplyDecimals(massInGrams, nutrientValue),
      );
      sources.push(sourceFor(ingredient.sourcePath, evidence));
    }

    return {
      nutrient,
      value: divideDecimals(weightedNutrient, totalMassInGrams),
      unit: CANONICAL_UNIT[nutrient],
      sources,
    };
  });

  return {
    status: 'calculated',
    basis: 'ingoing',
    totalMass: { value: totalMassInGrams, unit: 'g' },
    nutrients,
  };
}
