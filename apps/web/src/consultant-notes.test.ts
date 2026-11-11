import { describe, expect, it } from 'vitest';
import { makeConsultantNotes } from './consultant-notes';
import { makeLabelDraft } from './label-draft';
import { workedExampleSet } from './worked-example-data';

describe('consultant notes', () => {
  it('includes official additive, name, claim and missing-data detail without illustrative results', () => {
    const product = workedExampleSet.products.find((item) => item.id === 'we-prod-citrus-boost-max');
    if (!product) throw new Error('Worked example not found');
    const { formulations, ingredients } = workedExampleSet;
    const draft = makeLabelDraft(product, formulations, ingredients);
    const notes = makeConsultantNotes(product, formulations, ingredients, draft);
    const text = notes.flatMap((section) => [section.heading, ...section.lines]).join('\n');
    expect(text).toContain('Additive 445');
    expect(text).toContain('130 mg/kg');
    expect(text).toContain('Low sugars');
    expect(text).toContain('Supports concentration');
    expect(text).toContain('REVIEW REQUIRED');
    expect(text).toContain('Still needed:');
    expect(text).toContain('Source: https://');
    expect(text).not.toContain('ILLUSTRATIVE ONLY');
    expect(text).not.toContain('would be FAIL');
    expect(text).not.toContain('would be PASS');
  });
});
