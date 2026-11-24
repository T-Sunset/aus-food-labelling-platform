# ADR 025: Incomplete review copies

Status: **Accepted and implemented in UXR2a, 2026-11-18**.
Requirements: DATA-003, TRACE-008, TRACE-012, PACK-001, PACK-005, UX-007.

## Context

The owner needs to send label output to a reviewer during testing even when
some required or potentially applicable content is missing or unresolved.
The existing application blocks all label PDF export. ADR 009 previously
blocked export when a required section was missing or unresolved.

## Decision

- Permit a local **Incomplete Review Copy** PDF for testing and reviewer
  feedback even when label content or its applicability is incomplete.
  This changes the incomplete-export policy in ADR 009, not public-release
  gates or the approval status of any rule or result.
- Identify the output and its limitations clearly in the application and
  in the PDF, outside the actual pack-copy artwork. Include a review section
  with known missing, unsupported, conflicting or unassessed content and
  layout issues. Do not silently omit known gaps or suggest they are
  inapplicable. The output is not a finished or approved label.
- Retain unknown values as unknown. Do not invent dates, ingredient
  declarations, allergen absence, warnings, nutrition values or rule
  conclusions to make the copy appear complete. Report actual technical
  failures explicitly.
- Implement this as a dedicated early step of the approved usability track,
  with tests for incomplete and complete inputs, missing declarations,
  unresolved applicability, output identification, review information and
  layout errors. Preserve the existing export safeguards until that step
  is implemented and verified.

The approval does not grant reviewer acceptance, authorize a public release,
or imply that a review copy is ready for use on a food package.

## Implementation

The local PDF starts with an identified review-only cover, followed by the
selected-size label artwork and a separate report with known gaps, rule
limitations and layout issues. Missing ingredient declarations are omitted
from the artwork and reported as unavailable; they are not invented.
Overflowing layouts can be exported for feedback, but the application and
report warn that content may be clipped. Invalid layouts and PDF rendering
failures remain explicit errors. Tests cover incomplete and complete entered
information, physical dimensions, missing declarations, unresolved content,
overflow, offline export and renderer failures.
