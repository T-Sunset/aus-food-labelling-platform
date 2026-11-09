import type { FormulationReferenceGraph } from '@aus-food/domain';

export function findCircularReferencePath(
  graph: FormulationReferenceGraph,
): readonly string[] | undefined {
  const visited = new Set<string>();
  const activePath: string[] = [];
  const activePathIndexes = new Map<string, number>();

  function visit(formulationId: string): readonly string[] | undefined {
    visited.add(formulationId);
    activePathIndexes.set(formulationId, activePath.length);
    activePath.push(formulationId);

    for (const referencedId of graph.get(formulationId) ?? []) {
      if (!graph.has(referencedId)) {
        continue;
      }

      const cycleStart = activePathIndexes.get(referencedId);
      if (cycleStart !== undefined) {
        return [...activePath.slice(cycleStart), referencedId];
      }

      if (!visited.has(referencedId)) {
        const cycle = visit(referencedId);
        if (cycle !== undefined) {
          return cycle;
        }
      }
    }

    activePath.pop();
    activePathIndexes.delete(formulationId);
    return undefined;
  }

  for (const formulationId of graph.keys()) {
    if (visited.has(formulationId)) {
      continue;
    }

    const cycle = visit(formulationId);
    if (cycle !== undefined) {
      return cycle;
    }
  }

  return undefined;
}
