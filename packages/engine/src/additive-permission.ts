import type {
  AdditivePermissionCatalogRow,
  AdditivePermissionEvaluationInput,
  AdditivePermissionEvaluationValue,
  AdditivePermissionReviewReason,
  EngineResult,
  EvaluationInputTrace,
} from '@aus-food/domain';
import { compareDecimals } from './decimal.js';

const NON_CERTIFICATION = 'This result assists review and does not certify legal compliance.' as const;

const REASON_TEXT: Record<AdditivePermissionReviewReason, string> = {
  RULE_BELOW_PROVISION_CONFIDENCE: 'the rule mapping is below Provision confidence',
  CATALOG_NOT_REVIEWED: 'the permission catalog or category has not been reviewed',
  CATEGORY_NOT_CONFIRMED: 'no Schedule 15 food category has been confirmed by a person',
  CATEGORY_NOT_IN_CATALOG: 'the confirmed category is not mapped in the catalog',
  ADDITIVE_IDENTITY_MISSING: 'the additive code number is missing',
  PURPOSE_MISSING: 'the technological purpose is missing',
  PURPOSE_NOT_IN_SCHEDULE_14: 'the stated purpose is not in the Schedule 14 vocabulary',
  FOOD_STATE_MISSING: 'the food state (as sold, prepared, reconstituted) is missing',
  SOURCE_STATUS_NOT_ADDED: 'the additive is not recorded as added; carry-over and processing-aid paths are not mapped',
  NO_ROW_IDENTIFIED: 'no Schedule 15 row for this additive was found in the catalog, which is not a complete permission set',
  AMBIGUOUS_ROWS: 'more than one catalog row matches the additive',
  ROW_NOT_REVIEWED: 'the matching row or its limit has not been reviewed',
  ROW_SOURCE_UNVERIFIED: 'the matching row has an unverified source table presentation',
  ROW_CONDITIONS_NOT_EVALUATED: 'the matching row has source conditions that are not evaluated',
  ROW_AGGREGATED_LIMIT: 'the matching row belongs to an aggregated limit that is not calculated here',
  GMP_NOT_CONFIRMED: 'good manufacturing practice has not been confirmed by a person',
  CONCENTRATION_MISSING: 'the final concentration is missing or invalid',
  EVIDENCE_MISSING: 'dated evidence for the concentration is missing',
  UNIT_MISMATCH: 'the concentration unit does not match the row limit unit',
  CALCULATION_BASIS_MISMATCH: 'the concentration is not stated on the calculation basis the row requires',
};

function normalise(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function purposeInVocabulary(
  purpose: string,
  purposes: AdditivePermissionEvaluationInput['catalog']['purposes'],
): boolean {
  const wanted = normalise(purpose);
  return purposes.some(
    (entry) => normalise(entry.name) === wanted || entry.subClasses.some((sub) => normalise(sub) === wanted),
  );
}

function rowReasons(
  row: AdditivePermissionCatalogRow,
  input: AdditivePermissionEvaluationInput,
): AdditivePermissionReviewReason[] {
  const reasons: AdditivePermissionReviewReason[] = [];
  if (row.reviewStatus !== 'reviewed' || row.limit.reviewStatus !== 'reviewed') {
    reasons.push('ROW_NOT_REVIEWED');
  }
  if (row.sourceValidation !== 'transcribed') {
    reasons.push('ROW_SOURCE_UNVERIFIED');
  }
  if (row.conditions.length > 0) {
    reasons.push('ROW_CONDITIONS_NOT_EVALUATED');
  }
  if (row.aggregationGroup !== undefined) {
    reasons.push('ROW_AGGREGATED_LIMIT');
  }
  if (row.limit.type === 'GMP') {
    if (input.gmpConfirmed !== true) {
      reasons.push('GMP_NOT_CONFIRMED');
    }
    return reasons;
  }

  const concentration = input.finalConcentration;
  if (concentration === undefined || !isUsableDecimal(concentration.value)) {
    reasons.push('CONCENTRATION_MISSING');
    return reasons;
  }
  if (input.evidence === undefined) {
    reasons.push('EVIDENCE_MISSING');
  }
  const expectedUnit = row.limit.unit === 'mg/L' ? 'mg/L' : 'mg/kg';
  if (concentration.unit !== expectedUnit) {
    reasons.push('UNIT_MISMATCH');
  }
  if (row.calculationBasisIds.length > 0) {
    const accepted = row.calculationBasisIds.flatMap((id) =>
      input.catalog.calculationBases.filter((basis) => basis.id === id).map((basis) => normalise(basis.calculatedAs)),
    );
    if (!accepted.includes(normalise(concentration.calculatedAs))) {
      reasons.push('CALCULATION_BASIS_MISMATCH');
    }
  }
  return reasons;
}

function isUsableDecimal(value: string): boolean {
  try {
    return compareDecimals(value, '0') >= 0;
  } catch {
    return false;
  }
}

function traceInputs(input: AdditivePermissionEvaluationInput): EvaluationInputTrace[] {
  const sourcePath = [...(input.sourcePath ?? [])];
  const supplied = (name: string, value: string | undefined, unit?: string): EvaluationInputTrace => ({
    name,
    value: value ?? 'not supplied',
    ...(unit === undefined ? {} : { unit }),
    sourceId: input.evidence?.reference ?? 'not supplied',
    sourceDate: input.evidence?.sourceDate ?? 'not supplied',
    sourcePath,
  });
  return [
    supplied('Confirmed food category', input.confirmedCategoryId),
    supplied('Additive code number', input.additiveCodeNumber),
    supplied('Technological purpose', input.technologicalPurpose),
    supplied('Food state', input.foodState),
    supplied('Source status', input.sourceStatus),
    supplied(
      'Final concentration',
      input.finalConcentration === undefined
        ? undefined
        : `${input.finalConcentration.value}${input.finalConcentration.calculatedAs === undefined ? '' : ` (as ${input.finalConcentration.calculatedAs})`}`,
      input.finalConcentration?.unit,
    ),
  ];
}

export function evaluateAdditivePermission(
  input: AdditivePermissionEvaluationInput,
): EngineResult<AdditivePermissionEvaluationValue> {
  const { catalog } = input;
  const reasons: AdditivePermissionReviewReason[] = [];
  if (input.rule.mappingConfidence !== 'Provision') {
    reasons.push('RULE_BELOW_PROVISION_CONFIDENCE');
  }
  if (catalog.status !== 'reviewed') {
    reasons.push('CATALOG_NOT_REVIEWED');
  }

  const category = input.confirmedCategoryId === undefined
    ? undefined
    : catalog.categories.find((entry) => entry.id === input.confirmedCategoryId);
  if (input.confirmedCategoryId === undefined) {
    reasons.push('CATEGORY_NOT_CONFIRMED');
  } else if (category === undefined) {
    reasons.push('CATEGORY_NOT_IN_CATALOG');
  } else if (category.reviewStatus !== 'reviewed' && !reasons.includes('CATALOG_NOT_REVIEWED')) {
    reasons.push('CATALOG_NOT_REVIEWED');
  }

  const code = input.additiveCodeNumber?.trim();
  if (code === undefined || code === '') {
    reasons.push('ADDITIVE_IDENTITY_MISSING');
  }
  const purpose = input.technologicalPurpose?.trim();
  if (purpose === undefined || purpose === '') {
    reasons.push('PURPOSE_MISSING');
  } else if (!purposeInVocabulary(purpose, catalog.purposes)) {
    reasons.push('PURPOSE_NOT_IN_SCHEDULE_14');
  }
  if (input.foodState === undefined) {
    reasons.push('FOOD_STATE_MISSING');
  }
  if (input.sourceStatus !== 'added') {
    reasons.push('SOURCE_STATUS_NOT_ADDED');
  }

  let row: AdditivePermissionCatalogRow | undefined;
  if (category !== undefined && code !== undefined && code !== '') {
    const matches = catalog.rows.filter(
      (candidate) =>
        candidate.categoryId === category.id
        && candidate.additiveIdentifiers.some((identifier) => normalise(identifier) === normalise(code)),
    );
    if (matches.length === 0) {
      reasons.push('NO_ROW_IDENTIFIED');
    } else if (matches.length > 1) {
      reasons.push('AMBIGUOUS_ROWS');
    } else {
      row = matches[0];
      reasons.push(...rowReasons(row!, input));
    }
  }

  const rule = input.rule;
  // Schedule 15 prints thousands with a space ("3 000"); the decimal helpers need plain digits.
  const printedLimit = row?.limit.printedValue?.replace(/\s+/g, '');
  const maximum = row?.limit.type === 'maximum' && printedLimit !== undefined
    ? { value: printedLimit, unit: row.limit.unit === 'mg/L' ? 'mg/L' : 'mg/kg' }
    : undefined;
  const base = {
    rule,
    inputs: traceInputs(input),
    nonCertificationStatement: NON_CERTIFICATION,
    title: 'Additive permission check',
    whatWasChecked:
      'Whether the recorded additive, purpose and final concentration fit one mapped Schedule 15 row for the confirmed food category.',
  };
  const valueBase = {
    categoryId: category?.id,
    selectedRowId: row?.id,
    conditions: row?.conditions.map((condition) => condition.text) ?? [],
    ...(maximum === undefined ? {} : { maximum }),
  };

  if (reasons.length > 0 || row === undefined) {
    const unique = [...new Set(reasons)];
    return {
      ...base,
      status: 'REVIEW REQUIRED',
      applicationMode: row === undefined ? 'UNDETERMINABLE' : 'CANDIDATE',
      value: { ...valueBase, outcome: 'review', reasons: unique },
      explanation: `No permission result: ${unique.map((reason) => REASON_TEXT[reason]).join('; ')}.`,
      suggestedAction: 'Confirm the food category, additive identity, purpose, evidence and row conditions with a reviewer.',
    };
  }

  if (row.limit.type === 'GMP') {
    return {
      ...base,
      status: 'PASS',
      applicationMode: 'APPLIED',
      value: { ...valueBase, outcome: 'permitted_at_gmp', reasons: [] },
      explanation: `Row ${row.id} permits this additive at good manufacturing practice, which was confirmed by a person. No numerical maximum applies.`,
    };
  }

  const concentration = input.finalConcentration!;
  const limit = printedLimit!;
  const exceeds = compareDecimals(concentration.value, limit) > 0;
  return {
    ...base,
    status: exceeds ? 'FAIL' : 'PASS',
    applicationMode: 'APPLIED',
    value: { ...valueBase, outcome: exceeds ? 'exceeds_limit' : 'within_limit', reasons: [] },
    explanation: `Recorded concentration ${concentration.value} ${concentration.unit} is ${exceeds ? 'above' : 'at or below'} the row ${row.id} maximum of ${limit} ${maximum?.unit ?? ''}.`,
  };
}
