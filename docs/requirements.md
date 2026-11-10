# Australian Food Labelling Platform

## Comprehensive requirements and specification

**Document status:** Requirements baseline for architecture, domain modelling, UX, compliance-engine and test planning  
**Baseline research date:** 2026-11-02; **P0-5 legal-register verification:** 2026-11-06  
**Jurisdiction:** Australia, with Australia New Zealand Food Standards Code context where the Code is joint  
**Audience:** Product owner, food regulatory adviser, domain modeller, compliance-engine engineer, UX designer, test engineer and security/privacy reviewer

> This document specifies a product that assists food businesses to prepare and review Australian food-labelling information. It must not be described as certifying legal compliance. A generated label or automated result is an aid to review. The food business remains responsible for its product, evidence, label and market decision, and must obtain regulatory or legal advice where the facts or law require it.

## 1. Executive summary

The product shall turn a structured chain of ingredient, supplier specification, formulation, recipe, product and packaging data into reproducible labelling outputs and traceable compliance findings. The central product decision is **local-first formulation data with optional encrypted synchronisation, immutable product versions, and a rules system that never hides the source or the limits of automation**.

The system must support these conclusions:

- **PASS:** available inputs satisfy the identified deterministic check.
- **FAIL:** available inputs do not satisfy the identified deterministic check.
- **WARNING:** an applicable circumstance needs attention, but the result is not necessarily a failure.
- **REVIEW REQUIRED:** the system lacks data, a product classification is uncertain, a judgement is needed, or the rule cannot be evaluated reliably.
- **INFORMATIONAL:** relevant source context or an optional feature is shown without an automated compliance conclusion.

No overall green status may imply that a product is legally compliant. An overall product state shall identify unresolved review items, missing evidence, inapplicable checks and the source/version used.

### 1.1 Product decision summary

| Decision | Requirement |
| --- | --- |
| Regulatory baseline | Use the authoritative Federal Register of Legislation text for the Code. FSANZ's consolidated PDF is a navigation aid only and may not be current. |
| Product boundary | Australian retail and catering labelling assistance first. New Zealand, export and non-food regimes are separate scopes. |
| Deterministic scope | Ingredient ordering, recursive allergen propagation, declared nutrient calculations, many additive/claim threshold checks, prescribed-name prompts, GM/irradiation statements, and formatting checks where inputs are complete. |
| Human boundary | Food identity, prescribed-name applicability, characterising ingredient judgement, claim substantiation, source evidence, analytical values, process controls, origin evidence, packaging/legal metrology and final release approval require human review as applicable. |
| Data posture | Formulations and supplier specifications are commercially sensitive. Local-first operation is the default; cloud services are opt-in and must be explicit, encrypted and auditable. |
| Version posture | Published product and label versions are immutable. Recalculation creates a new result/version and does not silently rewrite a historical label. |
| Explainability | Every important rule result follows: source -> provision -> requirement -> software rule -> required data -> evaluation -> result -> user explanation -> test. |

### 1.2 Coverage map to the original brief

The brief proposed a 33-part hierarchy. This document groups the same content as follows. The P0-5 MVP source mappings are recorded in section 7.8 and `docs/implementation-plan.md` section 11; they do not represent reviewer approval. Other domains retain the earlier baseline confidence and were not re-verified in P0-5.

| Brief part | Where covered |
| --- | --- |
| 1-4 Executive summary, vision, goals/non-goals, personas | Sections 1-2 |
| 5 Regulatory context | Section 3 |
| 6.1-6.12 Regulatory requirements (labelling, ingredients, allergens, additives, names, claims, nutrition, characterising ingredients, HSR, GM, irradiation, origin) | Sections 4.1-4.20 |
| 7 Functional requirements | Section 5.2 |
| 8 Domain model | Sections 5.1, 4.18 and FORM-004 (cycles) |
| 9-12 Ingredient, supplier specification, formulation, product requirements | Section 6.8 |
| 13 Nutrition calculation | Sections 4.7 and 6.2 |
| 14 Additive calculation and validation | Sections 4.5, 6.3 and 6.5 |
| 15 Prescribed-name validation | Sections 4.6 and 6.6 |
| 16 Claims validation | Sections 4.8, 6.4 and 6.7 |
| 17-18 Compliance engine, regulatory rules/data | Section 7 |
| 19-20 Label generation, packaging | Sections 4.15 and 8 |
| 21 Versioning | Section 9 |
| 22-24 SaaS, local-first data, security | Section 10 |
| 25-26 UX, error/warning/review | Sections 7.3, 7.7 and 11 |
| 27 Testing | Section 12 |
| 28-29 MVP and future scope | Section 13 |
| 30-31 Risks, unknowns, legal review | Section 14 |
| 32 Traceability | Sections 7.2-7.8 and 16 |
| 33 Next steps | Section 14.4 |

Known requirements are Sections 4-12. Assumptions, uncertainties and automation limits are in Sections 14.5-14.7.

## 2. Product vision, goals and scope

### 2.1 Vision

Give Australian food businesses a practical, evidence-aware workspace in which a formulation can be understood, calculated, labelled and reviewed without losing the regulatory reason behind an output.

### 2.2 Goals

- Represent nested formulations and their provenance rather than treating a label as hand-authored text.
- Generate consistent ingredient declarations, allergen summaries, Nutrition Information Panels (NIPs), warnings, advisory statements and other selected label content.
- Make missing, stale, conflicting and uncertain data visible before label release.
- Provide a source-linked explanation for every automated finding.
- Preserve the exact product, ingredient, supplier and regulatory-rule versions used for every generated output.
- Support small businesses while remaining useful to a regulatory or technical reviewer.
- Allow calculation and review to continue locally when the user has no network connection.
- Make regulatory updates reviewable and testable rather than silently changing old results.

### 2.3 Non-goals

- Legal advice, certification, approval, enforcement representation or a substitute for a competent food regulatory review.
- A general-purpose global labelling platform in the first release.
- Automatic determination of every food category, prescribed name, characterising ingredient, origin claim, health claim or packaging-law question.
- Laboratory analysis, supplier verification, HACCP/food safety-plan management or manufacturing execution control.
- Designing the application architecture, technology stack, database schema or deployment topology in this requirements document.
- Treating voluntary claims, HSR or marketing copy as automatically safe merely because a nutrient threshold is met.

### 2.4 Target users and personas

| Persona | Need | Risk if unsupported |
| --- | --- | --- |
| Small food-business owner | Enter a recipe, understand what must appear on a label and export a reviewable draft | Manual omission of allergens, dates or declarations; false confidence |
| Product developer/formulator | Model nested ingredients, yields, losses, processing state, serving data and alternative suppliers | Nutrient and percentage calculations do not match production reality |
| Food regulatory reviewer | Inspect source, rule, inputs, evidence, exceptions and unresolved decisions | Cannot reproduce or defend a label decision |
| Supplier/specification manager | Maintain supplier data, versions, certificates, origin and allergen declarations | Stale or contradictory input flows into products |
| Label/packaging designer | Place required content and see legibility/size/field-of-view constraints | Output is technically complete but unusable or misleading |
| Quality or release approver | Compare versions, approve or reject a release and retain the evidence | No auditable sign-off or traceable rollback |
| SaaS workspace administrator | Control members, access, export, backup and deletion without seeing formulation content unnecessarily | Unauthorised disclosure or irreversible data loss |

### 2.5 Scope tiers

**Must for MVP:** Australian packaged retail products using ordinary foods; atomic and nested ingredients; supplier specifications; formulation quantities and yield; ingredients/allergens; core NIP; date/storage/directions fields; deterministic warnings/advisories for supported rules; source-linked findings; immutable product/label versions; local-first draft work; exportable review package.

**Should for Version 1:** additive permission and carry-over checks; prescribed-name and composition prompts for selected product classes; nutrition/content claim checks; NPSC and HSR calculation integration; country-of-origin evidence workflow; packaging/legibility review; encrypted cloud sync and recovery; collaborative review.

**Could later:** expanded Chapter 2 categories; full rule catalogue coverage; supplier portal; laboratory result import; batch variance scenarios; label artwork preflight; regulator-ready evidence package; New Zealand profile; export profiles; change-impact alerts.

**Out of scope until separately approved:** therapeutic product claims, medicines, cosmetics, infant formula and foods for special medical purposes as an automated release domain, non-Australian legal advice, unconstrained AI-generated regulatory conclusions, and packaging-material safety certification.

## 3. Regulatory context and source methodology

### 3.1 Regulatory hierarchy

The product shall distinguish:

1. **Australian legal/regulatory requirement:** an obligation in an applicable Act, legislative instrument, Code Standard, schedule, information standard or enforceable consumer-law context.
2. **Authoritative guidance:** FSANZ, ACCC, Health Star Rating or government guidance that explains or operationalises a requirement but is not itself always the legal provision.
3. **Product requirement:** behaviour the platform provides to assist a user.
4. **Implementation note:** a future design implication, not a regulatory statement.
5. **Assumption:** a declared working premise that must not be presented as law.
6. **Open question/risk:** unresolved facts, source mapping, interpretation or delivery decision.
7. **Legal/regulatory review item:** a boundary at which the software must defer to a qualified reviewer.

### 3.2 Source policy

- Use the Federal Register of Legislation for the current legal text, compilation identifier and in-force status.
- Use FSANZ pages for plain-English guidance, Code navigation, Gazette notices, applications, proposals and current consumer/business explanations.
- Use ACCC and the Country of Origin Food Labelling Information Standard for Australian origin labelling under Australian Consumer Law.
- Use the official Health Star Rating website, current calculator and implementation guide for HSR. HSR is voluntary and is not a substitute for a Code compliance result.
- Store source URL, title, instrument/Standard/schedule, provision, jurisdiction, effective date, compilation/version, retrieved date, transition status and source type.
- Never use a search result snippet or a secondary summary as the sole legal source.
- A source update must create a reviewable regulatory-data change. It must not change historical product results.

### 3.3 Research snapshot and known source limits

This specification was researched on 2026-11-02. FSANZ identifies the Federal Register as authoritative and published a Food Standards Code Compilation PDF for October 2026 for reference. The Federal Register pages examined expose different compilation dates for individual Standards and schedules; the engine must use the exact provision version applicable to the selected effective date, not assume all Code components share one compilation date.

Some current provisions are highly fact-dependent. For example, an ingredient may be an allergen, additive, processing aid, novel food, GM food, characterising ingredient or prescribed food only under conditions that are not inferable from a common ingredient name. The product shall record uncertainty rather than infer a legal conclusion.

### 3.4 Current transitional items to monitor

The regulatory-data process shall monitor at least:

- Plain English allergen labelling: mandatory format commenced 25 February 2024; the post-transition sale period for pre-25 February 2024 labelled stock ended 25 February 2026. A product created on this research date must use the current format.
- Energy labelling for alcoholic beverages: Amendment 241 commenced 13 August 2025 with a transition to 13 August 2028, subject to the instrument's stock rules.
- Caffeine review: Amendment 250 commenced 9 June 2026 with a transition to 9 June 2028.
- P1063 added-sugar claim changes: the current legal text and transition/post-transition provisions must be read together; the relevant transition dates include 29 October 2028 and post-transition rules to 30 October 2030.
- Infant formula consequential amendments: Amendment 231 has a transition from 13 September 2024 to 13 September 2029.
- Future Gazette Amendments 251 onward, including Amendment 253 published 29 October 2026, must be assessed before the next release.

The above is a monitoring requirement, not a complete list of all transitional arrangements.

## 4. Regulatory domain requirements

### 4.1 When a label or other information is required

**Regulatory baseline:** Standard 1.2.1 sets when food for sale must bear a label or have information provided, including separate divisions for retail sale, sale to caterers, other sales and general legibility. Section 1.2.1-8(1) enumerates core retail information: food name, lot identification, supplier, declarations, ingredients, date marking, storage/directions, claims, nutrition, characterising ingredients/components, GM and irradiated food information and relevant product-specific requirements.

**Product requirements:**

- Capture market channel: retail, caterer, other sale, immediate consumption, vending, hamper, unpackaged and packaged.
- Capture package status, package layers, surface area and individual portion-pack status.
- Determine which information is required, may be provided with the food, may be supplied on request, or is outside the product's selected label profile.
- Explain every omitted field by rule, exemption or `REVIEW REQUIRED`; never silently omit it.
- Support a user-selected effective date and transition profile.

### 4.2 Food name, lot, supplier and true nature

Standard 1.2.2 section 1.2.2-2 requires the prescribed name where one applies; otherwise the name or description must indicate the true nature of the food and include other required words. Section 1.2.2-3 covers lot identification and section 1.2.2-4 defines the name and business address of the supplier in Australia or New Zealand.

The product shall capture proposed name, descriptive name, prescribed-name candidate, lot method/value, supplier name and business address, and evidence for the selected name. A name that is commercially plausible but not supported by composition shall be `REVIEW REQUIRED`, not a PASS.

### 4.3 Statement of ingredients and compound ingredients

Standard 1.2.4 governs the statement of ingredients. FSANZ guidance states that ingredients are listed in descending order by ingoing weight. Added water is ordered by ingoing weight with allowance for water lost during processing, subject to the Code exceptions. Compound ingredients and their sub-ingredients need declaration subject to the applicable rules; an allergen must remain visible when present even where a compound ingredient would otherwise be below a disclosure threshold. Standard 1.2.4 and Schedule 10 govern permitted generic ingredient names and conditions of use.

The engine shall:

- Flatten nested formulations for declaration while preserving the original hierarchy.
- Calculate declaration order using the correct ingoing mass basis, not final mass alone.
- Track water added, water lost, volatile ingredients, reconstitution and drained state.
- Preserve supplier-declared names, Code generic names and user-facing common names separately.
- Identify when an ingredient's sub-declaration may be omitted and when allergens/additives still require declaration.
- Detect duplicate, circular or impossible composition references.
- Apply the current plain-English allergen form to every ingredient source.
- Provide a human review for an ingredient name selected from multiple allowable names where the legal context is unclear.

### 4.4 Allergens and gluten

Standard 1.2.3 section 1.2.3-4 and Schedule 9 section S9-3 establish mandatory declarations; section 1.2.3-5 defines required names, section 1.2.3-6 defines the declaration and summary content, and section 1.2.3-7 defines bolding, separation and summary-statement presentation. The current FSANZ consumer guidance identifies wheat, fish, crustacean, mollusc, egg, milk, lupin, peanut, soy, sesame, each listed tree nut, barley/oats/rye when containing gluten, and sulphites at added concentrations of at least 10 mg/kg. A cereal containing gluten is identified as gluten in the summary statement. The legal table and exemptions control the exact result.

The product shall:

- Maintain a controlled allergen vocabulary with exact required names, synonyms and source references.
- Propagate allergens recursively through compound ingredients, additives and processing aids where the Code applies.
- Distinguish allergen presence, allergen source, gluten status, exemption evidence and precautionary cross-contact information.
- Generate bold allergen names in the ingredients statement and a separate nearby bold `Contains ...` summary when required.
- Enforce one summary statement containing only `Contains` and the required names, with same field of view, direct adjacency and separation from the ingredients statement.
- Treat voluntary `may contain` or `may be present` statements as supplier risk-management text, not as a substitute for mandatory declarations. FSANZ states that the Code does not regulate precautionary allergen labelling.
- Support documented exemptions: wheat-starch glucose syrups meeting the gluten condition, fully refined soybean oil, specified soy derivatives, distilled alcohol from wheat or whey, beer/spirits cereal exceptions and isinglass exception, with source evidence and review date.
- Flag a possible exemption as `REVIEW REQUIRED` until the exact product, process and evidence are recorded.

### 4.5 Food additives, processing aids and carry-over

Standard 1.3.1 section 1.3.1-3 requires a permitted additive and compliance with restrictions; section 1.3.1-4 controls maximum levels and preparation state; section 1.3.1-6 controls mixtures serving the same technological purpose. Schedules 7 and 8 provide class names and names/code numbers for statements of ingredients; Schedules 14 to 16 and Schedule 15 provide technological purposes, permissions and limits. Standard 1.3.3 governs processing aids. FSANZ guidance states that most additives are declared by class name followed by the additive name or code number, while some flavours/enzymes may use class name rules.

The additive domain shall distinguish:

- additive deliberately added to the final food;
- additive carried over from a raw material or compound ingredient;
- processing aid used during manufacture;
- substance used as a nutritive substance, vitamin/mineral or novel food;
- incidental constituent with no technological function in the final food;
- additive source, function, concentration, unit, maximum permitted level and calculation basis.

The product shall not assert additive permission from a code number alone. It shall evaluate the food category, technological purpose, maximum level, GMP status, prepared/drained/reconstituted state and all contributors to a shared function. It shall show the declaration form, including an allergen declaration where the additive or carrier is a regulated allergen.

### 4.6 Prescribed food names, composition standards and food identity

Standard 1.2.2-2 requires a prescribed name where the Code provides one. The Code's Chapter 2 food standards contain identity and composition rules for product classes; examples include Standard 2.2.1 meat and meat products, Standard 2.2.3 fish and fish products, Standard 2.5.1 milk, Standard 2.6.1 fruit and vegetable juice, Standard 2.7.1 alcoholic beverages, Standard 2.8.2 honey and Part 2.9 special purpose foods. The current Standard 1.2.2 note lists prescribed names including fermented processed/manufactured meat categories, follow-on formula, formulated meal replacement, formulated supplementary food, formulated supplementary food for young children, formulated supplementary sports food, honey and infant formula.

The platform shall use a category/classification workflow, not an unrestricted name matcher. It shall collect product identity, composition, process, intended use, consumer presentation and relevant chapter-2 facts, then either:

- apply a fully supported deterministic class rule;
- show the candidate standard and missing facts; or
- return `REVIEW REQUIRED` for a regulatory reviewer.

It shall not call a generic product name a prescribed name without a source mapping. Fish names are a special case: FSANZ states that the Code does not define fish names and points to the Australian Fish Names Standard AS 5300 and the fishnames.com.au database. That external standard is not assumed to be incorporated into the Code; its use must be reviewed.

For the initial formulated-caffeinated-beverage and food-for-infants cohorts,
classification groundwork records identity, intended use, intended consumer,
processing, presentation and dated evidence references. Candidate screening is
review-only: a proposed name alone cannot establish a class or prescribed
name, and unknown, conflicting or unsupported facts remain `REVIEW REQUIRED`.
This groundwork does not activate additive or prescribed-name rules.

### 4.7 Nutrition information and calculation

Standard 1.2.8 section 1.2.8-5 controls when a NIP is required and lists exemptions, including certain single-ingredient foods, herbs/spices/herbal infusions, tea/coffee, water/ice, additives, processing aids and small packages, subject to claim conditions. Section 1.2.8-6 requires servings, serving size, unit quantity, energy, protein, carbohydrate, sugars, fat, saturated fat and sodium, plus claimed nutrients and other required information. Section 1.2.8-7 controls significant figures and small-value wording. Sections 1.2.8-11 to 1.2.8-13 address reconstituted, drained and prepared foods. Schedule 11 calculates energy and carbohydrate; Schedule 12 sets NIP formats; Schedule 13 covers small packages.

The nutrition calculation shall:

- support a nutrient profile that records average, minimum, maximum and analytical values separately;
- calculate ingredient contributions on a consistent mass basis, then apply yield, moisture loss/gain, concentration, drain/reconstitution and serving rules;
- preserve the source and date of each nutrient value and the method/evidence type;
- calculate energy using the current Schedule 11 method and factors, not a hidden generic calorie formula;
- calculate available carbohydrate and dietary fibre only when the required definition and method inputs exist;
- produce per serving and per 100 g/100 mL values, including the correct liquid/solid unit quantity;
- include additional nutrient rows where a claim or rule requires them;
- apply the current rounding, significant-figure and `LESS THAN` presentation rules;
- refuse to present a deterministic NIP when required nutrient inputs are absent, stale, contradictory or outside the supported evidence policy;
- show the calculation tree and rounding stage in the explanation package.

The calculation is an estimate when based on supplier/database values and is not a laboratory certificate. The user must be able to mark a nutrient value as measured, supplier-provided, database-derived, calculated, assumed or unknown.

### 4.8 Nutrition content claims, health claims and related claims

Standard 1.2.7 applies to nutrition content and health claims. Section 1.2.7-4 restricts claims about specified foods, alcohol and other cases; section 1.2.7-5 excludes certain supply contexts; section 1.2.7-7 selects the food form for evaluation; section 1.2.7-8 prohibits therapeutic claims; sections 1.2.7-11 to 1.2.7-16 govern content and comparative claims; sections 1.2.7-18 to 1.2.7-22 govern health claims and accompanying context; section 1.2.7-25 points to the NPSC method; section 1.2.7-26 requires supporting nutrition information where the NPSC is relied upon.

Schedule 4 contains conditions for nutrition content claims, high-level health claims, general-level health claims and the NPSC category threshold. Schedule 5 contains the NPSC scoring method. Schedule 6 contains the systematic-review method for a self-substantiated general-level health relationship.

The claim workflow shall:

- classify a proposed statement as mandatory information, nutrition content claim, health claim, endorsement, origin/quality statement, marketing copy or unknown;
- store exact wording, placement, food form, target population, reference food and evidence;
- evaluate only supported descriptors and conditions; do not infer that ordinary marketing language is outside Standard 1.2.7;
- calculate comparative claims only with an identified reference food and stated difference;
- calculate the NPSC with the current Schedule 5 category and inputs, including relevant fruit/vegetable/nut/legume, fibre and protein inputs;
- validate required dietary context, food form and label information for health claims;
- require documentary evidence and a human/legal review for self-substantiated relationships, scientific evidence, endorsements and borderline wording;
- show `REVIEW REQUIRED` if the intended form, reference food, claim classification, evidence or required nutrient is uncertain.

The platform shall never generate a health claim merely because a nutrient threshold is reached.

### 4.9 Health Star Rating (HSR)

HSR is a voluntary Australian and New Zealand front-of-pack system. The official HSR material states that ratings range from 0.5 to 5 stars, are calculated on 100 g or 100 mL, and generally balance energy, saturated fat, sodium and sugars against fibre, protein and fruit/vegetable/nut/legume content. Manufacturers and retailers are responsible for correct calculation and display. The official HSR Implementation Guide version 9 was finalised in December 2025 and is available as version 9.1 from September 2026; the official calculator page provides an online calculator and downloadable workbook.

HSR requirements are:

- identify whether the product is permitted, intended, excluded or uncertain under the current HSR industry guide;
- use the current official calculator/algorithm version and retain the input snapshot, category, score, star result and graphic version;
- support HSR exclusions including specified Part 2.9 special purpose foods, alcohol, qualifying alcohol-like beverages, alcohol kits, kava and foods excluded by Standard 1.2.7 contexts;
- warn that HSR does not replace the NIP, ingredients list, dietary advice or product-specific regulatory review;
- not treat HSR as a Code PASS or infer that a rating is required because a NIP exists;
- check consistency between HSR, the NIP and the underlying nutrition values;
- keep official artwork/licence terms and implementation guide requirements as a controlled source, not a copied approximation.

### 4.10 Genetically modified food

Standard 1.5.2 section 1.5.2-3 permits GM food only where listed in Schedule 26 and conditions are met. Section 1.5.2-4 requires the statement `genetically modified` for applicable approved GM food containing novel DNA or novel protein or otherwise specified, with exemptions including unintentional presence no more than 10 g/kg of each ingredient and immediate-consumption food prepared and sold from specified premises. Schedule 26 compilation 38 was in force on 1 September 2026.

The product shall record GM status at the source and ingredient level, approved line/event, presence of novel DNA/protein, intentionality, concentration, exemption evidence and any altered-characteristic statement. The 2 September 2025 P1055 changes updated definitions and did not change the existing approach to GM approval or labelling; this fact must be represented as source context, not hard-coded as a timeless assumption.

### 4.11 Irradiated food

Standard 1.5.3 sections 1.5.3-3 to 1.5.3-7 define permitted irradiation categories, dose/process conditions and re-irradiation; section 1.5.3-8 requires records; section 1.5.3-9 requires a statement to the effect that food has been treated with ionising radiation, or that an irradiated ingredient/component has been treated, for packaged and unpackaged food. Current permissions include fresh fruit/vegetables, herbs/spices and plant material for herbal infusions under stated purposes and doses.

The platform shall record treated status, ingredient inheritance, purpose, dose range, facility/lot evidence, treatment date and whether treatment is permitted for the specific food. It shall not infer irradiation from origin or supplier name alone.

### 4.12 Country of origin

Australian country-of-origin food labelling is primarily under the Country of Origin Food Labelling Information Standard 2016, made under the Competition and Consumer Act 2010, rather than the Food Standards Code. ACCC guidance states that most retail packaged foods require origin information; priority and non-priority foods have different formats; Australian priority food marks may include the kangaroo symbol, bar chart and text; and Australian content is based on ingoing weight for the relevant standard mark. Origin claims remain subject to misleading-conduct laws.

The platform shall:

- capture destination, retail channel, priority/non-priority classification, grow/produce/make/pack facts and ingredient origin evidence;
- calculate origin percentages only from documented ingoing-weight inputs and the selected legal method;
- distinguish legal country-of-origin labelling from voluntary claims such as `Australian owned`, `Australian made` or ethical/sustainability claims;
- provide approved standard-mark artwork and format checks only after the user selects the applicable legal profile;
- return `REVIEW REQUIRED` where manufacturing transformation, ingredient exclusions, origin evidence, packaging or claim impression is uncertain;
- link to the current ACCC guidance and the current Federal Register instrument, without treating a label generated by the platform as an ACL safe harbour.

### 4.13 Dates, storage, directions and preparation

Standard 1.2.5 section 1.2.5-3 requires date marking unless an exception applies; section 1.2.5-4 prohibits sale after a use-by date; section 1.2.5-5 controls wording and form. Standard 1.2.6 section 1.2.6-2 requires storage conditions where needed for the product to keep until the date, directions needed for health or safety, and specified preparation statements for raw bamboo shoots and raw sweet cassava.

The product shall capture date type, shelf-life basis, storage condition, pack state, opening/use instructions, preparation/reconstitution/draining directions and product-specific warnings. It shall identify a missing storage condition as a warning or review item when shelf life depends on it. It shall not calculate a scientifically valid shelf life from recipe data alone.

### 4.14 Warning, advisory and related statements

Standard 1.2.3 sections 1.2.3-2 and 1.2.3-3 and Schedule 9 S9-2 control mandatory advisory statements and the royal-jelly warning. Current examples include aspartame/phenylalanine, guarana/caffeine, plant sterols, polyols/polydextrose laxative wording, formulated caffeinated beverages, propolis/bee pollen, unpasteurised egg/milk and cereal/soy beverage suitability statements. Product-specific Chapter 2 and alcohol warning requirements also apply.

The rules shall be trigger-based and source-linked. The user must see the triggering ingredient, concentration or product classification, exact current wording requirement, placement/format requirement and any data gap. User-authored advisory text must be distinguished from Code-required text.

### 4.15 Packaging, legibility, quantity and artwork

Standard 1.2.1 section 1.2.1-24 requires English words, legibility, prominence and distinct contrast; section 1.2.1-25 specifies warning type size of at least 3 mm except 1.5 mm for a small package. Packaging layer/portion-pack requirements are also in section 1.2.1-6. FSANZ guidance points to the National Measurement Institute for package weights and measures; that legal-metrology domain is not replaced by the Food Standards Code.

The label workflow shall support:

- package dimensions, printable panels, surface area and small-package status;
- field-of-view grouping for ingredients and allergen summary;
- minimum warning size, contrast, language, typeface and prominence checks;
- package quantity, serving count and variable-weight facts;
- barcode, lot, date, supplier and artwork placeholders;
- a preflight report that identifies geometry or design checks that are not legally evaluated by the software;
- packaging-material evidence as a user-managed record, not an automatic declaration that the packaging is food-safe.

### 4.16 Characterising ingredients and components

**Regulatory baseline:** Standard 1.2.10 (SRC-010; ss 1.2.10-2 to -8 per the source register) and FSANZ guidance (SRC-027). Mapping confidence: Standard-level. The exact trigger wording, calculation formulae by food type and rounding rules must be pinned from the Federal Register text before any rule is written; they are not restated here.

In general terms, the proportion of an ingredient or component that characterises the food must be declared where the Standard's triggers apply (broadly: named in the food's name, emphasised in words, pictures or graphics, or essential to characterise the food), subject to exceptions.

| ID | Priority | Requirement |
| --- | --- | --- |
| CI-001 | Must | Capture each candidate characterising ingredient/component with the reason it is a candidate (named in product name, emphasised in text/image/graphic, essential to character, user-flagged). |
| CI-002 | Must | Suggest candidates only from deterministic signals (ingredient name tokens in the product name or claim text, user flags) and present them as `REVIEW REQUIRED` candidates. Image/graphic emphasis, consumer association and `essential to character` remain human judgement. |
| CI-003 | Must | Calculate the proportion on the basis required by Standard 1.2.10 using ingoing mass after recursive expansion of compound ingredients, showing each contributing path (for example tomato inside a sauce inside a pizza). Where the basis differs for dried, cooked, reconstituted or water-losing foods and is not yet pinned, return `REVIEW REQUIRED`. |
| CI-004 | Must | Support characterising components separately from ingredients, with separate declaration output. |
| CI-005 | Must | Record any exception relied on, with evidence. Without evidence the declaration is shown as required-candidate. |
| CI-006 | Must | Retain the unrounded value and apply the rounding rule pinned from the source for the declared value. |
| CI-007 | Should | Flag an approved declared percentage that no longer matches the recalculated value after a formulation, yield or specification change. |
| CI-008 | Must | The explanation shows the trigger, the calculation tree, the clause mapping confidence and the formulation stage used. |

### 4.17 General labelling item matrix

Summary of the items in the brief's general labelling area. `Mapping` is the confidence defined in 7.8. `Generated` and `Validated` describe intended software behaviour, not legal statements.

| Item | Mandatory? and conditions | Required data | Generated | Validated | Mapping |
| --- | --- | --- | --- | --- | --- |
| Food name / true nature | Yes; prescribed name where one exists (1.2.2-2) | Proposed name, descriptive name, class evidence | Candidates only | Presence; composition only where a name rule is supported (6.6) | Provision |
| Lot identification | Yes unless an exemption applies (1.2.2-3); exemptions not mapped here | Lot method/value | Template | Presence | Provision; exemptions unmapped |
| Supplier name and Australian/NZ address | Yes (1.2.2-4) | Business profile | Yes | Presence and completeness | Provision |
| Net quantity (weight/volume, units) | National trade measurement law, not the Code; Act/Regulations source-mapped in 7.8 | Pack measurement and units, variable-weight facts | Formatting suggestion | No; always `REVIEW REQUIRED` | Provision source-mapped; exact applicability and marking review-only |
| Ingredient statement | Most packaged foods; exemptions apply (Standard 1.2.4, Schedule 10) | Formulation | Yes | Order and names where inputs are complete | Provision source-mapped; R1 interpretation pending |
| Allergen declarations | Required declarations are triggered under 1.2.3-4 and S9-3, subject to exceptions | Allergen graph | Yes | Yes only where inputs and applicable exceptions are supported | Provision source-mapped; format/exceptions pending review |
| Date marking | Standard 1.2.5-3 and -4 apply subject to their scope and exemptions | Date type, shelf-life basis | Wording/format | Presence, consistency | Provision source-mapped; exemptions and shelf-life evidence pending |
| Storage and directions | Standard 1.2.6-2 triggers identified | Storage, preparation | Template | Missing-trigger warnings | Provision source-mapped; applicability facts require review |
| Nutrition Information Panel | Standard 1.2.8-5 and -6, subject to exemptions and other applicable provisions | Nutrient profile, serving data | Yes | Yes only where required inputs/evidence are complete | Provision source-mapped; exemptions, transition and rounding pending review |
| Characterising proportions | Where triggers apply (1.2.10) | See 4.16 | Calculation | Trigger = review | Standard |
| Warnings and advisories | Trigger-based (1.2.3-2, -3, S9-2) | Trigger attributes | Supported triggers | Only for a reviewer-approved, mapped trigger set | Provision source-mapped; full trigger coverage pending |
| Claims | Voluntary but regulated (1.2.7, S4) | Exact wording, evidence | No | Per 6.7 | Provision |
| GM / irradiation statements | Where applicable (1.5.2-4, 1.5.3-9) | GM/irradiation attributes | Yes | Yes where inputs are complete | Provision |
| Country of origin | Most retail foods (Information Standard 2016) | Origin facts | Profile-dependent | Review | Instrument |
| Importer details, barcodes | Not researched in this baseline | n/a | No | No | Unmapped |

### 4.18 Property propagation matrix

Applies to the chain atomic ingredient -> compound ingredient -> formulation -> product -> label. Each propagated value keeps its source path.

| Property | Propagation rule | Cannot be safely inferred |
| --- | --- | --- |
| Allergens and gluten | Union across all expanded ingredients, additives, carriers and processing aids where the Code applies. Sulphites are concentration-dependent (added at 10 mg/kg or more, per 4.4), so they are evaluated on the final food. | Exemption evidence, processing-aid carry-over, unknown allergen status, supplier `may contain` text |
| Additives | Per additive identity and purpose, mass-weighted sum across sources (6.5) | Function in the final food, carry-over status, GMP |
| Nutrients | Ingoing-mass-weighted, then adjusted by yield, loss/gain and state (6.1) | Unknown yield, unknown nutrient values |
| GM status | Union of GM-derived ingredients; threshold evaluated per ingredient | Intentionality, approved line, exemption evidence |
| Irradiation | Any irradiated ingredient or component carries to the compound ingredient and product | Dose, permission for the specific food |
| Origin | Ingoing weight by origin for the selected legal profile | Manufacturing transformation, evidence, claim impression |
| Declared name | Per-ingredient declaration name; Code generic/class names where permitted | Choice between several permitted names |
| Warnings/advisories | Trigger evaluated at final-product level from propagated attributes and concentrations | Unknown concentration |

### 4.19 Health Star Rating calculation engine

Supplements 4.9. HSR is a dedicated calculation engine whose tables must come from the official source, not from this document. Mapping confidence: guidance-only (official guide, not the Code).

| ID | Priority | Requirement |
| --- | --- | --- |
| HSR-001 | Should (Version 1) | Capture inputs per 100 g or 100 mL for the calculated state: energy (kJ), saturated fat, total sugars, sodium, protein, dietary fibre where the category uses it, and fruit/vegetable/nut/legume (FVNL) content (%), each with source and confidence. |
| HSR-002 | Should | The guide defines separate calculation categories (as understood in this baseline: non-dairy beverages, dairy beverages, foods, dairy foods, oils and spreads, cheese). The set, assignment rules and `as sold` / `as prepared` basis must be confirmed against the current guide. Category assignment is human-confirmed. |
| HSR-003 | Should | Process (conceptual): baseline points from energy, saturated fat, total sugars and sodium; modifying points from FVNL, protein and, where applicable, fibre; the final score is converted to a star rating through the category table, with the guide's rounding. Point thresholds, tables and rounding are not reproduced in this document and shall be loaded from the official guide/calculator at a pinned version. |
| HSR-004 | Should | FVNL content uses the guide's inclusion and concentration rules; ambiguous ingredient classification returns `REVIEW REQUIRED`. |
| HSR-005 | Should | Deterministic once category and inputs are pinned. The implementation shall be validated against the official calculator/workbook with fixture outputs; any divergence blocks release. |
| HSR-006 | Should | Eligibility: intended, permitted or excluded product (4.9). Special cases (mixed packs, foods prepared before eating, unusual categories) return `REVIEW REQUIRED` until mapped. |
| HSR-007 | Should | Presentation uses the official graphic variants and conditions at the pinned guide version; artwork is not user-drawn. |
| HSR-008 | Should | Persist the input snapshot, category, baseline and modifying points, star result, guide/calculator version and date, and show the components in the explanation. |

### 4.20 Interactions between nutrition, claims, NPSC and HSR

| ID | Priority | Requirement |
| --- | --- | --- |
| INT-001 | Must | Evaluation order is nutrient profile, then required NIP rows, then claims, then label content. A claim can add NIP rows (CALC-012), so adding or removing a claim triggers recalculation of NIP requirements. |
| INT-002 | Must | The NPSC (Schedule 5) and HSR are separate calculations with separate sources. Neither substitutes for the other: a good HSR does not make a health claim eligible, and an NPSC pass does not imply an HSR. |
| INT-003 | Must | An HSR display must be consistent with the NIP; differences are flagged. |
| INT-004 | Must | Product classification (for example special purpose food, alcohol, infant formula) can remove NIP, claim or HSR eligibility or add other labelling requirements. A classification change re-evaluates every dependent rule. |
| INT-005 | Should | Whether displaying an HSR alongside nutrition or health claims raises additional Standard 1.2.7 issues is not mapped here. Return `REVIEW REQUIRED` when both are present and list it as a regulatory review item. |

## 5. Functional requirements and domain concepts

### 5.1 Domain concepts

The following are conceptual records and behaviours, not a prescribed database design:

| Concept | Required meaning |
| --- | --- |
| Atomic ingredient | A material or substance with a name, supplier/source, composition, process state, regulatory attributes and nutrient evidence. |
| Supplier specification | A dated supplier-provided specification with contact, lot/product code, ingredients, allergens, nutrients, additives, origin, GM, irradiation, analytical method and supporting documents. |
| Compound ingredient | A named ingredient whose own formulation is recursively represented and can be expanded for declaration, allergen, nutrient and rule evaluation. |
| Formulation/recipe | A weighted set of ingredients and process steps with units, ingoing quantities, additions, losses/gains, target yield and intended food state. |
| Product | A marketable food derived from a formulation, with product identity, category, channel, package, serving, claims and label profile. |
| Batch scenario | A calculation context that may vary batch size, yield, supplier, analytical value or process loss without rewriting the approved product version. |
| Product version | Immutable snapshot of formulation, source evidence, classifications, labels, rules and approvals at a point in time. |
| Label profile | A jurisdiction/channel/package/effective-date context selecting applicable regulatory domains and output sections. |
| Regulatory source | Controlled source metadata for a Standard, schedule, instrument, guidance page, calculator or official artwork. |
| Rule | A versioned, testable evaluation with applicability, inputs, logic, severity, explanation and source references. |
| Claim | Exact wording and context, with type, target, reference food, evidence and required supporting values. |
| Compliance result | A status, rule/version, inputs, evaluation trace, explanation, source and suggested action. |
| Evidence | Document, certificate, lab result, supplier declaration, calculation or user decision with date, owner and provenance. |
| Review decision | Human acceptance, rejection, override or deferral with reviewer, rationale, date and affected version. |

### 5.2 Core functional requirements

| ID | Priority | Type | Requirement and acceptance intent |
| --- | --- | --- | --- |
| FR-001 | Must | Product | A user can create an Australian label profile with effective date, channel, package status, product state and selected regulatory scope. An acceptance test confirms applicable domains change when channel/package/effective date changes. |
| FR-002 | Must | Product | A user can create atomic ingredients and attach supplier specifications, nutrient evidence, allergen status, additive/processing-aid status, origin, GM and irradiation metadata. Missing required facts are visible. |
| FR-003 | Must | Product | A user can build nested compound ingredients and formulations using explicit quantities and units. Circular references are rejected before calculation. |
| FR-004 | Must | Product | The system preserves both expanded and unexpanded formulation views and shows the path from finished product to each source ingredient. |
| FR-005 | Must | Product | A user can record yield, process loss/gain, density, reconstitution, draining, preparation and serving/pack data. Calculations identify which state they use. |
| FR-006 | Must | Product | A user can generate a draft ingredient statement, allergen summary, warnings/advisories and NIP from a product version. Each output item links to its source inputs and rule. |
| FR-007 | Must | Product | A user can enter exact label claims and classify or defer them. The system never treats free text as cleared marketing copy. |
| FR-008 | Must | Product | The system provides a review queue for missing, stale, contradictory, low-confidence and human-review items. |
| FR-009 | Must | Product | The user can approve a product/label version only when required review gates are resolved or explicitly accepted by an authorised reviewer. The approval record explains remaining warnings. |
| FR-010 | Must | Product | Historical labels remain reproducible after source, ingredient, formulation or rule changes. |
| FR-011 | Should | Product | A user can compare two product versions, including changed ingredients, quantities, nutrients, allergen results, claims, sources and output text. |
| FR-012 | Should | Product | A review package exports the formulation snapshot, source register, calculations, findings, unresolved items, label output and approvals without exposing unrelated workspace data. |
| FR-013 | Should | Product | A user can import structured supplier data only after reviewing field mappings and source confidence. Import does not overwrite approved data silently. |
| FR-014 | Could | Product | A user can run batch-variance scenarios against a fixed product version to see nutrient, allergen, additive and claim impact. |

### 5.3 Data-quality requirements

| ID | Priority | Requirement |
| --- | --- | --- |
| DATA-001 | Must | Every quantitative input records value, unit, basis, state, source, date and confidence. |
| DATA-002 | Must | Every ingredient name has a declaration name, internal/common name and regulatory name mapping where applicable; ambiguity is preserved. |
| DATA-003 | Must | Nutrient, allergen, additive, origin, GM and irradiation values can be unknown; unknown is not coerced to zero or absent. |
| DATA-004 | Must | A source document may be superseded without being deleted, and the affected products are identified. |
| DATA-005 | Must | A user can see whether a value was supplied, measured, calculated, imported, assumed or manually overridden. |
| DATA-006 | Must | Unit conversion is explicit and testable. Mass, volume, density and yield conversions must not occur from a guessed density. |
| DATA-007 | Should | Data freshness policies identify values requiring supplier re-confirmation or review after a chosen period. |
| DATA-008 | Should | Contradictory supplier and laboratory values are retained with a selected basis and review rationale. |

## 6. Detailed calculation and rule requirements

### 6.1 Formulation and mass basis

| ID | Priority | Requirement |
| --- | --- | --- |
| CALC-001 | Must | Calculate ingoing mass and percentage for each direct and recursive ingredient without losing the source path. |
| CALC-002 | Must | Support process-state transitions: as added, as processed, as sold, as prepared, as reconstituted and as drained. |
| CALC-003 | Must | Apply declared yield and documented mass losses/gains to final nutrient and percentage results; unknown yield produces `REVIEW REQUIRED` where material. |
| CALC-004 | Must | Prevent double counting when a compound ingredient has both a supplier nutrient profile and expanded sub-ingredients unless the chosen basis is explicit. |
| CALC-005 | Must | Detect duplicate ingredient identities with different allergen/additive evidence and ask for resolution. |
| CALC-006 | Should | Support uncertainty ranges or scenarios for variable supplier data without presenting a false single precision. |

### 6.2 NIP and nutrient calculation

| ID | Priority | Requirement |
| --- | --- | --- |
| CALC-010 | Must | Apply Standard 1.2.8 and Schedule 11/12 to calculate the required base NIP for the selected food state. |
| CALC-011 | Must | Use per serving and per 100 g/100 mL columns and show serving count and serving size. |
| CALC-012 | Must | Add claimed nutrients, fatty acids, fibre, potassium, vitamin/mineral or other required rows when the selected claim/rule requires them. |
| CALC-013 | Must | Apply current significant-figure, `LESS THAN` and unit formatting rules, retaining unrounded calculation values for traceability. |
| CALC-014 | Must | Handle reconstituted, drained and prepared foods in accordance with the selected directions and disclose the basis in the NIP explanation. |
| CALC-015 | Must | Reject or review calculations where required analytical/evidence inputs are missing or where nutrient values use incompatible bases. |
| CALC-016 | Should | Support laboratory result import with method, sample, date, lab and product-version linkage. |

### 6.3 Additives and prescribed foods

| ID | Priority | Requirement |
| --- | --- | --- |
| REG-ADD-001 | Must | Evaluate additive permission against food category, purpose, source, level, preparation state and current Schedule 15 data; code number alone is insufficient. |
| REG-ADD-002 | Should | Evaluate shared-technological-purpose additive mixtures using the current applicable maximum-level method and show each contributor. |
| REG-ADD-003 | Must | Generate additive declaration using current class name and name/code-number mappings, with allergen inheritance. |
| REG-ADD-004 | Should | Evaluate permitted carry-over and distinguish it from an additive performing a function in the final food. |
| REG-ADD-005 | Must | Identify candidate prescribed food standards and either apply a supported rule or issue a review task with the missing classification facts. |
| REG-ADD-006 | Must | Do not generate a prescribed name, composition PASS or exemption solely from a free-text product name. |

### 6.4 Claims, HSR, GM, irradiation and origin

| ID | Priority | Requirement |
| --- | --- | --- |
| REG-CLAIM-001 | Must | Classify and evaluate supported nutrition content claims using Standard 1.2.7 and Schedule 4 conditions. |
| REG-CLAIM-002 | Must | Require a reference food and difference for comparative claims and show both values. |
| REG-CLAIM-003 | Must | Evaluate health-claim eligibility, NPSC, food form, wording, dietary context and evidence; unsupported scientific/legal judgement returns `REVIEW REQUIRED`. |
| REG-CLAIM-004 | Should | Evaluate NPSC with versioned Schedule 5 inputs and reveal the score components. |
| REG-HSR-001 | Should | Calculate HSR only with the current official calculator/guide version and preserve the category/input/output snapshot. |
| REG-HSR-002 | Should | Check current intended/excluded product rules and return `INFORMATIONAL` or `REVIEW REQUIRED` where HSR is voluntary or uncertain. |
| REG-GM-001 | Should | Evaluate approved GM source, novel DNA/protein, intentionality and the current 10 g/kg exemption under Standard 1.5.2-4. |
| REG-GM-002 | Should | Generate the required `genetically modified` statement and distinguish it from voluntary `GM free` or `non-GM` claims. |
| REG-IRR-001 | Should | Evaluate permitted irradiation category, purpose, dose evidence, inheritance and the required ionising-radiation statement. |
| REG-ORIGIN-001 | Should | Apply an origin profile from the current Country of Origin Information Standard and ACCC guidance, including priority/non-priority and ingoing-weight evidence. |
| REG-ORIGIN-002 | Should | Treat origin claims as subject to ACL truth/misleading review even when the standard-mark calculation passes. |

### 6.5 Additive calculation and validation

| ID | Priority | Requirement |
| --- | --- | --- |
| ADD-001 | Must | An additive is a first-class record: name, Code number (Schedule 8), class name (Schedule 7), technological purpose(s) (Schedule 14), source form where limits are expressed as equivalents, concentration, unit and basis. E-number labelling is not assumed valid for Australian labels; declarations use the Code's names and code numbers. |
| ADD-002 | Must | An additive may have several permitted purposes. Permission is evaluated for the purpose declared for the final food; a purpose not listed for the food category returns `FAIL` or `REVIEW REQUIRED` according to mapping confidence. |
| ADD-003 | Must | Permission inputs: Code food category, purpose, additive identity, food state (as sold, prepared, reconstituted; 1.3.1-4), whether the limit is `GMP`, and limit basis (mg/kg, mg/L or other; equivalents). Missing input returns `REVIEW REQUIRED`. |
| ADD-004 | Must | Final concentration of each additive = sum over every source i of (ingoing mass of source i x additive concentration in source i) / mass of the final food in the state the limit applies to. Sources include direct ingredients and expanded compound ingredients. The same additive from several sources is summed. An unknown source concentration returns `REVIEW REQUIRED`, never zero. |
| ADD-005 | Must | Unit conversion is explicit (mg/kg, %, g/100 g; mass-to-volume only via a recorded density). Processing losses change the final mass only with documented yield. |
| ADD-006 | Must | Different additives sharing a technological purpose are evaluated under the mixture rule only where 1.3.1-6 applies, showing every contributor (REG-ADD-002). |
| ADD-007 | Must | Carry-over is classified (carried over, added for function, processing aid) by the user with evidence. Whether the carry-over provisions permit the presence is `REVIEW REQUIRED` until the provision is mapped. |
| ADD-008 | Must | The explanation shows calculated value, per-source breakdown, maximum permitted with basis, food category, the Schedule row, mapping confidence and, for `REVIEW REQUIRED`, why. |
| ADD-009 | Must | Declaration: class name plus name or code number per Schedules 7 and 8, in ingredient-order position, including within compound ingredients. Where several naming options exist the user confirms the choice. |
| ADD-010 | Must | Food-category assignment, `GMP` status, equivalents and processing-aid classification are human-confirmed. The software never infers permission from a code number alone. |

Turn 3 provides capture groundwork for ADD-001, ADD-004 and ADD-007: ingredient
drafts store additive identity, source code, source-described purposes,
concentration with explicit unit and basis, dated source references, and a
user-recorded source status. Formulation expansion carries those records with
their nested ingredient paths. This does not evaluate concentration, additive
permission, declaration, carry-over or processing-aid conditions. Missing
details remain absent or unknown and must not be interpreted as zero or as a
favourable result.

Turn 4 provides review-only declaration groundwork for REG-ADD-003 and
ADD-009. The draft rule release contains the Schedule 7 prescribed/optional
class-name table and both Schedule 8 S8-2 listings, preserving source wording,
order, code dashes and four differences between the listings. The Code does
not assign Schedule 8 additives to Schedule 7 classes; mappings remain empty.
The workspace captures a user-selected declaration route and name/code choice
and traces additive allergen evidence through nested ingredient paths. Every
wording candidate remains `REVIEW REQUIRED`; this does not evaluate permission,
select the most appropriate class, or produce a final ingredient declaration.

Turn 5 adds a versioned, source-linked draft permission catalog for candidate
Schedule 15 classes in formulated caffeinated beverages and foods for infants.
It preserves Schedule 15 row text and conditions, Schedule 14 purpose
vocabulary, Schedule 16 type-level candidates, and verified Standard 1.3.1
calculation bases without inferring an additive identity, purpose, class
inheritance or permission result. Stale source metadata, missing category
references, ambiguous categories, unsupported conditions and invalid limits
are rejected. The catalog is not active; the apparent infant-food INS 414
maximum remains explicitly unverified. This is data and validation groundwork
for ADD-001 through ADD-003, ADD-008 and ADD-010, not permission evaluation or
a compliance result.

Turn 6 adds a pure evaluator for ADD-002, ADD-003 and ADD-008 that returns a
trace. It yields PASS or FAIL only for a reviewed, unconditional,
non-aggregated row selected under a person-confirmed category at
Provision-level confidence; every other case, including a missing row, is
`REVIEW REQUIRED`. Conditions are listed, not evaluated. Against the shipped
draft catalog every result is `REVIEW REQUIRED`; this is not a compliance
conclusion.

### 6.6 Prescribed-name validation

REG-ADD-005 and REG-ADD-006 in 6.3 are realised by NAME-001 to NAME-003.

| ID | Priority | Requirement |
| --- | --- | --- |
| NAME-001 | Must | Workflow: proposed name -> candidate rule identification -> required-fact collection -> comparison -> `PASS`, `FAIL` or `REVIEW REQUIRED`. Candidate identification is a review prompt. `No candidate found` is reported as `no prescribed-name rule identified`, never as a PASS. |
| NAME-002 | Must | Each prescribed-name rule records: trigger terms and exclusions; food class; required formulation data; compositional requirements (minimum/maximum, required or prohibited ingredients, processes, permitted additives, descriptors, alternative names); whether deterministic; warnings produced; items needing human judgement; source and provision; mapping confidence. |
| NAME-003 | Must | Automation is enabled per rule only after its provisions are mapped and expert-reviewed (14.3). Otherwise the rule is review-only with a source link. |
| NAME-004 | Must | Descriptors and qualifiers in the name text (for example `fresh`, `style`, `flavoured`) are tracked and never automatically cleared. |
| NAME-005 | Must | Result text shows requirement and current formulation side by side (see 7.7). |
| NAME-006 | Should | Show consequences of non-compliance as context only: enforcement is under state and territory food legislation and, for misleading names, the Australian Consumer Law. Specific penalties are not mapped here and are a legal review item. |
| NAME-007 | Must | Not automatable: true-nature judgement, fish names (AS 5300 context), consumer perception and imagery, mixed or novel foods, and any class without a mapped rule. |
| NAME-008 | Should | The first supported classes for Version 1 are chosen by the product owner and reviewer from those in 4.6; none is committed here. |

### 6.7 Claims rule representation and gating

| ID | Priority | Requirement |
| --- | --- | --- |
| CLAIM-001 | Must | A claim is a structured, versioned rule record, not UI text: name and permitted wording variants; category; nutrient or property; thresholds; conditions (food form, per serve or per 100 g/mL); applicable and excluded food categories; mandatory accompanying statements; required NIP rows; source provision; effective-from/to; deterministic flag; mapping confidence. |
| CLAIM-002 | Must | Permitted descriptor sets are stored per rule. Wording not in the set returns `REVIEW REQUIRED` (neither PASS nor FAIL) because equivalence is a judgement. |
| CLAIM-003 | Must | Evaluation: selected claim -> rule record -> required inputs -> comparison -> result, plus gating conditions: prohibited contexts (1.2.7-4, -5), food form (1.2.7-7), NPSC for health claims, reference food, supporting NIP rows and accompanying statements. |
| CLAIM-004 | Must | A claim whose nutrient threshold is met but which fails another condition is never a PASS. The result lists every condition as a checklist with its own status and names the blocking condition. Overall status is the worst of the conditions. |
| CLAIM-005 | Must | Claims not regulated by the Code (for example `natural`, `organic`, `fresh`, `vegan`, `halal`, sustainability claims, general `free from`) return `REVIEW REQUIRED` with Australian Consumer Law context. Their sources are not mapped in this baseline. |
| CLAIM-006 | Must | Each claim result records the claim text exactly as entered and its classification; the classification is human-confirmed when ambiguous. |

| Claim family | Examples | Source mapping | Automatable |
| --- | --- | --- | --- |
| Nutrition content (absence, low, reduced, source, high; energy, protein, fibre, sodium, fat, sugars) | `low fat`, `good source of fibre`, `low sugar` | 1.2.7-11 to -16; Schedule 4 S4-3. Thresholds must be pinned into rule data from source and are not reproduced here. P1063 added-sugar changes apply on transition (3.4) | Yes when nutrient values are complete |
| Comparative | `reduced fat`, `light` | 1.2.7 and S4-3 | Yes given a reference food; choice of reference is human |
| Gluten and similar | `gluten free` | Schedule 4 conditions | Partly; analytical evidence is human |
| General level health claim | Pre-approved relationship | 1.2.7-18 to -22; S4-5; NPSC (S4-6, S5) | Partly; wording and dietary context are human |
| High level health claim | Pre-approved relationship | S4-4; NPSC | Partly |
| Self-substantiated relationship | Notified relationship | Schedule 6; FSANZ business guidance | No; review-only |
| Other (endorsement, origin, quality, natural, organic) | See CLAIM-005 | Australian Consumer Law; not mapped | No |

### 6.8 Ingredient, supplier specification, formulation and product records

#### Ingredient record

| ID | Priority | Requirement |
| --- | --- | --- |
| ING-001 | Must | Identity: internal identifier, name, declared name, regulatory-name mapping, category, notes. Supplier data comes from supplier specifications (SPEC-001). |
| ING-002 | Must | Nutrition on a stated per 100 g or 100 mL basis. Required NIP nutrients (1.2.8-6): energy (kJ), protein (g), fat total (g), saturated fat (g), carbohydrate (g), sugars (g), sodium (mg). Valuable additional fields: dietary fibre (g), trans fat, monounsaturated and polyunsaturated fat (g), potassium and other vitamins/minerals (units per the Code), moisture (g), alcohol (g), polyols (g), starch (g), added sugars. Each value has an evidence type and may be unknown. |
| ING-003 | Must | Regulatory attributes: allergens (controlled vocabulary) and gluten status, GM status, irradiation, origin, special warnings and advisory triggers, processing-aid and novel-food flags. |
| ING-004 | Must | Additives are first-class records (ADD-001) attached to the ingredient with concentration, unit, basis and evidence, not flags. |
| ING-005 | Must | Physical state (raw, cooked, dried, drained) and density where volume is used. |
| ING-006 | Could | Commercial data such as price is excluded from all compliance rules. |

#### Supplier specification

| ID | Priority | Requirement |
| --- | --- | --- |
| SPEC-001 | Must | A supplier specification is separate from the ingredient. An ingredient has one or more specifications; a formulation references a pinned specification version. |
| SPEC-002 | Must | A specification records supplier, product code, specification version and date, effective-from/to, status (draft, active, superseded), supporting documents and all data blocks (nutrition, allergens, additives, GM, irradiation, origin). |
| SPEC-003 | Must | Several suppliers per ingredient are supported, with the active specification chosen per formulation and alternatives comparable. |
| SPEC-004 | Must | Replacing a specification creates a new version. Approved products are unaffected; impacted products are listed; re-evaluation creates a new draft version. |
| SPEC-005 | Must | A specification diff highlights changes to allergens, additives, GM, irradiation, origin and nutrients. Regulatory and additive information can change between specifications; regulatory-attribute changes are high severity. |
| SPEC-006 | Should | Stale specifications are flagged under the freshness policy (DATA-007). |

#### Formulation

| ID | Priority | Requirement |
| --- | --- | --- |
| FORM-001 | Must | Each line records the ingredient or compound-ingredient reference (pinned version), quantity, unit, basis, preparation state, processing step and notes. |
| FORM-002 | Must | Formulation-level data: batch size, target yield, loss/gain by step, water loss/gain, expected final state, serving size and servings per pack. |
| FORM-003 | Must | Mass and percentage are both shown; where the user enters percentages the total must reconcile or a warning is shown. |
| FORM-004 | Must | Circular references are prevented: (a) when a reference is added, compute the transitive closure of the referenced graph and reject the edit if the edited item is reachable; (b) repeat the check on import, restore, merge and sync; (c) show the cycle path; (d) references to approved immutable versions cannot form cycles, but the check still runs. A configurable nesting-depth warning is a usability aid, not a legal rule. |
| FORM-005 | Must | Properties propagate as in 4.18, with expanded and unexpanded views. |
| FORM-006 | Must | Version history applies; approved versions are immutable (VER-002). |

#### Product

| Field | Class | Notes |
| --- | --- | --- |
| Product name; proposed food designation | Required | Feeds the name rules (6.6) |
| Formulation (pinned version) | Required | |
| Product category and classification | Required | Human-confirmed; drives which rules apply |
| Market channel and label profile | Required | FR-001 |
| Pack weight or volume, units | Required | Legal metrology review (4.17) |
| Serving size, servings per pack | Conditionally required (NIP) | Calculated suggestion, user-confirmed |
| Packaging type, label dimensions, orientation | Optional for content; required for preview and export | 8.4 |
| Characterising ingredients | Conditionally required | Suggested, then confirmed (4.16) |
| Claims | Optional | Exact wording (6.7) |
| Storage and preparation instructions | Conditionally required | Trigger-based (4.13) |
| Business information | Required | From business profile |
| Country-of-origin information | Conditionally required | User-supplied with evidence |
| Date marking and lot | Required or conditional | User-defined values (4.2, 4.13) |
| Ingredient statement, allergen summary, NIP, additive declarations | Automatically calculated | Reviewed, not hand-typed |
| HSR | Optional, calculated | 4.19 |
| GM and irradiation statements | Automatically calculated when applicable | 4.10, 4.11 |
| Other mandatory information | Rule-driven | Product-class specific |

## 7. Compliance engine, regulatory data and explainability

### 7.1 Rule evaluation contract

Every rule evaluation shall expose:

1. rule identifier and human-readable name;
2. regulatory source identifier and direct URL;
3. instrument/Standard/schedule and exact clause, section, table or provision;
4. jurisdiction, effective-from date, effective-to date if any, compilation/version and transition status;
5. applicability conditions and exclusions;
6. required inputs and their provenance/freshness;
7. calculation/evaluation steps and unrounded intermediate values where relevant;
8. result status and severity;
9. explanation in plain language, including what was checked, what was found and why;
10. suggested action and responsible reviewer type;
11. dependencies on other rules/calculations;
12. automated test identifiers and fixture/version;
13. whether the result is deterministic, evidence-dependent, advisory or human-review-only.

### 7.2 Traceability chain

The minimum trace chain is:

`Regulatory source -> specific provision -> regulatory requirement -> software rule -> required data -> calculation/evaluation -> compliance result -> user explanation -> automated test`

No rule is ready for production unless every link exists or the missing link is explicitly marked as an unresolved design/research item.

### 7.3 Result semantics

| Status | Meaning | User action |
| --- | --- | --- |
| PASS | The rule was applicable, inputs were sufficient and the deterministic condition was satisfied. | Review evidence and proceed to other gates. |
| FAIL | The rule was applicable and a deterministic condition was not satisfied. | Correct data/formulation/label or obtain regulatory advice. |
| WARNING | A condition may require attention or a risk is present, but the rule does not establish a failure. | Investigate and record decision. |
| REVIEW REQUIRED | Missing/uncertain data, classification, source, evidence, interpretation or human judgement prevents a reliable conclusion. | Assign qualified review; do not treat as PASS. |
| INFORMATIONAL | Source, context, voluntary feature or non-deterministic note is shown without a compliance conclusion. | Read context; no automatic release decision. |

### 7.4 Rule metadata requirements

| ID | Priority | Requirement |
| --- | --- | --- |
| TRACE-001 | Must | Each rule has a stable identifier, title, domain, owner, status, source references, version and effective dates. |
| TRACE-002 | Must | Each rule declares required inputs, units, accepted evidence types, missing-data behaviour, applicability and exclusions. |
| TRACE-003 | Must | Each rule identifies whether it can produce PASS/FAIL, WARNING, REVIEW REQUIRED or INFORMATIONAL. |
| TRACE-004 | Must | Each rule result links to exact input values and source versions used at evaluation time. |
| TRACE-005 | Must | A rule update produces a diff, affected-rule list, changed fixtures and impact list for approved products. |
| TRACE-006 | Must | Historical results retain the rule version and source compilation used; they are not recomputed in place. |
| TRACE-007 | Must | Human overrides require reviewer identity, reason, evidence and expiry/re-review date. An override cannot convert an unknown regulatory fact into a legal PASS without an explicit reviewer decision. |
| TRACE-008 | Must | Explanations use plain language and identify the suggested action without saying that the software certifies compliance. |
| TRACE-009 | Should | The system can produce a machine-readable trace export for engineering tests and a human-readable report for review. |
| TRACE-010 | Should | A regulatory-data release is independently reviewable before rules are enabled for new evaluations. |

### 7.5 Regulatory data lifecycle

1. Monitor FSANZ Gazette notices, Federal Register compilation changes, FSANZ guidance, ACCC guidance and HSR updates.
2. Record candidate source and change reason.
3. Compare old/new provisions and identify effective dates, transition and stock rules.
4. Draft or update rule metadata and fixtures.
5. Obtain regulatory review for interpretation and coverage.
6. Run unit, property, regression and golden-label tests.
7. Publish the release with a changelog and affected-product report.
8. Keep historical versions available for reproducibility.

### 7.6 Rule application modes and rule-metadata extensions

Every result records how its rule was applied, so a source shown for context is never mistaken for an evaluation.

| Mode | Meaning | Allowed results | Example |
| --- | --- | --- | --- |
| APPLIED | Rule automatically evaluated with complete inputs and sufficient mapping | PASS, FAIL, WARNING | Allergen summary generation |
| CANDIDATE | Rule or source identified as potentially relevant; applicability or facts need human confirmation | REVIEW REQUIRED | Prescribed-name candidate |
| CONTEXT | Source presented for information only; no evaluation | INFORMATIONAL | FSANZ guidance link |
| UNDETERMINABLE | The software cannot reliably determine the requirement | REVIEW REQUIRED | Origin transformation, claim imagery |

| ID | Priority | Requirement |
| --- | --- | --- |
| TRACE-011 | Must | Each result records and shows its application mode. |
| TRACE-012 | Must | No citation, source link or PASS states or implies legal certification. Reports carry a fixed statement to that effect. |
| TRACE-013 | Must | Each rule carries machine-readable conditions and human-readable text from one source of truth, so the explanation cannot drift from the evaluation. |
| TRACE-014 | Must | Rule metadata includes at least: identifier, name, instrument, Standard number/name, clause or provision, schedule/table, source URL, jurisdiction, effective-from/to, version, human-readable explanation, machine-readable conditions, failure severity, deterministic flag, human-review-required flag and mapping confidence. |
| TRACE-015 | Must | Mapping confidence is one of Provision, Standard, Instrument, Guidance-only or Unmapped. A rule below Provision confidence cannot produce a deterministic FAIL unless a reviewer approves it; it may produce WARNING or REVIEW REQUIRED. |
| TRACE-016 | Must | Rules declare dependencies (for example a claim rule depends on the NIP calculation and food classification). The result shows upstream results, and a failing or unknown upstream result makes dependent results REVIEW REQUIRED, never PASS. |
| TRACE-017 | Must | Calculations that use several sources (for example NPSC: Schedules 4 and 5 plus nutrient data) list each source with its version. |
| TRACE-018 | Must | An audit view reconstructs, for any result: what was checked, the rule and version, the inputs, the result, the source, and the test that covers it. |

### 7.7 Result content contract

This is a content requirement, not a UI design. Every result shows: title, status, application mode, what was checked, rule identifier and version, regulatory basis (instrument, Standard/Schedule, clause/table, effective date or compilation), source link, inputs used with units and provenance, mapping confidence, and the non-certification statement.

| Status | Additional content |
| --- | --- |
| PASS | The requirement met and the evaluated value |
| FAIL | The requirement, current value, required value, suggested action, severity (release-blocking or not), whether an override is permitted |
| WARNING | The condition, the risk and the suggested action |
| REVIEW REQUIRED | Why review is needed (missing data, ambiguity, judgement), who should review, and what evidence would resolve it |
| INFORMATIONAL | The context note and the source |

Acceptance examples (placeholders to be filled from rule data):

- Claim: `Claim requires review`; the product does not meet the conditions; regulatory basis (Standard/clause); why (calculated value against threshold); source.
- Additive: `Additive exceeds permitted level`; calculated mg/kg with per-source breakdown; maximum mg/kg for the food category; regulatory basis (Standard/Schedule/row); source.
- Prescribed name: `Prescribed name requirements not satisfied`; regulatory basis; requirement; current formulation; source.

Overrides: only an authorised reviewer may override a FAIL or REVIEW REQUIRED, with a recorded reason and evidence (TRACE-007). The override is visible in exports and never alters the computed result.

### 7.8 Source-mapping register

P0-5 source check performed 2026-11-06 against the Federal Register of Legislation (FRL) for the MVP provisions listed below, with the official Victorian legislation register and National Measurement Institute guidance for the out-of-Code context. The source/version details and remaining version gaps are recorded in `docs/implementation-plan.md` section 11. Mapping confidence means the source has been mapped to a provision; it is not legal advice, a complete applicability analysis, deterministic-rule approval, or reviewer sign-off. R1 interpretation questions remain open. No rule is approved for implementation solely by this table.

| MVP domain/rule family | Mapping confidence | Primary provision mapping | Version/effective-date and transition note | Automation limit / reviewer boundary |
| --- | --- | --- | --- | --- |
| Label applicability, required information and legibility | Provision | Standard 1.2.1, including ss 1.2.1-2, -4 to -9; -24 general legibility; -25 warning statement type size. | Standard 1.2.1 compilation F2026C00538 (C13), 2026-06-09. P250 caffeine transition ends 2028-06-09. | Section -24 requires English words, legibility, prominence and distinct contrast; section -25 sets warning statement type size at least 1.5 mm for small packages and 3 mm otherwise. Product/package applicability, exceptions and physical print guard still need reviewer confirmation (R1-21). |
| Food name, supplier identification and lot presence | Provision | Standard 1.2.2, ss 1.2.2-2 (name of food), -3 (lot identification) and -4 (name and address of supplier). | F2024C00726 (C01), 2024-07-22 | Presence can be checked as data, but legal sufficiency of the chosen name, supplier/address facts, lot form and exemptions need R1-16/R1-17. |
| Ingredient statement and ingredient ordering | Provision mapping for identified provisions; nested/exception application pending | Standard 1.2.4, ss 1.2.4-2/-3 (statement/listing), -4 (ingredient naming), -5 (descending ingoing-weight order and compound ingredients); Schedule 10; dependencies on formulation mass and Standard 1.2.3 allergen declarations. | Standard F2025C00914 (C02), 2025-09-02; Schedule 10 F2021C00203 (C04), 2021-02-25. | Clause text is mapped, but its application to nested formulations, calculation stages, water/volatile quantities and permitted-name choice remains R1-01 to R1-04. |
| Allergen declaration and ingredient-list allergen treatment | Provision mapping for the mandatory declaration; format/exemption mapping incomplete | Standard 1.2.3, s 1.2.3-4; Schedule 9, including S9-3; interaction with Standard 1.2.4. | Standard F2024C01143 (C06), 2024-10-29; Schedule 9 F2021C00195 (C02), 2021-02-25. The earlier draft records a P1044 transition end date of 2026-02-25; the operative transitional/stock text was not rechecked clause-by-clause here, so R1-10 remains pending. | Allergen identity, exact names/format, derivative/exemption evidence and precautionary statements require reviewer decisions. R1-05 to R1-10 remain pending. |
| Mandatory warnings/advisory statements | Provision mapping for identified Standard/Schedule triggers; coverage of all triggers not verified | Standard 1.2.3, ss 1.2.3-2 and -3; Schedule 9, especially S9-2; relevant product-specific standards may add triggers. | Standard F2024C01143 (C06), 2024-10-29; Schedule 9 F2021C00195 (C02), 2021-02-25; Standard 1.2.1 has a P250 caffeine transition ending 2028-06-09. | Trigger concentration, product identity and completeness of the schedule-to-rule mapping require review; only reviewer-approved controlled triggers may be evaluated in MVP. R1-19 and R1-22 remain open. |
| Date marking and storage/use directions | Provision for identified date/storage triggers; not all exceptions or triggers mapped | Standard 1.2.5, ss 1.2.5-3 and -4; Standard 1.2.6, s 1.2.6-2. | Standard 1.2.5 F2021C00660 (C03), 2021-06-03; Standard 1.2.6 F2015L00393, effective 2016-03-01 (no later compilation shown on the record checked). | Presence does not establish correct use-by/best-before classification, shelf-life evidence, storage trigger or exemption. R1-18/R1-19 remain pending. |
| NIP applicability, required information, calculation and format | Provision-level source mapping for the cited sections and schedules; reviewer approval/evidence policy pending | Standard 1.2.8, ss 1.2.8-5 to -7 and -11 to -13; Schedules 11, 12 and 13; depends on product state and required nutrient inputs. | Standard F2026C00411 (C06), 2026-04-30; S11 F2024C01138 (C06), 2024-10-29; S12 F2017C00342 (C02), 2017-04-13; S13 F2021C00621 (C02), 2021-06-03. | Calculation method and panel schedule are mapped, not reviewer-approved. Exemptions, evidence policy, serving/prepared/drained state and rounding remain R1-11 to R1-15. The existing baseline flags an alcohol energy-labelling transition; its precise provisions, applicability and dates are TO BE VERIFIED. Rounding must not be implemented from this mapping alone. |
| Net quantity / measurement marking | Provision for national legal-metrology source mapping; software conclusion remains review-only | National Measurement Act 1960, ss 18JA-18JC; National Trade Measurement Regulations 2009, pt 4 (regs 4.3-4.16A) and Sch 5 | Act C2024C00648 (C22), 2024-10-14; Regulations F2024C00311 (C08), 2024-03-20; NMI/Department guide updated 2025-11-27 | Applicability/exemptions, unit, quantity accuracy, measurement method, placement and type-size requirements are outside the Code and not automated. R1-20 is unresolved. |
| Victorian application of the Code | Provision | Food Act 1984 (Vic), s 16(1)-(4) | Version 119, effective 2026-07-01 | Context for Code duties/enforcement only; not a separate label check or compliance certification. R1-27 remains unanswered. |
| Victorian local rules, consumer law, packaging and privacy | Unmapped for MVP rules | Prior “Food Regulations 2015 (Vic)” title not resolved; official register shows Food (Forms and Registration) Regulations 2025 (SR 96/2025) and Food (Primary Production and Processing) Regulations 2025 (SR 1/2025). ACL/Fair Trading, environment/container-deposit and privacy rows not clause-checked. | Current 2025 Victorian food regulations listed as in force from 2025-11-17 and 2025-02-11 respectively. | Not evaluated as MVP label rules. Exact 2015 instrument identity/status and application of other state instruments remain TO BE VERIFIED/TO BE RESEARCHED. R1-27 remains unresolved. |
| Additives, prescribed names, claims, HSR, GM, irradiation, origin and characterising ingredients | Not reassessed in P0-5 | Existing non-MVP mappings retained below; use the relevant future-phase review steps | Not refreshed in this P0-5 pass | Excluded from the MVP rule evaluation by plan D1; not a conclusion that no legal obligations apply. |

The word `Provision` in this table is source-mapping confidence only. A mapping below Provision confidence must not produce deterministic FAIL (TRACE-015); even Provision-level mapping does not resolve an R1 interpretation question or confer reviewer approval. Mapping and explanatory strings must be linked to the exact source compilation and effective date used for any later rule release (TRACE-014, RDM-002).

The following non-MVP rows are retained from the earlier baseline and were not re-verified in P0-5:

| Domain | Prior mapping confidence | Multiple provisions and dependencies | Change or transition | Why automation is limited |
| --- | --- | --- | --- | --- |
| Additives | Provision (declaration); Standard (category mapping) | 1.3.1-3, -4, -6; S7, S8, S14 to S16; 1.2.4; 1.3.3 | Schedule data changes by amendment | Food-category assignment, carry-over, GMP |
| Prescribed names | Standard | 1.2.2-2 plus each Chapter 2 standard | Varies by standard | Classification, true nature; no-candidate is not PASS |
| Nutrition content claims | Provision | 1.2.7-4, -5, -7, -11 to -16; S4; 1.2.8 rows | P1063 transition to 2028 and 2030 | Wording equivalence, food form |
| Health claims | Provision | 1.2.7-18 to -22, -25, -26; S4, S5, S6 | None identified | Evidence, self-substantiation |
| Characterising ingredients | Standard | 1.2.10; 1.2.4 | 2018 compilation | Emphasis and consumer perception |
| HSR | Guidance-only | Official guide v9.1 and calculator | v9.1 from Sept 2026 | Category and FVNL classification; licence |
| GM | Provision | 1.5.2-3, -4; Schedule 26 | Schedule 26 compilation 38; P1055 definitions | Intentionality, exemption evidence |
| Irradiation | Provision | 1.5.3-3 to -9 | None identified | Dose evidence |
| Country of origin | Instrument | Information Standard 2016; ACCC guidance | Verify current compilation | Transformation, evidence |

### 7.9 Regulatory data management requirements

| ID | Priority | Requirement |
| --- | --- | --- |
| RDM-001 | Must | Classify content as structured data (allergen vocabulary, additive names/numbers/classes, tabular permissions and maximum levels, Schedule 4 thresholds, NPSC and HSR tables, energy factors, advisory triggers, prescribed-name register) or free-text guidance (exemptions needing judgement, true nature, emphasis, wording equivalence). Guidance is linked and drives `REVIEW REQUIRED`, not PASS/FAIL. |
| RDM-002 | Must | Time-varying data (Code amendments, schedules, guidance, HSR guide and calculator, ACCC guidance) is released as versioned datasets with effective date, source compilation identifiers, changelog and reviewer. |
| RDM-003 | Must | The same dataset release produces identical results however it is delivered. The product works offline with the last installed release. Releases are integrity-protected and verifiable (requirement, not mechanism). |
| RDM-004 | Should | Data releases can be published independently of application releases. Whether a Code change requires an application release (new rule types) is an open question for the architecture phase. |
| RDM-005 | Must | Existing products are not silently re-evaluated. The user is told when a release affects them, can run an impact analysis, and re-evaluation creates a new result. Transitional dates are honoured through effective dates. |
| RDM-006 | Must | Licence terms for official calculators and artwork are recorded and respected. |
| RDM-007 | Should | Releases move through draft, reviewed, published, superseded or withdrawn. A defective release can be withdrawn with affected-product notification. |
| RDM-008 | Must | Every dataset row links to its source provision; there are no orphan rows. |

## 8. Label generation and packaging requirements

### 8.1 Output sections

The label generator shall support configurable sections for:

- food name and prescribed/description wording;
- net quantity and package/serving facts;
- statement of ingredients;
- bold allergen highlighting and `Contains` summary;
- nutrition information panel;
- characterising ingredient/component percentages;
- date mark, lot and supplier;
- storage, directions, preparation and use information;
- mandatory warnings and advisory statements;
- GM and irradiation statements;
- country-of-origin information;
- approved claims and required supporting context;
- optional HSR graphic and associated nutrient declarations;
- user-controlled commercial text clearly distinguished from required content.

### 8.2 Label acceptance gates

Before a label version can be marked `ready for human approval`, the system shall show:

- all applicable required sections and their source rules;
- no unresolved `FAIL` in a release-blocking rule;
- all `REVIEW REQUIRED` items assigned or explicitly accepted by an authorised reviewer;
- data and source versions used;
- generated text and artwork placeholders;
- legibility/field-of-view preflight result;
- an explicit notice that final legal/regulatory review remains with the business.

### 8.3 Output integrity

The generated label must be deterministic for the same product snapshot, label profile, regulatory release and formatting settings. A change to any of those inputs must be visible in the version comparison. Manual artwork edits outside the system must be attachable as evidence and must trigger a comparison/review step.

### 8.4 Packaging and layout requirements

Legally prescribed presentation is in 4.15 (English, legibility, prominence, contrast, warning type size, field of view, NIP format in Schedule 12). Everything below is product and design functionality unless stated.

| ID | Priority | Requirement |
| --- | --- | --- |
| PACK-001 | Must (MVP) | Custom label width and height (mm), orientation and margins; single-panel layout with required content blocks; PDF export at exact physical size. |
| PACK-002 | Should (Version 1) | Multiple panels (front, back, side); front-of-pack content (name, net quantity, HSR) separate from back-of-pack content; bleed and safe margins; dimension presets for box, pouch, bottle and jar. |
| PACK-003 | Could | Wrap-around labels, print sheets and imposition, die-lines, barcodes, SVG/vector export. |
| PACK-004 | Must | The generator never silently shrinks legally required text below the minimum size; overflow produces a visible WARNING or FAIL. |
| PACK-005 | Must | Exports carry product version, rule release, timestamp and the non-certification statement in the report (not on the label), and PDF generation is deterministic. |

## 9. Versioning and immutable history

| ID | Priority | Requirement |
| --- | --- | --- |
| VER-001 | Must | Ingredients, supplier specifications, formulations, products, claims, labels, rules, sources and review decisions are versioned. |
| VER-002 | Must | Approved versions are immutable; edits create a new draft/version. |
| VER-003 | Must | A label result records the exact dependency versions and rule/source release. |
| VER-004 | Must | A source or ingredient change identifies affected products and labels. |
| VER-005 | Must | The system supports effective dates and transition profiles independently of record creation date. |
| VER-006 | Must | A product can be reproduced as it existed at a historical date, subject to retained source documents. |
| VER-007 | Should | A release can be marked superseded, withdrawn, recalled or archived without deletion. |
| VER-008 | Should | Human approvals expire or require re-review when a material dependency or regulatory rule changes. |
| VER-009 | Must | An ingredient or specification edit never changes a pinned historical product. Formulations reference versions, and the user chooses when to adopt a newer one. |
| VER-010 | Must | When a regulation or rule release changes, existing approved results are retained and flagged for re-evaluation; re-evaluation produces a new result under the new release. |

## 10. SaaS, local-first data, security and recovery

### 10.1 Local-first privacy requirements

Formulas, quantities, supplier prices/specifications, product plans and review notes are commercially sensitive. The default workflow shall allow creation, editing, calculation and draft review on the user's device without sending formulation data to a service. The UI shall clearly identify when data leaves the device.

Local-first does not mean secure by default. The product requirements include:

- clear disclosure of browser/device storage and its limitations;
- optional local encryption with a user-controlled recovery path;
- explicit cloud-sync opt-in per workspace or dataset;
- encrypted transport and encrypted cloud storage for synced data;
- separation of identity/account data from formulation content where practical;
- no use of formulation data for analytics, training or support access without explicit agreement;
- user-visible export, backup, restore, delete and device-change workflows;
- session lock, sign-out, device revocation and lost-device response;
- a warning that malware, browser profiles, OS accounts, backups, extensions and shared devices can expose local data;
- conflict handling that never silently discards a local formulation or approved version.

### 10.2 SaaS account and access controls

| ID | Priority | Requirement |
| --- | --- | --- |
| SEC-001 | Must | Use least-privilege workspace roles for owner, editor, reviewer, viewer and support/admin functions. |
| SEC-002 | Must | Restrict product/formulation access by workspace and record an audit event for access to sensitive content. |
| SEC-003 | Must | Protect secrets and credentials from client-side source and exported reports. |
| SEC-004 | Must | Encrypt data in transit and at rest for any cloud service. |
| SEC-005 | Must | Provide account recovery that does not expose plaintext formulation content to support staff. |
| SEC-006 | Must | Provide export and deletion requests with clear retention consequences for backups, audit records and shared copies. |
| SEC-007 | Should | Support multi-factor authentication, session expiry, device/session list and revocation. |
| SEC-008 | Should | Provide backup and restore with tested recovery objectives, integrity checks and version preservation. |
| SEC-009 | Should | Make offline edits and sync conflicts reviewable, attributable and reversible. |
| SEC-010 | Could | Provide customer-managed encryption keys or an encrypted workspace key hierarchy after a separate threat-model review. |

### 10.3 SaaS service boundaries

The product must explicitly identify which operations require a service: identity, optional sync, regulatory-data publication, official calculator/artwork updates, exports or collaboration. A service failure must not corrupt local drafts. No architecture decision is made here; the requirement is for predictable boundaries and recovery behaviour.

### 10.4 Data residency

| Location | Data |
| --- | --- |
| Server (necessary) | Identity and credentials via the authentication provider, account metadata, subscription and trial status, entitlement tokens, device/session records, consent records, support tickets without formulation content, account audit events, public regulatory dataset releases |
| Client (default) | Ingredients, supplier specifications and documents, nutrition, additives, formulations, products, claims, label configurations, generated labels and PDFs, version history, evidence, review decisions, business profile |
| Server (opt-in only) | Client-side-encrypted backup or sync blobs, collaboration data |

Functionality made harder by local-only data: multi-device continuity, team review and approval by other people, support troubleshooting, server-side search, analytics and bulk regulatory-impact notification (impact analysis must run locally), recovery after device loss, usage metering, and a tamper-evident audit trail (a user can alter a local audit log). Any feature that needs server-side processing of formulation data, such as AI assistance, must be opt-in and disclosed.

### 10.5 Local data layer requirements

| ID | Priority | Requirement |
| --- | --- | --- |
| LOCAL-001 | Must | CRUD with relationships across ingredients, specifications, formulations, products, versions and results. |
| LOCAL-002 | Must | Recursive expansion of nested formulations and cycle detection (FORM-004). |
| LOCAL-003 | Must | Atomic multi-record transactions (for example approving a version writes the snapshot, results and review decision together or not at all). |
| LOCAL-004 | Must | Immutability of approved versions is enforced in the data layer, not only the UI. |
| LOCAL-005 | Must | Search, sort and filter by name, supplier, allergen, status and tag, at a scale of thousands of ingredients and many thousands of versions; performance targets are set in the architecture phase. |
| LOCAL-006 | Must | Full and partial import/export in a versioned, integrity-checked format with a lossless round trip. |
| LOCAL-007 | Must | Backup and restore per 10.6. |
| LOCAL-008 | Must | Validation on write and import, including units and controlled vocabularies. |
| LOCAL-009 | Must | Versioned schema migration with a pre-migration backup, fixture tests and a rollback path. |
| LOCAL-010 | Must | Integrity check at start-up, automatic recovery points and recovery to the last known good state, with visible errors. |
| LOCAL-011 | Must | Calculation, rule evaluation and export work offline with the installed regulatory release. The network is needed only for authentication, entitlement refresh and updates. |
| LOCAL-012 | Must | Browser storage is treated as non-durable: quotas, eviction under storage pressure or inactivity, private browsing, concurrent tabs, and no multi-device sync without an explicit sync feature. The product requests durable storage where available and warns the user. |
| LOCAL-013 | Must | IndexedDB is a likely candidate (structured, transactional, large, offline, indexed) but has limits (eviction, quotas, no built-in encryption, no graph queries). The choice is made in the architecture phase against LOCAL-001 to LOCAL-012; alternatives are not excluded. |

### 10.6 Device change, loss and backup

| ID | Priority | Requirement |
| --- | --- | --- |
| BKP-001 | Must | Whole-workspace export and import as one file with an integrity check and format version, and an encrypted option protected by a user passphrase. Unencrypted export warns that formulations are readable by anyone with the file. |
| BKP-002 | Must | Signing in on a new device restores the account and entitlement only. Formulation data arrives only by import, or by sync if enabled. This is stated at sign-up and in empty states. |
| BKP-003 | Must | If local storage is cleared or evicted, the app detects an empty store for an account that previously used it (using non-sensitive markers such as last-backup date) and offers restore options. Without a backup the data cannot be recovered. Backup reminders are based on elapsed time and change count. |
| BKP-004 | Should | Optional encrypted cloud backup with client-side encryption and a key the server does not hold. A lost key means lost data unless the user opts into a recovery mechanism. A threat-model review is required before release. |
| BKP-005 | Must | Restore never merges silently; differences and conflicts are shown first. |
| BKP-006 | Should | A verify-backup action checks that a backup can be restored. |
| BKP-007 | Must | Sign-out, local data removal and account deletion are separate explicit actions with clear consequences. |

### 10.7 Account and subscription requirements

| ID | Priority | Requirement |
| --- | --- | --- |
| ACC-001 | Must | Registration with email verification, login, logout, password reset and account deletion. |
| ACC-002 | Must | Account deletion removes server-side account data, subject to stated legal retention such as billing records, offers a data export first, and states that local data is not deleted unless the user chooses. |
| SUB-001 | Must | Subscription states: trial, active, past due (grace), expired, cancelled. Trial length, free-tier existence and limits are open questions for the product owner. |
| SUB-002 | Must | Entitlements (features and limits by plan) are defined as data. |
| SUB-003 | Must | Enforcement uses a short-lived signed entitlement issued by the server and checked by the client. Because data is local, enforcement can be bypassed by a technically capable user; that risk is accepted for local features. |
| SUB-004 | Must | A user is never locked out of their own data. After expiry or cancellation the product enters read-only and export-only mode; creation, approval and label export may be restricted (policy to be decided). Data is not deleted by expiry. |
| SUB-005 | Must | A grace period for payment failure and an offline grace period for entitlement validity are defined. |
| SUB-006 | Should | Controls against repeated free-trial accounts (verified email, device signals) without collecting formulation data. |
| SUB-007 | Must | Billing-provider events only update subscription status; these requirements are provider-neutral. |
| SUB-008 | Must | Consumer-law, tax-invoice and privacy obligations for subscriptions are legal review items. |

### 10.8 Security requirements by side

| ID | Priority | Requirement |
| --- | --- | --- |
| SEC-011 | Must | Server: authentication through a vetted mechanism with no custom cryptography; salted slow password hashing; compromised-password checks; multi-factor authentication option (SEC-007). |
| SEC-012 | Must | Server: short-lived, revocable sessions and tokens with secure storage and rotation. |
| SEC-013 | Must | Server: rate limiting and lockout on login, verification and reset flows. |
| SEC-014 | Must | Server: entitlement and subscription status are signed and tamper-evident. |
| SEC-015 | Must | Server: account security events (email change, new device, reset) are verified and notified. No formulation data appears in logs or analytics. |
| SEC-020 | Must | Client: because all sensitive data is in the browser, cross-site scripting is the highest-impact threat. Require strict output encoding, a strict content security policy, no unsanitised HTML from user or imported text, minimal third-party scripts and integrity controls. |
| SEC-021 | Must | Client: the local database is readable by anyone with device or profile access. Optional at-rest encryption uses a key derived from a user passphrase and not stored. Decrypted data in memory remains exposed to XSS and malicious extensions; this is disclosed. |
| SEC-022 | Must | Client: exports and backups default to encrypted, avoid leaking data in filenames or metadata, and review packages exclude unrelated data. |
| SEC-023 | Must | Client: all imported files are validated for schema, size and unsafe content before use. |
| SEC-024 | Should | Client: inactivity lock and clear-on-sign-out options. |
| SEC-025 | Must | Client: dependencies are pinned and audited. |
| SEC-026 | Must | Client: local audit records are not tamper-evident, and the product does not present them as such. |

## 11. UX workflows and incomplete-data states

### 11.1 Primary workflow

1. Create workspace and privacy mode.
2. Create or import supplier/ingredient evidence.
3. Build atomic and compound ingredients.
4. Build formulation with process state, yield and serving/package facts.
5. Classify product, channel and label profile.
6. Enter claims, origin, GM, irradiation, dates, storage and packaging facts.
7. Run calculations and rule evaluation.
8. Resolve data gaps and human-review tasks.
9. Generate label draft and trace report.
10. Compare, review, approve and publish an immutable version.

### 11.2 UX states

The interface shall make the following states visually and textually distinct:

- Draft and incomplete;
- Calculated with assumptions;
- Ready for review;
- Review required;
- Failed rule;
- Approved with warnings;
- Published/superseded/withdrawn;
- Source or rule update pending re-review.

Each finding shall answer: what was checked, why it applies, which inputs were used, what result was reached, what action is suggested, where the source is, and whether a human decision is required.

### 11.3 Accessibility and usability

- Do not use colour alone for PASS/FAIL/WARNING/REVIEW REQUIRED.
- Make source and evidence links keyboard-accessible and printable.
- Keep full precision and units available behind rounded display values.
- Provide a concise user explanation with an expandable technical trace.
- Preserve user-entered commercial wording separately from generated regulatory wording.
- Warn before destructive edits, deletion, sync, export or changing the effective-date profile.
- Make the difference between `unknown`, `not applicable`, `not supplied`, `not detected` and `zero` explicit.

### 11.4 Workflows and states

| ID | Priority | Workflow or state |
| --- | --- | --- |
| UX-001 | Must | First-time user: landing page, sign-up with email verification, trial or plan choice, privacy and backup explanation, business set-up, dashboard with empty states, guided first ingredient. |
| UX-002 | Must | Ingredient: create, supplier specification, nutrition, allergens, additives, regulatory attributes, validate, save. A draft can be saved with gaps, which are flagged. |
| UX-003 | Must | Compound ingredient: select ingredients, enter quantities, calculate, review regulatory inheritance (allergens, additives, GM, irradiation, origin), save as a version. |
| UX-004 | Must | Product: select formulation version, pack and serving data, proposed name, prescribed-name check, characterising ingredients, additives review, claims review, compliance review, preview, export. |
| UX-005 | Must | Empty states: no ingredients, no formulations, no products, no installed regulatory release (compliance blocked with an explanation), first run offline, no backup yet. |
| UX-006 | Must | Validation levels: field (invalid unit), record (incomplete), cross-record (contradiction), rule (status), freshness (stale data). |
| UX-007 | Must | Incomplete data: blocking items are listed with links to fix them, and results are labelled as based on incomplete data. |
| UX-008 | Must | Overrides require a reason and evidence and are recorded (TRACE-007). |
| UX-009 | Must | The summary never shows a single `Compliant` status; it shows counts per status and unresolved items (Section 1). |

## 12. Testing strategy and authoritative fixtures

### 12.1 Test layers

| Layer | Required coverage |
| --- | --- |
| Source/fixture tests | Verify provision, source URL, compilation/version, effective date and transition metadata. |
| Rule unit tests | One test family per rule, including applicability, pass, fail, missing data and boundary values. |
| Calculation tests | Units, density, yield, moisture, reconstitution, draining, serving, rounding, energy and recursive composition. |
| Property tests | Mass conservation where assumptions permit; no negative quantities; idempotent expansion; no circular graph; stable ordering. |
| Golden label tests | Known product fixture to exact generated text/sections/format metadata under a pinned rule release. |
| Explainability tests | Every result has source, provision, inputs, evaluation, explanation and test link. |
| Transition tests | Old/new requirements and stock rules at boundary dates. |
| UX tests | Missing data, review queue, version diff, offline mode, export and approval gates. |
| Security tests | Workspace isolation, role boundaries, encryption, recovery, local storage exposure, sync conflict and export leakage. |
| Human review tests | Confirm uncertain product class, claim evidence, origin evidence and exemption paths produce review rather than false PASS. |
| Additive tests | Permission by category and purpose; multi-source concentration (ADD-004) including nested sources, unit conversion and unknown concentration. |
| Prescribed-name tests | Candidate identification, no-candidate handling, supported rules and review-only classes. |
| Claim tests | Per claim family: boundary values, equivalent wording and blocking-condition cases (CLAIM-004). |
| HSR tests | Comparison with the official calculator for every fixture (HSR-005); exclusions. |
| Nested formulation tests | Recursive expansion, propagation matrix (4.18), circular reference rejection on edit, import and sync. |
| Local database tests | Transactions, migration with fixtures, corruption recovery, eviction and empty-store detection, quota handling. |
| Import/export and backup tests | Lossless round trip, encrypted export, restore conflicts, wrong passphrase. |
| Authentication and subscription tests | Registration, verification, reset, lockout, entitlement expiry, grace, read-only mode, offline entitlement. |
| PDF tests | Exact physical size, minimum text sizes, deterministic output, metadata and non-certification statement. |

### 12.2 Authoritative fixture catalogue

Fixtures should include at least:

- simple single-ingredient packaged food;
- nested compound ingredient with milk, wheat and sesame;
- additive with class name/code number and a carrier allergen;
- compound ingredient below 5% with an allergen that must remain declared;
- water loss and volatile ingredient ordering case;
- solid and liquid NIPs with per-serving/per-100 g or mL values;
- fibre, fatty-acid, potassium and vitamin/mineral claim cases;
- drained, reconstituted and prepared-food NIPs;
- `low sugar`, `no added sugar`, comparative and gluten-free boundary claims;
- a self-substantiated health claim that must be review-only;
- HSR intended and excluded product examples;
- approved GM food, unintentional 10 g/kg boundary and immediate-consumption exemption;
- permitted and unpermitted irradiation category/dose examples;
- origin priority/non-priority examples with changing supplier origins;
- a prescribed-name candidate with incomplete classification evidence;
- each mandatory advisory statement trigger supported by the current Schedule 9 table;
- allergen transition dates before, during and after the 2024-2026 transition.

### 12.3 Test requirements

| ID | Priority | Requirement |
| --- | --- | --- |
| TEST-001 | Must | Every production rule has boundary tests for PASS, FAIL, missing inputs and non-applicability. |
| TEST-002 | Must | Every published result can be replayed from its versioned fixture and source release. |
| TEST-003 | Must | Regulatory source changes cannot publish without updated fixtures or a documented no-impact decision. |
| TEST-004 | Must | Tests assert status semantics so an unknown input cannot become PASS. |
| TEST-005 | Should | Golden labels cover exact required wording, allergen emphasis, summary placement and NIP formatting metadata. |
| TEST-006 | Should | Security and privacy tests cover local-first, sync, export and deletion paths. |
| TEST-007 | Must | Additive tests cover the same additive from two sources and from a nested compound ingredient. |
| TEST-008 | Must | HSR results equal the official calculator output for all pinned fixtures, or the release is blocked. |
| TEST-009 | Must | A rule below Provision mapping confidence cannot produce a deterministic FAIL (TRACE-015). |
| TEST-010 | Must | Circular references are rejected on edit, import, restore and sync. |
| TEST-011 | Should | A restore from an encrypted backup on a clean profile reproduces the original data and version history. |

## 13. Release scope

### 13.1 MVP

- Australian retail label profile and basic catering profile.
- Atomic/compound ingredients and supplier evidence.
- Recursive allergen and ingredient declaration generation.
- Core NIP calculation with explicit source values and yield.
- Additive permission/limit evaluation and prescribed-name support focused on the same initial product cohorts: formulated caffeinated beverages and foods for infants. Exact Code classifications/subcategories and applicable name rules require reviewer verification; unsupported cases remain `REVIEW REQUIRED`.
- No candidate prescribed-name rule found is not a PASS.
- Supported claims are required before public MVP launch, after the core and additive/name groundwork. Claims must not be treated as cleared merely because their nutrient threshold is met.
- Name, supplier, lot, date, storage and directions capture.
- Core warning/advisory triggers supported by controlled fixtures.
- Rule result statuses and source-linked explanations.
- Immutable product/label versions and review tasks.
- Local-first drafts, explicit export, encrypted workspace backup and privacy disclosure.
- Label preview and PDF export of label/pack copy at custom dimensions (PACK-001).
- Account, trial and entitlement with a read-only/export-only expiry mode (SUB-004).
- Characterising-ingredient candidate flagging and percentage calculation where the basis is pinned (4.16).

### 13.2 Version 1

- Broader additive permission and prescribed-name coverage beyond formulated caffeinated beverages and foods for infants.
- HSR calculator/profile integration with a pinned official source, if separately approved.
- GM, irradiation and country-of-origin workflows.
- Packaging/legibility preflight and review package.
- Optional encrypted sync, collaboration and tested recovery.

### 13.3 Future

- Broader Chapter 2 and special-purpose-food coverage beyond the initial infant-food cohort, plus alcohol profiles.
- Batch variability, laboratory data integration and supplier portal.
- Country-of-origin legal profile expansion and export jurisdictions.
- New Zealand implementation profile.
- Regulatory change impact automation and managed source subscriptions.
- Supplier spreadsheet import, and supplier, inventory and accounting integrations.
- Barcode functionality, advanced packaging templates and SVG/vector export (PACK-003).
- Team collaboration, multi-user organisations, multiple business locations and a shared audit history.
- AI-assisted ingredient entry and AI-assisted explanations, which may only draft or explain from structured rule results and must never originate a regulatory conclusion.

### 13.4 Out of scope

- Automatic legal certification or regulator submission.
- Unverified claims generation.
- Automatic food safety validation, shelf-life validation or packaging-material certification.
- Automatic acceptance of supplier data without provenance and review.
- Silent use of cloud services or analytics on formulation content.

## 14. Risks, limitations, open questions and next steps

### 14.1 Key risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Code changes faster than product releases | Outdated labels or rules | Gazette monitoring, source release workflow, effective dates and impact reports |
| Product classification is wrong | Wrong prescribed name, additive permission, HSR or claim result | Classification evidence, review-only states and regulatory reviewer gate |
| Supplier data is stale or incomplete | Wrong allergen/NIP/origin/GM result | Provenance, freshness, contradiction and re-confirmation workflow |
| Local storage is lost or exposed | Loss or disclosure of formulations | Encrypted backup/export, device warning, recovery testing and optional sync |
| Formula is treated as exact when yield/process varies | Misleading nutrient and percentage output | Batch scenarios, uncertainty, measured data and explicit assumptions |
| Artwork changes after generation | Label no longer matches approved output | Artwork evidence, preflight and publish comparison |
| Voluntary claim is misleading despite threshold pass | ACL/regulatory exposure | Claim classification, wording/evidence review and no automatic clearance |
| Official calculators/artwork/licences change | HSR/NIP output drift | Version pinning, licence/source monitoring and update tests |
| Browser storage evicted or cleared (technical) | Permanent loss of formulations | Durable-storage request, backup reminders, empty-store detection (BKP-003) |
| Cross-site scripting (technical) | Exposure of all local data | SEC-020 and a security review |
| Rule engine drifts from the source text (technical) | Silent wrong results | Source-linked rules, mapping confidence, fixtures, rule release review |
| Subscription bypass or trial abuse (product) | Revenue loss | SUB-003, SUB-006; accepted for local features |
| Users read a green result as certification (product) | Regulatory and reputational exposure | TRACE-012, the status model and review gates |
| MVP scope too large (product) | Delay | Section 13 boundaries |

### 14.2 Open questions requiring decision

- Which product classes and Chapter 2 standards are supported in MVP, and which are review-only?
- What evidence standard is acceptable for supplier nutrient values, allergen statements, origin, GM and irradiation?
- What are the product's supported market channels and whether New Zealand needs a separate profile?
- What is the approved data-retention period for formulation records, audit records, exports and backups?
- What encryption/recovery model is acceptable when the user loses the device or local key?
- Which users may approve a review-required result, and which domains require an external regulatory sign-off?
- Will the product use official HSR artwork/calculator under its current licence terms, and how will updates be distributed?
- How will the system handle products that use an ingredient with a changing supplier specification between batches?
- Is a country-of-origin mark renderer in scope, or only an evidence/checklist workflow?
- Which packaging and legal-metrology checks are deliberately delegated to NMI/packaging review?

### 14.3 Regulatory/legal review items

- Confirm all Standard and schedule references against the current Federal Register compilation immediately before each regulatory-data release.
- Map all supported prescribed names and composition rules to exact product-class provisions; do not infer from names.
- Obtain expert review of additive permissions, processing aids, carry-over and maximum-level calculations.
- Obtain expert review of health claims, self-substantiation, endorsements, NPSC edge cases and marketing wording.
- Confirm country-of-origin calculations and presentation against the current Information Standard and ACCC guidance.
- Confirm HSR guide version, artwork, calculator licence and any post-2026 changes.
- Review special purpose foods, infant formula, alcohol, caffeine, cell-cultured foods and novel foods before enabling automation.
- Review the privacy/security threat model for browser storage, device compromise, cloud sync, support access and deletion.

### 14.4 Recommended next steps

1. Approve the MVP and review-only boundaries in Section 13.
2. Appoint a food regulatory reviewer for the first controlled rule catalogue and fixture set.
3. Convert the source register and traceability matrix in Sections 15 and 16 into the release checklist for every rule change.
4. Define the evidence policy for supplier, laboratory, origin, GM, irradiation and claim data.
5. Create a small set of representative formulations and labels with expert-reviewed expected outcomes.
6. Complete a privacy/security threat model before enabling any cloud sync or support workflow.
7. Validate the first generated labels manually against current Code text, official guidance and packaging artwork requirements.
8. Re-verify the clause-level mappings flagged in 7.8, starting with Standard 1.2.10, the Chapter 2 classes chosen for Version 1, the Schedule 15 data model, Schedule 4 thresholds and the HSR guide tables.
9. When the requirements are accepted, start implementation planning. The architecture phase must satisfy Sections 7, 10 and 16 as constraints.

### 14.5 Assumptions

- A-001: The first market is Australian packaged retail; New Zealand and export are separate scopes.
- A-002: Formulation data stays on the user's device by default and the server never needs to see it.
- A-003: Users are responsible for the accuracy and evidence of the data they enter. The product does not verify suppliers or laboratory results.
- A-004: A qualified food regulatory reviewer will be engaged before any rule is enabled.
- A-005: Regulatory data is curated into versioned releases by the product team from the Federal Register and official guidance.
- A-006: The official HSR calculator is usable as a test oracle and its licence permits the intended use.
- A-007: The delivery form (browser, installed app or other) is undecided; only a client with a local database is assumed.
- A-008: Labels are in English.

### 14.6 Regulatory uncertainties

- Amendment 253 (published 2026-10-29) and later amendments are not yet assessed.
- Transitional rules for Amendments 241, 250 and 231 and for P1063 need clause-level reading before dependent rules are built.
- Clause-level triggers, formulae and exemptions for Standard 1.2.10, the Schedule 15 data structure, carry-over, lot-identification exemptions and the Chapter 2 prescribed-name content are not mapped here.
- Whether an HSR display interacts with Standard 1.2.7 (INT-005) is unresolved.
- Net quantity has a national legal-metrology source mapping in 7.8, but remains review-only; detailed applicability/marking requirements, importer labelling, and Victorian/non-Victorian enforcement and penalty provisions beyond the mapped Food Act s 16 context are not researched.
- HSR guide v9 versus v9.1 differences and artwork licence terms need confirmation.
- Fish names rely on an external standard (AS 5300) whose status under the Code is not assumed.

### 14.7 Automation limitations

| Area | The software can | The software cannot |
| --- | --- | --- |
| Allergens | Propagate declared allergens and generate the format | Verify supplier declarations or decide exemptions |
| Additives | Sum multi-source concentrations and compare with mapped limits | Assign food category, GMP or carry-over without user input |
| Prescribed names | Prompt candidates and check mapped composition rules | Decide true nature, perception or unmapped classes |
| Claims | Check mapped thresholds and gating conditions | Judge equivalent wording, imagery, evidence or self-substantiation |
| Characterising ingredients | Calculate proportions and suggest candidates | Decide emphasis or essential character |
| NIP | Calculate from supplied values | Guarantee values match laboratory analysis |
| HSR | Reproduce the official calculation once pinned | Assign ambiguous categories or FVNL |
| Origin, GM, irradiation | Record, propagate and format | Verify evidence, intentionality or dose |
| Packaging | Check the size and layout limits it can measure | Fully judge prominence, contrast or design legality |

### 14.8 Additional domains identified beyond the brief

These were identified in review for scoping. No requirement text was researched for them.

| Domain | Initial disposition |
| --- | --- |
| Legal metrology (net quantity; National Measurement Institute) | Review-only; delegated (4.17) |
| Imported food and importer labelling | Out of MVP |
| Vitamins and minerals, fortification (Standard 1.3.2) | Version 1 scoping; interacts with NIP and claims |
| Contaminants, agricultural chemicals and microbiological limits (Standards 1.4.1, 1.4.2, 1.6.1) | Out of scope; not a label determination |
| Special purpose foods, infant formula, alcoholic beverages | Review-only until separately scoped (14.3) |
| Allergen cross-contact management | Records only; precautionary text is voluntary |
| Recall and traceability support | Lot capture only in MVP |
| Privacy Act obligations and notifiable data breaches | Legal review (SUB-008, SEC-015) |
| Official HSR artwork licensing | Open question (14.2) |

## 15. Sources register

The following register records the primary sources used for this requirements baseline. Direct links are provided so a future reviewer can verify current text. The register is not a substitute for checking the source again at implementation or release time.

| ID | Source and authority | Specific reference used | Jurisdiction/status/date |
| --- | --- | --- | --- |
| SRC-001 | [FSANZ Food Standards Code legislation](https://www.foodstandards.gov.au/food-standards-code/legislation) | Current Code navigation; authoritative Federal Register links; October 2026 compilation is reference-only | Australia/NZ Code context; FSANZ page updated 2026-10-16 |
| SRC-002 | [Standard 1.2.1](https://www.legislation.gov.au/F2015L00386/latest/text) | ss 1.2.1-2, -4, -6, -8, -9, -15, -20, -24, -25 | In force; compilation 13, in force 2026-06-09 |
| SRC-003 | [Standard 1.2.2](https://www.legislation.gov.au/F2015L00389/latest/text) | ss 1.2.2-2 prescribed/true name, -3 lot, -4 supplier | In force; compilation 1, 2024-07-22 |
| SRC-004 | [Standard 1.2.3](https://www.legislation.gov.au/F2015L00397/latest/text) | ss 1.2.3-2 advisory, -3 royal jelly, -4 to -8 declarations and plain-English presentation | In force; compilation 6, 2024-10-29; allergen transition recorded in instrument table |
| SRC-005 | [Standard 1.2.4](https://www.legislation.gov.au/F2015L00392/latest/text) | statement of ingredients; ss 1.2.4-2, -4, -5, -7 references used by current Code | In force; compilation 2, 2025-09-02 |
| SRC-006 | [Standard 1.2.5](https://www.legislation.gov.au/F2015L00401/latest/text) | ss 1.2.5-3 to -5 date marking and use-by prohibition | In force; compilation 3, 2021-06-03 |
| SRC-007 | [Standard 1.2.6](https://www.legislation.gov.au/F2015L00393/latest/text) | s 1.2.6-2 storage and directions | In force; as-made text and later source checks required |
| SRC-008 | [Standard 1.2.7](https://www.legislation.gov.au/F2015L00394/latest/text) | ss 1.2.7-4 to -8, -11 to -26 claims, NPSC and evidence | In force; compilation 8, 2025-08-13 |
| SRC-009 | [Standard 1.2.8](https://www.legislation.gov.au/F2015L00395/latest/text) | ss 1.2.8-5 to -14 NIP applicability, contents, rounding and preparation state | In force; compilation 6, 2026-04-30 |
| SRC-010 | [Standard 1.2.10](https://www.legislation.gov.au/F2015L00398/latest/text) | ss 1.2.10-2 to -8 characterising ingredients/components and PCI/PCC calculations | In force; compilation 2, 2018-11-29 |
| SRC-011 | [Schedule 4](https://www.legislation.gov.au/F2015L00474/latest/text) | S4-3 claim conditions, S4-4 high-level claims, S4-5 general-level claims, S4-6 NPSC category threshold | In force; compilation 7, 2026-04-30 |
| SRC-012 | [Schedule 5](https://www.legislation.gov.au/F2015L00475/latest/text) | NPSC scoring method; exact tables to be pinned in rule data | Federal Register source; verify current compilation before implementation |
| SRC-013 | [Schedule 6](https://www.legislation.gov.au/F2015L00476/latest/text) | Systematic review requirements for self-substantiated health relationships | Federal Register source; verify current compilation before implementation |
| SRC-014 | [Schedule 7 S7-2 (F2015L00477)](https://www.legislation.gov.au/F2015L00477/asmade/2015-04-01/text/original/epub/OEBPS/document_1/document_1.html) | Prescribed and optional food additive class names | As made 2015-04-01; commenced 2016-03-01; latest Register listing checked 2026-11-09 |
| SRC-015 | [Schedule 8 S8-2 (F2025C00967)](https://www.legislation.gov.au/F2015L00478/2025-09-16/2025-09-16/text/original/epub/OEBPS/document_1/document_1.html) | Alphabetical and numerical food additive names and code numbers | Compilation 8, effective 2025-09-16; amendment history includes No. 244 although the compilation summary says up to No. 231; recheck before release |
| SRC-016 | [Schedule 9](https://www.legislation.gov.au/F2015L00479/latest/text) | S9-2 advisory statements and S9-3 mandatory declarations/allergen table | In force; compilation 2, 2021-02-25 |
| SRC-017 | [Schedule 10](https://www.legislation.gov.au/F2015L00480/latest/text) | Generic ingredient names and conditions | In force; compilation 4, 2021-02-25 |
| SRC-018 | [Schedule 11](https://www.legislation.gov.au/F2015L00481/latest/text) | S11-2 energy factors, S11-3 carbohydrate, S11-4 fibre methods | In force; compilation 6, 2024-10-29 |
| SRC-019 | [Schedule 12](https://www.legislation.gov.au/F2015L00482/latest/text) | S12-2/S12-3 NIP format; S12-4 daily intake example | In force; compilation 2, 2017-04-13; recheck current source before release |
| SRC-020 | [Standard 1.3.1](https://www.legislation.gov.au/F2015L00396/latest/text) | ss 1.3.1-3, -4, -6 additive permission, levels and mixtures | In force; compilation 4, 2024-09-13 |
| SRC-021 | [Standard 1.5.1](https://www.legislation.gov.au/F2015L00403/latest/text) | novel food definition/permission and S25 conditions | In force; compilation 3, 2026-06-09 |
| SRC-022 | [Standard 1.5.2](https://www.legislation.gov.au/F2015L00404/latest/text) | ss 1.5.2-3 and -4 GM permission and statement | In force; compilation 3, 2025-09-02 |
| SRC-023 | [Schedule 25](https://www.legislation.gov.au/F2015L00440/latest/text) | S25-2 permitted novel foods and conditions | In force; compilation 9, 2024-10-29; recheck current source |
| SRC-024 | [Schedule 26](https://www.legislation.gov.au/F2015L00450/latest/text) | S26-2 definitions and S26-3 permitted GM food/conditions | In force; compilation 38, 2026-09-01 |
| SRC-025 | [Standard 1.5.3](https://www.legislation.gov.au/F2015L00406/latest/text) | ss 1.5.3-3 to -9 irradiation permissions, records and labelling | In force; compilation 6, 2024-08-15 |
| SRC-026 | [FSANZ allergen labelling guidance](https://www.foodstandards.gov.au/consumer/labelling/allergen-labelling) | current allergen list, exact names, summary, PAL and transition | FSANZ; page updated 2025-11-26 |
| SRC-027 | [FSANZ ingredient and percentage guidance](https://www.foodstandards.gov.au/consumer/labelling/ingredients) | descending ingoing weight, water, compound ingredients, percentage labelling | FSANZ; page updated 2025-02-25 |
| SRC-028 | [FSANZ NIP guidance](https://www.foodstandards.gov.au/consumer/labelling/panels) | NIP nutrients, per serving/per 100 g or mL and exemptions | FSANZ; page updated 2025-10-20 |
| SRC-029 | [FSANZ claims guidance](https://www.foodstandards.gov.au/consumer/labelling/nutrition) | nutrition content/health claim distinction, NPSC and scientific evidence | FSANZ; page updated 2026-08-13 |
| SRC-030 | [FSANZ business claims guidance](https://www.foodstandards.gov.au/business/labelling/nutrition-health-and-related-claims) | self-substantiation, notification and current health-claim workflow | FSANZ business guidance |
| SRC-031 | [FSANZ NPSC guidance](https://www.foodstandards.gov.au/business/labelling/nutrition-health-and-related-claims/nutrient-profiling-scoring-criterion) | NPSC inputs and relation to Schedules 4/5 | FSANZ; page updated 2026-05-19 |
| SRC-032 | [FSANZ additive labelling guidance](https://www.foodstandards.gov.au/consumer/labelling/Labelling-of-food-additives) | class name/name or code, exemptions and compound-ingredient function | FSANZ; page updated 2025-02-25 |
| SRC-033 | [FSANZ warning/advisory guidance](https://www.foodstandards.gov.au/consumer/labelling/advisory) | current examples and advisory table | FSANZ; page updated 2025-11-26 |
| SRC-034 | [FSANZ dates guidance](https://www.foodstandards.gov.au/consumer/labelling/dates) | use-by/best-before, shelf life, storage and bread exception | FSANZ; page updated 2025-02-25 |
| SRC-035 | [FSANZ truth, weights and legibility guidance](https://www.foodstandards.gov.au/consumer/labelling/truth) | true nature, weights/measures referral and legibility context | FSANZ; page updated 2025-02-25 |
| SRC-036 | [FSANZ GM labelling guidance](https://www.foodstandards.gov.au/consumer/gmfood/labelling) | novel DNA/protein, product-based approach, 1% equivalent and exemptions | FSANZ; page updated 2025-11-04 |
| SRC-037 | [FSANZ irradiation guidance](https://www.foodstandards.gov.au/consumer/foodtech/irradiation) | permitted categories, labelling and current scope | FSANZ; page updated 2025-02-25 |
| SRC-038 | [FSANZ Code Gazette notices](https://www.foodstandards.gov.au/food-standards-code/gazette) | Amendment 253 and change monitoring | FSANZ; current list accessed 2026-11-02 |
| SRC-039 | [FSANZ changing the Code](https://www.foodstandards.gov.au/food-standards-code/changing-the-code) | application/proposal and confidential information context | FSANZ regulatory process |
| SRC-040 | [ACCC country-of-origin food labelling](https://www.accc.gov.au/business/advertising-and-promotions/country-of-origin-food-labelling) | priority/non-priority, formats, marks and enforcement context | Australian Consumer Law guidance; current page accessed 2026-11-02 |
| SRC-041 | [Country of Origin Food Labelling Information Standard 2016](https://www.legislation.gov.au/Details/F2017C00920) | legal instrument for Australian origin labelling | Commonwealth legislative instrument; verify current compilation |
| SRC-042 | [Health Star Rating home](https://www.healthstarrating.gov.au/) | voluntary system, rating range and official resources | Australian/NZ government initiative; accessed 2026-11-02 |
| SRC-043 | [HSR Implementation Guide](https://www.healthstarrating.gov.au/industry/health-star-rating-system-implementation-guide) | version 9/9.1, eligibility, categories, calculation and graphic | Official guide v9.1 published 2026-09; current HSR source |
| SRC-044 | [HSR calculator](https://www.healthstarrating.gov.au/calculator) | official calculator, workbook and disclaimer | Official calculator; workbook page identifies version/update and requires guide |
| SRC-045 | [HSR intended products](https://www.healthstarrating.gov.au/industry/intended-products) | intended, permitted and excluded products | Official industry guidance |
| SRC-046 | [HSR calculation explanation](https://www.healthstarrating.gov.au/about/how-ratings-are-calculated) | 100 g/mL basis, nutrient/ingredient factors and manufacturer responsibility | Official HSR guidance |
| SRC-047 | [FSANZ special purpose foods](https://www.foodstandards.gov.au/consumer/special-purpose-foods) | product categories and links to Part 2.9 guidance | FSANZ consumer guidance |
| SRC-048 | [FSANZ food fish names guidance](https://www.foodstandards.gov.au/consumer/labelling/fish) | Code does not define fish names; AS 5300/database context | FSANZ; page updated 2025-02-25 |

## 16. Requirements traceability matrix

This matrix is the initial cross-domain contract. Rule IDs must be split into individual implementation rules before production, with the exact current source text and fixtures attached.

| Trace ID | Regulatory source/provision | Regulatory requirement | Software rule/data/evaluation | Result and explanation | Test intent |
| --- | --- | --- | --- | --- | --- |
| TR-001 | SRC-002, Standard 1.2.1 ss 1.2.1-6, -8, -9 | Applicable packaged retail food must carry required information; certain unpackaged food must have information with/displayed | Label profile: channel, package, retail/caterer, surface area; evaluate required output sections | PASS/FAIL/REVIEW with missing channel/package explanation | Packaged, unpackaged, vending, hamper and catering fixtures |
| TR-002 | SRC-003, Standard 1.2.2-2 to -4 | Use prescribed name or true-nature name; identify lot and supplier | Product identity, class evidence, lot, supplier; name/lot/address evaluator | PASS or REVIEW with provision and missing fact | Ordinary name, prescribed-name candidate and missing supplier |
| TR-003 | SRC-005/SRC-027, Standard 1.2.4 and guidance | Ingredients declared using applicable names and order | Recursive formulation, ingoing mass, water loss, declaration-name mappings | PASS/REVIEW; show ordered list and basis | Nested composition and water/volatile cases |
| TR-004 | SRC-004/SRC-016/SRC-026, Standard 1.2.3-4 to -7 and S9-3 | Mandatory allergens/declarations use required names, bolding and nearby Contains summary | Allergen graph, exact vocabulary, exemptions, summary renderer | PASS/FAIL/REVIEW; show allergen path and exact text | All allergen classes, sulphite threshold, exemption and transition boundaries |
| TR-005 | SRC-020/SRC-014/SRC-015/SRC-032 | Additives are permitted, within limits and declared with class/name/code | Additive source, purpose, category, level, carry-over and declaration mappings | PASS/FAIL/REVIEW; show permission/limit and declaration | GMP, max level, shared-purpose mixture and compound additive |
| TR-006 | SRC-003 and Chapter 2 links in SRC-001 | Prescribed names and composition standards apply to relevant food classes | Category facts and supported Chapter 2 rule; otherwise defer | PASS/FAIL/REVIEW; show candidate standard | Meat, honey, milk, juice, alcohol and special-purpose review fixtures |
| TR-007 | SRC-006, Standard 1.2.5-3 to -5 | Apply date mark, wording and use-by prohibition | Date type, shelf-life evidence, storage dependency and package | PASS/FAIL/WARNING/REVIEW; explain date and storage dependency | Use-by/best-before/bread/two-year/small-package cases |
| TR-008 | SRC-007, Standard 1.2.6-2 | State required storage and safety directions | Storage, preparation, reconstitution, raw bamboo/cassava flags | PASS/REVIEW; show trigger and statement | Missing storage and preparation instruction cases |
| TR-009 | SRC-009/SRC-018/SRC-019/SRC-028 | Calculate and format NIP using required nutrients, basis and current method | Nutrient evidence, yield/state, Schedule 11 calculation, Schedule 12 output | PASS/REVIEW; show formula, values, rounding and source | Solid/liquid, claim-added rows, drain/reconstitute and small package |
| TR-010 | SRC-010/SRC-027 | Declare characterising ingredient/component proportion | Product name/emphasis, ingoing mass, PCI/PCC and rounding | PASS/REVIEW; show why ingredient is characterising | Name/image emphasis, minimum percentage and reconstituted food |
| TR-011 | SRC-008/SRC-011/SRC-030/SRC-031 | Nutrition/health claims meet applicable conditions and evidence requirements | Claim text/type, form, nutrient data, reference food, NPSC, evidence | PASS/FAIL/REVIEW; never legal certification | Low/no/reduced/comparative/health/self-substantiated cases |
| TR-012 | SRC-043/SRC-044/SRC-045/SRC-046 | HSR is calculated/displayed under current voluntary guide and exclusions | HSR version, category, nutrients, exclusions, graphic and NIP consistency | INFORMATIONAL/PASS/REVIEW; disclose voluntary status and disclaimer | Intended/excluded/edge categories and pinned calculator result |
| TR-013 | SRC-022/SRC-024/SRC-036 | Approved GM food and conditions; required statement unless exemption | GM source/event, novel DNA/protein, intentionality, 10 g/kg threshold | PASS/FAIL/REVIEW; show source and exemption evidence | Approved GM, 1% boundary, immediate-consumption and altered characteristic |
| TR-014 | SRC-025/SRC-037 | Permitted irradiation and required statement/records | Irradiation category, dose, purpose, ingredient inheritance, record evidence | PASS/FAIL/REVIEW; show treatment and statement | Fruit/vegetable, herb/spice, dose and re-irradiation cases |
| TR-015 | SRC-040/SRC-041 | Apply current origin standard and avoid misleading origin impression | Channel, priority class, ingoing weight, origin evidence and mark profile | PASS/FAIL/REVIEW; separate ACL review | Priority/non-priority, imported, changing origin and claim cases |
| TR-016 | SRC-002/SRC-035 | Required words must be English, legible, prominent and contrasting; warning type sizes apply | Artwork dimensions, field of view, type size, contrast and language metadata | PASS/FAIL/WARNING/REVIEW; identify design limitation | 3 mm/1.5 mm warning and field-of-view fixtures |
| TR-017 | SRC-038/SRC-039/SRC-001 | Code changes and transitions must be tracked and applied by effective date | Source release, amendment, transition, stock rule and product impact graph | INFORMATIONAL/REVIEW until released; historical results stable | Amendment boundary and historical replay tests |
| TR-018 | Product explainability addendum | Every result must trace source to automated test and explain limits | Rule metadata, dependency graph, input provenance, result and fixture IDs | No result may publish without a complete trace or explicit gap | Trace completeness and no-unknown-to-PASS tests |
| TR-019 | SRC-004/SRC-016, Standard 1.2.3-2, -3 and S9-2 | Mandatory advisory and warning statements when triggers apply | Trigger tables (ingredient, concentration, classification), exact wording and size | PASS/FAIL/REVIEW; show trigger, wording and placement | Each supported S9-2 trigger at its boundary |
| TR-020 | SRC-020, Standard 1.3.1-3, -4, -6 and Schedule 15 | Additive total from several sources within the maximum level | ADD-004 multi-source sum, unit basis, food category | PASS/FAIL/REVIEW; show per-source breakdown, calculated and maximum values | Two sources, nested source, unknown concentration |
| TR-021 | Section 7.8 national legal-metrology source mapping; National Measurement Act 1960 and National Trade Measurement Regulations 2009 | Net quantity requirements | Pack measurement and units, package and sale context | REVIEW REQUIRED pending applicability, exceptions and human measurement confirmation | Review-only net quantity gate; verify package/food contexts and unresolved R1-20 |
| TR-022 | SRC-008/SRC-011/SRC-012 | Claim threshold met but blocked by another condition | CLAIM-004 condition checklist | REVIEW or FAIL naming the blocking condition | Missing NPSC, food form, reference food |
| TR-023 | SRC-010 | Characterising ingredient inside a compound ingredient | CI-003 recursive expansion | PASS/REVIEW; show path and basis | Named ingredient nested two levels |
| TR-024 | SRC-043 to SRC-046 | HSR equals the official calculation | HSR-005 official calculator oracle | INFORMATIONAL/PASS/REVIEW | Workbook fixtures per category |
| TR-025 | Explainability addendum | Rule application modes and mapping-confidence limit on FAIL | TRACE-011 to TRACE-016 | Mode and confidence shown on every result | A rule below Provision confidence cannot produce a deterministic FAIL |

## 17. Final operating principles

1. A label is an output of a versioned formulation and evidence set, not a free-text artefact.
2. A missing input is a meaningful result, not zero, false or not applicable.
3. A rule result is only as current as its source release and effective-date selection.
4. A deterministic calculation does not make the underlying supplier, laboratory, classification or claim evidence true.
5. Human review is a designed product state, not an exception hidden from the user.
6. The platform assists compliance work; it does not certify legal compliance.
