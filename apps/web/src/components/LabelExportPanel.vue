<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { expandFormulation } from '@aus-food/engine';
import {
  createLabelPdf,
  layoutLabel,
  preloadLabelPdfRenderer,
  type LabelLayoutResult,
} from '@aus-food/label';
import type { FormulationRecord, IngredientRecord, ProductRecord } from '@aus-food/storage';
import AppButton from './ui/button/AppButton.vue';

const props = defineProps<{
  products: readonly ProductRecord[];
  formulations: readonly FormulationRecord[];
  ingredients: readonly IngredientRecord[];
}>();

const selectedProductId = ref('');
const previewUrl = ref('');
const exportError = ref('');
const exportStatus = ref('');
const rendererStatus = ref('Loading the local PDF renderer.');
const exporting = ref(false);

watch(
  () => props.products,
  (products) => {
    if (!products.some((product) => product.id === selectedProductId.value)) {
      selectedProductId.value = products[0]?.id ?? '';
    }
  },
  { immediate: true },
);

const selectedProduct = computed(() =>
  props.products.find((product) => product.id === selectedProductId.value),
);

const generatedLayout = computed<
  | { readonly layout: LabelLayoutResult; readonly product: ProductRecord }
  | { readonly error: string }
  | undefined
>(() => {
  const product = selectedProduct.value;
  if (!product) {
    return undefined;
  }
  const formulation = props.formulations.find((item) => item.id === product.formulationId);
  if (!formulation) {
    return { error: 'The selected product has no available formulation.' };
  }

  try {
    const expanded = expandFormulation(
      formulation.id,
      { value: '100', unit: 'g' },
      props.formulations,
    );
    const ingredientById = new Map(props.ingredients.map((ingredient) => [ingredient.id, ingredient]));
    const componentLines = expanded.map((item) => {
      const name = ingredientById.get(item.ingredientId)?.name ?? `Unresolved ingredient ${item.ingredientId}`;
      return `${name}: ${item.mass.value} g (illustrative only)`;
    });
    const layout = layoutLabel({
      widthMm: 100,
      heightMm: 150,
      orientation: 'portrait',
      margins: { topMm: 6, rightMm: 6, bottomMm: 6, leftMm: 6 },
      blocks: [
        {
          id: 'demo-food-name',
          kind: 'foodName',
          title: 'Proposed product name',
          lines: [product.name],
          fontSizeMm: 3,
          minimumSizeStatus: 'review_required',
        },
        {
          id: 'illustrative-components',
          kind: 'advisoryStatements',
          title: 'Illustrative components — not a declaration',
          lines: [
            'DEMONSTRATION ONLY — NOT A FOOD LABEL',
            '100 g ingoing formulation basis;',
            'not final product composition.',
            ...componentLines,
          ],
          fontSizeMm: 2.5,
          minimumSizeStatus: 'review_required',
        },
      ],
      requiredBlocks: [],
      gapMm: 2,
    });
    return { layout, product };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'The draft layout could not be generated.',
    };
  }
});

watch(
  () => (generatedLayout.value && 'layout' in generatedLayout.value
    ? generatedLayout.value.layout.svg
    : ''),
  (svg) => {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value);
    }
    previewUrl.value = svg
      ? URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
      : '';
  },
  { immediate: true },
);

onMounted(() => {
  void preloadLabelPdfRenderer().then(
    () => {
      rendererStatus.value = 'PDF renderer loaded locally for this session.';
    },
    (error: unknown) => {
      rendererStatus.value = `PDF renderer could not be loaded: ${
        error instanceof Error ? error.message : 'unknown loading error'
      }`;
    },
  );
});

onUnmounted(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
});

async function exportPdf(): Promise<void> {
  const current = generatedLayout.value;
  if (!current || !('layout' in current) || exporting.value) {
    return;
  }
  exportError.value = '';
  exportStatus.value = '';
  exporting.value = true;
  try {
    const result = await createLabelPdf(current.layout, {
      productVersion: `draft-${current.product.updatedAt}`,
      ruleRelease: 'none-installed',
      exportedAt: new Date().toISOString(),
    });
    const pdfBuffer = new ArrayBuffer(result.pdfBytes.byteLength);
    new Uint8Array(pdfBuffer).set(result.pdfBytes);
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${current.product.id}-illustrative-label-draft.pdf`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    exportStatus.value = 'Illustrative PDF draft exported. Review its separate report before use.';
  } catch (error) {
    exportError.value = error instanceof Error ? error.message : 'The PDF draft could not be exported.';
  } finally {
    exporting.value = false;
  }
}
</script>

<template>
  <section class="page">
    <div class="page-heading compact">
      <div>
        <p class="eyebrow">
          LAYOUT DEMONSTRATION
        </p>
        <h1>Labels</h1>
        <p class="lede">
          Preview a local layout draft and export it with a separate provenance and review report.
        </p>
      </div>
    </div>

    <div
      class="notice notice-warning"
      role="status"
    >
      <strong>Not a food label or compliance assessment.</strong>
      <span>This demonstration does not assemble required declarations, allergens, NIP, warnings, or
        other regulatory content. The illustrative PDF is not suitable for use on a food product.</span>
    </div>

    <section
      v-if="products.length === 0"
      class="panel empty-state"
    >
      <h2>No product drafts to preview</h2>
      <p>Create a product draft or load the clearly marked illustrative demo data.</p>
    </section>

    <template v-else>
      <label class="field label-product-select">
        <span>Product draft</span>
        <select v-model="selectedProductId">
          <option
            v-for="product in products"
            :key="product.id"
            :value="product.id"
          >
            {{ product.name }}
          </option>
        </select>
      </label>

      <div
        class="notice notice-warning"
        role="status"
      >
        <strong>REVIEW REQUIRED</strong>
        <span>No active regulatory release or reviewer-approved minimum-size policy is installed.
          Font embedding and physical print legibility are unverified.</span>
      </div>
      <p
        class="field-hint"
        role="status"
        aria-live="polite"
      >
        {{ rendererStatus }}
      </p>
      <p
        v-if="exportStatus"
        class="field-hint"
        role="status"
        aria-live="polite"
      >
        {{ exportStatus }}
      </p>
      <div
        v-if="exportError"
        class="notice notice-error"
        role="alert"
      >
        <strong>PDF export failed.</strong> {{ exportError }}
      </div>
      <section
        v-if="generatedLayout && 'error' in generatedLayout"
        class="notice notice-error"
        role="alert"
      >
        {{ generatedLayout.error }}
      </section>
      <section
        v-else-if="generatedLayout && 'layout' in generatedLayout"
        class="panel label-preview-panel"
        aria-labelledby="label-preview-title"
      >
        <div class="panel-heading">
          <div>
            <p class="eyebrow">
              ILLUSTRATIVE SVG · 100 × 150 MM
            </p>
            <h2 id="label-preview-title">
              {{ generatedLayout.product.name }}
            </h2>
          </div>
          <span class="status-text">REVIEW REQUIRED</span>
        </div>
        <img
          v-if="previewUrl"
          class="label-preview-image"
          :src="previewUrl"
          alt="Illustrative label layout marked demonstration only, not a food label"
        >
        <ul class="label-layout-issues">
          <li
            v-for="(issue, index) in generatedLayout.layout.issues"
            :key="`${issue.code}-${index}`"
          >
            {{ issue.message }}
          </li>
        </ul>
        <AppButton
          type="button"
          :disabled="exporting || !rendererStatus.startsWith('PDF renderer loaded')"
          @click="exportPdf"
        >
          {{ exporting ? 'Preparing PDF…' : 'Export illustrative PDF draft' }}
        </AppButton>
      </section>
    </template>
  </section>
</template>

<style scoped>
.label-product-select {
  max-width: 440px;
  margin: 18px 0;
}
.label-preview-panel {
  max-width: 760px;
  margin-top: 18px;
}
.label-preview-image {
  display: block;
  width: min(100%, 380px);
  height: auto;
  margin: 18px auto;
  border: 1px solid #dfe5df;
  background: white;
  box-shadow: 0 8px 24px rgb(34 53 43 / 10%);
}
.label-layout-issues {
  margin: 0 0 18px;
  padding-left: 22px;
  color: #704b16;
}
.status-text {
  color: #704b16;
  font-weight: 750;
}
</style>
