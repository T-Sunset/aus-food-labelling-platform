import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  renderExplanationTemplate,
  validateRuleRelease,
} from './index.js';

const release = JSON.parse(
  readFileSync(new URL('../data/release-0.1.0-draft.json', import.meta.url), 'utf8'),
) as unknown;

function cloneRelease(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(release)) as Record<string, unknown>;
}

function markDeclarationCatalogReviewed(candidate: Record<string, unknown>): void {
  const catalog = candidate.additiveDeclarationCatalog as {
    status: string;
    formats: { reviewStatus: string }[];
    schedule7ClassNames: { reviewStatus: string }[];
    schedule8Substances: { reviewStatus: string }[];
    listingDifferences: { reviewStatus: string }[];
    mappings: { reviewStatus: string }[];
  };
  catalog.status = 'reviewed';
  for (const entries of [
    catalog.formats,
    catalog.schedule7ClassNames,
    catalog.schedule8Substances,
    catalog.listingDifferences,
    catalog.mappings,
  ]) {
    for (const entry of entries) {
      entry.reviewStatus = 'reviewed';
    }
  }
}

function markNameCatalogReviewed(candidate: Record<string, unknown>): void {
  const catalog = candidate.prescribedNameCandidateCatalog as {
    status: string;
    rules: { reviewStatus: string }[];
  };
  catalog.status = 'reviewed';
  for (const rule of catalog.rules) {
    rule.reviewStatus = 'reviewed';
  }
}

function markPermissionCatalogReviewed(candidate: Record<string, unknown>): void {
  const catalog = candidate.additivePermissionCatalog as {
    status: string;
    categories: { reviewStatus: string }[];
    typeGrants: { reviewStatus: string }[];
    rows: {
      reviewStatus: string;
      sourceValidation: string;
      limit: { reviewStatus: string };
    }[];
    calculationBases: { reviewStatus: string }[];
    purposes: { reviewStatus: string }[];
    governingProvisions: { reviewStatus: string }[];
  };
  catalog.status = 'reviewed';
  for (const entries of [
    catalog.categories,
    catalog.typeGrants,
    catalog.rows,
    catalog.calculationBases,
    catalog.purposes,
    catalog.governingProvisions,
  ]) {
    for (const entry of entries) {
      entry.reviewStatus = 'reviewed';
    }
  }
  for (const row of catalog.rows) {
    row.sourceValidation = 'transcribed';
    row.limit.reviewStatus = 'reviewed';
  }
}

function expectInvalid(candidate: unknown, message: string): void {
  expect(() => validateRuleRelease(candidate)).toThrowError(
    expect.objectContaining({
      name: 'RuleValidationError',
      message: expect.stringContaining(message),
    }),
  );
}

describe('rule release validation', () => {
  it('accepts the draft release and keeps every rule review-only', () => {
    expect(() => validateRuleRelease(release)).not.toThrow();

    if (
      typeof release !== 'object'
      || release === null
      || !('rules' in release)
      || !Array.isArray(release.rules)
    ) {
      throw new Error('Rule release fixture is malformed');
    }

    for (const rule of release.rules) {
      expect(rule).toMatchObject({
        deterministic: false,
        humanReviewRequired: true,
        mappingConfidence: 'Unmapped',
        reviewStatus: 'draft',
      });
    }
    if (
      !('allergenVocabulary' in release)
      || typeof release.allergenVocabulary !== 'object'
      || release.allergenVocabulary === null
      || !('status' in release.allergenVocabulary)
    ) {
      throw new Error('Allergen vocabulary fixture is malformed');
    }
    expect(release.allergenVocabulary.status).toBe('draft');
  });

  it('keeps additive declaration formats versioned, source-linked, and separate from permission data', () => {
    expect(() => validateRuleRelease(release)).not.toThrow();
    const candidate = cloneRelease();
    const catalog = candidate.additiveDeclarationCatalog as {
      status: string;
      sourceIds: string[];
      formats: { id: string; provision: string; reviewStatus: string; sourceIds: string[] }[];
      schedule7ClassNames: { name: string; kind: string; sourcePosition: number }[];
      schedule8Substances: {
        name: string;
        listing: string;
        codeNumber?: string;
        codeNumberStatus: string;
        reviewStatus: string;
      }[];
      listingDifferences: {
        codeNumber: string;
        alphabeticalName: string;
        numericalName: string;
      }[];
      extractionNotes: string[];
      mappings: unknown[];
    };

    expect(catalog.status).toBe('draft');
    expect(catalog.formats.map(({ id }) => id)).toEqual([
      'additive.class-and-schedule8-identifier',
      'additive.no-class-schedule8-name',
      'additive.enzyme',
      'additive.flavouring',
      'additive.specified-flavouring-substances',
      'additive.added-caffeine',
    ]);
    expect(catalog.formats.every((format) => format.reviewStatus === 'draft')).toBe(true);
    expect(catalog.schedule7ClassNames).toHaveLength(25);
    expect(catalog.schedule7ClassNames.filter(({ kind }) => kind === 'prescribed')).toHaveLength(19);
    expect(catalog.schedule7ClassNames.filter(({ kind }) => kind === 'optional')).toHaveLength(6);
    expect(catalog.schedule7ClassNames).toContainEqual(expect.objectContaining({
      name: 'enzyme',
      kind: 'optional',
    }));
    expect(catalog.schedule8Substances.filter(({ listing }) => listing === 'alphabetical')).toHaveLength(344);
    expect(catalog.schedule8Substances.filter(({ listing }) => listing === 'numerical')).toHaveLength(344);
    expect(catalog.schedule8Substances.every(({ reviewStatus }) => reviewStatus === 'draft')).toBe(true);
    expect(catalog.schedule8Substances).toContainEqual(expect.objectContaining({
      name: 'Mushroom chitosan',
      codeNumberStatus: 'dash',
    }));
    expect(catalog.listingDifferences).toHaveLength(4);
    expect(catalog.listingDifferences).toContainEqual(expect.objectContaining({
      codeNumber: '307c',
      alphabeticalName: 'di-Alpha-tocopherol',
      numericalName: 'dl-Alpha-tocopherol',
    }));
    expect(catalog.extractionNotes).toContainEqual(expect.stringContaining('Amendment 244'));
    expect(catalog.mappings).toEqual([]);

    const missingSource = cloneRelease();
    const missingSourceCatalog = missingSource.additiveDeclarationCatalog as {
      formats: { sourceIds: string[] }[];
    };
    missingSourceCatalog.formats[0]!.sourceIds = ['SRC-MISSING'];
    expectInvalid(missingSource, 'references missing source "SRC-MISSING"');
  });

  it('rejects Schedule 8 dash entries without explicit source-dash status', () => {
    const candidate = cloneRelease();
    const catalog = candidate.additiveDeclarationCatalog as {
      schedule8Substances: {
        name: string;
        codeNumber?: string;
        codeNumberStatus: string;
      }[];
    };
    const mushroom = catalog.schedule8Substances.find(({ name }) => name === 'Mushroom chitosan');
    expect(mushroom).toBeDefined();
    mushroom!.codeNumberStatus = 'listed';
    mushroom!.codeNumber = '\u2013';
    expectInvalid(candidate, 'must preserve either a listed code number or an explicit source dash');
  });

  it('rejects additive declaration mappings that reference absent Schedule 7 or 8 entries', () => {
    const candidate = cloneRelease();
    const catalog = candidate.additiveDeclarationCatalog as {
      mappings: {
        id: string;
        schedule7ClassNameId: string;
        schedule8SubstanceId: string;
        sourceIds: string[];
        reviewStatus: string;
      }[];
    };
    catalog.mappings.push({
      id: 'unmapped-class-substance',
      schedule7ClassNameId: 'missing-class',
      schedule8SubstanceId: 'missing-substance',
      sourceIds: ['SRC-ADD-001'],
      reviewStatus: 'draft',
    });

    expectInvalid(candidate, 'references a missing Schedule 7 class name');
    expectInvalid(candidate, 'references a missing Schedule 8 substance');
  });

  it('keeps cohort permission data source-linked, scoped, and review-only', () => {
    const catalog = (release as {
      additivePermissionCatalog: {
        status: string;
        checkedOn: string;
        sourceIds: string[];
        categories: {
          code: string;
          classificationStatus: string;
          headingPath: { code: string }[];
          inheritedPermissionRowIds: string[];
        }[];
        typeGrants: { schedule16Provision: string }[];
        rows: {
          categoryId: string;
          limit: { printedValue?: string };
          aggregationGroup?: string;
          sourceValidation: string;
          reviewStatus: string;
        }[];
        calculationBases: { id: string; factors: unknown[] }[];
        purposes: unknown[];
        reviewNotes: string[];
      };
    }).additivePermissionCatalog;

    expect(() => validateRuleRelease(release)).not.toThrow();
    expect(catalog.status).toBe('draft');
    expect(catalog.checkedOn).toBe('2026-11-09');
    expect(catalog.categories.map(({ code }) => code)).toEqual([
      '14.1.3',
      '14.1.3.0.1',
      '14.1.3.0.2',
      '14.1.3.3',
      '13.2',
    ]);
    expect(catalog.categories[0]).toMatchObject({
      classificationStatus: 'code-linked',
      headingPath: [{ code: '14' }, { code: '14.1' }, { code: '14.1.3' }],
      inheritedPermissionRowIds: [],
    });
    expect(catalog.categories.at(-1)).toMatchObject({
      classificationStatus: 'candidate-review',
      headingPath: [{ code: '13' }, { code: '13.2' }],
    });
    expect(catalog.typeGrants.map(({ schedule16Provision }) => schedule16Provision)).toEqual([
      'S16—2',
      'S16—3',
      'S16—4',
    ]);
    expect(catalog.rows).toHaveLength(59);
    expect(catalog.rows.every(({ reviewStatus }) => reviewStatus === 'draft')).toBe(true);
    expect(catalog.rows).toContainEqual(expect.objectContaining({
      categoryId: 'category-13-2',
      sourceValidation: 'table-presentation-unverified',
      limit: expect.objectContaining({ printedValue: '10' }),
    }));
    expect(catalog.rows.filter(({ aggregationGroup }) =>
      aggregationGroup === 'infant-food-modified-starches-in-total')).toHaveLength(5);
    expect(catalog.calculationBases.find(({ id }) =>
      id === 'calc-steviol-equivalents')?.factors).toHaveLength(11);
    expect(catalog.purposes).toHaveLength(21);
    expect(catalog.reviewNotes.some((note) => note.includes('No individual S15 row'))).toBe(true);
    expect(catalog.sourceIds).toEqual([
      'SRC-020',
      'SRC-ADD-003',
      'SRC-ADD-004',
      'SRC-ADD-005',
      'SRC-ADD-006',
    ]);
  });

  it('rejects stale sources, ambiguous food classes, missing row categories, and unsupported conditions', () => {
    const staleSource = cloneRelease();
    const staleSourceRecord = (staleSource.sources as {
      id: string;
      checkedOn: string;
    }[]).find(({ id }) => id === 'SRC-ADD-003');
    staleSourceRecord!.checkedOn = '2026-11-08';
    expectInvalid(staleSource, 'was not rechecked on the catalog date');

    const ambiguousCategory = cloneRelease();
    const permissionCatalog = ambiguousCategory.additivePermissionCatalog as {
      categories: {
        id: string;
        code: string;
        name: string;
        cohort: string;
        classificationStatus: string;
        headingPath: { code: string; title: string }[];
        inheritedPermissionRowIds: string[];
        sourceIds: string[];
        reviewStatus: string;
      }[];
    };
    permissionCatalog.categories.push({
      ...permissionCatalog.categories[0]!,
      id: 'duplicate-food-class',
    });
    expectInvalid(ambiguousCategory, 'duplicates candidate category "14.1.3"');

    const missingCategory = cloneRelease();
    const rows = (missingCategory.additivePermissionCatalog as {
      rows: { categoryId: string }[];
    }).rows;
    rows[0]!.categoryId = 'category-missing';
    expectInvalid(missingCategory, 'references a missing candidate category');

    const unsupportedCondition = cloneRelease();
    const conditionRows = (unsupportedCondition.additivePermissionCatalog as {
      rows: { conditions: { type: string; text: string }[] }[];
    }).rows;
    conditionRows[0]!.conditions.push({ type: 'evaluateExpression', text: 'true' });
    expectInvalid(unsupportedCondition, 'uses an unsupported condition type');

    const invalidLimit = cloneRelease();
    const limitRows = (invalidLimit.additivePermissionCatalog as {
      rows: { limit: { unit: string } }[];
    }).rows;
    limitRows[0]!.limit.unit = 'g/L';
    expectInvalid(invalidLimit, 'has an unsupported unit');
  });

  it('rejects duplicate rule IDs, missing source references, and a mismatched URL', () => {
    const duplicate = cloneRelease();
    const duplicateRules = duplicate.rules as { id: string }[];
    duplicateRules.push({ ...duplicateRules[0]! });
    expectInvalid(duplicate, 'duplicates rule');

    const duplicateSource = cloneRelease();
    const sources = duplicateSource.sources as { id: string }[];
    sources.push({ ...sources[0]! });
    expectInvalid(duplicateSource, 'duplicates source');

    const missingSource = cloneRelease();
    const sourceRule = (missingSource.rules as { sourceIds: string[] }[])[0]!;
    sourceRule.sourceIds = ['SRC-MISSING'];
    expectInvalid(missingSource, 'references missing source');

    const mismatchedUrl = cloneRelease();
    const urlRule = (mismatchedUrl.rules as { sourceUrl: string }[])[0]!;
    urlRule.sourceUrl = 'https://example.invalid/unrelated';
    expectInvalid(mismatchedUrl, 'must match a source URL');
  });

  it('rejects incomplete TRACE-014 fields, unsupported conditions, and orphan fixtures', () => {
    const missingMetadata = cloneRelease();
    const rule = (missingMetadata.rules as { provision: string }[])[0]!;
    rule.provision = '';
    expectInvalid(missingMetadata, 'provision: must be a non-empty string');

    const unsupportedCondition = cloneRelease();
    const conditionRule = (unsupportedCondition.rules as { condition: { type: string } }[])[0]!;
    conditionRule.condition.type = 'execute';
    expectInvalid(unsupportedCondition, 'uses an unsupported condition type');

    const orphanFixture = cloneRelease();
    const fixture = (orphanFixture.fixtures as { ruleId: string }[])[0]!;
    fixture.ruleId = 'rule-not-found';
    expectInvalid(orphanFixture, 'references missing rule');

    const mismatchedFixture = cloneRelease();
    const linkedFixture = (mismatchedFixture.fixtures as { ruleId: string }[])[0]!;
    linkedFixture.ruleId = 'product.identity.evidence';
    expectInvalid(mismatchedFixture, 'belongs to another rule');
  });

  it('rejects deterministic failures below Provision confidence without reviewer approval', () => {
    const candidate = cloneRelease();
    const rule = (candidate.rules as {
      deterministic: boolean;
      humanReviewRequired: boolean;
      mappingConfidence: string;
      reviewerApproval?: unknown;
    }[])[0]!;
    rule.deterministic = true;
    rule.humanReviewRequired = false;
    rule.mappingConfidence = 'Unmapped';
    expectInvalid(candidate, 'cannot be true below Provision mapping confidence');

    const approvedCandidate = cloneRelease();
    const approvedRule = (approvedCandidate.rules as {
      deterministic: boolean;
      humanReviewRequired: boolean;
      mappingConfidence: string;
      reviewerApproval?: unknown;
    }[])[0]!;
    approvedRule.deterministic = true;
    approvedRule.humanReviewRequired = false;
    approvedRule.mappingConfidence = 'Unmapped';
    approvedRule.reviewerApproval = {
      reviewerId: 'reviewer-1',
      approvedAt: '2026-11-09',
      rationale: 'Explicitly approved mapping.',
    };
    expect(() => validateRuleRelease(approvedCandidate)).not.toThrow();
  });

  it('rejects active releases with unverified sources or draft records', () => {
    const candidate = cloneRelease();
    candidate.status = 'active';
    expectInvalid(candidate, 'must be primary-source-verified before release activation');

    const fullyReviewed = cloneRelease();
    fullyReviewed.status = 'active';
    for (const source of fullyReviewed.sources as { verificationStatus: string }[]) {
      source.verificationStatus = 'primary-source-verified';
    }
    for (const rule of fullyReviewed.rules as { reviewStatus: string }[]) {
      rule.reviewStatus = 'reviewed';
    }
    (fullyReviewed.allergenVocabulary as { status: string }).status = 'reviewed';
    for (const entry of (fullyReviewed.allergenVocabulary as {
      entries: { reviewStatus: string }[];
    }).entries) {
      entry.reviewStatus = 'reviewed';
    }
    markDeclarationCatalogReviewed(fullyReviewed);
    markPermissionCatalogReviewed(fullyReviewed);
    markNameCatalogReviewed(fullyReviewed);
    expect(() => validateRuleRelease(fullyReviewed)).not.toThrow();

    const unreviewedVocabularyEntry = cloneRelease();
    unreviewedVocabularyEntry.status = 'active';
    for (const source of unreviewedVocabularyEntry.sources as { verificationStatus: string }[]) {
      source.verificationStatus = 'primary-source-verified';
    }
    for (const rule of unreviewedVocabularyEntry.rules as { reviewStatus: string }[]) {
      rule.reviewStatus = 'reviewed';
    }
    (unreviewedVocabularyEntry.allergenVocabulary as { status: string }).status = 'reviewed';
    markDeclarationCatalogReviewed(unreviewedVocabularyEntry);
    expectInvalid(unreviewedVocabularyEntry, 'must be reviewed before release activation');
  });

  it('validates the prescribed-name candidate catalog', () => {
    const unknownSource = cloneRelease();
    (unknownSource.prescribedNameCandidateCatalog as {
      rules: { sourceIds: string[] }[];
    }).rules[0]!.sourceIds = ['SRC-MISSING'];
    expectInvalid(unknownSource, 'references missing source "SRC-MISSING"');

    const weakName = cloneRelease();
    const weakRule = (weakName.prescribedNameCandidateCatalog as {
      rules: { kind: string; mappingConfidence: string }[];
    }).rules[0]!;
    weakRule.mappingConfidence = 'Guidance-only';
    expectInvalid(weakName, 'is too weak for a name rule');

    const badCohort = cloneRelease();
    (badCohort.prescribedNameCandidateCatalog as {
      rules: { cohort: string }[];
    }).rules[0]!.cohort = 'other';
    expectInvalid(badCohort, 'must be a supported MVP cohort');

    const unreviewed = cloneRelease();
    unreviewed.status = 'active';
    expectInvalid(unreviewed, 'prescribedNameCandidateCatalog.status: must be reviewed before release activation');
  });

  it('blocks activation while a permission-catalog entry remains unreviewed', () => {
    const candidate = cloneRelease();
    candidate.status = 'active';
    for (const source of candidate.sources as { verificationStatus: string }[]) {
      source.verificationStatus = 'primary-source-verified';
    }
    for (const rule of candidate.rules as { reviewStatus: string }[]) {
      rule.reviewStatus = 'reviewed';
    }
    (candidate.allergenVocabulary as { status: string }).status = 'reviewed';
    for (const entry of (candidate.allergenVocabulary as {
      entries: { reviewStatus: string }[];
    }).entries) {
      entry.reviewStatus = 'reviewed';
    }
    markDeclarationCatalogReviewed(candidate);
    markPermissionCatalogReviewed(candidate);
    const catalog = candidate.additivePermissionCatalog as {
      rows: { reviewStatus: string }[];
    };
    catalog.rows[0]!.reviewStatus = 'draft';

    expectInvalid(
      candidate,
      'additivePermissionCatalog.rows[0].reviewStatus: must be reviewed before release activation',
    );
  });

  it('blocks activation when any additive catalog entry remains unreviewed', () => {
    const candidate = cloneRelease();
    candidate.status = 'active';
    for (const source of candidate.sources as { verificationStatus: string }[]) {
      source.verificationStatus = 'primary-source-verified';
    }
    for (const rule of candidate.rules as { reviewStatus: string }[]) {
      rule.reviewStatus = 'reviewed';
    }
    (candidate.allergenVocabulary as { status: string }).status = 'reviewed';
    for (const entry of (candidate.allergenVocabulary as {
      entries: { reviewStatus: string }[];
    }).entries) {
      entry.reviewStatus = 'reviewed';
    }
    markDeclarationCatalogReviewed(candidate);
    const catalog = candidate.additiveDeclarationCatalog as {
      schedule8Substances: { reviewStatus: string }[];
    };
    catalog.schedule8Substances[0]!.reviewStatus = 'draft';

    expectInvalid(
      candidate,
      'schedule8Substances[0].reviewStatus: must be reviewed before release activation',
    );
  });

  it('rejects a draft rule fixture that claims PASS, FAIL, or WARNING', () => {
    const candidate = cloneRelease();
    const fixture = (candidate.fixtures as { expectedStatus: string }[])[0]!;
    fixture.expectedStatus = 'PASS';
    expectInvalid(candidate, 'draft or non-deterministic rules cannot have PASS');
  });
});

describe('explanation templates', () => {
  it('renders only declared values as plain text without reinterpreting inserted tokens', () => {
    expect(renderExplanationTemplate(
      'Review {{product}} against {{provision}}.',
      ['product', 'provision'],
      { product: '{{not-a-template}}', provision: '1.2.3-4' },
    )).toBe('Review {{not-a-template}} against 1.2.3-4.');

    expect(() => renderExplanationTemplate('Review {{product.', ['product'], {
      product: 'sample',
    })).toThrowError('Malformed explanation template token');
  });

  it('rejects missing, undeclared, and malformed template variables', () => {
    expect(() => renderExplanationTemplate(
      'Review {{product}}.',
      ['product'],
      {},
    )).toThrow(TypeError);

    expectInvalid(
      {
        ...cloneRelease(),
        rules: (cloneRelease().rules as { explanationTemplate: string; templateVariables: string[] }[]).map(
          (rule) => ({
            ...rule,
            explanationTemplate: 'Review {{unlisted}}.',
            templateVariables: [],
          }),
        ),
      },
      'uses undeclared variable',
    );

    const malformedTemplate = cloneRelease();
    const malformedRule = (malformedTemplate.rules as { explanationTemplate: string }[])[0]!;
    malformedRule.explanationTemplate = 'Review {{product.';
    expectInvalid(malformedTemplate, 'contains a malformed template token');
  });
});
