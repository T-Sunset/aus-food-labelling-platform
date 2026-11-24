import { describe, expect, it } from 'vitest';
import type { Formulation } from '@aus-food/domain';
import { expandFormulation, FormulationExpansionError } from './formulation-expansion.js';

describe('formulation expansion', () => {
  it('requires review rather than rounding a non-zero ingredient allocation to zero', () => {
    const formulations: Formulation[] = [{
      id: 'root', lines: [
        { id: 'tiny', kind: 'ingredient', ingredientId: 'A', quantity: { value: '0.00000000000000000000000000000000000000000000000001', unit: 'g' } },
        { id: 'other', kind: 'ingredient', ingredientId: 'B', quantity: { value: '100', unit: 'g' } },
      ],
    }];
    expect(() => expandFormulation('root', { value: '100', unit: 'g' }, formulations))
      .toThrow(expect.objectContaining({ code: 'INSUFFICIENT_MASS_PRECISION', referencePath: ['root', 'tiny'] }));
  });
  it('rejects unknown recipe amounts on direct and nested paths and still detects cycles', () => {
    const incomplete: Formulation = {
      id: 'inner', lines: [{ id: 'known', kind: 'ingredient', ingredientId: 'flour', quantity: { value: '1', unit: 'g' } }],
      incompleteRecipeLines: {
        unquantifiedLines: [{ id: 'unknown', kind: 'ingredient', ingredientId: 'milk' }],
        lineOrder: ['unknown', 'known'],
      },
    };
    const outer: Formulation = {
      id: 'outer', lines: [{ id: 'nested', kind: 'formulation', formulationId: 'inner', quantity: { value: '1', unit: 'g' } }],
    };
    for (const id of ['inner', 'outer']) {
      expect(() => expandFormulation(id, { value: '100', unit: 'g' }, [outer, incomplete])).toThrow(/unknown amounts/);
    }
    const cycle: Formulation = {
      ...incomplete, incompleteRecipeLines: {
        unquantifiedLines: [{ id: 'unknown', kind: 'formulation', formulationId: 'outer' }],
        lineOrder: ['unknown', 'known'],
      },
    };
    expect(() => expandFormulation('outer', { value: '100', unit: 'g' }, [outer, cycle]))
      .toThrow(/Circular formulation reference/);
  });
  it('carries a distinct additive use along each nested source path', () => {
    const recipes: Formulation[] = [
      { id: 'outer', lines: [
        { id: 'direct', kind: 'ingredient', ingredientId: 'additive', quantity: { value: '1', unit: 'g' }, additiveUse: 'added' },
        { id: 'nested', kind: 'formulation', formulationId: 'inner', quantity: { value: '1', unit: 'g' } },
      ] },
      { id: 'inner', lines: [
        { id: 'aid', kind: 'ingredient', ingredientId: 'additive', quantity: { value: '1', unit: 'g' }, additiveUse: 'processingAid' },
      ] },
    ];
    expect(expandFormulation('outer', { value: '2', unit: 'g' }, recipes)).toMatchObject([
      { sourcePath: ['outer', 'direct', 'additive'], additiveUse: 'added' },
      { sourcePath: ['outer', 'nested', 'inner', 'aid', 'additive'], additiveUse: 'processingAid' },
    ]);
  });
  it('rejects partial supplier compositions at the root and on nested paths', () => {
    const partial: Formulation = {
      id: 'partial',
      lines: [{ id: 'known', kind: 'ingredient', ingredientId: 'water', quantity: { value: '99', unit: 'g' } }],
      supplierComposition: {
        coverage: 'partial', specification: { reference: 'SPEC', sourceDate: '2026-01-01' },
        unquantifiedComponents: [{ id: 'unknown', kind: 'ingredient', ingredientId: 'oil' }],
      },
    };
    const outer: Formulation = {
      id: 'outer',
      lines: [{ id: 'nested', kind: 'formulation', formulationId: 'partial', quantity: { value: '1', unit: 'g' } }],
    };
    for (const id of ['partial', 'outer']) {
      expect(() => expandFormulation(id, { value: '100', unit: 'g' }, [outer, partial]))
        .toThrow(/partial; its proportions cannot be calculated/);
    }
    const complete: Formulation = {
      ...partial, supplierComposition: { ...partial.supplierComposition!, coverage: 'complete', unquantifiedComponents: [] },
    };
    const completeWithUnknown = {
      ...partial, supplierComposition: { ...partial.supplierComposition!, coverage: 'complete' as const },
    };
    expect(() => expandFormulation('partial', { value: '100', unit: 'g' }, [completeWithUnknown]))
      .toThrow(/unknown amounts/);
    expect(expandFormulation('partial', { value: '100', unit: 'g' }, [complete])[0]?.mass.value).toBe('100');
  });
  it('expands direct ingredients to the requested batch mass', () => {
    const formulations: readonly Formulation[] = [
      {
        id: 'sauce',
        lines: [
          {
            id: 'tomato-line',
            kind: 'ingredient',
            ingredientId: 'tomato',
            quantity: { value: '600', unit: 'g' },
          },
          {
            id: 'salt-line',
            kind: 'ingredient',
            ingredientId: 'salt',
            quantity: { value: '10', unit: 'g' },
          },
        ],
      },
    ];

    expect(expandFormulation('sauce', { value: '1', unit: 'kg' }, formulations)).toEqual([
      {
        ingredientId: 'tomato',
        mass: { value: '983.606557377049180327868852459016393442623', unit: 'g' },
        sourcePath: ['sauce', 'tomato-line', 'tomato'],
      },
      {
        ingredientId: 'salt',
        mass: { value: '16.393442622950819672131147540983606557377', unit: 'g' },
        sourcePath: ['sauce', 'salt-line', 'salt'],
      },
    ]);
  });

  it('recursively expands nested formulations while retaining each source path', () => {
    const formulations: readonly Formulation[] = [
      {
        id: 'product',
        lines: [
          {
            id: 'filling-line',
            kind: 'formulation',
            formulationId: 'filling',
            quantity: { value: '40', unit: 'g' },
          },
          {
            id: 'pastry-line',
            kind: 'ingredient',
            ingredientId: 'pastry',
            quantity: { value: '60', unit: 'g' },
          },
        ],
      },
      {
        id: 'filling',
        lines: [
          {
            id: 'fruit-line',
            kind: 'ingredient',
            ingredientId: 'fruit',
            quantity: { value: '3', unit: 'kg' },
          },
          {
            id: 'sugar-line',
            kind: 'ingredient',
            ingredientId: 'sugar',
            quantity: { value: '1', unit: 'kg' },
          },
        ],
      },
    ];

    expect(expandFormulation('product', { value: '500', unit: 'g' }, formulations)).toEqual([
      {
        ingredientId: 'fruit',
        mass: { value: '150', unit: 'g' },
        sourcePath: ['product', 'filling-line', 'filling', 'fruit-line', 'fruit'],
      },
      {
        ingredientId: 'sugar',
        mass: { value: '50', unit: 'g' },
        sourcePath: ['product', 'filling-line', 'filling', 'sugar-line', 'sugar'],
      },
      {
        ingredientId: 'pastry',
        mass: { value: '300', unit: 'g' },
        sourcePath: ['product', 'pastry-line', 'pastry'],
      },
    ]);
  });

  it('rejects a reachable circular reference and returns its path', () => {
    const formulations: readonly Formulation[] = [
      {
        id: 'product',
        lines: [
          {
            id: 'filling-line',
            kind: 'formulation',
            formulationId: 'filling',
            quantity: { value: '1', unit: 'g' },
          },
        ],
      },
      {
        id: 'filling',
        lines: [
          {
            id: 'product-line',
            kind: 'formulation',
            formulationId: 'product',
            quantity: { value: '1', unit: 'g' },
          },
        ],
      },
    ];

    expect(() => expandFormulation('product', { value: '1', unit: 'g' }, formulations)).toThrowError(
      expect.objectContaining({
        code: 'CIRCULAR_REFERENCE',
        referencePath: ['product', 'filling', 'product'],
      }),
    );
  });

  it('rejects a missing nested formulation instead of silently omitting it', () => {
    const formulations: readonly Formulation[] = [
      {
        id: 'product',
        lines: [
          {
            id: 'missing-line',
            kind: 'formulation',
            formulationId: 'missing',
            quantity: { value: '1', unit: 'g' },
          },
        ],
      },
    ];

    expect(() => expandFormulation('product', { value: '1', unit: 'g' }, formulations)).toThrowError(
      expect.objectContaining({ code: 'FORMULATION_NOT_FOUND' }),
    );
  });

  it('rejects empty formulations and zero or negative line quantities', () => {
    expect(() => expandFormulation('empty', { value: '1', unit: 'g' }, [{ id: 'empty', lines: [] }]))
      .toThrowError(expect.objectContaining({ code: 'EMPTY_FORMULATION' }));

    const zeroQuantity: readonly Formulation[] = [
      {
        id: 'zero',
        lines: [
          {
            id: 'line',
            kind: 'ingredient',
            ingredientId: 'ingredient',
            quantity: { value: '0', unit: 'g' },
          },
        ],
      },
    ];
    expect(() => expandFormulation('zero', { value: '1', unit: 'g' }, zeroQuantity)).toThrowError(
      expect.objectContaining({ code: 'INVALID_INGREDIENT_QUANTITY' }),
    );

    expect(() =>
      expandFormulation(
        'zero',
        { value: '1', unit: 'g' },
        [
          {
            id: 'zero',
            lines: [
              {
                id: 'line',
                kind: 'ingredient',
                ingredientId: 'ingredient',
                quantity: { value: '-1', unit: 'g' },
              },
            ],
          },
        ],
      ),
    ).toThrowError(FormulationExpansionError);
  });

  it('rejects a non-positive target mass', () => {
    const formulations: readonly Formulation[] = [
      {
        id: 'simple',
        lines: [
          {
            id: 'line',
            kind: 'ingredient',
            ingredientId: 'ingredient',
            quantity: { value: '1', unit: 'g' },
          },
        ],
      },
    ];

    expect(() => expandFormulation('simple', { value: '0', unit: 'g' }, formulations)).toThrowError(
      expect.objectContaining({ code: 'INVALID_TARGET_MASS' }),
    );
  });
});
