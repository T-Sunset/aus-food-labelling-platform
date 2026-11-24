import { divideDecimals, formatNpcNutrient, multiplyDecimals } from '@aus-food/engine';
import type { FormulationRecord, IngredientRecord, ProductRecord } from '@aus-food/storage';
import { nutritionRows } from './nip-draft';
import { drainingSnapshot, preparationRecipeSignature } from './product-form';
import { consumerDirectionsIssue } from './consumer-directions';

export interface DrainedNutritionDraft {
  readonly directions: string;
  readonly servingGrams?: string;
  readonly sourceType?: string;
  readonly sourceReference?: string;
  readonly sourceDate?: string;
  readonly rows: readonly {
    readonly label: string; readonly per100g: string; readonly serving: string; readonly input?: string;
  }[];
  readonly missing: readonly string[];
}

export function makeDrainedNutritionDraft(
  product: ProductRecord,
  formulations: readonly FormulationRecord[],
  ingredients: readonly IngredientRecord[],
): DrainedNutritionDraft | undefined {
  const draining = product.draining;
  if (!draining?.enabled && product.foodState !== 'asDrained') return undefined;
  const missing = new Set<string>();
  const signature = preparationRecipeSignature(product.formulationId, formulations, ingredients);
  const servingGrams = product.foodState === 'asDrained' && product.packDetails?.servingUnit === 'g'
    ? product.packDetails.servingSize : draining?.servingGrams;
  const sourceDateValid = !draining?.sourceDate || (() => {
    const date = new Date(`${draining.sourceDate}T00:00:00Z`);
    return /^\d{4}-\d{2}-\d{2}$/.test(draining.sourceDate)
      && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === draining.sourceDate;
  })();
  const confirmed = Boolean(draining?.confirmationSnapshot && signature
    && draining.confirmationSnapshot === drainingSnapshot(draining, signature));
  if (!draining?.directions?.trim()) missing.add('Record the draining directions');
  if (!sourceDateValid) missing.add('Check the drained nutrition source date');
  if (!confirmed) missing.add('Confirm that the values describe this recipe after the recorded draining directions');
  if (!servingGrams) missing.add('Drained serving size is not recorded');
  const overlapping = Boolean(product.preparation?.enabled || !product.foodState || !['asSold', 'asDrained'].includes(product.foodState));
  if (overlapping) missing.add('Draining together with another preparation or food state needs review');
  const directionsIssue = consumerDirectionsIssue(product);
  if (directionsIssue) missing.add(directionsIssue);
  const ready = Boolean(draining?.enabled && draining.directions?.trim() && sourceDateValid && confirmed && !overlapping && !directionsIssue);
  const rows = nutritionRows.map((row) => {
    const value = draining?.values[row.id];
    if (value === undefined) missing.add(`${row.label.trim()}: drained food value is not recorded`);
    const valid = value !== undefined && /^\d+(\.\d+)?$/.test(value) && Number.isFinite(Number(value));
    if (value !== undefined && !valid) missing.add(`${row.label.trim()}: drained food value needs attention`);
    const format = (amount: string) => `${formatNpcNutrient(amount, row.kind)} ${row.unit}`;
    return {
      label: row.label.trim(),
      per100g: ready && valid ? format(value) : 'Not available',
      serving: ready && valid && servingGrams
        ? format(divideDecimals(multiplyDecimals(value, servingGrams), '100')) : 'Not available',
      ...(valid ? { input: `${value} ${row.unit}/100 g` } : {}),
    };
  });
  return {
    directions: draining?.directions ?? '',
    ...(servingGrams ? { servingGrams } : {}),
    ...(draining?.sourceType ? { sourceType: draining.sourceType } : {}),
    ...(draining?.sourceReference ? { sourceReference: draining.sourceReference } : {}),
    ...(draining?.sourceDate ? { sourceDate: draining.sourceDate } : {}),
    rows,
    missing: [...missing],
  };
}
