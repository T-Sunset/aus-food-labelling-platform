# ADR-006: Illustrative preview of unreviewed rule outcomes

- Status: **Accepted 2026-11-10 (user approval); locked decision D8**
- Date: 2026-11-10
- Plan: Phase 3 groundwork turn C2; would become locked decision D8
- Requirements: TRACE-012, TRACE-015, DATA-003, TEST-004, CLAIM-004

## Context

Every Phase 2 result is REVIEW REQUIRED because the shipped rule data is draft
and unreviewed. A reviewer cannot judge whether the logic is right when they
only see "review required". The reviewer is not available for some time, so we
need a way to show what the engine would conclude if a rule were approved,
without breaking the rule that nothing deterministic is enabled without
reviewer approval.

## Decision (proposed)

Add an **illustrative preview**: a second, separate calculation that re-runs
an evaluator with its approval gates lifted, and presents the outcome as
"would be PASS / FAIL if this rule were approved".

Plain-English behaviour:

1. The official result is always computed first, exactly as today. It stays
   REVIEW REQUIRED while rule data is draft. The preview can never change it.
2. The preview is **off by default** and turned on per session (not saved on
   the product, not in backups, not in exports).
3. When on, each result shows an extra, clearly bannered block: "ILLUSTRATIVE
   ONLY - unreviewed rule data. If this rule were approved, this would be
   PASS" (or FAIL). The official status stays visible beside it.
4. The block always names which gates were lifted (for example "rule is
   draft", "mapping confidence is Standard, not Provision") so the reviewer can
   see what is being assumed.
5. The preview never appears in the label layout, the PDF, the label preview,
   or any exported report. It is on-screen review material only.
6. Wording avoids certification language. It says "would be", never "is
   compliant" or "approved".

### What the preview lifts, and what it never lifts

Lifts (these are reviewer-owned gates):

- Rule or catalog row has `reviewStatus: draft`.
- Mapping confidence below Provision (TRACE-015).
- Catalog marked draft.

Never lifts (these are missing facts, not reviewer gates; they stay REVIEW
REQUIRED in the preview too):

- Unknown, missing or conflicting inputs (unknown is never zero or PASS).
- Unconfirmed cohort, category, food form or serving.
- Missing evidence or evidence date.
- Unsupported or unmapped cases (other cohorts, comparative and health claims,
  unregulated claims, unmapped rows).
- Unit or calculation-basis mismatches.

### Design

- Engine stays pure. Each evaluator already takes its gates as inputs
  (`ruleApproved`, `rule.mappingConfidence`, `catalog.status`, row
  `reviewStatus`). The preview calls the **same evaluator** with those inputs
  set to their approved values, so there is no second copy of the logic to
  drift.
- **Run at most once more, and usually not at all.** Every review reason code
  is classified as either a reviewer gate (draft, unreviewed, below Provision)
  or a missing fact. The preview first reads the official result's reasons. If
  any reason is a missing fact, the preview stops there ("not eligible: needs
  facts") and nothing is re-run. Only when every blocking reason is a reviewer
  gate is the evaluator re-run once with those gates lifted. The preview is
  also off by default, and the evaluators are small pure functions, so the
  cost is negligible. (Refinement agreed 2026-11-10 after the user asked
  whether running twice was inefficient; a pure single-pass flag was rejected
  for existing evaluators because it means rewriting Turn 6 to 11 code.)
- A new domain type `IllustrativeResult<T>` is **not** an `EngineResult` and has
  no `status` field that other code reads. It holds `officialStatus`,
  `illustrativeStatus`, `liftedGates` and the underlying result trace. This
  makes it impossible to pass a preview where an official result is expected.
- A helper `illustrate(...)` per evaluator family lives in `packages/engine`;
  the web layer only renders it.
- Rule data is not modified. No rule is marked reviewed by the preview.

### Tests required in C2 (when built)

- The official result with the preview helper present is byte-identical to the
  result without it, for every shipped rule and fixture.
- Property test: for any input, the preview helper never changes the official
  status, and never returns PASS or FAIL when a never-lifted gate fails.
- A catalog or rule validator test: no code path writes `reviewStatus:
  reviewed`.
- Web test: preview is off on load, is not persisted to storage or backup, and
  the PDF and label export contain no preview text.
- Accessibility: preview status is text, not colour alone.

## Alternatives considered

- **Mark draft rules as reviewed in a demo build.** Rejected: it is a lie in
  the data and could leak into real use.
- **Separate demo rule file.** Rejected for now: duplicates data and drifts
  from the real catalog; revisit if the reviewer wants different thresholds
  tried.
- **Show only REVIEW REQUIRED.** Rejected: the reviewer cannot judge the logic.

## Consequences

- A non-reviewer could mistake the preview for a verdict. Mitigations: off by
  default, session-only, persistent banner, "would be" wording, never in
  exports, official status always beside it.
- Adds one more result shape to maintain; kept small by reusing the evaluators.

## Open questions for the user

None. Approved 2026-11-10 with scope "all evaluators (additives, names,
claims)" and a per-session switch that is off on every load.
