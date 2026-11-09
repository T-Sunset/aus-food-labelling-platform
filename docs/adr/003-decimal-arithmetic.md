# ADR-003: Decimal arithmetic

- Status: Accepted with rounding verification deferred
- Date: 2026-11-06
- Requirements: CALC-001, CALC-003, CALC-010, CALC-013

## Context

Formulation percentages and nutrient calculations combine decimal inputs,
weights, yields, and serving quantities. Binary floating-point can produce
values that are not the exact decimal result. The S2 plan calls for a
comparison with worked calculations and a decimal library, with rounding
stages configured only after reviewer input.

## Experiment

Compared native JavaScript `number`, decimal.js 10.6.0, and big.js 7.0.1 on
five base-10 fixtures using Node.js 24.13.1. Both decimal libraries returned
every expected decimal result. Native numbers showed binary floating-point
artifacts in each calculation.

The nutrient examples used 125.5 g at 8.7 g/100 g and 74.5 g at 2.3 g/100 g:

| Calculation                |  Expected |         Native number | decimal.js |    big.js |
| -------------------------- | --------: | --------------------: | ---------: | --------: |
| `0.1 + 0.2`                |     `0.3` | `0.30000000000000004` |      `0.3` |     `0.3` |
| Batch nutrient total       |  `12.632` |  `12.631999999999998` |   `12.632` |  `12.632` |
| Nutrient per 100 g         |   `6.316` |   `6.315999999999999` |    `6.316` |   `6.316` |
| Nutrient per 37 g serve    | `2.33692` |  `2.3369199999999997` |  `2.33692` | `2.33692` |
| Ingredient mass percentage |   `62.75` |   `62.74999999999999` |    `62.75` |   `62.75` |

These are arithmetic fixtures only, not regulatory rounding fixtures. They use
terminating decimal divisions and do not assess either library's division
rounding mode or NIP presentation.

## Decision

Use big.js for engine decimal arithmetic. Both candidates matched the fixtures,
so performance was not used to distinguish them. big.js exposes the basic
decimal operations needed for the planned calculations with a smaller,
focused API; its package is also smaller than decimal.js in registry unpacked
size (58,948 versus 284,347 bytes). Package size is not a measurement of the
final browser bundle.

Do not add either library to the runtime dependencies until the engine is
implemented. At that time, configure decimal precision explicitly, parse
user-entered decimal values without first converting them to JavaScript
numbers, and test the selected policy. Do not implement deterministic NIP
formatting until a display policy and fixtures have been reviewed. The R1-13
source wording has been checked and is recorded below.

## Initial spike limitations

- At the time of the initial spike, R1-13's calculation-stage policy and
  worked examples remained unresolved. Regulatory rounding fixtures and the
  spike's exact NIP acceptance criterion were therefore unverified.
- Repeating division, precision policy for intermediate values, and rounding
  boundaries must be addressed when R1-13 is answered and before NIP
  calculation code is built.
- Worked values in this spike are synthetic examples, not regulatory
  thresholds, tolerances, or authoritative food-data fixtures.

## Follow-up source check (2026-11-09)

The Federal Register text for Standard 1.2.8, compilation F2026C00411 (C06),
effective 2026-04-30, was checked against clauses 1.2.8-7(3)-(6). It requires
the specified average values in an NIP to be expressed to no more than three
significant figures. It permits, but does not require, “LESS THAN 40 kJ” for
average energy below 40 kJ per serving or unit quantity; “LESS THAN 1 g” for
average protein, fat, fatty-acid classes, carbohydrate, sugars or dietary
fibre below 1 g per serving or unit quantity; and “LESS THAN 5 mg” for average
sodium or potassium below 5 mg per serving or unit quantity. The conditions
are strictly below the thresholds. Schedule 12, compilation F2017C00342 (C02),
including S12-2, S12-3 and S12-7, specifies panel formats but does not choose a
rounding method, intermediate precision or a sequence between per-serving and
per-100-g/mL values. Therefore those provisions do not settle an internal
rounding sequence.

The product owner chose to defer deterministic NIP formatting until a display
policy and fixtures have been reviewed. The engine may retain unrounded
calculation values, but must not present a guessed display policy as a legal
rule. The engine's 40-decimal-place, half-up division setting is an internal
arithmetic precision policy only, not the NIP presentation policy.

## Sources

- big.js documentation: https://mikemcl.github.io/big.js/
- big.js 7.0.1 package metadata: https://www.npmjs.com/package/big.js/v/7.0.1
- decimal.js documentation: https://mikemcl.github.io/decimal.js/
- decimal.js 10.6.0 package metadata: https://www.npmjs.com/package/decimal.js/v/10.6.0
- Standard 1.2.8, compilation F2026C00411: https://www.legislation.gov.au/F2015L00395/2026-04-30/2026-04-30/text/original/epub/OEBPS/document_1/document_1.html
- Schedule 12, compilation F2017C00342: https://www.legislation.gov.au/F2015L00482/2017-04-13/2017-04-13/text/original/epub/OEBPS/document_1/document_1.html
