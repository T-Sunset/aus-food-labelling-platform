import type { jsPDF as JsPDF } from 'jspdf';
import type { LabelLayoutIssue, LabelLayoutResult } from './index.js';

const reportWidthMm = 210;
const reportHeightMm = 297;
const nonCertificationStatement =
  'This label draft assists review and does not certify legal compliance.';
const fontReviewMessage =
  'Font embedding and physical print legibility are not verified. Inspect a rendered proof at print scale before use.';

interface LabelPdfRenderer {
  readonly jsPDF: typeof import('jspdf').jsPDF;
  readonly svg2pdf: typeof import('svg2pdf.js').svg2pdf;
}

let labelPdfRenderer: Promise<LabelPdfRenderer> | undefined;

export function preloadLabelPdfRenderer(): Promise<LabelPdfRenderer> {
  labelPdfRenderer ??= Promise.all([import('jspdf'), import('svg2pdf.js')])
    .then(([pdfModule, svgModule]) => ({
      jsPDF: pdfModule.jsPDF,
      svg2pdf: svgModule.svg2pdf,
    }))
    .catch((error: unknown) => {
      labelPdfRenderer = undefined;
      throw error;
    });
  return labelPdfRenderer;
}

export interface LabelPdfMetadata {
  readonly productVersion: string;
  readonly ruleRelease: string;
  readonly exportedAt: string;
}

export interface LabelPdfReport {
  readonly productVersion: string;
  readonly ruleRelease: string;
  readonly exportedAt: string;
  readonly labelWidthMm: number;
  readonly labelHeightMm: number;
  readonly layoutStatus: LabelLayoutResult['status'];
  readonly fontEmbeddingStatus: 'review_required';
  readonly issues: readonly (
    | LabelLayoutIssue
    | {
        readonly code: 'PDF_FONT_EMBEDDING_UNVERIFIED';
        readonly message: string;
      }
  )[];
  readonly nonCertificationStatement: typeof nonCertificationStatement;
}

export interface LabelPdfExport {
  readonly pdfBytes: Uint8Array;
  readonly report: LabelPdfReport;
}

function assertMetadata(metadata: LabelPdfMetadata): void {
  for (const [name, value] of [
    ['productVersion', metadata.productVersion],
    ['ruleRelease', metadata.ruleRelease],
  ] as const) {
    const hasControlCharacter = [...value].some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint <= 0x1f || codePoint === 0x7f;
    });
    if (!value.trim() || hasControlCharacter) {
      throw new RangeError(`${name} must be a non-empty, single-line value`);
    }
  }

  const date = new Date(metadata.exportedAt);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString() !== metadata.exportedAt
  ) {
    throw new RangeError('exportedAt must be a canonical ISO-8601 UTC timestamp');
  }
}

function parseSvgDimension(value: string | null, name: string): number {
  const match = value?.match(/^(\d+(?:\.\d+)?)mm$/u);
  if (match?.[1] === undefined) {
    throw new RangeError(`SVG ${name} must use a millimetre dimension`);
  }
  const dimension = Number(match[1]);
  if (!Number.isFinite(dimension) || dimension <= 0) {
    throw new RangeError(`SVG ${name} must be positive and finite`);
  }
  return dimension;
}

function assertAllowedSvg(svg: SVGSVGElement): void {
  const allowedAttributes: Record<string, ReadonlySet<string>> = {
    svg: new Set(['xmlns', 'width', 'height', 'viewBox']),
    g: new Set(['fill', 'font-family', 'data-block-id', 'data-block-kind']),
    text: new Set(['x', 'y', 'font-size', 'font-weight']),
  };
  const elements = [svg, ...Array.from(svg.querySelectorAll('*'))];

  for (const element of elements) {
    const tagName = element.localName;
    const attributes = allowedAttributes[tagName];
    if (element.namespaceURI !== 'http://www.w3.org/2000/svg' || attributes === undefined) {
      throw new RangeError(`SVG contains unsupported element "${tagName}"`);
    }
    const requiredAttributes =
      tagName === 'svg'
        ? ['xmlns', 'width', 'height', 'viewBox']
        : tagName === 'g'
          ? element.parentElement?.localName === 'svg'
            ? ['fill', 'font-family']
            : ['data-block-id', 'data-block-kind']
          : ['x', 'y', 'font-size'];
    if (requiredAttributes.some((name) => !element.hasAttribute(name))) {
      throw new RangeError(`SVG "${tagName}" is missing a required attribute`);
    }
    for (const attribute of Array.from(element.attributes)) {
      if (!attributes.has(attribute.name)) {
        throw new RangeError(`SVG contains unsupported attribute "${attribute.name}"`);
      }
      if (
        (attribute.name === 'fill' && attribute.value !== '#000') ||
        (attribute.name === 'font-family' && attribute.value !== 'sans-serif') ||
        (attribute.name === 'font-weight' && attribute.value !== '700') ||
        (attribute.name === 'data-block-id' && !attribute.value.trim()) ||
        (attribute.name === 'data-block-kind' && !attribute.value.trim())
      ) {
        throw new RangeError(`SVG contains unsupported value for "${attribute.name}"`);
      }
      if (['x', 'y', 'font-size'].includes(attribute.name)) {
        const numericValue = Number(attribute.value);
        if (
          !Number.isFinite(numericValue) ||
          (attribute.name === 'font-size' ? numericValue <= 0 : numericValue < 0)
        ) {
          const requirement = attribute.name === 'font-size' ? 'positive' : 'non-negative';
          throw new RangeError(`SVG "${attribute.name}" must be ${requirement} and finite`);
        }
      }
    }
  }

  if (
    svg.children.length !== 1 ||
    svg.children[0]?.localName !== 'g' ||
    Array.from(svg.children[0].children).some(
      (block) =>
        block.localName !== 'g' ||
        Array.from(block.children).some((line) => line.localName !== 'text'),
    )
  ) {
    throw new RangeError('SVG structure does not match the supported label layout');
  }
}

function parseLabelSvg(layout: LabelLayoutResult): {
  readonly element: SVGSVGElement;
  readonly widthMm: number;
  readonly heightMm: number;
} {
  const document = new DOMParser().parseFromString(layout.svg, 'image/svg+xml');
  if (document.querySelector('parsererror')) {
    throw new RangeError('Label layout contains invalid SVG');
  }
  const svg = document.documentElement;
  if (
    svg.localName !== 'svg' ||
    svg.namespaceURI !== 'http://www.w3.org/2000/svg' ||
    !(svg instanceof SVGSVGElement)
  ) {
    throw new RangeError('Label layout must have an SVG root element');
  }
  assertAllowedSvg(svg);

  const widthMm = parseSvgDimension(svg.getAttribute('width'), 'width');
  const heightMm = parseSvgDimension(svg.getAttribute('height'), 'height');
  const expectedWidthMm = Number(layout.widthMm.toFixed(4));
  const expectedHeightMm = Number(layout.heightMm.toFixed(4));
  const viewBox = svg.getAttribute('viewBox')?.trim().split(/\s+/u).map(Number);
  if (
    widthMm !== expectedWidthMm ||
    heightMm !== expectedHeightMm ||
    viewBox?.length !== 4 ||
    viewBox[0] !== 0 ||
    viewBox[1] !== 0 ||
    viewBox[2] !== widthMm ||
    viewBox[3] !== heightMm
  ) {
    throw new RangeError('SVG physical dimensions must match the reviewed label layout');
  }

  for (const text of Array.from(svg.querySelectorAll('text'))) {
    const fontSizeMm = Number(text.getAttribute('font-size'));
    if (!Number.isFinite(fontSizeMm) || fontSizeMm <= 0) {
      throw new RangeError('SVG text font size must be positive and finite');
    }
  }

  return { element: svg, widthMm, heightMm };
}

function pdfDate(timestamp: string): string {
  const date = new Date(timestamp);
  return `D:${date.toISOString().slice(0, 19).replace(/[-:T]/gu, '')}+00'00'`;
}

async function stableFileId(layoutSvg: string, metadata: LabelPdfMetadata): Promise<string> {
  const input = new TextEncoder().encode(
    `${layoutSvg}\u0000${metadata.productVersion}\u0000${metadata.ruleRelease}\u0000${metadata.exportedAt}`,
  );
  const digest = await crypto.subtle.digest('SHA-256', input);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32)
    .toUpperCase();
}

function writeReportPage(
  pdf: JsPDF,
  metadata: LabelPdfMetadata,
  report: LabelPdfReport,
): void {
  pdf.addPage([reportWidthMm, reportHeightMm], 'portrait');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('Label export report', 15, 20);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);

  const reportLines = [
    `Product version: ${metadata.productVersion}`,
    `Rule release: ${metadata.ruleRelease}`,
    `Exported at: ${metadata.exportedAt}`,
    `Label dimensions: ${report.labelWidthMm} x ${report.labelHeightMm} mm`,
    `Layout status: ${report.layoutStatus.replaceAll('_', ' ').toUpperCase()}`,
    `Font embedding: ${report.fontEmbeddingStatus.replaceAll('_', ' ').toUpperCase()}`,
    '',
    ...report.issues.map((issue) => `${issue.code}: ${issue.message}`),
    '',
    report.nonCertificationStatement,
  ];

  let cursorY = 32;
  for (const line of reportLines) {
    const wrapped = pdf.splitTextToSize(line, reportWidthMm - 30) as string[];
    for (const wrappedLine of wrapped.length > 0 ? wrapped : ['']) {
      if (cursorY > reportHeightMm - 15) {
        pdf.addPage([reportWidthMm, reportHeightMm], 'portrait');
        cursorY = 20;
      }
      pdf.text(wrappedLine, 15, cursorY);
      cursorY += 6;
    }
  }
}

export async function createLabelPdf(
  layout: LabelLayoutResult,
  metadata: LabelPdfMetadata,
): Promise<LabelPdfExport> {
  assertMetadata(metadata);
  const { element, widthMm, heightMm } = parseLabelSvg(layout);
  const issues: LabelPdfReport['issues'] = [
    ...layout.issues,
    { code: 'PDF_FONT_EMBEDDING_UNVERIFIED', message: fontReviewMessage },
  ];
  const report: LabelPdfReport = {
    productVersion: metadata.productVersion,
    ruleRelease: metadata.ruleRelease,
    exportedAt: metadata.exportedAt,
    labelWidthMm: widthMm,
    labelHeightMm: heightMm,
    layoutStatus: layout.status,
    fontEmbeddingStatus: 'review_required',
    issues,
    nonCertificationStatement,
  };
  const { jsPDF, svg2pdf } = await preloadLabelPdfRenderer();
  const pdf = new jsPDF({
    unit: 'mm',
    format: [widthMm, heightMm],
    orientation: layout.orientation,
    compress: false,
    precision: 16,
    putOnlyUsedFonts: true,
    floatPrecision: 16,
  });
  pdf.setProperties({
    title: 'Food label draft',
    subject: `Product version ${metadata.productVersion}; rule release ${metadata.ruleRelease}`,
    creator: '@aus-food/label',
  });
  pdf.setCreationDate(pdfDate(metadata.exportedAt));
  pdf.setFileId(await stableFileId(layout.svg, metadata));
  await svg2pdf(element, pdf, { x: 0, y: 0, width: widthMm, height: heightMm });
  writeReportPage(pdf, metadata, report);

  return {
    pdfBytes: new Uint8Array(pdf.output('arraybuffer')),
    report,
  };
}
