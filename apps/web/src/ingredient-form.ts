import type { IngredientRecord } from '@aus-food/storage';

type AdditiveSource = NonNullable<IngredientRecord['additiveSources']>[number];
type Concentration = NonNullable<AdditiveSource['concentration']>;
type DeclarationSelection = NonNullable<AdditiveSource['declarationSelection']>;
type EvidenceKind = NonNullable<AdditiveSource['sourceEvidence']>[number]['kind'];
type NutrientValues = NonNullable<IngredientRecord['nutrientProfile']>['values'];
type AllergenEvidence = NonNullable<IngredientRecord['allergenEvidence']>[number];

export const managedNutrients = [
  { key: 'protein', label: 'Protein', unit: 'g/100g' },
  { key: 'fat', label: 'Fat, total', unit: 'g/100g' },
  { key: 'saturatedFat', label: 'Saturated fat', unit: 'g/100g' },
  { key: 'carbohydrate', label: 'Carbohydrate', unit: 'g/100g' },
  { key: 'sugars', label: 'Sugars', unit: 'g/100g' },
  { key: 'sodium', label: 'Sodium', unit: 'mg/100g' },
] as const;
export type ManagedNutrient = (typeof managedNutrients)[number]['key'];

export interface AdditiveSourceDraft {
  id: string;
  additiveName: string;
  codeNumber: string;
  technologicalPurposes: string;
  sourceStatus: AdditiveSource['sourceStatus'];
  declarationRoute: DeclarationSelection['route'];
  schedule7ClassName: string;
  substanceChoice: DeclarationSelection['substanceChoice'] | '';
  flavouringWording: DeclarationSelection['flavouringWording'] | '';
  // Screen-only switches that reveal the optional fields; they are not saved.
  showAmount: boolean;
  concentrationValue: string;
  concentrationUnit: Concentration['unit'] | '';
  concentrationBasis: Concentration['basis'];
  concentrationCalculatedAs: string;
  showEvidence: boolean;
  sourceReference: string;
  sourceDate: string;
  sourceKind: EvidenceKind;
  allergenIdsPresent: string[];
}

export interface IngredientDraft {
  name: string;
  kind: 'atomic' | 'compound' | '';
  compoundFormulationId: string;
  supplierName: string;
  supplierProductCode: string;
  specificationReference: string;
  specificationDate: string;
  knownAllergens: string[];
  nutrients: Record<ManagedNutrient, string>;
  additiveSources: AdditiveSourceDraft[];
}

export function emptyAdditiveSourceDraft(id: string): AdditiveSourceDraft {
  return {
    id,
    additiveName: '',
    codeNumber: '',
    technologicalPurposes: '',
    sourceStatus: 'unknown',
    declarationRoute: 'unknown',
    schedule7ClassName: '',
    substanceChoice: '',
    flavouringWording: '',
    showAmount: false,
    concentrationValue: '',
    concentrationUnit: '',
    concentrationBasis: 'unknown',
    concentrationCalculatedAs: '',
    showEvidence: false,
    sourceReference: '',
    sourceDate: '',
    sourceKind: 'supplierSpecification',
    allergenIdsPresent: [],
  };
}

export function emptyIngredientDraft(): IngredientDraft {
  return {
    name: '',
    kind: '',
    compoundFormulationId: '',
    supplierName: '',
    supplierProductCode: '',
    specificationReference: '',
    specificationDate: '',
    knownAllergens: [],
    nutrients: { protein: '', fat: '', saturatedFat: '', carbohydrate: '', sugars: '', sodium: '' },
    additiveSources: [],
  };
}

function presentIds(assessments: Readonly<Record<string, string>> | undefined): string[] {
  return Object.entries(assessments ?? {})
    .filter(([, status]) => status === 'present')
    .map(([id]) => id);
}

// The one allergen record the builder owns: the supplier's statement about the ingredient itself.
function ownedAllergenEvidence(record: IngredientRecord): AllergenEvidence | undefined {
  return record.allergenEvidence?.find(
    (entry) => entry.kind === 'ingredient' && entry.subjectId === record.id,
  );
}

export function draftFromIngredient(record: IngredientRecord): IngredientDraft {
  const draft = emptyIngredientDraft();
  const values = record.nutrientProfile?.values ?? {};
  for (const { key } of managedNutrients) {
    draft.nutrients[key] = values[key]?.value ?? '';
  }
  const owned = ownedAllergenEvidence(record);
  return {
    ...draft,
    name: record.name,
    kind: record.kind,
    compoundFormulationId: record.compoundFormulationId ?? '',
    supplierName: record.supplierName ?? '',
    supplierProductCode: record.specification?.supplierProductCode ?? '',
    specificationReference: record.specification?.reference ?? owned?.sourceId ?? '',
    specificationDate: record.specification?.sourceDate ?? owned?.sourceDate ?? '',
    knownAllergens: presentIds(owned?.assessments),
    additiveSources: (record.additiveSources ?? []).map((source) => {
      const evidence = source.sourceEvidence?.[0];
      const selection = source.declarationSelection;
      const concentration = source.concentration;
      return {
        id: source.id,
        additiveName: source.additiveName,
        codeNumber: source.codeNumber ?? '',
        technologicalPurposes: (source.technologicalPurposes ?? []).join('\n'),
        sourceStatus: source.sourceStatus,
        declarationRoute: selection?.route ?? 'unknown',
        schedule7ClassName: selection?.schedule7ClassName ?? '',
        substanceChoice: selection?.substanceChoice ?? '',
        flavouringWording: selection?.flavouringWording ?? '',
        showAmount: concentration !== undefined,
        concentrationValue: concentration?.value ?? '',
        concentrationUnit: concentration?.unit ?? '',
        concentrationBasis: concentration?.basis ?? 'unknown',
        concentrationCalculatedAs: concentration?.calculatedAs ?? '',
        showEvidence: evidence !== undefined || source.allergenAssessments !== undefined,
        sourceReference: evidence?.reference ?? '',
        sourceDate: evidence?.sourceDate ?? '',
        sourceKind: evidence?.kind ?? 'supplierSpecification',
        allergenIdsPresent: presentIds(source.allergenAssessments),
      };
    }),
  };
}

function buildNutrients(
  draft: IngredientDraft,
  existing: IngredientRecord | undefined,
  id: string,
): IngredientRecord['nutrientProfile'] {
  const reference = draft.specificationReference.trim();
  const previous: NutrientValues = existing?.nutrientProfile?.values ?? {};
  // Values this form does not edit (for example fibre) are carried over untouched.
  const values: NutrientValues = {};
  const managedKeys = new Set<string>(managedNutrients.map((nutrient) => nutrient.key));
  for (const [key, evidence] of Object.entries(previous)) {
    if (!managedKeys.has(key)) {
      Object.assign(values, { [key]: evidence });
    }
  }
  const entered = managedNutrients.filter(({ key }) => draft.nutrients[key].trim() !== '');
  for (const { key, label, unit } of entered) {
    const text = draft.nutrients[key].trim();
    if (!/^(?:\d+)(?:\.\d+)?$/.test(text)) {
      throw new Error(`Enter a non-negative number for ${label}. Leave it blank if it was not supplied.`);
    }
    const before = previous[key];
    if (before !== undefined && before.value === text) {
      Object.assign(values, { [key]: before });
      continue;
    }
    if (!reference || !draft.specificationDate) {
      throw new Error(
        'Add the supplier specification reference and date before entering nutrient values.',
      );
    }
    Object.assign(values, {
      [key]: {
        value: text,
        unit,
        sourceId: reference,
        sourceDate: draft.specificationDate,
        evidenceType: 'supplier',
      },
    });
  }
  return Object.keys(values).length === 0 ? undefined : { ingredientId: id, values };
}

function buildAllergenEvidence(
  draft: IngredientDraft,
  existing: IngredientRecord | undefined,
  id: string,
  makeId: (prefix: string) => string,
): IngredientRecord['allergenEvidence'] {
  const others = (existing?.allergenEvidence ?? []).filter(
    (entry) => !(entry.kind === 'ingredient' && entry.subjectId === id),
  );
  const owned = existing === undefined ? undefined : ownedAllergenEvidence(existing);
  const ticked = [...new Set(draft.knownAllergens.map((item) => item.trim().toLowerCase()).filter(Boolean))];
  const kept = Object.entries(owned?.assessments ?? {}).filter(([, status]) => status !== 'present');
  if (ticked.length > 0 && (!draft.specificationReference.trim() || !draft.specificationDate)) {
    throw new Error(
      'Add the supplier specification reference and date before recording allergen evidence.',
    );
  }
  const assessments = {
    ...Object.fromEntries(kept.filter(([key]) => !ticked.includes(key))),
    ...Object.fromEntries(ticked.map((allergen) => [allergen, 'present'])),
  };
  const next: AllergenEvidence[] = [...others];
  if (Object.keys(assessments).length > 0) {
    next.unshift({
      id: owned?.id ?? makeId('allergen-evidence'),
      subjectId: id,
      kind: 'ingredient',
      sourceId: draft.specificationReference.trim() || owned?.sourceId || '',
      sourceDate: draft.specificationDate || owned?.sourceDate || '',
      sourcePath: [id],
      assessments,
    } as AllergenEvidence);
  }
  return next.length === 0 ? undefined : next;
}

function buildAdditiveSources(
  draft: IngredientDraft,
  existing: IngredientRecord | undefined,
  makeId: (prefix: string) => string,
): readonly AdditiveSource[] {
  return draft.additiveSources.map((source, index) => {
    const n = index + 1;
    const before = existing?.additiveSources?.find((item) => item.id === source.id);
    const additiveName = source.additiveName.trim();
    if (!additiveName) {
      throw new Error(`Additive source ${n} needs an additive identity.`);
    }
    const reference = source.showEvidence ? source.sourceReference.trim() : '';
    const evidenceDate = source.showEvidence ? source.sourceDate : '';
    if (Boolean(reference) !== Boolean(evidenceDate)) {
      throw new Error(`Additive source ${n} evidence needs both a reference and date.`);
    }
    const allergenIds = source.showEvidence
      ? [...new Set(source.allergenIdsPresent.map((id) => id.trim().toLowerCase()).filter(Boolean))]
      : [];
    const keptAssessments = Object.entries(before?.allergenAssessments ?? {}).filter(
      ([id, status]) => status !== 'present' && !allergenIds.includes(id),
    );
    const assessments = {
      ...Object.fromEntries(keptAssessments),
      ...Object.fromEntries(allergenIds.map((id) => [id, 'present'])),
    };
    const hasAssessments = Object.keys(assessments).length > 0;
    if (hasAssessments && !reference && !(before?.sourceEvidence?.length ?? 0)) {
      throw new Error(`Additive source ${n} allergen assessments need a dated evidence reference.`);
    }

    let concentration: Concentration | undefined;
    if (source.showAmount) {
      const hasValue = Boolean(source.concentrationValue.trim());
      if (hasValue !== Boolean(source.concentrationUnit)) {
        throw new Error(`Additive source ${n} concentration needs both a value and unit.`);
      }
      if (hasValue && source.concentrationUnit) {
        concentration = {
          value: source.concentrationValue.trim(),
          unit: source.concentrationUnit,
          basis: source.concentrationBasis,
          ...(source.concentrationCalculatedAs.trim()
            ? { calculatedAs: source.concentrationCalculatedAs.trim() }
            : {}),
        };
      }
    }

    const purposes = source.technologicalPurposes
      .split('\n')
      .map((purpose) => purpose.trim())
      .filter(Boolean);
    const selection: DeclarationSelection | undefined =
      source.declarationRoute === 'unknown'
        ? undefined
        : {
            route: source.declarationRoute,
            ...(source.schedule7ClassName.trim() ? { schedule7ClassName: source.schedule7ClassName.trim() } : {}),
            ...(source.substanceChoice ? { substanceChoice: source.substanceChoice } : {}),
            ...(source.flavouringWording ? { flavouringWording: source.flavouringWording } : {}),
          };
    const evidence = reference
      ? [
          {
            id: before?.sourceEvidence?.[0]?.id ?? makeId('additive-evidence'),
            reference,
            sourceDate: evidenceDate,
            kind: source.sourceKind,
          },
          ...(before?.sourceEvidence?.slice(1) ?? []),
        ]
      : before?.sourceEvidence;

    return {
      id: source.id,
      additiveName,
      ...(source.codeNumber.trim() ? { codeNumber: source.codeNumber.trim() } : {}),
      ...(purposes.length > 0 ? { technologicalPurposes: purposes } : {}),
      ...(concentration ? { concentration } : {}),
      ...(evidence && evidence.length > 0 ? { sourceEvidence: evidence } : {}),
      sourceStatus: source.sourceStatus,
      ...(selection ? { declarationSelection: selection } : {}),
      ...(hasAssessments ? { allergenAssessments: assessments } : {}),
    } as AdditiveSource;
  });
}

// Builds the saved record from the form. Throws a plain-English Error when something is inconsistent.
export function buildIngredientRecord(
  draft: IngredientDraft,
  existing: IngredientRecord | undefined,
  makeId: (prefix: string) => string,
  now: string,
): IngredientRecord {
  const id = existing?.id ?? makeId('ingredient');
  const name = draft.name.trim();
  if (!name) {
    throw new Error('Give the ingredient a name.');
  }
  const kind = draft.kind;
  if (!kind) {
    throw new Error('Choose whether this is a single or compound ingredient.');
  }
  if (kind === 'compound' && !draft.compoundFormulationId) {
    throw new Error('Select the formulation used by this compound ingredient.');
  }
  const reference = draft.specificationReference.trim();
  const hasSpecification = Boolean(reference || draft.specificationDate || draft.supplierProductCode.trim());
  if (hasSpecification && (!reference || !draft.specificationDate)) {
    throw new Error('Supplier specification details need both a reference and a date.');
  }
  const nutrientProfile = buildNutrients(draft, existing, id);
  const allergenEvidence = buildAllergenEvidence(draft, existing, id, makeId);
  const additiveSources = buildAdditiveSources(draft, existing, makeId);

  return {
    id,
    name,
    recordType: 'ingredient',
    kind,
    ...(kind === 'compound' ? { compoundFormulationId: draft.compoundFormulationId } : {}),
    ...(draft.supplierName.trim() ? { supplierName: draft.supplierName.trim() } : {}),
    ...(reference
      ? {
          specification: {
            reference,
            sourceDate: draft.specificationDate,
            ...(draft.supplierProductCode.trim()
              ? { supplierProductCode: draft.supplierProductCode.trim() }
              : {}),
          },
        }
      : {}),
    ...(nutrientProfile ? { nutrientProfile } : {}),
    ...(allergenEvidence ? { allergenEvidence } : {}),
    ...(additiveSources.length > 0 ? { additiveSources } : {}),
    tags: existing?.tags ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

// Properties that an edit may need to remove. Storage merges changes, so a removed field is set to undefined.
export const editableIngredientKeys = [
  'compoundFormulationId',
  'supplierName',
  'specification',
  'nutrientProfile',
  'allergenEvidence',
  'additiveSources',
] as const;

export interface StepStatus {
  done: boolean;
  text: string;
}

export function ingredientStepStatuses(draft: IngredientDraft): Record<'about' | 'spec' | 'nutrition' | 'allergens' | 'additives', StepStatus> {
  const entered = managedNutrients.filter(({ key }) => draft.nutrients[key].trim() !== '').length;
  const aboutDone =
    draft.name.trim() !== '' && draft.kind !== '' && (draft.kind !== 'compound' || draft.compoundFormulationId !== '');
  const specDone = draft.specificationReference.trim() !== '' && draft.specificationDate !== '';
  return {
    about: { done: aboutDone, text: aboutDone ? 'Answered' : 'Still needed' },
    spec: { done: specDone, text: specDone ? 'Answered' : 'Still needed' },
    nutrition: {
      done: entered === managedNutrients.length,
      text: entered === managedNutrients.length ? 'All entered' : `${entered} of ${managedNutrients.length} entered`,
    },
    allergens: {
      done: draft.knownAllergens.length > 0,
      text: draft.knownAllergens.length > 0 ? `${draft.knownAllergens.length} listed` : 'None recorded',
    },
    additives: {
      done: draft.additiveSources.length > 0,
      text: draft.additiveSources.length > 0 ? `${draft.additiveSources.length} listed` : 'None listed',
    },
  };
}
