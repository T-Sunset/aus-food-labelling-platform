export type LabelBlockKind =
  | 'foodName'
  | 'netQuantity'
  | 'supplierDetails'
  | 'lotIdentification'
  | 'dateMarking'
  | 'storageDirections'
  | 'preparationDirections'
  | 'ingredients'
  | 'allergenDeclaration'
  | 'warnings'
  | 'advisoryStatements'
  | 'nutritionInformation'
  | 'claims';

export interface LabelMargins {
  readonly topMm: number;
  readonly rightMm: number;
  readonly bottomMm: number;
  readonly leftMm: number;
}

export interface LabelBlockInput {
  readonly id: string;
  readonly kind: LabelBlockKind;
  readonly title: string;
  readonly hideTitle?: boolean;
  readonly lines: readonly string[];
  readonly fontSizeMm: number;
  readonly boldLines?: boolean;
  readonly boldPhrases?: readonly string[];
  readonly table?: {
    readonly rows: readonly (
      | readonly [string, string, string]
      | readonly [string, string, string, string]
      | readonly [string, string, string, string, string]
    )[];
  };
  readonly minimumFontSizeMm?: number;
  readonly minimumSizeStatus: 'approved' | 'review_required';
  readonly minimumSizeSource?: {
    readonly label: string;
    readonly url: string;
  };
}

export interface LabelLayoutInput {
  readonly widthMm: number;
  readonly heightMm: number;
  readonly orientation: 'portrait' | 'landscape';
  readonly margins: LabelMargins;
  readonly blocks: readonly LabelBlockInput[];
  readonly requiredBlocks: readonly LabelBlockKind[];
  readonly gapMm?: number;
}

export type LabelLayoutIssue =
  | {
      readonly code: 'MISSING_REQUIRED_BLOCK';
      readonly blockKind: LabelBlockKind;
      readonly message: string;
    }
  | {
      readonly code: 'TEXT_BELOW_MINIMUM';
      readonly blockId: string;
      readonly message: string;
    }
  | {
      readonly code: 'MINIMUM_SIZE_REVIEW_REQUIRED';
      readonly blockId: string;
      readonly message: string;
    }
  | {
      readonly code: 'MINIMUM_SIZE_SOURCE_MISSING';
      readonly blockId: string;
      readonly message: string;
    }
  | {
      readonly code: 'BLOCK_OVERFLOW';
      readonly blockId: string;
      readonly message: string;
    }
  | {
      readonly code: 'LINE_OVERFLOW';
      readonly blockId: string;
      readonly lineIndex: number;
      readonly message: string;
    }
  | {
      readonly code: 'TITLE_OVERFLOW';
      readonly blockId: string;
      readonly message: string;
    }
  | {
      readonly code: 'DUPLICATE_BLOCK';
      readonly blockId: string;
      readonly message: string;
    };

export interface LabelLayoutResult {
  readonly status: 'ready_for_review' | 'review_required';
  readonly widthMm: number;
  readonly heightMm: number;
  readonly orientation: 'portrait' | 'landscape';
  readonly svg: string;
  readonly issues: readonly LabelLayoutIssue[];
  readonly nonCertificationStatement: 'This label draft assists review and does not certify legal compliance.';
}

const lineHeightRatio = 1.2;
const labelBlockKinds = new Set<LabelBlockKind>([
  'foodName',
  'netQuantity',
  'supplierDetails',
  'lotIdentification',
  'dateMarking',
  'storageDirections',
  'preparationDirections',
  'ingredients',
  'allergenDeclaration',
  'warnings',
  'advisoryStatements',
  'nutritionInformation',
  'claims',
]);

function assertPositiveFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number`);
  }
}

function assertNonNegativeFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative finite number`);
  }
}

function formatMillimetres(value: number): string {
  return Number(value.toFixed(4)).toString();
}

function formatPhysicalDimension(value: number): string {
  const [coefficient, exponent] = value.toString().split('e');
  if (exponent === undefined) return coefficient!;
  const digits = coefficient!.replace('.', '');
  const decimalPosition = (coefficient!.indexOf('.') < 0 ? coefficient!.length : coefficient!.indexOf('.')) + Number(exponent);
  if (decimalPosition <= 0) return `0.${'0'.repeat(-decimalPosition)}${digits}`;
  if (decimalPosition >= digits.length) return `${digits}${'0'.repeat(decimalPosition - digits.length)}`;
  return `${digits.slice(0, decimalPosition)}.${digits.slice(decimalPosition)}`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export interface LabelTextRange {
  readonly start: number;
  readonly end: number;
}

function isWordCharacter(character: string | undefined): boolean {
  return character !== undefined && /[\p{L}\p{N}]/u.test(character);
}

export function findBoldPhraseRanges(text: string, phrases: readonly string[]): readonly LabelTextRange[] {
  const lowered = text.toLowerCase();
  const ranges: LabelTextRange[] = [];
  for (const phrase of new Set(phrases.map((item) => item.trim()).filter(Boolean))) {
    const search = phrase.toLowerCase();
    let offset = 0;
    while (offset < lowered.length) {
      const start = lowered.indexOf(search, offset);
      if (start < 0) break;
      const end = start + search.length;
      if (!isWordCharacter(text[start - 1]) && !isWordCharacter(text[end])) {
        ranges.push({ start, end });
      }
      offset = end;
    }
  }
  ranges.sort((left, right) => left.start - right.start || right.end - left.end);
  return ranges.reduce<LabelTextRange[]>((merged, range) => {
    const previous = merged.at(-1);
    if (previous && range.start <= previous.end) {
      merged[merged.length - 1] = { start: previous.start, end: Math.max(previous.end, range.end) };
    } else {
      merged.push(range);
    }
    return merged;
  }, []);
}

function renderBoldPhrases(text: string, phrases: readonly string[]): string {
  const ranges = findBoldPhraseRanges(text, phrases);
  if (ranges.length === 0) return escapeXml(text);
  let cursor = 0;
  return ranges.map((range) => {
    const before = escapeXml(text.slice(cursor, range.start));
    const bold = `<tspan font-weight="700">${escapeXml(text.slice(range.start, range.end))}</tspan>`;
    cursor = range.end;
    return before + bold;
  }).join('') + escapeXml(text.slice(cursor));
}

export function estimatedLineWidthMm(text: string, fontSizeMm: number): number {
  const emWidth = [...text].reduce((total, character) => {
    if (/\p{Mark}/u.test(character)) {
      return total;
    }
    if (
      /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}/u.test(character)
    ) {
      return total + 1;
    }
    if (/[MW@#%&]/u.test(character)) {
      return total + 0.9;
    }
    if (/[ilI.,'`:;!|]/u.test(character)) {
      return total + 0.35;
    }
    if (/\s/u.test(character)) {
      return total + 0.35;
    }
    return total + 0.65;
  }, 0);
  return emWidth * fontSizeMm;
}

function validateInput(input: LabelLayoutInput): void {
  assertPositiveFinite(input.widthMm, 'widthMm');
  assertPositiveFinite(input.heightMm, 'heightMm');
  if (input.orientation === 'portrait' && input.widthMm > input.heightMm) {
    throw new RangeError('Portrait labels must not be wider than they are high');
  }
  if (input.orientation === 'landscape' && input.heightMm > input.widthMm) {
    throw new RangeError('Landscape labels must not be higher than they are wide');
  }
  for (const [name, value] of Object.entries(input.margins)) {
    assertNonNegativeFinite(value, `margins.${name}`);
  }
  assertNonNegativeFinite(input.gapMm ?? 0, 'gapMm');
  if (
    input.margins.leftMm + input.margins.rightMm >= input.widthMm ||
    input.margins.topMm + input.margins.bottomMm >= input.heightMm
  ) {
    throw new RangeError('Label margins must leave a positive content area');
  }
  if (input.requiredBlocks.some((kind) => !labelBlockKinds.has(kind))) {
    throw new RangeError('Required content block list contains an unsupported kind');
  }
  const ids = new Set<string>();
  for (const block of input.blocks) {
    if (!labelBlockKinds.has(block.kind)) {
      throw new RangeError(`Label block "${block.id}" has an unsupported content kind`);
    }
    if (!['approved', 'review_required'].includes(block.minimumSizeStatus)) {
      throw new RangeError(`Label block "${block.id}" has an unsupported minimum-size status`);
    }
    if (!block.id.trim() || ids.has(block.id)) {
      throw new RangeError(`Label block id "${block.id}" must be non-empty and unique`);
    }
    ids.add(block.id);
    if (!block.title.trim()) {
      throw new RangeError(`Label block "${block.id}" must have a title`);
    }
    if (!Array.isArray(block.lines) || block.lines.some((line) => typeof line !== 'string')) {
      throw new RangeError(`Label block "${block.id}" lines must be a list of strings`);
    }
    if (block.boldPhrases !== undefined && (!Array.isArray(block.boldPhrases)
      || block.boldPhrases.some((phrase) => typeof phrase !== 'string' || !phrase.trim()))) {
      throw new RangeError(`Label block "${block.id}" bold phrases must be non-empty text`);
    }
    if (block.table !== undefined && (!Array.isArray(block.table.rows)
      || block.table.rows.some((row) => !Array.isArray(row) || ![3, 4, 5].includes(row.length)
        || row.length !== block.table?.rows[0]?.length
        || row.some((cell) => typeof cell !== 'string')))) {
      throw new RangeError(`Label block "${block.id}" table must contain consistent rows of three, four or five strings`);
    }
    assertPositiveFinite(block.fontSizeMm, `blocks.${block.id}.fontSizeMm`);
    if (block.minimumFontSizeMm !== undefined) {
      assertPositiveFinite(block.minimumFontSizeMm, `blocks.${block.id}.minimumFontSizeMm`);
    }
    if (block.minimumSizeSource) {
      if (
        !/^https:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/u.test(block.minimumSizeSource.url) ||
        !block.minimumSizeSource.label.trim()
      ) {
        throw new RangeError(
          `Minimum text size source for block "${block.id}" must include an HTTPS URL and label`,
        );
      }
    }
  }
}

export function layoutLabel(input: LabelLayoutInput): LabelLayoutResult {
  validateInput(input);

  const issues: LabelLayoutIssue[] = [];
  const blocksByKind = new Map<LabelBlockKind, LabelBlockInput>();
  for (const block of input.blocks) {
    if (blocksByKind.has(block.kind)) {
      issues.push({
        code: 'DUPLICATE_BLOCK',
        blockId: block.id,
        message: `More than one ${block.kind} block was supplied; verify intentional panel ordering.`,
      });
    } else {
      blocksByKind.set(block.kind, block);
    }
    if (
      block.minimumFontSizeMm !== undefined &&
      block.fontSizeMm < block.minimumFontSizeMm
    ) {
      issues.push({
        code: 'TEXT_BELOW_MINIMUM',
        blockId: block.id,
        message: `Text is ${formatMillimetres(block.fontSizeMm)} mm, below the supplied minimum of ${formatMillimetres(block.minimumFontSizeMm)} mm. Text was not reduced or silently altered.`,
      });
    }
    if (block.minimumSizeStatus !== 'approved' || block.minimumFontSizeMm === undefined) {
      issues.push({
        code: 'MINIMUM_SIZE_REVIEW_REQUIRED',
        blockId: block.id,
        message: `An approved minimum text size for ${block.kind} has not been supplied; verify it before label use.`,
      });
    } else if (!block.minimumSizeSource) {
      issues.push({
        code: 'MINIMUM_SIZE_SOURCE_MISSING',
        blockId: block.id,
        message: `A source is required for the approved minimum text size on ${block.kind}.`,
      });
    }
  }

  for (const kind of input.requiredBlocks) {
    const block = blocksByKind.get(kind);
    if (block === undefined || !block.lines.some((line) => line.trim().length > 0)) {
      issues.push({
        code: 'MISSING_REQUIRED_BLOCK',
        blockKind: kind,
        message: `Required content block "${kind}" is missing or has no content.`,
      });
    }
  }

  const contentWidth = input.widthMm - input.margins.leftMm - input.margins.rightMm;
  const contentBottom = input.heightMm - input.margins.bottomMm;
  const gap = input.gapMm ?? 0;
  let cursorY = input.margins.topMm;
  const renderedBlocks = input.blocks.map((block) => {
    const lineHeight = block.fontSizeMm * lineHeightRatio;
    const titleLines = block.hideTitle ? 0 : 1;
    const blockHeight = lineHeight * (block.lines.length + titleLines + (block.table?.rows.length ?? 0));
    const y = cursorY;
    if (y + blockHeight > contentBottom) {
      issues.push({
        code: 'BLOCK_OVERFLOW',
        blockId: block.id,
        message: `Block "${block.title}" extends beyond the available label area. Content was not shrunk or clipped.`,
      });
    }
    if (!block.hideTitle && estimatedLineWidthMm(block.title, block.fontSizeMm) > contentWidth) {
      issues.push({
        code: 'TITLE_OVERFLOW',
        blockId: block.id,
        message: `The title of "${block.title}" is estimated to exceed the printable width. This font-width estimate is a preflight only; rendered proof is still required.`,
      });
    }
    block.lines.forEach((line, lineIndex) => {
      if (estimatedLineWidthMm(line, block.fontSizeMm) > contentWidth) {
        issues.push({
          code: 'LINE_OVERFLOW',
          blockId: block.id,
          lineIndex,
          message: `Line ${lineIndex + 1} of "${block.title}" is estimated to exceed the printable width. This font-width estimate is a preflight only; rendered proof is still required.`,
        });
      }
    });
    const columnCount = block.table?.rows[0]?.length ?? 0;
    const columnOffsets = columnCount === 5
      ? [0, 0.31, 0.5, 0.61, 0.78]
      : columnCount === 4 ? [0, 0.37, 0.58, 0.79] : [0, 0.48, 0.74];
    const columnWidths = columnCount === 5
      ? [0.31, 0.19, 0.11, 0.17, 0.22]
      : columnCount === 4 ? [0.35, 0.19, 0.19, 0.21] : [0.46, 0.24, 0.26];
    block.table?.rows.forEach((row, rowIndex) => {
      row.forEach((cell, column) => {
        if (estimatedLineWidthMm(cell, block.fontSizeMm) > contentWidth * (columnWidths[column] ?? 0)) {
          issues.push({
            code: 'LINE_OVERFLOW',
            blockId: block.id,
            lineIndex: block.lines.length + rowIndex,
            message: `Table row ${rowIndex + 1} of "${block.title}" is estimated to exceed its column width. Rendered proof is still required.`,
          });
        }
      });
    });
    cursorY += blockHeight + gap;
    const title = block.hideTitle ? '' : `<text x="${formatPhysicalDimension(input.margins.leftMm)}" y="${formatMillimetres(y + block.fontSizeMm)}" font-size="${formatPhysicalDimension(block.fontSizeMm)}" font-weight="700">${escapeXml(block.title)}</text>`;
    const lines = block.lines
      .map((line, index) => {
        const lineY = y + block.fontSizeMm + lineHeight * (index + titleLines);
        const content = block.boldLines ? escapeXml(line) : renderBoldPhrases(line, block.boldPhrases ?? []);
        return `<text x="${formatPhysicalDimension(input.margins.leftMm)}" y="${formatMillimetres(lineY)}" font-size="${formatPhysicalDimension(block.fontSizeMm)}"${block.boldLines ? ' font-weight="700"' : ''}>${content}</text>`;
      })
      .join('');
    const table = block.table?.rows.map((row, rowIndex) => row.map((cell, column) => {
      const x = input.margins.leftMm + contentWidth * (columnOffsets[column] ?? 0);
      const lineY = y + block.fontSizeMm + lineHeight * (block.lines.length + rowIndex + titleLines);
      return `<text x="${formatMillimetres(x)}" y="${formatMillimetres(lineY)}" font-size="${formatPhysicalDimension(block.fontSizeMm)}">${escapeXml(cell)}</text>`;
    }).join('')).join('') ?? '';
    return `<g data-block-id="${escapeXml(block.id)}" data-block-kind="${block.kind}">${title}${lines}${table}</g>`;
  });

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${formatPhysicalDimension(input.widthMm)}mm" height="${formatPhysicalDimension(input.heightMm)}mm" viewBox="0 0 ${formatPhysicalDimension(input.widthMm)} ${formatPhysicalDimension(input.heightMm)}">`,
    '<g fill="#000" font-family="sans-serif">',
    ...renderedBlocks,
    '</g>',
    '</svg>',
  ].join('');

  return {
    status: issues.length === 0 ? 'ready_for_review' : 'review_required',
    widthMm: input.widthMm,
    heightMm: input.heightMm,
    orientation: input.orientation,
    svg,
    issues,
    nonCertificationStatement:
      'This label draft assists review and does not certify legal compliance.',
  };
}

export { createConsultantReportPdf, createLabelPdf } from './pdf.js';
export { preloadLabelPdfRenderer } from './pdf.js';
export type { LabelConsultantSection, LabelPdfExport, LabelPdfMetadata, LabelPdfReport } from './pdf.js';
