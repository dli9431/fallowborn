# Religions and faith fracture

Late antique local head offices

js/religion.js owns provincial councils and public ruler profession through the optional church_councils and ruler_conversion systems. Both default to disabled, are enabled by late_antique, and require episcopal_sees in the acting court's context. The existing bishop of Rome and patriarchal offices retain appointment succession. Their head data requires an adult priest through holderRole and minAge, preventing appointment of a lay emperor or child merely because they are the oldest follower. Local sees use the same eligibility and preserve separate vacancies, including the restricted Carthage see.

A provincial council requires a living adult ruler at peace, two living bishops in one communion holding sees in directly held counties, protected worship and 30 treasury gold. A Homoian ruler can therefore protect a Nicene council without converting. Each bishop records church_support in their own county through the authority ledger and those counties gain 8 Popular support. Existing support decay applies; another council must wait 720 days. Recognition lapses on replacement of its bishop. A council changes no doctrine, community partition, court faith, legal identity or ownership. FB.churchCouncilQuote is pure; FB.conveneChurchCouncil rejects stale reviewed facts before payment. These provincial gatherings claim no universal doctrinal jurisdiction.

Public profession uses the realm scope of Convert faith and the same decision API for player and AI. It withdraws old-communion church recognition, changes official and governing elite faith, and permits living bishops of the new communion to issue scoped support at their own directly held sees and a protected capital. Community consequences and AI evaluation are specified in docs/designs/conversion.md. Technology impact is none for provincial_church_councils and public_ruler_conversion: participants, protected worship, political allegiance and resources constrain baseline social decisions, with no credible research dependency. The 476 campaign keeps papacy, excommunication, great holy wars and abbey-house content disabled while retaining late antique religious progression.

Nicene, Homoian, Chalcedonian and Miaphysite heads declare the episcopal_sees system requirement and are absent from the active office registry when it is disabled. Local sees supplement that registry by officeId, without inventing a faith for every bishop. FB.religiousOfficeSnapshot checks the exact office's living holder and faith without creating or repairing an assignment. Character office projections use the exact office rather than returning the central faith head for every local see.

Faith validation checks every effective head's system membership, including inherited heads and faiths unused by the current bookmark. An unknown system is an authoring error before office resolution or campaign creation can call its availability query. A campaign see may supply the opening incumbent or vacancy for its own compatible character-held episcopal head office; unrelated or realm-held central offices remain invalid local seeds.

The religiousHeads ledger holds episcopal pointers. Local office death records a vacancy without invoking the central faith's succession strategy; central heads retain ordinary appointment succession. Vacant institutions cannot mediate. Mediation issues county-scoped church support through the authority ledger with a living bishop as issuer. It changes no resident faith or political power and has a none technology-impact review.

Local mediation and provincial councils use FB.political.worshipProtected for the county's current declared treatment, active player royal worship policy and persecution modifier. A reviewed mediation includes the governing identity and community-support facts; changing those facts invalidates the review before it can issue church recognition. A persecution policy cannot be bypassed by leaving the legacy persecution modifier unset.

The Dalmatia/east declaration adds Chalcedonian local sees at Thessalonica, Dyrrachium, Serdica, Nicaea, Ephesus and Caesarea to the shared institution catalogue. Their incumbents are generated adult priests, independently tracked by officeId and representativeId; Glycerius and Acacius keep their historical identities at Salona and Constantinople. The eastern ruler can now gather multiple living bishops in directly held counties through the existing provincial council decision, while vacancies, protected worship, peace, funds and reviewed counterparties still govern eligibility. These additions extend the none technology reviews for provincial_church_councils and episcopal_institution_mediation. They do not introduce doctrine reform, central heads or a new research gate.

Religion is one inheritance graph, not a pair of engine concepts for “religion” and
“religious group.” Seeded definitions live in `FBDATA.religions`; faiths founded during
a campaign use the same JSON-safe definition shape in `state.faiths`. Characters,
provinces, and realms continue to store one stable faith id.

## Definition graph

Every table key is a faith id. `group` points to the definition inherited from; `parent`
is accepted as an equivalent spelling for programmatic callers. A root omits both.
Broad identities such as `christian`, `muslim`, and `pagan` are ordinary nodes with
`assignable:false`: they supply shared doctrine and vocabulary but cannot be assigned to
a person or map province. This keeps “Christian” useful as an ancestor without creating
characters whose only identity is Christianity.

Serf tenure archetype selectors query this inheritance graph through
`FB.faithIsA(faith, ancestor, state)`. Faith ancestry is only one formation-time
constraint: household culture/tradition and permanent-home facts further narrow the
Latin manorial, irrigated fellah, pastoral steppe, woodland, Norse coastal, and broad
pagan household-service packages, with neutral dependent farming as fallback. The
protagonist household's faith is authoritative even when the county principal differs.
Conversion after formation does not rewrite saved tenure, and possessing a faith ancestry
does not by itself grant a duty, right, item, holding, modifier, or hidden bonus.

Identity and lifecycle fields stay local (an omitted icon alone may fall back to the
parent's icon):

- `name`, `adjective`, `collective`, `desc`, and `icon` describe this node;
- `group`/`parent`, `relationToParent`, and `relations` define graph edges;
- `assignable` and `active` control whether a node may appear in play;
- generated records may also carry `createdTurn`, `founderId`, and
  `originProvinceId`.

Mechanics live under `properties`. Objects merge recursively from the root toward the
leaf. Scalars, arrays, and `null` replace the inherited value. Thus a child can override
only `marriage.spouseLimit.m`, explicitly remove an inherited religious head with
`head:null`, or replace a complete title array. Identity text is deliberately not
inherited. Legacy definitions that put qualities such as `head` at the top level still
compile as properties, and old `group:'christian'` mods now naturally inherit the
Christian root.

The initial property vocabulary is intentionally extensible rather than a closed enum:

- `marriage.spouseLimit`, `marriage.divorce`,
  `marriage.acceptedRelations`, and optional
  `marriage.kinship.siblingRite` for a narrowly recognized sibling rite;
- `rankTitles.m` / `rankTitles.f`, read only for modded or runtime faiths; built-in
  ladders are faith-layer entries in the lexicon (`data/lexicons.js`, see
  [i18n.md](i18n.md));
- `words.deity`, `words.cleric`, `words.temple`, `words.landed`, and the
  faith-flavored `words.partnership` label;
- `roles` for monastic, priestly, episcopal, cardinal, abbatial, and qadi titles,
  plus `clergyMarriage`;
- `religiousPaths.lay` and `religiousPaths.professions` for the validated
  character-progression paths defined in `FBDATA.religiousPaths`;
- `systems` capability flags such as `papacy`;
- optional `head` metadata, including a stable office, holder-sex eligibility,
  recovery, and great holy wars.

A bookmark can disable new great holy war calls with `greatHolyWars:false` when its
regional world does not contain the global campaign targets. This is a bookmark
rule; the faith definitions and other bookmark campaigns remain intact.

The player-reformable subset is declared separately in
[doctrines.md](doctrines.md). Its catalog maps options onto these same inherited paths,
so the details sheet, cost preview, and mechanics cannot drift into separate doctrine
lists.

Engine code reads these through `FB.religionOf`, `FB.faithValue`, and capability helpers,
not by switching on ids or broad groups. `FB.faithValue` also reports the ancestor that
authored the effective value. That source id owns its localization key.
On the compiled compatibility view, `parent` is the exact inherited-from id while
`group` remains the old four-family alias for legacy callers; new ancestry checks use
`FB.faithLineage`, `FB.faithIsA`, or `FB.faithGroup` explicitly.

## Relations and branch selection

`relationToParent` is either one status or a directional pair:

```json
{
  "childView": "in_fold",
  "parentView": "schismatic"
}
```

The statuses are `in_fold`, `schismatic`, and `hostile`; identical ids resolve as
`same`, while graphs with no common ancestor resolve as `foreign`. A scalar edge applies
in both directions, and an omitted edge status defaults to `schismatic` for legacy
definitions. `relations` supplies authored directional exceptions, and
`state.faithRelations[observerId][targetId]` stores changes that happen during play.
When two cousins are compared, the strictest edge on the path through their nearest
common ancestor wins. Consequently Ash’ari and Maturidi can both remain in the Sunni
fold, while Catholic and Orthodox remain schismatic descendants of Christianity.

`FB.faithRelationBaseline` converts that directional status into the modest social
prior used by Standing and ruler regard: `same` +15, `in_fold` +10,
`schismatic` +5, `foreign` −10, and `hostile` −25. Shared religion is an initial
source of trust rather than a verdict: culture, allegiance, gifts, grievances, and war
continue to outweigh it. An unrelated faith begins guarded but not automatically
condemned, while the severe penalty is reserved for an authored or campaign-created
hostile relation. Because the lookup is directional, a reform may still regard its
parent as in the fold while the parent regards the reform as schismatic.

Marriage, Standing, ruler regard, religious war alignment, and religion-group triggers consult
the graph. Each faith chooses which relation statuses it accepts for marriage. Structured
text and event variants search exact faith id, then each ancestor, then `default`; a new
Catholic child therefore receives Catholic prose before generic Christian prose without
copying either branch.

## Central offices

An inherited religious head uses a stable `head.officeId`; a legacy head definition
without one infers its defining faith id. Saved assignments and
vacancies are keyed by that office id, not by every inheriting child. Catholic children
can therefore recognize the same Roman office without creating duplicate Popes, and a
child can opt out with `head:null`. The core office ids remain `catholic` and `sunni`, so
existing version-3 saves retain their exact keys and assignments.

`head.holderSex` is an optional `m` or `f` eligibility rule for the person
reigning in the office's temporal realm. It is intentionally narrower than
dynastic succession: an ineligible successor may still inherit the secular
realm, but the central office immediately becomes vacant. The seeded Catholic
Papacy and Sunni Caliphate both declare `holderSex:'m'`; Papal election also
independently filters its candidates. This models the medieval legal and
institutional exclusion from those offices without turning every Christian or
Muslim secular succession into a universal agnatic law.

Campaign-founded faiths use a stricter default than authored definitions. Doctrine still
inherits through the graph, but central-office allegiance does not: a record carrying
founder/origin metadata compiles with `head:null` when it has no local `properties.head`,
and an inherited `systems.papacy` flag is disabled with it. This rule is also applied when
older saves compile, so previously founded branches stop silently recognizing a parent
Pope or Caliph without a save-version migration. An event or mod that intends continued
obedience must declare `properties.head` explicitly (`head:{}` is sufficient to retain the
inherited office). `relationToParent:'in_fold'` describes the faiths' relationship; it does
not by itself grant the parent office authority over the child.

The seeded Zoroastrian root is assignable and authors
`marriage.kinship.siblingRite:'xwedodah'`. Both characters must share that
exact effective faith and doctrine for the recognized route; inheritance from
a shared authoring root remains available to future definitions. Istakhr is
the 867 map access point. The 1066 Seljuk bookmark's existing realm-faith
override continues to make conquered Fars Sunni at that later start.

## Seeded and generated faiths

Historical definitions and broad roots are seeded in `data/cultures.js`. The core graph
includes Ash’ari and Maturidi as assignable in-fold children of Sunni even though no
bookmark county is forced to use them.

`FB.createFaith(state, definition)` validates and saves a new definition without changing
followers. `FB.foundFaith` adds founder/origin metadata, defaults the group to the current
faith, and may convert the founder, managed household, and player realm. Declarative
events expose the same operation through a `foundFaith` effect and can persist later
directional changes with `faithRelation`. This is the extension
point for authored historical outbreaks and seeded-RNG future fracture events; no engine
enum or new script file is required for a new sect.

The faith details sheet gives campaign-founded records a short in-world origin account
assembled from the founder, place, date, faith name, and parent tradition. It also shows
the complete lineage, directional parent relation,
central office (or explicit independence), spouse and clergy rules, and the ancestor that
supplies inherited doctrine. The same sheet opens from Faith entries on Self and Land.

County faith has two deliberate sources. Immutable bookmark fields define activation,
New Game, validation, and historical heartlands. During a campaign,
`FB.countyReligion` projects the saved live demographic plurality and community-share
helpers expose every locally practiced faith without mutating `FBDATA`. Event province
triggers, county presentation, conversion presence, and local institutional context use
that live source. Controller and realm faith remain political saved identities and do
not follow a capital county's demographic change.

Founding a faith can convert characters and the player realm, but it does not add county
followers. County population changes only through the population-owned community
transactions and the later explicit county-conversion project system. A landed founder's
faith sheet exposes a shortcut to that same gradual project for the exact home settlement;
it does not confer local adherence or begin a project on its own.

## Player conversion

The **Convert faith…** and **Adopt a new culture…** deeds let the player deliberately
convert to another assignable faith or culture — alone, with the managed household, or
(faith only, for a landed ruler, once per ruler) across the player realm by writing
`state.realms.player.religion`. Piety pays for faith and prestige for culture, with
costs escalating by scope and faith costs multiplied by the relation-graph distance to
the target (in-fold ×0.6 through hostile ×1.25). Penalties go well beyond the price:
the Standing faith-baseline re-base turns old co-religionists cold automatically, and
the deed adds popular-opinion loss, explicit Standing hits with old-fold realms and
vassals, timed `zealot_unrest` county modifiers, and — when abandoning a faith that
recognizes a reigning Pope — an `apostasy` excommunication the player can remedy only
by returning to the fold. County culture and faith are deliberately untouched. Full
design: [conversion.md](conversion.md).

## Validation and saves

The compiler rejects missing parents, cycles, invalid directional statuses, unknown
relationship targets, malformed marriage doctrine, short rank-title arrays, and invalid
explicit office ids. Bookmark validation also rejects abstract or unknown faith ids on
people-facing world records and validates each effective great-holy-war definition once
at its authoring source.

Faith records use the existing version-4 save envelope, with legacy version-3 saves still accepted. New games initialize `faiths:{}`,
`faithRelations:{}`, and `faithNextId:1`. Restore supplies those defaults when absent,
then rebuilds the derived graph before repairing religious offices. Generated definitions
and relationship changes therefore round-trip, while every older version-3 save behaves
as a campaign with no generated faiths. Title snapshots retain the legacy `group`/`tier`
fields and add source faith, sex, and English fallback words, so both old snapshots and
new generated-faith snapshots remain renderable.

Paid doctrine reform uses this graph directly. The first change creates an in-fold
campaign child. Further departures increase the price and change the parent relation to
schismatic, then hostile. A schismatic reform no longer recognizes the inherited
central office. Removing the player's final departure returns that character to the saved
direct parent. Existing followers and territorial projects keep the campaign child and
its doctrines until explicit conversion changes them, so a personal return is recognized
without erasing an established local faith. Full rules: [doctrines.md](doctrines.md).

## Spring 476 paths

Nicene, Homoian, Chalcedonian and Miaphysite faiths use shared late antique lay,
monastic and clerical progression definitions. The 476 Homoian clerical route
remains in its own faith while living local and Nicene bishops may recognize a
mediator. Neither recognition creates a religious head, a papal office or a
great holy war. The regional Moorish communities use an assignable Amazigh
traditional faith under the existing pagan root.

Religious head strategies

A central office is effective faith data. properties.head declares officeId, localized title, holderKind (realm or character), succession, optional holderSex, and optional seat. A string seat names a province; an object names province or site, with sites resolved against the active bookmark's settlements. Realm offices use head.realm as their initial holder; character offices may name head.character or begin vacant. Descendants sharing an officeId share its assignment and institutional state. The faith supplying officeId owns the office definition; give a changed institution a new officeId instead of redefining a shared office through a descendant.

FB.religiousHeads registers succession strategies in the same style as government strategies. FB.succeedReligiousHead dispatches using the effective faith. papal_election retains the existing college, laws, ballots, sanctions and schism model, scoped to that office. caliphal_claim retains the existing territorial qualifications, vacant-office claim and capital-siege succession war. Neither strategy requires a named faith. Both require realm holders. A papal_election head supplies systems.papacy when unspecified; explicit false remains respected. Removing the head or choosing another succession strategy disables an inherited Papacy capability.

appointment and hereditary support realm and character holders. A realm office follows the assigned realm's ordinary ruler succession. Explicit appointment supplies holderId through FB.succeedReligiousHead. Vacant character appointment chooses the oldest eligible living follower, breaking equal birth years by id; hereditary chooses the oldest eligible living child of the former holder. Character eligibility includes the office's optional sex restriction and recognition of the same office. Character death dispatches succession immediately; an unfilled office retains its vacancy for the existing annual recovery rule. Recovery runs once per shared office and keeps the no-due-vacancy fast path.

head.claim and head.absolution reference FBDATA.balance keys, not inline prices. Claim keys are prestige, piety, minRealm and warPrestige. Absolution keys are gold, piety and opinion. Existing claim prestige remains a qualification, and only piety is spent. Papal absolution retains the existing offering formula (one half of the gold reference plus one quarter per realm rank), sentence checks and obedience-scoped Standing remedy. A generic office with absolution uses the referenced flat prices and faith Standing remedy. Existing heads without holderKind or succession infer realm plus their prior Papal, claim or hereditary behavior.

Technology impact is none for religious_head_appointment and religious_head_hereditary. These are relationships and kinship, independent of discovery. Existing election, claim, war and recovery capabilities are refactored without adding eligibility or technology requirements.

Inherited faith traditions

Engine decisions read legalTradition, tournamentTradition, holyWarTradition, raidingTradition, music.lineage and music.fallback through the compiled faith graph. Existing marriage, clergyMarriage, roles, religiousPaths and attire remain inherited doctrine. legalTradition selects the existing latin, muslim or customary sentence form; Greek and Byzantine cultural precedence is preserved. tournamentTradition furusiyya selects mounted programmes. holyWarTradition selects campaign vocabulary without granting a head or a campaign capability. Explicit false raidingTradition overrides inherited eligibility; old raidingTraditions faith and group selectors compile into inherited true values so existing mods retain their settings.

Music checks the exact faith, its authored music.lineage, then remaining ancestry, preserving culture and role precedence and the configured fallback. intro chooses the start-scenario text path and female variant; conversionCategory owns localized conversion-group name, icon and order. feastDescription provides optional localized feast copy. Defaults and compatibility group selectors live in FBDATA.faithDefaults. The faith-id allowance in tests/e2e/fixtures/engine-ids/faith-id-allowlist.json is limited to durable message selectors, existing legal strategy names and explicitly authored historical story identities; office behavior is never selected by a faith id.

Optional faith institutions

Local religious offices read the owning campaign's localInstitutions table through FB.localInstitutionDefinitions(state). A bookmark can therefore keep a surviving office id with a different opening incumbent or vacancy, omit an office, or supply an empty table without borrowing another date's cast. Both the office resolver and saved church-council validation use the same campaign lookup, even while another world is active. Saved head assignments and institutional ledgers are preserved; representative profiles apply only to new actors. See docs/designs/council.md for the profile and seat contract. This is a data and persistence refactor with no new technology dependency.

Faith properties.systems accepts enable and disable lists as well as the existing boolean map. Compilation normalizes the local layer before merging inherited properties, preserving a parent's requirements unless the child overrides them. FB.faithHasSystem delegates to FB.systemEnabled for the named faith, so a final bookmark disable also applies to inherited and generated faiths. Papacy remains faith-enabled; medieval excommunication preserves the existing nonpapal religious-head sanctions. Catholic vocation paths retain their papacy requirement. See docs/designs/systems.md.


Africa's regional data declares separate Carthage Nicene and Homoian seats. The Nicene opening remains vacant under Vandal restrictions; the Homoian representative is explicitly generated. Altava's generated Nicene representative belongs to a mixed Mauro-Roman population rather than a universal traditional-faith Moorish identity. These seats use the ordinary local office and mediation ledger; no dated episcopal election or persecution is synthesized. Adding regional seats changes no technology eligibility and uses the existing episcopal_institution_mediation none review.

Wider spring-476 congregations

The 476 bookmark places its existing Antioch and Jerusalem office definitions on authored physical sites while retaining their office ids, incumbent opening identities and ordinary succession. The global fallback institution table keeps their null seats for other bookmarks. The 476 table additionally includes Edessa and selected British congregations, and distinct generated Zoroastrian and East Syriac interlocutors at Ctesiphon. Congregation records use the existing non-episcopal contract without inventing a head office. East Syriac Christianity is a broad Persian Christian community node with late antique religious paths and no central head; Mesopotamian traditional belief is a broad local pagan node. Local worship and mediation use the existing institutional rules and baseline none technology reviews. These declarations do not force later baptisms, doctrinal councils or bishop removals.

Public sovereign accession and religious offices

Public sovereign recognition resolves one canonical political candidate and calls the existing advanceRealmSuccession transition once. The existing religious-head record is revalidated after that transition; selecting administrative_monarchy neither creates another caliph nor grants an ineligible ruler religious authority. Political minority and female sovereignty follow the public profile, while a religious office retains its own eligibility and can remain vacant. See docs/designs/administrative-monarchy.md.

Office-bound temporal jurisdiction

A declared ecclesiastical government reads the canonical religious office without creating another incumbent or election. Local officeProfile eligibility remains in the religious registry; chapterId identifies an independent local congregation. Local appointment, resignation and qualification-based removal update the existing religiousHeads record. Spiritual validity does not confer automatic temporal recognition or property. See ecclesiastical-principality.md.

Released faith compatibility

Released faith ids retain their resolved properties, parent relationships and inherited defaults. A refinement receives a new id and may inherit from its retained predecessor. The predecessor can declare legacy:true and supersededBy with a different existing non-legacy faith id. These are non-inheriting metadata fields, not doctrine or assignability changes. Invalid replacement references are rejected during detached catalogue validation.

FB.faithAssignable remains the existence and saved-record eligibility query. FB.faithAvailable additionally checks fresh conversion eligibility: a legacy faith remains available when the campaign contains it, its retained bookmark declares it, or a saved generated faith descends from it. Fresh pickers omit other legacy ids. Personal and public ruler conversion use the same gate, while offices, relations and saved-record validation keep resolving the original profile. A current fresh bookmark revision cannot assign a legacy faith to its provinces, communities, courts, starts, institutions or story identities; retained revisions may still use it.

tests/e2e/fixtures/released-catalogue.json freezes released effective faiths separately from legacy metadata and faithDefaults. New traditions are additive. Updating a retained hash requires compatibility review, and semantic changes require a new definition or a reviewed migration. This compatibility boundary adds no researchable capability and needs no technology gate.

Dated faith authoring

A faith's top-level availability record declares optional inclusive yearMin/yearMax integers, eras, bookmarkIds and consumers. It is local metadata, separate from inherited properties. An omitted field is unrestricted; an empty selector list permits no consumer. A child needs its own declaration. Existing JSON mods that omit availability keep their prior eligibility. Invalid dates, unknown or duplicate selectors and unsupported fields fail detached catalogue validation. Availability describes potential eligibility, not evidence of local adherence or a county majority.

FB.faithHistoricalAvailable(id, bookmark, consumer) checks a fresh historical assignment against that exact bookmark's date and era. Current revisions validate county communities, rulers, court members, opening actors, institutions, head assignments, starts and typed story faith references. Retained revisions continue resolving their original definitions. The existing released-catalogue fixture and effective faith/default hashes remain authoritative; availability never changes doctrine, ancestry, a shared office, relations or assignability.

FB.faithAvailable(id, state, consumer) also checks live-year eligibility for conversion and new community projects. Established campaign identities, generated descendants and recorded project targets remain usable beyond their authoring window. Explicit consumer restrictions still apply to new actions. An expired profile never deletes followers or stops its existing project. No school affiliation, new institution, population transfer or religious milestone appears merely because a date boundary is crossed.

The Islamic catalogue minimum 622 is a conservative negative opening gate, not a claim that later Sunni/Shia constitutions existed then. The two existing theological-school profiles have a coarse minimum 900 to exclude earlier openings. This is a simulation boundary for tenth-century teaching, not an exact foundation date or permission to assign either school to a local population. Ash'ari development is discussed at https://www.iranicaonline.org/articles/ashariya/ and al-Maturidi's tenth-century life at https://www.treccani.it/enciclopedia/al-maturidi/ . Supplementary opening profiles have conservative bookmark scopes matching their existing consumers. Those scopes make no continuity or historical acceptance claim.

faith_catalogue_availability has technology impact none. Religious profession and the continuing identity of a community are social conditions, independent of discovery. The existing office, household, travel and population rules remain the behavioral authorities. Generated-faith creation validates a detached candidate before allocating a serial or changing saved state; an invalid or out-of-period declaration returns null without partial application. Coverage is authored in tests/e2e/specs/religion-coverage-rollout.spec.js, including two independently configured profiles imported through stored JSON mods.

Early Iranian faith contexts

zoroastrian_sasanian_476 supplies a fresh Sasanian court context in 476 wider_v2 and 493 world_v2. It inherits from the released zoroastrian definition without changing that definition or existing generated descendants. The court affiliation and the 476 eliteFaithId change; separately authored relatives and county communities keep their own identities. The hidden peroz_sasanian_476 beginning matches the wider court, while the retained baseline keeps peroz_476 unchanged. Revision-specific starts selectors separate those two declarations. The new profile has no central head and selects the existing sasanian_custom_476 provincial legal reference. It does not claim to implement all Sasanian family jurisprudence.

Learner, Herbed and Fire custodian distinguish study vocabulary from fire service. Both sexes can receive learning and ordinary fire-care vocabulary; this does not attest female priestly ordination or confer any office. religiousPaths:null avoids an inherited Christian monastic ladder. Institutional admission, priestly qualification, marriage obligations attached to a specific office, endowed property and a dated service site need separate contracts before becoming playable. Household hearth care, a temple's property and a custodian's household remain different subjects.

The fresh profile retains the existing one-spouse capacity and divorce prices as simulation settings. Its optional xwedodah rite represents a normative tradition, not a universal practice rate. Court affiliation never seeds close-kin unions or changes the doctrine of an existing household. Detailed divorce, guardianship, inheritance and priest-office eligibility remain unresolved.

mesopotamian_traditional now describes bounded Harranian local worship. The 476 mixed community and its population shares remain unchanged; 493 receives no new population allocation. Explicit local vocabulary replaces Monk/Nun, and explicit doctrine removes inherited sacred-war, raiding and three-wife defaults. One-spouse capacity, direct separation and no enforced celibacy are operational simulation choices, not attested Harranian priestly or household law. No named temple dedication, active building, priest or head is inferred from the faith label.

iranian_traditional_476 and sogdian_traditional_476 remain provisional research holds at all their existing early consumers. Their assignments are not accepted replacements or evidence of uniform regional practice. A migration requires a dated decision for each court and community, including mixed Buddhist populations. No later continuity is inferred from these labels. Manichaean regional testimony does not yet establish a specific new playable opening community or active house; there is no new Manichaean profile or head. No Mazdakite conversion follows from Kawad's court affiliation.

iranian_local_faith_contexts has technology impact none. Court affiliation, local worship and the distinction between learning and fire custody depend on social context, not discovery. This change creates no institutional office, admission path, property transfer or funding capability. tests/e2e/specs/iranian-traditions.spec.js covers inherited doctrine, dated consumer restrictions, mixed populations, independent court relatives, save restoration and pure catalogue reads.

Historical basis and limits

Nikolaus Schindel, Sasanian Coinage (2005), royal mint control and Basic typology: fire-altar imagery continues from Peroz through Kawad, with attendants performing acts of worship. This supports a public court context as a reconstruction; it does not measure household affiliation or settle Kawad's reform allegiance in 493. https://www.iranicaonline.org/articles/sasanian-coinage/

Maria Macuch, Judicial and Legal Systems iii. Sasanian Legal System (2009), SOURCES and family/property discussion: the principal legal compilation dates to the seventh century and preserves older cases. The fresh legal reference is therefore a bounded reconstruction, not a translated fifth-century household code. https://www.iranicaonline.org/articles/judicial-and-legal-systems-iii-sasanian-legal-system/

Philip G. Kreyenbroek, Herbed (2003), Sasanian title and teaching discussion: the title encompasses priestly learning and teaching, with scholarship distinct from ritual performance. The profile uses a teaching label without inventing a dated incumbent or a universal promotion ladder. https://www.iranicaonline.org/articles/herbed/

Firoze M. P. Kotwal, Herbedestan (2003), chapters 1-6: study obligations include property and household responsibilities; female students and fire keepers appear in the normative discussion. These roles do not establish eligibility for every priestly office. https://www.iranicaonline.org/articles/herbedestan/

Prods Oktor Skjaervo, Marriage, Next-of-Kin (2013), Pahlavi Rivayat chapter 8 and Denkard 3.80 discussion: close-kin marriage is praised in normative texts, while the extent of actual practice is uncertain. The optional rite does not justify automatic household generation. https://www.iranicaonline.org/articles/marriage-next-of-kin/

Ammianus Marcellinus, Res Gestae XXIII.3.2, reports lunar worship at Carrhae in 363. Procopius, Wars II.13.7, reports non-Christian worship there during the 540 campaign. These attestations bracket the early openings; local continuity is a reconstruction and the game's shares are simulation choices. https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Ammian/23*.html and https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Procopius/Wars/2C*.html
