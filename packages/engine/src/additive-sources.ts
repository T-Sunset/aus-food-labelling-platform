import type {
  AllergenEvidenceSource,
  ExpandedAdditiveSource,
  ExpandedIngredient,
  IngredientAdditiveSource,
} from '@aus-food/domain';

export function traceAdditiveSources(
  expandedIngredients: readonly ExpandedIngredient[],
  sourcesByIngredient: ReadonlyMap<string, readonly IngredientAdditiveSource[]>,
): readonly ExpandedAdditiveSource[] {
  return expandedIngredients.flatMap((ingredient) =>
    (sourcesByIngredient.get(ingredient.ingredientId) ?? []).map((source) => ({
      ingredientId: ingredient.ingredientId,
      sourcePath: [...ingredient.sourcePath],
      source,
    })),
  );
}

export function traceAdditiveAllergenEvidence(
  expandedIngredients: readonly ExpandedIngredient[],
  sourcesByIngredient: ReadonlyMap<string, readonly IngredientAdditiveSource[]>,
): readonly AllergenEvidenceSource[] {
  const traced: AllergenEvidenceSource[] = [];
  for (const ingredient of expandedIngredients) {
    for (const source of sourcesByIngredient.get(ingredient.ingredientId) ?? []) {
      const assessments = source.allergenAssessments;
      if (assessments === undefined || Object.keys(assessments).length === 0) {
        continue;
      }
      const evidence = source.sourceEvidence?.[0];
      if (evidence === undefined) {
        throw new TypeError(
          `Additive source "${source.id}" has allergen assessments without dated evidence`,
        );
      }
      traced.push({
        id: `${source.id}:${evidence.id}:${ingredient.sourcePath.join(':')}`,
        subjectId: source.id,
        kind: 'additive',
        sourceId: evidence.reference,
        sourceDate: evidence.sourceDate,
        sourcePath: [...ingredient.sourcePath, 'additive-source', source.id],
        assessments,
      });
    }
  }
  return traced;
}
