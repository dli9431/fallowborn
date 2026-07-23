# Time, focuses & automation

**Time is daily** (`G.passDay` in main.js): 90-day seasons, 360-day years; `state.turn`
counts days. Each day the player's **focus** ticks (`FB.focuses` in actions.js — continuous
activities with per-day rates); **instants** (`FB.instants`) are one-shot deeds that spend
the day and use day-based cooldowns (`cd`). Season boundaries apply upkeep/taxes, run the
player war tick, and pre-roll 1–2 random event "slot days" (`state.slotDays`); new years run
`FB.worldTick` + mortality. Days auto-advance on an adjustable interval (`G.SPEEDS` /
`G.setSpeed`, +/- keys or menu → Settings) while unpaused (`G.paused` / `G.togglePause`); death, succession,
load, skip, a hidden tab, and — on phone-sized screens — window blur all re-pause. The ticker is gated by open event
modals/dialogs. `G.skipAhead` fast-forwards until an event/season/death.

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
stops only for death and the succession screen. Short of `all`, two guards keep
choices human: an event whose worst outcome could drop the player to 0 health is
always shown (`worstWound` in ui.js), and so is any event offering the naming of an
heir (`hasHeirPick`); under `all` a `pickHeir` effect instead names the first in line
silently (`UI.autoResolving`). A separate three-way host command (`G.auto.hosts`:
manual / defensive / offensive) automates the war host's marches — see
[war.md](war.md). Death is never delegated: the succession screen takes
no auto-focus, so a stray Space/Enter cannot sign the succession for the first heir.
The mode can also auto-raise the cheapest building and auto-adopt the cheapest
innovation each season (`FB.autoBuild`/`FB.autoResearch`). Event-data `cooldown`
stays in seasons — the engine multiplies by 90.

Related: [events.md](events.md) for the event interpreter, [war.md](war.md) for the
seasonal war tick.
