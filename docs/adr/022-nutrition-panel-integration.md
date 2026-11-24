# ADR 022: Nutrition panel integration

Status: **Accepted for N11, 2026-11-17**.
Requirements: CALC-010, CALC-011, CALC-014, CALC-015, DATA-003, DATA-006.

**2026-11-18 update:** UXR2a implements [ADR 025](./025-incomplete-review-copies.md):
incomplete PDFs can be exported for review only. The nutrition limitations
below remain in place.

**UXR2 update:** Nutrition, density, retention and drained-food values can
be entered without references. UXR11 applies the same input rule to explicit
ingredient caffeine facts used by the provisional formulated-caffeinated-
beverage range check. Source details remain optional and are retained when
supplied. Recorded values and confirmations remain necessary, and legal
applicability and export safeguards are unchanged.

## Australian source boundary

The Australian Food Requirements Analyst rechecked the latest Australian
Federal Register compilations of
[Standard 1.2.8](https://www.legislation.gov.au/F2015L00395/latest/details),
[Schedule 12](https://www.legislation.gov.au/F2015L00482/latest/details)
and [Standard 2.9.2](https://www.legislation.gov.au/F2015L00417/latest/details)
on 17 November 2026. They remain the compilations recorded in
[food-state nutrition research](../food-state-nutrition-research.md).
Those provisions are conditional and include special rules for food for
infants. Reconstitution with water and use with another food may overlap;
their interaction remains unresolved. A recorded preparation type alone
does not establish which legal provisions apply.

## Owner direction: ordinary NIP calculation method

On 2026-11-19, the owner directed that ingoing recipe nutrients and quantities
be the general calculation method for ordinary NIP cases where that method
best represents average quantities. This aligns with Code Standard
1.1.1-6(2)-(3), which permits calculation from actual or average nutrient
quantities in ingredients among its methods. It is not a universal Code rule
that every panel must show raw/as-added values or ignore processing.

The owner closed UXR14-UXR15's planned automatic retention-factor dataset and
label-workflow integration. Existing optional direct finished-food and
manual-retention routes remain unchanged under [ADR 018](./018-nutrient-retention.md).
Code-triggered reconstituted, drained and combined-food cases remain in scope
under Standard 1.2.8-11 to -13. This documentation update changes no
application behavior and adds no regulatory conclusion.

## Decision

- Show supported base nutrients in the draft panel using the recorded
  consumer basis, with directions, evidence and calculations in the trace.
  Label applicability, the preparation fluid, food form and unit quantity
  remain subject to review. Unknown, contradictory or overlapping directions
  do not generate an as-sold or combined result.
- For a combined-food column, retain the as-sold serving and unit quantity
  and show the added food and amount. Only show combined values when the
  confirmed mixture corresponds to one recorded as-sold serving. A
  differently sized prepared serving is not silently treated as that
  combined serving.
- Show only directly evidenced drained values. Prepared and drained servings
  are independent of the as-sold serving; the number of such servings per
  package is not inferred. Missing values remain unavailable, not zero.
- Preserve the non-certification warnings and review-copy limitations.
  Four-column SVG layout checks widths and reports overflow without shrinking.

## Remaining limitations

Prepared per-100 mL results and reliable prepared food-form determination
are not implemented. Per-100 g is an evidenced draft calculation, not a
determination of the legally appropriate unit. Additional and claim-related
nutrient rows are not automatically placed on the panel: entering a nutrient
alone does not establish that it is required or permitted. Infant-food
formats, applicability and special requirements, mixed preparation and
draining, and overlapping legal provisions require further work or review.
N12 subsequently connected supported pack content; see
[ADR 023](./023-pack-and-declaration-integration.md). N13 makes the review
report reflect the same draft nutrition basis and displayed values as the
preview, including unavailable and combined-food values; it does not resolve
these regulatory or presentation limitations. See
[ADR 024](./024-product-and-label-workspaces.md).
