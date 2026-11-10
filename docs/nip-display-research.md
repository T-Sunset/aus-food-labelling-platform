# NIP display research: Standard 1.2.8 and Schedules 11, 12, 13

Research date: 2026-11-10. Documentation only. Scope: bounded primary-source check of what the Code says
about the Nutrition Information Panel (NIP) so that black-and-white questions (R1-11 to R1-15) do not
depend on the human reviewer. This is not legal advice and does not certify compliance.

Status key: VERIFIED = read in the primary text this session. PARTIALLY VERIFIED = primary text read but
some element (layout detail, cross-reference, scope) is not fully confirmed. TO BE VERIFIED = not found in
primary text read, or not read at all.

## 1. Sources and versions read

| Instrument | Compilation / version | Effective | URL |
|---|---|---|---|
| Standard 1.2.8 Nutrition information requirements (F2015L00395) | F2026C00411 (C06), "latest", In force | 2026-04-30 | https://www.legislation.gov.au/F2015L00395/latest/text (body: https://www.legislation.gov.au/F2015L00395/2026-04-30/2026-04-30/text/original/epub/OEBPS/document_1/document_1.html) |
| Schedule 11 Calculation of values for NIP (F2015L00481) | F2024C01138 (C06), "latest" | 2024-10-29 | https://www.legislation.gov.au/F2015L00481/latest/text |
| Schedule 12 Nutrition information panels (F2015L00482) | F2017C00342 (C02), "latest"; the Register's All versions page lists only 2 versions | 2017-04-13 | https://www.legislation.gov.au/F2015L00482/latest/text |
| Schedule 13 Nutrition information required for food in small packages (F2015L00483) | F2021C00621 (C02), "latest" | 2021-06-03 | https://www.legislation.gov.au/F2015L00483/latest/text |
| Standard 1.1.2 Definitions (F2015L00385) | F2026C00526 (C21), "latest" | 2026-06-09 | https://www.legislation.gov.au/F2015L00385/2026-06-09/2026-06-09/text/original/epub/OEBPS/document_1/document_1.html |

Notes:
- Schedule 12's latest compilation is from 2017. That is the in-force text, not a stale fetch; the amendments
  since 2015 were cross-reference, example and "serve"->"serving" edits (Schedule 12 amendment history).
- Standard 1.2.8 contains transitional entries only for the P1037 (2016-17) and P1063 (added sugars claims)
  amendments; the P1063 transitional text was truncated in my fetch and was not read. It concerns claims, not
  the base panel. TO BE VERIFIED if added-sugars claims are in scope.
- Content was read as text-converted pages. Table geometry (borders, column alignment) of Schedule 12 is
  inferred from flattened text. Check the PDF downloads on the Register before drawing a "reference" panel.
- No FSANZ guidance document could be retrieved in this session (two guessed foodstandards.gov.au URLs
  returned 404). All "FSANZ guidance says" items below are therefore TO BE VERIFIED.
- The secondary site (nutritionfactlabel.com) was not fetched; its claims are taken from the task statement.
  Two other secondary sites surfaced in search (batchbase.com.au) and disagree with both the Code and each
  other (see section 7). None are relied on.

## 2. (1) What the NIP must contain, order and labels

| ID | Finding | Provision | Status |
|---|---|---|---|
| NIP-01 | Core panel content: (a) number of servings in the package; (b) average quantity of food in a serving (g for solid/semi-solid, mL for beverage/liquid); (c) the "unit quantity"; (d) for BOTH a serving and the unit quantity: average energy (kJ, or kJ and kcal), average quantity of protein, carbohydrate, sugars, fat and saturated fatty acids (g), sodium (mg, or mg and mmol), plus any claimed nutrient or biologically active substance; (e) anything else the Code requires. | 1.2.8-6(1)(a)-(e) | VERIFIED |
| NIP-02 | "Unit quantity" is 100 g for solid/semi-solid food and 100 mL for a beverage or other liquid food. | 1.2.8-4 (definition of unit quantity) | VERIFIED |
| NIP-03 | Variable-weight packs: servings may be expressed as servings per kilogram (or other appropriate unit) instead of a count. | 1.2.8-6(1)(a)(ii) | VERIFIED |
| NIP-04 | The panel must follow the format in S12-2 unless the Code provides otherwise (claims, small packs and other Standards can change it). | 1.2.8-6(2); S12-2 | VERIFIED |
| NIP-05 | S12-2 row order: Energy; Protein; Fat, total with sub-row "saturated"; Carbohydrate with sub-row "sugars"; Sodium; then any other claimed nutrient. Units: kJ (Cal), g, mg (mmol). | S12-2 | VERIFIED (text order); PARTIALLY VERIFIED for exact visual indentation (flattened text) |
| NIP-06 | Column order is "Quantity per serving" first, then "Quantity per 100 g (or 100 mL)". Heading strings in S12-2: "NUTRITION INFORMATION"; "Servings per package:"; "Serving size:". | S12-2 | VERIFIED |
| NIP-07 | Allowed label substitutions: "serving" may be replaced by "slice", "pack", "package", "metric cup", "metric tablespoon" or other appropriate unit/common-measure words; "Carbohydrate" may be shown as "Carbohydrate, total". | 1.2.8-7(2) | VERIFIED |
| NIP-08 | Fatty acids must be named "saturated fat", "trans fat", "polyunsaturated fat", "monounsaturated fat". | 1.2.8-7(8) | VERIFIED |
| NIP-09 | The panel must clearly indicate that quantities shown are averages (and any minimum/maximum quantities are minimum/maximum). The S12-2 template does not itself contain the word "average"; the S12-7 chewing-gum example uses "Average quantity per serving" / "Average quantity per 100 g". The Code does not prescribe the words to use. | 1.2.8-7(1); S12-2; S12-7 | PARTIALLY VERIFIED (requirement verified; acceptable wording is not prescribed -> interpretation) |
| NIP-10 | Energy may be shown in kJ only, or kJ and kcal. Optional kcal is calculated from the kJ/100 g value by the S11-2(4) equation. The S12 template shows "kJ (Cal)". | 1.2.8-6(1)(d)(i); S11-2(4) | VERIFIED (option); equation image not transcribed - TO BE VERIFIED before implementing kcal |
| NIP-11 | Saturated fat is required by (d)(ii)(B) "subject to subsection (4)". Subsection (4) is only about edible oils/spreads with PUFA/MUFA claims, where min/max listings are permitted. The cross-reference reads oddly; treat saturated fat as always required in the base panel. | 1.2.8-6(1)(d)(ii)(B), 6(4) | PARTIALLY VERIFIED (wording of the cross-reference is ambiguous; flagged for reviewer) |
| NIP-12 | Claim-triggered additions: cholesterol or fatty-acid claims -> trans, poly, mono fats per S12-3 (6(3)); fibre/sugars/carbohydrate claims -> dietary fibre declared (0 shown as "0") (6(5)-(6)); unavailable carbohydrate declaration when subtracted in by-difference carbohydrate (6(7)-(8)); listed polyols/sugar alcohols etc. at >= 5 g/100 g (6(9)); phytosterols (6(10)); lactose -> galactose (6(11)); salt/sodium claim -> potassium (6(12)); omega-3 (6(13)). Other claimed nutrients: 6(1)(d)(iv). | 1.2.8-6(3)-(13); S12-3 | VERIFIED (existence/trigger); mapping to rule logic not done |
| NIP-13 | Optional % daily intake column (S12-4) is permitted; if used, per-serving % for energy, protein, fat, saturated fat, carbohydrate, sodium, sugars (and fibre if declared) must use the stated reference values (8,700 kJ, 50 g, 70 g, 24 g, 310 g, 2,300 mg, 90 g, 30 g) and carry the "average adult diet of 8 700 kJ" statement. | 1.2.8-8; S12-4 | VERIFIED |
| NIP-14 | Voluntary extra nutrients in a NIP are generally a nutrition content claim (so they trigger claim rules); mandatory NIP content is not a claim. | 1.1.2-9 (as read in Standard 1.1.2 text); 1.2.8-2 note | PARTIALLY VERIFIED (section number 1.1.2-9 inferred from position of text; confirm) |

## 3. (2) Rounding and "LESS THAN" rules

The Code does contain rounding-related rules, but they are in Standard 1.2.8 section 7, not in Schedule 12.
Schedule 12 (all of S12-1 to S12-7) contains no rounding text.

| ID | Finding | Provision | Status |
|---|---|---|---|
| RND-01 | Average energy content and average/min/max quantities of nutrients and biologically active substances must be expressed to NOT MORE THAN 3 significant figures. This is a ceiling on precision. | 1.2.8-7(3) | VERIFIED |
| RND-02 | Energy "LESS THAN 40 kJ" may be used where energy in a serving or unit quantity is below 40 kJ (permissive "may"; assessed separately for serving and unit quantity). | 1.2.8-7(4) | VERIFIED |
| RND-03 | "LESS THAN 1 g" may be used where the quantity in a serving or unit quantity is below 1 g, for: protein, fat, classes of fatty acids, carbohydrate, sugars, dietary fibre. | 1.2.8-7(5) | VERIFIED |
| RND-04 | "LESS THAN 5 mg" may be used for sodium or potassium below 5 mg per serving or unit quantity. | 1.2.8-7(6) | VERIFIED |
| RND-05 | The Code states no decimal-place rule (no "one decimal under 10 g, whole numbers above"), no "nearest kJ" rule, no "nearest mg" rule, no rounding mode (half-up, half-even), no rule for the stage at which to round (per 100 g then per serving, or the reverse), no "may be expressed as zero" threshold, and no minimum-precision rule. | 1.2.8-7; S12 (absence) | VERIFIED as an absence in 1.2.8 s 7, Sch 11, Sch 12, Sch 13 as read. The 1.2.8 text was read in full except the transitional-provisions table (not relevant to rounding). |
| RND-06 | Consequence of RND-01 alone: e.g. 1,234 kJ must not be shown with more than 3 s.f. (so 1,230 kJ or coarser); 12.34 g -> 12.3 g (not necessarily 12); 0.456 g may be shown as 0.456 g or less precise. Where the Code permits "LESS THAN" it is optional; showing a numeric value is still allowed. | derived from 1.2.8-7(3)-(6) | Derived; not a statement in the Code. Fixture values must be labelled "derived, reviewer to confirm". |
| RND-07 | The S12-7 chewing-gum example shows "0 g", "0 mg", "Less than 1 g", and "25 kJ" / "833 kJ" (3 s.f.). It is an example for a specific provision (2.10.3-5(3)) and is not authority for a general zero threshold. | S12-7 | VERIFIED (as an example only) |
| RND-08 | Case of the wording: 1.2.8-7 quotes "LESS THAN ..." in capitals; the S12-7 example prints "Less than 1 g". The Code does not say case is mandatory. | 1.2.8-7(4)-(6); S12-7 | PARTIALLY VERIFIED (case is an open point) |
| RND-09 | FSANZ guidance on rounding, stage of rounding, zero values and tolerance. | not retrieved | TO BE VERIFIED |

Product implication (not a legal statement): the engine may enforce "no more than 3 s.f." and the three
"less than" substitutions as options, but the rounding mode, rounding stage, zero display and
precision floor are product-policy or guidance questions and must stay review items (R1-13) until a source is found.
A calculated value that is higher than 3 s.f. precision must not be PASS for display.

## 4. (3) Schedule 12 layout relevant to a mock panel

| ID | Finding | Provision | Status |
|---|---|---|---|
| FMT-01 | Heading text "NUTRITION INFORMATION" in capitals at the top. | S12-2 | VERIFIED |
| FMT-02 | Two lines under the heading: "Servings per package: (number)" and "Serving size: (g or mL or other units as appropriate)". | S12-2 | VERIFIED |
| FMT-03 | Two value columns: "Quantity per serving" then "Quantity per 100 g (or 100 mL)"; row labels in the first column. | S12-2 | VERIFIED |
| FMT-04 | Row sequence and sub-row convention: Energy; Protein; Fat, total / - saturated; Carbohydrate / - sugars; Sodium; extra claimed nutrients last. Sub-group rows are indented with a dash. In the S12-3 (claims) format "total" after "Protein" or "Dietary fibre" is needed only when followed immediately by a sub-group; S12-3 adds trans/poly/mono sub-rows under fat, cholesterol, dietary fibre and sub-group nutrients. | S12-2; S12-3 note | VERIFIED for sequence; indentation geometry PARTIALLY VERIFIED |
| FMT-05 | Optional % daily intake format adds a middle column "% Daily intake* (per serving)" and a footnote line "*Percentage daily intakes are based on an average adult diet of 8700 kJ." (note spacing differs from 1.2.8-8(3)(b) "8 700 kJ"; both appear in the Code). | S12-4; 1.2.8-8(3)(b) | VERIFIED |
| FMT-06 | Where "prepared with other food" applies, an extra column goes at the RIGHT-hand side of the panel (see section 6). | 1.2.8-13(4) | VERIFIED |
| FMT-07 | Schedule 12 prescribes NO font, type size, line weight, border, shading, colour, minimum panel size or legibility rule for the NIP. The only visible "format" is the text/structure above. | S12 (absence) | VERIFIED as an absence in Schedule 12. |
| FMT-08 | General legibility/prominence/contrast for Code-required label information is in Standard 1.2.1-24; warning-statement type size is in 1.2.1-25. These are recorded in the repo (implementation-plan.md, requirements.md) from an earlier check of Standard 1.2.1 C13. I did NOT re-read Standard 1.2.1 in this task. | 1.2.1-24, -25 | TO BE VERIFIED (inherited, not re-read here) |
| FMT-09 | Other Standards can prescribe their own panel formats: formulated caffeinated beverages (S12-5), food for infants (S12-6), chewing gum calcium (S12-7). Not MVP. | S12-5 to S12-7 | VERIFIED (existence only) |

## 5. (4) Package-size and other exemptions relevant to a small business

| ID | Finding | Provision | Status |
|---|---|---|---|
| EXM-01 | A NIP is not required for a food in a "small package", other than food for infants. | 1.2.8-5(2)(b) | VERIFIED |
| EXM-02 | "Small package" means a package with a surface area of less than 100 cm2. The definition is in the Standard 1.1.2 definitions section (cited as 1.1.2-2 by the cross-reference note in 1.2.8-4). The Code text read does not say how to measure surface area (outer package, which faces, folds, tubs, tray + film). | 1.1.2-2 | VERIFIED (definition); measurement method TO BE VERIFIED |
| EXM-03 | A small-package food that carries a claim requiring nutrition information must still give: serving size in g/mL; the Schedule 13 particulars for the claimed matter (average/min/max, clearly indicated); extra carbohydrate-related declarations where applicable. These can be given WITHOUT a full NIP. "Serving" may be replaced by slice/pack/package/metric tablespoon etc. | 1.2.8-14(1)-(3); S13-2 | VERIFIED (in outline); the full S13-2 table rows were only partly read (first nine rows). PARTIALLY VERIFIED |
| EXM-04 | NIP exempt unless a claim requiring nutrition information is made, for: standardised alcoholic beverages; herbs, spices, herbal infusions; vinegar/imitation vinegar; iodised salt, reduced sodium salt mixture, salt, salt substitute; tea/coffee and instant tea/coffee; substances approved as food additives or processing aids, and foods sold to be used as processing aids; fruit, vegetables, meat, poultry and fish that are a single ingredient or category of ingredients; gelatine; water (incl. mineral/spring) or ice; prepared filled rolls, sandwiches, bagels and similar; jam setting compound; kits to produce a standardised alcoholic beverage; beverages containing 0.5% ABV or more that are not standardised alcoholic beverages; kava. | 1.2.8-5(2)(a)(i)-(xvi) | VERIFIED (text). Whether a given user product "is" one of these (e.g. "single ingredient or category of ingredients", "similar products") is a classification judgement -> review. |
| EXM-05 | Infant formula products and Permitted Health Star Rating symbols are outside Standard 1.2.8 entirely. | 1.2.8-3 | VERIFIED |
| EXM-06 | The 1.2.8 text read contains no turnover-based, business-size-based or "made and sold locally" exemption. Exemptions from the need to bear a label at all (for example unpackaged food, food made and packaged on the premises from which it is sold, food packaged in the presence of the purchaser, fundraising, etc.) live in Standard 1.2.1 (labelling provisions; see the Note 2 to 1.2.8-5). I did not read them in this task. | 1.2.1-6 (as cited elsewhere in repo) | TO BE VERIFIED |
| EXM-07 | The "<100 cm2" claim on the secondary site is correct but incomplete: it does not apply to food for infants, and a claim removes the exemption in favour of the reduced 1.2.8-14 requirement. | 1.2.8-5(2)(b), 1.2.8-14 | VERIFIED |

## 6. Prepared, reconstituted and drained foods (needed for R1-15)

| ID | Finding | Provision | Status |
|---|---|---|---|
| PREP-01 | If the label says the food should be reconstituted with water before consumption, the NIP MUST express the required information as a proportion of the reconstituted food. This is mandatory, not optional. | 1.2.8-11 | VERIFIED |
| PREP-02 | If labelling directs that the food be drained before consumption, the NIP must be on a drained basis and clearly indicate that it relates to the drained food. | 1.2.8-12 | VERIFIED |
| PREP-03 | If labelling indicates the food is intended to be prepared or consumed with at least one other food: the NIP MAY include an additional right-hand column (describing the additional food, its amount, combined energy and combined nutrient/bioactive quantities). If a claim requiring nutrition information is made, this column MUST be given AND the NIP must state the weight/volume of the serving as prepared. | 1.2.8-13(1)-(5) | VERIFIED |
| PREP-04 | The Code text read does not say whether "water" is an "other food" for 1.2.8-13 or whether directions to add water fall only under 1.2.8-11. It also does not say what "clearly indicated" means for the 13(4) column beyond requiring a description of the additional food. | 1.2.8-11, -13 | TO BE VERIFIED (interpretation) |

## 7. Secondary-site claims versus primary text

| Claim | Verdict | Basis |
|---|---|---|
| NIP is per serving and per 100 g/mL | CONSISTENT | 1.2.8-6(1)(d); S12-2 |
| Seven nutrients in order: energy kJ, protein, total fat, saturated fat, carbohydrate, sugars, sodium mg | CONSISTENT as to content and order; incomplete (claims add rows; kcal/mmol optional; servings/serving-size lines required) | 1.2.8-6(1); S12-2 |
| Rounding "follows Schedule 12" | CONTRADICTED. Schedule 12 contains no rounding rules. The relevant text is 1.2.8-7(3)-(6). | S12 (whole text); 1.2.8-7 |
| "Nutrients to no more than one decimal place under 10 g, whole numbers above" | NOT FOUND in the Code. The Code's cap is 3 significant figures (e.g. 12.3 g is permitted by the cap). Treat as an unsupported industry convention. | 1.2.8-7(3) |
| "Energy to nearest kJ" | NOT FOUND. Cap is 3 s.f.; so 1,234 kJ cannot be shown to the nearest kJ. This conflicts with the claim for values of 1,000 kJ or more. | 1.2.8-7(3) |
| "Sodium nearest mg" | NOT FOUND; 3 s.f. cap applies (e.g. 1,234 mg could not be shown to the nearest mg). Sodium "LESS THAN 5 mg" option exists and is not mentioned by the site. | 1.2.8-7(3), (6) |
| "'less than 1 g' allowed" | PARTLY CORRECT. It is optional and limited to protein, fat, classes of fatty acids, carbohydrate, sugars, dietary fibre; sodium/potassium use "LESS THAN 5 mg"; energy uses "LESS THAN 40 kJ". | 1.2.8-7(4)-(6) |
| NIP exempt for packages under 100 cm2 "etc." | CORRECT but incomplete (infants excluded; claims switch to the reduced requirement; other exemptions are in 1.2.8-5(2)(a)). | 1.2.8-5(2), -14; 1.1.2-2 |

Related: the two batchbase.com.au pages surfaced by search describe different rounding rules from each other
(for example "nearest whole kJ" in one, "nearest 10 kJ" and zero thresholds in the other) and cite
"Schedule 12". Neither is found in the primary text. Do not use them.

## 8. Schedule 11 (context for calculation, VERIFIED)

- S11-2(1)-(3): average energy (kJ/100 g) = sum of component quantity (g/100 g) x energy factor. General
  factors (kJ/g): alcohol 29; available carbohydrate 17; unavailable carbohydrate including fibre 8; fat 37;
  protein 17. Specific factors: D-allulose 2, erythritol 1, glycerol 18, isomalt 11, lactitol 11, maltitol 13,
  mannitol 9, organic acids 13, polydextrose 5, sorbitol 14, D-tagatose 11, xylitol 14. (Values as read; one
  transcription pass only. Fixtures must be re-checked against the PDF.)
- S11-2(4): kcal/100 g from kJ/100 g by a stated equation (image not transcribed).
- S11-3: available carbohydrate (sum of available sugars and starch, plus quantified/added oligosaccharides,
  glycogen, maltodextrins) or by difference (100 minus water, protein, fat, dietary fibre, ash, alcohol, any
  quantified/added other unavailable carbohydrate, and S11-2(3) substances).
- S11-4: dietary fibre by listed AOAC methods; sum of methods minus double-counted portions.
- S11 does not say what nutrient source (supplier data, database, analysis) is acceptable for components; the
  inputs are "average quantity" as defined in 1.2.8-4.

## 9. Which of R1-11 to R1-15 can now be answered from the Code

| Q | Answerable from the Code without reviewer? | Residual interpretation / product decisions |
|---|---|---|
| R1-11 Rows, columns, serving wording, layout, exemptions | YES for the base panel: rows, order, labels, two columns, headings, "Servings per package" / "Serving size", unit quantity, units, exemption list (1.2.8-5), small-package definition and claim consequence. Reviewer's pointer to Schedule 12 is correct, but 1.2.8-6 and -7 are also needed. | (a) wording that satisfies 1.2.8-7(1) "clearly indicate average" (NIP-09); (b) saturated-fat cross-reference to 6(4) (NIP-11); (c) classification of a product as an exempt food category (EXM-04) and measurement of package surface area (EXM-02); (d) other Standard 1.2.1 exemptions from labelling (EXM-06, unread); (e) visual fidelity of the S12 table from the PDF; (f) whether the MVP supports claim-driven rows or sends them to REVIEW REQUIRED (product scope). |
| R1-12 Energy/carbohydrate method and inputs | The calculation method: YES (S11-2, S11-3, S11-4). Acceptable input sources: NOT in the Code as read; reviewer already stated a product preference (supplier data, optionally NUTTAB). | Evidence hierarchy and NUTTAB use are policy; dietary fibre analytical methods S11-4 apply when fibre is declared. |
| R1-13 Rounding | PARTLY. Cap of 3 s.f. and the three "LESS THAN" options are in 1.2.8-7(3)-(6). The reviewer's "no more than 3 significant figures" is consistent with the Code. | The Code does NOT state the rounding stage (per 100 g then serving, or reverse), the rounding mode, a zero threshold, or whether to prefer "LESS THAN". These need FSANZ guidance (not retrieved) or reviewer/regulator interpretation. Worked examples can be derived but are product fixtures, not Code text. Keep NIP rounding display at REVIEW REQUIRED for those aspects. |
| R1-14 Tolerance (20%) | NO. No tolerance or variance figure was found in Standard 1.2.8 or Schedules 11-13. The reviewer correctly says it is convention. Code concept relevant: "average quantity" means the average for foods from that producer (1.2.8-4). | Source for any enforcement tolerance is TO BE VERIFIED (FSANZ/state enforcement guidance). Keep as an informational disclaimer, never a rule result. |
| R1-15 As sold vs as prepared | MOSTLY YES. Reconstituted: mandatory (1.2.8-11). Drained: mandatory with clear indication (1.2.8-12). Prepared with other food: optional additional right-hand column, mandatory with a claim, plus as-prepared serving weight/volume (1.2.8-13). The reviewer's "optional extra column ... clearly indicated" matches 13(2) and 13(4)(a) but misses the two mandatory cases. | Whether "with water" counts as another food for 1.2.8-13 and how 11 and 13 interact (PREP-04). Which basis is the product's primary NIP basis is a product decision. |

## 10. Suggested requirement/rule consequences (product requirements, not legal statements)

- NIPD-001 (Must): Base panel generator uses S12-2 order and strings; per serving and per unit quantity
  (100 g or 100 mL by physical state); sources 1.2.8-6(1), S12-2. Missing serving size or serving count ->
  REVIEW REQUIRED, never zero.
- NIPD-002 (Must): Apply 3 s.f. cap; offer, but do not force, LESS THAN 40 kJ / 1 g / 5 mg. Confidence: Provision-level for
  the cap and thresholds; Review for mode/stage/zero. Mapping: 1.2.8-7(3)-(6).
- NIPD-003 (Must): Show an "average" indication; wording is a product choice and must be documented as such.
- NIPD-004 (Must): Exemption detector only for facts the user can state (package surface area, claim present,
  infant food flag, user-selected exempt category); otherwise REVIEW REQUIRED. Small package + claim ->
  reduced 1.2.8-14 outputs, not "no NIP".
- NIPD-005 (Must): Reconstitution/draining directions on the label force the matching basis (1.2.8-11, -12);
  1.2.8-13 column optional unless a claim is present.
- NIPD-006 (Should): Mock panel carries a visible "draft layout; not a compliance determination" marker; do not
  invent type-size or border rules for the NIP because Schedule 12 gives none.

Traceability gaps to close before declaring any of the above complete: effective-date metadata per rule
(Standard 1.2.8 2026-04-30; Schedule 12 2017-04-13; Schedule 11 2024-10-29; Schedule 13 2021-06-03; Standard
1.1.2 2026-06-09), automated boundary tests (3 s.f. edges; 39.9/40 kJ; 0.99/1.0 g; 4.9/5 mg;
99.9/100 cm2), and explanation text naming the clause for each result.

## 11. Open items

1. Retrieve FSANZ user guidance on Standard 1.2.8 (rounding stage, zero values, tolerance, measuring package
   area) from foodstandards.gov.au; the guessed URLs 404ed.
2. Download the Schedule 12 PDF and confirm table geometry, indentation and the S12-3 sub-row layout.
3. Read Standard 1.2.1 label-exemption provisions and the remaining Schedule 13 table rows.
4. Confirm the section numbering of the "nutrition content claim" provision cited as 1.1.2-9 and the
   transitional entry for P1063 in Standard 1.2.8.
5. Reviewer to decide: wording for "average", handling of 1.2.8-6(1)(d)(ii)(B) cross-reference, and
   water-as-other-food in 1.2.8-13.

## 12. FSANZ Nutrition Panel Calculator (NPC) notes: rounding convention (added 2026-11-10)

Source read: FSANZ, *Nutrition Panel Calculator Explanatory Notes* (2011), Appendix 8 "Presentation of data in the NPC", https://www.foodstandards.gov.au/sites/default/files/2023-12/npc-explanatory-notes-2011.pdf (an official FSANZ document, but software documentation, not the Code). A user-supplied search summary of it was checked against the document text and was **wrong in one respect**.

- **VERIFIED in the document:** the NPC rounds to three significant figures. 4th figure 1 to 4 leaves the 3rd figure unchanged (21.22 gives 21.2; 1142 gives 1140); 6 to 9 rounds the 3rd figure up (21.26 gives 21.3).
- **Contradicts the summary:** when the 4th figure is exactly 5, the NPC uses round half to even (3rd figure even stays: 21.25 gives 21.2, 1145 gives 1140; odd rounds up: 21.35 gives 21.4, 1155 gives 1160). It does not always round 5 up.
- **VERIFIED, NPC decimal-place conventions:** protein, fat, saturated fat, carbohydrate and sugars under 100 g are shown to 1 decimal place even if that gives fewer than 3 significant figures; energy and sodium have no decimal places (98.1 kJ gives 98 kJ; 17.5 mg gives 18 mg; 8.25 mg gives 8 mg).
- **Not verified:** the "do not round 0.5 g up to 1 g, say LESS THAN 1 g" advice in the summary (it is from a secondary site; the Code only makes "LESS THAN" optional below the thresholds in section 3).
- **Status:** these are NPC software conventions, not Code requirements. The Code itself (1.2.8-7(3)) still gives only the three-significant-figure cap. The NPC document points to the Standard 1.2.8 user guide for the rounding of values with more than three significant figures; that guide is still to be retrieved. No "round down" rule appears in the NPC notes, so the reviewer's verbal remark remains unverified.
- **Decision for the mock NIP (U5):** use the NPC conventions above, labelled "draft layout, rounding follows the FSANZ calculator's conventions and has not been reviewed", and keep the rounding stage as a consultant item.
