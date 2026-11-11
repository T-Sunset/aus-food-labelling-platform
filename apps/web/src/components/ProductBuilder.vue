<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { FormulationRecord, IngredientRecord, LocalFoodStore, ProductRecord } from '@aus-food/storage';
import {
  buildProductChanges,
  draftFromProduct,
  emptyProductDraft,
  foodStateOptions,
  newProductRecord,
  nutritionRecipeSignature,
  productStepStatuses,
  type ProductChanges,
} from '../product-form';
import { makeLabelDraft } from '../label-draft';
import AdditiveNameChecksPanel from './AdditiveNameChecksPanel.vue';
import ClaimsPanel from './ClaimsPanel.vue';
import ProductTypeStep from './ProductTypeStep.vue';
import AppButton from './ui/button/AppButton.vue';
import BuilderShell, { type BuilderStep } from './BuilderShell.vue';

const props = defineProps<{
  store: LocalFoodStore;
  record?: ProductRecord | undefined;
  products: readonly ProductRecord[];
  formulations: readonly FormulationRecord[];
  ingredients: readonly IngredientRecord[];
  makeId: (prefix: string) => string;
  refresh: () => Promise<void>;
}>();
const emit = defineEmits<{ cancel: []; go: [section: string]; created: [id: string] }>();

const draft = reactive(props.record ? draftFromProduct(props.record) : emptyProductDraft());
const savedId = ref(props.record?.id);
const activeStep = ref(0);
const errorMessage = ref('');
const message = ref('');

const saved = computed(() => props.products.find((item) => item.id === savedId.value));
const recipe = computed(() => props.formulations.find((item) => item.id === draft.formulationId));
const nutritionRecipe = computed(() => {
  if (!draft.formulationId) return { signature: '', error: '' };
  try {
    return { signature: nutritionRecipeSignature(draft.formulationId, props.formulations), error: '' };
  } catch (error) {
    return { signature: '', error: error instanceof Error ? error.message : 'The recipe could not be read.' };
  }
});
const currentSignature = computed(() => nutritionRecipe.value.signature);
if (props.record?.packDetails?.nutritionRecipeSignature !== currentSignature.value) {
  draft.nutritionBasisConfirmed = false;
}
watch(currentSignature, () => { draft.nutritionBasisConfirmed = false; });
const statuses = computed(() => {
  const result = productStepStatuses(draft, saved.value);
  const needsDensity = draft.nutritionFoodForm === 'liquid' || draft.servingUnit === 'mL';
  const densityEntered = /^\d+(\.\d+)?$/.test(draft.nutritionDensity.trim())
    && Number.isFinite(Number(draft.nutritionDensity)) && Number(draft.nutritionDensity) > 0
    && draft.nutritionDensityReference.trim() !== '' && draft.nutritionDensityDate !== '';
  const packComplete = result.pack.done && draft.nutritionFoodForm !== ''
    && draft.nutritionBasisConfirmed && currentSignature.value !== ''
    && (!needsDensity || densityEntered);
  result.pack = { done: packComplete, text: packComplete ? 'Answered' : 'Still needed' };
  if (saved.value && saved.value.formulationId === draft.formulationId) {
    const complete = makeLabelDraft(saved.value, props.formulations, props.ingredients).additivesComplete;
    result.additives = { done: complete, text: complete ? 'Information entered' : 'Still needed' };
  }
  return result;
});
const steps = computed<BuilderStep[]>(() => [
  { id: 'about', title: 'About it', status: statuses.value.about.text, done: statuses.value.about.done },
  { id: 'type', title: 'What is it?', status: statuses.value.type.text, done: statuses.value.type.done },
  { id: 'pack', title: 'Pack details', status: statuses.value.pack.text, done: statuses.value.pack.done },
  {
    id: 'additives',
    title: 'Additives & names',
    status: statuses.value.additives.text,
    done: statuses.value.additives.done,
  },
  { id: 'claims', title: 'Claims', status: statuses.value.claims.text, done: statuses.value.claims.done },
  { id: 'review', title: 'Review' },
]);

// Saves only the basics and pack details, so answers saved by the other steps are never overwritten.
async function saveBasics(): Promise<boolean> {
  errorMessage.value = '';
  message.value = '';
  try {
    let createdId: string | undefined;
    const changes: ProductChanges = buildProductChanges(
      draft,
      props.formulations.map((item) => item.id),
      draft.nutritionBasisConfirmed ? currentSignature.value : undefined,
    );
    if (savedId.value === undefined) {
      const record = newProductRecord(changes, props.makeId('product'), new Date().toISOString());
      await props.store.products.create(record);
      savedId.value = record.id;
      createdId = record.id;
    } else {
      // A cleared pack detail is sent as an explicit undefined so storage removes it.
      const edits: Record<string, unknown> = { ...changes };
      await props.store.products.update(savedId.value, edits);
    }
    await props.refresh();
    if (createdId) emit('created', createdId);
    message.value = 'Saved on this device.';
    return true;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'This product could not be saved.';
    return false;
  }
}

async function saveAndContinue(): Promise<void> {
  if (await saveBasics()) {
    activeStep.value = 1;
  }
}

function summaryLine(done: boolean, doneText: string, todoText: string): string {
  return done ? doneText : todoText;
}
</script>

<template>
  <section class="panel editor-panel">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">
          {{ record ? 'EDIT DRAFT' : 'NEW DRAFT' }}
        </p>
        <h2>Product record</h2>
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
          A product is what you sell. Name it, choose the recipe it is made from, and say what state it is
          sold in.
        </p>
        <label class="field full">
          <span>Product name <b aria-hidden="true">*</b></span>
          <input
            v-model="draft.name"
            maxlength="120"
            autocomplete="off"
            placeholder="Working name"
          >
        </label>
        <label class="field full">
          <span>Recipe (formulation) <b aria-hidden="true">*</b></span>
          <select v-model="draft.formulationId">
            <option
              value=""
              disabled
            >Choose a recipe</option>
            <option
              v-for="item in formulations"
              :key="item.id"
              :value="item.id"
            >
              {{ item.name }}
            </option>
          </select>
        </label>
        <p
          v-if="formulations.length === 0"
          class="inline-empty full"
        >
          You haven't saved a recipe yet. Add one on the Formulations page first.
        </p>
        <label class="field full">
          <span>Food state <b aria-hidden="true">*</b></span>
          <select v-model="draft.foodState">
            <option
              value=""
              disabled
            >Choose one</option>
            <option
              v-for="option in foodStateOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>
        <div class="full">
          <AppButton
            type="button"
            @click="saveAndContinue"
          >
            Save and continue <span aria-hidden="true">→</span>
          </AppButton>
        </div>
      </div>

      <template v-else-if="activeStep === 1">
        <p
          v-if="saved === undefined"
          class="inline-empty"
        >
          Save the first step ("About it") before answering these questions.
        </p>
        <ProductTypeStep
          v-else
          :key="saved.id"
          :store="store"
          :product="saved"
          @saved="refresh"
        />
      </template>

      <div
        v-else-if="activeStep === 2"
        class="form-grid"
      >
        <p class="field-hint full">
          These come from your pack design and your supplier or packer. Leave a box empty if you don't know
          yet: we treat it as unknown, never as zero.
        </p>
        <label class="field">
          <span>Serving size</span>
          <input
            v-model="draft.servingSize"
            inputmode="decimal"
            placeholder="e.g. 250"
          >
        </label>
        <label class="field">
          <span>Serving size unit</span>
          <select v-model="draft.servingUnit">
            <option value="">Choose a unit</option>
            <option value="g">g</option>
            <option value="mL">mL</option>
          </select>
        </label>
        <label class="field">
          <span>Servings per pack</span>
          <input
            v-model="draft.servingsPerPack"
            inputmode="decimal"
            placeholder="e.g. 2"
          >
        </label>
        <label class="field">
          <span>Net contents</span>
          <input
            v-model="draft.netQuantity"
            inputmode="decimal"
            placeholder="e.g. 500"
          >
        </label>
        <label class="field">
          <span>Net contents unit</span>
          <select v-model="draft.netUnit">
            <option value="">Choose a unit</option>
            <option value="g">g (solid foods)</option>
            <option value="mL">mL (liquids)</option>
          </select>
        </label>
        <label class="field full">
          <span>Is the food solid or liquid?</span>
          <select v-model="draft.nutritionFoodForm">
            <option value="">Choose one</option>
            <option value="solid">Solid</option>
            <option value="liquid">Liquid</option>
          </select>
        </label>
        <label class="full">
          <input
            v-model="draft.nutritionBasisConfirmed"
            type="checkbox"
          >
          I have checked that the recipe amounts and supplier nutrient values represent the food as sold,
          with no change in mass or nutrient content during preparation or processing. If density is entered,
          it applies to this recipe as sold.
        </label>
        <p class="field-hint full">
          If that is not true or you are unsure, leave this unchecked. The draft panel cannot yet calculate
          nutrition after processing or preparation.
        </p>
        <p
          v-if="nutritionRecipe.error"
          class="field-hint full"
          role="alert"
        >
          Nutrition recipe needs attention: {{ nutritionRecipe.error }}
        </p>
        <template v-if="draft.servingUnit === 'mL' || draft.nutritionFoodForm === 'liquid'">
          <p class="field-hint full">
            For volume amounts, enter the final food's density and its evidence.
          </p>
          <label class="field">
            <span>Final food density (g/mL)</span>
            <input
              v-model="draft.nutritionDensity"
              inputmode="decimal"
              placeholder="e.g. 1.02"
            >
          </label>
          <label class="field">
            <span>Density evidence reference</span>
            <input v-model="draft.nutritionDensityReference">
          </label>
          <label class="field">
            <span>Density evidence date</span>
            <input
              v-model="draft.nutritionDensityDate"
              type="date"
            >
          </label>
        </template>
        <div class="full">
          <AppButton
            type="button"
            :disabled="saved === undefined"
            @click="saveBasics"
          >
            Save pack details
          </AppButton>
          <p
            v-if="saved === undefined"
            class="field-hint"
          >
            Save the first step ("About it") first.
          </p>
        </div>
      </div>

      <template v-else-if="activeStep === 3">
        <p
          v-if="saved === undefined"
          class="inline-empty"
        >
          Save the first step ("About it") before this step.
        </p>
        <AdditiveNameChecksPanel
          v-else
          :key="saved.id"
          :store="store"
          :products="products"
          :formulations="formulations"
          :ingredients="ingredients"
          :product-id="saved.id"
          @saved="refresh"
        />
      </template>

      <template v-else-if="activeStep === 4">
        <p
          v-if="saved === undefined"
          class="inline-empty"
        >
          Save the first step ("About it") before this step.
        </p>
        <ClaimsPanel
          v-else
          :key="saved.id"
          :store="store"
          :products="products"
          :formulations="formulations"
          :ingredients="ingredients"
          :product-id="saved.id"
          @saved="refresh"
        />
      </template>

      <div
        v-else
        class="field-group"
      >
        <h3>Review</h3>
        <ul class="review-list">
          <li>
            <strong>About it:</strong>
            {{ summaryLine(statuses.about.done, `${draft.name} made from ${recipe?.name ?? 'a recipe'}.`, 'Still needed.') }}
          </li>
          <li>
            <strong>What is it?</strong>
            {{ summaryLine(statuses.type.done, 'Answered.', 'Still needed. Needs attention!') }}
          </li>
          <li>
            <strong>Pack details:</strong>
            {{ summaryLine(statuses.pack.done, 'Answered.', 'Still needed. Needs attention!') }}
          </li>
          <li>
            <strong>Additives &amp; names:</strong>
            {{ summaryLine(statuses.additives.done, 'Answered.', 'Still needed. Needs attention!') }}
          </li>
          <li>
            <strong>Claims:</strong>
            {{ summaryLine(statuses.claims.done, 'Answered.', 'None entered (optional).') }}
          </li>
        </ul>
        <p class="field-hint">
          Anything marked "Needs attention!" is still missing. You can save now and finish later. A label
          built from these answers is a draft: consultant review recommended before use.
        </p>
        <AppButton
          variant="link"
          size="sm"
          type="button"
          @click="emit('go', 'labels')"
        >
          Open Labels <span aria-hidden="true">→</span>
        </AppButton>
      </div>

      <template #actions>
        <AppButton
          v-if="activeStep !== 0 && activeStep !== 1 && activeStep !== 3 && activeStep !== 4"
          type="button"
          :disabled="saved === undefined"
          @click="saveBasics"
        >
          Save product draft
        </AppButton>
        <AppButton
          variant="outline"
          type="button"
          @click="emit('cancel')"
        >
          Back to product list
        </AppButton>
      </template>
    </BuilderShell>
    <p
      v-if="message"
      class="field-hint"
      role="status"
    >
      {{ message }}
    </p>
    <p
      v-if="errorMessage"
      class="notice error"
      role="alert"
    >
      {{ errorMessage }}
    </p>
  </section>
</template>
