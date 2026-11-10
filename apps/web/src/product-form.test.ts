import { describe, expect, it } from 'vitest';
import type { ProductRecord } from '@aus-food/storage';
import {
  buildPackDetails,
  buildProductChanges,
  draftFromProduct,
  emptyProductDraft,
  newProductRecord,
  productStepStatuses,
} from './product-form';

const now = '2026-01-01T00:00:00.000Z';

function filled() {
  const draft = emptyProductDraft();
  draft.name = ' Citrus boost ';
  draft.formulationId = 'f-1';
  draft.foodState = 'asSold';
  return draft;
}

describe('buildProductChanges', () => {
  it('trims the name and leaves pack details unknown when blank', () => {
    const changes = buildProductChanges(filled(), ['f-1']);
    expect(changes.name).toBe('Citrus boost');
    expect(changes.packDetails).toBeUndefined();
  });

  it('asks for a name, a saved recipe and a food state in plain English', () => {
    const noName = { ...filled(), name: ' ' };
    expect(() => buildProductChanges(noName, ['f-1'])).toThrow('Give the product a name.');
    expect(() => buildProductChanges(filled(), ['other'])).toThrow('Choose the recipe');
    const noState = { ...filled(), foodState: '' as const };
    expect(() => buildProductChanges(noState, ['f-1'])).toThrow('Choose the state');
  });
});

describe('buildPackDetails', () => {
  it('keeps only the filled fields and adds the unit with a net quantity', () => {
    const draft = { ...filled(), servingSize: '250', netQuantity: '500', netUnit: 'mL' as const };
    expect(buildPackDetails(draft)).toEqual({ servingSize: '250', netQuantity: '500', netUnit: 'mL' });
  });

  it('rejects zero, negative and non-numeric amounts', () => {
    for (const bad of ['0', '-3', 'abc', '1e3']) {
      expect(() => buildPackDetails({ ...filled(), servingSize: bad })).toThrow('positive numbers');
    }
  });
});

describe('newProductRecord and draftFromProduct', () => {
  it('round-trips pack details', () => {
    const draft = { ...filled(), servingsPerPack: '2', netQuantity: '500' };
    const record = newProductRecord(buildProductChanges(draft, ['f-1']), 'p-1', now);
    expect(record.packDetails).toEqual({ servingsPerPack: '2', netQuantity: '500', netUnit: 'g' });
    expect(draftFromProduct(record).servingsPerPack).toBe('2');
  });
});

describe('productStepStatuses', () => {
  it('shows everything as still needed for an empty draft', () => {
    const statuses = productStepStatuses(emptyProductDraft(), undefined);
    expect(statuses.about.done).toBe(false);
    expect(statuses.type.done).toBe(false);
    expect(statuses.pack.done).toBe(false);
    expect(statuses.claims.text).toBe('Optional');
  });

  it('marks pack done only when all three amounts are present', () => {
    const draft = { ...filled(), servingSize: '250', servingsPerPack: '2' };
    expect(productStepStatuses(draft, undefined).pack.done).toBe(false);
    expect(productStepStatuses({ ...draft, netQuantity: '500' }, undefined).pack.done).toBe(true);
  });

  it('treats saved additive and claim entries as answered', () => {
    const saved = { additiveNameInputs: {}, claims: [] } as unknown as ProductRecord;
    const statuses = productStepStatuses(filled(), saved);
    expect(statuses.additives.done).toBe(true);
    expect(statuses.claims.done).toBe(true);
  });
});
