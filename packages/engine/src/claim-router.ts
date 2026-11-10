import type {
  ClaimConditionItem,
  ClaimEvaluationValue,
  ClaimReason,
  ClaimRoutingInput,
  EngineResult,
} from '@aus-food/domain';
import { evaluateNutritionContentClaim } from './claim-evaluator.js';

const NON_CERTIFICATION = 'This result assists review and does not certify legal compliance.' as const;

// Review-only wording. Nothing here asserts what the Code requires beyond what was verified
// (docs/mvp-regulatory-research.md section 23).
const REVIEW_ONLY: Readonly<Record<string, { reason: ClaimReason; label: string; detail: string }>> = {
  unconfirmed: {
    reason: 'CLASSIFICATION_NOT_CONFIRMED',
    label: 'A person confirmed the claim classification',
    detail: 'A person has not classified this claim, so it cannot be checked. Nothing classifies claim text automatically.',
  },
  comparative: {
    reason: 'COMPARATIVE_REVIEW_ONLY',
    label: 'Comparative claims are not evaluated',
    detail: 'Comparative claims are not evaluated in this release. A reviewer must assess them.',
  },
  health: {
    reason: 'HEALTH_REVIEW_ONLY',
    label: 'Health claims are not evaluated',
    detail: 'Health claims are not evaluated in this release. A reviewer must assess them.',
  },
  not_code_regulated: {
    reason: 'NOT_CODE_REGULATED_NOT_ASSESSED',
    label: 'Claim treated as not regulated by the Code',
    detail: 'This claim was classified as not regulated by the Code. That is a person\'s classification and is not assessed here; other requirements may still apply and need review.',
  },
  unsupported: {
    reason: 'NUTRITION_CLAIM_UNSUPPORTED',
    label: 'A supported claim rule exists for this claim',
    detail: 'No supported claim rule is linked to this nutrition content claim, so it cannot be checked in this release.',
  },
};

function reviewOnly(
  input: ClaimRoutingInput,
  reason: ClaimReason,
  label: string,
  detail: string,
  title = 'Claim review',
): EngineResult<ClaimEvaluationValue> {
  const checklist: ClaimConditionItem[] = [{ id: reason.toLowerCase(), label, status: 'REVIEW', detail, reason }];
  return {
    title,
    whatWasChecked: `Whether the claim "${input.claim.text}" can be checked by this release.`,
    rule: input.rule,
    inputs: [{ name: 'Claim text (as entered)', value: input.claim.text, sourceId: 'not supplied', sourceDate: 'not supplied', sourcePath: [...(input.sourcePath ?? [])] }],
    status: 'REVIEW REQUIRED',
    applicationMode: 'UNDETERMINABLE',
    value: {
      outcome: 'review',
      claimText: input.claim.text,
      checklist,
      blockingConditionIds: [checklist[0]?.id ?? reason],
      reasons: [reason],
    },
    explanation: `No result: ${detail}`,
    suggestedAction: 'Have a reviewer assess this claim.',
    nonCertificationStatement: NON_CERTIFICATION,
  };
}

// Routes any claim by the person's classification (CLAIM-005). Only a confirmed nutrition content claim
// with a supported rule and clear prohibited contexts reaches the evaluator; everything else is REVIEW REQUIRED.
export function evaluateClaim(input: ClaimRoutingInput): EngineResult<ClaimEvaluationValue> {
  const { claim, claimRule, prohibitedContexts } = input;
  if (claim.classification === undefined || claim.classificationConfirmed !== true) {
    const entry = REVIEW_ONLY['unconfirmed']!;
    return reviewOnly(input, entry.reason, entry.label, entry.detail);
  }
  if (claim.classification !== 'nutrition_content') {
    const entry = REVIEW_ONLY[claim.classification]!;
    return reviewOnly(input, entry.reason, entry.label, entry.detail);
  }
  if (claimRule === undefined) {
    const entry = REVIEW_ONLY['unsupported']!;
    return reviewOnly(input, entry.reason, entry.label, entry.detail);
  }

  const applying = [
    prohibitedContexts?.infantFormulaProduct === true ? 'infant formula product' : undefined,
    prohibitedContexts?.kava === true ? 'kava' : undefined,
    prohibitedContexts?.alcoholAbove1_15Percent === true ? 'more than 1.15% alcohol by volume' : undefined,
  ].filter((name): name is string => name !== undefined);
  if (applying.length > 0) {
    return reviewOnly(
      input,
      'PROHIBITED_CONTEXT',
      'No prohibited context applies',
      `A person said this food is ${applying.join(' and ')}. Standard 1.2.7-4 restricts nutrition content claims in that context, so the claim is not evaluated; a reviewer must assess it.`,
      `${claimRule.claimName} claim check`,
    );
  }

  const answered =
    prohibitedContexts?.infantFormulaProduct === false &&
    prohibitedContexts.kava === false &&
    prohibitedContexts.alcoholAbove1_15Percent === false;
  return evaluateNutritionContentClaim({ ...input, claimRule, exclusionsConfirmedNotApplicable: answered });
}
