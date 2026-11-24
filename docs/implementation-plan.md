# Implementation plan - Australian Food Labelling Platform

**Status:** Living plan; the 2026-11-18 UXR usability and review-copy track
is complete as recorded below. UXR13 research is complete. The owner closed
the planned UXR14-UXR15 label-retention
expansion on 2026-11-19: use ingoing recipe nutrients and quantities as the
general NIP calculation method where it best represents average quantities;
do not develop an automatic retention-factor dataset or integrate one into
the label workflow. Preserve existing optional finished-food/manual-retention
routes and Code-triggered food-state handling. See [food-state nutrition
research](./food-state-nutrition-research.md) and [ADR 022](./adr/022-nutrition-panel-integration.md).
The 2026-11-16 priority reset and I1-I9
ingredient/formulation track are approved. I1's direction is agreed in
principle; I2 ingredient-data research and approach are approved, I3
through I9 are complete. The post-I9 N1-N14 nutrition, food-state and
product/label track is approved; N1 through N14 and N12a-N12c are complete. The owner
extended the remaining track on 2026-11-17 to consolidate product review and
provide a dedicated label workspace.
On 2026-11-19 the owner approved the UXR16-UXR23 workflow-clarity and
label-content roadmap below; UXR16-UXR23 are complete. The
user-facing clarity standard and related decisions are recorded in
[ADR 034](./adr/034-practical-workflow-progressive-disclosure.md).
On 2026-11-23 the owner agreed the direction of the following UXS
streamlining and label-workspace track. UXS1's Formulation and Product
design discussion, UXS2-UXS6 implementation, the UXS7 Label design
discussion, UXS8-UXS11 implementation, UXS12 regression gate, UXS13
claims-roadmap discussion, CRS1 design, CRS2 local detection, CRS3
candidate resolution, CRS4 missing-fact guidance and CRS5 first-five-claim
research, CRS6 claim/NIP interaction reporting and CRS7 review-copy claim
rendering are complete. CRS8a is next.
Earlier plans and their progress are retained as history.
**Audience:** engineers and AI agents implementing the product.
**Related documents:** `AGENTS.md` (always-on agent rules), `docs/requirements.md` (the contract), `docs/reviewer-questions.md` (questions for the human regulatory reviewer).

**2026-11-16 product reset:** The product owner approved general-purpose
ingredient and formulation foundations as the next priority, using an everyday
baked good and the existing caffeinated drink as contrasting examples. The
drink-specific D0-D11 sequence in section 7 is paused, not a current work
order. The owner approved the I1-I9 ingredient/formulation track; the I1
screen details remain subject to design and implementation. Past trackers and decisions are historical except where
explicitly retained; the current export and result safeguards still apply.

## Current direction and approved next turns

The goal is a guided Australian food-labelling workflow: ingredients and
supplier evidence feed formulations; a formulation and product-specific facts
feed a product; supported rules and calculations generate pack copy and a
label preview/export. The user sees actionable missing or unsupported items.
The eventual product should expand to many food types, but no first release
can claim universal rule coverage. Prioritise common use cases, identify
unsupported cases explicitly and extend coverage deliberately.

Fictional reference cases will exercise the same workflow: several simple
cakes and cookies, plus the existing
[drink scenario](./drink-demo-scenario.md). Both are tests, not templates
for all users. Ask only for information that matters to the ingredient or
product and cannot reliably be derived. A known ingredient or documented
component can establish presence where supported; a missing entry or
incomplete composition cannot establish absence (DATA-003, FORM-005).
Specific additive and substance checks require the right identity, context,
amount and source; names or numbers alone do not prove legal permission.

Clarity is a requirement, not a cosmetic follow-up: if a complex field or
capability remains, its purpose and consequences must be explained in plain
language, and it should appear only when relevant rather than cluttering the
ordinary path. The completed UXR16-UXR23 roadmap and the following UXS
track apply this principle to the workflow.

### UXS: streamlining and label-workspace track

The owner reviewed the completed UXR work on 2026-11-23. Overview and
Ingredients are satisfactory for the MVP and are not redesign targets.
The owner agreed to remove the named Formulation sections while retaining
genuinely needed inputs as contextual, plain-language questions; simplify
Product; use a four-tab Label editor with a live preview; and defer broader
claims expansion until after the immediate layout and entry cleanup.

The completed UXS sequence followed the UXR track. The Formulation, Product
and Label directions are agreed; details assigned to the claims roadmap's
later discussion turns remain open. No application changes or new regulatory
approvals were made by recording this plan or completing UXS1 or UXS13.
The claims roadmap below follows UXS13; CRS8a is the next turn. Work
sequentially, with one turn per step as the target and two or three at most;
agree a bounded split
before proceeding if a step cannot fit. Update this plan and relevant ADRs
when decisions are made, and tick each step only after its exit criteria are
met. Ask before changing any locked decision in section 3.

**Shared acceptance constraints**

- Remove the named sections rather than simply renaming them or moving the
  same blanket questionnaire elsewhere. Ask only for a fact that is needed
  in the current context and cannot reliably be derived. Give a clear reason,
  examples where useful, and an actionable route for genuinely missing facts.
- Retain underlying calculations and saved values, including shared recipe
  processing, composition, food-state and claim data, unless the owner
  explicitly approves a change. Removing a screen must not silently erase
  records or turn an unknown into zero, absence or `PASS`. Preserve existing
  saved-label and backup behavior; do not make a migration or data deletion
  a hidden prerequisite for simplification.
- Separate entered draft information from regulatory review. A green tick
  may say `Required draft information entered` only when the checks it
  represents are satisfied; it is not legal clearance. Missing, unsupported,
  stale and unsaved cases remain understandable and actionable. Status is
  never conveyed by colour alone.
- Preserve local-first operation, exact-size label/PDF behavior, offline
  operation, accessibility, separate Label drafts and consultant review
  reports. Rule provenance remains accessible in review/trace, even when
  ordinary claim source-entry fields are removed. Existing draft rules and
  release gates do not become approved through UI changes.
- Preserve the current preview's distinction between unsaved Label edits and
  the latest saved Product and ingredients. Claims are currently not rendered
  on label artwork: the layout work must not imply otherwise. Do not silently
  add, remove, rewrite or approve claims in preview or export as part of the
  layout or entry cleanup.
- Each implementation turn includes focused tests for its changes and
  affected existing workflows, including missing and non-applicable inputs,
  narrow screens and keyboard/accessibility checks where relevant. Run
  applicable type-check and lint; run rule validation if rule data changes.
  Keep the end-to-end gate in UXS12. Requirement IDs below identify the
  relevant contract, not approval of any legal interpretation.

#### UXS1 - Discuss and settle Formulation and Product design

**Entry:** This roadmap is recorded; UXR23 is complete.

**Status:** Complete, 2026-11-23. The owner approved the following design
for implementation and expects to reassess it after using and testing the
completed track. [ADR 034](./adr/034-practical-workflow-progressive-disclosure.md)
records the decision and the updates to ADRs 028, 030 and 031 identify the
superseded presentation directions. No application code changed.

**Agreed design:**

- **Composition:** Remove the generic Formulation composition section.
  Leave the existing compound-ingredient completeness question on Ingredients
  unchanged. When a shared recipe is used as a compound ingredient and a
  completeness answer is needed, offer an action for that shared recipe:
  `Are all the ingredients in this component recipe listed?` An unknown
  answer stays unknown. Do not silently create a separate ingredient
  composition when the user intends to update a shared recipe.
- **Finished-batch information:** Remove the Manufacturing Details section.
  Beside the recipe ingredients, offer a small optional `Have finished-batch
  details?` entry point to the particular information the user chooses to
  add, not the former multi-part section under a new name. Where an existing
  recipe already has weight, processing, finished-food nutrition or
  retention details, provide a concise way to inspect and edit the relevant
  saved detail. Missing weight remains unknown; weight alone does not
  establish nutrient retention. Use ingredient-based nutrition where
  appropriate, without making it a universal rule.
- **Directions and nutrition:** Keep one aligned customer-directions
  question and show mixing and draining details only as applicable. Remove
  the two named Product nutrition sections. Derive a nutrition basis only
  where supported; unclear, conflicting or unmappable saved non-default
  states need an actionable review path, not a guessed basis. Preserve
  previously saved values.
- **Additives and names:** Remove the Product section and navigation;
  preserve its data and existing supported checks. Unresolved technical
  findings remain in separate review/report, with a concise notice for an
  applicable active check such as caffeine. Label-specific additive wording
  remains on Label. No unsupported check becomes a pass.
- **Product completion:** A tick may say `Required product draft information
  entered` when the Product, linked recipe and relevant nutrition inputs
  checked here are complete and saved. Label-only fields and claims do not
  block this Product tick. Missing required inputs get a short list with edit
  links; unsaved edits are identified. Unsupported checks remain review
  items, not passes, and a brief note distinguishes completion from legal
  clearance. The tick must not imply that every legal requirement or every
  label field was checked.

**Exit:** Owner agreed the contextual Formulation and Product approach and
the decision is recorded (FORM-005, CALC-002, CALC-010, DATA-003, ADD-009,
TRACE-008, UX-007).

#### UXS2 - Remove the Formulation composition section

**Status:** Complete, 2026-11-23.

**Entry:** UXS1 establishes the contextual composition path.

**Work:** Remove `Composition details (optional)` from Formulation entry.
Leave the existing Ingredient question alone. When a shared recipe is used
as a compound ingredient and completeness matters, offer the agreed
specific question as an action on that shared recipe. Do not silently
create a separate composition. Keep existing incomplete and confirmed
composition facts and their effects; neither listed components nor missing
amounts alone establish complete coverage.

**Exit:** Ordinary recipes have no composition section or blanket prompt;
needed compound/supplier cases can still be resolved without inventing
coverage. New, partial, complete, unknown and previously saved
compositions, nested allergen/nutrition effects and backup round trips are
tested (FORM-005, DATA-003, CALC-001, TRACE-008, UX-007).

**Result:** Removed the general composition section. A shared component
recipe opens its Ingredients section with the completeness question; an
existing saved supplier composition remains editable even if no ingredient
currently links to it. Product review links unresolved compound composition
to the shared recipe as well as the ingredient. Unknown answers and amounts
stay unknown, existing source details remain optional and saved, and editing
the shared recipe does not create an ingredient-specific copy. Focused
unit tests (85), affected browser suites (24), a further unlink/preservation
browser test, narrow-screen keyboard and accessibility checks, type-check
and targeted lint passed. Both unencrypted and encrypted backups were
restored in the supplier journey.

#### UXS3 - Remove the Formulation manufacturing section

**Status:** Complete, 2026-11-23.

**Entry:** UXS1 establishes the contextual processing path; UXS2 is complete.

**Work:** Remove `Manufacturing details (optional)` from the Formulation
page. Beside the recipe ingredients, offer the agreed small optional entry
point to the specific finished-batch detail a user wants to add; provide
concise access to existing saved details. Do not simply recreate the entire
old section under a different heading. Keep recipe-wide facts distinct from
customer directions and do not infer nutrient retention from weight change.

**Exit:** Ordinary recipe entry is streamlined; relevant previously saved
processing and nutrition evidence can be inspected and edited without
silent loss. Tests cover no details, a relevant contextual case, saved
processing profiles, incomplete amounts and calculation/backup regressions
(CALC-002, CALC-014, DATA-003, DATA-006, UX-007).

**Result:** Removed the manufacturing section. An optional entry beside
the recipe ingredients opens only the chosen batch-weight/processing,
finished-food nutrition or nutrient-retention detail. Existing saved details
have direct review actions, including inactive nutrition evidence without
silently selecting it. Switching details retains edits; unknown weight
remains unknown and weight alone does not establish retention. Existing
processing profiles, calculations and backup data remain intact. Focused
unit and storage tests (145), affected browser suites (36), accessibility,
encrypted backup/restore, type-check and targeted lint passed.

#### UXS4 - Simplify Product directions and nutrition

**Status:** Complete, 2026-11-23.

**Entry:** UXS1-UXS3 are complete.

**Work:** Correct the alignment and clutter in `Customer directions and
nutrition`, including its inline disclosures. Remove `Saved nutrition basis`
and `Nutrition evidence from the saved recipe` from the Product UI. Follow
customer directions and existing data for food-state selection only when
reliably supported; retain a contextual route or unresolved review state
where necessary. Preserve saved non-default states and their consequences.

**Exit:** Controls align at desktop and narrow widths, with neither removed
section visible. Ordinary as-sold, prepared, reconstituted, drained, combined-food,
unknown and previously saved non-default cases retain appropriate nutrition
and review behavior; no unsupported state is silently treated as as-sold.
Focused browser and calculation tests pass (CALC-003, CALC-004, CALC-010,
CALC-014, DATA-003, UX-007).

**Result:** Removed both named nutrition sections. Customer actions and their
relevant mixing or draining inputs now use an aligned, responsive layout
without inline preparation disclosures. The existing calculations follow
recorded directions; ingredient nutrition sources remain available in the
technical review. Older non-default or missing food states are shown only
when applicable and remain unchanged until explicitly edited. A missing
state can be saved as unknown; a disabled action that conflicts with a
recorded drained or reconstituted state remains unresolved. Focused
calculation tests (105), affected browser suites (61), keyboard and
accessibility checks, encrypted backup/restore, type-check and targeted lint
passed. No regulatory rules or release gates changed.

#### UXS5 - Remove Product Additives and Names

**Status:** Complete, 2026-11-23.

**Entry:** UXS1 and UXS4 are complete.

**Work:** Remove the Product `Additives and Names` section and its step
navigation. Retain the underlying records and existing supported checks;
place unresolved technical findings in separate review/report, with a
concise notice for applicable active checks, without inserting a replacement
questionnaire in the ordinary Product workflow. Keep Label-specific
additive wording intact.

**Exit:** The Product section is absent; saved data, the existing provisional
caffeine check, report/trace boundaries and Label additive wording still
work. Unknown and unsupported additive/name cases do not become clear or
approved. Focused Product, report and Label tests pass (ADD-009, NAME-001,
DATA-003, TRACE-008, TRACE-015).

**Result:** Removed the Product section and navigation. The saved specialist
inputs remain intact but are no longer editable in the Product interface.
Technical review retains the additive and prescribed-name results, source
details, limitations and opt-in illustrative preview; missing-information
actions open this review instead of the removed section. Applicable caffeine
checks have a concise provisional notice and expandable details. Label
wording and review reports remain separate, and unsupported cases remain
unresolved. Focused unit tests (88), affected browser suites (39), keyboard
and accessibility checks, encrypted backup/restore, type-check and targeted
lint passed. No regulatory rules or release gates changed.

#### UXS6 - Simplify Product review and next actions

**Status:** Complete, 2026-11-23.

**Entry:** UXS1 and UXS4-UXS5 are complete.

**Work:** Replace the large `Review and next actions` content with the
agreed concise Product completion message and a tick when the defined
Product, recipe and nutrition inputs are complete and saved. Label-only
fields and claims do not block the Product tick. When required inputs are
missing, show a short list with edit links; distinguish unsaved changes and
unsupported checks. Preserve technical review and report access without
restoring the large summary.

**Exit:** Complete, incomplete, unknown, stale and unsaved cases have
accurate text and accessible status, with no implication of legal
compliance. Links navigate to relevant editing contexts; label export and
technical traces remain usable. Browser and accessibility tests cover
desktop and narrow layouts (TRACE-008, TRACE-012, DATA-003, UX-007).

**Result:** Product review now shows a concise saved-input completion tick or
a short actionable list. The tick checks Product details and type, pack and
servings, linked recipe and available ingredient references, and relevant
nutrition and directions; stale and unsaved Product edits prevent it. Label
fields, claims and review-only panel limitations do not establish or block
legal clearance. Detailed draft findings and their edit actions remain in
technical review, including pending allergens and the additive checks.
Label export, offline reports and history remain available. Focused unit tests
(102), affected browser workflows, desktop and narrow-screen accessibility,
type-check and targeted lint passed. No rules or release gates changed.

#### UXS7 - Discuss the Label workspace in detail

**Entry:** UXS2-UXS6 are complete.

**Status:** Complete, 2026-11-23. The owner agreed the design below. No
application code, claim artwork, regulatory rules or release gates changed.

**Discussion:** Work through the agreed two-column layout and four tabs:
`Label setup`, `Ingredients & allergens`, `Pack details`, and `Claims`.
Agree the placement of existing controls, label selection, save state,
missing-information messages, review/export actions and a live preview
that remains useful while editing. Agree narrow-screen behavior, keyboard
navigation, example text and precautionary-allergen help. Make clear which
inputs are editable locally and which come from saved Product data. Decide
how to surface that claim artwork is not yet implemented.

**Agreed design:**

- A compact header selects the Product and saved Label and makes New,
  Duplicate, Save and saved/unsaved status discoverable. Preserve multiple
  named drafts per Product, missing-Product and dependency-change warnings,
  and existing protections for unsaved work when switching or restoring.
- On desktop, show the four-tab editor on the left and the live preview on
  the right, keeping the preview visible while editing when space permits.
  Put preview/layout warnings, incomplete-review-copy export and the
  separate review-report action alongside the preview. Replace the long
  upfront list with concise missing-information notices and actionable links
  to the relevant editor or Product review. Keep detailed findings available.
- **Label setup:** label name, dimensions, orientation and nutrition display;
  place margins, spacing and text sizes behind an optional advanced
  disclosure. The displayed preview is not a physical-size proof.
- **Ingredients & allergens:** generated ingredient and allergen content,
  links to edit its saved source records, and per-Label additive wording.
  Missing evidence remains unknown; generated content stays reviewable.
- **Pack details:** supplier, lot, date, storage, warning and precautionary
  allergen text, with entered/not-entered and unresolved-applicability
  information still accessible. UXS9 adds short illustrative examples and
  plain-language help; examples are not default values or universally
  applicable wording. Explain that precautionary statements concern possible
  unintended cross-contact, do not replace required allergen declarations,
  and need a basis; a blank does not establish no risk.
- **Claims:** retain existing Label-specific claims and checks. State both in
  this tab and beside the preview that claims are not yet shown on the
  artwork. Keep current claim-entry controls and the separate Product
  claim-facts save until UXS10-UXS11 change them; do not imply that a claim
  has been rendered or approved.
- The preview updates for unsaved Label edits but uses the latest saved
  Product, recipe and ingredient data. Explicitly flag unsaved Product edits
  and changed saved dependencies. Product-sourced values are edited in
  their own records, rather than silently altered in the Label.
- On narrow screens, stack editor and preview and provide a persistent
  `View preview` jump and an easy return to editing. Tabs support keyboard
  navigation and retain edits when switched. Preserve offline operation,
  output safeguards, review reports and Incomplete Review Copy restrictions.

**Exit:** Owner agrees a concrete layout and interaction design, including
small-screen behavior and preservation of existing workflows. Record the
decision and any superseded presentation direction from ADRs 024, 032 and
034. No application change or new claim-rendering behavior is included
(PACK-005, TR-004, TR-019, CLAIM-006, UX-007).

#### UXS8 - Implement the Label tabs and live-preview layout

**Entry:** UXS7's design is agreed.

**Status:** Complete, 2026-11-23. The agreed four-tab editor, responsive
live preview, draft controls and actionable review links are implemented.
Pending Label edits and separately saved Product claim facts are preserved
across tabs; switching and browser unload protect unsaved changes. Saved
Product dependencies and claim-artwork limitations remain explicit. Unit
tests (626), all 72 browser tests, type-check and targeted lint passed.
No claim artwork, regulatory rules or release gates changed.

**Work:** Build the four-tab editor and live preview as agreed. Reorganise
existing controls without changing their meaning or adding claim artwork.
Keep Label selection, saved/unsaved indications, save, review and export
discoverable; preserve pending edits across tab switches.

**Exit:** Each existing relevant control is reachable in its agreed tab;
edits that already affect artwork update the preview immediately; saved
Product dependencies remain clearly distinguished. Tab and keyboard
navigation, narrow-screen stacking, separate Label drafts, persistence,
preview and PDF/report regression tests pass. Claim artwork limitations
remain explicit (PACK-005, DATA-003, TRACE-012, UX-007).

#### UXS9 - Explain pack details and precautionary allergens

**Entry:** UXS7-UXS8 are complete.

**Status:** Complete, 2026-11-23. Pack fields have accessible, illustrative
examples and plain-language explanations. Precautionary allergen guidance
explains unintended cross-contact, the separate required declarations, the
assessment basis and why a blank does not establish no risk. Examples are not
stored or included in output. Focused browser, desktop and narrow-screen
accessibility, unit, type-check and targeted lint checks passed; existing
validation and user-entered preview, report and persistence behavior remain
unchanged. No regulatory rules or release gates changed.

**Work:** Add useful, clearly illustrative examples to the Pack details and
statements fields and explain what each asks for. Explain precautionary
allergen labelling and unintended cross-contact in plain language; it is
separate from mandatory allergen declarations. Do not generate a default
statement or suggest that an example is universally appropriate.

**Exit:** Examples are not saved as user data, and a user can understand
the statement and its required basis. A blank statement does not establish
absence of cross-contact risk. Existing validation, preview, report and
saved values remain intact; focused browser and accessibility tests pass
(TR-004, TR-019, DATA-003, PACK-005, UX-007).

#### UXS10 - Connect claims to existing nutrition facts

**Entry:** UXS8-UXS9 are complete. Inspect the existing nutrition pipeline,
claim rules and food-state limitations before selecting supported cases.

**Work:** Connect claim evaluation to the existing, unrounded Product
nutrition calculation when its nutrient, unit, food form, serving or
per-100 basis and dependencies are demonstrably suitable. The low-sugars
case must use the Product's own sugars value when available. Derive other
facts for the existing supported claim set only where reliably established;
do not infer restricted contexts or missing facts from a name or blank
field. Keep existing rule gates and record the calculation path in
review/trace. A stale manual amount must not override current derived
nutrition.

**Exit:** Low-sugars tests cover correct values, threshold boundaries,
missing and conflicting nutrition, mass/volume basis, changed recipes and
unsupported food states. Test every additional existing claim connected,
including per-serving cases where supported. Incomplete or incompatible
inputs stay `REVIEW REQUIRED`, and no new rule or official approval is
implied (CALC-010, CLAIM-001, CLAIM-003, CLAIM-004, DATA-003, TRACE-008).

**Outcome:** The five existing draft checks use unrounded saved as-sold
nutrition where the relevant nutrient, form, density, recipe and, for fibre,
serving are reliable. Ingoing, confirmed finished-food and supported
retention paths retain their source and calculation trace in both Label review
and consultant reports. Prepared, reconstituted, drained and combined-food
claim calculations remain unsupported. Existing person-confirmation and draft
rule gates remain in force. Historical claim amounts and source details are
retained but do not determine the calculated amount; missing and conflicting
data never fall back to them. UXS11 removes the redundant entry controls.

#### UXS11 - Remove redundant claim-entry questions

**Entry:** UXS10 is complete; its derivation and unsupported cases are
explicit.

**Work:** Remove the manual nutrient amount and claim source-detail entry
from the Label claim UI, and remove everything under `Facts used by nutrition
content claim checks`. Use reliably derivable saved Product facts; if a fact
cannot be established, explain the review need without recreating that
questionnaire. Preserve saved claims and evidence without silently changing
historical data. Keep exact wording and Label-specific independence.

**Exit:** Users can add a low-sugars claim without re-entering sugars or
claim sources; current nutrition changes are reflected in checks. Missing,
ambiguous, unsupported and conflicting inputs remain `REVIEW REQUIRED`;
no hidden saved manual value creates a passing result. Rule provenance is
available in separate review/trace, and preview/report accurately state
that claim artwork is not yet implemented. Tests cover editing, save/reload,
independent Labels, existing records and report consistency (CLAIM-003,
CLAIM-006, DATA-003, TRACE-008, UX-007).

**Outcome:** Label claim entry no longer asks for a nutrient amount, claim
source or the Product claim-facts questionnaire. Checks use the saved Product
food form where it does not conflict with a historical answer, and explain
unresolved conditions in the result. Claim-specific form, serving and
restricted-context confirmations are not inferred from incomplete facts.
Existing Product facts and historical Label claim amounts and evidence remain
stored, including when a claim is edited; they do not supply the calculated
nutrient amount. Changing a claim's type requires confirming the new type.
Claim artwork remains unimplemented; rule provenance remains in review and
the consultant report.

#### UXS12 - End-to-end usability and regression gate

**Entry:** UXS2-UXS11 are complete.

**Work:** Exercise the ordinary baked-good workflow and the contrasting
drink and relevant compound/food-state cases through formulation, Product,
Label tabs, live preview, review report, incomplete PDF and backup/restore.
Include a low-sugars claim with both available and missing nutrient data.
Check desktop, narrow-screen keyboard use, accessibility and offline use.

**Exit:** Record the exercised journeys, commands and results; fix
regressions caused by this track before closing it. Existing review-copy,
trace, unknown-input and release safeguards remain intact. Clearly list any
remaining unsupported cases and human review gates. No regulatory acceptance
or public-release approval is inferred (UX-007, TEST-004, PACK-005,
BKP-001, TRACE-012).

**Status:** Complete as an automated engineering regression gate.

- Fictional cake and cookie journeys cover ingredient and compound recipes,
  Product, Label tabs, declarations, review report, incomplete PDF and
  encrypted backup/restore. A cake claim uses 52.96 g sugars per 100 g from
  the unrounded recipe; after recipe edits and restore it uses 70.6 g. An
  incomplete cookie recipe leaves the claim amount unavailable and the
  status `REVIEW REQUIRED`, including after restore.
- The fictional drink exercises supplier and nested composition data, liquid
  nutrition, Label, the separately downloaded report and incomplete PDF,
  caffeine review, and both encrypted and unencrypted backup/restore.
  Separate journeys cover finished-food values, reconstitution, combined
  foods, drained food and recorded retention, including changed or missing
  evidence. Other Label tests check live preview updates, review-copy output,
  unsaved changes and trace. Desktop and 390 px layouts, keyboard operation,
  automated WCAG scans and offline editing/report/PDF use were exercised in
  isolated Chromium contexts; this is not a manual usability or print proof.
- Windows PowerShell commands: `pnpm.cmd test` (641 passed);
  `pnpm.cmd lint` (passed); `pnpm.cmd build` (type-check and build passed,
  with Vite's large-chunk warning); `pnpm.cmd validate:rules` (five draft
  rules and 19 sources validated, no rules enabled);
  `$env:CI='true'; pnpm.cmd test:e2e --workers=2` (74 passed).
  The expanded drink PDF assertions were added after that full run and passed
  separately with `$env:CI='true'; pnpm.cmd exec playwright test apps/web/e2e/drink-supplier-entry.spec.ts --project=chromium --workers=1`;
  `pnpm.cmd exec eslint apps/web/e2e/ingredient-workflows.spec.ts apps/web/e2e/drink-supplier-entry.spec.ts`
  passed for both changed journey files.
- Claims are not rendered on artwork. Prepared, reconstituted, drained and
  combined-food claim calculations remain unsupported; only the five existing
  draft nutrition-content checks are covered, and missing, stale or
  conflicting facts remain review-required. Other claims, warnings, pack
  applicability, exemptions and print legibility are not fully assessed.
  The caffeine check remains provisional and requires a current verified
  rule period. Human review remains necessary, including R3-01 golden
  fixtures, R1-13 NIP display policy, R1-21 physical print proof and
  applicable rule-mapping and claims gates in
  [reviewer questions](./reviewer-questions.md). Neither this gate nor its
  exports constitute regulatory acceptance or public-release approval.

#### UXS13 - Discuss and plan the wider claims system

**Entry:** UXS12 is complete. This is a design and research-planning turn,
not authorisation to implement new claim types.

**Discussion:** Agree priorities and a staged roadmap for finding claims
across relevant user-entered label text, recognising and classifying wording,
evaluating supported claim families, and reflecting claims and any
claim-dependent content on the label. Define what the app may safely
suggest versus what needs user confirmation or expert review; account for
unrecognised or ambiguous wording, non-text artwork, comparative/health and
other claim families, missing inputs, existing NIP interactions, and
Australia-specific source and effective-date requirements. Never silently
rewrite or remove user wording. Distinguish a future coverage ambition from
what can be supported at each release.

**Exit:** Owner agrees a separate, bounded turn-by-turn claims roadmap with
explicit entry/exit criteria, examples, rule and reviewer gates, source
verification and regression tests. Delegate bounded primary-source
regulatory research to the Australian Food Requirements Analyst when needed;
do not invent thresholds or rely on unverified interpretations. No new claim
rules, scanning or label rendering are implemented in this turn (FR-007,
REG-CLAIM-001, REG-CLAIM-003, CLAIM-001 to CLAIM-006, INT-001, TRACE-015).

**Outcome:** Complete, 2026-11-23. The owner agreed the CRS roadmap below:
start with the five existing draft checks, then prioritise no-added-sugar,
gluten-free and fibre/protein claims. Comparative and health claims are
initially flagged for review rather than promised as supported checks. The
owner chose to show exact user-selected wording on incomplete review artwork
even when a check is unresolved or fails, with prominent review warnings.
No application behavior, rule, reviewer approval or release gate changed.

### CRS: guided claims roadmap

This is the current work order after UXS13, not a claim that all families
are supported or approved. Each step is intended for one turn, at most two
or three; agree a bounded split before proceeding if necessary. Research
steps use the Australian Food Requirements Analyst and primary sources
only for the provisions needed; capture compilation/effective dates,
mapping confidence, evidence requirements, unverified points and reviewer
gates. Do not invent a threshold, assume that a verified provision is
reviewer-approved, or enable deterministic results before their gates.

**Shared design and safety boundaries**

- Scan locally the user-entered text intended to appear on the selected
  Label, including relevant Product and pack text and Label claims. CRS1
  determines exact fields, their origins and saved versus unsaved boundaries.
  Do not transmit formulation or label content. Scanning is limited candidate
  detection, not a guarantee of finding every claim or of clearance when
  nothing is flagged. Images, logos and other non-text artwork cannot be
  reliably assessed; identify that limitation and require human review.
- Link each candidate to its exact original wording and location. A clear
  supported match may be suggested/classified where reliable; ambiguous
  classification requires confirmation. Let users resolve false positives
  without silently declaring other text safe. Unsupported, unrecognised,
  conflicting or missing evidence remains `REVIEW REQUIRED`, not absence,
  zero or `PASS`. Do not silently rewrite, delete or move user text.
- Reuse dependable Product, ingredient and recipe facts, preserving
  calculation trace and rule provenance. Ask only for necessary facts not
  reliably derivable; no return to a blanket claim-facts questionnaire.
  Keep claim text and decisions Label-specific, preserve historical records,
  backup/restore and approved-version immutability.
- When artwork support is implemented, display the user's exact selected
  wording on incomplete review copies even when a check is unresolved or
  fails. Make the status and limitations prominent in the preview and
  review-copy output and in the separate report, without relying on colour.
  Text already rendered from another field must not be duplicated as a claim.
  The incomplete review copy is not a finished or approved label.
- Research claim-dependent NIP rows and accompanying statements before
  generating them. Preserve the current NIP, food-state and release
  safeguards, including unsupported prepared, reconstituted, drained and
  combined-food claim calculations until separately verified and implemented.
  External artwork and general marketing content outside the supported
  label-text inventory are not silently treated as scanned.
- For each implemented slice test recognised and ambiguous wording, false
  positives, missing/conflicting data and non-applicability as relevant;
  include boundary values, source/effective-date and reviewer gates for rule
  changes. Test trace, label/report consistency, saved data, privacy,
  accessibility and affected workflows. A review-only outcome is acceptable
  when the evidence or approval for deterministic checks is unavailable.

#### CRS1 - Inventory and design the claim journey

**Entry:** UXS13 is complete. Inspect the existing text, claims, nutrition,
preview and report flows; identify user-entered label-facing fields, their
origins and any already-rendered wording.

**Exit:** Agree a concrete, uncluttered workflow for detection, candidate
confirmation, exact-text ownership, false positives, saved/unsaved changes,
unsupported text and non-text artwork. Record a field inventory, examples
and data/backup implications; distinguish what is scanned from what is not.
No application changes or new regulatory conclusions (FR-007, CLAIM-006,
DATA-003, PACK-005).

**Status:** Complete, 2026-11-23. The owner agreed the following design
for implementation and wants to reassess it after seeing it in use.
No detection, artwork, application behavior or regulatory rule changed.

**Current inventory and proposed local scan scope**

| Origin | Text to inspect | Current artwork and ownership |
| --- | --- | --- |
| Saved Product | Product name; enabled preparation, draining and other consumer directions | The name is rendered. Directions are rendered only when the recorded direction state permits it; show entered-but-withheld text as such. Product remains the source and edit location. |
| Saved ingredients and Label additive choices | Ingredient names used in the declaration, including compound components; selected additive declaration wording | The declaration is generated and may be withheld when required information is missing. Trace a candidate to its actual ingredient/additive choice and path, without treating generated declaration copy as a second independent claim. |
| Saved added ingredient | Added-food name used in a combined-food NIP heading or description | Conditionally rendered as part of the generated nutrition panel; link to the saved ingredient rather than treating generated headings as separate editable text. |
| Label pack copy | Supplier name and address, lot, date, storage, warning/advisory and precautionary-allergen statement | Entered copy is rendered when pack copy parses successfully; a precautionary statement also needs its paired basis. Applicability is not assessed. Inspect entered but withheld text and identify its output status. Label pack fields remain the source and edit location. |
| Label claims | Each exact manually entered claim | Label-specific and checked today, but not yet rendered. Include it in the scan/review inventory; CRS7 will add selected claim artwork. Older Product-level claims remain inactive until explicitly copied. |

This inventory follows the present [label layout](../apps/web/src/label-layout.ts),
[pack draft](../apps/web/src/pack-draft.ts),
[Label editor](../apps/web/src/components/LabelExportPanel.vue) and
[storage records](../packages/storage/src/index.ts). Source locations must
refer to the original user-entered text, not formatted or wrapped SVG text.
Include the relevant entered text even when the preview cannot currently
render it, and identify that distinction; inactive retained directions are
not represented as current label copy. Continue to show other existing
preview and validation limitations.

The internal Label draft name, source references, precautionary-allergen
basis (review-report-only), numerical NIP values and application-generated
boilerplate are not claim-scanning inputs. Images, logos, external artwork
and other marketing material outside this inventory are not scanned; tell
users to review these separately. A scan only recognises a bounded set of
patterns and cannot establish that no other claims exist.

**Agreed workflow**

1. Keep the Claims tab compact: list possible claims with exact wording,
   original location, whether the text is on the current preview and a brief
   status/action. Allow manual claim entry. No green all-clear or claim that
   all wording or artwork has been assessed.
2. Suggest a classification for a clear recognised match without implying
   that its wording is legally accepted. Offer `This is a claim`,
   `Not a claim` and `I'm unsure` for ambiguous candidates. An unsupported
   or unresolved claim remains `REVIEW REQUIRED`; a person's `Not a claim`
   decision records their judgment, not a legal clearance. Avoid flagging
   common ingredient words alone merely because they occur in claim phrases.
3. Keep detected wording owned and edited at its original source. Show its
   location and an appropriate edit action; do not copy it into a second
   editable claim. Where independently entered Claim-tab wording duplicates
   found text, offer a way to link or resolve it without deleting or
   rewriting either source. A linked occurrence already on artwork must
   not be rendered again; distinct user-entered occurrences are not silently
   removed. For example, `Low sugar` in a Product name and the same words
   independently entered in Claims need an explicit duplicate decision,
   not an automatic deletion.
4. Evaluate current unsaved Label edits together with the latest saved
   Product, formulations and ingredients, as the preview does today. Mark
   unsaved Label changes and any known unsaved Product changes. If source
   wording or relevant context changes, recheck and require affected
   decisions to be reviewed; do not silently reuse a stale confirmation.
   Missing or changed sources must not be silently relinked. Other Label
   drafts remain independent.
5. Once CRS7 implements claim artwork, show exact user-selected wording even
   for unresolved or failing checks. Keep the chosen-size artwork intact:
   put prominent textual claim warnings alongside the live preview, on the
   incomplete PDF's review cover/report, and in the separate report, rather
   than silently inserting warning copy into the artwork. Never imply that
   the review copy is a finished or approved label.

**Data, persistence and implementation checks**

- Detection and review remain on-device. Future Label-specific decisions
  need stable source/occurrence links and enough context to detect changes;
  repeated wording at different locations must not share a decision merely
  because the text matches. Avoid duplicating editable source text; preserve
  the exact wording needed for trace and review.
- Save decisions with the Label draft, not the shared Product. Preserve
  existing Label and legacy Product claims, historical evidence and
  approved-version immutability. Define validation, orphaned/stale links,
  restore and any schema or backup-format changes in the implementing step;
  do not assume an upgrade is needed. Verify encrypted and unencrypted
  backup/restore and separate Label drafts.
- Future tests must cover eligible and withheld text, false positives,
  ambiguous wording, duplicate locations, manual entries, stale or removed
  sources, current Label edits versus saved dependencies, preview/report/PDF
  consistency, unsupported artwork and offline privacy. Research and
  reviewer gates remain in CRS5 and the later family-specific steps.

#### CRS2 - Find candidate claims locally

**Entry:** CRS1's field inventory and workflow are agreed.

**Exit:** Bounded local detection identifies selected example wording in
each in-scope field with its location; unrelated or ambiguous wording is
not silently changed or cleared. Tests cover case/wording variants, multiple
locations, false positives, edits, missing text and stated scan limitations.
Unmatched text is not presented as evidence that no claim exists (FR-007,
CLAIM-006, UX-007).

**Status:** Complete, 2026-11-23. The Claims tab and review report list
locally detected possible phrases with their original source, preview
status and an edit action. The scan covers the CRS1 inventory using current
Label edits and saved Product and ingredient data. It recognises a bounded
set of examples, including low/reduced/high nutrient, no-added-sugar,
gluten-free, fibre/protein source and selected health or natural wording;
it can miss claims and does not inspect external artwork. Every match
requires review; detection does not classify, clear or change wording.
Candidate decisions, duplicate resolution and persistence are implemented in
CRS3; broader missing-fact guidance remains for CRS4.

#### CRS3 - Classify and resolve candidates

**Entry:** CRS2 detects candidates and CRS1 defines confirmation.

**Exit:** Clear supported matches can be connected to existing checks;
ambiguous or unsupported wording is explicit and requires confirmation or
review. Users can address false positives without altering the underlying
copy. Tests cover exact wording and location, classification changes,
duplicate candidates, separate Labels, save/reload and backup/restore
(CLAIM-002, CLAIM-006, DATA-003).

**Status:** Complete, 2026-11-24. Each detected occurrence can be marked
`Treat as a claim`, `Not a claim` or `I'm unsure`, with the decision keyed
to its exact wording and source location. Treating a clear supported phrase
as a claim creates a Label-specific linked claim and connects the existing
draft rule where applicable; the original Product, ingredient or pack text
remains the edit source. Linked claims are read-only in the Claims panel and
provide a source-navigation action. Decisions, source links and claims
persist with separate Label drafts and backup/restore. They remain review
states, not legal clearance, and stale or unmatched wording still requires
review.

#### CRS4 - Guide users to missing facts

**Entry:** CRS3 preserves candidate and classification decisions.

**Exit:** Supported checks reuse existing reliable Product and recipe facts
and show actionable missing/conflict reasons with links to relevant inputs.
No redundant nutrition entry or broad questionnaire is introduced. Tests
cover changing a recipe, absent and conflicting facts, and unsupported
food-state bases (CLAIM-003, CALC-010, TRACE-008, UX-007).

**Status:** Complete, 2026-11-24. Existing derived nutrition and claim
evaluation results now produce concise next actions. Classification, rule
selection and wording issues focus the Label claim entry; missing,
conflicting, stale or unsupported nutrition and food-state bases link back
to Product inputs. The guidance reuses saved recipe and Product nutrition,
does not ask users to re-enter nutrient amounts, and keeps unsupported
prepared, combined and other food-state bases at REVIEW REQUIRED.

#### CRS5 - Recheck the first five draft checks

**Entry:** CRS4 is complete. Bound primary-source research to low energy,
low fat, low sugars, low sodium and good source of dietary fibre and their
relevant wording, exclusions, food-state, NIP and accompanying-content
conditions; reuse the existing source map as a starting point.

**Exit:** A traceable current-source specification identifies what is
verified, effective dates, unresolved wording/evidence and reviewer
decisions, plus independently described boundary and non-applicable fixtures.
Record any rule-data changes needed for later work, without implementing or
approving them in this research step (CLAIM-001 to CLAIM-004, TRACE-015).

**Status:** Complete, 2026-11-24. Re-verified the five draft thresholds,
descriptor/property mappings, principal restrictions and food-state basis
against current Federal Register compilations of Standards 1.2.7 and 1.2.8
and Schedule 4 and Schedule 12. Recorded compilation identifiers, dates and
primary URLs in [the regulatory research record](./mvp-regulatory-research.md).
The research confirms provision-level threshold candidates but does not
establish an exhaustive wording list, semi-solid mapping, complete
claim-triggered NIP pathway, analytical/tolerance policy or transitional
arrangement. Reviewer questions R5-C1-07 to R5-C1-12 capture those gates.
No rule data was activated or changed.

#### CRS6 - Connect verified checks and NIP interactions

**Entry:** CRS5 supplies a bounded specification; only conditions whose
sources and data are sufficient are connected.

**Exit:** Supported conditions and claim-dependent NIP requirements use
shared facts and consistent results/trace in Label and report. Missing
evidence, unsupported food states, unreviewed rules and unresolved
accompanying content remain review-required. Test each affected rule at
boundaries, non-applicability and on input/claim changes; validate changed
rule data. No reviewer gate is bypassed (INT-001, CALC-012, CLAIM-003,
CLAIM-004, TRACE-015).

**Status:** Complete, 2026-11-24. Existing derived Product/recipe nutrition
now drives a review-only interaction trace for all five draft checks. The
Label claim panel and consultant report identify the relevant NIP rows and
whether shared derived data is available, including fibre for low-sugars and
fibre claims and potassium for low-sodium claims. No NIP rows or deterministic
rule outcomes are activated; unsupported food states, missing/conflicting
inputs and unresolved accompanying-content requirements remain REVIEW
REQUIRED. Verified focused and expanded unit tests, five claims browser
journeys, typecheck, lint and unchanged rule-data validation.

#### CRS7 - Render selected claims on review copies

**Entry:** CRS1-CRS6 are complete; the artwork behavior agreed in UXS13
and existing incomplete-copy safeguards apply.

**Exit:** User-selected exact claim text appears once in live preview and
incomplete PDF, including when its check is unresolved or fails, with
prominent textual review warnings in preview, review-copy output and report.
Supported claim-dependent content is consistent; unsupported content is
identified, never invented. Tests cover duplicate locations, edit/removal,
unsaved changes, narrow screens, offline PDF, accessibility and separate
Labels (CLAIM-006, INT-001, PACK-005, UX-007).

**Status:** Complete, 2026-11-24. Selected Label claim wording is now
rendered exactly once per distinct wording in the shared SVG layout, with
explicit review-only warning text. The same layout is used by the incomplete
PDF review copy; the Label preview and consultant report also show prominent
textual warnings. Unsupported or unresolved claims are reproduced without
being rewritten, cleared or presented as legal approval. Verified layout,
report, PDF/export and claims browser coverage, including duplicate wording,
typecheck and lint.

#### CRS8a / CRS9a - No-added-sugar claims

**CRS8a entry:** CRS7 is complete. **Exit:** Bounded primary-source
research specifies wording, effective/transition dates, formulation and
supplier evidence, missing information and reviewer gates, with examples
and test boundaries. Incomplete composition does not establish that nothing
was added (CLAIM-001, DATA-003, TRACE-015; R5-03, R5-C1-05).

**CRS9a entry:** CRS8a's specification is available. **Exit:** Implement
only the evidenced, safely supported slice; otherwise retain explicit
review-only behavior and record the blocker. Verify present, absent,
unknown and nested ingredients, wording, applicability and date boundaries,
plus artwork/report and saved-data consistency (CLAIM-003, CLAIM-004).

#### CRS8b / CRS9b - Gluten-free claims

**CRS8b entry:** CRS9a is complete. **Exit:** Bounded primary-source
research specifies the relevant wording, product/evidence requirements,
allergen and cross-contact limitations, and reviewer gates, with examples
and test boundaries. A missing allergen entry is not evidence of absence
(CLAIM-001, TR-004, TRACE-015).

**CRS9b entry:** CRS8b's specification is available. **Exit:** Implement
only the evidenced, safely supported slice; otherwise retain explicit
review-only behavior and record the blocker. Test known presence, incomplete
or conflicting evidence, nested ingredients, applicability and relevant
wording, along with artwork/report and backup consistency (CLAIM-003,
CLAIM-004).

#### CRS8c / CRS9c - Fibre claims

**CRS8c entry:** CRS9b is complete. **Exit:** Research the prioritised
fibre wording and its relevant per-serving, food-state, NIP and evidence
requirements; reconcile with the existing good-source draft check. Record
sources, examples, boundaries and reviewer gates (CLAIM-001, INT-001;
R5-C1-03).

**CRS9c entry:** CRS8c's specification is available. **Exit:** Extend or
reuse the existing check only where supported, otherwise keep review-only
behavior and record the blocker. Test missing fibre, serving and food-state
bases, boundaries, non-applicability and artwork/report consistency
(CLAIM-003, CLAIM-004, CALC-012).

#### CRS8d / CRS9d - Protein claims

**CRS8d entry:** CRS9c is complete. **Exit:** Research prioritised protein
wording and its relevant nutrition, product-specific, NIP and evidence
conditions; record sources, examples, boundaries and reviewer gates,
including any applicable infant-food question (CLAIM-001, INT-001;
R5-C1-02).

**CRS9d entry:** CRS8d's specification is available. **Exit:** Implement
only the evidenced, safely supported slice; otherwise retain explicit
review-only behavior and record the blocker. Test missing nutrition or
context, boundaries, non-applicability and artwork/report consistency
(CLAIM-003, CLAIM-004, CALC-012).

#### CRS10 - Plan comparative and health-claim follow-ons

**Entry:** CRS9d is complete. Comparative and health claims remain flagged
for review initially, including reduced-fat and health-relationship examples.

**Exit:** Map reference-food, wording, NPSC, dietary-context and evidence
needs; propose separately sized source-research and implementation turns
with review gates. Do not implement or imply support in this planning step.
Self-substantiation and uncertain scientific/legal judgments remain
review-only unless a separately approved future scope establishes otherwise
(REG-CLAIM-002, REG-CLAIM-003, CLAIM-003; R5-04, R5-C1-04).

#### CRS11 - Claims end-to-end regression and scope gate

**Entry:** CRS1-CRS10 are complete; each priority family is either safely
implemented in its recorded slice or explicitly review-only with its
blocker. This engineering gate does not waive public-release requirements.

**Exit:** Exercise a baked good and a contrasting drink through text entry,
candidate detection, supported and review-only claims, NIP interactions,
preview, incomplete PDF, report, offline use and backup/restore. Include
unrecognised/ambiguous wording, missing data, changed recipes, non-text
artwork and accessibility/keyboard cases. Record commands, results, exact
supported scope, blind spots, source currency and human/release gates. No
universal coverage, regulatory acceptance or public-release approval is
implied (TEST-004, PACK-005, BKP-001, TRACE-015).

### Approved practical-workflow track

The owner approved this sequence on 2026-11-18 after an end-to-end trial.
It superseded the completed N1-N14 track as the work order at that time;
the completed UXR track is now followed by UXS above. Each
step must fit the agreed turn size; if a step cannot, agree a bounded split
before proceeding. Retain saved data, the existing functionality and
local-first operation. Do not infer missing facts, represent unreviewed rules
as approved, or imply that a review copy is a finished or compliant label.

The owner also approved incomplete PDF copies for reviewer testing.
[ADR 025](./adr/025-incomplete-review-copies.md) records the decision;
UXR2a implemented it early. Technical rule-source provenance remains
necessary even though ordinary user-entered facts should not require source
references merely to be entered.

| Step | Status | Scope and exit check |
| --- | --- | --- |
| UXR1 | Complete | Removed the Overview worked-example controls and guide without deleting saved examples; the Product list and editor use full width. Desktop and narrow Product widths, saved examples after reload and related navigation passed browser tests; type-check, targeted lint and worked-example unit tests passed (UX-007, DATA-003). Completed 2026-11-18. |
| UXR2 | Complete | Split with owner approval. **UXR2-1:** nutrition and allergen inputs, including density, retention and drained-food values, no longer require references. **UXR2-2:** classification answers, additive coverage and concentrations, composition, claim and infant-name inputs no longer need source references; optional source details are retained, including in backups. Missing facts and unreviewed rules remain unresolved. Candidate screening remains review-only; opt-in illustrative checks can now use unsourced facts, without changing official draft-rule results. UXR11 now applies the source-optional input policy to its explicitly provisional caffeine check; aggregate and carry-over checks remain unwired. Completed 2026-11-18 (DATA-003, TRACE-008). |
| UXR2a | Complete | Incomplete Review Copy PDFs include a separate review cover, exact-size artwork and a report of known gaps and layout issues. Incomplete recipes can be exported without inventing a declaration; layout overflow is reported and technical failures remain explicit. Complete and incomplete inputs, offline export, output identification, exact dimensions, overflow and failure paths were tested. This is not a finished label or public-release approval. Completed 2026-11-18 (PACK-001, PACK-005, TRACE-012). |
| UXR3 | Complete | Direct additives can be used without entering concentration; optional known mixture or concentration details remain available and unknown purity is not inferred. Additive wording is chosen per label, including nested ingredients; existing ingredient choices survive as defaults, while each label's choices are saved and backed up independently. Preview and review report use the same candidates, which remain review-only. Tested unknown and known amounts, nested recipes, multiple labels, existing data, both backup types and accessibility. Completed 2026-11-18 ([ADR 026](./adr/026-additive-label-wording.md); ADD-009, DATA-003). |
| UXR4 | Complete | Formulation expansion now shows ingredient amounts, before-cooking nutrition, recorded allergens and additives, missing information and optional source paths. Unknown amounts, conflicting evidence and unsupported nested processing remain unavailable rather than guessed. Tested incomplete and nested recipes, nutrition and allergen conflicts, narrow screens and accessibility; prior nutrition and label workflows remain unchanged. Completed 2026-11-18 ([ADR 027](./adr/027-formulation-summary.md); FORM-005, CALC-001, TRACE-008). |
| UXR5 | Complete | Finished batch weight is optional and available first; detailed weight changes and no-change confirmation remain under advanced options. Saved detailed and earlier unrepresentable processing profiles survive edits. Finished-food nutrition and retention remain optional, and weight alone does not establish retention. Tested incomplete and invalid inputs, preservation, nutrition, backups, narrow screens and accessibility. Completed 2026-11-18 ([ADR 028](./adr/028-simple-cooking-and-yield.md); CALC-002, CALC-014). |
| UXR6 | Complete | Product guidance distinguishes ingredient, finished-recipe, as-sold and consumer-prepared information; saved nutrition inputs have a concise summary and optional detailed paths. As-sold serving quantities can suggest net contents for explicit user acceptance, without overwriting existing values or converting units. Tested missing, invalid and incompatible inputs, prepared/drained cases, saved values, label preview, narrow screens and accessibility. Completed 2026-11-18 ([ADR 029](./adr/029-product-nutrition-and-pack-guidance.md); CALC-010, CALC-014, DATA-003). |
| UXR7 | Complete | The general-food route comes first and specialist questions are conditional; prior category answers remain saved. Additives from the saved recipe have a concise summary, with existing checks and inputs in an optional advanced section. Claims are explained and their illustrative toggle and hypothetical results removed; unsupported checks remain explicit. Tested route changes, saved inputs, incomplete and nested recipes, claims, accessibility and existing label workflows. Completed 2026-11-18 ([ADR 030](./adr/030-product-category-additives-and-claims.md); ADD-009, NAME-001, CLAIM-006). |
| UXR8 | Complete | Product review summarises saved product, ingredient, pack, allergen, additive and claim information, with optional nutrition values. Existing missing items are grouped with links to relevant editors; unsaved edits, unsupported content and label-specific wording are distinguished. Technical traces and historical results remain accessible. Tested missing and nested data, linked editing, unsaved work, historical trace/restore, pending allergens, narrow screens and accessibility. Completed 2026-11-18 ([ADR 031](./adr/031-product-review-summary.md); TRACE-004, TRACE-008, UX-007). |
| UXR9 | Complete | Supplier name/address, lot identification, proposed date marking, storage instructions and warning/advisory text are captured per label draft and shown consistently in its preview and review report. Empty and entered values remain explicitly unresolved for applicability, adequacy and completeness; no dates, lot codes or warnings are generated, and no universal applicability is assumed. Bounded source review is recorded in [ADR 032](./adr/032-label-pack-copy-and-applicability.md); specialised warning mapping and reviewer questions R1-17 to R1-19 remain open. Older drafts and backups remain supported. Focused unit tests (143), label browser tests (17), keyboard navigation and axe checks passed. Completed 2026-11-19 (PACK-005, TRACE-015). |
| UXR10 | Complete | Supported ingredient, allergen and nutrition presentation includes optional %DI for eligible general-food as-sold panels. New labels enable it by default; older saved drafts remain off until selected. It uses unrounded per-serving values and the owner-selected nearest whole percentage, half-up display policy, not a Code-mandated rounding rule. Infant, formulated caffeinated beverage, prepared/drained and unresolved cases remain without ordinary %DI. Preview, PDF layout and review-report output, missing values, source-linked reference data and applicable/non-applicable cases are tested. Completed 2026-11-19 (CALC-010, PACK-005). |
| UXR11 | Complete | Activated only the FCB caffeine-range check in product review and the separate report. Complete, explicit user-entered facts for every recipe ingredient, numeric density where conversion requires it, current as-sold confirmation and supported processing are required; references and dates are optional, and supplied details are retained but not independently verified, including on conflicting statements. Unknown or conflicting facts, invalid or missing conversion densities, an unconfirmed as-sold recipe, recorded mass changes, finished-food or retention adjustments, consumer preparation, and unsupported compounds remain REVIEW REQUIRED. Results are provisional and distinct from the draft rule's reviewer status. Additive, aggregate, carry-over and infant-name checks remain review-only. Targeted unit/report tests and browser/accessibility tests passed; type-check, targeted lint, engine/rules builds and rule validation passed. Completed 2026-11-19 (TRACE-015, TEST-004). |
| UXR12 | Complete | Exercised the fictional cake/cookie flow through ingredient and nested-recipe edits, product review, label preview, Incomplete Review Copy PDF, separate reviewer report, and encrypted backup/restore. Missing amounts and unknown additive information remain explicit; changed dependencies require renewed confirmation. Automated WCAG 2.1 A/AA scans and the narrow-screen label keyboard test passed; the drink contrast remained provisional or unresolved as appropriate. No external reviewer response was collected; open acceptance and release gates are recorded in [UXR12 results](./uxr12-journey.md). Completed 2026-11-19 (UX-007, PACK-005, BKP-001). |
| UXR13 | Complete | Recorded bounded AUSNUT 2023 research and two independently reconstructed cake/biscuit examples with uncooked contrasts, calculation arithmetic, factor provenance, energy and weight-change handling, unsupported cases, offline availability and unresolved reuse terms. Factors are indicative survey-method inputs, not universal or Code-prescribed rules. The initial whole-recipe-only follow-on scope was superseded by the owner direction closing UXR14-UXR15; AUSNUT ingredient-specific factors remain out of scope. No application code changed. Completed 2026-11-19 ([UXR13 research](./uxr13-nutrient-retention-research.md); CALC-002, CALC-003, CALC-015, DATA-005). |
| UXR14 | Closed by owner direction | On 2026-11-19 the owner stopped the planned search for an automatic whole-recipe retention-factor dataset for NIP calculations. Standard 1.1.1-6 permits ingredient-based calculation where the producer considers it best to represent average quantities; this is not a blanket rule for every product. No factors or code were added. Existing optional manual-retention and finished-food routes remain unchanged; specific food-state requirements remain in scope (CALC-003, CALC-004, CALC-015, DATA-003, DATA-006). |
| UXR15 | Closed by owner direction | No retention-estimate workflow will be integrated into the guided recipe-to-label path. Continue the general ingoing-ingredient calculation where appropriate and preserve the applicable reconstituted, drained and combined-food requirements under Standard 1.2.8-11 to -13. Existing optional routes and review safeguards remain unchanged (DATA-005, TRACE-008, CALC-010, BKP-001). |

UXR13-UXR15 followed UXR12. UXR13 was research and design only; the owner
subsequently closed UXR14-UXR15 as a scope decision. This did not remove
existing optional finished-food or manual-retention behavior or change the
Code-triggered food-state work. No new factors, permissions or regulatory
conclusions were approved by those steps. Existing [ADR 018](./adr/018-nutrient-retention.md)
and [ADR 022](./adr/022-nutrition-panel-integration.md) safeguards remain
in force. The completed UXR16-UXR23 work is recorded below:

### Approved workflow-clarity and label-content roadmap

The owner approved this roadmap on 2026-11-19 after an end-to-end product
trial. The purpose is to simplify ordinary workflows without discarding
useful capability or obscuring why retained complexity exists. Each step
should target one turn; split before implementation if a step cannot fit
within two or three turns. For every retained technical input, explain in
plain language what it is for, why it is being requested now, and what
depends on it. Prefer contextual progressive disclosure over a long list of
always-visible options. Keep sources optional for ordinary user-entered
facts, preserve unknown-versus-absent distinctions, and preserve saved data.
This roadmap changes workflow and presentation, not legal rules, rule
approval or release status. See [ADR 034](./adr/034-practical-workflow-progressive-disclosure.md).

| Step | Status | Scope and exit check |
| --- | --- | --- |
| UXR16 | Complete (2026-11-20) | **Ingredient entry.** Remove the routine, separate caffeine questionnaire; derive supported caffeine facts from existing nutrient, additive and composition data, and ask only for a distinction or amount that an active check needs and cannot derive. Do not equate an entered nutrient amount with proof of whether caffeine was added. Show density only for a needed mass/volume conversion, including per-100-mL nutrient data or volume-based additive calculations. Concentration is not routine label copy; request or retain it when a relevant additive calculation needs it. Exit: ordinary ingredient entry has no redundant questions; contextual explanations make retained fields understandable; unknown, conflicting, mass-only and volume-conversion cases are tested (DATA-003, DATA-006, ADD-004, ADD-005, UX-007). |
| UXR17 | Complete (2026-11-20) | **Formulation and manufacturing details.** Hide the generic completeness question for ordinary recipes; make composition coverage available only in optional composition details for supplier/compound compositions or when a calculation needs it. Keep source references optional. Keep recipe-wide manufacturing, cooking/yield and related nutrition evidence on Formulation, but make those controls optional, contextual and plainly explained; keep them distinct from Product customer directions and nutrition-basis choices. Preserve existing values and calculation behavior. Exit: an ordinary recipe is straightforward to enter, technical details explain their purpose when revealed, and incomplete, nested, saved and backed-up records remain explicit (FORM-005, CALC-002, CALC-014, DATA-003, DATA-006). |
| UXR18 | Complete (2026-11-20) | **Product nutrition and customer directions.** Consolidated the nutrition and customer-direction sections around one plain-language question, with relevant preparation, draining and accompanying-food details shown conditionally. Routine as-sold products use the saved recipe's nutrition method without a generic confirmation; automatic confirmation is limited to a current, complete recipe signature. Unknown directions remain unresolved, while reconstituted, drained, combined-food and unsupported cases retain their distinct evidence and review paths. No blanket retention workflow or regulatory rule was added. Focused Product workflow tests cover these paths (CALC-003, CALC-004, CALC-010, CALC-014, UX-007). |
| UXR19 | Complete | **Product checks and Label-specific claims/wording.** Product/category additive and prescribed-name checks remain in Product Review; additive declaration wording and claim statements are Label-specific. Claim checks use shared Product facts, saved separately. Older Product-level claim entries remain intact and inactive until explicitly copied into a chosen Label; each Label can differ. Verification covers separate persistence, report/check scoping, legacy preservation and backup compatibility (ADD-009, CLAIM-006, DATA-003, PACK-005, TRACE-008). |
| UXR20 | Complete (2026-11-20) | **Label-content gap audit.** [The audit](./label-content-gap-audit.md) distinguishes stored inputs, draft content and actual checks; records source and applicability boundaries, including unresolved R1-17 to R1-21; and prioritizes UXR21 ingredient declaration, UXR22 allergens, then UXR23 remaining pack content. No legal wording or product applicability is inferred, and no UXR21-23 implementation is included (TR-002, TR-003, TR-004, TR-007, TR-008, TR-016, TR-019, TR-021, PACK-001, PACK-004, PACK-005). |
| UXR21 | Complete (2026-11-20) | **Ingredient declaration.** The draft orders known ingredients by expanded ingoing mass, preserves nested compound display for general foods, and scales and flattens component masses for the selected infant-food route. Incomplete infant-food compounds, missing component recipes and missing ingredient names do not produce a partial declaration; issues link to the relevant ingredient or recipe. Saved names and additive wordings remain review candidates; no permitted-name mapping, exemption or additive legality is inferred. Source-linked tests cover order, nesting, unknown amounts, missing names, additive candidates and incomplete composition; focused tests, type-check and targeted lint pass. See [ADR 035](./adr/035-draft-ingredient-declaration.md) (SRC-005, SRC-017; TR-003, ADD-009, FORM-005, TRACE-008). |
| UXR22 | Complete (2026-11-20) | **Allergen declarations.** The draft uses context-specific ingredient-list and summary names, bolds required ingredient-list names, and emits a separate bold `Contains` summary only when evidence and applicable conditions resolve. A compound with explicitly complete supplier composition can derive parent coverage only when it has no separate allergen evidence or additive-source records; each included component still needs current allergen coverage. Incomplete evidence, exemptions and unresolved sulphite conditions remain `REVIEW REQUIRED`. PAL is optional user-entered text with a basis note; no default is generated. Focused allergen cases and the full 68-test browser/accessibility suite pass, as do unit tests, type-check, lint, build and rule validation. See [ADR 036](./adr/036-allergen-declarations-and-pal.md) (TR-004, TR-019, DATA-003, TRACE-008). |
| UXR23 | Complete (2026-11-23) | **Remaining pack content.** Reconcile label-specific supplier/address, lot, date, storage and warning/advisory copy with Product net quantity and physical label dimensions. The Label workspace shows an entered/not-entered review summary for every pack-copy field. Preview blocks retain plain labels and the report records entered text, missing text and unresolved applicability, adequacy, exceptions and size proof. No values or determinations are generated, and PAL remains separate (PACK-005, TRACE-008, TRACE-015). |

### Approved post-I9 nutrition and product track

The owner approved this sequence on 2026-11-17 and chose to complete nutrient
and food-state foundations before redesigning Product and labels. The Product
layout was approved in N9. This completed track was superseded by UXR above
and had replaced the overlapping earlier proposed G sequence below. It does
not approve a regulatory release, change locked decisions or remove existing
export safeguards. Claims remain a later public-MVP commitment.

Each step has the stated entry/exit scope and should aim to fit one turn;
two or three turns are an exceptional maximum. If a scope cannot fit, agree
a bounded split rather than silently adding work. Tests include missing inputs,
boundaries and non-applicability as relevant. Ask only for facts that matter
and cannot be reliably derived. Unknown is never zero or a PASS. Processing
mass alone does not establish which nutrients were retained or lost. The
owner does not prioritise compatibility with pre-release draft saves, but
approved versions remain immutable and data must not be deleted without
approval.

| Step | Status | Scope and exit check |
| --- | --- | --- |
| N1 | Complete | Research food-state requirements from primary sources: as sold, prepared, reconstituted and drained, including relevant conditions and unresolved cases. Exit: source-linked requirements and explicit limits; no application implementation (CALC-002, CALC-010, CALC-014). |
| N2 | Complete | Research the relevant nutrient catalogue, including vitamins, minerals, forms and units. Exit: source-linked catalogue and explicitly identified gaps; do not assume one list covers every food and purpose (ING-002, DATA-003, DATA-006). |
| N3 | Complete | Support the verified nutrient identifiers, units, sources and unknown values in storage and calculations. Exit: unit-boundary and backup round-trip tests; no invented zeroes. |
| N4 | Complete | Make expanded nutrient entry searchable and optional. Exit: values can be entered, edited and restored without requiring all nutrients. |
| N5 | Complete | Propagate supported additional nutrients through nested recipes. Exit: independent calculations, missing-evidence cases, source paths and no double counting are tested. |
| N6 | Complete | Connect supported processing yield and finished-food evidence to calculations. Exit: documented supported and incomplete cases; mass change alone does not invent nutrient retention or loss. |
| N7 | Complete | Support tested prepared and reconstituted cases, directions, additions and food-state-specific amounts. Exit: applicable basis is clear, and missing facts require review. |
| N8 | Complete | Support tested drained cases using appropriate drained quantities and evidence. Exit: supported and incomplete cases are tested without guessing nutrient distribution. |
| N9 | Complete | Propose the Product journey based on the saved recipe and genuinely independent product/pack facts. Exit: owner can review the design and layout before implementation. |
| N10 | Complete | Build the agreed Product journey. Exit: common-food and drink workflows, actionable gaps and edit persistence are tested. |
| N11 | Complete | Connect supported nutrition rows and food-state columns to the label preview and trace. Exit: output matches independently checked calculations; unsupported rows remain explicit. |
| N12 | Complete | Connect supported ingredient, allergen and general pack content. Exit: traceable previews and review reports show missing or unsupported content, without invented facts. |
| N12a | Complete | Move the separate Review & trace functionality into the appropriate Product and Labels workflows, then remove its navigation. Exit: product-level checks, source paths, calculations, unresolved evidence and saved evaluation/version history remain accessible in context; label-specific review and report access remain on Labels; no existing result, history or safeguard is lost. |
| N12b | Complete | Design the Labels workspace for previewing, generating, saving and customising labels. Exit: owner can review the proposed workflow, editable layout controls, local draft persistence and links to Product before implementation; open design choices are explicit. |
| N12c | Complete | Implement the agreed Labels workspace. Exit: supported label drafts and layout choices can be saved, reopened and customised locally; preview and generation use the selected product and settings; validation, backups, unsaved edits and existing export safeguards are tested. |
| N13 | Complete | Make the selected label preview, review report and PDF consistent with supported information and layout settings. Exit: output and layout tests pass; existing export policy and non-certification safeguards remain unless changed with approval. |
| N14 | Complete | Exercise complete and incomplete product and label journeys, contextual traces, accessibility, edits and backup/restore. Exit: regressions and remaining release blockers are documented; no public-release approval is implied. |

#### Navigation and label-workspace direction

On 2026-11-17 the owner clarified the intended navigation: **Products** is
for product-level checks and their explanations; **Labels** is for label
preview, generation, saving and customisation. The separate Review & trace
page is to be retired after its functionality is available in context.
The earlier N9 sketch below records what was implemented at N10; its
standalone Review & trace link is superseded by this direction. See
[ADR 024](./adr/024-product-and-label-workspaces.md).

- Preserve the current input and calculation traces, preparation and
  draining evidence, ingredient and allergen paths, missing/conflicting
  items, rule sources and saved versioned results. Show product-level
  review within the selected Product; retain label-specific explanations
  and the downloadable review report on Labels. Do not lose approved
  versions or recompute historical results as if they were current.
- Labels should work from the selected saved Product, rather than asking
  the user to enter its ingredients or checks again. Changes to a Product
  or its dependencies must be reflected or explicitly identified as stale;
  navigating between pages must not silently discard unsaved work.
- The label-workspace design must address editable dimensions, orientation
  and margins for a single panel (PACK-001), local saving and reopening,
  preview and generation, and how the label is associated with its Product.
  Propose which appearance, arrangement and content controls are supported.
  The agreed initial editing, draft and backup behaviour is recorded in
  N12b below; do not assume arbitrary mandatory wording can be edited
  safely or that layout customisation determines legal compliance.
- No local draft save, preview or review report is legal clearance. Label
  PDF export remains subject to the existing release, missing-content,
  layout and non-certification safeguards. Do not bypass those safeguards
  merely to enable the new workspace (DATA-003, VER-002, TRACE-004,
  TRACE-006, TRACE-008, PACK-001, PACK-004, PACK-005, UX-007).

N12a completed 2026-11-17: Product review now includes the existing input
and food-state traces, saved evaluation history and provisional caffeine
check. Labels keeps its preview, explanations and downloadable report and
links to the selected Product's review. Product selection and unsaved edits
are preserved across these journeys, and Labels identifies unsaved edits
that are not yet reflected in its saved-product preview. Historical results
remain unchanged; the separate Review & trace navigation has been removed.
See [ADR 024](./adr/024-product-and-label-workspaces.md)
(TRACE-004, TRACE-006, TRACE-008, VER-002, UX-007).

### N12b - Agreed Labels workspace

**Status:** Proposed and approved by the owner on 2026-11-17. This is a
product and interaction design, not new regulatory research or approval.
N12c implements the agreed scope and behaviour below; N13 and N14 remain subsequent work
(PACK-001, PACK-004, PACK-005, VER-001 to VER-004, DATA-003,
LOCAL-006, BKP-001, BKP-005, UX-007).

#### Proposed journey

1. **Choose a Product and a label draft.** Labels opens with a list of saved
   drafts, their Product and last-saved time. Create a draft from a saved
   Product, or open an existing draft. Allow several independently
   named drafts for one Product, for example different pack sizes; duplicate
   an existing draft to start another. Creating a label does not duplicate or
   ask for the recipe again. With no Product, explain that a Product is
   needed and link to Products.
2. **Set the physical label.** Enter width and height in millimetres,
   portrait or landscape, and top, right, bottom and left margins. The
   existing 100 x 150 mm portrait, 6 mm margins can be an editable starting
   point, clearly labelled as an example, not a recommended or compliant
   size. Orientation and dimensions must agree; explain invalid dimensions,
   margins or orientation instead of silently changing them. The preview
   represents the entered dimensions; screen size is not a physical-size
   measurement.
3. **Customise the draft.** Use a single-column, single-panel pack-copy
   layout with adjustable text size by content block and spacing between
   blocks, plus the dimensions and margins above. Keep the existing block
   order initially, with ingredient and allergen content together. Do not
   silently shrink text to fit. Identify overflow and unverified type size
   visibly in words, with the affected block and a suggested action. These
   controls are design choices, not a determination that type, placement,
   adjacency or legibility meets legal requirements.
4. **Preview and review.** Show the generated draft alongside the controls
   on wider screens and sequentially on smaller screens. Make missing,
   unsupported and conflicting content visible and link to the relevant
   Product, recipe or ingredient to fix the source. Keep the current
   declaration, allergen and nutrition explanations and the separate review
   report accessible. A missing input is not zero, absent or PASS.
5. **Save and reopen.** Save the draft name, Product association and layout
   choices locally, even if product evidence is incomplete. Explicitly show
   unsaved changes; preserve work on navigation or ask before discarding it
   when switching drafts. Reopening restores the saved choices, not a
   promise that the Product or its dependencies have remained unchanged.
6. **Download.** Keep the existing review report available with its current
   meaning: it is not a label. Label PDF export stays unavailable until the
   existing blockers are resolved through the appropriate later approvals.
   The eventual label PDF must use the selected settings at exact physical
   size; N13 addresses preview, report and PDF consistency. A review report,
   saved draft or preview does not certify compliance.

#### Product changes, history and backup

- **Live draft behaviour:** a label draft remains associated with
  the same Product. Preview uses the latest *saved* Product and its saved
  dependencies; it does not include unsaved Product edits. If the Product,
  an ingredient, recipe or other relevant dependency changes since the
  label was last saved, identify that the preview has changed and that
  review is needed. Retain the saved layout choices; do not silently present
  the earlier result as current or claim it is an unchanged historical
  snapshot. Missing references are explicit review items.
- Record enough dependency-change information to make that warning reliable,
  including nested dependencies. This draft mechanism does not replace
  version-pinned results, rule/source provenance or reproducible approved
  history required by VER-001 to VER-004 and VER-006. Approved versions
  remain immutable; editing one must create a new draft/version rather than
  changing the approved record. Do not imply those later capabilities exist
  merely because a draft can be saved.
- Include label drafts and their Product links in versioned local backups
  and restore them losslessly with the rest of the workspace. Older backups
  without labels must be handled explicitly; restore remains an inspected,
  user-confirmed operation, not a silent merge or deletion. Missing Product
  links after import/restore must be reported, not automatically replaced
  with a different Product.

#### Initial boundaries and owner decisions

- The first implementation will not provide free-form artwork placement,
  logos, colour/font-family selection, arbitrary block reordering or multiple
  panels. Those are potential later enhancements, not implied to be
  unnecessary. The owner chose this bounded scope for now and can revisit it
  after seeing it in use.
- Generated ingredient, allergen, nutrition and other product-derived text
  is not freely edited or hidden in the label editor. Correct the underlying
  Product or evidence instead. Optional commercial text and other content
  not yet modelled are deferred, not silently treated as legally irrelevant.
  Supplier, date, lot and storage details, warnings, ingredient allergen
  emphasis and other existing gaps remain visible; the current food-state
  and nutrition limitations in ADR 022 also remain.
- The owner chose multiple named drafts per Product, the bounded initial
  customisation scope, and the live preview with an explicit change warning.
  These are product decisions, not statements about law.

N12c completed 2026-11-17: Labels now saves multiple named drafts with
single-panel layout choices locally, supports duplication and preserves
unsaved edits across navigation. Its preview uses the latest saved product
and traces nested dependencies to warn about changes; missing product links
remain explicit. Inspected version-3 backups preserve labels, and older
backups warn before replacing existing drafts. Layout validation, overflow,
restore, accessibility and existing export safeguards have been tested.
These drafts are not approved or version-pinned historical results; label
PDF export remains blocked. N13 still addresses preview, report and PDF
consistency (PACK-001, PACK-004, PACK-005, VER-001 to VER-004, DATA-003,
LOCAL-006, BKP-001, BKP-005, UX-007).

N13 completed 2026-11-18: the review report identifies the selected draft
and current layout, layout issues and displayed nutrition values, including
unavailable values, basis and optional combined-food column. It identifies
unsaved, changed or invalid preview states rather than implying an approved
or historical result. The preview and PDF renderer use the same generated
SVG; fractional physical dimensions and text sizes are not silently rounded
in that SVG. Output tests include prepared, combined and drained food, and
PDF page dimensions. Label PDF export remains blocked and physical print
proof, nutrition policy and regulatory review remain outstanding
(DATA-003, CALC-010, CALC-014, PACK-001, PACK-004, PACK-005, TRACE-008).

### N14 - Journey and release-gate check

Completed 2026-11-18 as an engineering check, not public-release or
regulatory acceptance. The fictional cake-and-cookie journey exercises
supported and incomplete nutrition inputs, nested ingredient/allergen
paths, edits and stale confirmations. It now also saves distinct labels for
both products, checks the nested-dependency warning and restores their
settings and Product links from an encrypted backup. The incomplete cookie
retains unavailable nutrition values and cannot generate a preview from its
incomplete declaration. “Complete” here means the exercised inputs are
sufficient for a supported draft calculation, not that a label is legally
complete.

The browser suite also covers the fictional drink, prepared and drained
foods, Product review and historical results, label duplication, missing
links, restore replacement, offline report access and both backup types.
Automated WCAG scans include Product review and Labels; a narrow-screen
keyboard test covers label editing and saving. These checks do not replace
manual assistive-technology testing or physical print proof. The full
unit and browser suites, build, type-check, lint and draft rule-data
validation passed. No application regression was found in the exercised
paths (DATA-003, CALC-014, TRACE-004, TRACE-006, TRACE-008, PACK-001,
PACK-004, BKP-001, BKP-005, UX-007).

**Remaining release blockers and limits at N14:** UXR2a subsequently enabled
incomplete review-copy PDFs only; it did not resolve the public-release
limitations listed here.

- **Label assembly and export:** required pack information and the
  applicability of warnings/advisories are not fully assessed or assembled;
  supplier name/address, lot, date and storage details, ingredient allergen
  emphasis and other content remain incomplete. Label PDF export is still
  blocked. See [ADR 023](./adr/023-pack-and-declaration-integration.md).
- **Nutrition and food states:** the NIP display policy and fixtures remain
  reviewer-gated (R1-13); prepared per-100 mL, additional/claim-related rows,
  infant-food formats and some food-state combinations remain unsupported or
  review-only. See [ADR 022](./adr/022-nutrition-panel-integration.md).
- **Reviewer and print acceptance:** R3-01 reviewer-verified golden
  fixtures and R1-21 minimum-size/physical print proof remain open P1-6 and
  P1-5 gates. Automated layout and accessibility checks are not a substitute
  for those reviews.
- **Regulatory coverage:** the installed rule data is draft and no rules are
  enabled; additive, prescribed-name and claims mappings, selected-cohort
  fixtures and applicable reviewer approvals remain outstanding. Unsupported
  cases must remain REVIEW REQUIRED. See the
  [Phase 2 gate record](./phase2-gate-record.md) and
  [reviewer questions](./reviewer-questions.md).
- **Historical reproducibility:** approved record snapshots are retained,
  but label drafts and their change signatures do not pin the full
  ingredient/formulation, rule and source dependency history. Historical
  reproduction remains open (VER-003, VER-006, VER-009).

N14 does not close the earlier unchecked Phase 1 or public-MVP gates, approve
any rule, or authorize label export. No new regulatory research or approval
was performed in this check.

2026-11-18 usability feedback: the Formulations page now uses the same
full-width, expandable-section pattern as Ingredients. Recipe input,
processing and save validation remain unchanged (FORM-004 to FORM-006,
UX-007). Internal draft headings and review notes are separated from the
pack-copy preview; the surrounding warning, review report and label export
block remain. The owner also identified excessive source-related review
messages, which remain unresolved.

N1 completed 2026-11-17: [food-state nutrition research](./food-state-nutrition-research.md)
records the primary-source triggers and outcomes for water reconstitution,
draining and food prepared or consumed with another food. These provisions
are conditional, not a universal choice of one food state. Missing
composition, yield or preparation evidence cannot be replaced by an assumed
retention factor. Overlapping triggers and product-specific exceptions remain
explicitly bounded for later work. N1 changed documentation only.

N2 completed 2026-11-17: [nutrient catalogue research](./nutrient-catalogue-research.md)
records general NIP entries, conditional entries, Schedule 1 vitamins and
minerals, forms and units, calculation components and product-specific
limits. It identifies sources and gaps rather than treating one list as
universal. N2 changed documentation only.

N3 completed 2026-11-17: [ADR 016](./adr/016-nutrient-data-foundation.md)
records the expanded identifiers, units, evidence and conservative
expression handling. Mass-based ingoing calculations, sourced-density
conversion and backup round trips are tested; a missing quantity or
unsupported form is not treated as zero. The searchable editor and expanded
nested propagation were planned for N4 and N5.

N4 completed 2026-11-17: the ingredient editor searches the expanded
catalogue and records optional mass- and volume-based values, units and
user-supplied forms. Missing forms are not inferred. Edits and backup restore
preserve saved evidence, while removing or clearing a value leaves it unknown.
Expanded recipe propagation and label rows were planned for later steps
(ING-002, DATA-003, DATA-006).

N5 completed 2026-11-17: supported additional nutrients flow through nested
recipes as ingoing estimates, using either whole-compound or component
evidence, not both. Tests check independent weighted results, unit and
sourced-density conversion, repeated source paths, missing evidence,
incompatible forms, known zero and insufficient precision. These estimates
are not finished-food or label results; processing and food-state support
remain subsequent steps (CALC-001, CALC-015, DATA-003, DATA-006).

N6 completed 2026-11-17 in two owner-approved turns: optional finished-recipe
values, then independently sourced whole-recipe nutrient retention with
recorded batch yield. Each route requires confirmation and leaves missing or
stale evidence for review; weight change alone does not determine retention.
Processed nested recipes, nutrient additions and unsupported factors remain
review cases. See [ADR 017](./adr/017-finished-food-nutrition.md) and
[ADR 018](./adr/018-nutrient-retention.md)
(CALC-002, CALC-003, CALC-015, DATA-003, DATA-005, DATA-006).

N7 completed 2026-11-17: optional consumer-preparation directions and one
evidenced addition support a confirmed mixing-only calculation, with
independent prepared servings and sourced densities where needed. Missing or
conflicting inputs require review, and changes invalidate the relevant
confirmation. Prepared results are trace-only until N11; draining remains N8.
See [ADR 019](./adr/019-consumer-preparation.md)
(CALC-002, CALC-011, CALC-014, CALC-015, DATA-003, DATA-006).

N8 completed 2026-11-17: directly evidenced drained-food values support
per-100 g and recorded serving calculations, with source and directions
shown in trace. Missing or stale evidence, and draining combined with other
preparation, remain review cases; drained weight alone does not determine
nutrient distribution. Label integration remains N11. See
[ADR 020](./adr/020-drained-food-nutrition.md)
(CALC-002, CALC-011, CALC-014, CALC-015, DATA-003, DATA-006).

N10 completed: the Product editor now uses expandable sections, shows
saved recipe and nutrition evidence, and keeps pack facts separate from
consumer directions. Mixing, draining and other directions can coexist;
unknown, conflicting and unsupported cases remain review-only. Older
records without a direction status or other recorded evidence of directions
remain unknown. The editor preserves
unsaved work while navigating to ingredients or recipes and warns before
discarding it. Classification retains its automatic saves; additive and
claim inputs retain their own save controls. Common-food and drink
workflows, conditional directions, edits, backup/restore and accessibility
have browser and unit coverage. Prepared and drained label columns were
left to N11; this step did not approve a regulatory release.
See [ADR 021](./adr/021-product-journey.md)
(UX-004, UX-007, UX-009, CALC-002, CALC-014, DATA-003, DATA-006).

N11 completed 2026-11-17: the draft panel and trace distinguish as-sold,
reconstituted, drained and supported combined-food results. The combined
column is calculated only where the recorded mixture matches one product
serving. Overlapping or unclear directions and missing or stale evidence
remain review cases. Prepared volume unit quantities, additional and
claim-triggered rows, and correct servings per pack for prepared or drained
servings are not established by this step. The general panel, product
classification and applicable exceptions still require review; label export
remains blocked. See [ADR 022](./adr/022-nutrition-panel-integration.md)
(CALC-010, CALC-011, CALC-014, CALC-015, DATA-003, DATA-006).

N12 completed 2026-11-17: recorded name, net quantity and eligible consumer
directions are shown as draft pack content, alongside candidate ingredient
and allergen information. The review report and trace retain ingredient
paths, available specification details and allergen evidence, including
unresolved cases. Missing pack fields and unsupported ingredient-list
allergen emphasis are explicit; no absence or legal exemption is inferred.
Supplier, lot, date-marking and storage data are not yet collected, and
legal applicability and warning content remain unresolved. Label export
remains blocked. See [ADR 023](./adr/023-pack-and-declaration-integration.md)
(CALC-001, DATA-003, TRACE-008, PACK-005).

### N9 - Agreed Product journey

**Status:** Approved by the owner, 2026-11-17; implemented in N10. This is the
agreed workflow and layout, not new regulatory research. See
[ADR 021](./adr/021-product-journey.md).
It preserves the existing release and export gates and does not certify a
product or label (UX-004, UX-007, UX-009, TRACE-008, TRACE-012).

#### Agreed layout

Use one Product page with expandable sections, like the ingredient editor,
instead of requiring users to work through a separate screen for every topic.
The first sections are open for a new product; advanced and conditional
details expand when relevant. Every section shows a text status such as
**Not entered**, **Needs attention**, or **Information entered**; none means
legally compliant. A save control remains visible and the draft can be saved
with missing facts.

```text
PRODUCT: [working name]                         [Save product draft]

1. Product and recipe
   Product name: [                         ]
   Recipe:       [ choose saved recipe     ]   [Open recipe]
   From the recipe: ingredients, processing and selected nutrition method
   [What needs attention in this recipe?]

2. Pack and servings
   Net contents: [       ] [g / mL]
   Serving size: [       ] [g / mL]    Servings per pack: [       ]
   Food form:    [ solid / liquid / not sure ]

3. What does the customer do before eating?
   [No such directions] [Directions apply] [Not sure yet]
   If directions apply, record the relevant instructions:
   [Mix with water or another food]  [Drain]  [Other / unsure]
   More than one can apply. Show only the relevant detail sections.

4. Nutrition and food-state details
   Show the recipe's selected as-sold nutrition method and its evidence.
   Ask for product confirmation and a sourced density only when needed.
   If relevant: preparation amounts and added-food evidence; or drained-food
   values and evidence. Show each basis and missing information separately.

5. Product type, additives, names and claims
   Existing product-type questions, additive/name checks and optional claims.
   Show known recipe evidence first; ask only for independent or unresolved
   facts. Keep the existing detailed checks and sources accessible.

6. Review and next actions
   [Needs attention: specific item + where to fix it]
   [Open Review & trace]  [Open Labels]
   Draft only; no result is a legal clearance.
```

#### Behaviour and safeguards

- **Recipe is the source, not a second questionnaire.** Display known
  ingredients, nested sources, processing and the selected nutrition method
  from the linked recipe. Link to the recipe or ingredient to change them.
  Do not ask the user to enter the recipe or its nutrient values again.
  Show gaps, conflicting evidence and changes that need reconfirmation.
  Ingredient presence may establish a supported fact; incomplete data does
  not establish absence (FORM-005, DATA-003).
- **Pack facts are independent.** Ask for net contents, serving, servings per
  pack and food form when not reliably known. Reuse an existing serving only
  for the same food state and unit. A servings-per-pack suggestion is
  appropriate only when the recorded quantities have a compatible basis and
  units; identify it as a suggestion requiring confirmation, not a legal
  rounding rule. Otherwise leave it for the user to enter.
- **Directions are not one exclusive food state.** Ask whether the label has
  relevant consumer instructions; allow mixing/reconstitution, draining and
  other instructions to coexist. “Not sure” stays unknown. Existing records
  without directions do not automatically mean “no directions”. Distinguish
  manufacturing processing, the product as sold and what the customer does.
  Do not infer the legal NIP basis or an exemption merely from a selection;
  unresolved or overlapping cases require review (CALC-002, CALC-014).
- **Only show genuinely needed details.** For a supported mixing case, use
  the existing recipe as the product input and request the added food,
  amounts, directions and confirmation. For a drained case, use direct
  drained-food evidence; do not infer nutrients from drained weight. Request
  the appropriate sourced density only for a conversion that needs it.
  Reuse the already-entered drained serving when its basis is the same.
  Existing N7 and N8 limits remain visible; unsupported processing,
  combinations, missing inputs and conflicting evidence remain review cases.
- **Preserve checks, evidence and user work.** Retain the current specialised
  caffeinated-beverage and infant-food questions, additive/name and claim
  checks, their source information and illustrative-preview controls. Do not
  suppress an unresolved check because a section is collapsed. Reuse
  equivalent facts only when the basis and evidence really match; retain
  conflicting facts for review rather than silently overwriting them.
  Previously entered preparation details remain available if a section is
  switched off. Relevant changes make existing confirmations stale.
- **Saving and accessibility.** The product stays on the device. Saving an
  incomplete draft is allowed; validation and save errors are explicit.
  Navigating to edit a recipe or ingredient must not silently discard
  unsaved product work. Sections, errors, statuses and actions work by
  keyboard and do not rely on colour alone. Approved snapshots remain
  immutable and existing data is not deleted without approval.

#### Examples and implementation boundary

An ordinary cake can select its saved recipe, enter pack and serving facts,
and record that there are no relevant consumer preparation directions. If
its cooking or finished nutrition is unresolved, the page points back to
that evidence rather than asking for an as-sold recipe again. A canned food
with draining directions shows drained-food evidence, not an assumed
distribution of nutrients. A caffeinated drink retains its applicable
classification and additive questions and asks for a sourced product density
when the supported volume calculation needs it. These are examples, not
universal templates or determinations of applicable law.

N10 implements the agreed Product layout and preserves the existing
workflows, with tests for ordinary food, the drink, unknowns, conditional
directions, edits and persistence. The direction status and independent
preparation and draining flags represent multiple directions and unknowns
without inferring “no directions” from missing older data, overwriting saved
facts, or changing immutable versions.

N11 connected the supported nutrition rows and food-state columns described
above; N12 connected the currently supported ingredient, allergen and pack
content. N12a-N12c now cover the requested navigation and label workspace,
N13 covers preview/report/PDF consistency, and N14 covers end-to-end release
blockers. The proposal does not add unsupported regulatory checks,
promise a complete label, or relax existing export restrictions.

### Approved ingredient and formulation track

The owner approved this sequence on 2026-11-16. Keep to each step's agreed
entry and exit criteria: aim to complete it in one turn, with two or three
turns as an exceptional maximum. Do not silently expand a step to encompass
all related requirements; record genuinely later work separately. I1's general
direction is agreed; detailed interactions remain open. The approved goal is a flexible foundation
for most simple cakes and cookies, not a claim that every baked good is
supported. The drink remains a contrasting test case.

| Turn | Status | Scope and exit check |
| --- | --- | --- |
| I1 | Direction agreed | Single-page ingredient entry with expandable sections, inline compound-component entry and a recipe screen with ingredients and amounts together. Detailed interactions and preservation checks continue in later steps. |
| I2 | Approved | Research and agree general ingredient data, nutrition, allergen and additive identity/evidence; distinguish common, optional and conditional information. Bounded source review and the agreed approach are recorded below. |
| I3 | Complete | Basic ingredient creation/editing uses a single expandable page and general names, without mandatory drink-specific questions. The earlier specialised controls were retired during I6 (ING-001, DATA-003, DATA-005). |
| I4 | Complete | Nutrient and allergen entry accepts optional general sources; supported nutrient values can be entered on either basis with explicit units. Unknowns remain unknown, and volume nutrition calculations currently require sourced ingredient density (ING-002, ING-003, DATA-003, DATA-005, DATA-006). Catalogue expansion remains future work. |
| I5 | Complete | Support an additive as an ingredient; the redundant additive-within-ingredient entry was replaced by component entry during I6. Additive permission coverage expands separately (ING-001, DATA-003, DATA-005). |
| I6 | Complete | Guide entry of complete and partial compound ingredients and composition inline, with explicit unknown amounts and nutrition basis. |
| I7 | Complete | Rebuild recipe/formulation entry, quantities, nested recipes and relevant process/yield details; preserve cycle protection. |
| I8 | Complete | Carry supported nutrient, allergen and additive evidence through formulations, with source paths, missing/conflicting data and no double counting. |
| I9 | Complete | Exercise multiple fictional cakes, cookies and the drink, including incomplete evidence and a direct additive; test accessibility, edits, backup/restore and regressions. |

I1 discussion: the owner chose a single ingredient page with expandable
sections over a step-by-step wizard. Proposed sections are basics, contents,
nutrition and allergens, with additive identity and supplier details shown
where relevant. A recipe builder should show ingredients and amounts together
and allow an ingredient to be added without losing the recipe in progress.
Ingredient data is not limited to supplier specifications: users can enter
known values manually from a supplier, a product label, a food-composition
database or another source. Capture the source and basis where relevant; do
not imply automatic database integration or that a user-supplied value has
been independently verified. Recipe amounts and ingredient nutrient bases are
distinct inputs. Enter known compound components within the ingredient
workflow; complete component-list coverage does not imply known proportions.
The owner agreed this general direction; detailed interactions remain open.
This is not approval to discard evidence or assume a specific migration.

I3 was a layout and basic-entry step, not the finished ingredient workflow.
I4 subsequently added general sources and the additional-nutrient control.
Direct additives were added in I5; I6 subsequently added inline compound
composition without requiring a separately saved formulation.

I4 owner feedback: use one coherent nutrition-entry area for known values,
regardless of their source, rather than separating "nutrient" and "supplier"
values. Make the basis clear; preserve existing per-100 g and per-100 mL
values and do not silently convert, discard or imply calculations use a
basis they do not yet support (ING-002, DATA-003, DATA-006). Simplify the
allergen confirmation wording so it clearly confirms ticked allergens are
present and unticked allergens are absent; retain the ability to leave
unknowns unconfirmed (ING-003, DATA-003). Make better use of desktop width.
The owner considers the earlier drink-specific and other supplier-information
questions too specific for their present location and form; reconsider their
placement and presentation rather than treating them as permanent. Preserve
existing evidence and access to it while deciding how to replace those
controls (DATA-005).

I4 progress: the nutrition section has one visible basis at a time; switching
bases preserves both existing sets. Nutrition and allergen sources can be
entered independently of supplier specifications, with a source type, dated
reference and saved evidence (ING-001, ING-002, ING-003, DATA-005). The
mass-based recipe calculator can use a per-100 mL ingredient value when
that ingredient has a positive, dated, sourced density; otherwise the value
is unavailable rather than converted using a guessed or finished-food density
(CALC-010, DATA-003, DATA-006). If both bases have a value for the same
nutrient, the calculator prefers the per-100 g value. I8 flags differences or
an unavailable density for review; it does not reconcile the two. The allergen confirmation wording is shorter,
and the ingredient editor uses the available desktop width.

I4's optional-nutrient control supports the existing domain identifiers in
g or mg per 100 g or 100 mL. It is not a complete catalogue of vitamins or
minerals. Optional values are saved with their individual source and are not
automatically added to labels. I8 calculates ingoing estimates when every
selected ingredient has the optional nutrient; incomplete values remain
review-only. Finished-food and label use, and catalogue expansion, remain future work.
Current-format backups are tested, but compatibility with an actual earlier
v2 app remains unverified; see ADR 011. I6 later retired the specialised
questions from the ingredient editor.

I5: a single ingredient can be identified as an additive using its
own name and existing additive-source details; the same source is used by the
current additive report and a direct declaration candidate is not printed as
a second ingredient. A source may be promoted rather than re-entered.
General dated evidence can confirm additive-source coverage. No permission,
purity, concentration or legal identity is inferred from a name or number.
Complete inline composition was added in I6; I8 adds nested additive propagation
with review for possible parent/component overlap. Actual
previous-v2 app compatibility for these new fields remains unverified.
Incomplete compositions and possible overlapping additive evidence cannot
produce a calculated final concentration.

I6 owner feedback: make single ingredients, additives and ingredients made
from other ingredients clear choices. Components should be entered once, not
repeated as separate additive records. Sources and dates should be optional
supporting information; unknown evidence must remain unknown. Preserve
existing evidence and avoid changing shared formulations silently. The first
interface change moves the additive choice to the ingredient type field and
reuses matching saved additive details; code and purpose now appear in Basics.
The direct additive no longer asks whether it was added to itself. Optional
label-wording choices use plain language and remain review-only; saved source
status and declaration selections are preserved, not inferred or discarded.
The owner wants Included Ingredients to contain the compound components, and
compound nutrition to use either a component-derived value or an optional
whole-ingredient value, clearly indicating the selected basis. Existing
whole-ingredient values must be preserved. The ingredient screen now accepts
known components and optional amounts inline, with explicit complete/partial
list coverage and no mandatory composition source. It saves the ingredient
and a new composition atomically and refuses cycles; edits make a separate
composition rather than modifying a shared recipe. A complete list may still
have unknown amounts; it cannot be scaled or used for nutrition until all
amounts are known. Previous compositions remain available; recipes with
processing profiles must currently be edited in Formulations. Compound
nutrition now has an explicit component or whole-ingredient basis: existing
records without a choice continue using the whole-ingredient profile, while
new compound records default to components. Selecting components calculates
from the complete quantified composition and never adds its parent profile.
Incomplete compositions, missing evidence and processing effects remain
unavailable for calculation. A product's nutrition-basis confirmation changes
when the expanded component recipe changes. Switching choices preserves saved
whole-ingredient values. Nutrition, allergen and additive coverage can now be
entered without sources; optional source controls are collapsed. Unverified
information remains flagged for review, and known allergens are retained.
The owner subsequently retired the older supplier-specific questions and the
separate additive-entry section from the ingredient editor. A direct additive's
concentration and optional source are now entered in Basics; its allergens use
the normal Allergens section. Other ingredients, including additives, are
entered once under Included ingredients. Existing legacy fields remain in the
data model but are not editable in this workflow; older records with separate
additive entries are flagged for review. The owner does not require old
pre-release saves to remain compatible. No saved data was deleted. I6's entry
scope is complete; nested propagation remains I8.

A direct additive with unknown saved status is treated as added when used as a
recipe ingredient, without changing its saved status or overriding an explicit
carry-over or processing-aid status. Known concentration and density values
can now be calculated without a dated source. UXR2 subsequently removed
source-only warnings and the source-only permission gate; rule approval and
other permission safeguards still apply. Missing quantities, purity, density or other
required calculation inputs are not guessed. I8 propagates supported additive
sources through compound ingredients (ADD-004, ADD-009, DATA-003).

I7 captures an optional direct-additive use on individual formulation lines
and compound ingredient components. The same ingredient can have different
uses in different paths; ordinary entry does not require the question.
Uncertain uses and potential processing aids require review rather than
being silently excluded from calculations or declarations. Carry-over and
processing-aid eligibility are not assessed. I8 propagates additives inside
complete compound ingredients (ADD-007, ADD-010, DATA-003). See
ADR 013.
An ingredient cannot currently be both a direct additive and a compound
ingredient: a supplied additive blend with carriers can record concentration
but cannot list those carriers on that same record. Design this case before
claiming general additive-blend support; do not infer unknown carriers.

I7 completion (FORM-001 to FORM-004, DATA-003): ingredients can be created
without losing an in-progress recipe, and the new ingredient is added as a
line with an unknown amount. Ordinary recipe drafts can be saved with selected
ingredients or nested recipes whose amounts are unknown, without labelling
them as supplier compositions. The amounts, line order, chosen units and
per-use additive details can be completed later; proportions, ordered
declarations and nutrition remain unavailable while amounts are missing.
Known allergen evidence remains visible for review. A measured final weight
can also be retained without inventing a starting weight. See ADR 015.
Recipe and compound-ingredient selections reject circular references as they
are chosen, showing the recipe and ingredient names in the cycle without
discarding the other draft entries. The same graph check protects saves and
backup inspection/restore, including unknown-amount lines (FORM-004).
Merge and sync are not implemented and will need the same check if added.
A line's ingoing percentage is shown alongside its
amount when the whole recipe is quantified. As an optional alternative to
entering weights directly, a complete recipe's percentages can be converted
to line weights using a known starting batch weight. The total must be
exactly 100%; incomplete or unreconciled inputs are not silently applied or
discarded when saving. See ADR 014. The user can leave processing
unknown, confirm that no processing changed the food, enter a final batch
weight, or optionally record individual gains and losses with an optional
description and material. Amounts can be unknown; a list is not treated as
complete unless the user confirms it and every amount is known. A complete
recipe's starting weight is derived from its lines. A measured finished
weight or complete change list can show a yield preview, and a supplied
final weight must agree with the changes. See ADR 012 for the data and
calculation safeguards.

I7 meets its entry-workflow exit scope: recipes and quantities can be entered,
nested recipes selected, relevant processing and yield recorded optionally,
and cycles rejected. The broader requirements are not all complete. Recorded
processing details do not establish which nutrients or additives remain in
the food; affected calculations and declaration ordering remain flagged for
review, even when starting and final weights match. Processing effects on
those calculations remain to be designed and wired. Percentage-only recipes
without a starting batch weight, partial percentage compositions, and other
FORM-001/FORM-002 details are not yet implemented; they are not I7 exit
conditions and remain future work.

I8 completed (FORM-005, ADD-004, DATA-003, TRACE-015): the additive report
traces sources through nested compound ingredients, including repeated uses,
and shows their paths. It calculates from complete, quantified component lists
and confirmed additive coverage; UXR2 subsequently made user-source
references optional without source-only warnings. Unknown amounts, incomplete coverage, missing
records, possible compound/component overlap and conflicting calculation
bases prevent a final total. Known additive sources remain visible when
amounts are missing. Allergen evidence retains each recipe and compound path,
including repeated uses and unknown amounts; conflicting compound and
component assessments require review without hiding known positive evidence.
The review workspace shows selected whole-ingredient or component nutrition
inputs and their paths. It provides ingoing estimates for supported optional
nutrients only when every selected ingredient has evidence, and flags
conflicting mass/volume values or an unavailable comparison density. These
estimates are not automatically label rows or finished-food calculations.
Processing effects and processing-aid eligibility remain review-only. Broader
nutrient catalogue and declaration support remain future work.

I9 completed (DATA-003, FORM-005, CALC-010, UX-002, TEST-011): a browser
journey enters two fictional cakes and cookies using shared ingredients, a
compound mix and a direct additive. It checks ingredient edits propagate,
recipe edits invalidate the food-basis confirmation, incomplete quantities
retain known allergen and additive evidence, and a clean-profile encrypted
restore preserves the drafts and their results. It finishes the cookie recipe
and checks its direct additive once in the declaration and its calculated
concentration. Automated accessibility checks cover the compound editor,
incomplete recipe, label and expanded trace; the trace is also opened by
keyboard. A contrasting drink journey enters the documented fictional batch,
checks the independently calculated energy and sugars for the serving and
per 100 mL, and restores both encrypted and unencrypted backups.

The baked-good figures are invented arithmetic fixtures, not real recipes or
food evidence. Their test-only confirmation that no processing changes the
food must not be inferred for actual baking. Optional processing effects,
actual product and label acceptance, accessibility beyond automated checks,
and regulatory release remain outside these tests. The baked-good fixtures
exist in the tests; they are not additional in-app worked examples.

Bounded I4 research by the Australian Food Requirements Analyst, 2026-11-16:
[Schedule 11 S11-2](https://www.legislation.gov.au/F2015L00481/2024-10-29/2024-10-29/text/original/epub/OEBPS/document_1/document_1.html)
uses g/100 g for named energy-calculation components, but does not prescribe
a universal ingredient-entry unit. The aggregate polyols identifier has no
verified complete membership in that review, and unavailable carbohydrate
has context-dependent scope; avoid assuming the aggregate equals a sum of
listed substances. A complete vitamin/mineral catalogue was not researched.

### I2 - Ingredient information: research and agreed approach

Source review checked on 2026-11-16 by the Australian Food Requirements
Analyst; it is bounded to ingredient, nutrition, allergen and additive
foundations. It does not assess any actual product or establish public-release
approval. The following entries are **agreed product inputs**, not a claim
that legislation requires every ingredient record to contain every field.
Users can save incomplete drafts; identify an information gap when a supported
calculation or applicable label requirement actually needs it.

| Information | Proposed entry and scope | Why it matters |
| --- | --- | --- |
| Name and identity | Common/working name first; declaration name or confirmed structured identity when applicable. Search suggestions are optional, not a closed list. Keep uncertain matches unresolved. | Identify recipe ingredients and support declarations without silently equating a name with legal identity (ING-001, DATA-002). |
| Source | Record where a fact came from when known: supplier, product label, manually entered database value, analysis or the user's own recipe/knowledge. Support reference, date and basis as relevant; no supplier document is universally required to save a draft. | Information can be traced and assessed for suitability; source and confidence are not automatically verified (DATA-001, DATA-005). |
| Nutrition | Offer energy, protein, total fat, saturated fat, carbohydrate, sugars and sodium as common entries, on an explicitly stated per-100 g or per-100 mL basis. Values can be absent, zero or unknown distinctly. | These are the usual finished-food panel values where applicable, not a universal legal requirement to input every ingredient value. Other methods or valid finished-food information may be used where supported (ING-002, CALC-010). |
| Further nutrition | After the common entries, offer an "Add other known nutrient" control so users can select and enter additional supported nutrients or biologically active substances without displaying a long list by default. Preserve value, unit, basis and source; expand the catalogue as supported. Do not assume the initial list is exhaustive or automatically put optional entries on a label. | Applicable claims and provisions can require additional declared information; simply entering data is not a permission or substantiation for a claim. |
| Allergens | Record known presence, explicit sufficiently scoped absence, unknown and conflicting evidence; preserve source and relevant components. Cross-contact information remains distinct. | Required declarations can arise from ingredients, components, additives and processing aids, subject to the applicable rules and exemptions (ING-003, DATA-003). |
| Components | Enter known component names, amounts or order where known, and separately record whether the list and the quantities are complete. Permit an unknown amount. | Ingredient-list order alone is not a quantitative recipe; a complete list is not proof of complete proportions. Partial composition must not be scaled as complete (FR-003, FORM-005). |
| Additives and other roles | Support a substance used directly as an ingredient and a substance recorded inside another ingredient, with name/number when known, purpose and amount/basis if available. Preserve source, path and evidence without duplicating a single contribution. | Declaration, permission, and quantitative checks are separate. A number alone does not establish permission; role and use context matter (ING-004, DATA-001). |
| Physical state and other attributes | Record state and density where supported and needed; keep origin, GM, irradiation and other attributes conditional on relevance and supported scope. | Processing and conversions can change the finished-food result; do not assume density or represent unsupported checks as cleared (DATA-006). |

**Nutrition example:** Enter flour's sourced values per 100 g once; add 200 g
of that flour in a recipe. A supported calculation can use those values and
the recipe amount for the flour's contribution, without asking again. The
finished-food values also depend on processing and yield, so the flour
contribution alone is not a completed NIP. A database-derived or
supplier-provided value is not a laboratory measurement of the finished food.

**Verified source anchors** (recheck the relevant effective compilation and
transitions before implementing rules):

- [Standard 1.2.8](https://www.legislation.gov.au/F2015L00395/latest), sections
  1.2.8-4 and -6, and
  [Schedule 12](https://www.legislation.gov.au/F2015L00482/latest): panel
  content, bases and additional claim-linked information, subject to
  applicability and exceptions.
- [Standard 1.1.1](https://www.legislation.gov.au/F2015L00383/latest),
  section 1.1.1-2(2)-(3), and
  [Schedule 11](https://www.legislation.gov.au/F2015L00481/latest): averaging
  methods and relevant calculations. Source values need to be representative;
  no single supplier or laboratory method is mandated for every ingredient.
- [Standard 1.2.4](https://www.legislation.gov.au/F2015L00392/latest),
  sections 1.2.4-3 to -5 and -7, and
  [Schedules 7](https://www.legislation.gov.au/F2015L00477/latest) and
  [8](https://www.legislation.gov.au/F2015L00478/latest): ingredient and
  compound declarations and additive naming; exceptions and context matter.
- [Standard 1.2.3](https://www.legislation.gov.au/F2015L00397/latest) and
  [Schedule 9](https://www.legislation.gov.au/F2015L00479/latest): allergen
  declarations and exemptions, including relevant component and processing
  aid sources.
- [Standard 1.3.1](https://www.legislation.gov.au/F2015L00396/latest),
  [Schedule 15](https://www.legislation.gov.au/F2015L00439/latest) and
  [Standard 1.3.3](https://www.legislation.gov.au/F2015L00402/latest):
  additive permissions and processing-aid distinctions. These do not make
  additive identification equivalent to permission.

**Not verified by this review:** a complete nutrient or additive catalogue,
the exact permission and limits for particular baked-good ingredients, all
product-classification and packaging exemptions, or caffeine-specific
applicability. Later implementation must map the relevant sources and
exceptions; a dated source check does not guarantee future currency.

Keep the current result and export safeguards. Existing evidence and approved
snapshots must not be silently discarded or rewritten. Each step includes
appropriate tests and may require an explicit compatibility decision; no new
workspace copy is assumed necessary. Relevant requirements include FR-002 to
FR-005, DATA-003 and DATA-006, FORM-004 and VER-002.

### Earlier broader sequence

The I1-I9 track above replaces the ingredient/formulation portion of the
following proposed sequence. Its later product, pack and label proposals
remain historical/provisional. The approved N1-N14 track is complete; the
UXR16-UXR23 roadmap above is complete. Any later work must remain within the approved plan and exit gates.

**Earlier proposed sequence:** each row is intended to fit one turn; split if research,
implementation or verification makes it too large. User approval of the
sequence or an individual step is required before executing it. No step
assumes a new regulatory conclusion without primary-source verification.

| Turn | Scope | Exit check |
| --- | --- | --- |
| G0 | Agree the sequence and the first baked-good example; identify decisions that can wait until their relevant steps. | Owner agrees the examples and next step; existing data and release safeguards remain in place. |
| G1 | Define fictional baked-good inputs, expected outputs and uncertainty/negative cases; retain the drink as a contrasting case. | Independent fixture expectations, sources to verify and explicit missing facts are documented without claiming the app supports them. |
| G2 | Inventory existing ingredient, formulation, rule, UI and storage capabilities against both examples; identify reusable work and misleading demo-specific screens. | A concise keep/change/defer map identifies migration and backup risks; no user data is removed. |
| G3 | Bounded primary-source research for general nutrient, additive, allergen and ingredient data needed by the first cases. Distinguish nutrition fields, permitted declarations and additive identity from permission rules. | Australian Food Requirements Analyst records sources, effective dates, supported scope and unresolved questions; no claim that one exhaustive nutrient list or number alone grants permission. |
| G4 | Design the general ingredient and supplier-evidence model and plain-English journey: single and compound ingredients, names/identity, composition, nutrient basis, allergens, additives and optional relevant substances. | Examples cover present, documented absent, unknown, conflict, partial composition and multiple sources without product-specific universal questions; compatibility and preservation plan agreed. |
| G5 | Implement and test the agreed general ingredient entry and evidence storage in a bounded slice, reusing existing data where safe. | Common ingredients can be entered without a fixed example-only identity list; source, units, unknown and existing data survive editing and backup/restore. Do not silently drop old evidence. |
| G6 | Implement compound-ingredient entry and nested formulation flow with clear guidance and evidence coverage. | The two examples' supported structures and partial/unknown variants work without double-counting or cycles; edit/import/restore protections remain. |
| G7 | Connect formulation-derived identities, amounts, nutrition, allergens and additive/substance evidence where reliably supported. | Tests cover direct and nested paths, duplicate sources, missing amounts, conflicts and stale data; no unsupported absence or guessed conversion. |
| G8 | Design and implement guided product and pack entry, using derived facts first and asking only for genuinely independent or missing information. | Both examples show relevant questions and actionable gaps; no re-entry of an established recipe fact and no unsupported applicability conclusion. |
| G9 | Implement source-mapped common label content and pack copy, including nutrition, ingredient/allergen content and applicable general pack information in bounded increments. | Each supported output has traceable inputs, explicit unsupported sections and tests for both examples and incomplete inputs. Specialist rules expand separately. |
| G10 | Decide incomplete-draft export behaviour with the owner, then build consistent preview, pack copy and PDF around the agreed policy. | Preview/export agreement, visible gaps, layout/overflow and exact-size tests; no silent mandatory omissions or certification claim. Until changed, ADR-009 export policy remains in force. |
| G11 | Run both complete guided journeys and negative cases; improve plain-English actions, accessibility and documentation for a portfolio demo. | Reproducible fictional examples, documented current limitations, backup/restore and regression tests; results do not imply public-release approval. |
| G12 | Expand general regulatory and food coverage in source-verified increments, including additive permissions and prescribed names, infant foods, claims and other applicable domains. | Each increment states its supported categories, exceptions, sources, tests and unresolved cases; unsupported is not treated as clear. |

This sequence is a proposal, not a declaration that all common foods will be
covered by G11. Claims remain a public-MVP commitment under D1. Revisit precise
release scope with the owner rather than assuming specialist work is cancelled.

### Documentation navigation

- [Requirements](./requirements.md): product and traceability contract; the
  2026-11-16 scope note governs older conflicting release lists.
- [Reviewer questions](./reviewer-questions.md): existing answers and open
  questions; verify factual legal questions in primary sources first.
- [Regulatory research](./mvp-regulatory-research.md) and
  [NIP research](./nip-display-research.md): source evidence and limitations.
- [Drink scenario](./drink-demo-scenario.md) and
  [data flow](./drink-demo-data-flow.md): retained example and historical design,
  not the general ingredient UX specification.
- [Decision records](./adr/): accepted decisions, including safeguards still
  in effect; [historical usability design](./history/usability-design.md) and
  [worked examples](./history/worked-examples-scenarios.md) record earlier work.
- Phase 2 and claims gate records remain for reviewer traceability, not as a
  statement that those catalogs are approved.

## 1. How to use this document

1. Read `AGENTS.md`, then this plan, then the sections of `docs/requirements.md` referenced by your task.
2. Follow the approved current step in the current-direction section; section 12 records earlier progress. Activate only explicitly permitted, eligible local-demo checks under ADR-009; other reviewer and release gates remain in force.
3. Anything not verified against a primary source is tagged `TO BE VERIFIED` or `TO BE RESEARCHED`. Never remove a tag without recording the source and date.
4. Record each technology or design decision as an ADR in `docs/adr/` (created in P0-2).
5. Tick the progress tracker when a step meets its exit criteria. Ask the user before any destructive action (deleting the archive, force pushes, rewriting history).

## 2. Product summary

A privacy-focused Australian food-labelling and formulation product. Users build ingredients (with supplier specifications), nested formulations and products, and the system calculates nutrition, declarations and allergens, evaluates regulatory rules with an explanation and source for every result, and produces a previewable, exportable label. Formulation data stays on the user's device by default. The product assists compliance; it never certifies it.

Target: a presentable, offline-capable MVP vertical slice that can later grow into a subscription SaaS for Australian food businesses, with Victoria as the primary legal focus and ANZ context where the Code is joint.

## 3. Locked decisions

| ID  | Decision                                                                                                                                                                                                                                                                                                             | Date       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| D1  | Prioritise general-purpose ingredient, formulation and core labelling foundations for common Australian foods, tested with a baked good and a caffeinated drink. The long-term aim is broad food coverage, expanded in verified increments; no universal first-release coverage is implied. Additive permissions and prescribed names, including infant-food and drink-specific cases, remain planned; claims remain required before public MVP launch. Exact release coverage and ordering beyond the foundation are to be agreed. Reviewer verification remains a public-release gate; selected local-demo checks follow ADR-009 and unsupported cases remain unresolved. | 2026-11-16 |
| D2  | Same repository. Legacy `frontend/` is moved to `archive/legacy-frontend/` (history preserved) in P0-1 and deleted later with user approval. New code lives in `apps/` and `packages/`.                                                                                                                              | 2026-11-05 |
| D3  | MVP is local-only: no backend and no login. Authentication and entitlements are added in Phase 4; seams are built in Phase 1 (section 9).                                                                                                                                                                            | 2026-11-05 |
| D4  | UI uses Tailwind CSS v4 with shadcn-vue (accessible primitives, components owned in-repo). No Bootstrap.                                                                                                                                                                                                             | 2026-11-05 |
| D5  | A human food-regulatory reviewer is engaged at defined touchpoints (section 10).                                                                                                                                                                                                                                     | 2026-11-05 |
| D6  | Monetisation details (plans, trial length, pricing) are deferred and are not an MVP concern.                                                                                                                                                                                                                         | 2026-11-05 |
| D8  | Selected, eligible local-demo checks show provisional outcomes normally under ADR-009; they are distinct from reviewer-approved results. UXR11 may use complete, explicit user-entered caffeine facts without source references; supplied sources are retained but not independently verified. The ADR-006 opt-in illustrative policy remains for other existing checks until deliberately changed. Neither policy fills missing facts or confers approval. | Updated 2026-11-19 |
| D7  | Users may manually enter nutrient values from sources such as suppliers, labels, analysis or food-composition databases. As approved 2026-11-18, source references are optional in the ordinary workflow; retain the value's necessary basis and any already-recorded source details. Do not infer unknown facts or remove rule-source provenance. Automatic external database integration remains deferred until release, licence, provenance and update policy are decided. | Updated 2026-11-18 |
## 4. Non-negotiable constraints

These come from `docs/requirements.md` and apply to every phase.

1. The product never states or implies legal certification of a label (TRACE-012, requirements section 1).
2. Unknown is not zero and not PASS (DATA-003, TEST-004).
3. Formulation data stays on the device by default. No analytics, no third-party scripts and no formulation data in logs or error reports (requirements section 10).
4. Every result shows what was checked, rule and version, inputs, result, source, application mode and mapping confidence (requirements 7.6 and 7.7).
5. A rule with less than Provision-level mapping confidence cannot produce a deterministic FAIL without reviewer approval (TRACE-015).
6. The compliance engine is independent of the UI and of I/O.
7. Approved versions are immutable and historical results are reproducible (VER-002, VER-006).
8. No invented citations, thresholds or clause numbers. Regulatory values live in versioned rule data with a source.
9. Circular references are rejected on edit, import, restore and sync (FORM-004).
10. Accessibility: status is never conveyed by colour alone (requirements 11.3).

## 5. Technology stack

| Layer                  | Choice                                                                                                                                    | Status                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Language and repo      | TypeScript (strict), pnpm workspaces, Node current LTS pinned via `.nvmrc` and `engines`                                                  | Default; confirm in ADR-001                   |
| Front end              | Vue 3, Vite, Pinia, Vue Router, Tailwind CSS v4, shadcn-vue, lucide icons                                                                 | Decided (D4)                                  |
| Compliance engine      | Pure TypeScript package, no DOM or I/O, runs in browser and Node                                                                          | Default                                       |
| Local database         | Dexie (IndexedDB) behind repository interfaces so it can be replaced                                                                      | Spike S1                                      |
| Validation             | Zod                                                                                                                                       | Default                                       |
| Nutrition arithmetic   | Decimal library (decimal.js or big.js)                                                                                                    | Spike S2                                      |
| Rules                  | Typed, data-driven rule records with source metadata; no `eval`, no custom DSL                                                            | S4 design input in ADR-005; implement in P1-2 |
| Label and PDF          | SVG layout in millimetres, then PDF                                                                                                       | Spike S3                                      |
| Tests                  | Vitest, fast-check (property tests), Playwright (end to end), axe (accessibility)                                                         | Default                                       |
| Lint and format        | ESLint (flat config), Prettier, vue-tsc                                                                                                   | Default                                       |
| CI                     | GitHub Actions: typecheck, lint, unit tests, rule-data validation, build; Playwright when UI exists                                       | Default                                       |
| Hosting (demo)         | Firebase Hosting, static only, no user data                                                                                               | Default                                       |
| Later server (Phase 4) | Firebase Auth, Firestore (account and entitlement metadata only), Functions, in an Australian region (TO BE VERIFIED); Stripe for billing | Deferred                                      |

Alternatives considered for the local database: RxDB (replication and encryption plugins, heavier), SQLite WASM on OPFS (relational recursion, newer browser constraints). Decide in S1.

## 6. Target repository layout

- `apps/web` - Vue application.
- `packages/domain` - types and Zod schemas shared by everything.
- `packages/engine` - pure calculation and compliance logic: units, recursion, nutrition, allergens, declarations, rule evaluation, result/trace model.
- `packages/rules` - versioned regulatory datasets, rule records, explanation templates and validators.
- `packages/label` - label layout and PDF output.
- `docs/` - `requirements.md`, `implementation-plan.md`, `reviewer-questions.md`, `adr/`.
- `archive/legacy-frontend/` - the old prototype after P0-1. Reference only. Delete later with user approval.
- `.github/` - agent definitions and workflows.
- `AGENTS.md` - agent rules.

## 7. Phases

### Phase 0 - Foundations (no product features)

| Step | Work                                                                                                                                                                                                                                                                                                                                                                    | Notes                                                                                                                                                                                                         |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-1 | Archive the legacy app: move `frontend/` to `archive/legacy-frontend/` with `git mv`; add `archive/README.md` saying it is out of use, reference only, and to be deleted after approval. Do not edit its code.                                                                                                                                                          | The legacy `src/firebase.ts` commits a Firebase web config and initialises Analytics. Do not reuse either. User action, TO BE VERIFIED: restrict the API key and disable Analytics for that Firebase project. |
| P0-2 | Scaffold the pnpm workspace: root TypeScript project references, strict mode, ESLint, Prettier, Vitest, Playwright, `.nvmrc`, root scripts (`build`, `typecheck`, `lint`, `test`, `test:e2e`), `docs/adr/`, `.gitignore` updates. Update the Commands section of `AGENTS.md`.                                                                                           | Depends on P0-1                                                                                                                                                                                               |
| P0-3 | GitHub Actions CI: install, typecheck, lint, unit tests, rule-data validation (stub), build.                                                                                                                                                                                                                                                                            | Depends on P0-2                                                                                                                                                                                               |
| P0-4 | Run spikes S1 to S4 and record each as an ADR (below).                                                                                                                                                                                                                                                                                                                  | Parallel with P0-3                                                                                                                                                                                            |
| P0-5 | Start legal-register verification for the items needed by the MVP (section 11): clause-level reading of Standards 1.2.1, 1.2.2, 1.2.3 with Schedule 9, 1.2.4 with Schedule 10, 1.2.5, 1.2.6, 1.2.8 with Schedules 11 to 13, net quantity (National Measurement Institute) and the Victorian items. Output: updated register and a mapping confidence for each MVP rule. | Parallel; feeds R1 and R2                                                                                                                                                                                     |
| P0-6 | Hold reviewer session R1 using `docs/reviewer-questions.md`.                                                                                                                                                                                                                                                                                                            | Blocks P1-1 and P1-2                                                                                                                                                                                          |

**Spikes**

| Spike                   | Question                                                                  | Method                                                                                                                                                                                                                                                                                                    | Pass criteria                                                                   |
| ----------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| S1 Local database       | Can Dexie meet requirements LOCAL-001 to LOCAL-013?                       | Load 2,000 ingredients and 500 formulations with 5-level nesting; time recursive expansion and list queries; test atomic "approve version" transaction; run a migration against a fixture; observe quota, persistence and eviction behaviour; assess encryption options. Compare against one alternative. | Interface-compatible, limits documented, migration and atomicity demonstrated   |
| S2 Decimal and rounding | Which arithmetic approach reproduces hand-calculated NIP results exactly? | Compare plain numbers and a decimal library on worked examples; implement rounding stages as configured by R1 answers                                                                                                                                                                                     | Matches every hand-calculated fixture exactly                                   |
| S3 Label and PDF        | Can we produce an exact-size, deterministic PDF with embedded fonts?      | Render SVG at millimetre size; try two PDF routes and browser print; check physical size, minimum text size, font embedding, repeatability, file size                                                                                                                                                     | Exact size, stable output, legible at minimum sizes                             |
| S4 Rule data            | Can rules be expressed as data with a full trace?                         | Express three rules fully as data (allergen presence, NIP required, a numeric threshold) with TRACE-014 metadata, explanation templates and source validation                                                                                                                                             | Rules evaluate from data, trace output is complete, orphan rules fail the check |

**Exit criteria:** CI is green on an empty slice, ADRs accepted, spike results recorded, R1 held, legacy archived. Print-scale legibility remains a P1-5 gate; unresolved NIP presentation remains review-only until reviewer review.

### Phase 1 - MVP vertical slice

Flow: create ingredients and specifications -> build composite ingredients -> build a product formulation -> calculate nutrition, ingredient list and allergens -> review compliance results with explanations -> preview label -> export PDF -> back up locally.

| Step                  | Work                                                                                                                                                                                                                                          | Depends on                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| P1-1 Engine core      | Units and decimals; recursive expansion with cycle rejection; ingoing-mass percentages and yield; nutrient aggregation; Schedule 11 energy; NIP formatting and rounding; allergen propagation; ingredient declaration; result and trace model | S2, R1. Foundational work may start; unresolved R1 interpretations gate affected deterministic outputs. NIP formatting waits for reviewer review of its display policy and fixtures. |
| P1-2 Rules data v0.1  | Rule schema with TRACE-014 metadata; release manifest; allergen vocabulary; NIP and presence rules; explanation templates; CI check that fails any rule without a source                                                                      | S4, R1                                                 |
| P1-3 Local data layer | Repositories behind interfaces; immutable approved versions; transactions; migrations; backup export and import with an encrypted option; durable-storage request; detection of cleared storage                                               | S1                                                     |
| P1-4 UI               | App shell with Tailwind and shadcn-vue; dashboard with empty states; ingredient and specification editor; recipe and composite builder; product screen; compliance panel with expandable trace; backup page; non-certification notices        | Interfaces from P1-1 to P1-3 (shell can start earlier) |
| P1-5 Label and PDF    | Single-panel SVG label at exact size; required content blocks; guard against text below the minimum size; deterministic PDF                                                                                                                   | S3, P1-1                                               |
| P1-6 Quality gate     | Engineering property/e2e tests; accessibility checks; non-sensitive demo data; reviewer-verified golden fixtures as a separate acceptance gate                                                                                                  | P1-1 to P1-5, R3                                       |

P1-1, P1-2 and P1-3 can run in parallel.

Phase 1 has two distinct milestones:

- **Reviewer-ready engineering baseline:** the local application and
  automated engineering checks are available for hands-on testing. This
  permits bounded Phase 2 source, data and review-only groundwork; it does not
  mean every Phase 1 regulatory output is implemented or validated.
- **Reviewer acceptance:** R3-01 golden fixtures are checked against agreed
  expected results, and R1-21 minimum-size/print-scale acceptance is
  documented. Deterministic NIP display remains gated on R1-13 and its
  fixtures; it may stay visibly `REVIEW REQUIRED` without blocking the
  reviewer-ready milestone. Public MVP release remains blocked on the
  applicable reviewer and later-phase gates.

The engineering baseline is not a compliance determination. The current label
preview/export remains illustrative and must not be presented as a completed
regulatory label.

#### Phase 1 turn-by-turn implementation sequence

The turns below are bounded delivery chunks for implementation sessions. They do
not change the dependencies above: P1-1, P1-2 and P1-3 remain parallel work
streams, and a turn must not make a gated regulatory output deterministic.

| Turn | Scope | Exit check |
| ---- | ----- | ---------- |
| 1 | P1-1 foundational arithmetic and mass handling: decimal and unit helpers, cycle detection, recursive formulation expansion, and source paths. | Unit tests cover nested and direct ingredients, unit conversion, missing references, cycles, and invalid quantities. |
| 2 | P1-1 ingoing-mass percentages on a common gram basis, plus explicit process additions, gains and losses with yield and mass-balance reconciliation. | Boundary and missing-input tests; missing process data returns REVIEW REQUIRED; no unstated yield or loss assumptions. |
| 3 | P1-1 source-traceable, per-100-g nutrient aggregation and Schedule 11 energy calculations using an explicit food-state basis and versioned, source-cited factor set. | Tests cover unit conversion, missing evidence, component factors, traceability and unrounded results; incomplete composition or unresolved mapping returns REVIEW REQUIRED. |
| 4 | P1-1 allergen propagation, ingoing-weight declaration ordering, and the shared result/trace contract. | Paths and evidence survive nesting; incomplete or conflicting evidence stays review-required; unresolved declaration exceptions/names are not guessed. |
| 5 | P1-2 versioned rule records, release metadata, source validation, and explanation templates. | Rule-data validation rejects missing sources and malformed records; rule decisions stay traceable. |
| 6 | P1-3 local repository interfaces and schema for ingredients, formulations, products, and immutable approved versions. | Repository tests cover create/read/update boundaries and reject mutation of approved versions. |
| 7 | P1-3 transactions, migrations, storage-cleared detection, and backup export/import including the encrypted option. | Migration and clean-profile restore tests pass; storage remains local. |
| 8 | P1-4 accessible application shell and core ingredient, specification, formulation, and product workflows. | UI tests cover empty states, validation, keyboard access, and non-colour status cues. |
| 9 | P1-4 compliance/trace and backup workflows, including clear review-required and non-certification notices. | Trace is inspectable from results; errors and unknown inputs are explicit. |
| 10 | P1-5 exact-size SVG label layout and required content blocks. | Layout tests verify dimensions and prevent text below the approved minimum size. |
| 11 | P1-5 deterministic PDF export from the reviewed SVG layout. | Repeat exports are stable and print-scale checks pass. |
| 12 | P1-6 integrated offline demo, engineering property/e2e tests, and accessibility checks; prepare the workspace for reviewer fixture testing. | Automated engineering checks pass and the offline candidate is testable. R3-01 fixture approval and R1-21 print-scale acceptance remain separate reviewer-acceptance gates; unresolved outputs stay review-only. |

NIP display formatting and rounding are intentionally not a turn with an
assumed implementation: schedule that work only after the reviewer has settled
the display policy and fixtures. Additive limits and prescribed names remain
Phase 2 work for the two agreed product cohorts; claims remain Phase 3 work
before public launch.

### Phase 2 - MVP compliance expansion

Scope: additive permission and limits (Schedules 7, 8, 14, 15, 16 and Standard 1.3.1, including multi-source sums and carry-over) and prescribed-name support focused on the same two initial product cohorts: formulated caffeinated beverages and foods for infants. The exact Code food classifications/subcategories and applicable prescribed names must be confirmed with the reviewer; these product descriptions alone do not define every applicable rule. Other classes and unsupported cases remain review-only.
Entry: the reviewer-ready Phase 1 engineering baseline is available. Phase 2 source mapping, data design and review-only workflows may proceed while reviewer access is unavailable. Reviewer touchpoint R4 and applicable reviewer-verified fixtures remain mandatory before deterministic Phase 2 rule activation; this entry does not authorize PASS/FAIL results or public release.
Exit: each rule has Provision-level mapping or is review-only; fixtures reviewer-checked. This phase is required before public MVP launch.

**Turn 1 status (2026-11-09):** The candidate source map is recorded in
`docs/mvp-regulatory-research.md`. Product classifications and complete rule
coverage remain unresolved; no Phase 2 rules are activated.

**Turn 2 status (2026-11-09):** Complete. Product drafts capture intended use,
consumer, processing and presentation context plus dated evidence references
for identity and selected cohort facts. Candidate screening indicates only
possible cohort matches and always requires human confirmation; missing,
conflicting or unsupported facts remain `REVIEW REQUIRED`. Prescribed-name
screening identifies no approved cohort rule and never infers a name from the
proposed product name. No deterministic rule is activated; see
`docs/mvp-regulatory-research.md` and requirements INT-004, TEST-004 and
TRACE-015.

**Turn 3 status (2026-11-09):** Complete. Ingredient drafts can store additive
identity, source code, source-described purposes, concentration with explicit
unit and basis, dated evidence references, and a user-recorded added,
carried-over, processing-aid or unknown status. Formulation expansion retains
the nested ingredient path for each recorded source. Missing purpose,
concentration or evidence remains missing; this workflow does not evaluate
permission, declaration, carry-over or processing-aid conditions. See
requirements ADD-001, ADD-004 and ADD-007.

#### Phase 2 turn-by-turn implementation sequence

These are planned delivery turns. Under the reviewer-ready milestone split,
Phase 2 groundwork may proceed while reviewer access is unavailable, but
deterministic rule activation still requires the reviewer gates above. Read
the current Federal Register text directly for black-and-white Code
questions. Use reviewer input for product facts, classification judgments,
evidence sufficiency, interpretation and fixture verification. If a selected
cohort cannot be mapped confidently, keep it review-only rather than
broadening or guessing the scope.

| Turn | Scope | Exit check |
| ---- | ----- | ---------- |
| 1 | Source-map the two selected cohorts: identify candidate Code classes, applicable additive and prescribed-name provisions, cross-cutting conditions and exclusions. Record current FRL compilation, effective date, exact provision/table row and unsupported cases; separate explicit Code text from product-dependent classification questions. | A cited candidate map exists for formulated caffeinated beverages and foods for infants. Unresolved classification and interpretation questions are listed, not treated as settled; no rules are activated. |
| 2 | [x] Design and add evidence-backed classification inputs for Schedule 15 food-category assignment and prescribed-name candidate identification. Capture the facts and evidence a user/reviewer needs; do not classify from a product name alone. | Known, unknown and conflicting facts lead to a visible candidate or REVIEW REQUIRED state. Tests reject a classification inferred solely from free text. Complete 2026-11-09; candidate screening remains review-only and is not an approved legal classification. |
| 3 | [x] Add first-class additive source records and capture workflow: identity/code, purpose, concentration, unit/basis, source evidence/date, ingredient path, and added/carried-over/processing-aid status. | Validation preserves provenance and nested source paths; missing purpose, concentration or evidence stays unknown/REVIEW REQUIRED. Complete 2026-11-09; capture only, no permission or exemption result. |
| 4 | [x] Map additive declaration names separately from permission: versioned Schedule 7 class-name and Schedule 8 name/code data, declaration choice, ingredient-order placement and allergen inheritance. | Declaration mapping has exact sources and tests for supported options; unsupported naming cases remain review-only and no permission is inferred from a declaration. Complete 2026-11-09: 25 Schedule 7 class names and both 344-row Schedule 8 listings are source-linked; four listing differences are preserved and no class crosswalk is inferred. All candidates remain REVIEW REQUIRED. |
| 5 | [x] Build versioned, source-validated permission data for only the mapped cohorts from Standard 1.3.1 and applicable Schedules 14–16, including inherited category headings, purposes, limits, GMP entries, conditions and equivalents where verified. | Validation rejects missing or stale source metadata, ambiguous category rows and unsupported conditions. Candidate data remains inactive until its reviewer gate is met. Complete 2026-11-09: added 59 Schedule 15 rows, 3 Schedule 16 type-level candidates, 21 Schedule 14 purposes and 7 calculation bases; classification and permission remain review-only. |
| 6 | [x] Implement pure permission evaluation for pinned food category, additive identity, technological purpose, food state and the mapped rule conditions. Return a trace with the provision, version, selected row, inputs and explanation. | Tests cover permitted, prohibited, conditional, missing and unmapped cases. Unverified or incomplete mappings cannot produce deterministic results. Complete 2026-11-09: `evaluateAdditivePermission` is pure and returns a trace; PASS/FAIL needs Provision-level confidence, reviewed data, a person-confirmed category and a single reviewed row. Every shipped draft row evaluates to REVIEW REQUIRED. |
| 7 | [x] Calculate final-food additive concentrations across direct and nested sources, with explicit unit conversion, mass/volume density evidence, documented yield and applicable as-sold/prepared/reconstituted/drained basis. | Boundary and property tests verify source sums, units and denominator; missing concentration, density, yield or state returns REVIEW REQUIRED rather than zero. Complete 2026-11-10: `calculateAdditiveFinalConcentration` sums added sources across nested paths over the documented final mass; per-volume sources and mg/L results need dated density evidence; other bases, non-added sources and missing data are review-only. Not yet wired to the permission evaluator or the UI. |
| 8 | [x] Evaluate same-technological-purpose mixtures and any separately applicable aggregate-colour limits, including verified “calculated as” equivalents. | Tests cover applicability and non-applicability, each contributor, below/equal/above boundaries and missing equivalents. No mixture or colour rule is generalized beyond its mapped provision. Complete 2026-11-10: `evaluateSamePurposeMixture` (1.3.1—6) and `evaluateAggregateColourLimit` (1.3.1—4(3)) are pure, list every contributor, return INFORMATIONAL when nothing applies, and are review-only on missing facts. Not yet wired to the UI or the rule data. |
| 9 | [x] Map and implement carry-over, processing-aid and incidental-presence paths as distinct cases, using the exact applicable Code conditions and user-supplied evidence. | Tests show permitted, exceeded, missing-evidence and uncertain cases. A status flag alone cannot establish an exemption; unresolved cases remain review-only. Complete 2026-11-10: `evaluateAdditivePresencePath` evaluates carry-over (1.3.1—3(2)) against a person-confirmed GMP level and excludes infant formula products; processing aids (1.1.2—13) are a condition checklist that stays review-only because Standard 1.3.3 permissions are not mapped; incidental presence has no verified provision and is not modelled. |
| 10 | [x] Create versioned prescribed-name candidate rules for the mapped cohort classes, including trigger terms, exclusions, required identity/composition/process facts, source and mapping confidence. | Candidate identification always distinguishes “no rule identified” from PASS; unsupported or uncertain classes produce a review task, never an inferred prescribed name. Complete 2026-11-10: draft `prescribedNameCandidateCatalog` (sources SRC-NAME-001/002, validator and activation gate) and `identifyPrescribedNameCandidates`; never PASS or FAIL. Standards 2.9.2 and 2.6.4 prescribe no finished-food name; only name-linked requirements (2.9.2—7(3)(d),(e), 8(1)(a)) are candidates. |
| 11 | [x] Implement composition checks only for prescribed-name rules whose exact provisions and required inputs are mapped and approved for activation. Keep true-nature judgments, mixed/novel foods and unmapped classes review-only. | Each enabled rule has source-linked boundary tests and shows requirements beside product facts. Free-text name or incomplete composition cannot yield PASS. Complete 2026-11-10: `evaluateInfantSweetenedWord` (2.9.2—7(3)(d), more than 4 g/100 g) is the only composition-triggered rule mapped. It is deterministic only for a reviewed, Provision-confidence rule with confirmed inputs; the shipped draft rule is review-only. |
| 12 | [x] Integrate additive and prescribed-name entry, results and trace into the workspace. Present declaration output separately from permission and prescribed-name evaluation; show evidence, review reasons and non-certification language. | End-to-end tests cover a supported draft path and missing/conflicting data paths without asserting legal certification or hiding REVIEW REQUIRED. Complete 2026-11-10: the "Additives & names" section saves person-confirmed inputs on the product record and shows declaration candidates separately from permission, concentration, name-candidate and 'sweetened' results. Mixture, aggregate colour, carry-over and processing-aid evaluators are not wired and are listed in the UI as review-only. |
| 13 | [x] Run the Phase 2 quality and release gate: source/version checks, unit/property tests, selected-cohort fixtures, end-to-end/accessibility checks and review of unsupported cases. Prepare reviewer verification records for classification, mappings and representative outcomes. | No deterministic release is enabled until each applicable reviewer gate and fixture sign-off is recorded. Unsupported categories remain visibly review-only; Phase 2 exit criteria are met before public MVP use. Complete 2026-11-10 (engineering portion): `scripts/phase2-gate.test.mjs` and the full suite pass, and `docs/phase2-gate-record.md` holds the reviewer verification records. No reviewer sign-off is recorded, so no deterministic release is enabled. |

### Phase 3 - Claims

Scope: structured claims engine (Standard 1.2.7, Schedule 4), including nutrition, comparative and health-claim gates. Claims complete a public-MVP launch gate after the Phase 1 core and Phase 2 additive/name groundwork. HSR, NPSC, GM, irradiation and origin remain outside the public MVP unless separately approved.
Entry: R5 held; claim wording, evidence and supported families agreed.
Exit: supported claim conditions are mapped, review boundaries are explicit, and claim fixtures pass. Public MVP launch remains blocked until this phase is complete.

**Groundwork turns (approved 2026-11-10).** R5 is unavailable for now, so claims groundwork proceeds as draft, review-only data, as in Phase 2. Deterministic claim results still need reviewer approval except through the clearly labelled illustrative preview (turn C2, to be recorded as decision D8).

| Turn | Scope | Exit check |
| ---- | ----- | ---------- |
| C1 | [x] Claims research (Standard 1.2.7, Schedule 4, infant and caffeinated-beverage interactions) and a proposed first supported set. | Cited section 23 in `docs/mvp-regulatory-research.md`; verified and unverified items listed. Complete 2026-11-10: first set is low energy, low fat, low sugars, low sodium and good source of dietary fibre; protein, saturated fat, carbohydrate, comparative, health and unregulated claims stay review-only. |
| C2 | [x] Illustrative preview design (ADR-006 and decision D8): illustrative outcomes computed separately from the official status, bannered, off by default. | Tests prove the official status cannot change because of the preview. Complete 2026-11-10: pure engine module and tests; web toggle deferred to C7. |
| C3 | [x] Claim data model on the product record, with storage validation. | Round-trip tests; free text is never classified automatically (CLAIM-006). Complete 2026-11-10: `ProductClaim` stores text exactly as entered; classification and its confirmation are person-set and optional; `supportedClaimId` only on nutrition content claims. |
| C4 | [x] Draft claim-rule catalog, validator and activation gate for the first set. | Validator rejects missing sources; every rule is draft. Complete 2026-11-10: five draft rules in `claimRuleCatalog`, sources SRC-CLAIM-001/-002, validator and activation gate in `packages/rules`, guard test `scripts/claim-catalog-draft.test.mjs`. |
| C5 | [x] Pure nutrition-content-claim evaluator with a condition checklist (CLAIM-003, CLAIM-004). | Boundary, missing-input, non-applicability and property tests. Complete 2026-11-10: `packages/engine/src/claim-evaluator.ts` with tests, plus `illustrateNutritionContentClaim`; draft-rule guard in `scripts/claim-catalog-draft.test.mjs`. |
| C6 | [x] Gates and review-only paths: prohibited contexts, food form, per-serve, comparative, health, unregulated claims. | Each returns REVIEW REQUIRED with its reason. Complete 2026-11-10: `evaluateClaim` in `packages/engine/src/claim-router.ts` with tests; food form and per-serve gates were already in the C5 evaluator. |
| C7 | [x] Workspace "Claims" section with checklist, trace and non-certification text, separate from additive and name results. | End-to-end and accessibility tests pass. Complete 2026-11-10: `ClaimsPanel.vue`, `claim-checks.ts`, `claims.spec.ts`, Claims added to the accessibility sweep. The per-session illustrative toggle is on this page only. |
| C8 | [x] Claims gate test, reviewer records and unsupported list. | Full suite green; no deterministic claim result enabled. Complete 2026-11-10: `scripts/claims-gate.test.mjs` and `docs/phase3-claims-gate-record.md`. |

After C8: worked example products (turns W1-W7 below), a sports supplements slice with a "how to add a category" checklist, then reviewer-pack polish.

**Worked-example turns (approved 2026-11-10).** Every rule is draft, so every official status stays REVIEW REQUIRED; each example has a good and a problem variant that differ only in the illustrative preview. No layout changes before W7.

| Turn | Scope | Exit check |
| ---- | ----- | ---------- |
| W1 | [x] Shared illustrative-preview toggle on Additives & names (permission and infant 'sweetened'); prescribed-name candidates have no preview. | Tests prove the official status is unchanged; e2e and accessibility pass. |
| W2 | [x] Scenario sheet (document only): each example, invented figures, expected official and preview results. | User approves before building. |
| W3 | [x] "Load worked examples" and "Remove worked examples" buttons: tagged `worked-example`, fixed ids, never overwrites, removes only tagged records. | Existing demo and tests unchanged. |
| W4 | [x] Caffeinated beverage, good and problem variants. | Seen in additives, names, claims, label and PDF, toggle off and on. |
| W5 | [x] Food for infants, good and problem variants. | Includes the PROHIBITED_CONTEXT path. |
| W6 | [x] In-app worked-examples guide and an end-to-end test of statuses, preview behaviour and accessibility. | Full suite green. |
| W7 | [x] Review checkpoint with the user; UI and usability discussion before any layout change. | User feedback recorded. Feedback: guide non-expert users step by step, show only relevant fields, explain better, replace blanket REVIEW REQUIRED with a clearer checklist, and produce real label content (ingredient declaration, allergens, mock NIP). Direction: new usability track U1-U8 in docs/history/usability-design.md; sports supplements postponed until it is done. |

**Usability track (design approved 2026-11-10; see docs/history/usability-design.md).** Each turn needs user approval.

| Turn | Status | Scope |
|---|---|---|
| U1 | [x] | Design and NIP display research approved (docs/nip-display-research.md). |
| U2 | [x] | Plain-English pass on Overview, Ingredients, Formulations and Products. Wording only; field labels used by tests unchanged. Suite green. |
| U3 | [x] | Label builder shell (new "Label builder" page): product picker, 8-step list with progress, step 1 "What is it?" as simple dropdowns (product type, one shared source, Yes / No / Not sure per question), step 2 recipe summary, steps 3-8 explained with links to the existing pages. The Products page classification section is now a collapsed "Advanced" option. |
| U4 | [x] | Restructure (done 2026-11-10): shared `BuilderShell` step component, navigation reduced to Overview, Ingredients, Formulations, Products, Labels and Backup (Label builder, Review & trace, Additives & names and Claims sit in a temporary "Checks" group until U6), and a six-step Ingredient builder with Add, Edit and Delete (spec sheet, nutrition, allergen checklist, additives with optional amount and evidence fields shown on request). Editing is lossless: nutrients the form does not manage (such as fibre), unchanged evidence dates and non-"present" allergen statements are preserved. |
| U5 | [x] | Formulation builder (done 2026-11-10): three steps (Name, Ingredients, Review and save) with Add, Edit and Delete on the list. Nested recipes are supported, a recipe is not offered as its own line, and storage still rejects circular references on save. The review step shows each line's rough share of the weight. |
| U6 | [x] | Product builder (done 2026-11-10): six steps (About it, What is it?, Pack details, Additives & names, Claims, Review) with Add, Edit and Delete on the list. Pack details (serving size, servings per pack, net contents and unit) are new optional product fields; blank means unknown, never zero. The old Additives & names, Claims and Label builder pages are retired; their logic now runs inside the builder steps and their tests were moved to the builder. |
| U7 | [x] | Labels page: draft ingredient declaration and allergen summary, using ingoing recipe ordering and the draft allergen vocabulary. Products needing information are labelled and greyed out with the missing items and a link to the builder; only products with the U7 information entered can export. Readiness is recalculated live, never stored and never means compliance. Additive wording is shown as a review candidate, and sulphites requiring final-food evaluation are flagged rather than resolved. |
| U8 | [x] | Mock base NIP in the Labels page and draft PDF, using the NPC rounding conventions in docs/nip-display-research.md section 12 (3 significant figures, half to even; round-down remark still unverified). Unsupported food states and claim-driven rows remain explicit export blockers, not completed regulatory coverage. |
| U9 | [x] | Three-way checklist wording, separate paginated consultant notes in the PDF, accessibility and plain-language pass. Official and illustrative results remain distinct; no regulatory acceptance implied. |

### Paused workstream - Victorian drink end-to-end demo (historical)

**Purpose.** Enable a small business unfamiliar with the Code to create a
representative, locally generated label and PDF from a realistic recipe and
supplier information, and give the reviewer a coherent product, label and
explanation to critique. The product assists; it does not certify compliance.
This is a local demo milestone, not public MVP release or regulatory approval.

**First scenario.** A new fictional, non-alcoholic, citrus-flavoured
caffeinated drink in a 330 mL can, intended for the Victorian retail market.
The scenario will explicitly establish its purpose and all other facts needed
to assess whether it is a formulated caffeinated beverage. It will contain
water, sugar, citric acid, a supplier flavour blend and added caffeine. Exact
amounts, supplier specifications, final yield, pack facts, name, artwork and
any claims are to be defined and checked in D0, not inferred here. Synthetic
values must be labelled as fictional. Existing worked examples are useful
regressions but do not replace this new scenario.

**Workflow principles.**

- Enter supplier and ingredient facts once; derive product facts through
  direct and nested formulations and reuse them in all relevant checks and
  outputs. Ask only for facts not reliably derivable, such as a product's
  purpose, sales presentation, production process or missing supplier data.
- Use structured ingredient/substance identities and dated evidence where
  needed. Do not infer identity or absence from a free-text name or an
  incomplete supplier blend. Unknown, conflicting, stale and unsupported
  facts remain explicit; missing is never zero or PASS.
- Make changes to draft source data refresh affected draft calculations,
  checks and previews. Preserve source paths and evidence; never silently
  alter immutable approved snapshots or their historical results (FR-004,
  FR-010, DATA-003 to DATA-006, FORM-004, VER-002).
- Keep the ingredient, formulation, product, labels and backup workflow
  local and understandable. Show a specific result and next action, not an
  unqualified overall compliance verdict. Keep legal sources and detailed
  traces accessible without making the label itself a technical report
  (FR-002 to FR-008, TRACE-008, TRACE-012, TRACE-015).
- Victoria is the initial market, alongside applicable national requirements.
  Do not assume every Victorian, origin, trade-measurement or packaging rule
  has already been researched. Other state/territory markets are out of this
  demo, not removed from the longer-term product scope.

**Accepted local-demo policy.** ADR-009 and updated D1/D8 permit normally
visible, useful provisional results for selected eligible checks; other
existing checks retain ADR-006 safeguards. UXR11 accepts complete, explicit
user-entered caffeine facts without references, retains optional sources, and
identifies that inputs are not independently verified. Provisional and
reviewer-validated outcomes remain distinct, with versioned rule provenance
and input traces. Missing, ambiguous and unsupported cases are not bypassed,
and TRACE-015 remains in force. Block label-PDF export for unresolved required
content; explicit lot/date production placeholders are allowed only when the
required type is known. The separate explanation report remains exportable.
The incomplete-export safeguard and independent review-report export are
implemented. A narrowly scoped caffeine evaluator and an unresolved result
are present, but the ingredient-to-concentration and classification evidence
needed for real provisional results is not yet connected. Reviewer
touchpoints, immutable versions and public-release gates remain.

**Scope and sequencing.** These are intended as separate user-approved turns;
split a turn further if research, implementation or validation proves too
large. Each turn preserves existing functionality and ends with its tests and
documentation. D0 is planning/research only; no subsequent implementation is
authorized merely by writing this plan. Reuse existing engine, storage and
builder work; avoid a parallel demo-only implementation that drifts from the
real workflow. The infant-food cohort and claims remain public MVP
commitments, not part of this first drink's comprehensive coverage; claims
already entered must never be silently discarded or treated as cleared.
HSR, GM and irradiation are not required for this first scenario. Origin
labelling is investigated for the actual demo scenario, not promised as a
general-purpose origin engine.

| Turn | Scope and dependencies | Exit check |
| ---- | ---------------------- | ---------- |
| D0 | [x] Define the scenario and acceptance contract; identify the user journey, fictional supplier specs, product purpose, sources, rule applicability, output inventory and unresolved matters. Bounded primary-source research covers the drink, Victoria, Code transitions, origin, trade measurement and the container scheme. | Completed 2026-11-11: `docs/drink-demo-scenario.md` records fictional happy-path facts, independent calculations, boundary/negative cases, supported and unverified outputs, and implementation follow-ups. ADR-009 records the approved results and export policy. This is planning, not reviewer acceptance or authorization for later implementation. |
| D1 | [x] Inventory current workflow against D0; design structured identities, substance/nutrition/allergen evidence and data flow for this slice. Map existing records, migrations and backup/restore; distinguish direct ingredients, supplier blends and nested recipes. | Completed 2026-11-11: `docs/drink-demo-data-flow.md` maps current and proposed flows, unknown/conflicting facts, migrations, backup and the existing approved-history dependency gap. Product owner approved the compound-ingredient and snapshot direction in ADR-010; no application behaviour changed. |
| D2 | [ ] Implement the agreed provisional-demo result policy for the selected, source-verified checks only, after D0 and separate user authorization. Keep the unreviewed and approved states distinguishable and use the same rule and trace machinery. | In progress: a separate review report is exportable even for incomplete products; label-PDF export is blocked for all current layouts while required content is unassessed. With product-owner approval, a narrow caffeine concentration evaluator was brought forward from D6. It tests provisional results on evidence-backed fixtures and displays the same unresolved check on screen and in the report; it does not yet calculate a total or establish all classification facts from real product records. D3-D6 must supply those facts without duplicate entry, including every caffeine source, process/yield and conflicting evidence; until then no real product receives a provisional range result. Existing draft checks remain gated. D2 remains open until the approved screen/export policy and real evidence integration are complete, including tests for supported/unsupported and approved/unapproved paths. |
| D3 | [ ] Improve ingredient and supplier-specification entry for the scenario, including structured identity, caffeine and relevant blend components, nutrient basis and allergen/additive evidence. Reuse current records and terminology where possible. | In progress: ingredient drafts record explicit identities, sourced caffeine presence, absence or two conflicting statements, and separate per-100 mL nutrition; unknown stays blank. Optional dated supplier statements also record fruit juice, added vitamins, added taurine and other added Schedule 28 substances; disagreements and earlier statements are retained. The last statement excludes caffeine, vitamins and taurine and does not establish absence of naturally occurring substances; none of these statements replaces a quantified ingredient list. Users can record a decision and explanation about conflicting caffeine statements, retaining both statements and prior decisions; calculations do not yet apply it. Compound ingredients can be selected in recipes, and linked supplier compositions record sourced complete or partial coverage, including components with unknown amounts. Partial compositions cannot be scaled; legacy compositions are not automatically treated as supplier-confirmed complete. Backup v2 preserves these fields; v1 remains importable. A browser test enters the fictional drink's ingredient and blend records and restores both backup types; remaining scenario evidence, including naturally occurring substance coverage and full D3 acceptance, still needs verification. These supplier statements, caffeine and volume nutrition are not yet propagated into product calculations. D3 stays open. |
| D4 | [ ] Propagate identity, allergens, additives and substance amounts through direct and nested formulation paths, with evidence and duplicate-source safeguards. | Tests verify direct/nested paths, multiple sources, proportions, absent versus unknown, missing blend details and no double counting; edits refresh dependent draft results without changing approved snapshots. |
| D5 | [ ] Make batch yield, finished volume, relevant mass/volume conversions and nutrition inputs practical for the drink; use explicit density/evidence when conversion needs it. Integrate with the existing NIP calculation. | Independent fixtures verify per-100 mL and per-serving results, batch scaling, density and yield, boundary rounding and missing data; no assumed density or silent nutrient zero. Supplier-provided and calculated bases are distinguished. |
| D6 | [ ] Guide product classification using recipe-derived facts plus only genuinely product-specific purpose/presentation facts. Implement source-mapped caffeine concentration and drink-specific declaration/advisory checks, including listed substances only where supported. | Tests cover applicable/non-applicable and uncertain classification, all caffeine sources, threshold boundaries, units, serving versus pack size, missing yield/evidence and transition/effective-date cases. Outputs and source traces are provisional under D2 policy. |
| D7 | [ ] Generate the scenario's ingredient declaration, supported additive wording and allergen content from the existing recipe and evidence; evaluate relevant specified permissions and percentage triggers where mapped. | Expected declaration, order, nesting and allergen formatting are verified for the scenario; unsupported blend details, exemptions, missing identity and uncertain permissions are explicit, not guessed. Positive, negative and non-applicable tests retain input paths. |
| D8 | [ ] Complete product and pack inputs for the scenario, including supplier, lot/date placeholders, storage, origin and other applicable Victorian/national pack facts from D0. Ask only for facts not derivable from earlier records. | A user can complete the scenario without repeating known recipe facts; required but unavailable content is identified with a targeted next action. No invented shelf life, origin claim, exact date or unsupported claim is presented as established. |
| D9 | [ ] Assemble a representative can label preview and exact-size PDF from D5-D8, separating pack-copy content from the explanation/report. Use conditional, source-backed label content and clear production placeholders. | Complete scenario produces a readable NIP, ingredient/allergen content, applicable caffeine content and required supported pack sections. Preview/PDF agree; actual dimensions, overflow, legibility and missing/unsupported-content behaviour are tested. Do not label an incomplete or unverified output as print-ready or approved. |
| D10 | [ ] Refine the end-to-end guidance and specific status messages; link each missing fact to its source record and provide source/calculation detail in the separate report. Preserve claims handling and optional features without asking irrelevant questions. | Browser tests show no repeated question for derived facts, actionable missing/conflict paths, keyboard and non-colour status cues, and a clear distinction between provisional findings and reviewer approval. |
| D11 | [ ] Run the complete local demo and regression gate using the D0 happy path and variants: incomplete supplier data, an out-of-range/boundary case, nested propagation, changed source, and unsupported input. Exercise preview, PDF, trace, offline use and backup/restore. | End-to-end results match the independently specified fixtures; the complete scenario yields a representative PDF, and each variant gives the correct specific outcome without a false PASS or hidden omission. Run relevant unit/property, rule-data, typecheck, lint, build, accessibility and browser checks; document remaining gaps and arrange reviewer critique. |

**Milestone exit and what follows.** D11 delivers a usable, honestly scoped
local demo with evidence, limitations and an explicit reviewer-ready package.
It does not complete reviewer acceptance, physical print proof, all
Victoria/national law, infant-food or claims coverage, HSR, a deployed SaaS,
or public release. After the demo, incorporate reviewer feedback and plan the
next vertical slices for the remaining MVP commitments; do not broaden the
drink scenario by silently treating other foods as supported.

### Phase 4 - SaaS foundation

Scope: Firebase Auth, signed entitlements, billing placeholder, hosting, offline installable app, remote rule-release channel, threat model, terms and privacy drafted with legal advice.
Entry: user decisions on plans and trial (deferred by D6); legal advice scoped.
Exit: sign-in and entitlement work without any formulation data reaching the server; read-only and export-only expiry mode works.

### Phase 5 - Hardening and closed beta

Scope: security review, accessibility audit, full regulatory and legal review of the rule catalogue (R6), local-database scale testing, closed beta with Victorian food businesses.

### Phase 6 - Growth

Scope: optional encrypted cloud backup and sync, collaboration, supplier spreadsheet import, multi-panel layouts and barcodes, integrations, New Zealand profile, AI-assisted entry and explanations (draft only, never an originating regulatory conclusion).

## 8. MVP rule scope

**Historical scope table:** The 2026-11-16 D1 decision and current-direction
section take precedence over this earlier cohort and release ordering. The
table remains as a record of source mapping and open gates, not a promise that
the current product supports those cases.

| Rule family                                                                 | MVP behaviour                                                                                                      | Requirements ref | Mapping status                            |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------- | ----------------------------------------- |
| Ingredient ordering                                                         | Ingoing-weight order from the expanded formulation, with stated basis                                              | 4.3, CALC-001    | Provision mapped: Standard 1.2.4-5; weight-stage and related R1 interpretation remains pending |
| Compound ingredient declaration                                             | Generate the declaration; nested compound ingredients return REVIEW REQUIRED until R1 settles the rule             | 4.3              | Provision mapped: Standard 1.2.4-5; recursive-depth and exception interpretation remains pending |
| Allergen declaration and summary                                            | Propagate allergens and generate the format; exemptions are review-only unless R1 approves automation              | 4.4, 4.18        | Provision mapped: Standard 1.2.3-4 and Schedule 9; format/exemptions and reviewer policy remain pending |
| NIP applicability, calculation and format                                   | Calculate from supplied values in the as-sold state; show basis and rounding; unusual cases return REVIEW REQUIRED | 4.7, 6.2         | Provision mapped: Standard 1.2.8 and Schedules 11-13; applicability/evidence and R1 rounding remain pending |
| Presence checks                                                             | Name, supplier name and address, lot, date marking, storage and directions                                         | 4.2, 4.13, 4.17  | Provisions mapped in Standards 1.2.2, 1.2.5 and 1.2.6; applicability and exceptions remain pending |
| Advisory statements                                                         | Only a controlled set approved by the reviewer; otherwise a REVIEW prompt                                          | 4.14             | Provision/Schedule mapped: Standard 1.2.3 and Schedule 9; controlled trigger list and reviewer approval pending |
| Net quantity                                                                | Always REVIEW REQUIRED; legal metrology is outside the Code                                                        | 4.17             | Mapped to national legal-metrology sources; exceptions and application are review-only |
| Additive permission and prescribed names | Focus on the same initial cohorts: formulated caffeinated beverages and foods for infants; apply only to confirmed classifications and source-mapped rules. Other cases return REVIEW REQUIRED. | Phase 2 | Reviewer mapping of exact class/subclass and applicable rules required before deterministic results |
| Claims | Evaluate selected, source-mapped claims after core and additive/name groundwork; required before public MVP launch | Phase 3 | Unsupported wording, evidence or applicability remains REVIEW REQUIRED |
| HSR, GM, irradiation and origin | Not evaluated in the public MVP | Later phases | n/a |

**Capture now, evaluate later:** the MVP data model already records GM, irradiation, origin, additive entries (identity, purpose, concentration) and claim text, so later phases need no data migration for these. They are stored and shown but not evaluated, and the UI says so.

## 9. SaaS seams built in Phase 1

Cheap now, expensive later:

- A workspace identifier on every record.
- `AuthPort` and `EntitlementPort` interfaces with local stubs.
- Feature flags keyed by entitlement.
- All persistence behind repository interfaces.
- A rule-release channel abstraction (bundled now, remote later).
- A versioned export format.
- Sortable unique IDs (ULID or UUIDv7) and revision fields on records, to allow merge or sync later.
- No analytics or third-party scripts; a strict Content Security Policy from the start.

## 10. Regulatory reviewer touchpoints

Questions for each touchpoint are in `docs/reviewer-questions.md`.

| Touchpoint | When               | Purpose                                                                                   |
| ---------- | ------------------ | ----------------------------------------------------------------------------------------- |
| R1         | Before P1-1 (P0-6) | Resolve interpretation questions that shape the engine                                    |
| R2         | During P1-2        | Check clause mappings, vocabulary and explanation wording                                 |
| R3         | P1-5 and P1-6      | Verify and sign off golden label and NIP fixtures                                         |
| R4         | Before Phase 2     | Additives, selected prescribed-name classes, characterising ingredients and other domains |
| R5         | Before Phase 3     | Claims; HSR only if separately approved                                                   |
| R6         | Before beta        | Review of the whole rule catalogue; disclaimers and terms                                 |

## 11. Legal and regulatory register

Status key: **P0-5 SOURCE-MAPPED** = the cited provision was checked against an authoritative source for the limited MVP scope below; this is source mapping, not reviewer approval or a compliance conclusion. **PARTIAL / TO BE VERIFIED** = the provision or instrument is identified but a current compilation/version, exception, transition, or interpretation remains unchecked. **UNVERIFIED** = not checked against a primary source. **TO BE RESEARCHED** = scope is not yet known. P0-5 reviewed/accessed 2026-11-06; version dates below are the dates displayed by the source, not a claim that later amendments cannot occur.

| Instrument                                                                                                                 | Level               | Relevance                                                                      | Needed by                  | Status                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------ | -------------------------- | --------------------------------------------------------------------------------------------- |
| Food Standards Australia New Zealand Act 1991                                                                              | Cth                 | Establishes FSANZ and the Code                                                 | MVP                        | RESEARCHED                                                                                    |
| Food Standards Code: Standards 1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.2.5, 1.2.6 and 1.2.8; Schedules 9 to 13                 | Cth/ANZ             | Core label-presence, ingredient, allergen/advisory, date/storage and NIP requirements | MVP                    | P0-5 SOURCE-MAPPED to the provisions in the verification table below; reviewer interpretation remains pending |
| Food Standards Code: Standards 1.3.1, 1.5.1 to 1.5.3; Schedules 4 to 8, 25, 26                                             | Cth/ANZ             | Additives, claims, GM, irradiation, novel foods                                | Phases 2 and 3             | RESEARCHED; clause mapping TO BE VERIFIED                                                     |
| Food Standards Code: Standards 1.1.1, 1.1.2, 1.3.2, 1.3.3, 1.4.x, 1.5.4; Chapter 2 standards; Schedules 1, 3, 14 to 18, 22 | Cth/ANZ             | Definitions, vitamins and minerals, processing aids, food classes, composition | Phases 2 and 3             | TO BE RESEARCHED                                                                              |
| Country of Origin Food Labelling Information Standard 2016                                                                 | Cth                 | Origin labelling                                                               | Phase 2                    | RESEARCHED; current compilation TO BE VERIFIED                                                |
| Competition and Consumer Act 2010, Australian Consumer Law (Schedule 2)                                                    | Cth                 | Misleading claims; subscriptions                                               | Phases 3 and 4             | UNVERIFIED                                                                                    |
| National Measurement Act 1960 and National Trade Measurement Regulations 2009                                              | Cth                 | Net quantity / measurement marking on packages                                  | MVP (review-only)          | P0-5 SOURCE-MAPPED: Act ss 18JA-18JC; Regulations pt 4, regs 4.3-4.16A and 4.28-4.29, and Sch 5; detailed exceptions/application remain for review |
| Free Range Egg Labelling Information Standard 2017                                                                         | Cth                 | Egg claims                                                                     | Phase 3                    | UNVERIFIED                                                                                    |
| Imported Food Control Act 1992                                                                                             | Cth                 | Imported food and importers                                                    | Later                      | UNVERIFIED; out of MVP                                                                        |
| Therapeutic Goods Act 1989                                                                                                 | Cth                 | Boundary between food and medicine claims                                      | Phase 3                    | UNVERIFIED                                                                                    |
| Privacy Act 1988 and Notifiable Data Breaches scheme                                                                       | Cth                 | Account data in the SaaS                                                       | Phase 4                    | UNVERIFIED; legal advice needed                                                               |
| Spam Act 2003                                                                                                              | Cth                 | Marketing email                                                                | Phase 4                    | UNVERIFIED                                                                                    |
| Health Star Rating implementation guide and artwork licence                                                                | Cth/ANZ             | HSR calculation and display                                                    | Phase 3                    | Guide RESEARCHED; licence TO BE VERIFIED                                                      |
| AS 5300 (fish names)                                                                                                       | Standards Australia | Fish naming context                                                            | Later                      | UNVERIFIED; paid standard                                                                     |
| Subscription law: unfair contract terms, automatic renewal, GST tax invoices                                               | Cth                 | Billing                                                                        | Phase 4                    | TO BE RESEARCHED                                                                              |
| Food Act 1984 (Vic)                                                                                                        | Vic                 | Applies the Code in Victoria; offences and enforcement                         | MVP (context)              | P0-5 SOURCE-MAPPED: s 16(1)-(4), version 119 in force from 2026-07-01; other enforcement provisions not reviewed |
| Food Regulations 2015 (Vic)                                                                                                | Vic                 | Prior register title is imprecise; Victorian food-premises/administrative context | MVP (context only)       | PARTIAL: exact instrument meant by this title TO BE VERIFIED. Official in-force register also lists Food (Forms and Registration) Regulations 2025 (SR 96/2025; in force 2025-11-17); no separate product-label rule mapped |
| Australian Consumer Law and Fair Trading Act 2012 (Vic)                                                                    | Vic                 | State consumer-law context for representations                                  | Phase 3                    | UNVERIFIED; not an MVP deterministic label rule                                               |
| Environment Protection Act 2017 (Vic) and the Victorian container deposit scheme                                           | Vic                 | Beverage-container and packaging obligations                                   | Later                      | UNVERIFIED; TO BE RESEARCHED; outside P0-5 MVP rule scope                                     |
| Privacy and Data Protection Act 2014 (Vic)                                                                                 | Vic                 | Victorian privacy context                                                       | Phase 4                    | UNVERIFIED; not an MVP regulatory rule                                                       |
| Victorian trade measurement rules                                                                                          | Vic                 | Possible state-level interaction with national trade measurement                | MVP (review-only)          | PARTIAL: federal/NMI legal-metrology sources mapped above; separate Victorian instrument/application not checked; TO BE VERIFIED |
| Australasian Recycling Label and the Australian Packaging Covenant                                                         | Voluntary           | Packaging marks                                                                | Later                      | TO BE RESEARCHED                                                                              |
| Food Act 2014 (NZ), Fair Trading Act 1986 (NZ), NZ weights and measures rules                                              | NZ                  | New Zealand market                                                             | Out of scope until decided | TO BE RESEARCHED                                                                              |

### P0-5 clause-level source check (accessed 2026-11-06)

The Federal Register of Legislation (FRL) is the authoritative Code text. FSANZ expressly describes its consolidated PDF as a reference compilation and directs users to the FRL for the authoritative current versions. Links below point to the FRL's `latest` record where the exact instrument identifier was verified. The compilation number/date is recorded where it was visible in the FRL record/search result; otherwise it is explicitly left for verification rather than inferred. Applicability, exceptions and interpretation remain subject to the R1 reviewer questions.

| MVP source/rule area | Primary provision checked | Authoritative source and version/effective date checked | P0-5 finding and remaining limit |
| --- | --- | --- | --- |
| General label and information requirements | Standard 1.2.1, ss 1.2.1-2, -4 to -9; -24 general legibility; -25 warning statement type size | [FRL Standard 1.2.1](https://www.legislation.gov.au/F2015L00386/latest), latest record checked 2026-11-06: compilation F2026C00538 (C13), effective 2026-06-09. P250 caffeine changes have a transition ending 2028-06-09. | Section 1.2.1-24 requires English words, legibility, prominence and distinct contrast; -25 requires warning statement type of at least 1.5 mm on small packages and 3 mm otherwise. R1-21 remains for reviewer confirmation of renderer application/print tests, not for sourcing the stated values. |
| Food identification, name, supplier and lot | Standard 1.2.2, ss 1.2.2-2 (name of food), -3 (lot identification) and -4 (name and address of supplier) | [FRL Standard 1.2.2](https://www.legislation.gov.au/F2015L00389/latest), compilation F2024C00726 (C01), effective 2024-07-22 | Provisions mapped for presence checks. Food-name appropriateness, exact sufficiency of entered supplier/lot data and exemptions are not resolved; R1-16/R1-17 remain open. |
| Warning/advisory statements and allergen declarations | Standard 1.2.3, ss 1.2.3-2 and -3 (specified warning statements), -4 (mandatory declarations); Schedule 9, including S9-2 and S9-3 | [FRL Standard 1.2.3](https://www.legislation.gov.au/F2015L00397/latest), compilation F2024C01143 (C06), effective 2024-10-29. [FRL Schedule 9](https://www.legislation.gov.au/F2015L00479/latest), compilation F2021C00195 (C02), effective 2021-02-25. | Core declaration and schedule source are mapped; schedule-trigger-to-product classification, allergen exception evidence, required names/format, and whether later amendments affect S9 were not exhaustively audited. R1-05 to R1-10 and R1-19 remain pending. |
| Ingredient statement and permitted generic names | Standard 1.2.4, ss 1.2.4-2 and -3 (statement/listing), -4 (ingredient naming), -5 (descending ingoing-weight order and compound ingredients); Schedule 10 | [FRL Standard 1.2.4](https://www.legislation.gov.au/F2015L00392/latest), compilation F2025C00914 (C02), effective 2025-09-02. [FRL Schedule 10](https://www.legislation.gov.au/F2015L00480/latest), compilation F2021C00203 (C04), effective 2021-02-25. | Source provisions are mapped. Their application to nested formulations, calculation stages, water/volatile quantities and permitted-name choice remains subject to R1-01 to R1-04; source mapping does not resolve those questions. |
| Date marking | Standard 1.2.5, ss 1.2.5-3 (date marking) and -4 (sale after use-by date) | [FRL Standard 1.2.5](https://www.legislation.gov.au/F2015L00401/latest), compilation F2021C00660 (C03), effective 2021-06-03. | Provisions mapped. Classification, shelf-life evidence, alternatives and exemptions remain R1-18 items; no shelf-life judgement is automated by this mapping. |
| Directions for use and storage | Standard 1.2.6, s 1.2.6-2 | [FRL Standard 1.2.6](https://www.legislation.gov.au/F2015L00393/latest), effective 2016-03-01 (instrument F2015L00393; no later compilation shown on the record checked). | Provision mapped for the identified storage/directions triggers. Triggering product/process facts and exact rule coverage remain R1-19; no trigger or listed-food case is approved for deterministic evaluation here. |
| NIP applicability, content, calculation and format | Standard 1.2.8, ss 1.2.8-5 to -7 and -11 to -13; Schedules 11, 12 and 13 | [FRL Standard 1.2.8](https://www.legislation.gov.au/F2015L00395/latest), F2026C00411 (C06), effective 2026-04-30. [Schedule 11](https://www.legislation.gov.au/F2015L00481/latest), F2024C01138 (C06), effective 2024-10-29. [Schedule 12](https://www.legislation.gov.au/F2015L00482/latest), F2017C00342 (C02), effective 2017-04-13. [Schedule 13](https://www.legislation.gov.au/F2015L00483/latest), F2021C00621 (C02), effective 2021-06-03. | Provisions/source chain mapped. Schedule 11 determines the specified calculation methods; Schedule 12 supplies panel formats; Schedule 13 addresses small-package nutrition information. Exemptions, evidence policy, prepared/drained cases and rounding still require R1-11 to R1-15. An alcohol energy-labelling transition is noted in the baseline; exact transition provision, application and dates are TO BE VERIFIED before rule use. |
| Net quantity / measurement marking | National Measurement Act 1960, ss 18JA-18JC; National Trade Measurement Regulations 2009, pt 4 (regs 4.3-4.16A and 4.28-4.29) and Sch 5 | [FRL Act](https://www.legislation.gov.au/C1960A00064/latest), compilation C2024C00648 (C22), effective 2024-10-14. [FRL Regulations](https://www.legislation.gov.au/F2009L03479/latest), compilation F2024C00311 (C08), effective 2024-03-20. [Department/NMI guide](https://www.industry.gov.au/publications/guide-sale-pre-packaged-goods), updated 2025-11-27. | National trade-measurement source mapping replaces “unmapped”; it does not establish one universal label output for every product. Marking exemptions, unit, position, character size, measurement method, quantity accuracy and legal-metrology decisions remain review-only (R1-20). |
| Victorian application of Code | Food Act 1984 (Vic), s 16(1)-(4), s 20(1B) | [Victorian legislation, Act in force](https://www.legislation.vic.gov.au/in-force/acts/food-act-1984/119), version 119, effective 2026-07-01 | s 16 provides Code-compliance context; s 20(1B) permits council appointment of authorised officers. This does not establish principal enforcement practice or constitute a separate labelling rule or product approval. Other Food Act provisions were not reviewed. |
| Victorian regulations and other listed Victorian instruments | The prior register's “Food Regulations 2015 (Vic)” title was not confirmed. Official register lists Food (Forms and Registration) Regulations 2025, SR 96/2025, in force 2025-11-17, and Food (Primary Production and Processing) Regulations 2025, SR 1/2025, in force 2025-02-11. | [Victorian Food (Forms and Registration) Regulations 2025](https://www.legislation.vic.gov.au/in-force/statutory-rules/food-forms-and-registration-regulations-2025); [Victorian Food (Primary Production and Processing) Regulations 2025](https://www.legislation.vic.gov.au/in-force/statutory-rules/food-primary-production-and-processing-regulations-2025). | Current titles/status checked, but provisions were not clause-reviewed for the MVP labelling scope. The intended 2015 title and its status are TO BE VERIFIED. ACL/Fair Trading, environment/container-deposit and privacy rows remain unverified and outside MVP deterministic rules. R1-27 remains unanswered. |

This table does not verify Standard 1.2.7/1.2.10, additive permissions, prescribed names, claims, HSR, GM, irradiation, country of origin, packaging marks beyond net measurement, nutrition analytical adequacy, or any non-Victorian market. Those remain out of P0-5 scope. The official FSANZ Code index (`https://www.foodstandards.gov.au/food-standards-code/legislation`) was checked as the source navigator on 2026-11-06; its October 2026 consolidation was not substituted for FRL text.

## 12. Progress tracker

**Current position:** The approved post-I9 N1-N14 track, including
N12a-N12c, is complete as recorded above. Earlier Phase 1 reviewer-ready
engineering and Phase 2, Phase 3 and usability groundwork are retained below
and in section 7. The drink-specific D0-D11 sequence remains paused by the
2026-11-16 reset; it is not the next work order. Historical phase and release
gates remain open unless explicitly superseded. The owner approved the
UXR16-UXR23 workflow-clarity and label-content roadmap on 2026-11-19;
UXR16-UXR23, UXS1-UXS13 and CRS1-CRS5 are complete. The guided claims roadmap
continues with CRS6. None of these tracks closes reviewer or
release gates.

Repository preparation (2026-11-05)

- [x] `docs/implementation-plan.md` written
- [x] `AGENTS.md` written
- [x] `docs/reviewer-questions.md` written

Phase 0

- [x] P0-1 Archive legacy frontend
- [x] P0-2 Scaffold workspace
- [x] P0-3 CI
- [x] P0-4 Spikes S1 to S4 recorded as ADRs (S2 source findings recorded in ADR-003; no presentation policy is inferred; S3 print-legibility follow-up is a P1-5 gate)
- [x] P0-5 Legal-register verification for the MVP rules (source mapping recorded 2026-11-06; explicit compilation/interpretation follow-ups retained)
- [x] P0-6 Reviewer session R1 held (recorded 2026-11-06; open interpretations gate affected deterministic calculations and rule data, not foundational arithmetic/graph work)

Phase 1 - reviewer-ready engineering baseline reached; reviewer acceptance pending

- [x] Local offline workspace, illustrative export path and automated engineering checks are available for hands-on testing.
- [ ] R3-01 reviewer-verified golden fixtures.
- [ ] R1-21 minimum-size policy and physical print-scale acceptance.
- [ ] R1-13 NIP display policy and fixtures before deterministic NIP presentation; until then NIP display remains `REVIEW REQUIRED`.

- [ ] P1-1 Engine core (in progress; NIP display remains gated)
- [ ] P1-2 Rules data v0.1
- [ ] P1-3 Local data layer
- [ ] P1-4 UI
- [ ] P1-5 Label and PDF
- [ ] P1-6 Quality gate

These P1 checkboxes track completion of the full step requirements, not the
reviewer-ready milestone. Gated NIP presentation, the illustrative-only label
content, and pending reviewer acceptance mean the full Phase 1 scope is not
being claimed as complete.

Turn sequence: [x] 1 (foundational arithmetic, mass handling, recursive
expansion); [x] 2 (ingoing-mass percentages and explicit process mass
accounting); [x] 3 (source-traceable nutrient aggregation and Schedule 11
energy calculation); [x] 4 (allergen propagation, ordered declaration tree
and result/trace contract); [x] 5 (versioned draft rule data, release
validation and explanation templates); [x] 6 (local record schemas,
repositories and immutable approved snapshots); [x] 7 (transactions,
migrations, recovery points, backup/restore and storage warnings); [x] 8
(accessible workspace shell and local ingredient, formulation and product
draft workflows); [x] 9 (review/trace and backup/restore workflows); [x] 10
(exact-size SVG label layout and content-block checks); [x] 11 (deterministic
PDF export); [x] 12 (engineering demo and automated checks; reviewer-verified
golden fixtures remain blocked on R3-01).

Turn 12 has an illustrative-only demo workspace, a local SVG/PDF preview and
export workflow, property tests, offline and clean-profile restore tests, a
third-party-script CSP check, and automated WCAG 2.1 A/AA checks. These are
engineering fixtures, not reviewer-approved regulatory golden fixtures.
R3-01 remains pending, so reviewer acceptance of P1-6 is not complete.
R1-21 minimum-size policy and physical print proof also remain open P1-5
acceptance gates. These outstanding gates do not block bounded Phase 2
research and review-only groundwork under the approved milestone split.

Phase 2 groundwork - recorded progress; reviewer sign-off outstanding

- [x] Turn 1: candidate source map recorded in `docs/mvp-regulatory-research.md`.
- [x] Turn 2: evidence-backed classification inputs that never infer a class from a product name alone.
- [x] Turn 3: additive source capture with provenance and nested ingredient paths; no permission or exemption result.
- [x] Turn 4: Schedule 7/8 declaration-name data and review-only declaration candidates; no permission crosswalk.
- [x] Turn 5: source-validated, review-only additive permission catalog for the selected cohorts; no evaluation or activation.
- [x] Turn 6: pure, trace-producing permission evaluator; review-only against the shipped draft data.
- [x] Turn 7: final-food additive concentration calculation (units, density, yield, basis); review-only when data is missing.
- [x] Turn 8: same-purpose mixture and aggregate-colour evaluators; review-only on missing facts.
- [x] Turn 9: carry-over evaluator and review-only processing-aid checklist; no exemption from a status flag.
- [x] Turn 10: draft prescribed-name candidate catalog and review-only candidate identification.
- [x] Turn 11: infant 'sweetened' composition check; deterministic only for an approved rule, otherwise review-only.
- [x] Turn 12: workspace integration of additive and prescribed-name entry, results and trace (draft data, all results review-only).
- [x] Turn 13: Phase 2 engineering quality gate and reviewer verification records (docs/phase2-gate-record.md); reviewer sign-off outstanding.
- Deterministic additive and prescribed-name results remain blocked on R4 and applicable reviewer-verified fixtures.

Phase 3 claims groundwork and U1-U9 are recorded in section 7; this does not
mean claims are reviewer-approved or complete for public release. Phases 4 to
6 have not started.

Practical workflow and label-content track (approved 2026-11-19; see section 7
and [ADR 034](./adr/034-practical-workflow-progressive-disclosure.md))

- [x] UXR16: Simplify ingredient entry and derive supported caffeine facts.
- [x] UXR17: Simplify formulation entry and progressively disclose optional manufacturing details on Formulation.
- [x] UXR18: Simplify Product nutrition and customer-direction flow.
- [x] UXR19: Separate Product checks from Label-specific claims and wording.
- [x] UXR20: Audit label-content gaps and prioritize the implementation sequence.
- [x] UXR21: Generate a clear, traceable draft ingredient declaration.
- [x] UXR22: Implement supported allergen declarations and separate precautionary statements.
- [x] UXR23: Reconcile and improve remaining pack and business information.

Streamlining and label-workspace track (agreed direction 2026-11-23)

- [x] UXS1: Discuss and settle Formulation and Product design.
- [x] UXS2: Remove the Formulation composition section.
- [x] UXS3: Remove the Formulation manufacturing section.
- [x] UXS4: Simplify Product directions and nutrition.
- [x] UXS5: Remove Product Additives and Names.
- [x] UXS6: Simplify Product review and next actions.
- [x] UXS7: Discuss the Label workspace in detail.
- [x] UXS8: Implement the Label tabs and live-preview layout.
- [x] UXS9: Explain pack details and precautionary allergens.
- [x] UXS10: Connect claims to existing nutrition facts.
- [x] UXS11: Remove redundant claim-entry questions.
- [x] UXS12: Complete the end-to-end usability and regression gate.
- [x] UXS13: Discuss and plan the wider claims system.

Guided claims roadmap (agreed direction 2026-11-23)

- [x] CRS1: Inventory and design the claim journey.
- [x] CRS2: Find candidate claims locally.
- [x] CRS3: Classify and resolve candidates.
- [x] CRS4: Guide users to missing facts.
- [x] CRS5: Recheck the first five draft checks.
- [x] CRS6: Connect verified checks and NIP interactions.
- [x] CRS7: Render selected claims on review copies.
- [ ] CRS8a: Research no-added-sugar claims.
- [ ] CRS9a: Implement the supported no-added-sugar slice.
- [ ] CRS8b: Research gluten-free claims.
- [ ] CRS9b: Implement the supported gluten-free slice.
- [ ] CRS8c: Research fibre claims.
- [ ] CRS9c: Implement the supported fibre slice.
- [ ] CRS8d: Research protein claims.
- [ ] CRS9d: Implement the supported protein slice.
- [ ] CRS10: Plan comparative and health-claim follow-ons.
- [ ] CRS11: Complete the claims end-to-end regression and scope gate.

## 13. Verification and definition of done

A step is done only when all of the following hold:

1. CI passes: typecheck, lint, unit and property tests, rule-data validation, build, and end-to-end and accessibility checks once a UI exists.
2. Tests exist for the behaviour, including missing inputs and non-applicability, and no unknown input produces PASS.
3. Any regulatory value or rule added has a source, a mapping confidence and, where required, reviewer sign-off.
4. No requirement in section 4 is violated.
5. The progress tracker and, if a decision was made, an ADR are updated.

Phase 1 manual demo: complete the flow offline; restore an encrypted backup on a clean browser profile; confirm the Content Security Policy blocks third-party scripts.

## 14. Open questions

- Reviewer availability for R1 to R3 (user to confirm dates).
- Whether the demo is hosted publicly during Phase 1.
- HSR artwork and calculator licence terms (Phase 3).
- Whether the Australian Food Requirements Analyst agent should be extended or paired with an implementation agent.
- Plans, trial and pricing (deferred, D6).
- Application name and branding.

## 15. Change log

- 2026-11-05: Plan approved and written. Decisions D1 to D6 recorded. Reviewer touchpoints R1 to R6 added.
- 2026-11-05: Completed P0-2. Scaffolded the pnpm workspace, strict TypeScript project references, quality tooling and ADR-001.
- 2026-11-05: Completed P0-3. Added GitHub Actions CI for install, typecheck, lint,
  unit tests, rule-data validation stub and build.
- 2026-11-05: Completed spike S1 and recorded the local database decision in
  ADR-002. P0-4 remains in progress pending the S2 rounding check (R1-13),
  S3 print-legibility follow-up and S4.
- 2026-11-06: Recorded S2's decimal arithmetic comparison and selected big.js
  in ADR-003. Regulatory rounding remains pending reviewer answer R1-13.
- 2026-11-06: Recorded S3's PDF route comparison and recommended
  jsPDF/svg2pdf.js in ADR-004. Physical print legibility and font licensing
  remain follow-ups.
- 2026-11-06: Completed the S4 rules-data experiment and recorded the
  typed-record, fixed-evaluator and source-validation design in ADR-005.
  Production schemas and regulatory rules remain P1-2 work after source
  verification and reviewer input.
- 2026-11-06: Completed P0-5 source mapping for the listed MVP Code standards,
  schedules, national net-quantity metrology and Victorian context. Updated
  requirements mapping confidence. Current-version gaps and interpretation
  questions remained explicitly open at the time; no rule has been
  implemented or approved.
- 2026-11-06: R1 interview held. Recorded a bounded source check and unresolved
  blocking follow-ups in `docs/reviewer-questions.md`; R1-22 requests a scope
  change that conflicts with D1 and requires a product-owner decision. Phase 0
  remains in progress; the session itself is not approval of unresolved rules.
- 2026-11-09: Revised D1 at the product owner's direction: the public MVP has a
  bounded additive and prescribed-name scope focused on the same two initial
  product cohorts: formulated caffeinated beverages and foods for infants.
  Reviewer verification must establish exact Code classifications, applicable
  rules and evidence. Claims follow core and additive/name groundwork and are
  required before public launch. Supplier-provided nutrient data is the initial
  source.
- 2026-11-09: Closed P0-4 after recording the S2 primary-source findings in
  ADR-003. The Code's NIP display limit is not an internal rounding sequence;
  deterministic NIP formatting remains gated on reviewer review. S3's
  print-legibility follow-up is carried into P1-5. Began P1-1 foundational
  decimal arithmetic.
- 2026-11-09: Added a turn-by-turn Phase 1 execution sequence. Completed turn 1
  with pure recursive formulation expansion, unit-normalized ingredient masses,
  cycle/missing-reference rejection and retained ingredient source paths.
- 2026-11-09: Completed Phase 1 turn 2 (CALC-001, CALC-003): added source-path
  preserving ingoing percentages on a common mass basis and explicit process
  mass balance for additions, gains, losses and declared final mass. Missing
  process profiles return REVIEW REQUIRED; inconsistent or impossible mass
  inputs are rejected rather than inferred.
- 2026-11-09: Completed Phase 1 turn 3 (CALC-010, CALC-015): added weighted
  per-100-g nutrient aggregation with source/evidence trace and a Schedule 11
  component-factor calculator. It requires an explicit food-state basis,
  complete component coverage and a versioned source-cited factor set; missing
  evidence, factors or unresolved mapping return REVIEW REQUIRED. Updated the
  research record to Schedule 11 compilation F2024C01138 (C06). Rounding,
  carbohydrate-method mapping, and specific/general component allocation
  remain gated as noted.
- 2026-11-09: Completed Phase 1 turn 4 (CALC-005, FORM-005, TRACE-008,
  TRACE-014): added source-path-preserving allergen propagation, explicit
  incomplete/conflicting/exemption review states, ingoing-mass ordering for a
  nested ingredient declaration tree, and a typed result/trace contract with
  non-certification wording. The engine returns structured declaration data,
  not final legal label text; unresolved names, compound exceptions, allergen
  exemptions and final-food sulphite evaluation remain review-gated.
- 2026-11-09: Completed Phase 1 turn 5 (TRACE-014, TRACE-015): added typed
  versioned rule-release data, source and fixture cross-reference validation,
  fixed evidence-presence conditions, explanation-template validation and
  rendering, and activation gates for source and reviewer verification.
  Added five review-only draft evidence rules; none enables PASS or FAIL, and
  the candidate allergen vocabulary remains unapproved. Rule-data validation,
  tests, lint, typecheck and production build pass.
- 2026-11-09: Completed Phase 1 turn 6 (LOCAL-001, LOCAL-004): added typed
  Dexie repositories and indexed local schemas for ingredients, formulations,
  products and immutable approved snapshots. CRUD validation and snapshot
  immutability tests pass. Multi-record approval transactions, migrations,
  backup/restore and durability handling remain for turn 7.
- 2026-11-09: Completed Phase 1 turn 7 (LOCAL-003, LOCAL-006, LOCAL-007,
  LOCAL-009, LOCAL-010, LOCAL-012; BKP-001, BKP-003, BKP-005, BKP-006):
  added atomic approval/version-decision writes, a pre-migration recovery
  point and rollback-tested schema upgrade, integrity-checked versioned
  workspace backup/restore with passphrase encryption, explicit replacement
  conflict handling, circular-reference rejection and a non-sensitive
  cleared-store marker. Durable storage remains browser-dependent and the
  encrypted backup passphrase cannot be recovered. Full tests, typecheck,
  lint, rule validation and build pass.
- 2026-11-09: Completed Phase 1 turn 8 (ING-001 to ING-003, SPEC-001,
  FORM-001, FORM-004, LOCAL-001): added an accessible local-first Vue
  workspace for ingredient/specification metadata, nested formulation
  drafts and linked product drafts. The UI uses Tailwind CSS v4 and an
  in-repository shadcn-vue-style button component. Supplier specification
  capture currently stores reference/date metadata on the ingredient draft;
  distinct specification version records remain a data-model follow-up.
  Unit, type, lint, build, rule-validation and Playwright checks pass; the
  app has no horizontal overflow at a 390 px viewport. Turn 9 was
  subsequently completed as recorded below.
- 2026-11-09: Completed Phase 1 turn 9 (TRACE-008, TRACE-012, TRACE-014,
  TRACE-018; LOCAL-006, LOCAL-010, LOCAL-012; BKP-001, BKP-003, BKP-005):
  added a review/trace view for draft input provenance and any stored
  evaluation results, plus local encrypted/unencrypted backup export,
  integrity inspection, explicitly confirmed restore/replacement, recovery
  point visibility and a durable-storage request. Unknown nutrient/allergen
  data stays visibly unknown; the review view reports REVIEW REQUIRED while
  no active regulatory release is installed and does not invent an
  evaluation. Typecheck, lint, build, unit tests, rule validation and
  Playwright tests pass.
- 2026-11-09: Completed Phase 1 turn 10 (PACK-001, PACK-004): added a pure
  exact-millimetre SVG layout function with orientation and margin validation,
  typed required content blocks, XML escaping, minimum-size/source evidence
  checks, and explicit missing-content and overflow issues. Text is never
  silently reduced. Unverified minimum-size policy remains REVIEW REQUIRED;
  line-width checks are estimates requiring rendered proof, and no NIP
  rounding or legal-content decision is inferred. Nine focused layout tests,
  typecheck, lint and label package build pass.
- 2026-11-09: Completed Phase 1 turn 11 (PACK-001, PACK-005): added
  deterministic PDF export from the generated SVG, with an exact-size label
  page and a separate A4 provenance/review report page. The report includes
  product version, rule release, export timestamp, layout issues and the
  non-certification statement. Chromium tests verify stable repeated bytes,
  page dimensions and preserved text size. Font embedding and physical print
  legibility remain visibly REVIEW REQUIRED; these gates do not certify a
  label or mark P1-5 complete.
- 2026-11-09: Implemented the engineering portion of Phase 1 turn 12
  (PACK-001, PACK-005, TRACE-012, TRACE-018): added explicitly fictional local
  demo data and an illustrative-only layout/PDF screen; lazy-loaded both PDF
  renderer dependencies and preloaded them before the offline export test;
  added property tests, clean-profile encrypted-restore and CSP browser tests,
  and WCAG 2.1 A/AA checks across workspace screens. The full automated
  quality suite passes. Turn 12 and P1-6 remain unchecked because R3-01 to
  R3-03 golden-fixture answers are pending; the illustrative demo is not a
  substitute. Minimum-size policy and physical print proof remain open under
  R1-21.
- 2026-11-09: Manual inspection identified and fixed an SVG-to-PDF font
  scaling error: millimetre font sizes were converted to points even though
  the SVG viewBox already mapped user units to millimetres. Added a browser
  regression assertion for the authored font size and page scale. This does
  not resolve line wrapping or replace print-at-actual-size proof.
- 2026-11-09: Added a 13-turn Phase 2 execution sequence for the selected
  additive-limit and prescribed-name cohorts. The sequence separates primary
  source mapping, evidence-backed classification, additive and prescribed-name
  workflows, and release validation. At that point Phase 1 remained the
  current phase; reviewer gates remain required before deterministic Phase 2
  rule activation.
- 2026-11-09: Completed Phase 2 Turn 1's candidate source map for the two
  selected cohorts in `docs/mvp-regulatory-research.md`. Product-specific
  classification, complete additive and prescribed-name coverage, transitions
  and reviewer verification remain open; no rules were activated.
- 2026-11-09: Completed Phase 2 Turn 2 with local, evidence-backed product
  classification profiles and review-only candidate screening for the two
  selected cohorts. Unknown, unsupported and conflicting evidence stays
  inconclusive, and prescribed-name screening does not infer a candidate from
  the proposed name. No deterministic rules were activated.
- 2026-11-09: Completed Phase 2 Turn 3 with local additive source records on
  ingredient drafts and source-path tracing through nested formulations.
  Missing source details remain absent or unknown; permissions, declarations,
  carry-over and processing-aid conditions are not evaluated.
- 2026-11-09: Completed Phase 2 Turn 4 with source-linked Schedule 7/8
  declaration-name data and review-only declaration candidates. No Schedule 7
  class crosswalk or permission inference was added.
- 2026-11-09: Completed Phase 2 Turn 5 with source-validated, draft additive
  permission data for the selected cohorts: 59 Schedule 15 rows, three broad
  Schedule 16 type candidates, 21 Schedule 14 purposes, and seven calculation
  bases. The infant-food INS 414 presentation remains unverified; incomplete
  Schedule 16 membership and category/product mappings remain explicit.
  Validation and tests prevent activation while any entry remains unreviewed;
  no permission evaluator or deterministic result was added.
- 2026-11-09: Completed Phase 2 Turn 6 with a pure additive permission
  evaluator in `packages/engine`. It returns a trace (rule, selected row,
  inputs, explanation). PASS/FAIL requires Provision-level mapping confidence,
  reviewed catalog/category/row data, a person-confirmed category, Schedule 14
  purpose, matching unit and calculation basis, and no conditions or
  aggregation. A missing row is never FAIL. All shipped draft data stays
  REVIEW REQUIRED (guard test in `scripts/`). Concentration calculation,
  mixtures, carry-over and the UI are not included.
- 2026-11-09: At the product owner's direction, split Phase 1's reviewer-ready
  engineering baseline from reviewer acceptance. Began the bounded Phase 2
  groundwork workstream; R3 fixtures, print-scale acceptance and other
  applicable reviewer gates remain required before deterministic results or
  public release.
- 2026-11-10: Completed Phase 2 Turn 7 with a pure final-food additive concentration calculator (direct and nested sources, explicit unit conversion, density evidence, documented yield). Missing or unsupported inputs return REVIEW REQUIRED; no compliance result and no UI wiring.
- 2026-11-10: Completed Phase 2 Turn 8 with pure same-purpose mixture (1.3.1�6) and aggregate colour (1.3.1�4(3)) evaluators. Exact boundary arithmetic, per-contributor trace, INFORMATIONAL when not applicable, REVIEW REQUIRED on missing or unconfirmed facts. The 1.3.1�6(2) equation image is TO BE VERIFIED; no rule data or UI wiring added.
- 2026-11-10: Completed Phase 2 Turn 9 with a pure carry-over evaluator (1.3.1�3(2), infant formula products excluded) and a review-only processing-aid checklist (1.1.2�13). Standard 1.3.3 permissions and incidental presence are TO BE RESEARCHED; no rule data or UI wiring added.
- 2026-11-10: Completed Phase 2 Turn 10 with a draft prescribed-name candidate catalog (Standards 2.9.2 and 2.6.4 read; neither prescribes a finished-food name) and a pure identifyPrescribedNameCandidates that distinguishes no rule identified from candidates and is never PASS. Rules are draft, review-only and TO BE VERIFIED against Standard 1.2.2 and other standards; no UI wiring.
- 2026-11-10: Completed Phase 2 Turn 11 with a pure evaluateInfantSweetenedWord (Standard 2.9.2-7(3)(d)): above 4 g/100 g needs the word 'sweetened' in the proposed name; exactly 4 does not. Deterministic only for a reviewed Provision-confidence rule with person-confirmed cohort, figure basis and evidence; the shipped draft rule stays REVIEW REQUIRED. Honey/'sterilised', percentage declarations, caffeinated beverages and true-nature judgements remain review-only. No UI wiring.
- 2026-11-10: Completed Phase 2 Turn 12: new 'Additives & names' workspace section. Person-confirmed cohort, additive category, unit, process-mass confirmation, final density, GMP, added-sugars figure and evidence are saved on the product record (validated in storage) and feed the engine evaluators using the bundled draft rule data. Declaration candidates are shown separately from permission/concentration, name-candidate and 'sweetened' results, each with status, review reasons, rule trace and non-certification text. Every result is REVIEW REQUIRED with the shipped draft data. Not wired (shown in the UI as review-only): same-purpose mixture, aggregate colour, carry-over and processing-aid checks; per-ingredient density; concentrations assume a 100 g ingoing formulation.
- 2026-11-10: Completed Phase 2 Turn 13: added the Phase 2 gate test (source/version, no activation, per-row cohort fixtures, fast-check properties) and docs/phase2-gate-record.md with classification, mapping, fixture and sign-off records plus the unsupported-case list. Fixed a gap where the scripts/ guard tests were not run by pnpm test. All outputs remain REVIEW REQUIRED; reviewer gates R4, R3-01 and R1-21 are still open, so Phase 2 is engineering-complete but not release-approved.
- 2026-11-10: Completed Phase 3 Turn C1 (claims research): section 23 of the research doc records sources read, the proposed first supported set (low energy, fat, sugars, sodium; good source of fibre) and review-only items; reviewer questions R5-C1-01 to -06 added. Phase 3 groundwork turns C1-C8 recorded. No code or rule data changed.

- 2026-11-10: Completed Phase 3 Turn C2: ADR-006 accepted (D8). Added pure illustrate, illustrateAdditivePermission and illustrateInfantSweetenedWord in packages/engine and the IllustrativeResult domain type (no status field). Only reviewer gates are lifted, and the evaluator re-runs at most once, never when a missing fact is present. Tests show the official result and catalog are unchanged. Web toggle deferred to C7; no shipped data changed.
- 2026-11-10: Completed Phase 3 Turn C3 (CLAIM-006): added the ProductClaim domain type and an optional claims list on the product record, validated in storage (unique ids, text kept exactly as entered, person-set classification, supported-claim id only on nutrition content claims). Nothing classifies claim text automatically. No UI or rule data yet.
- 2026-11-10: Completed Phase 3 Turn C4: added a draft claimRuleCatalog (low energy, low fat, low sugars, low sodium, good source of dietary fibre) with sources SRC-CLAIM-001 (Schedule 4) and SRC-CLAIM-002 (Standard 1.2.7). Thresholds were re-read against S4-3 and match the C1 research. Validator checks sources, units, per-100 versus per-serving limits, Provision confidence for deterministic rules and the activation gate; every rule stays draft. Each rule lists what is not yet verified (wording equivalence, NIP rows, accompanying statements). No evaluator or UI yet.
- 2026-11-10: Completed Phase 3 Turn C5: added a pure nutrition-content-claim evaluator with a per-condition checklist (rule approval, wording, classification, exclusions, food form, evidence, amount, threshold, general condition). Any REVIEW item gives REVIEW REQUIRED and dominates a failing threshold; a FAIL needs every condition to be answerable. Added illustrative-preview support for claims. Property tests confirm draft rules never yield PASS or FAIL. No UI wiring yet (C7).
- 2026-11-10: Completed Phase 3 Turn C6: added evaluateClaim, which routes a claim by the person's confirmed classification. Comparative, health, not-code-regulated, unclassified and unsupported nutrition claims are review-only with their own reason codes. Prohibited contexts from Standard 1.2.7-4 (infant formula product, kava, over 1.15% alcohol) are three explicit person answers: any 'applies' gives REVIEW REQUIRED, any unanswered is unconfirmed, and only three explicit 'no' answers reach the C5 evaluator. Property test: nothing else can PASS or FAIL. No UI yet (C7).
- 2026-11-10: Completed Phase 3 Turn C7: added a workspace Claims section (product facts, claim entry with the person's own classification and confirmation, supported-rule link, figure and dated evidence). Results show a status as text, the condition checklist, rule and source, what is not yet verified, and the non-certification statement, separate from additive and name results. Storage gained per-claim nutrientAmount and evidence and a product claimFacts record, both validated. The illustrative preview toggle is per session, off on every load, not saved, labelled ILLUSTRATIVE ONLY and absent from the label and PDF; it only lifts reviewer gates and never missing facts. End-to-end and accessibility tests added. The preview toggle is not yet on the Additives & names page.
- 2026-11-10: Completed Phase 3 Turn C8: added the claims gate test (source and version checks, fixtures for every shipped rule, review-only paths, a property test that draft data never gives PASS or FAIL, and reviewer-record checks) and docs/phase3-claims-gate-record.md with reviewer verification tables, the unsupported-claims list and a blank sign-off. Claims track C1-C8 is engineering-complete; no reviewer sign-off is recorded and no deterministic claim result is enabled.
- 2026-11-10: Completed Worked-examples Turn W1: the illustrative-preview toggle is now on the Additives & names page as well as Claims, sharing one per-session setting (off on load, not saved, absent from the label and PDF) through shared toggle and note components. Permission and infant 'sweetened' results show an ILLUSTRATIVE ONLY note when on; the official status is unchanged and prescribed-name candidates have no preview. Unit and end-to-end tests added; accessibility sweep passes.
- 2026-11-10: Completed Worked-examples Turn W2: drafted docs/history/worked-examples-scenarios.md (four invented products, a good and a problem variant for caffeinated beverages and infant food, with expected official and preview results). Document only; awaiting user approval before W3.
- 2026-11-10: Completed Worked-examples Turn W3: added the worked-examples mechanism (apps/web/src/worked-examples.ts). 'Load worked examples' adds tagged records by fixed id, never overwrites an existing id and rolls back on failure; 'Remove worked examples' deletes only records tagged worked-example after a confirmation, and keeps any the person's own work uses or that have an approved version. The example set is empty until W4/W5, so the panel stays hidden until products exist. Unit tests use an in-memory store; the existing demo and its tests are unchanged.
- 2026-11-10: Completed Worked-examples Turn W4: added the caffeinated beverage worked examples (Example Citrus Boost, good; Example Citrus Boost Max, problem) with invented ingredients, additive concentrations, claims and facts, all tagged worked-example. Tests lock the expected official REVIEW REQUIRED and preview outcomes; an end-to-end test loads them, checks the preview and accessibility, and removes them. Found and fixed a defect: limits printed with a space (for example '3 000') made the permission preview crash; they are now read as plain numbers, with a regression test. Recorded two findings for the user in the scenario sheet: the conversion basis for benzoate, sorbate, sulphite and steviol limits cannot be entered yet (previews blocked), and an uncoded added-caffeine source blocks every additive check on a product.
- 2026-11-10: Completed Worked-examples Turn W5 and two user-approved changes. (1) Calculation basis: added an optional calculatedAs to the additive concentration (domain, storage validation, ingredient form field 'Figure already converted to'). The person converts the figure and names the substance; the engine passes it on only when every contributing source states the same basis and never converts. (2) Added caffeine: a source with the addedCaffeine declaration route is now treated as an identified, different substance in the additive concentration calculation and is not listed as uncoded; caffeine's own Standard 2.6.4 limits are still not checked. P1 now includes added caffeine and sodium benzoate (211, as benzoic acid). W5: added Example Apple and Oat Puree (good) and Example Honey and Oat Puree (problem), covering carrageenan over limit, sweetened-word blocked by unconfirmed sugars basis, PROHIBITED_CONTEXT on Low fat, unconfirmed classification on Low sodium and the sterilised-honey candidate. Tests and e2e updated; scenario sheet corrected to match.
- 2026-11-10: Completed Worked-examples Turn W6: added an in-app 'Guide to the worked examples' (shown on the Overview once examples are loaded) describing each of the four products and what to look for. The end-to-end test now also opens the label layout for the beverage and infant examples, exports a PDF draft for one, and runs the accessibility check with the guide visible.
- 2026-11-10: Completed Worked-examples Turn W7 (review checkpoint). The user's feedback is that the Additives & names and Claims pages are confusing and wordy, the program must guide people who do not know the Code, show only relevant fields, explain better, and produce real label content (ingredient declaration, allergens, mock NIP) rather than only REVIEW REQUIRED results. Drafted docs/history/usability-design.md (track U1-U8: guided label builder, three-way plain-English checklist over unchanged engine statuses, draft label content). Awaiting approval of the design. Sports supplements postponed until the usability track is done.
- 2026-11-10: Usability track U1 approved (docs/history/usability-design.md), now U1-U9 with a plain-English pass on Overview, Ingredients, Formulations and Products as U2. Decisions: other products get a basic label plus consultant note; state names 'Entered information looks fine!', 'Needs attention!', 'Consultant review recommended'. The analyst agent verified NIP display rules in primary legislation (docs/nip-display-research.md): 3 significant figure cap (1.2.8-7(3)), optional LESS THAN (40 kJ, 1 g, 5 mg), Schedule 12 order and wording; the Code has no decimal-place rule or rounding mode, so a secondary website's rounding claims were not adopted. Open: FSANZ guidance, Schedule 12 table geometry, Standard 1.2.1 legibility and label exemptions.
- 2026-11-10: Completed Usability Turn U2 (plain-English pass). Reworded the Overview journey, Ingredients (type options, additive, nutrient, allergen and source-status hints), Formulations (lede, empty states) and Products (lede, food-state explanation, optional classification section) in App.vue. No logic changes. One e2e selector updated for the renamed classification section. Typecheck, lint, 269 unit tests and 12 e2e tests pass.
- 2026-11-10: Usability track restructured at the user's direction (design only, no code). Pages become Overview, Ingredients, Formulations, Products, Labels and Backup, each list-page paired with a guided builder; Labels shows every product but only exports finished ones, with finished recalculated live. U4-U9 re-sequenced (builder shell and Ingredient builder, Formulation builder, Product builder, Labels page with declaration and allergens, mock NIP, checklist and consultant PDF). Recorded as decision 5 in docs/history/usability-design.md. Awaiting approval of U4.
- 2026-11-10: U4 complete. New `apps/web/src/ingredient-form.ts` (pure, 9 unit tests), `components/BuilderShell.vue` and `components/IngredientBuilder.vue`; Ingredients page is now a list with Add, Edit and Delete; navigation restructured; allergens are a checklist from the rule-data vocabulary plus an "Other" box. Evidence for an additive's amount and source is hidden until requested. Known behaviour: a worked-example ingredient with nutrient evidence but no spec sheet needs a spec reference and date before a nutrient is changed. Checks: vue-tsc, eslint, 283 unit and 14 e2e tests pass.
- 2026-11-10: U5 complete. New `apps/web/src/formulation-form.ts` (pure, 6 unit tests) and `components/FormulationBuilder.vue`; Formulations page is a list with Add, Edit, Expand and Delete. Editing keeps line ids, creation date and any process-mass profile. Line type label "Formulation" is now "Another recipe". Checks: vue-tsc, eslint, 289 unit and 14 e2e tests pass.
- 2026-11-10: U6 complete. New `apps/web/src/product-form.ts` (pure, 9 unit tests), `components/ProductBuilder.vue` and `components/ProductTypeStep.vue`; storage gains optional `packDetails` on products (validated, 1 test). The builder saves the first step to create the product, then later steps save onto it, so one step never overwrites another's answers. Additives & names and Claims panels take an optional `productId` and hide their own picker; the Label builder page was removed (its questions live in "What is it?"). Pack details are not yet used by the label or NIP (U7/U8). Checks: vue-tsc, eslint, 298 unit and 15 e2e tests pass.
- 2026-11-11: U7: draft ingredient and allergen content and a live, local export-readiness gate (DATA-003, CALC-001, TRACE-008, TRACE-012). The user chose a gate requiring essential builder inputs, including explicit ingredient allergen/additive coverage and nutrition, product type, and pack details; claims remain optional. Existing records need those confirmations, an explicit product type and units before export. Nested compound ingredients retain their structure; additive wording is explicitly marked as a candidate and final-food allergen conditions remain for review. PDF exports include draft limitations and are blocked for missing information or layout overflow. The NIP and other mandatory label content are not yet assembled, and readiness does not mean compliance.
- 2026-11-11: U8: added the draft base nutrition panel to the Labels page and PDF (CALC-001, CALC-004, CALC-011, CALC-013, CALC-015, PACK-004). Supplier energy, explicit food form, a recipe-specific sold-food confirmation and sourced final density for volume are required; missing evidence is never zero. NPC display conventions are used with rounding-stage review still open. Unsupported food states and regulated claims block export rather than silently omitting their required nutrition handling. Prepared-food calculations, claim-driven rows, optional less-than declarations and other label content remain open; see ADR 008. This is not regulatory acceptance.
- 2026-11-11: U9: added plain-English three-way summaries and suggested actions to additive/name and claim checks (TRACE-008, TRACE-012), without changing official results or promoting missing facts to a pass. Extended the PDF's separate report with paginated consultant notes, official findings, sources and limitations (TRACE-009, PACK-005); illustrative previews stay on screen only. Improved builder readiness wording, conditional questions and automated accessibility coverage. PDF export explicitly rejects characters the built-in font cannot represent rather than silently corrupting text. Regulatory approval, further label content and U8's calculation limitations remain open.
- 2026-11-11: Proposed the D0-D11 Victorian caffeinated-drink end-to-end demo sequence. It prioritizes a representative local label and PDF, reuse of known ingredient/formulation facts, specific actionable results and bounded source research. D1/D8 and ADR-006 remain in force until the precise provisional-demo policy is approved and recorded; no implementation or release gate is changed by this planning entry.
- 2026-11-11: Product owner approved ADR-009's local-demo provisional results and incomplete-export policy, requesting useful specific results and encouragement of independent review. Updated D1/D8 only for the selected eligible local-demo checks; existing implementation and other release gates remain unchanged. D0 scenario and source research remain in progress.
- 2026-11-11: Completed D0 planning and bounded primary-source research. Added a complete fictional drink and supplier/pack fixture, independently calculated nutrition and caffeine examples, boundary and incomplete-input cases, and a source-linked output inventory in `docs/drink-demo-scenario.md`. Remaining declaration, origin, packaging, technical stability and physical-proof uncertainties are explicit implementation/review follow-ups; no rule, application behaviour or reviewer/public-release gate was approved by this planning milestone.
- 2026-11-11: Began D1. `docs/drink-demo-data-flow.md` maps current fields and result paths, proposes evidence and blend propagation, outlines safe migrations and backup/restore, and flags that current product approvals snapshot one record rather than a full dependency closure. The material design awaits product-owner approval; no application code changed.
- 2026-11-11: Completed D1 after product-owner approval of the existing compound ingredient plus user-created composition formulation model and historical dependency-snapshot direction. ADR-010 records the decision; D2 remains a separate implementation turn. No schema, engine, UI or rule behaviour changed.
- 2026-11-11: Began D2 (TRACE-008, TRACE-012, TRACE-015, PACK-001, PACK-005). Added a separate, local review-report PDF with input paths and effective dates; it remains available when draft data is incomplete. Blocked label-PDF export for all current layouts because required pack content and the applicability of warnings are not yet fully assessed or assembled. Provisional outcomes are not implemented: existing draft rules and ADR-006 hypothetical reruns do not meet ADR-009 eligibility. D2 remains open; no reviewer approval or deterministic legal outcome has been fabricated.
- D2 continuation: product owner approved bringing forward the smallest source-verified drink check from D6. Added the narrowly scoped caffeine range evaluator and versioned draft rule (Standard 2.6.4-3(a); TRACE-008, TRACE-012, TRACE-015), preserving reviewer status separately. The evaluator's eligible fixture outcomes are provisional, not approved. At that point, the UI and report remained unresolved because product records could not establish all classification and total-caffeine evidence. The verified period was limited to 2026-06-09 through the 2026-11-11 source check; later dates require a fresh source check, not assumed currency. P1056 source permissions and other requirements are not assessed. D2 is not complete.
- Began D3 (DATA-001, DATA-003, TRACE-008). Added supplier-linked caffeine evidence entry with explicit unknown, presence, absence and conflict; no total is calculated. Database schema v3 leaves existing records untouched; backup format v2 protects new data from old backup readers while importing v1. A v2-schema Dexie application can still open the newer database, so safe downgrade of a live workspace is not guaranteed: use the current app and a v2 backup, not an older app, for records with new evidence. Controlled identities, blend completeness, nutrient basis and remaining D3 acceptance tests are still outstanding.
- D3 continuation (DATA-003, DATA-006, VER-002): the product owner approved isolated workspaces (ADR-011). The current app uses a new database name and offers an explicit verified copy from the old workspace only into an empty destination, including recovery points. Copies do not sync; older apps can still alter the original, not the current workspace. Added explicitly selected versioned demo identities, with unresolved and stale-evidence handling. D3 remains open for the outstanding supplier-data and scenario tests.
- D3 continuation (FR-002, DATA-003, VER-002): added a dated supplier statement for other added Schedule 28 substances, excluding caffeine, vitamins and taurine. Blank, conflicting and earlier statements remain explicit; it does not cover naturally occurring substances or feed product checks. To avoid a further workspace copy, the new field is separate from the previous v2 editor's managed supplier-facts object. An actual previous-build browser check confirmed preservation through edit, export and restore; it cannot display this field. This compatibility result is specific to the tested field and build, not a general future-version guarantee (ADR-011). D3 remains open.
- 2026-11-19: Completed UXR11 after a bounded primary-source re-check of Standard 2.6.4 and the P1056 transition. Connected complete, explicit user-entered ingredient caffeine facts (optional references and dates), recipe amounts and numeric densities to the provisional range check; missing/conflicting facts, recorded mass changes, prepared products, and unsupported compounds remain REVIEW REQUIRED. Product review and the separate report show calculation inputs, limitations and the non-certification boundary. Only this caffeine range check is activated; other candidate checks remain review-only (TRACE-015, TEST-004).
- 2026-11-19: Completed UXR12's local engineering journey with fictional cake/cookie data, including an actual Incomplete Review Copy PDF and separate reviewer report, missing-input handling, accessibility scans, narrow-screen keyboard use and encrypted backup/restore. Exercised the drink contrast without promoting provisional results. No human reviewer feedback was received; R3-01, R1-13, R1-21 and other applicable release gates remain open. See [UXR12 results](./uxr12-journey.md) (UX-007, PACK-005, BKP-001).
- 2026-11-19: Owner approved the UXR16-UXR23 workflow-clarity and label-content roadmap. Retained complex inputs must be justified, plain-language, contextual and less cluttered; ordinary paths should ask only for facts needed at that point. Recorded decisions and superseded presentation directions in [ADR 034](./adr/034-practical-workflow-progressive-disclosure.md) and dated addenda to ADRs 024, 027-030. No application behavior or regulatory rule changed.
- 2026-11-20: Completed UXR16. Removed manual caffeine questions from ingredient entry; the check derives supported amounts from nutrient values, direct caffeine-additive concentration and complete compound compositions, while missing or conflicting data remain unresolved and a quantified zero does not establish absence. Density is conditionally shown for volume-basis conversions, and additive concentration is explained as an input to use-level checks rather than label wording. Legacy caffeine evidence is preserved on unrelated edits. Focused unit tests, affected Playwright workflows, type-check and lint pass. The provisional caffeine rule data is checked through 2026-11-19, so on this date complete inputs still produce REVIEW REQUIRED rather than a range outcome; no regulatory rule or release gate changed (DATA-003, DATA-006, ADD-004, ADD-005, UX-007).
- 2026-11-20: The owner revised UXR17 after reconsidering where recipe-wide process data belongs. Keep manufacturing, cooking/yield and related nutrition evidence with the shared Formulation; Product continues to record customer directions and product-specific nutrition choices. Simplify the ordinary Formulation path and make technical details contextual rather than moving the data to Product or changing its ownership. See [ADR 034](./adr/034-practical-workflow-progressive-disclosure.md) and [ADR 028](./adr/028-simple-cooking-and-yield.md).
- 2026-11-20: Completed UXR17. Ordinary recipes no longer show a generic completeness prompt; supplier/compound composition coverage is progressively disclosed, and shared Formulation manufacturing details remain optional and open when saved values need to be reviewed. Product keeps its customer directions and nutrition choices distinct, with shared recipe details summarized behind an optional disclosure. Saved and backed-up processing and nutrition evidence remains intact; no schema or calculation behavior changed. Focused unit tests, type-check, lint and targeted Playwright workflows pass (FORM-005, CALC-002, CALC-014, DATA-003, DATA-006, UX-007).
- 2026-11-20: Completed UXR18. Consolidated Product customer directions and nutrition into one progressive workflow. Routine as-sold products no longer need a redundant confirmation; the saved recipe method is used, with automatic basis confirmation limited to a current, complete recipe signature. Unknown directions remain unresolved, and reconstitution, draining, combined-food and unsupported paths retain their specific checks and evidence. Focused Product unit tests, type-check, lint and 13 Product workflow Playwright tests pass. No regulatory rules or release gates changed (CALC-003, CALC-004, CALC-010, CALC-014, UX-007).
- 2026-11-20: Completed UXR20. The bounded label-content audit distinguishes stored inputs, draft outputs and actual checks, records source/applicability boundaries and prioritizes UXR21-UXR23. No legal wording, applicability or reviewer interpretation was inferred; R1-17 to R1-21 remain open (TR-002, TR-003, TR-004, TR-007, TR-008, TR-016, TR-019, TR-021, PACK-001, PACK-004, PACK-005).
- 2026-11-20: Completed UXR21. Ingredient declarations now use recursively scaled ingoing masses, preserve nested candidate display for general foods, and flatten complete compound components for the selected infant-food route. Missing names and incomplete infant-food composition withhold the declaration and expose edit actions; saved names and additive wordings remain candidates, not legal determinations. Source-linked focused tests, type-check and targeted lint pass (SRC-005, SRC-017; TR-003, ADD-009, FORM-005, TRACE-008). See [ADR 035](./adr/035-draft-ingredient-declaration.md).
- 2026-11-20: Completed UXR22 allergen drafting and optional, user-entered PAL. Complete supplier compositions may establish a compound parent's allergen coverage only when the parent has no separate allergen evidence or additive-source records; component coverage remains required. Updated the browser helper to retain an already-open editor for the requested Product instead of forcing an unnecessary return to the list. Unit tests (620), type-check/build, lint, rule validation, the focused cake/cookie browser test and the full browser/accessibility suite (68/68) pass (TR-004, TR-019, DATA-003, TRACE-008). See [ADR 036](./adr/036-allergen-declarations-and-pal.md).
- 2026-11-23: Completed UXR23 pack-content reconciliation. Label-specific supplier, lot, date, storage and warning/advisory copy now has an entered/not-entered review summary alongside plain-language unresolved-applicability guidance. Preview blocks show field labels and preserve explicit review boundaries for exceptions, adequacy and print proof. Unit and focused browser tests pass; no legal applicability or generated pack value is inferred (PACK-005, TRACE-008, TRACE-015). See [ADR 032](./adr/032-label-pack-copy-and-applicability.md).
- 2026-11-23: Recorded the owner-agreed UXS streamlining and Label-workspace
  direction as the next turn-by-turn track. UXS1 and UXS7 reserve detailed
  workflow discussions; UXS13 reserves a separate, staged wider-claims
  roadmap. No application behavior, legal rule, release gate or detailed
  discussion outcome changed.
- 2026-11-23: Completed UXS1 discussion. The owner approved contextual
  composition and finished-batch entry, simplified Product directions and
  completion status, removal of the Product Additives and Names section,
  and separate technical review. The design is to be reassessed after
  implementation and testing. Recorded the decision in ADR 034 and dated
  addenda to ADRs 028, 030 and 031; no application code or regulatory rule
  changed (FORM-005, CALC-010, ADD-009, TRACE-008, UX-007).
- 2026-11-23: Completed UXS2. Replaced the generic Formulation composition
  section with a contextual completeness question for linked shared recipes
  and existing supplier compositions; Product review now offers the shared
  recipe as an edit target. Preserved unknown amounts, source details and
  existing composition facts. Focused unit tests, affected browser suites,
  backup/restore, accessibility, type-check and targeted lint passed
  (FORM-005, DATA-003, CALC-001, TRACE-008, UX-007).
- 2026-11-23: Completed UXS3. Replaced the Formulation manufacturing section
  with detail-specific finished-batch entry and direct access to saved
  processing and nutrition evidence. Preserved inactive evidence, existing
  calculations, unknown values and backup/restore behavior. Focused unit and
  storage tests, affected browser suites, accessibility, type-check and
  targeted lint passed (CALC-002, CALC-014, DATA-003, DATA-006, UX-007).
- 2026-11-23: Completed UXS4. Removed the two Product nutrition sections and
  aligned contextual customer directions and nutrition inputs. Existing
  directions-based calculations, trace and saved non-default states remain
  available; missing and conflicting states stay unresolved. Focused
  calculation and affected browser tests, accessibility, backup/restore,
  type-check and targeted lint passed (CALC-003, CALC-004, CALC-010,
  CALC-014, DATA-003, UX-007).
- 2026-11-23: Completed UXS5. Removed the Product Additives and Names section
  and navigation; retained saved inputs, read-only technical results and
  illustrative preview, the provisional caffeine notice, review reports and
  Label wording. Focused unit and affected browser tests, accessibility,
  encrypted backup/restore, type-check and targeted lint passed (ADD-009,
  NAME-001, DATA-003, TRACE-008, TRACE-015).
- 2026-11-23: Completed UXS6. Replaced the large Product review with a
  saved-input completion status and actionable missing details. Label and
  regulatory review remain separate; technical findings, pending allergens,
  reports and export remain accessible. Focused unit and affected browser
  tests, accessibility, type-check and targeted lint passed (TRACE-008,
  TRACE-012, DATA-003, UX-007).
- 2026-11-23: Completed UXS7 discussion. The owner agreed the four-tab
  Label editor, live preview, compact draft controls, accessible narrow-screen
  stacking, actionable notices, illustrative pack-field guidance and explicit
  claim-artwork limitation. Recorded the presentation decisions in ADRs 024,
  032 and 034; no application or regulatory behavior changed (PACK-005,
  TR-004, TR-019, CLAIM-006, UX-007).
- 2026-11-23: Completed UXS8. Implemented the agreed Label tabs, responsive
  live preview, draft controls and actionable review links. Preserved draft
  and dependency safeguards, separately saved Product claim facts, offline
  reports and incomplete review copies. Unit tests (626), the complete
  browser suite (72), type-check and targeted lint passed. Claim artwork and
  regulatory release gates remain unchanged (PACK-005, DATA-003, TRACE-012,
  UX-007).
- 2026-11-23: Completed UXS9. Added illustrative pack-field examples and
  accessible plain-language precautionary-allergen and cross-contact guidance.
  Blank fields remain unknown; examples are not saved or exported, and
  user-entered text, validation, preview and report behavior are preserved.
  Focused unit and browser tests, desktop and narrow-screen accessibility,
  type-check and targeted lint passed (TR-004, TR-019, DATA-003, PACK-005,
  UX-007).
- UXS10: Connected the five existing claim checks to current unrounded
  as-sold Product nutrition, with density and serving conversions where
  applicable. Trace and report identify the calculation and nutrition
  sources; unsupported states, stale bases and missing or conflicting data
  remain review-required. Historical manual figures are not used; no draft
  rule or compliance outcome is approved. The unit suite (640), affected
  browser tests (7), desktop and narrow accessibility checks, type-check and
  targeted lint passed (CALC-010, CLAIM-001, CLAIM-003, CLAIM-004, DATA-003,
  TRACE-008).
- 2026-11-23: Completed UXS11. Removed redundant claim nutrient, source and
  Product-fact questions while retaining saved historical data and explicit
  review gates. Checks use the saved Product food form when unambiguous and
  explain outstanding conditions; claims remain absent from artwork.
  Focused unit tests (106), affected browser tests (24), desktop and narrow
  accessibility checks, type-check and targeted lint passed (CLAIM-003,
  CLAIM-006, DATA-003, TRACE-008, UX-007).
- Completed UXS12's automated engineering regression gate, including cake,
  cookie, drink, compound and food-state journeys, derived and unavailable
  low-sugars claims, review-copy outputs, backup/restore, offline and
  accessibility checks. The recorded limitations and human review gates
  remain open; no regulatory or public-release approval is implied
  (UX-007, TEST-004, PACK-005, BKP-001, TRACE-012).
- 2026-11-23: Completed UXS13 discussion and recorded the owner-agreed CRS
  roadmap. Prioritised the existing five draft checks, then no-added-sugar,
  gluten-free and fibre/protein claims; comparative and health claims remain
  review-only initially. Agreed exact user-selected wording on incomplete
  review artwork with prominent warnings, including unresolved or failing
  checks. No application behavior, rule or release approval changed
  (FR-007, CLAIM-001 to CLAIM-006, INT-001, PACK-005, TRACE-015).
- 2026-11-23: Completed CRS1. Inventoried current label-facing sources and
  agreed a local, traceable candidate-review workflow, saved/unsaved and
  duplicate handling, review-copy warning placement and backup safeguards.
  The owner expects to reassess the design after using it. No detection,
  application behavior or regulatory rule changed (FR-007, CLAIM-006,
  DATA-003, PACK-005, UX-007).
- 2026-11-23: Completed CRS2. Added bounded local possible-claim detection,
  source navigation, preview status and review-report findings without
  changing or classifying text. The scanner can miss wording and cannot
  inspect external artwork; human review remains necessary. Verified 645
  unit/property tests and 75 browser tests, plus typecheck, lint, build and
  rule-data validation. No regulatory or release approval is implied
  (FR-007, CLAIM-006, UX-007).
- 2026-11-24: Completed CRS3. Added exact-occurrence candidate decisions,
  source-linked Label claims, supported-rule suggestions, explicit false
  positive and uncertainty states, and persistence through separate Labels
  and backups. Original source wording is not rewritten and all outcomes
  remain REVIEW REQUIRED rather than legal clearance. Verified focused
  candidate/storage tests, five claims browser journeys and typecheck/lint
  (CLAIM-002, CLAIM-006, DATA-003).
- 2026-11-24: Completed CRS4. Added actionable guidance to existing claim
  checks, with claim-entry focus or Product-input navigation for missing,
  conflicting and unsupported facts. Reused derived recipe/Product nutrition
  without adding a redundant nutrient questionnaire. Verified 647 unit and
  property tests, five claims browser journeys, typecheck, lint and build;
  no regulatory or release approval is implied (CLAIM-003, CALC-010,
  TRACE-008, UX-007).
- 2026-11-24: Completed CRS5 research. Re-verified the five draft claim
  thresholds and primary source compilations, documented food-state,
  wording, high-alcohol and claim-triggered NIP boundaries, and added
  reviewer gates for unresolved interpretation and evidence questions.
  No rule data or application behavior was changed; deterministic activation
  remains blocked pending review (CLAIM-001 to CLAIM-004, TRACE-015).
- 2026-11-24: Completed CRS6. Added a review-only claim/NIP interaction trace
  using shared derived Product/recipe nutrition in the Label panel and
  consultant report. Mapped all five draft checks, including fibre and
  potassium interactions, without activating NIP rows or deterministic
  outcomes. Verified 149 focused/expanded tests, five claims browser
  journeys, typecheck, lint and draft rule-data validation (INT-001,
  CALC-012, CLAIM-003, CLAIM-004, TRACE-015).
- 2026-11-24: Completed CRS7. Rendered distinct selected Label claim wording
  once in the shared SVG and incomplete PDF review copy, with explicit
  review-only warnings and consistent consultant-report wording. Unsupported
  and unresolved claims remain unchanged and REVIEW REQUIRED. Verified 65
  focused layout/report tests, eight label/claims browser journeys,
  typecheck, lint and PDF export coverage (CLAIM-006, INT-001, PACK-005,
  UX-007).
