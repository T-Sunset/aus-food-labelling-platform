import type { LabelPackCopy, ProductRecord } from '@aus-food/storage';
import { consumerDirectionsIssue, consumerDirectionsStatus } from './consumer-directions';

export interface PackDraft {
  readonly name: string;
  readonly netContents?: string;
  readonly recordedDirections: readonly { readonly kind: string; readonly text: string }[];
  readonly previewDirections: readonly { readonly kind: string; readonly text: string }[];
  readonly directionsIssue?: string;
  readonly recordedLabelCopy?: LabelPackCopy;
  readonly limitations: readonly string[];
}

export function makePackDraft(product: ProductRecord, labelCopy?: LabelPackCopy): PackDraft {
  const { netQuantity, netUnit } = product.packDetails ?? {};
  const netContents = netQuantity && /^\d+(\.\d+)?$/.test(netQuantity)
    && Number.isFinite(Number(netQuantity)) && Number(netQuantity) > 0 && netUnit
    ? `${netQuantity} ${netUnit}` : undefined;
  const recordedDirections: { kind: string; text: string }[] = [];
  if (product.preparation?.enabled && product.preparation.directions?.trim()) {
    recordedDirections.push({ kind: 'Preparation', text: product.preparation.directions.trim() });
  }
  if (product.draining?.enabled && product.draining.directions?.trim()) {
    recordedDirections.push({ kind: 'Draining', text: product.draining.directions.trim() });
  }
  if (product.otherConsumerDirections && product.otherConsumerDirectionsText?.trim()) {
    recordedDirections.push({ kind: 'Other or unclear', text: product.otherConsumerDirectionsText.trim() });
  }
  const directionsIssue = consumerDirectionsIssue(product);
  return {
    name: product.name,
    ...(netContents ? { netContents } : {}),
    ...(labelCopy ? { recordedLabelCopy: labelCopy } : {}),
    recordedDirections,
    previewDirections: consumerDirectionsStatus(product) === 'present' && !directionsIssue
      ? recordedDirections : [],
    ...(directionsIssue ? { directionsIssue } : {}),
    limitations: [
      `Supplier name and business address ${labelCopy?.supplierName || labelCopy?.supplierAddress ? 'are recorded as user-entered text' : 'have not been entered'}; supplier identity, sale route, exceptions and any documentation alternative have not been assessed.`,
      `Lot identification ${labelCopy?.lotIdentification ? 'is recorded as user-entered text' : 'has not been entered'}; no lot code is generated or validated, and exception facts have not been assessed.`,
      `Date marking ${labelCopy?.dateMarking ? 'is recorded as user-entered text' : 'has not been entered'}; date type, basis, applicability and shelf life are not assessed or calculated.`,
      `Storage instructions ${labelCopy?.storageInstructions ? 'are recorded as user-entered text' : 'have not been entered'}; their adequacy and whether they are needed have not been assessed.`,
      `Warning or advisory text ${labelCopy?.warningAdvisoryStatements ? 'is recorded as user-entered text' : 'has not been entered'}; wording, applicability and warning text size are not verified, and an empty field does not establish that no statement applies.`,
      'Other product-specific label requirements are not comprehensively screened; check applicable provisions and product facts.',
      'Allergen declarations use recorded evidence and draft rule data; exemptions, final-food conditions and physical package presentation are not fully assessed.',
    ],
  };
}
