import { expect, test } from '@playwright/test';

async function goToStep(page: import('@playwright/test').Page, title: string): Promise<void> {
  await page.getByRole('navigation', { name: 'Steps' }).getByRole('button', { name: title }).click();
}

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
  await goToStep(page, 'Spec sheet');
  await page.getByLabel('Specification reference').fill('SPEC-100');
  await page.getByLabel('Specification date').fill('2026-11-09');
  await goToStep(page, 'Nutrition');
  await page.getByLabel('Protein').fill('13.2');
  await goToStep(page, 'Allergens');
  await page.getByLabel('Wheat').check();
  await goToStep(page, 'Additives');
  await page.getByRole('button', { name: 'Add additive source' }).click();
  const sourcedAdditive = page.getByRole('group', { name: 'Additive source 1' });
  await sourcedAdditive.getByLabel('Additive identity *').fill('Example preservative');
  await sourcedAdditive.getByLabel('Code number (source)').fill('999');
  await sourcedAdditive.getByLabel('Technological purpose(s)').fill('preservation');
  await sourcedAdditive.getByLabel('Source status').selectOption('carriedOver');
  await sourcedAdditive.getByLabel('Declaration route').selectOption('schedule7Class');
  await sourcedAdditive.getByLabel('Proposed Schedule 7 class name').fill('Example source class');
  await sourcedAdditive.getByRole('combobox', { name: 'Proposed Schedule 8 identifier' })
    .selectOption('schedule8Name');
  await sourcedAdditive.getByLabel('The spec sheet gives an amount').check();
  await sourcedAdditive.getByLabel('Concentration', { exact: true }).fill('12');
  await sourcedAdditive.getByRole('combobox', { name: 'Concentration unit' }).selectOption('mgPerKg');
  await sourcedAdditive.getByRole('combobox', { name: 'Concentration basis' }).selectOption('asSupplied');
  await sourcedAdditive.getByLabel('Record where this came from').check();
  await sourcedAdditive.getByLabel('Milk').check();
  await sourcedAdditive.getByLabel('Evidence reference', { exact: true })
    .fill('Specification, section 4');
  await sourcedAdditive.getByLabel('Evidence date', { exact: true }).fill('2026-11-09');
  await page.getByRole('button', { name: 'Add additive source' }).click();
  const incompleteAdditive = page.getByRole('group', { name: 'Additive source 2' });
  await incompleteAdditive.getByLabel('Additive identity *').fill('Unspecified additive');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Ingredient draft saved locally.' }),
  ).toBeVisible();
  await expect(page.getByText('Rolled oats', { exact: true })).toBeVisible();
  await expect(page.getByText('Spec SPEC-100 · 2026-11-09')).toBeVisible();
  await page.getByText(/2 additive source records/).click();
  await expect(page.getByText('Example preservative · Carried over')).toBeVisible();
  await expect(page.getByText(
    'Declaration candidate: Example source class (Example preservative) · REVIEW REQUIRED',
  )).toBeVisible();

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
  await expect(
    page.getByText(/Ingredient path: Oat drink base v2 → .* → Rolled oats/).first(),
  ).toBeVisible();
  await expect(page.getByText('Evidence: Specification, section 4 · 2026-11-09')).toBeVisible();
  await expect(page.getByText(/Evidence path:/).first()).toBeVisible();
  await expect(page.getByText('milk', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(
    'Declaration candidate: Example source class (Example preservative) · REVIEW REQUIRED',
  )).toBeVisible();
  await expect(page.getByText('Source status: Status not assessed')).toBeVisible();
  await expect(page.getByText('Purpose not supplied')).toBeVisible();
  await expect(page.getByText('Concentration not supplied')).toBeVisible();
  await expect(page.getByText('Source evidence not supplied')).toBeVisible();

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
  await expect(page.getByText('SPEC-100 · 2026-11-09', { exact: true })).toBeVisible();
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
  await goToStep(page, 'Spec sheet');
  await page.getByLabel('Specification reference').fill('EDIT-SPEC-1');
  await page.getByLabel('Specification date').fill('2026-12-01');
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
