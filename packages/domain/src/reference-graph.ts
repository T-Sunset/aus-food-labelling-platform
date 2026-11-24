import type { FormulationReferenceGraph } from './index.js';

export function findCircularReferencePath(
  graph: FormulationReferenceGraph,
): readonly string[] | undefined {
  const visited = new Set<string>();
  const activePath: string[] = [];
  const activePathIndexes = new Map<string, number>();

  function visit(id: string): readonly string[] | undefined {
    visited.add(id);
    activePathIndexes.set(id, activePath.length);
    activePath.push(id);
    for (const referencedId of graph.get(id) ?? []) {
      if (!graph.has(referencedId)) continue;
      const cycleStart = activePathIndexes.get(referencedId);
      if (cycleStart !== undefined) return [...activePath.slice(cycleStart), referencedId];
      if (!visited.has(referencedId)) {
        const cycle = visit(referencedId);
        if (cycle !== undefined) return cycle;
      }
    }
    activePath.pop();
    activePathIndexes.delete(id);
    return undefined;
  }

  for (const id of graph.keys()) {
    if (!visited.has(id)) {
      const cycle = visit(id);
      if (cycle !== undefined) return cycle;
    }
  }
  return undefined;
}
