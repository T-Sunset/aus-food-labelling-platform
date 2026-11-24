<script setup lang="ts">
import { computed } from 'vue';
import type { ProductRecord } from '@aus-food/storage';
import ClassificationEvidenceList from './ClassificationEvidenceList.vue';

type ProductClassificationProfile = NonNullable<ProductRecord['classificationProfile']>;
type ProductClassificationFact =
  ProductClassificationProfile['foodForInfants'][keyof ProductClassificationProfile['foodForInfants']];
type ClassificationAnswer = ProductClassificationFact['answer'];

const props = defineProps<{
  label: string;
  description: string;
  modelValue: ProductClassificationFact;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ProductClassificationFact];
}>();

const answerOptions: { value: ClassificationAnswer; label: string }[] = [
  { value: 'unknown', label: 'Unknown / not assessed' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'conflicting', label: 'Evidence conflicts' },
];

const evidenceRequirement = computed(() => {
  if (props.modelValue.answer === 'conflicting') {
    return 'Resolve the conflicting information before relying on this answer.';
  }
  return '';
});

function updateAnswer(event: Event): void {
  const target = event.currentTarget;
  if (!(target instanceof HTMLSelectElement)) {
    return;
  }
  const answer = answerOptions.find((option) => option.value === target.value);
  if (answer === undefined) {
    return;
  }
  const changed = props.modelValue.answer !== answer.value;
  const previousEvidence = changed
    ? [...(props.modelValue.previousEvidence ?? []), ...props.modelValue.evidence]
    : props.modelValue.previousEvidence;
  emit('update:modelValue', {
    ...props.modelValue,
    answer: answer.value,
    evidence: changed ? [] : props.modelValue.evidence,
    ...(previousEvidence?.length ? { previousEvidence } : {}),
  });
}
</script>

<template>
  <fieldset class="classification-fact">
    <legend>{{ label }}</legend>
    <p class="classification-description">
      {{ description }}
    </p>
    <label class="classification-answer">
      <span>Evidence assessment</span>
      <select
        :value="modelValue.answer"
        @change="updateAnswer"
      >
        <option
          v-for="option in answerOptions"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </label>
    <ClassificationEvidenceList
      :label="label"
      :description="modelValue.answer === 'conflicting'
        ? 'You can optionally add sources for the conflicting accounts.'
        : 'Optionally record a document reference and date. The document itself stays in your local records.'"
      :model-value="modelValue.evidence"
      @update:model-value="emit('update:modelValue', { ...modelValue, evidence: $event })"
    />
    <p
      v-if="modelValue.previousEvidence?.length"
      class="classification-description"
    >
      Earlier source details (not attached to this answer):
      {{ modelValue.previousEvidence.map((item) => [item.reference, item.sourceDate].filter(Boolean).join(' - ')).join('; ') }}
    </p>
    <p
      v-if="evidenceRequirement"
      class="classification-error"
      role="status"
    >
      {{ evidenceRequirement }}
    </p>
  </fieldset>
</template>

<style scoped>
.classification-fact {
  min-width: 0;
  margin: 0;
  padding: 12px;
  border: 1px solid #e1e8e0;
  border-radius: 8px;
  background: #fff;
}
.classification-fact legend {
  padding: 0 4px;
  color: #34473d;
  font-size: 11px;
  font-weight: 700;
}
.classification-description {
  margin: 0 0 9px;
  color: #58675e;
  font-size: 10px;
  line-height: 1.5;
}
.classification-answer {
  display: flex;
  flex-direction: column;
  gap: 5px;
  color: #42534a;
  font-size: 10px;
  font-weight: 650;
}
.classification-answer select {
  width: 100%;
  min-height: 35px;
  padding: 0 8px;
  border: 1px solid #dce4dc;
  border-radius: 6px;
  color: #2b3b33;
  background: #fff;
  font-size: 11px;
}
.classification-error {
  margin: 6px 0 0;
  color: #8c3d31;
  font-size: 10px;
}
</style>
