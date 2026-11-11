import type { EngineResult } from '@aus-food/domain';
import type { LabelConsultantSection } from '@aus-food/label';
import type { FormulationRecord, IngredientRecord, ProductRecord } from '@aus-food/storage';
import { buildAdditiveNameReport } from './additive-name-checks';
import { buildClaimChecks, CLAIM_LIMITATIONS } from './claim-checks';
import type { LabelDraft } from './label-draft';

function officialResult(name: string, result: EngineResult<unknown>): string[] {
  return [
    `${name}: ${result.status} (${result.applicationMode}). ${result.explanation}`,
    `What was checked: ${result.whatWasChecked}`,
    ...(result.suggestedAction ? [`Next step: ${result.suggestedAction}`] : []),
    `Rule: ${result.rule.name} (${result.rule.id}); ${result.rule.provision}; mapping ${result.rule.mappingConfidence}; version ${result.rule.version}.`,
    `Source: ${result.rule.sourceUrl}`,
    ...result.inputs.map((input) =>
      `Input: ${input.name}: ${input.value}${input.unit ? ` ${input.unit}` : ''}; source ${input.sourceId}; date ${input.sourceDate}.`),
  ];
}

export function makeConsultantNotes(
  product: ProductRecord,
  formulations: readonly FormulationRecord[],
  ingredients: readonly IngredientRecord[],
  draft: LabelDraft,
): readonly LabelConsultantSection[] {
  const report = buildAdditiveNameReport(product, formulations, ingredients, false);
  const claims = buildClaimChecks(product, false);
  const additives: string[] = [];
  if (report.error) additives.push(`Could not assess additive and name information: ${report.error}`);
  for (const declaration of report.declarations) {
    additives.push(`${declaration.additiveName} in ${declaration.ingredientName}: REVIEW REQUIRED; ${declaration.candidate.text ? `candidate wording: ${declaration.candidate.text}` : 'no candidate wording selected'}.`);
  }
  for (const additive of report.additives) {
    additives.push(...officialResult(`Additive ${additive.codeNumber} (${additive.names.join(', ')})`, additive.permission));
    if (additive.concentration.status === 'calculated') {
      additives.push(`Calculated concentration: ${additive.concentration.value} ${additive.concentration.unit}; check its basis and evidence.`);
    } else {
      additives.push(`Concentration unavailable: ${additive.concentration.reasons.join(', ')}.`);
    }
  }
  if (report.uncodedAdditives.length) additives.push(`No permission check without an additive code: ${report.uncodedAdditives.join(', ')}.`);
  if (!report.declarations.length && !report.error) additives.push('No additive sources were recorded in the expanded recipe; confirm supplier information.');
  if (report.names) additives.push(...officialResult('Product name screening', report.names));
  if (report.sweetened) additives.push(...officialResult("Infant food 'sweetened' word", report.sweetened));
  additives.push(...report.limitations);
  const claimLines = claims.length
    ? claims.flatMap((check) => [
      `Entered claim: "${check.claim.text}"; type: ${check.claim.classification ?? 'not classified'}; classification ${check.claim.classificationConfirmed ? 'confirmed' : 'not confirmed'}.`,
      ...officialResult('Claim check', check.official),
      ...(check.official.value?.checklist.map((item) => `${item.label}: ${item.status}. ${item.detail}`) ?? []),
    ])
    : ['No claims were entered. Confirm any wording or images intended for the pack.'];
  return [
    {
      heading: 'Draft label and nutrition',
      lines: [
        `Product: ${product.name}.`,
        ...draft.warnings,
        'The nutrition panel is a draft estimate based on supplier data and the confirmed recipe basis. Review the food form, density where used, rounding stage and any additional required rows.',
        'Warnings, other mandatory content, exemptions, and physical print legibility are not fully assessed.',
        ...(draft.missing.length ? draft.missing.map((item) => `Still needed: ${item}`) : ['The entered-information gate is complete; it is not a compliance determination.']),
      ],
    },
    { heading: 'Additives and product name', lines: additives },
    { heading: 'Claims', lines: [...claimLines, ...CLAIM_LIMITATIONS] },
  ];
}
