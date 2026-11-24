<script setup lang="ts">
import { computed, reactive, ref, toRaw, watch } from 'vue';
import { additionalNutrientIds, nutrientIds, type AdditionalNutrientId, type NutrientId } from '@aus-food/domain';
import { describeWorkspaceReferenceCycle, findWorkspaceReferenceCycle, type FormulationRecord, type IngredientRecord } from '@aus-food/storage';
import { calculateProcessMassBalance, canonicalNutrientUnit, compareDecimals, convertMass, sumDecimals } from '@aus-food/engine';
import { buildIngredientRecord, draftFromIngredient, emptyIngredientDraft, managedNutrients, nutrientExpressionLabels, optionalNutrientLabels } from '../ingredient-form';
import { finishedNutritionSnapshot } from '../finished-nutrition';
import {
  amountsFromPercentages,
  buildFormulationRecord,
  draftIngoingMass,
  draftFromFormulation,
  emptyFormulationDraft,
  formulationStepStatuses,
  formulationReferencePreview,
  isDirectAdditiveLine,
  lineShares,
  measuredYieldPercentage,
  percentageTotal,
  processChangeDrafts,
  processModeFromProfile,
  processProfileForChanges,
  processProfileForFinalMass,
  type FormulationLineDraft,
  type LineUnit,
  type ProcessChangeDraft,
  type ProcessMode,
} from '../formulation-form';
import AppButton from './ui/button/AppButton.vue';
import IngredientBuilder from './IngredientBuilder.vue';
import AdditiveUseField from './AdditiveUseField.vue';

const props = defineProps<{
  record?: FormulationRecord | undefined;
  ingredients: readonly IngredientRecord[];
  formulations: readonly FormulationRecord[];
  makeId: (prefix: string) => string;
  createIngredient: (record: IngredientRecord, composition?: FormulationRecord) => Promise<void>;
}>();
const emit = defineEmits<{ save: [record: FormulationRecord]; cancel: [] }>();

const draft = reactive(props.record ? draftFromFormulation(props.record) : emptyFormulationDraft());
const linkedCompoundIngredients = computed(() => props.record
  ? props.ingredients.filter((ingredient) => ingredient.kind === 'compound'
    && ingredient.compoundFormulationId === props.record?.id)
  : []);
const showCompositionQuestion = computed(() =>
  linkedCompoundIngredients.value.length > 0 || Boolean(props.record?.supplierComposition));
const errorMessage = ref('');
const addingIngredient = ref(false);
const savingIngredient = ref(false);
const referencePreviewId = props.record?.id ?? props.makeId('recipe-preview');
const newIngredientPreviewId = props.makeId('ingredient-preview');
const pendingRecipe = computed(() => formulationReferencePreview({
  ...draft,
  lines: [...draft.lines, {
    id: 'new-ingredient-preview', kind: 'ingredient', targetId: newIngredientPreviewId, quantity: '', unit: 'g',
  }],
}, referencePreviewId));
const percentages = reactive<Record<string, string>>({});
const percentageBatchWeight = ref('');
const percentageBatchUnit = ref<LineUnit>('g');
const ingredientsSection = ref<HTMLDetailsElement>();
const percentageDetails = ref<HTMLDetailsElement>();
const existingProfile = props.record ? toRaw(props.record).processMassProfile : undefined;
const processMode = ref<ProcessMode>(processModeFromProfile(existingProfile));
const finalMass = ref(existingProfile?.declaredFinalMass?.value ?? '');
const finalMassUnit = ref<LineUnit>(existingProfile?.declaredFinalMass?.unit ?? 'g');
const processChanges = reactive<ProcessChangeDraft[]>(
  processMode.value === 'detailed' ? processChangeDrafts(existingProfile) : [],
);
const processComplete = ref(processMode.value === 'detailed' && existingProfile?.complete !== false);
const advancedProcessingInitiallyOpen = processMode.value === 'detailed'
  || processMode.value === 'unchanged' || processMode.value === 'existing';

function updateSimpleFinalMass(event: Event): void {
  const input = event.currentTarget;
  if (!(input instanceof HTMLInputElement)) throw new Error('The final batch weight field is unavailable.');
  finalMass.value = input.value;
  processMode.value = input.value.trim() ? 'measured' : 'unknown';
}

const previousFinished = props.record ? toRaw(props.record).finishedNutrition : undefined;
const finishedRecord: IngredientRecord | undefined = props.record && previousFinished ? {
  id: props.record.id, name: 'Finished food', recordType: 'ingredient', kind: 'atomic',
  tags: [], createdAt: props.record.createdAt, updatedAt: props.record.updatedAt,
  ...(previousFinished.nutrientProfile ? { nutrientProfile: previousFinished.nutrientProfile } : {}),
  ...(previousFinished.energyPer100g ? { energyPer100g: previousFinished.energyPer100g } : {}),
  ...(previousFinished.nutritionEntrySource ? { nutritionEntrySource: previousFinished.nutritionEntrySource } : {}),
} : undefined;
const finishedDraft = reactive(finishedRecord ? draftFromIngredient(finishedRecord) : emptyIngredientDraft());
finishedDraft.name = 'Finished food';
finishedDraft.kind = 'atomic';
const originalFinishedDraft = JSON.stringify(finishedDraft);
const useFinishedNutrition = ref(previousFinished?.selected ?? false);
const confirmFinishedNutrition = ref(false);
const previousRetention = props.record ? toRaw(props.record).nutrientRetention : undefined;
const hasFinishedBatchDetails = Boolean(existingProfile || previousFinished || previousRetention);
const finishedBatchDetail = ref<'' | 'weight' | 'nutrition' | 'retention'>('');
const retentionFactors = reactive(nutrientIds.flatMap((id) => {
  const factor = previousRetention?.factors[id];
  return factor ? [{ id, ...factor }] : [];
}));
const originalRetentionFactors = JSON.stringify(retentionFactors);
const useRetention = ref(previousRetention?.selected ?? false);
const confirmRetention = ref(false);
const retentionSearch = ref('');
const selectedRetentionNutrient = ref<NutrientId | ''>('');
const retentionChoices = [
  ...managedNutrients.map(({ key, label }) => ({ id: key, label })),
  ...additionalNutrientIds.map((id) => ({ id, label: optionalNutrientLabels[id] })),
];
function retentionLabel(id: NutrientId): string {
  return retentionChoices.find((item) => item.id === id)?.label ?? id;
}
const matchingRetentionNutrients = computed(() => retentionChoices
  .filter((item) => !retentionFactors.some((factor) => factor.id === item.id)
    && item.label.toLowerCase().includes(retentionSearch.value.trim().toLowerCase()))
  .sort((a, b) => a.label.localeCompare(b.label)));
watch(matchingRetentionNutrients, (matches) => {
  if (selectedRetentionNutrient.value && !matches.some((item) => item.id === selectedRetentionNutrient.value)) {
    selectedRetentionNutrient.value = '';
  }
});
function addRetentionNutrient(): void {
  const id = selectedRetentionNutrient.value;
  if (!id || !matchingRetentionNutrients.value.some((item) => item.id === id)) return;
  retentionFactors.push({ id, percentage: '', sourceId: '', sourceDate: '' });
  selectedRetentionNutrient.value = '';
}
watch(useFinishedNutrition, (selected) => { if (selected) useRetention.value = false; }, { flush: 'sync' });
watch(useRetention, (selected) => { if (selected) useFinishedNutrition.value = false; }, { flush: 'sync' });
const finishedSearch = ref('');
const selectedFinishedNutrient = ref<AdditionalNutrientId | ''>('');
const matchingFinishedNutrients = computed(() => additionalNutrientIds
  .filter((id) => !finishedDraft.additionalNutrientsMass.some((entry) => entry.key === id)
    && optionalNutrientLabels[id].toLowerCase().includes(finishedSearch.value.trim().toLowerCase()))
  .sort((a, b) => optionalNutrientLabels[a].localeCompare(optionalNutrientLabels[b])));
watch(matchingFinishedNutrients, (matches) => {
  if (selectedFinishedNutrient.value && !matches.includes(selectedFinishedNutrient.value)) selectedFinishedNutrient.value = '';
});
function addFinishedNutrient(): void {
  const key = selectedFinishedNutrient.value;
  if (!key || !matchingFinishedNutrients.value.includes(key)) return;
  const unit = canonicalNutrientUnit(key);
  finishedDraft.additionalNutrientsMass.push({
    key, value: '', unit: unit === 'mg/100g' ? 'mg' : unit === 'ug/100g' ? 'ug' : 'g',
    expressionChoice: '', expression: '',
  });
  selectedFinishedNutrient.value = '';
}
watch(
  () => [JSON.stringify(finishedDraft), JSON.stringify(draft.lines), draft.compositionCoverage,
    processMode.value, JSON.stringify(processChanges), processComplete.value, finalMass.value, finalMassUnit.value,
    useFinishedNutrition.value],
  () => { confirmFinishedNutrition.value = false; },
  { flush: 'sync' },
);
watch(
  () => [JSON.stringify(retentionFactors), JSON.stringify(draft.lines), draft.compositionCoverage,
    processMode.value, JSON.stringify(processChanges), processComplete.value, finalMass.value, finalMassUnit.value,
    useRetention.value],
  () => { confirmRetention.value = false; },
  { flush: 'sync' },
);
watch(
  () => [JSON.stringify(processChanges), finalMass.value, finalMassUnit.value],
  () => { processComplete.value = false; },
  { flush: 'sync' },
);
watch(
  () => [draft.compositionCoverage, draft.compositionReference, draft.compositionDate, JSON.stringify(draft.lines)],
  () => { draft.confirmCompositionChanges = false; },
);

// A recipe cannot contain itself, so it is not offered as a choice for its own lines.
const otherFormulations = computed(() => props.formulations.filter((item) => item.id !== props.record?.id));

const statuses = computed(() => formulationStepStatuses(draft));
const shares = computed(() => lineShares(draft));
const enteredPercentages = computed(() => draft.lines.map((line) => (percentages[line.id] ?? '').trim()));
const enteredPercentageTotal = computed(() => percentageTotal(enteredPercentages.value));
const percentagePending = computed(() => Boolean(percentageBatchWeight.value.trim())
  || enteredPercentages.value.some(Boolean));
const startingMass = computed(() => percentagePending.value
  || draft.lines.some((line) => !options(line.kind).some((item) => item.id === line.targetId))
  ? undefined : draftIngoingMass(draft));
function options(kind: FormulationLineDraft['kind']): readonly { id: string; name: string }[] {
  return kind === 'ingredient' ? props.ingredients : otherFormulations.value;
}

function targetName(line: FormulationLineDraft): string {
  return options(line.kind).find((item) => item.id === line.targetId)?.name ?? 'Not chosen yet';
}

function addLine(): void {
  draft.lines.push({
    id: props.makeId('line'),
    kind: props.ingredients.length > 0 ? 'ingredient' : 'formulation',
    targetId: '',
    quantity: '',
    unit: 'g',
  });
}

function changeLineTarget(line: FormulationLineDraft, event: Event): void {
  const control = event.currentTarget;
  if (!(control instanceof HTMLSelectElement)) throw new Error('The recipe line selector is unavailable.');
  const value = control.value;
  if (value === line.targetId) return;
  const proposed = {
    ...draft, lines: draft.lines.map((item) => item.id === line.id ? { ...item, targetId: value } : item),
  };
  const cycle = findWorkspaceReferenceCycle(props.ingredients, [
    ...props.formulations.filter((item) => item.id !== referencePreviewId),
    formulationReferencePreview(proposed, referencePreviewId),
  ]);
  if (cycle) {
    control.value = line.targetId;
    errorMessage.value = `This would create a circular recipe: ${describeWorkspaceReferenceCycle(cycle)}. Choose a different ingredient or recipe.`;
    return;
  }
  line.targetId = value;
  line.additiveUse = '';
  errorMessage.value = '';
}

function addProcessChange(): void {
  processChanges.push({
    id: props.makeId('process'), kind: '', quantity: '', unit: 'g', description: '', material: '',
  });
}

function discardPercentages(): void {
  for (const id of Object.keys(percentages)) delete percentages[id];
  percentageBatchWeight.value = '';
  percentageBatchUnit.value = 'g';
  errorMessage.value = '';
}

function applyPercentages(): void {
  errorMessage.value = '';
  try {
    const amounts = amountsFromPercentages(draft, enteredPercentages.value, percentageBatchWeight.value.trim());
    draft.lines.forEach((line, index) => {
      line.quantity = amounts[index]!;
      line.unit = percentageBatchUnit.value;
    });
    discardPercentages();
    if (percentageDetails.value) percentageDetails.value.open = false;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Percentages could not be converted to amounts.';
  }
}

function yieldDescription(value: string): string {
  const percentage = Number(value);
  return !Number.isFinite(percentage) ? `${value}%`
    : percentage < 0.05 ? 'less than 0.1%' : `about ${percentage.toFixed(1)}%`;
}

const measuredPreview = computed(() => {
  if (processMode.value !== 'measured' || !finalMass.value.trim()) return '';
  if (percentagePending.value) return 'Apply or discard the entered percentages to see the yield.';
  if (startingMass.value === undefined) {
    return 'Enter all recipe ingredients and their amounts to see the yield.';
  }
  try {
    const yieldPercentage = measuredYieldPercentage(startingMass.value, finalMass.value.trim(), finalMassUnit.value);
    return `Finished batch: ${finalMass.value.trim()} ${finalMassUnit.value} (${yieldDescription(yieldPercentage)} of the starting weight).`;
  } catch (error) {
    return error instanceof Error ? error.message : 'The yield could not be calculated.';
  }
});

const processPreview = computed(() => {
  if (processMode.value !== 'detailed' || !processComplete.value) return '';
  if (percentagePending.value) return 'Apply or discard the entered percentages to see the yield.';
  if (startingMass.value === undefined) return 'Enter all recipe ingredients and their amounts to see the yield.';
  try {
    const record = buildFormulationRecord(draft, props.record, () => 'preview', new Date().toISOString());
    const profile = processProfileForChanges(record, processChanges, true, finalMass.value, finalMassUnit.value);
    const ingoing = sumDecimals(record.lines.map((line) => convertMass(line.quantity, 'g').value));
    const balance = calculateProcessMassBalance({ value: ingoing, unit: 'g' }, profile);
    if (balance.status !== 'calculated') return 'The batch weight needs complete processing information.';
    return `Finished batch: ${balance.finalMass.value} g (${yieldDescription(balance.yieldPercentage)} of the starting weight).`;
  } catch (error) {
    return error instanceof Error ? `Cannot calculate the batch weight: ${error.message}` : 'The batch weight could not be calculated.';
  }
});

function submit(): void {
  errorMessage.value = '';
  try {
    if (percentagePending.value) {
      if (ingredientsSection.value) ingredientsSection.value.open = true;
      if (percentageDetails.value) percentageDetails.value.open = true;
      throw new Error('Apply or discard the entered percentages before saving the recipe.');
    }
    const record = buildFormulationRecord(draft, props.record, props.makeId, new Date().toISOString());
    const processMassProfile = processMode.value === 'measured'
      ? processProfileForFinalMass(record, finalMass.value, finalMassUnit.value, props.makeId)
      : processMode.value === 'detailed'
        ? processProfileForChanges(record, processChanges, processComplete.value, finalMass.value, finalMassUnit.value)
      : processMode.value === 'unchanged' ? { changes: [] }
        : processMode.value === 'existing' ? existingProfile : undefined;
    const withProcess = { ...record, processMassProfile };
    let finishedNutrition = previousFinished;
    const finishedChanged = JSON.stringify(finishedDraft) !== originalFinishedDraft;
    if (useFinishedNutrition.value || previousFinished || finishedChanged) {
      const evidence = buildIngredientRecord(finishedDraft, finishedRecord, () => record.id, new Date().toISOString());
      const snapshot = useFinishedNutrition.value && confirmFinishedNutrition.value
        ? finishedNutritionSnapshot(withProcess, props.formulations, props.ingredients)
        : !finishedChanged ? previousFinished?.recipeSnapshot : undefined;
      finishedNutrition = {
        selected: useFinishedNutrition.value,
        ...(snapshot ? { recipeSnapshot: snapshot } : {}),
        ...(evidence.nutrientProfile ? { nutrientProfile: evidence.nutrientProfile } : {}),
        ...(evidence.energyPer100g ? { energyPer100g: evidence.energyPer100g } : {}),
        ...(evidence.nutritionEntrySource ? { nutritionEntrySource: evidence.nutritionEntrySource } : {}),
      };
    }
    let nutrientRetention = previousRetention;
    const retentionChanged = JSON.stringify(retentionFactors) !== originalRetentionFactors;
    if (useRetention.value || previousRetention || retentionChanged) {
      const factors: NonNullable<FormulationRecord['nutrientRetention']>['factors'] = {};
      for (const factor of retentionFactors) {
        const percentage = factor.percentage.trim();
        if (percentage && (!/^\d+(\.\d+)?$/.test(percentage)
          || !Number.isFinite(Number(percentage)) || compareDecimals(percentage, '100') > 0)) {
          throw new Error(`${retentionLabel(factor.id)} retention must be between 0 and 100%.`);
        }
        factors[factor.id] = { percentage, sourceId: factor.sourceId.trim(), sourceDate: factor.sourceDate };
      }
      const snapshot = useRetention.value && confirmRetention.value
        ? finishedNutritionSnapshot(withProcess, props.formulations, props.ingredients)
        : !retentionChanged ? previousRetention?.recipeSnapshot : undefined;
      nutrientRetention = {
        selected: useRetention.value,
        ...(snapshot ? { recipeSnapshot: snapshot } : {}),
        factors,
      };
    }
    emit('save', { ...withProcess, finishedNutrition, nutrientRetention });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'This formulation could not be saved.';
  }
}

async function saveNewIngredient(record: IngredientRecord, composition?: FormulationRecord): Promise<void> {
  if (savingIngredient.value) return;
  savingIngredient.value = true;
  errorMessage.value = '';
  try {
    const proposed = {
      ...draft, lines: [...draft.lines, {
        id: 'new-ingredient-preview', kind: 'ingredient' as const, targetId: record.id, quantity: '', unit: 'g' as const,
      }],
    };
    const cycle = findWorkspaceReferenceCycle([...props.ingredients, record], [
      ...props.formulations.filter((item) => item.id !== referencePreviewId),
      ...(composition ? [composition] : []),
      formulationReferencePreview(proposed, referencePreviewId),
    ]);
    if (cycle) {
      throw new Error(`This would create a circular recipe: ${describeWorkspaceReferenceCycle(cycle)}. Choose a different ingredient or recipe.`);
    }
    await props.createIngredient(record, composition);
    draft.lines.push({ id: props.makeId('line'), kind: 'ingredient', targetId: record.id, quantity: '', unit: 'g' });
    addingIngredient.value = false;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'The ingredient could not be saved.';
  } finally {
    savingIngredient.value = false;
  }
}
</script>

<template>
  <form
    v-show="!addingIngredient"
    class="panel editor-panel"
    @submit.prevent="submit"
  >
    <div class="panel-heading">
      <div>
        <p class="eyebrow">
          {{ record ? 'EDIT DRAFT' : 'NEW DRAFT' }}
        </p>
        <h2>Formulation record</h2>
      </div>
      <span class="draft-pill">Draft</span>
    </div>

    <div class="formulation-sections">
      <details
        class="formulation-section"
        open
      >
        <summary>Basics</summary>
        <div class="form-grid">
          <p class="field-hint full">
            A formulation is a recipe. Give it a name you will recognise when you build a product.
          </p>
          <label class="field full">
            <span>Formulation name <b aria-hidden="true">*</b></span>
            <input
              v-model="draft.name"
              maxlength="120"
              autocomplete="off"
              placeholder="e.g. Breakfast base"
            >
          </label>
          <p class="field-hint full">
            Changing a shared formulation affects every ingredient and product linked to it.
          </p>
        </div>
      </details>

      <details
        ref="ingredientsSection"
        class="formulation-section"
        :open="showCompositionQuestion || hasFinishedBatchDetails"
      >
        <summary>Ingredients</summary>
        <div class="field-group">
          <div class="line-heading">
            <div>
              <h3>Ingredients in this recipe</h3>
              <p class="field-hint">
                <template v-if="draft.compositionCoverage">
                  Enter known component amounts on the same basis. Leave an amount blank when unknown;
                  no percentages can be calculated until every amount is known.
                </template>
                <template v-else>
                  Use amounts on the same basis. Leave an amount blank if you don't know it yet;
                  the recipe can be saved, but proportions cannot be calculated until all amounts are known.
                </template>
              </p>
            </div>
            <div>
              <AppButton
                variant="outline"
                size="sm"
                type="button"
                @click="addingIngredient = true; errorMessage = ''"
              >
                Create ingredient
              </AppButton>
              <AppButton
                variant="outline"
                size="sm"
                type="button"
                @click="addLine"
              >
                Add line <span aria-hidden="true">+</span>
              </AppButton>
            </div>
          </div>
          <div
            v-if="showCompositionQuestion"
            class="field-group"
          >
            <p
              v-if="linkedCompoundIngredients.length"
              class="field-hint"
            >
              This recipe is used in {{ linkedCompoundIngredients.map((ingredient) => ingredient.name).join(', ') }}.
              Knowing whether the list is complete helps with ingredient, allergen and nutrition checks.
            </p>
            <p
              v-else
              class="field-hint"
            >
              This recipe has saved component-list information.
            </p>
            <label class="field">
              <span>Are all the ingredients in this component recipe listed?</span>
              <select v-model="draft.compositionCoverage">
                <option
                  value=""
                  :disabled="Boolean(record?.supplierComposition)"
                >Not sure yet</option>
                <option value="partial">No or not sure</option>
                <option value="complete">Yes, all ingredients are listed</option>
              </select>
            </label>
            <p class="field-hint">
              If you're not sure, leave it unknown. Confirming the list does not fill in unknown amounts.
              Changes to this shared recipe affect every linked ingredient and product.
            </p>
            <details v-if="draft.compositionCoverage">
              <summary>Component list source details (optional)</summary>
              <label class="field">
                <span>Composition evidence reference</span>
                <input
                  v-model="draft.compositionReference"
                  maxlength="120"
                >
              </label>
              <label class="field">
                <span>Composition evidence date</span>
                <input
                  v-model="draft.compositionDate"
                  type="date"
                >
              </label>
            </details>
          </div>
          <div
            v-if="ingredients.length === 0"
            class="inline-empty"
          >
            You haven't saved any ingredients yet. Create one here, or use another saved recipe as a line.
          </div>
          <div
            v-if="draft.lines.length === 0"
            class="inline-empty"
          >
            Add a line to start. Pick an ingredient (or another saved recipe) and the amount.
          </div>
          <div
            v-for="(line, index) in draft.lines"
            :key="line.id"
            class="line-row"
          >
            <label class="field line-type">
              <span class="visually-hidden">Line {{ index + 1 }} type</span>
              <select
                v-model="line.kind"
                :aria-label="`Line ${index + 1} type`"
                @change="line.targetId = ''; line.additiveUse = ''"
              >
                <option value="ingredient">Ingredient</option>
                <option value="formulation">Another recipe</option>
              </select>
            </label>
            <label class="field line-record">
              <span class="visually-hidden">Line {{ index + 1 }} record</span>
              <select
                :value="line.targetId"
                :aria-label="`Line ${index + 1} record`"
                @change="changeLineTarget(line, $event)"
              >
                <option
                  value=""
                  disabled
                >Select record</option>
                <option
                  v-for="option in options(line.kind)"
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
                placeholder="Amount"
              >
              <small v-if="shares[index]">
                {{ shares[index] === '<0.1%' ? 'Less than 0.1%' : `About ${shares[index]}` }} of batch
              </small>
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
              @click="delete percentages[line.id]; draft.lines.splice(index, 1)"
            >
              ×
            </button>
            <AdditiveUseField
              v-if="isDirectAdditiveLine(line, ingredients)"
              v-model="line.additiveUse"
              class="line-additive-use"
              :label="`Line ${index + 1} additive use`"
            />
            <div
              v-else-if="line.additiveUse"
              class="line-additive-use"
            >
              <p class="field-hint">
                This ingredient is no longer identified as an additive. Review or clear its saved special use.
              </p>
              <AppButton
                type="button"
                variant="outline"
                size="sm"
                @click="line.additiveUse = ''"
              >
                Clear line {{ index + 1 }} additive use
              </AppButton>
            </div>
          </div>
          <details
            ref="percentageDetails"
            class="percentage-entry"
          >
            <summary>Enter amounts as percentages (optional)</summary>
            <p class="field-hint">
              Enter the starting batch weight and each line's percentage by weight.
              Applying these replaces the amounts above; the calculated weights are saved with the recipe.
              For a partial list, use known amounts instead.
            </p>
            <label class="field">
              <span>Starting batch weight for percentages</span>
              <input
                v-model="percentageBatchWeight"
                inputmode="decimal"
                placeholder="Amount"
              >
            </label>
            <label class="field">
              <span>Starting batch weight unit</span>
              <select v-model="percentageBatchUnit">
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="mg">mg</option>
              </select>
            </label>
            <label
              v-for="(line, index) in draft.lines"
              :key="line.id"
              class="field"
            >
              <span>Line {{ index + 1 }} percentage: {{ targetName(line) }}</span>
              <input
                v-model="percentages[line.id]"
                :aria-label="`Line ${index + 1} percentage`"
                inputmode="decimal"
                placeholder="%"
              >
            </label>
            <p
              v-if="enteredPercentageTotal !== undefined"
              class="field-hint"
              aria-live="polite"
            >
              Total: {{ enteredPercentageTotal }}%.
              {{ enteredPercentageTotal === '100' ? 'Ready to convert when a starting weight is entered.' : 'The total must be 100% before these can be applied.' }}
            </p>
            <p
              v-else
              class="field-hint"
            >
              Enter a positive percentage for every line; the total must be 100%.
            </p>
            <AppButton
              type="button"
              variant="outline"
              size="sm"
              @click="applyPercentages"
            >
              Apply percentages to amounts
            </AppButton>
            <AppButton
              v-if="percentagePending"
              type="button"
              variant="outline"
              size="sm"
              @click="discardPercentages"
            >
              Discard entered percentages
            </AppButton>
          </details>
          <p
            v-if="percentagePending"
            class="field-hint"
          >
            Percentages have not been applied yet. Apply or discard them before saving.
          </p>
          <div class="info-callout">
            <span aria-hidden="true">i</span>
            <p>
              A recipe can't contain itself, directly or through another recipe. We'll stop you if it does.
            </p>
          </div>
          <label
            v-if="record?.supplierComposition?.coverage === 'complete' && draft.compositionCoverage === 'complete'"
            class="field"
          >
            <span>
              <input
                v-model="draft.confirmCompositionChanges"
                type="checkbox"
              >
              If I changed the composition or source, I checked that it is still complete.
            </span>
          </label>
          <div
            v-if="hasFinishedBatchDetails"
            class="field-group"
          >
            <p class="field-hint">
              This recipe has saved finished-batch details:
            </p>
            <div class="formulation-actions">
              <AppButton
                v-if="existingProfile"
                type="button"
                variant="outline"
                size="sm"
                aria-controls="finished-batch-weight"
                :aria-pressed="finishedBatchDetail === 'weight'"
                @click="finishedBatchDetail = 'weight'"
              >
                Review saved batch weight and processing
              </AppButton>
              <AppButton
                v-if="previousFinished"
                type="button"
                variant="outline"
                size="sm"
                aria-controls="finished-batch-nutrition"
                :aria-pressed="finishedBatchDetail === 'nutrition'"
                @click="finishedBatchDetail = 'nutrition'"
              >
                Review saved finished-food nutrition
              </AppButton>
              <AppButton
                v-if="previousRetention"
                type="button"
                variant="outline"
                size="sm"
                aria-controls="finished-batch-retention"
                :aria-pressed="finishedBatchDetail === 'retention'"
                @click="finishedBatchDetail = 'retention'"
              >
                Review saved nutrient retention
              </AppButton>
            </div>
          </div>
          <details>
            <summary>Have finished-batch details?</summary>
            <p class="field-hint">
              Choose a detail to add or edit. These describe making the recipe, not customer directions.
            </p>
            <div class="formulation-actions">
              <AppButton
                type="button"
                variant="outline"
                size="sm"
                aria-controls="finished-batch-weight"
                :aria-pressed="finishedBatchDetail === 'weight'"
                @click="finishedBatchDetail = 'weight'"
              >
                Batch weight and processing
              </AppButton>
              <AppButton
                type="button"
                variant="outline"
                size="sm"
                aria-controls="finished-batch-nutrition"
                :aria-pressed="finishedBatchDetail === 'nutrition'"
                @click="finishedBatchDetail = 'nutrition'"
              >
                Finished-food nutrition
              </AppButton>
              <AppButton
                type="button"
                variant="outline"
                size="sm"
                aria-controls="finished-batch-retention"
                :aria-pressed="finishedBatchDetail === 'retention'"
                @click="finishedBatchDetail = 'retention'"
              >
                Nutrient retention
              </AppButton>
            </div>
          </details>
          <div
            v-show="finishedBatchDetail === 'weight'"
            id="finished-batch-weight"
            class="field-group"
          >
            <h3>Finished batch weight and processing</h3>
            <p class="field-hint">
              A measured weight alone does not show how much nutrient or additive remains.
            </p>
            <p class="field-hint">
              We add up your ingredient amounts to find the starting weight. If you weigh the whole batch
              after cooking or other processing, enter that weight below. You can leave it blank until you know it.
            </p>
            <p
              v-if="percentagePending"
              class="field-hint"
            >
              Apply or discard the entered percentages before previewing the batch weight.
            </p>
            <p
              v-else-if="startingMass !== undefined"
              class="field-hint"
            >
              Starting batch weight: {{ startingMass }} g, calculated from the recipe amounts.
            </p>
            <p
              v-else
              class="field-hint"
            >
              The starting batch weight is unavailable until the complete recipe and all amounts are known.
            </p>
            <template v-if="processMode === 'unknown' || processMode === 'measured'">
              <div class="form-grid">
                <label class="field">
                  <span>Final batch weight (optional)</span>
                  <input
                    :value="processMode === 'unknown' ? '' : finalMass"
                    inputmode="decimal"
                    placeholder="e.g. 800"
                    @input="updateSimpleFinalMass"
                  >
                </label>
                <label class="field">
                  <span>Final batch weight unit</span>
                  <select v-model="finalMassUnit">
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="mg">mg</option>
                  </select>
                </label>
              </div>
              <p
                v-if="measuredPreview"
                class="field-hint"
                aria-live="polite"
              >
                {{ measuredPreview }}
              </p>
            </template>
            <details :open="advancedProcessingInitiallyOpen">
              <summary>Processing details (advanced)</summary>
              <p class="field-hint">
                Use these options if the food did not change at all, or if you want to record individual
                weight gains and losses. Changing the option replaces the saved batch weight details when you save.
              </p>
              <label class="field">
                <span>What happened to the batch weight?</span>
                <select v-model="processMode">
                  <option value="unknown">I don't know yet</option>
                  <option value="measured">I know the final batch weight</option>
                  <option value="unchanged">No processing changed the food or its weight</option>
                  <option value="detailed">I want to record individual weight changes</option>
                  <option
                    v-if="existingProfile"
                    value="existing"
                  >Keep existing processing details</option>
                </select>
              </label>
              <p
                v-if="processMode === 'unchanged'"
                class="field-hint"
              >
                Choose this only when no processing changed the ingredients or the weight.
                If only the final weight is known, choose that option instead.
              </p>
              <p
                v-if="processMode === 'existing'"
                class="field-hint"
              >
                Your saved processing details will be kept as they are. Choosing another option replaces them
                when you save.
              </p>
              <template v-if="processMode === 'detailed'">
                <p class="field-hint">
                  Record gains and losses in the order they happen. Add ingredients to the recipe above,
                  not again here. Leave an amount blank if you do not know it.
                </p>
                <div
                  v-for="(change, index) in processChanges"
                  :key="change.id"
                  class="form-grid"
                >
                  <label class="field">
                    <span>Weight change {{ index + 1 }}</span>
                    <select v-model="change.kind">
                      <option value="">Choose gain or loss</option>
                      <option value="loss">Weight lost</option>
                      <option value="gain">Weight gained</option>
                    </select>
                  </label>
                  <label class="field">
                    <span>Amount {{ index + 1 }} (optional)</span>
                    <input
                      v-model="change.quantity"
                      inputmode="decimal"
                      placeholder="Unknown"
                    >
                  </label>
                  <label class="field">
                    <span>Unit {{ index + 1 }}</span>
                    <select v-model="change.unit">
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="mg">mg</option>
                    </select>
                  </label>
                  <label class="field">
                    <span>What changed? {{ index + 1 }} (optional)</span>
                    <select v-model="change.material">
                      <option value="">Not sure</option>
                      <option value="water">Water</option>
                      <option value="other">Something else</option>
                    </select>
                  </label>
                  <label class="field">
                    <span>What happened? {{ index + 1 }} (optional)</span>
                    <input
                      v-model="change.description"
                      maxlength="120"
                      placeholder="e.g. baking"
                    >
                  </label>
                  <AppButton
                    type="button"
                    variant="outline"
                    size="sm"
                    @click="processChanges.splice(index, 1)"
                  >
                    Remove weight change {{ index + 1 }}
                  </AppButton>
                </div>
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  @click="addProcessChange"
                >
                  Add weight change
                </AppButton>
                <label class="field">
                  <span>Measured final batch weight (optional)</span>
                  <input
                    v-model="finalMass"
                    inputmode="decimal"
                    placeholder="Unknown"
                  >
                </label>
                <label class="field">
                  <span>Measured final batch weight unit</span>
                  <select v-model="finalMassUnit">
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="mg">mg</option>
                  </select>
                </label>
                <label class="check-item">
                  <input
                    v-model="processComplete"
                    type="checkbox"
                  >
                  <span>I have listed every weight gain and loss, and know their amounts.</span>
                </label>
                <p
                  v-if="!processComplete"
                  class="field-hint"
                >
                  These details can be saved as incomplete. The finished weight cannot be calculated from an incomplete list.
                </p>
                <p
                  v-else
                  class="field-hint"
                >
                  {{ processPreview }}
                </p>
              </template>
            </details>
          </div>
          <div
            v-show="finishedBatchDetail === 'retention'"
            id="finished-batch-retention"
            class="field-group"
          >
            <h3>Nutrient retention evidence</h3>
            <p class="field-hint">
              If you have evidence for this whole recipe and its processing, enter the percentage of each
              nutrient that remains in the finished batch. This is not the percentage of the batch weight
              remaining. Figures for an individual ingredient or another process cannot automatically be
              applied to the whole recipe. Leave unknown figures blank.
            </p>
            <label class="check-item">
              <input
                v-model="useRetention"
                type="checkbox"
              >
              <span>Use nutrient retention evidence for this recipe</span>
            </label>
            <template v-if="useRetention || previousRetention">
              <p class="field-hint">
                When selected, this replaces the finished-food values option. The recorded starting and finished
                batch weights are used automatically. Energy is not calculated from these percentages. If you have
                a finished energy value, enter and confirm it under finished-food nutrition first; it remains
                available when you choose retention. Additions of nutrients during processing are not supported.
              </p>
              <div
                v-for="(factor, index) in retentionFactors"
                :key="factor.id"
                class="form-grid"
              >
                <label class="field">
                  <span>{{ retentionLabel(factor.id) }} retained (%)</span>
                  <input
                    v-model="factor.percentage"
                    inputmode="decimal"
                    placeholder="Unknown"
                  >
                </label>
                <details>
                  <summary>{{ retentionLabel(factor.id) }} source details (optional)</summary>
                  <label class="field">
                    <span>{{ retentionLabel(factor.id) }} retention source</span>
                    <input
                      v-model="factor.sourceId"
                      placeholder="Evidence reference"
                    >
                  </label>
                  <label class="field">
                    <span>{{ retentionLabel(factor.id) }} retention source date</span>
                    <input
                      v-model="factor.sourceDate"
                      type="date"
                    >
                  </label>
                </details>
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  @click="retentionFactors.splice(index, 1)"
                >
                  Remove {{ retentionLabel(factor.id) }} retention
                </AppButton>
              </div>
              <label class="field">
                <span>Search nutrients for retention evidence</span>
                <input
                  v-model="retentionSearch"
                  type="search"
                  placeholder="Search nutrients"
                >
              </label>
              <label class="field">
                <span>Choose a nutrient for retention evidence</span>
                <select v-model="selectedRetentionNutrient">
                  <option value="">Choose a nutrient</option>
                  <option
                    v-for="item in matchingRetentionNutrients"
                    :key="item.id"
                    :value="item.id"
                  >
                    {{ item.label }}
                  </option>
                </select>
              </label>
              <AppButton
                type="button"
                variant="outline"
                size="sm"
                :disabled="!selectedRetentionNutrient"
                @click="addRetentionNutrient"
              >
                Add retention evidence
              </AppButton>
              <label class="check-item">
                <input
                  v-model="confirmRetention"
                  type="checkbox"
                >
                <span>
                  I checked that each figure is the percentage of the nutrient originally in this whole recipe
                  that remains after its recorded processing, applies to its nutrient form, and excludes any
                  nutrient additions during processing.
                </span>
              </label>
            </template>
          </div>
          <div
            v-show="finishedBatchDetail === 'nutrition'"
            id="finished-batch-nutrition"
            class="field-group"
          >
            <h3>Finished-food nutrition values</h3>
            <p class="field-hint">
              If you have values for this finished recipe, such as a laboratory analysis, you can enter them
              per 100 g instead of using ingredient estimates. Leave unknown values blank. These values do not
              establish additive retention or replace review of the label.
            </p>
            <label class="check-item">
              <input
                v-model="useFinishedNutrition"
                type="checkbox"
              >
              <span>Use finished-food nutrition values for this recipe</span>
            </label>
            <template v-if="useFinishedNutrition || previousFinished">
              <details>
                <summary>Finished nutrition source details (optional)</summary>
                <div class="form-grid">
                  <label class="field">
                    <span>Finished nutrition source type</span>
                    <select v-model="finishedDraft.nutritionSourceType">
                      <option value="">Not specified</option>
                      <option value="analysis">Analysis</option>
                      <option value="supplier">Supplier</option>
                      <option value="productLabel">Product label</option>
                      <option value="database">Food composition database</option>
                      <option value="calculated">Calculated</option>
                      <option value="user">Own knowledge or other source</option>
                    </select>
                  </label>
                  <label class="field">
                    <span>Finished nutrition source reference</span>
                    <input
                      v-model="finishedDraft.nutritionSourceReference"
                      maxlength="120"
                      placeholder="Describe the source"
                    >
                  </label>
                  <label class="field">
                    <span>Finished nutrition source date</span>
                    <input
                      v-model="finishedDraft.nutritionSourceDate"
                      type="date"
                    >
                  </label>
                </div>
              </details>
              <div class="nutrient-grid">
                <label class="field">
                  <span>Finished energy <small>kJ/100 g</small></span>
                  <input
                    v-model="finishedDraft.energyPer100g"
                    inputmode="decimal"
                    placeholder="Unknown"
                  >
                </label>
                <label
                  v-for="nutrient in managedNutrients"
                  :key="nutrient.key"
                  class="field"
                >
                  <span>Finished {{ nutrient.label }} <small>{{ nutrient.unit.replace('/100g', '/100 g') }}</small></span>
                  <input
                    v-model="finishedDraft.nutrients[nutrient.key]"
                    inputmode="decimal"
                    placeholder="Unknown"
                  >
                </label>
              </div>
              <fieldset class="field-group">
                <legend>Other finished-food nutrients</legend>
                <div
                  v-for="(nutrient, index) in finishedDraft.additionalNutrientsMass"
                  :key="nutrient.key"
                  class="form-grid"
                >
                  <label class="field">
                    <span>Finished {{ optionalNutrientLabels[nutrient.key] }} amount</span>
                    <input
                      v-model="nutrient.value"
                      inputmode="decimal"
                      placeholder="Unknown"
                    >
                  </label>
                  <label class="field">
                    <span>Finished {{ optionalNutrientLabels[nutrient.key] }} unit</span>
                    <select v-model="nutrient.unit">
                      <option value="g">g per 100 g</option>
                      <option value="mg">mg per 100 g</option>
                      <option value="ug">micrograms per 100 g</option>
                    </select>
                  </label>
                  <label
                    v-if="nutrientExpressionLabels[nutrient.key]"
                    class="field"
                  >
                    <span>Finished {{ optionalNutrientLabels[nutrient.key] }} form</span>
                    <select v-model="nutrient.expressionChoice">
                      <option value="">Not specified</option>
                      <option value="supported">{{ nutrientExpressionLabels[nutrient.key] }}</option>
                      <option value="other">Another form</option>
                    </select>
                  </label>
                  <label
                    v-if="!nutrientExpressionLabels[nutrient.key] || nutrient.expressionChoice === 'other'"
                    class="field"
                  >
                    <span>Finished {{ optionalNutrientLabels[nutrient.key] }} other form (optional)</span>
                    <input
                      v-model="nutrient.expression"
                      placeholder="Not specified"
                    >
                  </label>
                  <AppButton
                    type="button"
                    variant="outline"
                    size="sm"
                    @click="finishedDraft.additionalNutrientsMass.splice(index, 1)"
                  >
                    Remove finished {{ optionalNutrientLabels[nutrient.key] }}
                  </AppButton>
                </div>
                <label class="field">
                  <span>Search other finished-food nutrients</span>
                  <input
                    v-model="finishedSearch"
                    type="search"
                    autocomplete="off"
                  >
                </label>
                <p
                  v-if="!matchingFinishedNutrients.length"
                  class="field-hint"
                  role="status"
                >
                  No available nutrients match your search.
                </p>
                <label class="field">
                  <span>Choose another finished-food nutrient</span>
                  <select
                    v-model="selectedFinishedNutrient"
                    :disabled="!matchingFinishedNutrients.length"
                  >
                    <option value="">Select a nutrient</option>
                    <option
                      v-for="key in matchingFinishedNutrients"
                      :key="key"
                      :value="key"
                    >
                      {{ optionalNutrientLabels[key] }}
                    </option>
                  </select>
                </label>
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  :disabled="!selectedFinishedNutrient"
                  @click="addFinishedNutrient"
                >
                  Add finished-food nutrient
                </AppButton>
              </fieldset>
              <label class="check-item">
                <input
                  v-model="confirmFinishedNutrition"
                  type="checkbox"
                >
                <span>I have checked that these values describe this recipe after its recorded processing.</span>
              </label>
              <p class="field-hint">
                Confirm after entering or changing the values. Recipe, ingredient or processing changes may
                require you to check them again.
              </p>
            </template>
          </div>
        </div>
      </details>
      <details class="formulation-section">
        <summary>Review and save</summary>
        <div class="field-group">
          <p
            v-if="statuses.name.done && statuses.lines.done"
            class="field-hint"
          >
            The name and recipe lines are filled in. Save the draft to check the entries and check the amounts
            before relying on them. This is a guide, not legal advice or a clearance.
          </p>
          <p
            v-else
            class="field-hint"
          >
            Needs attention! Choose a name and at least one ingredient or recipe to save.
            You can leave unknown amounts blank and fill them in later.
          </p>
          <ul
            v-if="draft.lines.length > 0"
            class="review-list"
          >
            <li
              v-for="(line, index) in draft.lines"
              :key="line.id"
            >
              <strong>{{ targetName(line) }}</strong>: {{ line.quantity || 'amount unknown' }} {{ line.quantity ? line.unit : '' }}
              <small v-if="shares[index]">
                ({{ shares[index] === '<0.1%' ? 'less than 0.1%' : `about ${shares[index]}` }} of the recipe by weight)
              </small>
            </li>
          </ul>
        </div>
      </details>

      <div class="formulation-actions">
        <AppButton type="submit">
          Save formulation draft <span aria-hidden="true">→</span>
        </AppButton>
        <AppButton
          variant="outline"
          type="button"
          @click="emit('cancel')"
        >
          Back to formulation list
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
  <div v-if="addingIngredient">
    <p class="field-hint">
      Your recipe stays open while you create this ingredient.
    </p>
    <IngredientBuilder
      :formulations="formulations"
      :ingredients="ingredients"
      :make-id="makeId"
      :preview-ingredient-id="newIngredientPreviewId"
      :pending-recipe="pendingRecipe"
      @save="saveNewIngredient"
      @cancel="addingIngredient = false; errorMessage = ''"
    />
    <p
      v-if="errorMessage"
      class="notice error"
      role="alert"
    >
      {{ errorMessage }}
    </p>
  </div>
</template>

<style scoped>
.formulation-sections {
  display: grid;
  gap: 0.75rem;
}
.formulation-section {
  border: 1px solid #d4d4d8;
  border-radius: 0.5rem;
  padding: 0.75rem;
}
.formulation-section > summary {
  cursor: pointer;
  font-weight: 600;
}
.formulation-actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.percentage-entry {
  border: 1px solid #d4d4d8;
  border-radius: 0.5rem;
  padding: 0.75rem;
}
.percentage-entry > summary {
  cursor: pointer;
  font-weight: 600;
}
</style>
