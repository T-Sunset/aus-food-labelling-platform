# ADR 012: Recording processing and batch weight

Status: **Accepted for the I7 draft workflow, 2026-11-17**.
Requirements: DATA-003, DATA-006, FORM-001 to FORM-003, CALC-003.

## Context

A finished weight alone does not say which ingredients, nutrients or additives
were lost or gained. People may also know some processing steps without
knowing every amount. Recipes and nested recipes use the same local
formulation records.

## Decision

- Retain the existing process mass profile and allow an optional ordered list
  of gains and losses, an optional description and material, and unknown
  amounts. Record whether the list is explicitly confirmed complete.
- An incomplete list or unknown amount is not zero and cannot produce a
  calculated mass balance. A confirmed complete list requires known positive
  amounts and complete recipe quantities. Validate the ordered mass balance
  and reconcile a measured final weight if supplied.
- Store whether the person entered a final weight or individual changes so
  edits do not silently replace detailed steps with a net change. Existing
  profiles without the new completeness field retain their prior meaning.
- A recorded final weight, including one equal to the starting weight, does
  not establish that processing had no compositional effect. The app keeps
  nutrition and additive concentrations under review and flags ingredient
  ordering until those effects are supported. The mass-balance preview alone
  is not a nutrition or compliance result.
- Display the starting batch weight derived from known recipe amounts, and
  preview yield when a valid measured final weight is entered. Do not show
  a starting weight or yield for a partial composition or missing amounts.
- Recipe lines remain the place for ingredients added to a batch; the
  processing controls do not create or infer ingredient additions.

## Consequences

Incomplete details can be edited and backed up without inventing a quantity.
Processing information remains attached to its formulation and shared
recipes are not silently changed. The current workflow does not calculate
nutrient retention, additive retention, water-specific declaration ordering,
or processing effects in nested formulations. Those need explicit inputs and
supported propagation before they can be used in label calculations.

N6's first turn separately permits recorded finished-recipe nutrition values;
it does not infer retention from this mass profile. See
[ADR 017](./017-finished-food-nutrition.md). Evidence-backed retention with
yield remains the second, outstanding N6 turn.
