# Mod-configurable currency presentation

Status: implemented

## Goal

Let a runtime JSON mod replace the way every monetary amount is presented without
changing the economy underneath it. One formatter and one mod schema should support:

- ordinary game gold;
- single-unit currencies such as florins;
- decimal currencies such as dollars and cents;
- compound currencies such as pounds and shillings;
- three-level currencies such as pounds, shillings, and pence;
- custom or fantasy denominations.

Currency conversion is display-only. Existing costs, income, loans, contracts,
event effects, balance values, and saved purses retain their current numerical
meaning. A mod may separately override those balance values, but changing the
currency definition alone must never rebalance a life.

## Recommendation

Keep `gold` as the permanent internal resource and modding API:

- `player.gold` remains the liquid balance;
- `gold`, `goldMin`, costs, rewards, loans, faces, stakes, and collateral values
  remain ordinary numbers in game gold;
- `state.economy.price` continues to measure nominal coin per game gold;
- save format remains version 3;
- existing mods that author `gold` effects or balance values continue to work.

Add a top-level `FBDATA.currency` presentation definition and route every displayed
amount through a deterministic `FB.money` formatter. Do not rename internal fields,
convert saved balances, or store rendered currency strings in state.

One internal game gold should default to one major display unit. A sterling mod can
therefore render `12.5` game gold as `£12 10s` without altering what the household
can buy.

## Non-goals

This feature does not add:

- exchange rates between realms or cultures;
- separate purses denominated in different coins;
- historical bullion weights or fluctuating metal content;
- currency-specific economic balance;
- automatic conversion of a mod's authored costs;
- parsing or replacement of arbitrary prose at runtime;
- formatted money strings in save data;
- a save-format migration.

Coin debasement and the price index remain gameplay systems described in
`docs/designs/finance.md`. A currency definition changes their presentation, not
their calculations.

## Existing foundations and constraints

The current implementation already has a narrow compatibility hook:
`balance.coinageSymbol` replaces the topbar money-bag icon. It is deliberately
cosmetic and does not rename gold elsewhere.

Other relevant foundations are:

- runtime JSON mods merge into `FBDATA` before a world is generated;
- the exact stored mod texts are included in the save's mod fingerprint;
- all core simulation values remain serializable numbers;
- durable Chronicle entries use message descriptors and render at display time;
- UI and data prose already pass through the localization layer;
- new mod-authored text falls back to its English source;
- the game must continue to run directly from `file://`.

The implementation must not infer money by searching rendered text for the word
"gold." Monetary meaning must be explicit at the formatting boundary.

## Currency schema

Add `currency` as a supported top-level runtime-mod key. Applying a later currency
definition replaces the earlier definition as one atomic object; do not deep-merge
denomination arrays.

Example sterling definition:

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
internal game gold. Each denomination's `value` is also measured in that smallest
unit. The example therefore defines:

- 1 game gold = 240 pence;
- 1 pound = 240 pence;
- 1 shilling = 12 pence;
- 1 penny = 1 penny.

The formatter rounds only the displayed result to the nearest smallest unit.
It never rounds or writes back the stored gold balance. Thus `12.525` game gold
renders as `£12 10s 6d`, while the state retains `12.525`.

Schema rules:

- `id` and `label` are nonempty strings.
- `icon` is a short plain-text topbar mark.
- `smallestPerGold` is a positive integer.
- `units` contains one to four entries in descending `value` order.
- Every `value` is a unique positive integer; the last must be `1`.
- `symbol`, `singular`, and `plural` are plain text and are escaped on output.
- `position` is `before` or `after`.
- `space` controls only the gap between a number and that unit's symbol.
- `showZeroMinor` defaults to `false`.
- `maxUnits` defaults to the denomination count and is clamped to that count.
- Invalid definitions fall back to the default currency as a whole. Do not apply a
  partially valid currency.

The first implementation should use integer denomination ratios. Arbitrary decimal
ratios create floating-point decomposition and rounding ambiguity without enabling a
meaningful additional currency family.

### Other examples

A pounds-and-shillings-only mod uses 20 as its smallest scale:

```json
{
  "name": "Pounds and Shillings",
  "currency": {
    "id": "pounds_shillings",
    "label": "Sterling",
    "icon": "£",
    "smallestPerGold": 20,
    "units": [
      {
        "id": "pound",
        "value": 20,
        "symbol": "£",
        "singular": "pound",
        "plural": "pounds",
        "position": "before",
        "space": false
      },
      {
        "id": "shilling",
        "value": 1,
        "symbol": "s",
        "singular": "shilling",
        "plural": "shillings",
        "position": "after",
        "space": false
      }
    ]
  }
}
```

A decimal currency uses 100 smallest units:

```json
{
  "name": "Dollars and Cents",
  "currency": {
    "id": "dollars",
    "label": "Dollars",
    "icon": "$",
    "smallestPerGold": 100,
    "units": [
      {
        "id": "dollar",
        "value": 100,
        "symbol": "$",
        "singular": "dollar",
        "plural": "dollars",
        "position": "before",
        "space": false
      },
      {
        "id": "cent",
        "value": 1,
        "symbol": "¢",
        "singular": "cent",
        "plural": "cents",
        "position": "after",
        "space": false
      }
    ]
  }
}
```

A single-unit currency uses a scale and value of 1.

## Default and backward compatibility

Define the ordinary game currency as the built-in default. In the absence of a
currency mod, presentation should remain visually and textually equivalent to the
current game:

- the topbar keeps `💰`;
- prose amounts remain `1 gold`, `10 gold`, and so on;
- existing prices and calculations are unchanged.

Retain `balance.coinageSymbol` as a deprecated compatibility alias. When no
top-level `currency` object is present, a nonempty `coinageSymbol` overrides only
the default currency's topbar icon, exactly as it does now. When `currency` is
present, it takes precedence.

Existing symbol-only JSON mods therefore continue to load and keep their old
behavior. They are not silently promoted to a full denomination conversion.

## Formatting API

Add a cached, validated currency accessor and a small presentation API, preferably
in `js/i18n.js` because currency is display-time, locale-aware formatting rather
than simulation:

```js
FB.currencyDef()
FB.currencyLabel()
FB.money(amount, opts)
```

`FB.money` should support at least:

- `compact`: symbols and compound units, for normal UI and prose placeholders;
- `long`: singular/plural unit names, primarily for accessible labels;
- `icon`: the configured topbar mark.

Formatting rules:

1. Reject non-finite input and display the ordinary fallback used for invalid
   numeric UI values.
2. Convert the absolute amount to the smallest display unit with
   `Math.round(amount * smallestPerGold)`.
3. Decompose from largest denomination to smallest.
4. Omit zero minor units unless `showZeroMinor` is true.
5. Show the largest unit for an exact zero.
6. Apply a single leading minus sign to negative values.
7. Respect `maxUnits` without changing the rounded total.
8. Escape every mod-authored string exactly once at the DOM boundary.

The formatter must be pure and deterministic. It must not read or mutate
`FB.state`, consume RNG, or perform work in the simulation tick. Cache the
normalized definition after mods apply.

## Currency-aware text parameters

All displayed monetary values need semantic formatting rather than pre-rendered
strings. Extend the common interpolation path with a typed money placeholder:

```text
{money:cost}
```

The part after `money:` names a numeric parameter. For example:

```js
FB.T('Costs {money:cost}.', { cost: 15 })
```

renders as `Costs 15 gold.` under the default currency and `Costs £15.` under
sterling. A durable message keeps only the numeric `cost` parameter and formats it
when the Chronicle is displayed.

Declarative data may use a numeric literal when there is no runtime context:

```text
Pay and pass. ({money:2})
```

The interpreter distinguishes a numeric literal from a context-key lookup. This
syntax must work through the same display-field path for event titles, text,
labels, descriptions, logs, world news, and other structured data.

Update the catalog extractor and validator so a typed placeholder is one
indivisible token. Translations must preserve its type and source exactly.

Do not put a formatted `£`, `s`, dollar sign, currency label, or `FB.money` result
inside a saved message parameter. Durable messages store the numeric amount and
render against the active mod and locale later.

## Player-facing text migration

Perform a one-time audit of every player-facing occurrence of:

- `gold`;
- `Gold`;
- the money-bag icon;
- monetary numbers embedded in labels and descriptions;
- direct rendering of `player.gold`, costs, faces, stakes, payouts, or income.

Classify each match rather than mechanically replacing it:

- Internal names such as `player.gold`, `effects.gold`, `goldMin`, and balance keys
  remain unchanged.
- Documentation that describes the stable modding API may continue to call the
  internal resource gold.
- A displayed amount becomes a typed money placeholder.
- A displayed resource heading uses `FB.currencyLabel()` or neutral localized
  wording such as "Money" where that reads better.
- Historical prose referring to literal gold as a metal remains ordinary prose.
- The current coinage and price-index terminology remains conceptually about coin,
  but all amounts it displays use the formatter.

The audit includes:

- topbar, seasonal net, income breakdown, and stat modal;
- Deeds and focus requirements;
- event options, outcomes, logs, and autoresolve summaries;
- buildings, holdings, enterprises, careers, schooling, travel, and items;
- taxes, dowries, upkeep, wages, sales, tribute, and war expenses;
- loans, collateral, arrears, default, investments, debasement, and recoinage;
- save/load metadata, reports, toasts, tooltips, and accessibility labels;
- mod-authored structured data rendered through the ordinary display chokepoints.

Do not parse localized output to recover an amount. The numeric source remains the
same value used by gameplay.

## Localization

Core currency unit names should participate in normal catalog extraction so the
default long form is localized. Third-party mod-authored labels and unit names use
the existing mod policy: they fall back to their authored English unless they
exactly match a known catalog source.

The surrounding sentence always belongs to the translator:

```text
Costs {money:cost}.
```

The formatter owns only the currency fragment. It must not assemble translated
sentence grammar in JavaScript.

Plural selection for `long` form uses the denomination's authored `singular` and
`plural`. This is intentionally a modest v1 contract, not a complete CLDR currency
engine. Normal visible UI should prefer compact symbols, which are grammatical in
more contexts. Accessible names may use the long form with the same Preview-locale
limitations already accepted for third-party mod text.

## Saves, mods, and deterministic behavior

No currency configuration belongs in `FB.state`. It is world/mod presentation data
loaded before the life wakes.

Consequences:

- save format remains `v:3`;
- old unmodded saves load unchanged;
- old currency-symbol mods retain their existing behavior;
- `player.gold` and every financial contract remain numeric;
- save/export/import do not gain a migration;
- succession does not copy or reset currency data;
- changing the active runtime mod changes the mod fingerprint, so an affected save
  continues to require the same active mod set;
- display rounding never affects affordability, repayment, rewards, or balance.

The price index and nominal/real contract logic continue using game gold. Currency
conversion happens only after those systems have calculated the amount to show.

## Mod application and validation

Extend `FB.mods.apply` to recognize `mod.currency` and assign it atomically to
`FBDATA.currency`. Normalization should run after all enabled bundled and pasted mods
have applied, so the last applied currency wins.

Validation should:

- accept the documented schema only;
- cap string lengths and denomination count;
- reject objects, markup, or executable content in text fields;
- reject duplicate ids or values;
- reject unsorted, fractional, zero, or negative ratios;
- reject a definition whose smallest unit is not value 1;
- fall back to the complete default definition without preventing the rest of the
  mod from loading.

The Mods dialog should identify an invalid currency definition with a localized
toast if practical. Silent fallback remains necessary during early boot, when the UI
may not yet be available.

## File-level implementation

### `data/map_data.js`

- Add the default `FBDATA.currency` definition.
- Keep `balance.coinageSymbol` as the compatibility alias.

### `js/mods.js`

- Accept and atomically replace `mod.currency`.
- Normalize the final definition after all mods apply.

### `js/i18n.js`

- Add the currency accessor and formatter.
- Extend interpolation with `{money:source}` typed placeholders.
- Localize built-in currency unit names and preserve mod-authored fallback text.

### `js/messages.js`

- Confirm money parameters remain JSON-safe numbers in durable descriptors.
- Reject or avoid preformatted money fragments at descriptor-producing call sites.

### `js/ui.js`

- Replace the current `coinageSymbol` helper with the generic currency API.
- Route the topbar, stat sheets, ledgers, requirements, prices, and accessible labels
  through currency-aware formatting.

### Simulation and content files

Audit `js/actions.js`, `js/economy.js`, `js/events.js`, `js/world.js`,
`js/armies.js`, `js/council.js`, `js/parliament.js`, and all relevant `data/*.js`
display fields. Change presentation only; retain every numeric calculation and
internal `gold` key.

### `tools/i18n_catalog.py`

- Extract typed money placeholders.
- Validate that translations preserve placeholder type and source.
- Include built-in currency display names in the catalog inventory.

### Documentation

Update:

- `docs/MODDING.md` with the supported schema and examples;
- `docs/designs/mods.md` with currency replacement and fallback rules;
- `docs/designs/i18n.md` with typed money placeholders;
- `docs/designs/finance.md` with the presentation/simulation boundary;
- `docs/designs/state-and-saves.md` with the no-migration rule;
- `docs/designs/ui.md` with compact and accessible currency formatting.

When implementation lands on `main`, assign the next appropriate version and
regenerate the language catalogs from the merged tree.

## Implementation phases

### Phase 1 — Schema, normalization, and formatter

Add the default currency, runtime-mod merge, validation, compatibility alias, and
pure formatter. At the end of this phase, direct console calls can format currencies,
but the existing UI remains mostly unchanged.

### Phase 2 — UI and durable-message migration

Add typed money placeholders and route engine UI, messages, finance, and generated
effect summaries through them. Ensure new Chronicle entries store numbers rather than
formatted currency.

### Phase 3 — Declarative content migration

Replace literal monetary prose across event packs and structured data. Extend extractor
coverage and update the mod authoring schema.

### Phase 4 — Documentation, catalogs, and compatibility audit

Document generic currencies, retain symbol-only compatibility, regenerate all catalogs,
and verify old saves and existing mods.

Do not ship a half-migrated state in which the topbar uses one currency while event
choices or finance screens still promise gold. Phases may be developed separately, but
the player-facing release should include phases 1 through 4 together.

## Release and validation

This is a new moddable presentation feature and would normally warrant a MINOR version
when integrated. It does not change save format 3.

Permitted automated checks:

```text
node --check data/map_data.js
node --check js/mods.js
node --check js/i18n.js
node --check js/messages.js
node --check js/ui.js
node --check every other touched JavaScript file
python tools/i18n_catalog.py extract
python tools/i18n_catalog.py translate fr de it es
python tools/i18n_catalog.py validate
```

The game itself must not be run from a shell, a server, Node-driven logic tests, or a
headless browser.

Manual browser checks should cover:

1. With no mod, all money presentation and economic behavior match the current game.
2. An existing `{ "balance": { "coinageSymbol": "£" } }` mod still changes only the
   topbar icon.
3. Pounds/shillings renders integers, fractions, zero, negatives, and large balances
   correctly.
4. Pounds/shillings/pence decomposes and rounds at the smallest unit without changing
   the stored balance.
5. Decimal and single-unit example mods format correctly.
6. Costs shown in buttons, descriptions, and confirmation dialogs exactly match the
   numeric amount charged.
7. Income, upkeep, tax, item, travel, education, war, and Finance screens contain no
   accidental game-gold presentation under a full currency mod.
8. Chronicle entries render the active currency after save/load and export/import
   without storing formatted strings.
9. Existing version-3 saves load both unmodded and with their matching currency mod.
10. Removing or changing the mod triggers the existing mod-fingerprint protection.
11. Invalid schemas fall back safely without breaking the rest of the mod.
12. Mod-authored symbols and labels are escaped and cannot inject markup.
13. Compact values fit the mobile topbar, buttons, modals, and narrow Finance sheet.
14. Keyboard and screen-reader labels expose understandable long-form values.
15. French, German, Italian, and Spanish catalogs preserve every typed money placeholder.
16. A final player-facing audit finds no accidental literal "gold" except prose that
    intentionally refers to the metal rather than the resource.
