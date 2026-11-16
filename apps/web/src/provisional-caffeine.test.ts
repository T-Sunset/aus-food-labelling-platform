import { describe, expect, it } from 'vitest';
import type { ProductClassificationFact, ProvisionalCaffeineInput } from '@aus-food/domain';
import { demoCaffeineRule } from '@aus-food/rules';
import { evaluateProvisionalCaffeine } from '@aus-food/engine';

const yes: ProductClassificationFact = {
  answer: 'yes',
  evidence: [{ id: 'spec', reference: 'product/spec', sourceDate: '2026-06-09', kind: 'productBrief' }],
};
const fixture: ProvisionalCaffeineInput = {
  rule: demoCaffeineRule,
  evaluationDate: '2026-11-11',
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

  it('returns non-applicability only from sourced classification facts', () => {
    const result = evaluateProvisionalCaffeine({
      ...fixture,
      classification: { ...fixture.classification, nonAlcoholic: { ...yes, answer: 'no' } },
    });
    expect(result.status).toBe('NOT APPLICABLE');
    expect(result.resultBasis).toBe('provisional');
  });

  it('does not conclude when any classification fact is unknown, conflicting or unsourced', () => {
    for (const fact of [
      { answer: 'unknown', evidence: [] },
      { answer: 'conflicting', evidence: yes.evidence },
      { answer: 'yes', evidence: [] },
      { answer: 'yes', evidence: [{ ...yes.evidence[0]!, sourceDate: '2026-02-30' }] },
    ] satisfies ProductClassificationFact[]) {
      expect(evaluateProvisionalCaffeine({
        ...fixture,
        classification: { ...fixture.classification, beverage: fact },
      }).status).toBe('REVIEW REQUIRED');
    }
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
    for (const evaluationDate of ['2026-06-08', '2026-11-12', '2028-06-09', 'bad-date']) {
      expect(evaluateProvisionalCaffeine({ ...fixture, evaluationDate }).status).toBe('REVIEW REQUIRED');
    }
  });
});
