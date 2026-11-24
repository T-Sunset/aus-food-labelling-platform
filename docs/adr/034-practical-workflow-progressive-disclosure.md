# ADR 034: Progressive disclosure for practical workflows

Status: **Accepted, 2026-11-19**.
Requirements: UX-007, DATA-003, DATA-006, FORM-005, CALC-010,
ADD-004, ADD-005, ADD-009, CLAIM-006, PACK-005, TRACE-008.

## Context

An end-to-end product trial showed substantial usability improvement, while
ingredient caffeine and density inputs, formulation completeness, cooking
and yield, Product food-state details, and the Product-level Claims and
Additives sections still felt confusing or too complicated. The user wants
unnecessary questions removed, but also wants retained capabilities explained
and presented more clearly. Ingredient declarations, allergen content and
remaining pack information are future label-content needs.

## Decision

- Treat clarity as an acceptance criterion whenever a complex capability is
  retained. Explain in plain language what a field means, why it is relevant
  now, whether it is optional or required for the selected task, and what
  depends on it. Prefer progressive disclosure and actionable next steps
  over a long list of technical options. Status must not rely on colour alone.
- Ask for a fact only when it matters to the current product or calculation
  and cannot be reliably derived. Do not equate missing or incomplete data
  with absence, zero or a passing result.
- Ingredient entry will not ask everyone for separate caffeine status.
  Derive supported caffeine amounts from available nutrient, additive and
  composition data, and ask a targeted question only when an applicable
  check needs a fact that cannot be derived. An amount alone does not establish
  whether caffeine was added. Density is shown when a mass/volume conversion
  needs it, including per-volume nutrition or additive calculations. Additive
  concentration is not general label copy; retain or request it when a
  relevant additive calculation needs it.
- Ordinary formulations will not receive a generic completeness prompt.
  Ask about composition completeness only when a supplier/compound
  composition or downstream calculation needs it. Source references remain
  optional for ordinary user-entered facts.
- Keep recipe-wide manufacturing, cooking/yield and related nutrition
  evidence with the shared Formulation. Make these controls optional,
  contextual and plain-language rather than part of the ordinary recipe path.
  Keep them distinct from Product customer directions and product-specific
  nutrition-basis choices. Preserve existing calculations and saved values;
  do not infer nutrient or additive retention from weight change alone.
- Simplify Product nutrition and food-state entry around a concise question
  about what the label directs customers to do before consumption. Reveal
  only applicable preparation, draining or accompanying-food details. Use
  ingredient-based NIP calculation where it best represents average
  quantities, without treating that as a universal legal rule or adding a
  blanket retention workflow. Preserve applicable Code-triggered food-state
  requirements and any evidence a specific active check needs.
- Keep additive and prescribed-name checks in Product Review; keep additive
  declaration wording on each Label draft. Store claims per Label draft and
  evaluate them against the associated Product facts. Handle existing
  Product-level claim data explicitly rather than silently discarding it.
- Continue with the approved UXR16-UXR23 roadmap in
  [the implementation plan](../implementation-plan.md#approved-workflow-clarity-and-label-content-roadmap).
  Regulatory facts, wording, applicability and deterministic outcomes still
  require their own source verification and review gates.

## Consequences

The ordinary path should have fewer irrelevant questions, while advanced
capabilities remain accessible when they serve a real user need. A retained
technical step must also be easier to understand, less cluttered and
straightforward to complete. These decisions change workflow presentation
and data placement only; they do not activate rules, establish legal
applicability, approve a result or certify a product or label.

## 2026-11-20 owner clarification

The owner reconsidered the earlier direction to move manufacturing controls
to Product advanced and confirmed that recipe-wide processing and yield
belong with the shared Formulation. Product-specific customer directions and
nutrition-basis choices remain on Product. UXR17 now simplifies and
progressively discloses Formulation details without changing their storage
ownership or calculation behavior. This supersedes the 2026-11-19 relocation
direction recorded in [ADR 028](./028-simple-cooking-and-yield.md).

## UXR19 implementation

- Claim statements are stored on each `LabelDraftRecord`; claim checks,
  Label readiness, nutrition-related claim review and consultant reports use
  only that Label's statements. Claims remain absent from the rendered label
  artwork and are called out for review in the draft and report.
- `ProductRecord.claimFacts` remains shared across the Product's labels and is
  saved separately from Label settings. It supplies facts used by claim checks
  and nutrition review.
- Existing `ProductRecord.claims` remain intact as legacy data and are not
  treated as active claims for any Label. Product Review identifies the
  retained entries; a user may explicitly copy them into a chosen Label.
  Copying makes independent Label records and does not alter the Product data
  or other labels.
- Label claims are optional when reading older saved drafts and backups, so
  this change does not require a backup-format version bump.

## 2026-11-23 UXS1 owner decision

The owner approved this Formulation and Product design for the UXS track,
with the intention to reassess it after implementation and testing. This
supersedes the previous presentation directions where they conflict; it does
not approve new regulatory rules or change the shared ownership of
recipe-wide facts.

- Remove the Formulation `Composition details (optional)` section. Keep the
  existing compound-ingredient completeness question on Ingredients. When
  a shared recipe is used as a compound ingredient and completeness matters,
  offer an action on that shared recipe asking whether all ingredients in
  that component recipe are listed. `Not sure` remains unknown. Updating
  the shared recipe must not silently create a separate ingredient
  composition.
- Remove the Formulation `Manufacturing details (optional)` section.
  Beside the recipe ingredients, offer a small optional `Have finished-batch
  details?` entry point to the particular detail the user chooses to add.
  Existing saved weight, processing, finished-food nutrition and retention
  details have concise, specific inspection and editing routes. Do not
  recreate the old section wholesale or infer nutrient retention from
  weight. Preserve the existing calculation and saved-data safeguards.
- Keep one aligned Product customer-directions question and reveal mixing
  and draining inputs when applicable. Remove `Saved nutrition basis` and
  `Nutrition evidence from the saved recipe` from Product. Derive a basis
  only where supported; unclear, conflicting or unmappable saved states
  need an actionable review path. Preserve previously recorded data.
- Remove the Product `Additives and Names` section and its navigation.
  Preserve its facts and checks; unresolved technical findings remain in
  separate review/report, and applicable active checks such as caffeine
  receive a short relevant notice. Do not replace the section with another
  blanket questionnaire. Label-specific additive wording stays on Label.
- Replace the large Product review with a concise `Required product draft
  information entered` tick when the Product, linked recipe and relevant
  nutrition inputs checked there are complete and saved. Label-only fields
  and claims do not block that tick. Missing required inputs get short
  actionable edit links, and unsaved edits are identified. Unsupported
  checks remain review items, not passes; a brief note distinguishes this
  status from legal clearance.

The individual entry and exit criteria for these directions remain in
[the implementation plan](../implementation-plan.md#uxs-streamlining-and-label-workspace-track)
(FORM-005, CALC-002, CALC-010, DATA-003, ADD-009, TRACE-008, UX-007).

## UXS2 implementation

The general Formulation composition section is removed. The Ingredients
section opens with a completeness question for recipes linked to compound
ingredients, and for existing supplier compositions even if unlinked.
The existing Ingredient question is unchanged. Product review offers the
shared recipe as an additional action when its compound composition needs
confirmation. Unknown answers and amounts, saved source details and the
existing complete-composition reconfirmation safeguard are preserved.
No new regulatory rule or release approval was introduced.

## UXS3 implementation

The Formulation manufacturing section is removed. An optional entry beside
the ingredients opens only the selected batch-weight/processing, finished-food
nutrition or nutrient-retention detail. Saved details have direct review
actions, including previously inactive evidence, without changing the
selected nutrition method. Switching details preserves edits. Existing
processing profiles and calculation behavior remain intact; unknown weight
stays unknown and weight alone does not establish nutrient retention.
No new regulatory rule or release approval was introduced.

## UXS4 implementation

Product customer directions and their relevant preparation and draining
inputs are aligned at desktop and narrow widths. The two named nutrition
sections are removed; the existing calculations use recorded directions and
the technical review retains nutrition sources. Existing non-default or
missing food states have a contextual review control and are not silently
changed. Missing states can remain unknown when saved; a disabled action
conflicting with a recorded drained or reconstituted state remains unresolved.
No new regulatory rule or release approval was introduced.

## UXS5 implementation

The Product Additives and Names section and navigation are removed.
Existing specialist inputs remain saved but are no longer editable in the
Product interface. Draft additive and name results, limitations, sources and
the optional illustrative preview remain in technical review, with direct
links from unresolved findings. Applicable provisional caffeine checks have
a concise notice and expandable details. The separate report and
Label-specific additive wording remain available; unknown and unsupported
checks do not become passes. No rule or release approval was introduced.

## UXS6 implementation

Product review now uses a short saved-input completion status instead of
the large summary. Missing, stale or unresolved inputs have edit actions;
unsaved Product changes suppress the tick. Label fields and claims do not
block it. Technical review retains the detailed findings, pending allergens
and edit links, and review-only panel limitations remain separate from
input completion. This status is not legal clearance; no rule or release
approval was introduced.

## 2026-11-23 UXS7 owner decision

The owner agreed the detailed [Label workspace design](../implementation-plan.md#uxs7---discuss-the-label-workspace-in-detail):
four accessible editor tabs beside a live preview, compact draft controls,
clear saved-data boundaries, actionable notices and nearby review/export
actions. On narrow screens the editor and preview stack with jump links.
Pack examples and precautionary-allergen help are implemented in UXS9;
claims are explicitly identified as absent from artwork, and existing claim
entry remains until UXS10-UXS11. This is a presentation decision only.

## UXS8 implementation

The Label editor now uses the agreed four tabs beside a live preview, with
stacking and jump links on narrow screens. Draft selection and status,
actionable missing information, review reports and incomplete review-copy
export remain available. Existing claim controls and separately saved Product
facts are retained, and claims are explicitly excluded from the artwork.
UXS9 adds illustrative pack examples and expanded help.

## UXS9 implementation

Pack-copy fields now explain what they ask for and offer illustrative,
non-prefilled examples. The precautionary allergen guidance explains
cross-contact, assessment and the distinction from required declarations,
without generating copy or treating a blank as evidence of no risk.

## UXS10 implementation

The existing five draft claim checks use unrounded saved Product nutrition
when the as-sold basis and dependencies are usable. The calculation supports
ingoing recipe, confirmed finished-food and supported retention values; it
converts per-100-volume and per-serving amounts using the saved density or
serving as appropriate. Prepared, reconstituted, drained and combined-food
claim calculations are not connected. Conflicting, missing or stale inputs
remain review-required, and person-confirmation and rule-review gates are
unchanged. Label review and consultant reports show the calculation path and
nutrition sources. Historical manual claim amounts and source details remain
saved, but are not used to derive the nutrition amount. The entry controls
remain until UXS11; no rule is approved or claim placed on label artwork.

## UXS11 implementation

The Label editor no longer asks for manual claim nutrient amounts, claim
source details or the shared Product claim-facts questionnaire. It uses the
saved Product food form when it does not conflict with an older answer.
Confirmations of the legally relevant form, claim serving and prohibited
contexts are not inferred merely from a saved Product or missing data;
unresolved conditions remain visible for review. Existing claim facts,
manual amounts and evidence remain stored, including across claim edits, but
manual amounts and sources do not determine the calculated result. Changing
the claim classification requires a new confirmation. The existing
calculation and rule provenance remain available in review and the report;
claims are still not rendered on artwork.

## 2026-11-23 UXS13 owner decision

The agreed [guided claims roadmap](../implementation-plan.md#crs-guided-claims-roadmap)
will find candidates in local label-facing text, reuse reliable recorded
facts and guide users through ambiguous wording and missing information
without reinstating a blanket questionnaire. Detection cannot establish
that all claims, including non-text artwork, have been found. The owner
prioritised no-added-sugar, gluten-free and fibre/protein claims after the
existing five draft checks; comparative and health claims are initially
review-only. Exact selected wording is to remain visible on incomplete
review artwork with prominent warnings even when unresolved or failing.
CRS1 will settle the detailed workflow. No application behavior or
regulatory approval changed.

## 2026-11-23 CRS1 owner decision

The [agreed claim journey](../implementation-plan.md#crs1---inventory-and-design-the-claim-journey)
uses a compact Claims tab with location-linked candidates, clear limitations
and a manual-entry option. Ambiguous candidates can be identified as a
claim, not a claim or unsure; false-positive decisions are not legal
clearance. Reuse recorded facts rather than reintroducing a questionnaire.
The owner wants to reassess the design after seeing it in use. No
application behavior or regulatory approval changed.
