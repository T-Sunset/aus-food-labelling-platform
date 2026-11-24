import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { openAdditiveReview, openFormulationSection, openIngredientSection, openLabelTab, openSavedLabel, savedAdditiveInputs, seedSavedAdditiveInputs } from './helpers';

test('traces an additive inside a compound ingredient and reviews missing amounts', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Example additive');
  await page.getByLabel('Ingredient type').selectOption('additive');
  await page.getByLabel('Additive code number (if known)').fill('999');
  await page.getByText('Additive level for use checks (optional)').click();
  await page.getByLabel('Additive concentration', { exact: true }).fill('10000');
  await page.getByLabel('Additive concentration unit').selectOption('mgPerKg');
  await page.getByLabel('What does this concentration describe?').selectOption('asSupplied');
  await page.getByLabel(/I have identified all additives in this ingredient/).check();
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();

  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Example blend');
  await page.getByLabel('Ingredient type').selectOption('compound');
  await openIngredientSection(page, 'Included ingredients');
  await page.getByRole('button', { name: 'Add included ingredient' }).click();
  await page.getByLabel('Component 1').selectOption({ label: 'Example additive' });
  await page.getByLabel('Amount 1 (optional)').fill('10');
  await page.getByLabel('Is this the complete list?').selectOption('complete');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();

  await page.getByRole('button', { name: 'Formulations', exact: true }).click();
  await page.getByRole('button', { name: 'Add formulation' }).click();
  await page.getByLabel('Formulation name *').fill('Example recipe');
  await openFormulationSection(page, 'Ingredients');
  await page.getByRole('button', { name: 'Add line' }).click();
  await page.getByLabel('Line 1 record').selectOption({ label: 'Example blend' });
  await page.getByLabel('Line 1 quantity').fill('100');
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await page.getByRole('button', { name: 'Add product' }).click();
  await page.getByLabel('Product name *').fill('Example product');
  await page.getByLabel('Recipe (formulation) *').selectOption({ label: 'Example recipe' });
  await page.getByLabel('What does the label tell customers to do before consuming this product?').selectOption('none');
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await seedSavedAdditiveInputs(page, 'Example product', { confirmedCohorts: [], noProcessMassChangeConfirmed: true });
  await openAdditiveReview(page, 'Example product');
  const result = page.getByRole('article', { name: 'Additive permission: 999 (Example additive)' });
  await expect(result).toContainText('Calculated final concentration: 10000 mg/kg');
  await expect(result).toContainText('Example recipe');
  await expect(result).toContainText('Example blend');
  await expect(result).not.toContainText('no complete dated source');
  await expect(result).toContainText('Status: REVIEW REQUIRED');

  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Edit ingredient Example blend' }).click();
  await openIngredientSection(page, 'Included ingredients');
  await page.getByLabel('Amount 1 (optional)').fill('');
  await page.getByLabel('Is this the complete list?').selectOption('complete');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await openAdditiveReview(page, 'Example product');
  await expect(page.getByText('Example additive in Example additive:')).toBeVisible();
  await expect(result).toContainText('Concentration not calculated');
  await expect(result).toContainText('ingredient amounts are incomplete');
});

test('uses an additive with unknown concentration and saves separate wording for nested labels', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Example additive');
  await page.getByLabel('Ingredient type').selectOption('additive');
  await page.getByLabel('Additive code number (if known)').fill('999');
  await expect(page.getByText('Additive level for use checks (optional)')).toBeVisible();
  await expect(page.getByLabel('Additive concentration', { exact: true })).not.toBeVisible();
  await expect(page.getByText('Label wording options (optional)')).toHaveCount(0);
  await page.getByLabel(/I have identified all additives in this ingredient/).check();
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();

  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Example blend');
  await page.getByLabel('Ingredient type').selectOption('compound');
  await page.getByRole('button', { name: 'Add included ingredient' }).click();
  await page.getByLabel('Component 1').selectOption({ label: 'Example additive' });
  await page.getByLabel('Amount 1 (optional)').fill('100');
  await page.getByLabel('Is this the complete list?').selectOption('complete');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByRole('button', { name: 'Formulations', exact: true }).click();
  await page.getByRole('button', { name: 'Add formulation' }).click();
  await page.getByLabel('Formulation name *').fill('Example recipe');
  await openFormulationSection(page, 'Ingredients');
  await page.getByRole('button', { name: 'Add line' }).click();
  await page.getByLabel('Line 1 record').selectOption({ label: 'Example blend' });
  await page.getByLabel('Line 1 quantity').fill('100');
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await page.getByRole('button', { name: 'Add product' }).click();
  await page.getByLabel('Product name *').fill('Example product');
  await page.getByLabel('Recipe (formulation) *').selectOption({ label: 'Example recipe' });
  await page.getByLabel('What does the label tell customers to do before consuming this product?').selectOption('none');
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await openAdditiveReview(page, 'Example product');
  await expect(page.getByRole('article', { name: 'Additive permission: 999 (Example additive)' }))
    .toContainText('CONCENTRATION_MISSING');

  await page.getByRole('navigation', { name: 'Product sections' }).getByRole('button', { name: 'Review', exact: true }).click();
  const review = page.locator('#product-section-review');
  await expect(page.locator('#product-section-additives')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Product sections' }).getByRole('button', { name: 'Additives & names' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Caffeine concentration check' })).toHaveCount(0);
  await review.getByText('Other draft review items', { exact: true }).click();
  const additiveIssue = review.locator('details.review-group').filter({ hasText: 'Additive and name checks' });
  await additiveIssue.locator('summary').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await additiveIssue.getByRole('button', { name: 'Open technical additive and name review' }).focus();
  await page.keyboard.press('Enter');
  await expect(review.getByText('Technical additive and name review', { exact: true })).toBeFocused();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  await review.getByRole('button', { name: 'Open Labels' }).click();
  await openLabelTab(page, 'Ingredients & allergens');
  await page.getByText('Additive wording', { exact: true }).click();
  const wording = page.getByRole('group', { name: 'Example additive (Example additive)' });
  await wording.getByLabel('How should this additive be described?').selectOption('schedule7Class');
  await wording.getByLabel('Proposed purpose for the label').fill('Preservative');
  await wording.getByLabel("Use the additive's name or number?").selectOption('schedule8CodeNumber');
  await expect(page.getByRole('region', { name: 'Draft declaration' })).toContainText('Preservative (999)');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  await openLabelTab(page, 'Label setup');
  await page.getByLabel('Label name').fill('Number label');
  await page.getByRole('button', { name: 'Save label draft', exact: true }).click();
  await page.getByRole('button', { name: 'Duplicate label draft' }).click();
  await page.getByLabel('Label name').fill('Name label');
  await openLabelTab(page, 'Ingredients & allergens');
  await wording.getByLabel("Use the additive's name or number?").selectOption('schedule8Name');
  await expect(page.getByRole('region', { name: 'Draft declaration' })).toContainText('Preservative (Example additive)');
  await page.getByRole('button', { name: 'Save label draft', exact: true }).click();
  await openSavedLabel(page, 'Number label');
  await expect(wording.getByLabel("Use the additive's name or number?")).toHaveValue('schedule8CodeNumber');
  await expect(page.getByRole('region', { name: 'Draft declaration' })).toContainText('Preservative (999)');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download review report' }).click();
  const path = await (await download).path();
  if (!path) throw new Error('Review report was not saved.');
  expect((await readFile(path)).toString('latin1')).toContain('candidate wording: Preservative \\(999\\)');
  await page.reload();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await openSavedLabel(page, 'Name label');
  await openLabelTab(page, 'Ingredients & allergens');
  await page.getByText('Additive wording', { exact: true }).click();
  await expect(wording.getByLabel("Use the additive's name or number?")).toHaveValue('schedule8Name');
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Edit ingredient Example additive' }).click();
  await expect(page.getByText('Additive level for use checks (optional)')).toBeVisible();
  await page.getByText('Additive level for use checks (optional)').click();
  await expect(page.getByLabel('Additive concentration', { exact: true })).toHaveValue('');
});

test('preserves older additive facts and review results through save and encrypted restore', async ({ page, browser }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Illustrative demo data loaded locally' }))
    .toBeVisible();
  const inputs = {
    confirmedCohorts: ['food_for_infants'] as const,
    outputUnit: 'mg/L' as const,
    noProcessMassChangeConfirmed: true,
    addedSugarsPer100g: '5',
    sugarsBasisConfirmed: true,
    evidence: { reference: 'Illustrative calculation sheet', sourceDate: '2026-01-01' },
    finalDensity: { gramsPerMillilitre: '1.2', evidenceReference: 'Density record', sourceDate: '2026-01-01' },
  };
  await seedSavedAdditiveInputs(page, 'Illustrative demo product', inputs);
  await openAdditiveReview(page, 'Illustrative demo product');
  await expect(page.getByRole('heading', { name: 'Facts you confirm' })).toHaveCount(0);
  await expect(page.getByText(/Previously saved specialist inputs remain/)).toBeVisible();
  const sweetened = page.getByRole('article', { name: "Infant food 'sweetened' word" });
  await expect(sweetened.getByText('Status: REVIEW REQUIRED')).toBeVisible();
  await expect(sweetened.getByText(/RULE_NOT_APPROVED/)).toBeVisible();
  await expect(page.getByText('Status: PASS')).toHaveCount(0);
  await expect(page.getByText('Status: FAIL')).toHaveCount(0);
  await expect(page.getByText('does not certify legal compliance').first()).toBeVisible();
  await expect(page.getByText('ILLUSTRATIVE ONLY', { exact: true })).toHaveCount(0);
  await page.getByLabel(/Show what each result would be/).check();
  await expect(sweetened.getByText('ILLUSTRATIVE ONLY', { exact: true })).toBeVisible();
  await expect(sweetened.getByText('Status: REVIEW REQUIRED')).toBeVisible();
  await page.getByRole('button', { name: 'Save product draft' }).click();
  expect(await savedAdditiveInputs(page, 'Illustrative demo product')).toEqual(inputs);
  await page.getByRole('button', { name: 'Backup & restore' }).click();
  await page.getByLabel('Passphrase for encrypted backup or restore').fill('additive test backup');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download encrypted backup' }).click();
  const path = await (await download).path();
  if (!path) throw new Error('Encrypted backup was not saved.');
  const restored = await browser.newContext();
  try {
    const restoredPage = await restored.newPage();
    await restoredPage.goto('/');
    await restoredPage.getByRole('button', { name: 'Backup & restore' }).click();
    await restoredPage.getByLabel('Workspace backup file').setInputFiles(path);
    await restoredPage.getByLabel('Passphrase for encrypted backup or restore').fill('additive test backup');
    await restoredPage.getByRole('button', { name: 'Inspect backup' }).click();
    restoredPage.once('dialog', (dialog) => void dialog.accept());
    await restoredPage.getByRole('button', { name: 'Confirm restore to this device' }).click();
    await expect(restoredPage.getByRole('status').filter({ hasText: 'Workspace restored from the verified backup' })).toBeVisible();
    expect(await savedAdditiveInputs(restoredPage, 'Illustrative demo product')).toEqual(inputs);
    await openAdditiveReview(restoredPage, 'Illustrative demo product');
    await expect(restoredPage.getByRole('article', { name: "Infant food 'sweetened' word" })).toContainText('RULE_NOT_APPROVED');
    await expect(restoredPage.getByLabel(/Show what each result would be/)).not.toBeChecked();
  } finally {
    await restored.close();
  }
});