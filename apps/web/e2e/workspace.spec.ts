import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { openFinishedBatchDetail, openFormulationSection, openIngredientSection, openTechnicalReview, seedWorkedExamples } from './helpers';

async function goToStep(page: import('@playwright/test').Page, title: string): Promise<void> {
  if (await page.locator('details.ingredient-section').count()) {
    const section = title === 'Review and save' ? 'Review' : title;
    await openIngredientSection(page, section);
  } else {
    await openFormulationSection(page, title);
  }
}

test('formulation sections use the page width and retain edits when collapsed', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Formulations', exact: true }).click();
  const grid = page.locator('.page:visible > .ingredient-content-grid');
  const list = grid.locator('.records-panel');
  expect(await list.evaluate((element) => element.clientWidth / element.parentElement!.clientWidth)).toBeGreaterThan(0.98);

  await page.getByRole('button', { name: 'Add formulation' }).click();
  const editor = grid.locator('form.editor-panel');
  expect(await editor.evaluate((element) => element.clientWidth / element.parentElement!.clientWidth)).toBeGreaterThan(0.98);
  await page.getByLabel('Formulation name *').fill('My recipe');
  await expect(page.getByText('What is this formulation?', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Composition details (optional)', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Are all the ingredients in this component recipe listed?')).toHaveCount(0);
  await expect(page.getByText('Manufacturing details (optional)', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Final batch weight (optional)', { exact: true })).not.toBeVisible();
  await openFinishedBatchDetail(page, 'weight');
  await expect(page.getByText(/A measured weight alone does not show/)).toBeVisible();
  await expect(page.getByLabel('Use finished-food nutrition values for this recipe')).not.toBeVisible();
  await openFormulationSection(page, 'Ingredients');
  await page.getByRole('button', { name: 'Create ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Flour');
  await page.getByLabel('Ingredient type').selectOption('atomic');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByLabel('Line 1 quantity').fill('120');
  await page.locator('details.formulation-section > summary').getByText('Ingredients', { exact: true }).click();
  await openFinishedBatchDetail(page, 'weight');
  await openFormulationSection(page, 'Ingredients');
  await expect(page.getByLabel('Line 1 quantity')).toHaveValue('120');
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  const savedProfile = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('aus-food-labelling-v2');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const profile = await new Promise<unknown>((resolve, reject) => {
      const request = database.transaction('formulations').objectStore('formulations').getAll();
      request.onsuccess = () => resolve(request.result.find((item: { name: string }) => item.name === 'My recipe')?.processMassProfile);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return profile;
  });
  expect(savedProfile).toBeUndefined();
  await page.getByRole('button', { name: 'Edit formulation My recipe' }).click();
  await openFormulationSection(page, 'Ingredients');
  await expect(page.getByLabel('Line 1 quantity')).toHaveValue('120');
});

test('confirms completeness on the shared component recipe without assuming unknown amounts', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Formulations', exact: true }).click();
  await page.getByRole('button', { name: 'Add formulation' }).click();
  await page.getByLabel('Formulation name *').fill('Shared base');
  await openFormulationSection(page, 'Ingredients');
  await page.getByRole('button', { name: 'Create ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Flour');
  await page.getByLabel('Ingredient type').selectOption('atomic');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByRole('button', { name: 'Save formulation draft' }).click();

  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Base mix');
  await page.getByLabel('Ingredient type').selectOption('compound');
  await page.getByLabel('Composition formulation').selectOption({ label: 'Shared base' });
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();

  await page.getByRole('button', { name: 'Formulations', exact: true }).click();
  await page.getByRole('button', { name: 'Edit formulation Shared base' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await openFormulationSection(page, 'Ingredients');
  const completeness = page.getByLabel('Are all the ingredients in this component recipe listed?');
  await expect(completeness).toHaveValue('');
  await expect(page.getByText('Composition details (optional)', { exact: true })).toHaveCount(0);
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await page.getByRole('button', { name: 'Edit formulation Shared base' }).click();
  await expect(completeness).toHaveValue('');
  await completeness.focus();
  await page.keyboard.press('ArrowDown');
  await expect(completeness).toHaveValue('partial');
  await page.getByText('Component list source details (optional)', { exact: true }).click();
  await page.getByLabel('Composition evidence reference').fill('Saved supplier note');
  await page.getByRole('button', { name: 'Save formulation draft' }).click();

  await page.getByRole('button', { name: 'Edit formulation Shared base' }).click();
  await openFormulationSection(page, 'Ingredients');
  await expect(completeness).toHaveValue('partial');
  await expect(page.getByLabel('Line 1 quantity')).toHaveValue('');
  await completeness.selectOption('complete');
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await page.getByRole('button', { name: 'Edit formulation Shared base' }).click();
  await openFormulationSection(page, 'Ingredients');
  await expect(completeness).toHaveValue('complete');
  await expect(page.getByLabel('Line 1 quantity')).toHaveValue('');
  await page.getByLabel('Line 1 quantity').fill('100');
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await expect(page.getByRole('alert')).toContainText('Confirm that the updated composition');
  await page.getByLabel(/If I changed the composition or source/).check();
  await page.getByRole('button', { name: 'Save formulation draft' }).click();

  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Edit ingredient Base mix' }).click();
  await expect(page.getByLabel('Composition formulation').locator('option:checked')).toHaveText('Shared base');
  await expect(page.getByLabel('Is this the complete list?')).toHaveValue('complete');
  await page.getByLabel('Ingredient type').selectOption('atomic');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByRole('button', { name: 'Formulations', exact: true }).click();
  await page.getByRole('button', { name: 'Edit formulation Shared base' }).click();
  await expect(page.getByText('This recipe has saved component-list information.')).toBeVisible();
  await expect(completeness).toHaveValue('complete');
  await page.getByText('Component list source details (optional)', { exact: true }).click();
  await expect(page.getByLabel('Composition evidence reference')).toHaveValue('Saved supplier note');
});

test('products use the available width in the list and editor', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  const grid = page.locator('.page:visible > .content-grid');
  const panel = grid.locator('.records-panel');
  expect(await panel.evaluate((element) => element.clientWidth / element.parentElement!.clientWidth)).toBeGreaterThan(0.98);
  await page.getByRole('button', { name: 'Add product' }).click();
  const editor = grid.locator('.editor-panel');
  expect(await editor.evaluate((element) => element.clientWidth / element.parentElement!.clientWidth)).toBeGreaterThan(0.98);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await editor.evaluate((element) => element.clientWidth / element.parentElement!.clientWidth)).toBeGreaterThan(0.98);
  await expect(page.getByLabel('Product name *')).toBeVisible();
});

test('rejects circular selections while preserving recipe and ingredient edits', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Formulations', exact: true }).click();
  await page.getByRole('button', { name: 'Add formulation' }).click();
  await page.getByLabel('Formulation name *').fill('Cake');
  await goToStep(page, 'Ingredients');
  await page.getByRole('button', { name: 'Create ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Flour');
  await page.getByLabel('Ingredient type').selectOption('atomic');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByLabel('Line 1 quantity').fill('20');
  await page.getByRole('button', { name: 'Save formulation draft' }).click();

  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Blend');
  await page.getByLabel('Ingredient type').selectOption('compound');
  await page.getByLabel('Composition formulation').selectOption({ label: 'Cake' });
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();

  await page.getByRole('button', { name: 'Formulations', exact: true }).click();
  await page.getByRole('button', { name: 'Add formulation' }).click();
  await page.getByLabel('Formulation name *').fill('Wrapper');
  await goToStep(page, 'Ingredients');
  await page.getByRole('button', { name: 'Add line' }).click();
  await page.getByLabel('Line 1 record').selectOption({ label: 'Blend' });
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await page.getByRole('button', { name: 'Edit formulation Cake' }).click();
  await goToStep(page, 'Ingredients');
  await page.getByLabel('Line 1 record').selectOption({ label: 'Blend' });
  await expect(page.getByRole('alert')).toContainText('Ingredient "Blend"');
  await expect(page.getByRole('alert')).toContainText('Recipe "Cake"');
  await expect(page.getByLabel('Line 1 record').locator('option:checked')).toHaveText('Flour');
  await expect(page.getByLabel('Line 1 quantity')).toHaveValue('20');
  await page.getByRole('button', { name: 'Add line' }).click();
  await page.getByLabel('Line 2 type').selectOption('formulation');
  await page.getByLabel('Line 2 record').selectOption({ label: 'Wrapper' });
  await expect(page.getByRole('alert')).toContainText('Recipe "Wrapper"');
  await expect(page.getByLabel('Line 2 record')).toHaveValue('');

  await page.getByRole('button', { name: 'Create ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('New blend');
  await page.getByLabel('Ingredient type').selectOption('compound');
  await page.getByLabel('Composition formulation').selectOption({ label: 'Cake' });
  await expect(page.getByRole('alert')).toContainText('Ingredient "New blend"');
  await expect(page.getByLabel('Composition formulation')).toHaveValue('');
  await openIngredientSection(page, 'Included ingredients');
  await page.getByRole('button', { name: 'Add included ingredient' }).click();
  await page.getByLabel('Component 1').selectOption({ label: 'Blend' });
  await expect(page.getByRole('alert')).toContainText('Ingredient "New blend"');
  await expect(page.getByRole('alert')).toContainText('Ingredient "Blend"');
  await expect(page.getByLabel('Component 1')).toHaveValue('');
  await page.getByRole('button', { name: 'Back to ingredient list' }).click();
  await expect(page.getByLabel('Line 1 quantity')).toHaveValue('20');
  await page.getByRole('button', { name: 'Back to formulation list' }).click();

  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Outer blend');
  await page.getByLabel('Ingredient type').selectOption('compound');
  await page.getByLabel('Composition formulation').selectOption({ label: 'Wrapper' });
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByRole('button', { name: 'Edit ingredient Blend' }).click();
  await page.getByLabel('Composition formulation').selectOption({ label: 'Wrapper' });
  await expect(page.getByRole('alert')).toContainText('Recipe "Wrapper"');
  await expect(page.getByRole('alert')).toContainText('Ingredient "Blend"');
  await expect(page.getByLabel('Composition formulation').locator('option:checked')).toHaveText('Cake');
  await openIngredientSection(page, 'Included ingredients');
  await page.getByLabel('Component 1').selectOption({ label: 'Outer blend' });
  await expect(page.getByRole('alert')).toContainText('Ingredient "Outer blend"');
  await expect(page.getByRole('alert')).toContainText('Recipe "Blend components"');
  await expect(page.getByLabel('Component 1').locator('option:checked')).toHaveText('Flour');
  await expect(page.getByLabel('Amount 1 (optional)')).toHaveValue('20');
});

test('creates an ingredient without losing a recipe and saves its final batch weight', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Formulations', exact: true }).click();
  await page.getByRole('button', { name: 'Add formulation' }).click();
  await page.getByLabel('Formulation name *').fill('Cake batch');
  await goToStep(page, 'Ingredients');
  await page.getByRole('button', { name: 'Create ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Flour');
  await page.getByLabel('Ingredient type').selectOption('atomic');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await expect(page.getByLabel('Line 1 record')).toHaveValue(/ingredient/);
  await expect(page.getByLabel('Line 1 record').locator('option:checked')).toHaveText('Flour');
  await openFinishedBatchDetail(page, 'weight');
  await expect(page.getByText(/starting batch weight is unavailable/)).toBeVisible();
  await expect(page.getByText('Processing details (advanced)')).toBeVisible();
  await expect(page.getByLabel('What happened to the batch weight?')).not.toBeVisible();
  await expect(page.getByText(/A measured weight alone does not show how much nutrient or additive remains/)).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.getByLabel('Final batch weight (optional)', { exact: true }).fill('800');
  await expect(page.getByText('Enter all recipe ingredients and their amounts to see the yield.')).toBeVisible();
  await openFinishedBatchDetail(page, 'nutrition');
  await expect(page.getByLabel('Final batch weight (optional)', { exact: true })).not.toBeVisible();
  await expect(page.getByLabel('Use finished-food nutrition values for this recipe')).not.toBeChecked();
  await openFinishedBatchDetail(page, 'weight');
  await expect(page.getByLabel('Final batch weight (optional)', { exact: true })).toHaveValue('800');
  await goToStep(page, 'Ingredients');
  await page.getByLabel('Line 1 quantity').fill('1000');
  await page.getByRole('button', { name: 'Create ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Sugar');
  await page.getByLabel('Ingredient type').selectOption('atomic');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await expect(page.getByLabel('Line 1 quantity')).toHaveValue('1000');
  await expect(page.getByLabel('Line 2 record').locator('option:checked')).toHaveText('Sugar');
  await page.getByLabel('Line 2 quantity').fill('100');
  await openFinishedBatchDetail(page, 'weight');
  await expect(page.getByText('Starting batch weight: 1100 g, calculated from the recipe amounts.')).toBeVisible();
  await page.getByLabel('Final batch weight (optional)', { exact: true }).fill('800');
  await expect(page.getByText('Finished batch: 800 g (about 72.7% of the starting weight).')).toBeVisible();
  await page.getByLabel('Final batch weight unit').selectOption('kg');
  await page.getByLabel('Final batch weight (optional)', { exact: true }).fill('1.1');
  await expect(page.getByText('Finished batch: 1.1 kg (about 100.0% of the starting weight).')).toBeVisible();
  await page.getByLabel('Final batch weight unit').selectOption('g');
  await page.getByLabel('Final batch weight (optional)', { exact: true }).fill('0');
  await expect(page.getByText('Enter a positive final batch weight.')).toBeVisible();
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await expect(page.getByRole('alert')).toContainText('Enter a positive final batch weight.');
  await page.getByLabel('Final batch weight (optional)', { exact: true }).fill('800');
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Formulation draft saved locally.' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit formulation Cake batch' }).click();
  await page.getByRole('button', { name: 'Review saved batch weight and processing' }).click();
  await expect(page.getByLabel('Final batch weight (optional)', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Final batch weight (optional)', { exact: true })).toHaveValue('800');
  await page.getByLabel('Final batch weight (optional)', { exact: true }).clear();
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await page.getByRole('button', { name: 'Edit formulation Cake batch' }).click();
  await openFinishedBatchDetail(page, 'weight');
  await expect(page.getByLabel('Final batch weight (optional)', { exact: true })).toHaveValue('');
});

test('saves unknown recipe amounts and finishes the recipe later', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Formulations', exact: true }).click();
  await page.getByRole('button', { name: 'Add formulation' }).click();
  await page.getByLabel('Formulation name *').fill('Unfinished recipe');
  await goToStep(page, 'Ingredients');
  await page.getByRole('button', { name: 'Create ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Example additive');
  await page.getByLabel('Ingredient type').selectOption('additive');
  await page.getByLabel('Additive code number (if known)').fill('999');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByLabel('Line 1 unit').selectOption('kg');
  await page.getByText('Special additive use? (optional)').click();
  await page.getByLabel('Line 1 additive use').selectOption('unknown');
  await openFinishedBatchDetail(page, 'weight');
  await page.getByLabel('Final batch weight (optional)', { exact: true }).fill('800');
  await expect(page.getByText('Enter all recipe ingredients and their amounts to see the yield.')).toBeVisible();
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await expect(page.getByText('Some amounts are unknown — proportions cannot yet be calculated.')).toBeVisible();
  await page.getByRole('button', { name: 'Expand Unfinished recipe' }).click();
  await expect(page.getByRole('alert')).toContainText('amounts are unknown');
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Blend');
  await page.getByLabel('Ingredient type').selectOption('compound');
  await page.getByLabel('Composition formulation').selectOption({ label: 'Unfinished recipe' });
  await openIngredientSection(page, 'Included ingredients');
  await expect(page.getByLabel('Is this the complete list?')).toHaveValue('partial');
  await expect(page.getByLabel('Amount 1 (optional)')).toHaveValue('');
  await expect(page.getByLabel('Unit 1')).toHaveValue('kg');
  await expect(page.getByLabel('Component 1 additive use')).toHaveValue('unknown');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByRole('button', { name: 'Formulations', exact: true }).click();
  await page.getByRole('button', { name: 'Edit formulation Unfinished recipe' }).click();
  await goToStep(page, 'Ingredients');
  await expect(page.getByLabel('Line 1 quantity')).toHaveValue('');
  await expect(page.getByLabel('Line 1 unit')).toHaveValue('kg');
  await expect(page.getByLabel('Line 1 additive use')).toHaveValue('unknown');
  await page.getByLabel('Line 1 quantity').fill('1');
  await openFinishedBatchDetail(page, 'weight');
  await expect(page.getByLabel('Final batch weight (optional)', { exact: true })).toHaveValue('800');
  await expect(page.getByText('Finished batch: 800 g (about 80.0% of the starting weight).')).toBeVisible();
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await expect(page.getByText('Some amounts are unknown — proportions cannot yet be calculated.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Expand Unfinished recipe' }).click();
  await expect(page.getByRole('heading', { name: 'Unfinished recipe summary' })).toBeVisible();
  await expect(page.getByText('Use needs checking', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit formulation Unfinished recipe' }).click();
  await openFinishedBatchDetail(page, 'weight');
  await expect(page.getByText('Finished batch: 800 g (about 80.0% of the starting weight).')).toBeVisible();
});

test('records incomplete and complete individual processing changes without guessing', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Formulations', exact: true }).click();
  await page.getByRole('button', { name: 'Add formulation' }).click();
  await page.getByLabel('Formulation name *').fill('Baked batch');
  await goToStep(page, 'Ingredients');
  await page.getByRole('button', { name: 'Create ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Flour');
  await page.getByLabel('Ingredient type').selectOption('atomic');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByLabel('Line 1 quantity').fill('1000');
  await expect(page.getByText('About 100.0% of batch')).toBeVisible();
  await openFinishedBatchDetail(page, 'weight');
  await page.getByText('Processing details (advanced)').click();
  await page.getByLabel('What happened to the batch weight?').selectOption('detailed');
  await page.getByRole('button', { name: 'Add weight change' }).click();
  await page.getByLabel('Weight change 1').selectOption('loss');
  await page.getByLabel('What changed? 1 (optional)').selectOption('water');
  await page.getByLabel('What happened? 1 (optional)').fill('Baking');
  await expect(page.getByText(/details can be saved as incomplete/)).toBeVisible();
  await page.getByLabel('I have listed every weight gain and loss, and know their amounts.').check();
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await expect(page.getByRole('alert')).toContainText('Enter every change amount');
  await page.getByLabel('I have listed every weight gain and loss, and know their amounts.').uncheck();
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await page.getByRole('button', { name: 'Edit formulation Baked batch' }).click();
  await openFinishedBatchDetail(page, 'weight');
  await expect(page.getByLabel('What happened to the batch weight?')).toHaveValue('detailed');
  await expect(page.getByLabel('Amount 1 (optional)')).toHaveValue('');
  await expect(page.getByLabel('What changed? 1 (optional)')).toHaveValue('water');
  await expect(page.getByLabel('What happened? 1 (optional)')).toHaveValue('Baking');
  await page.getByLabel('Amount 1 (optional)').fill('200');
  await page.getByRole('button', { name: 'Add weight change' }).click();
  await page.getByLabel('Weight change 2').selectOption('gain');
  await page.getByLabel('Amount 2 (optional)').fill('100');
  await page.getByLabel('Measured final batch weight (optional)', { exact: true }).fill('900');
  await page.getByLabel('I have listed every weight gain and loss, and know their amounts.').check();
  await expect(page.getByText('Finished batch: 900 g (about 90.0% of the starting weight).')).toBeVisible();
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await page.getByRole('button', { name: 'Edit formulation Baked batch' }).click();
  await openFinishedBatchDetail(page, 'weight');
  await expect(page.getByLabel('I have listed every weight gain and loss, and know their amounts.')).toBeChecked();
  await expect(page.getByLabel('Amount 2 (optional)')).toHaveValue('100');
  await page.getByText('Processing details (advanced)').click();
  await expect(page.getByLabel('Amount 2 (optional)')).not.toBeVisible();
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await page.getByRole('button', { name: 'Edit formulation Baked batch' }).click();
  await openFinishedBatchDetail(page, 'weight');
  await expect(page.getByLabel('Amount 1 (optional)')).toHaveValue('200');
  await expect(page.getByLabel('Amount 2 (optional)')).toHaveValue('100');
  await expect(page.getByLabel('What happened? 1 (optional)')).toHaveValue('Baking');
  await expect(page.getByLabel('Measured final batch weight (optional)', { exact: true })).toHaveValue('900');
  await expect(page.getByLabel('I have listed every weight gain and loss, and know their amounts.')).toBeChecked();
  await page.getByLabel('Amount 2 (optional)').fill('50');
  await expect(page.getByLabel('I have listed every weight gain and loss, and know their amounts.')).not.toBeChecked();
  await page.getByLabel('I have listed every weight gain and loss, and know their amounts.').check();
  await expect(page.getByText(/Declared final mass does not match/)).toBeVisible();
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await expect(page.getByRole('alert')).toContainText('Declared final mass does not match');
});

test('keeps processing details that cannot be edited in the simplified form', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Formulations', exact: true }).click();
  await page.getByRole('button', { name: 'Add formulation' }).click();
  await page.getByLabel('Formulation name *').fill('Earlier batch');
  await goToStep(page, 'Ingredients');
  await page.getByRole('button', { name: 'Create ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Flour');
  await page.getByLabel('Ingredient type').selectOption('atomic');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByLabel('Line 1 quantity').fill('1000');
  await page.getByRole('button', { name: 'Save formulation draft' }).click();

  const profile = { changes: [{ id: 'legacy-addition', kind: 'addition', mass: { value: '50', unit: 'g' } }] };
  await page.evaluate(async (savedProfile) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('aus-food-labelling-v2');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('formulations', 'readwrite');
      const store = transaction.objectStore('formulations');
      const request = store.getAll();
      request.onsuccess = () => {
        const recipe = request.result.find((item: { name: string }) => item.name === 'Earlier batch');
        if (!recipe) {
          transaction.abort();
          return;
        }
        recipe.processMassProfile = savedProfile;
        store.put(recipe);
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(new Error('Could not prepare the earlier processing profile.'));
    });
    database.close();
  }, profile);
  await page.reload();
  await page.getByRole('button', { name: 'Formulations', exact: true }).click();
  await page.getByRole('button', { name: 'Edit formulation Earlier batch' }).click();
  await openFinishedBatchDetail(page, 'weight');
  await expect(page.getByLabel('What happened to the batch weight?')).toHaveValue('existing');
  await expect(page.getByText('Your saved processing details will be kept as they are.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await page.getByRole('button', { name: 'Edit formulation Earlier batch' }).click();
  await openFinishedBatchDetail(page, 'weight');
  await expect(page.getByLabel('What happened to the batch weight?')).toHaveValue('existing');
  const storedProfile = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('aus-food-labelling-v2');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const value = await new Promise<unknown>((resolve, reject) => {
      const request = database.transaction('formulations').objectStore('formulations').getAll();
      request.onsuccess = () => resolve(request.result.find((item: { name: string }) => item.name === 'Earlier batch')?.processMassProfile);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return value;
  });
  expect(storedProfile).toEqual(profile);
});

test('converts percentages only after they reconcile and preserves the resulting amounts', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Formulations', exact: true }).click();
  await page.getByRole('button', { name: 'Add formulation' }).click();
  await page.getByLabel('Formulation name *').fill('Percentage recipe');
  await goToStep(page, 'Ingredients');
  for (const name of ['Flour', 'Sugar']) {
    await page.getByRole('button', { name: 'Create ingredient' }).click();
    await page.getByLabel('Ingredient name *').fill(name);
    await page.getByLabel('Ingredient type').selectOption('atomic');
    await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  }
  await page.getByLabel('Line 1 quantity').fill('10');
  await page.getByLabel('Line 2 quantity').fill('20');
  await page.getByText('Enter amounts as percentages (optional)').click();
  await page.getByLabel('Starting batch weight for percentages').fill('2');
  await page.getByLabel('Starting batch weight unit').selectOption('kg');
  await page.getByLabel('Line 1 percentage').fill('75');
  await page.getByLabel('Line 2 percentage').fill('24.9');
  await expect(page.getByText(/Total: 99.9%/)).toContainText('must be 100%');
  await page.getByRole('button', { name: 'Apply percentages to amounts' }).click();
  await expect(page.getByRole('alert')).toContainText('total 99.9%');
  await expect(page.getByLabel('Line 1 quantity')).toHaveValue('10');
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await expect(page.getByRole('alert')).toContainText('Apply or discard');
  await page.getByLabel('Line 2 percentage').fill('25');
  await page.getByRole('button', { name: 'Apply percentages to amounts' }).click();
  await expect(page.getByLabel('Line 1 quantity')).toHaveValue('1.5');
  await expect(page.getByLabel('Line 2 quantity')).toHaveValue('0.5');
  await expect(page.getByLabel('Line 1 unit')).toHaveValue('kg');
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await page.getByRole('button', { name: 'Edit formulation Percentage recipe' }).click();
  await goToStep(page, 'Ingredients');
  await expect(page.getByLabel('Line 1 quantity')).toHaveValue('1.5');
  await expect(page.getByLabel('Line 2 quantity')).toHaveValue('0.5');
  await expect(page.getByText('About 75.0% of batch')).toBeVisible();
  await page.getByText('Enter amounts as percentages (optional)').click();
  await page.getByLabel('Line 1 percentage').fill('80');
  await openFinishedBatchDetail(page, 'weight');
  await expect(page.getByText('Apply or discard the entered percentages before previewing the batch weight.')).toBeVisible();
  await goToStep(page, 'Review and save');
  await page.getByText('Enter amounts as percentages (optional)').click();
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await expect(page.getByRole('alert')).toContainText('Apply or discard');
  await expect(page.getByLabel('Line 1 percentage')).toBeVisible();
  await page.getByRole('button', { name: 'Discard entered percentages' }).click();
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await page.getByRole('button', { name: 'Edit formulation Percentage recipe' }).click();
  await goToStep(page, 'Ingredients');
  await expect(page.getByLabel('Line 1 quantity')).toHaveValue('1.5');
});

test('records different additive uses on separate recipe lines', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Formulations', exact: true }).click();
  await page.getByRole('button', { name: 'Add formulation' }).click();
  await page.getByLabel('Formulation name *').fill('Example recipe');
  await goToStep(page, 'Ingredients');
  await page.getByRole('button', { name: 'Create ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Example additive');
  await page.getByLabel('Ingredient type').selectOption('additive');
  await page.getByLabel('Additive code number (if known)').fill('999');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByLabel('Line 1 quantity').fill('2');
  await page.locator('.line-row').nth(0).getByText('Special additive use? (optional)').click();
  await page.getByLabel('Line 1 additive use').selectOption('processingAid');
  await page.getByRole('button', { name: 'Add line' }).click();
  await page.getByLabel('Line 2 record').selectOption({ label: 'Example additive' });
  await page.getByLabel('Line 2 quantity').fill('1');
  await page.locator('.line-row').nth(1).getByText('Special additive use? (optional)').click();
  await page.getByLabel('Line 2 additive use').selectOption('unknown');
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await page.getByRole('button', { name: 'Edit formulation Example recipe' }).click();
  await goToStep(page, 'Ingredients');
  await expect(page.getByLabel('Line 1 additive use')).toHaveValue('processingAid');
  await expect(page.getByLabel('Line 2 additive use')).toHaveValue('unknown');
  await page.getByLabel('Line 2 type').selectOption('formulation');
  await page.getByLabel('Line 2 type').selectOption('ingredient');
  await page.getByLabel('Line 2 record').selectOption({ label: 'Example additive' });
  await page.locator('.line-row').nth(1).getByText('Special additive use? (optional)').click();
  await expect(page.getByLabel('Line 2 additive use')).toHaveValue('');
});

test('copies a previous workspace only after confirmation and preserves the original', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const harness = await import('/e2e/previous-workspace-harness.ts');
    await harness.createPreviousWorkspace();
  });
  await page.reload();
  await expect(page.getByText('A previous local workspace is available.')).toBeVisible();
  page.once('dialog', (dialog) => void dialog.dismiss());
  await page.getByRole('button', { name: 'Copy previous workspace' }).click();
  await expect(page.getByText('A previous local workspace is available.')).toBeVisible();
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Copy previous workspace' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Previous workspace copied' })).toBeVisible();
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await expect(page.getByText('Previous cocoa', { exact: true })).toBeVisible();
  expect(await page.evaluate(async () => {
    const harness = await import('/e2e/previous-workspace-harness.ts');
    return harness.previousIngredientName();
  })).toBe('Previous cocoa');
});

test('saves and edits a basic ingredient without a specification or drink questions', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await expect(page.getByLabel('Ingredient identity from the specification')).not.toBeVisible();
  await expect(page.getByLabel('What does this specification say about caffeine?')).not.toBeVisible();
  await page.getByLabel('Ingredient name *').fill('Flour');
  await page.getByLabel('Ingredient type').selectOption('atomic');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await expect(page.getByText('Flour', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit ingredient Flour' }).click();
  await expect(page.getByLabel('Ingredient name *')).toHaveValue('Flour');
  await expect(page.getByLabel('What does this specification say about caffeine?')).not.toBeVisible();
  await page.getByLabel('Ingredient name *').fill('Plain flour');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await expect(page.getByText('Plain flour', { exact: true })).toBeVisible();
  await expect(page.getByText('Specification not supplied')).toBeVisible();
});

test('saves entered ingredient information without source details', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Unsourced milk ingredient');
  await page.getByLabel('Ingredient type').selectOption('atomic');
  await openIngredientSection(page, 'Nutrition');
  await page.getByLabel('Protein g/100 g').fill('3');
  await openIngredientSection(page, 'Allergens');
  await page.getByLabel('Milk', { exact: true }).check();
  await page.getByLabel(/I confirm that ticked allergens are present/).check();
  await page.getByLabel(/I have identified all additives in this ingredient/).check();
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Ingredient draft saved locally.' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit ingredient Unsourced milk ingredient' }).click();
  await openIngredientSection(page, 'Nutrition');
  await expect(page.getByLabel('Protein g/100 g')).toHaveValue('3');
  await openIngredientSection(page, 'Allergens');
  await expect(page.getByLabel('Milk', { exact: true })).toBeChecked();
  await expect(page.getByLabel(/I confirm that ticked allergens are present/)).toBeChecked();
  await expect(page.getByLabel(/I have identified all additives in this ingredient/)).toBeChecked();
});

test('keeps a volume-only nutrition basis when reopening an ingredient', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  const editor = page.locator('form.editor-panel');
  const grid = page.locator('.ingredient-content-grid');
  const editorBox = await editor.boundingBox();
  const gridBox = await grid.boundingBox();
  expect(editorBox).not.toBeNull();
  expect(gridBox).not.toBeNull();
  expect(editorBox!.width).toBeGreaterThan(gridBox!.width - 2);
  await page.getByLabel('Ingredient name *').fill('Juice');
  await page.getByLabel('Ingredient type').selectOption('atomic');
  await openIngredientSection(page, 'Nutrition');
  await page.getByLabel('Nutrition values are per').selectOption('volume');
  await expect(page.getByText(/To calculate using per-100 mL values/)).toBeVisible();
  await page.getByLabel('Energy per 100 mL').fill('150');
  await page.getByLabel('Density (g/mL)').fill('1.2');
  await page.getByText('Density source details (optional)', { exact: true }).click();
  await page.getByLabel('Density source reference').fill('Measured');
  await page.getByLabel('Density source date').fill('2026-01-01');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByRole('button', { name: 'Edit ingredient Juice' }).click();
  await openIngredientSection(page, 'Nutrition');
  await expect(page.getByLabel('Nutrition values are per')).toHaveValue('volume');
  await expect(page.getByLabel('Energy per 100 mL')).toHaveValue('150');
  await expect(page.getByLabel('Density (g/mL)')).toHaveValue('1.2');
  await page.getByText('Density source details (optional)', { exact: true }).click();
  await expect(page.getByLabel('Density source reference')).toHaveValue('Measured');
  await expect(page.getByLabel('Density source date')).toHaveValue('2026-01-01');
  await page.getByLabel('Nutrition values are per').selectOption('mass');
  await expect(page.getByLabel('Energy', { exact: false })).toHaveValue('');
  await page.getByLabel('Nutrition values are per').selectOption('volume');
  await expect(page.getByLabel('Energy per 100 mL')).toHaveValue('150');
});

test('records nutrition and allergen information from general sources', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Flour');
  await page.getByLabel('Ingredient type').selectOption('atomic');
  await openIngredientSection(page, 'Nutrition');
  await page.getByLabel('Nutrition source type').selectOption('database');
  await page.getByLabel('Nutrition source reference').fill('Food database');
  await page.getByLabel('Nutrition source date').fill('2026-01-01');
  await page.getByLabel('Protein').fill('12');
  await openIngredientSection(page, 'Allergens');
  await page.getByLabel('Allergen source type').selectOption('productLabel');
  await page.getByLabel('Allergen source reference').fill('Package label');
  await page.getByLabel('Allergen source date').fill('2026-01-01');
  await page.getByLabel('Wheat', { exact: true }).check();
  await page.getByLabel('Does this wheat-containing ingredient contain gluten?').selectOption('present');
  await page.getByLabel(/I confirm that ticked allergens are present/).check();
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Ingredient draft saved locally.' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit ingredient Flour' }).click();
  await openIngredientSection(page, 'Nutrition');
  await expect(page.getByLabel('Nutrition source type')).toHaveValue('database');
  await expect(page.getByLabel('Protein')).toHaveValue('12');
  await openIngredientSection(page, 'Allergens');
  await expect(page.getByLabel('Allergen source type')).toHaveValue('productLabel');
  await expect(page.getByLabel(/I confirm that ticked allergens are present/)).toBeChecked();
});

test('adds and edits additional nutrients separately for each basis', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Flour');
  await page.getByLabel('Ingredient type').selectOption('atomic');
  await openIngredientSection(page, 'Nutrition');
  await page.getByLabel('Nutrition source type').selectOption('database');
  await page.getByLabel('Nutrition source reference').fill('Food database');
  await page.getByLabel('Nutrition source date').fill('2026-01-01');
  await page.getByLabel('Choose another known nutrient').selectOption('dietaryFibre');
  await page.getByRole('button', { name: 'Add another known nutrient' }).click();
  await page.getByLabel('Dietary fibre amount').fill('0');
  await page.getByLabel('Nutrition values are per').selectOption('volume');
  await page.getByLabel('Choose another known nutrient').selectOption('dietaryFibre');
  await page.getByRole('button', { name: 'Add another known nutrient' }).click();
  await page.getByLabel('Dietary fibre amount').fill('250');
  await page.getByLabel('Dietary fibre unit').selectOption('mg');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByRole('button', { name: 'Edit ingredient Flour' }).click();
  await openIngredientSection(page, 'Nutrition');
  await expect(page.getByLabel('Dietary fibre amount')).toHaveValue('0');
  await page.getByLabel('Nutrition values are per').selectOption('volume');
  await expect(page.getByLabel('Dietary fibre amount')).toHaveValue('250');
  await expect(page.getByLabel('Dietary fibre unit')).toHaveValue('mg');
  await page.getByRole('button', { name: 'Remove Dietary fibre from 100 mL' }).click();
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByRole('button', { name: 'Edit ingredient Flour' }).click();
  await openIngredientSection(page, 'Nutrition');
  await expect(page.getByLabel('Dietary fibre amount')).toHaveValue('0');
  await page.getByLabel('Nutrition values are per').selectOption('volume');
  await expect(page.getByLabel('Dietary fibre amount')).toHaveCount(0);
});

test('records additive concentration and allergens without a separate additive list', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Example additive');
  await page.getByLabel('Ingredient type').selectOption('additive');
  const details = page.getByRole('group', { name: 'Additive details' });
  await details.getByLabel('Additive code number (if known)').fill('999');
  await details.getByLabel('Technological purpose(s)').fill('Preservative');
  await details.getByText('Additive level for use checks (optional)').click();
  await details.getByLabel('Additive concentration', { exact: true }).fill('95');
  await details.getByLabel('Additive concentration unit').selectOption('percentByMass');
  await details.getByLabel('What does this concentration describe?').selectOption('asSupplied');
  await openIngredientSection(page, 'Allergens');
  await page.getByLabel('Milk', { exact: true }).check();
  await page.getByLabel(/I confirm that ticked allergens are present/).check();
  await page.getByLabel(/I have identified all additives in this ingredient/).check();
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Ingredient draft saved locally.' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit ingredient Example additive' }).click();
  await expect(page.getByLabel('Ingredient type')).toHaveValue('additive');
  await expect(details.getByLabel('Additive concentration', { exact: true })).toHaveValue('95');
  await expect(details.getByLabel('Additive concentration unit')).toHaveValue('percentByMass');
  await openIngredientSection(page, 'Allergens');
  await expect(page.getByLabel('Milk', { exact: true })).toBeChecked();
  await expect(page.getByLabel(/I have identified all additives in this ingredient/)).toBeChecked();
  await expect(page.getByText('Earlier additive details', { exact: false })).toHaveCount(0);
  await expect(page.getByText('Earlier source details', { exact: false })).toHaveCount(0);
  await page.getByLabel('Ingredient type').selectOption('atomic');
  await page.getByLabel('Ingredient type').selectOption('additive');
  await expect(details.getByLabel('Additive concentration', { exact: true })).toHaveValue('95');
});

test('switches away from an empty additive choice without leaving an invalid source', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByLabel('Ingredient type').selectOption('additive');
  await page.getByLabel('Ingredient type').selectOption('atomic');
  await page.getByLabel('Ingredient name *').fill('Flour');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await expect(page.getByRole('button', { name: 'Edit ingredient Flour' })).toBeVisible();
});

test('lists an additive ingredient in a compound and invalidates confirmation on edits', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Example preservative');
  await page.getByLabel('Ingredient type').selectOption('additive');
  await page.getByLabel('Additive code number (if known)').fill('999');
  await page.getByText('Additive level for use checks (optional)').click();
  await page.getByLabel('Additive concentration', { exact: true }).fill('95');
  await page.getByLabel('Additive concentration unit').selectOption('percentByMass');
  await page.getByLabel('What does this concentration describe?').selectOption('asSupplied');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Sauce');
  await page.getByLabel('Ingredient type').selectOption('compound');
  await page.getByRole('button', { name: 'Add included ingredient' }).click();
  await page.getByLabel('Component 1').selectOption({ label: 'Example preservative' });
  await page.getByLabel('Amount 1 (optional)').fill('1');
  await page.getByText('Special additive use? (optional)').click();
  await page.getByLabel('Component 1 additive use').selectOption('processingAid');
  await page.getByLabel('Is this the complete list?').selectOption('complete');
  const confirmation = page.getByLabel(/I have identified all additives in this ingredient/);
  await confirmation.check();
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByRole('button', { name: 'Edit ingredient Sauce' }).click();
  await expect(page.getByLabel('Component 1').first()).toHaveValue(/ingredient-/);
  await expect(page.getByLabel('Component 1 additive use')).toHaveValue('processingAid');
  await expect(confirmation).toBeChecked();
  await page.getByLabel('Amount 1 (optional)').fill('2');
  await expect(confirmation).not.toBeChecked();
  await expect(confirmation).toBeDisabled();
});

test('enters a compound ingredient with a known component and unknown amount', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Flour');
  await page.getByLabel('Ingredient type').selectOption('atomic');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Cake mix');
  await page.getByLabel('Ingredient type').selectOption('compound');
  await openIngredientSection(page, 'Nutrition');
  await expect(page.getByLabel('Which nutrition values should be used?')).toHaveValue('components');
  await expect(page.getByLabel('Protein g/100 g')).not.toBeVisible();
  await page.getByLabel('Which nutrition values should be used?').selectOption('whole');
  await page.getByText('Nutrition source details (optional)', { exact: true }).click();
  await page.getByLabel('Nutrition source type').selectOption('user');
  await page.getByLabel('Nutrition source reference').fill('Recipe');
  await page.getByLabel('Nutrition source date').fill('2026-01-01');
  await page.getByLabel('Protein g/100 g').fill('9');
  await page.getByLabel('Which nutrition values should be used?').selectOption('components');
  await page.getByRole('button', { name: 'Add included ingredient' }).click();
  await page.getByLabel('Component 1').selectOption({ label: 'Flour' });
  await expect(page.getByText('Special additive use? (optional)')).toHaveCount(0);
  await page.getByLabel('Is this the complete list?').selectOption('complete');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByRole('button', { name: 'Edit ingredient Cake mix' }).click();
  await openIngredientSection(page, 'Nutrition');
  await expect(page.getByLabel('Which nutrition values should be used?')).toHaveValue('components');
  await page.getByLabel('Which nutrition values should be used?').selectOption('whole');
  await expect(page.getByLabel('Protein g/100 g')).toHaveValue('9');
  await page.getByLabel('Which nutrition values should be used?').selectOption('components');
  await expect(page.getByLabel('Component 1')).toHaveValue(/ingredient-/);
  await expect(page.getByLabel('Amount 1 (optional)')).toHaveValue('');
  await expect(page.getByLabel('Is this the complete list?')).toHaveValue('complete');
  await page.getByLabel('Amount 1 (optional)').fill('50');
  await expect(page.getByLabel('Is this the complete list?')).toHaveValue('partial');
  await page.getByLabel('Is this the complete list?').selectOption('complete');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByRole('button', { name: 'Edit ingredient Cake mix' }).click();
  await expect(page.getByLabel('Amount 1 (optional)')).toHaveValue('50');
  await expect(page.getByLabel('Is this the complete list?')).toHaveValue('complete');
});

test('creates local ingredients, formulations and products with keyboard-accessible controls', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Good work starts with good records.' }),
  ).toBeVisible();
  await expect(page.getByText('No regulatory release installed')).toBeVisible();

  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No ingredients yet' })).toBeVisible();
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Rolled oats');
  await page.getByLabel('Ingredient type').selectOption('atomic');
  await page.getByLabel('Supplier name').fill('Local Grain Co');
  await goToStep(page, 'Nutrition');
  await page.getByLabel('Protein').fill('13.2');
  await page.getByLabel('Nutrition values are per').selectOption('volume');
  await page.getByLabel('Energy per 100 mL').fill('0');
  await page.getByLabel('Sodium per 100 mL').fill('5.1');
  await goToStep(page, 'Allergens');
  await page.getByRole('checkbox', { name: 'Wheat', exact: true }).check();
  await page.getByLabel('Does this wheat-containing ingredient contain gluten?').selectOption('present');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Ingredient draft saved locally.' }),
  ).toBeVisible();
  await expect(page.getByText('Rolled oats', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit ingredient Rolled oats' }).click();
  await goToStep(page, 'Nutrition');
  await expect(page.getByLabel('Protein')).toHaveValue('13.2');
  await page.getByLabel('Nutrition values are per').selectOption('volume');
  await expect(page.getByLabel('Energy per 100 mL')).toHaveValue('0');
  await expect(page.getByLabel('Sodium per 100 mL')).toHaveValue('5.1');
  await expect(page.getByText('This ingredient has values saved for both bases.', { exact: false })).toBeVisible();
  await page.getByLabel('Nutrition values are per').selectOption('mass');
  await expect(page.getByLabel('Protein')).toHaveValue('13.2');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();

  await page.getByRole('button', { name: 'Formulations', exact: true }).click();
  await page.getByRole('button', { name: 'Add formulation' }).click();
  await page.getByLabel('Formulation name *').fill('Oat drink base');
  await goToStep(page, 'Ingredients');
  await page.getByRole('button', { name: 'Add line' }).click();
  await page.getByLabel('Line 1 record').selectOption({ label: 'Rolled oats' });
  await page.getByLabel('Line 1 quantity').fill('100');
  await goToStep(page, 'Review and save');
  await expect(page.getByText(/about 100.0% of the recipe by weight/)).toBeVisible();
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Formulation draft saved locally.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit formulation Oat drink base' }).click();
  await page.getByLabel('Formulation name *').fill('Oat drink base v2');
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await expect(page.getByText('Oat drink base v2')).toBeVisible();
  await page.getByRole('button', { name: 'Expand Oat drink base v2' }).click();
  await expect(page.getByRole('heading', { name: 'Oat drink base v2 summary' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Recipe ingredients' }).locator('ul').first()
    .getByText('Rolled oats', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Products' }).click();
  await page.getByRole('button', { name: 'Add product' }).click();
  await page.getByLabel('Product name *').fill('Oat beverage');
  await page.getByLabel('Recipe (formulation) *').selectOption({ label: 'Oat drink base v2' });
  await page.getByLabel('What does the label tell customers to do before consuming this product?').selectOption('none');
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await page.getByRole('navigation', { name: 'Product sections' }).getByRole('button', { name: 'What is it?' }).click();
  await page.getByLabel('What kind of product is this?').selectOption('caffeinatedBeverage');
  await page.locator('#product-section-type').getByText('Source details (optional)', { exact: true }).click();
  await page.getByLabel('Where is your information coming from?').selectOption('productBrief');
  await page.getByLabel('Is the drink flavoured?').selectOption('yes');
  await page.getByLabel('Is the drink non-alcoholic?').selectOption('yes');
  await page.getByLabel('Does the drink contain caffeine?').selectOption('yes');
  await page.getByLabel('Does the pack or marketing say it improves mental performance?').selectOption('yes');
  await expect(page.getByText('4 of 4 questions answered.')).toBeVisible();
  await page.getByRole('button', { name: 'Back to product list' }).click();
  await expect(page.getByText('Oat beverage', { exact: true })).toBeVisible();
  await page.getByText('Class and name screening · REVIEW REQUIRED').click();
  await expect(page.getByText('Candidate indicated; reviewer confirmation required')).toBeVisible();
  await expect(page.getByText('No approved prescribed-name candidate rules; human review required'))
    .toBeVisible();

  await page.getByRole('button', { name: 'Edit product Oat beverage' }).click();
  await page.getByRole('navigation', { name: 'Product sections' }).getByRole('button', { name: 'Review', exact: true }).click();
  await openTechnicalReview(page);
  await expect(page.getByRole('heading', { name: 'Input trace: Oat beverage' })).toBeVisible();
  await expect(page.getByText('No active regulatory release is installed in this workspace. The draft trace', { exact: false })).toBeVisible();
  await expect(page.locator('section[aria-labelledby="input-trace-title"]').getByText('REVIEW REQUIRED', { exact: true })).toBeVisible();
  await expect(page.getByText(/wheat: present/).first()).toBeVisible();
  await page.getByText('Nutrition calculation inputs and paths').click();
  await expect(page.locator('section[aria-labelledby="input-trace-title"]').getByText(/protein: 13.2 g\/100g.*Oat drink base v2/)).toBeVisible();
  await page.getByText('Allergen evidence and paths').click();
  await expect(page.getByText(/wheat: present.*Oat drink base v2/)).toBeVisible();

  await page.getByRole('button', { name: 'Backup & restore' }).click();
  await page
    .getByLabel('Passphrase for encrypted backup or restore')
    .fill('workspace backup passphrase');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download encrypted backup' }).click();
  const download = await downloadPromise;
  const backupPath = await download.path();
  expect(backupPath).not.toBeNull();
  await page.getByLabel('Workspace backup file').setInputFiles(backupPath!);
  await page.getByLabel('Passphrase for encrypted backup or restore').fill('incorrect passphrase');
  await page.getByRole('button', { name: 'Inspect backup' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'incorrect or the encrypted backup is damaged',
  );
  await page
    .getByLabel('Passphrase for encrypted backup or restore')
    .fill('workspace backup passphrase');
  await page.getByRole('button', { name: 'Inspect backup' }).click();
  await expect(page.getByText('Conflicting record IDs: 3.')).toBeVisible();
  await expect(page.getByText('Restore will replace existing workspace records.')).toBeVisible();
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Confirm and replace workspace' }).click();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Existing records were replaced by the verified backup.' }),
  ).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Products' }).click();
  await expect(page.getByText('Oat beverage', { exact: true })).toBeVisible();
});

test('shows empty states and communicates missing formulation inputs explicitly', async ({
  page,
}) => {
  await page.goto('/');
  const formulationsLink = page.getByRole('button', { name: 'Formulations' });
  await formulationsLink.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'No formulations yet' })).toBeVisible();
  await expect(page.getByText('Save ingredients first', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Add formulation' }).click();
  await goToStep(page, 'Ingredients');
  await expect(page.getByText('Add a line to start.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Give the formulation a name' })).toBeVisible();

  await page.getByRole('button', { name: 'Products' }).click();
  await expect(page.getByRole('heading', { name: 'No products yet' })).toBeVisible();
  await expect(page.getByText('Products need a linked formulation.')).toBeVisible();

  await expect(page.getByRole('button', { name: 'Review & trace' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Backup & restore' }).click();
  await expect(page.getByText('No schema-migration recovery points are recorded')).toBeVisible();
  await page.getByRole('button', { name: 'Request durable storage' }).click();
  await expect(page.locator('.durability-message')).toBeVisible();

  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Give the ingredient a name' })).toBeVisible();
  await expect(page.getByText('Draft', { exact: true })).toBeVisible();
});

test('edits an ingredient and keeps nutrient values the form does not manage', async ({ page }) => {
  await page.goto('/');
  await seedWorkedExamples(page);
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: /^Edit ingredient / }).first().click();
  await page.getByLabel('Supplier name').fill('Edited Supplier Pty Ltd');
  await goToStep(page, 'Nutrition');
  await page.getByLabel('Protein').fill('9.9');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Ingredient draft saved locally.' }),
  ).toBeVisible();
  await expect(page.getByText('Edited Supplier Pty Ltd').first()).toBeVisible();
  await page.getByRole('button', { name: /^Edit ingredient / }).first().click();
  await goToStep(page, 'Nutrition');
  await expect(page.getByLabel('Protein')).toHaveValue('9.9');
});
