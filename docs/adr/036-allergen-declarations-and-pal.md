# ADR 036: Allergen declarations and precautionary statements

Status: **Implemented for draft review, 2026-11-20**.
Requirements: TR-004, TR-019, DATA-003, TRACE-008.

## Context

UXR22 adds allergen content to a label draft without representing that the
draft is legally compliant. Standard 1.2.3 and Schedule 9 define
context-specific names, mandatory declarations, exceptions and formatting.
The source review used Standard 1.2.3 compilation F2024C01143 (C06, effective
2024-10-29) and Schedule 9 compilation F2021C00195 (C02, effective
2021-02-25). Recheck the Federal Register before activating or relying on
regulatory decisions.

FSANZ states that precautionary allergen labelling (PAL) is voluntary and is
not regulated by the Code. The Allergen Bureau's VITAL Program treats
“May be present” as a risk-assessment outcome, not a blanket default. FIGAML
Version 3 F1 (December 2024) likewise describes PAL in the context of
established possible cross-contact and risk assessment.

## Decision

- Keep the ingredient-list name and other-declaration/summary name as
  separate rule-data values. Map each positive allergen source path to its
  ingredient declaration; append the required ingredient-list name when it
  is not already in the saved name, and bold the exact required name.
- Generate one `Contains` summary from resolved evidence only. It contains
  only `Contains` and the required summary names, is bold, uses the ingredient
  text size, and follows the ingredient statement as a distinct adjacent block
  in the same preview. A preview is not a physical print or field-of-view
  proof.
- Do not infer absence from incomplete evidence. Unknowns, conflicts, possible
  exemptions, missing ingredient paths and unresolved final-food conditions
  withhold the `Contains` summary and remain `REVIEW REQUIRED`.
- A compound may derive its parent allergen-coverage status from explicitly
  complete supplier-composition coverage only when it has no separate
  allergen-evidence or additive-source records. Every included component must
  still have current allergen coverage; parent-specific evidence or additive
  sources are resolved separately rather than bypassed by composition status.
- Require wheat to be listed independently of gluten status. Add “gluten” to
  the summary only when wheat is recorded as containing gluten. The ingredient
  workflow makes the conditional barley/oats/rye choice explicit; a selected
  cereal is treated as containing gluten. Added sulphites remain unresolved
  until final-food concentration is evaluated.
- Keep PAL optional and user-entered. Do not generate “May be present” or
  another default. Require both the proposed statement and a user-entered
  basis note; explain unintended cross-contact, that PAL does not replace
  mandatory declarations, and that blank text does not establish absence of
  risk. Render only the statement on the label; preserve the basis in the
  label record and review report. The app does not assess whether PAL is
  warranted or whether entered wording is suitable.
- Do not automate Schedule 9 exemptions in this step. The current allergen
  vocabulary remains draft data, and no allergen output is a compliance
  determination.

## Consequences

Confirmed positive names can appear in the ingredient-list candidate even
when another input prevents a summary. Incomplete evidence and unresolved
conditions are surfaced in the review UI/report, and no complete-looking
`Contains` summary is rendered for those cases. A human must still review
source evidence, exact product applicability, exemptions, print legibility
and package presentation.

Focused tests cover complete-composition parent coverage, context-specific
names, nested paths, wheat gluten status,
conditional cereals, exemption review, missing evidence, final-food
sulphites, bolding, summary adjacency and size, PAL basis validation,
persistence and report guidance.

## UXS9 guidance

The Pack details tab explains accidental cross-contact, gives an illustrative
statement and assessment-basis example, and identifies the basis as review
information rather than label copy. The examples do not populate the fields
or establish that a statement is appropriate. The statement and its basis
remain optional together, with the existing paired validation and unknown-risk
boundary unchanged.

## Sources

- [Standard 1.2.3, F2024C01143](https://www.legislation.gov.au/F2015L00397/2024-10-29/2024-10-29/text/original/epub/OEBPS/document_1/document_1.html)
- [Schedule 9, F2021C00195](https://www.legislation.gov.au/F2015L00479/2021-02-25/2021-02-25/text/original/epub/OEBPS/document_1/document_1.html)
- [FSANZ allergen labelling](https://www.foodstandards.gov.au/consumer/labelling/allergen-labelling) (updated 2025-11-26)
- [Allergen Bureau VITAL Version 4.0 guide](https://vital.allergenbureau.net/wp-content/uploads/2024/08/Food-Industry_Guide_to_VITAL_4.0_2024_F4.pdf)
- [FIGAML Version 3 F1](https://allergenbureau.net/wp-content/uploads/2023/08/Food_Industry_Guide_to_Allergen_Management_and_Labelling_ANZ_December_2024_V3_F1.pdf)
