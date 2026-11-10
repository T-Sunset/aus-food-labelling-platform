# MVP regulatory research: additives and prescribed food names

**Research date:** Initial review 2026-11-06; Phase 2 Turns 1 and 5 source checks on 2026-11-09.
**Status:** Source review plus product-scope direction recorded 2026-11-09; not legal advice or reviewer sign-off. The bounded-cohort approach is selected. Turns 1–5 added candidate source mapping, evidence-backed review-only screening, additive-source capture, declaration-name groundwork and a draft permission catalog. No regulatory rule is activated.
**Jurisdiction:** Australia, Food Standards Code context (the Code is joint Australia/New Zealand where stated in the instruments).  
**Purpose:** Resolve the law-based parts of R1, identify remaining decisions, and record the source and scope questions for additive-limit and prescribed-name functionality in the MVP.

> The product assists users to prepare and review food information. It does not certify a product or label as legally compliant. A rule result is limited to the identified rule, source version, inputs and assumptions. Users remain responsible for the product, evidence, label and release decision.

## 1. Plain-language conclusion

The Code itself answers many of the open R1 questions. In particular:

- Ingredient declarations use descending **ingoing weight**, subject to specific Code calculations and exceptions. Where a compound ingredient is declared by name with its components, the 5% distinction governs which components must be listed; below 5%, applicable allergen/GM declarations and additives that still perform a technological purpose in the final food remain relevant. Infant foods have a separate restriction on this shortcut.
- The law sets the current allergen names, exemptions, placement and presentation. It is not safe to treat every possible exemption as automatically applicable just because a computer could evaluate it.
- The Code sets the NIP's required core rows, formats, energy/carbohydrate methods, significant-figure cap and optional “LESS THAN” formats. It does not, in those provisions, choose the product's supplier/database/laboratory evidence policy or a rounding sequence for every internal calculation.
- Additive permission is not a lookup by additive number alone. It depends on the food class in Schedule 15, purpose, conditions, level, preparation state, any applicable mixture/calculation rule and the actual evidence. Schedule 15 includes permissions at GMP as well as numerical limits. Unknown food classification or unverified concentration must not become PASS.
- A prescribed **food name** is not the same thing as a generic **ingredient name**. A prescribed name applies where the Code prescribes one; otherwise the food still needs a name or description that conveys its true nature and any required extra words. A Code definition alone does not make its defined term the food's prescribed name.
- The product owner has directed that additive limits and prescribed-name support focus on the same two initial product cohorts: formulated caffeinated beverages and foods for infants. Exact Code classifications/subcategories, applicable prescribed names and rule coverage still require source mapping and reviewer verification; the product descriptions alone do not define every applicable rule. Claims follow the core and additive/name groundwork and are required before public MVP launch. Unsupported or unmapped cases remain review-only.

The agreed MVP target is bounded support for the two selected product areas, not broad Code-wide coverage. Only source-mapped classifications and rules may produce deterministic results; unsupported or uncertain cases return `REVIEW REQUIRED`, not a guessed PASS or FAIL. Reviewer verification is still needed to establish what coverage is defensible within those product areas.

## 2. Evidence and status labels

This report distinguishes:

- **Law:** what the cited instrument says.
- **Reviewer guidance:** the answer already recorded in `docs/reviewer-questions.md`; useful context, not a substitute for the instrument or reviewer sign-off.
- **Product choice:** intended user experience, default, coverage and release scope.
- **Technical work:** a deterministic implementation or test task that does not need a reviewer to restate the law.
- **Reviewer decision:** a product-specific classification, evidence policy or interpretation boundary requiring expert review.
- **Review-only boundary:** information is insufficient or a judgement is not safely automated, so the software must return `REVIEW REQUIRED`.

The R1 source pass and official FSANZ material below were checked on 2026-11-06; the Phase 2 Turn 1 sources were checked on 2026-11-09. FSANZ's Code compilation is useful for navigation, but FSANZ says the Federal Register contains the authoritative text. A compilation date is not a guarantee that no later amendment or uncommenced transitional provision exists. Recheck the live Register and transition notes before pinning rules and again before release.

## 3. R1 findings: what the sources answer

| R1 item                                         | What the source establishes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Reviewer answer / what remains                                                                                                                                                                                                                                                                    | Product consequence and test intent                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R1-01 Nested compound ingredients**           | Standard 1.2.4-5(5)-(6) allows a compound ingredient to be declared by its name followed by a bracketed component list, or by declaring its components individually. The same ingredient rules apply recursively when a component is itself compound. The clause does not prescribe a maximum nesting depth or alternating bracket shapes.                                                                                                                                                                                                                                                                                                                            | Reviewer describes square/round bracket alternation as a visibility convention, not law. Decide whether that convention is the product's rendering default; do not describe it as mandatory.                                                                                                      | Expand and evaluate every known level while preserving hierarchy. Test two- and three-level nesting, component ordering, and missing supplier composition. Unsupported/missing breakdown is `REVIEW REQUIRED`; bracket style is presentation, not a legal PASS condition.                                                             |
| **R1-02 Small compound ingredients**            | At **5% or more** of the food for sale, list all components if the compound-ingredient-by-name option is used. Below 5%, the list includes ingredients required by Standard 1.2.3-4 or Standard 1.5.2-4 and any additive in the compound that performs a technological purpose in the food for sale. The compound-name shortcut does not apply to food for infants. A separate provision removes the components of a standardised alcoholic beverage from the ingredient list in the stated circumstance.                                                                                                                                                             | The recorded answer mentions allergens and functional additives, but does not mention the GM cross-reference, infant-food restriction, or standardised-alcoholic-beverage provision. Product/food classification is still needed.                                                                 | Test 4.99%, exactly 5%, above 5%, an infant-food case, an applicable allergen, GM declaration, final-food additive function, and standardised alcoholic beverage. Never apply the below-5% omission based on an unverified percentage or classification.                                                                              |
| **R1-03 Weight, water and volatiles**           | Standard 1.2.4-5(1)-(4) requires descending ingoing weight. It contains a calculation for ingoing water/volatile ingredients: added quantity less the specified amounts removed or used to reconstitute dehydrated/concentrated ingredients. For qualifying dehydrated/concentrated ingredients, pre-dehydration/concentration weight may be used. If the food is represented as reconstituted according to directions, the reconstituted-food ordering option is available if that basis is made clear. Standard 1.2.4-3 separately lists omissions, including a completely removed volatile ingredient and a processing aid used in accordance with Standard 1.3.3. | “As added” is a useful input state, but it is not a complete legal rule for water/volatile ordering or for every reconstitution case. Processing-aid status is fact- and provision-dependent; it is not a general volatile-ingredient exemption.                                                  | Record additions, losses, process state and reconstitution basis. Test water loss, added water, volatile removal, reconstitution, and both ordering bases. Only omit an item where the precise omission condition is supported; allergen declarations for processing aids are addressed separately under Standard 1.2.3.              |
| **R1-04 Ingredient naming choice**              | Standard 1.2.4-4 permits a commonly known name, a name describing the ingredient's true nature, or a Schedule 10 generic name used under that Schedule's conditions. These are ingredient-declaration names, not prescribed food names.                                                                                                                                                                                                                                                                                                                                                                                                                               | Reviewer prefers prescribed/generic names as the default. The law does not create one universally valid default for all ingredients; Schedule 10 contains conditions and some names require source or ingredient information.                                                                     | Product may offer a preferred valid name only after the mapping and conditions are known. Test conditional Schedule 10 names (including fats/oils and dairy examples), common/descriptive alternatives, and unresolved mapping. Do not label the preference “required by law.”                                                        |
| **R1-05 Additive declaration**                  | Standard 1.2.4-7(1) generally requires the applicable Schedule 7 class name followed by the Schedule 8 name or code number; if no class applies, use the Schedule 8 name. Further subsections deal with flavours, enzymes and other special cases. Standard 1.3.1/Schedule 15 determine permission and limits; declaration rules do not establish permission.                                                                                                                                                                                                                                                                                                         | The recorded answer correctly points to the Code but does not resolve special declaration cases or the review boundary.                                                                                                                                                                           | Treat declaration and permission as separate evaluations. Map Schedules 7 and 8 and all relevant subsections of 1.2.4-7 before generating additive wording. Missing identity/class/purpose or an unmapped special case is `REVIEW REQUIRED`.                                                                                          |
| **R1-06 Allergen list and names**               | Standard 1.2.3-4 applies to listed foods and derivatives in ingredients, compound ingredients, additives and processing aids, subject to the Schedule 9 exemptions. Standard 1.2.3-5 and Schedule 9 table S9-3 distinguish the required name in an ingredient statement from the name for other declarations. The current list includes wheat, fish, crustacean, mollusc, egg, milk, lupin, peanut, soy/soya/soybean, sesame; individual listed tree nuts (almond, Brazil nut, cashew, hazelnut, macadamia, pecan, pistachio, pine nut, walnut); barley/oats/rye when they contain gluten; and added sulphites at **10 mg/kg or more**.                               | Reviewer supplied the sulphite threshold and referred to the Code. The exact declaration name depends on the Schedule 9 column and context; do not use one undifferentiated synonym list.                                                                                                         | Build a versioned controlled vocabulary with separate ingredient-list and summary/other-declaration names. Include exact 10 mg/kg as in scope; distinguish added from naturally occurring sulphites. Test every listed food, derivative, context-specific required name and threshold boundary.                                       |
| **R1-07 Allergen exemptions**                   | Standard 1.2.3-4(3)-(4) makes the Schedule 9 Column 2 exemptions controlling. A derivative exemption is available only as the table states. The presence/identity alone is not enough to prove a product meets an exemption's processing or composition conditions.                                                                                                                                                                                                                                                                                                                                                                                                   | Reviewer says all exemptions are feasible to handle. Feasibility is not a source mapping or proof of the required facts. The detailed exemption-to-evidence mapping and review policy remain open.                                                                                                | Automate an exemption only when its exact Code conditions, inputs and evidence are mapped and tested. Otherwise return `REVIEW REQUIRED`. Test each exemption and near-miss separately; do not infer exemption from a supplier ingredient name such as “refined oil.”                                                                 |
| **R1-08 Allergen summary**                      | Standard 1.2.3-6(2) requires the ingredient declaration and summary where applicable. Standard 1.2.3-7 requires the summary to begin “Contains”, contain no other words, be in the same field of view, directly next to but distinctly separated from the ingredients statement, and use the specified bold type/size relationship.                                                                                                                                                                                                                                                                                                                                   | Reviewer agrees on same direction/adjacency/bold, but “usually on its own line below” is convention, not the complete legal test.                                                                                                                                                                 | Add a layout check for adjacency, separation, field of view and typography. “Same line” or “own line below” alone cannot pass the rule. Include label-renderer tests at actual output size.                                                                                                                                           |
| **R1-09 Precautionary allergen wording**        | The mandatory Code declaration is distinct from voluntary precautionary text. The AFGC guidance is industry guidance, not a Code requirement.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | “May Be Present” as a default and offering alternatives are product-policy choices.                                                                                                                                                                                                               | Keep precautionary text separate from the mandatory “Contains” statement; never use it to replace a required allergen declaration. Cite the chosen guidance and version, and mark this feature as guidance-based.                                                                                                                     |
| **R1-10 Allergen transition**                   | The Standard 1.2.3 transitional provision allowed the old format during transition and for specified pre-transition-labelled products; FSANZ guidance records the sell-through end as 25 February 2026. That date has passed as at this report date.                                                                                                                                                                                                                                                                                                                                                                                                                  | Reviewer says no legacy format for new labels. This is consistent for new labels; it does not mean historical labels can be silently regenerated under current rules.                                                                                                                             | New label drafts use current names/format. Preserve historical label snapshots and applicable source version; do not offer a legacy format for newly created labels.                                                                                                                                                                  |
| **R1-11 NIP rows, format and exemptions**       | Standard 1.2.8-5 sets the general NIP requirement and enumerates exemptions (including specified single-ingredient foods, beverages, herbs/spices, processing aids and small packages, subject to conditions and claims). Standard 1.2.8-6(1)-(2) and Schedule 12 set the core panel: servings per package, serving size, unit quantity, energy, protein, carbohydrate, sugars, fat, saturated fat and sodium, in serving and per-100-g/100-mL columns. Claims and other Code provisions can add rows or alter requirements. Sections 1.2.8-11 to -13 cover dehydrated/concentrated, drained, and foods intended to be prepared or consumed with another food.        | Reviewer points to Schedule 12 but has not chosen a supported exemption set or examples. The law supplies the panel; evidence and automatic applicability remain to be mapped.                                                                                                                    | MVP can calculate a base panel only for fully supported states and facts. Test default, liquid/solid units, claims requiring extra rows, small-package and other exemptions, reconstituted/drained foods, and 1.2.8-13 additional-food cases. Unsupported exemption or preparation state is `REVIEW REQUIRED`, never silent omission. |
| **R1-12 Energy/carbohydrate and input sources** | Schedule 11 S11-2 calculates average energy from average component quantities and specified factors. S11-3 defines available carbohydrate and carbohydrate by difference. S11-4 requires specified AOAC method(s) for dietary fibre. Standard 1.2.8 defines what the panel declares. These provisions specify methods/definitions, not a universal supplier-versus-lab-versus-database hierarchy.                                                                                                                                                                                                                                                                     | Reviewer prefers user-entered supplier data and possibly FSANZ food-composition data. That is a product evidence policy, not the calculation method itself. No conclusion is made here that a particular NUTTAB/AUSNUT release is current, licensed for embedding, or suitable for every product. | Preserve source, date, method and evidence type for each input; apply Schedule 11, not a generic calorie formula. Product must select, version and review any optional food-composition dataset. Test supplier data, calculated ingredients, missing/contradictory inputs and fibre evidence.                                         |
| **R1-13 NIP rounding**                          | Standard 1.2.8-7(3) caps displayed energy and nutrient/biologically active-substance values at three significant figures. Subsections (4)-(6) permit “LESS THAN 40 kJ”, “LESS THAN 1 g” for listed nutrients, and “LESS THAN 5 mg” for sodium or potassium when the applicable serving or unit quantity is below the stated value. “May” makes these optional formats. The Code does not prescribe a single internal calculation/rounding sequence in these clauses.                                                                                                                                                                                                  | Reviewer gave the three-significant-figure limit but no worked examples or rounding-stage decision.                                                                                                                                                                                               | Keep calculation precision separate from display formatting as a product/technical policy; pin the selected policy and examples. Before deterministic NIP release, have the reviewer check 2-3 worked examples and boundary cases. Do not encode “round per 100 g before per serve” as a legal rule without a separate source.        |
| **R1-20 Net quantity**                          | This is principally a trade-measurement matter, not a Food Standards Code NIP rule. The National Trade Measurement Regulations 2009 contain measurement-marking rules (Part 4, including regs 4.9-4.16A), special cases and prohibited expressions (reg 4.29). The Code does not establish a universal phrase “net weight” for all products.                                                                                                                                                                                                                                                                                                                          | The recorded statement “display weight as net weight” is ambiguous and not verified as a universal marking instruction. Product type, package, measurement and exceptions matter.                                                                                                                 | Keep net quantity `REVIEW REQUIRED` as the plan currently provides. Do not force the word “net” or generate a quantity-mark PASS until the exact NMI rule and product facts have been reviewed.                                                                                                                                       |
| **R1-21 Legibility and type size**              | Standard 1.2.1-24 requires English words (subject to Code provisions), legibility and prominence/contrast. Standard 1.2.1-25 specifies warning-statement type size: at least 3 mm, or at least 1.5 mm for a small package. It does not set a universal minimum type size for all label text.                                                                                                                                                                                                                                                                                                                                                                          | Reviewer answer and printed-size golden test are pending. The statutory minimum for warning statements is not a general font-size rule.                                                                                                                                                           | Test general legibility/contrast and warning-specific size separately. A physical-size print test is a product quality gate; only the warning rule can apply the cited numeric minimum.                                                                                                                                               |

#### Schedule 11 energy source check (2026-11-09)

The Federal Register's latest Schedule 11 compilation checked for this work is
C06, F2024C01138, in force from 2024-10-29. Under S11-2(1), average energy is
the sum of each component's average quantity in g/100 g multiplied by its
factor in kJ/g. S11-2(2) lists factors for alcohol (29), carbohydrate excluding
unavailable carbohydrate (17), unavailable carbohydrate including dietary
fibre (8), fat (37), and
protein (17). S11-2(3) lists specific factors for D-allulose (2), erythritol
(1), glycerol (18), isomalt (11), lactitol (11), maltitol (13), mannitol (9),
organic acids (13), polydextrose (5), sorbitol (14), D-tagatose (11), and
xylitol (14).

The calculation requires component quantities at the food's per-100-g basis;
it does not authorize assuming a missing component or factor is zero. S11-2
does not spell out precedence where a specific component could also be counted
within a general carbohydrate quantity, nor how to allocate incompletely
specified mixtures. Those inputs remain `REVIEW REQUIRED` unless resolved.
The engine accepts a versioned, source-cited factor set rather than embedding
these regulatory values in calculation code; the production data set and
component mapping remain subject to review.

Primary sources: [Schedule 11 latest-version register entry](https://www.legislation.gov.au/F2015L00481/latest)
and [Schedule 11 C06, S11-2](https://www.legislation.gov.au/F2015L00481/2024-10-29/2024-10-29/text/original/epub/OEBPS/document_1/document_1.html).

### Material clarifications outside the blocking list

1. **Food name vs ingredient name:** Standard 1.2.2-2(1) requires a prescribed name where one exists; otherwise a name/description must indicate the food's true nature and include any required additional words. Standard 1.2.2-2(2) expressly says that a Code definition alone does not make its defined term the name for this purpose.
2. **Prescribed-name examples:** Standard 1.2.2-2(1), Note 2 identifies, among others, fermented processed/manufactured meat categories, infant formula, follow-on formula, formulated meal replacement, formulated supplementary foods, formulated supplementary sports food, and honey. This is not a complete automated classification dataset for every Chapter 2 standard.
3. **Generic ingredient names:** Schedule 10, S10-2 (for Standard 1.2.4-4) allows listed generic names subject to conditions. For example, “fats or oils” has source-declaration conditions. This does not make “fats or oils” a prescribed name for the finished product.
4. **Additive food category:** Schedule 15 S15-2 permits listed substances for the numbered food class and, unless the table says otherwise, applicable higher-level headings. The matching food category is therefore a substantive input, not a cosmetic tag. S15-4 says MPL is generally measured in mg/kg unless otherwise indicated and defines GMP by the level necessary for the technological purpose under GMP conditions.
5. **Additive limits and mixtures:** Standard 1.3.1-3(1) requires permission and compliance with restrictions; 1.3.1-4(2) applies the Schedule 15 limit in the food for sale. Section 1.3.1-4(3) separately caps total colours permitted to a maximum level at 70 mg/L in a beverage and 290 mg/kg in another food. Section 1.3.1-6 applies a sum-of-proportions calculation to additives used for the same technological purpose and excludes substances that may be present under GMP. Standard 1.3.1-4(4)-(7) sets preparation and specified equivalent-calculation rules. These formulae and conversion rules should be transcribed from the applicable version, not re-created from a reviewer estimate.
6. **Carry-over:** Standard 1.3.1-3(2) permits carry-over from a raw material/ingredient only under the stated conditions, including an infant-formula-product exclusion and the “proper technological conditions and GMP” level condition. It is not a blanket exemption for every additive found in a supplier ingredient.
7. **Advisories and claims:** An additive/NIP rule can interact with Standard 1.2.3 mandatory advisories and Standard 1.2.7 claims. The current MVP scope must not silently treat an additive PASS or NIP calculation as a claim clearance.

## 4. Additive-limit MVP proposal

### 4.1 Product boundary (shared product cohorts selected; exact regulatory mapping pending)

Include an additive-permission/limit capability before the first MVP release, but do not imply that it covers every additive, food or formulation unless that breadth is explicitly funded, mapped and tested. A safe first release can evaluate a declared set of supported food classes and return `REVIEW REQUIRED` for other classes. An empty or incomplete catalogue must not look like “no restriction.”

| Option                     | Coverage proposal                                                                                                                                                                                                                  | Relative effort and risk                                                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Bounded launch set**  | Product owner selects a small set of customer food classes. Map all relevant permissions/conditions for those classes, including applicable parent headings and cross-cutting Standard 1.3.1 rules. Other classes are review-only. | Medium-high. More feasible to validate; still requires careful product classification and complete data for each selected class.             |
| **B. Broad Code coverage** | Catalogue all relevant food classes and applicable Schedule 15 permissions/conditions, plus cross-cutting limits, mixtures, colourings, GMP, equivalents, preparation and carry-over.                                              | High / ongoing. Large regulatory data-maintenance and verification burden; category misclassification can make a correct table lookup wrong. |
| **C. Staged cohorts**      | Begin with one customer/product cohort, then add additional classes under separately reviewed rule releases.                                                                                                                       | Medium-high initially, increasing over time. Makes the coverage boundary and customer fit explicit, but requires release/version discipline. |

The product owner selected bounded coverage focused on formulated caffeinated beverages and foods for infants, shared between additive-limit and prescribed-name support. The precise Code classifications/subcategories and applicable rules still need to be mapped and reviewed; products outside the supported rules remain review-only. Additional cohorts may be added in later rule releases.

### 4.2 Domain and behaviour requirements to add to the MVP scope

These requirements describe the minimum behaviour for the approved MVP direction; each selected rule still requires source mapping, reviewer review where required, and tests before deterministic use.

| Proposal ID    | Priority proposal                 | Requirement / data and rule behaviour                                                                                                                                                                                                                                                            | User-facing outcome, automation boundary and acceptance intent                                                                                                                                                                                                                                 |
| -------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MVP-ADD-01** | Must for selected classes         | Pin a human-confirmed final-food category/class, including why the class and any applicable parent heading were selected. Capture the classification facts needed by the rule. A product name alone cannot assign a Schedule 15 category.                                                        | Show category, decision owner, source/version and missing facts. Test correct inherited permission, explicit exception, wrong category and unknown category. Unknown class -> `REVIEW REQUIRED`. Source: Schedule 15 S15-2, S15-5; Standard 1.3.1-3.                                           |
| **MVP-ADD-02** | Must for evaluated additive       | Capture additive identity/code, technological purpose in the final food, source ingredient path, concentration and unit, evidence/source/date, added vs carried-over vs processing-aid status, process/preparation state, final yield/mass, and any required “calculated as” basis.              | Explain which source rows and final-food basis were used. Test unit conversions only with a documented valid conversion (density for mass/volume), missing concentration, multiple nested sources and yield changes. Unknown data -> `REVIEW REQUIRED`.                                        |
| **MVP-ADD-03** | Must for deterministic permission | Evaluate permission and limitations from the pinned Standard 1.3.1/Schedule 15 version, including category, purpose, MPL/GMP, relevant conditions and preparation state. Sum contributions of the same additive across all direct and nested sources where the rule requires a final-food level. | Show each contributing source, category/table row, limit, basis, calculation and source. Test below/equal/above limit; missing/uncertain class; “GMP”; prepared-food and specific equivalent cases. No rule row or inadequate mapping confidence -> `REVIEW REQUIRED`, not deterministic FAIL. |
| **MVP-ADD-04** | Must where applicable             | Apply Standard 1.3.1-6 to additive mixtures performing the same technological purpose, with the Code's sum-of-proportions method and GMP exclusion. Apply the separate aggregate colour cap only to the qualifying “colouring permitted to a maximum level” case.                                | Explain each mixture contributor and formula. Test ratio sum below, equal to and above 1; one/all GMP entries; colour aggregate boundary; and a mixture that does not meet the same-purpose trigger.                                                                                           |
| **MVP-ADD-05** | Must                              | Keep intended use, carry-over, processing aid and incidental presence distinct. Do not apply a carry-over or processing-aid exception from an ingredient flag alone.                                                                                                                             | Ask for evidence and process facts. Until the provision and evidence predicate are supported, `REVIEW REQUIRED`. Test carry-over no greater than the permitted introduced level, exceeded level, infant formula product, and unresolved processing-aid classification.                         |
| **MVP-ADD-06** | Must                              | Produce ingredient-declaration wording separately from permission evaluation, using Standard 1.2.4-7 and Schedules 7/8; propagate required allergen declarations from the additive/preparation where applicable.                                                                                 | Explanation identifies class/name/code choice and source. Test legal naming options and special cases; unsupported flavour/enzyme/additive naming cases -> `REVIEW REQUIRED`.                                                                                                                  |
| **MVP-ADD-07** | Must                              | Version every rule, table row, mapping, effective date and transition. A historical result must retain its old rule snapshot; new calculations use the selected current effective rules.                                                                                                         | Test a rule update creates a new evaluation without rewriting a previously approved product/label. Source version and transition are visible.                                                                                                                                                  |

### 4.3 Example demonstrating why the category matters

Schedule 15 S15-5 is a category-structured permission table, not a universal list of allowed amounts. For example, the Register's Schedule 15 table contains distinct permissions for **cream products (item 1.4.2)**, including an entry for nisin and a conditional entry for polyglycerol esters limited to specified whipped/thickened light cream. Other category rows have different additives and limits. A software test should use the exact current table row and its conditions; it must not generalise this example to all cream or dairy products.

This example is illustrative only and does not establish a recommended MVP product category.

## 5. Prescribed-name MVP proposal

### 5.1 Product boundary (selected classes pending)

Before MVP release, provide a prescribed-name workflow for explicitly selected, source-mapped classes. Do not claim to detect every prescribed name in the Code. Candidate discovery can prompt the user; absence of a match is not proof that no prescribed name applies.

| Proposal ID     | Priority proposal | Requirement / data and rule behaviour                                                                                                                                                                                                            | User-facing outcome, automation boundary and acceptance intent                                                                                                                       |
| --------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **MVP-NAME-01** | Must              | Separate finished-food prescribed-name rules (Standard 1.2.2-2) from generic ingredient naming rules (Standard 1.2.4-4/Schedule 10).                                                                                                             | UI and results identify which name domain was checked. Test that a Schedule 10 ingredient generic name is never treated as a prescribed product name.                                |
| **MVP-NAME-02** | Must              | For each supported class, record the Code source, precise prescribed-name trigger, exclusions, required name/wording, composition requirements and evidence inputs. The Code's food definition alone is not a trigger.                           | Show candidate class and missing facts. Test a valid candidate, a near-miss and a Code-defined food whose definition alone does not make it the prescribed name.                     |
| **MVP-NAME-03** | Must              | Collect classification facts required by the relevant standard (as applicable: composition, processing, intended use and presentation). A product owner or competent user confirms the classification where the facts do not uniquely decide it. | Deterministic results only for an approved mapping with complete facts. No candidate/uncertain identity -> `REVIEW REQUIRED`; never PASS merely because no candidate rule was found. |
| **MVP-NAME-04** | Must              | Evaluate supported compositional conditions only after classification and required inputs are complete; include rule dependencies and cross-check conflicts with claims, ingredients and additive rules where applicable.                        | Explain checked conditions and values. Test boundary values and missing evidence for each selected class; label output does not imply legal certification.                           |
| **MVP-NAME-05** | Must              | Preserve name-rule version, source compilation, effective date and historical evaluation snapshot.                                                                                                                                               | Test an amended rule changes a new evaluation but not a stored historical label/result.                                                                                              |

The reviewer recommended beginning with complex classes. The product owner selected formulated caffeinated beverages and foods for infants as the shared focus for additive-limit and prescribed-name support. R4 should confirm applicable Code classes/subclasses, prescribed-name triggers, composition inputs, evidence requirements and review boundaries. The selected product areas do not imply that every product within them has a prescribed name or a single applicable additive category.

## 6. Proposed phase-order revision

The product-owner direction resolves the prior scope conflict: the public MVP focuses additive and prescribed-name support on formulated caffeinated beverages and foods for infants, followed by claims after foundational work and before public MVP launch. The implementation plan and requirements record this sequencing. Exact Code classifications and rule coverage remain source-mapping and reviewer gates.

| Proposed step                          | Gate / work                                                                                                                                                                                                                                                                                                   | Classification                                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **0. Define scope change**             | Record the owner's decision to include additive limits and prescribed-name support for the same two initial product areas before public MVP, with claims following foundational work and required before public MVP launch. | Decision recorded in the implementation plan and requirements on 2026-11-09. |
| **1. Product class mapping**           | Map formulated caffeinated beverages and foods for infants to their exact Code classifications/subcategories and applicable additive and prescribed-name rules; record unsupported cases. | Product areas selected; legal classification and rule coverage require reviewer/source verification. |
| **2. Source-to-rule review**           | Before coding deterministic data, reviewer checks a draft source map and representative category/name mappings. Confirm what product facts support classification and which cases stay review-only. Law's explicit thresholds and equations should be cited, not asked of the reviewer again.                 | Reviewer gate for classification and mapping confidence; also verifies current Federal Register version and transitions. |
| **3. P1 core vertical slice**          | Keep the current core ingredients, nested formulations, allergen, NIP, presence, review UX, label and local-first work. Add the supported additive and prescribed-name evaluation domains as a pre-release workstream with clear dependencies on product classification and rule review.                      | Engineering/UX/test work after gate; no stack or architecture decision made here.                                        |
| **4. Worked fixtures and rule review** | Reviewer reviews draft outputs/source mapping and a small set of representative test fixtures: additive category/limit, multi-source same additive, mixture, GMP/carry-over, prescribed-name class and composition, and NIP examples.                                                                         | Reviewer verifies application and explanations; technical team owns calculation and boundary tests.                      |
| **5. Release gate**                    | No deterministic result for an unverified category or incomplete input. Every automated result has a source/provision, version/effective date, inputs, calculation, result, explanation, review boundary and automated test. Unsupported categories visibly remain `REVIEW REQUIRED`.                         | Product, reviewer and test sign-off; never a legal certification.                                                        |
| **6. Later phases**                    | Broader additive/name coverage, claims, HSR and other domains remain separately scoped. Claims are scheduled after foundational core and additive/name work, but must be completed before public MVP launch. HSR and other domains remain outside MVP unless separately approved. | Claims timing is recorded in D1; claim-family scope and any HSR expansion remain later decisions. |

**Qualitative scope:** the additive calculation domain is medium-high to high due to category selection, table conditions, purpose, additive mixtures, equivalent units, preparation state, carry-over/GMP and recursive sources. Prescribed-name capability is medium-high because identifying applicable classes and required composition facts is class-specific. A bounded cohort is materially smaller than broad Code-wide coverage, but still requires primary-source mapping, tests and expert review.

## 7. Traceability, result and test requirements

For every deterministic or potentially applicable rule, preserve this chain:

`Regulatory source -> exact provision/table row -> requirement -> rule/version -> required inputs -> evaluation/calculation -> status -> explanation/action -> automated test`

Apply existing traceability constraints in `docs/requirements.md` and `AGENTS.md`, including TRACE-014 and TRACE-015:

- Store the instrument/Standard, clause or schedule/table row, authoritative URL, jurisdiction, compilation/version, effective date, and any transition note.
- Explain the exact food class, additive or name rule, inputs and source evidence used; show formula, units, contributing ingredients, result, and next action.
- Treat mapping confidence below Provision-level as non-deterministic; do not produce a deterministic FAIL without the approval required by TRACE-015.
- Keep PASS, FAIL, WARNING, REVIEW REQUIRED and INFORMATIONAL distinct. Missing, stale, contradictory or unsupported data is not zero and not PASS.
- A rule explanation must not suggest legal certification. The final product/label release remains a human/business responsibility.

### Minimum test fixture intents

1. Compound ingredient at 4.99%, exactly 5%, and above 5%, with allergens, GM, additive function, infant-food and standardised-alcohol cases.
2. Nested compound ingredient ordering; water added/lost; volatile removed; dehydrated/reconstituted; reconstituted-food ordering basis and label disclosure.
3. Each selected allergen exemption with supporting evidence and a near-miss; exactly 10 mg/kg added sulphites; context-specific allergen name.
4. NIP core format; exemption requiring complete trigger facts; claim-triggered nutrient row; per-100-g/100-mL and serving display; rounding and “LESS THAN” boundaries; drained/prepared/combined-food cases.
5. Additive permission in selected food category; inherited parent permission and table exception; limit below/equal/above; missing category/concentration; same additive from nested sources; same-purpose mixture; GMP exclusion; qualifying aggregate colour; carry-over and excluded infant formula case.
6. Prescribed name vs generic ingredient name; supported class vs non-candidate; class composition boundary; missing classification fact; Code definition alone; name rule changed between effective versions.
7. Every test asserts trace metadata, user-facing explanation, action, result status, rule version, and source. Tests must include non-applicability and unknown-input cases.

## 8. Questions ready to send

These ask for expert review of application and evidence boundaries, not for the reviewer to restate provisions already in the Code.

### Useful now: choose representative products

> To help us choose what the first version supports, what kinds of food do you most often work with? Could you suggest two or three representative products, and let us know which additives or prescribed food names are most relevant to those products? Product types alone are enough at this stage; please do not send confidential recipes or supplier information unless you are comfortable doing so.

### Needed later: review the draft additive and name checks

> Once we have prepared draft checks for those product types, could you review our examples and tell us whether we have put each product in the right food category, applied the relevant additive limits and used the right food name? Please flag cases where more information or a human decision is needed. We will provide the Code references and our worked examples; you do not need to look up all the limits for us.

### Essential before releasing deterministic NIP calculations

> Once we have prepared two or three sample nutrition panels, could you check that the calculations and displayed numbers look right, especially where rounding changes a value or the food is prepared or drained? Please tell us if any example needs more information or should be left for human review. We will include the relevant Code references and explain how we calculated each panel.

### Remaining product and reviewer decisions

- Reviewer: which exact Code classifications/subcategories and prescribed-name triggers apply to formulated caffeinated beverages and foods for infants? These are the selected product areas for both additive and prescribed-name support; source mapping must define supported rules and exclusions.
- Which claim families should be prioritised for the claims phase (for example nutrition content, comparative or health claims)?
- Supplier-provided nutrient data is the selected initial source. Any later food-composition database option needs a named release, permission/licence, evidence label and update policy.

### Optional or review-only for later scope

- **Net quantity:** obtain a trade-measurement review of the proposed quantity wording and applicable exemptions before automating it. Until then keep it `REVIEW REQUIRED`, as the plan specifies.
- **Broad allergen exemptions:** reviewer should check the complete exemption-to-evidence matrix before any exemption generates a deterministic PASS. This need not block the rest of the MVP if unresolved exemptions remain review-only.
- **Ingredient bracket style and voluntary precautionary wording:** product/UX choices; record the chosen convention and keep it separate from mandatory law.
- **Printed legibility:** test warnings at physical size and review representative label proofs; do not treat one warning minimum as a universal minimum font size.
- **Full regulatory catalogue and disclaimer/terms:** retain the existing R6 review before beta.

## 9. Sources checked

Primary legal text is linked to the Federal Register. FSANZ guidance is included only where it explains official implementation context; it does not override the Code.

| Source                                                   | Specific provisions used                                                         | Version/effective-date note and URL                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FSANZ Food Standards Code legislation page               | Navigation and compilation status                                                | FSANZ page identifies the October 2026 Code PDF as a convenience copy and says the Register is authoritative: [FSANZ legislation page](https://www.foodstandards.gov.au/food-standards-code/legislation). Accessed 2026-11-06.                                                                                                                             |
| Code Standard 1.2.4, F2015L00392                         | 1.2.4-3; -4; -5(1)-(8); -7                                                       | Compilation F2025C00914, C02, in force 2025-09-02 (up to Amendment 243). [Federal Register current item](https://www.legislation.gov.au/F2015L00392/latest) and [compilation text](https://www.legislation.gov.au/F2015L00392/2025-09-02/2025-09-02/text/original/epub/OEBPS/document_1/document_1.html).                                                  |
| Code Standard 1.2.3, F2015L00397                         | 1.2.3-4 to -8; transitional provision                                            | Compilation 6, in force 2024-10-29 (up to Amendment 233); PEAL transition and post-transition period stated in the compilation. [Federal Register item](https://www.legislation.gov.au/F2015L00397/latest) and [compilation text](https://www.legislation.gov.au/F2015L00397/2024-10-29/2024-10-29/text/original/epub/OEBPS/document_1/document_1.html).   |
| Code Schedule 9, F2015L00479                             | S9-2 and S9-3 tables, including exemptions and required names                    | Compilation F2021C00195, C02, in force 2021-02-25. [Federal Register current item](https://www.legislation.gov.au/F2015L00479/latest) and [compilation text](https://www.legislation.gov.au/F2015L00479/2021-02-25/2021-02-25/text/original/epub/OEBPS/document_1/document_1.html).                                                                        |
| FSANZ allergen labelling guidance                        | Required-name list and transition guidance                                       | Official guidance page accessed 2026-11-06: [Allergen labelling for food businesses](https://www.foodstandards.gov.au/business/labelling/allergen-labelling). Guidance is not the legal rule.                                                                                                                                                              |
| Code Standard 1.2.8, F2015L00395                         | 1.2.8-5 to -7; -11 to -13                                                        | Compilation F2026C00411, C06, in force 2026-04-30 (up to Amendment 249). [Federal Register current item](https://www.legislation.gov.au/F2015L00395/latest) and [compilation text](https://www.legislation.gov.au/F2015L00395/2026-04-30/2026-04-30/text/original/epub/OEBPS/document_1/document_1.html).                                                  |
| Code Schedule 11, F2015L00481                            | S11-2 to -4                                                                      | Latest compilation checked 2026-11-09: F2024C01138 (C06), in force 2024-10-29. [Federal Register current item](https://www.legislation.gov.au/F2015L00481/latest) and [compilation text](https://www.legislation.gov.au/F2015L00481/2024-10-29/2024-10-29/text/original/epub/OEBPS/document_1/document_1.html). |
| Code Schedule 12, F2015L00482                            | S12-2 and related formats                                                        | Compilation F2017C00342, C02, in force 2017-04-13. [Federal Register current item](https://www.legislation.gov.au/F2015L00482/latest) and [compilation text](https://www.legislation.gov.au/F2015L00482/2017-04-13/2017-04-13/text/original/epub/OEBPS/document_1/document_1.html).                                                                        |
| Code Standard 1.2.1, F2015L00386                         | 1.2.1-24 and -25                                                                 | Compilation effective 2026-06-09, as referenced in the project source register. [Federal Register current item](https://www.legislation.gov.au/F2015L00386/latest) and [compilation text](https://www.legislation.gov.au/F2015L00386/2026-06-09/2026-06-09/text/original/epub/OEBPS/document_1/document_1.html).                                           |
| Code Standard 1.2.2, F2015L00389                         | 1.2.2-2(1)-(2), Note 2                                                           | Compilation 1, in force 2024-07-22 (up to Amendment 229). [Federal Register current item](https://www.legislation.gov.au/F2015L00389/latest) and [compilation text](https://www.legislation.gov.au/F2015L00389/2024-07-22/2024-07-22/text/original/epub/OEBPS/document_1/document_1.html).                                                                 |
| Code Schedule 10, F2015L00480                            | S10-2                                                                            | Compilation F2021C00203, C04, in force 2021-02-25. [Federal Register current item](https://www.legislation.gov.au/F2015L00480/latest) and [compilation text](https://www.legislation.gov.au/F2015L00480/2021-02-25/2021-02-25/text/original/epub/OEBPS/document_1/document_1.html).                                                                        |
| Code Standard 1.3.1, F2015L00396                         | 1.3.1-3 to -6                                                                    | Compilation F2024C00917, C04, in force 2024-09-13 (up to Amendment 231). [Federal Register current item](https://www.legislation.gov.au/F2015L00396/latest) and [compilation text](https://www.legislation.gov.au/F2015L00396/2024-09-13/2024-09-13/text/original/epub/OEBPS/document_1/document_1.html).                                                  |
| Code Schedule 15, F2015L00439                            | S15-2 to -5, including category rows                                             | Compilation F2026C00407, C16, in force 2026-04-30. [Federal Register current item](https://www.legislation.gov.au/F2015L00439/latest) and [compilation text](https://www.legislation.gov.au/F2015L00439/2026-04-30/2026-04-30/text/original/epub/OEBPS/document_1/document_1.html).                                                                        |
| Code Standard 2.6.4, F2015L00467                         | 2.6.4-2, formulated caffeinated beverage definition                              | As-made instrument, effective 2016-03-01; the Register item checked showed the as-made text as its latest text. [Federal Register item](https://www.legislation.gov.au/F2015L00467/latest) and [text](https://www.legislation.gov.au/F2015L00467/asmade/2015-04-01/text/original/epub/OEBPS/document_1/document_1.html). |
| Code Standard 2.9.2, F2015L00417                         | 2.9.2-2, -7, -8 and transition                                                    | Compilation F2024C00903, C04, in force 2024-09-13; Amendment 231 transition runs through 2029-09-13. [Federal Register current item](https://www.legislation.gov.au/F2015L00417/latest) and [compilation text](https://www.legislation.gov.au/F2015L00417/2024-09-13/2024-09-13/text/original/epub/OEBPS/document_1/document_1.html). |
| Code Schedule 7, F2015L00477                              | Class names used by Standard 1.2.4-7                                              | As-made text checked; whether a later consolidated version exists is **TO BE VERIFIED**. [Federal Register item](https://www.legislation.gov.au/F2015L00477/latest) and [as-made text](https://www.legislation.gov.au/F2015L00477/asmade/2015-04-01/text/original/epub/OEBPS/document_1/document_1.html). |
| Code Schedule 8, F2015L00478                              | Additive names and code numbers used by Standard 1.2.4-7                          | Compilation F2025C00967, in force 2025-09-16. [Federal Register current item](https://www.legislation.gov.au/F2015L00478/latest) and [compilation text](https://www.legislation.gov.au/F2015L00478/2025-09-16/2025-09-16/text/original/epub/OEBPS/document_1/document_1.html). |
| Code Schedule 14, F2015L00436                             | S14-2, technological purposes                                                    | Compilation F2023C00755, C02, in force 2023-07-19. It describes purposes, subclasses and definitions; it does not provide cohort-specific permission rows. [Federal Register item](https://www.legislation.gov.au/F2015L00436/latest) and [compilation text](https://www.legislation.gov.au/F2015L00436/2023-07-19/2023-07-19/text/original/pdf). |
| Code Schedule 16, F2015L00442                             | S16-2 to -4, additive and colouring types                                         | Compilation F2025C00968, C03, in force 2025-09-16. These type lists connect to Schedule 15 headings; they do not independently grant a food-category permission. [Federal Register item](https://www.legislation.gov.au/F2015L00442/latest) and [compilation text](https://www.legislation.gov.au/F2015L00442/2025-09-16/2025-09-16/text/original/epub/OEBPS/document_1/document_1.html). |
| Caffeine-related variation, F2026L00700                  | Clauses 3-4; Schedule items 1-9; transition                                        | Effective 2026-06-09; 24-month transition ends 2028-06-09. [Federal Register item and text](https://www.legislation.gov.au/F2026L00700/asmade/text) and [dated text](https://www.legislation.gov.au/F2026L00700/asmade/2026-06-09/text/original/epub/OEBPS/document_1/document_1.html). |
| Code Standard 1.3.3; Schedule 18, F2015L00452             | Candidate processing-aid provisions for later mapping                             | Processing-aid conditions and current versions were not mapped in Turn 1. Schedule 18 [Federal Register item](https://www.legislation.gov.au/F2015L00452/latest); current compilation and applicable rows **TO BE VERIFIED**. |
| National Trade Measurement Regulations 2009, F2009L03479 | Part 4, regs 4.9-4.16A and 4.29 (application/exceptions need a dedicated review) | Compilation F2024C00311, C08, in force 2024-03-20. [Federal Register current item](https://www.legislation.gov.au/F2009L03479/latest) and [compilation text](https://www.legislation.gov.au/F2009L03479/2024-03-20/2024-03-20/text/original/epub/OEBPS/document_1/document_1.html).                                                                        |

## 10. Phase 2 Turn 1: candidate source map

**Checked 2026-11-09. Candidate map only: no rules or classifications have
been activated.** The Food Standards Code instruments are separate; there is
no single compilation number for this map. The Federal Register versions and
effective dates checked for each source are listed in Section 9. This map
identifies where the Code directs further examination. It is not a complete
permission catalogue, a product classification, or reviewer sign-off.

### Additive provisions and candidate cohort rows

- **General framework:** Standard 1.3.1—3(1) conditions additive use on a
  permission, technological purpose and applicable restrictions. Section
  1.3.1—3(2) separately addresses qualifying carry-over in food other than
  infant formula products. Sections 1.3.1—4 to —6 address GMP and maximum
  levels, aggregate colouring limits, intense sweeteners and same-purpose
  mixtures. Schedule 15 S15—2 to —5 supplies inherited headings, preparation
  rules, units and the permission table. A Schedule 15 entry is not a
  permission finding until the product class, purpose, conditions and food
  state are established.
- **Formulated caffeinated beverages:** Standard 2.6.4—2 defines this food
  through product characteristics and purpose, and expressly connects food
  meeting that definition to Schedule 15 S15—5 item 14.1.3, “Water based
  flavoured drinks.” The marketing phrase “energy drink” or “caffeinated
  beverage” alone does not establish that classification. Other potentially
  relevant Schedule 15 subclasses require product-specific checking.
- **Foods for infants:** Standard 2.9.2—2 defines “food for infants” and
  excludes infant formula products, formulated meal replacements, formulated
  supplementary foods and unprocessed fruit and vegetables. Cereal-based
  food for infants excludes beverages. The candidate additive row is Schedule
  15 S15—5 item 13.2, “Foods for infants”; this is not a finding that a
  particular baby-oriented product belongs in that row.
- **Cross-cutting schedules:** Schedule 14 S14—2 lists technological
  purposes, subclasses and definitions relevant to whether a substance is
  used as a food additive. Schedule 16 S16—2 to —4 lists additive/colouring
  types corresponding to Schedule 15 table headings. Neither schedule
  independently supplies a cohort-specific permission. The complete purpose
  and type lists, and the crosswalk to every entry in Schedule 15 items 13.2
  and 14.1.3, were not transcribed.
- Standard 1.3.1—4(3) sets aggregate maximum levels for colourings permitted
  to a maximum level: 70 mg/L in beverages and 290 mg/kg in other foods.
  Applicability to a specific product still depends on its classification,
  state and the Schedule 15 entries that apply.
- **Declaration is separate from permission:** Standard 1.2.4—7 and Schedules
  7 and 8 govern additive declaration names/codes. Standard 1.2.4—5(5) to (7)
  includes compound-ingredient rules and expressly disapplies the relevant
  less-than-5% component-list option to food for infants. These declaration
  requirements do not establish that an additive is permitted or at what
  level.

### Prescribed names and additional wording

- Standard 1.2.2—2(1) requires a prescribed name where the Code prescribes
  one; otherwise, the food needs a name or description indicating its true
  nature and any additional words the Code requires. Under 1.2.2—2(2), a
  Code definition alone does not make the defined term a prescribed name.
- In the provisions checked for this map, no cohort-specific prescribed
  finished-food name was identified for formulated caffeinated beverages or
  foods for infants. Standard 2.9.2—7 contains infant-food age, suitability,
  “sweetened,” warning and honey-related wording requirements; Standard
  2.9.2—8 includes percentage declarations for specified ingredients. These
  are additional labelling/name-related requirements, not proof that “food
  for infants” is itself a prescribed food name.
- This is not a complete Code-wide prescribed-name inventory. Other
  standards may apply to an individual product and remain **TO BE VERIFIED /
  REVIEW REQUIRED**.

### Transitions, exclusions and unresolved product mapping

- The caffeine-related variation F2026L00700 creates additional caffeine
  definitions and requirements with a transition through 2028-06-09. The
  applicable transition track and product-specific interaction with Standard
  2.6.4 remain **REVIEW REQUIRED**.
- Standard 2.9.2 records an Amendment 231 transition through 2029-09-13.
  The applicable version for an infant-food product must be resolved from the
  transition terms; it is separate from the Schedule 15 additive version.
- Schedule 16 is not the processing-aid schedule. Processing-aid mapping is
  outside Turn 1: Standard 1.3.3 and Schedule 18 are candidates for later
  source review, but their current versions, applicable conditions and rows
  have not been verified here.

| Candidate | Product-specific questions still open |
| --- | --- |
| Formulated caffeinated beverages | Do the actual composition, presentation and purpose meet Standard 2.6.4—2? Does another Schedule 15 subclass also fit? What is the caffeine source/form, and which transition track applies? |
| Foods for infants | Does intended or represented use meet Standard 2.9.2—2, or does an exclusion apply? What factual subtype and consumption state apply, and is item 13.2 the correct Schedule 15 category? |
| Both | What are the product identity, additive purpose, full ingredient/additive evidence and applicable food state? Which Schedule 15 conditions, parent headings, equivalents, mixtures, colour aggregation or carry-over rules apply? Does another Code standard prescribe a name or additional wording? |

**Verified:** the sources, versions and provisions listed above were checked
against the Federal Register text on 2026-11-09; the two Schedule 15 candidate
rows and the cited general framework were identified.

**Not verified:** complete Schedule 15 permission inventories or Schedule 14
and 16 crosswalks; current Schedule 7 consolidation status; all processing-aid
conditions; every prescribed name that could apply to a particular product;
or product-specific category, evidence and transition decisions. Do not infer
PASS/FAIL or a prescribed name from this candidate map. Keep these cases
**REVIEW REQUIRED** until mapped and approved at the applicable gates.

## 11. Limits of this research and unresolved risks

- This is a bounded source review for R1 and the proposed MVP additive/name scope, not a clause-by-clause review of the entire Code or a compliance opinion.
- Turn 1 identified Schedule 15 items 13.2 and 14.1.3 as candidate rows and checked the cited cross-cutting Standard 1.3.1 provisions. The complete additive table was **not** mapped for every food class, additive, condition, transition or special food. No broad permission catalogue is ready for implementation.
- Schedule 9's exact exemptions were not converted into a complete evidence matrix. Keep unresolved exemptions review-only.
- The complete declaration special cases in Standard 1.2.4-7 and Schedules 7/8 were not all independently mapped here.
- NIP equations, main NIP rows, significant figures and the stated “LESS THAN” rules were checked. Worked NIP examples, evidence acceptance policy and rounding behaviour still need an explicit product rule and reviewer validation.
- The trade-measurement instrument is identified and its relevant provisions are cited, but detailed product-specific application and all exceptions were not mapped. Net quantity remains review-only.
- Prescribed names and representative examples were checked, but no complete inventory of every prescribed name/composition standard or class trigger was built.
- The authoritative pages were accessible. Some long Register table views were truncated by the research interface; where that limited line-by-line verification, this report explicitly leaves the complete catalogue or exception mapping open rather than treating it as checked.
- Exact source version/effective-date metadata must be checked again against the Register when the rules are prepared and before release. If a newer compilation or transition applies, do not reuse this report's version as current.
- Remaining product questions include product-specific classification and subclasses, accepted evidence, transition handling and the review-only boundary. These cannot be settled by the candidate text map alone.

## 12. Phase 2 Turn 2 and Turn 3 implementation status

The application now captures product identity, intended use, intended consumer,
processing and presentation context, along with dated references to the local
source documents. For the selected cohorts, it screens evidence-backed facts
against the candidate criteria described above. A proposed product name is
never used as classification evidence.

The screen can indicate a candidate for human confirmation or state that a
candidate is not indicated. Missing evidence, unknown facts or conflicting
evidence remain inconclusive and `REVIEW REQUIRED`; even a candidate indication
is not a legal classification. Prescribed-name screening remains review-only
because no approved cohort-specific candidate rules have been established.
This groundwork supports requirements INT-004, TEST-004 and TRACE-015 but does
not implement their full scope, evaluate additive permissions, assign a
deterministic food category, or establish a prescribed name.

The product profile and its evidence references are stored with the local
product draft. The referenced source documents themselves are not uploaded.

Turn 3 adds local additive source records to ingredient drafts. Users can
record an additive identity and source code, purpose wording, concentration
with its stated unit and basis, source references and dates, and whether the
source describes it as added, carried over, a processing aid, or unknown.
Formulation expansion associates each record with its nested ingredient path.
Incomplete details remain visibly missing; these records do not establish the
legal classification, permission, declaration, carry-over treatment, or
processing-aid status. No additive rule data or regulatory values were
activated or mapped in this turn. R4 and reviewer-verified fixtures remain
required before deterministic results.

## 13. Phase 2 Turn 4: additive declaration-name groundwork

The bounded primary-source check was completed on 2026-11-09 for declaration
formatting only. It does not map additive permissions or decide product-specific
classification.

- Standard 1.2.4, [F2025C00914](https://www.legislation.gov.au/F2015L00392/latest/text)
  (Compilation 2, effective 2025-09-02),
  section 1.2.4-7(1)(a) and (2) requires the Schedule 7 class name followed by
  the Schedule 8 name or code where classifiable, and says to use the most
  appropriate class when more than one applies. Under 1.2.4-7(1)(b), an
  additive that cannot be classified into a Schedule 7 class uses the Schedule
  8 name. Subsections (3) and (4) provide the enzyme and flavouring options;
  subsection (5) requires specified glutamate/nucleotide flavouring substances
  to be declared specifically under subsection (1); subsection (6) requires
  added caffeine to be listed as `caffeine`.
- Schedule 7 [S7-2, F2015L00477 as made](https://www.legislation.gov.au/F2015L00477/asmade/2015-04-01/text/original/epub/OEBPS/document_1/document_1.html),
  commenced 2016-03-01,
  lists 19 prescribed and 6 optional class names. The latest Register listing
  was checked on 2026-11-09.
- Schedule 8 [S8-2, F2025C00967](https://www.legislation.gov.au/F2015L00478/2025-09-16/2025-09-16/text/original/epub/OEBPS/document_1/document_1.html)
  (Compilation 8, effective 2025-09-16), contains
  344 alphabetical and 344 numerical entries. Both tables are retained
  separately in the draft catalogue, including source order and all eight
  displayed dash entries. Four exact name/code differences are retained
  without choosing a canonical wording:

  | Code | Alphabetical listing | Numerical listing |
  | --- | --- | --- |
  | 307c | di-Alpha-tocopherol | dl-Alpha-tocopherol |
  | 414 | Acacia or gum Arabic | Acacia or gum arabic |
  | 954 | Saccharin or calcium saccharine or sodium saccharine or potassium saccharine | Saccharin |
  | – | monk fruit extract or luo han guo extract | Monk fruit extract or luo han guo extract |

  The compilation summary says it includes amendments up to No. 231, but its
  amendment history records No. 244; both S8-2 listings include Mushroom
  chitosan. This source inconsistency is recorded in the catalog. Recheck the
  live Register and amendment history before any release.
- Neither Schedule 7 nor Schedule 8 assigns an S8-2 additive to an S7-2 class.
  The catalog therefore has no class-to-substance crosswalk. A verified
  Schedule 8 identity does not verify a Schedule 7 class, and the
  “most appropriate” class choice remains review-required.

The implementation adds a versioned, source-linked draft catalog and a
formatter for declaration wording candidates. Users choose a route and, where
applicable, a name/code option; the interface shows the source path and reason
for review. Draft data has 25 Schedule 7 class entries, 688 Schedule 8
listing-specific entries and four unresolved listing differences. The
formatter never produces a compliance status, and declaration wording
candidates remain `REVIEW REQUIRED`. Empty mapping data is intentional, not a
claim that no mapping is needed. No additive permission or limit is inferred.

Additive allergen evidence is carried through nested ingredient paths with
distinct path-specific evidence identifiers. It records user-supplied
assessments and dated references only; it does not determine legal allergen
declaration applicability, absence, exemptions or processing-aid treatment.
This completes the planned Turn 4 implementation scope for REG-ADD-003,
ADD-009 and the source/provenance groundwork, but does not close reviewer
gates or enable final declarations.

## 14. Recommended next actions

1. Phase 2 Turns 6 to 13 are complete. Next: reviewer verification per `docs/phase2-gate-record.md` (R4, R3-01, R1-21); keep `REVIEW REQUIRED` for candidate, incomplete and unsupported cases until signed.
2. Before deterministic rule activation, resolve additive row crosswalks, prescribed-name coverage, source versions and transitions, and obtain reviewer verification of product-specific classifications and fixtures.
3. Keep unsupported categories, unresolved exemptions, uncertain name classification and all unverified evidence in `REVIEW REQUIRED`. This research does not certify a product or label as compliant.

## 15. Phase 2 Turn 5: draft additive-permission catalog

**Checked 2026-11-09.** The catalog is versioned source data, not an
evaluation engine, approved classification, complete permission inventory or
reviewer sign-off. All permission entries remain draft and inactive.

### Sources captured

The catalog records the following Federal Register sources and effective
dates. Their compilation versions were checked on 2026-11-09; they must be
rechecked against the live Register, including transition provisions, before
rule activation or release.

| Instrument | Register version and effective date | Catalog use |
| --- | --- | --- |
| Standard 1.3.1 | F2024C00917, Compilation 4; effective 2024-09-13 | Calculation bases and equivalents, including the factor table for steviol equivalents. |
| Schedule 15 | F2026C00407, Compilation 16; effective 2026-04-30 | Candidate food-category headings and source-positioned permission rows. |
| Standard 2.6.4 | F2015L00467; commenced 2016-03-01; latest Register text checked | Explicit formulated-caffeinated-beverage connection to item 14.1.3. The captured source is not a product-specific classification decision. |
| Schedule 14 | F2023C00755, Compilation 2; effective 2023-07-19 | Schedule 14—2 purpose and subclass vocabulary, recorded separately from permission rows. |
| Schedule 16 | F2025C00968, Compilation 3; effective 2025-09-16 | Type-level Schedule 16 candidates appearing under the 14.1.3 heading. |

### Catalog scope and safeguards

- Five candidate category nodes are retained: Schedule 15 items 14.1.3,
  14.1.3.0.1, 14.1.3.0.2, 14.1.3.3 and 13.2. The Standard 2.6.4 link to
  14.1.3 is explicit for formulated caffeinated beverages. The subclasses
  and infant-food item remain product-dependent candidates; product wording
  alone does not establish a category.
- The catalog contains 59 Schedule 15 rows, 21 Schedule 14 purposes and
  seven Standard 1.3.1 calculation bases. It preserves additive identifiers
  as printed rather than inventing Schedule 8, Schedule 7 or technological-
  purpose crosswalks. The steviol-equivalent factor table is stored as data.
- Three Schedule 16 headings at 14.1.3 are retained as broad type grants:
  S16—2, S16—3 and S16—4. Their complete list membership is not transcribed,
  and no individual Schedule 15 row is mapped to a Schedule 16 list. The
  catalog is therefore incomplete for permission evaluation.
- Schedule 15 has no candidate permission rows directly under headings 13,
  14 or 14.1. The catalog does not inherit rows from 13.1 or 14.1 into
  items 13.2 or 14.1.3; its inherited-row lists are empty.
- Five infant-food modified-starch rows share the printed condition “In
  total” and a common aggregation-group identifier. They must not be treated
  as five independent maxima. The infant-food INS 414 Gum arabic row has an
  apparent printed maximum of 10, but its table presentation is explicitly
  unverified and the row remains draft.
- Conditions are stored as source text, not executable predicates. The
  catalog does not assign food classification, additive identity or purpose;
  calculate concentrations or mixtures; evaluate carry-over or processing
  aids; or produce PASS/FAIL/compliance conclusions.

The rule-data validator checks unique candidate category codes and entry IDs,
source membership and dates, heading paths, row/category and basis references,
row positions, supported condition and limit shapes, and the activation gate.
Tests cover stale sources, ambiguous or missing categories, unsupported
conditions and invalid units. Activation remains blocked while any catalog
entry is draft; it is not enabled by completing the source transcription.

**Verified:** the source versions and listed data boundaries are recorded in
the release data and validator as of the check date.

**Not verified:** full Schedule 16 memberships, all product-to-category and
additive-to-purpose/identity mappings, the infant-food INS 414 table
presentation, complete permission coverage for either cohort, all applicable
transitions, or reviewer acceptance. Continue to treat affected cases as
`REVIEW REQUIRED`; no catalog entry certifies product compliance.

## 16. Phase 2 Turn 6: permission evaluator

The evaluator (packages/engine) applies the Turn 5 draft catalog as data and adds no regulatory facts. PASS or FAIL needs Provision-level mapping confidence, reviewed catalog, category and row, a person-confirmed category, an added-source additive with a Schedule 14 purpose, one matching row, no source-text conditions or aggregation, a matching unit and calculation basis, and dated evidence. A missing row is REVIEW REQUIRED, never FAIL, because Schedule 16 memberships are not transcribed. The row's applicable food state and Schedule 15 default unit for beverages are not modelled; unit mismatches go to review. Every shipped draft row evaluates to REVIEW REQUIRED. Activation still needs R4 and reviewer-verified fixtures. This is not a compliance conclusion.

## 17. Phase 2 Turn 7: final-food additive concentration

A pure calculation (packages/engine) adds no regulatory facts. It sums additive mass from every added source of one additive code across nested ingredient paths and divides by the final mass from a documented process-mass profile (an empty profile documents 100% yield). Units are converted explicitly; per-volume sources and mg/L results need dated density evidence. Review-required, never zero: missing code, food state, profile, concentration, evidence or density; sources without a code number; no matching source. Carry-over, processing-aid and unknown sources, and dry-matter, prepared, reconstituted and drained bases, are not converted (Turn 9 and later). The food state is recorded, not derived; for prepared or reconstituted states the process profile must include the added water. Output is not yet fed to the permission evaluator and is not a compliance conclusion.

## 18. Phase 2 Turn 8: same-purpose mixtures and aggregate colours

**Checked 2026-11-10** against Standard 1.3.1 F2024C00917 (Compilation 4, effective 2024-09-13), read from the Federal Register text. Section 1.3.1�6(1) requires the sum of proportions of additives used for the same technological purpose to be not more than 1; 1.3.1�6(2) defines it with Conc_i (concentration in the food) and MPL_i (maximum permitted level); 1.3.1�6(3) excludes substances that may be present in accordance with GMP. Section 1.3.1�4(3) caps all colourings permitted to a maximum level together at 70 mg/L in a beverage and 290 mg/kg in another food.

TO BE VERIFIED: the equation in 1.3.1�6(2) is an image that was not read directly. The sum of Conc_i/MPL_i is inferred from the variable definitions and the phrase sum of the proportions. Compare with the published equation before activation.

The evaluators (packages/engine) take limits and permitted levels as supplied data (the 70 and 290 values are caller-supplied from rule data, not hard-coded) and use exact arithmetic for the boundary. Person confirmation is required for: purpose per additive, GMP presence, colour-class membership and beverage versus other food. A unit or calculated-as mismatch, an unreviewed or missing level, and missing evidence go to REVIEW REQUIRED. Fewer than two contributing additives, or no maximum-level colour, returns INFORMATIONAL (not applicable), not PASS. Not modelled: which additives are colourings permitted to a maximum level (the Schedule 15 and 16 crosswalk is not transcribed), density conversion between mg/kg and mg/L, and whether beverage status follows the prepared food. No rule data entry is added, so nothing is enabled and no result is a compliance conclusion.

## 19. Phase 2 Turn 9: carry-over and processing aids

**Checked 2026-11-10.** Standard 1.3.1 F2024C00917 was read directly. Section 1.3.1—3(2): a substance permitted for use as a food additive may be present in any food other than an infant formula product through carry-over from a raw material or ingredient if its level in the food is no greater than would be introduced by using that raw material or ingredient under proper technological conditions and GMP. The infant-formula exclusion was inserted effective 2024-09-13. Section 1.1.2—13, as quoted in Standard 1.3.3 (search snippet, not the full text), defines a processing aid as used during processing for a technological purpose, not performing a technological purpose in the food for sale, and identified in subsection (3). Paragraph 1.1.1—10(6)(c) is noted there as barring processing aids unless expressly permitted by the Code.

The engine evaluates carry-over only when a person confirms: not an infant formula product, the substance is a permitted additive, and the proper-technological-conditions-and-GMP level; it compares the food level to that confirmed level. Processing aids are a three-condition checklist that always returns REVIEW REQUIRED, because the Standard 1.3.3 permissions and the subsection (3) list are not transcribed (TO BE RESEARCHED). Incidental presence is not modelled: no Code provision for it was verified, so it falls to REVIEW REQUIRED. Infant formula products are therefore always review-only for carry-over, which matters for the infant-food cohort. No result is a compliance conclusion.

## 20. Phase 2 Turn 10: prescribed-name candidate rules

**Checked 2026-11-10.** Standard 2.9.2 (F2015L00417, compilation 4, 2024-09-13) and Standard 2.6.4 (F2015L00467, as made) were read directly. Neither prescribes a finished-food name. Name-linked items found: 2.9.2-7(3)(d) the word 'sweetened' above 4 g/100 g mono- and disaccharides from added sugars or honey; 2.9.2-7(3)(e) 'sterilised' in association with 'honey'; 2.9.2-8(1)(a) percentage declaration where the label, including the name, refers to milk, eggs, cheese, fish, meat (including poultry), nuts or legumes. Standard 2.6.4-5 sets declarations and advisory statements, which are labelling requirements and not names.

The draft catalog (prescribedNameCandidateCatalog) lists these as candidates with whole-word trigger terms taken from the Code text (no synonyms), plus 'no prescribed name identified in this Standard' entries for each cohort. The engine returns REVIEW REQUIRED only: 'candidates' (with required facts), 'no_rule_identified' (never a pass; absence of a match is not proof) or 'review' (cohort unconfirmed or unsupported). A proposed name never infers a cohort. Not searched, and TO BE VERIFIED: Standard 1.2.2 and other Chapter 2 standards for these cohorts. Not a compliance conclusion.



## 21. Phase 2 Turn 11: composition check for the infant 'sweetened' word

Only one composition-triggered name rule was mapped in Turn 10: Standard 2.9.2-7(3)(d), the word 'sweetened' where mono- and disaccharides from added sugars, honey and native bee honey exceed 4 g/100 g. The engine compares a person-confirmed g/100 g figure (exactly 4 is not above) and checks the proposed name for the whole word. PASS or FAIL is returned only when the catalog rule is reviewed, mapped at Provision confidence, the cohort is confirmed, and the figure basis and evidence are supplied; otherwise REVIEW REQUIRED, with the comparison shown for information. TO BE VERIFIED: how the word must be placed in association with the name of the food, and how the figure is derived from the formulation (the engine does not compute it). The honey 'sterilised' wording, percentage declarations and all caffeinated-beverage items stay review-only; no true-nature judgement is made. Not a compliance conclusion.

## 22. Phase 2 Turn 12: workspace integration

The workspace now runs the Turn 6 to 11 evaluators for a product from facts a person confirms and saves on the product record. No new regulatory fact was added. Results use the draft catalogs, so permission, name-candidate and 'sweetened' results are all REVIEW REQUIRED, and the UI labels the data as draft and unreviewed. Not wired: same-purpose mixture, aggregate colour, carry-over and processing-aid checks (review-only); per-ingredient density evidence (per-volume sources need review); the permission calculation-basis text (rows needing it stay review-only). Concentrations use a 100 g ingoing formulation and a no-mass-change confirmation or a saved process profile. Not a compliance conclusion.
