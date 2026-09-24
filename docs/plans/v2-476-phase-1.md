# 476 Phase 1: shared world and political queries

Date: 2026-09-23. Baseline: v1.184.0 on dev.
Parent: [476 phased implementation plan](v2-476-phased-implementation.md).
Contract: [Shared political facts and authority](../designs/authority.md).

## Implemented scope

FB.political in js/politics.js exposes actor, place, relationship, territory,
role, offices, office and permission. Inputs are explicit state and typed
references. Actor/place/relationship/office views are fresh projections;
territory reuses the existing world index. Returned objects, arrays and office
terms are detached. Compact ruler reads retain member/generation identity and
do not create characters or courts. Role reads do not repair stale spouse links.

Office views expose existing Council, religious-head, bishopric, papal,
castellany, military-command, family, retainer and guild records independently
of land. Realm-held seats retain realm holder references. Personal offices do
not fabricate a player realm or change station. Active and recorded status have
the precise limits described in the contract; neither independently authorizes
an action. A legacy command without hostId resolves its current primary host.

## Migrated callers

| Caller | Shared source | Retained behavior |
| --- | --- | --- |
| Realm/character interaction cards | actor and relationship | Existing text, action ordering, current direct liege/vassal relationships, materialized ruler identity |
| homeCountyAuthority | place | Current direct county holder/ruler; stale story-lord role does not override it |
| settlementGrantQuote | permission for grant_settlement | Existing recipient/site rules, fiscal terms and full quote signature |
| confirmSettlementGrant | Requotes through the same adapter | Reject stale identity/terms before assignment; original station/tier and liege mutations |

settlementGrantEligibility contains the extracted pure rule, so permission and
the quote do not recurse or maintain competing policy implementations. Unknown
operations and missing context fail closed. Existing construction, justice,
command, diplomacy and fiscal permissions remain their subsystems' responsibility
until their bounded Phase 2 migrations.

## Invalidation

No new saved cache or authority map exists. Small projections see appointment,
conversion, succession and liege changes immediately. Territory follows the
existing state-identity/dirty index; real territorial mutations must keep using
its invalidation boundary. Queries never invalidate or increment revisions.

Settlement assignment invalidates the holder and world indices once each. The
world invalidator notifies military inputs; the adjacent building eviction is
told the notification already happened. Thus a player-to-NPC settlement grant
advances settlement, realm and military revisions once each. Ordinary building
changes still notify military inputs. Rejected confirmation and unchanged
assignment notify nothing. Other legacy transactions may have intermediate
writes/reads and multiple invalidations; this change does not postpone their
notifications or claim all global mutation paths are coalesced.

## Coverage and owner comparison

New tests/e2e/specs/political-queries.spec.js defines eight journeys, four for
each existing bookmark, through the real start-code UI:

- Legacy owner/holder/ruler/territory parity, repeated-read state/RNG/UID purity,
  detached results, invalid references and unsupported operations.
- Landless bishop and household office records, same-turn removal, conversion,
  religious vacancy, exact-host command and loss of its host without land changes.
- Compact rulers, current lieges, Council appointment/removal, ruler replacement,
  stale grant rejection, county transfer, role freshness and v3 save restore.
- Grant eligibility and fiscal terms, rejected/duplicate confirmation, delegated
  site ownership, costs, station and exact revision increments, plus standalone
  building invalidation.

Existing interaction-cards.spec.js and settlement-lordship-grants.spec.js now
include politics.js in their runtime dependency metadata. They retain their UI,
price, navigation, purity and transaction regressions.

The owner requested progression using the existing notes/ saves and benchmarks.
Their exact inputs, including the revised stage3 logistics export hash, are in
[the baseline record](v2-476-phase-0/baselines.md#phase-1-baseline-adoption-2026-09-23).
Use identical exports and season boundaries for before/after profiling. Runtime
parity, timing and real-device acceptance remain owner-controlled; authored
coverage is not a claim of measured acceptance.

## Compatibility and subsequent work

Save format remains v3. No durable appointments, new authority powers, 476
bookmark, technology eligibility, i18n catalogs or script loading changes are
introduced. As an internal parity refactor, this phase needs no technology-impact
ledger entry. Integration owns the next version/changelog assignment.

Phase 2 can build scoped Ban, Peace, Revenue and Consent on these facts. It must
add explicit durable transitions and review each capability, then migrate owning
transactions with their existing-bookmark parity cases. The Phase 0 inventory
remains the navigation record for those later consumers.
