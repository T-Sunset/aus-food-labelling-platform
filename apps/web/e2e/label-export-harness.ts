import { createLabelPdf, layoutLabel } from '../../../packages/label/src/index.js';

export async function createRepeatExportFixture() {
  const layout = layoutLabel({
    widthMm: 100,
    heightMm: 150,
    orientation: 'portrait',
    margins: { topMm: 5, rightMm: 5, bottomMm: 5, leftMm: 5 },
    blocks: [
      {
        id: 'food-name',
        kind: 'foodName',
        title: 'Food name',
        lines: ['Oat beverage'],
        fontSizeMm: 3,
        minimumFontSizeMm: 2,
        minimumSizeStatus: 'approved',
        minimumSizeSource: {
          label: 'Fixture source',
          url: 'https://example.test/label-size',
        },
      },
    ],
    requiredBlocks: ['foodName'],
  });
  const metadata = {
    productVersion: 'product-v1',
    ruleRelease: 'rules-draft-0.1',
    exportedAt: '2026-11-09T05:30:00.000Z',
  };
  const first = await createLabelPdf(layout, metadata);
  const second = await createLabelPdf(layout, metadata);
  const withNotes = {
    ...metadata,
    consultantNotes: [
      { heading: 'Claims', lines: ['Claim "Natural": REVIEW REQUIRED.', ...Array.from({ length: 60 }, (_, index) => `Review detail ${index + 1}`)] },
    ],
  };
  const notesFirst = await createLabelPdf(layout, withNotes);
  const notesSecond = await createLabelPdf(layout, withNotes);
  let unsupportedNotesRejected = false;
  try {
    await createLabelPdf(layout, { ...metadata, consultantNotes: [{ heading: 'Claims', lines: ['Unsupported character: 🥝'] }] });
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    unsupportedNotesRejected = true;
  }
  let unsupportedLabelRejected = false;
  try {
    await createLabelPdf({ ...layout, svg: layout.svg.replace('Oat beverage', 'Oat 🥝') }, metadata);
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    unsupportedLabelRejected = true;
  }
  let unsafeSvgRejected = false;
  try {
    await createLabelPdf(
      { ...layout, svg: layout.svg.replace('</svg>', '<script>alert(1)</script></svg>') },
      metadata,
    );
  } catch (error) {
    if (!(error instanceof RangeError)) {
      throw error;
    }
    unsafeSvgRejected = true;
  }

  return {
    firstBytes: Array.from(first.pdfBytes),
    secondBytes: Array.from(second.pdfBytes),
    report: first.report,
    unsafeSvgRejected,
    notesFirstBytes: Array.from(notesFirst.pdfBytes),
    notesSecondBytes: Array.from(notesSecond.pdfBytes),
    unsupportedNotesRejected,
    unsupportedLabelRejected,
  };
}
