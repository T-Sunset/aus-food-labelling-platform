import type {
  AllergenEvidenceSource,
  ExpandedAdditiveSource,
  ExpandedIngredient,
  IngredientAdditiveSource,
} from '@aus-food/domain';

type AdditiveIngredientReference = Pick<ExpandedIngredient, 'ingredientId' | 'sourcePath' | 'additiveUse'>;

export function additiveSourceForUse(
  ingredient: AdditiveIngredientReference,
  source: IngredientAdditiveSource,
  directSourceIdByIngredient?: ReadonlyMap<string, string>,
): IngredientAdditiveSource {
  if (ingredient.additiveUse && directSourceIdByIngredient?.get(ingredient.ingredientId) === source.id) {
    return { ...source, sourceStatus: ingredient.additiveUse };
  }
  return source;
}

export function traceAdditiveSources(
  expandedIngredients: readonly AdditiveIngredientReference[],
  sourcesByIngredient: ReadonlyMap<string, readonly IngredientAdditiveSource[]>,
  directSourceIdByIngredient?: ReadonlyMap<string, string>,
): readonly ExpandedAdditiveSource[] {
  for (const ingredient of expandedIngredients) {
    const directId = directSourceIdByIngredient?.get(ingredient.ingredientId);
    if (ingredient.additiveUse && (!directId
      || !(sourcesByIngredient.get(ingredient.ingredientId) ?? []).some((source) => source.id === directId))) {
      throw new Error(`The direct additive source is missing for ingredient "${ingredient.ingredientId}".`);
    }
  }
  return expandedIngredients.flatMap((ingredient) =>
    (sourcesByIngredient.get(ingredient.ingredientId) ?? []).map((source) => ({
      ingredientId: ingredient.ingredientId,
      sourcePath: [...ingredient.sourcePath],
      source: additiveSourceForUse(ingredient, source, directSourceIdByIngredient),
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
      traced.push({
        id: `${source.id}:${evidence?.id ?? 'unsourced'}:${ingredient.sourcePath.join(':')}`,
        subjectId: source.id,
        kind: 'additive',
        sourceId: evidence?.reference ?? '',
        sourceDate: evidence?.sourceDate ?? '',
        sourcePath: [...ingredient.sourcePath, 'additive-source', source.id],
        assessments,
      });
    }
  }
  return traced;
}
