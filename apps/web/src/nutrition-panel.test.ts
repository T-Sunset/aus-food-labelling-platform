import { describe, expect, it } from 'vitest';
import type { ProductRecord } from '@aus-food/storage';
import { makeNutritionPanel } from './nutrition-panel';
import { nutritionRows, type NipDraft } from './nip-draft';

const now = '2026-01-01T00:00:00.000Z';

const product: ProductRecord = {
  id: 'product',
  name: 'General food',
  recordType: 'product',
  tags: [],
  createdAt: now,
  updatedAt: now,
  formulationId: 'recipe',
  foodState: 'asSold',
  builderProductType: 'other',
  consumerDirections: 'none',
};

function nutrition(asSoldPerServing: NipDraft['asSoldPerServing']): NipDraft {
  return {
    rows: nutritionRows.map((row) => ({
      label: row.label,
      serving: '1 g',
      unitQuantity: '2 g',
    })),
    asSoldPer100g: {},
    asSoldPerServing,
    asSoldBasisReady: false,
    asSoldServingMassGrams: undefined,
    conflictingNutrients: [],
    unitHeading: 'Average per 100 g',
    servingSize: '50 g',
    servingsPerPack: '2',
    missing: [],
    sources: [],
    optionalNutrients: [],
    finishedOptionalNutrients: [],
    finishedSources: [],
    finishedNutritionSelected: false,
    retentionSelected: false,
    retentionSources: [],
  };
}

describe('optional percentage daily intake', () => {
  it('calculates each displayed percentage from unrounded per-serving values and versioned references', () => {
    const values: NipDraft['asSoldPerServing'] = {
      energy: '435',
      protein: '2.5',
      fat: '3.5',
      saturatedFat: '1.2',
      carbohydrate: '15.5',
      sugars: '4.5',
      sodium: '115',
    };
    const panel = makeNutritionPanel(product, nutrition(values), undefined, undefined, true);

    expect(panel.dailyIntakeStatus).toBe('included');
    expect(panel.dailyIntakeStatement).toBe('Percentage daily intakes are based on an average adult diet of 8 700 kJ');
    expect(panel.rows.map((row) => row.dailyIntake)).toEqual(Array(7).fill('5%'));
    expect(panel.missing).toEqual([]);
  });

  it('distinguishes known zero from missing per-serving values and rounds whole-percent ties half up', () => {
    const panel = makeNutritionPanel(product, nutrition({
      energy: '43.5',
      protein: '0.25',
      sodium: '0',
    }), undefined, undefined, true);

    expect(panel.rows[0]?.dailyIntake).toBe('1%');
    expect(panel.rows[1]?.dailyIntake).toBe('1%');
    expect(panel.rows[6]?.dailyIntake).toBe('0%');
    expect(panel.rows.slice(2, 6).every((row) => row.dailyIntake === 'Not available')).toBe(true);
    expect(panel.missing).toHaveLength(4);
    expect(panel.missing.join(' ')).toContain('reliable unrounded per-serving value is missing');
  });

  it('omits the optional column when not selected', () => {
    const panel = makeNutritionPanel(product, nutrition({ protein: '5' }));

    expect(panel.dailyIntakeStatus).toBe('notIncluded');
    expect(panel.dailyIntakeStatement).toBeUndefined();
    expect(panel.rows.every((row) => row.dailyIntake === undefined)).toBe(true);
  });

  it.each([
    ['infantFood', 'S12-6'],
    ['caffeinatedBeverage', 'S12-5'],
  ] as const)('does not use the ordinary daily-intake panel for %s products', (builderProductType, format) => {
    const panel = makeNutritionPanel({
      ...product,
      builderProductType,
    }, nutrition({ protein: '5' }), undefined, undefined, true);

    expect(panel.basis).toBe('asSold');
    expect(panel.dailyIntakeStatus).toBe('needsReview');
    expect(panel.dailyIntakeIssue).toContain(format);
    expect(panel.rows.every((row) => row.dailyIntake === undefined)).toBe(true);
  });

  it('keeps %DI unavailable when the serving basis needs review', () => {
    const panel = makeNutritionPanel({
      ...product,
      consumerDirections: 'unknown',
    }, nutrition({ protein: '5' }), undefined, undefined, true);

    expect(panel.dailyIntakeStatus).toBe('needsReview');
    expect(panel.rows.every((row) => row.dailyIntake === undefined)).toBe(true);
    expect(panel.missing.join(' ')).toContain('Optional %DI is supported only');
  });
});
