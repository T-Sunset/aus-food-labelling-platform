import type { CaffeineStatement, IngredientRecord, SupplierFactKind, SupplierFactStatement } from '@aus-food/storage';
import { optionalNutrientIds, type NutrientEvidenceType, type OptionalNutrientId } from '@aus-food/domain';

type AdditiveSource = NonNullable<IngredientRecord['additiveSources']>[number];
type Concentration = NonNullable<AdditiveSource['concentration']>;
type DeclarationSelection = NonNullable<AdditiveSource['declarationSelection']>;
type EvidenceKind = NonNullable<AdditiveSource['sourceEvidence']>[number]['kind'];
type NutrientValues = NonNullable<IngredientRecord['nutrientProfile']>['values'];
type AllergenEvidence = NonNullable<IngredientRecord['allergenEvidence']>[number];
type IngredientIdentity = NonNullable<IngredientRecord['ingredientIdentity']>;

type SupplierEntryKind = SupplierFactKind | 'otherSchedule28';

export const supplierFactTopics: readonly { key: SupplierEntryKind; label: string }[] = [
  { key: 'fruitJuice', label: 'Fruit juice in this supplied ingredient' },
  { key: 'addedVitamins', label: 'Added vitamins in this supplied ingredient' },
  { key: 'addedTaurine', label: 'Added taurine in this supplied ingredient' },
  { key: 'otherSchedule28', label: 'Other added Schedule 28 substances in this supplied ingredient' },
];

type SupplierFactDraft = { status: '' | 'present' | 'absent'; confirmCurrentSpec: boolean };
function emptySupplierFacts(): Record<SupplierEntryKind, SupplierFactDraft> {
  return {
    fruitJuice: { status: '', confirmCurrentSpec: false },
    addedVitamins: { status: '', confirmCurrentSpec: false },
    addedTaurine: { status: '', confirmCurrentSpec: false },
    otherSchedule28: { status: '', confirmCurrentSpec: false },
  };
}

export function supplierStatements(record: IngredientRecord | undefined, key: SupplierEntryKind): readonly SupplierFactStatement[] | undefined {
  return key === 'otherSchedule28' ? record?.otherSchedule28Statements : record?.supplierFacts?.[key];
}

export interface CaffeineStatementDraft {
  status: '' | 'present' | 'absent';
  amount: string;
  unit: '' | 'g/100g' | 'mg/100g' | 'mg/100mL';
  reference: string;
  sourceDate: string;
}

function emptyCaffeineStatement(): CaffeineStatementDraft {
  return { status: '', amount: '', unit: '', reference: '', sourceDate: '' };
}

function draftCaffeineStatement(statement: CaffeineStatement): CaffeineStatementDraft {
  return {
    status: statement.status, amount: statement.amount ?? '', unit: statement.unit ?? '',
    reference: statement.specification.reference, sourceDate: statement.specification.sourceDate,
  };
}

export const managedNutrients = [
  { key: 'protein', label: 'Protein', unit: 'g/100g' },
  { key: 'fat', label: 'Fat, total', unit: 'g/100g' },
  { key: 'saturatedFat', label: 'Saturated fat', unit: 'g/100g' },
  { key: 'carbohydrate', label: 'Carbohydrate', unit: 'g/100g' },
  { key: 'sugars', label: 'Sugars', unit: 'g/100g' },
  { key: 'sodium', label: 'Sodium', unit: 'mg/100g' },
] as const;
export type ManagedNutrient = (typeof managedNutrients)[number]['key'];

export const optionalNutrientLabels: Readonly<Record<OptionalNutrientId, string>> = {
  availableCarbohydrate: 'Available carbohydrate',
  unavailableCarbohydrate: 'Unavailable carbohydrate',
  dietaryFibre: 'Dietary fibre',
  organicAcids: 'Organic acids',
  alcohol: 'Alcohol',
  polyols: 'Polyols (total)',
  erythritol: 'Erythritol',
  glycerol: 'Glycerol',
  dAllulose: 'D-allulose',
  isomalt: 'Isomalt',
  lactitol: 'Lactitol',
  maltitol: 'Maltitol',
  mannitol: 'Mannitol',
  polydextrose: 'Polydextrose',
  sorbitol: 'Sorbitol',
  dTagatose: 'D-tagatose',
  xylitol: 'Xylitol',
};

export interface OptionalNutrientDraft {
  key: OptionalNutrientId;
  value: string;
  unit: 'g' | 'mg';
}

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
  compoundNutritionBasis: 'components' | 'whole';
  supplierName: string;
  supplierProductCode: string;
  specificationReference: string;
  specificationDate: string;
  knownAllergens: string[];
  allergensConfirmed: boolean;
  allergenSourceType: NutrientEvidenceType | '';
  allergenSourceReference: string;
  allergenSourceDate: string;
  additivesConfirmed: boolean;
  additiveCoverageType: NutrientEvidenceType | '';
  additiveCoverageReference: string;
  additiveCoverageDate: string;
  nutrients: Record<ManagedNutrient, string>;
  additionalNutrientsMass: OptionalNutrientDraft[];
  additionalNutrientsVolume: OptionalNutrientDraft[];
  nutritionPer100mL: Record<ManagedNutrient | 'energy', string>;
  energyPer100g: string;
  nutritionSourceType: NutrientEvidenceType | '';
  nutritionSourceReference: string;
  nutritionSourceDate: string;
  ingredientDensity: string;
  densityReference: string;
  densityDate: string;
  caffeineStatus: '' | 'present' | 'absent' | 'conflicting';
  caffeineAmount: string;
  caffeineUnit: '' | 'g/100g' | 'mg/100g' | 'mg/100mL';
  caffeineStatements: [CaffeineStatementDraft, CaffeineStatementDraft];
  caffeineDecision: '' | 'statement1' | 'statement2' | 'unresolved';
  caffeineDecisionReason: string;
  confirmCaffeineForCurrentSpec: boolean;
  ingredientIdentity: '' | IngredientIdentity['code'];
  confirmIdentityForCurrentSpec: boolean;
  supplierFacts: Record<SupplierEntryKind, SupplierFactDraft>;
  additiveSources: AdditiveSourceDraft[];
  directAdditiveSourceId: string;
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
    compoundNutritionBasis: 'components',
    supplierName: '',
    supplierProductCode: '',
    specificationReference: '',
    specificationDate: '',
    knownAllergens: [],
    allergensConfirmed: false,
    allergenSourceType: '',
    allergenSourceReference: '',
    allergenSourceDate: '',
    additivesConfirmed: false,
    additiveCoverageType: '',
    additiveCoverageReference: '',
    additiveCoverageDate: '',
    nutrients: { protein: '', fat: '', saturatedFat: '', carbohydrate: '', sugars: '', sodium: '' },
    additionalNutrientsMass: [],
    additionalNutrientsVolume: [],
    nutritionPer100mL: { energy: '', protein: '', fat: '', saturatedFat: '', carbohydrate: '', sugars: '', sodium: '' },
    energyPer100g: '',
    nutritionSourceType: '',
    nutritionSourceReference: '',
    nutritionSourceDate: '',
    ingredientDensity: '',
    densityReference: '',
    densityDate: '',
    caffeineStatus: '',
    caffeineAmount: '',
    caffeineUnit: '',
    caffeineStatements: [emptyCaffeineStatement(), emptyCaffeineStatement()],
    caffeineDecision: '',
    caffeineDecisionReason: '',
    confirmCaffeineForCurrentSpec: false,
    ingredientIdentity: '',
    confirmIdentityForCurrentSpec: false,
    supplierFacts: emptySupplierFacts(),
    additiveSources: [],
    directAdditiveSourceId: '',
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

export function currentAllergenCoverage(record: IngredientRecord): { sourceId: string; sourceDate: string } | undefined {
  if (!record.allergensConfirmed) return undefined;
  const coverage = record.allergenCoverage;
  if (coverage) {
    const owned = ownedAllergenEvidence(record);
    if (!owned || owned.sourceId !== coverage.sourceId || owned.sourceDate !== coverage.sourceDate
      || owned.sourceType !== coverage.sourceType) return undefined;
    const assessments = Object.entries(coverage.assessments);
    if (assessments.length !== Object.keys(owned.assessments).length
      || assessments.some(([key, status]) => owned.assessments[key] !== status)) return undefined;
    return coverage;
  }
  if (record.specification && record.coverageSpecification
    && record.specification.reference === record.coverageSpecification.reference
    && record.specification.sourceDate === record.coverageSpecification.sourceDate) {
    return { sourceId: record.specification.reference, sourceDate: record.specification.sourceDate };
  }
  return undefined;
}

export function currentAdditiveCoverage(record: IngredientRecord): boolean {
  if (!record.additivesConfirmed) return false;
  if (record.additiveCoverage) {
    return record.additiveCoverage.sourcesSnapshot === JSON.stringify(record.additiveSources ?? []);
  }
  return Boolean(record.specification && record.coverageSpecification
    && record.specification.reference === record.coverageSpecification.reference
    && record.specification.sourceDate === record.coverageSpecification.sourceDate);
}

export function draftFromIngredient(record: IngredientRecord): IngredientDraft {
  const draft = emptyIngredientDraft();
  for (const { key } of supplierFactTopics) {
    const statements = supplierStatements(record, key);
    draft.supplierFacts[key].status = statements?.[statements.length - 1]?.status ?? '';
  }
  const values = record.nutrientProfile?.values ?? {};
  for (const { key } of managedNutrients) {
    draft.nutrients[key] = values[key]?.value ?? '';
    draft.nutritionPer100mL[key] = record.nutritionPer100mL?.[key]?.value ?? '';
  }
  draft.nutritionPer100mL.energy = record.nutritionPer100mL?.energy?.value ?? '';
  for (const key of optionalNutrientIds) {
    const mass = values[key];
    if (mass) draft.additionalNutrientsMass.push({ key, value: mass.value, unit: mass.unit === 'mg/100g' ? 'mg' : 'g' });
    const volume = record.additionalNutritionPer100mL?.[key];
    if (volume) draft.additionalNutrientsVolume.push({ key, value: volume.value, unit: volume.unit === 'mg/100mL' ? 'mg' : 'g' });
  }
  const owned = ownedAllergenEvidence(record);
  const nutritionSource = Object.values(record.nutrientProfile?.values ?? {})[0]
    ?? record.energyPer100g ?? Object.values(record.nutritionPer100mL ?? {})[0]
    ?? Object.values(record.additionalNutritionPer100mL ?? {})[0];
  return {
    ...draft,
    name: record.name,
    kind: record.kind,
    compoundFormulationId: record.compoundFormulationId ?? '',
    compoundNutritionBasis: record.compoundNutritionBasis ?? 'whole',
    supplierName: record.supplierName ?? '',
    supplierProductCode: record.specification?.supplierProductCode ?? '',
    specificationReference: record.specification?.reference ?? (owned?.sourceType ? '' : owned?.sourceId ?? ''),
    specificationDate: record.specification?.sourceDate ?? (owned?.sourceType ? '' : owned?.sourceDate ?? ''),
    energyPer100g: record.energyPer100g?.value ?? '',
    nutritionSourceType: record.nutritionEntrySource?.sourceType ?? (nutritionSource?.sourceId || nutritionSource?.sourceDate ? nutritionSource.evidenceType ?? 'supplier' : ''),
    nutritionSourceReference: record.nutritionEntrySource?.sourceId ?? nutritionSource?.sourceId ?? '',
    nutritionSourceDate: record.nutritionEntrySource?.sourceDate ?? nutritionSource?.sourceDate ?? '',
    ingredientDensity: record.ingredientDensity?.gramsPerMillilitre ?? '',
    densityReference: record.ingredientDensity?.evidenceReference ?? '',
    densityDate: record.ingredientDensity?.sourceDate ?? '',
    caffeineStatus: record.caffeineEvidence?.status ?? '',
    caffeineAmount: record.caffeineEvidence?.amount ?? '',
    caffeineUnit: record.caffeineEvidence?.unit ?? '',
    caffeineStatements: record.caffeineEvidence?.statements
      ? [draftCaffeineStatement(record.caffeineEvidence.statements[0]), draftCaffeineStatement(record.caffeineEvidence.statements[1])]
      : record.caffeineEvidence && record.caffeineEvidence.status !== 'conflicting'
        ? [draftCaffeineStatement({
            status: record.caffeineEvidence.status,
            ...(record.caffeineEvidence.amount ? { amount: record.caffeineEvidence.amount } : {}),
            ...(record.caffeineEvidence.unit ? { unit: record.caffeineEvidence.unit } : {}),
            specification: record.caffeineEvidence.specification,
          }), emptyCaffeineStatement()]
        : [emptyCaffeineStatement(), emptyCaffeineStatement()],
    ingredientIdentity: record.ingredientIdentity?.code ?? '',
    directAdditiveSourceId: record.directAdditiveSourceId ?? '',
    knownAllergens: presentIds(owned?.assessments),
    allergensConfirmed: currentAllergenCoverage(record) !== undefined,
    allergenSourceType: record.allergenCoverage?.sourceType ?? owned?.sourceType ?? '',
    allergenSourceReference: record.allergenCoverage?.sourceId ?? (owned?.sourceType ? owned.sourceId : ''),
    allergenSourceDate: record.allergenCoverage?.sourceDate ?? (owned?.sourceType ? owned.sourceDate : ''),
    additivesConfirmed: currentAdditiveCoverage(record),
    additiveCoverageType: record.additiveCoverage?.sourceType ?? '',
    additiveCoverageReference: record.additiveCoverage?.sourceId ?? '',
    additiveCoverageDate: record.additiveCoverage?.sourceDate ?? '',
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

function nutrientSource(draft: IngredientDraft): { reference: string; date: string; type: NutrientEvidenceType } | undefined {
  const reference = draft.nutritionSourceReference.trim();
  if (reference || draft.nutritionSourceDate || draft.nutritionSourceType) {
    const date = new Date(`${draft.nutritionSourceDate}T00:00:00Z`);
    if (draft.nutritionSourceDate && (!/^\d{4}-\d{2}-\d{2}$/.test(draft.nutritionSourceDate)
      || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== draft.nutritionSourceDate)) {
      throw new Error('Enter a valid nutrition source date.');
    }
    return { reference, date: draft.nutritionSourceDate, type: draft.nutritionSourceType || 'user' };
  }
  if (draft.specificationReference.trim() && draft.specificationDate) {
    return { reference: draft.specificationReference.trim(), date: draft.specificationDate, type: 'supplier' };
  }
  return undefined;
}

function buildNutrients(
  draft: IngredientDraft,
  existing: IngredientRecord | undefined,
  id: string,
): IngredientRecord['nutrientProfile'] {
  const source = nutrientSource(draft);
  const previous: NutrientValues = existing?.nutrientProfile?.values ?? {};
  const values: NutrientValues = {};
  const managedKeys = new Set<string>([...managedNutrients.map((nutrient) => nutrient.key), ...optionalNutrientIds]);
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
    Object.assign(values, {
      [key]: {
        value: text,
        unit,
        sourceId: source?.reference ?? '',
        sourceDate: source?.date ?? '',
        evidenceType: source?.type ?? 'user',
      },
    });
  }
  const seen = new Set<OptionalNutrientId>();
  for (const item of draft.additionalNutrientsMass) {
    if (!optionalNutrientIds.includes(item.key) || seen.has(item.key)) throw new Error('Choose each additional nutrient only once per basis.');
    if (item.unit !== 'g' && item.unit !== 'mg') throw new Error('Choose g or mg for the additional nutrient.');
    seen.add(item.key);
    const text = item.value.trim();
    if (!text) continue;
    if (!/^\d+(\.\d+)?$/.test(text) || !Number.isFinite(Number(text))) {
      throw new Error(`Enter a non-negative number for ${optionalNutrientLabels[item.key]}, or leave it blank.`);
    }
    const unit = item.unit === 'mg' ? 'mg/100g' : 'g/100g';
    const before = previous[item.key];
    if (before && before.value === text && before.unit === unit) {
      Object.assign(values, { [item.key]: before });
    } else {
      Object.assign(values, { [item.key]: { value: text, unit, sourceId: source?.reference ?? '', sourceDate: source?.date ?? '', evidenceType: source?.type ?? 'user' } });
    }
  }
  return Object.keys(values).length === 0 ? undefined : { ingredientId: id, values };
}

function buildAllergenEvidence(
  draft: IngredientDraft,
  existing: IngredientRecord | undefined,
  id: string,
  makeId: (prefix: string) => string,
): IngredientRecord['allergenEvidence'] {
  const owned = existing === undefined ? undefined : ownedAllergenEvidence(existing);
  const others = (existing?.allergenEvidence ?? []).filter((entry) => entry !== owned);
  const ticked = [...new Set(draft.knownAllergens.map((item) => item.trim().toLowerCase()).filter(Boolean))];
  const kept = Object.entries(owned?.assessments ?? {}).filter(([, status]) => status !== 'present');
  const source = allergenSource(draft);
  const assessments = {
    ...Object.fromEntries(kept.filter(([key]) => !ticked.includes(key))),
    ...Object.fromEntries(ticked.map((allergen) => [allergen, 'present'])),
  };
  const next: AllergenEvidence[] = [...others];
  if (Object.keys(assessments).length > 0 || draft.allergenSourceType || draft.allergensConfirmed) {
    const sameAssessments = owned !== undefined
      && Object.keys(assessments).length === Object.keys(owned.assessments).length
      && Object.entries(assessments).every(([key, status]) => owned.assessments[key] === status);
    if (sameAssessments && ((!draft.allergenSourceType && owned.sourceType === undefined)
      || (owned.sourceId === (source?.reference ?? '')
        && owned.sourceDate === (source?.date ?? '')
        && (owned.sourceType ?? 'supplier') === (source?.type ?? 'user')))) {
      next.unshift(owned);
      return next;
    }
    if (owned && kept.length > 0
      && (owned.sourceId !== source?.reference || owned.sourceDate !== source?.date)) {
      throw new Error('The saved allergen assessments belong to an earlier source. They cannot be combined with changed assessments from this specification yet; retain the earlier evidence and supplier documents.');
    }
    const changedSource = Boolean(owned
      && (owned.sourceId !== (source?.reference ?? '') || owned.sourceDate !== (source?.date ?? '')
        || (owned.sourceType ?? 'supplier') !== (source?.type ?? 'user')));
    if (changedSource && owned) next.push(owned);
    next.unshift({
      id: changedSource ? makeId('allergen-evidence') : owned?.id ?? makeId('allergen-evidence'),
      subjectId: id,
      kind: 'ingredient',
      sourceId: source?.reference ?? '',
      sourceDate: source?.date ?? '',
      sourceType: source?.type ?? 'user',
      sourcePath: [id],
      assessments,
    } as AllergenEvidence);
  }

  return next.length === 0 ? undefined : next;
}

function allergenSource(draft: IngredientDraft): { reference: string; date: string; type: NutrientEvidenceType } | undefined {
  if (draft.allergenSourceType || draft.allergenSourceReference.trim() || draft.allergenSourceDate) {
    const date = new Date(`${draft.allergenSourceDate}T00:00:00Z`);
    if (draft.allergenSourceDate && (!/^\d{4}-\d{2}-\d{2}$/.test(draft.allergenSourceDate)
      || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== draft.allergenSourceDate)) {
      throw new Error('Enter a valid allergen source date.');
    }
    return { reference: draft.allergenSourceReference.trim(), date: draft.allergenSourceDate, type: draft.allergenSourceType || 'user' };
  }
  if (draft.specificationReference.trim() && draft.specificationDate) {
    return { reference: draft.specificationReference.trim(), date: draft.specificationDate, type: 'supplier' };
  }
  return undefined;
}

function buildAdditiveSources(
  draft: IngredientDraft,
  existing: IngredientRecord | undefined,
  makeId: (prefix: string) => string,
): readonly AdditiveSource[] {
  return draft.additiveSources.map((source, index) => {
    const n = index + 1;
    const before = existing?.additiveSources?.find((item) => item.id === source.id);
    const additiveName = source.id === draft.directAdditiveSourceId ? draft.name.trim() : source.additiveName.trim();
    if (!additiveName) {
      throw new Error(`Additive source ${n} needs an additive identity.`);
    }
    const reference = source.showEvidence ? source.sourceReference.trim() : '';
    const evidenceDate = source.showEvidence ? source.sourceDate : '';
    if (evidenceDate) {
      const date = new Date(`${evidenceDate}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(evidenceDate) || !Number.isFinite(date.getTime())
        || date.toISOString().slice(0, 10) !== evidenceDate) {
        throw new Error(`Additive source ${n} needs a valid evidence date.`);
      }
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
    const evidence = reference || evidenceDate
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
  if (draft.directAdditiveSourceId && (kind !== 'atomic'
    || !draft.additiveSources.some((source) => source.id === draft.directAdditiveSourceId))) {
    throw new Error('A direct additive must be a single ingredient with its additive details.');
  }
  const reference = draft.specificationReference.trim();
  const hasSpecification = Boolean(reference || draft.specificationDate || draft.supplierProductCode.trim());
  if (hasSpecification && (!reference || !draft.specificationDate)) {
    throw new Error('Supplier specification details need both a reference and a date.');
  }
  const coverageReference = draft.additiveCoverageReference.trim();
  const hasAdditiveCoverage = Boolean(draft.additiveCoverageType || coverageReference || draft.additiveCoverageDate);
  if (draft.additiveCoverageDate) {
    const date = new Date(`${draft.additiveCoverageDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.additiveCoverageDate)
      || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== draft.additiveCoverageDate) {
      throw new Error('Enter a valid additive information source date.');
    }
  }
  const nutrientProfile = buildNutrients(draft, existing, id);
  const source = nutrientSource(draft);
  const energyText = draft.energyPer100g.trim();
  if (energyText && (!/^\d+(\.\d+)?$/.test(energyText) || !Number.isFinite(Number(energyText)))) {
    throw new Error('Enter a non-negative number for energy, or leave it blank if not supplied.');
  }
  const energyPer100g = energyText
    ? existing?.energyPer100g?.value === energyText
      ? existing.energyPer100g
      : { value: energyText, sourceId: source?.reference ?? '', sourceDate: source?.date ?? '',
        ...(source?.type !== 'supplier' ? { evidenceType: source?.type ?? 'user' } : {}) }
    : undefined;
  const allergenEvidence = buildAllergenEvidence(draft, existing, id, makeId);
  const allergenSourceDetails = allergenSource(draft);
  const allergenOwned = allergenEvidence?.find((entry) => entry.kind === 'ingredient' && entry.subjectId === id);
  const allergenCoverage = draft.allergensConfirmed && allergenOwned && (Boolean(draft.allergenSourceType) || !reference)
    ? { sourceType: allergenSourceDetails?.type ?? 'user', sourceId: allergenSourceDetails?.reference ?? '',
      sourceDate: allergenSourceDetails?.date ?? '', assessments: allergenOwned.assessments }
    : undefined;
  const additiveSources = buildAdditiveSources(draft, existing, makeId);
  const nutritionPer100mL: NonNullable<IngredientRecord['nutritionPer100mL']> = {};
  for (const key of ['energy', ...managedNutrients.map((nutrient) => nutrient.key)] as const) {
    const text = draft.nutritionPer100mL[key].trim();
    if (!text) continue;
    if (!/^\d+(\.\d+)?$/.test(text) || !Number.isFinite(Number(text))) {
      throw new Error(`Enter a non-negative per-100 mL value for ${key}, or leave it blank.`);
    }
    const before = existing?.nutritionPer100mL?.[key];
    if (before?.value === text) {
      Object.assign(nutritionPer100mL, { [key]: before });
    } else {
      Object.assign(nutritionPer100mL, { [key]: { value: text, sourceId: source?.reference ?? '', sourceDate: source?.date ?? '', ...(source?.type !== 'supplier' ? { evidenceType: source?.type ?? 'user' } : {}) } });
    }
  }
  const additionalNutritionPer100mL: NonNullable<IngredientRecord['additionalNutritionPer100mL']> = {};
    const seenVolume = new Set<OptionalNutrientId>();
    for (const item of draft.additionalNutrientsVolume) {
      if (!optionalNutrientIds.includes(item.key) || seenVolume.has(item.key)) throw new Error('Choose each additional nutrient only once per basis.');
      if (item.unit !== 'g' && item.unit !== 'mg') throw new Error('Choose g or mg for the additional nutrient.');
      seenVolume.add(item.key);
      const text = item.value.trim();
      if (!text) continue;
      if (!/^\d+(\.\d+)?$/.test(text) || !Number.isFinite(Number(text))) {
        throw new Error(`Enter a non-negative number for ${optionalNutrientLabels[item.key]}, or leave it blank.`);
      }
      const unit = item.unit === 'mg' ? 'mg/100mL' : 'g/100mL';
      const before = existing?.additionalNutritionPer100mL?.[item.key];
      if (before && before.value === text && before.unit === unit) {
        Object.assign(additionalNutritionPer100mL, { [item.key]: before });
      } else {
        Object.assign(additionalNutritionPer100mL, {
          [item.key]: { value: text, unit, sourceId: source?.reference ?? '', sourceDate: source?.date ?? '', evidenceType: source?.type ?? 'user' },
        });
      }
    }
  const densityValue = draft.ingredientDensity.trim();
  const densityReference = draft.densityReference.trim();
  if (densityValue || densityReference || draft.densityDate) {
    if (!/^\d+(\.\d+)?$/.test(densityValue) || !Number.isFinite(Number(densityValue))
      || Number(densityValue) <= 0) {
      throw new Error('Ingredient density needs a positive value.');
    }
    if (draft.densityDate) {
      const date = new Date(`${draft.densityDate}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.densityDate) || !Number.isFinite(date.getTime())
        || date.toISOString().slice(0, 10) !== draft.densityDate) {
        throw new Error('Enter a valid ingredient density source date.');
      }
    }
  }
  const ingredientDensity = densityValue
    ? { gramsPerMillilitre: densityValue, evidenceReference: densityReference, sourceDate: draft.densityDate }
    : undefined;
  const previousCaffeine = existing?.caffeineEvidence;
  if (previousCaffeine?.statements && draft.caffeineStatus !== 'conflicting') {
    throw new Error('The conflicting caffeine statements cannot yet be removed here. Keep both statements and retain the supplier documents.');
  }
  const caffeineUnchanged = previousCaffeine !== undefined
    && previousCaffeine.status === draft.caffeineStatus
    && (previousCaffeine.amount ?? '') === draft.caffeineAmount.trim()
    && (previousCaffeine.unit ?? '') === draft.caffeineUnit
    && !draft.confirmCaffeineForCurrentSpec;
  let caffeineEvidence: IngredientRecord['caffeineEvidence'];
  if (draft.caffeineStatus) {
    if (caffeineUnchanged && draft.caffeineStatus !== 'conflicting') {
      caffeineEvidence = previousCaffeine;
    } else {
      if (!reference || !draft.specificationDate) {
        throw new Error('Add the supplier specification reference and date before recording caffeine information.');
      }
      if (draft.caffeineStatus === 'present'
        && (!/^\d+(\.\d+)?$/.test(draft.caffeineAmount.trim())
          || !Number.isFinite(Number(draft.caffeineAmount)) || Number(draft.caffeineAmount) <= 0
          || (draft.caffeineUnit === 'g/100g' && Number(draft.caffeineAmount) > 100)
          || (draft.caffeineUnit === 'mg/100g' && Number(draft.caffeineAmount) > 100000)
          || !draft.caffeineUnit)) {
        throw new Error('Enter a positive caffeine amount and its unit, or leave caffeine information unknown.');
      }
      let statements: readonly [CaffeineStatement, CaffeineStatement] | undefined;
      if (draft.caffeineStatus === 'conflicting') {
        const blank = draft.caffeineStatements.every((entry) =>
          !entry.status && !entry.amount && !entry.unit && !entry.reference && !entry.sourceDate);
        if (blank && previousCaffeine?.status === 'conflicting' && !previousCaffeine.statements) {
          caffeineEvidence = previousCaffeine;
        } else {
          const buildStatement = (entry: CaffeineStatementDraft): CaffeineStatement => {
            if (!entry.status || !entry.reference.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(entry.sourceDate)) {
              throw new Error('Enter both caffeine statements with their source references and dates.');
            }
            if (entry.status === 'present'
              && (!/^\d+(\.\d+)?$/.test(entry.amount.trim()) || !Number.isFinite(Number(entry.amount))
                || Number(entry.amount) <= 0 || !entry.unit
                || (entry.unit === 'g/100g' && Number(entry.amount) > 100)
                || (entry.unit === 'mg/100g' && Number(entry.amount) > 100000))) {
              throw new Error('Enter a positive caffeine amount and unit for each statement reporting caffeine present.');
            }
            return {
              status: entry.status,
              ...(entry.status === 'present' && entry.unit ? { amount: entry.amount.trim(), unit: entry.unit } : {}),
              specification: { reference: entry.reference.trim(), sourceDate: entry.sourceDate },
            };
          };
          statements = [buildStatement(draft.caffeineStatements[0]), buildStatement(draft.caffeineStatements[1])];
          if (previousCaffeine?.statements && JSON.stringify(previousCaffeine.statements) !== JSON.stringify(statements)) {
            throw new Error('The saved supplier statements cannot be changed here. Keep both statements and record a decision instead.');
          }
          if (previousCaffeine && previousCaffeine.status !== 'conflicting'
            && JSON.stringify(statements[0]) !== JSON.stringify({
              status: previousCaffeine.status,
              ...(previousCaffeine.amount ? { amount: previousCaffeine.amount } : {}),
              ...(previousCaffeine.unit ? { unit: previousCaffeine.unit } : {}),
              specification: previousCaffeine.specification,
            })) {
            throw new Error('Keep the saved caffeine statement as statement 1 and add the conflicting source as statement 2.');
          }
          if (previousCaffeine?.status === 'conflicting'
            && JSON.stringify(previousCaffeine.statements) === JSON.stringify(statements)) {
            caffeineEvidence = previousCaffeine;
          }
        }
      }
      caffeineEvidence ??= {
        status: draft.caffeineStatus,
        ...(draft.caffeineStatus === 'present' && draft.caffeineUnit
          ? { amount: draft.caffeineAmount.trim(), unit: draft.caffeineUnit }
          : {}),
        specification: { reference, sourceDate: draft.specificationDate },
        ...(statements ? { statements } : {}),
      };
      if (draft.caffeineStatus === 'conflicting') {
        const reason = draft.caffeineDecisionReason.trim();
        if (Boolean(draft.caffeineDecision) !== Boolean(reason)) {
          throw new Error('Choose a caffeine decision and explain why, or leave both fields blank.');
        }
        if (draft.caffeineDecision) {
          if (!caffeineEvidence.statements) {
            throw new Error('Record both supplier statements before recording a caffeine decision.');
          }
          caffeineEvidence = {
            ...caffeineEvidence,
            decisions: [
              ...(previousCaffeine?.decisions ?? []),
              { choice: draft.caffeineDecision, reason, recordedAt: now },
            ],
          };
        }
      }
    }
  }
  let ingredientIdentity: IngredientRecord['ingredientIdentity'];
  if (draft.ingredientIdentity) {
    if (existing?.ingredientIdentity?.code === draft.ingredientIdentity && !draft.confirmIdentityForCurrentSpec) {
      ingredientIdentity = existing.ingredientIdentity;
    } else {
      if (!reference || !draft.specificationDate) {
        throw new Error('Add the supplier specification reference and date before selecting an ingredient identity.');
      }
      ingredientIdentity = {
        vocabularyVersion: 'demo-ingredients-1',
        code: draft.ingredientIdentity,
        specification: { reference, sourceDate: draft.specificationDate },
      };
    }
  }
  const supplierFacts: Partial<Record<SupplierEntryKind, readonly SupplierFactStatement[]>> = {};
  for (const { key, label } of supplierFactTopics) {
    const fact = draft.supplierFacts[key];
    const previous = supplierStatements(existing, key) ?? [];
    const last = previous[previous.length - 1];
    if (!fact.status) {
      if (last) throw new Error(`${label}: saved statements cannot be removed here. Keep the supplier documents and select the last statement.`);
      continue;
    }
    if (last?.status === fact.status && !fact.confirmCurrentSpec) {
      supplierFacts[key] = previous;
      continue;
    }
    if (!reference || !draft.specificationDate) {
      throw new Error(`Add the specification reference and date before recording ${label.toLowerCase()}.`);
    }
    const statement: SupplierFactStatement = {
      status: fact.status, specification: { reference, sourceDate: draft.specificationDate },
    };
    if (last && last.status === statement.status
      && last.specification.reference === reference && last.specification.sourceDate === draft.specificationDate) {
      supplierFacts[key] = previous;
    } else {
      supplierFacts[key] = [...previous, statement];
    }
  }
  const { otherSchedule28, ...standardSupplierFacts } = supplierFacts;

  return {
    id,
    name,
    recordType: 'ingredient',
    kind,
    ...(kind === 'compound' ? { compoundFormulationId: draft.compoundFormulationId } : {}),
    ...(kind === 'compound' ? { compoundNutritionBasis: draft.compoundNutritionBasis } : {}),
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
    ...((draft.nutritionSourceType || draft.nutritionSourceReference.trim() || draft.nutritionSourceDate) && source
      ? { nutritionEntrySource: { sourceType: source.type, sourceId: source.reference, sourceDate: source.date } }
      : {}),
    ...(energyPer100g ? { energyPer100g } : {}),
    ...(ingredientDensity ? { ingredientDensity } : {}),
    ...(allergenEvidence ? { allergenEvidence } : {}),
    ...(allergenCoverage ? { allergenCoverage } : {}),
    ...(additiveSources.length > 0 ? { additiveSources } : {}),
    ...((hasAdditiveCoverage || (draft.additivesConfirmed && !reference))
      ? { additiveCoverage: { sourceType: draft.additiveCoverageType || 'user', sourceId: coverageReference,
        sourceDate: draft.additiveCoverageDate, sourcesSnapshot: JSON.stringify(additiveSources) } }
      : {}),
    ...(draft.directAdditiveSourceId ? { directAdditiveSourceId: draft.directAdditiveSourceId } : {}),
    ...(caffeineEvidence ? { caffeineEvidence } : {}),
    ...(ingredientIdentity ? { ingredientIdentity } : {}),
    ...(Object.keys(standardSupplierFacts).length ? { supplierFacts: standardSupplierFacts } : {}),
    ...(otherSchedule28 ? { otherSchedule28Statements: otherSchedule28 } : {}),
    ...(Object.keys(nutritionPer100mL).length ? { nutritionPer100mL } : {}),
    ...(Object.keys(additionalNutritionPer100mL).length ? { additionalNutritionPer100mL } : {}),
    allergensConfirmed: draft.allergensConfirmed,
    additivesConfirmed: draft.additivesConfirmed,
    ...((draft.additivesConfirmed && !hasAdditiveCoverage && reference) || (draft.allergensConfirmed && !draft.allergenSourceType && reference)
      ? { coverageSpecification: { reference, sourceDate: draft.specificationDate } }
      : {}),
    tags: existing?.tags ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

// Properties that an edit may need to remove. Storage merges changes, so a removed field is set to undefined.
export const editableIngredientKeys = [
  'compoundFormulationId',
  'compoundNutritionBasis',
  'supplierName',
  'specification',
  'nutrientProfile',
  'nutritionEntrySource',
  'energyPer100g',
  'ingredientDensity',
  'allergenEvidence',
  'allergenCoverage',
  'allergensConfirmed',
  'additiveSources',
  'directAdditiveSourceId',
  'additivesConfirmed',
  'additiveCoverage',
  'coverageSpecification',
  'caffeineEvidence',
  'ingredientIdentity',
  'supplierFacts',
  'otherSchedule28Statements',
  'nutritionPer100mL',
  'additionalNutritionPer100mL',
] as const;

export interface StepStatus {
  done: boolean;
  text: string;
}

export function ingredientStepStatuses(draft: IngredientDraft): Record<'about' | 'spec' | 'nutrition' | 'allergens' | 'additives', StepStatus> {
  const massEntered = managedNutrients.filter(({ key }) => draft.nutrients[key].trim() !== '').length
    + (draft.energyPer100g.trim() ? 1 : 0);
  const volumeEntered = Object.values(draft.nutritionPer100mL).filter((value) => value.trim() !== '').length;
  const densityNumber = Number(draft.ingredientDensity);
  const densityDate = new Date(`${draft.densityDate}T00:00:00Z`);
  const densityReady = /^\d+(\.\d+)?$/.test(draft.ingredientDensity) && Number.isFinite(densityNumber)
    && densityNumber > 0 && Boolean(draft.densityReference.trim())
    && /^\d{4}-\d{2}-\d{2}$/.test(draft.densityDate) && Number.isFinite(densityDate.getTime())
    && densityDate.toISOString().slice(0, 10) === draft.densityDate;
  const entered = densityReady
    ? managedNutrients.filter(({ key }) => draft.nutrients[key].trim() || draft.nutritionPer100mL[key].trim()).length
      + (draft.energyPer100g.trim() || draft.nutritionPer100mL.energy.trim() ? 1 : 0)
    : massEntered;
  const total = managedNutrients.length + 1;
  const aboutDone =
    draft.name.trim() !== '' && draft.kind !== '' && (draft.kind !== 'compound' || draft.compoundFormulationId !== '');
  const specDone = draft.specificationReference.trim() !== '' && draft.specificationDate !== '';
  return {
    about: { done: aboutDone, text: aboutDone ? 'Answered' : 'Still needed' },
    spec: { done: specDone, text: specDone ? 'Answered' : 'Still needed' },
    nutrition: {
      done: entered === total,
      text: entered === total
        ? 'All entered for calculation'
        : volumeEntered > 0 && entered === 0
          ? `${volumeEntered} of ${total} entered per 100 mL; calculations require sourced ingredient density`
          : `${entered} of ${total} entered per 100 g`,
    },
    allergens: {
      done: draft.allergensConfirmed,
      text: draft.allergensConfirmed ? 'Confirmed' : 'Still needed',
    },
    additives: {
      done: draft.additivesConfirmed,
      text: draft.additivesConfirmed ? 'Confirmed' : 'Still needed',
    },
  };
}
