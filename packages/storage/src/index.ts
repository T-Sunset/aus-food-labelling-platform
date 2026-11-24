import Dexie, { type Table } from 'dexie';
import { additionalNutrientIds, findCircularReferencePath, nutrientIds, optionalNutrientIds } from '@aus-food/domain';
import type {
  AdditiveConcentrationBasis,
  AdditiveConcentrationUnit,
  AdditiveDeclarationRoute,
  AdditiveDeclarationSelection,
  AdditiveDeclarationSubstanceChoice,
  AdditiveSourceEvidenceKind,
  AdditiveSourceStatus,
  AllergenEvidenceSource,
  AllergenEvidenceStatus,
  ClassificationAnswer,
  ClassificationEvidenceKind,
  EngineResult,
  FoodState,
  FormulationComponent,
  IncompleteRecipeLines,
  IngredientNutrientProfile,
  IngredientAdditiveSource,
  ProcessMassProfile,
  ProductClassificationEvidence,
  ProductClassificationProfile,
  ProductAdditiveNameInputs,
  LabelClaim,
  LabelClaimCandidateDecision,
  ProductClaim,
  ProductClaimFacts,
  SupplierCompositionEvidence,
} from '@aus-food/domain';

export interface DraftRecordBase {
  readonly id: string;
  readonly name: string;
  readonly recordType: 'ingredient' | 'formulation' | 'product';
  readonly tags: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CaffeineStatement {
  readonly status: 'present' | 'absent';
  readonly amount?: string;
  readonly unit?: 'g/100g' | 'mg/100g' | 'mg/100mL';
  readonly specification: { readonly reference: string; readonly sourceDate: string };
}

export type SupplierFactKind = 'fruitJuice' | 'addedVitamins' | 'addedTaurine';
export interface SupplierFactStatement {
  readonly status: 'present' | 'absent';
  readonly specification: { readonly reference: string; readonly sourceDate: string };
}

export interface IngredientRecord extends DraftRecordBase {
  readonly recordType: 'ingredient';
  readonly kind: 'atomic' | 'compound';
  readonly supplierName?: string;
  readonly specification?: {
    readonly reference: string;
    readonly sourceDate: string;
    readonly supplierProductCode?: string;
  };
  readonly compoundFormulationId?: string;
  readonly compoundNutritionBasis?: 'components' | 'whole';
  readonly nutrientProfile?: IngredientNutrientProfile;
  readonly nutritionEntrySource?: {
    readonly sourceType: import('@aus-food/domain').NutrientEvidenceType;
    readonly sourceId: string;
    readonly sourceDate: string;
  };
  readonly energyPer100g?: {
    readonly value: string;
    readonly sourceId: string;
    readonly sourceDate: string;
    readonly evidenceType?: import('@aus-food/domain').NutrientEvidenceType;
  };
  readonly ingredientDensity?: {
    readonly gramsPerMillilitre: string;
    readonly evidenceReference: string;
    readonly sourceDate: string;
  };
  readonly allergenEvidence?: readonly AllergenEvidenceSource[];
  readonly allergensConfirmed?: boolean;
  readonly allergenCoverage?: {
    readonly sourceType: import('@aus-food/domain').NutrientEvidenceType;
    readonly sourceId: string;
    readonly sourceDate: string;
    readonly assessments: Readonly<Record<string, AllergenEvidenceStatus>>;
    readonly wheatGlutenStatus?: 'present' | 'absent';
  };
  readonly wheatGlutenStatus?: 'present' | 'absent';
  readonly additiveSources?: readonly IngredientAdditiveSource[];
  readonly directAdditiveSourceId?: string;
  readonly additivesConfirmed?: boolean;
  readonly additiveCoverage?: {
    readonly sourceType: import('@aus-food/domain').NutrientEvidenceType;
    readonly sourceId: string;
    readonly sourceDate: string;
    readonly sourcesSnapshot: string;
  };
  readonly coverageSpecification?: {
    readonly reference: string;
    readonly sourceDate: string;
  };
  readonly ingredientIdentity?: {
    readonly vocabularyVersion: 'demo-ingredients-1';
    readonly code: 'water' | 'sugar' | 'citric-acid' | 'caffeine' | 'lemon-peel-oil' | 'flavour-blend' | 'unrecognised';
    readonly specification: { readonly reference: string; readonly sourceDate: string };
  };
  readonly nutritionPer100mL?: Partial<Record<
    'energy' | 'protein' | 'fat' | 'saturatedFat' | 'carbohydrate' | 'sugars' | 'sodium',
    { readonly value: string; readonly sourceId: string; readonly sourceDate: string; readonly evidenceType?: import('@aus-food/domain').NutrientEvidenceType }
  >>;
  readonly additionalNutritionPer100mL?: Partial<Record<
    import('@aus-food/domain').AdditionalNutrientId,
    {
      readonly value: string;
      readonly unit: import('@aus-food/domain').VolumeNutrientUnit;
      readonly sourceId: string;
      readonly sourceDate: string;
      readonly evidenceType: import('@aus-food/domain').NutrientEvidenceType;
      readonly method?: string;
      readonly expression?: string;
    }
  >>;
  readonly caffeineEvidence?: {
    readonly status: 'present' | 'absent' | 'conflicting';
    readonly amount?: string;
    readonly unit?: 'g/100g' | 'mg/100g' | 'mg/100mL';
    readonly specification: { readonly reference: string; readonly sourceDate: string };
    readonly statements?: readonly [CaffeineStatement, CaffeineStatement];
    readonly decisions?: readonly {
      readonly choice: 'statement1' | 'statement2' | 'unresolved';
      readonly reason: string;
      readonly recordedAt: string;
    }[];
  };
  readonly supplierFacts?: Partial<Record<SupplierFactKind, readonly SupplierFactStatement[]>>;
  // Kept outside supplierFacts so the previous v2 editor preserves it when updating known topics.
  readonly otherSchedule28Statements?: readonly SupplierFactStatement[];
}

export interface FormulationRecord extends DraftRecordBase {
  readonly recordType: 'formulation';
  readonly lines: readonly FormulationComponent[];
  readonly supplierComposition?: SupplierCompositionEvidence;
  readonly incompleteRecipeLines?: IncompleteRecipeLines | undefined;
  readonly processMassProfile?: ProcessMassProfile | undefined;
  readonly finishedNutrition?: {
    readonly selected: boolean;
    readonly recipeSnapshot?: string;
    readonly nutrientProfile?: IngredientNutrientProfile;
    readonly energyPer100g?: IngredientRecord['energyPer100g'];
    readonly nutritionEntrySource?: IngredientRecord['nutritionEntrySource'];
  } | undefined;
  readonly nutrientRetention?: {
    readonly selected: boolean;
    readonly recipeSnapshot?: string;
    readonly factors: Partial<Record<import('@aus-food/domain').NutrientId, {
      readonly percentage: string;
      readonly sourceId: string;
      readonly sourceDate: string;
    }>>;
  } | undefined;
}

export interface ProductPackDetails {
  readonly servingSize?: string;
  readonly servingUnit?: 'g' | 'mL';
  readonly servingsPerPack?: string;
  readonly netQuantity?: string;
  readonly netUnit?: 'g' | 'mL';
  readonly nutritionFoodForm?: 'solid' | 'liquid';
  readonly nutritionRecipeSignature?: string;
  readonly nutritionDensity?: {
    readonly gramsPerMillilitre: string;
    readonly evidenceReference: string;
    readonly sourceDate: string;
  };
}

export interface ProductPreparation {
  readonly enabled: boolean;
  readonly kind?: 'reconstituted' | 'withFood';
  readonly directions?: string;
  readonly productAmount?: { readonly value: string; readonly unit: 'g' | 'mL' };
  readonly addedIngredientId?: string;
  readonly addedAmount?: { readonly value: string; readonly unit: 'g' | 'mL' };
  readonly preparedServing?: { readonly value: string; readonly unit: 'g' | 'mL' };
  readonly mixingConfirmed?: boolean;
  readonly confirmationSnapshot?: string;
  readonly preparedDensity?: ProductPackDetails['nutritionDensity'];
}

export type DrainedNutrientId = 'energy' | 'protein' | 'fat' | 'saturatedFat' | 'carbohydrate' | 'sugars' | 'sodium';

export interface ProductDraining {
  readonly enabled: boolean;
  readonly directions?: string;
  readonly servingGrams?: string;
  readonly sourceType?: import('@aus-food/domain').NutrientEvidenceType;
  readonly sourceReference?: string;
  readonly sourceDate?: string;
  readonly values: Partial<Record<DrainedNutrientId, string>>;
  readonly confirmationSnapshot?: string;
}

export interface ProductRecord extends DraftRecordBase {
  readonly recordType: 'product';
  readonly formulationId: string;
  readonly foodState?: FoodState;
  readonly builderProductType?: 'caffeinatedBeverage' | 'infantFood' | 'other';
  readonly packDetails?: ProductPackDetails;
  readonly preparation?: ProductPreparation | undefined;
  readonly draining?: ProductDraining | undefined;
  readonly consumerDirections?: 'unknown' | 'none' | 'present';
  readonly otherConsumerDirections?: boolean;
  readonly otherConsumerDirectionsText?: string;
  readonly classificationProfile?: ProductClassificationProfile;
  readonly additiveNameInputs?: ProductAdditiveNameInputs;
  readonly claims?: readonly ProductClaim[];
  readonly claimFacts?: ProductClaimFacts;
}

export const labelTextBlocks = [
  'foodName', 'netQuantity', 'ingredients', 'allergenDeclaration',
  'preparationDirections', 'nutritionInformation', 'advisoryStatements',
] as const;
export type LabelTextBlock = typeof labelTextBlocks[number];

export interface LabelAdditiveWording {
  readonly ingredientId: string;
  readonly additiveSourceId: string;
  readonly selection: AdditiveDeclarationSelection;
}

export interface LabelPackCopy {
  readonly supplierName?: string;
  readonly supplierAddress?: string;
  readonly lotIdentification?: string;
  readonly dateMarking?: string;
  readonly storageInstructions?: string;
  readonly warningAdvisoryStatements?: string;
  readonly precautionaryAllergenStatement?: string;
  readonly precautionaryAllergenBasis?: string;
}

export const labelPackCopyMaxLengths = {
  supplierName: 300,
  supplierAddress: 600,
  lotIdentification: 200,
  dateMarking: 200,
  storageInstructions: 1000,
  warningAdvisoryStatements: 2000,
  precautionaryAllergenStatement: 1000,
  precautionaryAllergenBasis: 2000,
} as const satisfies Readonly<Record<keyof LabelPackCopy, number>>;

export interface LabelDraftRecord {
  readonly id: string;
  readonly name: string;
  readonly productId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly dependencySignature: string;
  readonly additiveWording?: readonly LabelAdditiveWording[];
  readonly claims?: readonly LabelClaim[];
  readonly claimCandidateDecisions?: readonly LabelClaimCandidateDecision[];
  readonly packCopy?: LabelPackCopy | undefined;
  readonly includeDailyIntake?: boolean;
  readonly layout: {
    readonly widthMm: number;
    readonly heightMm: number;
    readonly orientation: 'portrait' | 'landscape';
    readonly margins: { readonly topMm: number; readonly rightMm: number; readonly bottomMm: number; readonly leftMm: number };
    readonly gapMm: number;
    readonly textSizes: Readonly<Record<LabelTextBlock, number>>;
  };
}

export type WorkspaceDraftRecord =
  | IngredientRecord
  | FormulationRecord
  | ProductRecord;

export type DraftChanges<T extends WorkspaceDraftRecord> = Partial<
  Omit<T, 'id' | 'recordType' | 'createdAt' | 'updatedAt'>
>;

export interface ApprovedVersionRecord {
  readonly id: string;
  readonly recordType: WorkspaceDraftRecord['recordType'];
  readonly recordId: string;
  readonly version: number;
  readonly approvedAt: string;
  readonly approvedBy: string;
  readonly reviewDecision: ReviewDecisionRecord;
  readonly results: readonly EngineResult<unknown>[];
  readonly snapshot: WorkspaceDraftRecord;
}

export interface ReviewDecisionRecord {
  readonly id: string;
  readonly versionId: string;
  readonly decision: 'approved' | 'legacy_unverified';
  readonly reviewerId: string;
  readonly decidedAt: string;
  readonly rationale: string;
}

export interface RecoveryPointRecord {
  readonly id: string;
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly createdAt: string;
  readonly records: {
    readonly ingredients: readonly IngredientRecord[];
    readonly formulations: readonly FormulationRecord[];
    readonly products: readonly ProductRecord[];
    readonly approvedVersions: readonly Omit<ApprovedVersionRecord, 'reviewDecision' | 'results'>[];
    readonly reviewDecisions?: readonly ReviewDecisionRecord[];
  };
}

export interface ApprovalInput {
  readonly reviewDecisionId: string;
  readonly reviewerId: string;
  readonly rationale: string;
  readonly results?: readonly EngineResult<unknown>[];
  readonly approvedAt?: string;
}

export interface WorkspaceRecordCounts {
  readonly ingredients: number;
  readonly formulations: number;
  readonly products: number;
  readonly labels: number;
  readonly approvedVersions: number;
  readonly reviewDecisions: number;
}

export interface RestoreInspection {
  readonly backupFormatVersion: 1 | 2 | 3;
  readonly backupCounts: WorkspaceRecordCounts;
  readonly existingCounts: WorkspaceRecordCounts;
  readonly conflictingRecordIds: readonly string[];
  readonly requiresExplicitReplace: boolean;
}

export interface WorkspaceUsageMarker {
  wasPreviouslyUsed(): boolean;
  markUsed(): void;
}

export interface StorageDurabilityStatus {
  readonly supported: boolean;
  readonly granted: boolean;
}

export type BackupExportOptions =
  | { readonly encryption: 'passphrase'; readonly passphrase: string }
  | { readonly encryption: 'none' };

export interface BackupImportOptions {
  readonly passphrase?: string;
  readonly replaceExisting?: boolean;
}

export interface DraftRepository<T extends WorkspaceDraftRecord> {
  create(record: T): Promise<void>;
  get(id: string): Promise<T | undefined>;
  list(): Promise<T[]>;
  update(id: string, changes: DraftChanges<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

export interface ApprovedVersionRepository {
  create(version: ApprovedVersionRecord): Promise<void>;
  approveDraft(
    recordType: WorkspaceDraftRecord['recordType'],
    recordId: string,
    input: ApprovalInput,
  ): Promise<ApprovedVersionRecord>;
  get(id: string): Promise<ApprovedVersionRecord | undefined>;
  list(recordType: WorkspaceDraftRecord['recordType'], recordId: string): Promise<ApprovedVersionRecord[]>;
}

export interface LocalFoodStore {
  readonly ingredients: DraftRepository<IngredientRecord>;
  readonly formulations: DraftRepository<FormulationRecord>;
  readonly products: DraftRepository<ProductRecord>;
  readonly labels: {
    create(record: LabelDraftRecord): Promise<void>;
    get(id: string): Promise<LabelDraftRecord | undefined>;
    list(): Promise<LabelDraftRecord[]>;
    update(id: string, changes: Pick<LabelDraftRecord, 'name' | 'layout' | 'dependencySignature' | 'additiveWording' | 'claims' | 'claimCandidateDecisions' | 'packCopy' | 'includeDailyIntake'>): Promise<LabelDraftRecord>;
  };
  readonly approvedVersions: ApprovedVersionRepository;
  saveIngredientWithComposition(ingredient: IngredientRecord, composition: FormulationRecord, isNew: boolean): Promise<void>;
  readonly workspaceWasPreviouslyUsed: boolean;
  readonly workspaceUsageMarkerAvailable: boolean;
  readonly previousWorkspaceAvailable: boolean;
  readonly recoveryPoints: {
    list(): Promise<RecoveryPointRecord[]>;
  };
  exportBackup(options: BackupExportOptions): Promise<string>;
  inspectBackup(backup: string, passphrase?: string): Promise<RestoreInspection>;
  restoreBackup(backup: string, options?: BackupImportOptions): Promise<RestoreInspection>;
  copyPreviousWorkspace(): Promise<WorkspaceRecordCounts>;
  requestDurableStorage(): Promise<StorageDurabilityStatus>;
  close(): void;
}

export class RepositoryConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RepositoryConflictError';
  }
}

export class RepositoryNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RepositoryNotFoundError';
  }
}

export class RepositoryCycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RepositoryCycleError';
  }
}

export class RecordValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecordValidationError';
  }
}

export class BackupFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupFormatError';
  }
}

export class BackupIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupIntegrityError';
  }
}

export class BackupPassphraseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupPassphraseError';
  }
}

export class RestoreConflictError extends Error {
  constructor(readonly inspection: RestoreInspection) {
    super('Workspace data already exists; inspect the differences and explicitly confirm replacement');
    this.name = 'RestoreConflictError';
  }
}

export class StorageMarkerWriteError extends Error {
  constructor(cause: unknown) {
    super('Workspace data was saved, but the non-sensitive usage marker could not be updated', { cause });
    this.name = 'StorageMarkerWriteError';
  }
}

export class StoreIntegrityError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'StoreIntegrityError';
  }
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoDateTime(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const parsed = new Date(value);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value;
}

function isIsoDateOrDateTime(value: unknown): value is string {
  return isIsoDate(value) || isIsoDateTime(value);
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validNutrientEvidence(value: unknown, units: readonly string[]): boolean {
  return isRecord(value)
    && typeof value.value === 'string' && /^\d+(\.\d+)?$/.test(value.value)
    && Number.isFinite(Number(value.value)) && units.includes(String(value.unit))
    && typeof value.sourceId === 'string' && (value.sourceDate === '' || isIsoDate(value.sourceDate))
    && ['supplier', 'analysis', 'database', 'calculated', 'productLabel', 'user'].includes(String(value.evidenceType))
    && (value.method === undefined || typeof value.method === 'string')
    && (value.expression === undefined || isNonEmpty(value.expression));
}

function validateMassQuantity(value: unknown, path: string): void {
  if (
    !isRecord(value)
    || typeof value.value !== 'string'
    || !/^(?:\d+)(?:\.\d+)?$/.test(value.value)
    || !Number.isFinite(Number(value.value))
    || Number(value.value) <= 0
    || !['mg', 'g', 'kg'].includes(String(value.unit))
  ) {
    throw new RecordValidationError(`${path} must be a positive mass quantity in mg, g, or kg`);
  }
}

function validateUnquantifiedLines(lines: readonly unknown[], lineIds: Set<string>, label: string): void {
  for (const [index, line] of lines.entries()) {
    if (!isRecord(line) || !isNonEmpty(line.id) || lineIds.has(line.id)
      || (line.kind === 'ingredient' ? !isNonEmpty(line.ingredientId)
        : line.kind === 'formulation' ? !isNonEmpty(line.formulationId) : true)
      || (line.additiveUse !== undefined && (line.kind !== 'ingredient'
        || !['added', 'processingAid', 'unknown'].includes(String(line.additiveUse))))
      || (line.unit !== undefined && !['mg', 'g', 'kg'].includes(String(line.unit)))
      || line.quantity !== undefined) {
      throw new RecordValidationError(`${label} ${index} must have a unique id and a valid reference`);
    }
    lineIds.add(line.id);
  }
}

function validateLineOrder(value: unknown, lineIds: Set<string>, label: string): void {
  if (!Array.isArray(value) || value.length !== lineIds.size
    || new Set(value).size !== lineIds.size || value.some((id) => !lineIds.has(id))) {
    throw new RecordValidationError(`${label} line order must contain each line once`);
  }
}

function validateAdditiveDeclarationSelection(selection: unknown, path: string): void {
  const allowedRoutes: readonly AdditiveDeclarationRoute[] = [
    'schedule7Class', 'noSchedule7Class', 'enzyme', 'flavouring',
    'specifiedFlavouringSubstance', 'addedCaffeine', 'unknown',
  ];
  const allowedChoices: readonly AdditiveDeclarationSubstanceChoice[] = [
    'schedule8Name', 'schedule8CodeNumber',
  ];
  if (
    !isRecord(selection)
    || typeof selection.route !== 'string'
    || !allowedRoutes.some((route) => route === selection.route)
    || (selection.schedule7ClassName !== undefined && typeof selection.schedule7ClassName !== 'string')
    || (selection.substanceChoice !== undefined
      && (typeof selection.substanceChoice !== 'string'
        || !allowedChoices.some((choice) => choice === selection.substanceChoice)))
    || (selection.flavouringWording !== undefined
      && !['flavouring', 'flavour', 'specificName'].includes(String(selection.flavouringWording)))
  ) {
    throw new RecordValidationError(`${path} is malformed`);
  }
}

function validateAdditiveSource(
  value: unknown,
  path: string,
  ids: Set<string>,
): asserts value is IngredientAdditiveSource {
  const allowedStatuses: readonly AdditiveSourceStatus[] = [
    'added',
    'carriedOver',
    'processingAid',
    'unknown',
  ];
  const allowedUnits: readonly AdditiveConcentrationUnit[] = [
    'mgPerKg',
    'gPerKg',
    'mgPerL',
    'gPerL',
    'mgPer100g',
    'gPer100g',
    'mgPer100mL',
    'gPer100mL',
    'percentByMass',
    'percentByVolume',
  ];
  const allowedBases: readonly AdditiveConcentrationBasis[] = [
    'asSupplied',
    'dryMatter',
    'asAdded',
    'asPrepared',
    'asReconstituted',
    'asDrained',
    'unknown',
  ];
  const allowedEvidenceKinds: readonly AdditiveSourceEvidenceKind[] = [
    'supplierSpecification',
    'certificateOfAnalysis',
    'formulationRecord',
    'productPackaging',
    'processRecord',
    'other',
  ];

  if (
    !isRecord(value)
    || !isNonEmpty(value.id)
    || ids.has(value.id)
    || !isNonEmpty(value.additiveName)
    || (value.codeNumber !== undefined && !isNonEmpty(value.codeNumber))
    || (value.technologicalPurposes !== undefined
      && (
        !Array.isArray(value.technologicalPurposes)
        || !value.technologicalPurposes.every(isNonEmpty)
      ))
    || typeof value.sourceStatus !== 'string'
    || !allowedStatuses.some((status) => status === value.sourceStatus)
  ) {
    throw new RecordValidationError(`${path} must have an identity, unique id, valid purposes, and source status`);
  }
  ids.add(value.id);

  if (value.concentration !== undefined) {
    const concentration = value.concentration;
    if (
      !isRecord(concentration)
      || typeof concentration.value !== 'string'
      || !/^(?:\d+)(?:\.\d+)?$/.test(concentration.value)
      || !Number.isFinite(Number(concentration.value))
      || Number(concentration.value) <= 0
      || typeof concentration.unit !== 'string'
      || !allowedUnits.some((unit) => unit === concentration.unit)
      || typeof concentration.basis !== 'string'
      || !allowedBases.some((basis) => basis === concentration.basis)
      || (concentration.calculatedAs !== undefined
        && (typeof concentration.calculatedAs !== 'string'
          || concentration.calculatedAs.trim() === ''
          || concentration.calculatedAs.length > 80))
    ) {
      throw new RecordValidationError(`${path}.concentration must have a positive value, unit, and basis`);
    }
  }

  if (value.sourceEvidence !== undefined) {
    if (!Array.isArray(value.sourceEvidence)) {
      throw new RecordValidationError(`${path}.sourceEvidence must be an array when present`);
    }
    for (const [index, evidence] of value.sourceEvidence.entries()) {
      if (
        !isRecord(evidence)
        || !isNonEmpty(evidence.id)
        || ids.has(evidence.id)
        || typeof evidence.reference !== 'string'
        || !(evidence.sourceDate === '' || isIsoDate(evidence.sourceDate))
        || typeof evidence.kind !== 'string'
        || !allowedEvidenceKinds.some((kind) => kind === evidence.kind)
      ) {
        throw new RecordValidationError(
          `${path}.sourceEvidence[${index}] must have a unique id, reference, valid date, and supported evidence type`,
        );
      }
      ids.add(evidence.id);
    }
  }

  if (value.declarationSelection !== undefined) {
    validateAdditiveDeclarationSelection(value.declarationSelection, `${path}.declarationSelection`);
  }

  if (value.allergenAssessments !== undefined) {
    const allowedStatuses: readonly AllergenEvidenceStatus[] = [
      'present',
      'absent',
      'unknown',
      'exemption_review',
      'conflict',
    ];
    if (
      !isRecord(value.allergenAssessments)
      || !Object.entries(value.allergenAssessments).every(([allergenId, status]) =>
        isNonEmpty(allergenId)
        && typeof status === 'string'
        && allowedStatuses.some((allowed) => allowed === status))
    ) {
      throw new RecordValidationError(`${path}.allergenAssessments must use supported allergen statuses`);
    }
  }
}

function validateIngredientAdditiveSources(value: unknown, ingredientId: string): void {
  if (!Array.isArray(value)) {
    throw new RecordValidationError('additiveSources must be an array when present');
  }
  const ids = new Set<string>();
  for (const [index, source] of value.entries()) {
    validateAdditiveSource(source, `additiveSources[${index}] for ${ingredientId}`, ids);
  }
}

function validateClassificationEvidence(
  value: unknown,
  path: string,
  ids: Set<string>,
): asserts value is ProductClassificationEvidence {
  const allowedKinds: readonly ClassificationEvidenceKind[] = [
    'supplierSpecification',
    'formulationRecord',
    'productPackaging',
    'productBrief',
    'processRecord',
    'other',
  ];
  if (
    !isRecord(value)
    || !isNonEmpty(value.id)
    || ids.has(value.id)
    || !isNonEmpty(value.reference)
    || !(value.sourceDate === '' || isIsoDate(value.sourceDate))
    || typeof value.kind !== 'string'
    || !allowedKinds.some((kind) => kind === value.kind)
  ) {
    throw new RecordValidationError(`${path} must have a unique id, reference, optional valid date, and supported evidence type`);
  }
  ids.add(value.id);
}

function validateClassificationFact(
  value: unknown,
  path: string,
  ids: Set<string>,
): void {
  const allowedAnswers: readonly ClassificationAnswer[] = ['yes', 'no', 'unknown', 'conflicting'];
  if (!isRecord(value) || !allowedAnswers.includes(value.answer as ClassificationAnswer) || !Array.isArray(value.evidence)) {
    throw new RecordValidationError(`${path} must have a supported answer and evidence list`);
  }
  for (const [index, evidence] of value.evidence.entries()) {
    validateClassificationEvidence(evidence, `${path}.evidence[${index}]`, ids);
  }
  if (value.previousEvidence !== undefined) {
    if (!Array.isArray(value.previousEvidence)) {
      throw new RecordValidationError(`${path}.previousEvidence must be an array when present`);
    }
    for (const [index, evidence] of value.previousEvidence.entries()) {
      validateClassificationEvidence(evidence, `${path}.previousEvidence[${index}]`, ids);
    }
  }
}

function validateClassificationProfile(value: unknown): void {
  if (
    !isRecord(value)
    || typeof value.intendedUseDescription !== 'string'
    || typeof value.intendedConsumerDescription !== 'string'
    || typeof value.processingDescription !== 'string'
    || typeof value.presentationDescription !== 'string'
    || !Array.isArray(value.identityEvidence)
    || !isRecord(value.formulatedCaffeinatedBeverage)
    || !isRecord(value.foodForInfants)
  ) {
    throw new RecordValidationError('Product classification profile is malformed');
  }
  const caffeinatedBeverage = value.formulatedCaffeinatedBeverage;
  const foodForInfants = value.foodForInfants;
  if (!isRecord(caffeinatedBeverage) || !isRecord(foodForInfants)) {
    throw new RecordValidationError('Product classification cohorts must be objects');
  }
  const evidenceIds = new Set<string>();
  for (const [index, evidence] of value.identityEvidence.entries()) {
    validateClassificationEvidence(evidence, `classificationProfile.identityEvidence[${index}]`, evidenceIds);
  }
  const factGroups = [
    [
      'flavoured',
      'nonAlcoholic',
      'containsCaffeine',
      'representedForMentalPerformance',
    ].map((key) => [key, caffeinatedBeverage[key]] as const),
    [
      'intendedAsNourishmentForInfants',
      'infantFormulaProduct',
      'formulatedMealReplacement',
      'formulatedSupplementaryFood',
      'unprocessedFruitOrVegetables',
    ].map((key) => [key, foodForInfants[key]] as const),
  ];
  for (const [groupIndex, group] of factGroups.entries()) {
    for (const [key, fact] of group) {
      validateClassificationFact(fact, `classificationProfile[${groupIndex}].${key}`, evidenceIds);
    }
  }
}

function validateAdditiveNameInputs(value: unknown): void {
  const fail = (message: string): never => {
    throw new RecordValidationError(`additiveNameInputs ${message}`);
  };
  if (!isRecord(value)) {
    return fail('must be an object');
  }
  const cohorts = value.confirmedCohorts;
  if (
    !Array.isArray(cohorts)
    || !cohorts.every((cohort) => cohort === 'formulated_caffeinated_beverage' || cohort === 'food_for_infants')
    || new Set(cohorts).size !== cohorts.length
  ) {
    fail('confirmedCohorts must list each supported cohort at most once');
  }
  const decimal = /^\d+(\.\d+)?$/;
  if (value.additiveCategoryId !== undefined && !isNonEmpty(value.additiveCategoryId)) {
    fail('additiveCategoryId must be a non-empty string when present');
  }
  if (value.outputUnit !== undefined && value.outputUnit !== 'mg/kg' && value.outputUnit !== 'mg/L') {
    fail('outputUnit must be mg/kg or mg/L');
  }
  for (const key of ['noProcessMassChangeConfirmed', 'gmpConfirmed', 'sugarsBasisConfirmed']) {
    if (value[key] !== undefined && typeof value[key] !== 'boolean') {
      fail(`${key} must be a boolean when present`);
    }
  }
  if (
    value.addedSugarsPer100g !== undefined
    && (typeof value.addedSugarsPer100g !== 'string' || !decimal.test(value.addedSugarsPer100g))
  ) {
    fail('addedSugarsPer100g must be a non-negative decimal string');
  }
  const evidence = value.evidence;
  if (
    evidence !== undefined
    && (!isRecord(evidence) || typeof evidence.reference !== 'string'
      || !(evidence.sourceDate === '' || isIsoDate(evidence.sourceDate)))
  ) {
    fail('evidence needs a reference field and a valid date if supplied');
  }
  const density = value.finalDensity;
  if (
    density !== undefined
    && (
      !isRecord(density)
      || typeof density.gramsPerMillilitre !== 'string'
      || !decimal.test(density.gramsPerMillilitre)
      || Number(density.gramsPerMillilitre) <= 0
      || typeof density.evidenceReference !== 'string'
      || !(density.sourceDate === '' || isIsoDate(density.sourceDate))
    )
  ) {
    fail('finalDensity needs a positive g/mL value, an evidence reference and a valid date');
  }
}

function validateClaims(value: unknown, recordName = 'claims'): void {
  const classifications: readonly unknown[] = ['nutrition_content', 'comparative', 'health', 'not_code_regulated'];
  const fail = (message: string): never => {
    throw new RecordValidationError(`${recordName} ${message}`);
  };
  if (!Array.isArray(value)) {
    return fail('must be a list');
  }
  const ids = new Set<string>();
  for (const claim of value) {
    if (!isRecord(claim) || !isNonEmpty(claim.id) || ids.has(claim.id)) {
      return fail('each claim needs a unique id');
    }
    ids.add(claim.id);
    // Text is kept exactly as entered (CLAIM-006); only emptiness is rejected.
    if (typeof claim.text !== 'string' || claim.text.trim() === '') {
      return fail('each claim needs its text');
    }
    if (claim.classification !== undefined && !classifications.includes(claim.classification)) {
      return fail('classification is unsupported');
    }
    if (claim.sourceCandidateKey !== undefined && !isNonEmpty(claim.sourceCandidateKey)) {
      return fail('sourceCandidateKey must be a non-empty string when present');
    }
    if (claim.classificationConfirmed !== undefined && typeof claim.classificationConfirmed !== 'boolean') {
      return fail('classificationConfirmed must be a boolean when present');
    }
    if (claim.classificationConfirmed === true && claim.classification === undefined) {
      return fail('a classification cannot be confirmed before it is chosen');
    }
    if (claim.supportedClaimId !== undefined) {
      if (!isNonEmpty(claim.supportedClaimId)) {
        return fail('supportedClaimId must be a non-empty string when present');
      }
      if (claim.classification !== 'nutrition_content') {
        return fail('supportedClaimId is only allowed on a nutrition content claim');
      }
    }
    const amount = claim.nutrientAmount;
    if (
      amount !== undefined
      && (
        !isRecord(amount)
        || typeof amount.value !== 'string'
        || !/^\d+(\.\d+)?$/.test(amount.value)
        || !isNonEmpty(amount.unit)
      )
    ) {
      return fail('nutrientAmount needs a non-negative decimal value and a unit');
    }
    const evidence = claim.evidence;
    if (
      evidence !== undefined
      && (!isRecord(evidence) || typeof evidence.reference !== 'string'
        || !(evidence.sourceDate === '' || isIsoDate(evidence.sourceDate)))
    ) {
      return fail('evidence needs a reference field and a valid date if supplied');
    }
  }
}

function validatePackDetails(value: unknown): void {
  if (!isRecord(value)) {
    throw new RecordValidationError('packDetails must be an object');
  }
  for (const key of ['servingSize', 'servingsPerPack', 'netQuantity']) {
    const entry = value[key];
    if (entry !== undefined && (typeof entry !== 'string' || !/^\d+(\.\d+)?$/.test(entry) || !Number.isFinite(Number(entry)) || Number(entry) <= 0)) {
      throw new RecordValidationError(`packDetails ${key} must be a positive decimal string when present`);
    }
  }
  if (value.netUnit !== undefined && value.netUnit !== 'g' && value.netUnit !== 'mL') {
    throw new RecordValidationError('packDetails netUnit must be g or mL');
  }
  if (value.servingUnit !== undefined && value.servingUnit !== 'g' && value.servingUnit !== 'mL') {
    throw new RecordValidationError('packDetails servingUnit must be g or mL');
  }
  if (value.nutritionFoodForm !== undefined && value.nutritionFoodForm !== 'solid' && value.nutritionFoodForm !== 'liquid') {
    throw new RecordValidationError('packDetails nutritionFoodForm must be solid or liquid');
  }
  if (value.nutritionRecipeSignature !== undefined && !isNonEmpty(value.nutritionRecipeSignature)) {
    throw new RecordValidationError('packDetails nutritionRecipeSignature must be non-empty');
  }
  if (value.nutritionDensity !== undefined) {
    const density = value.nutritionDensity;
    if (!isRecord(density) || typeof density.gramsPerMillilitre !== 'string'
      || !/^\d+(\.\d+)?$/.test(density.gramsPerMillilitre)
      || !Number.isFinite(Number(density.gramsPerMillilitre)) || Number(density.gramsPerMillilitre) <= 0
      || typeof density.evidenceReference !== 'string'
      || !(density.sourceDate === '' || isIsoDate(density.sourceDate))) {
      throw new RecordValidationError('packDetails nutritionDensity needs a positive value and a valid date if supplied');
    }
  }
}

function validatePreparation(value: unknown): void {
  if (!isRecord(value) || typeof value.enabled !== 'boolean'
    || (value.kind !== undefined && value.kind !== 'reconstituted' && value.kind !== 'withFood')
    || (value.directions !== undefined && (typeof value.directions !== 'string' || value.directions.length > 1000))
    || (value.addedIngredientId !== undefined && !isNonEmpty(value.addedIngredientId))
    || (value.mixingConfirmed !== undefined && typeof value.mixingConfirmed !== 'boolean')
    || (value.confirmationSnapshot !== undefined && !isNonEmpty(value.confirmationSnapshot))) {
    throw new RecordValidationError('Preparation details need a valid selection and directions');
  }
  for (const key of ['productAmount', 'addedAmount', 'preparedServing']) {
    const amount = value[key];
    if (amount !== undefined && (!isRecord(amount)
      || typeof amount.value !== 'string' || !/^\d+(\.\d+)?$/.test(amount.value)
      || !Number.isFinite(Number(amount.value)) || Number(amount.value) <= 0
      || (amount.unit !== 'g' && amount.unit !== 'mL'))) {
      throw new RecordValidationError(`Preparation ${key} needs a positive amount in g or mL`);
    }
  }
  if (value.preparedDensity !== undefined) validatePackDetails({ nutritionDensity: value.preparedDensity });
}

function validateDraining(value: unknown): void {
  const ids: readonly string[] = ['energy', 'protein', 'fat', 'saturatedFat', 'carbohydrate', 'sugars', 'sodium'];
  if (!isRecord(value) || typeof value.enabled !== 'boolean'
    || (value.directions !== undefined && (!isNonEmpty(value.directions) || value.directions.length > 1000))
    || (value.servingGrams !== undefined && (typeof value.servingGrams !== 'string'
      || !/^\d+(\.\d+)?$/.test(value.servingGrams) || !Number.isFinite(Number(value.servingGrams))
      || Number(value.servingGrams) <= 0))
    || (value.sourceType !== undefined && !['supplier', 'analysis', 'database', 'calculated', 'productLabel', 'user'].includes(String(value.sourceType)))
    || (value.sourceReference !== undefined && (!isNonEmpty(value.sourceReference) || value.sourceReference.length > 120))
    || (value.sourceDate !== undefined && !isIsoDate(value.sourceDate))
    || (value.confirmationSnapshot !== undefined && !isNonEmpty(value.confirmationSnapshot))
    || !isRecord(value.values)
    || Object.entries(value.values).some(([id, amount]) => !ids.includes(id) || typeof amount !== 'string'
      || !/^\d+(\.\d+)?$/.test(amount) || !Number.isFinite(Number(amount)))) {
    throw new RecordValidationError('Draining details need valid directions, amounts and nutrition evidence');
  }
}

function validateClaimFacts(value: unknown): void {
  const fail = (message: string): never => {
    throw new RecordValidationError(`claimFacts ${message}`);
  };
  if (!isRecord(value)) {
    return fail('must be an object');
  }
  if (value.foodForm !== undefined && value.foodForm !== 'liquid' && value.foodForm !== 'solid') {
    fail('foodForm must be liquid or solid');
  }
  for (const key of ['formOfFoodConfirmed', 'servingConfirmed']) {
    if (value[key] !== undefined && typeof value[key] !== 'boolean') {
      fail(`${key} must be a boolean when present`);
    }
  }
  const contexts = value.prohibitedContexts;
  if (contexts !== undefined) {
    if (!isRecord(contexts)) {
      return fail('prohibitedContexts must be an object');
    }
    for (const key of ['infantFormulaProduct', 'kava', 'alcoholAbove1_15Percent']) {
      if (contexts[key] !== undefined && typeof contexts[key] !== 'boolean') {
        fail(`prohibitedContexts.${key} must be a boolean when present`);
      }
    }
  }
}

function isWorkspaceDraftRecord(value: unknown): value is WorkspaceDraftRecord {
  if (
    !isRecord(value)
    || !isNonEmpty(value.id)
    || !isNonEmpty(value.name)
    || !Array.isArray(value.tags)
    || !value.tags.every(isNonEmpty)
    || !isIsoDateTime(value.createdAt)
    || !isIsoDateTime(value.updatedAt)
  ) {
    return false;
  }
  if (value.recordType === 'ingredient') {
    return value.kind === 'atomic' || value.kind === 'compound';
  }
  if (value.recordType === 'formulation') {
    return Array.isArray(value.lines);
  }
  return value.recordType === 'product' && isNonEmpty(value.formulationId);
}

function validSupplierStatements(statements: unknown): boolean {
  return Array.isArray(statements) && statements.length > 0
    && statements.every((statement: unknown) => isRecord(statement)
      && ['present', 'absent'].includes(String(statement.status))
      && isRecord(statement.specification) && isNonEmpty(statement.specification.reference)
      && isIsoDate(statement.specification.sourceDate));
}

function validOptionalSourceDetails(specification: unknown): boolean {
  return isRecord(specification)
    && typeof specification.reference === 'string'
    && typeof specification.sourceDate === 'string'
    && (specification.sourceDate === '' || isIsoDate(specification.sourceDate));
}

function validateDraftRecord(record: WorkspaceDraftRecord): void {
  if (!isWorkspaceDraftRecord(record)) {
    throw new RecordValidationError('Draft record is malformed or has an unsupported type');
  }
  if (!isNonEmpty(record.id) || !isNonEmpty(record.name)) {
    throw new RecordValidationError('Draft id and name must be non-empty strings');
  }
  if (!Array.isArray(record.tags) || record.tags.some((tag) => !isNonEmpty(tag))) {
    throw new RecordValidationError('Draft tags must be non-empty strings');
  }
  if (new Set(record.tags).size !== record.tags.length) {
    throw new RecordValidationError('Draft tags must be unique');
  }
  if (!isIsoDateTime(record.createdAt) || !isIsoDateTime(record.updatedAt)) {
    throw new RecordValidationError('Draft timestamps must be ISO date-time strings');
  }
  if (record.recordType === 'ingredient') {
    if (!['atomic', 'compound'].includes(record.kind)) {
      throw new RecordValidationError('Ingredient kind is unsupported');
    }
    if (record.kind === 'atomic' && record.compoundFormulationId !== undefined) {
      throw new RecordValidationError('Atomic ingredients cannot reference a compound formulation');
    }
    if (record.compoundFormulationId !== undefined && !isNonEmpty(record.compoundFormulationId)) {
      throw new RecordValidationError('compoundFormulationId must be a non-empty string when present');
    }
    if (record.compoundNutritionBasis !== undefined
      && (record.kind !== 'compound' || !['components', 'whole'].includes(record.compoundNutritionBasis))) {
      throw new RecordValidationError('Compound nutrition basis must be components or whole');
    }
    if (record.supplierName !== undefined && typeof record.supplierName !== 'string') {
      throw new RecordValidationError('supplierName must be a string when present');
    }
    if (
      record.specification !== undefined
      && (
        !isRecord(record.specification)
        || !isNonEmpty(record.specification.reference)
        || !isIsoDate(record.specification.sourceDate)
        || (
          record.specification.supplierProductCode !== undefined
          && typeof record.specification.supplierProductCode !== 'string'
        )
      )
    ) {
      throw new RecordValidationError('Supplier specification must include a reference and valid source date');
    }
    if (
      record.nutrientProfile !== undefined
      && (
        !isRecord(record.nutrientProfile)
        || record.nutrientProfile.ingredientId !== record.id
        || !isRecord(record.nutrientProfile.values)
      )
    ) {
      throw new RecordValidationError('Nutrient profile must match the ingredient id and contain values');
    }
    if (record.nutrientProfile !== undefined) {
      const ids: readonly string[] = nutrientIds;
      if (Object.entries(record.nutrientProfile.values).some(([key, evidence]) =>
        !ids.includes(key) || !validNutrientEvidence(evidence, ['g/100g', 'mg/100g', 'ug/100g']))) {
        throw new RecordValidationError('Nutrient profile needs supported nutrients, non-negative values, units and sources');
      }
    }
    if (record.energyPer100g !== undefined) {
      const energy = record.energyPer100g;
      if (!isRecord(energy) || typeof energy.value !== 'string' || !/^\d+(\.\d+)?$/.test(energy.value)
        || !Number.isFinite(Number(energy.value)) || typeof energy.sourceId !== 'string'
        || !(energy.sourceDate === '' || isIsoDate(energy.sourceDate))) {
        throw new RecordValidationError('energyPer100g needs a non-negative value, reference and valid date');
      }
    }
    if (record.nutritionEntrySource !== undefined) {
      const source = record.nutritionEntrySource;
      if (!isRecord(source)
        || !['supplier', 'analysis', 'database', 'calculated', 'productLabel', 'user'].includes(String(source.sourceType))
        || typeof source.sourceId !== 'string' || !(source.sourceDate === '' || isIsoDate(source.sourceDate))) {
        throw new RecordValidationError('Nutrition source needs a source type, reference and valid date');
      }
    }
    if (record.ingredientDensity !== undefined) {
      const density = record.ingredientDensity;
      if (!isRecord(density) || typeof density.gramsPerMillilitre !== 'string'
        || !/^\d+(\.\d+)?$/.test(density.gramsPerMillilitre)
        || !Number.isFinite(Number(density.gramsPerMillilitre)) || Number(density.gramsPerMillilitre) <= 0
        || typeof density.evidenceReference !== 'string' || !(density.sourceDate === '' || isIsoDate(density.sourceDate))) {
        throw new RecordValidationError('Ingredient density needs a positive g/mL value, reference and valid date');
      }
    }
    if (record.allergenEvidence !== undefined && !Array.isArray(record.allergenEvidence)) {
      throw new RecordValidationError('allergenEvidence must be an array when present');
    }
    if (record.allergensConfirmed !== undefined && typeof record.allergensConfirmed !== 'boolean') {
      throw new RecordValidationError('allergensConfirmed must be a boolean');
    }
    if (record.wheatGlutenStatus !== undefined
      && record.wheatGlutenStatus !== 'present' && record.wheatGlutenStatus !== 'absent') {
      throw new RecordValidationError('wheatGlutenStatus must be present or absent');
    }
    if (record.allergenCoverage !== undefined) {
      const coverage = record.allergenCoverage;
      if (!isRecord(coverage)
        || !['supplier', 'analysis', 'database', 'calculated', 'productLabel', 'user'].includes(String(coverage.sourceType))
        || typeof coverage.sourceId !== 'string' || !(coverage.sourceDate === '' || isIsoDate(coverage.sourceDate))
        || !isRecord(coverage.assessments)
        || (coverage.wheatGlutenStatus !== undefined
          && coverage.wheatGlutenStatus !== 'present' && coverage.wheatGlutenStatus !== 'absent')
        || Object.values(coverage.assessments).some((status) =>
          !['present', 'absent', 'unknown', 'exemption_review', 'conflict'].includes(String(status)))) {
        throw new RecordValidationError('Allergen coverage needs a source type, dated reference and valid assessments');
      }
    }
    if (record.additiveSources !== undefined) {
      validateIngredientAdditiveSources(record.additiveSources, record.id);
    }
    if (record.directAdditiveSourceId !== undefined
      && (!isNonEmpty(record.directAdditiveSourceId) || record.kind !== 'atomic'
        || !Array.isArray(record.additiveSources)
        || !record.additiveSources.some((source) => isRecord(source)
          && source.id === record.directAdditiveSourceId && source.additiveName === record.name))) {
      throw new RecordValidationError('A direct additive must refer to a matching additive source on a single ingredient');
    }
    if (record.additivesConfirmed !== undefined && typeof record.additivesConfirmed !== 'boolean') {
      throw new RecordValidationError('additivesConfirmed must be a boolean');
    }
    if (record.additiveCoverage !== undefined) {
      const coverage = record.additiveCoverage;
      if (!isRecord(coverage)
        || !['supplier', 'analysis', 'database', 'calculated', 'productLabel', 'user'].includes(String(coverage.sourceType))
        || typeof coverage.sourceId !== 'string' || !(coverage.sourceDate === '' || isIsoDate(coverage.sourceDate))
        || typeof coverage.sourcesSnapshot !== 'string') {
        throw new RecordValidationError('Additive coverage needs a source type, dated reference and source snapshot');
      }
    }
    if (record.coverageSpecification !== undefined
      && (!isRecord(record.coverageSpecification) || !isNonEmpty(record.coverageSpecification.reference)
        || !isIsoDate(record.coverageSpecification.sourceDate))) {
      throw new RecordValidationError('coverageSpecification must include a reference and valid source date');
    }
    if (record.caffeineEvidence !== undefined) {
      const evidence = record.caffeineEvidence;
      if (!isRecord(evidence) || !['present', 'absent', 'conflicting'].includes(String(evidence.status))
        || !validOptionalSourceDetails(evidence.specification)
        || (evidence.status === 'present'
          ? typeof evidence.amount !== 'string' || !/^\d+(\.\d+)?$/.test(evidence.amount)
            || !Number.isFinite(Number(evidence.amount)) || Number(evidence.amount) <= 0
            || (evidence.unit === 'g/100g' && Number(evidence.amount) > 100)
            || (evidence.unit === 'mg/100g' && Number(evidence.amount) > 100000)
            || !['g/100g', 'mg/100g', 'mg/100mL'].includes(String(evidence.unit))
          : evidence.amount !== undefined || evidence.unit !== undefined)) {
        throw new RecordValidationError('Caffeine evidence needs a status and a positive amount and unit only when present');
      }
      if (evidence.statements !== undefined) {
        if (evidence.status !== 'conflicting' || !Array.isArray(evidence.statements) || evidence.statements.length !== 2) {
          throw new RecordValidationError('Conflicting caffeine evidence needs two statements');
        }
        for (const statement of evidence.statements) {
          if (!isRecord(statement) || !['present', 'absent'].includes(String(statement.status))
            || !validOptionalSourceDetails(statement.specification)
            || (statement.status === 'present'
              ? typeof statement.amount !== 'string' || !/^\d+(\.\d+)?$/.test(statement.amount)
                || !Number.isFinite(Number(statement.amount)) || Number(statement.amount) <= 0
                || (statement.unit === 'g/100g' && Number(statement.amount) > 100)
                || (statement.unit === 'mg/100g' && Number(statement.amount) > 100000)
                || !['g/100g', 'mg/100g', 'mg/100mL'].includes(String(statement.unit))
              : statement.amount !== undefined || statement.unit !== undefined)) {
            throw new RecordValidationError('Each caffeine statement needs a status and, when present, a positive amount and unit');
          }
        }
      }
      if (evidence.decisions !== undefined && (
        evidence.status !== 'conflicting' || !Array.isArray(evidence.statements)
        || !Array.isArray(evidence.decisions) || evidence.decisions.length === 0
        || evidence.decisions.some((decision: unknown) => !isRecord(decision)
          || !['statement1', 'statement2', 'unresolved'].includes(String(decision.choice))
          || !isNonEmpty(decision.reason) || !isIsoDateTime(decision.recordedAt))
      )) {
        throw new RecordValidationError('Caffeine conflict decisions need two statements, a choice, an explanation and a valid time');
      }
    }
    if (record.ingredientIdentity !== undefined) {
      const identity = record.ingredientIdentity;
      if (!isRecord(identity) || identity.vocabularyVersion !== 'demo-ingredients-1'
        || !['water', 'sugar', 'citric-acid', 'caffeine', 'lemon-peel-oil', 'flavour-blend', 'unrecognised'].includes(String(identity.code))
        || !isRecord(identity.specification) || !isNonEmpty(identity.specification.reference)
        || !isIsoDate(identity.specification.sourceDate)) {
        throw new RecordValidationError('Ingredient identity needs a supported vocabulary and dated specification');
      }
    }
    if (record.nutritionPer100mL !== undefined) {
      if (!isRecord(record.nutritionPer100mL) || Object.entries(record.nutritionPer100mL).some(([key, value]) =>
        !['energy', 'protein', 'fat', 'saturatedFat', 'carbohydrate', 'sugars', 'sodium'].includes(key)
        || !isRecord(value) || typeof value.value !== 'string' || !/^\d+(\.\d+)?$/.test(value.value)
        || !Number.isFinite(Number(value.value)) || typeof value.sourceId !== 'string'
        || !(value.sourceDate === '' || isIsoDate(value.sourceDate)))) {
        throw new RecordValidationError('Per-100 mL nutrition needs non-negative values and dated sources');
      }
    }
    if (record.additionalNutritionPer100mL !== undefined) {
      const ids: readonly string[] = additionalNutrientIds;
      if (!isRecord(record.additionalNutritionPer100mL)
        || Object.entries(record.additionalNutritionPer100mL).some(([key, evidence]) =>
          !ids.includes(key) || !validNutrientEvidence(evidence, ['g/100mL', 'mg/100mL', 'ug/100mL']))) {
        throw new RecordValidationError('Additional per-100 mL nutrition needs supported nutrients, units and dated sources');
      }
    }
    if (record.supplierFacts !== undefined) {
      if (!isRecord(record.supplierFacts) || Object.entries(record.supplierFacts).some(([kind, statements]) =>
        !['fruitJuice', 'addedVitamins', 'addedTaurine'].includes(kind)
        || !validSupplierStatements(statements))) {
        throw new RecordValidationError('Supplier facts need supported topics, present or absent statements and dated specifications');
      }
    }
    if (record.otherSchedule28Statements !== undefined && !validSupplierStatements(record.otherSchedule28Statements)) {
      throw new RecordValidationError('Other Schedule 28 statements need present or absent statements and dated specifications');
    }
  } else if (record.recordType === 'formulation') {
    if (!Array.isArray(record.lines)) {
      throw new RecordValidationError('Formulation lines must be an array');
    }
    const lineIds = new Set<string>();
    for (const [index, line] of record.lines.entries()) {
      if (!isRecord(line) || !isNonEmpty(line.id) || lineIds.has(line.id)) {
        throw new RecordValidationError(`Formulation line ${index} must have a unique non-empty id`);
      }
      lineIds.add(line.id);
      if (line.kind === 'ingredient') {
        if (!isNonEmpty(line.ingredientId)) {
          throw new RecordValidationError(`Formulation line ${index} must reference an ingredient`);
        }
        if (line.additiveUse !== undefined && !['added', 'processingAid', 'unknown'].includes(String(line.additiveUse))) {
          throw new RecordValidationError(`Formulation line ${index} has an invalid additive use`);
        }
      } else if (line.kind === 'formulation') {
        if (!isNonEmpty(line.formulationId) || line.additiveUse !== undefined) {
          throw new RecordValidationError(`Formulation line ${index} must reference a formulation`);
        }
      } else {
        throw new RecordValidationError(`Formulation line ${index} has an unsupported kind`);
      }
      validateMassQuantity(line.quantity, `Formulation line ${index} quantity`);
    }
    if (record.processMassProfile !== undefined) {
      const profile = record.processMassProfile;
      if (!isRecord(profile) || !Array.isArray(profile.changes)) {
        throw new RecordValidationError('Processing details must contain a list of changes');
      }
      if ((profile.complete !== undefined && typeof profile.complete !== 'boolean')
        || (profile.entryMethod !== undefined && !['finalMass', 'changes'].includes(String(profile.entryMethod)))) {
        throw new RecordValidationError('Processing completeness or entry method is invalid');
      }
      const changeIds = new Set<string>();
      for (const [index, change] of profile.changes.entries()) {
        if (!isRecord(change) || !isNonEmpty(change.id) || changeIds.has(change.id)
          || !['addition', 'gain', 'loss'].includes(String(change.kind))
          || (change.description !== undefined && (!isNonEmpty(change.description) || change.description.length > 120))
          || (change.material !== undefined && !['water', 'other'].includes(String(change.material)))) {
          throw new RecordValidationError(`Processing change ${index} must have a unique id and valid kind`);
        }
        changeIds.add(change.id);
        if (change.mass === undefined) {
          if (profile.complete !== false) {
            throw new RecordValidationError(`Processing change ${index} needs a mass unless the profile is incomplete`);
          }
        } else {
          validateMassQuantity(change.mass, `Processing change ${index} mass`);
        }
      }
      if (profile.declaredFinalMass !== undefined) {
        validateMassQuantity(profile.declaredFinalMass, 'Final batch mass');
      }
    }
    if (record.finishedNutrition !== undefined) {
        const evidence = record.finishedNutrition;
        if (!isRecord(evidence) || typeof evidence.selected !== 'boolean'
          || (evidence.recipeSnapshot !== undefined && !isNonEmpty(evidence.recipeSnapshot))) {
          throw new RecordValidationError('Finished nutrition needs a valid selection and recipe snapshot');
        }
        if (evidence.nutrientProfile !== undefined) {
          const profile = evidence.nutrientProfile;
          const ids: readonly string[] = nutrientIds;
          if (!isRecord(profile) || profile.ingredientId !== record.id || !isRecord(profile.values)
            || Object.entries(profile.values).some(([key, value]) =>
              !ids.includes(key) || !validNutrientEvidence(value, ['g/100g', 'mg/100g', 'ug/100g']))) {
            throw new RecordValidationError('Finished nutrient evidence needs supported values and matching recipe id');
          }
        }
        if (evidence.energyPer100g !== undefined) {
          const energy = evidence.energyPer100g;
          if (!isRecord(energy) || typeof energy.value !== 'string' || !/^\d+(\.\d+)?$/.test(energy.value)
            || !Number.isFinite(Number(energy.value)) || typeof energy.sourceId !== 'string'
            || !(energy.sourceDate === '' || isIsoDate(energy.sourceDate))
            || (energy.evidenceType !== undefined
              && !['supplier', 'analysis', 'database', 'calculated', 'productLabel', 'user'].includes(String(energy.evidenceType)))) {
            throw new RecordValidationError('Finished energy needs a non-negative value and valid source');
          }
        }
        if (evidence.nutritionEntrySource !== undefined) {
          const source = evidence.nutritionEntrySource;
          if (!isRecord(source) || !['supplier', 'analysis', 'database', 'calculated', 'productLabel', 'user'].includes(String(source.sourceType))
            || typeof source.sourceId !== 'string' || !(source.sourceDate === '' || isIsoDate(source.sourceDate))) {
            throw new RecordValidationError('Finished nutrition source needs a valid type, reference and date');
          }
        }
    }
    if (record.nutrientRetention !== undefined) {
      const retention = record.nutrientRetention;
      const ids: readonly string[] = nutrientIds;
      if (!isRecord(retention) || typeof retention.selected !== 'boolean'
        || (retention.recipeSnapshot !== undefined && !isNonEmpty(retention.recipeSnapshot))
        || !isRecord(retention.factors)
        || Object.entries(retention.factors).some(([id, factor]) => !ids.includes(id) || !isRecord(factor)
          || typeof factor.percentage !== 'string'
          || (factor.percentage !== '' && !/^0*(?:\d{1,2}(?:\.\d+)?|100(?:\.0+)?)$/.test(factor.percentage))
          || typeof factor.sourceId !== 'string'
          || !(factor.sourceDate === '' || isIsoDate(factor.sourceDate)))
        || (retention.selected && isRecord(record.finishedNutrition) && record.finishedNutrition.selected === true)) {
        throw new RecordValidationError('Nutrient retention needs valid factors, sources and an exclusive selection');
      }
    }
    if (record.supplierComposition !== undefined) {
      const composition = record.supplierComposition;
      if (!isRecord(composition) || !['partial', 'complete'].includes(String(composition.coverage))
        || (composition.specification !== undefined && (!isRecord(composition.specification)
          || typeof composition.specification.reference !== 'string'
          || !(composition.specification.sourceDate === '' || isIsoDate(composition.specification.sourceDate))))
        || !Array.isArray(composition.unquantifiedComponents)
        || (composition.coverage === 'complete' && record.lines.length === 0 && composition.unquantifiedComponents.length === 0)) {
        throw new RecordValidationError('Composition needs valid optional evidence and complete compositions need at least one component');
      }
      validateUnquantifiedLines(composition.unquantifiedComponents, lineIds, 'Unquantified composition line');
      if (composition.lineOrder !== undefined) {
        validateLineOrder(composition.lineOrder, lineIds, 'Supplier composition');
      }
    }
    if (record.incompleteRecipeLines !== undefined) {
      const incomplete = record.incompleteRecipeLines;
      if (record.supplierComposition !== undefined || !isRecord(incomplete)
        || !Array.isArray(incomplete.unquantifiedLines) || incomplete.unquantifiedLines.length === 0) {
        throw new RecordValidationError('Incomplete recipe lines need unknown amounts and cannot also be a supplier composition');
      }
      validateUnquantifiedLines(incomplete.unquantifiedLines, lineIds, 'Unquantified recipe line');
      validateLineOrder(incomplete.lineOrder, lineIds, 'Recipe');
    }
  } else if (record.recordType === 'product' && !isNonEmpty(record.formulationId)) {
    throw new RecordValidationError('Product formulationId must be a non-empty string');
  } else if (
    record.recordType === 'product'
    && record.foodState !== undefined
    && !['asAdded', 'asProcessed', 'asSold', 'asPrepared', 'asReconstituted', 'asDrained'].includes(record.foodState)
  ) {
    throw new RecordValidationError('Product foodState is unsupported');
  } else if (record.recordType === 'product' && record.classificationProfile !== undefined) {
    validateClassificationProfile(record.classificationProfile);
  }
  if (record.recordType === 'product' && record.packDetails !== undefined) {
    validatePackDetails(record.packDetails);
  }
  if (record.recordType === 'product' && record.preparation !== undefined) {
    validatePreparation(record.preparation);
  }
  if (record.recordType === 'product' && record.draining !== undefined) {
    validateDraining(record.draining);
  }
  if (record.recordType === 'product' && record.consumerDirections !== undefined
    && !['unknown', 'none', 'present'].includes(record.consumerDirections)) {
    throw new RecordValidationError('Consumer directions must be unknown, none or present');
  }
  if (record.recordType === 'product' && record.otherConsumerDirections !== undefined
    && typeof record.otherConsumerDirections !== 'boolean') {
    throw new RecordValidationError('Other consumer directions must be a boolean');
  }
  if (record.recordType === 'product' && record.otherConsumerDirectionsText !== undefined
    && (typeof record.otherConsumerDirectionsText !== 'string' || record.otherConsumerDirectionsText.length > 1000)) {
    throw new RecordValidationError('Other consumer directions must be text of at most 1000 characters');
  }
  if (record.recordType === 'product' && record.builderProductType !== undefined
    && !['caffeinatedBeverage', 'infantFood', 'other'].includes(record.builderProductType)) {
    throw new RecordValidationError('builderProductType is unsupported');
  }
  if (record.recordType === 'product' && record.additiveNameInputs !== undefined) {
    validateAdditiveNameInputs(record.additiveNameInputs);
  }
  if (record.recordType === 'product' && record.claims !== undefined) {
    validateClaims(record.claims);
  }
  if (record.recordType === 'product' && record.claimFacts !== undefined) {
    validateClaimFacts(record.claimFacts);
  }
}

function validateEngineResult(value: unknown): void {
  if (
    !isRecord(value)
    || !isNonEmpty(value.title)
    || !isNonEmpty(value.whatWasChecked)
    || !isNonEmpty(value.explanation)
    || value.nonCertificationStatement !== 'This result assists review and does not certify legal compliance.'
    || !isRecord(value.rule)
    || !Array.isArray(value.inputs)
  ) {
    throw new RecordValidationError('Approved evaluation result is malformed or missing its non-certification statement');
  }
  const rule = value.rule;
  if (
    !isNonEmpty(rule.id)
    || !isNonEmpty(rule.name)
    || !isNonEmpty(rule.instrument)
    || !isNonEmpty(rule.provision)
    || typeof rule.sourceUrl !== 'string'
    || !rule.sourceUrl.startsWith('https://')
    || !isNonEmpty(rule.jurisdiction)
    || !isIsoDateTime(`${String(rule.effectiveFrom)}T00:00:00.000Z`)
    || !isNonEmpty(rule.version)
    || !['Provision', 'Standard', 'Instrument', 'Guidance-only', 'Unmapped'].includes(String(rule.mappingConfidence))
  ) {
    throw new RecordValidationError('Approved evaluation result has invalid rule trace metadata');
  }
  if (!['PASS', 'FAIL', 'WARNING', 'REVIEW REQUIRED', 'INFORMATIONAL'].includes(String(value.status))) {
    throw new RecordValidationError('Approved evaluation result has an unsupported status');
  }
  if (!['APPLIED', 'CANDIDATE', 'CONTEXT', 'UNDETERMINABLE'].includes(String(value.applicationMode))) {
    throw new RecordValidationError('Approved evaluation result has an unsupported application mode');
  }
  if (
    value.applicationMode === 'CONTEXT'
      ? value.status !== 'INFORMATIONAL'
      : value.applicationMode !== 'APPLIED' && value.status !== 'REVIEW REQUIRED'
  ) {
    throw new RecordValidationError('Approved evaluation result status is inconsistent with its application mode');
  }
  for (const [index, input] of value.inputs.entries()) {
    if (
      !isRecord(input)
      || !isNonEmpty(input.name)
      || typeof input.value !== 'string'
      || !isNonEmpty(input.sourceId)
      || !isIsoDateOrDateTime(input.sourceDate)
      || !Array.isArray(input.sourcePath)
      || !input.sourcePath.every(isNonEmpty)
    ) {
      throw new RecordValidationError(`Approved evaluation input ${index} has invalid trace data`);
    }
  }
}

function validateApprovedVersion(version: ApprovedVersionRecord): void {
  if (
    !isRecord(version)
    || !isRecord(version.reviewDecision)
    || !isRecord(version.snapshot)
    || !Array.isArray(version.results)
  ) {
    throw new RecordValidationError('Approved version, snapshot and review decision must be objects');
  }
  if (
    !isNonEmpty(version.id)
    || !isNonEmpty(version.recordId)
    || !Number.isSafeInteger(version.version)
    || version.version < 1
    || !isIsoDateTime(version.approvedAt)
    || !isNonEmpty(version.approvedBy)
  ) {
    throw new RecordValidationError('Approved version metadata is invalid');
  }
  if (
    version.snapshot.id !== version.recordId
    || version.snapshot.recordType !== version.recordType
  ) {
    throw new RecordValidationError('Approved version snapshot must match its record type and id');
  }
  if (
    !isNonEmpty(version.reviewDecision.id)
    || version.reviewDecision.versionId !== version.id
    || !['approved', 'legacy_unverified'].includes(version.reviewDecision.decision)
    || !isNonEmpty(version.reviewDecision.reviewerId)
    || !isIsoDateTime(version.reviewDecision.decidedAt)
    || !isNonEmpty(version.reviewDecision.rationale)
  ) {
    throw new RecordValidationError('Approved version review decision is invalid');
  }
  for (const result of version.results) {
    validateEngineResult(result);
  }
  validateDraftRecord(version.snapshot);
}

function isConstraintError(error: unknown): boolean {
  return error instanceof Error && error.name === 'ConstraintError';
}

export interface WorkspaceReferenceNode {
  readonly kind: 'ingredient' | 'formulation';
  readonly id: string;
  readonly name: string;
}

export function findWorkspaceReferenceCycle(
  ingredients: readonly Pick<IngredientRecord, 'id' | 'name' | 'kind' | 'compoundFormulationId'>[],
  formulations: readonly Pick<FormulationRecord, 'id' | 'name' | 'lines' | 'supplierComposition' | 'incompleteRecipeLines'>[],
): readonly WorkspaceReferenceNode[] | undefined {
  const graph = new Map<string, string[]>();
  const nodes = new Map<string, WorkspaceReferenceNode>();
  const key = (kind: WorkspaceReferenceNode['kind'], id: string): string => `${kind}:${id}`;
  for (const recipe of formulations) {
    const id = key('formulation', recipe.id);
    graph.set(id, []);
    nodes.set(id, { kind: 'formulation', id: recipe.id, name: recipe.name });
  }
  for (const ingredient of ingredients) {
    if (ingredient.kind !== 'compound' || !ingredient.compoundFormulationId
      || !graph.has(key('formulation', ingredient.compoundFormulationId))) continue;
    const id = key('ingredient', ingredient.id);
    graph.set(id, [key('formulation', ingredient.compoundFormulationId)]);
    nodes.set(id, { kind: 'ingredient', id: ingredient.id, name: ingredient.name });
  }
  for (const recipe of formulations) {
    const edges = graph.get(key('formulation', recipe.id))!;
    for (const line of [...recipe.lines, ...(recipe.supplierComposition?.unquantifiedComponents ?? []),
      ...(recipe.incompleteRecipeLines?.unquantifiedLines ?? [])]) {
      const target = line.kind === 'ingredient' ? key('ingredient', line.ingredientId) : key('formulation', line.formulationId);
      if (graph.has(target)) edges.push(target);
    }
  }
  const path = findCircularReferencePath(graph);
  return path?.map((id) => {
    const node = nodes.get(id);
    if (!node) throw new Error(`Reference graph node "${id}" is missing.`);
    return node;
  });
}

export function describeWorkspaceReferenceCycle(path: readonly WorkspaceReferenceNode[]): string {
  return path.map((node) => `${node.kind === 'formulation' ? 'Recipe' : 'Ingredient'} "${node.name}"`).join(' -> ');
}

async function assertNoCircularReferences(database: FoodLabellingDatabase): Promise<void> {
  const [ingredients, formulations] = await Promise.all([
    database.ingredients.toArray(),
    database.formulations.toArray(),
  ]);
  const cycle = findWorkspaceReferenceCycle(ingredients, formulations);
  if (cycle) throw new RepositoryCycleError(`Circular formulation reference: ${describeWorkspaceReferenceCycle(cycle)}.`);
}

function validateLabelDraft(value: unknown): asserts value is LabelDraftRecord {
  if (!isRecord(value) || !isNonEmpty(value.id) || !isNonEmpty(value.name)
    || !isNonEmpty(value.productId) || !isIsoDateTime(value.createdAt) || !isIsoDateTime(value.updatedAt)
    || !isNonEmpty(value.dependencySignature) || !isRecord(value.layout)) {
    throw new RecordValidationError('Label draft details are invalid');
  }
  const { widthMm, heightMm, orientation, margins, gapMm, textSizes } = value.layout;
  const positive = (number: unknown): number is number => typeof number === 'number' && Number.isFinite(number) && number > 0;
  const nonNegative = (number: unknown): number is number => typeof number === 'number' && Number.isFinite(number) && number >= 0;
  if (!positive(widthMm) || !positive(heightMm)
    || (orientation !== 'portrait' && orientation !== 'landscape')
    || (orientation === 'portrait' && widthMm > heightMm)
    || (orientation === 'landscape' && heightMm > widthMm)
    || !isRecord(margins) || !nonNegative(margins.topMm) || !nonNegative(margins.rightMm)
    || !nonNegative(margins.bottomMm) || !nonNegative(margins.leftMm)
    || margins.leftMm + margins.rightMm >= widthMm || margins.topMm + margins.bottomMm >= heightMm
    || !nonNegative(gapMm) || !isRecord(textSizes) || labelTextBlocks.some((block) => !positive(textSizes[block]))) {
    throw new RecordValidationError('Label dimensions, orientation, margins, spacing or text sizes are invalid');
  }
  if (value.additiveWording !== undefined) {
    if (!Array.isArray(value.additiveWording)) {
      throw new RecordValidationError('Label additive wording must be an array');
    }
    const keys = new Set<string>();
    for (const item of value.additiveWording) {
      if (!isRecord(item) || !isNonEmpty(item.ingredientId) || !isNonEmpty(item.additiveSourceId)) {
        throw new RecordValidationError('Label additive wording must identify an ingredient and additive');
      }
      const key = JSON.stringify([item.ingredientId, item.additiveSourceId]);
      if (keys.has(key)) throw new RecordValidationError('Label additive wording must not contain duplicate additives');
      keys.add(key);
      validateAdditiveDeclarationSelection(item.selection, 'Label additive wording selection');
    }
  }
  if (value.packCopy !== undefined) {
    if (!isRecord(value.packCopy)) {
      throw new RecordValidationError('Label pack copy must be an object');
    }
    for (const [field, maximum] of Object.entries(labelPackCopyMaxLengths)) {
      const entry = value.packCopy[field];
      if (entry !== undefined && (typeof entry !== 'string' || entry.length > maximum)) {
        throw new RecordValidationError(`Label pack copy ${field} must be text of at most ${maximum} characters`);
      }
    }
  }
  if (value.includeDailyIntake !== undefined && typeof value.includeDailyIntake !== 'boolean') {
    throw new RecordValidationError('Label daily-intake choice must be a boolean');
  }
  if (value.claims !== undefined) validateClaims(value.claims, 'Label claims');
  if (value.claimCandidateDecisions !== undefined) {
    if (!Array.isArray(value.claimCandidateDecisions)) {
      throw new RecordValidationError('Label claim candidate decisions must be a list');
    }
    const keys = new Set<string>();
    for (const decision of value.claimCandidateDecisions) {
      if (!isRecord(decision)
        || !isNonEmpty(decision.candidateKey)
        || keys.has(decision.candidateKey)
        || typeof decision.text !== 'string'
        || decision.text.trim() === ''
        || typeof decision.location !== 'string'
        || decision.location.trim() === ''
        || (decision.resolution !== 'claim'
          && decision.resolution !== 'not_claim'
          && decision.resolution !== 'unsure')) {
        throw new RecordValidationError('Label claim candidate decisions are invalid');
      }
      keys.add(decision.candidateKey);
    }
  }
}

class DexieLabelRepository {
  constructor(
    private readonly database: FoodLabellingDatabase,
    private readonly now: () => string,
    private readonly markUsed: () => void,
  ) {}

  async create(record: LabelDraftRecord): Promise<void> {
    validateLabelDraft(record);
    try {
      await this.database.transaction('rw', [this.database.labels, this.database.products], async () => {
        if (!await this.database.products.get(record.productId)) {
          throw new RepositoryNotFoundError('The selected product is unavailable');
        }
        await this.database.labels.add(record);
      });
      this.markUsed();
    } catch (error) {
      if (isConstraintError(error)) throw new RepositoryConflictError(`A label with id "${record.id}" already exists`);
      throw error;
    }
  }

  get(id: string): Promise<LabelDraftRecord | undefined> { return this.database.labels.get(id); }
  list(): Promise<LabelDraftRecord[]> { return this.database.labels.toArray(); }

  async update(id: string, changes: Pick<LabelDraftRecord, 'name' | 'layout' | 'dependencySignature' | 'additiveWording' | 'claims' | 'claimCandidateDecisions' | 'packCopy' | 'includeDailyIntake'>): Promise<LabelDraftRecord> {
    const updated = await this.database.transaction('rw', [this.database.labels, this.database.products], async () => {
      const current = await this.database.labels.get(id);
      if (!current) throw new RepositoryNotFoundError(`No label exists with id "${id}"`);
      if (!await this.database.products.get(current.productId)) {
        throw new RepositoryNotFoundError('The label product is unavailable');
      }
      const next = { ...current, ...changes, updatedAt: this.now() };
      validateLabelDraft(next);
      await this.database.labels.put(next);
      return next;
    });
    this.markUsed();
    return updated;
  }
}

class DexieDraftRepository<T extends WorkspaceDraftRecord> implements DraftRepository<T> {
  constructor(
    private readonly database: FoodLabellingDatabase,
    private readonly table: Table<T, string>,
    private readonly now: () => string,
    private readonly markUsed: () => void,
  ) {}

  async create(record: T): Promise<void> {
    validateDraftRecord(record);
    try {
      await this.database.transaction(
        'rw',
        [this.database.ingredients, this.database.formulations, this.database.products],
        async () => {
          await this.table.add(record);
          await assertNoCircularReferences(this.database);
        },
      );
      this.markUsed();
    } catch (error) {
      if (isConstraintError(error)) {
        throw new RepositoryConflictError(`A ${record.recordType} with id "${record.id}" already exists`);
      }
      throw error;
    }
  }

  get(id: string): Promise<T | undefined> {
    return this.table.get(id);
  }

  list(): Promise<T[]> {
    return this.table.toArray();
  }

  async update(id: string, changes: DraftChanges<T>): Promise<T> {
    const updated = await this.database.transaction(
      'rw',
      [this.database.ingredients, this.database.formulations, this.database.products],
      async () => {
        const current = await this.table.get(id);
        if (current === undefined) {
          throw new RepositoryNotFoundError(`No ${this.table.name.slice(0, -1)} exists with id "${id}"`);
        }

        const next = {
          ...current,
          ...changes,
          id: current.id,
          recordType: current.recordType,
          createdAt: current.createdAt,
          updatedAt: this.now(),
        } as T;
        validateDraftRecord(next);
        await this.table.put(next);
        await assertNoCircularReferences(this.database);
        return next;
      },
    );
    this.markUsed();
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.database.transaction('rw', this.table, async () => {
      if (await this.table.get(id) === undefined) {
        throw new RepositoryNotFoundError(`No ${this.table.name.slice(0, -1)} exists with id "${id}"`);
      }
      await this.table.delete(id);
    });
    this.markUsed();
  }
}

class DexieApprovedVersionRepository implements ApprovedVersionRepository {
  constructor(
    private readonly database: FoodLabellingDatabase,
    private readonly tables: Readonly<Record<WorkspaceDraftRecord['recordType'], Table<WorkspaceDraftRecord, string>>>,
    private readonly markUsed: () => void,
    private readonly now: () => string,
  ) {}

  async create(version: ApprovedVersionRecord): Promise<void> {
    validateApprovedVersion(version);
    try {
      await this.database.transaction(
        'rw',
        [this.database.approvedVersions, this.database.reviewDecisions],
        async () => {
          await this.database.approvedVersions.add(version);
          await this.database.reviewDecisions.add(version.reviewDecision);
        },
      );
      this.markUsed();
    } catch (error) {
      if (isConstraintError(error)) {
        throw new RepositoryConflictError(`Approved version or review decision "${version.id}" already exists`);
      }
      throw error;
    }
  }

  async approveDraft(
    recordType: WorkspaceDraftRecord['recordType'],
    recordId: string,
    input: ApprovalInput,
  ): Promise<ApprovedVersionRecord> {
    const table = this.tables[recordType];
    try {
      const version = await this.database.transaction(
        'rw',
        [table, this.database.approvedVersions, this.database.reviewDecisions],
        async () => {
          const draft = await table.get(recordId);
          if (draft === undefined) {
            throw new RepositoryNotFoundError(`No ${recordType} exists with id "${recordId}"`);
          }
          const history = await this.database.approvedVersions
            .where('[recordType+recordId+version]')
            .between(
              [recordType, recordId, Dexie.minKey],
              [recordType, recordId, Dexie.maxKey],
              true,
              true,
            )
            .toArray();
          const versionNumber = history.reduce((highest, item) => Math.max(highest, item.version), 0) + 1;
          const versionId = `${recordType}:${recordId}:${versionNumber}`;
          const approvedAt = input.approvedAt ?? this.now();
          const reviewDecision: ReviewDecisionRecord = {
            id: input.reviewDecisionId,
            versionId,
            decision: 'approved',
            reviewerId: input.reviewerId,
            decidedAt: approvedAt,
            rationale: input.rationale,
          };
          const approvedVersion: ApprovedVersionRecord = {
            id: versionId,
            recordType,
            recordId,
            version: versionNumber,
            approvedAt,
            approvedBy: input.reviewerId,
            reviewDecision,
            results: input.results ?? [],
            snapshot: structuredClone(draft),
          };
          validateApprovedVersion(approvedVersion);
          await this.database.approvedVersions.add(approvedVersion);
          await this.database.reviewDecisions.add(reviewDecision);
          return approvedVersion;
        },
      );
      this.markUsed();
      return version;
    } catch (error) {
      if (isConstraintError(error)) {
        throw new RepositoryConflictError('Approval version or review decision already exists');
      }
      throw error;
    }
  }

  get(id: string): Promise<ApprovedVersionRecord | undefined> {
    return this.database.approvedVersions.get(id);
  }

  list(
    recordType: WorkspaceDraftRecord['recordType'],
    recordId: string,
  ): Promise<ApprovedVersionRecord[]> {
    return this.database.approvedVersions
      .where('[recordType+recordId+version]')
      .between(
        [recordType, recordId, Dexie.minKey],
        [recordType, recordId, Dexie.maxKey],
        true,
        true,
      )
      .toArray();
  }
}

class FoodLabellingDatabase extends Dexie {
  ingredients!: Table<IngredientRecord, string>;
  formulations!: Table<FormulationRecord, string>;
  products!: Table<ProductRecord, string>;
  labels!: Table<LabelDraftRecord, string>;
  approvedVersions!: Table<ApprovedVersionRecord, string>;
  reviewDecisions!: Table<ReviewDecisionRecord, string>;
  recoveryPoints!: Table<RecoveryPointRecord, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      ingredients: 'id, name, supplierName, kind, updatedAt, *tags',
      formulations: 'id, name, updatedAt, *tags',
      products: 'id, name, formulationId, updatedAt, *tags',
      approvedVersions: 'id, &[recordType+recordId+version]',
    });
    this.version(2)
      .stores({
        reviewDecisions: 'id, versionId, reviewerId, decidedAt',
        recoveryPoints: 'id, createdAt',
      })
      .upgrade(async (transaction) => {
        const [ingredients, formulations, products, approvedVersions] = await Promise.all([
          transaction.table('ingredients').toArray(),
          transaction.table('formulations').toArray(),
          transaction.table('products').toArray(),
          transaction.table('approvedVersions').toArray(),
        ]);
        if (
          ingredients.length === 0
          && formulations.length === 0
          && products.length === 0
          && approvedVersions.length === 0
        ) {
          return;
        }

        for (const record of [...ingredients, ...formulations, ...products]) {
          validateDraftRecord(record);
        }
        for (const item of approvedVersions) {
          if (
            !isRecord(item)
            || !isNonEmpty(item.id)
            || !isNonEmpty(item.recordId)
            || !isNonEmpty(item.approvedBy)
            || !isIsoDateTime(item.approvedAt)
            || !isWorkspaceDraftRecord(item.snapshot)
          ) {
            throw new RecordValidationError('legacy approved version is invalid');
          }
          validateDraftRecord(item.snapshot);
        }
        const createdAt = new Date().toISOString();
        await transaction.table('recoveryPoints').add({
          id: 'migration-1-2',
          fromVersion: 1,
          toVersion: 2,
          createdAt,
          records: { ingredients, formulations, products, approvedVersions },
        } satisfies RecoveryPointRecord);

        for (const oldVersion of approvedVersions) {
          const version = oldVersion as ApprovedVersionRecord;
          if (
            !isNonEmpty(version.id)
            || !isNonEmpty(version.approvedBy)
            || !isIsoDateTime(version.approvedAt)
            || !isNonEmpty(version.recordId)
          ) {
            throw new RecordValidationError(`legacy approved version "${String(version.id)}" is invalid`);
          }
          const reviewDecision: ReviewDecisionRecord = {
            id: `migration:${version.id}`,
            versionId: version.id,
            decision: 'legacy_unverified',
            reviewerId: version.approvedBy,
            decidedAt: version.approvedAt,
            rationale: 'Migrated from schema v1; the earlier schema did not record a separate review decision.',
          };
          await transaction.table('approvedVersions').put({
            ...version,
            reviewDecision,
            results: Array.isArray(version.results) ? version.results : [],
          });
          await transaction.table('reviewDecisions').add(reviewDecision);
        }
      });
    this.version(3).stores({});
    this.version(4).stores({ labels: 'id, name, productId, updatedAt' }).upgrade(async (transaction) => {
      const [ingredients, formulations, products, approvedVersions, reviewDecisions] = await Promise.all([
        transaction.table('ingredients').toArray(),
        transaction.table('formulations').toArray(),
        transaction.table('products').toArray(),
        transaction.table('approvedVersions').toArray(),
        transaction.table('reviewDecisions').toArray(),
      ]);
      if ([ingredients, formulations, products, approvedVersions, reviewDecisions].every((items) => items.length === 0)) return;
      for (const record of [...ingredients, ...formulations, ...products]) validateDraftRecord(record);
      for (const version of approvedVersions) validateApprovedVersion(version);
      await transaction.table('recoveryPoints').add({
        id: 'migration-3-4',
        fromVersion: 3,
        toVersion: 4,
        createdAt: new Date().toISOString(),
        records: { ingredients, formulations, products, approvedVersions, reviewDecisions },
      } satisfies RecoveryPointRecord);
    });
  }
}

const usageMarkerKey = 'aus-food-labelling.workspace-used.v1';

function defaultUsageMarker(): WorkspaceUsageMarker | undefined {
  if (typeof localStorage === 'undefined') {
    return undefined;
  }
  return {
    wasPreviouslyUsed: () => localStorage.getItem(usageMarkerKey) === '1',
    markUsed: () => localStorage.setItem(usageMarkerKey, '1'),
  };
}

async function getWorkspaceCounts(database: FoodLabellingDatabase): Promise<WorkspaceRecordCounts> {
  const [ingredients, formulations, products, labels, approvedVersions, reviewDecisions] = await Promise.all([
    database.ingredients.count(),
    database.formulations.count(),
    database.products.count(),
    database.labels.count(),
    database.approvedVersions.count(),
    database.reviewDecisions.count(),
  ]);
  return { ingredients, formulations, products, labels, approvedVersions, reviewDecisions };
}

async function validateStoredData(database: FoodLabellingDatabase): Promise<void> {
  try {
    const [ingredients, formulations, products, labels, versions, decisions] = await Promise.all([
      database.ingredients.toArray(),
      database.formulations.toArray(),
      database.products.toArray(),
      database.labels.toArray(),
      database.approvedVersions.toArray(),
      database.reviewDecisions.toArray(),
    ]);
    for (const record of [...ingredients, ...formulations, ...products]) {
      validateDraftRecord(record);
    }
    for (const label of labels) validateLabelDraft(label);
    const decisionsById = new Map(decisions.map((decision) => [decision.id, decision]));
    if (decisionsById.size !== versions.length) {
      throw new RecordValidationError('Review decision count does not match approved version count');
    }
    for (const version of versions) {
      validateApprovedVersion(version);
      const decision = decisionsById.get(version.reviewDecision.id);
      if (
        decision?.versionId !== version.id
        || JSON.stringify(decision) !== JSON.stringify(version.reviewDecision)
      ) {
        throw new RecordValidationError(`Approved version "${version.id}" has no matching review decision`);
      }
    }
    await assertNoCircularReferences(database);
  } catch (error) {
    throw new StoreIntegrityError('Local workspace integrity check failed; data was not modified', error);
  }
}

export async function openLocalFoodStore(options?: {
  readonly name?: string;
  readonly previousName?: string;
  readonly now?: () => string;
  readonly usageMarker?: WorkspaceUsageMarker;
}): Promise<LocalFoodStore> {
  const name = options?.name ?? 'aus-food-labelling-v2';
  const previousName = options?.previousName ?? (options?.name === undefined ? 'aus-food-labelling' : undefined);
  if (previousName === name) throw new RecordValidationError('Previous and current workspaces must be different');
  const database = new FoodLabellingDatabase(name);
  await database.open();
  try {
    await validateStoredData(database);
    const usageMarker = options?.usageMarker ?? defaultUsageMarker();
    const counts = await getWorkspaceCounts(database);
    const empty = Object.values(counts).every((count) => count === 0);
    const workspaceWasPreviouslyUsed = usageMarker?.wasPreviouslyUsed() === true && empty;
    if (!empty) {
      usageMarker?.markUsed();
    }

    const now = options?.now ?? (() => new Date().toISOString());
    const markUsed = () => {
      try {
        usageMarker?.markUsed();
      } catch (error) {
        throw new StorageMarkerWriteError(error);
      }
    };
    const tables: Readonly<Record<WorkspaceDraftRecord['recordType'], Table<WorkspaceDraftRecord, string>>> = {
      ingredient: database.ingredients as Table<WorkspaceDraftRecord, string>,
      formulation: database.formulations as Table<WorkspaceDraftRecord, string>,
      product: database.products as Table<WorkspaceDraftRecord, string>,
    };

    return {
      ingredients: new DexieDraftRepository(database, database.ingredients, now, markUsed),
      formulations: new DexieDraftRepository(database, database.formulations, now, markUsed),
      products: new DexieDraftRepository(database, database.products, now, markUsed),
      labels: new DexieLabelRepository(database, now, markUsed),
      approvedVersions: new DexieApprovedVersionRepository(database, tables, markUsed, now),
      saveIngredientWithComposition: async (ingredient, composition, isNew) => {
        validateDraftRecord(ingredient);
        validateDraftRecord(composition);
        if (ingredient.kind !== 'compound' || ingredient.compoundFormulationId !== composition.id) {
          throw new RecordValidationError('The ingredient must reference its composition');
        }
        await database.transaction('rw', [database.ingredients, database.formulations, database.products], async () => {
          const current = await database.ingredients.get(ingredient.id);
          if (isNew && current) throw new RepositoryConflictError('Ingredient already exists');
          if (!isNew && !current) throw new RepositoryNotFoundError('Ingredient no longer exists');
          if (await database.formulations.get(composition.id)) {
            throw new RepositoryConflictError('Composition already exists; existing recipes are not overwritten');
          }
          await database.formulations.add(composition);
          await database.ingredients.put(ingredient);
          await assertNoCircularReferences(database);
        });
        markUsed();
      },
      workspaceWasPreviouslyUsed,
      workspaceUsageMarkerAvailable: usageMarker !== undefined,
      previousWorkspaceAvailable: empty && await database.recoveryPoints.count() === 0
        && previousName !== undefined && await Dexie.exists(previousName),
      copyPreviousWorkspace: async () => {
        if (previousName === undefined) throw new RecordValidationError('No previous workspace is configured');
        const counts = await copyPreviousWorkspace(previousName, database);
        markUsed();
        return counts;
      },
      recoveryPoints: {
        list: () => database.recoveryPoints.toArray(),
      },
      exportBackup: (exportOptions) => exportWorkspaceBackup(database, exportOptions),
      inspectBackup: (backup, passphrase) => inspectWorkspaceBackup(database, backup, passphrase),
      restoreBackup: (backup, importOptions) => restoreWorkspaceBackup(database, backup, importOptions, markUsed),
      requestDurableStorage: async () => {
        if (typeof navigator === 'undefined' || navigator.storage?.persist === undefined) {
          return { supported: false, granted: false };
        }
        return { supported: true, granted: await navigator.storage.persist() };
      },
      close: () => database.close(),
    };
  } catch (error) {
    database.close();
    throw error;
  }
}

const backupFormat = 'aus-food-workspace-backup';
const backupFormatVersion = 3;
type SupportedBackupVersion = 1 | 2 | 3;
const backupKdfIterations = 310_000;
const maximumBackupBytes = 100 * 1024 * 1024;
const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

interface BackupDataRecords {
  readonly ingredients: readonly IngredientRecord[];
  readonly formulations: readonly FormulationRecord[];
  readonly products: readonly ProductRecord[];
  readonly labels: readonly LabelDraftRecord[];
  readonly approvedVersions: readonly ApprovedVersionRecord[];
  readonly reviewDecisions: readonly ReviewDecisionRecord[];
}

async function copyPreviousWorkspace(
  previousName: string,
  target: FoodLabellingDatabase,
): Promise<WorkspaceRecordCounts> {
  if (!await Dexie.exists(previousName)) throw new RecordValidationError('The previous workspace no longer exists');
  const source = new Dexie(previousName);
  try {
    await source.open();
    const tableNames = ['ingredients', 'formulations', 'products', 'approvedVersions', 'reviewDecisions', 'recoveryPoints'] as const;
    if (tableNames.some((name) => !source.tables.some((table) => table.name === name))) {
      throw new RecordValidationError('The previous workspace has an unsupported schema. Export a backup from the previous app and restore it here.');
    }
    const hasLabels = source.tables.some((table) => table.name === 'labels');
    const tables = [...tableNames.map((name) => source.table(name)), ...(hasLabels ? [source.table('labels')] : [])];
    const snapshot = await source.transaction('r', tables, async () => {
      const [ingredients, formulations, products, approvedVersions, reviewDecisions, recoveryPoints] = await Promise.all([
        source.table('ingredients').toArray(),
        source.table('formulations').toArray(),
        source.table('products').toArray(),
        source.table('approvedVersions').toArray(),
        source.table('reviewDecisions').toArray(),
        source.table('recoveryPoints').toArray(),
      ]);
      const labels = hasLabels ? await source.table('labels').toArray() : [];
      return { ingredients, formulations, products, approvedVersions, reviewDecisions, recoveryPoints, labels };
    });
    const payload = {
      format: backupFormat, formatVersion: backupFormatVersion, createdAt: new Date().toISOString(),
      ingredients: snapshot.ingredients, formulations: snapshot.formulations, products: snapshot.products,
      approvedVersions: snapshot.approvedVersions, reviewDecisions: snapshot.reviewDecisions,
      labels: snapshot.labels,
    };
    validateBackupPayload(payload);
    if (!snapshot.recoveryPoints.every((item) => isRecord(item) && isNonEmpty(item.id))) {
      throw new RecordValidationError('The previous workspace has an invalid recovery point');
    }
    const targetTables = [target.ingredients, target.formulations, target.products, target.approvedVersions, target.reviewDecisions, target.recoveryPoints, target.labels];
    await target.transaction('rw', targetTables, async () => {
      const counts = await Promise.all(targetTables.map((table) => table.count()));
      if (counts.some((count) => count !== 0)) {
        throw new RecordValidationError('The current workspace is not empty. No data was changed; use backup and restore to manage existing data.');
      }
      await target.ingredients.bulkAdd(payload.ingredients);
      await target.formulations.bulkAdd(payload.formulations);
      await target.products.bulkAdd(payload.products);
      await target.approvedVersions.bulkAdd(payload.approvedVersions);
      await target.reviewDecisions.bulkAdd(payload.reviewDecisions);
      await target.recoveryPoints.bulkAdd(snapshot.recoveryPoints);
      await target.labels.bulkAdd(payload.labels);
      const copied = await Promise.all(targetTables.map((table) => table.toArray()));
      const originals: readonly (readonly { id: string }[])[] = [
        snapshot.ingredients, snapshot.formulations, snapshot.products, snapshot.approvedVersions,
        snapshot.reviewDecisions, snapshot.recoveryPoints, snapshot.labels,
      ];
      for (let index = 0; index < targetTables.length; index += 1) {
        const original = originals[index]!;
        const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);
        const actual = copied[index]!;
        if (JSON.stringify([...original].sort(byId)) !== JSON.stringify([...actual].sort(byId))) {
          throw new RecordValidationError('Workspace copy verification failed; no data was copied');
        }
      }
    });
    return countBackupRecords(payload);
  } finally {
    source.close();
  }
}

interface WorkspaceBackupPayload extends Omit<BackupDataRecords, 'labels'> {
  readonly format: typeof backupFormat;
  readonly formatVersion: SupportedBackupVersion;
  readonly createdAt: string;
  readonly labels?: readonly LabelDraftRecord[];
}

interface PlainBackupEnvelope {
  readonly format: typeof backupFormat;
  readonly formatVersion: typeof backupFormatVersion;
  readonly encrypted: false;
  readonly warning: 'This file is unencrypted and readable by anyone who can access it.';
  readonly payload: WorkspaceBackupPayload;
  readonly sha256: string;
}

interface EncryptedBackupEnvelope {
  readonly format: typeof backupFormat;
  readonly formatVersion: typeof backupFormatVersion;
  readonly encrypted: true;
  readonly algorithm: 'AES-GCM';
  readonly kdf: 'PBKDF2-SHA-256';
  readonly iterations: typeof backupKdfIterations;
  readonly salt: string;
  readonly iv: string;
  readonly ciphertext: string;
}

function requireWebCrypto(): Crypto {
  if (globalThis.crypto?.subtle === undefined) {
    throw new BackupFormatError('Web Crypto is unavailable in this environment');
  }
  return globalThis.crypto;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function serializeBackupEnvelope(envelope: PlainBackupEnvelope | EncryptedBackupEnvelope): string {
  const serialized = JSON.stringify(envelope);
  if (utf8Encoder.encode(serialized).byteLength > maximumBackupBytes) {
    throw new BackupFormatError('Backup exceeds the 100 MiB export limit');
  }
  return serialized;
}

function base64ToBytes(value: string): Uint8Array {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new BackupFormatError('Backup contains invalid base64 data');
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function sha256(value: string): Promise<string> {
  const digest = await requireWebCrypto().subtle.digest('SHA-256', utf8Encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function deriveBackupKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  if (!isNonEmpty(passphrase)) {
    throw new BackupPassphraseError('A non-empty passphrase is required');
  }
  const crypto = requireWebCrypto();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    utf8Encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: toArrayBuffer(salt), iterations: backupKdfIterations },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function parseBackupObject(backup: string): Record<string, unknown> {
  if (utf8Encoder.encode(backup).byteLength > maximumBackupBytes) {
    throw new BackupFormatError('Backup exceeds the 100 MiB import limit');
  }
  let value: unknown;
  try {
    value = JSON.parse(backup);
  } catch {
    throw new BackupFormatError('Backup is not valid JSON');
  }
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
    || !('format' in value)
    || !('formatVersion' in value)
    || value.format !== backupFormat
    || (value.formatVersion !== 1 && value.formatVersion !== 2 && value.formatVersion !== backupFormatVersion)
  ) {
    throw new BackupFormatError('Backup format or version is unsupported');
  }
  return value as Record<string, unknown>;
}

function validateBackupPayload(value: unknown): asserts value is WorkspaceBackupPayload {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
  ) {
    throw new BackupFormatError('Backup payload must be an object');
  }
  const payload = value as Record<string, unknown>;
  if (
    payload.format !== backupFormat
    || (payload.formatVersion !== 1 && payload.formatVersion !== 2 && payload.formatVersion !== backupFormatVersion)
    || !isIsoDateTime(payload.createdAt)
  ) {
    throw new BackupFormatError('Backup payload metadata is invalid');
  }
  const arrayNames = ['ingredients', 'formulations', 'products', 'approvedVersions', 'reviewDecisions'] as const;
  if (arrayNames.some((name) => !Array.isArray(payload[name]))) {
    throw new BackupFormatError('Backup payload is missing one or more workspace record arrays');
  }
  if ((payload.formatVersion === 3 && !Array.isArray(payload.labels))
    || (payload.formatVersion !== 3 && payload.labels !== undefined
      && (!Array.isArray(payload.labels) || payload.labels.length > 0))) {
    throw new BackupFormatError('Backup label drafts do not match the backup format version');
  }

  const ingredients = payload.ingredients as IngredientRecord[];
  const hasNewIngredientData = (item: Record<string, unknown>): boolean => {
    const profile = isRecord(item.nutrientProfile) && isRecord(item.nutrientProfile.values) ? item.nutrientProfile.values : {};
    return item.caffeineEvidence !== undefined || item.ingredientIdentity !== undefined
      || item.nutritionPer100mL !== undefined || item.supplierFacts !== undefined
      || item.otherSchedule28Statements !== undefined || item.ingredientDensity !== undefined
      || item.allergenCoverage !== undefined || item.nutritionEntrySource !== undefined
      || item.wheatGlutenStatus !== undefined
      || item.directAdditiveSourceId !== undefined || item.compoundNutritionBasis !== undefined
      || item.additiveCoverage !== undefined
      || item.additionalNutritionPer100mL !== undefined
      || (isRecord(item.energyPer100g) && item.energyPer100g.evidenceType !== undefined)
      || Object.keys(profile).some((key) => {
        const oldIds: readonly string[] = ['protein', 'fat', 'saturatedFat', 'carbohydrate', 'sugars', 'sodium', ...optionalNutrientIds];
        return !oldIds.includes(key);
      })
      || Object.values(profile).some((value) => isRecord(value)
        && (value.evidenceType === 'user' || value.evidenceType === 'productLabel'
          || value.unit === 'ug/100g' || value.expression !== undefined))
      || (Array.isArray(item.allergenEvidence) && item.allergenEvidence.some((value: unknown) =>
        isRecord(value) && value.sourceType !== undefined));
  };
  if (payload.formatVersion === 1 && (ingredients.some((item) =>
    isRecord(item) && hasNewIngredientData(item))
    || (payload.approvedVersions as unknown[]).some((item) => isRecord(item)
      && isRecord(item.snapshot) && item.snapshot.recordType === 'ingredient'
      && hasNewIngredientData(item.snapshot)))) {
    throw new BackupFormatError('Version 1 backups cannot contain version 2 ingredient evidence');
  }
  const formulations = payload.formulations as FormulationRecord[];
  if (payload.formatVersion === 1 && (formulations.some((item) =>
    isRecord(item) && (item.finishedNutrition !== undefined || item.nutrientRetention !== undefined))
    || (payload.approvedVersions as unknown[]).some((item) => isRecord(item)
      && isRecord(item.snapshot) && item.snapshot.recordType === 'formulation'
      && (item.snapshot.finishedNutrition !== undefined || item.snapshot.nutrientRetention !== undefined)))) {
    throw new BackupFormatError('Version 1 backups cannot contain finished-food nutrition evidence');
  }
  if (payload.formatVersion === 1 && (formulations.some((item) =>
    isRecord(item) && item.incompleteRecipeLines !== undefined)
    || (payload.approvedVersions as unknown[]).some((item) => isRecord(item)
      && isRecord(item.snapshot) && item.snapshot.recordType === 'formulation'
      && item.snapshot.incompleteRecipeLines !== undefined))) {
    throw new BackupFormatError('Version 1 backups cannot contain incomplete recipe lines');
  }
  if (payload.formatVersion === 1 && (formulations.some((item) =>
    isRecord(item) && item.supplierComposition !== undefined)
    || (payload.approvedVersions as unknown[]).some((item) => isRecord(item)
      && isRecord(item.snapshot) && item.snapshot.recordType === 'formulation'
      && item.snapshot.supplierComposition !== undefined))) {
    throw new BackupFormatError('Version 1 backups cannot contain version 2 supplier composition evidence');
  }
  const products = payload.products as ProductRecord[];
  if (payload.formatVersion === 1 && (products.some((item) => isRecord(item)
    && (item.preparation !== undefined || item.draining !== undefined || item.consumerDirections !== undefined
      || item.otherConsumerDirections !== undefined || item.otherConsumerDirectionsText !== undefined))
    || (payload.approvedVersions as unknown[]).some((item) => isRecord(item)
      && isRecord(item.snapshot) && item.snapshot.recordType === 'product'
      && (item.snapshot.preparation !== undefined || item.snapshot.draining !== undefined
        || item.snapshot.consumerDirections !== undefined || item.snapshot.otherConsumerDirections !== undefined
        || item.snapshot.otherConsumerDirectionsText !== undefined)))) {
    throw new BackupFormatError('Version 1 backups cannot contain preparation or draining details or consumer directions');
  }
  const versions = payload.approvedVersions as ApprovedVersionRecord[];
  const decisions = payload.reviewDecisions as ReviewDecisionRecord[];
  const seen = new Set<string>();
  const unique = (type: string, id: string): void => {
    const key = `${type}:${id}`;
    if (!isNonEmpty(id) || seen.has(key)) {
      throw new BackupFormatError(`Backup contains an invalid or duplicate ${type} id`);
    }
    seen.add(key);
  };
  for (const record of ingredients) {
    validateDraftRecord(record);
    unique('ingredient', record.id);
  }
  for (const record of formulations) {
    validateDraftRecord(record);
    unique('formulation', record.id);
  }
  for (const record of products) {
    validateDraftRecord(record);
    unique('product', record.id);
  }
  for (const label of (payload.labels ?? []) as unknown[]) {
    validateLabelDraft(label);
    unique('label', label.id);
  }
  for (const record of versions) {
    validateApprovedVersion(record);
    unique('approved version', record.id);
  }
  const decisionIds = new Set<string>();
  for (const decision of decisions) {
    if (
      !isRecord(decision)
      || !isNonEmpty(decision.id)
      || !isNonEmpty(decision.versionId)
      || !isNonEmpty(decision.reviewerId)
      || !isIsoDateTime(decision.decidedAt)
      || !isNonEmpty(decision.rationale)
      || decisionIds.has(decision.id)
    ) {
      throw new BackupFormatError('Backup contains an invalid or duplicate review decision');
    }
    decisionIds.add(decision.id);
  }
  for (const version of versions) {
    const decision = decisions.find((item) => item.id === version.reviewDecision.id);
    if (
      decision === undefined
      || decision.versionId !== version.id
      || JSON.stringify(decision) !== JSON.stringify(version.reviewDecision)
    ) {
      throw new BackupFormatError(`Approved version "${version.id}" is missing its review decision`);
    }
  }
  if (decisionIds.size !== versions.length) {
    throw new BackupFormatError('Backup review decision count does not match approved version count');
  }
  const versionNumbers = new Set<string>();
  for (const version of versions) {
    const key = `${version.recordType}:${version.recordId}:${version.version}`;
    if (versionNumbers.has(key)) {
      throw new BackupFormatError(`Backup contains duplicate version number "${key}"`);
    }
    versionNumbers.add(key);
  }

  const cycle = findWorkspaceReferenceCycle(ingredients, formulations);
  if (cycle) throw new BackupFormatError(`Backup contains a circular formulation reference: ${describeWorkspaceReferenceCycle(cycle)}.`);
}

function countBackupRecords(records: BackupDataRecords): WorkspaceRecordCounts {
  return {
    ingredients: records.ingredients.length,
    formulations: records.formulations.length,
    products: records.products.length,
    labels: records.labels.length,
    approvedVersions: records.approvedVersions.length,
    reviewDecisions: records.reviewDecisions.length,
  };
}

async function readBackupRecords(database: FoodLabellingDatabase): Promise<BackupDataRecords> {
  const [ingredients, formulations, products, labels, approvedVersions, reviewDecisions] = await Promise.all([
    database.ingredients.toArray(),
    database.formulations.toArray(),
    database.products.toArray(),
    database.labels.toArray(),
    database.approvedVersions.toArray(),
    database.reviewDecisions.toArray(),
  ]);
  return {
    ingredients: ingredients.sort((a, b) => a.id.localeCompare(b.id)),
    formulations: formulations.sort((a, b) => a.id.localeCompare(b.id)),
    products: products.sort((a, b) => a.id.localeCompare(b.id)),
    labels: labels.sort((a, b) => a.id.localeCompare(b.id)),
    approvedVersions: approvedVersions.sort((a, b) => a.id.localeCompare(b.id)),
    reviewDecisions: reviewDecisions.sort((a, b) => a.id.localeCompare(b.id)),
  };
}

async function exportWorkspaceBackup(
  database: FoodLabellingDatabase,
  options: BackupExportOptions,
): Promise<string> {
  const records = await readBackupRecords(database);
  const payload: WorkspaceBackupPayload = {
    format: backupFormat,
    formatVersion: backupFormatVersion,
    createdAt: new Date().toISOString(),
    ...records,
  };
  try {
    validateBackupPayload(payload);
  } catch (error) {
    if (error instanceof RecordValidationError) {
      throw new BackupFormatError(`Backup record validation failed: ${error.message}`);
    }
    throw error;
  }
  const serializedPayload = JSON.stringify(payload);
  if (options.encryption === 'none') {
    const envelope: PlainBackupEnvelope = {
      format: backupFormat,
      formatVersion: backupFormatVersion,
      encrypted: false,
      warning: 'This file is unencrypted and readable by anyone who can access it.',
      payload,
      sha256: await sha256(serializedPayload),
    };
    return serializeBackupEnvelope(envelope);
  }

  const crypto = requireWebCrypto();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveBackupKey(options.passphrase, salt);
  const protectedPayload = JSON.stringify({
    payload,
    sha256: await sha256(serializedPayload),
  });
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    utf8Encoder.encode(protectedPayload),
  );
  const envelope: EncryptedBackupEnvelope = {
    format: backupFormat,
    formatVersion: backupFormatVersion,
    encrypted: true,
    algorithm: 'AES-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations: backupKdfIterations,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
  return serializeBackupEnvelope(envelope);
}

async function decodeBackup(backup: string, passphrase?: string): Promise<WorkspaceBackupPayload> {
  const envelope = parseBackupObject(backup);
  let payload: unknown;
  let expectedHash: unknown;
  if (envelope.encrypted === true) {
    if (
      envelope.algorithm !== 'AES-GCM'
      || envelope.kdf !== 'PBKDF2-SHA-256'
      || envelope.iterations !== backupKdfIterations
      || typeof envelope.salt !== 'string'
      || typeof envelope.iv !== 'string'
      || typeof envelope.ciphertext !== 'string'
    ) {
      throw new BackupFormatError('Encrypted backup parameters are invalid or unsupported');
    }
    if (!isNonEmpty(passphrase)) {
      throw new BackupPassphraseError('A passphrase is required to open this encrypted backup');
    }
    try {
      const key = await deriveBackupKey(passphrase, base64ToBytes(envelope.salt));
      const decrypted = await requireWebCrypto().subtle.decrypt(
        { name: 'AES-GCM', iv: toArrayBuffer(base64ToBytes(envelope.iv)) },
        key,
        toArrayBuffer(base64ToBytes(envelope.ciphertext)),
      );
      const protectedPayload: unknown = JSON.parse(utf8Decoder.decode(decrypted));
      if (
        typeof protectedPayload !== 'object'
        || protectedPayload === null
        || !('payload' in protectedPayload)
        || !('sha256' in protectedPayload)
      ) {
        throw new BackupFormatError('Encrypted backup payload is malformed');
      }
      payload = protectedPayload.payload;
      expectedHash = protectedPayload.sha256;
    } catch (error) {
      if (error instanceof BackupFormatError) {
        throw error;
      }
      if (error instanceof DOMException && error.name === 'OperationError') {
        throw new BackupPassphraseError('Passphrase is incorrect or the encrypted backup is damaged');
      }
      throw error;
    }
  } else if (envelope.encrypted === false) {
    if (!('payload' in envelope) || typeof envelope.sha256 !== 'string') {
      throw new BackupFormatError('Unencrypted backup payload is malformed');
    }
    payload = envelope.payload;
    expectedHash = envelope.sha256;
  } else {
    throw new BackupFormatError('Backup encryption mode is unsupported');
  }

  try {
    validateBackupPayload(payload);
  } catch (error) {
    if (error instanceof RecordValidationError) {
      throw new BackupFormatError(`Backup record validation failed: ${error.message}`);
    }
    throw error;
  }
  if (typeof expectedHash !== 'string' || await sha256(JSON.stringify(payload)) !== expectedHash) {
    throw new BackupIntegrityError('Backup integrity check failed');
  }
  if (payload.formatVersion !== envelope.formatVersion) {
    throw new BackupFormatError('Backup envelope and payload versions do not match');
  }
  return payload;
}

function listConflictingIds(
  existing: BackupDataRecords,
  incoming: BackupDataRecords,
): string[] {
  const incomingKeys = new Set<string>();
  for (const type of ['ingredients', 'formulations', 'products', 'labels', 'approvedVersions', 'reviewDecisions'] as const) {
    for (const record of incoming[type]) {
      incomingKeys.add(`${type}:${record.id}`);
    }
  }
  const conflicts: string[] = [];
  for (const type of ['ingredients', 'formulations', 'products', 'labels', 'approvedVersions', 'reviewDecisions'] as const) {
    for (const record of existing[type]) {
      const key = `${type}:${record.id}`;
      if (incomingKeys.has(key)) {
        conflicts.push(key);
      }
    }
  }
  return conflicts.sort();
}

async function inspectWorkspaceBackup(
  database: FoodLabellingDatabase,
  backup: string,
  passphrase?: string,
): Promise<RestoreInspection> {
  const payload = await decodeBackup(backup, passphrase);
  const backupRecords: BackupDataRecords = {
    ingredients: payload.ingredients,
    formulations: payload.formulations,
    products: payload.products,
    labels: payload.labels ?? [],
    approvedVersions: payload.approvedVersions,
    reviewDecisions: payload.reviewDecisions,
  };
  return inspectBackupRecords(database, backupRecords, payload.formatVersion);
}

async function inspectBackupRecords(
  database: FoodLabellingDatabase,
  backupRecords: BackupDataRecords,
  backupFormatVersion: SupportedBackupVersion,
): Promise<RestoreInspection> {
  const [existingRecords, existingCounts] = await Promise.all([
    readBackupRecords(database),
    getWorkspaceCounts(database),
  ]);
  const existingCount = Object.values(existingCounts).reduce((total, count) => total + count, 0);
  return {
    backupFormatVersion,
    backupCounts: countBackupRecords(backupRecords),
    existingCounts,
    conflictingRecordIds: listConflictingIds(existingRecords, backupRecords),
    requiresExplicitReplace: existingCount > 0,
  };
}

async function restoreWorkspaceBackup(
  database: FoodLabellingDatabase,
  backup: string,
  options: BackupImportOptions = {},
  markUsed: () => void,
): Promise<RestoreInspection> {
  const payload = await decodeBackup(backup, options.passphrase);
  const backupRecords: BackupDataRecords = {
    ingredients: payload.ingredients,
    formulations: payload.formulations,
    products: payload.products,
    labels: payload.labels ?? [],
    approvedVersions: payload.approvedVersions,
    reviewDecisions: payload.reviewDecisions,
  };
  const inspection = await database.transaction(
    'rw',
    [
      database.ingredients,
      database.formulations,
      database.products,
      database.labels,
      database.approvedVersions,
      database.reviewDecisions,
    ],
    async () => {
      const currentInspection = await inspectBackupRecords(database, backupRecords, payload.formatVersion);
      if (currentInspection.requiresExplicitReplace && options.replaceExisting !== true) {
        throw new RestoreConflictError(currentInspection);
      }
      await Promise.all([
        database.ingredients.clear(),
        database.formulations.clear(),
        database.products.clear(),
        database.labels.clear(),
        database.approvedVersions.clear(),
        database.reviewDecisions.clear(),
      ]);
      await Promise.all([
        database.ingredients.bulkAdd(payload.ingredients),
        database.formulations.bulkAdd(payload.formulations),
        database.products.bulkAdd(payload.products),
        database.labels.bulkAdd(payload.labels ?? []),
        database.approvedVersions.bulkAdd(payload.approvedVersions),
        database.reviewDecisions.bulkAdd(payload.reviewDecisions),
      ]);
      return currentInspection;
    },
  );
  await validateStoredData(database);
  if (Object.values(inspection.backupCounts).some((count) => count > 0)) {
    markUsed();
  }
  return inspection;
}
