import type { AllergenEvidenceSource, IngredientDeclarationNode, LabelClaim, MassQuantity, OrderedIngredientDeclarationNode, PropagatedAllergen } from '@aus-food/domain';
import { expandFormulation, formatAdditiveDeclarationCandidate, orderIngredientDeclaration, propagateAllergens, sumDecimals } from '@aus-food/engine';
import { findBoldPhraseRanges } from '@aus-food/label';
import { processEffectsNeedReview } from './formulation-form';
import type { FormulationRecord, IngredientRecord, LabelAdditiveWording, LabelPackCopy, ProductRecord } from '@aus-food/storage';
import { draftFromProduct, productStepStatuses } from './product-form';
import { draftAllergenVocabulary } from './rule-data';
import { currentAdditiveCoverage, currentAllergenCoverage } from './ingredient-form';
import { makeNipDraft, type NipDraft } from './nip-draft';
import { additiveIngredientsInRecipe } from './ingredient-additives';
import { makePreparedNutritionDraft, type PreparedNutritionDraft } from './prepared-nutrition';
import { makeDrainedNutritionDraft, type DrainedNutritionDraft } from './drained-nutrition';
import { makeNutritionPanel, type NutritionPanel } from './nutrition-panel';
import { makePackDraft, type PackDraft } from './pack-draft';
import { labelAdditiveSelection } from './label-additive-wording';

export type ReviewSection = 'about' | 'type' | 'pack' | 'directions' | 'nutrition' | 'technical';
export type ReviewAction =
  | { readonly kind: 'section'; readonly section: ReviewSection }
  | { readonly kind: 'ingredient' | 'recipe'; readonly id: string }
  | { readonly kind: 'labels' };
export type ReviewArea = 'product' | 'pack' | 'recipe' | 'ingredients' | 'nutrition' | 'additives' | 'claims' | 'labels';
export interface LabelIssue {
  readonly message: string;
  readonly area: ReviewArea;
  readonly actions: readonly ReviewAction[];
}

export interface LabelDraft {
  readonly missing: readonly string[];
  readonly issues: readonly LabelIssue[];
  readonly declaration: string;
  readonly declarationTextSources: readonly {
    readonly ingredientId: string;
    readonly field: 'name' | 'additiveName' | 'schedule7ClassName';
    readonly additiveSourceId?: string;
  }[];
  readonly declarationInputs: readonly {
    readonly ingredientId: string;
    readonly name: string;
    readonly sourcePath: readonly string[];
    readonly specification?: { readonly reference: string; readonly sourceDate: string };
    readonly additiveUse?: string;
  }[];
  readonly pack: PackDraft;
  readonly allergens: readonly string[];
  readonly allergenTrace: readonly PropagatedAllergen[];
  readonly allergenEvidence: readonly AllergenEvidenceSource[];
  readonly allergenDeclarationTerms: readonly string[];
  readonly allergenDeclarationReady: boolean;
  readonly pendingAllergens: readonly string[];
  readonly warnings: readonly string[];
  readonly additivesComplete: boolean;
  readonly nutrition: NipDraft;
  readonly nutritionPanel: NutritionPanel;
  readonly preparedNutrition?: PreparedNutritionDraft;
  readonly drainedNutrition?: DrainedNutritionDraft;
}

export function makeLabelDraft(
  product: ProductRecord,
  formulations: readonly FormulationRecord[],
  ingredients: readonly IngredientRecord[],
  additiveWording: readonly LabelAdditiveWording[] = [],
  labelPackCopy?: LabelPackCopy,
  includeDailyIntake = false,
  claims: readonly LabelClaim[] = [],
): LabelDraft {
  const missing = new Set<string>();
  const issues = new Map<string, { message: string; area: ReviewArea; actions: ReviewAction[] }>();
  function addMissing(message: string, area: ReviewArea, ...actions: ReviewAction[]): void {
    missing.add(message);
    const issue = issues.get(message);
    if (!issue) {
      issues.set(message, { message, area, actions: [...actions] });
      return;
    }
    for (const action of actions) {
      if (!issue.actions.some((existing) => JSON.stringify(existing) === JSON.stringify(action))) {
        issue.actions.push(action);
      }
    }
  }
  const section = (name: ReviewSection): ReviewAction => ({ kind: 'section', section: name });
  const recipeAction = (id: string): ReviewAction => ({ kind: 'recipe', id });
  const ingredientAction = (id: string): ReviewAction => ({ kind: 'ingredient', id });
  const rootRecipe = recipeAction(product.formulationId);
  const warnings = new Set<string>();
  const byId = new Map(ingredients.map((item) => [item.id, item]));
  const evidence: AllergenEvidenceSource[] = [];
  type AdditiveCandidate = {
    readonly text: string;
    readonly sourceId: string;
    readonly nameShown: boolean;
    readonly classShown: boolean;
  };
  const additiveCandidates = new Map<string, AdditiveCandidate[]>();
  const directAdditiveCandidates = new Map<string, AdditiveCandidate>();
  const infantFoodCandidate = product.builderProductType === 'infantFood';
  let missingIngredientNames = false;
  let missingCompoundRecipes = false;
  const statuses = productStepStatuses(draftFromProduct(product), product);
  if (!statuses.about.done) addMissing('Product details and food state', 'product', section('about'), section('nutrition'));
  if (!product.builderProductType || !statuses.type.done) addMissing('Product type and its questions', 'product', section('type'));
  if (!statuses.pack.done) addMissing('Serving size and unit, servings per pack and net contents', 'pack', section('pack'));
  if (product.builderProductType === 'other') warnings.add('This product type needs a consultant to check its specific requirements.');
  if (claims.length) {
    warnings.add('Claims are saved for this Label draft but are not rendered in the label preview; review their wording and related content.');
    if (claims.some((claim) => !claim.classification || !claim.classificationConfirmed)) {
      addMissing('Classify and confirm the claims entered for this Label', 'claims', { kind: 'labels' });
    }
  }
  const vocabularyIds = new Set(draftAllergenVocabulary.map((entry) => entry.id));
  let hasAdditives = false;
  let additivesComplete = true;
  function hasCompleteCompoundComposition(record: IngredientRecord): boolean {
    return record.kind === 'compound' && !!record.compoundFormulationId
      && formulations.some((formulation) => formulation.id === record.compoundFormulationId
        && formulation.supplierComposition?.coverage === 'complete');
  }
  function hasDerivedAllergenCoverage(record: IngredientRecord): boolean {
    if (!hasCompleteCompoundComposition(record)
      || (record.allergenEvidence?.length ?? 0) > 0
      || (record.additiveSources?.length ?? 0) > 0) return false;
    return true;
  }
  function hasAllergenCoverage(record: IngredientRecord): boolean {
    return currentAllergenCoverage(record) !== undefined || hasDerivedAllergenCoverage(record);
  }

  function collectIngredient(record: IngredientRecord, path: readonly string[]): void {
    const pathId = JSON.stringify(path);
    const evidencePath = (source: AllergenEvidenceSource): readonly string[] => {
      const position = source.sourcePath.indexOf(record.id);
      return [...path, ...source.sourcePath.slice(position < 0 ? 0 : position + 1)];
    };
    const supportedAssessments = (assessments: AllergenEvidenceSource['assessments']) => {
      for (const id of Object.keys(assessments)) {
        if (!vocabularyIds.has(id)) addMissing(`${record.name}: check unrecognised allergen "${id}"`, 'ingredients', ingredientAction(record.id));
      }
      return Object.fromEntries(Object.entries(assessments).filter(([id]) => vocabularyIds.has(id)));
    };
    const allergenCoverage = currentAllergenCoverage(record);
    if (!allergenCoverage && !hasDerivedAllergenCoverage(record)) {
      addMissing(`${record.name}: confirm the allergen information`, 'ingredients', ingredientAction(record.id));
    }
    if (!currentAdditiveCoverage(record)) {
      additivesComplete = false;
      addMissing(`${record.name}: confirm the additive information`, 'ingredients', ingredientAction(record.id));
    }
    const sources = record.allergenEvidence ?? [];
    const base = sources.find((source) => source.subjectId === record.id && source.kind === 'ingredient');
    const assessments = base?.assessments ?? {};
    for (const [id, status] of Object.entries(assessments)) {
      if (!vocabularyIds.has(id)) addMissing(`${record.name}: check unrecognised allergen "${id}"`, 'ingredients', ingredientAction(record.id));
      if (status === 'unknown' || status === 'conflict' || status === 'exemption_review') {
        addMissing(`${record.name}: resolve allergen evidence for ${id}`, 'ingredients', ingredientAction(record.id));
      }
    }
    if (allergenCoverage) {
      evidence.push({
        id: `ingredient:${pathId}`,
        subjectId: record.id,
        kind: 'ingredient',
        sourceId: allergenCoverage.sourceId,
        sourceDate: allergenCoverage.sourceDate,
        ...(!allergenCoverage.sourceId && !allergenCoverage.sourceDate ? { sourceType: 'user' as const } : {}),
        sourcePath: path,
        assessments: Object.fromEntries(draftAllergenVocabulary.map(({ id }) =>
          [id, assessments[id] ?? 'absent'])),
      });
    } else if (base) {
      evidence.push({ ...base, id: `ingredient:${pathId}`, sourcePath: evidencePath(base),
        assessments: supportedAssessments(base.assessments) });
    }
    for (const [index, source] of sources.entries()) {
      if (source === base) continue;
      evidence.push({ ...source, id: `other:${pathId}:${index}`, sourcePath: evidencePath(source),
        assessments: supportedAssessments(source.assessments) });
    }
    for (const [index, source] of (record.additiveSources ?? []).entries()) {
      hasAdditives = true;
      if (source.sourceStatus === 'unknown' && record.directAdditiveSourceId !== source.id) {
        additivesComplete = false;
        addMissing(`${record.name}: confirm the source status of ${source.additiveName}`, 'ingredients', ingredientAction(record.id));
      }
      const selection = labelAdditiveSelection(record.id, source, additiveWording);
      const candidate = formatAdditiveDeclarationCandidate({
        route: selection?.route ?? 'unknown',
        additiveName: source.additiveName,
        ...(source.codeNumber ? { codeNumber: source.codeNumber } : {}),
        ...(selection?.schedule7ClassName ? { schedule7ClassName: selection.schedule7ClassName } : {}),
        ...(selection?.substanceChoice ? { substanceChoice: selection.substanceChoice } : {}),
        ...(selection?.flavouringWording ? { flavouringWording: selection.flavouringWording } : {}),
        ingredientId: record.id,
        sourcePath: [...path, source.id],
      });
      if (!candidate.text) {
        additivesComplete = false;
        addMissing(`${record.name}: choose declaration wording for ${source.additiveName}`, 'labels', { kind: 'labels' });
      }
      if (candidate.text) {
        const selected = selection ?? { route: 'unknown' };
        const value: AdditiveCandidate = {
          text: candidate.text,
          sourceId: source.id,
          nameShown: selected.route === 'noSchedule7Class'
            || selected.route === 'specifiedFlavouringSubstance'
            || (selected.route === 'flavouring' && selected.flavouringWording === 'specificName')
            || (selected.route === 'schedule7Class' && selected.substanceChoice === 'schedule8Name'),
          classShown: selected.route === 'schedule7Class',
        };
        if (record.directAdditiveSourceId === source.id) {
          directAdditiveCandidates.set(record.id, value);
        } else {
          const candidates = additiveCandidates.get(record.id) ?? [];
          if (!candidates.some((entry) => entry.text === candidate.text)) candidates.push(value);
          additiveCandidates.set(record.id, candidates);
        }
      }
      warnings.add(`${record.name}: check whether and how ${source.additiveName} belongs in the declaration${candidate.text ? ` (candidate: ${candidate.text})` : ''}.`);
      if (source.allergenAssessments && Object.keys(source.allergenAssessments).length) {
        const sourceEvidence = source.sourceEvidence?.[0];
        evidence.push({
          id: `additive:${pathId}:${index}`,
          subjectId: source.id,
          kind: 'additive',
          sourceId: sourceEvidence?.reference ?? '',
          sourceDate: sourceEvidence?.sourceDate ?? '',
          sourcePath: [...path, 'additive-source', source.id],
          assessments: supportedAssessments(source.allergenAssessments),
        });
      }
    }
  }

  function nodesFor(
    formulationId: string,
    stack: readonly string[],
    targetMass: MassQuantity = { value: '100', unit: 'g' },
  ): IngredientDeclarationNode[] {
    if (stack.includes(formulationId)) throw new Error('A circular compound ingredient reference must be fixed in the formulation.');
    const expanded = expandFormulation(formulationId, targetMass, formulations);
    if (formulations.some((recipe) => processEffectsNeedReview(recipe.processMassProfile)
      && expanded.some((item) => item.sourcePath.includes(recipe.id)))) {
      addMissing('Processing may affect ingredient amounts and declaration order; review the recipe', 'recipe', recipeAction(formulationId));
    }
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
        addMissing(`A recipe ingredient is unavailable (${id})`, 'recipe', recipeAction(formulationId));
        return {
          ingredientId: id, displayName: `[Missing ingredient: ${id}]`, nameSourceId: '',
          mass: { value: sumDecimals(group.map((item) => item.mass.value)), unit: 'g' },
          sourcePath: first.sourcePath, kind: 'atomic', compositionStatus: 'review_required', children: [],
        };
      }
      if (!record.name.trim()) {
        missingIngredientNames = true;
        addMissing('Add an ingredient name before drafting the declaration', 'ingredients', ingredientAction(record.id));
      }
      if (record.directAdditiveSourceId
        && group.some((item) => item.additiveUse && item.additiveUse !== 'added')) {
        additivesComplete = false;
        addMissing(`${record.name}: review its use and whether it belongs in the ingredient declaration`, 'recipe', recipeAction(formulationId));
      }
      if ((!record.directAdditiveSourceId
        || !record.additiveSources?.some((source) => source.id === record.directAdditiveSourceId))
        && group.some((item) => item.additiveUse)) {
        additivesComplete = false;
        addMissing(`${record.name}: its saved additive use needs review because it is no longer identified as an additive`, 'recipe', recipeAction(formulationId), ingredientAction(record.id));
      }
      const mass = { value: sumDecimals(group.map((item) => item.mass.value)), unit: 'g' as const };
      let children: IngredientDeclarationNode[] = [];
      if (record.kind === 'compound' && record.compoundFormulationId) {
        try {
          children = nodesFor(record.compoundFormulationId, [...stack, formulationId], mass);
        } catch (error) {
          addMissing(
            `${record.name || 'This compound ingredient'}: complete its component recipe before drafting the declaration`,
            'ingredients',
            ingredientAction(record.id),
            recipeAction(record.compoundFormulationId),
          );
          throw error;
        }
      }
      if (record.kind === 'compound' && children.length === 0) {
        missingCompoundRecipes = true;
        addMissing(`${record.name || 'Compound ingredient'}: enter its component recipe`, 'ingredients', ingredientAction(record.id));
      }
      const compositionConfirmed = hasCompleteCompoundComposition(record);
      if (record.kind === 'compound' && !compositionConfirmed) {
        addMissing(
          infantFoodCandidate
            ? `${record.name || 'Compound ingredient'}: confirm all components and amounts so they can be listed individually`
            : `${record.name || 'Compound ingredient'}: confirm complete compound composition`,
          'ingredients',
          ingredientAction(record.id),
          ...(record.compoundFormulationId ? [recipeAction(record.compoundFormulationId)] : []),
        );
      }
      return {
        ingredientId: id,
        displayName: record.name,
        nameSourceId: `ingredient:${id}`,
        mass,
        sourcePath: first.sourcePath,
        kind: record.kind,
        compositionStatus: record.kind === 'compound' ? (children.length && compositionConfirmed ? 'complete' : 'review_required') : 'not_applicable',
        children,
      };
    });
  }

  const known = additiveIngredientsInRecipe(product.formulationId, formulations, ingredients);
  const declarationInputs = known.references.map((reference) => {
    const record = byId.get(reference.ingredientId);
    return {
      ingredientId: reference.ingredientId,
      name: record?.name.trim()
        ? record.name
        : record
          ? `Unnamed ingredient ${record.id}`
          : `Unavailable ingredient ${reference.ingredientId}`,
      sourcePath: reference.sourcePath,
      ...(record?.specification ? { specification: record.specification } : {}),
      ...(reference.additiveUse ? { additiveUse: reference.additiveUse } : {}),
    };
  });
  for (const id of known.missingRecipeIds) addMissing(`A recipe is unavailable (${id})`, 'recipe', section('about'), rootRecipe);
  for (const item of known.references) {
    const record = byId.get(item.ingredientId);
    if (record) collectIngredient(record, item.sourcePath);
    else {
      additivesComplete = false;
      addMissing(`A recipe ingredient is unavailable (${item.ingredientId})`, 'recipe', rootRecipe);
    }
  }

  let allergens: string[] = [];
  let allergenTrace: readonly PropagatedAllergen[] = [];
  let allergenDeclarationReady = false;
  const pendingAllergens = new Set<string>();
  const allergenNamesByIngredientId = new Map<string, Set<string>>();
  const allergenDeclarationTerms = new Set<string>();
  function inputForAllergenPath(sourcePath: readonly string[]) {
    return declarationInputs
      .filter((input) => input.sourcePath.length <= sourcePath.length
        && input.sourcePath.every((part, index) => sourcePath[index] === part))
      .sort((left, right) => right.sourcePath.length - left.sourcePath.length)[0];
  }
  const sourceCoverageComplete = known.references.length > 0
    && known.missingRecipeIds.size === 0
    && !known.issues.has('COMPOUND_ADDITIVES_NOT_PROPAGATED')
    && known.references.every((reference) => {
      const record = byId.get(reference.ingredientId);
      return record !== undefined && hasAllergenCoverage(record);
    });

  for (const parent of evidence) {
    const ingredient = byId.get(parent.subjectId);
    if (parent.kind !== 'ingredient' || ingredient?.kind !== 'compound') continue;
    for (const child of evidence) {
      if (child.sourcePath.length <= parent.sourcePath.length
        || !parent.sourcePath.every((part, index) => child.sourcePath[index] === part)) continue;
      for (const [id, status] of Object.entries(child.assessments)) {
        if (status === 'present' && parent.assessments[id] === 'absent') {
          addMissing(`${ingredient.name}: ${id} is recorded absent, but an included ingredient records it present; review the conflict`, 'ingredients', ingredientAction(ingredient.id), rootRecipe);
        }
      }
    }
  }
  if (evidence.length) {
    try {
      const result = propagateAllergens(evidence, draftAllergenVocabulary, sourceCoverageComplete ? 'complete' : 'incomplete');
      allergenTrace = result.allergens;
      allergenDeclarationReady = sourceCoverageComplete && result.status === 'propagated';
      for (const item of result.allergens) {
        const summaryNames = [item.summaryName];
        if (item.id === 'wheat') {
          for (const sourcePath of item.sourcePaths) {
            const input = inputForAllergenPath(sourcePath);
            const ingredient = input ? byId.get(input.ingredientId) : undefined;
            if (!input || !ingredient) {
              allergenDeclarationReady = false;
              addMissing('Map the wheat evidence to an ingredient shown in the declaration', 'ingredients', rootRecipe);
            } else if (ingredient.wheatGlutenStatus === 'present') {
              summaryNames.push('gluten');
            } else if (!ingredient.wheatGlutenStatus) {
              allergenDeclarationReady = false;
              addMissing(
                `${ingredient.name}: confirm whether the wheat contains gluten; the summary also needs “gluten” if it does`,
                'ingredients',
                ingredientAction(ingredient.id),
              );
            }
          }
        }
        allergens.push(...summaryNames);
        for (const sourcePath of item.sourcePaths) {
          const input = inputForAllergenPath(sourcePath);
          if (!input) {
            allergenDeclarationReady = false;
            addMissing(`Map the required ${item.ingredientListName} name to an ingredient declaration path`, 'ingredients', rootRecipe);
            continue;
          }
          const names = allergenNamesByIngredientId.get(input.ingredientId) ?? new Set<string>();
          names.add(item.ingredientListName);
          allergenNamesByIngredientId.set(input.ingredientId, names);
          allergenDeclarationTerms.add(item.ingredientListName);
        }
      }
      allergens = [...new Set(allergens)];
      if (result.status === 'review_required') {
        allergenDeclarationReady = false;
        for (const item of result.unresolved) {
          const input = item.sourcePath ? inputForAllergenPath(item.sourcePath) : undefined;
          const actions = input ? [ingredientAction(input.ingredientId)] : [rootRecipe];
          if (item.status === 'final_food_evaluation') {
            pendingAllergens.add(item.allergenId);
            warnings.add(`${item.allergenId}: supplier evidence indicates it may be present; final-food conditions need review.`);
          } else if (item.status === 'conflict' || item.status === 'unknown' || item.status === 'exemption_review') {
            addMissing(
              `Resolve ${item.status === 'exemption_review' ? 'the possible exemption for' : 'uncertain allergen evidence for'} ${item.allergenId}`,
              'ingredients',
              ...actions,
            );
          } else if (item.status === 'missing' && item.sourcePath) {
            addMissing(`Confirm allergen information for ${item.allergenId}`, 'ingredients', ...actions);
          }
        }
        warnings.add('Unresolved allergen evidence or conditions remain; the Contains summary is withheld from the label draft.');
      }
    } catch (error) {
      addMissing(`Allergen information needs attention: ${error instanceof Error ? error.message : 'could not be read'}`, 'ingredients', rootRecipe);
    }
  }

  let declaration = '';
  const declarationTextSources: {
    ingredientId: string;
    field: 'name' | 'additiveName' | 'schedule7ClassName';
    additiveSourceId?: string;
  }[] = [];
  try {
    const ordered = orderIngredientDeclaration(nodesFor(product.formulationId, []));
    let declarationIngredients: readonly OrderedIngredientDeclarationNode[] = ordered.ingredients;
    let incompleteInfantCompound = false;
    if (infantFoodCandidate) {
      const leaves = new Map<string, IngredientDeclarationNode>();
      function collectIndividualIngredients(node: IngredientDeclarationNode): void {
        if (node.kind === 'compound') {
          if (node.compositionStatus !== 'complete' || node.children.length === 0) {
            incompleteInfantCompound = true;
            return;
          }
          node.children.forEach(collectIndividualIngredients);
          return;
        }
        const existing = leaves.get(node.ingredientId);
        leaves.set(node.ingredientId, existing
          ? {
            ...existing,
            mass: {
              value: sumDecimals([existing.mass.value, node.mass.value]),
              unit: 'g',
            },
          }
          : node);
      }
      ordered.ingredients.forEach(collectIndividualIngredients);
      if (incompleteInfantCompound) {
        addMissing(
          'Complete every compound ingredient composition before drafting the infant-food ingredient list',
          'ingredients',
          rootRecipe,
        );
      } else {
        declarationIngredients = orderIngredientDeclaration([...leaves.values()]).ingredients;
      }
    }
    const renderedIngredientIds = new Set<string>();
    function collectRenderedIngredientIds(node: OrderedIngredientDeclarationNode): void {
      renderedIngredientIds.add(node.ingredientId);
      node.children.forEach(collectRenderedIngredientIds);
    }
    declarationIngredients.forEach(collectRenderedIngredientIds);
    for (const [ingredientId, names] of allergenNamesByIngredientId) {
      if (!renderedIngredientIds.has(ingredientId)) {
        allergenDeclarationReady = false;
        addMissing(
          `Map ${[...names].join(', ')} to a component shown in the ingredient declaration`,
          'ingredients',
          ingredientAction(ingredientId),
          rootRecipe,
        );
      }
    }
    function render(node: OrderedIngredientDeclarationNode, depth: number): string {
      const candidates = additiveCandidates.get(node.ingredientId) ?? [];
      const additiveNote = candidates.length ? ` [additives to check: ${candidates.map((item) => item.text).join(', ')}]` : '';
      const direct = directAdditiveCandidates.get(node.ingredientId);
      if (!direct) declarationTextSources.push({ ingredientId: node.ingredientId, field: 'name' });
      for (const candidate of [...(direct ? [direct] : []), ...candidates]) {
        if (candidate.nameShown) declarationTextSources.push({
          ingredientId: node.ingredientId, field: 'additiveName', additiveSourceId: candidate.sourceId,
        });
        if (candidate.classShown) declarationTextSources.push({
          ingredientId: node.ingredientId, field: 'schedule7ClassName', additiveSourceId: candidate.sourceId,
        });
      }
      const baseName = direct?.text ?? node.displayName;
      const missingNames = [...(allergenNamesByIngredientId.get(node.ingredientId) ?? [])]
        .filter((name) => findBoldPhraseRanges(baseName, [name]).length === 0);
      const displayName = missingNames.length ? `${baseName} (${missingNames.join(', ')})` : baseName;
      if (!node.children.length) return displayName + additiveNote;
      const open = depth % 2 === 0 ? '[' : '(';
      const close = depth % 2 === 0 ? ']' : ')';
      return `${displayName} ${open}${node.children.map((child) => render(child, depth + 1)).join(', ')}${close}${additiveNote}`;
    }
    if (!missingIngredientNames && !missingCompoundRecipes && !incompleteInfantCompound) {
      declaration = declarationIngredients.map((node) => render(node, 0)).join(', ');
    }
  } catch (error) {
    additivesComplete = false;
    addMissing(`Recipe needs attention: ${error instanceof Error ? error.message : 'could not build the ingredient list'}`, 'recipe', rootRecipe, section('about'));
  }
  const inputs = product.additiveNameInputs;
  const needsSupportedAdditiveInputs = product.builderProductType !== 'other'
    && !inputs?.additiveCategoryId;
  if (hasAdditives && (!inputs || needsSupportedAdditiveInputs)) {
    additivesComplete = false;
    addMissing('Product additive and name information', 'additives', section('technical'));
  }
  if (allergenTrace.length) warnings.add('Allergen vocabulary and product applicability remain draft; verify them against the product and current Code before use.');
  if (allergens.length > 0 && !declaration) allergenDeclarationReady = false;
  const nutrition = makeNipDraft(product, formulations, ingredients, claims);
  const preparedNutrition = makePreparedNutritionDraft(product, formulations, ingredients, nutrition);
  const drainedNutrition = makeDrainedNutritionDraft(product, formulations, ingredients);
  const nutritionPanel = makeNutritionPanel(product, nutrition, preparedNutrition, drainedNutrition, includeDailyIntake);
  for (const item of nutritionPanel.missing) addMissing(`Nutrition panel: ${item}`, 'nutrition', section('nutrition'), section('directions'), section('pack'));
  for (const item of nutrition.missing) {
    if (item === 'The preparation basis needs review; prepared nutrition is not connected to this label yet'
      || item === 'The drained nutrition basis needs review; drained nutrition is not connected to this label yet'
      || (nutritionPanel.basis !== 'review' && nutritionPanel.basis !== 'asSold'
        && item === 'Nutrition is only supported for food as sold; preparation or processing needs consultant calculation')) continue;
    addMissing(item, 'nutrition', section('nutrition'), rootRecipe);
  }
  warnings.add('Draft only. Nutrition uses supplier data and NPC rounding; the rounding stage and all label content need consultant review.');
  return { missing: [...missing], issues: [...issues.values()], declaration, declarationTextSources, declarationInputs, pack: makePackDraft(product, labelPackCopy), allergens, allergenTrace, allergenEvidence: evidence,
    allergenDeclarationTerms: [...allergenDeclarationTerms], allergenDeclarationReady,
    pendingAllergens: [...pendingAllergens], warnings: [...warnings], additivesComplete, nutrition, nutritionPanel,
    ...(preparedNutrition ? { preparedNutrition } : {}),
    ...(drainedNutrition ? { drainedNutrition } : {}) };
}
