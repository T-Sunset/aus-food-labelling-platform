import { expect, type Page } from '@playwright/test';
import type { ProductAdditiveNameInputs } from '@aus-food/domain';

export function savedLabelOption(page: Page, name: string) {
  return page.getByLabel('Saved label draft').locator('option').filter({ hasText: `${name} —` });
}

export async function openSavedLabel(page: Page, name: string): Promise<void> {
  const option = savedLabelOption(page, name);
  await expect(option).toHaveCount(1);
  const value = await option.getAttribute('value');
  if (!value) throw new Error(`Saved label ${name} has no identifier.`);
  await page.getByLabel('Saved label draft').selectOption(value);
}

export async function openLabelTab(page: Page, name: 'Label setup' | 'Ingredients & allergens' | 'Pack details' | 'Claims'): Promise<void> {
  await page.getByRole('tab', { name, exact: true }).click();
}

export async function openLabelNutrition(page: Page): Promise<void> {
  await openLabelTab(page, 'Label setup');
  const summary = page.locator('#label-panel-setup > details > summary').filter({ hasText: 'Draft nutrition information' });
  if (!(await summary.locator('..').evaluate((element) => (element as HTMLDetailsElement).open))) await summary.click();
}

export async function openLabelPackInformation(page: Page): Promise<void> {
  await openLabelTab(page, 'Pack details');
  const summary = page.getByText('Saved Product pack information and limitations', { exact: true });
  if (!(await summary.locator('..').evaluate((element) => (element as HTMLDetailsElement).open))) await summary.click();
}

export async function openLabelIssues(page: Page): Promise<void> {
  const summary = page.getByText('View missing information and review items', { exact: true });
  if (!(await summary.locator('..').evaluate((element) => (element as HTMLDetailsElement).open))) await summary.click();
}

export async function seedWorkedExamples(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const harness = await import('/e2e/worked-examples-harness.ts');
    await harness.seedWorkedExamples();
  });
  await page.reload();
}

export async function openFormulationSection(page: Page, title: string): Promise<void> {
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const section = page.locator('details.formulation-section').filter({
    has: page.locator('summary').filter({ hasText: new RegExp(`^${escapedTitle}$`) }),
  });
  if (!(await section.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await section.locator(':scope > summary').click();
  }
}

export async function openFinishedBatchDetail(page: Page, detail: 'weight' | 'nutrition' | 'retention'): Promise<void> {
  await openFormulationSection(page, 'Ingredients');
  const chooser = page.getByText('Have finished-batch details?', { exact: true }).locator('..');
  if (!(await chooser.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await chooser.locator(':scope > summary').click();
  }
  const labels = {
    weight: 'Batch weight and processing',
    nutrition: 'Finished-food nutrition',
    retention: 'Nutrient retention',
  };
  await chooser.getByRole('button', { name: labels[detail], exact: true }).click();
}

export async function openIngredientSection(page: Page, title: string): Promise<void> {
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const section = page.locator('details.ingredient-section').filter({
    has: page.locator('summary').filter({ hasText: new RegExp(`^${escapedTitle}$`) }),
  });
  if (!(await section.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await section.locator(':scope > summary').click();
  }
  if (title === 'Nutrition' || title === 'Allergens') {
    const optional = section.locator('details > summary').filter({ hasText: /^(Nutrition|Density|Allergen) source details \(optional\)$/ });
    for (const summary of await optional.all()) {
      if (await summary.isVisible() && !(await summary.locator('..').evaluate((element) => (element as HTMLDetailsElement).open))) {
        await summary.click();
      }
    }
  }
}

// Opens a saved product and expands the requested section.
export async function openProductStep(page: Page, productName: string, stepTitle: string): Promise<void> {
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  const nameField = page.getByLabel('Product name *');
  const alreadyEditingProduct = await nameField.isVisible() && await nameField.inputValue() === productName;
  if (!alreadyEditingProduct) {
    const back = page.getByRole('button', { name: 'Back to product list' });
    if (await back.isVisible()) {
      await back.click();
    }

    await page.getByRole('button', { name: `Edit product ${productName}`, exact: true }).click();
  }

  await page.getByRole('navigation', { name: 'Product sections' }).getByRole('button', { name: stepTitle }).click();
}

export async function openProductReview(page: Page, productName: string): Promise<void> {
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  const back = page.getByRole('button', { name: 'Back to product list' });
  if (await back.isVisible() && await page.getByLabel('Product name *').inputValue() !== productName) {
    await back.click();
  }
  if (!(await back.isVisible())) {
    await page.getByRole('button', { name: `Edit product ${productName}`, exact: true }).click();
  }
  await page.getByRole('navigation', { name: 'Product sections' }).getByRole('button', { name: 'Review', exact: true }).click();
}

export async function openTechnicalReview(page: Page): Promise<void> {
  const summary = page.locator('#product-section-review details > summary')
    .filter({ hasText: 'Technical details and review history' });
  if (!(await summary.locator('..').evaluate((element) => (element as HTMLDetailsElement).open))) {
    await summary.click();
  }
}

export async function openTraceSection(page: Page, title: string): Promise<void> {
  await openTechnicalReview(page);
  const summary = page.locator('#product-section-review details > summary').filter({ hasText: title });
  if (!(await summary.locator('..').evaluate((element) => (element as HTMLDetailsElement).open))) {
    await summary.click();
  }
}

export async function openAdditiveReview(page: Page, productName: string): Promise<void> {
  await openProductReview(page, productName);
  await openTraceSection(page, 'Technical additive and name review');
}

export async function seedSavedAdditiveInputs(
  page: Page, productName: string, inputs: ProductAdditiveNameInputs,
): Promise<void> {
  await page.evaluate(async ({ name, savedInputs }) => {
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
        const product = request.result.find((item: { name: string }) => item.name === name);
        if (!product) {
          transaction.abort();
          return;
        }
        store.put({ ...product, additiveNameInputs: savedInputs });
      };
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error ?? new Error('Product not found'));
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  }, { name: productName, savedInputs: inputs });
  await page.reload();
}

export async function savedAdditiveInputs(page: Page, productName: string): Promise<ProductAdditiveNameInputs | undefined> {
  return page.evaluate(async (name) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('aus-food-labelling-v2');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const product = await new Promise<{ additiveNameInputs?: ProductAdditiveNameInputs } | undefined>((resolve, reject) => {
      const request = database.transaction('products').objectStore('products').getAll();
      request.onsuccess = () => resolve(request.result.find((item: { name: string }) => item.name === name));
      request.onerror = () => reject(request.error);
    });
    database.close();
    return product?.additiveNameInputs;
  }, productName);
}
