import type { FormulationRecord, IngredientRecord } from '@aus-food/storage';
import type { DirectAdditiveUse, ProcessMassProfile, UnquantifiedFormulationComponent } from '@aus-food/domain';
import { calculateMassPercentage, calculateProcessMassBalance, compareDecimals, convertMass, multiplyDecimals, plainDecimal, subtractDecimals, sumDecimals } from '@aus-food/engine';

export type LineUnit = 'g' | 'kg' | 'mg';

export interface FormulationLineDraft {
  id: string;
  kind: 'ingredient' | 'formulation';
  targetId: string;
  quantity: string;
  unit: LineUnit;
  additiveUse?: DirectAdditiveUse | '';
}

export function isDirectAdditiveLine(line: FormulationLineDraft, ingredients: readonly IngredientRecord[]): boolean {
  const record = ingredients.find((item) => item.id === line.targetId);
  return line.kind === 'ingredient' && Boolean(record?.directAdditiveSourceId
    && record.additiveSources?.some((source) => source.id === record.directAdditiveSourceId));
}

export interface FormulationDraft {
  name: string;
  lines: FormulationLineDraft[];
  compositionCoverage: '' | 'partial' | 'complete';
  compositionReference: string;
  compositionDate: string;
  confirmCompositionChanges: boolean;
}

export function emptyFormulationDraft(): FormulationDraft {
  return { name: '', lines: [], compositionCoverage: '', compositionReference: '', compositionDate: '', confirmCompositionChanges: false };
}

export function formulationReferencePreview(draft: FormulationDraft, id: string) {
  const unquantifiedLines = draft.lines.flatMap<UnquantifiedFormulationComponent>((line) => {
    if (!line.targetId) return [];
    return line.kind === 'ingredient'
      ? [{ id: line.id, kind: 'ingredient' as const, ingredientId: line.targetId }]
      : [{ id: line.id, kind: 'formulation' as const, formulationId: line.targetId }];
  });
  return {
    id, name: draft.name.trim() || 'This recipe', lines: [],
    incompleteRecipeLines: { unquantifiedLines, lineOrder: unquantifiedLines.map((line) => line.id) },
  };
}

export function draftFromFormulation(record: FormulationRecord): FormulationDraft {
  if (record.supplierComposition && record.incompleteRecipeLines) {
    throw new Error('A formulation cannot have both composition and incomplete recipe lines.');
  }
  const unknownLines = record.supplierComposition?.unquantifiedComponents
    ?? record.incompleteRecipeLines?.unquantifiedLines ?? [];
  const lines: FormulationLineDraft[] = [...record.lines.map((line) => ({
    id: line.id,
    kind: line.kind,
    targetId: line.kind === 'ingredient' ? line.ingredientId : line.formulationId,
    quantity: line.quantity.value,
    unit: line.quantity.unit,
    ...(line.kind === 'ingredient' && line.additiveUse ? { additiveUse: line.additiveUse } : {}),
  })), ...unknownLines.map((line) => ({
    id: line.id,
    kind: line.kind,
    targetId: line.kind === 'ingredient' ? line.ingredientId : line.formulationId,
    quantity: '',
    unit: line.unit ?? 'g',
    ...(line.kind === 'ingredient' && line.additiveUse ? { additiveUse: line.additiveUse } : {}),
  }))];
  const lineOrder = record.supplierComposition?.lineOrder ?? record.incompleteRecipeLines?.lineOrder;
  if (lineOrder) {
    const positions = new Map(lineOrder.map((id, index) => [id, index]));
    lines.sort((a, b) => (positions.get(a.id) ?? lines.length) - (positions.get(b.id) ?? lines.length));
  }
  return {
    name: record.name,
    compositionCoverage: record.supplierComposition?.coverage ?? '',
    compositionReference: record.supplierComposition?.specification?.reference ?? '',
    compositionDate: record.supplierComposition?.specification?.sourceDate ?? '',
    confirmCompositionChanges: false,
    lines,
  };
}

const positiveNumber = /^(?:\d+)(?:\.\d+)?$/;

export function percentageTotal(values: readonly string[]): string | undefined {
  if (!values.length || values.some((value) =>
    !positiveNumber.test(value) || !Number.isFinite(Number(value)) || Number(value) <= 0)) return undefined;
  return plainDecimal(sumDecimals(values));
}

export function amountsFromPercentages(
  draft: FormulationDraft,
  values: readonly string[],
  batchWeight: string,
): string[] {
  if (draft.compositionCoverage === 'partial') {
    throw new Error('Percentages cannot represent the whole batch while the composition is partial.');
  }
  if (values.length !== draft.lines.length || draft.lines.some((line) => !line.targetId)) {
    throw new Error('Choose a record and enter a percentage for every line.');
  }
  const total = percentageTotal(values);
  if (total === undefined) throw new Error('Enter a positive percentage for every line.');
  if (compareDecimals(total, '100') !== 0) throw new Error(`Percentages total ${total}%; they must add up to 100%.`);
  positiveMass(batchWeight, 'starting batch weight');
  return values.map((value) => {
    const amount = plainDecimal(multiplyDecimals(multiplyDecimals(value, batchWeight), '0.01'));
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      throw new Error('A calculated amount is too large or small to save. Check the batch weight and percentages.');
    }
    return amount;
  });
}

export interface ProcessChangeDraft {
  id: string;
  kind: '' | 'gain' | 'loss';
  quantity: string;
  unit: LineUnit;
  description: string;
  material: '' | 'water' | 'other';
}

export type ProcessMode = 'unknown' | 'unchanged' | 'measured' | 'detailed' | 'existing';

export function processModeFromProfile(profile?: ProcessMassProfile): ProcessMode {
  if (!profile) return 'unknown';
  if (profile.entryMethod === 'changes' && profile.changes.every((change) => change.kind !== 'addition')) {
    return 'detailed';
  }
  if ((profile.complete !== false || (profile.entryMethod === 'finalMass' && profile.changes.length === 0))
    && profile.entryMethod !== 'changes' && profile.declaredFinalMass
    && profile.changes.length <= 1
    && profile.changes.every((change) => change.kind !== 'addition' && !change.description && !change.material)) {
    return 'measured';
  }
  if (profile.complete === false || profile.changes.length > 0 || profile.declaredFinalMass) return 'existing';
  return 'unchanged';
}

export function processEffectsNeedReview(profile?: ProcessMassProfile): boolean {
  return profile !== undefined
    && (profile.complete === false || profile.changes.length > 0 || profile.declaredFinalMass !== undefined);
}

export function processChangeDrafts(profile?: ProcessMassProfile): ProcessChangeDraft[] {
  return (profile?.changes ?? []).map((change) => {
    if (change.kind === 'addition') throw new Error('Ingredient additions must remain in the existing processing details.');
    return {
      id: change.id,
      kind: change.kind,
      quantity: change.mass?.value ?? '',
      unit: change.mass?.unit ?? 'g',
      description: change.description ?? '',
      material: change.material ?? '',
    };
  });
}

function completeIngoingMass(record: FormulationRecord): string {
  if (record.supplierComposition?.coverage === 'partial'
    || record.supplierComposition?.unquantifiedComponents.length
    || record.incompleteRecipeLines?.unquantifiedLines.length || record.lines.length === 0) {
    throw new Error('All recipe amounts must be known before calculating the batch weight.');
  }
  return sumDecimals(record.lines.map((line) => convertMass(line.quantity, 'g').value));
}

function positiveMass(value: string, label: string): void {
  if (!positiveNumber.test(value) || !Number.isFinite(Number(value)) || Number(value) <= 0) {
    throw new Error(`Enter a positive ${label}.`);
  }
}

export function draftIngoingMass(draft: FormulationDraft): string | undefined {
  if (draft.compositionCoverage === 'partial' || draft.lines.length === 0
    || draft.lines.some((line) => !line.targetId || !positiveNumber.test(line.quantity)
      || !Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0)) {
    return undefined;
  }
  return plainDecimal(sumDecimals(draft.lines.map((line) => convertMass({
    value: line.quantity, unit: line.unit,
  }, 'g').value)));
}

export function measuredYieldPercentage(startingMass: string, finalValue: string, finalUnit: LineUnit): string {
  positiveMass(finalValue, 'final batch weight');
  return calculateMassPercentage({ value: finalValue, unit: finalUnit }, { value: startingMass, unit: 'g' });
}

export function processProfileForFinalMass(
  record: FormulationRecord,
  finalValue: string,
  finalUnit: LineUnit,
  makeId: (prefix: string) => string,
): ProcessMassProfile {
  const enteredFinalValue = finalValue.trim();
  positiveMass(enteredFinalValue, 'final batch weight');
  if (record.supplierComposition?.coverage === 'partial'
    || record.supplierComposition?.unquantifiedComponents.length
    || record.incompleteRecipeLines?.unquantifiedLines.length || record.lines.length === 0) {
    return {
      changes: [], complete: false, declaredFinalMass: { value: enteredFinalValue, unit: finalUnit }, entryMethod: 'finalMass',
    };
  }
  const ingoing = completeIngoingMass(record);
  const final = convertMass({ value: enteredFinalValue, unit: finalUnit }, 'g').value;
  const comparison = compareDecimals(final, ingoing);
  return {
    changes: comparison === 0 ? [] : [{
      id: makeId('process'),
      kind: comparison > 0 ? 'gain' : 'loss',
      mass: { value: plainDecimal(comparison > 0 ? subtractDecimals(final, ingoing) : subtractDecimals(ingoing, final)), unit: 'g' },
    }],
    declaredFinalMass: { value: enteredFinalValue, unit: finalUnit },
    entryMethod: 'finalMass',
  };
}

export function processProfileForChanges(
  record: FormulationRecord,
  changes: readonly ProcessChangeDraft[],
  complete: boolean,
  finalValue: string,
  finalUnit: LineUnit,
): ProcessMassProfile {
  if (changes.length === 0) throw new Error('Add at least one weight change, or choose another option.');
  const entries = changes.map((change, index) => {
    if (!change.kind) throw new Error(`Choose whether weight change ${index + 1} is a gain or loss.`);
    const value = change.quantity.trim();
    if (value) positiveMass(value, `amount for weight change ${index + 1}`);
    else if (complete) throw new Error('Enter every change amount before confirming the list is complete.');
    const description = change.description.trim();
    if (description.length > 120) throw new Error('A processing description must be 120 characters or fewer.');
    return {
      id: change.id,
      kind: change.kind,
      ...(value ? { mass: { value, unit: change.unit } } : {}),
      ...(description ? { description } : {}),
      ...(change.material ? { material: change.material } : {}),
    };
  });
  const final = finalValue.trim();
  if (final) positiveMass(final, 'final batch weight');
  const profile: ProcessMassProfile = {
    changes: entries,
    complete,
    entryMethod: 'changes',
    ...(final ? { declaredFinalMass: { value: final, unit: finalUnit } } : {}),
  };
  if (complete) calculateProcessMassBalance({ value: completeIngoingMass(record), unit: 'g' }, profile);
  return profile;
}

// Returns the saved record. Throws a plain-English Error when something is missing or inconsistent.
export function buildFormulationRecord(
  draft: FormulationDraft,
  existing: FormulationRecord | undefined,
  makeId: (prefix: string) => string,
  now: string,
): FormulationRecord {
  const name = draft.name.trim();
  if (!name) {
    throw new Error('Give the formulation a name.');
  }
  if (draft.lines.length === 0 && draft.compositionCoverage !== 'partial') {
    throw new Error('Add at least one ingredient or nested formulation line.');
  }
  if (existing?.supplierComposition && !draft.compositionCoverage) {
    throw new Error('Supplier composition evidence cannot be removed here. Keep a partial or complete supplier composition.');
  }
  if (draft.compositionCoverage && draft.compositionDate) {
    const date = new Date(`${draft.compositionDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.compositionDate) || !Number.isFinite(date.getTime())
      || date.toISOString().slice(0, 10) !== draft.compositionDate) {
      throw new Error('Enter a valid composition source date.');
    }
  }
  const lines: FormulationRecord['lines'][number][] = [];
  const unquantified: NonNullable<FormulationRecord['supplierComposition']>['unquantifiedComponents'][number][] = [];
  for (const line of draft.lines) {
    if (!line.targetId) {
      throw new Error('Choose a record for each formulation line.');
    }
    const target = line.kind === 'ingredient'
      ? { id: line.id, kind: 'ingredient' as const, ingredientId: line.targetId,
        ...(line.additiveUse ? { additiveUse: line.additiveUse } : {}) }
      : { id: line.id, kind: 'formulation' as const, formulationId: line.targetId };
    if (!line.quantity.trim()) {
      unquantified.push({ ...target, ...(line.unit !== 'g' ? { unit: line.unit } : {}) });
      continue;
    }
    if (!positiveNumber.test(line.quantity) || !Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0) {
      throw new Error('Each formulation line needs a positive quantity.');
    }
    const quantity = { value: line.quantity, unit: line.unit };
    lines.push({ ...target, quantity });
  }
  if (existing?.supplierComposition?.coverage === 'complete' && draft.compositionCoverage === 'complete'
    && (JSON.stringify(lines) !== JSON.stringify(existing.lines)
      || JSON.stringify(unquantified) !== JSON.stringify(existing.supplierComposition.unquantifiedComponents)
      || JSON.stringify(draft.lines.map((line) => line.id))
        !== JSON.stringify(existing.supplierComposition.lineOrder
          ?? [...existing.lines, ...existing.supplierComposition.unquantifiedComponents].map((line) => line.id))
      || draft.compositionReference.trim() !== (existing.supplierComposition.specification?.reference ?? '')
      || draft.compositionDate !== (existing.supplierComposition.specification?.sourceDate ?? ''))
    && !draft.confirmCompositionChanges) {
    throw new Error('Confirm that the updated composition and source are complete before saving.');
  }
  return {
    ...(existing ?? {}),
    id: existing?.id ?? makeId('formulation'),
    name,
    recordType: 'formulation',
    lines,
    ...(existing?.incompleteRecipeLines || (!draft.compositionCoverage && unquantified.length) ? {
      incompleteRecipeLines: !draft.compositionCoverage && unquantified.length
        ? { unquantifiedLines: unquantified, lineOrder: draft.lines.map((line) => line.id) } : undefined,
    } : {}),
    ...(draft.compositionCoverage ? {
      supplierComposition: {
        coverage: draft.compositionCoverage,
        ...(draft.compositionReference.trim() || draft.compositionDate ? { specification: { reference: draft.compositionReference.trim(), sourceDate: draft.compositionDate } } : {}),
        unquantifiedComponents: unquantified,
        lineOrder: draft.lines.map((line) => line.id),
      },
    } : {}),
    tags: existing?.tags ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

const gramsPerUnit: Record<LineUnit, number> = { g: 1, kg: 1000, mg: 0.001 };

// Display-only share of the recipe by weight; the engine does the exact calculation.
export function lineShares(draft: FormulationDraft): (string | undefined)[] {
  if (draft.compositionCoverage === 'partial'
    || draft.lines.some((line) => !positiveNumber.test(line.quantity)
      || !Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0)) {
    return draft.lines.map(() => undefined);
  }
  const grams = draft.lines.map((line) =>
    positiveNumber.test(line.quantity) ? Number(line.quantity) * gramsPerUnit[line.unit] : undefined,
  );
  const total = grams.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  if (!Number.isFinite(total)) return draft.lines.map(() => undefined);
  return grams.map((value) => {
    if (value === undefined || total === 0) return undefined;
    const share = (value / total) * 100;
    return share < 0.05 ? '<0.1%' : `${share.toFixed(1)}%`;
  });
}

export interface FormulationStepStatus {
  done: boolean;
  text: string;
}

export function formulationStepStatuses(
  draft: FormulationDraft,
): Record<'name' | 'lines', FormulationStepStatus> {
  const complete = draft.lines.filter(
    (line) => line.targetId !== '' && positiveNumber.test(line.quantity)
      && Number.isFinite(Number(line.quantity)) && Number(line.quantity) > 0,
  ).length;
  const linesDone = draft.lines.length > 0 && complete === draft.lines.length;
  return {
    name: {
      done: draft.name.trim() !== '',
      text: draft.name.trim() !== '' ? 'Answered' : 'Still needed',
    },
    lines: {
      done: linesDone,
      text:
        draft.lines.length === 0
          ? 'None added'
          : `${complete} of ${draft.lines.length} complete`,
    },
  };
}
