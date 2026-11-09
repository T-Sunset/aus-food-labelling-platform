import { describe, expect, it } from 'vitest';
import { findCircularReferencePath } from './formulation-graph.js';

describe('formulation references', () => {
  it('returns no path for an acyclic graph', () => {
    const graph = new Map([
      ['product', ['sauce']],
      ['sauce', ['spice-blend']],
      ['spice-blend', []],
    ]);

    expect(findCircularReferencePath(graph)).toBeUndefined();
  });

  it('returns the cycle path for a nested circular reference', () => {
    const graph = new Map([
      ['product', ['sauce']],
      ['sauce', ['spice-blend']],
      ['spice-blend', ['sauce']],
    ]);

    expect(findCircularReferencePath(graph)).toEqual(['sauce', 'spice-blend', 'sauce']);
  });

  it('checks disconnected components for cycles', () => {
    const graph = new Map([
      ['product', []],
      ['first', ['second']],
      ['second', ['first']],
    ]);

    expect(findCircularReferencePath(graph)).toEqual(['first', 'second', 'first']);
  });

  it('does not mistake an unresolved reference for a cycle', () => {
    const graph = new Map([['product', ['missing-formulation']]]);

    expect(findCircularReferencePath(graph)).toBeUndefined();
  });
});
