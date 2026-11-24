import type {
  AggregatedNutrient,
  IngredientNutrientInput,
  NutrientAggregationResult,
  NutrientContributionSource,
  NutrientEvidence,
  NutrientId,
  NutrientUnit,
  VolumeNutrientEvidence,
} from '@aus-food/domain';
import { requiredNutrientExpressions } from '@aus-food/domain';
import {
  addDecimals,
  compareDecimals,
  divideDecimals,
  isNegativeDecimal,
  multiplyDecimals,
  normalizeDecimal,
  plainDecimal,
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
  transFat: 'g/100g',
  monounsaturatedFat: 'g/100g',
  polyunsaturatedFat: 'g/100g',
  cholesterol: 'mg/100g',
  potassium: 'mg/100g',
  lactose: 'g/100g',
  galactose: 'g/100g',
  omega3: 'g/100g',
  omega6: 'g/100g',
  omega9: 'g/100g',
  alphaLinolenicAcid: 'g/100g',
  docosahexaenoicAcid: 'g/100g',
  eicosapentaenoicAcid: 'g/100g',
  phytosterols: 'mg/100g',
  phytostanols: 'mg/100g',
  phytosterolEsters: 'mg/100g',
  phytostanolEsters: 'mg/100g',
  totalPlantSterolEquivalents: 'mg/100g',
  water: 'g/100g',
  ash: 'g/100g',
  starch: 'g/100g',
  availableSugars: 'g/100g',
  availableOligosaccharides: 'g/100g',
  glycogen: 'g/100g',
  maltodextrins: 'g/100g',
  caffeine: 'mg/100g',
  taurine: 'mg/100g',
  glucuronolactone: 'mg/100g',
  inositol: 'mg/100g',
  vitaminA: 'ug/100g',
  thiamin: 'mg/100g',
  riboflavin: 'mg/100g',
  niacin: 'mg/100g',
  folate: 'ug/100g',
  vitaminB6: 'mg/100g',
  vitaminB12: 'ug/100g',
  biotin: 'ug/100g',
  pantothenicAcid: 'mg/100g',
  vitaminC: 'mg/100g',
  vitaminD: 'ug/100g',
  vitaminE: 'mg/100g',
  vitaminK: 'ug/100g',
  calcium: 'mg/100g',
  chromium: 'ug/100g',
  copper: 'mg/100g',
  iodine: 'ug/100g',
  iron: 'mg/100g',
  magnesium: 'mg/100g',
  manganese: 'mg/100g',
  molybdenum: 'ug/100g',
  phosphorus: 'mg/100g',
  selenium: 'ug/100g',
  zinc: 'mg/100g',
};

export function canonicalNutrientUnit(nutrient: NutrientId): NutrientUnit {
  return CANONICAL_UNIT[nutrient];
}

export function calculateRetainedNutrientPer100g(
  ingoingPer100g: string,
  ingoingMass: string,
  finishedMass: string,
  retentionPercentage: string,
): string {
  const value = normalizeDecimal(ingoingPer100g);
  const start = normalizeDecimal(ingoingMass);
  const end = normalizeDecimal(finishedMass);
  const retention = normalizeDecimal(retentionPercentage);
  if (isNegativeDecimal(value) || isNegativeDecimal(start) || start === '0'
    || isNegativeDecimal(end) || end === '0'
    || isNegativeDecimal(retention) || compareDecimals(retention, '100') > 0) {
    throw new RangeError('Nutrient, batch weights or retention percentage are invalid');
  }
  const result = divideDecimals(multiplyDecimals(multiplyDecimals(value, start), retention), multiplyDecimals(end, '100'));
  if (value !== '0' && retention !== '0' && result === '0') {
    throw new RangeError('Nutrient retention needs greater calculation precision');
  }
  return plainDecimal(result);
}

export function calculateMixedNutrientPer100g(
  firstValue: string,
  firstMass: string,
  secondValue: string,
  secondMass: string,
): string {
  const first = normalizeDecimal(firstValue);
  const second = normalizeDecimal(secondValue);
  const firstWeight = normalizeDecimal(firstMass);
  const secondWeight = normalizeDecimal(secondMass);
  if (isNegativeDecimal(first) || isNegativeDecimal(second)
    || isNegativeDecimal(firstWeight) || firstWeight === '0'
    || isNegativeDecimal(secondWeight) || secondWeight === '0') {
    throw new RangeError('Nutrient values must be non-negative and amounts must be positive');
  }
  const result = divideDecimals(
    addDecimals(multiplyDecimals(first, firstWeight), multiplyDecimals(second, secondWeight)),
    addDecimals(firstWeight, secondWeight),
  );
  if ((first !== '0' || second !== '0') && result === '0') {
    throw new RangeError('Prepared nutrient calculation needs greater precision');
  }
  return plainDecimal(result);
}

const MICROGRAMS_PER_UNIT: Readonly<Record<NutrientUnit, string>> = {
  'g/100g': '1000000',
  'mg/100g': '1000',
  'ug/100g': '1',
};
const UNITS_PER_MICROGRAM: Readonly<Record<NutrientUnit, string>> = {
  'g/100g': '0.000001',
  'mg/100g': '0.001',
  'ug/100g': '1',
};

export function convertNutrientUnit(value: string, from: NutrientUnit, to: NutrientUnit): string {
  const fromFactor = MICROGRAMS_PER_UNIT[from];
  const toFactor = UNITS_PER_MICROGRAM[to];
  if (fromFactor === undefined || toFactor === undefined) {
    throw new TypeError('Unsupported nutrient mass unit');
  }
  return multiplyDecimals(multiplyDecimals(value, fromFactor), toFactor);
}

export function convertVolumeNutrientToMass(
  evidence: VolumeNutrientEvidence,
  density: { readonly gramsPerMillilitre: string; readonly evidenceReference: string; readonly sourceDate: string } | undefined,
):
  | { readonly status: 'converted'; readonly evidence: NutrientEvidence }
  | { readonly status: 'review_required'; readonly reason: 'MISSING_DENSITY_EVIDENCE' | 'INSUFFICIENT_NUTRIENT_PRECISION' } {
  if (density === undefined) {
    return { status: 'review_required', reason: 'MISSING_DENSITY_EVIDENCE' };
  }
  if (density.sourceDate) {
    const date = new Date(`${density.sourceDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(density.sourceDate)
      || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== density.sourceDate) {
      return { status: 'review_required', reason: 'MISSING_DENSITY_EVIDENCE' };
    }
  }
  const densityValue = normalizeDecimal(density.gramsPerMillilitre);
  if (isNegativeDecimal(densityValue) || densityValue === '0') throw new RangeError('Ingredient density must be positive');
  const value = normalizeDecimal(evidence.value);
  if (isNegativeDecimal(value)) throw new RangeError('Nutrient values cannot be negative');
  const units: Readonly<Record<VolumeNutrientEvidence['unit'], NutrientUnit>> = {
    'g/100mL': 'g/100g', 'mg/100mL': 'mg/100g', 'ug/100mL': 'ug/100g',
  };
  const unit = units[evidence.unit];
  if (unit === undefined) throw new TypeError('Unsupported volume nutrient unit');
  const adjusted = divideDecimals(value, densityValue);
  if (value !== '0' && adjusted === '0') {
    return { status: 'review_required', reason: 'INSUFFICIENT_NUTRIENT_PRECISION' };
  }
  return {
    status: 'converted',
    evidence: {
      ...evidence,
      value: plainDecimal(adjusted),
      unit,
      method: `${evidence.method ? `${evidence.method}; ` : ''}Converted using ingredient density ${density.gramsPerMillilitre} g/mL${density.evidenceReference ? `, ${density.evidenceReference}` : ''}${density.sourceDate ? `, ${density.sourceDate}` : ''}`,
    },
  };
}

function normalizeNutrientValue(
  nutrient: NutrientId,
  evidence: NutrientEvidence,
): string {
  const value = normalizeDecimal(evidence.value);
  if (isNegativeDecimal(value)) {
    throw new RangeError(`Nutrient "${nutrient}" cannot have a negative value`);
  }

  return convertNutrientUnit(value, evidence.unit, CANONICAL_UNIT[nutrient]);
}

function sourceFor(
  sourcePath: readonly string[],
  evidence: NutrientEvidence,
): NutrientContributionSource {
  return {
    sourcePath,
    sourceId: evidence.sourceId,
    sourceDate: evidence.sourceDate,
    evidenceType: evidence.evidenceType,
    ...(evidence.method === undefined ? {} : { method: evidence.method }),
    ...(evidence.expression === undefined ? {} : { expression: evidence.expression }),
  };
}

function evidenceIsComplete(evidence: NutrientEvidence): boolean {
  if (!evidence.sourceDate) return true;
  const date = new Date(`${evidence.sourceDate}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(evidence.sourceDate)
    && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === evidence.sourceDate;
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

  const incompatible: {
    readonly ingredientId: string;
    readonly sourcePath: readonly string[];
    readonly nutrient: NutrientId;
    readonly expectedExpression: string;
    readonly actualExpression?: string;
  }[] = [];
  for (const { ingredient, profile } of normalizedInputs) {
    for (const nutrient of uniqueNutrients) {
      const evidence = profile?.values[nutrient];
      if (evidence === undefined) throw new Error('Required nutrient evidence was not checked');
      const required = requiredNutrientExpressions[nutrient];
      if ((required !== undefined && evidence.expression !== required)
        || (required === undefined && evidence.expression !== undefined && evidence.expression !== 'nutrientAmount')) {
        incompatible.push({
          ingredientId: ingredient.ingredientId,
          sourcePath: ingredient.sourcePath,
          nutrient,
          expectedExpression: required ?? 'nutrientAmount',
          ...(evidence.expression === undefined ? {} : { actualExpression: evidence.expression }),
        });
      }
    }
  }
  if (incompatible.length > 0) {
    return { status: 'review_required', reason: 'INCOMPATIBLE_NUTRIENT_EXPRESSION', missing: incompatible };
  }

  const precisionMissing: { ingredientId: string; sourcePath: readonly string[]; nutrient: NutrientId }[] = [];
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

    const value = divideDecimals(weightedNutrient, totalMassInGrams);
    if (weightedNutrient !== '0' && value === '0') {
      for (const { ingredient } of normalizedInputs) {
        precisionMissing.push({ ingredientId: ingredient.ingredientId, sourcePath: ingredient.sourcePath, nutrient });
      }
    }
    return {
      nutrient,
      value,
      unit: CANONICAL_UNIT[nutrient],
      sources,
    };
  });

  if (precisionMissing.length > 0) {
    return { status: 'review_required', reason: 'INSUFFICIENT_NUTRIENT_PRECISION', missing: precisionMissing };
  }

  return {
    status: 'calculated',
    basis: 'ingoing',
    totalMass: { value: totalMassInGrams, unit: 'g' },
    nutrients,
  };
}
