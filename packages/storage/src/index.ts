import Dexie, { type Table } from 'dexie';
import type {
  AdditiveConcentrationBasis,
  AdditiveConcentrationUnit,
  AdditiveDeclarationRoute,
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
  IngredientNutrientProfile,
  IngredientAdditiveSource,
  ProcessMassProfile,
  ProductClassificationEvidence,
  ProductClassificationProfile,
  ProductAdditiveNameInputs,
  ProductClaim,
  ProductClaimFacts,
} from '@aus-food/domain';

export interface DraftRecordBase {
  readonly id: string;
  readonly name: string;
  readonly recordType: 'ingredient' | 'formulation' | 'product';
  readonly tags: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
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
  readonly nutrientProfile?: IngredientNutrientProfile;
  readonly allergenEvidence?: readonly AllergenEvidenceSource[];
  readonly additiveSources?: readonly IngredientAdditiveSource[];
}

export interface FormulationRecord extends DraftRecordBase {
  readonly recordType: 'formulation';
  readonly lines: readonly FormulationComponent[];
  readonly processMassProfile?: ProcessMassProfile;
}

export interface ProductPackDetails {
  readonly servingSize?: string;
  readonly servingsPerPack?: string;
  readonly netQuantity?: string;
  readonly netUnit?: 'g' | 'mL';
}

export interface ProductRecord extends DraftRecordBase {
  readonly recordType: 'product';
  readonly formulationId: string;
  readonly foodState?: FoodState;
  readonly packDetails?: ProductPackDetails;
  readonly classificationProfile?: ProductClassificationProfile;
  readonly additiveNameInputs?: ProductAdditiveNameInputs;
  readonly claims?: readonly ProductClaim[];
  readonly claimFacts?: ProductClaimFacts;
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
  readonly approvedVersions: number;
  readonly reviewDecisions: number;
}

export interface RestoreInspection {
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
  readonly approvedVersions: ApprovedVersionRepository;
  readonly workspaceWasPreviouslyUsed: boolean;
  readonly workspaceUsageMarkerAvailable: boolean;
  readonly recoveryPoints: {
    list(): Promise<RecoveryPointRecord[]>;
  };
  exportBackup(options: BackupExportOptions): Promise<string>;
  inspectBackup(backup: string, passphrase?: string): Promise<RestoreInspection>;
  restoreBackup(backup: string, options?: BackupImportOptions): Promise<RestoreInspection>;
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
        || !isNonEmpty(evidence.reference)
        || !isIsoDate(evidence.sourceDate)
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
    const selection = value.declarationSelection;
    const allowedRoutes: readonly AdditiveDeclarationRoute[] = [
      'schedule7Class',
      'noSchedule7Class',
      'enzyme',
      'flavouring',
      'specifiedFlavouringSubstance',
      'addedCaffeine',
      'unknown',
    ];
    const allowedChoices: readonly AdditiveDeclarationSubstanceChoice[] = [
      'schedule8Name',
      'schedule8CodeNumber',
    ];
    if (
      !isRecord(selection)
      || typeof selection.route !== 'string'
      || !allowedRoutes.some((route) => route === selection.route)
      || (selection.schedule7ClassName !== undefined && typeof selection.schedule7ClassName !== 'string')
      || (selection.substanceChoice !== undefined
        && (
          typeof selection.substanceChoice !== 'string'
          || !allowedChoices.some((choice) => choice === selection.substanceChoice)
        ))
      || (selection.flavouringWording !== undefined
        && !['flavouring', 'flavour', 'specificName'].includes(String(selection.flavouringWording)))
    ) {
      throw new RecordValidationError(`${path}.declarationSelection is malformed`);
    }
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
    if (
      Object.keys(value.allergenAssessments).length > 0
      && (!Array.isArray(value.sourceEvidence) || value.sourceEvidence.length === 0)
    ) {
      throw new RecordValidationError(`${path}.allergenAssessments need a dated source evidence reference`);
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
    || !isIsoDate(value.sourceDate)
    || typeof value.kind !== 'string'
    || !allowedKinds.some((kind) => kind === value.kind)
  ) {
    throw new RecordValidationError(`${path} must have a unique id, reference, valid date, and supported evidence type`);
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
  if ((value.answer === 'yes' || value.answer === 'no') && value.evidence.length === 0) {
    throw new RecordValidationError(`${path} needs evidence for a yes or no answer`);
  }
  if (value.answer === 'conflicting' && value.evidence.length < 2) {
    throw new RecordValidationError(`${path} needs at least two evidence references for a conflicting answer`);
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
    && (!isRecord(evidence) || !isNonEmpty(evidence.reference) || !isIsoDate(evidence.sourceDate))
  ) {
    fail('evidence needs a reference and a valid date');
  }
  const density = value.finalDensity;
  if (
    density !== undefined
    && (
      !isRecord(density)
      || typeof density.gramsPerMillilitre !== 'string'
      || !decimal.test(density.gramsPerMillilitre)
      || Number(density.gramsPerMillilitre) <= 0
      || !isNonEmpty(density.evidenceReference)
      || !isIsoDate(density.sourceDate)
    )
  ) {
    fail('finalDensity needs a positive g/mL value, an evidence reference and a valid date');
  }
}

function validateClaims(value: unknown): void {
  const classifications: readonly unknown[] = ['nutrition_content', 'comparative', 'health', 'not_code_regulated'];
  const fail = (message: string): never => {
    throw new RecordValidationError(`claims ${message}`);
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
      && (!isRecord(evidence) || !isNonEmpty(evidence.reference) || !isIsoDate(evidence.sourceDate))
    ) {
      return fail('evidence needs a reference and a valid date');
    }
  }
}

function validatePackDetails(value: unknown): void {
  if (!isRecord(value)) {
    throw new RecordValidationError('packDetails must be an object');
  }
  for (const key of ['servingSize', 'servingsPerPack', 'netQuantity']) {
    const entry = value[key];
    if (entry !== undefined && (typeof entry !== 'string' || !/^\d+(\.\d+)?$/.test(entry) || Number(entry) <= 0)) {
      throw new RecordValidationError(`packDetails ${key} must be a positive decimal string when present`);
    }
  }
  if (value.netUnit !== undefined && value.netUnit !== 'g' && value.netUnit !== 'mL') {
    throw new RecordValidationError('packDetails netUnit must be g or mL');
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
    if (record.allergenEvidence !== undefined && !Array.isArray(record.allergenEvidence)) {
      throw new RecordValidationError('allergenEvidence must be an array when present');
    }
    if (record.additiveSources !== undefined) {
      validateIngredientAdditiveSources(record.additiveSources, record.id);
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
      } else if (line.kind === 'formulation') {
        if (!isNonEmpty(line.formulationId)) {
          throw new RecordValidationError(`Formulation line ${index} must reference a formulation`);
        }
      } else {
        throw new RecordValidationError(`Formulation line ${index} has an unsupported kind`);
      }
      validateMassQuantity(line.quantity, `Formulation line ${index} quantity`);
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

async function assertNoCircularReferences(database: FoodLabellingDatabase): Promise<void> {
  const [ingredients, formulations] = await Promise.all([
    database.ingredients.toArray(),
    database.formulations.toArray(),
  ]);
  const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const formulationIds = new Set(formulations.map((formulation) => formulation.id));
  const edges = new Map<string, string[]>();
  for (const formulation of formulations) {
    const children: string[] = [];
    for (const line of formulation.lines) {
      if (line.kind === 'formulation' && formulationIds.has(line.formulationId)) {
        children.push(line.formulationId);
      } else if (line.kind === 'ingredient') {
        const ingredient = ingredientById.get(line.ingredientId);
        if (
          ingredient?.kind === 'compound'
          && ingredient.compoundFormulationId !== undefined
          && formulationIds.has(ingredient.compoundFormulationId)
        ) {
          children.push(ingredient.compoundFormulationId);
        }
      }
    }
    edges.set(formulation.id, children);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visiting.has(id)) {
      throw new RepositoryCycleError(`Circular formulation reference detected at "${id}"`);
    }
    if (visited.has(id)) {
      return;
    }
    visiting.add(id);
    for (const child of edges.get(id) ?? []) {
      visit(child);
    }
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of edges.keys()) {
    visit(id);
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
  const [ingredients, formulations, products, approvedVersions, reviewDecisions] = await Promise.all([
    database.ingredients.count(),
    database.formulations.count(),
    database.products.count(),
    database.approvedVersions.count(),
    database.reviewDecisions.count(),
  ]);
  return { ingredients, formulations, products, approvedVersions, reviewDecisions };
}

async function validateStoredData(database: FoodLabellingDatabase): Promise<void> {
  try {
    const [ingredients, formulations, products, versions, decisions] = await Promise.all([
      database.ingredients.toArray(),
      database.formulations.toArray(),
      database.products.toArray(),
      database.approvedVersions.toArray(),
      database.reviewDecisions.toArray(),
    ]);
    for (const record of [...ingredients, ...formulations, ...products]) {
      validateDraftRecord(record);
    }
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
  readonly now?: () => string;
  readonly usageMarker?: WorkspaceUsageMarker;
}): Promise<LocalFoodStore> {
  const database = new FoodLabellingDatabase(options?.name ?? 'aus-food-labelling');
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
      approvedVersions: new DexieApprovedVersionRepository(database, tables, markUsed, now),
      workspaceWasPreviouslyUsed,
      workspaceUsageMarkerAvailable: usageMarker !== undefined,
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
const backupFormatVersion = 1;
const backupKdfIterations = 310_000;
const maximumBackupBytes = 100 * 1024 * 1024;
const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

interface BackupDataRecords {
  readonly ingredients: readonly IngredientRecord[];
  readonly formulations: readonly FormulationRecord[];
  readonly products: readonly ProductRecord[];
  readonly approvedVersions: readonly ApprovedVersionRecord[];
  readonly reviewDecisions: readonly ReviewDecisionRecord[];
}

interface WorkspaceBackupPayload extends BackupDataRecords {
  readonly format: typeof backupFormat;
  readonly formatVersion: typeof backupFormatVersion;
  readonly createdAt: string;
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
    || value.formatVersion !== backupFormatVersion
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
    || payload.formatVersion !== backupFormatVersion
    || !isIsoDateTime(payload.createdAt)
  ) {
    throw new BackupFormatError('Backup payload metadata is invalid');
  }
  const arrayNames = ['ingredients', 'formulations', 'products', 'approvedVersions', 'reviewDecisions'] as const;
  if (arrayNames.some((name) => !Array.isArray(payload[name]))) {
    throw new BackupFormatError('Backup payload is missing one or more workspace record arrays');
  }

  const ingredients = payload.ingredients as IngredientRecord[];
  const formulations = payload.formulations as FormulationRecord[];
  const products = payload.products as ProductRecord[];
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

  const ingredientById = new Map(ingredients.map((record) => [record.id, record]));
  const formulationById = new Map(formulations.map((record) => [record.id, record]));
  const formulationEdges = new Map<string, string[]>();
  for (const formulation of formulations) {
    const edges: string[] = [];
    for (const line of formulation.lines) {
      if (line.kind === 'ingredient') {
        const ingredient = ingredientById.get(line.ingredientId);
        if (ingredient?.kind === 'compound' && ingredient.compoundFormulationId !== undefined) {
          if (formulationById.has(ingredient.compoundFormulationId)) {
            edges.push(ingredient.compoundFormulationId);
          }
        }
      } else {
        if (formulationById.has(line.formulationId)) {
          edges.push(line.formulationId);
        }
      }
    }
    formulationEdges.set(formulation.id, edges);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visiting.has(id)) {
      throw new BackupFormatError(`Backup contains a circular formulation reference at "${id}"`);
    }
    if (visited.has(id)) {
      return;
    }
    visiting.add(id);
    for (const child of formulationEdges.get(id) ?? []) {
      visit(child);
    }
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of formulationEdges.keys()) {
    visit(id);
  }
}

function countBackupRecords(records: BackupDataRecords): WorkspaceRecordCounts {
  return {
    ingredients: records.ingredients.length,
    formulations: records.formulations.length,
    products: records.products.length,
    approvedVersions: records.approvedVersions.length,
    reviewDecisions: records.reviewDecisions.length,
  };
}

async function readBackupRecords(database: FoodLabellingDatabase): Promise<BackupDataRecords> {
  const [ingredients, formulations, products, approvedVersions, reviewDecisions] = await Promise.all([
    database.ingredients.toArray(),
    database.formulations.toArray(),
    database.products.toArray(),
    database.approvedVersions.toArray(),
    database.reviewDecisions.toArray(),
  ]);
  return {
    ingredients: ingredients.sort((a, b) => a.id.localeCompare(b.id)),
    formulations: formulations.sort((a, b) => a.id.localeCompare(b.id)),
    products: products.sort((a, b) => a.id.localeCompare(b.id)),
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
  return payload;
}

function listConflictingIds(
  existing: BackupDataRecords,
  incoming: BackupDataRecords,
): string[] {
  const incomingKeys = new Set<string>();
  for (const type of ['ingredients', 'formulations', 'products', 'approvedVersions', 'reviewDecisions'] as const) {
    for (const record of incoming[type]) {
      incomingKeys.add(`${type}:${record.id}`);
    }
  }
  const conflicts: string[] = [];
  for (const type of ['ingredients', 'formulations', 'products', 'approvedVersions', 'reviewDecisions'] as const) {
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
    approvedVersions: payload.approvedVersions,
    reviewDecisions: payload.reviewDecisions,
  };
  return inspectBackupRecords(database, backupRecords);
}

async function inspectBackupRecords(
  database: FoodLabellingDatabase,
  backupRecords: BackupDataRecords,
): Promise<RestoreInspection> {
  const [existingRecords, existingCounts] = await Promise.all([
    readBackupRecords(database),
    getWorkspaceCounts(database),
  ]);
  const existingCount = Object.values(existingCounts).reduce((total, count) => total + count, 0);
  return {
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
    approvedVersions: payload.approvedVersions,
    reviewDecisions: payload.reviewDecisions,
  };
  const inspection = await database.transaction(
    'rw',
    [
      database.ingredients,
      database.formulations,
      database.products,
      database.approvedVersions,
      database.reviewDecisions,
    ],
    async () => {
      const currentInspection = await inspectBackupRecords(database, backupRecords);
      if (currentInspection.requiresExplicitReplace && options.replaceExisting !== true) {
        throw new RestoreConflictError(currentInspection);
      }
      await Promise.all([
        database.ingredients.clear(),
        database.formulations.clear(),
        database.products.clear(),
        database.approvedVersions.clear(),
        database.reviewDecisions.clear(),
      ]);
      await Promise.all([
        database.ingredients.bulkAdd(payload.ingredients),
        database.formulations.bulkAdd(payload.formulations),
        database.products.bulkAdd(payload.products),
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
