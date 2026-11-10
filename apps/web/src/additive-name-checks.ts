import {
  calculateAdditiveFinalConcentration,
  calculateProcessMassBalance,
  evaluateAdditivePermission,
  evaluateInfantSweetenedWord,
  expandFormulation,
  formatAdditiveDeclarationCandidate,
  identifyPrescribedNameCandidates,
  traceAdditiveSources,
} from '@aus-food/engine';
import type {
  AdditiveDeclarationCandidate,
  AdditiveFinalConcentration,
  AdditivePermissionEvaluationValue,
  AdditivePermissionFoodState,
  EngineResult,
  ExpandedAdditiveSource,
  InfantSweetenedWordValue,
  IngredientAdditiveSource,
  PrescribedNameCandidateValue,
  ProcessMassBalance,
} from '@aus-food/domain';
import type { FormulationRecord, IngredientRecord, ProductRecord } from '@aus-food/storage';
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
}

export interface AdditiveNameReport {
  readonly error?: string;
  readonly declarations: readonly DeclarationLine[];
  readonly additives: readonly AdditiveCheck[];
  readonly uncodedAdditives: readonly string[];
  readonly names?: EngineResult<PrescribedNameCandidateValue>;
  readonly sweetened?: EngineResult<InfantSweetenedWordValue>;
  readonly limitations: readonly string[];
}

// These evaluators exist in the engine but have no entry fields in the workspace yet.
export const NOT_WIRED_LIMITATIONS: readonly string[] = [
  'Same-purpose mixture, aggregate colour, carry-over and processing-aid checks are not run here. Treat them as REVIEW REQUIRED.',
  'Per-ingredient density evidence cannot be entered, so per-volume additive sources need review.',
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
): AdditiveNameReport {
  const inputs = product.additiveNameInputs;
  const base = { declarations: [], additives: [], uncodedAdditives: [], limitations: NOT_WIRED_LIMITATIONS } as const;
  let expanded;
  try {
    expanded = expandFormulation(product.formulationId, { value: '100', unit: 'g' }, formulations);
  } catch (error) {
    return { ...base, error: error instanceof Error ? error.message : 'The formulation could not be expanded.' };
  }

  const ingredientById = new Map(ingredients.map((item) => [item.id, item]));
  const sourcesByIngredient = new Map<string, readonly IngredientAdditiveSource[]>(
    ingredients.map((item) => [item.id, item.additiveSources ?? []]),
  );
  const traced = traceAdditiveSources(expanded, sourcesByIngredient);
  const nameOf = (id: string): string => ingredientById.get(id)?.name ?? id;

  const declarations = traced.map((item) => {
    const selection = item.source.declarationSelection;
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
  if (formulation?.processMassProfile) {
    processBalance = calculateProcessMassBalance(ingoing, formulation.processMassProfile);
  } else if (inputs?.noProcessMassChangeConfirmed) {
    processBalance = calculateProcessMassBalance(ingoing, { changes: [] });
  } else {
    processBalance = calculateProcessMassBalance(ingoing);
  }

  const evidence = inputs?.evidence;
  const additives = [...groupByCode(traced)].map(([codeNumber, group]): AdditiveCheck => {
    const concentration = calculateAdditiveFinalConcentration({
      additiveCodeNumber: codeNumber,
      foodState,
      outputUnit: inputs?.outputUnit ?? 'mg/kg',
      ingredients: expanded,
      sourcesByIngredient,
      processBalance,
      finalDensity: inputs?.finalDensity,
    });
    const purposes = [...new Set(group.flatMap((item) => item.source.technologicalPurposes ?? []))];
    const statuses = [...new Set(group.map((item) => item.source.sourceStatus))];
    const permission = evaluateAdditivePermission({
      catalog: permissionCatalog,
      rule: permissionRuleTrace(),
      confirmedCategoryId: inputs?.additiveCategoryId,
      additiveCodeNumber: codeNumber,
      technologicalPurpose: purposes.length === 1 ? purposes[0] : undefined,
      foodState,
      sourceStatus: statuses.length === 1 && statuses[0] ? statuses[0] : 'unknown',
      gmpConfirmed: inputs?.gmpConfirmed,
      finalConcentration: concentration.status === 'calculated'
        ? { value: concentration.value, unit: concentration.unit }
        : undefined,
      evidence,
      sourcePath: [product.id],
    });
    return {
      codeNumber,
      names: [...new Set(group.map((item) => item.source.additiveName))],
      concentration,
      permission,
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
  const sweetened = evaluateInfantSweetenedWord({
    rule: sweetenedRuleTrace(),
    ruleApproved: sweetenedRuleApproved(),
    confirmedCohorts: inputs?.confirmedCohorts,
    addedSugarsPer100g: inputs?.addedSugarsPer100g,
    sugarsBasisConfirmed: inputs?.sugarsBasisConfirmed,
    evidence,
    proposedName: product.name,
    sourcePath: [product.id],
  });

  return {
    declarations,
    additives,
    uncodedAdditives: traced.filter((item) => !item.source.codeNumber?.trim()).map((item) => item.source.additiveName),
    names,
    sweetened,
    limitations: NOT_WIRED_LIMITATIONS,
  };
}
