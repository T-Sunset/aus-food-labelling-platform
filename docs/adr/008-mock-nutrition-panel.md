# ADR 008: Bounded mock nutrition panel

Status: accepted for U8 engineering preview; not regulatory approval.

## Context

CALC-001, CALC-004, CALC-010, CALC-011, CALC-012, CALC-013 and CALC-015
require an explainable, evidence-backed nutrition panel without counting a
compound ingredient and its children twice or treating unknown data as zero.
The existing nutrient aggregation calculates ingoing mass, not necessarily
the food as sold. The Schedule 11 energy calculator requires a complete,
explicitly mapped set of energy components, which the ingredient builder
does not collect.

## Decision

- Accept supplier energy in kJ per 100 g with a dated source, and calculate
  weighted supplier energy alongside the existing nutrient aggregation. Do
  not derive it from an incomplete list of energy components.
- Use the supplier profile of a compound ingredient when it appears as an
  ingredient. Do not also add its component profiles to the nutrition sum.
  Nested formulations are expanded by the existing engine.
- Present values only when the user confirms that the recipe amounts,
  ingredient values and, where entered, density describe the food as sold
  without mass or nutrient changes. Bind that confirmation to the expanded
  recipe so a recipe edit requires a new confirmation.
- Select 100 g or 100 mL from an explicit solid/liquid answer, not from a
  serving or package unit. A conflicting confirmed claim-form answer blocks
  calculation. Volume conversions require a positive final-food density
  with dated evidence.
- Calculate both columns from unrounded quantities, then apply the NPC
  half-even display conventions recorded in the research. Optional
  less-than declarations and the legally unresolved rounding stage are not
  implemented or represented as approved.
- Leave unsupported bases and missing inputs unavailable. Regulated or
  unclassified claims block export because claim-driven rows have not been
  implemented. Non-Code-regulated claims remain omitted with a warning.
- Render a semantic HTML table and a three-column SVG/PDF table with
  column-width and height preflight. Physical proof and minimum type size
  remain review items.

## Consequences

The base panel is a draft estimate, not legal advice or a compliance result.
Prepared, reconstituted, drained and processed nutrition, claim-driven rows,
exemptions, optional less-than declarations, and a complete nutrition trace
remain open requirements, not silently completed by U8. Ingredient evidence,
the sold-food confirmation and any density are user-provided; consultant
review of their suitability remains necessary.
