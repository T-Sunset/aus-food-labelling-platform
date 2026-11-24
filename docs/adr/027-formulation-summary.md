# ADR 027: Formulation summary

Status: **Implemented, 2026-11-18**.
Requirements: FORM-005, CALC-001, TRACE-008.

## Context

The expanded formulation view should help a user understand the recipe
without requiring them to interpret a technical trace.

## Decision

- Show saved ingredient amounts and the recorded allergens and additives,
  with ingredient paths and actionable gaps. Keep the recursive ingredient
  breakdown, nutrition sources, recorded absence assessments and earlier
  additive wording details available on demand.
- Show nutrition estimates per 100 g and for the batch as entered, before
  cooking. Reuse the existing ingredient-based nutrition calculation.
  Explain that these figures are not the finished-food values, a nutrition
  panel or a legal check. Finished-food and retention selections remain in
  the recipe editor and Product workflow under [ADR 022](./022-nutrition-panel-integration.md).
- Leave unavailable amounts and nutrients unavailable. Incomplete
  composition, conflicting nutrition evidence and unsupported nested
  processing must not produce a known estimate. Recorded allergens and
  additives can still be shown where amounts are missing, without inferring
  that any unrecorded substances are absent.

## Consequences

This view does not change ingredient data, product calculations, label
wording, rule activation or export safeguards. Simplifying cooking and
yield entry remains a separate step, UXR5.

## 2026-11-19 owner direction

[ADR 034](./034-practical-workflow-progressive-disclosure.md) supersedes the
presentation and entry-path direction above where it puts routine cooking
and yield out of the main Formulation workflow. The formulation summary
remains available, with technical details explained and disclosed only when
useful. Existing calculations and saved processing values are to be
preserved; any needed manufacturing inputs move to Product advanced, separate
from customer directions.
