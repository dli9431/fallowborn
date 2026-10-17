Office and legitimacy presentation

Date-owned revision files may keep literal labels in a local REVISION_CONTENT object with bookmarkId and revisionId strings. The static extractor reads its provinces and realms arrays, duchies/kingdoms/empires tables, settlementLayout county arrays and constituencyProfiles member names. Each label receives a revision-scoped owner (constituency members retain their profile-scoped owners) and an exact-source alias for the ordinary runtime renderers. Compose those literal fields into the existing bookmark schema without executing a composer during extraction. This source organization adds no runtime mod root.

Literal FBDATA.bookmarkRegions<date>.<region> assignments in data/bookmark_<date>_scaffold_<quadrant>.js are extracted statically by extract_scaffold_regions. Dates are numeric and quadrant suffixes use lowercase letters. Province, realm, duchy, kingdom, empire and settlement names receive date-scoped owners and ordinary exact-source aliases; dated names are separately scoped. Multiple regional assignments in one file are supported. Ruler names, ids, dates and executable expressions are not display labels. The source tables stage ordinary bookmark fields and introduce no runtime mod root. Add source declarations and extractor coverage without regenerating integration catalogs on a feature branch.

Regional administrationProfiles and aristocraticProfiles maps may stage date-owned profiles alongside their opening actors. Their literal names use the existing administrationProfile and aristocraticProfile owners; provincial interest names use aristocraticInterest.<profile>.<interest>.name owners. Dynasty strings and historical personal names remain proper names. The complete bookmark composer publishes these maps into the ordinary profile catalogues before validation; extraction itself publishes nothing.

Household story presentation

Additional start files use data/starts_<suffix>.js and a literal FBDATA.startScenarios_<suffix> array, then append those rows to FBDATA.startScenarios. The static extractor assigns the same scenario.<id> display owners and family-preset owners as the central start file, with each source file's own location. Runtime selection and opening text keep the existing scenario localization route.

Data files named data/story_households_<suffix>.js declare their literal source table as FBDATA.householdTracks_<suffix> before composing it into storyInstances. The extractor reads title, intro, stage name/text and choice label/detail into householdStory.<id> owners. Runtime graph presentation uses FB.T and its exact-source aliases, including effective English fallback for JSON imports. Graph ids, decisions, receipts and saved records contain no rendered prose. Adapter review chrome uses literal FB.T phrases. Feature work extends extraction support without regenerating catalogs.

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

Revision-owned bookmark labels

Staged culture names in FBDATA.bookmarkCultures568 in data/bookmark_568_identities.js use the ordinary culture.<id>.name.default owner and exact-source alias. The static extractor reads these literal declarations before the complete date publishes them into FBDATA.cultures. Generated personal-name pools remain untranslated. These staging tables add no runtime JSON mod root and extraction does not activate their bookmark.

Staged faith labels in the literal FBDATA.bookmarkReligions1096 table in data/identities_1096.js use the ordinary religion.<id> owners, including words and roles. The static extractor reads them before the complete bookmark publishes the definitions into FBDATA.religions. This source catalogue is not a JSON mod root; imported definitions still use religions. Extraction never activates a bookmark or executes its declaration script.

The 1096 composer keeps its name and desc in the literal FBDATA.bookmarkCandidates['1096'] declaration for the existing bookmark display owners. Regional county, court, title and layout labels retain their scaffold or bookmarkRevisionContent owners. Publishing copies into the complete world creates no new text owner and does not execute catalogue generation.

The literal FBDATA.bookmarkReligions1241 table in data/identities_1241.js uses the same ordinary religion.<id> owners for its name, words and roles. Static extraction reads the inactive source without publishing the faith or registering its bookmark. Runtime JSON imports continue to use religions. Generated people, stable ids and date selectors remain untranslated.

Literal FBDATA.bookmarkRevisionContent_<suffix> objects in data/bookmark_*.js may organize a dated revision's presentation. Each object supplies bookmarkId and revision strings, literal provinces and realms arrays, duchies, kingdoms, empires and cultures maps, and a layouts map of county ids to settlement slots. The static extractor reads name fields with distinct bookmark/revision owners and exact-source aliases; culture names retain their global culture owner. It does not execute composers or extract ruler names. These are source organization tables, not new JSON mod roots. Compose their records into the ordinary bookmark, culture and settlement-layout catalogues. Keep labels literal and retain old revision owners.

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

Campaign story authoring

FBDATA.storyCampaigns name and desc fields use storyCampaign.<id>.<field>.default through FB.dataText. Their news outcome rows carry key and text; the static extractor registers each text under that opaque message key. Runtime registration supplies English for saved Chronicle descriptors without requiring catalog generation on the feature branch. Political stage labels use literal FB.T calls. The named commanders in FBDATA.storyActors476 are historical proper names and are not translated.


476 regional content extraction

The static extractor reads optional regional events, cultures, legalTraditions and campaigns (declared as campaigns or storyCampaigns) from the literal bookmarkRegions476 declarations, plus literal event pushes in the same data/bookmark_476_<region>.js files, alongside data/events_*.js. They retain the usual event, culture, legalTradition and storyCampaign owners, including event option indexes, outcomes, log messages and durable campaign news keys. County-local names receive province.476.<id>.name.<branch> owners, dated province-row names receive province.476.<id>.name.dated.<index>.<branch> owners, and settlement names in regional layouts (layouts or settlementLayouts) receive settlement.476.<site>.name.<branch> owners, each with exact-English aliases. Physical-site table names and historical ruler, bishop and other representative names remain proper names. Keep these declarations literal so extraction can read them without running game code; composition through Object.assign or concat does not require executing game scripts. Source changes use English fallback until a separately requested catalog regeneration.

Spring 711 candidate extraction

The static extractor also reads the literal bookmarkCandidates['711'], bookmarkCultures711 and bookmarkReligions711 declarations in data/bookmark_711.js and storyCampaigns711 in data/story_campaigns_711.js. Candidate visibility does not remove localization ownership. Bookmark, county, realm and inline settlement names retain the ordinary 711 namespaces; independent promotion labels retain their canonical title ids. Supplemental culture and faith display fields, head titles and words retain culture and religion owners. Campaign labels and durable news use the existing storyCampaign and explicit message keys. No review activation or game-script execution is needed for extraction. Feature implementation leaves the generated catalogues unchanged.

Review bookmark content

The static extractor also reads numeric data/bookmark_<year>.js files whose complete literal definition is assigned to FBDATA.bookmarkCandidates[<year>], except 711, whose bespoke owners are described above. It collects bookmark, county, realm and title display fields while excluding ruler profiles. Title keys include the candidate year so period labels do not collide with existing promotion-region ids. A companion data/bookmark_<year>_history.js declares its literal FBDATA.storyCampaigns<year> table before composing it into storyCampaigns; the extractor collects the shared storyCampaign keys and explicit durable news keys there. This authoring support does not expose a candidate in the starting-date picker or require catalog regeneration on a feature branch.

Review bookmark content extraction

Literal FBDATA.bookmarkCandidates and bookmarkContent declarations in data/bookmark_<numeric-id>.js are read statically for bookmark names/descriptions, realm display names and county override names. Companion data/bookmark_<numeric-id>_campaigns.js files declare the literal bookmarkContent[id].campaigns table. Those records retain storyCampaign.<id>.name/desc owners and opaque news keys, then compose into the existing runtime catalogue before registration. Historical ruler profiles remain proper names and are excluded. Review-only status does not exempt display strings from extraction. Feature work leaves all generated language files, caches and manifests unchanged; regeneration still requires a separate owner request at integration.

476 regional display owners

The static regional source list includes data/bookmark_476_outer.js. All five regional declarations use province.476, realm.476 and settlement.476 owners, while administrative title ids retain their existing typed keys. The bookmark name and description have bookmark.476 owners. Regional cultures, law labels, event options, effects.log and costs use the existing structured routes. The retired 476_outer and 476_mobile owners are no longer extracted. Catalogs are regenerated only at an owner-requested integration step. tools/test_i18n_catalog.py covers the source and owner paths.
Government selection presentation

Selection interest and transformation names are extracted from governmentForms into governmentSelection.<form>.<member-or-transformation>.<id>.name.default. UI labels and blockers use literal FB.T, with data names resolved through exact-source aliases. The conditional card uses governmentContest.<story>.<name-or-desc>.default. Durable accession news uses news.government.local_accession. Saved phases, interests, votes, obligations and reasons remain ids and numbers. Feature work adds extractor support without regenerating catalogs.

Assembly display owners

The extractor reads assemblyOpenings names as assemblyOpening.<id>.name, assemblyCounties names and settlement names as assemblyCounty.<id> display fields, and constituencyProfiles member names as constituencyMember.<profile>.<member>.name. Runtime member labels use dataText with the same owner. Opening representative names are proper names and are not extracted. Engine cards use FB.T and durable delegation news uses FB.msg; saved mandate and decision records contain no rendered prose.

Aristocratic display owners

aristocraticProfiles names extract as aristocraticProfile.<id>.name.default, and permanent interest labels as aristocraticInterest.<profile>.<interest>.name.default. Literal aristocraticOffices and aristocraticAdministrationProfiles contribute to the existing authorityOffice and administrationProfile namespaces before they merge into the runtime tables. Public review chrome uses FB.T and durable political news uses FB.msg. Royal, principal and dynasty names remain proper-name identities. Do not regenerate catalogs on a feature branch.

Mobile opening presentation

The typed mobileScenarioPresentation table in data/mobile_confederations.js supplies the Pontic household scenario display fields. extract_mobile_presentations routes them to the ordinary scenario keys without executing data scripts. Coalition UI uses literal FB.T patterns, lexicons use the existing government extraction route, and news.mobile.decision stores an opaque message descriptor with proper-name references and numeric following size. No generated catalog is changed on this feature branch.

Civic display ownership

Civic profile names extract under civicProfile.<profile>.name, ordered magistracy names under civicOffice.<profile>.<office>.name, and represented interests under constituencyMember.<constituency>.<member>.name. Civic contest declarations extract under governmentContest.<instance>.name and desc. Runtime screens use dataText for those fields and T for chrome; names of actual people and saved ids remain identity data. Civic announcements persist message descriptors. New English falls back normally until separately authorized integration catalog regeneration.

Ecclesiastical display owners

data/ecclesiastical_profiles.js names extract as ecclesiasticalProfile.<profile-id>.name.default and render through FB.dataText. Government review chrome and outcome text use FB.T. Local institution names retain their existing structured owners. No generated catalogs are edited on the feature branch.

Dated district display owners

bookmark_<date>_expansion.js may declare literal bookmarkCultures<date>Expansion, bookmarkConstituencies<date>Expansion, bookmarkRealms<date>Expansion and bookmarkDistricts<date> catalogues. The static extractor reads these without executing the composer. Cultures use culture.<id>.name, represented interests use constituencyMember.<profile>.<member>.name, courts use realm.<date>.<id>.name, and district/site names use province.<date>.<id>.name and settlement.<date>.<id>_inhabited_<date>.name. Generated personal names remain identity data. The 867 composer registers these catalogues before its fresh revision and keeps normal English fallback until separately authorized integration regeneration.

Religious institution display owners

The static religious_institutions.js extractor routes religiousAffiliations names to religiousAffiliation.<id>.name.<branch>, profile names to religiousInstitutionProfile.<id>.name.<branch>, and nested role names to religiousInstitutionProfile.<id>.roles.<role-id>.name.<branch>. Runtime cards and careers resolve the same fields through FB.dataText. Title snapshots retain source ids and raw English fallback words; FB.renderTitleSnapshot resolves the corresponding role key at render time. The Religious communities deed and exact review use literal FB.T chrome and shared accessible cards. Saved membership, affiliation, consent and AI status contain ids and facts. Owner integration regenerates catalogs separately.

Spring 1204 district extraction

The literal bookmarkTerrain1204 table in data/bookmark_1204_terrain.js exposes independently dated province and realm names, settlement layout labels, constituency member names and scenario/family-preset display fields to extract_terrain_1204. The composer need not execute during extraction. bookmarkCultures1204Terrain supplies the culture name through the existing culture owner. Generated person names and district/revision/mandate ids remain identity data. Runtime labels retain their ordinary province.1204, realm.1204, settlement.1204, constituencyMember and scenario owners. Integration regeneration remains separately authorized; new English falls back normally.

Physical geography additions

A data/geography_*.js composer may declare its new scenery seeds in a literal local PROVINCE_ADDITIONS array. extract_geography_additions reads each seed's id and name without executing the file, producing province.<id>.name.<branch> and the normal exact-source alias used by FB.L. Copying a label into the geography names table keeps the same source owner. Coordinates, terrain, geography ids and dated habitation remain separate. Catalogue regeneration is an independently authorized integration step.
