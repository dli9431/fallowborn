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
An optional `defaultValue` supplies a neutral value for absent paths in legacy or
mod identities. Inheritance resolves before this fallback.

Faith paths resolve against effective inherited `properties`. Culture paths resolve
against the effective culture record. `FB.doctrineValue`, `FB.doctrineOption`, and
`FB.doctrineDivergence` are the shared read boundary.

The core faith catalog includes:

- marriage form and spouse capacity;
- accepted faith relationships for marriage;
- divorce route, cost, and cooldown;
- forbidden, sanctioned, or xwedodah close-kin union;
- clergy marriage;
- religious observance and organized alms.

The core culture catalog includes:

- regional tradition and cultural affinity;
- dynasty naming convention;
- raiding eligibility;
- ordinary or long-range seafaring;
- culture-specific professional unit tradition;
- learning and technology tradition;
- shared craft knowledge and communal nursing.

Names, personal-name pools, portrait ancestry, religious vocabulary, rank titles,
religious offices, and great-holy-war schedules remain identity, presentation, or
institutional data. They are shown on the relevant surfaces where useful, but are not
doctrines and cannot be purchased through this flow.

## Reform transaction

Reform Chronicle entries use the durable `news.doctrine.reformed` message descriptor
with the identity's proper name as a parameter. The sentence renders in the current
locale after loading, rather than saving translated prose.

`FB.doctrineReformStatus` is the pure preview and gate. `FB.applyDoctrineReform`
rechecks it before writing anything. Faith reforms cost piety; culture reforms cost
prestige. Core option costs live with their options. Global pacing lives in
`FBDATA.balance`:

- `doctrineReformCooldownDays` is a base 360 days per identity kind;
- `doctrineReformEscalation` raises option costs and subsequent recovery by 25 percent
  per previous reform by this ruler, with existing departures as a legacy minimum;
- `doctrineReformPopularPenalty` costs 5 Common Voice per projected departure or next
  reform number, whichever is greater. Restoring a parent doctrine causes no new
  backlash but still spends resources and counts as a reform;
- `faithDoctrineSchismThreshold` is three departures;
- `faithDoctrineHostileThreshold` is five departures;
- `cultureDoctrineDivergenceThreshold` is three departures.

The first change creates a campaign child identity and converts the player character.
It does not silently convert the household, realm, county, or settlement. The identity
sheet reports the exact following in the player's home settlement and links a landed
founder directly to a gradual local faith-conversion or cultural-assimilation project.
Other settlements and counties continue to use their explicit Land project controls.
Further reforms alter that saved child record instead of multiplying near-identical
descendants.

The reform overview and confirmation explicitly distinguish founding a branch (only
the player joins it) from changing an existing branch (all its current followers use
the changed doctrine). Local adoption feedback shows recruiting-land share, available
raiders, special-company availability and missing technology, cultural seafaring, and
the realm's current learning traditions, beside the home-settlement project action.

Identity sheets expose **Return to parent faith/culture** as an explicit personal
conversion with the ordinary cost, cooldown, and consequence preview. The reform UI
replaces an option that would erase the final departure with this conversion action;
it no longer presents a personal return as a branch-wide reform. The historical engine
transaction for final restoration remains supported for existing callers. This is a
presentation and routing change to existing ungated capabilities, with no new technology
eligibility or ledger entry.

Campaign cultural doctrine is not territorial merely because its founder rules land.
Raiding manpower and culture-specific companies scale with the share of people in the
founder's settlement or directly held counties who have adopted that exact campaign
culture. A new raiding branch therefore begins with no raiding host; each annual local
assimilation transfer grows the eligible host. Long-range seafaring becomes usable only
from an origin where the branch has followers, and a reformed learning tradition becomes
the realm's technology tradition only after that culture is locally dominant at the
baron's settlement or higher ruler's capital. Established authored cultures retain their
already-established territorial traditions.

The direct parent id remains on every generated definition, and doctrine-founded children
carry `doctrineBranch:true` so an unrelated event- or mod-founded identity is never collapsed
merely for sharing the parent's catalog values. Selecting the parent's value removes that
departure from the player by returning the player character to the remembered parent id.
It does not rewrite the saved branch: other characters, political identities,
county/settlement cohorts, and active community-project targets remain with that branch
and retain its doctrines. This makes an exact personal return to German, Catholicism, or
another parent recognizable as the original identity without erasing territorial adoption;
followers move back only through ordinary personal or community conversion.

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
rebuilds the derived culture graph. No compiled lineage, source map, or territorial
doctrine cache is serialized. `doctrine_reform` is recorded in the technology-impact
ledger as `none`: reform is personal and communal, while its territorial adoption already
uses the ungated settlement conversion process.


## Encountered sources and reform history

`FB.doctrineReformSources` enumerates assignable authored and campaign identities
that actually follow the proposed option and pass `FB.conversionTargetEncountered`.
This shares conversion's kin, community, geographic, diplomatic, travel,
remembered-contact, and shared-tradition discovery rules. Merely existing in the
catalog is insufficient. Current and remembered parent doctrines remain available,
including restoring a parent no longer present locally. Unencountered options are
hidden; both preview and transaction reject them, including stale confirmations.
Previously created branches and followers remain valid without new contacts.

The first departure costs 5 Common Voice and requires 360 days of recovery; a
second costs at least 10 and requires 450 days. `player.doctrineReforms[kind]`
saves `{charId,count,cooldownDays}`. Costs and recovery do not reset when the ruler
returns to the parent or converts to another identity. Faith and culture have
separate histories; a successor starts a new history. Existing branch divergence
remains the minimum escalation. These fields are additive at save version 3.

## Additional household doctrines

These are personal or household practices, not instant territorial bonuses:

- **Communal worship** adds 2 seasonal piety for the player. Christian identities
  supply the initial authored source; other identities have a neutral default.
- **Organized alms** spends 1 gold for 1 Common Voice each season only if funds
  suffice after household wages. It appears in the livelihood expense ledger and
  uses the ordinary popular-opinion effect, including trait modifiers. Islamic
  identities supply the initial source. Personal alms has no automatic expense.
- **Shared craft knowledge** raises positive seasonal wages of adult household
  workers following that culture by 10%. It does not modify enterprise revenue,
  apprenticeship costs, or the player's own focus income. Frankish and Italian
  cultures supply initial sources; converting only the founder leaves other
  household workers' wages unchanged.
- **Communal nursing** adds 0.001 annual household mortality protection when at
  least one adult household follower is resident at home. Followers do not stack;
  the bonus adds to the strongest professional medical provider. A traveling
  player cannot supply it from afar. Gaelic culture supplies the initial source.

Each capability has its own `mode:'none'` technology review:
`doctrine_communal_worship`, `doctrine_organized_alms`, `doctrine_craft_mentorship`,
and `doctrine_mutual_care`. Worship, affordable almsgiving, sharing craft experience,
and informal nursing need no researched innovation. These modest baseline benefits
do not unlock advanced production or replace medical technology and qualifications.

Doctrine option buttons label spending as **Cost: 300 prestige**. Desktop tooltips and compact
disclosures separate effects, resource costs, backlash/recovery, parent relationship,
and known sources. Learning tooltips compare at most one earlier and one later
widespread-adoption dates against the current cultural learning tradition, explain
the research-cost consequence, and state local-dominance and sovereign constraints.
These are cultural timing comparisons, not a promise of immediate realm research
savings; faith traditions may already supply earlier dates. Confirmations reuse the
same effect explanation, with up to two examples in each direction and fuller
conditions. Tooltips keep the effect first, group cost and recovery together, and
use muted supporting context. Known sources are limited to two names plus a count.
Both desktop hover/focus and compact disclosures share this concise copy.

## Marriage lineage and learned customs

`marriage_lineage` resolves `doctrines.matrilinealMarriage`, default false. Paternal-only
reform costs 175 prestige and maternal-permitted reform costs 300, under the existing
escalation, Common Voice, and recovery rules. Maternal permission requires actual contact
with practitioners, or durably learned knowledge of the custom. Neither shared African
affinity, a neighboring county alone, opening a sheet, a generated culture's existence,
nor a parent identity alone supplies this knowledge. Current practitioners qualify.

Nubian culture permits maternal terms in Dongola and Soba. This is a gameplay abstraction
of maternal-descent traditions discussed in Christopher Ehret's
[Matrilineal Descent and the Gendering of Authority](https://www.quest-journal.net/shikanda/Rethinking_history_conference/Ehret%20conference%20paper.pdf),
not a universal Nubian marriage rule or a change to title succession. Axum, Lalibela, and
Abyssinian rulers use separate paternal-only Abyssinian culture in both bookmarks, retaining
African affinity, appearance, and Northeast African learning. Recorded identities in old
campaigns are not migrated. Reforming only the head leaves relatives' identities intact;
use household adoption to prepare consenting managed partners. The capability's technology
review is `matrilineal_marriage`, mode none (cultural custom).
