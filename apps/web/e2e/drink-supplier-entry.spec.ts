import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { openFormulationSection, openIngredientSection, openLabelNutrition, openLabelTab, openSavedLabel } from './helpers';

async function step(page: Page, name: string): Promise<void> {
  if (await page.locator('details.ingredient-section').count()) {
    await openIngredientSection(page, name);
  } else {
    await openFormulationSection(page, name);
  }
}

interface Supplier {
  name: string;
  reference: string;
  identity: string;
  energy: string;
  sugars: string;
  unspecified?: boolean;
  composition?: string;
  additive?: 'caffeine' | 'acid';
}

async function enterSupplier(page: Page, supplier: Supplier): Promise<void> {
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill(supplier.name);
  await page.getByLabel('Ingredient type').selectOption(supplier.composition ? 'compound' : supplier.additive ? 'additive' : 'atomic');
  if (supplier.composition) await page.getByLabel('Composition formulation').selectOption({ label: supplier.composition });
  if (supplier.additive) {
    if (supplier.additive === 'acid') {
      await page.getByLabel('Additive code number (if known)').fill('330');
      await page.getByLabel('Technological purpose(s)').fill('acidity regulation');
    }
    await page.getByText('Additive level for use checks (optional)').click();
    await page.getByLabel('Additive concentration', { exact: true }).fill('100');
    await page.getByLabel('Additive concentration unit').selectOption('percentByMass');
    await page.getByLabel('What does this concentration describe?').selectOption('asSupplied');
    await page.getByText('Additive source details (optional)').click();
    await page.getByLabel('Additive source reference').fill(supplier.reference);
    await page.getByLabel('Additive source date').fill('2026-11-01');
  }
  if (!supplier.unspecified) {
    await step(page, 'Nutrition');
    if (supplier.composition) await page.getByLabel('Which nutrition values should be used?').selectOption('whole');
    for (const [label, value] of [
      ['Energy', supplier.energy], ['Protein', '0'], ['Fat, total', '0'], ['Saturated fat', '0'],
      ['Carbohydrate', supplier.sugars], ['Sugars', supplier.sugars], ['Sodium', '0'],
    ]) await page.getByRole('textbox', { name: label!, exact: false }).fill(value!);
    await step(page, 'Allergens');
    await page.getByLabel(/I confirm that ticked allergens are present/).check();
    if (!supplier.composition) await page.getByLabel(/I have identified all additives in this ingredient/).check();
  }
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Ingredient draft saved locally.' })).toBeVisible();
}

async function addLines(page: Page, lines: readonly [string, string, string][]): Promise<void> {
  await step(page, 'Ingredients');
  for (const [index, [name, amount, unit]] of lines.entries()) {
    await page.getByRole('button', { name: 'Add line' }).click();
    await page.getByLabel(`Line ${index + 1} record`).selectOption({ label: name });
    await page.getByLabel(`Line ${index + 1} quantity`).fill(amount);
    await page.getByLabel(`Line ${index + 1} unit`).selectOption(unit);
  }
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Formulation draft saved locally.' })).toBeVisible();
}

test('enters the fictional drink supplier information and restores both backup types', async ({ browser }) => {
  test.setTimeout(120_000);
  const source = await browser.newContext();
  try {
    const page = await source.newPage();
    await page.goto('/');
    await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
    for (const supplier of [
      { name: 'Water', reference: 'SPEC-WATER', identity: 'water', energy: '0', sugars: '0' },
      { name: 'Sugar', reference: 'SPEC-SUGAR', identity: 'sugar', energy: '1700', sugars: '100' },
      { name: 'Citric acid', reference: 'SPEC-ACID', identity: 'citric-acid', energy: '1000', sugars: '0', additive: 'acid' as const },
      { name: 'Caffeine', reference: 'SPEC-CAFFEINE', identity: 'caffeine', energy: '0', sugars: '0', additive: 'caffeine' as const },
      { name: 'Lemon oil', reference: 'SPEC-FLAVOUR', identity: 'lemon-peel-oil', energy: '', sugars: '', unspecified: true },
    ]) await enterSupplier(page, supplier);

    await page.getByRole('button', { name: 'Formulations', exact: true }).click();
    await page.getByRole('button', { name: 'Add formulation' }).click();
    await page.getByLabel('Formulation name *').fill('Citrus composition');
    await addLines(page, [['Water', '99.9', 'g'], ['Lemon oil', '0.1', 'g']]);
    await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
    await enterSupplier(page, {
      name: 'Citrus flavour', reference: 'SPEC-FLAVOUR', identity: 'flavour-blend',
      energy: '3.7', sugars: '0', composition: 'Citrus composition',
    });
    await page.getByRole('button', { name: 'Formulations', exact: true }).click();
    await page.getByRole('button', { name: 'Edit formulation Citrus composition' }).click();
    await step(page, 'Ingredients');
    await page.getByLabel('Are all the ingredients in this component recipe listed?').selectOption('complete');
    await page.getByText('Component list source details (optional)', { exact: true }).click();
    await page.getByLabel('Composition evidence reference').fill('SPEC-FLAVOUR');
    await page.getByLabel('Composition evidence date').fill('2026-11-01');
    await page.getByRole('button', { name: 'Save formulation draft' }).click();
    await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
    await page.getByRole('button', { name: 'Edit ingredient Citrus flavour' }).click();
    await page.getByLabel(/I have identified all additives in this ingredient/).check();
    await page.getByRole('button', { name: 'Save ingredient draft' }).click();
    await page.getByRole('button', { name: 'Formulations', exact: true }).click();
    await page.getByRole('button', { name: 'Add formulation' }).click();
    await page.getByLabel('Formulation name *').fill('Fictional drink');
    await addLines(page, [
      ['Water', '93.47', 'kg'], ['Sugar', '10', 'kg'], ['Citric acid', '0.20', 'kg'],
      ['Citrus flavour', '0.30', 'kg'], ['Caffeine', '0.030', 'kg'],
    ]);

    await page.getByRole('button', { name: 'Products', exact: true }).click();
    await page.getByRole('button', { name: 'Add product' }).click();
    await page.getByLabel('Product name *').fill('Example Citrus Lift');
    await page.getByLabel('Recipe (formulation) *').selectOption({ label: 'Fictional drink' });
    await page.getByLabel('What does the label tell customers to do before consuming this product?').selectOption('none');
    await page.getByRole('button', { name: 'Save product draft' }).click();
    await page.getByRole('navigation', { name: 'Product sections' }).getByRole('button', { name: 'What is it?' }).click();
    await page.getByLabel('What kind of product is this?').selectOption('caffeinatedBeverage');
    await expect(page.getByText('Saved on this device.').last()).toBeVisible();
    await page.getByRole('navigation', { name: 'Product sections' }).getByRole('button', { name: 'Customer directions and nutrition' }).click();
    await page.getByLabel('Serving size', { exact: true }).fill('330');
    await page.getByLabel('Serving size unit').selectOption('mL');
    await page.getByLabel('Servings per pack').fill('1');
    await page.getByLabel('Net contents', { exact: true }).fill('330');
    await page.getByLabel('Net contents unit').selectOption('mL');
    await page.getByLabel('Is the food solid or liquid?').selectOption('liquid');
    await page.getByLabel('Final food density (g/mL)').fill('1.040');
    await page.getByRole('button', { name: 'Save product draft' }).click();
    await page.getByRole('button', { name: 'Labels', exact: true }).click();
    await openLabelTab(page, 'Ingredients & allergens');
    await page.getByText('Additive wording', { exact: true }).click();
    await page.getByRole('group', { name: 'Caffeine (Caffeine)' })
      .getByLabel('How should this additive be described?').selectOption('addedCaffeine');
    await page.getByRole('button', { name: 'Save label draft', exact: true }).click();
    await openLabelNutrition(page);
    const energy = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Energy', exact: true }) });
    const sugars = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: '- sugars', exact: true }) });
    await expect(energy.getByRole('cell')).toHaveText(['568 kJ', '172 kJ']);
    await expect(sugars.getByRole('cell')).toHaveText(['33.0 g', '10.0 g']);
    await expect(page.getByRole('button', { name: 'Export Incomplete Review Copy PDF' })).toBeEnabled();
    const reportDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download review report' }).click();
    const reportPath = await (await reportDownload).path();
    if (!reportPath) throw new Error('The fictional drink review report was not downloaded.');
    const report = (await readFile(reportPath)).toString('latin1');
    expect(report).toContain('Product: Example Citrus Lift.');
    expect(report).toContain('- sugars: 33.0 g; 10.0 g.');
    expect(report).toContain('does not certify legal compliance');
    const copyDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Incomplete Review Copy PDF' }).click();
    const copyPath = await (await copyDownload).path();
    if (!copyPath) throw new Error('The fictional drink review copy was not downloaded.');
    const copy = (await readFile(copyPath)).toString('latin1');
    expect(copy).toContain('INCOMPLETE REVIEW COPY');
    expect(copy).toContain('Example Citrus Lift');
    await page.getByRole('button', { name: 'Review product checks and evidence' }).click();
    const caffeineCheck = page.getByRole('region', { name: 'Caffeine concentration check' });
    await expect(caffeineCheck).toContainText('REVIEW REQUIRED');
    await expect(caffeineCheck).toContainText('outside the verified rule period');
    await caffeineCheck.getByText('Source and limitations').click();
    await expect(caffeineCheck).toContainText(/Caffeine content in .*: 100 g\/100g/);

    await page.getByRole('button', { name: 'Backup & restore' }).click();
    for (const encrypted of [false, true]) {
      if (encrypted) await page.getByLabel('Passphrase for encrypted backup or restore').fill('test passphrase');
      else page.once('dialog', (dialog) => void dialog.accept());
      const downloading = page.waitForEvent('download');
      await page.getByRole('button', { name: encrypted ? 'Download encrypted backup' : 'Download unencrypted backup' }).click();
      const backupPath = await (await downloading).path();
      if (!backupPath) throw new Error('The backup was not downloaded.');
      const restored = await browser.newContext();
      try {
        const restoredPage = await restored.newPage();
        await restoredPage.goto('/');
        await restoredPage.getByRole('button', { name: 'Backup & restore' }).click();
        await restoredPage.getByLabel('Workspace backup file').setInputFiles(backupPath);
        if (encrypted) await restoredPage.getByLabel('Passphrase for encrypted backup or restore').fill('test passphrase');
        await restoredPage.getByRole('button', { name: 'Inspect backup' }).click();
        await expect(restoredPage.getByText(/Backup counts: 6 ingredients,\s*2 formulations,\s*1 products/)).toBeVisible();
        restoredPage.once('dialog', (dialog) => void dialog.accept());
        await restoredPage.getByRole('button', { name: 'Confirm restore to this device' }).click();
        await expect(restoredPage.getByRole('status').filter({ hasText: 'Workspace restored from the verified backup' })).toBeVisible();
        await restoredPage.getByRole('button', { name: 'Ingredients', exact: true }).click();
        await restoredPage.getByRole('button', { name: 'Edit ingredient Caffeine' }).click();
        await expect(restoredPage.getByLabel('Ingredient type')).toHaveValue('additive');
        await expect(restoredPage.getByLabel('Additive concentration', { exact: true })).toHaveValue('100');
        await expect(restoredPage.getByLabel(/I have identified all additives in this ingredient/)).toBeChecked();
        await expect(restoredPage.getByText('Caffeine information (optional)', { exact: true })).toHaveCount(0);
        await restoredPage.getByRole('button', { name: 'Back to ingredient list' }).click();
        await restoredPage.getByRole('button', { name: 'Labels', exact: true }).click();
        await openSavedLabel(restoredPage, 'Example Citrus Lift label');
        await openLabelTab(restoredPage, 'Ingredients & allergens');
        await restoredPage.getByText('Additive wording', { exact: true }).click();
        await expect(restoredPage.getByRole('group', { name: 'Caffeine (Caffeine)' })
          .getByLabel('How should this additive be described?')).toHaveValue('addedCaffeine');
        await restoredPage.getByRole('button', { name: 'Ingredients', exact: true }).click();
        await restoredPage.getByRole('button', { name: 'Edit ingredient Sugar' }).click();
        await step(restoredPage, 'Nutrition');
        await expect(restoredPage.getByLabel('Energy', { exact: false })).toHaveValue('1700');
        await expect(restoredPage.getByRole('textbox', { name: 'Sugars g/100 g' })).toHaveValue('100');
        await expect(restoredPage.getByLabel('Protein', { exact: false })).toHaveValue('0');
        await restoredPage.getByRole('button', { name: 'Back to ingredient list' }).click();
        await restoredPage.getByRole('button', { name: 'Edit ingredient Citric acid' }).click();
        await expect(restoredPage.getByLabel('Ingredient type')).toHaveValue('additive');
        await expect(restoredPage.getByLabel('Technological purpose(s)')).toHaveValue('acidity regulation');
        await restoredPage.getByText('Additive source details (optional)').click();
        await expect(restoredPage.getByLabel('Additive source reference')).toHaveValue('SPEC-ACID');
        await restoredPage.getByRole('button', { name: 'Back to ingredient list' }).click();
        await restoredPage.getByRole('button', { name: 'Edit ingredient Lemon oil' }).click();
        await step(restoredPage, 'Nutrition');
        await expect(restoredPage.getByLabel('Energy', { exact: false })).toHaveValue('');
        await restoredPage.getByRole('button', { name: 'Back to ingredient list' }).click();
        await restoredPage.getByRole('button', { name: 'Edit ingredient Citrus flavour' }).click();
        await expect(restoredPage.getByLabel('Composition formulation')).toHaveValue(
          await restoredPage.getByLabel('Composition formulation').locator('option', { hasText: 'Citrus composition' }).getAttribute('value') ?? '',
        );
        await step(restoredPage, 'Nutrition');
        await expect(restoredPage.getByLabel('Energy', { exact: false })).toHaveValue('3.7');
        await step(restoredPage, 'Allergens');
        await expect(restoredPage.getByLabel(/I confirm that ticked allergens are present/)).toBeChecked();
        await restoredPage.getByRole('button', { name: 'Formulations', exact: true }).click();
        await restoredPage.getByRole('button', { name: 'Edit formulation Citrus composition' }).click();
        await step(restoredPage, 'Ingredients');
        await expect(restoredPage.getByLabel('Are all the ingredients in this component recipe listed?')).toHaveValue('complete');
        await restoredPage.getByText('Component list source details (optional)', { exact: true }).click();
        await expect(restoredPage.getByLabel('Composition evidence reference')).toHaveValue('SPEC-FLAVOUR');
        await step(restoredPage, 'Ingredients');
        await expect(restoredPage.getByLabel('Line 1 quantity')).toHaveValue('99.9');
        await expect(restoredPage.getByLabel('Line 2 quantity')).toHaveValue('0.1');
        await restoredPage.getByRole('button', { name: 'Back to formulation list' }).click();
        await restoredPage.getByRole('button', { name: 'Edit formulation Fictional drink' }).click();
        await step(restoredPage, 'Ingredients');
        for (const [index, amount] of ['93.47', '10', '0.20', '0.30', '0.030'].entries()) {
          await expect(restoredPage.getByLabel(`Line ${index + 1} quantity`)).toHaveValue(amount);
          await expect(restoredPage.getByLabel(`Line ${index + 1} unit`)).toHaveValue('kg');
        }
        await restoredPage.getByRole('button', { name: 'Labels', exact: true }).click();
        await expect(restoredPage.getByLabel('Product draft').locator('option:checked')).toHaveText('Example Citrus Lift');
        await openLabelNutrition(restoredPage);
        const restoredEnergy = restoredPage.getByRole('row').filter({
          has: restoredPage.getByRole('rowheader', { name: 'Energy', exact: true }),
        });
        await expect(restoredEnergy.getByRole('cell')).toHaveText(['568 kJ', '172 kJ']);
      } finally {
        await restored.close();
      }
    }
  } finally {
    await source.close();
  }
});
