import type { ProductRecord } from '@aus-food/storage';

type Profile = NonNullable<ProductRecord['classificationProfile']>;
type Fact = Profile['foodForInfants'][keyof Profile['foodForInfants']];
type Evidence = Profile['identityEvidence'][number];

export type ProductType = '' | 'caffeinatedBeverage' | 'infantFood' | 'other';
export type SimpleAnswer = 'unknown' | 'yes' | 'no';
export type EvidenceKind = Evidence['kind'];

export interface BuilderQuestion {
  group: 'formulatedCaffeinatedBeverage' | 'foodForInfants';
  key: string;
  question: string;
  why: string;
}

export const productTypeOptions: { value: Exclude<ProductType, ''>; label: string; hint: string }[] = [
  {
    value: 'caffeinatedBeverage',
    label: 'A drink with added caffeine (for example an energy drink)',
    hint: 'Standard 2.6.4 sets rules for caffeinated drinks, so we ask a few questions to check it fits.',
  },
  {
    value: 'infantFood',
    label: 'Food for infants (babies under 12 months)',
    hint: 'Standard 2.9.2 covers infant foods and excludes some products, so we ask a few questions.',
  },
  {
    value: 'other',
    label: 'Something else',
    hint: 'We can still draft a basic label. A consultant will need to check the rules for this product.',
  },
];

export const caffeinatedQuestions: BuilderQuestion[] = [
  {
    group: 'formulatedCaffeinatedBeverage',
    key: 'flavoured',
    question: 'Is the drink flavoured?',
    why: 'Only flavoured drinks can be formulated caffeinated beverages. Answer from the recipe, not the product name.',
  },
  {
    group: 'formulatedCaffeinatedBeverage',
    key: 'nonAlcoholic',
    question: 'Is the drink non-alcoholic?',
    why: 'Alcoholic drinks are outside this category. Check the recipe or supplier specifications.',
  },
  {
    group: 'formulatedCaffeinatedBeverage',
    key: 'containsCaffeine',
    question: 'Does the drink contain caffeine?',
    why: 'Caffeine can be added directly or come from an ingredient such as guarana or coffee. Check each spec sheet.',
  },
  {
    group: 'formulatedCaffeinatedBeverage',
    key: 'representedForMentalPerformance',
    question: 'Does the pack or marketing say it improves mental performance?',
    why: 'Drinks presented this way can fall into the category even without the word "energy". Use your product brief.',
  },
];

export const infantQuestions: BuilderQuestion[] = [
  {
    group: 'foodForInfants',
    key: 'intendedAsNourishmentForInfants',
    question: 'Is the food made for, or presented as nourishment for, babies under 12 months?',
    why: 'This is the core of the infant food definition. Use your product brief or packaging.',
  },
  {
    group: 'foodForInfants',
    key: 'infantFormulaProduct',
    question: 'Is it an infant formula?',
    why: 'Infant formula has its own standard and is excluded from this category.',
  },
  {
    group: 'foodForInfants',
    key: 'formulatedMealReplacement',
    question: 'Is it a formulated meal replacement?',
    why: 'Formulated meal replacements are excluded from this category.',
  },
  {
    group: 'foodForInfants',
    key: 'formulatedSupplementaryFood',
    question: 'Is it a formulated supplementary food?',
    why: 'Formulated supplementary foods are excluded from this category.',
  },
  {
    group: 'foodForInfants',
    key: 'unprocessedFruitOrVegetables',
    question: 'Is it just unprocessed fruit or vegetables?',
    why: 'Unprocessed fruit or vegetables are excluded from this category.',
  },
];

export const evidenceSourceOptions: { value: EvidenceKind; label: string }[] = [
  { value: 'supplierSpecification', label: 'Supplier specification sheets' },
  { value: 'formulationRecord', label: 'My recipe or formulation record' },
  { value: 'productPackaging', label: 'Product packaging or label' },
  { value: 'productBrief', label: 'Product brief or intended-use notes' },
  { value: 'processRecord', label: 'My process records' },
  { value: 'other', label: 'Something else (you describe it)' },
];

export function questionsFor(type: ProductType): BuilderQuestion[] {
  if (type === 'caffeinatedBeverage') {
    return caffeinatedQuestions;
  }
  return type === 'infantFood' ? infantQuestions : [];
}

export function factOf(profile: Profile, question: BuilderQuestion): Fact {
  const group = profile[question.group] as Record<string, Fact>;
  return group[question.key] as Fact;
}

export function detectProductType(profile: Profile): ProductType {
  const touched = (questions: BuilderQuestion[]) =>
    questions.some((question) => factOf(profile, question).answer !== 'unknown');
  if (touched(caffeinatedQuestions)) {
    return 'caffeinatedBeverage';
  }
  return touched(infantQuestions) ? 'infantFood' : '';
}

export function countAnswered(profile: Profile, type: ProductType): { answered: number; total: number } {
  const questions = questionsFor(type);
  return {
    answered: questions.filter((question) => {
      const answer = factOf(profile, question).answer;
      return answer === 'yes' || answer === 'no';
    }).length,
    total: questions.length,
  };
}

export function applyAnswer(
  profile: Profile,
  question: BuilderQuestion,
  answer: SimpleAnswer,
  evidence: Evidence | undefined,
): Profile {
  const current = factOf(profile, question);
  let nextFact: Fact;
  if (answer === 'unknown') {
    nextFact = { answer: 'unknown', evidence: [] };
  } else if (current.evidence.length > 0) {
    nextFact = { answer, evidence: current.evidence };
  } else if (evidence === undefined) {
    throw new Error('Choose where this information came from before answering yes or no.');
  } else {
    nextFact = { answer, evidence: [evidence] };
  }
  return {
    ...profile,
    [question.group]: { ...profile[question.group], [question.key]: nextFact },
  };
}

export function makeBuilderEvidence(
  kind: EvidenceKind,
  otherDescription: string,
  today: string,
): Evidence {
  const label = evidenceSourceOptions.find((option) => option.value === kind)?.label ?? kind;
  const reference =
    kind === 'other' ? otherDescription.trim() : `${label} (entered in the Label builder)`;
  if (!reference) {
    throw new Error('Describe where this information came from.');
  }
  return {
    id: `classification-evidence-${crypto.randomUUID()}`,
    reference,
    sourceDate: today,
    kind,
  };
}
