import { expect, test } from '@playwright/test';
import { openIngredientSection } from './helpers';

async function goToStep(page: import('@playwright/test').Page, title: string): Promise<void> {
  if (await page.locator('details.ingredient-section').count()) {
    const section = title === 'Review and save' ? 'Review' : title;
    await openIngredientSection(page, section);
  } else {
    await page.getByRole('navigation', { name: 'Steps' }).getByRole('button', { name: title }).click();
  }
}

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
  await page.getByLabel('Density source reference').fill('Measured');
  await page.getByLabel('Density source date').fill('2026-01-01');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByRole('button', { name: 'Edit ingredient Juice' }).click();
  await openIngredientSection(page, 'Nutrition');
  await expect(page.getByLabel('Nutrition values are per')).toHaveValue('volume');
  await expect(page.getByLabel('Energy per 100 mL')).toHaveValue('150');
  await expect(page.getByLabel('Density (g/mL)')).toHaveValue('1.2');
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
  await details.getByLabel('Code number (source)').fill('999');
  await details.getByLabel('Technological purpose(s)').fill('Preservative');
  await details.getByLabel('I know how much of this ingredient is the additive').check();
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
  await page.getByLabel('Code number (source)').fill('999');
  await page.getByLabel('I know how much of this ingredient is the additive').check();
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
  await page.getByLabel('Is this the complete list?').selectOption('complete');
  const confirmation = page.getByLabel(/I have identified all additives in this ingredient/);
  await confirmation.check();
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByRole('button', { name: 'Edit ingredient Sauce' }).click();
  await expect(page.getByLabel('Component 1')).toHaveValue(/ingredient-/);
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
  await page.getByLabel('Wheat').check();
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
  await page.getByRole('button', { name: 'Expand' }).click();
  await expect(page.getByRole('heading', { name: '100 g requested basis' })).toBeVisible();
  await expect(page.getByText('Rolled oats', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Products' }).click();
  await page.getByRole('button', { name: 'Add product' }).click();
  await page.getByLabel('Product name *').fill('Oat beverage');
  await page.getByLabel('Recipe (formulation) *').selectOption({ label: 'Oat drink base v2' });
  await page.getByLabel('Food state *').selectOption('asSold');
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await page.getByLabel('What kind of product is this?').selectOption('caffeinatedBeverage');
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

  await page.getByRole('button', { name: 'Review & trace' }).click();
  await expect(page.getByRole('heading', { name: 'Review & trace' })).toBeVisible();
  await expect(page.getByText('No active regulatory release is installed')).toBeVisible();
  await expect(page.getByText('REVIEW REQUIRED', { exact: true })).toBeVisible();
  await expect(page.getByText(/wheat: present/)).toBeVisible();

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

  await page.getByRole('button', { name: 'Review & trace' }).click();
  await expect(page.getByRole('heading', { name: 'No product drafts to review' })).toBeVisible();
  await expect(page.getByText('Draft inputs are not a compliance result.')).toBeVisible();

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
  await page.getByRole('button', { name: 'Load worked examples' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Worked examples loaded' })).toBeVisible();
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
