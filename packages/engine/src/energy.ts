import type {
  EnergyComponentCategory,
  EnergyComponentInput,
  EnergyFactorSet,
  EnergyReviewReason,
  FoodState,
  NutrientContributionSource,
  Schedule11EnergyResult,
} from '@aus-food/domain';
import {
  addDecimals,
  divideDecimals,
  isNegativeDecimal,
  multiplyDecimals,
  normalizeDecimal,
} from './decimal.js';

function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function sourceIsComplete(
  source: NutrientContributionSource | undefined,
): source is NutrientContributionSource {
  return source !== undefined
    && source.sourcePath.length > 0
    && source.sourcePath.every((segment) => isNonEmpty(segment))
    && isNonEmpty(source.sourceId)
    && isNonEmpty(source.sourceDate);
}

export function calculateSchedule11Energy(
  components: readonly EnergyComponentInput[],
  factorSet: EnergyFactorSet | undefined,
  componentSetComplete: boolean,
  foodState: FoodState | undefined,
): Schedule11EnergyResult {
  const reasons: {
    code: EnergyReviewReason;
    componentId?: string;
    category?: EnergyComponentCategory;
  }[] = [];

  if (factorSet === undefined) {
    reasons.push({ code: 'MISSING_FACTOR_SET' });
  } else if (
    !isNonEmpty(factorSet.id)
    || !isNonEmpty(factorSet.compilation)
    || !isNonEmpty(factorSet.effectiveDate)
    || !isNonEmpty(factorSet.sourceUrl)
  ) {
    throw new TypeError('Energy factor set must include source and version metadata');
  }

  if (!componentSetComplete) {
    reasons.push({ code: 'INCOMPLETE_COMPONENT_DATA' });
  }
  if (components.length === 0) {
    reasons.push({ code: 'NO_COMPONENTS' });
  }
  if (foodState === undefined) {
    reasons.push({ code: 'MISSING_FOOD_STATE' });
  }

  const seenIds = new Set<string>();
  const contributions: NonNullable<Extract<
    Schedule11EnergyResult,
    { readonly status: 'calculated' }
  >['contributions']>[number][] = [];
  let totalEnergy = '0';

  for (const component of components) {
    if (seenIds.has(component.id)) {
      throw new TypeError(`Duplicate energy component identifier "${component.id}"`);
    }
    seenIds.add(component.id);

    if (component.category === undefined) {
      reasons.push({ code: 'UNCLASSIFIED_COMPONENT', componentId: component.id });
      continue;
    }
    if (component.mappingStatus !== 'resolved') {
      reasons.push({
        code: 'COMPONENT_MAPPING_REVIEW',
        componentId: component.id,
        category: component.category,
      });
    }
    if (component.quantity === undefined) {
      reasons.push({
        code: 'MISSING_COMPONENT_QUANTITY',
        componentId: component.id,
        category: component.category,
      });
      continue;
    }
    if (component.unit !== 'g/100g' && component.unit !== 'mg/100g') {
      throw new TypeError(`Unsupported quantity unit for energy component "${component.id}"`);
    }
    if (!sourceIsComplete(component.source)) {
      reasons.push({
        code: 'MISSING_COMPONENT_SOURCE',
        componentId: component.id,
        category: component.category,
      });
      continue;
    }

    const quantity = normalizeDecimal(component.quantity);
    if (isNegativeDecimal(quantity)) {
      throw new RangeError(`Energy component "${component.id}" cannot have a negative quantity`);
    }
    const quantityInGrams = component.unit === 'mg/100g'
      ? divideDecimals(quantity, '1000')
      : quantity;

    const factor = factorSet?.factors[component.category];
    if (factor === undefined) {
      if (factorSet !== undefined) {
        reasons.push({
          code: 'MISSING_ENERGY_FACTOR',
          componentId: component.id,
          category: component.category,
        });
      }
      continue;
    }

    const factorValue = normalizeDecimal(factor.value);
    if (factor.unit !== 'kJ/g') {
      throw new TypeError(`Unsupported energy factor unit for "${component.category}"`);
    }
    if (isNegativeDecimal(factorValue)) {
      throw new RangeError(`Energy factor for "${component.category}" cannot be negative`);
    }

    const contributionKjPer100g = multiplyDecimals(quantityInGrams, factorValue);
    totalEnergy = addDecimals(totalEnergy, contributionKjPer100g);
    contributions.push({
      componentId: component.id,
      category: component.category,
      quantity: quantityInGrams,
      factor,
      contributionKjPer100g,
      source: component.source,
    });
  }

  if (reasons.length > 0) {
    return { status: 'review_required', reasons };
  }

  if (factorSet === undefined) {
    throw new Error('Energy factor set was not validated');
  }
  if (foodState === undefined) {
    throw new Error('Food-state basis was not validated');
  }

  return {
    status: 'calculated',
    foodState,
    energyKjPer100g: totalEnergy,
    rule: {
      id: factorSet.id,
      compilation: factorSet.compilation,
      effectiveDate: factorSet.effectiveDate,
      sourceUrl: factorSet.sourceUrl,
      clause: 'S11-2(1)',
    },
    contributions,
  };
}
