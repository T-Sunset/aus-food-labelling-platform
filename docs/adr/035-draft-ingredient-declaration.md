# ADR 035: Draft ingredient declaration

Status: **Implemented, 2026-11-20**.
Requirements: TR-003, ADD-009, FORM-005, TRACE-008.

## Context

UXR21 needs a readable, traceable ingredient-list candidate without treating
unknown composition, naming choices or additive wording as settled. The
bounded source review recorded for [UXR20](../label-content-gap-audit.md)
checked Standard 1.2.4 (SRC-005) and Schedule 10 (SRC-017); their recorded
compilation dates are 2025-09-02 and 2021-02-25. Recheck current source text
before activating a legal determination.

## Decision

- Order known ingredients using recursively expanded ingoing recipe amounts.
  Child component amounts are scaled to the mass of their compound ingredient;
  repeated component identities are combined before ordering a flattened list.
- Keep the nested compound display and bracket convention for general-food
  drafts. When the user selects the infant-food route, show components
  individually rather than using the compound-name form. This selection guides
  the draft but does not confirm legal product classification. Withhold the
  infant-food declaration if any compound composition is unconfirmed or
  unavailable.
- Use the ingredient's saved name as a candidate. Do not automatically choose
  a permitted name or Schedule 10 generic name; the specific ingredient and
  applicable naming conditions remain for review.
- Withhold the complete declaration when an ingredient name or required
  compound recipe is missing and link the issue to the ingredient editor.
  Incomplete recipes, unknown amounts, processing that may affect order and
  unresolved additive wording remain explicit review items.
- Keep additive wording as a candidate. Neither a saved choice nor its
  appearance in the draft establishes additive identity, permission, class,
  processing-aid status or applicability.
- Every generated list remains an incomplete review-copy candidate, not an
  approved or legally compliant label.

## Consequences

This step does not implement below-5% omissions, water/volatile exceptions,
name selection, additive permissions or product-specific legal
classification. It does not change ingredient records or require ordinary
user-entered facts to have source references. Source mappings and reviewer
gates remain separate from this draft renderer.
