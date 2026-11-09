# Questions for the food-regulatory reviewer

**Purpose:** settle the interpretation points that the software cannot decide for itself, in the order the build needs them. Answers become rule data, test fixtures and requirement updates.
**How to use:** each touchpoint (R1 to R6) matches `docs/implementation-plan.md` section 10. Record the answer, the provision relied on and the date under each question. Items marked **BLOCKING** stop engine or rule work until answered. Statements in the questions marked "draft says" come from `docs/requirements.md` and are not yet verified against primary text.
**What helps most:** real supplier specifications, three to five real labels and their recipes, and any worked NIP calculations you consider correct.

Answer format for each item: `Answer / provision / date / follow-up`. Leave `(pending)` until answered.

## R1 - Before the engine is built (plan step P0-6)

### Ingredient declaration

- **R1-01 BLOCKING - Nested compound ingredients.** When a compound ingredient itself contains compound ingredients, what must the ingredient list show, and to what depth? The draft says to flatten for declaration while preserving the hierarchy; that is unverified.
  - Why: decides the declaration generator and its REVIEW REQUIRED cases (requirements 4.3).
  - Answer: This situation is rare, but can happen. There is a convention that, on the outer layer, you use a square bracket([]), then the next one, a round bracket (()), and then the next layer, square brackets again, as far as the depth goes. Not strictly law, but that's the convention for the ingredient declaration for visibility.
- **R1-02 BLOCKING - Small compound ingredients.** The draft refers to a threshold below which components of a compound ingredient need not be listed, except allergens and additives. Confirm the threshold, what it is a percentage of, and the exceptions.
  - Why: fixture "compound ingredient below 5%" (requirements 12.2).
  - Answer: Put simply, if a compound ingredient makes up less than 5% of the whole, then you don't have to declare the sub-ingredients, unless it contains an allergen, where the allergen must be declared. OR, if it has a component within it, that performs a technological function within it that affects the final product. 
- **R1-03 BLOCKING - Ingoing weight, water and volatiles.** Which mass stage should ordering use by default (as added, after processing)? How should added water, water lost in cooking, volatile ingredients and reconstituted or dehydrated ingredients be handled?
  - Why: CALC-001 to CALC-003 and ordering correctness.
  - Answer: Ordering should go by the 'as added' stage. Volatile ingredients may be classified as a processing aide (prescripted term in law.) There's laws around which ingredients can be processing aides. If they're processing aids, they don't need to be included in the ingredient declaration; like spraying an oil emulsion onto a baking pan to bake cakes as a release agent, chances are the oil won't need to be listed as an ingredient. UNLESS the processing aid contains an allergen!!
- **R1-04 - Choice between permitted names.** Where an ingredient may be declared by a specific or a generic name (Schedule 10), what default should the app apply and when must the user choose?
  - Why: DATA-002, REVIEW REQUIRED rules.
  - Answer: The default should be the prescribed / generic names.
- **R1-05 - Additives in the MVP list.** The MVP does not check additive permission but must still declare additives. Confirm the declaration form (class name plus name or code number) and which cases the MVP must flag as review (flavours, enzymes, carry-over, processing aids).
  - Why: ADD-009 and the MVP boundary.
  - Answer: Additives must be named as they are in the code. Based on what prescribed name the product falls under, different additives are allowed to be present in the product, to potentially different maximum quantities. All of this is laid out in the law / code. 

### Allergens

- **R1-06 BLOCKING - Allergen list and exact names.** Please confirm the current allergen list, the exact required names (including cereals containing gluten, individual tree nuts and sulphites), and the sulphite threshold the draft gives (added at 10 mg/kg or more).
  - Why: the controlled vocabulary shipped in rules data v0.1.
  - Answer: Sulphites must be declared if they go over 10 parts per-million mg/kg, but most businesses declare it anyway. This only applies to added sulphites. The code can be found at https://www.legislation.gov.au/F2015L00479/latest/text .
- **R1-07 BLOCKING - Exemptions.** Which exemptions are safe to automate for the MVP, and which should be review-only with recorded evidence (for example refined oils, glucose syrups from wheat, distilled alcohol, isinglass)?
  - Why: avoids false PASS on an exemption.
  - Answer: All the rules are listed in the tables. There's not a lot of room for interpretation with the law. All exemptions can feasibly be handled in our system. 
- **R1-08 - Summary and formatting.** Confirm the rules for the "Contains" summary statement, bolding, adjacency and field of view that the label renderer must enforce.
  - Why: label acceptance gates (requirements 8.2).
  - Answer: It has to be in the same direction as the ingredients declaration, adjacent to but separate from. It needs to be in bold. By convention, it's usually on it's own line below the ingredient declaration.
- **R1-09 - Precautionary labelling.** We plan to treat "may contain" as optional user text outside rule evaluation, with a notice that it never replaces required declarations. Do you agree, and is any supporting wording advisable?
  - Why: requirements 4.4.
  - Answer: The default of the system should comply with the AFGC (Australian Food & Grocery Council) guidelines--not law, but best practice. 'May Be Present' should be the default, but there should be other options (may contain, may contain traces of, etc.) 
- **R1-10 - Transition.** The draft says the plain-English allergen format is required and the sell-through period ended 25 February 2026. Confirm no legacy format needs supporting for new labels.
  - Why: scope of the allergen renderer.
  - Answer: No legacy format needs supporting.

### Nutrition Information Panel

- **R1-11 BLOCKING - Required rows and format.** Confirm the rows, columns (per serving and per 100 g or 100 mL), serving wording and layout the MVP must produce, and the exemptions it should detect rather than send to review.
  - Why: CALC-010, CALC-011.
  - Answer: All of that is found in https://www.legislation.gov.au/F2015L00482/latest/text . Schedule 12.
- **R1-12 BLOCKING - Energy and carbohydrate method.** Confirm the Schedule 11 method for energy, available carbohydrate and fibre, and which nutrient inputs are acceptable (supplier data, database values, analysis).
  - Why: nutrient aggregation design and evidence types.
  - Answer: Ideally we want the program to use nutrient information given / calculated from supplier data, input by the user. Alternatively, we can give users the option to use NUTTAB data, from the FSANZ website. 
- **R1-13 BLOCKING - Rounding.** At what stage should values be rounded (per 100 g then per serve, or the reverse)? Please provide the significant-figure and "LESS THAN" rules with two or three worked examples.
  - Why: spike S2 and fixture accuracy.
  - Answer: No more than 3 significant figures. Information available at 1.2.x in the law, https://www.legislation.gov.au/F2015L00395/latest/text .
- **R1-14 - Calculated values and tolerance.** What evidence and wording is acceptable for calculated NIP values, and what variance would you expect a business to be able to defend?
  - Why: user-facing disclaimers and evidence fields.
  - Answer: We work on 20% either way. This isn't law, it's convention. It can't deviate more than 20% higher or lower than the NIP. This isn't the sort of thing someone doing the label would check, though. 
- **R1-15 - Cooked, dried and prepared foods.** Is "as sold" only acceptable for the MVP, or must "as prepared" be supported from day one?
  - Why: CALC-014 scope.
  - Answer: Most products will require as sold as their main NIP. But there can be an optional extra column for things like "with water". Check the legislation. When "as prepared" is included, it must be clearly indicated. It should be an option. 

### General labelling checks

- **R1-16 - Name of food.** Beyond presence, what name checks can we safely automate in the MVP and what must be review-only?
  - Why: requirements 4.2, 6.6.
  - Answer: (pending)
- **R1-17 - Lot, supplier, address.** Confirm the acceptable lot formats and exemptions, and the required supplier name and address elements.
  - Why: presence rules in the MVP.
  - Answer: (pending)
- **R1-18 - Date marking.** Which date-marking cases must the MVP model (use-by versus best-before, long shelf life, bread, "packed on" alternatives)?
  - Why: requirements 4.13.
  - Answer: (pending)
- **R1-19 - Storage and directions.** Which triggers can we detect, and which should be a review prompt?
  - Why: presence and warning rules.
  - Answer: (pending)
- **R1-20 BLOCKING - Net quantity.** The Code does not appear to set this; legal metrology through the National Measurement Institute does. What must the MVP label show and what should always be review-only?
  - Why: requirements 4.17, marked "unmapped".
  - Answer: The weight on the pack is the weight the consumer gets in their net. Do not use the word net, generally. The labels should display weight as net weight.
- **R1-21 - Type size and legibility.** The draft cites Standard 1.2.1 for English, legibility, contrast and warning type size. Confirm the provisions and the sizes the renderer must enforce.
  - Why: P1-5 minimum-size guard.
  - Answer: (pending)

### Scope, policy and Victoria

- **R1-22 - MVP boundary.** Are you comfortable with the MVP not evaluating claims, HSR, additive limits or prescribed names? Is any minimal protective warning wanted (for example "claims are not evaluated")?
  - Why: plan decision D1.
  - Answer: Additive limits and prescribed names must be in before the first MVP version. The program cannot launch without functionality for claims, but they aren't strictly required for the first MVP version. 
- **R1-23 - Disclaimer wording.** Please review the non-certification statement and what an export report should say.
  - Why: TRACE-012.
  - Answer: (pending)
- **R1-24 - Overrides.** Who may override a FAIL or REVIEW REQUIRED, with what evidence and what expiry?
  - Why: TRACE-007, UX-008.
  - Answer: (pending)
- **R1-25 - Supplier evidence standard.** What documents do you expect for allergens, nutrition, additives, origin and GM status?
  - Why: DATA-001, evidence fields.
  - Answer: Ideally the AFGC PIF form--product information form, or something similar. Supplied by suppliers, usually. There is a non-zero chance we may be able to connect our system to the PIF database, but the system would have to be set up and presentable first. Otherwise, ingredient specification documents, which the suppliers should have.
- **R1-26 - Common product classes.** Which food types do your clients make most?
  - Why: fixture selection and Phase 3 class choice.
  - Answer: (pending)
- **R1-27 - Victoria.** Are there Victorian requirements the app should surface (Food Act 1984 (Vic) enforcement, council registration and premises classes, food safety supervisors)? Is the Food Regulations 2015 (Vic) current? Which Victorian instruments are missing from the register in plan section 11?
  - Why: the legal register marks these UNVERIFIED.
  - Answer: (pending)

### R1 source-check and follow-up (2026-11-06)

The interview was held and the answers above are preserved as recorded. This
check distinguishes the reviewer's guidance from Code text; it is not
reviewer sign-off of the follow-up interpretations. Remaining unknowns must
not become an automatic PASS. The [FSANZ legislation index](https://www.foodstandards.gov.au/food-standards-code/legislation)
is a navigation aid; use the relevant Federal Register compilation for the
authoritative text and record its version when implementing rules.

| Question | Source check and outstanding decision |
| --- | --- |
| R1-01 | Standard 1.2.4-5(5)-(7) provides ingredient-list options; alternating bracket styles are a presentation convention, not a prescribed legal rule. Nested-depth handling still needs a decision. |
| R1-02 | Standard 1.2.4-5(5)-(7) distinguishes less than 5% from 5% or more and specifies exceptions, including relevant declarations, a food additive performing a technological purpose in the food for sale, and a separate infant-food restriction. Confirm the full exceptions and their application. |
| R1-03 | Standard 1.2.4-5(1)-(4) specifies ingoing weight and treatment of water, volatiles and reconstitution; s 1.2.4-3 addresses specified omissions. The answer does not yet resolve the relevant processing and evidence cases. |
| R1-04 and R1-05 | Standard 1.2.4-4 permits specified kinds of ingredient names subject to their conditions. Section 1.2.4-7 sets out additive declaration forms; a default naming choice and review cases still need to be specified. |
| R1-06 | Schedule 9 item 1 refers to added sulphites in a concentration of **10 mg/kg or more**; exactly 10 is included. Confirm the complete allergen vocabulary, required names and derivative cases. |
| R1-07 | Schedule 9 specifies exemptions. Feasibility alone does not establish the evidence or conditions for applying each exemption; confirm the mapping and required evidence. |
| R1-08 to R1-10 | Standard 1.2.3-6 and 1.2.3-7 specify summary placement and formatting; a separate line is a convention, not a substitute for those conditions. Precautionary wording is a product-policy choice, not a Code requirement. The legacy transition ended on 25 February 2026 per FSANZ guidance; check any historical-label use separately. |
| R1-11 | Standard 1.2.8 and Schedule 12 supply NIP rules and formats. Specify the MVP rows, presentation and exemption-detection boundary. |
| R1-12 | Schedule 11 specifies calculation methods; supplier data is an input choice rather than a replacement for that method. Confirm acceptable evidence, missing-data handling and any use of food-composition data. |
| R1-13 | Standard 1.2.8-7(3)-(6) sets the specified significant-figure and optional “LESS THAN” presentation rules. The recorded answer does not settle calculation stages or supply the worked examples needed for S2; obtain and approve those separately. |
| R1-14 and R1-15 | The proposed 20% convention is not verified as a universal legal tolerance; do not encode it as such. Standard 1.2.8-13 sets conditions for food intended to be prepared or consumed with another food; confirm when an additional column applies. |
| R1-20 | The National Trade Measurement Regulations 2009 contain measurement-marking requirements and exceptions. The recorded wording about “net” is ambiguous; confirm what to display for the applicable product. Net quantity remains review-only under the plan. |
| R1-21 | Standard 1.2.1-24 addresses legibility and contrast; s 1.2.1-25 specifies warning-statement sizes, not a universal minimum for all text. The reviewer answer and print-legibility test remain pending. |
| R1-22 | The requested additive-limit and prescribed-name scope conflicts with locked decision D1. The product owner must decide whether to change the plan before implementing that scope. |

Primary sources checked on 2026-11-06: [Standard 1.2.4](https://www.legislation.gov.au/F2015L00392/2025-09-02/2025-09-02/text/original/epub/OEBPS/document_1/document_1.html),
[Standard 1.2.3](https://www.legislation.gov.au/F2015L00397/2024-10-29/2024-10-29/text/original/epub/OEBPS/document_1/document_1.html),
[Schedule 9](https://www.legislation.gov.au/F2015L00479/2021-02-25/2021-02-25/text/original/epub/OEBPS/document_1/document_1.html),
[Standard 1.2.8](https://www.legislation.gov.au/F2015L00395/2026-04-30/2026-04-30/text/original/epub/OEBPS/document_1/document_1.html),
[Schedule 11](https://www.legislation.gov.au/F2015L00481/2024-10-29/2024-10-29/text/original/epub/OEBPS/document_1/document_1.html),
[Schedule 12](https://www.legislation.gov.au/F2015L00482/2017-04-13/2017-04-13/text/original/epub/OEBPS/document_1/document_1.html),
[Standard 1.2.1](https://www.legislation.gov.au/F2015L00386/2026-06-09/2026-06-09/text/original/epub/OEBPS/document_1/document_1.html)
and [National Trade Measurement Regulations 2009](https://www.legislation.gov.au/F2009L03479/2024-03-20/2024-03-20/text/original/epub/OEBPS/document_1/document_1.html).
Supporting guidance: [FSANZ allergen labelling](https://www.foodstandards.gov.au/business/labelling/allergen-labelling)
and [Australian Food Composition Database](https://www.foodstandards.gov.au/science-data/food-nutrient-databases/afcd).
This was a bounded review, not exhaustive verification of every rule or
exception. R1-16 to R1-19 and R1-23, R1-24, R1-26 and R1-27 also remain pending.

## R2 - Rules data v0.1 review (during P1-2)

- **R2-01 - Mapping confidence scale.** Is the scale Provision / Standard / Instrument / Guidance-only / Unmapped useful, and is "no deterministic FAIL below Provision without approval" acceptable?
  - Answer: (pending)
- **R2-02 - Clause mappings.** Check each MVP rule's citation (instrument, Standard, clause, schedule) and its effective date.
  - Answer: (pending)
- **R2-03 - Explanation wording.** Review the templates for PASS, FAIL, WARNING, REVIEW REQUIRED and INFORMATIONAL, including the "why review is required" text.
  - Answer: (pending)
- **R2-04 - Allergen vocabulary.** Sign off the shipped vocabulary and synonyms.
  - Answer: (pending)

## R3 - Fixture sign-off (P1-5 and P1-6)

- **R3-01 - Fixture set.** Agree five to ten products covering simple, nested, allergen-heavy, liquid and low-sugar cases, with expected ingredient list, allergen statement, NIP values and warnings.
  - Answer: (pending)
- **R3-02 - Sign-off record.** What should a sign-off record contain (reviewer, date, Code version, discrepancies)?
  - Answer: (pending)
- **R3-03 - Re-verification.** Who re-verifies fixtures when the Code is amended, and how quickly?
  - Answer: (pending)

## R4 - Before Phase 2 (additives, characterising ingredients, advisories, GM, irradiation, origin)

- **R4-01 - Food category.** How should the user assign a Schedule 22 food category, and what must be recorded to justify it?
  - Answer: (pending)
- **R4-02 - Carry-over.** How should carry-over from an ingredient be evidenced? The text read for this plan allows presence where the level is no greater than the ingredient would introduce under proper technological conditions and good manufacturing practice (GMP); please confirm the reading.
  - Answer: (pending)
- **R4-03 - Additives permitted at GMP.** Should these return PASS or REVIEW REQUIRED, and what evidence is needed?
  - Answer: (pending)
- **R4-04 - Mixtures and equivalents.** When does the same-purpose mixture rule apply, and which "calculated as" conversions are needed (for example benzoates, sulphites, steviol glycosides)?
  - Answer: (pending)
- **R4-05 - Colour limits.** How should the combined colour limits for colourings permitted to a maximum level be applied across beverages and other foods?
  - Answer: (pending)
- **R4-06 - Processing aids.** What evidence supports processing-aid classification and exemption from declaration?
  - Answer: (pending)
- **R4-07 - Characterising ingredients.** When should the app prompt, what stage is the calculation base, and how should emphasis by images or graphics be handled?
  - Answer: (pending)
- **R4-08 - Advisory statements.** Which advisory statements should be automated first?
  - Answer: (pending)
- **R4-09 - GM and irradiation.** Which cases require evidence and which the app can evaluate?
  - Answer: (pending)
- **R4-10 - Country of origin.** Which product types and mark formats should the first origin workflow cover?
  - Answer: (pending)

## R5 - Before Phase 3 (claims, HSR, prescribed names)

- **R5-01 - Claim priority.** Which claims are requested most often (for example low fat, no added sugar, source of fibre, gluten free)?
  - Answer: (pending)
- **R5-02 - Wording equivalence.** How should the app treat claim wording that is not an exact permitted descriptor?
  - Answer: (pending)
- **R5-03 - Added-sugar transition.** How should claims be handled across the P1063 transition dates the draft lists?
  - Answer: (pending)
- **R5-04 - Health claims.** What evidence and review path is acceptable for general-level, high-level and self-substantiated claims, and for NPSC edge cases?
  - Answer: (pending)
- **R5-05 - HSR eligibility and categories.** Who assigns the category, how should FVNL content be evidenced, and does displaying an HSR alongside claims raise Standard 1.2.7 issues (INT-005)?
  - Answer: (pending)
- **R5-06 - HSR licence.** Do you know the artwork and calculator licence terms?
  - Answer: (pending)
- **R5-07 - Prescribed-name classes.** Which two or three classes should be automated first, and what composition data do they need?
  - Answer: (pending)
- **R5-08 - Non-Code claims.** Should "natural", "organic", "free from" and similar claims be review-only with Australian Consumer Law context?
  - Answer: (pending)

## R6 - Before beta

- **R6-01 - Catalogue review.** Review the whole rule catalogue, its mappings and its limits.
  - Answer: (pending)
- **R6-02 - Disclaimers and terms.** Review product disclaimers and what we may and may not say about compliance.
  - Answer: (pending)
- **R6-03 - Liability and advice boundary.** Where does tool assistance end and regulated advice begin, and does that need legal advice?
  - Answer: (pending)
