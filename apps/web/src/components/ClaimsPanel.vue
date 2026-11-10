<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { ClaimClassification, ProductClaim, ProductClaimFacts } from '@aus-food/domain';
import type {
  FormulationRecord,
  IngredientRecord,
  LocalFoodStore,
  ProductRecord,
} from '@aus-food/storage';
import { buildClaimChecks, CLAIM_LIMITATIONS } from '../claim-checks';
import { illustrativePreviewOn } from '../illustrative-state';
import { claimRules, RULE_RELEASE_LABEL } from '../rule-data';
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

type Answer = '' | 'yes' | 'no';
interface ClaimDraft {
  id: string;
  text: string;
  classification: '' | ClaimClassification;
  confirmed: boolean;
  ruleId: string;
  amount: string;
  evidenceReference: string;
  evidenceDate: string;
}

const classificationOptions: { id: ClaimClassification; label: string }[] = [
  { id: 'nutrition_content', label: 'Nutrition content claim' },
  { id: 'comparative', label: 'Comparative claim' },
  { id: 'health', label: 'Health claim' },
  { id: 'not_code_regulated', label: 'Not regulated by the Code (for example "natural")' },
];

const selectedProductId = ref('');
const message = ref('');
const errorMessage = ref('');
const drafts = ref<ClaimDraft[]>([]);
const facts = reactive({
  foodForm: '' as '' | 'liquid' | 'solid',
  formOfFoodConfirmed: false,
  servingConfirmed: false,
  infantFormulaProduct: '' as Answer,
  kava: '' as Answer,
  alcohol: '' as Answer,
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

const toAnswer = (value: boolean | undefined): Answer => (value === undefined ? '' : value ? 'yes' : 'no');
const fromAnswer = (value: Answer): boolean | undefined => (value === '' ? undefined : value === 'yes');

watch(
  selectedProduct,
  (product) => {
    const saved = product?.claimFacts;
    facts.foodForm = saved?.foodForm ?? '';
    facts.formOfFoodConfirmed = saved?.formOfFoodConfirmed ?? false;
    facts.servingConfirmed = saved?.servingConfirmed ?? false;
    facts.infantFormulaProduct = toAnswer(saved?.prohibitedContexts?.infantFormulaProduct);
    facts.kava = toAnswer(saved?.prohibitedContexts?.kava);
    facts.alcohol = toAnswer(saved?.prohibitedContexts?.alcoholAbove1_15Percent);
    drafts.value = (product?.claims ?? []).map((claim) => ({
      id: claim.id,
      text: claim.text,
      classification: claim.classification ?? '',
      confirmed: claim.classificationConfirmed ?? false,
      ruleId: claim.supportedClaimId ?? '',
      amount: claim.nutrientAmount?.value ?? '',
      evidenceReference: claim.evidence?.reference ?? '',
      evidenceDate: claim.evidence?.sourceDate ?? '',
    }));
  },
  { immediate: true },
);

const checks = computed(() =>
  selectedProduct.value ? buildClaimChecks(selectedProduct.value, illustrativePreviewOn.value) : [],
);

function ruleUnit(ruleId: string): string | undefined {
  const rule = claimRules.find((entry) => entry.id === ruleId);
  return rule?.limits.perServing?.unit ?? rule?.limits.liquid?.unit ?? rule?.limits.solid?.unit;
}

function basisHint(ruleId: string): string {
  const rule = claimRules.find((entry) => entry.id === ruleId);
  if (!rule) {
    return '';
  }
  return rule.basis === 'perServing' ? 'per serving' : 'per 100 mL (liquid) or per 100 g (solid)';
}

function addClaim(): void {
  drafts.value.push({
    id: `claim-${crypto.randomUUID()}`,
    text: '',
    classification: '',
    confirmed: false,
    ruleId: '',
    amount: '',
    evidenceReference: '',
    evidenceDate: '',
  });
}

function removeClaim(index: number): void {
  drafts.value.splice(index, 1);
}

function buildClaims(): ProductClaim[] {
  return drafts.value.map((draft): ProductClaim => {
    const classification = draft.classification === '' ? undefined : draft.classification;
    const nutrition = classification === 'nutrition_content';
    const unit = nutrition && draft.ruleId ? ruleUnit(draft.ruleId) : undefined;
    return {
      id: draft.id,
      text: draft.text,
      ...(classification ? { classification, classificationConfirmed: draft.confirmed } : {}),
      ...(nutrition && draft.ruleId ? { supportedClaimId: draft.ruleId } : {}),
      ...(unit && draft.amount.trim() ? { nutrientAmount: { value: draft.amount.trim(), unit } } : {}),
      ...(draft.evidenceReference.trim() && draft.evidenceDate
        ? { evidence: { reference: draft.evidenceReference.trim(), sourceDate: draft.evidenceDate } }
        : {}),
    };
  });
}

function buildFacts(): ProductClaimFacts {
  const infant = fromAnswer(facts.infantFormulaProduct);
  const kava = fromAnswer(facts.kava);
  const alcohol = fromAnswer(facts.alcohol);
  return {
    ...(facts.foodForm ? { foodForm: facts.foodForm } : {}),
    formOfFoodConfirmed: facts.formOfFoodConfirmed,
    servingConfirmed: facts.servingConfirmed,
    prohibitedContexts: {
      ...(infant === undefined ? {} : { infantFormulaProduct: infant }),
      ...(kava === undefined ? {} : { kava }),
      ...(alcohol === undefined ? {} : { alcoholAbove1_15Percent: alcohol }),
    },
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
    await props.store.products.update(product.id, { claims: buildClaims(), claimFacts: buildFacts() });
    message.value = 'Claims and claim facts saved on this product draft.';
    emit('saved');
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'The claims could not be saved.';
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
          CLAIMS
        </p>
        <h1>Claims</h1>
        <p class="lede">
          Enter each claim exactly as it appears on your product. Nothing here classifies your wording for
          you: you choose and confirm what kind of claim it is. Unknown values are never treated as zero.
        </p>
      </div>
    </div>

    <div
      class="notice notice-warning"
      role="status"
    >
      <strong>REVIEW REQUIRED</strong>
      <span>{{ RULE_RELEASE_LABEL }}. These results assist review and do not certify legal compliance.
        Claim rules are draft, so no claim can be shown as passing or failing yet.</span>
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
        aria-labelledby="claim-facts-title"
        @submit.prevent="save"
      >
        <h2 id="claim-facts-title">
          Facts about this product
        </h2>
        <label class="field">
          <span>Food form</span>
          <select v-model="facts.foodForm">
            <option value="">Not confirmed</option>
            <option value="liquid">Liquid</option>
            <option value="solid">Solid</option>
          </select>
        </label>
        <label>
          <input
            v-model="facts.formOfFoodConfirmed"
            type="checkbox"
          >
          I confirm the figures are for the form of the food required by Standard 1.2.7-7
        </label>
        <label>
          <input
            v-model="facts.servingConfirmed"
            type="checkbox"
          >
          I confirm the serving size (needed for per-serving claims)
        </label>
        <fieldset class="field">
          <legend>Contexts where nutrition content claims are restricted (Standard 1.2.7-4)</legend>
          <label class="field">
            <span>Is this an infant formula product?</span>
            <select v-model="facts.infantFormulaProduct">
              <option value="">Not answered</option>
              <option value="yes">Yes, it applies</option>
              <option value="no">No, it does not apply</option>
            </select>
          </label>
          <label class="field">
            <span>Is this a kava product?</span>
            <select v-model="facts.kava">
              <option value="">Not answered</option>
              <option value="yes">Yes, it applies</option>
              <option value="no">No, it does not apply</option>
            </select>
          </label>
          <label class="field">
            <span>Does it contain more than 1.15% alcohol by volume?</span>
            <select v-model="facts.alcohol">
              <option value="">Not answered</option>
              <option value="yes">Yes, it applies</option>
              <option value="no">No, it does not apply</option>
            </select>
          </label>
        </fieldset>

        <h2>Your claims</h2>
        <p
          v-if="drafts.length === 0"
          class="field-hint"
        >
          No claims entered for this product.
        </p>
        <fieldset
          v-for="(draft, index) in drafts"
          :key="draft.id"
          class="field"
        >
          <legend>Claim {{ index + 1 }}</legend>
          <label class="field">
            <span>Claim {{ index + 1 }} text (exactly as it appears)</span>
            <input v-model="draft.text">
          </label>
          <label class="field">
            <span>Claim {{ index + 1 }} type (your classification)</span>
            <select v-model="draft.classification">
              <option value="">Not classified</option>
              <option
                v-for="option in classificationOptions"
                :key="option.id"
                :value="option.id"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
          <label>
            <input
              v-model="draft.confirmed"
              type="checkbox"
            >
            I confirm the type of claim {{ index + 1 }}
          </label>
          <template v-if="draft.classification === 'nutrition_content'">
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
            <label
              v-if="draft.ruleId"
              class="field"
            >
              <span>Claim {{ index + 1 }} amount ({{ ruleUnit(draft.ruleId) }} {{ basisHint(draft.ruleId) }})</span>
              <input
                v-model="draft.amount"
                inputmode="decimal"
              >
            </label>
          </template>
          <label class="field">
            <span>Claim {{ index + 1 }} evidence reference</span>
            <input v-model="draft.evidenceReference">
          </label>
          <label class="field">
            <span>Claim {{ index + 1 }} evidence date</span>
            <input
              v-model="draft.evidenceDate"
              type="date"
            >
          </label>
          <AppButton
            type="button"
            @click="removeClaim(index)"
          >
            Remove claim {{ index + 1 }}
          </AppButton>
        </fieldset>
        <div class="actions">
          <AppButton
            type="button"
            @click="addClaim"
          >
            Add a claim
          </AppButton>
          <AppButton type="submit">
            Save claims
          </AppButton>
        </div>
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

      <IllustrativeToggle />

      <section
        class="panel"
        aria-labelledby="claim-results-title"
      >
        <h2 id="claim-results-title">
          Claim results
        </h2>
        <p
          v-if="checks.length === 0"
          class="field-hint"
        >
          No claims to check.
        </p>
        <article
          v-for="check in checks"
          :key="check.claim.id"
          class="panel"
          :aria-label="`Claim: ${check.claim.text}`"
        >
          <h3>&ldquo;{{ check.claim.text }}&rdquo;</h3>
          <p>
            <strong>Status: {{ check.official.status }}</strong>
            ({{ check.official.applicationMode }})
          </p>
          <p>{{ check.official.explanation }}</p>
          <p v-if="(check.official.value?.reasons.length ?? 0) > 0">
            Review reasons: {{ check.official.value?.reasons.join(', ') }}
          </p>
          <details>
            <summary>Condition checklist, rule and source</summary>
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
          <IllustrativeNote
            v-if="check.preview"
            :preview="check.preview"
            :label="`claim: ${check.claim.text}`"
          />
          <p class="field-hint">
            {{ check.official.nonCertificationStatement }}
          </p>
        </article>
        <h3>Not checked in this release</h3>
        <ul>
          <li
            v-for="line in CLAIM_LIMITATIONS"
            :key="line"
          >
            {{ line }}
          </li>
        </ul>
      </section>
    </template>
  </section>
</template>
