import { describe, expect, it } from 'vitest';
import type { IllustrativeResult } from '@aus-food/domain';
import { checklistGuidance, checklistLabel } from './checklist-status';

const preview = (status: 'PASS' | 'FAIL' | 'WARNING'): IllustrativeResult<unknown> => ({
  officialStatus: 'REVIEW REQUIRED', eligible: true, illustrativeStatus: status,
  liftedGates: ['RULE_NOT_APPROVED'], blockedBy: [], note: 'example',
  statement: 'example',
});

describe('plain-English checklist', () => {
  it('keeps missing facts ahead of even a mistakenly eligible preview', () => {
    expect(checklistLabel('REVIEW REQUIRED', ['AMOUNT_MISSING', 'RULE_NOT_APPROVED'], preview('PASS'))).toBe('Needs attention!');
    expect(checklistLabel('REVIEW REQUIRED', ['COHORT_NOT_CONFIRMED'])).toBe('Needs attention!');
  });
  it('does not present unsupported or unknown cases as passing', () => {
    expect(checklistLabel('REVIEW REQUIRED', ['HEALTH_REVIEW_ONLY'])).toBe('Consultant review recommended');
    expect(checklistLabel('REVIEW REQUIRED', ['HEALTH_REVIEW_ONLY'], preview('PASS'))).toBe('Consultant review recommended');
    expect(checklistLabel('REVIEW REQUIRED', ['RULE_NOT_APPROVED'], { ...preview('PASS'), blockedBy: ['EVIDENCE_MISSING'] })).toBe('Consultant review recommended');
    expect(checklistLabel('INFORMATIONAL', [])).toBe('Consultant review recommended');
    expect(checklistLabel('REVIEW REQUIRED', ['RULE_NOT_APPROVED'])).toBe('Consultant review recommended');
  });
  it('labels official and opt-in illustrative outcomes without changing official results', () => {
    expect(checklistLabel('PASS', [])).toBe('Entered information looks fine!');
    expect(checklistLabel('FAIL', [])).toBe('Needs attention!');
    expect(checklistLabel('REVIEW REQUIRED', ['RULE_NOT_APPROVED'], preview('PASS'))).toBe('Entered information looks fine!');
    expect(checklistLabel('REVIEW REQUIRED', ['RULE_NOT_APPROVED'], preview('FAIL'))).toBe('Needs attention!');
    expect(checklistLabel('REVIEW REQUIRED', ['RULE_NOT_APPROVED'], { ...preview('PASS'), eligible: false })).toBe('Consultant review recommended');
  });
  it('gives actionable guidance without treating unknown codes as cleared', () => {
    expect(checklistGuidance(['AMOUNT_MISSING', 'EVIDENCE_MISSING', 'AMOUNT_MISSING']))
      .toEqual(['Enter the amount requested for the claim.', 'Add a dated evidence reference.']);
    expect(checklistLabel('REVIEW REQUIRED', ['NEW_UNKNOWN_REASON'])).toBe('Consultant review recommended');
  });
});
