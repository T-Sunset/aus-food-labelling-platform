# ADR 017: Finished-food nutrition evidence

Status: **Accepted for the first N6 turn, 2026-11-17**.
Requirements: CALC-002, CALC-015, DATA-003, DATA-005, DATA-006.

## Context

An ingredient-based ingoing estimate and a measured finished-food value
describe different things. A batch's final mass does not establish nutrient
retention or identify what was lost or gained. The owner selected both direct
finished-food values and evidence-backed retention with yield as N6 routes,
and approved splitting their implementation into two turns.

## Decision

- A recipe can optionally store and select finished-recipe nutrition values
  per 100 g, including energy, base nutrients and additional nutrients, with
  source information and explicit nutrient forms where relevant. These are
  user-supplied values, not independently verified measurements.
- The user confirms that the values describe the current recipe after its
  recorded processing. The confirmation is tied to a snapshot of the
  relevant recipe, nested recipes, processing and ingredient inputs. Changed
  inputs or changed values require confirmation again. Editing unrelated
  allergen evidence alone does not invalidate nutrition confirmation.
- Selected finished values replace, rather than supplement, ingredient-based
  nutrition for that recipe. Missing values are not filled from ingredients or
  treated as zero. A missing or incompatible vitamin form needs review.
  Source-less manual values remain review items. Disabling the selection does
  not discard the saved values.
- The current product nutrition screen uses these values only after the
  existing as-sold basis confirmation. The trace distinguishes finished-food
  sources from ingredient-based ingoing estimates. Additional nutrients are
  recorded and traced, not automatically added as label rows.
- Existing sourced final-food density is still required for volume output.
  Neither the batch weight nor a change in weight supplies retention evidence.
  Additive and ingredient-declaration processing safeguards are unchanged.

## Remaining work

Evidence-backed retention and use of batch yield were added in the second N6
turn; see [ADR 018](./018-nutrient-retention.md). Processed nested recipes are not inferred from their
ingoing nutrient profiles; an independently recorded finished-recipe value
may describe the whole finished recipe. Per-100 mL finished-food entry,
consumer preparation, draining, chemical-form conversion and claim-related
label rows remain outside this turn. All current outputs remain drafts and
require review; this decision does not certify compliance.
