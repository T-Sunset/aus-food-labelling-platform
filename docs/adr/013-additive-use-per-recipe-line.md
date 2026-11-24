# ADR 013: Optional additive use per recipe line

Status: **Accepted for the I7 draft workflow, 2026-11-17**.
Requirements: DATA-003, FORM-001, ADD-004, ADD-007, ADD-009, ADD-010.

## Context

An ingredient identified as a direct additive can be used differently in
different recipes or included ingredients. That choice belongs to the use,
not the shared ingredient record. Most users should not need an extra
question for ordinary ingredient entry.

## Decision

- Offer an optional special-use choice for direct additives on recipe and
  compound-component lines. The user can record an ordinary ingredient use,
  a possible processing aid, or uncertainty. An unset choice retains the
  existing ordinary handling.
- Store the choice with that individual ingredient line, including lines
  whose amount is unknown, and retain it through editing and backup. Clear
  it when the selected target changes.
- Apply an explicit choice only to the direct additive source on the
  matching expanded path. Potential processing aids and uncertain uses
  require review; they are not automatically removed from declarations,
  allergen information, nutrition, or additive totals.
- If a saved choice no longer identifies a direct additive source, report
  the problem and allow the user to clear it instead of silently ignoring it.

## Consequences

This records a user's description, not a legal determination. Processing-aid
and carry-over eligibility are not evaluated. I8 propagates additives through
complete, quantified compound compositions; incomplete evidence or possible
overlap remains review-only. Processing effects on nutrition and
concentrations also remain unsupported.
