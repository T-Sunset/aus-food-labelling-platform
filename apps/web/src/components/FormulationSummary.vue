<script setup lang="ts">
import { computed } from 'vue';
import type { AllergenEvidenceStatus, AdditiveSourceStatus, AdditiveConcentrationBasis, AdditiveConcentrationUnit } from '@aus-food/domain';
import type { FormulationRecord, IngredientRecord } from '@aus-food/storage';
import { makeFormulationSummary } from '../formulation-summary';

const props = defineProps<{
  recipe: FormulationRecord;
  formulations: readonly FormulationRecord[];
  ingredients: readonly IngredientRecord[];
}>();
const summary = computed(() => makeFormulationSummary(props.recipe, props.formulations, props.ingredients));

function allergenStatus(status: AllergenEvidenceStatus): string {
  switch (status) {
    case 'present': return 'Recorded as present';
    case 'unknown': return 'Not sure';
    case 'conflict': return 'Conflicting information';
    case 'exemption_review': return 'Exemption needs checking';
    case 'absent': return 'Recorded as absent';
  }
}

function additiveStatus(status: AdditiveSourceStatus): string {
  switch (status) {
    case 'added': return 'Recorded as added';
    case 'carriedOver': return 'Recorded as carried over; check its use';
    case 'processingAid': return 'Recorded as a processing aid; check its use';
    case 'unknown': return 'Use needs checking';
  }
}
const concentrationUnits: Record<AdditiveConcentrationUnit, string> = {
  percentByMass: '% by mass', percentByVolume: '% by volume', mgPerKg: 'mg/kg', gPerKg: 'g/kg',
  mgPerL: 'mg/L', gPerL: 'g/L', mgPer100g: 'mg/100 g', gPer100g: 'g/100 g',
  mgPer100mL: 'mg/100 mL', gPer100mL: 'g/100 mL',
};
const concentrationBases: Record<AdditiveConcentrationBasis, string> = {
  asSupplied: 'as supplied', asAdded: 'as added', dryMatter: 'dry matter',
  asPrepared: 'as prepared', asReconstituted: 'as reconstituted', asDrained: 'as drained', unknown: 'basis unknown',
};
</script>

<template>
  <section
    class="summary"
    :aria-label="`${recipe.name} summary`"
  >
    <h3>{{ recipe.name }} summary</h3>
    <p>Based on the saved recipe and ingredient information. This is not a finished label or a legal check.</p>

    <section
      class="summary-section"
      aria-label="Recipe ingredients"
    >
      <h4>Ingredients</h4>
      <p>Amounts entered for this recipe, before cooking or other processing.</p>
      <ul
        v-if="summary.lines.length"
        class="summary-list"
      >
        <li
          v-for="line in summary.lines"
          :key="line.id"
        >
          <strong>{{ line.name }}</strong>
          <span>{{ line.amount }}</span>
          <small v-if="line.kind === 'formulation'">Linked recipe</small>
          <small v-if="line.additiveUse === 'processingAid'">Recorded as a processing aid; check its use.</small>
          <small v-else-if="line.additiveUse === 'unknown'">Additive use needs checking.</small>
        </li>
      </ul>
      <p v-else>
        No ingredients have been entered yet.
      </p>
      <p
        v-if="summary.expansionIssue"
        role="alert"
        class="summary-notice"
      >
        Ingredient proportions are not available. {{ summary.expansionIssue }}
      </p>
      <details v-if="summary.breakdown.length">
        <summary>See ingredient breakdown per 100 g before cooking</summary>
        <p
          v-if="summary.breakdownIssue"
          class="summary-notice"
        >
          {{ summary.breakdownIssue }}
        </p>
        <ul class="summary-list">
          <li
            v-for="(item, index) in summary.breakdown"
            :key="`${item.path}-${index}`"
          >
            <strong>{{ item.name }}</strong>
            <span>{{ item.amount }}</span>
            <small>From: {{ item.path }}</small>
          </li>
        </ul>
      </details>
    </section>

    <section
      class="summary-section"
      aria-label="Recipe nutrition"
    >
      <h4>Nutrition estimate</h4>
      <p>
        Per 100 g of ingredients before cooking, calculated from the recorded ingredient values.
        Cooking, yield and the finished product can change these figures; this is not a nutrition panel.
      </p>
      <p v-if="recipe.finishedNutrition?.selected || recipe.nutrientRetention?.selected">
        Finished-food nutrition information is also recorded but is not shown in this estimate.
        Review it in the recipe editor and the Product page.
      </p>
      <p
        v-if="summary.nutritionIssue"
        class="summary-notice"
      >
        Nutrition cannot be calculated yet. {{ summary.nutritionIssue }}
      </p>
      <p
        v-else-if="summary.nutrition.some((row) => row.value === 'Not available' || row.batch === 'Not available')"
        class="summary-notice"
      >
        Some figures are unavailable. Open the nutrition details below to see what needs attention.
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">
              Nutrient
            </th><th scope="col">
              Per 100 g before cooking
            </th><th scope="col">
              Whole batch before cooking
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in summary.nutrition"
            :key="row.label"
          >
            <th scope="row">
              {{ row.label }}
            </th>
            <td>{{ row.value }}</td>
            <td>{{ row.batch }}</td>
          </tr>
        </tbody>
      </table>
      <details v-if="!summary.nutritionIssue">
        <summary>See nutrition details and missing information</summary>
        <div
          v-for="row in summary.nutrition"
          :key="row.label"
          class="trace"
        >
          <strong>{{ row.label }}</strong>
          <ul v-if="row.missing.length">
            <li
              v-for="item in row.missing"
              :key="item"
            >
              {{ item }}
            </li>
          </ul>
          <ul v-if="row.sources.length">
            <li
              v-for="(source, index) in row.sources"
              :key="`${source.path}-${index}`"
            >
              {{ source.path }}: {{ source.value }} {{ source.unit }}
              ({{ source.ingoingMass }} g in each 100 g of ingredients)
              <template v-if="source.sourceId || source.sourceDate">
                ({{ [source.sourceId, source.sourceDate].filter(Boolean).join(' · ') }})
              </template>
              <template v-if="source.method">
                — {{ source.method }}
              </template>
            </li>
          </ul>
        </div>
      </details>
    </section>

    <section
      class="summary-section"
      aria-label="Recipe allergens"
    >
      <h4>Allergens</h4>
      <p>Recorded ingredient information, including additives and compound ingredients. Check what must be declared for the finished product.</p>
      <ul
        v-if="summary.allergens.length"
        class="summary-list"
      >
        <li
          v-for="(item, index) in summary.allergens"
          :key="`${item.path}-${item.name}-${index}`"
        >
          <strong>{{ item.name }}</strong>
          <span>{{ allergenStatus(item.status) }}</span>
          <small>From: {{ item.path }}<template v-if="item.source"> · {{ item.source }}</template></small>
        </li>
      </ul>
      <p v-else>
        No allergens are recorded as present. This does not establish that the recipe is allergen-free.
      </p>
      <ul
        v-if="summary.allergenGaps.length"
        class="summary-gaps"
      >
        <li
          v-for="gap in summary.allergenGaps"
          :key="gap"
        >
          {{ gap }}
        </li>
      </ul>
      <details v-if="summary.allergenDetails.some((item) => item.status === 'absent')">
        <summary>See recorded absence information</summary>
        <ul>
          <li
            v-for="(item, index) in summary.allergenDetails.filter((entry) => entry.status === 'absent')"
            :key="`${item.path}-${item.name}-${index}`"
          >
            {{ item.name }}: {{ allergenStatus(item.status) }} for {{ item.path }}<template v-if="item.source">
              · {{ item.source }}
            </template>
          </li>
        </ul>
      </details>
    </section>

    <section
      class="summary-section"
      aria-label="Recipe additives"
    >
      <h4>Additives</h4>
      <p>Recorded additives, including those in compound ingredients. Their permission and label wording are not checked here.</p>
      <ul
        v-if="summary.additiveSources.length"
        class="summary-list"
      >
        <li
          v-for="(item, index) in summary.additiveSources"
          :key="`${item.path}-${item.source.id}-${index}`"
        >
          <strong>{{ item.source.additiveName }}<template v-if="item.source.codeNumber"> ({{ item.source.codeNumber }})</template></strong>
          <span>{{ additiveStatus(item.source.sourceStatus) }}</span>
          <small>From: {{ item.path }}</small>
          <small v-if="item.source.technologicalPurposes?.length">Recorded purpose: {{ item.source.technologicalPurposes.join(', ') }}</small>
          <small v-if="item.source.concentration">Recorded ingredient concentration: {{ item.source.concentration.value }} {{ concentrationUnits[item.source.concentration.unit] }} ({{ concentrationBases[item.source.concentration.basis] }})</small>
          <small v-if="item.source.sourceEvidence?.length">
            Source: {{ item.source.sourceEvidence.map((evidence) => [evidence.reference, evidence.sourceDate].filter(Boolean).join(' · ')).filter(Boolean).join('; ') || 'Not supplied' }}
          </small>
          <details>
            <summary>Earlier ingredient wording and review details</summary>
            <p>Ingredient wording candidate: {{ item.candidate.text ?? 'Not available' }}. {{ item.candidate.explanation }}</p>
            <p>Label-specific wording is chosen on the Labels page.</p>
          </details>
        </li>
      </ul>
      <p v-else>
        No additives are recorded. Missing information does not establish that none are present.
      </p>
      <ul
        v-if="summary.additiveGaps.length"
        class="summary-gaps"
      >
        <li
          v-for="gap in summary.additiveGaps"
          :key="gap"
        >
          {{ gap }}
        </li>
      </ul>
    </section>
  </section>
</template>

<style scoped>
.summary { flex-basis: 100%; min-width: 0; padding: 18px; border: 1px solid #dce7dc; border-radius: 10px; background: #f9fbf8; color: #263b2d; font-size: 15px; line-height: 1.5; }
.summary h3 { margin: 0; font-size: 20px; }
.summary h4 { margin: 0 0 8px; font-size: 17px; }
.summary p { margin: 8px 0 12px; }
.summary-section { padding-top: 16px; margin-top: 16px; border-top: 1px solid #dce7dc; }
.summary-list { display: grid; gap: 8px; padding: 0; list-style: none; }
.summary-list li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 3px 12px; padding: 10px 12px; border: 1px solid #dce7dc; border-radius: 7px; background: white; }
.summary-list small { grid-column: 1 / -1; color: #415b49; font-size: 13px; overflow-wrap: anywhere; }
.summary-list details { grid-column: 1 / -1; }
.summary-notice, .summary-gaps { padding: 10px 14px; border-radius: 7px; background: #fff5df; color: #59441b; }
.summary-gaps { padding-left: 32px; }
.summary details { margin-top: 12px; }
.summary summary { cursor: pointer; font-weight: 600; }
.summary table { width: 100%; table-layout: fixed; border-collapse: collapse; text-align: left; overflow-wrap: anywhere; }
.summary th, .summary td { padding: 8px; border-bottom: 1px solid #dce7dc; }
.trace { margin: 10px 0; }
.trace ul { margin: 4px 0; padding-left: 22px; }
@media (max-width: 600px) {
  .summary-list li { grid-template-columns: 1fr; }
  .summary-list small { grid-column: auto; }
  .summary-list details { grid-column: auto; }
}
</style>
