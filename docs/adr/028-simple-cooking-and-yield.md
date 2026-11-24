# ADR 028: Simple cooking and yield entry

Status: **Implemented, 2026-11-18**.
Requirements: CALC-002, CALC-014, DATA-003.

## Context

Most users can weigh the finished batch without knowing individual processing
gains and losses or nutrient retention. The earlier processing-mode selector
put these choices ahead of the straightforward weight entry.

## Decision

- Show the calculated starting weight and an optional finished batch weight
  first. Entering a weight uses the existing measured-weight calculation;
  leaving it blank leaves the processing profile unknown. A yield preview
  needs complete ingredient amounts and a valid positive finished weight.
- Keep no-change and individual gains/losses under advanced batch weight
  options. Existing detailed or unrepresentable processing profiles open
  with their existing method selected; collapsing the section does not
  remove them. Choosing another method replaces the saved processing
  details on save, as explained in the editor.
- Keep finished-food nutrition and whole-recipe retention as separate
  optional inputs. A batch weight alone does not establish nutrient or
  additive retention. No factor is guessed and existing confirmation and
  snapshot safeguards continue to apply.
- Preserve older processing profiles that the current editor cannot
  represent without converting them. Saving such a profile passes the
  underlying record rather than a reactive proxy to local storage.

## Consequences

This changes entry and presentation, not nutrition calculations, regulatory
rules or the food-state decisions in [ADR 022](./022-nutrition-panel-integration.md).
The limitations in [ADR 012](./012-processing-entry.md) and
[ADR 018](./018-nutrient-retention.md) remain in force.

## 2026-11-19 owner direction (superseded 2026-11-20)

[ADR 034](./034-practical-workflow-progressive-disclosure.md) supersedes the
decision to put finished batch weight first in the main Formulation path.
Cooking and yield are to leave that path; needed manufacturing inputs may be
available under Product advanced, clearly distinct from customer
instructions. Keep the existing calculation safeguards and saved values.
Do not infer nutrient or additive retention from a batch-weight change.

## 2026-11-20 owner clarification

The owner revised this direction after considering that process and yield
describe the shared recipe's manufacture. Keep recipe-wide processing,
finished-food nutrition and retention details on Formulation, but make them
optional, contextual and clearly separate from Product-specific customer
directions and nutrition-basis choices. Do not change their storage ownership
or calculation behavior.

## 2026-11-23 UXS1 owner decision

The owner approved removal of the Manufacturing Details section. Replace
its presentation with the small, optional, detail-specific finished-batch
entry point and saved-detail access recorded in
[ADR 034](./034-practical-workflow-progressive-disclosure.md#2026-11-23-uxs1-owner-decision).
Recipe-wide ownership and existing calculation safeguards remain unchanged.
UXS3 will implement and test the revised presentation.
