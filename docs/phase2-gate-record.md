# Phase 2 release gate record

Prepared: 2026-11-10 (Phase 2 Turn 13). Status: **engineering gate passed; no reviewer sign-off recorded; no deterministic release enabled.**

This record assists review. It does not certify legal compliance and is not regulatory acceptance. Open reviewer questions are in [reviewer-questions.md](./reviewer-questions.md) (R4-01 to R4-11, R3-01); research detail is in [mvp-regulatory-research.md](./mvp-regulatory-research.md).

## 1. Engineering gate (automated)

| Check | Evidence | Result |
| ----- | -------- | ------ |
| Source and version | `scripts/phase2-gate.test.mjs`: every catalog is at release version `0.1.0-draft` and `draft`; every cited source resolves, has an HTTPS URL, effective date and checked date; `SRC-ADD-*` and `SRC-NAME-*` are `primary-source-verified`. | Pass |
| No activation | Same test: every rule, permission row, row limit and name rule is `draft`. `pnpm validate:rules` reports no rules enabled. | Pass |
| Selected-cohort fixtures | Same test: all 59 shipped permission rows, evaluated for every identifier with fully supplied inputs, return REVIEW REQUIRED; unconfirmed and unsupported cohorts stay review-only. | Pass |
| Property tests | fast-check over category, code, concentration (including negative, non-numeric and empty), unit, GMP and mapping confidence: the permission evaluator never returns PASS or FAIL on draft data; the infant 'sweetened' check never does while its rule is unapproved. | Pass |
| Unit, e2e, accessibility | `pnpm test`, `pnpm test:e2e` (includes `additive-name-checks.spec.ts` and the WCAG scan of the Additives & names screen), `typecheck`, `lint`, `build`. | Pass |

Gate finding fixed in this turn: the Turn 6 and Turn 10 guard tests under `scripts/` were not matched by the root vitest include, so `pnpm test` skipped them. `vitest.config.ts` now includes `scripts/**/*.test.mjs`; they pass.

## 2. Reviewer verification records (to be completed by the reviewer)

Nothing below is verified by a reviewer. "Proposed" is the engineering position; leave "Reviewer decision" blank until signed.

### 2.1 Classification (R4-01)

| Cohort | Candidate Schedule 15 category | Proposed handling | Reviewer decision / date |
| ------ | ------------------------------ | ----------------- | ------------------------ |
| Formulated caffeinated beverage | 14.1.3 (and 14.1.3.0.1, 14.1.3.0.2, 14.1.3.3) | Person confirms category from dated evidence; never inferred from name | |
| Food for infants | 13.2 | Person confirms; unprocessed fruit/vegetable and other exclusions review-only | |

### 2.2 Mappings

| Item | Count / scope | Mapping confidence | Reviewer decision / date |
| ---- | ------------- | ------------------ | ------------------------ |
| Schedule 15 permission rows | 59 rows, 5 categories | Draft; transcribed, some table presentation unverified | |
| Schedule 7 class names / Schedule 8 listings | 25 / 344 | Draft; four listing differences preserved | |
| Prescribed-name candidate rules | 5 (2.9.2-7(3)(d), 7(3)(e), 8(1)(a); no-prescribed-name statements) | Provision for three, Standard for two | |
| Infant 'sweetened' threshold | Above 4 g/100 g | Provision; rule unapproved | |

### 2.3 Representative outcomes to verify (fixtures)

| # | Scenario | Current result | Reviewer-expected result |
| - | -------- | -------------- | ------------------------ |
| F1 | Caffeinated beverage, sorbic acid, category confirmed, concentration and evidence supplied | REVIEW REQUIRED (draft data; calculation-basis text unsupplied) | |
| F2 | Same, concentration missing | REVIEW REQUIRED (CONCENTRATION_MISSING) | |
| F3 | Additive permitted at GMP (R4-03) | REVIEW REQUIRED | |
| F4 | Infant food, added sugars 4 g/100 g | REVIEW REQUIRED (exactly 4 does not require the word, shown for information) | |
| F5 | Infant food, added sugars above 4 g/100 g, name lacks 'sweetened' | REVIEW REQUIRED (rule unapproved) | |
| F6 | No cohort confirmed | REVIEW REQUIRED (COHORT_NOT_CONFIRMED) | |
| F7 | Additive without code number | Not evaluated for permission; listed | |

### 2.4 Sign-off

| Gate | Reviewer | Date | Decision |
| ---- | -------- | ---- | -------- |
| R4 classification, mappings and rule activation | | | |
| R3-01 fixture approval | | | |
| R1-21 print-scale acceptance | | | |

## 3. Unsupported cases (visibly review-only)

- Other product cohorts and any Schedule 15 category outside the five mapped.
- Same-purpose mixture, aggregate colour, carry-over and processing-aid checks: engine functions exist (Turns 8-9) but have no workspace entry; processing aids and incidental presence have no mapped permission or provision.
- Per-ingredient density evidence; concentrations assume a 100 g ingoing formulation.
- Permission rows needing a "calculated as" basis text.
- Honey 'sterilised' wording, percentage declarations, true-nature judgements, mixed or novel foods.
- Claims (Phase 3), NIP display policy and rounding.

## 4. Release position

Phase 2 exit criteria ("each rule has Provision-level mapping or is review-only; fixtures reviewer-checked") are met for the first half only: every rule is review-only. The reviewer-checked fixtures are outstanding, so no deterministic PASS or FAIL is enabled and the build is not approved for public MVP use.
