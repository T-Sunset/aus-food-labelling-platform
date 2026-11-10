export type MappingConfidence =
  | 'Provision'
  | 'Standard'
  | 'Instrument'
  | 'Guidance-only'
  | 'Unmapped';

export type RuleApplicationCondition = {
  readonly type: 'evidencePresent';
  readonly field:
    | 'ingredientComposition'
    | 'allergenEvidence'
    | 'nipApplicabilityEvidence'
    | 'productIdentityEvidence'
    | 'lotIdentificationEvidence';
};

export interface RuleSourceRecord {
  readonly id: string;
  readonly instrument: string;
  readonly sourceUrl: string;
  readonly jurisdiction: string;
  readonly referenceVersion: string;
  readonly effectiveFrom: string;
  readonly checkedOn: string;
  readonly verificationStatus: 'needs-primary-source-recheck' | 'primary-source-verified';
}

export interface RuleReviewerApproval {
  readonly reviewerId: string;
  readonly approvedAt: string;
  readonly rationale: string;
}

export interface RuleRecord {
  readonly id: string;
  readonly name: string;
  readonly instrument: string;
  readonly standard: string;
  readonly provision: string;
  readonly scheduleTable?: string;
  readonly sourceIds: readonly string[];
  readonly sourceUrl: string;
  readonly jurisdiction: string;
  readonly effectiveFrom: string;
  readonly effectiveTo?: string;
  readonly version: string;
  readonly explanationTemplate: string;
  readonly templateVariables: readonly string[];
  readonly condition: RuleApplicationCondition;
  readonly failureSeverity: 'release-blocking' | 'advisory';
  readonly deterministic: boolean;
  readonly humanReviewRequired: boolean;
  readonly mappingConfidence: MappingConfidence;
  readonly reviewStatus: 'draft' | 'reviewed';
  readonly reviewerApproval?: RuleReviewerApproval;
  readonly fixtureIds: readonly string[];
}

export interface RuleFixtureRecord {
  readonly id: string;
  readonly ruleId: string;
  readonly scenario: string;
  readonly expectedStatus: 'PASS' | 'FAIL' | 'WARNING' | 'REVIEW REQUIRED' | 'INFORMATIONAL';
  readonly expectedMode: 'APPLIED' | 'CANDIDATE' | 'CONTEXT' | 'UNDETERMINABLE';
}

export interface AllergenVocabularyCandidate {
  readonly id: string;
  readonly ingredientListName: string;
  readonly summaryName: string;
  readonly reviewStatus: 'draft' | 'reviewed';
  readonly evaluation: 'presence' | 'condition-dependent' | 'final-food-concentration';
  readonly conditionNote?: string;
}

export interface AllergenVocabularyDraft {
  readonly version: string;
  readonly status: 'draft' | 'reviewed';
  readonly sourceIds: readonly string[];
  readonly entries: readonly AllergenVocabularyCandidate[];
}

export interface AdditiveDeclarationFormatRule {
  readonly id: string;
  readonly provision: string;
  readonly description: string;
  readonly template?: string;
  readonly fixedText?: string;
  readonly options?: readonly string[];
  readonly sourceIds: readonly string[];
  readonly reviewStatus: 'draft' | 'reviewed';
}

export interface AdditiveDeclarationClassName {
  readonly id: string;
  readonly name: string;
  readonly kind: 'prescribed' | 'optional';
  readonly sourcePosition: number;
  readonly sourceIds: readonly string[];
  readonly reviewStatus: 'draft' | 'reviewed';
}

export interface AdditiveDeclarationSubstance {
  readonly id: string;
  readonly name: string;
  readonly listing: 'alphabetical' | 'numerical';
  readonly sourcePosition: number;
  readonly codeNumber?: string;
  readonly codeNumberStatus: 'listed' | 'dash';
  readonly sourceIds: readonly string[];
  readonly reviewStatus: 'draft' | 'reviewed';
}

export interface AdditiveDeclarationListingDifference {
  readonly id: string;
  readonly codeNumber: string;
  readonly alphabeticalName: string;
  readonly numericalName: string;
  readonly sourceIds: readonly string[];
  readonly reviewStatus: 'draft' | 'reviewed';
}

export interface AdditiveDeclarationMapping {
  readonly id: string;
  readonly schedule7ClassNameId: string;
  readonly schedule8SubstanceId: string;
  readonly sourceIds: readonly string[];
  readonly reviewStatus: 'draft' | 'reviewed';
}

export interface AdditiveDeclarationCatalog {
  readonly version: string;
  readonly status: 'draft' | 'reviewed';
  readonly sourceIds: readonly string[];
  readonly formats: readonly AdditiveDeclarationFormatRule[];
  readonly schedule7ClassNames: readonly AdditiveDeclarationClassName[];
  readonly schedule8Substances: readonly AdditiveDeclarationSubstance[];
  readonly listingDifferences: readonly AdditiveDeclarationListingDifference[];
  readonly extractionNotes: readonly string[];
  readonly mappings: readonly AdditiveDeclarationMapping[];
}

export type AdditivePermissionCohort =
  | 'formulated-caffeinated-beverage'
  | 'food-for-infants';

export interface AdditivePermissionHeading {
  readonly code: string;
  readonly title: string;
}

export interface AdditivePermissionCategory {
  readonly id: string;
  readonly cohort: AdditivePermissionCohort;
  readonly code: string;
  readonly name: string;
  readonly classificationStatus: 'code-linked' | 'candidate-review' | 'child-review';
  readonly headingPath: readonly AdditivePermissionHeading[];
  readonly inheritedPermissionRowIds: readonly string[];
  readonly sourceIds: readonly string[];
  readonly reviewStatus: 'draft' | 'reviewed';
}

export interface AdditivePermissionTypeGrant {
  readonly id: string;
  readonly categoryId: string;
  readonly schedule15Heading: string;
  readonly schedule16Provision: 'S16—2' | 'S16—3' | 'S16—4';
  readonly description: string;
  readonly sourceIds: readonly string[];
  readonly reviewStatus: 'draft' | 'reviewed';
}

export interface AdditivePermissionLimit {
  readonly type: 'GMP' | 'maximum';
  readonly printedValue?: string;
  readonly unit: 'not-applicable' | 'mg/kg-default' | 'mg/L';
  readonly basisText?: string;
  readonly reviewStatus: 'draft' | 'reviewed';
}

export interface AdditivePermissionCondition {
  readonly type: 'sourceText';
  readonly text: string;
}

export interface AdditivePermissionRow {
  readonly id: string;
  readonly categoryId: string;
  readonly applicability: 'direct' | 'child-candidate';
  readonly sourcePosition: number;
  readonly additiveIdentifiers: readonly string[];
  readonly calculationBasisIds: readonly string[];
  readonly description: string;
  readonly limit: AdditivePermissionLimit;
  readonly conditions: readonly AdditivePermissionCondition[];
  readonly aggregationGroup?: string;
  readonly sourceValidation: 'transcribed' | 'table-presentation-unverified';
  readonly sourceIds: readonly string[];
  readonly reviewStatus: 'draft' | 'reviewed';
}

export interface AdditiveEquivalentFactor {
  readonly substance: string;
  readonly factor: string;
}

export interface AdditiveCalculationBasis {
  readonly id: string;
  readonly additiveIdentifiers: readonly string[];
  readonly provision: string;
  readonly calculatedAs: string;
  readonly method: 'named-equivalent' | 'factor-sum';
  readonly formula?: string;
  readonly factors: readonly AdditiveEquivalentFactor[];
  readonly sourceIds: readonly string[];
  readonly reviewStatus: 'draft' | 'reviewed';
}

export interface AdditivePermissionPurpose {
  readonly id: string;
  readonly name: string;
  readonly subClasses: readonly string[];
  readonly sourcePosition: number;
  readonly sourceIds: readonly string[];
  readonly reviewStatus: 'draft' | 'reviewed';
}

export interface AdditivePermissionGoverningProvision {
  readonly id: string;
  readonly provision: string;
  readonly effect: string;
  readonly sourceIds: readonly string[];
  readonly reviewStatus: 'draft' | 'reviewed';
}

export interface AdditivePermissionCatalog {
  readonly version: string;
  readonly checkedOn: string;
  readonly status: 'draft' | 'reviewed';
  readonly sourceIds: readonly string[];
  readonly categories: readonly AdditivePermissionCategory[];
  readonly typeGrants: readonly AdditivePermissionTypeGrant[];
  readonly rows: readonly AdditivePermissionRow[];
  readonly calculationBases: readonly AdditiveCalculationBasis[];
  readonly purposes: readonly AdditivePermissionPurpose[];
  readonly governingProvisions: readonly AdditivePermissionGoverningProvision[];
  readonly reviewNotes: readonly string[];
}

export type PrescribedNameCandidateKind =
  | 'prescribed_name'
  | 'name_linked_requirement'
  | 'no_prescribed_name_identified';

export interface PrescribedNameCandidateRule {
  readonly id: string;
  readonly cohort: 'formulated_caffeinated_beverage' | 'food_for_infants';
  readonly kind: PrescribedNameCandidateKind;
  readonly provision: string;
  readonly sourceIds: readonly string[];
  readonly mappingConfidence: MappingConfidence;
  readonly labelTextTerms: readonly string[];
  readonly ingredientTerms: readonly string[];
  readonly triggerSummary: string;
  readonly exclusions: readonly string[];
  readonly requiredFacts: readonly string[];
  readonly requirement: string;
  readonly reviewStatus: 'draft' | 'reviewed';
}

export interface PrescribedNameCandidateCatalog {
  readonly version: string;
  readonly checkedOn: string;
  readonly status: 'draft' | 'reviewed';
  readonly sourceIds: readonly string[];
  readonly rules: readonly PrescribedNameCandidateRule[];
  readonly reviewNotes: readonly string[];
}

export type ClaimNutrientId = 'energy' | 'fat' | 'sugars' | 'sodium' | 'dietaryFibre';

export interface ClaimQuantity {
  readonly value: string;
  readonly unit: 'kJ' | 'g' | 'mg';
}

// A claim is a structured, versioned rule record (CLAIM-001), never UI text.
export interface ClaimRule {
  readonly id: string;
  readonly claimName: string;
  readonly nutrient: ClaimNutrientId;
  readonly descriptor: string;
  readonly permittedWording: readonly string[];
  readonly comparison: 'atMost' | 'atLeast';
  readonly basis: 'per100ByFoodForm' | 'perServing';
  readonly limits: {
    readonly liquid?: ClaimQuantity;
    readonly solid?: ClaimQuantity;
    readonly perServing?: ClaimQuantity;
  };
  readonly generalCondition?: {
    readonly text: string;
    readonly minimumPerServing: ClaimQuantity;
  };
  readonly provision: string;
  readonly governingProvisions: readonly string[];
  readonly sourceIds: readonly string[];
  readonly mappingConfidence: MappingConfidence;
  readonly deterministic: boolean;
  readonly foodFormProvision: string;
  readonly excludedContexts: readonly string[];
  readonly requiredFacts: readonly string[];
  readonly mandatoryStatements: readonly string[];
  readonly requiredNipRows: readonly string[];
  readonly notYetVerified: readonly string[];
  readonly effectiveFrom: string;
  readonly effectiveTo?: string;
  readonly reviewStatus: 'draft' | 'reviewed';
}

export interface ClaimRuleCatalog {
  readonly version: string;
  readonly checkedOn: string;
  readonly status: 'draft' | 'reviewed';
  readonly sourceIds: readonly string[];
  readonly rules: readonly ClaimRule[];
  readonly reviewNotes: readonly string[];
}

export interface RuleReleaseManifest {
  readonly id: string;
  readonly version: string;
  readonly status: 'draft' | 'active' | 'retired';
  readonly jurisdiction: string;
  readonly effectiveFrom: string;
  readonly sourceRegisterSnapshot: string;
  readonly sources: readonly RuleSourceRecord[];
  readonly rules: readonly RuleRecord[];
  readonly fixtures: readonly RuleFixtureRecord[];
  readonly allergenVocabulary: AllergenVocabularyDraft;
  readonly additiveDeclarationCatalog: AdditiveDeclarationCatalog;
  readonly additivePermissionCatalog: AdditivePermissionCatalog;
  readonly prescribedNameCandidateCatalog: PrescribedNameCandidateCatalog;
  readonly claimRuleCatalog: ClaimRuleCatalog;
}

export interface RuleValidationIssue {
  readonly path: string;
  readonly message: string;
}

export class RuleValidationError extends Error {
  constructor(readonly issues: readonly RuleValidationIssue[]) {
    super(issues.map(({ path, message }) => `${path}: ${message}`).join('\n'));
    this.name = 'RuleValidationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isScheduleDash(value: unknown): boolean {
  return typeof value === 'string'
    && ['\u2013', '\u2014', '-'].includes(value.trim());
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function isUniqueNonEmptyList(value: unknown): value is readonly string[] {
  return Array.isArray(value)
    && value.length > 0
    && value.every(isNonEmpty)
    && new Set(value).size === value.length;
}

function addRequiredStringIssue(
  issues: RuleValidationIssue[],
  value: unknown,
  path: string,
): void {
  if (!isNonEmpty(value)) {
    issues.push({ path, message: 'must be a non-empty string' });
  }
}

function addDateIssue(
  issues: RuleValidationIssue[],
  value: unknown,
  path: string,
): void {
  if (!isIsoDate(value)) {
    issues.push({ path, message: 'must be a valid YYYY-MM-DD date' });
  }
}

function templateTokens(template: string): readonly string[] {
  return [...template.matchAll(/\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g)]
    .map((match) => match[1]!)
    .filter((name, index, names) => names.indexOf(name) === index);
}

function hasMalformedTemplateTokens(template: string): boolean {
  return /[{}]/.test(template.replace(/\{\{\s*[A-Za-z][A-Za-z0-9_]*\s*\}\}/g, ''));
}

export function renderExplanationTemplate(
  template: string,
  variables: readonly string[],
  values: Readonly<Record<string, string>>,
): string {
  if (hasMalformedTemplateTokens(template)) {
    throw new TypeError('Malformed explanation template token');
  }

  const declared = new Set(variables);
  for (const token of templateTokens(template)) {
    if (!declared.has(token) || values[token] === undefined) {
      throw new TypeError(`Missing declared explanation value "${token}"`);
    }
  }

  for (const variable of variables) {
    if (values[variable] === undefined) {
      throw new TypeError(`Missing explanation value "${variable}"`);
    }
  }

  return template.replace(/\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g, (_match, name: string) => {
    const value = values[name];
    if (value === undefined) {
      throw new TypeError(`Missing explanation value "${name}"`);
    }
    return value;
  });
}

const CLAIM_NUTRIENT_UNITS: Readonly<Record<string, string>> = {
  energy: 'kJ',
  fat: 'g',
  sugars: 'g',
  sodium: 'mg',
  dietaryFibre: 'g',
};

function validateClaimRuleCatalog(
  catalog: Record<string, unknown>,
  sourceById: ReadonlyMap<string, Record<string, unknown>>,
  active: boolean,
  issues: RuleValidationIssue[],
): void {
  const path = 'release.claimRuleCatalog';
  addRequiredStringIssue(issues, catalog.version, `${path}.version`);
  addDateIssue(issues, catalog.checkedOn, `${path}.checkedOn`);
  if (!['draft', 'reviewed'].includes(String(catalog.status))) {
    issues.push({ path: `${path}.status`, message: 'has an unsupported status' });
  }
  const checkSources = (ids: unknown, at: string, checkDate: boolean): void => {
    if (!isUniqueNonEmptyList(ids)) {
      issues.push({ path: at, message: 'must contain unique source IDs' });
      return;
    }
    for (const sourceId of ids) {
      const source = sourceById.get(sourceId);
      if (source === undefined) {
        issues.push({ path: at, message: `references missing source "${sourceId}"` });
      } else if (source.verificationStatus !== 'primary-source-verified') {
        issues.push({ path: at, message: `source "${sourceId}" needs a primary-source recheck` });
      } else if (checkDate && source.checkedOn !== catalog.checkedOn) {
        issues.push({ path: at, message: `source "${sourceId}" was not rechecked on the catalog date` });
      }
    }
  };
  checkSources(catalog.sourceIds, `${path}.sourceIds`, true);
  const catalogSourceIds = new Set(Array.isArray(catalog.sourceIds) ? catalog.sourceIds.filter(isNonEmpty) : []);
  const checkQuantity = (quantity: unknown, at: string, nutrient: unknown): void => {
    if (
      !isRecord(quantity)
      || typeof quantity.value !== 'string'
      || !/^\d+(\.\d+)?$/.test(quantity.value)
      || Number(quantity.value) <= 0
    ) {
      issues.push({ path: at, message: 'must have a positive decimal string value' });
      return;
    }
    if (quantity.unit !== CLAIM_NUTRIENT_UNITS[String(nutrient)]) {
      issues.push({ path: `${at}.unit`, message: 'does not match the nutrient' });
    }
  };

  const ids = new Set<string>();
  if (!Array.isArray(catalog.rules) || catalog.rules.length === 0) {
    issues.push({ path: `${path}.rules`, message: 'must be a non-empty array' });
  } else {
    catalog.rules.forEach((rule, index) => {
      const at = `${path}.rules[${index}]`;
      if (!isRecord(rule)) {
        issues.push({ path: at, message: 'must be an object' });
        return;
      }
      addRequiredStringIssue(issues, rule.id, `${at}.id`);
      if (isNonEmpty(rule.id)) {
        if (ids.has(rule.id)) {
          issues.push({ path: `${at}.id`, message: 'must be unique' });
        }
        ids.add(rule.id);
      }
      for (const field of ['claimName', 'descriptor', 'provision', 'foodFormProvision'] as const) {
        addRequiredStringIssue(issues, rule[field], `${at}.${field}`);
      }
      addDateIssue(issues, rule.effectiveFrom, `${at}.effectiveFrom`);
      if (rule.effectiveTo !== undefined) {
        addDateIssue(issues, rule.effectiveTo, `${at}.effectiveTo`);
        if (isIsoDate(rule.effectiveTo) && isIsoDate(rule.effectiveFrom) && rule.effectiveTo < rule.effectiveFrom) {
          issues.push({ path: `${at}.effectiveTo`, message: 'must not be before effectiveFrom' });
        }
      }
      if (!Object.keys(CLAIM_NUTRIENT_UNITS).includes(String(rule.nutrient))) {
        issues.push({ path: `${at}.nutrient`, message: 'has an unsupported nutrient' });
      }
      if (!['atMost', 'atLeast'].includes(String(rule.comparison))) {
        issues.push({ path: `${at}.comparison`, message: 'has an unsupported comparison' });
      }
      if (!['draft', 'reviewed'].includes(String(rule.reviewStatus))) {
        issues.push({ path: `${at}.reviewStatus`, message: 'has an unsupported status' });
      }
      if (!['Provision', 'Standard', 'Instrument', 'Guidance-only', 'Unmapped'].includes(String(rule.mappingConfidence))) {
        issues.push({ path: `${at}.mappingConfidence`, message: 'has an unsupported mapping confidence' });
      }
      if (typeof rule.deterministic !== 'boolean') {
        issues.push({ path: `${at}.deterministic`, message: 'must be a boolean' });
      } else if (rule.deterministic && rule.mappingConfidence !== 'Provision') {
        issues.push({ path: `${at}.deterministic`, message: 'needs Provision mapping confidence' });
      }
      for (const field of ['permittedWording', 'governingProvisions'] as const) {
        const list = rule[field];
        if (!Array.isArray(list) || list.length === 0 || !list.every(isNonEmpty)) {
          issues.push({ path: `${at}.${field}`, message: 'must be a non-empty array of non-empty strings' });
        }
      }
      for (const field of ['excludedContexts', 'requiredFacts', 'mandatoryStatements', 'requiredNipRows', 'notYetVerified'] as const) {
        const list = rule[field];
        if (!Array.isArray(list) || !list.every(isNonEmpty)) {
          issues.push({ path: `${at}.${field}`, message: 'must be an array of non-empty strings' });
        }
      }
      checkSources(rule.sourceIds, `${at}.sourceIds`, false);
      if (Array.isArray(rule.sourceIds)) {
        for (const sourceId of rule.sourceIds) {
          if (!catalogSourceIds.has(sourceId as string)) {
            issues.push({ path: `${at}.sourceIds`, message: `source "${String(sourceId)}" is not listed on the catalog` });
          }
        }
      }
      const limits = isRecord(rule.limits) ? rule.limits : undefined;
      if (limits === undefined) {
        issues.push({ path: `${at}.limits`, message: 'must be an object' });
      } else if (rule.basis === 'per100ByFoodForm') {
        checkQuantity(limits.liquid, `${at}.limits.liquid`, rule.nutrient);
        checkQuantity(limits.solid, `${at}.limits.solid`, rule.nutrient);
        if (limits.perServing !== undefined) {
          issues.push({ path: `${at}.limits.perServing`, message: 'is not allowed for a per-100 basis' });
        }
      } else if (rule.basis === 'perServing') {
        checkQuantity(limits.perServing, `${at}.limits.perServing`, rule.nutrient);
        if (limits.liquid !== undefined || limits.solid !== undefined) {
          issues.push({ path: `${at}.limits`, message: 'must only have a per-serving limit' });
        }
      } else {
        issues.push({ path: `${at}.basis`, message: 'has an unsupported basis' });
      }
      if (rule.generalCondition !== undefined) {
        if (!isRecord(rule.generalCondition)) {
          issues.push({ path: `${at}.generalCondition`, message: 'must be an object' });
        } else {
          addRequiredStringIssue(issues, rule.generalCondition.text, `${at}.generalCondition.text`);
          checkQuantity(
            rule.generalCondition.minimumPerServing,
            `${at}.generalCondition.minimumPerServing`,
            rule.nutrient,
          );
        }
      }
      if (active && rule.reviewStatus !== 'reviewed') {
        issues.push({ path: `${at}.reviewStatus`, message: 'must be reviewed before release activation' });
      }
    });
  }
  if (!Array.isArray(catalog.reviewNotes) || catalog.reviewNotes.length === 0 || !catalog.reviewNotes.every(isNonEmpty)) {
    issues.push({ path: `${path}.reviewNotes`, message: 'must contain non-empty review notes' });
  }
  if (active && catalog.status !== 'reviewed') {
    issues.push({ path: `${path}.status`, message: 'must be reviewed before release activation' });
  }
}

export function validateRuleRelease(value: unknown): asserts value is RuleReleaseManifest {
  const issues: RuleValidationIssue[] = [];
  if (!isRecord(value)) {
    throw new RuleValidationError([{ path: '$', message: 'must be an object' }]);
  }

  for (const key of ['id', 'version', 'jurisdiction', 'sourceRegisterSnapshot']) {
    addRequiredStringIssue(issues, value[key], `release.${key}`);
  }
  addDateIssue(issues, value.effectiveFrom, 'release.effectiveFrom');
  if (!['draft', 'active', 'retired'].includes(String(value.status))) {
    issues.push({ path: 'release.status', message: 'has an unsupported status' });
  }
  if (!Array.isArray(value.sources) || value.sources.length === 0) {
    issues.push({ path: 'release.sources', message: 'must contain at least one source' });
  }
  if (!Array.isArray(value.rules) || value.rules.length === 0) {
    issues.push({ path: 'release.rules', message: 'must contain at least one rule' });
  }
  if (!Array.isArray(value.fixtures) || value.fixtures.length === 0) {
    issues.push({ path: 'release.fixtures', message: 'must contain at least one fixture' });
  }
  if (!isRecord(value.allergenVocabulary)) {
    issues.push({ path: 'release.allergenVocabulary', message: 'must be an object' });
  }
  if (!isRecord(value.additiveDeclarationCatalog)) {
    issues.push({ path: 'release.additiveDeclarationCatalog', message: 'must be an object' });
  }
  if (!isRecord(value.additivePermissionCatalog)) {
    issues.push({ path: 'release.additivePermissionCatalog', message: 'must be an object' });
  }
  if (!isRecord(value.prescribedNameCandidateCatalog)) {
    issues.push({ path: 'release.prescribedNameCandidateCatalog', message: 'must be an object' });
  }
  if (!isRecord(value.claimRuleCatalog)) {
    issues.push({ path: 'release.claimRuleCatalog', message: 'must be an object' });
  }

  if (issues.length > 0) {
    throw new RuleValidationError(issues);
  }

  const sources = value.sources as unknown[];
  const rules = value.rules as unknown[];
  const fixtures = value.fixtures as unknown[];
  const additiveDeclarationCatalog = value.additiveDeclarationCatalog as Record<string, unknown>;
  const additivePermissionCatalog = value.additivePermissionCatalog as Record<string, unknown>;
  const nameCatalog = value.prescribedNameCandidateCatalog as Record<string, unknown>;
  const sourceById = new Map<string, Record<string, unknown>>();
  const ruleById = new Map<string, Record<string, unknown>>();
  const fixtureById = new Map<string, Record<string, unknown>>();

  sources.forEach((source, index) => {
    const path = `release.sources[${index}]`;
    if (!isRecord(source)) {
      issues.push({ path, message: 'must be an object' });
      return;
    }
    for (const key of ['id', 'instrument', 'jurisdiction', 'referenceVersion']) {
      addRequiredStringIssue(issues, source[key], `${path}.${key}`);
    }
    addDateIssue(issues, source.effectiveFrom, `${path}.effectiveFrom`);
    addDateIssue(issues, source.checkedOn, `${path}.checkedOn`);
    if (!isHttpsUrl(source.sourceUrl)) {
      issues.push({ path: `${path}.sourceUrl`, message: 'must be an HTTPS URL' });
    }
    if (!['needs-primary-source-recheck', 'primary-source-verified'].includes(String(source.verificationStatus))) {
      issues.push({ path: `${path}.verificationStatus`, message: 'has an unsupported status' });
    }
    if (isNonEmpty(source.id)) {
      if (sourceById.has(source.id)) {
        issues.push({ path: `${path}.id`, message: `duplicates source "${source.id}"` });
      }
      sourceById.set(source.id, source);
    }
  });

  fixtures.forEach((fixture, index) => {
    const path = `release.fixtures[${index}]`;
    if (!isRecord(fixture)) {
      issues.push({ path, message: 'must be an object' });
      return;
    }
    for (const key of ['id', 'ruleId', 'scenario']) {
      addRequiredStringIssue(issues, fixture[key], `${path}.${key}`);
    }
    if (!['PASS', 'FAIL', 'WARNING', 'REVIEW REQUIRED', 'INFORMATIONAL'].includes(String(fixture.expectedStatus))) {
      issues.push({ path: `${path}.expectedStatus`, message: 'has an unsupported result status' });
    }
    if (!['APPLIED', 'CANDIDATE', 'CONTEXT', 'UNDETERMINABLE'].includes(String(fixture.expectedMode))) {
      issues.push({ path: `${path}.expectedMode`, message: 'has an unsupported application mode' });
    }
    if (isNonEmpty(fixture.id)) {
      if (fixtureById.has(fixture.id)) {
        issues.push({ path: `${path}.id`, message: `duplicates fixture "${fixture.id}"` });
      }
      fixtureById.set(fixture.id, fixture);
    }
  });

  rules.forEach((rule, index) => {
    const path = `release.rules[${index}]`;
    if (!isRecord(rule)) {
      issues.push({ path, message: 'must be an object' });
      return;
    }
    for (const key of [
      'id',
      'name',
      'instrument',
      'standard',
      'provision',
      'jurisdiction',
      'version',
      'explanationTemplate',
    ]) {
      addRequiredStringIssue(issues, rule[key], `${path}.${key}`);
    }
    if (isNonEmpty(rule.explanationTemplate) && hasMalformedTemplateTokens(rule.explanationTemplate)) {
      issues.push({
        path: `${path}.explanationTemplate`,
        message: 'contains a malformed template token',
      });
    }
    addDateIssue(issues, rule.effectiveFrom, `${path}.effectiveFrom`);
    if (rule.effectiveTo !== undefined) {
      addDateIssue(issues, rule.effectiveTo, `${path}.effectiveTo`);
    }
    if (!isHttpsUrl(rule.sourceUrl)) {
      issues.push({ path: `${path}.sourceUrl`, message: 'must be an HTTPS URL' });
    }
    if (!isUniqueNonEmptyList(rule.sourceIds)) {
      issues.push({ path: `${path}.sourceIds`, message: 'must contain unique source IDs' });
    } else {
      let referencedRuleSourceUrlMatches = false;
      for (const sourceId of rule.sourceIds) {
        const source = sourceById.get(sourceId);
        if (source === undefined) {
          issues.push({ path: `${path}.sourceIds`, message: `references missing source "${sourceId}"` });
        } else if (source.sourceUrl === rule.sourceUrl) {
          referencedRuleSourceUrlMatches = true;
        }
      }
      if (!referencedRuleSourceUrlMatches) {
        issues.push({
          path: `${path}.sourceUrl`,
          message: 'must match a source URL in sourceIds',
        });
      }
    }
    if (!['Provision', 'Standard', 'Instrument', 'Guidance-only', 'Unmapped'].includes(String(rule.mappingConfidence))) {
      issues.push({ path: `${path}.mappingConfidence`, message: 'has an unsupported confidence' });
    }
    if (!['release-blocking', 'advisory'].includes(String(rule.failureSeverity))) {
      issues.push({ path: `${path}.failureSeverity`, message: 'has an unsupported severity' });
    }
    if (typeof rule.deterministic !== 'boolean' || typeof rule.humanReviewRequired !== 'boolean') {
      issues.push({ path, message: 'must define deterministic and humanReviewRequired booleans' });
    }
    if (rule.deterministic === true && rule.humanReviewRequired === true) {
      issues.push({ path: `${path}.deterministic`, message: 'cannot be deterministic and require human review' });
    }
    if (!['draft', 'reviewed'].includes(String(rule.reviewStatus))) {
      issues.push({ path: `${path}.reviewStatus`, message: 'has an unsupported review status' });
    }
    if (!isUniqueNonEmptyList(rule.fixtureIds)) {
      issues.push({ path: `${path}.fixtureIds`, message: 'must contain unique fixture IDs' });
    } else {
      for (const fixtureId of rule.fixtureIds) {
        const fixture = fixtureById.get(fixtureId);
        if (fixture === undefined) {
          issues.push({ path: `${path}.fixtureIds`, message: `references missing fixture "${fixtureId}"` });
        } else if (fixture.ruleId !== rule.id) {
          issues.push({ path: `${path}.fixtureIds`, message: `fixture "${fixtureId}" belongs to another rule` });
        }
      }
    }

    if (!Array.isArray(rule.templateVariables)
      || !rule.templateVariables.every(isNonEmpty)
      || new Set(rule.templateVariables).size !== rule.templateVariables.length) {
      issues.push({ path: `${path}.templateVariables`, message: 'must contain unique variable names' });
    } else {
      const declaredVariables = new Set(rule.templateVariables as string[]);
      const usedVariables = new Set(templateTokens(String(rule.explanationTemplate ?? '')));
      for (const token of usedVariables) {
        if (!declaredVariables.has(token)) {
          issues.push({ path: `${path}.explanationTemplate`, message: `uses undeclared variable "${token}"` });
        }
      }
      for (const variable of declaredVariables) {
        if (!usedVariables.has(variable)) {
          issues.push({ path: `${path}.templateVariables`, message: `declares unused variable "${variable}"` });
        }
      }
    }

    if (!isRecord(rule.condition) || rule.condition.type !== 'evidencePresent') {
      issues.push({ path: `${path}.condition`, message: 'uses an unsupported condition type' });
    } else if (![
      'ingredientComposition',
      'allergenEvidence',
      'nipApplicabilityEvidence',
      'productIdentityEvidence',
      'lotIdentificationEvidence',
    ].includes(String(rule.condition.field))) {
      issues.push({ path: `${path}.condition.field`, message: 'uses an unsupported evidence field' });
    }

    if (
      rule.deterministic === true
      && rule.mappingConfidence !== 'Provision'
      && (
        !isRecord(rule.reviewerApproval)
        || !isNonEmpty(rule.reviewerApproval.reviewerId)
        || !isIsoDate(rule.reviewerApproval.approvedAt)
        || !isNonEmpty(rule.reviewerApproval.rationale)
      )
    ) {
      issues.push({
        path: `${path}.deterministic`,
        message: 'cannot be true below Provision mapping confidence without reviewer approval',
      });
    }
    if (isNonEmpty(rule.id)) {
      if (ruleById.has(rule.id)) {
        issues.push({ path: `${path}.id`, message: `duplicates rule "${rule.id}"` });
      }
      ruleById.set(rule.id, rule);
    }
  });

  for (const [index, fixture] of fixtures.entries()) {
    if (isRecord(fixture) && isNonEmpty(fixture.ruleId)) {
      const rule = ruleById.get(fixture.ruleId);
      if (rule === undefined) {
        issues.push({
          path: `release.fixtures[${index}].ruleId`,
          message: `references missing rule "${fixture.ruleId}"`,
        });
      } else if (
        (rule.reviewStatus !== 'reviewed' || rule.deterministic !== true)
        && fixture.expectedStatus !== 'REVIEW REQUIRED'
        && fixture.expectedStatus !== 'INFORMATIONAL'
      ) {
        issues.push({
          path: `release.fixtures[${index}].expectedStatus`,
          message: 'draft or non-deterministic rules cannot have PASS, FAIL, or WARNING fixtures',
        });
      }
    }
  }

  const vocabulary = value.allergenVocabulary;
  if (isRecord(vocabulary)) {
    addRequiredStringIssue(issues, vocabulary.version, 'release.allergenVocabulary.version');
    if (!['draft', 'reviewed'].includes(String(vocabulary.status))) {
      issues.push({ path: 'release.allergenVocabulary.status', message: 'has an unsupported status' });
    }
    if (!isUniqueNonEmptyList(vocabulary.sourceIds)) {
      issues.push({ path: 'release.allergenVocabulary.sourceIds', message: 'must contain unique source IDs' });
    } else {
      for (const sourceId of vocabulary.sourceIds) {
        if (!sourceById.has(sourceId)) {
          issues.push({
            path: 'release.allergenVocabulary.sourceIds',
            message: `references missing source "${sourceId}"`,
          });
        }
      }
    }
    if (!Array.isArray(vocabulary.entries) || vocabulary.entries.length === 0) {
      issues.push({ path: 'release.allergenVocabulary.entries', message: 'must contain candidate entries' });
    } else {
      const allergenIds = new Set<string>();
      vocabulary.entries.forEach((entry, index) => {
        const path = `release.allergenVocabulary.entries[${index}]`;
        if (!isRecord(entry)) {
          issues.push({ path, message: 'must be an object' });
          return;
        }
        for (const key of ['id', 'ingredientListName', 'summaryName']) {
          addRequiredStringIssue(issues, entry[key], `${path}.${key}`);
        }
        if (!['draft', 'reviewed'].includes(String(entry.reviewStatus))) {
          issues.push({ path: `${path}.reviewStatus`, message: 'has an unsupported status' });
        }
        if (!['presence', 'condition-dependent', 'final-food-concentration'].includes(String(entry.evaluation))) {
          issues.push({ path: `${path}.evaluation`, message: 'has an unsupported evaluation type' });
        }
        if (entry.evaluation === 'condition-dependent' && !isNonEmpty(entry.conditionNote)) {
          issues.push({ path: `${path}.conditionNote`, message: 'is required for condition-dependent entries' });
        }
        if (isNonEmpty(entry.id)) {
          if (allergenIds.has(entry.id)) {
            issues.push({ path: `${path}.id`, message: `duplicates allergen "${entry.id}"` });
          }
          allergenIds.add(entry.id);
        }
      });
    }
  }

  const catalogPath = 'release.additiveDeclarationCatalog';
  addRequiredStringIssue(issues, additiveDeclarationCatalog.version, `${catalogPath}.version`);
  if (!['draft', 'reviewed'].includes(String(additiveDeclarationCatalog.status))) {
    issues.push({ path: `${catalogPath}.status`, message: 'has an unsupported status' });
  }
  if (!isUniqueNonEmptyList(additiveDeclarationCatalog.sourceIds)) {
    issues.push({ path: `${catalogPath}.sourceIds`, message: 'must contain unique source IDs' });
  } else {
    for (const sourceId of additiveDeclarationCatalog.sourceIds) {
      if (!sourceById.has(sourceId)) {
        issues.push({
          path: `${catalogPath}.sourceIds`,
          message: `references missing source "${sourceId}"`,
        });
      }
    }
  }

  const catalogIds = new Set<string>();
  const validateCatalogEntry = (
    entry: unknown,
    path: string,
    requiredName: string,
  ): entry is Record<string, unknown> => {
    if (!isRecord(entry)) {
      issues.push({ path, message: 'must be an object' });
      return false;
    }
    for (const key of ['id', requiredName]) {
      addRequiredStringIssue(issues, entry[key], `${path}.${key}`);
    }
    if (!['draft', 'reviewed'].includes(String(entry.reviewStatus))) {
      issues.push({ path: `${path}.reviewStatus`, message: 'has an unsupported status' });
    }
    if (!isUniqueNonEmptyList(entry.sourceIds)) {
      issues.push({ path: `${path}.sourceIds`, message: 'must contain unique source IDs' });
    } else {
      for (const sourceId of entry.sourceIds) {
        if (!sourceById.has(sourceId)) {
          issues.push({
            path: `${path}.sourceIds`,
            message: `references missing source "${sourceId}"`,
          });
        }
      }
    }
    if (isNonEmpty(entry.id)) {
      if (catalogIds.has(entry.id)) {
        issues.push({ path: `${path}.id`, message: `duplicates catalog entry "${entry.id}"` });
      }
      catalogIds.add(entry.id);
    }
    return true;
  };

  const formats = additiveDeclarationCatalog.formats;
  const schedule7ClassNames = additiveDeclarationCatalog.schedule7ClassNames;
  const schedule8Substances = additiveDeclarationCatalog.schedule8Substances;
  const mappings = additiveDeclarationCatalog.mappings;
  if (!Array.isArray(formats) || formats.length === 0) {
    issues.push({ path: `${catalogPath}.formats`, message: 'must contain declaration format rules' });
  } else {
    formats.forEach((format, index) => {
      const path = `${catalogPath}.formats[${index}]`;
      if (!validateCatalogEntry(format, path, 'provision')) {
        return;
      }
      addRequiredStringIssue(issues, format.description, `${path}.description`);
      if (
        (format.template === undefined) === (format.fixedText === undefined)
        || (format.template !== undefined && !isNonEmpty(format.template))
        || (format.fixedText !== undefined && !isNonEmpty(format.fixedText))
      ) {
        issues.push({
          path,
          message: 'must define exactly one non-empty template or fixedText',
        });
      }
      if (format.options !== undefined && !isUniqueNonEmptyList(format.options)) {
        issues.push({ path: `${path}.options`, message: 'must contain unique non-empty options' });
      }
    });
  }
  if (!Array.isArray(schedule7ClassNames)) {
    issues.push({ path: `${catalogPath}.schedule7ClassNames`, message: 'must be an array' });
  } else {
    schedule7ClassNames.forEach((entry, index) => {
      const path = `${catalogPath}.schedule7ClassNames[${index}]`;
      if (!validateCatalogEntry(entry, path, 'name')) {
        return;
      }
      if (!['prescribed', 'optional'].includes(String(entry.kind))) {
        issues.push({ path: `${path}.kind`, message: 'has an unsupported class name kind' });
      }
      if (!Number.isInteger(entry.sourcePosition) || Number(entry.sourcePosition) < 1) {
        issues.push({ path: `${path}.sourcePosition`, message: 'must be a positive integer' });
      }
    });
  }
  if (!Array.isArray(schedule8Substances)) {
    issues.push({ path: `${catalogPath}.schedule8Substances`, message: 'must be an array' });
  } else {
    schedule8Substances.forEach((entry, index) => {
      const path = `${catalogPath}.schedule8Substances[${index}]`;
      if (!validateCatalogEntry(entry, path, 'name')) {
        return;
      }
      if (
        entry.codeNumber !== undefined
        && !isNonEmpty(entry.codeNumber)
      ) {
        issues.push({ path: `${path}.codeNumber`, message: 'must be a non-empty string when present' });
      }
      if (!['alphabetical', 'numerical'].includes(String(entry.listing))) {
        issues.push({ path: `${path}.listing`, message: 'has an unsupported source listing' });
      }
      if (!Number.isInteger(entry.sourcePosition) || Number(entry.sourcePosition) < 1) {
        issues.push({ path: `${path}.sourcePosition`, message: 'must be a positive integer' });
      }
      if (
        (
          entry.codeNumberStatus === 'listed'
          && (!isNonEmpty(entry.codeNumber) || isScheduleDash(entry.codeNumber))
        )
        || (entry.codeNumberStatus === 'dash' && entry.codeNumber !== undefined)
        || !['listed', 'dash'].includes(String(entry.codeNumberStatus))
      ) {
        issues.push({
          path: `${path}.codeNumberStatus`,
          message: 'must preserve either a listed code number or an explicit source dash',
        });
      }
    });
  }
  const listingDifferences = additiveDeclarationCatalog.listingDifferences;
  if (!Array.isArray(listingDifferences)) {
    issues.push({ path: `${catalogPath}.listingDifferences`, message: 'must be an array' });
  } else {
    listingDifferences.forEach((entry, index) => {
      const path = `${catalogPath}.listingDifferences[${index}]`;
      if (!validateCatalogEntry(entry, path, 'codeNumber')) {
        return;
      }
      addRequiredStringIssue(issues, entry.alphabeticalName, `${path}.alphabeticalName`);
      addRequiredStringIssue(issues, entry.numericalName, `${path}.numericalName`);
    });
  }
  if (
    !Array.isArray(additiveDeclarationCatalog.extractionNotes)
    || additiveDeclarationCatalog.extractionNotes.length === 0
    || !additiveDeclarationCatalog.extractionNotes.every(isNonEmpty)
  ) {
    issues.push({
      path: `${catalogPath}.extractionNotes`,
      message: 'must document non-empty source extraction notes',
    });
  }
  if (!Array.isArray(mappings)) {
    issues.push({ path: `${catalogPath}.mappings`, message: 'must be an array' });
  } else {
    mappings.forEach((entry, index) => {
      const path = `${catalogPath}.mappings[${index}]`;
      if (!validateCatalogEntry(entry, path, 'schedule8SubstanceId')) {
        return;
      }
      addRequiredStringIssue(issues, entry.schedule7ClassNameId, `${path}.schedule7ClassNameId`);
      if (
        Array.isArray(schedule7ClassNames)
        && !schedule7ClassNames.some(
          (className) => isRecord(className) && className.id === entry.schedule7ClassNameId,
        )
      ) {
        issues.push({ path: `${path}.schedule7ClassNameId`, message: 'references a missing Schedule 7 class name' });
      }
      if (
        Array.isArray(schedule8Substances)
        && !schedule8Substances.some(
          (substance) => isRecord(substance) && substance.id === entry.schedule8SubstanceId,
        )
      ) {
        issues.push({ path: `${path}.schedule8SubstanceId`, message: 'references a missing Schedule 8 substance' });
      }
    });
  }

  const permissionPath = 'release.additivePermissionCatalog';
  addRequiredStringIssue(issues, additivePermissionCatalog.version, `${permissionPath}.version`);
  addDateIssue(issues, additivePermissionCatalog.checkedOn, `${permissionPath}.checkedOn`);
  const permissionCatalogSourceIds = new Set(
    Array.isArray(additivePermissionCatalog.sourceIds)
      ? additivePermissionCatalog.sourceIds.filter(isNonEmpty)
      : [],
  );
  if (!['draft', 'reviewed'].includes(String(additivePermissionCatalog.status))) {
    issues.push({ path: `${permissionPath}.status`, message: 'has an unsupported status' });
  }
  if (!isUniqueNonEmptyList(additivePermissionCatalog.sourceIds)) {
    issues.push({ path: `${permissionPath}.sourceIds`, message: 'must contain unique source IDs' });
  } else {
    for (const sourceId of additivePermissionCatalog.sourceIds) {
      const source = sourceById.get(sourceId);
      if (source === undefined) {
        issues.push({
          path: `${permissionPath}.sourceIds`,
          message: `references missing source "${sourceId}"`,
        });
      } else {
        if (source.verificationStatus !== 'primary-source-verified') {
          issues.push({
            path: `${permissionPath}.sourceIds`,
            message: `source "${sourceId}" needs a primary-source recheck`,
          });
        }
        if (source.checkedOn !== additivePermissionCatalog.checkedOn) {
          issues.push({
            path: `${permissionPath}.sourceIds`,
            message: `source "${sourceId}" was not rechecked on the catalog date`,
          });
        }
      }
    }
  }

  const permissionIds = new Set<string>();
  const validatePermissionEntry = (
    entry: unknown,
    path: string,
    sourceIds: unknown,
  ): entry is Record<string, unknown> => {
    if (!isRecord(entry)) {
      issues.push({ path, message: 'must be an object' });
      return false;
    }
    addRequiredStringIssue(issues, entry.id, `${path}.id`);
    if (!['draft', 'reviewed'].includes(String(entry.reviewStatus))) {
      issues.push({ path: `${path}.reviewStatus`, message: 'has an unsupported status' });
    }
    if (!isUniqueNonEmptyList(sourceIds)) {
      issues.push({ path: `${path}.sourceIds`, message: 'must contain unique source IDs' });
    } else {
      for (const sourceId of sourceIds) {
        const source = sourceById.get(sourceId);
        if (source === undefined) {
          issues.push({
            path: `${path}.sourceIds`,
            message: `references missing source "${sourceId}"`,
          });
        } else {
          if (!permissionCatalogSourceIds.has(sourceId)) {
            issues.push({
              path: `${path}.sourceIds`,
              message: `source "${sourceId}" is not listed in the permission catalog sources`,
            });
          }
          if (source.verificationStatus !== 'primary-source-verified') {
            issues.push({
              path: `${path}.sourceIds`,
              message: `source "${sourceId}" needs a primary-source recheck`,
            });
          }
          if (source.checkedOn !== additivePermissionCatalog.checkedOn) {
            issues.push({
              path: `${path}.sourceIds`,
              message: `source "${sourceId}" was not rechecked on the catalog date`,
            });
          }
        }
      }
    }
    if (isNonEmpty(entry.id)) {
      if (permissionIds.has(entry.id)) {
        issues.push({ path: `${path}.id`, message: `duplicates permission catalog entry "${entry.id}"` });
      }
      permissionIds.add(entry.id);
    }
    return true;
  };

  const categories = additivePermissionCatalog.categories;
  const categoriesById = new Map<string, Record<string, unknown>>();
  const categoryCodes = new Set<string>();
  if (!Array.isArray(categories) || categories.length === 0) {
    issues.push({ path: `${permissionPath}.categories`, message: 'must contain candidate food categories' });
  } else {
    categories.forEach((category, index) => {
      const path = `${permissionPath}.categories[${index}]`;
      if (!validatePermissionEntry(category, path, isRecord(category) ? category.sourceIds : undefined)) {
        return;
      }
      for (const key of ['code', 'name']) {
        addRequiredStringIssue(issues, category[key], `${path}.${key}`);
      }
      if (!['formulated-caffeinated-beverage', 'food-for-infants'].includes(String(category.cohort))) {
        issues.push({ path: `${path}.cohort`, message: 'is outside the selected additive permission cohorts' });
      }
      if (!['code-linked', 'candidate-review', 'child-review'].includes(String(category.classificationStatus))) {
        issues.push({ path: `${path}.classificationStatus`, message: 'has an unsupported classification status' });
      }
      if (!Array.isArray(category.headingPath) || category.headingPath.length === 0) {
        issues.push({ path: `${path}.headingPath`, message: 'must include its full Schedule 15 heading path' });
      } else {
        const headingCodes = new Set<string>();
        category.headingPath.forEach((heading, headingIndex) => {
          const headingPath = `${path}.headingPath[${headingIndex}]`;
          if (!isRecord(heading)) {
            issues.push({ path: headingPath, message: 'must be an object' });
            return;
          }
          addRequiredStringIssue(issues, heading.code, `${headingPath}.code`);
          addRequiredStringIssue(issues, heading.title, `${headingPath}.title`);
          if (isNonEmpty(heading.code) && headingCodes.has(heading.code)) {
            issues.push({ path: `${headingPath}.code`, message: 'duplicates a heading in this path' });
          }
          if (isNonEmpty(heading.code)) {
            headingCodes.add(heading.code);
          }
        });
        const finalHeading = category.headingPath[category.headingPath.length - 1];
        if (
          isRecord(finalHeading)
          && (finalHeading.code !== category.code || finalHeading.title !== category.name)
        ) {
          issues.push({ path: `${path}.headingPath`, message: 'must end with the candidate category code and name' });
        }
      }
      if (
        !Array.isArray(category.inheritedPermissionRowIds)
        || !category.inheritedPermissionRowIds.every(isNonEmpty)
        || new Set(category.inheritedPermissionRowIds).size !== category.inheritedPermissionRowIds.length
      ) {
        issues.push({
          path: `${path}.inheritedPermissionRowIds`,
          message: 'must contain unique inherited permission row IDs',
        });
      }
      if (isNonEmpty(category.code)) {
        if (categoryCodes.has(category.code)) {
          issues.push({ path: `${path}.code`, message: `duplicates candidate category "${category.code}"` });
        }
        categoryCodes.add(category.code);
      }
      if (isNonEmpty(category.id)) {
        categoriesById.set(category.id, category);
      }
    });
  }

  const typeGrants = additivePermissionCatalog.typeGrants;
  if (!Array.isArray(typeGrants)) {
    issues.push({ path: `${permissionPath}.typeGrants`, message: 'must be an array' });
  } else {
    typeGrants.forEach((grant, index) => {
      const path = `${permissionPath}.typeGrants[${index}]`;
      if (!validatePermissionEntry(grant, path, isRecord(grant) ? grant.sourceIds : undefined)) {
        return;
      }
      addRequiredStringIssue(issues, grant.categoryId, `${path}.categoryId`);
      addRequiredStringIssue(issues, grant.schedule15Heading, `${path}.schedule15Heading`);
      addRequiredStringIssue(issues, grant.description, `${path}.description`);
      if (!['S16—2', 'S16—3', 'S16—4'].includes(String(grant.schedule16Provision))) {
        issues.push({ path: `${path}.schedule16Provision`, message: 'has an unsupported Schedule 16 provision' });
      }
      if (
        isNonEmpty(grant.categoryId)
        && !categoriesById.has(grant.categoryId)
      ) {
        issues.push({ path: `${path}.categoryId`, message: 'references a missing candidate category' });
      }
    });
  }

  const permissionRows = additivePermissionCatalog.rows;
  const permissionRowsById = new Map<string, Record<string, unknown>>();
  if (!Array.isArray(permissionRows) || permissionRows.length === 0) {
    issues.push({ path: `${permissionPath}.rows`, message: 'must contain candidate permission rows' });
  } else {
    permissionRows.forEach((row, index) => {
      const path = `${permissionPath}.rows[${index}]`;
      if (!validatePermissionEntry(row, path, isRecord(row) ? row.sourceIds : undefined)) {
        return;
      }
      addRequiredStringIssue(issues, row.categoryId, `${path}.categoryId`);
      addRequiredStringIssue(issues, row.description, `${path}.description`);
      if (!['direct', 'child-candidate'].includes(String(row.applicability))) {
        issues.push({ path: `${path}.applicability`, message: 'has an unsupported row applicability' });
      }
      if (!Number.isInteger(row.sourcePosition) || Number(row.sourcePosition) < 1) {
        issues.push({ path: `${path}.sourcePosition`, message: 'must be a positive integer' });
      }
      if (
        !Array.isArray(row.additiveIdentifiers)
        || !row.additiveIdentifiers.every(isNonEmpty)
        || new Set(row.additiveIdentifiers).size !== row.additiveIdentifiers.length
      ) {
        issues.push({
          path: `${path}.additiveIdentifiers`,
          message: 'must contain unique source identifiers when the row has identifiers',
        });
      }
      if (
        !Array.isArray(row.calculationBasisIds)
        || !row.calculationBasisIds.every(isNonEmpty)
        || new Set(row.calculationBasisIds).size !== row.calculationBasisIds.length
      ) {
        issues.push({
          path: `${path}.calculationBasisIds`,
          message: 'must contain unique calculation-basis IDs',
        });
      }
      if (!Array.isArray(row.conditions)) {
        issues.push({ path: `${path}.conditions`, message: 'must be an array of supported source conditions' });
      } else {
        row.conditions.forEach((condition, conditionIndex) => {
          const conditionPath = `${path}.conditions[${conditionIndex}]`;
          if (!isRecord(condition) || condition.type !== 'sourceText') {
            issues.push({ path: conditionPath, message: 'uses an unsupported condition type' });
          } else {
            addRequiredStringIssue(issues, condition.text, `${conditionPath}.text`);
          }
        });
      }
      if (!['transcribed', 'table-presentation-unverified'].includes(String(row.sourceValidation))) {
        issues.push({ path: `${path}.sourceValidation`, message: 'has an unsupported source-validation status' });
      }
      if (
        row.sourceValidation === 'table-presentation-unverified'
        && row.reviewStatus !== 'draft'
      ) {
        issues.push({
          path: `${path}.reviewStatus`,
          message: 'must remain draft while the source table presentation is unverified',
        });
      }
      if (!isRecord(row.limit)) {
        issues.push({ path: `${path}.limit`, message: 'must be an object' });
      } else {
        if (!['GMP', 'maximum'].includes(String(row.limit.type))) {
          issues.push({ path: `${path}.limit.type`, message: 'has an unsupported limit type' });
        }
        if (!['not-applicable', 'mg/kg-default', 'mg/L'].includes(String(row.limit.unit))) {
          issues.push({ path: `${path}.limit.unit`, message: 'has an unsupported unit' });
        }
        if (!['draft', 'reviewed'].includes(String(row.limit.reviewStatus))) {
          issues.push({ path: `${path}.limit.reviewStatus`, message: 'has an unsupported status' });
        }
        if (
          row.limit.type === 'GMP'
          && (row.limit.unit !== 'not-applicable' || row.limit.printedValue !== undefined)
        ) {
          issues.push({ path: `${path}.limit`, message: 'GMP limits cannot contain a numeric value or unit' });
        }
        if (
          row.limit.type === 'maximum'
          && (
            !isNonEmpty(row.limit.printedValue)
            || !['mg/kg-default', 'mg/L'].includes(String(row.limit.unit))
          )
        ) {
          issues.push({ path: `${path}.limit`, message: 'maximum limits require a printed value and supported unit' });
        }
        if (
          row.limit.basisText !== undefined
          && !isNonEmpty(row.limit.basisText)
        ) {
          issues.push({ path: `${path}.limit.basisText`, message: 'must be non-empty when supplied' });
        }
      }
      if (
        isNonEmpty(row.categoryId)
        && !categoriesById.has(row.categoryId)
      ) {
        issues.push({ path: `${path}.categoryId`, message: 'references a missing candidate category' });
      }
      if (isNonEmpty(row.id)) {
        permissionRowsById.set(row.id, row);
      }
    });
    const rowPositions = new Set<string>();
    for (const [index, row] of permissionRows.entries()) {
      if (!isRecord(row) || !isNonEmpty(row.categoryId) || !Number.isInteger(row.sourcePosition)) {
        continue;
      }
      const positionKey = `${row.categoryId}:${row.sourcePosition}`;
      if (rowPositions.has(positionKey)) {
        issues.push({
          path: `${permissionPath}.rows[${index}].sourcePosition`,
          message: 'duplicates a row position within the category',
        });
      }
      rowPositions.add(positionKey);
    }
  }

  if (Array.isArray(categories)) {
    categories.forEach((category, index) => {
      if (!isRecord(category) || !Array.isArray(category.inheritedPermissionRowIds)) {
        return;
      }
      category.inheritedPermissionRowIds.forEach((rowId, rowIndex) => {
        if (!permissionRowsById.has(String(rowId))) {
          issues.push({
            path: `${permissionPath}.categories[${index}].inheritedPermissionRowIds[${rowIndex}]`,
            message: `references a missing inherited permission row "${String(rowId)}"`,
          });
        }
      });
    });
  }

  const calculationBases = additivePermissionCatalog.calculationBases;
  const calculationBasisIds = new Set<string>();
  if (!Array.isArray(calculationBases)) {
    issues.push({ path: `${permissionPath}.calculationBases`, message: 'must be an array' });
  } else {
    calculationBases.forEach((basis, index) => {
      const path = `${permissionPath}.calculationBases[${index}]`;
      if (!validatePermissionEntry(basis, path, isRecord(basis) ? basis.sourceIds : undefined)) {
        return;
      }
      for (const key of ['provision', 'calculatedAs']) {
        addRequiredStringIssue(issues, basis[key], `${path}.${key}`);
      }
      if (
        !Array.isArray(basis.additiveIdentifiers)
        || !isUniqueNonEmptyList(basis.additiveIdentifiers)
      ) {
        issues.push({
          path: `${path}.additiveIdentifiers`,
          message: 'must contain unique additive identifiers',
        });
      }
      if (!['named-equivalent', 'factor-sum'].includes(String(basis.method))) {
        issues.push({ path: `${path}.method`, message: 'has an unsupported calculation method' });
      }
      if (!Array.isArray(basis.factors)) {
        issues.push({ path: `${path}.factors`, message: 'must be an array' });
      } else {
        basis.factors.forEach((factor, factorIndex) => {
          const factorPath = `${path}.factors[${factorIndex}]`;
          if (!isRecord(factor)) {
            issues.push({ path: factorPath, message: 'must be an object' });
            return;
          }
          addRequiredStringIssue(issues, factor.substance, `${factorPath}.substance`);
          addRequiredStringIssue(issues, factor.factor, `${factorPath}.factor`);
          if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(String(factor.factor ?? ''))) {
            issues.push({ path: `${factorPath}.factor`, message: 'must be a non-negative decimal string' });
          }
        });
      }
      if (basis.method === 'factor-sum' && (!isNonEmpty(basis.formula) || !Array.isArray(basis.factors) || basis.factors.length === 0)) {
        issues.push({ path, message: 'factor-sum methods require a formula and factor table' });
      }
      if (
        basis.method === 'named-equivalent'
        && Array.isArray(basis.factors)
        && basis.factors.length !== 0
      ) {
        issues.push({ path: `${path}.factors`, message: 'named-equivalent methods cannot contain a factor table' });
      }
      if (isNonEmpty(basis.id)) {
        calculationBasisIds.add(basis.id);
      }
    });
  }
  if (Array.isArray(permissionRows)) {
    permissionRows.forEach((row, index) => {
      if (!isRecord(row) || !Array.isArray(row.calculationBasisIds)) {
        return;
      }
      row.calculationBasisIds.forEach((basisId, basisIndex) => {
        if (!calculationBasisIds.has(String(basisId))) {
          issues.push({
            path: `${permissionPath}.rows[${index}].calculationBasisIds[${basisIndex}]`,
            message: `references a missing calculation basis "${String(basisId)}"`,
          });
        }
      });
    });
  }

  const purposes = additivePermissionCatalog.purposes;
  if (!Array.isArray(purposes) || purposes.length === 0) {
    issues.push({ path: `${permissionPath}.purposes`, message: 'must contain the Schedule 14 purpose vocabulary' });
  } else {
    purposes.forEach((purpose, index) => {
      const path = `${permissionPath}.purposes[${index}]`;
      if (!validatePermissionEntry(purpose, path, isRecord(purpose) ? purpose.sourceIds : undefined)) {
        return;
      }
      addRequiredStringIssue(issues, purpose.name, `${path}.name`);
      if (
        !Array.isArray(purpose.subClasses)
        || !purpose.subClasses.every(isNonEmpty)
        || new Set(purpose.subClasses).size !== purpose.subClasses.length
      ) {
        issues.push({ path: `${path}.subClasses`, message: 'must contain unique non-empty sub-class names' });
      }
      if (!Number.isInteger(purpose.sourcePosition) || Number(purpose.sourcePosition) < 1) {
        issues.push({ path: `${path}.sourcePosition`, message: 'must be a positive integer' });
      }
    });
  }

  const governingProvisions = additivePermissionCatalog.governingProvisions;
  if (!Array.isArray(governingProvisions) || governingProvisions.length === 0) {
    issues.push({
      path: `${permissionPath}.governingProvisions`,
      message: 'must summarize the source provisions governing permission evaluation',
    });
  } else {
    governingProvisions.forEach((provision, index) => {
      const path = `${permissionPath}.governingProvisions[${index}]`;
      if (!validatePermissionEntry(provision, path, isRecord(provision) ? provision.sourceIds : undefined)) {
        return;
      }
      addRequiredStringIssue(issues, provision.provision, `${path}.provision`);
      addRequiredStringIssue(issues, provision.effect, `${path}.effect`);
    });
  }

  if (
    !Array.isArray(additivePermissionCatalog.reviewNotes)
    || additivePermissionCatalog.reviewNotes.length === 0
    || !additivePermissionCatalog.reviewNotes.every(isNonEmpty)
  ) {
    issues.push({ path: `${permissionPath}.reviewNotes`, message: 'must contain non-empty review notes' });
  }

  const namePath = 'release.prescribedNameCandidateCatalog';
  addRequiredStringIssue(issues, nameCatalog.version, `${namePath}.version`);
  addDateIssue(issues, nameCatalog.checkedOn, `${namePath}.checkedOn`);
  if (!['draft', 'reviewed'].includes(String(nameCatalog.status))) {
    issues.push({ path: `${namePath}.status`, message: 'has an unsupported status' });
  }
  const checkNameSources = (ids: unknown, path: string, checkDate: boolean): void => {
    if (!isUniqueNonEmptyList(ids)) {
      issues.push({ path, message: 'must contain unique source IDs' });
      return;
    }
    for (const sourceId of ids) {
      const source = sourceById.get(sourceId);
      if (source === undefined) {
        issues.push({ path, message: `references missing source "${sourceId}"` });
      } else if (source.verificationStatus !== 'primary-source-verified') {
        issues.push({ path, message: `source "${sourceId}" needs a primary-source recheck` });
      } else if (checkDate && source.checkedOn !== nameCatalog.checkedOn) {
        issues.push({ path, message: `source "${sourceId}" was not rechecked on the catalog date` });
      }
    }
  };
  checkNameSources(nameCatalog.sourceIds, `${namePath}.sourceIds`, true);
  const nameCatalogSourceIds = new Set(
    Array.isArray(nameCatalog.sourceIds) ? nameCatalog.sourceIds.filter(isNonEmpty) : [],
  );
  const nameRuleIds = new Set<string>();
  const nameCohorts = ['formulated_caffeinated_beverage', 'food_for_infants'];
  const nameKinds = ['prescribed_name', 'name_linked_requirement', 'no_prescribed_name_identified'];
  const confidences = ['Provision', 'Standard', 'Instrument', 'Guidance-only', 'Unmapped'];
  if (!Array.isArray(nameCatalog.rules) || nameCatalog.rules.length === 0) {
    issues.push({ path: `${namePath}.rules`, message: 'must be a non-empty array' });
  } else {
    nameCatalog.rules.forEach((rule, index) => {
      const path = `${namePath}.rules[${index}]`;
      if (!isRecord(rule)) {
        issues.push({ path, message: 'must be an object' });
        return;
      }
      addRequiredStringIssue(issues, rule.id, `${path}.id`);
      if (isNonEmpty(rule.id)) {
        if (nameRuleIds.has(rule.id)) {
          issues.push({ path: `${path}.id`, message: 'must be unique' });
        }
        nameRuleIds.add(rule.id);
      }
      if (!nameCohorts.includes(String(rule.cohort))) {
        issues.push({ path: `${path}.cohort`, message: 'must be a supported MVP cohort' });
      }
      if (!nameKinds.includes(String(rule.kind))) {
        issues.push({ path: `${path}.kind`, message: 'has an unsupported kind' });
      }
      if (!confidences.includes(String(rule.mappingConfidence))) {
        issues.push({ path: `${path}.mappingConfidence`, message: 'has an unsupported mapping confidence' });
      }
      if (!['draft', 'reviewed'].includes(String(rule.reviewStatus))) {
        issues.push({ path: `${path}.reviewStatus`, message: 'has an unsupported status' });
      }
      for (const field of ['provision', 'triggerSummary', 'requirement'] as const) {
        addRequiredStringIssue(issues, rule[field], `${path}.${field}`);
      }
      checkNameSources(rule.sourceIds, `${path}.sourceIds`, false);
      if (Array.isArray(rule.sourceIds)) {
        for (const sourceId of rule.sourceIds) {
          if (!nameCatalogSourceIds.has(sourceId as string)) {
            issues.push({ path: `${path}.sourceIds`, message: `source "${String(sourceId)}" is not listed on the catalog` });
          }
        }
      }
      for (const field of ['labelTextTerms', 'ingredientTerms', 'exclusions', 'requiredFacts'] as const) {
        const list = rule[field];
        if (!Array.isArray(list) || !list.every(isNonEmpty)) {
          issues.push({ path: `${path}.${field}`, message: 'must be an array of non-empty strings' });
        }
      }
      if (
        rule.kind !== 'no_prescribed_name_identified'
        && rule.mappingConfidence !== 'Provision'
        && rule.mappingConfidence !== 'Standard'
      ) {
        issues.push({ path: `${path}.mappingConfidence`, message: 'is too weak for a name rule' });
      }
    });
  }
  if (
    !Array.isArray(nameCatalog.reviewNotes)
    || nameCatalog.reviewNotes.length === 0
    || !nameCatalog.reviewNotes.every(isNonEmpty)
  ) {
    issues.push({ path: `${namePath}.reviewNotes`, message: 'must contain non-empty review notes' });
  }

  validateClaimRuleCatalog(value.claimRuleCatalog as Record<string, unknown>, sourceById, value.status === 'active', issues);

  if (value.status === 'active') {
    if (nameCatalog.status !== 'reviewed') {
      issues.push({ path: `${namePath}.status`, message: 'must be reviewed before release activation' });
    }
    if (Array.isArray(nameCatalog.rules)) {
      nameCatalog.rules.forEach((rule, index) => {
        if (isRecord(rule) && rule.reviewStatus !== 'reviewed') {
          issues.push({
            path: `${namePath}.rules[${index}].reviewStatus`,
            message: 'must be reviewed before release activation',
          });
        }
      });
    }
    for (const [index, source] of sources.entries()) {
      if (isRecord(source) && source.verificationStatus !== 'primary-source-verified') {
        issues.push({
          path: `release.sources[${index}].verificationStatus`,
          message: 'must be primary-source-verified before release activation',
        });
      }
    }
    for (const [index, rule] of rules.entries()) {
      if (isRecord(rule) && rule.reviewStatus !== 'reviewed') {
        issues.push({
          path: `release.rules[${index}].reviewStatus`,
          message: 'must be reviewed before release activation',
        });
      }
    }
    if (isRecord(vocabulary) && vocabulary.status !== 'reviewed') {
      issues.push({
        path: 'release.allergenVocabulary.status',
        message: 'must be reviewed before release activation',
      });
    }
    if (isRecord(vocabulary) && Array.isArray(vocabulary.entries)) {
      vocabulary.entries.forEach((entry, index) => {
        if (isRecord(entry) && entry.reviewStatus !== 'reviewed') {
          issues.push({
            path: `release.allergenVocabulary.entries[${index}].reviewStatus`,
            message: 'must be reviewed before release activation',
          });
        }
      });
    }
    if (additiveDeclarationCatalog.status !== 'reviewed') {
      issues.push({
        path: `${catalogPath}.status`,
        message: 'must be reviewed before release activation',
      });
    }
    for (const [field, entries] of [
      ['formats', formats],
      ['schedule7ClassNames', schedule7ClassNames],
      ['schedule8Substances', schedule8Substances],
      ['listingDifferences', listingDifferences],
      ['mappings', mappings],
    ] as const) {
      if (Array.isArray(entries)) {
        entries.forEach((entry, index) => {
          if (isRecord(entry) && entry.reviewStatus !== 'reviewed') {
            issues.push({
              path: `${catalogPath}.${field}[${index}].reviewStatus`,
              message: 'must be reviewed before release activation',
            });
          }
        });
      }
    }
    if (additivePermissionCatalog.status !== 'reviewed') {
      issues.push({
        path: `${permissionPath}.status`,
        message: 'must be reviewed before release activation',
      });
    }
    for (const [field, entries] of [
      ['categories', categories],
      ['typeGrants', typeGrants],
      ['rows', permissionRows],
      ['calculationBases', calculationBases],
      ['purposes', purposes],
      ['governingProvisions', governingProvisions],
    ] as const) {
      if (Array.isArray(entries)) {
        entries.forEach((entry, index) => {
          if (isRecord(entry) && entry.reviewStatus !== 'reviewed') {
            issues.push({
              path: `${permissionPath}.${field}[${index}].reviewStatus`,
              message: 'must be reviewed before release activation',
            });
          }
          if (
            field === 'rows'
            && isRecord(entry)
            && isRecord(entry.limit)
            && entry.limit.reviewStatus !== 'reviewed'
          ) {
            issues.push({
              path: `${permissionPath}.rows[${index}].limit.reviewStatus`,
              message: 'must be reviewed before release activation',
            });
          }
        });
      }
    }
  }

  if (issues.length > 0) {
    throw new RuleValidationError(issues);
  }
}
