import type {
  IngredientDeclarationNode,
  IngredientDeclarationResult,
  OrderedIngredientDeclarationNode,
} from '@aus-food/domain';
import { compareDecimals } from './decimal.js';
import { convertMass } from './mass.js';

export function orderIngredientDeclaration(
  ingredients: readonly IngredientDeclarationNode[],
): IngredientDeclarationResult {
  if (ingredients.length === 0) {
    throw new RangeError('At least one ingredient is required for a declaration');
  }

  const unresolvedPaths: (readonly string[])[] = [];

  function orderLevel(
    nodes: readonly IngredientDeclarationNode[],
  ): OrderedIngredientDeclarationNode[] {
    const ordered = nodes.map((node) => {
      if (
        node.displayName.trim().length === 0
        || node.nameSourceId.trim().length === 0
        || node.sourcePath.length === 0
      ) {
        unresolvedPaths.push(node.sourcePath);
      }
      if (node.kind === 'atomic' && node.children.length > 0) {
        unresolvedPaths.push(node.sourcePath);
      }
      if (
        node.kind === 'compound'
        && (node.compositionStatus !== 'complete' || node.children.length === 0)
      ) {
        unresolvedPaths.push(node.sourcePath);
      } else if (node.compositionStatus === 'review_required') {
        unresolvedPaths.push(node.sourcePath);
      }

      const orderedNode: OrderedIngredientDeclarationNode = {
        ...node,
        children: orderLevel(node.children),
      };
      return {
        node: orderedNode,
        massInGrams: convertMass(node.mass, 'g').value,
      };
    });

    ordered.sort((left, right) => {
      return compareDecimals(right.massInGrams, left.massInGrams);
    });

    return ordered.map(({ node }) => node);
  }

  const orderedIngredients = orderLevel(ingredients);
  return unresolvedPaths.length > 0
    ? {
        status: 'review_required',
        basis: 'ingoing',
        ingredients: orderedIngredients,
        unresolvedPaths,
      }
    : {
        status: 'ordered',
        basis: 'ingoing',
        ingredients: orderedIngredients,
      };
}
