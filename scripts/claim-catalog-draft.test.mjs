import { readFileSync } from 'node:fs';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { evaluateNutritionContentClaim } from '../packages/engine/src/claim-evaluator.ts';

const release = JSON.parse(
  readFileSync(new URL('../packages/rules/data/release-0.1.0-draft.json', import.meta.url), 'utf8'),
);
const catalog = release.claimRuleCatalog;
const sourceById = new Map(release.sources.map((source) => [source.id, source]));

describe('shipped draft claim rule catalog (C4)', () => {
  it('is not active: the release and every claim rule stay draft', () => {
    expect(release.status).toBe('draft');
    expect(catalog.status).toBe('draft');
    expect(catalog.version).toBe(release.version);
    for (const rule of catalog.rules) {
      expect(rule.reviewStatus).toBe('draft');
    }
  });

  it('gives every rule a dated, primary-source-verified source and Provision confidence', () => {
    for (const rule of catalog.rules) {
      expect(rule.mappingConfidence).toBe('Provision');
      expect(rule.sourceIds.length).toBeGreaterThan(0);
      for (const id of rule.sourceIds) {
        const source = sourceById.get(id);
        expect(source?.verificationStatus).toBe('primary-source-verified');
        expect(source?.checkedOn).toBe(catalog.checkedOn);
      }
    }
  });

  it('excludes claim families that stay review-only', () => {
    const nutrients = new Set(catalog.rules.map((rule) => rule.nutrient));
    expect([...nutrients].sort()).toEqual(['dietaryFibre', 'energy', 'fat', 'sodium', 'sugars']);
    for (const rule of catalog.rules) {
      expect(rule.mandatoryStatements).toEqual([]);
      expect(rule.notYetVerified.length).toBeGreaterThan(0);
    }
  });

  it('only ever gives REVIEW REQUIRED through the evaluator while the rules are draft', () => {
    const trace = {
      id: 'claim.draft',
      name: 'Draft claim rule',
      instrument: 'Australia New Zealand Food Standards Code',
      provision: 'Schedule 4 S4-3',
      sourceUrl: 'https://www.legislation.gov.au/',
      jurisdiction: 'Australia and New Zealand',
      effectiveFrom: '2026-04-30',
      version: catalog.version,
      mappingConfidence: 'Provision',
    };
    fc.assert(
      fc.property(
        fc.constantFrom(...catalog.rules),
        fc.integer({ min: 0, max: 100000 }),
        fc.constantFrom('liquid', 'solid'),
        (claimRule, hundredths, foodForm) => {
          const unit = claimRule.limits.perServing?.unit ?? claimRule.limits.liquid.unit;
          const result = evaluateNutritionContentClaim({
            rule: trace,
            ruleApproved: claimRule.reviewStatus === 'reviewed',
            claimRule,
            claim: {
              id: 'c',
              text: claimRule.permittedWording[0],
              classification: 'nutrition_content',
              classificationConfirmed: true,
              supportedClaimId: claimRule.id,
            },
            foodForm,
            formOfFoodConfirmed: true,
            servingConfirmed: true,
            nutrientAmount: { value: (hundredths / 100).toString(), unit },
            evidence: { reference: 'x', sourceDate: '2026-11-10' },
            exclusionsConfirmedNotApplicable: true,
          });
          expect(result.status).toBe('REVIEW REQUIRED');
          expect(result.value.reasons).toContain('RULE_NOT_APPROVED');
        },
      ),
    );
  });
});
