import type {
  AdditiveConcentration,
  AdditiveSourceEvidence,
  IngredientAdditiveSource,
} from '@aus-food/domain';
import type { FormulationRecord, IngredientRecord, ProductRecord } from '@aus-food/storage';
import { workedExampleTag, type WorkedExampleSet } from './worked-examples.js';

// Every name, figure and date here is INVENTED for illustration. See docs/worked-examples-scenarios.md.
// Caffeinated beverages (W4) are here; food for infants is added in W5.
const at = '2026-11-10T00:00:00.000Z';
const tags = [workedExampleTag];
const inventedEvidence = { reference: 'Invented worked-example evidence sheet', sourceDate: '2026-11-01' };

const specification: AdditiveSourceEvidence = {
  id: 'we-evidence-spec',
  reference: 'Invented supplier specification',
  sourceDate: '2026-11-01',
  kind: 'supplierSpecification',
};

// The additive ingredient is the pure substance, so its figure is 1000 g/kg of itself and the
// final concentration is set by how much of it the formulation line adds.
const pureSubstance: AdditiveConcentration = { value: '1000', unit: 'gPerKg', basis: 'asSupplied' };

function ingredient(
  id: string,
  name: string,
  additiveSources?: readonly IngredientAdditiveSource[],
): IngredientRecord {
  return {
    id,
    name,
    recordType: 'ingredient',
    kind: 'atomic',
    tags,
    createdAt: at,
    updatedAt: at,
    ...(additiveSources ? { additiveSources } : {}),
  };
}

function additiveSource(
  id: string,
  additiveName: string,
  codeNumber: string,
  purpose: string,
  declarationClass: string,
  options: {
    concentration?: AdditiveConcentration;
    sourceStatus?: IngredientAdditiveSource['sourceStatus'];
  } = {},
): IngredientAdditiveSource {
  return {
    id,
    additiveName,
    codeNumber,
    technologicalPurposes: [purpose],
    ...(options.concentration ? { concentration: options.concentration } : {}),
    sourceEvidence: [specification],
    sourceStatus: options.sourceStatus ?? 'added',
    declarationSelection: {
      route: 'schedule7Class',
      schedule7ClassName: declarationClass,
      substanceChoice: 'schedule8Name',
    },
  };
}

function line(formulationId: string, ingredientId: string, grams: string) {
  return {
    id: `${formulationId}-${ingredientId}`,
    kind: 'ingredient' as const,
    ingredientId,
    quantity: { value: grams, unit: 'g' as const },
  };
}

const ingredients: IngredientRecord[] = [
  ingredient('we-ing-water', 'Water'),
  ingredient('we-ing-sugar', 'Sugar'),
  ingredient('we-ing-citric-acid', 'Citric acid'),
  ingredient('we-ing-flavour', 'Flavour'),
  ingredient('we-ing-caffeine', 'Caffeine', [
    {
      id: 'we-src-caffeine',
      additiveName: 'Caffeine',
      technologicalPurposes: ['Flavour enhancer'],
      concentration: pureSubstance,
      sourceEvidence: [specification],
      sourceStatus: 'added',
      declarationSelection: { route: 'addedCaffeine' },
    },
  ]),
  ingredient('we-ing-wood-rosin', 'Glycerol esters of wood rosins', [
    additiveSource('we-src-wood-rosin', 'Glycerol esters of wood rosins', '445', 'Stabiliser', 'stabiliser', {
      concentration: pureSubstance,
    }),
  ]),
  ingredient('we-ing-benzoate', 'Sodium benzoate', [
    // The figure is the supplier's benzoic acid content, already converted by the person.
    additiveSource('we-src-benzoate', 'Sodium benzoate', '211', 'Preservative', 'preservative', {
      concentration: { value: '860', unit: 'gPerKg', basis: 'asSupplied', calculatedAs: 'benzoic acid' },
    }),
  ]),
  ingredient('we-ing-apple', 'Apple puree'),
  ingredient('we-ing-oats', 'Rolled oats'),
  ingredient('we-ing-honey', 'Honey'),
  ingredient('we-ing-ascorbic-acid', 'Ascorbic acid', [
    additiveSource('we-src-ascorbic-acid', 'Ascorbic acid', '300', 'Antioxidant', 'antioxidant', {
      concentration: pureSubstance,
    }),
  ]),
  ingredient('we-ing-citric-acid-additive', 'Citric acid (additive)', [
    additiveSource('we-src-citric-acid', 'Citric acid', '330', 'Acidity regulator', 'acidity regulator', {
      concentration: pureSubstance,
    }),
  ]),
  ingredient('we-ing-carrageenan', 'Carrageenan', [
    additiveSource('we-src-carrageenan', 'Carrageenan', '407', 'Thickener', 'thickener', {
      concentration: pureSubstance,
    }),
  ]),
  ingredient('we-ing-acesulphame-k', 'Acesulphame potassium', [
    additiveSource('we-src-acesulphame', 'Acesulphame potassium', '950', 'Intense sweetener', 'sweetener', {
      concentration: pureSubstance,
    }),
  ]),
  ingredient('we-ing-sulphite', 'Sodium metabisulphite', [
    // No concentration entered on purpose: a missing fact, never zero.
    additiveSource('we-src-sulphite', 'Sodium metabisulphite', '223', 'Preservative', 'preservative'),
  ]),
  ingredient('we-ing-steviol', 'Steviol glycosides', [
    // Source status unknown on purpose: it is not known whether this was added.
    additiveSource('we-src-steviol', 'Steviol glycosides', '960', 'Intense sweetener', 'sweetener', {
      concentration: pureSubstance,
      sourceStatus: 'unknown',
    }),
  ]),
];

const p1Formulation: FormulationRecord = {
  id: 'we-form-citrus-boost',
  name: 'Example Citrus Boost formulation',
  recordType: 'formulation',
  lines: [
    line('we-form-citrus-boost', 'we-ing-water', '97.607'),
    line('we-form-citrus-boost', 'we-ing-sugar', '2'),
    line('we-form-citrus-boost', 'we-ing-citric-acid', '0.2'),
    line('we-form-citrus-boost', 'we-ing-flavour', '0.1'),
    line('we-form-citrus-boost', 'we-ing-caffeine', '0.032'),
    line('we-form-citrus-boost', 'we-ing-wood-rosin', '0.006'),
    line('we-form-citrus-boost', 'we-ing-acesulphame-k', '0.025'),
    line('we-form-citrus-boost', 'we-ing-benzoate', '0.03'),
  ],
  tags,
  createdAt: at,
  updatedAt: at,
};

const p2Formulation: FormulationRecord = {
  id: 'we-form-citrus-boost-max',
  name: 'Example Citrus Boost Max formulation',
  recordType: 'formulation',
  lines: [
    line('we-form-citrus-boost-max', 'we-ing-water', '95.635'),
    line('we-form-citrus-boost-max', 'we-ing-sugar', '4'),
    line('we-form-citrus-boost-max', 'we-ing-citric-acid', '0.2'),
    line('we-form-citrus-boost-max', 'we-ing-flavour', '0.1'),
    line('we-form-citrus-boost-max', 'we-ing-caffeine', '0.032'),
    line('we-form-citrus-boost-max', 'we-ing-wood-rosin', '0.013'),
    line('we-form-citrus-boost-max', 'we-ing-sulphite', '0.01'),
    line('we-form-citrus-boost-max', 'we-ing-steviol', '0.01'),
  ],
  tags,
  createdAt: at,
  updatedAt: at,
};

const beverageInputs = {
  confirmedCohorts: ['formulated_caffeinated_beverage'],
  additiveCategoryId: 'category-14-1-3',
  outputUnit: 'mg/kg',
  noProcessMassChangeConfirmed: true,
  gmpConfirmed: false,
  evidence: inventedEvidence,
} as const;

const noProhibitedContext = { infantFormulaProduct: false, kava: false, alcoholAbove1_15Percent: false };

const p1: ProductRecord = {
  id: 'we-prod-citrus-boost',
  name: 'Example Citrus Boost',
  recordType: 'product',
  formulationId: p1Formulation.id,
  foodState: 'asSold',
  additiveNameInputs: beverageInputs,
  claimFacts: {
    foodForm: 'liquid',
    formOfFoodConfirmed: true,
    servingConfirmed: true,
    prohibitedContexts: noProhibitedContext,
  },
  claims: [
    {
      id: 'we-claim-p1-low-sugars',
      text: 'Low sugars',
      classification: 'nutrition_content',
      classificationConfirmed: true,
      supportedClaimId: 'claim.low-sugars',
      nutrientAmount: { value: '2.0', unit: 'g' },
      evidence: inventedEvidence,
    },
  ],
  tags,
  createdAt: at,
  updatedAt: at,
};

const p2: ProductRecord = {
  id: 'we-prod-citrus-boost-max',
  name: 'Example Citrus Boost Max',
  recordType: 'product',
  formulationId: p2Formulation.id,
  foodState: 'asSold',
  additiveNameInputs: beverageInputs,
  claimFacts: {
    foodForm: 'liquid',
    formOfFoodConfirmed: true,
    servingConfirmed: true,
    prohibitedContexts: noProhibitedContext,
  },
  claims: [
    {
      id: 'we-claim-p2-low-sugars',
      text: 'Low sugars',
      classification: 'nutrition_content',
      classificationConfirmed: true,
      supportedClaimId: 'claim.low-sugars',
      nutrientAmount: { value: '4.0', unit: 'g' },
      evidence: inventedEvidence,
    },
    {
      // No figure entered on purpose: a missing fact, never zero.
      id: 'we-claim-p2-low-energy',
      text: 'Low energy',
      classification: 'nutrition_content',
      classificationConfirmed: true,
      supportedClaimId: 'claim.low-energy',
    },
    {
      id: 'we-claim-p2-health',
      text: 'Supports concentration',
      classification: 'health',
      classificationConfirmed: true,
    },
  ],
  tags,
  createdAt: at,
  updatedAt: at,
};

const infantInputs = {
  confirmedCohorts: ['food_for_infants'],
  additiveCategoryId: 'category-13-2',
  outputUnit: 'mg/kg',
  noProcessMassChangeConfirmed: true,
  gmpConfirmed: true,
  evidence: inventedEvidence,
} as const;

const p3Formulation: FormulationRecord = {
  id: 'we-form-apple-oat',
  name: 'Example Apple and Oat Puree formulation',
  recordType: 'formulation',
  lines: [
    line('we-form-apple-oat', 'we-ing-apple', '60'),
    line('we-form-apple-oat', 'we-ing-oats', '10'),
    line('we-form-apple-oat', 'we-ing-water', '29.67'),
    line('we-form-apple-oat', 'we-ing-ascorbic-acid', '0.03'),
    line('we-form-apple-oat', 'we-ing-citric-acid-additive', '0.3'),
  ],
  tags,
  createdAt: at,
  updatedAt: at,
};

const p4Formulation: FormulationRecord = {
  id: 'we-form-honey-oat',
  name: 'Example Honey and Oat Puree formulation',
  recordType: 'formulation',
  lines: [
    line('we-form-honey-oat', 'we-ing-apple', '55'),
    line('we-form-honey-oat', 'we-ing-oats', '10'),
    line('we-form-honey-oat', 'we-ing-honey', '5'),
    line('we-form-honey-oat', 'we-ing-water', '28.8'),
    line('we-form-honey-oat', 'we-ing-carrageenan', '1.2'),
  ],
  tags,
  createdAt: at,
  updatedAt: at,
};

const p3: ProductRecord = {
  id: 'we-prod-apple-oat',
  name: 'Example Apple and Oat Puree',
  recordType: 'product',
  formulationId: p3Formulation.id,
  foodState: 'asSold',
  additiveNameInputs: {
    ...infantInputs,
    addedSugarsPer100g: '0',
    sugarsBasisConfirmed: true,
  },
  claimFacts: {
    foodForm: 'solid',
    formOfFoodConfirmed: true,
    servingConfirmed: true,
    prohibitedContexts: noProhibitedContext,
  },
  claims: [
    {
      id: 'we-claim-p3-fibre',
      text: 'Good source of dietary fibre',
      classification: 'nutrition_content',
      classificationConfirmed: true,
      supportedClaimId: 'claim.good-source-dietary-fibre',
      nutrientAmount: { value: '4.5', unit: 'g' },
      evidence: inventedEvidence,
    },
  ],
  tags,
  createdAt: at,
  updatedAt: at,
};

const p4: ProductRecord = {
  id: 'we-prod-honey-oat',
  name: 'Example Honey and Oat Puree',
  recordType: 'product',
  formulationId: p4Formulation.id,
  foodState: 'asSold',
  additiveNameInputs: {
    ...infantInputs,
    // Sugars basis left unconfirmed on purpose: a missing confirmation, never assumed.
    addedSugarsPer100g: '5',
  },
  claimFacts: {
    foodForm: 'solid',
    formOfFoodConfirmed: true,
    servingConfirmed: true,
    // The person says this is an infant formula product, a prohibited context for the claim.
    prohibitedContexts: { ...noProhibitedContext, infantFormulaProduct: true },
  },
  claims: [
    {
      id: 'we-claim-p4-low-fat',
      text: 'Low fat',
      classification: 'nutrition_content',
      classificationConfirmed: true,
      supportedClaimId: 'claim.low-fat',
      nutrientAmount: { value: '2.0', unit: 'g' },
      evidence: inventedEvidence,
    },
    {
      // Classification left unconfirmed on purpose.
      id: 'we-claim-p4-low-sodium',
      text: 'Low sodium',
      classification: 'nutrition_content',
      supportedClaimId: 'claim.low-sodium',
      nutrientAmount: { value: '50', unit: 'mg' },
      evidence: inventedEvidence,
    },
  ],
  tags,
  createdAt: at,
  updatedAt: at,
};

export const workedExampleSet: WorkedExampleSet = {
  ingredients,
  formulations: [p1Formulation, p2Formulation, p3Formulation, p4Formulation],
  products: [p1, p2, p3, p4],
};
