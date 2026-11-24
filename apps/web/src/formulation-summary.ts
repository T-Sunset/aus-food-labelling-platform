import { compareDecimals, convertMass, divideDecimals, expandFormulation, FormulationExpansionError, formatAdditiveDeclarationCandidate, multiplyDecimals, plainDecimal, sumDecimals, traceAdditiveSources } from '@aus-food/engine';
import type { AllergenEvidenceStatus, ExpandedIngredient } from '@aus-food/domain';
import type { FormulationRecord, IngredientRecord } from '@aus-food/storage';
import { additiveIngredientsInRecipe, additiveSourcesInRecipe, expandAdditiveIngredients } from './ingredient-additives';
import { currentAdditiveCoverage, currentAllergenCoverage } from './ingredient-form';
import { draftFromFormulation } from './formulation-form';
import { calculateIngoingNutritionRow, compareNutritionBases, nutritionRows } from './nip-draft';
import { expandNutritionComponents } from './nutrition-components';
import { allergenChoices } from './rule-data';

export function makeFormulationSummary(
  recipe: FormulationRecord,
  formulations: readonly FormulationRecord[],
  ingredients: readonly IngredientRecord[],
) {
  const ingredientById = new Map(ingredients.map((item) => [item.id, item]));
  const recipeById = new Map(formulations.map((item) => [item.id, item]));
  const names = new Map([...formulations.map((item) => [item.id, item.name] as const),
    ...ingredients.map((item) => [item.id, item.name] as const)]);
  const pathName = (path: readonly string[]) => path.flatMap((id) => {
    const name = names.get(id);
    return name ? [name] : [];
  }).join(' → ');
  const expansionMessage = (error: unknown) => {
    if (error instanceof FormulationExpansionError && error.code === 'PARTIAL_COMPOSITION') {
      const path = pathName(error.referencePath);
      return `Some amounts are unknown or an ingredient list is incomplete${path ? ` (${path})` : ''}. Enter the missing amounts or complete the ingredient list.`;
    }
    return error instanceof Error ? error.message : 'The recipe amounts could not be calculated.';
  };
  const lines = draftFromFormulation(recipe).lines.map((line) => ({
    id: line.id,
    name: line.kind === 'ingredient'
      ? ingredientById.get(line.targetId)?.name ?? `Missing ingredient (${line.targetId})`
      : recipeById.get(line.targetId)?.name ?? `Missing recipe (${line.targetId})`,
    amount: line.quantity ? `${line.quantity} ${line.unit}` : 'Amount not entered',
    kind: line.kind,
    additiveUse: line.additiveUse,
  }));
  const inspection = additiveIngredientsInRecipe(recipe.id, formulations, ingredients);
  const sourcesByIngredient = new Map(ingredients.map((item) => [item.id, additiveSourcesInRecipe(item)]));
  const directIds = new Map(ingredients.flatMap((item) =>
    item.directAdditiveSourceId ? [[item.id, item.directAdditiveSourceId] as const] : []));
  const additiveSources = traceAdditiveSources(inspection.references, sourcesByIngredient, directIds).map((item) => {
    const selection = item.source.declarationSelection;
    const candidate = formatAdditiveDeclarationCandidate({
      route: selection?.route ?? 'unknown', additiveName: item.source.additiveName,
      ...(item.source.codeNumber ? { codeNumber: item.source.codeNumber } : {}),
      ...(selection?.schedule7ClassName ? { schedule7ClassName: selection.schedule7ClassName } : {}),
      ...(selection?.substanceChoice ? { substanceChoice: selection.substanceChoice } : {}),
      ...(selection?.flavouringWording ? { flavouringWording: selection.flavouringWording } : {}),
      ingredientId: item.ingredientId, sourcePath: item.sourcePath,
    });
    return { ...item, path: pathName(item.sourcePath), candidate };
  });
  const allergenNames = new Map(allergenChoices.map((item) => [item.id, item.label]));
  const allergenDetails: { name: string; status: AllergenEvidenceStatus; path: string; source?: string }[] = [];
  const allergenGaps = new Set<string>();
  const additiveGaps = new Set<string>();
  if (!inspection.references.length) {
    allergenGaps.add('Add ingredients before checking allergens.');
    additiveGaps.add('Add ingredients before checking additives.');
  }
  const recordAssessments = (
    assessments: Readonly<Record<string, AllergenEvidenceStatus>>,
    path: string,
    source?: string,
  ) => {
    for (const [id, status] of Object.entries(assessments)) {
      allergenDetails.push({ name: allergenNames.get(id) ?? id, status, path, ...(source ? { source } : {}) });
    }
  };
  for (const reference of inspection.references) {
    const ingredient = ingredientById.get(reference.ingredientId);
    if (!ingredient) {
      allergenGaps.add(`An ingredient is missing (${reference.ingredientId}).`);
      additiveGaps.add(`An ingredient is missing (${reference.ingredientId}).`);
      continue;
    }
    const path = pathName(reference.sourcePath);
    if (!currentAllergenCoverage(ingredient)) allergenGaps.add(`${ingredient.name}: confirm its allergen information.`);
    if (ingredient.kind !== 'compound' && !currentAdditiveCoverage(ingredient)) {
      additiveGaps.add(`${ingredient.name}: confirm its additive information.`);
    }
    const observed = new Map<string, Set<AllergenEvidenceStatus>>();
    for (const evidence of ingredient.allergenEvidence ?? []) {
      const source = [evidence.sourceId, evidence.sourceDate].filter(Boolean).join(' · ');
      const position = evidence.sourcePath.indexOf(ingredient.id);
      const evidencePath = position < 0 ? path : pathName([...reference.sourcePath, ...evidence.sourcePath.slice(position + 1)]);
      recordAssessments(evidence.assessments, evidencePath, source);
      for (const [id, status] of Object.entries(evidence.assessments)) {
        const key = JSON.stringify([evidence.subjectId, id]);
        const statuses = observed.get(key) ?? new Set<AllergenEvidenceStatus>();
        statuses.add(status);
        observed.set(key, statuses);
      }
    }
    if ([...observed.values()].some((statuses) => statuses.size > 1)) {
      allergenGaps.add(`${ingredient.name}: recorded allergen information conflicts; check the ingredient.`);
    }
    for (const source of ingredient.additiveSources ?? []) {
      const evidence = source.sourceEvidence?.[0];
      recordAssessments(source.allergenAssessments ?? {}, `${path} → ${source.additiveName}`,
        evidence ? [evidence.reference, evidence.sourceDate].filter(Boolean).join(' · ') : undefined);
    }
  }
  if (inspection.issues.has('COMPOUND_ADDITIVES_NOT_PROPAGATED') || inspection.missingRecipeIds.size) {
    allergenGaps.add('A linked recipe or compound ingredient is incomplete; check its ingredients.');
    additiveGaps.add('A linked recipe or compound ingredient is incomplete; check its ingredients.');
  }
  if (recipe.supplierComposition?.coverage === 'partial') {
    allergenGaps.add('This ingredient list is incomplete; other allergens may be present.');
    additiveGaps.add('This ingredient list is incomplete; other additives may be present.');
  }
  if (inspection.issues.has('SOURCE_IDENTITY_MISSING')) {
    additiveGaps.add('A recorded additive use no longer matches an additive ingredient; check the recipe.');
  }
  if (inspection.issues.has('COMPOUND_ADDITIVE_EVIDENCE_OVERLAP')) {
    additiveGaps.add('Additives recorded on a compound ingredient may overlap its components.');
  }

  let expanded: readonly ExpandedIngredient[] = [];
  let expansionIssue = '';
  let batchMass: string | undefined;
  let breakdown: { name: string; amount: string; path: string }[] = [];
  let breakdownIssue = '';
  try {
    expanded = expandFormulation(recipe.id, { value: '100', unit: 'g' }, formulations);
    batchMass = sumDecimals(recipe.lines.map((line) => convertMass(line.quantity, 'g').value));
    try {
      breakdown = expandAdditiveIngredients(recipe.id, formulations, ingredients).map((item) => ({
        name: ingredientById.get(item.ingredientId)?.name ?? `Missing ingredient (${item.ingredientId})`,
        amount: `${plainDecimal(item.mass.value)} g`, path: pathName(item.sourcePath),
      }));
    } catch (error) {
      breakdownIssue = `Some compound ingredients cannot be expanded: ${expansionMessage(error)}`;
      breakdown = expanded.map((item) => ({
        name: ingredientById.get(item.ingredientId)?.name ?? `Missing ingredient (${item.ingredientId})`,
        amount: `${plainDecimal(item.mass.value)} g`, path: pathName(item.sourcePath),
      }));
    }
  } catch (error) {
    expansionIssue = expansionMessage(error);
  }

  let nutritionComponents: readonly ExpandedIngredient[] = [];
  let nutritionIssue = expansionIssue;
  if (!nutritionIssue) {
    try {
      nutritionComponents = expandNutritionComponents(expanded, formulations, ingredients, recipe.id);
      if (!nutritionComponents.length) nutritionIssue = 'Add ingredients and amounts to calculate an estimate.';
    } catch (error) {
      nutritionIssue = error instanceof Error ? error.message : 'The nutrition estimate could not be calculated.';
    }
  }
  const nutrition = nutritionRows.map((row) => {
    if (nutritionIssue) return { label: row.label.trim(), value: 'Not available', batch: 'Not available', missing: [], sources: [] };
    try {
      const result = calculateIngoingNutritionRow(row, nutritionComponents, ingredientById);
      const conflicts = nutritionComponents.flatMap((item) => {
        const ingredient = ingredientById.get(item.ingredientId);
        const conflict = ingredient && compareNutritionBases(ingredient, row.id);
        return conflict ? [conflict] : [];
      });
      const available = result.value !== undefined && !conflicts.length;
      const batch = available && batchMass && result.value !== undefined
        ? divideDecimals(multiplyDecimals(result.value, batchMass), '100') : undefined;
      const batchUsable = batch !== undefined && result.value !== undefined
        && !(compareDecimals(result.value, '0') > 0 && compareDecimals(batch, '0') === 0);
      const batchIssue = batch !== undefined && !batchUsable
        ? [`${row.label.trim()}: the batch total needs greater calculation precision.`] : [];
      return {
        label: row.label.trim(),
        value: available && result.value !== undefined ? `${plainDecimal(result.value)} ${row.unit}` : 'Not available',
        batch: batchUsable && batch !== undefined ? `${plainDecimal(batch)} ${row.unit}` : 'Not available',
        missing: [...new Set([...result.missing, ...conflicts, ...batchIssue])],
        sources: result.sources.map((source) => ({
          ...source, path: pathName(source.sourcePath),
        })),
      };
    } catch (error) {
      return {
        label: row.label.trim(), value: 'Not available', batch: 'Not available',
        missing: [`Check the ${row.label.trim().toLowerCase()} data: ${error instanceof Error ? error.message : 'invalid data'}`],
        sources: [],
      };
    }
  });
  return {
    lines, breakdown, breakdownIssue, expansionIssue, nutrition, nutritionIssue,
    allergens: allergenDetails.filter((item) => item.status !== 'absent'),
    allergenDetails, allergenGaps: [...allergenGaps], additiveSources, additiveGaps: [...additiveGaps],
  };
}
