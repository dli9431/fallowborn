Existing-person start presentation

The existingPerson selector and saved identity/provenance fields are untranslated metadata. Scenario name, desc, intro and the sole standard family summary retain the ordinary scenario display owners and imported exact-English fallback. Personal names remain proper names. The fixed-identity summary reuses existing translated identity labels; the constructor and save validation route their error messages through FB.T. No new presentation registry or generated catalogue is required.

Frederick opening presentation

data/starts_frederick_1241.js uses the ordinary scenario source table. The literal agenda remains in data/story_ruler_agendas.js under the existing rulerAgenda owners; data/story_frederick_1241.js supplies a literal openingProfiles_frederick_1241 table with the existing goal/contact owners. The camp's literal label in data/bookmark_1241_frederick.js uses bookmarkRevisionContent extraction and exact-English aliases. papal_temporal_1241 uses the existing ecclesiastical profile display owner. Personal names, site ids and working birth years stay locale-neutral. Source authoring changes no generated catalogue.

Expedition records-review text

Preparation-aware review status and closure explanations use literal FB.T calls in js/story_expedition_agreements.js. The waitForFormation reference and saved preparation/formation provenance remain untranslated metadata. Imported review name/desc retain the same storyCampaign owners and ordinary English fallback. No rendered status is saved and no extraction namespace or generated catalogue change is required.

expedition_undertaking name and desc use the existing storyCampaign dataText owner and normal imported-English fallback. Runtime chrome in js/story_expedition_agreements.js uses literal FB.T calls with named placeholders for original parties, finite turns and current county/controller/holder labels. Proper personal names and stable ids remain untranslated. No rendered prose is stored in the optional record. No bundled source instance or new extraction namespace is added; a later bundled source must use a supported literal storyCampaign display table. Generated catalogues remain an integration step requiring explicit authorization.

Office and legitimacy presentation

data/technology_learning.js declares literal techCorrections_learning complete replacements and data/buildings_learning_care.js declares buildingCorrections_learning_care replacements plus buildings_learning_care additions. Static extraction keeps ordinary tech.<id> and building.<id> owners and final-English aliases. Removed library faith variants and obsolete paper-workshop labels have no stale owner; the guesthouse is building.hospice. Runtime names and descriptions use the existing structured route. No generated catalogue is changed by this content work.

Date-owned revision files may keep literal labels in a local REVISION_CONTENT object with bookmarkId and revisionId strings. The static extractor reads its provinces and realms arrays, duchies/kingdoms/empires tables, settlementLayout county arrays and constituencyProfiles member names. Each label receives a revision-scoped owner (constituency members retain their profile-scoped owners) and an exact-source alias for the ordinary runtime renderers. Compose those literal fields into the existing bookmark schema without executing a composer during extraction. This source organization adds no runtime mod root.

Literal FBDATA.bookmarkRegions<date>.<region> assignments in data/bookmark_<date>_scaffold_<quadrant>.js are extracted statically by extract_scaffold_regions. Dates are numeric and quadrant suffixes use lowercase letters. Province, realm, duchy, kingdom, empire and settlement names receive date-scoped owners and ordinary exact-source aliases; dated names are separately scoped. Multiple regional assignments in one file are supported. Ruler names, ids, dates and executable expressions are not display labels. The source tables stage ordinary bookmark fields and introduce no runtime mod root. Add source declarations and extractor coverage without regenerating integration catalogs on a feature branch.

Regional administrationProfiles and aristocraticProfiles maps may stage date-owned profiles alongside their opening actors. Their literal names use the existing administrationProfile and aristocraticProfile owners; provincial interest names use aristocraticInterest.<profile>.<interest>.name owners. Dynasty strings and historical personal names remain proper names. The complete bookmark composer publishes these maps into the ordinary profile catalogues before validation; extraction itself publishes nothing.

Household story presentation

data/story_ruler_agendas_1241.js declares literal rulerAgendas_1241 and openingProfiles_rulers_1241 tables. Their stage/choice and goal/contact text use the ordinary rulerAgenda and openingProfile owners and exact-source aliases. The generic dated-agenda extractor discovers rulerAgendas_<suffix> in story sources without executing composition. Scenario fields remain in literal startScenarios_1241 under scenario owners. Royal personal names, kin ids, dates and physical site ids stay untranslated. No catalogue generation accompanies feature authoring.

Household presentation sources may also use data/story_<suffix>.js with literal FBDATA.householdTracks_<suffix> and FBDATA.openingProfiles_<suffix> tables. data/story_novgorod_1241.js uses this convention. The static extractor preserves the same householdStory and openingProfile display owners and exact-source aliases as story_households_<suffix>.js, without executing the source. Scenario text remains in data/starts_novgorod_1241.js under the ordinary scenario owners. No generated catalogues are changed by feature authoring.

Site resource profile names and descriptions live in literal FBDATA.siteResourceProfiles in data/site_resources.js. Static extraction uses siteResourceProfile.<id>.name.default and siteResourceProfile.<id>.desc.default with normal exact-source aliases; the shared settlement review uses the ordinary structured-data renderer and imported English fallback. Capacity units, permission/capacity blockers and confirmation consequences use complete FB.T phrases. Source/profile/site ids, periods, reservations and structural fingerprints remain locale-neutral. No generated catalog command is required for feature authoring.

Additional start files use data/starts_<suffix>.js and a literal FBDATA.startScenarios_<suffix> array, then append those rows to FBDATA.startScenarios. The static extractor assigns the same scenario.<id> display owners and family-preset owners as the central start file, with each source file's own location. Runtime selection and opening text keep the existing scenario localization route.

Data files named data/story_households_<suffix>.js declare their literal source table as FBDATA.householdTracks_<suffix> before composing it into storyInstances. The extractor reads title, intro, stage name/text and choice label/detail into householdStory.<id> owners. Runtime graph presentation uses FB.T and its exact-source aliases, including effective English fallback for JSON imports. Graph ids, decisions, receipts and saved records contain no rendered prose. Adapter review chrome uses literal FB.T phrases. Feature work extends extraction support without regenerating catalogs.

Named household files may also use data/story_<suffix>.js with the same FBDATA.householdTracks_<suffix> and FBDATA.openingProfiles_<suffix> source tables. Static extraction scans these sources without executing their composition. data/story_kyiv_refugees_1241.js uses this convention; its household and goal owners retain the ordinary householdStory and openingProfile namespaces. Its separate starts file keeps scenario owners, while the Lutsk purpose and arrival event use the existing travel and event extraction routes.

Those same household files may declare a literal FBDATA.openingProfiles_<suffix> table, composed into storyInstances alongside their graphs. The opening-profile extractor reads title, intro, goal name/text/hold reason and contact label/text into openingProfile.<id> owners, with the same exact-source aliases as data/start_ambitions.js. It reads source text without running a declaration. data/story_households_568_ravenna.js uses this convention for its optional household goals; data/starts_568_ravenna.js uses the existing scenario-source convention. Travel-purpose and arrival-event text retains its normal travel and event owners.

Authority office names and descriptions use authorityOffice.<id>.<field>.default; legitimacy source names use legitimacySource.<id>.name.default. The static extractor reads both tables from data/political_institutions.js, and FB.officeText and FB.legitimacySourceName render their FB.dataText paths. Powers, scope, status, eligibility, terms, selectors and review consequences use FB.T. Historical people and physical place names remain proper names. Appointment and recognition outcomes use news.office.appointment, news.office.recognize and news.office.contest message descriptors; no rendered office or source label is saved. Add the source and extraction support on a feature branch without regenerating integration catalogs.

Supplemental technology and building presentation

data/buildings_boathouses.js uses literal FBDATA.buildings_boathouses for building.boathouse name/desc. Its finite material and recipe labels live in the canonical literal productionGoods/productionRecipes tables in data/production.js, and its invoice profile uses the literal maritimeWorkProfiles table in data/maritime_work.js. These retain the existing productionGood, productionRecipe and maritimeWorkProfile owners, exact-source aliases and ordinary imported English fallback. No extractor change, generated catalogue or saved prose is introduced.

Additive production display maps

Files named data/production_<suffix>.js may declare literal FBDATA.productionGoods_<suffix> and FBDATA.productionRecipes_<suffix> maps, then compose individual new ids into the ordinary registries. Static extraction reads these maps without executing composers and retains productionGood and productionRecipe name/desc/fallback owners and exact-English aliases. Duplicate ids, including a base-table id, nonliteral maps and nonliteral display fields reject. These are additive source maps, not new mod roots or correction owners. Runtime JSON still uses productionGoods and productionRecipes. Feature authoring does not regenerate catalogues.

data/technology_transmission.js uses the same complete literal correction convention for paper_making. Its unchanged name and description retain tech.paper_making display owners and exact-English aliases; the regional schedule is untranslated metadata. Paper Scholarship and Royal Capitularies retain their existing learning and civic/military source owners.

Files named data/technology_<suffix>.js may declare literal FBDATA.tech_<suffix> maps for additions and FBDATA.techCorrections_<suffix> maps for complete replacements. Files named data/buildings_<suffix>.js use FBDATA.buildings_<suffix> and FBDATA.buildingCorrections_<suffix>. Table suffixes may differ from the filename, and one file may declare several maps. The static extractor resolves all definitions before registering text, without executing a composer. These tables organize source only; they introduce no runtime registry, JSON mod root or public add helper.

Each supplemental row supplies literal name and desc fields, either strings or maps of literal faith branches. Complete corrections own the final fields, including every branch that should remain; omitted branches disappear rather than inheriting stale English. Existing tech.<id>.<field>.<branch> and building.<id>.<field>.<branch> owners remain stable. Compatible variants keep their keys, and exact-English aliases and source locations come from the final definition. Unchanged base definitions retain their existing owners and sources. Numeric, history, prerequisite and effect fields are not translated.

An addition must have a new id, and a correction must target an existing definition with exactly one correction owner. Repeated ids, fields or variant branches are errors even when their English matches. Dynamic or missing display fields are rejected. Put any changed faith variant in that complete correction; direct field or branch assignments in these catalogue source files are rejected because they could overwrite the extracted English later. Reading a display field does not override it. Runtime composers still add or replace individual ids after the base tables under their ordinary validation; extraction does not run or validate their gameplay transactions. Catalogue generation remains a separately authorized integration step.

data/technology_foundations.js declares literal FBDATA.techCorrections_foundations replacements for seed_selection, haymaking, stone_sawing, water_power, powered_mills, legume_rotation, heavy_plough, improved_husbandry and selective_stockbreeding. Their names and descriptions retain the ordinary tech.<id> display owners and final-English aliases. Costs, evidence ranges, source codes and regional adoption pairs remain untranslated metadata.

Household presentation tables in data/story_*.js are discovered by their literal FBDATA.householdTracks_<suffix> and FBDATA.openingProfiles_<suffix> assignments. The filename may describe the start rather than the story type. Existing householdStory and openingProfile owners and exact-source aliases remain the same. Discovery parses source literals and never executes story scripts.

# i18n authoring guide

Local formation contribution chrome uses literal FB.T phrases with maximum, amount, training and food placeholders. Imported preparation titles and introductions keep ordinary effective English fallback. Provider kinds, original actor/appointment references, contribution policy, exact amounts and saved provenance stay locale-neutral. The shared story sheet owns review and navigation; no rendered prose is persisted and no generated catalogue change accompanies this capability.

Separate ruler agenda sources

Files named data/story_*.js may declare literal FBDATA.rulerAgendas_<suffix> maps and compose them into storyInstances; the suffix can differ from the filename. Static extraction retains rulerAgenda.<id> owners and exact-source aliases for title, intro, stage name/text and choice label/detail, matching the central rulerAgendas table. Extraction never executes the composer. Proper names, ids, dates and operation keys remain untranslated. These tables organize content and add no runtime mod root. A file may pair one with the existing openingProfiles_<suffix> convention, as data/story_western_rulers_1096.js does; starting labels retain their ordinary start scenario owners. No generated catalogue change is required for feature authoring.

Bohemond’s scenario, family-preset and opening text remain in startScenarios_western_rulers_1096. His stages and goal/contact text extend the same literal western agenda and opening-profile tables, using the existing scenario, rulerAgenda and openingProfile display owners. The proper name, working year, physical ids and saved choices remain locale-neutral.

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

data/starts_1241.js uses the literal startScenarios_1241 array for ordinary scenario.<id> display owners. data/story_households_1241.js uses literal householdTracks_1241 and openingProfiles_1241 tables for householdStory.<id> and openingProfile.<id> owners. Keep stage and choice display text literal, with numeric costs expressed through money placeholders where applicable. The dated travel purpose and arrival event use the ordinary travelPurpose and event owners in data/travel.js and data/events_travel.js. No generated catalogue change is needed for source authoring; new English retains normal fallback.

data/bookmark_1241.js declares its literal name and description in FBDATA.bookmarkCandidates['1241']; the generic candidate extractor assigns bookmark.1241 owners without executing composition. Regional labels keep their scaffold owners, and the published faith keeps its religion.sahel_local_practice_1241 owners. Publication copies display fields without rewriting their sources. Proper personal names and stable ids remain untranslated; integration catalogue generation is separately authorized.

data/bookmark_568.js keeps its literal name and description in FBDATA.bookmarkCandidates['568'] before publishing the composed world. The generic candidate extractor assigns bookmark.568 owners. data/starts_568.js uses the ordinary literal FBDATA.startScenarios_568 array and scenario.<id> owners. The composer copies regional display records without changing their source owners. Static extraction does not execute composition or initialize people.

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

Water operation presentation

buildingOperationProfiles and buildingOperationAssignments contain only structural references and numeric terms. They introduce no display fields or extraction namespace. Ordinary building name/desc owners and JSON English fallback remain canonical. Water-service actions, finite water/work/upkeep reviews, idle-state explanations and stale-term feedback use literal FB.T with numeric/money placeholders in js/building_operations.js and js/ui_modals.js. Saved bindings and receipts contain no rendered prose. No generated catalogue is changed during implementation.

Physical geography additions

A data/geography_*.js composer may declare its new scenery seeds in a literal local PROVINCE_ADDITIONS array. extract_geography_additions reads each seed's id and name without executing the file, producing province.<id>.name.<branch> and the normal exact-source alias used by FB.L. Copying a label into the geography names table keeps the same source owner. Coordinates, terrain, geography ids and dated habitation remain separate. Catalogue regeneration is an independently authorized integration step.

Composed technology and building owners

tools/test_i18n_technology_buildings.py checks all 36 technology corrections, eight building corrections and the hospice addition together. Each final name/description variant retains its tech.<id> or building.<id> owner and owning supplemental source path. Source aliases follow final English; removed Library variants stay removed. data/economy_maritime.js changes fishing requirements only, so its unchanged enterprise display owner remains data/economy.js. The ordinary JSON composition example uses imported English fallback and adds no runtime catalogue file. The combined source inventory is documented in docs/research/technology-and-buildings.md.


Local incident display ownership

Native local incident tables use literal FBDATA.localThreats_<suffix> declarations in data/story_*.js. Static extraction discovers those tables independently of the filename and gives title/intro and each choice label/detail localThreat.<instance> and localThreat.<instance>.choice.<choice> owners, with ordinary exact-English aliases used by the shared story renderer. Character ids, actor kinds, localities, operations and lifecycle data remain untranslated identity/protocol. Shared status and review chrome uses literal FB.T calls. Runtime JSON imports use their ordinary English fallback. No native incident content or generated catalog is added by the shared type.

Production display owners

Literal FBDATA.productionGoods and FBDATA.productionRecipes in data/production.js use productionGood and productionRecipe structured namespaces for name/desc. Production recipes additionally extract their top-level fallback display. The static extractor reads declarations without executing the game; unit ids, input/output references, quantities, prices and impact-review ids remain structural. Ordinary imported names/descriptions/fallback use the same display owner and safe English fallback. Dynamic batch reviews use FB.T, with no rendered explanation saved in lots or receipts. tools/test_i18n_production.py covers independent literal catalogues and fallback without executing a declaration.

Named camp and survivor presentation

js/household_party_camp.js uses complete literal FB.T messages for family-place requests, current host consent, deadlines, affected/excluded people, private road costs and new survivor recovery. Imported household_party title and intro retain their existing effective-English fallback. Proper names, stable actor/migration/generation references, capacity and route facts stay locale-neutral. Personal-admission status, county location and permanent residence remain separate facts. No rendered prose is saved and no new extraction root or generated catalogue is needed.

Construction profile display owners

Literal FBDATA.buildingProfiles in data/building_profiles.js and literal FBDATA.buildingProfiles_<suffix> in data/building_profiles_*.js extract name and desc as buildingProfile.<id>.name.default and buildingProfile.<id>.desc.default. Extraction parses static tables without executing composition code. Runtime selectors, reviews and reverse technology consumers use the same buildingProfile owner through dataText; imported JSON uses normal English fallback. Saved markers contain only stable ids, versions and fingerprints. tools/test_i18n_building_profiles.py covers an independent root and supplement. Generated catalogues remain unchanged until separately requested integration.

Finite supplier presentation

Production exchange/producer profiles and assignments contain only structural fields and no new display namespace. Goods retain their productionGood static owners from data/production.js and ordinary imported English fallback. Settlement exchange cards and confirmation reasons use literal FB.T phrases for unit quantity, current price, finite demand/budget and actual account type; kv labels retain their ordinary localized route. Saved economic receipts contain ids and numeric quantities, never rendered status or prose. Feature work does not regenerate any catalogue.

Temporary shelter presentation

Literal FBDATA.householdRefuges_<suffix> tables in data/story_*.js expose title and intro under householdRefuge.<id> owners and exact-English aliases through static extraction. The extractor does not execute source or translate provider/party/site identities. Ordinary JSON imports use the same FB.T title/intro fallback; generated choices and reviews use literal FB.T chrome and locale-neutral saved facts. tools/test_i18n_household_refuges.py covers two independent source filenames without executable registration. No generated catalogue update is part of authoring.

Siege equipment presentation

Literal FBDATA.siegeSupportProfiles in data/siege_support.js uses siegeSupportProfile.<id>.name.default and siegeSupportProfile.<id>.desc.default owners and ordinary exact-source aliases. Static extraction reads these labels without executing declarations. Imported labels retain English fallback. UI names/descriptions use the normal source lookup and complete dynamic costs, quantities, blockers and terms use FB.T placeholders. Stable profile, recipe, good, host, war, person and receipt identities remain locale-neutral; saved support contains no rendered text. No generated catalogues are needed for authoring.

Maintained maritime work presentation

Literal FBDATA.maritimeWorkProfiles in data/maritime_work.js uses maritimeWorkProfile.<id>.name.default and maritimeWorkProfile.<id>.desc.default owners with exact-source aliases and ordinary imported-English fallback. Static extraction reads display prose only and never runs production or invoice transactions. The shared settlement review renders these fields through FB.dataText; invoice, contribution, quantity, private payer, expiry, blockers and confirmation consequences use literal FB.T phrases with named placeholders. Saved receipts contain structural ids and numbers only. No generated catalog command is needed for feature authoring.

Fort material display

fortProfiles entries deliberately contain structural material ids and numeric level requirement maps only. Their key refers to an existing buildingProfile, whose literal name and desc use the normal buildingProfile structured owner and buildingProfiles_<suffix> static supplement extraction. Material labels belong in that display prose, never in engine id dispatch. The existing profile selector, fort Details and reverse technology sheet render through those owners; all new blockers use FB.T. No generated catalogue change is required on the feature branch.

Engineered water display ownership

data/technology_waterworks.js declares tech_waterworks and data/buildings_waterworks.js declares buildings_waterworks. Their three new tech and three building rows retain the ordinary tech.<id>.name/desc.default and building.<id>.name/desc.default owners and final-English aliases. Operation policies contain only structural ids and numeric terms, with no new display owner. Existing technology requirements and Water service reviews expose current missing knowledge, input and payment through the shared localized UI. No rendered status is saved and no generated catalogue changes accompany these declarations.

Mixed building and profile supplements

Literal buildingProfiles_<suffix> tables are also extracted from data/buildings_*.js so a facility catalogue can own variants without an extra loader file. They use the existing buildingProfile name/desc owners and static extraction, including files which also hold ordinary building declarations. Runtime JSON retains English fallback. No catalogue regeneration is needed during feature work.

Literal siteResourceProfiles_<suffix> in the same buildings supplements extract name/desc under siteResourceProfile owners. This keeps physical source labels localizable without adding an extra runtime file.

Fish preservation display owners

The literal buildings_fish_drying map retains building.fish_drying_station name and description owners. Additive productionGoods_fish_drying and productionRecipes_fish_drying maps in production_fish_drying.js use the productionGood and productionRecipe namespaces through the additive production extractor. Season and producer policies contain only references and numbers. Ordinary JSON display text keeps English fallback. Existing shared reviews use FB.T; no rendered prose enters lots, batches or seasonal receipts. Generated catalogues remain unchanged on the feature branch.

Expedition preparation text

The expedition_preparation factory routes every shared status, choice, blocker, portrait label and public training/provision cost phrase through literal FB.T strings with named placeholders. Imported title/intro fields use effective English fallback through the normal story renderer. Source/actor ids, schema enums, fingerprints, reserves and formation receipts remain locale-neutral; no rendered prose is saved. No bundled instance or new structured extraction namespace is introduced. A future bundled declaration must use a supported literal presentation source before shipping; catalog generation remains separately authorized.

Expedition story composition display

expedition_program title/intro use the ordinary story instance display owners and imported English fallback. Shared intent, deadline, original person, step and cost chrome uses literal FB.T messages with named placeholders in js/story_expedition_program.js. Status/reason ids, original references and canonical cursors remain untranslated; rendered prose is never saved. No catalogue command is needed on this branch.

Water-service material display

Water-service input quantities and names use literal FB.T with productionGood name owners through FB.dataText. Policy inputs and production.waterInputs contain only structural identities and numbers. Shared confirmation shows the exact named materials, water quantity, payment and finite term. Imported goods retain ordinary English fallback. No generated catalogue is changed.

Bath and headworks display owners

The literal tech_baths_headworks and buildings_baths_headworks supplements use existing tech and building name/desc extraction. buildingProfiles_baths_headworks uses the existing buildingProfile display owner. heating_fuel lives in the ordinary productionGoods assignment in data/production.js and uses productionGood.heating_fuel name/desc. No production-supplement extractor or generated catalogue is required. This keeps the small fuel display addition independent of optional manufacturing supplements. Static extraction coverage is authored in tools/test_i18n_baths_headworks.py; execution and catalogue generation remain owner-controlled.

Production supplements

Literal FBDATA.productionGoods_<suffix> and FBDATA.productionRecipes_<suffix> maps in data/production_*.js use the existing productionGood and productionRecipe name/desc/fallback owners. Static extraction reads the maps without executing their composition. Units, quantities, prices and references remain untranslated; new English uses normal authored fallback. Compose each unique addition into its ordinary root before runtime validation. Catalogue generation remains a separate owner request.

Eastern ruler presentation

The literal startScenarios_eastern_rulers_1096 array in data/starts_eastern_rulers_1096.js uses ordinary scenario display and family-preset owners. data/story_eastern_rulers_1096.js declares rulerAgendas_eastern_rulers_1096 and openingProfiles_eastern_rulers_1096 for rulerAgenda and openingProfile owners and exact-source aliases. Supplemental agenda extraction uses the shared rulerAgendas_ story-table discovery alongside the legacy table; it must be integrated before generating a catalogue containing these texts. Runtime presentation remains the shared translated story surface with normal English fallback. Personal names, family birth years, identifiers and saved decisions are locale-neutral.

Mainz household display owners

The native starts_mainz_1096 scenario supplement, householdTracks_rhineland_1096 graph and party titles, householdRefuges_rhineland_1096 shelter and openingProfiles_rhineland_1096 goals use existing static extraction and exact-source aliases. The literal bookmarkRevisionContent_1096_mainz table owns its dated settlement label through the existing revision-content extractor. Named people and structural references remain identities. tools/test_i18n_mainz_household.py covers these sources without requiring generated catalogue changes.

Protective party review chrome

js/mobile_guard.js and js/ui_mobile.js use literal FB.T messages for protective guard, expiry, unresolved authority and zero-cost release. The shared sheet renders original personal names and effective county labels as parameters. Stable actors, ids, declarations, locality, clocks and saved dispositions contain no rendered text. This generic capability adds no bundled historical display table or catalogue-generation step.

Dispersed camp presentation

Runtime camp labels, local stock/ration facts, blockers and reviews use literal FB.T calls in js/mobile_camps.js and js/ui_mobile.js. Camps use numbered labels; actual county/site labels retain their existing owners. Stable camp/member ids, location provenance and accounting contain no rendered prose. Independent ordinary JSON examples retain the normal imported English fallback. No new extraction namespace, saved display string or generated catalogue is added.

Alexander opening display owners

data/starts_alexander_1241.js uses the literal startScenarios_alexander_1241 array for scenario.alexander_1241 fields. data/story_alexander_1241.js uses householdTracks_alexander_1241 and openingProfiles_alexander_1241 for the existing householdStory and openingProfile owners. data/bookmark_1241_alexander.js declares its town label in bookmarkRevisionContent_alexander_1241.layouts, using the ordinary dated layout extractor. The travel purpose and arrival event retain the standard travelPurpose and event owners. Keep literal display text and exact ids; no engine prose, saved rendered text or generated catalog changes are needed.

Guarded principal beginning text

originalPrincipal, actor ids, guard ids, location and saved party provenance remain locale-neutral metadata. Scenario and household-track labels retain their ordinary data owners and effective imported-English fallback. The fixed-identity summary adds one literal FB.T explanation of protective guard, unavailable command/travel and host-reviewed release. Validation errors reuse the ordinary localized start/save error phrases. No rendered prose is saved, no new display registry is introduced and no generated catalogue changes accompany the capability.
