import { describe, expect, it } from 'vitest';
import { calculateProcessMassBalance } from '@aus-food/engine';
import type { FormulationRecord } from '@aus-food/storage';
import {
  amountsFromPercentages,
  buildFormulationRecord,
  draftIngoingMass,
  draftFromFormulation,
  emptyFormulationDraft,
  formulationStepStatuses,
  lineShares,
  measuredYieldPercentage,
  percentageTotal,
  processChangeDrafts,
  processEffectsNeedReview,
  processModeFromProfile,
  processProfileForChanges,
  processProfileForFinalMass,
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

describe('percentage-based recipe entry', () => {
  it('converts an exactly reconciled batch without rounding small amounts', () => {
    const draft = draftWithLines();
    expect(amountsFromPercentages(draft, ['75', '25'], '2')).toEqual(['1.5', '0.5']);
    expect(amountsFromPercentages(draft, ['0.00000001', '99.99999999'], '1'))
      .toEqual(['0.0000000001', '0.9999999999']);
    expect(percentageTotal(['0.1', '99.9'])).toBe('100');
    expect(draft.lines[0]?.quantity).toBe('900');
  });

  it('rejects incomplete or unreconciled percentages, unknown batch weight and partial compositions', () => {
    const draft = draftWithLines();
    expect(percentageTotal(['', '100'])).toBeUndefined();
    expect(() => amountsFromPercentages(draft, ['50', ''], '1')).toThrow(/positive percentage/);
    expect(() => amountsFromPercentages(draft, ['50', '49.999'], '1')).toThrow(/total 99.999%/);
    expect(() => amountsFromPercentages(draft, ['50', '50.001'], '1')).toThrow(/total 100.001%/);
    expect(() => amountsFromPercentages(draft, ['0', '100'], '1')).toThrow(/positive percentage/);
    expect(() => amountsFromPercentages(draft, ['50', '50'], '')).toThrow(/starting batch weight/);
    draft.lines[0]!.targetId = '';
    expect(() => amountsFromPercentages(draft, ['50', '50'], '1')).toThrow(/Choose a record/);
    draft.compositionCoverage = 'partial';
    expect(() => amountsFromPercentages(draft, ['50', '50'], '1')).toThrow(/composition is partial/);
  });
});

describe('batch weight and measured yield previews', () => {
  it('derives the starting weight from ingredient and nested recipe amounts across units', () => {
    const draft = draftWithLines();
    expect(draftIngoingMass(draft)).toBe('1000');
    expect(measuredYieldPercentage('1000', '0.8', 'kg')).toBe('80');
    expect(measuredYieldPercentage('1000', '1000', 'g')).toBe('100');
    expect(measuredYieldPercentage('1000', '1200000', 'mg')).toBe('120');
    expect(measuredYieldPercentage('1000', '0.000001', 'g')).toBe('1e-7');
    expect(() => measuredYieldPercentage('1000', '0', 'g')).toThrow(/positive final batch weight/);
    const record = buildFormulationRecord(draft, undefined, makeId, now);
    const profile = processProfileForFinalMass(record, ' 999.999999999 ', 'g', makeId);
    expect(profile.declaredFinalMass?.value).toBe('999.999999999');
    expect(profile.changes[0]?.mass?.value).toBe('0.000000001');
    expect(calculateProcessMassBalance({ value: '1000', unit: 'g' }, profile))
      .toMatchObject({ status: 'calculated', finalMass: { value: '999.999999999', unit: 'g' } });
  });

  it('does not report a batch weight for missing, invalid or partial recipe details', () => {
    const draft = draftWithLines();
    draft.lines[0]!.quantity = '';
    expect(draftIngoingMass(draft)).toBeUndefined();
    draft.lines[0]!.quantity = '0';
    expect(draftIngoingMass(draft)).toBeUndefined();
    draft.lines[0]!.quantity = '900';
    draft.lines[1]!.targetId = '';
    expect(draftIngoingMass(draft)).toBeUndefined();
    draft.lines[1]!.targetId = 'f-2';
    draft.compositionCoverage = 'partial';
    expect(draftIngoingMass(draft)).toBeUndefined();
    expect(draftIngoingMass(emptyFormulationDraft())).toBeUndefined();
  });
});

describe('buildFormulationRecord', () => {
  it('round-trips an ordinary recipe with unknown amounts and clears them after completion', () => {
    const draft = draftWithLines();
    draft.lines = [
      { id: 'one', kind: 'ingredient', targetId: 'ing-1', quantity: '', unit: 'kg', additiveUse: 'unknown' },
      { id: 'two', kind: 'formulation', targetId: 'f-2', quantity: '5', unit: 'g' },
      { id: 'three', kind: 'ingredient', targetId: 'ing-2', quantity: '', unit: 'g' },
    ];
    const saved = buildFormulationRecord(draft, undefined, makeId, now);
    expect(saved.supplierComposition).toBeUndefined();
    expect(saved.incompleteRecipeLines).toEqual({
      unquantifiedLines: [
        { id: 'one', kind: 'ingredient', ingredientId: 'ing-1', unit: 'kg', additiveUse: 'unknown' },
        { id: 'three', kind: 'ingredient', ingredientId: 'ing-2' },
      ],
      lineOrder: ['one', 'two', 'three'],
    });
    const edit = draftFromFormulation(saved);
    expect(edit.lines).toEqual(draft.lines);
    const profile = processProfileForFinalMass(saved, '500', 'g', makeId);
    expect(profile).toMatchObject({ complete: false, changes: [], declaredFinalMass: { value: '500', unit: 'g' } });
    expect(processModeFromProfile(profile)).toBe('measured');
    expect(calculateProcessMassBalance({ value: '1', unit: 'g' }, profile))
      .toMatchObject({ status: 'review_required', reason: 'PROCESS_MASS_PROFILE_INCOMPLETE' });
    edit.lines[0]!.quantity = '1';
    edit.lines[2]!.quantity = '10';
    const completed = buildFormulationRecord(edit, saved, makeId, now);
    expect(completed.incompleteRecipeLines).toBeUndefined();
    expect(processProfileForFinalMass(completed, '500', 'g', makeId).complete).toBeUndefined();
  });
  it('round-trips per-use additive details for quantified and unknown component amounts', () => {
    const draft = draftWithLines();
    draft.compositionCoverage = 'partial';
    draft.lines = [
      { id: 'one', kind: 'ingredient', targetId: 'ing-1', quantity: '5', unit: 'g', additiveUse: 'processingAid' },
      { id: 'two', kind: 'ingredient', targetId: 'ing-1', quantity: '', unit: 'g', additiveUse: 'unknown' },
    ];
    const record = buildFormulationRecord(draft, undefined, makeId, now);
    expect(record.lines[0]).toMatchObject({ additiveUse: 'processingAid' });
    expect(record.supplierComposition?.unquantifiedComponents[0]).toMatchObject({ additiveUse: 'unknown' });
    const edit = draftFromFormulation(record);
    expect(edit.lines.map((line) => line.additiveUse)).toEqual(['processingAid', 'unknown']);
    expect(buildFormulationRecord(edit, record, makeId, now)).toEqual(record);
  });
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
    for (const [targetId, quantity] of [['', '5'], ['a', '0'], ['a', 'abc']]) {
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
      unquantifiedComponents: [{ id: 'l2', kind: 'formulation', formulationId: 'f-2', unit: 'kg' }],
      lineOrder: ['l1', 'l2'],
    });
    expect(lineShares(draft)).toEqual([undefined, undefined]);
    expect(buildFormulationRecord(draftFromFormulation(record), record, makeId, now)).toEqual(record);
    const edit = draftFromFormulation(record);
    edit.compositionCoverage = 'complete';
    expect(buildFormulationRecord(edit, record, makeId, now).supplierComposition?.unquantifiedComponents).toHaveLength(1);
    expect(lineShares(edit)).toEqual([undefined, undefined]);
    edit.lines[1]!.quantity = '10';
    expect(buildFormulationRecord(edit, record, makeId, now).supplierComposition?.unquantifiedComponents).toEqual([]);
    edit.compositionCoverage = '';
    expect(() => buildFormulationRecord(edit, record, makeId, now)).toThrow(/cannot be removed/);
  });

  it('preserves optional composition source details independently and validates dates', () => {
    const draft = emptyFormulationDraft();
    draft.name = 'Unknown blend';
    draft.compositionCoverage = 'partial';
    expect(buildFormulationRecord(draft, undefined, makeId, now).supplierComposition?.specification).toBeUndefined();
    draft.compositionReference = 'SPEC';
    expect(buildFormulationRecord(draft, undefined, makeId, now).supplierComposition?.specification)
      .toEqual({ reference: 'SPEC', sourceDate: '' });
    draft.compositionReference = '';
    draft.compositionDate = '2026-01-01';
    expect(buildFormulationRecord(draft, undefined, makeId, now).supplierComposition?.specification)
      .toEqual({ reference: '', sourceDate: '2026-01-01' });
    draft.compositionDate = '2026-02-30';
    expect(() => buildFormulationRecord(draft, undefined, makeId, now)).toThrow(/valid composition source date/);
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
    const draft = draftWithLines();
    draft.lines[0]!.quantity = '0.000001';
    expect(lineShares(draft)[0]).toBe('<0.1%');
  });

  describe('final batch weight', () => {
    const record = buildFormulationRecord(draftWithLines(), undefined, makeId, now);
    it('records loss, gain and unchanged weights against the full batch', () => {
      expect(processProfileForFinalMass(record, '0.8', 'kg', makeId)).toMatchObject({
        changes: [{ kind: 'loss', mass: { value: '200', unit: 'g' } }],
        declaredFinalMass: { value: '0.8', unit: 'kg' },
      });

      expect(processProfileForFinalMass(record, '1200', 'g', makeId).changes[0]).toMatchObject({
        kind: 'gain', mass: { value: '200', unit: 'g' },
      });
      expect(processProfileForFinalMass(record, '1', 'kg', makeId).changes).toEqual([]);
    });

    describe('individual processing changes', () => {
        const record = buildFormulationRecord(draftWithLines(), undefined, makeId, now);
        const changes = [
          { id: 'loss', kind: 'loss' as const, quantity: '0.2', unit: 'kg' as const, description: 'Baking', material: 'water' as const },
          { id: 'gain', kind: 'gain' as const, quantity: '100', unit: 'g' as const, description: '', material: '' as const },
        ];

        it('records ordered changes, including their descriptions and optional measured final weight', () => {
          const profile = processProfileForChanges(record, changes, true, '900', 'g');
          expect(profile).toMatchObject({
            complete: true, entryMethod: 'changes', declaredFinalMass: { value: '900', unit: 'g' },
            changes: [
              { id: 'loss', kind: 'loss', mass: { value: '0.2', unit: 'kg' }, description: 'Baking', material: 'water' },
              { id: 'gain', kind: 'gain', mass: { value: '100', unit: 'g' } },
            ],
          });
          expect(processChangeDrafts(profile)).toEqual(changes);
        });

        it('preserves unknown amounts and incomplete information instead of treating them as zero', () => {
          const unknown = [{ ...changes[0]!, quantity: '' }];
          const profile = processProfileForChanges(record, unknown, false, '800', 'g');
          expect(profile.changes[0]).not.toHaveProperty('mass');
          expect(profile.complete).toBe(false);
          expect(processChangeDrafts(profile)[0]?.quantity).toBe('');
          expect(() => processProfileForChanges(record, unknown, true, '', 'g')).toThrow(/every change amount/);
        });

        it('rejects invalid complete balances and does not infer a process from equal final weight', () => {
          expect(() => processProfileForChanges(record, changes, true, '800', 'g')).toThrow(/does not match/);
          expect(() => processProfileForChanges(record, [{ ...changes[0]!, quantity: '2' }], true, '', 'g'))
            .toThrow(/exceeds/);
          expect(() => processProfileForChanges(record, [{ ...changes[0]!, quantity: '0' }], false, '', 'g'))
            .toThrow(/positive/);
          expect(processEffectsNeedReview(processProfileForFinalMass(record, '1000', 'g', makeId))).toBe(true);
          expect(processEffectsNeedReview({ changes: [] })).toBe(false);
        });

        it('keeps older or incomplete profiles that cannot safely be represented as a simple final weight', () => {
          expect(processModeFromProfile({
            changes: [{ id: 'loss', kind: 'loss' }], complete: false,
            declaredFinalMass: { value: '800', unit: 'g' },
          })).toBe('existing');
          expect(processModeFromProfile({
            changes: [{ id: 'loss', kind: 'loss', mass: { value: '200', unit: 'g' }, description: 'Baking' }],
            declaredFinalMass: { value: '800', unit: 'g' },
          })).toBe('existing');
          expect(() => processChangeDrafts({
            changes: [{ id: 'addition', kind: 'addition', mass: { value: '50', unit: 'g' } }],
          })).toThrow(/Ingredient additions/);
        });
    });
    it('rejects invalid weights and incomplete compositions', () => {
      for (const value of ['', '0', '-1', 'bad']) {
        expect(() => processProfileForFinalMass(record, value, 'g', makeId)).toThrow(/positive/);
      }
      expect(processProfileForFinalMass({
        ...record, supplierComposition: { coverage: 'partial', unquantifiedComponents: [] },
      }, '1', 'kg', makeId)).toMatchObject({ complete: false, entryMethod: 'finalMass' });
    });
  });

  it('leaves shares blank when a quantity is not a number', () => {
    const draft = draftWithLines();
    draft.lines[0]!.quantity = '';
    expect(lineShares(draft)[0]).toBeUndefined();
    draft.lines[0]!.quantity = '9'.repeat(400);
    expect(lineShares(draft).every((share) => share === undefined)).toBe(true);
  });

  it('reports progress in plain words', () => {
    expect(formulationStepStatuses(draftWithLines()).lines.text).toBe('2 of 2 complete');
    expect(formulationStepStatuses(emptyFormulationDraft()).lines.text).toBe('None added');
  });
});
