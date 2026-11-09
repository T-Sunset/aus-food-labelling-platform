import Big from 'big.js';

const DIVISION_DECIMAL_PLACES = 40;
const EngineBig = Big();

EngineBig.DP = DIVISION_DECIMAL_PLACES;
EngineBig.RM = EngineBig.roundHalfUp;
EngineBig.strict = true;

const DECIMAL_INPUT = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

function parseDecimal(value: string): Big {
  if (!DECIMAL_INPUT.test(value)) {
    throw new TypeError(`Invalid decimal value: ${value}`);
  }

  return new EngineBig(value);
}

export function normalizeDecimal(value: string): string {
  return parseDecimal(value).toString();
}

export function isNegativeDecimal(value: string): boolean {
  return parseDecimal(value).lt('0');
}

export function compareDecimals(left: string, right: string): number {
  return parseDecimal(left).cmp(parseDecimal(right));
}

export function addDecimals(left: string, right: string): string {
  return parseDecimal(left).plus(parseDecimal(right)).toString();
}

export function subtractDecimals(left: string, right: string): string {
  return parseDecimal(left).minus(parseDecimal(right)).toString();
}

export function multiplyDecimals(left: string, right: string): string {
  return parseDecimal(left).times(parseDecimal(right)).toString();
}

export function divideDecimals(left: string, right: string): string {
  const divisor = parseDecimal(right);
  if (divisor.eq('0')) {
    throw new RangeError('Cannot divide by zero');
  }

  return parseDecimal(left).div(divisor).toString();
}

export function sumDecimals(values: readonly string[]): string {
  return values.reduce((total, value) => total.plus(parseDecimal(value)), new EngineBig('0')).toString();
}
