# Religions and faith fracture

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
- `rankTitles.m` / `rankTitles.f`;
- `words.deity`, `words.cleric`, `words.temple`, `words.landed`, and the
  faith-flavored `words.partnership` label;
- `roles` for monastic, priestly, episcopal, cardinal, abbatial, and qadi titles,
  plus `clergyMarriage`;
- `religiousPaths.lay` and `religiousPaths.professions` for the validated
  character-progression paths defined in `FBDATA.religiousPaths`;
- `systems` capability flags such as `papacy`;
- optional `head` metadata, including a stable office, holder-sex eligibility,
  recovery, and great holy wars.

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

County faith remains authored world data rather than mutable campaign state. Founding a
faith can convert characters and a player realm, but a future county-conversion system
must first add an explicit saved county-faith overlay instead of mutating `FBDATA`.

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

The save envelope remains strict version 3. New games initialize `faiths:{}`,
`faithRelations:{}`, and `faithNextId:1`. Restore supplies those defaults when absent,
then rebuilds the derived graph before repairing religious offices. Generated definitions
and relationship changes therefore round-trip, while every older version-3 save behaves
as a campaign with no generated faiths. Title snapshots retain the legacy `group`/`tier`
fields and add source faith, sex, and English fallback words, so both old snapshots and
new generated-faith snapshots remain renderable.
