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

`FB.warCauses(state)` is the authoritative declaration API. It returns semantic records
with this common shape:

```json
{
  "type": "dejure | fabricated | restoration",
  "target": "<province id>",
  "enemy": "<sovereign realm id>",
  "titleKind": "duchy | kingdom | empire | null",
  "titleId": "<de jure title id or null>",
  "titleName": "<display title or null>",
  "blocked": "pact | alliance | null"
}
```

Only fields relevant to the cause are present. `restoration` targets the claimant
crown's current capital; `fabricated` refers to `player.fabricatedClaim.pid`; `dejure`
uses the most specific title the player actually holds. Passing `true` as the second
argument includes pact/alliance-blocked records for explanatory UI. `FB.warTargets`
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
  "provinces": [ ... ],
  "realms":    [ ... ],
  "empires":   { "id": { ... } },
  "kingdoms":  { "id": { ... } },
  "duchies":   { "id": { ... } },
  "events":    [ ... ],
  "straits":   [ ["provA","provB"] ],
  "scripted":  [ ... ],
  "cultures":  { "id": { ... } },
  "religions": { "id": { ... } },
  "traits":    { "id": { ... } },
  "ailments":  { "id": { ... } },
  "buildings": { "id": { ... } },
  "tech":      { "id": { ... } },
  "holdings":  { "id": { ... } },
  "careers":   { "id": { ... } },
  "positions": { "id": { ... } },
  "schooling": { "id": { ... } },
  "enterprises": { "id": { ... } },
  "travelPurposes": { "id": { ... } },
  "travelSites": [ ... ],
  "finance":    {
    "pledge": { ... }, "merchant": { ... }, "revenue": { ... },
    "tradePartnership": { ... }
  },
  "plots":     { "id": { ... } },
  "items":     { "id": { ... } },
  "settlementNames": { "cultureId": { "pre": [...], "suf": [...] } },
  "titles":    { "christian": ["Serf", "..."] },
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
polygons remain visible. **You never draw province borders** — you place a seed point
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
- Adjacency is computed automatically from the generated shapes. For connections across
  water, add a `straits` pair.

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
- Set some provinces' `realm` to its id (re-declare those provinces in the mod — same id
  replaces). `aggression` 0–2 drives the war AI.
- **Counts and dukes inside a realm are generated by the engine** — you only author
  realms above that level. The map colors the *sovereign top* of each liege chain;
  `state.holder` tracks who holds each county directly.
- An optional initial ruler is
  `"ruler":{"name":"Name","sex":"m","culture":"frankish","born":1028,"mar":14,"trait":"ambitious"}`.
  These authored fields are copied verbatim at campaign creation. The culture and trait
  ids must exist; generated vassals, succession children, and later rulers remain seeded.

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
      "scripted": []
    }
  }
}
```

Activation rejects a bookmark with duplicate ids; missing or cyclic lieges; missing
capitals; invalid province realm/de-jure/culture/faith references; development outside
1–10; broken straits; or invalid scripted targets. `religiousHeads` is optional; when
present it is an exact religion-id to authored-realm-id map. Every faith must define
`religion.head`, and every mapped realm must exist in this complete bookmark. Omitting
the map falls back to each faith's global `head.realm`, which is suitable only when the
same realm id exists in every bookmark. Bookmark ids use letters, digits, and
underscores. Preserve an existing county id when it still denotes the same place; give
genuinely different geography a new stable id, and never recycle a retired id.

A legacy mod that changes `provinces`, `realms`, `empires`, `kingdoms`, `duchies`,
`straits`, `scripted`, `land`, `seas`, or `bounds` without supplying a complete
`bookmarks.1066` definition hides 1066 from the new-game picker and explains why.
Its 867 games still work. Ordinary non-world mods expose both built-in dates, and
matching stamped saves retain access to their recorded bookmark even when it is hidden
from new-game selection.

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
| `professions` | any of `farmer craftsman merchant soldier monk priest noble` |
| `minAge` / `maxAge`, `sex` | `"m"`/`"f"` |
| `seasons` | array of 0 spring … 3 winter |
| `yearMin` / `yearMax` | calendar gate |
| `married`, `hasChildren`, `hasYoungChild` | booleans |
| `goldMin/Max`, `prestigeMin`, `pietyMin`, `leaMin` | resource gates |
| `healthMax` | player health at or below (0–10) |
| `flags` / `notFlags` | player flags set by other events |
| `buildings` / `notBuildings` | building ids standing (or not) anywhere in the player's demesne |
| `techs` / `notTechs` | innovation ids adopted (or not) by the player's line |
| `holdings` / `notHoldings` | household holding ids owned (or not) by the family |
| `religionGroup` | `christian muslim pagan jewish` (player's) |
| `religionGroups` | array form: any of the listed groups matches |
| `cultures` | array of culture ids — any matches the player's culture |
| `provinceReligionGroup`, `provinceCultures`, `terrains`, `coastal` | home province checks |
| `atWar`, `realmAtWar`, `liegeAtWar`, `isVassal`, `isLiege` | war/politics (`isLiege`: the player has vassals of their own) |
| `hasRole` / `noRole`, `roleOpinionAbove/Below` | `{role, value}`; roles: `lord priest friend rival spouse suitor` |
| `rivalHeatMin` / `rivalHeatMax` | active rivalry heat at or above/below the number (0–100) |
| `popularOpinionBelow` | the commons' view of you |
| `chance` | final random gate 0–1 |
| `custom` | name of a `FB.fns` function; must return true for the event to fire (built-ins: `war_can_siege`, `war_no_enemy_host`, `war_can_hunt`, `can_afford_item`, the marriage-station checks `suitor_above_station` / `wed_above_station` / `wed_below_station`, and the royal-council gates `council_has_members` / `council_two_members` / `council_has_schemer` / `council_has_sycophant` / `council_scheme_ripe` / `council_scheme_watched` / `council_charter_due` / `council_has_unseated`, and the estates gates `parliament_has_scutage` / `parliament_redress_possible` / `parliament_scutage_possible`, and the finance investability gate `finance_can_invest`) |
| `never` | only fired by other events' `queue` |

`weight` (default 5) sets relative frequency; `once: true` fires once per life; `cooldown` is in
seasons (a season lasts 90 in-game days — the engine converts). Random events land on 1–2
random days per season (one extra in wartime); queued events (`queue`) fire the next day.

`wartime: true` (top-level, next to `weight`) marks an event as fit for a war footing. While
the player is **personally at war** — fighting their own war, soldiering in a realm at war,
or riding with the liege's host — random picks draw *only* from wartime events; ordinary
life waits for peace. Queued events always fire regardless.

`warStatus: true` adds the current localized host, enemy, siege, and advance summary as a
separate paragraph below the event text. Use this instead of embedding a `{warstate}` token:
the summary has its own grammar and may contain several clauses.

`childhood: true` works the same way for minor heirs: while the player is **under 16**,
random picks draw only from childhood events. Give child-only events a `maxAge: 15` trigger
too, so they stop at adulthood; age-neutral events (sickness, plague, omens) carry the tag
alongside their normal triggers and serve both pools.

### Option fields

`label`, optional `desc` (a short hint shown beneath the label in the event dialog —
every option should carry one: vague flavor pointing at the thrust of the choice,
never exact numbers), optional `require` (same syntax as triggers — hides the option),
optional `chance` (0–1, or a named formula: `harvest battle proposal rival_peace house_claim annulment
skill_dip skill_ste skill_int skill_lea rights_dip rights_ste rights_int rights_lea swarm
liege_grant war_battle plot plot_discovery fabricate_claim appeal_outcome
vassal_comply county_petition parliament_vote travel_trade`) with `success` / `failure`
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

Marrying up also pays out at the end: when a spouse of higher station dies, `FB.spouseDied`
queues `widow_settlement` (no living child of that blood) or `house_claim` (there is one —
pressing it uses the `house_claim` named chance; success can raise a tier-0/1 widow(er) of
a noble into the gentry). Their payouts scale off `dowryByStation` via the custom effect
fns `dower_take dower_take_full claim_won claim_lost claim_sold` (js/events.js), and their
texts use the `{late}` token (the dead spouse's name, carried in the event ctx).

Faith sets the rest of the rules (`FB.marriageDoctrine` in js/model.js). Muslim, pagan, and
Jewish players may divorce from the spouse's character sheet (the mahr/ketubah owed scales
off `dowryByStation`; pagans pay in prestige instead); Christians must petition the church —
the `annulment_plea` event, decided by the `annulment` named chance and settled by the
`annul_granted` fn, one plea a year. Men of faiths listed in `balance.wivesByGroup`
(default: Muslim 4, pagan 3) may hold that many wives at once — every wife can bear
children, the first is the one `{spouse}` and the spouse role address, and the next in
line is promoted when she dies or is set aside (`FB.spousesOf` / `FB.canWed` /
`FB.promoteSpouse`). The married may also weave the `widow_veil` plot (map_data.js) to be
rid of a spouse the darker way — its resolution is `plot_spouse_end`.

### Effects

`gold prestige piety health warService` (numbers — warService is the lifetime tally of
service in the liege's wars) · `skills: {dip|mar|ste|int|lea: n}` (positive gains
go through `FB.gainSkill`, so the soft cap applies — see balance below) ·
`addTrait / removeTrait` · `ailment: "id"` (a named wound/sickness from `FBDATA.ailments`) ·
`setFlag / clearFlag` (+`setFlag2`/`clearFlag2` for a second one) ·
`opinion: {role, amt}` · `opinionLiege`, `popularOpinion` ·
`rivalContact: {role, score, cause}` (record an explicitly hostile encounter with that
existing named role; `score` defaults to 1, `cause` is an opaque non-localized id, and
contact with the active rival also adds `score × balance.rivalContactHeat` heat) ·
`rivalHeat: n` (adjust the active feud, clamped 0–100) · `endRivalry: true` (clear the
rival seat, its plot/escalation state, and begin the peace cooldown) ·
`tierSet` (raise rank), `tierUp`
(liege grants land) · `profession`, `restoreProfession` · `queue: "event_id"` (chain events) ·
`marry`, `clearSuitor`, `focusSet: "<focus id>"` · `adoptChild`, `killChild`, `killRole`, `educateChild` · `moveRandom` ·
`convertToProvince` · `declareIndependence` · `devUp` · `research: n` (scholarship points) ·
`travelReturn: true` (begin the saved route home once the minimum stay is complete) ·
`travelSettle: true` (move the household to an eligible completed destination without
converting culture/faith; limited to one permanent move per character life) ·
`holding: "id"` / `loseHolding: "id"` (grant or take household property) ·
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
liege-chain and vassalage handlers `appeal_win appeal_lose vassal_release vassal_crush
vassal_reclaim vassal_refuse vassal_favor vassal_snub vassal_insist county_petition_grant
record_liege_grant` and the
disguise-at-war story fns `polly_court` (spawns the followed soldier into the `{suitor}` role) /
`polly_rout` (the small mortal-wound roll on a lost shield-wall) live in `js/events.js`;
the downfall handlers `df_fall df_fall_flee` (lose every title and acre, back to landless
gentry — the second flees abroad) live in `js/world.js`; the finance trade-investment
handlers `finance_trade_20 finance_trade_50` (commit merchant coin to a four-season trade
partnership at the given base stake) live in `js/economy.js`; targeted-plot handlers
`fabricate_claim_success fabricate_claim_failure plot_discovery_success
plot_discovery_failure` live in `js/actions.js`; mods may register their own before use).

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

`{name} {dyn} {title} {spouse} {suitor} {late} {lord} {priest} {friend} {rival} {childname}
{province} {location} {destination} {realm} {enemy} {settlement} {god} {holy} {temple} {year}` work in titles,
texts, labels, and `log`. `{enemy}` is the realm the player is at war with (or "the
enemy"); `{target}` is the province an attacking war aims at; `{settlement}` reads
`ctx.settlement` (set by the go-into-town deed's queue); `{item}` and `{itemprice}`
describe the currently offered item (`player.itemOffer`); `{liege}` is the player's direct
liege realm; `{rname}` / `{rulername}` are the realm and ruler named by `ctx.rid` (set by
appeal/revoke pickers and vassal events); `{cname}` is the county named by `ctx.pid`.
`{location}` is the traveler’s current county (or `ctx.locationId`) and
`{destination}` is the journey destination (or `ctx.destinationId`).
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
   `text`, `log`) may be an object keyed by religion group instead of a plain string:

   ```json
   "text": { "default": "…a pig, a bolt of cloth…",
             "muslim":  "…a lamb, a bolt of cloth…" }
   ```

   The player's religion group picks the variant; `default` covers everyone else and is
   required.
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

An event with `"nameChild": true` (used by `child_born_flavor`, queued with `ctx.childId`)
shows a name field above its options, prefilled with the child's generated name and a dice
button that rerolls from the child's culture. Whichever option is chosen applies the edited
name (an empty field keeps the old one); an autoresolved event keeps the generated name.

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
- `wage` / `masterWage` are seasonal contributions from resident non-player
  household workers who are not staffing an enterprise.
- `guild: true` enables member → master → officer → guildmaster progression.
- `maleOnly: true` is reserved for historically sex-gated training such as arms.
- `religionGroups` limits a career to characters whose faith belongs to one of the listed
  groups; core Clerical Service uses `christian` and `muslim`.
- `piety` is a seasonal piety contribution from clerical careers (monk, priest).
- `hiddenChoice: true` keeps a career out of the player's chooser — it is entered only
  through an event or a marriage/background — though the household still works it.
- Owned character state lives in `character.career`; `player.profession` mirrors the
  current head's exact occupation for existing `professions` event triggers. Feudal station
  is separate: gaining land or a title does not erase a merchant, clerical, or military
  occupation.

Core Catholic and Muslim religious ladders live in `js/economy.js`, separately from moddable
career rank labels. Per-character progress is saved in `character.religiousRanks`; unsupported
faiths simply receive no core ladder. Formal religious offices may raise `character.station`,
and the player's abbot/qadi/bishop/chief-qadi milestones also preserve the legacy tier and flag
effects used by events and titles.

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
  "cost": 1, "chance": 0.5, "devMin": 2,
  "focuses": ["dip", "ste", "lea"],
  "desc": "Letters, figures, rhetoric, and law."
} } }
```

- `cost` is gold charged at each 90-day season boundary.
- `chance` is the full four-term yearly chance of gaining the directed focus skill,
  before household education bonuses and the global cap.
- `devMin` optionally requires that development in the home county.
- `focuses` optionally limits the education focuses the school can teach.
- `name`/`desc` accept the same localization tokens and faith-variant objects as
  other structured data.
- The built-in `master` id is special: its chance comes from the attached tutor
  character's focused skill rather than a fixed `chance`.
- Current instruction lives in `character.edu.school`; the accumulated value of
  completed terms lives in `character.edu.lessonBoost`.

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
  that career may staff the enterprise. `guildRank` optionally sets the minimum
  guild standing.
- Siting gates are `devMin`, `coastal`, and `terrains`, matching building gates.
- `yield` is the base seasonal gold before worker skill, local development, and guild
  rank modify it.
- Instances live in `player.enterprises` as
  `{uid,type,provinceId,settlement,workerId}`. One type may stand once per settlement,
  but the family may own further copies elsewhere; repeat cost grows by
  `balance.enterpriseRepeatCostGrowth`.
- An idle or invalidly staffed enterprise earns nothing.

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
      "cost": 4, "mode": "sites"
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
- A site carries `id`, `purpose`, and `provinceId`; optional `religions` and
  `religionGroups` restrict it to the traveler’s faith.
- Routes use settled, non-wasteland adjacency. Entries in `straits` therefore
  work as travel crossings too.
- Travel events are normal event objects with `trigger:{"never":true}` and
  top-level `travel:{"kind":"culture|road|capstone|decision|work"}`. A capstone
  or work event may add `"purpose":"id"`. Culture/road events are drawn without
  repetition up to the journey caps; destination work events repeat but never
  immediately repeat the last story. The core driver queues a purpose’s capstone
  by the id `travel_capstone_<purpose id>`.
- `balance.travelLegDays`, `travelCooldownDays`, `travelCultureEventCap`, and
  `travelRoadEventCap` tune the road. `travelMinStayDays`,
  `travelWorkEventMinDays`, `travelWorkEventMaxDays`, `travelSettleOfferDays`,
  and `travelSettleWorkEvents` tune destination life and permanent settlement.

## Finance contracts

`FBDATA.finance` (in `data/economy.js`, mod key `finance`) defines the three
player-originated loan families and the trade partnership:

```json
{ "finance": {
  "pledge": {
    "maxPrincipal": 40, "markup": 0.25, "termSeasons": 4,
    "collateralRatio": 0.60, "lender": "moneychanger",
    "defaultKind": "collateral"
  },
  "tradePartnership": {
    "termSeasons": 4, "risk": 0.25, "profitShare": 0.45
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
- Finance and price bounds, pressure, loan count, capacity, arrears, default,
  revenue-share, and coinage tunables are the `price*` and `finance*` keys under
  `FBDATA.balance`.
- Household and education costs/chances use the `household*` and `education*`
  balance keys. Personal relationships use `socialAttentionCapacity` (core 1),
  `socialAttentionDailyOpinion` (fixed Regard per ordinary day; core 0.2),
  `relationshipOpinionThreshold` (shared Call friend / proposal gate; core 40),
  `socialGiftCooldownDays` (one explicit cash or item gift per recipient; core 90),
  `socialCashGiftOpinion` (core 4), and the three-entry `socialItemGiftOpinion`
  array (core `[4,8,12]`). `friendOpinionThreshold` is a deprecated fallback for older
  data sets; new mods should define the shared relationship threshold. Council, realm,
  wedding, and authored event gifts do not use the personal-gift cooldown. Other Network
  tunables include `retainerCapacity`, `guildFavorStandingCost`, `guildFavorCooldown`,
  `vassalLevyFavorRate`, and `vassalLevyFavorDays`.

## Settlements

Each province holds 2–4 named settlements, generated **deterministically** from the
province id (`FB.settlementsOf` — a plain hash, never the seeded RNG) with culture-flavored
name parts from `FBDATA.settlementNames` (in `data/cultures.js`; the `settlementNames` mod
key merges per-culture sets, `default` covers the rest). Size follows current development:
the head settlement grows village → town → city as dev rises. The "Go into town…" deed
lists them and queues `visit_village` / `visit_town` / `visit_city` — ordinary event data
whose options are `require`-gated by tier, profession, and faith, with the chosen
settlement's name in `{settlement}`. Replace those events to change what a day in town
offers.

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

- `rarity` — `common` / `fine` / `famed` weights random draws (famed pieces mostly arrive
  as war spoils and finds); `value` is the purchase price.
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
- `player.items` stores exact references, not necessarily definition ids.
  `state.itemInstances` resolves generated references and `player.loadouts` assigns them.
  Never push/splice those arrays from a mod custom function. Use `FB.grantItem`,
  `FB.transferItem`, `FB.equipItem`, `FB.unequipItem`, `FB.pledgeItem`,
  `FB.sellItem`, `FB.giveItem`, and `FB.destroyItem`.
- Item cards list actual quality-adjusted powers, value, wearer, and valid actions.
  Ordinary Plain/Well-made/Masterwork gifts and unique common/fine/famed items map their
  three tiers through `balance.socialItemGiftOpinion` (core: +4/+8/+12 Regard). Explicit
  personal item gifts share the recipient cooldown described above. An equipped item must
  be removed before gift, sale, or pledge.
- Event hooks (`custom` effects): `offer_item` (the full eligible table) and
  `offer_gear` (ordinary gear only) put an exact object on sale through `item_offer`;
  `buy_item` / `clear_item_offer` / `can_afford_item` (trigger),
  `loot_item` (random spoils), `find_artifact` (famed only), `plot_loot` (spoils + ends the
  plot). Owned unique objects are excluded while repeatable templates may recur. War
  victories and raids also issue exact spoils. To grant one **specific definition**, use
  the `giveItem: "id"` effect; it creates a new instance when that definition is repeatable.

## Plots, blessings, and pacts

**Plots** (`FBDATA.plots` in `data/map_data.js`) drive the intrigue game. The "Begin a
plot…" deed offers every plot whose `trigger` (standard trigger syntax) passes; beginning
one switches the player to the Scheming focus, which accrues `need` power over the days —
with a daily discovery risk — then queues the plot's resolution `event`. Resolution events
are ordinary event data: use the `plot` named chance for the attempt, and end every option
with `{ "custom": "plot_end" }` so the plot clears and the old focus returns:

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

`FBDATA.tech` (in `data/map_data.js`) defines innovations tier-3+ rulers adopt with
**scholarship** (`player.research`, earned by the Patronize scholars focus, the library
building, and events; spent via the "Adopt an innovation…" deed). Adopted ids live in
`state.tech` and persist across generations — the backbone of playing tall:

```json
{ "tech": { "windmills": {
  "name": "Windmills", "icon": "🌬", "cost": 80, "yearMin": 1000, "req": "heavy_plough",
  "desc": "Grinding grain wherever the wind blows. (+10% tax)", "fx": { "tax": 0.10 } } } }
```

- `cost` scholarship · `yearMin` calendar gate · `req` prerequisite tech id.
- `repeat: true` makes the innovation re-adoptable (the capstones of the three trees):
  it stays in `FB.techAvailable` after adoption, each further rank appends the id to
  `state.tech` again (so `FB.techBonus` sums it once more) and costs
  `cost × balance.techRepeatCostGrowth^(ranks held)` via `FB.techCost`.
- `fx` keys, summed across adopted techs by `FB.techBonus`: `tax`/`levy` (fractional
  multipliers), `battle` (added to war odds), `build` (fractional building discount),
  `devCap` (+development ceiling in the player's own provinces, past the usual 10),
  `health` (lower yearly mortality for the ruler), `research` (+scholarship per season),
  `retinue`/`archers` (flat men of that class mustered with the host).
- `name`/`desc` accept text tokens and religion-variant objects.
- Events can grant scholarship with the `research` effect and gate on `techs`/`notTechs`.
- Buildings may carry a `research` per-season key (see the library).

## Cultures, religions, traits, titles, balance

See `data/cultures.js` and `data/traits.js` for the exact culture and trait shapes.
A religion has `name`, `group`, and `icon`, plus an optional centralized religious
office:

```json
{ "catholic": {
  "name": "Latin Christianity", "group": "christian", "icon": "✝",
  "head": {
    "realm": "papacy",
    "title": "Pope",
    "recovery": "grant_seat",
    "seat": "roma",
    "restoredRank": 3,
    "sameFaithWar": "sacrilege"
  }
} }
```

`head.realm` is the global initial/canonical realm fallback when the active bookmark has
no `religiousHeads[religionId]`; `head.title` is localized pure-display text. The live
mapping is saved independently, may be reassigned to another realm, and may be
explicitly vacant with `null`. `state.religiousHeadVacancies[religionId]` then records
`{"turn":1234,"formerHolder":"papacy"}`. It is never inferred from capital faith or
territorial rank, and absorbing or conquering the holder never makes the office
hereditary. Religions without `head` metadata have no centralized office.

`head.recovery` is `grant_seat` or `claim`. A `grant_seat` office requires `seat` and
may set `restoredRank` (default 3); recovery grants that county to a fresh independent
copy of the bookmark's canonical realm. A `claim` office supplies alternative complete
county sets in `claimCounties`, for example:

```json
{ "head": {
  "realm": "abbasid",
  "title": "Caliph",
  "recovery": "claim",
  "claimCounties": [ ["baghdad"], ["mecca", "medina"] ],
  "sameFaithWar": "ordinary"
} }
```

Each inner array is one sufficient alternative. Core player/AI rank and resource gates
remain engine rules; claiming attaches the office to an existing realm without moving
land. `sameFaithWar` is `ordinary` or `sacrilege`. Core `sacrilege` policy leaves player
causes legal behind a second confirmation, blocks ordinary same-faith AI selection, and
protects the office realm's counties from incidental same-faith AI captures.

Core and custom systems should query `FB.religiousHeadOf(state, religionId)`,
`FB.religionsHeadedBy(state, realmId)`, or
`FB.isReligiousHead(state, realmId, religionId?)`; use
`FB.religiousHeadTitle(state, religionId)` for the localized title. These APIs match
exact religion ids, not broad religion groups. Generic rank words remain in
`FBDATA.titles`; in core data, Muslim tier 7 is Great Sultan/Great Sultana because
Caliph is reserved for the Sunni office.
Realm-death and recovery code should use `FB.markRealmDead`,
`FB.vacateReligiousHeads`, `FB.assignReligiousHead`,
`FB.canRestoreReligiousHead` / `FB.restoreReligiousHead`, and
`FB.canClaimReligiousHead` / `FB.claimReligiousHead` so assignments, vacancy clocks,
and durable notices remain consistent.

`data/map_data.js` ends with `FBDATA.balance`: every economy/war/mortality knob in one place.
Religious-office tuning uses `religiousHeadWarOpinion`,
`religiousHeadWarPietyRetained`, `religiousHeadAbsolutionGold`,
`religiousHeadAbsolutionPiety`, `religiousHeadAbsolutionOpinion`,
`religiousHeadRestorePiety`, `religiousHeadRestorePrestige`,
`religiousHeadRestoreOpinion`, `religiousHeadVacancyDays`,
`religiousHeadClaimPrestige`, and `religiousHeadClaimPiety`.
`religiousHeadWarPietyRetained` is a multiplier on the attacker's current piety
(the core value `0` forfeits it all); the opinion fields are signed changes.
The top-level `currency` presentation schema is documented above. The deprecated
`balance.coinageSymbol` alias changes only the topbar purse icon when no full currency
definition is active; it never renames internal gold or alters amounts, costs, or contracts.
`mortalityBase` scales the whole yearly mortality curve for player and kin alike
(0.012 is the as-authored baseline; halve it for longer lives, raise it for a crueler age).
That includes the wider-family simulation: `kinMarryChance` and `kinChildChance` are the
per-year chances that an adult kinsman weds, and that a wed kinswoman bears a child.
`fertilityByAge` shapes how age wears on conception: per sex (`f`/`m`), a list of
`[age, multiplier]` points read by `FB.ageFert` — flat before the first point, linear
between points, flat past the last. The default curve holds women at full fecundity
through 25, slides gently to 30, drops sharply after 35, and nears nil at 45 (past 45
conception is impossible regardless); men stay full through 40 and decline mildly into
old age. The multiplier stacks with trait leanings and each character's hidden
fertility roll at every conception site (the player's household and kin alike).
The marriage-of-station knobs live there too: `dowryByStation` (gold by the spouse's rank
0–4), `marryUpPrestige` / `marryDownPrestigeLoss` (per step of difference),
`proposalStationPenalty` (chance lost per step the suitor stands above the player), and
`wivesByGroup` (wives a man of each religion group may hold; unlisted groups are monogamous).
Rivalry tuning uses `rivalOpinionThreshold`, `rivalClaimChance`,
`rivalContactMaxAge`, `rivalHeatPlayerStart`, `rivalHeatNpcStart`,
`rivalHeatLegacyStart`, `rivalHeatOldSave`, `rivalContactHeat`, `rivalHeatDecayDelay`,
`rivalHeatDecay`, and `rivalPeaceDays`; time values are game days.
`itemSellRatio` is the fraction of an item's `value` a buyer pays when the player sells it.
Ordinary elevation from gentry to baron uses `baronyPrestige` and `baronyOpinion`;
both the petition deed and unsolicited offer require those thresholds, as well as a
gentle house established before the current generation.
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
cross one province), `armyRearmDays` (how long a shattered host must wait to muster
again), `armyReinforceRate` (the fraction of its mustered size a host resting on home
land refills per day), `aiHostPerDev` (AI host size = realm development × `levyPerDev` ×
this), and `battleWinLoss` / `battleLoseLoss` (battle casualty fractions — the winner's
scales with how close the fight was).
