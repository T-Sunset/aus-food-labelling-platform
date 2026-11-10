# Usability track - design for approval (U1)

Status: APPROVED by the user with the decisions in section 8. No code has been written for this track.

## 1. Who this is for

A small food business, mostly in Victoria, that does not know the Food Standards Code. They have supplier specification sheets and a recipe. They want a draft pack-copy label (ingredient list, allergens, nutrition information panel, any claims) as a PDF that a consultant will then check. The program guides, explains and drafts. It never certifies.

## 2. What we found (honest baseline)

- The engine already calculates nutrient totals, Schedule 11 energy, allergen propagation and the ordered ingredient declaration. It has no function yet that rounds and formats a nutrition information panel (NIP). That display is gated on reviewer question R1-13, so any NIP we draw is a clearly marked draft layout.
- The Label page is a demonstration layout. It does not assemble declarations, allergens or a NIP.
- Additives & names and Claims are organised around rules and statuses, with many always-visible fields and long wording.
- Every result reads REVIEW REQUIRED, because every rule is draft. That is accurate but tells the person nothing about what to do next.

## 3. Principles

1. The label is the goal. Everything else is a step towards it.
2. Ask in the person's words ("Check your supplier's spec sheet for..."), not the Code's.
3. Show only what is relevant. A follow-up field appears only after the answer that needs it.
4. Every question has a short "Why we ask" and "Where to find it".
5. Missing is never zero and never fine. A skipped answer shows as "Still needed", never as a pass.
6. Nothing says or implies the label is legally compliant.

## 4. The guided path

Navigation keeps Overview, Ingredients & specifications, Formulations and Products as they are (they work). The new part is a **Label builder** that opens from a product and walks through these steps. Each step shows a progress bar and can be revisited.

| Step | Plain-English question | Appears only when | Feeds |
|---|---|---|---|
| 1. What is it? | "What kind of product is this?" (drink with caffeine, food for infants, other) | always | which rules apply; "other" gives a basic label with a consultant note |
| 2. Ingredients | "Here is your recipe. Is anything missing?" (from the formulation) | always | ingredient declaration, percentages |
| 3. Allergens | "For each ingredient, does the spec sheet say it contains or may contain any of these?" (checkable list) | per ingredient | allergen statement |
| 4. Additives | "Does the spec sheet list any additives (preservative, colour, sweetener, thickener)?" | yes shows name, code number, purpose, amount; amount shows "as converted to" only if that additive's limit needs it | ingredient declaration names, limit guide |
| 5. Nutrition | "Enter the nutrition figures from each spec sheet, per 100 g" | per ingredient | NIP draft |
| 6. Product details | "How big is a serve? How many serves per pack? Net weight?" | always | NIP columns |
| 7. Claims | "Do you want to put a claim on the pack, like 'low sugars'?" | yes shows a picker of supported claims, then only that claim's needed figure and questions | claim guide |
| 8. Review | One summary: what the label will say, what is still needed, what a consultant should check | always | draft label and PDF |

## 5. Replacing REVIEW REQUIRED with a three-way checklist

Every check result is shown as one of three plain labels, each with an icon and words (never colour alone):

| Label | Meaning | Rule behind it |
|---|---|---|
| **Entered information looks fine!** | The check found nothing wrong using your details. A guide only, not a clearance. | Uses the illustrative outcome today because the rules are draft. Always carries the sentence "This is a guide, not legal advice or a clearance." |
| **Needs attention!** | A fact is missing, or the details point to a problem. The reason is in plain English with the fix. | Missing facts, over-limit results, prohibited contexts |
| **Consultant review recommended** | The rule needs a human decision (for example health claims, unusual products, unreviewed rule data). | Review-only paths |

Nothing in the engine changes. This is a presentation layer over the existing statuses. The strict official status and the trace stay available behind "Show details", and the exported review report keeps the real REVIEW REQUIRED wording. "Entered information looks fine!" is never produced from a missing fact.

## 6. The draft label

Built in this order, each marked DRAFT on the page and in the PDF:

1. **Ingredient declaration** - uses the existing ordered declaration, with additive class names and percentages where the engine supports them.
2. **Allergen statement** - from the allergens the person ticked and the propagation the engine already does.
3. **Mock NIP** - nutrient totals and energy per serve and per 100 g/100 mL from the engine, in the order and wording Schedule 12 prescribes (heading "NUTRITION INFORMATION", servings per package, serving size, "Quantity per serving" and "Quantity per 100 g (or 100 mL)" columns; energy, protein, fat, saturated fat, carbohydrate, sugars, sodium). Verified in primary legislation (see [nip-display-research.md](./nip-display-research.md)): the Code caps values at 3 significant figures (clause 1.2.8-7(3)) and makes "LESS THAN" optional (40 kJ, 1 g, 5 mg). It does not prescribe decimal places, "nearest kJ/mg" or a rounding mode. So the mock NIP rounds to 3 significant figures using one simple documented mode, labelled "draft layout, rounding not reviewed", and the exact rounding stage stays a consultant item. A claim adds rows (clause 1.2.8-6) and removes the small-package exemption, so the builder adds those rows when a claim needs them.
4. **Claims and additive guide** - not on the pack face. They go on a "Notes for your consultant" PDF page.
5. **PDF** - pack-copy page plus the consultant page.

## 7. Build order (each turn needs your approval)

| Turn | Scope |
|---|---|
| U1 | This design (approved with the decisions in section 8) |
| U2 | Plain-English pass on the existing pages that feed the label: Overview, Ingredients & specifications, Formulations and Products. Clearer wording, "why we ask" and "where to find it" notes, fields shown only when relevant, a smooth add-ingredients, build-formulation, assign-to-product path. No rule changes |
| U3 | Label builder shell: steps, progress, the question-and-explanation pattern, show-only-when-relevant fields |
| U4 | Draft ingredient declaration and allergen statement on the label page |
| U5 | Mock NIP (3 significant figures, optional "less than" per the verified Code, serve details, claim-driven rows) |
| U6 | Additives step rebuilt inside the builder (replaces the old page) |
| U7 | Claims step rebuilt inside the builder (replaces the old page) |
| U8 | Three-way checklist applied across the builder and review step |
| U9 | Consultant notes PDF page; accessibility pass; final plain-language review of all text |

The old Additives & names and Claims pages stay until their replacements (U6, U7) pass the same tests, so earlier work is not broken.

## 8. Decisions recorded

1. Step order approved. Product type is asked first. All pages, not only the builder, get a plain-English and usability pass (now U2).
2. "Other" products get a basic label plus a consultant note until broader category support is added.
3. NIP display and rounding are checked against primary legislation, not left to the reviewer. [nip-display-research.md](./nip-display-research.md) records the result: the Code gives a 3 significant figure cap and optional "less than" values but no decimal-place rule or rounding mode. The reviewer is asked only about what the Code leaves open (the rounding stage, rounding mode and zero display).
4. State names: "Entered information looks fine!", "Needs attention!", "Consultant review recommended".
5. Restructure (2026-11-10): the app becomes Overview, Ingredients, Formulations, Products, Labels and Backup. Each of the first three is a list (create, read, update, delete) with a guided step-by-step builder for new and existing records. Ingredient builder: spec sheet, nutrition, allergens, additive facts. Formulation builder: contents and amounts. Product builder: type, pack details, additive limit checks, claims, review. Checks that depend on the recipe (additive limits, claims) live in the Product builder, because an ingredient alone cannot be checked and is reused across products. Labels lists every product; unfinished ones are greyed out with what is missing, and only finished ones can be exported. "Finished" means all required answers are entered, is recalculated live so edits to an ingredient or recipe drop the product back to "Needs attention", and never means compliant. Build order is in section 7 of the plan's U-track table (U4-U9), which supersedes the build order above.
