import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type {
  ClaimClassification,
  ClaimProhibitedContexts,
  ClaimRoutingInput,
  ClaimRuleView,
  RuleTraceMetadata,
} from '@aus-food/domain';
import { evaluateClaim } from './claim-router.js';
import { illustrateRoutedClaim } from './illustrative-preview.js';

const rule: RuleTraceMetadata = {
  id: 'claim.test',
  name: 'Claim test',
  instrument: 'Australia New Zealand Food Standards Code',
  provision: 'Schedule 4 S4-3',
  sourceUrl: 'https://www.legislation.gov.au/',
  jurisdiction: 'Australia and New Zealand',
  effectiveFrom: '2026-04-30',
  version: 'test',
  mappingConfidence: 'Provision',
};

const lowSugars: ClaimRuleView = {
  id: 'claim.low-sugars',
  claimName: 'Low sugars',
  descriptor: 'Low',
  permittedWording: ['low sugars'],
  comparison: 'atMost',
  basis: 'per100ByFoodForm',
  limits: { liquid: { value: '2.5', unit: 'g' }, solid: { value: '5', unit: 'g' } },
  provision: 'Schedule 4 S4-3, Sugar or sugars, descriptor Low',
};

const clear: ClaimProhibitedContexts = { infantFormulaProduct: false, kava: false, alcoholAbove1_15Percent: false };

const input = (overrides: Partial<ClaimRoutingInput> = {}): ClaimRoutingInput => ({
  rule,
  ruleApproved: true,
  claimRule: lowSugars,
  claim: {
    id: 'c1',
    text: 'Low sugars',
    classification: 'nutrition_content',
    classificationConfirmed: true,
    supportedClaimId: 'claim.low-sugars',
  },
  foodForm: 'liquid',
  formOfFoodConfirmed: true,
  nutrientAmount: { value: '2.5', unit: 'g' },
  evidence: { reference: 'lab-1', sourceDate: '2026-11-10' },
  prohibitedContexts: clear,
  ...overrides,
});

const reasonsOf = (result: { readonly value?: { readonly reasons: readonly string[] } | undefined }): readonly string[] =>
  result.value?.reasons ?? [];

describe('evaluateClaim routing', () => {
  it('passes a fully confirmed nutrition content claim to the evaluator', () => {
    expect(evaluateClaim(input()).status).toBe('PASS');
  });

  it.each([
    ['comparative', 'COMPARATIVE_REVIEW_ONLY'],
    ['health', 'HEALTH_REVIEW_ONLY'],
    ['not_code_regulated', 'NOT_CODE_REGULATED_NOT_ASSESSED'],
  ] as const)('keeps %s claims review-only', (classification, reason) => {
    const result = evaluateClaim(
      input({ claim: { id: 'c', text: 'Anything', classification, classificationConfirmed: true } }),
    );
    expect(result.status).toBe('REVIEW REQUIRED');
    expect(reasonsOf(result)).toEqual([reason]);
    expect(result.nonCertificationStatement).toContain('does not certify');
  });

  it('needs a confirmed classification, even when one is set', () => {
    const result = evaluateClaim(
      input({ claim: { id: 'c', text: 'Low sugars', classification: 'nutrition_content' } }),
    );
    expect(reasonsOf(result)).toEqual(['CLASSIFICATION_NOT_CONFIRMED']);
    expect(
      reasonsOf(evaluateClaim(input({ claim: { id: 'c', text: 'Low sugars' } }))),
    ).toEqual(['CLASSIFICATION_NOT_CONFIRMED']);
  });

  it('is review-only for a nutrition content claim with no supported rule', () => {
    const result = evaluateClaim(input({ claimRule: undefined }));
    expect(result.status).toBe('REVIEW REQUIRED');
    expect(reasonsOf(result)).toEqual(['NUTRITION_CLAIM_UNSUPPORTED']);
  });

  it.each([
    ['infantFormulaProduct', 'infant formula product'],
    ['kava', 'kava'],
    ['alcoholAbove1_15Percent', '1.15% alcohol'],
  ] as const)('does not evaluate a claim when %s applies', (key, text) => {
    const result = evaluateClaim(input({ prohibitedContexts: { ...clear, [key]: true } }));
    expect(result.status).toBe('REVIEW REQUIRED');
    expect(reasonsOf(result)).toEqual(['PROHIBITED_CONTEXT']);
    expect(result.explanation).toContain(text);
  });

  it('treats an unanswered prohibited context as unconfirmed, never as not applying', () => {
    for (const contexts of [undefined, {}, { ...clear, kava: undefined }]) {
      const result = evaluateClaim(input({ prohibitedContexts: contexts }));
      expect(result.status).toBe('REVIEW REQUIRED');
      expect(reasonsOf(result)).toContain('EXCLUSIONS_NOT_CONFIRMED');
    }
  });

  it('still reports a missing food form or serving through the evaluator', () => {
    expect(reasonsOf(evaluateClaim(input({ foodForm: undefined })))).toContain('FOOD_FORM_MISSING');
    const fibre: ClaimRuleView = {
      ...lowSugars,
      id: 'claim.good-source-dietary-fibre',
      permittedWording: ['good source of dietary fibre'],
      comparison: 'atLeast',
      basis: 'perServing',
      limits: { perServing: { value: '4', unit: 'g' } },
    };
    const result = evaluateClaim(
      input({
        claimRule: fibre,
        claim: {
          id: 'c',
          text: 'Good source of dietary fibre',
          classification: 'nutrition_content',
          classificationConfirmed: true,
          supportedClaimId: fibre.id,
        },
      }),
    );
    expect(reasonsOf(result)).toContain('SERVING_NOT_CONFIRMED');
  });

  it('previews only draft-rule gates for routed claims, never review-only or missing facts', () => {
    const draft = input({ ruleApproved: false });
    const official = evaluateClaim(draft);
    expect(official.status).toBe('REVIEW REQUIRED');
    const preview = illustrateRoutedClaim(official, draft);
    expect(preview.eligible).toBe(true);
    expect(preview.illustrativeStatus).toBe('PASS');
    expect(preview).not.toHaveProperty('status');

    const health = input({ claim: { id: 'c', text: 'x', classification: 'health', classificationConfirmed: true } });
    expect(illustrateRoutedClaim(evaluateClaim(health), health).eligible).toBe(false);
    const missing = input({ ruleApproved: false, prohibitedContexts: undefined });
    expect(illustrateRoutedClaim(evaluateClaim(missing), missing).eligible).toBe(false);
  });

  it('never gives PASS or FAIL unless a nutrition content claim is confirmed with clear contexts', () => {
    const classes: (ClaimClassification | undefined)[] = [undefined, 'nutrition_content', 'comparative', 'health', 'not_code_regulated'];
    fc.assert(
      fc.property(
        fc.constantFrom(...classes),
        fc.boolean(),
        fc.constantFrom(true, false, undefined),
        fc.constantFrom(true, false, undefined),
        fc.constantFrom(true, false, undefined),
        (classification, confirmed, infant, kava, alcohol) => {
          const result = evaluateClaim(
            input({
              claim: {
                id: 'c',
                text: 'Low sugars',
                classification,
                classificationConfirmed: confirmed,
                supportedClaimId: 'claim.low-sugars',
              },
              prohibitedContexts: { infantFormulaProduct: infant, kava, alcoholAbove1_15Percent: alcohol },
            }),
          );
          const allowed =
            classification === 'nutrition_content' && confirmed && infant === false && kava === false && alcohol === false;
          if (!allowed) {
            expect(result.status).toBe('REVIEW REQUIRED');
          }
        },
      ),
    );
  });
});
