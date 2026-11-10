import type {
  ClaimConditionItem,
  ClaimEvaluationInput,
  ClaimEvaluationValue,
  ClaimReason,
  EngineResult,
  EvaluationInputTrace,
} from '@aus-food/domain';
import { compareDecimals } from './decimal.js';

const NON_CERTIFICATION = 'This result assists review and does not certify legal compliance.' as const;

function validAmount(value: string | undefined): value is string {
  if (value === undefined) {
    return false;
  }
  try {
    return compareDecimals(value, '0') >= 0;
  } catch {
    return false;
  }
}

// Wording equivalence is a judgement (CLAIM-002), so only an exact match after tidying case, spacing
// and end punctuation counts as permitted wording.
function tidyWording(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').replace(/[\s.!?,;:]+$/u, '').trim();
}

const item = (
  id: string,
  label: string,
  status: ClaimConditionItem['status'],
  detail: string,
  reason?: ClaimReason,
): ClaimConditionItem => ({ id, label, status, detail, ...(reason === undefined ? {} : { reason }) });

// A nutrition content claim against one draft or reviewed claim rule (CLAIM-003, CLAIM-004).
// Every condition is listed. REVIEW REQUIRED wins when any condition cannot be determined; FAIL needs
// every other condition determined; PASS needs every condition met.
export function evaluateNutritionContentClaim(
  input: ClaimEvaluationInput,
): EngineResult<ClaimEvaluationValue> {
  const { claimRule, claim } = input;
  const title = `${claimRule.claimName} claim check`;
  const whatWasChecked = `Whether the claim "${claim.text}" meets every condition for the descriptor "${claimRule.descriptor}" (${claimRule.provision}), and the conditions needed to apply it.`;
  const base = {
    sourceId: input.evidence?.reference ?? 'not supplied',
    sourceDate: input.evidence?.sourceDate ?? 'not supplied',
    sourcePath: [...(input.sourcePath ?? [])],
  };
  const inputs: EvaluationInputTrace[] = [
    { name: 'Claim text (as entered)', value: claim.text, ...base },
    {
      name: claimRule.basis === 'perServing' ? 'Amount per serving' : 'Amount per 100 mL or 100 g',
      value: input.nutrientAmount?.value ?? 'not supplied',
      ...(input.nutrientAmount === undefined ? {} : { unit: input.nutrientAmount.unit }),
      ...base,
    },
    { name: 'Food form', value: input.foodForm ?? 'not supplied', ...base },
  ];

  const checklist: ClaimConditionItem[] = [];
  const push = (entry: ClaimConditionItem): void => {
    checklist.push(entry);
  };

  push(
    input.ruleApproved
      ? item('rule-approved', 'Claim rule is reviewed', 'MET', 'The claim rule has been reviewed.')
      : item('rule-approved', 'Claim rule is reviewed', 'REVIEW', 'The claim rule is draft and has not been approved.', 'RULE_NOT_APPROVED'),
  );
  push(
    input.rule.mappingConfidence === 'Provision'
      ? item('rule-mapping', 'Rule is mapped to the provision', 'MET', 'The rule is mapped at Provision level.')
      : item('rule-mapping', 'Rule is mapped to the provision', 'REVIEW', 'The rule mapping is below Provision confidence.', 'RULE_BELOW_PROVISION_CONFIDENCE'),
  );
  push(
    claim.classification === undefined || claim.classificationConfirmed !== true
      ? item('classification', 'A person confirmed this is a nutrition content claim', 'REVIEW', 'A person has not confirmed the claim classification.', 'CLASSIFICATION_NOT_CONFIRMED')
      : claim.classification !== 'nutrition_content'
        ? item('classification', 'A person confirmed this is a nutrition content claim', 'REVIEW', `The claim is classified as ${claim.classification}, which this check does not evaluate.`, 'CLASSIFICATION_NOT_NUTRITION_CONTENT')
        : item('classification', 'A person confirmed this is a nutrition content claim', 'MET', 'A person confirmed the classification.'),
  );
  push(
    claim.supportedClaimId === claimRule.id
      ? item('claim-linked', 'The claim is linked to this rule', 'MET', `Linked to ${claimRule.id}.`)
      : item('claim-linked', 'The claim is linked to this rule', 'REVIEW', 'A person has not linked the claim to this rule.', 'CLAIM_NOT_LINKED_TO_RULE'),
  );
  const wording = tidyWording(claim.text);
  push(
    claimRule.permittedWording.some((permitted) => tidyWording(permitted) === wording)
      ? item('wording', 'Wording is in the rule\'s permitted set', 'MET', 'The wording matches a permitted descriptor wording.')
      : item('wording', 'Wording is in the rule\'s permitted set', 'REVIEW', `The wording is not in the permitted set (${claimRule.permittedWording.join('; ')}); whether it is equivalent is a reviewer judgement.`, 'WORDING_NOT_PERMITTED'),
  );
  push(
    input.exclusionsConfirmedNotApplicable === true
      ? item('exclusions', 'No prohibited context applies', 'MET', 'A person confirmed no prohibited context (for example infant formula, kava or alcohol limits) applies.')
      : item('exclusions', 'No prohibited context applies', 'REVIEW', 'A person has not confirmed that no prohibited context applies.', 'EXCLUSIONS_NOT_CONFIRMED'),
  );
  push(
    input.formOfFoodConfirmed === true
      ? item('form-of-food', 'Figures are for the form of food in Standard 1.2.7-7', 'MET', 'A person confirmed the figures are for the required form of the food.')
      : item('form-of-food', 'Figures are for the form of food in Standard 1.2.7-7', 'REVIEW', 'A person has not confirmed the figures are for the food as sold, prepared, reconstituted or drained as required.', 'FORM_OF_FOOD_NOT_CONFIRMED'),
  );
  push(
    input.evidence === undefined
      ? item('evidence', 'Dated evidence for the figure', 'REVIEW', 'Dated evidence for the figure is missing.', 'EVIDENCE_MISSING')
      : item('evidence', 'Dated evidence for the figure', 'MET', `Evidence: ${input.evidence.reference} (${input.evidence.sourceDate}).`),
  );

  let limit = undefined as ClaimEvaluationInput['claimRule']['limits']['liquid'];
  if (claimRule.basis === 'per100ByFoodForm') {
    if (input.foodForm === undefined) {
      push(item('food-form', 'Food form (liquid or solid) is confirmed', 'REVIEW', 'A person has not confirmed whether the food is liquid or solid.', 'FOOD_FORM_MISSING'));
    } else {
      push(item('food-form', 'Food form (liquid or solid) is confirmed', 'MET', `Confirmed ${input.foodForm}.`));
      limit = input.foodForm === 'liquid' ? claimRule.limits.liquid : claimRule.limits.solid;
    }
  } else {
    push(
      input.servingConfirmed === true
        ? item('serving', 'Serving size is confirmed', 'MET', 'A person confirmed the serving size.')
        : item('serving', 'Serving size is confirmed', 'REVIEW', 'A person has not confirmed the serving size.', 'SERVING_NOT_CONFIRMED'),
    );
    limit = claimRule.limits.perServing;
  }

  const amount = input.nutrientAmount;
  const amountUsable = amount !== undefined && validAmount(amount.value);
  let measured: string | undefined;
  if (amount === undefined || !amountUsable) {
    push(item('amount', 'A nutrient amount is supplied', 'REVIEW', 'The nutrient amount is missing or invalid; a missing amount is never treated as zero.', 'AMOUNT_MISSING'));
  } else if (limit !== undefined && amount.unit !== limit.unit) {
    push(item('amount', 'A nutrient amount is supplied', 'REVIEW', `The amount is in ${amount.unit} but the rule uses ${limit.unit}.`, 'UNIT_MISMATCH'));
  } else {
    push(item('amount', 'A nutrient amount is supplied', 'MET', `${amount.value} ${amount.unit}.`));
    measured = amount.value;
  }

  if (limit !== undefined && measured !== undefined) {
    const cmp = compareDecimals(measured, limit.value);
    const met = claimRule.comparison === 'atMost' ? cmp <= 0 : cmp >= 0;
    const words = claimRule.comparison === 'atMost' ? 'no more than' : 'at least';
    push(
      item(
        'threshold',
        `Amount is ${words} ${limit.value} ${limit.unit}`,
        met ? 'MET' : 'NOT_MET',
        `${measured} ${limit.unit} is ${met ? '' : 'not '}${words} ${limit.value} ${limit.unit}.`,
      ),
    );
  } else {
    push(item('threshold', 'Threshold comparison', 'NOT_APPLICABLE', 'Not compared until the facts above are supplied.'));
  }

  const general = claimRule.generalCondition;
  if (general === undefined) {
    push(item('general-condition', 'General claim condition', 'NOT_APPLICABLE', 'This rule has no separate general condition.'));
  } else if (measured !== undefined && amount !== undefined && amount.unit === general.minimumPerServing.unit && claimRule.basis === 'perServing') {
    const met = compareDecimals(measured, general.minimumPerServing.value) >= 0;
    push(item('general-condition', 'General claim condition', met ? 'MET' : 'NOT_MET', general.text));
  } else {
    push(item('general-condition', 'General claim condition', 'NOT_APPLICABLE', 'Not compared until the facts above are supplied.'));
  }

  const reasons = checklist.flatMap((entry) => (entry.reason === undefined ? [] : [entry.reason]));
  const failing = checklist.filter((entry) => entry.status === 'NOT_MET');
  const reviewing = checklist.filter((entry) => entry.status === 'REVIEW');
  const detail = (outcome: ClaimEvaluationValue['outcome'], blocking: readonly ClaimConditionItem[]): ClaimEvaluationValue => ({
    outcome,
    claimText: claim.text,
    checklist,
    blockingConditionIds: blocking.map((entry) => entry.id),
    reasons,
  });

  if (reviewing.length > 0) {
    const informational = failing.length > 0 ? ` For information only: ${failing.map((entry) => entry.label).join('; ')} is not met on the figures supplied.` : '';
    return {
      title,
      whatWasChecked,
      rule: input.rule,
      inputs,
      status: 'REVIEW REQUIRED',
      applicationMode: reasons.every((reason) => reason === 'RULE_NOT_APPROVED') ? 'CANDIDATE' : 'UNDETERMINABLE',
      value: detail('review', reviewing),
      explanation: `No result: ${reviewing.map((entry) => entry.detail).join(' ')}${informational}`,
      suggestedAction: 'Supply the missing confirmations and have a reviewer confirm the rule.',
      nonCertificationStatement: NON_CERTIFICATION,
    };
  }
  if (failing.length > 0) {
    return {
      title,
      whatWasChecked,
      rule: input.rule,
      inputs,
      status: 'FAIL',
      applicationMode: 'APPLIED',
      value: detail('condition_not_met', failing),
      explanation: `A condition for this claim is not met: ${failing.map((entry) => entry.detail).join(' ')}`,
      nonCertificationStatement: NON_CERTIFICATION,
    };
  }
  return {
    title,
    whatWasChecked,
    rule: input.rule,
    inputs,
    status: 'PASS',
    applicationMode: 'APPLIED',
    value: detail('conditions_met', []),
    explanation: 'Every listed condition for this claim is met on the confirmed figures. Wording, labelling placement and other conditions not listed here still need review.',
    nonCertificationStatement: NON_CERTIFICATION,
  };
}
