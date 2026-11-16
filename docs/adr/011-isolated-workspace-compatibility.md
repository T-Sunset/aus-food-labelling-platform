# ADR 011: Isolated workspace compatibility

Status: **Accepted 2026-11-11**.
Requirements: DATA-003, DATA-006, VER-002, VER-006 and FORM-004.

## Context

Older versions can open a newer IndexedDB workspace and edit records without
understanding their new fields. A schema-version change alone did not prevent
this in the tested Dexie environment. The version-2 backup format prevents
older backup readers from silently importing the new format, but does not
isolate a live database.

## Decision

The current app uses a separately named local workspace. When a previous
workspace exists, the user may explicitly copy a validated snapshot into an
empty current workspace. The copy includes recovery points and approved
versions, is checked within the destination transaction, and never clears or
modifies the original. A non-empty destination is not overwritten. The copy
is a snapshot: subsequent changes in the two workspaces do not sync.

The previous workspace must already have the supported schema. If it does
not, the app reports the problem and directs the user to export a backup
with the previous app and restore it here. Continue supporting version-1
backup imports and version-2 backup exports. Users should maintain separate
backups; workspace isolation does not protect against browser data removal.

The product owner approved this approach on 2026-11-11. It does not make
historical product dependencies reproducible or grant regulatory approval.

## D3 compatibility follow-up

A later D3 development build records an additional supplier statement as a
separate optional ingredient field. The immediately preceding v2 build
preserves unknown top-level ingredient fields on edits and in backups, unlike
unknown keys inside its managed supplier-facts object. A browser check using
that actual preceding build confirmed edit, export and restore preservation;
the preceding build does not display or interpret the new field. This limited
additive change therefore does not require another workspace copy. Future
changes must assess and test their own old-reader behaviour rather than assume
all additions are safe. Continue to use the current build to view the new
evidence; do not treat workspace isolation as a general downgrade guarantee.

## I4 compatibility status

I4 adds general-source, ingredient-density and optional per-volume nutrient fields and expands nutrient
source types. Current-format backup round trips are tested, but an actual
earlier v2 application has not been tested with these additions. The earlier
application may not display or understand the new evidence, and its edits
cannot be assumed to preserve its meaning. Do not edit an I4 workspace or
restore its backup with an earlier app until downgrade compatibility has
been established. Keep a current-format backup; this caveat does not claim
that a backup version alone protects an older application.

I5 adds a direct-additive reference and additive-coverage evidence. As with
I4, an actual previous v2 app has not been tested with these fields; do not
rely on older apps to interpret or safely edit them. A direct reference must
match an additive source on the same single-ingredient record.

I6 permits composition records with no source specification and complete
component lists with unknown amounts. These records round-trip in current v2
backups. Earlier v2 applications have not been tested with these changes and
may reject or misinterpret them; do not use an older application to edit or
restore this workspace or its backups.
The compound nutrition-basis field is also new: an older app may ignore the
selected component basis and use the whole-ingredient profile instead. Current
v2 plaintext and encrypted backups preserve the field; downgrade compatibility
is not established.

I6 also permits missing or partial source metadata for ingredient nutrition,
allergen and additive entries and ingredient density. Empty strings represent
missing reference or date information, not evidence. Current plaintext and
encrypted backups preserve these values; older v2 readers have not been tested
and may reject them or interpret them differently. Do not edit or restore these
records with an older application.

The additive calculation also accepts a final-food density without a complete
source reference and date. Current storage retains the supplied fields; older
v2 applications may reject such product records. Missing provenance is flagged
on calculated results and does not establish a numeric permission result.

The owner has since advised that pre-release saves do not need to be compatible
with future versions. I6 retires the ingredient editor's earlier supplier
questions and separate additive-entry controls. Existing legacy fields remain
stored but are not generally editable there; older ingredients with separate
additive entries receive a warning to review or recreate them. No workspace
or backup data is removed as part of this interface change.
