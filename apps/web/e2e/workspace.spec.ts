import { expect, test } from '@playwright/test';
import { openIngredientSection } from './helpers';

async function goToStep(page: import('@playwright/test').Page, title: string): Promise<void> {
  if (await page.locator('details.ingredient-section').count()) {
    const section = title === 'Spec sheet' ? 'Source details' : title === 'Additives' ? 'Additives and other ingredients' : title === 'Review and save' ? 'Review' : title;
    await openIngredientSection(page, section);
    if (title === 'Spec sheet') {
      const legacy = page.getByText('Earlier drink-specific information (optional)');
      if (!(await legacy.locator('..').evaluate((element) => (element as HTMLDetailsElement).open))) await legacy.click();
    }
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

test('retains and flags conflicting statements about other added substances', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Supplier ingredient');
  await page.getByLabel('Ingredient type').selectOption('atomic');
  await goToStep(page, 'Spec sheet');
  await page.getByLabel('Specification reference').fill('SUPPLIER-SPEC');
  await page.getByLabel('Specification date').fill('2026-11-01');
  await page.getByText('Other information stated by this supplier (optional)').click();
  await page.getByLabel('Other added Schedule 28 substances in this supplied ingredient').selectOption('absent');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByRole('button', { name: 'Edit ingredient Supplier ingredient' }).click();
  await goToStep(page, 'Spec sheet');
  await page.getByLabel('Specification date').fill('2026-11-02');
  await page.getByText('Other information stated by this supplier (optional)').click();
  const topic = page.getByLabel('Other added Schedule 28 substances in this supplied ingredient').locator('..').locator('..');
  await expect(topic.getByText(/saved statement is from an earlier specification/)).toBeVisible();
  await topic.getByRole('combobox').selectOption('present');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByRole('button', { name: 'Edit ingredient Supplier ingredient' }).click();
  await goToStep(page, 'Spec sheet');
  await page.getByText('Other information stated by this supplier (optional)').click();
  await expect(topic.getByText(/Supplier statements disagree/)).toBeVisible();
  await expect(topic.getByText('Absent: SUPPLIER-SPEC, 2026-11-01')).toBeVisible();
  await expect(topic.getByText('Present: SUPPLIER-SPEC, 2026-11-02')).toBeVisible();
});

test('retains both caffeine sources and allows a compound ingredient in a recipe', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Blend water');
  await page.getByLabel('Ingredient type').selectOption('atomic');
  await goToStep(page, 'Spec sheet');
  await page.getByLabel('Specification reference').fill('WATER-1');
  await page.getByLabel('Specification date').fill('2026-11-01');
  await page.getByLabel('What does this specification say about caffeine?').selectOption('present');
  await page.getByLabel('Caffeine amount in the supplied ingredient').fill('10');
  await page.getByLabel('Caffeine amount unit').selectOption('mg/100mL');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByRole('button', { name: 'Edit ingredient Blend water' }).click();
  await goToStep(page, 'Spec sheet');
  await page.getByLabel('What does this specification say about caffeine?').selectOption('conflicting');
  await expect(page.getByLabel('Statement 1: source reference')).toHaveValue('WATER-1');
  await page.getByLabel('Statement 2: caffeine').selectOption('absent');
  await page.getByLabel('Statement 2: source reference').fill('WATER-2');
  await page.getByLabel('Statement 2: source date').fill('2026-11-02');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByRole('button', { name: 'Edit ingredient Blend water' }).click();
  await goToStep(page, 'Spec sheet');
  await expect(page.getByLabel('Statement 1: amount')).toHaveValue('10');
  await expect(page.getByLabel('Statement 2: source reference')).toHaveValue('WATER-2');
  await expect(page.getByLabel('Statement 1: amount')).toBeDisabled();
  await page.getByLabel('Decision about the caffeine information').selectOption('statement2');
  await page.getByLabel('Why was this decision made?').fill('Supplier confirmed the second statement.');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByRole('button', { name: 'Edit ingredient Blend water' }).click();
  await goToStep(page, 'Spec sheet');
  await expect(page.getByText('Use statement 2: Supplier confirmed the second statement.', { exact: false })).toBeVisible();
  await expect(page.getByText(/selected statement is not yet used in product calculations/)).toBeVisible();
  await page.getByText('Other information stated by this supplier (optional)').click();
  await page.getByLabel('Fruit juice in this supplied ingredient').selectOption('absent');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByRole('button', { name: 'Edit ingredient Blend water' }).click();
  await goToStep(page, 'Spec sheet');
  await page.getByLabel('Specification date').fill('2026-11-02');
  await page.getByText('Other information stated by this supplier (optional)').click();
  await expect(page.getByText(/saved statement is from an earlier specification/)).toBeVisible();
  await page.getByLabel('Fruit juice in this supplied ingredient').selectOption('present');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByRole('button', { name: 'Edit ingredient Blend water' }).click();
  await goToStep(page, 'Spec sheet');
  await page.getByText('Other information stated by this supplier (optional)').click();
  await expect(page.getByText(/Supplier statements disagree/)).toBeVisible();
  await expect(page.getByText('Absent: WATER-1, 2026-11-01')).toBeVisible();
  await expect(page.getByText('Present: WATER-1, 2026-11-02')).toBeVisible();
  await page.getByRole('button', { name: 'Back to ingredient list' }).click();

  await page.getByRole('button', { name: 'Formulations', exact: true }).click();
  await page.getByRole('button', { name: 'Add formulation' }).click();
  await page.getByLabel('Formulation name *').fill('Blend composition');
  await page.getByLabel('What is this formulation?').selectOption('partial');
  await page.getByLabel('Composition evidence reference').fill('FLAVOUR-SPEC');
  await page.getByLabel('Composition evidence date').fill('2026-11-01');
  await goToStep(page, 'Ingredients');
  await page.getByRole('button', { name: 'Add line' }).click();
  await page.getByLabel('Line 1 record').selectOption({ label: 'Blend water' });
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await expect(page.getByText('Supplier composition: partial — proportions not calculated')).toBeVisible();
  await page.getByRole('button', { name: 'Expand' }).click();
  await expect(page.getByText(/partial; its proportions cannot be calculated/)).toBeVisible();
  await page.getByRole('button', { name: 'Edit formulation Blend composition' }).click();
  await goToStep(page, 'Ingredients');
  await expect(page.getByLabel('Line 1 quantity')).toHaveValue('');
  await page.getByLabel('Line 1 quantity').fill('100');
  await goToStep(page, 'Name');
  await page.getByLabel('What is this formulation?').selectOption('complete');
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await expect(page.getByText('Supplier composition: complete')).toBeVisible();
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await page.getByLabel('Ingredient name *').fill('Flavour blend');
  await page.getByLabel('Ingredient type').selectOption('compound');
  await page.getByLabel('Composition formulation *').selectOption({ label: 'Blend composition' });
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByRole('button', { name: 'Formulations', exact: true }).click();
  await page.getByRole('button', { name: 'Add formulation' }).click();
  await page.getByLabel('Formulation name *').fill('Drink');
  await goToStep(page, 'Ingredients');
  await page.getByRole('button', { name: 'Add line' }).click();
  await page.getByLabel('Line 1 record').selectOption({ label: 'Flavour blend' });
  await page.getByLabel('Line 1 quantity').fill('5');
  await page.getByRole('button', { name: 'Save formulation draft' }).click();
  await expect(page.getByText('Drink', { exact: true })).toBeVisible();
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
  await openIngredientSection(page, 'Source details');
  await page.getByLabel('Specification reference').fill('Juice information');
  await page.getByLabel('Specification date').fill('2026-01-01');
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
  await page.getByLabel('Ingredient identity from the specification').selectOption('unrecognised');
  await page.getByLabel('What does this specification say about caffeine?').selectOption('present');
  await page.getByLabel('Caffeine amount in the supplied ingredient').fill('5');
  await page.getByLabel('Caffeine amount unit').selectOption('mg/100g');
  await goToStep(page, 'Nutrition');
  await page.getByLabel('Protein').fill('13.2');
  await page.getByLabel('Nutrition values are per').selectOption('volume');
  await page.getByLabel('Energy per 100 mL').fill('0');
  await page.getByLabel('Sodium per 100 mL').fill('5.1');
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
  await page.getByRole('button', { name: 'Edit ingredient Rolled oats' }).click();
  await goToStep(page, 'Spec sheet');
  await expect(page.getByLabel('What does this specification say about caffeine?')).toHaveValue('present');
  await expect(page.getByLabel('Caffeine amount in the supplied ingredient')).toHaveValue('5');
  await expect(page.getByLabel('Caffeine amount unit')).toHaveValue('mg/100g');
  await expect(page.getByLabel('Ingredient identity from the specification')).toHaveValue('unrecognised');
  await goToStep(page, 'Nutrition');
  await expect(page.getByLabel('Protein')).toHaveValue('13.2');
  await page.getByLabel('Nutrition values are per').selectOption('volume');
  await expect(page.getByLabel('Energy per 100 mL')).toHaveValue('0');
  await expect(page.getByLabel('Sodium per 100 mL')).toHaveValue('5.1');
  await expect(page.getByText('This ingredient has values saved for both bases.', { exact: false })).toBeVisible();
  await page.getByLabel('Nutrition values are per').selectOption('mass');
  await expect(page.getByLabel('Protein')).toHaveValue('13.2');
  await goToStep(page, 'Spec sheet');
  await page.getByLabel('Specification date').fill('2026-11-10');
  await expect(page.getByText('The saved identity belongs to an earlier specification until reconfirmed.')).toBeVisible();
  await page.getByLabel('I checked this caffeine information against the current specification.').check();
  await page.getByLabel('I checked this identity against the current specification.').check();
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
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
  await expect(page.getByText('SPEC-100 · 2026-11-10', { exact: true })).toBeVisible();
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
