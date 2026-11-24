import { expandFormulation } from '@aus-food/engine';
import type { AdditiveConcentrationReviewReason, ExpandedIngredient } from '@aus-food/domain';
import type { FormulationRecord } from '@aus-food/storage';
import type { IngredientRecord } from '@aus-food/storage';
import { currentAdditiveCoverage } from './ingredient-form';
import { processEffectsNeedReview } from './formulation-form';

export function additiveSourcesInRecipe(record: IngredientRecord): NonNullable<IngredientRecord['additiveSources']> {
  return (record.additiveSources ?? []).map((source) =>
    source.id === record.directAdditiveSourceId && source.sourceStatus === 'unknown'
      ? { ...source, sourceStatus: 'added' }
      : source,
  );
}

type IngredientReference = Pick<ExpandedIngredient, 'ingredientId' | 'sourcePath' | 'additiveUse'>;

export function additiveIngredientsInRecipe(
  rootId: string,
  formulations: readonly FormulationRecord[],
  ingredients: readonly IngredientRecord[],
) {
  const recipes = new Map(formulations.map((item) => [item.id, item]));
  const records = new Map(ingredients.map((item) => [item.id, item]));
  const references: IngredientReference[] = [];
  const issues = new Map<AdditiveConcentrationReviewReason, Set<string>>();
  const missingRecipeIds = new Set<string>();
  let hasProcessChanges = false;
  const issue = (reason: AdditiveConcentrationReviewReason, message: string): void => {
    const messages = issues.get(reason) ?? new Set<string>();
    messages.add(message);
    issues.set(reason, messages);
  };

  function visitRecipe(id: string, path: readonly string[], stack: readonly string[]): void {
    const key = `recipe:${id}`;
    if (stack.includes(key)) {
      issue('COMPOUND_ADDITIVES_NOT_PROPAGATED', `Circular recipe reference: ${path.join(' > ')}.`);
      return;
    }
    const recipe = recipes.get(id);
    if (!recipe) {
      missingRecipeIds.add(id);
      issue('COMPOUND_ADDITIVES_NOT_PROPAGATED', `Recipe ${id} is missing.`);
      return;
    }
    if (processEffectsNeedReview(recipe.processMassProfile)) hasProcessChanges = true;
    if (recipe.supplierComposition?.coverage === 'partial') {
      issue('COMPOUND_ADDITIVES_NOT_PROPAGATED', `${recipe.name}: the composition is partial.`);
    }
    if (!recipe.lines.length || recipe.supplierComposition?.unquantifiedComponents.length
      || recipe.incompleteRecipeLines?.unquantifiedLines.length) {
      issue('FORMULATION_AMOUNTS_MISSING', `${recipe.name}: ingredient amounts are incomplete.`);
    }
    for (const line of [...recipe.lines, ...(recipe.supplierComposition?.unquantifiedComponents ?? []),
      ...(recipe.incompleteRecipeLines?.unquantifiedLines ?? [])]) {
      if (line.kind === 'formulation') {
        visitRecipe(line.formulationId, [...path, line.id, line.formulationId], [...stack, key]);
        continue;
      }
      const sourcePath = [...path, line.id, line.ingredientId];
      const reference: IngredientReference = {
        ingredientId: line.ingredientId, sourcePath,
        ...(line.additiveUse ? { additiveUse: line.additiveUse } : {}),
      };
      const record = records.get(line.ingredientId);
      if (!record) {
        issue('ADDITIVE_COVERAGE_INCOMPLETE', `Ingredient ${line.ingredientId} is missing.`);
        references.push({ ingredientId: line.ingredientId, sourcePath });
        continue;
      }
      if (line.additiveUse && (!record.directAdditiveSourceId
        || !record.additiveSources?.some((source) => source.id === record.directAdditiveSourceId))) {
        issue('SOURCE_IDENTITY_MISSING', `${record.name}: its saved additive use needs review because it is no longer identified as an additive.`);
        references.push({ ingredientId: line.ingredientId, sourcePath });
      } else {
        references.push(reference);
      }
      if (record.kind !== 'compound') {
        if (!currentAdditiveCoverage(record)) {
          issue('ADDITIVE_COVERAGE_INCOMPLETE', `${record.name}: additive information is not confirmed.`);
        }
        continue;
      }
      const ingredientKey = `ingredient:${record.id}`;
      if (stack.includes(ingredientKey)) {
        issue('COMPOUND_ADDITIVES_NOT_PROPAGATED', `${record.name}: circular composition needs review.`);
        continue;
      }
      const composition = record.compoundFormulationId && recipes.get(record.compoundFormulationId);
      if (!composition) {
        if (record.compoundFormulationId) missingRecipeIds.add(record.compoundFormulationId);
        issue('COMPOUND_ADDITIVES_NOT_PROPAGATED', `${record.name}: the compound composition is missing.`);
        continue;
      }
      if (composition.supplierComposition?.coverage !== 'complete') {
        issue('COMPOUND_ADDITIVES_NOT_PROPAGATED', `${record.name}: the compound composition is not confirmed complete.`);
      }
      if (record.additiveSources?.length) {
        issue('COMPOUND_ADDITIVE_EVIDENCE_OVERLAP', `${record.name}: additive information on the compound may overlap its components.`);
      }
      visitRecipe(composition.id, [...sourcePath, composition.id], [...stack, key, ingredientKey]);
    }
  }

  visitRecipe(rootId, [rootId], []);
  return { references, issues, hasProcessChanges, missingRecipeIds };
}

export function expandAdditiveIngredients(
  rootId: string,
  formulations: readonly FormulationRecord[],
  ingredients: readonly IngredientRecord[],
): ExpandedIngredient[] {
  const records = new Map(ingredients.map((item) => [item.id, item]));
  function visit(item: ExpandedIngredient): ExpandedIngredient[] {
    const record = records.get(item.ingredientId);
    if (record?.kind !== 'compound') return [item];
    if (!record.compoundFormulationId) throw new Error(`${record.name}: the compound composition is missing.`);
    return expandFormulation(record.compoundFormulationId, item.mass, formulations)
      .flatMap((child) => visit({ ...child, sourcePath: [...item.sourcePath, ...child.sourcePath] }));
  }
  return expandFormulation(rootId, { value: '100', unit: 'g' }, formulations).flatMap(visit);
}
