import { describe, expect, it } from 'vitest';
import type {
  AdditivePermissionCatalogView,
  AdditivePermissionEvaluationInput,
  RuleTraceMetadata,
} from '@aus-food/domain';
import { evaluateAdditivePermission } from './additive-permission.js';

const rule: RuleTraceMetadata = {
  id: 'additive.permission',
  name: 'Additive permission',
  instrument: 'Australia New Zealand Food Standards Code',
  provision: 'Standard 1.3.1—3; Schedule 15 S15—5',
  sourceUrl: 'https://www.legislation.gov.au/F2015L00439/latest/text',
  jurisdiction: 'Australia and New Zealand',
  effectiveFrom: '2026-04-30',
  version: 'test',
  mappingConfidence: 'Provision',
};

const limit = (value: string, unit: 'mg/kg-default' | 'mg/L' = 'mg/kg-default') => ({
  type: 'maximum' as const,
  printedValue: value,
  unit,
  reviewStatus: 'reviewed' as const,
});

const catalog: AdditivePermissionCatalogView = {
  version: 'test',
  checkedOn: '2026-11-09',
  status: 'reviewed',
  categories: [{ id: 'cat-a', code: 'X', name: 'Test category', reviewStatus: 'reviewed' }],
  typeGrants: [],
  purposes: [{ name: 'Preservative', subClasses: ['antimicrobial'] }],
  calculationBases: [{ id: 'calc-sorbic', calculatedAs: 'sorbic acid' }],
  rows: [
    {
      id: 'row-max', categoryId: 'cat-a', additiveIdentifiers: ['200'], calculationBasisIds: ['calc-sorbic'],
      description: 'Sorbic acid', limit: limit('100'), conditions: [], sourceValidation: 'transcribed',
      sourceIds: ['S'], reviewStatus: 'reviewed',
    },
    {
      id: 'row-gmp', categoryId: 'cat-a', additiveIdentifiers: ['330'], calculationBasisIds: [],
      description: 'Citric acid', limit: { type: 'GMP', unit: 'not-applicable', reviewStatus: 'reviewed' },
      conditions: [], sourceValidation: 'transcribed', sourceIds: ['S'], reviewStatus: 'reviewed',
    },
    {
      id: 'row-cond', categoryId: 'cat-a', additiveIdentifiers: ['950'], calculationBasisIds: [],
      description: 'Acesulfame', limit: limit('50'), conditions: [{ type: 'sourceText', text: 'Only tonic drinks' }],
      sourceValidation: 'transcribed', sourceIds: ['S'], reviewStatus: 'reviewed',
    },
    {
      id: 'row-agg', categoryId: 'cat-a', additiveIdentifiers: ['1410'], calculationBasisIds: [],
      description: 'Starch', limit: limit('10'), conditions: [], aggregationGroup: 'g',
      sourceValidation: 'transcribed', sourceIds: ['S'], reviewStatus: 'reviewed',
    },
    {
      id: 'row-unverified', categoryId: 'cat-a', additiveIdentifiers: ['414'], calculationBasisIds: [],
      description: 'Gum', limit: limit('10'), conditions: [], sourceValidation: 'table-presentation-unverified',
      sourceIds: ['S'], reviewStatus: 'draft',
    },
    {
      id: 'row-dup-1', categoryId: 'cat-a', additiveIdentifiers: ['999'], calculationBasisIds: [],
      description: 'Dup', limit: limit('1'), conditions: [], sourceValidation: 'transcribed',
      sourceIds: ['S'], reviewStatus: 'reviewed',
    },
    {
      id: 'row-dup-2', categoryId: 'cat-a', additiveIdentifiers: ['999'], calculationBasisIds: [],
      description: 'Dup', limit: limit('2'), conditions: [], sourceValidation: 'transcribed',
      sourceIds: ['S'], reviewStatus: 'reviewed',
    },
  ],
};

const complete: AdditivePermissionEvaluationInput = {
  catalog,
  rule,
  confirmedCategoryId: 'cat-a',
  additiveCodeNumber: '200',
  technologicalPurpose: 'preservative',
  foodState: 'asSold',
  sourceStatus: 'added',
  finalConcentration: { value: '100', unit: 'mg/kg', calculatedAs: 'sorbic acid' },
  evidence: { reference: 'lab-report-1', sourceDate: '2026-11-01' },
  sourcePath: ['product', 'line', 'ingredient'],
};

function reasons(input: AdditivePermissionEvaluationInput): readonly string[] {
  const result = evaluateAdditivePermission(input);
  expect(result.status).toBe('REVIEW REQUIRED');
  return result.value?.reasons ?? [];
}

describe('additive permission evaluation', () => {
  it('reads a thousands value printed with a space ("3 000") as 3000', () => {
    const spaced: AdditivePermissionEvaluationInput = {
      ...complete,
      catalog: {
        ...catalog,
        rows: catalog.rows.map((row) => (row.id === 'row-max' ? { ...row, limit: limit('3 000') } : row)),
      },
    };
    const within = (value: string) =>
      evaluateAdditivePermission({
        ...spaced,
        finalConcentration: { value, unit: 'mg/kg', calculatedAs: 'sorbic acid' },
      });
    expect(within('3000')).toMatchObject({
      status: 'PASS',
      value: { outcome: 'within_limit', maximum: { value: '3000', unit: 'mg/kg' } },
    });
    expect(within('3000.1')).toMatchObject({ status: 'FAIL', value: { outcome: 'exceeds_limit' } });
  });

  it('passes at the maximum boundary and fails just above it, with trace and row', () => {
    const atLimit = evaluateAdditivePermission(complete);
    expect(atLimit).toMatchObject({
      status: 'PASS',
      applicationMode: 'APPLIED',
      value: { outcome: 'within_limit', selectedRowId: 'row-max', maximum: { value: '100', unit: 'mg/kg' } },
    });
    expect(atLimit.rule).toBe(rule);
    expect(atLimit.inputs.find(({ name }) => name === 'Final concentration')).toMatchObject({
      value: '100 (as sorbic acid)',
      unit: 'mg/kg',
      sourceId: 'lab-report-1',
      sourcePath: ['product', 'line', 'ingredient'],
    });

    const above = evaluateAdditivePermission({
      ...complete,
      finalConcentration: { value: '100.0001', unit: 'mg/kg', calculatedAs: 'sorbic acid' },
    });
    expect(above).toMatchObject({ status: 'FAIL', value: { outcome: 'exceeds_limit' } });
    expect(above.explanation).toContain('above');
  });

  it('passes a GMP row only when a person confirmed GMP', () => {
    const gmp = { ...complete, additiveCodeNumber: '330', finalConcentration: undefined };
    expect(reasons(gmp)).toEqual(['GMP_NOT_CONFIRMED']);
    expect(evaluateAdditivePermission({ ...gmp, gmpConfirmed: true })).toMatchObject({
      status: 'PASS',
      value: { outcome: 'permitted_at_gmp' },
    });
  });

  it('returns REVIEW REQUIRED for a conditional row and shows the conditions', () => {
    const result = evaluateAdditivePermission({
      ...complete,
      additiveCodeNumber: '950',
      finalConcentration: { value: '1', unit: 'mg/kg' },
    });
    expect(result).toMatchObject({
      status: 'REVIEW REQUIRED',
      applicationMode: 'CANDIDATE',
      value: { reasons: ['ROW_CONDITIONS_NOT_EVALUATED'], conditions: ['Only tonic drinks'] },
    });
  });

  it('never treats missing inputs as zero or PASS', () => {
    expect(reasons({ ...complete, finalConcentration: undefined })).toEqual(['CONCENTRATION_MISSING']);
    expect(reasons({
      ...complete,
      finalConcentration: { value: 'abc', unit: 'mg/kg', calculatedAs: 'sorbic acid' },
    })).toEqual(['CONCENTRATION_MISSING']);
    expect(reasons({ ...complete, evidence: undefined })).toEqual(['EVIDENCE_MISSING']);
    expect(reasons({ ...complete, confirmedCategoryId: undefined })).toContain('CATEGORY_NOT_CONFIRMED');
    expect(reasons({ ...complete, additiveCodeNumber: ' ' })).toContain('ADDITIVE_IDENTITY_MISSING');
    expect(reasons({ ...complete, technologicalPurpose: undefined })).toContain('PURPOSE_MISSING');
    expect(reasons({ ...complete, foodState: undefined })).toContain('FOOD_STATE_MISSING');
  });

  it('requires a Schedule 14 purpose, matching unit and required calculation basis', () => {
    expect(reasons({ ...complete, technologicalPurpose: 'sweetener' })).toEqual(['PURPOSE_NOT_IN_SCHEDULE_14']);
    expect(evaluateAdditivePermission({ ...complete, technologicalPurpose: 'Antimicrobial' }).status).toBe('PASS');
    expect(reasons({
      ...complete,
      finalConcentration: { value: '1', unit: 'mg/L', calculatedAs: 'sorbic acid' },
    })).toEqual(['UNIT_MISMATCH']);
    expect(reasons({
      ...complete,
      finalConcentration: { value: '1', unit: 'mg/kg' },
    })).toEqual(['CALCULATION_BASIS_MISMATCH']);
  });

  it('keeps unmapped, ambiguous, aggregated, unverified and non-added cases review-only', () => {
    expect(reasons({ ...complete, confirmedCategoryId: 'cat-missing' })).toEqual(['CATEGORY_NOT_IN_CATALOG']);
    expect(reasons({ ...complete, additiveCodeNumber: '123' })).toEqual(['NO_ROW_IDENTIFIED']);
    expect(reasons({ ...complete, additiveCodeNumber: '999' })).toEqual(['AMBIGUOUS_ROWS']);
    expect(reasons({
      ...complete,
      additiveCodeNumber: '1410',
      finalConcentration: { value: '1', unit: 'mg/kg' },
    })).toEqual(['ROW_AGGREGATED_LIMIT']);
    expect(reasons({
      ...complete,
      additiveCodeNumber: '414',
      finalConcentration: { value: '1', unit: 'mg/kg' },
    })).toEqual(['ROW_NOT_REVIEWED', 'ROW_SOURCE_UNVERIFIED']);
    expect(reasons({ ...complete, sourceStatus: 'carriedOver' })).toEqual(['SOURCE_STATUS_NOT_ADDED']);
    expect(reasons({ ...complete, sourceStatus: 'processingAid' })).toEqual(['SOURCE_STATUS_NOT_ADDED']);
  });

  it('cannot produce FAIL or PASS below Provision confidence or from unreviewed data', () => {
    const overLimit = { ...complete, finalConcentration: { value: '500', unit: 'mg/kg' as const, calculatedAs: 'sorbic acid' } };
    expect(reasons({ ...overLimit, rule: { ...rule, mappingConfidence: 'Standard' } }))
      .toEqual(['RULE_BELOW_PROVISION_CONFIDENCE']);
    expect(reasons({ ...overLimit, catalog: { ...catalog, status: 'draft' } })).toEqual(['CATALOG_NOT_REVIEWED']);
    expect(reasons({
      ...overLimit,
      catalog: { ...catalog, categories: [{ ...catalog.categories[0]!, reviewStatus: 'draft' }] },
    })).toEqual(['CATALOG_NOT_REVIEWED']);
  });
});
