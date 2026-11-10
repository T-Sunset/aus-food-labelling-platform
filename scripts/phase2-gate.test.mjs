import { readFileSync } from 'node:fs';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { evaluateAdditivePermission } from '../packages/engine/src/additive-permission.ts';
import { evaluateInfantSweetenedWord } from '../packages/engine/src/infant-sweetened-word.ts';
import { identifyPrescribedNameCandidates } from '../packages/engine/src/prescribed-name-candidates.ts';

// Phase 2 Turn 13 release gate: asserts the shipped draft data cannot produce a deterministic result.
const release = JSON.parse(
  readFileSync(new URL('../packages/rules/data/release-0.1.0-draft.json', import.meta.url), 'utf8'),
);
const permission = release.additivePermissionCatalog;
const names = release.prescribedNameCandidateCatalog;
const declarations = release.additiveDeclarationCatalog;
const sourceById = new Map(release.sources.map((source) => [source.id, source]));

const trace = (mappingConfidence) => ({
  id: 'gate',
  name: 'Gate',
  instrument: 'Australia New Zealand Food Standards Code',
  provision: 'Standard 1.3.1',
  sourceUrl: 'https://www.legislation.gov.au/',
  jurisdiction: 'Australia and New Zealand',
  effectiveFrom: '2026-04-30',
  version: permission.version,
  mappingConfidence,
});

describe('Phase 2 gate: source and version checks', () => {
  it('keeps every Phase 2 catalog at the release version and in draft', () => {
    for (const catalog of [permission, names, declarations]) {
      expect(catalog.version).toBe(release.version);
      expect(catalog.status).toBe('draft');
    }
    for (const rule of release.rules) {
      expect(rule.reviewStatus).toBe('draft');
    }
  });

  it('resolves every cited source to a dated, primary-source-verified entry', () => {
    const cited = new Set([
      ...permission.sourceIds,
      ...names.sourceIds,
      ...declarations.sourceIds,
      ...permission.rows.flatMap((row) => row.sourceIds),
      ...permission.categories.flatMap((category) => category.sourceIds),
      ...names.rules.flatMap((rule) => rule.sourceIds),
    ]);
    for (const id of cited) {
      const source = sourceById.get(id);
      expect(source, `source ${id} is registered`).toBeDefined();
      expect(source.sourceUrl).toMatch(/^https:\/\//);
      expect(source.effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(source.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (/^SRC-(ADD|NAME)-/.test(id)) {
        expect(source.verificationStatus).toBe('primary-source-verified');
      }
    }
  });

  it('keeps every permission row and name rule unreviewed', () => {
    for (const row of permission.rows) {
      expect(row.reviewStatus).toBe('draft');
      expect(row.limit.reviewStatus).toBe('draft');
    }
    for (const rule of names.rules) {
      expect(rule.reviewStatus).toBe('draft');
    }
  });
});

describe('Phase 2 gate: selected-cohort fixtures', () => {
  it('evaluates every shipped permission row for every identifier as REVIEW REQUIRED', () => {
    let evaluated = 0;
    for (const row of permission.rows) {
      const identifiers = row.additiveIdentifiers.length > 0 ? row.additiveIdentifiers : [undefined];
      for (const additiveCodeNumber of identifiers) {
        const result = evaluateAdditivePermission({
          catalog: permission,
          rule: trace('Provision'),
          confirmedCategoryId: row.categoryId,
          additiveCodeNumber,
          technologicalPurpose: 'Preservative',
          foodState: 'asSold',
          sourceStatus: 'added',
          gmpConfirmed: true,
          finalConcentration: { value: '1', unit: 'mg/kg' },
          evidence: { reference: 'fixture', sourceDate: '2026-11-10' },
        });
        expect(result.status).toBe('REVIEW REQUIRED');
        evaluated += 1;
      }
    }
    expect(evaluated).toBeGreaterThanOrEqual(permission.rows.length);
  });

  it('keeps unsupported cohorts and unconfirmed cohorts review-only', () => {
    for (const confirmedCohorts of [[], ['other'], ['bread']]) {
      const result = identifyPrescribedNameCandidates({
        rule: trace('Standard'),
        catalogRules: names.rules,
        confirmedCohorts,
        proposedName: 'Infant cereal',
      });
      expect(result.status).toBe('REVIEW REQUIRED');
      expect(result.value.outcome).toBe('review');
    }
  });
});

describe('Phase 2 gate: property tests on draft data', () => {
  const category = fc.constantFrom(...permission.categories.map((item) => item.id), 'unknown-category');
  const code = fc.option(fc.constantFrom('200', '202', '211', '220', '150d', '102', '999', ''), { nil: undefined });
  const amount = fc.option(
    fc.oneof(
      fc.double({ min: 0, max: 1e6, noNaN: true }).map((value) => value.toFixed(3)),
      fc.constantFrom('0', '-1', 'abc', ''),
    ),
    { nil: undefined },
  );

  it('never returns PASS or FAIL from the draft permission catalog, whatever the inputs', () => {
    fc.assert(
      fc.property(
        category,
        code,
        amount,
        fc.constantFrom('mg/kg', 'mg/L'),
        fc.boolean(),
        fc.constantFrom('Provision', 'Standard', 'Unmapped'),
        (confirmedCategoryId, additiveCodeNumber, value, unit, gmpConfirmed, confidence) => {
          const result = evaluateAdditivePermission({
            catalog: permission,
            rule: trace(confidence),
            confirmedCategoryId,
            additiveCodeNumber,
            technologicalPurpose: 'Preservative',
            foodState: 'asSold',
            sourceStatus: 'added',
            gmpConfirmed,
            finalConcentration: value === undefined ? undefined : { value, unit },
            evidence: { reference: 'property', sourceDate: '2026-11-10' },
          });
          return result.status === 'REVIEW REQUIRED' || result.status === 'INFORMATIONAL';
        },
      ),
      { numRuns: 300 },
    );
  });

  it('never returns PASS or FAIL for the infant sweetened check while the rule is draft', () => {
    fc.assert(
      fc.property(
        fc.option(fc.double({ min: 0, max: 100, noNaN: true }).map((value) => value.toFixed(2)), { nil: undefined }),
        fc.boolean(),
        fc.option(fc.constantFrom('Sweetened rice cereal', 'Rice cereal'), { nil: undefined }),
        (addedSugarsPer100g, sugarsBasisConfirmed, proposedName) => {
          const result = evaluateInfantSweetenedWord({
            rule: trace('Provision'),
            ruleApproved: false,
            confirmedCohorts: ['food_for_infants'],
            addedSugarsPer100g,
            sugarsBasisConfirmed,
            evidence: { reference: 'property', sourceDate: '2026-11-10' },
            proposedName,
          });
          return result.status === 'REVIEW REQUIRED';
        },
      ),
      { numRuns: 200 },
    );
  });
});
