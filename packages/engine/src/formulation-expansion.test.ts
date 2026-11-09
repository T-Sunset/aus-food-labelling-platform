import { describe, expect, it } from 'vitest';
import type { Formulation } from '@aus-food/domain';
import { expandFormulation, FormulationExpansionError } from './formulation-expansion.js';

describe('formulation expansion', () => {
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
