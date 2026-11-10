import type {
  AdditivePresencePathInput,
  AdditivePresencePathReason,
  AdditivePresencePathValue,
  EngineResult,
  EvaluationInputTrace,
} from '@aus-food/domain';
import { compareDecimals } from './decimal.js';

const NON_CERTIFICATION = 'This result assists review and does not certify legal compliance.' as const;

const REASON_TEXT: Record<AdditivePresencePathReason, string> = {
  RULE_BELOW_PROVISION_CONFIDENCE: 'the rule mapping is below Provision confidence',
  SOURCE_STATUS_UNKNOWN: 'the presence path (added, carry-over or processing aid) is not established',
  INFANT_FORMULA_NOT_CONFIRMED: 'a person has not confirmed whether the food is an infant formula product',
  INFANT_FORMULA_EXCLUDED: 'carry-over is not available for an infant formula product, so the presence needs separate review',
  NOT_CONFIRMED_PERMITTED_ADDITIVE: 'a person has not confirmed the substance is permitted for use as a food additive',
  CONCENTRATION_MISSING: 'the final concentration is missing or invalid',
  EVIDENCE_MISSING: 'dated evidence is missing',
  CEILING_MISSING: 'the level the ingredient would introduce under proper technological conditions and GMP is missing or invalid',
  CEILING_BASIS_NOT_CONFIRMED: 'a person has not confirmed that level reflects proper technological conditions and GMP',
  UNIT_MISMATCH: 'the concentration and carry-over level use different units',
  PROCESSING_AID_CONDITIONS_UNCONFIRMED: 'the processing-aid conditions in section 1.1.2—13 are not all confirmed',
  PROCESSING_AID_PERMISSION_NOT_MAPPED: 'the Standard 1.3.3 permissions for processing aids are not mapped in the rule data',
};

function usable(value: string | undefined): value is string {
  if (value === undefined) {
    return false;
  }
  try {
    return compareDecimals(value, '0') >= 0;
  } catch {
    return false;
  }
}

function trace(input: AdditivePresencePathInput): EvaluationInputTrace[] {
  const base = {
    sourceId: input.evidence?.reference ?? 'not supplied',
    sourceDate: input.evidence?.sourceDate ?? 'not supplied',
    sourcePath: [...(input.sourcePath ?? [])],
  };
  return [
    { name: 'Additive code number', value: input.additiveCodeNumber?.trim() || 'not supplied', ...base },
    { name: 'Presence path', value: input.sourceStatus, ...base },
    {
      name: 'Final concentration',
      value: input.finalConcentration?.value ?? 'not supplied',
      ...(input.finalConcentration === undefined ? {} : { unit: input.finalConcentration.unit }),
      ...base,
    },
    {
      name: 'Carry-over level under GMP',
      value: input.carryOverCeiling?.value ?? 'not supplied',
      ...(input.carryOverCeiling === undefined ? {} : { unit: input.carryOverCeiling.unit }),
      ...base,
    },
  ];
}

export function evaluateAdditivePresencePath(
  input: AdditivePresencePathInput,
): EngineResult<AdditivePresencePathValue> {
  const title = 'Additive presence path check';
  const whatWasChecked =
    'Whether an additive that is not directly added is present through carry-over (Standard 1.3.1—3(2)) or a processing aid (section 1.1.2—13), without treating a status flag as an exemption.';
  const inputs = trace(input);
  const reasons: AdditivePresencePathReason[] = [];
  if (input.rule.mappingConfidence !== 'Provision') {
    reasons.push('RULE_BELOW_PROVISION_CONFIDENCE');
  }

  const finish = (
    path: AdditivePresencePathValue['path'],
    checklist?: AdditivePresencePathValue['checklist'],
  ): EngineResult<AdditivePresencePathValue> => {
    const unique = [...new Set(reasons)];
    return {
      title,
      whatWasChecked,
      rule: input.rule,
      inputs,
      status: 'REVIEW REQUIRED',
      applicationMode: path === 'processingAid' && unique.every((r) => r === 'PROCESSING_AID_PERMISSION_NOT_MAPPED')
        ? 'CANDIDATE'
        : 'UNDETERMINABLE',
      value: { path, outcome: 'review', reasons: unique, ...(checklist === undefined ? {} : { checklist }) },
      explanation: `No result: ${unique.map((reason) => REASON_TEXT[reason]).join('; ')}.`,
      suggestedAction: 'Confirm the listed facts with a reviewer. A status flag alone does not establish an exemption.',
      nonCertificationStatement: NON_CERTIFICATION,
    };
  };

  if (input.sourceStatus === 'added') {
    return {
      title,
      whatWasChecked,
      rule: input.rule,
      inputs,
      status: 'INFORMATIONAL',
      applicationMode: 'CONTEXT',
      value: { path: 'added', outcome: 'not_applicable', reasons: [] },
      explanation: 'This additive is recorded as added, so the carry-over and processing-aid paths do not apply. Use the permission check.',
      nonCertificationStatement: NON_CERTIFICATION,
    };
  }

  if (input.sourceStatus === 'unknown') {
    reasons.push('SOURCE_STATUS_UNKNOWN');
    return finish('unknown');
  }

  if (input.sourceStatus === 'processingAid') {
    const facts = input.processingAidFacts;
    const state = (value: boolean | undefined, wanted: boolean): 'confirmed' | 'not met' | 'not confirmed' =>
      value === undefined ? 'not confirmed' : value === wanted ? 'confirmed' : 'not met';
    const checklist = [
      { condition: 'Used during processing to perform a technological purpose', state: state(facts?.usedDuringProcessing, true) },
      { condition: 'Does not perform a technological purpose in the food for sale', state: state(facts?.performsPurposeInFinalFood, false) },
      { condition: 'Identified in the substances listed in section 1.1.2—13', state: state(facts?.identifiedInDefinitionList, true) },
    ] as const;
    if (checklist.some(({ state: s }) => s !== 'confirmed')) {
      reasons.push('PROCESSING_AID_CONDITIONS_UNCONFIRMED');
    }
    reasons.push('PROCESSING_AID_PERMISSION_NOT_MAPPED');
    return finish('processingAid', checklist);
  }

  // carriedOver
  if (input.infantFormulaProduct === undefined) {
    reasons.push('INFANT_FORMULA_NOT_CONFIRMED');
  } else if (input.infantFormulaProduct) {
    reasons.push('INFANT_FORMULA_EXCLUDED');
  }
  if (input.permittedAsFoodAdditive !== true) {
    reasons.push('NOT_CONFIRMED_PERMITTED_ADDITIVE');
  }
  const concentration = input.finalConcentration;
  const ceiling = input.carryOverCeiling;
  if (concentration === undefined || !usable(concentration.value)) {
    reasons.push('CONCENTRATION_MISSING');
  }
  if (ceiling === undefined || !usable(ceiling.value)) {
    reasons.push('CEILING_MISSING');
  } else if (ceiling.basisConfirmed !== true) {
    reasons.push('CEILING_BASIS_NOT_CONFIRMED');
  }
  if (input.evidence === undefined) {
    reasons.push('EVIDENCE_MISSING');
  }
  if (concentration !== undefined && ceiling !== undefined && concentration.unit !== ceiling.unit) {
    reasons.push('UNIT_MISMATCH');
  }
  if (reasons.length > 0 || concentration === undefined || ceiling === undefined) {
    return finish('carryOver');
  }

  const exceeds = compareDecimals(concentration.value, ceiling.value) > 0;
  return {
    title,
    whatWasChecked,
    rule: input.rule,
    inputs,
    status: exceeds ? 'FAIL' : 'PASS',
    applicationMode: 'APPLIED',
    value: { path: 'carryOver', outcome: exceeds ? 'exceeds_carry_over_level' : 'within_carry_over_level', reasons: [] },
    explanation: `The level in the food (${concentration.value} ${concentration.unit}) is ${exceeds ? 'above' : 'no greater than'} the level the ingredient would introduce under proper technological conditions and GMP (${ceiling.value} ${ceiling.unit}), which a person confirmed.`,
    nonCertificationStatement: NON_CERTIFICATION,
  };
}
