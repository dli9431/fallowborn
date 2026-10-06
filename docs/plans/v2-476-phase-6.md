# 476 Phase 6: integration and release acceptance

Implementation record for the [phased plan](v2-476-phased-implementation.md).
The 476 branch contains the save integration and regression coverage described
here. This is a release candidate implementation; publication is not approved by
this document. The owner-controlled acceptance work below remains open.

## Save compatibility

Normal serialization writes the frozen v4 envelope: v:4, titleIds:1, authoritySchema:4, platformSchema:1, rng, uid, mods, state and optional meta. The contract and reopening rule are recorded in docs/designs/state-and-saves.md.
V3 campaigns remain readable through manual slots, Continue, autosave storage,
FBS1 text and FBS2 compressed exports. Slot metadata and Chronicle extraction
accept both versions without starting a world or converting stored bytes. The
next successful save writes v4. Older builds that accept only v3 cannot load that
new save; preserve an old export when testing rollback to an older build.

`FB.save.v4.migrate` copies and normalizes typed title references, checks the
active mod fingerprint and bookmark, and validates optional authority records.
`FB.save.restore` uses that boundary for both supported formats, inflates the
detached copy, then adopts state, RNG and uid. Invalid envelopes, missing player
records, unknown bookmarks, invalid titles, duplicate authority IDs/receipts,
invalid office scopes/terms and stale authority counters fail before adoption.
Historical or expired references are retained; the validator does not require
their former actors or hosts to be alive. Restoration does not execute authority
transactions, seasonal settlement, situation initialization or scripted history.

The serializer validates identity counters, authority records and platform/story state before its existing state traversal. It adds the authority schema on a detached projection rather than copying or migrating the entire world on every autosave. The migration path does not run on slot reads or metadata displays. No timing or memory improvement is claimed without owner measurements.

Storage keys, compression formats, IndexedDB schema and Chronicle artifact
version are unchanged. LocalStorage-to-IndexedDB copying admits both envelopes
and retains its commit-before-removal behavior. CrazyGames keeps its separate
edition signature, single campaign, recovery protection, quotas and codec rules
in both SDK Data Module and localStorage modes. A v4 migration never converts
between distribution profiles or bypasses a mod mismatch. The private packager
must include the existing `js/save_v4.js` script as loaded by `index.html`.

The unused former FB.save.prototypeV4 API alias is removed at the format freeze. Its valid v4 branch saves, including an absent platformSchema stamp and legacy situation476 records, remain supported through FB.save.v4 and the normal Save/Load controls. There is no alternate serializer or restore bypass. Existing 867/1066 campaigns without authority keep it absent; no 476 office, contract, right, government identity or situation is synthesized during migration. This is a persistence integration with no new gameplay eligibility or technology dependency.

Final-format coverage extends save-v4-integration.spec.js, title-id-migration.spec.js, crazygames-saves.spec.js and indexeddb-storage.spec.js. It includes every registered bookmark, legacy/prototype/final envelopes, story dependency and payment-stamp errors, source immutability, both CrazyGames modes, exact-byte IndexedDB copying, the hashed Phase 0 corpus and a bounded annual 476 stress case under a simulated 5 MiB localStorage budget. Save integration, title migration and IndexedDB cases also belong to the Firefox/WebKit compatibility slice; save integration also runs from file origins. Missing corpus exports are explicit skips and can be supplied through FB_PARITY_CORPUS. Recorded payload sizes and authored tests do not replace the owner-controlled acceptance evidence below.

## Authored acceptance coverage

New `tests/e2e/specs/save-v4-integration.spec.js` covers all three bookmarks,
v3 FBS1 migration, repeated restore, v4 FBS2/manual-slot/reload paths, localStorage
Continue and autosave upgrade, absence of invented authority, Chronicle extraction,
and invalid-input preservation of live state, RNG, uid, source input and saved data.

Updated behavioral coverage:

- `tests/e2e/specs/title-id-migration.spec.js`: normal v4 restore, v3 aliases,
  detached and repeatable migration, invalid authority, titles and mod identity.
- `tests/e2e/specs/476-situation.spec.js`: repeated restoration after negotiated
  settlement and once-only seasonal household/federate payments across export/restore.
- `tests/e2e/specs/crazygames-saves.spec.js`: v3-to-v4 persistence and reload in
  both storage modes, alongside the existing recovery and quota cases.
- `tests/e2e/specs/indexeddb-storage.spec.js`: v3 and v4 local recovery copies
  enter IndexedDB only after committed writes.

Existing save-format assertions and their focused dependencies are updated in
`abbeys.spec.js`, `authority-phase-2.spec.js`, `capital-relocation.spec.js`,
`data-driven-modding.spec.js`, `eager-courts.spec.js`, `education-events.spec.js`,
`event-clarity.spec.js`, `intrigue.spec.js`, `political-queries.spec.js`,
`politics.spec.js`, `religions.spec.js`, `ruler-justice.spec.js`, `serf-freedom.spec.js`, `storage.spec.js`
and `war-participants-truces.spec.js` under `tests/e2e/specs/`.
The gameplay assertions remain intact; the new envelope does not change those
systems' internal record versions.

## Owner-controlled release gate

| Gate | Evidence required before publication |
| --- | --- |
| Save compatibility | Run focused save, authority, 476 and distribution specs; import the unchanged Phase 0 corpus and a genuine 1066 capture. Compare political facts, families, custody, community partitions, property, payments, RNG and uid. |
| Complete 476 chains | Confirm negotiated and contested openings, civic/church routes, Classis settlement, western-office survival/deposition/restoration, Zeno, conditional Gothic/Frankish campaigns and eastern reconquest; include interruptions by death, lost territory and succession. Existing scenario specs supply bounded cases, not natural-play acceptance. |
| Existing campaigns | Repeat the [Phase 0 journey matrix](v2-476-phase-0/baselines.md) for 867 and 1066, including Council/Estates, wars, religion, justice, treasuries, succession and long campaigns. |
| Runtime and devices | Run the approved test workflow and compare the same hashed saves on target devices. Record cold boot, year-boundary and fast-forward timings, save sizes, quota handling, memory and responsiveness. Optimize only a demonstrated regression. |
| Map and interaction | Review period labels, site positions, portraits, keyboard navigation, mobile touch, list/Back/Cancel restoration and the itch.io iframe. Test the generated CrazyGames package separately from the ordinary tree. |
| Historical review | Close the open source questions in the [scenario](v2-476-phase-0/scenario.md) and [regional design](../designs/situation-476.md): Burgundian partition, Gothic offices and the two Theoderics, Zeno's displaced court, commission terminology and composite local actors. |
| Integration | Assign the release version/changelog only when integrating into main/dev. Catalog regeneration needs its own request. Preserve private saves and workspace packaging files outside public artifacts. |

No passing result, device timing or historical sign-off is inferred from authored
coverage. Keep the source exports immutable and record evidence against their
hashes and the tested code revision. An outstanding gate does not authorize
publication of an unfinished or unverified bookmark.

## Release copy prepared for integration

Spring 476 adds a regional campaign around the western Roman court. Begin as a
federate soldier at Ravenna, pursue civic or religious service, negotiate pay and
settlement, and decide which living rulers to support. Offices, army command and
civic rights remain separate from land; later campaigns respond to the history
your world actually creates.

Existing 867 and 1066 campaigns can continue through save migration. New saves
require a build that supports version 4, and modded campaigns still require the
same mod set. Keep a previous export if you plan to return to an older build.
