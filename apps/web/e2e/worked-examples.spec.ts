import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { openProductStep } from './helpers';

test('worked examples load, stay REVIEW REQUIRED, preview when asked, show labels and remove cleanly', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load worked examples' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Worked examples loaded locally' })).toBeVisible();

  // Loading twice never overwrites: everything is reported as already present.
  await page.getByRole('button', { name: 'Load worked examples' }).click();
  await expect(page.getByRole('status').filter({ hasText: /0 added, \d+ already present/ })).toBeVisible();

  await openProductStep(page, 'Example Citrus Boost Max', 'Additives & names');

  const rosin = page.getByRole('article', { name: /Additive permission: 445/ });
  await expect(rosin.getByText('Status: REVIEW REQUIRED')).toBeVisible();
  await expect(rosin.getByText(/Calculated final concentration: 130 mg\/kg/)).toBeVisible();
  const sulphite = page.getByRole('article', { name: /Additive permission: 223/ });
  await expect(sulphite.getByText(/CONCENTRATION_MISSING/).first()).toBeVisible();
  await expect(page.getByText('ILLUSTRATIVE ONLY', { exact: true })).toHaveCount(0);

  await page.getByLabel(/Show what each result would be/).check();
  await expect(rosin.getByText('ILLUSTRATIVE ONLY', { exact: true })).toBeVisible();
  await expect(rosin.getByText(/would be FAIL/)).toBeVisible();
  await expect(sulphite.getByText(/Blocked by: .*CONCENTRATION_MISSING/)).toBeVisible();
  await expect(rosin.getByText('Status: REVIEW REQUIRED')).toBeVisible();
  await expect(page.getByText('Status: PASS')).toHaveCount(0);
  await expect(page.getByText('Status: FAIL')).toHaveCount(0);

  await page.getByRole('navigation', { name: 'Steps' }).getByRole('button', { name: 'Claims' }).click();
  await expect(page.getByRole('article', { name: 'Claim: Low sugars' }).getByText(/would be FAIL/)).toBeVisible();
  await expect(
    page.getByRole('article', { name: 'Claim: Supports concentration' }).getByText(/HEALTH_REVIEW_ONLY/).first(),
  ).toBeVisible();

  await openProductStep(page, 'Example Citrus Boost', 'Claims');
  await expect(page.getByRole('article', { name: 'Claim: Low sugars' }).getByText(/would be PASS/)).toBeVisible();

  await openProductStep(page, 'Example Honey and Oat Puree', 'Claims');
  await expect(
    page.getByRole('article', { name: 'Claim: Low fat' }).getByText(/PROHIBITED_CONTEXT/).first(),
  ).toBeVisible();
  await expect(page.getByRole('article', { name: 'Claim: Low fat' }).getByText(/would be (PASS|FAIL)/)).toHaveCount(0);

  await page.getByRole('navigation', { name: 'Steps' }).getByRole('button', { name: 'Additives & names' }).click();
  await expect(
    page.getByRole('article', { name: /Additive permission: 407/ }).getByText(/would be FAIL/),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Overview' }).click();
  await expect(page.getByRole('heading', { name: 'Guide to the worked examples' })).toBeVisible();
  for (const name of ['Example Citrus Boost', 'Example Apple and Oat Puree', 'Example Honey and Oat Puree']) {
    await page.getByRole('button', { name: 'Labels', exact: true }).click();
    await page.getByLabel('Product draft').selectOption({ label: name });
    await expect(page.getByRole('img', { name: /Illustrative label layout/ })).toBeVisible();
    await expect(page.getByText('The selected product has no available formulation.')).toHaveCount(0);
    await page.getByRole('button', { name: 'Overview' }).click();
  }
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await page.getByLabel('Product draft').selectOption({ label: 'Example Apple and Oat Puree' });
  const downloadPromise = page.waitForEvent('download');
  await expect(page.getByRole('button', { name: 'Export illustrative PDF draft' })).toBeEnabled();
  await page.getByRole('button', { name: 'Export illustrative PDF draft' }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/\.pdf$/);

  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(axe.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);

  // Removal deletes only the tagged examples, after a confirmation.
  await page.getByRole('button', { name: 'Overview' }).click();
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Remove worked examples' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Worked examples removed' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove worked examples' })).toHaveCount(0);
});
