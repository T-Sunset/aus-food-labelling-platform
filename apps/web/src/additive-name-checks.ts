import {
  calculateAdditiveFinalConcentration,
  calculateProcessMassBalance,
  evaluateAdditivePermission,
  evaluateInfantSweetenedWord,
  expandFormulation,
  formatAdditiveDeclarationCandidate,
  identifyPrescribedNameCandidates,
  illustrateAdditivePermission,
  illustrateInfantSweetenedWord,
  traceAdditiveSources,
} from '@aus-food/engine';
import type {
  AdditiveDeclarationCandidate,
  AdditiveFinalConcentration,
  AdditivePermissionEvaluationInput,
  AdditivePermissionEvaluationValue,
  AdditivePermissionFoodState,
  EngineResult,
  ExpandedAdditiveSource,
  IllustrativeResult,
  InfantSweetenedWordInput,
  InfantSweetenedWordValue,
  IngredientAdditiveSource,
  PrescribedNameCandidateValue,
  ProcessMassBalance,
} from '@aus-food/domain';
import type { FormulationRecord, IngredientRecord, LabelAdditiveWording, ProductRecord } from '@aus-food/storage';
import { additiveIngredientsInRecipe, additiveSourcesInRecipe, expandAdditiveIngredients } from './ingredient-additives';
import { labelAdditiveSelection } from './label-additive-wording';
import {
  nameRuleTrace,
  nameRules,
  permissionCatalog,
  permissionRuleTrace,
  sweetenedRuleApproved,
  sweetenedRuleTrace,
} from './rule-data';

export interface DeclarationLine {
  readonly ingredientName: string;
  readonly additiveName: string;
  readonly candidate: AdditiveDeclarationCandidate;
}

export interface AdditiveCheck {
  readonly codeNumber: string;
  readonly names: readonly string[];
  readonly concentration: AdditiveFinalConcentration;
  readonly permission: EngineResult<AdditivePermissionEvaluationValue>;
  readonly preview?: IllustrativeResult<AdditivePermissionEvaluationValue>;
}

export interface AdditiveNameReport {
  readonly error?: string;
  readonly declarations: readonly DeclarationLine[];
  readonly additives: readonly AdditiveCheck[];
  readonly uncodedAdditives: readonly string[];
  readonly names?: EngineResult<PrescribedNameCandidateValue>;
  readonly sweetened?: EngineResult<InfantSweetenedWordValue>;
  readonly sweetenedPreview?: IllustrativeResult<InfantSweetenedWordValue>;
  readonly limitations: readonly string[];
}

// These evaluators exist in the engine but have no entry fields in the workspace yet.
export const NOT_WIRED_LIMITATIONS: readonly string[] = [
  'Same-purpose mixture, aggregate colour, carry-over and processing-aid checks are not run here. Treat them as REVIEW REQUIRED.',
  'Direct additive ingredients use their recorded recipe use where supplied; otherwise they are normally treated as added. Carry-over and processing-aid eligibility are not assessed.',
  'Concentrations are calculated for a 100 g ingoing formulation and use the declared figures only; nothing is assumed.',
];

const PERMISSION_FOOD_STATES: readonly string[] = ['asSold', 'asPrepared', 'asReconstituted', 'asDrained'];

function groupByCode(sources: readonly ExpandedAdditiveSource[]): Map<string, ExpandedAdditiveSource[]> {
  const groups = new Map<string, ExpandedAdditiveSource[]>();
  for (const item of sources) {
    const code = item.source.codeNumber?.trim();
    if (code) {
      groups.set(code, [...(groups.get(code) ?? []), item]);
    }
  }
  return groups;
}

export function buildAdditiveNameReport(
  product: ProductRecord,
  formulations: readonly FormulationRecord[],
  ingredients: readonly IngredientRecord[],
  illustrative = false,
  additiveWording: readonly LabelAdditiveWording[] = [],
): AdditiveNameReport {
  const inputs = product.additiveNameInputs;
  const inspection = additiveIngredientsInRecipe(product.formulationId, formulations, ingredients);
  let expanded: ReturnType<typeof expandFormulation> = [];
  let errorMessage: string | undefined;
  try {
    expanded = expandFormulation(product.formulationId, { value: '100', unit: 'g' }, formulations);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'The formulation could not be expanded.';
    const messages = inspection.issues.get('FORMULATION_AMOUNTS_MISSING') ?? new Set<string>();
    messages.add(errorMessage);
    inspection.issues.set('FORMULATION_AMOUNTS_MISSING', messages);
  }

  const ingredientById = new Map(ingredients.map((item) => [item.id, item]));
  const invalidUse = inspection.issues.get('SOURCE_IDENTITY_MISSING');
  if (invalidUse) errorMessage = [...invalidUse].join(' ');
  const limitations = [...NOT_WIRED_LIMITATIONS, ...[...inspection.issues.values()].flatMap((messages) => [...messages])];
  if (inspection.hasProcessChanges) {
    limitations.push('A recipe has recorded processing details. Their effect on additive concentrations is not yet calculated and needs review.');
  }
  const sourcesByIngredient = new Map<string, readonly IngredientAdditiveSource[]>(
    ingredients.map((item) => [item.id, additiveSourcesInRecipe(item)]),
  );
  const directSourceIdByIngredient = new Map(ingredients.flatMap((item) =>
    item.directAdditiveSourceId ? [[item.id, item.directAdditiveSourceId] as const] : []));
  const traced = traceAdditiveSources(inspection.references, sourcesByIngredient, directSourceIdByIngredient);
  const nameOf = (id: string): string => ingredientById.get(id)?.name ?? id;

  const declarations = traced.map((item) => {
    const selection = labelAdditiveSelection(item.ingredientId, item.source, additiveWording);
    return {
      ingredientName: nameOf(item.ingredientId),
      additiveName: item.source.additiveName,
      candidate: formatAdditiveDeclarationCandidate({
        route: selection?.route ?? 'unknown',
        additiveName: item.source.additiveName,
        ...(item.source.codeNumber ? { codeNumber: item.source.codeNumber } : {}),
        ...(selection?.schedule7ClassName ? { schedule7ClassName: selection.schedule7ClassName } : {}),
        ...(selection?.substanceChoice ? { substanceChoice: selection.substanceChoice } : {}),
        ...(selection?.flavouringWording ? { flavouringWording: selection.flavouringWording } : {}),
        ingredientId: item.ingredientId,
        sourcePath: item.sourcePath,
      }),
    };
  });

  const foodState = PERMISSION_FOOD_STATES.includes(product.foodState ?? '')
    ? (product.foodState as AdditivePermissionFoodState)
    : undefined;
  const formulation = formulations.find((item) => item.id === product.formulationId);
  const ingoing = { value: '100', unit: 'g' } as const;
  let processBalance: ProcessMassBalance;
  if (inspection.hasProcessChanges) {
    processBalance = { status: 'review_required', reason: 'PROCESSING_EFFECTS_UNSUPPORTED', ingoingMass: ingoing };
  } else if (formulation?.processMassProfile) {
    processBalance = calculateProcessMassBalance(ingoing, { changes: [] });
  } else if (inputs?.noProcessMassChangeConfirmed) {
    processBalance = calculateProcessMassBalance(ingoing, { changes: [] });
  } else {
    processBalance = calculateProcessMassBalance(ingoing);
  }

  const evidence = inputs?.evidence;
  const additiveIngredients = inspection.issues.size === 0
    ? expandAdditiveIngredients(product.formulationId, formulations, ingredients) : [];
  const additives = [...groupByCode(traced)].map(([codeNumber, group]): AdditiveCheck => {
    const concentration: AdditiveFinalConcentration = inspection.issues.size > 0
      ? {
          status: 'review_required',
          reasons: [...inspection.issues.keys(), ...(inspection.hasProcessChanges ? ['PROCESSING_EFFECTS_UNSUPPORTED' as const] : [])],
          detail: [
            ...[...inspection.issues.values()].flatMap((messages) => [...messages]),
            ...(inspection.hasProcessChanges ? ['The effect of the recorded processing change on additives needs review.'] : []),
          ],
        }
      : calculateAdditiveFinalConcentration({
      additiveCodeNumber: codeNumber,
      foodState,
      outputUnit: inputs?.outputUnit ?? 'mg/kg',
      ingredients: additiveIngredients,
      sourcesByIngredient,
      directSourceIdByIngredient,
      processBalance,
      ingredientDensities: new Map(ingredients.flatMap((item) =>
        item.ingredientDensity ? [[item.id, item.ingredientDensity] as const] : [])),
      finalDensity: inputs?.finalDensity,
    });
    const purposes = [...new Set(group.flatMap((item) => item.source.technologicalPurposes ?? []))];
    const statuses = [...new Set(group.map((item) => item.source.sourceStatus))];
    const permissionInput: AdditivePermissionEvaluationInput = {
      catalog: permissionCatalog,
      rule: permissionRuleTrace(),
      confirmedCategoryId: inputs?.additiveCategoryId,
      additiveCodeNumber: codeNumber,
      technologicalPurpose: purposes.length === 1 ? purposes[0] : undefined,
      foodState,
      sourceStatus: statuses.length === 1 && statuses[0] ? statuses[0] : 'unknown',
      gmpConfirmed: inputs?.gmpConfirmed,
      finalConcentration: concentration.status === 'calculated'
        ? { value: concentration.value, unit: concentration.unit, calculatedAs: concentration.calculatedAs }
        : undefined,
      evidence,
      sourcePath: [product.id],
    };
    const permission = evaluateAdditivePermission(permissionInput);
    return {
      codeNumber,
      names: [...new Set(group.map((item) => item.source.additiveName))],
      concentration,
      permission,
      ...(illustrative ? { preview: illustrateAdditivePermission(permission, permissionInput) } : {}),
    };
  });

  const names = identifyPrescribedNameCandidates({
    rule: nameRuleTrace(),
    catalogRules: nameRules,
    confirmedCohorts: inputs?.confirmedCohorts,
    proposedName: product.name,
    ingredientNames: expanded.map((item) => nameOf(item.ingredientId)),
    sourcePath: [product.id],
  });
  const sweetenedInput: InfantSweetenedWordInput = {
    rule: sweetenedRuleTrace(),
    ruleApproved: sweetenedRuleApproved(),
    confirmedCohorts: inputs?.confirmedCohorts,
    addedSugarsPer100g: inputs?.addedSugarsPer100g,
    sugarsBasisConfirmed: inputs?.sugarsBasisConfirmed,
    evidence,
    proposedName: product.name,
    sourcePath: [product.id],
  };
  const sweetened = evaluateInfantSweetenedWord(sweetenedInput);

  return {
    ...(errorMessage ? { error: errorMessage } : {}),
    declarations,
    additives,
    uncodedAdditives: traced
      .filter((item) => !item.source.codeNumber?.trim() && item.source.declarationSelection?.route !== 'addedCaffeine')
      .map((item) => item.source.additiveName),
    ...(!errorMessage ? { names, sweetened } : {}),
    ...(illustrative && !errorMessage ? { sweetenedPreview: illustrateInfantSweetenedWord(sweetened, sweetenedInput) } : {}),
    limitations,
  };
}
