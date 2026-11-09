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
  };
}
