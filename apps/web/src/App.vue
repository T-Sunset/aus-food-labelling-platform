<script setup lang="ts">
import { computed, onMounted, reactive, ref, shallowRef } from 'vue';
import {
  createEmptyProductClassificationProfile,
  expandFormulation,
  formatAdditiveDeclarationCandidate,
  screenPrescribedNameCandidate,
  screenProductClassCandidates,
  sumDecimals,
  traceAdditiveAllergenEvidence,
  traceAdditiveSources,
} from '@aus-food/engine';
import AppButton from './components/ui/button/AppButton.vue';
import BackupPanel from './components/BackupPanel.vue';
import ClassificationEvidenceList from './components/ClassificationEvidenceList.vue';
import ClassificationFactField from './components/ClassificationFactField.vue';
import LabelExportPanel from './components/LabelExportPanel.vue';
import ReviewTracePanel from './components/ReviewTracePanel.vue';
import { seedIllustrativeDemo } from './demo-workspace.js';
import {
  openLocalFoodStore,
  type ApprovedVersionRecord,
  type FormulationRecord,
  type IngredientRecord,
  type LocalFoodStore,
  type ProductRecord,
  type WorkspaceDraftRecord,
} from '@aus-food/storage';

type ProductClassificationProfile = NonNullable<ProductRecord['classificationProfile']>;
type ProductClassificationFact =
  ProductClassificationProfile['foodForInfants'][keyof ProductClassificationProfile['foodForInfants']];
type IngredientAdditiveSource = NonNullable<IngredientRecord['additiveSources']>[number];
type AdditiveConcentration = NonNullable<IngredientAdditiveSource['concentration']>;
type AdditiveDeclarationSelection = NonNullable<IngredientAdditiveSource['declarationSelection']>;
type AdditiveSourceDraft = {
  id: string;
  additiveName: string;
  codeNumber: string;
  technologicalPurposes: string;
  concentrationValue: string;
  concentrationUnit: AdditiveConcentration['unit'] | '';
  concentrationBasis: AdditiveConcentration['basis'];
  sourceReference: string;
  sourceDate: string;
  allergenIdsPresent: string;
  sourceKind: NonNullable<IngredientAdditiveSource['sourceEvidence']>[number]['kind'];
  sourceStatus: IngredientAdditiveSource['sourceStatus'];
  declarationRoute: AdditiveDeclarationSelection['route'];
  schedule7ClassName: string;
  substanceChoice: AdditiveDeclarationSelection['substanceChoice'] | '';
  flavouringWording: AdditiveDeclarationSelection['flavouringWording'] | '';
};

type Section =
  | 'overview'
  | 'ingredients'
  | 'formulations'
  | 'products'
  | 'review'
  | 'labels'
  | 'backup';
type FormulationLineDraft = {
  kind: 'ingredient' | 'formulation';
  targetId: string;
  quantity: string;
  unit: 'g' | 'kg' | 'mg';
};

const activeSection = ref<Section>('overview');
const store = shallowRef<LocalFoodStore>();
const loading = ref(true);
const loadError = ref('');
const actionMessage = ref('');
const actionError = ref('');
const ingredients = ref<IngredientRecord[]>([]);
const formulations = ref<FormulationRecord[]>([]);
const products = ref<ProductRecord[]>([]);
const productVersions = ref<ApprovedVersionRecord[]>([]);
const expansion = ref<{
  productId: string;
  rows: { name: string; mass: string; path: string }[];
  additiveSources: (ReturnType<typeof traceAdditiveSources>[number] & { path: string })[];
  additiveAllergenEvidence: (
    ReturnType<typeof traceAdditiveAllergenEvidence>[number] & { path: string }
  )[];
  totalMass: string;
}>();
const expansionError = ref('');

const ingredientForm = reactive({
  name: '',
  kind: '' as 'atomic' | 'compound' | '',
  compoundFormulationId: '',
  supplierName: '',
  specificationReference: '',
  supplierProductCode: '',
  specificationDate: '',
  knownAllergens: '',
  protein: '',
  fat: '',
  saturatedFat: '',
  carbohydrate: '',
  sugars: '',
  sodium: '',
  additiveSources: [] as AdditiveSourceDraft[],
});
const formulationForm = reactive({
  name: '',
  lines: [] as FormulationLineDraft[],
});
const productForm = reactive({
  name: '',
  formulationId: '',
  foodState: '' as NonNullable<ProductRecord['foodState']> | '',
});
const classificationProfile = ref(createEmptyProductClassificationProfile());

function copyClassificationEvidence(
  evidence: ProductClassificationProfile['identityEvidence'],
): ProductClassificationProfile['identityEvidence'] {
  return evidence.map((item) => ({
    id: item.id,
    reference: item.reference,
    sourceDate: item.sourceDate,
    kind: item.kind,
  }));
}

function copyClassificationFact(fact: ProductClassificationFact): ProductClassificationFact {
  return {
    answer: fact.answer,
    evidence: copyClassificationEvidence(fact.evidence),
  };
}

function copyClassificationProfile(
  profile: ProductClassificationProfile,
): ProductClassificationProfile {
  return {
    intendedUseDescription: profile.intendedUseDescription,
    intendedConsumerDescription: profile.intendedConsumerDescription,
    processingDescription: profile.processingDescription,
    presentationDescription: profile.presentationDescription,
    identityEvidence: copyClassificationEvidence(profile.identityEvidence),
    formulatedCaffeinatedBeverage: {
      flavoured: copyClassificationFact(profile.formulatedCaffeinatedBeverage.flavoured),
      nonAlcoholic: copyClassificationFact(profile.formulatedCaffeinatedBeverage.nonAlcoholic),
      containsCaffeine: copyClassificationFact(profile.formulatedCaffeinatedBeverage.containsCaffeine),
      representedForMentalPerformance: copyClassificationFact(
        profile.formulatedCaffeinatedBeverage.representedForMentalPerformance,
      ),
    },
    foodForInfants: {
      intendedAsNourishmentForInfants: copyClassificationFact(
        profile.foodForInfants.intendedAsNourishmentForInfants,
      ),
      infantFormulaProduct: copyClassificationFact(profile.foodForInfants.infantFormulaProduct),
      formulatedMealReplacement: copyClassificationFact(
        profile.foodForInfants.formulatedMealReplacement,
      ),
      formulatedSupplementaryFood: copyClassificationFact(
        profile.foodForInfants.formulatedSupplementaryFood,
      ),
      unprocessedFruitOrVegetables: copyClassificationFact(
        profile.foodForInfants.unprocessedFruitOrVegetables,
      ),
    },
  };
}

const caffeinatedBeverageFacts: {
  key: keyof ProductClassificationProfile['formulatedCaffeinatedBeverage'];
  label: string;
  description: string;
}[] = [
  {
    key: 'flavoured',
    label: 'Is the product flavoured?',
    description: 'Record whether the product has flavouring; do not infer this from its marketing name.',
  },
  {
    key: 'nonAlcoholic',
    label: 'Is the product non-alcoholic?',
    description: 'Use product specification or composition evidence.',
  },
  {
    key: 'containsCaffeine',
    label: 'Does the product contain caffeine?',
    description: 'Record evidence for caffeine in the product, including its source where known.',
  },
  {
    key: 'representedForMentalPerformance',
    label: 'Is it represented as enhancing mental performance?',
    description: 'Use product presentation or product-brief evidence; a product name alone is not enough.',
  },
];

const infantFoodFacts: {
  key: keyof ProductClassificationProfile['foodForInfants'];
  label: string;
  description: string;
}[] = [
  {
    key: 'intendedAsNourishmentForInfants',
    label: 'Is the food intended or represented as a source of nourishment for infants?',
    description: 'Record the intended consumer and evidence for the intended or represented use.',
  },
  {
    key: 'infantFormulaProduct',
    label: 'Is this an infant formula product?',
    description: 'A yes may place the product outside the Standard 2.9.2 food-for-infants definition.',
  },
  {
    key: 'formulatedMealReplacement',
    label: 'Is this a formulated meal replacement?',
    description: 'A yes may place the product outside the Standard 2.9.2 food-for-infants definition.',
  },
  {
    key: 'formulatedSupplementaryFood',
    label: 'Is this a formulated supplementary food?',
    description: 'A yes may place the product outside the Standard 2.9.2 food-for-infants definition.',
  },
  {
    key: 'unprocessedFruitOrVegetables',
    label: 'Is this unprocessed fruit or vegetables?',
    description: 'A yes may place the product outside the Standard 2.9.2 food-for-infants definition.',
  },
];

const sections: { id: Section; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'ingredients', label: 'Ingredients & specifications' },
  { id: 'formulations', label: 'Formulations' },
  { id: 'products', label: 'Products' },
  { id: 'review', label: 'Review & trace' },
  { id: 'labels', label: 'Label layout & PDF' },
  { id: 'backup', label: 'Backup & restore' },
];

const records = computed(() => ({
  ingredients: ingredients.value.length,
  formulations: formulations.value.length,
  products: products.value.length,
}));

const readyIngredients = computed(() =>
  ingredients.value.filter((ingredient) => ingredient.kind === 'atomic'),
);

function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function clearMessages(): void {
  actionMessage.value = '';
  actionError.value = '';
}

function explainError(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected local storage error occurred.';
}

function updateClassificationDescription(
  key: 'intendedUseDescription' | 'intendedConsumerDescription' | 'processingDescription' | 'presentationDescription',
  event: Event,
): void {
  const target = event.currentTarget;
  if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) {
    return;
  }
  classificationProfile.value = {
    ...classificationProfile.value,
    [key]: target.value,
  };
}

function updateCaffeinatedBeverageFact(
  key: keyof ProductClassificationProfile['formulatedCaffeinatedBeverage'],
  fact: ProductClassificationFact,
): void {
  classificationProfile.value = {
    ...classificationProfile.value,
    formulatedCaffeinatedBeverage: {
      ...classificationProfile.value.formulatedCaffeinatedBeverage,
      [key]: fact,
    },
  };
}

function updateInfantFoodFact(
  key: keyof ProductClassificationProfile['foodForInfants'],
  fact: ProductClassificationFact,
): void {
  classificationProfile.value = {
    ...classificationProfile.value,
    foodForInfants: {
      ...classificationProfile.value.foodForInfants,
      [key]: fact,
    },
  };
}

function updateIdentityEvidence(
  evidence: ProductClassificationProfile['identityEvidence'],
): void {
  classificationProfile.value = {
    ...classificationProfile.value,
    identityEvidence: evidence,
  };
}

function screeningOutcomeLabel(
  outcome: 'candidate_indicated' | 'not_indicated' | 'inconclusive' | undefined,
): string {
  switch (outcome) {
    case 'candidate_indicated':
      return 'Candidate indicated; reviewer confirmation required';
    case 'not_indicated':
      return 'Candidate not indicated by recorded facts; review still required';
    default:
      return 'Insufficient or conflicting evidence; review required';
  }
}

function productClassificationResults(product: ProductRecord) {
  return screenProductClassCandidates(
    product.classificationProfile ?? createEmptyProductClassificationProfile(),
  );
}

function productNameScreening(product: ProductRecord) {
  return screenPrescribedNameCandidate(
    product.name,
    product.classificationProfile ?? createEmptyProductClassificationProfile(),
    product.id,
    product.updatedAt,
  );
}

async function refreshRecords(): Promise<void> {
  if (store.value === undefined) {
    return;
  }
  [ingredients.value, formulations.value, products.value] = await Promise.all([
    store.value.ingredients.list(),
    store.value.formulations.list(),
    store.value.products.list(),
  ]);
  productVersions.value = (
    await Promise.all(
      products.value.map((product) => store.value!.approvedVersions.list('product', product.id)),
    )
  ).flat();
}

async function loadIllustrativeDemo(): Promise<void> {
  clearMessages();
  if (store.value === undefined) {
    actionError.value = 'Local storage is not available.';
    return;
  }
  try {
    await seedIllustrativeDemo(store.value);
    await refreshRecords();
    actionMessage.value =
      'Illustrative demo data loaded locally. It contains no supplier, nutrient, allergen or regulatory evidence.';
  } catch (error) {
    actionError.value = explainError(error);
  }
}

onMounted(async () => {
  try {
    store.value = await openLocalFoodStore();
    await refreshRecords();
  } catch (error) {
    loadError.value = explainError(error);
  } finally {
    loading.value = false;
  }
});

function parseNutrients(): IngredientRecord['nutrientProfile'] {
  const sourceDate = ingredientForm.specificationDate;
  const sourceId = ingredientForm.specificationReference.trim();
  const fields = [
    ['protein', ingredientForm.protein, 'g/100g'],
    ['fat', ingredientForm.fat, 'g/100g'],
    ['saturatedFat', ingredientForm.saturatedFat, 'g/100g'],
    ['carbohydrate', ingredientForm.carbohydrate, 'g/100g'],
    ['sugars', ingredientForm.sugars, 'g/100g'],
    ['sodium', ingredientForm.sodium, 'mg/100g'],
  ] as const;
  const supplied = fields.filter(([, value]) => value.trim() !== '');
  if (supplied.length === 0) {
    return undefined;
  }
  if (!sourceId || !sourceDate) {
    throw new Error(
      'Add the supplier specification reference and date before entering nutrient values.',
    );
  }
  const values: NonNullable<IngredientRecord['nutrientProfile']>['values'] = {};
  for (const [nutrient, value, unit] of supplied) {
    if (!/^(?:\d+)(?:\.\d+)?$/.test(value.trim())) {
      throw new Error(
        `Enter a non-negative number for ${nutrient}. Leave it blank if it was not supplied.`,
      );
    }
    values[nutrient] = {
      value: value.trim(),
      unit,
      sourceId,
      sourceDate,
      evidenceType: 'supplier',
    };
  }
  return { ingredientId: 'pending', values };
}

function createAdditiveSourceDraft(): AdditiveSourceDraft {
  return {
    id: makeId('additive-source'),
    additiveName: '',
    codeNumber: '',
    technologicalPurposes: '',
    concentrationValue: '',
    concentrationUnit: '',
    concentrationBasis: 'unknown',
    sourceReference: '',
    sourceDate: '',
    allergenIdsPresent: '',
    sourceKind: 'supplierSpecification',
    sourceStatus: 'unknown',
    declarationRoute: 'unknown',
    schedule7ClassName: '',
    substanceChoice: '',
    flavouringWording: '',
  };
}

function additiveDeclarationCandidate(source: IngredientAdditiveSource, ingredientId: string, sourcePath: readonly string[]) {
  const selection = source.declarationSelection;
  return formatAdditiveDeclarationCandidate({
    route: selection?.route ?? 'unknown',
    additiveName: source.additiveName,
    ...(source.codeNumber ? { codeNumber: source.codeNumber } : {}),
    ...(selection?.schedule7ClassName ? { schedule7ClassName: selection.schedule7ClassName } : {}),
    ...(selection?.substanceChoice ? { substanceChoice: selection.substanceChoice } : {}),
    ...(selection?.flavouringWording ? { flavouringWording: selection.flavouringWording } : {}),
    ingredientId,
    sourcePath,
  });
}

function additiveSourceStatusLabel(status: IngredientAdditiveSource['sourceStatus']): string {
  switch (status) {
    case 'added':
      return 'Added to this ingredient';
    case 'carriedOver':
      return 'Carried over';
    case 'processingAid':
      return 'Processing aid';
    case 'unknown':
      return 'Status not assessed';
  }
}

function additiveConcentrationUnitLabel(unit: AdditiveConcentration['unit']): string {
  switch (unit) {
    case 'mgPerKg':
      return 'mg/kg';
    case 'gPerKg':
      return 'g/kg';
    case 'mgPerL':
      return 'mg/L';
    case 'gPerL':
      return 'g/L';
    case 'mgPer100g':
      return 'mg/100 g';
    case 'gPer100g':
      return 'g/100 g';
    case 'mgPer100mL':
      return 'mg/100 mL';
    case 'gPer100mL':
      return 'g/100 mL';
    case 'percentByMass':
      return '% by mass';
    case 'percentByVolume':
      return '% by volume';
  }
}

function additiveConcentrationBasisLabel(basis: AdditiveConcentration['basis']): string {
  switch (basis) {
    case 'asSupplied':
      return 'as supplied';
    case 'dryMatter':
      return 'dry matter';
    case 'asAdded':
      return 'as added';
    case 'asPrepared':
      return 'as prepared';
    case 'asReconstituted':
      return 'as reconstituted';
    case 'asDrained':
      return 'as drained';
    case 'unknown':
      return 'basis not supplied';
  }
}

function parseAdditiveSources(): readonly IngredientAdditiveSource[] {
  return ingredientForm.additiveSources.map((draft, index) => {
    const additiveName = draft.additiveName.trim();
    if (!additiveName) {
      throw new Error(`Additive source ${index + 1} needs an additive identity.`);
    }

    const hasSourceReference = Boolean(draft.sourceReference.trim());
    if (hasSourceReference !== Boolean(draft.sourceDate)) {
      throw new Error(`Additive source ${index + 1} evidence needs both a reference and date.`);
    }
    const allergenIds = draft.allergenIdsPresent
      .split(',')
      .map((id) => id.trim().toLowerCase())
      .filter(Boolean);
    if (new Set(allergenIds).size !== allergenIds.length) {
      throw new Error(`Additive source ${index + 1} has duplicate allergen identifiers.`);
    }
    if (allergenIds.length > 0 && !hasSourceReference) {
      throw new Error(`Additive source ${index + 1} allergen assessments need a dated evidence reference.`);
    }
    const allergenAssessments = Object.fromEntries(
      allergenIds.map((id) => [id, 'present' as const]),
    );

    const hasConcentrationValue = Boolean(draft.concentrationValue.trim());
    if (hasConcentrationValue !== Boolean(draft.concentrationUnit)) {
      throw new Error(`Additive source ${index + 1} concentration needs both a value and unit.`);
    }

    const technologicalPurposes = draft.technologicalPurposes
      .split('\n')
      .map((purpose) => purpose.trim())
      .filter(Boolean);

    let concentration: AdditiveConcentration | undefined;
    if (hasConcentrationValue) {
      if (!draft.concentrationUnit) {
        throw new Error(`Additive source ${index + 1} concentration needs a unit.`);
      }
      concentration = {
        value: draft.concentrationValue.trim(),
        unit: draft.concentrationUnit,
        basis: draft.concentrationBasis,
      };
    }
    let declarationSelection: AdditiveDeclarationSelection | undefined;
    if (draft.declarationRoute !== 'unknown') {
      declarationSelection = {
        route: draft.declarationRoute,
        ...(draft.schedule7ClassName.trim()
          ? { schedule7ClassName: draft.schedule7ClassName.trim() }
          : {}),
        ...(draft.substanceChoice ? { substanceChoice: draft.substanceChoice } : {}),
        ...(draft.flavouringWording ? { flavouringWording: draft.flavouringWording } : {}),
      };
    }

    return {
      id: draft.id,
      additiveName,
      ...(draft.codeNumber.trim() ? { codeNumber: draft.codeNumber.trim() } : {}),
      ...(technologicalPurposes.length > 0 ? { technologicalPurposes } : {}),
      ...(concentration ? { concentration } : {}),
      ...(hasSourceReference
        ? {
            sourceEvidence: [{
              id: makeId('additive-evidence'),
              reference: draft.sourceReference.trim(),
              sourceDate: draft.sourceDate,
              kind: draft.sourceKind,
            }],
          }
        : {}),
      sourceStatus: draft.sourceStatus,
      ...(declarationSelection ? { declarationSelection } : {}),
      ...(allergenIds.length > 0 ? { allergenAssessments } : {}),
    };
  });
}

async function saveIngredient(): Promise<void> {
  clearMessages();
  if (store.value === undefined) {
    actionError.value = 'Local storage is not available.';
    return;
  }
  try {
    const id = makeId('ingredient');
    const ingredientKind = ingredientForm.kind;
    if (!ingredientKind) {
      throw new Error('Choose whether this is a single or compound ingredient.');
    }
    const hasSpecificationDetails = Boolean(
      ingredientForm.specificationReference.trim() ||
      ingredientForm.specificationDate ||
      ingredientForm.supplierProductCode.trim(),
    );
    if (
      hasSpecificationDetails &&
      (!ingredientForm.specificationReference.trim() || !ingredientForm.specificationDate)
    ) {
      throw new Error('Supplier specification details need both a reference and an issue date.');
    }
    const nutrientProfile = parseNutrients();
    const additiveSources = parseAdditiveSources();
    const knownAllergens = ingredientForm.knownAllergens
      .split(',')
      .map((allergen) => allergen.trim())
      .filter(Boolean);
    if (
      knownAllergens.length > 0 &&
      (!ingredientForm.specificationReference.trim() || !ingredientForm.specificationDate)
    ) {
      throw new Error(
        'Add the supplier specification reference and date before recording allergen evidence.',
      );
    }
    const record: IngredientRecord = {
      id,
      name: ingredientForm.name.trim(),
      recordType: 'ingredient',
      kind: ingredientKind,
      ...(ingredientKind === 'compound' && ingredientForm.compoundFormulationId
        ? { compoundFormulationId: ingredientForm.compoundFormulationId }
        : {}),
      ...(ingredientForm.supplierName.trim()
        ? { supplierName: ingredientForm.supplierName.trim() }
        : {}),
      ...(ingredientForm.specificationReference.trim()
        ? {
            specification: {
              reference: ingredientForm.specificationReference.trim(),
              sourceDate: ingredientForm.specificationDate,
              ...(ingredientForm.supplierProductCode.trim()
                ? { supplierProductCode: ingredientForm.supplierProductCode.trim() }
                : {}),
            },
          }
        : {}),
      ...(nutrientProfile ? { nutrientProfile: { ...nutrientProfile, ingredientId: id } } : {}),
      ...(knownAllergens.length > 0
        ? {
            allergenEvidence: [
              {
                id: makeId('allergen-evidence'),
                subjectId: id,
                kind: 'ingredient',
                sourceId: ingredientForm.specificationReference.trim(),
                sourceDate: ingredientForm.specificationDate,
                sourcePath: [id],
                assessments: Object.fromEntries(
                  knownAllergens.map((allergen) => [allergen, 'present']),
                ),
              },
            ],
          }
        : {}),
      ...(additiveSources.length > 0 ? { additiveSources } : {}),
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (ingredientKind === 'compound' && !record.compoundFormulationId) {
      throw new Error('Select the formulation used by this compound ingredient.');
    }
    await store.value.ingredients.create(record);
    await refreshRecords();
    Object.assign(ingredientForm, {
      name: '',
      kind: '',
      compoundFormulationId: '',
      supplierName: '',
      specificationReference: '',
      supplierProductCode: '',
      specificationDate: '',
      knownAllergens: '',
      protein: '',
      fat: '',
      saturatedFat: '',
      carbohydrate: '',
      sugars: '',
      sodium: '',
      additiveSources: [],
    });
    actionMessage.value = 'Ingredient draft saved locally.';
  } catch (error) {
    actionError.value = explainError(error);
  }
}

function addFormulationLine(): void {
  formulationForm.lines.push({
    kind: readyIngredients.value.length > 0 ? 'ingredient' : 'formulation',
    targetId: '',
    quantity: '',
    unit: 'g',
  });
}

function onLineKindChange(line: FormulationLineDraft): void {
  line.targetId = '';
}

function lineOptions(kind: FormulationLineDraft['kind']): readonly WorkspaceDraftRecord[] {
  return kind === 'ingredient' ? readyIngredients.value : formulations.value;
}

async function saveFormulation(): Promise<void> {
  clearMessages();
  expansion.value = undefined;
  expansionError.value = '';
  if (store.value === undefined) {
    actionError.value = 'Local storage is not available.';
    return;
  }
  try {
    if (formulationForm.lines.length === 0) {
      throw new Error('Add at least one ingredient or nested formulation line.');
    }
    const id = makeId('formulation');
    const lines = formulationForm.lines.map((line) => {
      if (!line.targetId) {
        throw new Error('Choose a record for each formulation line.');
      }
      if (!/^(?:\d+)(?:\.\d+)?$/.test(line.quantity) || Number(line.quantity) <= 0) {
        throw new Error('Each formulation line needs a positive quantity.');
      }
      return line.kind === 'ingredient'
        ? {
            id: makeId('line'),
            kind: 'ingredient' as const,
            ingredientId: line.targetId,
            quantity: { value: line.quantity, unit: line.unit },
          }
        : {
            id: makeId('line'),
            kind: 'formulation' as const,
            formulationId: line.targetId,
            quantity: { value: line.quantity, unit: line.unit },
          };
    });
    const record: FormulationRecord = {
      id,
      name: formulationForm.name.trim(),
      recordType: 'formulation',
      lines,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await store.value.formulations.create(record);
    await refreshRecords();
    formulationForm.name = '';
    formulationForm.lines = [];
    actionMessage.value = 'Formulation draft saved locally.';
  } catch (error) {
    actionError.value = explainError(error);
  }
}

function calculateFormulation(formulation: FormulationRecord): void {
  expansionError.value = '';
  expansion.value = undefined;
  try {
    const expanded = expandFormulation(
      formulation.id,
      { value: '100', unit: 'g' },
      formulations.value,
    );
    const ingredientById = new Map(
      ingredients.value.map((ingredient) => [ingredient.id, ingredient]),
    );
    const additiveSources = traceAdditiveSources(
      expanded,
      new Map(ingredients.value.map((ingredient) => [
        ingredient.id,
        ingredient.additiveSources ?? [],
      ])),
    );
    const additiveAllergenEvidence = traceAdditiveAllergenEvidence(
      expanded,
      new Map(ingredients.value.map((ingredient) => [
        ingredient.id,
        ingredient.additiveSources ?? [],
      ])),
    );
    const formulationById = new Map(
      formulations.value.map((item) => [item.id, item]),
    );
    const additiveSourceById = new Map(
      ingredients.value.flatMap((item) =>
        (item.additiveSources ?? []).map((source) => [source.id, source] as const),
      ),
    );
    expansion.value = {
      productId: formulation.id,
      rows: expanded.map((item) => ({
        name:
          ingredientById.get(item.ingredientId)?.name ??
          `Unresolved ingredient ${item.ingredientId}`,
        mass: item.mass.value,
        path: item.sourcePath.join(' → '),
      })),
      additiveSources: additiveSources.map((source) => ({
        ...source,
        path: source.sourcePath
          .map((id) => ingredientById.get(id)?.name ?? formulationById.get(id)?.name ?? id)
          .join(' → '),
      })),
      additiveAllergenEvidence: additiveAllergenEvidence.map((evidence) => ({
        ...evidence,
        path: evidence.sourcePath
          .map((id) =>
            ingredientById.get(id)?.name
            ?? formulationById.get(id)?.name
            ?? additiveSourceById.get(id)?.additiveName
            ?? id)
          .join(' → '),
      })),
      totalMass: sumDecimals(expanded.map((item) => item.mass.value)),
    };
  } catch (error) {
    expansionError.value = `Review required: ${explainError(error)}`;
  }
}

async function saveProduct(): Promise<void> {
  clearMessages();
  if (store.value === undefined) {
    actionError.value = 'Local storage is not available.';
    return;
  }
  try {
    if (!formulationFormulationExists(productForm.formulationId)) {
      throw new Error('Choose a saved formulation for this product.');
    }
    const foodState = productForm.foodState;
    if (!foodState) {
      throw new Error('Choose the food state for this product.');
    }
    const now = new Date().toISOString();
    const record: ProductRecord = {
      id: makeId('product'),
      name: productForm.name.trim(),
      recordType: 'product',
      formulationId: productForm.formulationId,
      foodState,
      classificationProfile: copyClassificationProfile(classificationProfile.value),
      tags: [],
      createdAt: now,
      updatedAt: now,
    };
    await store.value.products.create(record);
    await refreshRecords();
    productForm.name = '';
    productForm.formulationId = '';
    productForm.foodState = '';
    classificationProfile.value = createEmptyProductClassificationProfile();
    actionMessage.value =
      'Product draft saved locally. Regulatory review is not performed; class screening remains review-only.';
  } catch (error) {
    actionError.value = explainError(error);
  }
}

function formulationFormulationExists(id: string): boolean {
  return formulations.value.some((formulation) => formulation.id === id);
}

function confirmDelete(record: WorkspaceDraftRecord): boolean {
  return window.confirm(`Delete the draft "${record.name}"? This cannot be undone.`);
}

async function deleteRecord(record: WorkspaceDraftRecord): Promise<void> {
  if (store.value === undefined || !confirmDelete(record)) {
    return;
  }
  clearMessages();
  try {
    if (record.recordType === 'ingredient') {
      await store.value.ingredients.delete(record.id);
    } else if (record.recordType === 'formulation') {
      await store.value.formulations.delete(record.id);
    } else {
      await store.value.products.delete(record.id);
    }
    await refreshRecords();
    actionMessage.value = 'Draft deleted.';
  } catch (error) {
    actionError.value = explainError(error);
  }
}
</script>

<template>
  <div class="app-shell">
    <a
      class="skip-link"
      href="#main-content"
    >Skip to main content</a>
    <header class="topbar">
      <a
        class="brand"
        href="#"
        @click.prevent="activeSection = 'overview'"
      >
        <span
          class="brand-mark"
          aria-hidden="true"
        >F</span>
        <span>
          <strong>Fieldnote</strong>
          <small>Food label workspace</small>
        </span>
      </a>
      <span class="local-badge"><span aria-hidden="true" /> Stored on this device</span>
    </header>

    <div class="workspace">
      <aside
        class="sidebar"
        aria-label="Workspace navigation"
      >
        <p class="nav-caption">
          WORKSPACE
        </p>
        <nav>
          <button
            v-for="section in sections"
            :key="section.id"
            type="button"
            class="nav-link"
            :class="{ active: activeSection === section.id }"
            :aria-current="activeSection === section.id ? 'page' : undefined"
            @click="activeSection = section.id"
          >
            <span
              class="nav-indicator"
              aria-hidden="true"
            />
            {{ section.label }}
          </button>
        </nav>
        <div class="sidebar-note">
          <span
            class="note-icon"
            aria-hidden="true"
          >i</span>
          <p>Drafts and supplier details stay in this browser profile.</p>
        </div>
      </aside>

      <main
        id="main-content"
        class="main-content"
      >
        <div
          v-if="loading"
          class="page-state"
          role="status"
        >
          Opening your local workspace…
        </div>
        <section
          v-else-if="loadError"
          class="page-state error-card"
          role="alert"
        >
          <p class="eyebrow">
            WORKSPACE UNAVAILABLE
          </p>
          <h1>We couldn’t open local storage</h1>
          <p>{{ loadError }}</p>
          <p>Your data has not been sent anywhere. Check browser storage access and reload.</p>
        </section>
        <template v-else>
          <div
            v-if="store?.workspaceWasPreviouslyUsed"
            class="notice notice-warning"
            role="status"
          >
            <strong>Local workspace appears empty.</strong>
            <span>This browser previously had workspace data. It may have been cleared; restore from a
              backup if available.</span>
          </div>
          <div
            v-if="store && !store.workspaceUsageMarkerAvailable"
            class="notice notice-warning"
            role="status"
          >
            <strong>Storage-clear detection is unavailable.</strong>
            <span>This browser does not allow the local marker needed to detect cleared workspace
              data.</span>
          </div>

          <div
            v-if="actionMessage"
            class="notice notice-success"
            role="status"
            aria-live="polite"
          >
            {{ actionMessage }}
          </div>
          <div
            v-if="actionError"
            class="notice notice-error"
            role="alert"
          >
            <strong>Action could not be completed.</strong> {{ actionError }}
          </div>

          <section
            v-if="activeSection === 'overview'"
            class="page"
          >
            <div class="page-heading">
              <div>
                <p class="eyebrow">
                  YOUR LOCAL WORKSPACE
                </p>
                <h1>Good work starts with good records.</h1>
                <p class="lede">
                  Capture ingredients, supplier specifications and formulations before you prepare a
                  product for review.
                </p>
              </div>
              <div
                class="heading-art"
                aria-hidden="true"
              >
                <span>F</span><i /><b />
              </div>
            </div>

            <div
              class="summary-grid"
              aria-label="Workspace record counts"
            >
              <article class="summary-card">
                <span class="summary-label">Ingredients</span>
                <strong>{{ records.ingredients }}</strong>
                <span class="summary-detail">with supplier evidence</span>
              </article>
              <article class="summary-card">
                <span class="summary-label">Formulations</span>
                <strong>{{ records.formulations }}</strong>
                <span class="summary-detail">nested recipes supported</span>
              </article>
              <article class="summary-card">
                <span class="summary-label">Products</span>
                <strong>{{ records.products }}</strong>
                <span class="summary-detail">linked to a formulation</span>
              </article>
            </div>

            <div class="overview-grid">
              <section class="panel journey-panel">
                <div class="panel-heading">
                  <div>
                    <p class="eyebrow">
                      A CLEAR STARTING POINT
                    </p>
                    <h2>Build your product foundation</h2>
                  </div>
                  <span class="step-count">01 — 03</span>
                </div>
                <ol class="journey-list">
                  <li>
                    <span class="journey-number">01</span>
                    <div>
                      <strong>Record an ingredient</strong>
                      <p>Add the supplier and specification details you have.</p>
                    </div>
                    <AppButton
                      variant="link"
                      size="sm"
                      type="button"
                      @click="activeSection = 'ingredients'"
                    >
                      Open <span aria-hidden="true">→</span>
                    </AppButton>
                  </li>
                  <li>
                    <span class="journey-number">02</span>
                    <div>
                      <strong>Build a formulation</strong>
                      <p>Enter ingredient amounts and see the expanded 100 g basis.</p>
                    </div>
                    <AppButton
                      variant="link"
                      size="sm"
                      type="button"
                      @click="activeSection = 'formulations'"
                    >
                      Open <span aria-hidden="true">→</span>
                    </AppButton>
                  </li>
                  <li>
                    <span class="journey-number">03</span>
                    <div>
                      <strong>Create a product draft</strong>
                      <p>Link a product name and food state to a formulation.</p>
                    </div>
                    <AppButton
                      variant="link"
                      size="sm"
                      type="button"
                      @click="activeSection = 'products'"
                    >
                      Open <span aria-hidden="true">→</span>
                    </AppButton>
                  </li>
                </ol>
              </section>
              <aside class="review-card">
                <span
                  class="review-icon"
                  aria-hidden="true"
                >!</span>
                <p class="eyebrow">
                  IMPORTANT
                </p>
                <h2>Drafts are not a compliance result.</h2>
                <p>
                  This workspace records your inputs. Regulatory checks are not performed; the label
                  tool is an illustrative layout export only.
                </p>
                <span class="review-status"><span aria-hidden="true" /> No regulatory release installed</span>
              </aside>
            </div>
            <section
              v-if="records.ingredients + records.formulations + records.products === 0"
              class="panel demo-panel"
              aria-labelledby="demo-data-title"
            >
              <div>
                <p class="eyebrow">
                  OPTIONAL · LOCAL ONLY
                </p>
                <h2 id="demo-data-title">
                  Explore with illustrative sample data
                </h2>
                <p>
                  Adds two fictional ingredients, one formulation and one product draft. It adds no
                  supplier, nutrient, allergen or regulatory evidence and is not a compliance fixture.
                </p>
              </div>
              <AppButton
                type="button"
                @click="loadIllustrativeDemo"
              >
                Load illustrative demo data
              </AppButton>
            </section>
            <p class="privacy-footnote">
              Your formulation data is stored locally in this browser. Back up important work using
              your browser profile and workspace backup tools when available.
            </p>
          </section>

          <section
            v-else-if="activeSection === 'ingredients'"
            class="page"
          >
            <div class="page-heading compact">
              <div>
                <p class="eyebrow">
                  INGREDIENT LIBRARY
                </p>
                <h1>Ingredients & specifications</h1>
                <p class="lede">
                  Keep supplier evidence with each ingredient. Missing values stay missing; they are
                  never treated as zero.
                </p>
              </div>
              <span class="record-count">{{ records.ingredients }} saved</span>
            </div>

            <div class="content-grid">
              <form
                class="panel editor-panel"
                @submit.prevent="saveIngredient"
              >
                <div class="panel-heading">
                  <div>
                    <p class="eyebrow">
                      NEW DRAFT
                    </p>
                    <h2>Ingredient record</h2>
                  </div>
                  <span class="draft-pill">Draft</span>
                </div>
                <div class="form-grid">
                  <label class="field full">
                    <span>Ingredient name <b aria-hidden="true">*</b></span>
                    <input
                      v-model="ingredientForm.name"
                      required
                      maxlength="120"
                      autocomplete="off"
                      placeholder="e.g. Rolled oats"
                    >
                  </label>
                  <label class="field">
                    <span>Ingredient type</span>
                    <select
                      v-model="ingredientForm.kind"
                      required
                    >
                      <option
                        value=""
                        disabled
                      >Select ingredient type</option>
                      <option value="atomic">Single ingredient</option>
                      <option value="compound">Compound ingredient</option>
                    </select>
                  </label>
                  <label
                    v-if="ingredientForm.kind === 'compound'"
                    class="field"
                  >
                    <span>Composition formulation <b aria-hidden="true">*</b></span>
                    <select
                      v-model="ingredientForm.compoundFormulationId"
                      required
                    >
                      <option
                        value=""
                        disabled
                      >Select a formulation</option>
                      <option
                        v-for="item in formulations"
                        :key="item.id"
                        :value="item.id"
                      >
                        {{ item.name }}
                      </option>
                    </select>
                  </label>
                  <label class="field">
                    <span>Supplier name</span>
                    <input
                      v-model="ingredientForm.supplierName"
                      maxlength="120"
                      autocomplete="organization"
                      placeholder="Supplier or manufacturer"
                    >
                  </label>
                  <label class="field">
                    <span>Supplier product code</span>
                    <input
                      v-model="ingredientForm.supplierProductCode"
                      maxlength="80"
                      autocomplete="off"
                      placeholder="Optional"
                    >
                  </label>
                </div>

                <fieldset class="field-group">
                  <legend>Supplier specification</legend>
                  <p class="field-hint">
                    Reference and issue date make supplier evidence traceable.
                  </p>
                  <div class="form-grid">
                    <label class="field">
                      <span>Specification reference</span>
                      <input
                        v-model="ingredientForm.specificationReference"
                        maxlength="120"
                        autocomplete="off"
                        placeholder="Document number or version"
                      >
                    </label>
                    <label class="field">
                      <span>Specification date</span>
                      <input
                        v-model="ingredientForm.specificationDate"
                        type="date"
                      >
                    </label>
                  </div>
                </fieldset>

                <fieldset class="field-group">
                  <legend>Additive source records</legend>
                  <p class="field-hint">
                    Capture what the source documents say. Declaration selections produce review-only
                    wording candidates; they do not establish an approved class, identity, permission,
                    or final declaration.
                  </p>
                  <fieldset
                    v-for="(source, index) in ingredientForm.additiveSources"
                    :key="source.id"
                    class="field-group additive-source-field"
                  >
                    <legend>Additive source {{ index + 1 }}</legend>
                    <div class="form-grid">
                      <label class="field">
                        <span>Additive identity <b aria-hidden="true">*</b></span>
                        <input
                          v-model="source.additiveName"
                          required
                          maxlength="120"
                          autocomplete="off"
                          placeholder="Name from the source record"
                        >
                      </label>
                      <label class="field">
                        <span>Code number (source)</span>
                        <input
                          v-model="source.codeNumber"
                          maxlength="40"
                          autocomplete="off"
                          placeholder="If recorded by the supplier"
                        >
                        <small class="field-hint">Stored as source data only; not checked for Australian declaration.</small>
                      </label>
                      <label class="field full">
                        <span>Technological purpose(s)</span>
                        <textarea
                          v-model="source.technologicalPurposes"
                          rows="2"
                          maxlength="500"
                          placeholder="One source-described purpose per line"
                        />
                        <small class="field-hint">Use the source wording; this is not checked against the Code.</small>
                      </label>
                      <label class="field">
                        <span>Source status</span>
                        <select v-model="source.sourceStatus">
                          <option value="unknown">Unknown / not assessed</option>
                          <option value="added">Added to this ingredient</option>
                          <option value="carriedOver">Carried over</option>
                          <option value="processingAid">Processing aid</option>
                        </select>
                      </label>
                      <label class="field">
                        <span>Declaration route</span>
                        <select v-model="source.declarationRoute">
                          <option value="unknown">Not selected / needs review</option>
                          <option value="schedule7Class">Schedule 7 class + Schedule 8 identifier</option>
                          <option value="noSchedule7Class">No Schedule 7 class; Schedule 8 name</option>
                          <option value="enzyme">Enzyme</option>
                          <option value="flavouring">Flavouring</option>
                          <option value="specifiedFlavouringSubstance">Specified flavouring substance</option>
                          <option value="addedCaffeine">Added caffeine</option>
                        </select>
                      </label>
                      <label
                        v-if="source.declarationRoute === 'schedule7Class'"
                        class="field"
                      >
                        <span>Proposed Schedule 7 class name</span>
                        <input
                          v-model="source.schedule7ClassName"
                          maxlength="120"
                          autocomplete="off"
                          placeholder="Enter from Schedule 7; mapping remains unverified"
                        >
                      </label>
                      <label
                        v-if="source.declarationRoute === 'schedule7Class'"
                        class="field"
                      >
                        <span>Proposed Schedule 8 identifier</span>
                        <select v-model="source.substanceChoice">
                          <option value="">Not selected</option>
                          <option value="schedule8Name">Schedule 8 name</option>
                          <option value="schedule8CodeNumber">Schedule 8 code number</option>
                        </select>
                      </label>
                      <label
                        v-if="source.declarationRoute === 'flavouring'"
                        class="field"
                      >
                        <span>Flavouring wording</span>
                        <select v-model="source.flavouringWording">
                          <option value="">Not selected</option>
                          <option value="flavouring">flavouring</option>
                          <option value="flavour">flavour</option>
                          <option value="specificName">Specific name or description</option>
                        </select>
                      </label>
                      <label class="field">
                        <span>Concentration</span>
                        <input
                          v-model="source.concentrationValue"
                          inputmode="decimal"
                          autocomplete="off"
                          placeholder="Not supplied"
                        >
                      </label>
                      <label class="field">
                        <span>Concentration unit</span>
                        <select v-model="source.concentrationUnit">
                          <option value="">Not supplied</option>
                          <option value="mgPerKg">mg/kg</option>
                          <option value="gPerKg">g/kg</option>
                          <option value="mgPerL">mg/L</option>
                          <option value="gPerL">g/L</option>
                          <option value="mgPer100g">mg/100 g</option>
                          <option value="gPer100g">g/100 g</option>
                          <option value="mgPer100mL">mg/100 mL</option>
                          <option value="gPer100mL">g/100 mL</option>
                          <option value="percentByMass">% by mass</option>
                          <option value="percentByVolume">% by volume</option>
                        </select>
                      </label>
                      <label class="field">
                        <span>Concentration basis</span>
                        <select v-model="source.concentrationBasis">
                          <option value="unknown">Unknown / not supplied</option>
                          <option value="asSupplied">As supplied</option>
                          <option value="dryMatter">Dry matter</option>
                          <option value="asAdded">As added</option>
                          <option value="asPrepared">As prepared</option>
                          <option value="asReconstituted">As reconstituted</option>
                          <option value="asDrained">As drained</option>
                        </select>
                      </label>
                      <label class="field">
                        <span>Evidence reference</span>
                        <input
                          v-model="source.sourceReference"
                          maxlength="160"
                          autocomplete="off"
                          placeholder="Document and section"
                        >
                      </label>
                      <label class="field">
                        <span>Evidence date</span>
                        <input
                          v-model="source.sourceDate"
                          type="date"
                        >
                      </label>
                      <label class="field">
                        <span>Evidence type</span>
                        <select v-model="source.sourceKind">
                          <option value="supplierSpecification">Supplier specification</option>
                          <option value="certificateOfAnalysis">Certificate of analysis</option>
                          <option value="formulationRecord">Formulation record</option>
                          <option value="productPackaging">Product packaging</option>
                          <option value="processRecord">Process record</option>
                          <option value="other">Other</option>
                        </select>
                      </label>
                      <label class="field full">
                        <span>Allergen identifiers recorded as present</span>
                        <input
                          v-model="source.allergenIdsPresent"
                          maxlength="300"
                          autocomplete="off"
                          placeholder="e.g. milk, soy"
                        >
                        <small class="field-hint">
                          Use vocabulary IDs and the evidence reference above. Blank means not recorded,
                          not absent. These are traced as additive sources, not evaluated for an exemption.
                        </small>
                      </label>
                    </div>
                    <AppButton
                      variant="outline"
                      size="sm"
                      type="button"
                      :aria-label="`Remove additive source ${index + 1}`"
                      @click="ingredientForm.additiveSources.splice(index, 1)"
                    >
                      Remove additive source
                    </AppButton>
                  </fieldset>
                  <AppButton
                    variant="outline"
                    size="sm"
                    type="button"
                    @click="ingredientForm.additiveSources.push(createAdditiveSourceDraft())"
                  >
                    Add additive source
                  </AppButton>
                </fieldset>

                <fieldset class="field-group">
                  <legend>Nutrient values, per 100 g</legend>
                  <p class="field-hint">
                    Only enter values shown on the source. Blank means not supplied, not zero.
                  </p>
                  <div class="nutrient-grid">
                    <label
                      v-for="nutrient in [
                        { key: 'protein', label: 'Protein', unit: 'g' },
                        { key: 'fat', label: 'Fat, total', unit: 'g' },
                        { key: 'saturatedFat', label: 'Saturated fat', unit: 'g' },
                        { key: 'carbohydrate', label: 'Carbohydrate', unit: 'g' },
                        { key: 'sugars', label: 'Sugars', unit: 'g' },
                        { key: 'sodium', label: 'Sodium', unit: 'mg' },
                      ]"
                      :key="nutrient.key"
                      class="field"
                    >
                      <span>{{ nutrient.label }} <small>{{ nutrient.unit }}/100 g</small></span>
                      <input
                        v-model="ingredientForm[nutrient.key as keyof typeof ingredientForm]"
                        inputmode="decimal"
                        autocomplete="off"
                        placeholder="Not supplied"
                      >
                    </label>
                  </div>
                </fieldset>

                <label class="field">
                  <span>Allergens identified by supplier</span>
                  <input
                    v-model="ingredientForm.knownAllergens"
                    maxlength="300"
                    autocomplete="off"
                    placeholder="e.g. wheat, milk (comma separated)"
                  >
                  <small class="field-hint">Only records allergens you enter as present. Leaving this blank does not mean
                    “absent”.</small>
                </label>
                <div class="form-actions">
                  <span class="required-hint"><b aria-hidden="true">*</b> Required</span>
                  <AppButton type="submit">
                    Save ingredient draft <span aria-hidden="true">→</span>
                  </AppButton>
                </div>
              </form>

              <section
                class="panel records-panel"
                aria-labelledby="ingredient-records-title"
              >
                <div class="panel-heading">
                  <div>
                    <p class="eyebrow">
                      SAVED LOCALLY
                    </p>
                    <h2 id="ingredient-records-title">
                      Ingredients
                    </h2>
                  </div>
                  <span class="count-badge">{{ ingredients.length }}</span>
                </div>
                <div
                  v-if="ingredients.length === 0"
                  class="empty-state"
                >
                  <span
                    class="empty-mark"
                    aria-hidden="true"
                  >01</span>
                  <h3>No ingredients yet</h3>
                  <p>
                    Start with a supplier ingredient or specification. You can save incomplete
                    drafts and fill in missing evidence later.
                  </p>
                </div>
                <ul
                  v-else
                  class="record-list"
                >
                  <li
                    v-for="record in ingredients"
                    :key="record.id"
                    class="record-item"
                  >
                    <span
                      class="record-avatar"
                      aria-hidden="true"
                    >{{
                      record.name.slice(0, 1).toUpperCase()
                    }}</span>
                    <div class="record-main">
                      <strong>{{ record.name }}</strong>
                      <span>{{
                        record.kind === 'compound' ? 'Compound ingredient' : 'Single ingredient'
                      }}<template v-if="record.supplierName">
                        · {{ record.supplierName }}</template></span>
                      <small v-if="record.specification">Spec {{ record.specification.reference }} ·
                        {{ record.specification.sourceDate }}</small>
                      <small v-else>Specification not supplied</small>
                      <small v-if="record.nutrientProfile">Nutrient values recorded</small>
                      <small v-else>Nutrient values not supplied</small>
                      <small v-if="record.allergenEvidence">Supplier allergen evidence recorded</small>
                      <small v-else>Allergen evidence not supplied</small>
                      <details v-if="record.additiveSources?.length">
                        <summary>
                          {{ record.additiveSources.length }} additive source
                          {{ record.additiveSources.length === 1 ? 'record' : 'records' }}
                        </summary>
                        <ul>
                          <li
                            v-for="source in record.additiveSources"
                            :key="source.id"
                          >
                            {{ source.additiveName }} · {{ additiveSourceStatusLabel(source.sourceStatus) }}
                            <small>
                              Declaration candidate:
                              {{
                                additiveDeclarationCandidate(source, record.id, [
                                  record.id,
                                  'additive-source',
                                  source.id,
                                ]).text ?? 'not available'
                              }}
                              · REVIEW REQUIRED
                            </small>
                            <small>
                              Review reason:
                              {{
                                additiveDeclarationCandidate(source, record.id, [
                                  record.id,
                                  'additive-source',
                                  source.id,
                                ]).explanation
                              }}
                            </small>
                            <small v-if="source.allergenAssessments">
                              Additive allergen evidence recorded:
                              {{ Object.keys(source.allergenAssessments).join(', ') }}
                            </small>
                          </li>
                        </ul>
                      </details>
                      <small v-else>Additive source records not supplied</small>
                    </div>
                    <AppButton
                      variant="destructive"
                      size="sm"
                      type="button"
                      :aria-label="`Delete draft ${record.name}`"
                      @click="deleteRecord(record)"
                    >
                      Delete
                    </AppButton>
                  </li>
                </ul>
              </section>
            </div>
          </section>

          <section
            v-else-if="activeSection === 'formulations'"
            class="page"
          >
            <div class="page-heading compact">
              <div>
                <p class="eyebrow">
                  RECIPE BUILDER
                </p>
                <h1>Formulations</h1>
                <p class="lede">
                  Create weighted, nested drafts. Expand a saved formulation to inspect ingredient
                  paths on a 100 g basis.
                </p>
              </div>
              <span class="record-count">{{ records.formulations }} saved</span>
            </div>

            <div class="content-grid">
              <form
                class="panel editor-panel"
                @submit.prevent="saveFormulation"
              >
                <div class="panel-heading">
                  <div>
                    <p class="eyebrow">
                      NEW DRAFT
                    </p>
                    <h2>Formulation record</h2>
                  </div>
                  <span class="draft-pill">Draft</span>
                </div>
                <label class="field">
                  <span>Formulation name <b aria-hidden="true">*</b></span>
                  <input
                    v-model="formulationForm.name"
                    required
                    maxlength="120"
                    autocomplete="off"
                    placeholder="e.g. Breakfast base"
                  >
                </label>
                <div class="field-group">
                  <div class="line-heading">
                    <div>
                      <h3>Ingoing lines</h3>
                      <p class="field-hint">
                        Use the quantities from the recipe before processing.
                      </p>
                    </div>
                    <AppButton
                      variant="outline"
                      size="sm"
                      type="button"
                      @click="addFormulationLine"
                    >
                      Add line <span aria-hidden="true">+</span>
                    </AppButton>
                  </div>
                  <div
                    v-if="formulationForm.lines.length === 0"
                    class="inline-empty"
                  >
                    Add a line to start. A formulation needs at least one ingredient or nested
                    formulation.
                  </div>
                  <div
                    v-for="(line, index) in formulationForm.lines"
                    :key="index"
                    class="line-row"
                  >
                    <label class="field line-type">
                      <span class="visually-hidden">Line {{ index + 1 }} type</span>
                      <select
                        v-model="line.kind"
                        :aria-label="`Line ${index + 1} type`"
                        @change="onLineKindChange(line)"
                      >
                        <option value="ingredient">Ingredient</option>
                        <option value="formulation">Formulation</option>
                      </select>
                    </label>
                    <label class="field line-record">
                      <span class="visually-hidden">Line {{ index + 1 }} record</span>
                      <select
                        v-model="line.targetId"
                        :aria-label="`Line ${index + 1} record`"
                        required
                      >
                        <option
                          value=""
                          disabled
                        >Select record</option>
                        <option
                          v-for="option in lineOptions(line.kind)"
                          :key="option.id"
                          :value="option.id"
                        >
                          {{ option.name }}
                        </option>
                      </select>
                    </label>
                    <label class="field line-quantity">
                      <span class="visually-hidden">Line {{ index + 1 }} quantity</span>
                      <input
                        v-model="line.quantity"
                        :aria-label="`Line ${index + 1} quantity`"
                        inputmode="decimal"
                        required
                        placeholder="Amount"
                      >
                    </label>
                    <label class="field line-unit">
                      <span class="visually-hidden">Line {{ index + 1 }} unit</span>
                      <select
                        v-model="line.unit"
                        :aria-label="`Line ${index + 1} unit`"
                      >
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="mg">mg</option>
                      </select>
                    </label>
                    <button
                      class="remove-line"
                      type="button"
                      :aria-label="`Remove line ${index + 1}`"
                      @click="formulationForm.lines.splice(index, 1)"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div class="info-callout">
                  <span aria-hidden="true">i</span>
                  <p>
                    Saved formulations are drafts. No yield or processing loss is assumed. Circular
                    formulation references are rejected.
                  </p>
                </div>
                <div class="form-actions">
                  <span class="required-hint"><b aria-hidden="true">*</b> Required</span>
                  <AppButton type="submit">
                    Save formulation draft <span aria-hidden="true">→</span>
                  </AppButton>
                </div>
              </form>

              <section
                class="panel records-panel"
                aria-labelledby="formulation-records-title"
              >
                <div class="panel-heading">
                  <div>
                    <p class="eyebrow">
                      SAVED LOCALLY
                    </p>
                    <h2 id="formulation-records-title">
                      Formulations
                    </h2>
                  </div>
                  <span class="count-badge">{{ formulations.length }}</span>
                </div>
                <div
                  v-if="formulations.length === 0"
                  class="empty-state"
                >
                  <span
                    class="empty-mark"
                    aria-hidden="true"
                  >02</span>
                  <h3>No formulations yet</h3>
                  <p>Save ingredients first, then combine them into a formulation.</p>
                  <AppButton
                    variant="link"
                    size="sm"
                    type="button"
                    @click="activeSection = 'ingredients'"
                  >
                    Go to ingredients <span aria-hidden="true">→</span>
                  </AppButton>
                </div>
                <ul
                  v-else
                  class="record-list"
                >
                  <li
                    v-for="record in formulations"
                    :key="record.id"
                    class="record-item formulation-item"
                  >
                    <span
                      class="record-avatar recipe-avatar"
                      aria-hidden="true"
                    >F</span>
                    <div class="record-main">
                      <strong>{{ record.name }}</strong>
                      <span>{{ record.lines.length }} ingoing
                        {{ record.lines.length === 1 ? 'line' : 'lines' }}</span>
                      <small>{{
                        record.lines
                          .map((line) => line.quantity.value + ' ' + line.quantity.unit)
                          .join(' · ')
                      }}</small>
                    </div>
                    <AppButton
                      variant="outline"
                      size="sm"
                      type="button"
                      @click="calculateFormulation(record)"
                    >
                      Expand
                    </AppButton>
                    <AppButton
                      variant="destructive"
                      size="sm"
                      type="button"
                      :aria-label="`Delete draft ${record.name}`"
                      @click="deleteRecord(record)"
                    >
                      Delete
                    </AppButton>
                  </li>
                </ul>
                <div
                  v-if="expansionError"
                  class="notice notice-error inline-notice"
                  role="alert"
                >
                  {{ expansionError }}
                </div>
                <section
                  v-if="expansion"
                  class="expansion-result"
                  aria-live="polite"
                  aria-labelledby="expansion-title"
                >
                  <div class="result-title">
                    <div>
                      <p class="eyebrow">
                        ENGINE EXPANSION
                      </p>
                      <h3 id="expansion-title">
                        100 g requested basis
                      </h3>
                    </div>
                    <span class="result-tag">Calculation only</span>
                  </div>
                  <p class="field-hint">
                    Expanded ingoing amounts total {{ expansion.totalMass }} g. This does not
                    account for processing or yield.
                  </p>
                  <ul class="expansion-list">
                    <li
                      v-for="(row, index) in expansion.rows"
                      :key="`${row.path}-${index}`"
                    >
                      <span>{{ row.name }}</span><strong>{{ row.mass }} g</strong><small>{{ row.path }}</small>
                    </li>
                  </ul>
                  <h4>Recorded additive sources along ingredient paths</h4>
                  <p class="field-hint">
                    These are captured source records only. No additive permission, limit, carry-over
                    exemption, or declaration is evaluated here.
                  </p>
                  <ul
                    v-if="expansion.additiveSources.length > 0"
                    class="expansion-list"
                  >
                    <li
                      v-for="(item, index) in expansion.additiveSources"
                      :key="`${item.source.id}-${item.path}-${index}`"
                    >
                      <span>
                        <strong>{{ item.source.additiveName }}</strong>
                        <small>Ingredient path: {{ item.path }}</small>
                        <small>Source status: {{ additiveSourceStatusLabel(item.source.sourceStatus) }}</small>
                        <small v-if="item.source.technologicalPurposes?.length">
                          Purpose(s): {{ item.source.technologicalPurposes.join(', ') }}
                        </small>
                        <small v-else>Purpose not supplied</small>
                        <small v-if="item.source.concentration">
                          Concentration: {{ item.source.concentration.value }}
                          {{ additiveConcentrationUnitLabel(item.source.concentration.unit) }}
                          · {{ additiveConcentrationBasisLabel(item.source.concentration.basis) }}
                        </small>
                        <small v-else>Concentration not supplied</small>
                        <small v-if="item.source.sourceEvidence?.length">
                          Evidence:
                          {{ item.source.sourceEvidence.map((evidence) =>
                            `${evidence.reference} · ${evidence.sourceDate}`).join('; ') }}
                        </small>
                        <small v-else>Source evidence not supplied</small>
                        <small>
                          Declaration candidate:
                          {{
                            additiveDeclarationCandidate(
                              item.source,
                              item.ingredientId,
                              item.sourcePath,
                            ).text ?? 'not available'
                          }}
                          · REVIEW REQUIRED
                        </small>
                        <small>
                          Review reason:
                          {{
                            additiveDeclarationCandidate(
                              item.source,
                              item.ingredientId,
                              item.sourcePath,
                            ).explanation
                          }}
                        </small>
                      </span>
                    </li>
                  </ul>
                  <p
                    v-else
                    class="field-hint"
                  >
                    No additive source records were supplied for these ingredients.
                  </p>
                  <h4>Allergen evidence inherited from additive sources</h4>
                  <ul
                    v-if="expansion.additiveAllergenEvidence.length > 0"
                    class="expansion-list"
                  >
                    <li
                      v-for="evidence in expansion.additiveAllergenEvidence"
                      :key="evidence.id"
                    >
                      <span>
                        <strong>{{ Object.keys(evidence.assessments).join(', ') }}</strong>
                        <small>Evidence path: {{ evidence.path }}</small>
                        <small>Source: {{ evidence.sourceId }} · {{ evidence.sourceDate }}</small>
                      </span>
                    </li>
                  </ul>
                  <p
                    v-else
                    class="field-hint"
                  >
                    No additive allergen evidence was recorded for these ingredient sources.
                  </p>
                </section>
              </section>
            </div>
          </section>

          <section
            v-else-if="activeSection === 'review'"
            class="page"
          >
            <ReviewTracePanel
              :products="products"
              :formulations="formulations"
              :ingredients="ingredients"
              :versions="productVersions"
            />
          </section>

          <section
            v-else-if="activeSection === 'backup' && store"
            class="page"
          >
            <BackupPanel
              :store="store"
              @restored="refreshRecords"
            />
          </section>

          <section
            v-else-if="activeSection === 'labels'"
            class="page"
          >
            <LabelExportPanel
              :products="products"
              :formulations="formulations"
              :ingredients="ingredients"
            />
          </section>

          <section
            v-else-if="activeSection === 'products'"
            class="page"
          >
            <div class="page-heading compact">
              <div>
                <p class="eyebrow">
                  PRODUCT WORKSPACE
                </p>
                <h1>Products</h1>
                <p class="lede">
                  Connect a product draft to a formulation and record sourced facts for review-only class screening.
                </p>
              </div>
              <span class="record-count">{{ records.products }} saved</span>
            </div>

            <div class="content-grid">
              <form
                class="panel editor-panel"
                @submit.prevent="saveProduct"
              >
                <div class="panel-heading">
                  <div>
                    <p class="eyebrow">
                      NEW DRAFT
                    </p>
                    <h2>Product record</h2>
                  </div>
                  <span class="draft-pill">Draft</span>
                </div>
                <div class="form-grid">
                  <label class="field full">
                    <span>Proposed product name <b aria-hidden="true">*</b></span>
                    <input
                      v-model="productForm.name"
                      required
                      maxlength="120"
                      autocomplete="off"
                      placeholder="Working name"
                    >
                  </label>
                  <label class="field full">
                    <span>Linked formulation <b aria-hidden="true">*</b></span>
                    <select
                      v-model="productForm.formulationId"
                      required
                    >
                      <option
                        value=""
                        disabled
                      >Select a formulation</option>
                      <option
                        v-for="item in formulations"
                        :key="item.id"
                        :value="item.id"
                      >
                        {{ item.name }}
                      </option>
                    </select>
                  </label>
                  <label class="field full">
                    <span>Food state</span>
                    <select v-model="productForm.foodState">
                      <option
                        value=""
                        disabled
                      >Select food state</option>
                      <option value="asSold">As sold</option>
                      <option value="asAdded">As added</option>
                      <option value="asProcessed">As processed</option>
                      <option value="asPrepared">As prepared</option>
                      <option value="asReconstituted">As reconstituted</option>
                      <option value="asDrained">As drained</option>
                    </select>
                  </label>
                </div>
                <details class="classification-details">
                  <summary>Classification facts and evidence · review only</summary>
                  <p class="field-hint">
                    These questions produce candidate prompts only. Answer from product records and attach dated
                    references. The product name does not assign a class; uncertain or conflicting facts stay
                    REVIEW REQUIRED.
                  </p>
                  <div class="classification-context">
                    <label class="field">
                      <span>Intended use and product purpose</span>
                      <textarea
                        :value="classificationProfile.intendedUseDescription"
                        rows="2"
                        @input="updateClassificationDescription('intendedUseDescription', $event)"
                      />
                    </label>
                    <label class="field">
                      <span>Intended consumer or age range</span>
                      <textarea
                        :value="classificationProfile.intendedConsumerDescription"
                        rows="2"
                        @input="updateClassificationDescription('intendedConsumerDescription', $event)"
                      />
                    </label>
                    <label class="field">
                      <span>Processing and preparation</span>
                      <textarea
                        :value="classificationProfile.processingDescription"
                        rows="2"
                        @input="updateClassificationDescription('processingDescription', $event)"
                      />
                    </label>
                    <label class="field">
                      <span>Product presentation</span>
                      <textarea
                        :value="classificationProfile.presentationDescription"
                        rows="2"
                        @input="updateClassificationDescription('presentationDescription', $event)"
                      />
                    </label>
                  </div>
                  <ClassificationEvidenceList
                    label="Product identity"
                    description="Attach dated references relevant to the proposed name and product identity."
                    :model-value="classificationProfile.identityEvidence"
                    @update:model-value="updateIdentityEvidence"
                  />
                  <fieldset class="classification-question-group">
                    <legend>Formulated caffeinated beverage candidate</legend>
                    <p class="field-hint">
                      Screens facts referenced by Standard 2.6.4 and Schedule 15 item 14.1.3. A candidate is not a
                      confirmed food category.
                    </p>
                    <div class="classification-fact-grid">
                      <ClassificationFactField
                        v-for="fact in caffeinatedBeverageFacts"
                        :key="fact.key"
                        :label="fact.label"
                        :description="fact.description"
                        :model-value="classificationProfile.formulatedCaffeinatedBeverage[fact.key]"
                        @update:model-value="updateCaffeinatedBeverageFact(fact.key, $event)"
                      />
                    </div>
                  </fieldset>
                  <fieldset class="classification-question-group">
                    <legend>Food for infants candidate</legend>
                    <p class="field-hint">
                      Screens the Standard 2.9.2 definition and listed exclusions against supplied evidence. It does
                      not decide the product's classification.
                    </p>
                    <div class="classification-fact-grid">
                      <ClassificationFactField
                        v-for="fact in infantFoodFacts"
                        :key="fact.key"
                        :label="fact.label"
                        :description="fact.description"
                        :model-value="classificationProfile.foodForInfants[fact.key]"
                        @update:model-value="updateInfantFoodFact(fact.key, $event)"
                      />
                    </div>
                  </fieldset>
                </details>
                <div class="info-callout">
                  <span aria-hidden="true">i</span>
                  <p>
                    Candidate screening does not determine legal classification. Prescribed-name rules are not
                    activated; additives and claims are not evaluated. This record is a draft, not a compliance
                    assessment.
                  </p>
                </div>
                <div class="form-actions">
                  <span class="required-hint"><b aria-hidden="true">*</b> Required</span>
                  <AppButton type="submit">
                    Save product draft <span aria-hidden="true">→</span>
                  </AppButton>
                </div>
              </form>

              <section
                class="panel records-panel"
                aria-labelledby="product-records-title"
              >
                <div class="panel-heading">
                  <div>
                    <p class="eyebrow">
                      SAVED LOCALLY
                    </p>
                    <h2 id="product-records-title">
                      Products
                    </h2>
                  </div>
                  <span class="count-badge">{{ products.length }}</span>
                </div>
                <div
                  v-if="products.length === 0"
                  class="empty-state"
                >
                  <span
                    class="empty-mark"
                    aria-hidden="true"
                  >03</span>
                  <h3>No products yet</h3>
                  <p>
                    Products need a linked formulation. Add ingredients and a formulation before
                    creating one.
                  </p>
                  <AppButton
                    variant="link"
                    size="sm"
                    type="button"
                    @click="activeSection = formulations.length ? 'formulations' : 'ingredients'"
                  >
                    {{ formulations.length ? 'Go to formulations' : 'Go to ingredients' }}
                    <span aria-hidden="true">→</span>
                  </AppButton>
                </div>
                <ul
                  v-else
                  class="record-list"
                >
                  <li
                    v-for="record in products"
                    :key="record.id"
                    class="record-item"
                  >
                    <span
                      class="record-avatar product-avatar"
                      aria-hidden="true"
                    >P</span>
                    <div class="record-main">
                      <strong>{{ record.name }}</strong>
                      <span>{{
                        formulations.find((item) => item.id === record.formulationId)?.name ??
                          'Linked formulation unavailable'
                      }}</span>
                      <small>{{ record.foodState ?? 'Food state not supplied' }}</small>
                      <details class="saved-classification">
                        <summary>Class and name screening · REVIEW REQUIRED</summary>
                        <div
                          v-for="result in productClassificationResults(record)"
                          :key="result.rule.id"
                          class="saved-classification-result"
                        >
                          <strong>{{ result.title }}</strong>
                          <p>{{ screeningOutcomeLabel(result.value?.screeningOutcome) }}</p>
                          <small>{{ result.explanation }}</small>
                        </div>
                        <div class="saved-classification-result">
                          <strong>{{ productNameScreening(record).title }}</strong>
                          <p>No approved prescribed-name candidate rules; human review required.</p>
                          <small>{{ productNameScreening(record).explanation }}</small>
                        </div>
                      </details>
                    </div>
                    <AppButton
                      variant="destructive"
                      size="sm"
                      type="button"
                      :aria-label="`Delete draft ${record.name}`"
                      @click="deleteRecord(record)"
                    >
                      Delete
                    </AppButton>
                  </li>
                </ul>
              </section>
            </div>
          </section>
        </template>
      </main>
    </div>

    <footer class="footer">
      <span>Fieldnote · Local-first workspace</span>
      <span>This tool assists review; it does not certify legal compliance.</span>
    </footer>
  </div>
</template>

<style>
:root {
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  color: #23332d;
  background: #f5f7f3;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  --ink: #23332d;
  --muted: #58675e;
  --line: #e2e8e1;
  --green: #2e644f;
  --green-dark: #234f3d;
  --green-soft: #eaf3ec;
  --surface: #fff;
}

* {
  box-sizing: border-box;
}
body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}
button,
input,
select {
  font: inherit;
}
button {
  cursor: pointer;
}
button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 3px solid #e3a34f;
  outline-offset: 2px;
}

.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.skip-link {
  position: absolute;
  z-index: 5;
  top: 8px;
  left: 8px;
  padding: 9px 12px;
  transform: translateY(-160%);
  border-radius: 6px;
  color: white;
  background: var(--green-dark);
}
.skip-link:focus {
  transform: translateY(0);
}
.topbar {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 42px;
  background: #fff;
  border-bottom: 1px solid var(--line);
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--ink);
  text-decoration: none;
}
.brand-mark {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: var(--green);
  color: #fff;
  font-family: Georgia, serif;
  font-size: 23px;
  font-weight: 700;
}
.brand strong {
  display: block;
  font-size: 15px;
  letter-spacing: -0.02em;
}
.brand small {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 11px;
}
.local-badge {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  color: #4d6559;
  font-size: 12px;
  font-weight: 600;
}
.local-badge span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #69a27e;
  box-shadow: 0 0 0 3px #e8f3eb;
}
.workspace {
  flex: 1;
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
}
.sidebar {
  display: flex;
  flex-direction: column;
  padding: 31px 18px 22px 26px;
  border-right: 1px solid var(--line);
  background: #fbfcfa;
}
.nav-caption,
.eyebrow {
  margin: 0;
  color: #58665d;
  font-size: 10px;
  line-height: 1.4;
  font-weight: 750;
  letter-spacing: 0.12em;
}
.nav-caption {
  padding-left: 12px;
  margin-bottom: 12px;
}
.sidebar nav {
  display: grid;
  gap: 5px;
}
.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 42px;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  color: #68766e;
  background: transparent;
  text-align: left;
  font-size: 13px;
}
.nav-link:hover {
  color: var(--ink);
  background: #f1f5f0;
}
.nav-link.active {
  color: var(--green-dark);
  background: #e9f2eb;
  font-weight: 700;
}
.nav-indicator {
  width: 7px;
  height: 7px;
  border: 1px solid #9aa79e;
  border-radius: 2px;
}
.nav-link.active .nav-indicator {
  border-color: var(--green);
  background: var(--green);
}
.sidebar-note {
  display: flex;
  gap: 10px;
  margin: auto 5px 0 0;
  padding: 14px 12px;
  border-top: 1px solid var(--line);
  color: var(--muted);
}
.sidebar-note p {
  margin: 0;
  font-size: 11px;
  line-height: 1.55;
}
.note-icon,
.info-callout > span {
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  border: 1px solid #8eaa96;
  border-radius: 50%;
  color: var(--green);
  font-size: 11px;
  font-weight: 700;
}
.main-content {
  min-width: 0;
  padding: 42px clamp(24px, 5vw, 72px) 50px;
}
.page {
  max-width: 1100px;
  margin: 0 auto;
}
.page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin: 0 0 32px;
}
.page-heading h1 {
  max-width: 720px;
  margin: 9px 0 11px;
  color: #23362e;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(29px, 3vw, 42px);
  line-height: 1.12;
  font-weight: 500;
  letter-spacing: -0.035em;
}
.page-heading.compact {
  align-items: center;
  margin-bottom: 27px;
}
.page-heading.compact h1 {
  font-size: clamp(28px, 2.8vw, 36px);
}
.lede {
  max-width: 650px;
  margin: 0;
  color: #58665d;
  font-size: 14px;
  line-height: 1.65;
}
.heading-art {
  position: relative;
  flex: 0 0 126px;
  width: 126px;
  height: 112px;
  overflow: hidden;
  display: grid;
  place-items: center;
  border-radius: 34% 45% 37% 44%;
  background: #e8f1e7;
  color: #578066;
}
.heading-art span {
  font-family: Georgia, serif;
  font-size: 67px;
  opacity: 0.8;
}
.heading-art i,
.heading-art b {
  position: absolute;
  width: 45px;
  height: 19px;
  border: 2px solid #93b29b;
  border-radius: 100% 0 100% 0;
  transform: rotate(-36deg);
}
.heading-art i {
  right: 12px;
  top: 24px;
}
.heading-art b {
  left: 12px;
  bottom: 17px;
  transform: rotate(144deg);
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 18px;
}
.summary-card,
.panel,
.review-card {
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: 0 2px 8px rgb(34 58 45 / 3%);
}
.summary-card {
  min-height: 120px;
  padding: 19px 21px;
}
.summary-label {
  display: block;
  color: #58665d;
  font-size: 12px;
  font-weight: 600;
}
.summary-card strong {
  display: block;
  margin-top: 8px;
  color: #273d32;
  font-family: Georgia, serif;
  font-size: 32px;
  line-height: 1;
  font-weight: 500;
}
.summary-detail {
  display: block;
  margin-top: 7px;
  color: #5b695f;
  font-size: 11px;
}
.overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(245px, 0.9fr);
  gap: 16px;
}
.panel {
  padding: 22px;
}
.journey-panel {
  padding: 23px 24px;
}
.panel-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
}
.panel-heading h2,
.review-card h2 {
  margin: 5px 0 0;
  color: #2a3c33;
  font-family: Georgia, serif;
  font-size: 20px;
  font-weight: 500;
  letter-spacing: -0.02em;
}
.step-count {
  color: #5b695f;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
}
.journey-list {
  padding: 0;
  margin: 0;
  list-style: none;
}
.journey-list li {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-height: 76px;
  border-top: 1px solid #edf0ec;
}
.journey-number {
  color: #416348;
  font-family: Georgia, serif;
  font-size: 16px;
}
.journey-list strong {
  font-size: 13px;
  font-weight: 650;
}
.journey-list p {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.5;
}
.review-card {
  position: relative;
  padding: 24px 23px;
  background: #f0f5ee;
  border-color: #e4ede1;
}
.review-icon {
  display: grid;
  place-items: center;
  width: 27px;
  height: 27px;
  margin-bottom: 17px;
  border-radius: 50%;
  background: #dcebdc;
  color: #426e4e;
  font-size: 14px;
  font-weight: 750;
}
.review-card .eyebrow {
  color: #3f6146;
}
.review-card h2 {
  margin: 7px 0 9px;
  font-size: 21px;
  line-height: 1.24;
}
.review-card > p:not(.eyebrow) {
  margin: 0;
  color: #536257;
  font-size: 12px;
  line-height: 1.6;
}
.review-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 22px;
  padding-top: 15px;
  border-top: 1px solid #dfe9dd;
  color: #55705c;
  font-size: 11px;
  font-weight: 650;
}
.review-status span {
  width: 8px;
  height: 8px;
  border: 1px solid #66826c;
  border-radius: 50%;
}
.privacy-footnote {
  margin: 20px 2px 0;
  color: #59675f;
  font-size: 10px;
  line-height: 1.6;
}
.record-count {
  padding: 8px 11px;
  border: 1px solid #e2e9e1;
  border-radius: 20px;
  color: #607066;
  background: white;
  font-size: 11px;
  font-weight: 650;
  white-space: nowrap;
}
.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.85fr);
  gap: 17px;
  align-items: start;
}
.editor-panel,
.records-panel {
  padding: 22px;
}
.draft-pill {
  padding: 5px 9px;
  border: 1px solid #e5e9e3;
  border-radius: 20px;
  color: #5b695f;
  background: #f8faf7;
  font-size: 10px;
  font-weight: 650;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 13px 12px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
  color: #42534a;
  font-size: 11px;
  font-weight: 650;
}
.field > span {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
}
.field > span b,
.required-hint b {
  color: #a9523f;
}
.field input,
.field select,
.field textarea {
  width: 100%;
  min-height: 39px;
  padding: 0 11px;
  border: 1px solid #dce4dc;
  border-radius: 7px;
  color: #2b3b33;
  background: #fff;
  font-size: 12px;
  font-weight: 450;
}
.field textarea {
  min-height: 74px;
  padding: 9px 11px;
  resize: vertical;
}
.field input::placeholder {
  color: #a3ada6;
}
.field input:hover,
.field select:hover,
.field textarea:hover {
  border-color: #bacabd;
}
.field input:focus,
.field select:focus,
.field textarea:focus {
  border-color: #548064;
  outline: 3px solid rgb(82 128 98 / 14%);
}
.field.full {
  grid-column: 1 / -1;
}
.field-group {
  min-width: 0;
  margin: 20px 0;
  padding: 17px 0 0;
  border: 0;
  border-top: 1px solid #edf0ec;
}
.field-group legend {
  padding: 0;
  color: #34473d;
  font-size: 12px;
  font-weight: 700;
}
.field-hint {
  margin: 0 0 13px;
  color: #5b695f;
  font-size: 10px;
  line-height: 1.55;
  font-weight: 450;
}
.field-group .form-grid {
  margin-top: 12px;
}
.classification-details {
  margin-top: 18px;
  padding: 13px;
  border: 1px solid #dfe8df;
  border-radius: 8px;
  background: #f9fbf8;
}
.classification-details > summary,
.saved-classification > summary {
  color: #315a45;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
.classification-details > .field-hint {
  margin: 10px 0;
}
.classification-context {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 12px 0;
}
.classification-question-group {
  min-width: 0;
  margin: 18px 0 0;
  padding: 13px 0 0;
  border: 0;
  border-top: 1px solid #e1e8e0;
}
.classification-question-group legend {
  padding: 0 5px 0 0;
  color: #34473d;
  font-size: 12px;
  font-weight: 700;
}
.classification-question-group > .field-hint {
  margin: 5px 0 10px;
}
.classification-fact-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}
.saved-classification {
  margin-top: 8px;
}
.saved-classification-result {
  display: grid;
  gap: 4px;
  margin-top: 8px;
  padding: 8px;
  border: 1px solid #e3e9e2;
  border-radius: 6px;
  background: #fbfcfa;
}
.saved-classification-result strong {
  color: #34473d;
  font-size: 10px;
}
.saved-classification-result p,
.saved-classification-result small {
  margin: 0;
  color: #58675e;
  font-size: 10px;
  line-height: 1.5;
}
.nutrient-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.field small {
  color: #5b695f;
  font-size: 9px;
  font-weight: 500;
}
.field .field-hint {
  display: block;
}
.form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 22px;
  padding-top: 17px;
  border-top: 1px solid #edf0ec;
}
.required-hint {
  color: #5b695f;
  font-size: 10px;
}
.count-badge {
  display: grid;
  place-items: center;
  min-width: 26px;
  height: 26px;
  padding: 0 6px;
  border-radius: 50%;
  color: #52705c;
  background: #edf4ed;
  font-size: 11px;
  font-weight: 700;
}
.empty-state {
  padding: 25px 8px 18px;
  text-align: center;
}
.empty-mark {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  margin: 0 auto 13px;
  border: 1px solid #dce7dc;
  border-radius: 13px;
  color: #66836d;
  background: #f3f7f1;
  font-family: Georgia, serif;
  font-size: 13px;
}
.empty-state h3 {
  margin: 0 0 7px;
  color: #35473d;
  font-family: Georgia, serif;
  font-size: 16px;
  font-weight: 500;
}
.empty-state p {
  max-width: 260px;
  margin: 0 auto 9px;
  color: #849087;
  font-size: 11px;
  line-height: 1.6;
}
.record-list {
  display: grid;
  padding: 0;
  margin: 0;
  list-style: none;
}
.record-item {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
  padding: 13px 0;
  border-top: 1px solid #edf0ec;
}
.record-avatar {
  flex: 0 0 33px;
  width: 33px;
  height: 33px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  color: #50725a;
  background: #edf4ed;
  font-family: Georgia, serif;
  font-size: 15px;
}
.recipe-avatar {
  color: #826848;
  background: #f5f0e5;
}
.product-avatar {
  color: #5b6d84;
  background: #eef1f7;
}
.record-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.record-main strong {
  overflow: hidden;
  color: #34453b;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.record-main > span,
.record-main small {
  overflow: hidden;
  color: #5b695f;
  font-size: 10px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.record-main small {
  color: #5b695f;
  font-size: 9px;
}
.info-callout {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-top: 20px;
  padding: 12px;
  border: 1px solid #e2ebe1;
  border-radius: 8px;
  background: #f6f9f4;
}
.info-callout > span {
  flex-basis: 17px;
  width: 17px;
  height: 17px;
  font-size: 10px;
}
.info-callout p {
  margin: 0;
  color: #5b695f;
  font-size: 10px;
  line-height: 1.55;
}
.line-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.line-heading h3 {
  margin: 0 0 4px;
  color: #42544a;
  font-size: 11px;
}
.line-heading .field-hint {
  margin: 0;
}
.inline-empty {
  padding: 16px 12px;
  border: 1px dashed #dce5dc;
  border-radius: 7px;
  color: #5b695f;
  background: #fbfcfa;
  font-size: 10px;
  line-height: 1.5;
}
.line-row {
  display: grid;
  grid-template-columns: 98px minmax(95px, 1fr) 82px 64px 22px;
  gap: 6px;
  align-items: end;
  margin-bottom: 9px;
}
.line-row .field {
  gap: 0;
}
.line-row .field input,
.line-row .field select {
  min-height: 36px;
  padding: 0 7px;
  font-size: 10px;
}
.remove-line {
  width: 22px;
  height: 34px;
  padding: 0;
  border: 0;
  color: #8e9890;
  background: transparent;
  font-size: 19px;
}
.remove-line:hover {
  color: #914b3e;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}
.expansion-result {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid #e9eee8;
}
.result-title {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}
.result-title h3 {
  margin: 4px 0 0;
  color: #34473d;
  font-family: Georgia, serif;
  font-size: 16px;
  font-weight: 500;
}
.result-tag {
  padding: 5px 7px;
  border-radius: 5px;
  color: #586d5e;
  background: #f0f5ef;
  font-size: 9px;
  font-weight: 650;
}
.expansion-result .field-hint {
  margin-top: 9px;
}
.expansion-list {
  display: grid;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}
.expansion-list li {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 3px 8px;
  padding: 9px 10px;
  border: 1px solid #edf0ec;
  border-radius: 7px;
}
.expansion-list li > span {
  color: #44554b;
  font-size: 10px;
}
.expansion-list li > strong {
  color: #3e604a;
  font-size: 10px;
}
.expansion-list li > small {
  grid-column: 1 / -1;
  overflow-wrap: anywhere;
  color: #8c9890;
  font-size: 8px;
  line-height: 1.4;
}
.notice {
  display: flex;
  gap: 8px;
  align-items: baseline;
  margin: 0 auto 16px;
  padding: 11px 14px;
  border: 1px solid;
  border-radius: 8px;
  font-size: 11px;
  line-height: 1.5;
}
.notice strong {
  font-weight: 700;
}
.notice-warning {
  border-color: #ead9b9;
  color: #725930;
  background: #fff9ec;
}
.notice-success {
  border-color: #cfe3d2;
  color: #355f43;
  background: #f1f8f1;
}
.notice-error {
  border-color: #ebd0ca;
  color: #7f4036;
  background: #fff5f2;
}
.inline-notice {
  margin-top: 12px;
}
.page-state {
  max-width: 650px;
  margin: 60px auto;
  padding: 36px;
  border: 1px solid var(--line);
  border-radius: 12px;
  color: var(--muted);
  background: white;
  text-align: center;
  font-size: 13px;
  line-height: 1.6;
}
.page-state h1 {
  margin: 8px 0;
  color: var(--ink);
  font-family: Georgia, serif;
  font-size: 30px;
  font-weight: 500;
}
.page-state .eyebrow {
  color: #a14d3c;
}
.footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 42px;
  border-top: 1px solid var(--line);
  color: #58665d;
  background: #fff;
  font-size: 10px;
}

@media (max-width: 1000px) {
  .workspace {
    grid-template-columns: 205px minmax(0, 1fr);
  }
  .main-content {
    padding: 34px 26px 42px;
  }
  .content-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .records-panel {
    order: 2;
  }
}
@media (max-width: 700px) {
  .classification-context,
  .classification-fact-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .topbar {
    height: 62px;
    padding: 0 17px;
  }
  .local-badge {
    font-size: 10px;
  }
  .workspace {
    display: flex;
    flex-direction: column;
  }
  .sidebar {
    position: sticky;
    z-index: 2;
    top: 0;
    display: block;
    padding: 0;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .nav-caption,
  .sidebar-note {
    display: none;
  }
  .sidebar nav {
    display: flex;
    gap: 3px;
    overflow-x: auto;
    padding: 7px 10px;
    scrollbar-width: thin;
  }
  .nav-link {
    flex: 0 0 auto;
    min-height: 38px;
    gap: 7px;
    padding: 0 10px;
    font-size: 10px;
    white-space: nowrap;
  }
  .nav-indicator {
    width: 6px;
    height: 6px;
  }
  .main-content {
    padding: 28px 16px 34px;
  }
  .page-heading {
    margin-bottom: 22px;
  }
  .heading-art {
    flex-basis: 72px;
    width: 72px;
    height: 72px;
    border-radius: 25px;
  }
  .heading-art span {
    font-size: 44px;
  }
  .heading-art i,
  .heading-art b {
    display: none;
  }
  .summary-grid {
    gap: 8px;
  }
  .summary-card {
    min-height: 102px;
    padding: 13px 11px;
  }
  .summary-label {
    font-size: 10px;
  }
  .summary-card strong {
    font-size: 26px;
  }
  .summary-detail {
    font-size: 9px;
    line-height: 1.35;
  }
  .overview-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .review-card {
    padding: 19px;
  }
  .panel,
  .journey-panel {
    padding: 18px 15px;
  }
  .page-heading.compact {
    align-items: flex-start;
  }
  .page-heading.compact h1 {
    font-size: 28px;
  }
  .record-count {
    padding: 6px 8px;
    font-size: 9px;
  }
  .line-row {
    grid-template-columns: 82px minmax(80px, 1fr) 65px 54px 20px;
    gap: 4px;
  }
  .footer {
    flex-direction: column;
    padding: 13px 17px;
    font-size: 9px;
  }
}
@media (max-width: 430px) {
  .brand small {
    display: none;
  }
  .local-badge {
    max-width: 140px;
  }
  .page-heading h1 {
    font-size: 30px;
  }
  .heading-art {
    display: none;
  }
  .journey-list li {
    grid-template-columns: 27px minmax(0, 1fr) auto;
    gap: 7px;
  }
  .nutrient-grid {
    grid-template-columns: 1fr;
  }
  .form-actions {
    align-items: flex-end;
  }
}
</style>
