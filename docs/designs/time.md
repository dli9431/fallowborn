# Time, focuses & automation

**Time is daily** (`G.passDay` in main.js): 90-day seasons, 360-day years; `state.turn`
counts days. Each day the player's **focus** ticks (`FB.focuses` in actions.js — continuous
activities with per-day rates); **instants** (`FB.instants`) are one-shot deeds that spend
the day and use day-based cooldowns (`cd`). Season boundaries apply upkeep/taxes, run the
player war tick, and pre-roll 1–2 random event "slot days" (`state.slotDays`); new years run
`FB.worldTick` + mortality. Days auto-advance on an adjustable interval (`G.SPEEDS` /
`G.setSpeed`, +/- keys or menu → Settings) while unpaused (`G.paused` / `G.togglePause`); death, succession,
load, skip, and a hidden tab all re-pause. The ticker is gated by open event
modals/dialogs. `G.skipAhead` fast-forwards until an event/season/death.

An observe mode (`G.observe`, New Game → 👁 Observe) strips `passDay` to the
calendar, the yearly world tick, and daily army marches — no focus, upkeep,
mortality, births, events, or autosaves — while the UI hides the player chrome
(`body.observing`) and every world-news gate opens to the chronicle.

An optional Automation mode (`G.auto`, Z key / ⚙ button, persisted to localStorage)
silently resolves selected event categories (everyday / important / war councils) via
`autoResolve` in ui.js, logging outcomes to the chronicle — fast-forward rolls through
them — and can also auto-raise the cheapest building and auto-adopt the cheapest
innovation each season (`FB.autoBuild`/`FB.autoResearch`). Event-data `cooldown` stays in
seasons — the engine multiplies by 90.

Related: [events.md](events.md) for the event interpreter, [war.md](war.md) for the
seasonal war tick.
