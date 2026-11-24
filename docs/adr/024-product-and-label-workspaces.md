# ADR 024: Product and label workspaces

Status: **Direction and N12b label design accepted, 2026-11-17**.
Requirements: DATA-003, VER-002, TRACE-004, TRACE-006, TRACE-008,
PACK-001, PACK-004, PACK-005, UX-007.

**UXR3 update:** [ADR 026](./026-additive-label-wording.md) adds
label-specific additive wording choices while retaining existing
ingredient-level choices as defaults.

**2026-11-18 update:** [ADR 025](./025-incomplete-review-copies.md) records
the implemented incomplete review-copy export. Historical export-block
descriptions below reflect the earlier steps, not the current workflow.

**2026-11-19 update:** [ADR 034](./034-practical-workflow-progressive-disclosure.md)
confirms that product/category checks remain in Product Review while
claims and additive declaration wording belong to individual Label drafts.

## Context

The original navigation direction placed product-specific checks in
Products and label output in Labels. The later Product journey retained a
separate Review & trace link. The owner has clarified that the separate
page should go, without losing its information.

## Decision

- Products hosts product-level checks and contextual access to their
  evidence, calculations, source paths, missing data and versioned results.
- Labels hosts label preview, generation, local draft saving and
  customisation, with relevant label explanations and the review report.
  It uses a selected Product and does not ask users to re-enter its recipe.
- Preserve stored history and immutable approved versions; historical
  results are not silently replaced by current calculations. Preserve
  unsaved work and make stale or missing inputs explicit.
- Retire the separate Review & trace navigation only after the equivalent
  functionality is accessible in context. This changes presentation, not
  the status or approval of any rule or result.
- N12b sets the detailed label workflow with owner approval before
  implementation. It addresses single-panel dimensions,
  orientation and margins, draft association, saving, reopening and
  backup, and propose the scope of appearance, arrangement and content
  controls. The accepted initial editing and draft model is linked below.
- Existing export blockers, privacy, accessibility and non-certification
  safeguards remain in force. A saved draft or preview is not a legal
  clearance.

## N12a implementation

The Product review section now contains the existing draft traces, stored
evaluation history and provisional caffeine check. Labels retains its draft
output and review report and links to the selected Product's review. Opening
Labels from a saved Product selects that Product; switching to another
Product still asks before discarding unsaved edits. Labels identifies when
its selected Product has unsaved edits and uses the saved data. Historical
results are displayed as stored, not recalculated.

The standalone Review & trace navigation has been removed. This relocation
does not add regulatory checks, change saved versions or unlock label PDF
export. Label draft saving and customisation remain for N12c.

## N12b design

The [agreed Labels journey](../implementation-plan.md#n12b---agreed-labels-workspace)
describes draft association and persistence, layout controls, change
warnings, backup and output boundaries. The owner chose multiple named
drafts per Product, bounded pack-copy controls and a live preview with an
explicit warning when saved dependencies change. Broader artwork tools may
be revisited after the first implementation. Accepting the design does not relax export safeguards.

## N12c implementation

Named label drafts are stored locally with their Product association,
layout settings and a signature of saved Product and nested dependencies.
Opening or duplicating a draft restores its layout; the live preview uses
current saved data and warns when the signature differs. A missing Product
is reported rather than replaced. The signature is a change detector, not
an immutable, version-pinned history.

The editor validates physical dimensions, orientation, margins and text
sizes, wraps using the available width and reports overflow without shrinking.
Unsaved edits survive in-app navigation and are protected on switching and
browser unload. When a restore replaces an open saved draft, its open
settings can be saved as a new draft rather than silently overwriting the
restored copy. The initial dimensions are an example, not legal advice.
Backups include label drafts as described in [ADR 011](./011-isolated-workspace-compatibility.md).
The existing review report and label PDF export blockers remain unchanged;
N13 addresses output consistency.

## N13 output consistency

The selected draft's review report records its preview dimensions, margins,
spacing, text sizes and layout issues, as well as the displayed nutrition
basis, rows and optional combined-food column. It distinguishes recorded
directions from directions included in the preview, and identifies unsaved
settings, unsaved Product edits, changed dependencies and invalid layouts.
The report contains no label image and remains a separate review document.
Its Product timestamp is not a version-pinned historical result.

The preview and label PDF renderer use the same generated SVG. PDF tests
render the actual preview through a test-only harness, including a combined
food example and fractional physical page sizes; this does not enable the
blocked application export. Export is cancelled if relevant selected output
changes while rendering. Existing release blockers, unverified font embedding
and physical proof requirements remain, as do the nutrition and content
limitations in ADRs 022 and 023.

## 2026-11-23 UXS7 owner decision

The owner agreed the [UXS7 Label workspace design](../implementation-plan.md#uxs7---discuss-the-label-workspace-in-detail):
a compact Product/Label header and four-tab editor beside a live preview,
with review/export actions and concise actionable notices. On narrow screens
the editor and preview stack with jump links. This supersedes conflicting
earlier presentation arrangements, not the named-draft model, dependency
warnings, unsaved-work protections, output boundaries or review-report
behavior. Claims must be explicitly identified as not yet rendered in the
artwork. UXS7 itself changed no application code.

## UXS8 implementation

The four-tab Label editor and live preview implement the agreed layout.
Compact controls select, save and duplicate drafts; dependency and unsaved
warnings remain visible. Review links open the relevant source or Product
review, and reports remain available even for invalid layouts. Label edits
and separately saved Product claim facts survive tab switches; unsaved
claim facts are protected when switching drafts or leaving the browser.
Claims remain absent from artwork. No regulatory rules or output safeguards
changed.

## UXS11 implementation

The Product claim-facts questionnaire is no longer editable in the Label
workspace. Previously saved facts remain unchanged, and unanswered or
conflicting conditions stay review-required. Label-draft unsaved-work
protection continues; there is no separate unsaved claim-facts form.

## 2026-11-23 UXS13 owner decision

The owner agreed the [guided claims roadmap](../implementation-plan.md#crs-guided-claims-roadmap).
Future claim artwork will show exact user-selected wording on incomplete
review copies even if a check is unresolved or fails, with prominent
textual review warnings. Wording already shown from another label field
must not be duplicated, and it must never be silently rewritten or removed.
This supersedes the earlier long-term exclusion of claims from artwork,
but claims remain absent in the current implementation until CRS7. Existing
incomplete-copy, accessibility and release safeguards remain in force;
this decision approves no rule or label.

## 2026-11-23 CRS1 owner decision

The owner agreed the [claim-journey inventory and workflow](../implementation-plan.md#crs1---inventory-and-design-the-claim-journey),
subject to reassessment after seeing it in use. Detected wording remains
owned by its original field; Label-specific review decisions must not create
duplicate artwork or silently modify text. Future claim warnings belong
alongside the preview and on the incomplete PDF's review cover/report, not
silently inserted into the chosen-size artwork; the separate report also
records them. Current claims remain absent from artwork until CRS7. This
design decision changes no implementation, rule or release gate.
