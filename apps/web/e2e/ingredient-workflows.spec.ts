import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { expect, test, type Page } from '@playwright/test';
import { openAdditiveReview, openFinishedBatchDetail, openFormulationSection, openIngredientSection, openLabelIssues, openLabelNutrition, openLabelPackInformation, openLabelTab, openProductReview, openProductStep, openSavedLabel, openTechnicalReview, openTraceSection, savedLabelOption } from './helpers';

async function checkAccessibility(page: Page, screen: string): Promise<void> {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(result.violations, `${screen}: ${result.violations.map((item) => item.id).join(', ')}`).toEqual([]);
}

async function downloadReviewReport(page: Page): Promise<string> {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download review report' }).click();
  const path = await (await download).path();
  if (!path) throw new Error('The review report was not saved.');
  return (await readFile(path)).toString('latin1');
}

async function createIngredient(
  page: Page,
  name: string,
  values: readonly string[],
  options: { wheat?: boolean; additive?: boolean; noSources?: boolean } = {},
): Promise<void> {
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill(name);
  await page.getByLabel('Ingredient type').selectOption(options.additive ? 'additive' : 'atomic');
  if (options.additive) {
    await page.getByLabel('Additive code number (if known)').fill('999');
    await page.getByText('Additive level for use checks (optional)').click();
    await page.getByLabel('Additive concentration', { exact: true }).fill('100');
    await page.getByLabel('Additive concentration unit').selectOption('percentByMass');
    await page.getByLabel('What does this concentration describe?').selectOption('asSupplied');
  }
  await page.getByLabel(/I have identified all additives in this ingredient/).check();
  await openIngredientSection(page, 'Nutrition');
  if (!options.noSources) {
    await page.getByLabel('Nutrition source type').selectOption('user');
    await page.getByLabel('Nutrition source reference').fill('Invented test values');
    await page.getByLabel('Nutrition source date').fill('2026-01-01');
  }
  const names = ['Energy', 'Protein', 'Fat, total', 'Saturated fat', 'Carbohydrate', 'Sugars', 'Sodium'];
  for (const [index, nameOfValue] of names.entries()) {
    await page.getByRole('textbox', { name: nameOfValue, exact: false }).fill(values[index]!);
  }
  await openIngredientSection(page, 'Allergens');
  if (!options.noSources) {
    await page.getByLabel('Allergen source type').selectOption('user');
    await page.getByLabel('Allergen source reference').fill('Invented test values');
    await page.getByLabel('Allergen source date').fill('2026-01-01');
  }
  if (options.wheat) {
    await page.getByLabel('Wheat', { exact: true }).check();
    await page.getByLabel('Does this wheat-containing ingredient contain gluten?').selectOption('present');
  }
  await page.getByLabel(/I confirm that ticked allergens are present/).check();
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Ingredient draft saved locally.' })).toBeVisible();
}

async function createRecipe(page: Page, name: string, lines: readonly [string, string][]): Promise<void> {
  await page.getByRole('button', { name: 'Add formulation' }).click();
  await page.getByLabel('Formulation name *').fill(name);
  await openFormulationSection(page, 'Ingredients');
  for (const [index, [ingredient, amount]] of lines.entries()) {
    await page.getByRole('button', { name: 'Add line' }).click();
    await page.getByLabel(`Line ${index + 1} record`).selectOption({ label: ingredient });
    if (amount) await page.getByLabel(`Line ${index + 1} quantity`).fill(amount);
  }
  if (name === 'Cookie recipe') {
    await page.locator('.line-row').nth(2).getByText('Special additive use? (optional)').click();
    await page.getByLabel('Line 3 additive use').selectOption('unknown');
    await checkAccessibility(page, 'Incomplete recipe editor');
  }
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Formulation draft saved locally.' })).toBeVisible();
}

async function createProduct(page: Page, name: string, recipe: string): Promise<void> {
  await page.getByRole('button', { name: 'Add product' }).click();
  await page.getByLabel('Product name *').fill(name);
  await page.getByLabel('Recipe (formulation) *').selectOption({ label: recipe });
  await page.getByLabel('What does the label tell customers to do before consuming this product?').selectOption('none');
  await page.getByRole('button', { name: 'Save product draft' }).click();
  if (name === 'Finished test product') {
    const recipeDetails = page.getByText('Manufacturing and nutrition details saved with this recipe', { exact: true });
    await expect(recipeDetails).toBeVisible();
    await expect(page.getByText('Recorded final mass: 80 g.')).not.toBeVisible();
    await recipeDetails.click();
    await expect(page.getByText(/Customer directions and the nutrition basis for this product are recorded separately/)).toBeVisible();
  }
  await page.getByRole('navigation', { name: 'Product sections' }).getByRole('button', { name: 'What is it?' }).click();
  await page.getByLabel('What kind of product is this?').selectOption('other');
  await expect(page.getByText('Saved on this device.').last()).toBeVisible();
  await page.getByRole('navigation', { name: 'Product sections' }).getByRole('button', { name: 'Customer directions and nutrition' }).click();
  await page.getByLabel('Serving size', { exact: true }).fill('50');
  await page.getByLabel('Serving size unit').selectOption('g');
  await page.getByLabel('Servings per pack').fill('2');
  await page.getByLabel('Net contents', { exact: true }).fill('100');
  await page.getByLabel('Net contents unit').selectOption('g');
  await page.getByLabel('Is the food solid or liquid?').selectOption('solid');
  await expect(page.getByLabel('What does the label tell customers to do before consuming this product?')).toHaveValue('none');
  await expect(page.getByLabel(/I have checked that the recipe amounts/)).toHaveCount(0);
  if (name === 'Finished test product') {
    await expect(page.getByText('The selected finished-food values describe the recipe after its recorded processing.')).toBeVisible();
    await expect(page.getByText(/Ingredient-based values assume no change/)).toHaveCount(0);
  }
  if (name === 'Retention product') {
    await expect(page.getByText('The selected estimates use the recorded processing, batch weight and nutrient retention evidence.')).toBeVisible();
    await expect(page.getByText(/Ingredient-based values assume no change/)).toHaveCount(0);
  }
  if (name === 'Preparation product') {
    await expect(page.getByText(/For the usual as-sold draft, we use the nutrition information recorded with this recipe/)).toBeVisible();
  }
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await expect(page.getByText('Saved on this device.').last()).toBeVisible();
  await page.getByRole('button', { name: 'Back to product list' }).click();
}

async function selectLabel(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await page.getByLabel('Product draft').selectOption({ label: name });
  await openLabelNutrition(page);
}

async function setSavedFoodState(page: Page, name: string, state: string | undefined): Promise<void> {
  await page.evaluate(async ({ productName, foodState }) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('aus-food-labelling-v2');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('products', 'readwrite');
      const store = transaction.objectStore('products');
      const request = store.getAll();
      request.onsuccess = () => {
        const product = request.result.find((item: { name: string }) => item.name === productName);
        if (!product) {
          transaction.abort();
          return;
        }
        if (foodState === undefined) delete product.foodState;
        else product.foodState = foodState;
        store.put(product);
      };
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error ?? new Error('Product not found'));
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  }, { productName: name, foodState: state });
  await page.reload();
}

test('summarises saved recipes clearly, including incomplete amounts', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await createIngredient(page, 'Flour', ['200', '8', '2', '1', '10', '5', '100'], { wheat: true, noSources: true });
  await createIngredient(page, 'Example additive', ['0', '0', '0', '0', '0', '0', '0'], { additive: true, noSources: true });
  await page.getByRole('button', { name: 'Formulations', exact: true }).click();
  await createRecipe(page, 'Complete recipe', [['Flour', '100'], ['Example additive', '100']]);
  await createRecipe(page, 'Incomplete recipe', [['Flour', ''], ['Example additive', '100']]);
  const button = page.getByRole('button', { name: 'Expand Complete recipe' });
  await button.click();
  const summary = page.getByRole('region', { name: 'Complete recipe summary', exact: true });
  await expect(summary.getByRole('region', { name: 'Recipe ingredients' })).toContainText('Flour');
  await expect(summary.getByRole('region', { name: 'Recipe ingredients' })).toContainText('100 g');
  const protein = summary.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Protein', exact: true }) });
  await expect(protein.getByRole('cell')).toHaveText(['4 g', '8 g']);
  await expect(summary.getByRole('region', { name: 'Recipe allergens' })).toContainText('Wheat');
  await expect(summary.getByRole('region', { name: 'Recipe additives' })).toContainText('Example additive (999)');
  await summary.getByText('See ingredient breakdown per 100 g before cooking').click();
  await expect(summary.getByRole('region', { name: 'Recipe ingredients' })
    .getByText('From: Complete recipe → Flour')).toBeVisible();
  await summary.getByText('See nutrition details and missing information').click();
  await expect(summary.getByText(/Complete recipe → Flour: 8 g\/100g/)).toBeVisible();
  await checkAccessibility(page, 'Formulation summary');
  const box = await summary.boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= 390).toBe(true);
  await page.getByRole('button', { name: 'Expand Incomplete recipe' }).click();
  await expect(summary).not.toBeVisible();
  const incomplete = page.getByRole('region', { name: 'Incomplete recipe summary' });
  await expect(incomplete.getByRole('region', { name: 'Recipe ingredients' })).toContainText('Amount not entered');
  await expect(incomplete.getByRole('alert')).toContainText('amounts are unknown');
  await expect(incomplete.getByRole('region', { name: 'Recipe allergens' })).toContainText('Wheat');
  await expect(incomplete.getByRole('region', { name: 'Recipe additives' })).toContainText('Example additive');
  await expect(incomplete.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Protein', exact: true }) })
    .getByRole('cell')).toHaveText(['Not available', 'Not available']);
  await page.getByRole('button', { name: 'Collapse Incomplete recipe' }).click();
  await expect(incomplete).not.toBeVisible();
});

function proteinRow(page: Page) {
  return page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Protein', exact: true }) });
}

test('uses unsourced nutrition, allergen and density inputs after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await createIngredient(page, 'Simple food', ['200', '4', '0', '0', '0', '0', '0'], { wheat: true, noSources: true });
  await page.getByRole('button', { name: 'Formulations', exact: true }).click();
  await createRecipe(page, 'Simple recipe', [['Simple food', '100']]);
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await createProduct(page, 'Simple product', 'Simple recipe');
  await openProductStep(page, 'Simple product', 'Customer directions and nutrition');
  await page.getByLabel('Serving size unit').selectOption('mL');
  await page.getByLabel('Final food density (g/mL)').fill('1');
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await expect(page.getByText('Saved on this device.').last()).toBeVisible();
  await page.reload();
  await openProductStep(page, 'Simple product', 'Customer directions and nutrition');
  await expect(page.getByLabel('Final food density (g/mL)')).toHaveValue('1');
  await selectLabel(page, 'Simple product');
  await expect(proteinRow(page)).toContainText('4.0 g');
  await expect(page.getByRole('region', { name: 'Products and readiness' }))
    .not.toContainText(/nutrition source not recorded|allergen source not recorded/);
  await expect(page.getByRole('button', { name: 'Export Incomplete Review Copy PDF' })).toBeEnabled();
});

test('aligns contextual directions and nutrition controls on desktop and narrow screens', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await page.getByRole('button', { name: 'Edit product Illustrative demo product' }).click();
  const directions = page.getByLabel('What does the label tell customers to do before consuming this product?');
  await expect(page.getByText('Saved nutrition basis (advanced)')).toHaveCount(0);
  await expect(page.getByText('Nutrition evidence from the saved recipe')).toHaveCount(0);
  await directions.selectOption('present');
  await directions.focus();
  await page.keyboard.press('Tab');
  const mixing = page.getByLabel('Mix with water or another food or liquid');
  await expect(mixing).toBeFocused();
  await page.keyboard.press('Space');
  await expect(mixing).toBeChecked();
  await page.getByLabel('Drain', { exact: true }).check();
  await expect(page.getByText('Mixing together with draining needs review.')).toBeVisible();
  await page.getByLabel('Serving size unit').selectOption('mL');
  await page.getByLabel('Final food density (g/mL)').fill('1');
  await page.getByText('Density source details (optional)').click();

  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const section = page.locator('#product-section-nutrition');
    const leftEdges = await Promise.all([
      directions,
      page.locator('.directions-options'),
      section.getByRole('heading', { name: 'Mixing before consuming' }),
      section.getByRole('heading', { name: 'Draining before eating' }),
      page.getByText('Density source details (optional)'),
    ].map(async (locator) => (await locator.boundingBox())?.x));
    expect(leftEdges.every((left) => left !== undefined && Math.abs(left - leftEdges[0]!) < 2)).toBe(true);
    const controlsFit = await section.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return [...element.querySelectorAll('input, select, textarea, details')]
        .filter((control) => control.getBoundingClientRect().width > 0)
        .every((control) => {
          const box = control.getBoundingClientRect();
          return box.left >= bounds.left - 1 && box.right <= bounds.right + 1;
        });
    });
    expect(controlsFit).toBe(true);
    await checkAccessibility(page, `Product directions at ${width}px`);
  }
});

test('preserves older and missing food states until explicitly reviewed', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Illustrative demo data loaded locally' })).toBeVisible();
  for (const state of ['asPrepared', 'asAdded', 'asProcessed', undefined] as const) {
    await setSavedFoodState(page, 'Illustrative demo product', state);
    await openProductStep(page, 'Illustrative demo product', 'Customer directions and nutrition');
    const savedState = page.getByLabel('Previously recorded food state');
    await expect(savedState).toHaveValue(state ?? '');
    await page.getByLabel('What does the label tell customers to do before consuming this product?').selectOption('none');
    await page.getByRole('button', { name: 'Save product draft' }).click();
    await expect(page.getByText('Saved on this device.').last()).toBeVisible();
    await page.reload();
    await openProductStep(page, 'Illustrative demo product', 'Customer directions and nutrition');
    await expect(page.getByLabel('Previously recorded food state')).toHaveValue(state ?? '');
    await selectLabel(page, 'Illustrative demo product');
    await expect(page.getByText(/recorded food state needs review before a nutrition basis can be shown/i).first()).toBeVisible();
    await expect(proteinRow(page)).toContainText('Not available');
  }
  await openProductStep(page, 'Illustrative demo product', 'Customer directions and nutrition');
  await page.getByLabel('Previously recorded food state').selectOption('asSold');
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await page.reload();
  await openProductStep(page, 'Illustrative demo product', 'Customer directions and nutrition');
  await expect(page.getByLabel('Previously recorded food state')).toHaveCount(0);
});

test('does not silently enable draining for a conflicting saved food state', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await openProductStep(page, 'Illustrative demo product', 'Customer directions and nutrition');
  await page.getByLabel('What does the label tell customers to do before consuming this product?').selectOption('present');
  await page.getByLabel('Drain', { exact: true }).check();
  await page.getByLabel('Draining directions', { exact: true }).fill('Drain before eating.');
  await page.getByLabel('Drained Protein (g/100 g)').fill('12');
  await page.getByLabel('Drain', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await setSavedFoodState(page, 'Illustrative demo product', 'asDrained');
  await openProductStep(page, 'Illustrative demo product', 'Customer directions and nutrition');
  await expect(page.getByLabel('Drain', { exact: true })).not.toBeChecked();
  await expect(page.getByText(/previously recorded food state indicates draining/)).toBeVisible();
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await page.reload();
  await openProductStep(page, 'Illustrative demo product', 'Customer directions and nutrition');
  await expect(page.getByLabel('Drain', { exact: true })).not.toBeChecked();
  await expect(page.getByLabel('Drained Protein (g/100 g)')).toHaveValue('12');
  await selectLabel(page, 'Illustrative demo product');
  await expect(proteinRow(page)).toContainText('Not available');
});

test('shows ingredient density only when a volume-based input may need conversion', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Volume example');
  await page.getByLabel('Ingredient type').selectOption('atomic');
  await openIngredientSection(page, 'Nutrition');
  await expect(page.getByLabel('Density (g/mL)')).toHaveCount(0);
  await expect(page.getByText('Caffeine information (optional)', { exact: true })).toHaveCount(0);
  await page.getByLabel('Nutrition values are per').selectOption('volume');
  await expect(page.getByLabel('Density (g/mL)')).toBeVisible();
  await page.getByLabel('Nutrition values are per').selectOption('mass');
  await expect(page.getByLabel('Density (g/mL)')).toHaveCount(0);
});

test('shows ingredient density for a volume-based additive concentration', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Liquid additive');
  await page.getByLabel('Ingredient type').selectOption('additive');
  await page.getByText('Additive level for use checks (optional)').click();
  await page.getByLabel('Additive concentration unit').selectOption('mgPerL');
  await openIngredientSection(page, 'Nutrition');
  await expect(page.getByLabel('Density (g/mL)')).toBeVisible();
});

test('preserves microgram nutrient values on both bases after editing', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Microgram example');
  await page.getByLabel('Ingredient type').selectOption('atomic');
  await openIngredientSection(page, 'Nutrition');
  for (const [basis, value] of [['mass', '1.5'], ['volume', '2.5']] as const) {
    await page.getByLabel('Nutrition values are per').selectOption(basis);
    await page.getByLabel('Choose another known nutrient').selectOption('dietaryFibre');
    await page.getByRole('button', { name: 'Add another known nutrient' }).click();
    await page.getByLabel('Dietary fibre amount').fill(value);
    await page.getByLabel('Dietary fibre unit').selectOption('ug');
  }
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Ingredient draft saved locally.' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit ingredient Microgram example' }).click();
  await openIngredientSection(page, 'Nutrition');
  for (const [basis, value] of [['mass', '1.5'], ['volume', '2.5']] as const) {
    await page.getByLabel('Nutrition values are per').selectOption(basis);
    await expect(page.getByLabel('Dietary fibre amount')).toHaveValue(value);
    await expect(page.getByLabel('Dietary fibre unit')).toHaveValue('ug');
  }
});

test('searches and restores optional expanded nutrients with their forms', async ({ browser }) => {
  const source = await browser.newContext();
  const restored = await browser.newContext();
  try {
    const page = await source.newPage();
    await page.goto('/');
    await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
    await page.getByRole('button', { name: 'Add ingredient' }).click();
    await page.getByLabel('Ingredient name *').fill('Nutrient example');
    await page.getByLabel('Ingredient type').selectOption('atomic');
    await openIngredientSection(page, 'Nutrition');
    const search = page.getByLabel('Search other known nutrients');
    const choose = page.getByLabel('Choose another known nutrient');
    await search.fill('nothing matches this');
    await expect(page.getByText('No available nutrients match your search.')).toBeVisible();
    await expect(choose).toBeDisabled();
    await search.fill('VITAMIN A');
    await choose.selectOption('vitaminA');
    await search.fill('b12');
    await expect(choose).toHaveValue('');
    await search.fill('VITAMIN A');
    await choose.selectOption('vitaminA');
    await page.getByRole('button', { name: 'Add another known nutrient' }).click();
    await page.getByLabel('Vitamin A amount').fill('10');
    await expect(page.getByLabel('Vitamin A unit')).toHaveValue('ug');
    await page.getByLabel('Vitamin A form (optional)').selectOption('supported');
    await expect(choose).toBeDisabled();
    await search.fill('b12');
    await choose.selectOption('vitaminB12');
    await page.getByRole('button', { name: 'Add another known nutrient' }).click();
    await page.getByLabel('Vitamin B12 amount').fill('2');
    await expect(page.getByLabel('Vitamin B12 form (optional)')).toHaveValue('');
    await page.getByLabel('Nutrition values are per').selectOption('volume');
    await choose.selectOption('vitaminB12');
    await page.getByRole('button', { name: 'Add another known nutrient' }).click();
    await page.getByLabel('Vitamin B12 amount').fill('3');
    await page.getByLabel('Vitamin B12 form (optional)').selectOption('other');
    await page.getByLabel('Vitamin B12 other form').fill('Another supplied form');
    await checkAccessibility(page, 'Expanded nutrient editor');
    await page.getByRole('button', { name: 'Save ingredient draft' }).click();
    await page.getByRole('button', { name: 'Edit ingredient Nutrient example' }).click();
    await openIngredientSection(page, 'Nutrition');
    await expect(page.getByLabel('Vitamin A form (optional)')).toHaveValue('supported');
    await expect(page.getByLabel('Vitamin B12 form (optional)')).toHaveValue('');
    await page.getByLabel('Vitamin A amount').fill('12');
    await page.getByLabel('Nutrition values are per').selectOption('volume');
    await expect(page.getByLabel('Vitamin B12 other form')).toHaveValue('Another supplied form');
    await page.getByRole('button', { name: 'Save ingredient draft' }).click();

    await page.getByRole('button', { name: 'Backup & restore' }).click();
    await page.getByLabel('Passphrase for encrypted backup or restore').fill('test backup');
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download encrypted backup' }).click();
    const path = await (await downloading).path();
    if (!path) throw new Error('The workspace backup was not downloaded.');
    const restorePage = await restored.newPage();
    await restorePage.goto('/');
    await restorePage.getByRole('button', { name: 'Backup & restore' }).click();
    await restorePage.getByLabel('Workspace backup file').setInputFiles(path);
    await restorePage.getByLabel('Passphrase for encrypted backup or restore').fill('test backup');
    await restorePage.getByRole('button', { name: 'Inspect backup' }).click();
    restorePage.once('dialog', (dialog) => void dialog.accept());
    await restorePage.getByRole('button', { name: 'Confirm restore to this device' }).click();
    await expect(restorePage.getByRole('status').filter({ hasText: 'Workspace restored from the verified backup' })).toBeVisible();
    await restorePage.getByRole('button', { name: 'Ingredients', exact: true }).click();
    await restorePage.getByRole('button', { name: 'Edit ingredient Nutrient example' }).click();
    await openIngredientSection(restorePage, 'Nutrition');
    await expect(restorePage.getByLabel('Vitamin A amount')).toHaveValue('12');
    await expect(restorePage.getByLabel('Vitamin A form (optional)')).toHaveValue('supported');
    await expect(restorePage.getByLabel('Vitamin B12 form (optional)')).toHaveValue('');
    await restorePage.getByLabel('Nutrition values are per').selectOption('volume');
    await expect(restorePage.getByLabel('Vitamin B12 amount')).toHaveValue('3');
    await expect(restorePage.getByLabel('Vitamin B12 other form')).toHaveValue('Another supplied form');
  } finally {
    await source.close();
    await restored.close();
  }
});

async function expectProtein(page: Page, perServing: string, per100g: string, dailyIntake?: string): Promise<void> {
  await expect(proteinRow(page).getByRole('cell')).toHaveText(
    dailyIntake === undefined ? [perServing, per100g] : [perServing, dailyIntake, per100g],
  );
}

test('shows expanded nutrient estimates and missing forms through a nested recipe', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await createIngredient(page, 'Nutrient A', ['100', '1', '1', '1', '1', '1', '1']);
  await createIngredient(page, 'Nutrient B', ['100', '1', '1', '1', '1', '1', '1']);
  for (const [name, value] of [['Nutrient A', '2'], ['Nutrient B', '4']] as const) {
    await page.getByRole('button', { name: `Edit ingredient ${name}` }).click();
    await openIngredientSection(page, 'Nutrition');
    await page.getByLabel('Search other known nutrients').fill('b12');
    await page.getByLabel('Choose another known nutrient').selectOption('vitaminB12');
    await page.getByRole('button', { name: 'Add another known nutrient' }).click();
    await page.getByLabel('Vitamin B12 amount').fill(value);
    await page.getByLabel('Vitamin B12 form (optional)').selectOption('supported');
    await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  }
  await page.getByRole('button', { name: 'Formulations', exact: true }).click();
  await createRecipe(page, 'Nutrient inner', [['Nutrient B', '1']]);
  await page.getByRole('button', { name: 'Add formulation' }).click();
  await page.getByLabel('Formulation name *').fill('Nutrient outer');
  await openFormulationSection(page, 'Ingredients');
  await page.getByRole('button', { name: 'Add line' }).click();
  await page.getByLabel('Line 1 record').selectOption({ label: 'Nutrient A' });
  await page.getByLabel('Line 1 quantity').fill('25');
  await page.getByRole('button', { name: 'Add line' }).click();
  await page.getByLabel('Line 2 type').selectOption('formulation');
  await page.getByLabel('Line 2 record').selectOption({ label: 'Nutrient inner' });
  await page.getByLabel('Line 2 quantity').fill('75');
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await createProduct(page, 'Nutrient product', 'Nutrient outer');
  await openProductStep(page, 'Nutrient product', 'Customer directions and nutrition');
  await expect(page.getByText('Nutrition evidence from the saved recipe')).toHaveCount(0);
  await openProductReview(page, 'Nutrient product');
  await openTraceSection(page, 'Nutrition calculation inputs and paths');
  await expect(page.getByText(/Vitamin B12:\s*3\.5 micrograms\/100 g ingoing estimate/)).toBeVisible();
  await expect(page.getByText(/vitaminB12: 4 ug\/100g.*Nutrient outer.*Nutrient inner.*Nutrient B/).first()).toBeVisible();
  await checkAccessibility(page, 'Expanded nutrient recipe trace');
  await selectLabel(page, 'Nutrient product');
  await expect(page.getByRole('rowheader', { name: 'Vitamin B12' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Edit ingredient Nutrient B' }).click();
  await openIngredientSection(page, 'Nutrition');
  await page.getByLabel('Vitamin B12 form (optional)').selectOption('');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await openProductReview(page, 'Nutrient product');
  await openTraceSection(page, 'Nutrition calculation inputs and paths');
  await expect(page.getByText(/Vitamin B12:.*REVIEW REQUIRED.*nutrient expression needs review at.*Nutrient inner.*Nutrient B/)).toBeVisible();
});

test('uses and restores confirmed finished-food values without inferring retention from yield', async ({ browser }) => {
  test.setTimeout(90_000);
  const source = await browser.newContext();
  const restored = await browser.newContext();
  try {
    const page = await source.newPage();
    await page.goto('/');
    await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
    await createIngredient(page, 'Finished test ingredient', ['100', '8', '1', '1', '1', '1', '1']);
    await page.getByRole('button', { name: 'Formulations', exact: true }).click();
    await createRecipe(page, 'Finished test recipe', [['Finished test ingredient', '100']]);
    await page.getByRole('button', { name: 'Edit formulation Finished test recipe' }).click();
    await openFinishedBatchDetail(page, 'weight');
    await page.getByLabel('Final batch weight (optional)', { exact: true }).fill('80');
    await openFinishedBatchDetail(page, 'nutrition');
    await page.getByLabel('Use finished-food nutrition values for this recipe').check();
    await page.getByText('Finished nutrition source details (optional)', { exact: true }).click();
    await page.getByLabel('Finished nutrition source type').selectOption('analysis');
    await page.getByLabel('Finished nutrition source reference').fill('Fictional finished analysis');
    await page.getByLabel('Finished nutrition source date').fill('2026-01-01');
    await page.getByLabel('Finished energy').fill('350');
    await page.getByLabel('Finished Protein').fill('12');
    await page.getByLabel('Search other finished-food nutrients').fill('b12');
    await page.getByLabel('Choose another finished-food nutrient').selectOption('vitaminB12');
    await page.getByRole('button', { name: 'Add finished-food nutrient' }).click();
    await page.getByLabel('Finished Vitamin B12 amount').fill('2');
    await page.getByLabel('Finished Vitamin B12 form').selectOption('supported');
    await page.getByLabel('I have checked that these values describe this recipe after its recorded processing.').check();
    await checkAccessibility(page, 'Finished nutrition editor');
    await page.getByRole('button', { name: 'Save formulation draft' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Formulation draft saved locally.' })).toBeVisible();
    await page.getByRole('button', { name: 'Edit formulation Finished test recipe' }).click();
    await page.getByRole('button', { name: 'Review saved finished-food nutrition' }).click();
    await expect(page.getByLabel('Finished Protein')).toHaveValue('12');
    await expect(page.getByLabel('Finished Vitamin B12 form')).toHaveValue('supported');
    await page.getByLabel('Finished Vitamin B12 amount').fill('3');
    await page.getByLabel('Use finished-food nutrition values for this recipe').uncheck();
    await page.getByRole('button', { name: 'Save formulation draft' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Formulation draft saved locally.' })).toBeVisible();
    await page.getByRole('button', { name: 'Edit formulation Finished test recipe' }).click();
    await page.getByRole('button', { name: 'Review saved finished-food nutrition' }).click();
    await expect(page.getByLabel('Use finished-food nutrition values for this recipe')).not.toBeChecked();
    await expect(page.getByLabel('Finished Vitamin B12 amount')).toHaveValue('3');
    await page.getByLabel('Use finished-food nutrition values for this recipe').check();
    await expect(page.getByLabel('Finished Vitamin B12 amount')).toHaveValue('3');
    await page.getByLabel('I have checked that these values describe this recipe after its recorded processing.').check();
    await page.getByRole('button', { name: 'Save formulation draft' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Formulation draft saved locally.' })).toBeVisible();
    await page.getByRole('button', { name: 'Products', exact: true }).click();
    await createProduct(page, 'Finished test product', 'Finished test recipe');
    await selectLabel(page, 'Finished test product');
    await expectProtein(page, '6.0 g', '12.0 g', '12%');
    await expect(page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Fat, total' }) })).toContainText('Not available');
    await openProductReview(page, 'Finished test product');
    await openTraceSection(page, 'Nutrition calculation inputs and paths');
    await expect(page.locator('section[aria-labelledby="input-trace-title"]').getByText(/Finished Protein: 12 g\/100g.*Fictional finished analysis/)).toBeVisible();
    await expect(page.getByText(/Vitamin B12: 3 micrograms\/100 g finished food/)).toBeVisible();
    await page.getByRole('button', { name: 'Backup & restore' }).click();
    await page.getByLabel('Passphrase for encrypted backup or restore').fill('finished test backup');
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download encrypted backup' }).click();
    const path = await (await downloading).path();
    if (!path) throw new Error('The finished nutrition backup was not downloaded.');
    const restorePage = await restored.newPage();
    await restorePage.goto('/');
    await restorePage.getByRole('button', { name: 'Backup & restore' }).click();
    await restorePage.getByLabel('Workspace backup file').setInputFiles(path);
    await restorePage.getByLabel('Passphrase for encrypted backup or restore').fill('finished test backup');
    await restorePage.getByRole('button', { name: 'Inspect backup' }).click();
    restorePage.once('dialog', (dialog) => void dialog.accept());
    await restorePage.getByRole('button', { name: 'Confirm restore to this device' }).click();
    await expect(restorePage.getByRole('status').filter({ hasText: 'Workspace restored from the verified backup' })).toBeVisible();
    await restorePage.getByRole('button', { name: 'Formulations', exact: true }).click();
    await restorePage.getByRole('button', { name: 'Edit formulation Finished test recipe' }).click();
    await restorePage.getByRole('button', { name: 'Review saved finished-food nutrition' }).click();
    await expect(restorePage.getByLabel('Finished Protein')).toHaveValue('12');
    await expect(restorePage.getByLabel('Finished Vitamin B12 amount')).toHaveValue('3');
    await selectLabel(restorePage, 'Finished test product');
    await expectProtein(restorePage, '6.0 g', '12.0 g', '12%');
    await restorePage.getByRole('button', { name: 'Ingredients', exact: true }).click();
    await restorePage.getByRole('button', { name: 'Edit ingredient Finished test ingredient' }).click();
    await openIngredientSection(restorePage, 'Nutrition');
    await restorePage.getByLabel('Protein').fill('9');
    await restorePage.getByRole('button', { name: 'Save ingredient draft' }).click();
    await selectLabel(restorePage, 'Finished test product');
    await expectProtein(restorePage, 'Not available', 'Not available', 'Not available');
    await openLabelIssues(restorePage);
    await expect(restorePage.getByText(/finished-food nutrition values still describe this recipe/)).toBeVisible();
  } finally {
    await source.close();
    await restored.close();
  }
});

test('previews and traces supported reconstitution while retaining review safeguards', async ({ browser }) => {
  test.setTimeout(90_000);
  const source = await browser.newContext();
  const restored = await browser.newContext();
  try {
    const page = await source.newPage();
    await page.addInitScript(() => {
      const createObjectURL = URL.createObjectURL;
      URL.createObjectURL = (object) => {
        if (object instanceof Blob && object.type === 'image/svg+xml') {
          void object.text().then((svg) => document.documentElement.setAttribute('data-test-preview-svg', svg));
        }
        return createObjectURL.call(URL, object);
      };
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
    await createIngredient(page, 'Preparation powder', ['400', '20', '0', '0', '0', '0', '0']);
    await createIngredient(page, 'Preparation water', ['0', '0', '0', '0', '0', '0', '0']);
    await page.getByRole('button', { name: 'Formulations', exact: true }).click();
    await createRecipe(page, 'Preparation recipe', [['Preparation powder', '100']]);
    await page.getByRole('button', { name: 'Products', exact: true }).click();
    await createProduct(page, 'Preparation product', 'Preparation recipe');
    await openProductStep(page, 'Preparation product', 'Customer directions and nutrition');
    await page.getByLabel('What does the label tell customers to do before consuming this product?').selectOption('present');
    await page.getByLabel('Mix with water or another food or liquid').check();
    await page.getByLabel('Preparation type').selectOption('reconstituted');
    await page.getByLabel('Preparation directions', { exact: true }).fill('Mix 25 g powder with 75 g water.');
    await page.getByLabel('Amount of product used').fill('25');
    await page.getByRole('combobox', { name: 'Added food or liquid' }).selectOption({ label: 'Preparation water' });
    await page.getByLabel('Amount of added food or liquid').fill('75');
    await page.getByLabel('Prepared serving size (optional)').fill('50');
    await page.getByLabel(/These amounts match the directions/).check();
    await checkAccessibility(page, 'Consumer preparation editor');
    await page.getByRole('button', { name: 'Save product draft' }).click();
    await expect(page.getByText('Saved on this device.')).toBeVisible();
    await page.getByRole('button', { name: 'Back to product list' }).click();
    await selectLabel(page, 'Preparation product');
    await expectProtein(page, '2.5 g', '5.0 g');
    await expect(page.getByText(/Reconstituted food draft/).first()).toBeVisible();
    await openLabelPackInformation(page);
    await expect(page.getByRole('region', { name: 'Draft pack information' })).toContainText('Mix 25 g powder with 75 g water.');
    await expect(page.locator('html')).toHaveAttribute('data-test-preview-svg', /data-block-id="consumer-directions"/);
    await expect(page.locator('html')).toHaveAttribute('data-test-preview-svg', /Mix 25 g powder with 75 g water/);
    const report = await downloadReviewReport(page);
    expect(report).toContain('Nutrition basis: reconstituted.');
    expect(report).toContain('Protein: 2.5 g; 5.0 g.');
    expect(report).toContain('Preview preparation directions: Mix 25 g powder with 75 g water.');
    await openProductReview(page, 'Preparation product');
    await openTraceSection(page, 'Consumer preparation nutrition');
    await expect(page.getByText(/Protein: 5.0 g per 100 g prepared.*2.5 g per prepared serving/)).toBeVisible();
    await expect(page.getByText(/Product: 25 g.*Preparation water: 75 g/)).toBeVisible();
    await setSavedFoodState(page, 'Preparation product', 'asReconstituted');
    await openProductStep(page, 'Preparation product', 'Customer directions and nutrition');
    await expect(page.getByLabel('Previously recorded food state')).toHaveValue('asReconstituted');
    await page.getByRole('button', { name: 'Save product draft' }).click();
    await page.getByRole('button', { name: 'Backup & restore' }).click();
    await page.getByLabel('Passphrase for encrypted backup or restore').fill('preparation backup');
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download encrypted backup' }).click();
    const path = await (await downloading).path();
    if (!path) throw new Error('The preparation backup was not downloaded.');
    const restorePage = await restored.newPage();
    await restorePage.goto('/');
    await restorePage.getByRole('button', { name: 'Backup & restore' }).click();
    await restorePage.getByLabel('Workspace backup file').setInputFiles(path);
    await restorePage.getByLabel('Passphrase for encrypted backup or restore').fill('preparation backup');
    await restorePage.getByRole('button', { name: 'Inspect backup' }).click();
    restorePage.once('dialog', (dialog) => void dialog.accept());
    await restorePage.getByRole('button', { name: 'Confirm restore to this device' }).click();
    await expect(restorePage.getByRole('status').filter({ hasText: 'Workspace restored from the verified backup' })).toBeVisible();
    await openProductReview(restorePage, 'Preparation product');
    await openTraceSection(restorePage, 'Consumer preparation nutrition');
    await expect(restorePage.getByText(/Protein: 5.0 g per 100 g prepared/)).toBeVisible();
    await openProductStep(restorePage, 'Preparation product', 'Customer directions and nutrition');
    await expect(restorePage.getByLabel('Previously recorded food state')).toHaveValue('asReconstituted');
    await restorePage.getByLabel('Mix with water or another food or liquid').uncheck();
    await restorePage.getByRole('button', { name: 'Save product draft' }).click();
    await openProductStep(restorePage, 'Preparation product', 'Customer directions and nutrition');
    await restorePage.getByLabel('Mix with water or another food or liquid').check();
    await expect(restorePage.getByLabel('Preparation directions', { exact: true })).toHaveValue('Mix 25 g powder with 75 g water.');
    await expect(restorePage.getByLabel(/These amounts match the directions/)).toBeChecked();
    await restorePage.getByRole('button', { name: 'Save product draft' }).click();
    await restorePage.getByRole('button', { name: 'Ingredients', exact: true }).click();
    await restorePage.getByRole('button', { name: 'Edit ingredient Preparation water' }).click();
    await openIngredientSection(restorePage, 'Nutrition');
    await restorePage.getByLabel('Protein').fill('1');
    await restorePage.getByRole('button', { name: 'Save ingredient draft' }).click();
    await openProductReview(restorePage, 'Preparation product');
    await openTraceSection(restorePage, 'Consumer preparation nutrition');
    await expect(restorePage.getByText(/Protein: Not available per 100 g prepared/)).toBeVisible();
    await expect(restorePage.locator('section[aria-labelledby="input-trace-title"]').getByText(/Confirm the amounts match the directions/).first()).toBeVisible();
    await selectLabel(restorePage, 'Preparation product');
    await expectProtein(restorePage, 'Not available', 'Not available');

    await openProductStep(restorePage, 'Preparation product', 'Customer directions and nutrition');
    await expect(restorePage.getByLabel('Previously recorded food state')).toHaveValue('asReconstituted');
    await expect(restorePage.getByText('Preparation type: reconstituted, from the food state you selected.')).toBeVisible();
    await expect(restorePage.getByLabel('Preparation type')).toHaveCount(0);
    await restorePage.getByRole('button', { name: 'Save product draft' }).click();
    await restorePage.reload();
    await openProductStep(restorePage, 'Preparation product', 'Customer directions and nutrition');
    await expect(restorePage.getByLabel('Previously recorded food state')).toHaveValue('asReconstituted');
  } finally {
    await source.close();
    await restored.close();
  }
});

test('previews combined-food nutrition beside the original serving', async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    const createObjectURL = URL.createObjectURL;
    URL.createObjectURL = (object) => {
      if (object instanceof Blob && object.type === 'image/svg+xml') {
        void object.text().then((svg) => document.documentElement.setAttribute('data-test-preview-svg', svg));
      }
      return createObjectURL.call(URL, object);
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await createIngredient(page, 'Cereal', ['400', '20', '0', '0', '0', '0', '0']);
  await createIngredient(page, 'Milk', ['200', '4', '0', '0', '0', '0', '0']);
  await page.getByRole('button', { name: 'Formulations', exact: true }).click();
  await createRecipe(page, 'Cereal recipe', [['Cereal', '100']]);
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await createProduct(page, 'Cereal product', 'Cereal recipe');
  await openProductStep(page, 'Cereal product', 'Customer directions and nutrition');
  await page.getByLabel('What does the label tell customers to do before consuming this product?').selectOption('present');
  await page.getByLabel('Mix with water or another food or liquid').check();
  await page.getByLabel('Preparation type').selectOption('withFood');
  await page.getByLabel('Preparation directions', { exact: true }).fill('Serve 50 g cereal with 50 g milk.');
  await page.getByLabel('Amount of product used').fill('50');
  await page.getByRole('combobox', { name: 'Added food or liquid' }).selectOption({ label: 'Milk' });
  await page.getByLabel('Amount of added food or liquid').fill('50');
  await page.getByLabel('Prepared serving size (optional)').fill('100');
  await page.getByLabel(/These amounts match the directions/).check();
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await page.getByRole('button', { name: 'Back to product list' }).click();
  await selectLabel(page, 'Cereal product');
  const table = page.getByRole('table', { name: 'Draft nutrition information' });
  await expect(table.getByRole('columnheader', { name: 'With Milk' })).toBeVisible();
  await expect(proteinRow(page)).toContainText('10.0 g');
  await expect(proteinRow(page)).toContainText('20.0 g');
  await expect(proteinRow(page)).toContainText('12.0 g');
  await expect(page.getByText(/50 g of Milk/).first()).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-test-preview-svg', /With Milk/);
  await expect(page.locator('html')).toHaveAttribute('data-test-preview-svg', /12\.0 g/);
  await page.getByLabel('Width (mm)').fill('120');
  await page.getByLabel('Height (mm)').fill('180');
  await page.getByText('Advanced layout settings', { exact: true }).click();
  await page.getByLabel('Nutrition information text size (mm)').fill('2');
  await expect(page.getByText('DRAFT SVG · 120 × 180 MM')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-test-preview-svg', /width="120mm"/);
  const svg = await page.locator('html').getAttribute('data-test-preview-svg');
  if (!svg) throw new Error('The label preview was not generated.');
  const pdfBytes = await page.evaluate(async (preview) => {
    const harness = await import('/e2e/label-export-harness.ts');
    return harness.renderPreviewForTest(preview, 120, 180);
  }, svg);
  const labelPdf = Buffer.from(pdfBytes).toString('latin1');
  expect(labelPdf).toContain('With Milk');
  expect(labelPdf).toContain('12.0 g');
  const pageSize = Array.from(labelPdf.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/gu))[1];
  if (!pageSize) throw new Error('The rendered label PDF is missing its page size.');
  expect(Number(pageSize[1]) * 25.4 / 72).toBeCloseTo(120, 3);
  expect(Number(pageSize[2]) * 25.4 / 72).toBeCloseTo(180, 3);
  const report = await downloadReviewReport(page);
  expect(report).toContain('Preview dimensions: 120 x 180 mm');
  expect(report).toContain('Nutrition information text size: 2 mm.');
  expect(report).toContain('Protein: 10.0 g; %DI 20%; 20.0 g; 12.0 g.');
  expect(report).toContain('With Milk');
  expect(report).toContain('This label draft has not been saved.');
  expect(report).toContain('does not certify legal compliance');
  await expect(page.getByRole('button', { name: 'Export Incomplete Review Copy PDF' })).toBeEnabled();
});

test('records drained nutrition separately and invalidates changed directions', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await createIngredient(page, 'Canned food', ['200', '4', '0', '0', '0', '0', '0']);
  await page.getByRole('button', { name: 'Formulations', exact: true }).click();
  await createRecipe(page, 'Canned recipe', [['Canned food', '100']]);
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await createProduct(page, 'Drained product', 'Canned recipe');
  await openProductStep(page, 'Drained product', 'Customer directions and nutrition');
  await page.getByLabel('What does the label tell customers to do before consuming this product?').selectOption('present');
  await page.getByLabel('Drain', { exact: true }).check();
  await page.getByLabel('Draining directions', { exact: true }).fill('Drain before eating.');
  await page.getByLabel('Drained serving size (g, optional)').fill('40');
  await page.getByText('Drained nutrition source details (optional)', { exact: true }).click();
  await page.getByLabel('Drained nutrition source type').selectOption('analysis');
  await page.getByLabel('Drained nutrition source reference').fill('Fictional drained analysis');
  await page.getByLabel('Drained nutrition source date').fill('2026-01-01');
  await page.getByLabel('Drained Energy (kJ/100 g)').fill('100');
  await page.getByLabel('Drained Protein (g/100 g)').fill('12');
  await page.getByLabel('I have checked that these values describe this recipe after the recorded draining directions.').check();
  await checkAccessibility(page, 'Drained food editor');
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await expect(page.getByText('Saved on this device.')).toBeVisible();
  await page.getByLabel('Drain', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await openProductStep(page, 'Drained product', 'Customer directions and nutrition');
  await page.getByLabel('Drain', { exact: true }).check();
  await expect(page.getByLabel('Drained Protein (g/100 g)')).toHaveValue('12');
  await expect(page.getByLabel('I have checked that these values describe this recipe after the recorded draining directions.')).toBeChecked();
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await page.getByRole('button', { name: 'Back to product list' }).click();
  await selectLabel(page, 'Drained product');
  await expectProtein(page, '4.8 g', '12.0 g');
  await expect(page.getByText(/Drained food draft/).first()).toBeVisible();
  const report = await downloadReviewReport(page);
  expect(report).toContain('Nutrition basis: drained.');
  expect(report).toContain('Protein: 4.8 g; 12.0 g.');
  expect(report).toContain('Fat, total: Not available; Not available.');
  await openProductReview(page, 'Drained product');
  await openTraceSection(page, 'Drained food nutrition');
  await expect(page.getByText(/Protein: 12.0 g per 100 g drained.*4.8 g per drained serving/)).toBeVisible();
  await expect(page.getByText(/Fictional drained analysis.*2026-01-01/)).toBeVisible();
  await expect(page.locator('section[aria-labelledby="input-trace-title"]').getByText(/Fat, total: drained food value is not recorded/)).toBeVisible();
  await setSavedFoodState(page, 'Drained product', 'asDrained');
  await openProductStep(page, 'Drained product', 'Customer directions and nutrition');
  await expect(page.getByLabel('Previously recorded food state')).toHaveValue('asDrained');
  await expect(page.getByText('Draining is indicated by the previously recorded food state.')).toBeVisible();
  await expect(page.getByText('The serving size above is already in grams for the drained food, so it is used here.')).toBeVisible();
  await expect(page.getByLabel('Drained serving size (g, optional)')).toHaveCount(0);
  await expect(page.getByLabel('Drain', { exact: true })).toBeChecked();
  await expect(page.getByLabel(/I have checked that the recipe amounts/)).toHaveCount(0);
  await expect(page.getByLabel('Drained Protein (g/100 g)')).toHaveValue('12');
  await expect(page.getByLabel('I have checked that these values describe this recipe after the recorded draining directions.')).toBeChecked();
  await page.getByLabel('Draining directions', { exact: true }).fill('Rinse and drain.');
  await expect(page.getByLabel('I have checked that these values describe this recipe after the recorded draining directions.')).not.toBeChecked();
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await openProductReview(page, 'Drained product');
  await openTraceSection(page, 'Drained food nutrition');
  await expect(page.getByText(/Protein: Not available per 100 g drained/)).toBeVisible();
  await expect(page.getByText(/Confirm that the values describe this recipe/).filter({ visible: true }).first()).toBeVisible();
});

test('uses evidenced retention and recorded yield without guessing other nutrients', async ({ browser }) => {
  test.setTimeout(90_000);
  const source = await browser.newContext();
  const restored = await browser.newContext();
  try {
    const page = await source.newPage();
    await page.goto('/');
    await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
    await createIngredient(page, 'Retention ingredient', ['100', '8', '1', '1', '1', '1', '1']);
    await page.getByRole('button', { name: 'Formulations', exact: true }).click();
    await createRecipe(page, 'Retention recipe', [['Retention ingredient', '100']]);
    await page.getByRole('button', { name: 'Edit formulation Retention recipe' }).click();
    await openFinishedBatchDetail(page, 'weight');
    await page.getByLabel('Final batch weight (optional)', { exact: true }).fill('80');
    await openFinishedBatchDetail(page, 'nutrition');
    await page.getByLabel('Use finished-food nutrition values for this recipe').check();
    await page.getByText('Finished nutrition source details (optional)', { exact: true }).click();
    await page.getByLabel('Finished nutrition source type').selectOption('analysis');
    await page.getByLabel('Finished nutrition source reference').fill('Fictional finished energy');
    await page.getByLabel('Finished nutrition source date').fill('2026-01-01');
    await page.getByLabel('Finished energy').fill('200');
    await page.getByLabel('I have checked that these values describe this recipe after its recorded processing.').check();
    await page.getByRole('button', { name: 'Save formulation draft' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Formulation draft saved locally.' })).toBeVisible();
    await page.getByRole('button', { name: 'Edit formulation Retention recipe' }).click();
    await openFinishedBatchDetail(page, 'weight');
    await openFinishedBatchDetail(page, 'retention');
    await page.getByLabel('Use nutrient retention evidence for this recipe').check();
    await page.getByLabel('Choose a nutrient for retention evidence').selectOption('protein');
    await page.getByRole('button', { name: 'Add retention evidence' }).click();
    await page.getByLabel('Protein retained (%)').fill('50');
    await page.getByText('Protein source details (optional)', { exact: true }).click();
    await page.getByLabel('Protein retention source', { exact: true }).fill('Fictional recipe retention');
    await page.getByLabel('Protein retention source date').fill('2026-01-01');
    await page.getByLabel('Choose a nutrient for retention evidence').selectOption('fat');
    await page.getByRole('button', { name: 'Add retention evidence' }).click();
    await page.getByLabel('Fat, total retained (%)').fill('100');
    await page.getByLabel(/I checked that each figure is the percentage/).check();
    await checkAccessibility(page, 'Retention evidence editor');
    await page.getByRole('button', { name: 'Save formulation draft' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Formulation draft saved locally.' })).toBeVisible();
    await page.getByRole('button', { name: 'Edit formulation Retention recipe' }).click();
    await page.getByRole('button', { name: 'Review saved finished-food nutrition' }).click();
    await expect(page.getByLabel('Use finished-food nutrition values for this recipe')).not.toBeChecked();
    await expect(page.getByLabel('Finished energy')).toHaveValue('200');
    await page.getByRole('button', { name: 'Review saved nutrient retention' }).click();
    await expect(page.getByLabel('Use nutrient retention evidence for this recipe')).toBeChecked();
    await expect(page.getByLabel('Protein retained (%)')).toHaveValue('50');
    await page.getByLabel('Use nutrient retention evidence for this recipe').uncheck();
    await page.getByRole('button', { name: 'Save formulation draft' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Formulation draft saved locally.' })).toBeVisible();
    await page.getByRole('button', { name: 'Edit formulation Retention recipe' }).click();
    await page.getByRole('button', { name: 'Review saved nutrient retention' }).click();
    await expect(page.getByLabel('Use nutrient retention evidence for this recipe')).not.toBeChecked();
    await expect(page.getByLabel('Protein retained (%)')).toHaveValue('50');
    await page.getByLabel('Use nutrient retention evidence for this recipe').check();
    await expect(page.getByLabel('Protein retained (%)')).toHaveValue('50');
    await page.getByLabel(/I checked that each figure is the percentage/).check();
    await page.getByRole('button', { name: 'Save formulation draft' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Formulation draft saved locally.' })).toBeVisible();
    await page.getByRole('button', { name: 'Products', exact: true }).click();
    await createProduct(page, 'Retention product', 'Retention recipe');
    await selectLabel(page, 'Retention product');
    await expectProtein(page, '2.5 g', '5.0 g', '5%');
    await expect(page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Energy', exact: true }) })).toContainText('200 kJ');
    await expect(page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Fat, total' }) })).toContainText('1.2 g');
    await expect(page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: '- sugars' }) })).toContainText('Not available');
    await openProductReview(page, 'Retention product');
    await openTraceSection(page, 'Nutrition calculation inputs and paths');
    await expect(page.getByText(/protein retained: 50%.*100 g starting batch.*80 g finished batch.*Fictional recipe retention/)).toBeVisible();
    await page.getByRole('button', { name: 'Backup & restore' }).click();
    await page.getByLabel('Passphrase for encrypted backup or restore').fill('retention test backup');
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download encrypted backup' }).click();
    const path = await (await downloading).path();
    if (!path) throw new Error('The retention backup was not downloaded.');
    const restorePage = await restored.newPage();
    await restorePage.goto('/');
    await restorePage.getByRole('button', { name: 'Backup & restore' }).click();
    await restorePage.getByLabel('Workspace backup file').setInputFiles(path);
    await restorePage.getByLabel('Passphrase for encrypted backup or restore').fill('retention test backup');
    await restorePage.getByRole('button', { name: 'Inspect backup' }).click();
    restorePage.once('dialog', (dialog) => void dialog.accept());
    await restorePage.getByRole('button', { name: 'Confirm restore to this device' }).click();
    await expect(restorePage.getByRole('status').filter({ hasText: 'Workspace restored from the verified backup' })).toBeVisible();
    await restorePage.getByRole('button', { name: 'Formulations', exact: true }).click();
    await restorePage.getByRole('button', { name: 'Edit formulation Retention recipe' }).click();
    await restorePage.getByRole('button', { name: 'Review saved nutrient retention' }).click();
    await expect(restorePage.getByLabel('Protein retained (%)')).toHaveValue('50');
    await expect(restorePage.getByLabel('Use nutrient retention evidence for this recipe')).toBeChecked();
    await selectLabel(restorePage, 'Retention product');
    await expectProtein(restorePage, '2.5 g', '5.0 g', '5%');
    await restorePage.getByRole('button', { name: 'Ingredients', exact: true }).click();
    await restorePage.getByRole('button', { name: 'Edit ingredient Retention ingredient' }).click();
    await openIngredientSection(restorePage, 'Nutrition');
    await restorePage.getByLabel('Protein').fill('9');
    await restorePage.getByRole('button', { name: 'Save ingredient draft' }).click();
    await selectLabel(restorePage, 'Retention product');
    await expectProtein(restorePage, 'Not available', 'Not available', 'Not available');
    await openLabelIssues(restorePage);
    await expect(restorePage.getByText(/nutrient retention evidence still applies/)).toBeVisible();
  } finally {
    await source.close();
    await restored.close();
  }
});

// Synthetic input figures and the confirmed no-processing-change basis exercise arithmetic only.
// They are not a real baked-food formulation or evidence about actual baking.
test('fictional cakes and cookies retain evidence through edits and backup restore', async ({ browser }) => {
  test.setTimeout(120_000);
  const source = await browser.newContext();
  const restored = await browser.newContext();
  try {
    const page = await source.newPage();
    await page.goto('/');
    await expect(page.getByText(/Supplier references are optional/)).toBeVisible();
    await expect(page.getByText(/incomplete review copies, not finished food labels/i)).toBeVisible();
    await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
    await createIngredient(page, 'Test flour', ['1000', '10', '2', '1', '70', '2', '20'], { wheat: true });
    await createIngredient(page, 'Test sugar', ['1600', '0', '0', '0', '100', '100', '0']);
    await createIngredient(page, 'Test additive', ['0', '0', '0', '0', '0', '0', '0'], { additive: true });

    await page.getByRole('button', { name: 'Add ingredient' }).click();
    await page.getByLabel('Ingredient name *').fill('Test cake mix');
    await page.getByLabel('Ingredient type').selectOption('compound');
    await openIngredientSection(page, 'Included ingredients');
    for (const [index, [name, amount]] of [['Test flour', '60'], ['Test sugar', '40']].entries()) {
      await page.getByRole('button', { name: 'Add included ingredient' }).click();
      await page.getByLabel(`Component ${index + 1}`).selectOption({ label: name });
      await page.getByLabel(`Amount ${index + 1} (optional)`).fill(amount!);
    }
    await page.getByLabel('Is this the complete list?').selectOption('complete');
    await checkAccessibility(page, 'Compound ingredient editor');
    await page.getByRole('button', { name: 'Save ingredient draft' }).click();

    await page.getByRole('button', { name: 'Formulations', exact: true }).click();
    await createRecipe(page, 'First cake recipe', [['Test cake mix', '80'], ['Test sugar', '20']]);
    await createRecipe(page, 'Second cake recipe', [['Test flour', '50'], ['Test sugar', '50']]);
    await createRecipe(page, 'Cookie recipe', [['Test flour', '90'], ['Test sugar', '9'], ['Test additive', '']]);

    await page.getByRole('button', { name: 'Products', exact: true }).click();
    await createProduct(page, 'Example first cake', 'First cake recipe');
    await createProduct(page, 'Example second cake', 'Second cake recipe');
    await createProduct(page, 'Example cookies', 'Cookie recipe');

    await selectLabel(page, 'Example first cake');
    await expectProtein(page, '2.4 g', '4.8 g', '5%');
    await openLabelTab(page, 'Ingredients & allergens');
    await expect(page.getByRole('region', { name: 'Draft declaration' })).toContainText('Contains wheat, gluten');
    await openLabelTab(page, 'Label setup');
    await page.getByLabel('Label name').fill('First cake pack');
    await page.getByLabel('Width (mm)').fill('95');
    await openLabelTab(page, 'Claims');
    await page.getByRole('button', { name: 'Add a claim' }).click();
    await page.getByLabel('Claim 1 text (exactly as it appears)').fill('Low sugars');
    await page.getByLabel('Claim 1 type (your classification)').selectOption('nutrition_content');
    await page.getByLabel('I confirm the type of claim 1').check();
    await page.getByLabel('Claim 1 supported claim rule').selectOption({ label: 'Low sugars' });
    const cakeClaim = page.getByRole('article', { name: 'Claim: Low sugars' });
    await expect(cakeClaim.locator('p').filter({ hasText: /sugars: 52\.96 g per 100 g, calculated from unrounded/ })).toBeVisible();
    await expect(cakeClaim.getByText('Status: REVIEW REQUIRED')).toBeVisible();
    await page.getByRole('button', { name: 'Save label draft', exact: true }).click();
    await expect(savedLabelOption(page, 'First cake pack')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Export Incomplete Review Copy PDF' })).toBeEnabled();
    const reviewReport = await downloadReviewReport(page);
    expect(reviewReport).toContain('Product: Example first cake.');
    expect(reviewReport).toContain('52.96 g');
    expect(reviewReport).toContain('Claims are not added to the draft label');
    expect(reviewReport).toContain('This is an incomplete review copy, not a finished or approved label for food packaging.');
    expect(reviewReport).toContain('does not certify legal compliance');
    expect(reviewReport).toContain('Warnings, other mandatory content, exemptions, and physical print legibility are not fully assessed.');
    const reviewCopyDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Incomplete Review Copy PDF' }).click();
    const reviewCopyPath = await (await reviewCopyDownload).path();
    if (!reviewCopyPath) throw new Error('The fictional cake review copy was not downloaded.');
    const reviewCopy = (await readFile(reviewCopyPath)).toString('latin1');
    expect(reviewCopy).toContain('INCOMPLETE REVIEW COPY');
    expect(reviewCopy).toContain('Example first cake');
    expect(reviewCopy).toContain('This label draft assists review and does not certify legal compliance.');
    await selectLabel(page, 'Example second cake');
    await expectProtein(page, '2.5 g', '5.0 g', '5%');
    await selectLabel(page, 'Example cookies');
    await expectProtein(page, 'Not available', 'Not available', 'Not available');
    await openLabelTab(page, 'Ingredients & allergens');
    await expect(page.getByRole('region', { name: 'Draft declaration' }))
      .toContainText('Known allergen candidates: wheat, gluten');
    await openLabelTab(page, 'Label setup');
    await page.getByLabel('Label name').fill('Incomplete cookie pack');
    await page.getByLabel('Width (mm)').fill('80');
    await openLabelTab(page, 'Claims');
    await page.getByRole('button', { name: 'Add a claim' }).click();
    await page.getByLabel('Claim 1 text (exactly as it appears)').fill('Low sugars');
    await page.getByLabel('Claim 1 type (your classification)').selectOption('nutrition_content');
    await page.getByLabel('I confirm the type of claim 1').check();
    await page.getByLabel('Claim 1 supported claim rule').selectOption({ label: 'Low sugars' });
    const cookieClaim = page.getByRole('article', { name: 'Claim: Low sugars' });
    await expect(cookieClaim.locator('p').filter({ hasText: /Nutrition amount unavailable|Reliable sugars nutrition is missing/ })).toBeVisible();
    await expect(cookieClaim.getByText('Status: REVIEW REQUIRED')).toBeVisible();
    await page.getByRole('button', { name: 'Save label draft', exact: true }).click();
    await expect(savedLabelOption(page, 'Incomplete cookie pack')).toHaveCount(1);
    await openLabelTab(page, 'Ingredients & allergens');
    await expect(page.getByText('Recipe information is missing.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export Incomplete Review Copy PDF' })).toBeEnabled();

    await openAdditiveReview(page, 'Example cookies');
    const additive = page.getByRole('article', { name: 'Additive permission: 999 (Test additive)' });
    await expect(additive).toContainText('Concentration not calculated');
    await expect(additive).toContainText('Status: REVIEW REQUIRED');

    await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
    await page.getByRole('button', { name: 'Edit ingredient Test flour' }).click();
    await openIngredientSection(page, 'Nutrition');
    await page.getByLabel('Protein').fill('20');
    await page.getByRole('button', { name: 'Save ingredient draft' }).click();
    await selectLabel(page, 'Example first cake');
    await openSavedLabel(page, 'First cake pack');
    await expect(page.getByText(/dependencies have changed since this label was saved/)).toBeVisible();
    await expect(page.getByLabel('Width (mm)')).toHaveValue('95');
    await expectProtein(page, '4.8 g', '9.6 g', '10%');
    await selectLabel(page, 'Example second cake');
    await expectProtein(page, '5.0 g', '10.0 g', '10%');

    await page.getByRole('button', { name: 'Formulations', exact: true }).click();
    await page.getByRole('button', { name: 'Edit formulation First cake recipe' }).click();
    await openFormulationSection(page, 'Ingredients');
    await page.getByLabel('Line 1 quantity').fill('50');
    await page.getByLabel('Line 2 quantity').fill('50');
    await page.getByRole('button', { name: 'Save formulation draft' }).click();
    await selectLabel(page, 'Example first cake');
    await expectProtein(page, 'Not available', 'Not available', 'Not available');
    await openLabelIssues(page);
    await expect(page.getByText(/Confirm that the recipe and nutrients represent the food as sold/)).toBeVisible();
    await openProductStep(page, 'Example first cake', 'Customer directions and nutrition');
    await expect(page.getByText(/For the usual as-sold draft, we use the nutrition information recorded with this recipe/)).toBeVisible();
    await expect(page.getByLabel(/I have checked that the recipe amounts/)).toHaveCount(0);
    await page.getByRole('button', { name: 'Save product draft' }).click();
    await selectLabel(page, 'Example first cake');
    await expectProtein(page, '3.0 g', '6.0 g', '6%');
    await checkAccessibility(page, 'Cake label');

    await openProductReview(page, 'Example first cake');
    await openTechnicalReview(page);
    const nutritionTrace = page.getByText('Nutrition calculation inputs and paths');
    await nutritionTrace.focus();
    await page.keyboard.press('Enter');
    const allergenTrace = page.getByText('Allergen evidence and paths');
    await allergenTrace.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('section[aria-labelledby="input-trace-title"]').getByText(/protein: 20 g\/100g.*First cake recipe.*Test cake mix.*Test flour/)).toBeVisible();
    await expect(page.getByText(/wheat: present.*First cake recipe.*Test cake mix.*Test flour/)).toBeVisible();
    await checkAccessibility(page, 'Expanded review trace');

    await page.getByRole('button', { name: 'Backup & restore' }).click();
    await page.getByLabel('Passphrase for encrypted backup or restore').fill('fictional test backup');
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download encrypted backup' }).click();
    const path = await (await downloading).path();
    if (!path) throw new Error('The fictional workspace backup was not downloaded.');

    const restorePage = await restored.newPage();
    await restorePage.goto('/');
    await restorePage.getByRole('button', { name: 'Backup & restore' }).click();
    await restorePage.getByLabel('Workspace backup file').setInputFiles(path);
    await restorePage.getByLabel('Passphrase for encrypted backup or restore').fill('fictional test backup');
    await restorePage.getByRole('button', { name: 'Inspect backup' }).click();
    await expect(restorePage.getByText(/Backup counts: 4 ingredients,\s*4 formulations,\s*3 products/)).toBeVisible();
    restorePage.once('dialog', (dialog) => void dialog.accept());
    await restorePage.getByRole('button', { name: 'Confirm restore to this device' }).click();
    await expect(restorePage.getByRole('status').filter({ hasText: 'Workspace restored from the verified backup' })).toBeVisible();
    await selectLabel(restorePage, 'Example first cake');
    await openSavedLabel(restorePage, 'First cake pack');
    await expect(restorePage.getByLabel('Width (mm)')).toHaveValue('95');
    await expect(restorePage.getByText(/dependencies have changed since this label was saved/)).toBeVisible();
    await expectProtein(restorePage, '3.0 g', '6.0 g', '6%');
    await openLabelTab(restorePage, 'Claims');
    await expect(restorePage.getByLabel('Claim 1 text (exactly as it appears)')).toHaveValue('Low sugars');
    await expect(restorePage.getByRole('article', { name: 'Claim: Low sugars' }).locator('p')
      .filter({ hasText: /sugars: 70\.6 g per 100 g, calculated from unrounded/ })).toBeVisible();
    await selectLabel(restorePage, 'Example cookies');
    await openSavedLabel(restorePage, 'Incomplete cookie pack');
    await expect(restorePage.getByLabel('Width (mm)')).toHaveValue('80');
    await expect(restorePage.getByText(/dependencies have changed since this label was saved/)).toBeVisible();
    await expectProtein(restorePage, 'Not available', 'Not available', 'Not available');
    await openLabelTab(restorePage, 'Claims');
    const restoredCookieClaim = restorePage.getByRole('article', { name: 'Claim: Low sugars' });
    await expect(restoredCookieClaim.locator('p').filter({ hasText: /Nutrition amount unavailable|Reliable sugars nutrition is missing/ })).toBeVisible();
    await expect(restoredCookieClaim.getByText('Status: REVIEW REQUIRED')).toBeVisible();
    await openLabelTab(restorePage, 'Ingredients & allergens');
    await expect(restorePage.getByRole('region', { name: 'Draft declaration' }))
      .toContainText('Known allergen candidates: wheat, gluten');
    await expect(restorePage.getByText('Recipe information is missing.')).toBeVisible();
    await expect(restorePage.getByRole('button', { name: 'Export Incomplete Review Copy PDF' })).toBeEnabled();
    await restorePage.getByRole('button', { name: 'Formulations', exact: true }).click();
    await restorePage.getByRole('button', { name: 'Edit formulation Cookie recipe' }).click();
    await openFormulationSection(restorePage, 'Ingredients');
    await expect(restorePage.getByLabel('Line 3 quantity')).toHaveValue('');
    await expect(restorePage.getByLabel('Line 3 additive use')).toHaveValue('unknown');

    await page.getByRole('button', { name: 'Formulations', exact: true }).click();
    await page.getByRole('button', { name: 'Edit formulation Cookie recipe' }).click();
    await openFormulationSection(page, 'Ingredients');
    await page.getByLabel('Line 3 quantity').fill('1');
    await page.getByLabel('Line 3 additive use').selectOption('added');
    await openFinishedBatchDetail(page, 'weight');
    await page.getByText('Processing details (advanced)').click();
    await page.getByLabel('What happened to the batch weight?').selectOption('unchanged');
    await page.getByRole('button', { name: 'Save formulation draft' }).click();
    await openAdditiveReview(page, 'Example cookies');
    await expect(additive).toContainText('Calculated final concentration: 10000 mg/kg');
    await expect(additive).toContainText('Status: REVIEW REQUIRED');
    await openProductStep(page, 'Example cookies', 'Customer directions and nutrition');
    await page.getByRole('button', { name: 'Save product draft' }).click();
    await selectLabel(page, 'Example cookies');
    await expectProtein(page, '9.0 g', '18.0 g', '18%');
    await openLabelTab(page, 'Ingredients & allergens');
    const declaration = await page.getByRole('region', { name: 'Draft declaration' }).locator('p').first().textContent();
    expect(declaration?.match(/Test additive/g)).toHaveLength(1);
  } finally {
    await source.close();
    await restored.close();
  }
});
