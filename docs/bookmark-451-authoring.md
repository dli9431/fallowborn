Spring 451 scaffold

The registered 451 definition is hidden. It is an uncorrected authoring copy of
the fresh 476 wider_v2 world on europe_regional_2, not a reconstruction of the
political world in 451. The existing geography, 502 inhabited counties, 25 scenery
cells, resident mixtures, development, title groups and ordered settlement slots
are copied into independent literals. The source world's later optional review
revisions are not selected. No existing bookmark or retained revision is changed.

The copied rulers, courts and institutions remain scaffold values. Their birth
and death years move back 25 years to retain relative ages; those numbers and
inherited names assert no dated biography. Civil opening actors and appointments
remain ordinary scaffold declarations. Source story-bound actors and host-command
appointments, opening claims, estates, migrations, scripted history and world
stories are excluded. The copied military appointments depend on hosts created by
the source world's stories, which are absent here. In
particular, no 476 ruler-return story or opening migration attaches to 451.

Regional ownership

Each physical row and court has one literal owner. A court belongs to the region
containing its capital; another region can reference that court without declaring
it again. Administrative titles, sites and opening actors likewise have one
declaration, with ordinary cross-region references.

| Source | Literal region | Physical rows | Courts | Scope |
| --- | --- | ---: | ---: | --- |
| data/bookmark_451_scaffold_a.js | gaul_iberia_britain | 173 | 24 | Gaul including the middle Rhine, Iberia including Mallorca, Britain and its northern/island districts |
| data/bookmark_451_scaffold_b.js | italy_africa_dalmatia | 71 | 14 | Italy and its Alpine districts, Dalmatia, western North Africa and its oases, three Saharan scenery cells |
| data/bookmark_451_scaffold_c.js | danube_eastern_provinces | 78 | 9 | Noricum, Raetian and middle-Danube districts, Moravia, the Balkans and all copied eastern imperial provinces, including Egypt and Cyrenaica |
| data/bookmark_451_scaffold_d.js | outer_regions | 205 | 96 | Ireland, northern and outer regions, steppe, non-imperial Caucasus/Near East, Arabia, Nubia, Horn and Sahel, remaining scenery |

These are source organization boundaries. They convey no political authority.
Noricum's Salzburg, Linz, Klagenfurt and Graz rows are separated from the Italian
court declaration. Dalmatia is separated from the eastern provincial block.
Mallorca is separated from the African court's other counties. Mainz, Worms and
Koblenz retain their single middle-Rhine court in the Gallic partition. The eastern
imperial holdings, including their widened Egyptian and Syrian additions, stay
together; non-imperial Near Eastern holdings remain in the outer region. Wider
inhabited additions and all scenery have explicit owners.

Assembly and declarations

data/bookmark_manifest.js records the hidden metadata, the 476 catalogue
dependency and every deferred contributor. The dependency supplies existing
shared profile and identity definitions, not a mutable source world. The four
regional files load first, followed by data/bookmark_451.js and the dated
declaration tables. data/bookmark_451_composition.js closes the complete unit
before data/bookmark_sources.js seals native sources. The title does not load the
date merely to display the picker.

The assembler rejects missing physical rows, duplicate county/court/catalogue
owners, missing owners, capitals or settlement layouts, conflicting physical
sites and duplicate starts. It publishes no partial world. Bootstrap then uses
the existing native source composer, complete bookmark requirements, ordinary
JSON validators, story compiler and independent start/graph acceptance. No engine
validator runs during source loading.

The empty registered declarations are:

| Source | Literal tables |
| --- | --- |
| data/bookmark_451_identities.js | bookmarkCultures451, bookmarkReligions451, bookmarkFaithAvailability451 |
| data/bookmark_451_governments.js | bookmarkRevisionContent_451_governments, bookmarkOffices451, bookmarkMobileProfiles451 |
| data/bookmark_451_presentation.js | bookmarkLexicons451, bookmarkWardrobes451, bookmarkAmbitions451 |
| data/starts_451.js | startScenarios_451 |
| data/story_451.js | householdTracks_451, rulerAgendas_451, openingProfiles_451 |
| data/campaigns_451.js | storyCampaigns451, bookmarkWorldStories451 |
| data/events_451.js | dated_451 event pack, late_antique, years 451–453 |

Government records use existing typed catalogues. The revision-content realms
array replaces a same-id scaffold court or adds a new declared court; complete
validation still decides whether the resulting world is valid. Lexicon entries
add distinct ids within eras, governments, faiths or cultures. Wardrobes and
historical ambitions use their ordinary catalogue contracts. Existing records
are not overwritten to make a new declaration fit.

Personal story tables contain ordinary typed instance declarations and attach
through their starts' tracks. World story ids are listed explicitly in
bookmarkWorldStories451. Starts and graphs retain the normal native ownership
boundary, so a rejected personal graph withholds its start. None of these source
organization tables is a new runtime JSON mod root.

The scaffold adds only this date to the existing restricted regional faith
permissions. Harranian local worship uses mesopotamian_scaffold_451 and the
Sasanian court uses zoroastrian_sasanian_scaffold_451, separately scoped copies,
because their source definitions have explicit 476–493 windows. The court copy
retains its consumer restrictions and shifts that window back 25 years. Existing
availability is preserved. This is copied authoring data, not a new historical
confession decision.

An ordinary farmer_451 declaration in data/bookmark_451.js supports a generic
review journey while the dedicated start table remains empty. The date stays
hidden for picker, codes, direct creation and Observe. Matching save restoration
uses the normal saved identity and fingerprint contracts. Technology coverage
uses the shared 375–1300 catalogue. The dated assembler extends the existing
late_antique technology window to 375–649 before canonical review; registration
does not bypass that boundary. This content
adds no engine capability, technology-impact decision or saved schema.

Focused regression fixtures

tests/e2e/specs/bookmark-451-validation.spec.js has an append-only fixture file
registration list. Each tests/e2e/fixtures/authoring/bookmark-451*.json file names
bookmarkId and can declare regions, checks, starts and stories. regions pins
physical county ownership. checks contains path/equals rows against the resolved
world. Optional root selects cultures, religions, governmentForms,
authorityOffices, mobileProfiles, administrationProfiles, aristocraticProfiles,
lexicons, wardrobes, historicalAmbitions, startScenarios or storyInstances for
literal declaration assertions; an @id path component selects an array record
by stable id. starts checks
offering and the canonical runtime report. stories checks registered attachment
to the world or an offered start. Complete bookmark validation runs for every
fixture, independently of its semantic assertions.

The shared spec also checks cold source loading, hidden visibility, complete
disjoint physical coverage, every existing raw world and retained-revision
fingerprint against a control without 451, malformed JSON rejection, and a short
ordinary household journey with load/re-save/load replay. Requirement and smoke
checks use the assembled catalogue and era declarations without browser coverage
overrides. Owner device/play acceptance remains separate.
