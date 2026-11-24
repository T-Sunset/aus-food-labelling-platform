# ADR 016: Nutrient data foundation

**UXR2 update:** A positive ingredient density and entered nutrient values
may be used without source references. Source details remain optional and
are preserved when present. Missing values, incompatible nutrient forms,
invalid dates and insufficient precision still require attention; this does
not approve a regulatory result.

Status: **Accepted for N3, 2026-11-17**.
Requirements: ING-002, DATA-003, DATA-006, CALC-015.

## Context

The [N2 research](../nutrient-catalogue-research.md) identifies distinct
general-panel, vitamin/mineral, calculation and product-specific entries.
One list does not cover every food or establish a label or claim permission.
Some vitamin amounts require a particular expression, not just a mass unit.

## Decision

- Add identifiers for the verified N2 entries, including the 13 vitamins and
  11 minerals in Schedule 1, without treating them as mandatory inputs or
  automatically adding them to a label. Keep the existing optional-entry
  list until the searchable N4 workflow is built.
- Store optional per-100 g and per-100 mL evidence with g, mg or microgram
  units, source details and an optional expression and method. Missing
  evidence is not zero. Preserve existing hidden expanded values when an
  ingredient is edited, and preserve evidence in backups and approved
  snapshots.
- Calculate ingoing per-100 g quantities in a consistent internal unit for
  each identifier. Unit conversion changes mass units only; it does not
  convert chemical forms. Per-volume values need a positive ingredient
  density before conversion.
- Require the recorded expression for vitamin A, niacin, B6, B12, C, D,
  E and K to match the supported expression before aggregation. Explicit
  alternative forms of other nutrients also require review. The expression
  identifiers describe the calculation's supported inputs, not regulatory
  approval of the evidence. No automatic chemical-form or equivalent
  conversion is implemented.
- Return review rather than turning a non-zero amount into zero when
  calculation precision is insufficient. Report missing evidence and
  incompatible expressions explicitly.

## Consequences

The catalogue is a foundation, not a complete list of all possible
nutrients or biologically active substances. Product-state calculations and
label rows remain later work. Versioned claims, nutrient permissions,
reference-intake calculations, transitions and chemical-form conversion
rules are not implemented here. Existing label and export safeguards remain.

## N4 entry workflow

The ingredient editor offers searchable, optional additional nutrients for
each basis. The initial unit follows the calculation's internal unit and can
be changed to match the source. For the eight form-sensitive vitamins, the
user may explicitly select the supported form, describe a different form,
or leave it unspecified. Other saved forms remain editable. No form is
inferred from a nutrient name or unit; unsupported or missing required forms
still need review. Unchanged evidence retains its original source and method.
Clearing or removing a value leaves it unknown rather than recording zero.

## N5 nested ingoing estimates

The existing recipe nutrition path now evaluates each recorded additional
nutrient independently across the expanded ingredient paths. It uses either
the whole-compound evidence or the selected complete component composition,
not both. Missing values, incompatible forms, missing density and
insufficient precision require review; an explicit zero remains a known zero.
Contradictory mass and volume inputs are flagged. The trace identifies the
input paths and any density conversion; these are ingoing estimates, not
finished-food values or label rows. A non-zero recipe allocation that cannot
be represented at calculation precision stops expansion rather than becoming
an invented zero.
