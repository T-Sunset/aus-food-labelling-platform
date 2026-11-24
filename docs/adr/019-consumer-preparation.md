# ADR 019: Consumer preparation nutrition

Status: **Accepted for N7, 2026-11-17**.
Requirements: CALC-002, CALC-011, CALC-014, CALC-015, DATA-003, DATA-006.

## Australian source boundary

The bounded primary-source research in [food-state nutrition research](../food-state-nutrition-research.md)
records the conditional requirements for water reconstitution and the
permitted or required combined-food column under Standard 1.2.8, alongside
food-for-infants exceptions and unresolved overlaps. The preparation type
selected here does not itself determine whether a legal provision applies.
No new legal rule, threshold or source verification is introduced by N7.
The results remain drafts requiring review, not certification.

## Decision

- Record optional consumer directions, one added food or liquid, the product
  and addition amounts, and an independent prepared serving where known.
  The existing recipe and its selected as-sold nutrition method supply the
  product's starting values; users do not enter a second recipe.
- Support a weighted mixture only when the user confirms that the recorded
  amounts match the directions and mixing causes no other weight or nutrient
  changes. Reconstitution and preparation with another food are identified
  separately. When the already selected food state is reconstituted, derive
  that preparation type instead of asking the same question again.
- Calculate each supported base nutrient per 100 g from the two evidenced
  amounts, and per prepared serving when its mass is known. Convert volume
  only with the appropriate dated, sourced density; the finished mixture
  needs its own density for a volume-based prepared serving. Water is not
  assumed to have zero nutrients.
- Keep missing, incompatible or conflicting evidence explicit for review.
  Directions, amounts, added-food evidence, applicable product density and
  relevant recipe evidence are tied to the mixing confirmation; changes
  require confirmation again. Disabling preparation preserves saved details.
- Show the basis, directions, quantities, nutrient evidence and results in
  review and trace. The prepared results are not label columns yet. Avoid
  presenting an as-sold panel as a supported reconstituted panel; applicable
  label columns and their legal conditions remain N11 work.

## Outside this decision

Multiple additions, draining within this mixing calculation, cooking or other
nutrient/weight changes during consumer preparation, and component-derived
nutrition for an added compound food remain review cases. Direct drained-food
evidence is handled separately in [ADR 020](./020-drained-food-nutrition.md).
Prepared values for expanded nutrients, per-100 mL
prepared output, and automatic interpretation of directions or legal
applicability are not implemented. Evidence suitability and overlapping
food-state provisions remain subject to review.
