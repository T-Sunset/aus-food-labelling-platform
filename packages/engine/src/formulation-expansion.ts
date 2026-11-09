import type {
  ExpandedIngredient,
  Formulation,
  MassQuantity,
} from '@aus-food/domain';
import { divideDecimals, isNegativeDecimal, multiplyDecimals, normalizeDecimal, sumDecimals } from './decimal.js';
import { findCircularReferencePath } from './formulation-graph.js';
import { convertMass } from './mass.js';

type ExpansionErrorCode =
  | 'DUPLICATE_FORMULATION_ID'
  | 'FORMULATION_NOT_FOUND'
  | 'CIRCULAR_REFERENCE'
  | 'EMPTY_FORMULATION'
  | 'INVALID_INGREDIENT_QUANTITY'
  | 'INVALID_TARGET_MASS';

export class FormulationExpansionError extends Error {
  constructor(
    readonly code: ExpansionErrorCode,
    message: string,
    readonly referencePath: readonly string[],
  ) {
    super(message);
    this.name = 'FormulationExpansionError';
  }
}

function positiveMassInGrams(quantity: MassQuantity, path: readonly string[]): string {
  const value = normalizeDecimal(quantity.value);
  if (isNegativeDecimal(value) || value === '0') {
    throw new FormulationExpansionError(
      'INVALID_INGREDIENT_QUANTITY',
      'Formulation line quantities must be greater than zero.',
      path,
    );
  }

  return convertMass({ value, unit: quantity.unit }, 'g').value;
}

function reachableFormulations(
  rootId: string,
  formulations: ReadonlyMap<string, Formulation>,
): Map<string, readonly string[]> {
  const graph = new Map<string, readonly string[]>();
  const pending: { readonly id: string; readonly path: readonly string[] }[] = [
    { id: rootId, path: [rootId] },
  ];

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined || graph.has(current.id)) {
      continue;
    }

    const formulation = formulations.get(current.id);
    if (formulation === undefined) {
      throw new FormulationExpansionError(
        'FORMULATION_NOT_FOUND',
        `Formulation "${current.id}" was not found.`,
        current.path,
      );
    }

    const nestedIds: string[] = [];
    for (const line of formulation.lines) {
      if (line.kind !== 'formulation') {
        continue;
      }

      nestedIds.push(line.formulationId);
      pending.push({
        id: line.formulationId,
        path: [...current.path, line.id, line.formulationId],
      });
    }

    graph.set(current.id, nestedIds);
  }

  return graph;
}

export function expandFormulation(
  rootFormulationId: string,
  targetMass: MassQuantity,
  formulationRecords: readonly Formulation[],
): readonly ExpandedIngredient[] {
  const formulations = new Map<string, Formulation>();
  for (const formulation of formulationRecords) {
    if (formulations.has(formulation.id)) {
      throw new FormulationExpansionError(
        'DUPLICATE_FORMULATION_ID',
        `Duplicate formulation identifier "${formulation.id}".`,
        [formulation.id],
      );
    }
    formulations.set(formulation.id, formulation);
  }

  const graph = reachableFormulations(rootFormulationId, formulations);
  const cycle = findCircularReferencePath(graph);
  if (cycle !== undefined) {
    throw new FormulationExpansionError(
      'CIRCULAR_REFERENCE',
      `Circular formulation reference: ${cycle.join(' -> ')}.`,
      cycle,
    );
  }

  const normalizedTargetMass = normalizeDecimal(targetMass.value);
  if (isNegativeDecimal(normalizedTargetMass) || normalizedTargetMass === '0') {
    throw new FormulationExpansionError(
      'INVALID_TARGET_MASS',
      'Target mass must be greater than zero.',
      [rootFormulationId],
    );
  }
  const rootMassInGrams = normalizeDecimal(convertMass({
    value: normalizedTargetMass,
    unit: targetMass.unit,
  }, 'g').value);

  const expanded: ExpandedIngredient[] = [];

  function expand(
    formulationId: string,
    requestedMassInGrams: string,
    sourcePath: readonly string[],
  ): void {
    const formulation = formulations.get(formulationId);
    if (formulation === undefined) {
      throw new FormulationExpansionError(
        'FORMULATION_NOT_FOUND',
        `Formulation "${formulationId}" was not found.`,
        [...sourcePath, formulationId],
      );
    }
    if (formulation.lines.length === 0) {
      throw new FormulationExpansionError(
        'EMPTY_FORMULATION',
        `Formulation "${formulationId}" has no ingredient lines.`,
        sourcePath,
      );
    }

    const weightedLines = formulation.lines.map((line) => ({
      line,
      lineMass: positiveMassInGrams(line.quantity, [...sourcePath, line.id]),
    }));
    const batchMassInGrams = sumDecimals(weightedLines.map(({ lineMass }) => lineMass));
    const requestedMass = normalizeDecimal(requestedMassInGrams);

    for (const { line, lineMass } of weightedLines) {
      const allocatedMass = divideDecimals(
        multiplyDecimals(requestedMass, lineMass),
        batchMassInGrams,
      );

      if (line.kind === 'ingredient') {
        expanded.push({
          ingredientId: line.ingredientId,
          mass: { value: allocatedMass, unit: 'g' },
          sourcePath: [...sourcePath, line.id, line.ingredientId],
        });
      } else {
        expand(line.formulationId, allocatedMass, [
          ...sourcePath,
          line.id,
          line.formulationId,
        ]);
      }
    }
  }

  expand(rootFormulationId, rootMassInGrams, [rootFormulationId]);
  return expanded;
}
