import { describe, expect, it } from 'vitest';
import { calculateProcessMassBalance, ProcessMassError } from './process-mass.js';

describe('process mass balance', () => {
  it('returns review required when process mass information is missing', () => {
    expect(calculateProcessMassBalance({ value: '1', unit: 'kg' })).toEqual({
      status: 'review_required',
      reason: 'PROCESS_MASS_PROFILE_MISSING',
      ingoingMass: { value: '1000', unit: 'g' },
    });
  });

  it('treats an explicitly recorded empty change list as no mass change', () => {
    expect(calculateProcessMassBalance(
      { value: '1', unit: 'kg' },
      { changes: [] },
    )).toEqual({
      status: 'calculated',
      ingoingMass: { value: '1000', unit: 'g' },
      finalMass: { value: '1000', unit: 'g' },
      yieldPercentage: '100',
      changes: [],
    });
  });

  it('applies documented additions, gains and losses in sequence', () => {
    expect(calculateProcessMassBalance(
      { value: '1', unit: 'kg' },
      {
        changes: [
          { id: 'water-added', kind: 'addition', mass: { value: '100', unit: 'g' } },
          { id: 'moisture-gain', kind: 'gain', mass: { value: '50', unit: 'g' } },
          { id: 'cook-loss', kind: 'loss', mass: { value: '250', unit: 'g' } },
        ],
        declaredFinalMass: { value: '0.9', unit: 'kg' },
      },
    )).toEqual({
      status: 'calculated',
      ingoingMass: { value: '1000', unit: 'g' },
      finalMass: { value: '900', unit: 'g' },
      yieldPercentage: '90',
      changes: [
        { id: 'water-added', kind: 'addition', mass: { value: '100', unit: 'g' } },
        { id: 'moisture-gain', kind: 'gain', mass: { value: '50', unit: 'g' } },
        { id: 'cook-loss', kind: 'loss', mass: { value: '250', unit: 'g' } },
      ],
    });
  });

  it('rejects a process loss greater than the mass currently available', () => {
    expect(() => calculateProcessMassBalance(
      { value: '1', unit: 'kg' },
      {
        changes: [{ id: 'cook-loss', kind: 'loss', mass: { value: '1001', unit: 'g' } }],
      },
    )).toThrowError(expect.objectContaining({ code: 'LOSS_EXCEEDS_AVAILABLE_MASS' }));
  });

  it('rejects a declared final mass inconsistent with documented changes', () => {
    expect(() => calculateProcessMassBalance(
      { value: '1', unit: 'kg' },
      {
        changes: [{ id: 'cook-loss', kind: 'loss', mass: { value: '100', unit: 'g' } }],
        declaredFinalMass: { value: '950', unit: 'g' },
      },
    )).toThrowError(expect.objectContaining({ code: 'DECLARED_FINAL_MASS_MISMATCH' }));
  });

  it('rejects zero ingoing mass and zero process changes', () => {
    expect(() => calculateProcessMassBalance(
      { value: '0', unit: 'g' },
      { changes: [] },
    )).toThrowError(ProcessMassError);

    expect(() => calculateProcessMassBalance(
      { value: '1', unit: 'kg' },
      {
        changes: [{ id: 'zero-loss', kind: 'loss', mass: { value: '0', unit: 'g' } }],
      },
    )).toThrowError(expect.objectContaining({ code: 'INVALID_PROCESS_CHANGE' }));
  });

  it('rejects a process that leaves no final mass', () => {
    expect(() => calculateProcessMassBalance(
      { value: '1', unit: 'kg' },
      {
        changes: [{ id: 'total-loss', kind: 'loss', mass: { value: '1', unit: 'kg' } }],
      },
    )).toThrowError(expect.objectContaining({ code: 'INVALID_FINAL_MASS' }));
  });
});
