import type { Page } from '@playwright/test';

// Opens a saved product in the Product builder and jumps to one of its steps.
export async function openProductStep(page: Page, productName: string, stepTitle: string): Promise<void> {
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  const back = page.getByRole('button', { name: 'Back to product list' });
  if (await back.isVisible()) {
    await back.click();
  }
  await page.getByRole('button', { name: `Edit product ${productName}`, exact: true }).click();
  await page.getByRole('navigation', { name: 'Steps' }).getByRole('button', { name: stepTitle }).click();
}
