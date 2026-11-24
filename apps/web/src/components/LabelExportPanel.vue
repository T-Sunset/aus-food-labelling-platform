<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import type {
  AdditiveDeclarationSelection,
  ClaimCandidateResolution,
  IngredientAdditiveSource,
  LabelClaim,
  LabelClaimCandidateDecision,
} from '@aus-food/domain';
import {
  createConsultantReportPdf,
  createLabelPdf,
  preloadLabelPdfRenderer,
  type LabelLayoutResult,
} from '@aus-food/label';
import {
  type FormulationRecord,
  type IngredientRecord,
  type LabelAdditiveWording,
  type LabelDraftRecord,
  type LocalFoodStore,
  type ProductRecord,
} from '@aus-food/storage';
import { makeLabelDraft, type LabelIssue, type ReviewAction } from '../label-draft';
import { allergenSummary, makeLabelLayout } from '../label-layout';
import { buildClaimChecks } from '../claim-checks';
import { labelDependencySignature } from '../label-dependencies';
import {
  configurableLabelTextBlocks,
  labelPackCopyForm,
  labelPackCopyReview,
  labelSettingsForm,
  labelTextBlockNames,
  parseLabelPackCopy,
  parseLabelSettings,
} from '../label-settings';
import { makeConsultantNotes, type LabelOutputContext } from '../consultant-notes';
import { LABEL_EXPORT_LIMITATIONS } from '../label-export-readiness';
import { RULE_RELEASE_LABEL } from '../rule-data';
import { additiveIngredientsInRecipe } from '../ingredient-additives';
import { labelAdditiveSelection } from '../label-additive-wording';
import { findClaimCandidates, type ClaimCandidate } from '../claim-candidates';
import AppButton from './ui/button/AppButton.vue';
import ClaimsPanel from './ClaimsPanel.vue';

const props = defineProps<{
  store: LocalFoodStore;
  products: readonly ProductRecord[];
  formulations: readonly FormulationRecord[];
  ingredients: readonly IngredientRecord[];
  labels: readonly LabelDraftRecord[];
  active: boolean;
  makeId: (prefix: string) => string;
  refresh: () => Promise<void>;
  productId?: string | undefined;
  hasUnsavedProductChanges: boolean;
}>();
const emit = defineEmits<{
  editProduct: [id: string];
  reviewProduct: [id: string];
  selectProduct: [id: string];
  editIngredient: [id: string];
  editRecipe: [id: string];
  goIngredients: [];
  goProducts: [];
}>();

const selectedProductId = ref('');
const previewUrl = ref('');
const exportError = ref('');
const exportStatus = ref('');
const rendererStatus = ref('Loading the local PDF renderer.');
const exporting = ref(false);
const exportingReport = ref(false);
const editingLabelId = ref<string>();
const openedLabel = ref('');
const labelSession = ref(0);
const settings = ref(labelSettingsForm(''));
const packCopy = ref(labelPackCopyForm());
const parsedPackCopy = computed(() => {
  try {
    return { value: parseLabelPackCopy(packCopy.value), error: '' };
  } catch (error) {
    return {
      value: undefined,
      error: error instanceof Error ? error.message : 'Pack text could not be validated.',
    };
  }

});
const packCopyReview = computed(() => labelPackCopyReview(packCopy.value));
const additiveWording = ref<LabelAdditiveWording[]>([]);
const labelClaims = ref<LabelClaim[]>([]);
const claimCandidateDecisions = ref<LabelClaimCandidateDecision[]>([]);
const additiveWordingDetails = ref<HTMLDetailsElement>();
const includeDailyIntake = ref(true);
const settingsSnapshot = () => JSON.stringify({
  settings: settings.value, packCopy: packCopy.value, additiveWording: additiveWording.value,
  claims: labelClaims.value, includeDailyIntake: includeDailyIntake.value,
  claimCandidateDecisions: claimCandidateDecisions.value,
});
const savedSettings = ref(settingsSnapshot());

function resolveClaimCandidate(candidate: ClaimCandidate, resolution: ClaimCandidateResolution): void {
  claimCandidateDecisions.value = [
    ...claimCandidateDecisions.value.filter((decision) => decision.candidateKey !== candidate.key),
    { candidateKey: candidate.key, text: candidate.text, location: candidate.location, resolution },
  ];
  const linkedIndex = labelClaims.value.findIndex((claim) => claim.sourceCandidateKey === candidate.key);
  if (resolution !== 'claim') {
    if (linkedIndex >= 0) labelClaims.value.splice(linkedIndex, 1);
    return;
  }
  const classification = candidate.suggestedClassification;
  const linkedClaim: LabelClaim = {
    id: linkedIndex >= 0 ? labelClaims.value[linkedIndex]!.id : props.makeId('claim'),
    text: candidate.text,
    sourceCandidateKey: candidate.key,
    ...(classification ? { classification, classificationConfirmed: true } : {}),
    ...(candidate.suggestedClaimRuleId && classification === 'nutrition_content'
      ? { supportedClaimId: candidate.suggestedClaimRuleId } : {}),
  };
  if (linkedIndex >= 0) labelClaims.value.splice(linkedIndex, 1, linkedClaim);
  else labelClaims.value.push(linkedClaim);
}
const labelSaving = ref(false);
const labelError = ref('');
const labelStatus = ref('');
const tabs = [
  { id: 'setup', title: 'Label setup' },
  { id: 'ingredients', title: 'Ingredients & allergens' },
  { id: 'pack', title: 'Pack details' },
  { id: 'claims', title: 'Claims' },
] as const;
type LabelTab = (typeof tabs)[number]['id'];
const activeTab = ref<LabelTab>('setup');
function selectTab(tab: LabelTab, focus = false): void {
  activeTab.value = tab;
  if (focus) void nextTick(() => document.getElementById(`label-tab-${tab}`)?.focus());
}
function handleTabKey(event: KeyboardEvent, tab: LabelTab): void {
  const index = tabs.findIndex((item) => item.id === tab);
  let next: number;
  if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
  else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = tabs.length - 1;
  else return;
  event.preventDefault();
  const target = tabs[next];
  if (target) selectTab(target.id, true);
}
const settingsDirty = computed(() => settingsSnapshot() !== savedSettings.value);
const savedLabel = computed(() => props.labels.find((label) => label.id === editingLabelId.value));
const savedLabelChanged = computed(() => savedLabel.value !== undefined
  && JSON.stringify(savedLabel.value) !== openedLabel.value);

function beforeUnload(event: BeforeUnloadEvent): void {
  if (settingsDirty.value) {
    event.preventDefault();
    event.returnValue = '';
  }
}
window.addEventListener('beforeunload', beforeUnload);
function canLeaveSettings(): boolean {
  if (labelSaving.value) {
    labelStatus.value = 'Wait for the label draft to finish saving before switching.';
    return false;
  }
  return !settingsDirty.value || window.confirm('Discard unsaved label changes?');
}
function setProduct(id: string): void {
  selectedProductId.value = id;
  editingLabelId.value = undefined;
  openedLabel.value = '';
  const product = props.products.find((item) => item.id === id);
  settings.value = labelSettingsForm(product ? `${product.name} label` : '');
  packCopy.value = labelPackCopyForm();
  additiveWording.value = [];
  labelClaims.value = [];
  claimCandidateDecisions.value = [];
  includeDailyIntake.value = true;
  labelSession.value += 1;
  savedSettings.value = settingsSnapshot();
  labelError.value = '';
  labelStatus.value = '';
  emit('selectProduct', id);
}
function changeProduct(event: Event): void {
  const select = event.target;
  if (!(select instanceof HTMLSelectElement)) return;
  if (select.value === selectedProductId.value) return;
  if (!canLeaveSettings()) {
    select.value = selectedProductId.value;
    return;
  }
  setProduct(select.value);
}
function openLabel(label: LabelDraftRecord, duplicate = false): void {
  if (!canLeaveSettings()) return;
  selectedProductId.value = label.productId;
  editingLabelId.value = duplicate ? undefined : label.id;
  openedLabel.value = duplicate ? '' : JSON.stringify(label);
  settings.value = labelSettingsForm(duplicate ? `${label.name} copy` : label.name, label.layout);
  packCopy.value = labelPackCopyForm(label.packCopy);
  additiveWording.value = (label.additiveWording ?? []).map((item) => ({ ...item, selection: { ...item.selection } }));
  labelClaims.value = (label.claims ?? []).map((claim) => ({
    ...claim,
    ...(claim.nutrientAmount ? { nutrientAmount: { ...claim.nutrientAmount } } : {}),
    ...(claim.evidence ? { evidence: { ...claim.evidence } } : {}),
  }));
  claimCandidateDecisions.value = (label.claimCandidateDecisions ?? []).map((decision) => ({ ...decision }));
  includeDailyIntake.value = label.includeDailyIntake ?? false;
  labelSession.value += 1;
  savedSettings.value = duplicate ? '' : settingsSnapshot();
  labelError.value = '';
  labelStatus.value = duplicate ? 'Copy the label by saving this new draft.' : '';
  emit('selectProduct', label.productId);
}
function newLabel(): void {
  if (!canLeaveSettings()) return;
  setProduct(selectedProductId.value);
  savedSettings.value = '';
}
function changeLabel(event: Event): void {
  const select = event.target;
  if (!(select instanceof HTMLSelectElement)) return;
  if (!select.value) newLabel();
  else {
    const label = props.labels.find((item) => item.id === select.value);
    if (label) openLabel(label);
    else labelError.value = 'The selected label is no longer available.';
  }
  select.value = editingLabelId.value ?? '';
}
function copyLegacyClaims(): void {
  const copied = (selectedProduct.value?.claims ?? []).map((claim) => {
    const copy = { ...claim };
    delete copy.sourceCandidateKey;
    return {
      ...copy,
      id: props.makeId('claim'),
      ...(claim.nutrientAmount ? { nutrientAmount: { ...claim.nutrientAmount } } : {}),
      ...(claim.evidence ? { evidence: { ...claim.evidence } } : {}),
    };
  });
  labelClaims.value.push(...copied);
}

watch(
  () => [props.active, props.products, props.productId] as const,
  ([active, products, productId]) => {
    if (!active) return;
    const requested = productId && products.some((product) => product.id === productId)
      ? productId : selectedProductId.value || products[0]?.id || '';
    if (requested !== selectedProductId.value) {
      if (!canLeaveSettings()) {
        emit('selectProduct', selectedProductId.value);
        return;
      }
      setProduct(requested);
    }
  },
  { immediate: true },
);

const selectedProduct = computed(() =>
  props.products.find((product) => product.id === selectedProductId.value),
);
function claimContentSignature(claim: LabelClaim): string {
  return JSON.stringify(Object.fromEntries(Object.entries(claim).filter(([key]) => key !== 'id')));
}
const legacyClaimsAlreadyOnLabel = computed(() => {
  const legacy = selectedProduct.value?.claims ?? [];
  const existing = new Set(labelClaims.value.map(claimContentSignature));
  return legacy.length > 0 && legacy.every((claim) => existing.has(claimContentSignature(claim)));
});
interface WordingItem {
  readonly ingredient: IngredientRecord;
  readonly source: IngredientAdditiveSource;
}
const wordingItems = computed<WordingItem[]>(() => {
  const product = selectedProduct.value;
  if (!product) return [];
  const byId = new Map(props.ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const seen = new Set<string>();
  return additiveIngredientsInRecipe(product.formulationId, props.formulations, props.ingredients).references.flatMap((reference) => {
    const ingredient = byId.get(reference.ingredientId);
    if (!ingredient) return [];
    return (ingredient.additiveSources ?? []).flatMap((source) => {
      const key = JSON.stringify([ingredient.id, source.id]);
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ ingredient, source }];
    });
  });
});
const hasUnusedWording = computed(() => additiveWording.value.some((entry) =>
  !wordingItems.value.some((item) => item.ingredient.id === entry.ingredientId
    && item.source.id === entry.additiveSourceId)));
function selectionFor(item: WordingItem): AdditiveDeclarationSelection {
  return labelAdditiveSelection(item.ingredient.id, item.source, additiveWording.value) ?? { route: 'unknown' };
}
function setSelection(item: WordingItem, selection: AdditiveDeclarationSelection): void {
  const next = {
    ingredientId: item.ingredient.id, additiveSourceId: item.source.id, selection,
  };
  const index = additiveWording.value.findIndex((entry) =>
    entry.ingredientId === next.ingredientId && entry.additiveSourceId === next.additiveSourceId);
  if (index < 0) additiveWording.value.push(next);
  else additiveWording.value.splice(index, 1, next);
}
function changeWording(item: WordingItem, field: 'route' | 'class' | 'substance' | 'flavour', event: Event): void {
  const control = event.target;
  if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement)) {
    throw new Error('The additive wording field is unavailable.');
  }
  const value = control.value;
  const current = selectionFor(item);
  if (field === 'route') {
    if (value === 'unknown' || value === 'schedule7Class' || value === 'noSchedule7Class'
      || value === 'enzyme' || value === 'flavouring' || value === 'specifiedFlavouringSubstance'
      || value === 'addedCaffeine') setSelection(item, { ...current, route: value });
    else throw new Error('The additive wording option is invalid.');
  } else if (field === 'class') {
    setSelection(item, { ...current, schedule7ClassName: value });
  } else if (field === 'substance') {
    const rest = { ...current };
    delete rest.substanceChoice;
    if (value === '') setSelection(item, rest);
    else if (value === 'schedule8Name' || value === 'schedule8CodeNumber') {
      setSelection(item, { ...rest, substanceChoice: value });
    } else throw new Error('The additive name or number option is invalid.');
  } else {
    const rest = { ...current };
    delete rest.flavouringWording;
    if (value === '') setSelection(item, rest);
    else if (value === 'flavouring' || value === 'flavour' || value === 'specificName') {
      setSelection(item, { ...rest, flavouringWording: value });
    } else throw new Error('The flavouring wording option is invalid.');
  }
}
const selectedDraft = computed(() => selectedProduct.value
  ? makeLabelDraft(selectedProduct.value, props.formulations, props.ingredients,
    additiveWording.value, parsedPackCopy.value.value, includeDailyIntake.value, labelClaims.value)
  : undefined);
const linkedRecipeAvailable = computed(() => props.formulations.some((item) => item.id === selectedProduct.value?.formulationId));
const sourceIngredients = computed(() => [...new Set(
  (selectedDraft.value?.declarationInputs ?? []).map((input) => input.ingredientId),
)].flatMap((id) => {
  const record = props.ingredients.find((item) => item.id === id);
  return record ? [record] : [];
}));
function issueActionLabel(action: ReviewAction): string {
  if (action.kind === 'labels') return 'Edit label';
  if (action.kind === 'section') return 'Review product';
  const records = action.kind === 'ingredient' ? props.ingredients : props.formulations;
  const record = records.find((item) => item.id === action.id);
  if (!record) return 'Review product';
  const duplicate = records.filter((item) => item.name === record.name).length > 1;
  return `Edit ${action.kind} ${record.name}${duplicate ? ` (${action.id})` : ''}`;
}
function openIssueAction(action: ReviewAction, issue: LabelIssue): void {
  if (action.kind === 'labels') selectTab(issue.area === 'claims' ? 'claims' : 'ingredients', true);
  else if (action.kind === 'ingredient' && props.ingredients.some((item) => item.id === action.id)) emit('editIngredient', action.id);
  else if (action.kind === 'recipe' && props.formulations.some((item) => item.id === action.id)) emit('editRecipe', action.id);
  else if (selectedProduct.value) emit('reviewProduct', selectedProduct.value.id);
}
const currentSignature = computed(() => selectedProduct.value
  ? labelDependencySignature(selectedProduct.value, props.formulations, props.ingredients)
  : undefined);
const dependenciesChanged = computed(() => savedLabel.value && currentSignature.value !== undefined
  && savedLabel.value.dependencySignature !== currentSignature.value);

async function saveLabel(): Promise<void> {
  const product = selectedProduct.value;
  if (!product || !currentSignature.value || labelSaving.value) return;
  labelError.value = '';
  labelStatus.value = '';
  try {
    if (!settings.value.name.trim()) throw new Error('Give the label draft a name.');
    if (labelClaims.value.some((claim) => !claim.text.trim())) {
      throw new Error('Finish or remove each claim before saving this Label draft.');
    }
    const layout = parseLabelSettings(settings.value);
    const recordedPackCopy = parseLabelPackCopy(packCopy.value);
    const snapshot = settingsSnapshot();
    const wording = additiveWording.value.map((item) => ({ ...item, selection: { ...item.selection } }));
    const changes = {
      name: settings.value.name.trim(), layout, dependencySignature: currentSignature.value,
      additiveWording: wording, packCopy: recordedPackCopy,
      claims: labelClaims.value.map((claim) => ({
        ...claim,
        ...(claim.nutrientAmount ? { nutrientAmount: { ...claim.nutrientAmount } } : {}),
        ...(claim.evidence ? { evidence: { ...claim.evidence } } : {}),
      })),
      claimCandidateDecisions: claimCandidateDecisions.value.map((decision) => ({ ...decision })),
      includeDailyIntake: includeDailyIntake.value,
    };
    labelSaving.value = true;
    if (editingLabelId.value && savedLabel.value && !savedLabelChanged.value) {
      const saved = await props.store.labels.update(editingLabelId.value, changes);
      openedLabel.value = JSON.stringify(saved);
    } else {
      const now = new Date().toISOString();
      const record: LabelDraftRecord = {
        id: props.makeId('label'), productId: product.id, createdAt: now, updatedAt: now, ...changes,
      };
      await props.store.labels.create(record);
      editingLabelId.value = record.id;
      openedLabel.value = JSON.stringify(record);
    }
    await props.refresh();
    savedSettings.value = snapshot;
    labelStatus.value = 'Label draft saved on this device. It is not a legal clearance.';
  } catch (error) {
    labelError.value = error instanceof Error ? error.message : 'The label draft could not be saved.';
  } finally {
    labelSaving.value = false;
  }
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
    if (!draft) return { error: 'The recipe needs attention before a draft can be previewed.' };
    const claimPreview = buildClaimChecks(product, false, labelClaims.value, draft.nutrition)
      .map((check) => ({
        text: check.claim.text,
        reviewMessage: `${check.official.status.toUpperCase()}: ${check.official.explanation}`,
      }));
    const layout = makeLabelLayout(
      draft,
      parseLabelSettings(settings.value),
      parseLabelPackCopy(packCopy.value),
      claimPreview,
    );
    return { layout, product };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'The draft layout could not be generated.',
    };
  }
});
const claimCandidates = computed(() => {
  const product = selectedProduct.value;
  const draft = selectedDraft.value;
  if (!product || !draft) return [];
  return findClaimCandidates(product, draft, props.formulations, props.ingredients, additiveWording.value,
    packCopy.value, labelClaims.value, Boolean(generatedLayout.value && 'layout' in generatedLayout.value),
    claimCandidateDecisions.value);
});
function openClaimCandidate(candidate: ClaimCandidate): void {
  const action = candidate.action;
  if (action.kind === 'product' && selectedProduct.value) emit('editProduct', selectedProduct.value.id);
  else if (action.kind === 'ingredient') emit('editIngredient', action.id);
  else if (action.kind === 'pack') {
    selectTab('pack');
    void nextTick(() => document.getElementById(action.fieldId)?.focus());
  } else if (action.kind === 'additives') {
    selectTab('ingredients');
    void nextTick(() => {
      if (additiveWordingDetails.value) {
        additiveWordingDetails.value.open = true;
        additiveWordingDetails.value.querySelector('summary')?.focus();
      }
    });
  } else if (action.kind === 'claims') {
    document.getElementById(`label-claim-${action.id}`)?.focus();
  }
}
const hasLayoutOverflow = computed(() => {
  const generated = generatedLayout.value;
  return generated !== undefined && 'layout' in generated
    && generated.layout.issues.some((issue) =>
      issue.code === 'LINE_OVERFLOW' || issue.code === 'TITLE_OVERFLOW' || issue.code === 'BLOCK_OVERFLOW');
});

function outputContext(): LabelOutputContext {
  const generated = generatedLayout.value;
  return {
    name: settings.value.name,
    saved: Boolean(savedLabel.value),
    unsaved: settingsDirty.value,
    dependenciesChanged: Boolean(dependenciesChanged.value),
    savedLabelChanged: savedLabelChanged.value,
    unsavedProductChanges: props.hasUnsavedProductChanges,
    additiveWording: additiveWording.value.map((item) => ({ ...item, selection: { ...item.selection } })),
    claims: labelClaims.value,
    claimCandidates: claimCandidates.value,
    preview: generated && 'layout' in generated
      ? { layout: generated.layout, settings: parseLabelSettings(settings.value) }
      : { error: generated && 'error' in generated ? generated.error : 'No product is selected.' },
  };
}

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
  window.removeEventListener('beforeunload', beforeUnload);
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
});

async function exportPdf(): Promise<void> {
  const current = generatedLayout.value;
  const draft = selectedDraft.value;
  if (!current || !('layout' in current) || exporting.value || !draft) {
    return;
  }

  exportError.value = '';
  exportStatus.value = '';
  exporting.value = true;
  try {
    const context = outputContext();
    const contextSnapshot = JSON.stringify(context);
    const result = await createLabelPdf(current.layout, {
      productVersion: `draft-${current.product.updatedAt}`,
      ruleRelease: `${RULE_RELEASE_LABEL}; no active release`,
      exportedAt: new Date().toISOString(),
      consultantNotes: makeConsultantNotes(current.product, props.formulations, props.ingredients, draft, context),
    });
    if (selectedDraft.value !== draft || selectedProductId.value !== current.product.id
      || JSON.stringify(outputContext()) !== contextSnapshot) {
      throw new Error('The product or label settings changed during export. Please try again.');
    }
    const pdfBuffer = new ArrayBuffer(result.pdfBytes.byteLength);
    new Uint8Array(pdfBuffer).set(result.pdfBytes);
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${current.product.id}-incomplete-review-copy.pdf`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    exportStatus.value = 'Incomplete Review Copy exported for reviewer feedback, not for food packaging.';
  } catch (error) {
    exportError.value = error instanceof Error ? error.message : 'The PDF draft could not be exported.';
  } finally {
    exporting.value = false;
  }
}

async function exportReport(): Promise<void> {
  const product = selectedProduct.value;
  const draft = selectedDraft.value;
  if (!product || !draft || exportingReport.value) return;
  exportError.value = '';
  exportStatus.value = '';
  exportingReport.value = true;
  try {
    const context = outputContext();
    const contextSnapshot = JSON.stringify(context);
    const bytes = await createConsultantReportPdf({
      productVersion: `draft-${product.updatedAt}`,
      ruleRelease: `${RULE_RELEASE_LABEL}; no active release`,
      exportedAt: new Date().toISOString(),
      consultantNotes: makeConsultantNotes(product, props.formulations, props.ingredients, draft, context),
    });
    if (selectedDraft.value !== draft || selectedProductId.value !== product.id
      || JSON.stringify(outputContext()) !== contextSnapshot) {
      throw new Error('The product or label settings changed during export. Please try again.');
    }
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${product.id}-review-report.pdf`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    exportStatus.value = 'Review report exported. It is not a finished label.';
  } catch (error) {
    exportError.value = error instanceof Error ? error.message : 'The review report could not be exported.';
  } finally {
    exportingReport.value = false;
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
          Review your draft ingredient list, allergen summary and nutrition panel. You can export an incomplete copy for feedback.
        </p>
      </div>
    </div>

    <section
      class="panel label-header"
      aria-label="Label draft controls"
    >
      <div class="label-selectors">
        <label class="field">
          <span>Product draft</span>
          <select
            :value="selectedProductId"
            @change="changeProduct"
          >
            <option
              v-if="!selectedProductId"
              value=""
            >No product selected</option>
            <option
              v-if="selectedProductId && !selectedProduct"
              :value="selectedProductId"
            >Missing product</option>
            <option
              v-for="product in products"
              :key="product.id"
              :value="product.id"
            >{{ product.name }}</option>
          </select>
        </label>
        <label class="field">
          <span>Saved label draft</span>
          <select
            :value="editingLabelId ?? ''"
            @change="changeLabel"
          >
            <option value="">New label draft</option>
            <option
              v-if="editingLabelId && !savedLabel"
              :value="editingLabelId"
            >Unavailable saved label</option>
            <option
              v-for="label in labels"
              :key="label.id"
              :value="label.id"
            >
              {{ label.name }} — {{ products.find((product) => product.id === label.productId)?.name || 'Product missing' }}
            </option>
          </select>
        </label>
      </div>
      <div class="label-header-actions">
        <AppButton
          type="button"
          :disabled="!selectedProduct || labelSaving"
          @click="saveLabel"
        >
          {{ editingLabelId && (!savedLabel || savedLabelChanged) ? 'Save as new label draft' : 'Save label draft' }}
        </AppButton>
        <AppButton
          type="button"
          variant="outline"
          :disabled="!selectedProduct"
          @click="newLabel"
        >
          New label draft
        </AppButton>
        <AppButton
          type="button"
          variant="outline"
          :disabled="!savedLabel"
          @click="savedLabel && openLabel(savedLabel, true)"
        >
          Duplicate label draft
        </AppButton>
        <span role="status">{{ settingsDirty ? 'Unsaved label changes' : savedLabel ? 'Label draft saved' : 'New label draft' }}</span>
      </div>
      <p
        v-if="editingLabelId && !savedLabel"
        class="notice notice-warning"
        role="status"
      >
        This saved label is no longer in the workspace. Its settings are still shown; save them as a new draft if needed.
      </p>
      <p
        v-if="savedLabelChanged"
        class="notice notice-warning"
        role="status"
      >
        The saved label was replaced or changed elsewhere. Your open settings are preserved; save them as a new draft or reopen the saved label.
      </p>
      <p
        v-if="selectedProductId && !selectedProduct"
        class="notice notice-warning"
        role="status"
      >
        The associated product is missing — REVIEW REQUIRED. This label has not been linked to another product.
      </p>
      <p
        v-if="dependenciesChanged"
        class="notice notice-warning"
        role="status"
      >
        The saved product or its dependencies have changed since this label was saved. Review the current preview and save the label again.
      </p>
      <p
        v-if="hasUnsavedProductChanges"
        class="notice notice-warning"
        role="status"
      >
        This label uses the saved product. Save the Product page changes to include them.
      </p>
      <p
        v-if="labelStatus"
        role="status"
      >
        {{ labelStatus }}
      </p>
      <p
        v-if="labelError"
        class="notice notice-warning"
        role="alert"
      >
        {{ labelError }}
      </p>
    </section>

    <div
      class="notice notice-warning"
      role="status"
    >
      <strong>Draft for consultant review, not a finished food label.</strong>
      <span>User-entered pack text can be included below, but the app does not determine whether it is required,
        complete or adequate. Other label content, nutrition rounding, names, allergen conditions, additive wording
        and layout require review. This does not certify legal compliance.</span>
    </div>

    <section
      v-if="products.length === 0"
      class="panel empty-state"
    >
      <h2>No product drafts to preview</h2>
      <p>Create a product draft or load the clearly marked illustrative demo data.</p>
      <AppButton
        type="button"
        variant="link"
        @click="emit('goProducts')"
      >
        Open Products
      </AppButton>
    </section>

    <template v-else>
      <div
        v-if="selectedProduct"
        class="label-workspace"
      >
        <section
          id="label-editor"
          class="panel"
          aria-label="Label settings"
          tabindex="-1"
        >
          <h2>Edit label</h2>
          <p>Label edits update the preview immediately. Product, recipe and ingredient information comes from their latest saved records.</p>
          <div
            class="label-tabs"
            role="tablist"
            aria-label="Label editing categories"
          >
            <button
              v-for="tab in tabs"
              :id="`label-tab-${tab.id}`"
              :key="tab.id"
              type="button"
              role="tab"
              :aria-selected="activeTab === tab.id"
              :aria-controls="`label-panel-${tab.id}`"
              :tabindex="activeTab === tab.id ? 0 : -1"
              @click="selectTab(tab.id)"
              @keydown="handleTabKey($event, tab.id)"
            >
              {{ tab.title }}
            </button>
          </div>
          <div
            v-show="activeTab === 'setup'"
            id="label-panel-setup"
            role="tabpanel"
            aria-labelledby="label-tab-setup"
            tabindex="0"
          >
            <p>The initial dimensions are an example, not a recommended or compliant size. Screen size is not a physical measurement.</p>
            <label class="field"><span>Label name</span><input
              v-model="settings.name"
              type="text"
            ></label>
            <fieldset>
              <legend>Nutrition display</legend>
              <label class="field">
                <span><input
                  v-model="includeDailyIntake"
                  type="checkbox"
                > Show optional % Daily Intake (%DI)</span>
              </label>
              <p class="field-hint">
                When supported, percentages use unrounded per-serving amounts and display to the nearest whole percent, half up.
                The Code and current FSANZ calculator guidance do not prescribe %DI rounding. Infant foods and formulated caffeinated beverages need a different panel format and remain REVIEW REQUIRED.
              </p>
            </fieldset>
            <fieldset>
              <legend>Panel dimensions (mm)</legend>
              <label class="field"><span>Width (mm)</span><input
                v-model="settings.widthMm"
                inputmode="decimal"
                type="text"
              ></label>
              <label class="field"><span>Height (mm)</span><input
                v-model="settings.heightMm"
                inputmode="decimal"
                type="text"
              ></label>
              <label class="field"><span>Orientation</span>
                <select v-model="settings.orientation"><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select>
              </label>
            </fieldset>
            <details>
              <summary>Advanced layout settings</summary>
              <fieldset>
                <legend>Margins and spacing (mm)</legend>
                <label class="field"><span>Top margin (mm)</span><input
                  v-model="settings.topMm"
                  inputmode="decimal"
                  type="text"
                ></label>
                <label class="field"><span>Right margin (mm)</span><input
                  v-model="settings.rightMm"
                  inputmode="decimal"
                  type="text"
                ></label>
                <label class="field"><span>Bottom margin (mm)</span><input
                  v-model="settings.bottomMm"
                  inputmode="decimal"
                  type="text"
                ></label>
                <label class="field"><span>Left margin (mm)</span><input
                  v-model="settings.leftMm"
                  inputmode="decimal"
                  type="text"
                ></label>
                <label class="field"><span>Spacing between blocks (mm)</span><input
                  v-model="settings.gapMm"
                  inputmode="decimal"
                  type="text"
                ></label>
              </fieldset>
              <fieldset>
                <legend>Text sizes (mm)</legend>
                <label
                  v-for="block in configurableLabelTextBlocks"
                  :key="block"
                  class="field"
                >
                  <span>{{ labelTextBlockNames[block] }} text size (mm)</span>
                  <input
                    v-model="settings.textSizes[block]"
                    inputmode="decimal"
                    type="text"
                  >
                </label>
              </fieldset>
            </details>
            <details>
              <summary>Draft nutrition information</summary>
              <section
                v-if="selectedDraft"
                class="panel"
                aria-label="Draft nutrition information"
              >
                <h2>Draft nutrition information</h2>
                <p>Servings per package: {{ selectedDraft.nutritionPanel.servingsPerPack }}</p>
                <p>Serving size: {{ selectedDraft.nutritionPanel.servingSize }}</p>
                <p><strong>REVIEW REQUIRED:</strong> {{ selectedDraft.nutritionPanel.note }}</p>
                <p class="field-hint">
                  Draft estimates use supplier information and FSANZ calculator rounding conventions.
                  Additional and claim-related nutrient rows are not yet assessed or added.
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
                      <th
                        v-if="selectedDraft.nutritionPanel.dailyIntakeStatus === 'included'"
                        scope="col"
                      >
                        % Daily Intake
                      </th>
                      <th scope="col">
                        {{ selectedDraft.nutritionPanel.unitHeading }}
                      </th>
                      <th
                        v-if="selectedDraft.nutritionPanel.combinedHeading"
                        scope="col"
                      >
                        {{ selectedDraft.nutritionPanel.combinedHeading }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in selectedDraft.nutritionPanel.rows"
                      :key="row.label"
                    >
                      <th scope="row">
                        {{ row.label }}
                      </th>
                      <td>{{ row.serving }}</td>
                      <td v-if="selectedDraft.nutritionPanel.dailyIntakeStatus === 'included'">
                        {{ row.dailyIntake }}
                      </td>
                      <td>{{ row.unitQuantity }}</td>
                      <td v-if="selectedDraft.nutritionPanel.combinedHeading">
                        {{ row.combined }}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p
                  v-if="selectedDraft.nutritionPanel.dailyIntakeStatement"
                  class="field-hint"
                >
                  {{ selectedDraft.nutritionPanel.dailyIntakeStatement }}
                </p>
                <p
                  v-if="selectedDraft.nutritionPanel.dailyIntakeIssue"
                  class="notice notice-warning"
                  role="status"
                >
                  <strong>REVIEW REQUIRED:</strong> {{ selectedDraft.nutritionPanel.dailyIntakeIssue }}
                </p>
                <p
                  v-if="selectedDraft.nutritionPanel.dailyIntakeRoundingPolicy"
                  class="field-hint"
                >
                  %DI display: {{ selectedDraft.nutritionPanel.dailyIntakeRoundingPolicy }}
                </p>
              </section>
            </details>
          </div>
          <div
            v-show="activeTab === 'ingredients'"
            id="label-panel-ingredients"
            role="tabpanel"
            aria-labelledby="label-tab-ingredients"
            tabindex="0"
          >
            <p>These details come from saved recipes and ingredients. Edit those records to change the generated content.</p>
            <div class="review-actions">
              <AppButton
                type="button"
                variant="link"
                size="sm"
                @click="emit('goIngredients')"
              >
                Open ingredients
              </AppButton>
              <AppButton
                v-if="linkedRecipeAvailable"
                type="button"
                variant="link"
                size="sm"
                @click="emit('editRecipe', selectedProduct.formulationId)"
              >
                Edit linked recipe
              </AppButton>
              <AppButton
                v-else
                type="button"
                variant="link"
                size="sm"
                @click="emit('reviewProduct', selectedProduct.id)"
              >
                Review missing recipe
              </AppButton>
            </div>
            <details v-if="sourceIngredients.length">
              <summary>Edit an ingredient</summary>
              <ul>
                <li
                  v-for="ingredient in sourceIngredients"
                  :key="ingredient.id"
                >
                  <button
                    type="button"
                    @click="emit('editIngredient', ingredient.id)"
                  >
                    {{ issueActionLabel({ kind: 'ingredient', id: ingredient.id }) }}
                  </button>
                </li>
              </ul>
            </details>
            <section
              v-if="selectedDraft"
              class="panel"
              aria-label="Draft declaration"
            >
              <h2>Draft ingredient list</h2>
              <p>{{ selectedDraft.declaration || 'Recipe information is missing.' }}</p>
              <h2>Draft allergen summary</h2>
              <p>{{ allergenSummary(selectedDraft) }}</p>
              <p v-if="selectedDraft.pendingAllergens.length">
                REVIEW REQUIRED — final-food assessment needed for {{ selectedDraft.pendingAllergens.join(', ') }}.
              </p>
              <ul>
                <li
                  v-for="warning in selectedDraft.warnings"
                  :key="warning"
                >
                  {{ warning }}
                </li>
              </ul>
            </section>
            <details
              v-if="wordingItems.length || hasUnusedWording"
              ref="additiveWordingDetails"
            >
              <summary>Additive wording</summary>
              <p>
                Choose how to show each additive in this label's ingredient list. These are draft
                suggestions, not a check that the wording or use is permitted. You can leave a choice
                undecided and return later.
              </p>
              <p
                v-if="hasUnusedWording"
                class="field-hint"
              >
                Some saved choices are not in the current recipe. They are kept in this label draft
                in case the ingredients are restored.
              </p>
              <fieldset
                v-for="item in wordingItems"
                :key="JSON.stringify([item.ingredient.id, item.source.id])"
              >
                <legend>{{ item.source.additiveName }} ({{ item.ingredient.name }})</legend>
                <p
                  v-if="item.source.codeNumber"
                  class="field-hint"
                >
                  Recorded code: {{ item.source.codeNumber }}
                </p>
                <label class="field">
                  <span>How should this additive be described?</span>
                  <select
                    :value="selectionFor(item).route"
                    @change="changeWording(item, 'route', $event)"
                  >
                    <option value="unknown">Not sure yet</option>
                    <option value="schedule7Class">Purpose and name or number (e.g. preservative (200))</option>
                    <option value="noSchedule7Class">Name only</option>
                    <option value="enzyme">As an enzyme</option>
                    <option value="flavouring">As a flavouring</option>
                    <option value="specifiedFlavouringSubstance">As a named flavouring substance</option>
                    <option value="addedCaffeine">As added caffeine</option>
                  </select>
                </label>
                <label
                  v-if="selectionFor(item).route === 'schedule7Class'"
                  class="field"
                >
                  <span>Proposed purpose for the label</span>
                  <input
                    :value="selectionFor(item).schedule7ClassName ?? ''"
                    maxlength="120"
                    placeholder="e.g. preservative"
                    @input="changeWording(item, 'class', $event)"
                  >
                </label>
                <label
                  v-if="selectionFor(item).route === 'schedule7Class'"
                  class="field"
                >
                  <span>Use the additive's name or number?</span>
                  <select
                    :value="selectionFor(item).substanceChoice ?? ''"
                    @change="changeWording(item, 'substance', $event)"
                  >
                    <option value="">Not selected</option>
                    <option value="schedule8Name">Name</option>
                    <option value="schedule8CodeNumber">Code number</option>
                  </select>
                </label>
                <label
                  v-if="selectionFor(item).route === 'flavouring'"
                  class="field"
                >
                  <span>Flavouring wording</span>
                  <select
                    :value="selectionFor(item).flavouringWording ?? ''"
                    @change="changeWording(item, 'flavour', $event)"
                  >
                    <option value="">Not selected</option>
                    <option value="flavouring">flavouring</option>
                    <option value="flavour">flavour</option>
                    <option value="specificName">Specific name or description</option>
                  </select>
                </label>
              </fieldset>
            </details>
          </div>
          <div
            v-show="activeTab === 'pack'"
            id="label-panel-pack"
            role="tabpanel"
            aria-labelledby="label-tab-pack"
            tabindex="0"
          >
            <details>
              <summary>Saved Product pack information and limitations</summary>
              <section
                v-if="selectedDraft"
                class="panel"
                aria-label="Draft pack information"
              >
                <h2>Draft pack information</h2>
                <p>Proposed name: {{ selectedDraft.pack.name }}</p>
                <p>Net contents: {{ selectedDraft.pack.netContents || 'Not supplied — REVIEW REQUIRED' }}</p>
                <p v-if="selectedDraft.pack.directionsIssue">
                  REVIEW REQUIRED — {{ selectedDraft.pack.directionsIssue }}.
                </p>
                <ul v-if="selectedDraft.pack.recordedDirections.length">
                  <li
                    v-for="direction in selectedDraft.pack.recordedDirections"
                    :key="direction.kind"
                  >
                    {{ direction.kind }} directions (recorded, review required): {{ direction.text }}
                  </li>
                </ul>
                <ul>
                  <li
                    v-for="limitation in selectedDraft.pack.limitations"
                    :key="limitation"
                  >
                    REVIEW REQUIRED — {{ limitation }}
                  </li>
                </ul>
              </section>
            </details>
            <p>
              Enter text to include on this label draft. It is reproduced as entered and is not checked for
              applicability, completeness, legal wording or safety. Review batch-specific details again for each
              production lot or print run. Examples only show the kind of information a field can hold; they may
              not apply to your food and are not added automatically.
            </p>
            <details>
              <summary>Pack copy review status</summary>
              <ul
                class="pack-copy-review"
                aria-label="Pack copy review status"
              >
                <li
                  v-for="item in packCopyReview"
                  :key="item.label"
                >
                  <strong>{{ item.label }}</strong>
                  <span>{{ item.state === 'entered' ? 'Entered' : 'Not entered' }}</span>
                  <small>{{ item.detail }}</small>
                </li>
              </ul>
            </details>
            <div class="field">
              <label for="label-supplier-name">Supplier business name</label>
              <input
                id="label-supplier-name"
                v-model="packCopy.supplierName"
                aria-describedby="label-supplier-name-help"
                maxlength="300"
                type="text"
              >
              <span
                id="label-supplier-name-help"
                class="field-hint"
              >The business name to show on the pack. Example: Example Foods Pty Ltd.</span>
            </div>
            <div class="field">
              <label for="label-supplier-address">Supplier business address</label>
              <textarea
                id="label-supplier-address"
                v-model="packCopy.supplierAddress"
                aria-describedby="label-supplier-address-help"
                maxlength="600"
                rows="2"
              />
              <span
                id="label-supplier-address-help"
                class="field-hint"
              >The business address to show on the pack. Example: 1 Example Street, Melbourne VIC 3000.</span>
            </div>
            <div class="field">
              <label for="label-lot">Lot identification text</label>
              <input
                id="label-lot"
                v-model="packCopy.lotIdentification"
                aria-describedby="label-lot-help"
                maxlength="200"
                type="text"
              >
              <span
                id="label-lot-help"
                class="field-hint"
              >A code that identifies the production lot. Example: Lot A17. No lot code is generated or checked.</span>
            </div>
            <div class="field">
              <label for="label-date">Date marking text</label>
              <input
                id="label-date"
                v-model="packCopy.dateMarking"
                aria-describedby="label-date-help"
                maxlength="200"
                type="text"
              >
              <span
                id="label-date-help"
                class="field-hint"
              >Proposed date text as it would appear on the pack. Example: Best before 12 MAY 2027. No date, date type or shelf life is calculated or checked.</span>
            </div>
            <div class="field">
              <label for="label-storage">Storage instructions</label>
              <textarea
                id="label-storage"
                v-model="packCopy.storageInstructions"
                aria-describedby="label-storage-help"
                maxlength="1000"
                rows="3"
              />
              <span
                id="label-storage-help"
                class="field-hint"
              >How to store the food, if applicable. Example: Keep refrigerated.</span>
            </div>
            <div class="field">
              <label for="label-warning">Warning or advisory text (one statement per line)</label>
              <textarea
                id="label-warning"
                v-model="packCopy.warningAdvisoryStatements"
                aria-describedby="label-warning-help"
                maxlength="2000"
                rows="4"
              />
              <span
                id="label-warning-help"
                class="field-hint"
              >Warnings or advice relevant to the food. Example: Contains caffeine. An empty field does not establish that no warning or advisory applies. No statements are generated automatically.</span>
            </div>
            <h3>Precautionary allergen information</h3>
            <p
              id="label-pal-overview"
              class="field-hint"
            >
              An allergen can accidentally get into food, for example from shared equipment. This is called
              cross-contact. A precautionary allergen statement warns about possible unintended cross-contact;
              it does not replace required allergen declarations. Use a statement only when supported by an
              assessment, and seek expert advice if unsure. The app does not assess the risk or wording.
              Leaving these fields blank does not mean there is no cross-contact risk.
            </p>
            <div class="field">
              <label for="label-pal">Precautionary allergen statement (optional)</label>
              <textarea
                id="label-pal"
                v-model="packCopy.precautionaryAllergenStatement"
                aria-describedby="label-pal-overview label-pal-help"
                maxlength="1000"
                rows="3"
              />
              <span
                id="label-pal-help"
                class="field-hint"
              >Proposed text for the pack, if supported by your assessment. Example only: May be present: peanuts.</span>
            </div>
            <div class="field">
              <label for="label-pal-basis">Basis for the precautionary allergen statement</label>
              <textarea
                id="label-pal-basis"
                v-model="packCopy.precautionaryAllergenBasis"
                aria-describedby="label-pal-overview label-pal-basis-help"
                maxlength="2000"
                rows="3"
              />
              <span
                id="label-pal-basis-help"
                class="field-hint"
              >Record why the statement is proposed, such as the relevant cross-contact assessment. Example: An assessment identified possible peanut cross-contact from shared equipment. Enter both the statement and its basis, or leave both blank. The basis is included in the review report, not on the label.</span>
            </div>
            <p
              v-if="parsedPackCopy.error"
              class="notice notice-warning"
              role="status"
            >
              {{ parsedPackCopy.error }}
            </p>
          </div>
          <div
            v-show="activeTab === 'claims'"
            id="label-panel-claims"
            role="tabpanel"
            aria-labelledby="label-tab-claims"
            tabindex="0"
          >
            <p class="notice notice-warning">
              Selected claim wording is shown exactly as entered in the review copy. It is not legal clearance.
            </p>
            <p class="field-hint">
              Claim statements and their checks belong to this Label draft. Older Product-level entries are not
              assigned automatically; copying them leaves the original entries preserved on the Product.
            </p>
            <section
              class="panel"
              aria-labelledby="possible-claims-title"
            >
              <h2 id="possible-claims-title">
                Possible claims in your label text
              </h2>
              <p class="field-hint">
                This local scan looks for a limited set of phrases. It can miss claims and does not check images,
                logos, external artwork or other marketing material. Review all wording and artwork separately.
                A match is not a classification or a legal assessment.
              </p>
              <p v-if="claimCandidates.length === 0">
                No matching phrases found. This does not mean there are no claims.
              </p>
              <ul v-else>
                <li
                  v-for="candidate in claimCandidates"
                  :key="candidate.key"
                >
                  <strong>&ldquo;{{ candidate.text }}&rdquo;</strong> — {{ candidate.location }}.
                  {{ candidate.shownInPreview ? 'Shown in the current preview.' : 'Not shown in the current preview.' }}
                  <span v-if="candidate.resolution === 'claim'">
                    REVIEW REQUIRED — selected for a claim check; this is not a legal assessment.
                  </span>
                  <span v-else-if="candidate.resolution === 'not_claim'">
                    REVIEW REQUIRED — marked not a claim by you; this is not legal clearance.
                  </span>
                  <span v-else-if="candidate.resolution === 'unsure'">
                    REVIEW REQUIRED — you marked this occurrence as unsure.
                  </span>
                  <span v-else>
                    REVIEW REQUIRED — this phrase has not been assessed as a claim.
                  </span>
                  <span v-if="candidate.suggestedClaimRuleId">
                    Suggested existing check: {{ candidate.suggestedClaimRuleId }}.
                  </span>
                  <span v-if="candidate.resolution">
                    Decision: {{ candidate.resolution === 'claim' ? 'treated as a claim' : candidate.resolution === 'not_claim' ? 'not a claim' : 'unsure' }}.
                  </span>
                  <button
                    type="button"
                    @click="openClaimCandidate(candidate)"
                  >
                    Review source
                  </button>
                  <AppButton
                    v-if="!candidate.resolution || candidate.resolution !== 'claim'"
                    type="button"
                    @click="resolveClaimCandidate(candidate, 'claim')"
                  >
                    Treat as a claim
                  </AppButton>
                  <AppButton
                    v-if="candidate.resolution !== 'not_claim'"
                    type="button"
                    @click="resolveClaimCandidate(candidate, 'not_claim')"
                  >
                    Not a claim
                  </AppButton>
                  <AppButton
                    v-if="candidate.resolution !== 'unsure'"
                    type="button"
                    @click="resolveClaimCandidate(candidate, 'unsure')"
                  >
                    I&rsquo;m unsure
                  </AppButton>
                </li>
              </ul>
            </section>
            <div
              v-if="selectedProduct?.claims?.length"
              class="field-group"
            >
              <p>
                {{ selectedProduct.claims.length }} older claim
                {{ selectedProduct.claims.length === 1 ? 'entry is' : 'entries are' }} saved on this Product,
                not on a specific Label.
              </p>
              <AppButton
                type="button"
                :disabled="legacyClaimsAlreadyOnLabel"
                @click="copyLegacyClaims"
              >
                {{ legacyClaimsAlreadyOnLabel ? 'Existing Product claims are already on this Label' : 'Add copies of existing Product claims to this Label' }}
              </AppButton>
            </div>
            <p
              v-if="selectedProduct?.claims?.length && labelClaims.length > 0"
              class="field-hint"
            >
              The original Product-level entries remain unchanged. Other Label drafts keep their own claim statements.
            </p>
            <ClaimsPanel
              v-if="selectedDraft"
              :key="labelSession"
              :product="selectedProduct"
              :nutrition="selectedDraft.nutrition"
              :claims="labelClaims"
              @update:claims="labelClaims = $event"
              @review-product="selectedProduct && emit('reviewProduct', selectedProduct.id)"
            />
          </div>
          <a
            class="preview-jump"
            href="#label-preview"
          >View preview ↓</a>
        </section>
        <aside
          id="label-preview"
          class="label-preview-column"
          tabindex="-1"
          aria-label="Label preview and review"
        >
          <a
            class="editor-jump"
            href="#label-editor"
          >← Back to editing</a>
          <p class="notice notice-warning">
            Selected claim wording is shown exactly as entered in the preview and review copy. Each claim remains REVIEW REQUIRED.
          </p>
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
                  DRAFT SVG · {{ settings.widthMm }} × {{ settings.heightMm }} MM
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
              This draft does not fit the current layout. Parts may be clipped in the review copy; adjust the layout and review it with your consultant.
            </p>
            <AppButton
              type="button"
              :disabled="exporting || !rendererStatus.startsWith('PDF renderer loaded') || !selectedDraft"
              @click="exportPdf"
            >
              {{ exporting ? 'Preparing PDF…' : 'Export Incomplete Review Copy PDF' }}
            </AppButton>
          </section>
          <section
            v-if="selectedDraft"
            class="panel"
            aria-label="Products and readiness"
          >
            <p v-if="selectedDraft.issues.length">
              {{ selectedDraft.issues.length }} draft {{ selectedDraft.issues.length === 1 ? 'item needs' : 'items need' }} attention.
            </p>
            <p v-else>
              No missing items identified by these draft checks. Other requirements still need review.
            </p>
            <details v-if="selectedDraft.issues.length">
              <summary>View missing information and review items</summary>
              <ul class="label-issue-list">
                <li
                  v-for="issue in selectedDraft.issues"
                  :key="issue.message"
                >
                  {{ issue.message }}
                  <div class="review-actions">
                    <button
                      v-for="(action, index) in issue.actions"
                      :key="index"
                      type="button"
                      @click="openIssueAction(action, issue)"
                    >
                      {{ issueActionLabel(action) }}
                    </button>
                    <button
                      v-if="!issue.actions.length"
                      type="button"
                      @click="emit('reviewProduct', selectedProduct.id)"
                    >
                      Review product
                    </button>
                  </div>
                </li>
              </ul>
            </details>
          </section>
          <AppButton
            type="button"
            :disabled="exportingReport || !rendererStatus.startsWith('PDF renderer loaded') || !selectedDraft"
            @click="exportReport"
          >
            {{ exportingReport ? 'Preparing report…' : 'Download review report' }}
          </AppButton>
          <AppButton
            v-if="selectedProduct"
            type="button"
            variant="link"
            size="sm"
            @click="emit('reviewProduct', selectedProduct.id)"
          >
            Review product checks and evidence
          </AppButton>

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
            class="notice notice-warning"
            role="status"
          >
            <strong>Incomplete Review Copy only</strong>
            <span>The PDF includes a separate review cover and report. It is not a finished label and must not be used on food packaging. {{ LABEL_EXPORT_LIMITATIONS.join(' ') }}</span>
          </div>
          <div
            v-if="exportError"
            class="notice notice-error"
            role="alert"
          >
            <strong>PDF export failed.</strong> {{ exportError }}
          </div>
        </aside>
      </div>
    </template>
  </section>
</template>

<style scoped>
.label-workspace {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: start;
}
.label-header { margin-bottom: 1rem; }
.label-selectors { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
.label-header-actions, .review-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
.label-header-actions { margin-top: 0.75rem; }
.label-tabs { display: flex; flex-wrap: wrap; gap: 0.35rem; margin: 1rem 0; border-bottom: 1px solid #dfe5df; }
.label-tabs button { padding: 0.65rem; border: 0; border-bottom: 3px solid transparent; background: transparent; cursor: pointer; font: inherit; }
.label-tabs button[aria-selected="true"] { border-color: #2e644f; font-weight: 700; }
.label-tabs button:focus-visible { outline: 2px solid #9a5d00; outline-offset: 2px; }
.label-preview-column { position: sticky; top: 1rem; max-height: calc(100vh - 2rem); overflow-y: auto; min-width: 0; }
.label-preview-column > * { margin-bottom: 0.75rem; }
.label-issue-list li { margin: 0.75rem 0; overflow-wrap: anywhere; }
.preview-jump, .editor-jump { display: none; }
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
.label-preview-panel {
  max-width: 760px;
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
@media (max-width: 850px) {
  .label-workspace, .label-selectors { grid-template-columns: minmax(0, 1fr); }
  .label-preview-column { position: static; max-height: none; overflow: visible; }
  .preview-jump, .editor-jump { display: block; padding: 0.6rem; background: white; font-weight: 600; }
  .preview-jump { position: sticky; bottom: 0; border: 1px solid #dfe5df; }
}
</style>
