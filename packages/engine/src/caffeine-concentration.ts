import type {
  AdditiveDensityEvidence,
  EvaluationInputTrace,
  MassQuantity,
} from '@aus-food/domain';
import {
  addDecimals,
  compareDecimals,
  divideDecimals,
  multiplyDecimals,
  normalizeDecimal,
} from './decimal.js';
import { convertMass } from './mass.js';

export type CaffeineContentEvidence =
  | {
      readonly status: 'present';
      readonly value: string;
      readonly unit: 'g/100g' | 'mg/100g' | 'mg/100mL';
      readonly reference?: string;
      readonly sourceDate?: string;
    }
  | {
      readonly status: 'quantified';
      readonly value: string;
      readonly unit: 'g/100g' | 'mg/100g' | 'mg/100mL';
      readonly reference?: string;
      readonly sourceDate?: string;
    }
  | {
      readonly status: 'absent';
      readonly reference?: string;
      readonly sourceDate?: string;
    }
  | {
      readonly status: 'conflicting';
      readonly reference?: string;
      readonly sourceDate?: string;
      readonly sources?: readonly {
        readonly reference: string;
        readonly sourceDate: string;
      }[];
    }
  | {
      readonly status: 'unknown';
      readonly reference?: string;
      readonly sourceDate?: string;
    };

export interface CaffeineIngredientInput {
  readonly ingredientId: string;
  readonly mass: MassQuantity;
  readonly sourcePath: readonly string[];
  readonly evidence?: CaffeineContentEvidence;
  readonly density?: AdditiveDensityEvidence;
}

export interface CaffeineConcentrationInput {
  readonly ingredients: readonly CaffeineIngredientInput[];
  readonly finalMass: MassQuantity;
  readonly finalDensity?: AdditiveDensityEvidence;
}

export interface CaffeineConcentrationResult {
  readonly completeness: 'complete' | 'unknown' | 'conflicting';
  readonly value?: string;
  readonly unit: 'mg/L';
  readonly evidence: readonly EvaluationInputTrace[];
  readonly issues: readonly string[];
}

function positiveDecimal(value: string): boolean {
  try {
    return compareDecimals(value, '0') > 0;
  } catch (error) {
    if (error instanceof TypeError) return false;
    throw error;
  }
}

function nonNegativeDecimal(value: string): boolean {
  try {
    return compareDecimals(value, '0') >= 0;
  } catch (error) {
    if (error instanceof TypeError) return false;
    throw error;
  }
}

function evidenceTrace(
  name: string,
  value: string,
  sourceId: string,
  sourceDate: string,
  sourcePath: readonly string[],
  unit?: string,
): EvaluationInputTrace {
  return {
    name,
    value,
    sourceId,
    sourceDate,
    sourcePath: [...sourcePath],
    ...(unit === undefined ? {} : { unit }),
  };
}

export function calculateCaffeineConcentration(
  input: CaffeineConcentrationInput,
): CaffeineConcentrationResult {
  const issues: string[] = [];
  const evidence: EvaluationInputTrace[] = [];
  let conflicting = false;
  let totalMilligrams = '0';

  if (input.ingredients.length === 0) {
    issues.push('No recipe ingredients are available for caffeine coverage.');
  }

  for (const ingredient of input.ingredients) {
    const saved = ingredient.evidence;
    const label = ingredient.sourcePath.join(' > ') || ingredient.ingredientId;
    let ingredientMass: string;
    try {
      ingredientMass = convertMass(ingredient.mass, 'g').value;
      if (!positiveDecimal(ingredientMass)) {
        issues.push(`Ingredient mass is invalid for ${label}.`);
        continue;
      }
    } catch (error) {
      if (error instanceof TypeError || error instanceof RangeError) {
        issues.push(`Ingredient mass is invalid for ${label}.`);
        continue;
      }
      throw error;
    }

    if (saved === undefined || saved.status === 'unknown') {
      issues.push(`Caffeine content is not established for ${label}.`);
      evidence.push(evidenceTrace(`Caffeine evidence for ${label}`, 'not supplied', '', '', ingredient.sourcePath));
      continue;
    }
    if (saved.status === 'conflicting') {
      conflicting = true;
      issues.push(`Caffeine evidence conflicts for ${label}.`);
      const conflictingSources = saved.sources?.length
        ? saved.sources
        : saved.reference || saved.sourceDate
          ? [{ reference: saved.reference ?? '', sourceDate: saved.sourceDate ?? '' }]
          : [];
      for (const source of conflictingSources) {
        evidence.push(evidenceTrace(
          `Conflicting caffeine evidence for ${label}`,
          'conflict unresolved',
          source.reference.trim(),
          source.sourceDate,
          ingredient.sourcePath,
        ));
      }
      continue;
    }
    if (saved.status === 'absent') {
      evidence.push(evidenceTrace(
        `Caffeine status for ${label}`,
        saved.status,
        saved.reference?.trim() ?? '',
        saved.sourceDate ?? '',
        ingredient.sourcePath,
      ));
      continue;
    }

    evidence.push(evidenceTrace(
      `Caffeine content in ${label}`,
      saved.value,
      saved.reference ?? '',
      saved.sourceDate ?? '',
      ingredient.sourcePath,
      saved.unit,
    ));

    if (saved.status === 'quantified' ? !nonNegativeDecimal(saved.value) : !positiveDecimal(saved.value)) {
      issues.push(`Caffeine amount is invalid for ${label}.`);
      continue;
    }

    let milligramsPerGram: string;
    if (saved.unit === 'g/100g') {
      milligramsPerGram = multiplyDecimals(saved.value, '10');
    } else if (saved.unit === 'mg/100g') {
      milligramsPerGram = divideDecimals(saved.value, '100');
    } else {
      const density = ingredient.density;
      if (density === undefined || !positiveDecimal(density.gramsPerMillilitre)) {
        issues.push(`A positive ingredient density is required to use volume-based caffeine evidence for ${label}.`);
        continue;
      }
      evidence.push(evidenceTrace(
        `Ingredient density for ${label}`,
        density.gramsPerMillilitre,
        density.evidenceReference,
        density.sourceDate,
        ingredient.sourcePath,
        'g/mL',
      ));
      milligramsPerGram = divideDecimals(saved.value, multiplyDecimals('100', density.gramsPerMillilitre));
    }

    totalMilligrams = addDecimals(totalMilligrams, multiplyDecimals(milligramsPerGram, ingredientMass));
  }

  const finalDensity = input.finalDensity;
  if (finalDensity === undefined || !positiveDecimal(finalDensity.gramsPerMillilitre)) {
    issues.push('A positive final-food density is required to calculate mg/L.');
  } else {
    evidence.push(evidenceTrace(
      'Final beverage density',
      finalDensity.gramsPerMillilitre,
      finalDensity.evidenceReference,
      finalDensity.sourceDate,
      ['Final beverage'],
      'g/mL',
    ));
  }

  let finalMassInGrams: string | undefined;
  try {
    finalMassInGrams = convertMass(input.finalMass, 'g').value;
    if (!positiveDecimal(finalMassInGrams)) {
      issues.push('Final beverage mass must be greater than zero.');
    }
  } catch (error) {
    if (error instanceof TypeError || error instanceof RangeError) {
      issues.push('Final beverage mass is invalid.');
    } else {
      throw error;
    }
  }

  if (issues.length > 0 || finalDensity === undefined || finalMassInGrams === undefined) {
    return {
      completeness: conflicting ? 'conflicting' : 'unknown',
      unit: 'mg/L',
      evidence,
      issues,
    };
  }

  const value = divideDecimals(
    multiplyDecimals(multiplyDecimals(totalMilligrams, finalDensity.gramsPerMillilitre), '1000'),
    finalMassInGrams,
  );
  return {
    completeness: 'complete',
    value: normalizeDecimal(value),
    unit: 'mg/L',
    evidence,
    issues: [],
  };
}
