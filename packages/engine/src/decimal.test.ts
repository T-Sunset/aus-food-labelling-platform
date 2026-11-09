import { describe, expect, it } from 'vitest';
import {
  addDecimals,
  divideDecimals,
  multiplyDecimals,
  normalizeDecimal,
  subtractDecimals,
  sumDecimals,
} from './decimal.js';

describe('decimal arithmetic', () => {
  it('keeps base-10 sums exact', () => {
    expect(addDecimals('0.1', '0.2')).toBe('0.3');
  });

  it('does not lose precision beyond JavaScript safe integers', () => {
    expect(addDecimals('9007199254740993', '1')).toBe('9007199254740994');
  });

  it('normalizes decimal and exponent notation without converting through number', () => {
    expect(normalizeDecimal('1.250e2')).toBe('125');
  });

  it('supports exact multiplication and subtraction', () => {
    expect(multiplyDecimals('125.5', '8.7')).toBe('1091.85');
    expect(subtractDecimals('10', '0.125')).toBe('9.875');
  });

  it('uses explicit precision for repeating intermediate divisions', () => {
    expect(divideDecimals('1', '3')).toBe('0.3333333333333333333333333333333333333333');
  });

  it('sums an empty collection as zero', () => {
    expect(sumDecimals([])).toBe('0');
  });

  it('rejects invalid decimal input', () => {
    expect(() => normalizeDecimal('NaN')).toThrow(TypeError);
  });

  it('rejects division by zero', () => {
    expect(() => divideDecimals('1', '0')).toThrow(RangeError);
  });
});
