import { describe, expect, it } from 'vitest';
import { makeConsultantNotes } from './consultant-notes';
import { makeLabelDraft } from './label-draft';
import { workedExampleSet } from './worked-example-data';
import { makeLabelLayout } from './label-layout';
import { initialLabelLayout } from './label-settings';

describe('consultant notes', () => {
  it('includes official additive, name, claim and missing-data detail without illustrative results', () => {
    const product = workedExampleSet.products.find((item) => item.id === 'we-prod-citrus-boost-max');
    if (!product) throw new Error('Worked example not found');
    const { formulations, ingredients } = workedExampleSet;
    const draft = makeLabelDraft(product, formulations, ingredients);
    const notes = makeConsultantNotes(product, formulations, ingredients, draft, {
      name: 'Selected label',
      saved: false,
      unsaved: true,
      dependenciesChanged: false,
      savedLabelChanged: false,
      unsavedProductChanges: false,
      claims: product.claims ?? [],
      preview: { error: 'No layout' },
    });
    const text = notes.flatMap((section) => [section.heading, ...section.lines]).join('\n');
    expect(text).toContain('Additive 445');
    expect(text).toContain('130 mg/kg');
    expect(text).toContain('Low sugars');
    expect(text).toContain('Supports concentration');
    expect(text).toContain('REVIEW REQUIRED');
    expect(text).toContain('Still needed:');
    expect(text).toContain('incomplete review copy');
    expect(text).toContain('Source: https://');
    expect(text).toContain('effective from ');
    expect(text).toContain('; path ');
    expect(text).not.toContain('ILLUSTRATIVE ONLY');
    expect(text).not.toContain('would be FAIL');
    expect(text).not.toContain('would be PASS');
  });

  it('does not report retained Product claims as active Label claims', () => {
    const product = workedExampleSet.products.find((item) => item.claims?.length);
    if (!product) throw new Error('Worked example with retained Product claims not found');
    const draft = makeLabelDraft(product, workedExampleSet.formulations, workedExampleSet.ingredients);
    const text = makeConsultantNotes(product, workedExampleSet.formulations, workedExampleSet.ingredients, draft)
      .flatMap((section) => section.lines).join('\n');
    expect(text).toContain('No claims were entered for this Label draft.');
    expect(text).not.toContain('Entered claim:');
  });

  it('reports the same selected nutrition values, dimensions and layout warnings as the preview', () => {
    const product = workedExampleSet.products[0];
    if (!product) throw new Error('Worked example not found');
    const { formulations, ingredients } = workedExampleSet;
    const base = makeLabelDraft(product, formulations, ingredients);
    const draft = { ...base, nutritionPanel: {
      ...base.nutritionPanel, basis: 'asSold' as const, servingSize: '50 g', servingsPerPack: '2',
      unitHeading: 'Average per 100 g', combinedHeading: 'With Milk', combinedDescription: 'Per serving with 100 mL of Milk.',
      rows: [{ label: 'Protein', serving: '10.0 g', unitQuantity: '20.0 g', combined: '12.0 g' },
        { label: 'Sodium', serving: 'Not available', unitQuantity: 'Not available' }],
    } };
    const settings = { ...initialLabelLayout, widthMm: 80, heightMm: 120 };
    const layout = makeLabelLayout(draft, settings);
    const text = makeConsultantNotes(product, formulations, ingredients, draft, {
      name: 'Small pack', saved: true, unsaved: true, dependenciesChanged: true,
      savedLabelChanged: false, unsavedProductChanges: true, preview: { layout, settings },
    }).flatMap((section) => [section.heading, ...section.lines]).join('\n');
    for (const value of ['With Milk', '10.0 g', '20.0 g', '12.0 g', 'Not available']) {
      expect(layout.svg).toContain(value);
      expect(text).toContain(value);
    }
    expect(layout.svg).toContain('NUTRITION INFORMATION');
    expect(layout.svg).toContain('Per serving with 100 mL of Milk.');
    expect(layout.svg).not.toMatch(/DRAFT|consultant review required|Other label content may be missing/i);
    expect(text).toContain('incomplete review copy');
    expect(text).toContain('Preview dimensions: 80 x 120 mm; orientation: portrait');
    expect(text).toContain('Label settings contain unsaved changes.');
    expect(text).toContain('dependencies changed since this label was saved');
    expect(text).toContain('Unsaved Product edits are not included');
    expect(text).toContain(layout.issues[0]?.message);
  });

  it('reports when no preview can be generated without inventing nutrition values', () => {
    const product = workedExampleSet.products[0];
    if (!product) throw new Error('Worked example not found');
    const { formulations, ingredients } = workedExampleSet;
    const base = makeLabelDraft(product, formulations, ingredients);
    const draft = { ...base, nutritionPanel: { ...base.nutritionPanel, basis: 'review' as const,
      unitHeading: 'Basis needs review', rows: [{ label: 'Protein', serving: 'Not available', unitQuantity: 'Not available' }] } };
    const text = makeConsultantNotes(product, formulations, ingredients, draft, {
      name: '', saved: false, unsaved: true, dependenciesChanged: false,
      savedLabelChanged: false, unsavedProductChanges: false, preview: { error: 'Width must be greater than zero.' },
    }).flatMap((section) => [section.heading, ...section.lines]).join('\n');
    expect(text).toContain('No label preview could be generated: Width must be greater than zero.');
    expect(text).toContain('Nutrition basis: review');
    expect(text).toContain('Protein: Not available; Not available.');
    expect(text).not.toContain('Preview dimensions:');
  });

  it('omits a missing ingredient declaration from the artwork and reports the gap', () => {
    const product = workedExampleSet.products[0];
    if (!product) throw new Error('Worked example not found');
    const { formulations, ingredients } = workedExampleSet;
    const base = makeLabelDraft(product, formulations, ingredients);
    const draft = { ...base, declaration: '', missing: [...base.missing, 'Recipe amounts are incomplete'] };
    const layout = makeLabelLayout(draft, initialLabelLayout);
    const text = makeConsultantNotes(product, formulations, ingredients, draft)
      .flatMap((section) => [section.heading, ...section.lines]).join('\n');
    expect(layout.svg).not.toContain('data-block-id="ingredients"');
    expect(text).toContain('Draft ingredient declaration: Unavailable; review the recipe');
    expect(text).toContain('Still needed: Recipe amounts are incomplete');
  });
});
