import { describe, expect, it } from 'vitest';
import type { IngredientRecord } from '@aus-food/storage';
import {
  buildIngredientRecord,
  draftFromIngredient,
  emptyAdditiveSourceDraft,
  emptyIngredientDraft,
  ingredientStepStatuses,
} from './ingredient-form';

let counter = 0;
const makeId = (prefix: string) => `${prefix}-${++counter}`;
const now = '2026-01-01T00:00:00.000Z';

function filledDraft() {
  const draft = emptyIngredientDraft();
  draft.name = 'Rolled oats';
  draft.kind = 'atomic';
  draft.specificationReference = 'SPEC-1';
  draft.specificationDate = '2026-01-01';
  draft.nutrients.protein = '12.5';
  return draft;
}

describe('buildIngredientRecord', () => {
  it('builds a record with nutrient evidence from the specification', () => {
    const record = buildIngredientRecord(filledDraft(), undefined, makeId, now);
    expect(record.nutrientProfile?.values.protein).toMatchObject({
      value: '12.5',
      sourceId: 'SPEC-1',
      evidenceType: 'supplier',
    });
  });

  it('requires a specification before nutrient values', () => {
    const draft = filledDraft();
    draft.specificationReference = '';
    draft.specificationDate = '';
    expect(() => buildIngredientRecord(draft, undefined, makeId, now)).toThrow(/reference and date/);
  });

  it('stores supplier energy evidence and removes it when cleared', () => {
    const draft = filledDraft();
    draft.energyPer100g = '123.4';
    const record = buildIngredientRecord(draft, undefined, makeId, now);
    expect(record.energyPer100g).toEqual({ value: '123.4', sourceId: 'SPEC-1', sourceDate: '2026-01-01' });
    const edit = draftFromIngredient(record);
    edit.energyPer100g = '';
    expect(buildIngredientRecord(edit, record, makeId, now).energyPer100g).toBeUndefined();
    draft.energyPer100g = '-1';
    expect(() => buildIngredientRecord(draft, undefined, makeId, now)).toThrow(/energy/);
  });

  it('requires a name and a type', () => {
    expect(() => buildIngredientRecord(emptyIngredientDraft(), undefined, makeId, now)).toThrow();
  });

  it('rejects non-numeric nutrients', () => {
    const draft = filledDraft();
    draft.nutrients.fat = 'abc';
    expect(() => buildIngredientRecord(draft, undefined, makeId, now)).toThrow(/Fat/);
  });

  it('records ticked allergens as present', () => {
    const draft = filledDraft();
    draft.knownAllergens = ['wheat', 'milk'];
    const record = buildIngredientRecord(draft, undefined, makeId, now);
    expect(record.allergenEvidence?.[0]?.assessments).toEqual({ wheat: 'present', milk: 'present' });
  });

  it('requires a supplier reference for explicit coverage confirmations', () => {
    const draft = emptyIngredientDraft();
    draft.name = 'Water';
    draft.kind = 'atomic';
    draft.allergensConfirmed = true;
    expect(() => buildIngredientRecord(draft, undefined, makeId, now)).toThrow(/specification reference and date/);
    draft.allergensConfirmed = false;
    draft.additivesConfirmed = true;
    expect(() => buildIngredientRecord(draft, undefined, makeId, now)).toThrow(/specification reference and date/);
    draft.specificationReference = 'SPEC';
    draft.specificationDate = '2026-01-01';
    const record = buildIngredientRecord(draft, undefined, makeId, now);
    expect(record.additivesConfirmed).toBe(true);
    expect(record.allergensConfirmed).toBe(false);
    expect(record.allergenEvidence).toBeUndefined();
  });
});

describe('editing keeps data the form does not manage', () => {
  it('preserves fibre, unchanged nutrient evidence and non-present allergen statements', () => {
    const original = buildIngredientRecord(filledDraft(), undefined, makeId, now);
    const withExtras: IngredientRecord = {
      ...original,
      nutrientProfile: {
        ingredientId: original.id,
        values: {
          ...original.nutrientProfile!.values,
          dietaryFibre: {
            value: '10',
            unit: 'g/100g',
            sourceId: 'OTHER',
            sourceDate: '2025-05-05',
            evidenceType: 'supplier',
          },
        },
      },
      allergenEvidence: [
        {
          id: 'ae-1',
          subjectId: original.id,
          kind: 'ingredient',
          sourceId: 'SPEC-1',
          sourceDate: '2026-01-01',
          sourcePath: [original.id],
          assessments: { wheat: 'present', soy: 'absent' },
        },
      ] as unknown as NonNullable<IngredientRecord['allergenEvidence']>,
    };
    const draft = draftFromIngredient(withExtras);
    draft.supplierName = 'New Supplier';
    draft.specificationDate = '2026-02-02';
    const edited = buildIngredientRecord(draft, withExtras, makeId, now);
    expect(edited.id).toBe(original.id);
    expect(edited.supplierName).toBe('New Supplier');
    expect(edited.nutrientProfile?.values.dietaryFibre?.sourceDate).toBe('2025-05-05');
    // Unchanged protein keeps its original evidence date rather than being re-dated.
    expect(edited.nutrientProfile?.values.protein?.sourceDate).toBe('2026-01-01');
    expect(edited.allergenEvidence?.[0]?.assessments).toEqual({ wheat: 'present', soy: 'absent' });
    expect(edited.createdAt).toBe(now);
  });

  it('keeps additive source ids and evidence ids through an edit', () => {
    const draft = filledDraft();
    const source = emptyAdditiveSourceDraft('add-1');
    source.additiveName = 'Caffeine';
    source.showEvidence = true;
    source.sourceReference = 'COA-9';
    source.sourceDate = '2026-01-01';
    draft.additiveSources = [source];
    const first = buildIngredientRecord(draft, undefined, makeId, now);
    const again = buildIngredientRecord(draftFromIngredient(first), first, makeId, now);
    expect(again.additiveSources?.[0]?.id).toBe('add-1');
    expect(again.additiveSources?.[0]?.sourceEvidence?.[0]?.id).toBe(
      first.additiveSources?.[0]?.sourceEvidence?.[0]?.id,
    );
  });

  it('needs both a value and unit when an amount is given', () => {
    const draft = filledDraft();
    const source = emptyAdditiveSourceDraft('add-1');
    source.additiveName = 'Caffeine';
    source.showAmount = true;
    source.concentrationValue = '5';
    draft.additiveSources = [source];
    expect(() => buildIngredientRecord(draft, undefined, makeId, now)).toThrow(/value and unit/);
  });
});

describe('ingredientStepStatuses', () => {
  it('reports progress in plain words', () => {
    const statuses = ingredientStepStatuses(filledDraft());
    expect(statuses.about.done).toBe(true);
    expect(statuses.nutrition.text).toBe('1 of 7 entered');
    expect(statuses.allergens.text).toBe('Still needed');
  });
});
