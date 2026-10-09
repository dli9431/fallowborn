Authored royal courts and succession

Conditional court foundations

FB.foundPolity(state, definition, counties, formerRealmId) establishes a declared independent court only on the eligible counties supplied by a conditional foundation story or an earned revolt settlement. It refuses an existing realm id, unknown or impassable counties, duplicate counties, inconsistent former ownership and player-controlled holders. It uses ordinary government, treasury, technology inheritance, transfer and eager royal-court creation transactions. The declared ruler becomes a normal materialized character with ordinary dynastic succession. Source communities, other surviving source counties and armies are preserved. Eligibility and bounded historical outcomes belong to the reusable polity_foundation story, not a date selector in the world engine. This baseline local independence capability has technology impact none.

Named starting relatives are content, not a research capability. The independently selectable declared_royal_succession policy has technology mode none: ancestry, survival and eligibility supply its constraints. No research prerequisite belongs to family inheritance. A realm may declare royalCourt; absent declarations retain the existing generation path and RNG/uid progression. Initialization consumes declarations only at new-world creation. Government succession strategies dispatch an optional saved policyId, defaulting to the realm form's policy. Agnatic seniority selects adult male descendants through male parents from an explicit founder, oldest first with stable identity ties. If no eligible male survives, the ordinary living dynastic frontier is used; if that frontier is empty, the existing vacant-line repair applies. Opening preference is consumed once at creation and never reapplied on restore or accession.

Living branches and regional settlements

js/royal_settlements.js links an already ruling subordinate son to an overlord's saved genealogy through branchRef records, preserving the source court's single character identity. Source courts own mortality; birth, death and compaction notify linked parent courts through a derived reverse index. Pure kinship queries can resolve the shared parent genealogy across these birth courts, preserving close-kin marriage guards after character compaction. When such a son inherits the overlord, his subordinate or independent realm consolidates into the senior realm through ordinary accession. Its surviving household receives senior genealogy links, holders and subjects reattach, technology and active wars merge and the realm-death transaction names the treasury recipient. A regional incumbent under a foreign liege cannot bypass that liege through automatic consolidation. No historical selector is part of these shared APIs.

designatedHeirId is a saved, living member preference within the ordinary eligible dynastic frontier. A dead or ineligible member receives no priority; accession consumes the preference. This differs from the one-turn openingPreferredId seed. A regional grant quotes complete direct-subject territories, refuses foreign counties and moves local hierarchies together. A release changes sovereignty while preserving local holders. The 800 story composes these transactions; ordinary bookmarks without linked branches or settlement preferences keep their original succession path. Technology impact royal_succession_settlements is none because family inheritance and regional government require no invention.

# Realms, the liege hierarchy & tiers

## Shared political queries (476 Phase 1)

The [authority contract](authority.md) defines the implemented shared actor, place,
relationship, territory, office and permission reads. It reuses the current
owner/holder, ruler and settlement indices while separating social station,
territorial control, personal office and military command. The
[consumer inventory](../plans/v2-476-phase-0/authority-inventory.md) assigns the
existing readers and mutation boundaries to their migration owners.
FB.political supplies pure snapshots to interaction
cards, home authority and settlement grant eligibility. Current 867/1066 rules,
prices and confirmation signatures remain with their owning subsystems.
Phase 2 adds scoped Ban, Peace, Revenue and Consent in authority.js, with
separate appointments, recognition, federate commitments and customary rights.

Generated duchy realms use d_ followed by the canonical duchy id. Generated county realms use c_ followed by the county id. These opaque realm identities remain separate from canonical title ids, preserving authored kingdoms such as Burgundy when a duchy has the same name and preventing replacement of their sovereign hierarchy.

## Eras and government forms

Every bookmark declares an `era` from `FBDATA.eras` (`data/eras.js`):
`late_antique` (375–649), `early_medieval` (650–999) and `high_medieval`
(1000–1300). 867 is early medieval, 1066 high medieval and 476 late antique. An era
holds an inclusive year window, a default government form and a default culture,
plus period definitions (costume, ladder, systems,
technology, event eras, currency and architecture). A bookmark without an `era`,
such as an older mod, runs in the era whose window holds its start year, or the
nearest era when none does; a declared era must hold the start year.

Each authored realm may declare a `government` form; a realm without one takes its
era's `defaultGovernment`. A form names one strategy per behavior slot, and engine
code dispatches through the realm's form instead of choosing rules by bookmark.
The government registry in js/governments.js resolves holders, succession, territory, consent, levy, revenue, council, diplomacy, ai and ladder. Every bundled form names all ten slots. Existing JSON mods may omit historically optional slots and use deprecated engine_default aliases of named implementations. Empty or incomplete implementations and the retired vocabulary slot fail validation. The complete consumer inventory, typed interfaces, cache and mutation boundaries are documented in docs/designs/governments.md. Optional saved court policy ids still override the form's succession strategy.

| Form | Holders | Succession | Territory | Consent |
| --- | --- | --- | --- | --- |
| `territorial` (867, 1066) | `feudal_vassals` | `dynastic` | `fixed` | `territorial` |
| `regnum` (late antique kingdoms) | `direct` | `dynastic` | `fixed` | `territorial` |
| `roman_civic` | `direct` | `office` | `fixed` | `delegated` |
| `federate_polity` | `direct` | `acclamation` | `non_territorial` | `delegated` |

Holders and consent dispatch through the form today. At creation each authored
realm's holders strategy places its counties: `feudal_vassals` keeps the capital
duchy as the ruler's demesne and generates dukes and counts for the rest;
`direct` leaves every county of the realm in its own hand. The consent strategy
decides whether a realm's territorial rule answers local civic consent
(`territorial`) or leaves it to a delegated office (`delegated`). Succession dispatches a declared court policy through the registry; forms without a policy override retain the shared frontier behavior.

Creation stamps `state.start.era`, `state.start.geography` once a bookmark
declares one, and `state.start.defaultGovernment` from the era. `FB.initPolitics`
then writes an authority government row only for a realm whose declared form
differs from that stamp; 476 seeds its Roman courts (`roman_civic`) and federate
body (`federate_polity`) this way, while its other realms take the late antique
`regnum` default. A realm without a row resolves to the stamp, or to `territorial`
in a save without one, never to the current era default; see
[state and saves](state-and-saves.md). Realms created during play take the stamped
default.

Activation resolves the era and each realm's form before the world is built. An
unknown era, a start year outside a declared era, an unknown form or a form
whose strategy is not registered fails with a named fault, for example
`realm my_realm uses government my_form, whose holders strategy my_holders is not
registered.` Generation that needs a culture the map does not supply (a ruler
without a capital county, a usurper without a seat) uses the era's
`defaultCulture`.

### Layered balance

An era, a government form or a bookmark can tune any existing balance value without code. js/balance.js (FB.balanceLayers) composes the layers in this order: global (FBDATA.balance as authored), era, government form, bookmark, mod. Each layer replaces the whole value of the keys it names; a mod's countyCommunityProjectPolicies still merges by policy id.

Campaign-wide layers. Activation composes the era, bookmark and mod layers into FBDATA.balance itself, so the roughly 430 existing reads of FBDATA.balance and the local B() accessors keep working with no edit and no extra cost. Only keys some layer names are rewritten: the table object keeps its identity and every other key keeps its value, so a campaign with no overrides runs exactly as before. Keys the previous bookmark set and the next one does not return to the global value with mods reapplied. Mods now record their balance values as the last layer instead of writing the table directly, so a later activation cannot bury them. FB.save.restore recomposes the table from the save's stamped era and its bookmark (FB.balanceLayers.applyCampaign), so a save made in one era restores the same active table even if the bookmark's declared era has since changed.

Realm-scoped layer. FB.balanceFor(state, realmId, key) returns the realm's government-form override when its form names the key and neither the bookmark nor a mod does, and otherwise the active value. When no form names the key it is a single table read. Call sites are converted only where a specific realm is the subject and a later plan needs the knob. Converted so far:

- FB.aiBaseHost (js/world.js): levyPerDev and aiHostPerDev for the mustering realm.
- AI construction (js/world.js, the annual building pass): realmReserveSeasons for the building realm's reserve.

Every other read takes the campaign-wide value, so a form override of an unconverted key has no effect until its site is converted.

Validation. Override tables may name existing keys only. FB.balanceLayers.problems rejects an unknown key, a non-number where the default is a number, and any other change of value type. Era faults come from FB.validateEraData, form faults from FB.governments.validate and bookmark faults from FB.validateBookmark; all three block activation. None of the shipped eras, forms or bookmarks declares an override yet.

## Station and rank queries

Engine eligibility reads FB.station, FB.realmRank and FB.socialStation from js/station.js. Each era declares a ladder in data/eras.js. Early and high medieval campaigns retain FBDATA.stationLadders.feudal; late antique campaigns use FBDATA.stationLadders.late_antique. A government form may name a registered ladder strategy containing partial bands, ranks and social tables; supplied fields override the era row, including explicit false flags. Era and strategy validation rejects unknown fields, malformed flags, invalid scale references and promotion routes before activation.

The saved station scale remains eight bands, 0 through 7. Each band declares used, order, eligibilityTier, socialStation, realmRank, role, succession, promotion and previous. Named boolean meanings describe freedom, gentle standing, land, county control, realm rule, Estates membership, council eligibility and rank identity. Military command, justice and dynastic marriage have separate meanings, so permission need not imply land ownership. An unused band answers no permission, fails a supplied minimum and exceeds a supplied maximum. Numeric thresholds still address the abstract eligibilityTier; they no longer compare the saved tier directly.

Queries accept the subject followed by an optional state, or a threshold followed by state for reaches and exceeds. Omitted state uses FB.state; null uses the shared baseline. Explicit state is passed by simulation consumers, including creation, succession, restoration and inactive campaign reads. The subject's own realm form wins, then a landless player's immediate liege or home holder, then the campaign's stamped default. NPCs resolve their own ruling realm or residence. The resolver reads authority government rows without invoking political actor queries or repairing saved state. Bare tiers are prospective player bands; a realmId or formId supplies another subject's context. Portrait descriptors retain formId and era, without retaining a campaign reference.

Realm rank rows hold order, tier and their named meanings. FB.station.realmRank and FB.realmRank.tier replace the former tier-minus-three and rank-plus-three conversions. Relative dignity checks use above, higherTier and higherRank; same tests persisted identity. Promotion reviews read the band's promotion route and next band, higher claims resolve their named target band and skip unused bands, title lapse reads previous, and household succession reads personal or dynastic. Crossed recognition costs and their displayed order follow ladder ordering, while prices and de jure substance remain with the existing promotion system. Form-specific careers and political offices remain separate consumers of this contract.

NPC social station remains the independent five-class saved scale. FB.stationOf keeps its legacy lord/notable inference; FB.socialStation reads the era/form social rows for free, gentle, noble and royal eligibility, relative gaps and policy thresholds. Player social class comes from its band mapping, with the existing papal/cardinal override. Changing a ladder does not rewrite existing NPC class identities.

Rank labels are indexed by the same stable bands. Labels for used bands are required; unused bands may have null or omitted labels, including a shorter array when only trailing bands are unused. Per-band lexicon fallback preserves an old saved band instead of clamping it to the final supplied label. The base and general faith/culture lexicon layers retain labels for all shared bands; government and era lexicon layers validate against their corresponding effective ladder. Legacy faith rankTitles validate against the campaign's effective ladder when a campaign is supplied, without binding the cached faith compilation to a government form.

The source lint in tests/e2e/specs/station-queries.spec.js rejects numeric member tier, rank and station comparisons and direct stationOf/playerStation numeric comparisons outside the resolver. Its save/validation allowlist remains empty. The following inventory records the feudal baseline and call-site counts from the original wrapper conversion; other forms answer through their overrides.

| Query | Today's answer | Meaning | Call sites (count by file) |
| --- | --- | --- | --- |
| `station.isSerf` | tier 0 | unfree, bound to the land | events 20, actions 12, main 12, ui_misc 5, ui_modals 5, ui_panels 5, model 2, portrait, save, tournaments, world |
| `station.isFreeholder` | tier 1 | the freeholder band | actions 6, economy 2, main 2, ui_modals 2, ui_panels 2, world 2 |
| `station.isGentry` | tier 2 | the gentry band | actions 11, economy 4, lordships 4, model 4, events 3, armies 2, ui_modals 2, abbeys, ui_panels |
| `station.isBaron` | tier 3 | the barony band, a status inside a county | actions 14, world 5, justice 3, lordships 3, abbeys 2, events 2, armies, economy, main, population, technology, ui_modals |
| `station.isCount` | tier 4 | the count band | model 2, actions, ui_panels, world |
| `station.isDuke` | tier 5 | the duke band; a duchy ambition | ambitions 6, actions 3, model 2, title_ids, ui_panels, world |
| `station.isKing` | tier 6 | the king band; a kingdom ambition | actions 2, world 2, ambitions, title_ids, ui_panels |
| `station.isEmperor` | tier 7 | the emperor band | actions, ui_panels, world |
| `station.isFree` | tier 1+ | free of servile obligation | events 6, abbeys 2, actions 2, ui_modals 2, economy, holywar, main, tournaments, travel, ui_misc |
| `station.isGentle` | tier 2+ | gentle standing, a manor or better | portrait 5, actions 4, main 4, economy 3, events 3, model 2, lordships, ui_modals |
| `station.isFreeUnlanded` | tiers 1 to 2 | free but below the landed nobility: the road, ventures, local council | actions 3, travel 3, economy |
| `station.isLanded` | tier 3+ | a titled, landed lord: governance, revenue, retinue, war | actions 40, economy 26, ui_panels 15, ui_modals 14, events 13, main 7, portrait 7, fiscal 6, justice 6, world 5, institutions 4, travel 4, ui_misc 4, agency 3, model 3, treasury 3, and 13 more files once or twice |
| `station.sitsInEstates` | tiers 3 to 5 | a sworn lord below the crown who sits in the estates | parliament, politics |
| `station.rulesRealm` | tier 4+ | rules a realm of one's own | actions 25, portrait 8, world 6, ui_modals 4, events 3, travel 3, ambitions 2, institutions 2, authority, justice, lordships, messages, papacy, rebellions, ui_panels, wars |
| `station.holdsCounty` | tier 4+ | holds counties on the map (`state.player.provs`) | lordships 4, actions 2, fiscal 2, mapview, papacy, rebellions, ui_modals, world |
| `station.isDucal` | tier 5+ | duke or above | actions 2, wars 2, world 2, mapview, model, portrait, ui_wars |
| `station.isRoyal` | tier 6+ | wears a crown | actions 8, portrait 6, economy 2, institutions 2, ui_modals 2, world 2, main, model, wars |
| `station.mayHoldCouncil` | tier 6+ | keeps a royal council, crown authority and council confirmation | institutions 3, ui_modals 3, fiscal 2, actions, economy, world |
| `station.isImperial` | tier 7 | emperor | actions 7, portrait, ui_modals, ui_panels, wars, world |
| `station.reaches` | tier not below a data minimum | `tierMin` and `minTier` thresholds, including `councilSeats` | economy 5, tournaments 4, ui_modals 3, actions 2, agency 2, council 2, events, institutions, mods, travel |
| `station.exceeds` | tier above a data maximum | `tierMax` and `maxTier` caps | actions 2, events, institutions, mods, travel |
| `station.societalRole` | serf, commoner, gentry, lord, crowned | the event audience behind `FB.societalRole` | util |
| `realmRank.isCounty` | rank 1 | a county realm | world 3, actions |
| `realmRank.isDuchy` | rank 2 | a duchy realm or award | holywar 4, ui_modals 2 |
| `realmRank.isKingdom` | rank 3 | a kingdom | world |
| `realmRank.isTerritorial` | rank 1+ | a territorial realm, not a faction | armies 2, authority, justice, treasury, wars, world |
| `realmRank.isDucal` | rank 2+ | duchy or above | lordships 2, fortifications, wars |
| `realmRank.isRoyal` | rank 3+ | a crown: kingdom or empire | holywar 12, world 11, actions 9, ui_modals 6, agency 2, ambitions, events, model, wars |
| `realmRank.isImperial` | rank 4 | an empire | wars |

Action, event, career, venture, travel and tournament thresholds pass through reaches and exceeds; an absent threshold never blocks. Actions may additionally name an eligibility.station permission. Built-in council seats declare mayHoldCouncil, while older mod seats retain their tierMin gate. Estates membership still also requires a living liege. World territory, physical holdings, offices and explicit grants remain separate facts; a station flag alone never creates counties or an appointment.

Technology impact: this is an internal eligibility refactor with parity data for all shipped forms. It introduces no shipped gameplay option or research gate, so no technology-impact ledger entry is required.

Coverage: station-ladders.spec.js covers both medieval bookmarks across the eight bands, save restoration, an isolated landless command form, unrelated realms and inactive campaigns, era overrides, malformed ladder data, unused bands and sparse rank-label fallback. station-queries.spec.js covers baseline query answers and the source lint. The existing full fresh, save-corpus and portrait parity journeys remain the owner-run comparison coverage.

Late antique recognition

The eight saved bands represent dependency, free citizenship, civic notability, decurional standing, county government, senior command, royal or patrician dignity and imperial dignity. Roman civic labels use Curialis, Decurion, Comes, Magister militum, Patrician and Augustus. Federate government uses Host Notable, Veteran, Comes, Dux, Rex and Augustus. Faith vocabulary continues through the established lexicon precedence. A decurion is free and can seek a county, but standing alone supplies no settlement, military command, local justice or Estates seat.

Every nonterminal late antique band declares a standing promotion with an explicit next band, cost and alternative requirement paths. Wealth and prestige, completed years in qualifying career roles, effective personal offices, living recognition, directly held county counts, patron Standing and sovereignty are separate criteria. Every requirement in one path must hold. Roman civic advancement from Curialis needs civic service and means or a live appointment; federate advancement accepts completed military service. Civic class remains dynastic, while Roman senior offices and federate service standing are personal. Existing authority succession and territorial inheritance still own those records.

js/progression.js quotes current facts without creating a career, office or realm. The recognition sheet displays all alternative routes, exact costs and the first blocker. Confirmation rechecks the full quote, including career experience, government, mandate IDs, living patron generation, savings and territory. It charges the declared cost once and assigns the next band. A decurion's county elevation requires an actual reviewed county investiture from a living superior; their seat, last personal county and delegated counties remain protected. That investiture preserves the granting institutional form for the new player realm. Ordinary conquest and inheritance remain separate acquisition paths.

Manor recognition, hereditary barony petitions, the exceptional feudal field-command reward and automatic de jure duchy recognition are unavailable through this ladder. De jure feudal crown lapse does not govern period offices; authority effectiveness and ordinary land loss remain independent. The higher period dignity paths require actual county government and their political or wealth criteria, rather than a majority of medieval title geography.

FB.station.subject maps an NPC's existing social class or reigning realm rank into the same contextual bands. Managed NPCs with personal resources use the same recognition quote and costs; their territory is never created by a social promotion. A bounded annual AI pass accrues the existing ruling-rank prestige rate into realm.stationPrestige, checks the identical paths and spends that realm's treasury for eligible higher recognition. realm.stationStandingYear prevents duplicate annual accrual. Already authored rulers retain their initial rank; these fields are additive and older saves begin accumulating them at the next annual boundary.

Patron Standing belongs to the candidate being reviewed. Player recognition retains the existing player-to-patron Standing query. A reigning non-player vassal uses its realm's favor at the direct liege's court; a non-ruling candidate uses that person's recorded standing with civic or church institutions in the patron's directly held counties. The highest recorded local standing supplies that path, and an unrecorded relationship begins at zero. Changing the player's reputation cannot qualify or disqualify another candidate. No separate reputation meter or saved field is introduced.

Technology impact: period_station_recognition is none. Standing, office, acclamation and ordinary county investiture are political and social relationships. No research gate is attached to baseline recovery or the climb. The civic career expansion retains period_476_civic_career as none. Baseline tenant work is separately reviewed as period_tenant_work, also none; it conveys no colonate tenure. Regression coverage is in tests/e2e/specs/476-ladder-careers.spec.js.

## Canonical de jure title IDs (476 Phase 3)

Each de jure rank has its own ID namespace. The slug `sicily` can denote a
duchy and a kingdom because the table or field supplies the rank. Authored
counties use a duchy slug; duchies name a kingdom slug; kingdoms name an empire
slug. Bookmarks and mods may still provide old `d_`, `k_` and `e_` IDs at typed
boundaries. Activation resolves them to canonical slugs and rejects alias
collisions or missing parents. Realm and character identifiers are separate
and are never rewritten merely because their spelling resembles a title.
Title slugs may start with a lowercase letter or a digit, including year-prefixed
administrative groups. Legacy aliases enforce their rank before removing the
prefix, so a kingdom alias cannot resolve as an empire even with a numeric slug.

Tracked biographies record genuine royal accessions, living abdication and ducal recognition with
the person and title at that boundary; repair-only succession does not add a
dated accomplishment. Crown lapse records the outgoing dignity. Histories do not
prevent dead court compaction or transfer achievements to a later ruler.

## Family settlement grants

Both settlement grant lists use the shared title hover/focus tooltip and compact
Details disclosure to explain that the direct-settlement total includes county
seats, which transfer only with their county and are omitted from these lists.
Other barons’ holdings are also omitted. Reserved settlements stay listed, with
guidance to remove their reservation in Grant Land before granting.
This is presentation only; ownership, grant eligibility and technology gates are unchanged.

Grant Land has county and settlement reservations and a reviewed excess-grant
batch. It first gives away enough eligible counties to reach the county limit,
then recalculates excess direct settlements after those county transfers. Only
enough additional non-seat settlements to reach the settlement limit are selected.
Capital and home counties, the home settlement, occupied/besieged counties, and
reserved holdings are omitted. A reserved settlement also prevents its containing
county from being selected by this batch; a county reservation alone does not
reserve each separate settlement title. Remaining blocked excess is disclosed;
the player may apply the listed partial proposal without transferring protections.

Selection uses current net local seasonal income ascending, then reverse county
acquisition-list order and reverse settlement-slot order for ties. Old saves lack
complete acquisition dates, so these stable orders are the explicit newer-holding
fallback. Counties go through ordinary generated vassal grants; individual sites
receive new local hereditary barons. The preview consumes no RNG and shares one
fiscal context. Confirmation revalidates the entire proposal before mutations;
generation happens only on confirmation. No daily work or serialized plan is added.
Technology impact `excess_land_grants` is **none**: these are ordinary political
management choices, not a researched capability.

Settlement reservations use `grantSettlement` protection ids (`provinceId:slot`),
persist with existing household protections and block voluntary settlement quotes
until unreserved. They do not block conquest, succession, or involuntary loss.

Grant Land also lists grantable settlements in directly held counties and opens
the existing recipient picker and hereditary grant review. A ruler with one county
can access this deed when a non-seat settlement is available. This is another entry
point to existing settlement grants, with no change to eligibility or technology.
Settlement choices disclose their local building count and current net seasonal
income before recipient selection. These are holding returns, not a promise of
extra income from granting; the review separately explains transferred income and dues.
Back from the review returns directly to the originating Grant Land, settlement
or character sheet, skipping the intermediate grant picker.

Free adult kin, including Freeholders, may receive settlement grants even when married or living
outside the managed household. The grant itself raises the recipient to Baron. Unrelated candidates still need
Gentry rank. Existing ruler exclusions remain. Character sheets
open a settlement picker followed by the same revalidated grant review as the
settlement-first flow. Other holders link from settlement sheets to their character
sheet, with a return to the originating settlement. This extends the existing
settlement_lordship technology review (none); no research gate applies.

## Governance authority

A Baron needs an actual directly held settlement and the home county liege to
enter territorial Governance. A title without land does not confer authority.
Settlement community projects follow direct lordship, while county policy
remains a county-holder power. These are ownership-consistency fixes, not new
technology-gated capabilities.

## Territorial countship (Phase 6)

A landed Baron petitions a higher ruler in the home county's ancestor chain.
A directly governing Duke or higher ruler can also grant from their own demesne.
Only that ruler's directly held, unoccupied counties are offered, excluding their
capital and last personal county. The selected county and grantor are part of the
stale-review check. The petition requires 65 Standing with that grantor and 400
prestige, charges existing county investiture resources only on acceptance, and
uses the existing 1,440-day county petition cooldown. Acceptance chance is
clamped to 10%-85%, with base 25% plus Standing/200. Existing inherited titles
continue through absorbRealm; baronies and works are preserved on elevation.

A landed Baron can challenge a county containing their barony. An explicit
superior-authorization petition succeeds with a county claim and 65 Standing;
it is free and has the ordinary county petition cooldown. Authorization is tied
to the challenger, incumbent and superior ruler identities. Without authorization,
the superior defends the incumbent even against a valid claim. Independent
counties have no superior and no authorization request.

Sanctioned victory is recognized. Unauthorized victory beneath a superior gives
control with disputed status; a separate recognition petition uses ordinary county
investiture resources and the shared 1,440-day petition cooldown. Refusal charges
no investiture resources and leaves control intact. Acceptance clears only disputed
status, never rival claims. Independent victors need no superior recognition.
Unclaimed usurpation additionally applies existing aggression costs/unrest and
records a county restoration claim for the displaced ruler and dynasty.

Only the objective county changes hands. Unassigned holdings and settlements held
personally by its incumbent follow its county title; unrelated baronies, the
player's pre-existing barony, buildings and private property retain their owners.
No county outside the objective is confiscated. Landless defeated realm nodes may
dissolve through existing hierarchy cleanup; their people and property survive.

Technology impact reviews county_investiture, county_challenges and
county_recognition are **none**: these are ordinary political and recovery rights.
Explicit settlement revocation/restoration extends the existing **none**
settlement_lordship review.

## Founding a barony (Phase 5)

Gentry have two visible routes: petition for an existing settlement, or fund a
charter for an unused home-county site. New Gentry charters require the same
established gentle house as existing-settlement petitions: a later generation
must inherit Gentry standing. Founding does not require the petition's Standing
threshold. Already-funded charters retain their original commitments.
It charges construction first and saved investiture resources at completion.
The current county holder becomes the new baron's liege; a change of count does
not revoke a funded charter. Succession transfers sponsorship to the household
heir while retaining original founder provenance. Founding grants no county and
keeps warfare county-based. It cannot reduce a rank acquired during construction.
Technology impact is **none**, recorded as `settlement_founding`: this ordinary
route is available without research; administrative capacity remains separate.

## Concrete settlement grants (Phase 4)

Barony petitions keep the established-house, prestige, Standing and investiture
requirements. The actual home count offers a specific directly held non-seat
settlement, preferring the family's manor only if eligible. The review names the
count, local works, gross/upkeep/dues/net, obligations, capacity, cost and chance.
An over-capacity count adds 15 percentage points to the ordinary base grant chance
before the existing repeated-grant multiplier. Standing and house eligibility
still apply. No eligible settlement means no territorial barony offer.

Confirmation compares the complete detached quote, grantor, costs and chance
before drawing acceptance or charging anything. Successful ownership and rank
commit together. Stale/blocked reviews and cancellation spend nothing; an ordinary
refusal retains its existing day, cooldown and Standing consequences.

Counts can grant non-seat direct settlements to adult gentle household members or
local nobles who are not reigning rulers. Voluntary grants cost no gold or day and
are certain; the review makes hereditary control, lost direct revenue, transferred
upkeep, expected dues and capacity relief visible. Private property, county titles,
strategic forts and borders do not transfer. Grant APIs revalidate recipients and
ownership. Fresh Baron starts also require a concrete grant; an unavailable site
returns the player to start selection rather than creating a landless title.

After seasonal accounting, AI considers at most 12 living non-player realms in a
saved rotating order, making at most one grant for each over-capacity ruler.
It protects every county seat and prefers unlanded local noble recipients; when
none exists it creates one ordinary local character, never a realm node. Managed
player-household members are excluded from autonomous AI recipient selection.
Ordinary player petitions remain the disclosed patronage route below the cap.
The existing `settlement_lordship` technology review remains **none**: granting
political rights is baseline play. Capacity retains its separate soft interaction.


Phase 3 consumes the lordship foundation for local construction, direct settlement
capacity, income, upkeep, and military service. Capacity begins at two plus one per
five Stewardship and national domain technology. The 15% multiplicative penalty
per excess site preserves ownership and excludes received contributions; county
capacity remains a separate constraint. Customary baronial receipts are not taxed
again up the realm hierarchy. Concrete grants and autonomous delegation are integrated in
Phase 4. See development.md, finance.md, and war.md for the live integrations.
AI campaign hosts are a separate whole-realm projection: subordinate counties
remain in the campaign pool regardless of intermediate lieges or local barony
delegation. Personal capacity and contract accounting do not apply a second
discount to that territorial force; see war.md.



## Settlement lordship foundation (Phase 2)

`js/lordships.js` separates delegated settlement ownership from county titles.
Delegations belong to ordinary characters, with hereditary identity and customary
service obligations; they never add county realm nodes or entries in `player.provs`.
Direct unassigned settlements follow the county holder dynamically. County conquest
therefore changes a barony's supervising ruler without transferring its lordship or
private property. Assignment and reversion are centralized trusted simulation APIs;
Construction control and accounting are integrated in Phase 3; concrete petitions
and AI delegation are integrated in Phase 4.

The home county holder is now the authoritative local lord. `FB.getRole(state, 'lord')`
resolves that ruler's existing character; its creating path may materialize the
exact ruler on the existing scoped court stream, but never invents a landless grantor.
Former generated local lords remain ordinary contacts. Barony petitions and freedom
negotiation use the actual ruler, while a commoner remains a resident rather than a
formal noble vassal. The role cache refreshes on restore, county transfer, ruler death,
and normal hierarchy reconciliation. A higher-ranked county holder may reside in
another county; this does not invalidate their local authority.

Legacy territorial barons receive one non-seat settlement at migration; personal and
temporary offices do not. See [state and saves](state-and-saves.md) for succession,
extinction, migration exclusions, and custom counties without a grantable second site.
New barony offers use concrete grants in Phase 4. Phase 3 supplies the local
economy on this foundation.

Technology impact `settlement_lordship` is **none**: ownership, inherited rights,
and county authority are ordinary political relationships. Phase 3 adds the
**soft** administrative-capacity interaction under `settlement_administration`;
capacity and fiscal interfaces now expose their integrated projections.

## Territorial justice

Barons can arrest non-rulers at their seat; counts and higher rulers can also
arrest subordinate rulers physically within their territory. Open arrest never
reaches a superior or foreign ruler. Sentence eligibility instead requires
actual custody, and all arbitrary/excessive punishments carry the shared county
support costs and standing losses with all subordinate rulers and the direct
liege. Judicial authority and prisoners pass to a lawful successor.
Forfeiture uses escheat with an explicit `recipientId`, avoiding the heirless
estate lottery while retaining sovereign ownership, treasury retirement, and
vassal transfers. See [justice](justice.md) for the capability and technology
review decisions.

Rank-elevation reviews itemize the costs of all crossed ranks. A Count-to-King
claim therefore displays Duke and King recognition separately, while payment still
uses their existing combined cost. Imperial benefits identify Emperor as the highest
rank and explain authority above vassal kings; Great Sultan is its ordinary Muslim
title, not an additional rung. No promotion prices or eligibility change.

County purchases credit the direct selling holder before a landless seller retires.
Retirement keeps the existing bounded disposition of funds; county buyers do not
inherit the seller's treasury. Local and delivered cash gifts credit the named realm.

AI fiscal accounts belong to Count-and-higher realm institutions, not ruler
characters. Active accounting preserves balances on succession and
independence, transfers uncommitted funds on realm creation, and retires signed
balances and military obligations once on extinction. Escheat and dynastic
inheritance use explicit recipients; county conquest alone does not transfer a
whole treasury. Player inheritance credits signed net coin once, and
new AI realms split from player institutions receive no duplicate player purse.
Rebel placeholders are excluded. Technology impact is `none`: ordinary ruler
accounting has no research prerequisite. Optional construction, recruitment and
replacement training respect expense commitments; sustained insolvency triggers
bounded recovery and existing AI-only seasonal peace decisions. See the staged
treasury plan and war.md for policy, migration and validation boundaries.

Historical ambitions add explicit regional recognition for Normandy, Norway,
England, and Sicily. They reuse normal promotion thresholds and prices, retain
higher ranks, and never transfer unheld counties. The primary region chosen by an
ambition takes preference only while it remains qualified. Each foundation has
technology impact **none**: this is baseline political recognition. Regional
bonuses follow the founding realm through succession, including dynastic absorption
into the player realm; dissolution expires them without resetting completion.
Full rules: [historical-ambitions.md](historical-ambitions.md).

Actual player title lapse queues the shared outcome acknowledgement with the
previous and resulting rank. The earlier Hollow Crown warning remains a decision,
not a claim that the title has already lapsed. Explicit investiture result events
continue to serve as their own acknowledgement.

## Serf home authority

A tier-0 household can answer to three different identities: the exact local manor lord
in `state.roles.lord`, the realm that directly holds its home county, and the top sovereign
resolved through `FB.topRealm`. `FB.serfHomeAuthority` reads those layers without creating
a character or court. Home transfer and direct-holder succession capture before/after
snapshots at their authoritative mutation boundaries; a bounded daily reconciliation
catches an effective sovereign change caused by liege reparenting without scanning every
realm. Same-tradition culture drift alone is not material, while a changed sovereign,
culture tradition, or directional faith-relation severity is.

Compact succession members retain the generation in which they reigned, allowing
`FB.realmRulerAtGeneration` to resolve a former ruler for display without materializing a
court. This household review capability has technology impact **none** because political
subordination is an existing condition rather than an optional researched action.

## Dynastic realm identity

Every living dynastic rank-1 through rank-4 AI realm carries `realm.succession`: lightweight
sons and daughters, a consort, a ruler-generation stamp, a single designated heir, and
an ordered line. Sons precede daughters and older children precede younger ones. If the
designated heir dies, that child's living descendants retain the branch's place before
the heir's siblings. The Papal States instead carry a one-root `papalElective`
succession whose order remains empty.

**The living court is materialized eagerly; the dead compact back to members.** A realm
opens on a real face and a full character card rather than a crest and one line, because
its ruler, adult consort, and displayed heirs are ordinary `state.chars` records from
world creation. `FB.materializeRoyalChild`, `FB.materializeRealmRuler`, and
`FB.materializeRealmConsort` are the only three creation paths, and they are the same
ones a player's first courtship has always used; eagerness only calls them earlier. How
much of a court exists up front is the single `COURT_EAGERNESS` constant at the top of
`js/world.js` - `'court'` (ruler, consort, and heirs) or `'ruler'` - so the setting can
be re-tuned from one line after profiling. Under `'ruler'`, the first realm-sheet open
calls `FB.ensureRealmCourtForDisplay`, which invokes those same materializers for the
bounded consort and heir set; the modal never silently degrades to a ruler-only court.
The display fill creates missing records only - it never advances a dead root, rewrites
marriage links on records that already exist, or ensures the religious-office map
(`FB.papacyTerritorialRealm` is a snapshot read for this reason). Those repairs belong
to load and to the yearly `FB.ensureDynasticState` pass, so under the default policy
opening a sheet writes nothing at all - rendering never repairs a save.
The record count stays bound by the map rather than by campaign length: see the compaction rule in
[characters.md](characters.md). Eager loading and the realm UI both take their bounded
six-member set from `FB.realmFamilySnapshot`; the mutating `FB.realmFamily` ensure path
delegates to the same order, so equal-age members cannot differ between loading and
display.

`FB.materializeRealmRuler` creates or reuses the current `succession.rulerMemberId`,
reparents the existing compact children beneath that member, and attaches one ordinary
character with the ruler’s saved identity, culture, faith, age, effective Martial,
trait, station, and current political standing. `FB.realmRulerCharacter`,
`FB.realmIdForRulerCharacter`, and `FB.isReigningRealmRuler` preserve that identity
through sheets, gifts, marriage, and succession. Personal and political Standing are one
synchronized score while the character reigns. The typed facade routes that person
through the realm backing store, so character and realm interactions cannot diverge.

Court names show rank without creating an additional title record. A consort receives
the ruler's temporal rank in their own sexed form (for example Duke/Duchess), while a
count or duke's children use Lord/Lady and royal or imperial children use
Prince/Princess. These are display-only courtesy styles; they do not alter succession,
station, or realm rank.

**The consort is a succession member with `role: 'consort'`.** One is seeded per
uncommitted ruler generation, of the opposite sex to the ruler and of a plausible age.
An adult pair is married through the ordinary spouse fields so `FB.spousesOf` reports
them; a child ruler instead gets a similarly aged compact reservation with no character
or relationship link until both are sixteen. A consort
is **excluded from the succession by that explicit role and never by parent grouping** -
a consort's `parentId` is legitimately `null`, which is exactly what
`FB.refreshRealmSuccession`'s order fallback matches when there is no ruler root, and it
is also as much of the intent as a build without the `role` concept can read. Consorts
of past generations stay in the tree as dated tombstones and are never read as the
sitting spouse; `FB.realmConsortMember` resolves the current generation's reservation,
while `FB.realmConsortCharacter` resolves it only once it is an actual marriage. There
is no AI remarriage, so a generation whose consort has died simply has none. If an
invalid generated consort is retired because a real commitment superseded it, its
ordinary character record remains navigable; any future same-generation replacement
uses the next deterministic consort suffix rather than colliding with that retained id.

**A ruler who already has a spouse or living betrothal is never handed another.** The
cases that matter are an heir the protagonist married taking the throne and a foreign
heir pledged to the protagonist's child: seeding a consort beside either commitment
would silently create two partners and block the promised wedding. Both the seeding and
the linkage test use the ordinary spouse and betrothal fields, with
`FB.spousesSnapshot` checking the reverse spouse direction because a wife's `spouseId`
points at her husband while his holds only the first. Whether anyone may hold more than
one spouse belongs to the marriage system, and this path must never answer it by
accident. A child accession can therefore reserve its generated match without becoming
unavailable for a real pledge; the reservation becomes an ordinary marriage only once
both are sixteen and only if no outside commitment has superseded it. A
consequence worth knowing: a consorted ruler fails the courtship gate's married check,
so the player courts royal children rather than reigning rulers unless a throne is
widowed. Saves written before consorts existed keep their current generation
unchanged - inventing a spouse for a ruler twenty years into a reign reads worse than
waiting, so those courts gain one at their next succession.

**A succession is continuity of person, not a re-roll.** `FB.advanceRealmSuccession`
eagerly materializes the exact heir on their scoped court stream, then promotes that
record rather than building a fresh stub with a newly drawn Martial score and temper.
This applies even to a collateral beyond the six displayed relatives, so succession
never consumes the shared world RNG. The heir a player spent years cultivating is the
ruler who takes the throne. `FB.realmRulerCharacter` remains the one place character
fields are pushed back onto `realm.ruler`, keeping that stub a projection of the record
rather than a rival truth.
That projection uses `FB.skillSnapshot`, as accession does, so trait and equipment
Martial modifiers remain part of the war-strength stub instead of being overwritten by
the raw trained value.
If a malformed save has an unrelated record occupying the designated heir's derived
character id, accession preserves that unrelated person, retires only the unusable
compact candidate, and continues through the ordered line. A repair-driven accession
from load or realm revival restores the throne and generation-stamped alliances without
queuing a diplomacy story or reconciling the live player household; those side effects
belong to an in-play succession.

Succession-member ids are derived from realm id, ruler generation, role, and stable
member ordinal or character id. They never embed `FB.uid`, so founding or repairing a
realm midway through a year cannot make court identity depend on which character sheet
the player opened first. Character ids remain a direct `FB.courtCharacterId(memberId)`
mapping. A materializer reclaims an orphan only when its `royalLine` names that exact
member; an unrelated collision is left untouched and never triggers a sequential-id
fallback.

**`FB.isReigningRealmRuler` is answered from a derived index.** `realmIdForRulerCharacter`
resolves a reigning ruler through a module-private `charId → realmId` map in
`js/world.js`, rebuilt by `FB.ensureDynasticState` on new game and on load. It is a
cache and not the truth: every hit is verified against the realm's own
`succession.members[rulerMemberId].charId` before it is trusted, and a failed check
drops the entry and falls back to the scan. Without the index the yearly mortality pass
costs a full realm scan for every record that is *not* a reigning ruler, which is
O(records × realms) a year. The index is never serialized - see
[state-and-saves.md](state-and-saves.md).

The realm simulation stays the driver. `FB.worldTick` and `tickRoyalFamily` remain
authoritative for AI aging, death, and succession; eager records add presence, not
simulation. The player's own yearly mortality pass exempts every court character it
has no navigable tie to, and `tickRoyalFamily` rolls exactly those. The two conditions
are exact complements, so no court character is rolled twice and none is immortal.
The court curve is scaled by `balance.mortalityBase`, matching the protagonist and
household curves.
A character may retain their birth `royalLine` after receiving a different crown;
their birth family's tick therefore also exempts every character for whom
`FB.isReigningRealmRuler` is true. Character death closes the birth member and scans
living ruler roots to advance the throne actually worn. `FB.ensureDynasticState`
immediately advances any living realm whose ruler member is already dead, so load or
realm revival never waits inside the yearly mortality chance and never resurrects a
compacted ruler. The county and duchy grant revival paths call the narrow
`FB.ensureRealmCourt` form before returning.

The yearly pass takes one read-only snapshot of the shared family index after ensure
work. Court retention reads its cached `kinById`, and death cleanup reads the snapshot's
reverse spouse and betrothal maps. Each death may invalidate the live index without
forcing another full `state.chars` rebuild; compaction trusts the retention decision
captured before `FB.killChar` severed those links. A generated former spouse is also
retained while they parent a living player descendant, so detaching an unobserved court
record cannot erase that descendant's mother or father.

The special `state.realms.player` node is the player's landed realm, not a synonym for
independence. It may have a `liege`; `state.owner` continues to name the top sovereign
while `state.holder` names the player or one of the player's vassals. Foreign-policy,
crown, and attack gates use `FB.isPlayerSovereign`, while landed-hierarchy operations
use the player realm itself. Swearing fealty reparents this node instead of dissolving
it.

The realm projections share one unsaved owner/holder/hierarchy index. Ownership, holder,
and hierarchy mutation paths invalidate it explicitly, so ordinary daily reads retain
the same county and direct-vassal lists instead of scanning the entire map and realm
table again merely because the calendar advanced. Realm strength is a separate derived
total and is refreshed at most once per turn because development can change without
ownership changing. A different loaded state also forces both projections to rebuild.

**Governance is the player-facing shell over this hierarchy, not another realm
record.** `FB.governanceEligible` admits a territorial baron, an appointed Castellan,
or a player holding count-or-greater land, but excludes observe mode and a see-only
Bishop. A Bishop who also holds temporal counties qualifies for those counties.
`FB.governanceSummary` derives stable ids and numbers for role, player realm, liege,
sovereign, demesne, whole territory, domain cap and multiplier, direct vassals,
institution, active modifier records in the directly held demesne, pending business,
and warnings. It delegates to the canonical hierarchy, Standing, tax, levy, modifier,
Council, and Estates readers, is never saved, and performs no political mutation.
Kings and emperors are reported as crowned rulers; independent counts and dukes as
sovereign rulers; sworn territorial rulers as vassals.

## Crown recognition (AI kingdoms)

An anointed crown is sticky, but it is not landless. An independent AI realm
with kingdom rank and a canonical `titleKind: 'kingdom'` / `titleId` claim
keeps the royal style while it holds even one county inside its claimed de jure
kingdom. This is the **rival phase**: when the player takes the de jure majority of
England and is styled King, the old king remains a legitimate rival King of England
while he holds any English county, and both realms may share the name on the map —
that coexistence is intended, and driving him out of England entirely is the
player's clear path to ending his crown.

The moment the realm holds no county in its claimed kingdom,
`FB.checkCrownRecognition` restyles it at its true dignity: duke of its best de jure
duchy majority (most held counties, the capital's duchy preferred on ties, same
`max(2, ceil(n/2))` threshold as the player dignity rules), else count of its
capital county. Vassals of equal or greater rank are loosed to the fallen crown's
own liege or to independence, mirroring the player hollow-crown lapse. The check
runs from `FB.transferProvince` on the losing realms (so player conquest, AI wars,
scripted history, and escheat all trigger it) and once per year from
`FB.worldTick` as a sweep for non-transfer drift. Realm death at zero counties is
unchanged and takes precedence — a realm with nothing dies rather than lapsing.
Conquest still never grants or transfers the defeated crown itself; empires and
vassal kings are out of scope.

## The relevant political court

### Bounded ruler agency

Every living AI ruler has one generation-stamped aim in
`state.agency.rulerAims`: secure the dynasty, expand, accumulate wealth,
defend the faith, strengthen the crown, seek independence, or preserve peace.
The aim is chosen deterministically from the ruler, realm position, court
family, and temperament. Succession replaces it because the generation stamp
no longer matches; opening a realm sheet only reads the saved aim.

Ruler-to-ruler regard is deliberately sparse. `state.agency.relations` stores
only structural contacts cultivated by the yearly pass: liege/vassal ties,
neighboring sovereigns, and one peer per house in the protagonist's already
bounded political court. A vassal's regard for their liege continues to use
`realm.favor`, and either direction involving the protagonist continues to use
typed realm Standing. An absent sparse edge derives a baseline from
culture, directional faith relation, alliance, and war. Faith contributes the shared
historical prior from `FB.faithRelationBaseline`: exact +15, in-fold +10,
schismatic +5, foreign −10, or explicitly hostile −25. Stale edges expire after
eight years. There
is no all-ruler pairwise matrix and no all-character social graph. Both ruler
generations are stamped on a stored edge, so either succession returns that
pair to its derived baseline instead of inheriting a predecessor's friendship.

Magnate affinity adds the member's regard for its prospective leader. Estates
motion posture also adds the bloc members' relationships with the player's
house and their current ruler aims. These remain visible reason-coded parts of
the deterministic forecast; only the sparse relation records and ordinary
annual allegiance are durable.

AI approaches to the protagonist are globally capped at one per year and must
pass `FB.rulerPlayerRelevance`. The check performs one cached county-distance
walk from the household home. A foreign court may reach farther when it shares
the protagonist's culture and a non-hostile branch of the faith graph, less far
when it shares only one, and only a few county steps when it shares neither.
Exact faith improves its priority through the same directional baseline, while
a four-year per-ruler cooldown prevents one favored court from
monopolizing the annual slot. Rulers in the same sovereign hierarchy and
already-committed war, pact, alliance, or royal-marriage relationships remain
relevant. Thus an
unconnected Sunni ruler in Iraq cannot send social or marriage overtures to an
Irish Catholic household, while a nearby foreign ruler or an actual liege can.
Hostile border wars retain their existing adjacency gate.

Marriage overtures add hard house-rank eligibility before their ordinary score:
the offered royal partner cannot stand three or more stations above the player's
house, and each allowable upward station requires 20 current prestige. The same
shared status is checked when choosing the annual approach and again when its
queued event resolves, so lost station or prestige cannot leave a stale offer
acceptable.

Expansionist sovereigns may fund one discontented vassal of an adjacent rival.
`state.agency.rebelSupport` stores at most three five-year records and increases
the existing seeded breakaway probability; it does not create a second civil-war
engine. Funding directed at the player's own vassal also passes the player
relevance gate and queues an exact sponsor-generation event to expose the money,
buy back the oath, or watch it continue.

Political blocs are simulated only where they can affect the protagonist.
`FB.politicalCourt` derives the ruler's house, living landed houses sworn
directly to that ruler, and the player's house when sworn there. It excludes
unrelated sovereign trees, indirect vassal houses, empty generated
placeholders, and houses without a ruler or territory. For a player crown,
the same rule covers the player house and its direct vassals. The ruler stays
first; other landed houses use stable realm-id order, with a sworn player
house last.

House influence is a current-state projection:

`1 + rank×2 + directly held counties + floor(other territory/2) + 1 for a Council office`.

Rank is realm rank (or player tier minus three), "other territory" is the
house's vassal subtree beyond its own demesne, and the Council bonus applies
only to a real great office in the player's crown. Bloc influence is the sum
of member-house influence; a vote requires `floor(total/2) + 1`.

Each projected house also exposes `rulerAge` and `economicPower`. Age reads the
current ruler character and falls back deterministically to the realm's ruler
snapshot (or 40 when a legacy record has neither). Economic power is the sum of
development in directly held counties plus half the development in vassal-held
territory. Bloc averages and the court economic average are influence-weighted,
derived on demand, and never saved.

`FBDATA.politicalBlocs` defines the localized Crown, Mercantile, Magnate, and
Independent archetype presentation and their per-policy starting postures
(`motions.<policyId>` for each `FBDATA.policies` entry). `js/politics.js`
assigns real court houses from current interests:
Crown uses Standing/favor, Council office, shared faith, and ruler
temperament; Mercantile uses guild rank, monopolies, enterprises, active
trade contracts, and commercial county modifiers. Up to two highest-influence
otherwise unaligned houses lead Magnate affinities, whose followers respond
to culture, faith, adjacent land, and leader rank. A house without a strong
alignment forms its own singleton Independent bloc. Meeting the Crown
threshold takes precedence, followed by meeting the Mercantile threshold;
only otherwise unaligned houses choose their strongest Magnate affinity or
remain Independent.

Network labels its Governance shortcut **Open political blocs**.

Only the allegiance is durable. An annual review retains an ordinary
affiliation unless its basis disappears or another valid interest exceeds it
by at least 25 points. Voluntary realignment waits while any motion is
pending, then the overdue review occurs after the motion clears.
Daily repair retains the normalized empty state while the player has no
eligible political court. An active court still reconciles every day because
Standing, commerce, modifiers, and offices can change without a realm
mutation; the forecast remains a live read-only projection whenever the
player opens it.
For an Estates-eligible vassal, `FB.politicalSummary` includes a forecast for
every policy in the catalog plus the active pending-motion forecast.
Crown-side blocs remain visible without implying those vassal motions apply
to crown policy. The summary and `FB.politicalMotionForecast` derive all
membership details, reasons, influence, postures, probabilities, the court
economic average, and reason-coded age/economic adjustments without consuming
RNG or mutating game state.

When a materialized rightful ruler or appointed family grantee becomes the protagonist,
`FB.absorbRealm` joins the realm they actually rule to the player's: its ruler's demesne
enters the player's hand, its vassals reattach intact, hierarchy cycles are prevented,
outgoing wars end in white peace, and title,
rank, capital, and map ownership are synchronized. Only a sovereign inherited title
changes the sovereign owner of the combined hierarchy. Absorbing a fief directly sworn
to the special `'player'` realm preserves the player's existing outside liege or
independence rather than creating a self-liege. An intact player crown handed to a
downfall usurper may instead leave the displaced rightful character one narrow
restoration right; ordinary county conquest never creates one.

Marriage-residence abdication performs the inverse political handoff without
killing a realm. `FB.abdicatePlayerRealmToHeir` rekeys the special
`state.realms.player` node as a living AI realm ruled by the current lawful heir.
It preserves the realm’s name, color, counties, vassals, liege relationship,
religion, technology, and any religious-head office, while rewriting ownership,
holder, vassal-liege, and live realm references from the player id to the new AI
id. Because the realm never dies, this path creates no usurper, vacancy,
restoration right, or death effects. Existing player-realm alliances end at the
handoff. The lawful heir is rejected if they already reign over another living
realm, preserving the one-character/one-throne invariant instead of leaving two
realm roots mapped to one character. A tier-3 barony has no realm node to convert;
relinquishing it simply
returns that local office to the county’s count.

## Religious head offices

The Catholic office has an elective personal layer described in
[papacy.md](papacy.md). `state.religiousHeads.catholic` still identifies the living
realm controlling the Roman territorial office, while `FB.popeRecognizedBy`,
`FB.papalObedienceForRealm`, and `FB.papalObedienceForCharacter` resolve the claimant
recognized by a viewpoint. This distinction matters only during a durable schism.
The Papal States keep their realm, vassals, and revenue during a vacancy under the
Camerlengo and never advance through `realm.succession`.

Central religious leadership is an office assignment, not a territorial tier.
The effective faith `properties.head` supplies a stable `officeId`, global fallback
`realm`, localized `title`, recovery policy, required seat or alternative claim-county
sets, and the policy for same-faith wars against the office. Inherited faiths share that
office id unless they explicitly override or remove the head. The active bookmark may
override the initial realm through `bookmark.religiousHeads`: 867 assigns
`papacy`/`abbasid`, while 1066 assigns
`papacy_1066`/`abbasid_1066`. Faiths without `head` metadata, including Shia Islam,
have no centralized head. Ordinary Muslim emperor-tier rulers use Great Sultan or
Great Sultana instead. At every rank, male and female AI rulers are styled from the
lexicon's rank ladder (`FB.lexicon.rank`, `data/lexicons.js`): the realm's culture, its
faith and that faith's ancestors, the realm's government form, the campaign era, then the
base ladder, the most specific layer winning. `FBDATA.titles` is retained as a legacy
fallback for saved snapshots.

A Catholic Bishopric is also an office assignment, but local and personal rather than a
centralized religious head. `character.bishopric` names an abstract see at the holder's
home county without transferring province ownership or creating a realm node. A see-only
player uses tier 3 for compatibility, while title rendering, revenue, retinue, actions,
and succession recognize the episcopal office instead of treating it as a barony. Bishops
may retain separately inherited counties and crowns. Cardinals retain their sees; death or
elevation to Pope vacates them, and a see-only dynasty heir returns to tier-2 gentry while
private household property remains intact.

The live assignment belongs to `state.religiousHeads[officeId]`, whose value is an
exact realm id or `null` for an explicit vacancy. `FB.religiousHeadOf` returns the
assigned living realm or `null`; `FB.religionsHeadedBy` returns the faith definitions
that own the held offices;
`FB.isReligiousHead` tests either one faith or any office; and
`FB.religiousHeadTitle` renders the localized office title. AI and player title
rendering query these helpers before secular rank, and semantic player title snapshots
record `headReligion` plus the English `headTitle` fallback so save labels, legends,
and durable messages render in the active locale.

Every realm-death boundary calls `FB.markRealmDead`, which passes its assigned offices
through `FB.vacateReligiousHeads` before killing the temporal realm. The assignment
becomes `null` exactly once, a durable vacancy notice is emitted, and
`state.religiousHeadVacancies[officeId]` records `{turn,formerHolder}`. Losing only
part of the office realm changes nothing. County conquest, inheritance, and absorption
never grant the office; ordinary county conquest also never grants the defeated crown.
Explicit recovery — and the player-only Sunni succession war below — is the only
office-assignment path. Loading an older save with a dead
mapped realm silently normalizes it to the same saved vacancy shape without replaying
news.

Catholic recovery uses `recovery:'grant_seat'`: a Catholic sovereign personally holding
Roma and another county may grant Roma away. The bookmark's canonical Papacy is rebuilt
as an independent rank-3 realm with a fresh ruler and succession, then assigned the
office. After a 360-day vacancy, a qualified Catholic AI sovereign controlling Roma and
other territory does this automatically. The player restoration awards piety and
prestige, improves Standing with every living Catholic ruler, and clears excommunication.

Sunni recovery uses `recovery:'claim'` with alternative county sets: Baghdad, or Mecca
and Medina together. A sovereign player king or emperor meeting the prestige threshold
and a minimal demesne (`religiousHeadClaimMinRealm` counties, counted from
`player.provs`) may spend piety to attach the office to the existing player realm
without moving land.
After 360 vacant days, independent Sunni AI realms of rank 3+ that meet a county set
and the same size gate (counted over the whole realm bloc) are
ordered by rank, realm strength, then stable realm id; the strongest claims. With no
eligible realm, the explicit vacancy persists. `FB.canRestoreReligiousHead`,
`FB.restoreReligiousHead`, `FB.canClaimReligiousHead`,
`FB.controlsReligiousHeadClaim`, `FB.claimReligiousHead`, and
`FB.religiousHeadRecoveryTick` are the shared policy surface; callers do not match
Papacy/Caliphate realm names.

The Caliphate's `head.holderSex:'m'` applies to its occupant, not to the
Abbasid realm's secular inheritance. A woman can therefore inherit the realm
under the game's normal male-preference dynasty rule, but the Caliphate becomes
an explicit vacancy at once; she is styled by her temporal rank and cannot
claim or contest the Sunni office. The same data-driven safeguard also covers
the Papacy, alongside its separate all-male electoral rules.

A sitting Caliph is the one office that can also be taken by force. A sovereign Sunni
player king or emperor gains a `caliphate` succession-war cause against the holder's
sovereign realm (`FB.caliphateWarCause`; no shared border required — the stake is the
office, not land). Victory by siege reassigns the office to the player realm through
the same `FB.assignReligiousHead` path: no county changes hands, the defeated realm
survives, and its ruler's styling simply follows the lost office. The AI never
contests a sitting office this way; its vacancy claim above is unchanged apart from
the new size gate. Office ownership is compared through the holder's live sovereign,
so a vassal-attached office remains contestable. A successor who is no longer a Sunni
sovereign king or emperor loses the personal claim, ending the campaign without land.
See [war.md](war.md).

**Realms form a liege hierarchy.** Every realm has a `rank` (1 count … 4 emperor) and a
`liege` (realm id or null). `state.owner[pid]` is the SOVEREIGN top realm (map color,
war target); `state.holder[pid]` is the county's direct holder. Authored realms are
kings/emperors/independent dukes plus a few authored vassal kingdoms; the dukes and
counts inside a realm whose form uses the `feudal_vassals` holders strategy are
generated at `FB.initPolitics` (`FB.makeVassalRealm`). De jure
data (`FBDATA.empires/kingdoms/duchies` + each county's `duchy` field) drives eligibility
for rank claims (majority of a duchy/kingdom/empire), realm naming, and the Land panel's
hierarchy block. Helpers: `FB.topRealm`, `FB.liegeChain`,
`FB.realmTerritory`, `FB.realmHeldCounties`, `FB.dejureOf`; owner/holder-derived lists
persist across turns until `FB.invalidateRealmCache` runs on a transfer or hierarchy
change, while development-sensitive strength totals cache only for the current turn.
Invalidation also increments an unsaved realm revision used by other derived maintenance
passes; it is a runtime cache stamp, never save state. Vassals make no foreign
policy; strong vassals occasionally break away (`balance.breakawayChance`). That base
chance is unchanged for a player crown with no recent War of Aggression. Each such
declaration still remembered for the current ruler multiplies breakaway pressure, and
negative Standing with the exact vassal compounds it, without creating an automatic
revolt or a second civil-war system. A
sovereign’s Standing and non-aggression pacts now modulate whether an adjacent AI realm attacks the
independent player — see [piety-intrigue-diplomacy.md](piety-intrigue-diplomacy.md). The player
interacts with the whole chain (petition / `pay_homage` / `appeal_lord` /
`swear_fealty` / independence — and, tiers 3–5, the **estates**: the liege's
assembly where the terms of service, the aid and scutage, are voted on — see
[parliament.md](parliament.md)) and, once sovereign, runs vassals of their own
(`grant_land` — a single county via `FB.grantCounty` or a whole de jure duchy via
`FB.grantDuchy`, `demand_taxes`, `revoke_county`; vassal Standing retains its legacy
backing in `player.liegeOps`, while each direct vassal's service charter determines
the true share of county tax and levy returned through `FB.playerTax` and
`FB.playerLevy`). A revoked house dies: its directly held counties enter the
player's demesne and its own vassals pass to its liege, mirroring the
dissolution rule of `FB.realmBuryIfEmpty`/`FB.transferProvince` — restore
(`FB.repairVassalLieges`) reattaches vassals left sworn to a dead house by
saves that predate that rule.

**AI sovereign expansion is consolidation-first.** Among legal neighboring enemies,
`FB.aiExpansionTarget` first prefers a county that completes a partially held de jure
duchy, then territory inside a partially held kingdom, then a partially held empire.
Only after those opportunities does it open a new de jure frontier or take land outside
the title map. Equal claims prefer the capital's title region, fewer counties remaining,
more shared border contacts, and greater development before comparing defensive strength.
An offensive war records the selected county and de jure objective; AI hosts march on that
county instead of the enemy capital, and a winning campaign may continue through adjacent
counties of the same objective. Once that enemy holds no reachable county in the objective,
the war closes rather than shifting sideways into a territorial snake. Defenders use the
same compact-capture preference when they take land in return. This strategic behavior is
recorded as technology impact `ai_dejure_expansion_planning` with mode `none`.

`swear_fealty` offers only peaceful neighboring sovereigns whose realm rank is
strictly greater than the player's current title rank. Counts may therefore kneel
to dukes, kings, or emperors; dukes to kings or emperors; kings only to emperors;
and emperors to nobody. The mutation rechecks the same target list so a stale picker
cannot create an equal- or lower-ranked liege.

The Land panel's **Notable folk** is a live political view of this hierarchy. It lists
the selected county's direct holder, every living realm sworn directly to that holder
(rank first, then stable realm name/id), and the holder's complete liege chain through
the sovereign, with duplicates removed. Each row paints the canonical reigning
character's portrait and derives age and Martial from that full character record. The
protagonist occupies the same list when `'player'` is one of those realm nodes.
Generated province characters from `FB.provNotables` are a defensive fallback only
when a settled county has no resolvable political ruler, so ordinary Land browsing
neither creates `provChars` nor consumes RNG.

**A count-or-higher protagonist may move the realm seat once per lifetime.**
`FB.capitalRelocationStatus` accepts only a different county held directly in the
player's demesne, and blocks a ruler without the required prestige, during personal
travel, personal war, or active campaign service, or after that character has already
used the choice. `FB.relocatePlayerCapital` revalidates atomically, spends
`balance.capitalRelocationPrestigeCost`, applies
`balance.capitalRelocationPopularOpinion`, and applies
`balance.capitalRelocationVassalFavor` to every living realm sworn directly to
`'player'`. It then synchronizes `player.provinceId` and
`realms.player.capital`. Ownership, holders, lieges, titles, realm faith, vassal
relationships, county population, buildings, and county-bound property do not move.
Personal contacts remain intact at their prior residences; only location-scoped lord
and priest roles regenerate at the new household home. Losing the current capital
instead uses the first surviving directly held county as a free forced fallback, moves
the household with it, and neither consumes nor resets the lifetime choice.

Realm, ownership, and de jure source data belong to the active start bookmark. The
867 and 1066 definitions may therefore use different realm ids, liege chains,
capitals, county owners, and hierarchy names without altering saved political state.
Activation clears all owner-, liege-, and de-jure-derived caches before a campaign is
created or restored.

Every explicitly authored start realm may supply
`ruler:{name,sex,culture,born,mar,trait}`. `FB.initPolitics` copies that historical
profile verbatim into the realm's initial lightweight ruler, deriving only start-age
and ordinary succession bookkeeping. Generated counts, dukes, children, heirs,
successors, and later houses continue through the saved RNG, so authored start rulers
do not turn the whole family tree into fixed history.
Petitioning up from a barony (`FB.attemptRankElevation` → `FB.grantByLiege`)
invests the player with his home county only when the petitioned liege
is a living territorial realm of count rank or greater that directly holds that county.
A confirmed petition uses the disclosed liege-grant chance. Success spends 800 gold and
400 prestige atomically with the grant; refusal keeps that investiture but applies the
disclosed prestige, Standing, and cooldown penalties. A generated local lord is a story character,
not a title holder, and has no county to convey. The granting count yields the county
(dissolving if left landless) and the player answers to the granter's own liege — a liege
must outrank his man, and `FB.checkTierPromotions` walks broken chains back up. For a count
or higher the older `title_request` instead grants a county out of the liege's own hand
(`FB.liegeGrantCandidates`): adjacent to the player's lands, never the liege's seat,
and never his last directly held county — a lord rewards service, but he does not
give his power base away. The grant changes no liege and no sovereign: the player
stays inside the realm. And only the crown can recognize a duke — if the player's living
liege is not at least a king, a completed duchy majority stays a *claim* without the
style (announced once per generation) until he answers to a king, an emperor, or no
one. Independence comes two ways: a Count may receive the random
`independence_offer` event, while the explicit `declare_independence` deed remains
available at any sworn tier with 200+ prestige. Both run `FB.doIndependence`, which
founds the player realm and starts a defensive war against the old sovereign; a baron
using the explicit deed seizes his home county via `FB.transferProvince` (burying the
old holder if left landless). The random event begins at Count so it cannot double as
an unrequested Baron-to-Count promotion.

**Feudal patronage diminishes within a lifetime.** A successful barony, liege title
petition, neighboring-fief petition, or court-awarded escheat increments
`player.liegeGrants`; every prior grant multiplies the next grant's final chance by
`balance.liegeGrantRepeatMult` (0.2 by default). The multiplier is applied after each
path's normal chance clamp, so its minimum chance cannot erase the penalty. Failed
petitions do not count. Buying or conquering land, settling wasteland, inheritance,
independence, and de jure rank claims do not count as patronage. Succession
resets both `liegeGrants` and the lifetime `warService` tally.

**Appointed castellany is office, not land.** A landless tier-2 player may petition a
living local liege for appointment as Castellan of the home county with 200 prestige,
60 Standing, and Martial or Stewardship 10. The ten-year chance is
`clamp(0.15 + Standing/400 + Prestige/1200 + max(Martial,Stewardship)/100, 0.10, 0.85)`
before the ordinary repeated-patronage multiplier; asking for life subtracts 0.20
before clamping. The appointment reuses tier-3 governance, income, and retinue
machinery without changing county holder or owner. Its additive
`player.castellany` record identifies the appointer, county, tenure, grant/expiry
turns, and renewal marker; every player-facing title says Castellan, never Baron.
A fixed appointment may be renewed once in its last 90 days at
`clamp(0.25 + Standing/300 + max(Martial,Stewardship)/80, 0.20, 0.90)`.
Expiry, resignation, the appointer's loss of the county, or the appointed character's
death returns the household to tier 2. Ordinary landed promotion supersedes the
office rather than transferring or inheriting it. Castellan is the generic first
office; culture-specific aliases and offices such as the podestà remain future flavor.

Governance eligibility accepts a current Castellan appointment without requiring a hereditary barony. The office must belong to the current character and home county, remain within its fixed term when applicable, and answer to the living county holder. Expired, inherited, or displaced appointment records do not qualify.

**Town council is a local commoner office.** Councilman remains a tier-1–2 earned
position for merchant, craftsman, and administration careers, worth 0.5 gold per
season and +5% enterprise income. `player.localCouncil` binds it to the home county;
permanent relocation, death, or landed promotion ends the seat. Legacy `councilman`
flags self-heal into a local record whose first motion is immediately available.
Failed candidates may try the candidacy event again after its 720-day cooldown.
Once every 360 days the officeholder may bring a motion with the visible seeded chance
`clamp(0.50 + 0.02 * (Diplomacy + Stewardship - 10) + 0.002 * Popular Opinion,
0.20, 0.90)`. A passed Fair Measures ordinance adds 10% enterprise income, Civic
Works adds 1 gold per season, and Watch and Ward adds 30 retinue; only one ordinance
is active and it expires after 360 days.

**Unlanded station details.** Clicking the Rank row on the Self panel for serfs, freeholders,
and gentry opens a dedicated *Station & home* modal rather than the noble *Realm & demesne*
sheet. It keeps only their station, linked home, relevant local ruler, and concise path to
elevation, leaving customary work, rights, and duties to the focuses and events where they
matter. The shared presentation is identical across culture and faith. Demesne limits and
vassal counts remain exclusive to landed rulers (tier 3+).

**Inside a realm, counties also change hands without war.** A vassal house carries a
`favor` standing at its liege's court (−100…100, drifting yearly in `FB.worldTick`).
The Deeds tab offers three intra-realm paths to a neighbor's county, all following the
grant pattern (`state.holder[pid]` flips to `'player'`, `owner` and the player's liege
untouched, landless holders buried by `FB.realmBuryIfEmpty`): *Petition for a
neighbor's fief* (`petition_county` → `UI.showPetitionCounty` → the `county_petition`
event — gated on Standing with the liege, prestige, and the lifetime
`player.warService` tally
built by riding with the liege's host, against the victim's `favor`); *Buy out a weak
neighbor* (`buy_county`, a vassal-only gold sink for adjacent rank-1 counts with no
vassals of their own); and *Settle the wasteland* (`settle_waste` → `FB.settleWaste`,
which turns a bordering wasteland province into a true county of the player's demesne —
settler culture and faith, belonging to no de jure duchy). The deed is unavailable when
no wasteland borders the player's demesne: it is omitted from Deeds entirely rather
than shown as a disabled action. Both that deed and the commoner
frontier-homestead journey (see [travel.md](travel.md)) perform the physical conversion
through the one shared `FB.materializeWasteland` helper — culture, faith,
development 1, holder, owner, de jure exclusion, generated settlement slots, cache
invalidation, map redraw, and the Chronicle descriptors; the deed adds the demesne
entry and the gold/prestige cost, while the frontier path assigns the county to the
gateway's existing political controller and grants only commoner property. Separately, a dying petty
count may leave no heir (`balance.escheatChance`, `FB.escheatRealm` in the yearly
tick): the fief escheats to the liege unless a bordering player of the same sovereign
wins the scramble (Standing with the liege, prestige, service) — and heirless fiefs of the
player's own vassals simply return to the player's hand.
AI realms retain a lightweight `realm.ruler` projection (name, culture, age, effective
Martial, and a `trait` from the ordered `FBDATA.rulerTraits` pool — the house's temper, which the royal
council reads at king tier and up), but every living ruler is backed by a full eager
character. The Deeds banner's "vassal of X" links to their realm sheet via
`UI.showLiegeModal` (`data-liege` click delegation); both the top identity card and
**Open full character sheet** action on that sheet link to the full character sheet.
The cultivation action uses
the ordinary relationship visit to the current capital, including normal route cost and
the 90-day minimum stay; attention advances only while the player is physically there. See
[council.md](council.md) for how the player monarch's own vassal rulers sit as great
officers of the crown.

Runtime mods may replace the complete ruler-trait pool after adding trait definitions in
the same mod. Application rejects an empty list, duplicate ids, or unresolved traits.
The baseline order is unchanged, world creation still makes exactly one seeded pick per
generated ruler, Council repair consumes the same pool, and existing saves retain their
stored ruler traits. `FB.RULER_TRAITS` remains a refreshed compatibility alias for older
callers, not the source definition.

Every living AI ruler sheet offers the same cash-or-armory gift picker. Cash prices follow
realm rank through `balance.rulerCashGiftCostByRank` (Count 10, Duke 15, King 25, Emperor
40 by default) and begin at `balance.rulerCashGiftOpinion` (+15). A ruler beyond ordinary
one-rank social reach first requires the warm intermediary chain described in
[characters.md](characters.md); each extra station multiplies the cash price and reduces
the resulting Standing. Unequipped, unpledged items begin at the same +4/+8/+12
quality-tier influence as personal item gifts, receive the same access reduction, and
permanently
leave the family armory; their semantic snapshot remains in the Chronicle. Direct and
higher lieges, vassals beneath the player, and foreign rulers can all gain Standing once
access exists. Context
changes the available consequences, not the meter; the compatibility backing remains the
player-relative realm-opinion store.
Cash and items share one 90-day ruler-recipient clock in `player.realmGiftTurns`. Each
entry stores the gift turn and `realm.ruler.generation`, so succession makes the new ruler
a fresh recipient without erasing unrelated clocks. Every accepted ruler gift spends one
day. A gift stays immediate inside the sovereign realm containing the player’s permanent
home. Across a sovereign border it travels by saved courier from that home to the current
capital; standing and cooldown apply only on successful arrival. A dead or succeeded
recipient, moved capital, or dead sender makes the courier finish outbound and return the
exact cash or item without a cooldown.

An AI ruler change never leaves the predecessor's Standing attached to the surviving
realm id. A compact heir starts neutral. If the heir was materialized before accession,
the exact person's already-tracked Standing becomes the realm score. Protagonist
succession instead resets all personal and realm Standing because the current save shape
does not store a pairwise heir relationship matrix.

When a neighboring or compact-linked sovereign changes ruler, an occasional diplomatic
story may be queued after that succession adjustment. Its context stores the realm id and
exact new `rulerGeneration`; another succession invalidates the story before resolution. A former
alliance is remembered only as event context after the ordinary generation-stamp repair
ends it. A state-level pact remains only when its existing expiry says so. The story may
offer a first embassy, a fresh pact, or renewal of a still-live pact, but it cannot copy
the predecessor’s Standing or revive an invalid alliance.

A materialized reigning ruler uses the compact realm’s yearly mortality roll, never
ordinary character mortality. If married to the player they remain resident at the current
capital and are excluded from household enumeration, work, upkeep, standards, retainers,
equipment, and armory reclamation. Ordinary spouse links, marriage standing, the royal
compact/alliance, and shared children remain intact. Conception is possible only while the
player’s physical travel location is that capital, and each shared birth is registered
beneath the reigning member in the compact succession tree. Realm death advances
succession through the normal character death/spouse cleanup exactly once; divorce and
succession also invalidate an active ruler visit.

**Tiers** 0–7 (serf…emperor) feed the five broader societal roles documented in
[events.md](events.md). Runtime changes use `FB.setPlayerTier`, which preserves the
Freeholder and Gentry generation history while immediately revalidating travel, focus, livelihood
staffing, and any lower-to-landed farewell. Political vassal/sovereign status remains
separate from this audience. Map
ownership only begins at tier 4 (`state.player.provs`); tier 3 (baron) is a status inside a
county — and bound to it: a baron's liege is always the county's direct holder, so if his
lord's house dies — or the county changes hands under a living lord — the baron reattaches
to whoever holds his home (`FB.transferProvince`, with a catch-all repair in
`FB.checkTierPromotions`), never standing "independent" nor kneeling to a lord who no
longer holds his home. Tier-2 (gentry) content gates on tier alone, not profession, so the clergy careers
share it: an abbot or qadi keeps the cloth while managing the manor like any gentry.
Ordinary manor recognition requires an **established freehold**:
`player.freeholderGeneration` records the line depth that first became free.
A later-generation heir must inherit Freeholder standing before claiming Gentry;
plots, prestige and investiture costs remain required. New Freeholder scenarios
start their first free generation, while existing saves without the field retain
eligibility. Technology review `rank_elevation_investiture` remains **none**.
Ordinary elevation from Gentry to Baron requires
an **established gentle house**: `player.gentryGeneration` records the line depth that
first reached tier 2, and only a genuinely later generation of the line may petition
for a barony. Generations are counted by
`player.lineDepth`, the genealogical depth of the current head, so a sibling or cousin
of the founder's own generation does not qualify. The petition uses
`balance.baronyPrestige` and `balance.baronyOpinion`. Tier-2 scenarios begin with an
established house, and older saves without the additive field are treated the same way.
The learned clerical paths remain exceptional personal careers: they may establish
gentry or receive personal offices without this ordinary patronage gate. A founder who
personally rose into the gentry may also cross the gate once by military command. The
first playable head must already have fought in battle and saved the local lord, reach
`balance.militaryBaronyMartial` Martial and `balance.militaryBaronyPrestige` prestige,
then take command while a living count-or-greater local patron's sovereign host is in
the field. The protagonist's Martial replaces a weaker AI commander value for that host;
only its next actual map battle victory queues `military_barony_victory`. A shattered
host or ended war closes the command without reward. An established heir or a tier-2
scenario cannot use this founder-life exception. Accepting the battlefield grant is
ordinary patronage for `player.liegeGrants` and creates the same territorial tier-3
barony as the ordinary petition; declining it leaves the player gentry. The household
religious ladder in `js/economy.js` raises abbot/qadi to tier 2 and chief qadi to tier 3.
A Catholic Bishop's personal see supplies tier-3 compatibility without being a barony;
dependent officeholders instead receive the corresponding marriage/social `station`
without becoming the landed player. Random soldier, clerical, inheritance, and patronage
events no longer raise the household's tier; the retired `knighted`, `made_abbot`,
`made_qadi`, `chief_qadi`, and `grant_of_barony` records cannot bypass the deliberate
rank or office controls. The battlefield barony remains the one authored-event exception
because the player explicitly takes command and must win a real map battle first.

**Ordinary rank elevation is an explicit investiture claim.** Meeting the social or
territorial gate qualifies the household; it does not silently grant the style. Every
rank-appropriate Deeds launcher remains visible and enabled without calculating land,
liege, house, cooldown, or resource eligibility during the retained-panel status pass.
The barony review always lists the established-house requirement and the configured
prestige and lord Standing thresholds (currently 400 prestige and 60 Standing), even
when another requirement blocks the petition. Its separate Cost if granted row shows
the investiture price (500 gold and 250 prestige), not the eligibility threshold.
Opening it performs that calculation on request and presents one compact review with the
current and new status, cumulative price, benefit, approval chance for a petition, and a
focusable available or greyed confirmation. Longer timing and refusal terms use the shared
heading tooltip/compact disclosure, with the rank Guide alongside it. Opening, cancelling,
or activating a blocked confirmation spends no day, starts no cooldown, and charges nothing.
Confirmation revalidates the same live context before spending one day. Successful
recognition charges and promotes atomically; a petition may instead be refused under its
existing chance and penalty. There is no partial investiture payment and no former
`30 × tier` prestige award.

| New rank | Gold | Prestige | Piety |
| --- | ---: | ---: | ---: |
| Gentry | 200 | 100 | 0 |
| Baron | 500 | 250 | 0 |
| Count | 800 | 400 | 0 |
| Duke | 1,500 | 600 | 0 |
| King | 3,000 | 1,000 | 300 |
| Emperor | 6,000 | 1,500 | 600 |

The arrays `balance.rankElevationGoldByTier`,
`rankElevationPrestigeByTier`, and `rankElevationPietyByTier` hold those per-rung values.
`FB.rankElevationCost` sums every crossed rung, so a Count who already meets the royal
conditions claims King for 4,500 gold, 1,600 prestige, and 300 piety. A lapsed title pays
in full to be recognized again. Serf freedom remains its own system and cost.

This fee belongs only to player-initiated ordinary claims: manor recognition, a successful
petitioned barony, a successful Count investiture, and de jure claims to Duke, King, or
Emperor. The military barony, religious offices, inheritance of an actual realm,
generic authored/mod `tierSet`, and save repair stay free. Centralizing the
price in `FB.setPlayerTier` would incorrectly charge those exceptional paths, so callers
use `FB.attemptRankElevation` and `FB.claimRankElevation` instead. The older
`FB.queueRankElevationOffer` event boundary remains available for authored event paths and
saved compatibility; the ordinary Deeds UI no longer queues an intermediate offer event.

For higher titles, a duchy requires its de jure majority; a kingdom requires its majority
plus independence; an empire requires two kingdom majorities plus independence. A duchy
remains blocked when the player's living liege is below king rank, since a mere duke
cannot raise a peer of his own. The exact rules live in
`FB.duchyProgress`/`FB.kingdomProgress`/`FB.empireProgress` (`js/world.js`), shared by
`FB.rankElevationStatus`, the daily hierarchy repair, and the UI readouts: a duchy must
span ≥2 de jure counties and demands ≥ max(2, ⌈n/2⌉) held, a kingdom ⌈n/2⌉, an empire two
kingdom majorities. Every empire therefore has at least two de jure kingdoms; Italia is divided
between Italy and Sicily, with Benevento, Apulia, Calabria, and Sicily belonging to the
latter. Wastelands and colonies settled on them have no de jure duchy, so they count
toward no title. The province panel displays the de jure hierarchy under a row
labeled "De jure (rightful liege)" (and flags lands that feed no title), and spells out
have/need progress notes for any title level where the player holds a stake (`have > 0`)
— How to Play glosses the term in plain language — and the 🗺/R map filter has de jure duchy
and kingdom modes that name the player's strongest claim.
The daily call site memoizes hierarchy repair by player and realm revision. During an active
title lapse it wakes additionally on the exact warning and demotion deadlines, not on every
intervening day; a territory or liege mutation still invalidates it immediately.

The fiction is deliberately a cross-period synthesis. Medieval entry into the gentry was
not one purchase: land, office, service, marriage, reputation, household display, and
recognition by other elites all mattered. Higher styles likewise depended on material
lordship and political recognition, while royal and imperial claims carried an additional
sacral dimension represented by piety. See Peter Coss,
[The Origins of the English Gentry](https://assets.cambridge.org/97805210/21005/excerpt/9780521021005_excerpt.pdf),
the Oxford History of the British Isles discussion of
[lordship](https://academic.oup.com/book/59791/chapter/511075090), and Janet Nelson on
[the origins of royal anointing](https://www.cambridge.org/core/journals/studies-in-church-history/article/origins-of-royal-anointing/C070A88A22A870E86202BC8AF0F35C90).
The technology impact is **none** (`rank_elevation_investiture`): investiture and social
recognition are core political progression, not an optional advanced capability.

**A lord holds only so much in his own hand.** Tier dignity counts every county the
player's *realm* controls — held directly or by a vassal beneath him in the chain
(`playerShare` in `js/world.js` walks each county's holder up the liege chain to
`'player'`), so granting land to vassals never costs progress toward a duchy, kingdom,
or empire. That frees a **domain limit**: the player may hold at most
`balance.domainBase + ⌊stewardship / balance.domainStewPer⌋ + technology + active
household chancery` counties directly
(`FB.domainCap`); each county over the cap multiplies his *own* demesne income and levy
by `1 − balance.overDomainPenalty` (`FB.domainPenalty`, applied inside `FB.playerTax`
and `FB.playerLevy` — vassal dues and vassal levies are never penalized). The remedy is
the `grant_land` deed: enfeoff the surplus to a new count (`FB.grantCounty`, realm
`pv_<pid>`) or — only when every de jure county of a duchy sits in the player's own
hand (`FB.grantableDuchies`) — raise a duke over the whole duchy (`FB.grantDuchy`, realm
`pd_<did>`, holding all its counties directly).

An existing living direct vassal can instead receive more land from their ruler sheet.
`FB.vassalLandGrantOptions` lists every unreserved county still held in the player's own
hand and groups the player's remaining counties in a de jure duchy when that vassal
already rules at least one county there. The player may grant one county
(`FB.grantCountiesToVassal`) or all such remaining counties in that duchy
(`FB.grantRemainingDuchyCountiesToVassal`), but must keep one county personally.
This adds land to the existing realm without changing its ruler, dynasty, capital,
service charter, or tenure. An individual county never changes rank. After a grouped
duchy grant, however, a count who now controls every de jure county is raised to duke
tier and the realm is restyled as the Duchy of that title; an existing duke or higher
ruler is never demoted. The same recognition applies to pre-existing counts on save
restore and to a count who completes a duchy through a later province transfer, provided
the count is independent or serves a king/emperor (a duke cannot have a duke-tier peer
as a vassal). Restore performs one bounded pass over eligible count realms, while later
transfers inspect only the recipient; ducal recognition is absent from rendering, daily
simulation, and the yearly fast-forward loop. Each confirmed grant raises that ruler's
Standing by
`balance.vassalLandGrantStanding` (10 by default), regardless of the number of counties
in a grouped grant. Reservations are authoritative and stale confirmations recheck the
complete county set before changing any holder. The technology impact remains **none**
under the existing `family_land_grants` review: ordinary feudal patronage needs no
research gate, while the vassal's already-saved charter keeps its own technology
history. `FB.repairCompleteDuchyRanks` is the restore-only migration boundary;
`FB.recognizeCompleteDuchy` is the single-realm mutation boundary.

Every grant combines a service charter with a separate tenure. The charter records
true shares of the county's normal tax and levy bases. The grant preview shows base gold and soldiers before the recipient's domain limits and delegated settlements, rather than an ambiguous per-development rate. The review discloses that actual contributions may be lower; Governance uses the recipient's live settlement ledger after the grant.

| Service charter | Tax | Levy | Political term |
| --- | ---: | ---: | --- |
| Customary Service | 20% | 15% | Balanced default |
| Scutage Compact | 30% | 0% | Cash replaces ordinary military service |
| Host Duty | 5% | 30% | Yearly breakaway pressure ×1.25 |
| Charter of Liberties | 10% | 5% | +15 initial Standing, breakaway pressure ×0.5, extraordinary-tax exemption |

Customary, Scutage, and Host Duty begin with +40 Standing; Liberties begins with +55.
Existing and legacy vassals normalize to Customary Service, reproducing the old 0.3
gold per development and 15% levy at the standard tax base. Extraordinary Taxes omit
Liberties realms. Host Duty and Liberties feed their multipliers into the bounded
yearly breakaway calculation and introduce no second rebellion simulation. Charters
are not renegotiable and survive hereditary succession.

Scutage Compact requires `scutage`; Charter of Liberties requires both `customary_law`
and `authenticated_seals`. Requirements apply only when a new county or duchy grant is
confirmed. Locked charter cards remain visible with exact missing technologies, while
Customary Service and Host Duty remain available. `FB.grantCounty` and `FB.grantDuchy`
recheck the requirement before any land mutation. Existing contracts are grandfathered
and continue to supply their saved terms after technology or allegiance changes.

Tenure is `hereditary`, `life`, or a 3,600-day fixed term. Life grants reduce initial
Standing by 5 and fixed terms by 10. Life land reverts at its ruler's death; fixed-term
land reverts at death or expiry. During the final 90 days a fixed-term vassal petitions
the player once; acceptance preserves its ruler and charter for another ten years,
while refusal allows ordinary reversion. `realm.feudalContract` stores the liege,
charter, tenure, grant/expiry turns, and renewal marker. Reversion delegates to the
existing escheat path so counties return to the player, subordinate vassals reattach,
realm and war references are cleaned, and an excess-domain warning is raised. Old
realms without this record read as Customary/Hereditary. These contracts govern only
the player's outgoing direct vassals; the player's incoming obligations remain the
Estates' existing aid and scutage votes. This tenure axis does not add partition,
seniority, elective succession, freeform obligations, coercive negotiation, or
AI-to-AI fiscal charters.

Each manual grant chooses the land, recipient, service charter, and tenure before one
final confirmation. `FB.grantCounty` and `FB.grantDuchy` accept those choices together
in an options object while retaining the older recipient-only and charter-plus-tenure
call shapes. Omitting the recipient retains the generated loyal-vassal path used by
Domain Cleanup and compatibility callers. `FB.landGrantRecipientStatus` and
`FB.landGrantRecipients` provide the deterministic, read-only family projection: a
candidate must be living adult kin, not the protagonist's spouse, and must not already
govern another realm or local lordship. Social station and a non-reigning `royalLine` are
not landholdings: Freeholder, Gentry, Noble, and Royal relatives remain eligible. Sex,
faith, marriage to somebody else, captivity, and vocation do not disqualify them. A named
recipient is revalidated before any land or
RNG mutation and installed with `FB.assignRealmRulerCharacter`; the new realm is still an
ordinary direct vassal and receives the same charter- and tenure-adjusted Standing as a
generated grantee (+40 for the Customary/Hereditary default).

Family grants preserve the character's identity and genealogy: parents, spouse, children,
dynasty, current and historical career, betrothal, and personal relationship records remain
theirs. Living children seed the granted realm's ordinary succession line. Governing a new
household is incompatible with serving in the player's, so installation releases enterprise
work, household office and retainer records, family-agency ambitions, tutoring, and armory
loadout assignments. The character's residence then resolves to the granted realm's capital.
If that grantee later becomes the protagonist, succession resolves the realm they actually
rule before consulting any retained birth claim, then absorbs the appointed fief so one
character never remains on both the player throne and a vassal throne.
Eligibility and the modal draft are derived rather than saved, so family grants add no save
field and require no migration. Family land grants have technology impact **none**:
enfeoffing adult kin is baseline dynastic patronage, while the optional advanced service
charters retain their existing authored technology requirements.

Governance exposes a preview-first **Domain Cleanup** assistant while the player is over
that limit. `FB.domainCleanupPlan` is read-only, deterministic, and never consumes RNG. It
keeps the household home and realm capital, omits counties in the `grantCounty` protection
scope, prefers complete grantable duchies that fit the exact excess, and then chooses the
least-developed eligible counties. The preview names every grant and compares the
base county tax and levy plus direct-vassal land contributions before and after; it
intentionally excludes character, household, equipment, building, office, policy, and
national multipliers or flat bonuses.
`FB.applyDomainCleanupPlan` requires the exact reviewed signature, rejects an incomplete or
stale proposal, and then uses the ordinary county/duchy grant mutations. Reservations are
assistant and grant-picker constraints only: removing one restores the ordinary manual
choice, and no other conquest or title-loss rule consults it.

**Guild monopolies run in both feudal directions.** Guild Charters lets a landed vassal
petition only the exact direct liege; changing or ending that relationship invalidates
the incoming charter immediately. Tier 0–2 charters are scoped to the household's home
province and end on permanent relocation. Baron and greater players may grant one local
Craft or Trade monopoly using their current tier's frozen
`balance.guildMonopolyTerms`. Issuance pays the disclosed fee immediately, applies the
popular-opinion loss, and adds the outgoing charter's tax percentage inside
`FB.playerTax`. The local guild is abstract; a household guildmaster may be named as its
advocate but does not own the right. An outgoing charter survives promotion and
succession but ends if the dynasty falls below landed authority.
Each normalized incoming or outgoing record also carries a deterministic `contractId`
derived from slot, start turn, and profession. Political plots use that id to distinguish
the exact charter they began against from a later replacement in the same slot.

Local commons uprisings are separate bounded county disruptions, described in
[parliament.md](parliament.md#local-commons-uprisings). An active local incident
or its cooldown prevents the commons downfall chain from starting; existing
downfall flags prevent a new local incident.

**Tiers can fall as well as rise.** The downfall chains (`df_*` in `data/events_noble.js`)
give rulers three slow cascades — a commons' revolt (tier 4+, low popular opinion), a
rival's claim, and a murder conspiracy (tier 3+, a rival with deep hatred) — each three
flag-marked stages with a paid or skill escape at every step. Only repeated neglect or
bad luck reaches the final stage, whose failure calls `FB.loseAllLand` (js/world.js):
a sovereign's realm passes whole to a generated usurper realm (same name and color; the
fallen house's vassals reattach to it), a vassal's fiefs escheat to his liege, and the
family drops to landless gentry (tier 2) keeping gold, items, and holdings. Succession
wipes the slide flags with the rest of `player.flags`, so a stalled plot never outlives
its generation. Province-by-province loss in a lost defensive war (`FB.warLoseProvince`)
remains the other way down, landing at the same tier 2. Beyond these catastrophes, the
ladder also descends **one rung at a time**: the **hollow crown** lapses a tier-5+
dignity that has rested below its de jure substance (or its independence) past a grace
window — a duke whose living liege is not at least a king counts as lacking substance,
so the impossible duke-under-a-duke style lapses the same way —
`FB.checkTierPromotions` stamps `player.titleLapse`, warns by event, then steps
the style down a rung; a beaten defender may **kneel to the victor** and keep his land
as a vassal; a defiant vassal faces **attainder** and forfeiture; a beaten leader may be
**captured and ransomed**; and commoners slide the old road into serfdom through
**distraint, debt bondage, and wartime devastation**. See
[descent.md](descent.md) for the full system.

Related: [provinces.md](provinces.md) for the land itself.

## Ruler interaction boundary

The realm/ruler interaction card is the authoritative one-counterpart
political sheet. It derives rank, realm faith, capital, territorial
relationship, war state, typed Standing, pact/alliance/foreign-policy
commitments, gift courier state, cultivation, relevant feudal deeds, and
realm-specific war causes. Governance remains the overview of the player's own
domain and institution; the counterpart card links there instead of repeating
those summaries.

Compact realm identity remains authoritative for the reigning office, ruler
generation, capital, succession, ruler-gift price/cooldown, alliance stamp, and
war. A materialized ruler character adds personal traits and relationships but
does not replace those records. `UI.realmInteractionCard` and
`UI.characterInteractionCard` both resolve the ruler through typed Standing,
so the displayed value is identical and a political gift appears only once.
Building either card model does not call succession creation or ruler
materialization. Opening the realm sheet is an explicit exception: it fills the bounded
court on demand when startup eagerness is `'ruler'`. `FB.realmRulerCharacterSnapshot`
also avoids the compatibility sync performed by the older ruler getter, while
`FB.realmRulerStandingSnapshot` reconciles the two legacy Standing stores
without writing either one. Explicit adjustments and the typed Standing APIs persist
the reconciled value immediately. A bounded fallback synchronization runs at season
boundaries and after event queues rather than scanning every materialized court on every
intervening day. A compact royal
outside the displayed court still materializes only after an explicit courtship route
or when accession selects that exact member.

## Realm faith and campaign settlements

`realm.religion` is an optional saved, locale-neutral identity for a ruling realm.
`FB.realmReligionId` prefers it and falls back to the capital county's population
religion for authored realms and old saves. This separates ruler faith from local
population: conquest, capital relocation, and great holy-war settlement do not
silently convert county culture or religion. Fresh authored realms and generated
vassals initialize the field from their capital when no explicit value is supplied.
The rare AI dynastic-alliance pairing accepts `same`, `in_fold`, or `schismatic`
neighbors only when neither direction is `hostile` or `foreign`; it no longer compares
the four legacy broad groups.

Great holy-war occupations are not realms and never alter ownership during combat.
Final settlement collects every award before changing an owner or holder, then applies
the captured set once in crown-to-county order. Uncaptured counties retain their old
sovereigns, holders, capitals, and vassal chains. New campaign sovereigns and vassals
receive the calling religion explicitly, plus a sponsor-derived culture and dynasty
identity. Empty displaced realms are buried and surviving capitals relocate only after
the complete ownership pass.

A local holder in the caller's faith fold may be confirmed only when their entire
vassal subtree lies
inside the awarded package. Confirmation reparents that realm intact beneath the new
campaign sovereign. A ruler crossing the captured boundary cannot carry uncaptured
land into the settlement; their right and local support instead belong to a generated
local cadet. `FB.assignRealmRulerCharacter(state, realmId, charId)` installs a living,
non-reigning ordinary character on a generated realm while retaining personal parents,
spouse, children, dynasty, career history, betrothal, personal relationships, and any
existing royal-line identity. It also releases assignments tying that character to the
player's managed household. This is the route for named holy-war beneficiaries and family
land grants.

An awarded realm may carry additive
`sacredCustody:{religion,siteIds,campaignId,grantTurn}`. Custody changes no population
faith and grants seasonal piety only while a listed site remains in the custodian's
sovereign bloc.

## Bounded ruler intrigue

Annual ruler agency may seed hostile schemes, but the seasonal intrigue pool is capped
at six records and two new starts per year. Each record stamps the actor character,
actor realm and ruler generation, exact target context, method, power, and warning state.
An actor has at most one scheme and a four-year cooldown; lethal and abduction attempts
cannot duplicate a target. Trait and durable aim weights encourage cruel, deceitful,
wrathful, ambitious, greedy, expansion, wealth, and crown-building rulers, while kind,
honest, content, patient, and peace-seeking rulers are strongly suppressed.

Personal schemes cannot cross sovereign borders. A neighboring court may still use the
existing rebel-sponsorship system or sabotage a county across a shared border. Captive
rulers cannot start wars or schemes and their projected host is multiplied by 0.8.
Succession invalidates generation-stamped schemes, releases private abductees,
and removes predecessor leverage. Judicial prisoners instead pass with the lawful
authority, as described in [justice](justice.md).

## Marriage lineage and royal succession

Agreed paternal/maternal marriage terms govern newborn dynasty membership only. Existing
title order, biological claims, and the breadth of playable successor choice are unchanged;
a selected eligible relative still joins the playable house through ordinary succession.
Royal compact members preserve each child's actual `dyn` through registration,
materialization, compaction, and accession. An accepted betrothal keeps its agreed terms
when a partner inherits. Reigning rulers cannot accept a prospect culture invitation;
designated heirs may, with +80 Standing and halved odds capped at 25%. The invitation
transaction rechecks reigning authority before spending or rolling.

Personal vassal campaigns occupy the vassal and its named enemy, independently of the liege. Concurrent unrelated liege wars survive repair and have separate hostility/notices. Household exposure to an inherited realm war remains distinct from personal participation. Technology impact is none (`personal_vassal_campaigns`); no autonomous AI vassal conquest generation is introduced.


Accepted legacy higher-dignity offers immediately show their queued investiture result in the same interaction, without waiting for another day or replaying the grant.

## Concurrent vassal campaigns and war law

Player and AI vassals can fight internal or external campaigns. External defenders
are sovereign realms; internal opponents are distinct vassal subtrees. The attacking
liege is not automatically a participant. The sovereign sets Internal peace and
External campaigns for the whole hierarchy; immediate lieges grant exact campaign
permissions and enforce refusal of a peace demand. Acquisitions retain sovereign
ownership while assigning the victorious vassal as holder. Inheritance remaps war
endpoints rather than discarding unrelated commitments. See [war.md](war.md).
Technology impact: none for concurrent campaigns, war laws and enforcement.

Daily religious-head recovery normalizes the office table once, then uses its
known vacancy for candidate checks. Dead realms, vassals, insufficient rank and
unrelated faiths are rejected before expensive office eligibility reads. The
selected claimant still uses the canonical committing API and revalidates live
eligibility; candidate ranking and RNG behavior are unchanged. Candidates remain
checked daily, so a newly eligible ruler is not delayed by a polling interval.


Public-government costs use direct holdings and immediate vassals with actual landed
receipts after liege dues. The same rank-based court allowances apply to player and AI
institutions. Public-distribution cooldown and the last payment belong to the existing
payer record, so succession cannot reset annual generosity. County support remains a
temporary county modifier and follows county transfer normally. Treasury balances are
never confiscated or capped to solve long-term accumulation; AI uses the reserve policy
in finance.md, while player spending remains voluntary.

House generation depth is anchored at `houseFounderId` (depth 1), follows both
parents and recorded child lists, and searches shared ancestors for collateral
heirs. It does not measure an unrelated spouse’s ancestry. The established-gentry
check derives this depth without modifying the save, repairing older maternal-line
undercounts immediately; succession and new gentry rises record the same scale.
Unconnected trees retain the saved-depth fallback, and legacy saves without
`lineDepth` retain the saga-generation comparison. Cycles are bounded by visited IDs.

The barony review omits the redundant ready-to-confirm status when eligible;
blocked petitions retain their visible requirement or cost explanation.

## Paid hereditary county grants

Finance and Grant Land offer surplus counties to existing, funded hereditary direct
vassals. The player keeps overlordship and the recipient's service charter. Capitals,
last counties, protected land and besieged/occupied counties cannot be sold. Normal
county tax base times eight seasons sets the price. The review labels base tax/levy
estimates separately from actual household, capacity and national adjustments.
Buyers retain the treasury system's civilian reserve and military commitments.

A fresh quote rechecks ownership, protection, buyer/ruler identity, price and funds
before the synchronous grant/payment. Purchased counties require their price to be
refunded on voluntary revocation; revoking a whole fief first checks all refunds.
A compact per-county record blocks resale for ten years, even after reconquest or
forfeiture. Conquest and lawful seizure retain their existing rules. Technology
impact `paid_hereditary_grants` is **none**, ordinary feudal patronage for payment.


## Scoped political authority (476 Phase 2)

The [Phase 2 authority contract](authority.md#phase-2-record-and-transition-contract)
keeps landed realm identity separate from appointments, recognition, federate
service and customary rights. A county continues to name its sovereign owner
and direct holder. The new records never create a realm node or move a fief
implicitly. Powers resolve for the exact host, county or contract. An explicit
realm form can require civic consent through a delegate while old realms
project territorial consent. Land grants
still use their existing reviewed quote and confirmation; a federate settlement
promise must pass that same transaction when fulfilled. Office and patron
succession are explicit, with reaffirmation where the office definition
requires it. Technology impact: the political appointments and rights are
`none` decisions in the ledger.

Optional service and political institutions

Feudal service contracts and the crown political bloc now consult the availability resolver in docs/designs/systems.md. Disabled contracts do not schedule renewals, lapse titles or supply special charter modifiers. Ordinary hereditary title grants remain available through their existing transfer checks. A disabled crown bloc has no scored interest or affiliation; houses retain their ordinary independent, magnate and commercial political relationships. Availability follows the scoped government and faith beneath the bookmark override.

Optional title levels

The mechanical levels duchy, kingdom and empire, their slug namespaces and legacy d_, k_ and e_ aliases remain stable. FB.titleLevels supplies level tables, presence, lexicon names and holder labels. Level words come from data/lexicons.js using the campaign era and scoped government context; holder labels use the existing rank resolver, including faith and sex.

Generated realms save `nameStyle: {kind, place}` containing the mechanical naming
kind and proper place name, with a separate canonical `titleKind` / `titleId`
for a de jure claim. `FB.setRealmTitle` owns creation and restyling for vassals,
player realms, recognition, historical foundations and holy-war awards.
`FB.bindRealmName` supplies the existing string `realm.name` as a non-enumerable
display getter. It resolves the realm's own government, faith and ruler culture
through the lexicon and the localized naming template; it never borrows the
player's terminology. A Roman district reads Province and a Roman kingdom reads
Diocese. Custom proper names can replace the getter without changing the claim.
Title snapshots read the proper place from the record or typed title, never
strip a translated prefix. Generated dynasty fallback names use the proper place
so a locale change cannot alter family identity.

Inheritance copies the adopted primary realm's naming record and explicit title claim independently. The copy does not share the inherited realm's mutable naming object. An adopted custom proper name replaces the display getter, and an adopted realm without a claim clears the previous primary claim. A lower-ranked inheritance leaves the player's primary name and claim in place.

Saved news uses FB.realmNameParam for generated realm names. Its detached $realmName record captures realmId, naming kind, proper place and the winning term's catalog key, English source and capitalization. Historical news therefore retains the original style after promotion, renaming or realm death and renders it in the active locale without consulting the current realm. Custom proper names and older string parameters remain supported. Audience classification reads the captured realm id; inheritance notices explicitly retain their personal and realm audience.

Creation and restore recover matching legacy English generated title names once
and rebind saved naming records without RNG or UID changes. Crown recognition
only reads the canonical kingdom claim. A display name alone never creates or
changes that claim during a query. Naming and identity fixes add no capability or
technology gate.

A bookmark can omit any level table. A county can omit duchy or set it to null; a district can omit kingdom, and a kingdom can omit empire. A supplied reference must still resolve in its typed table: empty strings, wrong prefixes, missing ids and alias collisions fail activation. A chain ends at its first absent parent. Mixed regions work without a bookmark-wide switch. Feudal generation keeps counties without a district in their sovereign's direct hand, without creating a synthetic shared district.

Recognition, grants and historical foundations count only actual title counties. Queries with an absent level or id return no counties and no eligible promotion. Dignities whose territory lies outside the corresponding title level do not acquire a de jure hollow-crown timer; their independent authority remains with its owning system. County holdings, owner/holder relationships and ordinary warfare are unchanged.

Where a county has no title hierarchy, FB.political.territorialClaims projects effective customary Peace rights held by the realm or, for the player, the current character. Each claim retains the exact right id and legal basis. Revenue rights and appointments never imply a territorial recovery claim. The war system revalidates that evidence on declaration. Technology impact customary_territorial_claims is none: enforcing existing jurisdiction is ordinary legal and military practice, with ordinary county warfare and aggression still available.

Coverage is in title-levels-and-hierarchy.spec.js, lexicon.spec.js,
realm-names.spec.js and crown-recognition.spec.js, with the existing medieval
title migration and parity journeys retained.

476 authored geography

The 476 administrative groups use independent d_476_, k_476_ and e_476_ ids in Roman regions; activation and saved title migration resolve their typed aliases to rank-scoped 476_ slugs. Roman civic vocabulary names the three levels province, diocese and prefecture. Regional kingdoms outside the surviving administration have no hierarchy. The direct-holder governments keep the explicitly authored realm as both owner and holder. Nonterritorial Amal and Thracian bodies have hosts and court seats inside the eastern sphere without hereditary counties. Profiles with generated:true omit a historical name and receive a seeded name from their specified culture; named profiles and other bookmarks retain their original construction.

Nonterritorial federate courts

The non_territorial territory strategy now supplies a moving court and migration transaction through js/federates.js. A moving realm starts with no county ownership. Its capital is a court location on inhabited foreign ground, follows its actual host and becomes a territorial seat only after a claims settlement. A county award sets owner and direct holder through the ordinary territorial transaction. Ordinary rank, private property, communities and title ids retain their separate meaning. Government ai dispatch handles explicitly template-backed federate bargains for any pair of living realms; existing untemplated household and story bargains keep their own consent path.

Adopting an authored court

js/starts.js performs existing-ruler adoption only during new-campaign creation. The source realm retains its government, rank, governing identity, court, territorial boundaries and active host while becoming the ordinary player realm. The scenario's tier must map to the source realm's rank. The source key is removed and typed political references resolve to player. A nonterritorial host starts with no county holdings; becoming a player court does not territorialize it. The full seeded household replaces compact NPC succession so ordinary player family rules have one owner.

Spring 711 review politics

The hidden 711 candidate declares independent territorial courts and d_711_, k_711_ and e_711_ promotion regions. Provincial lieges distinguish sovereign ownership from local holdings; the Roman pontificate remains nonterritorial while Rome belongs to the eastern realm. These are existing-schema approximations rather than new government strategies. Fresh Visigothic crowns use the generic elective strategy while older saved forms remain unchanged, and the candidate does not pre-create Asturias to stand in for a later conditional foundation. See bookmark-711.md and ../research/711-bookmark.md for acceptance gaps.

800 review world

The late 800 candidate in data/bookmark_800.js declares an independent full europe_regional political map. Charlemagne's imperial core has subordinate Aquitaine and Italy, while Venice and Ifriqiya use eastern and Abbasid lieges. Existing territorial government generates ordinary holders. The promotion tables retain enduring ambition regions but use period names such as Austrasia and Lower Seine. Owner is the sovereign; holder remains the local court or generated vassal. The research note docs/research/800-bookmark.md records disputed boundaries and representative polities. The candidate is outside FBDATA.bookmarks until accepted; ordinary dynastic succession does not reproduce historical partitions or wire the three Carolingian courts into a shared historical family.

1204 provisional territorial courts

The review candidate names each court's religion independently of county principal communities and uses explicit historical technology traditions. Thus Catholic Baldwin can rule Orthodox Constantinople, while Catholic Acre remains distinct from Ayyubid Jerusalem. Authored feudal relationships determine sovereign owners; the territorial holders strategy generates the ordinary direct holder chain beneath them. Normandy remains Angevin at this late spring instant, before Rouen's summer fall. Theodore's opening is a provisional Nicaean court rather than his later coronation. Venice stays an independent territorial realm pending a shared city-republic form. Dogal succession, competing German kingship and the Latin partition's overlapping claims are recorded historical limitations, not bespoke engine behavior. Technology impact is unchanged: these are new content instances of existing political and military capabilities.

Negotiated historical partitions

The partition story factory in js/story_history.js supports prospective named NPC grants after actual conquest. The source must directly hold every specified county in the same sovereign bloc as the intended higher liege, retain its opening capital and ruler, possess current civic consent power, and be at peace with living free parties. A recipient already ruling a realm is ineligible. Player-controlled courts review and accept or decline through the shared story sheet; AI parties consent to eligible current terms. Party identity, generation and exact holdings bind approvals, which lapse if terms change.

Settlement reuses makeVassalRealm and assignRealmRulerCharacter, retaining the named person's identity and ordinary succession. It changes direct holders beneath the specified liege without changing sovereign ownership, communities, development or private property. Cache and home-lord reconciliation follow the grant. Boniface, Othon and William are landless at the 1204 opening; Thessalonica, Athens and the mapped Morea county at Sparta become their holdings only after the conditional grants. The Achaean instance is explicitly a coarse regional abstraction because the map has no Patras county. Corinth, the full Venetian allotment and later island lordships are excluded. Technology impact negotiated_historical_partition is none because actual possession and consent, rather than research, govern territorial grants.

Landless campaign victory settlement

The reusable campaign settlementForm option allows a nonterritorial actor to adopt a declared fixed-territory government after ordinary war actually secures its objective. The same realm id, ruler, troops, succession and county communities remain; the objective becomes its capital and nonTerritorial is cleared. No de jure groups, new realm or extra county transfer are synthesized. The separate migrationId path retains its existing negotiated or war-backed claims settlement transaction. The 476 Epirus instance uses this distinction to make a Balkan territorial success incompatible with its later landless Italian opportunity. Technology impact campaign_territorial_settlement is none because current possession and political circumstances supply the constraints.

Wider spring-476 courts

476_outer adds sixteen authored direct-holder regnum courts for broad British and northern communities and Sasanian Persia. Fifteen representatives are explicitly generated; Peroz is named with an editorial working birth year. These are budget-conscious regional aggregates where the sources cannot establish a precise spring-476 hierarchy. The existing Roman eastern realm directly holds the newly authored Cilician, Syrian, Palestinian and western Mesopotamian counties under roman_civic, with new province groups in its existing Oriens chain. Other new courts have no fabricated de jure hierarchy or generated feudal vassals. Possession and public jurisdiction rights do not imply private land deeds. This extends baseline political geography with none technology reviews for each authored region and leaves future wars and succession to the existing ordinary systems.
Local kingship continuity

The wider 476 Cashel district uses lineage_kingship. Its territory remains fixed and directly held, but the recognized kin pool and living local interests select its ruler. A failed selection retains owner and holder assignments and local administration. It creates neither an unrelated heir nor a territorial partition. Household holdings and settlement property remain in their ordinary stores. The conditional government_contest story reads the canonical vacancy and creates no candidates or competing ruler.

A protagonist's public court keeps the compact kin graph through accession. When the protagonist leaves that leadership, the court returns to its original institutional realm id with its military commitments, rights and local records. Household money stays in the personal purse; the independent public account begins without invented funds. The household heir receives political leadership only if separately selected. Transformation and conquest use the government selection review boundary described in governments.md.

Assembly communities

An assembly polity is the public holder of its declared counties. Its selected representative has a revocable mandate, not private county ownership or dynastic succession. Military transfer changes owner while retaining that community holder; a reviewed political settlement resolves autonomy or government conversion separately. Territory growth does not manufacture higher titles. See docs/designs/assembly-polity.md.


Public administrative jurisdiction

administrative_monarchy keeps sovereign county ownership and direct holders separate from revocable public governors. Fresh 800 Abbasid and Byzantine declarations select distinct profiles; independent subordinate courts retain their declared autonomy. Vacant jurisdiction does not generate a hereditary holder. Conquest and dismissal update existing authority scope without confiscating private settlement/household property. See docs/designs/administrative-monarchy.md.

Public crown absorption rekeys the government profile and public commissions to the player before retiring the old realm. Household succession grants that crown only to the recognized candidate. A different recognized sovereign receives the existing realm through abdication, while household property stays with the playable dynasty; an unrecognized death leaves a dated public vacancy.

Aristocratic royal courts retain the original compact royal tree when adopted by a player ruler or separated from a private household. Current institutional references are rekeyed without replacing the ancestry founder, private estate owners or county communities. Direct holders coexist with hereditary local rights and personal public governors, without a generated count/duke hierarchy. Active recognition selects only actual royal descendants and can leave a minority stewardship or public vacancy. Explicit government conversion preserves surviving provincial facts and requires a fresh review to return. See docs/designs/aristocratic-monarchy.md.


Elective public crowns

Fresh 711 Gothic courts retain their distinct counties and opening rulers under elective_monarchy. Political selection can install another eligible house without changing private property or handing its household the outgoing family. Crown adoption and release rekey the existing realm treasury; they do not award it to the playable family. See elective-monarchy.md.

Civic institutional holders

Fresh 1204 Venice is a city_republic with a continuing realm identity, public county holder and treasury. Individual magistracies never absorb that institution into a protagonist's dynasty. Military occupation changes owner while preserving the civic holder; a lawful reviewed county grant transfers both public holder and sovereignty and removes that scope from civic interests. The capital and final county cannot be granted away. Foreign quarters and receipt rights retain the host county's sovereign and inhabitants. See docs/designs/city-republic.md.

Institutional ecclesiastical holders

The ecclesiastical realm remains the public holder through vacancy and clerical turnover. Its ruler resolves from the canonical office. Actual control, scoped jurisdiction and temporal recognition remain separate; conquest receives no religious immunity. A private heir inherits household property rather than institutional counties or spiritual office. See ecclesiastical-principality.md.
