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
    'Ingredients & specifications',
    'Formulations',
    'Products',
    'Review & trace',
    'Additives & names',
    'Label layout & PDF',
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
});
