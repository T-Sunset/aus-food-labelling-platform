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
| R1-13 | Standard 1.2.8-7(3)-(6) sets a maximum of three significant figures and the conditions for optional “LESS THAN” presentations. It does not specify a rounding method, intermediate precision or whether the serving value is derived from the displayed per-100 value. The product owner chose to defer deterministic NIP formatting until a display policy and fixtures are reviewed; no legal sequence is inferred. |
| R1-14 and R1-15 | The proposed 20% convention is not verified as a universal legal tolerance; do not encode it as such. Standard 1.2.8-13 sets conditions for food intended to be prepared or consumed with another food; confirm when an additional column applies. |
| R1-20 | The National Trade Measurement Regulations 2009 contain measurement-marking requirements and exceptions. The recorded wording about “net” is ambiguous; confirm what to display for the applicable product. Net quantity remains review-only under the plan. |
| R1-21 | Standard 1.2.1-24 addresses legibility and contrast; s 1.2.1-25 specifies warning-statement sizes, not a universal minimum for all text. The reviewer answer and print-legibility test remain pending. |
| R1-22 | The product owner resolved the scope question on 2026-11-09: additive limits and prescribed-name support are intended for the same initial product areas—formulated caffeinated beverages and foods for infants. Claims follow the core and additive/name groundwork but are required before public MVP launch. Exact Code classifications, applicability and evidence remain subject to source mapping and reviewer verification. |

Primary sources checked on 2026-11-06, with the Standard 1.2.8 and Schedule 12 rounding provisions rechecked on 2026-11-09: [Standard 1.2.4](https://www.legislation.gov.au/F2015L00392/2025-09-02/2025-09-02/text/original/epub/OEBPS/document_1/document_1.html),
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

### Phase 1 gate triage and Federal Register checks (accessed 2026-11-09)

This follow-up preserves the interview answers above. It answers Code-text
questions from the Federal Register of Legislation (FRL), not reviewer
interpretations or product-policy choices. Compilation identifiers and
effective dates below are those shown in the FRL records checked on
2026-11-09. The Code is a joint Australia New Zealand instrument; this check
does not determine jurisdiction-specific enforcement or product
classification. Where a Code rule is answered but its application depends on
product facts, the software must continue to return REVIEW REQUIRED until
those facts and any reviewer gate are resolved.

| Question | Direct Code answer and primary reference | Remaining boundary |
| --- | --- | --- |
| R1-01 | Standard 1.2.4-5(5)-(7) permits a compound ingredient to be declared by its name followed by a bracketed component list, or by declaring its components individually. It prescribes no maximum nesting depth or alternating square/round-bracket convention. FRL Standard 1.2.4, F2025C00914 (C02), effective 2025-09-02: [text](https://www.legislation.gov.au/F2015L00392/2025-09-02/2025-09-02/text/original/epub/OEBPS/document_1/document_1.html). | Bracket typography and unsupported-depth handling are presentation/product policy, not a Code answer. |
| R1-02 | Under Standard 1.2.4-5(6), if a compound ingredient is less than 5% of the food for sale, the bracketed list need include only ingredients required by Standard 1.2.3-4 or Standard 1.5.2-4, plus a substance used as a food additive in the compound ingredient that performs a technological purpose in the food for sale. At 5% or more, all its ingredients are listed. Paragraph (5)(a)'s compound-name option does not apply to food for infants: subsection (7). Same FRL compilation as R1-01. | This is not a blanket permission to omit all other declarations. Ingredient identity, technological purpose and infant-food classification are fact-dependent; keep uncertain cases review-only. |
| R1-03 | Standard 1.2.4-5(1)-(4) requires descending ingoing-weight order. It allows the specified pre-dehydration/concentration basis for reconstituted ingredients, and permits reconstituted-food ordering where the food is represented as intended to be reconstituted and the basis is made clear. For water or a volatile ingredient, ingoing weight is X minus Y, where X is the amount added and Y is the amount removed plus the amount used to reconstitute dehydrated/concentrated ingredients. Same FRL compilation as R1-01. | The mass inputs and processing evidence must be complete; whether a volatile or other substance is a processing aid/omittable ingredient is not decided by this ordering rule. |
| R1-04 | Standard 1.2.4-4 permits a commonly known name, a name describing the ingredient's true nature, or a Schedule 10 generic name subject to that Schedule's conditions. It does not prescribe the app's preferred default among permitted choices. Same FRL compilation as R1-01. | The prior preference for generic names is product/reviewer policy, not a Code mandate. Do not select a generic name when its Schedule 10 condition or the ingredient's identity is uncertain. |
| R1-05 | Standard 1.2.4-7(1) requires a food additive to be listed by the applicable Schedule 7 class name followed in brackets by its name or code number; where it cannot be classified into a listed class, the substance's name or code number is used. Same FRL compilation as R1-01. | This answers declaration form only, not permission, limits, carry-over, technological purpose, or whether a particular input is an additive. Those are outside the Phase 1 rule activation boundary. |
| R1-06 | Schedule 9 S9-3(3) supplies the required names by declaration context: wheat; barley, oats and rye (the latter three when they contain gluten); fish; crustacean; mollusc; egg; milk; lupin; peanut; soy, soya or soybean; sesame; almond, Brazil nut, cashew, hazelnut, macadamia, pecan, pistachio, pine nut and walnut; and sulphites where added at **10 mg/kg or more** (including exactly 10). Standard 1.2.3-5 selects the table's Column 3 name for ingredient-list declarations and Column 4 for other declarations; -7 gives formatting and name-placement rules. FRL Schedule 9, F2021C00195 (C02), effective 2021-02-25: [text](https://www.legislation.gov.au/F2015L00479/2021-02-25/2021-02-25/text/original/epub/OEBPS/document_1/document_1.html); Standard 1.2.3, F2024C01143 (C06), effective 2024-10-29: [text](https://www.legislation.gov.au/F2015L00397/2024-10-29/2024-10-29/text/original/epub/OEBPS/document_1/document_1.html). | This is an index, not a replacement for the exact table: wheat's gluten treatment, cereal hybrid strains, exemptions, derivatives and other column-specific conditions must be implemented from the provisions. The product vocabulary/synonym set still needs reviewer sign-off before deterministic use. |
| R1-08 | Rechecked against Standard 1.2.3-7(3)-(5): a summary starts with “Contains”, lists the required names and no other words, and appears in the same field of view, directly next to but distinctly separated from the ingredient statement. It uses the same typeface and size as required names and bold type with distinct contrast. FRL Standard 1.2.3, F2024C01143 (C06), effective 2024-10-29; accessed 2026-11-09: [text](https://www.legislation.gov.au/F2015L00397/2024-10-29/2024-10-29/text/original/epub/OEBPS/document_1/document_1.html). | A separate line is a layout convention, not the legal test. Renderer implementation and proof remain subject to P1-5 review. |
| R1-10 | Rechecked against Standard 1.2.3 (F2024C01143, C06, effective 2024-10-29) and clause 4 of the Food Standards (Proposal P1044 – Plain English Allergen Labelling) Variation (F2021L00145, effective 2021-02-25). Clause 4 sets a transition period ending 25 February 2024 and a post-transition period ending 26 February 2026 for qualifying pre-transition packaged and labelled products. FSANZ guidance states those products could be sold until 25 February 2026. Both periods have passed as at the access date, 2026-11-09. [Standard 1.2.3](https://www.legislation.gov.au/F2015L00397/2024-10-29/2024-10-29/text/original/epub/OEBPS/document_1/document_1.html); [Variation](https://www.legislation.gov.au/F2021L00145/asmade/2021-02-24/text/original/epub/OEBPS/document_1/document_1.html); [FSANZ guidance](https://www.foodstandards.gov.au/business/labelling/allergen-labelling). | No legacy format is needed for new labels. The end-date wording differs between the Variation's period description and FSANZ's plain-language guidance; neither date creates a current transition at the access date. This check does not decide a historical package's facts or enforcement treatment. |
| R1-11 | Standard 1.2.8-6 and Schedule 12 set the applicable NIP formats. The ordinary S12-2 example includes servings per package, serving size, quantity per serving and per 100 g/100 mL, and rows for energy, protein, total/saturated fat, carbohydrate/sugars and sodium; other declarations and alternate formats depend on the applicable subsections and claims. FRL Standard 1.2.8, F2026C00411 (C06), effective 2026-04-30: [text](https://www.legislation.gov.au/F2015L00395/2026-04-30/2026-04-30/text/original/epub/OEBPS/document_1/document_1.html); Schedule 12, F2017C00342 (C02), effective 2017-04-13: [text](https://www.legislation.gov.au/F2015L00482/2017-04-13/2017-04-13/text/original/epub/OEBPS/document_1/document_1.html). | There is no single format/applicability rule for every food. Applicable exemptions, food state, claims and alternate formats require complete facts and a rule-by-rule review; do not infer an exemption. |
| R1-12 | Schedule 11 prescribes the calculation methods and factors; it does not prescribe a preferred supplier-versus-database evidence hierarchy. FRL Schedule 11, F2024C01138 (C06), effective 2024-10-29: [text](https://www.legislation.gov.au/F2015L00481/2024-10-29/2024-10-29/text/original/epub/OEBPS/document_1/document_1.html). | D7 resolves the initial product input policy in favour of supplier-provided nutrient values with evidence. Evidence sufficiency, missing values, nutrient mapping and method-specific fixtures remain review/test policy; supplier data does not replace Schedule 11 methods. |
| R1-13 | Rechecked against Standard 1.2.8-7(3)-(6): the specified average values must be expressed to no more than three significant figures. “LESS THAN” forms are optional and only where the relevant average is strictly below 40 kJ, 1 g for the listed nutrients, or 5 mg for sodium or potassium. FRL Standard 1.2.8, F2026C00411 (C06), effective 2026-04-30; accessed 2026-11-09: [text](https://www.legislation.gov.au/F2015L00395/2026-04-30/2026-04-30/text/original/epub/OEBPS/document_1/document_1.html). | The Code does not specify internal precision, rounding mode/order, or whether one displayed column is derived from another. Deterministic NIP display remains gated on reviewer-approved policy and fixtures; see ADR-003. |
| R1-15 | Standard 1.2.8-13 specifically addresses food represented as intended to be prepared or consumed with another food; it does not impose an extra “as prepared” column on every food. The Standard also separately specifies reconstituted and drained-food NIP bases in sections 1.2.8-11 and -12. Same FRL Standard 1.2.8 compilation as R1-11. | Whether a product's directions/representation trigger these provisions, and the supported product workflow, need product facts. The user preference for an optional prepared basis is a product choice, not a universal Code rule. |
| R1-16 | Standard 1.2.2-2(1) requires the prescribed name where the food has one; otherwise, the name or description must sufficiently indicate the food's true nature and include any additional words required by the Code. Subsection (2) cautions that a Code definition alone does not establish a prescribed name. FRL Standard 1.2.2, F2024C00726 (C01), effective 2024-07-22; accessed 2026-11-09: [text](https://www.legislation.gov.au/F2015L00389/2024-07-22/2024-07-22/text/original/epub/OEBPS/document_1/document_1.html). | The provision does not settle whether a particular product belongs to a prescribed-name class, or whether a proposed descriptive name indicates its true nature. Those require product facts and, where classification is uncertain, human review. |
| R1-17 | For packaged food required to bear a label under Standard 1.2.1-6(1), Standard 1.2.1-8(1)(b)-(c) lists lot identification and supplier name/address. Standard 1.2.2-3 exempts an individual ice-cream/ice-confection portion from lot identification and a small package only when it is in a bulk package/container carrying the lot identification. Standard 1.2.2-4 means the supplier's name and business address in Australia or New Zealand. FRL Standard 1.2.1, F2026C00538 (C13), effective 2026-06-09, and Standard 1.2.2, F2024C00726 (C01), effective 2024-07-22; accessed 2026-11-09: [1.2.1](https://www.legislation.gov.au/F2015L00386/2026-06-09/2026-06-09/text/original/epub/OEBPS/document_1/document_1.html); [1.2.2](https://www.legislation.gov.au/F2015L00389/2024-07-22/2024-07-22/text/original/epub/OEBPS/document_1/document_1.html). | The checked provisions do not prescribe a universal lot-code syntax. Do not invent one. The general exceptions to bearing a label are in Standard 1.2.1-6; whether the supplied value identifies the relevant lot or an exception applies requires operational/product evidence and review. |
| R1-18 | For foods required to bear a label, Standard 1.2.5-3(1) requires the use-by date if there is one; otherwise it requires the best-before date, with an alternative for bread with shelf life under 7 days. Subsection (2) exempts non-infant-formula food with a best-before date at least 2 years after determination and individual portions of ice cream/ice confection; subsection (3) limits small-package date marking to a use-by date, if any. Sections 1.2.5-4 and -5 prohibit sale after use-by and prescribe date wording/form. FRL Standard 1.2.5, F2021C00660 (C03), effective 2021-06-03; accessed 2026-11-09: [text](https://www.legislation.gov.au/F2015L00401/2021-06-03/2021-06-03/text/original/epub/OEBPS/document_1/document_1.html). | The Code text does not classify an individual product's date as use-by or best-before, establish shelf-life evidence, or settle small-package/infant-formula facts. Standard 1.2.1-6/-9 determine label versus other-information contexts. Those facts remain review-dependent; presence/format checks must not imply that the date selected is scientifically justified. |
| R1-19 | Standard 1.2.6-2 requires storage conditions where needed for the food to keep until its use-by/best-before date, directions where use or storage directions are necessary for health or safety, and specified full-cooking statements for raw bamboo shoots and raw sweet cassava. FRL Standard 1.2.6, instrument F2015L00393 (as-made text; registered 2015-03-31), effective 2016-03-01; no later separate compilation was shown on the FRL record checked 2026-11-09: [text](https://www.legislation.gov.au/F2015L00393/2015-03-31/2015-03-31/text/original/epub/OEBPS/document_1/document_1.html). | The Code does not supply a general product-independent trigger detector. Storage validation, safety-directed use, and ingredient/product classification depend on facts; do not infer that no statement is needed from missing data. |
| R1-21 | Rechecked against current Standard 1.2.1-24 and -25: Code-required label words must be English, legible, prominent and distinctly contrasting. Warning statements must be at least 1.5 mm on a small package and 3 mm otherwise; this is not a universal minimum for all text. FRL Standard 1.2.1, F2026C00538 (C13), effective 2026-06-09; accessed 2026-11-09: [text](https://www.legislation.gov.au/F2015L00386/2026-06-09/2026-06-09/text/original/epub/OEBPS/document_1/document_1.html). | The Code facts are sourced, but the renderer's application to other text, chosen supported minimums, font metrics and physical print-proof acceptance are not determined by these provisions. The P1-5 proof gate remains open. |

#### What is and is not needed for the Phase 1 transition

- **Still reviewer-dependent before Phase 1 exit:** R3-01, the actual golden
  product/label/NIP fixtures and their expected results, because P1-6 expressly
  requires reviewer-verified golden fixtures. R1-21's print-scale
  proof/renderer acceptance remains a P1-5 gate; the Code's type size
  provisions alone cannot verify a rendered, printed label. R1-13's NIP
  display policy must be settled before NIP presentation becomes
  deterministic, but it does not independently block Phase 1 engineering
  completion if that presentation remains visibly REVIEW REQUIRED.
- **Not a Phase 1 exit prerequisite if the affected result remains
  REVIEW REQUIRED:** R2-01 (approval of the mapping-confidence policy), R2-02
  (review of every rule mapping), R2-04 (reviewer sign-off of the shipped
  allergen vocabulary), R1-07 (mapping exemption conditions and evidence),
  and unresolved product-dependent applications in R1-01 to R1-06, R1-11,
  R1-12 and R1-15. They become prerequisites before
  activating the affected deterministic release/rules. The direct Code
  answers above do not themselves authorize deterministic outputs.
- **Reviewer/product or operational judgment, not a Code-text question, and
  not needed for this transition:** R2-03 (preferred explanatory wording),
  R3-02 (preferred sign-off-record contents), R3-03 (who/when re-verifies
  after future amendments), R1-14 (business tolerance/evidence convention),
  R1-20 (net-quantity display and application of external legal-metrology
  rules; outside this Food Standards Code check), R1-23 (disclaimer wording),
  R1-24 (override policy), R1-26 (customer mix), and R1-27 (Victorian
  operational/regulatory scope). Do not fill these with a guessed regulatory
  answer.
- **Not needed for the current Phase 1 gate:** R1-16 to R1-19 and R1-20 can
  remain presence-check or REVIEW REQUIRED/review-only cases under the plan.
  The objective Code text for R1-16 to R1-19 is now recorded above; their
  product classifications, exemptions, application or external metrology
  decisions are not necessary to claim the bounded Phase 1 engineering flow,
  provided no unsupported PASS/FAIL or label assertion is generated. R4-R6
  questions remain later-phase scope.

For this 2026-11-09 follow-up, the rows explicitly marked “Rechecked” and the
new R1-16 to R1-19 entries were checked against the direct FRL compilation
text/current record as described in each row. This does not re-audit every
earlier row or claim that no subsequent instrument could be made. Check the
FRL record again when a rule release is prepared. This bounded source check
does not approve the rule catalogue, fixture values, label output or legal
compliance.

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

## R4 - Before Phase 2 rule activation (additives and selected prescribed names; other compliance domains if advanced)

- **R4-01 - Product classification and evidence.** The 2026-11-09 Turn 1 source map identifies candidate Schedule 15 items 14.1.3 for products meeting the Standard 2.6.4 definition and 13.2 for qualifying foods for infants. For representative products, what facts and evidence are sufficient to verify the applicable category/subcategory, and which cases should remain review-only? See [the candidate source map](./mvp-regulatory-research.md#10-phase-2-turn-1-candidate-source-map).
  - Answer: (pending)
- **R4-02 - Carry-over evidence.** Standard 1.3.1—3(2) sets the Code conditions for qualifying carry-over. What supplier records or other evidence are sufficient to establish the ingredient's contribution, technological conditions and GMP, and which uncertain cases should be referred for review?
  - Answer: (pending)
- **R4-03 - Additives permitted at GMP.** Should these return PASS or REVIEW REQUIRED, and what evidence is needed?
  - Answer: (pending)
- **R4-04 - Mixture evidence.** Standard 1.3.1—6 states the same-purpose mixture test; Schedule 15 entries may also specify calculated-as equivalents. For representative mapped additives, what evidence is sufficient for the identity, purpose and equivalent basis, and which incomplete cases should remain review-only? The legal conditions and table-specific conversions must be source-mapped rather than re-decided here.
  - Answer: (pending)
- **R4-05 - Colour-limit classification.** Standard 1.3.1—4(3) sets aggregate maximum levels of 70 mg/L for beverages and 290 mg/kg for other foods when the relevant colouring entries apply. For representative products, what facts establish the applicable food basis/state, and what evidence should support a review-only outcome where classification is uncertain?
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
- **R4-11 - Product-specific prescribed-name coverage.** The 2026-11-09 Turn 1 source map records the general rule in Standard 1.2.2—2 and the candidate cohort provisions checked. No cohort-specific prescribed finished-food name was identified in those provisions, but the review was not a complete Code-wide inventory. For representative products, please verify whether another prescribed-name provision applies, what product facts/evidence are needed to identify it, and which cases should remain review-only. Do not restate the Code text; see [the candidate source map](./mvp-regulatory-research.md#10-phase-2-turn-1-candidate-source-map).
  - Answer: (pending)

## R5 - Before Phase 3 (claims; HSR only if separately approved)

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
- **R5-08 - Non-Code claims.** Should "natural", "organic", "free from" and similar claims be review-only with Australian Consumer Law context?
  - Answer: (pending)

### R5 claims (C1 additions, 2026-11-10)

Added from the Phase 3 Turn C1 research (see [section 23](./mvp-regulatory-research.md)). Judgement questions only; the Code text was read directly.

- **R5-C1-01 - First claim priorities and wording.** Which of the proposed low-energy, low-fat, low-sugars, low-sodium and good-source-of-fibre claims should be first, and which exact wordings should be approved?
  - Answer: (pending)
- **R5-C1-02 - Infant protein claims.** Does Standard 2.9.2-8(2) apply to all proposed protein-source wording, including "good source"? What evidence and energy basis should be required for the 12% condition?
  - Answer: (pending)
- **R5-C1-03 - Fibre serving basis.** What evidence and preparation or reconstitution basis are acceptable for a dietary-fibre per-serving claim on infant foods and formulated caffeinated beverages?
  - Answer: (pending)
- **R5-C1-04 - Comparative references.** What reference-food identity, evidence and display of the absolute difference are acceptable for future reduced or increased claims?
  - Answer: (pending)
- **R5-C1-05 - No-added claims.** What supplier and formulation evidence should be required before considering "no added" sugars or sodium?
  - Answer: (pending)
- **R5-C1-06 - Caffeinated-beverage label interaction.** How should reviewers confirm that claim-related NIP information and the separate Standard 2.6.4 caffeine and listed-substance declarations and advisories are presented together correctly?
  - Answer: (pending)

## R6 - Before beta

- **R6-01 - Catalogue review.** Review the whole rule catalogue, its mappings and its limits.
  - Answer: (pending)
- **R6-02 - Disclaimers and terms.** Review product disclaimers and what we may and may not say about compliance.
  - Answer: (pending)
- **R6-03 - Liability and advice boundary.** Where does tool assistance end and regulated advice begin, and does that need legal advice?
  - Answer: (pending)
