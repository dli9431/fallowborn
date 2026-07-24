# Time, focuses & automation

**Time is daily** (`G.passDay` in main.js): 90-day seasons, 360-day years; `state.turn`
counts days. Each day the player's **focus** ticks (`FB.focuses` in actions.js — continuous
activities with per-day rates); **instants** (`FB.instants`) are one-shot deeds that spend
the day and use day-based cooldowns (`cd`). Focus-based skill training applies the shared
`balance.focusSkillGainRate` multiplier (0.75 by default) to its seasonal chance; other
focus outcomes and non-focus skill gains are unaffected. Martial *training* foci (`militia`, `drill`,
`stand_guard`, `train_arms`) are male-only; women instead get `keep_house` (tier ≤ 2,
household thrift into coin) and `courtly_graces` (tier ≥ 2, court favor and polish), and
`FB.defaultFocus` maps female characters to them. The one exception: while a woman is *afield*
in the *Sweet Polly Oliver* disguise chain (`afield()` in actions.js — any `polly_*` flag set),
`listFocuses`/`defaultFocus` pare her whole menu down to a soldier's day — `drill`, `rest`,
`pray` — so `drill` trains her martial like any recruit; see [events.md](events.md). War *leadership* foci and deeds
(`lead_host`, `muster_host`, `hire_mercs`, `declare_war`) are deliberately NOT gated —
see [characters.md](characters.md) for the chatelaine model. Season boundaries apply upkeep/taxes, run the
player war tick, and pre-roll 1–2 random event "slot days" (`state.slotDays`); new years run
`FB.worldTick` + mortality. Days auto-advance on an adjustable interval (`G.SPEEDS` /
`G.setSpeed`, +/- keys or menu → Settings) while unpaused (`G.paused` / `G.togglePause`); death, succession,
load, skip, a hidden tab, and — on phone-sized screens — window blur all re-pause. The ticker is gated by open event
modals/dialogs. `G.skipAhead` fast-forwards until an event/season/death.

At a season boundary the household receives normal income and pays upkeep, then
`FB.financeSeason` collects assigned revenues and processes loans and trade partnerships
in stable numeric-id order. The measured season ledger closes after those contracts. At a
new year `FB.financeYear` then moves the price index and revalues the remaining purse before
`FB.worldTick`, autosave, and yearly life. The revaluation is visible immediately in
Finance but enters the following season's measured net. `economy.lastYear` prevents a
loaded spring save from applying the annual step twice.

An observe mode (`G.observe`, New Game → 👁 Observe) strips `passDay` to the
calendar, the yearly world tick, and daily army marches — no focus, upkeep,
mortality, births, events, or autosaves — while the UI hides the player chrome
(`body.observing`) and every world-news gate opens to the chronicle. Settings
while observing (`G.obsQuiet` / `G.obsBare`) silence the news toasts or hide
the Land & Chronicle panel entirely (`body.observing.obshidepanel`).

An optional Automation mode (`G.auto`, Z key / ⚙ button, persisted to localStorage)
silently resolves event categories via `autoResolve` in ui.js, logging outcomes to the
chronicle — fast-forward rolls through them. Four independent switches: `minor`
(everyday slot-day happenings), `major` (once-in-a-life and story events), `war`
(musters, war councils, tribute envoys, battle reports — hosts still raise, march,
and fight on the map by their own rules), and `all`, which resolves every event and
stops only for death and the succession screen. Short of `all`, three guards keep
choices human: an event whose worst outcome could drop the player to 0 health is
always shown (`worstWound` in ui.js), and so is any event offering the naming of an
heir (`hasHeirPick`) or a title/independence choice (`hasTitleChoice`); under `all` a
`pickHeir` effect instead names the first in line
silently (`UI.autoResolving`). A separate three-way host command (`G.auto.hosts`:
manual / defensive / offensive) automates the war host's marches — see
[war.md](war.md). Death is never delegated: the succession screen takes
no auto-focus, so a stray Space/Enter cannot sign the succession for the first heir.
The mode can also auto-raise the cheapest building and auto-adopt the cheapest
innovation each season (`FB.autoBuild`/`FB.autoResearch`). Event-data `cooldown`
stays in seasons — the engine multiplies by 90.

Related: [events.md](events.md) for the event interpreter, [war.md](war.md) for the
seasonal war tick, and [finance.md](finance.md) for contract and annual price processing.

Season boundaries also run `FB.livelihoodSeason`: wages from resident household members,
profits from staffed enterprises, and learned household piety enter the same measured
season ledger as focus income and upkeep. New years run `FB.livelihoodYearly` for
apprenticeship progress and ordinary career experience. All career progression and
enterprise outcomes use the saved RNG.

For an independent count or higher, season boundaries also run
`FB.tickForeignPolicy`. Saved Improve/Provoke assignments adjust neighboring sovereigns’
opinion deterministically after the player’s war tick. On the winter boundary this happens
before `FB.worldTick`, so the new opinion affects that year’s AI declarations; yearly
opinion decay follows in `yearlyLife`.

Season boundaries also run `FB.tickRivalry`, for every player, right after
`FB.financeSeason` and before the season ledger closes: it ages recorded hostile contacts,
decays an active feud’s heat, honors post-settlement peace cooldowns, and can have a
slighted NPC declare a rivalry of its own. It moves no gold/prestige/piety, so the measured
season net is unchanged. See [events.md](events.md) for the feud interpreter and
[characters.md](characters.md) for rivalry state and the heir’s legacy-feud choice.
