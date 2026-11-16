import { createEmptyProductClassificationProfile, evaluateProvisionalCaffeine } from '@aus-food/engine';
import { demoCaffeineRule } from '@aus-food/rules';
import type { ProductRecord } from '@aus-food/storage';

export function caffeineCheckForProduct(product: ProductRecord, evaluationDate: string) {
  if (product.builderProductType !== 'caffeinatedBeverage') return undefined;
  const profile = product.classificationProfile ?? createEmptyProductClassificationProfile();
  const unknown = { answer: 'unknown', evidence: [] } as const;
  return evaluateProvisionalCaffeine({
    rule: demoCaffeineRule,
    evaluationDate,
    classification: {
      beverage: unknown,
      flavoured: profile.formulatedCaffeinatedBeverage.flavoured,
      nonAlcoholic: profile.formulatedCaffeinatedBeverage.nonAlcoholic,
      containsCaffeine: profile.formulatedCaffeinatedBeverage.containsCaffeine,
      mentalPerformancePurpose: unknown,
    },
  });
}
