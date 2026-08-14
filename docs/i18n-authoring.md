# i18n authoring guide

Practical rules for making every user-facing string reachable by the localization layer — the
how-to. The architecture, catalog shape, and locale lifecycle live in
[designs/i18n.md](designs/i18n.md); the data schema in [MODDING.md](MODDING.md). Get this right as
you write the code, not as a later cleanup pass.

The game ships English plus AI **Preview** catalogs (`fr`, `de`, `it`, `es`). The simulation stays
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
- **Event & structured-data display fields (`data/events_*.js`, traits, buildings, items,
  technologies, …):**
  keep the English in the source data — it is id-keyed and auto-extracted, including the `log:`
  effect string. Put `{token}` placeholders in the prose; the renderer fills them per-locale.
  Trait acquisition guidance lives in the pure-display `earned` field and renders through
  the same `FB.dataText` path as `name` and `desc`.
  Career rank names, learned-license names, and specialty names are nested structured
  display fields and must also render through their exact `FB.dataText` paths.
  Formal privilege names and descriptions in `data/political_institutions.js` use the
  `privilege` structured-data namespace, including when technology details list them as unlocks.
  Never renumber authored option indices. Faith variants stay `{default, muslim, jewish}` objects
  in the source (the renderer selects the branch, then localizes it). Technology `name`
  and historical `desc` live in `data/technology.js` and render through `FB.dataText`;
  domain and tradition labels are id-keyed structured data too; cost explanations remain
  UI chrome and use explicit `FB.T` keys.
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

Money is the one typed display placeholder: use `{money:amount}` with a numeric
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

## Regenerate the catalogs (at integration)

`data/lang_*.js` and `tools/i18n_manifest.json` are **generated integration artifacts** — never
hand-edit or hand-merge them. The tool is static-only (it never runs the game, so it is *outside*
the "don't run the game" rule):

```
python tools/i18n_catalog.py extract               # rebuild data/lang_en.js + tools/i18n_manifest.json
python tools/i18n_catalog.py translate fr de it es  # AI-translate new/changed records (needs API access)
python tools/i18n_catalog.py validate               # coverage, source hashes, tokens, structure
```

The pipeline's tracked working state lives under `i18n/`. `extract` refreshes
`i18n/i18n-coverage.json` and `i18n/i18n-coverage.md`; `translate` reuses and updates
`i18n/i18n-cache/<locale>.json`. These cache files contain only source-keyed translated catalog
text, never request headers or credentials, and their changes land with the generated catalogs.
Historical `translate*.log` files are progress output only and are not consumed by the tool.

`extract` and `validate` are network-free, while `translate` calls a translation API; all three
still obey the integration-only timing rule below. If you cannot run `translate` during an
authorized integration, **say so** — English fallback keeps the game correct, but the owner must
regenerate before the Preview locales are current for release.

**When to run it — authorization and timing are strict.** Do not run `extract`, `translate`, or
`validate` during ordinary implementation, review, diagnostics, or other uncommitted work merely
because the checkout is `main`. An edit or test request is not authorization to regenerate the
catalogs. Run the recipe only after the owner explicitly asks for one of these integrations:

- **Commit directly to `main`:** finalize the source changes first, then run the recipe as the
  last integration step immediately before the requested commit so the generated files land in it.
- **Merge a branch into `main`:** never regenerate on the branch. During the requested merge,
  assemble the merged tree without finalizing the merge commit, run the recipe from that merged
  tree, then finalize the integration.

Routing new strings remains part of implementation; English self-heals until integration.
Regenerating early only creates noisy working-tree changes and, on a branch, guarantees a catalog
conflict against every other branch that also regenerated. The only valid resolution is to
regenerate again from the merged tree, wasting work and a second `translate` bill.
(`FB.VERSION` / `FB.CHANGELOG` are integration-owned the same way — see *Git workflow* in
[../AGENTS.md](../AGENTS.md).)

**Resolving a catalog conflict at a merge.** Do not hand-merge the generated files. Take either
side to clear the markers (`git checkout --theirs -- data/lang_*.js tools/i18n_manifest.json`),
`git add` them, then regenerate from the *merged source* (`extract → translate → validate`) and
stage the result. `validate` is the gate — a change reaching `main` with new player-facing text
but stale catalogs leaves the other languages stale.
