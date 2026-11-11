<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  createLabelPdf,
  layoutLabel,
  preloadLabelPdfRenderer,
  type LabelLayoutResult,
} from '@aus-food/label';
import type { FormulationRecord, IngredientRecord, ProductRecord } from '@aus-food/storage';
import { makeLabelDraft } from '../label-draft';
import { makeConsultantNotes } from '../consultant-notes';
import { RULE_RELEASE_LABEL } from '../rule-data';
import AppButton from './ui/button/AppButton.vue';

const props = defineProps<{
  products: readonly ProductRecord[];
  formulations: readonly FormulationRecord[];
  ingredients: readonly IngredientRecord[];
}>();
const emit = defineEmits<{ editProduct: [id: string]; goIngredients: [] }>();

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
const drafts = computed(() => new Map(props.products.map((product) =>
  [product.id, makeLabelDraft(product, props.formulations, props.ingredients)])));
const selectedDraft = computed(() => drafts.value.get(selectedProductId.value));

function allergenSummary(draft: NonNullable<typeof selectedDraft.value>): string {
  const contains = draft.allergens.length ? `Contains: ${draft.allergens.join(', ')}.` : '';
  const pending = draft.pendingAllergens.length
    ? `Check: ${draft.pendingAllergens.join(', ')} (final-food assessment needed).`
    : '';
  return [contains, pending].filter(Boolean).join(' ')
    || 'No allergens identified; check supplier evidence.';
}

function wrapText(text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/u)) {
    if (line && `${line} ${word}`.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const generatedLayout = computed<
  | { readonly layout: LabelLayoutResult; readonly product: ProductRecord }
  | { readonly error: string }
  | undefined
>(() => {
  const product = selectedProduct.value;
  if (!product) {
    return undefined;
  }
  try {
    const draft = selectedDraft.value;
    if (!draft || !draft.declaration) return { error: 'The recipe needs attention before a draft can be previewed.' };
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
          id: 'ingredients',
          kind: 'ingredients',
          title: 'DRAFT ingredients',
          lines: wrapText(draft.declaration, 45),
          fontSizeMm: 2.5,
          minimumSizeStatus: 'review_required',
        },
        {
          id: 'allergens',
          kind: 'allergenDeclaration',
          title: 'DRAFT allergen summary',
          lines: wrapText(allergenSummary(draft), 45),
          fontSizeMm: 2.5,
          boldLines: true,
          minimumSizeStatus: 'review_required',
        },
        {
          id: 'nutrition',
          kind: 'nutritionInformation',
          title: 'DRAFT NUTRITION INFORMATION',
          lines: [
            `Servings per package: ${draft.nutrition.servingsPerPack}`,
            `Serving size: ${draft.nutrition.servingSize}`,
          ],
          table: {
            rows: [
              ['Average quantity', 'Per serving', draft.nutrition.unitHeading.replace('Average per', 'Per')],
              ...draft.nutrition.rows.map((row): [string, string, string] =>
                [row.label, row.serving, row.unitQuantity]),
            ],
          },
          fontSizeMm: 2.2,
          minimumSizeStatus: 'review_required',
        },
        {
          id: 'draft-notes',
          kind: 'advisoryStatements',
          title: 'DRAFT - consultant review required',
          lines: [
            'Nutrition, names, allergens and additives need review.',
            'Other label content may be missing.',
            'See the separate consultant notes.',
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
const hasLayoutOverflow = computed(() => {
  const generated = generatedLayout.value;
  return generated !== undefined && 'layout' in generated
    && generated.layout.issues.some((issue) =>
      issue.code === 'LINE_OVERFLOW' || issue.code === 'TITLE_OVERFLOW' || issue.code === 'BLOCK_OVERFLOW');
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
  const draft = selectedDraft.value;
  if (!current || !('layout' in current) || exporting.value || !draft
    || draft.missing.length > 0 || hasLayoutOverflow.value) {
    return;
  }
  exportError.value = '';
  exportStatus.value = '';
  exporting.value = true;
  try {
    const result = await createLabelPdf(current.layout, {
      productVersion: `draft-${current.product.updatedAt}`,
      ruleRelease: `${RULE_RELEASE_LABEL}; no active release`,
      exportedAt: new Date().toISOString(),
      consultantNotes: makeConsultantNotes(current.product, props.formulations, props.ingredients, draft),
    });
    if (selectedDraft.value !== draft || selectedProductId.value !== current.product.id) {
      throw new Error('The product or its ingredients changed during export. Please try again.');
    }
    const pdfBuffer = new ArrayBuffer(result.pdfBytes.byteLength);
    new Uint8Array(pdfBuffer).set(result.pdfBytes);
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${current.product.id}-label-draft.pdf`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    exportStatus.value = 'Draft PDF exported. Review its separate report before use.';
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
          DRAFT PACK COPY
        </p>
        <h1>Labels</h1>
        <p class="lede">
          Review your draft ingredient list, allergen summary and nutrition panel. Complete the missing information before export.
        </p>
      </div>
    </div>

    <div
      class="notice notice-warning"
      role="status"
    >
      <strong>Draft for consultant review, not a finished food label.</strong>
      <span>Warnings and other label content are not yet assembled. Nutrition rounding, names, allergen conditions,
        additive wording and layout require review. This does not certify legal compliance.</span>
    </div>

    <section
      v-if="products.length === 0"
      class="panel empty-state"
    >
      <h2>No product drafts to preview</h2>
      <p>Create a product draft or load the clearly marked illustrative demo data.</p>
    </section>

    <template v-else>
      <section
        class="panel"
        aria-label="Products and readiness"
      >
        <h2>Products</h2>
        <ul class="product-list">
          <li
            v-for="product in products"
            :key="product.id"
            :class="{ unfinished: drafts.get(product.id)?.missing.length }"
          >
            <strong>{{ product.name }}</strong>
            <span>{{ drafts.get(product.id)?.missing.length ? 'Needs attention!' : 'Consultant review recommended' }}</span>
            <span v-if="!drafts.get(product.id)?.missing.length">Required draft information entered; this is not a legal check or clearance.</span>
            <ul v-if="drafts.get(product.id)?.missing.length">
              <li
                v-for="item in drafts.get(product.id)?.missing"
                :key="item"
              >
                {{ item }}
              </li>
            </ul>
            <AppButton
              type="button"
              variant="link"
              size="sm"
              @click="emit('editProduct', product.id)"
            >
              Open product builder
            </AppButton>
          </li>
        </ul>
        <AppButton
          type="button"
          variant="link"
          size="sm"
          @click="emit('goIngredients')"
        >
          Open ingredients
        </AppButton>
      </section>
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
      <section
        v-if="selectedDraft"
        class="panel"
        aria-label="Draft declaration"
      >
        <h2>Draft ingredient list</h2>
        <p>{{ selectedDraft.declaration || 'Recipe information is missing.' }}</p>
        <h2>Draft allergen summary</h2>
        <p>{{ allergenSummary(selectedDraft) }}</p>
        <ul>
          <li
            v-for="warning in selectedDraft.warnings"
            :key="warning"
          >
            {{ warning }}
          </li>
        </ul>
      </section>

      <section
        v-if="selectedDraft"
        class="panel"
        aria-label="Draft nutrition information"
      >
        <h2>Draft nutrition information</h2>
        <p>Servings per package: {{ selectedDraft.nutrition.servingsPerPack }}</p>
        <p>Serving size: {{ selectedDraft.nutrition.servingSize }}</p>
        <p class="field-hint">
          Draft estimates use supplier information and FSANZ calculator rounding conventions.
          The rounding stage and this panel need consultant review.
        </p>
        <table class="nutrition-table">
          <caption>Draft nutrition information</caption>
          <thead>
            <tr>
              <th scope="col">
                Nutrient
              </th>
              <th scope="col">
                Average per serving
              </th>
              <th scope="col">
                {{ selectedDraft.nutrition.unitHeading }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in selectedDraft.nutrition.rows"
              :key="row.label"
            >
              <th scope="row">
                {{ row.label }}
              </th>
              <td>{{ row.serving }}</td>
              <td>{{ row.unitQuantity }}</td>
            </tr>
          </tbody>
        </table>
      </section>

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
              DRAFT SVG · 100 × 150 MM
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
          alt="Draft label layout for consultant review"
        >
        <ul class="label-layout-issues">
          <li
            v-for="(issue, index) in generatedLayout.layout.issues"
            :key="`${issue.code}-${index}`"
          >
            {{ issue.message }}
          </li>
        </ul>
        <p
          v-if="hasLayoutOverflow"
          class="field-hint"
        >
          This draft does not fit the current layout. Export is unavailable until the content fits; review
          the information above with your consultant.
        </p>
        <AppButton
          type="button"
          :disabled="exporting || !rendererStatus.startsWith('PDF renderer loaded') || !selectedDraft || selectedDraft.missing.length > 0 || hasLayoutOverflow"
          @click="exportPdf"
        >
          {{ exporting ? 'Preparing PDF…' : 'Export draft PDF' }}
        </AppButton>
      </section>
    </template>
  </section>
</template>

<style scoped>
.nutrition-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  text-align: left;
}
.nutrition-table th, .nutrition-table td {
  padding: 0.3rem;
  border-bottom: 1px solid #dfe5df;
  overflow-wrap: anywhere;
}
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
.product-list { padding-left: 1.25rem; }
.product-list > li { margin: 0.75rem 0; }
.product-list > li > span { display: block; }
.unfinished { color: #595959; }
</style>
