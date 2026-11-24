<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
import type { ApprovedVersionRecord, FormulationRecord, IngredientRecord, LocalFoodStore, ProductRecord } from '@aus-food/storage';
import {
  buildProductChanges,
  drainingSnapshot,
  draftFromProduct,
  emptyProductDraft,
  foodStateOptions,
  newProductRecord,
  nutritionRecipeSignature,
  preparationIngredientSignature,
  preparationRecipeSignature,
  preparationSnapshot,
  productStepStatuses,
  suggestedNetContents,
  usesRoutineAsSoldMethod,
  type ProductChanges,
} from '../product-form';
import { makeLabelDraft, type LabelIssue, type ReviewAction, type ReviewArea, type ReviewSection } from '../label-draft';
import { productCompletionItems } from '../product-completion';
import { nutritionRows } from '../nip-draft';
import ProductTypeStep from './ProductTypeStep.vue';
import ReviewTracePanel from './ReviewTracePanel.vue';
import AppButton from './ui/button/AppButton.vue';
import type { BuilderStep } from './BuilderShell.vue';

const props = defineProps<{
  store: LocalFoodStore;
  record?: ProductRecord | undefined;
  products: readonly ProductRecord[];
  formulations: readonly FormulationRecord[];
  ingredients: readonly IngredientRecord[];
  versions: readonly ApprovedVersionRecord[];
  reviewRequest: number;
  makeId: (prefix: string) => string;
  refresh: () => Promise<void>;
}>();
const emit = defineEmits<{
  cancel: [];
  'open-labels': [id: string | undefined];
  created: [id: string];
  'edit-recipe': [id: string];
  'edit-ingredient': [id: string];
  dirty: [value: boolean];
}>();

const draft = reactive(props.record ? draftFromProduct(props.record) : emptyProductDraft());
const savedPreparation = props.record?.preparation;
const savedAddedFood = props.ingredients.find((item) => item.id === savedPreparation?.addedIngredientId);
const savedPreparationRecipe = props.record && preparationRecipeSignature(props.record.formulationId, props.formulations, props.ingredients);
if (props.record && savedPreparation?.mixingConfirmed && (!savedAddedFood || !savedPreparationRecipe || !savedPreparation.confirmationSnapshot
  || savedPreparation.confirmationSnapshot !== preparationSnapshot(
    savedPreparation, props.record.formulationId, savedAddedFood, props.record.packDetails?.nutritionDensity, savedPreparationRecipe,
  ))) draft.preparationMixingConfirmed = false;
if (props.record?.draining?.confirmationSnapshot && (!savedPreparationRecipe
  || props.record.draining.confirmationSnapshot !== drainingSnapshot(props.record.draining, savedPreparationRecipe))) {
  draft.drainedConfirmed = false;
}
const savedId = ref(props.record?.id);
const errorMessage = ref('');
const message = ref('');
const openSections = reactive<Record<string, boolean>>({
  about: true, pack: true, nutrition: true, type: false, review: false,
});
const typeDirty = ref(false);
const tracePanel = ref<InstanceType<typeof ReviewTracePanel>>();

const saved = computed(() => props.products.find((item) => item.id === savedId.value));
const savedLabelDraft = computed(() => saved.value
  ? makeLabelDraft(saved.value, props.formulations, props.ingredients) : undefined);
const completionItems = computed(() => saved.value && savedLabelDraft.value
  ? productCompletionItems(saved.value, savedLabelDraft.value, props.formulations, props.ingredients) : []);
const reviewAreaInfo: { id: ReviewArea; title: string; guidance: string }[] = [
  { id: 'product', title: 'Product details', guidance: 'Complete or check the product and its type.' },
  { id: 'pack', title: 'Pack and servings', guidance: 'Enter the missing pack and serving details.' },
  { id: 'recipe', title: 'Recipe', guidance: 'Check the recipe, ingredient amounts and any processing.' },
  { id: 'ingredients', title: 'Ingredient information', guidance: 'Check the recorded ingredient, allergen and additive information.' },
  { id: 'nutrition', title: 'Nutrition and directions', guidance: 'Check the food state, nutrition inputs and any customer directions.' },
  { id: 'additives', title: 'Additive and name checks', guidance: 'These draft checks cover selected product types only. Review applicability and any available inputs.' },
  { id: 'labels', title: 'Label wording', guidance: 'Check additive wording on each label.' },
];
const reviewGroups = computed(() => reviewAreaInfo.flatMap((area) => {
  const items = savedLabelDraft.value?.issues.filter((issue) => issue.area === area.id) ?? [];
  return items.length ? [{ ...area, items }] : [];
}));
const reviewSectionNames: Record<ReviewSection, string> = {
  about: 'product and recipe', type: 'product type', pack: 'pack and servings',
  directions: 'customer directions', nutrition: 'nutrition', technical: 'technical additive and name review',
};
function availableActions(issue: Pick<LabelIssue, 'actions'>): ReviewAction[] {
  const available = issue.actions.filter((action) => {
    if (action.kind === 'ingredient') return props.ingredients.some((item) => item.id === action.id);
    if (action.kind === 'recipe') return props.formulations.some((item) => item.id === action.id);
    return true;
  });
  return available.length ? available : [{ kind: 'section', section: 'about' }];
}
function actionLabel(action: ReviewAction): string {
  if (action.kind === 'section') return `Open ${reviewSectionNames[action.section]}`;
  if (action.kind === 'labels') return 'Open Labels';
  const record = action.kind === 'ingredient'
    ? props.ingredients.find((item) => item.id === action.id)
    : props.formulations.find((item) => item.id === action.id);
  const records = action.kind === 'ingredient' ? props.ingredients : props.formulations;
  const duplicate = record && records.filter((item) => item.name === record.name).length > 1;
  return `Edit ${action.kind} ${record?.name ?? ''}${duplicate ? ` (${action.id})` : ''}`;
}
function openReviewAction(action: ReviewAction): void {
  if (action.kind === 'section' && action.section === 'technical') {
    void openSection('review').then(() => tracePanel.value?.openAdditiveReview());
  } else if (action.kind === 'section') void openSection(action.section, true);
  else if (action.kind === 'labels') emit('open-labels', savedId.value);
  else if (action.kind === 'ingredient') emit('edit-ingredient', action.id);
  else emit('edit-recipe', action.id);
}
const reviewSavedFoodState = props.record !== undefined && props.record.foodState !== 'asSold';
const recipe = computed(() => props.formulations.find((item) => item.id === draft.formulationId));
const netContentsSuggestion = computed(() => suggestedNetContents(draft));
function useNetContentsSuggestion(): void {
  const suggestion = netContentsSuggestion.value;
  if (!suggestion) return;
  draft.netQuantity = suggestion.value;
  draft.netUnit = suggestion.unit;
}
const nutritionRecipe = computed(() => {
  if (!draft.formulationId) return { signature: '', error: '' };
  try {
    return { signature: nutritionRecipeSignature(draft.formulationId, props.formulations, props.ingredients), error: '' };
  } catch (error) {
    return { signature: '', error: error instanceof Error ? error.message : 'The recipe could not be read.' };
  }
});
const currentSignature = computed(() => nutritionRecipe.value.signature);
if (props.record?.packDetails?.nutritionRecipeSignature !== currentSignature.value) {
  draft.nutritionBasisConfirmed = false;
}
watch(currentSignature, () => { draft.nutritionBasisConfirmed = false; });
watch(() => draft.preparationEnabled, (enabled) => {
  if (enabled) draft.preparationPresent = true;
});
watch(() => [draft.preparationEnabled, draft.foodState], () => {
  if (draft.preparationEnabled && draft.foodState === 'asReconstituted' && !draft.preparationKind) {
    draft.preparationKind = 'reconstituted';
  }
}, { immediate: true });
watch(
  () => [draft.formulationId, draft.preparationKind, draft.preparationDirections, draft.preparationProductAmount,
    draft.preparationProductUnit, draft.preparationIngredientId, draft.preparationAddedAmount, draft.preparationAddedUnit,
    ...(draft.preparationProductUnit === 'mL'
      ? [draft.nutritionDensity, draft.nutritionDensityReference, draft.nutritionDensityDate] : [])],
  () => { draft.preparationMixingConfirmed = false; },
  { flush: 'sync' },
);
watch(() => {
  const ingredient = props.ingredients.find((item) => item.id === draft.preparationIngredientId);
  return ingredient ? preparationIngredientSignature(ingredient) : '';
}, () => { draft.preparationMixingConfirmed = false; });
watch(() => preparationRecipeSignature(draft.formulationId, props.formulations, props.ingredients),
  () => { draft.preparationMixingConfirmed = false; });
watch(() => draft.drainingEnabled, (enabled) => {
  if (enabled) draft.drainingPresent = true;
});
watch(() => [draft.formulationId, draft.drainingDirections, draft.drainedSourceType, draft.drainedSourceReference,
  draft.drainedSourceDate, JSON.stringify(draft.drainedValues)],
() => { draft.drainedConfirmed = false; }, { flush: 'sync' });
watch(() => preparationRecipeSignature(draft.formulationId, props.formulations, props.ingredients),
  () => { draft.drainedConfirmed = false; });
const savedDraftSnapshot = ref(JSON.stringify(draft));
const dirty = computed(() => JSON.stringify(draft) !== savedDraftSnapshot.value || typeDirty.value);
watch(dirty, (value) => emit('dirty', value), { immediate: true });
function beforeUnload(event: BeforeUnloadEvent): void {
  if (dirty.value) {
    event.preventDefault();
    event.returnValue = '';
  }
}
window.addEventListener('beforeunload', beforeUnload);
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload));
function leaveEditor(): void {
  if (!dirty.value || window.confirm('Discard unsaved product changes and return to the product list?')) {
    emit('cancel');
  }
}
function setSection(id: string, event: Event): void {
  if (event.target instanceof HTMLDetailsElement) openSections[id] = event.target.open;
}
async function openSection(id: string, focus = false): Promise<void> {
  const sectionId = id === 'directions' ? 'nutrition' : id;
  openSections[sectionId] = true;
  await nextTick();
  const section = document.getElementById(`product-section-${sectionId}`);
  section?.scrollIntoView({ block: 'start' });
  if (focus) section?.querySelector('summary')?.focus();
}
watch(() => props.reviewRequest, (request) => {
  if (request > 0) void openSection('review', true);
}, { immediate: true });
function changeDirections(): void {
  if (draft.consumerDirections === 'none') {
    draft.preparationEnabled = false;
    draft.drainingEnabled = false;
    draft.otherConsumerDirections = false;
  }
}
function openRecipeLine(kind: 'ingredient' | 'formulation', id: string): void {
  if (kind === 'ingredient') emit('edit-ingredient', id);
  else emit('edit-recipe', id);
}
const directionsAttention = computed(() => {
  if (draft.consumerDirections === 'unknown') return 'Confirm what the label tells customers to do before consuming.';
  if (draft.consumerDirections === 'none'
    && (draft.preparationEnabled || draft.drainingEnabled || draft.otherConsumerDirections
      || draft.foodState === 'asDrained' || draft.foodState === 'asReconstituted' || draft.foodState === 'asPrepared')) {
    return 'Recorded directions conflict with no directions. Review the actions above and the selected nutrition basis.';
  }
  if ((draft.foodState === 'asReconstituted' || draft.foodState === 'asPrepared') && !draft.preparationEnabled) {
    return 'The previously recorded food state indicates preparation. Select mixing if it applies, or review the recorded state below.';
  }
  if (draft.foodState === 'asDrained' && !draft.drainingEnabled) {
    return 'The previously recorded food state indicates draining. Select draining if it applies, or review the recorded state below.';
  }
  if (draft.foodState === 'asReconstituted' && draft.preparationKind === 'withFood') {
    return 'The preparation type conflicts with the previously recorded reconstituted state. Review both choices below.';
  }
  if (draft.consumerDirections === 'present'
    && !draft.preparationEnabled && !draft.drainingEnabled && !draft.otherConsumerDirections) {
    return 'Choose the directions that apply.';
  }
  if (draft.otherConsumerDirections) return 'Other or unclear directions need review.';
  if (draft.preparationEnabled && draft.drainingEnabled) return 'Mixing together with draining needs review.';
  if (draft.preparationEnabled && !draft.preparationDirections.trim()) return 'Enter the preparation directions below.';
  if (draft.drainingEnabled && !draft.drainingDirections.trim()) return 'Enter the draining directions below.';
  return '';
});
const routineAsSoldMethod = computed(() => usesRoutineAsSoldMethod(draft));
const needsPreparationBasisConfirmation = computed(() => Boolean(currentSignature.value)
  && !routineAsSoldMethod.value
  && !directionsAttention.value
  && !draft.drainingEnabled
  && (draft.foodState === 'asReconstituted'
    || (draft.preparationEnabled && draft.preparationKind === 'reconstituted')));
const recipeLines = computed(() => {
  if (!recipe.value) return [];
  return [...recipe.value.lines, ...(recipe.value.incompleteRecipeLines?.unquantifiedLines ?? [])].map((line) => ({
    id: line.id,
    kind: line.kind,
    recordId: line.kind === 'ingredient' ? line.ingredientId : line.formulationId,
    available: line.kind === 'ingredient'
      ? props.ingredients.some((item) => item.id === line.ingredientId)
      : props.formulations.some((item) => item.id === line.formulationId),
    name: line.kind === 'ingredient'
      ? props.ingredients.find((item) => item.id === line.ingredientId)?.name ?? 'Unavailable ingredient'
      : props.formulations.find((item) => item.id === line.formulationId)?.name ?? 'Unavailable nested recipe',
    quantity: 'quantity' in line ? `${line.quantity.value} ${line.quantity.unit}` : 'Amount unknown',
    source: line.kind === 'ingredient'
      ? props.ingredients.find((item) => item.id === line.ingredientId)?.nutritionEntrySource : undefined,
  }));
});
const statuses = computed(() => {
  const result = productStepStatuses(draft, saved.value);
  const nutrition = savedLabelDraft.value;
  const nutritionComplete = Boolean(nutrition && JSON.stringify(draft) === savedDraftSnapshot.value
    && !nutrition.nutrition.missing.length
    && !(nutrition.preparedNutrition?.missing.length)
    && !(nutrition.drainedNutrition?.missing.length)
    && !directionsAttention.value);
  const packComplete = result.pack.done && draft.nutritionFoodForm !== '';
  result.pack = { done: packComplete, text: packComplete ? 'Answered' : 'Still needed' };
  return { ...result, nutrition: { done: nutritionComplete, text: nutritionComplete ? 'Information entered' : 'Needs attention' } };
});
const steps = computed<BuilderStep[]>(() => [
  { id: 'about', title: 'Product and recipe', status: statuses.value.about.text, done: statuses.value.about.done },
  { id: 'pack', title: 'Pack and servings', status: statuses.value.pack.text, done: statuses.value.pack.done },
  { id: 'nutrition', title: 'Customer directions and nutrition', status: statuses.value.nutrition.text, done: statuses.value.nutrition.done },
  { id: 'type', title: 'What is it?', status: statuses.value.type.text, done: statuses.value.type.done },
  { id: 'review', title: 'Review' },
]);

// Saves only the basics and pack details, so answers saved by the other steps are never overwritten.
async function saveBasics(): Promise<boolean> {
  errorMessage.value = '';
  message.value = '';
  try {
    let createdId: string | undefined;
    if (routineAsSoldMethod.value && currentSignature.value) draft.nutritionBasisConfirmed = true;
    const snapshot = JSON.stringify(draft);
    const changes: ProductChanges = buildProductChanges(
      draft,
      props.formulations.map((item) => item.id),
      draft.nutritionBasisConfirmed ? currentSignature.value : undefined,
      props.ingredients,
      props.formulations,
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
    savedDraftSnapshot.value = snapshot;
    if (createdId) emit('created', createdId);
    message.value = 'Saved on this device.';
    return true;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'This product could not be saved.';
    return false;
  }
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
      <div class="product-actions">
        <span class="draft-pill">Draft</span>
        <AppButton
          variant="outline"
          type="button"
          @click="leaveEditor"
        >
          Back to product list
        </AppButton>
      </div>
    </div>
    <p
      v-if="dirty"
      class="field-hint"
      role="status"
    >
      There are unsaved changes in this Product page.
    </p>
    <nav
      aria-label="Product sections"
      class="product-jumps"
    >
      <button
        v-for="step in steps"
        :key="step.id"
        type="button"
        @click="openSection(step.id)"
      >
        {{ step.title }}
      </button>
    </nav>
    <div class="product-sections">
      <details
        id="product-section-about"
        :open="openSections.about"
        class="product-section"
        @toggle="setSection('about', $event)"
      >
        <summary>Product and recipe <small>{{ statuses.about.text }}</small></summary>
        <div class="form-grid">
          <p class="field-hint full">
            A product is what you sell. Choose its saved recipe; you do not need to enter that recipe again.
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
          <div
            v-if="recipe"
            class="full"
          >
            <strong>From the saved recipe</strong>
            <ul v-if="recipeLines.length">
              <li
                v-for="line in recipeLines"
                :key="line.id"
              >
                {{ line.name }} — {{ line.quantity }}
                <span v-if="line.source"> · Nutrition source: {{ line.source.sourceId }} ({{ line.source.sourceDate }})</span>
                <button
                  v-if="line.available"
                  type="button"
                  @click="openRecipeLine(line.kind, line.recordId)"
                >
                  Open {{ line.kind === 'ingredient' ? 'ingredient' : 'nested recipe' }}
                </button>
              </li>
            </ul>
            <p
              v-else
              class="field-hint"
            >
              No quantified ingredients are recorded in this recipe.
            </p>
            <details
              v-if="recipe.processMassProfile || recipe.finishedNutrition?.selected || recipe.nutrientRetention?.selected"
              class="full"
            >
              <summary>Manufacturing and nutrition details saved with this recipe</summary>
              <p class="field-hint">
                These details belong to the shared recipe. Customer directions and the nutrition basis for this
                product are recorded separately.
              </p>
              <p class="field-hint">
                Nutrition method:
                {{ recipe.finishedNutrition?.selected ? 'Finished-food evidence' : recipe.nutrientRetention?.selected
                  ? 'Processing and nutrient retention evidence' : 'Ingredient-based values' }}.
              </p>
              <p
                v-if="recipe.finishedNutrition?.selected && recipe.finishedNutrition.nutritionEntrySource"
                class="field-hint"
              >
                Finished-food source: {{ recipe.finishedNutrition.nutritionEntrySource.sourceId }}
                ({{ recipe.finishedNutrition.nutritionEntrySource.sourceDate }}).
              </p>
              <ul v-if="recipe.processMassProfile?.changes.length">
                <li
                  v-for="change in recipe.processMassProfile.changes"
                  :key="change.id"
                >
                  Processing {{ change.kind }}: {{ change.description || 'No description' }}
                  <span v-if="change.mass"> ({{ change.mass.value }} {{ change.mass.unit }})</span>
                </li>
              </ul>
              <p
                v-if="recipe.processMassProfile?.declaredFinalMass"
                class="field-hint"
              >
                Recorded final mass: {{ recipe.processMassProfile.declaredFinalMass.value }}
                {{ recipe.processMassProfile.declaredFinalMass.unit }}.
              </p>
            </details>
            <p
              v-if="nutritionRecipe.error"
              class="field-hint"
              role="alert"
            >
              Recipe needs attention: {{ nutritionRecipe.error }}
            </p>
            <AppButton
              variant="outline"
              type="button"
              @click="emit('edit-recipe', recipe.id)"
            >
              Open recipe
            </AppButton>
          </div>
        </div>
      </details>

      <details
        id="product-section-pack"
        :open="openSections.pack"
        class="product-section"
        @toggle="setSection('pack', $event)"
      >
        <summary>Pack and servings <small>{{ statuses.pack.text }}</small></summary>
        <div class="form-grid">
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
          <div
            v-if="netContentsSuggestion"
            class="field-hint full"
          >
            <p>
              Serving size × servings per pack is {{ netContentsSuggestion.value }} {{ netContentsSuggestion.unit }}.
              Use this only if both figures describe the whole pack as sold. Servings may be approximate;
              check the actual net contents.
            </p>
            <AppButton
              type="button"
              variant="outline"
              size="sm"
              @click="useNetContentsSuggestion"
            >
              Use {{ netContentsSuggestion.value }} {{ netContentsSuggestion.unit }} for net contents
            </AppButton>
            <p>If serving details change later, check the net contents again.</p>
          </div>
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
            <small>Describe the product as sold. This helps choose the nutrition amount per 100 g or 100 mL.</small>
          </label>
        </div>
      </details>

      <details
        id="product-section-nutrition"
        :open="openSections.nutrition"
        class="product-section"
        @toggle="setSection('nutrition', $event)"
      >
        <summary>Customer directions and nutrition <small>{{ statuses.nutrition.text }}</small></summary>
        <div class="nutrition-fields">
          <p class="field-hint full">
            Tell us what the label directs customers to do before consuming the product. This is separate from
            processing while you make it.
          </p>
          <label class="field">
            <span>What does the label tell customers to do before consuming this product?</span>
            <select
              v-model="draft.consumerDirections"
              @change="changeDirections"
            >
              <option value="unknown">Not sure yet</option>
              <option value="none">Nothing before consuming</option>
              <option value="present">Directions apply</option>
            </select>
          </label>
          <div
            v-if="draft.consumerDirections === 'present'"
            class="directions-options"
          >
            <p>Select the actions that apply:</p>
            <label class="check-item"><input
              v-model="draft.preparationEnabled"
              type="checkbox"
            > Mix with water or another food or liquid</label>
            <label class="check-item"><input
              v-model="draft.drainingEnabled"
              type="checkbox"
            > Drain</label>
            <label class="check-item"><input
              v-model="draft.otherConsumerDirections"
              type="checkbox"
            > Other or unclear directions</label>
            <label
              v-if="draft.otherConsumerDirections"
              class="field"
            >
              <span>Other directions (if known)</span>
              <textarea
                v-model="draft.otherConsumerDirectionsText"
                maxlength="1000"
              />
            </label>
            <p class="field-hint">
              Enter details below only for the actions you selected. Other directions or combinations may need review.
            </p>
          </div>
          <p
            v-if="directionsAttention"
            class="field-hint full"
          >
            <strong>Needs attention:</strong> {{ directionsAttention }}
          </p>
          <div
            v-if="reviewSavedFoodState"
            class="saved-state-review"
          >
            <p class="field-hint">
              This product has an older nutrition state that cannot be changed automatically.
              Review it alongside the customer directions. Changing it can affect serving sizes and calculations.
              If you are unsure, leave it unchanged and review the result.
            </p>
            <label class="field">
              <span>Previously recorded food state</span>
              <select v-model="draft.foodState">
                <option value="">Not specified</option>
                <option
                  v-for="option in foodStateOptions"
                  :key="option.value"
                  :value="option.value"
                >{{ option.label }}</option>
              </select>
            </label>
            <p
              v-if="!draft.foodState"
              class="field-hint"
            >
              The food state is not specified, so the nutrition basis needs review.
            </p>
            <p
              v-if="draft.foodState && !['asSold', 'asPrepared', 'asReconstituted', 'asDrained'].includes(draft.foodState)"
              class="field-hint"
            >
              This selected state is not supported as a label nutrition basis yet and needs review.
            </p>
          </div>
          <template v-if="draft.foodState !== 'asDrained'">
            <p
              v-if="routineAsSoldMethod && currentSignature"
              class="field-hint full"
            >
              For the usual as-sold draft, we use the nutrition information recorded with this recipe. If no
              specific after-making nutrition information is recorded, we calculate from its ingredient amounts
              and known nutrient values. You do not need to confirm this again. If that method does not represent
              the product well, add relevant information to the shared recipe.
            </p>
            <label
              v-else-if="needsPreparationBasisConfirmation"
              class="full"
            >
              <input
                v-model="draft.nutritionBasisConfirmed"
                type="checkbox"
              >
              I have checked that the saved recipe and nutrition information are a suitable starting point for
              this product's reconstitution.
            </label>
            <p
              v-if="recipe?.finishedNutrition?.selected"
              class="field-hint full"
            >
              The selected finished-food values describe the recipe after its recorded processing.
            </p>
            <p
              v-else-if="recipe?.nutrientRetention?.selected"
              class="field-hint full"
            >
              The selected estimates use the recorded processing, batch weight and nutrient retention evidence.
            </p>
            <p
              v-if="nutritionRecipe.error"
              class="field-hint full"
              role="alert"
            >
              Nutrition recipe needs attention: {{ nutritionRecipe.error }}
            </p>
            <template
              v-if="draft.servingUnit === 'mL' || draft.nutritionFoodForm === 'liquid' || props.record?.builderProductType === 'caffeinatedBeverage'"
            >
              <p class="field-hint full">
                Enter the final food's density if known. The caffeine range calculation needs a positive
                density to convert its result to mg/L; source details are optional.
              </p>
              <label class="field">
                <span>Final food density (g/mL)</span>
                <input
                  v-model="draft.nutritionDensity"
                  inputmode="decimal"
                  placeholder="e.g. 1.02"
                >
              </label>
              <p
                v-if="props.record?.builderProductType === 'caffeinatedBeverage'"
                class="field-hint full"
              >
                The provisional caffeine range check uses this numeric density without requiring a source
                reference. Missing or conflicting recipe facts and unsupported processing stay REVIEW REQUIRED.
              </p>
              <details class="full">
                <summary>Density source details (optional)</summary>
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
              </details>
            </template>
          </template>
          <section
            v-if="draft.preparationEnabled || draft.foodState === 'asReconstituted'"
            class="direction-details"
          >
            <h3>Mixing before consuming</h3>
            <p class="field-hint">
              Only complete this if your label gives directions to mix the product with another food or liquid.
              This is separate from processing while you make the product. For now, one added food and
              mixing without other changes can be estimated; other preparations need review.
            </p>
            <template v-if="draft.preparationEnabled">
              <label
                v-if="draft.foodState !== 'asReconstituted' || draft.preparationKind !== 'reconstituted'"
                class="field"
              >
                <span>Preparation type</span>
                <select v-model="draft.preparationKind">
                  <option value="">Not sure yet</option>
                  <option value="reconstituted">Reconstitute the product</option>
                  <option value="withFood">Prepare or consume with another food</option>
                </select>
              </label>
              <p
                v-else
                class="field-hint"
              >
                Preparation type: reconstituted, from the food state you selected.
              </p>
              <label class="field">
                <span>Preparation directions</span>
                <textarea
                  v-model="draft.preparationDirections"
                  maxlength="1000"
                />
              </label>
              <div class="form-grid">
                <label class="field">
                  <span>Amount of product used</span>
                  <input
                    v-model="draft.preparationProductAmount"
                    inputmode="decimal"
                    placeholder="Unknown"
                  >
                </label>
                <label class="field">
                  <span>Product amount unit</span>
                  <select v-model="draft.preparationProductUnit">
                    <option value="g">g</option>
                    <option value="mL">mL</option>
                  </select>
                </label>
                <label class="field">
                  <span>Added food or liquid</span>
                  <select v-model="draft.preparationIngredientId">
                    <option value="">Not chosen yet</option>
                    <option
                      v-if="draft.preparationIngredientId && !ingredients.some((item) => item.id === draft.preparationIngredientId)"
                      :value="draft.preparationIngredientId"
                    >Saved ingredient is unavailable</option>
                    <option
                      v-for="ingredient in ingredients"
                      :key="ingredient.id"
                      :value="ingredient.id"
                    >
                      {{ ingredient.name }}
                    </option>
                  </select>
                </label>
                <label class="field">
                  <span>Amount of added food or liquid</span>
                  <input
                    v-model="draft.preparationAddedAmount"
                    inputmode="decimal"
                    placeholder="Unknown"
                  >
                </label>
                <label class="field">
                  <span>Added food amount unit</span>
                  <select v-model="draft.preparationAddedUnit">
                    <option value="g">g</option>
                    <option value="mL">mL</option>
                  </select>
                </label>
                <label class="field">
                  <span>Prepared serving size (optional)</span>
                  <input
                    v-model="draft.preparedServingAmount"
                    inputmode="decimal"
                    placeholder="Unknown"
                  >
                </label>
                <label class="field">
                  <span>Prepared serving unit</span>
                  <select v-model="draft.preparedServingUnit">
                    <option value="g">g</option>
                    <option value="mL">mL</option>
                  </select>
                </label>
              </div>
              <p class="field-hint">
                Nutrition information is needed for the added food, including water. Volume amounts require
                the appropriate density; water is not automatically treated as nutrient-free.
              </p>
              <template v-if="draft.preparedServingUnit === 'mL' && draft.preparedServingAmount">
                <div class="form-grid">
                  <label class="field">
                    <span>Prepared food density (g/mL)</span>
                    <input
                      v-model="draft.preparedDensity"
                      inputmode="decimal"
                    >
                  </label>
                  <details class="full">
                    <summary>Prepared density source details (optional)</summary>
                    <label class="field">
                      <span>Prepared density evidence reference</span>
                      <input v-model="draft.preparedDensityReference">
                    </label>
                    <label class="field">
                      <span>Prepared density evidence date</span>
                      <input
                        v-model="draft.preparedDensityDate"
                        type="date"
                      >
                    </label>
                  </details>
                </div>
              </template>
              <label class="check-item">
                <input
                  v-model="draft.preparationMixingConfirmed"
                  type="checkbox"
                >
                <span>
                  These amounts match the directions, and mixing causes no other weight or nutrient changes.
                </span>
              </label>
              <p class="field-hint">
                Review the calculation in the Review section. Supported prepared values appear in the draft label.
              </p>
            </template>
          </section>
          <section
            v-if="draft.drainingEnabled || draft.foodState === 'asDrained'"
            class="direction-details"
          >
            <h3>Draining before eating</h3>
            <p class="field-hint">
              If the directions say to drain the food, enter nutrition values for the food after draining.
              Drained weight or the undrained recipe alone does not establish these values. Leave unknown values blank.
              A separate drained weight is not needed to use values already stated per 100 g.
            </p>
            <p
              v-if="draft.foodState === 'asDrained'"
              class="field-hint"
            >
              Draining is indicated by the previously recorded food state.
            </p>
            <template v-if="draft.drainingEnabled || draft.foodState === 'asDrained'">
              <label class="field">
                <span>Draining directions</span>
                <textarea
                  v-model="draft.drainingDirections"
                  maxlength="1000"
                />
              </label>
              <div class="form-grid">
                <label
                  v-if="draft.foodState !== 'asDrained' || draft.servingUnit !== 'g'"
                  class="field"
                >
                  <span>Drained serving size (g, optional)</span>
                  <input
                    v-model="draft.drainedServingGrams"
                    inputmode="decimal"
                    placeholder="Unknown"
                  >
                </label>
                <details class="full">
                  <summary>Drained nutrition source details (optional)</summary>
                  <label class="field">
                    <span>Drained nutrition source type</span>
                    <select v-model="draft.drainedSourceType">
                      <option value="">Not specified</option>
                      <option value="analysis">Analysis</option>
                      <option value="supplier">Supplier</option>
                      <option value="database">Database</option>
                      <option value="calculated">Calculated</option>
                      <option value="productLabel">Product label</option>
                      <option value="user">Other user-supplied evidence</option>
                    </select>
                  </label>
                  <label class="field">
                    <span>Drained nutrition source reference</span>
                    <input
                      v-model="draft.drainedSourceReference"
                      maxlength="120"
                    >
                  </label>
                  <label class="field">
                    <span>Drained nutrition source date</span>
                    <input
                      v-model="draft.drainedSourceDate"
                      type="date"
                    >
                  </label>
                </details>
                <label
                  v-for="row in nutritionRows"
                  :key="row.id"
                  class="field"
                >
                  <span>Drained {{ row.label.trim() }} ({{ row.unit }}/100 g)</span>
                  <input
                    v-model="draft.drainedValues[row.id]"
                    inputmode="decimal"
                    placeholder="Unknown"
                  >
                </label>
              </div>
              <p class="field-hint">
                <template v-if="draft.foodState === 'asDrained' && draft.servingUnit === 'g'">
                  The serving size above is already in grams for the drained food, so it is used here.
                </template>
                <template v-else-if="draft.foodState === 'asDrained' && draft.servingUnit === 'mL'">
                  If known, enter the measured mass of that same drained serving; volume is not converted without evidence.
                </template>
              </p>
              <label class="check-item">
                <input
                  v-model="draft.drainedConfirmed"
                  type="checkbox"
                >
                <span>I have checked that these values describe this recipe after the recorded draining directions.</span>
              </label>
              <p class="field-hint">
                Review the results in the Review section. Supported drained values appear in the draft label.
              </p>
            </template>
          </section>
        </div>
      </details>

      <details
        id="product-section-type"
        :open="openSections.type"
        class="product-section"
        @toggle="setSection('type', $event)"
      >
        <summary>What is it? <small>{{ statuses.type.text }}</small></summary>
        <p
          v-if="saved === undefined"
          class="inline-empty"
        >
          Save the product draft before answering these questions.
        </p>
        <div v-else>
          <ProductTypeStep
            :key="saved.id"
            :store="store"
            :product="saved"
            @dirty="typeDirty = $event"
            @saved="refresh"
          />
        </div>
      </details>

      <details
        id="product-section-review"
        :open="openSections.review"
        class="product-section"
        @toggle="setSection('review', $event)"
      >
        <summary>Review and next actions <small>{{ !saved || dirty || completionItems.length ? 'Needs attention' : 'Draft information entered' }}</small></summary>
        <div class="field-group">
          <template v-if="saved && savedLabelDraft">
            <section aria-labelledby="product-completion-title">
              <h3 id="product-completion-title">
                Product information check
              </h3>
              <p
                v-if="dirty"
                class="notice notice-warning"
                role="status"
              >
                You have unsaved changes. This review uses saved information; save each changed section to update it.
              </p>
              <p
                v-if="!dirty && !completionItems.length"
                class="completion-success"
                role="status"
              >
                <span aria-hidden="true">✓</span> Required product draft information entered.
              </p>
              <template v-if="completionItems.length">
                <p>
                  These saved product, recipe or nutrition details need attention:
                </p>
                <ul class="completion-list">
                  <li
                    v-for="item in completionItems"
                    :key="item.message"
                  >
                    {{ item.message }}
                    <div class="review-actions">
                      <button
                        v-for="(action, index) in availableActions(item).slice(0, 2)"
                        :key="index"
                        type="button"
                        @click="openReviewAction(action)"
                      >
                        {{ actionLabel(action) }}
                      </button>
                    </div>
                    <details v-if="item.details?.length">
                      <summary>Why does this need attention?</summary>
                      <ul>
                        <li
                          v-for="detail in item.details"
                          :key="detail"
                        >
                          {{ detail }}
                        </li>
                      </ul>
                      <div class="review-actions">
                        <button
                          v-for="(action, index) in availableActions(item).slice(2)"
                          :key="index"
                          type="button"
                          @click="openReviewAction(action)"
                        >
                          {{ actionLabel(action) }}
                        </button>
                      </div>
                    </details>
                  </li>
                </ul>
              </template>
              <p class="field-hint">
                This covers the Product, recipe and nutrition inputs checked here, not Label fields or claims.
                Unsupported checks and other requirements still need review; this is not legal clearance.
              </p>
            </section>
          </template>
          <p
            v-else
            class="field-hint"
          >
            Save the product draft to review its inputs and next actions.
          </p>
          <AppButton
            variant="link"
            size="sm"
            type="button"
            :disabled="!saved"
            @click="emit('open-labels', savedId)"
          >
            Open Labels <span aria-hidden="true">→</span>
          </AppButton>
          <ReviewTracePanel
            v-if="saved"
            ref="tracePanel"
            :product="saved"
            :formulations="formulations"
            :ingredients="ingredients"
            :versions="versions"
          >
            <details v-if="reviewGroups.length">
              <summary>Other draft review items</summary>
              <p>These include label and technical findings and do not determine Product draft completion.</p>
              <details
                v-for="group in reviewGroups"
                :key="group.id"
                class="review-group"
              >
                <summary>{{ group.title }} — {{ group.items.length }} {{ group.items.length === 1 ? 'item' : 'items' }}</summary>
                <p>{{ group.guidance }}</p>
                <p
                  v-if="group.id === 'labels'"
                  class="field-hint"
                >
                  This Product review uses ingredient defaults, not wording saved on individual labels. Check each label separately.
                </p>
                <ul>
                  <li
                    v-for="issue in group.items"
                    :key="issue.message"
                  >
                    {{ issue.message }}
                    <div class="review-actions">
                      <button
                        v-for="(action, index) in availableActions(issue)"
                        :key="index"
                        type="button"
                        @click="openReviewAction(action)"
                      >
                        {{ actionLabel(action) }}
                      </button>
                    </div>
                  </li>
                </ul>
              </details>
            </details>
          </ReviewTracePanel>
        </div>
      </details>
    </div>
    <div class="product-save-bar">
      <AppButton
        type="button"
        @click="saveBasics"
      >
        Save product draft
      </AppButton>
      <small>Product, pack and nutrition details are saved here. Claims are managed on Labels.</small>
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
    </div>
  </section>
</template>

<style scoped>
.product-sections { display: grid; gap: 0.75rem; }
.product-section { border: 1px solid #d4d4d8; border-radius: 0.5rem; padding: 0.75rem; }
.product-section > summary { cursor: pointer; font-weight: 600; }
.product-section > summary small { margin-left: 0.5rem; font-weight: 400; }
.product-actions, .product-jumps { display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: center; }
.product-jumps { margin: 0.75rem 0; }
.product-jumps button { font: inherit; }
.product-save-bar { position: sticky; bottom: 0; z-index: 1; display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem; padding: 0.6rem; background: #fff; border: 1px solid #d4d4d8; border-radius: 0.5rem; }
.product-save-bar p { margin: 0; }
.nutrition-fields { display: grid; grid-template-columns: minmax(0, 1fr); gap: 0.75rem; }
.nutrition-fields .form-grid > .full { grid-column: 1 / -1; }
.nutrition-fields .form-grid { min-width: 0; }
.nutrition-fields p { margin: 0; }
.direction-details, .saved-state-review { display: grid; min-width: 0; gap: 0.75rem; }
.direction-details h3 { margin: 0; font-size: 0.95rem; }
.nutrition-fields details > .field { margin-top: 0.75rem; }
.directions-options { display: grid; gap: 0.4rem; }
.check-item { display: flex; gap: 0.45rem; align-items: center; }
@media (max-width: 700px) {
  .nutrition-fields .form-grid { grid-template-columns: minmax(0, 1fr); }
}
.completion-success { color: #166534; font-weight: 600; }
.completion-list > li { margin: 0.75rem 0; overflow-wrap: anywhere; }
.review-group { padding: 0.75rem; border: 1px solid #d4d4d8; border-radius: 0.5rem; }
.review-group { margin: 0.5rem 0; }
.review-group summary { cursor: pointer; font-weight: 600; }
.review-group li { margin: 0.75rem 0; overflow-wrap: anywhere; }
.review-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.3rem; }
</style>
