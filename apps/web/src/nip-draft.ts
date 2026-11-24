import {
  addDecimals, aggregateNutrients, calculateRetainedNutrientPer100g, compareDecimals, convertNutrientUnit, convertVolumeNutrientToMass, divideDecimals, expandFormulation, formatNpcNutrient, multiplyDecimals,
} from '@aus-food/engine';
import type { FormulationRecord, IngredientRecord, ProductRecord } from '@aus-food/storage';
import { additionalNutrientIds, type AdditionalNutrientId, type ExpandedIngredient, type NutrientAggregationResult, type NutrientEvidence, type NutrientId } from '@aus-food/domain';
import { nutritionRecipeSignature, retentionRecipeInputs } from './product-form';
import { expandNutritionComponents } from './nutrition-components';
import { finishedNutritionSnapshot } from './finished-nutrition';
import { consumerDirectionsIssue } from './consumer-directions';
import type { LabelClaim } from '@aus-food/domain';

export const nutritionRows = [
  { id: 'energy', label: 'Energy', unit: 'kJ', kind: 'energy' },
  { id: 'protein', label: 'Protein', unit: 'g', kind: 'grams' },
  { id: 'fat', label: 'Fat, total', unit: 'g', kind: 'grams' },
  { id: 'saturatedFat', label: '- saturated', unit: 'g', kind: 'grams' },
  { id: 'carbohydrate', label: 'Carbohydrate', unit: 'g', kind: 'grams' },
  { id: 'sugars', label: '- sugars', unit: 'g', kind: 'grams' },
  { id: 'sodium', label: 'Sodium', unit: 'mg', kind: 'sodium' },
] as const;
export type BaseNutritionId = (typeof nutritionRows)[number]['id'];

export interface NipDraft {
  readonly rows: readonly { readonly label: string; readonly serving: string; readonly unitQuantity: string }[];
  readonly asSoldPer100g: Readonly<Partial<Record<BaseNutritionId, string>>>;
  readonly asSoldPerServing: Readonly<Partial<Record<BaseNutritionId, string>>>;
  readonly asSoldBasisReady: boolean;
  readonly asSoldServingMassGrams: string | undefined;
  readonly conflictingNutrients: readonly (BaseNutritionId | AdditionalNutrientId)[];
  readonly unitHeading: string;
  readonly servingSize: string;
  readonly servingsPerPack: string;
  readonly missing: readonly string[];
  readonly sources: readonly {
    readonly nutrient: string;
    readonly ingredientId: string;
    readonly sourcePath: readonly string[];
    readonly ingoingMass: string;
    readonly value: string;
    readonly unit: string;
    readonly sourceId: string;
    readonly sourceDate: string;
    readonly method?: string;
  }[];
  readonly optionalNutrients: readonly { readonly id: AdditionalNutrientId; readonly result: NutrientAggregationResult }[];
  readonly finishedOptionalNutrients: readonly {
    readonly id: AdditionalNutrientId;
    readonly result: { readonly status: 'available'; readonly value: string; readonly unit: string }
      | { readonly status: 'review_required'; readonly reason: string };
  }[];
  readonly finishedSources: readonly {
    readonly nutrient: string;
    readonly value: string;
    readonly unit: string;
    readonly sourceId: string;
    readonly sourceDate: string;
    readonly evidenceType: string;
    readonly method?: string;
  }[];
  readonly finishedNutritionSelected: boolean;
  readonly retentionSelected: boolean;
  readonly retentionSources: readonly {
    readonly nutrient: NutrientId;
    readonly percentage: string;
    readonly sourceId: string;
    readonly sourceDate: string;
    readonly startingMass: string;
    readonly finishedMass: string;
  }[];
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validNumber(value: string, positive = false): boolean {
  return /^\d+(\.\d+)?$/.test(value) && Number.isFinite(Number(value))
    && (!positive || Number(value) > 0);
}
export function usableNutritionSource(value: { sourceId: string; sourceDate: string; evidenceType?: string }): boolean {
  return value.sourceDate === '' || validDate(value.sourceDate);
}

function densityAdjustedValue(value: string, gramsPerMillilitre: string): string {
  const adjusted = divideDecimals(value, gramsPerMillilitre);
  if (adjusted === '0' && compareDecimals(value, '0') > 0) {
    throw new RangeError('Density conversion needs greater calculation precision');
  }
  return adjusted;
}

export function usableIngredientDensity(record: IngredientRecord): boolean {
  return usableNutritionDensity(record.ingredientDensity);
}

export function usableNutritionDensity(density: IngredientRecord['ingredientDensity']): boolean {
  return Boolean(density && validNumber(density.gramsPerMillilitre, true)
    && (density.sourceDate === '' || validDate(density.sourceDate)));
}

export function ingredientNutrientPer100g(
  record: IngredientRecord,
  key: 'protein' | 'fat' | 'saturatedFat' | 'carbohydrate' | 'sugars' | 'sodium',
): NutrientEvidence | undefined {
  const mass = record.nutrientProfile?.values[key];
  if (mass) return mass;
  const volume = record.nutritionPer100mL?.[key];
  const density = record.ingredientDensity;
  if (!volume || !density || !usableIngredientDensity(record)
    || !validNumber(volume.value) || !usableNutritionSource(volume)) return undefined;
  const result = convertVolumeNutrientToMass({
    value: volume.value,
    unit: key === 'sodium' ? 'mg/100mL' : 'g/100mL',
    sourceId: volume.sourceId,
    sourceDate: volume.sourceDate,
    evidenceType: volume.evidenceType ?? 'supplier',
  }, density);
  if (result.status === 'review_required' && result.reason === 'INSUFFICIENT_NUTRIENT_PRECISION') {
    throw new RangeError('Density conversion needs greater calculation precision');
  }
  return result.status === 'converted' ? result.evidence : undefined;
}

export function ingredientEnergyPer100g(record: IngredientRecord): IngredientRecord['energyPer100g'] {
  if (record.energyPer100g) return record.energyPer100g;
  const volume = record.nutritionPer100mL?.energy;
  const density = record.ingredientDensity;
  if (!volume || !density || !usableIngredientDensity(record)
    || !validNumber(volume.value) || !usableNutritionSource(volume)) return undefined;
  const value = densityAdjustedValue(volume.value, density.gramsPerMillilitre);
  return { ...volume, value };
}

function optionalNutrientPer100g(record: IngredientRecord, key: AdditionalNutrientId): {
  readonly evidence?: NutrientEvidence;
  readonly precisionInsufficient?: boolean;
} {
  const mass = record.nutrientProfile?.values[key];
  if (mass) return { evidence: mass };
  const volume = record.additionalNutritionPer100mL?.[key];
  const density = record.ingredientDensity;
  if (!volume || !density || !usableIngredientDensity(record)
    || !validNumber(volume.value) || !usableNutritionSource(volume)) return {};
  const result = convertVolumeNutrientToMass(volume, density);
  return result.status === 'converted'
    ? { evidence: result.evidence }
    : { precisionInsufficient: result.reason === 'INSUFFICIENT_NUTRIENT_PRECISION' };
}

export function compareNutritionBases(
  record: IngredientRecord,
  key: BaseNutritionId | AdditionalNutrientId,
): string | undefined {
  const mass = key === 'energy' ? record.energyPer100g : record.nutrientProfile?.values[key];
  const volume = key === 'energy' || key === 'protein' || key === 'fat' || key === 'saturatedFat'
    || key === 'carbohydrate' || key === 'sugars' || key === 'sodium'
    ? record.nutritionPer100mL?.[key]
    : record.additionalNutritionPer100mL?.[key];
  if (!mass || !volume) return undefined;
  if (!validNumber(mass.value) || !validNumber(volume.value)) {
    return `${record.name}: ${key} values need review before their mass and volume bases can be compared`;
  }
  const density = record.ingredientDensity;
  if (!density || !usableIngredientDensity(record)) {
    return `${record.name}: ingredient density is needed to compare ${key} per 100 g and per 100 mL`;
  }
  let massValue = mass.value;
  const nutrientMass = key === 'energy' ? undefined : record.nutrientProfile?.values[key];
  if (nutrientMass) {
    const volumeExpression = 'expression' in volume && typeof volume.expression === 'string' ? volume.expression : 'nutrientAmount';
    if ((nutrientMass.expression ?? 'nutrientAmount') !== volumeExpression) {
      return `${record.name}: ${key} mass and volume values use different nutrient expressions; review the figures`;
    }
    const volumeUnit = 'unit' in volume ? volume.unit : key === 'sodium' ? 'mg/100mL' : 'g/100mL';
    const targetUnit = volumeUnit === 'mg/100mL' ? 'mg/100g' : volumeUnit === 'ug/100mL' ? 'ug/100g' : 'g/100g';
    massValue = convertNutrientUnit(massValue, nutrientMass.unit, targetUnit);
  }
  return compareDecimals(multiplyDecimals(massValue, density.gramsPerMillilitre), volume.value) === 0
    ? undefined
    : `${record.name}: ${key} values per 100 g and per 100 mL differ after density conversion; review the figures and rounding`;
}

export function calculateIngoingNutritionRow(
  row: typeof nutritionRows[number],
  expanded: readonly ExpandedIngredient[],
  byId: ReadonlyMap<string, IngredientRecord>,
): { value?: string; sources: NipDraft['sources']; missing: readonly string[] } {
  const missing: string[] = [];
  const sources: NipDraft['sources'][number][] = [];
  if (row.id === 'energy') {
    let weighted = '0';
    let total = '0';
    for (const ingredient of expanded) {
      const record = byId.get(ingredient.ingredientId);
      const energy = record && ingredientEnergyPer100g(record);
      if (!energy || !validNumber(energy.value) || !usableNutritionSource(energy)) {
        missing.push(`${record?.name ?? ingredient.ingredientId}: energy per 100 g or per 100 mL with ingredient density`);
        continue;
      }
      sources.push({
        nutrient: row.id, ingredientId: ingredient.ingredientId, sourcePath: ingredient.sourcePath,
        ingoingMass: ingredient.mass.value,
        value: energy.value, unit: 'kJ/100g', sourceId: energy.sourceId, sourceDate: energy.sourceDate,
        ...(record && !record.energyPer100g && record.ingredientDensity
          ? { method: `Converted using ingredient density ${record.ingredientDensity.gramsPerMillilitre} g/mL${record.ingredientDensity.evidenceReference ? `, ${record.ingredientDensity.evidenceReference}` : ''}${record.ingredientDensity.sourceDate ? `, ${record.ingredientDensity.sourceDate}` : ''}` }
          : {}),
      });
      weighted = addDecimals(weighted, multiplyDecimals(ingredient.mass.value, energy.value));
      total = addDecimals(total, ingredient.mass.value);
    }
    return {
      ...(expanded.length && !missing.length ? { value: divideDecimals(weighted, total) } : {}),
      sources, missing,
    };
  }
  if (!expanded.length) return { sources, missing };
  const input = expanded.map((ingredient) => {
    const record = byId.get(ingredient.ingredientId);
    const nutrient = record && ingredientNutrientPer100g(record, row.id);
    return {
      ingredient,
      ...(nutrient ? { profile: { ingredientId: ingredient.ingredientId, values: { [row.id]: nutrient } } } : {}),
    };
  });
  const complete = input.map(({ ingredient, profile }) => {
    const evidence = profile?.values[row.id];
    const valid = evidence && validNumber(evidence.value) && ['g/100g', 'mg/100g', 'ug/100g'].includes(evidence.unit)
      && usableNutritionSource(evidence);
    if (valid) sources.push({
      nutrient: row.id, ingredientId: ingredient.ingredientId, sourcePath: ingredient.sourcePath,
      ingoingMass: ingredient.mass.value,
      value: evidence.value, unit: evidence.unit, sourceId: evidence.sourceId, sourceDate: evidence.sourceDate,
      ...(evidence.method ? { method: evidence.method } : {}),
    });
    if (!valid) missing.push(`${byId.get(ingredient.ingredientId)?.name ?? ingredient.ingredientId}: nutrition information`);
    return valid;
  }).every(Boolean);
  if (!complete) return { sources, missing };
  const result = aggregateNutrients(input, [row.id]);
  if (result.status === 'calculated') {
    const value = result.nutrients[0]?.value;
    return { ...(value === undefined ? {} : { value }), sources, missing };
  }
  missing.push(result.reason === 'INCOMPATIBLE_NUTRIENT_EXPRESSION'
    ? `${row.label.trim()}: nutrient expression needs review`
    : `${row.label.trim()}: nutrient calculation needs review`);
  return { sources, missing };
}

export function makeNipDraft(
  product: ProductRecord,
  formulations: readonly FormulationRecord[],
  ingredients: readonly IngredientRecord[],
  claims: readonly LabelClaim[] = [],
): NipDraft {
  const missing = new Set<string>();
  const sources: NipDraft['sources'][number][] = [];
  const finishedSources: NipDraft['finishedSources'][number][] = [];
  const retentionSources: NipDraft['retentionSources'][number][] = [];
  const pack = product.packDetails;
  const form = pack?.nutritionFoodForm;
  const unit = form === 'liquid' ? 'mL' : form === 'solid' ? 'g' : undefined;
  const servingUnit = pack?.servingUnit;
  let canCalculate = true;
  if (!form) {
    missing.add('Choose whether the food is solid or liquid (pack details)');
    canCalculate = false;
  }
  if (product.claimFacts?.formOfFoodConfirmed && product.claimFacts.foodForm
    && form && product.claimFacts.foodForm !== form) {
    missing.add('The food form in pack details conflicts with the confirmed claims information');
    canCalculate = false;
  }
  if (product.foodState !== 'asSold') {
    missing.add('Nutrition is only supported for food as sold; preparation or processing needs consultant calculation');
    canCalculate = false;
  }
  if (product.preparation?.enabled && product.preparation.kind !== 'withFood') {
    missing.add('The preparation basis needs review; prepared nutrition is not connected to this label yet');
    canCalculate = false;
  }
  if (product.draining?.enabled) {
    missing.add('The drained nutrition basis needs review; drained nutrition is not connected to this label yet');
    canCalculate = false;
  }
  const directionsIssue = consumerDirectionsIssue(product);
  if (directionsIssue) {
    missing.add(directionsIssue);
    canCalculate = false;
  }
  const formAndStateReady = canCalculate;
  if (!unit || !servingUnit || !pack?.servingSize || !validNumber(pack.servingSize, true)) {
    canCalculate = false;
  }
  const density = pack?.nutritionDensity;
  const needsDensity = unit === 'mL' || servingUnit === 'mL';
  if (needsDensity && !usableNutritionDensity(density)) {
    missing.add('Final food density is needed for volume nutrition amounts');
    canCalculate = false;
  }
  if (claims.some((claim) => claim.classification !== 'not_code_regulated')) {
    missing.add('Claim-related nutrition rows need consultant review; this panel does not add them yet');
  }

  const byId = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const recipe = formulations.find((item) => item.id === product.formulationId);
  const finished = recipe?.finishedNutrition;
  const finishedNutritionSelected = finished?.selected === true;
  const retentionSelected = recipe?.nutrientRetention?.selected === true;
  let finishedCurrent = false;
  let recipeCurrent = false;
  let retentionInputs: ReturnType<typeof retentionRecipeInputs> | undefined;
  let expanded: ReturnType<typeof expandFormulation> = [];
  try {
    const signature = nutritionRecipeSignature(product.formulationId, formulations, ingredients);
    if (finishedNutritionSelected) {
      finishedCurrent = true;
    } else if (retentionSelected && recipe) {
      retentionInputs = retentionRecipeInputs(recipe, formulations, ingredients);
      expanded = retentionInputs.expanded;
    } else {
      expanded = expandNutritionComponents(
        expandFormulation(product.formulationId, { value: '100', unit: 'g' }, formulations),
        formulations, ingredients,
      );
      if (!expanded.length) throw new Error('The recipe has no ingredients.');
    }
    if (pack?.nutritionRecipeSignature !== signature) {
      missing.add('Confirm that the recipe and nutrients represent the food as sold (pack details)');
      canCalculate = false;
    } else {
      recipeCurrent = true;
    }
  } catch (error) {
    missing.add(`Nutrition recipe needs attention: ${error instanceof Error ? error.message : 'could not read recipe'}`);
    expanded = [];
    canCalculate = false;
  }
  const massFor = (quantity: string, amountUnit: 'g' | 'mL'): string =>
    amountUnit === 'mL' && density
      ? multiplyDecimals(quantity, density.gramsPerMillilitre)
      : quantity;
  const servingMass = canCalculate && servingUnit && pack?.servingSize
    ? massFor(pack.servingSize, servingUnit) : undefined;
  const unitMass = canCalculate && unit ? massFor('100', unit) : undefined;
  function retainedValue(id: NutrientId, value: string): string | undefined {
    if (!retentionSelected) return value;
    const factor = recipe?.nutrientRetention?.factors[id];
    if (!retentionInputs || !factor || !validNumber(factor.percentage)
      || compareDecimals(factor.percentage, '100') > 0
      || (factor.sourceDate !== '' && !validDate(factor.sourceDate))) {
      missing.add(`${id}: an applicable nutrient retention figure is needed`);
      return undefined;
    }
    const startingMass = retentionInputs.balance.ingoingMass.value;
    const finishedMass = retentionInputs.balance.finalMass.value;
    const adjusted = calculateRetainedNutrientPer100g(value, startingMass, finishedMass, factor.percentage);
    retentionSources.push({
      nutrient: id, percentage: factor.percentage, sourceId: factor.sourceId,
      sourceDate: factor.sourceDate, startingMass, finishedMass,
    });
    return adjusted;
  }
  const asSoldPer100g: Partial<Record<BaseNutritionId, string>> = {};
  const asSoldPerServing: Partial<Record<BaseNutritionId, string>> = {};
  const results = nutritionRows.map((row) => {
    let value: string | undefined;
    try {
      if (finishedNutritionSelected) {
        const evidence = row.id === 'energy' ? finished?.energyPer100g : finished?.nutrientProfile?.values[row.id];
        if (finishedCurrent && (!evidence || !validNumber(evidence.value) || !usableNutritionSource(evidence))) {
          missing.add(`Finished food: ${row.label.trim()} value or source needs review`);
        } else if (finishedCurrent && evidence) {
          finishedSources.push({
            nutrient: row.label.trim(), value: evidence.value,
            unit: 'unit' in evidence && typeof evidence.unit === 'string' ? evidence.unit : 'kJ/100g',
            sourceId: evidence.sourceId, sourceDate: evidence.sourceDate,
            evidenceType: evidence.evidenceType ?? 'supplier',
            ...('method' in evidence && typeof evidence.method === 'string' && evidence.method ? { method: evidence.method } : {}),
          });
          if (row.id === 'energy') {
            value = evidence.value;
          } else if ('unit' in evidence) {
            const result = aggregateNutrients([{
              ingredient: { ingredientId: product.formulationId, mass: { value: '100', unit: 'g' }, sourcePath: [product.formulationId] },
              profile: { ingredientId: product.formulationId, values: { [row.id]: evidence } },
            }], [row.id]);
            if (result.status === 'calculated') value = result.nutrients[0]?.value;
            else missing.add(`Finished food: ${row.label.trim()} expression or precision needs review`);
          }
        }
      } else if (retentionSelected && row.id === 'energy') {
        const energy = finished?.energyPer100g;
        const current = recipe && finished?.recipeSnapshot
          && finished.recipeSnapshot === finishedNutritionSnapshot(recipe, formulations, ingredients);
        if (retentionInputs && current && energy && validNumber(energy.value) && usableNutritionSource(energy)) {
          value = energy.value;
          finishedSources.push({
            nutrient: 'Energy', value: energy.value, unit: 'kJ/100g', sourceId: energy.sourceId,
            sourceDate: energy.sourceDate, evidenceType: energy.evidenceType ?? 'supplier',
          });
        } else {
          missing.add('Finished food: energy cannot be determined from nutrient retention percentages; a confirmed finished energy value is needed');
        }
      } else {
        const ingoing = calculateIngoingNutritionRow(row, expanded, byId);
        sources.push(...ingoing.sources);
        for (const item of ingoing.missing) missing.add(item);
        if (ingoing.value !== undefined) {
          value = row.id === 'energy' ? ingoing.value : retainedValue(row.id, ingoing.value);
        }
      }
    } catch (error) {
      missing.add(`${row.label.trim()}: nutrition data needs attention (${error instanceof Error ? error.message : 'invalid data'})`);
    }
    const conflictingBasis = !finishedNutritionSelected && expanded.some((item) => {
      const record = byId.get(item.ingredientId);
      return record && compareNutritionBases(record, row.id);
    });
    if (recipeCurrent && value !== undefined && !conflictingBasis) {
      asSoldPer100g[row.id] = value;
      if (servingMass !== undefined) {
        asSoldPerServing[row.id] = divideDecimals(multiplyDecimals(value, servingMass), '100');
      }
    }
    const format = (mass: string | undefined): string => value !== undefined && mass !== undefined
      ? `${formatNpcNutrient(divideDecimals(multiplyDecimals(value, mass), '100'), row.kind)} ${row.unit}`
      : 'Not available';
    return { label: row.label.trim(), serving: format(servingMass), unitQuantity: format(unitMass) };
  });
  const optionalNutrients: NipDraft['optionalNutrients'][number][] = [];
  const finishedOptionalNutrients: NipDraft['finishedOptionalNutrients'][number][] = [];
  for (const id of additionalNutrientIds) {
    if (!expanded.some((item) => {
      const record = byId.get(item.ingredientId);
      return record?.nutrientProfile?.values[id] || record?.additionalNutritionPer100mL?.[id];
    })) continue;
    const precisionMissing: { ingredientId: string; sourcePath: readonly string[]; nutrient: AdditionalNutrientId }[] = [];
    const input = expanded.map((ingredient) => {
      const record = byId.get(ingredient.ingredientId);
      const converted = record && optionalNutrientPer100g(record, id);
      const evidence = converted?.evidence;
      if (converted?.precisionInsufficient) precisionMissing.push({
        ingredientId: ingredient.ingredientId, sourcePath: ingredient.sourcePath, nutrient: id,
      });
      const valid = evidence && validNumber(evidence.value)
        && ['g/100g', 'mg/100g', 'ug/100g'].includes(evidence.unit) && usableNutritionSource(evidence);
      if (valid) sources.push({
        nutrient: id, ingredientId: ingredient.ingredientId, sourcePath: ingredient.sourcePath,
        ingoingMass: ingredient.mass.value,
        value: evidence.value, unit: evidence.unit, sourceId: evidence.sourceId, sourceDate: evidence.sourceDate,
        ...(evidence.method ? { method: evidence.method } : {}),
      });
      return { ingredient, ...(valid ? { profile: { ingredientId: ingredient.ingredientId, values: { [id]: evidence } } } : {}) };
    });
    const calculation: NutrientAggregationResult = precisionMissing.length > 0
      ? { status: 'review_required', reason: 'INSUFFICIENT_NUTRIENT_PRECISION', missing: precisionMissing }
      : aggregateNutrients(input, [id]);
    optionalNutrients.push({ id, result: calculation });
    if (retentionSelected && retentionInputs) {
      if (calculation.status === 'calculated' && calculation.nutrients[0]) {
        try {
          const nutrient = calculation.nutrients[0];
          const value = retainedValue(id, nutrient.value);
          finishedOptionalNutrients.push({ id, result: value === undefined
            ? { status: 'review_required', reason: 'MISSING_RETENTION_EVIDENCE' }
            : { status: 'available', value, unit: nutrient.unit } });
        } catch (error) {
          missing.add(`${id}: nutrient retention needs attention (${error instanceof Error ? error.message : 'invalid data'})`);
          finishedOptionalNutrients.push({ id, result: { status: 'review_required', reason: 'INSUFFICIENT_NUTRIENT_PRECISION' } });
        }
      } else if (calculation.status === 'review_required') {
        finishedOptionalNutrients.push({ id, result: { status: 'review_required', reason: calculation.reason } });
      }
    }
  }
  if (finishedCurrent && finished?.nutrientProfile) {
    for (const id of additionalNutrientIds) {
      const evidence = finished.nutrientProfile.values[id];
      if (!evidence) continue;
      const ingredient = {
        ingredientId: product.formulationId, mass: { value: '100', unit: 'g' as const }, sourcePath: [product.formulationId],
      };
      const valid = validNumber(evidence.value) && usableNutritionSource(evidence);
      if (valid) finishedSources.push({
        nutrient: id, value: evidence.value, unit: evidence.unit, sourceId: evidence.sourceId, sourceDate: evidence.sourceDate,
        evidenceType: evidence.evidenceType,
        ...(evidence.method ? { method: evidence.method } : {}),
      });
      const calculation = aggregateNutrients([{
        ingredient, ...(valid ? { profile: { ingredientId: product.formulationId, values: { [id]: evidence } } } : {}),
      }], [id]);
      if (calculation.status === 'calculated') {
        const nutrient = calculation.nutrients[0];
        if (!nutrient) throw new Error('Finished nutrient calculation returned no value.');
        finishedOptionalNutrients.push({ id, result: { status: 'available', value: nutrient.value, unit: nutrient.unit } });
      } else {
        finishedOptionalNutrients.push({ id, result: { status: 'review_required', reason: calculation.reason } });
      }
    }
  }
  const conflictingNutrients = new Set<BaseNutritionId | AdditionalNutrientId>();
  for (const item of expanded) {
    const record = byId.get(item.ingredientId);
    if (!record) continue;
    for (const id of [...nutritionRows.map((row) => row.id), ...additionalNutrientIds]) {
      const issue = compareNutritionBases(record, id);
      if (issue) {
        missing.add(issue);
        conflictingNutrients.add(id);
      }
    }
  }
  return {
    rows: results,
    asSoldPer100g,
    asSoldPerServing,
    asSoldBasisReady: formAndStateReady && recipeCurrent && (unit !== 'mL' || usableNutritionDensity(density)),
    asSoldServingMassGrams: servingMass,
    conflictingNutrients: [...conflictingNutrients],
    unitHeading: unit ? `Average per 100 ${unit}` : 'Average per 100 g or mL',
    servingSize: pack?.servingSize && servingUnit ? `${pack.servingSize} ${servingUnit}` : 'Not supplied',
    servingsPerPack: pack?.servingsPerPack ?? 'Not supplied',
    missing: [...missing],
    sources,
    optionalNutrients,
    finishedOptionalNutrients,
    finishedNutritionSelected,
    finishedSources,
    retentionSelected,
    retentionSources,
  };
}
