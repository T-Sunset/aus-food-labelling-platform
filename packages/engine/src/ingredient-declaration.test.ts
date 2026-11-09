import { describe, expect, it } from 'vitest';
import type { IngredientDeclarationNode } from '@aus-food/domain';
import { orderIngredientDeclaration } from './ingredient-declaration.js';

const sugar: IngredientDeclarationNode = {
  ingredientId: 'sugar',
  displayName: 'sugar',
  nameSourceId: 'user-selected-name:sugar',
  mass: { value: '10', unit: 'g' },
  sourcePath: ['product', 'sugar-line', 'sugar'],
  kind: 'atomic',
  compositionStatus: 'not_applicable',
  children: [],
};

const flour: IngredientDeclarationNode = {
  ingredientId: 'flour',
  displayName: 'wheat flour',
  nameSourceId: 'supplier-name:flour',
  mass: { value: '100', unit: 'g' },
  sourcePath: ['product', 'flour-line', 'flour'],
  kind: 'atomic',
  compositionStatus: 'not_applicable',
  children: [],
};

describe('ingredient declaration ordering', () => {
  it('orders ingredients by ingoing mass and retains names and paths', () => {
    expect(orderIngredientDeclaration([sugar, flour])).toEqual({
      status: 'ordered',
      basis: 'ingoing',
      ingredients: [flour, sugar],
    });
  });

  it('orders nested compound ingredients without flattening their declaration structure', () => {
    const compound: IngredientDeclarationNode = {
      ingredientId: 'filling',
      displayName: 'fruit filling',
      nameSourceId: 'user-selected-name:filling',
      mass: { value: '50', unit: 'g' },
      sourcePath: ['product', 'filling-line', 'filling'],
      kind: 'compound',
      compositionStatus: 'complete',
      children: [
        {
          ...sugar,
          mass: { value: '5', unit: 'g' },
          sourcePath: ['product', 'filling-line', 'filling', 'sugar-line', 'sugar'],
        },
        {
          ...flour,
          mass: { value: '45', unit: 'g' },
          sourcePath: ['product', 'filling-line', 'filling', 'fruit-line', 'fruit'],
        },
      ],
    };

    expect(orderIngredientDeclaration([compound])).toEqual({
      status: 'ordered',
      basis: 'ingoing',
      ingredients: [
        {
          ...compound,
          children: [compound.children[1], compound.children[0]],
        },
      ],
    });
  });

  it('retains the ordered tree but requests review when a compound declaration is incomplete', () => {
    const incompleteCompound: IngredientDeclarationNode = {
      ingredientId: 'unknown-mixture',
      displayName: 'unknown mixture',
      nameSourceId: 'supplier-name:mixture',
      mass: { value: '20', unit: 'g' },
      sourcePath: ['product', 'mixture-line', 'unknown-mixture'],
      kind: 'compound',
      compositionStatus: 'review_required',
      children: [],
    };

    expect(orderIngredientDeclaration([incompleteCompound])).toEqual({
      status: 'review_required',
      basis: 'ingoing',
      ingredients: [incompleteCompound],
      unresolvedPaths: [incompleteCompound.sourcePath],
    });
  });

  it('requests review when a display name lacks source provenance', () => {
    const result = orderIngredientDeclaration([{ ...sugar, nameSourceId: '' }]);
    expect(result).toMatchObject({
      status: 'review_required',
      unresolvedPaths: [sugar.sourcePath],
    });
  });

  it('rejects an empty declaration and invalid negative mass', () => {
    expect(() => orderIngredientDeclaration([])).toThrow(RangeError);
    expect(() => orderIngredientDeclaration([
      { ...sugar, mass: { value: '-1', unit: 'g' } },
    ])).toThrow(RangeError);
  });
});
