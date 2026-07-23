# Fallowborn

A browser grand-strategy dynasty saga — except you probably start as a **serf**.
Beginning in **867 AD**, guide one family through the generations: from mud-floored huts toward
manors, baronies, and — if fortune and cunning allow — crowns.

## Play

Open `index.html` in any modern browser. That's it — no build step, no server, no dependencies.

- **Desktop (mouse):** drag to pan the map, scroll to zoom, click provinces for details.
- **Desktop (keyboard only):** fully playable without a mouse —
  arrows pan · Shift+arrows hop between neighboring provinces · `PgUp`/`PgDn` zoom · `H` center
  home · `Enter` selects the province at screen center · `D` `S` `K` `L` `C` open the
  Deeds/Self/Kin/Land/Chronicle panels (hotkey letter underlined in-game) · `1–9` pick focuses,
  deeds, event options, and dialog items, and `Shift+1–9` reaches items 10–18 (badges show
  the numbers; the number row and numpad both work) · `Space`/`E` play/pause the
  flow of days · `+`/`−` change the speed of days · `F` skips to the next happening ·
  `Z` opens autoresolve settings · `R` cycles the map filter (Realm / Mine / Liege) ·
  `[` `]` cycle panels · `Esc` menu/back/close ·
  `Tab` moves between buttons.
- **Mobile / touch:** drag to pan, pinch to zoom, tap provinces. In portrait the map sits
  above a full-width Deeds/Land/Chronicle panel with the time controls fixed at the bottom
  in thumb reach; **tap your portrait in the top bar** to open the Self/Kin sheet. Dialogs
  open as bottom sheets, and tapping an item chip opens its card — story, powers, worth,
  and the choice to sell it or give it away for regard. The speed of days lives in
  **☰ → Settings**.
- **Observe mode** (New Game → 👁 Observe): no character at all — the world simulates
  on its own while you watch the map, tap provinces, and read the chronicle. Its ☰ →
  Settings can also silence the news toasts or hide the panel for a pure-map view.
- The game autosaves every spring; three manual save slots live in the ☰ menu, beside 📤 Export / 📥 Import for keeping a life as text — the fallback for browsers that wipe local storage (some iPhones), and a way to move a life between devices.
- **☰ → 🐞 Report a bug** builds a ready-made report: your description (bug or suggestion)
  bundled with the game version, start seed, and your current life as save text — copy it and
  paste on [Discord](https://discord.gg/G8E67hY2pj), by email to hello@fallowborn.com, or as a
  [GitHub issue](https://github.com/dli9431/fallowborn/issues).

### Languages

English is the source language. Settings also offers AI-translated Preview catalogs for
French, German, Italian, and Spanish. The selection is saved in this browser and applies
after a reload; changing it during a life autosaves first. Interface text, core events, and
new chronicle messages are localized; proper names, mod-authored text, old prose already
frozen into a save, and the changelog may remain English. Invalid or outdated catalogs
safely fall back to English.

### The loop

Time passes **day by day** (90-day seasons, 360-day years).

1. Set a **focus** in the *Deeds* tab — it is pursued every day until you change it: work your
   land, drill with the levy, haggle at market, copy manuscripts, court your intended…
2. Act on **deeds** when the moment is right — one-shot acts like poaching, scheming, proposing
   marriage, or petitioning your lord. Each spends the day; many need time before repeating.
3. Press **Space** (or the Play/Pause button) to set time flowing — days pass on their own
   (~3 per second) — and press it again to pause. **F** / the ▶▶ button skips straight to the
   next happening. Events pause the days while they await your choice; they land on their own
   schedule, and your choices in them shape your life.
4. Marry and raise children — but mind your **station**: matches are weighed by rank, and the
   great houses bar their doors to suitors from far beneath them. Marrying up takes long
   courtship, renown, and luck (and pays a dowry to match); marrying down is easy, and noted.
   And should you outlive a grander spouse, their house owes you a settlement — while a child
   of that blood carries a claim worth pressing. Faith writes the marriage law: some grant
   divorce, some let a man keep several wives, and a Christian match can only be unmade by
   the church. The desperate have been known to plot darker exits.
   Choose each child's education focus and appoint a tutor whose
   skill (and habits) shape them. From age twelve you can also arrange a child's match from
   their sheet: three families stand ready to hear an offer — a daughter's dowry is paid when
   the pledge is sealed, a son's bride brings hers to the wedding, and the vows follow once
   both are sixteen. Left alone, grown children find their own (unremarkable) matches.
   When death comes (it will), continue as your heir — and if
   your heir is still a child, their upbringing is yours to direct from the *Self* tab.
5. Watch the *Kin* tab fill in: parents, siblings, uncles and aunts, cousins, grandchildren.
   The **🌳 See the family tree** button at the top of that tab draws the whole house as a
   tree — couples share a box, each brood hangs beneath its parents, † marks the dead.
   Your kin wed and have children of their own, and when your own line runs out, a sibling,
   nephew, or cousin of the house can carry the name onward.

### The ladder

Serf → Freeholder → Gentry → Baron → Count → Duke → King → Emperor.
The *Deeds* tab always shows a hint for the next rung. Wealth buys freedom and manors; a lord's
favor and battlefield glory earn banners; the church raises the learned; marriage and scheming
shortcut everything. Meanwhile ~65 sovereign realms fight their own wars — and their dukes
and counts sometimes break away — so the map redraws itself decade by decade.

### The feudal ladder

Every county on the map belongs to someone: a count, who answers to a duke, who answers to
a king, who may answer to an emperor (the Land tab shows the whole chain, and the de jure
duchy/kingdom/empire each county belongs to). Once you hold land of your own you play that
game in both directions. As a **vassal** you can petition your liege for land (you will need
his favor — 65 or more — and real standing of your own, 400+ prestige, and each grant costs
both), pay homage at
any court along your chain, appeal over a harsh liege's head to a higher lord, swear fealty
to a different sovereign — or raise your own banner and fight for independence (the
⚑ Declare independence deed, once you have 200+ prestige). As a **liege**
you can grant counties to sworn men, squeeze them for extraordinary taxes, revoke the fiefs
of the disloyal, and weather their petitions, feuds, and revolts. Titles follow the land:
hold the majority of a duchy to be its duke, of a kingdom to be its king, of two kingdoms
of one empire to wear its crown.

### War

From **count** upward the *Deeds* tab offers **⚔ Declare war** against a neighboring
realm. Your host musters the moment war begins — tap it on the map, then tap a
province to march it (the ⚙ automation can also command it, defensively or
offensively). **Land is taken only by siege:** keep your host standing on the prize
and press the siege at each season's war council — after three seasons of works the
county falls to you. Field victories never hand over land by themselves; enough of
them make the enemy sue for peace, and then the choice is yours — take the tribute,
or press on for the walls. Defense cuts the same way against you: keep the enemy's
host out of your lands, for three seasons unchecked costs you a border county. Wars
bleed gold and men — and past eight seasons, exhaustion ends them with nothing gained.

### Starts

Seven scenarios: Serf, Free Farmer, Craftsman's Apprentice, Novice Monk, Man-at-Arms,
Hedge Knight, and Petty Baron — anywhere on a map spanning Europe, the Middle East, and
North Africa.

**Sharing a start (seeds):** New Game offers a **Fresh start** or **🔑 Use this seed**.
Paste a friend's full start code to begin with their exact world, scenario, province, and
character — the character screen comes pre-filled, so you can check the details before
committing. A bare word or code works too: same 867 world (same rulers, same generated
lords), your own picks. Your own start code waits in the ☰ menu once your story begins —
tap it to copy and share. Codes reproduce exactly only on the same game version and mod
set.

## Modding

The entire world — map, provinces, realms, events, cultures, traits, balance — is plain data in
`data/*.js`, using **real longitude/latitude coordinates** (province shapes are generated
automatically from seed points, so adding a province is three lines of text). Import
third-party JSON mods from the **Mods** menu at runtime without touching any files; bundled
`.js` conversions dropped into `mods/` get an Enable/Disable toggle there too.
See **[MODDING.md](MODDING.md)** for the full reference.

## Credits & license

All art is procedural (canvas-drawn map, generated heraldry) or standard system emoji/fonts —
no external assets are used, so the game folder is fully self-contained.
Written in dependency-free vanilla JavaScript.

Source available under the [PolyForm Noncommercial License 1.0.0](../LICENSE) — free to
play, mod, and share noncommercially.
