import type {
  EvaluationInputTrace,
  EngineResult,
  ProductClassificationEvidence,
  ProductClassificationFact,
  ProductClassificationProfile,
} from '@aus-food/domain';

type ClassificationCandidateId =
  | 'formulated_caffeinated_beverage'
  | 'food_for_infants';

type ClassificationScreeningOutcome =
  | 'candidate_indicated'
  | 'not_indicated'
  | 'inconclusive';

export interface ClassificationScreeningValue {
  readonly candidateId: ClassificationCandidateId;
  readonly screeningOutcome: ClassificationScreeningOutcome;
  readonly reasons: readonly string[];
  readonly reviewerConfirmationRequired: true;
}

interface FactRequirement {
  readonly id: string;
  readonly label: string;
  readonly fact: ProductClassificationFact;
  readonly expected: 'yes' | 'no';
}

interface CandidateSource {
  readonly id: ClassificationCandidateId;
  readonly name: string;
  readonly instrument: string;
  readonly provision: string;
  readonly sourceUrl: string;
  readonly effectiveFrom: string;
  readonly version: string;
  readonly requirements: readonly FactRequirement[];
}

const caffeinatedBeverageSource: Omit<CandidateSource, 'requirements'> = {
  id: 'formulated_caffeinated_beverage',
  name: 'Formulated caffeinated beverage candidate screening',
  instrument: 'Australia New Zealand Food Standards Code',
  provision: 'Standard 2.6.4—2; Schedule 15 S15—5 item 14.1.3',
  sourceUrl:
    'https://www.legislation.gov.au/F2015L00467/asmade/2015-04-01/text/original/epub/OEBPS/document_1/document_1.html',
  effectiveFrom: '2016-03-01',
  version: 'F2015L00467; Schedule 15 F2026C00407',
};

const infantFoodSource: Omit<CandidateSource, 'requirements'> = {
  id: 'food_for_infants',
  name: 'Food for infants candidate screening',
  instrument: 'Australia New Zealand Food Standards Code',
  provision: 'Standard 2.9.2—2; Schedule 15 S15—5 item 13.2',
  sourceUrl:
    'https://www.legislation.gov.au/F2015L00417/2024-09-13/2024-09-13/text/original/epub/OEBPS/document_1/document_1.html',
  effectiveFrom: '2024-09-13',
  version: 'F2024C00903; Schedule 15 F2026C00407',
};

function requirementsFor(
  profile: ProductClassificationProfile,
): readonly CandidateSource[] {
  return [
    {
      ...caffeinatedBeverageSource,
      requirements: [
        {
          id: 'flavoured',
          label: 'is flavoured',
          fact: profile.formulatedCaffeinatedBeverage.flavoured,
          expected: 'yes',
        },
        {
          id: 'nonAlcoholic',
          label: 'is non-alcoholic',
          fact: profile.formulatedCaffeinatedBeverage.nonAlcoholic,
          expected: 'yes',
        },
        {
          id: 'containsCaffeine',
          label: 'contains caffeine',
          fact: profile.formulatedCaffeinatedBeverage.containsCaffeine,
          expected: 'yes',
        },
        {
          id: 'representedForMentalPerformance',
          label: 'is represented for enhancing mental performance',
          fact: profile.formulatedCaffeinatedBeverage.representedForMentalPerformance,
          expected: 'yes',
        },
      ],
    },
    {
      ...infantFoodSource,
      requirements: [
        {
          id: 'intendedAsNourishmentForInfants',
          label: 'is intended or represented as a source of nourishment for infants',
          fact: profile.foodForInfants.intendedAsNourishmentForInfants,
          expected: 'yes',
        },
        {
          id: 'infantFormulaProduct',
          label: 'is not an infant formula product',
          fact: profile.foodForInfants.infantFormulaProduct,
          expected: 'no',
        },
        {
          id: 'formulatedMealReplacement',
          label: 'is not a formulated meal replacement',
          fact: profile.foodForInfants.formulatedMealReplacement,
          expected: 'no',
        },
        {
          id: 'formulatedSupplementaryFood',
          label: 'is not a formulated supplementary food',
          fact: profile.foodForInfants.formulatedSupplementaryFood,
          expected: 'no',
        },
        {
          id: 'unprocessedFruitOrVegetables',
          label: 'is not unprocessed fruit or vegetables',
          fact: profile.foodForInfants.unprocessedFruitOrVegetables,
          expected: 'no',
        },
      ],
    },
  ];
}

function unknownFact(): ProductClassificationFact {
  return { answer: 'unknown', evidence: [] };
}

export function createEmptyProductClassificationProfile(): ProductClassificationProfile {
  return {
    intendedUseDescription: '',
    intendedConsumerDescription: '',
    processingDescription: '',
    presentationDescription: '',
    identityEvidence: [],
    formulatedCaffeinatedBeverage: {
      flavoured: unknownFact(),
      nonAlcoholic: unknownFact(),
      containsCaffeine: unknownFact(),
      representedForMentalPerformance: unknownFact(),
    },
    foodForInfants: {
      intendedAsNourishmentForInfants: unknownFact(),
      infantFormulaProduct: unknownFact(),
      formulatedMealReplacement: unknownFact(),
      formulatedSupplementaryFood: unknownFact(),
      unprocessedFruitOrVegetables: unknownFact(),
    },
  };
}

function evaluateCandidate(
  candidate: CandidateSource,
): EngineResult<ClassificationScreeningValue> {
  const reasons: string[] = [];
  let notIndicated = false;
  let inconclusive = false;
  const inputs: EvaluationInputTrace[] = [];

  for (const requirement of candidate.requirements) {
    const { fact } = requirement;
    const evidenceIsSufficient = fact.answer === 'conflicting'
      ? fact.evidence.length >= 2
      : fact.answer === 'unknown' || fact.evidence.length >= 1;

    if (fact.answer === 'conflicting') {
      inconclusive = true;
      reasons.push(`${requirement.label}: evidence conflicts and needs review`);
    } else if (fact.answer === 'unknown' || !evidenceIsSufficient) {
      inconclusive = true;
      reasons.push(
        `${requirement.label}: ${fact.answer === 'unknown' ? 'not established' : 'supporting evidence is missing'}`,
      );
    } else if (fact.answer !== requirement.expected) {
      notIndicated = true;
      reasons.push(`${requirement.label}: recorded evidence indicates the opposite`);
    }

    for (const evidence of fact.evidence) {
      inputs.push({
        name: requirement.label,
        value: fact.answer,
        sourceId: evidence.id,
        sourceDate: evidence.sourceDate,
        sourcePath: [evidence.reference],
      });
    }
  }

  const screeningOutcome = notIndicated
    ? 'not_indicated'
    : inconclusive
      ? 'inconclusive'
      : 'candidate_indicated';
  if (screeningOutcome === 'candidate_indicated') {
    reasons.push('All listed screening facts have supporting evidence; human classification confirmation is still required.');
  } else if (screeningOutcome === 'not_indicated') {
    reasons.push('Recorded facts do not support this candidate; this is not a legal classification or a compliance failure.');
  }

  return {
    title: candidate.name,
    whatWasChecked: `Evidence-backed screening prompts for ${candidate.provision}.`,
    rule: {
      id: `candidate.${candidate.id}`,
      name: candidate.name,
      instrument: candidate.instrument,
      provision: candidate.provision,
      sourceUrl: candidate.sourceUrl,
      jurisdiction: 'Australia and New Zealand',
      effectiveFrom: candidate.effectiveFrom,
      version: candidate.version,
      mappingConfidence: 'Standard',
    },
    inputs,
    explanation: `${reasons.join('. ')} Product names are not used to assign a food class.`,
    suggestedAction: 'Confirm the product identity, classification and applicable Code provisions before relying on this candidate.',
    value: {
      candidateId: candidate.id,
      screeningOutcome,
      reasons,
      reviewerConfirmationRequired: true,
    },
    status: 'REVIEW REQUIRED',
    applicationMode: 'CANDIDATE',
    nonCertificationStatement: 'This result assists review and does not certify legal compliance.',
  };
}

export function screenProductClassCandidates(
  profile: ProductClassificationProfile,
): readonly EngineResult<ClassificationScreeningValue>[] {
  return requirementsFor(profile).map(evaluateCandidate);
}

export interface PrescribedNameCandidateScreeningValue {
  readonly proposedName: string;
  readonly candidateRuleIds: readonly string[];
  readonly reason: 'NO_APPROVED_COHORT_RULES';
  readonly reviewerConfirmationRequired: true;
}

export function screenPrescribedNameCandidate(
  proposedName: string,
  profile: ProductClassificationProfile,
  productId: string,
  updatedAt: string,
): EngineResult<PrescribedNameCandidateScreeningValue> {
  const evidenceInputs = profile.identityEvidence.map((evidence: ProductClassificationEvidence) => ({
    name: 'Product identity evidence',
    value: evidence.reference,
    sourceId: evidence.id,
    sourceDate: evidence.sourceDate,
    sourcePath: [productId],
  }));
  return {
    title: 'Prescribed-name candidate screening',
    whatWasChecked: 'The proposed name is recorded, but no approved cohort-specific candidate-name rules are available.',
    rule: {
      id: 'candidate.prescribed-name',
      name: 'Prescribed-name candidate identification',
      instrument: 'Australia New Zealand Food Standards Code',
      provision: 'Standard 1.2.2—2',
      sourceUrl:
        'https://www.legislation.gov.au/F2015L00389/2024-07-22/2024-07-22/text/original/epub/OEBPS/document_1/document_1.html',
      jurisdiction: 'Australia and New Zealand',
      effectiveFrom: '2024-07-22',
      version: 'F2024C00726',
      mappingConfidence: 'Standard',
    },
    inputs: [
      {
        name: 'Proposed food name (not used to infer a class)',
        value: proposedName,
        sourceId: productId,
        sourceDate: updatedAt,
        sourcePath: [productId],
      },
      ...evidenceInputs,
    ],
    explanation:
      'No cohort-specific prescribed-name candidate rule has been approved. A proposed name or product description alone cannot identify a prescribed name; the applicable food standards and product facts need human review.',
    suggestedAction: 'Review the product identity, intended use, composition, processing and presentation against the current Code.',
    value: {
      proposedName,
      candidateRuleIds: [],
      reason: 'NO_APPROVED_COHORT_RULES',
      reviewerConfirmationRequired: true,
    },
    status: 'REVIEW REQUIRED',
    applicationMode: 'CANDIDATE',
    nonCertificationStatement: 'This result assists review and does not certify legal compliance.',
  };
}
