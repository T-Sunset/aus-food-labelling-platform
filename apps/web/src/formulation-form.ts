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
}

export function emptyFormulationDraft(): FormulationDraft {
  return { name: '', lines: [] };
}

export function draftFromFormulation(record: FormulationRecord): FormulationDraft {
  return {
    name: record.name,
    lines: record.lines.map((line) => ({
      id: line.id,
      kind: line.kind,
      targetId: line.kind === 'ingredient' ? line.ingredientId : line.formulationId,
      quantity: line.quantity.value,
      unit: line.quantity.unit,
    })),
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
  if (draft.lines.length === 0) {
    throw new Error('Add at least one ingredient or nested formulation line.');
  }
  const lines = draft.lines.map((line) => {
    if (!line.targetId) {
      throw new Error('Choose a record for each formulation line.');
    }
    if (!positiveNumber.test(line.quantity) || Number(line.quantity) <= 0) {
      throw new Error('Each formulation line needs a positive quantity.');
    }
    const quantity = { value: line.quantity, unit: line.unit };
    return line.kind === 'ingredient'
      ? { id: line.id, kind: 'ingredient' as const, ingredientId: line.targetId, quantity }
      : { id: line.id, kind: 'formulation' as const, formulationId: line.targetId, quantity };
  });
  return {
    ...(existing ?? {}),
    id: existing?.id ?? makeId('formulation'),
    name,
    recordType: 'formulation',
    lines,
    tags: existing?.tags ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

const gramsPerUnit: Record<LineUnit, number> = { g: 1, kg: 1000, mg: 0.001 };

// Display-only share of the recipe by weight; the engine does the exact calculation.
export function lineShares(draft: FormulationDraft): (string | undefined)[] {
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
