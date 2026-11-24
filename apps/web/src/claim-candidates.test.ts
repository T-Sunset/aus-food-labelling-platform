import { describe, expect, it } from 'vitest';
import type { FormulationRecord, IngredientRecord, ProductRecord } from '@aus-food/storage';
import { findClaimCandidates } from './claim-candidates';
import { makeLabelDraft } from './label-draft';
import { labelPackCopyForm } from './label-settings';

const now = '2026-01-01T00:00:00.000Z';
const ingredient: IngredientRecord = {
  id: 'flour', name: 'Gluten-free flour', recordType: 'ingredient', kind: 'atomic',
  tags: [], createdAt: now, updatedAt: now,
  additiveSources: [{
    id: 'additive', additiveName: 'Low sugar flavour', sourceStatus: 'added',
    declarationSelection: { route: 'noSchedule7Class' },
  }],
};
const recipe: FormulationRecord = {
  id: 'recipe', name: 'Cake recipe', recordType: 'formulation', tags: [], createdAt: now, updatedAt: now,
  lines: [{ id: 'line', kind: 'ingredient', ingredientId: 'flour', quantity: { value: '100', unit: 'g' } }],
};
const product: ProductRecord = {
  id: 'product', name: 'LOW-sugar cake', recordType: 'product', formulationId: 'recipe',
  tags: [], createdAt: now, updatedAt: now, consumerDirections: 'present', foodState: 'asSold',
  preparation: { enabled: true, kind: 'withFood', directions: 'Serve with low fat milk.', addedIngredientId: 'milk' },
};
const milk: IngredientRecord = {
  id: 'milk', name: 'Low fat milk', recordType: 'ingredient', kind: 'atomic',
  tags: [], createdAt: now, updatedAt: now,
};

function scan(
  options: {
    product?: ProductRecord;
    recipe?: FormulationRecord;
    ingredients?: readonly IngredientRecord[];
    pack?: ReturnType<typeof labelPackCopyForm>;
    previewAvailable?: boolean;
  } = {},
) {
  const selectedProduct = options.product ?? product;
  const selectedRecipe = options.recipe ?? recipe;
  const ingredients = options.ingredients ?? [ingredient, milk];
  const draft = makeLabelDraft(selectedProduct, [selectedRecipe], ingredients);
  return findClaimCandidates(selectedProduct, draft, [selectedRecipe], ingredients, [], options.pack ?? labelPackCopyForm(),
    [{ id: 'claim', text: 'Good source of dietary fibre' }], options.previewAvailable ?? true);
}

describe('local possible claim detection', () => {
  it('finds exact phrases and their distinct origins without matching ordinary ingredient words', () => {
    const pack = labelPackCopyForm();
    pack.supplierName = 'LOW sugar foods';
    pack.supplierAddress = '1 gluten-free street';
    pack.lotIdentification = 'No added sugar';
    pack.dateMarking = 'low fat';
    pack.storageInstructions = 'Keep low-sugar cake cool.';
    pack.warningAdvisoryStatements = 'Low sugar; sugar-free';
    pack.precautionaryAllergenStatement = 'Gluten free';
    pack.precautionaryAllergenBasis = 'Low sodium';
    const candidates = scan({ pack });
    expect(candidates.map(({ location }) => location)).toEqual([
      'Product name', 'Preparation directions', 'Ingredient: Cake recipe > Gluten-free flour',
      'Additive wording: Cake recipe > Gluten-free flour > Low sugar flavour', 'Added food: Low fat milk',
      'Supplier business name', 'Supplier business address', 'Lot identification', 'Date marking',
      'Storage instructions', 'Warning or advisory text', 'Warning or advisory text',
      'Precautionary allergen statement', 'Claim 1',
    ]);
    expect(candidates[0]?.text).toBe('LOW-sugar');
    expect(candidates.filter(({ text }) => text === 'Low sugar')).toHaveLength(2);
    expect(new Set(candidates.map(({ key }) => key)).size).toBe(candidates.length);
    expect(candidates.some(({ text }) => text === 'Low sodium')).toBe(false);
    expect(scan({ product: { ...product, name: 'Sugar and natural flavour; slow sugarcane' }, ingredients: [] })
      .some(({ location }) => location === 'Product name')).toBe(false);
  });

  it('distinguishes preview text from withheld directions, names and manually entered claims', () => {
    const candidates = scan();
    expect(candidates.find(({ location }) => location === 'Product name')?.shownInPreview).toBe(true);
    expect(candidates.find(({ location }) => location === 'Preparation directions')?.shownInPreview).toBe(true);
    expect(candidates.find(({ location }) => location.startsWith('Ingredient:'))?.shownInPreview).toBe(true);
    expect(candidates.find(({ location }) => location.startsWith('Additive wording:'))?.shownInPreview).toBe(true);
    expect(candidates.find(({ location }) => location === 'Added food: Low fat milk')?.shownInPreview).toBe(true);
    expect(candidates.find(({ location }) => location === 'Claim 1')?.shownInPreview).toBe(false);

    const incomplete: FormulationRecord = { ...recipe, lines: [], incompleteRecipeLines: {
      unquantifiedLines: [{ id: 'line', kind: 'ingredient', ingredientId: 'flour' }], lineOrder: ['line'],
    } };
    const withheld = scan({
      recipe: incomplete,
      product: { ...product, consumerDirections: 'none' },
      previewAvailable: false,
    });
    expect(withheld.find(({ location }) => location === 'Preparation directions')?.shownInPreview).toBe(false);
    expect(withheld.find(({ location }) => location.startsWith('Ingredient:'))?.shownInPreview).toBe(false);
    expect(withheld.every(({ shownInPreview }) => !shownInPreview)).toBe(true);
  });

  it('tracks saved and unsaved source changes without scanning inactive directions', () => {
    const pack = labelPackCopyForm();
    pack.storageInstructions = 'Low sugar';
    expect(scan({ pack }).some(({ location }) => location === 'Storage instructions')).toBe(true);
    pack.storageInstructions = 'Store in a cool place';
    const changed = scan({ pack, product: {
      ...product, name: 'Plain cake', preparation: { ...product.preparation!, enabled: false },
    } });
    expect(changed.some(({ location }) => location === 'Storage instructions')).toBe(false);
    expect(changed.some(({ location }) => location === 'Product name')).toBe(false);
    expect(changed.some(({ location }) => location === 'Preparation directions')).toBe(false);
  });

  it('retains a decision only for the exact candidate occurrence and suggests existing rule links', () => {
    const pack = labelPackCopyForm();
    pack.storageInstructions = 'Low sugar';
    pack.dateMarking = 'Low sugar';
    const baseline = scan({ pack });
    const first = baseline.find(({ location }) => location === 'Storage instructions');
    const second = baseline.find(({ location }) => location === 'Date marking');
    if (!first || !second) throw new Error('Expected two candidate occurrences.');
    const resolved = scan({
      pack,
    });
    const withDecision = findClaimCandidates(product, makeLabelDraft(product, [recipe], [ingredient, milk]),
      [recipe], [ingredient, milk], [], pack, [], true, [{
        candidateKey: first.key, text: first.text, location: first.location, resolution: 'not_claim',
      }]);
    expect(withDecision.find(({ key }) => key === first.key)?.resolution).toBe('not_claim');
    expect(withDecision.find(({ key }) => key === second.key)?.resolution).toBeUndefined();
    expect(resolved.find(({ location }) => location === 'Product name')?.suggestedClaimRuleId).toBe('claim.low-sugars');
    expect(resolved.find(({ location }) => location === 'Product name')?.suggestedClassification)
      .toBe('nutrition_content');
  });

  it('tracks nested declaration paths and selected additive wording without assuming it is rendered', () => {
    const mix: IngredientRecord = {
      ...ingredient, id: 'mix', name: 'Low sugar mix', kind: 'compound', compoundFormulationId: 'inside',
      additiveSources: [],
    };
    const child: IngredientRecord = {
      ...ingredient,
      additiveSources: [{
        id: 'additive', additiveName: 'Low sugar flavour', sourceStatus: 'added',
        declarationSelection: {
          route: 'schedule7Class', schedule7ClassName: 'Gluten-free purpose', substanceChoice: 'schedule8Name',
        },
      }],
    };
    const inside: FormulationRecord = {
      ...recipe, id: 'inside', name: 'Mix recipe', supplierComposition: { coverage: 'complete', unquantifiedComponents: [] },
    };
    const root: FormulationRecord = {
      ...recipe,
      lines: [{ id: 'mix-line', kind: 'ingredient', ingredientId: 'mix', quantity: { value: '100', unit: 'g' } }],
    };
    const infant: ProductRecord = { ...product, builderProductType: 'infantFood' };
    const records = [mix, child];
    const draft = makeLabelDraft(infant, [root, inside], records);
    const candidates = findClaimCandidates(infant, draft, [root, inside], records, [], labelPackCopyForm(), [], true);
    const parent = candidates.find(({ location }) => location === 'Ingredient: Cake recipe > Low sugar mix');
    const nested = candidates.find(({ location }) => location === 'Ingredient: Cake recipe > Low sugar mix > Mix recipe > Gluten-free flour');
    const additive = candidates.filter(({ location }) => location.startsWith('Additive wording:'));
    expect(parent?.shownInPreview).toBe(false);
    expect(nested?.shownInPreview).toBe(true);
    expect(additive.map(({ text, shownInPreview }) => [text, shownInPreview])).toEqual([
      ['Gluten-free', true], ['Low sugar', true],
    ]);

    const unfinished = { ...child, additiveSources: [{
      ...child.additiveSources![0]!,
      declarationSelection: { route: 'schedule7Class' as const, schedule7ClassName: 'Gluten-free purpose' },
    }] };
    const unfinishedDraft = makeLabelDraft(infant, [root, inside], [mix, unfinished]);
    const pending = findClaimCandidates(infant, unfinishedDraft, [root, inside], [mix, unfinished],
      [], labelPackCopyForm(), [], true);
    expect(pending.find(({ location }) => location.startsWith('Additive wording:'))?.shownInPreview).toBe(false);
  });
});
