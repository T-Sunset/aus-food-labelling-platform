import type { ClaimCandidateResolution, ClaimClassification, LabelClaim, LabelClaimCandidateDecision } from '@aus-food/domain';
import type { FormulationRecord, IngredientRecord, LabelAdditiveWording, ProductRecord } from '@aus-food/storage';
import type { LabelDraft } from './label-draft';
import { labelAdditiveSelection } from './label-additive-wording';
import type { LabelPackCopyForm } from './label-settings';

export type ClaimCandidateAction =
  | { readonly kind: 'product' }
  | { readonly kind: 'ingredient'; readonly id: string }
  | { readonly kind: 'additives' }
  | { readonly kind: 'pack'; readonly fieldId: string }
  | { readonly kind: 'claims'; readonly id: string };

export interface ClaimCandidate {
  readonly key: string;
  readonly text: string;
  readonly location: string;
  readonly shownInPreview: boolean;
  readonly action: ClaimCandidateAction;
  readonly resolution?: ClaimCandidateResolution;
  readonly suggestedClassification?: ClaimClassification;
  readonly suggestedClaimRuleId?: string;
}

export function candidateSuggestion(text: string): Pick<ClaimCandidate, 'suggestedClassification' | 'suggestedClaimRuleId'> {
  const normalized = text.toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  const ruleByPhrase: Readonly<Record<string, string>> = {
    'low energy': 'claim.low-energy',
    'low fat': 'claim.low-fat',
    'low sugar': 'claim.low-sugars',
    'low sugars': 'claim.low-sugars',
    'low sodium': 'claim.low-sodium',
    'good source of fibre': 'claim.good-source-dietary-fibre',
    'good source of fiber': 'claim.good-source-dietary-fibre',
    'source of fibre': 'claim.good-source-dietary-fibre',
    'source of fiber': 'claim.good-source-dietary-fibre',
  };
  if (ruleByPhrase[normalized]) {
    return { suggestedClassification: 'nutrition_content', suggestedClaimRuleId: ruleByPhrase[normalized] };
  }
  if (normalized.startsWith('reduced ')) return { suggestedClassification: 'comparative' };
  if (normalized.startsWith('supports ')) return { suggestedClassification: 'health' };
  if (normalized === 'all natural') return { suggestedClassification: 'not_code_regulated' };
  return normalized.includes('free') || normalized.startsWith('no added ')
    ? { suggestedClassification: 'nutrition_content' }
    : {};
}

const possibleClaimPattern = /(^|[^\p{L}\p{N}_])((?:low|reduced|high)[\s-]+(?:sugars?|fat|energy|sodium)|no[\s-]+added[\s-]+sugars?|(?:sugars?|gluten)[\s-]+free|free[\s-]+from[\s-]+gluten|(?:good[\s-]+)?source[\s-]+of[\s-]+(?:dietary[\s-]+)?(?:fibre|fiber|protein)|supports[\s-]+heart[\s-]+health|all[\s-]+natural)(?=$|[^\p{L}\p{N}_])/giu;

const packFields: readonly {
  readonly key: Exclude<keyof LabelPackCopyForm, 'precautionaryAllergenBasis'>;
  readonly label: string;
  readonly fieldId: string;
}[] = [
  { key: 'supplierName', label: 'Supplier business name', fieldId: 'label-supplier-name' },
  { key: 'supplierAddress', label: 'Supplier business address', fieldId: 'label-supplier-address' },
  { key: 'lotIdentification', label: 'Lot identification', fieldId: 'label-lot' },
  { key: 'dateMarking', label: 'Date marking', fieldId: 'label-date' },
  { key: 'storageInstructions', label: 'Storage instructions', fieldId: 'label-storage' },
  { key: 'warningAdvisoryStatements', label: 'Warning or advisory text', fieldId: 'label-warning' },
  { key: 'precautionaryAllergenStatement', label: 'Precautionary allergen statement', fieldId: 'label-pal' },
];

export function findClaimCandidates(
  product: ProductRecord,
  draft: LabelDraft,
  formulations: readonly FormulationRecord[],
  ingredients: readonly IngredientRecord[],
  wording: readonly LabelAdditiveWording[],
  packCopy: LabelPackCopyForm,
  claims: readonly LabelClaim[],
  previewAvailable: boolean,
  decisions: readonly LabelClaimCandidateDecision[] = [],
): ClaimCandidate[] {
  const candidates: ClaimCandidate[] = [];
  function scan(
    sourceKey: readonly string[],
    location: string,
    text: string | undefined,
    shown: boolean,
    action: ClaimCandidateAction,
  ): void {
    if (!text) return;
    for (const match of text.matchAll(possibleClaimPattern)) {
      const phrase = match[2];
      if (!phrase) continue;
      const offset = match.index + match[1]!.length;
      candidates.push({
        key: JSON.stringify([...sourceKey, String(offset)]),
        text: phrase,
        location,
        shownInPreview: previewAvailable && shown,
        action,
        ...candidateSuggestion(phrase),
        ...(() => {
          const decision = decisions.find((item) => item.candidateKey === JSON.stringify([...sourceKey, String(offset)])
            && item.text === phrase && item.location === location);
          return decision ? { resolution: decision.resolution } : {};
        })(),
      });
    }
  }
  const productAction: ClaimCandidateAction = { kind: 'product' };
  scan(['product', product.id, 'name'], 'Product name', product.name, true, productAction);
  for (const [field, label, active, text] of [
    ['preparation', 'Preparation directions', product.preparation?.enabled, product.preparation?.directions],
    ['draining', 'Draining directions', product.draining?.enabled, product.draining?.directions],
    ['other', 'Other customer directions', product.otherConsumerDirections, product.otherConsumerDirectionsText],
  ] as const) {
    if (!active) continue;
    const kind = field === 'preparation' ? 'Preparation' : field === 'draining' ? 'Draining' : 'Other or unclear';
    scan(['product', product.id, field], label, text,
      draft.pack.previewDirections.some((direction) => direction.kind === kind), productAction);
  }

  const records = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const names = new Map([...formulations.map((item) => [item.id, item.name] as const),
    ...ingredients.map((item) => [item.id, item.name] as const)]);
  for (const input of draft.declarationInputs) {
    const ingredient = records.get(input.ingredientId);
    if (!ingredient) continue;
    const path = input.sourcePath.flatMap((id) => {
      const name = names.get(id);
      return name ? [name] : [];
    }).join(' > ');
    const location = `Ingredient: ${path}`;
    const action: ClaimCandidateAction = { kind: 'ingredient', id: ingredient.id };
    const isShown = (field: 'name' | 'additiveName' | 'schedule7ClassName', sourceId?: string): boolean =>
      Boolean(draft.declaration) && draft.declarationTextSources.some((source) => source.ingredientId === ingredient.id
        && source.field === field && source.additiveSourceId === sourceId);
    scan([...input.sourcePath, 'name'], location, ingredient.name, isShown('name'), action);
    for (const source of ingredient.additiveSources ?? []) {
      const selection = labelAdditiveSelection(ingredient.id, source, wording);
      if (!selection) continue;
      const additiveLocation = `Additive wording: ${path} > ${source.additiveName}`;
      const additiveAction: ClaimCandidateAction = { kind: 'additives' };
      if (selection.route === 'schedule7Class') {
        scan([...input.sourcePath, source.id, 'class'], additiveLocation, selection.schedule7ClassName,
          isShown('schedule7ClassName', source.id), additiveAction);
      }
      if (selection.route === 'noSchedule7Class'
        || (selection.route === 'schedule7Class' && selection.substanceChoice === 'schedule8Name')
        || (selection.route === 'flavouring' && selection.flavouringWording === 'specificName')) {
        scan([...input.sourcePath, source.id, 'name'], additiveLocation, source.additiveName,
          isShown('additiveName', source.id), action);
      }
    }
  }
  if (product.preparation?.enabled && product.preparation.kind === 'withFood') {
    const added = product.preparation.addedIngredientId && records.get(product.preparation.addedIngredientId);
    if (added) scan(['added-food', added.id], `Added food: ${added.name}`, added.name,
      draft.nutritionPanel.combinedHeading === `With ${added.name}`, { kind: 'ingredient', id: added.id });
  }
  for (const field of packFields) {
    scan(['pack', field.key], field.label, packCopy[field.key], true,
      { kind: 'pack', fieldId: field.fieldId });
  }
  for (const [index, claim] of claims.entries()) {
    scan(['claim', claim.id], `Claim ${index + 1}`, claim.text, false, { kind: 'claims', id: claim.id });
  }
  return candidates;
}
