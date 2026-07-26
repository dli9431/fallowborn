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

Focus defaults are role-first. A landed adult defaults to `govern`, gentry to
`manage_manor`, and only serfs/commoners default from their vocation. Hands-on
soldier, craft, trade, and clerical foci stop at tier 2. An already-active Sweet
Polly disguise remains the deliberate exception until its chain ends; promotion
also ends tier-1–2 travel immediately.

Personal social attention is independent of the daily focus. On every ordinary player day,
`FB.tickSocialAttention` adds the fixed `balance.socialAttentionDailyOpinion` to the
assigned character's existing Regard, including a day filled by an instant deed. It does
not tick in Observe mode or while `player.travel` is active. The removed `court_suitor`
focus is accepted only as old-save input: restore converts it to attention on the current
suitor and selects a normal valid focus.

The campaign's origin is saved as
`state.start:{id,year,season,day}` and its current calendar remains
`state.date:{year,season,day}`. New lives copy both from the selected bookmark; old
version-3 saves without `state.start` are interpreted as Spring day 1, 867. Duration
and start-relative display use this origin. Turn-based future dates such as pact
expiry are converted relative to the current saved date, rather than assuming turn
zero was 867.

Bookmark scripted history is checked after every calendar advance in both play and
Observe mode. A legacy `{year,...}` entry is due on Spring day 1 and retains its
existing flag and durable-message keys. Entries with `season` or `day` must also
have a stable `id`; their once-only flag and message identity combine that id with
the bookmark id, allowing exact dates without array-position identities.
The same daily post-calendar phase runs `FB.religiousHeadRecoveryTick`. It is inert
without an eligible vacancy; once a saved vacancy is 360 days old it can restore a
qualified AI-controlled seat or assign the strongest eligible AI claimant in stable
order, including in Observe mode.

At a season boundary the household receives normal income, pays station and resident-family
upkeep, and collects livelihood wages. Maintained commoner standards settle next. If their
total is unaffordable, discretionary levels lapse in a stable order until the remainder can
be paid; surviving luxuries then grant their prestige. Retainer capacity/pay and active
school terms settle after standards, so a lost quarters level can reduce service capacity
before contracts are paid. Unaffordable schooling pauses for that term. Then
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
season ledger as focus income and upkeep. `FB.householdStandardsSeason` follows it, then
retainer settlement, then `FB.educationSeason`, so those household wages can meet standards,
service, and school fees in the disclosed order. Education records one quarter of the
arrangement's annual learning bonus for every paid term. New years run `FB.livelihoodYearly` for
apprenticeship progress and ordinary career experience. All career progression and
enterprise outcomes use the saved RNG.

For a tier-3+ player, the yearly livelihood tick freezes secular career experience
and ordinary vocation work. Clerical vocational years continue solely so religious
standing can advance. Other household workers are unaffected.

An active overland journey (`player.travel`, [travel.md](travel.md)) replaces the
player’s daily focus tick with `FB.travelTick`. County legs take three days by
default and may be shortened by maintained transport at departure. The enterprise
specifically staffed by the traveling player produces
nothing, while other household work, enterprises, contracts, pregnancy, aging,
armies, and world simulation continue. Travel arrivals queue their own encounters;
ordinary random home slot events are consumed but suppressed until the traveler is
home or settled. Personal social attention is paused for every travel day; a permanent
move clears local cultivated relationships, an active courtship, and its assignment.

For an independent count or higher, season boundaries also run
`FB.tickForeignPolicy`. Saved Improve/Provoke assignments adjust neighboring sovereigns’
opinion deterministically after the player’s war tick. On the winter boundary this happens
before `FB.worldTick`, so the new opinion affects that year’s AI declarations; yearly
opinion decay follows in `yearlyLife`.

Great holy wars use all three existing clock scales without a new timer. The daily
tick records sacred-place control, launches a prepared call on its exact 180th day,
advances or decays objective sieges after field armies march and fight, and checks
resolve/objective/deadline victory. Season boundaries award one service contribution
to every active participant and queue the personal service event for vassal or
unlanded expeditions. The new-year world tick runs the saved, seeded historical call
scheduler before ordinary realm declarations, so campaign participants cannot open a
second war that year.

The call itself queues a wartime announcement event immediately. Launch marks a
second announcement pending; it is queued on the following daily holy-war tick,
after that day's army tick has raised the newly active sovereign hosts. Both use the
ordinary event-modal/autoresolve path, so fast-forward stops on them whenever war
event automation is off.

Observe mode runs the same yearly scheduler, daily host movement, battles, occupation,
repair, and settlement deterministically; it merely suppresses protagonist event
handling. Catholic calls unlock in late 1095 and Sunni calls in 1105. Resolution
starts an 18-year per-faith cooldown; a preparation collapse starts eight years.
An active campaign has an eight-year deadline.

Season boundaries also run `FB.tickRivalry`, for every player, right after
`FB.financeSeason` and before the season ledger closes: it ages recorded hostile contacts,
decays an active feud’s heat, honors post-settlement peace cooldowns, and can have a
slighted NPC declare a rivalry of its own. It moves no gold/prestige/piety, so the measured
season net is unchanged. See [events.md](events.md) for the feud interpreter and
[characters.md](characters.md) for rivalry state and the heir’s legacy-feud choice.
