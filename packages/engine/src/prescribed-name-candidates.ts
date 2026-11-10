import type {
  EngineResult,
  EvaluationInputTrace,
  PrescribedNameCandidateInput,
  PrescribedNameCandidateMatch,
  PrescribedNameCandidateReason,
  PrescribedNameCandidateValue,
  PrescribedNameRuleView,
} from '@aus-food/domain';

const NON_CERTIFICATION = 'This result assists review and does not certify legal compliance.' as const;
const SUPPORTED_COHORTS = ['formulated_caffeinated_beverage', 'food_for_infants'];

const REASON_TEXT: Record<PrescribedNameCandidateReason, string> = {
  COHORT_NOT_CONFIRMED: 'a person has not confirmed a supported product cohort',
  COHORT_UNSUPPORTED: 'a confirmed cohort is outside the supported MVP cohorts, so no name rule is identified for it',
  NO_RULES_FOR_COHORT: 'the rule data holds no name rules for the confirmed cohort',
  NO_TERM_MATCH: 'no trigger term was found in the supplied text, which does not show that no prescribed name or name-linked requirement applies',
  RULES_DRAFT: 'the name rules are draft and have not been reviewed',
};

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsTerm(text: string, term: string): boolean {
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(term.trim())}($|[^\\p{L}\\p{N}])`, 'iu').test(text);
}

function matchTerms(texts: readonly string[], terms: readonly string[]): string[] {
  return terms.filter((term) => term.trim() !== '' && texts.some((text) => containsTerm(text, term)));
}

function toMatch(rule: PrescribedNameRuleView, matchedTerms: readonly string[], composition: boolean): PrescribedNameCandidateMatch {
  return {
    ruleId: rule.id,
    cohort: rule.cohort,
    kind: rule.kind,
    provision: rule.provision,
    mappingConfidence: rule.mappingConfidence,
    matchedTerms,
    triggerSummary: rule.triggerSummary,
    requirement: rule.requirement,
    requiredFacts: rule.requiredFacts,
    exclusions: rule.exclusions,
    needsCompositionCheck: composition,
  };
}

export function identifyPrescribedNameCandidates(
  input: PrescribedNameCandidateInput,
): EngineResult<PrescribedNameCandidateValue> {
  const labelTexts = [input.proposedName ?? '', ...(input.labelTexts ?? [])].filter((text) => text.trim() !== '');
  const ingredientNames = [...(input.ingredientNames ?? [])].filter((text) => text.trim() !== '');
  const cohorts = [...new Set(input.confirmedCohorts ?? [])];
  const base = { sourceId: 'person-supplied', sourceDate: 'not supplied', sourcePath: [...(input.sourcePath ?? [])] };
  const inputs: EvaluationInputTrace[] = [
    { name: 'Confirmed cohorts', value: cohorts.join(', ') || 'not supplied', ...base },
    { name: 'Proposed name', value: input.proposedName?.trim() || 'not supplied', ...base },
    { name: 'Label text items', value: String(labelTexts.length), ...base },
    { name: 'Ingredient names', value: String(ingredientNames.length), ...base },
  ];
  const title = 'Prescribed-name candidate identification';
  const whatWasChecked =
    'Which draft prescribed-name or name-linked rules could apply to the confirmed cohort, using whole-word matches of the rule terms. This identifies candidates only.';

  const finish = (
    value: PrescribedNameCandidateValue,
    applicationMode: 'CANDIDATE' | 'UNDETERMINABLE',
    explanation: string,
  ): EngineResult<PrescribedNameCandidateValue> => ({
    title,
    whatWasChecked,
    rule: input.rule,
    inputs,
    status: 'REVIEW REQUIRED',
    applicationMode,
    value,
    explanation,
    suggestedAction: 'Have a reviewer confirm the candidates and supply the listed facts. A proposed name never sets the product class.',
    nonCertificationStatement: NON_CERTIFICATION,
  });
  const empty = { candidates: [], noPrescribedNameStatements: [] } as const;

  const supported = cohorts.filter((cohort) => SUPPORTED_COHORTS.includes(cohort));
  if (cohorts.length === 0) {
    return finish(
      { outcome: 'review', reasons: ['COHORT_NOT_CONFIRMED'], ...empty },
      'UNDETERMINABLE',
      `No result: ${REASON_TEXT.COHORT_NOT_CONFIRMED}.`,
    );
  }
  if (supported.length === 0) {
    return finish(
      { outcome: 'review', reasons: ['COHORT_UNSUPPORTED'], ...empty },
      'UNDETERMINABLE',
      `No result: ${REASON_TEXT.COHORT_UNSUPPORTED}.`,
    );
  }

  const rules = input.catalogRules.filter((rule) => supported.includes(rule.cohort));
  if (rules.length === 0) {
    return finish(
      { outcome: 'review', reasons: ['NO_RULES_FOR_COHORT'], ...empty },
      'UNDETERMINABLE',
      `No result: ${REASON_TEXT.NO_RULES_FOR_COHORT}.`,
    );
  }

  const candidates: PrescribedNameCandidateMatch[] = [];
  for (const rule of rules) {
    if (rule.kind === 'no_prescribed_name_identified') {
      continue;
    }
    const composition = rule.labelTextTerms.length === 0 && rule.ingredientTerms.length === 0;
    const matched = [
      ...matchTerms(labelTexts, rule.labelTextTerms),
      ...matchTerms(ingredientNames, rule.ingredientTerms),
    ];
    if (composition || matched.length > 0) {
      candidates.push(toMatch(rule, matched, composition));
    }
  }
  const noPrescribedNameStatements = rules
    .filter((rule) => rule.kind === 'no_prescribed_name_identified')
    .map((rule) => ({ ruleId: rule.id, provision: rule.provision, triggerSummary: rule.triggerSummary }));

  const reasons: PrescribedNameCandidateReason[] = [];
  if (rules.some((rule) => rule.reviewStatus !== 'reviewed')) {
    reasons.push('RULES_DRAFT');
  }
  if (candidates.length === 0) {
    reasons.push('NO_TERM_MATCH');
    return finish(
      { outcome: 'no_rule_identified', reasons, candidates, noPrescribedNameStatements },
      'UNDETERMINABLE',
      `No rule identified: ${reasons.map((reason) => REASON_TEXT[reason]).join('; ')}. This is not a pass.`,
    );
  }
  return finish(
    { outcome: 'candidates', reasons, candidates, noPrescribedNameStatements },
    'CANDIDATE',
    `${candidates.length} candidate rule(s) identified (${candidates.map((c) => c.provision).join('; ')}). They need reviewer confirmation and the listed facts; ${reasons.map((reason) => REASON_TEXT[reason]).join('; ') || 'no further reasons recorded'}.`,
  );
}
