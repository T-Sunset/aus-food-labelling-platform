# ADR 014: Converting recipe percentages to weights

Status: **Accepted for the I7 draft workflow, 2026-11-17**.
Requirements: DATA-003, FORM-001, FORM-003.

## Context

Some recipes are specified by percentages rather than ingredient weights.
Existing formulation calculations and processing details use actual ingoing
weights; a percentage alone does not establish a batch weight.

## Decision

- Offer an optional converter alongside normal weight entry. The user enters
  the starting batch weight and a percentage by weight for every line.
- Show the percentage total and require an exact 100% before applying. Do
  not normalise an incomplete or mismatched total, infer a missing amount,
  or use a partial composition as though it described the whole batch.
- Calculate weights using decimal arithmetic without rounding, then replace
  the recipe-line amounts only when the user explicitly applies the
  conversion. Unapplied inputs must be applied or discarded before saving.
- Save the resulting ordinary line weights; percentages shown after reopening
  are derived from those weights. Small positive shares must not display as
  zero.

## Consequences

The converter is optional; recipes entered directly as weights are
unchanged. A batch weight is needed only for this conversion, not for the
normal workflow. Percentage-only recipes with no known batch weight and
partial percentage-based compositions need additional data-model work and
are not supported by this converter. The conversion makes no assumption
about cooking or final yield.
