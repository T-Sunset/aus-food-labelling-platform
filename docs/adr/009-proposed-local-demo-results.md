# ADR 009: Local-demo results and exports

Status: **Accepted 2026-11-11 for the local demo; partially implemented**.
Date: 2026-11-11
Plan: Victorian drink demo D0; prerequisites for D2.
Requirements: DATA-003, FR-006 to FR-010, TEST-004, TRACE-008, TRACE-012,
TRACE-015, PACK-001 and PACK-005.

**2026-11-18 update:** [ADR 025](./025-incomplete-review-copies.md) supersedes
the incomplete-export prohibition below for local reviewer copies. UXR2a
implements those identified review-only PDFs; it does not authorize finished
labels or public release.

**UXR2 update:** For user-entered facts in classification screening, additive
permission and infant-name checks, and nutrition-content claims, a source
reference or date is optional. This supersedes older source-only input gates
for those checks, not their rule-review, mapping, applicability or missing-fact
gates. When a classification answer changes, its previous source details
are retained separately, not attributed to the new answer. With all facts
present, an opt-in illustrative outcome may therefore
become available without a user reference; the official draft-rule outcome
remains REVIEW REQUIRED. UXR11 initially retained a separate dated-evidence
gate for caffeine; the 2026-11-19 update below supersedes that gate for the
selected provisional caffeine check.

The context and original decision below describe the earlier local-demo
state; the UXR2 and UXR2a updates above supersede the corresponding source
and export restrictions.

## Context

ADR-006 and D8 require draft-rule outcomes to be shown only in an opt-in,
on-screen illustrative preview. The official result remains REVIEW REQUIRED;
illustrative results are not exported. The product owner wants the local
demo to do useful work from verified rule data and complete recorded inputs
without waiting for reviewer availability, and to produce a representative
label for the reviewer to critique.

The product owner approved this policy on 2026-11-11, with the expectation
that the app does as much as it reliably can from legislation and presents
useful outcomes rather than blanket "draft/unreviewed" messages. This ADR
supersedes ADR-006 and D8 only for the explicitly selected, eligible
local-demo checks described below. Existing behaviour remains unchanged
until implemented; other checks and public-release gates retain their
existing safeguards. The independent review-report export and a temporary
label-PDF block are implemented. The current label layout does not assess or
assemble all potentially required content, so label-PDF export is blocked
for every product until that can be assessed; previews remain available.
A bounded caffeine range evaluator and unresolved screen/report
presentation are implemented. UXR11 connects complete, explicit recipe
caffeine facts and numeric final-food density to the evaluator. Source
details are optional; unsupported processing, missing or conflicting facts
and unexpanded compounds stay unresolved.
The existing illustrative evaluators remain separate and do not supply that
evidence.

**UXR11 update (2026-11-19):** only the Standard 2.6.4—3(a) caffeine range is
active. The app expands the saved formulation to ingredient leaves, calculates
their caffeine from complete, explicit user-entered facts, converts volume-
basis values with a positive numeric ingredient density, and converts the
total to mg/L with a positive numeric final-food density. Source references
and dates are optional and retained when supplied; inputs and sources are not
independently verified. Unknown or conflicting facts, invalid or missing
conversion densities, an unconfirmed as-sold recipe, recorded mass changes,
finished-food or retention adjustments, consumer preparation, and unsupported
compound ingredients remain REVIEW REQUIRED. The product-type selection is a
routing input, not legal classification. Results display as provisional,
retain the rule's draft status and list their calculation inputs and
limitations in product review and the separate report. No additive
permission, label-content or advisory check is activated by this change.

## Decision

For explicitly scoped local-demo checks, show **provisional** results normally,
without an opt-in, where every eligibility condition below is met. A
provisional result is a real evaluation of an identified check, not an
overall verdict, a reviewer-approved rule or a legal certification. The
rule's reviewer status and the evaluation's provisional status must be
distinct and traceable. An approved result remains distinct from a
provisional one.

1. The source provision and applicable compilation, effective date,
   transition, product scope, conditions and exceptions have been checked and
   recorded in versioned rule data. The rule has a documented mapping and
   testable rationale; it must not be a guess based on a title or a name.
2. The check is explicitly supported by the demo and its required product
   facts, calculations, units and food state are complete and not conflicting.
   User-entered facts may be source-free where the recorded input policy
   allows it. Any supplied source details remain traceable but are not
   independently verified merely because the software uses them.
3. There are fixtures for applicable and non-applicable cases, boundaries,
   missing and conflicting inputs and relevant transition dates. An
   unimplemented exception or uncertainty that affects the result blocks that
   conclusion.
4. A deterministic FAIL below Provision-level mapping confidence is
   prohibited without reviewer approval (TRACE-015). For the initial demo,
   require at least Provision-level mapping for either a provisional
   positive or negative legal finding; weaker mappings remain informational
   or unresolved. This proposal does not relax TRACE-015.

When a required fact is unknown, conflicting or missing, or a rule or
classification cannot be applied reliably, show the specific unresolved
issue and next action. Do not output a positive or negative finding for that
check, infer absence or zero, or mark the rule as reviewed. Other independent,
well-supported checks may still show their own outcomes.

## Presentation

- **Screen:** Show eligible provisional check results by default, described
  in plain English as specific useful outcomes. State any check-specific
  input conditions; for UXR11, complete user-entered facts may be used without
  source references. Make the unreviewed rule status and unverified user
  inputs clear in context and details, without replacing every result with a
  generic review warning. Offer rule/source, inputs, assumptions and status
  on demand. Do not use an overall green or compliant verdict; encourage
  external expert review.
- **Label preview and label PDF:** Render supported, traceable label content
  without embedding a full technical report or repetitive review warnings.
  Clearly identify the output as a draft and not reviewer-validated in the
  preview and PDF, outside the actual pack-copy content, so this cannot be
  mistaken for mandatory wording. Encourage external review. Do not represent
  a provisional export as a final print-ready label.
- **Separate PDF report:** Include the provisional check outcomes, source and
  version, relevant input/evidence traces, unresolved items and limitations.
  Preserve the distinction from reviewer-approved outcomes. Do not present an
  illustrative-only result as an approved one.
- **Incomplete or unsupported cases:** Show a draft preview and specific
  missing items where feasible. The original decision blocked label-PDF
  export when a required section was missing or unresolved; ADR 025 replaces
  that restriction for identified review copies. Allow unmistakable lot/date production
  placeholders only where the required type is known; placeholders are never
  real values or proof of a validated shelf life. Keep the separate
  explanation report exportable to help resolve missing information, subject
  to explicit errors for technical export failures. Never silently omit a
  mandatory section or represent it as complete.

The policy applies only to checks deliberately selected and validated for the
local demo; it does not automatically activate existing draft additive,
prescribed-name or claim catalogues. Existing unrelated checks retain their
current safeguards until deliberately addressed. Engine, UI, reports and
exports must share the same eligibility and trace, not independently invent
different outcomes.

## Boundaries and verification

- The application stays local-first; the pure engine remains free of I/O.
- Published/approved snapshots remain immutable and reproducible. Draft
  updates must refresh affected calculations without rewriting history.
- No reviewer approval is fabricated. Reviewer critique, required
  release/approval gates, print proof and public MVP acceptance remain
  separate.
- Tests must cover each output surface, explicit provisional labelling,
  missing and conflicting evidence, applicability and non-applicability,
  below/equal/above boundaries, source version/transition selection,
  unsupported and low-confidence mappings, and regression of existing
  reviewer-gated and illustrative-only paths.

## Alternatives

- Keep all outcomes behind the existing illustrative opt-in: preserves
  ADR-006 unchanged, but does not support the desired normal demo workflow.
- Treat unreviewed rules as approved: rejected because it misrepresents their
  status and can leak into release decisions.
- Put all review warnings on the pack face: rejected because it confuses
  product content with review material and obscures the representative label.

## Approval and remaining work

The product owner approved the policy and the above incomplete-export choice
on 2026-11-11. The product owner requested useful automated results and
encouragement of external legal or consultant review, without making every
result look like the app has done nothing. This approval does not mark
individual rule data reviewed or implement the policy. D0's source and
scenario acceptance work remains open; implementation follows the plan's
separately approved turns.
