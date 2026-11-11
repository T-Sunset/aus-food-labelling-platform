<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { expandFormulation } from '@aus-food/engine';
import type {
  ApprovedVersionRecord,
  FormulationRecord,
  IngredientRecord,
  ProductRecord,
} from '@aus-food/storage';

const props = defineProps<{
  products: readonly ProductRecord[];
  formulations: readonly FormulationRecord[];
  ingredients: readonly IngredientRecord[];
  versions: readonly ApprovedVersionRecord[];
}>();

const selectedProductId = ref('');

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
const selectedFormulation = computed(() =>
  props.formulations.find((formulation) => formulation.id === selectedProduct.value?.formulationId),
);
const selectedVersions = computed(() =>
  props.versions.filter((version) => version.recordId === selectedProductId.value),
);

function nutrientEvidence(ingredient: IngredientRecord | undefined) {
  return Object.entries(ingredient?.nutrientProfile?.values ?? {}).flatMap(
    ([nutrient, evidence]) => (evidence === undefined ? [] : [{ nutrient, ...evidence }]),
  );
}

function allergenAssessments(
  assessments: NonNullable<IngredientRecord['allergenEvidence']>[number]['assessments'],
): string {
  return Object.entries(assessments)
    .map(([name, status]) => `${name}: ${status}`)
    .join('; ');
}

const trace = computed(() => {
  const product = selectedProduct.value;
  if (!product) {
    return undefined;
  }
  const formulation = selectedFormulation.value;
  if (!formulation) {
    return {
      error:
        'The linked formulation is unavailable. Review the product reference before relying on this trace.',
    } as const;
  }
  try {
    const expanded = expandFormulation(
      formulation.id,
      { value: '100', unit: 'g' },
      props.formulations,
    );
    const ingredientById = new Map(
      props.ingredients.map((ingredient) => [ingredient.id, ingredient]),
    );
    return {
      rows: expanded.map((item, index) => ({
        key: `${item.sourcePath.join('/')}-${index}`,
        name:
          ingredientById.get(item.ingredientId)?.name ??
          `Unresolved ingredient ${item.ingredientId}`,
        ingredient: ingredientById.get(item.ingredientId),
        mass: item.mass.value,
        sourcePath: item.sourcePath.join(' → '),
      })),
    } as const;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'The formulation could not be expanded.',
    } as const;
  }
});
</script>

<template>
  <section class="page">
    <div class="page-heading compact">
      <div>
        <p class="eyebrow">
          REVIEW WORKSPACE
        </p>
        <h1>Review &amp; trace</h1>
        <p class="lede">
          Inspect the saved inputs and provenance behind a product draft and any stored evaluation
          results.
        </p>
      </div>
      <span class="record-count">No certification</span>
    </div>

    <div
      class="notice notice-warning review-disclaimer"
      role="status"
    >
      <strong>Draft inputs are not a compliance result.</strong>
      <span>No active regulatory release is installed in this workspace. The draft trace below does not
        evaluate legal requirements or imply PASS or FAIL.</span>
    </div>

    <section
      v-if="products.length === 0"
      class="panel empty-state"
    >
      <h2>No product drafts to review</h2>
      <p>Create a product and link its formulation to inspect its input trace.</p>
    </section>

    <template v-else>
      <label class="field review-product-select">
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
        v-if="selectedProduct"
        class="panel trace-panel"
        aria-labelledby="input-trace-title"
      >
        <div class="panel-heading">
          <div>
            <p class="eyebrow">
              INPUT TRACE · DRAFT ONLY
            </p>
            <h2 id="input-trace-title">
              {{ selectedProduct.name }}
            </h2>
          </div>
          <span class="status-text">REVIEW REQUIRED</span>
        </div>

        <dl class="trace-summary">
          <div>
            <dt>Product record</dt>
            <dd>{{ selectedProduct.id }}</dd>
          </div>
          <div>
            <dt>Food state</dt>
            <dd>{{ selectedProduct.foodState ?? 'Not supplied' }}</dd>
          </div>
          <div>
            <dt>Linked formulation</dt>
            <dd>{{ selectedFormulation?.name ?? 'Unavailable — review required' }}</dd>
          </div>
        </dl>

        <p class="field-hint">
          Expanded ingredient quantities use a requested 100 g ingoing basis. This trace does not
          infer a processed yield or final product composition.
        </p>
        <div
          v-if="trace && 'error' in trace"
          class="notice notice-error"
          role="alert"
        >
          <strong>REVIEW REQUIRED</strong>
          <span>{{ trace.error }}</span>
        </div>
        <template v-else-if="trace && 'rows' in trace">
          <div
            v-if="trace.rows.length === 0"
            class="notice notice-warning"
            role="status"
          >
            <strong>REVIEW REQUIRED</strong>
            <span>No ingredient rows were produced for the requested 100 g ingoing basis.</span>
          </div>
          <ul
            v-else
            class="trace-list"
          >
            <li
              v-for="row in trace.rows"
              :key="row.key"
              class="trace-row"
            >
              <div class="trace-row-heading">
                <h3>{{ row.name }}</h3>
                <strong>{{ row.mass }} g / 100 g requested basis</strong>
              </div>
              <p class="trace-path">
                <strong>Source path:</strong> {{ row.sourcePath }}
              </p>
              <dl class="trace-evidence">
                <div>
                  <dt>Supplier specification</dt>
                  <dd v-if="row.ingredient?.specification">
                    {{ row.ingredient.specification.reference }} ·
                    {{ row.ingredient.specification.sourceDate }}
                  </dd>
                  <dd v-else>
                    Not supplied — REVIEW REQUIRED
                  </dd>
                </div>
                <div>
                  <dt>Supplier energy</dt>
                  <dd v-if="row.ingredient?.energyPer100g">
                    {{ row.ingredient.energyPer100g.value }} kJ/100 g ·
                    {{ row.ingredient.energyPer100g.sourceId }} · {{ row.ingredient.energyPer100g.sourceDate }}
                  </dd>
                  <dd v-else>
                    Not supplied — REVIEW REQUIRED
                  </dd>
                </div>
                <div>
                  <dt>Nutrient evidence</dt>
                  <dd
                    v-if="
                      row.ingredient?.nutrientProfile &&
                        Object.keys(row.ingredient.nutrientProfile.values).length
                    "
                  >
                    <small>Unlisted nutrient values remain unknown; they are not zero.</small>
                    <ul class="evidence-list">
                      <li
                        v-for="evidence in nutrientEvidence(row.ingredient)"
                        :key="evidence.nutrient"
                      >
                        {{ evidence.nutrient }}: {{ evidence.value }} {{ evidence.unit }} ·
                        {{ evidence.sourceId }} · {{ evidence.sourceDate }}
                      </li>
                    </ul>
                  </dd>
                  <dd v-else>
                    Not supplied — REVIEW REQUIRED; missing values are not treated as zero.
                  </dd>
                </div>
                <div>
                  <dt>Allergen evidence</dt>
                  <dd v-if="row.ingredient?.allergenEvidence?.length">
                    <small>Only the assessments shown are recorded; unlisted allergens are not
                      established absent.</small>
                    <ul class="evidence-list">
                      <li
                        v-for="evidence in row.ingredient.allergenEvidence"
                        :key="evidence.id"
                      >
                        {{ allergenAssessments(evidence.assessments) }}
                        · {{ evidence.sourceId }} · {{ evidence.sourceDate }} · path
                        {{ evidence.sourcePath.join(' → ') }}
                      </li>
                    </ul>
                  </dd>
                  <dd v-else>
                    Not supplied — REVIEW REQUIRED; blank evidence does not establish absence.
                  </dd>
                </div>
              </dl>
            </li>
          </ul>
        </template>
      </section>

      <section
        class="panel saved-results-panel"
        aria-labelledby="saved-results-title"
      >
        <div class="panel-heading">
          <div>
            <p class="eyebrow">
              STORED REVIEW HISTORY
            </p>
            <h2 id="saved-results-title">
              Evaluation results and rule traces
            </h2>
          </div>
          <span class="count-badge">{{ selectedVersions.length }}</span>
        </div>
        <p
          v-if="selectedVersions.length === 0"
          class="field-hint"
        >
          No versioned evaluation results are stored for this product. The input trace above is not
          a regulatory evaluation.
        </p>
        <article
          v-for="version in selectedVersions"
          :key="version.id"
          class="saved-version"
        >
          <h3>Version {{ version.version }} · {{ version.approvedAt }}</h3>
          <p
            v-if="version.results.length === 0"
            class="field-hint"
          >
            No evaluation results were saved with this version.
          </p>
          <section
            v-for="(result, index) in version.results"
            :key="`${version.id}-${index}`"
            class="saved-result"
          >
            <div class="trace-row-heading">
              <h4>{{ result.title }}</h4>
              <strong>{{ result.status }} · {{ result.applicationMode }}</strong>
            </div>
            <p>{{ result.explanation }}</p>
            <p><strong>Checked:</strong> {{ result.whatWasChecked }}</p>
            <p>
              <strong>Rule:</strong> {{ result.rule.name }} · {{ result.rule.provision }} ·
              {{ result.rule.mappingConfidence }} confidence · {{ result.rule.version }}
              <a
                :href="result.rule.sourceUrl"
                target="_blank"
                rel="noreferrer"
              >Source</a>
            </p>
            <p v-if="result.suggestedAction">
              <strong>Suggested action:</strong> {{ result.suggestedAction }}
            </p>
            <details v-if="result.inputs.length">
              <summary>
                Inspect {{ result.inputs.length }} traced input{{
                  result.inputs.length === 1 ? '' : 's'
                }}
              </summary>
              <ul class="evidence-list">
                <li
                  v-for="(input, inputIndex) in result.inputs"
                  :key="inputIndex"
                >
                  {{ input.name }}: {{ input.value
                  }}<template v-if="input.unit">
                    {{ input.unit }}
                  </template>
                  · {{ input.sourceId }} · {{ input.sourceDate }} ·
                  {{ input.sourcePath.join(' → ') }}
                </li>
              </ul>
            </details>
            <p class="non-certification">
              {{ result.nonCertificationStatement }}
            </p>
          </section>
        </article>
      </section>
    </template>
  </section>
</template>

<style scoped>
.review-disclaimer {
  margin-bottom: 20px;
}
.review-product-select {
  max-width: 440px;
  margin-bottom: 18px;
}
.trace-panel,
.saved-results-panel {
  margin-bottom: 18px;
}
.status-text {
  padding: 7px 10px;
  border: 1px solid #bd8c3d;
  border-radius: 6px;
  color: #704b16;
  background: #fff8e9;
  font-size: 11px;
  font-weight: 750;
}
.trace-summary,
.trace-evidence {
  display: grid;
  gap: 12px;
  margin: 0 0 18px;
}
.trace-summary {
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  padding: 14px;
  border: 1px solid #edf0ec;
  border-radius: 8px;
}
.trace-summary dt,
.trace-evidence dt {
  color: #58675e;
  font-size: 11px;
  font-weight: 700;
}
.trace-summary dd,
.trace-evidence dd {
  margin: 4px 0 0;
  color: #394a40;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.trace-list,
.evidence-list {
  display: grid;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}
.trace-row,
.saved-version {
  padding: 15px 0;
  border-top: 1px solid #edf0ec;
}
.trace-row-heading {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  align-items: baseline;
}
.trace-row-heading h3,
.saved-version h3 {
  margin: 0;
  color: #34453b;
  font-size: 14px;
}
.trace-row-heading strong {
  color: #50665a;
  font-size: 11px;
}
.trace-path {
  margin: 7px 0 13px;
  color: #58675e;
  font-size: 11px;
  overflow-wrap: anywhere;
}
.trace-evidence {
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
}
.evidence-list {
  margin-top: 4px;
  font-size: 11px;
}
.saved-result {
  padding: 14px;
  margin-top: 10px;
  border: 1px solid #edf0ec;
  border-radius: 8px;
}
.saved-result h4 {
  margin: 0;
  font-size: 13px;
}
.saved-result p {
  color: #55655b;
  font-size: 12px;
  line-height: 1.55;
  overflow-wrap: anywhere;
}
.saved-result a {
  color: #2e644f;
}
.saved-result summary {
  cursor: pointer;
  color: #2e644f;
  font-size: 12px;
}
.non-certification {
  font-weight: 700;
}
@media (max-width: 500px) {
  .trace-row-heading {
    align-items: flex-start;
    flex-direction: column;
  }
  .status-text {
    white-space: normal;
  }
}
</style>
