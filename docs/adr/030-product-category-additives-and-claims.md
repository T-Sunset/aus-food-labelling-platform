# ADR 030: Product category, additive and claim guidance

Status: **Implemented, 2026-11-18**.
Requirements: ADD-009, NAME-001, CLAIM-006, DATA-003, TRACE-008.

## Context

The existing specialist questions and technical check results were prominent
even for ordinary foods. Users need to understand what is recorded and what
the application cannot check, without losing previously entered information or
turning a product description into a regulatory determination.

## Decision

- Offer the existing general-food route first, with examples and an explicit
  statement that product-specific requirements may still need review. The
  specialised questionnaires appear only when their respective route is chosen.
  Keep the existing saved type values and all classification answers; changing
  routes does not confirm a legal category or erase earlier answers.
- Show additives recorded in the saved recipe, including compound ingredients,
  before the optional advanced additive and prescribed-name checks. Explain
  that the list may be incomplete, that it does not establish permission, and
  that label wording is chosen in Labels. Existing confirmations, inputs,
  results and the opt-in additive illustrative preview remain accessible in the
  advanced section. The preview does not change official results.
- Explain claims with examples and show the entry fields before facts relevant
  to nutrition content claims. Keep claim text, existing inputs and official
  results. Technical details remain expandable, and unsaved changes are
  distinguished from saved results. Remove the Claims illustrative control and
  hypothetical results, including when the additive preview is enabled.

## Consequences

General foods do not acquire a more specific saved category or an automatic
prescribed-name or additive-permission determination. The available specialist
checks remain draft and incomplete; unknown information is not treated as
absence. Claim checks remain review-only where required, and claims are not
yet added to the label. This change does not approve any rules or certify a
label.

## 2026-11-19 owner direction

[ADR 034](./034-practical-workflow-progressive-disclosure.md) supersedes the
Product-level placement of claim statements. The intended model stores
claims per Label draft and evaluates them against the associated Product
facts. Product/category additive and prescribed-name checks remain in Product
Review; label-specific additive wording remains in Labels. Existing claim
entries must be handled explicitly during implementation.

## 2026-11-23 UXS1 owner decision

The Product Additives and Names section and its navigation will be removed.
Existing facts and supported checks remain; unresolved technical findings
belong in separate review/report, with concise notices for applicable active
checks. Label-specific additive wording remains on Label. See
[ADR 034](./034-practical-workflow-progressive-disclosure.md#2026-11-23-uxs1-owner-decision).
UXS5 implements this presentation change; no rule is approved.

## 2026-11-23 UXS5 implementation

The Product section and navigation are removed. Saved specialist inputs are
preserved but are not editable in the Product interface. Technical review
shows the existing draft results, source details, limitations and opt-in
illustrative preview; unresolved findings link to that review. The
provisional caffeine check has a concise notice with expandable details.
Separate review reports and per-Label additive wording remain available.
