<script setup lang="ts">
import { computed, reactive, ref, toRaw, watch } from 'vue';
import type { FormulationRecord, IngredientRecord } from '@aus-food/storage';
import {
  buildIngredientRecord,
  draftFromIngredient,
  emptyAdditiveSourceDraft,
  emptyIngredientDraft,
  ingredientStepStatuses,
  managedNutrients,
  supplierFactTopics,
  supplierStatements,
} from '../ingredient-form';
import { allergenChoices } from '../rule-data';
import AppButton from './ui/button/AppButton.vue';

const props = defineProps<{
  record?: IngredientRecord | undefined;
  formulations: readonly FormulationRecord[];
  makeId: (prefix: string) => string;
}>();
const emit = defineEmits<{ save: [record: IngredientRecord]; cancel: [] }>();

const draft = reactive(props.record ? draftFromIngredient(props.record) : emptyIngredientDraft());
const errorMessage = ref('');
const volumeNutritionOpen = ref(false);
function onVolumeNutritionToggle(event: Event): void {
  volumeNutritionOpen.value = event.currentTarget instanceof HTMLDetailsElement && event.currentTarget.open;
}

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
  () => [draft.specificationReference, draft.specificationDate, ...draft.knownAllergens],
  () => { draft.allergensConfirmed = false; },
);
watch(
  () => [draft.specificationReference, draft.specificationDate, JSON.stringify(draft.additiveSources)],
  () => { draft.additivesConfirmed = false; },
);
watch(
  () => [draft.specificationReference, draft.specificationDate],
  () => {
    draft.confirmCaffeineForCurrentSpec = false;
    draft.confirmIdentityForCurrentSpec = false;
    for (const { key } of supplierFactTopics) draft.supplierFacts[key].confirmCurrentSpec = false;
  },
);

const statuses = computed(() => ingredientStepStatuses(draft));
const steps = computed(() => [
  { id: 'about', title: 'About it', status: statuses.value.about.text, done: statuses.value.about.done },
  { id: 'spec', title: 'Spec sheet', status: statuses.value.spec.text, done: statuses.value.spec.done },
  { id: 'nutrition', title: 'Nutrition', status: statuses.value.nutrition.text, done: statuses.value.nutrition.done },
  { id: 'allergens', title: 'Allergens', status: statuses.value.allergens.text, done: statuses.value.allergens.done },
  { id: 'additives', title: 'Additives', status: statuses.value.additives.text, done: statuses.value.additives.done },
  { id: 'review', title: 'Review and save' },
]);

const missing = computed(() => {
  const list: string[] = [];
  if (!statuses.value.about.done) list.push('Name and type of ingredient');
  if (!statuses.value.spec.done) list.push('Supplier spec sheet reference and date');
  if (!statuses.value.nutrition.done) list.push('Some nutrition values (blank means "not supplied", never zero)');
  if (!statuses.value.allergens.done) list.push('Confirm the supplier allergen information');
  if (!statuses.value.additives.done) list.push('Confirm the supplier additive information');
  return list;
});

function addAdditive(): void {
  draft.additiveSources.push(emptyAdditiveSourceDraft(props.makeId('additive-source')));
}

function submit(): void {
  errorMessage.value = '';
  try {
    const existing = props.record === undefined ? undefined : toRaw(props.record);
    const record = buildIngredientRecord(draft, existing, props.makeId, new Date().toISOString());
    emit('save', record);
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
            v-if="record?.ingredientIdentity || record?.caffeineEvidence || record?.supplierFacts || record?.otherSchedule28Statements?.length"
            class="field-hint full"
          >
            This record has existing specialised information. Find it under Source details.
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
            <select v-model="draft.kind">
              <option
                value=""
                disabled
              >Select ingredient type</option>
              <option value="atomic">Single ingredient (e.g. rolled oats, sugar)</option>
              <option value="compound">Made from other ingredients (e.g. a sauce with its own recipe)</option>
            </select>
            <small class="field-hint">
              Choose "made from other ingredients" only if you have already saved a recipe for it.
            </small>
          </label>
          <label
            v-if="draft.kind === 'compound'"
            class="field"
          >
            <span>Composition formulation <b aria-hidden="true">*</b></span>
            <select v-model="draft.compoundFormulationId">
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
              v-model="draft.supplierName"
              maxlength="120"
              autocomplete="organization"
              placeholder="Supplier or manufacturer"
            >
          </label>
          <label class="field">
            <span>Supplier product code</span>
            <input
              v-model="draft.supplierProductCode"
              maxlength="80"
              autocomplete="off"
              placeholder="Optional"
            >
          </label>
        </div>
      </details>
      <details class="ingredient-section">
        <summary>Source details</summary>
        <fieldset class="field-group">
          <legend>Source details</legend>
          <p class="field-hint">
            You can save the ingredient without a source. The existing nutrition and allergen
            fields currently require a dated supplier specification; support for other sources
            will be added in the next nutrition and allergen step.
          </p>
          <details>
            <summary>Earlier drink-specific information (optional)</summary>
            <div class="form-grid">
              <label class="field">
                <span>Ingredient identity from the specification</span>
                <select v-model="draft.ingredientIdentity">
                  <option value="">Not sure yet</option>
                  <option value="water">Water</option>
                  <option value="sugar">Sugar</option>
                  <option value="citric-acid">Citric acid</option>
                  <option value="caffeine">Caffeine</option>
                  <option value="lemon-peel-oil">Lemon-peel oil</option>
                  <option value="flavour-blend">Flavour blend</option>
                  <option value="unrecognised">Something else / not recognised</option>
                </select>
                <small>The selection is separate from the ingredient name and is not a legal classification.</small>
              </label>
              <label class="field">
                <span>What does this specification say about caffeine?</span>
                <select v-model="draft.caffeineStatus">
                  <option value="">Not stated or unknown</option>
                  <option value="present">Caffeine is present</option>
                  <option value="absent">Supplier confirms no caffeine</option>
                  <option value="conflicting">Information conflicts</option>
                </select>
              </label>
              <template v-if="draft.caffeineStatus === 'present'">
                <label class="field">
                  <span>Caffeine amount in the supplied ingredient</span>
                  <input
                    v-model="draft.caffeineAmount"
                    inputmode="decimal"
                  >
                </label>
                <label class="field">
                  <span>Caffeine amount unit</span>
                  <select v-model="draft.caffeineUnit">
                    <option value="">Choose a unit</option>
                    <option value="g/100g">g per 100 g</option>
                    <option value="mg/100g">mg per 100 g</option>
                    <option value="mg/100mL">mg per 100 mL</option>
                  </select>
                </label>
              </template>
            </div>
            <template v-if="draft.caffeineStatus === 'conflicting'">
              <p class="field-hint">
                Record both supplier statements and their sources. The disagreement remains unresolved;
                neither statement is treated as the answer. Keep the original documents.
              </p>
              <fieldset
                v-for="(statement, index) in draft.caffeineStatements"
                :key="index"
                class="field-group"
              >
                <legend>Caffeine statement {{ index + 1 }}</legend>
                <div class="form-grid">
                  <label class="field">
                    <span>Statement {{ index + 1 }}: caffeine</span>
                    <select
                      v-model="statement.status"
                      :disabled="Boolean(record?.caffeineEvidence?.statements)"
                    >
                      <option value="">Choose a statement</option>
                      <option value="present">Present</option>
                      <option value="absent">Confirmed absent</option>
                    </select>
                  </label>
                  <template v-if="statement.status === 'present'">
                    <label class="field">
                      <span>Statement {{ index + 1 }}: amount</span>
                      <input
                        v-model="statement.amount"
                        inputmode="decimal"
                        :disabled="Boolean(record?.caffeineEvidence?.statements)"
                      >
                    </label>
                    <label class="field">
                      <span>Statement {{ index + 1 }}: unit</span>
                      <select
                        v-model="statement.unit"
                        :disabled="Boolean(record?.caffeineEvidence?.statements)"
                      >
                        <option value="">Choose a unit</option>
                        <option value="g/100g">g per 100 g</option>
                        <option value="mg/100g">mg per 100 g</option>
                        <option value="mg/100mL">mg per 100 mL</option>
                      </select>
                    </label>
                  </template>
                  <label class="field">
                    <span>Statement {{ index + 1 }}: source reference</span>
                    <input
                      v-model="statement.reference"
                      maxlength="120"
                      :disabled="Boolean(record?.caffeineEvidence?.statements)"
                    >
                  </label>
                  <label class="field">
                    <span>Statement {{ index + 1 }}: source date</span>
                    <input
                      v-model="statement.sourceDate"
                      type="date"
                      :disabled="Boolean(record?.caffeineEvidence?.statements)"
                    >
                  </label>
                </div>
              </fieldset>
              <p
                v-if="record?.caffeineEvidence?.statements"
                class="field-hint"
              >
                Saved supplier statements are kept unchanged. If you have checked the disagreement,
                record your decision below; this does not change calculations yet.
              </p>
              <div
                v-if="record?.caffeineEvidence?.decisions?.length"
                class="field-group"
              >
                <h3>Previous caffeine decisions</h3>
                <ul class="review-list">
                  <li
                    v-for="(decision, index) in record.caffeineEvidence.decisions"
                    :key="index"
                  >
                    {{ decision.choice === 'statement1' ? 'Use statement 1' : decision.choice === 'statement2' ? 'Use statement 2' : 'Still unresolved' }}:
                    {{ decision.reason }} ({{ decision.recordedAt }})
                  </li>
                </ul>
              </div>
              <div class="form-grid">
                <label class="field">
                  <span>Decision about the caffeine information</span>
                  <select v-model="draft.caffeineDecision">
                    <option value="">No new decision</option>
                    <option value="statement1">Use supplier statement 1</option>
                    <option value="statement2">Use supplier statement 2</option>
                    <option value="unresolved">The disagreement is still unresolved</option>
                  </select>
                </label>
                <label class="field">
                  <span>Why was this decision made?</span>
                  <textarea
                    v-model="draft.caffeineDecisionReason"
                    rows="2"
                    maxlength="1000"
                    placeholder="For example, the supplier confirmed which specification applies."
                  />
                </label>
              </div>
              <p class="field-hint">
                Both statements and earlier decisions are retained. The selected statement is not yet
                used in product calculations, so the disagreement remains flagged for now.
              </p>
            </template>
            <label
              v-if="record?.ingredientIdentity && (record.ingredientIdentity.specification.reference !== draft.specificationReference || record.ingredientIdentity.specification.sourceDate !== draft.specificationDate) && draft.ingredientIdentity"
              class="field"
            >
              <span>
                <input
                  v-model="draft.confirmIdentityForCurrentSpec"
                  type="checkbox"
                >
                I checked this identity against the current specification.
              </span>
              <small>The saved identity belongs to an earlier specification until reconfirmed.</small>
            </label>
            <p class="field-hint">
              Record only what the supplier states for this ingredient as supplied. Blank is unknown, not zero.
              Caffeine information is not yet used to calculate product totals.
              <template v-if="record?.caffeineEvidence && (record.caffeineEvidence.specification.reference !== draft.specificationReference || record.caffeineEvidence.specification.sourceDate !== draft.specificationDate)">
                The saved caffeine information belongs to an earlier specification; review it before relying on it.
              </template>
            </p>
            <label
              v-if="record?.caffeineEvidence && (record.caffeineEvidence.specification.reference !== draft.specificationReference || record.caffeineEvidence.specification.sourceDate !== draft.specificationDate) && draft.caffeineStatus && draft.caffeineStatus !== 'conflicting'"
              class="field"
            >
              <span>
                <input
                  v-model="draft.confirmCaffeineForCurrentSpec"
                  type="checkbox"
                >
                I checked this caffeine information against the current specification.
              </span>
            </label>
          </details>
          <p class="field-hint">
            Where to find it: the document your supplier sent with this ingredient. Its number and date
            let you, or a consultant, trace each figure back later. You need this before entering
            nutrition or allergen details.
          </p>
          <div class="form-grid">
            <label class="field">
              <span>Specification reference</span>
              <input
                v-model="draft.specificationReference"
                maxlength="120"
                autocomplete="off"
                placeholder="Document number or version"
              >
            </label>
            <label class="field">
              <span>Specification date</span>
              <input
                v-model="draft.specificationDate"
                type="date"
              >
            </label>
          </div>
          <details>
            <summary>Other information stated by this supplier (optional)</summary>
            <p class="field-hint">
              Only record information the supplier actually provides for this ingredient. These entries
              do not replace the ingredient or additive list, and are not yet used in product checks.
              Blank means unknown, not absent. Keep supplier documents if statements disagree.
            </p>
            <div
              v-for="topic in supplierFactTopics"
              :key="topic.key"
              class="field-group"
            >
              <label class="field">
                <span>{{ topic.label }}</span>
                <select v-model="draft.supplierFacts[topic.key].status">
                  <option value="">Not stated or unknown</option>
                  <option value="present">Supplier says present</option>
                  <option value="absent">Supplier confirms absent</option>
                </select>
                <small v-if="topic.key === 'otherSchedule28'">
                  Excludes caffeine, added vitamins and added taurine recorded separately. Use this
                  only when the supplier explicitly confirms whether any other Schedule 28
                  substances have been added. This does not establish whether such substances
                  occur naturally. Do not guess from a name or an incomplete list. If present,
                  also record the named substances and amounts where supplied.
                </small>
              </label>
              <ul
                v-if="supplierStatements(record, topic.key)?.length"
                class="review-list"
              >
                <li
                  v-for="(statement, index) in supplierStatements(record, topic.key)"
                  :key="index"
                >
                  {{ statement.status === 'present' ? 'Present' : 'Absent' }}:
                  {{ statement.specification.reference }}, {{ statement.specification.sourceDate }}
                </li>
              </ul>
              <p
                v-if="supplierStatements(record, topic.key)?.some((statement) => statement.status === 'present') && supplierStatements(record, topic.key)?.some((statement) => statement.status === 'absent')"
                class="field-hint"
              >
                Supplier statements disagree. Both are retained; do not treat the latest statement as automatically resolving the disagreement.
              </p>
              <p
                v-if="supplierStatements(record, topic.key)?.length && !supplierStatements(record, topic.key)?.some((statement) => statement.status === draft.supplierFacts[topic.key].status && statement.specification.reference === draft.specificationReference && statement.specification.sourceDate === draft.specificationDate)"
                class="field-hint"
              >
                The saved statement is from an earlier specification. Check the current document before relying on it.
              </p>
              <label
                v-if="supplierStatements(record, topic.key)?.length && draft.supplierFacts[topic.key].status"
                class="check-item"
              >
                <input
                  v-model="draft.supplierFacts[topic.key].confirmCurrentSpec"
                  type="checkbox"
                >
                <span>Also record this statement against the specification currently shown above.</span>
              </label>
            </div>
          </details>
        </fieldset>
      </details>

      <details class="ingredient-section">
        <summary>Nutrition</summary>
        <fieldset class="field-group">
          <legend>Nutrient values, per 100 g</legend>
          <p class="field-hint">
            Where to find it: the "nutrition information" table on the spec sheet, in the per 100 g
            column. Only enter values shown there. Blank means "not supplied", never zero.
          </p>
          <div class="nutrient-grid">
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
          <details @toggle="onVolumeNutritionToggle">
            <summary>Supplier values per 100 mL (if supplied)</summary>
            <p class="field-hint">
              Enter only values shown per 100 mL of the supplied ingredient. They are saved separately
              and are not yet used in product nutrition calculations; no density is assumed.
            </p>
            <div
              v-if="volumeNutritionOpen"
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
          </details>
        </fieldset>
      </details>

      <details class="ingredient-section">
        <summary>Allergens</summary>
        <fieldset class="field-group">
          <legend>Allergens identified by supplier</legend>
          <p class="field-hint">
            Tick any allergen the spec sheet says is in this ingredient. Ticking nothing means "not
            recorded", not "allergen-free".
          </p>
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
            <span>I checked the supplier information for every allergen shown, including those in additives.
              The ticked allergens are present and each unticked allergen is confirmed absent.
              Do not tick this if any answer is unknown.</span>
          </label>
        </fieldset>
      </details>

      <details class="ingredient-section">
        <summary>Additives and other ingredients</summary>
        <fieldset class="field-group">
          <legend>Additive source records</legend>
          <p class="field-hint">
            Does the spec sheet list additives such as a preservative, colour, sweetener or thickener? If
            not, confirm that below. If so, add each one. Enter what the sheet says; we use it to draft the
            ingredient list and to check amounts, but a consultant must confirm the final wording.
          </p>
          <label class="check-item">
            <input
              v-model="draft.additivesConfirmed"
              type="checkbox"
            >
            <span>The supplier confirms this ingredient contains no additives, or I have recorded every
              additive the supplier confirms is present. Do not tick this if the information is incomplete.</span>
          </label>
          <fieldset
            v-for="(source, index) in draft.additiveSources"
            :key="source.id"
            class="field-group additive-source-field"
          >
            <legend>Additive source {{ index + 1 }}</legend>
            <div class="form-grid">
              <label class="field">
                <span>Additive identity <b aria-hidden="true">*</b></span>
                <input
                  v-model="source.additiveName"
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
                <small class="field-hint">The "E number" or INS number on the sheet, such as 211. Leave blank if there isn't one.</small>
              </label>
              <label class="field full">
                <span>Technological purpose(s)</span>
                <textarea
                  v-model="source.technologicalPurposes"
                  rows="2"
                  maxlength="500"
                  placeholder="One source-described purpose per line"
                />
                <small class="field-hint">What the additive does, in the sheet's words, such as "preservative" or "thickener".</small>
              </label>
              <label class="field">
                <span>Source status</span>
                <select v-model="source.sourceStatus">
                  <option value="unknown">Not sure yet</option>
                  <option value="added">Added to this ingredient</option>
                  <option value="carriedOver">Carried over from one of its own ingredients</option>
                  <option value="processingAid">Processing aid (used in making it, not in the end product)</option>
                </select>
              </label>
              <label class="field">
                <span>Declaration route</span>
                <select v-model="source.declarationRoute">
                  <option value="unknown">Not sure yet (a consultant can choose)</option>
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
            </div>

            <label class="check-item">
              <input
                v-model="source.showAmount"
                type="checkbox"
              >
              <span>The spec sheet gives an amount for this additive</span>
            </label>
            <div
              v-if="source.showAmount"
              class="form-grid"
            >
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
                <span>Figure already converted to (optional)</span>
                <input
                  v-model="source.concentrationCalculatedAs"
                  maxlength="80"
                  autocomplete="off"
                  placeholder="e.g. benzoic acid"
                >
                <small class="field-hint">
                  Some limits are stated as a substance, such as benzoic acid. Enter the figure already
                  converted and name that substance here. The system never converts for you.
                </small>
              </label>
            </div>

            <label class="check-item">
              <input
                v-model="source.showEvidence"
                type="checkbox"
              >
              <span>Record where this came from (and any allergens it contains)</span>
            </label>
            <div
              v-if="source.showEvidence"
              class="form-grid"
            >
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
              <div class="field full">
                <span>Allergens this additive contains, per the sheet</span>
                <div class="check-grid">
                  <label
                    v-for="choice in allergenChoices"
                    :key="choice.id"
                    class="check-item"
                  >
                    <input
                      v-model="source.allergenIdsPresent"
                      type="checkbox"
                      :value="choice.id"
                    >
                    <span>{{ choice.label }}</span>
                  </label>
                </div>
                <small class="field-hint">Only tick what the sheet says. Nothing ticked means "not recorded".</small>
              </div>
            </div>

            <AppButton
              variant="outline"
              size="sm"
              type="button"
              :aria-label="`Remove additive source ${index + 1}`"
              @click="draft.additiveSources.splice(index, 1)"
            >
              Remove additive source
            </AppButton>
          </fieldset>
          <AppButton
            variant="outline"
            size="sm"
            type="button"
            @click="addAdditive"
          >
            Add additive source
          </AppButton>
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
              v-for="step in steps.slice(0, 5)"
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
