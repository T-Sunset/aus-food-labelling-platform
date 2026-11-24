# UXR12: Ordinary-food journey results

Status: **Engineering journey exercised, 2026-11-19.** No human usability
study or external reviewer response was collected. This record is not
regulatory acceptance or public-release approval.

Requirements: UX-007, PACK-005, BKP-001.

## Scenario and evidence

The browser exercise follows fictional cake and cookie data from ingredient
entry through a nested cake-mix ingredient, formulations, Products, label
preview, review report, incomplete review-copy export, and encrypted
workspace backup and restore. The fixture values are invented test data; they
are not a real recipe, supplier specification, baking result, or evidence
about actual food.

The exercise confirmed that:

- The label preview, separate review report, and **Incomplete Review Copy**
  PDF are reachable from the ordinary-food flow. The report identifies the
  output as incomplete, explains that it does not certify legal compliance,
  and lists review limitations.
- Incomplete recipe information remains unavailable rather than being
  treated as zero. The cookie case shows the missing recipe information, and
  an additive with unknown use or concentration stays `REVIEW REQUIRED`.
- Changing an ingredient or recipe after saving a label surfaces changed
  dependencies. The product's as-sold confirmation must be made again before
  its updated nutrition is shown.
- The encrypted workspace backup restored into a separate browser context.
  Products, formulations, ingredients, label dimensions, and unresolved
  inputs remained available; changed dependencies continued to be flagged.
- Automated WCAG 2.1 A/AA axe scans found no violations in the workspace
  screens and in the exercised compound-ingredient, label, and expanded
  review-trace states. This is automated coverage, not manual assistive-
  technology or print-legibility testing.
- The label settings flow also passed its narrow-screen keyboard test.

The existing drink contrast was also exercised: incomplete caffeine inputs
remain unresolved, while complete explicit user-entered facts can produce
only the provisional caffeine-range outcome. This does not activate other
drink checks or change the draft rule's status.

## Nutrition and reviewer boundary

The cake/cookie values and displayed %DI are fixture values for workflow
testing only. As [ADR 022](./adr/022-nutrition-panel-integration.md)
specifies, a calculated or displayed nutrition panel does not determine its
legal applicability or required basis. Food form, serving and unit quantity,
rounding and any additional required rows remain review considerations;
prepared, drained, infant-food, and formulated-caffeinated-beverage cases do
not inherit an ordinary-food panel decision.

The browser test generated and inspected the review PDFs but did not retain
them as reviewer deliverables because they contain fictional fixture data.
The reports are designed to support a separate human review; no reviewer
feedback or approval was received for this exercise.

## Remaining release gates

- **Human reviewer acceptance:** reviewer-verified golden fixtures (R3-01),
  nutrition display policy and fixtures (R1-13), and the minimum-size and
  physical print proof (R1-21) remain open. R1-23 disclaimer wording also
  remains pending in the [reviewer questions](./reviewer-questions.md).
- **Nutrition and food-state scope:** [ADR 022](./adr/022-nutrition-panel-integration.md)
  records unsupported or review-only bases, formats, and overlapping
  directions. The displayed panel is not a legal determination.
- **Pack and declaration content:** applicability and adequacy of supplier,
  lot, date, storage, warning/advisory, and other required content remain
  unresolved as described in [ADR 023](./adr/023-pack-and-declaration-integration.md)
  and [ADR 032](./adr/032-label-pack-copy-and-applicability.md). The PDF is
  an incomplete review copy, not a finished packaging label.
- **Regulatory coverage:** the bundled rules remain draft and none are
  enabled. Additive limits, prescribed names, claims, product classification,
  and unsupported cases still require their planned implementation, source
  mapping, and applicable reviewer gates.

The tested browser paths are recorded in
[ingredient-workflows.spec.ts](../apps/web/e2e/ingredient-workflows.spec.ts),
[label-builder.spec.ts](../apps/web/e2e/label-builder.spec.ts), and
[accessibility.spec.ts](../apps/web/e2e/accessibility.spec.ts). Automated
success does not close the open review and public-release gates.
