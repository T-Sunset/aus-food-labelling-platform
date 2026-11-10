import { describe, expect, it } from 'vitest';
import type { InfantSweetenedWordInput, RuleTraceMetadata } from '@aus-food/domain';
import { evaluateInfantSweetenedWord } from './infant-sweetened-word.js';

const rule: RuleTraceMetadata = {
  id: 'name.infant.sweetened-word',
  name: "Infant food 'sweetened'",
  instrument: 'Australia New Zealand Food Standards Code',
  provision: 'Standard 2.9.2—7(3)(d)',
  sourceUrl: 'https://www.legislation.gov.au/F2015L00417/2024-09-13/2024-09-13/text/original/epub/OEBPS/document_1/document_1.html',
  jurisdiction: 'Australia and New Zealand',
  effectiveFrom: '2024-09-13',
  version: 'test',
  mappingConfidence: 'Provision',
};

const base: InfantSweetenedWordInput = {
  rule,
  ruleApproved: true,
  confirmedCohorts: ['food_for_infants'],
  addedSugarsPer100g: '4.1',
  sugarsBasisConfirmed: true,
  evidence: { reference: 'calc-1', sourceDate: '2026-11-10' },
  proposedName: 'Sweetened apple custard',
  sourcePath: ['product'],
};

describe('evaluateInfantSweetenedWord', () => {
  it('passes when above 4 g/100 g and the word is present', () => {
    const r = evaluateInfantSweetenedWord(base);
    expect(r.status).toBe('PASS');
    expect(r.value?.outcome).toBe('word_required_present');
  });

  it('fails when above 4 g/100 g and the word is missing', () => {
    const r = evaluateInfantSweetenedWord({ ...base, proposedName: 'Apple custard' });
    expect(r.status).toBe('FAIL');
    expect(r.value?.outcome).toBe('word_required_missing');
  });

  it('does not require the word at exactly 4 g/100 g', () => {
    const r = evaluateInfantSweetenedWord({ ...base, addedSugarsPer100g: '4', proposedName: 'Apple custard' });
    expect(r.value?.outcome).toBe('word_not_required');
  });

  it('does not match partial words such as unsweetened', () => {
    const r = evaluateInfantSweetenedWord({ ...base, proposedName: 'Unsweetened custard' });
    expect(r.status).toBe('FAIL');
  });

  it('stays review-only for a draft rule, showing the comparison for information', () => {
    const r = evaluateInfantSweetenedWord({ ...base, ruleApproved: false });
    expect(r.status).toBe('REVIEW REQUIRED');
    expect(r.applicationMode).toBe('CANDIDATE');
    expect(r.value?.reasons).toContain('RULE_NOT_APPROVED');
    expect(r.explanation).toContain('above 4 g/100 g');
  });

  it('is review-only below Provision confidence', () => {
    const r = evaluateInfantSweetenedWord({ ...base, rule: { ...rule, mappingConfidence: 'Standard' } });
    expect(r.status).toBe('REVIEW REQUIRED');
    expect(r.value?.reasons).toContain('RULE_BELOW_PROVISION_CONFIDENCE');
  });

  it('never passes with missing, invalid or unconfirmed inputs', () => {
    const cases: Partial<InfantSweetenedWordInput>[] = [
      { confirmedCohorts: [] },
      { addedSugarsPer100g: undefined },
      { addedSugarsPer100g: 'abc' },
      { addedSugarsPer100g: '-1' },
      { sugarsBasisConfirmed: undefined },
      { evidence: undefined },
      { proposedName: '' },
    ];
    for (const override of cases) {
      const input = { ...base, addedSugarsPer100g: '1', ...override } as InfantSweetenedWordInput;
      const r = evaluateInfantSweetenedWord(input);
      if ('proposedName' in override) {
        // Below threshold the name is irrelevant, so use a figure above it.
        const above = evaluateInfantSweetenedWord({ ...input, addedSugarsPer100g: '5' });
        expect(above.status).toBe('REVIEW REQUIRED');
        expect(above.value?.reasons).toContain('NAME_MISSING');
      } else {
        expect(r.status).toBe('REVIEW REQUIRED');
      }
    }
  });
});
