# ADR-005: Data-driven rule records and trace evaluation

- Status: Accepted as a Phase 1 design input
- Date: 2026-11-06
- Requirements: TRACE-013 to TRACE-018, TEST-009

## Context

S4 asks whether three representative checks can be expressed as data, evaluated
without executable rule strings, and returned with a complete result trace.
The eventual rule dataset must retain source provenance and must not turn
unverified mapping into a deterministic failure.

## Experiment

Built a temporary Node.js harness containing three illustrative rule records:
allergen identifier presence, required NIP section presence and a synthetic
numeric threshold. The threshold was 4.2 fixture-units. The allergen values,
threshold and all outcomes are test fixtures, not legal requirements or
regulatory conclusions.

Each record carried TRACE-014 fields: identifier/name, instrument, Standard
and provision, schedule/table, source URL, jurisdiction, effective dates,
rule version, explanation template, machine-readable conditions, failure
severity, deterministic and human-review flags, and mapping confidence.
The two Code source URLs were copied from the requirements source register
without checking the instruments. The numeric example used an `example.invalid`
test source. All three records were explicitly Unmapped, non-deterministic and
review-required, so no PASS or FAIL was produced.

Conditions used a small discriminated set of shapes handled by explicit
evaluator branches, not `eval` or executable strings. Ten fixtures covered
matched, unmatched, missing-input and non-applicable cases. Results included
rule metadata, input snapshot, raw evaluation, application mode, status,
rendered explanation, source/provision, mapping confidence and fixture ID.
The validator rejected a rule referencing an absent source record and checked
that each referenced URL matched the source catalog. A separate policy probe
confirmed that a deterministic rule below Provision confidence produces
REVIEW REQUIRED without reviewer approval.

Harness output: three records validated; ten complete traces produced (nine
REVIEW REQUIRED and one INFORMATIONAL); orphan source rejected; no compliance
PASS/FAIL results produced.

## Decision

For P1-2, represent rules as typed data records with a closed set of
discriminated condition types and human-readable explanation templates.
Implement a fixed evaluator per condition type; do not use `eval`, dynamic
JavaScript or a general-purpose expression language. Keep data/schema/source
validation in `packages/rules` and pure evaluation in `packages/engine`.

The rule validator must reject incomplete TRACE-014 metadata, unsupported
condition types, duplicate IDs, missing source references and mismatched
source URLs. Each evaluable rule must have traceable fixture coverage. A
result trace must carry the rule/version, full metadata and conditions,
inputs, raw evaluation, status/application mode, rendered explanation,
source and test fixture ID.

Unknown required inputs produce REVIEW REQUIRED. A rule below Provision
mapping confidence cannot produce a deterministic FAIL without recorded
reviewer approval. Source URL syntax and catalog consistency are integrity
checks only; they do not prove that the linked text is current or supports a
rule.

S4 is an architecture/schema spike, not the implementation of Phase 1 rules.
Create the production schema, source validation, regulatory records and
regression fixtures in P1-2 after the R1 review. Keep the current
`validate:rules` command as a stub until that step.

## Limitations and follow-up

- No primary legal text was reviewed, and the copied source URLs and provisions
  have not been independently verified by this experiment.
- Exact allergen vocabulary, NIP applicability and any regulatory numeric
  threshold remain subject to the source-verification and reviewer process.
- The JavaScript harness validates the design, not production TypeScript types,
  Zod schema behaviour, package boundaries or CI integration.
- Production validation still needs rule-specific tests for applicability,
  pass/fail, missing data and boundaries, including trace completeness and
  TRACE-015 confidence gates.

## Sources

- Requirements baseline: `docs/requirements.md`, TRACE-013 to TRACE-018 and
  TEST-009.
- Allergen source URL listed in the baseline: https://www.legislation.gov.au/F2015L00397/latest/text
- NIP source URL listed in the baseline: https://www.legislation.gov.au/F2015L00395/latest/text
