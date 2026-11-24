# ADR 033: Percentage daily intake display

Status: **Accepted for UXR10, 2026-11-19**.
Requirements: CALC-010, PACK-005.

## Context

Standard 1.2.8—8 makes %DI optional. When it is included, it requires per-serving percentages for its listed nutrients and one of two statements based on an average adult diet of 8 700 kJ. It specifies the reference values but no calculation formula, decimal precision or tie-breaking rule. The current FSANZ Nutrition Panel Calculator guidance reviewed on 2026-11-19 does not prescribe %DI rounding.

Food for infants has a separate NIP scope: Standard 2.9.2—11(1)(c) says it need not comply with Standard 1.2.8—8, and subsection 2.9.2—11(3) requires the S12—6 format. The app does not yet support that format. Formulated caffeinated beverages also have a special S12—5 format. Prepared, reconstituted and drained panels have unresolved applicability and basis boundaries.

Primary-source findings and links are recorded in [NIP display research](../nip-display-research.md#13-uxr10-di-recheck-2026-11-19) and the versioned draft rule data.

## Decision

- Keep the statutory reference values, provisions, effective date, source IDs, permitted statements, conditional dietary-fibre value and review notes in the draft rule release. They remain draft data and are not an approved rule release.
- Offer %DI as an optional per-label display choice. New label drafts start with it selected; older saved drafts and backups without the field keep it off. A user can turn it off for a new label.
- Calculate only for a confirmed general-food product using the supported as-sold per-serving basis. Calculate from unrounded per-serving values, not from formatted NIP strings. Show unavailable values as “Not available”; a known zero is calculated as 0%. Missing values never become zero.
- Use the statutory statement “Percentage daily intakes are based on an average adult diet of 8 700 kJ”. If the confirmed product type, nutrition basis or required row value is unsupported or missing, do not show a partial/unsupported %DI basis; mark it REVIEW REQUIRED.
- Use **nearest whole percent, exact halves rounded up** as the product display policy selected by the product owner. This is not a Code or FSANZ convention. The review report identifies the calculation interpretation, policy, source versions and unresolved gaps.
- Do not apply ordinary adult %DI to `infantFood` or formulated caffeinated beverage products. Their separate NIP formats are not implemented. Do not generate %DI for prepared/reconstituted or drained panels until their applicability and calculation bases are supported. %RDI and claim-driven nutrient rows remain separate and unresolved.
- Preserve the existing ingredient declaration and supported allergen summary; this decision does not certify their completeness or legal applicability.

## Consequences

- A selected %DI column is rendered consistently in the HTML preview, SVG/PDF label and review report. When a combined-food column is present, it remains the rightmost column.
- Layout preflight supports five-column tables and reports width or overflow issues rather than shrinking text silently.
- A missing serving value or unsupported context remains visible in the label review and report; no deterministic PASS/FAIL or compliance claim is introduced.
- Dietary fibre is included only if declared under the Code, but the current panel does not add fibre or other claim-driven rows automatically.
