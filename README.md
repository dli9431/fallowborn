# Fallowborn

*From mud to crown, one funeral at a time.*

A free browser grand-strategy dynasty saga. Start as a serf in 867 AD and guide one
family up the ladder — Serf → Freeholder → Gentry → Baron → Count → Duke → King →
Emperor — across generations, while ~65 sovereign AI realms redraw the map of medieval
Europe, the Middle East, and North Africa around you.

**[Play it free on itch.io](https://dli9431.itch.io/fallowborn)** 
**[Play latest builds (also free) on play.fallowborn.com](https://play.fallowborn.com)** — or clone this repo and open
`index.html`. That's the whole install.

<!-- TODO: screenshot or map-timelapse GIF here -->

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
- **Procedural everything.** Canvas-drawn map, generated heraldry, system emoji. There
  is not a single asset file in this repository.
- **Runs on a potato.** ES5 on purpose, tested on a 2015 CPU. If it has
  a browser, it runs Fallowborn.

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
