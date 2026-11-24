# UXR13: Practical nutrient-retention research

**Status:** UXR13 research complete. The owner later closed the planned
UXR14-UXR15 label-retention expansion on 2026-11-19; see the updated owner
decision below.
Documentation only. This is not regulatory acceptance, legal advice or
certification.

Requirements: CALC-002, CALC-003, CALC-015 and DATA-005.

## Summary

FSANZ's AUSNUT 2023 files provide a concrete method for calculating selected
nutrient profiles from recipe ingredients: ingredient-specific, nutrient-
specific retention factors are used alongside a separate recipe-level weight
change. Two matched examples, a plain butter cake and a homemade chocolate
chip biscuit, were reconstructed from the official recipe, retention-factor
and food-profile workbooks. Selected values reproduce the published profiles
within their displayed rounding.

This is evidence that a narrow ingredient/process calculation can be
reproduced. It is not evidence that the factors fit every cake, cookie or
user recipe. FSANZ says the evidence base for AUSNUT weight-change factors is
limited and they should be regarded as indicative only. The files serve a
dietary-intake survey; they do not prescribe a Food Standards Code method or
establish a manufacturer's product composition.

The current [ADR 018](./adr/018-nutrient-retention.md) remains unchanged. It
accepts separately sourced and dated **whole-recipe** retention percentages,
not automatic application of ingredient-specific factors. The owner initially
selected a whole-recipe-only follow-on research scope, then closed UXR14-UXR15
after deciding that ingoing recipe nutrients and quantities are the general
calculation method for ordinary NIP cases where they best represent average
quantities. No automatic factor dataset or label-workflow integration is
planned. Ingredient-specific AUSNUT factors remain out of scope. AUSNUT 2023
reuse terms remain unclear, so the data must not be redistributed or bundled.

## Sources checked

Sources were accessed on 2026-11-19. Workbook row numbers below refer to the
downloaded official files.

| Source | Relevant information |
| --- | --- |
| [AUSNUT 2023 data files](https://www.foodstandards.gov.au/science-data/food-nutrient-databases/ausnut/data-files) | FSANZ describes the food nutrient profiles, recipe ingredients and retention-factor files and says the first worksheet in each file contains further information. Page last updated 25 March 2026. |
| [AUSNUT 2023 - About the foods and nutrients (PDF)](https://www.foodstandards.gov.au/sites/default/files/2025-08/AUSNUT%202023%20-%20About%20the%20foods%20and%20nutrients.pdf?v=20250829) | Recipe calculation method and dataset limitations, especially PDF pp. 4-6 (printed pp. 3-5). |
| [Food nutrient recipes workbook](https://www.foodstandards.gov.au/sites/default/files/2025-08/AUSNUT%202023%20-%20Food%20nutrient%20recipes.xlsx?v=20250829) | Recipe ingredients, ingredient weights, retention-factor names and total recipe weight changes. |
| [Nutrient retention factors workbook](https://www.foodstandards.gov.au/sites/default/files/2025-08/AUSNUT%202023%20-%20Nutrient%20retention%20factors.xlsx?v=20250829) | Nutrient-specific factor values, including factor IDs 40, 46, 66 and 122 used below. |
| [Food nutrient profiles workbook](https://www.foodstandards.gov.au/sites/default/files/2025-09/AUSNUT%202023%20-%20Food%20nutrient%20profiles.xlsx?v=20250903) | Ingredient profiles and published recipe profiles, expressed per 100 g. |
| [FSANZ Data User Licence Agreement](https://www.foodstandards.gov.au/science-data/monitoringnutrients/afcd/datauserlicenceagreement) | Describes an Attribution-ShareAlike 3.0 Australia licence for the defined food-composition database works. Its definitions name AUSNUT 2007 and 2011-13, but do not clearly identify AUSNUT 2023. |
| [FSANZ copyright](https://www.foodstandards.gov.au/legal-policies/copyright) | General website material is CC BY 4.0 unless otherwise stated; third-party material is excluded. This does not resolve the AUSNUT 2023 workbook terms. |

The workbook first tabs describe their data fields and link to the methodology;
they did not resolve which reuse licence applies to AUSNUT 2023. No permission
to bundle or adapt the workbook data is inferred here.

## What the sources establish

- AUSNUT 2023 supports the 2023 National Nutrition and Physical Activity
  Study. Recipe calculations were commonly used for mixed dishes and baked
  foods including cakes, biscuits and slices. FSANZ says recipe choices were
  streamlined and, for traditional recipes, somewhat subjective because
  ingredients and preparation vary (methodology PDF pp. 2-5).
- FSANZ says retention factors are applied to recipes to account for nutrient
  losses during preparation or cooking. The 2023 factors were carried over
  from AUSNUT 2011-13 because no significant new data sources had become
  available (methodology PDF p. 5).
- Recipe weight change is a separate adjustment. AUSNUT 2023 weight-change
  factors were based on the 2011-13 dataset and updated for internal
  consistency; some were adjusted to bring recipe moisture closer to a
  comparable analysed food. FSANZ explicitly says the evidence base is
  limited and these weight-change factors are **indicative only** (methodology
  PDF p. 6).
- The workbook separates each food's recipe ingredients and weight change
  from the nutrient retention-factor table. In the reconstructed examples,
  ingredient contributions are adjusted by the named nutrient-specific
  factors, then expressed per 100 g of the recipe's final weight. This
  arithmetic reproduces the selected published profile values; it is not a
  claim to have reproduced every internal AUSNUT calculation or validated
  these factors for a different product.
- The reviewed provisions recorded in ADR 018 do not prescribe a general
  cooking-retention method. That bounded legal-source finding is not
  exhaustive and does not make AUSNUT a legal method.

## Worked examples

The "uncooked mixture" is a calculated contrast made from the same
ingredients, before applying recipe weight change or retention factors. It is
not a separate measured or published food profile. The reconstructed values
below use the ingredient profiles in the AUSNUT 2023 Food nutrient profiles
workbook, the recipe and factor rows in their respective workbooks, and
standard per-100-g arithmetic. Differences from published profile values are
within the workbook's displayed precision for the selected nutrients.

### Homemade plain butter cake

Recipe **F002171**, survey ID **13302026**, “Cake, plain butter cake,
homemade, uniced,” is in recipe rows 1312-1317. Its ingredient weights total
825 g and its recipe weight change is -10%, giving 742.5 g final weight.
Ingredient profiles are not all direct analyses: the inputs include recipe-
derived butter and milk profiles and a borrowed vanilla profile.

| Measure (per 100 g) | Uncooked ingredient mixture | Reconstructed baked profile | Published AUSNUT profile |
| --- | ---: | ---: | ---: |
| Energy with dietary fibre (kJ) | 1382.25 | 1535.84 | 1536 |
| Thiamin (mg) | 0.09662 | 0.08522 | 0.085 |
| Moisture (g) | 31.84 | 24.27* | 24.3 |

For thiamin, the recipe names flour/baked, fat or oil/cooked, eggs/baked and
milk/heated for approximately one hour. The corresponding factor values are
0.8 (ID 66), 1.0 (ID 46), 0.8 (ID 40) and 0.6 (ID 122). Sugar and vanilla
have no retention-factor name in this recipe. Applying those listed factors
to ingredient thiamin amounts gives approximately 0.63275 mg in the batch;
dividing by 742.5 g and multiplying by 100 gives 0.08522 mg/100 g.

The ingredient energy totals approximately 11,403.6 kJ. No energy factor is
listed for these recipe-factor groups. Dividing that total by 742.5 g yields
1535.84 kJ/100 g, matching the published value after rounding. Thus energy
concentration rises in this example because final mass is lower; the
calculation does not apply the thiamin retention percentage to energy.

### Homemade chocolate-chip biscuit

Recipe **F001174**, survey ID **13105003**, “Biscuit, sweet, chocolate chip,
homemade,” is in recipe rows 1006-1010. Its ingredient weights total 815 g
and its recipe weight change is -6%, giving 766.1 g final weight. The
ingredient profiles include an analysed chocolate profile and an analysed
flour and egg profile, plus a recipe-derived butter profile.

| Measure (per 100 g) | Uncooked ingredient mixture | Reconstructed baked profile | Published AUSNUT profile |
| --- | ---: | ---: | ---: |
| Energy with dietary fibre (kJ) | 1821.75 | 1938.04 | 1938 |
| Thiamin (mg) | 0.08509 | 0.07490 | 0.075 |
| Moisture (g) | 11.83 | 6.18* | 6.2 |

The recipe names the same flour, fat and egg factor groups as the cake. Their
thiamin factors are 0.8, 1.0 and 0.8 respectively. Sugar and chocolate have
no retention-factor name in this recipe. Applying the named factors and
dividing by the final recipe mass reproduces the published thiamin value
within its displayed precision.

As with the cake, no energy factor is listed for these recipe-factor groups.
The ingredient energy total divided by 766.1 g yields 1938.04 kJ/100 g,
matching the published profile after rounding. The apparent per-100-g energy
increase is a concentration change from the lower final mass, not evidence
that cooking created energy.

*For these records, subtracting the recipe's mass decrease from the summed
ingredient moisture yields approximately 24.27 g/100 g for cake and 6.18
g/100 g for biscuit, matching the published moisture values after rounding.
This is an observed reconstruction of these AUSNUT profiles, not a general
rule that all cooking weight loss is water.

## Inputs, provenance and boundaries

Reconstructing these examples depended on all of the following:

- Ingredient identity and mass, plus a nutrient profile on a compatible
  basis and in compatible units. AUSNUT ingredient profiles may themselves
  be analysed, recipe-derived, borrowed or estimated; their derivation
  affects how directly the resulting value represents a particular product.
- A named preparation/cooking factor for the applicable ingredient and
  nutrient, if one is assigned in the source recipe. The factors are
  ingredient/process-specific and nutrient-specific, not whole-recipe
  percentages.
- The recipe's separate weight-change value and final mass basis.
- Source file, version, record IDs, factor names and factor values, and the
  calculation path. If these facts are absent, mismatched or contradictory,
  do not infer a factor or convert unknown values to zero.

The records illustrate only selected home-baked cake and biscuit recipes.
They do not establish factors for all recipes, brands, ovens, baking
temperatures, batch sizes or ingredient substitutions. This research did not
work examples for frying, boiling, grilling, roasting meat, vegetable
cooking, draining, reconstitution, nutrient gains, ingredient additions
during cooking, or chemical-form changes. Those cases remain outside the
proposed pilot.

The energy observation is limited to the two reconstructed records and the
listed retention-factor table: the values are reproduced without an energy
retention factor, using ingredient energy and adjusted recipe mass. It does
not justify applying a generic energy rule to other foods. Consistent with
ADR 018, the program must not infer energy from nutrient-retention
percentages; a separately supported finished-food energy value is needed
where the selected calculation route requires one.

## Offline availability and reuse

The three workbooks can be downloaded from FSANZ and processed locally, so
offline calculation is technically possible after obtaining the data. A
locally bundled copy would need a source/version record and an update
strategy. However, the available FSANZ licence pages do not clearly resolve
whether AUSNUT 2023 is covered by the CC BY-SA 3.0 Australia data licence or
by the general CC BY 4.0 website terms. The latter excludes third-party
material. Distribution of a data-derived work may also invoke share-alike,
attribution, limitation-of-data, Australian-data and third-party conditions.

Before any AUSNUT data or derived factor table is embedded or redistributed,
obtain written clarification from FSANZ and legal review of the proposed
commercial/offline distribution model. Until then, do not bundle the
workbooks or treat the general copyright notice as clearance.

## Owner decision and follow-on scope

On 2026-11-19, the owner initially selected **whole-recipe-only** retention
research for UXR14. Later that day, following consultation, the owner directed
that UXR14-UXR15 label-retention expansion be closed. The general product
method for ordinary NIP cases is to calculate nutrient quantities from the
recipe ingredients and their ingoing amounts where this best represents the
average quantity. This is an owner-selected product policy consistent with
the ingredient-calculation method permitted by Code Standard 1.1.1-6(2)-(3);
it is not a claim that the Code universally mandates raw/as-added display
values or that processing changes never matter. The Victorian application
was checked in [Food Act 1984 (Vic), version 119, section 16](https://www.legislation.vic.gov.au/in-force/acts/food-act-1984/119).

The resulting boundary is:

1. Do not pursue or implement an automatic whole-recipe retention-factor
   dataset or integrate retention estimates into the NIP workflow.
2. Keep the existing optional direct finished-food and manual/whole-recipe
   retention routes and their safeguards unchanged under ADR 018.
3. Continue to handle Code-triggered food states, including reconstituted,
   drained and prepared/consumed-with-another-food cases, under the applicable
   provisions. See [food-state nutrition research](./food-state-nutrition-research.md).
4. Do not treat this decision as regulatory approval, a claim of compliance,
   or permission to apply ingredient-specific AUSNUT factors. The AUSNUT 2023
   reuse terms also remain unresolved.
