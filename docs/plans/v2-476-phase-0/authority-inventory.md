# Authority consumer inventory

Static baseline: dev e178db16cdd10a624c134dbebb75fcdd27df4db2, v1.184.0,
2026-09-23. This records the migration surface before changing runtime behavior.
System names identify maintenance ownership, not separate new engine modules.

## Reading the ledger

[authority-references.csv](authority-references.csv) records each matched source
line, its subsystem owner, read/call vs possible write, intended query families,
and exact source text. The query names refer to the proposed
[authority contract](../../designs/authority.md). They are migration destinations,
not functions that exist today. Multiple destinations on one line are intentional:
local ownership, actor identity and permission often appear together.

The ledger contains 7,120 references in 81 files. The match expression is preserved
in [authority-search.txt](authority-search.txt). Reproduce the source census from
the repository root with this read-only command:

~~~powershell
rg -n --no-heading -f docs/plans/v2-476-phase-0/authority-search.txt js data mods index.html -g '*.js' -g '*.html' -g '!lang_*.js' -g '!settlements_real.js'
~~~

The ledger is deliberately broader than executable authority decisions. Comments,
data definitions, station-only presentation and physical settlement rank remain
visible. A write-candidate is a lexical classification, not a parsed JS effect:
review the whole function, aliases and callees before moving it. An operation
that calls a mutation helper can write without assigning a matched field itself.
Do not mechanically replace every rank check with a permission call.

Generated language catalogs are translated output, not authoritative logic.
Generated settlement names/coordinates are physical data; their loader and slot
identity are reviewed through world/lordships. CSS cannot grant authority. Mods
currently supply documentation rather than a bundled JS government implementation;
future mod scripts and dynamic property access need their own compatibility audit.
This search cannot prove absence of an indirect dependency through an arbitrary
alias. The manually identified boundaries below are the review units for that work.

## Owning boundaries and intended replacements

| Group / owner | Existing readers and decisions | Writers and mutation boundary | Intended query and retained responsibility |
| --- | --- | --- | --- |
| World: world.js | topRealm, liegeChain, realmHeldCounties, realmProvinces, realmDirectVassals, realmTerritory, playerRealmId | initPolitics, makeVassalRealm, transferProvince, escheatRealm, absorbRealm, repairVassalLieges, realmBuryIfEmpty | place/relationship/territory use these indices; owner and holder stay distinct |
| World rulers: world.js/model.js | realmRulerCharacterSnapshot, realmIdForRulerCharacter, compact succession and generation lookup | assignRealmRulerCharacter, advanceRealmSuccession, materializeRealmRuler, markRealmDead | actor/role uses compact identity; creation and succession remain explicit writes |
| Progression: main.js/world.js | checkTierPromotions, playerDuchies/Kingdoms/Empires/Titles, title lapse, scenario creation | tier promotions, foundPlayerRealm, loseAllLand, protagonist succession | actor supplies station/rank; territory supplies title geography; permission adapter preserves thresholds, costs and historical claims |
| Grants: actions.js/lordships.js | landGrantRecipientStatus, domainCleanupPlan, excessLandGrantPlan, grant and founding previews | grantCounty/grantDuchy, applyDomainCleanupPlan, applyExcessLandGrantPlan, confirmSettlementGrant | place + actor + relationship, then exact grant permission; keep quote staleness, funds and generation checks |
| Baron/count path: lordships.js | homeCountyAuthority, settlementHolder, landedBaron, countyGrantCandidates, countyChallengeQuote, countyRecognitionQuote | countyInvestiture, begin/completeCountyChallenge, petitionCountyRecognition, founding completion | Local site authority remains separate from county and sovereign powers |
| Settlement authority: lordships.js/economy.js | directSettlements, settlementConstructionAuthority, capacity and fiscal projections | assign/revoke/restore/revertSettlementLordship; construction and baron account settlement | place/territory identifies actual holder; permission(build) uses direct control; no manufactured realm node |
| Commoner/local office: actions.js/economy.js/model.js | serfHomeAuthority, freedom bargains, castellan/qadi/bishop/career and household roles | tenure/freedom transitions, career/office appointments, role synchronization | role/offices resolves current assignments without getRole creation; keep social eligibility separate |
| Armies: armies.js | recruitmentTerritory, playerMusterPreview, playerMusterSelectionQuote, playerControlsHost, activeMilitaryCommand | raisePlayerHost, begin/endMilitaryCommand, orders, disband/merge/split | permission(command/muster) is host-specific; realm owns finance while character may command |
| Campaigns: wars.js/world.js/actions.js | casus, war law, participant, truce, peace and conquest eligibility | declarations, campaign registration/conclusion, warCapture/warLoseProvince | relationship + place + permission(declare/settle); do not enlist a liege automatically |
| Great holy wars: holywar.js/settlement.js | faith office, claimant, participant and award projections | campaign transitions, validated settlement awards, beneficiary installation | offices + relationship + territory; consent and award rights remain distinct from occupation |
| Siege and rebellion: fortifications.js/rebellions.js | fort controller, rebel territory, garrison and relief eligibility | fort repair, occupation, rebel starts and resolution | place/relationship + permission; occupation is not title transfer |
| Logistics/travel: logistics.js/travel.js | friendly routes, military access, provisioning and host controller | paid/taken provisions, route/host movement, caravan consequences | relationship/place and exact permission; retain price and physical path logic |
| Diplomacy: actions.js/model.js/world.js | gifts, pacts, royal marriage, independence, fealty and ruler counterpart | alliance/pact formation, fealty, grants and claim commitments | actor/relationship plus exact diplomatic permission; keep personal vs institutional Standing typed |
| Council: council.js/institutions.js | councilActive, councilSummary, effectiveCrownAuthority, councilNeedsConsent, appointment/dismissal status | councilEnsure, councilAppoint/Dismiss, councilAuthority, votes/elections | offices + permission/consent adapter; legacy numeric Crown Authority retains its 867/1066 meaning |
| Estates: parliament.js/politics.js | active assembly, direct-liege aid/scutage terms, politicalCourt | sessions, votes, obligations, repairPolitics | relationship + offices + operation consent; preserve vassal eligibility and exact debtor/creditor |
| Privileges and constituencies: institutions.js/politics.js | privilege and policy scope, election franchise, collective demands | grants/revocations, elections, policy changes, commons responses | place/relationship + permission; constituency support is not sovereign ownership |
| Religious authority: model.js/world.js/papacy.js | religiousHeadOf, isReligiousHead, bishopric, popeRecognizedBy and obedience | religious office assignment/vacancy/recovery, papal election and schism, conversion | offices/actor + recognition context; personal claimant, recognized pope and territorial realm remain separate |
| Justice: justice.js | justiceRulerEligible, justiceCounties, arrest and punishment projections, custody authorityKey | justiceAttemptArrest, justiceApplyPunishment, ensureJustice, captive succession/repair | place/relationship + permission(arrest/judge); territorial jurisdiction and actual custody differ |
| Intrigue: intrigue.js/agency.js | ruler/target scope, subordinate and foreign checks, evidence and leverage | plots, captivity, schemes, generation-stamped cleanup | actor/relationship/role and exact operation permission; ordinary personal hostility confers no public jurisdiction |
| Taxation: economy.js/treasury.js/fiscal.js | playerTax, settlementFiscalProjection, government costs, grants/sales, treasurySnapshot | seasonal accounts, charters, treasury transfer/retirement, fiscal crisis compositions | place/territory/offices + permission(collect/grant); payer and beneficiary are explicit, no ruler-person purse conflation |
| Economy support: market.js/population.js/modifiers.js | market polity, realm modifiers, community projects and support | market and population ticks, modifier mutation | place/relationship for political scope; preserve population conservation, prices and nonpolitical formulas |
| Technology: technology.js | sovereign research ownership and vassal advocacy | realm tech initialization, inheritance/merge, research completion | relationship/territory identifies institution; technique availability stays with existing technology engine |
| AI: agency.js/world.js/institutions.js/papacy.js | bounded political court, aims, expansion, appointments, religious recovery | annual/seasonal ruler decisions and succession reactions | Same actor/place/relationship/permission adapters as player, retaining current order and RNG |
| Events: events.js/data/events_*.js | declarative tier, liege, realm, authority, role and context triggers; choice eligibility | effects changing tier, offices, land, authority, liege or claim; queued context | Interpreter adapters use actor/place/role/permission; keep ids, trigger meaning and queue identity stable |
| UI: ui_misc/ui_panels/ui_modals/ui_topbar/ui_wars | interaction cards, Governance, Land, Self, Deeds, war and institution reviews | Explicit actions only; rendering is read-only except separately requested court fill | First migration consumers: actor/place/relationship/offices. Show unchanged costs from owning preview |
| Map and presentation: mapview.js/portrait.js/messages.js/music.js/siteart.js | owner color, holder/ruler labels, rank dress, titles and role music | Display/cache updates, no political entitlement | place/actor for political facts; retain purely visual rank, geometry and sound selection |
| Save repair: save.js/world.js/model.js/lordships.js/mods.js | format-3 fields, ids, mod definitions, optional legacy defaults | S.restore and explicit ensure/repair stages, bookmark activation, mod validation | Query reads stay pure; restore owns deterministic repair and complete cache reset |
| Authored data: bookmarks/map_data/counties/cultures/economy/actions/policies/political_institutions/papacy/technology | Starting realm ranks, hierarchy, geography, career/office rules, event metadata | Data loader/validator and new-world initializer | Data definitions remain inputs; validate ids and combinations; do not rewrite positional map records through UI queries |

AI is a cross-cutting owner as well as agency.js: worldTick, religious recovery,
baron investment, treasury spending and institutional opposition are listed with
their owning mutation systems. Likewise, save repair includes every initializer
called by S.restore, not just direct assignments in save.js.

## Findings that shape Phase 1

1. Existing snapshots already distinguish territorial and personal identity.
   realmRulerCharacterSnapshot is pure; the older realmRulerCharacter synchronizes
   the compact ruler. A wrapper around the latter would violate the new contract.
2. homeCountyAuthority uses the actual direct holder. A historical roles.lord
   character is not sufficient evidence of present legal power. syncHomeCountyLord
   is intentionally a mutation and can materialize the ruler.
3. activeMilitaryCommand/playerControlsHost already separate a host's owning
   realm from its commander. Preserve that split and its exact host id.
4. Territorial barons, bishops, castellans, qadis and religious heads expose why
   tier 3 or a title label cannot be generalized into ownership. Keep existing
   exceptions while giving offices addressable read identities.
5. Settlement and world invalidators overlap in their military revision fan-out.
   Capture behavior before coalescing; no performance win is assumed from a scan.
6. Council authority, rank, and religion feed many distinct operations. Preserve
   their current meaning per adapter; replacing them globally would silently
   change eligibility, elections and fiscal outcomes.
7. Generated data includes positional county/realm definitions whose relationships
   are read by loader code. The census matches their schema and loader rather than
   every individual county tuple. Preserve geography and scripted ids through
   later canonical-id migration.

## Conversion order and parity ownership

First migrate the realm/character interaction-card models and county holder
labels without changing navigation. Compare displayed ruler/holder/costs with
journeys B1–B9. Next expose pure existing office/role snapshots, including compact
rulers and religious vacancies. Then move one preview and its confirmation path
together (a settlement grant is the first proposed bounded transaction). Check
same-turn holder/ruler changes before any payment. Only after those cases pass
should army, justice, fiscal, AI and event consumers migrate in bounded changes.

The complete ledger is a starting checklist. For each conversion record the
function, old predicate, adapter, retained price rule, mutation owner, regression
spec and owner parity evidence. Leave unmigrated entries explicitly on their
existing implementation; do not claim the generalized Phase 2 authority model
exists just because all current field accesses have wrappers.

## Source coverage by file

Counts include comments and data. The group and intended query families are also
present on every reference row; these counts do not measure gameplay complexity.

| File | References |
| --- | ---: |
| data/actions.js | 13 |
| data/ambitions.js | 4 |
| data/bookmarks.js | 1 |
| data/counties.js | 5 |
| data/cultures.js | 12 |
| data/distribution_crazygames.js | 12 |
| data/economy.js | 93 |
| data/events_agency.js | 3 |
| data/events_common.js | 85 |
| data/events_communities.js | 1 |
| data/events_council.js | 18 |
| data/events_intrigue.js | 3 |
| data/events_lifepaths.js | 10 |
| data/events_noble.js | 59 |
| data/events_parliament.js | 42 |
| data/events_paths.js | 36 |
| data/events_peasant.js | 113 |
| data/events_politics.js | 4 |
| data/events_tournament.js | 14 |
| data/events_travel.js | 3 |
| data/events_tutorial.js | 1 |
| data/events_war.js | 35 |
| data/events_world.js | 16 |
| data/intrigue.js | 1 |
| data/map_data.js | 418 |
| data/markets.js | 2 |
| data/music_catalog.js | 98 |
| data/papacy.js | 5 |
| data/policies.js | 15 |
| data/political_blocs.js | 1 |
| data/political_institutions.js | 17 |
| data/starts.js | 8 |
| data/technology.js | 46 |
| data/traits.js | 4 |
| index.html | 20 |
| js/actions.js | 665 |
| js/agency.js | 81 |
| js/ambitions.js | 24 |
| js/armies.js | 88 |
| js/council.js | 71 |
| js/economy.js | 240 |
| js/events.js | 507 |
| js/fiscal.js | 18 |
| js/fortifications.js | 41 |
| js/holywar.js | 240 |
| js/i18n.js | 1 |
| js/institutions.js | 196 |
| js/intrigue.js | 115 |
| js/items.js | 20 |
| js/justice.js | 54 |
| js/localfolk.js | 17 |
| js/logistics.js | 15 |
| js/lordships.js | 186 |
| js/main.js | 177 |
| js/mapview.js | 48 |
| js/market.js | 24 |
| js/messages.js | 8 |
| js/model.js | 226 |
| js/modifiers.js | 12 |
| js/mods.js | 36 |
| js/music.js | 11 |
| js/papacy.js | 136 |
| js/parliament.js | 69 |
| js/politics.js | 36 |
| js/population.js | 51 |
| js/portrait.js | 37 |
| js/rebellions.js | 24 |
| js/save.js | 70 |
| js/settlement.js | 4 |
| js/siteart.js | 8 |
| js/technology.js | 33 |
| js/travel.js | 52 |
| js/treasury.js | 35 |
| js/ui_misc.js | 39 |
| js/ui_modals.js | 1006 |
| js/ui_panels.js | 301 |
| js/ui_topbar.js | 3 |
| js/ui_wars.js | 6 |
| js/util.js | 7 |
| js/wars.js | 112 |
| js/world.js | 752 |
