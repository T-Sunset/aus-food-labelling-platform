<script setup lang="ts">
import { computed, ref, shallowRef, toRaw, watch } from 'vue';
import { screenProductClassCandidates, createEmptyProductClassificationProfile } from '@aus-food/engine';
import type { LocalFoodStore, ProductRecord } from '@aus-food/storage';
import {
  applyAnswer,
  countAnswered,
  detectProductType,
  evidenceSourceOptions,
  factOf,
  makeBuilderEvidence,
  productTypeOptions,
  questionsFor,
  type BuilderQuestion,
  type EvidenceKind,
  type ProductType,
  type SimpleAnswer,
} from '../label-builder';

const props = defineProps<{ store: LocalFoodStore; product: ProductRecord }>();
const emit = defineEmits<{ saved: [] }>();

const productType = ref<ProductType>('');
const sourceKind = ref<EvidenceKind | ''>('');
const otherSource = ref('');
const errorMessage = ref('');
const message = ref('');

// Working copy, so quick successive answers build on each other instead of on the last saved record.
const profile = shallowRef(createEmptyProductClassificationProfile());
let pendingSaves = 0;
let saveChain: Promise<void> = Promise.resolve();
watch(
  () => props.product,
  (current) => {
    if (pendingSaves === 0) {
      const saved = current.classificationProfile;
      profile.value = saved === undefined ? createEmptyProductClassificationProfile() : toRaw(saved);
    }
  },
  { immediate: true },
);
productType.value = props.product.builderProductType ?? detectProductType(profile.value);

const questions = computed(() => questionsFor(productType.value));
const progress = computed(() => countAnswered(profile.value, productType.value));
const screening = computed(() => screenProductClassCandidates(profile.value));
const typeHint = computed(
  () => productTypeOptions.find((option) => option.value === productType.value)?.hint ?? '',
);
const sourceChosen = computed(() => sourceKind.value !== '');

function onTypeChange(event: Event): void {
  const target = event.currentTarget;
  if (!(target instanceof HTMLSelectElement)) return;
  const type = target.value;
  if (type !== 'caffeinatedBeverage' && type !== 'infantFood' && type !== 'other') return;
  const previous = productType.value;
  productType.value = type;
  pendingSaves += 1;
  errorMessage.value = '';
  saveChain = saveChain
    .then(() => props.store.products.update(props.product.id, { builderProductType: type }))
    .then(() => { message.value = 'Saved on this device.'; })
    .catch((error: unknown) => {
      if (productType.value === type) productType.value = previous;
      errorMessage.value = error instanceof Error ? error.message : 'The product type could not be saved.';
    })
    .finally(() => {
      pendingSaves -= 1;
      if (pendingSaves === 0) emit('saved');
    });
}

function onSourceChange(event: Event): void {
  const target = event.currentTarget;
  if (target instanceof HTMLSelectElement) {
    sourceKind.value = target.value as EvidenceKind | '';
  }
}

function answerOf(question: BuilderQuestion): string {
  return factOf(profile.value, question).answer;
}

function hasEvidence(question: BuilderQuestion): boolean {
  return factOf(profile.value, question).evidence.length > 0;
}

function onAnswer(question: BuilderQuestion, event: Event): void {
  const target = event.currentTarget;
  if (!(target instanceof HTMLSelectElement)) {
    return;
  }
  message.value = '';
  errorMessage.value = '';
  try {
    const evidence =
      sourceKind.value === ''
        ? undefined
        : makeBuilderEvidence(sourceKind.value, otherSource.value, new Date().toISOString().slice(0, 10));
    const next = applyAnswer(profile.value, question, target.value as SimpleAnswer, evidence);
    profile.value = next;
    pendingSaves += 1;
    const productId = props.product.id;
    saveChain = saveChain
      .then(() => props.store.products.update(productId, { classificationProfile: next }))
      .then(() => {
        message.value = 'Saved on this device.';
      })
      .catch((error: unknown) => {
        errorMessage.value = error instanceof Error ? error.message : 'The answer could not be saved.';
      })
      .finally(() => {
        pendingSaves -= 1;
        if (pendingSaves === 0) {
          emit('saved');
        }
      });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'The answer could not be saved.';
    target.value = answerOf(question);
  }
}

function outcomeText(outcome: 'candidate_indicated' | 'not_indicated' | 'inconclusive' | undefined): string {
  if (outcome === 'candidate_indicated') {
    return 'Your answers fit this product type. A consultant still confirms it.';
  }
  if (outcome === 'not_indicated') {
    return 'Your answers do not point to this product type.';
  }
  return 'Not enough answers yet to tell.';
}
</script>

<template>
  <div class="type-step">
    <label class="field">
      <span>What kind of product is this?</span>
      <select
        :value="productType"
        @change="onTypeChange"
      >
        <option
          value=""
          disabled
        >
          Choose one
        </option>
        <option
          v-for="option in productTypeOptions"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </label>
    <p
      v-if="typeHint"
      class="field-hint"
    >
      {{ typeHint }}
    </p>

    <template v-if="questions.length > 0">
      <label class="field">
        <span>Where is your information coming from?</span>
        <select
          :value="sourceKind"
          @change="onSourceChange"
        >
          <option value="">
            Choose a source
          </option>
          <option
            v-for="option in evidenceSourceOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </label>
      <label
        v-if="sourceKind === 'other'"
        class="field"
      >
        <span>Describe the source</span>
        <input
          v-model="otherSource"
          type="text"
          autocomplete="off"
          placeholder="For example: email from supplier, 3 Nov"
        >
      </label>
      <p class="field-hint">
        A consultant will want to know where each answer came from. We record this source and today's date
        against each Yes or No answer.
      </p>

      <fieldset
        v-for="question in questions"
        :key="question.key"
        class="type-question"
      >
        <legend>{{ question.question }}</legend>
        <p class="field-hint">
          Why we ask: {{ question.why }}
        </p>
        <label class="field">
          <span>Your answer</span>
          <select
            :value="answerOf(question)"
            :aria-label="question.question"
            @change="onAnswer(question, $event)"
          >
            <option value="unknown">
              Not sure yet
            </option>
            <option
              value="yes"
              :disabled="!sourceChosen && !hasEvidence(question)"
            >
              Yes
            </option>
            <option
              value="no"
              :disabled="!sourceChosen && !hasEvidence(question)"
            >
              No
            </option>
            <option
              v-if="answerOf(question) === 'conflicting'"
              value="conflicting"
              disabled
            >
              Sources disagree
            </option>
          </select>
        </label>
      </fieldset>

      <p
        v-if="!sourceChosen"
        class="field-hint"
      >
        Choose a source above to unlock the Yes and No answers. "Not sure yet" is always available and is
        shown as still needed.
      </p>

      <div
        class="notice"
        role="status"
      >
        <strong>{{ progress.answered }} of {{ progress.total }} questions answered.</strong>
        <span>Anything marked "Not sure yet" stays on your to-do list.</span>
      </div>

      <details>
        <summary>Show how we checked</summary>
        <ul class="type-checks">
          <li
            v-for="result in screening"
            :key="result.rule.id"
          >
            <strong>{{ result.title }}</strong>
            <span>{{ outcomeText(result.value?.screeningOutcome) }}</span>
          </li>
        </ul>
      </details>
    </template>

    <p
      v-if="productType === 'other'"
      class="field-hint"
    >
      No product questions are needed for this version. We will draft a basic label and add a note for your
      consultant.
    </p>
    <p
      v-if="message"
      class="field-hint"
      role="status"
    >
      {{ message }}
    </p>
    <p
      v-if="errorMessage"
      class="classification-error"
      role="alert"
    >
      {{ errorMessage }}
    </p>
  </div>
</template>

<style scoped>
.type-step {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.type-question {
  margin: 0;
  padding: 12px;
  border: 1px solid #e1e8e0;
  border-radius: 8px;
}
.type-question legend {
  padding: 0 4px;
  font-size: 13px;
  font-weight: 650;
}
.type-checks {
  margin: 8px 0 0;
  padding-left: 18px;
  font-size: 12px;
}
.type-checks li {
  display: flex;
  flex-direction: column;
  margin-bottom: 6px;
}
</style>
