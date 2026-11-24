import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { openLabelTab, openProductReview, openSavedLabel, savedLabelOption, seedWorkedExamples } from './helpers';

test('stores independent Label claims without redundant questions', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Illustrative demo data loaded locally' }))
    .toBeVisible();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await openLabelTab(page, 'Claims');
  await expect(page.getByRole('heading', { name: 'Claims on this Label draft' })).toBeVisible();
  await expect(page.getByText('No claims entered for this Label draft.')).toBeVisible();

  await page.getByRole('button', { name: 'Add a claim' }).click();
  await page.getByLabel('Claim 1 text (exactly as it appears)').fill('Low sugars');
  await page.getByLabel('Claim 1 type (your classification)').selectOption('nutrition_content');
  await page.getByLabel('I confirm the type of claim 1').check();
  await page.getByLabel('Claim 1 supported claim rule').selectOption({ label: 'Low sugars' });
  await expect(page.getByLabel(/Claim 1 amount|Claim 1 evidence|Food form|Is this an infant formula product/)).toHaveCount(0);
  await expect(page.getByText('Facts used by nutrition content claim checks')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save Product claim facts' })).toHaveCount(0);

  const result = page.getByRole('article', { name: 'Claim: Low sugars' });
  await expect(result.getByText('Status: REVIEW REQUIRED')).toBeVisible();
  await expect(result.getByText('Status: PASS')).toHaveCount(0);
  await expect(result.getByText('Status: FAIL')).toHaveCount(0);
  await expect(page.getByText('ILLUSTRATIVE ONLY')).toHaveCount(0);
  await expect(result.getByText(/does not certify legal compliance/)).toBeVisible();
  await expect(result.locator('p').filter({ hasText: /has not confirmed that no prohibited context applies/ })).toBeVisible();
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);

  await openLabelTab(page, 'Label setup');
  await page.getByLabel('Label name').fill('Low sugars label');
  await page.getByRole('button', { name: 'Save label draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Label draft saved on this device' })).toBeVisible();

  await page.getByRole('button', { name: 'New label draft' }).click();
  await page.getByLabel('Label name').fill('Heart label');
  await openLabelTab(page, 'Claims');
  await page.getByRole('button', { name: 'Add a claim' }).click();
  await page.getByLabel('Claim 1 text (exactly as it appears)').fill('Supports heart health');
  await page.getByLabel('Claim 1 type (your classification)').selectOption('health');
  await page.getByLabel('I confirm the type of claim 1').check();
  await page.getByRole('button', { name: 'Save label draft', exact: true }).click();
  await expect(savedLabelOption(page, 'Low sugars label')).toHaveCount(1);
  await expect(savedLabelOption(page, 'Heart label')).toHaveCount(1);

  await openSavedLabel(page, 'Low sugars label');
  await expect(page.getByLabel('Claim 1 text (exactly as it appears)')).toHaveValue('Low sugars');
  await expect(page.getByLabel('Claim 1 supported claim rule')).toHaveValue('claim.low-sugars');
  await openSavedLabel(page, 'Heart label');
  await expect(page.getByLabel('Claim 1 text (exactly as it appears)')).toHaveValue('Supports heart health');
  await expect(page.getByLabel('Claim 1 supported claim rule')).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await openSavedLabel(page, 'Low sugars label');
  await openLabelTab(page, 'Claims');
  await expect(page.getByLabel('Claim 1 text (exactly as it appears)')).toHaveValue('Low sugars');
  await openSavedLabel(page, 'Heart label');
  await expect(page.getByLabel('Claim 1 text (exactly as it appears)')).toHaveValue('Supports heart health');
});

test('keeps older Product claims inactive until explicitly copied to a Label', async ({ page }) => {
  await page.goto('/');
  await seedWorkedExamples(page);
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await page.getByLabel('Product draft').selectOption({ label: 'Example Citrus Boost' });
  await openLabelTab(page, 'Claims');
  await expect(page.getByText('No claims entered for this Label draft.')).toBeVisible();
  await expect(page.getByLabel('Claim 1 text (exactly as it appears)')).toHaveCount(0);
  await expect(page.getByText(/1 older claim entry is saved on this Product/)).toBeVisible();
  await page.getByRole('button', { name: 'Add copies of existing Product claims to this Label' }).click();
  await expect(page.getByLabel('Claim 1 text (exactly as it appears)')).toHaveValue('Low sugars');
  await expect(page.getByRole('article', { name: 'Claim: Low sugars' }).locator('p')
    .filter({ hasText: /Nutrition amount unavailable/ })).toBeVisible();
  await page.getByRole('button', { name: 'Save label draft', exact: true }).click();
  await expect(savedLabelOption(page, 'Example Citrus Boost label')).toHaveCount(1);
  const before = await page.evaluate(async () => {
    const harness = await import('/e2e/claim-nutrition-harness.ts');
    return harness.readClaimRecords('we-prod-citrus-boost', 'Example Citrus Boost label');
  });
  expect(before.productClaims?.[0]?.nutrientAmount).toEqual({ value: '2.0', unit: 'g' });
  expect(before.labelClaims?.[0]?.evidence).toEqual(before.productClaims?.[0]?.evidence);
  await page.getByLabel('Claim 1 type (your classification)').selectOption('health');
  await expect(page.getByLabel('I confirm the type of claim 1')).not.toBeChecked();
  await page.getByLabel('Claim 1 type (your classification)').selectOption('nutrition_content');
  await expect(page.getByLabel('Claim 1 supported claim rule')).toHaveValue('claim.low-sugars');
  await page.getByLabel('I confirm the type of claim 1').check();
  await page.getByLabel('Claim 1 text (exactly as it appears)').fill(' Low sugar! ');
  await page.getByRole('button', { name: 'Save label draft', exact: true }).click();
  const after = await page.evaluate(async () => {
    const harness = await import('/e2e/claim-nutrition-harness.ts');
    return harness.readClaimRecords('we-prod-citrus-boost', 'Example Citrus Boost label');
  });
  expect(after.productClaims).toEqual(before.productClaims);
  expect(after.claimFacts).toEqual(before.claimFacts);
  expect(after.labelClaims?.[0]).toEqual({ ...before.labelClaims?.[0], text: ' Low sugar! ' });

  await openProductReview(page, 'Example Citrus Boost');
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await openSavedLabel(page, 'Example Citrus Boost label');
  await expect(page.getByText(/1 older claim entry is saved on this Product/)).toBeVisible();
  await expect(page.getByLabel('Claim 1 text (exactly as it appears)')).toHaveValue(' Low sugar! ');
  await page.reload();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await openSavedLabel(page, 'Example Citrus Boost label');
  await openLabelTab(page, 'Claims');
  await expect(page.getByLabel('Claim 1 text (exactly as it appears)')).toHaveValue(' Low sugar! ');
  const reloaded = await page.evaluate(async () => {
    const harness = await import('/e2e/claim-nutrition-harness.ts');
    return harness.readClaimRecords('we-prod-citrus-boost', 'Example Citrus Boost label');
  });
  expect(reloaded).toEqual(after);
});

test('uses current saved nutrition for a saved claim and its report', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const harness = await import('/e2e/claim-nutrition-harness.ts');
    await harness.seedClaimNutrition();
  });
  await page.reload();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await openLabelTab(page, 'Claims');
  await page.getByRole('button', { name: 'Add a claim' }).click();
  await page.getByLabel('Claim 1 text (exactly as it appears)').fill('Low sugars');
  await page.getByLabel('Claim 1 type (your classification)').selectOption('nutrition_content');
  await page.getByLabel('I confirm the type of claim 1').check();
  await page.getByLabel('Claim 1 supported claim rule').selectOption({ label: 'Low sugars' });
  await expect(page.getByLabel(/Claim 1 amount|Claim 1 evidence/)).toHaveCount(0);
  const result = page.getByRole('article', { name: 'Claim: Low sugars' });
  await expect(result.locator('p').filter({ hasText: /sugars: 5 g per 100 g, calculated from unrounded/ })).toBeVisible();
  await result.getByText('Condition checklist, rule and source').click();
  await expect(result.getByText(/claim-product > claim-recipe > claim-line > claim-ingredient/)).toBeVisible();
  await page.getByRole('button', { name: 'Save label draft', exact: true }).click();
  await expect(savedLabelOption(page, 'Claim product label')).toHaveCount(1);
  const saved = await page.evaluate(async () => {
    const harness = await import('/e2e/claim-nutrition-harness.ts');
    return harness.readClaimRecords('claim-product', 'Claim product label');
  });
  expect(saved.labelClaims?.[0]).not.toHaveProperty('nutrientAmount');
  expect(saved.labelClaims?.[0]).not.toHaveProperty('evidence');
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(accessibility.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  const narrowAccessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(narrowAccessibility.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);

  await page.evaluate(async () => {
    const harness = await import('/e2e/claim-nutrition-harness.ts');
    await harness.changeClaimSugars('5.0001');
  });
  await page.reload();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await openSavedLabel(page, 'Claim product label');
  await openLabelTab(page, 'Claims');
  await expect(page.getByLabel(/Claim 1 amount/)).toHaveCount(0);
  await expect(result.locator('p').filter({ hasText: /sugars: 5\.0001 g per 100 g, calculated from unrounded/ })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download review report' }).click();
  const reportPath = await (await download).path();
  if (!reportPath) throw new Error('Review report was not downloaded.');
  const report = (await readFile(reportPath)).toString('latin1');
  expect(report).toContain('5.0001 g');
  expect(report).toContain('claim-product > claim-recipe > claim-line > claim-ingredient');
  expect(report).toContain('Claims are not added to the draft label');

  await page.evaluate(async () => {
    const harness = await import('/e2e/claim-nutrition-harness.ts');
    await harness.changeClaimSugars(null);
  });
  await page.reload();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await openSavedLabel(page, 'Claim product label');
  await openLabelTab(page, 'Claims');
  await expect(result.locator('p').filter({ hasText: /Reliable sugars nutrition is missing/ })).toBeVisible();
  await expect(result.getByText('Status: REVIEW REQUIRED')).toBeVisible();
});

test('finds possible claims locally without changing label text or claiming complete coverage', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await page.getByRole('button', { name: 'Edit product Illustrative demo product' }).click();
  await page.getByLabel('Product name *').fill('LOW-SUGAR cake');
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await page.getByRole('button', { name: 'Ingredients', exact: true }).click();
  await page.getByRole('button', { name: 'Edit ingredient Illustrative base' }).click();
  await page.getByLabel('Ingredient name *').fill('Gluten-free flour');
  await page.getByRole('button', { name: 'Save ingredient draft' }).click();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await openLabelTab(page, 'Claims');
  const candidates = page.getByRole('region', { name: 'Possible claims in your label text' });
  await expect(candidates).toContainText('LOW-SUGAR');
  await expect(candidates).toContainText('Product name. Shown in the current preview.');
  await expect(candidates).toContainText('Gluten-free');
  await expect(candidates).toContainText('Ingredient: Illustrative formulation > Gluten-free flour');
  await expect(candidates).toContainText('can miss claims');
  await expect(candidates).toContainText('external artwork');

  await openLabelTab(page, 'Pack details');
  await page.getByLabel('Storage instructions').fill('Keep this low sugar food cool.');
  await page.getByLabel('Warning or advisory text (one statement per line)').fill('LOW sugar; gluten-free.');
  await openLabelTab(page, 'Claims');
  await expect(candidates.getByRole('listitem').filter({ hasText: 'Storage instructions' }))
    .toContainText('Shown in the current preview.');
  await expect(candidates.getByRole('listitem').filter({ hasText: 'Warning or advisory text' })).toHaveCount(2);
  await candidates.getByRole('listitem').filter({ hasText: 'Storage instructions' })
    .getByRole('button', { name: 'Review source' }).click();
  await expect(page.getByLabel('Storage instructions')).toBeFocused();
  await page.getByLabel('Storage instructions').fill('Keep cool.');
  await page.getByLabel('Precautionary allergen statement (optional)').fill('No added sugar');
  await openLabelTab(page, 'Claims');
  await expect(candidates.getByRole('listitem').filter({ hasText: 'Storage instructions' })).toHaveCount(0);
  await expect(candidates.getByRole('listitem').filter({ hasText: 'Precautionary allergen statement' }))
    .toContainText('Not shown in the current preview.');
  await expect(candidates.getByRole('listitem').filter({ hasText: 'Product name' }))
    .toContainText('Not shown in the current preview.');

  await openLabelTab(page, 'Pack details');
  await page.getByLabel('Basis for the precautionary allergen statement').fill('Example assessment');
  await openLabelTab(page, 'Claims');
  await page.getByRole('button', { name: 'Add a claim' }).click();
  await page.getByLabel('Claim 1 text (exactly as it appears)').fill('Low sugar');
  await expect(candidates.getByRole('listitem').filter({ hasText: 'Claim 1' }))
    .toContainText('Not shown in the current preview.');
  await candidates.getByRole('listitem').filter({ hasText: 'Claim 1' })
    .getByRole('button', { name: 'Review source' }).click();
  await expect(page.getByLabel('Claim 1 text (exactly as it appears)')).toBeFocused();
  await expect(page.getByLabel('Claim 1 text (exactly as it appears)')).toHaveValue('Low sugar');
  await page.context().setOffline(true);
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download review report' }).click();
  const reportPath = await (await downloading).path();
  if (!reportPath) throw new Error('Review report was not downloaded.');
  const report = (await readFile(reportPath)).toString('latin1');
  expect(report).toContain('Possible claim: "LOW-SUGAR"; Product name; shown in the current preview.');
  expect(report).toContain('can miss claims');
  await page.setViewportSize({ width: 390, height: 844 });
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(accessibility.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
});

test('resolves a detected occurrence without rewriting its source and persists the Label decision', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load illustrative demo data' }).click();
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await page.getByRole('button', { name: 'Edit product Illustrative demo product' }).click();
  await page.getByLabel('Product name *').fill('LOW-SUGAR cake');
  await page.getByRole('button', { name: 'Save product draft' }).click();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await openLabelTab(page, 'Claims');

  const candidate = page.getByRole('listitem').filter({ hasText: 'Product name' });
  await candidate.getByRole('button', { name: 'Treat as a claim' }).click();
  await expect(page.getByLabel('Claim 1 text (exactly as it appears)')).toHaveValue('LOW-SUGAR');
  await expect(page.getByLabel('Claim 1 text (exactly as it appears)')).toHaveAttribute('readonly', '');
  await expect(page.getByLabel('Claim 1 type (your classification)')).toHaveValue('nutrition_content');
  await expect(page.getByLabel('Claim 1 supported claim rule')).toHaveValue('claim.low-sugars');
  await expect(candidate).toContainText('treated as a claim');
  await expect(page.getByText('What to review next', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Review Product inputs' }).first().click();
  await expect(page.getByRole('button', { name: 'Save product draft' })).toBeVisible();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await openLabelTab(page, 'Claims');

  await openLabelTab(page, 'Label setup');
  await page.getByLabel('Label name').fill('Resolved claim label');
  await page.getByRole('button', { name: 'Save label draft', exact: true }).click();
  await expect(savedLabelOption(page, 'Resolved claim label')).toHaveCount(1);
  await page.reload();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await openSavedLabel(page, 'Resolved claim label');
  await openLabelTab(page, 'Claims');
  const reloadedCandidate = page.getByRole('listitem').filter({ hasText: 'Product name' });
  await expect(reloadedCandidate).toContainText('treated as a claim');
  await expect(page.getByLabel('Claim 1 text (exactly as it appears)')).toHaveValue('LOW-SUGAR');
  await expect(page.getByLabel('Product draft')).toHaveValue('demo-product');
});
