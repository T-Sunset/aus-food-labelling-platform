import {
  labelPackCopyMaxLengths,
  labelTextBlocks,
  type LabelDraftRecord,
  type LabelPackCopy,
  type LabelTextBlock,
} from '@aus-food/storage';

type LabelLayout = LabelDraftRecord['layout'];

export interface LabelSettingsForm {
  name: string;
  widthMm: string;
  heightMm: string;
  orientation: 'portrait' | 'landscape';
  topMm: string;
  rightMm: string;
  bottomMm: string;
  leftMm: string;
  gapMm: string;
  textSizes: Record<LabelTextBlock, string>;
}

export type LabelPackCopyForm = Record<keyof LabelPackCopy, string>;

export interface LabelPackCopyReviewItem {
  readonly label: string;
  readonly state: 'entered' | 'not_entered';
  readonly detail: string;
}

const packCopyReviewFields: readonly (readonly [keyof LabelPackCopy, string])[] = [
  ['supplierName', 'Supplier business name'],
  ['supplierAddress', 'Supplier business address'],
  ['lotIdentification', 'Lot identification'],
  ['dateMarking', 'Date marking'],
  ['storageInstructions', 'Storage instructions'],
  ['warningAdvisoryStatements', 'Warning or advisory text'],
  ['precautionaryAllergenStatement', 'Precautionary allergen statement'],
];

export const initialLabelLayout: LabelLayout = {
  widthMm: 100, heightMm: 150, orientation: 'portrait',
  margins: { topMm: 6, rightMm: 6, bottomMm: 6, leftMm: 6 }, gapMm: 2,
  textSizes: {
    foodName: 3, netQuantity: 2.5, ingredients: 2.5, allergenDeclaration: 2.5,
    preparationDirections: 2.5, nutritionInformation: 2.2, advisoryStatements: 2.5,
  },
};

export const labelTextBlockNames: Record<LabelTextBlock, string> = {
  foodName: 'Product name',
  netQuantity: 'Quantity',
  ingredients: 'Ingredients',
  allergenDeclaration: 'Allergen summary',
  preparationDirections: 'Consumer directions',
  nutritionInformation: 'Nutrition information',
  advisoryStatements: 'Additional pack text',
};

export const configurableLabelTextBlocks = labelTextBlocks.filter((block) => block !== 'allergenDeclaration');

export function labelPackCopyForm(packCopy?: LabelPackCopy): LabelPackCopyForm {
  return {
    supplierName: packCopy?.supplierName ?? '',
    supplierAddress: packCopy?.supplierAddress ?? '',
    lotIdentification: packCopy?.lotIdentification ?? '',
    dateMarking: packCopy?.dateMarking ?? '',
    storageInstructions: packCopy?.storageInstructions ?? '',
    warningAdvisoryStatements: packCopy?.warningAdvisoryStatements ?? '',
    precautionaryAllergenStatement: packCopy?.precautionaryAllergenStatement ?? '',
    precautionaryAllergenBasis: packCopy?.precautionaryAllergenBasis ?? '',
  };
}

export function parseLabelPackCopy(form: LabelPackCopyForm): LabelPackCopy | undefined {
  const packCopy: Partial<Record<keyof LabelPackCopy, string>> = {};
  for (const [field, maximum] of Object.entries(labelPackCopyMaxLengths)) {
    const key = field as keyof LabelPackCopy;
    const value = form[key].trim();
    if (value.length > maximum) {
      throw new Error(`${field} must be ${maximum} characters or fewer.`);
    }
    if (value) packCopy[key] = value;
  }
  if (Boolean(packCopy.precautionaryAllergenStatement) !== Boolean(packCopy.precautionaryAllergenBasis)) {
    throw new Error('Enter both a precautionary allergen statement and its basis, or leave both blank.');
  }
  return Object.keys(packCopy).length ? packCopy : undefined;
}

export function labelPackCopyReview(form: LabelPackCopyForm): readonly LabelPackCopyReviewItem[] {
  return packCopyReviewFields.map(([key, label]) => {
    const entered = Boolean(form[key].trim());
    return {
      label,
      state: entered ? 'entered' : 'not_entered',
      detail: entered
        ? 'Recorded as label copy; applicability and adequacy remain unassessed.'
        : 'Not entered; this does not establish that the field is unnecessary.',
    };
  });
}

export function labelSettingsForm(name: string, layout: LabelLayout = initialLabelLayout): LabelSettingsForm {
  return {
    name,
    widthMm: String(layout.widthMm), heightMm: String(layout.heightMm), orientation: layout.orientation,
    topMm: String(layout.margins.topMm), rightMm: String(layout.margins.rightMm),
    bottomMm: String(layout.margins.bottomMm), leftMm: String(layout.margins.leftMm),
    gapMm: String(layout.gapMm),
    textSizes: {
      foodName: String(layout.textSizes.foodName),
      netQuantity: String(layout.textSizes.netQuantity),
      ingredients: String(layout.textSizes.ingredients),
      allergenDeclaration: String(layout.textSizes.ingredients),
      preparationDirections: String(layout.textSizes.preparationDirections),
      nutritionInformation: String(layout.textSizes.nutritionInformation),
      advisoryStatements: String(layout.textSizes.advisoryStatements),
    },
  };
}

export function parseLabelSettings(form: LabelSettingsForm): LabelLayout {
  const number = (text: string, label: string, allowZero = false): number => {
    if (!/^\d+(?:\.\d+)?$/u.test(text.trim())) throw new Error(`${label} must be a number in millimetres.`);
    const value = Number(text);
    if (!Number.isFinite(value) || (allowZero ? value < 0 : value <= 0)) {
      throw new Error(`${label} must be ${allowZero ? 'zero or greater' : 'greater than zero'}.`);
    }
    return value;
  };
  const widthMm = number(form.widthMm, 'Width');
  const heightMm = number(form.heightMm, 'Height');
  if (form.orientation === 'portrait' && widthMm > heightMm) throw new Error('Portrait width cannot be greater than height.');
  if (form.orientation === 'landscape' && heightMm > widthMm) throw new Error('Landscape height cannot be greater than width.');
  const margins = {
    topMm: number(form.topMm, 'Top margin', true), rightMm: number(form.rightMm, 'Right margin', true),
    bottomMm: number(form.bottomMm, 'Bottom margin', true), leftMm: number(form.leftMm, 'Left margin', true),
  };
  if (margins.leftMm + margins.rightMm >= widthMm || margins.topMm + margins.bottomMm >= heightMm) {
    throw new Error('Margins must leave room for label content.');
  }
  const textSizes = { ...initialLabelLayout.textSizes };
  for (const key of configurableLabelTextBlocks) {
    textSizes[key] = number(form.textSizes[key], `${labelTextBlockNames[key]} text size`);
  }
  textSizes.allergenDeclaration = textSizes.ingredients;
  return { widthMm, heightMm, orientation: form.orientation, margins, gapMm: number(form.gapMm, 'Spacing', true), textSizes };
}
