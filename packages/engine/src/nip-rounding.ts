import Big from 'big.js';

const Decimal = Big();
Decimal.strict = true;

/** FSANZ NPC display conventions, not a regulatory determination. */
export function formatNpcNutrient(value: string, kind: 'energy' | 'sodium' | 'grams'): string {
  const amount = new Decimal(value);
  if (amount.lt('0')) throw new RangeError('Nutrition values cannot be negative.');
  const places = Math.min(kind === 'grams' ? 1 : 0, 2 - amount.e);
  const rounded = amount.round(places, Big.roundHalfEven);
  return rounded.toFixed(kind === 'grams' && rounded.lt('100') ? 1 : 0);
}
