# The Royal Council

**At tier 6 (King) the player no longer rules alone.** `js/council.js` forms the royal
council — five great officers of the crown drawn from the player's own vassal realms:
**Seneschal** (+10% taxes), **Constable** (+10% levy), **Treasurer** (buildings 15%
cheaper), **Almoner** (+1 piety/season), **Chamberlain** (watches for schemes; the
player's own plots weave faster). Offices are historical household great-offices, not a
modern cabinet. A seat's bonus (`FB.councilBonus`) holds only while its holder is a
living vassal not in open disgrace (Standing above −50).

**Councillors are people, not chairs.** Generated rulers (`realm.ruler`, world.js) carry
a `trait` from `FB.RULER_TRAITS` — the house's temper. Ambitious, deceitful, proud,
envious, cruel, or wrathful officers with cold Standing become **schemers**; warm ones
become **sycophants** who ingratiate themselves with gifts and flattery. This is a deliberate enrichment
of the lightweight ruler object (see [realms.md](realms.md)) — vassal rulers are still
not full characters.

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

**Interaction** is summarized in the landed ruler's **Governance** sheet and managed in
the focused `UI.showCouncil` modal: the authority meter, every seat with its holder's
trait and Standing, term protection where applicable, and the levers — offer a gift,
dismiss, nominate, or appoint to vacant seats. The confirmation sheet exposes the office,
electorate, term, candidates, expected support, campaign tactic, and final tally.
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
next season. Only the player monarch has a council; AI realms are not simulated this deep.

Related: [realms.md](realms.md) for vassals and Standing, [events.md](events.md) for the
interpreter, [piety-intrigue-diplomacy.md](piety-intrigue-diplomacy.md) for plots.
