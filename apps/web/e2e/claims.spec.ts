import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { openProductStep } from './helpers';

test('claims stay REVIEW REQUIRED, preview is opt-in and per session, and nothing certifies compliance', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Illustrative demo data loaded locally' }))
    .toBeVisible();
  await openProductStep(page, 'Illustrative demo product', 'Claims');
  await expect(page.getByRole('heading', { name: 'Facts about this product' })).toBeVisible();
  await expect(page.getByText('No claims entered for this product.')).toBeVisible();
  await expect(page.getByLabel('Food form')).toHaveCount(0);

  // Enter a claim with a person's classification, link, figure and evidence.
  await page.getByRole('button', { name: 'Add a claim' }).click();
  await page.getByLabel('Claim 1 text (exactly as it appears)').fill('Low sugars');
  await page.getByLabel('Claim 1 type (your classification)').selectOption('nutrition_content');
  await expect(page.getByLabel('Food form')).toBeVisible();
  await page.getByLabel('I confirm the type of claim 1').check();
  await page.getByLabel('Claim 1 supported claim rule').selectOption({ label: 'Low sugars' });
  await page.getByLabel(/Claim 1 amount/).fill('1');
  await page.getByLabel('Claim 1 evidence reference').fill('Illustrative lab sheet');
  await page.getByLabel('Claim 1 evidence date').fill('2026-11-10');
  await page.getByLabel('Food form').selectOption('liquid');
  await page.getByLabel(/I confirm the figures are for the form of the food/).check();
  await page.getByLabel('Is this an infant formula product?').selectOption('no');
  await page.getByLabel('Is this a kava product?').selectOption('no');
  await page.getByLabel('Does it contain more than 1.15% alcohol by volume?').selectOption('no');
  await page.getByRole('button', { name: 'Save claims' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Claims and claim facts saved' })).toBeVisible();

  // Draft rule: REVIEW REQUIRED with the reason shown as text, never PASS or FAIL.
  const result = page.getByRole('article', { name: 'Claim: Low sugars' });
  await expect(result.getByText('Status: REVIEW REQUIRED')).toBeVisible();
  await expect(result.getByText(/RULE_NOT_APPROVED/).first()).toBeVisible();
  await expect(result.getByText('does not certify legal compliance')).toBeVisible();
  await expect(page.getByText('ILLUSTRATIVE ONLY')).toHaveCount(0);
  await expect(page.getByText('Status: PASS')).toHaveCount(0);
  await expect(page.getByText('Status: FAIL')).toHaveCount(0);

  // The preview is off by default, labelled when on, and does not change the official status.
  await page.getByLabel(/Show what each result would be/).check();
  await expect(page.getByRole('note', { name: /Illustrative preview for claim: Low sugars/ })).toContainText(
    'ILLUSTRATIVE ONLY',
  );
  await expect(result.getByText('Status: REVIEW REQUIRED')).toBeVisible();
  await expect(page.getByText('Status: PASS')).toHaveCount(0);

  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(axe.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);

  // A reload turns the preview off again, and the saved claim is still there.
  await page.reload();
  await openProductStep(page, 'Illustrative demo product', 'Claims');
  await expect(page.getByLabel(/Show what each result would be/)).not.toBeChecked();
  await expect(page.getByRole('article', { name: 'Claim: Low sugars' })).toBeVisible();
  await expect(page.getByText('ILLUSTRATIVE ONLY')).toHaveCount(0);
});

test('an unclassified, health or restricted-context claim is review-only', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Illustrative demo data loaded locally' }))
    .toBeVisible();
  await openProductStep(page, 'Illustrative demo product', 'Claims');

  await page.getByRole('button', { name: 'Add a claim' }).click();
  await page.getByLabel('Claim 1 text (exactly as it appears)').fill('100% natural');
  await page.getByRole('button', { name: 'Add a claim' }).click();
  await page.getByLabel('Claim 2 text (exactly as it appears)').fill('Good for your heart');
  await page.getByLabel('Claim 2 type (your classification)').selectOption('health');
  await page.getByLabel('I confirm the type of claim 2').check();
  await page.getByRole('button', { name: 'Save claims' }).click();

  const unclassified = page.getByRole('article', { name: 'Claim: 100% natural' });
  await expect(unclassified.getByText(/CLASSIFICATION_NOT_CONFIRMED/)).toBeVisible();
  const health = page.getByRole('article', { name: 'Claim: Good for your heart' });
  await expect(health.getByText(/HEALTH_REVIEW_ONLY/)).toBeVisible();
  await expect(page.getByText('Status: PASS')).toHaveCount(0);
  await expect(page.getByText('Status: FAIL')).toHaveCount(0);
});
