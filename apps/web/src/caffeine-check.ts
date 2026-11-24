import {
  calculateCaffeineConcentration,
  calculateProcessMassBalance,
  convertNutrientUnit,
  convertMass,
  createEmptyProductClassificationProfile,
  divideDecimals,
  evaluateProvisionalCaffeine,
  expandFormulation,
  multiplyDecimals,
  sumDecimals,
  type CaffeineContentEvidence,
} from '@aus-food/engine';
import { demoCaffeineRule } from '@aus-food/rules';
import type { ProductClassificationFact } from '@aus-food/domain';
import type { FormulationRecord, IngredientRecord, ProductRecord } from '@aus-food/storage';
import { processEffectsNeedReview } from './formulation-form';
import { expandNutritionComponents } from './nutrition-components';
import { nutritionRecipeSignature } from './product-form';

function savedCaffeineEvidence(ingredient: IngredientRecord): CaffeineContentEvidence | undefined {
  const saved = ingredient.caffeineEvidence;
  if (!saved) return undefined;
  if (saved.status === 'conflicting') {
    return {
      status: 'conflicting' as const,
      sources: (saved.statements ?? []).map((statement) => ({
        reference: statement.specification.reference,
        sourceDate: statement.specification.sourceDate,
      })),
      ...(saved.statements || (!saved.specification.reference && !saved.specification.sourceDate) ? {} : {
        reference: saved.specification.reference,
        sourceDate: saved.specification.sourceDate,
      }),
    };
  }
  if (saved.status === 'absent') {
    return {
      status: 'absent' as const,
      reference: saved.specification.reference,
      sourceDate: saved.specification.sourceDate,
    };
  }
  if (!saved.amount || !saved.unit) return { status: 'unknown' as const };
  return {
    status: 'present' as const,
    value: saved.amount,
    unit: saved.unit,
    reference: saved.specification.reference,
    sourceDate: saved.specification.sourceDate,
  };
}

function nutrientCaffeineEvidence(ingredient: IngredientRecord): CaffeineContentEvidence | undefined {
  const mass = ingredient.nutrientProfile?.values.caffeine;
  if (mass) {
    return {
      status: 'quantified',
      value: convertNutrientUnit(mass.value, mass.unit, 'mg/100g'),
      unit: 'mg/100g',
      reference: mass.sourceId,
      sourceDate: mass.sourceDate,
    };
  }

  const volume = ingredient.additionalNutritionPer100mL?.caffeine;
  if (!volume) return undefined;
  const value = volume.unit === 'g/100mL'
    ? multiplyDecimals(volume.value, '1000')
    : volume.unit === 'ug/100mL'
      ? divideDecimals(volume.value, '1000')
      : volume.value;
  return {
    status: 'quantified',
    value,
    unit: 'mg/100mL',
    reference: volume.sourceId,
    sourceDate: volume.sourceDate,
  };
}

function additiveCaffeineEvidence(ingredient: IngredientRecord): CaffeineContentEvidence | undefined {
  const sources = ingredient.additiveSources?.filter(
    (source) => source.additiveName.trim().toLowerCase() === 'caffeine',
  ) ?? [];
  if (sources.length !== 1) return undefined;

  const source = sources[0];
  const concentration = source?.concentration;
  if (!source || !concentration
    || (concentration.basis !== 'asSupplied' && concentration.basis !== 'asAdded')
    || (concentration.calculatedAs && concentration.calculatedAs.trim().toLowerCase() !== 'caffeine')) {
    return undefined;
  }

  let value: string;
  let unit: 'g/100g' | 'mg/100g' | 'mg/100mL';
  switch (concentration.unit) {
    case 'mgPerKg':
      value = divideDecimals(concentration.value, '10');
      unit = 'mg/100g';
      break;
    case 'gPerKg':
      value = divideDecimals(concentration.value, '10');
      unit = 'g/100g';
      break;
    case 'mgPerL':
      value = divideDecimals(concentration.value, '10');
      unit = 'mg/100mL';
      break;
    case 'gPerL':
      value = multiplyDecimals(concentration.value, '100');
      unit = 'mg/100mL';
      break;
    case 'mgPer100g':
      value = concentration.value;
      unit = 'mg/100g';
      break;
    case 'gPer100g':
    case 'percentByMass':
      value = concentration.value;
      unit = 'g/100g';
      break;
    case 'mgPer100mL':
      value = concentration.value;
      unit = 'mg/100mL';
      break;
    case 'gPer100mL':
      value = multiplyDecimals(concentration.value, '1000');
      unit = 'mg/100mL';
      break;
    case 'percentByVolume':
      return undefined;
    default:
      return undefined;
  }

  const sourceEvidence = source.sourceEvidence?.[0];
  return {
    status: 'quantified',
    value,
    unit,
    reference: sourceEvidence?.reference ?? '',
    sourceDate: sourceEvidence?.sourceDate ?? '',
  };
}

function caffeineEvidence(ingredient: IngredientRecord): CaffeineContentEvidence | undefined {
  return nutrientCaffeineEvidence(ingredient)
    ?? additiveCaffeineEvidence(ingredient)
    ?? savedCaffeineEvidence(ingredient);
}

function selectedProductTypeFact(): ProductClassificationFact {
  return { answer: 'yes', evidence: [] };
}

export function caffeineCheckForProduct(
  product: ProductRecord,
  evaluationDate: string,
  formulations: readonly FormulationRecord[],
  ingredients: readonly IngredientRecord[],
) {
  if (product.builderProductType !== 'caffeinatedBeverage') return undefined;

  const profile = product.classificationProfile ?? createEmptyProductClassificationProfile();
  const issues: string[] = [];
  const formulationById = new Map(formulations.map((formulation) => [formulation.id, formulation]));
  const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  let expanded: ReturnType<typeof expandFormulation> = [];

  try {
    expanded = expandFormulation(product.formulationId, { value: '100', unit: 'g' }, formulations);
    if (!expanded.some((item) => item.sourcePath.some((id) => {
      const formulation = formulationById.get(id);
      return formulation && processEffectsNeedReview(formulation.processMassProfile);
    }))) {
      try {
        expanded = expandNutritionComponents(expanded, formulations, ingredients);
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        issues.push(`The composition cannot be expanded for caffeine coverage: ${error.message}`);
      }
    }
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    issues.push(`The recipe cannot be expanded for caffeine coverage: ${error.message}`);
  }

  try {
    const savedSignature = product.packDetails?.nutritionRecipeSignature;
    const currentSignature = nutritionRecipeSignature(product.formulationId, formulations, ingredients);
    if (!savedSignature || savedSignature !== currentSignature) {
      issues.push('Confirm that the recipe and ingredient information describe this product as sold.');
    }
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    issues.push(`The as-sold recipe confirmation needs review: ${error.message}`);
  }

  const reachableFormulationIds = new Set(
    expanded.flatMap((item) => item.sourcePath).filter((part) => formulationById.has(part)),
  );
  for (const id of reachableFormulationIds) {
    const formulation = formulationById.get(id);
    if (!formulation) continue;
    if ((formulation.processMassProfile?.changes.length ?? 0) > 0
      || formulation.processMassProfile?.complete === false) {
      issues.push(`Recorded processing changes in ${formulation.name} are not covered by the caffeine calculation.`);
    }
    if (formulation.processMassProfile) {
      try {
        const ingoingMass = sumDecimals(formulation.lines.map((line) => convertMass(line.quantity, 'g').value));
        const balance = calculateProcessMassBalance({ value: ingoingMass, unit: 'g' }, formulation.processMassProfile);
        if (balance.status !== 'calculated' || balance.finalMass.value !== ingoingMass) {
          issues.push(`The recorded final mass for ${formulation.name} changes or does not establish unchanged caffeine concentration.`);
        }
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        issues.push(`The recorded process mass for ${formulation.name} needs review: ${error.message}`);
      }
    }
    if (formulation.finishedNutrition?.selected || formulation.nutrientRetention?.selected) {
      issues.push(`Finished-food or nutrient-retention adjustments in ${formulation.name} do not establish caffeine retention.`);
    }
  }

  if (product.foodState !== 'asSold' || product.preparation?.enabled || product.draining?.enabled) {
    issues.push('Only an as-sold, ready-to-drink product without separate consumer preparation is supported.');
  }

  const concentration = calculateCaffeineConcentration({
    ingredients: expanded.map((item) => {
      const ingredient = ingredientById.get(item.ingredientId);
      if (!ingredient) {
        issues.push(`Ingredient ${item.ingredientId} in the recipe could not be found.`);
      }
      const evidence = ingredient ? caffeineEvidence(ingredient) : undefined;
      return {
        ingredientId: item.ingredientId,
        mass: item.mass,
        sourcePath: item.sourcePath,
        ...(ingredient
          ? {
              ...(evidence ? { evidence } : {}),
              ...(ingredient.ingredientDensity ? { density: ingredient.ingredientDensity } : {}),
            }
          : {}),
      };
    }),
    finalMass: { value: '100', unit: 'g' },
    ...(product.packDetails?.nutritionDensity ? { finalDensity: product.packDetails.nutritionDensity } : {}),
  });

  const complete = issues.length === 0 && concentration.completeness === 'complete';
  return evaluateProvisionalCaffeine({
    rule: demoCaffeineRule,
    evaluationDate,
    classification: {
      beverage: selectedProductTypeFact(),
      flavoured: profile.formulatedCaffeinatedBeverage.flavoured,
      nonAlcoholic: profile.formulatedCaffeinatedBeverage.nonAlcoholic,
      containsCaffeine: profile.formulatedCaffeinatedBeverage.containsCaffeine,
      mentalPerformancePurpose: profile.formulatedCaffeinatedBeverage.representedForMentalPerformance,
    },
    concentration: {
      ...(complete && concentration.value !== undefined ? { value: concentration.value } : {}),
      unit: 'mg/L',
      foodState: product.foodState === 'asSold' && !product.preparation?.enabled && !product.draining?.enabled
        ? 'readyToDrinkAsSold' : 'other',
      completeness: complete ? 'complete' : concentration.completeness === 'conflicting' ? 'conflicting' : 'unknown',
      evidence: concentration.evidence,
      issues: [...issues, ...concentration.issues],
    },
  });
}
