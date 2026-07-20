# Events are data

`js/events.js` interprets declarative triggers/effects (documented exhaustively in
docs/MODDING.md). New effect/trigger keys must be added there *and* documented in
docs/MODDING.md. Events fired from code use `trigger:{never:true}` and are queued via
`state.eventQueue` / effect `queue`.

Event-data `cooldown` stays in seasons — the engine multiplies by 90 (see
[time.md](time.md)).

Related: [war.md](war.md) for the war-council events, [characters.md](characters.md) for
the childhood event filter, [time.md](time.md) for slot days and autoresolve.
