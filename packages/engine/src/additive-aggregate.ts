import type {
  AdditiveAggregateContributor,
  AdditiveAggregateEvaluationValue,
  AdditiveAggregateMemberBase,
  AdditiveAggregateReviewReason,
  AdditiveColourAggregateInput,
  AdditiveMixtureEvaluationInput,
  EngineResult,
  EvaluationInputTrace,
  RuleTraceMetadata,
} from '@aus-food/domain';
import {
  addDecimals,
  compareDecimals,
  divideDecimals,
  multiplyDecimals,
  normalizeDecimal,
  sumDecimals,
} from './decimal.js';

const NON_CERTIFICATION = 'This result assists review and does not certify legal compliance.' as const;

const REASON_TEXT: Record<AdditiveAggregateReviewReason, string> = {
  RULE_BELOW_PROVISION_CONFIDENCE: 'the rule mapping is below Provision confidence',
  PURPOSE_NOT_CONFIRMED: 'a person has not confirmed whether the additive performs this purpose',
  COLOUR_CLASS_NOT_CONFIRMED: 'a person has not confirmed whether the colouring is permitted to a maximum level',
  FOOD_KIND_NOT_CONFIRMED: 'a person has not confirmed whether the food is a beverage or another food',
  LIMIT_MISSING: 'the permitted level is missing',
  LIMIT_NOT_REVIEWED: 'the permitted level has not been reviewed',
  LIMIT_NOT_POSITIVE: 'the permitted level is not a positive number',
  GMP_NOT_CONFIRMED: 'good manufacturing practice has not been confirmed by a person',
  CONCENTRATION_MISSING: 'the concentration is missing or invalid',
  EVIDENCE_MISSING: 'dated evidence for the concentration is missing',
  UNIT_MISMATCH: 'the concentration unit does not match the limit unit',
  CALCULATION_BASIS_MISMATCH: 'the concentration is not stated on the calculation basis the row requires',
};

type Reason = { memberId?: string; reason: AdditiveAggregateReviewReason };

function usable(value: string | undefined, positive: boolean): value is string {
  if (value === undefined) {
    return false;
  }
  try {
    const cmp = compareDecimals(value, '0');
    return positive ? cmp > 0 : cmp >= 0;
  } catch {
    return false;
  }
}

const same = (left: string | undefined, right: string | undefined): boolean =>
  (left ?? '').trim().toLowerCase() === (right ?? '').trim().toLowerCase();

// Concentration, evidence and calculation-basis checks shared by both evaluations.
function concentrationReasons(member: AdditiveAggregateMemberBase, unit: string | undefined): Reason[] {
  const concentration = member.concentration;
  if (concentration === undefined || !usable(concentration.value, false)) {
    return [{ memberId: member.id, reason: 'CONCENTRATION_MISSING' }];
  }
  const reasons: Reason[] = [];
  if (member.evidence === undefined) {
    reasons.push({ memberId: member.id, reason: 'EVIDENCE_MISSING' });
  }
  if (unit !== undefined && concentration.unit !== unit) {
    reasons.push({ memberId: member.id, reason: 'UNIT_MISMATCH' });
  }
  if (
    member.requiredCalculatedAs !== undefined
    && !same(member.requiredCalculatedAs, concentration.calculatedAs)
  ) {
    reasons.push({ memberId: member.id, reason: 'CALCULATION_BASIS_MISMATCH' });
  }
  return reasons;
}

function traceFor(
  members: readonly AdditiveAggregateMemberBase[],
): EvaluationInputTrace[] {
  return members.map((member) => ({
    name: `Concentration of ${member.additiveCodeNumber?.trim() || member.id}`,
    value: member.concentration === undefined
      ? 'not supplied'
      : `${member.concentration.value}${member.concentration.calculatedAs === undefined ? '' : ` (as ${member.concentration.calculatedAs})`}`,
    ...(member.concentration === undefined ? {} : { unit: member.concentration.unit }),
    sourceId: member.evidence?.reference ?? 'not supplied',
    sourceDate: member.evidence?.sourceDate ?? 'not supplied',
    sourcePath: [...(member.sourcePath ?? [])],
  }));
}

function review(
  rule: RuleTraceMetadata,
  title: string,
  whatWasChecked: string,
  inputs: EvaluationInputTrace[],
  reasons: Reason[],
  contributors: AdditiveAggregateContributor[],
  excluded: { id: string; why: string }[],
): EngineResult<AdditiveAggregateEvaluationValue> {
  const unique = reasons.filter(
    (entry, index) => reasons.findIndex((other) => other.memberId === entry.memberId && other.reason === entry.reason) === index,
  );
  const text = unique
    .map(({ memberId, reason }) => `${memberId === undefined ? '' : `${memberId}: `}${REASON_TEXT[reason]}`)
    .join('; ');
  return {
    title,
    whatWasChecked,
    rule,
    inputs,
    status: 'REVIEW REQUIRED',
    applicationMode: 'UNDETERMINABLE',
    value: { outcome: 'review', reasons: unique, contributors, excluded },
    explanation: `No result: ${text}.`,
    suggestedAction: 'Resolve the listed gaps with a reviewer. Nothing is assumed to be zero or compliant.',
    nonCertificationStatement: NON_CERTIFICATION,
  };
}

function notApplicable(
  rule: RuleTraceMetadata,
  title: string,
  whatWasChecked: string,
  inputs: EvaluationInputTrace[],
  excluded: { id: string; why: string }[],
  explanation: string,
): EngineResult<AdditiveAggregateEvaluationValue> {
  return {
    title,
    whatWasChecked,
    rule,
    inputs,
    status: 'INFORMATIONAL',
    applicationMode: 'CONTEXT',
    value: { outcome: 'not_applicable', reasons: [], contributors: [], excluded },
    explanation,
    nonCertificationStatement: NON_CERTIFICATION,
  };
}

export function evaluateSamePurposeMixture(
  input: AdditiveMixtureEvaluationInput,
): EngineResult<AdditiveAggregateEvaluationValue> {
  const title = 'Same-purpose additive mixture check';
  const whatWasChecked =
    `Whether the sum of concentration-to-maximum proportions for additives performing the purpose "${input.technologicalPurpose}" is not more than 1.`;
  const inputs = traceFor(input.members);
  const reasons: Reason[] = [];
  const excluded: { id: string; why: string }[] = [];
  const contributors: AdditiveAggregateContributor[] = [];
  const maxima: string[] = [];
  const concentrations: string[] = [];

  if (input.rule.mappingConfidence !== 'Provision') {
    reasons.push({ reason: 'RULE_BELOW_PROVISION_CONFIDENCE' });
  }

  for (const member of input.members) {
    if (member.performsPurpose === undefined) {
      reasons.push({ memberId: member.id, reason: 'PURPOSE_NOT_CONFIRMED' });
      continue;
    }
    if (!member.performsPurpose) {
      excluded.push({ id: member.id, why: 'confirmed as not performing this purpose' });
      continue;
    }
    if (member.limit === undefined) {
      reasons.push({ memberId: member.id, reason: 'LIMIT_MISSING' });
      continue;
    }
    if (member.limit.type === 'GMP') {
      if (member.gmpConfirmed === true) {
        excluded.push({ id: member.id, why: 'present in accordance with GMP, excluded by section 1.3.1—6(3)' });
      } else {
        reasons.push({ memberId: member.id, reason: 'GMP_NOT_CONFIRMED' });
      }
      continue;
    }
    if (member.limitReviewed !== true) {
      reasons.push({ memberId: member.id, reason: 'LIMIT_NOT_REVIEWED' });
    }
    if (!usable(member.limit.value, true)) {
      reasons.push({ memberId: member.id, reason: 'LIMIT_NOT_POSITIVE' });
    }
    const memberReasons = concentrationReasons(member, member.limit.unit);
    reasons.push(...memberReasons);
    const concentration = member.concentration;
    if (
      concentration === undefined
      || memberReasons.length > 0
      || member.limitReviewed !== true
      || !usable(member.limit.value, true)
    ) {
      continue;
    }
    contributors.push({
      id: member.id,
      ...(member.additiveCodeNumber === undefined ? {} : { additiveCodeNumber: member.additiveCodeNumber }),
      ...(member.rowId === undefined ? {} : { rowId: member.rowId }),
      concentration: concentration.value,
      unit: concentration.unit,
      maximum: member.limit.value,
      proportion: divideDecimals(concentration.value, member.limit.value),
    });
    maxima.push(member.limit.value);
    concentrations.push(concentration.value);
  }

  if (reasons.length > 0) {
    return review(input.rule, title, whatWasChecked, inputs, reasons, contributors, excluded);
  }
  if (contributors.length < 2) {
    return notApplicable(
      input.rule, title, whatWasChecked, inputs, excluded,
      `Fewer than two additives with a numerical maximum perform the purpose "${input.technologicalPurpose}", so there is no mixture to sum. Each additive still needs its own permission check.`,
    );
  }

  // Exact comparison: sum(c_i / m_i) <= 1 is evaluated as sum(c_i * prod(other m)) <= prod(m)
  // so that division rounding cannot move a result across the boundary.
  const denominator = maxima.reduce((product, maximum) => multiplyDecimals(product, maximum), '1');
  const numerator = sumDecimals(
    concentrations.map((concentration, index) =>
      maxima.reduce(
        (product, maximum, other) => (other === index ? product : multiplyDecimals(product, maximum)),
        concentration,
      ),
    ),
  );
  const exceeds = compareDecimals(numerator, denominator) > 0;
  const total = divideDecimals(numerator, denominator);
  return {
    title,
    whatWasChecked,
    rule: input.rule,
    inputs,
    status: exceeds ? 'FAIL' : 'PASS',
    applicationMode: 'APPLIED',
    value: {
      outcome: exceeds ? 'exceeds_limit' : 'within_limit',
      reasons: [],
      contributors,
      excluded,
      total,
      limit: '1',
    },
    explanation: `The sum of proportions across ${contributors.length} additives is ${exceeds ? 'above' : 'not more than'} 1 (${normalizeDecimal(total)}).`,
    nonCertificationStatement: NON_CERTIFICATION,
  };
}

export function evaluateAggregateColourLimit(
  input: AdditiveColourAggregateInput,
): EngineResult<AdditiveAggregateEvaluationValue> {
  const title = 'Aggregate colour limit check';
  const whatWasChecked =
    'Whether all colourings permitted to a maximum level together are within the aggregate limit for the food kind.';
  const inputs = traceFor(input.members);
  const reasons: Reason[] = [];
  const excluded: { id: string; why: string }[] = [];
  const contributors: AdditiveAggregateContributor[] = [];

  if (input.rule.mappingConfidence !== 'Provision') {
    reasons.push({ reason: 'RULE_BELOW_PROVISION_CONFIDENCE' });
  }
  const limit = input.foodKind === undefined ? undefined : input.limits[input.foodKind];
  if (limit === undefined) {
    reasons.push({ reason: 'FOOD_KIND_NOT_CONFIRMED' });
  } else if (!usable(limit.value, true)) {
    reasons.push({ reason: 'LIMIT_NOT_POSITIVE' });
  }

  for (const member of input.members) {
    if (member.colourPermittedToMaximumLevel === undefined) {
      reasons.push({ memberId: member.id, reason: 'COLOUR_CLASS_NOT_CONFIRMED' });
      continue;
    }
    if (!member.colourPermittedToMaximumLevel) {
      excluded.push({ id: member.id, why: 'confirmed as not a colouring permitted to a maximum level' });
      continue;
    }
    const memberReasons = concentrationReasons(member, limit?.unit);
    reasons.push(...memberReasons);
    if (memberReasons.length === 0 && member.concentration !== undefined) {
      contributors.push({
        id: member.id,
        ...(member.additiveCodeNumber === undefined ? {} : { additiveCodeNumber: member.additiveCodeNumber }),
        concentration: member.concentration.value,
        unit: member.concentration.unit,
      });
    }
  }

  if (reasons.length > 0 || limit === undefined) {
    return review(input.rule, title, whatWasChecked, inputs, reasons, contributors, excluded);
  }
  if (contributors.length === 0) {
    return notApplicable(
      input.rule, title, whatWasChecked, inputs, excluded,
      'No colouring permitted to a maximum level is recorded, so the aggregate colour limit has nothing to total.',
    );
  }

  const total = contributors.reduce((sum, { concentration }) => addDecimals(sum, concentration), '0');
  const exceeds = compareDecimals(total, limit.value) > 0;
  return {
    title,
    whatWasChecked,
    rule: input.rule,
    inputs,
    status: exceeds ? 'FAIL' : 'PASS',
    applicationMode: 'APPLIED',
    value: {
      outcome: exceeds ? 'exceeds_limit' : 'within_limit',
      reasons: [],
      contributors,
      excluded,
      total,
      limit: limit.value,
      unit: limit.unit,
    },
    explanation: `All listed colourings total ${total} ${limit.unit}, which is ${exceeds ? 'above' : 'at or below'} the ${input.foodKind === 'beverage' ? 'beverage' : 'other-food'} limit of ${limit.value} ${limit.unit}.`,
    nonCertificationStatement: NON_CERTIFICATION,
  };
}
