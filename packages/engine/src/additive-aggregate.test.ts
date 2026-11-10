import { describe, expect, it } from 'vitest';
import type {
  AdditiveColourAggregateInput,
  AdditiveColourMember,
  AdditiveMixtureMember,
  RuleTraceMetadata,
} from '@aus-food/domain';
import { evaluateAggregateColourLimit, evaluateSamePurposeMixture } from './additive-aggregate.js';

const rule: RuleTraceMetadata = {
  id: 'additive.aggregate',
  name: 'Additive aggregate limits',
  instrument: 'Australia New Zealand Food Standards Code',
  provision: 'Standard 1.3.1—4(3) and 1.3.1—6',
  sourceUrl: 'https://www.legislation.gov.au/F2015L00396/latest/text',
  jurisdiction: 'Australia and New Zealand',
  effectiveFrom: '2024-09-13',
  version: 'test',
  mappingConfidence: 'Provision',
};

const evidence = { reference: 'lab-1', sourceDate: '2026-11-01' };

function mix(id: string, concentration: string, maximum: string, overrides: Partial<AdditiveMixtureMember> = {}): AdditiveMixtureMember {
  return {
    id,
    additiveCodeNumber: id,
    performsPurpose: true,
    limit: { type: 'maximum', value: maximum, unit: 'mg/kg' },
    limitReviewed: true,
    rowId: `row-${id}`,
    concentration: { value: concentration, unit: 'mg/kg' },
    evidence,
    ...overrides,
  };
}

function reasonsOf(result: ReturnType<typeof evaluateSamePurposeMixture>): readonly string[] {
  expect(result.status).toBe('REVIEW REQUIRED');
  return result.value?.reasons.map(({ reason }) => reason) ?? [];
}

describe('same-purpose mixture', () => {
  it('passes at a sum of exactly 1 and fails just above it, listing every contributor', () => {
    const atOne = evaluateSamePurposeMixture({
      rule, technologicalPurpose: 'preservative',
      members: [mix('200', '50', '100'), mix('202', '150', '300')],
    });
    expect(atOne).toMatchObject({ status: 'PASS', applicationMode: 'APPLIED', value: { total: '1', limit: '1' } });
    expect(atOne.value?.contributors).toHaveLength(2);
    expect(atOne.value?.contributors[0]).toMatchObject({ rowId: 'row-200', proportion: '0.5', maximum: '100' });

    const above = evaluateSamePurposeMixture({
      rule, technologicalPurpose: 'preservative',
      members: [mix('200', '50', '100'), mix('202', '150.0001', '300')],
    });
    expect(above).toMatchObject({ status: 'FAIL', value: { outcome: 'exceeds_limit' } });
  });

  it('is not moved across the boundary by division rounding', () => {
    // 1/3 + 1/3 + 1/3 is exactly 1.
    const result = evaluateSamePurposeMixture({
      rule, technologicalPurpose: 'preservative',
      members: [mix('a', '1', '3'), mix('b', '1', '3'), mix('c', '1', '3')],
    });
    expect(result.status).toBe('PASS');
  });

  it('excludes confirmed GMP additives and confirmed other-purpose additives', () => {
    const result = evaluateSamePurposeMixture({
      rule, technologicalPurpose: 'preservative',
      members: [
        mix('200', '90', '100'),
        mix('202', '1', '300'),
        mix('330', '999', '1', { performsPurpose: false }),
        { id: '300', performsPurpose: true, limit: { type: 'GMP' }, gmpConfirmed: true },
      ],
    });
    expect(result.status).toBe('PASS');
    expect(result.value?.excluded.map(({ id }) => id)).toEqual(['330', '300']);
  });

  it('is not applicable, not PASS, with fewer than two contributing additives', () => {
    const result = evaluateSamePurposeMixture({
      rule, technologicalPurpose: 'preservative', members: [mix('200', '90', '100')],
    });
    expect(result).toMatchObject({ status: 'INFORMATIONAL', applicationMode: 'CONTEXT', value: { outcome: 'not_applicable' } });
    expect(evaluateSamePurposeMixture({ rule, technologicalPurpose: 'preservative', members: [] }).status)
      .toBe('INFORMATIONAL');
  });

  it('never treats missing facts as zero or excluded', () => {
    const run = (member: AdditiveMixtureMember) =>
      reasonsOf(evaluateSamePurposeMixture({ rule, technologicalPurpose: 'p', members: [mix('200', '1', '100'), member] }));
    expect(run(mix('x', '1', '100', { performsPurpose: undefined }))).toEqual(['PURPOSE_NOT_CONFIRMED']);
    expect(run(mix('x', '1', '100', { limit: undefined }))).toEqual(['LIMIT_MISSING']);
    expect(run(mix('x', '1', '100', { limitReviewed: false }))).toEqual(['LIMIT_NOT_REVIEWED']);
    expect(run(mix('x', '1', '0'))).toEqual(['LIMIT_NOT_POSITIVE']);
    expect(run(mix('x', '1', '100', { limit: { type: 'GMP' } }))).toEqual(['GMP_NOT_CONFIRMED']);
    expect(run(mix('x', '1', '100', { concentration: undefined }))).toEqual(['CONCENTRATION_MISSING']);
    expect(run(mix('x', 'abc', '100'))).toEqual(['CONCENTRATION_MISSING']);
    expect(run(mix('x', '-1', '100'))).toEqual(['CONCENTRATION_MISSING']);
    expect(run(mix('x', '1', '100', { evidence: undefined }))).toEqual(['EVIDENCE_MISSING']);
    expect(run(mix('x', '1', '100', { concentration: { value: '1', unit: 'mg/L' } }))).toEqual(['UNIT_MISMATCH']);
  });

  it('requires the calculated-as basis the row names', () => {
    const member = (calculatedAs?: string) =>
      mix('x', '1', '100', { requiredCalculatedAs: 'sorbic acid', concentration: { value: '1', unit: 'mg/kg', calculatedAs } });
    const run = (m: AdditiveMixtureMember) =>
      evaluateSamePurposeMixture({ rule, technologicalPurpose: 'p', members: [mix('200', '1', '100'), m] });
    expect(run(member('Sorbic acid')).status).toBe('PASS');
    expect(reasonsOf(run(member()))).toEqual(['CALCULATION_BASIS_MISMATCH']);
    expect(reasonsOf(run(member('benzoic acid')))).toEqual(['CALCULATION_BASIS_MISMATCH']);
  });

  it('cannot produce PASS or FAIL below Provision confidence', () => {
    const result = evaluateSamePurposeMixture({
      rule: { ...rule, mappingConfidence: 'Standard' }, technologicalPurpose: 'p',
      members: [mix('a', '500', '100'), mix('b', '1', '100')],
    });
    expect(reasonsOf(result)).toEqual(['RULE_BELOW_PROVISION_CONFIDENCE']);
  });
});

const limits = {
  beverage: { value: '70', unit: 'mg/L' as const },
  otherFood: { value: '290', unit: 'mg/kg' as const },
};

function colour(id: string, value: string, unit: 'mg/L' | 'mg/kg', overrides: Partial<AdditiveColourMember> = {}): AdditiveColourMember {
  return { id, additiveCodeNumber: id, colourPermittedToMaximumLevel: true, concentration: { value, unit }, evidence, ...overrides };
}

const colourInput = (overrides: Partial<AdditiveColourAggregateInput>): AdditiveColourAggregateInput => ({
  rule, foodKind: 'beverage', limits, members: [colour('102', '30', 'mg/L'), colour('110', '40', 'mg/L')], ...overrides,
});

describe('aggregate colour limit', () => {
  it('passes at the beverage limit and fails just above it', () => {
    expect(evaluateAggregateColourLimit(colourInput({}))).toMatchObject({
      status: 'PASS', value: { total: '70', limit: '70', unit: 'mg/L' },
    });
    const above = evaluateAggregateColourLimit(colourInput({
      members: [colour('102', '30', 'mg/L'), colour('110', '40.01', 'mg/L')],
    }));
    expect(above).toMatchObject({ status: 'FAIL', value: { outcome: 'exceeds_limit', total: '70.01' } });
  });

  it('uses the other-food limit for other foods and rejects the wrong unit', () => {
    const food = evaluateAggregateColourLimit(colourInput({
      foodKind: 'otherFood', members: [colour('102', '290', 'mg/kg')],
    }));
    expect(food).toMatchObject({ status: 'PASS', value: { limit: '290', unit: 'mg/kg' } });
    const wrongUnit = evaluateAggregateColourLimit(colourInput({ foodKind: 'otherFood' }));
    expect(wrongUnit.value?.reasons.map(({ reason }) => reason)).toEqual(['UNIT_MISMATCH', 'UNIT_MISMATCH']);
  });

  it('excludes colours confirmed not to be maximum-level colours and is otherwise not applicable', () => {
    const result = evaluateAggregateColourLimit(colourInput({
      members: [colour('102', '30', 'mg/L'), colour('160a', '999', 'mg/L', { colourPermittedToMaximumLevel: false })],
    }));
    expect(result).toMatchObject({ status: 'PASS', value: { total: '30' } });
    expect(result.value?.excluded.map(({ id }) => id)).toEqual(['160a']);
    expect(evaluateAggregateColourLimit(colourInput({
      members: [colour('160a', '999', 'mg/L', { colourPermittedToMaximumLevel: false })],
    }))).toMatchObject({ status: 'INFORMATIONAL', applicationMode: 'CONTEXT' });
    expect(evaluateAggregateColourLimit(colourInput({ members: [] })).status).toBe('INFORMATIONAL');
  });

  it('never treats missing facts as zero', () => {
    const run = (overrides: Partial<AdditiveColourAggregateInput>) => {
      const result = evaluateAggregateColourLimit(colourInput(overrides));
      expect(result.status).toBe('REVIEW REQUIRED');
      return result.value?.reasons.map(({ reason }) => reason);
    };
    expect(run({ foodKind: undefined })).toEqual(['FOOD_KIND_NOT_CONFIRMED']);
    expect(run({ members: [colour('1', '1', 'mg/L', { colourPermittedToMaximumLevel: undefined })] }))
      .toEqual(['COLOUR_CLASS_NOT_CONFIRMED']);
    expect(run({ members: [colour('1', '1', 'mg/L', { concentration: undefined })] })).toEqual(['CONCENTRATION_MISSING']);
    expect(run({ members: [colour('1', '1', 'mg/L', { evidence: undefined })] })).toEqual(['EVIDENCE_MISSING']);
    expect(run({ members: [colour('1', '1', 'mg/L', { requiredCalculatedAs: 'x' })] })).toEqual(['CALCULATION_BASIS_MISMATCH']);
    expect(run({ rule: { ...rule, mappingConfidence: 'Unmapped' } })).toEqual(['RULE_BELOW_PROVISION_CONFIDENCE']);
  });
});
