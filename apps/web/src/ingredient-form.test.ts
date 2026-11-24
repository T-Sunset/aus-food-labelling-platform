import { describe, expect, it } from 'vitest';
import type { IngredientRecord } from '@aus-food/storage';
import {
  buildIngredientRecord,
  currentAdditiveCoverage,
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
  it('edits expanded nutrients on both bases without guessing or losing their forms and evidence', () => {
    const draft = emptyIngredientDraft();
    draft.name = 'Example';
    draft.kind = 'atomic';
    draft.nutritionSourceType = 'analysis';
    draft.nutritionSourceReference = 'Lab';
    draft.nutritionSourceDate = '2026-01-01';
    draft.additionalNutrientsMass.push(
      { key: 'vitaminA', value: '10', unit: 'ug', expressionChoice: 'supported' },
      { key: 'vitaminB12', value: '2', unit: 'ug', expressionChoice: '' },
      { key: 'calcium', value: '5', unit: 'mg', expression: 'calcium carbonate' },
    );
    draft.additionalNutrientsVolume.push(
      { key: 'vitaminA', value: '3', unit: 'ug', expressionChoice: 'other', expression: 'another form' },
    );
    const first = buildIngredientRecord(draft, undefined, makeId, now);
    expect(first.nutrientProfile?.values.vitaminA).toMatchObject({ expression: 'retinolEquivalents' });
    expect(first.nutrientProfile?.values.vitaminB12?.expression).toBeUndefined();
    expect(first.nutrientProfile?.values.calcium?.expression).toBe('calcium carbonate');
    expect(first.additionalNutritionPer100mL?.vitaminA?.expression).toBe('another form');

    const original: IngredientRecord = {
      ...first,
      nutrientProfile: { ...first.nutrientProfile!, values: {
        ...first.nutrientProfile!.values,
        vitaminA: { ...first.nutrientProfile!.values.vitaminA!, method: 'Laboratory method' },
      } },
      additionalNutritionPer100mL: {
        vitaminA: { ...first.additionalNutritionPer100mL!.vitaminA!, method: 'Other method' },
      },
    };
    const edit = draftFromIngredient(original);
    expect(buildIngredientRecord(edit, original, makeId, now).nutrientProfile).toEqual(original.nutrientProfile);
    expect(buildIngredientRecord(edit, original, makeId, now).additionalNutritionPer100mL)
      .toEqual(original.additionalNutritionPer100mL);
    edit.additionalNutrientsMass.find((item) => item.key === 'vitaminA')!.expressionChoice = '';
    edit.additionalNutrientsVolume[0]!.expressionChoice = 'supported';
    edit.additionalNutrientsMass.find((item) => item.key === 'vitaminB12')!.value = '';
    edit.additionalNutrientsMass = edit.additionalNutrientsMass.filter((item) => item.key !== 'calcium');
    const changed = buildIngredientRecord(edit, original, makeId, now);
    expect(changed.nutrientProfile?.values.vitaminA).toEqual({
      value: '10', unit: 'ug/100g', sourceId: 'Lab', sourceDate: '2026-01-01',
      evidenceType: 'analysis', method: 'Laboratory method',
    });
    expect(changed.nutrientProfile?.values.vitaminB12).toBeUndefined();
    expect(changed.nutrientProfile?.values.calcium).toBeUndefined();
    expect(changed.additionalNutritionPer100mL?.vitaminA).toMatchObject({
      value: '3', expression: 'retinolEquivalents', sourceId: 'Lab', method: 'Other method',
    });
  });

  it('preserves expanded nutrient evidence during unrelated edits and handles microgram units', () => {
    const original: IngredientRecord = {
      ...buildIngredientRecord(filledDraft(), undefined, makeId, now),
      nutrientProfile: { ingredientId: 'ingredient', values: {
        protein: { value: '12500000', unit: 'ug/100g', sourceId: 'Lab', sourceDate: '2026-01-01', evidenceType: 'analysis' },
        vitaminA: { value: '10', unit: 'ug/100g', sourceId: 'Lab', sourceDate: '2026-01-01', evidenceType: 'analysis', expression: 'retinolEquivalents' },
        dietaryFibre: { value: '2000', unit: 'ug/100g', sourceId: 'Lab', sourceDate: '2026-01-01', evidenceType: 'analysis' },
      } },
      additionalNutritionPer100mL: {
        vitaminB12: { value: '1', unit: 'ug/100mL', sourceId: 'Lab', sourceDate: '2026-01-01', evidenceType: 'analysis', expression: 'cyanocobalamin' },
        dietaryFibre: { value: '4000', unit: 'ug/100mL', sourceId: 'Lab', sourceDate: '2026-01-01', evidenceType: 'analysis' },
      },
    };
    const draft = draftFromIngredient(original);
    expect(draft.nutrients.protein).toBe('12.5');
    expect(draft.additionalNutrientsMass[0]?.unit).toBe('ug');
    expect(draft.additionalNutrientsVolume[0]?.unit).toBe('ug');
    draft.name = 'Edited oats';
    const saved = buildIngredientRecord(draft, original, makeId, now);
    expect(saved.nutrientProfile?.values).toEqual(original.nutrientProfile?.values);
    expect(saved.additionalNutritionPer100mL).toEqual(original.additionalNutritionPer100mL);
  });
  it('records a direct additive once using the ingredient name and preserves its information', () => {
    const draft = emptyIngredientDraft();
    draft.name = 'Example additive';
    draft.kind = 'atomic';
    const direct = emptyAdditiveSourceDraft('direct');
    direct.codeNumber = '999';
    draft.additiveSources.push(direct);
    draft.directAdditiveSourceId = direct.id;
    draft.additiveCoverageType = 'user';
    draft.additiveCoverageReference = 'Recipe knowledge';
    draft.additiveCoverageDate = '2026-01-01';
    draft.additivesConfirmed = true;
    const record = buildIngredientRecord(draft, undefined, makeId, now);
    expect(record.additiveSources).toHaveLength(1);
    expect(record.additiveSources?.[0]).toMatchObject({ additiveName: 'Example additive', codeNumber: '999', sourceStatus: 'unknown' });
    expect(record.additiveSources?.[0]?.concentration).toBeUndefined();
    expect(currentAdditiveCoverage(record)).toBe(true);
    const edit = draftFromIngredient(record);
    expect(buildIngredientRecord(edit, record, makeId, now).directAdditiveSourceId).toBe('direct');
    expect(currentAdditiveCoverage({ ...record, additiveSources: [{ ...record.additiveSources![0]!, codeNumber: '123' }] })).toBe(false);
    edit.name = 'Renamed additive';
    edit.additivesConfirmed = false;
    const changed = buildIngredientRecord(edit, record, makeId, now);
    expect(changed.additiveSources?.[0]?.additiveName).toBe('Renamed additive');
    expect(currentAdditiveCoverage(changed)).toBe(false);
    edit.kind = 'compound';
    edit.compoundFormulationId = 'recipe';
    expect(() => buildIngredientRecord(edit, record, makeId, now)).toThrow(/direct additive/);
  });

  it('keeps earlier additive wording and mixture concentration when editing the ingredient', () => {
    const draft = emptyIngredientDraft();
    draft.name = 'Example blend';
    draft.kind = 'atomic';
    const source = emptyAdditiveSourceDraft('direct');
    source.declarationRoute = 'schedule7Class';
    source.schedule7ClassName = 'Preservative';
    source.substanceChoice = 'schedule8Name';
    source.showAmount = true;
    source.concentrationValue = '25';
    source.concentrationUnit = 'percentByMass';
    source.concentrationBasis = 'asSupplied';
    draft.additiveSources.push(source);
    draft.directAdditiveSourceId = source.id;
    const record = buildIngredientRecord(draft, undefined, makeId, now);
    const edit = draftFromIngredient(record);
    edit.supplierName = 'Updated supplier';
    const saved = buildIngredientRecord(edit, record, makeId, now);
    expect(saved.additiveSources?.[0]?.declarationSelection).toEqual(record.additiveSources?.[0]?.declarationSelection);
    expect(saved.additiveSources?.[0]?.concentration).toEqual({ value: '25', unit: 'percentByMass', basis: 'asSupplied' });
    const unknown: IngredientRecord = { ...record, additiveSources: [{
      ...record.additiveSources![0]!, declarationSelection: { route: 'unknown' },
    }] };
    expect(buildIngredientRecord(draftFromIngredient(unknown), unknown, makeId, now)
      .additiveSources?.[0]?.declarationSelection).toEqual({ route: 'unknown' });
  });
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
    expect(buildIngredientRecord(draft, undefined, makeId, now).nutrientProfile?.values.dietaryFibre)
      .toMatchObject({ value: '0', sourceId: '', sourceDate: '', evidenceType: 'user' });
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
  it('preserves legacy caffeine evidence during unrelated ingredient edits', () => {
    const original: IngredientRecord = {
      ...buildIngredientRecord(filledDraft(), undefined, makeId, now),
      caffeineEvidence: {
        status: 'conflicting',
        specification: { reference: 'Supplier statement', sourceDate: '2026-01-01' },
        statements: [
          { status: 'present', amount: '12', unit: 'mg/100g', specification: { reference: 'Supplier statement', sourceDate: '2026-01-01' } },
          { status: 'absent', specification: { reference: 'Updated supplier statement', sourceDate: '2026-02-01' } },
        ],
      },
    };
    const draft = draftFromIngredient(original);
    expect('caffeineStatus' in draft).toBe(false);
    draft.name = 'Edited oats';
    expect(buildIngredientRecord(draft, original, makeId, now).caffeineEvidence).toEqual(original.caffeineEvidence);
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
      draft.wheatGlutenStatus = 'present';
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
  it('stores manually entered nutrients without inventing a source', () => {
    const draft = filledDraft();
    draft.specificationReference = '';
    draft.specificationDate = '';
    expect(buildIngredientRecord(draft, undefined, makeId, now).nutrientProfile?.values.protein)
      .toMatchObject({ value: '12.5', sourceId: '', sourceDate: '', evidenceType: 'user' });
  });

  it('preserves partial source details and an unsourced density across edits', () => {
    const draft = emptyIngredientDraft();
    draft.name = 'Juice';
    draft.kind = 'atomic';
    draft.nutrients.protein = '1';
    draft.nutritionSourceReference = 'Package';
    draft.allergenSourceDate = '2026-01-01';
    draft.knownAllergens = ['milk'];
    draft.allergensConfirmed = true;
    draft.ingredientDensity = '1.05';
    const record = buildIngredientRecord(draft, undefined, makeId, now);
    expect(record.nutritionEntrySource).toMatchObject({ sourceId: 'Package', sourceDate: '' });
    expect(record.allergenCoverage).toMatchObject({ sourceId: '', sourceDate: '2026-01-01' });
    expect(record.ingredientDensity).toMatchObject({ gramsPerMillilitre: '1.05', evidenceReference: '', sourceDate: '' });
    const edited = buildIngredientRecord(draftFromIngredient(record), record, makeId, now);
    expect(edited.nutritionEntrySource).toEqual(record.nutritionEntrySource);
    expect(edited.allergenCoverage).toEqual(record.allergenCoverage);
    expect(edited.ingredientDensity).toEqual(record.ingredientDensity);
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

  it('allows allergen and additive confirmation without inventing sources', () => {
    const draft = emptyIngredientDraft();
    draft.name = 'Water';
    draft.kind = 'atomic';
    draft.allergensConfirmed = true;
    const unsourced = buildIngredientRecord(draft, undefined, makeId, now);
    expect(currentAllergenCoverage(unsourced)).toMatchObject({ sourceId: '', sourceDate: '' });
    expect(draftFromIngredient(unsourced).allergensConfirmed).toBe(true);
    draft.allergensConfirmed = false;
    draft.additivesConfirmed = true;
    const additiveUnsourced = buildIngredientRecord(draft, undefined, makeId, now);
    expect(currentAdditiveCoverage(additiveUnsourced)).toBe(true);
    expect(additiveUnsourced.additiveCoverage).toMatchObject({ sourceId: '', sourceDate: '', sourceType: 'user' });
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
    expect(status.text).toContain('require ingredient density');
  });

  it('counts volume values when an unsourced density is supplied', () => {
    const draft = emptyIngredientDraft();
    draft.nutritionPer100mL.energy = '0';
    draft.ingredientDensity = '1';
    expect(ingredientStepStatuses(draft).nutrition.text).toBe('1 of 7 entered per 100 g');
  });
});
