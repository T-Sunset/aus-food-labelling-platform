import { describe, expect, it } from 'vitest';
import { layoutLabel } from './index.js';
import { createLabelPdf } from './pdf.js';

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

describe('createLabelPdf input validation', () => {
  it('requires a product version and rule release for the export report', async () => {
    await expect(
      createLabelPdf(layout, { ...metadata, productVersion: ' ' }),
    ).rejects.toThrow('productVersion must be a non-empty, single-line value');
    await expect(
      createLabelPdf(layout, { ...metadata, ruleRelease: 'rules\nrelease' }),
    ).rejects.toThrow('ruleRelease must be a non-empty, single-line value');
  });

  it('requires a canonical UTC export timestamp for deterministic metadata', async () => {
    await expect(
      createLabelPdf(layout, { ...metadata, exportedAt: '2026-11-09T05:30:00+00:00' }),
    ).rejects.toThrow('exportedAt must be a canonical ISO-8601 UTC timestamp');
  });
});
