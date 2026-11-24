<script setup lang="ts">
import { computed } from 'vue';
import type { EngineResult, IllustrativeResult } from '@aus-food/domain';
import type { FormulationRecord, IngredientRecord, ProductRecord } from '@aus-food/storage';
import { buildAdditiveNameReport } from '../additive-name-checks';
import { illustrativePreviewOn } from '../illustrative-state';
import { displaySourcePath } from '../source-path';
import IllustrativeNote from './IllustrativeNote.vue';
import IllustrativeToggle from './IllustrativeToggle.vue';
import ChecklistStatus from './ChecklistStatus.vue';

const props = defineProps<{
  product: ProductRecord;
  formulations: readonly FormulationRecord[];
  ingredients: readonly IngredientRecord[];
}>();

const report = computed(() =>
  buildAdditiveNameReport(props.product, props.formulations, props.ingredients, illustrativePreviewOn.value));

interface ResultCard {
  key: string;
  heading: string;
  result: EngineResult<unknown>;
  reasons: readonly string[];
  detail: readonly string[];
  preview?: IllustrativeResult<unknown> | undefined;
}

const resultCards = computed<ResultCard[]>(() => {
  const current = report.value;
  const cards: ResultCard[] = current.additives.map((additive) => {
    const concentration = additive.concentration;
    return {
      key: `perm-${additive.codeNumber}`,
      heading: `Additive permission: ${additive.codeNumber} (${additive.names.join(', ')})`,
      result: additive.permission,
      reasons: additive.permission.value?.reasons ?? [],
      detail: concentration.status === 'calculated'
        ? [`Calculated final concentration: ${concentration.value} ${concentration.unit} (from ${concentration.contributions.length} source record(s))`,
          ...concentration.contributions.map((item) => `${displaySourcePath(item.sourcePath, props.ingredients, props.formulations)}: ${item.additiveMilligrams} mg from ${item.ingredientMass.value} ${item.ingredientMass.unit}`),
          ...concentration.provenanceWarnings]
        : [`Concentration not calculated: ${concentration.reasons.join(', ')}`, ...concentration.detail],
      preview: additive.preview,
    };
  });
  if (current.names) cards.push({
    key: 'names', heading: 'Prescribed-name candidates', result: current.names,
    reasons: current.names.value?.reasons ?? [],
    detail: (current.names.value?.candidates ?? []).map((item) => `${item.provision}: ${item.requirement}`),
  });
  if (current.sweetened) cards.push({
    key: 'sweetened', heading: "Infant food 'sweetened' word", result: current.sweetened,
    reasons: current.sweetened.value?.reasons ?? [], detail: [], preview: current.sweetenedPreview,
  });
  return cards;
});
</script>

<template>
  <div>
    <p class="field-hint">
      These draft checks use saved product and recipe information. Missing facts and unsupported checks
      need review; the results do not establish compliance. Label wording is chosen on Labels.
    </p>
    <p class="field-hint">
      Previously saved specialist inputs remain in this product, but cannot currently be edited here.
    </p>
    <p
      v-if="report.error"
      class="notice notice-error"
      role="alert"
    >
      Recipe information needs attention: {{ report.error }}
    </p>
    <IllustrativeToggle />
    <section aria-labelledby="additive-declaration-review-title">
      <h3 id="additive-declaration-review-title">
        Additive declaration candidates
      </h3>
      <p
        v-if="report.declarations.length === 0"
        class="field-hint"
      >
        No additive sources could be identified from the recorded information. Missing information does not establish absence.
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
          <small>Source path: {{ displaySourcePath(line.candidate.sourcePath, ingredients, formulations) }}</small>
        </li>
      </ul>
    </section>
    <section aria-labelledby="additive-evaluation-review-title">
      <h3 id="additive-evaluation-review-title">
        Permission and prescribed-name evaluation
      </h3>
      <p
        v-if="report.uncodedAdditives.length"
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
        <h4>{{ item.heading }}</h4>
        <ChecklistStatus
          :status="item.result.status"
          :reasons="item.reasons"
          :preview="item.preview"
        />
        <p><strong>Status: {{ item.result.status }}</strong> ({{ item.result.applicationMode }})</p>
        <p>{{ item.result.explanation }}</p>
        <p v-if="item.reasons.length">
          Review reasons: {{ item.reasons.join(', ') }}
        </p>
        <ul v-if="item.detail.length">
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
            (mapping confidence: {{ item.result.rule.mappingConfidence }}, version {{ item.result.rule.version }})
          </p>
          <p>{{ item.result.rule.sourceUrl }}</p>
          <ul>
            <li
              v-for="input in item.result.inputs"
              :key="input.name"
            >
              {{ input.name }}: {{ input.value }} {{ input.unit ?? '' }} (evidence {{ input.sourceId }}, {{ input.sourceDate }})
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
      <h4>Limitations and information needing review</h4>
      <ul>
        <li
          v-for="line in report.limitations"
          :key="line"
        >
          {{ line }}
        </li>
      </ul>
    </section>
  </div>
</template>
