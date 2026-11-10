import type {
  AdditiveConcentrationContribution,
  AdditiveConcentrationReviewReason,
  AdditiveConcentrationUnit,
  AdditiveDensityEvidence,
  AdditiveFinalConcentration,
  AdditiveFinalConcentrationInput,
} from '@aus-food/domain';
import {
  divideDecimals,
  isNegativeDecimal,
  multiplyDecimals,
  normalizeDecimal,
  sumDecimals,
} from './decimal.js';
import { convertMass } from './mass.js';

// Milligrams of additive per kilogram (mass units) or per litre (volume units) of the
// ingredient for one stated unit. Percent by volume is g per 100 mL.
const PER_KG_FACTOR: Partial<Record<AdditiveConcentrationUnit, string>> = {
  mgPerKg: '1',
  gPerKg: '1000',
  mgPer100g: '10',
  gPer100g: '10000',
  percentByMass: '10000',
};

const PER_LITRE_FACTOR: Partial<Record<AdditiveConcentrationUnit, string>> = {
  mgPerL: '1',
  gPerL: '1000',
  mgPer100mL: '10',
  gPer100mL: '10000',
  percentByVolume: '10000',
};

function isUsableDecimal(value: string, allowZero: boolean): boolean {
  try {
    const normalised = normalizeDecimal(value);
    return !isNegativeDecimal(normalised) && (allowZero || normalised !== '0');
  } catch {
    return false;
  }
}

function usableDensity(density: AdditiveDensityEvidence | undefined): density is AdditiveDensityEvidence {
  return (
    density !== undefined &&
    density.evidenceReference.trim() !== '' &&
    density.sourceDate.trim() !== '' &&
    isUsableDecimal(density.gramsPerMillilitre, false)
  );
}

const normaliseCode = (code: string | undefined): string => (code ?? '').trim().toLowerCase();

export function calculateAdditiveFinalConcentration(
  input: AdditiveFinalConcentrationInput,
): AdditiveFinalConcentration {
  const reasons = new Set<AdditiveConcentrationReviewReason>();
  const detail: string[] = [];
  const flag = (reason: AdditiveConcentrationReviewReason, message: string): void => {
    reasons.add(reason);
    detail.push(message);
  };

  const target = normaliseCode(input.additiveCodeNumber);
  if (target === '') {
    flag('ADDITIVE_CODE_MISSING', 'The additive code number is missing.');
  }
  if (input.foodState === undefined) {
    flag('FOOD_STATE_MISSING', 'The food state the concentration applies to is missing.');
  }
  if (input.processBalance.status === 'review_required') {
    flag('PROCESS_MASS_PROFILE_MISSING', 'No documented process mass profile (yield) was supplied.');
  }
  if (input.outputUnit === 'mg/L' && !usableDensity(input.finalDensity)) {
    flag('FINAL_DENSITY_MISSING', 'A mg/L result needs dated density evidence for the final food.');
  }

  const contributions: AdditiveConcentrationContribution[] = [];
  let matched = 0;

  for (const ingredient of input.ingredients) {
    for (const source of input.sourcesByIngredient.get(ingredient.ingredientId) ?? []) {
      const label = `${source.id} (${ingredient.sourcePath.join(' > ')})`;
      if (normaliseCode(source.codeNumber) === '') {
        flag('SOURCE_IDENTITY_MISSING', `Additive source ${label} has no code number, so it cannot be excluded.`);
        continue;
      }
      if (normaliseCode(source.codeNumber) !== target) {
        continue;
      }
      matched += 1;
      if (source.sourceStatus !== 'added') {
        flag('SOURCE_NOT_ADDED', `Additive source ${label} is not recorded as added.`);
        continue;
      }
      const concentration = source.concentration;
      const evidence = source.sourceEvidence?.[0];
      if (concentration === undefined || !isUsableDecimal(concentration.value, true)) {
        flag('CONCENTRATION_MISSING', `Additive source ${label} has no valid concentration.`);
        continue;
      }
      if (evidence === undefined) {
        flag('EVIDENCE_MISSING', `Additive source ${label} has no dated evidence.`);
        continue;
      }
      if (concentration.basis !== 'asSupplied' && concentration.basis !== 'asAdded') {
        flag('BASIS_NOT_SUPPORTED', `Additive source ${label} uses basis "${concentration.basis}", which is not converted.`);
        continue;
      }

      const ingredientKg = convertMass(ingredient.mass, 'kg').value;
      const perKg = PER_KG_FACTOR[concentration.unit];
      let additiveMilligrams: string;
      if (perKg !== undefined) {
        additiveMilligrams = multiplyDecimals(multiplyDecimals(concentration.value, perKg), ingredientKg);
      } else {
        const perLitre = PER_LITRE_FACTOR[concentration.unit];
        const density = input.ingredientDensities?.get(ingredient.ingredientId);
        if (perLitre === undefined) {
          flag('BASIS_NOT_SUPPORTED', `Additive source ${label} uses an unsupported unit.`);
          continue;
        }
        if (!usableDensity(density)) {
          flag('INGREDIENT_DENSITY_MISSING', `Additive source ${label} is per volume and needs dated ingredient density evidence.`);
          continue;
        }
        // g/mL equals kg/L, so mass in kg divided by density gives litres.
        const litres = divideDecimals(ingredientKg, density.gramsPerMillilitre);
        additiveMilligrams = multiplyDecimals(multiplyDecimals(concentration.value, perLitre), litres);
      }

      contributions.push({
        sourceId: source.id,
        ingredientId: ingredient.ingredientId,
        sourcePath: [...ingredient.sourcePath],
        ingredientMass: ingredient.mass,
        additiveMilligrams,
        evidenceReference: evidence.reference,
        evidenceDate: evidence.sourceDate,
      });
    }
  }

  if (target !== '' && matched === 0) {
    flag('NO_MATCHING_SOURCE', 'No source for this additive was found; absence is not treated as zero.');
  }

  if (
    reasons.size > 0 ||
    input.processBalance.status !== 'calculated' ||
    input.foodState === undefined
  ) {
    return { status: 'review_required', reasons: [...reasons], detail };
  }

  const totalAdditiveMilligrams = sumDecimals(contributions.map(({ additiveMilligrams }) => additiveMilligrams));
  const finalKg = convertMass(input.processBalance.finalMass, 'kg').value;
  const perKilogram = divideDecimals(totalAdditiveMilligrams, finalKg);
  const finalDensity = input.finalDensity;
  const value =
    input.outputUnit === 'mg/L' && usableDensity(finalDensity)
      ? multiplyDecimals(perKilogram, finalDensity.gramsPerMillilitre)
      : perKilogram;

  return {
    status: 'calculated',
    additiveCodeNumber: (input.additiveCodeNumber ?? '').trim(),
    foodState: input.foodState,
    value,
    unit: input.outputUnit,
    totalAdditiveMilligrams,
    finalMass: input.processBalance.finalMass,
    yieldPercentage: input.processBalance.yieldPercentage,
    ...(input.outputUnit === 'mg/L' && finalDensity !== undefined ? { finalDensity } : {}),
    contributions,
  };
}
