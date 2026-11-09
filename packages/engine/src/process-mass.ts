import type {
  MassQuantity,
  ProcessMassBalance,
  ProcessMassProfile,
} from '@aus-food/domain';
import {
  addDecimals,
  divideDecimals,
  isNegativeDecimal,
  multiplyDecimals,
  normalizeDecimal,
  subtractDecimals,
} from './decimal.js';
import { convertMass } from './mass.js';

type ProcessMassErrorCode =
  | 'INVALID_INGOING_MASS'
  | 'INVALID_PROCESS_CHANGE'
  | 'LOSS_EXCEEDS_AVAILABLE_MASS'
  | 'INVALID_FINAL_MASS'
  | 'DECLARED_FINAL_MASS_MISMATCH';

export class ProcessMassError extends Error {
  constructor(readonly code: ProcessMassErrorCode, message: string) {
    super(message);
    this.name = 'ProcessMassError';
  }
}

function positiveMassInGrams(
  quantity: MassQuantity,
  code: ProcessMassErrorCode,
  message: string,
): string {
  const value = normalizeDecimal(quantity.value);
  if (isNegativeDecimal(value) || value === '0') {
    throw new ProcessMassError(code, message);
  }

  return normalizeDecimal(convertMass({ value, unit: quantity.unit }, 'g').value);
}

export function calculateProcessMassBalance(
  ingoingMass: MassQuantity,
  profile?: ProcessMassProfile,
): ProcessMassBalance {
  const ingoingMassInGrams = positiveMassInGrams(
    ingoingMass,
    'INVALID_INGOING_MASS',
    'Ingoing mass must be greater than zero.',
  );
  const normalizedIngoingMass = { value: ingoingMassInGrams, unit: 'g' as const };

  if (profile === undefined) {
    return {
      status: 'review_required',
      reason: 'PROCESS_MASS_PROFILE_MISSING',
      ingoingMass: normalizedIngoingMass,
    };
  }

  let finalMassInGrams = ingoingMassInGrams;
  for (const change of profile.changes) {
    const changeMassInGrams = positiveMassInGrams(
      change.mass,
      'INVALID_PROCESS_CHANGE',
      `Process mass change "${change.id}" must be greater than zero.`,
    );

    if (change.kind === 'loss') {
      const remainingMass = subtractDecimals(finalMassInGrams, changeMassInGrams);
      if (isNegativeDecimal(remainingMass)) {
        throw new ProcessMassError(
          'LOSS_EXCEEDS_AVAILABLE_MASS',
          `Process mass loss "${change.id}" exceeds the available mass.`,
        );
      }
      finalMassInGrams = remainingMass;
    } else {
      finalMassInGrams = addDecimals(finalMassInGrams, changeMassInGrams);
    }
  }

  if (profile.declaredFinalMass !== undefined) {
    const declaredFinalMassInGrams = positiveMassInGrams(
      profile.declaredFinalMass,
      'INVALID_FINAL_MASS',
      'Declared final mass must be greater than zero.',
    );
    if (declaredFinalMassInGrams !== finalMassInGrams) {
      throw new ProcessMassError(
        'DECLARED_FINAL_MASS_MISMATCH',
        'Declared final mass does not match the ingoing mass and documented process changes.',
      );
    }
  }

  if (finalMassInGrams === '0') {
    throw new ProcessMassError('INVALID_FINAL_MASS', 'Final mass must be greater than zero.');
  }

  return {
    status: 'calculated',
    ingoingMass: normalizedIngoingMass,
    finalMass: { value: finalMassInGrams, unit: 'g' },
    yieldPercentage: multiplyDecimals(
      divideDecimals(finalMassInGrams, ingoingMassInGrams),
      '100',
    ),
    changes: profile.changes,
  };
}
