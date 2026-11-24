# ADR 018: Evidence-backed nutrient retention and yield

Status: **Accepted for N6, 2026-11-17**.
Requirements: CALC-002, CALC-003, CALC-015, DATA-003, DATA-005, DATA-006.

## Australian sources and limits

The Australian Food Requirements Analyst checked the following primary
sources on 17 November 2026:

- The [Australia New Zealand Food Standards Code, Standard 1.2.8](https://www.legislation.gov.au/F2015L00395/2026-04-30/2026-04-30/text/original/epub/OEBPS/document_1/document_1.html),
  compilation F2026C00411, defines average quantity for foods from the
  producer or manufacturer and sets nutrition information requirements.
  The provisions reviewed do not prescribe a general cooking-retention
  method or factors. This is not a finding about every possible provision.
- [FSANZ Nutrition Panel Calculator calculations](https://www.foodstandards.gov.au/sites/default/files/2026-07/Calculations%20in%20the%20NPC.pdf)
  describe a weight-change adjustment. That adjustment changes concentration;
  weight change alone does not establish nutrient retention.
- [FSANZ AUSNUT 2023 data files](https://www.foodstandards.gov.au/science-data/food-nutrient-databases/ausnut/data-files)
  describe retention factors used in recipe calculations to account for
  nutrient losses. This is food-composition methodology, not a prescribed
  Code rule or a finding that a particular factor fits a user's recipe.
- [FSANZ guidance on creating a nutrition panel](https://www.foodstandards.gov.au/sites/default/files/2026-07/How%20to%20create%20a%20NIP.pdf)
  describes limitations for cases including frying and sodium uptake.

No Victoria-specific formula was identified in this bounded check. Source
applicability, appropriate estimation methods and declared average values for
a particular product still need review; these sources do not certify them.

## Decision

- Direct finished-food values and estimated values from retention are
  alternative, optional methods. Neither is required when the recorded
  recipe and process already support the existing unprocessed calculation.
- The retention route accepts a separately sourced and dated percentage for
  each nutrient. It must describe the percentage of that nutrient originally
  in the **whole recipe** which remains in the finished batch, for the
  applicable nutrient form and recorded processing. Ingredient-specific or
  apparent-retention factors must not automatically be treated as whole-batch
  factors. No factors are supplied or selected automatically.
- For a supported nutrient, the estimated amount per 100 g of finished food is
  its ingoing amount per 100 g multiplied by starting batch mass, multiplied by
  the retained fraction, and divided by finished batch mass. Both weights are
  derived from recorded recipe and processing information. Percentages from
  zero to 100 are supported; evidence of nutrient gain, additions during
  processing, and processed nested recipes remain review cases.
- All relevant ingredient values, nutrient forms, final weight, source,
  date and explicit confirmation are needed. Missing or incompatible values
  do not become zero. A recipe snapshot invalidates confirmation if relevant
  inputs change; the existing product as-sold confirmation remains required.
  Sources, the factor and both weights appear in the trace.
- Energy is not inferred from nutrient retention percentages. A separately
  entered, confirmed finished-food energy value for the same recipe can be
  used alongside retention estimates; otherwise energy remains unavailable.
  Additional retained nutrients appear in trace, not automatic label rows.
- The selection does not discard values entered for the alternative method.
  Additive and ingredient-declaration processing safeguards are unchanged.

## Outside this decision

Ingredient-specific factor application, apparent retention, nutrient gains,
chemical-form conversion, consumer preparation, draining and validation of
particular evidence remain outside this supported route. No new legal rule or
automatic factor is introduced, and all results remain drafts requiring review.
