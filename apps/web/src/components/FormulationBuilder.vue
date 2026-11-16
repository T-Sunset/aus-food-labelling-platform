<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { FormulationRecord, IngredientRecord } from '@aus-food/storage';
import {
  buildFormulationRecord,
  draftFromFormulation,
  emptyFormulationDraft,
  formulationStepStatuses,
  lineShares,
  type FormulationLineDraft,
} from '../formulation-form';
import AppButton from './ui/button/AppButton.vue';
import BuilderShell, { type BuilderStep } from './BuilderShell.vue';

const props = defineProps<{
  record?: FormulationRecord | undefined;
  ingredients: readonly IngredientRecord[];
  formulations: readonly FormulationRecord[];
  makeId: (prefix: string) => string;
}>();
const emit = defineEmits<{ save: [record: FormulationRecord]; cancel: [] }>();

const draft = reactive(props.record ? draftFromFormulation(props.record) : emptyFormulationDraft());
const activeStep = ref(0);
const errorMessage = ref('');
watch(
  () => [draft.compositionCoverage, draft.compositionReference, draft.compositionDate, JSON.stringify(draft.lines)],
  () => { draft.confirmCompositionChanges = false; },
);

// A recipe cannot contain itself, so it is not offered as a choice for its own lines.
const otherFormulations = computed(() => props.formulations.filter((item) => item.id !== props.record?.id));

const statuses = computed(() => formulationStepStatuses(draft));
const shares = computed(() => lineShares(draft));
const steps = computed<BuilderStep[]>(() => [
  { id: 'name', title: 'Name', status: statuses.value.name.text, done: statuses.value.name.done },
  { id: 'lines', title: 'Ingredients', status: statuses.value.lines.text, done: statuses.value.lines.done },
  { id: 'review', title: 'Review and save' },
]);

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

function submit(): void {
  errorMessage.value = '';
  try {
    emit('save', buildFormulationRecord(draft, props.record, props.makeId, new Date().toISOString()));
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'This formulation could not be saved.';
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
        <h2>Formulation record</h2>
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
        <label class="field full">
          <span>What is this formulation?</span>
          <select v-model="draft.compositionCoverage">
            <option value="">My recipe or a composition without confirmed coverage</option>
            <option value="partial">Supplier composition: information is partial</option>
            <option value="complete">Supplier composition: supplier confirms it is complete</option>
          </select>
          <small>Partial information is not scaled or treated as a complete recipe. Changing a shared formulation affects every ingredient and product linked to it.</small>
        </label>
        <template v-if="draft.compositionCoverage">
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
        </template>
      </div>

      <div
        v-else-if="activeStep === 1"
        class="field-group"
      >
        <div class="line-heading">
          <div>
            <h3>Ingredients in this recipe</h3>
            <p class="field-hint">
              <template v-if="draft.compositionCoverage === 'partial'">
                Enter known component amounts on the same basis. Leave an amount blank when unknown;
                no percentages or full composition will be calculated.
              </template>
              <template v-else>
                Use amounts on the same basis. The total can be anything; it doesn't have to add up to 100 g.
              </template>
            </p>
          </div>
          <AppButton
            variant="outline"
            size="sm"
            type="button"
            @click="addLine"
          >
            Add line <span aria-hidden="true">+</span>
          </AppButton>
        </div>
        <div
          v-if="ingredients.length === 0"
          class="inline-empty"
        >
          You haven't saved any ingredients yet. Add them on the Ingredients page first, or use another
          saved recipe as a line.
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
              @change="line.targetId = ''"
            >
              <option value="ingredient">Ingredient</option>
              <option value="formulation">Another recipe</option>
            </select>
          </label>
          <label class="field line-record">
            <span class="visually-hidden">Line {{ index + 1 }} record</span>
            <select
              v-model="line.targetId"
              :aria-label="`Line ${index + 1} record`"
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
            @click="draft.lines.splice(index, 1)"
          >
            ×
          </button>
        </div>
        <div class="info-callout">
          <span aria-hidden="true">i</span>
          <p>
            No cooking loss or yield is assumed. A recipe can't contain itself, directly or through
            another recipe, and we'll stop you if it does.
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
      </div>

      <div
        v-else
        class="field-group"
      >
        <h3>Review and save</h3>
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
          Needs attention! You can save now and finish later. Still to do: a name and at least one complete ingredient line
          (a record and a positive amount).
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
            <small v-if="shares[index]">(about {{ shares[index] }} of the recipe by weight)</small>
          </li>
        </ul>
      </div>

      <template #actions>
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
