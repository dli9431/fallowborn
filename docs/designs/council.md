# The Royal Council

**At tier 6 (King) the player no longer rules alone.** The validated
`FBDATA.councilSeats` registry in `data/political_institutions.js` defines the royal
council's offices, while `js/council.js` owns appointments and effects. Core data ships
five great officers of the crown drawn from the player's own vassal realms:
**Seneschal** (+10% taxes), **Constable** (+10% levy), **Treasurer** (buildings 15%
cheaper), **Almoner** (+1 piety/season), **Chamberlain** (watches for schemes; the
player's own plots weave faster). Offices are historical household great-offices, not a
modern cabinet. Each definition owns its stable id, localized presentation, basic bonus,
activation tier, and ordinary holder eligibility. A seat's bonus (`FB.councilBonus`)
holds only while its holder is a living vassal not in open disgrace (Standing above
−50).

**Councillors are people, not chairs.** Generated rulers (`realm.ruler`, world.js) carry
a `trait` from `FB.RULER_TRAITS` — the house's temper. Traits listed by
`FBDATA.councilRules.schemerTraits` classify officers with cold Standing as
**schemers**; warm ones become **sycophants** who ingratiate themselves with gifts and
flattery. This is a deliberate enrichment
of the lightweight ruler object (see [realms.md](realms.md)) — vassal rulers are still
not full characters.

Runtime mods may add complete seat definitions or replace them by stable id. Added seats
use the generic vacancy, direct-vassal appointment, Standing, effectiveness, and bonus
flows; `tierMin` controls when each definition becomes active. The baseline seat ids are
protected. Treasurer, Constable, Almoner, and Chamberlain remain explicit capability ids
for their existing events, institution terms, and special consumers; an arbitrary new
bonus key does not create new engine behavior. `state.council.seats` continues to store
holders by seat id. If a mod definition is later absent, its saved holder remains inert
instead of being deleted, and becomes active again if the definition returns. This keeps
save format 3 and the active-mod fingerprint sufficient.

**Crown authority is the axis of the minigame** (`state.council.authority`, 0–100,
starts 60). High-handed acts — extraordinary taxes (+4), revoking a fief (+6), dismissing
an officer (+4) — raise authority but sour Standing; appointments and concessions lower it.
Yearly it drifts back toward 50 (`FB.councilYearly`). Two thresholds matter:

- Below `balance.councilConsentBelow` (35) the council outweighs the crown: the
  extraordinary-taxes and revoke-county deeds are blocked outright.
- Above `balance.councilCharterAbove` (70) with a sour board (average Standing < −5), the
  `council_charter` event fires — the Magna Carta moment: seal the charter (authority
  −25, every vassal +15 Standing) or tear it up (coin flip: supremacy, or the angriest
  magnate in open revolt via the existing `vassal_revolt` flow).

**Events** live in `data/events_council.js` — flattery, petitions, office-seekers,
uncovered schemes (two flavors, gated on whether a Chamberlain sits watching), council
feuds, a wartime subsidy, and the charter. Four substantial local decisions connect that
board to the rest of the realm: a Treasurer-led market charter, a Constable-led wartime
muster, pressure to prepare an over-limit domain for a lawful grant, and an Almoner-led
sanctuary dispute. They grant bounded county modifiers for market rules, disputed tolls,
service exemptions or burdens, road patrols, confirmed custom, and settlement
grievances. The grant recommendation never transfers land: the player must still name
and confirm a recipient through Governance's existing grant flow. Domain pressure is
suppressed once Crown Authority reaches the charter threshold, where the existing
charter confrontation owns that tension.

The Council remains appointed by default. Sealing the Charter of Liberties now records
the durable `office_confirmation` privilege. While it survives, Treasurer and Constable
vacancies are not automatically filled: the crown nominates one living direct vassal and
the data-defined constituencies hold a confirmation election. A successful nominee gains
a saved 1,440-day term and cannot be dismissed or silently replaced before it ends; a
rejected nominee receives a bounded candidacy cooldown and the existing holder or vacancy
remains. Seneschal, Almoner, and Chamberlain keep the original appointment rules. Existing
holders are grandfathered into one protected term when the charter first takes effect.

Technology applies only to the Council's advanced institutional choices. The Treasurer-led
market-charter event enters the random pool only after `urban_markets` and
`authenticated_seals`. The domain-pressure event remains available, but its written-custom
choice requires `customary_law`; its other responses remain ordinary alternatives.
Sealing the institutional Charter of Liberties and creating Confirmation of Great Offices
requires `representative_estates`, while defiance and the appointed Council remain
available. Locked mixed-event choices stay visible and route eligible rulers to the missing
technology. Existing privileges and protected terms are grandfathered.

Making the existing office catalogue and schemer classification data-driven records no
new technology-impact entry: it changes mod authoring and routing, not baseline gameplay
eligibility. Each seat's existing `tierMin` is an institutional rank gate rather than a
research dependency.

Triggers and effects are the `council_*` custom fns in `js/council.js`; like the older
vassal events, slot-day council events stay archetypal (no named ruler tokens) and let
the effect fns pick the councillor involved. The new custom handlers mutate only Crown
Authority and the relevant officer or board Standing. Modifier changes remain
declarative event effects.

The named **Counter-Scheme at Council** plot is a deliberate player action within that
systemic layer. Its context records the exact council realm and exact scheming officer.
Success can expose that officer, bargain for temporary restraint, or manufacture a
politically costly countercase; failure gives that same schemer leverage. If the seat
changes, the realm changes, or the target stops qualifying as a schemer, the plot
becomes invalid rather than silently moving to another councillor. The context also
stamps the realm ruler's generation, so succession in that vassal house cannot transfer
the evidence to a new officer.

**Royal policy: religious tolerance and settlement.** The crown also proclaims
standing realm policy directly — no Estates campaign, no bloc vote. Two
`institution:'crown'` families in the shared policy catalog
(`data/policies.js`; engine in js/institutions.js, see
[parliament.md](parliament.md) for the vassal-side catalog) carry ordered,
mutually exclusive levels: **Religious Tolerance** (persecution →
confessional preference → tolerated minorities → protected worship) and
**Settlement** (closed settlement → licensed newcomers → encouraged
settlement). Only the current level id and proclamation stamps are saved
(`state.realmPolicies`), healed additively to each family's declared default
on old saves; effects are always derived from the catalog.

Every effect rides a system that already exists, and none of them rewrites a
county's faith, moves an invented population total, or erases local identity:

- a level's county `modifier` (without `days`, so the policy rather than the
  calendar ends it) is maintained on the player's directly held counties by
  `FB.realmPolicySync` in the daily institution pass — on every held county,
  or only minority-faith ones (`modifierScope:'minority'`, meaning anything
  short of `same`/`in_fold` against the realm religion). Tax, levy, Common
  Voice, unrest-event harm, and market flow follow the ordinary modifier
  consumers. Losing a county, changing level, or losing the crown removes the
  records; the proclamation itself carries the one Chronicle notice.
- `seasonPiety` trickles piety each season; `researchFactor` scales the
  player realm's research rate; `migrationAttraction` shifts the conserved
  migration draw of player-owned counties; `developmentGrowth` gives a
  bounded seasonal chance (`balance.realmPolicySettlementDevChance`) to raise
  the least-developed held county's development.
- Proclamation pays `balance.realmPolicyChangeCost`, is limited to one change
  per family per calendar year, and applies the level's one-time `onEnact`
  reactions: piety, prestige, Common Voice, Crown Authority, Standing with
  the realm religion's head realm, foreign Standing with every living
  sovereign realm split by fold, and direct-vassal Standing by fold.
- Persecution is recorded through the existing mistreatment machinery
  (`religious_persecution` notes at proclamation, once a year while the
  policy stands, and from the unrest story), so it feeds the sanctuary-claim
  collective demand exactly like other mistreatment. Protected Worship
  records a durable faith privilege per minority county
  (`duration:'policy'`, `revocation:'policy_change'`); proclaiming another
  level within `balance.realmPolicyProtectedWorshipDays` is an unlawful
  revocation — Common Voice falls, mistreatment is recorded, and the faith
  constituency organizes.

Three gated slot-day stories (`data/events_politics.js`) add pressure on top
of the standing effects: a burned prayer-house under Persecution, invited
settlers and specialists under Encouraged Settlement, and faith refugees
testing the charter under Protected Worship. They introduce cultural and
religious pressure, invited specialists, merchants, and refugees as narrative
and ledger effects without claiming a demographic simulation.

Governance's Institution section shows each family's standing level and opens
the **Royal laws & policy** sheet (`UI.showRealmPolicies`), which lists every
level with its effects, the exact blocked reason on disabled proclamations,
the proclamation cost, and the repeal and protected-term rules. The sheet is
read-only until a proclamation; its Back contract returns to Governance's
Institution section. Both families record `none` technology-impact reviews in
`FBDATA.techImpactReviews`: tolerance and settlement are social prerogatives
of the crown with no credible research dependency.

**Interaction** is summarized in the landed ruler's **Governance** sheet and managed in
the focused `UI.showCouncil` modal: the authority meter, every seat with its holder's
trait and Standing, term protection where applicable, and the levers — offer a gift,
dismiss, nominate, or appoint to vacant seats. The confirmation sheet exposes the office,
electorate, term, candidates, expected support, campaign tactic, and final tally.
Each occupied seat and assignment candidate's heraldry previews the shared ruler card on
desktop hover. An occupied seat also exposes the preview to keyboard focus and opens the
full ruler sheet when activated; candidate heraldry remains part of its assignment card.
The desktop preview sits outside the modal's left edge so it does not cover Council
actions. On mobile, returning from an occupied heraldry's ruler sheet restores that exact
seat and scroll position.
The named **Ruler card…** action remains as the explicit textual route.
`FB.councilSummary` is the deterministic, locale-neutral read model shared by both
surfaces. It reads the saved seats as they stand and never calls `FB.councilEnsure`,
repairs rulers, fills vacancies, consumes RNG, or writes Chronicle news. Formation and
self-healing remain simulation work; an appointment may call the existing mutating
helper because it is an explicit player action. When the focused manager was opened
from Governance, its visible and browser Back actions return to Governance's Institution
section. A direct-vassal interaction card also names that ruler's current great office
or lack of one and routes into the same manager; its Back actions return to that exact
ruler card.

Gifting opens the same
rank-priced cash-or-armory picker as the councillor's ruler sheet and uses the same
generation-stamped 90-day recipient cooldown; the Council cannot provide a second gift
path. `FB.councilGift` remains as a compatibility wrapper around the shared cash helper.
Standing uses the canonical typed facade over the existing `player.liegeOps` store, so
every older mechanism that moves vassal opinion through compatibility keys (grants,
demands, revolts) feeds the council for free.
An occupied seat may also deliberately replace its holder with an unseated vassal through
the same existing appointment mechanic. Council candidates use the shared
person-assignment card to preview the office benefit, absence of household pay, current
Standing and position, and the appointment or replacement consequences.
An explicit dismissal or punishment changes Crown Authority without running vacancy
healing in the middle of that action, so the removed magnate is not silently moved into
another office before the action completes. Ordinary vacancy healing remains simulation
work, and chartered vacancies remain open for nomination.
Any direct vassal may be placed in the `councilRealm` protection scope from Governance or
the Council manager. `FB.councilEnsure` leaves that vassal out when it fills a vacancy, and
`FB.councilRecommendation` uses the same rank/Standing order while omitting protected and
already seated realms. Protected candidates remain visible and manually appointable; a
reservation never dismisses a holder already in office.

The Network Realm section routes a qualified territorial ruler into Governance rather
than maintaining another Council summary. Network keeps the exact host ledger; Governance
names occupied seats, active bonuses, vacancies, and the same Constable contribution
before routing into `UI.showCouncil`. Household steward, factor, captain, and tutor
offices never fill a great office of the crown; personal service remains below and
beside realm government. The former `royal_council` deed id remains a direct-call
compatibility alias but is not a second top-level Deeds entry.

**Saves**: `state.council` is optional and self-heals (`FB.councilEnsure` runs in the
season tick) — no save-version bump; kings in old saves find their council formed on the
next season. `state.realmPolicies` likewise self-heals in the daily institution pass,
with each family falling back to its declared default level. The shared institution ensure performs legacy office and privilege discovery
once for each loaded state; daily expiry/validity work then uses the normalized records
without repeating those whole-save legacy scans. Only the player monarch has a council;
AI realms are not simulated this deep.

Related: [realms.md](realms.md) for vassals and Standing, [events.md](events.md) for the
interpreter, [piety-intrigue-diplomacy.md](piety-intrigue-diplomacy.md) for plots.
