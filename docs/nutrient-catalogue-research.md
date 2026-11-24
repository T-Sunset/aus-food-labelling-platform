# Nutrient catalogue research

**Status:** Bounded primary-source research for N2, 17 November 2026.
Documentation only; not a regulatory release, legal advice or certification.
Requirements: ING-002, DATA-003, DATA-006, CALC-010 and CALC-012.

## Scope and sources

The Australian Food Requirements Analyst checked the Federal Register of
Legislation (FRL) texts below on 17 November 2026. Provision mapping identifies
the text read; it is not reviewer approval. Recheck applicable compilations,
transitions and product-specific requirements before implementing rules.
The source lists serve different purposes: none is a complete catalogue for
every food, calculation, label and claim.

| Source | Compilation checked | Relevant text |
| --- | --- | --- |
| [Standard 1.2.8 - Nutrition information requirements](https://www.legislation.gov.au/F2015L00395/2026-04-30/2026-04-30/text/original/epub/OEBPS/document_1/document_1.html) | F2026C00411, effective 30 April 2026 | 1.2.8-3 to -10, -14; transition table |
| [Schedule 12 - Nutrition information panels](https://www.legislation.gov.au/F2015L00482/2017-04-13/2017-04-13/text/original/epub/OEBPS/document_1/document_1.html) | F2017C00342, effective 13 April 2017 | S12-2 to S12-7 |
| [Schedule 11 - Calculation of values for NIP](https://www.legislation.gov.au/F2015L00481/2024-10-29/2024-10-29/text/original/epub/OEBPS/document_1/document_1.html) | F2024C01138, effective 29 October 2024 | S11-2 to S11-4 |
| [Schedule 1 - RDIs and ESADDIs](https://www.legislation.gov.au/F2015L00491/2018-11-29/2018-11-29/text/original/epub/OEBPS/document_1/document_1.html) | F2018C00960, effective 29 November 2018 | S1-2 to S1-5 |
| [Standard 1.1.2 - Definitions](https://www.legislation.gov.au/F2015L00385/2026-06-09/2026-06-09/text/original/epub/OEBPS/document_1/document_1.html) | F2026C00526, effective 9 June 2026 | 1.1.2-9, -10 and -14 |
| [Standard 1.3.2 - Vitamins and minerals](https://www.legislation.gov.au/F2015L00400/2021-03-26/2021-03-26/text/original/epub/OEBPS/document_1/document_1.html) | F2021C00320, effective 26 March 2021 | 1.3.2-2 to -8 |
| [Schedule 17 - Vitamins and minerals](https://www.legislation.gov.au/F2015L00449/2026-04-30/2026-04-30/text/original/epub/OEBPS/document_1/document_1.html) | F2026C00405, effective 30 April 2026 | S17-2 and S17-3; S17-4 not read in N2 |
| [Standard 2.9.2 - Food for infants](https://www.legislation.gov.au/F2015L00417/2024-09-13/2024-09-13/text/original/epub/OEBPS/document_1/document_1.html) | F2024C00903, effective 13 September 2024 | 2.9.2-10 to -12 |

These are Australian Code research references, not verified permissions for
particular foods. N2 did not fully review Schedule 4, Schedule 13, Schedule
29, the formulated caffeinated beverage standard, all special-purpose food
standards or all current/future amendments. See the gaps below. Food states
are addressed separately in [food-state nutrition research](./food-state-nutrition-research.md).

## General nutrition panel: base and conditional entries

Where a general-food NIP is required, Standard 1.2.8-6(1)(d) and Schedule
12 S12-2 provide the following base information for a serving and a unit
quantity (100 g for solid/semi-solid food or 100 mL for liquid food). This is
not a universal list for every product: applicability, exemptions and
product-specific rules must first be established.

| Entry | Unit under 1.2.8-6(1)(d) | Source / mapping |
| --- | --- | --- |
| Energy | kJ, or both kJ and kcal | 1.2.8-6(1)(d)(i); S11-2; Provision |
| Protein | g | 1.2.8-6(1)(d)(ii)(A); Provision |
| Fat, total | g | 1.2.8-6(1)(d)(ii)(A); Provision |
| Saturated fatty acids, labelled saturated fat | g | 1.2.8-6(1)(d)(ii)(B), -7(8); Provision |
| Carbohydrate | g | 1.2.8-6(1)(d)(ii)(A); Provision |
| Sugars | g | 1.2.8-6(1)(d)(ii)(A), -4; Provision |
| Sodium | mg, or both mg and mmol | 1.2.8-6(1)(d)(iii); Provision |

Standard 1.2.8-6(1)(d)(ii)(B) is subject to subsection (4); the earlier
[NIP display research](./nip-display-research.md) records the unresolved
cross-reference interpretation. Food for infants has an explicit
saturated-fat exception, below. The kcal conversion equation is embedded as
an image in the FRL text and was not transcribed here.

Other nutrients and biologically active substances may be relevant. The
following are **conditional**, not automatically required just because a
value has been entered. The trigger summaries are not a full rule
implementation; all rows map to Standard 1.2.8-6 at Provision level.

| Trigger or role | Entries | Source |
| --- | --- | --- |
| Claim requiring nutrition information about another nutrient or biologically active substance | That nutrient or substance; g, mg, micrograms or other units as appropriate | 6(1)(d)(iv) |
| Claim about cholesterol, specified fatty acids or omega-3, -6 or -9 | Trans, polyunsaturated and monounsaturated fat; S12-3 presents these in g | 6(3); S12-3 |
| Claim about fibre, a named fibre, sugars or another type of carbohydrate | Dietary fibre, including an explicit `0` if absent; S12-3 presents g | 6(5)-(6); S12-3 |
| Unavailable carbohydrate subtracted in available carbohydrate by difference | Unavailable carbohydrate excluding dietary fibre | 6(7)-(8) |
| Relevant S11-2(3) substances, excluding organic acids, reach 5 g/100 g singly or combined, and the specified calculation conditions are met | Individual declarations of those substances | 6(9) |
| Claim about phytosterols, phytostanols or their esters | Substances and amount as total plant sterol equivalents | 6(10) |
| Claim about lactose | Galactose | 6(11) |
| Claim about salt or sodium | Potassium | 6(12) |
| Claim about omega-3 | Each specified type (alpha-linolenic acid, DHA, EPA or a combination) and total omega-3 | 6(13) |

For these additional entries, use the actual applicable provision and
Schedule 12 rather than assuming a single legal unit for every nutrient.
Section 1.2.8-7(6), for example, provides an optional less-than form in mg
for potassium; it is not evidence that every additional nutrient uses mg.
The prescribed dietary-fibre analytical methods are in S11-4. Known zero,
not detected, unavailable and unknown evidence must not be conflated.

Standard 1.1.2-9 distinguishes information required in a panel from
permitted voluntary information: the latter can itself be a nutrition
content claim, subject to the stated exceptions, including trans fat,
lactose and dietary fibre below 2 g per serving. Other exclusions and
conditions also apply. Capturing a nutrient as ingredient evidence does not
by itself decide whether it belongs on a label or whether a claim is
permitted. Claim evaluation remains future work.

## Schedule 1 vitamins and minerals

The following is the complete S1-2/S1-3 list as checked, not all nutrients
that may be recorded or declared. RDI means recommended dietary intake;
ESADDI means estimated safe and adequate daily dietary intake. Values below
are reference amounts, **not** per-100 g amounts, legal minimum contents,
fortification permissions or automatically applicable claims. Standard
1.1.2-10 determines the relevant column: general foods, food represented
as suitable for children aged 1-3 years, or food for infants. The infant
iron entry has an additional age distinction.

| Vitamin and reference kind | Expression form and unit in Schedule 1 | General | 1-3 years | Infants | Source / mapping |
| --- | --- | ---: | ---: | ---: | --- |
| Vitamin A, RDI | micrograms retinol equivalents | 750 | 300 | 300 | S1-2, S1-4; Provision |
| Thiamin (B1), RDI | mg thiamin | 1.1 | 0.5 | 0.35 | S1-2; Provision |
| Riboflavin (B2), RDI | mg riboflavin | 1.7 | 0.8 | 0.6 | S1-2; Provision |
| Niacin, RDI | mg niacin, excluding conversion from tryptophan | 10 | 5 | 3 | S1-2; 1.1.2-14(3)(b); Provision |
| Folate, RDI | micrograms | 200 | 100 | 75 | S1-2; Provision |
| Vitamin B6, RDI | mg pyridoxine | 1.6 | 0.7 | 0.45 | S1-2; Provision |
| Vitamin B12, RDI | micrograms cyanocobalamin | 2.0 | 1.0 | 0.7 | S1-2; Provision |
| Biotin, ESADDI | micrograms biotin | 30 | 8 | 6 | S1-2; Provision |
| Pantothenic acid, ESADDI | mg pantothenic acid | 5.0 | 2.0 | 1.8 | S1-2; Provision |
| Vitamin C, RDI | mg total L-ascorbic and dehydro-ascorbic acid | 40 | 30 | 30 | S1-2; Provision |
| Vitamin D, RDI | micrograms cholecalciferol | 10 | 5 | 5 | S1-2; Provision |
| Vitamin E, RDI | mg alpha-tocopherol equivalents | 10 | 5 | 4 | S1-2, S1-5; Provision |
| Vitamin K, ESADDI | micrograms phylloquinone | 80 | 15 | 10 | S1-2; Provision |

| Mineral and reference kind | Unit in Schedule 1 | General | 1-3 years | Infants | Source / mapping |
| --- | --- | ---: | ---: | ---: | --- |
| Calcium, RDI | mg | 800 | 700 | 550 | S1-3; Provision |
| Chromium, ESADDI | micrograms | 200 | 60 | 40 | S1-3; Provision |
| Copper, ESADDI | mg | 3.0 | 0.8 | 0.65 | S1-3; Provision |
| Iodine, RDI | micrograms | 150 | 70 | 60 | S1-3; Provision |
| Iron, RDI | mg | 12 | 6 | 9 from 6 months; 3 under 6 months | S1-3; Provision |
| Magnesium, RDI | mg | 320 | 80 | 60 | S1-3; Provision |
| Manganese, ESADDI | mg | 5.0 | 1.5 | 0.8 | S1-3; Provision |
| Molybdenum, ESADDI | micrograms | 250 | 50 | 30 | S1-3; Provision |
| Phosphorus, RDI | mg | 1,000 | 500 | 300 | S1-3; Provision |
| Selenium, RDI | micrograms | 70 | 25 | 15 | S1-3; Provision |
| Zinc, RDI | mg | 12 | 4.5 | 4.5 | S1-3; Provision |

Section 1.2.8-9 concerns percentage **RDI** declarations in the specified
claim circumstances; do not treat an ESADDI as an RDI. Sodium and potassium,
for example, have NIP roles but are not in the Schedule 1 tables. The
Schedule 1 expression unit is not, by itself, a universal NIP-unit rule.

### Forms and equivalence

Under 1.1.2-14, the vitamin or mineral amount includes relevant naturally
occurring and permitted added forms, calculated and expressed in the
specified form. Vitamin A and E require particular equivalents; niacin
excludes that derived from tryptophan conversion. Do not equate all chemical
forms, or assume a value in one form already represents another.

S1-4 specifies provitamin A conversion factors in **micrograms of the form
per 1 microgram retinol equivalent**: beta-apo-8'-carotenal 12; synthetic
beta-carotene 6; natural carotenes 12; beta-apo-8'-carotenoic acid ethyl
ester 12. S1-5 specifies vitamin E factors in **micrograms of the form per
1 microgram alpha-tocopherol equivalent**: dl-alpha-tocopherol 1.36;
d-alpha-tocopheryl acetate 1.10; dl-alpha-tocopheryl acetate 1.49;
d-alpha-tocopheryl acid succinate 1.23. Other listed vitamin E concentrates
use a factor determined by their composition. Both tables note that natural
forms may have factors not supplied there. Missing form or factor evidence
must remain unresolved; do not guess a conversion.

Schedule 17 S17-2 and S17-3 separately list permitted **added forms** for
specified uses, including multiple forms of vitamins A, B1, B2, niacin,
folate, B6, B12, pantothenic acid, C, D and E, and of calcium, iron, iodine,
magnesium, phosphorus, selenium and zinc. Consult the source for exact forms
and conditions. These tables do not establish that an added form is permitted
in any particular food: Standard 1.3.2-3 also requires the applicable food
and amount conditions unless the Code provides otherwise. S17-4 and other
food-specific permissions were not verified in N2. An entry absent from
S17-2/S17-3 is not thereby absent from food or forbidden from being labelled.

## Other calculation inputs and product-specific entries

Schedule 11 S11-2 and S11-3 identify calculation components distinct from
automatic label rows:

- General energy components: alcohol, available carbohydrate, unavailable
  carbohydrate including dietary fibre, fat and protein.
- Specific components: D-allulose, erythritol, glycerol, isomalt, lactitol,
  maltitol, mannitol, organic acids, polydextrose, sorbitol, D-tagatose and
  xylitol. Specific factors are in S11-2(3); do not apply a generic factor
  without the applicable method.
- Available carbohydrate calculation refers to available sugars, starch and,
  when quantified or added, available oligosaccharides, glycogen and
  maltodextrins. The by-difference method uses water, protein, fat, dietary
  fibre, ash, alcohol and the other specified substances. Identity,
  overlapping categories and method matter; avoid double counting.

The definition of sugars in 1.2.8-4 in the checked compilation excludes
D-allulose. Its amendment history identifies separate variations:
F2024L01376 replaced the definition, and F2024L01377 added the D-allulose
exclusion. The application table describes a P1063 transition for specified
variations in F2024L01376 from 29 October 2024 to 29 October 2028 and a
post-transition stock period to 30 October 2030, subject to conditions. Do
not assume that this establishes the transition treatment of the separate
D-allulose variation. The applicable definition and both instruments'
transition effects must be checked before calculating or labelling.

For **food for infants**, Standard 2.9.2-11 removes specified general
requirements, including the saturated-fat row and certain claim-triggered
requirements, and requires the S12-6 format. Dehydrated or concentrated
infant food has its own reconstitution provision in 2.9.2-12. Its applicable
transition and other nutrition rules require assessment. Infant formula
products are different and outside Standard 1.2.8; their own Standard was
not reviewed here.

Schedule 12 S12-5 illustrates a formulated caffeinated beverage NIP and a
separate composition-information block naming caffeine, thiamin,
riboflavin, niacin, B6, B12, pantothenic acid, taurine, glucuronolactone
and inositol. The example alone does not establish which entries are required
for each product; Standard 2.6.4-5 was not reviewed for N2. The S12-7
chewing-gum calcium example also has its own context.

## Implications and explicit gaps for later steps

- N3 can use this as a source-linked starting catalogue, with identity,
  evidence, basis and units separate from display and claim decisions. Support
  unknown values without silently inventing zeroes; distinguish a recorded
  zero from missing data. Preserve source, form and applicable definition.
- Mass-unit conversions must be explicit; micrograms need support alongside
  mg and g. A mass-to-volume conversion needs reliable density. A chemical
  form or equivalence conversion needs the applicable factor and evidence;
  ordinary unit conversion alone cannot establish equivalence.
- Schedule 1 is complete only for its RDI/ESADDI tables, not for all
  nutrients. Amino acids, other fatty acids, individual sugars, added sugars,
  choline, other minerals, biologically active substances and product-specific
  entries need their own source and definition mapping before deterministic
  labelling or claim use. Ingredient-entry support is not proof of permission.
- Full Schedule 4 and Standard 1.2.7 claim conditions, Schedule 13
  small-package particulars, Schedule 17 food/amount permissions,
  Schedule 29 and other special-purpose standards are **TO BE RESEARCHED**
  for the affected functionality. No claim or fortification permission is
  established by this catalogue.
- The P1063 historical/transition choice, infant-food transition effects,
  nutrient form equivalences beyond the tables above, the kcal equation,
  evidence sufficiency and the 1.2.8-6(4) cross-reference require further
  verification or interpretation before their respective automation.
- N2 changes no application calculations, stored data, label rows or release
  gates. Missing evidence and unsupported contexts remain **REVIEW REQUIRED**,
  not a PASS or a guessed result.
