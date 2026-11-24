# ADR 031: Product review and next actions

Status: **Implemented, 2026-11-18**.
Requirements: TRACE-004, TRACE-008, UX-007, DATA-003.

## Context

The Product review combined a short checklist, a long unlinked list of missing
items and an always-visible technical trace. Users need to understand their
saved product and find the appropriate editor without losing the detail needed
for review and historical traceability.

## Decision

- Summarise the saved Product, recipe, pack, recorded allergens, additives and
  claims. Offer the recorded ingredient list and draft nutrition values
  separately. Show allergens awaiting final-food assessment as well as
  candidate names; missing information does not establish absence.
- Group the existing draft missing items by area. Attach typed edit targets
  when the missing items are produced, rather than guessing destinations from
  their text. Preserve every existing missing message and combine edit targets
  when the same message refers to different records. If a target is missing,
  provide a route back to the product and recipe selection.
- Clearly distinguish saved information from unsaved edits. Product review
  uses ingredient-level additive wording defaults, not each saved label's
  choices; direct users to Labels for label-specific wording. Explain that
  unsupported checks and missing label content still need review, and that
  incomplete PDFs are review copies only.
- Keep the provisional caffeine result visible when applicable. Move the
  existing input traces, rule sources and immutable historical evaluation
  results into an optional technical section without recalculating history.

## Consequences

This is a presentation and navigation change, not a new regulatory
determination or release. Nutrition basis and unavailable values retain the
boundaries in [ADR 022](./022-nutrition-panel-integration.md). Existing
missing-item and export behaviour remains unchanged; a lack of identified
missing items is not legal clearance.

## 2026-11-23 UXS1 owner decision

Replace the large Product review summary with the concise Product draft
completion status and actionable missing-input links described in
[ADR 034](./034-practical-workflow-progressive-disclosure.md#2026-11-23-uxs1-owner-decision).
Label-only fields and claims do not block that Product status. Preserve
technical review and applicable-check notices without implying legal
clearance. UXS6 implements and tests the revised presentation.

## 2026-11-23 UXS6 implementation

The Product review shows a completion tick for the saved Product, linked
recipe and relevant nutrition inputs checked there, or a short list of
actionable missing and unresolved inputs. Unsaved Product edits suppress the
tick. Label fields and claims do not block it, and review-only nutrition
panel limitations remain distinct from missing inputs. The tick is not
legal clearance. Detailed draft findings and their edit actions, pending
allergens, applicable checks and historical traces remain in technical
review; Label reports and export remain separate.
