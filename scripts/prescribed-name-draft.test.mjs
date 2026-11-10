import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { identifyPrescribedNameCandidates } from '../packages/engine/src/prescribed-name-candidates.ts';

const release = JSON.parse(
  readFileSync(new URL('../packages/rules/data/release-0.1.0-draft.json', import.meta.url), 'utf8'),
);
const catalog = release.prescribedNameCandidateCatalog;

const rule = {
  id: 'name.candidates',
  name: 'Prescribed-name candidates',
  instrument: 'Australia New Zealand Food Standards Code',
  provision: 'Standard 2.9.2; Standard 2.6.4',
  sourceUrl: 'https://www.legislation.gov.au/F2015L00417/2024-09-13/2024-09-13/text/original/epub/OEBPS/document_1/document_1.html',
  jurisdiction: 'Australia and New Zealand',
  effectiveFrom: '2024-09-13',
  version: catalog.version,
  mappingConfidence: 'Standard',
};

describe('shipped draft prescribed-name candidate catalog', () => {
  it('never yields PASS or FAIL and always distinguishes no-rule from candidates', () => {
    const cohorts = [[], ['food_for_infants'], ['formulated_caffeinated_beverage'], ['other']];
    const names = [undefined, 'Milk and honey cereal', 'Energy drink'];
    const outcomes = new Set();
    for (const confirmedCohorts of cohorts) {
      for (const proposedName of names) {
        const result = identifyPrescribedNameCandidates({
          rule,
          catalogRules: catalog.rules,
          confirmedCohorts,
          proposedName,
        });
        expect(result.status).toBe('REVIEW REQUIRED');
        expect(result.value.reasons.length).toBeGreaterThan(0);
        outcomes.add(result.value.outcome);
      }
    }
    expect([...outcomes].sort()).toEqual(['candidates', 'no_rule_identified', 'review']);
  });

  it('keeps every rule draft with a source and Provision or Standard confidence', () => {
    for (const entry of catalog.rules) {
      expect(entry.reviewStatus).toBe('draft');
      expect(entry.sourceIds.length).toBeGreaterThan(0);
      expect(['Provision', 'Standard']).toContain(entry.mappingConfidence);
    }
  });
});
