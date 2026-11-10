import { describe, expect, it } from 'vitest';
import type { PrescribedNameCandidateInput, PrescribedNameRuleView, RuleTraceMetadata } from '@aus-food/domain';
import { identifyPrescribedNameCandidates } from './prescribed-name-candidates.js';

const common = { sourceIds: ['x'], exclusions: [], reviewStatus: 'draft', mappingConfidence: 'Provision' } as const;
const catalogRules: readonly PrescribedNameRuleView[] = [
  {
    ...common, id: 'name.infant.percentage-declaration', cohort: 'food_for_infants', kind: 'name_linked_requirement',
    provision: 'Standard 2.9.2-8(1)(a)', labelTextTerms: ['milk', 'cheese', 'meat'], ingredientTerms: [],
    triggerSummary: 'reference to milk, cheese or meat', requiredFacts: ['Percentage'], requirement: 'Declare percentage',
  },
  {
    ...common, id: 'name.infant.sweetened-word', cohort: 'food_for_infants', kind: 'name_linked_requirement',
    provision: 'Standard 2.9.2-7(3)(d)', labelTextTerms: [], ingredientTerms: [],
    triggerSummary: 'composition triggered', requiredFacts: ['Added sugars g/100 g'], requirement: 'Word sweetened',
  },
  {
    ...common, id: 'name.infant.sterilised-honey', cohort: 'food_for_infants', kind: 'name_linked_requirement',
    provision: 'Standard 2.9.2-7(3)(e)', labelTextTerms: [], ingredientTerms: ['honey', 'native bee honey'],
    triggerSummary: 'honey used', requiredFacts: ['Wording'], requirement: 'Word sterilised',
  },
  {
    ...common, id: 'name.caffeinated.no-prescribed-name', cohort: 'formulated_caffeinated_beverage',
    kind: 'no_prescribed_name_identified', provision: 'Standard 2.6.4', labelTextTerms: [], ingredientTerms: [],
    triggerSummary: 'none found', requiredFacts: [], requirement: 'None identified',
  },
];

const rule: RuleTraceMetadata = {
  id: 'name.candidates',
  name: 'Prescribed-name candidates',
  instrument: 'Australia New Zealand Food Standards Code',
  provision: 'Standard 2.9.2; Standard 2.6.4',
  sourceUrl: 'https://www.legislation.gov.au/F2015L00417/2024-09-13/2024-09-13/text/original/epub/OEBPS/document_1/document_1.html',
  jurisdiction: 'Australia and New Zealand',
  effectiveFrom: '2024-09-13',
  version: 'test',
  mappingConfidence: 'Provision',
};

function run(extra: Partial<PrescribedNameCandidateInput>) {
  return identifyPrescribedNameCandidates({ rule, catalogRules, ...extra });
}

describe('identifyPrescribedNameCandidates', () => {
  it('needs review when no cohort is confirmed, even if the name looks like a cohort', () => {
    const result = run({ proposedName: 'Infant cereal' });
    expect(result.status).toBe('REVIEW REQUIRED');
    expect(result.value?.outcome).toBe('review');
    expect(result.value?.reasons).toContain('COHORT_NOT_CONFIRMED');
  });

  it('does not identify rules for an unsupported cohort', () => {
    const result = run({ confirmedCohorts: ['bread'], proposedName: 'Milk bread' });
    expect(result.value?.outcome).toBe('review');
    expect(result.value?.reasons).toContain('COHORT_UNSUPPORTED');
  });

  it('identifies the percentage-declaration candidate from a whole-word match', () => {
    const result = run({ confirmedCohorts: ['food_for_infants'], proposedName: 'Cheese and vegetable dinner' });
    const ids = result.value?.candidates.map((c) => c.ruleId) ?? [];
    expect(result.applicationMode).toBe('CANDIDATE');
    expect(ids).toContain('name.infant.percentage-declaration');
    expect(result.value?.candidates.find((c) => c.ruleId === 'name.infant.percentage-declaration')?.matchedTerms).toEqual(['cheese']);
  });

  it('does not match partial words', () => {
    const result = run({ confirmedCohorts: ['food_for_infants'], proposedName: 'Buttermilkless pudding' });
    expect(result.value?.candidates.map((c) => c.ruleId)).not.toContain('name.infant.percentage-declaration');
  });

  it('matches honey from ingredient names', () => {
    const result = run({ confirmedCohorts: ['food_for_infants'], ingredientNames: ['Native bee honey'] });
    expect(result.value?.candidates.map((c) => c.ruleId)).toContain('name.infant.sterilised-honey');
  });

  it('always lists the composition-triggered sweetened candidate for infants', () => {
    const result = run({ confirmedCohorts: ['food_for_infants'] });
    const sweetened = result.value?.candidates.find((c) => c.ruleId === 'name.infant.sweetened-word');
    expect(sweetened?.needsCompositionCheck).toBe(true);
    expect(sweetened?.requiredFacts.length).toBeGreaterThan(0);
  });

  it('reports no rule identified, not a pass, for a caffeinated beverage', () => {
    const result = run({ confirmedCohorts: ['formulated_caffeinated_beverage'], proposedName: 'Energy drink' });
    expect(result.value?.outcome).toBe('no_rule_identified');
    expect(result.status).toBe('REVIEW REQUIRED');
    expect(result.applicationMode).toBe('UNDETERMINABLE');
    expect(result.value?.reasons).toContain('NO_TERM_MATCH');
    expect(result.value?.noPrescribedNameStatements.map((s) => s.ruleId)).toContain('name.caffeinated.no-prescribed-name');
    expect(result.explanation).toContain('not a pass');
  });

  it('reports no rules for a cohort missing from the catalog', () => {
    const result = run({ confirmedCohorts: ['food_for_infants'], catalogRules: [] });
    expect(result.value?.reasons).toContain('NO_RULES_FOR_COHORT');
  });

  it('never returns PASS or FAIL for any combination', () => {
    const cohorts = [[], ['food_for_infants'], ['formulated_caffeinated_beverage'], ['other'], ['food_for_infants', 'formulated_caffeinated_beverage']];
    const names = [undefined, '', 'Milk drink', 'Honey cereal', 'Energy'];
    for (const confirmedCohorts of cohorts) {
      for (const proposedName of names) {
        const result = run({ confirmedCohorts, proposedName });
        expect(result.status).toBe('REVIEW REQUIRED');
        expect(result.value?.reasons.length ?? 0).toBeGreaterThan(0);
      }
    }
  });
});
