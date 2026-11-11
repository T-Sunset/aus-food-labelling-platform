<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue';
import {
  createEmptyProductClassificationProfile,
  expandFormulation,
  formatAdditiveDeclarationCandidate,
  screenPrescribedNameCandidate,
  screenProductClassCandidates,
  sumDecimals,
  traceAdditiveAllergenEvidence,
  traceAdditiveSources,
} from '@aus-food/engine';
import AppButton from './components/ui/button/AppButton.vue';
import BackupPanel from './components/BackupPanel.vue';
import FormulationBuilder from './components/FormulationBuilder.vue';
import IngredientBuilder from './components/IngredientBuilder.vue';
import LabelExportPanel from './components/LabelExportPanel.vue';
import ProductBuilder from './components/ProductBuilder.vue';
import ReviewTracePanel from './components/ReviewTracePanel.vue';
import { editableIngredientKeys } from './ingredient-form';
import { seedIllustrativeDemo } from './demo-workspace.js';
import { workedExampleSet } from './worked-example-data.js';
import {
  loadWorkedExamples,
  removeWorkedExamples,
  workedExampleCount,
  workedExampleTag,
} from './worked-examples.js';
import {
  openLocalFoodStore,
  type ApprovedVersionRecord,
  type FormulationRecord,
  type IngredientRecord,
  type LocalFoodStore,
  type ProductRecord,
  type WorkspaceDraftRecord,
} from '@aus-food/storage';

type IngredientAdditiveSource = NonNullable<IngredientRecord['additiveSources']>[number];
type AdditiveConcentration = NonNullable<IngredientAdditiveSource['concentration']>;

type Section =
  | 'overview'
  | 'ingredients'
  | 'formulations'
  | 'products'
  | 'review'
  | 'labels'
  | 'backup';

const activeSection = ref<Section>('overview');
const store = shallowRef<LocalFoodStore>();
const loading = ref(true);
const loadError = ref('');
const actionMessage = ref('');
const actionError = ref('');
const ingredients = ref<IngredientRecord[]>([]);
const formulations = ref<FormulationRecord[]>([]);
const products = ref<ProductRecord[]>([]);
const productVersions = ref<ApprovedVersionRecord[]>([]);
const expansion = ref<{
  productId: string;
  rows: { name: string; mass: string; path: string }[];
  additiveSources: (ReturnType<typeof traceAdditiveSources>[number] & { path: string })[];
  additiveAllergenEvidence: (
    ReturnType<typeof traceAdditiveAllergenEvidence>[number] & { path: string }
  )[];
  totalMass: string;
}>();
const expansionError = ref('');

const productEditor = ref<ProductRecord | 'new'>();
const createdProductId = ref<string>();

const sections: { id: Section; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'ingredients', label: 'Ingredients' },
  { id: 'formulations', label: 'Formulations' },
  { id: 'products', label: 'Products' },
  { id: 'labels', label: 'Labels' },
  { id: 'backup', label: 'Backup & restore' },
];
const checkSections: { id: Section; label: string }[] = [{ id: 'review', label: 'Review & trace' }];

const records = computed(() => ({
  ingredients: ingredients.value.length,
  formulations: formulations.value.length,
  products: products.value.length,
}));

function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function clearMessages(): void {
  actionMessage.value = '';
  actionError.value = '';
}

function explainError(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected local storage error occurred.';
}

function screeningOutcomeLabel(
  outcome: 'candidate_indicated' | 'not_indicated' | 'inconclusive' | undefined,
): string {
  switch (outcome) {
    case 'candidate_indicated':
      return 'Candidate indicated; reviewer confirmation required';
    case 'not_indicated':
      return 'Candidate not indicated by recorded facts; review still required';
    default:
      return 'Insufficient or conflicting evidence; review required';
  }
}

function productClassificationResults(product: ProductRecord) {
  return screenProductClassCandidates(
    product.classificationProfile ?? createEmptyProductClassificationProfile(),
  );
}

function productNameScreening(product: ProductRecord) {
  return screenPrescribedNameCandidate(
    product.name,
    product.classificationProfile ?? createEmptyProductClassificationProfile(),
    product.id,
    product.updatedAt,
  );
}

async function refreshRecords(): Promise<void> {
  if (store.value === undefined) {
    return;
  }
  [ingredients.value, formulations.value, products.value] = await Promise.all([
    store.value.ingredients.list(),
    store.value.formulations.list(),
    store.value.products.list(),
  ]);
  if (productEditor.value && productEditor.value !== 'new') {
    const editingId = productEditor.value.id;
    productEditor.value = products.value.find((product) => product.id === editingId);
  }
  productVersions.value = (
    await Promise.all(
      products.value.map((product) => store.value!.approvedVersions.list('product', product.id)),
    )
  ).flat();
}

async function loadIllustrativeDemo(): Promise<void> {
  clearMessages();
  if (store.value === undefined) {
    actionError.value = 'Local storage is not available.';
    return;
  }
  try {
    await seedIllustrativeDemo(store.value);
    await refreshRecords();
    actionMessage.value =
      'Illustrative demo data loaded locally. It contains no supplier, nutrient, allergen or regulatory evidence.';
  } catch (error) {
    actionError.value = explainError(error);
  }
}

const hasWorkedExamplesLoaded = computed(() =>
  [...ingredients.value, ...formulations.value, ...products.value].some((record) =>
    record.tags.includes(workedExampleTag),
  ),
);

async function loadWorkedExampleRecords(): Promise<void> {
  clearMessages();
  if (store.value === undefined) {
    actionError.value = 'Local storage is not available.';
    return;
  }
  try {
    const result = await loadWorkedExamples(store.value, workedExampleSet);
    await refreshRecords();
    actionMessage.value =
      result.skipped > 0
        ? `Worked examples loaded locally: ${result.created} added, ${result.skipped} already present and left unchanged. All figures are invented.`
        : `Worked examples loaded locally: ${result.created} records added. All figures are invented.`;
  } catch (error) {
    actionError.value = explainError(error);
  }
}

async function removeWorkedExampleRecords(): Promise<void> {
  if (
    store.value === undefined ||
    !window.confirm(
      'Remove the worked examples? Only records tagged worked-example are deleted; your own drafts are not touched. This cannot be undone.',
    )
  ) {
    return;
  }
  clearMessages();
  try {
    const result = await removeWorkedExamples(store.value);
    await refreshRecords();
    actionMessage.value =
      result.kept > 0
        ? `Worked examples removed: ${result.removed} deleted, ${result.kept} kept because they are in use or have an approved version.`
        : `Worked examples removed: ${result.removed} records deleted.`;
  } catch (error) {
    actionError.value = explainError(error);
  }
}

onMounted(async () => {
  try {
    store.value = await openLocalFoodStore();
    await refreshRecords();
  } catch (error) {
    loadError.value = explainError(error);
  } finally {
    loading.value = false;
  }
});

function additiveDeclarationCandidate(source: IngredientAdditiveSource, ingredientId: string, sourcePath: readonly string[]) {
  const selection = source.declarationSelection;
  return formatAdditiveDeclarationCandidate({
    route: selection?.route ?? 'unknown',
    additiveName: source.additiveName,
    ...(source.codeNumber ? { codeNumber: source.codeNumber } : {}),
    ...(selection?.schedule7ClassName ? { schedule7ClassName: selection.schedule7ClassName } : {}),
    ...(selection?.substanceChoice ? { substanceChoice: selection.substanceChoice } : {}),
    ...(selection?.flavouringWording ? { flavouringWording: selection.flavouringWording } : {}),
    ingredientId,
    sourcePath,
  });
}

function additiveSourceStatusLabel(status: IngredientAdditiveSource['sourceStatus']): string {
  switch (status) {
    case 'added':
      return 'Added to this ingredient';
    case 'carriedOver':
      return 'Carried over';
    case 'processingAid':
      return 'Processing aid';
    case 'unknown':
      return 'Status not assessed';
  }
}

function additiveConcentrationUnitLabel(unit: AdditiveConcentration['unit']): string {
  switch (unit) {
    case 'mgPerKg':
      return 'mg/kg';
    case 'gPerKg':
      return 'g/kg';
    case 'mgPerL':
      return 'mg/L';
    case 'gPerL':
      return 'g/L';
    case 'mgPer100g':
      return 'mg/100 g';
    case 'gPer100g':
      return 'g/100 g';
    case 'mgPer100mL':
      return 'mg/100 mL';
    case 'gPer100mL':
      return 'g/100 mL';
    case 'percentByMass':
      return '% by mass';
    case 'percentByVolume':
      return '% by volume';
  }
}

function additiveConcentrationBasisLabel(basis: AdditiveConcentration['basis']): string {
  switch (basis) {
    case 'asSupplied':
      return 'as supplied';
    case 'dryMatter':
      return 'dry matter';
    case 'asAdded':
      return 'as added';
    case 'asPrepared':
      return 'as prepared';
    case 'asReconstituted':
      return 'as reconstituted';
    case 'asDrained':
      return 'as drained';
    case 'unknown':
      return 'basis not supplied';
  }
}

const ingredientEditor = ref<IngredientRecord | 'new'>();

async function saveIngredient(record: IngredientRecord): Promise<void> {
  clearMessages();
  if (store.value === undefined) {
    actionError.value = 'Local storage is not available.';
    return;
  }
  try {
    if (ingredientEditor.value === 'new' || ingredientEditor.value === undefined) {
      await store.value.ingredients.create(record);
    } else {
      // Storage merges changes, so a field the person cleared is sent as an explicit undefined.
      const changes: Record<string, unknown> = { name: record.name, kind: record.kind };
      for (const key of editableIngredientKeys) {
        changes[key] = record[key];
      }
      await store.value.ingredients.update(record.id, changes);
    }
    await refreshRecords();
    ingredientEditor.value = undefined;
    actionMessage.value = 'Ingredient draft saved locally.';
  } catch (error) {
    actionError.value = explainError(error);
  }
}

const formulationEditor = ref<FormulationRecord | 'new'>();

async function saveFormulation(record: FormulationRecord): Promise<void> {
  clearMessages();
  expansion.value = undefined;
  expansionError.value = '';
  if (store.value === undefined) {
    actionError.value = 'Local storage is not available.';
    return;
  }
  try {
    if (formulationEditor.value === 'new' || formulationEditor.value === undefined) {
      await store.value.formulations.create(record);
    } else {
      // Only the fields the builder manages are changed; anything else on the record is kept.
      await store.value.formulations.update(record.id, { name: record.name, lines: record.lines });
    }
    await refreshRecords();
    formulationEditor.value = undefined;
    actionMessage.value = 'Formulation draft saved locally.';
  } catch (error) {
    actionError.value = explainError(error);
  }
}

function calculateFormulation(formulation: FormulationRecord): void {
  expansionError.value = '';
  expansion.value = undefined;
  try {
    const expanded = expandFormulation(
      formulation.id,
      { value: '100', unit: 'g' },
      formulations.value,
    );
    const ingredientById = new Map(
      ingredients.value.map((ingredient) => [ingredient.id, ingredient]),
    );
    const additiveSources = traceAdditiveSources(
      expanded,
      new Map(ingredients.value.map((ingredient) => [
        ingredient.id,
        ingredient.additiveSources ?? [],
      ])),
    );
    const additiveAllergenEvidence = traceAdditiveAllergenEvidence(
      expanded,
      new Map(ingredients.value.map((ingredient) => [
        ingredient.id,
        ingredient.additiveSources ?? [],
      ])),
    );
    const formulationById = new Map(
      formulations.value.map((item) => [item.id, item]),
    );
    const additiveSourceById = new Map(
      ingredients.value.flatMap((item) =>
        (item.additiveSources ?? []).map((source) => [source.id, source] as const),
      ),
    );
    expansion.value = {
      productId: formulation.id,
      rows: expanded.map((item) => ({
        name:
          ingredientById.get(item.ingredientId)?.name ??
          `Unresolved ingredient ${item.ingredientId}`,
        mass: item.mass.value,
        path: item.sourcePath.join(' → '),
      })),
      additiveSources: additiveSources.map((source) => ({
        ...source,
        path: source.sourcePath
          .map((id) => ingredientById.get(id)?.name ?? formulationById.get(id)?.name ?? id)
          .join(' → '),
      })),
      additiveAllergenEvidence: additiveAllergenEvidence.map((evidence) => ({
        ...evidence,
        path: evidence.sourcePath
          .map((id) =>
            ingredientById.get(id)?.name
            ?? formulationById.get(id)?.name
            ?? additiveSourceById.get(id)?.additiveName
            ?? id)
          .join(' → '),
      })),
      totalMass: sumDecimals(expanded.map((item) => item.mass.value)),
    };
  } catch (error) {
    expansionError.value = `Review required: ${explainError(error)}`;
  }
}

function confirmDelete(record: WorkspaceDraftRecord): boolean {
  return window.confirm(`Delete the draft "${record.name}"? This cannot be undone.`);
}

async function deleteRecord(record: WorkspaceDraftRecord): Promise<void> {
  if (store.value === undefined || !confirmDelete(record)) {
    return;
  }
  clearMessages();
  try {
    if (record.recordType === 'ingredient') {
      await store.value.ingredients.delete(record.id);
    } else if (record.recordType === 'formulation') {
      await store.value.formulations.delete(record.id);
    } else {
      await store.value.products.delete(record.id);
    }
    await refreshRecords();
    actionMessage.value = 'Draft deleted.';
  } catch (error) {
    actionError.value = explainError(error);
  }
}
</script>

<template>
  <div class="app-shell">
    <a
      class="skip-link"
      href="#main-content"
    >Skip to main content</a>
    <header class="topbar">
      <a
        class="brand"
        href="#"
        @click.prevent="activeSection = 'overview'"
      >
        <span
          class="brand-mark"
          aria-hidden="true"
        >F</span>
        <span>
          <strong>Fieldnote</strong>
          <small>Food label workspace</small>
        </span>
      </a>
      <span class="local-badge"><span aria-hidden="true" /> Stored on this device</span>
    </header>

    <div class="workspace">
      <aside
        class="sidebar"
        aria-label="Workspace navigation"
      >
        <p class="nav-caption">
          WORKSPACE
        </p>
        <nav>
          <button
            v-for="section in sections"
            :key="section.id"
            type="button"
            class="nav-link"
            :class="{ active: activeSection === section.id }"
            :aria-current="activeSection === section.id ? 'page' : undefined"
            @click="activeSection = section.id"
          >
            <span
              class="nav-indicator"
              aria-hidden="true"
            />
            {{ section.label }}
          </button>
        </nav>
        <p class="nav-caption">
          CHECKS
        </p>
        <nav aria-label="Checks">
          <button
            v-for="section in checkSections"
            :key="section.id"
            type="button"
            class="nav-link"
            :class="{ active: activeSection === section.id }"
            :aria-current="activeSection === section.id ? 'page' : undefined"
            @click="activeSection = section.id"
          >
            <span
              class="nav-indicator"
              aria-hidden="true"
            />
            {{ section.label }}
          </button>
        </nav>
        <div class="sidebar-note">
          <span
            class="note-icon"
            aria-hidden="true"
          >i</span>
          <p>Drafts and supplier details stay in this browser profile.</p>
        </div>
      </aside>

      <main
        id="main-content"
        class="main-content"
      >
        <div
          v-if="loading"
          class="page-state"
          role="status"
        >
          Opening your local workspace…
        </div>
        <section
          v-else-if="loadError"
          class="page-state error-card"
          role="alert"
        >
          <p class="eyebrow">
            WORKSPACE UNAVAILABLE
          </p>
          <h1>We couldn’t open local storage</h1>
          <p>{{ loadError }}</p>
          <p>Your data has not been sent anywhere. Check browser storage access and reload.</p>
        </section>
        <template v-else>
          <div
            v-if="store?.workspaceWasPreviouslyUsed"
            class="notice notice-warning"
            role="status"
          >
            <strong>Local workspace appears empty.</strong>
            <span>This browser previously had workspace data. It may have been cleared; restore from a
              backup if available.</span>
          </div>
          <div
            v-if="store && !store.workspaceUsageMarkerAvailable"
            class="notice notice-warning"
            role="status"
          >
            <strong>Storage-clear detection is unavailable.</strong>
            <span>This browser does not allow the local marker needed to detect cleared workspace
              data.</span>
          </div>

          <div
            v-if="actionMessage"
            class="notice notice-success"
            role="status"
            aria-live="polite"
          >
            {{ actionMessage }}
          </div>
          <div
            v-if="actionError"
            class="notice notice-error"
            role="alert"
          >
            <strong>Action could not be completed.</strong> {{ actionError }}
          </div>

          <section
            v-if="activeSection === 'overview'"
            class="page"
          >
            <div class="page-heading">
              <div>
                <p class="eyebrow">
                  YOUR LOCAL WORKSPACE
                </p>
                <h1>Good work starts with good records.</h1>
                <p class="lede">
                  Make a draft pack-copy label in three steps: add your ingredients from your supplier spec
                  sheets, put them together into a recipe, then set up your product. Nothing leaves your
                  device.
                </p>
              </div>
              <div
                class="heading-art"
                aria-hidden="true"
              >
                <span>F</span><i /><b />
              </div>
            </div>

            <div
              class="summary-grid"
              aria-label="Workspace record counts"
            >
              <article class="summary-card">
                <span class="summary-label">Ingredients</span>
                <strong>{{ records.ingredients }}</strong>
                <span class="summary-detail">from your supplier spec sheets</span>
              </article>
              <article class="summary-card">
                <span class="summary-label">Formulations</span>
                <strong>{{ records.formulations }}</strong>
                <span class="summary-detail">recipes, which can include other recipes</span>
              </article>
              <article class="summary-card">
                <span class="summary-label">Products</span>
                <strong>{{ records.products }}</strong>
                <span class="summary-detail">each based on one recipe</span>
              </article>
            </div>

            <div class="overview-grid">
              <section class="panel journey-panel">
                <div class="panel-heading">
                  <div>
                    <p class="eyebrow">
                      START HERE
                    </p>
                    <h2>Build your product foundation</h2>
                  </div>
                  <span class="step-count">01 — 03</span>
                </div>
                <ol class="journey-list">
                  <li>
                    <span class="journey-number">01</span>
                    <div>
                      <strong>Add your ingredients</strong>
                      <p>Have each supplier spec sheet to hand. Enter what it says: the nutrition figures, allergens and any additives.</p>
                    </div>
                    <AppButton
                      variant="link"
                      size="sm"
                      type="button"
                      @click="activeSection = 'ingredients'"
                    >
                      Open <span aria-hidden="true">→</span>
                    </AppButton>
                  </li>
                  <li>
                    <span class="journey-number">02</span>
                    <div>
                      <strong>Put them into a recipe</strong>
                      <p>Enter how much of each ingredient goes in. We work out the amounts per 100 g.</p>
                    </div>
                    <AppButton
                      variant="link"
                      size="sm"
                      type="button"
                      @click="activeSection = 'formulations'"
                    >
                      Open <span aria-hidden="true">→</span>
                    </AppButton>
                  </li>
                  <li>
                    <span class="journey-number">03</span>
                    <div>
                      <strong>Set up your product</strong>
                      <p>Name your product and choose the recipe it is made from.</p>
                    </div>
                    <AppButton
                      variant="link"
                      size="sm"
                      type="button"
                      @click="activeSection = 'products'"
                    >
                      Open <span aria-hidden="true">→</span>
                    </AppButton>
                  </li>
                </ol>
              </section>
              <aside class="review-card">
                <span
                  class="review-icon"
                  aria-hidden="true"
                >!</span>
                <p class="eyebrow">
                  IMPORTANT
                </p>
                <h2>This is a drafting aid, not a clearance.</h2>
                <p>
                  Everything here is a draft to take to a food consultant. Our rule data has not been
                  reviewed yet, so no result should be relied on as legal advice. The label page is a
                  demonstration layout only.
                </p>
                <span class="review-status"><span aria-hidden="true" /> No regulatory release installed</span>
              </aside>
            </div>
            <section
              v-if="records.ingredients + records.formulations + records.products === 0"
              class="panel demo-panel"
              aria-labelledby="demo-data-title"
            >
              <div>
                <p class="eyebrow">
                  OPTIONAL · LOCAL ONLY
                </p>
                <h2 id="demo-data-title">
                  Explore with illustrative sample data
                </h2>
                <p>
                  Adds two fictional ingredients, one formulation and one product draft. It adds no
                  supplier, nutrient, allergen or regulatory evidence and is not a compliance fixture.
                </p>
              </div>
              <AppButton
                type="button"
                @click="loadIllustrativeDemo"
              >
                Load illustrative demo data
              </AppButton>
            </section>
            <section
              v-if="workedExampleCount(workedExampleSet) > 0"
              class="panel demo-panel"
              aria-labelledby="worked-examples-title"
            >
              <div>
                <p class="eyebrow">
                  OPTIONAL · LOCAL ONLY
                </p>
                <h2 id="worked-examples-title">
                  Worked examples for review
                </h2>
                <p>
                  Adds invented caffeinated beverage and infant food products with additive and claim
                  inputs so every page can be seen working. Every figure is invented and every result
                  stays REVIEW REQUIRED. Existing records are never overwritten.
                </p>
              </div>
              <div class="button-row">
                <AppButton
                  type="button"
                  @click="loadWorkedExampleRecords"
                >
                  Load worked examples
                </AppButton>
                <AppButton
                  v-if="hasWorkedExamplesLoaded"
                  type="button"
                  variant="outline"
                  @click="removeWorkedExampleRecords"
                >
                  Remove worked examples
                </AppButton>
              </div>
            </section>
            <section
              v-if="hasWorkedExamplesLoaded"
              class="panel"
              aria-labelledby="worked-guide-title"
            >
              <h2 id="worked-guide-title">
                Guide to the worked examples
              </h2>
              <p>
                Open each product on the pages named below. Turn on "Show what each result would be" on
                Additives &amp; names or Claims to see the illustrative preview. Every official status stays
                REVIEW REQUIRED, and nothing here certifies compliance.
              </p>
              <ul>
                <li>
                  <strong>Example Citrus Boost</strong> (caffeinated beverage, good): additives within their
                  limits, including sodium benzoate stated as benzoic acid, and "Low sugars" would meet its
                  condition.
                </li>
                <li>
                  <strong>Example Citrus Boost Max</strong> (caffeinated beverage, problem): wood rosin esters
                  over the limit, a missing concentration, an unknown source status, "Low sugars" not met,
                  "Low energy" missing its figure, and a health claim that is review-only.
                </li>
                <li>
                  <strong>Example Apple and Oat Puree</strong> (infant food, good): additives within limits,
                  the "sweetened" word not required, and "Good source of dietary fibre" would meet its
                  condition.
                </li>
                <li>
                  <strong>Example Honey and Oat Puree</strong> (infant food, problem): carrageenan over the
                  limit, "sweetened" blocked by an unconfirmed sugars basis, "Low fat" blocked as a prohibited
                  context, "Low sodium" blocked by an unconfirmed classification, and a sterilised-honey
                  name candidate.
                </li>
              </ul>
              <p>
                The Labels page also works for these products. It remains a demonstration
                layout, not a food label.
              </p>
            </section>
            <p class="privacy-footnote">
              Your formulation data is stored locally in this browser. Back up important work using
              your browser profile and workspace backup tools when available.
            </p>
          </section>

          <section
            v-else-if="activeSection === 'ingredients'"
            class="page"
          >
            <div class="page-heading compact">
              <div>
                <p class="eyebrow">
                  INGREDIENT LIBRARY
                </p>
                <h1>Ingredients</h1>
                <p class="lede">
                  Your ingredient library. Add each ingredient from its supplier's spec sheet, and edit or
                  delete them any time. If a value isn't on the sheet, leave it blank. We never treat a
                  blank as zero.
                </p>
              </div>
              <span class="record-count">{{ records.ingredients }} saved</span>
            </div>

            <div class="content-grid">
              <IngredientBuilder
                v-if="ingredientEditor !== undefined"
                :key="ingredientEditor === 'new' ? 'new' : ingredientEditor.id"
                :record="ingredientEditor === 'new' ? undefined : ingredientEditor"
                :formulations="formulations"
                :make-id="makeId"
                @save="saveIngredient"
                @cancel="ingredientEditor = undefined"
              />

              <section
                v-else
                class="panel records-panel wide"
                aria-labelledby="ingredient-records-title"
              >
                <div class="panel-heading">
                  <div>
                    <p class="eyebrow">
                      SAVED LOCALLY
                    </p>
                    <h2 id="ingredient-records-title">
                      Ingredients
                    </h2>
                  </div>
                  <span class="count-badge">{{ ingredients.length }}</span>
                  <AppButton
                    type="button"
                    @click="ingredientEditor = 'new'"
                  >
                    Add ingredient
                  </AppButton>
                </div>
                <div
                  v-if="ingredients.length === 0"
                  class="empty-state"
                >
                  <span
                    class="empty-mark"
                    aria-hidden="true"
                  >01</span>
                  <h3>No ingredients yet</h3>
                  <p>
                    Choose "Add ingredient" to start with a supplier ingredient or specification. You can save
                    incomplete drafts and fill in missing evidence later.
                  </p>
                </div>
                <ul
                  v-else
                  class="record-list"
                >
                  <li
                    v-for="record in ingredients"
                    :key="record.id"
                    class="record-item"
                  >
                    <span
                      class="record-avatar"
                      aria-hidden="true"
                    >{{
                      record.name.slice(0, 1).toUpperCase()
                    }}</span>
                    <div class="record-main">
                      <strong>{{ record.name }}</strong>
                      <span>{{
                        record.kind === 'compound' ? 'Compound ingredient' : 'Single ingredient'
                      }}<template v-if="record.supplierName">
                        · {{ record.supplierName }}</template></span>
                      <small v-if="record.specification">Spec {{ record.specification.reference }} ·
                        {{ record.specification.sourceDate }}</small>
                      <small v-else>Specification not supplied</small>
                      <small v-if="record.nutrientProfile">Nutrient values recorded</small>
                      <small v-else>Nutrient values not supplied</small>
                      <small v-if="record.allergenEvidence">Supplier allergen evidence recorded</small>
                      <small v-else>Allergen evidence not supplied</small>
                      <details v-if="record.additiveSources?.length">
                        <summary>
                          {{ record.additiveSources.length }} additive source
                          {{ record.additiveSources.length === 1 ? 'record' : 'records' }}
                        </summary>
                        <ul>
                          <li
                            v-for="source in record.additiveSources"
                            :key="source.id"
                          >
                            {{ source.additiveName }} · {{ additiveSourceStatusLabel(source.sourceStatus) }}
                            <small>
                              Declaration candidate:
                              {{
                                additiveDeclarationCandidate(source, record.id, [
                                  record.id,
                                  'additive-source',
                                  source.id,
                                ]).text ?? 'not available'
                              }}
                              · REVIEW REQUIRED
                            </small>
                            <small>
                              Review reason:
                              {{
                                additiveDeclarationCandidate(source, record.id, [
                                  record.id,
                                  'additive-source',
                                  source.id,
                                ]).explanation
                              }}
                            </small>
                            <small v-if="source.allergenAssessments">
                              Additive allergen evidence recorded:
                              {{ Object.keys(source.allergenAssessments).join(', ') }}
                            </small>
                          </li>
                        </ul>
                      </details>
                      <small v-else>Additive source records not supplied</small>
                    </div>
                    <AppButton
                      variant="outline"
                      size="sm"
                      type="button"
                      :aria-label="`Edit ingredient ${record.name}`"
                      @click="ingredientEditor = record"
                    >
                      Edit
                    </AppButton>
                    <AppButton
                      variant="destructive"
                      size="sm"
                      type="button"
                      :aria-label="`Delete draft ${record.name}`"
                      @click="deleteRecord(record)"
                    >
                      Delete
                    </AppButton>
                  </li>
                </ul>
              </section>
            </div>
          </section>

          <section
            v-else-if="activeSection === 'formulations'"
            class="page"
          >
            <div class="page-heading compact">
              <div>
                <p class="eyebrow">
                  RECIPE BUILDER
                </p>
                <h1>Formulations</h1>
                <p class="lede">
                  A formulation is a recipe: list each ingredient and how much goes in, as measured before
                  any cooking or processing. A recipe can also include another saved recipe, for example a
                  sauce. Open a saved recipe to see the amounts per 100 g.
                </p>
              </div>
              <span class="record-count">{{ records.formulations }} saved</span>
            </div>

            <div class="content-grid">
              <FormulationBuilder
                v-if="formulationEditor !== undefined"
                :key="formulationEditor === 'new' ? 'new' : formulationEditor.id"
                :record="formulationEditor === 'new' ? undefined : formulationEditor"
                :ingredients="ingredients"
                :formulations="formulations"
                :make-id="makeId"
                @save="saveFormulation"
                @cancel="formulationEditor = undefined"
              />

              <section
                v-else
                class="panel records-panel wide"
                aria-labelledby="formulation-records-title"
              >
                <div class="panel-heading">
                  <div>
                    <p class="eyebrow">
                      SAVED LOCALLY
                    </p>
                    <h2 id="formulation-records-title">
                      Formulations
                    </h2>
                  </div>
                  <span class="count-badge">{{ formulations.length }}</span>
                  <AppButton
                    type="button"
                    @click="formulationEditor = 'new'"
                  >
                    Add formulation
                  </AppButton>
                </div>
                <div
                  v-if="formulations.length === 0"
                  class="empty-state"
                >
                  <span
                    class="empty-mark"
                    aria-hidden="true"
                  >02</span>
                  <h3>No formulations yet</h3>
                  <p>Save ingredients first, then combine them into a formulation.</p>
                  <AppButton
                    variant="link"
                    size="sm"
                    type="button"
                    @click="activeSection = 'ingredients'"
                  >
                    Go to ingredients <span aria-hidden="true">→</span>
                  </AppButton>
                </div>
                <ul
                  v-else
                  class="record-list"
                >
                  <li
                    v-for="record in formulations"
                    :key="record.id"
                    class="record-item formulation-item"
                  >
                    <span
                      class="record-avatar recipe-avatar"
                      aria-hidden="true"
                    >F</span>
                    <div class="record-main">
                      <strong>{{ record.name }}</strong>
                      <span>{{ record.lines.length }} ingoing
                        {{ record.lines.length === 1 ? 'line' : 'lines' }}</span>
                      <small>{{
                        record.lines
                          .map((line) => line.quantity.value + ' ' + line.quantity.unit)
                          .join(' · ')
                      }}</small>
                    </div>
                    <AppButton
                      variant="outline"
                      size="sm"
                      type="button"
                      @click="calculateFormulation(record)"
                    >
                      Expand
                    </AppButton>
                    <AppButton
                      variant="outline"
                      size="sm"
                      type="button"
                      :aria-label="`Edit formulation ${record.name}`"
                      @click="formulationEditor = record"
                    >
                      Edit
                    </AppButton>
                    <AppButton
                      variant="destructive"
                      size="sm"
                      type="button"
                      :aria-label="`Delete draft ${record.name}`"
                      @click="deleteRecord(record)"
                    >
                      Delete
                    </AppButton>
                  </li>
                </ul>
                <div
                  v-if="expansionError"
                  class="notice notice-error inline-notice"
                  role="alert"
                >
                  {{ expansionError }}
                </div>
                <section
                  v-if="expansion"
                  class="expansion-result"
                  aria-live="polite"
                  aria-labelledby="expansion-title"
                >
                  <div class="result-title">
                    <div>
                      <p class="eyebrow">
                        ENGINE EXPANSION
                      </p>
                      <h3 id="expansion-title">
                        100 g requested basis
                      </h3>
                    </div>
                    <span class="result-tag">Calculation only</span>
                  </div>
                  <p class="field-hint">
                    Expanded ingoing amounts total {{ expansion.totalMass }} g. This does not
                    account for processing or yield.
                  </p>
                  <ul class="expansion-list">
                    <li
                      v-for="(row, index) in expansion.rows"
                      :key="`${row.path}-${index}`"
                    >
                      <span>{{ row.name }}</span><strong>{{ row.mass }} g</strong><small>{{ row.path }}</small>
                    </li>
                  </ul>
                  <h4>Recorded additive sources along ingredient paths</h4>
                  <p class="field-hint">
                    These are captured source records only. No additive permission, limit, carry-over
                    exemption, or declaration is evaluated here.
                  </p>
                  <ul
                    v-if="expansion.additiveSources.length > 0"
                    class="expansion-list"
                  >
                    <li
                      v-for="(item, index) in expansion.additiveSources"
                      :key="`${item.source.id}-${item.path}-${index}`"
                    >
                      <span>
                        <strong>{{ item.source.additiveName }}</strong>
                        <small>Ingredient path: {{ item.path }}</small>
                        <small>Source status: {{ additiveSourceStatusLabel(item.source.sourceStatus) }}</small>
                        <small v-if="item.source.technologicalPurposes?.length">
                          Purpose(s): {{ item.source.technologicalPurposes.join(', ') }}
                        </small>
                        <small v-else>Purpose not supplied</small>
                        <small v-if="item.source.concentration">
                          Concentration: {{ item.source.concentration.value }}
                          {{ additiveConcentrationUnitLabel(item.source.concentration.unit) }}
                          · {{ additiveConcentrationBasisLabel(item.source.concentration.basis) }}
                        </small>
                        <small v-else>Concentration not supplied</small>
                        <small v-if="item.source.sourceEvidence?.length">
                          Evidence:
                          {{ item.source.sourceEvidence.map((evidence) =>
                            `${evidence.reference} · ${evidence.sourceDate}`).join('; ') }}
                        </small>
                        <small v-else>Source evidence not supplied</small>
                        <small>
                          Declaration candidate:
                          {{
                            additiveDeclarationCandidate(
                              item.source,
                              item.ingredientId,
                              item.sourcePath,
                            ).text ?? 'not available'
                          }}
                          · REVIEW REQUIRED
                        </small>
                        <small>
                          Review reason:
                          {{
                            additiveDeclarationCandidate(
                              item.source,
                              item.ingredientId,
                              item.sourcePath,
                            ).explanation
                          }}
                        </small>
                      </span>
                    </li>
                  </ul>
                  <p
                    v-else
                    class="field-hint"
                  >
                    No additive source records were supplied for these ingredients.
                  </p>
                  <h4>Allergen evidence inherited from additive sources</h4>
                  <ul
                    v-if="expansion.additiveAllergenEvidence.length > 0"
                    class="expansion-list"
                  >
                    <li
                      v-for="evidence in expansion.additiveAllergenEvidence"
                      :key="evidence.id"
                    >
                      <span>
                        <strong>{{ Object.keys(evidence.assessments).join(', ') }}</strong>
                        <small>Evidence path: {{ evidence.path }}</small>
                        <small>Source: {{ evidence.sourceId }} · {{ evidence.sourceDate }}</small>
                      </span>
                    </li>
                  </ul>
                  <p
                    v-else
                    class="field-hint"
                  >
                    No additive allergen evidence was recorded for these ingredient sources.
                  </p>
                </section>
              </section>
            </div>
          </section>

          <section
            v-else-if="activeSection === 'review'"
            class="page"
          >
            <ReviewTracePanel
              :products="products"
              :formulations="formulations"
              :ingredients="ingredients"
              :versions="productVersions"
            />
          </section>

          <section
            v-else-if="activeSection === 'backup' && store"
            class="page"
          >
            <BackupPanel
              :store="store"
              @restored="refreshRecords"
            />
          </section>

          <section
            v-else-if="activeSection === 'labels'"
            class="page"
          >
            <LabelExportPanel
              :products="products"
              :formulations="formulations"
              :ingredients="ingredients"
              @edit-product="productEditor = products.find((item) => item.id === $event); activeSection = 'products'"
              @go-ingredients="activeSection = 'ingredients'"
            />
          </section>

          <section
            v-else-if="activeSection === 'products'"
            class="page"
          >
            <div class="page-heading compact">
              <div>
                <p class="eyebrow">
                  PRODUCT WORKSPACE
                </p>
                <h1>Products</h1>
                <p class="lede">
                  A product is what you sell. Add one and we'll walk you through it: what it is, the pack
                  details, additives and names, and any claims.
                </p>
              </div>
              <span class="record-count">{{ records.products }} saved</span>
            </div>

            <div class="content-grid">
              <ProductBuilder
                v-if="productEditor !== undefined && store"
                :key="productEditor === 'new' ? 'new' : productEditor.id"
                :store="store"
                :record="productEditor === 'new' ? products.find((item) => item.id === createdProductId) : productEditor"
                :products="products"
                :formulations="formulations"
                :ingredients="ingredients"
                :make-id="makeId"
                :refresh="refreshRecords"
                @created="createdProductId = $event"
                @cancel="productEditor = undefined; createdProductId = undefined"
                @go="activeSection = $event as Section"
              />

              <section
                v-else
                class="panel records-panel wide"
                aria-labelledby="product-records-title"
              >
                <div class="panel-heading">
                  <div>
                    <p class="eyebrow">
                      SAVED LOCALLY
                    </p>
                    <h2 id="product-records-title">
                      Products
                    </h2>
                  </div>
                  <span class="count-badge">{{ products.length }}</span>
                  <AppButton
                    type="button"
                    @click="createdProductId = undefined; productEditor = 'new'"
                  >
                    Add product
                  </AppButton>
                </div>
                <div
                  v-if="products.length === 0"
                  class="empty-state"
                >
                  <span
                    class="empty-mark"
                    aria-hidden="true"
                  >03</span>
                  <h3>No products yet</h3>
                  <p>
                    Products need a linked formulation. Add ingredients and a formulation before
                    creating one.
                  </p>
                  <AppButton
                    variant="link"
                    size="sm"
                    type="button"
                    @click="activeSection = formulations.length ? 'formulations' : 'ingredients'"
                  >
                    {{ formulations.length ? 'Go to formulations' : 'Go to ingredients' }}
                    <span aria-hidden="true">→</span>
                  </AppButton>
                </div>
                <ul
                  v-else
                  class="record-list"
                >
                  <li
                    v-for="record in products"
                    :key="record.id"
                    class="record-item"
                  >
                    <span
                      class="record-avatar product-avatar"
                      aria-hidden="true"
                    >P</span>
                    <div class="record-main">
                      <strong>{{ record.name }}</strong>
                      <span>{{
                        formulations.find((item) => item.id === record.formulationId)?.name ??
                          'Linked formulation unavailable'
                      }}</span>
                      <small>{{ record.foodState ?? 'Food state not supplied' }}</small>
                      <details class="saved-classification">
                        <summary>Class and name screening · REVIEW REQUIRED</summary>
                        <div
                          v-for="result in productClassificationResults(record)"
                          :key="result.rule.id"
                          class="saved-classification-result"
                        >
                          <strong>{{ result.title }}</strong>
                          <p>{{ screeningOutcomeLabel(result.value?.screeningOutcome) }}</p>
                          <small>{{ result.explanation }}</small>
                        </div>
                        <div class="saved-classification-result">
                          <strong>{{ productNameScreening(record).title }}</strong>
                          <p>No approved prescribed-name candidate rules; human review required.</p>
                          <small>{{ productNameScreening(record).explanation }}</small>
                        </div>
                      </details>
                    </div>
                    <AppButton
                      variant="outline"
                      size="sm"
                      type="button"
                      :aria-label="`Edit product ${record.name}`"
                      @click="productEditor = record"
                    >
                      Edit
                    </AppButton>
                    <AppButton
                      variant="destructive"
                      size="sm"
                      type="button"
                      :aria-label="`Delete draft ${record.name}`"
                      @click="deleteRecord(record)"
                    >
                      Delete
                    </AppButton>
                  </li>
                </ul>
              </section>
            </div>
          </section>
        </template>
      </main>
    </div>

    <footer class="footer">
      <span>Fieldnote · Local-first workspace</span>
      <span>This tool assists review; it does not certify legal compliance.</span>
    </footer>
  </div>
</template>

<style>
:root {
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  color: #23332d;
  background: #f5f7f3;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  --ink: #23332d;
  --muted: #58675e;
  --line: #e2e8e1;
  --green: #2e644f;
  --green-dark: #234f3d;
  --green-soft: #eaf3ec;
  --surface: #fff;
}

* {
  box-sizing: border-box;
}
body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}
button,
input,
select {
  font: inherit;
}
button {
  cursor: pointer;
}
button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 3px solid #e3a34f;
  outline-offset: 2px;
}

.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.skip-link {
  position: absolute;
  z-index: 5;
  top: 8px;
  left: 8px;
  padding: 9px 12px;
  transform: translateY(-160%);
  border-radius: 6px;
  color: white;
  background: var(--green-dark);
}
.skip-link:focus {
  transform: translateY(0);
}
.topbar {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 42px;
  background: #fff;
  border-bottom: 1px solid var(--line);
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--ink);
  text-decoration: none;
}
.brand-mark {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: var(--green);
  color: #fff;
  font-family: Georgia, serif;
  font-size: 23px;
  font-weight: 700;
}
.brand strong {
  display: block;
  font-size: 15px;
  letter-spacing: -0.02em;
}
.brand small {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 11px;
}
.local-badge {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  color: #4d6559;
  font-size: 12px;
  font-weight: 600;
}
.local-badge span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #69a27e;
  box-shadow: 0 0 0 3px #e8f3eb;
}
.workspace {
  flex: 1;
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
}
.sidebar {
  display: flex;
  flex-direction: column;
  padding: 31px 18px 22px 26px;
  border-right: 1px solid var(--line);
  background: #fbfcfa;
}
.nav-caption,
.eyebrow {
  margin: 0;
  color: #58665d;
  font-size: 10px;
  line-height: 1.4;
  font-weight: 750;
  letter-spacing: 0.12em;
}
.nav-caption {
  padding-left: 12px;
  margin-bottom: 12px;
}
.sidebar nav {
  display: grid;
  gap: 5px;
}
.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 42px;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  color: #68766e;
  background: transparent;
  text-align: left;
  font-size: 13px;
}
.nav-link:hover {
  color: var(--ink);
  background: #f1f5f0;
}
.nav-link.active {
  color: var(--green-dark);
  background: #e9f2eb;
  font-weight: 700;
}
.nav-indicator {
  width: 7px;
  height: 7px;
  border: 1px solid #9aa79e;
  border-radius: 2px;
}
.nav-link.active .nav-indicator {
  border-color: var(--green);
  background: var(--green);
}
.sidebar-note {
  display: flex;
  gap: 10px;
  margin: auto 5px 0 0;
  padding: 14px 12px;
  border-top: 1px solid var(--line);
  color: var(--muted);
}
.sidebar-note p {
  margin: 0;
  font-size: 11px;
  line-height: 1.55;
}
.note-icon,
.info-callout > span {
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  border: 1px solid #8eaa96;
  border-radius: 50%;
  color: var(--green);
  font-size: 11px;
  font-weight: 700;
}
.main-content {
  min-width: 0;
  padding: 42px clamp(24px, 5vw, 72px) 50px;
}
.page {
  max-width: 1100px;
  margin: 0 auto;
}
.page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin: 0 0 32px;
}
.page-heading h1 {
  max-width: 720px;
  margin: 9px 0 11px;
  color: #23362e;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(29px, 3vw, 42px);
  line-height: 1.12;
  font-weight: 500;
  letter-spacing: -0.035em;
}
.page-heading.compact {
  align-items: center;
  margin-bottom: 27px;
}
.page-heading.compact h1 {
  font-size: clamp(28px, 2.8vw, 36px);
}
.lede {
  max-width: 650px;
  margin: 0;
  color: #58665d;
  font-size: 14px;
  line-height: 1.65;
}
.heading-art {
  position: relative;
  flex: 0 0 126px;
  width: 126px;
  height: 112px;
  overflow: hidden;
  display: grid;
  place-items: center;
  border-radius: 34% 45% 37% 44%;
  background: #e8f1e7;
  color: #578066;
}
.heading-art span {
  font-family: Georgia, serif;
  font-size: 67px;
  opacity: 0.8;
}
.heading-art i,
.heading-art b {
  position: absolute;
  width: 45px;
  height: 19px;
  border: 2px solid #93b29b;
  border-radius: 100% 0 100% 0;
  transform: rotate(-36deg);
}
.heading-art i {
  right: 12px;
  top: 24px;
}
.heading-art b {
  left: 12px;
  bottom: 17px;
  transform: rotate(144deg);
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 18px;
}
.summary-card,
.panel,
.review-card {
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: 0 2px 8px rgb(34 58 45 / 3%);
}
.summary-card {
  min-height: 120px;
  padding: 19px 21px;
}
.summary-label {
  display: block;
  color: #58665d;
  font-size: 12px;
  font-weight: 600;
}
.summary-card strong {
  display: block;
  margin-top: 8px;
  color: #273d32;
  font-family: Georgia, serif;
  font-size: 32px;
  line-height: 1;
  font-weight: 500;
}
.summary-detail {
  display: block;
  margin-top: 7px;
  color: #5b695f;
  font-size: 11px;
}
.overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(245px, 0.9fr);
  gap: 16px;
}
.panel {
  padding: 22px;
}
.journey-panel {
  padding: 23px 24px;
}
.panel-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
}
.panel-heading h2,
.review-card h2 {
  margin: 5px 0 0;
  color: #2a3c33;
  font-family: Georgia, serif;
  font-size: 20px;
  font-weight: 500;
  letter-spacing: -0.02em;
}
.step-count {
  color: #5b695f;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
}
.journey-list {
  padding: 0;
  margin: 0;
  list-style: none;
}
.journey-list li {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-height: 76px;
  border-top: 1px solid #edf0ec;
}
.journey-number {
  color: #416348;
  font-family: Georgia, serif;
  font-size: 16px;
}
.journey-list strong {
  font-size: 13px;
  font-weight: 650;
}
.journey-list p {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.5;
}
.review-card {
  position: relative;
  padding: 24px 23px;
  background: #f0f5ee;
  border-color: #e4ede1;
}
.review-icon {
  display: grid;
  place-items: center;
  width: 27px;
  height: 27px;
  margin-bottom: 17px;
  border-radius: 50%;
  background: #dcebdc;
  color: #426e4e;
  font-size: 14px;
  font-weight: 750;
}
.review-card .eyebrow {
  color: #3f6146;
}
.review-card h2 {
  margin: 7px 0 9px;
  font-size: 21px;
  line-height: 1.24;
}
.review-card > p:not(.eyebrow) {
  margin: 0;
  color: #536257;
  font-size: 12px;
  line-height: 1.6;
}
.review-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 22px;
  padding-top: 15px;
  border-top: 1px solid #dfe9dd;
  color: #55705c;
  font-size: 11px;
  font-weight: 650;
}
.review-status span {
  width: 8px;
  height: 8px;
  border: 1px solid #66826c;
  border-radius: 50%;
}
.privacy-footnote {
  margin: 20px 2px 0;
  color: #59675f;
  font-size: 10px;
  line-height: 1.6;
}
.record-count {
  padding: 8px 11px;
  border: 1px solid #e2e9e1;
  border-radius: 20px;
  color: #607066;
  background: white;
  font-size: 11px;
  font-weight: 650;
  white-space: nowrap;
}
.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.85fr);
  gap: 17px;
  align-items: start;
}
.editor-panel,
.records-panel {
  padding: 22px;
}
.draft-pill {
  padding: 5px 9px;
  border: 1px solid #e5e9e3;
  border-radius: 20px;
  color: #5b695f;
  background: #f8faf7;
  font-size: 10px;
  font-weight: 650;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 13px 12px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
  color: #42534a;
  font-size: 11px;
  font-weight: 650;
}
.field > span {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
}
.field > span b,
.required-hint b {
  color: #a9523f;
}
.field input,
.field select,
.field textarea {
  width: 100%;
  min-height: 39px;
  padding: 0 11px;
  border: 1px solid #dce4dc;
  border-radius: 7px;
  color: #2b3b33;
  background: #fff;
  font-size: 12px;
  font-weight: 450;
}
.field textarea {
  min-height: 74px;
  padding: 9px 11px;
  resize: vertical;
}
.field input::placeholder {
  color: #a3ada6;
}
.field input:hover,
.field select:hover,
.field textarea:hover {
  border-color: #bacabd;
}
.field input:focus,
.field select:focus,
.field textarea:focus {
  border-color: #548064;
  outline: 3px solid rgb(82 128 98 / 14%);
}
.field.full {
  grid-column: 1 / -1;
}
.field-group {
  min-width: 0;
  margin: 20px 0;
  padding: 17px 0 0;
  border: 0;
  border-top: 1px solid #edf0ec;
}
.field-group legend {
  padding: 0;
  color: #34473d;
  font-size: 12px;
  font-weight: 700;
}
.field-hint {
  margin: 0 0 13px;
  color: #5b695f;
  font-size: 10px;
  line-height: 1.55;
  font-weight: 450;
}
.field-group .form-grid {
  margin-top: 12px;
}
.classification-details {
  margin-top: 18px;
  padding: 13px;
  border: 1px solid #dfe8df;
  border-radius: 8px;
  background: #f9fbf8;
}
.classification-details > summary,
.saved-classification > summary {
  color: #315a45;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
.classification-details > .field-hint {
  margin: 10px 0;
}
.classification-context {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 12px 0;
}
.classification-question-group {
  min-width: 0;
  margin: 18px 0 0;
  padding: 13px 0 0;
  border: 0;
  border-top: 1px solid #e1e8e0;
}
.classification-question-group legend {
  padding: 0 5px 0 0;
  color: #34473d;
  font-size: 12px;
  font-weight: 700;
}
.classification-question-group > .field-hint {
  margin: 5px 0 10px;
}
.classification-fact-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}
.saved-classification {
  margin-top: 8px;
}
.saved-classification-result {
  display: grid;
  gap: 4px;
  margin-top: 8px;
  padding: 8px;
  border: 1px solid #e3e9e2;
  border-radius: 6px;
  background: #fbfcfa;
}
.saved-classification-result strong {
  color: #34473d;
  font-size: 10px;
}
.saved-classification-result p,
.saved-classification-result small {
  margin: 0;
  color: #58675e;
  font-size: 10px;
  line-height: 1.5;
}
.nutrient-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.field small {
  color: #5b695f;
  font-size: 9px;
  font-weight: 500;
}
.field .field-hint {
  display: block;
}
.form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 22px;
  padding-top: 17px;
  border-top: 1px solid #edf0ec;
}
.required-hint {
  color: #5b695f;
  font-size: 10px;
}
.count-badge {
  display: grid;
  place-items: center;
  min-width: 26px;
  height: 26px;
  padding: 0 6px;
  border-radius: 50%;
  color: #52705c;
  background: #edf4ed;
  font-size: 11px;
  font-weight: 700;
}
.empty-state {
  padding: 25px 8px 18px;
  text-align: center;
}
.empty-mark {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  margin: 0 auto 13px;
  border: 1px solid #dce7dc;
  border-radius: 13px;
  color: #66836d;
  background: #f3f7f1;
  font-family: Georgia, serif;
  font-size: 13px;
}
.empty-state h3 {
  margin: 0 0 7px;
  color: #35473d;
  font-family: Georgia, serif;
  font-size: 16px;
  font-weight: 500;
}
.empty-state p {
  max-width: 260px;
  margin: 0 auto 9px;
  color: #849087;
  font-size: 11px;
  line-height: 1.6;
}
.record-list {
  display: grid;
  padding: 0;
  margin: 0;
  list-style: none;
}
.record-item {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
  padding: 13px 0;
  border-top: 1px solid #edf0ec;
}
.record-avatar {
  flex: 0 0 33px;
  width: 33px;
  height: 33px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  color: #50725a;
  background: #edf4ed;
  font-family: Georgia, serif;
  font-size: 15px;
}
.recipe-avatar {
  color: #826848;
  background: #f5f0e5;
}
.product-avatar {
  color: #5b6d84;
  background: #eef1f7;
}
.record-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.record-main strong {
  overflow: hidden;
  color: #34453b;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.record-main > span,
.record-main small {
  overflow: hidden;
  color: #5b695f;
  font-size: 10px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.record-main small {
  color: #5b695f;
  font-size: 9px;
}
.info-callout {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-top: 20px;
  padding: 12px;
  border: 1px solid #e2ebe1;
  border-radius: 8px;
  background: #f6f9f4;
}
.info-callout > span {
  flex-basis: 17px;
  width: 17px;
  height: 17px;
  font-size: 10px;
}
.info-callout p {
  margin: 0;
  color: #5b695f;
  font-size: 10px;
  line-height: 1.55;
}
.line-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.line-heading h3 {
  margin: 0 0 4px;
  color: #42544a;
  font-size: 11px;
}
.line-heading .field-hint {
  margin: 0;
}
.inline-empty {
  padding: 16px 12px;
  border: 1px dashed #dce5dc;
  border-radius: 7px;
  color: #5b695f;
  background: #fbfcfa;
  font-size: 10px;
  line-height: 1.5;
}
.line-row {
  display: grid;
  grid-template-columns: 98px minmax(95px, 1fr) 82px 64px 22px;
  gap: 6px;
  align-items: end;
  margin-bottom: 9px;
}
.line-row .field {
  gap: 0;
}
.line-row .field input,
.line-row .field select {
  min-height: 36px;
  padding: 0 7px;
  font-size: 10px;
}
.remove-line {
  width: 22px;
  height: 34px;
  padding: 0;
  border: 0;
  color: #8e9890;
  background: transparent;
  font-size: 19px;
}
.remove-line:hover {
  color: #914b3e;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}
.expansion-result {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid #e9eee8;
}
.result-title {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}
.result-title h3 {
  margin: 4px 0 0;
  color: #34473d;
  font-family: Georgia, serif;
  font-size: 16px;
  font-weight: 500;
}
.result-tag {
  padding: 5px 7px;
  border-radius: 5px;
  color: #586d5e;
  background: #f0f5ef;
  font-size: 9px;
  font-weight: 650;
}
.expansion-result .field-hint {
  margin-top: 9px;
}
.expansion-list {
  display: grid;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}
.expansion-list li {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 3px 8px;
  padding: 9px 10px;
  border: 1px solid #edf0ec;
  border-radius: 7px;
}
.expansion-list li > span {
  color: #44554b;
  font-size: 10px;
}
.expansion-list li > strong {
  color: #3e604a;
  font-size: 10px;
}
.expansion-list li > small {
  grid-column: 1 / -1;
  overflow-wrap: anywhere;
  color: #8c9890;
  font-size: 8px;
  line-height: 1.4;
}
.notice {
  display: flex;
  gap: 8px;
  align-items: baseline;
  margin: 0 auto 16px;
  padding: 11px 14px;
  border: 1px solid;
  border-radius: 8px;
  font-size: 11px;
  line-height: 1.5;
}
.notice strong {
  font-weight: 700;
}
.notice-warning {
  border-color: #ead9b9;
  color: #725930;
  background: #fff9ec;
}
.notice-success {
  border-color: #cfe3d2;
  color: #355f43;
  background: #f1f8f1;
}
.notice-error {
  border-color: #ebd0ca;
  color: #7f4036;
  background: #fff5f2;
}
.inline-notice {
  margin-top: 12px;
}
.page-state {
  max-width: 650px;
  margin: 60px auto;
  padding: 36px;
  border: 1px solid var(--line);
  border-radius: 12px;
  color: var(--muted);
  background: white;
  text-align: center;
  font-size: 13px;
  line-height: 1.6;
}
.page-state h1 {
  margin: 8px 0;
  color: var(--ink);
  font-family: Georgia, serif;
  font-size: 30px;
  font-weight: 500;
}
.page-state .eyebrow {
  color: #a14d3c;
}
.footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 42px;
  border-top: 1px solid var(--line);
  color: #58665d;
  background: #fff;
  font-size: 10px;
}

@media (max-width: 1000px) {
  .workspace {
    grid-template-columns: 205px minmax(0, 1fr);
  }
  .main-content {
    padding: 34px 26px 42px;
  }
  .content-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .records-panel {
    order: 2;
  }
}
@media (max-width: 700px) {
  .classification-context,
  .classification-fact-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .topbar {
    height: 62px;
    padding: 0 17px;
  }
  .local-badge {
    font-size: 10px;
  }
  .workspace {
    display: flex;
    flex-direction: column;
  }
  .sidebar {
    position: sticky;
    z-index: 2;
    top: 0;
    display: block;
    padding: 0;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .nav-caption,
  .sidebar-note {
    display: none;
  }
  .sidebar nav {
    display: flex;
    gap: 3px;
    overflow-x: auto;
    padding: 7px 10px;
    scrollbar-width: thin;
  }
  .nav-link {
    flex: 0 0 auto;
    min-height: 38px;
    gap: 7px;
    padding: 0 10px;
    font-size: 10px;
    white-space: nowrap;
  }
  .nav-indicator {
    width: 6px;
    height: 6px;
  }
  .main-content {
    padding: 28px 16px 34px;
  }
  .page-heading {
    margin-bottom: 22px;
  }
  .heading-art {
    flex-basis: 72px;
    width: 72px;
    height: 72px;
    border-radius: 25px;
  }
  .heading-art span {
    font-size: 44px;
  }
  .heading-art i,
  .heading-art b {
    display: none;
  }
  .summary-grid {
    gap: 8px;
  }
  .summary-card {
    min-height: 102px;
    padding: 13px 11px;
  }
  .summary-label {
    font-size: 10px;
  }
  .summary-card strong {
    font-size: 26px;
  }
  .summary-detail {
    font-size: 9px;
    line-height: 1.35;
  }
  .overview-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .review-card {
    padding: 19px;
  }
  .panel,
  .journey-panel {
    padding: 18px 15px;
  }
  .page-heading.compact {
    align-items: flex-start;
  }
  .page-heading.compact h1 {
    font-size: 28px;
  }
  .record-count {
    padding: 6px 8px;
    font-size: 9px;
  }
  .line-row {
    grid-template-columns: 82px minmax(80px, 1fr) 65px 54px 20px;
    gap: 4px;
  }
  .footer {
    flex-direction: column;
    padding: 13px 17px;
    font-size: 9px;
  }
}
@media (max-width: 430px) {
  .brand small {
    display: none;
  }
  .local-badge {
    max-width: 140px;
  }
  .page-heading h1 {
    font-size: 30px;
  }
  .heading-art {
    display: none;
  }
  .journey-list li {
    grid-template-columns: 27px minmax(0, 1fr) auto;
    gap: 7px;
  }
  .nutrient-grid {
    grid-template-columns: 1fr;
  }
  .form-actions {
    align-items: flex-end;
  }
}
</style>
