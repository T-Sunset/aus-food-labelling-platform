import { describe, expect, it } from 'vitest';
import type { FormulationRecord } from '@aus-food/storage';
import {
  buildFormulationRecord,
  draftFromFormulation,
  emptyFormulationDraft,
  formulationStepStatuses,
  lineShares,
} from './formulation-form';

let counter = 0;
const makeId = (prefix: string) => `${prefix}-${++counter}`;
const now = '2026-01-01T00:00:00.000Z';

function draftWithLines() {
  const draft = emptyFormulationDraft();
  draft.name = 'Base';
  draft.lines = [
    { id: 'l1', kind: 'ingredient', targetId: 'ing-1', quantity: '900', unit: 'g' },
    { id: 'l2', kind: 'formulation', targetId: 'f-2', quantity: '0.1', unit: 'kg' },
  ];
  return draft;
}

describe('buildFormulationRecord', () => {
  it('builds ingredient and nested formulation lines', () => {
    const record = buildFormulationRecord(draftWithLines(), undefined, makeId, now);
    expect(record.lines[0]).toMatchObject({ kind: 'ingredient', ingredientId: 'ing-1' });
    expect(record.lines[1]).toMatchObject({ kind: 'formulation', formulationId: 'f-2' });
  });

  it('rejects a missing name, no lines, a missing record and bad quantities', () => {
    expect(() => buildFormulationRecord(emptyFormulationDraft(), undefined, makeId, now)).toThrow(/name/);
    const noLines = emptyFormulationDraft();
    noLines.name = 'X';
    expect(() => buildFormulationRecord(noLines, undefined, makeId, now)).toThrow(/at least one/);
    for (const [targetId, quantity] of [['', '5'], ['a', '0'], ['a', 'abc'], ['a', '']]) {
      const draft = draftWithLines();
      draft.lines = [{ id: 'l', kind: 'ingredient', targetId: targetId!, quantity: quantity!, unit: 'g' }];
      expect(() => buildFormulationRecord(draft, undefined, makeId, now)).toThrow();
    }
  });

  it('keeps id, line ids, creation date and other fields when editing', () => {
    const original = buildFormulationRecord(draftWithLines(), undefined, makeId, now);
    const withProfile = { ...original, processMassProfile: { marker: true } } as unknown as FormulationRecord;
    const draft = draftFromFormulation(withProfile);
    draft.name = 'Renamed';
    const edited = buildFormulationRecord(draft, withProfile, makeId, '2026-02-02T00:00:00.000Z');
    expect(edited.id).toBe(original.id);
    expect(edited.lines.map((line) => line.id)).toEqual(['l1', 'l2']);
    expect(edited.createdAt).toBe(now);
    expect(edited.name).toBe('Renamed');
    expect((edited as unknown as { processMassProfile: unknown }).processMassProfile).toEqual({ marker: true });
  });

  it('retains partial supplier evidence and components with unknown amounts', () => {
    const draft = draftWithLines();
    draft.compositionCoverage = 'partial';
    draft.compositionReference = 'BLEND-SPEC';
    draft.compositionDate = '2026-01-01';
    draft.lines[1]!.quantity = '';
    const record = buildFormulationRecord(draft, undefined, makeId, now);
    expect(record.lines).toHaveLength(1);
    expect(record.supplierComposition).toEqual({
      coverage: 'partial',
      specification: { reference: 'BLEND-SPEC', sourceDate: '2026-01-01' },
      unquantifiedComponents: [{ id: 'l2', kind: 'formulation', formulationId: 'f-2' }],
      lineOrder: ['l1', 'l2'],
    });
    expect(lineShares(draft)).toEqual([undefined, undefined]);
    expect(buildFormulationRecord(draftFromFormulation(record), record, makeId, now)).toEqual(record);
    const edit = draftFromFormulation(record);
    edit.compositionCoverage = 'complete';
    expect(() => buildFormulationRecord(edit, record, makeId, now)).toThrow(/positive quantity/);
    edit.lines[1]!.quantity = '10';
    expect(buildFormulationRecord(edit, record, makeId, now).supplierComposition?.unquantifiedComponents).toEqual([]);
    edit.compositionCoverage = '';
    expect(() => buildFormulationRecord(edit, record, makeId, now)).toThrow(/cannot be removed/);
  });

  it('requires source details for supplier composition and supports unknown components', () => {
    const draft = emptyFormulationDraft();
    draft.name = 'Unknown blend';
    draft.compositionCoverage = 'partial';
    expect(() => buildFormulationRecord(draft, undefined, makeId, now)).toThrow(/reference and date/);
    draft.compositionReference = 'SPEC';
    draft.compositionDate = '2026-01-01';
    expect(buildFormulationRecord(draft, undefined, makeId, now).lines).toEqual([]);
  });

  it('requires reconfirmation when an evidenced complete composition is changed', () => {
    const draft = draftWithLines();
    draft.compositionCoverage = 'complete';
    draft.compositionReference = 'SPEC';
    draft.compositionDate = '2026-01-01';
    const original = buildFormulationRecord(draft, undefined, makeId, now);
    const edit = draftFromFormulation(original);
    edit.lines[0]!.quantity = '800';
    expect(() => buildFormulationRecord(edit, original, makeId, now)).toThrow(/Confirm that the updated composition/);
    edit.confirmCompositionChanges = true;
    expect(buildFormulationRecord(edit, original, makeId, now).lines[0]?.quantity.value).toBe('800');
  });
});

describe('lineShares and statuses', () => {
  it('shows each line as a share of the total weight across units', () => {
    expect(lineShares(draftWithLines())).toEqual(['90.0%', '10.0%']);
  });

  it('leaves shares blank when a quantity is not a number', () => {
    const draft = draftWithLines();
    draft.lines[0]!.quantity = '';
    expect(lineShares(draft)[0]).toBeUndefined();
  });

  it('reports progress in plain words', () => {
    expect(formulationStepStatuses(draftWithLines()).lines.text).toBe('2 of 2 complete');
    expect(formulationStepStatuses(emptyFormulationDraft()).lines.text).toBe('None added');
  });
});
