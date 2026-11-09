import { expect, test } from '@playwright/test';

async function addYesEvidence(
  page: import('@playwright/test').Page,
  factLabel: string,
  reference: string,
): Promise<void> {
  const field = page.getByRole('group', { name: factLabel });
  await field.getByLabel('Evidence assessment').selectOption('yes');
  await field.getByLabel(`Evidence reference for ${factLabel}`).fill(reference);
  await field.getByLabel(`Evidence date for ${factLabel}`).fill('2026-11-09');
  await field.getByRole('button', { name: `Add evidence for ${factLabel}` }).click();
}

test('creates local ingredients, formulations and products with keyboard-accessible controls', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Good work starts with good records.' }),
  ).toBeVisible();
  await expect(page.getByText('No regulatory release installed')).toBeVisible();

  await page.getByRole('button', { name: 'Ingredients & specifications' }).click();
  await expect(page.getByRole('heading', { name: 'No ingredients yet' })).toBeVisible();
  await page.getByLabel('Ingredient name *').fill('Rolled oats');
  await page.getByLabel('Ingredient type').selectOption('atomic');
  await page.getByLabel('Supplier name').fill('Local Grain Co');
  await page.getByLabel('Specification reference').fill('SPEC-100');
  await page.getByLabel('Specification date').fill('2026-11-09');
  await page.getByLabel('Protein').fill('13.2');
  await page.getByLabel('Allergens identified by supplier').fill('wheat');
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
  await sourcedAdditive.getByLabel('Allergen identifiers recorded as present')
    .fill('milk');
  await sourcedAdditive.getByLabel('Concentration', { exact: true }).fill('12');
  await sourcedAdditive.getByRole('combobox', { name: 'Concentration unit' }).selectOption('mgPerKg');
  await sourcedAdditive.getByRole('combobox', { name: 'Concentration basis' }).selectOption('asSupplied');
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

  await page.getByRole('button', { name: 'Formulations' }).click();
  await page.getByRole('button', { name: 'Add line' }).click();
  await page.getByLabel('Formulation name *').fill('Oat drink base');
  await page.getByLabel('Line 1 record').selectOption({ label: 'Rolled oats' });
  await page.getByLabel('Line 1 quantity').fill('100');
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Formulation draft saved locally.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Expand' }).click();
  await expect(page.getByRole('heading', { name: '100 g requested basis' })).toBeVisible();
  await expect(page.getByText('Rolled oats', { exact: true })).toBeVisible();
  await expect(
    page.getByText(/Ingredient path: Oat drink base → .* → Rolled oats/).first(),
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
  await page.getByLabel('Proposed product name *').fill('Oat beverage');
  await page.getByLabel('Linked formulation *').selectOption({ label: 'Oat drink base' });
  await page.getByLabel('Food state').selectOption('asSold');
  await page.getByText('Classification facts and evidence · review only').click();
  await addYesEvidence(page, 'Is the product flavoured?', 'Product brief, section 2');
  await addYesEvidence(page, 'Is the product non-alcoholic?', 'Supplier specification, section 1');
  await addYesEvidence(page, 'Does the product contain caffeine?', 'Supplier specification, section 3');
  await addYesEvidence(
    page,
    'Is it represented as enhancing mental performance?',
    'Product presentation copy',
  );
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Regulatory review is not performed' }),
  ).toBeVisible();
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
  await expect(page.getByText('Add a line to start.', { exact: false })).toBeVisible();

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

  await page.getByRole('button', { name: 'Ingredients & specifications' }).click();
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await expect(page.getByLabel('Ingredient name *')).toHaveJSProperty('validity.valid', false);
  await expect(page.getByText('Draft', { exact: true })).toBeVisible();
});
