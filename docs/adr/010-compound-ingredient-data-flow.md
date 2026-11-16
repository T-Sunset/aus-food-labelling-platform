# ADR 010: Compound ingredient data flow and product history

Status: **Accepted 2026-11-11; not implemented**.
Plan: Victorian drink demo D1; implementation sequenced through D3-D11.
Requirements: FR-002 to FR-010, DATA-001 to DATA-006, CALC-001 to CALC-005,
FORM-004 to FORM-006, TRACE-008, VER-002 and VER-006.

## Context

Users enter ingredients and supplier evidence, assemble nested formulations,
and use those formulations to produce products and labels. They should not
re-enter a fact that is already reliably available from an ingredient or
recipe. Supplier blends such as sauces and flavourings are compound
ingredients; the existing model already links a compound ingredient to a
formulation describing its composition.

The current approved product version stores a copy of the product record but
not a frozen closure of all linked formulation and ingredient records. It
does not, by itself, guarantee historical reconstruction after those
dependencies change.

## Decision

- Keep the existing model: a user-created composition formulation is linked
  to a compound ingredient, which can retain its own supplier specification,
  nutrition profile and other evidence. The product formulation uses the
  compound ingredient. The same representation supports sauces and supplier
  flavour blends; a user-made sub-recipe can also be a nested formulation.
  Do not introduce a separate supplier-blend record or duplicate component
  tree. Improve guidance and navigation without changing the model.
- Derive supported product facts from the complete evidence and composition
  graph. Preserve direct/nested paths and distinguish confirmed absence from
  unknown and conflicts. The user supplies genuinely independent product
  facts; do not silently infer them from free text. For each substance and
  nutrient, select an explicit supported parent-profile or component basis;
  never add a parent total to its own children. Retain conflicting evidence.
- Changes to draft records refresh dependent draft results. Before claiming
  historical product or label reproducibility, design and implement a
  versioned immutable dependency closure with the applicable evidence,
  rule/output versions and product snapshot. Preserve existing approval
  records without rewriting them; identify legacy approvals that lack enough
  historic data, and do not invent missing data from current drafts.
- Preserve existing data, backup/restore and cycle checks. Partial supplier
  composition remains explicitly partial; an unknown proportion is not zero.
  Where existing formulation lines cannot represent partial evidence, the
  later implementation must add an appropriate bounded representation
  without pretending a complete composition is known.

## Consequences

I6 implementation note: inline edits create a new linked composition in the
same transaction as the ingredient, leaving the previous recipe unchanged.
List completeness is separate from known quantities; unquantified components
are never scaled. Composition source details may be absent, rather than
invented. Existing linked recipes with processing profiles remain editable in
the Formulations screen, not copied by the ingredient editor. This does not
implement the remaining nutrition and additive propagation described above.

Existing formulation and compound-ingredient machinery can be reused, but
its current expansion, label, nutrition and additive paths do not yet
uniformly propagate through compound ingredients. A shared, source-traceable
projection and lossless storage/backup changes are planned rather than
implemented here. Shared formulations must not be edited or deleted
silently; automatic creation or ownership changes are not decided by this
ADR. Historical approval limitations and any migration need explicit tests.

See `docs/drink-demo-data-flow.md` for the inventory, D0 example, migration
strategy and acceptance tests. This decision does not activate a regulatory
rule, change the existing schema, grant review approval or authorize the
next implementation turn.
