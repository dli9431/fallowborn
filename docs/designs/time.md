# Time, focuses & automation

## Daily time, focuses, and deeds

**Time is daily** (`G.passDay` in main.js): 90-day seasons, 360-day years; `state.turn`
counts days. Each day the player's **focus** ticks (`FB.focuses` — continuous
activities with per-day rates); **instants** (`FB.instants`) are one-shot deeds that normally
spend the day or open the interface where a final action is chosen, and may use day-based
cooldowns (`cd`). The Deeds panel presents this as a strong
two-kind contract: **Daily Focus** repeats automatically whenever a day passes, while
**one-time deeds** are chosen once. Immediate and choice-backed deed buttons use different
border accents; their supplementary **Resolves now** / **Opens choices…** timing and action
description follow the shared card-details convention (hover/focus side tooltip on desktop,
`?` disclosure on touch/tablet), keeping the button face to one prominent action line. Thus
an immediate deed such as Poach is visibly different from a picker-backed deed such as Go
into town. A picker opener is not itself a
completed deed: cancelling leaves the tutorial step unfinished, while confirming the
eventual day-spending choice completes it.
The 28 baseline focus records and 78 baseline deed records keep their non-executable
metadata in `data/actions.js`. `js/actions.js` owns private handler registries and validates
and projects those records into the compatible `FB.focuses` / `FB.instants` shapes. Every
baseline id, order, and handler binding is protected. Fixed cooldowns, technology
requirements, group, and explicit `immediate` / `no_day` / `choices` flow are data; day
consumption, deferred cooldowns, compatibility aliases, modal behavior, callbacks, and RNG
remain handler capabilities. `FB.rebuildActionCatalogs` replaces both projections and their
id indexes atomically, so even a same-length catalogue replacement cannot retain a stale
focus or deed. Phase 4B accepts partial runtime-mod overrides for baseline ids:
presentation, order, deed group, fixed cooldown, technology requirements, and bounded
static eligibility. Static rules compose with the private handler guard and therefore
can only narrow an action's availability. Handler callbacks, UI flow, day consumption,
dynamic cooldowns, and every baseline id remain protected.

Phase 4C adds new mod deeds only through the fixed `declarative_deed` adapter. They are
manual-only, cannot open or defer UI, and derive their visible timing from a required
`spendsDay` boolean. One pure status record supplies visibility, the disabled reason, fixed
resource costs, and exact effects. Execution rechecks that record, applies its transaction
once, stamps cooldown and tutorial completion, and only then invokes the existing
`passDay({skipFocus:true})` path when requested. A no-day deed completes at return; there is
no new in-flight save state.

Phase 4D similarly admits new focus ids only through the fixed `declarative_focus`
adapter. A complete record declares home and/or afield context plus at least one bounded
seasonal resource yield, daily health change, or seeded seasonal skill-training chance.
One pure status projection owns visibility, disabled eligibility and technology reasons,
and the exact preview; the daily tick consumes those same authored values. Resource yields
are divided across 90 days, health clamps daily, and skill chances use the saved RNG in
fixed `dip`, `mar`, `ste`, `int`, `lea` order. New focuses are manual-only and excluded
from deterministic default selection. Removing an active definition falls back to the
ordinary built-in default without consuming RNG or clearing unrelated action state.

Phase 4E exposes two individually registered capabilities without opening the handler
boundary. A `resource_choice` declarative deed derives `choices` flow from one to 12 fixed
transactions. Opening, cancelling, and mobile Back are state-free; confirmation rechecks
the deed and choice before applying one transaction, then uses the existing cooldown,
tutorial, and optional day-spend sequence. There is no saved in-flight picker record.
`fallback_focus` is the only automated focus capability: after the normal role focus fails,
eligible opt-in definitions compete by fixed score, then action order and id, before the
ordinary built-in fallback. Status and score projection are pure and consume no RNG.

The full deed-list API resolves visible definitions in one linear pass. The Deeds panel
may request visibility-only entries for collapsed accordion groups, postponing cooldown,
technology, and other eligibility work until those controls are opened.
Daily focus validation likewise requests availability only. Mechanical preview ledgers and
seasonal projections are presentation data and are materialized only for an explicit focus
status or the open Deeds panel, never merely to let the active focus advance another day.
Focus-based skill training applies the shared
`balance.focusSkillGainRate` multiplier (0.75 by default) to its seasonal chance; other
focus outcomes and non-focus skill gains are unaffected. Martial *training* foci (`militia`, `drill`,
`stand_guard`, `train_arms`) are male-only; women instead get `keep_house` (tier ≤ 2,
household thrift into coin) and `courtly_graces` (tier ≥ 2, Standing with the liege and courtly polish), and
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
It still executes the authoritative daily tick for every date, but invariant
repair work is retained between relevant mutations. Political courts key off
the realm revision plus compact Standing, commerce, council, relationship, and
modifier inputs, so an eligible landed court is not rebuilt, territorially
rescanned, and adjacency-rescored on every unchanged day. Institutions
fingerprint their small saved policy, election, privilege, demand, council, and
guild records, then wake at the exact next term, cooldown, privilege, or
mistreatment deadline. Stable Papal and religious offices bypass their full
repair until an election or vacancy is due, while idle great-holy-war
eligibility sleeps until its next authored date or restored-head deadline and
wakes early on sacred-control changes. Scripted history likewise retains its
next due date, and materialized ruler synchronization reuses each ruler
projection within a pass. These retained paths never batch RNG-bearing
mechanics or move expiry boundaries; focus, travel, armies, events, and dated
transitions keep their ordinary per-day order. The player-facing skip is
frame-sliced to a four-millisecond
budget (and at most two days per frame), with per-day UI refresh requests,
political-map base
rebuilds, canvas renders, transient Chronicle-news toasts, and the replaceable
autoresolve receipt toast deferred until the burst ends. Completion refreshes
the lightweight date, resources, controls, and incremental Chronicle while
retaining the mounted panel tree. If Deeds is open, its already-mounted deed
rows receive one status-only cooldown and eligibility pass; the same pass runs
at most every seven game days during ordinary flowing time. It does not turn a
large data-driven Deeds catalogue into a synchronous end-of-skip rebuild, and
only a rare change in deed visibility promotes the pass to an exact render.
Chronicle entries are still recorded on their exact simulation day; only the last five notices that
the live toast rail could have retained are rendered afterward. This keeps input
and painting responsive without making
wall-clock timing part of simulation state. A coachmark raised during an active
burst still pauses it immediately, and an already-open lesson keeps the skip
from starting until the player dismisses it.

Focus defaults are role-first. A landed adult defaults to `govern`, gentry to
`manage_manor`, and only serfs/commoners default from their vocation. Hands-on
soldier, craft, trade, and clerical foci stop at tier 2. An already-active Sweet
Polly disguise remains the deliberate exception until its chain ends; promotion
also ends tier-1–2 travel immediately.

Personal social attention is independent of the daily focus. On every ordinary player day,
`FB.tickSocialAttention` adds the fixed `balance.socialAttentionDailyOpinion` to the
assigned character's existing Standing, including a day filled by an instant deed. It does
not tick in Observe mode. At home it advances only for a locally resident target;
while traveling it remains paused on outbound and return roads and advances after
arrival only when the target resides in the traveler’s current county. The removed `court_suitor`
focus is accepted only as old-save input: restore converts it to attention on the current
suitor and selects a normal valid focus.

Gift couriers are independent of the player’s personal journey and focus. After the
calendar advances, `FB.giftDeliveryTick` runs exactly once beside `FB.travelTick` on each
ordinary player day. It advances every in-flight recipient concurrently, including a day
spent dispatching another gift. Observe mode never ticks, delivers, fails, or returns a
player courier.

The campaign's origin is saved as
`state.start:{id,year,season,day}` and its current calendar remains
`state.date:{year,season,day}`. New lives copy both from the selected bookmark; old
version-3 saves without `state.start` are interpreted as Spring day 1, 867. Duration
and start-relative display use this origin. Turn-based future dates such as pact
expiry are converted relative to the current saved date, rather than assuming turn
zero was 867.

`FB.worldTick` also runs `FB.rulerAgencyYearly` once per New Year. It repairs
generation-stamped aims, updates only structural ruler relations, advances the
bounded managed-family ambitions, maintains at most three rebel-sponsorship
records, and may queue at most one relevant ruler approach plus one family
request. A single cached breadth-first county walk supplies every player-distance
gate for that pass. No agency work runs daily, and Observe mode updates AI-to-AI
aims, relations, and rebel support without queuing player decisions.

Bookmark scripted history is checked after every calendar advance in both play and
Observe mode. A legacy `{year,...}` entry is due on Spring day 1 and retains its
existing flag and durable-message keys. Entries with `season` or `day` must also
have a stable `id`; their once-only flag and message identity combine that id with
the bookmark id, allowing exact dates without array-position identities.
The same daily post-calendar phase runs `FB.religiousHeadRecoveryTick`. It is inert
without an eligible vacancy; once a saved vacancy is 360 days old it can restore a
qualified AI-controlled seat or assign the strongest eligible AI claimant in stable
order, including in Observe mode.
The same phase runs `FB.guildMonopolyTick` before any season-boundary income, so a
charter whose saved `endTurn` equals the new turn expires without contributing to that
day's income. A second idempotent pass after army/holy-war/travel movement catches a
same-day relocation or political invalidation; clearing the slot makes its durable
Chronicle notice one-shot.

At a season boundary `FB.marketSeason` first updates deterministic county production,
demand, two adjacency-flow passes, shocks, and prices. Observe mode runs this same world
market pass without any protagonist settlement. In ordinary play the household then
receives normal landed/property income and livelihood wages before paying locally quoted
station and resident-family necessities. An unpaid share becomes market hardship instead
of a fixed wartime surcharge. Maintained commoner standards settle next. If their total is
unaffordable, discretionary levels lapse in a stable order until the remainder can be paid;
surviving luxuries then grant their prestige. Retainer capacity/pay and active
school terms settle after standards, so a lost quarters level can reduce service capacity
before contracts are paid. Unaffordable schooling pauses for that term. Any live player
host then pays composition-based logistics, clamped at an empty purse if unaffordable,
before the ordinary war and great holy-war seasonal drivers run. Then
`FB.financeSeason` collects assigned revenues and processes loans and passive trade partnerships
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
The mode can also auto-raise the cheapest building. A sovereign player may separately
enable automatic research and choose either cheapest-first or a preferred domain;
`FB.autoResearch` fills every open national slot immediately and after completions
without consuming RNG. A preferred domain falls back to the cheapest eligible technology
elsewhere when necessary. The enabled state and priority live in the existing
`fb_automation` localStorage preference. Vassals cannot choose or automate their
sovereign's projects, though eligible vassals can advocate one project annually.
The Automation sheet filters these persistent preferences through the current
role: host commands appear for landed rulers or a protagonist with an actual
war/host commitment, auto-building appears only at landed rank, and research
controls appear only for a sovereign ruler. A landed vassal sees only the
explanation that the sovereign directs research. Hidden settings remain saved
for a later eligible life but do not light the Automation checkmark while they
are inaccessible.
Event-data `cooldown` stays in
seasons — the engine multiplies by 90.

Related: [events.md](events.md) for the event interpreter, [war.md](war.md) for the
seasonal war tick, and [finance.md](finance.md) for contract and annual price processing.

Season boundaries also run `FB.livelihoodSeason`: wages from resident household members,
profits from staffed enterprises, and learned household piety enter the same measured
season ledger as focus income and upkeep. `FB.householdStandardsSeason` follows it, then
retainer settlement, then `FB.educationSeason`, so those household wages can meet standards,
service, and school fees in the disclosed order. `FB.educationSeason` first applies the
saved household education policy to newly eligible or otherwise empty choices, then settles
the resulting live arrangements. Education records one quarter of the
arrangement's annual learning bonus for every paid term. New years run `FB.livelihoodYearly` for
apprenticeship progress and ordinary career experience. All career progression and
enterprise outcomes use the saved RNG.

Learned trainees use that same yearly tick to accumulate vocational years and earn
Lettered after the career's literacy threshold, but neither age sixteen nor accumulated
experience promotes them automatically. Their license and permanent specialty examinations
are explicit one-day actions with fees, seeded pass rolls, and a failed-attempt cooldown.
The learned daily foci are Keep records, Practice physic, and Scholarly work; each reads the
active licensed career and its saved specialty for income, Standing, prestige, or national
research. Landed protagonists retain learned careers as biography but cannot sit exams or
perform their hands-on focus, matching the general tier-3+ livelihood rule.

The same boundary runs `FB.techSeason` once for every living sovereign, including in
Observe mode. Each nation adds `2 + min(4, realm development × 0.04)` research plus
completed technology bonuses to one shared pool. The pool divides evenly across one,
two, or three occupied slots; unused points and completion overflow remain reserve.
Patronage, libraries, and `research` event effects always resolve through the
contributor's current top independent realm. The first day of each year also runs
saved-RNG technology diffusion after prerequisites and permanent exposure are checked.

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
home or settled. Personal social attention is presence-aware during the journey:
road days pause it, a co-located destination stay advances it, and returning home
pauses a remote assignment without deleting it. A permanent move still clears
local cultivated relationships, an active courtship, and its assignment.

For an independent count or higher, season boundaries also run
`FB.tickForeignPolicy`. Saved Improve/Provoke assignments adjust neighboring sovereigns’
Standing deterministically after the player’s war tick. On the winter boundary this happens
before `FB.worldTick`, so the new Standing affects that year’s AI declarations; yearly
Standing decay follows in `yearlyLife`.

On every normal day after the calendar advances, `FB.financeDay` resolves dispatched
self-founded trade ventures whose exact saved `dueTurn` has arrived. This is independent
of the season-boundary partnership pass. The resolver stores its sole seeded roll and
result before adding the payout to the current household purse.

Great holy wars use all three existing clock scales without a new timer. The daily
tick records sacred-place control, launches a prepared call on its exact 180th day,
advances or decays objective sieges after field armies march and fight, and checks
resolve/objective/deadline victory. Season boundaries award one service contribution
to every active participant, increment vow service, queue the personal service event
for vassal or unlanded expeditions, and then run `FB.sacredCustodySeason`. Custody
held by the player's realm or a vassal pays 2 piety only while a custodian's sovereign
bloc controls at least one saved site. The new-year world tick runs the saved,
seeded historical call
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

The daily post-calendar phase also runs `FB.modifierTick` beside the guild-monopoly
sweep and before season-boundary income. Records expire exactly when
`state.turn >= endTurn`, so an expiring county contributes neither upkeep nor bonuses at
that boundary. Direct-demesne modifier upkeep settles with household income; campaign
host supply adjustments settle later with the live host bill. See
[modifiers.md](modifiers.md).
