import { expect, test } from '@playwright/test';

test('additive and name checks stay REVIEW REQUIRED and never claim compliance', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Illustrative demo data loaded locally' }))
    .toBeVisible();
  await page.getByRole('button', { name: 'Additives & names' }).click();

  // Missing-data path: nothing confirmed yet.
  await expect(page.getByRole('heading', { name: 'Additives & names' })).toBeVisible();
  await expect(page.getByText('Draft rule data 0.1.0-draft (not reviewed)')).toBeVisible();
  const names = page.getByRole('article', { name: 'Prescribed-name candidates' });
  await expect(names.getByText('Status: REVIEW REQUIRED')).toBeVisible();
  await expect(names.getByText(/COHORT_NOT_CONFIRMED/)).toBeVisible();

  // Supported draft path: confirm a cohort and evidence, save, and re-evaluate.
  await page.getByLabel('Food for infants').check();
  await page.getByLabel('Added sugars, honey and native bee honey (g per 100 g)').fill('5');
  await page.getByLabel(/I confirm the sugars figure/).check();
  await page.getByLabel('Evidence reference', { exact: true }).fill('Illustrative calculation sheet');
  await page.getByLabel('Evidence date', { exact: true }).fill('2026-11-10');
  await page.getByRole('button', { name: 'Save inputs' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'inputs saved on this product draft' }))
    .toBeVisible();

  const sweetened = page.getByRole('article', { name: "Infant food 'sweetened' word" });
  await expect(sweetened.getByText('Status: REVIEW REQUIRED')).toBeVisible();
  await expect(sweetened.getByText(/RULE_NOT_APPROVED/)).toBeVisible();
  await expect(names.getByText(/COHORT_NOT_CONFIRMED/)).toHaveCount(0);

  await expect(page.getByText('Status: PASS')).toHaveCount(0);
  await expect(page.getByText('Status: FAIL')).toHaveCount(0);
  await expect(page.getByText('does not certify legal compliance').first()).toBeVisible();
});
