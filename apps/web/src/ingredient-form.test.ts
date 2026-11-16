import { describe, expect, it } from 'vitest';
import type { IngredientRecord } from '@aus-food/storage';
import {
  buildIngredientRecord,
  currentAllergenCoverage,
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
  it('round-trips optional nutrients in both bases and retains their original sources', () => {
    const draft = emptyIngredientDraft();
    draft.name = 'Example';
    draft.kind = 'atomic';
    draft.nutritionSourceType = 'database';
    draft.nutritionSourceReference = 'Database';
    draft.nutritionSourceDate = '2026-01-01';
    draft.additionalNutrientsMass.push({ key: 'dietaryFibre', value: '0', unit: 'g' });
    draft.additionalNutrientsVolume.push({ key: 'dietaryFibre', value: '250', unit: 'mg' });
    const first = buildIngredientRecord(draft, undefined, makeId, now);
    expect(first.nutrientProfile?.values.dietaryFibre).toMatchObject({
      value: '0', unit: 'g/100g', sourceId: 'Database', evidenceType: 'database',
    });
    expect(first.additionalNutritionPer100mL?.dietaryFibre).toMatchObject({
      value: '250', unit: 'mg/100mL', sourceId: 'Database', evidenceType: 'database',
    });
    const edit = draftFromIngredient(first);
    edit.nutritionSourceReference = 'New source';
    expect(buildIngredientRecord(edit, first, makeId, now).additionalNutritionPer100mL).toEqual(first.additionalNutritionPer100mL);
    expect(buildIngredientRecord(edit, first, makeId, now).nutrientProfile).toEqual(first.nutrientProfile);
    edit.additionalNutrientsMass[0]!.unit = 'mg';
    expect(buildIngredientRecord(edit, first, makeId, now).nutrientProfile?.values.dietaryFibre)
      .toMatchObject({ unit: 'mg/100g', sourceId: 'New source' });
    edit.additionalNutrientsMass = [];
    edit.additionalNutrientsVolume = [];
    const removed = buildIngredientRecord(edit, first, makeId, now);
    expect(removed.nutrientProfile).toBeUndefined();
    expect(removed.additionalNutritionPer100mL).toBeUndefined();
  });

  it('rejects invalid and duplicate optional values while leaving blanks unknown', () => {
    const draft = emptyIngredientDraft();
    draft.name = 'Example';
    draft.kind = 'atomic';
    draft.additionalNutrientsMass.push({ key: 'dietaryFibre', value: '', unit: 'g' });
    expect(buildIngredientRecord(draft, undefined, makeId, now).nutrientProfile).toBeUndefined();
    draft.additionalNutrientsMass[0]!.value = '-1';
    expect(() => buildIngredientRecord(draft, undefined, makeId, now)).toThrow(/non-negative/);
    draft.additionalNutrientsMass[0]!.value = '0';
    expect(() => buildIngredientRecord(draft, undefined, makeId, now)).toThrow(/nutrition source/);
    draft.additionalNutrientsMass.push({ key: 'dietaryFibre', value: '', unit: 'g' });
    draft.nutritionSourceType = 'database';
    draft.nutritionSourceReference = 'Database';
    draft.nutritionSourceDate = '2026-01-01';
    expect(() => buildIngredientRecord(draft, undefined, makeId, now)).toThrow(/only once/);
    draft.additionalNutrientsMass = [];
    draft.additionalNutrientsVolume.push({ key: 'alcohol', value: 'abc', unit: 'g' });
    expect(() => buildIngredientRecord(draft, undefined, makeId, now)).toThrow(/non-negative/);
  });
  it('records only supplier-stated facts and keeps dated disagreements', () => {
    const draft = filledDraft();
    expect(buildIngredientRecord(draft, undefined, makeId, now).supplierFacts).toBeUndefined();
    draft.supplierFacts.fruitJuice.status = 'absent';
    draft.supplierFacts.addedVitamins.status = 'absent';
    const original = buildIngredientRecord(draft, undefined, makeId, now);
    expect(original.supplierFacts?.fruitJuice).toEqual([
      { status: 'absent', specification: { reference: 'SPEC-1', sourceDate: '2026-01-01' } },
    ]);
    expect(original.supplierFacts?.addedTaurine).toBeUndefined();
    const edit = draftFromIngredient(original);
    edit.specificationDate = '2026-02-01';
    expect(buildIngredientRecord(edit, original, makeId, now).supplierFacts).toEqual(original.supplierFacts);
    edit.supplierFacts.fruitJuice.status = 'present';
    const changed = buildIngredientRecord(edit, original, makeId, now);
    expect(changed.supplierFacts?.fruitJuice).toEqual([
      { status: 'absent', specification: { reference: 'SPEC-1', sourceDate: '2026-01-01' } },
      { status: 'present', specification: { reference: 'SPEC-1', sourceDate: '2026-02-01' } },
    ]);
    const reconfirm = draftFromIngredient(changed);
    reconfirm.supplierFacts.addedVitamins.confirmCurrentSpec = true;
    expect(buildIngredientRecord(reconfirm, changed, makeId, now).supplierFacts?.addedVitamins).toHaveLength(2);
    reconfirm.supplierFacts.fruitJuice.status = '';
    expect(() => buildIngredientRecord(reconfirm, changed, makeId, now)).toThrow(/saved statements cannot be removed/);
    const noSource = emptyIngredientDraft();
    noSource.name = 'Example';
    noSource.kind = 'atomic';
    noSource.supplierFacts.addedTaurine.status = 'present';
    expect(() => buildIngredientRecord(noSource, undefined, makeId, now)).toThrow(/specification reference and date/);
  });
  it('keeps the other Schedule 28 coverage unknown, dated and conflict-aware', () => {
    const draft = filledDraft();
    expect(buildIngredientRecord(draft, undefined, makeId, now).otherSchedule28Statements).toBeUndefined();
    draft.supplierFacts.otherSchedule28.status = 'absent';
    const original = buildIngredientRecord(draft, undefined, makeId, now);
    expect(original.otherSchedule28Statements).toEqual([
      { status: 'absent', specification: { reference: 'SPEC-1', sourceDate: '2026-01-01' } },
    ]);
    const edit = draftFromIngredient(original);
    edit.specificationDate = '2026-02-01';
    expect(buildIngredientRecord(edit, original, makeId, now).otherSchedule28Statements).toEqual(original.otherSchedule28Statements);
    edit.supplierFacts.otherSchedule28.status = 'present';
    const changed = buildIngredientRecord(edit, original, makeId, now);
    expect(changed.otherSchedule28Statements).toEqual([
      ...original.otherSchedule28Statements!,
      { status: 'present', specification: { reference: 'SPEC-1', sourceDate: '2026-02-01' } },
    ]);
    const clear = draftFromIngredient(changed);
    clear.supplierFacts.otherSchedule28.status = '';
    expect(() => buildIngredientRecord(clear, changed, makeId, now)).toThrow(/saved statements cannot be removed/);
    const noSource = emptyIngredientDraft();
    noSource.name = 'Example';
    noSource.kind = 'atomic';
    noSource.supplierFacts.otherSchedule28.status = 'absent';
    expect(() => buildIngredientRecord(noSource, undefined, makeId, now)).toThrow(/specification reference and date/);
  });
  it('stores supplier volume nutrition separately, retaining the original source on edits', () => {
    const draft = filledDraft();
    draft.nutritionPer100mL.energy = '0';
    draft.nutritionPer100mL.sodium = '5.1';
    const first = buildIngredientRecord(draft, undefined, makeId, now);
    expect(first.nutritionPer100mL).toEqual({
      energy: { value: '0', sourceId: 'SPEC-1', sourceDate: '2026-01-01' },
      sodium: { value: '5.1', sourceId: 'SPEC-1', sourceDate: '2026-01-01' },
    });
    const edit = draftFromIngredient(first);
    edit.specificationDate = '2026-02-01';
    expect(buildIngredientRecord(edit, first, makeId, now).nutritionPer100mL).toEqual(first.nutritionPer100mL);
    edit.nutritionPer100mL.energy = '-1';
    expect(() => buildIngredientRecord(edit, first, makeId, now)).toThrow(/non-negative per-100 mL/);
  });
  it('stores explicit identities with their specification and never infers them from names', () => {
    const draft = filledDraft();
    draft.name = 'Caffeine';
    expect(buildIngredientRecord(draft, undefined, makeId, now).ingredientIdentity).toBeUndefined();
    draft.ingredientIdentity = 'unrecognised';
    const first = buildIngredientRecord(draft, undefined, makeId, now);
    expect(first.ingredientIdentity).toEqual({
      vocabularyVersion: 'demo-ingredients-1', code: 'unrecognised',
      specification: { reference: 'SPEC-1', sourceDate: '2026-01-01' },
    });
    const edit = draftFromIngredient(first);
    edit.specificationDate = '2026-02-01';
    expect(buildIngredientRecord(edit, first, makeId, now).ingredientIdentity).toEqual(first.ingredientIdentity);
    edit.confirmIdentityForCurrentSpec = true;
    expect(buildIngredientRecord(edit, first, makeId, now).ingredientIdentity?.specification.sourceDate).toBe('2026-02-01');
  });
  it('records sourced caffeine evidence without treating blank as absence', () => {
    const draft = filledDraft();
    expect(buildIngredientRecord(draft, undefined, makeId, now).caffeineEvidence).toBeUndefined();
    draft.caffeineStatus = 'present';
    draft.caffeineAmount = '100';
    draft.caffeineUnit = 'g/100g';
    const present = buildIngredientRecord(draft, undefined, makeId, now);
    expect(present.caffeineEvidence).toEqual({
      status: 'present', amount: '100', unit: 'g/100g',
      specification: { reference: 'SPEC-1', sourceDate: '2026-01-01' },
    });
    const edit = draftFromIngredient(present);
    edit.specificationDate = '2026-02-01';
    expect(buildIngredientRecord(edit, present, makeId, now).caffeineEvidence).toEqual(present.caffeineEvidence);
    edit.confirmCaffeineForCurrentSpec = true;
    expect(buildIngredientRecord(edit, present, makeId, now).caffeineEvidence?.specification.sourceDate).toBe('2026-02-01');
    edit.confirmCaffeineForCurrentSpec = false;
    edit.caffeineStatus = 'conflicting';
    expect(() => buildIngredientRecord(edit, present, makeId, now)).toThrow(/both caffeine statements/);
    edit.caffeineStatements[1] = {
      status: 'absent', amount: '', unit: '', reference: 'SPEC-2', sourceDate: '2026-02-01',
    };
    const conflicting = buildIngredientRecord(edit, present, makeId, now);
    expect(conflicting.caffeineEvidence?.statements).toEqual([
      present.caffeineEvidence,
      { status: 'absent', specification: { reference: 'SPEC-2', sourceDate: '2026-02-01' } },
    ]);
    const roundTrip = draftFromIngredient(conflicting);
    expect(buildIngredientRecord(roundTrip, conflicting, makeId, now).caffeineEvidence).toEqual(conflicting.caffeineEvidence);
    roundTrip.specificationDate = '2026-03-01';
    expect(buildIngredientRecord(roundTrip, conflicting, makeId, now).caffeineEvidence).toEqual(conflicting.caffeineEvidence);
    roundTrip.caffeineDecision = 'statement2';
    expect(() => buildIngredientRecord(roundTrip, conflicting, makeId, now)).toThrow(/explain why/);
    roundTrip.caffeineDecisionReason = 'Supplier confirmed the second document applies.';
    const decided = buildIngredientRecord(roundTrip, conflicting, makeId, now);
    expect(decided.caffeineEvidence?.decisions).toEqual([{
      choice: 'statement2', reason: 'Supplier confirmed the second document applies.', recordedAt: now,
    }]);
    expect(decided.caffeineEvidence?.statements).toEqual(conflicting.caffeineEvidence?.statements);
    const reconsider = draftFromIngredient(decided);
    expect(buildIngredientRecord(reconsider, decided, makeId, now).caffeineEvidence).toEqual(decided.caffeineEvidence);
    reconsider.caffeineDecision = 'unresolved';
    reconsider.caffeineDecisionReason = 'Supplier withdrew confirmation.';
    expect(buildIngredientRecord(reconsider, decided, makeId, now).caffeineEvidence?.decisions).toHaveLength(2);
    reconsider.caffeineStatements[0].amount = '6';
    expect(() => buildIngredientRecord(reconsider, decided, makeId, now)).toThrow(/cannot be changed/);
    roundTrip.caffeineStatus = 'absent';
    expect(() => buildIngredientRecord(roundTrip, conflicting, makeId, now)).toThrow(/cannot yet be removed/);
    edit.caffeineStatus = 'absent';
    expect(buildIngredientRecord(edit, present, makeId, now).caffeineEvidence?.status).toBe('absent');
    edit.caffeineStatus = 'present';
    edit.caffeineAmount = '0';
    expect(() => buildIngredientRecord(edit, present, makeId, now)).toThrow(/positive caffeine amount/);
  });
  it('builds a record with nutrient evidence from the specification', () => {
    const record = buildIngredientRecord(filledDraft(), undefined, makeId, now);
    expect(record.nutrientProfile?.values.protein).toMatchObject({
      value: '12.5',
      sourceId: 'SPEC-1',
      evidenceType: 'supplier',
    });
  });

    it('records non-supplier nutrition sources and keeps unchanged evidence on edit', () => {
      const draft = emptyIngredientDraft();
      draft.name = 'Flour';
      draft.kind = 'atomic';
      draft.nutritionSourceType = 'database';
      draft.nutritionSourceReference = 'Food database entry';
      draft.nutritionSourceDate = '2026-01-01';
      draft.nutrients.protein = '12';
      draft.energyPer100g = '1400';
      const record = buildIngredientRecord(draft, undefined, makeId, now);
      expect(record.specification).toBeUndefined();
      expect(record.nutrientProfile?.values.protein).toMatchObject({ evidenceType: 'database', sourceId: 'Food database entry' });
      expect(record.energyPer100g).toMatchObject({ evidenceType: 'database', sourceId: 'Food database entry' });
      const edit = draftFromIngredient(record);
      edit.nutritionSourceReference = 'Another entry';
      edit.nutrients.fat = '2';
      const updated = buildIngredientRecord(edit, record, makeId, now);
      expect(updated.nutrientProfile?.values.protein).toEqual(record.nutrientProfile?.values.protein);
      expect(updated.nutrientProfile?.values.fat?.sourceId).toBe('Another entry');
      edit.nutritionSourceDate = '2026-02-31';
      expect(() => buildIngredientRecord(edit, record, makeId, now)).toThrow(/valid nutrition source date/);
    });

    it('records allergen coverage with a non-supplier source and detects stale coverage', () => {
      const draft = emptyIngredientDraft();
      draft.name = 'Flour';
      draft.kind = 'atomic';
      draft.allergenSourceType = 'productLabel';
      draft.allergenSourceReference = 'Ingredient label';
      draft.allergenSourceDate = '2026-01-01';
      draft.knownAllergens = ['wheat'];
      draft.allergensConfirmed = true;
      const record = buildIngredientRecord(draft, undefined, makeId, now);
      expect(record.specification).toBeUndefined();
      expect(currentAllergenCoverage(record)).toMatchObject({ sourceId: 'Ingredient label' });
      const edit = draftFromIngredient(record);
      expect(edit.specificationReference).toBe('');
      expect(edit.allergensConfirmed).toBe(true);
      expect(buildIngredientRecord(edit, record, makeId, now).allergenCoverage).toEqual(record.allergenCoverage);
      const stale = { ...record, allergenEvidence: [{ ...record.allergenEvidence![0]!, assessments: { milk: 'present' as const } }] };
      expect(currentAllergenCoverage(stale)).toBeUndefined();
      edit.allergensConfirmed = false;
      const unconfirmed = buildIngredientRecord(edit, record, makeId, now);
      expect(currentAllergenCoverage(unconfirmed)).toBeUndefined();
      expect(draftFromIngredient(unconfirmed).allergenSourceType).toBe('productLabel');
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
    expect(() => buildIngredientRecord(draft, undefined, makeId, now)).toThrow(/source type, reference and date/);
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
  it('does not silently re-date unchanged allergen evidence when a specification changes', () => {
    const draft = filledDraft();
    draft.knownAllergens = ['milk'];
    const original = buildIngredientRecord(draft, undefined, makeId, now);
    const edit = draftFromIngredient(original);
    edit.specificationDate = '2026-02-01';
    const updated = buildIngredientRecord(edit, original, makeId, now);
    expect(updated.allergenEvidence).toEqual(original.allergenEvidence);
    expect(updated.coverageSpecification).toBeUndefined();
  });
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
    expect(statuses.nutrition.text).toBe('1 of 7 entered per 100 g');
    expect(statuses.allergens.text).toBe('Still needed');
  });

  it('does not mark volume-only values as ready for calculation', () => {
    const draft = emptyIngredientDraft();
    draft.nutritionPer100mL.energy = '0';
    const status = ingredientStepStatuses(draft).nutrition;
    expect(status.done).toBe(false);
    expect(status.text).toContain('require sourced ingredient density');
  });
});
