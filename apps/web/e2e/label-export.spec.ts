import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { openFormulationSection, openLabelTab } from './helpers';

function pdfPageStreams(pdf: string): string[] {
  const contents = Array.from(pdf.matchAll(/\/Type \/Page\b[\s\S]*?\/Contents\s+(\d+)\s+0\s+R/gu), (match) => match[1]!);
  return contents.map((id) => {
    const stream = pdf.match(new RegExp(`\\n${id} 0 obj\\s*<<[\\s\\S]*?>>\\s*stream\\r?\\n([\\s\\S]*?)\\r?\\nendstream`, 'u'));
    if (!stream?.[1]) throw new Error(`PDF page content ${id} is missing.`);
    return stream[1];
  });
}

test('exports a deterministic exact-size label and separate review report', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const harness = await import('/e2e/label-export-harness.ts');
    return harness.createRepeatExportFixture();
  });

  expect(result.firstBytes).toEqual(result.secondBytes);
  expect(result.unsafeSvgRejected).toBe(true);
  expect(result.unsupportedNotesRejected).toBe(true);
  expect(result.unsupportedLabelRejected).toBe(true);
  expect(result.notesFirstBytes).toEqual(result.notesSecondBytes);
  expect(result.notesFirstBytes).not.toEqual(result.firstBytes);
  expect(result.reportFirstBytes).toEqual(result.reportSecondBytes);
  const standaloneReport = Buffer.from(result.reportFirstBytes).toString('latin1');
  expect(standaloneReport).toContain('No label layout is included in this report.');
  expect(standaloneReport).toContain('Review detail 60');
  expect(standaloneReport).not.toContain('Oat beverage');
  expect(Array.from(standaloneReport.matchAll(/\/MediaBox\s*\[/gu)).length).toBeGreaterThan(1);
  const notesText = Buffer.from(result.notesFirstBytes).toString('latin1');
  expect(notesText).toContain('Notes for your consultant');
  expect(notesText).toContain('Review detail 60');
  expect(Array.from(notesText.matchAll(/\/MediaBox\s*\[/gu)).length).toBeGreaterThan(2);
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
  const streams = pdfPageStreams(pdfText);
  expect(streams[0]).toContain('INCOMPLETE REVIEW COPY');
  expect(streams[1]).toContain('Oat beverage');
  expect(streams[1]).not.toContain('INCOMPLETE REVIEW COPY');
  expect(streams[2]).toContain('Label export report');
  const mediaBoxes = Array.from(
    pdfText.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/gu),
    (match) => [Number(match[1]), Number(match[2])],
  );
  expect(mediaBoxes).toHaveLength(3);
  const [coverPage, labelPage, reportPage] = mediaBoxes;
  if (coverPage === undefined || labelPage === undefined || reportPage === undefined) {
    throw new Error('The exported PDF is missing the label or report page.');
  }
  expect(labelPage[0] * (25.4 / 72)).toBeCloseTo(100, 3);
  expect(labelPage[1] * (25.4 / 72)).toBeCloseTo(150, 3);
  expect(coverPage[0] * (25.4 / 72)).toBeCloseTo(210, 3);
  expect(coverPage[1] * (25.4 / 72)).toBeCloseTo(297, 3);
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
  expect(pdfText).toContain('INCOMPLETE REVIEW COPY');
  expect(pdfText).toContain('must not be used on food packaging');
  expect(pdfText).toContain('Rule release: rules-draft-0.1');
  expect(pdfText).toContain('This label draft assists review and does not certify legal compliance.');
  expect(pdfText).toContain("/CreationDate (D:20261109053000+00'00')");
});

test('exports an incomplete recipe without inventing an ingredient declaration', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await page.getByRole('button', { name: 'Formulations', exact: true }).click();
  await page.getByRole('button', { name: 'Edit formulation Illustrative formulation' }).click();
  await openFormulationSection(page, 'Ingredients');
  await page.getByLabel('Line 1 quantity').fill('');
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Formulation draft saved locally.' })).toBeVisible();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await openLabelTab(page, 'Ingredients & allergens');
  await expect(page.getByText('Recipe information is missing.')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Incomplete Review Copy PDF' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('demo-product-incomplete-review-copy.pdf');
  const path = await file.path();
  if (!path) throw new Error('Review copy was not downloaded.');
  const pdf = (await readFile(path)).toString('latin1');
  const streams = pdfPageStreams(pdf);
  expect(streams[0]).toContain('INCOMPLETE REVIEW COPY');
  expect(streams[1]).not.toContain('INCOMPLETE REVIEW COPY');
  expect(streams[1]).not.toContain('Ingredients');
  expect(pdf).toContain('Draft ingredient declaration: Unavailable; review the recipe');
  expect(pdf).toContain('Still needed:');
  expect(pdf).toContain('Warnings, other mandatory content, exemptions, and physical print legibility are not fully assessed.');
  await expect(page.getByRole('status').filter({ hasText: 'Incomplete Review Copy exported' })).toBeVisible();
});

test('preserves fractional dimensions in the actual PDF page size', async ({ page }) => {
  await page.goto('/');
  const bytes = await page.evaluate(async () => {
    const harness = await import('/e2e/label-export-harness.ts');
    return harness.renderFractionalSizeFixture();
  });
  const pdf = Buffer.from(bytes).toString('latin1');
  const dimensions = Array.from(pdf.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/gu))[1];
  if (!dimensions) throw new Error('The rendered label PDF is missing its page size.');
  expect(Number(dimensions[1]) * 25.4 / 72).toBeCloseTo(80.12345, 5);
  expect(Number(dimensions[2]) * 25.4 / 72).toBeCloseTo(150.67891, 5);
});
