import { describe, expect, it } from 'vitest';
import type { ProductRecord } from '@aus-food/storage';
import {
  buildPackDetails,
  buildDraining,
  buildPreparation,
  buildProductChanges,
  draftFromProduct,
  emptyProductDraft,
  newProductRecord,
  productStepStatuses,
  suggestedNetContents,
  usesRoutineAsSoldMethod,
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

  it('asks for a name and a saved recipe without inventing a missing food state', () => {
    const noName = { ...filled(), name: ' ' };
    expect(() => buildProductChanges(noName, ['f-1'])).toThrow('Give the product a name.');
    expect(() => buildProductChanges(filled(), ['other'])).toThrow('Choose the recipe');
    const noState = { ...filled(), foodState: '' as const };
    const changes = buildProductChanges(noState, ['f-1']);
    expect(changes.foodState).toBeUndefined();
    expect(newProductRecord(changes, 'p-unknown', now).foodState).toBeUndefined();
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

  it('requires a recipe signature and accepts density without a source', () => {
    const confirmed = { ...filled(), nutritionBasisConfirmed: true };
    expect(() => buildPackDetails(confirmed)).toThrow('valid recipe');
    expect(buildPackDetails(confirmed, 'recipe-snapshot')).toEqual({ nutritionRecipeSignature: 'recipe-snapshot' });
    expect(buildPackDetails({ ...filled(), nutritionDensity: '1' })).toEqual({
      nutritionDensity: { gramsPerMillilitre: '1', evidenceReference: '', sourceDate: '' },
    });
    expect(() => buildPackDetails({ ...filled(), nutritionDensity: '1', nutritionDensityDate: '2026-02-31' }))
      .toThrow(/valid date/);
    expect(buildPackDetails({
      ...filled(), nutritionDensity: '1.2', nutritionDensityReference: 'Test report', nutritionDensityDate: '2026-01-01',
    })).toEqual({ nutritionDensity: { gramsPerMillilitre: '1.2', evidenceReference: 'Test report', sourceDate: '2026-01-01' } });
  });
});

describe('suggestedNetContents', () => {
  const asSold = { ...filled(), servingSize: '0.1', servingUnit: 'g' as const, servingsPerPack: '3' };

  it('uses exact serving arithmetic and preserves the serving unit', () => {
    expect(suggestedNetContents(asSold)).toEqual({ value: '0.3', unit: 'g' });
    expect(suggestedNetContents({ ...asSold, servingUnit: 'mL' })).toEqual({ value: '0.3', unit: 'mL' });
  });

  it('does not suggest a prepared or drained serving as the pack contents', () => {
    for (const foodState of ['asPrepared', 'asReconstituted', 'asDrained', 'asProcessed', 'asAdded', ''] as const) {
      expect(suggestedNetContents({ ...asSold, foodState })).toBeUndefined();
    }
  });

  it('does not replace an entered quantity or convert incompatible units', () => {
    expect(suggestedNetContents({ ...asSold, netQuantity: '20' })).toBeUndefined();
    expect(suggestedNetContents({ ...asSold, netUnit: 'mL' })).toBeUndefined();
    expect(suggestedNetContents({ ...asSold, netUnit: 'g' })).toEqual({ value: '0.3', unit: 'g' });
  });

  it('requires positive, finite serving inputs and a unit', () => {
    for (const value of ['', '0', '-1', 'text', '1e3', '9'.repeat(310)]) {
      expect(suggestedNetContents({ ...asSold, servingSize: value })).toBeUndefined();
      expect(suggestedNetContents({ ...asSold, servingsPerPack: value })).toBeUndefined();
    }
    expect(suggestedNetContents({ ...asSold, servingUnit: '' })).toBeUndefined();
    expect(suggestedNetContents({ ...asSold, servingSize: '1' + '0'.repeat(200), servingsPerPack: '1' + '0'.repeat(200) }))
      .toBeUndefined();
  });
});

describe('routine as-sold method', () => {
  it('uses the recipe by default only when directions do not require a separate basis', () => {
    expect(usesRoutineAsSoldMethod({ ...filled(), consumerDirections: 'none' })).toBe(true);
    expect(usesRoutineAsSoldMethod(filled())).toBe(false);
    expect(usesRoutineAsSoldMethod({
      ...filled(),
      consumerDirections: 'present',
      preparationEnabled: true,
      preparationKind: 'withFood',
      preparationDirections: 'Serve with milk.',
    })).toBe(true);
  });

  it('leaves reconstitution, draining and unclear directions for their specific review paths', () => {
    expect(usesRoutineAsSoldMethod({
      ...filled(), consumerDirections: 'none', foodState: 'asReconstituted',
    })).toBe(false);
    expect(usesRoutineAsSoldMethod({
      ...filled(),
      consumerDirections: 'present',
      preparationEnabled: true,
      preparationKind: 'reconstituted',
      preparationDirections: 'Mix with water.',
    })).toBe(false);
    expect(usesRoutineAsSoldMethod({
      ...filled(), consumerDirections: 'none', drainingEnabled: true,
    })).toBe(false);
    expect(usesRoutineAsSoldMethod({
      ...filled(),
      consumerDirections: 'present',
      drainingEnabled: true,
    })).toBe(false);
    expect(usesRoutineAsSoldMethod({
      ...filled(),
      consumerDirections: 'present',
      otherConsumerDirections: true,
    })).toBe(false);
    expect(usesRoutineAsSoldMethod({
      ...filled(),
      consumerDirections: 'present',
      preparationEnabled: true,
      preparationKind: 'withFood',
    })).toBe(false);
  });
});

describe('newProductRecord and draftFromProduct', () => {
  it('keeps legacy missing directions unknown and preserves independent direction choices', () => {
    const { consumerDirections: _directions, ...legacy } = newProductRecord(buildProductChanges(filled(), ['f-1']), 'p-1', now);
    expect(_directions).toBe('unknown');
    expect(draftFromProduct(legacy).consumerDirections).toBe('unknown');
    expect(draftFromProduct({ ...legacy, preparation: { enabled: true } }).consumerDirections).toBe('present');
    const draft = { ...filled(), consumerDirections: 'present' as const, preparationEnabled: true,
      drainingEnabled: true, otherConsumerDirections: true, otherConsumerDirectionsText: 'Warm gently' };
    const restored = draftFromProduct(newProductRecord(buildProductChanges(draft, ['f-1']), 'p-2', now));
    expect(restored).toMatchObject({ consumerDirections: 'present', preparationEnabled: true,
      drainingEnabled: true, otherConsumerDirections: true, otherConsumerDirectionsText: 'Warm gently' });
  });

  it('round-trips pack details', () => {
    const draft = { ...filled(), servingsPerPack: '2', netQuantity: '500', netUnit: 'g' as const };
    const record = newProductRecord(buildProductChanges(draft, ['f-1']), 'p-1', now);
    expect(record.packDetails).toEqual({ servingsPerPack: '2', netQuantity: '500', netUnit: 'g' });
    expect(draftFromProduct(record).servingsPerPack).toBe('2');
  });
});

describe('consumer preparation entry', () => {
  it('preserves incomplete or disabled preparation without inventing amounts', () => {
    const draft = { ...filled(), preparationPresent: true, preparationKind: 'withFood' as const,
      preparationDirections: 'Serve with milk.' };
    expect(buildPreparation(draft, [])).toEqual({ enabled: false, kind: 'withFood', directions: 'Serve with milk.' });
    expect(() => buildPreparation({ ...draft, preparationEnabled: true, preparationProductAmount: '0' }, []))
      .toThrow('Product amount must be a positive number');
    expect(() => buildPreparation({ ...draft, preparationEnabled: true, preparationMixingConfirmed: true }, []))
      .toThrow('before confirming');
  });
});

describe('draining entry', () => {
  it('preserves incomplete or disabled data and rejects invalid quantities', () => {
    const draft = { ...filled(), drainingPresent: true, drainingDirections: 'Drain.' };
    expect(buildDraining(draft, [], [])).toEqual({ enabled: false, directions: 'Drain.', values: {} });
    expect(buildDraining({ ...draft, foodState: 'asDrained' }, [], []))
      .toEqual({ enabled: false, directions: 'Drain.', values: {} });
    expect(() => buildDraining({ ...draft, drainingEnabled: true, drainedServingGrams: '0' }, [], []))
      .toThrow('Drained serving size must be a positive number');
    expect(() => buildDraining({ ...draft, drainedValues: { ...draft.drainedValues, protein: '-1' } }, [], []))
      .toThrow('non-negative numbers');
    expect(() => buildDraining({ ...draft, drainedConfirmed: true }, [], [])).toThrow('before confirming');
  });

  it('confirms drained values without a source while requiring real directions and values', () => {
    const recipe = { id: 'f-1', name: 'Recipe', recordType: 'formulation' as const, lines: [], tags: [],
      createdAt: now, updatedAt: now };
    const draft = { ...filled(), drainingEnabled: true, drainingDirections: 'Drain.',
      drainedValues: { ...filled().drainedValues, protein: '12' }, drainedConfirmed: true };
    expect(buildDraining(draft, [recipe], [])).toMatchObject({
      enabled: true, directions: 'Drain.', values: { protein: '12' }, confirmationSnapshot: expect.any(String),
    });
    expect(() => buildDraining({ ...draft, drainingDirections: '' }, [recipe], [])).toThrow('before confirming');
    expect(() => buildDraining({ ...draft, drainedSourceDate: '2026-02-31' }, [recipe], [])).toThrow('valid');
  });
});

describe('productStepStatuses', () => {
  it('shows everything as still needed for an empty draft', () => {
    const statuses = productStepStatuses(emptyProductDraft(), undefined);
    expect(statuses.about.done).toBe(false);
    expect(statuses.type.done).toBe(false);
    expect(statuses.pack.done).toBe(false);
  });

  it('marks pack done only when all three amounts are present', () => {
    const draft = { ...filled(), servingSize: '250', servingsPerPack: '2' };
    expect(productStepStatuses(draft, undefined).pack.done).toBe(false);
    expect(productStepStatuses({ ...draft, netQuantity: '500' }, undefined).pack.done).toBe(false);
    expect(productStepStatuses({ ...draft, netQuantity: '500', servingUnit: 'mL' }, undefined).pack.done).toBe(false);
    expect(productStepStatuses({ ...draft, netQuantity: '500', servingUnit: 'mL', netUnit: 'mL' }, undefined).pack.done).toBe(true);
  });

  it('treats saved additive entries as answered', () => {
    const saved = { additiveNameInputs: {}, claims: [] } as unknown as ProductRecord;
    const statuses = productStepStatuses(filled(), saved);
    expect(statuses.additives.done).toBe(true);
  });
});
