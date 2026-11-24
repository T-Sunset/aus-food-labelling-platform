import type { ProductRecord } from '@aus-food/storage';

export function consumerDirectionsStatus(product: ProductRecord): 'unknown' | 'none' | 'present' {
  if (product.consumerDirections) return product.consumerDirections;
  return product.preparation?.enabled || product.draining?.enabled
    || product.foodState === 'asDrained' || product.foodState === 'asReconstituted'
    ? 'present' : 'unknown';
}

export function consumerDirectionsIssue(product: ProductRecord): string | undefined {
  const status = consumerDirectionsStatus(product);
  const preparation = product.preparation?.enabled || product.foodState === 'asReconstituted';
  const draining = product.draining?.enabled || product.foodState === 'asDrained';
  if (status === 'unknown') return 'Confirm what the label tells customers to do before consuming';
  if (status === 'none' && (preparation || draining || product.otherConsumerDirections)) {
    return 'The recorded directions conflict with the answer that there are no directions';
  }
  if (status === 'present' && product.foodState === 'asReconstituted' && !product.preparation?.enabled) {
    return 'The recorded reconstituted state conflicts with disabled preparation; review the directions and food state';
  }
  if (status === 'present' && product.foodState === 'asDrained' && !product.draining?.enabled) {
    return 'The recorded drained state conflicts with disabled draining; review the directions and food state';
  }
  if (status === 'present' && !preparation && !draining && !product.otherConsumerDirections) {
    return 'Record what the customer is directed to do before eating';
  }
  if (product.otherConsumerDirections) return 'Other or unclear consumer directions need review';
  if (preparation && !product.preparation?.directions?.trim()) return 'Record the preparation directions';
  if (draining && !product.draining?.directions?.trim()) return 'Record the draining directions';
  return undefined;
}
