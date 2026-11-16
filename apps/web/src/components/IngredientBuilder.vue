<script setup lang="ts">
import { computed, reactive, ref, toRaw, watch } from 'vue';
import { optionalNutrientIds, type OptionalNutrientId } from '@aus-food/domain';
import type { FormulationRecord, IngredientRecord } from '@aus-food/storage';
import {
  buildIngredientRecord,
  draftFromIngredient,
  emptyAdditiveSourceDraft,
  emptyIngredientDraft,
  ingredientStepStatuses,
  managedNutrients,
  optionalNutrientLabels,
} from '../ingredient-form';
import { buildFormulationRecord, draftFromFormulation, emptyFormulationDraft } from '../formulation-form';
import { allergenChoices } from '../rule-data';
import AppButton from './ui/button/AppButton.vue';

const props = defineProps<{
  record?: IngredientRecord | undefined;
  formulations: readonly FormulationRecord[];
  ingredients: readonly IngredientRecord[];
  makeId: (prefix: string) => string;
}>();
const emit = defineEmits<{ save: [record: IngredientRecord, composition?: FormulationRecord]; cancel: [] }>();

const draft = reactive(props.record ? draftFromIngredient(props.record) : emptyIngredientDraft());
const linkedComposition = computed(() => props.formulations.find((item) => item.id === draft.compoundFormulationId));
const compositionDraft = reactive(linkedComposition.value ? draftFromFormulation(linkedComposition.value) : emptyFormulationDraft());
if (!linkedComposition.value) compositionDraft.compositionCoverage = 'partial';
const originalComposition = ref(JSON.stringify(compositionDraft));
const availableIngredients = computed(() => props.ingredients.filter((item) => item.id !== props.record?.id));
let selectingComposition = false;
watch(
  () => JSON.stringify(compositionDraft.lines),
  () => {
    if (!selectingComposition && compositionDraft.compositionCoverage === 'complete') {
      compositionDraft.compositionCoverage = 'partial';
    }
  },
  { flush: 'sync' },
);

function addComponent(): void {
  compositionDraft.lines.push({
    id: props.makeId('line'), kind: 'ingredient', targetId: '', quantity: '', unit: 'g',
  });
}
function chooseComposition(): void {
  const selected = linkedComposition.value;
  selectingComposition = true;
  try {
    Object.assign(compositionDraft, selected ? draftFromFormulation(selected) : {
      ...emptyFormulationDraft(), compositionCoverage: 'partial',
    });
  } finally {
    selectingComposition = false;
  }
  originalComposition.value = JSON.stringify(compositionDraft);
  draft.additivesConfirmed = false;
}
const errorMessage = ref('');
const hasMassNutrition = computed(() => Boolean(draft.energyPer100g.trim())
  || managedNutrients.some(({ key }) => Boolean(draft.nutrients[key].trim()))
  || draft.additionalNutrientsMass.some(({ value }) => Boolean(value.trim())));
const hasVolumeNutrition = computed(() => Object.values(draft.nutritionPer100mL).some((value) => Boolean(value.trim()))
  || draft.additionalNutrientsVolume.some(({ value }) => Boolean(value.trim())));
const nutritionBasis = ref<'mass' | 'volume'>(hasVolumeNutrition.value && !hasMassNutrition.value ? 'volume' : 'mass');
const directAdditive = computed(() => draft.additiveSources.find((source) => source.id === draft.directAdditiveSourceId));
let previousDirectAdditive: ReturnType<typeof emptyAdditiveSourceDraft> | undefined;
const ingredientType = computed({
  get: () => draft.directAdditiveSourceId ? 'additive' : draft.kind,
  set: (type: 'atomic' | 'compound' | 'additive' | '') => {
    if (type === 'additive') {
      draft.kind = 'atomic';
      if (!draft.directAdditiveSourceId) {
        const name = draft.name.trim().toLowerCase();
        const existing = name && draft.additiveSources.find((source) => source.additiveName.trim().toLowerCase() === name);
        const source = existing || previousDirectAdditive || emptyAdditiveSourceDraft(props.makeId('additive-source'));
        if (!existing) draft.additiveSources.push(source);
        draft.directAdditiveSourceId = source.id;
      }
    } else {
      const source = draft.additiveSources.find((item) => item.id === draft.directAdditiveSourceId);
      if (source) {
        previousDirectAdditive = source;
        draft.additiveSources.splice(draft.additiveSources.indexOf(source), 1);
      }
      draft.directAdditiveSourceId = '';
      draft.kind = type;
    }
    draft.additivesConfirmed = false;
  },
});
const selectedAdditionalNutrient = ref<OptionalNutrientId | ''>('');
const additionalNutrients = computed(() => nutritionBasis.value === 'mass'
  ? draft.additionalNutrientsMass : draft.additionalNutrientsVolume);
const availableAdditionalNutrients = computed(() => optionalNutrientIds.filter(
  (id) => !additionalNutrients.value.some((entry) => entry.key === id),
));
function addAdditionalNutrient(): void {
  const key = selectedAdditionalNutrient.value;
  if (!key || !availableAdditionalNutrients.value.includes(key)) return;
  additionalNutrients.value.push({ key, value: '', unit: 'g' });
  selectedAdditionalNutrient.value = '';
}
watch(nutritionBasis, () => { selectedAdditionalNutrient.value = ''; });
const savedNutritionSources = computed(() => {
  const entries = [
    ...(props.record?.energyPer100g ? [{ label: 'Energy per 100 g', evidence: props.record.energyPer100g }] : []),
    ...managedNutrients.flatMap(({ key, label }) => {
      const evidence = props.record?.nutrientProfile?.values[key];
      return evidence ? [{ label: `${label} per 100 g`, evidence }] : [];
    }),
    ...Object.entries(props.record?.nutritionPer100mL ?? {}).map(([key, evidence]) => ({
      label: `${key} per 100 mL`, evidence,
    })),
    ...optionalNutrientIds.flatMap((key) => {
      const mass = props.record?.nutrientProfile?.values[key];
      const volume = props.record?.additionalNutritionPer100mL?.[key];
      return [
        ...(mass ? [{ label: `${optionalNutrientLabels[key]} per 100 g`, evidence: mass }] : []),
        ...(volume ? [{ label: `${optionalNutrientLabels[key]} per 100 mL`, evidence: volume }] : []),
      ];
    }),
  ];
  return entries.map(({ label, evidence }) => ({
    label,
    source: evidence.sourceId,
    date: evidence.sourceDate,
    type: evidence.evidenceType ?? 'supplier',
  }));
});

const choiceIds = new Set(allergenChoices.map((choice) => choice.id));
const otherAllergens = ref(draft.knownAllergens.filter((id) => !choiceIds.has(id)).join(', '));
const tickedAllergens = ref(draft.knownAllergens.filter((id) => choiceIds.has(id)));
watch(
  [tickedAllergens, otherAllergens],
  () => {
    const others = otherAllergens.value
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    draft.knownAllergens = [...tickedAllergens.value, ...others];
  },
  { immediate: true, deep: true },
);
watch(
  () => [draft.specificationReference, draft.specificationDate, draft.allergenSourceType,
    draft.allergenSourceReference, draft.allergenSourceDate, ...draft.knownAllergens],
  () => { draft.allergensConfirmed = false; },
);
watch(
  () => [draft.specificationReference, draft.specificationDate, draft.additiveCoverageType,
    draft.additiveCoverageReference, draft.additiveCoverageDate, draft.directAdditiveSourceId,
    draft.directAdditiveSourceId ? draft.name : '', JSON.stringify(draft.additiveSources)],
  () => { draft.additivesConfirmed = false; },
);
watch(
  () => [JSON.stringify(compositionDraft.lines), compositionDraft.compositionCoverage],
  () => { if (!selectingComposition) draft.additivesConfirmed = false; },
);
const statuses = computed(() => ingredientStepStatuses(draft));
const steps = computed(() => [
  { id: 'about', title: 'About it', status: statuses.value.about.text, done: statuses.value.about.done },
  { id: 'nutrition', title: 'Nutrition', status: statuses.value.nutrition.text, done: statuses.value.nutrition.done },
  { id: 'allergens', title: 'Allergens', status: statuses.value.allergens.text, done: statuses.value.allergens.done },
  { id: 'additives', title: 'Additives', status: statuses.value.additives.text, done: statuses.value.additives.done },
  { id: 'review', title: 'Review and save' },
]);

const missing = computed(() => {
  const list: string[] = [];
  if (!statuses.value.about.done) list.push('Name and type of ingredient');
  if (!statuses.value.nutrition.done) list.push('Some nutrition values (blank means "not supplied", never zero)');
  if (!statuses.value.allergens.done) list.push('Confirm the allergen information');
  if (!statuses.value.additives.done) list.push('Confirm the additive information');
  return list;
});

function submit(): void {
  errorMessage.value = '';
  try {
    const existing = props.record === undefined ? undefined : toRaw(props.record);
    const now = new Date().toISOString();
    let composition: FormulationRecord | undefined;
    if (draft.kind === 'compound' && (!linkedComposition.value || JSON.stringify(compositionDraft) !== originalComposition.value)) {
      if (linkedComposition.value?.processMassProfile) {
        throw new Error('This linked recipe has processing information. Edit it in Formulations to preserve that information.');
      }
      compositionDraft.name = `${draft.name.trim()} components`;
      if (linkedComposition.value) {
        compositionDraft.compositionReference = '';
        compositionDraft.compositionDate = '';
      }
      composition = buildFormulationRecord(compositionDraft, undefined, props.makeId, now);
      draft.compoundFormulationId = composition.id;
    }
    const record = buildIngredientRecord(draft, existing, props.makeId, now);
    emit('save', record, composition);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'This ingredient could not be saved.';
  }
}
</script>

<template>
  <form
    class="panel editor-panel"
    @submit.prevent="submit"
  >
    <div class="panel-heading">
      <div>
        <p class="eyebrow">
          {{ record ? 'EDIT DRAFT' : 'NEW DRAFT' }}
        </p>
        <h2>Ingredient record</h2>
      </div>
      <span class="draft-pill">Draft</span>
    </div>

    <div class="ingredient-sections">
      <details
        class="ingredient-section"
        open
      >
        <summary>Basics</summary>
        <div class="form-grid">
          <p class="field-hint full">
            Start with the basics. You can open any section at any time, and save an unfinished
            draft whenever you like.
          </p>
          <p
            v-if="draft.additiveSources.some((source) => source.id !== draft.directAdditiveSourceId)"
            class="field-hint full"
          >
            This older record has separate additive entries that cannot be edited here. Review or recreate the ingredient using included ingredients before relying on it.
          </p>
          <label class="field full">
            <span>Ingredient name <b aria-hidden="true">*</b></span>
            <input
              v-model="draft.name"
              maxlength="120"
              autocomplete="off"
              placeholder="e.g. Rolled oats"
            >
          </label>
          <label class="field">
            <span>Ingredient type</span>
            <select v-model="ingredientType">
              <option
                value=""
                disabled
              >Select ingredient type</option>
              <option value="atomic">Single ingredient (e.g. rolled oats, sugar)</option>
              <option value="additive">An additive</option>
              <option value="compound">Made from other ingredients (e.g. a sauce with its own recipe)</option>
            </select>
          </label>
          <label
            v-if="draft.kind === 'compound'"
            class="field"
          >
            <span>Composition formulation</span>
            <select
              v-model="draft.compoundFormulationId"
              @change="chooseComposition"
            >
              <option value="">Enter components below</option>
              <option
                v-for="item in formulations"
                :key="item.id"
                :value="item.id"
              >{{ item.name }}</option>
            </select>
            <small>Optional: reuse an existing recipe instead of entering components below.</small>
          </label>
          <label class="field">
            <span>Supplier name</span>
            <input
              v-model="draft.supplierName"
              maxlength="120"
              autocomplete="organization"
              placeholder="Supplier or manufacturer"
            >
          </label>
        </div>
        <fieldset
          v-if="directAdditive"
          class="field-group"
        >
          <legend>Additive details</legend>
          <p class="field-hint">
            Enter what you know. A name or number does not establish permission for use.
          </p>
          <div class="form-grid">
            <label class="field">
              <span>Code number (source)</span>
              <input
                v-model="directAdditive.codeNumber"
                maxlength="40"
                autocomplete="off"
                placeholder="If known"
              >
            </label>
            <label class="field full">
              <span>Technological purpose(s)</span>
              <textarea
                v-model="directAdditive.technologicalPurposes"
                rows="2"
                maxlength="500"
                placeholder="For example, preservative or thickener"
              />
              <small class="field-hint">Enter one known purpose per line.</small>
            </label>
          </div>
          <details>
            <summary>Label wording options (optional)</summary>
            <p class="field-hint">
              If you already know how this additive should be described on the label, you can
              record it here. Leave it undecided if unsure; the wording still needs review.
            </p>
            <div class="form-grid">
              <label class="field">
                <span>How should this additive be described on the label?</span>
                <select v-model="directAdditive.declarationRoute">
                  <option value="unknown">Not sure yet</option>
                  <option value="schedule7Class">Purpose and name or number (e.g. preservative (200))</option>
                  <option value="noSchedule7Class">Name only</option>
                  <option value="enzyme">As an enzyme</option>
                  <option value="flavouring">As a flavouring</option>
                  <option value="specifiedFlavouringSubstance">As a named flavouring substance</option>
                  <option value="addedCaffeine">As added caffeine</option>
                </select>
              </label>
              <label
                v-if="directAdditive.declarationRoute === 'schedule7Class'"
                class="field"
              >
                <span>Proposed purpose for the label</span>
                <input
                  v-model="directAdditive.schedule7ClassName"
                  maxlength="120"
                  autocomplete="off"
                >
              </label>
              <label
                v-if="directAdditive.declarationRoute === 'schedule7Class'"
                class="field"
              >
                <span>Use the additive's name or number?</span>
                <select v-model="directAdditive.substanceChoice">
                  <option value="">Not selected</option>
                  <option value="schedule8Name">Name</option>
                  <option value="schedule8CodeNumber">Code number</option>
                </select>
              </label>
              <label
                v-if="directAdditive.declarationRoute === 'flavouring'"
                class="field"
              >
                <span>Flavouring wording</span>
                <select v-model="directAdditive.flavouringWording">
                  <option value="">Not selected</option>
                  <option value="flavouring">flavouring</option>
                  <option value="flavour">flavour</option>
                  <option value="specificName">Specific name or description</option>
                </select>
              </label>
            </div>
          </details>
          <label class="check-item">
            <input
              v-model="directAdditive.showAmount"
              type="checkbox"
            >
            <span>I know how much of this ingredient is the additive</span>
          </label>
          <div
            v-if="directAdditive.showAmount"
            class="form-grid"
          >
            <label class="field">
              <span>Additive concentration</span>
              <input
                v-model="directAdditive.concentrationValue"
                inputmode="decimal"
                placeholder="Unknown"
              >
            </label>
            <label class="field">
              <span>Additive concentration unit</span>
              <select v-model="directAdditive.concentrationUnit">
                <option value="">Choose a unit</option>
                <option value="percentByMass">% by mass</option>
                <option value="percentByVolume">% by volume</option>
                <option value="mgPerKg">mg/kg</option>
                <option value="gPerKg">g/kg</option>
                <option value="mgPerL">mg/L</option>
                <option value="gPerL">g/L</option>
                <option value="mgPer100g">mg/100 g</option>
                <option value="gPer100g">g/100 g</option>
                <option value="mgPer100mL">mg/100 mL</option>
                <option value="gPer100mL">g/100 mL</option>
              </select>
            </label>
            <label class="field">
              <span>What does this concentration describe?</span>
              <select v-model="directAdditive.concentrationBasis">
                <option value="unknown">Not sure</option>
                <option value="asSupplied">Ingredient as supplied</option>
                <option value="asAdded">Ingredient as added</option>
                <option value="dryMatter">Dry matter</option>
                <option value="asPrepared">As prepared</option>
                <option value="asReconstituted">As reconstituted</option>
                <option value="asDrained">As drained</option>
              </select>
            </label>
            <label class="field">
              <span>Figure already converted to (optional)</span>
              <input
                v-model="directAdditive.concentrationCalculatedAs"
                maxlength="80"
                placeholder="e.g. benzoic acid"
              >
              <small>The program does not convert between substances; enter a converted figure only if you know it.</small>
            </label>
          </div>
          <details>
            <summary>Additive source details (optional)</summary>
            <div class="form-grid">
              <label class="field">
                <span>Additive source reference</span>
                <input
                  v-model="directAdditive.sourceReference"
                  maxlength="160"
                  @input="directAdditive.showEvidence = true"
                >
              </label>
              <label class="field">
                <span>Additive source date</span>
                <input
                  v-model="directAdditive.sourceDate"
                  type="date"
                  @input="directAdditive.showEvidence = true"
                >
              </label>
              <label class="field">
                <span>Additive source type</span>
                <select
                  v-model="directAdditive.sourceKind"
                  @change="directAdditive.showEvidence = true"
                >
                  <option value="supplierSpecification">Supplier specification</option>
                  <option value="certificateOfAnalysis">Certificate of analysis</option>
                  <option value="formulationRecord">Formulation record</option>
                  <option value="productPackaging">Product packaging</option>
                  <option value="processRecord">Process record</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
          </details>
        </fieldset>
        <label
          v-if="draft.kind === 'atomic'"
          class="check-item"
        >
          <input
            v-model="draft.additivesConfirmed"
            type="checkbox"
          >
          <span>I have identified all additives in this ingredient. If it contains other ingredients, choose "Made from other ingredients" and list them there.</span>
        </label>
      </details>
      <details
        v-if="draft.kind === 'compound'"
        class="ingredient-section"
        open
      >
        <summary>Included ingredients</summary>
        <fieldset class="field-group">
          <legend>What is in this ingredient?</legend>
          <p class="field-hint">
            Choose the ingredients you know about, including additives. Leave an amount blank if
            you do not know it. Unknown amounts cannot be used to calculate nutrition.
          </p>
          <p
            v-if="linkedComposition"
            class="field-hint"
          >
            Changes create a separate composition for this ingredient; the existing shared recipe is not changed.
          </p>
          <label class="field">
            <span>Is this the complete list?</span>
            <select v-model="compositionDraft.compositionCoverage">
              <option value="partial">No or not sure</option>
              <option value="complete">Yes, all included ingredients are listed</option>
            </select>
          </label>
          <label class="check-item">
            <input
              v-model="draft.additivesConfirmed"
              type="checkbox"
              :disabled="compositionDraft.compositionCoverage !== 'complete'"
            >
            <span>I have identified all additives in this ingredient's included ingredients.</span>
          </label>
          <div
            v-for="(line, index) in compositionDraft.lines"
            :key="line.id"
            class="form-grid"
          >
            <label class="field">
              <span>Component {{ index + 1 }}</span>
              <select v-model="line.targetId">
                <option value="">Choose an ingredient</option>
                <option
                  v-for="item in line.kind === 'ingredient' ? availableIngredients : formulations"
                  :key="item.id"
                  :value="item.id"
                >
                  {{ item.name }}
                </option>
              </select>
              <small v-if="line.kind === 'formulation'">Existing linked recipe</small>
            </label>
            <label class="field">
              <span>Amount {{ index + 1 }} (optional)</span>
              <input
                v-model="line.quantity"
                inputmode="decimal"
                placeholder="Unknown"
              >
            </label>
            <label class="field">
              <span>Unit {{ index + 1 }}</span>
              <select v-model="line.unit">
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="mg">mg</option>
              </select>
            </label>
            <AppButton
              type="button"
              variant="outline"
              size="sm"
              @click="compositionDraft.lines.splice(index, 1)"
            >
              Remove component {{ index + 1 }}
            </AppButton>
          </div>
          <AppButton
            type="button"
            variant="outline"
            size="sm"
            @click="addComponent"
          >
            Add included ingredient
          </AppButton>
          <p
            v-if="!availableIngredients.length"
            class="field-hint"
          >
            Save an ingredient first, then select it here.
          </p>
        </fieldset>
      </details>
      <div
        v-else
        class="ingredient-section disabled-section"
        aria-disabled="true"
      >
        Included ingredients <small>— available for ingredients made from other ingredients</small>
      </div>
      <details class="ingredient-section">
        <summary>Nutrition</summary>
        <label
          v-if="draft.kind === 'compound'"
          class="field"
        >
          <span>Which nutrition values should be used?</span>
          <select v-model="draft.compoundNutritionBasis">
            <option value="components">Calculate from included ingredients</option>
            <option value="whole">Use values for the whole ingredient</option>
          </select>
          <small>Component calculations require a complete list, known amounts and nutrient values. Existing whole-ingredient values are kept when switching.</small>
        </label>
        <p
          v-if="draft.kind === 'compound' && draft.compoundNutritionBasis === 'components'"
          class="field-hint"
        >
          The included ingredients are used; you do not need to total their nutrition yourself.
          Missing amounts, values or processing information require review.
        </p>
        <fieldset
          v-show="draft.kind !== 'compound' || draft.compoundNutritionBasis === 'whole'"
          class="field-group"
        >
          <legend>Nutrient values for the whole ingredient</legend>
          <p class="field-hint">
            Enter known values on the same basis. Blank means unknown, not zero.
            Source details are optional; values without them need review.
          </p>
          <details>
            <summary>Nutrition source details (optional)</summary>
            <div class="form-grid">
              <label class="field">
                <span>Nutrition source type</span>
                <select v-model="draft.nutritionSourceType">
                  <option value="">Use the supplier specification, if supplied</option>
                  <option value="supplier">Supplier</option>
                  <option value="productLabel">Product label</option>
                  <option value="database">Food composition database</option>
                  <option value="analysis">Analysis</option>
                  <option value="calculated">Calculated</option>
                  <option value="user">Own knowledge or other source</option>
                </select>
              </label>
              <label class="field">
                <span>Nutrition source reference</span>
                <input
                  v-model="draft.nutritionSourceReference"
                  maxlength="120"
                  placeholder="Describe the source"
                >
              </label>
              <label class="field">
                <span>Nutrition source date</span>
                <input
                  v-model="draft.nutritionSourceDate"
                  type="date"
                >
              </label>
            </div>
          </details>
          <details v-if="savedNutritionSources.length">
            <summary>Sources of saved nutrition values</summary>
            <ul>
              <li
                v-for="entry in savedNutritionSources"
                :key="entry.label"
              >
                {{ entry.label }}: {{ entry.type }}, {{ entry.source }}, {{ entry.date }}
              </li>
            </ul>
          </details>
          <label class="field">
            <span>Nutrition values are per</span>
            <select v-model="nutritionBasis">
              <option value="mass">100 g</option>
              <option value="volume">100 mL</option>
            </select>
          </label>
          <p
            v-if="hasMassNutrition && hasVolumeNutrition"
            class="field-hint"
          >
            This ingredient has values saved for both bases. Switch between them to view each set;
            they are not compared. Calculations prefer a per-100 g value when both are available.
          </p>
          <p
            v-if="nutritionBasis === 'volume'"
            class="field-hint"
          >
            Recipes currently use ingredient weights. To calculate using per-100 mL values,
            enter the ingredient's density with its source below. No density is assumed.
          </p>
          <div
            v-if="nutritionBasis === 'mass'"
            class="nutrient-grid"
          >
            <label class="field">
              <span>Energy <small>kJ/100 g</small></span>
              <input
                v-model="draft.energyPer100g"
                inputmode="decimal"
                autocomplete="off"
                placeholder="Not supplied"
              >
            </label>
            <label
              v-for="nutrient in managedNutrients"
              :key="nutrient.key"
              class="field"
            >
              <span>{{ nutrient.label }} <small>{{ nutrient.unit.replace('/100g', '/100 g') }}</small></span>
              <input
                v-model="draft.nutrients[nutrient.key]"
                inputmode="decimal"
                autocomplete="off"
                placeholder="Not supplied"
              >
            </label>
          </div>
          <div
            v-else
            class="nutrient-grid"
          >
            <label class="field">
              <span>Energy per 100 mL <small>kJ/100 mL</small></span>
              <input
                v-model="draft.nutritionPer100mL.energy"
                inputmode="decimal"
                autocomplete="off"
                placeholder="Not supplied"
              >
            </label>
            <label
              v-for="nutrient in managedNutrients"
              :key="nutrient.key"
              class="field"
            >
              <span>{{ nutrient.label }} per 100 mL <small>{{ nutrient.unit.replace('/100g', '/100 mL') }}</small></span>
              <input
                v-model="draft.nutritionPer100mL[nutrient.key]"
                inputmode="decimal"
                autocomplete="off"
                placeholder="Not supplied"
              >
            </label>
          </div>
          <fieldset class="field-group">
            <legend>Other known nutrients</legend>
            <p class="field-hint">
              Add any further values you know for this basis. This list is not yet a complete
              nutrient catalogue. Entering a value does not automatically add it to the label.
              These extra values are saved but are not yet used in product nutrition calculations.
            </p>
            <div
              v-for="(nutrient, index) in additionalNutrients"
              :key="nutrient.key"
              class="form-grid"
            >
              <label class="field">
                <span>{{ optionalNutrientLabels[nutrient.key] }} amount</span>
                <input
                  v-model="nutrient.value"
                  inputmode="decimal"
                  autocomplete="off"
                  placeholder="Unknown"
                >
              </label>
              <label class="field">
                <span>{{ optionalNutrientLabels[nutrient.key] }} unit</span>
                <select v-model="nutrient.unit">
                  <option value="g">g per 100 {{ nutritionBasis === 'mass' ? 'g' : 'mL' }}</option>
                  <option value="mg">mg per 100 {{ nutritionBasis === 'mass' ? 'g' : 'mL' }}</option>
                </select>
              </label>
              <AppButton
                type="button"
                variant="outline"
                size="sm"
                :aria-label="`Remove ${optionalNutrientLabels[nutrient.key]} from ${nutritionBasis === 'mass' ? '100 g' : '100 mL'}`"
                @click="additionalNutrients.splice(index, 1)"
              >
                Remove {{ optionalNutrientLabels[nutrient.key] }}
              </AppButton>
            </div>
            <label
              v-if="availableAdditionalNutrients.length"
              class="field"
            >
              <span>Choose another known nutrient</span>
              <select v-model="selectedAdditionalNutrient">
                <option value="">Select a nutrient</option>
                <option
                  v-for="key in availableAdditionalNutrients"
                  :key="key"
                  :value="key"
                >
                  {{ optionalNutrientLabels[key] }}
                </option>
              </select>
            </label>
            <AppButton
              v-if="availableAdditionalNutrients.length"
              type="button"
              variant="outline"
              size="sm"
              :disabled="!selectedAdditionalNutrient"
              @click="addAdditionalNutrient"
            >
              Add another known nutrient
            </AppButton>
          </fieldset>
          <fieldset class="field-group">
            <legend>Ingredient density (if known)</legend>
            <p class="field-hint">
              This is the density of this ingredient, not the finished food. It is needed when
              converting per-100 mL nutrient values for a recipe measured by weight.
            </p>
            <div class="form-grid">
              <label class="field">
                <span>Density (g/mL)</span>
                <input
                  v-model="draft.ingredientDensity"
                  inputmode="decimal"
                  placeholder="Unknown"
                >
              </label>
            </div>
            <details>
              <summary>Density source details (optional)</summary>
              <div class="form-grid">
                <label class="field">
                  <span>Density source reference</span>
                  <input
                    v-model="draft.densityReference"
                    maxlength="120"
                  >
                </label>
                <label class="field">
                  <span>Density source date</span>
                  <input
                    v-model="draft.densityDate"
                    type="date"
                  >
                </label>
              </div>
            </details>
          </fieldset>
        </fieldset>
      </details>

      <details class="ingredient-section">
        <summary>Allergens</summary>
        <fieldset class="field-group">
          <legend>Allergen information</legend>
          <p class="field-hint">
            Tick known allergens in this ingredient. Ticking nothing without confirmation means
            "not recorded", not "allergen-free". Source details are optional; information without them needs review.
          </p>
          <details>
            <summary>Allergen source details (optional)</summary>
            <div class="form-grid">
              <label class="field">
                <span>Allergen source type</span>
                <select v-model="draft.allergenSourceType">
                  <option value="">Use the supplier specification, if supplied</option>
                  <option value="supplier">Supplier</option>
                  <option value="productLabel">Product label</option>
                  <option value="database">Food composition database</option>
                  <option value="analysis">Analysis</option>
                  <option value="calculated">Calculated</option>
                  <option value="user">Own knowledge or other source</option>
                </select>
              </label>
              <label class="field">
                <span>Allergen source reference</span>
                <input
                  v-model="draft.allergenSourceReference"
                  maxlength="120"
                >
              </label>
              <label class="field">
                <span>Allergen source date</span>
                <input
                  v-model="draft.allergenSourceDate"
                  type="date"
                >
              </label>
            </div>
          </details>
          <div class="check-grid">
            <label
              v-for="choice in allergenChoices"
              :key="choice.id"
              class="check-item"
            >
              <input
                v-model="tickedAllergens"
                type="checkbox"
                :value="choice.id"
              >
              <span>{{ choice.label }}</span>
            </label>
          </div>
          <label class="field">
            <span>Other allergen not in the list (optional)</span>
            <input
              v-model="otherAllergens"
              maxlength="300"
              autocomplete="off"
              placeholder="Comma separated"
            >
          </label>
          <label class="check-item">
            <input
              v-model="draft.allergensConfirmed"
              type="checkbox"
            >
            <span>I confirm that ticked allergens are present and unticked allergens are absent.
              Do not confirm if any answer is unknown, including allergens in additives.</span>
          </label>
        </fieldset>
      </details>

      <details class="ingredient-section">
        <summary>Review</summary>
        <div class="field-group">
          <h3>Review and save</h3>
          <p
            v-if="missing.length === 0"
            class="field-hint"
          >
            The requested fields are filled in. Save the draft to check the entries; a consultant should
            still check the label. This is a guide, not legal advice or a clearance.
          </p>
          <template v-else>
            <p class="field-hint">
              Needs attention! You can save now and finish later. Still to do:
            </p>
            <ul>
              <li
                v-for="item in missing"
                :key="item"
              >
                {{ item }}
              </li>
            </ul>
          </template>
          <ul class="review-list">
            <li
              v-for="step in steps.slice(0, 4)"
              :key="step.id"
            >
              <strong>{{ step.title }}:</strong> {{ step.status }}
            </li>
          </ul>
        </div>
      </details>
      <div class="ingredient-actions">
        <AppButton type="submit">
          Save ingredient draft <span aria-hidden="true">→</span>
        </AppButton>
        <AppButton
          variant="outline"
          type="button"
          @click="emit('cancel')"
        >
          Back to ingredient list
        </AppButton>
      </div>
    </div>
    <p
      v-if="errorMessage"
      class="notice error"
      role="alert"
    >
      {{ errorMessage }}
    </p>
  </form>
</template>

<style scoped>
.ingredient-sections {
  display: grid;
  gap: 0.75rem;
}
.ingredient-section {
  border: 1px solid #d4d4d8;
  border-radius: 0.5rem;
  padding: 0.75rem;
}
.ingredient-section > summary {
  cursor: pointer;
  font-weight: 600;
}
.disabled-section {
  color: #52525b;
  background: #f4f4f5;
}
.ingredient-actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.check-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: 0.35rem;
  margin: 0.5rem 0;
}
.check-item {
  display: flex;
  gap: 0.45rem;
  align-items: center;
}
</style>
