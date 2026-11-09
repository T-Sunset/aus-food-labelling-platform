import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateIngoingMassPercentages,
  calculateMassPercentage,
  convertMass,
} from './mass.js';

describe('mass calculations', () => {
  it('preserves generated milligram quantities through gram conversion', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000_000 }), (milligrams) => {
        const grams = convertMass({ value: String(milligrams), unit: 'mg' }, 'g');
        expect(convertMass(grams, 'mg')).toEqual({
          value: String(milligrams),
          unit: 'mg',
        });
      }),
    );
  });

  it('calculates identical mass fractions in grams and milligrams', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        (partGrams, extraGrams) => {
          const totalGrams = partGrams + extraGrams;
          const inGrams = calculateMassPercentage(
            { value: String(partGrams), unit: 'g' },
            { value: String(totalGrams), unit: 'g' },
          );
          const inMilligrams = calculateMassPercentage(
            { value: String(partGrams * 1000), unit: 'mg' },
            { value: String(totalGrams * 1000), unit: 'mg' },
          );
          expect(inMilligrams).toBe(inGrams);
        },
      ),
    );
  });

  it('converts between mass units without binary floating-point arithmetic', () => {
    expect(convertMass({ value: '1250', unit: 'mg' }, 'g')).toEqual({
      value: '1.25',
      unit: 'g',
    });
    expect(convertMass({ value: '1.25', unit: 'kg' }, 'g')).toEqual({
      value: '1250',
      unit: 'g',
    });
  });

  it('calculates ingoing mass percentages without presentation rounding', () => {
    expect(
      calculateMassPercentage({ value: '1', unit: 'g' }, { value: '3', unit: 'g' }),
    ).toBe('33.33333333333333333333333333333333333333');
  });

  it('rejects negative mass instead of treating it as a valid quantity', () => {
    expect(() => convertMass({ value: '-1', unit: 'g' }, 'mg')).toThrow(RangeError);
  });

  it('rejects a zero total rather than generating a percentage', () => {
    expect(() =>
      calculateMassPercentage({ value: '1', unit: 'g' }, { value: '0', unit: 'g' }),
    ).toThrow(RangeError);
  });

  it('calculates ingoing percentages per expanded source path', () => {
    expect(
      calculateIngoingMassPercentages([
        {
          ingredientId: 'fruit',
          mass: { value: '250', unit: 'g' },
          sourcePath: ['product', 'fruit-line', 'fruit'],
        },
        {
          ingredientId: 'sugar',
          mass: { value: '750', unit: 'g' },
          sourcePath: ['product', 'filling-line', 'filling', 'sugar-line', 'sugar'],
        },
      ]),
    ).toEqual([
      {
        ingredientId: 'fruit',
        mass: { value: '250', unit: 'g' },
        percentage: '25',
        sourcePath: ['product', 'fruit-line', 'fruit'],
      },
      {
        ingredientId: 'sugar',
        mass: { value: '750', unit: 'g' },
        percentage: '75',
        sourcePath: ['product', 'filling-line', 'filling', 'sugar-line', 'sugar'],
      },
    ]);
  });

  it('rejects an empty ingoing ingredient list', () => {
    expect(() => calculateIngoingMassPercentages([])).toThrow(RangeError);
  });

  it('rejects a zero ingoing ingredient mass', () => {
    expect(() =>
      calculateIngoingMassPercentages([
        {
          ingredientId: 'water',
          mass: { value: '0', unit: 'g' },
          sourcePath: ['product', 'water-line', 'water'],
        },
      ]),
    ).toThrow(RangeError);
  });
});
