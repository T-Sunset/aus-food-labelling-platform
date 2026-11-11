import { expandFormulation } from '@aus-food/engine';
import type { FormulationRecord, ProductPackDetails, ProductRecord } from '@aus-food/storage';
import { countAnswered, detectProductType } from './label-builder';

export type ProductFoodState = NonNullable<ProductRecord['foodState']>;

export interface ProductDraft {
  name: string;
  formulationId: string;
  foodState: ProductFoodState | '';
  servingSize: string;
  servingUnit: 'g' | 'mL' | '';
  servingsPerPack: string;
  netQuantity: string;
  netUnit: 'g' | 'mL' | '';
  nutritionFoodForm: 'solid' | 'liquid' | '';
  nutritionBasisConfirmed: boolean;
  nutritionDensity: string;
  nutritionDensityReference: string;
  nutritionDensityDate: string;
}

export const foodStateOptions: { value: ProductFoodState; label: string }[] = [
  { value: 'asSold', label: 'As sold (most products: the food as the customer receives it)' },
  { value: 'asPrepared', label: 'As prepared (the customer adds water, milk or similar)' },
  { value: 'asReconstituted', label: 'As reconstituted (a powder or concentrate mixed up)' },
  { value: 'asDrained', label: 'As drained (liquid poured off before eating)' },
  { value: 'asProcessed', label: 'As processed (cooked or otherwise processed)' },
  { value: 'asAdded', label: 'As added (as an ingredient in another food)' },
];

export function emptyProductDraft(): ProductDraft {
  return {
    name: '',
    formulationId: '',
    foodState: '',
    servingSize: '',
    servingUnit: '',
    servingsPerPack: '',
    netQuantity: '',
    netUnit: '',
    nutritionFoodForm: '',
    nutritionBasisConfirmed: false,
    nutritionDensity: '',
    nutritionDensityReference: '',
    nutritionDensityDate: '',
  };
}

export function draftFromProduct(record: ProductRecord): ProductDraft {
  const pack = record.packDetails;
  return {
    name: record.name,
    formulationId: record.formulationId,
    foodState: record.foodState ?? '',
    servingSize: pack?.servingSize ?? '',
    servingUnit: pack?.servingUnit ?? '',
    servingsPerPack: pack?.servingsPerPack ?? '',
    netQuantity: pack?.netQuantity ?? '',
    netUnit: pack?.netUnit ?? '',
    nutritionFoodForm: pack?.nutritionFoodForm ?? '',
    nutritionBasisConfirmed: Boolean(pack?.nutritionRecipeSignature),
    nutritionDensity: pack?.nutritionDensity?.gramsPerMillilitre ?? '',
    nutritionDensityReference: pack?.nutritionDensity?.evidenceReference ?? '',
    nutritionDensityDate: pack?.nutritionDensity?.sourceDate ?? '',
  };
}

export function nutritionRecipeSignature(id: string, formulations: readonly FormulationRecord[]): string {
  const expanded = expandFormulation(id, { value: '100', unit: 'g' }, formulations);
  return JSON.stringify({ id, ingredients: expanded });
}

const positiveNumber = /^\d+(\.\d+)?$/;

function isPositive(value: string): boolean {
  return positiveNumber.test(value) && Number.isFinite(Number(value)) && Number(value) > 0;
}

// Only the filled-in pack fields are kept; blank ones stay unknown, never zero.
export function buildPackDetails(draft: ProductDraft, signature?: string): ProductPackDetails | undefined {
  const entries: [string, string][] = [
    ['servingSize', draft.servingSize.trim()],
    ['servingsPerPack', draft.servingsPerPack.trim()],
    ['netQuantity', draft.netQuantity.trim()],
  ];
  const pack: Record<string, string | ProductPackDetails['nutritionDensity']> = {};
  for (const [key, value] of entries) {
    if (value === '') {
      continue;
    }
    if (!isPositive(value)) {
      throw new Error('Pack amounts must be positive numbers, for example 250 or 1.5.');
    }
    pack[key] = value;
  }
  if (draft.netUnit !== '') {
    pack.netUnit = draft.netUnit;
  }
  if (draft.servingUnit !== '') {
    pack.servingUnit = draft.servingUnit;
  }
  if (draft.nutritionFoodForm !== '') {
    pack.nutritionFoodForm = draft.nutritionFoodForm;
  }
  if (draft.nutritionBasisConfirmed) {
    if (!signature) throw new Error('Save a valid recipe before confirming the nutrition basis.');
    pack.nutritionRecipeSignature = signature;
  }
  const density = draft.nutritionDensity.trim();
  const reference = draft.nutritionDensityReference.trim();
  const date = draft.nutritionDensityDate;
  if (density || reference || date) {
    if (!isPositive(density) || !reference || !date) {
      throw new Error('Density needs a positive value, evidence reference and date.');
    }
    pack.nutritionDensity = { gramsPerMillilitre: density, evidenceReference: reference, sourceDate: date };
  }
  return Object.keys(pack).length === 0 ? undefined : (pack as ProductPackDetails);
}

export interface ProductChanges {
  name: string;
  formulationId: string;
  foodState: ProductFoodState;
  packDetails: ProductPackDetails | undefined;
}

// Throws a plain-English Error when the basics are missing.
export function buildProductChanges(
  draft: ProductDraft,
  recipeIds: readonly string[],
  signature?: string,
): ProductChanges {
  const name = draft.name.trim();
  if (!name) {
    throw new Error('Give the product a name.');
  }
  if (!recipeIds.includes(draft.formulationId)) {
    throw new Error('Choose the recipe this product is made from.');
  }
  if (draft.foodState === '') {
    throw new Error('Choose the state the food is in when it is sold or eaten.');
  }
  return {
    name,
    formulationId: draft.formulationId,
    foodState: draft.foodState,
    packDetails: buildPackDetails(draft, signature),
  };
}

export function newProductRecord(
  changes: ProductChanges,
  id: string,
  now: string,
): ProductRecord {
  return {
    id,
    name: changes.name,
    recordType: 'product',
    formulationId: changes.formulationId,
    foodState: changes.foodState,
    ...(changes.packDetails === undefined ? {} : { packDetails: changes.packDetails }),
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
}

export interface ProductStepStatus {
  done: boolean;
  text: string;
}

export type ProductStepId = 'about' | 'type' | 'pack' | 'additives' | 'claims';

export function productStepStatuses(
  draft: ProductDraft,
  saved: ProductRecord | undefined,
): Record<ProductStepId, ProductStepStatus> {
  const aboutDone = draft.name.trim() !== '' && draft.formulationId !== '' && draft.foodState !== '';
  const profile = saved?.classificationProfile;
  const type = saved?.builderProductType ?? (profile === undefined ? '' : detectProductType(profile));
  let typeDone = false;
  if (type === 'other') {
    typeDone = true;
  } else if (profile !== undefined && type !== '') {
    const { answered, total } = countAnswered(profile, type);
    typeDone = answered === total;
  }
  const packDone = draft.servingUnit !== '' && draft.netUnit !== ''
    && [draft.servingSize, draft.servingsPerPack, draft.netQuantity].every(isPositive);
  const additivesDone = saved?.additiveNameInputs !== undefined;
  const claimsDone = saved?.claims !== undefined;
  return {
    about: { done: aboutDone, text: aboutDone ? 'Answered' : 'Still needed' },
    type: { done: typeDone, text: typeDone ? 'Answered' : 'Still needed' },
    pack: { done: packDone, text: packDone ? 'Answered' : 'Still needed' },
    additives: { done: additivesDone, text: additivesDone ? 'Answered' : 'Still needed' },
    claims: { done: claimsDone, text: claimsDone ? 'Answered' : 'Optional' },
  };
}
