import { compareDecimals, divideDecimals, evaluateClaim, illustrateRoutedClaim, multiplyDecimals, plainDecimal } from '@aus-food/engine';
import type {
  ClaimEvaluationValue,
  ClaimQuantityView,
  ClaimRoutingInput,
  EngineResult,
  EvaluationInputTrace,
  IllustrativeResult,
  LabelClaim,
} from '@aus-food/domain';
import type { ProductRecord } from '@aus-food/storage';
import { claimRoutingTrace, claimRuleTrace, claimRules } from './rule-data';
import type { ClaimRuleEntry } from './rule-data';
import { nutritionRows, type BaseNutritionId, type NipDraft } from './nip-draft';

export interface ClaimCheck {
  readonly claim: LabelClaim;
  readonly rule: ClaimRuleEntry | undefined;
  readonly official: EngineResult<ClaimEvaluationValue>;
  readonly nutrition?: ClaimNutrition;
  readonly nipInteraction?: ClaimNipInteraction;
  readonly guidance: readonly ClaimGuidance[];
  // Present only while the per-session illustrative preview is on (ADR-006).
  readonly preview?: IllustrativeResult<ClaimEvaluationValue>;
}

export interface ClaimNipInteraction {
  readonly requiredRows: readonly { readonly id: string; readonly label: string; readonly available: boolean }[];
  readonly message: string;
}

export interface ClaimGuidance {
  readonly id: string;
  readonly message: string;
  readonly action: 'claim' | 'product' | 'none';
}

interface ClaimNutrition {
  readonly amount?: ClaimQuantityView;
  readonly explanation: string;
  readonly inputs: readonly EvaluationInputTrace[];
}

const claimNutrients: Readonly<Record<string, { readonly id: BaseNutritionId | 'dietaryFibre'; readonly unit: string }>> = {
  'claim.low-energy': { id: 'energy', unit: 'kJ' },
  'claim.low-fat': { id: 'fat', unit: 'g' },
  'claim.low-sugars': { id: 'sugars', unit: 'g' },
  'claim.low-sodium': { id: 'sodium', unit: 'mg' },
  'claim.good-source-dietary-fibre': { id: 'dietaryFibre', unit: 'g' },
};

function claimNutrition(product: ProductRecord, rule: ClaimRuleEntry, nutrition: NipDraft): ClaimNutrition {
  const nutrient = claimNutrients[rule.id];
  const path = [product.id, product.formulationId];
  const unavailable = (reason: string): ClaimNutrition => ({
    explanation: `Nutrition amount unavailable: ${reason}`,
    inputs: [{ name: 'Claim nutrition calculation', value: reason, sourceId: 'saved Product nutrition', sourceDate: 'not supplied', sourcePath: path }],
  });
  if (!nutrient) return unavailable('This rule is not connected to Product nutrition.');
  const form = product.packDetails?.nutritionFoodForm;
  if (!nutrition.asSoldBasisReady || !form) {
    return unavailable('The saved as-sold nutrition basis, food form, recipe or density needs review.');
  }

  if (product.preparation?.enabled) {
    return unavailable('Prepared and combined-food claim nutrition is not connected to this check.');
  }
  if (product.claimFacts?.foodForm && product.claimFacts.foodForm !== form) {
    return unavailable('The saved claim food form conflicts with the Product nutrition food form.');
  }
  if (!nutrition.finishedNutritionSelected && nutrition.conflictingNutrients.includes(nutrient.id)) {
    return unavailable(`The saved ${nutrient.id} mass and volume nutrition figures need review.`);
  }
  let per100g: string | undefined;
  if (nutrient.id === 'dietaryFibre') {
    if (nutrition.finishedNutritionSelected || nutrition.retentionSelected) {
      const result = nutrition.finishedOptionalNutrients.find((entry) => entry.id === nutrient.id)?.result;
      if (result?.status === 'available' && result.unit === 'g/100g') per100g = result.value;
    } else {
      const result = nutrition.optionalNutrients.find((entry) => entry.id === nutrient.id)?.result;
      if (result?.status === 'calculated' && result.nutrients[0]?.unit === 'g/100g') per100g = result.nutrients[0].value;
    }
  } else {
    per100g = nutrition.asSoldPer100g[nutrient.id];
  }
  if (per100g === undefined) {
    return unavailable(`Reliable ${nutrient.id} nutrition is missing or cannot be calculated from the saved recipe.`);
  }
  let multiplier: string;
  let basis: string;
  if (rule.basis === 'perServing') {
    if (nutrition.asSoldServingMassGrams === undefined) return unavailable('A usable saved serving size is needed.');
    multiplier = nutrition.asSoldServingMassGrams;
    basis = `per serving (${nutrition.servingSize}; ${nutrition.asSoldServingMassGrams} g)`;
  } else if (form === 'liquid') {
    const density = product.packDetails?.nutritionDensity;
    if (!density) return unavailable('Final food density is needed for per 100 mL.');
    multiplier = density.gramsPerMillilitre;
    basis = `per 100 mL using final food density ${density.gramsPerMillilitre} g/mL`;
  } else {
    multiplier = '1';
    basis = 'per 100 g';
  }
  const scaled = multiplyDecimals(per100g, multiplier);
  const value = plainDecimal(rule.basis === 'perServing' ? divideDecimals(scaled, '100') : scaled);
  if (compareDecimals(per100g, '0') > 0 && value === '0') {
    return unavailable('The nutrient conversion needs greater calculation precision.');
  }
  const method = nutrition.finishedNutritionSelected || (nutrition.retentionSelected && nutrient.id === 'energy')
    ? 'saved finished-food nutrition'
    : nutrition.retentionSelected ? 'saved recipe nutrition and nutrient retention' : 'saved recipe and ingredient nutrition';
  const explanation = `${nutrient.id}: ${value} ${nutrient.unit} ${basis}, calculated from unrounded ${method}.`;
  const inputs: EvaluationInputTrace[] = [{
    name: 'Claim nutrition calculation', value: explanation, sourceId: method, sourceDate: 'not supplied', sourcePath: path,
  }, {
    name: `${nutrient.id} per 100 g before basis conversion`, value: per100g, unit: `${nutrient.unit}/100g`,
    sourceId: method, sourceDate: 'not supplied', sourcePath: path,
  }];
  if (rule.basis === 'perServing' && nutrition.asSoldServingMassGrams !== undefined) {
    inputs.push({
      name: 'Saved serving mass', value: nutrition.asSoldServingMassGrams, unit: 'g',
      sourceId: 'saved Product serving', sourceDate: 'not supplied', sourcePath: [product.id],
    });
  }
  const density = product.packDetails?.nutritionDensity;
  if (density && (form === 'liquid' || (rule.basis === 'perServing' && product.packDetails?.servingUnit === 'mL'))) {
    inputs.push({
      name: 'Final food density', value: density.gramsPerMillilitre, unit: 'g/mL',
      sourceId: density.evidenceReference || 'not supplied', sourceDate: density.sourceDate || 'not supplied', sourcePath: [product.id],
    });
  }
  const sourceLabel = nutritionRows.find((row) => row.id === nutrient.id)?.label.trim() ?? nutrient.id;
  for (const source of nutrition.sources.filter((entry) => entry.nutrient === nutrient.id)) {
    inputs.push({
      name: `${nutrient.id} ingredient nutrition (${source.ingoingMass} g ingoing${source.method ? `; ${source.method}` : ''})`,
      value: source.value, unit: source.unit, sourceId: source.sourceId || 'not supplied',
      sourceDate: source.sourceDate || 'not supplied', sourcePath: [product.id, ...source.sourcePath],
    });
  }
  for (const source of nutrition.finishedSources.filter((entry) => entry.nutrient === sourceLabel)) {
    inputs.push({
      name: `${nutrient.id} finished-food nutrition${source.method ? ` (${source.method})` : ''}`,
      value: source.value, unit: source.unit, sourceId: source.sourceId || 'not supplied',
      sourceDate: source.sourceDate || 'not supplied', sourcePath: path,
    });
  }
  for (const source of nutrition.retentionSources.filter((entry) => entry.nutrient === nutrient.id)) {
    inputs.push({
      name: `${nutrient.id} retention (${source.startingMass} g ingoing; ${source.finishedMass} g finished)`,
      value: source.percentage, unit: '%', sourceId: source.sourceId || 'not supplied',
      sourceDate: source.sourceDate || 'not supplied', sourcePath: path,
    });
  }
  return { amount: { value, unit: nutrient.unit }, explanation, inputs };
}

const claimNipRows: Readonly<Record<string, readonly { readonly id: string; readonly label: string }[]>> = {
  'claim.low-energy': [{ id: 'energy', label: 'Energy' }],
  'claim.low-fat': [{ id: 'fat', label: 'Fat, total' }],
  'claim.low-sugars': [
    { id: 'sugars', label: 'Sugars' },
    { id: 'dietaryFibre', label: 'Dietary fibre' },
  ],
  'claim.low-sodium': [
    { id: 'sodium', label: 'Sodium' },
    { id: 'potassium', label: 'Potassium' },
  ],
  'claim.good-source-dietary-fibre': [{ id: 'dietaryFibre', label: 'Dietary fibre' }],
};

function claimNipInteraction(rule: ClaimRuleEntry, nutrition: NipDraft): ClaimNipInteraction | undefined {
  const rows = claimNipRows[rule.id];
  if (!rows) return undefined;
  const available = (id: string): boolean => {
    if (id in nutrition.asSoldPer100g) return nutrition.asSoldPer100g[id as keyof typeof nutrition.asSoldPer100g] !== undefined;
    return nutrition.optionalNutrients.some((entry) => entry.id === id
      && entry.result.status === 'calculated'
      && entry.result.nutrients.length > 0);
  };
  return {
    requiredRows: rows.map((row) => ({ ...row, available: available(row.id) })),
    message: 'Claim-related NIP rows and applicable presentation remain REVIEW REQUIRED until the product-specific NIP pathway is reviewed.',
  };
}

export const CLAIM_LIMITATIONS: readonly string[] = [
  'Only the five first-set nutrition content claims are checked: low energy, low fat, low sugars, low sodium and good source of dietary fibre.',
  'Comparative, health, "no added", "free", protein, saturated fat, carbohydrate and unregulated-wording claims are review-only.',
  'Nutrition information panel rows and accompanying statements that a claim may trigger are not checked here. Treat them as REVIEW REQUIRED.',
  'Claims are not added to the draft label; the separate consultant report includes the entered wording and official review results.',
];

export function findClaimRule(claim: LabelClaim): ClaimRuleEntry | undefined {
  return claim.supportedClaimId === undefined
    ? undefined
    : claimRules.find((rule) => rule.id === claim.supportedClaimId);
}

export function buildClaimChecks(
  product: ProductRecord,
  illustrative: boolean,
  claims: readonly LabelClaim[],
  nutrition: NipDraft,
): readonly ClaimCheck[] {
  const facts = product.claimFacts;
  const savedForm = product.packDetails?.nutritionFoodForm;
  const foodForm = facts?.foodForm && facts.foodForm !== savedForm ? undefined : savedForm;
  return claims.map((claim): ClaimCheck => {
    const rule = findClaimRule(claim);
    const derived = rule ? claimNutrition(product, rule, nutrition) : undefined;
    const input: ClaimRoutingInput = {
      rule: rule ? claimRuleTrace(rule) : claimRoutingTrace(),
      ruleApproved: rule?.reviewStatus === 'reviewed',
      claimRule: rule,
      claim,
      foodForm,
      formOfFoodConfirmed: facts?.formOfFoodConfirmed,
      servingConfirmed: facts?.servingConfirmed,
      nutrientAmount: derived?.amount,
      prohibitedContexts: facts?.prohibitedContexts,
      sourcePath: [product.id, claim.id],
    };
    const evaluated = evaluateClaim(input);
    const official = derived ? {
      ...evaluated,
      inputs: [
        ...evaluated.inputs.map((entry) => entry.name.startsWith('Amount per ')
          ? { ...entry, sourceId: 'saved Product nutrition', sourceDate: 'not supplied', sourcePath: [product.id, product.formulationId] }
          : entry.name === 'Food form'
            ? { ...entry, sourceId: 'saved Product nutrition food form', sourceDate: 'not supplied', sourcePath: [product.id] }
            : entry.name === 'Claim text (as entered)'
              ? { ...entry, sourceId: 'Label claim', sourceDate: 'not supplied' }
          : entry),
        ...derived.inputs,
      ],
    } : evaluated;
    const reasons = new Set<string>(official.value?.reasons ?? []);
    const guidance: ClaimGuidance[] = [];
    if (!claim.classification || claim.classificationConfirmed !== true) {
      guidance.push({
        id: 'classification',
        message: 'Confirm the claim type here before relying on this check.',
        action: 'claim',
      });
    } else if (claim.classification !== 'nutrition_content') {
      guidance.push({
        id: 'unsupported-family',
        message: 'This claim family is review-only in the current release; no extra nutrition facts are requested.',
        action: 'none',
      });
    }
    if (reasons.has('CLAIM_NOT_LINKED_TO_RULE')) {
      guidance.push({
        id: 'rule-link',
        message: 'Select the existing supported rule that matches this wording, if one applies.',
        action: 'claim',
      });
    }
    if (claim.classification === 'nutrition_content' && !rule) {
      guidance.push({
        id: 'rule-selection',
        message: 'Select an existing supported rule if this wording belongs to one; otherwise leave it review-only.',
        action: 'claim',
      });
    }
    if (reasons.has('WORDING_NOT_PERMITTED')) {
      guidance.push({
        id: 'wording',
        message: 'Review the exact wording with a qualified reviewer; the system will not rewrite it.',
        action: 'claim',
      });
    }
    if (rule && derived?.amount === undefined) {
      guidance.push({
        id: 'nutrition',
        message: 'Review the saved Product nutrition, serving, food-state and recipe inputs. No nutrient amount is re-entered here.',
        action: 'product',
      });
    }
    if (['FORM_OF_FOOD_NOT_CONFIRMED', 'FOOD_FORM_MISSING', 'SERVING_NOT_CONFIRMED', 'EXCLUSIONS_NOT_CONFIRMED']
      .some((reason) => reasons.has(reason))) {
      guidance.push({
        id: 'product-facts',
        message: 'Review the relevant saved Product pack, serving, food-state and classification inputs.',
        action: 'product',
      });
    }
    const nipInteraction = rule ? claimNipInteraction(rule, nutrition) : undefined;
    const result = {
      claim,
      rule,
      official,
      guidance,
      ...(nipInteraction ? { nipInteraction } : {}),
      ...(derived ? { nutrition: derived } : {}),
    };
    return illustrative
      ? { ...result, preview: illustrateRoutedClaim(official, input) }
      : result;
  });
}
