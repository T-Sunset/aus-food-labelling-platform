import { describe, expect, it } from 'vitest';
import type { ProductClassificationFact, ProvisionalCaffeineInput } from '@aus-food/domain';
import { demoCaffeineRule } from '@aus-food/rules';
import { createEmptyProductClassificationProfile, evaluateProvisionalCaffeine } from '@aus-food/engine';
import { applyAnswer, caffeinatedQuestions } from './label-builder';

const yes: ProductClassificationFact = {
  answer: 'yes',
  evidence: [{ id: 'spec', reference: 'product/spec', sourceDate: '2026-06-09', kind: 'productBrief' }],
};
const fixture: ProvisionalCaffeineInput = {
  rule: demoCaffeineRule,
  evaluationDate: '2026-11-19',
  classification: {
    beverage: yes,
    flavoured: yes,
    nonAlcoholic: yes,
    containsCaffeine: yes,
    mentalPerformancePurpose: yes,
  },
  concentration: {
    value: '300',
    unit: 'mg/L',
    foodState: 'readyToDrinkAsSold',
    completeness: 'complete',
    evidence: [{
      name: 'Total caffeine from all sources',
      value: '300',
      unit: 'mg/L',
      sourceId: 'recipe and supplier coverage',
      sourceDate: '2026-06-09',
      sourcePath: ['product', 'recipe', 'supplier specifications'],
    }],
  },
};

function withConcentration(value: string): ProvisionalCaffeineInput {
  return {
    ...fixture,
    concentration: {
      ...fixture.concentration!,
      value,
      evidence: [{ ...fixture.concentration!.evidence[0]!, value }],
    },
  };
}

describe('provisional caffeinated beverage concentration', () => {
  it.each([
    ['144.999', 'OUTSIDE RANGE'],
    ['145', 'WITHIN RANGE'],
    ['300', 'WITHIN RANGE'],
    ['320', 'WITHIN RANGE'],
    ['320.001', 'OUTSIDE RANGE'],
  ] as const)('compares %s mg/L without rounding', (value, status) => {
    const result = evaluateProvisionalCaffeine(withConcentration(value));
    expect(result.status).toBe(status);
    expect(result.resultBasis).toBe('provisional');
    expect(result.ruleReviewStatus).toBe('draft');
    expect(result.inputs).toHaveLength(7);
    expect(result.inputs.at(-1)).toMatchObject({ name: 'Evaluated total caffeine', value, unit: 'mg/L' });
    expect(result.limitations.join(' ')).toContain('permissions');
    expect(result.nonCertificationStatement).toContain('does not certify');
    expect(demoCaffeineRule.reviewStatus).toBe('draft');
  });

  it('distinguishes review status from the provisional result without granting approval', () => {
    const result = evaluateProvisionalCaffeine({ ...fixture, rule: { ...demoCaffeineRule, reviewStatus: 'reviewed' } });
    expect(result.ruleReviewStatus).toBe('reviewed');
    expect(result.resultBasis).toBe('provisional');
  });

  it('returns provisional non-applicability from an explicit unsourced answer', () => {
    const result = evaluateProvisionalCaffeine({
      ...fixture,
      classification: { ...fixture.classification, nonAlcoholic: { answer: 'no', evidence: [] } },
    });
    expect(result.status, result.explanation).toBe('NOT APPLICABLE');
    expect(result.resultBasis).toBe('provisional');
  });

  it('uses complete, explicit user-entered facts without requiring source references', () => {
    const unsourced: ProductClassificationFact = { answer: 'yes', evidence: [] };
    const result = evaluateProvisionalCaffeine({
      ...fixture,
      classification: {
        beverage: unsourced,
        flavoured: unsourced,
        nonAlcoholic: unsourced,
        containsCaffeine: unsourced,
        mentalPerformancePurpose: unsourced,
      },
      concentration: {
        ...fixture.concentration!,
        evidence: [{
          ...fixture.concentration!.evidence[0]!,
          sourceId: '',
          sourceDate: '',
        }],
      },
    });
    expect(result.status, result.explanation).toBe('WITHIN RANGE');
    expect(result.resultBasis).toBe('provisional');
  });

  it('does not conclude when a classification fact is unknown, conflicting or has an invalid source date', () => {
    for (const fact of [
      { answer: 'unknown', evidence: [] },
      { answer: 'conflicting', evidence: yes.evidence },
      { answer: 'yes', evidence: [{ ...yes.evidence[0]!, sourceDate: '2026-02-30' }] },
      { answer: 'yes', evidence: [{ ...yes.evidence[0]!, sourceDate: '2026-12-01' }] },
    ] satisfies ProductClassificationFact[]) {
      expect(evaluateProvisionalCaffeine({
        ...fixture,
        classification: { ...fixture.classification, beverage: fact },
      }).status).toBe('REVIEW REQUIRED');
    }
  });

  it('uses a changed unsourced classification answer without reusing its previous source', () => {
    const profile = createEmptyProductClassificationProfile();
    const sourced = applyAnswer(profile, caffeinatedQuestions[1]!, 'yes', yes.evidence[0]);
    const changed = applyAnswer(sourced, caffeinatedQuestions[1]!, 'no', undefined);
    const fact = changed.formulatedCaffeinatedBeverage.nonAlcoholic;
    expect(fact.previousEvidence).toEqual(yes.evidence);
    const result = evaluateProvisionalCaffeine({
      ...fixture, classification: { ...fixture.classification, nonAlcoholic: fact },
    });
    expect(result.status).toBe('NOT APPLICABLE');
    expect(result.inputs.find((input) => input.name === 'Non-alcoholic')).toMatchObject({
      value: 'no',
      sourceId: '',
      sourceDate: '',
    });
  });

  it('blocks incomplete, conflicting, unsupported state and invalid concentration evidence', () => {
    for (const concentration of [
      undefined,
      { ...fixture.concentration!, completeness: 'unknown' },
      { ...fixture.concentration!, completeness: 'conflicting' },
      { ...fixture.concentration!, foodState: 'other' },
      { ...fixture.concentration!, value: '-1' },
      { ...fixture.concentration!, value: 'not a number' },
      { ...fixture.concentration!, evidence: [] },
      { ...fixture.concentration!, evidence: [{ ...fixture.concentration!.evidence[0]!, sourcePath: [] }] },
    ] satisfies ProvisionalCaffeineInput['concentration'][]) {
      const { concentration: ignored, ...withoutConcentration } = fixture;
      void ignored;
      expect(evaluateProvisionalCaffeine({
        ...withoutConcentration,
        ...(concentration === undefined ? {} : { concentration }),
      }).status).toBe('REVIEW REQUIRED');
    }
  });

  it('rejects unsupported and below-provision mappings, including for outside-range values', () => {
    for (const trace of [
      { ...demoCaffeineRule.trace, mappingConfidence: 'Standard' },
      { ...demoCaffeineRule.trace, mappingConfidence: 'Unmapped' },
      { ...demoCaffeineRule.trace, id: 'another-rule' },
    ] satisfies ProvisionalCaffeineInput['rule']['trace'][]) {
      const input = withConcentration('321');
      expect(evaluateProvisionalCaffeine({ ...input, rule: { ...input.rule, trace } }).status).toBe('REVIEW REQUIRED');
    }
  });

  it('uses only dates within the verified period, including the transition start', () => {
    expect(evaluateProvisionalCaffeine({ ...fixture, evaluationDate: '2026-06-09' }).status).toBe('WITHIN RANGE');
    for (const evaluationDate of ['2026-06-08', '2026-11-20', '2028-06-09', 'bad-date']) {
      expect(evaluateProvisionalCaffeine({ ...fixture, evaluationDate }).status).toBe('REVIEW REQUIRED');
    }
  });
});
