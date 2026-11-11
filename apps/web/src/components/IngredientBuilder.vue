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
} from '../ingredient-form';
import { allergenChoices } from '../rule-data';
import AppButton from './ui/button/AppButton.vue';
import BuilderShell, { type BuilderStep } from './BuilderShell.vue';

const props = defineProps<{
  record?: IngredientRecord | undefined;
  formulations: readonly FormulationRecord[];
  makeId: (prefix: string) => string;
}>();
const emit = defineEmits<{ save: [record: IngredientRecord]; cancel: [] }>();

const draft = reactive(props.record ? draftFromIngredient(props.record) : emptyIngredientDraft());
const activeStep = ref(0);
const errorMessage = ref('');

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

const statuses = computed(() => ingredientStepStatuses(draft));
const steps = computed<BuilderStep[]>(() => [
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

    <BuilderShell
      v-model="activeStep"
      :steps="steps"
    >
      <div
        v-if="activeStep === 0"
        class="form-grid"
      >
        <p class="field-hint full">
          Start with the basics. You can come back to any step at any time, and save an unfinished
          draft whenever you like.
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

      <fieldset
        v-else-if="activeStep === 1"
        class="field-group"
      >
        <legend>Supplier specification</legend>
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
      </fieldset>

      <fieldset
        v-else-if="activeStep === 2"
        class="field-group"
      >
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
      </fieldset>

      <fieldset
        v-else-if="activeStep === 3"
        class="field-group"
      >
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

      <fieldset
        v-else-if="activeStep === 4"
        class="field-group"
      >
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

      <div
        v-else
        class="field-group"
      >
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

      <template #actions>
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
      </template>
    </BuilderShell>
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
