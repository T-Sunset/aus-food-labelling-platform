<script setup lang="ts">
import type { IllustrativeResult } from '@aus-food/domain';

defineProps<{ preview: IllustrativeResult<unknown>; label: string }>();
</script>

<template>
  <div
    class="notice notice-warning"
    role="note"
    :aria-label="`Illustrative preview for ${label}`"
  >
    <strong>ILLUSTRATIVE ONLY</strong>
    <span>
      {{ preview.note }}
      <template v-if="preview.eligible">
        Gates lifted: {{ preview.liftedGates.join(', ') }}.
      </template>
      <template v-else-if="preview.blockedBy.length > 0">
        Blocked by: {{ preview.blockedBy.join(', ') }}.
      </template>
      {{ preview.statement }}
    </span>
  </div>
</template>
