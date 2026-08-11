# Modding Fallowborn

## Targeted plots, war causes, and alliances

A plot definition may add an optional `target` selector. The engine asks the player to
choose before the plot begins and saves the JSON-safe selection in
`player.plot.context`; discovery and resolution events receive the same context. The
built-in selector `"border_county_without_dejure"` produces:

```json
{ "pid": "<province id>" }
```

The core `fabricate_claim` plot uses that selector, requires tier 4, and needs 14 power.
Its `fabricate_claim` named chance is
`clamp(0.30 + intrigue * 0.03 + learning * 0.01 + prestige / 1000, 0.10, 0.90)`.
For this plot, `plot_discovery` uses the same chance when the player rushes the scheme.
The custom effects `fabricate_claim_success`, `fabricate_claim_failure`,
`plot_discovery_success`, and `plot_discovery_failure` create the saved claim or charge
5 prestige, then end the plot. Only one fabricated claim may exist.

Core also supplies compound semantic selectors. They return only the fields shown; the
engine re-runs the selector during every Scheming tick and before a custom resolution, so
a dead person or realm, replaced contract, changed institution, or ended relationship
cannot silently retarget:

| selector | context |
|---|---|
| `current_liege_obligation` | `{realmId, institution:"estates", contractId:"obl"}` |
| `active_guild_monopoly` | `{contractId}`; the id identifies one exact incoming or outgoing charter |
| `council_schemer` | `{realmId, institution:"council", rulerGeneration}`; succession cannot transfer the target |
| `diplomatic_correspondence` | `{realmId}` for a neighboring sovereign, active direction, pact, or alliance |
| `political_rival` | `{characterId}` plus only the relevant `realmId`, `institution`, or instance-stamped `contractId` connection |

`FB.plotTargetOptions` is the authoritative selector interface. `FB.plotTargets` remains
the compatibility reader that returns the primary id from each option. Beginning a plot
copies the matched context rather than retaining arbitrary caller fields. Discovery adds
only `plotId`; buying containment adds `exposure` to the active plot record, reduces its
power, and raises later discovery risk without adding a second intrigue resource.
Estates and Council selector discovery is read-only. Projected customary Estates terms
do not create `liege.obl`, and querying Council targets does not form or repair a Council,
consume RNG, or write Chronicle news.

`FB.warCauses(state)` is the authoritative declaration API. It returns semantic records
with this common shape:

```json
{
  "type": "dejure | fabricated | restoration | caliphate",
  "target": "<province id>",
  "enemy": "<sovereign realm id>",
  "titleKind": "duchy | kingdom | empire | null",
  "titleId": "<de jure title id or null>",
  "titleName": "<display title or null>",
  "blocked": "war | pact | alliance | null"
}
```

Only fields relevant to the cause are present. `restoration` targets the claimant
crown's current capital; `caliphate` targets the sitting Sunni office holder's
sovereign capital and can transfer only that office; `fabricated` refers to
`player.fabricatedClaim.pid`; `dejure` uses the most specific title the player actually
holds. Passing `true` as the second argument includes war/pact/alliance-blocked records
for explanatory UI. `FB.warTargets`
still returns province ids, and `FB.startPlayerWar` accepts either a current semantic
record or a compatible string target. New wars persist the normalized subset as
`player.war.casus`; missing `casus` on an old in-progress war invokes legacy capture.

Defensive alliances live in `state.alliances` as canonical pairs:

```json
{
  "a": "<realm id>", "b": "<realm id>",
  "source": "dynastic | envoy | royal_marriage",
  "aGen": 2, "bGen": 4
}
```

Only one pair may involve a realm. The generation stamps expire it when either ruler
changes. Alliances block declarations and add abstract levy to a defender; they never
create extra war records or allied field hosts.

Everything about the world is data. There are two ways to mod:

1. **Edit the files in `data/`** — plain JavaScript objects, loaded before the engine.
2. **Load a JSON mod at runtime** — menu → Mods → choose a `.json` file (or paste JSON).
   Mods are stored in your browser and re-applied on every load, *before* the world is
   generated. Same-`id` entries **replace** the originals; new ids are **added**.

## Make a JSON mod with ChatGPT (no coding required)

1. Start a new ChatGPT conversation and attach this `docs/MODDING.md` file. If your
   ChatGPT interface does not offer file attachments, paste the document into the
   conversation instead.
2. Describe the mod in ordinary language. Say what should be added or changed, who or
   what it should affect, and any numbers, names, or restrictions you care about.
3. Ask ChatGPT to create an **importable Fallowborn JSON mod**, not a bundled JavaScript
   mod. Ask it to follow `docs/MODDING.md`, include a unique `name`, preserve every
   documented `{token}`, and return valid JSON with no comments or trailing commas.
4. If the mod changes existing content, also provide the relevant file from `data/`
   when ChatGPT asks for it. Existing ids and complete replacement entries must come
   from the game files; ChatGPT should not guess them.
5. Ask ChatGPT to check the finished result against the guide. Copy the JSON into a
   plain-text file, save it with a `.json` extension such as `my_mod.json`, and make
   sure the editor has not added `.txt` to the filename.

A useful request to copy and fill in:

> Read the attached `docs/MODDING.md` as the source of truth. Create an importable
> Fallowborn JSON mod named "[mod name]" that [describe the change]. Do not write a
> bundled JavaScript mod or change the base game files. Do not invent existing ids;
> tell me which `data/` file you need if an id or complete replacement definition is
> missing. Preserve documented text tokens and return the finished mod as valid JSON
> in one code block, with no comments or trailing commas.

To import the file, open Fallowborn and choose **Mods** on the title screen, or open
the **☰ menu → Mods** during a game. Choose the `.json` file, then select
**Apply & reload**. You may paste the JSON into the box in the same dialog instead.
Begin a new life after changing mods: saves remember their exact mod set and will only
load while that same set is active. Re-importing a mod with the same `name` replaces
its previous copy.

Mods placed in `mods/*.js` (with a matching `<script>` tag in `index.html`) are
**bundled mods**: each registers `{id, name, desc, data}` into `window.FBMODS` via a
script tag, and the Mods dialog offers an Enable/Disable toggle per mod. Enabled ids
persist in localStorage and apply exactly like pasted mods, ahead of them.

A JSON mod is one object with any of these keys:

```json
{
  "name": "My Mod (cosmetic, optional)",
  "bookmarks": { "my_start": { ...complete bookmark... } },
  "defaultBookmark": "my_start",
  "provinces": [ ... ],
  "realms":    [ ... ],
  "empires":   { "id": { ... } },
  "kingdoms":  { "id": { ... } },
  "duchies":   { "id": { ... } },
  "events":    [ ... ],
  "straits":   [ ["provA","provB"] ],
  "crossingClasses": { "provA|provB": "coastal" },
  "scripted":  [ ... ],
  "cultures":  { "id": { ... } },
  "religions": { "id": { ... } },
  "traits":    { "id": { ... } },
  "ailments":  { "id": { ... } },
  "buildings": { "id": { ... } },
  "techDomains": { "id": { "name": "...", "icon": "...", "order": 7 } },
  "techTraditions": { "id": { "name": "...", "cultures": [], "religions": [] } },
  "tech":      { "id": { ... } },
  "techCaps":  { "seaMovement": 0.5, "units": { "arch": 250 } },
  "holdings":  { "id": { ... } },
  "careers":   { "id": { ... } },
  "positions": { "id": { ... } },
  "schooling": { "id": { ... } },
  "enterprises": { "id": { ... } },
  "householdStandards": { "id": { ... } },
  "travelPurposes": { "id": { ... } },
  "travelSites": [ ... ],
  "finance":    {
    "pledge": { ... }, "merchant": { ... }, "revenue": { ... },
    "tradePartnership": { ... }, "tradeVenture": { ... }
  },
  "plots":     { "id": { ... } },
  "items":     { "id": { ... } },
  "politicalBlocs": {
    "crown": { "name": "Crown", "motions": { "redress": -20, "scutage": -10 }, ... }
  },
  "policies": { "market_charter": { ...complete policy... } },
  "elections": { "guild_officer": { ...complete election... } },
  "privileges": { "market_charter": { ...complete privilege... } },
  "collectiveDemands": { "commons_custom": { ...complete demand... } },
  "modifiers": { "id": { "name": "...", "scope": "county", "fx": { ... } } },
  "settlementNames": { "cultureId": { "pre": [...], "suf": [...] } },
  "settlementSites": { "site_slug": { "x": 12.5, "y": 41.9 } },
  "titles":    { "christian": ["Serf", "..."], "christian_f": ["Serf", "..."] },
  "papacy":    { ...complete Catholic Papacy definition... },
  "currency":  { "id": "sterling", "label": "Sterling", "icon": "£", ... },
  "balance":   { "freedomCost": 30, "coinageSymbol": "£" },
  "land": [ ... ], "seas": [ ... ], "rivers": [ ... ], "bounds": { ... }
}
```

`name` is cosmetic: it labels the mod on the title screen and in the Mods dialog, and
re-applying a mod with the same name **replaces** the stored copy instead of stacking a
second one.

`bookmarks` is an atomic replacement table. Each keyed value replaces that complete
start world; bookmark definitions do not merge by province or realm. The older
top-level world keys remain the merge API for the built-in 867 definition.
`defaultBookmark` may name any complete bookmark present after all mods merge. The last
enabled mod that supplies it wins; an unknown id stops boot at the bookmark validation
screen instead of silently falling back to another start.

> Saves store only province/realm **ids**, so changing map data can orphan old saves. To keep
> a life from waking up on the wrong map, every save is stamped with a fingerprint of the
> active mod set — loading it under a different mod set is refused with a message saying
> which world it needs (the load dialog marks such slots too).

## Currency presentation

The optional top-level `currency` object changes how every monetary amount is
displayed. It does not change the economy: `player.gold`, event `gold` effects,
`goldMin` gates, prices, loans, and balance values remain numbers in internal game
gold. One game gold is converted only while text is rendered, and formatted strings
are never stored in a save.

A full pounds/shillings/pence definition is:

```json
{
  "name": "Sterling Currency",
  "currency": {
    "id": "sterling",
    "label": "Sterling",
    "icon": "£",
    "smallestPerGold": 240,
    "units": [
      {
        "id": "pound",
        "value": 240,
        "symbol": "£",
        "singular": "pound",
        "plural": "pounds",
        "position": "before",
        "space": false
      },
      {
        "id": "shilling",
        "value": 12,
        "symbol": "s",
        "singular": "shilling",
        "plural": "shillings",
        "position": "after",
        "space": false
      },
      {
        "id": "penny",
        "value": 1,
        "symbol": "d",
        "singular": "penny",
        "plural": "pence",
        "position": "after",
        "space": false
      }
    ],
    "showZeroMinor": false,
    "maxUnits": 3
  }
}
```

`smallestPerGold` is the number of smallest display units represented by one
internal game gold. Each unit's `value` uses that same scale. The example renders
`12.525` game gold as `£12 10s 6d` without changing the stored `12.525`.

Schema rules:

- `id`, `label`, and `icon` are nonempty plain-text strings.
- `smallestPerGold` is a positive integer.
- `units` has one to four entries, in strictly descending `value` order.
- Unit ids and positive integer values are unique; the final value must be `1`.
- Every unit supplies plain-text `symbol`, `singular`, and `plural`, a `position`
  of `before` or `after`, and a Boolean `space`.
- `showZeroMinor` defaults to `false`.
- `maxUnits` defaults to the denomination count and is clamped to that count.

The final enabled or pasted mod that supplies `currency` wins as one atomic
definition; denomination arrays are not merged. An invalid definition falls back
to the complete built-in currency while the rest of the mod still loads.

A decimal currency changes the scale and units in the same way:

```json
{
  "currency": {
    "id": "dollars",
    "label": "Dollars",
    "icon": "$",
    "smallestPerGold": 100,
    "units": [
      { "id": "dollar", "value": 100, "symbol": "$", "singular": "dollar",
        "plural": "dollars", "position": "before", "space": false },
      { "id": "cent", "value": 1, "symbol": "¢", "singular": "cent",
        "plural": "cents", "position": "after", "space": false }
    ]
  }
}
```

A single-unit currency uses `smallestPerGold: 1` and one unit with `value: 1`.
The older `balance.coinageSymbol` option remains a deprecated compatibility alias:
when no full `currency` is supplied it changes only the topbar icon. A full
`currency` definition takes precedence.

## The map

All coordinates are **real-world [longitude, latitude]**. The engine projects them (Mercator)
and rasterizes provinces automatically: every land pixel joins its nearest province seed
on the same polygon in `land`. Separate islands and mainlands must therefore be separate
land polygons; this keeps an island seed from claiming a disconnected shore across water.
A land polygon without a seed falls back to unrestricted assignment so scenery-only
polygons remain visible. Within a single polygon a carved sea (`seas`) can still strand
a far-shore fragment on the wrong county, so after assignment any same-polygon fragment
disconnected from its seed passes to the neighboring county it actually borders — no
county spans a carved sea (Tangier holds no Spanish shore); fragments reached through
the unseeded-polygon fallback (islands) are left alone.
**You never draw province borders** — you place a seed point
where the province's heart is.

### Adding a province (a county)

Provinces are **counties**: the map holds ~460 of them, each belonging to a de jure
duchy. The canonical table lives in `data/counties.js` as compact rows
(`[id, name, lon, lat, duchy, culture, religion, terrain, dev, realm]`) and expands into
province objects; mods merge full objects as before:

```json
{ "provinces": [
  { "id": "prague2", "name": "Zličané", "x": 15.0, "y": 49.8, "duchy": "d_bohemia",
    "realm": "bohemia", "culture": "slavic", "religion": "slavic_pagan",
    "terrain": "forest", "dev": 2 }
] }
```

- `x`/`y` — longitude/latitude of the seed (look it up on any map).
- `duchy` — id into `FBDATA.duchies`; the de jure kingdom and empire follow from it.
- `realm` — the realm holding the county at the 867 start.
- `terrain` — `farmland forest hills mountains desert steppe marsh tundra`.
- `dev` — ordinal countywide productive, fiscal, and manpower capacity at the
  867 start: 1–2 is sparse frontier, 3 an ordinary established county, 4 a
  productive or significant center, 5–6 a major regional center, 7–9 an
  exceptional metropolis or irrigated core, and 10 a world-leading center.
  It is a relative scale, not an exact population estimate. Authored values
  initialize fresh games only; an existing save's `state.dev` values remain
  authoritative.
- `wasteland: true` — impassable scenery, no realm/culture needed.
- `settlements` — optional ordered list of up to eight historical settlement
  presentations for this county, e.g.
  `"settlements": [{ "site": "praha", "name": "Prague", "kind": "town" }]`.
  Index 0 is the county head. `site` references the shared physical-site table
  (see [Settlements](#settlements)); `name` is a historical proper name (never
  localized); `kind` is `village`/`town`/`city` as the baseline kind. The list is
  a complete replacement of the authored slots, never a patch: array position is a
  saved-property reference, so appending is safe but reordering or inserting ahead
  of an existing slot moves saved buildings and plots between named places.
  An entry may add `"fill": true`: the presentation still replaces the slot's
  generated name/location, but it does not force early visibility — development
  reveals it on the normal thresholds (the shipped
  `data/settlements_real.js` uses this for its OpenStreetMap-derived fill).
- Adjacency is computed automatically from the generated shapes. For connections across
  water, add a `straits` pair. Field armies treat an unclassified pair as a `narrow`
  crossing. To opt into a slower passage, add the same lexicographically sorted county
  ids to `crossingClasses` with `coastal` or `open` (or explicitly `narrow`):

```json
{
  "straits": [["island_county", "mainland_county"]],
  "crossingClasses": {
    "island_county|mainland_county": "coastal"
  }
}
```

`straits` must remain exact two-element arrays. A crossing-class key must put the lower
county id first, name an existing strait in that same complete world, and use only
`narrow`, `coastal`, or `open`. Reversed, orphaned, or unknown classifications reject
bookmark activation. The classification affects field-army time and routing only:
personal travel, political adjacency, and `FB.findPath` continue to use ordinary strait
adjacency.

Top-level `straits` are append-only: each supplied pair is added after the existing
pairs. To remove or replace crossings, provide an atomic bookmark with its complete
`straits` array. `crossingClasses`, by contrast, merges by canonical pair key.

### The de jure hierarchy

Counties → duchies → kingdoms → empires, all plain reference data:

```json
{ "empires":  { "e_francia": { "name": "Francia" } },
  "kingdoms": { "k_west_francia": { "name": "West Francia", "empire": "e_francia" } },
  "duchies":  { "d_ile": { "name": "Île-de-France", "kingdom": "k_west_francia" } } }
```

The engine uses it for the player's tier promotions (majority of a duchy/kingdom/empire),
realm naming, and the Land panel's hierarchy display. Mods may add to all three maps.

### Adding a realm

```json
{ "realms": [
  { "id": "frisia_free", "name": "Free Frisia", "color": "#88ccee",
    "capital": "groningen", "aggression": 1, "rank": 2, "liege": "east_francia" }
] }
```

- `rank` — 1 count, 2 duke (also petty kings, chiefs, doges), 3 king, 4 emperor.
- `liege` — optional; the realm id this realm answers to. Omit for sovereign realms.
- `religion` — optional religion id for the ruling house and realm identity. It defaults
  to the capital county's population faith. Set it when the ruler's faith differs from
  the capital population; this field does not convert any county.
- Set some provinces' `realm` to its id (re-declare those provinces in the mod — same id
  replaces). `aggression` 0–2 drives the war AI.
- **Counts and dukes inside a realm are generated by the engine** — you only author
  realms above that level. The map colors the *sovereign top* of each liege chain;
  `state.holder` tracks who holds each county directly.
- An optional initial ruler is
  `"ruler":{"name":"Name","sex":"m","culture":"frankish","born":1028,"mar":14,"trait":"ambitious"}`.
  These authored fields are copied verbatim at campaign creation. The culture and trait
  ids must exist; generated vassals, succession children, and later rulers remain seeded.
- **Courts come for free.** A modded realm's ruler, consort, and heirs are generated
  and materialized as full characters through `FB.ensureRealmSuccession`, so an authored
  realm opens on a real face and card with no extra data. Authored rulers keep their
  authored identity and receive a seeded sheet around it; hand-authored skills and
  traits for a bookmark ruler are not a supported field. A mod that writes `realm.ruler`
  directly still works, because `FB.realmRulerCharacter` keeps that stub a projection of
  the character record.
- A `realm.succession` member carries
  `{id, name, sex, born, alive, parentId, childIds, charId, role}`. `role` is `null` for
  a child or collateral and `'consort'` for the ruler's spouse of record. **A consort is
  excluded from the line of succession by that role and never by parent grouping** - a
  consort's `parentId` is legitimately `null`. Code that walks a succession must apply
  the same rule. `role` is absent on saves written before consorts existed and reads as
  `null`.

### Complete start bookmarks

```json
{
  "bookmarks": {
    "my_start": {
      "id": "my_start",
      "name": "My Start",
      "desc": "A complete alternate world.",
      "date": { "year": 1000, "season": 0, "day": 1 },
      "religiousHeads": { "catholic": "my_papacy", "sunni": "my_caliphate" },
      "provinces": [ "...every province object..." ],
      "realms": [ "...every authored realm object..." ],
      "duchies": { "...": { "name": "...", "kingdom": "..." } },
      "kingdoms": { "...": { "name": "...", "empire": "..." } },
      "empires": { "...": { "name": "..." } },
      "straits": [ ["county_a", "county_b"] ],
      "crossingClasses": { "county_a|county_b": "coastal" },
      "scripted": []
    }
  }
}
```

Activation rejects a bookmark with duplicate ids; missing or cyclic lieges; missing
capitals; invalid province realm/de-jure/culture/faith references; development outside
1–10; broken straits; invalid crossing classifications; or invalid scripted targets.
`crossingClasses` is optional and missing entries default to `narrow`.
`religiousHeads` is optional; when
present it maps a faith id or stable `head.officeId` to an authored realm id. The
effective faith must define `properties.head`, and every mapped realm must exist in this
complete bookmark. Omitting the map falls back to each office's effective `head.realm`, which is suitable only when the
same realm id exists in every bookmark. Bookmark ids use letters, digits, and
underscores. Preserve an existing county id when it still denotes the same place; give
genuinely different geography a new stable id, and never recycle a retired id.

A legacy mod that changes `provinces`, `realms`, `empires`, `kingdoms`, `duchies`,
`straits`, `crossingClasses`, `scripted`, `land`, `seas`, or `bounds` without supplying a complete
`bookmarks.1066` definition hides 1066 from the new-game picker and explains why.
Its 867 games still work. Ordinary non-world mods expose both built-in dates, and
matching stamped saves retain access to their recorded bookmark even when it is hidden
from new-game selection. A `rivers`-only mod does not hide 1066 because rivers are
decorative and shared by every bookmark; replacing rivers together with any listed
world-shaping key still follows that key's restriction.

### Scripted history

```json
{ "scripted": [
  { "id": "autumn_conquest", "year": 900, "season": 2, "day": 30,
    "type": "conquest", "realm": "bulgaria", "newRealm": null,
    "targets": ["ras", "bosna"], "news": "Bulgaria overruns Serbia!" }
] }
```

`newRealm` (same shape as a realm, or `null`) spawns a realm at that date before it conquers
`targets` (a list of **county** ids).

`season` is `0` Spring, `1` Summer, `2` Autumn, or `3` Winter; `day` is 1–90.
Omitting both preserves the legacy meaning of Spring day 1 and its old once-only
save/message keys. If either is supplied, `id` is required and must be stable and
unique within the bookmark. Precise entries are checked each day, including Observe
mode, and fire once after their due date even if a life was loaded later.

A legacy top-level mod's scripted entry **replaces** a base (or earlier-mod) entry only
when both its `year` and its `realm` match; otherwise it is added alongside—several
realms may act in the same year. Script arrays inside atomic bookmark replacements are
complete and do not merge.

### Coastlines (advanced)

`land` is a list of polygons (`[lon,lat, lon,lat, ...]` flattened); `seas` are polygons carved
*out* of land (inland seas); `rivers` are decorative polylines; `bounds` sets the world window.
Provide any of these to reshape or replace the whole map — e.g. a fantasy continent.

## Events

```json
{ "events": [ {
  "id": "lucky_cow", "title": "A Lucky Cow",
  "tags": ["livestock"],
  "text": "A fine cow wanders onto your land, ownerless. {lord} has not noticed.",
  "trigger": { "tierMax": 1, "seasons": [1, 2], "chance": 0.2 },
  "weight": 6, "cooldown": 12,
  "options": [
    { "label": "Keep it quietly.", "chance": 0.7,
      "success": { "text": "Milk and calves for years.", "effects": { "gold": 6 } },
      "failure": { "text": "Its owner appears, furious.", "effects": { "prestige": -5 } } },
    { "label": "Give it to the church.", "effects": { "piety": 8 } }
  ] } ] }
```

Event strings stay authored in English. The core localization layer looks them up through a
shadow catalog keyed by event id, field path, and authored option index; it never rewrites
your JSON. Filtering an option does not renumber that key. New or replacement mod prose with
no matching catalog entry displays in its authored English, while exact matches to known core
sources may reuse a core translation. Core v1 does not define separately installed mod
translation packs. Keep every documented `{token}` intact inside translatable strings.

### Trigger conditions (all optional, all must pass)

| key | meaning |
|---|---|
| `tierMin` / `tierMax` | rank 0 serf … 7 emperor |
| `societalRoles` | any of `serf commoner gentry lord crowned`; these map to tiers 0, 1, 2, 3–5, and 6–7 |
| `professions` | any actively practiced vocation from `farmer craftsman merchant administration physician scholar soldier monk priest noble`; landed players (tier 3+) retain their career as biography but do not pass profession gates |
| `minAge` / `maxAge`, `sex` | `"m"`/`"f"` |
| `seasons` | array of 0 spring … 3 winter |
| `yearMin` / `yearMax` | calendar gate |
| `married`, `hasChildren`, `hasYoungChild` | booleans |
| `maxSeasonsSinceMarriage` | requires a recorded marriage no more than this many 90-day seasons ago |
| `goldMin/Max`, `prestigeMin`, `pietyMin`, `leaMin` | resource gates |
| `marriageEndReady` | current primary spouse exists and the effective faith's divorce/annulment costs and cooldown are satisfied |
| `healthMax` | player health at or below (0–10) |
| `flags` / `notFlags` | player flags set by other events |
| `buildings` / `notBuildings` | building ids standing (or not) anywhere in the player's demesne |
| `techs` / `notTechs` | technology ids completed (or not) by the player's effective sovereign nation |
| `holdings` / `notHoldings` | household holding ids owned (or not) by the family |
| `religionGroup` | any faith id in the player's inheritance lineage |
| `religionGroups` | array form: any listed faith or ancestor matches |
| `cultures` | array of culture ids — any matches the player's culture |
| `provinceReligionGroup`, `provinceCultures`, `terrains`, `coastal` | home province checks |
| `atWar`, `realmAtWar`, `liegeAtWar`, `isVassal`, `isLiege` | war/politics (`isLiege`: the player has vassals of their own) |
| `hasRole` / `noRole`, `roleOpinionAbove/Below` | `{role, value}`; roles: `lord priest friend rival spouse suitor` |
| `rivalHeatMin` / `rivalHeatMax` | active rivalry heat at or above/below the number (0–100) |
| `popularOpinionBelow` | effective Common Voice (stored popular opinion plus directly held county modifiers) |
| `hasModifier` | modifier id string, or `{id,pid?}`; county lookup uses explicit `pid`, then the queued event location, then the player's home province |
| `chance` | final random gate 0–1 |
| `custom` | name of a `FB.fns` function; must return true for the event to fire (built-ins: `war_can_siege`, `war_no_enemy_host`, `war_can_hunt`, the live sovereign-campaign-host gate `ghw_has_field_host`, `can_afford_item`, the marriage-station checks `suitor_above_station` / `wed_above_station` / `wed_below_station`, and the royal-council gates `council_has_members` / `council_two_members` / `council_has_schemer` / `council_has_sycophant` / `council_scheme_ripe` / `council_scheme_watched` / `council_charter_due` / `council_has_unseated` / `council_market_charter_due` / `council_muster_due` / `council_domain_pressure_due` / `council_sanctuary_due`, and the estates gates `parliament_has_scutage` / `parliament_redress_possible` / `parliament_aid_can_rise` / `parliament_scutage_possible`, and the finance investability gate `finance_can_invest`) |
| `never` | only fired by other events' `queue` |

Ordinary player-campaign custom gates in `js/world.js` are `war_live_host`,
`war_host_under_pressure`, `war_deserters_due`, `war_can_pay_deserters`,
`war_campaign_deep`, `war_campaign_exhausted`, `war_objective_under_debate`,
`war_has_allied_host`, `war_host_abroad`, `war_enemy_offer_possible`,
`war_active_occupation`, and `war_negotiation_possible`. They inspect the active
ordinary war and, where relevant, its live host; each returns false outside an
ordinary player war.

The same trigger keys may be used in an option's `require` object. Societal role does
not imply political position: combine it with `isVassal` or `isLiege` where that
distinction matters. `roleOpinionAbove/Below` is a compatibility key name; it tests the
named character's player-facing Standing.

`weight` (default 5) sets relative frequency; `once: true` fires once per life; `cooldown` is in
seasons (a season lasts 90 in-game days — the engine converts). Random events land on 1–2
random days per season (one extra in wartime); queued events (`queue`) fire the next day.
Core code queues through `FB.queueEvent`, which snapshots `societalRole`, `profession`,
`formerProfession`, and `locationId` into the JSON-safe event context for exact-value
localization selectors and county targeting. Mods should use the effect-level `queue`
field whenever possible.

Random events may declare `contextSelector` beside `trigger`. The selector must be
registered by engine code as `FB.eventContextOptions(state, id)` and return an array of
JSON-safe contexts without consuming RNG. Eligibility requires at least one result; after
the story is chosen, the engine deterministically picks one result and snapshots it into
the event context. The exact selector result is checked again at the
display/autoresolve boundary, so an earlier pending choice may invalidate the story
without redirecting it. Core selectors are `foreign_policy_improve`,
`foreign_policy_provoke`, `active_pact`, and `active_alliance`, all producing
`{realmId}` plus a validity stamp only when needed. This is an engine extension point, not
a JSON-only way to invent arbitrary selectors.

A code-queued event may declare `contextValidator:"fnName"`. Before display or
autoresolve, the queue calls that `FB.fns` function with `(state, ctx)` and drops the
event when it returns false. The succession stories use
`diplomacy_succession_valid` and a saved `rulerGeneration`, preventing an old embassy from
affecting a later ruler. Custom trigger and option-require functions likewise receive
`(state, ctx)`; existing one-argument functions remain compatible.
Core plot discovery and every plot resolution event use
`plot_event_context_valid`; their queued context carries `plotId`, and the event expires
if the active plot or any target component has changed. For save compatibility, a legacy
queued resolution without `plotId` may infer it only when its event id exactly matches
the current active plot definition.
Predetermined player-motion results use
`parliament_motion_context_valid`; the exact polity, pending-motion id, motion id, and
pass/fail result must still match. The paired option gates are
`parliament_motion_passed` and `parliament_motion_failed`.

`wartime: true` (top-level, next to `weight`) marks an event as fit for a war footing. While
the player is **personally at war** — fighting their own war, soldiering in a realm at war,
or riding with the liege's host — random picks draw *only* from wartime events; ordinary
life waits for peace. Queued events always fire regardless.

`warStatus: true` adds the current localized host, enemy, siege, and advance summary as a
separate paragraph below the event text. Use this instead of embedding a `{warstate}` token:
the summary has its own grammar and may contain several clauses.

`tags: ["famine", "unrest"]` is an optional top-level array. Active modifiers in the
event's snapshotted county (and compatible estate-trait bonuses) sum each named tag.
`max(0, 1 + summedBonus)` scales only negative numeric gold, prestige, piety, health,
war-service, research, popular-opinion, liege/role-opinion, and skill effects. Positive
rewards, chance formulas, custom handlers, flags, and metadata are unchanged.

`childhood: true` works the same way for minor heirs: while the player is **under 16**,
random picks draw only from childhood events. Give child-only events a `maxAge: 15` trigger
too, so they stop at adulthood; age-neutral events (sickness, plague, omens) carry the tag
alongside their normal triggers and serve both pools.

### Option fields

`label`, optional `desc` (a short hint shown beneath the label in the event dialog —
every option should carry one: vague flavor pointing at the thrust of the choice,
normally not exact numbers; confirmations and contract offers such as a monopoly petition
should disclose their exact costs, odds, and penalties), optional `require` (same syntax
as triggers — hides the option),
optional `chance` (0–1, or a named formula: `harvest battle proposal rival_peace house_claim annulment
skill_dip skill_ste skill_int skill_lea rights_dip rights_ste rights_int rights_lea swarm
liege_grant war_battle plot plot_discovery fabricate_claim appeal_outcome
vassal_comply county_petition parliament_vote parliament_redress_vote travel_trade`) with
`success` / `failure`
branches (`{text, effects}`), and `effects`.
The four `skill_*` formulas start at 30%, add 4% per effective point in that skill,
and clamp to 10–90%; `skill_ste` also benefits from Fine Tools or a Workshop, while
`skill_lea` benefits from Letters in the Family and the monk/priest professions.
`travel_trade` bargain starts at 28%, adds 4.5% per Stewardship point, and clamps
to 10–92%.
The four `rights_*` formulas are the matching checks for the Old Custom chain: evidence
adds a large bonus, with lord opinion helping Diplomacy, working professions helping
Stewardship, and letters or a religious profession helping Learning. `swarm` is a
Stewardship check helped by a Hearth Garden or Orchard.
`war_battle` counts real men: the fielded host's men if one is raised (the levy plus 150
per mercenary company otherwise), worn by the host's condition (`war.strength`), against
the enemy realm's fielded host (its per-development muster otherwise) — a side still
re-forming a shattered host counts only a fraction of that muster (`FB.rearmScale`: the
share of `armyRearmDays` elapsed, floored at 0.15) — with the bonuses
banked by war-council effects, walls, tech, items, and blessings on top.
`appeal_outcome` weighs an appeal above the player's liege (diplomacy, intrigue, and the
target lord's opinion); `vassal_comply` weighs whether a vassal yields his fief peacefully.
`county_petition` weighs the liege's favor toward the player, prestige, and war service
against the target holder's own standing at court (`player.petitionPid` set by the picker).
The final `liege_grant` and `county_petition` chances are multiplied by
`balance.liegeGrantRepeatMult` once for every successful feudal grant the current
character has already received.

`rival_peace` weighs Diplomacy and the rival's opinion against current rivalry heat, with
small adjustments for a kind or proud player, and clamps to 10–90%.

`proposal` weighs the suitor's regard, the player's prestige and tier — and **station**:
every character carries a social rank 0–4 (lowborn · freeholder · gentry · noble · royalty,
`FB.stationOf`; the player's is their tier, capped at 4). Each step the suitor stands above
the player costs `balance.proposalStationPenalty` of the chance; marrying down is easier.
Courting someone 3+ steps up is refused outright (`FB.canCourt`), matchmade suitors come
from within a step of the player's own station, and the wedding settles a dowry
(`balance.dowryByStation`, indexed by the spouse's station) plus a prestige swing
(`balance.marryUpPrestige` / `marryDownPrestigeLoss` per step).

`sibling_proposal` is the exceptional player-only counterpart: it uses the
active accepted sibling pair, +80 Standing gate, target courtship-trait
modifiers, dynastic relevance, and current faith route, then caps at 60%.
`sibling_exposure_denial` weighs the protagonist's Intrigue and deceitful or
honest courtship effects, with a small contribution from the active sibling.

Marrying up also pays out at the end: when a spouse of higher station dies, `FB.spouseDied`
queues `widow_settlement` (no living child of that blood) or `house_claim` (there is one —
pressing it uses the `house_claim` named chance; success can raise a tier-0/1 widow(er) of
a noble into the gentry). Their payouts scale off `dowryByStation` via the custom effect
fns `dower_take dower_take_full claim_won claim_lost claim_sold` (js/events.js), and their
texts use the `{late}` token (the dead spouse's name, carried in the event ctx).

Faith sets the rest of the rules (`FB.marriageDoctrine` in js/model.js).
`properties.marriage.spouseLimit` controls spouse capacity;
`properties.marriage.divorce` controls direct or petitioned separation, cost, and
cooldown; and `acceptedRelations` filters cross-faith matches through the directional
faith graph. Optional `properties.marriage.kinship.siblingRite:'xwedodah'` recognizes
the exceptional player sibling-marriage route when both characters share the exact
faith; other values currently have no core consumer. `balance.wivesByGroup` remains
only a fallback for legacy definitions with
no marriage property. Every eligible spouse pairing can bear children, the first is the
one `{spouse}` and the spouse-role address, and the next in line is promoted when the
first dies or is set aside
(`FB.spousesOf` / `FB.canWed` / `FB.promoteSpouse`). The married may also weave the
`widow_veil` plot (map_data.js) to be rid of a spouse the darker way — its resolution is
`plot_spouse_end`.

### Effects

`gold prestige piety health warService` (numbers — `gold` also accepts the special
`"harvest_good"` value: seeded 4–8 plus one per three effective Stewardship, +6 for
risky crops, +2 for an ox, then up to five farm plots add 12% each; `warService` is the
lifetime tally of service in the liege's wars and feeds any core trait progress attached
to that service) ·
`skills: {dip|mar|ste|int|lea: n}` (positive gains
go through `FB.gainSkill`, so the soft cap applies — see balance below) ·
`addTrait / addTraitOnce / removeTrait` (`addTraitOnce` is the explicit idempotent spelling;
trait grants already do nothing when the character has that trait) ·
`traitProgress: {id, amount?}` (default amount 1; progress is
clamped at the trait's `earn.threshold`, then the trait is awarded) ·
`marriageEnd:"success|failure"` (deduct the queued/effective faith-doctrine
gold, piety, and prestige for an annulment outcome; failure may use
`marriage.divorce.failurePiety`) ·
`ailment: "id"` (a named wound/sickness from `FBDATA.ailments`) ·
`setFlag / clearFlag` (+`setFlag2`/`clearFlag2` for a second one) ·
`clearHarvestFlags: true` (clears `crop_safe`, `crop_risky`, `crop_ruined`, and the
spent `blessed_crops` blessing) ·
`opinion: {role, amt}` · `opinionLiege`, `popularOpinion` ·
(`opinion` and `opinionLiege` retain their compatibility names but adjust personal or
realm Standing; `popularOpinion` remains the distinct Common Voice population score) ·
`standingRealm: n` (adjust Standing with the exact living realm in
`ctx.realmId`, with legacy `ctx.rid` accepted; no pairwise AI opinion is created) ·
`papalOpinion: n` (adjust the recognized Pope's opinion of `ctx.candidateId`, or of the
protagonist when the context has no candidate; clamped to −100…100 and a no-op during a
vacancy) ·
`rivalContact: {role, score, cause}` (record an explicitly hostile encounter with that
existing named role; `score` defaults to 1, `cause` is an opaque non-localized id, and
contact with the active rival also adds `score × balance.rivalContactHeat` heat) ·
`rivalHeat: n` (adjust the active feud, clamped 0–100) · `endRivalry: true` (clear the
rival seat, its plot/escalation state, and begin the peace cooldown) ·
`tierSet` (raise rank), `tierUp`
(liege grants land from his own hand — a baron is invested as count of his home county;
a count-or-higher vassal receives an adjacent county the liege holds directly, never the
liege's seat or his last county, and stays inside the realm; a resulting duchy majority
raises him to duke only when his living liege is a king or greater) · `profession`,
`restoreProfession` · `queue: "event_id"` (chain events) ·
`marry` (`true` settles the current suitor's saved formal courtship transfer;
`"informal"` uses the same wedding and family-link mechanics without a dowry),
`clearSuitor`, `focusSet: "<focus id>"` · `adoptChild`, `killChild`,
`killRole` (optionally accompanied by `kinslayer:true`; this grants Kinslayer only when
the killed role is the protagonist's spouse or blood relative), `educateChild` · `moveRandom` ·
`convertToProvince` ·
`foundFaith:{definition:{...},convertFounder?,convertHousehold?,convertRealm?}` (validate
and save a new faith definition, defaulting an omitted `group` or `"$current"` group to
the protagonist's current faith; the founder converts unless explicitly false, optional
household and player-realm conversion use the same id, and successful creation exposes
that id as `ctx.faithId`; a founded branch does not inherit its parent's religious head
unless the definition explicitly includes `properties.head`) ·
`faithRelation:{observer?,target,status,reciprocal?}` (save a directional relation;
`observer` defaults to `"$current"`, either id may use `"$founded"`, and reciprocal is
either `true` for the same reverse status or an explicit reverse status) ·
`declareIndependence` · `devUp` ·
`pickHeir: true` (opens the eligible-heir picker; automation names the first heir in line;
either result grants 8 prestige and records the choice) · `research: n` (points added to
the effective sovereign nation's shared research pool; divided among active projects or
banked as reserve) ·
`travelReturn: true` (begin the saved route home once the minimum stay is complete) ·
`travelSettle: true` (move the household to an eligible completed destination without
converting culture/faith; limited to one permanent move per character life) ·
  `holding: "id"` / `loseHolding: "id"` (grant or take household property) ·
  `addModifier: {"id":"modifier_id","pid":"optional_county_id"}` (or a bare id string;
  county targeting falls back to the queued `locationId` and then the player's home,
  while campaign modifiers target the matching active great holy war) ·
  `removeModifier: {"id":"modifier_id","pid":"optional_county_id"}` (or a bare id string;
  uses the same county/campaign targeting and emits a durable end notice when a live
  record is removed) ·
  `giveItem: "id"` (grant one definition from `FBDATA.items`; repeatable definitions create
a fresh exact instance, while random finds use `custom: "loot_item"`) ·
`deathProvenance: {kind:"battle|event", province:"context", enemy:"war|liegeWar|realmWar"}`
(optional semantic origin for a lethal effect; ids are materialized only if the resolved
effect leaves the player at zero health) ·
`pricePressure: n` with optional `pricePressureYears: n` and
`pricePressureSource: "stable_id"` (a saved annual price-index shock; positive raises
pressure, negative lowers it) ·
`log: "chronicle text"` ·
`worldNews` · `custom: "fnName"` (calls a function registered on `FB.fns` — the war-council
handlers `war_win war_loss war_harry war_hold war_siege war_mercs war_mass war_raise
war_hunt war_supply war_thin war_terms war_accept_tribute war_press_on` (and the `war_can_siege` / `war_no_enemy_host` /
`war_can_hunt` triggers) live in `js/world.js`; the
great-holy-war field handlers `ghw_recruit_volunteers ghw_recruit_mercenaries
ghw_recruit_knights ghw_recruit_adventurers` (and the `ghw_has_field_host` trigger)
live in `js/holywar.js`; they add only to the current live host, increasing its unit
class, `men`, and reinforcement ceiling `size`, so nothing survives dispersal or a later
remuster; the
liege-chain and vassalage handlers `appeal_win appeal_lose vassal_release vassal_crush
vassal_reclaim vassal_refuse vassal_favor vassal_snub vassal_insist county_petition_grant
record_liege_grant` and the
disguise-at-war story fns `polly_court` (spawns the followed soldier into the `{suitor}` role) /
`polly_rout` (the small mortal-wound roll on a lost shield-wall) live in `js/events.js`;
the Noble Academy handlers `academy_introduction academy_student_focus
academy_student_dip academy_student_ste academy_student_int academy_student_lea
academy_withdraw` target the queued `ctx.studentId` and also live in `js/events.js`;
the episcopal-simony handlers `bishop_simony_accept bishop_simony_clear` target the queued
`ctx.candidateId` and also live in `js/events.js`;
the downfall handlers `df_fall df_fall_flee` (lose every title and acre, back to landless
gentry — the second flees abroad) live in `js/world.js`; the descent handlers
(docs/designs/descent.md) `hc_defy` (restart the title-lapse window),
`war_submit war_submission_tribute` (the loser's homage; the
`war_submission_valid` validator and the `war_submission_tribute_affordable` require),
`attainder_pay attainder_yield attainder_resist` (felony outcomes; the
`attainder_risk` trigger and `attainder_can_pay` require), and
`prison_pay prison_cede_land` (ransom; the `prison_still` validator and
`prison_can_pay prison_can_cede` requires) also live in `js/world.js`; the
distraint handlers `distraint_settle distraint_yield_one distraint_seize
bondage_submit bondage_flee` (and the `finance_in_default` trigger/validator and the
`distraint_can_settle distraint_can_yield` requires) live in `js/economy.js`; the
devastation handlers `devastation_lose_holding devastation_commend` live in
`js/world.js`; the finance trade-investment
handlers `finance_trade_20 finance_trade_50` (commit merchant coin to a four-season trade
partnership at the given base stake) and guild-monopoly petition handlers
`guild_monopoly_paid guild_monopoly_persuade_success
guild_monopoly_persuade_failure` live in `js/economy.js`; targeted-plot handlers
`fabricate_claim_success fabricate_claim_failure plot_discovery_success
plot_discovery_failure plot_discovery_abandon plot_discovery_contain` and the
diplomatic pact/alliance handlers live in `js/actions.js`; obligation handlers live in
`js/parliament.js`, monopoly handlers in `js/economy.js`, and Council counter-scheme
handlers in `js/council.js`; mods may register their own before use).

The ordinary campaign-writing handlers also live in `js/world.js`.
`war_discipline` and `war_disorder` change only abstract campaign condition;
`war_discipline_deserters` and `war_pay_deserters` do the same and stamp the current
war's desertion interval. `war_desert` removes a seeded percentage from the live host,
`war_allied_withdrawal` removes the active allied contribution and lowers condition,
and `war_negotiated_withdrawal` ends the ordinary war. Live losses use the shared fixed
class allocation and these handlers record whether they changed abstract strength,
live troops, or both for the campaign-feedback UI.

Wounds and sicknesses get named even without an explicit `ailment` key: any `health`
loss of 2 or more adds a random wound from `FBDATA.ailments` (in `data/traits.js`;
severity 2 at −4 or worse), `setFlag:'ill'` adds a random sickness, and
`clearFlag:'ill'` casts all sicknesses off. Wounds heal as strength returns — one per
year once the character is hale again (health 7+). An ailment entry carries
`name icon kind desc`, where `kind` is `'wound'` or `'sickness'`; wounds also carry
`sev` (1 minor / 2 severe) and may carry `mark` (`'cut'`, `'bruise'`, or `'bandage'` —
the cue the portrait draws; sicknesses show as a pale, haggard face instead). The mod
key is `ailments`.

### Text tokens

`{name} {dyn} {title} {spouse} {suitor} {partner} {late} {lord} {priest} {friend} {rival} {childname} {student} {ambition}
{province} {location} {destination} {realm} {enemy} {settlement} {god} {holy} {temple} {year}` work in titles,
texts, labels, and `log`. `{enemy}` is the realm the player is at war with (or "the
enemy"); `{target}` is the province an attacking war aims at; `{settlement}` reads
`ctx.settlement` (set by the go-into-town deed's queue); `{item}` and `{itemprice}`
describe the currently offered item (`player.itemOffer`); `{liege}` is the player's direct
liege realm; `{rname}` / `{rulername}` are the realm and ruler named by
`ctx.realmId` (legacy `ctx.rid` remains accepted); `{cname}` is the county named by
`ctx.provinceId` (legacy `ctx.pid` remains accepted).
`{location}` is the traveler’s current county (or `ctx.locationId`) and
`{destination}` is the journey destination (or `ctx.destinationId`).
`{student}` is the exact character named by queued-event `ctx.studentId`; mentioning it
also gives that student a character card in the event modal. Annual schooling queues also
provide `ctx.studentFocus` and `ctx.schoolId` for custom effects.
`{partner}` is the exact character named by queued-event `ctx.partnerId`; it also adds that
character's card to the event modal. `{ambition}` renders the managed family ambition of
`ctx.studentId` when the ruler-agency system is available.
During an active ordinary player war, `{hostMen}` is the current live host headcount,
`{warLosses}` is the campaign ledger's cumulative live-host loss total, `{alliedMen}` is
the current allied contribution, and `{deserterMinPercent}` / `{deserterMaxPercent}` are
the configured desertion bounds. `{money:deserterPay}` renders the current arrears cost,
derived from authoritative seasonal host logistics and the configured payment floor.
`{god}`/`{holy}`/`{temple}` adapt to the player's faith (God/priest/church,
Allah/imam/mosque, the gods/godi/shrine…) — prefer them over hard-coded religious words so
events read correctly for every culture.

Use `{money:parameter}` wherever a numeric context value is money, for example
`"The price is {money:itemprice}."`. Declarative text may use a numeric literal,
such as `"Pay and pass. ({money:2})"`. The renderer formats the fragment using the
active currency; do not write a symbol or the word "gold" beside it. Translations
must preserve the complete typed token exactly.

### Tailoring events to faith and culture

Events must read correctly for whoever receives them — no ale, pork, or church bells for a
Muslim player. Three tools, from lightest to heaviest:

1. **Tokens** — `{god}`/`{holy}`/`{temple}` for generic religious words (see above).
2. **Variant text** — any text field (`text`, `title`, `label`, `desc`, success/failure
   `text`, `log`) may be an object keyed by faith id or ancestor id instead of a plain
   string:

   ```json
   "text": { "default": "…a pig, a bolt of cloth…",
             "muslim":  "…a lamb, a bolt of cloth…" }
   ```

   The engine checks the player's exact faith first, then each ancestor in order;
   `default` covers everyone else and is required.
3. **Gated options / paired events** — an option that only suits some faiths gets a
   `require` with `religionGroups` (add a counterpart option for the others, so no faith
   sees fewer choices — see `village_festival`, `court_feast`). A whole event that only
   suits some faiths gets a gated `trigger` plus a counterpart event (see `sermon` vs
   `friday_khutba`, `hunt_with_lord` vs `hawk_with_emir`). The `cultures` /
   `provinceCultures` triggers work the same way for culture- or region-specific events.

An event may also set `"charCard": "suitor"` (or any role name) to display that character's
card inside the event popup — portrait, house arms, home county and allegiance, age, faith,
skills, and traits — used by the matchmaking events. A card also appears automatically for
every `{lord}` / `{priest}` / `{friend}` / `{rival}` / `{spouse}` / `{suitor}` token used in
the event's title, text, option labels, or branch texts, so a named character never arrives
as a bare name.
An event using `{rname}` or `{rulername}` with `ctx.realmId` similarly receives a realm
identity card with arms, ruler, rank, Standing, and the current pact/alliance/direction.

An event with `"nameChild": true` (used by `child_born_flavor`, queued with `ctx.childId`)
shows a name field above its options, prefilled with the child's generated name and a dice
button that rerolls from the child's culture. Whichever option is chosen applies the edited
name (an empty field keeps the old one); an autoresolved event keeps the generated name.

## Political blocs and Estates motions

`FBDATA.politicalBlocs` lives in `data/political_blocs.js`. A runtime mod may
replace a complete archetype definition by the same top-level
`politicalBlocs` id:

```json
{
  "politicalBlocs": {
    "mercantile": {
      "name": "Commercial Interest",
      "icon": "⚖",
      "desc": "Guild, charter, enterprise, and trade interests acting together.",
      "order": 1,
      "affiliationThreshold": 30,
      "motions": { "redress": 25, "scutage": 30 }
    }
  }
}
```

`name` and `desc` are structured display fields; `icon` and `order` control
presentation. `affiliationThreshold` is the minimum interest score for a new
ordinary affiliation. `motions.redress` and `motions.scutage` are the
archetype's reason-coded starting scores. Core assignment recognizes the
`crown`, `mercantile`, `magnate`, and `independent` archetypes. Later mods may
replace those definitions, but an additional id is not assigned automatically
without engine code that uses it. Definitions are replaced atomically rather
than deep-merged.

The direct political court is deliberately player-bounded. It contains the
relevant ruler house, its living landed direct-vassal houses, and the player
house when sworn there. House influence is:

`1 + rank×2 + directly held counties + floor(other territory/2) + Council office`.

Use the public projections rather than rebuilding this rule:

- `FB.politicalCourt(state)` returns the locale-neutral court and house facts.
- `FB.politicalSummary(state)` returns aggregated blocs, leaders, members,
  interests, influence, strict-majority threshold, a `forecasts` map keyed by
  policy id for every catalog policy that applies, and an optional
  pending-motion forecast.
- `FB.politicalMotionForecast(state,policyId)` returns bloc scores, reason
  ids, locked/pledged/undecided postures, natural support chances, and
  influence totals for any id in the policy catalog.

Those three functions are read-only and RNG-neutral. Do not call the mutating
repair functions from rendering code. `FB.ensurePolitics` and
`FB.repairPolitics` create or validate the additive saved allegiance/campaign
state at simulation, load, title, and liege boundaries.

Player motions use these mutating interfaces:

- `FB.parliamentBeginMotion(state,motionId)` (also exposed through the legacy
  `FB.parliamentMove` alias) spends the configured cost and opens the 90-day
  campaign.
- `FB.parliamentLobbyMotion(state,blocId)` consumes the one lobbying attempt;
  `FB.parliamentLobbyStatus` supplies its exact visible gate and chance.
- `FB.parliamentCallVote(state)` resolves each undecided bloc once in stable
  id order and queues the predetermined core event.
- `FB.parliamentWithdrawMotion(state)` clears an untallied campaign without
  refunding its cost or yearly use.

Do not write `state.politics` directly. It stores stable allegiances, semantic
pledges/lobby/result state, ids, and turn stamps; influence, probability,
localized prose, and rendered reasons are always derived. The existing
`parliament_vote` and `parliament_redress_vote` named chances remain supported
for non-motion Estates stories and older mods. Every catalog policy vote uses
the bloc tally; there is no separate global success roll.

## Policy catalog (Estates laws and reforms)

`FBDATA.policies` lives in `data/policies.js`. Each entry is one law or reform
a sworn lord (tiers 3–5) can campaign for before the liege's Estates. A runtime
mod may replace a complete definition by the same top-level `policies` id;
definitions are replaced atomically rather than deep-merged:

```json
{
  "policies": {
    "market_charter": {
      "name": "Market Charter",
      "icon": "⚖",
      "desc": "If carried, your home county gains a chartered market.",
      "family": "commerce",
      "institution": "estates",
      "proposer": "vassal",
      "minTier": 3,
      "maxTier": 5,
      "states": "one-shot",
      "cooldown": "year",
      "repeal": "none",
      "emergency": false,
      "order": 4,
      "gate": "parliament_gate_market_charter",
      "posture": { "traits": { "greedy": 6, "generous": -4 } }
    }
  }
}
```

Fields:

- `name` and `desc` are structured display fields (localized like bloc names);
  `icon` and `order` control presentation.
- `family` groups policies for the cooldown: after a campaign begins, the
  Estates hear no second matter of that family until the next calendar year.
  The spent years are saved on the liege realm as `obl.motionYears`.
- `institution`, `proposer`, `minTier`, and `maxTier` declare the eligible
  proposer, electorate, and rank. The first catalog is `estates`-only.
- `states` describes the target term: `level` (an ordered aid rate), `on` (a
  durable law such as scutage or consent of the estates), or `one-shot` (a
  timed grant). `repeal` documents how the term can be undone — `none` in the
  first catalog. `emergency: true` waives the family cooldown (its gate still
  applies; the core emergency subsidy requires a liege at war).
- `cost` overrides `balance.parliamentMotionCost` for the proposal.
- `gate` names an `FB.fns` fn that returns `true` when the policy may be
  proposed, or a localized reason string shown wherever the proposal is
  disabled. Home-county gates use `state.player.provinceId`.
- `posture` tunes bloc scoring beyond the archetype's `politicalBlocs.motions`
  base weight: `aidSlope` multiplies the current aid's deviation from custom,
  `traits` maps member-ruler trait ids to score adjustments, and
  `martialSlope` scales average member Martial (clamped ±12).
- `resultEvent` names the queued result event; it defaults to
  `parliament_<policyId>`. The event follows the predetermined-result pattern:
  `contextValidator:'parliament_motion_context_valid'` with pass/fail options
  gated by `require:{custom:'parliament_motion_passed'}` /
  `'parliament_motion_failed'}` and no `chance`, so visible and autoresolved
  outcomes are identical. Outcome effects (gold, Standing, prestige, county
  modifiers, term changes) live in that event, not in the policy def.
- `redressEvidence: true` feeds Bend the Feudal Obligation evidence into the
  player's lobbying strength for that policy (redress only).

`FB.policyList()` returns the ordered catalog for pickers;
`FB.policyDef(id)` resolves one def (falling back to the two original motions
when catalog data is absent); `FB.parliamentMotionStatus(state, policyId)` is
the shared read-only gate used by Governance, Network, and the Estates sheet.
The durable law `obl.revocationConsent` (consent of the estates) removes the
liege's unilateral aid demand from the yearly session agenda. Forecasts and
postures are always derived; only terms, cooldown years, consent, and the
pending campaign are saved.

## Elections, privileges, and collective demands

`FBDATA.elections`, `FBDATA.privileges`, and `FBDATA.collectiveDemands` live in
`data/political_institutions.js`. Runtime mods replace complete same-id definitions under
the top-level `elections`, `privileges`, and `collectiveDemands` tables; nested arrays and
objects are not deep-merged.

An election declares its office, fixed term, gates, weighted constituencies, visible
rivals, and one-choice campaign tactics:

```json
{
  "elections": {
    "guild_officer": {
      "name": "Guild Officer Election",
      "icon": "🏅",
      "desc": "The masters choose an officer for a fixed term.",
      "kind": "guild",
      "office": "officer",
      "order": 0,
      "termDays": 1440,
      "campaignDays": 90,
      "nominationCost": 25,
      "defeatCooldownDays": 720,
      "requiredRank": "master",
      "stewardship": 10,
      "prestige": 60,
      "guildStanding": 45,
      "merchantLearning": 6,
      "electorates": [
        { "id": "masters", "name": "Masters' bench", "weight": 3,
          "base": 0.42, "standingRate": 0.004,
          "stewardshipRate": 0.025 }
      ],
      "rivals": [{ "id": "senior_master", "name": "The senior master" }],
      "tactics": {
        "canvass": { "name": "Canvass", "icon": "🗣", "desc": "...",
          "gold": 0, "guildStanding": 0, "authority": 0,
          "support": { "masters": 0.10 } }
      }
    }
  }
}
```

Core recognizes `kind:"guild"` for the `officer` and `guildmaster` career transitions,
and `kind:"council"` for the `treasurer` and `constable` confirmation ids. Electorate
`id` values must be unique within the definition; tactic `support` keys refer to those
ids. `base` and the optional standing, Stewardship, Diplomacy, Martial, prestige, and rank
rates build a clamped support chance. Council tactics may spend Crown Authority; guild
tactics may spend Guild Standing. On guild elections, `merchantLearning` adds both the
listed Learning minimum and the core Lettered requirement for Trade candidates; it does
not affect Craft candidates. Adding another kind or office requires matching engine code
even though replacing the four core definitions is data-only.

A privilege is a legal wrapper around one authoritative effect ledger:

```json
{
  "privileges": {
    "market_charter": {
      "name": "Market Charter",
      "icon": "⚖",
      "desc": "Measured tolls and protected stalls.",
      "order": 1,
      "holderTypes": ["county"],
      "scopeTypes": ["county"],
      "rights": ["Protected market and measured tolls."],
      "exemptions": [],
      "obligations": ["Pay recorded upkeep."],
      "duration": "modifier",
      "revocation": "protected_term",
      "effect": { "kind": "modifier", "id": "market_charter" },
      "sourceEvents": ["optional_event_id"]
    }
  }
}
```

Supported effect kinds are `modifier` (an existing county modifier id),
`guild_monopoly` (the existing incoming/outgoing contract ledger), `obligation`
(`revocationConsent`), and `council_confirmation` (with a `seats` array). The effect
remains the sole mechanical calculation. The privilege record supplies stable holder,
grantor, scope, source, duration, and revocation provenance for saves and UI.
`sourceEvents` disambiguates two privileges that wrap the same modifier, as Sanctuary and
ordinary Levy Exemption do. Keep holder/scope values within `holderTypes` and
`scopeTypes`: `house`, `guild`, `county`, `faith`, and `institution` are the core holder
categories; `county` and `realm` are the core territorial scopes.

A collective demand points at one privilege and one engine-registered pressure gate:

```json
{
  "collectiveDemands": {
    "commons_custom": {
      "name": "Petition of the Commons",
      "constituency": "commons",
      "privilege": "confirmed_custom",
      "order": 0,
      "minTier": 3,
      "maxTier": 7,
      "gate": "collective_demand_commons",
      "cooldownYears": 3
    }
  }
}
```

The `gate` names an `FB.fns` function returning `false` or a semantic
`{pressure,scopeId,reasons}` record. A pasted JSON mod can replace a core demand or point
to an already registered gate; a genuinely new gate requires a bundled mod that registers
the function. The annual driver queues at most the highest-pressure eligible demand.
Refusal creates bounded opposition and never creates a realm directly. Election campaigns,
terms, privilege records, and demands save definition ids, so changing these tables changes
the active mod fingerprint and intentionally prevents loading the life under a different set.

## Temporary modifiers

Runtime mods may add or replace complete records under the top-level `modifiers` key:

```json
{
  "modifiers": {
    "market_charter": {
      "name": "Market Charter",
      "icon": "📜",
      "desc": "A temporary grant encourages tolls and construction.",
      "scope": "county",
      "days": 720,
      "upkeep": { "gold": 1 },
      "fx": { "tax": 0.10, "buildingCost": -0.10, "unrest": -0.15 }
    }
  }
}
```

`name`, `icon`, `desc`, `scope`, and `fx` are required by convention. `scope` is
`"county"` or `"campaign"`. `days` is an optional positive day duration; omitting it
creates a record with no fixed turn expiry. `upkeep.gold` is an optional seasonal charge
and is paid only while the affected county is directly held. A later mod replaces a
same-id definition as one atomic record.

Supported county `fx` keys are fractional `tax`, `levy`, and `buildingCost`; flat
`commonVoice`; and fractional event-tag keys such as `famine` and `unrest`. Supported
campaign keys are fractional `supplyUse`, `contribution`, `withdrawalPenalty`,
`marchSpeed`, `battleOdds`, and seasonal `desertion`. Campaign values affect only the
protagonist's valid participation in the active great holy war—never AI parties or an
ordinary-war modifier array.

County instances are saved as
`state.modifiers.county[provinceId] =
[{"id":"...","endTurn":123,"sourceEventId":"event_id"}]`; campaign instances use
`state.greatHolyWar.modifiers`. `sourceEventId` is optional and locale-neutral. The
event interpreter supplies it automatically for `addModifier`; direct system calls may
pass `{sourceEventId:"event_id"}` as the fourth `FB.addModifier` argument. Never save a
rendered source title. Do not write these arrays directly. Use:

- `FB.addModifier(state,id,pid?,options?)`,
  `FB.removeModifier(state,id,pid?,options?)`, and
  `FB.hasModifier(state,id,pid?)`
- `FB.countyModifierRecords(state,pid)` / `FB.campaignModifierRecords(state)`;
  read-only overview code may use `FB.countyModifierSnapshot(state,pid)`
- `FB.modBonus(state,key,pid)` / `FB.campaignModBonus(state,key)`
- `FB.modifierUpkeep(state,key?)`, `FB.modifierRemainingDays(state,record)`, and
  `FB.popEffective(state)`

Re-adding an id refreshes its catalog duration and semantic source without stacking.
County records remain with the county when ownership changes. Unknown saved ids and
malformed records are removed by additive save repair. Core definitions and the full
lifecycle are documented in `docs/designs/modifiers.md`.

Core ordinary-war content includes `conquered_without_right`, a timed county modifier
granted when the player captures the objective of a saved `aggression` cause. Mods may
replace its complete definition like any other modifier, but should preserve county
scope because capture passes the conquered province id and the declaration preview reads
its duration and effects directly.

## Buildings

`FBDATA.buildings` (in `data/map_data.js`) defines what tier-3+ rulers can raise in any
province they hold with the "Raise a building…" deed — one of each per **settlement** of
a province:

```json
{ "buildings": { "bathhouse": {
  "name": "Bathhouse", "icon": "🛁", "cost": 50, "devMin": 3,
  "tax": 1, "desc": "Cleanliness, gossip, and a modest fee." } } }
```

- `cost` — gold (the Master Builder event discounts the next building by a quarter).
  Each further copy of the same building in the same county costs
  `cost × balance.buildingRepeatCostGrowth^(copies ever raised)`. Demolished ruins remain
  in that count, so demolition does not reset the price.
- Siting: `devMin` (province development), `coastal: true`, `terrains: [...]`,
  `homeOnly: true`, `maxCounty`, and `maxDemesne`. The last two limit standing copies;
  a ruin still occupies its settlement slot but no longer consumes the standing limit.
- Ongoing: `tax`, `piety`, `research`, and `upkeep` per season; `levy` men added to the
  muster. Upkeep is gold and is charged only while the building stands in the player's
  directly held demesne.
- War keys: `retinue` (professional men-at-arms) and `archers` — flat men mustered with
  the host as those classes, fighting at their own quality (see `balance.quality*` and
  docs/designs/war.md).
- One-time on completion: `dev`, `pop` (popular opinion), `prestige`.
- `name`/`desc` accept text tokens and religion-variant objects (see the Great {temple}).
- The `walls` id is special: the engine reads it for a defense bonus in the `war_battle`
  chance — only when walls stand in the home county (`FB.hasBuildingIn`).

Built buildings live in `state.buildings` keyed by **province id**, each entry shaped
`{ s: settlementIndex, id, ruined? }` — conquest takes them with the land, and they pass to heirs
with it. (Saves old enough to hold bare id strings are migrated in place by `FB.builtIn`
into the head settlement, `s: 0`.) `ruined:true` is created by permanent demolition: the
entry keeps occupying its slot and counting toward repeat prices, but supplies no benefit,
upkeep, or event requirement. Events can gate options or triggers on standing buildings
via `buildings` / `notBuildings` (the famine event's granary option, for example) — those
read demesne-wide through `FB.hasBuilding`.

## Household holdings

`FBDATA.holdings` (in `data/map_data.js`) is the commoner's way of playing tall: family
property (tiers 0–2) bought with gold via the "Better the household…" deed. Owned ids live
in `player.holdings` and **persist across generations** — property passes to heirs:

```json
{ "holdings": { "fishing_boat": {
  "name": "Fishing Boat", "icon": "🛶", "cost": 40, "tierMax": 2, "professions": ["farmer"],
  "desc": "The sea pays no rent.", "fx": { "gold": 1.5 } } } }
```

- `cost` gold · gates: `tierMin`/`tierMax`, `professions`, `req` (prerequisite holding id).
- `eventOnly: true` hides a holding from the Better the household picker; it can still
  be granted by an event's `holding` effect (the inherited Rights of Common use this).
- `fx` keys, summed by `FB.holdingBonus`: `gold`/`prestige`/`piety` per season, `battle`
  (added to the `battle` and `war_battle` chances), `edu` (children learn faster),
  `health` (lower yearly mortality).
- `name`/`desc` accept text tokens and religion-variant objects.
- Events can gate on `holdings`/`notHoldings` and grant or seize property with the
  `holding`/`loseHolding` effects (see `lord_covets_horse`).
- Purchased holdings with a positive `cost` may be offered as loan collateral. Set
  `pledge: false` when authored events can transfer the asset or its story requires it to
  remain freely disposable; `eventOnly` holdings are never pledgeable.

Freehold land is repeatable saved property rather than an authored holding definition.
Each `player.landPlots` entry is `{provinceId, settlement}`. Its economy is tuned through
`balance.landPlotCost`, `landPlotYield`, `landConsolidationBonus`, and
`landPlotMaxSettlement`; `manorPlotRequirement` plots in one settlement plus
`manorPrestige` standing allow the household to declare that holding a manor. Land income
is inherited and appears in the seasonal ledger, but plots are not generic loan
collateral.

## Maintained household standards

`FBDATA.householdStandards` (in `data/economy.js`, mod key
`householdStandards`) defines optional commoner living standards and profession
outfits. A same-id mod entry replaces the complete definition, including its ordered
level array:

```json
{
  "householdStandards": {
    "warm_hearth": {
      "name": "Hearth",
      "icon": "🔥",
      "kind": "general",
      "desc": "Fuel and fittings maintained above bare necessity.",
      "levels": [
        {
          "name": "Banked Fire",
          "desc": "Reduces yearly household mortality by 0.05 percentage points.",
          "cost": 12,
          "upkeep": 0.25,
          "tierMin": 0,
          "fx": { "mortality": 0.0005 }
        },
        {
          "name": "Tiled Stove",
          "desc": "Reduces yearly household mortality by 0.1 percentage points.",
          "cost": 50,
          "upkeep": 1,
          "tierMin": 1,
          "fx": { "mortality": 0.001 }
        }
      ]
    }
  }
}
```

- `kind` is `"general"` or `"work"`. A work definition also requires
  `profession`, naming an id in `FBDATA.careers`.
- `levels` are sequential. `cost` is the one-time setup price to advance from the
  previous level; `upkeep` is the complete seasonal cost of the current level, not a
  cumulative sum. `tierMin` gates that level. Standards are dormant at tier 3 and above.
- A work outfit is also dormant without an adult resident family member practicing that
  profession, or a matching retainer currently staffing an enterprise. Dormant levels
  keep their saved purchase but have no upkeep or effect.
- General `fx` keys are `mortality` (subtracted from yearly household mortality chance),
  `education` (added to yearly directed-learning chance), `retainers` (flat household
  capacity), `prestige` (per season), `travelCost` (multiplier on a new journey's whole
  upfront cost), and `travelLegDays` (days per county leg, snapshotted at departure).
- Work levels use `fx.work`, a fractional multiplier on matching vocational focus
  resources, resident-family wages or clerical yield, and staffed-enterprise output.
  It does not modify skills or combat. Multiple active mod definitions for one profession
  add their work fractions.
- `name`/`desc` on both the definition and each level are pure display fields and accept
  the usual text tokens and faith-variant objects. Core extraction keys use
  `householdStandard.<id>.levels.<zero-based-index>.<field>.<branch>`.
- Purchased levels live in the JSON-safe `player.householdStandards` map and pass through
  succession. They are not holdings or items and therefore cannot be sold, pledged, gifted,
  or referenced by holding event effects.
- If upkeep is unaffordable, core discretionary ids lapse first in this order:
  `luxuries`, `wares`, `transport`, `quarters`, `board`. Other general definitions follow
  in stable definition order, then active work outfits. Work outfits lose the highest
  active level first, with definition order breaking ties.

The public engine helpers are `FB.ensureHouseholdStandards`,
`FB.householdStandardLevel`, `FB.householdStandardLevelDef`,
`FB.householdStandardWorkerEligible`, `FB.householdStandardActive`,
`FB.householdStandardEffects`, `FB.householdStandardEffect`,
`FB.householdWorkMultiplier`, `FB.householdStandardUpgradeAvailable`,
`FB.buyHouseholdStandard`, `FB.reduceHouseholdStandard`,
`FB.householdStandardsUpkeepParts`, `FB.householdStandardsUpkeep`, and
`FB.householdStandardsSeason`.

## Careers and apprenticeships

`FBDATA.careers` (in `data/economy.js`, mod key `careers`) defines the work a
character can learn and perform:

```json
{ "careers": { "brewer": {
  "name": "Brewing", "icon": "🍺", "skill": "ste",
  "apprenticeAge": 10, "apprenticeCost": 6,
  "wage": 1.5, "masterWage": 2.5, "guild": true,
  "ranks": {
    "apprentice": "Brewer's apprentice",
    "journeyman": "Brewer",
    "master": "Master brewer"
  },
  "desc": "Malt, barrels, and careful accounts."
} } }
```

- `skill` is trained during apprenticeship and occasionally during adult work.
- `apprenticeAge` / `apprenticeCost` gate a child's entry.
- `tierMin` can keep a career closed until the household reaches sufficient station.
- `requiresTech` optionally requires a completed technology in the household's effective
  sovereign nation. Training costs honor national `fx.costs.training` modifiers.
- `wage` / `masterWage` are seasonal contributions from resident non-player
  household workers who are not staffing an enterprise.
- `guild: true` enables member → master → officer → guildmaster progression.
  Core monopoly petitions are intentionally limited to the `craftsman` and `merchant`
  profession ids; adding `guild:true` to another career does not make it charter-eligible.
- `maleOnly: true` is reserved for historically sex-gated training such as arms.
- `religionGroups` limits a career to characters whose faith belongs to one of the listed
  groups; core Clerical Service uses `christian` and `muslim`.
- `piety` is a seasonal piety contribution from clerical careers (monk, priest).
- `hiddenChoice: true` keeps a career out of the player's chooser — it is entered only
  through an event or a marriage/background — though the household still works it.
- `learned:true` disables automatic age-sixteen and experience-based promotions.
  `literacyYears` is the number of active trainee years after which an illiterate
  character gains the core `literate` (Lettered) trait.
- `license` defines the first examination as
  `{id,name,toRank,age,years,skills,cost}`. The current engine expects
  `toRank:'journeyman'`; `skills` maps `mar`/`dip`/`ste`/`int`/`lea` to effective-skill
  minimums. Every learned examination also requires Lettered and the career's
  `requiresTech`.
- `specializations` maps permanent specialty ids to
  `{name,requiresTech?,years,skills,cost,fx?,authoredWork?}`. Passing one stores its id
  on the career and promotes the character to master. Core focus effects recognize
  `focusGold`, `focusStanding`, `focusPrestige`, and `focusResearch`; the medical
  household rule recognizes `mortality`. `authoredWork:true` invokes the core Author
  treatise reward and should be used only with that intended content contract.
- License and specialty `name` values are structured-data display fields. Specialty
  `requiresTech` values are validated and appear in reverse technology discovery.
- Owned character state lives in `character.career`; `player.profession` mirrors the
  current head's exact occupation for existing `professions` event triggers. Feudal station
  is separate: gaining land or a title does not erase a merchant, clerical, or military
  occupation. `FB.careerExamOptions` is the read-only status surface,
  `FB.takeCareerExam` performs a live-revalidated attempt, `FB.careerSpecialization`
  resolves the saved specialty, and `FB.householdMedicalProtection` returns the single
  best locally present provider's yearly mortality reduction.

Core Catholic and Muslim religious ladders live in `js/economy.js`, separately from moddable
career rank labels. Per-character progress is saved in `character.religiousRanks`; unsupported
faiths simply receive no core ladder. Lay standing and the active vocation remain separate;
`FB.religiousStandings` exposes both and seasonal piety uses the higher rank yield rather
than stacking them. Formal religious offices may raise `character.station`. Abbot/qadi and
chief-qadi milestones preserve their legacy player tiers and flags.

Catholic Bishop is a core personal office saved in `character.bishopric`, not an ordinary
career rank or province title. `FB.bishopricOf`, `FB.hasBishopric`,
`FB.installBishopric`, `FB.releaseBishopric`, `FB.bishopricIncome`, and
`FB.bishopricRetinue` are the public engine surface. A see-only player uses tier 3 for
compatibility, but office-aware actions and title rendering exclude generic barony powers.
The office is non-hereditary and may coexist with separately inherited secular land.

## Positions and household retainers

`FBDATA.positions` (in `data/economy.js`, mod key `positions`) defines an office held
alongside a character's occupation. Core positions are either earned appointments, such
as councilman and sergeant, or paid household service:

```json
{ "positions": { "reeve": {
  "name": "Reeve", "icon": "📜", "kind": "retainer",
  "profession": "merchant", "minTier": 2,
  "pay": 2, "quality": 2,
  "fx": { "gold": 0.5, "enterprise": 0.05 },
  "desc": "Keeps the household's rents and accounts."
} } }
```

- `kind` is `earned` or `retainer`. An earned position is active while its matching
  `player.flags` id is true; a retainer position is active while a paid contract exists.
- `profession` optionally determines the career of a newly generated retainer.
  `minTier` and `maleOnly` gate hiring.
- `pay` is charged every season per retained character; `quality` weights generated
  candidates and defaults to 1.
- Supported `fx` keys are `gold` (seasonal household income), `enterprise` (fractional
  multiplier), `retinue` (flat levy retinue), and `tax` (fractional personal-tax
  multiplier).
- Retainers live in `player.retainers` as compact
  `{charId,office,pay,startedTurn,unpaid}` records. They can staff enterprises, serve as
  paid tutors, and use household equipment, but they are not family: they bring no
  family wage or piety, add no resident-family upkeep, and do not enter succession.
- Each household office has one holder. A retainer leaves after two unpaid seasons or
  when regard falls to −40; marrying the head ends the paid contract and moves the
  character into the ordinary spouse household.
- Capacity and the default contract economy are controlled by `retainerCapacity` and
  the `pay` values in the position definitions. Contracts pass to the next head, but
  personal friendship does not.

## Childhood schooling

`FBDATA.schooling` (in `data/economy.js`, mod key `schooling`) defines recurring
instruction arrangements:

```json
{ "schooling": { "grammar_school": {
  "name": "Grammar School", "icon": "📚",
  "cost": 1, "chance": 0.5, "tierMin": 1, "devMin": 2,
  "focuses": ["dip", "ste", "lea"],
  "annualMortality": 0.01,
  "annualEvents": ["grammar_prize", "grammar_debate"],
  "desc": "Letters, figures, rhetoric, and law."
} } }
```

- `cost` is base gold charged at each 90-day season boundary before national
  training-cost modifiers.
- `chance` is the full four-term yearly chance of gaining the directed focus skill,
  before household education bonuses and the global cap.
- `tierMin` optionally requires that minimum household tier (0 Serf through 7 Emperor).
- `devMin` optionally requires that development in the home county.
- `focuses` optionally limits the education focuses the school can teach.
- `requiresTech` optionally requires completed technology in the household's effective
  sovereign nation.
- `annualMortality` optionally adds a full four-term mortality probability at New Year.
  Risk scales linearly with completed terms (`annualMortality × terms / 4`) and resolves
  before education and coming-of-age.
- `annualEvents` optionally lists queued event ids. Surviving terms across the household
  produce at most one annual story with probability `min(1, terms / 4)`; the student is
  selected in proportion to completed terms, and the immediately previous schooling story
  is excluded.
- `name`/`desc` accept the same localization tokens and faith-variant objects as
  other structured data.
- The built-in `master` id is special: its chance comes from the attached tutor
  character's focused skill rather than a fixed `chance`.
- Current instruction lives in `character.edu.school`; the accumulated value of
  completed learning terms lives in `character.edu.lessonBoost`. Completed institutional
  terms also accumulate by schooling id in `character.edu.schoolTerms`; missed fees do not
  add exposure, switching schools does not erase it, and the New Year pass resets consumed
  entries. Missing maps in old saves are treated as empty.

## Family enterprises

`FBDATA.enterprises` (in `data/economy.js`, mod key `enterprises`) defines repeatable
productive property:

```json
{ "enterprises": { "brew_house": {
  "name": "Brew House", "icon": "🍺", "cost": 70,
  "profession": "brewer", "yield": 3, "devMin": 2,
  "guildRank": "member",
  "desc": "A public brew-house staffed by a trained household member."
} } }
```

- `profession` identifies eligible workers; resident family and paid retainers with
  that career may staff the enterprise only while their resolved residence is the
  enterprise province. `guildRank` optionally sets the minimum guild rank.
- Siting gates are `devMin`, `coastal`, and `terrains`, matching building gates.
- `requiresTech` optionally requires a completed technology in the household's effective
  sovereign nation. Purchase costs honor national `fx.costs.enterprise` modifiers.
- `chainFrom` optionally names another enterprise type that feeds this one: while at
  least one household enterprise of that type produces in the same province, this
  enterprise's yield grows by `balance.enterpriseChainBonus`.
- `yield` is the base seasonal gold before worker skill, local development, guild
  rank, and any matching active guild-monopoly percentages modify it. Incoming and
  outgoing percentages add, capped at +50%.
- Instances live in `player.enterprises` as
  `{uid,type,provinceId,settlement,workerId,workerLocked?}`. Optional
  `workerLocked:true` reserves a valid current pairing from batch staffing; missing or
  false means unlocked. One type may stand once per settlement, but the family may own
  further copies elsewhere; repeat cost grows by `balance.enterpriseRepeatCostGrowth`.
- An idle or invalidly staffed enterprise earns nothing.
- Runtime normalization removes both `workerId` and `workerLocked` when a worker dies,
  leaves the household or enterprise province, becomes career/guild ineligible, or is
  manually replaced or unassigned. Valid locks survive saves and succession.
- The core staffing preview optimizes all unlocked instances together against all
  eligible household workers. It maximizes `FB.enterpriseYield` rounded to thousandths,
  preserves current pairings on a yield tie, then uses stable enterprise UID and
  character ID order without RNG. Unstaffed rows report locale-neutral
  `no_eligible_worker`, `eligible_workers_locked`, or `allocated_higher_yield`.
  Applying a preview requires its current signature and therefore rejects stale plans.

## Overland travel

`FBDATA.travelPurposes` and `FBDATA.travelSites` live in `data/travel.js`;
runtime mods use the `travelPurposes` and `travelSites` keys. Purpose ids replace
by key, and site objects replace by their required stable `id`.

```json
{
  "travelPurposes": {
    "embassy": {
      "name": "Private embassy", "icon": "🕊",
      "desc": "Carry a message to an authored court.",
      "cost": 4, "mode": "sites", "minTier": 1, "maxTier": 5,
      "repeatable": true
    }
  },
  "travelSites": [
    { "id": "embassy_paris", "purpose": "embassy", "provinceId": "paris",
      "religionGroups": ["christian"] }
  ]
}
```

- A purpose carries localized `name`/`desc`, optional `icon`, added upfront
  `cost`, and one destination `mode`: `sites`, `developed` (with `minDev`), or
  `capitals` (the current capitals of living realms).
- The core `trade` purpose retains its embedded `cost`/`stake` only for direct
  compatibility calls. The player-facing flow reads stake, market threshold,
  timing, outcomes, and modifiers from `finance.tradeVenture`.
- Optional `minTier`/`maxTier` bound rank access. With neither field, an
  existing mod purpose keeps the historical freeholder/gentry range (1–2).
  Supplying either field opts into an explicit range; the omitted lower bound
  is 1 and omitted upper bound is 7. Serfs remain unable to travel.
  `FB.travelEligible(state, purposeId)` applies those gates, while the
  no-purpose call preserves its tier-1/2 compatibility behavior.
- Optional `repeatable:true` permits revisiting a completed destination.
  Optional `targeted:true` removes the purpose from the generic county picker
  for a purpose-specific character or object flow. Core relationship visits
  use `FB.socialVisitPreview`/`FB.socialVisitStart`; other targeted purposes
  need their own UI and start integration.
- A site carries `id`, `purpose`, and `provinceId`; optional `religions` and
  `religionGroups` restrict it to the traveler’s faith.
- Routes use settled, non-wasteland adjacency. Entries in `straits` therefore
  work as travel crossings too.
- `FB.travelCost(purposeId, routeOrLegs)` remains the unmodified compatibility
  calculation. Passing a state as the optional third argument applies active household
  transport; `FB.travelLegDays(state)` supplies the matching leg duration. Departure
  stores both cost and leg duration so later data or household changes do not alter a
  journey already underway.
- `FB.travelRouteOverhead(routeOrLegs, state)` prices only the route. The shared
  `FB.developedMarketDestinations(state, minDev, opts)` helper supplies settled,
  reachable choices to both ordinary travel and self-founded venture setup.
- Travel events are normal event objects with `trigger:{"never":true}` and
  top-level `travel:{"kind":"culture|road|capstone|decision|work"}`. A capstone
  or work event may add `"purpose":"id"`. Culture/road events are drawn without
  repetition up to the journey caps; destination work events repeat but never
  immediately repeat the last story. A work event may add `minTier`/`maxTier`
  inside `travel` to separate commoner work from ruler guest-residence stories.
  The core driver queues a purpose’s capstone
  by the id `travel_capstone_<purpose id>`.
- Core trade-capstone settlement uses `travel_trade_cautious`,
  `travel_trade_bold_success`, and `travel_trade_bold_failure`; these scale the
  selected accompanied stake and then perform the ordinary capstone completion.
  `travel_capstone_done` remains the generic unscaled completion handler.
- `balance.travelLegDays`, `travelCooldownDays`, `travelCultureEventCap`, and
  `travelRoadEventCap` tune the road. `travelMinStayDays`,
  `travelWorkEventMinDays`, `travelWorkEventMaxDays`, `travelSettleOfferDays`,
  and `travelSettleWorkEvents` tune destination life and permanent settlement.

## Finance contracts

`FBDATA.finance` (in `data/economy.js`, mod key `finance`) defines the three
player-originated loan families, passive trade partnerships, and self-founded ventures:

```json
{ "finance": {
  "pledge": {
    "maxPrincipal": 40, "markup": 0.25, "termSeasons": 4,
    "collateralRatio": 0.60, "lender": "moneychanger",
    "defaultKind": "collateral"
  },
  "tradePartnership": {
    "termSeasons": 4, "risk": 0.25, "profitShare": 0.45
  },
  "tradeVenture": {
    "stakes": [10, 20, 50],
    "activeLimit": 1,
    "minDevelopment": 4,
    "timing": { "minimumDays": 90, "preparationDays": 30 },
    "outcomes": {
      "cautious": [
        { "below": 0.10, "outcome": "loss", "multiplier": 0 },
        { "below": 0.30, "outcome": "partial", "multiplier": 0.75 },
        { "below": 0.95, "outcome": "profit", "multiplier": 1.25 },
        { "outcome": "exceptional", "multiplier": 1.60 }
      ],
      "bold": [
        { "below": 0.25, "outcome": "loss", "multiplier": 0 },
        { "below": 0.40, "outcome": "partial", "multiplier": 0.50 },
        { "below": 0.93, "outcome": "profit", "multiplier": 1.70 },
        { "outcome": "exceptional", "multiplier": 2.75 }
      ]
    },
    "modifiers": {
      "stewardshipDivisor": 200, "guildDivisor": 2,
      "tradeHouse": 0.03, "householdBonusCap": 0.20,
      "destinationDevelopmentDivisor": 100,
      "destinationDevelopmentCap": 0.08,
      "routeRiskPerLeg": 0.006, "routeRiskCap": 0.12
    }
  }
} }
```

- `markup` is the total fixed markup signed into the face, not an annual rate.
- `termSeasons` sets the season-boundary maturity. `maxPrincipal` caps an offer
  after reliable-income, collateral, reputation, and outstanding-debt capacity.
- `defaultKind` is `collateral` (take the named pledge) or `revenue` (assign the
  configured share of regular revenue until paid).
- `collateralRatio` caps a pledged principal against the asset's base value.
- A trade partnership consumes `risk` once at maturity; `profitShare` sizes the
  profitable return. The resolved roll and payout are stored in the save.
- `tradeVenture.stakes`, `activeLimit`, and `minDevelopment` control formation.
  Duration is the larger of `timing.minimumDays` and
  `timing.preparationDays + round-trip route days`.
- Each ordered outcome band applies when the formation-adjusted roll is below
  `below`; the final band omits `below`. `multiplier` is applied to the stake.
  Formation snapshots every modifier and the selected bands into the investment.
- Stewardship contributes `skill / stewardshipDivisor`; merchant/craft guild
  privilege contributes `(FB.guildIncomeMultiplier - 1) / guildDivisor`; a
  Trading House adds `tradeHouse`; national `trade` technology adds its scalar
  bonus. Those household terms cap at `householdBonusCap`. Destination development
  then adds `development / destinationDevelopmentDivisor` up to its cap, while
  route length subtracts `routeRiskPerLeg` per one-way county leg up to its cap.
- Self-founded ventures do not read `requiresTech`. Transport modifies route
  overhead and leg duration only, never a configured stake. Dispatched ventures
  use exact-day resolution; passive partnerships retain season-boundary maturity.
- Finance and price bounds, pressure, loan count, capacity, arrears, default,
  revenue-share, and coinage tunables are the `price*` and `finance*` keys under
  `FBDATA.balance`.
- Household and education costs/chances use the `household*` and `education*`
  balance keys. Personal relationships use `socialAttentionCapacity` (core 1),
  `socialAttentionDailyOpinion` (fixed Standing per ordinary day; core 0.2),
  `relationshipOpinionThreshold` (shared Call friend / proposal gate; core 40),
  `socialGiftCooldownDays` (one explicit cash or item gift per recipient; core 90),
  `socialCashGiftOpinion` (core 4), and the three-entry `socialItemGiftOpinion`
  array (core `[4,8,12]`). Ruler cash gifts use
  `rulerCashGiftCostByRank` (rank-indexed core `[0,10,15,25,40]`) and
  `rulerCashGiftOpinion` (core 15). Character and ruler recipients use separate saved maps,
  but each recipient's cash and item choices share `socialGiftCooldownDays`; ruler entries
  are generation-stamped, and Council gifting uses the same ruler clock.
  `friendOpinionThreshold` is a deprecated fallback for older data sets; new mods should
  define the shared relationship threshold. Wedding and authored event gifts do not use
  the explicit-recipient cooldowns. Other Network
  tunables include `retainerCapacity`, `guildFavorStandingCost`, `guildFavorCooldown`,
  `guildStandingYearlyGain` (repeatable annual Standing for an active adult guild
  vocation), and `guildStandingMax` (the cap for that renewal),
  `vassalLevyFavorRate`, and `vassalLevyFavorDays`. `guildMonopolyTerms` maps grantor
  tiers `3`–`7` to `{years,enterpriseBonus,rulerFee,taxBonus,popularOpinion}`. A new
  charter copies those numeric values into its save record, so a later mod or balance
  edit does not rewrite an active charter.

## Settlements

Each settled county exposes 2–8 settlement slots through **authored presentations plus
deterministic generated fallback**. Two identities exist: the numeric slot (the saved
reference for buildings, land plots, manors, and enterprises) and the physical *site*
(a globally stable slug with one longitude/latitude, derived world data that never
enters a save). `FB.settlementsOf` returns the currently visible records as
`{site, name, kind, x, y, authored}`; the visible count follows the legacy rule
(2 + a plain hash bit of the province id, never the seeded RNG, +1 at dev 3/5/7/9) raised to
the curated (non-`fill`) authored count, and generated names still come from
culture-flavored parts in
`FBDATA.settlementNames` (in `data/cultures.js`; the `settlementNames` mod key merges
per-culture sets, `default` covers the rest). Size follows current development — the
head grows village → town → city at dev 4/7, the second place becomes a town at 6 —
never below an authored baseline kind. The "Go into town…" deed lists them and queues
`visit_village` / `visit_town` / `visit_city` — ordinary event data whose options are
`require`-gated by tier, profession, and faith, with the chosen settlement's name in
`{settlement}`. Replace those events to change what a day in town offers.

**Real-world fill.** The shipped `data/settlements_real.js` is a generated file
(`tools/settlement_import.py`, run manually — never at build or runtime) that appends
GeoNames-derived presentations after the curated lists of `data/settlements.js`
with `fill: true`: real names and locations for every slot the curated data does not
cover, including a county-head entry named after the county itself, without forcing
early visibility. Curated entries always win; where the geodata has too few named
places (steppe, desert, tundra), the remaining slots keep generated names.
Modern numbered administrative labels ('Paris 16 Passy') are cleaned to the
historical name they embed ('Passy'); labels with no historical reading are
dropped for the next real place. Where a place is itself a post-medieval
foundation or renaming, the tool's `HISTORICAL_NAMES` table emits the
settlement's well-attested older name instead ('Tel Aviv' → 'Jaffa',
'Ankara' → 'Ancyra'); county-head entries are exempt and keep the county's
name.
An optional `--topup` pass adds places from OpenStreetMap.
Settlement data: GeoNames geographical database (CC BY 4.0);
top-up data © OpenStreetMap contributors, ODbL.

**Physical sites.** The optional top-level `settlementSites` object merges by site id
into `FBDATA.settlementSites`:

```json
{ "settlementSites": { "praha": { "x": 14.42, "y": 50.09 } } }
```

A site id is a lowercase snake_case slug (`a–z`, `0–9`, `_`) with finite longitude `x`
and latitude `y`. One slug denotes one physical place across every bookmark.

**County presentations.** A province inside a complete atomic bookmark — or a legacy
867 `provinces` replacement, which already replaces the whole same-id province record —
may carry the ordered `settlements` list shown in *Adding a province*. Every entry's
`site` must exist in the merged physical table. Bookmark validation reports invalid
slugs, coordinates, kinds, missing sites, repeats within a county, a site assigned to
two counties in one bookmark, wasteland lists, and lists over eight entries; world
compilation additionally rejects a coordinate that lands implausibly far outside the
declared county's raster. A coordinate that survives the snap but sits on a
coastal-edge cell is nudged inland at compile time (a two-cell land margin, walking
toward the county centroid), so a seaside town renders against land, not the
smoothed waterline. Reordering a published mod's settlement list can move saved
property between named places even though the numeric save remains valid — append new
slots or deliberately replace the presentation of an existing index. A mod that
supplies neither `settlementSites` nor `settlements` gets deterministic generated sites
and keeps its current settlement names and indices.

## Items

`FBDATA.items` (in `data/map_data.js`, mod key `items`) define objects that can live in
the shared family armory and be equipped by the current head, spouses, or resident
unmarried children:

```json
{ "items": { "ivory_chesspiece": {
  "name": "Ivory King", "icon": "♟", "rarity": "fine", "value": 45,
  "slot": "hand", "ageMin": 6,
  "fx": { "int": 1 },
  "art": { "kind": "generic" },
  "desc": "A gift between rulers, long ago."
} } }
```

- `rarity` — `common` / `fine` / `famed` is the stock class a definition draws in (famed
  pieces mostly arrive as war spoils and finds); definitions without a recognized rarity
  sell as `common`. `value` is the purchase price.
- `slot` is `head`, `neck`, `body`, `waist`, `feet`, `hand`, or `ring`. `grip:2` on a
  hand item reserves both hands. `ageMin` is the minimum equip age.
- Definitions are unique by default. `unique:false` makes a repeatable template: each
  acquisition creates a saved exact instance with `quality` and `visualSeed`. Quality is
  Plain/Well-made/Masterwork at 70/25/5%, multiplies value by 1/2/4, and adds
  `qualityFx` zero/one/two times to the base `fx`.
- `art.kind` selects procedural art (`generic`, `seax`, `sword`, `spear`, `shield`,
  `book`, `jack`, `helm`, `crown`, `ring`, `pendant`, `relic`, `belt`, `boots`,
  `chest`, or `picks`). The kind accepts the color arrays demonstrated by core items:
  `metals`, `grips`, `woods`, `cloths`, `threads`, `leathers`, `gems`, `trims`,
  `cords`, `covers`, `pages`, and `wraps`. Missing art uses `generic`. Drawing depends
  only on the saved seed; do not put gameplay randomness in an art recipe.
- `fx` is active only while equipped. `mar/dip/ste/int/lea` and `health` affect the
  wearer; `battle`, `gold`, `prestige`, and `piety` count only on the current head.
  Unequipped armory objects have no mechanical effect.
- `eventOnly:true` excludes an item from ordinary peddler, gear, loot, plot, artifact,
  raid, and war-spoil pools. A specific `giveItem` effect or direct `FB.grantItem` call
  may still create it. This is distinct from the same-named holdings option.
- `player.items` stores exact references, not necessarily definition ids.
  `state.itemInstances` resolves generated references and `player.loadouts` assigns them.
  Never push/splice those arrays from a mod custom function. Use `FB.grantItem`,
  `FB.transferItem`, `FB.equipItem`, `FB.unequipItem`, `FB.pledgeItem`,
  `FB.sellItem`, `FB.giveItem`, `FB.giveRulerItemGift`, and `FB.destroyItem`.
- Item cards list actual quality-adjusted powers, value, wearer, and valid actions.
  Ordinary Plain/Well-made/Masterwork gifts and unique common/fine/famed items map their
  three tiers through `balance.socialItemGiftOpinion` (core: +4/+8/+12 Standing). Explicit
  personal and ruler item gifts share their recipient's cash-gift cooldown described
  above. A ruler has no inventory: `FB.giveRulerItemGift` removes the object from family
  ownership while retaining the semantic item record used by Chronicle messages. An
  equipped item must be removed before gift, sale, or pledge.
- Event hooks (`custom` effects): `offer_item` (the full eligible table, banded by the
  customer's station) and
  `offer_gear` (ordinary gear only) put an exact object on sale through `item_offer`;
  `buy_item` / `clear_item_offer` / `can_afford_item` (trigger),
  `loot_item` (random spoils), `find_artifact` (famed only), `plot_loot` (spoils + ends the
  plot). Owned unique objects are excluded while repeatable templates may recur. War
  victories and raids also issue exact spoils. To grant one **specific definition**, use
  the `giveItem: "id"` effect; it creates a new instance when that definition is repeatable.
- `offer_item` stock is banded by `balance.peddlerStockBands` (societal role →
  `common`/`fine`/`famed` class weights): the roll picks a rarity class first, then a
  definition inside it, so collecting uniques never shrinks a class until it is empty.
  Each `balance.peddlerWealthShift` purse threshold crossed shops one band higher. An
  offer above the band's home class queues `item_offer` with `offerClass:'aspirational'`
  (otherwise `'other'`), a forms selector the event text may branch on.

## Plots, blessings, and pacts

**Plots** (`FBDATA.plots` in `data/map_data.js`) drive the intrigue game. The "Begin a
plot…" deed offers every plot whose `trigger` (standard trigger syntax) passes; beginning
one switches the player to the Scheming focus, which accrues `need` power over the days —
with a daily discovery risk — then queues the plot's resolution `event`. Discovery offers
abandonment with a context-specific consequence, paid containment that preserves the plot
with less power and more future risk, or an immediate lower-odds resolution. Resolution events
are ordinary event data: use the `plot` named chance for the attempt, and end every option
with `{ "custom": "plot_end" }`, or an owning-system custom handler that calls it, so the
plot clears and the old focus returns:

```json
{ "plots": { "poison_well": {
  "name": "Sour the Well", "icon": "🕳", "need": 10, "event": "plot_poison_well",
  "trigger": { "hasRole": "rival" }, "desc": "Petty, deniable, and effective." } } }
```

**Blessings** are plain event data (`seek_blessing`, fired by the Seek-a-blessing deed) that
spend piety on flags the engine reads: `blessed_crops` (+harvest odds, spent with the
harvest), `blessed_war` (+battle odds, spent on the next battle roll), `blessed_union`
(+fertility until a child is conceived).

**Pacts** are engine-side diplomacy: the envoy deed (tier 4+, independent) spends gold on a
dip-based chance to set `state.pacts[realmId]` — two years during which that realm will not
attack the player and cannot be declared on.

## Technology

`FBDATA.techDomains`, `FBDATA.techTraditions`, `FBDATA.tech`, and `FBDATA.techCaps`
(in `data/technology.js`, with matching mod keys) define the national prerequisite
graph. Each sovereign owns one saved `state.realmTech[realmId]` record; vassals use and
contribute to the effective top independent realm's completed knowledge, exposures, and
one-to-three active projects. Only a sovereign player chooses projects, while AI
sovereigns fill slots with saved RNG.

The definition tables merge by id: a same-id domain, tradition, or technology replaces
that complete definition, while a new id is added. A domain requires a localized `name`;
`icon` is display metadata and finite numeric `order` controls catalogue grouping. A
tradition requires a localized `name` plus `cultures` and `religions` arrays; realms whose
capital/ruler matches either array derive that tradition automatically. A technology may
refer to any domain present after the full mod stack merges, and adoption windows may
refer to any resulting tradition. Mod-authored labels without a core catalog entry fall
back to their authored English.

`techCaps` merges supplied scalar cap keys. Its nested `costFloor`, `units`, and `aiUnits`
maps merge one member at a time, so `{ "techCaps": { "units": { "arch": 250 } } }`
leaves every other built-in cap intact. Caps must be finite non-negative numbers. Scalar
cap keys are the scalar `fx` keys below; `costFloor` accepts `build`, `enterprise`, and
`training`; `units` accepts `levy`, `arch`, `cav`, and `ret`; and `aiUnits` accepts
`arch`, `cav`, and `ret`.

```json
{
  "techDomains": {
    "mechanics": { "name": "Mechanics", "icon": "⚙", "order": 7 }
  },
  "techTraditions": {
    "workshop_exchange": {
      "name": "Workshop exchange",
      "cultures": ["italian"],
      "religions": []
    }
  },
  "techCaps": {
    "movement": 0.3,
    "units": { "arch": 250 }
  },
  "tech": {
    "windmills": {
      "name": "Windmills", "icon": "🌬",
      "domain": "mechanics",
      "cost": 50,
      "req": ["water_power"],
      "reqAny": ["overshot_waterwheel", "trip_hammer"],
      "history": {
        "attested": [850, 1200],
        "adoption": {
          "default": [1030, 1240],
          "latin": [980, 1170],
          "workshop_exchange": [980, 1170]
        }
      },
      "desc": "Grinding grain wherever the wind blows.",
      "confidence": "medium",
      "sources": ["GIES", "HILL"],
      "unlocks": ["rule:wind_power"],
      "fx": {
        "costs": { "build": -0.04, "enterprise": -0.04 },
        "movement": 0.02
      }
    }
  }
}
```

- Built-in domains are `agriculture`, `crafts`, `commerce`, `learning`, `governance`,
  `warfare`, and `seafaring`; mods may replace them or add more. `req` is an all-of id
  or array; `reqAny` is an optional any-of array. Technologies are never repeatable.
- `history.attested:[from,to]` is the evidence range.
  `history.adoption.default:[emergence,widespread]` is required; named technology
  traditions may override it. Dates affect cost rather than availability, so a project
  remains selectable before attestation at a severe premium.
- `unlocks` names discrete content or rule hooks. Every referenced `building:*`,
  `enterprise:*`, and `career:*` target is validated.
- `confidence` and `sources` are research metadata; core source codes are expanded in
  `docs/research/medieval-technology-catalogue.md`.
- Optional `cultures` / `notCultures` arrays select mutually exclusive definitions when
  a project begins. Once completed, the selected id remains valid after cultural
  succession. These restrictions remain primarily for old mods.
- Scalar `fx` keys summed by `FB.techBonus` are `tax`/`levy` (fractional multipliers),
  `battle` (added battle power), `devCap` (development ceiling), `health` (lower ruler
  mortality), `research` (national points each season), `domain` (domain capacity),
  `siege`, `movement` (overland army speed), `seaMovement` (water-crossing speed),
  `education`, `finance`, and `trade`. All are subject to
  `FBDATA.techCaps`.
- `fx.seaTransport` is different: it must be a finite positive integer and the effective
  sovereign uses the largest completed value, not a sum. Without one, field armies use
  `balance.armySeaTransportBase`. Mods do not need ship, port, or fleet objects; technology
  details display both sea effects automatically.
- `fx.costs` contains signed fractional modifiers for `build`, `enterprise`, and
  `training`; final factors have category floors.
- `fx.units` adds flat player-host `levy`, `arch`, `cav`, or `ret` troops.
  `fx.aiUnits` adds AI host composition fractions for `arch`, `cav`, or `ret`. Compatibility
  aliases remain readable: flat `build:0.20` means a twenty-percent building discount,
  while flat `retinue` and `archers` add those player-host classes.
- `name`/`desc` accept text tokens and religion-variant objects.
- Events grant national progress with the `research` effect and gate on effective
  completed ids with `techs`/`notTechs`. Buildings may carry a `research` per-season key
  (see the library); contributions become reserve if no project is active.
- Buildings, careers, schooling, enterprises, household-standard levels, finance
  contracts, and trade partnerships may use `requiresTech:"technology_id"`.

Legacy definitions are normalized at runtime. `branch` becomes `domain`, scalar `req`
becomes an array, and `yearMin:Y` becomes an inferred soft historical window rather than
a hard lock.

Bookmark realm definitions may include:

```json
{
  "techTraditions": ["byzantine", "islamic"],
  "techSeed": {
    "complete": ["technology_id"],
    "expose": ["another_id"],
    "omit": ["exception_id"]
  }
}
```

Without `techTraditions`, the engine derives one or more traditions from capital/ruler
culture and religion. Fresh seeds complete knowledge whose regional adoption window has
ended, expose knowledge whose window has begun, apply overrides, and close all completed
prerequisites.

## Cultures, religions, traits, titles, balance

See `data/cultures.js` and `data/traits.js` for the exact culture and trait shapes.

A trait definition may use this extended shape:

```json
{ "roadwise": {
  "name": "Roadwise",
  "icon": "🛤",
  "desc": "Long journeys have taught them the rhythms of the road.",
  "earned": "Earned after visiting three unique destinations.",
  "class": "formation",
  "noRandom": true,
  "inherit": 0,
  "ste": 1,
  "earn": { "threshold": 3 },
  "travel": { "legDays": -1, "roadIncident": -0.15 }
} }
```

`name`, `desc`, and `earned` are localized pure-display fields; `earned` is optional
acquisition guidance. `class` is `disposition`, `formation`, `reputation`, or
`condition`. Full character sheets display those classes in that order followed by
`Other`; an omitted or unknown class remains compatible and appears in `Other`.
Unclassified traits also retain normal random-generation behavior. Set `noRandom:true`
to exclude a trait from random character generation. `inherit`, `opposite`, the five
root skill keys (`dip`, `mar`, `ste`, `int`, `lea`), and root aggregation fields such as
`health`, `fert`, and `opinion` retain their existing meanings; `opinion` scales
positive event-driven Standing gains toward the protagonist.

`earn:{threshold:n}` defines progress-based acquisition. Event effects can call
`traitProgress:{id,amount?}`; the engine keeps the current protagonist's progress in
saved state, clamps it at the threshold, and awards the trait once. Removing an earned
trait through `removeTrait` resets its progress if removal occurred, allowing it to be
earned again. Direct `addTrait` remains valid and does not require progress. Mods can
query root effects through `FB.traitAgg(character)`, grouped numeric effects through
`FB.traitBonus(character,group,key)`, and award progress from code through
`FB.noteTraitProgress(state,traitId,amount)`.

The first grouped effect consumers are:

- `assembly.voteChance`: additive vote probability; `assembly.popularOpinion`: a rate
  applied only to positive Common Voice event gains.
- `travel.legDays`: days added to the departure-time county-leg snapshot after transport
  standards, with a minimum of one; `travel.roadIncident`: a multiplicative rate applied
  only to the ordinary 38% road-incident roll.
- `war.levy`: a rate against the player's direct levy base before Martial, domain
  penalties, and vassal contributions. It receives its own levy-ledger line.
- `estate.rent`: a rate applied to direct demesne rent after the domain penalty and
  before later technology, council, position, monopoly, and liege-cut arithmetic. It
  receives its own income-ledger line.
- `household.regard`: an additive rate on positive event Standing toward the protagonist's
  spouse or blood relatives. Losses and unrelated characters are unchanged.
- `courtship.siblingInitiate`, `siblingDynasticInitiate`,
  `siblingRiteInitiate`, and `siblingTabooInitiate` build the player's exceptional
  sibling-approach score. `siblingAccept`, route-specific `siblingRiteAccept`,
  `siblingIllicitAccept`, `siblingTabooAccept`, and conditional
  `siblingDynasticAccept` alter the target's one-time response probability. The
  matching `*Proposal` keys alter the final proposal, while `siblingExposure`
  changes seasonal illicit-exposure probability. All probabilities are fractional.

All grouped values are numeric; absent groups and keys contribute zero. The catalog has
no trait cap. Named wounds and sicknesses in `FBDATA.ailments` remain timed conditions
with their existing lifecycle; assigning a trait to the `condition` display class does
not turn it into an ailment or change ailment behavior.

Religions are one inheritance graph. A table key is the stable faith id; `group` points
to the definition it inherits. A root omits `group`, and a broad root normally sets
`assignable:false` so it can supply shared doctrine without producing characters called
only “Christian” or “Muslim.” `parent` is accepted as an equivalent programmatic
spelling. For example:

```json
{
  "christian": {
    "name": "Christianity",
    "assignable": false,
    "icon": "✝",
    "properties": {
      "marriage": {
        "spouseLimit": { "m": 1, "f": 1 },
        "divorce": {
          "kind": "annulment", "direct": false,
          "gold": 15, "piety": 20, "cooldownDays": 360
        },
        "acceptedRelations": ["same", "in_fold"]
      },
      "rankTitles": {
        "m": ["Serf", "Freeholder", "Gentry", "Baron", "Count", "Duke", "King", "Emperor"],
        "f": ["Serf", "Freeholder", "Gentlewoman", "Baroness", "Countess", "Duchess", "Queen", "Empress"]
      },
      "words": {
        "deity": "God", "cleric": "priest",
        "temple": "church", "landed": "Lord",
        "partnership": "Commenda partnership"
      },
      "roles": {
        "monasticM": "Monk", "monasticF": "Nun",
        "priestM": "Priest", "priestF": "Priest",
        "abbotM": "Abbot", "abbotF": "Abbess"
      },
      "clergyMarriage": false
    }
  },
  "catholic": {
    "name": "Latin Christianity",
    "group": "christian",
    "relationToParent": "schismatic",
    "icon": "✝",
    "properties": {
      "systems": { "papacy": true },
      "roles": { "bishop": "Bishop", "cardinal": "Cardinal" },
      "head": {
        "officeId": "catholic",
        "realm": "papacy",
        "title": "Pope",
        "recovery": "grant_seat",
        "seat": "roma",
        "restoredRank": 3,
        "sameFaithWar": "sacrilege"
      }
    }
  }
}
```

Identity text (`name`, `adjective`, `collective`, `desc`), lifecycle fields, and graph
edges stay local; an omitted `icon` may fall back to the parent. Values inside
`properties` inherit recursively. Nested
objects merge; arrays, scalars, and `null` replace the inherited value. A child can
therefore author only `properties.marriage.spouseLimit.m:3`, or use
`properties.head:null` to remove an inherited office; this also disables an inherited
`systems.papacy` capability. Legacy definitions that put qualities such as `head` at the
top level still work, but new data should use
`properties`. `rankTitles.m` and `.f` each contain all eight tiers. `FBDATA.titles` is
retained only as a compatibility fallback for old mods and saved title snapshots.
When a mod supplies one of the historical `titles.christian|muslim|pagan|jewish`
or `_f` keys, the loader also mirrors it into that root's effective `rankTitles`,
preserving title-only mods. New mods should edit the faith property directly.

`relationToParent` is `in_fold`, `schismatic`, or `hostile`, or a directional object
`{"childView":"in_fold","parentView":"schismatic"}`. A scalar applies both ways.
An omitted status defaults to `schismatic` for legacy definitions. Same ids resolve as
`same`; faiths with no common ancestor are `foreign`. Optional
`relations:{"other_faith":"hostile"}` adds authored directional exceptions. Runtime
changes use `FB.setFaithRelation(state,observerId,targetId,status)` and persist in
`state.faithRelations`. `marriage.acceptedRelations` controls which of those statuses
the faith permits in a match. Event and data variant objects search the exact faith,
then every ancestor, then `default`; `religionGroup`/`religionGroups` gates likewise
match any ancestor rather than only a hard-coded family.

For `foundFaith`, doctrine inherits but central-office allegiance does not. Unless the
new definition locally supplies `properties.head`, the effective branch receives
`head:null` and an inherited `systems.papacy` capability is disabled. This also applies
when older campaign-founded faiths are loaded. To keep recognizing an inherited office,
declare the intent explicitly; `"properties":{"head":{}}` retains the parent's office
and stable `officeId`. `relationToParent:"in_fold"` alone does not imply obedience.

`properties.head.realm` is the global initial/canonical realm fallback when the active
bookmark has no matching `religiousHeads` entry; `head.title` is localized pure-display
text. New heads should declare a stable `officeId`; a legacy head that omits it infers
the defining faith id, preserving the former save-key contract. An inherited office
keeps the same id, so Sunni schools do not produce duplicate Caliphs. The live mapping is saved independently
under `state.religiousHeads[officeId]`, may be reassigned, and may be explicitly vacant
with `null`. `state.religiousHeadVacancies[officeId]` then records
`{"turn":1234,"formerHolder":"papacy"}`. The built-in office ids remain `catholic`
and `sunni`, preserving old version-3 saves. A head is never inferred from capital faith
or territorial rank, and absorbing its holder never makes it hereditary. (Core adds one
deliberate exception: a victorious player `caliphate` succession war reassigns a `claim`
office to the victor's realm without moving land.) Faiths without effective `head`
metadata have no centralized office.

`head.recovery` is `grant_seat` or `claim`. A `grant_seat` office requires `seat`; the
Catholic seat is also reserved from personal Bishopric appointments. The head definition
may set `restoredRank` (default 3); recovery grants that county to a fresh independent
copy of the bookmark's canonical realm. A `claim` office supplies alternative complete
county sets in `claimCounties`, for example:

```json
{ "properties": { "head": {
  "officeId": "sunni",
  "realm": "abbasid",
  "title": "Caliph",
  "recovery": "claim",
  "claimCounties": [ ["baghdad"], ["mecca", "medina"] ],
  "sameFaithWar": "ordinary"
} } }
```

Each inner array is one sufficient alternative. Core player/AI rank and resource gates
remain engine rules; claiming attaches the office to an existing realm without moving
land. `sameFaithWar` is `ordinary` or `sacrilege`. Core `sacrilege` policy leaves player
causes legal behind a second confirmation, blocks ordinary same-faith AI selection, and
protects the office realm's counties from incidental same-faith AI captures.

Core and custom systems should query `FB.religionOf(id,state)`, `FB.faithValue`,
`FB.faithLineage`, `FB.faithRelation`, and `FB.faithHasSystem` rather than switching on
groups or ids. The effective record's `parent` is its exact parent; its `group` remains
the historical four-family compatibility alias, so it must not be used for new graph
logic. Central-office consumers should query `FB.religiousHeadOf(state, faithId)`,
`FB.religionsHeadedBy(state, realmId)`, or
`FB.isReligiousHead(state, realmId, religionId?)`; use
`FB.religiousHeadTitle(state, faithId)` for the localized title. In core data, Muslim
tier 7 is Great Sultan/Great Sultana because Caliph is reserved for the Sunni office.
Realm-death and recovery code should use `FB.markRealmDead`,
`FB.vacateReligiousHeads`, `FB.assignReligiousHead`,
`FB.canRestoreReligiousHead` / `FB.restoreReligiousHead`, and
`FB.canClaimReligiousHead` / `FB.claimReligiousHead` so assignments, vacancy clocks,
and durable notices remain consistent.

Runtime sects use the exact same definition shape. `FB.createFaith(state,definition)`
adds a validated definition without converting anyone. `FB.foundFaith` additionally
records founder/origin metadata and can convert the founder, managed household, and
player realm; declarative events normally use the `foundFaith` effect documented above.
Generated definitions live in `state.faiths`, relationship changes in
`state.faithRelations`, and both stay in the version-3 save envelope. County faith is
still authored bookmark data, so founding does not mutate a county. See
[designs/religions.md](designs/religions.md) for the complete resolution and save model.

### Catholic Papacy definition

`FBDATA.papacy` (in `data/papacy.js`, mod key `papacy`) defines the Catholic College,
election eras, Roman titles, regnal-name seeds, authority, Abbot and Bishop appointments,
investiture,
excommunication, schism, and Papal-economy constants. Unlike id-keyed tables, this
top-level value is atomic: a later mod replaces the whole object. Supply a complete
copy, including:

- `targetCollege`, `hardCap`, `annualAppointments`, `abbotAppointment`,
  `bishopric`, and `cardinalRequirements`;
- `authority` bands, action gates, starting bookmark values, and adjustments;
- ordered `elections`, `cardinalOrders`, `romanTitles`, `blocs`, `tactics`,
  `regnalNames`, and `regnalSeeds`;
- complete `investiture.policies`, `excommunication`, `schism`, and `balance` tables.

Ids and numeric values are locale-neutral mechanics. The `name` and `desc` fields on
authority bands, election laws, orders, blocs, tactics, and investiture policies are
pure-display text and fall back to the mod's authored English.

Saved Catholic governance lives in `state.papacy`, not in the definition. Its stable
collections are `obediences`, `cardinals`, `elections`, `realmObedience`,
`investiture`, `excommunications`, `archive`, and `regnalNameCounts`, plus temporary
continuity and decision records. Do not store rendered text in them. Cardinal and
obedience ids referenced by a save are protected by the ordinary active-mod
fingerprint.

`state.religiousHeads.catholic` deliberately remains the territorial Roman-office
pointer. Catholic-aware code should use `FB.popeRecognizedBy`,
`FB.papalObedienceForRealm`, `FB.romanPope`, and `FB.papacyInSchism` when recognition
matters; generic code may continue to use `FB.religiousHeadOf`. Other religions do not
use `state.papacy`.

### Great holy-war definitions

A centralized religious head may optionally authorize a global, two-camp campaign:

```json
{ "properties": { "head": {
  "officeId": "catholic",
  "realm": "papacy",
  "title": "Pope",
  "greatHolyWar": {
    "name": "Crusade",
    "minDate": { "year": 1095, "season": 3, "day": 1 },
    "firstTarget": "k_syria",
    "firstByYear": 1100,
    "yearlyChance": 0.25,
    "crisisChance": 0.75,
    "crisisKingdoms": ["k_armenia", "k_anatolia"],
    "crisisGroup": "muslim",
    "crisisShare": 0.25,
    "lossGuaranteeYears": 10,
    "sacredTargets": [
      { "kingdom": "k_syria", "counties": ["jerusalem"] }
    ]
  }
} } }
```

- `name` is localized pure-display text. The i18n key is
  `religion.<religionId>.head.greatHolyWar.name.default`.
- `minDate` is required and uses the normal 0–3 season and 1–90 day calendar.
- `sacredTargets` is required. Every `kingdom` must exist in the active bookmark and
  each listed county must belong de jure to that kingdom. A sacred target becomes
  eligible when at least one listed county is ruled by a faith outside the caller's
  accepted fold.
- `firstTarget` optionally restricts the faith's first launched campaign to one
  kingdom; one of its listed holy counties must be lost. `firstByYear` guarantees an
  eligible first AI call by that year.
- `yearlyChance` controls ordinary AI checks. `crisisChance` replaces it while at
  least `crisisShare` of the combined `crisisKingdoms` is controlled by
  `crisisGroup`.
- `lossGuaranteeYears` guarantees an AI call after that many uninterrupted years in
  which any configured holy county remains under a faith outside the caller's fold.

After the first launch, the engine also considers kingdoms whose bookmark population
is predominantly the calling faith and whose current controlled development is
predominantly held outside the caller's fold. Lost holy places rank first, then the
greatest displaced development, then stable kingdom id. A faith without both a
central `head` and `head.greatHolyWar` cannot call this system; this is how core Shia
Islam remains decentralized while a mod may opt it in.

The active campaign is saved in `state.greatHolyWar`; scheduler clocks, cooldowns, and
the compact campaign record live in `state.greatHolyWarHistory`. A protagonist's vow
is `state.player.greatHolyWar`. These are additive fields and do not change save format
3. Campaign-generated rulers set `realm.religion` explicitly, while old saves and
authored realms without it fall back to the capital population faith. Player vow terms
are:

```js
{
  seasons: 4 | 8 | 12,
  desire: { kind:"crown"|"sacred"|"duchy"|"county"|"honor"|"neutral", id:null|"..." },
  beneficiary: null | charId,
  served: 0,
  mustered: false
}
```

AI attacker participant records add `vowSeasons`, `desire`, `served`, `mustered`, and
`vowOutcome`. Completed history uses locale-neutral `vowOutcome`, `desire`, `vows`,
`settlementContested`, `objections`, and compact award summaries.

New attacker settlements store
`{schema:2,case,captured,applied,pendingPlayer,awardRealms,mainRealmId?}`. The
consumer-neutral case shape is:

```js
{
  schema: 1,
  kind: "holy_war",
  seats: [realmId],
  assets: [{ id, kind, ids, awardIds, rank, land }],
  claims: [{
    claimant, asset,
    basis: { contribution, vow, occupation, right, support, office },
    weight, blessing, beneficiary, confirmation, localCadet, sourceRealm
  }],
  awards: [{
    asset, claimant, form, terms, beneficiary, runnerUp, move,
    confirmation, localCadet, sourceRealm
  }],
  step: 0,
  status: "open" | "resolved",
  standing: 2,
  nextClaimBoost: 0,
  blessingUsed: false,
  blessed: null,
  objections: 0,
  contested: false,
  playerHead: false,
  playerDiplomacy: 0
}
```

Asset kinds currently are `crown`, `sacred`, `duchy`, and `county`, but the settlement
engine does not hard-code consumer transfer behavior. Basis objects and asset kinds may
be extended. The holy-war consumer alone mutates realms after every award is collected.

Public campaign APIs are:

- `FB.greatHolyWarTargets(state, religionId)`
- `FB.canCallGreatHolyWar(state, religionId, kingdomId?, callerRealm?)`
- `FB.callGreatHolyWar(state, religionId, kingdomId, callerRealm?)`
- `FB.joinGreatHolyWar(state, camp, realmId?, vowTerms?)`
- `FB.withdrawGreatHolyWar(state)`
- `FB.greatHolyWarWithdrawalCost(state)` and
  `FB.addGreatHolyWarContribution(state, realmId, points)`
- `FB.greatHolyWarCamp(state, realmId)` and
  `FB.greatHolyWarEnemies(state, realmId)`
- `FB.resolveGreatHolyWar(state, "attackers"|"defenders", reason?)`
- `FB.greatHolyWarSettlementMove(state, move)`
- `FB.greatHolyWarSettlementChoice(state, accept)`
- `FB.greatHolyWarPlayerRewardBand(state)` (deprecated projection over the new
  likely/actual award; it does not use the old contribution thresholds)
- `FB.repairGreatHolyWar(state)`

The generic engine loaded from `js/settlement.js` exposes:

- `FB.settlement.create(spec)`
- `FB.settlement.current(settlementCase)`
- `FB.settlement.act(state, settlementCase, move)`
- `FB.settlement.repair(settlementCase, spec)`

Moves are `acquiesce`, `press`, `endorse`, `terms`, `object`, and the non-resolving
`bless`; selection-bearing moves use `{kind,claimant}`. The engine scores and records
awards but never transfers a province. Realm consumers may use
`FB.assignRealmRulerCharacter(state, realmId, charId)` to put a living non-reigning
character on a generated realm without replacing personal family links. Awarded realms
may store `sacredCustody:{religion,siteIds,campaignId,grantTurn}`.

Do not render occupation as ownership or change `state.owner` during the campaign.
`js/holywar.js` freezes objectives, maintains temporary occupation, collects settlement
awards, and applies the complete owner/holder map only after the council resolves.

The core random field events `ghw_pilgrims_under_arms` and
`ghw_swords_seeking_banner` use `ghw_has_field_host`, so they are available only to a
valid sovereign attacker or defender during the active phase with a living player host.
Their custom handlers migrate old host composition through `FB.hostUnits`, then update
the selected unit class, `host.men`, and `host.size` together and request a map redraw.
The event effects pay any recruitment price separately. Recruits therefore affect
normal composition quality, siege strength, reinforcement, and logistics immediately,
but are not saved anywhere outside that exact host.

`data/map_data.js` ends with `FBDATA.balance`: every economy/war/mortality knob in one place.
Player-capital relocation uses three signed/core numeric keys:
`capitalRelocationPrestigeCost` (200),
`capitalRelocationPopularOpinion` (-15), and
`capitalRelocationVassalFavor` (-15, applied to each direct vassal). The first is
clamped to a non-negative price; the two signed standing changes are clamped to the
ordinary -100…100 range before application.
War-of-Aggression tuning uses `warAggressionMemoryDays` (2,880),
`warAggressionPrestige` (-20), `warAggressionCommonVoice` (-8),
`warAggressionVassalStanding` (-10), `warAggressionForeignStanding` (-5),
`warAggressionEscalationPerRecent` (0.5), and
`warAggressionBreakawayPerRecent` (0.5). Signed political changes scale by
`1 + recent declarations × warAggressionEscalationPerRecent` and clamp at their normal
resource or Standing bounds. Recent declarations also multiply player-crown vassal
breakaway pressure; negative Standing compounds that pressure. Non-negative window and
multiplier values are enforced at runtime, and zero recent declarations preserve the
ordinary `breakawayChance`.
Guild-monopoly terms use this moddable table (fractional bonuses, base-gold fees):

| Grantor tier | `years` | `enterpriseBonus` | `rulerFee` | `taxBonus` | `popularOpinion` |
|---|---:|---:|---:|---:|---:|
| Baron (`3`) | 3 | 0.15 | 25 | 0.02 | -5 |
| Count (`4`) | 4 | 0.18 | 40 | 0.03 | -6 |
| Duke (`5`) | 5 | 0.21 | 60 | 0.04 | -8 |
| King (`6`) | 7 | 0.25 | 90 | 0.05 | -10 |
| Emperor (`7`) | 10 | 0.30 | 140 | 0.06 | -12 |

Religious-office tuning uses `religiousHeadWarOpinion`,
`religiousHeadWarPietyRetained`, `religiousHeadAbsolutionGold`,
`religiousHeadAbsolutionPiety`, `religiousHeadAbsolutionOpinion`,
`religiousHeadRestorePiety`, `religiousHeadRestorePrestige`,
`religiousHeadRestoreOpinion`, `religiousHeadVacancyDays`,
`religiousHeadClaimPrestige`, `religiousHeadClaimPiety`,
`religiousHeadClaimMinRealm` (county floor for vacant-office claims: the player's
demesne, an AI realm's whole bloc), and `religiousHeadClaimWarPrestige` (reward for
winning the Sunni succession war).
Great holy-war tuning uses the `greatHolyWar*` keys beside them: preparation,
resolution/collapse cooldowns, deadline, volunteer cap, siege requirement/rate/decay,
resolve shifts, withdrawal costs, and field-recruit sizes
(`greatHolyWarVolunteerMen`, `greatHolyWarKnightMen`, and
`greatHolyWarAdventurerMen`; mercenary recruits use `mercCompanySize`). Settlement weighting uses
`settlementContributionWeight`, `settlementVowWeight`,
`settlementOccupationWeight`, `settlementRightWeight`,
`settlementSupportWeight`, and `settlementOfficeWeight` (defaults `.25`, `.20`, `.20`,
`.15`, `.10`, `.10`). The legacy `greatHolyWarCrownShare`,
`greatHolyWarDuchyShare`, and `greatHolyWarCountyShare` keys remain readable for old
mods but no longer decide an award.
`religiousHeadWarPietyRetained` is a multiplier on the attacker's current piety
(the core value `0` forfeits it all); the opinion fields are signed changes.
The top-level `currency` presentation schema is documented above. The deprecated
`balance.coinageSymbol` alias changes only the topbar purse icon when no full currency
definition is active; it never renames internal gold or alters amounts, costs, or contracts.
`mortalityBase` scales the whole yearly mortality curve for player and kin alike
(0.012 is the as-authored baseline; halve it for longer lives, raise it for a crueler age).
Learned-career examinations use `careerExamBaseChance`,
`careerExamLearningBonus`, `careerExamSkillBonus`, `careerExamMaxChance`, and
`careerExamCooldownDays`. The chance begins at the base, adds the Learning bonus for
each effective Learning point above its requirement and the skill bonus for each point
above every other required skill, then caps at the maximum. Failed attempts wait the
cooldown in game days. `learnedPractitionerMortality` is the default yearly mortality
reduction for a licensed Medicine practitioner without a specialty; specialty
`fx.mortality` replaces it, and only the household's single best local provider applies.
`richChildMortalityBonus` is the fraction of childhood mortality removed per
station above serf for the household's own children (and a child protagonist),
and `richChildHealthChance` the yearly chance per station that such a child
gains a point of health, up to 8.
That includes the wider-family simulation: `kinMarryChance` and `kinChildChance` are the
per-year chances that an adult kinsman weds, and that a wed kinswoman bears a child.
`kinConceiveCap` (core 0.75) upper-bounds the effective yearly kin conception chance, so
stacked fertility multipliers stay a probability instead of a certainty. `familyMaxChars`
(core 4000) bounds the player family's tracked character records, living and dead: past
it, unscripted kin weddings and kin births pause (sealed betrothals still wed), keeping
the save inside the browser's localStorage quota and the kin scan's per-day cost flat.
`fertilityByAge` shapes how age wears on conception: per sex (`f`/`m`), a list of
`[age, multiplier]` points read by `FB.ageFert` — flat before the first point, linear
between points, flat past the last. The default curve holds women at full fecundity
through 25, slides gently to 30, drops sharply after 35, and nears nil at 45 (past 45
conception is impossible regardless); men stay full through 40 and decline mildly into
old age. The multiplier stacks with trait leanings and each character's hidden
fertility roll at every conception site (the player's household and kin alike).
The marriage-of-station knobs live there too: `dowryByStation` (gold by the spouse's rank
0–4; the bride's house pays, and protagonist courtship snapshots the resulting
amount/direction before proposal), `marryUpPrestige` / `marryDownPrestigeLoss` (per step of difference),
`proposalStationPenalty` (chance lost per step the suitor stands above the player).
`wivesByGroup` is deprecated compatibility data used only when a legacy faith has no
effective `properties.marriage`; new spouse limits belong in the faith graph.
Rivalry tuning uses `rivalOpinionThreshold`, `rivalClaimChance`,
`rivalContactMaxAge`, `rivalHeatPlayerStart`, `rivalHeatNpcStart`,
`rivalHeatLegacyStart`, `rivalHeatOldSave`, `rivalContactHeat`, `rivalHeatDecayDelay`,
`rivalHeatDecay`, and `rivalPeaceDays`; time values are game days.
`itemSellRatio` is the fraction of an item's `value` a buyer pays when the player sells it.
Ordinary elevation from gentry to baron uses `baronyPrestige` and `baronyOpinion`;
both the petition deed and unsolicited offer require those thresholds, as well as a
gentle house established by an earlier generation of the line.
`liegeGrantRepeatMult` is the multiplier applied to grant odds for each successful barony,
title, neighboring fief, or court-awarded escheat already received in the current lifetime.
Skills are uncapped but grow on a diminishing-return curve: below `skillSoftCap`
(default 20) every gain lands; from 20 onward each point must beat a
`(skillSoftCap / current)^2` roll (`FB.gainSkill`, js/model.js). At and beyond
`skillMasteryThreshold` (default 40), that chance is further multiplied by
`(skillMasteryThreshold / current)^skillMasteryPower` (default power 8). With the
defaults, per-attempt chances include 40→41 at 25%, 41→42 at 19.5%, 45→46 at
7.7%, 50→51 at 2.7%, and 60→61 at 0.43%. Advancement uses the raw trained skill;
traits and equipped items do not make training harder, while `FB.skillOf` returns
their full combined value with no upper ceiling. The former `skillHardCap` key is
no longer read; older mods that set it must migrate to `skillMasteryThreshold` and
`skillMasteryPower`.
`focusSkillGainRate` (default 0.75) multiplies only the authored seasonal skill-training
chances of daily focuses before they are converted to daily rolls.
`wartimeNecessitiesSurcharge` (default 0.25) is the fraction of station upkeep plus
resident-family provisions added each season while the sovereign returned by
`FB.playerRealmId` is at war. It does not multiply retainers, schooling, buildings, or
other authored costs.
`levyPerMartial` grows the player's levy by that fraction per point of the ruler's martial
skill (traits and carried items included), on top of the per-development base, building
`levy` bonuses, and the `levy` tech multiplier.
Political attention uses `politicalAttentionCount` for counts and dukes,
`politicalAttentionKing` for kings, and `politicalAttentionEmperor` for emperors.
`foreignPolicyBase` is the opinion moved by an assignment each season and
`foreignPolicyDipCap` caps the additional Diplomacy contribution (Diplomacy / 20).
Foreign opinion adds `opinion / foreignOpinionEnvoyDivisor` to envoy success.
For AI declarations against the player it multiplies the base chance by
`1 - opinion / 100`, clamped between `foreignOpinionAttackMin` and
`foreignOpinionAttackMax`.
The field-army knobs drive the hosts on the map (`js/armies.js`): `armyMarchDays` (days to
cross one land province), `armySeaTransportBase` (national men per crossing cycle without
a completed transport tier), and `armySeaCrossings` (the `cycleDays` and `capacityMult`
for `narrow`, `coastal`, and `open` water legs). Effective crossing capacity is the
rounded national capacity times the class multiplier; an indivisible host needs
`ceil(men / effective capacity)` cycles and remains on the departure county until all
cycles finish. `armyRearmDays` (how long a shattered host must wait to muster
again), `armyReinforceRate` (the fraction of its mustered size a host resting on home
land refills per day), `armyDemusterKeepOwn` / `armyDemusterKeepRealm` /
`armyDemusterKeepOther` (the share of a voluntarily de-mustered host preserved for the
war's next muster — standing on the player's own county / elsewhere in the player's
sovereign realm / anywhere else; the cap is applied after levy modifiers and the
ordinary `armyMinMen` floor cannot add replacements), `aiHostPerDev` (AI host size = realm development ×
`levyPerDev` ×
this), and `battleWinLoss` / `battleLoseLoss` (battle casualty fractions — the winner's
scales with how close the fight was).
Player logistics use `hostLogisticsBase` (default 2) once for any raised host;
`hostLogisticsLevyPer100` (0.5), `hostLogisticsArcherPer100` (1), and
`hostLogisticsCavalryPer100` / `hostLogisticsRetinuePer100` (2 each) multiply each
100 live soldiers of that class;
`hostLogisticsMercenaryCompany` (4) is charged for each hired company. A missing
player host produces no logistics cost. These rates apply equally to ordinary and
sovereign great holy-war hosts.
Loss-aware desertion uses `warDeserterMinCasualties` and
`warDeserterMinCasualtyRate`; the larger absolute-or-initial-host threshold is required.
`warDeserterDefeatWindowDays` defines how recently the host must have lost, while a
current two-loss streak also qualifies, and `warDeserterIntervalDays` limits resolution
to once per that many campaign days. `warDeserterLossMin` / `warDeserterLossMax` bound
the seeded fraction removed from the live host. Paying costs the ceiling of current
seasonal upkeep times `warDeserterPayUpkeepSeasons`, with `warDeserterPayMin` as the
minimum.
