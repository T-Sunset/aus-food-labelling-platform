<script setup lang="ts">
import { computed } from 'vue';
import type { EngineStatus, IllustrativeResult } from '@aus-food/domain';
import { checklistGuidance, checklistLabel, usesIllustrativeOutcome } from '../checklist-status';

const props = defineProps<{
  status: EngineStatus;
  reasons: readonly string[];
  preview?: IllustrativeResult<unknown> | undefined;
}>();
const label = computed(() => checklistLabel(props.status, props.reasons, props.preview));
const nextSteps = computed(() => checklistGuidance(props.reasons));
const hypothetical = computed(() => usesIllustrativeOutcome(props.status, props.reasons, props.preview)
  && (label.value === 'Entered information looks fine!' || label.value === 'Needs attention!'));
</script>

<template>
  <p>
    <span aria-hidden="true">{{ label === 'Entered information looks fine!' ? '✓' : label === 'Needs attention!' ? '!' : 'i' }}</span>
    <strong>{{ label }}</strong>
    <span v-if="hypothetical"> (illustrative only, based on unapproved rules)</span>
    <span v-if="label === 'Entered information looks fine!'">
      This is a guide, not legal advice or a clearance.
    </span>
  </p>
  <ul v-if="nextSteps.length">
    <li
      v-for="step in nextSteps"
      :key="step"
    >
      {{ step }}
    </li>
  </ul>
  <p v-else-if="label === 'Needs attention!'">
    Check the details below and discuss the result with your consultant.
  </p>
</template>
