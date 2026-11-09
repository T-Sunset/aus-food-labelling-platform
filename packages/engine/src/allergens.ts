import type {
  AllergenEvidenceSource,
  AllergenEvidenceStatus,
  AllergenPropagationResult,
  AllergenVocabularyEntry,
  PropagatedAllergen,
} from '@aus-food/domain';

type UnresolvedAllergen = {
  readonly sourceId?: string;
  readonly allergenId: string;
  readonly status: AllergenEvidenceStatus | 'missing' | 'final_food_evaluation';
  readonly sourcePath?: readonly string[];
};

function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

export function propagateAllergens(
  sources: readonly AllergenEvidenceSource[],
  vocabulary: readonly AllergenVocabularyEntry[],
  sourceCoverage: 'complete' | 'incomplete',
): AllergenPropagationResult {
  if (vocabulary.length === 0) {
    throw new RangeError('Allergen vocabulary must not be empty');
  }

  const vocabularyById = new Map<string, AllergenVocabularyEntry>();
  for (const allergen of vocabulary) {
    if (
      !isNonEmpty(allergen.id)
      || !isNonEmpty(allergen.ingredientListName)
      || !isNonEmpty(allergen.summaryName)
    ) {
      throw new TypeError('Allergen vocabulary entries must include IDs and required names');
    }
    if (vocabularyById.has(allergen.id)) {
      throw new TypeError(`Duplicate allergen vocabulary identifier "${allergen.id}"`);
    }
    vocabularyById.set(allergen.id, allergen);
  }

  const sourceIds = new Set<string>();
  const observed = new Map<string, Set<AllergenEvidenceStatus>>();
  const presentByAllergen = new Map<string, Set<string>>();
  const unresolved: UnresolvedAllergen[] = [];

  if (sourceCoverage === 'incomplete') {
    for (const allergen of vocabulary) {
      unresolved.push({
        allergenId: allergen.id,
        status: 'missing',
      });
    }
  }

  for (const source of sources) {
    if (
      !isNonEmpty(source.id)
      || !isNonEmpty(source.subjectId)
      || !isNonEmpty(source.sourceId)
      || !isNonEmpty(source.sourceDate)
      || source.sourcePath.length === 0
      || !source.sourcePath.every(isNonEmpty)
    ) {
      throw new TypeError('Allergen evidence sources must include provenance and a source path');
    }
    if (sourceIds.has(source.id)) {
      throw new TypeError(`Duplicate allergen evidence source identifier "${source.id}"`);
    }
    sourceIds.add(source.id);

    for (const allergenId of Object.keys(source.assessments)) {
      if (!vocabularyById.has(allergenId)) {
        throw new TypeError(`Unknown allergen vocabulary identifier "${allergenId}"`);
      }
    }

    for (const allergen of vocabulary) {
      const status = source.assessments[allergen.id];
      if (status === undefined) {
        unresolved.push({
          sourceId: source.sourceId,
          allergenId: allergen.id,
          status: 'missing',
          sourcePath: source.sourcePath,
        });
        continue;
      }

      const observationKey = `${source.subjectId}\u0000${allergen.id}`;
      const statuses = observed.get(observationKey) ?? new Set<AllergenEvidenceStatus>();
      statuses.add(status);
      observed.set(observationKey, statuses);

      if (status === 'present' && allergen.requiresFinalFoodEvaluation) {
        unresolved.push({
          sourceId: source.sourceId,
          allergenId: allergen.id,
          status: 'final_food_evaluation',
          sourcePath: source.sourcePath,
        });
      } else if (status === 'present') {
        const sourceIdsForAllergen = presentByAllergen.get(allergen.id) ?? new Set<string>();
        sourceIdsForAllergen.add(source.id);
        presentByAllergen.set(allergen.id, sourceIdsForAllergen);
      } else if (status === 'unknown' || status === 'exemption_review' || status === 'conflict') {
        unresolved.push({
          sourceId: source.sourceId,
          allergenId: allergen.id,
          status,
          sourcePath: source.sourcePath,
        });
      }
    }
  }

  for (const [observationKey, statuses] of observed) {
    if (statuses.size < 2) {
      continue;
    }

    const [subjectId, allergenId] = observationKey.split('\u0000');
    if (subjectId === undefined || allergenId === undefined) {
      throw new Error('Allergen observation key was malformed');
    }
    const conflictingSources = sources.filter(
      (source) =>
        source.subjectId === subjectId
        && source.assessments[allergenId] !== undefined,
    );
    for (const source of conflictingSources) {
      unresolved.push({
        sourceId: source.sourceId,
        allergenId,
        status: 'conflict',
        sourcePath: source.sourcePath,
      });
    }
  }

  const allergens: PropagatedAllergen[] = [];
  for (const allergen of vocabulary) {
    const sourceIdsForAllergen = presentByAllergen.get(allergen.id);
    if (sourceIdsForAllergen === undefined) {
      continue;
    }

    const sourcePaths = sources
      .filter((source) => sourceIdsForAllergen.has(source.id))
      .map((source) => source.sourcePath);
    allergens.push({
      id: allergen.id,
      ingredientListName: allergen.ingredientListName,
      summaryName: allergen.summaryName,
      sourcePaths,
    });
  }

  return unresolved.length > 0
    ? {
        status: 'review_required',
        reason: 'INCOMPLETE_ALLERGEN_EVIDENCE',
        allergens,
        unresolved,
      }
    : { status: 'propagated', allergens };
}
