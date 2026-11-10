# Implementation plan - Australian Food Labelling Platform

**Status:** APPROVED 2026-11-05. Living document: update section 12 (progress) and section 15 (change log) as work proceeds.
**Audience:** engineers and AI agents implementing the product.
**Related documents:** `AGENTS.md` (always-on agent rules), `docs/requirements.md` (the contract), `docs/reviewer-questions.md` (questions for the human regulatory reviewer).

## 1. How to use this document

1. Read `AGENTS.md`, then this plan, then the sections of `docs/requirements.md` referenced by your task.
2. Work on the current phase only (section 12 shows it). Later-phase research and review-only groundwork may proceed only where this plan explicitly permits it; do not activate gated regulatory results early.
3. Anything not verified against a primary source is tagged `TO BE VERIFIED` or `TO BE RESEARCHED`. Never remove a tag without recording the source and date.
4. Record each technology or design decision as an ADR in `docs/adr/` (created in P0-2).
5. Tick the progress tracker when a step meets its exit criteria. Ask the user before any destructive action (deleting the archive, force pushes, rewriting history).

## 2. Product summary

A privacy-focused Australian food-labelling and formulation product. Users build ingredients (with supplier specifications), nested formulations and products, and the system calculates nutrition, declarations and allergens, evaluates regulatory rules with an explanation and source for every result, and produces a previewable, exportable label. Formulation data stays on the user's device by default. The product assists compliance; it never certifies it.

Target: a presentable, offline-capable MVP vertical slice that can later grow into a subscription SaaS for Australian food businesses, with Victoria as the primary legal focus and ANZ context where the Code is joint.

## 3. Locked decisions

| ID  | Decision                                                                                                                                                                                                                                                                                                             | Date       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| D1  | The public MVP includes core labelling, additive limits and prescribed-name support focused on the same two initial product cohorts: formulated caffeinated beverages and foods for infants. Exact legal classifications and supported rules require reviewer verification; unsupported or unmapped cases remain review-only. Claims follow the core and additive/name groundwork and are required before public MVP launch. HSR, GM, irradiation, origin and other deferred domains remain later scope. | 2026-11-09 |
| D2  | Same repository. Legacy `frontend/` is moved to `archive/legacy-frontend/` (history preserved) in P0-1 and deleted later with user approval. New code lives in `apps/` and `packages/`.                                                                                                                              | 2026-11-05 |
| D3  | MVP is local-only: no backend and no login. Authentication and entitlements are added in Phase 4; seams are built in Phase 1 (section 9).                                                                                                                                                                            | 2026-11-05 |
| D4  | UI uses Tailwind CSS v4 with shadcn-vue (accessible primitives, components owned in-repo). No Bootstrap.                                                                                                                                                                                                             | 2026-11-05 |
| D5  | A human food-regulatory reviewer is engaged at defined touchpoints (section 10).                                                                                                                                                                                                                                     | 2026-11-05 |
| D6  | Monetisation details (plans, trial length, pricing) are deferred and are not an MVP concern.                                                                                                                                                                                                                         | 2026-11-05 |
| D7  | Initial nutrient inputs are supplier-provided values with evidence; defer an external food-composition database until its release, licence, evidence labelling and update policy are decided.                                                                                                                        | 2026-11-09 |

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
| 8 | Evaluate same-technological-purpose mixtures and any separately applicable aggregate-colour limits, including verified “calculated as” equivalents. | Tests cover applicability and non-applicability, each contributor, below/equal/above boundaries and missing equivalents. No mixture or colour rule is generalized beyond its mapped provision. |
| 9 | Map and implement carry-over, processing-aid and incidental-presence paths as distinct cases, using the exact applicable Code conditions and user-supplied evidence. | Tests show permitted, exceeded, missing-evidence and uncertain cases. A status flag alone cannot establish an exemption; unresolved cases remain review-only. |
| 10 | Create versioned prescribed-name candidate rules for the mapped cohort classes, including trigger terms, exclusions, required identity/composition/process facts, source and mapping confidence. | Candidate identification always distinguishes “no rule identified” from PASS; unsupported or uncertain classes produce a review task, never an inferred prescribed name. |
| 11 | Implement composition checks only for prescribed-name rules whose exact provisions and required inputs are mapped and approved for activation. Keep true-nature judgments, mixed/novel foods and unmapped classes review-only. | Each enabled rule has source-linked boundary tests and shows requirements beside product facts. Free-text name or incomplete composition cannot yield PASS. |
| 12 | Integrate additive and prescribed-name entry, results and trace into the workspace. Present declaration output separately from permission and prescribed-name evaluation; show evidence, review reasons and non-certification language. | End-to-end tests cover a supported draft path and missing/conflicting data paths without asserting legal certification or hiding REVIEW REQUIRED. |
| 13 | Run the Phase 2 quality and release gate: source/version checks, unit/property tests, selected-cohort fixtures, end-to-end/accessibility checks and review of unsupported cases. Prepare reviewer verification records for classification, mappings and representative outcomes. | No deterministic release is enabled until each applicable reviewer gate and fixture sign-off is recorded. Unsupported categories remain visibly review-only; Phase 2 exit criteria are met before public MVP use. |

### Phase 3 - Claims

Scope: structured claims engine (Standard 1.2.7, Schedule 4), including nutrition, comparative and health-claim gates. Claims complete a public-MVP launch gate after the Phase 1 core and Phase 2 additive/name groundwork. HSR, NPSC, GM, irradiation and origin remain outside the public MVP unless separately approved.
Entry: R5 held; claim wording, evidence and supported families agreed.
Exit: supported claim conditions are mapped, review boundaries are explicit, and claim fixtures pass. Public MVP launch remains blocked until this phase is complete.

### Phase 4 - SaaS foundation

Scope: Firebase Auth, signed entitlements, billing placeholder, hosting, offline installable app, remote rule-release channel, threat model, terms and privacy drafted with legal advice.
Entry: user decisions on plans and trial (deferred by D6); legal advice scoped.
Exit: sign-in and entitlement work without any formulation data reaching the server; read-only and export-only expiry mode works.

### Phase 5 - Hardening and closed beta

Scope: security review, accessibility audit, full regulatory and legal review of the rule catalogue (R6), local-database scale testing, closed beta with Victorian food businesses.

### Phase 6 - Growth

Scope: optional encrypted cloud backup and sync, collaboration, supplier spreadsheet import, multi-panel layouts and barcodes, integrations, New Zealand profile, AI-assisted entry and explanations (draft only, never an originating regulatory conclusion).

## 8. MVP rule scope

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
| National Measurement Act 1960 and National Trade Measurement Regulations 2009                                              | Cth                 | Net quantity / measurement marking on packages                                  | MVP (review-only)          | P0-5 SOURCE-MAPPED: Act ss 18JA-18JC; Regulations pt 4, regs 4.3-4.16A and Sch 5; detailed exceptions/application remain for review |
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
| Net quantity / measurement marking | National Measurement Act 1960, ss 18JA-18JC; National Trade Measurement Regulations 2009, pt 4 (especially regs 4.3-4.16A) and Sch 5 | [FRL Act](https://www.legislation.gov.au/C1960A00064/latest), compilation C2024C00648 (C22), effective 2024-10-14. [FRL Regulations](https://www.legislation.gov.au/F2009L03479/latest), compilation F2024C00311 (C08), effective 2024-03-20. [Department/NMI guide](https://www.industry.gov.au/publications/guide-sale-pre-packaged-goods), updated 2025-11-27. | National trade-measurement source mapping replaces “unmapped”; it does not establish one universal label output for every product. Marking exemptions, unit, position, character size, measurement method, quantity accuracy and legal-metrology decisions remain review-only (R1-20). |
| Victorian application of Code | Food Act 1984 (Vic), s 16(1)-(4) | [Victorian legislation, Act in force](https://www.legislation.vic.gov.au/in-force/acts/food-act-1984), version 119, effective 2026-07-01 | Verified as the Victorian statutory compliance/enforcement context for Code requirements. This is not an additional labelling rule or product approval. Other Food Act provisions were not reviewed. |
| Victorian regulations and other listed Victorian instruments | The prior register's “Food Regulations 2015 (Vic)” title was not confirmed. Official register lists Food (Forms and Registration) Regulations 2025, SR 96/2025, in force 2025-11-17, and Food (Primary Production and Processing) Regulations 2025, SR 1/2025, in force 2025-02-11. | [Victorian Food (Forms and Registration) Regulations 2025](https://www.legislation.vic.gov.au/in-force/statutory-rules/food-forms-and-registration-regulations-2025); [Victorian Food (Primary Production and Processing) Regulations 2025](https://www.legislation.vic.gov.au/in-force/statutory-rules/food-primary-production-and-processing-regulations-2025). | Current titles/status checked, but provisions were not clause-reviewed for the MVP labelling scope. The intended 2015 title and its status are TO BE VERIFIED. ACL/Fair Trading, environment/container-deposit and privacy rows remain unverified and outside MVP deterministic rules. R1-27 remains unanswered. |

This table does not verify Standard 1.2.7/1.2.10, additive permissions, prescribed names, claims, HSR, GM, irradiation, country of origin, packaging marks beyond net measurement, nutrition analytical adequacy, or any non-Victorian market. Those remain out of P0-5 scope. The official FSANZ Code index (`https://www.foodstandards.gov.au/food-standards-code/legislation`) was checked as the source navigator on 2026-11-06; its October 2026 consolidation was not substituted for FRL text.

## 12. Progress tracker

**Current phase: Phase 1 (in progress).**

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

Phase 2 groundwork - current workstream

- [x] Turn 1: candidate source map recorded in `docs/mvp-regulatory-research.md`.
- [x] Turn 2: evidence-backed classification inputs that never infer a class from a product name alone.
- [x] Turn 3: additive source capture with provenance and nested ingredient paths; no permission or exemption result.
- [x] Turn 4: Schedule 7/8 declaration-name data and review-only declaration candidates; no permission crosswalk.
- [x] Turn 5: source-validated, review-only additive permission catalog for the selected cohorts; no evaluation or activation.
- [x] Turn 6: pure, trace-producing permission evaluator; review-only against the shipped draft data.
- [x] Turn 7: final-food additive concentration calculation (units, density, yield, basis); review-only when data is missing.
- Deterministic additive and prescribed-name results remain blocked on R4 and applicable reviewer-verified fixtures.

Phases 3 to 6: not started.

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
