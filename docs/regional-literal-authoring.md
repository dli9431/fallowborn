# Regional literal presentation

Regional files are inert inputs to the existing trusted bookmark composer. They
do not register partial worlds, initialize people, validate candidates or change
saved identities. Keep complete validation and publication at the existing source
boundary described in MODDING.md, Trusted bookmark composition. Static extraction
reads source tokens; it never evaluates JavaScript or invokes a composer.

## Flat regional files

Use `data/bookmark_<date>_region_b<two digits>.js`, for example
`data/bookmark_634_region_b01.js`. Declare complete literal objects assigned to
`FBDATA.bookmarkRevisionContent_<unique suffix>`. Each supplies literal
`bookmarkId` matching the filename and an explicit nonempty `revision`. Keep the
existing revision when moving its source; a filename change is not a new world
revision. Existing scaffold files and their owners remain supported. Extend the
existing declarations rather than making a second copy of the same content.

Supported top-level fields are `bookmarkId`, `revision`, `provinces`, `realms`,
`duchies`, `kingdoms`, `empires`, `cultures`, `layouts`, `governmentForms`,
`administrationProfiles`, `aristocraticProfiles`, `climate` and `climates`.
Province and realm tables are arrays with explicit string `id` fields. Other
tables are keyed objects. Layout values are arrays with explicit string `site`
fields. Government selection members and aristocratic interests are arrays with
explicit string `id` fields. Operational records still follow their ordinary
runtime schemas; this source convention does not add mod roots or strategies.

All values in a flat declaration must be literal objects, arrays, strings,
numbers, booleans or null. No calls, references, concatenation, spreads, computed
keys or duplicate object keys are accepted. A missing declaration, missing
bookmark/revision owner, malformed table shape, missing row identity or
unsupported top-level table raises an extractor error. Comments and strings
cannot masquerade as declarations. Keep one complete assignment per owner.
Do not patch display fields after their declaration or derive new prose in a
composer. Composer code may copy the literal records without rewriting them.

## Display owners

`<branch>` is `default` for a string, or the existing faith branch for a literal
branch map. Preserve ids, branch names and dated-name array ordering.

| Literal field | Stable extraction key |
| --- | --- |
| provinces/realms row `name` | `province/realm.<date>.<revision>.<id>.name.<branch>` |
| provinces/realms row `names[index].name` | `province/realm.<date>.<revision>.<id>.name.dated.<index>.<branch>` |
| duchies/kingdoms/empires entry `name` | `duchy/kingdom/empire.<date>.<revision>.<id>.name.<branch>` |
| layouts slot `name` | `settlement.<date>.<revision>.<site>.name.<branch>` |
| cultures entry `name` | `culture.<id>.name.<branch>` |
| administrationProfiles entry `name`, `desc` | `administrationProfile.<id>.<field>.<branch>` |
| aristocraticProfiles entry `name` | `aristocraticProfile.<id>.name.<branch>` |
| aristocraticProfiles entry `interests[].name` | `aristocraticInterest.<profile>.<interest>.name.<branch>` |
| governmentForms entry `selectionProfile.members[].name` | `governmentSelection.<form>.member.<member>.name.default` |

Selection member names use plain strings, preserving the existing default-only
owner. Proper person names, ids, quantities, selectors and climate references
are not translated. Every extracted string also receives its normal exact-English
alias. Different text under the same key rejects instead of replacing the owner.
Existing non-revision scaffold keys remain unchanged; do not move their labels
to revision-owned keys merely to split a file.

## Companion table audit

The autumn 634 sources already have the following literal owners. Extend these
files and tables for their own content; do not bury their prose inside a regional
table or recreate the existing starts and tracks. These routes also apply while
content is hidden or awaiting complete world composition.

| Content | Literal source contract and display fields |
| --- | --- |
| Dated faiths | `bookmarkReligions634` in `data/bookmark_634_identities.js`: existing `religion.<id>` owners for `name`, `desc`, `properties.head.title`, and `properties.words` / `properties.roles` entries. The three existing faith identities retain their keys. `bookmarkFaithAvailability634` is selector data, with no prose. |
| Courts and provincial profiles | Existing regional realm `name`, administration `name`/`desc`, aristocratic `name` and interest `name`, and selection member `name` use the owners above. Ruler names remain proper names. A profile id is global, so a dated configuration needs its own id. |
| Starts | `data/starts_<suffix>.js` declares `FBDATA.startScenarios_<suffix>` as a literal array. Fields `name`, `diff`, `desc`, `intro`, `intro_f`, `intro_muslim`, `intro_other` use `scenario.<id>.<field>.<branch>`. `familyPresets` map fields `name`, `diff`, `desc` retain `scenario.<id>.familyPresets.<preset>.<field>.<branch>`. The 634 ruler, ordinary, Damascus, Ctesiphon, Medina and frontier files already follow this convention. |
| Household tracks | `FBDATA.householdTracks_<suffix>` in `data/story_*.js`: `title`, `intro`, keyed `stages` fields `name`/`text`, and stage `choices[]` fields `label`/`detail` retain `householdStory.<id>` owners, with `.stage.<stage>` and `.choice.<choice>` paths. All four 634 household files already use these tables. |
| Ruler agendas | `FBDATA.rulerAgendas_<suffix>` in `data/story_*.js`: `title`, `intro`, `stages[]` fields `name`/`text` and stage `choices[]` fields `label`/`detail` retain `rulerAgenda.<id>` owners. The existing `story_ruler_agendas_634.js` owns both ruler programs. |
| Opening goals | `FBDATA.openingProfiles_<suffix>` in `data/story_*.js`: `title`, `intro`, `goals[]` fields `name`/`text`, `criterion.reason`, and `contacts[]` fields `label`/`text` retain `openingProfile.<id>` owners with `.goal.<id>` or `.contact.<id>` paths. Existing Damascus and Ctesiphon goals remain in their household source files. |

Household, agenda and goal owner paths end in the field without a branch suffix,
so their presentation fields use plain strings. Stable stage, choice, goal and
contact ids are mandatory in new content. Registration, operations, prerequisites,
people and story state remain with their existing engine and save owners. Durable
news requires the existing opaque message contract, not saved rendered prose.

The supplemental start, household, ruler-agenda and goal extractors are shared
dependencies already present in the repository. Do not reproduce them in a dated
extractor. Keep faith and start declarations in their recognized companion files.
Additional display fields or catalogue families need their owning extractor and
source-only regression coverage before content can rely on them.

## Coverage and integration

`tools/test_i18n_regional_literals.py` covers two independent literal date/revision
configurations, existing owner spelling, exact-English aliases, excluded proper
names, malformed or missing owners, computed data and conflicting source keys.
These tests read source text only. They do not register or activate game data.
The existing 634 scaffold, identity, ruler and household specifications continue
to own runtime validation and campaign restoration.

Loading a new shard still requires the normal explicit ordered script entry and
trusted source manifest integration. This convention installs no new shard or
runtime behavior. Catalog generation remains separately authorized; new prose
uses the normal English fallback until integration. No saved-schema or technology
change accompanies this development-tooling convention.
