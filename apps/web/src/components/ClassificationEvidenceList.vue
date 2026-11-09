<script setup lang="ts">
import { ref } from 'vue';
import type { ProductRecord } from '@aus-food/storage';

type ProductClassificationEvidence =
  NonNullable<ProductRecord['classificationProfile']>['identityEvidence'][number];
type ClassificationEvidenceKind = ProductClassificationEvidence['kind'];

const props = defineProps<{
  label: string;
  description: string;
  modelValue: readonly ProductClassificationEvidence[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: readonly ProductClassificationEvidence[]];
}>();

const reference = ref('');
const sourceDate = ref('');
const kind = ref<ClassificationEvidenceKind>('supplierSpecification');
const error = ref('');

const evidenceKinds: { value: ClassificationEvidenceKind; label: string }[] = [
  { value: 'supplierSpecification', label: 'Supplier specification' },
  { value: 'formulationRecord', label: 'Formulation record' },
  { value: 'productPackaging', label: 'Product packaging or label' },
  { value: 'productBrief', label: 'Product brief or intended-use record' },
  { value: 'processRecord', label: 'Process record' },
  { value: 'other', label: 'Other' },
];

function addEvidence(): void {
  error.value = '';
  if (!reference.value.trim() || !sourceDate.value) {
    error.value = 'Enter a reference and source date before adding evidence.';
    return;
  }
  const parsedDate = new Date(`${sourceDate.value}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== sourceDate.value) {
    error.value = 'Enter a valid source date.';
    return;
  }

  emit('update:modelValue', [
    ...props.modelValue,
    {
      id: `classification-evidence-${crypto.randomUUID()}`,
      reference: reference.value.trim(),
      sourceDate: sourceDate.value,
      kind: kind.value,
    },
  ]);
  reference.value = '';
  sourceDate.value = '';
}
</script>

<template>
  <div class="classification-evidence">
    <p class="classification-description">
      {{ description }}
    </p>
    <ul
      v-if="modelValue.length"
      class="classification-evidence-list"
    >
      <li
        v-for="item in modelValue"
        :key="item.id"
      >
        <span>{{ item.reference }} · {{ item.sourceDate }} · {{ evidenceKinds.find((entry) => entry.value === item.kind)?.label }}</span>
        <button
          type="button"
          :aria-label="`Remove evidence ${item.reference}`"
          @click="emit('update:modelValue', modelValue.filter((evidence) => evidence.id !== item.id))"
        >
          Remove
        </button>
      </li>
    </ul>
    <div class="classification-evidence-editor">
      <label>
        <span>Evidence reference</span>
        <input
          v-model="reference"
          :aria-label="`Evidence reference for ${label}`"
          autocomplete="off"
          placeholder="e.g. specification section 3"
        >
      </label>
      <label>
        <span>Evidence date</span>
        <input
          v-model="sourceDate"
          :aria-label="`Evidence date for ${label}`"
          type="date"
        >
      </label>
      <label>
        <span>Evidence type</span>
        <select
          v-model="kind"
          :aria-label="`Evidence type for ${label}`"
        >
          <option
            v-for="entry in evidenceKinds"
            :key="entry.value"
            :value="entry.value"
          >
            {{ entry.label }}
          </option>
        </select>
      </label>
      <button
        type="button"
        :aria-label="`Add evidence for ${label}`"
        @click="addEvidence"
      >
        Add evidence
      </button>
    </div>
    <p
      v-if="error"
      class="classification-error"
      role="alert"
    >
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
.classification-evidence {
  margin-top: 8px;
}
.classification-description {
  margin: 0 0 8px;
  color: #58675e;
  font-size: 11px;
  line-height: 1.5;
}
.classification-evidence-editor {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(130px, 0.6fr);
  gap: 8px;
  align-items: end;
}
.classification-evidence-editor label {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
  color: #42534a;
  font-size: 10px;
  font-weight: 650;
}
.classification-evidence-editor input,
.classification-evidence-editor select {
  min-width: 0;
  min-height: 34px;
  padding: 0 8px;
  border: 1px solid #dce4dc;
  border-radius: 6px;
  color: #2b3b33;
  background: #fff;
  font-size: 11px;
}
.classification-evidence-editor label:nth-child(3) {
  grid-column: 1 / -1;
}
.classification-evidence-editor button,
.classification-evidence-list button {
  min-height: 32px;
  padding: 0 9px;
  border: 1px solid #cbd9cc;
  border-radius: 6px;
  color: #345b45;
  background: #f5f8f3;
  font-size: 10px;
  font-weight: 650;
}
.classification-evidence-list {
  display: grid;
  gap: 5px;
  margin: 8px 0;
  padding: 0;
  list-style: none;
}
.classification-evidence-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid #e3e9e2;
  border-radius: 6px;
  color: #43564a;
  font-size: 10px;
}
.classification-error {
  margin: 6px 0 0;
  color: #8c3d31;
  font-size: 10px;
}
@media (max-width: 540px) {
  .classification-evidence-editor {
    grid-template-columns: 1fr;
  }
  .classification-evidence-editor label:nth-child(3) {
    grid-column: auto;
  }
}
</style>
