import { expect, test } from '@playwright/test';
import { openProductStep } from './helpers';

test('additive and name checks stay REVIEW REQUIRED and never claim compliance', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Illustrative demo data loaded locally' }))
    .toBeVisible();
  await openProductStep(page, 'Illustrative demo product', 'Additives & names');

  // Missing-data path: nothing confirmed yet.
  await expect(page.getByRole('heading', { name: 'Facts you confirm' })).toBeVisible();
  await expect(page.getByText('Draft rule data 0.1.0-draft (not reviewed)')).toBeVisible();
  await expect(page.getByLabel('Final density (g/mL, only for per-volume limits)')).toHaveCount(0);
  await expect(page.getByLabel('Added sugars, honey and native bee honey (g per 100 g)')).toHaveCount(0);
  await page.getByLabel('Concentration unit').selectOption('mg/L');
  await page.getByLabel('Final density (g/mL, only for per-volume limits)').fill('1.2');
  await page.getByLabel('Concentration unit').selectOption('mg/kg');
  await expect(page.getByLabel('Final density (g/mL, only for per-volume limits)')).toHaveCount(0);
  await page.getByLabel('Concentration unit').selectOption('mg/L');
  await expect(page.getByLabel('Final density (g/mL, only for per-volume limits)')).toHaveValue('1.2');
  await page.getByLabel('Final density evidence reference').fill('Density record');
  await page.getByLabel('Final density evidence date').fill('2026-01-01');
  await page.getByLabel('Concentration unit').selectOption('mg/kg');
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
  await page.getByLabel('Concentration unit').selectOption('mg/L');
  await expect(page.getByLabel('Final density (g/mL, only for per-volume limits)')).toHaveValue('1.2');
  await expect(page.getByLabel('Final density evidence reference')).toHaveValue('Density record');

  const sweetened = page.getByRole('article', { name: "Infant food 'sweetened' word" });
  await expect(sweetened.getByText('Status: REVIEW REQUIRED')).toBeVisible();
  await expect(sweetened.getByText(/RULE_NOT_APPROVED/)).toBeVisible();
  await expect(names.getByText(/COHORT_NOT_CONFIRMED/)).toHaveCount(0);

  await expect(page.getByText('Status: PASS')).toHaveCount(0);
  await expect(page.getByText('Status: FAIL')).toHaveCount(0);
  await expect(page.getByText('does not certify legal compliance').first()).toBeVisible();
});

test('illustrative preview on Additives & names is off by default, shared and never changes the official status', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await openProductStep(page, 'Illustrative demo product', 'Additives & names');
  await page.getByLabel('Food for infants').check();
  await page.getByLabel('Added sugars, honey and native bee honey (g per 100 g)').fill('5');
  await page.getByLabel(/I confirm the sugars figure/).check();
  await page.getByLabel('Evidence reference', { exact: true }).fill('Illustrative calculation sheet');
  await page.getByLabel('Evidence date', { exact: true }).fill('2026-11-10');
  await page.getByRole('button', { name: 'Save inputs' }).click();

  const sweetened = page.getByRole('article', { name: "Infant food 'sweetened' word" });
  await expect(page.getByText('ILLUSTRATIVE ONLY', { exact: true })).toHaveCount(0);

  await page.getByLabel(/Show what each result would be/).check();
  await expect(page.getByRole('note', { name: /Illustrative preview for/ }).first()).toBeVisible();
  await expect(sweetened.getByText('ILLUSTRATIVE ONLY', { exact: true })).toBeVisible();
  await expect(sweetened.getByText('Status: REVIEW REQUIRED')).toBeVisible();
  await expect(page.getByText('Status: PASS')).toHaveCount(0);
  await expect(page.getByText('Status: FAIL')).toHaveCount(0);
  const names = page.getByRole('article', { name: 'Prescribed-name candidates' });
  await expect(names.getByText('ILLUSTRATIVE ONLY', { exact: true })).toHaveCount(0);

  // Shared with the Claims step.
  await page.getByRole('navigation', { name: 'Steps' }).getByRole('button', { name: 'Claims' }).click();
  await expect(page.getByLabel(/Show what each result would be/)).toBeChecked();

  // Off again after a reload.
  await page.reload();
  await openProductStep(page, 'Illustrative demo product', 'Additives & names');
  await expect(page.getByLabel(/Show what each result would be/)).not.toBeChecked();
});