<script setup lang="ts">
import { illustrativePreviewOn } from '../illustrative-state';
</script>

<template>
  <section
    class="panel"
    aria-labelledby="preview-title"
  >
    <h2 id="preview-title">
      Illustrative preview
    </h2>
    <label>
      <input
        v-model="illustrativePreviewOn"
        type="checkbox"
      >
      Show what each result would be if the draft rules were approved (this session only)
    </label>
    <p class="field-hint">
      Off every time the page loads. It is review material, is not saved, and never appears on the label or PDF.
    </p>
  </section>
</template>
