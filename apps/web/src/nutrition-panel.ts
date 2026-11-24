import { addDecimals, compareDecimals, divideDecimals, multiplyDecimals, roundDecimalHalfUp } from '@aus-food/engine';
import type { ProductRecord } from '@aus-food/storage';
import { consumerDirectionsIssue } from './consumer-directions';
import type { DrainedNutritionDraft } from './drained-nutrition';
import { nutritionRows, usableNutritionDensity, type NipDraft } from './nip-draft';
import type { PreparedNutritionDraft } from './prepared-nutrition';
import { dailyIntakeReferenceSet } from './rule-data';

export interface NutritionPanel {
  readonly basis: 'asSold' | 'reconstituted' | 'drained' | 'review';
  readonly dailyIntakeStatus: 'notIncluded' | 'included' | 'needsReview';
  readonly dailyIntakeIssue?: string;
  readonly dailyIntakeStatement?: string;
  readonly dailyIntakeRoundingPolicy?: string;
  readonly servingSize: string;
  readonly servingsPerPack: string;
  readonly unitHeading: string;
  readonly combinedHeading?: string;
  readonly combinedDescription?: string;
  readonly note: string;
  readonly rows: readonly {
    readonly label: string;
    readonly serving: string;
    readonly unitQuantity: string;
    readonly dailyIntake?: string;
    readonly combined?: string;
  }[];
  readonly missing: readonly string[];
}

type BaseNutritionPanel = Omit<
  NutritionPanel,
  'dailyIntakeStatus' | 'dailyIntakeIssue' | 'dailyIntakeStatement' | 'dailyIntakeRoundingPolicy'
>;

function makeBaseNutritionPanel(
  product: ProductRecord,
  nutrition: NipDraft,
  prepared?: PreparedNutritionDraft,
  drained?: DrainedNutritionDraft,
): BaseNutritionPanel {
  const unavailable = () => nutrition.rows.map((row) => ({
    label: row.label, serving: 'Not available', unitQuantity: 'Not available',
  }));
  const review = (reason: string): BaseNutritionPanel => ({
    basis: 'review', servingSize: 'Not available', servingsPerPack: nutrition.servingsPerPack,
    unitHeading: 'Basis needs review', note: reason, rows: unavailable(), missing: [reason],
  });
  const directionsIssue = consumerDirectionsIssue(product);
  if (directionsIssue) return review(directionsIssue);
  if (prepared && drained) return review('Combined preparation and draining need review before a nutrition basis can be shown.');
  if (drained) return {
    basis: 'drained',
    servingSize: drained.servingGrams ? `${drained.servingGrams} g` : 'Not supplied',
    servingsPerPack: 'Needs review',
    unitHeading: 'Average per 100 g',
    note: 'Drained food draft. Check that the food form, serving and applicable panel requirements are correct.',
    rows: drained.rows.map((row) => ({ label: row.label, serving: row.serving, unitQuantity: row.per100g })),
    missing: [...drained.missing, 'Review servings per package for the drained serving'],
  };
  if (prepared?.basis === 'reconstituted') return {
    basis: 'reconstituted',
    servingSize: prepared.preparedServing
      ? `${prepared.preparedServing.value} ${prepared.preparedServing.unit}` : 'Not supplied',
    servingsPerPack: 'Needs review',
    unitHeading: prepared.preparedServing?.unit === 'mL' ? 'Average per 100 mL' : 'Average per 100 g',
    note: 'Reconstituted food draft. Confirm the preparation fluid, applicable provisions and whether the prepared food requires a 100 g or 100 mL unit quantity.',
    rows: prepared.rows.map((row) => ({
      label: row.label, serving: row.serving,
      unitQuantity: prepared.preparedServing?.unit === 'mL' ? 'Not available' : row.per100g,
    })),
    missing: [
      ...prepared.missing,
      'Review the reconstituted food form, unit quantity and applicable provisions',
      'Review servings per package for the reconstituted serving',
      ...(prepared.preparedServing?.unit === 'mL' ? ['Prepared nutrition per 100 mL is not yet supported'] : []),
    ],
  };
  if (prepared && prepared.basis !== 'withFood') return review('The preparation basis needs review.');
  if (product.foodState !== 'asSold') return review('The recorded food state needs review before a nutrition basis can be shown.');
  if (!prepared) return {
    basis: 'asSold', servingSize: nutrition.servingSize, servingsPerPack: nutrition.servingsPerPack,
    unitHeading: nutrition.unitHeading, note: 'As-sold food draft; check whether a nutrition panel is required.',
    rows: nutrition.rows, missing: [],
  };

  const preparation = product.preparation;
  const amount = preparation?.productAmount;
  const addedAmount = preparation?.addedAmount;
  const serving = preparation?.preparedServing;
  const pack = product.packDetails;
  const validNumber = (value: string | undefined) => value !== undefined
    && /^\d+(\.\d+)?$/.test(value) && Number.isFinite(Number(value)) && Number(value) > 0;
  const servingMass = serving?.unit === 'g' && validNumber(serving.value) ? serving.value
    : serving?.unit === 'mL' && validNumber(serving.value) && preparation?.preparedDensity
      && usableNutritionDensity(preparation.preparedDensity)
      ? multiplyDecimals(serving.value, preparation.preparedDensity.gramsPerMillilitre) : undefined;
  const matchedServing = Boolean(amount && validNumber(amount.value) && validNumber(pack?.servingSize)
    && pack?.servingSize && amount.unit === pack.servingUnit
    && compareDecimals(amount.value, pack.servingSize) === 0
    && prepared.productMass && prepared.addedMass && servingMass
    && compareDecimals(servingMass, addDecimals(prepared.productMass, prepared.addedMass)) === 0);
  const combinedHeading = `With ${prepared.addedFood}`;
  const missing = [...prepared.missing];
  if (!matchedServing) missing.push('The combined serving must match one product serving and the recorded added amount');
  return {
    basis: 'asSold', servingSize: nutrition.servingSize, servingsPerPack: nutrition.servingsPerPack,
    unitHeading: nutrition.unitHeading, combinedHeading,
    ...(matchedServing && addedAmount && validNumber(addedAmount.value)
      ? { combinedDescription: `Per serving with ${addedAmount.value} ${addedAmount.unit} of ${prepared.addedFood}.` } : {}),
    note: `Combined draft per product serving with ${addedAmount ? `${addedAmount.value} ${addedAmount.unit}` : 'an unknown amount'} of ${prepared.addedFood}. Check applicability and claim requirements.`,
    rows: nutrition.rows.map((row, index) => ({
      ...row, combined: matchedServing && row.serving !== 'Not available'
        ? prepared.rows[index]?.serving ?? 'Not available' : 'Not available',
    })),
    missing,
  };
}

const dailyIntakeRoundingPolicy = 'Nearest whole percent, half up (product display policy; not prescribed by the Code or FSANZ guidance).';

export function makeNutritionPanel(
  product: ProductRecord,
  nutrition: NipDraft,
  prepared?: PreparedNutritionDraft,
  drained?: DrainedNutritionDraft,
  includeDailyIntake = false,
): NutritionPanel {
  const panel = makeBaseNutritionPanel(product, nutrition, prepared, drained);
  if (!includeDailyIntake) return { ...panel, dailyIntakeStatus: 'notIncluded' };
  if (product.builderProductType === 'infantFood') {
    const reason = 'Food for infants uses the S12-6 nutrition panel format and need not comply with the ordinary %DI provisions; this format is not supported.';
    return {
      ...panel,
      dailyIntakeStatus: 'needsReview',
      dailyIntakeIssue: reason,
      missing: [...panel.missing, reason],
    };
  }
  if (product.builderProductType === 'caffeinatedBeverage') {
    const reason = 'Formulated caffeinated beverages have a special S12-5 nutrition panel format that is not supported here.';
    return {
      ...panel,
      dailyIntakeStatus: 'needsReview',
      dailyIntakeIssue: reason,
      missing: [...panel.missing, reason],
    };
  }
  if (product.builderProductType !== 'other') {
    const reason = 'Confirm the product type before showing the ordinary adult %DI values.';
    return {
      ...panel,
      dailyIntakeStatus: 'needsReview',
      dailyIntakeIssue: reason,
      missing: [...panel.missing, reason],
    };
  }
  if (panel.basis !== 'asSold') {
    const reason = 'Optional %DI is supported only for a confirmed as-sold general-food serving; prepared, drained and unresolved bases need review.';
    return {
      ...panel,
      dailyIntakeStatus: 'needsReview',
      dailyIntakeIssue: reason,
      missing: [...panel.missing, reason],
    };
  }
  const statement = dailyIntakeReferenceSet.statements[1];
  if (!statement) throw new Error('The draft daily-intake data is missing its statutory statement.');
  const missing = [...panel.missing];
  const rows = panel.rows.map((row, index) => {
    const nutrient = nutritionRows[index];
    if (!nutrient) throw new Error('The nutrition panel contains a row without a supported daily-intake mapping.');
    const reference = dailyIntakeReferenceSet.entries.find((entry) => entry.nutrientId === nutrient.id);
    if (!reference || reference.unit !== nutrient.unit || reference.inclusion !== 'whenIncluded') {
      throw new Error(`The draft daily-intake data does not match the ${nutrient.label.trim()} row.`);
    }
    const amount = nutrition.asSoldPerServing[nutrient.id];
    if (amount === undefined) {
      missing.push(`${nutrient.label.trim()}: %DI is unavailable because a reliable unrounded per-serving value is missing`);
      return { ...row, dailyIntake: 'Not available' };
    }
    return {
      ...row,
      dailyIntake: `${roundDecimalHalfUp(divideDecimals(multiplyDecimals(amount, '100'), reference.referenceValue))}%`,
    };
  });
  return {
    ...panel,
    dailyIntakeStatus: 'included',
    dailyIntakeStatement: statement,
    dailyIntakeRoundingPolicy,
    rows,
    missing,
  };
}
