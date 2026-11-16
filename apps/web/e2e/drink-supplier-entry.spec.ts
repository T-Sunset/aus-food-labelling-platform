import { expect, test, type Page } from '@playwright/test';
import { openIngredientSection } from './helpers';

async function step(page: Page, name: string): Promise<void> {
  if (await page.locator('details.ingredient-section').count()) {
    await openIngredientSection(page, name === 'Spec sheet' ? 'Source details' : name === 'Additives' ? 'Additives and other ingredients' : name);
    if (name === 'Spec sheet') {
      const legacy = page.getByText('Earlier drink-specific information (optional)');
      if (!(await legacy.locator('..').evaluate((element) => (element as HTMLDetailsElement).open))) await legacy.click();
    }
  } else {
    await page.getByRole('navigation', { name: 'Steps' }).getByRole('button', { name }).click();
  }
}

interface Supplier {
  name: string;
  reference: string;
  identity: string;
  energy: string;
  sugars: string;
  caffeine?: boolean;
  unspecified?: boolean;
  composition?: string;
  additive?: 'caffeine' | 'acid';
}

async function enterSupplier(page: Page, supplier: Supplier): Promise<void> {
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill(supplier.name);
  await page.getByLabel('Ingredient type').selectOption(supplier.composition ? 'compound' : 'atomic');
  if (supplier.composition) {
    await page.getByLabel('Composition formulation *').selectOption({ label: supplier.composition });
  }
  await step(page, 'Spec sheet');
  await page.getByLabel('Specification reference').fill(supplier.reference);
  await page.getByLabel('Specification date').fill('2026-11-01');
  await page.getByLabel('Ingredient identity from the specification').selectOption(supplier.identity);
  await page.getByLabel('What does this specification say about caffeine?')
    .selectOption(supplier.unspecified ? '' : supplier.caffeine ? 'present' : 'absent');
  if (supplier.caffeine) {
    await page.getByLabel('Caffeine amount in the supplied ingredient').fill('100');
    await page.getByLabel('Caffeine amount unit').selectOption('g/100g');
  }
  await page.getByText('Other information stated by this supplier (optional)').click();
  if (!supplier.unspecified) {
    for (const label of [
      'Fruit juice in this supplied ingredient',
      'Added vitamins in this supplied ingredient',
      'Added taurine in this supplied ingredient',
      'Other added Schedule 28 substances in this supplied ingredient',
    ]) await page.getByLabel(label).selectOption('absent');
  }
  if (!supplier.unspecified) {
    await step(page, 'Nutrition');
    for (const [label, value] of [
      ['Energy', supplier.energy], ['Protein', '0'], ['Fat, total', '0'], ['Saturated fat', '0'],
      ['Carbohydrate', supplier.sugars], ['Sugars', supplier.sugars], ['Sodium', '0'],
    ]) {
      await page.getByLabel(label!, { exact: false }).fill(value!);
    }
    await step(page, 'Allergens');
    await page.getByLabel(/I checked the supplier information for every allergen shown/).check();
  }
  await step(page, 'Additives');
  if (supplier.additive) {
    await page.getByRole('button', { name: 'Add additive source' }).click();
    const additive = page.getByRole('group', { name: 'Additive source 1' });
    await additive.getByLabel('Additive identity *').fill(supplier.name);
    await additive.getByLabel('Source status').selectOption('added');
    if (supplier.additive === 'acid') await additive.getByLabel('Technological purpose(s)').fill('acidity regulation');
    else await additive.getByLabel('Declaration route').selectOption('addedCaffeine');
    await additive.getByLabel('Record where this came from').check();
    await additive.getByLabel('Evidence reference', { exact: true }).fill(supplier.reference);
    await additive.getByLabel('Evidence date', { exact: true }).fill('2026-11-01');
  }
  if (!supplier.unspecified) await page.getByLabel(/The supplier confirms this ingredient contains no additives/).check();
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
      { name: 'Caffeine', reference: 'SPEC-CAFFEINE', identity: 'caffeine', energy: '0', sugars: '0', caffeine: true, additive: 'caffeine' as const },
      { name: 'Lemon oil', reference: 'SPEC-FLAVOUR', identity: 'lemon-peel-oil', energy: '', sugars: '', unspecified: true },
    ]) await enterSupplier(page, supplier);

    await page.getByRole('button', { name: 'Formulations', exact: true }).click();
    await page.getByRole('button', { name: 'Add formulation' }).click();
    await page.getByLabel('Formulation name *').fill('Citrus composition');
    await page.getByLabel('What is this formulation?').selectOption('complete');
    await page.getByLabel('Composition evidence reference').fill('SPEC-FLAVOUR');
    await page.getByLabel('Composition evidence date').fill('2026-11-01');
    await addLines(page, [['Water', '99.9', 'g'], ['Lemon oil', '0.1', 'g']]);
    await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
    await enterSupplier(page, {
      name: 'Citrus flavour', reference: 'SPEC-FLAVOUR', identity: 'flavour-blend',
      energy: '3.7', sugars: '0', composition: 'Citrus composition',
    });
    await page.getByRole('button', { name: 'Formulations', exact: true }).click();
    await page.getByRole('button', { name: 'Add formulation' }).click();
    await page.getByLabel('Formulation name *').fill('Fictional drink');
    await addLines(page, [
      ['Water', '93.47', 'kg'], ['Sugar', '10', 'kg'], ['Citric acid', '0.20', 'kg'],
      ['Citrus flavour', '0.30', 'kg'], ['Caffeine', '0.030', 'kg'],
    ]);

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
        await expect(restoredPage.getByText(/Backup counts: 6 ingredients,\s*2 formulations,\s*0 products/)).toBeVisible();
        restoredPage.once('dialog', (dialog) => void dialog.accept());
        await restoredPage.getByRole('button', { name: 'Confirm restore to this device' }).click();
        await expect(restoredPage.getByRole('status').filter({ hasText: 'Workspace restored from the verified backup' })).toBeVisible();
        await restoredPage.getByRole('button', { name: 'Ingredients', exact: true }).click();
        await restoredPage.getByRole('button', { name: 'Edit ingredient Caffeine' }).click();
        await step(restoredPage, 'Spec sheet');
        await expect(restoredPage.getByLabel('Caffeine amount in the supplied ingredient')).toHaveValue('100');
        await expect(restoredPage.getByLabel('Caffeine amount unit')).toHaveValue('g/100g');
        await restoredPage.getByText('Other information stated by this supplier (optional)').click();
        await expect(restoredPage.getByLabel('Added taurine in this supplied ingredient')).toHaveValue('absent');
        await expect(restoredPage.getByLabel('Other added Schedule 28 substances in this supplied ingredient')).toHaveValue('absent');
        await step(restoredPage, 'Additives');
        await expect(restoredPage.getByLabel('Declaration route')).toHaveValue('addedCaffeine');
        await expect(restoredPage.getByLabel(/The supplier confirms this ingredient contains no additives/)).toBeChecked();
        await restoredPage.getByRole('button', { name: 'Back to ingredient list' }).click();
        await restoredPage.getByRole('button', { name: 'Edit ingredient Sugar' }).click();
        await step(restoredPage, 'Spec sheet');
        await expect(restoredPage.getByLabel('Ingredient identity from the specification')).toHaveValue('sugar');
        await expect(restoredPage.getByLabel('What does this specification say about caffeine?')).toHaveValue('absent');
        await step(restoredPage, 'Nutrition');
        await expect(restoredPage.getByLabel('Energy', { exact: false })).toHaveValue('1700');
        await expect(restoredPage.getByLabel('Sugars', { exact: false })).toHaveValue('100');
        await expect(restoredPage.getByLabel('Protein', { exact: false })).toHaveValue('0');
        await restoredPage.getByRole('button', { name: 'Back to ingredient list' }).click();
        await restoredPage.getByRole('button', { name: 'Edit ingredient Citric acid' }).click();
        await step(restoredPage, 'Additives');
        await expect(restoredPage.getByLabel('Source status')).toHaveValue('added');
        await expect(restoredPage.getByLabel('Technological purpose(s)')).toHaveValue('acidity regulation');
        await expect(restoredPage.getByLabel('Evidence reference', { exact: true })).toHaveValue('SPEC-ACID');
        await restoredPage.getByRole('button', { name: 'Back to ingredient list' }).click();
        await restoredPage.getByRole('button', { name: 'Edit ingredient Lemon oil' }).click();
        await step(restoredPage, 'Spec sheet');
        await expect(restoredPage.getByLabel('What does this specification say about caffeine?')).toHaveValue('');
        await restoredPage.getByText('Other information stated by this supplier (optional)').click();
        await expect(restoredPage.getByLabel('Fruit juice in this supplied ingredient')).toHaveValue('');
        await expect(restoredPage.getByLabel('Other added Schedule 28 substances in this supplied ingredient')).toHaveValue('');
        await step(restoredPage, 'Nutrition');
        await expect(restoredPage.getByLabel('Energy', { exact: false })).toHaveValue('');
        await restoredPage.getByRole('button', { name: 'Back to ingredient list' }).click();
        await restoredPage.getByRole('button', { name: 'Edit ingredient Citrus flavour' }).click();
        await expect(restoredPage.getByLabel('Composition formulation *')).toHaveValue(
          await restoredPage.getByLabel('Composition formulation *').locator('option', { hasText: 'Citrus composition' }).getAttribute('value') ?? '',
        );
        await step(restoredPage, 'Nutrition');
        await expect(restoredPage.getByLabel('Energy', { exact: false })).toHaveValue('3.7');
        await step(restoredPage, 'Allergens');
        await expect(restoredPage.getByLabel(/I checked the supplier information for every allergen shown/)).toBeChecked();
        await restoredPage.getByRole('button', { name: 'Formulations', exact: true }).click();
        await restoredPage.getByRole('button', { name: 'Edit formulation Citrus composition' }).click();
        await expect(restoredPage.getByLabel('What is this formulation?')).toHaveValue('complete');
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
      } finally {
        await restored.close();
      }
    }
  } finally {
    await source.close();
  }
});
