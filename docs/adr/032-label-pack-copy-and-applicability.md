# ADR 032: Recorded pack copy and unresolved applicability

Status: **Implemented, 2026-11-19; reconciled for UXR23, 2026-11-23**.
Requirements: PACK-005, TRACE-015.

## Context

Label drafts previously could not collect supplier details, lot identification,
date marking, storage instructions or warning/advisory text. Their applicability
depends on product and sale circumstances that the application does not fully
establish. A blank field cannot establish that content is unnecessary, and
user-entered text cannot establish that it is adequate or required.

## Research boundary

The following Federal Register compilations and provisions were checked on
2026-11-19. “Latest” refers to the compilation shown by the Register at access.
This is a bounded check, not an inventory of every product-specific provision.

| Source | Provisions considered |
| --- | --- |
| [Standard 1.2.1, F2026C00538](https://www.legislation.gov.au/F2015L00386/latest) | 1.2.1—6, —8, —9, —12 to —16, —20, —24 and —25 |
| [Standard 1.2.2, F2024C00726](https://www.legislation.gov.au/F2015L00389/latest) | 1.2.2—3 and —4 |
| [Standard 1.2.3, F2024C01143](https://www.legislation.gov.au/F2015L00397/latest) | 1.2.3—2 and —3 |
| [Schedule 9, F2021C00195](https://www.legislation.gov.au/F2015L00479/latest) | S9—2; S9—3 was not mapped |
| [Standard 1.2.5, F2021C00660](https://www.legislation.gov.au/F2015L00401/latest) | 1.2.5—2 to —6 |
| [Standard 1.2.6, F2015L00393](https://www.legislation.gov.au/F2015L00393/latest) | 1.2.6—2 |

The review confirmed that supplier information, lot identification, date
marking, storage directions and warnings have conditional scope and exceptions.
It did not determine applicability for any product, calculate a date or shelf
life, verify any supplier or lot value, or exhaustively map specialised warning
and advisory requirements elsewhere in the Code. Reviewer questions R1-17 to
R1-19 remain open.

## Decision

- Keep these manually entered strings with each named label draft, not in the
  shared Product record. Labels and print runs can carry different copy.
- Capture supplier name and address, lot identification, proposed date marking,
  storage instructions, and warning/advisory text. Reproduce non-empty text in
  the draft preview and include recorded and unentered fields in the review
  report.
- Treat the text as user-entered copy only. Do not generate lot codes, dates,
  warnings or storage wording; do not validate their legal format, adequacy,
  applicability or completeness; and do not treat an empty field as
  non-applicability.
- Include explicit unresolved notes for each field. In particular, date type,
  date basis and shelf life are not determined; supplier and sale-route facts
  are not assessed; warning triggers and warning text size are not checked;
  other product-specific requirements are not comprehensively screened.
- Use the existing additional-pack-text size setting for these blocks. The
  layout remains review-required without an approved minimum-size policy; this
  change does not apply or approve regulatory type-size thresholds.
- Show a plain-language entered/not-entered review summary in the Label
  workspace. Entered text must remain visibly unresolved as to applicability
  and adequacy; not-entered text must not be interpreted as non-applicability.
  Preview pack blocks use field labels, while the review report preserves the
  same boundaries and does not generate legal values or exemptions.
- Keep all output as an Incomplete Review Copy. Entered copy does not change
  rule evaluations, label readiness, release gates or the non-certification
  statement.
- Store the fields as optional label-draft data so older records without them
  remain readable. Preserve them in label updates, duplication and workspace
  backups; validate field types and length limits.

## Consequences

Users can review pack text in the same candidate preview and report without
re-entering it on the Product record. A reviewer must still establish relevant
product, package and sale facts, verify any entered copy, and identify
product-specific requirements not covered by the bounded research. This
decision does not implement a universal warning list or a regulatory
applicability engine.

## 2026-11-23 UXS7 owner decision

Pack copy moves into the dedicated Pack details tab of the agreed
[Label workspace](../implementation-plan.md#uxs7---discuss-the-label-workspace-in-detail).
The prior presentation may be simplified, while entered/not-entered status
and unresolved applicability and adequacy remain accessible. UXS9 adds
illustrative, non-prefilled examples and clearer precautionary-allergen
guidance; it does not generate copy or establish applicability. Storage,
preview and report boundaries above remain unchanged.

## UXS9 implementation

Each pack-copy field explains the information requested and shows an
illustrative example as help, not as a prefilled value. The interface makes
clear that examples may not apply to a particular food and are not added
automatically. Existing validation, storage, preview, report and unresolved
applicability boundaries are unchanged.
