import { aggregateNutrients, calculateMixedNutrientPer100g, divideDecimals, formatNpcNutrient, multiplyDecimals } from '@aus-food/engine';
import type { FormulationRecord, IngredientRecord, ProductRecord } from '@aus-food/storage';
import {
  compareNutritionBases, ingredientEnergyPer100g, ingredientNutrientPer100g, nutritionRows, usableIngredientDensity,
  usableNutritionDensity, usableNutritionSource, type NipDraft,
} from './nip-draft';
import { preparationRecipeSignature, preparationSnapshot } from './product-form';
import { consumerDirectionsIssue } from './consumer-directions';

export interface PreparedNutritionDraft {
  readonly basis: 'reconstituted' | 'withFood' | 'unknown';
  readonly directions: string;
  readonly addedFood: string;
  readonly productMass?: string;
  readonly addedMass?: string;
  readonly preparedServing?: { readonly value: string; readonly unit: 'g' | 'mL' };
  readonly rows: readonly { readonly label: string; readonly per100g: string; readonly serving: string }[];
  readonly missing: readonly string[];
  readonly densities: readonly { readonly subject: string; readonly value: string; readonly sourceId: string; readonly sourceDate: string }[];
  readonly sources: readonly {
    readonly nutrient: string; readonly value: string; readonly unit: string;
    readonly sourceId: string; readonly sourceDate: string; readonly method?: string;
  }[];
}

export function makePreparedNutritionDraft(
  product: ProductRecord,
  formulations: readonly FormulationRecord[],
  ingredients: readonly IngredientRecord[],
  asSold: NipDraft,
): PreparedNutritionDraft | undefined {
  const preparation = product.preparation;
  if (!preparation?.enabled) return undefined;
  const missing = new Set<string>();
  const sources: PreparedNutritionDraft['sources'][number][] = [];
  const densities: PreparedNutritionDraft['densities'][number][] = [];
  const addition = ingredients.find((item) => item.id === preparation.addedIngredientId);
  const recipeSignature = preparationRecipeSignature(product.formulationId, formulations, ingredients);
  if (!preparation.kind) missing.add('Choose the preparation type');
  if (!preparation.directions?.trim()) missing.add('Record the preparation directions');
  if (!addition) missing.add('Choose an available added food or liquid');
  const confirmed = Boolean(preparation.mixingConfirmed && preparation.confirmationSnapshot && addition && recipeSignature
    && preparation.confirmationSnapshot === preparationSnapshot(
      preparation, product.formulationId, addition, product.packDetails?.nutritionDensity, recipeSignature,
    ));
  if (!confirmed) missing.add('Confirm the amounts match the directions and mixing causes no other changes');
  if (addition?.kind === 'compound' && addition.compoundNutritionBasis === 'components') {
    missing.add('Added foods using component nutrition need review for preparation');
  }
  if (!product.foodState || !['asSold', 'asPrepared', 'asReconstituted'].includes(product.foodState)) {
    missing.add('This food state is not supported for the preparation calculation');
  }
  if (product.foodState === 'asReconstituted' && preparation.kind === 'withFood') {
    missing.add('The preparation type conflicts with the selected reconstituted food state');
  }
  if (product.draining?.enabled) missing.add('Preparation together with draining needs review');
  const directionsIssue = consumerDirectionsIssue(product);
  if (directionsIssue) missing.add(directionsIssue);

  function mass(
    amount: { readonly value: string; readonly unit: 'g' | 'mL' } | undefined,
    density: IngredientRecord['ingredientDensity'],
    label: string,
  ): string | undefined {
    if (!amount || !/^\d+(\.\d+)?$/.test(amount.value)
      || !Number.isFinite(Number(amount.value)) || Number(amount.value) <= 0) {
      missing.add(`${label} amount is needed`);
      return undefined;
    }
    if (amount.unit === 'g') return amount.value;
    if (!density || !usableNutritionDensity(density)) {
      missing.add(`${label} density is needed for volume amounts`);
      return undefined;
    }
    return multiplyDecimals(amount.value, density.gramsPerMillilitre);
  }

  const productMass = mass(preparation.productAmount, product.packDetails?.nutritionDensity, 'Product');
  const addedMass = mass(preparation.addedAmount, addition?.ingredientDensity, 'Added food');
  const servingMass = preparation.preparedServing
    ? mass(preparation.preparedServing, preparation.preparedDensity, 'Prepared food') : undefined;
  for (const [subject, density, needed] of [
    ['Product', product.packDetails?.nutritionDensity, preparation.productAmount?.unit === 'mL'],
    ['Added food', addition?.ingredientDensity, preparation.addedAmount?.unit === 'mL'
      || Boolean(addition?.nutritionPer100mL && usableIngredientDensity(addition))],
    ['Prepared food', preparation.preparedDensity, preparation.preparedServing?.unit === 'mL'],
  ] as const) {
    if (needed && density && usableNutritionDensity(density)) densities.push({
      subject, value: density.gramsPerMillilitre, sourceId: density.evidenceReference, sourceDate: density.sourceDate,
    });
  }
  if (!preparation.preparedServing) missing.add('Prepared serving size is not recorded');
  const ready = Boolean(preparation.kind && preparation.directions?.trim() && confirmed
    && addition && !(addition.kind === 'compound' && addition.compoundNutritionBasis === 'components')
    && productMass && addedMass
    && !product.draining?.enabled
    && !directionsIssue
    && ['asSold', 'asPrepared', 'asReconstituted'].includes(product.foodState ?? '')
    && !(product.foodState === 'asReconstituted' && preparation.kind === 'withFood'));
  if (!Object.keys(asSold.asSoldPer100g).length) missing.add('Confirm the as-sold recipe and its nutrition information first');

  const results = nutritionRows.map((row) => {
    let value: string | undefined;
    if (ready && addition && productMass && addedMass) {
      try {
        const base = asSold.asSoldPer100g[row.id];
        const conflict = compareNutritionBases(addition, row.id);
        const evidence = row.id === 'energy'
          ? ingredientEnergyPer100g(addition)
          : ingredientNutrientPer100g(addition, row.id);
        if (base === undefined) {
          missing.add(`${row.label.trim()}: as-sold value needs review`);
        } else if (conflict) {
          missing.add(conflict);
        } else if (!evidence || !usableNutritionSource(evidence)) {
          missing.add(`${row.label.trim()}: added food nutrition or source needs review`);
        } else {
          let additionValue: string | undefined;
          if (row.id === 'energy') {
            additionValue = evidence.value;
          } else if ('unit' in evidence) {
            const result = aggregateNutrients([{
              ingredient: { ingredientId: addition.id, mass: { value: '100', unit: 'g' }, sourcePath: [addition.id] },
              profile: { ingredientId: addition.id, values: { [row.id]: evidence } },
            }], [row.id]);
            if (result.status === 'calculated') additionValue = result.nutrients[0]?.value;
            else missing.add(`${row.label.trim()}: added food nutrient form or value needs review`);
          }
          if (additionValue !== undefined) {
            value = calculateMixedNutrientPer100g(base, productMass, additionValue, addedMass);
            sources.push({
              nutrient: row.label.trim(), value: evidence.value,
              unit: 'unit' in evidence && typeof evidence.unit === 'string' ? evidence.unit : 'kJ/100g',
              sourceId: evidence.sourceId, sourceDate: evidence.sourceDate,
              ...('method' in evidence && typeof evidence.method === 'string' && evidence.method ? { method: evidence.method } : {}),
            });
          }
        }
      } catch (error) {
        missing.add(`${row.label.trim()}: preparation data needs attention (${error instanceof Error ? error.message : 'invalid data'})`);
      }
    }
    const format = (quantity: string): string => `${formatNpcNutrient(quantity, row.kind)} ${row.unit}`;
    return {
      label: row.label.trim(),
      per100g: value === undefined ? 'Not available' : format(value),
      serving: value === undefined || !servingMass ? 'Not available'
        : format(divideDecimals(multiplyDecimals(value, servingMass), '100')),
    };
  });
  if (addition && preparation.addedAmount?.unit === 'mL' && !usableIngredientDensity(addition)) {
    missing.add(`${addition.name}: added food density needs review`);
  }
  return {
    basis: preparation.kind ?? 'unknown',
    directions: preparation.directions ?? '',
    addedFood: addition?.name ?? 'Not chosen',
    ...(productMass ? { productMass } : {}),
    ...(addedMass ? { addedMass } : {}),
    ...(preparation.preparedServing ? { preparedServing: preparation.preparedServing } : {}),
    rows: results,
    missing: [...missing],
    densities,
    sources,
  };
}
