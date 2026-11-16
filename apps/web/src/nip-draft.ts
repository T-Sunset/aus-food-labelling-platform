import {
  addDecimals, aggregateNutrients, divideDecimals, expandFormulation, formatNpcNutrient, multiplyDecimals,
} from '@aus-food/engine';
import type { FormulationRecord, IngredientRecord, ProductRecord } from '@aus-food/storage';
import type { NutrientEvidence } from '@aus-food/domain';
import { nutritionRecipeSignature } from './product-form';
import { expandNutritionComponents } from './nutrition-components';

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
function usableSource(value: { sourceId: string; sourceDate: string; evidenceType?: string }): boolean {
  return Boolean(value.sourceId.trim() && validDate(value.sourceDate))
    || (value.evidenceType === 'user' && value.sourceId === '' && value.sourceDate === '');
}

export function usableIngredientDensity(record: IngredientRecord): boolean {
  const density = record.ingredientDensity;
  return Boolean(density && validNumber(density.gramsPerMillilitre, true)
    && density.evidenceReference.trim() && validDate(density.sourceDate));
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
    || !validNumber(volume.value) || !usableSource(volume)) return undefined;
  return {
    value: divideDecimals(volume.value, density.gramsPerMillilitre),
    unit: key === 'sodium' ? 'mg/100g' : 'g/100g',
    sourceId: volume.sourceId,
    sourceDate: volume.sourceDate,
    evidenceType: volume.evidenceType ?? 'supplier',
    method: `Converted using ingredient density ${density.gramsPerMillilitre} g/mL, ${density.evidenceReference}, ${density.sourceDate}`,
  };
}

function ingredientEnergyPer100g(record: IngredientRecord): IngredientRecord['energyPer100g'] {
  if (record.energyPer100g) return record.energyPer100g;
  const volume = record.nutritionPer100mL?.energy;
  const density = record.ingredientDensity;
  if (!volume || !density || !usableIngredientDensity(record)
    || !validNumber(volume.value) || !usableSource(volume)) return undefined;
  return { ...volume, value: divideDecimals(volume.value, density.gramsPerMillilitre) };
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
    expanded = expandNutritionComponents(
      expandFormulation(product.formulationId, { value: '100', unit: 'g' }, formulations),
      formulations, ingredients,
    );
    if (!expanded.length) throw new Error('The recipe has no ingredients.');
    if (pack?.nutritionRecipeSignature !== nutritionRecipeSignature(product.formulationId, formulations, ingredients)) {
      missing.add('Confirm that the recipe and nutrients represent the food as sold (pack details)');
      canCalculate = false;
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
  const results = rows.map((row) => {
    let value: string | undefined;
    try {
      if (row.id === 'energy') {
        let weighted = '0';
        let total = '0';
        for (const ingredient of expanded) {
          const record = byId.get(ingredient.ingredientId);
          const energy = record && ingredientEnergyPer100g(record);
          if (!energy || !validNumber(energy.value) || !usableSource(energy)) {
            missing.add(`${record?.name ?? ingredient.ingredientId}: energy per 100 g or per 100 mL with ingredient density`);
            continue;
          }
          if (!energy.sourceId || !energy.sourceDate) missing.add(`${record?.name ?? ingredient.ingredientId}: nutrition source not recorded; review entered values`);
          weighted = addDecimals(weighted, multiplyDecimals(ingredient.mass.value, energy.value));
          total = addDecimals(total, ingredient.mass.value);
        }
        if (expanded.length && expanded.every((ingredient) => {
          const record = byId.get(ingredient.ingredientId);
          const energy = record && ingredientEnergyPer100g(record);
          return energy && validNumber(energy.value) && usableSource(energy);
        })) value = divideDecimals(weighted, total);
      } else if (expanded.length) {
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
          const valid = evidence && validNumber(evidence.value) && ['g/100g', 'mg/100g'].includes(evidence.unit)
            && usableSource(evidence);
          if (valid && (!evidence.sourceId || !evidence.sourceDate)) missing.add(`${byId.get(ingredient.ingredientId)?.name ?? ingredient.ingredientId}: nutrition source not recorded; review entered values`);
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
