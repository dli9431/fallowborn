# 476 Phase 3: durable IDs and migration prototype

Phase 3 implementation record for the [v2.0 plan](v2-476-phased-implementation.md).
The 476 bookmark and ordinary v4 save publication remain Phase 4–6 work.

## Title identity

The de jure tables now use rank-scoped slugs. A county's `duchy`, a duchy's
`kingdom` and a kingdom's `empire` identify the rank through the field. This
allows `sicily` to denote both a duchy and a kingdom. The 867 and 1066 bookmark
hierarchies, county records, holy-war targets, regional ambitions and affected
test fixtures use those slugs. Realm, character, province and physical-site IDs
keep their own namespaces.

`FB.titleIds.resolve(rank, id, table)` accepts a canonical slug or the old
matching `d_`, `k_` or `e_` prefix. Bookmark activation resolves legacy table
keys and hierarchy links on detached definitions, then validates them. Missing
parents and mixed alias/canonical table keys fail with a named title error.
Legacy mods use the same resolution for de jure tables, provinces, complete
bookmarks, great holy-war targets, ambitions and market-endowment duchy keys.
Mod source and signature remain based on the authored input. Scripted and event
title references are converted only when their field carries a rank; realm IDs
that happen to begin with a title prefix are preserved.

## Prototype v4 envelope

The active slot, import and export format is still v3. New v3 envelopes mark
canonical title references with `titleIds:1`. The opt-in
`FB.save.prototypeV4.migrate(data)` accepts v3 or v4, checks the active mod
fingerprint and bookmark, copies the input, resolves typed saved title references
and returns a `v:4` envelope with `titleIds:1` and `authoritySchema:4`.
`serialize()` derives that envelope from the ordinary serializer; `restore()`
validates it and delegates to the existing restore path. Direct ordinary restore
of a v4 envelope is rejected until integration publishes v4.

Durable `state.authority` remains optional. When present, the v4 schema retains
monotonic IDs, appointments, recognitions, federate contracts, customary rights,
render receipts, government forms and optional site-keyed civic actors.
Government rows may carry optional elite culture, elite faith and legal identity
IDs, separate from the saved county communities; old saves do not gain them. Validation
rejects duplicate IDs or obligations, malformed reference shapes, invalid
forms/statuses, and
derived effective-power or quote fields. Contract payment periods and fulfilled
settlement awards survive unchanged. An old save with no authority does not gain
offices, contracts, legitimacy or rights. No migration step pays, grants,
advances the RNG, or invokes scripted events.

The title migration visits typed state fields: ambitions, de jure war causes,
holy-war targets and history, and ranked title selections. It does not rewrite
arbitrary strings or map keys. Existing settlement asset IDs that embed a
legacy title are opaque record identities; they stay intact with their claim
references while each separate `titleId` becomes canonical. Ownership, direct holders, communities, custody,
family and character records, campaign state, treasuries, enterprises, buildings
and settlement references are carried through as data. Existing optional v3
restore repairs remain the only deterministic repair path.

## Compatibility and evidence

An unknown bookmark, missing hierarchy link, unknown typed title, ambiguous
alias, changed mod fingerprint or malformed authority record produces a
specific error before prototype restore adopts state or RNG. Applying the
migration twice yields the same canonical envelope. Repeated prototype
restores cannot duplicate authority records or receipts because the migration
only copies records and the existing restore path does not replay authority
transactions.

The new `tests/e2e/specs/title-id-migration.spec.js` covers both bookmarks,
legacy aliases and mod data, v3-to-v4 idempotence, non-title state preservation,
repeated restore and failure atomicity. Existing title-related specs now use
canonical IDs. The owner still needs to run the suite, test the local historical
867/1066 save corpus from Phase 0, and compare the recorded RNG, political,
personal and size baselines. Manual mobile and itch.io checks remain
owner-controlled under the repository test policy.
