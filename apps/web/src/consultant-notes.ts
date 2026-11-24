import type { EngineResult, LabelClaim } from '@aus-food/domain';
import type { LabelConsultantSection, LabelLayoutResult } from '@aus-food/label';
import { labelTextBlocks, type FormulationRecord, type IngredientRecord, type LabelAdditiveWording, type LabelDraftRecord, type ProductRecord } from '@aus-food/storage';
import { buildAdditiveNameReport } from './additive-name-checks';
import { buildClaimChecks, CLAIM_LIMITATIONS } from './claim-checks';
import type { ClaimCandidate } from './claim-candidates';
import type { LabelDraft } from './label-draft';
import { LABEL_EXPORT_LIMITATIONS } from './label-export-readiness';
import { caffeineCheckForProduct } from './caffeine-check';
import { displaySourcePath } from './source-path';
import { labelTextBlockNames } from './label-settings';
import { dailyIntakeReferenceSet, dailyIntakeSources } from './rule-data';

export interface LabelOutputContext {
  readonly name: string;
  readonly saved: boolean;
  readonly unsaved: boolean;
  readonly dependenciesChanged: boolean;
  readonly savedLabelChanged: boolean;
  readonly unsavedProductChanges: boolean;
  readonly additiveWording?: readonly LabelAdditiveWording[];
  readonly claims?: readonly LabelClaim[];
  readonly claimCandidates?: readonly ClaimCandidate[];
  readonly preview:
    | { readonly layout: LabelLayoutResult; readonly settings: LabelDraftRecord['layout'] }
    | { readonly error: string };
}

function recordedPackLines(label: string, value: string | undefined): string[] {
  if (!value?.trim()) return [`${label}: Not entered.`];
  return [
    `${label} (user-entered):`,
    ...value.split(/\r?\n/u),
  ];
}

function officialResult(name: string, result: EngineResult<unknown>): string[] {
  return [
    `${name}: ${result.status} (${result.applicationMode}). ${result.explanation}`,
    `What was checked: ${result.whatWasChecked}`,
    ...(result.suggestedAction ? [`Next step: ${result.suggestedAction}`] : []),
    `Rule: ${result.rule.name} (${result.rule.id}); ${result.rule.provision}; mapping ${result.rule.mappingConfidence}; version ${result.rule.version}; effective from ${result.rule.effectiveFrom}${result.rule.effectiveTo ? ` to ${result.rule.effectiveTo}` : ''}.`,
    `Source: ${result.rule.sourceUrl}`,
    ...result.inputs.map((input) =>
      `Input: ${input.name}: ${input.value}${input.unit ? ` ${input.unit}` : ''}; source ${input.sourceId}; date ${input.sourceDate}; path ${input.sourcePath.length ? input.sourcePath.join(' > ') : 'not supplied'}.`),
  ];
}

export function makeConsultantNotes(
  product: ProductRecord,
  formulations: readonly FormulationRecord[],
  ingredients: readonly IngredientRecord[],
  draft: LabelDraft,
  output?: LabelOutputContext,
): readonly LabelConsultantSection[] {
  const report = buildAdditiveNameReport(product, formulations, ingredients, false, output?.additiveWording);
  const claims = buildClaimChecks(product, false, output?.claims ?? [], draft.nutrition);
  const caffeine = caffeineCheckForProduct(product, new Date().toISOString().slice(0, 10), formulations, ingredients);
  const additives: string[] = [];
  if (report.error) additives.push(`Could not assess additive and name information: ${report.error}`);
  for (const declaration of report.declarations) {
    additives.push(`${declaration.additiveName} in ${declaration.ingredientName}: REVIEW REQUIRED; ${declaration.candidate.text ? `candidate wording: ${declaration.candidate.text}` : 'no candidate wording selected'}.`);
  }
  for (const additive of report.additives) {
    additives.push(...officialResult(`Additive ${additive.codeNumber} (${additive.names.join(', ')})`, additive.permission));
    if (additive.concentration.status === 'calculated') {
      additives.push(`Calculated concentration: ${additive.concentration.value} ${additive.concentration.unit}; check its basis and evidence.`);
      additives.push(...additive.concentration.provenanceWarnings.map((warning) => `REVIEW REQUIRED: ${warning}`));
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
      'REVIEW REQUIRED: Claim wording is reproduced exactly as entered; it is not legal clearance.',
      ...officialResult('Claim check', check.official),
      ...(check.nipInteraction
        ? [
          `Claim-related NIP review required: ${check.nipInteraction.requiredRows
            .map((row) => `${row.label} (${row.available ? 'data available' : 'missing or needs review'})`).join(', ')}.`,
          check.nipInteraction.message,
        ]
        : []),
      ...check.guidance.map((guidance) => `Next action: ${guidance.message}`),
      ...(check.official.value?.checklist.map((item) => `${item.label}: ${item.status}. ${item.detail}`) ?? []),
    ])
    : ['No claims were entered for this Label draft. Confirm any wording or images intended for the pack.'];
  const candidateLines = output?.claimCandidates
    ? [
      'Local phrase scan is limited and can miss claims; images, logos, external artwork and other marketing material are not scanned.',
      ...(output.claimCandidates.length
        ? output.claimCandidates.map((candidate) =>
          `Possible claim: "${candidate.text}"; ${candidate.location}; ${candidate.shownInPreview ? 'shown' : 'not shown'} in the current preview. REVIEW REQUIRED; not assessed as a claim.`)
        : ['No matching phrases found; this does not establish that no claims exist.']),
    ]
    : [];
  const path = (parts: readonly string[]) => displaySourcePath(parts, ingredients, formulations, ' > ');
  const nutrition = draft.nutritionPanel;
  const dailyIntakeSourceIds = new Set([
    ...dailyIntakeReferenceSet.sourceIds,
    ...(product.builderProductType === 'infantFood' ? dailyIntakeReferenceSet.scopeExclusionSourceIds : []),
  ]);
  const dailyIntakeSourceLines = dailyIntakeSources
    .filter((source) => dailyIntakeSourceIds.has(source.id))
    .map((source) => `Source ${source.id}: ${source.instrument}; ${source.referenceVersion}; effective ${source.effectiveFrom}; checked ${source.checkedOn}; ${source.sourceUrl}`);
  const dailyIntakeLines = nutrition.dailyIntakeStatus === 'included'
    ? [
      `%DI is included per serving using unrounded values. Display policy: ${nutrition.dailyIntakeRoundingPolicy}.`,
      dailyIntakeReferenceSet.calculationNote,
      `Reference set ${dailyIntakeReferenceSet.version}; ${dailyIntakeReferenceSet.provision}; mapping ${dailyIntakeReferenceSet.mappingConfidence}; effective from ${dailyIntakeReferenceSet.effectiveFrom}.`,
      `Required statement: ${nutrition.dailyIntakeStatement ?? 'Not available; review required'}.`,
      ...dailyIntakeSourceLines,
    ]
    : nutrition.dailyIntakeStatus === 'needsReview'
      ? [
        `%DI was requested but is not displayed: ${nutrition.dailyIntakeIssue ?? 'applicability needs review'}.`,
        ...dailyIntakeSourceLines,
      ]
      : ['Optional %DI was not selected for this label draft.'];
  const preview = output?.preview;
  return [
    ...(output ? [{
      heading: 'Selected label preview and layout',
      lines: [
        `Label draft: ${output.name.trim() || 'Unnamed draft'}.`,
        !output.saved ? 'This label draft has not been saved.'
          : output.unsaved ? 'Label settings contain unsaved changes.' : 'Label settings match the open saved draft.',
        ...(output.dependenciesChanged ? ['Product or dependencies changed since this label was saved; review the current preview.'] : []),
        ...(output.savedLabelChanged ? ['The saved label was changed or replaced; these are the open settings.'] : []),
        ...(output.unsavedProductChanges ? ['Unsaved Product edits are not included; this report uses saved Product data.'] : []),
        ...(preview && 'layout' in preview
          ? [
            `Preview dimensions: ${preview.settings.widthMm} x ${preview.settings.heightMm} mm; orientation: ${preview.settings.orientation}.`,
            `Margins (mm): top ${preview.settings.margins.topMm}, right ${preview.settings.margins.rightMm}, bottom ${preview.settings.margins.bottomMm}, left ${preview.settings.margins.leftMm}; spacing ${preview.settings.gapMm}.`,
            ...labelTextBlocks.map((key) => `${labelTextBlockNames[key]} text size: ${preview.settings.textSizes[key]} mm.`),
            `Layout status: ${preview.layout.status.replaceAll('_', ' ').toUpperCase()}.`,
            ...preview.layout.issues.map((issue) => `${issue.code}: ${issue.message}`),
          ]
          : [`No label preview could be generated: ${preview && 'error' in preview ? preview.error : 'No product is selected.'}`]),
        'The preview is a draft; font embedding, physical print legibility and legal requirements remain to be reviewed.',
      ],
    }] : []),
    {
      heading: 'Draft label and nutrition',
      lines: [
        `Product: ${product.name}.`,
        'The Product timestamp identifies a live draft, not a version-pinned historical result.',
        'This is an incomplete review copy, not a finished or approved label for food packaging.',
        ...LABEL_EXPORT_LIMITATIONS.map((reason) => `REVIEW REQUIRED: ${reason}`),
        ...draft.warnings,
        'The nutrition panel is a draft estimate based on supplier data and the confirmed recipe basis. Review the food form, density where used, rounding stage and any additional required rows.',
        'Warnings, other mandatory content, exemptions, and physical print legibility are not fully assessed.',
        ...(draft.missing.length ? draft.missing.map((item) => `Still needed: ${item}`) : ['The entered-information gate is complete; it is not a compliance determination.']),
      ],
    },
    {
      heading: 'Draft nutrition panel values',
      lines: [
        `Nutrition basis: ${nutrition.basis}. ${nutrition.note}`,
        `Servings per package: ${nutrition.servingsPerPack}.`,
        `Serving size: ${nutrition.servingSize}.`,
        `Columns: Per serving; ${nutrition.dailyIntakeStatus === 'included' ? '%DI per serving; ' : ''}${nutrition.unitHeading}${nutrition.combinedHeading ? `; ${nutrition.combinedHeading}` : ''}.`,
        ...nutrition.rows.map((row) => `${row.label}: ${row.serving}${nutrition.dailyIntakeStatus === 'included' ? `; %DI ${row.dailyIntake ?? 'Not available'}` : ''}; ${row.unitQuantity}${nutrition.combinedHeading ? `; ${row.combined ?? 'Not available'}` : ''}.`),
        ...dailyIntakeLines,
        ...nutrition.missing.map((item) => `REVIEW REQUIRED: ${item}`),
        'These are draft values, not a determination that the panel or basis is legally appropriate.',
      ],
    },
    {
      heading: 'Pack content and limitations',
      lines: [
        `Proposed product name (product record): ${draft.pack.name}.`,
        `Recorded net contents: ${draft.pack.netContents ?? 'Not supplied; review required'} (product pack details).`,
        ...recordedPackLines('Supplier business name', draft.pack.recordedLabelCopy?.supplierName),
        ...recordedPackLines('Supplier business address', draft.pack.recordedLabelCopy?.supplierAddress),
        ...recordedPackLines('Lot identification', draft.pack.recordedLabelCopy?.lotIdentification),
        ...recordedPackLines('Date marking', draft.pack.recordedLabelCopy?.dateMarking),
        ...recordedPackLines('Storage instructions', draft.pack.recordedLabelCopy?.storageInstructions),
        ...recordedPackLines('Warning or advisory text', draft.pack.recordedLabelCopy?.warningAdvisoryStatements),
        ...recordedPackLines('Precautionary allergen statement', draft.pack.recordedLabelCopy?.precautionaryAllergenStatement),
        ...recordedPackLines('Precautionary allergen statement basis', draft.pack.recordedLabelCopy?.precautionaryAllergenBasis),
        'Precautionary allergen statement text is optional and user-entered; it is not generated or assessed here, does not replace required allergen declarations, and a blank field does not establish that cross-contact risk is absent.',
        ...(draft.pack.previewDirections.length
          ? draft.pack.previewDirections.map((direction) => `Preview ${direction.kind.toLowerCase()} directions: ${direction.text}`)
          : ['No consumer directions are included in the label preview.']),
        ...(draft.pack.recordedDirections.length
          ? draft.pack.recordedDirections.map((direction) => `${direction.kind} directions (recorded, review required): ${direction.text}`)
          : ['No consumer direction text is recorded for the selected directions; this does not establish that directions are unnecessary.']),
        ...(draft.pack.directionsIssue ? [`Directions need review: ${draft.pack.directionsIssue}.`] : []),
        ...draft.pack.limitations.map((item) => `REVIEW REQUIRED: ${item}`),
      ],
    },
    {
      heading: 'Ingredient and allergen evidence',
      lines: [
        `Draft ingredient declaration: ${draft.declaration || 'Unavailable; review the recipe'}.`,
        draft.allergens.length
          ? draft.allergenDeclarationReady
            ? `Preview Contains summary: Contains ${draft.allergens.join(', ')}.`
            : `Known allergen candidates: ${draft.allergens.join(', ')}; the Contains summary is withheld because evidence or conditions remain unresolved.`
          : 'No allergen summary is included in the preview; missing evidence does not establish absence.',
        `Allergen declaration status: ${draft.allergenDeclarationReady ? 'generated from complete recorded evidence for review' : 'withheld or incomplete; REVIEW REQUIRED'}.`,
        'The declaration uses saved ingredient names and orders known recipe amounts by ingoing weight (Standard 1.2.4-5; SRC-005). It does not choose or verify a permitted name or Schedule 10 generic name (SRC-017); processing and exceptions need review.',
        'Additive wording is a candidate only and does not establish identity, permission or applicability (Standard 1.2.4-7; SRC-005).',
        ...(product.builderProductType === 'infantFood'
          ? ['The selected infant-food route guides this draft but does not confirm legal category; compound components are listed individually only when their composition is complete.']
          : []),
        ...(draft.declarationInputs.length
          ? draft.declarationInputs.map((item) => `Ingredient input: ${item.name}; path ${path(item.sourcePath)}; specification ${item.specification
            ? `${item.specification.reference}, ${item.specification.sourceDate}` : 'not supplied'}${item.additiveUse ? `; recorded use ${item.additiveUse}` : ''}.`)
          : ['No ingredient inputs were available; review the recipe.']),
        ...(draft.allergenTrace.length
          ? draft.allergenTrace.flatMap((item) => item.sourcePaths.map((sourcePath) =>
            `Candidate allergen ${item.summaryName}; ingredient-list name ${item.ingredientListName}; path ${path(sourcePath)}; review required.`))
          : ['No confirmed allergen names are shown; missing evidence does not establish absence.']),
        ...(draft.pendingAllergens.length ? [`Final-food allergen assessment needed: ${draft.pendingAllergens.join(', ')}.`] : []),
        ...(draft.allergenEvidence.length
          ? draft.allergenEvidence.map((source) => {
            const wheatStatus = source.assessments.wheat === 'present'
              ? `; wheat gluten status: ${ingredients.find((item) => item.id === source.subjectId)?.wheatGlutenStatus ?? 'not confirmed'}`
              : '';
            return `Allergen evidence: ${source.kind}; ${source.sourceId || 'source not supplied'}; ${source.sourceDate || 'date not supplied'}; path ${path(source.sourcePath)}${wheatStatus}; ${Object.entries(source.assessments).map(([id, status]) => `${id}: ${status}`).join(', ') || 'no assessments recorded'}.`;
          })
          : ['No allergen evidence is available; review required.']),
      ],
    },
    { heading: 'Additives and product name', lines: additives },
    ...(caffeine ? [{
      heading: 'Caffeine concentration',
      lines: [
        `${caffeine.status} (${caffeine.resultBasis}; rule ${caffeine.ruleReviewStatus}). ${caffeine.explanation}`,
        'The provisional calculation uses explicit recorded facts, recipe amounts and numeric density where needed; source references are optional.',
        'User-entered facts and supplied sources have not been independently verified.',
        `Rule: ${caffeine.rule.provision}; mapping ${caffeine.rule.mappingConfidence}; version ${caffeine.rule.version}; effective from ${caffeine.rule.effectiveFrom}.`,
        `Source: ${caffeine.rule.sourceUrl}`,
        `Evaluation date: ${caffeine.evaluationDate}.`,
        ...caffeine.inputs.map((input) => `Input: ${input.name}: ${input.value}; source ${input.sourceId || 'not supplied (user-entered or calculated)'}; ${input.sourceDate ? `date ${input.sourceDate}` : 'no source date recorded'}; path ${input.sourcePath.join(' > ')}.`),
        ...caffeine.limitations,
        caffeine.nonCertificationStatement,
      ],
    }] : []),
    { heading: 'Claims', lines: [...claimLines, ...candidateLines, ...CLAIM_LIMITATIONS] },
  ];
}
