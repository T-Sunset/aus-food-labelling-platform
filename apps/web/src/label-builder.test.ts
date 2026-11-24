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

  it('records an answer without a source', () => {
    const result = applyAnswer(createEmptyProductClassificationProfile(), flavoured, 'yes', undefined);
    expect(result.formulatedCaffeinatedBeverage.flavoured).toEqual({ answer: 'yes', evidence: [] });
  });

  it('attaches the chosen source and detects the product type', () => {
    const evidence = makeBuilderEvidence('supplierSpecification', '', '2026-11-10');
    const next = applyAnswer(createEmptyProductClassificationProfile(), flavoured, 'yes', evidence);
    expect(next.formulatedCaffeinatedBeverage.flavoured.answer).toBe('yes');
    expect(next.formulatedCaffeinatedBeverage.flavoured.evidence).toEqual([evidence]);
    expect(detectProductType(next)).toBe('caffeinatedBeverage');
    expect(countAnswered(next, 'caffeinatedBeverage')).toEqual({ answered: 1, total: 4 });
  });

  it('preserves earlier sources without attributing them to a changed or uncertain answer', () => {
    const evidence = makeBuilderEvidence('productBrief', '', '2026-11-10');
    const yes = applyAnswer(createEmptyProductClassificationProfile(), infantCore, 'yes', evidence);
    const no = applyAnswer(yes, infantCore, 'no', undefined);
    expect(no.foodForInfants.intendedAsNourishmentForInfants).toEqual({
      answer: 'no', evidence: [], previousEvidence: [evidence],
    });
    const unsure = applyAnswer(no, infantCore, 'unknown', undefined);
    expect(unsure.foodForInfants.intendedAsNourishmentForInfants).toEqual({
      answer: 'unknown', evidence: [], previousEvidence: [evidence],
    });
    expect(detectProductType(unsure)).toBe('');
  });

  it('needs a description when the source is something else', () => {
    expect(() => makeBuilderEvidence('other', '  ', '2026-11-10')).toThrow(/Describe/);
    expect(makeBuilderEvidence('other', 'Supplier email', '2026-11-10').reference).toBe('Supplier email');
  });

  it('adds newly selected source details without losing or duplicating existing ones', () => {
    const first = makeBuilderEvidence('productBrief', '', '');
    const second = makeBuilderEvidence('other', 'Supplier email', '2026-11-10');
    const original = applyAnswer(createEmptyProductClassificationProfile(), infantCore, 'yes', first);
    const updated = applyAnswer(original, infantCore, 'no', second);
    const repeated = applyAnswer(updated, infantCore, 'no', makeBuilderEvidence('other', 'Supplier email', '2026-11-10'));
    expect(repeated.foodForInfants.intendedAsNourishmentForInfants).toEqual({
      answer: 'no', evidence: [second], previousEvidence: [first],
    });
  });
});
