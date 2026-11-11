import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('loads the illustrative workflow and exports a PDF while offline', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.headers()['content-security-policy']).toContain("script-src 'self'");
  await expect(page.getByRole('heading', { name: 'Good work starts with good records.' })).toBeVisible();

  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Illustrative demo data loaded locally' }))
    .toBeVisible();
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await expect(page.getByText('Illustrative demo product', { exact: true })).toBeVisible();
  await page.getByText('Class and name screening · REVIEW REQUIRED').click();
  await expect(page.getByText('Insufficient or conflicting evidence; review required').first())
    .toBeVisible();
  await expect(page.getByText('No approved prescribed-name candidate rules; human review required'))
    .toBeVisible();

  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  for (const name of ['Illustrative base', 'Illustrative carrier']) {
    await page.getByRole('button', { name: `Edit ingredient ${name}` }).click();
    const steps = page.getByRole('navigation', { name: 'Steps' });
    await steps.getByRole('button', { name: 'Spec sheet' }).click();
    await page.getByLabel('Specification reference').fill('Illustrative spec');
    await page.getByLabel('Specification date').fill('2026-01-01');
    await steps.getByRole('button', { name: 'Nutrition' }).click();
    await page.getByLabel('Energy').fill('100');
    for (const nutrient of ['Protein', 'Fat, total', 'Saturated fat', 'Carbohydrate', 'Sugars', 'Sodium']) {
      await page.getByLabel(nutrient).fill('1');
    }
    await steps.getByRole('button', { name: 'Allergens' }).click();
    if (name === 'Illustrative base') await page.getByLabel('Milk', { exact: true }).check();
    await page.getByLabel(/I checked the supplier information for every allergen shown/).check();
    await steps.getByRole('button', { name: 'Additives' }).click();
    await page.getByLabel(/The supplier confirms this ingredient contains no additives/).check();
    await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  }
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await page.getByRole('button', { name: 'Edit product Illustrative demo product' }).click();
  const productSteps = page.getByRole('navigation', { name: 'Steps' });
  await productSteps.getByRole('button', { name: 'What is it?' }).click();
  await page.getByLabel('What kind of product is this?').selectOption('other');
  await expect(page.getByText('Saved on this device.')).toBeVisible();
  await productSteps.getByRole('button', { name: 'Pack details' }).click();
  await page.getByLabel('Serving size', { exact: true }).fill('50');
  await page.getByLabel('Serving size unit').selectOption('g');
  await page.getByLabel('Servings per pack').fill('2');
  await page.getByLabel('Net contents', { exact: true }).fill('100');
  await page.getByLabel('Net contents unit').selectOption('g');
  await page.getByLabel('Is the food solid or liquid?').selectOption('solid');
  await page.getByLabel(/I have checked that the recipe amounts/).check();
  await page.getByRole('button', { name: 'Save pack details' }).click();
  await expect(page.getByText('Saved on this device.')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await page.getByRole('button', { name: 'Edit product Illustrative demo product' }).click();
  await page.getByRole('navigation', { name: 'Steps' }).getByRole('button', { name: 'What is it?' }).click();
  await expect(page.getByLabel('What kind of product is this?')).toHaveValue('other');

  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await expect(page.getByText('PDF renderer loaded locally for this session.')).toBeVisible();
  await expect(
    page.getByRole('img', {
      name: 'Draft label layout for consultant review',
    }),
  ).toBeVisible();
  await expect(page.getByLabel('Draft declaration')).toContainText('Illustrative carrier, Illustrative base');
  await expect(page.getByLabel('Draft declaration')).toContainText('Contains: milk');
  await expect(page.getByRole('table', { name: 'Draft nutrition information' }))
    .toContainText('50 kJ');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.getByText(/estimated to exceed the printable width/)).toHaveCount(0);

  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Review & trace' }).click();
  await expect(page.getByText('No active regulatory release is installed')).toBeVisible();
  await expect(page.getByText('REVIEW REQUIRED', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export draft PDF' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('demo-product-label-draft.pdf');
  const pdfPath = await download.path();
  expect(pdfPath).not.toBeNull();
  if (!pdfPath) throw new Error('The PDF was not saved locally.');
  const pdfText = (await readFile(pdfPath)).toString('latin1');
  expect(pdfText).toContain('Illustrative carrier, Illustrative base');
  expect(pdfText).toContain('Contains: milk');
  expect(pdfText).toContain('DRAFT NUTRITION INFORMATION');
  expect(pdfText).toContain('50 kJ');
  expect(pdfText).toContain('DRAFT - consultant review required');
  await expect(page.getByRole('status').filter({ hasText: 'Draft PDF exported' }))
    .toBeVisible();
  const secondDownloadPromise = page.waitForEvent('download');
  await expect(page.getByRole('button', { name: 'Export draft PDF' })).toBeEnabled();
  await page.getByRole('button', { name: 'Export draft PDF' }).click();
  expect((await secondDownloadPromise).suggestedFilename()).toBe(
    'demo-product-label-draft.pdf',
  );
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await page.getByRole('navigation', { name: 'Steps' }).getByRole('button', { name: 'Pack details' }).click();
  await page.getByLabel('Serving size unit').selectOption('mL');
  await page.getByLabel('Is the food solid or liquid?').selectOption('liquid');
  await page.getByRole('button', { name: 'Save pack details' }).click();
  await expect(page.getByText('Saved on this device.')).toBeVisible();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await expect(page.getByText(/Final food density and dated evidence/)).toBeVisible();
  await expect(page.getByRole('table', { name: 'Draft nutrition information' })).toContainText('Not available');
  await expect(page.getByRole('button', { name: 'Export draft PDF' })).toBeDisabled();
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await page.getByRole('navigation', { name: 'Steps' }).getByRole('button', { name: 'Pack details' }).click();
  await page.getByLabel('Final food density (g/mL)').fill('1.2');
  await page.getByLabel('Density evidence reference').fill('Illustrative density test');
  await page.getByLabel('Density evidence date').fill('2026-01-01');
  await page.getByRole('button', { name: 'Save pack details' }).click();
  await expect(page.getByText('Saved on this device.')).toBeVisible();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Draft nutrition information' })).toContainText('60 kJ');
  await expect(page.getByRole('table', { name: 'Draft nutrition information' })).toContainText('120 kJ');
  await expect(page.getByRole('button', { name: 'Export draft PDF' })).toBeEnabled();
  const liquidDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export draft PDF' }).click();
  const liquidPath = await (await liquidDownload).path();
  if (!liquidPath) throw new Error('The liquid draft PDF was not saved locally.');
  const liquidText = (await readFile(liquidPath)).toString('latin1');
  expect(liquidText).toContain('Per 100 mL');
  expect(liquidText).toContain('60 kJ');
  expect(liquidText).toContain('120 kJ');
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Edit ingredient Illustrative carrier' }).click();
  await page.getByRole('navigation', { name: 'Steps' }).getByRole('button', { name: 'Nutrition' }).click();
  await page.getByLabel('Protein').fill('');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Ingredient draft saved locally.' })).toBeVisible();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await expect(page.getByText('Illustrative carrier: nutrition information')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export draft PDF' })).toBeDisabled();
});

test('restores an encrypted demo backup into a clean browser profile', async ({ browser }) => {
  const sourceContext = await browser.newContext();
  const restoreContext = await browser.newContext();
  try {
    const sourcePage = await sourceContext.newPage();
    await sourcePage.goto('/');
    await sourcePage.getByRole('button', { name: 'Load illustrative demo data' }).click();
    await expect(sourcePage.getByRole('status').filter({ hasText: 'Illustrative demo data loaded' }))
      .toBeVisible();
    await sourcePage.getByRole('button', { name: 'Backup & restore' }).click();
    await sourcePage
      .getByLabel('Passphrase for encrypted backup or restore')
      .fill('demo backup passphrase');
    const downloadPromise = sourcePage.waitForEvent('download');
    await sourcePage.getByRole('button', { name: 'Download encrypted backup' }).click();
    const backupPath = await (await downloadPromise).path();
    if (backupPath === null) {
      throw new Error('The encrypted demo backup did not produce a local file.');
    }

    const restorePage = await restoreContext.newPage();
    await restorePage.goto('/');
    await restorePage.getByRole('button', { name: 'Backup & restore' }).click();
    await restorePage.getByLabel('Workspace backup file').setInputFiles(backupPath);
    await restorePage
      .getByLabel('Passphrase for encrypted backup or restore')
      .fill('demo backup passphrase');
    await restorePage.getByRole('button', { name: 'Inspect backup' }).click();
    await expect(restorePage.getByText(/Backup counts: 2 ingredients, 1 formulations, 1 products/))
      .toBeVisible();
    restorePage.on('dialog', (dialog) => dialog.accept());
    await restorePage.getByRole('button', { name: 'Confirm restore to this device' }).click();
    await expect(
      restorePage.getByRole('status').filter({ hasText: 'Workspace restored from the verified backup' }),
    ).toBeVisible();
    await restorePage.getByRole('button', { name: 'Products' }).click();
    await expect(restorePage.getByText('Illustrative demo product', { exact: true })).toBeVisible();
  } finally {
    await sourceContext.close();
    await restoreContext.close();
  }
});

test('the development Content Security Policy blocks third-party scripts', async ({ page }) => {
  let thirdPartyRequestObserved = false;
  await page.route('https://third-party.invalid/**', async (route) => {
    thirdPartyRequestObserved = true;
    await route.abort();
  });
  const response = await page.goto('/');
  const policy = response?.headers()['content-security-policy'] ?? '';
  expect(policy).toContain("default-src 'self'");
  expect(policy).toContain("script-src 'self'");
  expect(policy).toContain("object-src 'none'");

  const scriptResult = await page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://third-party.invalid/tracker.js';
        script.onload = () => resolve('loaded');
        script.onerror = () => resolve('blocked');
        document.head.append(script);
      }),
  );
  expect(scriptResult).toBe('blocked');
  expect(thirdPartyRequestObserved).toBe(false);
});
