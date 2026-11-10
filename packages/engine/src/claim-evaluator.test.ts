import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { ClaimEvaluationInput, ClaimRuleView, RuleTraceMetadata } from '@aus-food/domain';
import { evaluateNutritionContentClaim } from './claim-evaluator.js';
import { illustrateNutritionContentClaim } from './illustrative-preview.js';

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
  permittedWording: ['low sugar', 'low sugars'],
  comparison: 'atMost',
  basis: 'per100ByFoodForm',
  limits: { liquid: { value: '2.5', unit: 'g' }, solid: { value: '5', unit: 'g' } },
  provision: 'Schedule 4 S4-3, Sugar or sugars, descriptor Low',
};

const fibre: ClaimRuleView = {
  id: 'claim.good-source-dietary-fibre',
  claimName: 'Good source of dietary fibre',
  descriptor: 'Good source',
  permittedWording: ['good source of dietary fibre'],
  comparison: 'atLeast',
  basis: 'perServing',
  limits: { perServing: { value: '4', unit: 'g' } },
  generalCondition: { text: 'At least 2 g per serving.', minimumPerServing: { value: '2', unit: 'g' } },
  provision: 'Schedule 4 S4-3, Dietary fibre, descriptor Good source',
};

const sugarsInput = (overrides: Partial<ClaimEvaluationInput> = {}): ClaimEvaluationInput => ({
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
  exclusionsConfirmedNotApplicable: true,
  ...overrides,
});

const fibreInput = (overrides: Partial<ClaimEvaluationInput> = {}): ClaimEvaluationInput =>
  sugarsInput({
    claimRule: fibre,
    claim: {
      id: 'c2',
      text: 'Good source of dietary fibre',
      classification: 'nutrition_content',
      classificationConfirmed: true,
      supportedClaimId: 'claim.good-source-dietary-fibre',
    },
    foodForm: undefined,
    servingConfirmed: true,
    nutrientAmount: { value: '4', unit: 'g' },
    ...overrides,
  });

describe('nutrition content claim evaluation', () => {
  it('passes exactly at the "no more than" boundary and fails just above it, for each food form', () => {
    expect(evaluateNutritionContentClaim(sugarsInput()).status).toBe('PASS');
    const above = evaluateNutritionContentClaim(sugarsInput({ nutrientAmount: { value: '2.51', unit: 'g' } }));
    expect(above.status).toBe('FAIL');
    expect(above.value?.blockingConditionIds).toEqual(['threshold']);
    expect(evaluateNutritionContentClaim(sugarsInput({ foodForm: 'solid', nutrientAmount: { value: '5', unit: 'g' } })).status).toBe('PASS');
    expect(evaluateNutritionContentClaim(sugarsInput({ foodForm: 'solid', nutrientAmount: { value: '5.01', unit: 'g' } })).status).toBe('FAIL');
    expect(evaluateNutritionContentClaim(sugarsInput({ nutrientAmount: { value: '0', unit: 'g' } })).status).toBe('PASS');
  });

  it('passes exactly at the "at least" boundary and fails below it', () => {
    expect(evaluateNutritionContentClaim(fibreInput()).status).toBe('PASS');
    const below = evaluateNutritionContentClaim(fibreInput({ nutrientAmount: { value: '3.99', unit: 'g' } }));
    expect(below.status).toBe('FAIL');
    expect(below.value?.blockingConditionIds).toEqual(['threshold']);
  });

  it('lists every condition with its own status and names the blocking one (CLAIM-004)', () => {
    const result = evaluateNutritionContentClaim(sugarsInput({ formOfFoodConfirmed: false }));
    expect(result.status).toBe('REVIEW REQUIRED');
    const ids = result.value?.checklist.map((entry) => entry.id);
    expect(ids).toEqual([
      'rule-approved', 'rule-mapping', 'classification', 'claim-linked', 'wording', 'exclusions',
      'form-of-food', 'evidence', 'food-form', 'amount', 'threshold', 'general-condition',
    ]);
    expect(result.value?.blockingConditionIds).toEqual(['form-of-food']);
    // The threshold is met, yet the claim is not a PASS.
    expect(result.value?.checklist.find((entry) => entry.id === 'threshold')?.status).toBe('MET');
  });

  it('does not let a failed threshold override an undetermined condition', () => {
    const result = evaluateNutritionContentClaim(
      sugarsInput({ nutrientAmount: { value: '9', unit: 'g' }, formOfFoodConfirmed: undefined }),
    );
    expect(result.status).toBe('REVIEW REQUIRED');
    expect(result.explanation).toContain('For information only');
  });

  it('never treats missing or invalid inputs as zero or PASS', () => {
    const cases: Partial<ClaimEvaluationInput>[] = [
      { nutrientAmount: undefined },
      { nutrientAmount: { value: '', unit: 'g' } },
      { nutrientAmount: { value: '-1', unit: 'g' } },
      { nutrientAmount: { value: 'abc', unit: 'g' } },
      { nutrientAmount: { value: '1', unit: 'mg' } },
      { foodForm: undefined },
      { formOfFoodConfirmed: undefined },
      { evidence: undefined },
      { exclusionsConfirmedNotApplicable: undefined },
      { ruleApproved: false },
      { rule: { ...rule, mappingConfidence: 'Standard' } },
    ];
    for (const overrides of cases) {
      expect(evaluateNutritionContentClaim(sugarsInput(overrides)).status).toBe('REVIEW REQUIRED');
    }
    expect(evaluateNutritionContentClaim(fibreInput({ servingConfirmed: undefined })).status).toBe('REVIEW REQUIRED');
  });

  it('keeps classification, linking and wording judgements with a person', () => {
    const claim = sugarsInput().claim;
    const reviewCases = [
      { ...claim, classificationConfirmed: false },
      { ...claim, classification: undefined },
      { ...claim, classification: 'health' as const },
      { ...claim, supportedClaimId: undefined },
      { ...claim, supportedClaimId: 'claim.low-fat' },
      { ...claim, text: 'Super low in sugars' },
      { ...claim, text: 'No added sugar' },
    ];
    for (const changed of reviewCases) {
      const result = evaluateNutritionContentClaim(sugarsInput({ claim: changed }));
      expect(result.status).toBe('REVIEW REQUIRED');
    }
    for (const text of ['  LOW   sugar!  ', 'low sugars.']) {
      expect(evaluateNutritionContentClaim(sugarsInput({ claim: { ...claim, text } })).status).toBe('PASS');
    }
  });

  it('records the claim text exactly as entered', () => {
    const text = '  LOW   sugars!  ';
    const result = evaluateNutritionContentClaim(sugarsInput({ claim: { ...sugarsInput().claim, text } }));
    expect(result.value?.claimText).toBe(text);
    expect(result.inputs[0]?.value).toBe(text);
  });

  it('is only CANDIDATE when the sole gap is the draft rule', () => {
    const result = evaluateNutritionContentClaim(sugarsInput({ ruleApproved: false }));
    expect(result.applicationMode).toBe('CANDIDATE');
    const missing = evaluateNutritionContentClaim(sugarsInput({ ruleApproved: false, evidence: undefined }));
    expect(missing.applicationMode).toBe('UNDETERMINABLE');
  });

  it('never returns PASS or FAIL from an unapproved or below-Provision rule, whatever the figures', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20000 }),
        fc.constantFrom('liquid', 'solid'),
        fc.boolean(),
        (hundredths, foodForm, belowProvision) => {
          const value = (hundredths / 100).toString();
          const result = evaluateNutritionContentClaim(
            sugarsInput({
              foodForm,
              nutrientAmount: { value, unit: 'g' },
              ruleApproved: belowProvision,
              rule: { ...rule, mappingConfidence: belowProvision ? 'Standard' : 'Provision' },
            }),
          );
          expect(result.status).toBe('REVIEW REQUIRED');
        },
      ),
    );
  });

  it('agrees with a plain numeric comparison for approved rules', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 20000 }), fc.constantFrom('liquid', 'solid'), (hundredths, foodForm) => {
        const result = evaluateNutritionContentClaim(
          sugarsInput({ foodForm, nutrientAmount: { value: (hundredths / 100).toString(), unit: 'g' } }),
        );
        const limit = foodForm === 'liquid' ? 250 : 500;
        expect(result.status).toBe(hundredths <= limit ? 'PASS' : 'FAIL');
      }),
    );
  });
});

describe('illustrative preview for claims', () => {
  it('shows the outcome if the draft rule were approved, without changing the official result', () => {
    const input = sugarsInput({ ruleApproved: false, rule: { ...rule, mappingConfidence: 'Standard' } });
    const official = evaluateNutritionContentClaim(input);
    const before = JSON.parse(JSON.stringify(official));
    const preview = illustrateNutritionContentClaim(official, input);
    expect(preview.illustrativeStatus).toBe('PASS');
    expect(preview.liftedGates).toEqual(['RULE_NOT_APPROVED', 'RULE_BELOW_PROVISION_CONFIDENCE']);
    expect(official).toEqual(before);

    const over = sugarsInput({ ruleApproved: false, nutrientAmount: { value: '3', unit: 'g' } });
    expect(illustrateNutritionContentClaim(evaluateNutritionContentClaim(over), over).illustrativeStatus).toBe('FAIL');
  });

  it('is not eligible when a person-confirmed fact is missing', () => {
    const input = sugarsInput({ ruleApproved: false, formOfFoodConfirmed: undefined });
    const preview = illustrateNutritionContentClaim(evaluateNutritionContentClaim(input), input);
    expect(preview.eligible).toBe(false);
    expect(preview.blockedBy).toContain('FORM_OF_FOOD_NOT_CONFIRMED');
  });
});
