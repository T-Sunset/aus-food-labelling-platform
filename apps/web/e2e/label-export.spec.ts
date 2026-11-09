import { Buffer } from 'node:buffer';
import { expect, test } from '@playwright/test';

test('exports a deterministic exact-size label and separate review report', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const harness = await import('/e2e/label-export-harness.ts');
    return harness.createRepeatExportFixture();
  });

  expect(result.firstBytes).toEqual(result.secondBytes);
  expect(result.unsafeSvgRejected).toBe(true);
  expect(result.report).toMatchObject({
    productVersion: 'product-v1',
    ruleRelease: 'rules-draft-0.1',
    exportedAt: '2026-11-09T05:30:00.000Z',
    labelWidthMm: 100,
    labelHeightMm: 150,
    fontEmbeddingStatus: 'review_required',
  });
  expect(result.report.issues).toContainEqual(
    expect.objectContaining({ code: 'PDF_FONT_EMBEDDING_UNVERIFIED' }),
  );
  expect(result.report.nonCertificationStatement).toContain(
    'does not certify legal compliance',
  );

  const pdfText = Buffer.from(result.firstBytes).toString('latin1');
  const mediaBoxes = Array.from(
    pdfText.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/gu),
    (match) => [Number(match[1]), Number(match[2])],
  );
  expect(mediaBoxes).toHaveLength(2);
  const [labelPage, reportPage] = mediaBoxes;
  if (labelPage === undefined || reportPage === undefined) {
    throw new Error('The exported PDF is missing the label or report page.');
  }
  expect(labelPage[0] * (25.4 / 72)).toBeCloseTo(100, 3);
  expect(labelPage[1] * (25.4 / 72)).toBeCloseTo(150, 3);
  expect(reportPage[0] * (25.4 / 72)).toBeCloseTo(210, 3);
  expect(reportPage[1] * (25.4 / 72)).toBeCloseTo(297, 3);
  const svgFontSizes = Array.from(
    pdfText.matchAll(/([\d.]+)\s+Tf\b/gu),
    (match) => Number(match[1]),
  );
  expect(
    svgFontSizes.some((size) => Math.abs(size - 3) < 0.001),
    `Expected 3 mm text as 3 SVG user units on a matching millimetre viewBox; found ${svgFontSizes.join(', ')}`,
  ).toBe(true);
  expect(pdfText).toContain('Product version: product-v1');
  expect(pdfText).toContain('Rule release: rules-draft-0.1');
  expect(pdfText).toContain('This label draft assists review and does not certify legal compliance.');
  expect(pdfText).toContain("/CreationDate (D:20261109053000+00'00')");
});
