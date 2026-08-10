# Music

Fallowborn's soundtrack is optional, self-hosted Opus audio. The core game must still boot when
the catalog is empty, the browser cannot decode Ogg Opus, a track fails, or the player stays
silent. Music is not simulation state and never changes deterministic gameplay.

## Catalog and files

The source of truth is the `music/` directory. `tools/music_catalog.py build` validates the files
and writes the classic-script catalog at `data/music_catalog.js`; runtime code never scans a web
directory. The title theme is `music/intro/000-fallowborn.opus`. Gameplay tracks use:

`music/<faith>/<culture>/<role>/<NNN>-<slug>.opus`

`faith` and `culture` are lowercase selector ids. The role is `folk`, `war`, or `court`. File
numbers make ordering stable, while the slug becomes the displayed title. A content change also
changes the generated revision token, allowing the persistent music cache to keep exact files.

## Choosing music

The first boot with a non-empty catalog asks whether to play music and shows the expected download
size. The answer is remembered, and Settings can change it later. The title theme may play before
a campaign. In a campaign the context resolver selects:

- `war` while the player's sovereign realm is at war, during a pledged great holy war, or in a
  soldier/campaign context;
- `court` for ruler tier 3 or greater;
- `folk` otherwise.

Faith and culture selectors prefer an exact bank, then related lineage/group selectors, then a
broad faith fallback. Jewish and Zoroastrian starts currently fall back to the Muslim collection;
the final general fallback is the Christian collection. Adding a more precise folder and
regenerating the catalog makes it available without changing runtime code.

The hosted and itch builds use the same contextual bank selection and weighted shuffle. The itch
artifact includes the complete current soundtrack, so faith, culture, and role resolution behave
the same on both release surfaces. Observer mode continues to shuffle the whole catalog.

## Playback and controls

The player keeps two audio elements and crossfades between fully loaded tracks. In-game context
changes never interrupt the current song. The resolver queues the latest matching bank and starts
it when the song ends or the player chooses **Next**, so a quick war-to-peace reversal does not
skip back and forth. A seeded weighted shuffle avoids immediate repeats where possible. **Hear
this more** gives a persistent weight to the current track. The bounded listening history powers
both **Previous** and **Next**,
while **Repeat** replays the current track without changing that history.

The pregame screens share one compact bottom-corner music control. It displays a pause icon while
music plays and a music icon while silent. Pausing retains the intro element and playback position
for an in-session resume, while also saving the persistent **Play music** choice as off. The next
visit therefore stays silent without asking again. Resuming the same page continues from the saved
position and stores the choice as on, so later visits autoplay the title theme. Enabling music from
a newly loaded silent preference starts the intro normally. Entering gameplay releases any paused
title element. The control stays hidden during loading, gameplay, or when the soundtrack cannot
play.

The now-playing title sits at the bottom of the map and opens the track modal. A compact adjacent
button pauses or resumes the current track without opening that modal. By default, leaving the game
window or tab pauses playback, and returning resumes only music that was playing before focus was
lost. Settings can instead keep both the title theme and gameplay soundtrack playing while the tab,
window, or screen is inactive. This preference bypasses only the automatic focus-loss pause; it
never changes the saved **Play music** choice or overrides a manual pause. Like and dislike are
available only on play.fallowborn.com. Each changed rating persists locally and emits the
first-party event `music-rating` through the existing telemetry boundary. Its `track_id`,
`track_title`, `rating`, `music_bank`, and `music_role` properties support per-song breakdowns in
analytics without creating a separate event name for every song. Ratings do not affect shuffle
weight. The modal's center Play/Pause control retains the current track position without changing
the saved **Play music** preference.

## Caching and offline play

Online playback fetches a complete track, verifies the response, stores it in the stable
`fallowborn-music-v1` Cache Storage cache, and then plays a blob URL. Replaying it uses the cached
response. The service worker also treats full music requests as cache-first and bypasses Range
requests. Old revisions are cleaned without deleting still-current music.

Only play.fallowborn.com exposes offline downloads. A player can download any complete bank or the
entire soundtrack. A bank is marked complete only after all its tracks are cached. Offline
selection uses the best matching complete bank; if there is no match, it uses the most recently
chosen fallback bank. One downloaded bank therefore loops by itself. Browser storage is evictable,
so the engine checks the actual cache rather than trusting completion markers alone. Download
progress shows inside the downloads dialog while it is open and on a small floating chip when it
is not, so a download started from the title menu stays visible inside the game. Finishing toasts
the result and refreshes the dialog only when it is already open — it never pops the dialog over
the game.

The service worker's app shell includes the intro but excludes gameplay tracks. The title's
**Game available offline** message refers to the core game, not to every music bank.

## Distribution

The play.fallowborn.com Docker build validates and ships the full catalog. The private itch deploy
uses `stage-itch` to require and stage the same complete catalog beneath a 200,000,000-byte
gameplay-audio cap, with the intro outside the cap. If the complete catalog exceeds that boundary,
deployment fails instead of silently dropping tracks or leaving contextual banks incomplete.
