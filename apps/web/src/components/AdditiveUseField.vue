<script setup lang="ts">
import type { DirectAdditiveUse } from '@aus-food/domain';

defineProps<{
  modelValue?: DirectAdditiveUse | '' | undefined;
  label: string;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: DirectAdditiveUse | ''] }>();

function updateUse(event: Event): void {
  const target = event.currentTarget;
  if (!(target instanceof HTMLSelectElement)) throw new Error('The additive use control is unavailable.');
  const value = target.value;
  if (value !== '' && value !== 'added' && value !== 'processingAid' && value !== 'unknown') {
    throw new Error('The selected additive use is not supported.');
  }
  emit('update:modelValue', value);
}
</script>

<template>
  <details :open="Boolean(modelValue)">
    <summary>Special additive use? (optional)</summary>
    <label class="field">
      <span>{{ label }}</span>
      <select
        :value="modelValue ?? ''"
        @change="updateUse"
      >
        <option value="">Use the usual ingredient handling</option>
        <option value="added">Intended as an ingredient in this recipe</option>
        <option value="processingAid">Used during preparation; may be a processing aid</option>
        <option value="unknown">I'm not sure</option>
      </select>
    </label>
    <small>Special uses need review. This choice does not decide whether it can be omitted from the label.</small>
  </details>
</template>
