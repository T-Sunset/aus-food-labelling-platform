# Phase 3 claims gate record

Prepared: 2026-11-10 (Phase 3 Turn C8). Status: **engineering gate passed; no reviewer sign-off recorded; no deterministic claim result enabled.**

This record assists review. It does not certify legal compliance and is not regulatory acceptance. Open reviewer questions are R5-C1-01 to R5-C1-06 in [reviewer-questions.md](./reviewer-questions.md). Research detail is section 23 of [mvp-regulatory-research.md](./mvp-regulatory-research.md). The Phase 2 position is in [phase2-gate-record.md](./phase2-gate-record.md).

## 1. Engineering gate (automated)

| Check | Evidence | Result |
| ----- | -------- | ------ |
| Source and version | `scripts/claims-gate.test.mjs`: the claim catalog is at release version `0.1.0-draft` and `draft`; every cited source (SRC-CLAIM-001 Schedule 4, SRC-CLAIM-002 Standard 1.2.7) resolves, has an HTTPS URL, effective date and checked date, and is `primary-source-verified`. | Pass |
| No activation | Same test: every claim rule and every release rule is `draft`. `pnpm validate:rules` reports no rules enabled. | Pass |
| Fixtures | Same test: each of the five shipped rules, with every input supplied and the threshold met, returns REVIEW REQUIRED (`RULE_NOT_APPROVED`). The illustrative preview shows a determinable outcome but is a separate object with no status. | Pass |
| Review-only paths | Same test: comparative, health, not-regulated, unclassified and unsupported claims, and any restricted or unanswered prohibited context, return REVIEW REQUIRED. | Pass |
| Property tests | fast-check over rule, mapping confidence, classification, confirmation, food form, amount (including negative, non-numeric and empty), unit and every confirmation: the claim router never returns PASS or FAIL on draft data. | Pass |
| Unit, e2e, accessibility | `pnpm test`, `pnpm test:e2e` (includes `claims.spec.ts` and the WCAG scan of the Claims screen), `typecheck`, `lint`, `build`. | Pass |

## 2. Reviewer verification records (to be completed by the reviewer)

Nothing below is verified by a reviewer. "Proposed" is the engineering position; leave "Reviewer decision" blank until signed.

### 2.1 Claim rules

| Rule | Descriptor | Mapping confidence | Proposed handling | Reviewer decision / date |
| ---- | ---------- | ------------------ | ----------------- | ------------------------ |
| claim.low-energy | Low | Provision | Per 100 mL or 100 g by food form; figures as in the catalog | |
| claim.low-fat | Low | Provision | As above | |
| claim.low-sugars | Low | Provision | As above | |
| claim.low-sodium | Low | Provision | As above; "low salt" wording is flagged for decision | |
| claim.good-source-dietary-fibre | Good source | Provision | Per serving, with the general condition | |

### 2.2 Representative outcomes to verify

| # | Scenario | Current result | Reviewer-expected result |
| - | -------- | -------------- | ------------------------ |
| C-F1 | Low sugars, liquid, all facts confirmed, figure at or below the limit | REVIEW REQUIRED (rule draft); preview would show PASS | |
| C-F2 | Same, figure above the limit | REVIEW REQUIRED (rule draft); preview would show FAIL | |
| C-F3 | Same, amount missing | REVIEW REQUIRED (AMOUNT_MISSING); never treated as zero | |
| C-F4 | Wording not in the permitted set (for example "less sugar") | REVIEW REQUIRED (WORDING_NOT_PERMITTED) | |
| C-F5 | Infant formula product, kava or over 1.15% alcohol marked as applying | REVIEW REQUIRED (PROHIBITED_CONTEXT) | |
| C-F6 | Good source of dietary fibre, serving not confirmed | REVIEW REQUIRED (SERVING_NOT_CONFIRMED) | |
| C-F7 | Claim not classified, or classified comparative, health or not regulated | REVIEW REQUIRED, reason shown | |

### 2.3 Sign-off

| Gate | Reviewer | Date | Decision |
| ---- | -------- | ---- | -------- |
| R5-C1-01 first claim set and wording | | | |
| R5-C1-02 to -06 | | | |
| Claim rule activation | | | |

## 3. Unsupported claims (visibly review-only)

- Protein, saturated fat, carbohydrate and any other nutrient not in the five shipped rules.
- Comparative ("reduced", "increased", "light") claims; the section number is not yet verified.
- Health claims and the Standard 1.2.7-18 framework.
- "No added" and "free" claims, and unregulated wording such as "natural"; the person's classification is recorded but not assessed.
- Infant formula products, kava and foods above 1.15% alcohol by volume: not evaluated.
- Infant protein claims under Standard 2.9.2-8(2) (R5-C1-02).
- Nutrition information panel rows and accompanying statements that a claim may trigger; wording equivalence beyond an exact match.
- Claims never appear on the label preview or PDF.

## 4. Release position

Every claim rule is draft, so no deterministic PASS or FAIL is enabled. The illustrative preview is review material only, off on every load, not saved, and absent from the label and PDF. The build is not approved for public MVP use; reviewer decisions above are outstanding.
