# ADR 015: Saving recipes with unknown amounts

Status: **Accepted for the I7 draft workflow, 2026-11-17**.
Requirements: DATA-003, FORM-001, FORM-004, LOCAL-001.

## Context

A person may know which ingredients or nested recipes they use before they
know all their amounts. The existing supplier-composition coverage field
describes a different question: whether a component list is complete.

## Decision

- Allow an ordinary recipe draft to retain selected lines with unknown
  amounts separately from supplier-composition evidence. Retain the line
  order, chosen units and any per-use additive details.
- Do not infer a zero quantity or calculate proportions from an incomplete
  recipe. Expansion, ordered declarations, nutrition and related additive
  calculations remain unavailable or require review until amounts are
  supplied. Known allergen evidence remains visible for review.
- Include unknown-amount references in cycle checks for editing and restore.
  Preserve them in plain and encrypted backups and when used by a compound
  ingredient.
- If the user knows the finished weight but not all starting amounts, retain
  the measured weight in an incomplete processing profile. Do not calculate
  a yield until starting amounts are known; recompute the profile when the
  recipe is completed and saved.

## Consequences

An ingredient or nested recipe still needs to be selected for each saved
line; this does not add a placeholder for an unidentified ingredient. A
completed recipe continues using the existing quantified line format.
Processing effects on individual nutrients and additives remain unsupported,
including when the starting and finished weights happen to match.
