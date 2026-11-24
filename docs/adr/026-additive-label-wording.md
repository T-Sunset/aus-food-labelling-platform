# ADR 026: Additive wording in label drafts

Status: **Implemented, 2026-11-18**.
Requirements: ADD-009, DATA-003, PACK-005.

## Context

Ingredient entry should identify an additive without asking for a redundant
concentration or forcing a label wording choice. Different labels for the
same product may use different candidate wording.

## Decision

- An additive ingredient can be saved and used in a recipe without a
  concentration. Optional concentration details remain available for a known
  figure, including mixtures; no concentration or purity is inferred.
- Label wording choices are stored locally with each label draft, keyed by
  ingredient and additive source. Choices also apply to ingredients inside
  linked compound recipes. Different labels do not change one another or
  the ingredient.
- Previously saved ingredient-level choices remain intact when ingredients
  are edited and are used as defaults when a label has no choice of its own.
  An explicit undecided choice overrides that default. Choices for additives
  no longer in the recipe are retained in the draft and flagged.
- The preview and reviewer report use the same label-specific choices.
  Wording remains a candidate for review: choosing it does not establish
  identity, permission, class, processing-aid status or applicability.
  Product-level additive checks continue to use ingredient facts, not
  label-only wording.
- Existing label drafts without choices remain readable. Label choices are
  validated on save and restore and included in encrypted and unencrypted
  backups. The current-product dependency signature still detects changes
  in the underlying records; label drafts are not version-pinned.

## Consequences

Missing concentration can still prevent an additive-level calculation, and
missing or unsuitable wording remains unresolved. There is no new automatic
mapping of additive codes to classes, no activation of unreviewed rules and
no change to incomplete review-copy export or release gates.
