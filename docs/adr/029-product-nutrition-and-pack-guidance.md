# ADR 029: Product nutrition and pack guidance

Status: **Implemented, 2026-11-18**.
Requirements: CALC-010, CALC-014, DATA-003, DATA-006, TRACE-008.

## Context

Ingredient nutrition, the selected recipe nutrition, the product as sold
and food prepared by the customer describe different things. The Product
editor should explain these distinctions without replacing existing
food-state calculations or their safeguards.

## Decision

- Explain that the advanced food-state choice is a product nutrition
  calculation basis, not the state of ingredient data. Customer directions
  also affect the resulting panel; the choice does not decide the legally
  required basis. Keep the existing options and preparation and draining
  inputs, including unsupported or conflicting cases.
- Summarise the saved recipe's nutrition inputs before showing individual
  values and source paths in an optional expander. Identify them as saved
  inputs, not a finished panel, and flag unsaved Product changes.
- Offer serving size multiplied by servings per pack as an optional net
  contents suggestion only for the as-sold basis, positive valid quantities
  and a known compatible unit. Use decimal arithmetic. The user must apply
  it; it never replaces an entered quantity or converts between mass and
  volume. Explain that servings may be approximate, the figures must cover
  the whole pack as sold, and the result should be checked. Later changes
  do not silently update a previously entered net quantity.

## Consequences

No product or nutrition facts are inferred merely by opening the editor.
Prepared and drained serving sizes do not establish net pack contents.
The existing calculation, confirmation, food-state and export boundaries
remain in place; see [ADR 022](./022-nutrition-panel-integration.md).

## 2026-11-19 owner direction

[ADR 034](./034-practical-workflow-progressive-disclosure.md) directs a
clearer, shorter Product nutrition flow: begin with a plain-language question
about label-directed customer actions and reveal only relevant food-state
details. The existing distinctions and calculation safeguards remain, but
ordinary products should not face blanket processing or retention questions.
This changes presentation, not the legally required basis for any product.

## 2026-11-23 UXS4 implementation

The two Product sections for saved nutrition basis and saved-recipe nutrition
evidence are removed. Customer directions show only relevant preparation and
draining inputs in an aligned layout. Existing calculations and the technical
review retain their nutrition inputs and source paths. An older non-default or
missing food state has a contextual review control and is not changed
automatically; a missing state remains unknown when saved. A disabled action
conflicting with a recorded reconstituted or drained state remains unresolved.
The as-sold net-contents suggestion and its safeguards are unchanged.
