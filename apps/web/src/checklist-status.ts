import type { EngineStatus, IllustrativeResult } from '@aus-food/domain';
import { REVIEWER_GATE_REASONS } from '@aus-food/engine';

export type ChecklistLabel = 'Entered information looks fine!' | 'Needs attention!' | 'Consultant review recommended';

export function usesIllustrativeOutcome(
  status: EngineStatus,
  reasons: readonly string[],
  preview?: IllustrativeResult<unknown>,
): boolean {
  return status === 'REVIEW REQUIRED' && preview?.officialStatus === status
    && preview.eligible === true && preview.blockedBy.length === 0
    && reasons.length > 0 && reasons.every((reason) => REVIEWER_GATE_REASONS.has(reason));
}

const attentionReasons = new Set([
  'CATEGORY_NOT_CONFIRMED', 'ADDITIVE_IDENTITY_MISSING', 'PURPOSE_MISSING', 'FOOD_STATE_MISSING',
  'GMP_NOT_CONFIRMED', 'CONCENTRATION_MISSING', 'EVIDENCE_MISSING', 'UNIT_MISMATCH', 'SOURCE_STATUS_NOT_ADDED',
  'CALCULATION_BASIS_MISMATCH', 'COHORT_NOT_CONFIRMED', 'SUGARS_MISSING',
  'SUGARS_BASIS_NOT_CONFIRMED', 'NAME_MISSING', 'CLAIM_NOT_LINKED_TO_RULE',
  'CLASSIFICATION_NOT_CONFIRMED', 'WORDING_NOT_PERMITTED', 'EXCLUSIONS_NOT_CONFIRMED',
  'FOOD_FORM_MISSING', 'FORM_OF_FOOD_NOT_CONFIRMED', 'SERVING_NOT_CONFIRMED',
  'AMOUNT_MISSING', 'PROHIBITED_CONTEXT',
]);

const guidance: Readonly<Record<string, string>> = {
  CATEGORY_NOT_CONFIRMED: 'Confirm the product category for the additive check.',
  ADDITIVE_IDENTITY_MISSING: 'Add the additive identity from the supplier information.',
  PURPOSE_MISSING: 'Enter the additive purpose from the supplier information.',
  FOOD_STATE_MISSING: 'Choose the state of the food being checked.',
  SOURCE_STATUS_NOT_ADDED: 'Check how this additive entered the food and ask a consultant to assess it.',
  GMP_NOT_CONFIRMED: 'Check the applicable manufacturing-practice information.',
  CONCENTRATION_MISSING: 'Add the information needed to calculate the additive amount.',
  EVIDENCE_MISSING: 'Add a dated evidence reference.',
  UNIT_MISMATCH: 'Check that the amount uses the requested unit.',
  CALCULATION_BASIS_MISMATCH: 'Check the calculation basis for the additive amount.',
  COHORT_NOT_CONFIRMED: 'Confirm the relevant product type for this check.',
  SUGARS_MISSING: 'Enter the added sugars amount.',
  SUGARS_BASIS_NOT_CONFIRMED: 'Confirm what the added sugars amount measures.',
  NAME_MISSING: 'Enter the proposed product name.',
  CLAIM_NOT_LINKED_TO_RULE: 'Choose a supported claim check, if one applies.',
  CLASSIFICATION_NOT_CONFIRMED: 'Choose and confirm the type of claim.',
  WORDING_NOT_PERMITTED: 'Ask a consultant to check the claim wording.',
  EXCLUSIONS_NOT_CONFIRMED: 'Answer the product-context questions for the claim.',
  FOOD_FORM_MISSING: 'Choose whether the food is solid or liquid.',
  FORM_OF_FOOD_NOT_CONFIRMED: 'Confirm which form of the food the figures describe.',
  SERVING_NOT_CONFIRMED: 'Confirm the serving information used by this check.',
  AMOUNT_MISSING: 'Enter the amount requested for the claim.',
  PROHIBITED_CONTEXT: 'Ask a consultant to assess the claim in this product context.',
};

export function checklistGuidance(reasons: readonly string[]): readonly string[] {
  return [...new Set(reasons.flatMap((reason) => guidance[reason] ? [guidance[reason]] : []))];
}

export function checklistLabel(
  status: EngineStatus,
  reasons: readonly string[],
  preview?: IllustrativeResult<unknown>,
): ChecklistLabel {
  if (status === 'FAIL' || status === 'WARNING' || reasons.some((reason) => attentionReasons.has(reason))) {
    return 'Needs attention!';
  }
  if (status === 'PASS') return 'Entered information looks fine!';
  if (usesIllustrativeOutcome(status, reasons, preview)) {
    if (preview?.illustrativeStatus === 'PASS') return 'Entered information looks fine!';
    if (preview?.illustrativeStatus === 'FAIL' || preview?.illustrativeStatus === 'WARNING') return 'Needs attention!';
  }
  return 'Consultant review recommended';
}
