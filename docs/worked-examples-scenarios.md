# Worked examples - scenario sheet (W2)

Status: DRAFT for user approval. Nothing here is built yet (W3-W5 build it).

## Purpose and ground rules

- These products exist to let a reviewer **see the whole system working**, not to describe real products.
- **Every figure, product name and ingredient is INVENTED** for illustration. Each loaded record is tagged `worked-example` and named "Example ...".
- Every rule is still draft, so the **official status of every additive, name and claim result is REVIEW REQUIRED** in all scenarios, toggle on or off. Nothing here is a PASS or FAIL, and none of it certifies compliance.
- The **illustrative preview** (toggle on) shows what a result *would* be if the draft rules were approved. It never fills in missing facts: where a fact is missing, the preview is "blocked" and says why.
- Preview outcomes below are **expected values worked out from the draft rule data**. W4 and W5 lock them with automated tests; if a test disagrees, the sheet is corrected, not the test hidden.
- Limits quoted come from the draft catalog and are `TO BE VERIFIED` by the reviewer. The additive limit unit in the catalog is mg/kg of the food (the draft default); benzoates are compared as benzoic acid.
- The person's own choices (category, claim classification, food form, confirmations) are entered as the person's own answers. The system never picks them.

## Products

Four products: a good and a problem variant for each cohort.

### P1 - Example Citrus Boost (caffeinated beverage, good variant)

| Item | Invented value |
|---|---|
| Cohort / category (person confirms) | Formulated caffeinated beverage; category 14.1.3 Water based flavoured drinks |
| Food form | Liquid, confirmed |
| Ingredients (illustrative) | Water, sugar, citric acid, flavour, caffeine (recorded as added caffeine), glycerol esters of wood rosins (445), acesulphame potassium (950), sodium benzoate (211) |
| Additive: glycerol esters of wood rosins 445 (purpose: stabiliser) | 60 mg/kg, added, dated evidence |
| Additive: acesulphame potassium 950 (purpose: intense sweetener) | 250 mg/kg, added, dated evidence |
| Additive: sodium benzoate 211 (purpose: preservative) | 258 mg/kg, **already converted to benzoic acid by the person** and stated as such in the new "Figure already converted to" field |
| Claim: "Low sugars", classified by the person as nutrition content | 2.0 g sugars per 100 mL; serving and form confirmed; all three prohibited contexts answered "no"; evidence given |
| Prescribed name | None identified for this cohort (draft rule: no prescribed name identified) |

| Page | Official (toggle off) | Preview (toggle on) |
|---|---|---|
| Wood rosin esters permission | REVIEW REQUIRED (RULE_NOT_APPROVED, catalog not reviewed) | Would be within limit (60 vs 100 mg/kg) |
| Acesulphame K permission | REVIEW REQUIRED | Would be within limit (250 vs 3000 mg/kg) |
| Sodium benzoate permission | REVIEW REQUIRED | Would be within limit (258 as benzoic acid, because the basis matches the rule) |
| Prescribed names | REVIEW REQUIRED (no name identified in draft data; not a clearance) | No preview (candidates only) |
| Claim: Low sugars | REVIEW REQUIRED (rule is draft) | Would meet the condition (2.0 vs 2.5 g per 100 mL liquid) |

### P2 - Example Citrus Boost Max (caffeinated beverage, problem variant)

| Item | Invented value | What it shows |
|---|---|---|
| Glycerol esters of wood rosins 445 | 130 mg/kg | Over the draft 100 mg/kg limit |
| Sodium metabisulphite 223 | Present, **no concentration entered** | Missing fact: stays REVIEW REQUIRED even with preview |
| Steviol glycosides 960 | Source status "unknown" (not known whether added) | Never treated as zero or as added |
| Claim "Low sugars" | 4.0 g sugars per 100 mL | Over the 2.5 g liquid limit |
| Claim "Low energy" | **No figure or evidence entered** (food form is a product-level fact, so it is confirmed once for the product) | Preview blocked: missing fact |
| Claim "Supports concentration" | Classified by the person as health | Review-only path (HEALTH_REVIEW_ONLY) |

| Page | Official | Preview |
|---|---|---|
| Wood rosin esters permission | REVIEW REQUIRED | Would exceed limit (130 vs 100) |
| Sulphite permission | REVIEW REQUIRED (concentration missing) | Blocked: concentration missing |
| Steviol permission | REVIEW REQUIRED | Blocked: source status not added |
| Low sugars | REVIEW REQUIRED | Would not meet the condition (4.0 vs 2.5) |
| Low energy | REVIEW REQUIRED | Blocked: amount and evidence missing |
| Health claim | REVIEW REQUIRED (health, review-only) | No preview; review-only stays review-only |

#### Findings from building W4 (sheet corrected to match)

1. **Calculation-basis limits (resolved after W4).** Benzoate, sorbate, sulphite and steviol limits are "as benzoic acid" and similar. Without a way to say so, the engine reported CALCULATION_BASIS_MISMATCH. The additive form now has an optional "Figure already converted to" field. The person converts the figure and names the substance; the system never converts. P1 shows sodium benzoate this way. Sulphite and steviol in P2 stay blocked for their own reasons (missing figure, unknown status).
2. **Added caffeine (resolved after W4).** A source recorded with the "Added caffeine" declaration route is now treated as an identified, different substance, so it no longer blocks other additive checks or appears in the "no code number" list. Caffeine's own limits (Standard 2.6.4) are still not checked by the additive evaluator, which remains a stated limitation.
3. **A real defect was found and fixed:** Schedule 15 prints some limits with a space ("3 000"). The preview crashed on those. The permission evaluator now reads them as 3000, with a regression test. This affected acesulphame potassium (950) and 18 other limits in the draft data.

### P3 - Example Apple and Oat Puree (food for infants, good variant)

| Item | Invented value |
|---|---|
| Cohort / category (person confirms) | Food for infants; category 13.2 Foods for infants |
| Ingredients (illustrative) | Apple, oats, water, ascorbic acid (300), citric acid (330) |
| Additive: ascorbic acid 300 | 300 mg/kg, added, dated evidence |
| Additive: citric acid 330 | Added, quantity-limited by good manufacturing practice (GMP confirmed by the person) |
| Added sugars | 0 g per 100 g, sugars basis confirmed with evidence |
| Prescribed names | Candidates shown: percentage declaration, 'sweetened' word, no-prescribed-name (not a clearance) |
| Claim | "Good source of dietary fibre": 4.5 g per serving, serving and form confirmed, prohibited contexts all "no", evidence given |

| Page | Official | Preview |
|---|---|---|
| Ascorbic acid permission | REVIEW REQUIRED | Would be within limit (300 vs 500 mg/kg) |
| Citric acid permission | REVIEW REQUIRED | Would be permitted at GMP with GMP confirmed |
| 'Sweetened' word | REVIEW REQUIRED | Would be PASS: 0 g is not over 4 g/100 g, so the word is not required |
| Prescribed-name candidates | REVIEW REQUIRED | No preview |
| Good source of dietary fibre | REVIEW REQUIRED | Would meet the condition (4.5 vs 4 g per serving) |

### P4 - Example Honey and Oat Puree (food for infants, problem variant)

| Item | Invented value | What it shows |
|---|---|---|
| Ingredients | Includes honey | Sterilised-honey candidate surfaces for review |
| Carrageenan 407 | 12 000 mg/kg | Over the draft 10 000 mg/kg limit |
| Added sugars | 5 g per 100 g, **sugars basis not confirmed** | Preview blocked by missing confirmation |
| Claim "Low fat" | Person answers that the product **is an infant formula product** | PROHIBITED_CONTEXT path (Standard 1.2.7-4 draft mapping) |
| Claim "Low sodium" | Classification left **unconfirmed** | Review-only: unconfirmed classification |
| Cohort confirmation | Confirmed (so the page is not blank) | n/a |

| Page | Official | Preview |
|---|---|---|
| Carrageenan permission | REVIEW REQUIRED | Would exceed limit (12 000 vs 10 000) |
| 'Sweetened' word | REVIEW REQUIRED | Blocked: sugars basis not confirmed |
| Name candidates | REVIEW REQUIRED; sterilised-honey candidate listed (matched on "honey") | No preview |
| Low fat | REVIEW REQUIRED (PROHIBITED_CONTEXT) | Stays REVIEW REQUIRED; preview does not lift a prohibited context |
| Low sodium | REVIEW REQUIRED (classification unconfirmed) | Blocked: classification is a missing fact |

## What the examples demonstrate together

1. The official status never changes with the toggle.
2. The preview lifts only reviewer gates; every missing fact still blocks it.
3. Over-limit and under-limit cases look different in the preview, as text, not colour alone.
4. Review-only, prohibited-context and unconfirmed claim paths are visible.
5. Product names, label preview and PDF still work with example data; the preview never appears on the label or PDF.

## Loading and removal rules (built in W3)

- A separate "Load worked examples" button; fixed ids; **never overwrites** a record that already has the id.
- "Remove worked examples" deletes **only** records tagged `worked-example`, after a confirmation prompt.
- The existing demo data and its tests are untouched.

## Open points for approval

1. Are four products (a good and a problem variant per cohort) the right size?
2. Are the invented figures acceptable? They are chosen to sit clearly inside or outside the draft limits.
3. P1's caffeine itself has no additive permission check in the draft data; the examples will not claim one. Raise as a reviewer question if wanted.
4. If building shows that an ingredient or additive entry field is missing, I will raise it with you rather than work around it.
