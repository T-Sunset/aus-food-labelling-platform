import { evaluateClaim, illustrateRoutedClaim } from '@aus-food/engine';
import type {
  ClaimEvaluationValue,
  ClaimRoutingInput,
  EngineResult,
  IllustrativeResult,
  ProductClaim,
} from '@aus-food/domain';
import type { ProductRecord } from '@aus-food/storage';
import { claimRoutingTrace, claimRuleTrace, claimRules } from './rule-data';
import type { ClaimRuleEntry } from './rule-data';

export interface ClaimCheck {
  readonly claim: ProductClaim;
  readonly rule: ClaimRuleEntry | undefined;
  readonly official: EngineResult<ClaimEvaluationValue>;
  // Present only while the per-session illustrative preview is on (ADR-006).
  readonly preview?: IllustrativeResult<ClaimEvaluationValue>;
}

export const CLAIM_LIMITATIONS: readonly string[] = [
  'Only the five first-set nutrition content claims are checked: low energy, low fat, low sugars, low sodium and good source of dietary fibre.',
  'Comparative, health, "no added", "free", protein, saturated fat, carbohydrate and unregulated-wording claims are review-only.',
  'Nutrition information panel rows and accompanying statements that a claim may trigger are not checked here. Treat them as REVIEW REQUIRED.',
  'Claims are not added to the draft label; the separate consultant report includes the entered wording and official review results.',
];

export function findClaimRule(claim: ProductClaim): ClaimRuleEntry | undefined {
  return claim.supportedClaimId === undefined
    ? undefined
    : claimRules.find((rule) => rule.id === claim.supportedClaimId);
}

export function buildClaimChecks(product: ProductRecord, illustrative: boolean): readonly ClaimCheck[] {
  const facts = product.claimFacts;
  return (product.claims ?? []).map((claim): ClaimCheck => {
    const rule = findClaimRule(claim);
    const input: ClaimRoutingInput = {
      rule: rule ? claimRuleTrace(rule) : claimRoutingTrace(),
      ruleApproved: rule?.reviewStatus === 'reviewed',
      claimRule: rule,
      claim,
      foodForm: facts?.foodForm,
      formOfFoodConfirmed: facts?.formOfFoodConfirmed,
      servingConfirmed: facts?.servingConfirmed,
      nutrientAmount: claim.nutrientAmount,
      evidence: claim.evidence,
      prohibitedContexts: facts?.prohibitedContexts,
      sourcePath: [product.id, claim.id],
    };
    const official = evaluateClaim(input);
    return illustrative
      ? { claim, rule, official, preview: illustrateRoutedClaim(official, input) }
      : { claim, rule, official };
  });
}
