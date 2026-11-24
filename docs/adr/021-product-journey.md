# ADR 021: Guided Product journey

Status: **Accepted for N10, 2026-11-17; implemented**.
Requirements: UX-004, UX-007, UX-009, CALC-002, CALC-014, DATA-003, DATA-006.

## Context

The Product editor needs to follow the ingredient and formulation workflow
without asking users to enter their recipe twice. Food as sold, consumer
preparation and draining are related but are not one mutually exclusive
fact. Users also need a clear route to missing evidence and existing checks.

## Decision

Use one guided Product page with expandable sections, consistent with the
ingredient editor. Show saved recipe information and ask only for independent
or unresolved product and pack facts. Record consumer directions without
assuming that absent information means no directions. Reveal preparation or
draining details only when relevant, retaining unsupported or overlapping
cases for review. Keep existing product-type, additive, name and claim checks,
evidence, local saving and export safeguards.

The agreed layout, examples, preservation requirements and N10 boundary are
recorded in [the implementation plan](../implementation-plan.md#n9---agreed-product-journey).
N11 and later steps were assigned label integration and output consistency.
No legal rule or certification is introduced by this decision.

## Implementation

The Product draft stores whether consumer directions are unknown, absent or
present, plus independent mixing, draining and other/unclear selections.
Disabled preparation and draining details remain available for later use.
For an older record without a direction status, explicitly enabled
preparation or draining, or a legacy reconstituted or drained food state,
indicates directions are present; otherwise the status stays unknown. An
explicitly recorded status takes precedence, with contradictions left for review.

The as-sold state is the working default for new drafts, not a decision about
the legally required NIP basis. Unknown, contradictory or other directions,
and missing recorded direction wording, block the as-sold label result.
Preparation and draining together remain unsupported for the existing calculations.
Prepared and drained results remained trace-only until N11; see
[ADR 022](./022-nutrition-panel-integration.md) for the later integration.

The editor remains mounted when the user opens a recipe, ingredient or
another workspace section. It warns before unsaved Product or embedded-panel
work is discarded. Classification answers save as entered; additive/name and
claim inputs have their own save controls, identified beside the Product save
action. Direction fields round-trip in version 2 backups; version 1 backups
cannot contain them. Approved snapshots are not changed.
