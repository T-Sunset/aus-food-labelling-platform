import type {
  EngineResult,
  EvaluationInputTrace,
  InfantSweetenedReason,
  InfantSweetenedWordInput,
  InfantSweetenedWordValue,
} from '@aus-food/domain';
import { compareDecimals } from './decimal.js';

const NON_CERTIFICATION = 'This result assists review and does not certify legal compliance.' as const;
const THRESHOLD = '4' as const;

const REASON_TEXT: Record<InfantSweetenedReason, string> = {
  COHORT_NOT_CONFIRMED: 'a person has not confirmed the food is a food for infants',
  RULE_NOT_APPROVED: 'the rule is draft and has not been approved for activation',
  RULE_BELOW_PROVISION_CONFIDENCE: 'the rule mapping is below Provision confidence',
  SUGARS_MISSING: 'the total of added sugars, honey and native bee honey (g/100 g) is missing or invalid',
  SUGARS_BASIS_NOT_CONFIRMED: 'a person has not confirmed the figure is the total mono- and disaccharide from added sugars, honey and native bee honey',
  EVIDENCE_MISSING: 'dated evidence for the figure is missing',
  NAME_MISSING: 'no proposed name was supplied',
};

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

export function evaluateInfantSweetenedWord(
  input: InfantSweetenedWordInput,
): EngineResult<InfantSweetenedWordValue> {
  const title = "Infant food 'sweetened' word check";
  const whatWasChecked =
    "Whether the total mono- and disaccharide from added sugars, honey and native bee honey exceeds 4 g/100 g (Standard 2.9.2—7(3)(d)) and, if so, whether the proposed name contains the word 'sweetened'.";
  const base = {
    sourceId: input.evidence?.reference ?? 'not supplied',
    sourceDate: input.evidence?.sourceDate ?? 'not supplied',
    sourcePath: [...(input.sourcePath ?? [])],
  };
  const inputs: EvaluationInputTrace[] = [
    { name: 'Added sugars, honey and native bee honey', value: input.addedSugarsPer100g ?? 'not supplied', unit: 'g/100 g', ...base },
    { name: 'Proposed name', value: input.proposedName?.trim() || 'not supplied', ...base },
  ];
  const reasons: InfantSweetenedReason[] = [];
  if (!(input.confirmedCohorts ?? []).includes('food_for_infants')) {
    reasons.push('COHORT_NOT_CONFIRMED');
  }
  if (!input.ruleApproved) {
    reasons.push('RULE_NOT_APPROVED');
  }
  if (input.rule.mappingConfidence !== 'Provision') {
    reasons.push('RULE_BELOW_PROVISION_CONFIDENCE');
  }
  const sugarsUsable = validAmount(input.addedSugarsPer100g);
  if (!sugarsUsable) {
    reasons.push('SUGARS_MISSING');
  } else if (input.sugarsBasisConfirmed !== true) {
    reasons.push('SUGARS_BASIS_NOT_CONFIRMED');
  }
  if (input.evidence === undefined) {
    reasons.push('EVIDENCE_MISSING');
  }
  const name = input.proposedName?.trim() ?? '';
  const wordInName = /(^|[^\p{L}\p{N}])sweetened($|[^\p{L}\p{N}])/iu.test(name);
  const exceeds = sugarsUsable ? compareDecimals(input.addedSugarsPer100g!, THRESHOLD) > 0 : undefined;
  if (exceeds === true && name === '') {
    reasons.push('NAME_MISSING');
  }

  const detail = {
    thresholdPer100g: THRESHOLD,
    ...(exceeds === undefined ? {} : { exceedsThreshold: exceeds }),
    ...(name === '' ? {} : { wordInName }),
    reasons,
  } as const;
  const blocking = reasons.filter((reason) => reason !== 'NAME_MISSING' || exceeds === true);

  if (blocking.length > 0) {
    return {
      title,
      whatWasChecked,
      rule: input.rule,
      inputs,
      status: 'REVIEW REQUIRED',
      applicationMode: blocking.every((r) => r === 'RULE_NOT_APPROVED') ? 'CANDIDATE' : 'UNDETERMINABLE',
      value: { outcome: 'review', ...detail },
      explanation: `No result: ${blocking.map((reason) => REASON_TEXT[reason]).join('; ')}.${exceeds === undefined ? '' : ` For information only, the supplied figure is ${exceeds ? 'above' : 'not above'} 4 g/100 g.`} Whether the word must sit in association with the name of the food is TO BE VERIFIED.`,
      suggestedAction: 'Have a reviewer confirm the rule and supply the listed facts.',
      nonCertificationStatement: NON_CERTIFICATION,
    };
  }

  const figure = `${input.addedSugarsPer100g} g/100 g`;
  if (!exceeds) {
    return {
      title,
      whatWasChecked,
      rule: input.rule,
      inputs,
      status: 'PASS',
      applicationMode: 'APPLIED',
      value: { outcome: 'word_not_required', ...detail },
      explanation: `The confirmed figure (${figure}) is not more than 4 g/100 g, so this provision does not require the word 'sweetened'.`,
      nonCertificationStatement: NON_CERTIFICATION,
    };
  }
  return {
    title,
    whatWasChecked,
    rule: input.rule,
    inputs,
    status: wordInName ? 'PASS' : 'FAIL',
    applicationMode: 'APPLIED',
    value: { outcome: wordInName ? 'word_required_present' : 'word_required_missing', ...detail },
    explanation: `The confirmed figure (${figure}) is more than 4 g/100 g, so the word 'sweetened' is required; it is ${wordInName ? 'present in' : 'not found in'} the proposed name.`,
    nonCertificationStatement: NON_CERTIFICATION,
  };
}
