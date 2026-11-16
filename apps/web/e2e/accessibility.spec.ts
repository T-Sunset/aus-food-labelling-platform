import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('workspace screens have no WCAG 2.1 A/AA automated accessibility violations', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await expect(page.getByRole('status')).toContainText('Illustrative demo data loaded');

  for (const section of [
    'Overview',
    'Ingredients',
    'Formulations',
    'Products',
    'Review & trace',
    'Labels',
    'Backup & restore',
  ]) {
    await page.getByRole('button', { name: section, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(
      results.violations,
      `${section}: ${results.violations.map((violation) => `${violation.id}: ${violation.help}`).join('; ')}`,
    ).toEqual([]);
  }

  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  for (const title of ['Nutrition', 'Allergens', 'Review']) {
    await page.locator('details.ingredient-section > summary').filter({ hasText: title }).click();
  }
  const ingredientResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    ingredientResults.violations,
    `Ingredient editor: ${ingredientResults.violations.map((violation) => `${violation.id}: ${violation.help}`).join('; ')}`,
  ).toEqual([]);
});
