import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { openAdditiveReview, openLabelTab, seedWorkedExamples } from './helpers';

test('existing worked examples remain accessible without Overview controls', async ({
  page,
}) => {
  await page.goto('/');
  await seedWorkedExamples(page);
  await expect(page.getByRole('button', { name: 'Load worked examples' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Remove worked examples' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Guide to the worked examples' })).toHaveCount(0);

  await openAdditiveReview(page, 'Example Citrus Boost Max');

  const rosin = page.getByRole('article', { name: /Additive permission: 445/ });
  await expect(rosin.getByText('Status: REVIEW REQUIRED')).toBeVisible();
  await expect(rosin.getByText(/Calculated final concentration: 130 mg\/kg/)).toBeVisible();
  const sulphite = page.getByRole('article', { name: /Additive permission: 223/ });
  await expect(sulphite.getByText(/CONCENTRATION_MISSING/).first()).toBeVisible();
  await expect(page.getByText('ILLUSTRATIVE ONLY', { exact: true })).toHaveCount(0);

  await page.getByLabel(/Show what each result would be/).check();
  await expect(rosin.getByText('ILLUSTRATIVE ONLY', { exact: true })).toBeVisible();
  await expect(rosin.getByText(/would be FAIL/)).toBeVisible();
  await expect(rosin.getByText(/Needs attention!/)).toBeVisible();
  await expect(rosin.getByText(/illustrative only, based on unapproved rules/)).toBeVisible();
  await expect(sulphite.getByText(/Blocked by: .*CONCENTRATION_MISSING/)).toBeVisible();
  await expect(rosin.getByText('Status: REVIEW REQUIRED')).toBeVisible();
  await expect(page.getByText('Status: PASS')).toHaveCount(0);
  await expect(page.getByText('Status: FAIL')).toHaveCount(0);

  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await page.getByLabel('Product draft').selectOption({ label: 'Example Citrus Boost Max' });
  await openLabelTab(page, 'Claims');
  await page.getByRole('button', { name: 'Add copies of existing Product claims to this Label' }).click();
  const lowSugarClaim = page.getByRole('article', { name: 'Claim: Low sugars' });
  const concentrationClaim = page.getByRole('article', { name: 'Claim: Supports concentration' });
  await expect(lowSugarClaim.getByText('Status: REVIEW REQUIRED')).toBeVisible();
  await expect(concentrationClaim.getByText('Status: REVIEW REQUIRED')).toBeVisible();
  await expect(lowSugarClaim.getByText('ILLUSTRATIVE ONLY', { exact: true })).toHaveCount(0);
  await expect(concentrationClaim.getByText('ILLUSTRATIVE ONLY', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Save label draft', exact: true }).click();

  await page.getByLabel('Product draft').selectOption({ label: 'Example Citrus Boost' });
  await page.getByRole('button', { name: 'Add copies of existing Product claims to this Label' }).click();
  await expect(page.getByRole('article', { name: 'Claim: Low sugars' }).getByText('Status: REVIEW REQUIRED')).toBeVisible();
  await page.getByRole('button', { name: 'Save label draft', exact: true }).click();

  await page.getByLabel('Product draft').selectOption({ label: 'Example Honey and Oat Puree' });
  await page.getByRole('button', { name: 'Add copies of existing Product claims to this Label' }).click();
  await page.getByRole('article', { name: 'Claim: Low fat' }).getByText('Condition checklist, rule and source').click();
  await expect(
    page.getByRole('article', { name: 'Claim: Low fat' }).getByText(/PROHIBITED_CONTEXT/).first(),
  ).toBeVisible();
  await expect(page.getByRole('article', { name: 'Claim: Low fat' }).getByText(/would be (PASS|FAIL)/)).toHaveCount(0);

  await openAdditiveReview(page, 'Example Honey and Oat Puree');
  await expect(
    page.getByRole('article', { name: /Additive permission: 407/ }).getByText(/would be FAIL/),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Overview' }).click();
  for (const name of ['Example Citrus Boost', 'Example Apple and Oat Puree', 'Example Honey and Oat Puree']) {
    await page.getByRole('button', { name: 'Labels', exact: true }).click();
    await page.getByLabel('Product draft').selectOption({ label: name });
    await expect(page.getByRole('img', { name: /Draft label layout/ })).toBeVisible();
    await expect(page.getByText('The selected product has no available formulation.')).toHaveCount(0);
    await page.getByRole('button', { name: 'Overview' }).click();
  }
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await page.getByLabel('Product draft').selectOption({ label: 'Example Apple and Oat Puree' });
  await expect(page.getByRole('button', { name: 'Export Incomplete Review Copy PDF' })).toBeEnabled();
  const reportDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download review report' }).click();
  const report = await reportDownload;
  expect(report.suggestedFilename()).toMatch(/-review-report\.pdf$/);
  const reportPath = await report.path();
  if (!reportPath) throw new Error('The review report was not saved locally.');
  const reportText = (await readFile(reportPath)).toString('latin1');
  expect(reportText).toContain('Still needed:');
  expect(reportText).toContain('No label layout is included in this report.');
  expect(reportText).toContain('does not certify legal compliance.');
  await expect(page.getByText('Needs attention!').first()).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(axe.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);

  await page.reload();
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit product Example Citrus Boost', exact: true })).toBeVisible();
});
