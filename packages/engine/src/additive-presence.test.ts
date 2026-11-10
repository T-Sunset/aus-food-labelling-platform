import { describe, expect, it } from 'vitest';
import type { AdditivePresencePathInput, RuleTraceMetadata } from '@aus-food/domain';
import { evaluateAdditivePresencePath } from './additive-presence.js';

const rule: RuleTraceMetadata = {
  id: 'additive.presence',
  name: 'Additive carry-over and processing aids',
  instrument: 'Australia New Zealand Food Standards Code',
  provision: 'Standard 1.3.1—3(2); section 1.1.2—13',
  sourceUrl: 'https://www.legislation.gov.au/F2015L00396/latest/text',
  jurisdiction: 'Australia and New Zealand',
  effectiveFrom: '2024-09-13',
  version: 'test',
  mappingConfidence: 'Provision',
};

const carry: AdditivePresencePathInput = {
  rule,
  sourceStatus: 'carriedOver',
  additiveCodeNumber: '200',
  infantFormulaProduct: false,
  permittedAsFoodAdditive: true,
  finalConcentration: { value: '10', unit: 'mg/kg' },
  carryOverCeiling: { value: '10', unit: 'mg/kg', basisConfirmed: true },
  evidence: { reference: 'supplier-spec-4', sourceDate: '2026-11-01' },
  sourcePath: ['product', 'line', 'ingredient'],
};

function reasons(input: AdditivePresencePathInput): readonly string[] {
  const result = evaluateAdditivePresencePath(input);
  expect(result.status).toBe('REVIEW REQUIRED');
  return result.value?.reasons ?? [];
}

describe('carry-over', () => {
  it('passes at the ceiling and fails just above it, with trace', () => {
    const atCeiling = evaluateAdditivePresencePath(carry);
    expect(atCeiling).toMatchObject({ status: 'PASS', applicationMode: 'APPLIED', value: { outcome: 'within_carry_over_level' } });
    expect(atCeiling.inputs.find(({ name }) => name === 'Final concentration')).toMatchObject({
      sourceId: 'supplier-spec-4',
      sourcePath: ['product', 'line', 'ingredient'],
    });
    expect(evaluateAdditivePresencePath({ ...carry, finalConcentration: { value: '10.0001', unit: 'mg/kg' } }))
      .toMatchObject({ status: 'FAIL', value: { outcome: 'exceeds_carry_over_level' } });
  });

  it('is never an exemption from a status flag alone', () => {
    expect(reasons({ ...carry, carryOverCeiling: undefined })).toEqual(['CEILING_MISSING']);
    expect(reasons({ ...carry, carryOverCeiling: { value: '10', unit: 'mg/kg' } })).toEqual(['CEILING_BASIS_NOT_CONFIRMED']);
    expect(reasons({ ...carry, carryOverCeiling: { value: 'abc', unit: 'mg/kg', basisConfirmed: true } })).toEqual(['CEILING_MISSING']);
    expect(reasons({ ...carry, finalConcentration: undefined })).toEqual(['CONCENTRATION_MISSING']);
    expect(reasons({ ...carry, finalConcentration: { value: '-1', unit: 'mg/kg' } })).toEqual(['CONCENTRATION_MISSING']);
    expect(reasons({ ...carry, evidence: undefined })).toEqual(['EVIDENCE_MISSING']);
    expect(reasons({ ...carry, permittedAsFoodAdditive: undefined })).toEqual(['NOT_CONFIRMED_PERMITTED_ADDITIVE']);
    expect(reasons({ ...carry, permittedAsFoodAdditive: false })).toEqual(['NOT_CONFIRMED_PERMITTED_ADDITIVE']);
    expect(reasons({ ...carry, finalConcentration: { value: '1', unit: 'mg/L' } })).toEqual(['UNIT_MISMATCH']);
  });

  it('keeps infant formula products out of the carry-over route', () => {
    expect(reasons({ ...carry, infantFormulaProduct: undefined })).toEqual(['INFANT_FORMULA_NOT_CONFIRMED']);
    expect(reasons({ ...carry, infantFormulaProduct: true })).toEqual(['INFANT_FORMULA_EXCLUDED']);
  });

  it('cannot produce PASS or FAIL below Provision confidence', () => {
    expect(reasons({ ...carry, rule: { ...rule, mappingConfidence: 'Standard' } })).toEqual(['RULE_BELOW_PROVISION_CONFIDENCE']);
  });
});

describe('processing aids, added and unknown paths', () => {
  const aid = (facts?: AdditivePresencePathInput['processingAidFacts']): AdditivePresencePathInput => ({
    rule, sourceStatus: 'processingAid', processingAidFacts: facts,
  });

  it('always stays review-only because Standard 1.3.3 permissions are not mapped', () => {
    const all = evaluateAdditivePresencePath(aid({
      usedDuringProcessing: true, performsPurposeInFinalFood: false, identifiedInDefinitionList: true,
    }));
    expect(all).toMatchObject({
      status: 'REVIEW REQUIRED',
      applicationMode: 'CANDIDATE',
      value: { reasons: ['PROCESSING_AID_PERMISSION_NOT_MAPPED'] },
    });
    expect(all.value?.checklist?.every(({ state }) => state === 'confirmed')).toBe(true);
  });

  it('shows which processing-aid conditions are unmet or unconfirmed', () => {
    const result = evaluateAdditivePresencePath(aid({ usedDuringProcessing: true, performsPurposeInFinalFood: true }));
    expect(result.applicationMode).toBe('UNDETERMINABLE');
    expect(result.value?.reasons).toEqual(['PROCESSING_AID_CONDITIONS_UNCONFIRMED', 'PROCESSING_AID_PERMISSION_NOT_MAPPED']);
    expect(result.value?.checklist?.map(({ state }) => state)).toEqual(['confirmed', 'not met', 'not confirmed']);
    expect(reasons(aid())).toContain('PROCESSING_AID_CONDITIONS_UNCONFIRMED');
  });

  it('treats an added additive as not applicable and an unknown path as review', () => {
    expect(evaluateAdditivePresencePath({ ...carry, sourceStatus: 'added' }))
      .toMatchObject({ status: 'INFORMATIONAL', applicationMode: 'CONTEXT', value: { outcome: 'not_applicable' } });
    expect(reasons({ ...carry, sourceStatus: 'unknown' })).toEqual(['SOURCE_STATUS_UNKNOWN']);
  });
});
