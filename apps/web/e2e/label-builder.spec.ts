import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { openProductStep } from './helpers';

test('product builder asks simple questions, requires a source and has no accessibility violations', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load worked examples' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Worked examples loaded locally' })).toBeVisible();

  await openProductStep(page, 'Example Citrus Boost', 'What is it?');
  await page.getByLabel('What kind of product is this?').selectOption('caffeinatedBeverage');
  await expect(page.getByText('0 of 4 questions answered.')).toBeVisible();

  // Yes and No are locked until the person says where the information came from.
  const flavoured = page.getByLabel('Is the drink flavoured?');
  await expect(flavoured.locator('option[value="yes"]')).toHaveAttribute('disabled', '');
  await page.getByLabel('Where is your information coming from?').selectOption('supplierSpecification');
  await flavoured.selectOption('yes');
  await expect(page.getByText('1 of 4 questions answered.')).toBeVisible();
  await page.getByLabel('Is the drink non-alcoholic?').selectOption('yes');
  await page.getByLabel('Does the drink contain caffeine?').selectOption('yes');
  await page.getByLabel('Does the pack or marketing say it improves mental performance?').selectOption('no');
  await expect(page.getByText('4 of 4 questions answered.')).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Steps' }).getByRole('button', { name: /^2 What is it\? ✓ Answered/ }),
  ).toBeVisible();

  // Answers are saved on the product, so they survive a reload.
  await page.reload();
  await openProductStep(page, 'Example Citrus Boost', 'What is it?');
  await expect(page.getByLabel('What kind of product is this?')).toHaveValue('caffeinatedBeverage');
  await expect(page.getByText('4 of 4 questions answered.')).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
});

test('a new product is built step by step, with pack details saved and edited', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Illustrative demo data loaded locally' }))
    .toBeVisible();

  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await page.getByRole('button', { name: 'Add product' }).click();

  // Later steps wait until the first one is saved.
  await page.getByRole('navigation', { name: 'Steps' }).getByRole('button', { name: 'What is it?' }).click();
  await expect(page.getByText(/Save the first step/)).toBeVisible();
  await page.getByRole('navigation', { name: 'Steps' }).getByRole('button', { name: 'About it' }).click();

  await page.getByLabel('Product name *').fill('Berry blast');
  await page.getByLabel('Recipe (formulation) *').selectOption({ label: 'Illustrative formulation' });
  await page.getByLabel('Food state *').selectOption('asSold');
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(page.getByLabel('What kind of product is this?')).toBeVisible();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await expect(page.getByLabel('Product name *')).toHaveValue('Berry blast');

  await page.getByRole('navigation', { name: 'Steps' }).getByRole('button', { name: 'Pack details' }).click();
  await page.getByLabel('Serving size', { exact: true }).fill('250');
  await page.getByLabel('Serving size unit').selectOption('mL');
  await page.getByLabel('Servings per pack').fill('2');
  await page.getByLabel('Net contents', { exact: true }).fill('500');
  await page.getByLabel('Net contents unit').selectOption('mL');
  await page.getByLabel('Is the food solid or liquid?').selectOption('liquid');
  await page.getByLabel(/I have checked that the recipe amounts/).check();
  await page.getByLabel('Final food density (g/mL)').fill('1.1');
  await page.getByLabel('Density evidence reference').fill('Density test');
  await page.getByLabel('Density evidence date').fill('2026-01-01');
  await page.getByRole('button', { name: 'Save pack details' }).click();
  await expect(page.getByText('Saved on this device.')).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Steps' }).getByRole('button', { name: /Pack details ✓ Answered/ }),
  ).toBeVisible();

  // A bad amount is explained in plain English and not saved.
  await page.getByLabel('Serving size', { exact: true }).fill('-5');
  await page.getByRole('button', { name: 'Save pack details' }).click();
  await expect(page.getByRole('alert')).toContainText('positive numbers');

  await page.getByRole('button', { name: 'Back to product list' }).click();
  await expect(page.getByText('Berry blast', { exact: true })).toBeVisible();

  // Pack details are still there when the product is reopened.
  await openProductStep(page, 'Berry blast', 'Pack details');
  await expect(page.getByLabel('Serving size', { exact: true })).toHaveValue('250');
  await expect(page.getByLabel('Serving size unit')).toHaveValue('mL');
  await expect(page.getByLabel('Net contents unit')).toHaveValue('mL');
});
