import { expect, test } from '@playwright/test';

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

  await page.getByRole('button', { name: 'Label layout & PDF' }).click();
  await expect(page.getByText('PDF renderer loaded locally for this session.')).toBeVisible();
  await expect(
    page.getByRole('img', {
      name: 'Illustrative label layout marked demonstration only, not a food label',
    }),
  ).toBeVisible();
  await expect(page.getByText(/estimated to exceed the printable width/)).toHaveCount(0);

  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Review & trace' }).click();
  await expect(page.getByText('No active regulatory release is installed')).toBeVisible();
  await expect(
    page.getByText('Not supplied — REVIEW REQUIRED; missing values are not treated as zero.').first(),
  )
    .toBeVisible();

  await page.getByRole('button', { name: 'Label layout & PDF' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export illustrative PDF draft' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('demo-product-illustrative-label-draft.pdf');
  expect(await download.path()).not.toBeNull();
  await expect(page.getByRole('status').filter({ hasText: 'Illustrative PDF draft exported' }))
    .toBeVisible();
  const secondDownloadPromise = page.waitForEvent('download');
  await expect(page.getByRole('button', { name: 'Export illustrative PDF draft' })).toBeEnabled();
  await page.getByRole('button', { name: 'Export illustrative PDF draft' }).click();
  expect((await secondDownloadPromise).suggestedFilename()).toBe(
    'demo-product-illustrative-label-draft.pdf',
  );
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
