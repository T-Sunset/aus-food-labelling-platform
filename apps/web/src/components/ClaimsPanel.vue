<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { ClaimClassification, LabelClaim } from '@aus-food/domain';
import type { ProductRecord } from '@aus-food/storage';
import { buildClaimChecks, CLAIM_LIMITATIONS } from '../claim-checks';
import { claimRules, RULE_RELEASE_LABEL } from '../rule-data';
import type { NipDraft } from '../nip-draft';
import ChecklistStatus from './ChecklistStatus.vue';
import AppButton from './ui/button/AppButton.vue';

const props = defineProps<{
  product: ProductRecord;
  claims: readonly LabelClaim[];
  nutrition: NipDraft;
}>();
const emit = defineEmits<{
  'update:claims': [claims: LabelClaim[]];
  'review-product': [];
}>();

interface ClaimDraft {
  original: LabelClaim;
  text: string;
  classification: '' | ClaimClassification;
  confirmed: boolean;
  ruleId: string;
}

const classificationOptions: { id: ClaimClassification; label: string }[] = [
  { id: 'nutrition_content', label: 'Nutrition content (for example "low sugar")' },
  { id: 'comparative', label: 'Comparative (for example "reduced sugar")' },
  { id: 'health', label: 'Health (for example "supports heart health")' },
  { id: 'not_code_regulated', label: 'Other wording (for example "natural") — needs review' },
];

function claimDraft(claim: LabelClaim): ClaimDraft {
  return {
    original: claim,
    text: claim.text,
    classification: claim.classification ?? '',
    confirmed: claim.classificationConfirmed ?? false,
    ruleId: claim.supportedClaimId ?? '',
  };
}

const drafts = ref<ClaimDraft[]>(props.claims.map(claimDraft));

function addClaim(): void {
  drafts.value.push(claimDraft({ id: `claim-${crypto.randomUUID()}`, text: '' }));
}

function removeClaim(index: number): void {
  drafts.value.splice(index, 1);
}

function buildClaims(): LabelClaim[] {
  return drafts.value.map((draft): LabelClaim => {
    const classification = draft.classification === '' ? undefined : draft.classification;
    const claim = { ...draft.original, text: draft.text };
    if (classification) {
      claim.classification = classification;
      if (draft.confirmed || claim.classificationConfirmed !== undefined) claim.classificationConfirmed = draft.confirmed;
    } else {
      delete claim.classification;
      delete claim.classificationConfirmed;
    }
    if (draft.ruleId) claim.supportedClaimId = draft.ruleId;
    else delete claim.supportedClaimId;
    return claim;
  });
}

const checks = computed(() => buildClaimChecks(
  props.product,
  false,
  buildClaims().filter((claim) => claim.text.trim() !== ''),
  props.nutrition,
));

function focusClaim(claimId: string): void {
  document.getElementById(`label-claim-${claimId}`)?.focus();
}

function reviewGuidance(action: 'claim' | 'product', claimId: string): void {
  if (action === 'claim') focusClaim(claimId);
  else emit('review-product');
}

watch(drafts, () => emit('update:claims', buildClaims()), { deep: true });
watch(() => props.claims, (claims) => {
  if (JSON.stringify(buildClaims()) === JSON.stringify(claims)) return;
  drafts.value = claims.map(claimDraft);
}, { deep: true });
</script>

<template>
  <section
    class="claim-workspace"
    aria-labelledby="label-claims-title"
  >
    <h2 id="label-claims-title">
      Claims on this Label draft
    </h2>
    <p class="field-hint">
      Enter each statement exactly as you intend it to appear. Claims belong to this Label draft;
      other labels for {{ product.name }} can have different statements.
    </p>
    <div
      class="notice notice-warning"
      role="status"
    >
      <strong>Consultant review recommended</strong>
      <span>{{ RULE_RELEASE_LABEL }}. Claim checks use draft rules and cannot give an official pass or fail.
        The official status remains REVIEW REQUIRED. This does not certify legal compliance.</span>
    </div>
    <p
      v-if="drafts.length === 0"
      class="field-hint"
    >
      No claims entered for this Label draft. Text elsewhere on the label may still contain claims.
    </p>
    <fieldset
      v-for="(draft, index) in drafts"
      :key="draft.original.id"
      class="field"
    >
      <legend>Claim {{ index + 1 }}</legend>
      <label class="field">
        <span>Claim {{ index + 1 }} text (exactly as it appears)</span>
        <input
          :id="`label-claim-${draft.original.id}`"
          v-model="draft.text"
          :readonly="Boolean(draft.original.sourceCandidateKey)"
        >
        <small v-if="draft.original.sourceCandidateKey">
          This claim is linked to detected wording elsewhere. Edit the original source instead.
        </small>
      </label>
      <label class="field">
        <span>Claim {{ index + 1 }} type (your classification)</span>
        <select
          v-model="draft.classification"
          @change="draft.confirmed = false"
        >
          <option value="">Not classified</option>
          <option
            v-for="option in classificationOptions"
            :key="option.id"
            :value="option.id"
          >
            {{ option.label }}
          </option>
        </select>
        <small>Choose the closest type if you know it. Leave it unclassified if you are unsure.</small>
      </label>
      <label>
        <input
          v-model="draft.confirmed"
          type="checkbox"
        >
        I confirm the type of claim {{ index + 1 }}
      </label>
      <template v-if="draft.classification === 'nutrition_content'">
        <p class="field-hint">
          If one of the available draft checks matches your wording, select it. Checks use saved
          Product nutrition. A selection does not establish that the wording is permitted.
        </p>
        <label class="field">
          <span>Claim {{ index + 1 }} supported claim rule</span>
          <select v-model="draft.ruleId">
            <option value="">No supported rule</option>
            <option
              v-for="rule in claimRules"
              :key="rule.id"
              :value="rule.id"
            >
              {{ rule.claimName }}
            </option>
          </select>
        </label>
      </template>
      <AppButton
        type="button"
        @click="removeClaim(index)"
      >
        Remove claim {{ index + 1 }}
      </AppButton>
    </fieldset>
    <AppButton
      type="button"
      @click="addClaim"
    >
      Add a claim
    </AppButton>

    <section
      class="panel"
      aria-labelledby="claim-results-title"
    >
      <h3 id="claim-results-title">
        Claim checks for this Label draft
      </h3>
      <p class="field-hint">
        Results use the statements currently shown and saved Product information. Save the Label draft to keep
        claim statements. Conditions that cannot be established need review; missing information is not treated as confirmation.
      </p>
      <p
        v-if="checks.length === 0"
        class="field-hint"
      >
        No manually entered claims to check. Possible claims elsewhere are not evaluated yet.
      </p>
      <article
        v-for="check in checks"
        :key="check.claim.id"
        class="panel"
        :aria-label="`Claim: ${check.claim.text}`"
      >
        <h4>&ldquo;{{ check.claim.text }}&rdquo;</h4>
        <ChecklistStatus
          :status="check.official.status"
          :reasons="check.official.value?.reasons ?? []"
        />
        <p>
          <strong>Status: {{ check.official.status }}</strong>
          ({{ check.official.applicationMode }})
        </p>
        <p v-if="check.nutrition">
          {{ check.nutrition.explanation }}
        </p>
        <p>{{ check.official.explanation }}</p>
        <aside
          v-if="check.nipInteraction"
          class="notice notice-warning"
          aria-label="Claim-related nutrition panel review"
        >
          <strong>Claim-related NIP review required</strong>
          <p>{{ check.nipInteraction.message }}</p>
          <ul>
            <li
              v-for="row in check.nipInteraction.requiredRows"
              :key="row.id"
            >
              {{ row.label }}: {{ row.available ? 'derived data is available for review' : 'data is missing or needs review' }}.
            </li>
          </ul>
        </aside>
        <aside
          v-if="check.guidance.length"
          class="notice notice-warning"
          aria-label="What to review next"
        >
          <strong>What to review next</strong>
          <ul>
            <li
              v-for="guidance in check.guidance"
              :key="guidance.id"
            >
              {{ guidance.message }}
              <button
                v-if="guidance.action !== 'none'"
                type="button"
                @click="reviewGuidance(guidance.action, check.claim.id)"
              >
                {{ guidance.action === 'claim' ? 'Review claim entry' : 'Review Product inputs' }}
              </button>
            </li>
          </ul>
        </aside>
        <details>
          <summary>Condition checklist, rule and source</summary>
          <ul v-if="check.nutrition">
            <li
              v-for="(input, index) in check.nutrition.inputs"
              :key="index"
            >
              {{ input.name }}: {{ input.value }} {{ input.unit ?? '' }};
              source {{ input.sourceId }}; date {{ input.sourceDate }};
              path {{ input.sourcePath.join(' > ') }}
            </li>
          </ul>
          <p v-if="(check.official.value?.reasons.length ?? 0) > 0">
            Review reasons: {{ check.official.value?.reasons.join(', ') }}
          </p>
          <ul>
            <li
              v-for="item in check.official.value?.checklist ?? []"
              :key="item.id"
            >
              <strong>{{ item.status }}</strong> &ndash; {{ item.label }}: {{ item.detail }}
            </li>
          </ul>
          <p>
            {{ check.official.rule.name }} &ndash; {{ check.official.rule.provision }}
            (mapping confidence: {{ check.official.rule.mappingConfidence }},
            version {{ check.official.rule.version }})
          </p>
          <p>{{ check.official.rule.sourceUrl }}</p>
          <template v-if="check.rule && check.rule.notYetVerified.length > 0">
            <p>Not yet verified for this rule:</p>
            <ul>
              <li
                v-for="line in check.rule.notYetVerified"
                :key="line"
              >
                {{ line }}
              </li>
            </ul>
          </template>
        </details>
        <p class="field-hint">
          {{ check.official.nonCertificationStatement }}
        </p>
      </article>
      <h4>Not checked in this release</h4>
      <ul>
        <li
          v-for="line in CLAIM_LIMITATIONS"
          :key="line"
        >
          {{ line }}
        </li>
      </ul>
    </section>
  </section>
</template>
