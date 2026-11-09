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
numbers, and test the selected policy. Do not select or implement NIP rounding
stages or `LESS THAN` presentation until the remaining R1-13 policy and worked
examples are resolved. R1-13 records a significant-figure answer; verify and
apply the exact source wording for each applicable value before implementation.

## Limitations and follow-up

- R1-13 has a partial answer, but the calculation-stage policy and worked
  examples remain unresolved. Regulatory rounding fixtures and the spike's
  exact NIP acceptance criterion therefore remain unverified.
- Repeating division, precision policy for intermediate values, and rounding
  boundaries must be addressed when R1-13 is answered and before NIP
  calculation code is built.
- Worked values in this spike are synthetic examples, not regulatory
  thresholds, tolerances, or authoritative food-data fixtures.

## Sources

- big.js documentation: https://mikemcl.github.io/big.js/
- big.js 7.0.1 package metadata: https://www.npmjs.com/package/big.js/v/7.0.1
- decimal.js documentation: https://mikemcl.github.io/decimal.js/
- decimal.js 10.6.0 package metadata: https://www.npmjs.com/package/decimal.js/v/10.6.0
