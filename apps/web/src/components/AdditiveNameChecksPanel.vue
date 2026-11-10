<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { EngineResult, IllustrativeResult, PrescribedNameCohortId, ProductAdditiveNameInputs } from '@aus-food/domain';
import type {
  FormulationRecord,
  IngredientRecord,
  LocalFoodStore,
  ProductRecord,
} from '@aus-food/storage';
import { buildAdditiveNameReport } from '../additive-name-checks';
import { illustrativePreviewOn } from '../illustrative-state';
import { permissionCatalog, RULE_RELEASE_LABEL } from '../rule-data';
import IllustrativeNote from './IllustrativeNote.vue';
import IllustrativeToggle from './IllustrativeToggle.vue';
import AppButton from './ui/button/AppButton.vue';

const props = defineProps<{
  store: LocalFoodStore;
  products: readonly ProductRecord[];
  formulations: readonly FormulationRecord[];
  ingredients: readonly IngredientRecord[];
  productId?: string;
}>();
const emit = defineEmits<{ saved: [] }>();

const cohortOptions: { id: PrescribedNameCohortId; label: string }[] = [
  { id: 'formulated_caffeinated_beverage', label: 'Formulated caffeinated beverage' },
  { id: 'food_for_infants', label: 'Food for infants' },
];

const selectedProductId = ref('');
const message = ref('');
const errorMessage = ref('');
const form = reactive({
  cohorts: [] as PrescribedNameCohortId[],
  categoryId: '',
  outputUnit: 'mg/kg' as 'mg/kg' | 'mg/L',
  noProcessMassChange: false,
  gmpConfirmed: false,
  addedSugars: '',
  sugarsBasisConfirmed: false,
  evidenceReference: '',
  evidenceDate: '',
  densityValue: '',
  densityReference: '',
  densityDate: '',
});

const selectedProduct = computed(() =>
  props.products.find((product) => product.id === selectedProductId.value),
);

watch(
  () => props.products,
  (products) => {
    if (props.productId !== undefined) {
      selectedProductId.value = props.productId;
    } else if (!products.some((product) => product.id === selectedProductId.value)) {
      selectedProductId.value = products[0]?.id ?? '';
    }
  },
  { immediate: true },
);

watch(
  selectedProduct,
  (product) => {
    const saved = product?.additiveNameInputs;
    form.cohorts = [...(saved?.confirmedCohorts ?? [])];
    form.categoryId = saved?.additiveCategoryId ?? '';
    form.outputUnit = saved?.outputUnit ?? 'mg/kg';
    form.noProcessMassChange = saved?.noProcessMassChangeConfirmed ?? false;
    form.gmpConfirmed = saved?.gmpConfirmed ?? false;
    form.addedSugars = saved?.addedSugarsPer100g ?? '';
    form.sugarsBasisConfirmed = saved?.sugarsBasisConfirmed ?? false;
    form.evidenceReference = saved?.evidence?.reference ?? '';
    form.evidenceDate = saved?.evidence?.sourceDate ?? '';
    form.densityValue = saved?.finalDensity?.gramsPerMillilitre ?? '';
    form.densityReference = saved?.finalDensity?.evidenceReference ?? '';
    form.densityDate = saved?.finalDensity?.sourceDate ?? '';
  },
  { immediate: true },
);

const report = computed(() =>
  selectedProduct.value
    ? buildAdditiveNameReport(selectedProduct.value, props.formulations, props.ingredients, illustrativePreviewOn.value)
    : undefined,
);

interface ResultCard {
  key: string;
  heading: string;
  result: EngineResult<unknown>;
  reasons: readonly string[];
  detail: readonly string[];
  preview?: IllustrativeResult<unknown> | undefined;
}

function card(
  key: string,
  heading: string,
  result: EngineResult<unknown>,
  reasons: readonly string[],
  detail: readonly string[] = [],
  preview?: IllustrativeResult<unknown>,
): ResultCard {
  return { key, heading, result, reasons, detail, preview };
}

const resultCards = computed<ResultCard[]>(() => {
  const current = report.value;
  if (!current) {
    return [];
  }
  const cards: ResultCard[] = [];
  for (const additive of current.additives) {
    const label = `${additive.codeNumber} (${additive.names.join(', ')})`;
    const concentration = additive.concentration;
    cards.push(card(
      `perm-${additive.codeNumber}`,
      `Additive permission: ${label}`,
      additive.permission,
      additive.permission.value?.reasons ?? [],
      concentration.status === 'calculated'
        ? [`Calculated final concentration: ${concentration.value} ${concentration.unit} (from ${concentration.contributions.length} source record(s))`]
        : [`Concentration not calculated: ${concentration.reasons.join(', ')}`, ...concentration.detail],
      additive.preview,
    ));
  }
  if (current.names) {
    cards.push(card('names', 'Prescribed-name candidates', current.names, current.names.value?.reasons ?? [],
      (current.names.value?.candidates ?? []).map((item) => `${item.provision}: ${item.requirement}`)));
  }
  if (current.sweetened) {
    cards.push(card('sweetened', "Infant food 'sweetened' word", current.sweetened, current.sweetened.value?.reasons ?? [], [], current.sweetenedPreview));
  }
  return cards;
});

function buildInputs(): ProductAdditiveNameInputs {
  const evidence = form.evidenceReference.trim() && form.evidenceDate
    ? { evidence: { reference: form.evidenceReference.trim(), sourceDate: form.evidenceDate } }
    : {};
  const density = form.densityValue.trim() && form.densityReference.trim() && form.densityDate
    ? {
        finalDensity: {
          gramsPerMillilitre: form.densityValue.trim(),
          evidenceReference: form.densityReference.trim(),
          sourceDate: form.densityDate,
        },
      }
    : {};
  return {
    confirmedCohorts: [...form.cohorts],
    ...(form.categoryId ? { additiveCategoryId: form.categoryId } : {}),
    outputUnit: form.outputUnit,
    noProcessMassChangeConfirmed: form.noProcessMassChange,
    gmpConfirmed: form.gmpConfirmed,
    ...(form.addedSugars.trim() ? { addedSugarsPer100g: form.addedSugars.trim() } : {}),
    sugarsBasisConfirmed: form.sugarsBasisConfirmed,
    ...evidence,
    ...density,
  };
}

async function save(): Promise<void> {
  const product = selectedProduct.value;
  if (!product) {
    return;
  }
  message.value = '';
  errorMessage.value = '';
  try {
    await props.store.products.update(product.id, { additiveNameInputs: buildInputs() });
    message.value = 'Additive and name inputs saved on this product draft.';
    emit('saved');
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'The inputs could not be saved.';
  }
}
</script>

<template>
  <section :class="productId === undefined ? 'page' : 'embedded'">
    <div
      v-if="productId === undefined"
      class="page-heading compact"
    >
      <div>
        <p class="eyebrow">
          ADDITIVES &amp; PRESCRIBED NAMES
        </p>
        <h1>Additives &amp; names</h1>
        <p class="lede">
          Supported MVP products: formulated caffeinated beverages and foods for infants. Every
          figure below comes from facts you enter; unknown values are never treated as zero.
        </p>
      </div>
    </div>

    <div
      class="notice notice-warning"
      role="status"
    >
      <strong>REVIEW REQUIRED</strong>
      <span>{{ RULE_RELEASE_LABEL }}. These results assist review and do not certify legal compliance.
        Rule data below Provision-level mapping, or not reviewed, cannot produce a pass or fail.</span>
    </div>

    <section
      v-if="products.length === 0"
      class="panel empty-state"
    >
      <h2>No product drafts</h2>
      <p>Create a product draft first.</p>
    </section>

    <template v-else>
      <label
        v-if="productId === undefined"
        class="field"
      >
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

      <form
        class="panel"
        aria-labelledby="additive-inputs-title"
        @submit.prevent="save"
      >
        <h2 id="additive-inputs-title">
          Facts you confirm
        </h2>
        <fieldset class="field">
          <legend>Confirmed product cohort</legend>
          <label
            v-for="option in cohortOptions"
            :key="option.id"
          >
            <input
              v-model="form.cohorts"
              type="checkbox"
              :value="option.id"
            >
            {{ option.label }}
          </label>
        </fieldset>
        <label class="field">
          <span>Confirmed additive food category</span>
          <select v-model="form.categoryId">
            <option value="">Not confirmed</option>
            <option
              v-for="category in permissionCatalog.categories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.code }} {{ category.name }}
            </option>
          </select>
        </label>
        <label class="field">
          <span>Concentration unit</span>
          <select v-model="form.outputUnit">
            <option value="mg/kg">mg/kg</option>
            <option value="mg/L">mg/L</option>
          </select>
        </label>
        <label>
          <input
            v-model="form.noProcessMassChange"
            type="checkbox"
          >
          I confirm no mass is added, gained or lost in processing
        </label>
        <label class="field">
          <span>Final density (g/mL, only for per-volume limits)</span>
          <input
            v-model="form.densityValue"
            inputmode="decimal"
          >
        </label>
        <label class="field">
          <span>Final density evidence reference</span>
          <input v-model="form.densityReference">
        </label>
        <label class="field">
          <span>Final density evidence date</span>
          <input
            v-model="form.densityDate"
            type="date"
          >
        </label>
        <label>
          <input
            v-model="form.gmpConfirmed"
            type="checkbox"
          >
          I confirm good manufacturing practice (GMP) is met
        </label>
        <label class="field">
          <span>Added sugars, honey and native bee honey (g per 100 g)</span>
          <input
            v-model="form.addedSugars"
            inputmode="decimal"
          >
        </label>
        <label>
          <input
            v-model="form.sugarsBasisConfirmed"
            type="checkbox"
          >
          I confirm the sugars figure is total monosaccharides and disaccharides from added sources
        </label>
        <label class="field">
          <span>Evidence reference</span>
          <input v-model="form.evidenceReference">
        </label>
        <label class="field">
          <span>Evidence date</span>
          <input
            v-model="form.evidenceDate"
            type="date"
          >
        </label>
        <AppButton type="submit">
          Save inputs
        </AppButton>
        <p
          v-if="message"
          class="field-hint"
          role="status"
        >
          {{ message }}
        </p>
        <div
          v-if="errorMessage"
          class="notice notice-error"
          role="alert"
        >
          {{ errorMessage }}
        </div>
      </form>

      <div
        v-if="report?.error"
        class="notice notice-error"
        role="alert"
      >
        {{ report.error }}
      </div>

      <IllustrativeToggle />

      <section
        v-if="report"
        class="panel"
        aria-labelledby="declaration-title"
      >
        <h2 id="declaration-title">
          Declaration output (separate from permission and name results)
        </h2>
        <p
          v-if="report.declarations.length === 0"
          class="field-hint"
        >
          No additive sources recorded for this product's ingredients.
        </p>
        <ul v-else>
          <li
            v-for="(line, index) in report.declarations"
            :key="index"
          >
            {{ line.additiveName }} in {{ line.ingredientName }}:
            <strong>REVIEW REQUIRED</strong>
            <template v-if="line.candidate.text">
              &ndash; candidate wording &ldquo;{{ line.candidate.text }}&rdquo;
            </template>
            ({{ line.candidate.reason }})
          </li>
        </ul>
      </section>

      <section
        v-if="report"
        class="panel"
        aria-labelledby="evaluation-title"
      >
        <h2 id="evaluation-title">
          Permission and prescribed-name evaluation
        </h2>
        <p
          v-if="report.uncodedAdditives.length > 0"
          class="field-hint"
        >
          No code number recorded, so not evaluated for permission: {{ report.uncodedAdditives.join(', ') }}.
        </p>
        <article
          v-for="item in resultCards"
          :key="item.key"
          class="panel"
          :aria-label="item.heading"
        >
          <h3>{{ item.heading }}</h3>
          <p>
            <strong>Status: {{ item.result.status }}</strong>
            ({{ item.result.applicationMode }})
          </p>
          <p>{{ item.result.explanation }}</p>
          <p
            v-if="item.reasons.length > 0"
          >
            Review reasons: {{ item.reasons.join(', ') }}
          </p>
          <ul v-if="item.detail.length > 0">
            <li
              v-for="line in item.detail"
              :key="line"
            >
              {{ line }}
            </li>
          </ul>
          <details>
            <summary>Rule, source and inputs</summary>
            <p>
              {{ item.result.rule.name }} &ndash; {{ item.result.rule.provision }}
              (mapping confidence: {{ item.result.rule.mappingConfidence }},
              version {{ item.result.rule.version }})
            </p>
            <p>{{ item.result.rule.sourceUrl }}</p>
            <ul>
              <li
                v-for="input in item.result.inputs"
                :key="input.name"
              >
                {{ input.name }}: {{ input.value }} {{ input.unit ?? '' }}
                (evidence {{ input.sourceId }}, {{ input.sourceDate }})
              </li>
            </ul>
          </details>
          <IllustrativeNote
            v-if="item.preview"
            :preview="item.preview"
            :label="item.heading"
          />
          <p class="field-hint">
            {{ item.result.nonCertificationStatement }}
          </p>
        </article>
        <h3>Not run in this workspace</h3>
        <ul>
          <li
            v-for="line in report.limitations"
            :key="line"
          >
            {{ line }}
          </li>
        </ul>
      </section>
    </template>
  </section>
</template>
