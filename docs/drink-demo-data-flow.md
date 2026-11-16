# D1: Drink demo data flow and compatibility design

Status: **Historical design approved 2026-11-11; partially implemented.**
2026-11-16: The D0-D11 sequence is paused. This is a historical
drink-specific design and progress record, not the general ingredient-screen
specification. The current direction is in [implementation-plan.md](./implementation-plan.md).
Implementation note: D3 is in progress. Supplier-linked caffeine and identity
evidence, two-source caffeine conflict entry, per-100 mL nutrition, backup
format v2 and an isolated current workspace have been added. Compound
ingredients can be selected in formulation lines. Optional dated supplier
statements record fruit juice, added vitamins, added taurine and other added
Schedule 28 substances as present or absent without inferring an answer from a
blank. The last statement excludes caffeine, vitamins and taurine, and does
not cover naturally occurring substances. Conflicting statements are retained
and displayed, not automatically resolved. These fields neither establish full
coverage of all listed substances nor enter product calculations.
Supplier composition coverage,
dated evidence and components of unknown quantity can be recorded on the
linked formulation; partial compositions cannot be scaled. Previously saved
formulations do not imply supplier-confirmed complete composition. Users can
record a decision and explanation against saved caffeine conflict statements;
both statements and the decision history are retained. The decision is not yet
used by product calculations, so the conflict remains flagged; retain the
supplier documents.
The user can explicitly copy a snapshot of a previous workspace into an empty
current workspace; the original is unchanged and the two copies do not sync
(ADR-011). Older apps can still edit the old workspace, not the current one.
Backup v2 is explicitly rejected by the old backup reader. A browser test
enters the fictional drink ingredients and blend and restores plain and
encrypted backups; remaining scenario evidence, full D3 acceptance and the
propagation described below remain open.

The other-Schedule-28 statement is stored as a separate optional ingredient
field, not as a new key in the older v2 supplier-facts object. This lets the
previous D3 v2 editor preserve the field during an edit; a compatibility check
used the actual previous build to edit, export and restore such a record. That
build cannot display or interpret the new statement. This is a narrow verified
compatibility property, not a general guarantee for future fields or older
software; the original workspace isolation remains in place (ADR-011).
Date: 2026-11-11. Scope: the D0 Victorian drink; extend only as subsequent
turns require. Related: `docs/drink-demo-scenario.md`, ADR-009.
Requirements: FR-002 to FR-010, DATA-001 to DATA-006, CALC-001 to CALC-005,
CALC-011, CALC-013, FORM-004 to FORM-006, TRACE-008, TRACE-012, TRACE-015,
VER-002, VER-006 and PACK-001.

## 1. User journey and one source of truth

1. **Ingredient:** Choose a recognised identity or record an unresolved
   identity; enter the supplier specification and only the facts relevant to
   this ingredient. A supplier blend uses a user-created composition
   formulation linked to its compound ingredient, plus its own supplier
   nutrient profile and explicit coverage. Separate ordinary
   recipe ingredients from supplier blend components and additive source
   roles; no one must classify a substance legally just to enter a name.
2. **Formulation:** Select ingredients and nested formulations, enter batch
   amounts and process/yield details when applicable. Retain the actual batch
   basis and paths, not just percentages. Ask for density only when a required
   mass/volume conversion needs it and cannot be computed reliably from
   documented batch mass and volume.
3. **Product:** Select the formulation; supply independent facts such as
   purpose, presentation, pack, serving, business and evidence-backed origin
   and shelf life. Show recipe-derived facts without asking the same
   question again. A detected disagreement with a person's older answer is a
   conflict to resolve, not a silent override.
4. **Labels:** A single shared calculation/check model uses those records to
   show an available draft, specific gaps and next actions, and a traceable
   proof/report. Calculated fields are not editable shadow copies. Provisional
   and reviewer-validated results remain distinct under ADR-009; no global
   legal compliance verdict.

The source of truth is the **current draft record plus its dated evidence**,
not the rendered label, an independently entered result or a category inferred
from a free-text ingredient name. The model must preserve `known present`,
`known absent with sufficiently scoped confirmation`, `unknown` and
`conflicting` states. Missing data, stale evidence, unsupported mappings and
unresolved exceptions remain visible; absence of a source record alone is not
proof that a substance is absent.

## 2. Current inventory and field-to-result map

“Available” below means an engineering building block exists, not that it is
reviewer-approved or fully covers the D0 scenario.

| D0 fact / result | Current source and handling | Gap and planned turn |
| --- | --- | --- |
| Names, supplier reference and date | `IngredientRecord` and `ingredient-form.ts` store name, kind, supplier and specification reference/date. | Name is free text, not a controlled substance identity or an automatic legal classification. Need optional scoped identities and source mapping (D3). |
| Supplier blend / nested recipe | `compoundFormulationId` points from a compound ingredient to a formulation; ingredient form requires that link for a compound. Formulation lines can reference atomic ingredients or other formulations. `expandFormulation` expands formulation lines, while `label-draft.ts` separately descends compound ingredient links. | No direct supplier-blend composition/completeness workflow; the normal formulation editor offers only atomic ingredients. Generic expansion does not itself descend the compound link, so nutrition, allergen and substance paths are not uniformly expanded. Design must explicitly retain blend hierarchy and paths (D3-D4). |
| Nutrients and energy | Ingredient `nutrientProfile.values` holds sourced `g/100g` or `mg/100g` values. `energyPer100g` is a separate sourced value; the form preserves unmanaged nutrients and unchanged evidence. `makeNipDraft` aggregates recipe ingredients and formats a mock panel. | No native nutrient/energy per 100 mL; no assumed density. Supplier blend profile and component nutrition must not be summed together. Missing value is not zero; as-sold confirmation and final density are currently required (D3, D5). |
| Allergens | Ingredient evidence, coverage flags bound to a spec reference/date, `propagateAllergens`, and `makeLabelDraft` exist; sulphite/final-food cases can remain unresolved. | Current UI coverage is tied to one specification and its label draft collects ingredients by ID; verify actual nested paths and evidence coverage, including multiple paths/conflicts. Preserve explicit absent-with-coverage vs unknown; do not infer `allergen-free` (D3-D4, D7). |
| Additives and caffeine | `additiveSources` stores names, optional codes, purpose, source status, concentration/basis, evidence and declaration selection. `addedCaffeine` is a declaration route and excluded from unrelated code-based additive checks. | Direct caffeine ingredient identity and total caffeine from all sources are not evaluated. A declaration route is not sufficient identity or proof of coverage. Existing code-based calculator does not treat unknown unrecorded substances as zero (D3-D4, D6). |
| Recipe amounts and yield | Formulation lines store mass `mg`, `g`, `kg`; nested expansion scales to a requested mass and retains line paths. A `processMassProfile` type and pure mass-balance function exist. | UI only edits lines; it does not collect final batch volume/yield. The additive report normalises to 100 g and its UI says per-ingredient density and several paths are not wired. D0's 104 kg / 100 L actual batch must not be silently reduced to an assumed yield (D4-D5). |
| Product classification | Product stores `classificationProfile` and `builderProductType`. `ProductTypeStep.vue` collects the FCB factual answers and screening remains a candidate. | `containsCaffeine` is currently answered again on the product, not derived from the ingredient data; flavour/other questions also need appropriate evidence. Reconcile old answers against derived facts; prompt only for genuinely independent facts such as purpose (D6). |
| Serving, food state and density | `packDetails` persists serving, net quantity, food form, a recipe signature and sourced density; the product form stores values separately. | Serving count is entered rather than reliably derived and checked; finished volume is not captured. The signature is based on expanded recipe lines, not supplier profiles, process, density or rule versions. Use dependency-aware invalidation; preserve existing fields during transition (D5-D6). |
| Name, business, date, origin, can | Product name and basic pack data exist. | No complete normal builder source for supplier address, lot/date type, shelf-life evidence, storage, origin and Victorian container facts. Enter product-specific facts once, use verified rule applicability, never invent a value (D8). |
| Declarations, NIP and label | `makeLabelDraft` builds a declaration candidate, allergens and mock NIP; `LabelExportPanel.vue` calculates drafts from props, creates a fixed 100 x 150 mm SVG and exports with consultant notes. | Includes draft notes in label blocks, candidate additive annotations, limited required content, fixed dimensions and no complete caffeine/advisory or origin/CDS output. Separate report currently accompanies label PDF via the same export, not an independently exportable report (D7-D9). |
| Claims and result policy | Claims use product-level claim facts/amount and draft rules; illustrative toggle is off by default. Label export blocks regulated claim rows in `makeNipDraft`. | Do not remove unsupported claims or silently treat them as clear. ADR-009's normal provisional-result path and independent report export are not implemented (D2, D9-D10). |
| Updates and traces | `App.vue` reloads the three record lists after UI saves/restore; computed label drafts recalculate from the lists. Engine expansion and additive sources include source paths. | A list refresh is not a full dependency/version invalidation mechanism. Ingredient edit, blend contents, source status, product inputs and rule changes must invalidate all dependent computed facts; approval snapshots must remain separate (D4-D5, D11). |

### Critical present limitation: approved history

`ApprovedVersionRecord.snapshot` is a clone of **one** draft record.
`approveDraft` reads that record and stores its result array, but a product
snapshot contains a formulation ID, not a frozen closure of that formulation,
its nested components and supplier evidence. Existing immutability of the
stored record is valuable, but by itself does **not** make a historical
product calculation or PDF reproducible after dependencies change. Do not
claim otherwise or overwrite existing approvals. New end-to-end approval
must either persist an immutable dependency/rule/output snapshot or reject
approval until it can; legacy approvals without the closure must be visibly
identified as insufficient for historical reconstruction. Do not reconstruct
missing history from current draft records. This is a prerequisite for any
new claim of historical reproducibility (FR-010, VER-002, VER-006).

## 3. Proposed design for D2-D11

### 3.1 Identity and evidence

- Add a small versioned, controlled identity vocabulary for the substances
  and ingredient types needed by this slice, with explicit `unrecognised` /
  unresolved handling. Store identity separately from user-facing name and
  declaration choice; synonyms can suggest but must not silently prove
  identity. Regulatory permissions remain in versioned rule data, not in UI
  labels or a name dictionary.
- Reuse existing specification, additive and allergen evidence shapes where
  sufficient. Add explicit substance content with unit, basis, state,
  source/date and evidence provenance; make explicit coverage for relevant
  substance types. For a direct caffeine ingredient, record identity and
  sourced concentration once; for a blend, record either sufficiently
  evidenced component contributions or an aggregate profile for that same
  substance, with an explicit basis and reconciliation rules.
- Never add a parent total and the same children's total. If aggregate and
  component evidence both exist, select an explicit calculation basis and
  flag disagreements; do not discard either or infer they agree. The same
  principle applies to nutrient, caffeine, additive and allergen evidence.
- Extend supplier nutrient input to supported mass or volume bases with
  explicit units; keep original evidence and conversions. Final or
  ingredient density is required only when needed and supported by dated
  evidence; measured or supplied data and derived figures remain distinct.

### 3.2 Supplier blend vs nested formulation

**Approved direction:** a supplier blend is an existing compound ingredient
linked to a **user-created composition formulation** containing its
ingredients, not a separate kind of supplier-blend record. For example, the
user creates a citrus-flavour composition of water and lemon-peel oil, links
it to the citrus-flavour ingredient and then selects that ingredient in the
drink formulation. The compound ingredient retains its own supplier
specification, nutrition profile and evidence. A sauce follows the same model.
Ordinary nested formulations can also represent recipes a user makes.

This reuses existing graph/cycle protections instead of a second inline
component tree. Improve navigation and guidance without changing what
ingredient and formulation records mean; no automatic creation, ownership or
modification of shared formulations is approved here. Implementation must
preserve stable IDs and distinguish a
supplier specification's component evidence from user-created recipe
amounts; editing a blend must not silently modify an independently shared
formulation. Design the save/update transaction, ownership and UI navigation
before D3, and never delete or rewrite user records automatically.
If the supplier only supplies partial component amounts, the graph must
represent partial coverage without invented proportions; existing
formulation lines alone may be insufficient and may need a narrowly scoped
addition. Do not force a complete recipe or pretend unspecified values are
known.

**D3 implementation:** supplier composition metadata belongs to the existing
formulation, with dated evidence, explicit partial/complete coverage and
references for components whose amounts are unknown. Component order is
preserved. The existing quantified lines retain their quantities; partial
compositions are rejected by formulation expansion instead of normalising
known quantities to 100%. Complete supplier coverage requires quantified
lines and reconfirmation when an existing complete composition changes. The
same formulation may be shared; editing it changes all its current users.
Unknown-quantity edges participate in cycle checks and version-2 backups.
This is entry and safeguarding, not D4's evidence propagation.

### 3.3 Derivation, reconciliation and change propagation

- A pure shared domain/engine projection, called by app surfaces, derives a
  per-product view from the same immutable input set: hierarchical ingredient
  paths, entered evidence and coverage, process/yield, substance totals,
  allergen/nutrient facts, classification candidates and trace. Rule
  evaluation and rendering consume this view rather than asking users to
  re-enter calculated values. It must not know about the DOM, persistence,
  network or PDF. The exact module boundaries remain an implementation
  choice, not a request for a new general-purpose framework.
- A calculated fact includes its status, input source paths, unit/basis,
  evidence and reasons; it is not another editable saved fact. User-provided
  classification answers remain available as independent evidence and are
  reconciled with derived facts; disagreement is surfaced, not silently
  replaced. For the D0 caffeine question derive presence only with complete,
  reliable coverage; product purpose stays a user-supplied fact.
- Invalidation must include every relevant dependency: root and nested
  formulation lines and process/yield, ingredient identities, source and
  coverage/evidence versions, nutrition and substance data, product
  classification and pack facts, and relevant rule release/date. Recompute
  on a consistent workspace snapshot; detect concurrent changes before PDF
  export. Use existing explicit refresh/computed patterns first; introduce a
  cache or persistence only if justified and keyed by complete dependencies.
- Reverse navigation to the missing ingredient/specification is a UI feature,
  not a substitute for evidence. Affected drafts refresh; approved snapshots
  and their rule release/output never mutate. Any legacy approval without
  historical dependency closure is clearly identified, not reconstructed.

### 3.4 D0 flow example

`SPEC-CAFFEINE` identity + `30 g` batch line ->
`30,000 mg` caffeine; `SPEC-FLAVOUR` complete caffeine-free evidence ->
no additional contribution; `100 L` evidenced final yield ->
`300 mg/L`; product purpose and non-alcoholic/flavoured evidence ->
applicable FCB check; `330 mL` selected serving -> `99 mg/serving` and
`30 mg/100 mL`; then applicable separate declaration/advisory and NIP.
All stages retain source paths and dates. If the flavour coverage is unknown
or conflicting, show the direct contribution separately but do not claim a
known total or a threshold outcome. Do not ask whether caffeine is present
again after it is reliably derived.

## 4. Storage, migrations and backup/restore

Current Dexie schema is v2; v1-to-v2 migration validates records, creates a
recovery point and adds legacy review decisions. The JSON backup format is
v1, plain or encrypted; import validates records and approved decisions and
checks graph cycles before restore. Draft updates merge fields; ingredient
builder reconstructs managed fields and `editableIngredientKeys` controls
what gets written. A design that merely adds optional fields to a TypeScript
interface is insufficient: add validators, UI round-trip preservation, graph
checking, migration and backup compatibility tests.

Proposed compatibility rules:

1. Existing missing new facts remain unknown; do not infer identities,
   caffeine absence, blend completeness, density, origin or legal status
   from names, a blank field or old confirmation flags beyond their documented
   coverage. Preserve all old values/evidence and unmanaged fields.
2. Prefer additive optional fields and an explicit schema upgrade only where
   required. Test old database migration with recovery and transactional
   rollback; do not mutate old approved snapshots to invent new facts.
3. Version the backup payload if its meaning or shape requires it; explicitly
   support import of v1 and any newer version. Determine and test what happens
   when a newer backup is opened by an older application: reject clearly if
   it cannot preserve the data, never silently drop fields. The current
   validator checks selected fields but does not establish safe old-reader
   behaviour for unknown extensions. Preserve encrypted and plain round trips,
   collision preview and explicit replacement, malformed data rejection and
   cycle rejection. Never delete a user's existing data without approval.
4. Any new composition edge must participate in create/update, import,
   restore and future sync cycle detection (FORM-004). Preserve paths even
   when the same component appears more than once.
5. Before any new feature claims historical product reproducibility, design
   and test a versioned immutable closure of referenced ingredient,
   formulation, evidence, product and rule/output data. Handle pre-existing
   one-record approvals as legacy without forging history; do not change
   their approval decision. Scope and timing of any storage upgrade must be
   part of the relevant later turn.

## 5. Turn-specific checks

- D2: eligible/provisional vs approved and unsupported/unknown; screen,
  report and PDF policy remain consistent; no low-confidence deterministic
  FAIL (TRACE-015).
- D3: old ingredient edit/save is lossless, structured identity unresolved
  remains unresolved; supplier blend with complete and partial coverage;
  numeric zero differs from missing; evidence and bases survive restore.
- D4: direct, nested recipe and supplier blend paths; same ingredient on two
  paths; explicit total vs children without double count; conflicts and
  stale source; cycle rejection; draft update changes only relevant results.
- D5: D0 independently calculated nutrition, 165/330 mL serving, batch
  scaling and sourced mass/volume conversions; missing yield/density and
  recipe/process change invalidation; legacy confirmations not over-interpreted.
- D6-D8: source-version/transition and caffeine limits incl. exact
  boundaries; no duplicate classification question, only independent product
  facts; declarations/allergen/additive, origin and pack facts; missing
  evidence and unsupported conditions produce actionable limitations.
- D9-D11: exact-dimension preview and PDF match, required blocks and
  placeholders follow ADR-009, separate report usable on incomplete inputs,
  offline/backup restore and accessibility; historic closures reproduce or
  show an explicit legacy limitation. Preserve infant-food and claims paths.

## 6. Approval and next action

The product owner approved the compound ingredient plus user-created
composition formulation, data propagation and historical-snapshot direction
on 2026-11-11. The decision is recorded in ADR-010. Proceed to D2 only on
separate instruction. No database, UI, engine or legal-rule changes are made
by this document.
