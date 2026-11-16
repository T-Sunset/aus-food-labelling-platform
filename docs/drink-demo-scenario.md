# Victorian drink demo: proposed scenario and acceptance contract

Status: **D0 scenario and acceptance contract completed 2026-11-11** for
engineering planning; not reviewer-validated. This document describes a
future test scenario, not implemented features or an assessment of an
actual food. The hypothetical product and the remaining uncertainties below
do not establish a real product's eligibility or legal compliance.

All names, quantities, specifications and evidence below are **fictional
test data**. They are not real supplier, laboratory, shelf-life or regulatory
evidence. The numbers are deliberately simple and must not be used to label a
real drink. Requirements: FR-002 to FR-008, DATA-003, DATA-006, CALC-001,
CALC-003, CALC-004, CALC-011, CALC-013, TRACE-008, TRACE-012, TRACE-015,
PACK-001 and PACK-005.

## 1. Product and journey

Proposed product: **Example Citrus Lift**, a still, non-alcoholic,
citrus-flavoured caffeinated drink in a 330 mL can, sold at retail in
Victoria. It is formulated for the purpose of enhancing mental performance.
This purpose is a product fact in the fixture, not permission to make any
particular marketing or health claim. There is no fruit juice and no
nutrition-content or health claim in the baseline. Its final displayed name
and artwork need an accurate true-nature assessment; a flavour is not juice.

The user creates supplier-backed ingredients once, selects them and their
quantities in a formulation, records only product and pack facts not
derivable from that formulation, then previews and exports the supported
label. The system propagates identities, amounts and evidence through nested
sources and provides specific actions for genuinely missing inputs. No user
should be asked again whether an already identified ingredient is present.

## 2. Fictional supplier specifications

All specifications have distinct fictional references and a source date of
2026-11-01. The fixture records confirmed allergen coverage, with no scheduled
allergens or added sulphites reported. This represents fictional positive
evidence of absence, not an inference from blank fields. All supplier
records, including the flavour preparation, explicitly confirm full
ingredient/additive and allergen coverage. The ingredient name, declared
role, relevant identity and source status are structured facts in the
fixture, not inferred from free text.

Values below are **per 100 g of the supplied ingredient**. Sodium is mg;
protein, fat, saturated fat, carbohydrate and sugars are g. These synthetic
figures are for arithmetic testing; their scientific plausibility and legal
suitability are not asserted.

| Input / fictional reference | Energy kJ | Protein | Fat | Saturated fat | Carbohydrate | Sugars | Sodium mg | Other fixture facts |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Water / SPEC-WATER | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Potable water; no caffeine. |
| Sugar / SPEC-SUGAR | 1700 | 0 | 0 | 0 | 100 | 100 | 0 | Sugar ingredient; no caffeine. |
| Citric acid / SPEC-ACID | 1000 | 0 | 0 | 0 | 0 | 0 | 0 | Citric acid; added for acidity regulation; 100% citric acid by mass. Permission and declaration must be checked separately. |
| Citrus flavour blend / SPEC-FLAVOUR | 3.7 | 0 | 0 | 0 | 0 | 0 | 0 | Complete fictional composition by mass: 99.9% water, 0.1% cold-pressed lemon-peel oil (`Citrus limon`). Supplier reports a physical extraction process, no other constituents, juice or caffeine, and provides dated allergen and cross-contact coverage. Use the supplied nutrition profile once, not also the component profiles. |
| Caffeine / SPEC-CAFFEINE | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 100% caffeine by mass, added directly. No other ingredient in the baseline contains caffeine. |

This table does not imply real water, flavouring, citric acid or caffeine
always have these values or allergen characteristics. A real user relies on
their own supplier evidence. A measured finished-product specification may be
used only when its basis is recorded and selected; no double counting.

## 3. Batch and pack facts

| Fact | Fictional value |
| --- | --- |
| Water added | 93.47 kg |
| Sugar added | 10.00 kg |
| Citric acid added | 0.20 kg |
| Citrus flavour blend added | 0.30 kg |
| Caffeine added | 0.030 kg (30 g) |
| Total ingoing mass | 104.00 kg |
| Process | Cold mixed, then packed; no mass or nutrient gain/loss for this test fixture, explicitly recorded rather than assumed. This does not claim that mixing is or is not a legal substantial transformation. |
| Finished yield | 104.00 kg and 100.00 L as sold, with fictional batch evidence. |
| Finished density | 1.040 g/mL, supported by the fixture's mass and volume; no universal water-density assumption. |
| Pack and serving | 330 mL net contents; selected serving 330 mL; one serving per pack. A different serving is not inferred from pack size. |
| Label area | Fictional flat printable rectangle 200 mm wide by 110 mm high; actual can and safe area require physical measurement. |
| Supplier details | `Example Beverage Co (fictional)`, `10 Example Street, Exampletown VIC 3000 (fictional)`: test text, not a real business or contact. |
| Lot and date | Fictional shelf-life study `TEST-SHELF-01` specifies an unopened shelf life of 12 months and best-before date marking. Production values are `[LOT]` and `[BEST BEFORE DATE]`. Fictional storage assessment `TEST-STORAGE-01` specifies `Store in a cool, dry place` for the marked period; these are synthetic fixture inputs, not real safety evidence. |
| Origin | Each input, including both water sources and lemon oil, has fictional Australian-origin evidence. `TEST-ORIGIN-01` contains a fictional substantiation that the Australian production process satisfies the applicable substantial-transformation test. This is a supplied scenario assertion, not a legal conclusion derived automatically from mixing; it must be challenged in a negative variant. |
| Can and scheme | Non-refillable aluminium 330 mL can with a non-detachable stay-on tab, not a registered health tonic; a fictional suitability approval is bound to this exact material, volume and beverage. `9501234567891` is an invented GTIN-13-shaped test value with a valid check digit, **not an allocated barcode**; fictional scanner-readability and scheme approval are assumed only in this test. Never use it commercially. |
| GMP and flavour performance | Fictional production trial `TEST-GMP-01` records acidity and flavour targets, alternatives tested and a substantiated minimum effective concentration for both citric acid and the flavour. This is synthetic evidence, not proof for a real recipe; technical flavour solubility, stability and palatability are not verified. |
| Other | The complete fictional supplier specifications confirm no added vitamins, taurine or other Schedule 28 listed substances, no fruit juice and no additional caffeine sources. No such absence is inferred from a missing answer. |

The current supplier-entry field for other Schedule 28 substances covers
**added** substances only. That statement alone does not establish absence
of naturally occurring listed substances, so the complete-absence assumption
used in the expected advisory outcome still requires appropriately scoped
evidence and implementation; do not infer it from the added-substance answer.

No nutrition or health claims, Health Star Rating, fruit imagery or marketing
claims are specified. The test barcode is not a usable commercial barcode. A
representative label may include clearly identified commercial placeholders,
but must not silently add unsubstantiated representations.

## 4. Independently calculated baseline

Arithmetic was independently calculated using decimal values on 2026-11-11.
Expected values below are before display rounding unless stated. A test must
compare unrounded values before applying the source-backed presentation
policy; it must not use the implementation under test to generate its own
expected answers.

- Formula inputs total 104,000 g; 104,000 g / 100,000 mL = 1.040 g/mL.
- Added caffeine is 30,000 mg / 100 L = **300 mg/L**; that is
  **30 mg/100 mL** and **99 mg per 330 mL serving**.
- Sugar is 10,000 g / 100,000 mL = **10 g/100 mL** and **33 g/serving**;
  for these fictional specifications, carbohydrate has the same figures.
- Batch energy is sugar 170,000 kJ + citric acid 2,000 kJ + flavour 11.1 kJ =
  **172,011.1 kJ**; water and caffeine are zero in these fictional specs.
  That is **172.0111 kJ/100 mL** and **567.63663 kJ/serving** before rounding.
  Under the existing three-significant-figure display convention these are
  172 kJ and 568 kJ respectively; the convention and rounding-stage limits
  remain those of ADR-008 until changed.
- The listed protein, fat, saturated fat and sodium aggregate to zero
  **because each fictional supplier supplied an explicit zero**, not because
  a record is blank. The same applies to other explicitly documented
  absences; missing any required value changes the outcome.
- Direct ingoing order by mass is water, sugar, flavour, citric acid,
  caffeine. That order is an arithmetic fixture, not by itself a complete
  legal ingredient declaration. Blend declaration, additives and caffeine
  wording require source-backed rules.

### Mock base panel: exact display fixture

The following expected presentation uses ADR-008's current NPC-style
conventions and is a provisional display fixture, not a claim that the Code
prescribes this exact rounding method. Both columns come from unrounded
values. No optional `LESS THAN` declarations are selected.

| Average quantity | Per serving (330 mL) | Per 100 mL |
| --- | ---: | ---: |
| Energy | 568 kJ | 172 kJ |
| Protein | 0.0 g | 0.0 g |
| Fat, total | 0.0 g | 0.0 g |
| Saturated fat | 0.0 g | 0.0 g |
| Carbohydrate | 33.0 g | 10.0 g |
| Sugars | 33.0 g | 10.0 g |
| Sodium | 0 mg | 0 mg |

The panel displays **1 serving per package** and **330 mL serving size**.
The FCB caffeine quantity, **99 mg per serving and 30 mg per 100 mL**, is
displayed separately from the panel, not as another NIP row. Confirm these
expectations against the implementation's established zero-formatting
convention before locking fixtures; source inspection on 2026-11-11 shows
the current formatter uses one decimal place for gram values below 100 and
integer energy and sodium. A disagreement must be investigated, not silently
adjusted.

## 5. Required acceptance variants

Each variant changes only the stated inputs unless noted; expected outcomes
apply only after the classification and source-backed check are supported by
the approved demo policy.

| Case | Fixture change | Independently expected result |
| --- | --- | --- |
| Complete baseline | As specified above. | 300 mg/L caffeine; 30 mg/100 mL; 99 mg/serve. Generate each supported label section and a separate explanation, with no duplicate fact-entry questions. No overall compliance certification. |
| Lower boundary | Caffeine 14.5 g; water 93.4855 kg; same final mass and volume. | 145 mg/L: exactly the lower FCB threshold, subject to verified applicability. |
| Below lower | Caffeine 14.4999 g; water 93.4855001 kg; same yield. | 144.999 mg/L: below the lower FCB threshold. Compare unrounded values. |
| Upper boundary | Caffeine 32 g; water 93.468 kg; same yield. | 320 mg/L: exactly the upper FCB threshold. |
| Above upper | Caffeine 32.0001 g; water 93.4679999 kg; same yield. | 320.001 mg/L: above the upper FCB threshold; do not round into the permitted range. |
| Missing supplier caffeine | Flavour supplier caffeine information is unknown rather than confirmed absent. | Total caffeine and its threshold result are unavailable; direct caffeine is not treated as the whole amount. Identify the flavour specification to update. |
| Missing nutrition | Flavour sodium is unknown rather than an explicitly supplied zero. | Sodium calculation and any dependent NIP output remain incomplete; direct the user to SPEC-FLAVOUR. |
| Nested source | Replace 1 kg of directly added water with 1 kg of a nested premix containing 999 g water and 1 g caffeine, both with complete fictional specifications; retain the original 30 g direct caffeine and the same finished yield. | Caffeine is 31 g in 100 L = 310 mg/L, 31 mg/100 mL and 102.3 mg/330 mL. Both source paths are included exactly once; total mass and baseline nutrition remain unchanged. |
| Conflicting supplier information | SPEC-FLAVOUR states both caffeine-free and 1 g caffeine per 100 g, with no resolved choice or superseding evidence. | Caffeine total and its threshold finding are unavailable; the conflicting flavour evidence is identified. |
| Explicit allergen presence | In the nested-source variant replace 1 g of premix water with 1 g of fictional skim milk powder, with a dated supplier specification explicitly stating milk allergen present and per 100 g: 1500 kJ, protein 35 g, fat 1 g, saturated fat 0.6 g, carbohydrate 50 g, sugars 50 g, sodium 500 mg and no caffeine. | Propagate the milk evidence and path; generate the applicable declaration/summary in supported format. Caffeine remains 310 mg/L; batch nutrient additions are 15 kJ, 0.35 g protein, 0.01 g fat, 0.006 g saturated fat, 0.5 g carbohydrate/sugars and 5 mg sodium. This is a separate negative fixture, not a baseline ingredient. |
| Changed serving | Keep the baseline formula and 330 mL pack, but select a 165 mL serving. | Two servings per pack; 49.5 mg caffeine, 16.5 g sugar and 283.818315 kJ unrounded per serving. Per-100 mL values remain 30 mg caffeine, 10 g sugars and 172.0111 kJ. |
| Changed batch scale | Double every baseline ingredient and both finished mass and volume; keep the serving and pack unchanged. | Batch is 208 kg and 200 L, caffeine is 60 g total, and all per-100 mL/per-serving quantities and ingredient ordering remain unchanged. |
| Non-applicable classification | The purpose is explicitly recorded as not enhancing mental performance, all other baseline inputs unchanged. | The FCB-specific evaluation is non-applicable for this fact pattern, not a general approval of added caffeine; surface the separate permission pathway as unsupported if not mapped. |
| Unit evidence missing | A liquid input is supplied per 100 mL, but no applicable source-backed mass/volume conversion exists. | Do not assume density or calculate a misleading quantity; identify the source and conversion evidence needed. |
| Yield missing | Remove the finished volume and density evidence, leaving only ingoing mass. | Do not infer final caffeine mg/L or a per-100 mL panel from the 330 mL pack or guess a density; identify missing finished-product evidence. |
| Changed ingredient | Update a draft supplier profile or amount after producing a preview. | Dependent draft results and previews recalculate; approved snapshots and historic results stay unchanged. |
| Missing classification fact | Product purpose is unknown or conflicts with the scenario. | No FCB-specific positive or negative legal conclusion is inferred from the name or caffeine alone. |
| Unsupported/claims | Add an unsupported constituent or claim. | The relevant limitation is explicit; it is not silently discarded or treated as cleared. |
| Pack production facts | Lot and date remain placeholders. | They are unmistakable placeholders, not actual values or proof of a validated shelf life. Export policy follows the approved D0 decision. |
| Required content missing | Remove an essential supplier address or data needed for an applicable mandatory declaration. | Preview the available sections with a specific missing-item action; block label-PDF export. The separate explanation report remains exportable unless a technical export error occurs. |
| Accepted production placeholder | With the applicable date-mark type established, omit only the actual production date and lot identifier. | The label PDF may show clearly marked `[BEST BEFORE DATE]` and `[LOT]` placeholders, not actual production values or a validated shelf life. |
| Date type unresolved | Remove the safety and shelf-life basis needed to determine the date-mark type. | A generic date placeholder is insufficient. Report the needed basis and block the label PDF if a required section remains unresolved. |
| Rule transition | Evaluate the same supported scenario against documented dates before commencement, during transition and after transition, and both applicable lawful transition paths. | Select the correct rule version and eligibility from the source; never infer that an old pathway is valid after transition or that any caffeine use is authorised. |
| GMP evidence missing | Remove `TEST-GMP-01`'s justification while retaining the same citric acid quantity and purpose. | Identify the supported GMP permission separately from the unestablished use level; do not treat a checkbox or amount as proof of necessity. |
| Origin evidence missing | Remove `TEST-ORIGIN-01`'s substantiation of the substantial-transformation test. | Australian manufacture alone does not establish a `Made in Australia` claim; report the missing basis rather than generate the claim as established. |
| Scheme approval missing | Remove the fictional can approval, or change the can to a detachable ring-pull lid. | Do not assume the previous approval or eligibility continues; surface the exact missing/changed fact and applicable export limitation. |
| Pack dimensions and capacity | Keep all baseline content but use a label area too small to hold it without violating configured legibility or overflow checks. | Identify the overflowing content; do not silently shrink beyond the configured floor, truncate content or export it as a complete label. This is layout preflight, not a substitute for legal print proof. |
| Restore and offline | Restore fixture into a clean browser profile and disconnect. | Inputs, sources and supported calculations remain available locally; results reproduce without formulation data leaving the device. |

Boundary limits and applicable provisions are recorded in the source
inventory; numbers above are not a substitute for versioned rules. Exact
declaration, origin applicability and packaging presentation remain specific
implementation follow-ups, not settled legal conclusions.

## 6. Bounded source inventory

Research performed 2026-11-11; repeat version and applicability checks at
implementation and release. These provisions identify the demo's likely
outputs, not a complete legal assessment. The fixture's synthetic inputs are
more detailed than the research brief; a real user's unverified assertions
are not laboratory confirmation.

| Topic | What the source establishes or triggers | Scenario result or outstanding work |
| --- | --- | --- |
| Classification and caffeine | [Standard 2.6.4](https://www.legislation.gov.au/F2015L00467/latest), sections 2-5: a flavoured, non-alcoholic beverage with caffeine formulated to enhance mental performance falls within the definition; total caffeine must be 145-320 mg/L. | The fixture's stated facts indicate this category. The arithmetic 300 mg/L is within that range on fictional inputs; classification, actual average caffeine and final product data remain evidence-dependent. Test below/equal/above both limits. |
| Caffeine label content | Standard 2.6.4 section 5: average caffeine in mg per serving and per 100 mL; statements to the effect that it contains caffeine and is not recommended for children, pregnant or lactating women, or individuals sensitive to caffeine. Caffeine quantities may be adjacent to or follow the NIP, clearly distinguished, but must not be in the NIP. | 99 mg/serve and 30 mg/100 mL are fixture expectations, not measured values. Exact display wording, layout and label applicability must be verified when implemented. An additional one-day-quantity advisory depends on Schedule 28 listed substances; the fictional complete specifications state that none are present. |
| Caffeine amendment | [P1056 variation F2026L00700](https://www.legislation.gov.au/F2026L00700/asmade/details), effective 9 June 2026; [instrument clauses 3-4](https://www.legislation.gov.au/F2026L00700/asmade/2026-06-09/text/original/epub/OEBPS/document_1/document_1.html) set commencement and a 24-month transition. | The transition ends 9 June 2028. Assess both the relevant version and transition conditions, not just the date, and do not infer general permission to add caffeine. The second D0 research pass did not locate this variation; the Federal Register record and instrument were independently checked to resolve that discrepancy. |
| Name and ingredients | [Standard 1.2.2](https://www.legislation.gov.au/F2015L00389/latest), section 2; [Standard 1.2.4](https://www.legislation.gov.au/F2015L00392/latest), sections 2-7. | A name indicating true nature and an ingredient statement are relevant. Ingoing mass order is calculated above. Section 1.2.4-7(4) permits a flavouring substance to be declared as flavour/flavouring or more specifically; section 1.2.4-7(6) requires added caffeine to be declared as caffeine. A citrus flavour must not be presented as fruit juice. Exact compound and additive wording remains to be verified during D7. |
| Lemon flavour | [Standard 1.1.2](https://www.legislation.gov.au/F2015L00385/2026-06-09/2026-06-09/text/original/epub/OEBPS/document_1/document_1.html), definition of permitted flavouring substance; Standard 1.2.4-7(4); [Schedule 15](https://www.legislation.gov.au/F2015L00439/latest) category 14.1.3 and [Schedule 16](https://www.legislation.gov.au/F2015L00442/latest). | A substance physically extracted from vegetable material can meet the definition, subject to complete supplier evidence and applicable conditions. The fictional 0.3 g peel oil in 100 L gives 3 mg/L; `TEST-GMP-01` is a synthetic justification, not proof for real food. Technical stability remains unverified. |
| Additive permission | [Standard 2.6.4](https://www.legislation.gov.au/F2015L00467/latest), section 2; [Standard 1.3.1](https://www.legislation.gov.au/F2015L00396/latest), sections 2-4; [Schedule 15](https://www.legislation.gov.au/F2015L00439/latest), sections S15-2 and S15-5 category 14.1.3; [Schedule 16](https://www.legislation.gov.au/F2015L00442/latest), section S16-2, INS 330. | The source mapping identifies citric acid as permitted at good manufacturing practice (GMP) in category 14.1.3 for this FCB. The 0.20 kg/100 L fixture is 2 g/L; that calculation does not establish that the quantity meets GMP. Assess evidence of technological necessity and the blend's constituents separately. Declaration does not prove permission. |
| Allergens | [Standard 1.2.3](https://www.legislation.gov.au/F2015L00397/latest), Division 3, and [Schedule 9](https://www.legislation.gov.au/F2015L00479/latest). | Required declarations depend on the complete composition and evidence. Synthetic supplier confirmation is a test input; it is not proof of an actual supplier's allergens. Precautionary statements and cross-contact assessment are separate from mandated declarations. |
| Nutrition panel | [Standard 1.2.8](https://www.legislation.gov.au/F2015L00395/latest), sections 5-7; [Schedule 12](https://www.legislation.gov.au/F2015L00482/latest). | NIP is expected unless an applicable exemption is established. Use the specified serving and per-100 mL values; the caffeine declaration is separate. Package surface area, nutrition evidence and actual artwork still need checking. |
| Characterising ingredients and claims | [Standard 1.2.10](https://www.legislation.gov.au/F2015L00398/latest), sections 2-3; [Standard 1.2.7](https://www.legislation.gov.au/F2015L00394/latest). | No juice or claims are specified, but final name, graphics and flavour-ingredient exception need assessment. The product purpose does not authorise a health or marketing claim. |
| Supplier, lot, date and storage | [Standard 1.2.2](https://www.legislation.gov.au/F2015L00389/latest), sections 3-4; [Standard 1.2.5](https://www.legislation.gov.au/F2015L00401/latest), sections 3-6; [Standard 1.2.6](https://www.legislation.gov.au/F2015L00393/latest), sections 2-3. | Lot and supplier details are expected subject to exceptions/information-location rules. Date type and storage depend on verified shelf-life and safety facts; the fixture's placeholder is not a real date or shelf-life validation. |
| Origin | [Country of Origin Food Labelling Information Standard 2016](https://www.legislation.gov.au/F2016L00528/latest), sections 8, 9(e), 18-19 and 24. The [Register details](https://www.legislation.gov.au/F2016L00528/latest/details) on 2026-11-11 state it is exempt from sunsetting under the Legislation (Exemptions and Other Matters) Regulation 2015 section 12 item 16. | The mapped non-priority soft-drink pathway permits a text-only "Made in Australia" statement when the applicable Australian substantial-transformation test is met. The fictional evidence asserts the test is met, but mixing alone is not a determination; actual legal sufficiency remains to be verified. Do not infer a 100% Australian-ingredients claim or require a bar chart for this pathway. The Register's exemption resolves a conflicting warning from the D0 research follow-up; recheck current status at implementation. |
| Net contents | [National Trade Measurement Regulations 2009](https://www.legislation.gov.au/F2009L03479/latest), Part 4. | Verify actual net quantity and applicable position, size, units and marking rules. The 330 mL fixture alone does not establish a compliant mark. |
| Victorian container scheme | [Circular Economy Act 2021](https://www.legislation.vic.gov.au/in-force/acts/circular-economy-waste-reduction-and-recycling-act-2021), sections 98-99; [Victorian CDS Regulations 2022](https://www.legislation.vic.gov.au/in-force/statutory-rules/circular-economy-waste-reduction-and-recycling-container-deposit-scheme), regulations 5-6, 7A and 11; [EPA suitable-container instrument](https://www.epa.vic.gov.au/suitable-eligible-container-determination-instrument-victorian-container-deposit-scheme). | For a qualifying approved can, reg 7A prescribes `10 cents refund at collection depots/points in participating State/Territory of purchase.` Barcode and approval conditions apply separately. The fictional tab, container approval, barcode and readability are test assumptions only. Verify exact current text, layout, eligibility and approval against the actual container before use. |

## 7. Expected output and remaining limitations

The target output is a legible representative proof, not a finished legal
clearance: product identification, net contents, supported ingredient and
allergen declarations, NIP, applicable caffeine content and advisories,
supplier information, production placeholders, and any verified applicable
origin or Victorian can marks. Its PDF must match the preview. A separate
report records sources, versioned checks, calculations, evidence, limitations
and actionable unresolved items.

The end-to-end fixture targets the following content:

- `Example Citrus Lift` plus a descriptive `Citrus-flavoured caffeinated
  beverage`, and `330 mL`.
- An ingredient list derived from the formula, with caffeine identified as
  `caffeine`, citric acid's required class/name or code treatment, and
  flavouring wording determined by the verified declaration rule. A candidate
  to investigate is `Water, sugar, flavouring preparation (water, lemon peel
  oil), acidity regulator (citric acid), caffeine`. This is not an approved
  golden string: D7 must check compound-ingredient exceptions, grouping of
  water, class naming and the precise order before presenting it as final.
- No `Contains` summary for allergens on the synthetic complete
  evidence; no `allergen-free` or precautionary claim is inferred. The
  milk-containing variant must instead test the appropriate declaration.
- The mock NIP in section 4, and separately `Caffeine: 99 mg per serving;
  30 mg per 100 mL` with advisory statements to the effect required by
  Standard 2.6.4. The Code prescribes the effect, not necessarily this exact
  advisory wording. No one-day-quantity advisory is triggered by the
  fictional confirmed absence of listed substances.
- The fictional supplier text, `Store in a cool, dry place`, `[LOT]` and
  `[BEST BEFORE DATE]`; the placeholders are not production values.
- Conditional origin wording `Made in Australia` only when the scenario's
  substantiation satisfies the relevant test; otherwise show a specific
  unresolved item and block the required-content label export.
- For the fictional qualifying can, the prescribed refund statement above
  and a visibly fictional representation of the test barcode. The fixture
  does not purport to supply a real GS1 allocation or actual scheme approval.

The selected happy path must generate an export only once all required
sections, the mapping of declarations, origin, package markings and GMP
evidence have been implemented sufficiently under ADR-009. The acceptance
contract must not force a PASS, exact wording or export where a relevant
provision or exception remains unresolved. The separate report remains
available to explain a blocked path. The whole preview and exported proof are
identified outside the pack copy as unreviewed; no overall legal clearance is
given.

The approved local-demo screen and PDF result policy is in
[ADR 009](adr/009-proposed-local-demo-results.md); it is not implemented.
Missing required sections block the label PDF, while marked lot/date
production placeholders are allowed where their type is known; the separate
report remains exportable. The scenario and acceptance contract are the D0
engineering basis; any material implementation decision still requires user
approval. Physical print proof, source interpretation, real supplier evidence
and reviewer acceptance remain separate from this fictional fixture.

**Implementation follow-ups, not D0 approval claims:** Resolve the candidate
declaration, ensure provision-level mapping and the sufficiency of origin and
GMP evidence, validate technical flavour stability, verify actual
trade-measurement/pack marking presentation and physical print legibility, and
confirm current versions and transition rules before implementing each check.
If any issue remains unresolved for an actual product, present the specific
limitation and apply ADR-009's export policy; never force the fixture into a
PASS. The reviewer has not validated this scenario.
