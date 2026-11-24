import { describe, expect, it } from 'vitest';
import type { FormulationRecord, IngredientRecord, LabelPackCopy, ProductRecord } from '@aus-food/storage';
import { buildIngredientRecord, emptyIngredientDraft } from './ingredient-form';
import { makeLabelDraft } from './label-draft';
import { makeConsultantNotes } from './consultant-notes';
import { makeLabelLayout } from './label-layout';
import { initialLabelLayout } from './label-settings';
import { drainingSnapshot, nutritionRecipeSignature, preparationRecipeSignature } from './product-form';
import { productCompletionItems } from './product-completion';

const now = '2026-01-01T00:00:00.000Z';

function ingredient(
  name: string,
  allergens: string[] = [],
  wheatGlutenStatus: 'present' | 'absent' = 'present',
  id = name,
): IngredientRecord {
  const draft = emptyIngredientDraft();
  draft.name = name;
  draft.kind = 'atomic';
  draft.specificationReference = `${name}-spec`;
  draft.specificationDate = '2026-01-01';
  draft.knownAllergens = allergens;
  if (allergens.includes('wheat')) draft.wheatGlutenStatus = wheatGlutenStatus;
  draft.allergensConfirmed = true;
  draft.additivesConfirmed = true;
  draft.nutrients = { protein: '1', fat: '1', saturatedFat: '1', carbohydrate: '1', sugars: '1', sodium: '1' };
  draft.energyPer100g = '100';
  return buildIngredientRecord(draft, undefined, (prefix) => prefix === 'ingredient' ? id : `${id}-${prefix}`, now);
}

const recipe: FormulationRecord = {
  id: 'recipe', name: 'Recipe', recordType: 'formulation', tags: [], createdAt: now, updatedAt: now,
  lines: [
    { id: 'a', kind: 'ingredient', ingredientId: 'Sugar', quantity: { value: '10', unit: 'g' } },
    { id: 'b', kind: 'ingredient', ingredientId: 'Flour', quantity: { value: '90', unit: 'g' } },
  ],
};
const product: ProductRecord = {
  id: 'product', name: 'Product', recordType: 'product', formulationId: 'recipe', foodState: 'asSold', consumerDirections: 'none',
  builderProductType: 'other',
  packDetails: {
    servingSize: '50', servingUnit: 'g', servingsPerPack: '2', netQuantity: '100', netUnit: 'g', nutritionFoodForm: 'solid',
    nutritionRecipeSignature: nutritionRecipeSignature('recipe', [recipe]),
  },
  tags: [], createdAt: now, updatedAt: now,
};

describe('draft label and live readiness', () => {
  it('limits Product completion to saved Product, recipe and nutrition inputs', () => {
    const records = [ingredient('Sugar'), ingredient('Flour')];
    const unconfirmed = { ...records[0]!, allergensConfirmed: false, additivesConfirmed: false };
    const draft = makeLabelDraft(product, [recipe], [unconfirmed, records[1]!]);
    expect(draft.issues.some((issue) => issue.area === 'ingredients')).toBe(true);
    expect(draft.pack.limitations.length).toBeGreaterThan(0);
    expect(productCompletionItems(product, draft, [recipe], [unconfirmed, records[1]!])).toEqual([]);
  });

  it('keeps missing, unknown, stale and unsupported nutrition or recipe inputs actionable', () => {
    const records = [ingredient('Sugar'), ingredient('Flour')];
    const cases: ProductRecord[] = [
      { ...product, consumerDirections: 'unknown' },
      { ...product, packDetails: { ...product.packDetails!, servingSize: '' } },
      { ...product, packDetails: { ...product.packDetails!, nutritionRecipeSignature: 'stale' } },
      { ...product, foodState: 'asProcessed' },
    ];
    for (const candidate of cases) {
      const items = productCompletionItems(candidate, makeLabelDraft(candidate, [recipe], records), [recipe], records);
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((item) => item.actions.length > 0)).toBe(true);
    }
    const partial: FormulationRecord = {
      ...recipe, incompleteRecipeLines: {
        unquantifiedLines: [{ id: 'unknown', kind: 'ingredient', ingredientId: 'Sugar' }],
        lineOrder: ['a', 'b', 'unknown'],
      },
    };
    const items = productCompletionItems(product, makeLabelDraft(product, [partial], records), [partial], records);
    expect(items.some((item) => item.message.includes('recipe'))).toBe(true);
    const missing = productCompletionItems(product, makeLabelDraft(product, [recipe], []), [recipe], []);
    expect(missing.some((item) => item.message.includes('unavailable'))).toBe(true);
  });

  it('does not mistake the drained-panel regulatory review for a missing input', () => {
    const records = [ingredient('Sugar'), ingredient('Flour')];
    const draining = {
      enabled: true, directions: 'Drain before eating.', servingGrams: '40',
      sourceType: 'analysis' as const, values: {
        energy: '100', protein: '1', fat: '1', saturatedFat: '1', carbohydrate: '1', sugars: '1', sodium: '1',
      },
    };
    const signature = preparationRecipeSignature('recipe', [recipe], records)!;
    const candidate: ProductRecord = {
      ...product, foodState: 'asDrained', consumerDirections: 'present',
      draining: { ...draining, confirmationSnapshot: drainingSnapshot(draining, signature) },
    };
    const draft = makeLabelDraft(candidate, [recipe], records);
    expect(draft.nutritionPanel.missing).toContain('Review servings per package for the drained serving');
    expect(productCompletionItems(candidate, draft, [recipe], records)).toEqual([]);
    const stale = { ...candidate, draining: { ...candidate.draining!, directions: 'Rinse and drain.' } };
    const issues = productCompletionItems(stale, makeLabelDraft(stale, [recipe], records), [recipe], records);
    expect(issues.flatMap((item) => item.details ?? []).join(' ')).toContain('Confirm that the values describe');
  });

  it('carries recorded pack details and ingredient and allergen paths into the review report', () => {
    const records = [ingredient('Sugar'), ingredient('Flour', ['milk'])];
    const item: ProductRecord = { ...product, consumerDirections: 'present', preparation: {
      enabled: true, kind: 'withFood', directions: 'Serve with milk.',
    } };
    const draft = makeLabelDraft(item, [recipe], records);
    expect(draft.pack.netContents).toBe('100 g');
    expect(draft.pack.previewDirections).toEqual([{ kind: 'Preparation', text: 'Serve with milk.' }]);
    expect(draft.declarationInputs.find((entry) => entry.name === 'Flour')).toMatchObject({
      sourcePath: ['recipe', 'b', 'Flour'], specification: { reference: 'Flour-spec', sourceDate: '2026-01-01' },
    });
    const notes = makeConsultantNotes(item, [recipe], records, draft);
    const text = notes.flatMap((section) => [section.heading, ...section.lines]).join('\n');
    expect(text).toContain('Recorded net contents: 100 g');
    expect(text).toContain('Serve with milk.');
    expect(text).toContain('Ingredient input: Flour; path Recipe > b > Flour; specification Flour-spec, 2026-01-01');
    expect(text).toContain('Candidate allergen milk');
    expect(text).toContain('Allergen evidence: ingredient');
    expect(text).toContain('saved ingredient names');
    expect(text).toContain('Standard 1.2.4-5; SRC-005');
    expect(text).toContain('Schedule 10 generic name (SRC-017)');
    expect(text).toContain('Supplier name and business address');
    expect(text).toContain('Allergen declaration status: generated from complete recorded evidence for review.');
  });

  it('includes user-entered pack copy in the preview and reports unresolved applicability', () => {
    const records = [ingredient('Sugar'), ingredient('Flour')];
    const packCopy: LabelPackCopy = {
      supplierName: 'Local Foods Ltd',
      supplierAddress: '1 Market Road\nMelbourne VIC',
      lotIdentification: 'Lot A17',
      dateMarking: 'Best before 12 MAY 2027',
      storageInstructions: 'Keep refrigerated.',
      warningAdvisoryStatements: 'Keep chilled.\nContains an advisory.',
      precautionaryAllergenStatement: 'May contain peanuts.',
      precautionaryAllergenBasis: 'Recorded cross-contact assessment on 2026-01-01.',
    };
    const draft = makeLabelDraft(product, [recipe], records, [], packCopy);
    const layout = makeLabelLayout(draft, initialLabelLayout, packCopy);
    const svg = layout.svg;
    expect(svg).toContain('data-block-kind="supplierDetails"');
    expect(svg).toContain('data-block-kind="lotIdentification"');
    expect(svg).toContain('data-block-kind="dateMarking"');
    expect(svg).toContain('data-block-kind="storageDirections"');
    expect(svg).toContain('data-block-kind="warnings"');
    expect(svg).toContain('data-block-id="precautionary-allergen-statement"');
    expect(svg).toContain('Supplier details');
    expect(svg).toContain('Lot identification');
    expect(svg).toContain('Date marking');
    expect(svg).toContain('Storage instructions');
    expect(svg).toContain('Warning and advisory statements');
    expect(svg).toContain('Lot A17');
    expect(svg).toContain('Keep chilled.');
    const notes = makeConsultantNotes(product, [recipe], records, draft);
    const text = notes.flatMap((section) => [section.heading, ...section.lines]).join('\n');
    expect(text).toContain('Supplier business name (user-entered):\nLocal Foods Ltd');
    expect(text).toContain('Storage instructions (user-entered):\nKeep refrigerated.');
    expect(text).toContain('an empty field does not establish that no statement applies');
    expect(text).toContain('not assessed or calculated');
    expect(text).toContain('Precautionary allergen statement (user-entered):\nMay contain peanuts.');
    expect(text).toContain('does not replace required allergen declarations');
  });

  it('renders selected %DI from unrounded per-serving values and traces the product display policy', () => {
    const records = [ingredient('Sugar'), ingredient('Flour')];
    const draft = makeLabelDraft(product, [recipe], records, [], undefined, true);
    const layout = makeLabelLayout(draft, initialLabelLayout);
    const notes = makeConsultantNotes(product, [recipe], records, draft);
    const report = notes.flatMap((section) => [section.heading, ...section.lines]).join('\n');

    expect(draft.nutritionPanel.dailyIntakeStatus).toBe('included');
    expect(draft.nutritionPanel.rows[0]?.dailyIntake).toBe('1%');
    expect(layout.svg).toContain('>1%</text>');
    expect(layout.svg.replace(/<[^>]*>/gu, ' ').replace(/\s+/gu, ' '))
      .toContain('Percentage daily intakes are based on an average adult diet of 8 700 kJ');
    expect(report).toContain('Nearest whole percent, half up (product display policy; not prescribed by the Code or FSANZ guidance)');
    expect(report).toContain('Standard 1.2.8-8(1)-(3); Schedule 12 S12-4');
    expect(report).toContain('SRC-NIP-DI-001');
  });

  it('renders selected claim wording once with a review warning', () => {
    const records = [ingredient('Sugar'), ingredient('Flour')];
    const result = makeLabelDraft(product, [recipe], records);
    const layout = makeLabelLayout(result, initialLabelLayout, undefined, [
      { text: 'Low sugar', reviewMessage: 'REVIEW: supporting facts need review.' },
      { text: 'Low sugar', reviewMessage: 'REVIEW: duplicate source wording.' },
    ]);

    expect(layout.svg.match(/Low sugar/gu)).toHaveLength(1);
    expect(layout.svg).toContain('data-block-kind="claims"');
    expect(layout.svg).toContain('Claim wording is shown exactly as entered and is not legal clearance.');
    expect(layout.svg).toContain('REVIEW: supporting facts need review.');
  });

  it('does not present conflicting, unclear or disabled directions as pack copy', () => {
    const directions = { enabled: true, kind: 'reconstituted' as const, directions: 'Mix with water.' };
    const conflicting = makeLabelDraft({ ...product, consumerDirections: 'none', preparation: directions }, [recipe], []);
    expect(conflicting.pack.recordedDirections[0]?.text).toBe('Mix with water.');
    expect(conflicting.pack.previewDirections).toEqual([]);
    expect(conflicting.pack.directionsIssue).toContain('conflict');
    const unclear = makeLabelDraft({ ...product, consumerDirections: 'present', otherConsumerDirections: true,
      otherConsumerDirectionsText: 'Do something else.' }, [recipe], []);
    expect(unclear.pack.previewDirections).toEqual([]);
    expect(unclear.pack.recordedDirections[0]?.text).toBe('Do something else.');
    const disabled = makeLabelDraft({ ...product, preparation: { ...directions, enabled: false } }, [recipe], []);
    expect(disabled.pack.recordedDirections).toEqual([]);
    expect(disabled.pack.previewDirections).toEqual([]);
    const missingQuantity = makeLabelDraft({ ...product, packDetails: { netQuantity: '100' } }, [recipe], []);
    expect(missingQuantity.pack.netContents).toBeUndefined();
  });

  it('keeps disabled actions conflicting with older food states unresolved', () => {
    for (const candidate of [
      { ...product, foodState: 'asReconstituted' as const, consumerDirections: 'present' as const,
        preparation: { enabled: false, kind: 'reconstituted' as const, directions: 'Mix with water.' } },
      { ...product, foodState: 'asDrained' as const, consumerDirections: 'present' as const,
        draining: { enabled: false, directions: 'Drain.', values: {} } },
    ]) {
      const draft = makeLabelDraft(candidate, [recipe], []);
      expect(draft.pack.directionsIssue).toContain('conflicts with disabled');
      expect(draft.pack.previewDirections).toEqual([]);
      expect(draft.nutritionPanel.basis).toBe('review');
      expect(draft.nutritionPanel.rows.every((row) => row.unitQuantity === 'Not available')).toBe(true);
    }
  });

  it('traces repeated compound allergens with unknown amounts and flags contradictory parent evidence', () => {
    const mix = { ...ingredient('Mix'), kind: 'compound' as const, compoundFormulationId: 'inside' };
    const inside: FormulationRecord = {
      ...recipe, id: 'inside', lines: [],
      incompleteRecipeLines: {
        unquantifiedLines: [{ id: 'milk-line', kind: 'ingredient', ingredientId: 'Flour' }],
        lineOrder: ['milk-line'],
      },
    };
    const outer: FormulationRecord = {
      ...recipe, lines: [
        { id: 'first', kind: 'ingredient', ingredientId: 'Mix', quantity: { value: '1', unit: 'g' } },
        { id: 'second', kind: 'ingredient', ingredientId: 'Mix', quantity: { value: '1', unit: 'g' } },
      ],
    };
    const result = makeLabelDraft(product, [outer, inside], [mix, ingredient('Flour', ['milk'])]);
    expect(result.allergens).toContain('milk');
    expect(result.allergenTrace.find((entry) => entry.id === 'milk')?.sourcePaths).toEqual([
      ['recipe', 'first', 'Mix', 'inside', 'milk-line', 'Flour'],
      ['recipe', 'second', 'Mix', 'inside', 'milk-line', 'Flour'],
    ]);
    expect(result.declarationInputs.filter((entry) => entry.name === 'Flour').map((entry) => entry.sourcePath)).toEqual([
      ['recipe', 'first', 'Mix', 'inside', 'milk-line', 'Flour'],
      ['recipe', 'second', 'Mix', 'inside', 'milk-line', 'Flour'],
    ]);
    expect(result.missing.join(' ')).toContain('milk is recorded absent, but an included ingredient records it present');
    expect(result.declaration).toBe('');
  });

  it('derives compound allergen coverage only from a confirmed complete composition', () => {
    const {
      allergenEvidence: ignoredEvidence,
      ...parentWithoutAllergenEvidence
    } = ingredient('Mix');
    expect(ignoredEvidence).toBeDefined();
    const mix: IngredientRecord = {
      ...parentWithoutAllergenEvidence,
      kind: 'compound',
      compoundFormulationId: 'inside',
      allergensConfirmed: false,
    };
    const inside: FormulationRecord = {
      ...recipe,
      id: 'inside',
      lines: [{ id: 'flour', kind: 'ingredient', ingredientId: 'Flour', quantity: { value: '100', unit: 'g' } }],
      supplierComposition: { coverage: 'complete', unquantifiedComponents: [] },
    };
    const outer: FormulationRecord = {
      ...recipe,
      lines: [{ id: 'mix', kind: 'ingredient', ingredientId: 'Mix', quantity: { value: '100', unit: 'g' } }],
    };
    const result = makeLabelDraft(product, [outer, inside], [mix, ingredient('Flour', ['milk'])]);

    expect(result.declaration).toBe('Mix [Flour (milk)]');
    expect(result.allergenDeclarationReady).toBe(true);
    expect(result.missing).not.toContain('Mix: confirm the allergen information');
  });

  it('links unresolved compound composition to the shared recipe without assuming completeness', () => {
    const { allergenEvidence: ignoredEvidence, ...parent } = ingredient('Mix');
    expect(ignoredEvidence).toBeDefined();
    const mix: IngredientRecord = {
      ...parent, kind: 'compound', compoundFormulationId: 'inside',
      compoundNutritionBasis: 'components', allergensConfirmed: false,
    };
    const inside: FormulationRecord = {
      ...recipe, id: 'inside',
      lines: [{ id: 'flour', kind: 'ingredient', ingredientId: 'Flour', quantity: { value: '100', unit: 'g' } }],
    };
    const outer: FormulationRecord = {
      ...recipe, lines: [{ id: 'mix', kind: 'ingredient', ingredientId: 'Mix', quantity: { value: '100', unit: 'g' } }],
    };
    for (const composition of [undefined, { coverage: 'partial' as const, unquantifiedComponents: [] }]) {
      const current = composition ? { ...inside, supplierComposition: composition } : inside;
      const result = makeLabelDraft(product, [outer, current], [mix, ingredient('Flour', ['milk'])]);
      expect(result.issues.find((issue) => issue.message.startsWith('Mix: complete its component recipe')
        || issue.message === 'Mix: confirm complete compound composition')?.actions)
        .toEqual([{ kind: 'ingredient', id: 'Mix' }, { kind: 'recipe', id: 'inside' }]);
      expect(result.nutrition.missing.join(' ')).toContain('complete component list');
      expect(result.missing).toContain('Mix: confirm the allergen information');
    }
    const complete = { ...inside, supplierComposition: { coverage: 'complete' as const, unquantifiedComponents: [] } };
    const result = makeLabelDraft(product, [outer, complete], [mix, ingredient('Flour', ['milk'])]);
    expect(result.missing).not.toContain('Mix: confirm complete compound composition');
    expect(result.nutrition.missing.join(' ')).not.toContain('complete component list');
    expect(result.missing).not.toContain('Mix: confirm the allergen information');
    expect(result.allergens).toContain('milk');
  });

  it('keeps recognised positive allergens when another recorded allergen is unrecognised', () => {
    const flour = ingredient('Flour', ['milk']);
    const source = flour.allergenEvidence![0]!;
    const result = makeLabelDraft(product, [recipe], [
      ingredient('Sugar'),
      { ...flour, allergenEvidence: [{ ...source, assessments: { ...source.assessments, unrecognised: 'present' } }] },
    ]);
    expect(result.allergens).toContain('milk');
    expect(result.missing.join(' ')).toContain('check unrecognised allergen');
  });

  it('does not require component nutrition when the compound whole profile is selected', () => {
    const mix = { ...ingredient('Mix'), kind: 'compound' as const, compoundFormulationId: 'inside', compoundNutritionBasis: 'whole' as const };
    const child = ingredient('Sugar');
    const { nutrientProfile: ignoredProfile, energyPer100g: ignoredEnergy, ...withoutNutrition } = child;
    expect(ignoredProfile).toBeDefined();
    expect(ignoredEnergy).toBeDefined();
    const inside: FormulationRecord = {
      ...recipe, id: 'inside',
      lines: [{ id: 'child', kind: 'ingredient', ingredientId: 'Sugar', quantity: { value: '1', unit: 'g' } }],
      supplierComposition: { coverage: 'complete', unquantifiedComponents: [] },
    };
    const outer: FormulationRecord = {
      ...recipe, lines: [{ id: 'mix', kind: 'ingredient', ingredientId: 'Mix', quantity: { value: '1', unit: 'g' } }],
    };
    const records = [mix, withoutNutrition];
    const confirmed = { ...product, packDetails: { ...product.packDetails!, nutritionRecipeSignature: nutritionRecipeSignature('recipe', [outer, inside], records) } };
    const result = makeLabelDraft(confirmed, [outer, inside], records);
    expect(result.nutrition.rows[1]?.unitQuantity).toBe('1.0 g');
    expect(result.missing.join(' ')).not.toContain('Sugar: nutrition information');
  });

  it('retains known allergens without generating an ordered declaration for unknown recipe amounts', () => {
    const inner: FormulationRecord = {
      ...recipe, id: 'inner', lines: [],
      incompleteRecipeLines: {
        unquantifiedLines: [{ id: 'milk', kind: 'ingredient', ingredientId: 'Sugar' }],
        lineOrder: ['milk'],
      },
    };
    const outer: FormulationRecord = {
      ...recipe, lines: [{ id: 'nested', kind: 'formulation', formulationId: 'inner', quantity: { value: '1', unit: 'g' } }],
    };
    const result = makeLabelDraft(product, [outer, inner], [ingredient('Sugar', ['milk'])]);
    expect(result.allergens).toContain('milk');
    expect(result.declaration).toBe('');
    expect(result.additivesComplete).toBe(false);
    expect(result.missing.join(' ')).toContain('unknown amounts');
    expect(result.nutrition.rows[1]?.unitQuantity).toBe('Not available');
  });
  it('keeps known allergens visible and requires review for a special additive use', () => {
    const direct: IngredientRecord = {
      ...ingredient('Sugar', ['milk']), directAdditiveSourceId: 'direct',
      additiveSources: [{ id: 'direct', additiveName: 'Sugar', sourceStatus: 'unknown' }],
    };
    const special: FormulationRecord = {
      ...recipe,
      lines: [
        { id: 'a', kind: 'ingredient', ingredientId: 'Sugar', quantity: { value: '10', unit: 'g' }, additiveUse: 'processingAid' },
        recipe.lines[1]!,
      ],
    };
    const result = makeLabelDraft(product, [special], [direct, ingredient('Flour')]);
    expect(result.allergens).toContain('milk');
    expect(result.missing.join(' ')).toContain('review its use');
    expect(result.additivesComplete).toBe(false);
    expect(result.declaration).toContain('Sugar');
    const stale = { ...direct, additiveSources: [] };
    const staleRecipe = { ...special, lines: [{ ...special.lines[0]!, additiveUse: 'added' as const }, special.lines[1]!] };
    const staleResult = makeLabelDraft(product, [staleRecipe], [stale, ingredient('Flour')]);
    expect(staleResult.missing.join(' ')).toContain('saved additive use needs review');
    expect(staleResult.additivesComplete).toBe(false);
    expect(staleResult.allergens).toContain('milk');
  });
  it('flags declaration ordering when processing changes the batch weight (SRC-005, TR-003)', () => {
    const processed: FormulationRecord = {
      ...recipe, processMassProfile: {
        changes: [{ id: 'loss', kind: 'loss', mass: { value: '10', unit: 'g' } }],
      },
    };
    const result = makeLabelDraft(product, [processed], [ingredient('Sugar'), ingredient('Flour')]);
    expect(result.missing.join(' ')).toContain('declaration order');
  });
  it('flags special uses within compound ingredients without hiding known allergens', () => {
    const direct: IngredientRecord = {
      ...ingredient('Sugar', ['milk']), directAdditiveSourceId: 'direct',
      additiveSources: [{ id: 'direct', additiveName: 'Sugar', sourceStatus: 'unknown' }],
    };
    const compound = { ...ingredient('Mix'), kind: 'compound' as const, compoundFormulationId: 'inner' };
    const inner: FormulationRecord = {
      ...recipe, id: 'inner', lines: [
        { id: 'a', kind: 'ingredient', ingredientId: 'Sugar', quantity: { value: '1', unit: 'g' }, additiveUse: 'unknown' },
      ], supplierComposition: { coverage: 'complete', unquantifiedComponents: [] },
    };
    const outer: FormulationRecord = {
      ...recipe, lines: [{ id: 'mix', kind: 'ingredient', ingredientId: 'Mix', quantity: { value: '100', unit: 'g' } }],
    };
    const result = makeLabelDraft(product, [outer, inner], [compound, direct]);
    expect(result.missing.join(' ')).toContain('review its use');
    expect(result.allergens).toContain('milk');
    expect(result.declaration).toContain('Sugar');
    expect(result.additivesComplete).toBe(false);
  });
  it('orders ingredients by ingoing mass and includes recorded allergens (SRC-005, TR-003)', () => {
    const result = makeLabelDraft(product, [recipe], [ingredient('Sugar'), ingredient('Flour', ['milk'])]);
    expect(result.declaration).toBe('Flour (milk), Sugar');
    expect(result.allergens).toEqual(['milk']);
    expect(result.allergenDeclarationReady).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.warnings.join(' ')).toContain('draft');
  });

  it('uses the required allergen names in ingredients and emits a ready, bold Contains summary', () => {
    const records = [
      ingredient('Sugar'),
      ingredient('Milk and wheat flour', ['milk', 'wheat'], 'present', 'Flour'),
    ];
    const result = makeLabelDraft(product, [recipe], records);
    const layout = makeLabelLayout(result, initialLabelLayout);

    expect(result.declaration).toContain('Milk and wheat flour');
    expect(result.allergens).toEqual(expect.arrayContaining(['milk', 'wheat', 'gluten']));
    expect(result.allergenDeclarationReady).toBe(true);
    expect(layout.svg).toContain('data-block-id="allergens"');
    expect(layout.svg).toContain('<tspan font-weight="700">Milk</tspan>');
    expect(layout.svg).toContain('<tspan font-weight="700">wheat</tspan>');
    expect(layout.svg).toContain('Contains');
    const blockIds = [...layout.svg.matchAll(/data-block-id="([^"]+)"/gu)].map((match) => match[1]);
    const ingredientsIndex = blockIds.indexOf('ingredients');
    expect(blockIds[ingredientsIndex + 1]).toBe('allergens');
    const ingredientBlock = layout.svg.match(/<g data-block-id="ingredients"[\s\S]*?<\/g>/u)?.[0];
    const allergenBlock = layout.svg.match(/<g data-block-id="allergens"[\s\S]*?<\/g>/u)?.[0];
    expect(allergenBlock?.match(/font-size="([^"]+)"/u)?.[1])
      .toBe(ingredientBlock?.match(/font-size="([^"]+)"/u)?.[1]);
    expect(allergenBlock).toContain('font-weight="700"');
  });

  it('preserves a multi-word allergen name as a single emphasized phrase', () => {
    const records = [
      ingredient('Sugar'),
      ingredient('Nut flour', ['brazil-nut'], 'present', 'Flour'),
    ];
    const draft = makeLabelDraft(product, [recipe], records);
    const layout = makeLabelLayout(draft, initialLabelLayout);

    expect(draft.declaration).toContain('Nut flour (Brazil nut)');
    expect(layout.svg).toContain('<tspan font-weight="700">Brazil nut</tspan>');
  });

  it('adds gluten to the summary only when recorded for wheat and keeps cereal conditions explicit', () => {
    const wheatWithoutGluten = makeLabelDraft(product, [recipe], [
      ingredient('Sugar'),
      ingredient('Wheat starch', ['wheat'], 'absent', 'Flour'),
    ]);
    const barley = makeLabelDraft(product, [recipe], [
      ingredient('Sugar'),
      ingredient('Malt extract', ['barley'], 'present', 'Flour'),
    ]);

    expect(wheatWithoutGluten.allergens).toEqual(['wheat']);
    expect(wheatWithoutGluten.allergenDeclarationReady).toBe(true);
    expect(barley.declaration).toContain('Malt extract (barley)');
    expect(barley.allergens).toContain('gluten');
  });

  it('keeps gluten status and possible exemptions unresolved rather than assuming absence', () => {
    const wheat = ingredient('Wheat flour', ['wheat'], 'present', 'Flour');
    const { wheatGlutenStatus: ignoredStatus, ...wheatWithoutStatus } = wheat;
    expect(ignoredStatus).toBe('present');
    const missingStatus = makeLabelDraft(product, [recipe], [ingredient('Sugar'), wheatWithoutStatus]);
    expect(missingStatus.allergens).toEqual(['wheat']);
    expect(missingStatus.allergenDeclarationReady).toBe(false);
    expect(missingStatus.missing.join(' ')).toContain('confirm whether the wheat contains gluten');

    const evidence = wheat.allergenEvidence![0]!;
    const exemptionReview: IngredientRecord = {
      ...wheat,
      allergenEvidence: [{
        ...evidence,
        assessments: { ...evidence.assessments, wheat: 'exemption_review' },
      }],
    };
    const unresolved = makeLabelDraft(product, [recipe], [ingredient('Sugar'), exemptionReview]);
    expect(unresolved.allergenDeclarationReady).toBe(false);
    expect(unresolved.missing.join(' ')).toContain('possible exemption for wheat');
  });

  it('withholds the Contains summary when any ingredient evidence is incomplete', () => {
    const unconfirmedSugar = { ...ingredient('Sugar'), allergensConfirmed: false };
    const result = makeLabelDraft(product, [recipe], [
      unconfirmedSugar,
      ingredient('Flour', ['milk']),
    ]);
    const layout = makeLabelLayout(result, initialLabelLayout);

    expect(result.allergens).toContain('milk');
    expect(result.allergenDeclarationReady).toBe(false);
    expect(layout.svg).not.toContain('data-block-id="allergens"');
    expect(result.missing.join(' ')).toContain('confirm the allergen information');
  });

  it('does not generate a Contains summary when confirmed records report no listed allergens', () => {
    const result = makeLabelDraft(product, [recipe], [ingredient('Sugar'), ingredient('Flour')]);
    const layout = makeLabelLayout(result, initialLabelLayout);

    expect(result.allergens).toEqual([]);
    expect(result.allergenDeclarationReady).toBe(true);
    expect(layout.svg).not.toContain('data-block-id="allergens"');
  });

  it('withholds the declaration and links a missing ingredient name to its editor (TR-003, TRACE-008)', () => {
    const unnamed = { ...ingredient('Sugar'), name: '   ' };
    const result = makeLabelDraft(product, [recipe], [unnamed, ingredient('Flour')]);

    expect(result.declaration).toBe('');
    expect(result.missing).toContain('Add an ingredient name before drafting the declaration');
    expect(result.issues.find((issue) => issue.message === 'Add an ingredient name before drafting the declaration'))
      .toMatchObject({ area: 'ingredients', actions: [{ kind: 'ingredient', id: 'Sugar' }] });
    expect(result.declarationInputs.find((item) => item.ingredientId === 'Sugar')?.name).toBe('Unnamed ingredient Sugar');
    expect(makeLabelLayout(result, initialLabelLayout).svg).not.toContain('data-block-id="ingredients"');
  });

  it('does not render a compound without a component recipe (SRC-005, TR-003)', () => {
    const mix = { ...ingredient('Mix'), kind: 'compound' as const };
    const root: FormulationRecord = {
      ...recipe, lines: [{ id: 'mix', kind: 'ingredient', ingredientId: 'Mix', quantity: { value: '100', unit: 'g' } }],
    };
    const result = makeLabelDraft(product, [root], [mix]);

    expect(result.declaration).toBe('');
    expect(result.missing).toContain('Mix: enter its component recipe');
    expect(result.issues.find((issue) => issue.message === 'Mix: enter its component recipe'))
      .toMatchObject({ area: 'ingredients', actions: [{ kind: 'ingredient', id: 'Mix' }] });
  });

  it('keeps unsourced confirmed allergens visible without asking for a reference', () => {
    const draft = emptyIngredientDraft();
    Object.assign(draft, { name: 'Flour', kind: 'atomic', allergensConfirmed: true, knownAllergens: ['milk'] });
    const unsourced = buildIngredientRecord(draft, undefined, (prefix) => prefix === 'ingredient' ? 'Flour' : `Flour-${prefix}`, now);
    const result = makeLabelDraft(product, [recipe], [ingredient('Sugar'), unsourced]);
    expect(result.allergens).toContain('milk');
    expect(result.missing.join(' ')).not.toContain('allergen source not recorded');
    expect(result.warnings.join(' ')).toContain('Allergen vocabulary and product applicability remain draft');
  });

  it('accepts confirmed additive coverage without asking for source details', () => {
    const draft = emptyIngredientDraft();
    Object.assign(draft, { name: 'Flour', kind: 'atomic', allergensConfirmed: true, additivesConfirmed: true });
    const unsourced = buildIngredientRecord(draft, undefined, (prefix) => prefix === 'ingredient' ? 'Flour' : `Flour-${prefix}`, now);
    const result = makeLabelDraft(product, [recipe], [ingredient('Sugar'), unsourced]);
    expect(result.additivesComplete).toBe(true);
    expect(result.missing.join(' ')).not.toContain('additive information source');
    const { additiveCoverage: ignoredCoverage, ...unconfirmed } = unsourced;
    expect(ignoredCoverage).toBeDefined();
    expect(makeLabelDraft(product, [recipe], [ingredient('Sugar'), unconfirmed]).missing.join(' '))
      .toContain('confirm the additive information');
  });

  it('does not drop a known allergen from an additive without source details', () => {
    const sugar: IngredientRecord = {
      ...ingredient('Sugar'),
      additiveSources: [{ id: 'additive', additiveName: 'Example', sourceStatus: 'added',
        allergenAssessments: { milk: 'present' } }],
    };
    const result = makeLabelDraft(product, [recipe], [sugar, ingredient('Flour')]);
    expect(result.allergens).toContain('milk');
    expect(result.missing.join(' ')).not.toContain('allergen source not recorded for Example');
  });

  it('blocks missing or unconfirmed data rather than treating it as absent', () => {
    const incomplete = { ...ingredient('Sugar'), allergensConfirmed: false, additivesConfirmed: false };
    const result = makeLabelDraft({ ...product, packDetails: {} }, [recipe], [incomplete, ingredient('Flour')]);
    expect(result.missing.join(' ')).toMatch(/Serving size/);
    expect(result.missing.join(' ')).toMatch(/confirm the allergen/);
    expect(result.missing.join(' ')).toMatch(/confirm the additive/);
    expect(makeLabelDraft(product, [recipe], [incomplete]).missing.join(' ')).toMatch(/unavailable/);
    const { builderProductType: ignoredType, ...noType } = product;
    expect(ignoredType).toBe('other');
    expect(makeLabelDraft(noType, [recipe], [ingredient('Sugar'), ingredient('Flour')]).missing.join(' '))
      .toMatch(/Product type/);
    const sugar = ingredient('Sugar');
    const invalidNutrition: IngredientRecord = {
      ...sugar,
      nutrientProfile: { ...sugar.nutrientProfile!, values: {
        ...sugar.nutrientProfile!.values,
        protein: { ...sugar.nutrientProfile!.values.protein!, value: '-1' },
      } },
    };
    expect(makeLabelDraft(product, [recipe], [invalidNutrition, ingredient('Flour')]).missing.join(' '))
      .toMatch(/Sugar: nutrition information/);
    const changedSpec: IngredientRecord = {
      ...sugar, specification: { reference: 'New spec', sourceDate: '2026-02-01' },
    };
    const changed = makeLabelDraft(product, [recipe], [changedSpec, ingredient('Flour')]);
    expect(changed.missing.join(' ')).toMatch(/confirm the allergen information/);
    expect(changed.missing.join(' ')).toMatch(/confirm the additive information/);
  });

  it('associates each missing item with its edit target without changing the existing missing list', () => {
    const incomplete = { ...ingredient('Sugar'), allergensConfirmed: false, additivesConfirmed: false };
    const { builderProductType: ignoredType, ...withoutType } = product;
    expect(ignoredType).toBe('other');
    const result = makeLabelDraft({ ...withoutType, packDetails: {} }, [recipe], [incomplete, ingredient('Flour')]);
    expect(result.issues.map((issue) => issue.message)).toEqual(result.missing);
    expect(result.issues.find((issue) => issue.message.includes('confirm the allergen information')))
      .toMatchObject({ area: 'ingredients', actions: [{ kind: 'ingredient', id: 'Sugar' }] });
    expect(result.issues.find((issue) => issue.message.startsWith('Serving size')))
      .toMatchObject({ area: 'pack', actions: [{ kind: 'section', section: 'pack' }] });
    expect(result.issues.find((issue) => issue.message === 'Product type and its questions'))
      .toMatchObject({ area: 'product', actions: [{ kind: 'section', section: 'type' }] });
  });

  it('keeps distinct ingredient edit targets when names and missing messages coincide', () => {
    const first = { ...ingredient('Sugar'), id: 'first', allergensConfirmed: false };
    const second = { ...ingredient('Sugar'), id: 'second', allergensConfirmed: false };
    const duplicateRecipe = { ...recipe, lines: [
      { id: 'a', kind: 'ingredient' as const, ingredientId: 'first', quantity: { value: '1', unit: 'g' as const } },
      { id: 'b', kind: 'ingredient' as const, ingredientId: 'second', quantity: { value: '1', unit: 'g' as const } },
    ] };
    const result = makeLabelDraft(product, [duplicateRecipe], [first, second]);
    expect(result.issues.find((issue) => issue.message === 'Sugar: confirm the allergen information')?.actions)
      .toEqual([{ kind: 'ingredient', id: 'first' }, { kind: 'ingredient', id: 'second' }]);
  });

  it('uses confirmed allergen evidence from a product label without claiming additive coverage', () => {
    const draft = emptyIngredientDraft();
    draft.name = 'Flour';
    draft.kind = 'atomic';
    draft.allergenSourceType = 'productLabel';
    draft.allergenSourceReference = 'Pack label';
    draft.allergenSourceDate = '2026-01-01';
    draft.knownAllergens = ['milk'];
    draft.allergensConfirmed = true;
    const flour = buildIngredientRecord(draft, undefined, (prefix) => prefix === 'ingredient' ? 'Flour' : 'flour-evidence', now);
    const result = makeLabelDraft(product, [recipe], [ingredient('Sugar'), flour]);
    expect(result.allergens).toContain('milk');
    expect(result.missing).not.toContain('Flour: confirm the allergen information');
    expect(result.missing).toContain('Flour: confirm the additive information');
    expect(result.missing).toContain('Flour: nutrition information');
  });

  it('keeps final-food allergen conditions as a specific review warning', () => {
    const result = makeLabelDraft(product, [recipe], [ingredient('Sugar', ['sulphites']), ingredient('Flour')]);
    expect(result.allergens).not.toContain('sulphites');
    expect(result.pendingAllergens).toEqual(['sulphites']);
    expect(result.warnings.join(' ')).toMatch(/sulphites.*final-food conditions/);
  });

  it('shows additive wording only as a review candidate (SRC-005, ADD-009)', () => {
    const sugar = ingredient('Sugar');
    const withAdditive: IngredientRecord = {
      ...sugar,
      additiveSources: [{
        id: 'preservative', additiveName: 'Example', sourceStatus: 'added',
        declarationSelection: {
          route: 'schedule7Class', schedule7ClassName: 'Preservative', substanceChoice: 'schedule8Name',
        },
      }],
    };
    const result = makeLabelDraft(product, [recipe], [withAdditive, ingredient('Flour')]);
    expect(result.declaration).toContain('[additives to check: Preservative (Example)]');
    expect(result.missing).toContain('Product additive and name information');
    expect(result.issues.find((issue) => issue.message === 'Product additive and name information')?.actions)
      .toContainEqual({ kind: 'section', section: 'technical' });
    expect(result.warnings.join(' ')).toContain('check whether and how');
    const categorized = { ...product, builderProductType: 'infantFood' as const,
      additiveNameInputs: { confirmedCohorts: [], additiveCategoryId: 'example-category' } };
    expect(makeLabelDraft(categorized, [recipe], [withAdditive, ingredient('Flour')]).missing)
      .not.toContain('Product additive and name information');
    expect(makeLabelDraft({ ...categorized, additiveNameInputs: { confirmedCohorts: [] } }, [recipe], [withAdditive, ingredient('Flour')]).missing)
      .toContain('Product additive and name information');
    const unknownSource = { ...withAdditive, additiveSources: [{
      ...withAdditive.additiveSources![0]!, sourceStatus: 'unknown' as const,
    }] };
    expect(makeLabelDraft(product, [recipe], [unknownSource, ingredient('Flour')]).missing.join(' '))
      .toContain('confirm the source status');
  });

  it('shows a direct additive once at its ingredient position and does not assume permission', () => {
    const sugar = ingredient('Sugar');
    const direct: IngredientRecord = {
      ...sugar,
      directAdditiveSourceId: 'direct',
      additiveSources: [{
        id: 'direct', additiveName: 'Sugar', codeNumber: '999', sourceStatus: 'added',
        declarationSelection: { route: 'schedule7Class', schedule7ClassName: 'Example class', substanceChoice: 'schedule8Name' },
      }],
    };
    const result = makeLabelDraft(product, [recipe], [direct, ingredient('Flour')]);
    expect(result.declaration).toBe('Flour, Example class (Sugar)');
    expect(result.warnings.join(' ')).toContain('check whether and how');
    expect(result.missing).toContain('Product additive and name information');
  });

  it('uses the same additive ingredient inside a linked compound recipe without a duplicate source', () => {
    const sugar = ingredient('Sugar');
    const direct: IngredientRecord = {
      ...sugar, directAdditiveSourceId: 'direct',
      additiveSources: [{
        id: 'direct', additiveName: 'Sugar', codeNumber: '999', sourceStatus: 'added',
        declarationSelection: { route: 'schedule7Class', schedule7ClassName: 'Example class', substanceChoice: 'schedule8Name' },
      }],
    };
    const compound = { ...ingredient('Flour'), kind: 'compound' as const, compoundFormulationId: 'compound-recipe' };
    const inside: FormulationRecord = {
      id: 'compound-recipe', name: 'Compound recipe', recordType: 'formulation', tags: [], createdAt: now, updatedAt: now,
      lines: [{ id: 'direct-line', kind: 'ingredient', ingredientId: 'Sugar', quantity: { value: '100', unit: 'g' } }],
    };
    const root = { ...recipe, lines: [{ id: 'compound-line', kind: 'ingredient' as const, ingredientId: 'Flour', quantity: { value: '100', unit: 'g' as const } }] };
    const result = makeLabelDraft(product, [root, inside], [direct, compound]);
    expect(result.declaration).toContain('Example class (Sugar)');
    expect(result.declaration.match(/Example class \(Sugar\)/g)).toHaveLength(1);
    expect(result.missing).toContain('Flour: confirm complete compound composition');
    const override = [{ ingredientId: 'Sugar', additiveSourceId: 'direct', selection: {
      route: 'schedule7Class' as const, schedule7ClassName: 'Preservative', substanceChoice: 'schedule8CodeNumber' as const,
    } }];
    const chosen = makeLabelDraft(product, [root, inside], [direct, compound], override);
    expect(chosen.declaration).toContain('Preservative (999)');
    const report = makeConsultantNotes(product, [root, inside], [direct, compound], chosen, {
      name: 'Selected label', saved: false, unsaved: true, dependenciesChanged: false,
      savedLabelChanged: false, unsavedProductChanges: false, additiveWording: override,
      preview: { error: 'No layout' },
    }).flatMap((section) => section.lines).join('\n');
    expect(report).toContain('candidate wording: Preservative (999)');
    expect(report).not.toContain('candidate wording: Example class (Sugar)');
    expect(result.declaration).toContain('Example class (Sugar)');
    expect(direct.additiveSources?.[0]?.declarationSelection?.schedule7ClassName).toBe('Example class');
    const undecided = makeLabelDraft(product, [root, inside], [direct, compound], [{
      ingredientId: 'Sugar', additiveSourceId: 'direct', selection: { route: 'unknown' },
    }]);
    expect(undecided.missing.join(' ')).toContain('choose declaration wording');
    expect(undecided.issues.find((issue) => issue.message.includes('choose declaration wording')))
      .toMatchObject({ area: 'labels', actions: [{ kind: 'labels' }] });
    expect(undecided.declaration).not.toContain('Example class (Sugar)');
  });

  it('does not silently treat an entered, unclassified Label claim as complete', () => {
    const claims = [{ id: 'claim', text: 'Low sugars' }];
    const result = makeLabelDraft(product, [recipe], [ingredient('Sugar'), ingredient('Flour')], [], undefined, false, claims);
    expect(result.missing).toContain('Classify and confirm the claims entered for this Label');
    expect(result.issues.find((issue) => issue.message === 'Classify and confirm the claims entered for this Label'))
      .toMatchObject({ area: 'claims', actions: [{ kind: 'labels' }] });
    expect(result.warnings.join(' ')).toContain('not rendered in the label preview');
  });

  it('preserves compound structure and rejects missing or circular recipes', () => {
    const compound = { ...ingredient('Flour'), kind: 'compound' as const, compoundFormulationId: 'inside' };
    const inside: FormulationRecord = {
      ...recipe, id: 'inside', lines: [{ id: 'c', kind: 'ingredient', ingredientId: 'Sugar', quantity: { value: '1', unit: 'g' } }],
      supplierComposition: {
        coverage: 'complete', specification: { reference: 'SPEC', sourceDate: '2026-01-01' }, unquantifiedComponents: [],
      },
    };
    expect(makeLabelDraft(product, [recipe, inside], [compound, ingredient('Sugar')]).declaration)
      .toBe('Flour [Sugar], Sugar');
    const legacy = { ...recipe, id: inside.id, lines: inside.lines };
    const legacyResult = makeLabelDraft(product, [recipe, legacy], [compound, ingredient('Sugar')]);
    expect(legacyResult.missing.join(' ')).toContain('confirm complete compound composition');
    const partial: FormulationRecord = {
      ...inside,
      supplierComposition: { ...inside.supplierComposition!, coverage: 'partial' },
    };
    expect(makeLabelDraft(product, [recipe, partial], [compound, ingredient('Sugar')]).missing.join(' '))
      .toContain('partial; its proportions cannot be calculated');
    const circular = { ...compound, compoundFormulationId: 'recipe' };
    expect(makeLabelDraft(product, [recipe], [circular, ingredient('Sugar')]).missing.join(' ')).toMatch(/circular/);
    expect(makeLabelDraft(product, [], []).missing.join(' ')).toMatch(/Recipe needs attention/);
  });

  it('preserves nested compound structure for non-infant products (SRC-005, FORM-005)', () => {
    const mix = { ...ingredient('Mix'), kind: 'compound' as const, compoundFormulationId: 'inside' };
    const sauce = { ...ingredient('Sauce'), kind: 'compound' as const, compoundFormulationId: 'sauce' };
    const inside: FormulationRecord = {
      ...recipe, id: 'inside',
      lines: [{ id: 'sauce', kind: 'ingredient', ingredientId: 'Sauce', quantity: { value: '100', unit: 'g' } }],
      supplierComposition: { coverage: 'complete', unquantifiedComponents: [] },
    };
    const sauceRecipe: FormulationRecord = {
      ...recipe, id: 'sauce',
      lines: [{ id: 'sugar', kind: 'ingredient', ingredientId: 'Sugar', quantity: { value: '100', unit: 'g' } }],
      supplierComposition: { coverage: 'complete', unquantifiedComponents: [] },
    };
    const root: FormulationRecord = {
      ...recipe,
      lines: [
        { id: 'mix', kind: 'ingredient', ingredientId: 'Mix', quantity: { value: '90', unit: 'g' } },
        { id: 'flour', kind: 'ingredient', ingredientId: 'Flour', quantity: { value: '10', unit: 'g' } },
      ],
    };

    expect(makeLabelDraft(product, [root, inside, sauceRecipe], [mix, sauce, ingredient('Sugar'), ingredient('Flour')]).declaration)
      .toBe('Mix [Sauce (Sugar)], Flour');
  });

  it('lists scaled individual components for infant-food candidates (SRC-005, TR-003)', () => {
    const mix = { ...ingredient('Mix'), kind: 'compound' as const, compoundFormulationId: 'inside' };
    const sauce = { ...ingredient('Sauce'), kind: 'compound' as const, compoundFormulationId: 'sauce' };
    const inside: FormulationRecord = {
      ...recipe, id: 'inside',
      lines: [
        { id: 'sauce', kind: 'ingredient', ingredientId: 'Sauce', quantity: { value: '40', unit: 'g' } },
        { id: 'flour', kind: 'ingredient', ingredientId: 'Flour', quantity: { value: '60', unit: 'g' } },
      ],
      supplierComposition: { coverage: 'complete', unquantifiedComponents: [] },
    };
    const sauceRecipe: FormulationRecord = {
      ...recipe, id: 'sauce',
      lines: [
        { id: 'sugar', kind: 'ingredient', ingredientId: 'Sugar', quantity: { value: '20', unit: 'g' } },
        { id: 'salt', kind: 'ingredient', ingredientId: 'Salt', quantity: { value: '80', unit: 'g' } },
      ],
      supplierComposition: { coverage: 'complete', unquantifiedComponents: [] },
    };
    const root: FormulationRecord = {
      ...recipe,
      lines: [
        { id: 'mix', kind: 'ingredient', ingredientId: 'Mix', quantity: { value: '50', unit: 'g' } },
        { id: 'sugar', kind: 'ingredient', ingredientId: 'Sugar', quantity: { value: '50', unit: 'g' } },
      ],
    };
    const infantProduct = { ...product, builderProductType: 'infantFood' as const };
    const result = makeLabelDraft(infantProduct, [root, inside, sauceRecipe], [
      mix, sauce, ingredient('Flour'), ingredient('Salt'), ingredient('Sugar'),
    ]);

    expect(result.declaration).toBe('Sugar, Flour, Salt');
    expect(result.declaration).not.toContain('Mix');
    expect(result.declaration).not.toContain('Sauce');
    expect(makeLabelLayout(result, initialLabelLayout).svg).toContain('Sugar, Flour, Salt');
    const report = makeConsultantNotes(infantProduct, [root, inside, sauceRecipe], [
      mix, sauce, ingredient('Flour'), ingredient('Salt'), ingredient('Sugar'),
    ], result).flatMap((section) => section.lines).join('\n');
    expect(report).toContain('The selected infant-food route guides this draft but does not confirm legal category');
  });

  it('withholds infant-food declaration when compound composition is not confirmed (SRC-005, TR-003)', () => {
    const mix = { ...ingredient('Mix'), kind: 'compound' as const, compoundFormulationId: 'inside' };
    const inside: FormulationRecord = {
      ...recipe, id: 'inside',
      lines: [{ id: 'sugar', kind: 'ingredient', ingredientId: 'Sugar', quantity: { value: '100', unit: 'g' } }],
    };
    const root: FormulationRecord = {
      ...recipe, lines: [{ id: 'mix', kind: 'ingredient', ingredientId: 'Mix', quantity: { value: '100', unit: 'g' } }],
    };
    const infantProduct = { ...product, builderProductType: 'infantFood' as const };
    const result = makeLabelDraft(infantProduct, [root, inside], [mix, ingredient('Sugar')]);

    expect(result.declaration).toBe('');
    expect(result.missing).toContain('Mix: confirm all components and amounts so they can be listed individually');
    expect(result.issues.find((issue) => issue.message.includes('confirm all components')))
      .toMatchObject({ area: 'ingredients', actions: [
        { kind: 'ingredient', id: 'Mix' }, { kind: 'recipe', id: 'inside' },
      ] });
  });
});
