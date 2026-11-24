# ADR 023: Pack and declaration integration

Status: **Accepted for N12, 2026-11-17**.
Requirements: CALC-001, DATA-003, TRACE-008, PACK-005.

**2026-11-18 update:** [ADR 025](./025-incomplete-review-copies.md) approves
incomplete reviewer PDFs as a future implementation; the current export
block and the pack-content limitations below remain in place.

**2026-11-19 update:** [ADR 032](./032-label-pack-copy-and-applicability.md)
adds label-specific user-entered supplier, lot, date, storage and
warning/advisory copy to the preview and review report. Empty or entered values
remain unresolved for applicability, adequacy and completeness; no such value
is generated or verified by the system.

## Scope

Connect existing recorded information, not new regulatory rules. The
declaration, allergen vocabulary and pack content remain draft candidates
requiring review. This decision does not establish whether a label or any
particular content is legally required, and does not approve an export.

## Decision

- Show the recorded product name and supported net quantity in the draft.
  Show recorded preparation or draining wording only where the directions
  status is consistent and not marked other or unclear. Retain conflicting
  or unclear wording in the review report and trace rather than presenting
  it as pack copy. Disabled directions remain saved but are not displayed.
- Keep known allergen candidates, including their input paths. An empty
  candidate list does not establish absence; no "contains" summary is
  fabricated. Unresolved final-food conditions are separate review items,
  not part of the candidate summary.
- The review report and trace show the candidate declaration, each recorded
  ingredient path and available specification, and allergen evidence and
  paths. Incomplete amounts and repeated component paths remain visible;
  they do not establish an ordered or complete declaration.
- Show supported product details and directions recorded in the Product.
  Label-specific supplier name and business address, lot, date marking,
  storage instructions and warning/advisory text are collected with the label
  draft as user-entered copy under ADR 032. Their applicability and adequacy
  are not inferred. Allergen emphasis in the ingredient statement and
  requirements outside the bounded pack-copy research remain unsupported and
  require review.
- Preserve the existing label-export blockers, local-only processing and
  non-certification safeguards. N13 addresses broader output consistency.
