import { describe, expect, it } from 'vitest';
import { formatNpcNutrient } from './nip-rounding.js';

describe('NPC display rounding', () => {
  it.each([
    ['21.25', 'grams', '21.2'], ['21.35', 'grams', '21.4'],
    ['1145', 'energy', '1140'], ['1155', 'energy', '1160'],
    ['98.1', 'energy', '98'], ['17.5', 'sodium', '18'], ['8.25', 'sodium', '8'],
    ['0.05', 'grams', '0.0'], ['0.05005', 'grams', '0.1'], ['0.15', 'grams', '0.2'], ['0', 'grams', '0.0'],
    ['99.95', 'grams', '100'], ['100.5', 'grams', '100'],
  ] as const)('formats %s %s as %s', (value, kind, expected) => {
    expect(formatNpcNutrient(value, kind)).toBe(expected);
  });
  it('rejects negative values', () => {
    expect(() => formatNpcNutrient('-1', 'grams')).toThrow(RangeError);
  });
});
