import {
  addDecimals, aggregateNutrients, divideDecimals, expandFormulation, formatNpcNutrient, multiplyDecimals,
} from '@aus-food/engine';
import type { FormulationRecord, IngredientRecord, ProductRecord } from '@aus-food/storage';
import { nutritionRecipeSignature } from './product-form';

const rows = [
  { id: 'energy', label: 'Energy', unit: 'kJ', kind: 'energy' },
  { id: 'protein', label: 'Protein', unit: 'g', kind: 'grams' },
  { id: 'fat', label: 'Fat, total', unit: 'g', kind: 'grams' },
  { id: 'saturatedFat', label: '- saturated', unit: 'g', kind: 'grams' },
  { id: 'carbohydrate', label: 'Carbohydrate', unit: 'g', kind: 'grams' },
  { id: 'sugars', label: '- sugars', unit: 'g', kind: 'grams' },
  { id: 'sodium', label: 'Sodium', unit: 'mg', kind: 'sodium' },
] as const;

export interface NipDraft {
  readonly rows: readonly { readonly label: string; readonly serving: string; readonly unitQuantity: string }[];
  readonly unitHeading: string;
  readonly servingSize: string;
  readonly servingsPerPack: string;
  readonly missing: readonly string[];
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

export function makeNipDraft(
  product: ProductRecord,
  formulations: readonly FormulationRecord[],
  ingredients: readonly IngredientRecord[],
): NipDraft {
  const missing = new Set<string>();
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
  if (!unit || !servingUnit || !pack?.servingSize || !validNumber(pack.servingSize, true)) {
    canCalculate = false;
  }
  const density = pack?.nutritionDensity;
  const needsDensity = unit === 'mL' || servingUnit === 'mL';
  if (needsDensity && (!density || !validNumber(density.gramsPerMillilitre, true)
    || !density.evidenceReference.trim() || !validDate(density.sourceDate))) {
    missing.add('Final food density and dated evidence are needed for volume nutrition amounts');
    canCalculate = false;
  }
  if (product.claims?.some((claim) => claim.classification !== 'not_code_regulated')) {
    missing.add('Claim-related nutrition rows need consultant review; this panel does not add them yet');
  }

  const byId = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  let expanded: ReturnType<typeof expandFormulation> = [];
  try {
    expanded = expandFormulation(product.formulationId, { value: '100', unit: 'g' }, formulations);
    if (!expanded.length) throw new Error('The recipe has no ingredients.');
    if (pack?.nutritionRecipeSignature !== nutritionRecipeSignature(product.formulationId, formulations)) {
      missing.add('Confirm that the recipe and nutrients represent the food as sold (pack details)');
      canCalculate = false;
    }
  } catch (error) {
    missing.add(`Nutrition recipe needs attention: ${error instanceof Error ? error.message : 'could not read recipe'}`);
    canCalculate = false;
  }
  const massFor = (quantity: string, amountUnit: 'g' | 'mL'): string =>
    amountUnit === 'mL' && density
      ? multiplyDecimals(quantity, density.gramsPerMillilitre)
      : quantity;
  const servingMass = canCalculate && servingUnit && pack?.servingSize
    ? massFor(pack.servingSize, servingUnit) : undefined;
  const unitMass = canCalculate && unit ? massFor('100', unit) : undefined;
  const input = expanded.map((ingredient) => {
    const profile = byId.get(ingredient.ingredientId)?.nutrientProfile;
    return { ingredient, ...(profile ? { profile } : {}) };
  });
  const results = rows.map((row) => {
    let value: string | undefined;
    try {
      if (row.id === 'energy') {
        let weighted = '0';
        let total = '0';
        for (const ingredient of expanded) {
          const record = byId.get(ingredient.ingredientId);
          const energy = record?.energyPer100g;
          if (!energy || !validNumber(energy.value) || !energy.sourceId.trim() || !validDate(energy.sourceDate)) {
            missing.add(`${record?.name ?? ingredient.ingredientId}: supplier energy per 100 g`);
            continue;
          }
          weighted = addDecimals(weighted, multiplyDecimals(ingredient.mass.value, energy.value));
          total = addDecimals(total, ingredient.mass.value);
        }
        if (expanded.length && expanded.every((ingredient) => {
          const energy = byId.get(ingredient.ingredientId)?.energyPer100g;
          return energy && validNumber(energy.value) && energy.sourceId.trim() && validDate(energy.sourceDate);
        })) value = divideDecimals(weighted, total);
      } else if (input.length) {
        const complete = input.map(({ ingredient, profile }) => {
          const evidence = profile?.values[row.id];
          const valid = evidence && validNumber(evidence.value) && ['g/100g', 'mg/100g'].includes(evidence.unit)
            && evidence.sourceId.trim() && validDate(evidence.sourceDate);
          if (!valid) missing.add(`${byId.get(ingredient.ingredientId)?.name ?? ingredient.ingredientId}: nutrition information`);
          return valid;
        }).every(Boolean);
        if (complete) {
          const result = aggregateNutrients(input, [row.id]);
          if (result.status === 'calculated') value = result.nutrients[0]?.value;
        }
      }
    } catch (error) {
      missing.add(`${row.label.trim()}: nutrition data needs attention (${error instanceof Error ? error.message : 'invalid data'})`);
    }
    const format = (mass: string | undefined): string => value !== undefined && mass !== undefined
      ? `${formatNpcNutrient(divideDecimals(multiplyDecimals(value, mass), '100'), row.kind)} ${row.unit}`
      : 'Not available';
    return { label: row.label.trim(), serving: format(servingMass), unitQuantity: format(unitMass) };
  });
  return {
    rows: results,
    unitHeading: unit ? `Average per 100 ${unit}` : 'Average per 100 g or mL',
    servingSize: pack?.servingSize && servingUnit ? `${pack.servingSize} ${servingUnit}` : 'Not supplied',
    servingsPerPack: pack?.servingsPerPack ?? 'Not supplied',
    missing: [...missing],
  };
}
