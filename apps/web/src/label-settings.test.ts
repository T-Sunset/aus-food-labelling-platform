import { describe, expect, it } from 'vitest';
import {
  initialLabelLayout,
  labelPackCopyForm,
  labelPackCopyReview,
  labelSettingsForm,
  parseLabelPackCopy,
  parseLabelSettings,
} from './label-settings';

describe('label settings', () => {
  it('keeps entered pack copy separate from the shared product and trims empty fields', () => {
    const form = labelPackCopyForm({
      supplierName: '  Local Foods Ltd  ',
      warningAdvisoryStatements: 'Keep chilled.\nContains an advisory.',
      precautionaryAllergenStatement: 'May contain peanuts.',
      precautionaryAllergenBasis: 'Recorded cross-contact assessment on 2026-01-01.',
    });
    expect(parseLabelPackCopy(form)).toEqual({
      supplierName: 'Local Foods Ltd',
      warningAdvisoryStatements: 'Keep chilled.\nContains an advisory.',
      precautionaryAllergenStatement: 'May contain peanuts.',
      precautionaryAllergenBasis: 'Recorded cross-contact assessment on 2026-01-01.',
    });
    expect(parseLabelPackCopy(labelPackCopyForm())).toBeUndefined();
  });

  it('requires a basis with any user-entered precautionary allergen statement', () => {
    const form = labelPackCopyForm();
    form.precautionaryAllergenStatement = 'May contain peanuts.';
    expect(() => parseLabelPackCopy(form)).toThrow('Enter both a precautionary allergen statement and its basis');
    form.precautionaryAllergenStatement = '';
    form.precautionaryAllergenBasis = 'Assessment reference';
    expect(() => parseLabelPackCopy(form)).toThrow('Enter both a precautionary allergen statement and its basis');
  });

  it('summarises entered and unresolved pack-copy fields without inferring applicability', () => {
    const form = labelPackCopyForm({
      supplierName: 'Local Foods Ltd',
      lotIdentification: 'Lot A17',
    });
    const items = labelPackCopyReview(form);
    expect(items.find((item) => item.label === 'Supplier business name')).toMatchObject({
      state: 'entered',
      detail: expect.stringContaining('applicability and adequacy remain unassessed'),
    });
    expect(items.find((item) => item.label === 'Lot identification')).toMatchObject({
      state: 'entered',
      detail: expect.stringContaining('applicability and adequacy remain unassessed'),
    });
    expect(items.find((item) => item.label === 'Date marking')).toMatchObject({
      state: 'not_entered',
      detail: expect.stringContaining('does not establish'),
    });
  });

  it('rejects pack copy that exceeds the field limit', () => {
    const form = labelPackCopyForm();
    form.supplierName = 'x'.repeat(301);
    expect(() => parseLabelPackCopy(form)).toThrow('supplierName must be 300 characters or fewer');
  });

  it('round-trips layout values and permits zero margins and spacing', () => {
    const form = labelSettingsForm('Example');
    expect(parseLabelSettings(form)).toEqual(initialLabelLayout);
    form.topMm = '0';
    form.gapMm = '0';
    expect(parseLabelSettings(form)).toMatchObject({ margins: { topMm: 0 }, gapMm: 0 });
  });

  it.each(['', '0', '-1', 'Infinity', '1e3'])('rejects invalid width %s', (value) => {
    const form = labelSettingsForm('Example');
    form.widthMm = value;
    expect(() => parseLabelSettings(form)).toThrow('Width');
  });

  it('checks orientation, content area and each text size', () => {
    const form = labelSettingsForm('Example');
    form.orientation = 'landscape';
    expect(() => parseLabelSettings(form)).toThrow('Landscape');
    form.widthMm = '160';
    form.leftMm = '154';
    expect(() => parseLabelSettings(form)).toThrow('Margins');
    form.leftMm = '6';
    form.textSizes.ingredients = '0';
    expect(() => parseLabelSettings(form)).toThrow('Ingredients text size');
    form.textSizes.ingredients = '1.5';
    form.textSizes.allergenDeclaration = '8';
    expect(parseLabelSettings(form).textSizes).toMatchObject({
      ingredients: 1.5,
      allergenDeclaration: 1.5,
    });
  });
});
