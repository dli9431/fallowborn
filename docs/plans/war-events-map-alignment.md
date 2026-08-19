# Ground legacy war events in live map state

Status: implemented — tests authored in `tests/e2e/specs/war-event-pacing.spec.js`,
awaiting the owner's test run (agent-side execution is not permitted)

## Problem

The war-event layer predates on-map warfare and parts of it ignore troop positions:

- The attacker's siege never progresses from troop presence. A host parked on the enemy
  war target does nothing on its own; only the seasonal `war_council` option
  "Press the siege" (`FB.fns.war_siege`) advances `w.siege`. The defender's siege of the
  player, by contrast, pulses automatically each season in `FB.playerWarTick` whenever an
  invader stands in player lands.
- Siege flavor events key off the council ledger, not the map:
  `war_active_occupation` (trigger for `war_occupation_policy`, "The siege works bite into
  {target}") is `w.siege > 0`, so it stays silent while a host stands on the target before
  the first council pulse, and keeps firing for up to a season after the host has left.
- `war_council` still offers abstract resolutions with no map reality: "Offer pitched
  battle" (a `war_battle` chance roll producing `war_win`/`war_loss` with zero troop
  movement) and "Harry their lands" (`war_harry`).
- Campaign condition (`war.strength`), led days (`war.led`), and refit (`war.rested`) feed
  only the abstract `war_battle` chance and its UI estimate — real field battles in
  `battlePower` ignore them. `blessed_war` is consumed only by event battle rolls, never by
  real field battles, despite `battlePower` applying its bonus.

Approved scope: align event triggers with live map state, make a host standing on an
enemy target press the siege automatically, and remove the abstract battle/harry options
so every battle win/loss comes from a real map battle.

## Changes

### 1. `js/world.js` — automatic attacker siege + live occupation gate

- `FB.playerWarTick`: after the `if (w.defending) { ... }` block add an `else` branch that
  calls `FB.fns.war_siege(state)` (it already no-ops unless a player host stands on the
  target, uncontested, with enough men) and returns early if the war ended
  (`if (!state.player.war) return;` — a breach runs `FB.warCapture`). This mirrors the
  invader's automatic siege pulse directly above. The existing `lastSiegeTurn` decay keeps
  working: the pulse stamps `lastSiegeTurn` each season the host holds the ground.
- `FB.fns.war_active_occupation`: require a live besieging host —
  attacking war, `state.owner[w.target] === w.enemy`, and `FB.playerSiegeStatus(state)`
  non-null. It remains a read-only modding trigger.
- `FB.maybeQueuePlayerSiegeEvent`: after daily movement and battles, queue the exact-war
  `war_occupation_policy` once when the player first has an uncontested force large enough
  to press the target. `war.occupationEventQueued` prevents repeat arrival stories.
- Delete `FB.fns.war_harry` and `FB.fns.war_no_enemy_host` (dead once the options go).
- Keep `FB.fns.war_siege` (now the season-tick pulse) and `FB.fns.war_can_siege`
  (read-only query, documented modding surface); refresh their comments.
- Update the "war-council handlers" header comment — battle preparations are now spent on
  the field, not on a council roll.

### 2. `js/armies.js` — campaign state reaches field battles

- `battlePower`, player branch (where the "same edges the war council grants carry onto
  the field" comment already sits): also multiply by
  - campaign condition `war.strength || 1` (clamped 0.5–1.1 by `adjustWarStrength`),
  - `1 + min(90, war.led) / 90 * 0.1` (days spent on the lead-host focus),
  - `1.05` when `war.rested`.
  These mirror the `war_battle` named-chance terms, so the Deeds-card estimate matches
  real resolution. `war_win`/`war_loss` already spend led/rested via `afterBattle`.
  The automation's odds checks call `battlePower` too, so automated hosts inherit the
  same math.
- `resolveBattle`: when the player is involved, delete `state.player.flags.blessed_war` —
  the blessing's +0.06 already applied through `battlePower`, and MODDING.md promises it
  is "spent on the next battle roll".

### 3. `data/events_war.js` — remove abstract council options

- `war_council`: delete "Offer pitched battle." (`chance:'war_battle'` → abstract
  `war_win`/`war_loss`), "Press the siege of {target}." (now automatic), and
  "Harry their lands." (`war_harry`). Remaining: "Hunt down their field host."
  (map order), "Fall back and refit.", "Seek terms.".
- `war_muster` text: replace "your host must stand upon its walls while the council
  presses the works" with the host standing season by season.
- `war_tribute_offer` "Press on for {target}." desc: same rewording (the works advance
  each season the host holds the ground).
- `war_occupation_policy`: make it a `trigger:{never:true}` operational event with the
  ordinary-war context validator. It no longer depends on random slot days, a 24% gate,
  or competition with unrelated camp stories.
- Field-battle events (`field_battle_won/lost` + `_steel`) already queue from
  `resolveBattle` for the primary host; no change.

### 4. `js/events.js`

- `CORE_CUSTOM_EFFECT_IDS`: drop `war_harry` (fn deleted). Keep `war_win`/`war_loss`/
  `war_siege` — the fns remain live code paths.
- `namedChance` case `'war_battle'`: remove the `harried` term (source deleted); update
  comments to describe it as the field-battle estimate behind the war card and the siege
  sortie roll. Keep the case (still used by `war_siege`'s unfortified sortie and the UI).
- The autoresolve special case for `chance:'battle'`/`'war_battle'` stays
  (`chance:'battle'` events remain).

### 5. UI copy

- `js/ui_panels.js` `renderDeedsWarCard`: helper text "Campaign condition changes
  war-council odds; …" → condition/leadership tilt every field battle. The
  "🎯 ~{odds}% chance" line stays — it is now an honest field-battle estimate.
- `js/ui_modals.js`:
  - `CUSTOM_FX_SCORE`: remove `war_siege`/`war_win`/`war_loss` entries and rewrite the
    stale comment (automation takes land by standing its host on the target; the season
    tick presses the works).
  - Guide/declaration copy: replace "press the works at each war council" with "the works
    advance each season the host holds the ground".
- `js/actions.js` `lead_host` focus desc: "(better odds at the war council)" →
  steadies the host for the next field battle.

### 6. Docs

- `docs/designs/war.md`: rewrite the "seasonal layer" paragraph and the siege/muster
  mentions: automatic season-tick siege for the attacker, council reduced to map orders
  (hunt / refit / terms), condition+led+rested multiplying field-battle power,
  `blessed_war` spent by real battles, `war_active_occupation` requiring a live besieging
  host.
- `docs/MODDING.md`: drop `war_no_enemy_host` from the built-in custom-trigger list,
  update the `war_battle` chance doc and the war-handler list (remove `war_harry`, note
  `war_siege` runs from the season tick).
- No `FBDATA.techImpactReviews` entry: no new gateable capability (siege tech bonus
  unchanged). No `FB.VERSION`/`FB.CHANGELOG` bump and no i18n catalog regeneration —
  those are integration steps; catalogs self-heal to English until then.

### 7. Tests (authored, not run — execution is owner-controlled)

Extend `tests/e2e/specs/war-event-pacing.spec.js`:

- Automatic attacker siege: attacking war + player host on the target → `FB.playerWarTick`
  increments `w.siege`; host elsewhere → no progress; contested → no progress.
- Breach: `w.siege` one step from `required` → tick breaches, transfers the county, ends
  the war, and does not queue a stale `war_council`.
- `war_active_occupation` follows the host: true while the host stands on the target,
  false after it leaves even with `w.siege > 0`.
- A host completing its march onto an uncontested, workable target queues exactly one
  `war_occupation_policy` with the active war id and target location; a second daily tick
  cannot duplicate it, and the daily picker returns that queued event directly.
- `war_council` data no longer contains `chance:'war_battle'` or the `war_harry`/
  `war_siege` customs.
- `FB.armyBattlePower` reflects campaign state: lower `war.strength` lowers power;
  `war.led`/`war.rested` raise it; `blessed_war` is deleted after a player-involving
  `FB.armyTick` battle.
