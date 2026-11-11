import type { AllergenEvidenceSource, IngredientDeclarationNode, OrderedIngredientDeclarationNode } from '@aus-food/domain';
import { expandFormulation, formatAdditiveDeclarationCandidate, orderIngredientDeclaration, propagateAllergens, sumDecimals } from '@aus-food/engine';
import type { FormulationRecord, IngredientRecord, ProductRecord } from '@aus-food/storage';
import { draftFromProduct, productStepStatuses } from './product-form';
import { draftAllergenVocabulary } from './rule-data';
import { managedNutrients } from './ingredient-form';
import { makeNipDraft, type NipDraft } from './nip-draft';

export interface LabelDraft {
  readonly missing: readonly string[];
  readonly declaration: string;
  readonly allergens: readonly string[];
  readonly pendingAllergens: readonly string[];
  readonly warnings: readonly string[];
  readonly additivesComplete: boolean;
  readonly nutrition: NipDraft;
}

export function makeLabelDraft(
  product: ProductRecord,
  formulations: readonly FormulationRecord[],
  ingredients: readonly IngredientRecord[],
): LabelDraft {
  const missing = new Set<string>();
  const warnings = new Set<string>();
  const byId = new Map(ingredients.map((item) => [item.id, item]));
  const evidence: AllergenEvidenceSource[] = [];
  const checked = new Set<string>();
  const additiveCandidates = new Map<string, string[]>();
  const statuses = productStepStatuses(draftFromProduct(product), product);
  if (!statuses.about.done) missing.add('Product details and food state');
  if (!product.builderProductType || !statuses.type.done) missing.add('Product type and its questions');
  if (!statuses.pack.done) missing.add('Serving size and unit, servings per pack and net contents');
  if (product.builderProductType === 'other') warnings.add('This product type needs a consultant to check its specific requirements.');
  if (product.claims?.length) {
    warnings.add('Claims are not included in this draft; ask a consultant to review them.');
    if (product.claims.some((claim) => !claim.classification || !claim.classificationConfirmed)) {
      missing.add('Classify and confirm the claims you entered');
    }
  }
  const vocabularyIds = new Set(draftAllergenVocabulary.map((entry) => entry.id));
  let hasAdditives = false;
  let additivesComplete = true;

  function collectIngredient(record: IngredientRecord): void {
    if (checked.has(record.id)) return;
    checked.add(record.id);
    if (!record.specification) missing.add(`${record.name}: supplier specification reference and date`);
    const coverageCurrent = record.specification !== undefined && record.coverageSpecification !== undefined
      && record.coverageSpecification.reference === record.specification.reference
      && record.coverageSpecification.sourceDate === record.specification.sourceDate;
    if (!record.allergensConfirmed || !coverageCurrent) missing.add(`${record.name}: confirm the allergen information`);
    if (!record.additivesConfirmed || !coverageCurrent) {
      additivesComplete = false;
      missing.add(`${record.name}: confirm the additive information`);
    }
    if (managedNutrients.some(({ key }) => {
      const value = record.nutrientProfile?.values[key];
      if (!value || typeof value.value !== 'string' || !/^\d+(\.\d+)?$/.test(value.value)
        || !Number.isFinite(Number(value.value)) || !['g/100g', 'mg/100g'].includes(value.unit)
        || typeof value.sourceId !== 'string' || !value.sourceId.trim()
        || typeof value.sourceDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.sourceDate)) return true;
      const date = new Date(`${value.sourceDate}T00:00:00Z`);
      return !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value.sourceDate;
    })) {
      missing.add(`${record.name}: nutrition information`);
    }
    const sources = record.allergenEvidence ?? [];
    const base = sources.find((source) => source.subjectId === record.id && source.kind === 'ingredient');
    const assessments = base?.assessments ?? {};
    for (const [id, status] of Object.entries(assessments)) {
      if (!vocabularyIds.has(id)) missing.add(`${record.name}: check unrecognised allergen "${id}"`);
      if (status === 'unknown' || status === 'conflict' || status === 'exemption_review') {
        missing.add(`${record.name}: resolve allergen evidence for ${id}`);
      }
    }
    if (record.allergensConfirmed && coverageCurrent && record.specification) {
      evidence.push({
        id: `ingredient:${record.id}`,
        subjectId: record.id,
        kind: 'ingredient',
        sourceId: record.specification.reference,
        sourceDate: record.specification.sourceDate,
        sourcePath: [record.id],
        assessments: Object.fromEntries(draftAllergenVocabulary.map(({ id }) =>
          [id, assessments[id] ?? 'absent'])),
      });
    } else if (base) {
      evidence.push({ ...base, id: `ingredient:${record.id}` });
    }
    for (const [index, source] of sources.entries()) {
      if (source === base) continue;
      evidence.push({ ...source, id: `other:${record.id}:${index}` });
    }
    for (const [index, source] of (record.additiveSources ?? []).entries()) {
      hasAdditives = true;
      if (source.sourceStatus === 'unknown') {
        additivesComplete = false;
        missing.add(`${record.name}: confirm the source status of ${source.additiveName}`);
      }
      const selection = source.declarationSelection;
      const candidate = formatAdditiveDeclarationCandidate({
        route: selection?.route ?? 'unknown',
        additiveName: source.additiveName,
        ...(source.codeNumber ? { codeNumber: source.codeNumber } : {}),
        ...(selection?.schedule7ClassName ? { schedule7ClassName: selection.schedule7ClassName } : {}),
        ...(selection?.substanceChoice ? { substanceChoice: selection.substanceChoice } : {}),
        ...(selection?.flavouringWording ? { flavouringWording: selection.flavouringWording } : {}),
        ingredientId: record.id,
        sourcePath: [record.id, source.id],
      });
      if (!candidate.text) {
        additivesComplete = false;
        missing.add(`${record.name}: choose declaration wording for ${source.additiveName}`);
      }
      if (candidate.text) {
        const candidates = additiveCandidates.get(record.id) ?? [];
        if (!candidates.includes(candidate.text)) candidates.push(candidate.text);
        additiveCandidates.set(record.id, candidates);
      }
      warnings.add(`${record.name}: check whether and how ${source.additiveName} belongs in the declaration${candidate.text ? ` (candidate: ${candidate.text})` : ''}.`);
      if (source.allergenAssessments && Object.keys(source.allergenAssessments).length) {
        const sourceEvidence = source.sourceEvidence?.[0];
        if (!sourceEvidence) {
          missing.add(`${record.name}: dated allergen evidence for ${source.additiveName}`);
        } else {
          evidence.push({
            id: `additive:${record.id}:${index}`,
            subjectId: source.id,
            kind: 'additive',
            sourceId: sourceEvidence.reference,
            sourceDate: sourceEvidence.sourceDate,
            sourcePath: [record.id, source.id],
            assessments: source.allergenAssessments,
          });
        }
      }
    }
  }

  function nodesFor(formulationId: string, stack: readonly string[]): IngredientDeclarationNode[] {
    if (stack.includes(formulationId)) throw new Error('A circular compound ingredient reference must be fixed in the formulation.');
    const expanded = expandFormulation(formulationId, { value: '100', unit: 'g' }, formulations);
    const groups = new Map<string, typeof expanded[number][]>();
    for (const item of expanded) {
      const group = groups.get(item.ingredientId) ?? [];
      group.push(item);
      groups.set(item.ingredientId, group);
    }
    return [...groups].map(([id, group]) => {
      const record = byId.get(id);
      const first = group[0];
      if (!first) throw new Error('An ingredient group is empty.');
      if (!record) {
        additivesComplete = false;
        missing.add(`A recipe ingredient is unavailable (${id})`);
        return {
          ingredientId: id, displayName: `[Missing ingredient: ${id}]`, nameSourceId: '',
          mass: { value: sumDecimals(group.map((item) => item.mass.value)), unit: 'g' },
          sourcePath: first.sourcePath, kind: 'atomic', compositionStatus: 'review_required', children: [],
        };
      }
      collectIngredient(record);
      const children = record.kind === 'compound' && record.compoundFormulationId
        ? nodesFor(record.compoundFormulationId, [...stack, formulationId])
        : [];
      if (record.kind === 'compound' && children.length === 0) missing.add(`${record.name}: compound ingredient recipe`);
      return {
        ingredientId: id,
        displayName: record.name,
        nameSourceId: `ingredient:${id}`,
        mass: { value: sumDecimals(group.map((item) => item.mass.value)), unit: 'g' },
        sourcePath: first.sourcePath,
        kind: record.kind,
        compositionStatus: record.kind === 'compound' ? (children.length ? 'complete' : 'review_required') : 'not_applicable',
        children,
      };
    });
  }

  let declaration = '';
  try {
    const ordered = orderIngredientDeclaration(nodesFor(product.formulationId, []));
    if (ordered.status === 'review_required') missing.add('Complete the ingredient and compound recipe information');
    function render(node: OrderedIngredientDeclarationNode, depth: number): string {
      const candidates = additiveCandidates.get(node.ingredientId) ?? [];
      const additiveNote = candidates.length ? ` [additives to check: ${candidates.join(', ')}]` : '';
      if (!node.children.length) return node.displayName + additiveNote;
      const open = depth % 2 === 0 ? '[' : '(';
      const close = depth % 2 === 0 ? ']' : ')';
      return `${node.displayName} ${open}${node.children.map((child) => render(child, depth + 1)).join(', ')}${close}${additiveNote}`;
    }
    declaration = ordered.ingredients.map((node) => render(node, 0)).join(', ');
  } catch (error) {
    additivesComplete = false;
    missing.add(`Recipe needs attention: ${error instanceof Error ? error.message : 'could not build the ingredient list'}`);
  }
  const inputs = product.additiveNameInputs;
  const needsSupportedAdditiveInputs = product.builderProductType !== 'other'
    && (!inputs?.additiveCategoryId || !inputs.evidence);
  if (hasAdditives && (!inputs || needsSupportedAdditiveInputs)) {
    additivesComplete = false;
    missing.add('Product additive and name information');
  }
  let allergens: string[] = [];
  const pendingAllergens = new Set<string>();
  if (evidence.length) {
    try {
      const result = propagateAllergens(evidence, draftAllergenVocabulary, 'incomplete');
      allergens = [...new Set(result.allergens.map((item) => item.summaryName))];
      if (result.status === 'review_required') {
        for (const item of result.unresolved) {
          if (item.status === 'final_food_evaluation') {
            pendingAllergens.add(item.allergenId);
            warnings.add(`${item.allergenId}: supplier evidence indicates it may be present; final-food conditions need review.`);
          }
          if (item.status === 'conflict' || item.status === 'unknown' || item.status === 'exemption_review') {
            missing.add(`Resolve conflicting or uncertain allergen evidence: ${item.allergenId}`);
          }
        }
        warnings.add('Allergen names, exemptions and any final-food conditions need consultant review.');
      }
    } catch (error) {
      missing.add(`Allergen information needs attention: ${error instanceof Error ? error.message : 'could not be read'}`);
    }
  }
  const nutrition = makeNipDraft(product, formulations, ingredients);
  for (const item of nutrition.missing) missing.add(item);
  warnings.add('Draft only. Nutrition uses supplier data and NPC rounding; the rounding stage and all label content need consultant review.');
  warnings.add('Warnings and other label content are not yet assembled.');
  return { missing: [...missing], declaration, allergens, pendingAllergens: [...pendingAllergens], warnings: [...warnings], additivesComplete, nutrition };
}
