import { describe, expect, it } from 'vitest';
import type {
  AdditivePermissionCatalogView,
  AdditivePermissionEvaluationInput,
  InfantSweetenedWordInput,
  RuleTraceMetadata,
} from '@aus-food/domain';
import { evaluateAdditivePermission } from './additive-permission.js';
import { evaluateInfantSweetenedWord } from './infant-sweetened-word.js';
import {
  ILLUSTRATIVE_STATEMENT,
  illustrate,
  illustrateAdditivePermission,
  illustrateInfantSweetenedWord,
} from './illustrative-preview.js';

const rule: RuleTraceMetadata = {
  id: 'preview.test',
  name: 'Preview test',
  instrument: 'Australia New Zealand Food Standards Code',
  provision: 'Standard test',
  sourceUrl: 'https://www.legislation.gov.au/',
  jurisdiction: 'Australia and New Zealand',
  effectiveFrom: '2026-04-30',
  version: 'test',
  mappingConfidence: 'Standard',
};

const draftCatalog: AdditivePermissionCatalogView = {
  version: 'test',
  checkedOn: '2026-11-10',
  status: 'draft',
  categories: [{ id: 'cat-a', code: 'X', name: 'Test category', reviewStatus: 'draft' }],
  typeGrants: [],
  purposes: [{ name: 'Preservative', subClasses: [] }],
  calculationBases: [],
  rows: [
    {
      id: 'row-max', categoryId: 'cat-a', additiveIdentifiers: ['200'], calculationBasisIds: [],
      description: 'Sorbic acid', limit: { type: 'maximum', printedValue: '100', unit: 'mg/kg-default', reviewStatus: 'draft' },
      conditions: [], sourceValidation: 'transcribed', sourceIds: ['S'], reviewStatus: 'draft',
    },
    {
      id: 'row-unverified', categoryId: 'cat-a', additiveIdentifiers: ['414'], calculationBasisIds: [],
      description: 'Gum', limit: { type: 'maximum', printedValue: '10', unit: 'mg/kg-default', reviewStatus: 'draft' },
      conditions: [], sourceValidation: 'table-presentation-unverified', sourceIds: ['S'], reviewStatus: 'draft',
    },
  ],
};

const permissionInput = (overrides: Partial<AdditivePermissionEvaluationInput> = {}): AdditivePermissionEvaluationInput => ({
  catalog: draftCatalog,
  rule,
  confirmedCategoryId: 'cat-a',
  additiveCodeNumber: '200',
  technologicalPurpose: 'Preservative',
  foodState: 'asSold',
  sourceStatus: 'added',
  finalConcentration: { value: '100', unit: 'mg/kg' },
  evidence: { reference: 'lab-1', sourceDate: '2026-11-10' },
  ...overrides,
});

const sweetenedInput = (overrides: Partial<InfantSweetenedWordInput> = {}): InfantSweetenedWordInput => ({
  rule: { ...rule, mappingConfidence: 'Provision' },
  ruleApproved: false,
  confirmedCohorts: ['food_for_infants'],
  addedSugarsPer100g: '5',
  sugarsBasisConfirmed: true,
  evidence: { reference: 'calc', sourceDate: '2026-11-10' },
  proposedName: 'Apple custard',
  ...overrides,
});

describe('illustrative preview (ADR-006)', () => {
  it('shows what a draft permission rule would conclude and names the lifted gates', () => {
    const input = permissionInput();
    const official = evaluateAdditivePermission(input);
    expect(official.status).toBe('REVIEW REQUIRED');
    const preview = illustrateAdditivePermission(official, input);
    expect(preview.eligible).toBe(true);
    expect(preview.illustrativeStatus).toBe('PASS');
    expect(preview.liftedGates).toEqual(
      expect.arrayContaining(['RULE_BELOW_PROVISION_CONFIDENCE', 'CATALOG_NOT_REVIEWED', 'ROW_NOT_REVIEWED']),
    );
    expect(preview.statement).toBe(ILLUSTRATIVE_STATEMENT);
    const over = permissionInput({ finalConcentration: { value: '100.1', unit: 'mg/kg' } });
    expect(illustrateAdditivePermission(evaluateAdditivePermission(over), over).illustrativeStatus).toBe('FAIL');
  });

  it('never leaves the official result changed, and does not re-run when facts are missing', () => {
    const input = permissionInput();
    const official = evaluateAdditivePermission(input);
    const before = JSON.parse(JSON.stringify(official));
    const catalogBefore = JSON.parse(JSON.stringify(input.catalog));
    illustrateAdditivePermission(official, input);
    expect(official).toEqual(before);
    expect(input.catalog).toEqual(catalogBefore);
    expect(evaluateAdditivePermission(input)).toEqual(before);

    let reruns = 0;
    const missing = evaluateAdditivePermission(permissionInput({ finalConcentration: undefined }));
    const preview = illustrate(missing, () => {
      reruns += 1;
      return missing;
    });
    expect(reruns).toBe(0);
    expect(preview.eligible).toBe(false);
    expect(preview.blockedBy).toContain('CONCENTRATION_MISSING');
  });

  it('never lifts missing facts or unsupported rows', () => {
    const cases: Partial<AdditivePermissionEvaluationInput>[] = [
      { confirmedCategoryId: undefined },
      { evidence: undefined },
      { finalConcentration: { value: '1', unit: 'mg/L' } },
      { foodState: undefined },
      { sourceStatus: 'carriedOver' },
      { additiveCodeNumber: '414' },
      { additiveCodeNumber: '999' },
    ];
    for (const overrides of cases) {
      const input = permissionInput(overrides);
      const preview = illustrateAdditivePermission(evaluateAdditivePermission(input), input);
      expect(preview.eligible).toBe(false);
      expect(preview.illustrativeStatus).toBeUndefined();
    }
  });

  it('illustrates the infant sweetened check only when the rule gate alone blocks it', () => {
    const missingWord = sweetenedInput();
    const official = evaluateInfantSweetenedWord(missingWord);
    expect(official.status).toBe('REVIEW REQUIRED');
    const preview = illustrateInfantSweetenedWord(official, missingWord);
    expect(preview.illustrativeStatus).toBe('FAIL');
    expect(preview.liftedGates).toEqual(['RULE_NOT_APPROVED']);

    const withWord = sweetenedInput({ proposedName: 'Sweetened apple custard' });
    expect(illustrateInfantSweetenedWord(evaluateInfantSweetenedWord(withWord), withWord).illustrativeStatus).toBe('PASS');

    for (const overrides of [{ confirmedCohorts: [] }, { evidence: undefined }, { addedSugarsPer100g: undefined }, { sugarsBasisConfirmed: false }]) {
      const input = sweetenedInput(overrides);
      const result = illustrateInfantSweetenedWord(evaluateInfantSweetenedWord(input), input);
      expect(result.eligible).toBe(false);
    }
  });

  it('has nothing to illustrate when the official result is already determined', () => {
    const approved = sweetenedInput({ ruleApproved: true });
    const official = evaluateInfantSweetenedWord(approved);
    expect(official.status).toBe('FAIL');
    const preview = illustrateInfantSweetenedWord(official, approved);
    expect(preview.eligible).toBe(false);
    expect(preview.officialStatus).toBe('FAIL');
  });

  it('is not an engine result and carries no status field', () => {
    const input = sweetenedInput();
    const preview = illustrateInfantSweetenedWord(evaluateInfantSweetenedWord(input), input);
    expect('status' in preview).toBe(false);
  });
});
