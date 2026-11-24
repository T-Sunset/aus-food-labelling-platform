# UXR20: Label-content gap audit

**Status:** Complete (2026-11-20). This is a bounded inventory of the current
draft workflow and relevant source provisions, not a product-specific legal
assessment or approval of generated labels. Applicability depends on food,
formulation, package and sale context. The source research snapshot is
2026-11-20, with the National Trade Measurement Regulations and Victorian Act
text followed up during this audit. Recheck source compilations when
implementing a rule.

The implementation plan records Amendment 253 (published 2026-10-29) and
later amendments as not yet assessed. These citations therefore do not claim
to be the latest applicable text on the audit completion date.

Nutrition information, country-of-origin, claims, additive declarations,
prescribed food names, GM/irradiation and characterising-ingredient
declarations are outside this UXR20 content set and remain governed by their
separate requirements and roadmap work.

## Current coverage

| Content area | Data and output today | Gap and trace |
| --- | --- | --- |
| Ingredient declaration | The draft expands known recipe composition and ingoing amounts into an ordered candidate. Missing recipes, composition and some additive wording produce review items. Candidate additive notes can appear in the rendered declaration. See [label-draft.ts](../apps/web/src/label-draft.ts). | The candidate is not a final determination of required names, omissions, processing basis or exceptions. Complete UXR21 before treating this as a usable declaration (TR-003, FORM-005, ADD-009; R1-01 to R1-05). |
| Allergens | Known ingredient assessments are propagated; a bold `Contains:` candidate is assembled when names are known. Conflicts, unknown evidence and final-food conditions remain review items. No positive candidate does not establish absence. See [label-draft.ts](../apps/web/src/label-draft.ts) and [label-layout.ts](../apps/web/src/label-layout.ts). | Required names, exemptions, ingredient-list emphasis, summary placement and any precautionary statement need separate handling. The layout does not verify the legal field-of-view test. Complete UXR22 (TR-004, TR-019; R1-06 to R1-10). |
| Supplier and lot | Label-specific supplier name/address and lot text can be entered, then copied to the preview and review report. Empty or entered text is not checked for applicability, adequacy or completeness. See [LabelExportPanel.vue](../apps/web/src/components/LabelExportPanel.vue), [consultant-notes.ts](../apps/web/src/consultant-notes.ts) and [ADR 032](./adr/032-label-pack-copy-and-applicability.md). | The Code's supplier identity and trade-measurement packer/address are distinct duties; one free-text field does not establish both. No lot syntax or exemption is determined (TR-002, PACK-005; R1-17). |
| Quantity and package geometry | Product quantity and label width, height, orientation and margins feed the preview. The quantity is not checked for accuracy or marking applicability. The layout receives `requiredBlocks: []`, so it does not enforce required-content presence. See [label-layout.ts](../apps/web/src/label-layout.ts). | The app does not model all package shapes, principal display panels, quantity-marking exceptions or the trade-measurement type-size rules. Keep quantity review-only (PACK-001, PACK-004, TR-021; R1-20). |
| Date and storage | Proposed date text and storage instructions are user-entered and shown in the draft/report. No date type or shelf life is calculated, and storage applicability is not evaluated. | User text is not evidence that the date or instruction is justified; an empty field does not establish non-applicability (TR-007, TR-008; R1-18, R1-19). |
| Warnings and advisories | Label-specific copy is user-entered; an empty field does not establish that none applies. Separate product checks, including the provisional caffeinated-beverage check in [caffeine-check.ts](../apps/web/src/caffeine-check.ts), are not assembled as validated warning text in the label. | Trigger coverage, exact prescribed wording and size are not comprehensively implemented. Precautionary allergen wording is a separate, voluntary product-policy decision, not a substitute for mandatory declarations (TR-019; R1-19). |
| Legibility and export | Text sizes are user-controlled. The layout reports overflow and marks minimum-size status for review; the PDF report keeps physical print proof and font embedding unverified. Export metadata and non-certification wording are included. See [packages/label/src/index.ts](../packages/label/src/index.ts), [packages/label/src/pdf.ts](../packages/label/src/pdf.ts) and [label-export-readiness.ts](../apps/web/src/label-export-readiness.ts). | No legal minimum-size policy, package-size classification, contrast check or printed-proof acceptance is enforced. Overflow checking is not a legibility determination (PACK-001, PACK-004, PACK-005, TR-016; R1-21). |

## Bounded source findings

The provisions below were checked against the Federal Register of Legislation
or the official Victorian legislation register; the applicable compilation or
version is recorded. A source establishing a rule does not establish that it
applies to a particular product.

| Area | Source finding and boundary |
| --- | --- |
| Ingredients | [Standard 1.2.4, sections 1.2.4-3 to -7](https://www.legislation.gov.au/F2015L00392/2025-09-02/2025-09-02/text/original/epub/OEBPS/document_1/document_1.html) and [Schedule 10](https://www.legislation.gov.au/F2015L00480/2021-02-25/2021-02-25/text/original/epub/OEBPS/document_1/document_1.html), compilations effective 2025-09-02 and 2021-02-25: ordering generally follows ingoing weight; permitted names, compound-ingredient options and below-5% treatment have conditions. The compound-name option does not apply to food for infants. This does not decide ingredient identity, processing evidence or exceptions for a specific food. |
| Allergens and advisories | [Standard 1.2.3](https://www.legislation.gov.au/F2015L00397/2024-10-29/2024-10-29/text/original/epub/OEBPS/document_1/document_1.html), effective 2024-10-29, and [Schedule 9](https://www.legislation.gov.au/F2015L00479/2021-02-25/2021-02-25/text/original/epub/OEBPS/document_1/document_1.html), effective 2021-02-25, specify mandatory allergen declarations, presentation and identified advisory triggers. FSANZ [allergen guidance](https://www.foodstandards.gov.au/business/labelling/allergen-labelling), updated 2025-09-30, says voluntary “may contain” statements are not regulated by the Code as PAL statements. The complete vocabulary, exemptions, evidence and product-specific triggers remain to be implemented or reviewed. |
| Name, supplier, lot and legibility | [Standard 1.2.1](https://www.legislation.gov.au/F2015L00386/2026-06-09/2026-06-09/text/original/epub/OEBPS/document_1/document_1.html), effective 2026-06-09, and [Standard 1.2.2](https://www.legislation.gov.au/F2015L00389/2024-07-22/2024-07-22/text/original/epub/OEBPS/document_1/document_1.html), effective 2024-07-22, provide the applicable label-information requirements. Standard 1.2.1-24/-25 addresses general legibility and warning type size; the warning size is not a universal minimum for all text. Product, channel and package exceptions remain unresolved. |
| Date and storage | [Standard 1.2.5](https://www.legislation.gov.au/F2015L00401/2021-06-03/2021-06-03/text/original/epub/OEBPS/document_1/document_1.html), effective 2021-06-03, and [Standard 1.2.6](https://www.legislation.gov.au/F2015L00393/2015-03-31/2015-03-31/text/original/epub/OEBPS/document_1/document_1.html), effective 2016-03-01, establish conditional date-marking and storage/use-direction requirements. They do not establish an individual food's shelf life, date type or safety directions. |
| Quantity marking | [National Trade Measurement Regulations 2009](https://www.legislation.gov.au/F2009L03479/2024-03-20/2024-03-20/text/original/epub/OEBPS/document_1/document_1.html), compilation F2024C00311 effective 2024-03-20: regulation 4.9 requires a statement of the product's measurement; it does not prescribe the word “net”. Regulations 4.10-4.13 set placement, form, size and unit rules. For contrasted stamped/printed marking under 4.12(2)(a), regulation 4.12(3) sets character heights of 2.0, 2.5, 3.3 or 4.8 mm by maximum package dimension; embossing and approved printing-device routes differ. Regulation 4.29 restricts expressions that are not required or permitted and relate to or qualify a marked measurement; regulation 4.28(2)(b)(iii) expressly refers to net mass in a specific transport-package exception. The checked provisions do not settle whether “net” is permitted on an ordinary label. Keep R1-20 and TR-021 review-only; do not encode the owner's wording preference as law. |
| Victorian context | The official [Food Act 1984 (Vic), version 119](https://www.legislation.vic.gov.au/in-force/acts/food-act-1984/119) ([authorised text](https://content.legislation.vic.gov.au/sites/default/files/2026-07/84-10082a119.docx)), effective 2026-07-01, provides in s 16(1)-(4) for compliance with Code requirements and prohibits specified non-compliant sales/labels; s 20(1B) permits a council to appoint authorised officers. This statutory context does not establish which authority principally performs enforcement in practice. No such claim is made here. |

## Prioritized follow-on sequence

1. **UXR21 — Ingredient declaration:** complete source-backed names, order,
   compound ingredients, additive candidates and missing-input explanations.
   Keep uncertain cases review-only (TR-003, ADD-009, FORM-005; R1-01 to R1-05).
2. **UXR22 — Allergen declarations:** implement supported names, emphasis,
   exemptions, summary placement and evidence paths; keep precautionary
   statements separate from mandatory declarations (TR-004, TR-019; R1-06 to
   R1-10).
3. **UXR23 — Remaining pack content:** reconcile supplier/packer identity,
   lot, quantity, date, storage, warning triggers and physical layout. Keep
   applicability, adequacy, exemptions and print proof explicit rather than
   inferred (TR-002, TR-007, TR-008, TR-016, TR-021, PACK-001, PACK-004,
   PACK-005; R1-17 to R1-21).

UXR20 meets its exit criteria by separating stored inputs, assembled draft
content and actual checks, recording source and applicability boundaries, and
setting a traceable implementation order. It does not implement UXR21-UXR23,
resolve the open reviewer questions, or establish that a label is legally
compliant.
