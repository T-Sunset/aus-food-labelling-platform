import { existsSync, readFileSync } from 'node:fs';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { evaluateClaim } from '../packages/engine/src/claim-router.ts';
import { illustrateRoutedClaim } from '../packages/engine/src/illustrative-preview.ts';

// Phase 3 Turn C8 release gate: asserts the shipped draft claim data cannot produce a deterministic result.
const release = JSON.parse(
  readFileSync(new URL('../packages/rules/data/release-0.1.0-draft.json', import.meta.url), 'utf8'),
);
const catalog = release.claimRuleCatalog;
const sourceById = new Map(release.sources.map((source) => [source.id, source]));
const reviewerQuestions = readFileSync(new URL('../docs/reviewer-questions.md', import.meta.url), 'utf8');

const trace = (mappingConfidence) => ({
  id: 'gate',
  name: 'Gate',
  instrument: 'Australia New Zealand Food Standards Code',
  provision: 'Schedule 4 S4-3',
  sourceUrl: 'https://www.legislation.gov.au/',
  jurisdiction: 'Australia and New Zealand',
  effectiveFrom: '2026-04-30',
  version: catalog.version,
  mappingConfidence,
});

const clear = { infantFormulaProduct: false, kava: false, alcoholAbove1_15Percent: false };

// A fully supplied, threshold-meeting claim for a rule, as the strongest input the data can receive.
function fullInput(rule, overrides = {}) {
  const limit = rule.limits.perServing ?? rule.limits.liquid;
  return {
    rule: trace(rule.mappingConfidence),
    ruleApproved: rule.reviewStatus === 'reviewed',
    claimRule: rule,
    claim: {
      id: 'gate-claim',
      text: rule.permittedWording[0],
      classification: 'nutrition_content',
      classificationConfirmed: true,
      supportedClaimId: rule.id,
    },
    foodForm: 'liquid',
    formOfFoodConfirmed: true,
    servingConfirmed: true,
    nutrientAmount: { value: rule.comparison === 'atMost' ? '0' : limit.value, unit: limit.unit },
    evidence: { reference: 'fixture', sourceDate: '2026-11-10' },
    prohibitedContexts: clear,
    ...overrides,
  };
}

describe('Phase 3 gate: source and version checks', () => {
  it('keeps the claim catalog at the release version and in draft, with no rule enabled', () => {
    expect(release.status).toBe('draft');
    expect(catalog.version).toBe(release.version);
    expect(catalog.status).toBe('draft');
    for (const rule of catalog.rules) {
      expect(rule.reviewStatus).toBe('draft');
    }
    for (const rule of release.rules) {
      expect(rule.reviewStatus).toBe('draft');
    }
  });

  it('resolves every cited claim source to a dated, primary-source-verified entry', () => {
    const cited = new Set([...catalog.sourceIds, ...catalog.rules.flatMap((rule) => rule.sourceIds)]);
    expect(cited.size).toBeGreaterThan(0);
    for (const id of cited) {
      const source = sourceById.get(id);
      expect(source, `source ${id} is registered`).toBeDefined();
      expect(source.sourceUrl).toMatch(/^https:\/\//);
      expect(source.effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(source.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(source.verificationStatus).toBe('primary-source-verified');
    }
  });

  it('lists what is not yet verified for every rule and carries no mandatory statements or NIP rows', () => {
    for (const rule of catalog.rules) {
      expect(rule.notYetVerified.length).toBeGreaterThan(0);
      expect(rule.mandatoryStatements).toEqual([]);
      expect(rule.requiredNipRows).toEqual([]);
    }
  });
});

describe('Phase 3 gate: fixtures', () => {
  it('returns REVIEW REQUIRED for every shipped rule even with every input supplied and the threshold met', () => {
    for (const rule of catalog.rules) {
      const result = evaluateClaim(fullInput(rule));
      expect(result.status, rule.id).toBe('REVIEW REQUIRED');
      expect(result.value.reasons, rule.id).toContain('RULE_NOT_APPROVED');
      expect(result.nonCertificationStatement).toContain('does not certify');
    }
  });

  it('shows a determinable illustrative outcome only as a preview, never as the official status', () => {
    for (const rule of catalog.rules) {
      const input = fullInput(rule);
      const official = evaluateClaim(input);
      const preview = illustrateRoutedClaim(official, input);
      expect(official.status).toBe('REVIEW REQUIRED');
      expect(preview).not.toHaveProperty('status');
      expect(preview.eligible).toBe(true);
      expect(preview.statement).toContain('ILLUSTRATIVE ONLY');
    }
  });

  it('keeps comparative, health, unregulated, unclassified and unsupported claims review-only', () => {
    const rule = catalog.rules[0];
    for (const classification of ['comparative', 'health', 'not_code_regulated', undefined]) {
      const result = evaluateClaim(
        fullInput(rule, {
          claim: { id: 'c', text: 'Any wording', classification, classificationConfirmed: classification !== undefined },
        }),
      );
      expect(result.status).toBe('REVIEW REQUIRED');
    }
    expect(evaluateClaim(fullInput(rule, { claimRule: undefined })).status).toBe('REVIEW REQUIRED');
  });

  it('keeps restricted and unanswered prohibited contexts review-only', () => {
    const rule = catalog.rules[0];
    for (const key of ['infantFormulaProduct', 'kava', 'alcoholAbove1_15Percent']) {
      for (const answer of [true, undefined]) {
        const result = evaluateClaim(fullInput(rule, { prohibitedContexts: { ...clear, [key]: answer } }));
        expect(result.status).toBe('REVIEW REQUIRED');
      }
    }
  });
});

describe('Phase 3 gate: property tests on draft data', () => {
  const amount = fc.option(
    fc.oneof(
      fc.double({ min: 0, max: 1e4, noNaN: true }).map((value) => value.toFixed(3)),
      fc.constantFrom('0', '-1', 'abc', ''),
    ),
    { nil: undefined },
  );
  const tri = fc.constantFrom(true, false, undefined);

  it('never returns PASS or FAIL from the draft claim catalog, whatever the inputs', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...catalog.rules),
        fc.constantFrom('Provision', 'Standard', 'Unmapped'),
        fc.constantFrom('nutrition_content', 'comparative', 'health', 'not_code_regulated', undefined),
        fc.boolean(),
        fc.constantFrom('liquid', 'solid', undefined),
        amount,
        fc.constantFrom('g', 'mg', 'kJ', 'mL'),
        tri,
        tri,
        tri,
        tri,
        tri,
        (rule, confidence, classification, confirmed, foodForm, value, unit, formOk, servingOk, infant, kava, alcohol) => {
          const result = evaluateClaim({
            rule: trace(confidence),
            ruleApproved: false,
            claimRule: rule,
            claim: {
              id: 'c',
              text: rule.permittedWording[0],
              classification,
              classificationConfirmed: confirmed,
              supportedClaimId: rule.id,
            },
            foodForm,
            formOfFoodConfirmed: formOk,
            servingConfirmed: servingOk,
            nutrientAmount: value === undefined ? undefined : { value, unit },
            evidence: { reference: 'property', sourceDate: '2026-11-10' },
            prohibitedContexts: { infantFormulaProduct: infant, kava, alcoholAbove1_15Percent: alcohol },
          });
          return result.status === 'REVIEW REQUIRED';
        },
      ),
      { numRuns: 400 },
    );
  });
});

describe('Phase 3 gate: reviewer records', () => {
  it('lists the claims reviewer questions R5-C1-01 to R5-C1-06', () => {
    for (const id of ['R5-C1-01', 'R5-C1-02', 'R5-C1-03', 'R5-C1-04', 'R5-C1-05', 'R5-C1-06']) {
      expect(reviewerQuestions).toContain(id);
    }
  });

  it('ships a claims gate record that states the position and leaves sign-off blank', () => {
    const path = new URL('../docs/phase3-claims-gate-record.md', import.meta.url);
    expect(existsSync(path)).toBe(true);
    const record = readFileSync(path, 'utf8');
    expect(record).toContain('no deterministic claim result');
    expect(record).toContain('Unsupported claims');
    expect(record).toContain('does not certify legal compliance');
  });
});
