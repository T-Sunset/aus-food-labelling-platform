# ADR-002: Local database

- Status: Accepted
- Date: 2026-11-05
- Requirements: LOCAL-001 to LOCAL-013, BKP-003

## Context

The Phase 1 data layer needs structured offline storage, indexes, atomic writes,
and schema migrations. The plan's S1 spike required a 2,000-ingredient and
500-formulation fixture with five-level nesting, migration and approval
transaction checks, storage persistence observations, an encryption
assessment, and a comparison with an alternative.

## Experiment

Compared Dexie 4.4.7 with the native IndexedDB API in headless Chromium
156.0.8078.4 on Windows. Each implementation stored 2,000 ingredients, 500
formulations, and 500 products with supplier, allergen, tag, and status
indexes. Formulations had five-level nested paths. After an initial
exploratory run, four fresh runs used the final fixture and procedure; the
table reports their medians. List timings are the median of 15 queries per run.
Expansion timings use records read back from each database and then expand the
graph in memory to depth five.

| Measure                            | Dexie median | Native IndexedDB median |
| ---------------------------------- | -----------: | ----------------------: |
| Write fixture                      |       169 ms |                  143 ms |
| Supplier and allergen list queries |       7.5 ms |                  7.3 ms |
| In-memory recursive expansion      |       1.7 ms |                  1.7 ms |

Both approaches returned the same indexed-query counts (100 supplier matches,
667 allergen matches). Both committed a three-record approval transaction and
rolled back an intentionally failed transaction. Both migrated a versioned
fixture. A deliberately failed Dexie upgrade left the prior schema version and
fixture intact.

The headless browser reported approximately 10.7 GB origin quota and 3.9 MB
storage usage for the test origin. `navigator.storage.persist()` returned
`false`; this is browser-policy dependent and is not evidence that persistence
will be denied in normal user sessions. Eviction was not induced.

Web Crypto AES-GCM encryption/decryption succeeded with an ephemeral key.
This only verifies API availability: key derivation, key recovery, stored-data
encryption, backup format, and security properties were not tested.

## Decision

Use Dexie over IndexedDB for the Phase 1 browser persistence adapter. Its
schema, indexed queries, bulk operations, transactions, and version upgrades
provide a smaller application-facing API while the measured performance is
adequate for the S1 fixture. Keep persistence behind repository interfaces so
the implementation can be replaced if later scale or browser testing reveals
a limitation.

Add Dexie as an application dependency when implementing P1-3; the spike's
temporary dependency and benchmark harness are not part of the production
workspace. Continue to treat browser storage as best-effort. Request durable
storage where available, clearly report denial or unavailability, and require
user-controlled backups. Use Web Crypto for an encrypted export option; this
spike does not decide on full database-at-rest encryption or a key-recovery
scheme.

## Limitations and follow-up

- The benchmark is a small, single-browser headless experiment, not a
  cross-device performance guarantee or a test of many thousands of versions.
- Recursive expansion was measured in memory after database reads; the engine
  still needs its own performance and correctness tests.
- Browser eviction, private browsing, storage pressure, user-granted durable
  storage, and concurrent-tab behaviour remain to be tested in real browsers.
- Pre-migration backups, restore, corruption recovery, encrypted backup
  passphrase handling, and key recovery remain P1-3 requirements.
- The comparison was with native IndexedDB, not RxDB or SQLite WASM.

## Sources

- Dexie API reference: https://dexie.org/docs/API-Reference
- MDN, storage quotas and eviction: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- MDN, `StorageManager.persist()`: https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist
- MDN, `SubtleCrypto.encrypt()`: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt
