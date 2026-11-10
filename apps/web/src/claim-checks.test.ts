import { describe, expect, it } from 'vitest';
import type { ProductRecord } from '@aus-food/storage';
import { buildClaimChecks } from './claim-checks';
import { claimRules } from './rule-data';

const stamp = '2026-11-10T00:00:00.000Z';

const product: ProductRecord = {
  id: 'prod-1',
  name: 'Drink',
  recordType: 'product',
  formulationId: 'form-1',
  tags: [],
  createdAt: stamp,
  updatedAt: stamp,
  claimFacts: {
    foodForm: 'liquid',
    formOfFoodConfirmed: true,
    prohibitedContexts: { infantFormulaProduct: false, kava: false, alcoholAbove1_15Percent: false },
  },
  claims: [
    {
      id: 'c1',
      text: 'Low sugars',
      classification: 'nutrition_content',
      classificationConfirmed: true,
      supportedClaimId: 'claim.low-sugars',
      nutrientAmount: { value: '1', unit: 'g' },
      evidence: { reference: 'lab-1', sourceDate: '2026-11-10' },
    },
    { id: 'c2', text: '100% natural' },
    { id: 'c3', text: 'Healthy bones', classification: 'health', classificationConfirmed: true },
  ],
};

describe('buildClaimChecks', () => {
  it('ships only draft claim rules, so no claim gets PASS or FAIL', () => {
    expect(claimRules.length).toBeGreaterThan(0);
    expect(claimRules.every((rule) => rule.reviewStatus === 'draft')).toBe(true);
    const checks = buildClaimChecks(product, false);
    expect(checks.map((check) => check.official.status)).toEqual([
      'REVIEW REQUIRED',
      'REVIEW REQUIRED',
      'REVIEW REQUIRED',
    ]);
    expect(checks.every((check) => check.preview === undefined)).toBe(true);
  });

  it('shows an illustrative outcome only when the preview is on, and only for the draft-rule gate', () => {
    const checks = buildClaimChecks(product, true);
    expect(checks[0]?.preview?.eligible).toBe(true);
    expect(checks[0]?.preview?.illustrativeStatus).toBe('PASS');
    expect(checks[1]?.preview?.eligible).toBe(false);
    expect(checks[2]?.preview?.eligible).toBe(false);
    expect(checks[0]?.official.status).toBe('REVIEW REQUIRED');
  });

  it('keeps the claim text exactly as entered', () => {
    expect(buildClaimChecks(product, false)[1]?.official.value?.claimText).toBe('100% natural');
  });

  it('returns nothing for a product without claims', () => {
    expect(buildClaimChecks({ ...product, claims: undefined } as never, false)).toEqual([]);
  });
});
