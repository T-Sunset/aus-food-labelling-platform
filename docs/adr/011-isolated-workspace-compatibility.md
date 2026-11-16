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
