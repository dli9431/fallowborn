# Religious and cultural doctrines

Doctrines are data-defined identity rules that have direct gameplay consumers. The
Faith and Culture detail sheets show every doctrine in their respective catalogs.
When the displayed identity belongs to the player, **Reform doctrines...** opens the
paid reform flow.

## Catalog contract

`FBDATA.doctrineCatalogs.faith` and `.culture` are maps keyed by stable doctrine id.
Each definition supplies `name`, `path`, `order`, and either an `options` map or an
`optionsFrom` source. `shownAboveDoctrine` avoids repeating values already presented in
the identity or naming section. Each option supplies `name`, `desc`, a JSON-safe
`value`, and a `cost` containing piety and/or prestige. The UI enumerates this data
directly. It does not contain doctrine-id or option-id presentation branches.

Faith paths resolve against effective inherited `properties`. Culture paths resolve
against the effective culture record. `FB.doctrineValue`, `FB.doctrineOption`, and
`FB.doctrineDivergence` are the shared read boundary.

The core faith catalog includes:

- marriage form and spouse capacity;
- accepted faith relationships for marriage;
- divorce route, cost, and cooldown;
- forbidden, sanctioned, or xwedodah close-kin union;
- clergy marriage.

The core culture catalog includes:

- regional tradition and cultural affinity;
- dynasty naming convention;
- raiding eligibility;
- ordinary or long-range seafaring;
- culture-specific professional unit tradition;
- learning and technology tradition.

Names, personal-name pools, portrait ancestry, religious vocabulary, rank titles,
religious offices, and great-holy-war schedules remain identity, presentation, or
institutional data. They are shown on the relevant surfaces where useful, but are not
doctrines and cannot be purchased through this flow.

## Reform transaction

`FB.doctrineReformStatus` is the pure preview and gate. `FB.applyDoctrineReform`
rechecks it before writing anything. Faith reforms cost piety; culture reforms cost
prestige. Core option costs live with their options. Global pacing lives in
`FBDATA.balance`:

- `doctrineReformCooldownDays` is 360 days per identity kind;
- `doctrineReformEscalation` raises the next cost by 25 percent for each existing
  departure from the parent;
- `faithDoctrineSchismThreshold` is three departures;
- `faithDoctrineHostileThreshold` is five departures;
- `cultureDoctrineDivergenceThreshold` is three departures.

The first change creates a campaign child identity and converts the player character.
It does not silently convert the household, realm, county, or settlement. Those scopes
continue to use the existing conversion and community-project systems. Further reforms
alter that saved child record instead of multiplying near-identical descendants.

One or two faith departures remain in the parent's fold. Three become schismatic and
five become hostile. Crossing into schism removes allegiance to the parent's central
religious office, which also disables office-dependent systems such as the Papacy.
Culture branches remain related through two departures and become foreign at three.
Changing regional tradition is itself a direct break in cultural affinity regardless
of the raw departure count.

## Campaign cultures and saves

Authored cultures remain in `FBDATA.cultures`. Campaign children live in
`state.cultures`, with deterministic ids supplied by `state.cultureNextId`. A child
stores its parent plus changed fields and inherits name pools, portrait ancestry,
settlement naming, and unaltered doctrine. `FB.cultureOf`, `FB.cultureValue`, and
`FB.cultureLineage` compile the effective record.

The fields are additive at save version 3. Restore initializes them for older saves and
rebuilds the derived culture graph. No compiled lineage or source map is serialized.
