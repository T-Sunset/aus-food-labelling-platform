# ADR-007: Draft label readiness and ingredient coverage

- Status: Accepted 2026-11-11
- Plan: Usability turn U7
- Requirements: DATA-003, CALC-001, TRACE-008, TRACE-012

## Context

The user chose to enable draft export only after essential builder information
has been entered. An empty list of allergens or additives previously did not
distinguish "confirmed absent" from "not recorded". Product type "Something
else" and the serving-size unit were not persisted.

## Decision

Store the selected product type and the serving-size unit. For each ingredient,
store separate explicit allergen and additive coverage confirmations, tied to
the supplier specification reference and date. A changed specification
invalidates those confirmations until the person confirms them again. Existing
records without confirmations remain incomplete; no missing facts are
automatically treated as absent.

Calculate readiness from the current product, recipes and ingredient records,
not from a stored completion flag. The gate covers product type and questions,
food state and pack information, ingredient specification and nutrition values,
explicit coverage confirmations, and applicable additive and entered-claim
information. A draft can still require consultant judgment; readiness is not a
legal or regulatory conclusion. Layout overflow also blocks export.

Use the existing ingoing ordering and allergen propagation functions with the
draft vocabulary. Retain compound ingredient structure; additive wording is
identified as a candidate to check, and final-food allergen conditions are
explicitly marked for review. The draft PDF names the unreviewed rule data and
states that nutrition and other content are not yet assembled.

## Consequences

Worked examples and older records may need new information before export.
The current fixed-size layout cannot export content that overflows. NIP
generation remains U8; the consultant-notes work remains U9. Neither the
readiness gate nor the draft is a substitute for review or a certification of
compliance.
