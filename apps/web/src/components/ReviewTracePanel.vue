<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { expandFormulation } from '@aus-food/engine';
import type {
  ApprovedVersionRecord,
  FormulationRecord,
  IngredientRecord,
  ProductRecord,
} from '@aus-food/storage';
import { makeLabelDraft } from '../label-draft';
import { optionalNutrientLabels } from '../ingredient-form';
import { displaySourcePath } from '../source-path';
import { caffeineCheckForProduct } from '../caffeine-check';
import AdditiveNameChecksPanel from './AdditiveNameChecksPanel.vue';

const props = defineProps<{
  product: ProductRecord;
  formulations: readonly FormulationRecord[];
  ingredients: readonly IngredientRecord[];
  versions: readonly ApprovedVersionRecord[];
}>();

const selectedFormulation = computed(() =>
  props.formulations.find((formulation) => formulation.id === props.product.formulationId),
);
const selectedVersions = computed(() =>
  props.versions.filter((version) => version.recordType === 'product' && version.recordId === props.product.id),
);
const draftEvidence = computed(() => makeLabelDraft(props.product, props.formulations, props.ingredients));
const caffeineCheck = computed(() =>
  caffeineCheckForProduct(props.product, new Date().toISOString().slice(0, 10), props.formulations, props.ingredients));
const technicalDetails = ref<HTMLDetailsElement>();
const additiveReview = ref<HTMLDetailsElement>();

async function openAdditiveReview(): Promise<void> {
  if (technicalDetails.value) technicalDetails.value.open = true;
  if (additiveReview.value) additiveReview.value.open = true;
  await nextTick();
  additiveReview.value?.querySelector('summary')?.focus();
  additiveReview.value?.scrollIntoView({ block: 'start' });
}
defineExpose({ openAdditiveReview });

function displayPath(path: readonly string[]): string {
  return displaySourcePath(path, props.ingredients, props.formulations);
}

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
  <div>
    <section
      v-if="caffeineCheck"
      class="panel trace-panel"
      aria-label="Caffeine concentration check"
    >
      <h3>Caffeine concentration</h3>
      <p><strong>{{ caffeineCheck.status }}</strong> — provisional check. {{ caffeineCheck.explanation }}</p>
      <details>
        <summary>Source and limitations</summary>
        <p>
          {{ caffeineCheck.resultBasis }}. Source references are optional; inputs and supplied sources are not
          independently verified. This check does not assess caffeine-source permissions or certify legal compliance.
        </p>
        <p>{{ caffeineCheck.nonCertificationStatement }}</p>
        <p>Rule data are {{ caffeineCheck.ruleReviewStatus }}. This check is not legal clearance.</p>
        <p>{{ caffeineCheck.rule.provision }}; {{ caffeineCheck.rule.version }}</p>
        <a :href="caffeineCheck.rule.sourceUrl">View the source provision</a>
        <h4>Calculation inputs</h4>
        <ul>
          <li
            v-for="input in caffeineCheck.inputs"
            :key="`${input.name}-${input.sourceId}-${input.sourceDate}`"
          >
            {{ input.name }}: {{ input.value }} {{ input.unit ?? '' }};
            source {{ input.sourceId || 'not supplied (user-entered or calculated)' }};
            {{ input.sourceDate ? `date ${input.sourceDate}` : 'no source date recorded' }};
            path {{ displayPath(input.sourcePath) }}.
          </li>
        </ul>
        <ul>
          <li
            v-for="limitation in caffeineCheck.limitations"
            :key="limitation"
          >
            {{ limitation }}
          </li>
        </ul>
      </details>
    </section>

    <details
      ref="technicalDetails"
      class="technical-details"
    >
      <summary>Technical details and review history</summary>
      <div
        class="notice notice-warning review-disclaimer"
        role="status"
      >
        <strong>Draft inputs are not a compliance result.</strong>
        <span>No active regulatory release is installed in this workspace. The draft trace below does not
          evaluate legal requirements or imply PASS or FAIL.</span>
      </div>
      <p class="field-hint">
        Checks and traces use the saved product and current saved ingredients and recipes.
        Save product edits to update them. Stored evaluation results below are historical.
      </p>
      <slot />
      <details ref="additiveReview">
        <summary>Technical additive and name review</summary>
        <AdditiveNameChecksPanel
          :product="product"
          :formulations="formulations"
          :ingredients="ingredients"
        />
      </details>
      <section
        class="panel trace-panel"
        aria-labelledby="input-trace-title"
      >
        <div class="panel-heading">
          <div>
            <p class="eyebrow">
              INPUT TRACE · DRAFT ONLY
            </p>
            <h3 id="input-trace-title">
              Input trace: {{ product.name }}
            </h3>
          </div>
          <span class="status-text">REVIEW REQUIRED</span>
        </div>

        <dl class="trace-summary">
          <div>
            <dt>Product record</dt>
            <dd>{{ product.id }}</dd>
          </div>
          <div>
            <dt>Food state</dt>
            <dd>{{ product.foodState ?? 'Not supplied' }}</dd>
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
                        · {{ evidence.sourceId }} · {{ evidence.sourceDate }} · stored evidence path
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
        <details v-if="draftEvidence">
          <summary>Draft pack and ingredient declaration</summary>
          <p>Proposed name: {{ draftEvidence.pack.name }}</p>
          <p>Net contents: {{ draftEvidence.pack.netContents || 'Not supplied — REVIEW REQUIRED' }}</p>
          <p>Draft ingredient list: {{ draftEvidence.declaration || 'Unavailable — REVIEW REQUIRED' }}</p>
          <p class="field-hint">
            These paths identify recorded ingredients, including components with unknown amounts.
            The ordering and any additive wording still need review.
          </p>
          <ul
            v-if="draftEvidence.declarationInputs.length"
            class="evidence-list"
          >
            <li
              v-for="(item, index) in draftEvidence.declarationInputs"
              :key="index"
            >
              {{ item.name }} · path {{ displayPath(item.sourcePath) }} ·
              <template v-if="item.specification">
                {{ item.specification.reference }} · {{ item.specification.sourceDate }}
              </template>
              <template v-else>
                No ingredient specification recorded
              </template>
              <template v-if="item.additiveUse">
                · recorded use {{ item.additiveUse }}
              </template>
            </li>
          </ul>
          <p v-else>
            No ingredient inputs are available — REVIEW REQUIRED.
          </p>
          <ul class="evidence-list">
            <li
              v-for="direction in draftEvidence.pack.recordedDirections"
              :key="direction.kind"
            >
              {{ direction.kind }} directions (recorded, review required): {{ direction.text }}
            </li>
            <li
              v-for="limitation in draftEvidence.pack.limitations"
              :key="limitation"
            >
              REVIEW REQUIRED — {{ limitation }}
            </li>
          </ul>
        </details>
        <details v-if="draftEvidence?.drainedNutrition">
          <summary>Drained food nutrition</summary>
          <p class="field-hint">
            Drained food basis · REVIEW REQUIRED. The draft panel uses these values only when the recorded directions and food state support it.
          </p>
          <p>Directions: {{ draftEvidence.drainedNutrition.directions || 'Not supplied' }}</p>
          <p>
            Drained serving: {{ draftEvidence.drainedNutrition.servingGrams || 'Not supplied' }}<template v-if="draftEvidence.drainedNutrition.servingGrams">
              g
            </template>
          </p>
          <p>
            Source: {{ draftEvidence.drainedNutrition.sourceType || 'Not supplied' }} ·
            {{ draftEvidence.drainedNutrition.sourceReference || 'No reference supplied' }} ·
            {{ draftEvidence.drainedNutrition.sourceDate || 'No date supplied' }}
          </p>
          <ul class="evidence-list">
            <li
              v-for="row in draftEvidence.drainedNutrition.rows"
              :key="row.label"
            >
              {{ row.label }}: {{ row.per100g }} per 100 g drained · {{ row.serving }} per drained serving
              <template v-if="row.input">
                · Entered value: {{ row.input }}
              </template>
            </li>
          </ul>
          <ul
            v-if="draftEvidence.drainedNutrition.missing.length"
            class="evidence-list"
          >
            <li
              v-for="item in draftEvidence.drainedNutrition.missing"
              :key="item"
            >
              REVIEW REQUIRED — {{ item }}
            </li>
          </ul>
        </details>
        <details v-if="draftEvidence?.preparedNutrition">
          <summary>Consumer preparation nutrition</summary>
          <p class="field-hint">
            {{ draftEvidence.preparedNutrition.basis === 'reconstituted'
              ? 'Reconstituted food'
              : draftEvidence.preparedNutrition.basis === 'withFood'
                ? 'Product prepared or consumed with another food'
                : 'Preparation basis not chosen' }} · REVIEW REQUIRED.
            The draft panel uses these values only when the recorded directions and food state support it.
          </p>
          <p>Directions: {{ draftEvidence.preparedNutrition.directions || 'Not supplied' }}</p>
          <p>
            Product: {{ draftEvidence.preparedNutrition.productMass ?? 'Unknown' }} g ·
            {{ draftEvidence.preparedNutrition.addedFood }}:
            {{ draftEvidence.preparedNutrition.addedMass ?? 'Unknown' }} g
          </p>
          <p>
            Prepared serving:
            {{ draftEvidence.preparedNutrition.preparedServing
              ? `${draftEvidence.preparedNutrition.preparedServing.value} ${draftEvidence.preparedNutrition.preparedServing.unit}`
              : 'Not supplied' }}
          </p>
          <ul class="evidence-list">
            <li
              v-for="row in draftEvidence.preparedNutrition.rows"
              :key="row.label"
            >
              {{ row.label }}: {{ row.per100g }} per 100 g prepared · {{ row.serving }} per prepared serving
            </li>
          </ul>
          <ul
            v-if="draftEvidence.preparedNutrition.sources.length"
            class="evidence-list"
          >
            <li
              v-for="source in draftEvidence.preparedNutrition.sources"
              :key="source.nutrient"
            >
              Added {{ source.nutrient }}: {{ source.value }} {{ source.unit }} ·
              {{ source.sourceId || 'No source supplied' }} · {{ source.sourceDate || 'No date supplied' }}
              <template v-if="source.method">
                · {{ source.method }}
              </template>
            </li>
          </ul>
          <ul
            v-if="draftEvidence.preparedNutrition.densities.length"
            class="evidence-list"
          >
            <li
              v-for="density in draftEvidence.preparedNutrition.densities"
              :key="density.subject"
            >
              {{ density.subject }} density: {{ density.value }} g/mL ·
              {{ density.sourceId }} · {{ density.sourceDate }}
            </li>
          </ul>
          <ul
            v-if="draftEvidence.preparedNutrition.missing.length"
            class="evidence-list"
          >
            <li
              v-for="item in draftEvidence.preparedNutrition.missing"
              :key="item"
            >
              REVIEW REQUIRED — {{ item }}
            </li>
          </ul>
        </details>
        <details v-if="draftEvidence">
          <summary>Nutrition calculation inputs and paths</summary>
          <p class="field-hint">
            Draft panel basis: {{ draftEvidence.nutritionPanel.basis }} · REVIEW REQUIRED.
            {{ draftEvidence.nutritionPanel.note }}
          </p>
          <p
            v-if="draftEvidence.nutrition.finishedNutritionSelected"
            class="field-hint"
          >
            Finished-food values are selected for this recipe, rather than ingredient estimates.
            They describe the recorded finished recipe and need review before use on a label.
          </p>
          <p
            v-else-if="draftEvidence.nutrition.retentionSelected"
            class="field-hint"
          >
            Finished nutrient estimates use the ingoing values, the recorded batch weights and the
            selected nutrient-specific retention evidence. The evidence and applicability need review.
          </p>
          <p
            v-else
            class="field-hint"
          >
            These are the selected whole-ingredient or component inputs, not both.
            Values are on a 100 g ingredient basis; calculations and food state still need review.
          </p>
          <ul
            v-if="draftEvidence.nutrition.finishedSources.length"
            class="evidence-list"
          >
            <li
              v-for="(source, index) in draftEvidence.nutrition.finishedSources"
              :key="index"
            >
              Finished {{ source.nutrient }}: {{ source.value }} {{ source.unit }} ·
              {{ source.sourceId || 'User-provided value' }}{{ source.sourceDate ? ` · ${source.sourceDate}` : '' }}
              · {{ source.evidenceType }} · recipe {{ selectedFormulation?.name }}
              <template v-if="source.method">
                · {{ source.method }}
              </template>
            </li>
          </ul>
          <ul
            v-if="draftEvidence.nutrition.retentionSources.length"
            class="evidence-list"
          >
            <li
              v-for="source in draftEvidence.nutrition.retentionSources"
              :key="source.nutrient"
            >
              {{ source.nutrient }} retained: {{ source.percentage }}% ·
              {{ source.startingMass }} g starting batch · {{ source.finishedMass }} g finished batch ·
              {{ source.sourceId }} · {{ source.sourceDate }} · estimated finished nutrition
            </li>
          </ul>
          <ul
            v-if="draftEvidence.nutrition.sources.length"
            class="evidence-list"
          >
            <li
              v-for="(source, index) in draftEvidence.nutrition.sources"
              :key="index"
            >
              {{ source.nutrient }}: {{ source.value }} {{ source.unit }} ·
              {{ source.ingoingMass }} g / 100 g ingoing ·
              {{ source.sourceId || 'User-provided value' }}{{ source.sourceDate ? ` · ${source.sourceDate}` : '' }}
              · path {{ displayPath(source.sourcePath) }}
              <template v-if="source.method">
                · {{ source.method }}
              </template>
            </li>
          </ul>
          <p v-else-if="!draftEvidence.nutrition.finishedSources.length">
            No calculation inputs available. Check the recipe, composition and nutrition review items.
          </p>
          <div v-if="draftEvidence.nutrition.optionalNutrients.length">
            <p class="field-hint">
              Additional nutrients below are ingoing estimates only, not label rows or finished-food results.
              Missing values are not assumed to be zero.
            </p>
            <ul class="evidence-list">
              <li
                v-for="item in draftEvidence.nutrition.optionalNutrients"
                :key="item.id"
              >
                {{ optionalNutrientLabels[item.id] }}:
                <template v-if="item.result.status === 'calculated'">
                  {{ item.result.nutrients[0]?.value }}
                  {{ item.result.nutrients[0]?.unit.replace('ug/', 'micrograms/').replace('/100g', '/100 g') }}
                  ingoing estimate · REVIEW REQUIRED
                </template>
                <template v-else>
                  REVIEW REQUIRED —
                  {{ item.result.reason === 'INCOMPATIBLE_NUTRIENT_EXPRESSION'
                    ? 'nutrient expression needs review at'
                    : item.result.reason === 'INSUFFICIENT_NUTRIENT_PRECISION'
                      ? 'calculation precision needs review at'
                      : 'missing evidence at' }}
                  {{ item.result.missing.map((entry) => displayPath(entry.sourcePath)).join('; ') }}
                </template>
              </li>
            </ul>
          </div>
          <div v-if="draftEvidence.nutrition.finishedOptionalNutrients.length">
            <p class="field-hint">
              Additional values describe the finished recipe; they are not automatically label rows.
            </p>
            <ul class="evidence-list">
              <li
                v-for="item in draftEvidence.nutrition.finishedOptionalNutrients"
                :key="item.id"
              >
                {{ optionalNutrientLabels[item.id] }}:
                <template v-if="item.result.status === 'available'">
                  {{ item.result.value }} {{ item.result.unit.replace('ug/', 'micrograms/').replace('/100g', '/100 g') }}
                  finished food · REVIEW REQUIRED
                </template>
                <template v-else>
                  REVIEW REQUIRED —
                  {{ item.result.reason === 'INCOMPATIBLE_NUTRIENT_EXPRESSION'
                    ? 'nutrient form needs review'
                    : item.result.reason === 'MISSING_RETENTION_EVIDENCE'
                      ? 'a retention figure is needed'
                      : item.result.reason === 'INSUFFICIENT_NUTRIENT_PRECISION'
                        ? 'calculation precision needs review'
                        : 'source or value needs review' }}
                </template>
              </li>
            </ul>
          </div>
          <ul
            v-if="draftEvidence.nutrition.missing.length"
            class="evidence-list"
          >
            <li
              v-for="message in draftEvidence.nutrition.missing"
              :key="message"
            >
              REVIEW REQUIRED — {{ message }}
            </li>
          </ul>
        </details>
        <details v-if="draftEvidence">
          <summary>Allergen evidence and paths</summary>
          <p v-if="draftEvidence.pendingAllergens.length">
            Also needing final-food review: {{ draftEvidence.pendingAllergens.join(', ') }}.
          </p>
          <p class="field-hint">
            Known evidence is retained even when amounts or composition are incomplete.
            An absent assessment on a compound does not override a component recorded as present.
          </p>
          <ul
            v-if="draftEvidence.allergenTrace.length"
            class="evidence-list"
          >
            <li
              v-for="item in draftEvidence.allergenTrace"
              :key="item.id"
            >
              Candidate {{ item.summaryName }} · ingredient-list name {{ item.ingredientListName }} ·
              paths {{ item.sourcePaths.map(displayPath).join('; ') }} · REVIEW REQUIRED
            </li>
          </ul>
          <ul
            v-if="draftEvidence.allergenEvidence.length"
            class="evidence-list"
          >
            <li
              v-for="source in draftEvidence.allergenEvidence"
              :key="source.id"
            >
              {{ allergenAssessments(source.assessments) || 'No assessments recorded' }} ·
              {{ source.sourceId || 'User-provided information' }}{{ source.sourceDate ? ` · ${source.sourceDate}` : '' }}
              · path {{ displayPath(source.sourcePath) }}
            </li>
          </ul>
          <p v-else>
            No allergen evidence available — REVIEW REQUIRED.
          </p>
          <ul class="evidence-list">
            <li
              v-for="message in draftEvidence.missing.filter((item) => item.includes('allergen') || item.includes('included ingredient records it present'))"
              :key="message"
            >
              REVIEW REQUIRED — {{ message }}
            </li>
          </ul>
        </details>
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
            <h3 id="saved-results-title">
              Evaluation results and rule traces
            </h3>
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
    </details>
  </div>
</template>

<style scoped>
.review-disclaimer {
  margin-bottom: 20px;
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
