import type { ProductPackDetails, ProductRecord } from '@aus-food/storage';
import { countAnswered, detectProductType } from './label-builder';

export type ProductFoodState = NonNullable<ProductRecord['foodState']>;

export interface ProductDraft {
  name: string;
  formulationId: string;
  foodState: ProductFoodState | '';
  servingSize: string;
  servingsPerPack: string;
  netQuantity: string;
  netUnit: 'g' | 'mL';
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
    servingsPerPack: '',
    netQuantity: '',
    netUnit: 'g',
  };
}

export function draftFromProduct(record: ProductRecord): ProductDraft {
  const pack = record.packDetails;
  return {
    name: record.name,
    formulationId: record.formulationId,
    foodState: record.foodState ?? '',
    servingSize: pack?.servingSize ?? '',
    servingsPerPack: pack?.servingsPerPack ?? '',
    netQuantity: pack?.netQuantity ?? '',
    netUnit: pack?.netUnit ?? 'g',
  };
}

const positiveNumber = /^\d+(\.\d+)?$/;

function isPositive(value: string): boolean {
  return positiveNumber.test(value) && Number(value) > 0;
}

// Only the filled-in pack fields are kept; blank ones stay unknown, never zero.
export function buildPackDetails(draft: ProductDraft): ProductPackDetails | undefined {
  const entries: [string, string][] = [
    ['servingSize', draft.servingSize.trim()],
    ['servingsPerPack', draft.servingsPerPack.trim()],
    ['netQuantity', draft.netQuantity.trim()],
  ];
  const pack: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (value === '') {
      continue;
    }
    if (!isPositive(value)) {
      throw new Error('Pack amounts must be positive numbers, for example 250 or 1.5.');
    }
    pack[key] = value;
  }
  if (draft.netQuantity.trim() !== '') {
    pack.netUnit = draft.netUnit;
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
    packDetails: buildPackDetails(draft),
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
  const type = profile === undefined ? '' : detectProductType(profile);
  let typeDone = false;
  if (profile !== undefined && type !== '') {
    const { answered, total } = countAnswered(profile, type);
    typeDone = type === 'other' || answered === total;
  }
  const packDone = [draft.servingSize, draft.servingsPerPack, draft.netQuantity].every(isPositive);
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
