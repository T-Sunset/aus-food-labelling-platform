import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { openFormulationSection, openIngredientSection, openLabelIssues, openLabelNutrition, openLabelPackInformation, openLabelTab, openTechnicalReview } from './helpers';

test('loads the illustrative workflow and exports a review report while offline', async ({ page }) => {
  await page.addInitScript(() => {
    const createObjectURL = URL.createObjectURL;
    URL.createObjectURL = (object) => {
      if (object instanceof Blob && object.type === 'image/svg+xml') {
        void object.text().then((svg) => document.documentElement.setAttribute('data-test-preview-svg', svg));
      }
      return createObjectURL.call(URL, object);
    };
  });
  const response = await page.goto('/');
  expect(response?.headers()['content-security-policy']).toContain("script-src 'self'");
  await expect(page.getByRole('heading', { name: 'Good work starts with good records.' })).toBeVisible();

  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Illustrative demo data loaded locally' }))
    .toBeVisible();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await openLabelTab(page, 'Ingredients & allergens');
  await expect(page.getByLabel('Draft declaration')).toContainText('No allergen summary is available; missing evidence or conditions do not establish absence.');
  await openLabelPackInformation(page);
  await expect(page.getByRole('region', { name: 'Draft pack information' })).toContainText('Net contents: Not supplied');
  await expect(page.locator('html')).not.toHaveAttribute('data-test-preview-svg', /data-block-id="allergens"/);
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Products', exact: true }).getByText('Illustrative demo product', { exact: true })).toBeVisible();
  await page.getByText('Class and name screening · REVIEW REQUIRED').click();
  await expect(page.getByText('Insufficient or conflicting evidence; review required').first())
    .toBeVisible();
  await expect(page.getByText('No approved prescribed-name candidate rules; human review required'))
    .toBeVisible();

  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  for (const name of ['Illustrative base', 'Illustrative carrier']) {
    await page.getByRole('button', { name: `Edit ingredient ${name}` }).click();
    await openIngredientSection(page, 'Nutrition');
    await page.getByLabel('Energy').fill('100');
    for (const nutrient of ['Protein', 'Fat, total', 'Saturated fat', 'Carbohydrate', 'Sugars', 'Sodium']) {
      await page.getByRole('textbox', { name: nutrient }).fill('1');
    }
    await openIngredientSection(page, 'Allergens');
    if (name === 'Illustrative base') await page.getByLabel('Milk', { exact: true }).check();
    await page.getByLabel(/I confirm that ticked allergens are present/).check();
    await page.getByLabel(/I have identified all additives in this ingredient/).check();
    await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  }
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await page.getByRole('button', { name: 'Edit product Illustrative demo product' }).click();
  const productSteps = page.getByRole('navigation', { name: 'Product sections' });
  await productSteps.getByRole('button', { name: 'What is it?' }).click();
  await page.getByLabel('What kind of product is this?').selectOption('other');
  await expect(page.getByText('Saved on this device.').last()).toBeVisible();
  await productSteps.getByRole('button', { name: 'Customer directions and nutrition' }).click();
  await page.getByLabel('What does the label tell customers to do before consuming this product?').selectOption('none');
  await page.getByLabel('Serving size', { exact: true }).fill('50');
  await page.getByLabel('Serving size unit').selectOption('g');
  await page.getByLabel('Servings per pack').fill('2');
  await page.getByLabel('Net contents', { exact: true }).fill('100');
  await page.getByLabel('Net contents unit').selectOption('g');
  await page.getByLabel('Is the food solid or liquid?').selectOption('solid');
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await expect(page.locator('.product-save-bar').getByText('Saved on this device.')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await page.getByRole('button', { name: 'Edit product Illustrative demo product' }).click();
  await page.getByRole('navigation', { name: 'Product sections' }).getByRole('button', { name: 'What is it?' }).click();
  await expect(page.getByLabel('What kind of product is this?')).toHaveValue('other');
  await page.getByRole('navigation', { name: 'Product sections' }).getByRole('button', { name: 'Review', exact: true }).click();
  const review = page.locator('#product-section-review');
  await expect(review.getByText('Required product draft information entered.')).toBeVisible();
  await expect(review.getByText(/not legal clearance/)).toBeVisible();
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByLabel('Product name *').fill('Unsaved product');
  await expect(review.getByText('Required product draft information entered.')).not.toBeVisible();
  await expect(review.getByText(/You have unsaved changes/)).toBeVisible();
  await page.getByLabel('Product name *').fill('Illustrative demo product');
  await expect(review.getByText('Required product draft information entered.')).toBeVisible();

  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await expect(page.getByText('PDF renderer loaded locally for this session.')).toBeVisible();
  await expect(
    page.getByRole('img', {
      name: 'Draft label layout for consultant review',
    }),
  ).toBeVisible();
  await openLabelTab(page, 'Ingredients & allergens');
  await expect(page.getByLabel('Draft declaration')).toContainText('Illustrative carrier, Illustrative base');
  await expect(page.getByLabel('Draft declaration')).toContainText('Contains milk');
  await openLabelPackInformation(page);
  await expect(page.getByRole('region', { name: 'Draft pack information' })).toContainText('Net contents: 100 g');
  await expect(page.getByRole('region', { name: 'Draft pack information' })).toContainText('Supplier name and business address');
  await expect(page.locator('html')).toHaveAttribute('data-test-preview-svg', /data-block-id="net-contents"/);
  await expect(page.locator('html')).toHaveAttribute('data-test-preview-svg', /Contains milk/);
  await openLabelNutrition(page);
  await expect(page.getByRole('table', { name: 'Draft nutrition information' }))
    .toContainText('50 kJ');
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(accessibility.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.getByText(/estimated to exceed the printable width/)).toHaveCount(0);

  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Review product checks and evidence' }).click();
  await openTechnicalReview(page);
  await expect(page.getByText('No active regulatory release is installed in this workspace. The draft trace', { exact: false })).toBeVisible();
  await expect(page.getByText('REVIEW REQUIRED', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await page.getByText('Draft pack and ingredient declaration').click();
  await expect(page.getByText(/Illustrative base.*path.*No ingredient specification recorded/)).toBeVisible();
  await page.getByText('Allergen evidence and paths').click();
  await expect(page.getByText(/Candidate milk.*ingredient-list name/)).toBeVisible();

  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Export Incomplete Review Copy PDF' })).toBeEnabled();
  await expect(page.getByText('Incomplete Review Copy only')).toBeVisible();
  const copyDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Incomplete Review Copy PDF' }).click();
  const copyPath = await (await copyDownload).path();
  if (!copyPath) throw new Error('The review copy was not saved locally.');
  const copy = (await readFile(copyPath)).toString('latin1');
  expect(copy).toContain('INCOMPLETE REVIEW COPY');
  expect(copy).toContain('Recorded net contents: 100 g');
  expect(copy).toContain('Candidate allergen milk');
  expect(copy).not.toContain('ILLUSTRATIVE ONLY');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download review report' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('demo-product-review-report.pdf');
  const pdfPath = await download.path();
  expect(pdfPath).not.toBeNull();
  if (!pdfPath) throw new Error('The PDF was not saved locally.');
  const pdfText = (await readFile(pdfPath)).toString('latin1');
  expect(pdfText).toContain('No label layout is included in this report.');
  expect(pdfText).toContain('Notes for your consultant');
  expect(pdfText).toContain('No claims were entered for this Label draft.');
  expect(pdfText).toContain('Recorded draft inputs and official results');
  expect(pdfText).toContain('Pack content and limitations');
  expect(pdfText).toContain('Recorded net contents: 100 g');
  expect(pdfText).toContain('Ingredient and allergen evidence');
  expect(pdfText).toContain('Candidate allergen milk');
  expect(pdfText).not.toContain('ILLUSTRATIVE ONLY');
  await expect(page.getByRole('status').filter({ hasText: 'Review report exported' }))
    .toBeVisible();
  const secondDownloadPromise = page.waitForEvent('download');
  await expect(page.getByRole('button', { name: 'Download review report' })).toBeEnabled();
  await page.getByRole('button', { name: 'Download review report' }).click();
  expect((await secondDownloadPromise).suggestedFilename()).toBe(
    'demo-product-review-report.pdf',
  );
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await page.getByRole('navigation', { name: 'Product sections' }).getByRole('button', { name: 'Customer directions and nutrition' }).click();
  await page.getByLabel('Serving size unit').selectOption('mL');
  await page.getByLabel('Is the food solid or liquid?').selectOption('liquid');
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await expect(page.locator('.product-save-bar').getByText('Saved on this device.')).toBeVisible();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await openLabelIssues(page);
  await expect(page.getByRole('region', { name: 'Products and readiness' }).getByText(/Final food density is needed/)).toBeVisible();
  await openLabelNutrition(page);
  await expect(page.getByRole('table', { name: 'Draft nutrition information' })).toContainText('Not available');
  await expect(page.getByRole('button', { name: 'Export Incomplete Review Copy PDF' })).toBeEnabled();
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await page.getByRole('navigation', { name: 'Product sections' }).getByRole('button', { name: 'Customer directions and nutrition' }).click();
  await page.getByLabel('Final food density (g/mL)').fill('1.2');
  await page.getByText('Density source details (optional)', { exact: true }).click();
  await page.getByLabel('Density evidence reference').fill('Illustrative density test');
  await page.getByLabel('Density evidence date').fill('2026-01-01');
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await expect(page.locator('.product-save-bar').getByText('Saved on this device.')).toBeVisible();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Draft nutrition information' })).toContainText('60 kJ');
  await expect(page.getByRole('table', { name: 'Draft nutrition information' })).toContainText('120 kJ');
  await expect(page.getByRole('button', { name: 'Export Incomplete Review Copy PDF' })).toBeEnabled();
  await openLabelTab(page, 'Claims');
  await page.getByRole('button', { name: 'Add a claim' }).click();
  await page.getByLabel('Claim 1 text (exactly as it appears)').fill('Natural example');
  await page.getByLabel('Claim 1 type (your classification)').selectOption('not_code_regulated');
  await page.getByLabel('I confirm the type of claim 1').check();
  await page.getByRole('button', { name: 'Save label draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Label draft saved on this device' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export Incomplete Review Copy PDF' })).toBeEnabled();
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await page.getByRole('navigation', { name: 'Product sections' }).getByRole('button', { name: 'Review', exact: true }).click();
  await expect(review.getByText('Required product draft information entered.')).toBeVisible();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  const claimDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download review report' }).click();
  const claimPath = await (await claimDownload).path();
  if (!claimPath) throw new Error('The claim report PDF was not saved locally.');
  const claimText = (await readFile(claimPath)).toString('latin1');
  expect(claimText).toContain('Natural example');
  expect(claimText).toContain('Claim check: REVIEW REQUIRED');
  expect(claimText).not.toContain('ILLUSTRATIVE ONLY');
  await page.getByLabel('Claim 1 text (exactly as it appears)').fill('Natural 🥝');
  await page.getByRole('button', { name: 'Save label draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Label draft saved on this device' })).toBeVisible();
  await page.getByRole('button', { name: 'Download review report' }).click();
  await expect(page.getByRole('alert')).toContainText('characters the PDF font cannot display');
  await page.getByRole('button', { name: 'Export Incomplete Review Copy PDF' }).click();
  await expect(page.getByRole('alert')).toContainText('characters the PDF font cannot display');
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Edit ingredient Illustrative carrier' }).click();
  await openIngredientSection(page, 'Nutrition');
  await page.getByLabel('Protein').fill('');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Ingredient draft saved locally.' })).toBeVisible();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await openLabelIssues(page);
  await expect(page.getByRole('region', { name: 'Products and readiness' }).getByText('Illustrative carrier: nutrition information')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export Incomplete Review Copy PDF' })).toBeEnabled();
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await page.getByRole('navigation', { name: 'Product sections' }).getByRole('button', { name: 'Review', exact: true }).click();
  await expect(review.getByText('Required product draft information entered.')).not.toBeVisible();
  await review.getByText('Why does this need attention?', { exact: true }).last().click();
  await expect(review.getByText('Illustrative carrier: nutrition information', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Formulations', exact: true }).click();
  await page.getByRole('button', { name: 'Edit formulation Illustrative formulation' }).click();
  await openFormulationSection(page, 'Ingredients');
  await page.getByLabel('Line 1 quantity').fill('45');
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await page.getByRole('navigation', { name: 'Product sections' }).getByRole('button', { name: 'Review', exact: true }).click();
  await expect(review.getByText('Required product draft information entered.')).not.toBeVisible();
  const reason = review.getByText('Why does this need attention?', { exact: true }).last();
  if (!(await reason.locator('..').evaluate((element) => (element as HTMLDetailsElement).open))) await reason.click();
  await expect(review.getByText('Confirm that the recipe and nutrients represent the food as sold (pack details)', { exact: true })).toBeVisible();
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
