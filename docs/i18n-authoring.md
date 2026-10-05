Office and legitimacy presentation

Authority office names and descriptions use authorityOffice.<id>.<field>.default; legitimacy source names use legitimacySource.<id>.name.default. The static extractor reads both tables from data/political_institutions.js, and FB.officeText and FB.legitimacySourceName render their FB.dataText paths. Powers, scope, status, eligibility, terms, selectors and review consequences use FB.T. Historical people and physical place names remain proper names. Appointment and recognition outcomes use news.office.appointment, news.office.recognize and news.office.contest message descriptors; no rendered office or source label is saved. Add the source and extraction support on a feature branch without regenerating integration catalogs.

# i18n authoring guide

Local institutional presentation

Institution ids, sites, demands, consent rights, stages, actor references and ballots remain locale-neutral. Physical city and historical person names are proper names. FB.localInstitutionName supplies literal FB.T patterns for each kind, and the Deeds registry owns the section labels. UI term, demand and stage labels use literal FB.T phrases. New county modifier names and descriptions use the existing modifier extraction route; durable outcomes use news.institution.bargain descriptors. No catalogue regeneration is needed on the feature branch.

Period currency labels and full-definition unit singular/plural names in data/eras.js and data/geographies.js are extracted as currency.eras.<era-id>.* and currency.geographies.<geography-id>.*. The currency renderer uses the normal exact-source FB.L lookup. Keep those display strings literal in the data; icons, compact symbols, numbers and saved gold are locale-neutral. A runtime currency mod retains its existing exact-source fallback behavior. Add period content in source without regenerating catalogs on its feature branch.

Practical rules for making every user-facing string reachable by the localization layer — the
how-to. The architecture, catalog shape, and locale lifecycle live in
[designs/i18n.md](designs/i18n.md); the data schema in [MODDING.md](MODDING.md). Get this right as
you write the code, not as a later cleanup pass.

The game ships English, AI **Preview** catalogs (`fr`, `de`, `it`, `es`), and a
contributor-translated Brazilian Portuguese **Preview** catalog (`pt-BR`). The simulation stays
locale-neutral; **only pure-display fields (`title`, `text`, `label`, `desc`, `log`, `worldNews`,
`name`, and trait `earned`) are ever localized** — ids, effects, triggers, numbers, and generated proper names never
are. Nothing here breaks `file://`: catalogs are `.js` globals, and any new English self-heals (a
lookup miss or stale source hash falls back to English), so an unrouted string is a bug even
though the game still *runs*.

## Route new text by where it lives

- **UI chrome (built as HTML/DOM in `js/*.js`):** wrap with `FB.T('English text', params?)`
  (i18n.js), or `FB.TC('context', 'English text', params?)` when identical English needs different
  meanings. Prefer the builder chokepoints that already wrap `FB.T` — `kv(label, value)`,
  `panelh(title)`, `toast`, modal/button/tab helpers. Splice values with `{token}` placeholders,
  never concatenation: `FB.T('You have {n} children', { n: n })`, **not** `'You have ' + n + '
  children'`.
- **Event & structured-data display fields (`data/events_*.js`, traits, buildings, fort tiers,
  items, technologies, …):**
  keep the English in the source data — it is id-keyed and auto-extracted, including the `log:`
  effect string. Put `{token}` placeholders in the prose; the renderer fills them per-locale.
  Trait acquisition guidance lives in the pure-display `earned` field and renders through
  the same `FB.dataText` path as `name` and `desc`.
  Career rank names, learned-license names, and specialty names are nested structured
  display fields and must also render through their exact `FB.dataText` paths.
  Serf tenure duties and rights use the normal `tenureDuty` / `tenureRight` structured
  paths. Tenure archetypes additionally declare stable `nameKey`, `summaryKey`,
  `workLabelKey`, and `workDescriptionKey` owners beside their English `name`, `desc`,
  `workLabel`, and `workDescription`; extraction registers both owner and current source
  hash, and runtime rendering must use `FB.tenureText` rather than exposing semantic ids.
  Baseline focus and deed labels plus static descriptions live in `data/actions.js` under
  stable `focus.<id>` and `action.<id>` owners. A truly state-dependent description remains
  in its private `js/actions.js` handler and routes its complete phrases through `FB.T`.
  Runtime action overrides keep those owners; an optional static eligibility explanation
  renders under `focus.<id>.eligibility.reason` or
  `action.<id>.eligibility.reason`. Changed mod English invalidates a stale generated
  translation by source hash and falls back to that effective English.
  Declarative `resource_choice` labels, descriptions, and eligibility reasons use stable
  `action.<action-id>.choice.<choice-id>.*` owners; choice ids, costs, and effects remain
  locale-neutral.
  Formal privilege names and descriptions in `data/political_institutions.js` use the
  `privilege` structured-data namespace, including when technology details list them as unlocks.
  Fortification tier names in `FBDATA.fortLevels` use the `fort` namespace and are addressed by
  their stringified numeric tier.
  Never renumber authored option indices. Faith variants stay `{default, muslim, jewish}` objects
  in the source (the renderer selects the branch, then localizes it). Technology `name`
  and historical `desc` live in `data/technology.js` and render through `FB.dataText`;
  domain and tradition labels are id-keyed structured data too; cost explanations remain
  UI chrome and use explicit `FB.T` keys.
- **476 world labels:** data/bookmark_476.js has literal bookmark labels; data/bookmark_476_italy.js, data/bookmark_476_dalmatia_east.js, data/bookmark_476_gaul_iberia.js and data/bookmark_476_africa.js own literal realm and administrative title labels.
  Period county names by year live in the `PROVINCE_NAMES` table of
  `data/geographies.js`, extracted as province.<id>.name.dated.<index>. The static
  extractor reads both without running game code. Keep authored province
  display names as quoted strings so exact-source aliases can translate them. Ruler and
  physical-site names remain proper names.
- Climate labels: season kind and climate zone names in data/climate.js are structured
  data, extracted as seasonKind.<id>.name.default and climateZone.<id>.name.default and
  rendered through FB.seasonKindName and FB.climateZoneName (FB.dataText). The calendar
  season in dates keeps FB.seasonName.
- **Historical ambitions:** `data/ambitions.js` owns structured `name` and `desc`
  fields, extracted as `ambition.<id>.<field>.default`. Render them with
  `FB.dataText(state, viewer, 'ambition', id, definition, field, {})`. Requirement
  labels and numeric previews use `FB.T`; completed foundations and actual rewards
  use `news.ambition.*` descriptors. Preserve stable definition and message IDs.

- **Durable / shared messages (chronicle, `FB.news`, `FB.fx`, anything stored in state):** emit an
  opaque descriptor, never rendered prose. From shared sim code: `FB.news(state,
  FB.msg('news.war.tribute', '🕊 English fallback.', params))`. The opaque key (`news.*`, `fx.*`)
  plus semantic params re-render in the player's current language and keep old saves working with
  no migration.

- **Event consequence UI:** do not duplicate mechanics in `desc`. Declarative effects are
  previewed and receipted centrally. A custom option effect must register a pure
  `FB.eventImpactAdapters[id].preview` and a post-resolution `report`; return semantic impact
  records containing ids/numbers, and route their display labels through `FB.T`. Receipt
  metadata lives beside a normal durable `msg`, never as rendered prose.

Political words are lexicon terms, not English literals. Write {term:vassal}, {term:vassal.other}, {term:crown_authority.title} or {Term:liege} (capitalized) for vassal, liege, fief, holding, levy, crown authority, council, estates, manor, serf, knight, baron, county, duchy, kingdom and empire, for example FB.T('Your {term:liege} grants a {term:fief}.'). The renderer swaps in the campaign's word for the viewer's era, government, faith and culture (data/lexicons.js, designs/i18n.md). A placeholder only works where the text reaches FB.T, FB.TC, a durable message or FB.dataText/FB.eventText; never put one in raw HTML or a string shown through exact-source matching (FB.translateKnown). Rank labels come from FB.titleWordFor or FB.lexicon.rank, and a period relabel of a data name belongs in a lexicon labels entry, not in code. Do not inflect around a term (articles or adjectives that agree with it), because its word changes by period.

For a generated realm name in saved news, message parameters or queued event context, use FB.realmNameParam(state, realmOrId), never realm.name or FB.T output. This captures the historical naming kind, place and untranslated term source so the name can render in another locale after the realm changes or disappears. The existing realm.name getter is for immediate string display. Custom proper names remain ordinary strings. Use FB.renderRealmNameSnapshot(value.$realmName) when a non-message display surface reads a saved typed name, such as a guild monopoly issuer.

The other typed display placeholder is money: use `{money:amount}` with a numeric
parameter, for example `FB.T('Costs {money:cost}.', { cost: 15 })`. Structured data
may use a numeric literal such as `{money:2}`. Never add a currency symbol or the
word "gold" beside the token, and never put an `FB.money` result in a durable
message parameter; store the number so the active locale and currency mod format it
when displayed.

## Never

- Bake a localized/rendered string into `state.log`, `state.legends`, or any saved field.
- Mutate a `FBDATA` display field in place — localization is shadow-lookup only.
- Put grammar in JS (gender/plural ternaries, suffix splicing like `(sex==='f'?'daughter':'son')`).
  Use complete-phrase selector records (`{forms:{select:'value', param:'sex', cases:{…}}}` or a
  numeric plural selector) so the translator owns word order.
- Call the browser locale renderer from shared simulation code.
- Hardcode vassal, liege, fief, crown authority, knight, baron, serf or manor in display text; use a lexicon term (tests/e2e/specs/lexicon.spec.js lints engine literals).

## Regenerate the catalogs (at integration)

`data/lang_*.js` and `tools/i18n_manifest.json` are **generated integration artifacts** — never
hand-edit or hand-merge them. The tool is static-only (it never runs the game, so it is *outside*
the "don't run the game" rule):

```
python tools/i18n_catalog.py extract               # rebuild data/lang_en.js + tools/i18n_manifest.json
python tools/i18n_catalog.py translate fr de it es pt-BR  # reuse caches; new records need API access
python tools/i18n_catalog.py validate               # coverage, source hashes, tokens, structure
```

The pipeline's tracked working state lives under `i18n/`. `extract` refreshes
`i18n/i18n-coverage.json` and `i18n/i18n-coverage.md`; `translate` reuses and updates
`i18n/i18n-cache/<locale>.json`. The `pt-BR` cache contains the contributor's in-context
translations and is reused before any new strings are machine translated. These cache files
contain only source-keyed translated catalog text, never request headers or credentials, and
their changes land with the generated catalogs.
Historical `translate*.log` files are progress output only and are not consumed by the tool.

`extract` and `validate` are network-free, while `translate` calls an unauthenticated translation
endpoint that may return `429 Too Many Requests`. All three still obey the integration-only timing
rule below. If `translate` is unavailable, say so and stop the catalog recipe. English fallback
keeps the game correct, and the surrounding commit or merge may proceed without regenerated
catalogs. If `extract` already modified tracked generated files, restore or exclude those partial
outputs before committing. Missing cache entries remain discoverable by the next successful
translation run.

**When to run it — authorization and timing are strict.** Do not run `extract`, `translate`, or
`validate` during ordinary implementation, review, diagnostics, or other uncommitted work merely
because the checkout is `main`. A commit, merge, edit, or test request is not authorization to
regenerate the catalogs. The owner must ask for i18n regeneration separately. When requested, run
the recipe only as part of one of these integrations:

- **Commit directly to `main` or `dev`:** finalize the source changes first, then run the recipe
  as the last integration step immediately before the requested commit so the generated files
  land in it.
- **Merge a branch into `main`:** never regenerate on the branch. During the requested merge,
  assemble the merged tree without finalizing the merge commit, run the recipe from that merged
  tree, then finalize the integration.
- **Merge any branch into `dev`:** use the identical merge workflow: never regenerate on the
  source branch; assemble the merged tree, run the recipe, then finalize the integration. A later
  merge of `dev` into `main` runs the recipe again from that newly merged tree.

Catalog regeneration is optional for every integration path. `validate` is mandatory only
when regenerated artifacts are going into the integration. A failed or skipped translation does
not block committing the source changes; Preview locales fall back to current English for missing
or stale records. If catalogs are caught up in a later standalone integration, bump `FB.VERSION`
so deployed immutable locale assets receive a new cache key.

Routing new strings remains part of implementation; English self-heals until integration.
Regenerating early only creates noisy working-tree changes and, on a branch, guarantees a catalog
conflict against every other branch that also regenerated. The only valid resolution is to
regenerate again from the merged tree, wasting work and a second `translate` bill.
(`FB.VERSION` / `FB.CHANGELOG` are integration-owned the same way — see *Git workflow* in
[../AGENTS.md](../AGENTS.md).)

**Resolving a catalog conflict at a merge.** Do not hand-merge the generated files. Take either
side to clear the markers (`git checkout --theirs -- data/lang_*.js tools/i18n_manifest.json`). If
the owner requested i18n regeneration, regenerate from the *merged source*
(`extract → translate → validate`) and stage the result. Otherwise retain one complete generated
side and let current English fallback cover missing or stale records until a later successful
regeneration. `validate` is the gate for regenerated artifacts, not for the surrounding source
integration.


Scheduled games structured labels in data/tournaments.js are extracted under tournament_scales, tournament_programmes, tournament_tracks and tournament_tactics. Render them through FB.dataText. Incident events are individually authored literal records with stable ids and option indices; saved tournament messages register literal news.tournament fallbacks at boot. Ordinary catalog generation remains subject to the separate owner-requested integration workflow.


Deeds section labels

Section label, subhead and statusLine fields in data/actions.js use stable deedSection.<id>.<field> owners and render through FB.deeds.text. The static extractor registers all three display fields without executing the registry. Runtime section overrides retain those owners and use the normal current-source English fallback. Section ids, types, order, layout, availability, system requirements and deed membership are locale-neutral.

Late antique presentation text

The late antique purse uses literal label and singular/plural unit names in data/eras.js. Its compact symbol and coin icon are locale-neutral. Era lexicon terms and item/unit relabels remain in data/lexicons.js and render through FB.term or FB.dataText. Never interpolate a rendered political term into a saved record. Period proper-name pools and procedural appearance/art ids are not translated. The expanded title subtitle uses data-i18n; start descriptions and introductions retain scenario structured-data owners. New culture display names retain culture owners. Feature branches keep English fallback and leave catalog regeneration to an explicitly requested integration.
