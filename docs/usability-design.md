# Usability track - design for approval (U1)

Status: APPROVED by the user with the decisions in section 8. The implementation sequence and current progress are tracked in [implementation-plan.md](./implementation-plan.md); earlier sections describe the original design and baseline.

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

The additive/name and claim checks have a three-way plain-English summary, with words rather than colour alone:

| Label | Meaning | Rule behind it |
|---|---|---|
| **Entered information looks fine!** | The check found nothing wrong using your details. A guide only, not a clearance. | Uses the illustrative outcome today because the rules are draft. Always carries the sentence "This is a guide, not legal advice or a clearance." |
| **Needs attention!** | A fact is missing, or the details point to a problem. The reason is in plain English with the fix. | Missing facts, over-limit results, prohibited contexts |
| **Consultant review recommended** | The rule needs a human decision (for example health claims, unusual products, unreviewed rule data). | Review-only paths |

Nothing in the engine changes. This is a presentation layer over the existing statuses: the official status and explanation remain visible and technical rule, source and input details can be expanded. Missing or unconfirmed facts get an actionable "Needs attention!" message; unsupported and review-only cases get "Consultant review recommended". An illustrative result is shown only when the existing session-only opt-in is on and the engine explicitly says it is eligible; its friendly label is marked illustrative, and it never changes the official status. Unknown reasons never produce a positive label. Builder summaries distinguish filled-in fields from a legal check.

## 6. The draft label

Built in this order, each marked DRAFT on the page and in the PDF:

1. **Ingredient declaration** - uses the existing ordered declaration, with additive class names and percentages where the engine supports them.
2. **Allergen statement** - from the allergens the person ticked and the propagation the engine already does.
3. **Mock NIP** - the U8 base panel shows supplier-based nutrient and energy estimates per serving and per 100 g or 100 mL, in the base row order, on screen and in the PDF. It uses the FSANZ calculator's three-significant-figure, half-even and decimal-place conventions described in [nip-display-research.md](./nip-display-research.md); the rounding stage remains for consultant review. Optional "LESS THAN" wording is not yet implemented. Energy is entered from supplier evidence, not inferred from incomplete nutrient data. The user must confirm that recipe and nutrient values represent the food as sold without processing changes, choose the physical food form, and provide dated final density evidence when volume conversion is needed. Changing the recipe invalidates that confirmation. Unknown inputs remain unavailable, not zero. Processing, prepared/drained/reconstituted bases, claim-driven extra rows and exemptions are not implemented; relevant cases are explicitly blocked from export pending review. This mock is not a determination that a NIP or label complies.
4. **Claims and additive guide** - detailed entered claims, official claim and additive/name results, evidence traces and limitations go on the separate "Notes for your consultant" report, not on the pack face. Illustrative outcomes never enter the PDF. For an exportable product with no claims or additive sources the notes say so, rather than suggesting a legal check has passed.
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
6. U7 readiness (2026-11-11): the user chose the fuller essential-builder-information gate, rather than a gate limited to ingredient and allergen content. The ingredient builder asks for explicit allergen and additive coverage confirmation against the supplier specification; unticked or empty fields alone do not establish absence. Product type, serving and net-content units are recorded explicitly. Readiness also requires the six current ingredient nutrition inputs, linked recipes and relevant additive candidate inputs. Claims remain optional. This gate concerns completeness of entered information only: ingredient names, additives, allergen conditions, layout and unimplemented content still need consultant review. U7 does not calculate the NIP.
7. U8 implementation: the base mock NIP adds supplier energy, a separately chosen food form and a recipe-specific sold-food confirmation; it also needs sourced density for volume. It does not assume that ingoing mass is final food, that 1 mL weighs 1 g, or that absent energy components are zero. Regulated claims are not rendered and their potentially required extra NIP rows are not implemented, so those products remain blocked from export. See [ADR 008](./adr/008-mock-nutrition-panel.md).
8. U9 implementation: the PDF's existing separate report is extended with paginated consultant notes, retaining export metadata, official statuses, source links, layout issues and the non-certification statement. The layout page carries short draft caveats while the detailed notes remain separate. The current built-in PDF font cannot represent all Unicode characters; export reports an explicit error for unsupported label or consultant-note characters instead of silently corrupting them. This is a current limitation, not a requirement to alter a real label without consultant input.
