import type { FormulationRecord } from '@aus-food/storage';

export type LineUnit = 'g' | 'kg' | 'mg';

export interface FormulationLineDraft {
  id: string;
  kind: 'ingredient' | 'formulation';
  targetId: string;
  quantity: string;
  unit: LineUnit;
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

export function draftFromFormulation(record: FormulationRecord): FormulationDraft {
  const lines: FormulationLineDraft[] = [...record.lines.map((line) => ({
    id: line.id,
    kind: line.kind,
    targetId: line.kind === 'ingredient' ? line.ingredientId : line.formulationId,
    quantity: line.quantity.value,
    unit: line.quantity.unit,
  })), ...(record.supplierComposition?.unquantifiedComponents ?? []).map((line) => ({
    id: line.id,
    kind: line.kind,
    targetId: line.kind === 'ingredient' ? line.ingredientId : line.formulationId,
    quantity: '',
    unit: 'g' as const,
  }))];
  if (record.supplierComposition?.lineOrder) {
    const positions = new Map(record.supplierComposition.lineOrder.map((id, index) => [id, index]));
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
  if (draft.compositionCoverage && Boolean(draft.compositionReference.trim()) !== Boolean(draft.compositionDate)) {
    throw new Error('Provide both a composition source reference and date, or leave both blank.');
  }
  const lines: FormulationRecord['lines'][number][] = [];
  const unquantified: NonNullable<FormulationRecord['supplierComposition']>['unquantifiedComponents'][number][] = [];
  for (const line of draft.lines) {
    if (!line.targetId) {
      throw new Error('Choose a record for each formulation line.');
    }
    const target = line.kind === 'ingredient'
      ? { id: line.id, kind: 'ingredient' as const, ingredientId: line.targetId }
      : { id: line.id, kind: 'formulation' as const, formulationId: line.targetId };
    if (!line.quantity.trim() && draft.compositionCoverage) {
      unquantified.push(target);
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
    ...(draft.compositionCoverage ? {
      supplierComposition: {
        coverage: draft.compositionCoverage,
        ...(draft.compositionReference.trim() ? { specification: { reference: draft.compositionReference.trim(), sourceDate: draft.compositionDate } } : {}),
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
    || draft.lines.some((line) => !positiveNumber.test(line.quantity) || Number(line.quantity) <= 0)) {
    return draft.lines.map(() => undefined);
  }
  const grams = draft.lines.map((line) =>
    positiveNumber.test(line.quantity) ? Number(line.quantity) * gramsPerUnit[line.unit] : undefined,
  );
  const total = grams.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  return grams.map((value) =>
    value === undefined || total === 0 ? undefined : `${((value / total) * 100).toFixed(1)}%`,
  );
}

export interface FormulationStepStatus {
  done: boolean;
  text: string;
}

export function formulationStepStatuses(
  draft: FormulationDraft,
): Record<'name' | 'lines', FormulationStepStatus> {
  const complete = draft.lines.filter(
    (line) => line.targetId !== '' && positiveNumber.test(line.quantity) && Number(line.quantity) > 0,
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
