import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { openIngredientSection, openLabelNutrition, openLabelPackInformation, openLabelTab, openProductReview, openProductStep, openSavedLabel, openTechnicalReview, savedLabelOption, seedWorkedExamples } from './helpers';

test('label tabs retain pending edits, update artwork and protect unsaved claims', async ({ page }) => {
  await page.addInitScript(() => {
    const blobs = new Map<string, Promise<string>>();
    Object.defineProperty(window, '__testLabelBlobs', { value: blobs });
    const createUrl = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const url = createUrl(blob);
      if (blob instanceof Blob && blob.type === 'image/svg+xml') blobs.set(url, blob.text());
      return url;
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  const setup = page.getByRole('tab', { name: 'Label setup' });
  await setup.focus();
  await page.keyboard.press('End');
  const claims = page.getByRole('tab', { name: 'Claims', exact: true });
  await expect(claims).toBeFocused();
  await expect(claims).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Claims are not yet shown on the label preview or exported artwork.')).toHaveCount(2);
  await page.keyboard.press('Home');
  await expect(setup).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Ingredients & allergens' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Pack details' })).toBeFocused();
  await page.getByLabel('Lot identification text').fill('LOT-UXS8');
  const preview = page.getByRole('img', { name: 'Draft label layout for consultant review' });
  const previewUrl = await preview.getAttribute('src');
  await page.getByLabel('Lot identification text').fill('LOT-UXS8-UPDATED');
  await expect(preview).not.toHaveAttribute('src', previewUrl!);
  await openLabelTab(page, 'Claims');
  await page.getByRole('button', { name: 'Add a claim' }).click();
  await page.getByLabel('Claim 1 text (exactly as it appears)').fill('Low sugars');
  await page.getByLabel('Claim 1 type (your classification)').selectOption('nutrition_content');
  await openLabelTab(page, 'Pack details');
  await expect(page.getByLabel('Lot identification text')).toHaveValue('LOT-UXS8-UPDATED');
  await page.getByRole('button', { name: 'Save label draft', exact: true }).click();
  await openLabelTab(page, 'Claims');
  await expect(page.getByLabel('Claim 1 text (exactly as it appears)')).toHaveValue('Low sugars');
  const svg = await preview.evaluate(async (img: HTMLImageElement) =>
    (window as Window & { __testLabelBlobs: Map<string, Promise<string>> }).__testLabelBlobs.get(img.src));
  expect(svg).not.toContain('Low sugars');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download review report' }).click();
  const reportPath = await (await downloading).path();
  if (!reportPath) throw new Error('Review report was not saved locally.');
  expect((await readFile(reportPath)).toString('latin1')).toContain('Claims are not added to the draft label');
  await page.getByLabel('Claim 1 text (exactly as it appears)').fill('Low sugar');
  expect(await page.evaluate(() => window.dispatchEvent(new Event('beforeunload', { cancelable: true })))).toBe(false);
  page.once('dialog', (dialog) => void dialog.dismiss());
  await page.getByRole('button', { name: 'New label draft' }).click();
  await expect(page.getByLabel('Claim 1 text (exactly as it appears)')).toHaveValue('Low sugar');
  await page.getByLabel('Claim 1 text (exactly as it appears)').fill('Low sugars');

  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const editorBox = await page.locator('#label-editor').boundingBox();
    const previewBox = await page.locator('#label-preview').boundingBox();
    if (!editorBox || !previewBox) throw new Error('Label workspace layout is not visible.');
    if (width === 390) expect(previewBox.y).toBeGreaterThanOrEqual(editorBox.y + editorBox.height);
    else expect(previewBox.x).toBeGreaterThanOrEqual(editorBox.x + editorBox.width);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  }
  await expect(page.getByRole('link', { name: /View preview/ })).toBeVisible();
  await page.getByRole('link', { name: /View preview/ }).click();
  await expect(page.locator('#label-preview')).toBeFocused();
  await page.getByRole('link', { name: /Back to editing/ }).click();
  await expect(page.locator('#label-editor')).toBeFocused();
  await page.getByText('View missing information and review items').click();
  await page.getByRole('region', { name: 'Products and readiness' })
    .getByRole('button', { name: 'Edit label' }).first().click();
  await expect(page.getByRole('tab', { name: 'Claims' })).toHaveAttribute('aria-selected', 'true');
  await openLabelTab(page, 'Ingredients & allergens');
  await page.getByRole('button', { name: 'Edit linked recipe' }).click();
  await expect(page.getByLabel('Formulation name *')).toHaveValue('Illustrative formulation');
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await page.getByText('Edit an ingredient', { exact: true }).click();
  await page.getByRole('region', { name: 'Label settings' }).getByRole('button', { name: 'Edit ingredient Illustrative base' }).click();
  await expect(page.getByLabel('Ingredient name *')).toHaveValue('Illustrative base');
});

test('label settings work by keyboard on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Illustrative demo data loaded locally' })).toBeVisible();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await page.getByLabel('Label name').focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('Keyboard draft');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Show optional % Daily Intake (%DI)')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Width (mm)')).toBeFocused();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('90');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Height (mm)')).toBeFocused();
  await page.getByRole('button', { name: 'Save label draft', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(savedLabelOption(page, 'Keyboard draft')).toHaveCount(1);
  await expect(page.getByText('DRAFT SVG · 90 × 150 MM')).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
});

test('saves, duplicates and reopens custom labels without losing unsaved work', async ({ page }) => {
  await page.addInitScript(() => {
    const blobs = new Map<string, Promise<string>>();
    Object.defineProperty(window, '__testLabelBlobs', { value: blobs });
    const createUrl = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const url = createUrl(blob);
      if (blob instanceof Blob && blob.type === 'image/svg+xml') blobs.set(url, blob.text());
      return url;
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Illustrative demo data loaded locally' })).toBeVisible();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  const includeDailyIntake = page.getByLabel('Show optional % Daily Intake (%DI)');
  await expect(includeDailyIntake).toBeChecked();
  await includeDailyIntake.uncheck();
  await page.getByLabel('Label name').fill('Small pack');
  await page.getByLabel('Width (mm)').fill('80');
  await page.getByText('Advanced layout settings', { exact: true }).click();
  await page.getByLabel('Ingredients text size (mm)').fill('2');
  await expect(page.getByText('DRAFT SVG · 80 × 150 MM')).toBeVisible();
  const svg = await page.getByAltText('Draft label layout for consultant review').evaluate(async (img: HTMLImageElement) =>
    (window as Window & { __testLabelBlobs: Map<string, Promise<string>> }).__testLabelBlobs.get(img.src));
  expect(svg).toContain('width="80mm"');
  expect(svg).toContain('height="150mm"');
  expect(svg).not.toMatch(/DRAFT|consultant review required|Other label content may be missing/i);
  await expect(page.getByText('Draft for consultant review, not a finished food label.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export Incomplete Review Copy PDF' })).toBeEnabled();
  await page.getByRole('button', { name: 'Save label draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Label draft saved on this device' })).toBeVisible();
  await page.getByRole('button', { name: 'Duplicate label draft' }).click();
  await expect(page.getByLabel('Label name')).toHaveValue('Small pack copy');
  await expect(includeDailyIntake).not.toBeChecked();
  await page.getByLabel('Label name').fill('Large pack');
  await page.getByLabel('Width (mm)').fill('110');
  await page.getByRole('button', { name: 'Save label draft', exact: true }).click();
  await expect(savedLabelOption(page, 'Large pack')).toHaveCount(1);
  await page.getByLabel('Width (mm)').fill('115');
  expect(await page.evaluate(() => window.dispatchEvent(new Event('beforeunload', { cancelable: true })))).toBe(false);
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await expect(page.getByLabel('Width (mm)')).toHaveValue('115');
  page.once('dialog', (dialog) => void dialog.dismiss());
  await openSavedLabel(page, 'Small pack');
  await expect(page.getByLabel('Width (mm)')).toHaveValue('115');
  page.once('dialog', (dialog) => void dialog.accept());
  await openSavedLabel(page, 'Small pack');
  await expect(page.getByLabel('Width (mm)')).toHaveValue('80');
  await expect(includeDailyIntake).not.toBeChecked();
  await expect(page.getByLabel('Ingredients text size (mm)')).toHaveValue('2');
  await page.getByLabel('Width (mm)').fill('0');
  await expect(page.getByRole('alert')).toContainText('Width');
  const invalidDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download review report' }).click();
  const invalidPath = await (await invalidDownload).path();
  if (!invalidPath) throw new Error('Review report was not saved locally.');
  const invalidReport = (await readFile(invalidPath)).toString('latin1');
  expect(invalidReport).toContain('No label preview could be generated: Width must be greater than zero.');
  expect(invalidReport).not.toContain('Preview dimensions:');
  await page.getByRole('button', { name: 'Save label draft', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Width' }).first()).toBeVisible();
  await page.getByLabel('Width (mm)').fill('20');
  await expect(page.getByText('This draft does not fit the current layout.', { exact: false })).toBeVisible();
  const overflowDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Incomplete Review Copy PDF' }).click();
  const overflowPath = await (await overflowDownload).path();
  if (!overflowPath) throw new Error('The review copy was not saved locally.');
  expect((await readFile(overflowPath)).toString('latin1')).toMatch(/LINE_OVERFLOW|TITLE_OVERFLOW|BLOCK_OVERFLOW/);
  await page.getByLabel('Width (mm)').fill('80');
  await page.reload();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await openSavedLabel(page, 'Small pack');
  await expect(page.getByLabel('Width (mm)')).toHaveValue('80');
  await expect(page.getByRole('button', { name: 'Export Incomplete Review Copy PDF' })).toBeEnabled();
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
});

test('pack guidance stays illustrative and does not populate blank label copy', async ({ page }) => {
  await page.addInitScript(() => {
    const blobs = new Map<string, Promise<string>>();
    Object.defineProperty(window, '__testLabelBlobs', { value: blobs });
    const createUrl = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const url = createUrl(blob);
      if (blob instanceof Blob && blob.type === 'image/svg+xml') blobs.set(url, blob.text());
      return url;
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await page.getByLabel('Label name').fill('Blank pack guidance');
  await openLabelTab(page, 'Pack details');

  const fields = [
    'Supplier business name', 'Supplier business address', 'Lot identification text', 'Date marking text',
    'Storage instructions', 'Warning or advisory text (one statement per line)',
    'Precautionary allergen statement (optional)', 'Basis for the precautionary allergen statement',
  ];
  for (const name of fields) {
    const field = page.getByLabel(name, { exact: true });
    await expect(field).toHaveValue('');
    await expect(field).toHaveAccessibleDescription(/Example/i);
  }
  const statement = page.getByLabel('Precautionary allergen statement (optional)', { exact: true });
  const basis = page.getByLabel('Basis for the precautionary allergen statement', { exact: true });
  await expect(statement).toHaveAccessibleDescription(/shared equipment.*cross-contact.*does not replace required allergen declarations/i);
  await expect(statement).toHaveAccessibleDescription(/Leaving these fields blank does not mean there is no cross-contact risk/i);
  await expect(basis).toHaveAccessibleDescription(/both the statement and its basis.*review report, not on the label/i);
  await page.getByText('Pack copy review status', { exact: true }).click();
  await expect(page.getByRole('list', { name: 'Pack copy review status' }).getByText('Not entered', { exact: true })).toHaveCount(7);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  }
  const svg = await page.getByAltText('Draft label layout for consultant review').evaluate(async (img: HTMLImageElement) =>
    (window as Window & { __testLabelBlobs: Map<string, Promise<string>> }).__testLabelBlobs.get(img.src));
  expect(svg).not.toContain('Example Foods Pty Ltd');
  expect(svg).not.toContain('May be present: peanuts');
  await page.getByRole('button', { name: 'Save label draft', exact: true }).click();
  await expect(savedLabelOption(page, 'Blank pack guidance')).toHaveCount(1);
  const id = await page.getByLabel('Saved label draft').inputValue();
  const savedPackCopy = await page.evaluate(async (labelId) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('aus-food-labelling-v2');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const result = await new Promise<{ packCopy?: unknown }>((resolve, reject) => {
      const request = database.transaction('labels').objectStore('labels').get(labelId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return result.packCopy;
  }, id);
  expect(savedPackCopy).toBeUndefined();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download review report' }).click();
  const path = await (await download).path();
  if (!path) throw new Error('Review report was not saved locally.');
  const report = (await readFile(path)).toString('latin1');
  expect(report).not.toContain('Example Foods Pty Ltd');
  expect(report).not.toContain('May be present: peanuts');
  await page.reload();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await openSavedLabel(page, 'Blank pack guidance');
  await openLabelTab(page, 'Pack details');
  for (const name of fields) await expect(page.getByLabel(name, { exact: true })).toHaveValue('');
});

test('previews, saves and reports user-entered pack copy without resolving applicability', async ({ page }) => {
  await page.addInitScript(() => {
    const blobs = new Map<string, Promise<string>>();
    Object.defineProperty(window, '__testLabelBlobs', { value: blobs });
    const createUrl = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const url = createUrl(blob);
      if (blob instanceof Blob && blob.type === 'image/svg+xml') blobs.set(url, blob.text());
      return url;
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Illustrative demo data loaded locally' })).toBeVisible();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await page.getByLabel('Label name').fill('Pack copy draft');
  await openLabelTab(page, 'Pack details');
  await page.getByText('Pack copy review status', { exact: true }).click();
  await expect(page.getByRole('list', { name: 'Pack copy review status' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Pack copy review status' }).getByText('Not entered').first()).toBeVisible();
  await page.getByLabel('Supplier business name').fill('Local Foods Ltd');
  await page.getByLabel('Supplier business address').fill('1 Market Road\nMelbourne VIC');
  await page.getByLabel('Lot identification text').fill('Lot A17');
  await page.getByLabel('Date marking text').fill('Best before 12 MAY 2027');
  await page.getByLabel('Storage instructions').fill('Keep refrigerated.');
  await page.getByLabel('Warning or advisory text (one statement per line)').fill('Keep chilled.\nContains an advisory.');
  await page.getByLabel('Precautionary allergen statement (optional)').fill('May contain peanuts.');
  await expect(page.getByRole('region', { name: 'Label settings' })
    .getByText('Enter both a precautionary allergen statement and its basis')).toBeVisible();
  await page.getByLabel('Basis for the precautionary allergen statement').fill('Recorded cross-contact assessment on 2026-01-01.');
  await expect(page.getByText(/An allergen can accidentally get into food/)).toBeVisible();
  const svg = await page.getByAltText('Draft label layout for consultant review').evaluate(async (img: HTMLImageElement) =>
    (window as Window & { __testLabelBlobs: Map<string, Promise<string>> }).__testLabelBlobs.get(img.src));
  expect(svg).toContain('data-block-kind="supplierDetails"');
  expect(svg).toContain('data-block-kind="lotIdentification"');
  expect(svg).toContain('data-block-kind="dateMarking"');
  expect(svg).toContain('data-block-kind="storageDirections"');
  expect(svg).toContain('data-block-kind="warnings"');
  expect(svg).toContain('data-block-id="precautionary-allergen-statement"');
  expect(svg).toContain('Lot A17');
  expect(svg).toContain('Keep chilled.');
  expect(svg).toContain('May contain peanuts.');
  expect(svg).not.toContain('Recorded cross-contact assessment');
  await openLabelPackInformation(page);
  await expect(page.getByText('no lot code is generated or validated', { exact: false })).toBeVisible();
  await expect(page.getByText('an empty field does not establish that no statement applies', { exact: false })).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.getByRole('button', { name: 'Save label draft', exact: true }).click();
  await expect(savedLabelOption(page, 'Pack copy draft')).toHaveCount(1);
  const reportDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download review report' }).click();
  const reportPath = await (await reportDownload).path();
  if (!reportPath) throw new Error('Review report was not saved locally.');
  const report = (await readFile(reportPath)).toString('latin1');
  expect(report).toContain('Local Foods Ltd');
  expect(report).toContain('Lot A17');
  expect(report).toContain('Best before 12 MAY 2027');
  expect(report).toContain('Keep refrigerated.');
  expect(report).toContain('Contains an advisory.');
  expect(report).toContain('May contain peanuts.');
  expect(report).toContain('Recorded cross-contact assessment on 2026-01-01.');
  expect(report).toContain('not assessed or calculated');
  await page.getByRole('button', { name: 'Duplicate label draft' }).click();
  await expect(page.getByLabel('Lot identification text')).toHaveValue('Lot A17');
  await openLabelTab(page, 'Label setup');
  await page.getByLabel('Label name').fill('Pack copy alternate');
  await openLabelTab(page, 'Pack details');
  await page.getByLabel('Lot identification text').fill('Lot B18');
  await page.getByRole('button', { name: 'Save label draft', exact: true }).click();
  await expect(savedLabelOption(page, 'Pack copy alternate')).toHaveCount(1);
  await openSavedLabel(page, 'Pack copy draft');
  await expect(page.getByLabel('Lot identification text')).toHaveValue('Lot A17');
  await page.reload();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await openSavedLabel(page, 'Pack copy draft');
  await openLabelTab(page, 'Pack details');
  await expect(page.getByLabel('Supplier business name')).toHaveValue('Local Foods Ltd');
  await expect(page.getByLabel('Supplier business address')).toHaveValue('1 Market Road\nMelbourne VIC');
  await expect(page.getByLabel('Lot identification text')).toHaveValue('Lot A17');
  await expect(page.getByLabel('Date marking text')).toHaveValue('Best before 12 MAY 2027');
  await expect(page.getByLabel('Storage instructions')).toHaveValue('Keep refrigerated.');
  await expect(page.getByLabel('Warning or advisory text (one statement per line)')).toHaveValue('Keep chilled.\nContains an advisory.');
  await expect(page.getByLabel('Precautionary allergen statement (optional)')).toHaveValue('May contain peanuts.');
  await expect(page.getByLabel('Basis for the precautionary allergen statement')).toHaveValue('Recorded cross-contact assessment on 2026-01-01.');
});

test('does not reassign a label whose product is missing', async ({ page }) => {
  await page.goto('/');
  await seedWorkedExamples(page);
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  const productId = await page.getByLabel('Product draft').inputValue();
  await page.getByLabel('Label name').fill('Missing product label');
  await page.getByRole('button', { name: 'Save label draft', exact: true }).click();
  await expect(savedLabelOption(page, 'Missing product label')).toHaveCount(1);
  await page.getByLabel('Width (mm)').fill('90');
  page.once('dialog', (dialog) => void dialog.dismiss());
  await page.getByLabel('Product draft').selectOption({ index: 1 });
  await expect(page.getByLabel('Product draft')).toHaveValue(productId);
  await expect(page.getByLabel('Width (mm)')).toHaveValue('90');
  await page.getByLabel('Width (mm)').fill('100');
  await page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('aus-food-labelling-v2');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('products', 'readwrite');
      transaction.objectStore('products').delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  }, productId);
  await page.reload();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await openSavedLabel(page, 'Missing product label');
  await expect(page.getByText('The associated product is missing', { exact: false })).toBeVisible();
  await expect(page.getByLabel('Product draft')).toHaveValue(productId);
  await expect(page.getByRole('region', { name: 'Label settings' })).not.toBeVisible();
});

test('preserves open settings when a restore replaces the saved label', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Illustrative demo data loaded locally' })).toBeVisible();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await page.getByLabel('Label name').fill('Restore example');
  await page.getByRole('button', { name: 'Save label draft', exact: true }).click();
  await expect(savedLabelOption(page, 'Restore example')).toHaveCount(1);
  await page.getByRole('button', { name: 'Backup & restore' }).click();
  const download = page.waitForEvent('download');
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Download unencrypted backup' }).click();
  const path = await (await download).path();
  if (!path) throw new Error('Backup was not saved locally.');
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await page.getByLabel('Width (mm)').fill('110');
  await page.getByRole('button', { name: 'Save label draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Label draft saved on this device' })).toBeVisible();
  await page.getByRole('button', { name: 'Backup & restore' }).click();
  await page.getByLabel('Workspace backup file').setInputFiles(path);
  await page.getByRole('button', { name: 'Inspect backup' }).click();
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Confirm and replace workspace' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Existing records were replaced by the verified backup' })).toBeVisible();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await expect(page.getByText('The saved label was replaced or changed elsewhere.', { exact: false })).toBeVisible();
  await expect(page.getByLabel('Width (mm)')).toHaveValue('110');
  await page.getByLabel('Label name').fill('Preserved settings');
  await page.getByRole('button', { name: 'Save as new label draft' }).click();
  await expect(savedLabelOption(page, 'Preserved settings')).toHaveCount(1);
  await openSavedLabel(page, 'Restore example');
  await expect(page.getByLabel('Width (mm)')).toHaveValue('100');
});

test('warns when a saved label dependency changes and restores labels in backups', async ({ browser }) => {
  const source = await browser.newContext();
  const target = await browser.newContext();
  try {
    const page = await source.newPage();
    await page.goto('/');
    await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Illustrative demo data loaded locally' })).toBeVisible();
    await page.getByRole('button', { name: 'Labels', exact: true }).click();
    await page.getByLabel('Label name').fill('Saved layout');
    await page.getByRole('button', { name: 'Save label draft', exact: true }).click();
    await expect(savedLabelOption(page, 'Saved layout')).toHaveCount(1);
    await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
    await page.getByRole('button', { name: 'Edit ingredient Illustrative base' }).click();
    await page.getByLabel('Ingredient name *').fill('Changed base');
    await page.getByRole('button', { name: 'Save ingredient draft' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Ingredient draft saved locally.' })).toBeVisible();
    await page.getByRole('button', { name: 'Labels', exact: true }).click();
    await expect(page.getByText(/dependencies have changed since this label was saved/)).toBeVisible();
    await openLabelTab(page, 'Ingredients & allergens');
    await expect(page.getByRole('region', { name: 'Draft declaration' })).toContainText('Changed base');
    const reportDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download review report' }).click();
    const reportPath = await (await reportDownload).path();
    if (!reportPath) throw new Error('Review report was not saved locally.');
    const report = (await readFile(reportPath)).toString('latin1');
    expect(report).toContain('dependencies changed since this label was saved');
    expect(report).toContain('Changed base');
    await page.getByRole('button', { name: 'Backup & restore' }).click();
    const download = page.waitForEvent('download');
    page.once('dialog', (dialog) => void dialog.accept());
    await page.getByRole('button', { name: 'Download unencrypted backup' }).click();
    const path = await (await download).path();
    if (!path) throw new Error('Backup was not saved locally.');
    const restored = await target.newPage();
    await restored.goto('/');
    await restored.getByRole('button', { name: 'Backup & restore' }).click();
    await restored.getByLabel('Workspace backup file').setInputFiles(path);
    await restored.getByRole('button', { name: 'Inspect backup' }).click();
    await expect(restored.getByText(/1 label drafts/)).toBeVisible();
    restored.once('dialog', (dialog) => void dialog.accept());
    await restored.getByRole('button', { name: 'Confirm restore to this device' }).click();
    await expect(restored.getByRole('status').filter({ hasText: 'Workspace restored from the verified backup' })).toBeVisible();
    await restored.getByRole('button', { name: 'Labels', exact: true }).click();
    await openSavedLabel(restored, 'Saved layout');
    await expect(restored.getByText(/dependencies have changed since this label was saved/)).toBeVisible();
    await expect(restored.getByLabel('Product draft').locator('option:checked')).toHaveText('Illustrative demo product');
  } finally {
    await source.close();
    await target.close();
  }
});

test('product builder accepts unsourced answers and has no accessibility violations', async ({
  page,
}) => {
  await page.goto('/');
  await seedWorkedExamples(page);

  await openProductStep(page, 'Example Citrus Boost', 'What is it?');
  await page.getByLabel('What kind of product is this?').selectOption('caffeinatedBeverage');
  await expect(page.getByText('0 of 4 questions answered.')).toBeVisible();

  const flavoured = page.getByLabel('Is the drink flavoured?');
  await flavoured.selectOption('yes');
  await expect(page.getByText('1 of 4 questions answered.')).toBeVisible();
  await page.getByLabel('Is the drink non-alcoholic?').selectOption('yes');
  await page.getByLabel('Does the drink contain caffeine?').selectOption('yes');
  await page.getByLabel('Does the pack or marketing say it improves mental performance?').selectOption('no');
  await expect(page.getByText('4 of 4 questions answered.')).toBeVisible();
  await expect(page.getByLabel('Is the drink flavoured?')).toHaveValue('yes');
  await page.getByLabel('What kind of product is this?').selectOption('other');
  await expect(page.getByText(/No specialised questions are available/)).toBeVisible();
  await expect(page.getByLabel('Is the drink flavoured?')).toHaveCount(0);
  await expect(page.getByLabel('Is it an infant formula?')).toHaveCount(0);
  await expect(page.locator('#product-section-type').getByText('Saved on this device.')).toBeVisible();
  await page.reload();
  await openProductStep(page, 'Example Citrus Boost', 'What is it?');
  await expect(page.getByLabel('What kind of product is this?')).toHaveValue('other');
  await expect(page.getByLabel('Is the drink flavoured?')).toHaveCount(0);
  await expect(page.getByLabel('Is it an infant formula?')).toHaveCount(0);
  await page.getByLabel('What kind of product is this?').selectOption('infantFood');
  await expect(page.getByLabel('Is it an infant formula?')).toBeVisible();
  await expect(page.getByLabel('Is the drink flavoured?')).toHaveCount(0);
  await page.getByLabel('What kind of product is this?').selectOption('caffeinatedBeverage');
  await expect(page.getByLabel('Is the drink flavoured?')).toHaveValue('yes');
  await expect(
    page.locator('#product-section-type > summary'),
  ).toContainText('Answered');

  // Answers are saved on the product, so they survive a reload.
  await page.reload();
  await openProductStep(page, 'Example Citrus Boost', 'What is it?');
  await expect(page.getByLabel('What kind of product is this?')).toHaveValue('caffeinatedBeverage');
  await expect(page.getByText('4 of 4 questions answered.')).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
});

test('caffeine check and review report remain unresolved without complete recipe evidence', async ({ page }) => {
  await page.goto('/');
  await seedWorkedExamples(page);
  await openProductStep(page, 'Example Citrus Boost', 'What is it?');
  await page.getByLabel('What kind of product is this?').selectOption('caffeinatedBeverage');
  await expect(page.getByText('Saved on this device.')).toBeVisible();
  await page.getByRole('navigation', { name: 'Product sections' }).getByRole('button', { name: 'Review', exact: true }).click();
  const check = page.getByRole('region', { name: 'Caffeine concentration check' });
  await expect(check).toContainText('REVIEW REQUIRED');
  await expect(check).toContainText('Caffeine content is not established');
  await expect(check).toContainText('provisional');
  await expect(check).not.toContainText('WITHIN RANGE');
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await page.getByLabel('Product draft').selectOption({ label: 'Example Citrus Boost' });
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download review report' }).click();
  const reportPath = await (await downloadPromise).path();
  if (!reportPath) throw new Error('Review report was not saved locally.');
  const report = (await readFile(reportPath)).toString('latin1');
  expect(report).toContain('Caffeine concentration');
  expect(report).toContain('Caffeine content is not established');
  expect(report).toContain('F2015L00467');
  expect(report).not.toContain('WITHIN RANGE');
});

test('complete user-entered caffeine inputs show the calculation while the rule period is stale', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const harness = await import('/e2e/caffeine-check-harness.ts');
    await harness.seedCaffeineRangeCase();
  });
  await page.reload();
  await openProductStep(page, 'Provisional caffeine test drink', 'Review');
  const check = page.getByRole('region', { name: 'Caffeine concentration check' });
  await expect(check).toContainText('REVIEW REQUIRED');
  await expect(check).toContainText('outside the verified rule period');
  await expect(check).toContainText('provisional');
  await expect(check).toContainText('does not certify legal compliance');
  await expect(check).toContainText('Source references are optional');
  await check.getByText('Source and limitations').click();
  await expect(check).toContainText('Evaluated total caffeine: 300 mg/L');
  await expect(check).toContainText('not supplied (user-entered or calculated)');
  await expect(check).toContainText('not assess caffeine-source permissions');
});

test('keeps earlier classification sources separate when an answer changes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await openProductStep(page, 'Illustrative demo product', 'What is it?');
  await page.getByLabel('What kind of product is this?').selectOption('caffeinatedBeverage');
  await page.locator('#product-section-type').getByText('Source details (optional)', { exact: true }).click();
  await page.getByLabel('Where is your information coming from?').selectOption('productBrief');
  await page.getByLabel('Is the drink flavoured?').selectOption('yes');
  await expect(page.getByText('1 of 4 questions answered.')).toBeVisible();
  await page.reload();
  await openProductStep(page, 'Illustrative demo product', 'What is it?');
  await page.getByLabel('Is the drink flavoured?').selectOption('no');
  const earlier = page.getByText(/Earlier source details \(not attached to this answer\)/);
  await expect(earlier).toContainText('Product brief');
  await expect(page.locator('#product-section-type').getByText('Saved on this device.')).toBeVisible();
  await page.reload();
  await openProductStep(page, 'Illustrative demo product', 'What is it?');
  await expect(page.getByLabel('Is the drink flavoured?')).toHaveValue('no');
  await expect(page.getByText(/Earlier source details \(not attached to this answer\)/)).toContainText('Product brief');
});

test('review shows concise missing information and keeps technical edit links accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await openProductReview(page, 'Illustrative demo product');
  const review = page.locator('#product-section-review');
  await expect(review.getByRole('heading', { name: 'Product information check' })).toBeVisible();
  await expect(review.getByText('Nutrition or customer directions need attention.')).toBeVisible();
  await expect(review.getByText(/not legal clearance/)).toBeVisible();
  await expect(review.getByRole('heading', { name: /Input trace:/ })).not.toBeVisible();
  await review.getByText('Why does this need attention?', { exact: true }).last().click();
  await expect(review.getByRole('button', { name: 'Edit ingredient Illustrative base' }).first()).toBeVisible();
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).resolves.toBe(true);
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);

  await page.getByLabel('Product name *').fill('Unsaved product name');
  await expect(review.getByText(/This review uses saved information/)).toBeVisible();
  await review.getByRole('button', { name: 'Open product type' }).first().click();
  await expect(page.locator('#product-section-type > summary')).toBeFocused();
  await page.getByLabel('What kind of product is this?').selectOption('other');
  await expect(page.getByLabel('Product name *')).toHaveValue('Unsaved product name');
  await page.getByRole('navigation', { name: 'Product sections' }).getByRole('button', { name: 'Review', exact: true }).click();
  await openTechnicalReview(page);
  await review.getByText('Other draft review items', { exact: true }).click();
  const ingredientGroup = review.locator('details.review-group').filter({ hasText: 'Ingredient information' });
  await ingredientGroup.locator('summary').click();
  await ingredientGroup.locator('li').filter({ hasText: 'Illustrative base: confirm the allergen information' })
    .getByRole('button', { name: 'Edit ingredient Illustrative base' }).click();
  await expect(page.getByLabel('Ingredient name *')).toHaveValue('Illustrative base');
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await expect(page.getByLabel('Product name *')).toHaveValue('Unsaved product name');
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await expect(review.getByText(/This review uses saved information/)).not.toBeVisible();
});

test('review does not hide allergens needing final-food assessment', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Edit ingredient Illustrative base' }).click();
  await openIngredientSection(page, 'Allergens');
  await page.getByLabel('Sulphites', { exact: true }).check();
  await page.getByLabel(/I confirm that ticked allergens are present/).check();
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await openProductReview(page, 'Illustrative demo product');
  await openTechnicalReview(page);
  await page.getByText('Allergen evidence and paths', { exact: true }).click();
  await expect(page.getByText('Also needing final-food review: sulphites.')).toBeVisible();
});

test('keeps product selection, unsaved edits and historical results in contextual review', async ({ page, browser }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Illustrative demo data loaded locally' })).toBeVisible();
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('aus-food-labelling-v2');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(['products', 'approvedVersions', 'reviewDecisions'], 'readwrite');
      const request = transaction.objectStore('products').get('demo-product');
      request.onsuccess = () => {
        const id = 'product:demo-product:1';
        const decision = {
          id: `decision:${id}`, versionId: id, decision: 'approved', reviewerId: 'test-reviewer',
          decidedAt: '2026-01-02T00:00:00.000Z', rationale: 'Synthetic test review.',
        };
        transaction.objectStore('approvedVersions').add({
          id, recordType: 'product', recordId: 'demo-product', version: 1,
          approvedAt: '2026-01-02T00:00:00.000Z', approvedBy: 'test-reviewer',
          reviewDecision: decision, snapshot: request.result,
          results: [{
            title: 'Historical test result', whatWasChecked: 'Saved test input',
            explanation: 'Historical explanation', status: 'REVIEW REQUIRED', applicationMode: 'CANDIDATE',
            rule: {
              id: 'test.rule', name: 'Historical test rule', instrument: 'Test instrument',
              provision: 'Test provision', sourceUrl: 'https://example.test/source',
              jurisdiction: 'Test jurisdiction', effectiveFrom: '2026-01-01',
              version: 'test-version-1', mappingConfidence: 'Provision',
            },
            inputs: [{
              name: 'Saved input', value: 'original value', sourceId: 'test-source',
              sourceDate: '2026-01-01', sourcePath: ['demo-product'],
            }],
            nonCertificationStatement: 'This result assists review and does not certify legal compliance.',
          }],
        });
        transaction.objectStore('reviewDecisions').add(decision);
      };
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  });
  await page.reload();
  await openProductReview(page, 'Illustrative demo product');
  await expect(page.getByText('Historical explanation')).not.toBeVisible();
  await openTechnicalReview(page);
  await expect(page.getByText('Version 1 · 2026-01-02T00:00:00.000Z')).toBeVisible();
  await expect(page.getByText('Historical explanation')).toBeVisible();
  await expect(page.getByText(/Historical test rule.*test-version-1/)).toBeVisible();
  await page.getByText('Inspect 1 traced input').click();
  await expect(page.getByText(/Saved input: original value.*test-source/)).toBeVisible();
  await page.getByLabel('Product name *').fill('Current product');
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await expect(page.getByText(/Saved input: original value.*test-source/)).toBeVisible();
  await page.getByRole('button', { name: 'Open Labels' }).click();
  await expect(page.getByLabel('Product draft').locator('option:checked')).toHaveText('Current product');
  await page.getByRole('button', { name: 'Review product checks and evidence' }).click();
  await expect(page.locator('#product-section-review > summary')).toBeFocused();
  await openTechnicalReview(page);
  await expect(page.getByRole('heading', { name: 'Input trace: Current product' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to product list' }).click();
  await page.getByRole('button', { name: 'Add product' }).click();
  await page.getByLabel('Product name *').fill('Second product');
  await page.getByLabel('Recipe (formulation) *').selectOption({ label: 'Illustrative formulation' });
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await page.getByLabel('Product name *').fill('Unsaved second product');
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await expect(page.getByLabel('Product draft').locator('option:checked')).toHaveText('Second product');
  await expect(page.getByText('This label uses the saved product. Save the Product page changes to include them.')).toBeVisible();
  await page.getByLabel('Product draft').selectOption({ label: 'Current product' });
  await expect(page.getByText('This label uses the saved product. Save the Product page changes to include them.')).toHaveCount(0);
  page.once('dialog', (dialog) => void dialog.dismiss());
  await page.getByRole('button', { name: 'Review product checks and evidence' }).click();
  await expect(page.getByRole('heading', { name: 'Labels' })).toBeVisible();
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await expect(page.getByLabel('Product name *')).toHaveValue('Unsaved second product');
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Review product checks and evidence' }).click();
  await openTechnicalReview(page);
  await expect(page.getByRole('heading', { name: 'Input trace: Current product' })).toBeVisible();
  await expect(page.getByText('Historical explanation')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review & trace' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Backup & restore' }).click();
  page.once('dialog', (dialog) => void dialog.accept());
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download unencrypted backup' }).click();
  const backupPath = await (await downloading).path();
  if (!backupPath) throw new Error('Review history backup was not downloaded.');
  const restored = await browser.newContext();
  try {
    const restoredPage = await restored.newPage();
    await restoredPage.goto('/');
    await restoredPage.getByRole('button', { name: 'Backup & restore' }).click();
    await restoredPage.getByLabel('Workspace backup file').setInputFiles(backupPath);
    await restoredPage.getByRole('button', { name: 'Inspect backup' }).click();
    restoredPage.once('dialog', (dialog) => void dialog.accept());
    await restoredPage.getByRole('button', { name: 'Confirm restore to this device' }).click();
    await expect(restoredPage.getByRole('status').filter({ hasText: 'Workspace restored from the verified backup' })).toBeVisible();
    await openProductReview(restoredPage, 'Current product');
    await openTechnicalReview(restoredPage);
    await expect(restoredPage.getByText('Historical explanation')).toBeVisible();
    await restoredPage.getByText('Inspect 1 traced input').click();
    await expect(restoredPage.getByText(/Saved input: original value.*test-source/)).toBeVisible();
  } finally {
    await restored.close();
  }
});

test('a new product is built on one page, with pack details saved and edited', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Illustrative demo data loaded locally' }))
    .toBeVisible();

  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await page.getByRole('button', { name: 'Add product' }).click();

  // The specialised questions wait until a product is saved.
  await page.getByRole('navigation', { name: 'Product sections' }).getByRole('button', { name: 'What is it?' }).click();
  await expect(page.getByText(/Save the product draft before answering these questions/).first()).toBeVisible();
  await page.getByRole('navigation', { name: 'Product sections' }).getByRole('button', { name: 'Product and recipe' }).click();

  await page.getByLabel('Product name *').fill('Berry blast');
  await page.getByLabel('Recipe (formulation) *').selectOption({ label: 'Illustrative formulation' });
  await page.getByLabel('What does the label tell customers to do before consuming this product?').selectOption('none');
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await expect(page.getByLabel('What kind of product is this?')).toBeVisible();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await expect(page.getByLabel('Product name *')).toHaveValue('Berry blast');

  await page.getByRole('navigation', { name: 'Product sections' }).getByRole('button', { name: 'Customer directions and nutrition' }).click();
  await page.getByLabel('Serving size', { exact: true }).fill('250');
  await page.getByLabel('Serving size unit').selectOption('mL');
  await page.getByLabel('Servings per pack').fill('2');
  await page.getByLabel('Net contents', { exact: true }).fill('500');
  await page.getByLabel('Net contents unit').selectOption('mL');
  await page.getByLabel('Is the food solid or liquid?').selectOption('liquid');
  await page.getByLabel('Final food density (g/mL)').fill('1.1');
  await page.getByText('Density source details (optional)', { exact: true }).click();
  await page.getByLabel('Density evidence reference').fill('Density test');
  await page.getByLabel('Density evidence date').fill('2026-01-01');
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await expect(page.getByText('Saved on this device.')).toBeVisible();
  await expect(
    page.locator('#product-section-pack > summary'),
  ).toContainText('Answered');

  // A bad amount is explained in plain English and not saved.
  await page.getByLabel('Serving size', { exact: true }).fill('-5');
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await expect(page.getByRole('alert')).toContainText('positive numbers');

  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Back to product list' }).click();
  await expect(page.getByRole('region', { name: 'Products', exact: true }).getByText('Berry blast', { exact: true })).toBeVisible();

  // Pack details are still there when the product is reopened.
  await openProductStep(page, 'Berry blast', 'Customer directions and nutrition');
  await expect(page.getByLabel('Serving size', { exact: true })).toHaveValue('250');
  await expect(page.getByLabel('Serving size unit')).toHaveValue('mL');
  await expect(page.getByLabel('Net contents unit')).toHaveValue('mL');
});

test('offers a confirmable as-sold pack suggestion without overwriting entered contents', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await page.getByRole('button', { name: 'Add product' }).click();
  await page.getByLabel('Product name *').fill('Suggested pack');
  await page.getByLabel('Recipe (formulation) *').selectOption({ label: 'Illustrative formulation' });
  await page.getByLabel('Serving size', { exact: true }).fill('0.1');
  await page.getByLabel('Servings per pack').fill('3');
  await expect(page.getByRole('button', { name: /for net contents/ })).toHaveCount(0);
  await page.getByLabel('Serving size unit').selectOption('g');
  await expect(page.getByText(/Servings may be approximate/)).toBeVisible();
  await expect(page.getByLabel('Net contents', { exact: true })).toHaveValue('');
  await page.getByLabel('Net contents unit').selectOption('mL');
  await expect(page.getByRole('button', { name: /for net contents/ })).toHaveCount(0);
  await page.getByLabel('Net contents unit').selectOption('');
  await page.getByRole('navigation', { name: 'Product sections' }).getByRole('button', { name: 'Customer directions and nutrition' }).click();
  await expect(page.getByText('Saved nutrition basis (advanced)')).toHaveCount(0);
  await expect(page.getByText('Nutrition evidence from the saved recipe')).toHaveCount(0);
  await expect(page.getByLabel('Previously recorded food state')).toHaveCount(0);
  await page.getByLabel('Net contents', { exact: true }).fill('1');
  await expect(page.getByRole('button', { name: /for net contents/ })).toHaveCount(0);
  await page.getByLabel('Net contents', { exact: true }).clear();
  const suggestion = page.getByRole('button', { name: 'Use 0.3 g for net contents' });
  await expect(suggestion).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await suggestion.click();
  await expect(page.getByLabel('Net contents', { exact: true })).toHaveValue('0.3');
  await expect(page.getByLabel('Net contents unit')).toHaveValue('g');
  await page.getByLabel('Servings per pack').fill('4');
  await expect(page.getByLabel('Net contents', { exact: true })).toHaveValue('0.3');
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await expect(page.getByText('Saved on this device.')).toBeVisible();
  await page.getByRole('button', { name: 'Back to product list' }).click();
  await openProductStep(page, 'Suggested pack', 'Pack and servings');
  await expect(page.getByLabel('Net contents', { exact: true })).toHaveValue('0.3');
  await expect(page.getByLabel('Net contents unit')).toHaveValue('g');
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await page.getByLabel('Product draft').selectOption({ label: 'Suggested pack' });
  await openLabelPackInformation(page);
  await expect(page.getByRole('region', { name: 'Draft pack information' })).toContainText('Net contents: 0.3 g');
});

test('preserves unsaved Product edits across recipe navigation and other saves', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await page.getByRole('button', { name: 'Edit product Illustrative demo product' }).click();

  await page.getByLabel('Product name *').fill('Unsaved product name');
  await page.getByLabel('What does the label tell customers to do before consuming this product?').selectOption('present');
  await page.getByLabel('Mix with water or another food or liquid').check();
  await page.getByLabel('Drain', { exact: true }).check();
  await page.getByLabel('Other or unclear directions').check();
  await page.getByLabel('Other directions (if known)').fill('Warm gently.');
  await expect(page.getByText('Other or unclear directions need review.').first()).toBeVisible();
  await page.getByRole('button', { name: 'Open recipe' }).click();
  await expect(page.getByLabel('Formulation name *')).toHaveValue('Illustrative formulation');
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await expect(page.getByLabel('Product name *')).toHaveValue('Unsaved product name');
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await expect(page.locator('.product-save-bar').getByText('Saved on this device.')).toBeVisible();
  await page.getByRole('button', { name: 'Back to product list' }).click();
  await openProductStep(page, 'Unsaved product name', 'Customer directions and nutrition');
  await expect(page.getByLabel('Mix with water or another food or liquid')).toBeChecked();
  await expect(page.getByLabel('Drain', { exact: true })).toBeChecked();
  await expect(page.getByLabel('Other directions (if known)')).toHaveValue('Warm gently.');
});

test('keeps unsaved classification sources when other product fields are saved', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await openProductStep(page, 'Illustrative demo product', 'What is it?');
  await page.getByLabel('What kind of product is this?').selectOption('caffeinatedBeverage');
  await expect(page.locator('#product-section-type').getByText('Saved on this device.')).toBeVisible();
  await page.locator('#product-section-type').getByText('Source details (optional)', { exact: true }).click();
  await page.getByLabel('Where is your information coming from?').selectOption('productBrief');
  page.once('dialog', (dialog) => void dialog.dismiss());
  await page.getByRole('button', { name: 'Back to product list' }).click();
  await expect(page.getByLabel('Where is your information coming from?')).toHaveValue('productBrief');
  await page.getByLabel('Is the drink flavoured?').selectOption('yes');
  await expect(page.getByText('1 of 4 questions answered.')).toBeVisible();
  await page.getByLabel('Source date (optional)').fill('2026-01-01');

  await page.getByRole('button', { name: 'Save product draft' }).click();
  await expect(page.getByLabel('Where is your information coming from?')).toHaveValue('productBrief');
  page.once('dialog', (dialog) => void dialog.dismiss());
  await page.getByRole('button', { name: 'Back to product list' }).click();
  await expect(page.getByLabel('Where is your information coming from?')).toHaveValue('productBrief');
  await expect(page.getByLabel('Source date (optional)')).toHaveValue('2026-01-01');
});

test('does not infer no directions for a new product', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await page.getByRole('button', { name: 'Add product' }).click();
  await page.getByLabel('Product name *').fill('Directions unknown');
  await page.getByLabel('Recipe (formulation) *').selectOption({ label: 'Illustrative formulation' });
  await expect(page.getByLabel('What does the label tell customers to do before consuming this product?')).toHaveValue('unknown');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await expect(page.getByRole('button', { name: 'Save product draft' })).toBeInViewport();
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await page.getByLabel('Product draft').selectOption({ label: 'Directions unknown' });
  await page.getByText('View missing information and review items').click();
  await expect(page.getByRole('region', { name: 'Products and readiness' }))
    .toContainText('Confirm what the label tells customers to do before consuming');
  await openLabelNutrition(page);
  await expect(page.getByRole('table', { name: 'Draft nutrition information' })).toContainText('Not available');
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await expect(page.getByLabel('What does the label tell customers to do before consuming this product?')).toHaveValue('unknown');
});
