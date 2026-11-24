import { estimatedLineWidthMm, findBoldPhraseRanges, layoutLabel, type LabelLayoutResult } from '@aus-food/label';
import type { LabelDraftRecord, LabelPackCopy } from '@aus-food/storage';
import type { LabelDraft } from './label-draft';

export interface LabelClaimPreview {
  readonly text: string;
  readonly reviewMessage: string;
}

function wrapText(
  text: string,
  widthMm: number,
  fontSizeMm: number,
  protectedPhrases: readonly string[] = [],
): string[] {
  const words = [...text.matchAll(/\S+/gu)].map((match) => ({
    text: match[0],
    start: match.index,
    end: match.index + match[0].length,
  }));
  const protectedEnds = new Map<number, number>();
  for (const range of findBoldPhraseRanges(text, protectedPhrases)) {
    const first = words.findIndex((word) => word.end > range.start);
    if (first < 0) continue;
    let end = first + 1;
    while (end < words.length && words[end]!.start < range.end) end += 1;
    protectedEnds.set(first, Math.max(protectedEnds.get(first) ?? first + 1, end));
  }
  const units: string[] = [];
  for (let index = 0; index < words.length;) {
    let end = protectedEnds.get(index) ?? index + 1;
    for (const [start, stop] of protectedEnds) {
      if (start >= index && start < end) end = Math.max(end, stop);
    }
    units.push(words.slice(index, end).map((word) => word.text).join(' '));
    index = end;
  }
  const lines: string[] = [];
  let line = '';
  for (const unit of units) {
    if (line && estimatedLineWidthMm(`${line} ${unit}`, fontSizeMm) > widthMm) {
      lines.push(line);
      line = unit;
    } else {
      line = line ? `${line} ${unit}` : unit;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function allergenSummary(draft: LabelDraft): string {
  if (draft.allergens.length && draft.allergenDeclarationReady) {
    return `Contains ${draft.allergens.join(', ')}`;
  }
  if (draft.allergens.length) {
    return `Known allergen candidates: ${draft.allergens.join(', ')}. The Contains summary is withheld because evidence or conditions remain unresolved.`;
  }
  if (draft.allergenDeclarationReady) {
    return 'No allergen names were found in the confirmed records; this does not establish absence beyond those records.';
  }
  return 'No allergen summary is available; missing evidence or conditions do not establish absence.';
}

function wrapPackText(text: string, widthMm: number, fontSizeMm: number): string[] {
  return text.split(/\r?\n/u).flatMap((line) => wrapText(line, widthMm, fontSizeMm));
}

export function makeLabelLayout(
  draft: LabelDraft,
  settings: LabelDraftRecord['layout'],
  packCopy?: LabelPackCopy,
  claims: readonly LabelClaimPreview[] = [],
): LabelLayoutResult {
  const contentWidth = settings.widthMm - settings.margins.leftMm - settings.margins.rightMm;
  const sizes = settings.textSizes;
  const claimLines = claims
    .filter((claim, index) => claim.text.trim()
      && claims.findIndex((candidate) => candidate.text === claim.text) === index)
    .flatMap((claim) => [
    ...wrapText(claim.text, contentWidth, sizes.advisoryStatements),
    ...wrapText(`REVIEW REQUIRED: ${claim.reviewMessage}`, contentWidth, sizes.advisoryStatements),
    ]);
  return layoutLabel({
    ...settings,
    blocks: [
      {
        id: 'demo-food-name', kind: 'foodName', title: 'Food name', hideTitle: true,
        lines: wrapText(draft.pack.name, contentWidth, sizes.foodName),
        fontSizeMm: sizes.foodName, minimumSizeStatus: 'review_required',
      },
      ...(draft.pack.netContents ? [{
        id: 'net-contents', kind: 'netQuantity' as const, title: 'Quantity', hideTitle: true,
        lines: wrapText(draft.pack.netContents, contentWidth, sizes.netQuantity),
        fontSizeMm: sizes.netQuantity, minimumSizeStatus: 'review_required' as const,
      }] : []),
      ...(draft.declaration ? [{
        id: 'ingredients', kind: 'ingredients' as const, title: 'Ingredients',
        lines: wrapText(draft.declaration, contentWidth, sizes.ingredients, draft.allergenDeclarationTerms),
        boldPhrases: draft.allergenDeclarationTerms,
        fontSizeMm: sizes.ingredients, minimumSizeStatus: 'review_required' as const,
      }] : []),
      ...(draft.allergens.length && draft.allergenDeclarationReady && draft.declaration ? [{
        id: 'allergens', kind: 'allergenDeclaration' as const, title: 'Allergen summary', hideTitle: true,
        lines: wrapText(allergenSummary(draft), contentWidth, sizes.ingredients),
        fontSizeMm: sizes.ingredients, boldLines: true, minimumSizeStatus: 'review_required' as const,
      }] : []),
      ...(draft.pack.previewDirections.length ? [{
        id: 'consumer-directions', kind: 'preparationDirections' as const, title: 'Consumer directions', hideTitle: true,
        lines: draft.pack.previewDirections.flatMap((direction) => wrapText(direction.text, contentWidth, sizes.preparationDirections)),
        fontSizeMm: sizes.preparationDirections, minimumSizeStatus: 'review_required' as const,
      }] : []),
      ...((packCopy?.supplierName || packCopy?.supplierAddress) ? [{
        id: 'supplier-details', kind: 'supplierDetails' as const, title: 'Supplier details',
        lines: [packCopy.supplierName, packCopy.supplierAddress]
          .filter((line): line is string => Boolean(line?.trim()))
          .flatMap((line) => wrapPackText(line, contentWidth, sizes.advisoryStatements)),
        fontSizeMm: sizes.advisoryStatements, minimumSizeStatus: 'review_required' as const,
      }] : []),
      ...(packCopy?.lotIdentification?.trim() ? [{
        id: 'lot-identification', kind: 'lotIdentification' as const, title: 'Lot identification',
        lines: wrapPackText(packCopy.lotIdentification, contentWidth, sizes.advisoryStatements),
        fontSizeMm: sizes.advisoryStatements, minimumSizeStatus: 'review_required' as const,
      }] : []),
      ...(packCopy?.dateMarking?.trim() ? [{
        id: 'date-marking', kind: 'dateMarking' as const, title: 'Date marking',
        lines: wrapPackText(packCopy.dateMarking, contentWidth, sizes.advisoryStatements),
        fontSizeMm: sizes.advisoryStatements, minimumSizeStatus: 'review_required' as const,
      }] : []),
      ...(packCopy?.storageInstructions?.trim() ? [{
        id: 'storage-directions', kind: 'storageDirections' as const, title: 'Storage instructions',
        lines: wrapPackText(packCopy.storageInstructions, contentWidth, sizes.advisoryStatements),
        fontSizeMm: sizes.advisoryStatements, minimumSizeStatus: 'review_required' as const,
      }] : []),
      ...(packCopy?.warningAdvisoryStatements?.trim() ? [{
        id: 'warnings', kind: 'warnings' as const, title: 'Warning and advisory statements',
        lines: wrapPackText(packCopy.warningAdvisoryStatements, contentWidth, sizes.advisoryStatements),
        fontSizeMm: sizes.advisoryStatements, minimumSizeStatus: 'review_required' as const,
      }] : []),
      ...(packCopy?.precautionaryAllergenStatement?.trim() && packCopy.precautionaryAllergenBasis?.trim() ? [{
        id: 'precautionary-allergen-statement', kind: 'advisoryStatements' as const,
        title: 'Precautionary allergen statement', hideTitle: true,
        lines: wrapPackText(packCopy.precautionaryAllergenStatement, contentWidth, sizes.advisoryStatements),
        fontSizeMm: sizes.advisoryStatements, minimumSizeStatus: 'review_required' as const,
      }] : []),
      ...(claimLines.length ? [{
        id: 'claims', kind: 'claims' as const, title: 'Claims',
        lines: [
          'REVIEW REQUIRED: Claim wording is shown exactly as entered and is not legal clearance.',
          ...claimLines,
        ],
        fontSizeMm: sizes.advisoryStatements, minimumSizeStatus: 'review_required' as const,
      }] : []),
      {
        id: 'nutrition', kind: 'nutritionInformation', title: 'NUTRITION INFORMATION',
        lines: [
          ...wrapText(`Servings per package: ${draft.nutritionPanel.servingsPerPack}`, contentWidth, sizes.nutritionInformation),
          ...wrapText(`Serving size: ${draft.nutritionPanel.servingSize}`, contentWidth, sizes.nutritionInformation),
          ...(draft.nutritionPanel.basis === 'drained' ? ['Drained food'] : []),
          ...(draft.nutritionPanel.basis === 'reconstituted' ? ['Reconstituted food'] : []),
          ...(draft.nutritionPanel.combinedDescription
            ? wrapText(draft.nutritionPanel.combinedDescription, contentWidth, sizes.nutritionInformation) : []),
          ...(draft.nutritionPanel.dailyIntakeStatement
            ? wrapText(draft.nutritionPanel.dailyIntakeStatement, contentWidth, sizes.nutritionInformation) : []),
          ...(draft.nutritionPanel.dailyIntakeIssue
            ? wrapText(`REVIEW REQUIRED: ${draft.nutritionPanel.dailyIntakeIssue}`, contentWidth, sizes.nutritionInformation) : []),
        ],
        table: {
          rows: draft.nutritionPanel.dailyIntakeStatus === 'included'
            ? draft.nutritionPanel.combinedHeading
              ? [
                ['Average quantity', 'Per serving', '%DI', draft.nutritionPanel.unitHeading.replace('Average per', 'Per'), draft.nutritionPanel.combinedHeading],
                ...draft.nutritionPanel.rows.map((row): [string, string, string, string, string] =>
                  [row.label, row.serving, row.dailyIntake ?? 'Not available', row.unitQuantity, row.combined ?? 'Not available']),
              ]
              : [
                ['Average quantity', 'Per serving', '%DI', draft.nutritionPanel.unitHeading.replace('Average per', 'Per')],
                ...draft.nutritionPanel.rows.map((row): [string, string, string, string] =>
                  [row.label, row.serving, row.dailyIntake ?? 'Not available', row.unitQuantity]),
              ]
            : draft.nutritionPanel.combinedHeading
              ? [
                ['Average quantity', 'Per serving', draft.nutritionPanel.unitHeading.replace('Average per', 'Per'), draft.nutritionPanel.combinedHeading],
                ...draft.nutritionPanel.rows.map((row): [string, string, string, string] =>
                  [row.label, row.serving, row.unitQuantity, row.combined ?? 'Not available']),
              ]
              : [
                ['Average quantity', 'Per serving', draft.nutritionPanel.unitHeading.replace('Average per', 'Per')],
                ...draft.nutritionPanel.rows.map((row): [string, string, string] =>
                  [row.label, row.serving, row.unitQuantity]),
              ],
        },
        fontSizeMm: sizes.nutritionInformation, minimumSizeStatus: 'review_required',
      },
    ],
    requiredBlocks: [],
  });
}
