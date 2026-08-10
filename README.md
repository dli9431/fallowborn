# Fallowborn

*From mud to crown, one funeral at a time.*

A free browser grand-strategy dynasty saga. Start as a serf in 867 or 1066 AD and guide
one family up the ladder (Serf → Freeholder → Gentry → Baron → Count → Duke → King →
Emperor) across generations, while ~65 sovereign AI realms redraw the map of Europe,
Russia to the Urals, the Middle East, and North Africa around you.

**[Play it free on itch.io](https://dli9431.itch.io/fallowborn)** 

**[Play latest build (also free) on play.fallowborn.com](https://play.fallowborn.com)** — or clone this repo and open
`index.html`. That's the whole install. The direct hosted build prepares offline refresh after
one complete visit and can be installed from supporting browsers.

<!-- TODO: screenshot or map-timelapse GIF here -->

## The game today

- **Two historical starts.** Begin in Spring 867 or Spring 1066, each with authored
  historical rulers, and pick the exact settlement your character was born in.
- **A living world.** ~65 sovereign realms with their own generated dukes and counts
  war, scheme, and fragment around you. Field armies march the map, fight battles, and
  besiege holdings; mercenaries sell their swords.
- **The way down as well as up.** Titles lapse, lords demand submission, defeat brings
  capture and ransom. A dynasty can fall as fast as it climbs.
- **A deep late game.** Royal councils and crown authority for kings, parliaments of the
  estates for landed vassals, the Papacy and the College of Cardinals for those who deal
  with the Church.
- **A full medieval life.** Marriage politics and child education, guilds and
  apprenticeships, loans and trade partnerships, travel, tournaments, heirloom items,
  realm research, faiths and their doctrines.
- **~3,000 real settlements.** GeoNames-derived towns and villages under their period
  names fill every county, drawn as inspectable emblems when you zoom in close.
- **A generated soundtrack.** Contextual Opus folk, court, and war music follows your
  faith, culture, and situation, with optional offline downloads.
- **Five languages.** English plus AI-preview French, German, Italian, and Spanish.
- **Watch instead of play.** Observe mode simulates the whole world with no character
  at all.

## Why this repo is interesting

- **Zero dependencies, zero build.** No package.json, no bundler, no framework, no
  server. Classic scripts, two globals, runs straight from `file://`.
- **The entire world is data.** ~460 historical counties as plain objects in
  `data/*.js`, with province shapes generated from real longitude/latitude seed points —
  adding a province is three lines of text. Realms, events, cultures, traits, and every
  balance knob live in the same files.
- **Deterministic by construction.** All randomness flows through a seeded RNG that
  serializes with the game state; a save is one JSON object that captures the whole
  world.
- **Procedural everything in play.** Canvas-drawn map, generated heraldry, system emoji.
  The only packaged images are the self-contained browser/install icons; there are no
  external art or network assets. The self-hosted Opus soundtrack under `music/` is the
  one authored media asset.
- **Runs on a potato.** The compatibility floor is a 2016-era browser (roughly Safari 10
  / Chrome 49), and it is tested on a 2015 CPU. If it has a browser, it runs Fallowborn.

## Playing

Open `index.html` in any modern browser — desktop or mobile, mouse, touch, or fully
keyboard-only. How to play, controls, and the loop: [docs/README.md](docs/README.md).

## Modding

Everything about the world is moddable as plain JSON, imported at runtime from the Mods
menu — up to total conversions, no engine changes required. Full schema reference:
[docs/MODDING.md](docs/MODDING.md).

## Contributing

Bug reports, balance complaints, and ideas are very welcome — [open an
issue](../../issues). Code pull requests are not accepted for licensing reasons
(explained in [CONTRIBUTING.md](CONTRIBUTING.md)); mods are the encouraged way to build
on the game.

## License

Source available under the [PolyForm Noncommercial License 1.0.0](LICENSE) — free to
play, mod, and share noncommercially.

---

Built openly with AI assistance, by one person, on a PC that can't run CK3.
