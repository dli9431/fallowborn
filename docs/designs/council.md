# The Royal Council

**At tier 6 (King) the player no longer rules alone.** `js/council.js` forms the royal
council — five great officers of the crown drawn from the player's own vassal realms:
**Seneschal** (+10% taxes), **Constable** (+10% levy), **Treasurer** (buildings 15%
cheaper), **Almoner** (+1 piety/season), **Chamberlain** (watches for schemes; the
player's own plots weave faster). Offices are historical household great-offices, not a
modern cabinet. A seat's bonus (`FB.councilBonus`) holds only while its holder is a
living vassal not in open disgrace (favor above −50).

**Councillors are people, not chairs.** Generated rulers (`realm.ruler`, world.js) carry
a `trait` from `FB.RULER_TRAITS` — the house's temper. Ambitious, deceitful, proud,
envious, cruel, or wrathful officers with cold favor become **schemers**; warm ones become
**sycophants** who curry favor with gifts and flattery. This is a deliberate enrichment
of the lightweight ruler object (see [realms.md](realms.md)) — vassal rulers are still
not full characters.

**Crown authority is the axis of the minigame** (`state.council.authority`, 0–100,
starts 60). High-handed acts — extraordinary taxes (+4), revoking a fief (+6), dismissing
an officer (+4) — raise authority but sour favor; appointments and concessions lower it.
Yearly it drifts back toward 50 (`FB.councilYearly`). Two thresholds matter:

- Below `balance.councilConsentBelow` (35) the council outweighs the crown: the
  extraordinary-taxes and revoke-county deeds are blocked outright.
- Above `balance.councilCharterAbove` (70) with a sour board (average favor < −5), the
  `council_charter` event fires — the Magna Carta moment: seal the charter (authority
  −25, every vassal +15 favor) or tear it up (coin flip: supremacy, or the angriest
  magnate in open revolt via the existing `vassal_revolt` flow).

**Events** live in `data/events_council.js` — flattery, petitions, office-seekers,
uncovered schemes (two flavors, gated on whether a Chamberlain sits watching), council
feuds, a wartime subsidy, and the charter. Triggers and effects are the `council_*`
custom fns in `js/council.js`; like the older vassal events, slot-day council events
stay archetypal (no named tokens) and let the effect fns pick the councillor involved.

**Interaction** runs through the 🏛 Royal Council deed (tier ≥ 6) and its modal
(`UI.showCouncil`): the authority meter, every seat with its holder's trait and favor,
and the levers — offer a gift, dismiss, appoint to vacant seats. Gifting opens the same
rank-priced cash-or-armory picker as the councillor's ruler sheet and uses the same
generation-stamped 90-day recipient cooldown; the Council cannot provide a second gift
path. `FB.councilGift` remains as a compatibility wrapper around the shared cash helper.
Opinion itself is the existing `player.liegeOps` store, so every older mechanism that
moves vassal opinion (grants, demands, revolts) feeds the council for free.

The Network Realm section is a summary and route into this interface, not another Council
screen. It names occupied seats, active bonuses, vacancies, and the Constable contribution
in the shared levy ledger, then opens `UI.showCouncil` for appointments, dismissal,
gifts, and authority. Household steward, factor, captain, and tutor offices never fill a
great office of the crown; personal service remains below and beside realm government.

**Saves**: `state.council` is optional and self-heals (`FB.councilEnsure` runs in the
season tick) — no save-version bump; kings in old saves find their council formed on the
next season. Only the player monarch has a council; AI realms are not simulated this deep.

Related: [realms.md](realms.md) for vassals and favor, [events.md](events.md) for the
interpreter, [piety-intrigue-diplomacy.md](piety-intrigue-diplomacy.md) for plots.
