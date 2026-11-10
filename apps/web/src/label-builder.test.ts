import { createEmptyProductClassificationProfile } from '@aus-food/engine';
import { describe, expect, it } from 'vitest';
import {
  applyAnswer,
  caffeinatedQuestions,
  countAnswered,
  detectProductType,
  infantQuestions,
  makeBuilderEvidence,
} from './label-builder';

const flavoured = caffeinatedQuestions[0]!;
const infantCore = infantQuestions[0]!;

describe('label builder helpers', () => {
  it('detects no product type from an empty profile', () => {
    expect(detectProductType(createEmptyProductClassificationProfile())).toBe('');
  });

  it('refuses a yes or no answer without a source', () => {
    expect(() =>
      applyAnswer(createEmptyProductClassificationProfile(), flavoured, 'yes', undefined),
    ).toThrow(/where this information came from/);
  });

  it('attaches the chosen source and detects the product type', () => {
    const evidence = makeBuilderEvidence('supplierSpecification', '', '2026-11-10');
    const next = applyAnswer(createEmptyProductClassificationProfile(), flavoured, 'yes', evidence);
    expect(next.formulatedCaffeinatedBeverage.flavoured.answer).toBe('yes');
    expect(next.formulatedCaffeinatedBeverage.flavoured.evidence).toEqual([evidence]);
    expect(detectProductType(next)).toBe('caffeinatedBeverage');
    expect(countAnswered(next, 'caffeinatedBeverage')).toEqual({ answered: 1, total: 4 });
  });

  it('keeps existing evidence when the answer changes and clears it for not sure', () => {
    const evidence = makeBuilderEvidence('productBrief', '', '2026-11-10');
    const yes = applyAnswer(createEmptyProductClassificationProfile(), infantCore, 'yes', evidence);
    const no = applyAnswer(yes, infantCore, 'no', undefined);
    expect(no.foodForInfants.intendedAsNourishmentForInfants.evidence).toEqual([evidence]);
    const unsure = applyAnswer(no, infantCore, 'unknown', undefined);
    expect(unsure.foodForInfants.intendedAsNourishmentForInfants).toEqual({ answer: 'unknown', evidence: [] });
    expect(detectProductType(unsure)).toBe('');
  });

  it('needs a description when the source is something else', () => {
    expect(() => makeBuilderEvidence('other', '  ', '2026-11-10')).toThrow(/Describe/);
    expect(makeBuilderEvidence('other', 'Supplier email', '2026-11-10').reference).toBe('Supplier email');
  });
});
