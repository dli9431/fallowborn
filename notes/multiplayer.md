# Multiplayer

Status: **design proposal — nothing here is implemented.** This document records the model
survey, the decision, and the migration plan for taking Fallowborn multiplayer. Consult it
before touching `js/main.js`, the event flow, or any `state.player` reference.

Target experience: **Factorio-like smoothness** — the world never stalls for one player,
joining/rejoining is fast, there are no desync kicks — while single-player stays exactly as it
is: a zero-dependency zip on itch.io that runs from `file://`.

## 1. What the current code gives us

Multiplayer-friendly already:

- **One serializable state object** (`FB.state`); `js/save.js` snapshots state + RNG state +
  uid counter. The save format *is* a state-sync payload.
- **Seeded RNG discipline** — all randomness through `FB.rng`/`FB.ri`/`FB.pick`;
  `Math.random()` is banned from game logic.
- **Discrete daily ticks** (`G.passDay`, `js/main.js`) — a natural authoritative-backend tick
  unit.
- **Events are declarative data** interpreted by `js/events.js`; an authoritative simulation
  can apply the same effects regardless of its implementation language.
- The ~65 AI realms simulate themselves with no human input.

Single-player assumptions that must be unwound:

- **482 `player` references across 10 engine files** (`actions.js` 174, `ui.js` 96,
  `events.js` 81, `world.js` 68). `state.player` is one object; every deed, event, war
  handler, and panel means "you, the one human."
- **Time is local and pause-driven**: days advance on a local `setInterval`
  (`js/main.js:394`) that halts for open event modals, open dialogs, hidden tabs, and personal
  pause/speed/skip controls.
- **Events are blocking and modal** — the day waits on a choice (`js/main.js:364`).
- **No PvP war** — wars are built around one human vs AI (`FB.playerWarTick`, war councils,
  siege counters).
- **Saves are per-browser localStorage.**

The favorable seam: **`world.js`, `model.js`, `events.js`, and `actions.js` contain zero
DOM/localStorage references** (and `util.js` is clean — the `$()` helper lives in `ui.js`).
The sim core is shell-free at the file level; its most visible client coupling is 23 call sites where
sim code pokes `FB.ui`/`FB.map` (`actions.js` 15, `events.js` 5, `world.js` 3).

There is a second, subtler class the 23-poke count omits: sim code that **renders and stores
display prose**. `FB.news` bakes a rendered English string into `state.log` (`world.js:1256`);
the `log:` effect renders it *inside* `applyEffects` (`FB.news(state, FB.fmt(state, fx.log,
ctx))`, `events.js:887`); and death bakes a rendered quip into `state.legends`
(`main.js:1127`). All resolve `FB.fmt` against the single `state.player` the authoritative
backend has no equivalent of, freezing one player's language/faith into shared state. These
must become `{key, params}` records the client renders — the same conversion `notes/i18n.md`
§6 needs, so build it once for both.

## 2. Model survey: how the genre does it

Paradox's Clausewitz games (EU4, CK2/CK3, Stellaris) and Factorio all use **deterministic
lockstep**: no server runs the world; every machine simulates everything, and only player
*commands* cross the network, stamped with the tick they execute on. It works because same
state + same inputs + same seeded RNG ⇒ identical results everywhere.

The costs of lockstep:

- **Absolute determinism, forever.** Any unseeded randomness, unordered iteration, or
  cross-platform float difference silently diverges the game.
- **OOS ("out of sync") kicks** when periodic state checksums mismatch; remedy is a resync.
  This is the chronic pain of Paradox MP and exists in Factorio too (a desynced player is
  dropped to re-download the map) — Factorio just surrounds it with better tooling (desync
  reports, headless servers, latency hiding).
- **Everyone moves at the pace of the slowest client**; input takes effect a few ticks late
  by design.

Lockstep's payoff — tiny bandwidth, no server — buys Fallowborn nothing: our tick rate is
~350 ms/day and the whole state is a few hundred KB of JSON. Our constraints are the inverse
of Factorio's (60 ticks/sec, huge world).

## 3. Decision: authoritative backend + replicated clients

An **authoritative backend runs the actual simulation**. Its implementation language,
framework, hosting model, and transport remain deliberately undecided. Clients send only
**commands** ("take deed X", "choose event option 2", "war council: charge"). The backend
ticks days on its own clock and broadcasts **state diffs**. Each client keeps a replica
`FB.state` fed by those diffs; `ui.js` renders it exactly as today.

The contract, not code reuse, is the fixed decision:

- The backend alone accepts commands and advances authoritative state.
- Snapshots, diffs, commands, events, chronicle entries, and presentation intents use
  versioned JSON-safe schemas.
- The browser remains a replicated client and local renderer.
- A JavaScript backend may reuse the existing simulation files directly. A backend in
  another language may port the authoritative rules or host the JavaScript simulation behind
  an adapter. Either choice must satisfy the same protocol and behavior fixtures.

Backend selection therefore does not block client, i18n, command, or outbox refactors. Those
produce transport-neutral contracts that remain valid whichever implementation is chosen.

Why this beats lockstep *for this game*:

- **No desyncs, by construction** — one authoritative state, full stop. No cross-browser
  float-determinism audit, no desync-hunting tooling (the worst debugging in netcode).
- **One slow player never stalls the world** — the backend ticks regardless; a laggard just
  receives updates late. This is *the* experience difference from CK, and it's free.
- **Rejoin/late-join is already built** — send the `save.js` snapshot, then stream diffs from
  that day forward.
- **Persistent worlds fall out naturally** — the backend holds the world; it can tick whenever
  ≥1 player is online, or on a schedule. A generational game spanning real-world days wants
  this; lockstep can never give it.
- **Cheat-resistant and mobile-friendly** — clients never simulate 65 realms; they render and
  send intents.
- The simulation workload is modest: ~10k lines of mostly integer arithmetic ticking a few
  times a second. Start with a JSON-compatible protocol and a conventional bidirectional
  transport; binary encoding, WebRTC, and prediction are unnecessary until measurements say
  otherwise.

The Factorio lessons worth stealing (model-independent): never stall the world for one
player · rejoin = snapshot download · local actions *feel* instant even when effects confirm
a tick later · divergent state impossible by design · an authoritative service enables persistent
worlds.

## 4. Architecture boundary: client, protocol, authoritative simulation

The browser layout remains stable:

```
/                          (zero-build browser client)
├── index.html             entry for SP and the MP client
├── css/  data/  mods/     browser assets and local SP content
└── js/
    ├── util model world events actions    ← current local/SP simulation
    ├── ui mapview portrait keys save mods main   ← browser shell
    └── net.js             NEW: backend-neutral MP client adapter
```

Three roles share one versioned behavior/protocol contract:

- **SP driver:** today's `main.js` local loop — behavior unchanged.
- **MP client driver:** `net.js` sends commands, applies backend diffs to replica state, and
  lets the existing shell render.
- **Authoritative simulation:** owns worlds/rooms, validates commands, advances days, saves
  snapshots, and publishes diffs and per-player messages. Its repository and runtime are an
  implementation choice.

The client and backend must agree on game version, content/mod signature, ids, command
schemas, snapshot/diff schemas, event/context schemas, and durable message descriptors. They
do **not** need to be byte-identical programs or use the same language.

### Optional JavaScript reuse

Reusing the existing engine files in a JavaScript runtime is likely the shortest migration:
provide a small compatibility loader, load only pure simulation/data files, and exclude the
browser shell. This is an optimization option, not an architectural requirement.

A different backend may instead:

- Port the authoritative rules and consume generated/versioned content and protocol artifacts.
- Embed a JavaScript runtime for the simulation behind a native service.
- Run a separate simulation worker/sidecar while the chosen backend owns networking,
  persistence, accounts, and orchestration.

Whichever route is chosen, conformance fixtures must prove that commands produce the expected
authoritative state transitions and message descriptors. The browser's zero-dependency,
zero-build, `file://` single-player distribution remains unaffected.

### The one real refactor: the `FB.fx` outbox

The 23 `FB.ui`/`FB.map` call sites inside sim files get rerouted behind a narrow outbox: sim
  code pushes presentation intents (`FB.fx.push({ kind: 'toast', ... })`); the browser shell
  subscribes and renders them locally; the authoritative backend sends equivalent intents in
  each player's outbound stream. This single indirection makes events and messages per-player
  in MP while SP behaves byte-for-byte as today. **Intents must carry `{key, params}`, never
  rendered strings**
(`notes/i18n.md` §6) — which also disciplines the prose-rendering sites from §1 (`FB.news`, the
`log:` effect, legend quips): they stop calling `FB.fmt` in the sim and emit key + `ctx` for
the shell to render per-client.

### Command-driven days

`passDay` becomes: collect each player's queued commands → run the existing day pipeline
(focus ticks, instants, events, seasons) → broadcast a diff + each player's private event
queue. Deeds, focus changes, event options, and war-council choices are already discrete
choices — an ideal command vocabulary.

### Protocol

- **Upstream (client → backend):** commands only.
- **Downstream (backend → client):** per-day state diffs, your event queue, chronicle entries,
  presentation intents.
- **Join/rejoin:** full snapshot (existing save format) + diffs from that day forward.
- **Handshake:** game version + `FB.mods.sig()` — mismatch refuses the join, exactly like
  save v3 and the save mod-signature do locally today.
- **Feel:** the client acknowledges clicks instantly in the UI; effects land on the next
  backend tick (≤ 350 ms — imperceptible in this genre). No real prediction needed at this
  pace.

### Clock, pause, speed

Shared clock owned by the room: speed and pause are room settings (host or vote), not
personal controls. The world never blocks on anyone's event dialog. Open design question:
whether "important" events may pause the world by consensus (see §6).

### Backend technology and dependencies

The zero-dependency rule applies to the shipped browser game, not to separately deployed
online infrastructure. Choose backend language, framework, persistence, transport library,
and hosting at implementation time. Those choices must not leak into the client protocol or
make single-player require a service.

### Packaging

Itch.io deploy stays "zip the browser folder contents." If backend source is co-located, the
packaging script excludes it; if it lives elsewhere, nothing changes. `net.js` adds a few KB
to the client harmlessly. MP is optional and SP remains fully offline.

## 5. Systems work (identical under any transport)

These are required no matter which netcode model had won:

- **`players[]` routing** — rework the 482 `player` references so every "the player" decision
  resolves to a specific human; `state.player` becomes per-client identity over a
  `state.players` collection.
- **Async per-player events** — event modals become inbox entries each player answers at
  their own pace; childhood/wartime pickers run per player.
- **PvP war resolution** — war councils, siege counters, and battles currently assume one
  human vs an AI whose clock simply advances. Human-vs-human needs a real protocol
  (simultaneous commitment with timers, or defender-reacts).
- **Human diplomacy** — envoys/pacts/mediation currently target AI only; add player-to-player
  offers, plus whatever communication (chat) the design wants.
- **Lobby UI** — room list/create, identity, seeing other players' characters and realms.

## 6. Migration plan

Each step is independently shippable; SP keeps working throughout.

1. **Introduce the `FB.fx` outbox**; convert the 23 `FB.ui`/`FB.map` call sites in sim files.
   SP unchanged. (Pure refactor — makes the sim testable even if MP never ships.)
2. **Make `passDay` command-driven** — deeds/event choices become command objects through a
   dispatcher; the SP loop feeds commands locally. SP unchanged.
3. **Add `net.js` + the first backend adapter** — one world/room, one bidirectional transport,
   version handshake, command validation, and snapshot join. With a JavaScript backend this
   may reuse the existing sim through a loader; another backend may port or host it behind an
   adapter. Lobby, PvP war protocol, and persistent worlds build on the same contract.

## 7. Open questions

Decide before or during step 3:

- **Backend implementation:** reuse JavaScript directly, embed it behind another service, or
  port the authoritative sim? Choose language/framework only after prototyping the protocol
  and operational needs.
- **Transport and persistence:** WebSocket or another bidirectional transport; files,
  relational storage, document storage, or managed state?
- **World cadence:** tick only while ≥1 player is online, or truly persistent on a schedule?
- **Pause rules:** fixed room speed? host-only pause? pause vote? May "important" events
  pause by consensus, or never?
- **Players per world** (2–8 co-op dynasties feels right for the design; the tech allows far
  more).
- **Hosting:** a managed authoritative service, or player-hosted backends behind a relay?
- **Persistence & save-scumming:** backend autosaves; do players get rollback at all?
- **Reconnect grace:** how long does a disconnected player's realm idle before the world
  moves on without pause privileges?

## 8. Non-goals

- Cross-browser deterministic lockstep (rejected — see §2/§3).
- WebRTC data channels / P2P hosting (initially; possible later for player-hosted rooms).
- Binary protocols, client-side prediction (unnecessary at 3 ticks/sec).
- Accounts, matchmaking, MMR.
