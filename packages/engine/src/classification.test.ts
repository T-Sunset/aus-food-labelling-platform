import { describe, expect, it } from 'vitest';
import {
  createEmptyProductClassificationProfile,
  screenPrescribedNameCandidate,
  screenProductClassCandidates,
} from './classification.js';
import type {
  ProductClassificationEvidence,
  ProductClassificationFact,
  ProductClassificationProfile,
} from '@aus-food/domain';

function evidence(id: string): ProductClassificationEvidence {
  return {
    id,
    reference: `supplier file ${id}`,
    sourceDate: '2026-11-09',
    kind: 'supplierSpecification',
  };
}

function fact(
  answer: ProductClassificationFact['answer'],
  ...evidenceItems: ProductClassificationEvidence[]
): ProductClassificationFact {
  return { answer, evidence: evidenceItems };
}

function supportedCaffeinatedBeverage(): ProductClassificationProfile {
  const profile = createEmptyProductClassificationProfile();
  return {
    ...profile,
    formulatedCaffeinatedBeverage: {
      flavoured: fact('yes', evidence('flavour')),
      nonAlcoholic: fact('yes', evidence('alcohol')),
      containsCaffeine: fact('yes', evidence('caffeine')),
      representedForMentalPerformance: fact('yes', evidence('purpose')),
    },
  };
}

function supportedInfantFood(): ProductClassificationProfile {
  const profile = createEmptyProductClassificationProfile();
  return {
    ...profile,
    foodForInfants: {
      intendedAsNourishmentForInfants: fact('yes', evidence('intended-use')),
      infantFormulaProduct: fact('no', evidence('not-formula')),
      formulatedMealReplacement: fact('no', evidence('not-meal-replacement')),
      formulatedSupplementaryFood: fact('no', evidence('not-supplementary')),
      unprocessedFruitOrVegetables: fact('no', evidence('processed-food')),
    },
  };
}

describe('product classification candidate screening', () => {
  it('keeps empty or unknown facts in review and never returns PASS or FAIL', () => {
    const results = screenProductClassCandidates(createEmptyProductClassificationProfile());

    expect(results).toHaveLength(2);
    for (const result of results) {
      expect(result.status).toBe('REVIEW REQUIRED');
      expect(result.applicationMode).toBe('CANDIDATE');
      expect(result.value?.screeningOutcome).toBe('inconclusive');
      expect(result.value?.reviewerConfirmationRequired).toBe(true);
    }
  });

  it('indicates a beverage candidate only when each criterion has evidence', () => {
    const [beverage, infantFood] = screenProductClassCandidates(supportedCaffeinatedBeverage());

    expect(beverage?.status).toBe('REVIEW REQUIRED');
    expect(beverage?.value).toMatchObject({
      candidateId: 'formulated_caffeinated_beverage',
      screeningOutcome: 'candidate_indicated',
      reviewerConfirmationRequired: true,
    });
    expect(beverage?.rule.provision).toContain('item 14.1.3');
    expect(beverage?.inputs).toHaveLength(4);
    expect(infantFood?.value?.screeningOutcome).toBe('inconclusive');
  });

  it('indicates an infant-food candidate only when the intended-use fact and exclusions are evidenced', () => {
    const [, infantFood] = screenProductClassCandidates(supportedInfantFood());

    expect(infantFood?.status).toBe('REVIEW REQUIRED');
    expect(infantFood?.value).toMatchObject({
      candidateId: 'food_for_infants',
      screeningOutcome: 'candidate_indicated',
      reviewerConfirmationRequired: true,
    });
    expect(infantFood?.rule.provision).toContain('item 13.2');
    expect(infantFood?.inputs).toHaveLength(5);
  });

  it('does not indicate the infant-food candidate when a sourced exclusion applies', () => {
    const profile = supportedInfantFood();
    const [, result] = screenProductClassCandidates({
      ...profile,
      foodForInfants: {
        ...profile.foodForInfants,
        infantFormulaProduct: fact('yes', evidence('formula-label')),
      },
    });

    expect(result?.status).toBe('REVIEW REQUIRED');
    expect(result?.value?.screeningOutcome).toBe('not_indicated');
    expect(result?.explanation).toContain('not a legal classification');
  });

  it('keeps a criterion with a missing source or conflicting sources inconclusive', () => {
    const profile = supportedCaffeinatedBeverage();
    const missingEvidence = {
      ...profile.formulatedCaffeinatedBeverage,
      flavoured: fact('yes'),
    };
    const [missing] = screenProductClassCandidates({
      ...profile,
      formulatedCaffeinatedBeverage: missingEvidence,
    });
    const conflicting = {
      ...profile.formulatedCaffeinatedBeverage,
      containsCaffeine: fact('conflicting', evidence('spec-a'), evidence('spec-b')),
    };
    const [conflict] = screenProductClassCandidates({
      ...profile,
      formulatedCaffeinatedBeverage: conflicting,
    });

    expect(missing?.value?.screeningOutcome).toBe('inconclusive');
    expect(missing?.explanation).toContain('supporting evidence is missing');
    expect(conflict?.value?.screeningOutcome).toBe('inconclusive');
    expect(conflict?.explanation).toContain('evidence conflicts');
  });
});

describe('prescribed-name candidate screening', () => {
  it('does not infer a prescribed name from a proposed product name', () => {
    const result = screenPrescribedNameCandidate(
      'Prescribed infant food name',
      createEmptyProductClassificationProfile(),
      'product-1',
      '2026-11-09T12:00:00.000Z',
    );

    expect(result.status).toBe('REVIEW REQUIRED');
    expect(result.applicationMode).toBe('CANDIDATE');
    expect(result.value).toEqual({
      proposedName: 'Prescribed infant food name',
      candidateRuleIds: [],
      reason: 'NO_APPROVED_COHORT_RULES',
      reviewerConfirmationRequired: true,
    });
    expect(result.explanation).toContain('cannot identify a prescribed name');
  });
});
