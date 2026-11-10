import type {
  AdditivePermissionEvaluationInput,
  AdditivePermissionEvaluationValue,
  ClaimEvaluationInput,
  ClaimEvaluationValue,
  ClaimRoutingInput,
  EngineResult,
  IllustrativeResult,
  InfantSweetenedWordInput,
  InfantSweetenedWordValue,
} from '@aus-food/domain';
import { evaluateAdditivePermission } from './additive-permission.js';
import { evaluateNutritionContentClaim } from './claim-evaluator.js';
import { evaluateClaim } from './claim-router.js';
import { evaluateInfantSweetenedWord } from './infant-sweetened-word.js';

// ADR-006. Reasons a reviewer can clear by approving rule data. Every other reason code is a
// missing or unsupported fact and is never lifted by the preview.
export const REVIEWER_GATE_REASONS: ReadonlySet<string> = new Set([
  'RULE_NOT_APPROVED',
  'RULE_BELOW_PROVISION_CONFIDENCE',
  'CATALOG_NOT_REVIEWED',
  'ROW_NOT_REVIEWED',
]);

export const REVIEWER_GATE_TEXT: Readonly<Record<string, string>> = {
  RULE_NOT_APPROVED: 'the rule is draft and not approved',
  RULE_BELOW_PROVISION_CONFIDENCE: 'the rule mapping confidence is below Provision level',
  CATALOG_NOT_REVIEWED: 'the catalog or category is draft and not reviewed',
  ROW_NOT_REVIEWED: 'the catalog row is draft and not reviewed',
};

export const ILLUSTRATIVE_STATEMENT =
  'ILLUSTRATIVE ONLY - unreviewed rule data. This shows what the result would be if the listed gates were approved. It is not a compliance result.' as const;

export function illustrate<T extends { readonly reasons: readonly string[] }>(
  official: EngineResult<T>,
  rerunWithGatesLifted: () => EngineResult<T>,
): IllustrativeResult<T> {
  const base = { officialStatus: official.status, statement: ILLUSTRATIVE_STATEMENT } as const;
  if (official.status !== 'REVIEW REQUIRED') {
    return { ...base, eligible: false, liftedGates: [], blockedBy: [], note: 'The official result is already determined; there is nothing to illustrate.' };
  }
  const reasons = official.value?.reasons ?? [];
  const blockedBy = reasons.filter((reason) => !REVIEWER_GATE_REASONS.has(reason));
  const liftedGates = reasons.filter((reason) => REVIEWER_GATE_REASONS.has(reason));
  if (blockedBy.length > 0 || liftedGates.length === 0) {
    return {
      ...base,
      eligible: false,
      liftedGates: [],
      blockedBy,
      note: 'Not eligible: facts are missing or unsupported, so no illustrative outcome is possible even if the rule were approved.',
    };
  }
  const trace = rerunWithGatesLifted();
  if (trace.status !== 'PASS' && trace.status !== 'FAIL' && trace.status !== 'WARNING') {
    return {
      ...base,
      eligible: false,
      liftedGates: [],
      blockedBy: trace.value?.reasons ?? [],
      note: 'Not eligible: the result still needs review after the reviewer gates are lifted.',
      trace,
    };
  }
  return {
    ...base,
    eligible: true,
    illustrativeStatus: trace.status,
    liftedGates,
    blockedBy: [],
    note: `If approved, this would be ${trace.status}.`,
    trace,
  };
}

export function assumeReviewedPermissionInput(
  input: AdditivePermissionEvaluationInput,
): AdditivePermissionEvaluationInput {
  return {
    ...input,
    rule: { ...input.rule, mappingConfidence: 'Provision' },
    catalog: {
      ...input.catalog,
      status: 'reviewed',
      categories: input.catalog.categories.map((category) => ({ ...category, reviewStatus: 'reviewed' })),
      rows: input.catalog.rows.map((row) => ({
        ...row,
        reviewStatus: 'reviewed',
        limit: { ...row.limit, reviewStatus: 'reviewed' },
      })),
    },
  };
}

export function illustrateAdditivePermission(
  official: EngineResult<AdditivePermissionEvaluationValue>,
  input: AdditivePermissionEvaluationInput,
): IllustrativeResult<AdditivePermissionEvaluationValue> {
  return illustrate(official, () => evaluateAdditivePermission(assumeReviewedPermissionInput(input)));
}

export function illustrateNutritionContentClaim(
  official: EngineResult<ClaimEvaluationValue>,
  input: ClaimEvaluationInput,
): IllustrativeResult<ClaimEvaluationValue> {
  return illustrate(official, () =>
    evaluateNutritionContentClaim({
      ...input,
      ruleApproved: true,
      rule: { ...input.rule, mappingConfidence: 'Provision' },
    }),
  );
}

export function illustrateRoutedClaim(
  official: EngineResult<ClaimEvaluationValue>,
  input: ClaimRoutingInput,
): IllustrativeResult<ClaimEvaluationValue> {
  return illustrate(official, () =>
    evaluateClaim({
      ...input,
      ruleApproved: true,
      rule: { ...input.rule, mappingConfidence: 'Provision' },
    }),
  );
}

export function illustrateInfantSweetenedWord(
  official: EngineResult<InfantSweetenedWordValue>,
  input: InfantSweetenedWordInput,
): IllustrativeResult<InfantSweetenedWordValue> {
  return illustrate(official, () =>
    evaluateInfantSweetenedWord({
      ...input,
      ruleApproved: true,
      rule: { ...input.rule, mappingConfidence: 'Provision' },
    }),
  );
}
