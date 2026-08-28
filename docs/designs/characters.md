# Characters: skills & growing up

At character creation, the selected county community supplies one coupled culture and
faith identity to the protagonist and the whole generated starting family: parents,
patronymic grandparents, siblings, and any preset spouse and children. Names and the
founding dynasty follow that culture. The county's ordered static community model and
principal fallback are defined in [provinces.md](provinces.md); later family identity
continues to live on ordinary character records, with no additional save field.

Children always keep their ordinary recorded father and mother. After a
biological birth, `FB.applyCloseKinBirthRisk` classifies those parents through
the marriage kinship snapshot. Full siblings give the child a 20% risk roll;
half siblings give 10%, and close-kin parentage on either parent adds five
percentage points to a 35% ceiling. A hit uses seeded game RNG to add Frail,
add Sickly, or reduce starting health by one. The neutral
`closeKinParentage` record persists even when the roll misses so later
generations can calculate ancestry without inferring it from current family
views.

**Royal courts are eager for the living and compact for the dead.** Every reigning
realm's ruler, adult consort, and displayed heirs exist as full
`state.chars` records from world creation, so opening a realm shows a face and a
complete card instead of a stub line. A child ruler's same-age future-consort
reservation remains compact, unmaterialized, and unlinked until majority; the elective
Papacy has no dynastic household. If `COURT_EAGERNESS` is retuned from the default
`'court'` to `'ruler'`, opening the realm sheet materializes that same bounded consort
and heir set on demand through `FB.ensureRealmCourtForDisplay`; the lower startup policy
therefore changes timing rather than visible behavior. A court record is a *complete* record -
`sex`, `culture`, `religion`, `born`,
`station`, `health`, `traits`, `skills`, and a resolvable loadout - because a record
missing a field one of those readers consults produces a card or a face that disagrees
with the sheet printed beside it. `FB.makeCharacter` fills all of it; the court paths do
not bypass it.

Portrait invalidation is narrower than the character record. One normalized descriptor
resolves the exact visual outputs: identity DNA, age, sex, culture palette, faith group,
station, profession, three health classes, visible expression traits, permanent marks,
marked ailments, and frame-visible equipment. `FB.characterVisualKey` returns that
descriptor's key. Unrelated traits and exact health changes inside one visual class do
not evict a face; adding or curing a visible wound or sickness does. Bust keys include
only Head and Body — nothing hangs at the neck in the bust crop, so Neck items neither
paint nor invalidate compact faces — while figure keys include every displayed slot and
frozen snapshot identity.

Eagerness is also a throne invariant, not just a display choice. Accession materializes
the exact successor on the court's scoped stream before reading their ruler fields, and
the ensure pass advances a dead ruler root immediately. A retained corpse and a
previously compacted corpse therefore produce the same living successor on load or
realm revival; neither is reanimated and neither waits for the next mortality roll.

The living court population is bound by the map - roughly six people per realm,
regardless of how long a campaign has run. Everything past that number would be dead
accumulation, and the succession member already holds what the game needs about the
dead: a name, dates, and parent/child links. So when a court character dies,
`FB.courtRecordRetained` asks whether the player can still navigate to them - a kin tie,
a marriage or betrothal, held items, a household or retainer place, a role, a papal
office, an attention assignment, a journey under way to visit them, or a friend or
rival contact clock. If not, the record is deleted and the member entry becomes the
tombstone.

**Cultivation opinion alone deliberately does not count**, and the distinction is
narrow: the *standing* a person earned lives in the realm-keyed store
`FB.syncRealmRulerStanding` mirrors and survives compaction without them, but an
*active* assignment on that exact person is a live reference the UI resolves back
through `state.chars` and does retain the record. The score is not a reason to keep a
sheet; a screen currently pointing at one is.

Two rules keep that safe. The member is marked dead **before** the record is removed, so
`FB.refreshRealmSuccession` can never mistake a compacted member for a living one whose
character merely went missing. And retention is read **before** `FB.killChar`, which
severs the very links the predicate consults - a spouse asked about afterwards reads as
a stranger. Compaction is forward-only: it lives in the death path and never runs
retroactively over a loaded save, where dead materialized royals the player once met are
already present.

The accepted tradeoff: a never-inheriting royal child who died untouched has a name and
dates in the family tree, but no posthumous character sheet. Records are spent on what
the player can see and touch. See [realms.md](realms.md) for the court's structure and
the consort.

The current protagonist may replace the deterministic hairstyle and, once an adult man,
facial-hair family and family-specific style through **Visit Barber…** on the Equipment sheet.
The families are clean-shaven, stubble, moustache, beard, beard with moustache, goatee,
and sideburns; each exposes only styles that paint distinctly for that family. Moustaches
include natural, pencil, chevron, handlebar, walrus, and horseshoe designs. The
beard cuts use deliberately different coverage and terminal silhouettes (round, square,
spade, fork, or narrow goatee) so they remain legible at retained-portrait size. The
chinstrap is clipped to the head and follows the lower-cheek and jaw contour rather than
hanging outside the face. The
optional character record is `appearance: {hairStyle, beardKind?, beardCut?}`; it changes
style only, so identity, natural color, and age-related greying remain derived. Ordinary
cuts are elective for either sex, while baldness, recession, and tonsure remain generated
contextual results rather than picker choices. A minor's chosen hair persists after
majority, but facial hair remains generated until an adult man explicitly chooses it.
The semantic family/style picker resolves to one canonical `beardKind`/`beardCut` pair,
so it never offers Cartesian combinations that collapse to another visible choice. Invalid
or obsolete override values fall back to the corresponding deterministic result without
mutating the record. Preview descriptors may supply a temporary `appearance` and
suppress equipment or headwear; resolved style and suppression flags participate in the
visual key, so cached faces cannot cross appearance boundaries.

**A portrait is derived state and is never persisted.** The Court Illustration v2
renderer constructs a direct analytic scaffold of named face/body anchors and paints it
with raw Canvas 2D; it has no mesh vertices, faces, contour cache, external art, or game
RNG calls. Identity variations use separately salted hashes, so adding a wardrobe detail
does not reshuffle wounds or facial DNA. Unknown mod cultures resolve through
`FB.cultureOf` to a deterministic nearby palette.

Compact opaque busts share one state-local 8×8 atlas of 96×108 cells. Its 64 entries use
LRU replacement and fixed 2,654,208-byte raw pixel storage. Persistent target canvases
carry a key-and-backing-size expando stamp, so an unchanged retained face does not even
acquire a context. `FB.paintFaces` paints one cold key synchronously, groups later
targets by key, and advances the bounded 128-key queue in animation frames with a
six-millisecond budget and at least one key per frame. State replacement or
portrait-affecting mod changes clear the atlas metadata, queue, and one-entry figure MRU.
`FB.paintPortrait` remains synchronous for direct callers. Court UI uses `FB.faceTag`
plus `FB.paintFaces`, and no view paints an unbounded list of court faces—the realm
sheet's court strip inherits the same six-member cap as `FB.realmFamily`.

**Bishops, Cardinals, and Popes are personal Catholic offices.** Both Catholic vocation
paths qualify for an appointed Bishopric, after which a qualified Bishop may petition
for appointment to the College. Cardinal sets station 4 and a 3.5 seasonal piety yield without granting a
county or secular tier. Bishops, Cardinals, and Popes cannot court or marry, but their existing
children and ordinary family links remain valid. Living Cardinals stay full characters
for travel, gifts, friendship, rivalry, and mortality; unrelated dead Cardinals compact
into the Papal archive while genealogy-critical family members remain as minimal dead
characters. See [papacy.md](papacy.md).

## Contextual serf livelihood

All tier-0 serf households retain profession `farmer`, focus `toil`, handler `toil`, and
shortcut family `farmer-work`. An active saved tenure changes only the displayed work
label and description: strips and demesne, fields and waterworks, household service,
pastoral herds, woodland and clearings, shore/boat transport, or neutral dependent
farming. `FB.focusLabel` and `FB.focusDescription` are the one read-only presentation
boundary. Tier 1+ farmers, non-Toil focuses, and missing, closed, or unknown tenure retain
generic focus text. No regional archetype changes wage, gain, health risk, skill growth,
eligibility, elapsed time, or RNG order. This capability has technology impact **none**
because it describes an existing household's baseline livelihood rather than a researched
option.

## Skills

**Skills grow on an uncapped diminishing-return curve.** Every skill gain (focus
training, event `skills` effects, education, coming of age) goes through
`FB.gainSkill` (model.js). Below `balance.skillSoftCap` (20) each point lands;
from 20 onward each must beat a `(softCap/current)^2` roll. At and beyond
`balance.skillMasteryThreshold` (40), that chance is further multiplied by
`(masteryThreshold/current)^skillMasteryPower` (power 8 by default). The resulting
per-attempt chances include 40→41 at 25%, 41→42 at 19.5%, 45→46 at 7.7%,
50→51 at 2.7%, and 60→61 at 0.43%. The roll uses only the raw trained skill,
so traits and equipped items do not make training harder. `FB.skillOf` has no
upper ceiling: every raw, trait, and equipped-item point retains its full effect.
Existing saves need no migration; stored values already remain valid, and bonuses
previously hidden by the old 40-point read ceiling become effective immediately.
Never write `c.skills[k]++` directly outside `FB.gainSkill`. Daily focus training
applies `balance.focusSkillGainRate` (0.75) to its authored seasonal chance before
this diminishing-return roll; event, education, and coming-of-age gains are
unaffected. Declarative mod focuses use that same rate and `FB.gainSkill` path. Their
daily rolls always consume the saved RNG stream in `dip`, `mar`, `ste`, `int`, `lea`
order, so authored object-key order cannot alter determinism.

The in-game Guide gives every skill a short conceptual purpose and names its major
current consumers without claiming to enumerate event scripts. Character skill labels
and full character sheets link to those entries. Learning explicitly covers national
research, education and tutoring, religious advancement, Papal systems, and
knowledge-oriented checks; these descriptions remain conceptual when the current
character cannot access one of those systems.

**Equipment bonuses belong to the wearer.** `FB.skillOf` adds skill effects from that
character's household loadout, not from every object the dynasty owns. Equipped health
protection likewise lowers that wearer's yearly mortality, including spouses and resident
children and grandchildren. Battle odds and seasonal gold/prestige/piety remain
head-of-household effects and count only the current protagonist's outfit. AI rulers,
strangers, independent siblings, and married-away descendants do not simulate
equipment; manageable resident unwed siblings share the family armory like household
members (see the manageable-kin rule below). See
[items.md](items.md).

**Children are players too.** When a minor heir succeeds (age < 16), the daily picker
fires only events tagged `childhood:true` (the childhood section of events_common.js plus
age-neutral events like sickness and plague) until they come of age.
Their Daily Focus catalogue contains only Study and Play. Role-appropriate adult deeds
remain visible in their ordinary groups but are disabled with an exact age-16 explanation,
so succession does not make the family's established options disappear. Existing
age-neutral management and resolution deeds retain their authored availability.

**Starting families are authored presets, not an editor.** The character screen offers
`FBDATA.familyPresets` (`data/starts.js`): `standard` (sixteen, unmarried, parents and
siblings — the historical start), `established` (thirty, spouse and young children),
and `elder` (forty-eight, spouse and grown children). Ages and family shapes are
fixed fields on each preset; the player picks a preset, never an age or a headcount.
Every preset keeps the protagonist an adult — the childhood regime above is a
succession mode, not a start — and every preset leaves a plausible heir behind
(`elder` guarantees an adult one). A preset's spouse and children are generated on
the shared seeded stream in a fixed order after the kin every start shares, so the
choice is deterministic under the start code, which carries it as an optional
seventh part (see [seeds.md](seeds.md)); the parents' usual 20–40/20–34 year
seniority still applies, so an elder start can have quite elderly living parents.
Each preset discloses its difficulty right on its card.

Mods may add another adult unmarried shape or an age/spouse/child-range shape, but the
constructor still creates every person and link. Presets cannot inject character objects.
The `standard` id remains the historical age-from-balance, unmarried, no-extra-draw start.

**Unmarried grandchildren share the managed household.** `FB.playerDescendantKind`
is the common relationship test for a current protagonist's children and grandchildren.
Every living unmarried grandchild derives resident status from family links, needs no save
migration, and receives the same age-gated education, work, equipment, health, upkeep, and
marriage management as a child. Marriage ends that residence even when the grandchild's
parents remain elsewhere.

**Focus and instruction are separate choices.** A child aged 6–15 chooses the skill being
studied, then learns at home, from a named household/neighbour tutor, at a religious charity
school, at a town merchant's school, at the Noble Academy, or from a personal learned master.
Named tutors use their actual focused skill. The lord fosters only gentle children — the
instruction picker offers him only at `FB.playerStation(state) >= 2` (gentry and up); a
serf's child is never sent to his hall. Merchant schools require local development 2 and do
not teach martial. The Noble Academy instead requires household tier 2 (gentry) and the
effective sovereign's Scholarly Networks technology, has no development gate, and teaches
all five education focuses. Personal masters remain generated characters, so their focused
skill can exceed the academy's fixed chance; they can also pass on traits or die.
Named tutor choices use the shared person-assignment card to show the projected learning,
fee, occupation, Standing, existing students, and which current instruction will be replaced.

**Household education policy fills empty choices, never revises them.** Household Plan
stores an optional default focus plus an independent “best instruction” mode and
non-negative seasonal fee cap. When enabled, it applies immediately after saving
and before every seasonal school settlement. That catches current empty slots and
descendants who first become eligible at age six. Existing focuses and arrangements from
older saves are treated as manual choices; later manual choices, including No directed
study and explicit home instruction, are overrides. A policy edit affects only future
empty slots. The per-child Follow household policy actions clear and reconsider only the
chosen dimension, preserving the other dimension, `lessonBoost`, and `schoolTerms`.
Placing a student in the `educationCharacter` protection scope omits that person from policy
details and applications, including seasonal refill, while leaving every manual focus and
instruction control available. Choosing **Follow household policy** is an explicit opt-in:
it removes that whole-person protection and reapplies only the selected dimension.

Instruction selection is deterministic and uses the same discovery rules as the manual
picker: eligible schools in data order, already-known eligible tutors in relationship
order, then home instruction. It maximizes the final projected yearly chance, then prefers
the lower seasonal fee and finally the existing option order. The fee cap is tested
separately for each child only when selecting an arrangement; it neither reserves coin
nor cancels schooling whose later live fee exceeds the cap. Generated personal masters
remain a deliberate manual hire and never enter the automatic pool. If no focus exists,
instruction waits and reports that once. A lost manual tutor leaves a manual empty choice;
a lost policy-selected tutor may be replaced from the currently eligible deterministic
pool at the next policy pass.

**Paid schooling is seasonal.** Charity schools, merchant schools, the Noble Academy, and
personal masters charge the exact training-cost-modified `FBDATA.schooling` fee at every
90-day boundary. An unaffordable fee pauses that term without cancelling the arrangement;
the household retries next season. Each completed term saves one quarter of the difference
between home instruction and the arrangement's full-year chance in `c.edu.lessonBoost`.
Institutional terms also increment the matching id in `c.edu.schoolTerms`. Missed fees add
no term, and changing schools preserves every earlier entry. The New Year pass consumes and
clears both ledgers, so changing teachers just before winter cannot buy a full year's result
or erase a dangerous term already attended. Old saves with a generated hired tutor lazily
identify it as the recurring personal-master arrangement.

**Academy opportunity has a cost beyond coin.** Each completed Noble Academy term adds
0.5% extra mortality at the next New Year, up to 2% after four terms. This roll happens
before directed learning and coming-of-age rewards. A dependent student's death uses the
ordinary character cleanup; a minor protagonist's death ends yearly processing and records
an academy-specific legend. Surviving academy terms give the household at most one annual
academy decision, with probability `min(1, total terms / 4)` and the named student selected
in proportion to their terms. The immediately previous academy story is excluded. Patron
introductions create or warm a life-local noble Network contact for the current protagonist,
not a permanent relationship owned by the student.

**Childhood pacing.** A child's total skill income (Study focus, education tick,
childhood events) is tuned to land only modestly above an adult's (~5/yr vs ~3–4/yr):
Study starts from a 0.5 seasonal chance before the shared 0.75 focus-training
multiplier — below the best adult focus's 0.7 base chance — and childhood lesson
events carry 6–8-season cooldowns so the same lesson can't recur constantly.
Home instruction has an 18% yearly directed-learning chance, charity school 35%, merchant
school 60%, Noble Academy 75%, and a named tutor or personal master `30% + 4%` per point of
focused tutor skill, capped at 90%. National technology and the family Letters holding add
their existing education bonuses. Keep new childhood content inside that envelope.

**Arms training is male; command is not.** No formal arms training for girls in the
867+ world: the martial *training* foci (`militia`, `drill`, `stand_guard`,
`train_arms`) are hidden from female characters, girls' Play trains diplomacy instead
of martial, and the Man-at-Arms chargen scenario is male-only (`sex:'m'` — the sex
radio is pinned on the chargen screen and conflicting start codes are rejected). The
historical nuance kept: noblewomen commanded castle *defense* as chatelaines —
organizers and commanders, not drilled soldiers — so female rulers keep the war
leadership deeds (`lead_host`, `muster_host`, `hire_mercs`, `declare_war`), and the
replacement foci train what girls were actually schooled in: `keep_house`
(household management, stewardship/diplomacy) and `courtly_graces` (hawking, letters,
patronage — Standing with the liege and prestige). Old saves self-heal: `FB.validateFocus` drops
a now-hidden martial focus and `FB.defaultFocus` re-maps it. The one road left for a woman who
means to actually *fight* is the *Sweet Polly Oliver* event chain (events_peasant.js) — cutting
her hair and following the war levy in disguise, which trains martial across about a year; see
[events.md](events.md).

**Traits describe four different layers of a life.** Every core entry in
`FBDATA.traits` declares `class:'disposition'|'formation'|'reputation'|'condition'`.
Disposition is persistent character (including the opposing personality pairs);
formation is education, service, or learned practice; reputation is what courts and
communities believe; condition is a lasting physical circumstance. Inheritance remains
orthogonal and uses the existing `inherit` probability. Event-earned entries declare
`noRandom:true` and `inherit:0`; mods without `class` remain generation-compatible and
display under Other. There is no trait cap.

Root skill, health, fertility, and general-Standing fields retain their existing
`FB.traitAgg` behavior. System-specific numeric effects live under named groups and are
read with `FB.traitBonus(character, group, key)`. The first consumers are assembly
votes/Common Voice, travel leg time/road incidents, direct levy, direct rent, and
family Standing. `player.traitProgress` holds current-protagonist acquisition counters,
is repaired additively in old version-3 saves, and clears on succession. Definitions
with `earn:{threshold:n}` are awarded by `FB.noteTraitProgress`; the resulting Chronicle
notice stores a locale-neutral trait data reference. Event-driven removal resets the
counter only when the earned trait was actually present, so a pre-award failure cannot
erase earlier progress.

The first progress traits are Moot-Speaker (three won estates votes), Roadwise (three
distinct completed non-targeted journeys), Muster-Bred (six war-service points),
Rent-Shrewd (three profitable Rent Days or extraordinary tax collections), and
Hearth-Steady (three supportive marriage/child outcomes). Hearth-Steady adds 25% to
positive event Standing only when the target is a spouse or blood relative. It adds to
the existing root trait-Standing multiplier before the one final rounding; losses and
unrelated characters do not use it.

**Wounds & sickness have names.** Beneath the 0–10 health number, the player carries
`c.ails` — a short list (≤3) of ailment ids into `FBDATA.ailments` (data/traits.js).
Hard blows (`fx.health` ≤ −2) add a random wound, severity 2 at −4 or worse;
`setFlag:'ill'` adds a random sickness; an explicit `fx.ailment` names one precisely.
Ailments are flavor, portrait marks, and a chip list on the character sheet — the
mechanics stay with health and the `ill` flag exactly as before (low health and
illness still drive mortality in `yearlyLife`). Wounds heal one per year once health
is back at 7+ and the character is not ill; sicknesses clear only with
`clearFlag:'ill'` (the recovery event). Portraits read `c.ails`/`c.health` directly
(`opts.ill` covers pre-ailment saves), so marks come and go with the condition;
`scarred` and `one_eyed` trait marks are drawn for every character, NPCs included.
Ailments remain the transient physical layer and are neither traits nor condition-class
entries. A wound may leave a permanent condition such as Scarred, One-Eyed, or Maimed,
but ailment caps, healing, sickness flags, and mortality behavior are unchanged.

**A rich table protects the young.** Each station above serf trims the yearly
mortality of the household's resident children and grandchildren (and of a child
protagonist) by `balance.richChildMortalityBonus` (7%), and each station gives a
`balance.richChildHealthChance` (10%) yearly chance that a resident descendant
under 16 gains a point of health, up to 8 — so the young descendants of rulers
and rich merchants die a little less often and grow a little hardier than a serf's.
Paid care in the `child_fever` event follows the schooling ladder: the wise
woman (3 gold, 60%), a physician (10, 75%), a renowned physician (30, 90%),
beside free prayer (55%).

**Standing earns its keep.** Every eligible counterpart has one player-facing Standing
toward the current protagonist (−100…100). Ordinary characters retain the compatibility
field `character.opinion`; new code reads and writes it through
`FB.standingOf(state, {kind:'character',id})` and `FB.adjustStanding`. It gates deeds and
events (courtship, petitions, `roleOpinionAbove/Below` compatibility triggers), and
its starting point includes the counterpart's directional faith baseline
(`same` +15, in-fold +10, schismatic +5, foreign −10, hostile −25). The saved
`faithStandingBase` marker lets a changed faith relation rebase that prior without
discarding Standing earned from personal history. Three multipliers make it felt
everywhere: the dead `traitAgg(me).opinion` aggregate now
scales positive opinion effects in `FB.applyEffects` (likeable traits warm folk faster),
and the `scheme_rival` deed and the `plot` named chance (for plots with a personal victim)
add the target's `opinion/500` to success — a trusting victim is easier to undo.

**Recurring local event characters are ordinary people, not a village roster.**
Serf manor stories bind exact living character ids for the current lord, steward,
priest, witness, neighbor, friend, or rival and continue to use typed Standing,
cultivation, friendship, and rivalry for every personal consequence. Fresh serf
starts materialize the bounded local lord and steward before customary
tenure snapshots its authority, so Rank & Realm can name and link the relevant
people from the first playable frame. Deterministic
selection reuses an eligible local friend, rival, cultivated contact, or witness
before materializing the one bounded `state.roles.notable` fallback. That notable is
an adult local peer (station 0 for a serf household and never above station 1 later),
persists under the ordinary residence and death rules, and appears in Network as a
Neighbor only after being created. A neighbor selector excludes kin and authority
roles; a witness selector may additionally reuse an eligible resident manageable
relative. Events never generate a friend or rival, and changing an office does not
silently substitute a new holder for an already bound participant.

**Ranked access is a chain of introductions, not a hard prohibition.** A household can
normally approach its own station or one station above it. A cultivated contact at Warm
Standing (the shared +40 relationship threshold) opens the next exact station, so a serf
normally reaches a station-3 lord through a station-1 priest or freeholder and then a
station-2 lord's steward or gentle notable. The home cast therefore includes a local
`steward` at station 2 between priest and lord. Each station beyond ordinary reach halves
positive cultivation and gift effects and doubles cash-gift and bought-access costs by
default (`rankAccessInfluenceMult`, `rankAccessCashCostMult`). A spouse, kinsperson,
household member, named friend or rival, warm direct contact, and royal compact is already
a personal relationship and needs no intermediary chain.

This models the institutional routes visible in surviving records rather than pretending
that medieval ranks never spoke. English manorial courts were presided over by a lord's
steward, with the bailiff summoning tenants and reporting business ([University of
Nottingham](https://www.nottingham.ac.uk/manuscriptsandspecialcollections/learning/laxton/theme2/manorialcourt.aspx));
petitioners seeking royal mercy commonly depended on patrons or intercessors with court
influence ([Cambridge, *Royal Pardon*](https://www.cambridge.org/core/books/royal-pardon-access-to-mercy-in-fourteenthcentury-england/intercessor/BEB12EB4D22B91BE9B10E9614294EFB3)).
Formal offices, event audiences, clergy advocacy, guild petitions, homage, and recorded
service already embody such an institutional route, so their authored Standing effects
do not pass through the manual-interaction penalty a second time. An existing attention
assignment remains a valid introduction for old saves. Personal wartime participation or
the local lord's explicit favor grants an extraordinary audience with that local lord,
though the class-distance influence penalty remains.

`player.socialAttention` is not another relationship meter: it names the one character
whose existing Standing gains `balance.socialAttentionDailyOpinion` (+0.2 by default),
scaled by ranked access, each ordinary player day. Assignment and withdrawal cost no day,
and Diplomacy does not change that rate. `FB.characterResidence(state, character)` is the
authoritative
county for social presence: managed household members and retainers live at the
household home, foreign notables in their saved roster county, royal children and
materialized reigning rulers at their realm’s current capital, and explicitly relocated
contacts at their recorded home. A reigning ruler’s capital residence takes precedence
over marriage to the player. `FB.socialAttentionPresence` reports `active`, `remote`, or
`on-road`.
Attention advances only when active, pauses on outbound/return roads or in another
county, and continues alongside work, study, war, destination residence, and deeds
that consume a day. Observe mode never advances it.

**Explicit gifts are recipient-bound.** Every living non-player character sheet offers one
gift picker once ranked access exists. Cash begins at 5 gold for
`balance.socialCashGiftOpinion` Standing (+4 by default); an unequipped, unpledged armory
object begins at the quality-tier value from `balance.socialItemGiftOpinion` (+4/+8/+12).
Ranked access raises the cash requirement and reduces both cash and item Standing effects
at the same per-station rates described above. Cash and items share the character-id clock
in
`player.socialGiftTurns`, so the same person may receive only one explicit gift every
`balance.socialGiftCooldownDays` (90 by default), and every accepted gift spends one day.
Spouses, dependent children, retainers, and other managed household members may receive
cash, but not an armory object: their equipment remains family property managed through the
shared loadouts. A materialized reigning ruler is never an ordinary recipient: both their
realm and full-character sheets use ruler rank pricing, ruler-generation cooldowns, and
Standing rules. These are ordinary-character gifts; realm rulers use the realm gift
rules in [realms.md](realms.md), but both sheets resolve the same score.

Character gifts remain immediate when the recipient’s residence belongs to the same
sovereign realm as the player’s permanent home. Otherwise the paid cash or exact armory
object enters `player.giftDeliveries` and travels home-to-residence. Standing and the
recipient cooldown begin only on arrival. Death, succession to a crown, or a change of
residence makes the courier complete the outbound road and return the gift to the
household’s then-current permanent home without starting a cooldown.

**Rivalries grow out of contact.** The rival seat remains `state.roles.rival`, so old saves,
events, and mods keep one canonical personal enemy. The player may deliberately name any
non-family character at Standing ≤ −40. An NPC may claim the seat only if that exact,
already-existing character has a life-local entry in `player.rivalContacts`, written by an
explicit hostile interaction (`FB.noteRivalContact` / event effect `rivalContact`), and is
also at Standing ≤ `balance.rivalOpinionThreshold`. Merely losing Standing is not enough, and
`{rival}` text or an `opinion` effect can never lazily invent a rival. Contacts expire after
`balance.rivalContactMaxAge`; wrathful, proud, cruel, and ambitious characters are readier
to declare, while patient, humble, kind, and content characters are slower.

An active feud has life-local `player.rivalry` metadata with heat 0–100. Heat, not Standing,
gates escalation: Standing measures willingness to make peace, while heat measures whether
the quarrel is cooling, simmering, open, or a blood feud. Hostile deeds and event choices
raise it; restraint and common cause lower it; a long quiet reduces it toward 5. The
character sheet offers mediated settlement instead of unilateral deletion. `FB.endRivalry`
clears the seat, rival plot, and rival-specific downfall flags, then protects the peace for
`balance.rivalPeaceDays`. On succession contacts reset and an active enemy produces the
queued `rival_legacy` choice: bury the dead ruler's quarrel, seek peace, or inherit it.
Old saves with a rival lazily receive `balance.rivalHeatOldSave`.

Related: [marriage.md](marriage.md) for spouses and child matches,
[events.md](events.md) for the event picker.

**A character's house and personal byname are separate.** `c.dyn` is the stable
house identity used by descendants and political systems; optional `c.byname` is
the character-specific surname rendered by `FB.fullName`. Patronymic cultures
derive that byname from the recorded father, using the culture's son or daughter
form. New patronymic starts therefore generate and link the paternal generations
needed to name the protagonist, father, and siblings consistently instead of
copying one founder label onto every generation. Restore deterministically fills
missing bynames only where a recorded father makes the relationship unambiguous;
non-patronymic house naming is unchanged.

**The player can rename the house.** The Self tab's Dynasty panel offers
*Rename house*, which runs `FB.renameHouse(state, name)`. A house has no record
of its own — membership is exactly the set of characters whose `c.dyn` equals
the string — so a rename rewrites `c.dyn` on every character carrying the old
string (the same rule `FB.dynastyNameSet` uses), and additionally rewrites
`state.realms.player.name` when it still equals the derived `'Realm of ' + dyn`
form and `state.realms.player.dynasty` when it matches. Validation
(`FB.validateHouseName`) trims, then requires 2–20 characters of letters,
spaces, hyphens, and apostrophes; digits, symbols, and emoji are rejected and
renaming to the current name is a no-op refusal. Personal names and bynames are
untouched — a patronym still shadows the dyn in `FB.fullName` while the renamed
house remains the identity underneath. Two consequences are accepted as
realistic: heraldry seeds from the dyn string, so a rename redraws the coat of
arms, and chronicle/legend entries already written keep the old name — history
is not rewritten. Generic NPC commoners still carry no family name at all
(`dyn: null`); closing that gap is left to the later genealogy feature that will
also design cadet branches and title-derived surnames, rather than bolting a
general NPC-naming pass onto this increment.

## Careers, training, and work

**Careers belong to characters.** Every managed household member lazily receives
`c.career = {profession,rank,experience,startedYear,guildRank,guildStanding,chosen}` through
`FB.careerOf` (`js/economy.js`). `player.profession` remains a compatibility mirror for
existing events, portraits, titles, and mods; succession mirrors the heir's own career
instead of inheriting the dead parent's occupation. That mirror now remains the head's
actual career at every station: acquiring a landed title does not silently replace a
merchant, craft, clerical, or military occupation with `noble`.

Learned careers may add `specialization`, `examLastTurn`, and `authoredWorkRef` to that
record. Changing professions archives the complete active record in
`c.careerHistory[profession]`. Returning to that calling restores its vocational
rank, experience, specialization, exam cooldown, authored work, guild rank, Guild
Standing, and original start year without a second entry fee. A restored adult
apprentice in an ordinary trade resumes as a journeyman so a childhood apprenticeship
cannot reappear as an adult-only dead end. A learned trainee remains a trainee until
they pass the license examination. Inactive
records do not progress or decay. Old saves begin with an empty history and
archive their first active calling when it is changed. Old master administrators are
normalized to Bailiffs, preserving their attained rank while making the new branch
explicit.

**Learned careers advance through examinations, not age.** Administration, Medicine,
and Scholarship begin as trainee callings. After two vocational years a still-illiterate
trainee gains Lettered; ordinary education and religious routes can supply it earlier.
The license examination requires Lettered, minimum age, vocational years, personal
skills, a fee, and the career's national prerequisite. Passing creates a Clerk,
Practitioner, or Scholar. After eight vocational years, each licensed practitioner may
attempt one of two permanent master specialties: Notary or Bailiff, Physician or
Apothecary, and Author or Astronomer. Each specialty has its own skill and technology
requirements. No sex or faith restriction is applied.

An examination spends one day whether it passes or fails. Its chance is 55%, plus 4%
per Learning point above the requirement and 2% per other required-skill point above
the requirement, capped at 90%. Failure sets a 360-day cooldown; fees use the national
training-cost modifier. Licenses grant 5 prestige and specialties grant 15. These values
live in `FBDATA.balance`, while the requirements and branches live in each career
definition.

The three paths have distinct bounded payoffs. Keep records earns
`2 + Stewardship/4 + Learning/8` gold per season; Notaries add 1 gold and Bailiffs add
2 Standing with the relevant lord. Practice physic earns `1 + Learning/3` gold;
Apothecaries add 2 gold. Scholarly work earns `.5 + Learning/10` gold and
`1 + min(2, Learning/10)` national research; Authors add 2 gold and 1 prestige while
Astronomers add 1 research. A newly qualified Author also creates one repeatable
quality-rolled family treatise and retains its exact item reference in career state.
Resident active medical practitioners reduce yearly household mortality by 0.2%,
Physicians by 0.6%, and Apothecaries by 0.3%; only the single best locally present
provider applies.

**Craft and Trade guild paths are deliberate permanent specialties.** A working
Craft guildmaster may become a Smith, Weaver, or Cooper; a Trade guildmaster may
become a Broker, Caravan Factor, or Maritime Factor. Each path requires its configured
guild rank, Guild Standing, skills, inherited career technology, and induction fee.
Smith and Broker are the baseline routes beyond the Craft and Trade careers' own
technology gates. Weaver requires Horizontal Loom, Cooper requires Cooperage, Caravan
Factor requires Trade Houses, and Maritime Factor requires culturally neutral Coastal
Piloting rather than a particular ship type. The core numeric gates remain Guildmaster,
35 Guild Standing, Stewardship 9, and a 20-gold fee.
`career.specialization` is the one saved title field for both examinations and guild
paths, so it restores with that profession's career-history snapshot and is shown
wherever the character's vocation is named. The bonuses remain definitions on the
live path: Craft and Trade work focuses receive `fx.focusGold`; matching tagged
enterprises receive `fx.enterprise`; and a path may add `fx.tradeVenture` to the
formation-time venture preview. No enterprise copies a specialty bonus into its saved
instance. The picker derives both its complete requirements and unmet reasons from the
live definitions; it does not restate the core numbers as UI authority.

At tier 3+, that career is biography rather than daily employment. The player cannot
change occupation, seek guild advancement, earn ordinary career experience, or staff
an enterprise personally. Existing rank, guild standing, and history remain available
to flavor and return if the character becomes landless gentry again. Spouses, dependent
children and grandchildren, and retainers continue their normal work and enterprise
progression. Landed monks and priests keep gaining the vocational years required for
religious-office advancement, and office-derived seasonal piety remains active, but their
hands-on scriptorium and parish work stops.

**The working careers carry sustained life-path stories.** `data/events_lifepaths.js`
extends the existing careers instead of adding parallel professions; every path keeps
its entry route, recurring work decisions, advancement, personal risk, and at least one
durable accomplishment, and none of them passes the `professions` or `career` gates at
landed tiers. Soldiers in a realm at war draw command assignments (a scouting party, the
rearguard) resolved through the ordinary `battle` chance, with war service feeding the
existing muster-bred progress and failure costing blood; in peacetime they drill the
levy or spend the season at home. Practicing physicians face county outbreaks and the
lord's sickroom, and a master Physician completes the family **Book of Remedies** once
per life as an ordinary `giveItem` heirloom. Scholars dispute in public; Astronomers
choose between observation and paid horoscopes and bind the **Star Tables** once per
life; Authors accept patron commissions whose success grants another randomized family
treatise through the same item path as the qualification reward. The deliberate
tier-crossing exceptions are the temporary ones the player explicitly accepts: the
existing gentry field command, the mercenary contract, and the expedition (see
[travel.md](travel.md)).

**Guild standing is separate from career rank.** Guild careers display their standing as
Guild member → Master → Guild officer → Guildmaster. The saved `guildRank` ids remain
`member`, `master`, `officer`, and `guildmaster`; reaching Master also promotes the
character's vocational `rank` from journeyman to master.

An active adult guild career with a chosen, working vocation renews
`balance.guildStandingYearlyGain` Standing each vocational year, capped by
`balance.guildStandingMax` (5 and 100 by default). Apprentices, unassigned
characters, inactive archived callings, and landed protagonists do not gain it;
there is no passive decay. The Work and guild detail surfaces state the annual
source, cap, and commission threshold so spending Standing cannot create a
permanent unexplained lockout.

Trade leadership treats literacy as professional infrastructure. Promotion from master
merchant to Guild officer requires Lettered and Learning 6 in addition to the existing
Stewardship, prestige, years, and Guild Standing gates; Guildmaster requires Lettered and
Learning 8. Existing officers and guildmasters are grandfathered. Craft guild gates are
unchanged.

Guildmaster is also the personal qualification for the **Petition for a guild monopoly**
deed. The deed reads the protagonist's preserved character career, including at tier 3+,
and is limited to core Craft and Trade professions. It requires 60 guild standing,
Guild Charters in the effective sovereign nation, 40 Standing with the grantor, and an empty
incoming slot. Low-station guildmasters petition their local lord with baron terms;
landed vassals petition their direct liege with that realm's title-tier terms. An
independent landed ruler has no superior to petition.

**Friendship requires an intentional relationship.** Assigning personal attention records
an eligible living, non-family character in `player.friendContacts`. At the shared
`balance.relationshipOpinionThreshold` (+40 by default), the character sheet offers
**Call friend**; accepting installs that exact character in the compatibility role
`state.roles.friend` and frees the attention assignment. Existing +40 cultivated contacts
remain nameable even when attention has moved elsewhere. A friendship story can formalize
only the currently assigned, eligible person at the same threshold: `FB.getRole` never
generates a stranger merely because event text contains `{friend}`. Naming a replacement
is explicit and clears sworn-friend state. Friendship, its cultivated contacts, and
personal attention clear on succession or permanent relocation; none is inherited by the
next head. `balance.friendOpinionThreshold` is a deprecated fallback for older mods whose
data does not define the shared relationship threshold.

A remote assignment remains saved but paused. Its character sheet offers a
repeatable targeted journey whose confirmation assigns attention and spends the
road cost atomically. The quoted visit keeps the traveler at least 90 days;
Standing starts changing on arrival, stops during the return, and resumes on a later visit.
Naming a qualified friend and marriage proposals remain deliverable at distance. Gifts
may instead require the saved courier journey described above.

**Paid retainers are managed people, not family members.** `player.retainers` stores
compact contracts pointing to ordinary characters. The office is additive to the
character's career: a merchant may serve as factor, a soldier as captain, and a monk as
tutor. Retainers may staff enterprises, teach children, and use household equipment, but
do not bring family wages or piety and do not add resident-family upkeep. Capacity follows
station through `balance.retainerCapacity`; seasonal pay, arrears, dismissal, death, and
succession are handled by the shared retainer APIs in `js/economy.js`. Protagonist
succession first resets all predecessor Standing to neutral; inherited contracts then
renew at −15 Standing, keeping inherited service distinct from inherited friendship.
Each office has one holder; two unpaid seasons or Standing at −40 ends service,
and marriage replaces a paid contract with ordinary spouse membership.
The retainer candidate picker uses the shared person-assignment card to preview the office
effect, entry and seasonal pay, occupation, Standing, and additive-office consequence before
the existing hire action spends the day.

**Paid enterprise labor is a narrower contract.** `player.enterpriseLabor` stores
`{charId,enterpriseUid,pay,startedTurn,unpaid}` for named local workers generated with the
enterprise's required career and guild rank. They belong to one enterprise, consume no
retainer capacity, hold no household office, and do not become family. Their first wage is
paid at hiring and recurs each season; dismissal or two missed seasonal wages ends the
contract and clears the assignment. They exist so larger enterprises do not depend on the
player producing enough eligible relatives.

**Political household authorities never enter the managed household.**
`FB.isExternalHouseholdAuthority` is the shared boundary for both a reigning realm ruler and
a generated local lord, recognized by the active `state.roles.lord` seat or the character's
persisted `lord` role after relocation. Friendship can make either person a cultivated contact,
and marriage can create ordinary spouse links, but neither relationship permits household
service, work or career direction, enterprise staffing, paid master tutoring, or
family-armory equipment.
Retainer admission rechecks the same boundary at candidate, eligibility, and contract
normalization time. Normalizing an older invalid local-lord contract removes its household
assignments and restores the canonical `lord` character role.

**Managed family members have ambitions and may hold household offices.** The
bounded family set is the current protagonist's resident spouse, unmarried
children and grandchildren, and resident manageable siblings; it never expands
to every visible or historical relative. `state.agency.familyAmbitions` stores
one locale-neutral goal, its start year, neutral/encouraged guidance, progress,
and the last yearly request for each member. Encouragement gives a seeded yearly
chance to gain the goal's skill; three gains complete a small prestige milestone.
Neutral kin may bring at most one family request to the household each year.
Steering someone away selects another appropriate goal without letting the
player dictate the exact replacement. Marriage or loss of manageability removes
the record through the ordinary ensure boundary.

`player.familyOffices` maps an existing retainer-office id to one managed adult
family character. The holder must have the office's required occupation, sex,
station, and residence, receives the same listed contribution without retainer
capacity or pay, and cannot staff an enterprise simultaneously. A family holder
and a paid retainer compete for the same unique office slot. Marriage removes a
non-head holder before the ordinary household transfer. The character card owns
the ambition-guidance and family-office sheets; the Household Plan and Work view
derive the resulting commitment from the same records.

**The Household Plan is a derived overview, not character state.** Network → Household
opens one row for the living household head, each resident family member, and each paid
retainer, in that order. The row reads the existing education, instruction, career, guild,
religious-standing, enterprise, office, marriage, and loadout records without introducing a
policy or assignment record. Applicable cells open the same detailed pickers as character
sheets and Work & Enterprises. No-day changes return to a freshly derived plan. Day-spending
career, retainer, enterprise-purchase, religious-office, and match choices advance normally
and then rebuild the originating Household Plan or person manager beneath any event that was
queued.

## Family, house, and household scope

**Family visibility is not household control.** Work & Enterprises names its scope:
the playable head, resident spouses and descendants, unwed siblings living with the
household, and hired retainers appear when old enough for work or training. A spouse who
remains an external political household authority is excluded from that managed scope.
A visible relative outside the managed household is not assignable. Each present but
unavailable row states the applicable age, station, faith, career, or landed-head rule. The Guide
separately defines playable line, house, managed household, visible kin, and royal
branch.

**Manageable kin are resident unwed siblings, never household members.**
`FB.manageableKinKind(state, cid)` (model.js) is the single explicit rule for which
resident relatives the player may put to work: a living sibling of the protagonist by
recorded parentage (with the same role-plus-dynasty fallback `siblingsOf` uses for
first-generation kin of old saves) who shares the protagonist's dynasty, is not a
reigning realm ruler, is not established above freeholder (`FB.stationOf` ≥ 2), a
lord/notable, or a holder of a `royalLine` identity —
is not vowed to the faith (the vow *is* a monk or priest career record), has no living
spouse (checked in both link directions, exactly as `FB.isHouseholdCharacter`), and is
resident, meaning `FB.characterResidence` places them at the household home.
`FB.manageableKinBlocker` reports which test a sibling fails, so the Kin panel can
state each living sibling's scope in one line: "Lives with the household — can be put
to work", or married, reigning, landed, vowed, or away. Sharing a dynasty is never by
itself a license to redirect a married-away, landed, vowed, or ruling relative.

Manageable siblings join `FB.householdWorkers` and pass the `managedCareerCharacter`
gate, so Work & Enterprises, the career picker, enterprise staffing, the Household
Plan work/assignment/equipment cells, and the shared armory treat them like household
members — but they are never added to `FB.householdMembers`, so upkeep, family wages,
education, instruction, and match management keep their existing descent-line
semantics; the Household Plan shows those cells disabled with their existing
explanations. Manageability ends cleanly: both wedding paths (`FB.doKinWedding` and
the yearly `kinLifeTick` match) strip enterprise assignments and loadouts for any
non-head kin, and lazy enterprise normalization clears the assignment of a worker who
has left the labor pool. A resident sibling has no saved residence of their own, so
`FB.characterResidence` resolves them to the household home by fallback — they follow
the household on a permanent move and keep working, while enterprises left behind keep
the existing remote-ownership idle behavior.

**The family tree is a bounded navigator, not an unbounded genealogy dump.** New
campaigns record `player.houseFounderId` as the first playable head; old saves derive a
jump target from the earliest protagonist legend or current head without a format
migration. During the founder's own life, the primary tree begins from up to two recorded
ancestor steps so a generated starting family includes the founder's parents and siblings
instead of beginning at the downward-only founder node. The modal still renders at most
four descendant steps from its nearby root,
plus bounded maternal and stepfamily branches. Search indexes that rendered scope,
branch controls hide or reveal biological descendant subtrees without rewriting
parentage, and jump controls target the protagonist, first eligible successor, spouse,
and house founder. When the founder has moved beyond the nearby generation window, one
standalone founder card keeps the jump reachable.

The compact tree cards keep names and relationships scannable; their portrait tooltip
adds a separate current **Status** line. The current protagonist and reigning foreign
rulers use their exact faith- and sex-aware rank word. Other characters use their own
recorded station; an unstamped relative falls back to Lowborn instead of borrowing the
current household head's rank. Characters who actually held tier 3 or above also keep
a locale-neutral `highestTitleData` snapshot, rendered as **Highest title achieved** with
its place (for example, Baron of York or King of England). `statusTier` records the last
exact playable or reigning status; demotion, death, retirement, and succession never
erase the higher title. Old saves repair current heads and retained protagonist legends
without inventing a title for an unrecorded life. This is saved presentation history,
not a new gameplay capability, so it has no technology impact entry.

## Succession and inheritance

A freedom offer belongs to the protagonist who received it, so ordinary death or
retirement invalidates an unaccepted offer and any queued presentation. Once a final-
service term is accepted, its paid price and exact end turn belong to the household's
active tenure and survive succession when the new head is one of the charter's named
people; that covered heir completes the same remaining service without another charge.
An unlisted collateral successor cannot receive the promised freedom. The bounded
`player.familyFreedom` landmark also survives every
handover, preserving the original negotiating protagonist rather than rewriting history
around the heir.

**Commoner succession follows the heir's personal station.** A lawful freedom
resolution stamps the exact living people covered by its charter: the protagonist,
living spouses, living descendants, and any parents or siblings explicitly added to the
purchase or negotiated terms. Personal `character.unfree` state distinguishes those
bound people from unrelated free Lowborn characters at the same station, so character
sheets and family-tree status use the character's faith- and sex-aware tier-0 title
(for example Serf, Thrall, Fellah/Fellaha, or Bondman/Bondwoman). Parents and collateral
siblings otherwise remain bound.
Future children inherit the recorded station of their parents. If a tier-1 head is
followed by an unmanumitted collateral heir, household property still passes but the new
head returns to tier 0 and forms a new active serf tenure. A separately manumitted sibling
therefore remains a valid resident worker and succeeds as a freeholder.

Active tenure duties, rights, revision, and bounded authority-review history also belong
to the continuing household. A pending or queued tenure review is personal to the outgoing
head and clears on succession; the new head silently acknowledges the current authority as
their checkpoint, so no old lord, witness Standing, or unresolved proposal transfers.

`FB.heirReview` is the shared read-only succession explanation. `FB.heirsOf` filters
that review instead of rebuilding the order. The review preserves the existing named
heir, children-first, then same-house grandchildren/siblings/nieces-nephews/
uncles-aunts/cousins order and attaches a stable eligibility code for UI prose.
An eligible direct child is described as a living son or living daughter from the
candidate's recorded sex rather than by the generic child category.
Spouses, dead relatives, different-house branches, and branches behind living
children remain visible with an explicit reason rather than silently disappearing.

An unfinished first-profile tutorial is household continuity, not a personal benefit.
`FB.game.succeedTo` preserves only its `tutorial`/`tut_*` flags while clearing the
predecessor's ordinary life-local flags, then records whether the chosen successor is a
direct child or another relative. Making-a-living guidance uses that relationship and the
successor's current age to explain inherited progress and childhood limits. Its first
succession coachmark is likewise selected after the heir choice and points to Chronicle;
gold, property, enterprises, and debts continue to follow their existing inheritance
rules. This is onboarding presentation and continuity, with no technology impact.

**Voluntary retirement is a living handover, not a second succession system.** A
living head aged `balance.retirementAge` (50) or older may use the Hand over the
house deed to yield to any already-eligible adult successor from the same review.
`FB.game.retirementBlockers` is the single gate the deed, modal, and
`FB.game.retireTo` all quote: imprisonment, a personal war or campaign, leading a
great holy war host, any other wartime duty, an active journey, and the absence
of an adult successor each block with their own reason. The transition reuses
`FB.game.succeedTo` with `livingAbdication`, so money passes in full (no death
dues) while personal prestige, piety, and Common Voice shrink by the ordinary
succession rule, a personal bishopric returns to the Church, and courtship,
plots, and personal standings end. The predecessor stays alive as family:
`character.retired` marks them as a retired elder, their residence pins to the
household home, they remain visible in Kin, and they age and die through the
ordinary character mortality roll. They are no longer the playable head and
grant no benefits, so there is nothing a repeated retirement could duplicate.
Rival heirs, rebellion, and forced abdication are deliberately out of scope for
this first version.

**Apprenticeship complements tutoring.** A resident child or grandchild old enough for a
career's `apprenticeAge` may be placed with that trade from their sheet. It costs the
career's entry fee, adds vocational experience and the career skill during the yearly life
tick, and ordinary trades become journeyman work at sixteen. Learned trainees instead gain
Lettered after their authored vocational threshold and remain trainees until a passed
license examination. The ordinary education focus and instruction
continue in parallel. Family wage contributions remain limited to the player, spouses, and
unmarried dependent children and grandchildren; other kin and paid retainers do not send
invisible wages home.

**Resident family members cost coin as well as earning it.** The station-based household
upkeep remains the cost of the player's own establishment. Every resident spouse and
unmarried child or grandchild adds a smaller age-weighted provisions-and-quarters charge,
multiplied by the household's station standard. With no separate residence field in saves,
all living unmarried grandchildren are resident even when their parents have established
another household. Marriage removes a descendant from this managed household. This is an
expense model, not a room-capacity simulation: births are never blocked for lack of a housing
slot.

**Religious standing belongs to characters too.** `FBDATA.religiousPaths` owns the
ordered Catholic and Muslim ladders, their localized rank names, requirements, yields,
station changes, and compatibility flags. Effective faith
`properties.religiousPaths` route the lay path and exact professions to vocation paths;
optional path-level faith, capability, and profession requirements keep that routing
bounded. Household members lazily carry `c.religiousRanks`, a map from path id to the
legacy attained numeric index. Changing occupations selects a different path without
erasing progress on the old one. The title and next step appear beside the character's
livelihood. Lay and vocation standings remain visible together; seasonal piety uses
whichever attained standing has the higher yield instead of stacking both. The household
may sponsor advancement when that character meets its personal age, Learning, and
vocational-experience requirements and the house meets the shared piety and prestige
thresholds.

The paths are deliberately not symmetrical ordination trees. Catholic monastic standing is
novice → professed brother/sister → prior/prioress → abbot/abbess, with a male abbot able to
become bishop; Catholic clerical service follows clerk → acolyte → deacon → priest →
archpriest → bishop. Muslim learned service follows student → licensed scholar → mudarris →
mufti → qadi → chief qadi, while public mosque service follows servant → muezzin → imam →
khatib → chief imam. Islam has no ordained church hierarchy here: the learned path represents
recognized teaching, legal authority, and appointments. Women may become abbesses and Muslim
scholars or muftis; Catholic episcopal and modeled judicial appointments remain male-gated.

Lower vocation ranks advance deterministically when their gates are met. Catholic Abbot or
Abbess is instead a contested election, and Bishop is an investiture-aware appointment
available to a qualified male Abbot or Archpriest. A failed episcopal petition may rarely
produce a separate simony temptation; purchasing the mitre leaves a permanent reputation.
See [papacy.md](papacy.md).

Higher vocation offices raise a dependent's `station` for marriage and household society.
Abbot/qadi still raises the player to gentry, while chief qadi remains the Muslim alternate
route to tier 3. A Catholic Bishop receives a personal, non-hereditary `c.bishopric` at the
home county. The see grants tier-3 compatibility while the Bishop is otherwise unlanded, but
is not a generic barony: it has its own income, household retinue, actions, events, and
succession. A Bishop who later inherits real counties or a crown keeps the see alongside
those lay titles. On death or elevation to Pope, the see returns to the Church; a see-only
heir resumes as gentry and keeps the family's private property. Legacy
`player.flags.abbot/bishop/qadi/chief_qadi` remain compatibility mirrors for old events and
saves.

Every baseline path and rank remains at its historical index. Each rank now also has a
stable id for localization and special office consumers; mods may append ranks but cannot
reorder or remove the baseline prefix. A path missing after a mod is removed is inactive
without deleting its saved numeric progress. Restore and read paths remain deterministic
and RNG-neutral, and save format stays 3. The engine continues to own live gate checks,
resource payment, appointments, promotion side effects, and repair.

This data/modding boundary has no technology-impact entry: it neither changes baseline
religious eligibility nor adds a separately gateable player capability.

**The character interaction card owns dealings with one full character.**
It derives identity context, residence, occupation, faith, station, typed
Standing, current personal attention, courtship, friendship, rivalry,
betrothal, travel, and household-service commitments. Its actions route to the
existing gift, targeted visit, courtship/proposal, friendship, rivalry,
retainer, equipment, education, work, arranged-match, and exact-relative
manumission mechanics. An available royal family member's sheet also opens the negotiated
picker for pairing that person with a managed child or grandchild; the marriage
engine retains all access, faith, rank, kinship, dowry, acceptance, and refusal rules.
A free household head may redeem a living serf parent,
sibling, spouse, or descendant from that person's sheet; the quoted action changes only
that character's station and spends one day. The card
does not store a relationship model and does not replace biography, the
Household Plan, or the long Network roster.

`FB.rankAccessStatus`, `FB.socialAttentionStatus`, and `FB.friendshipStatus` expose read-only,
localized gate results. Assignment and naming still revalidate through the
same mechanics before mutation. A reigning ruler represented by a full
character shares the realm target's typed Standing but has no personal gift
action; **Realm and court** opens the political sheet that owns ruler gifts
and ruler-generation commitments.

Individual family manumission has technology impact **none**: redeeming a named bound
relative is baseline personal and legal recovery, not a capability credibly controlled
by sovereign research.

**Hostile conduct belongs to exact characters, including AI rulers and accomplices.**
The optional bounded `character.conduct` record holds successful-scheme progress and
deceit/cruelty axes from -3 to +3. Three successful hostile schemes grant Schemer
(+1 Intrigue and +5 percentage points to hostile success). Repeated deceptive or violent
choices move toward Deceitful or Cruel and replace Honest or Kind through the existing
opposite-trait rule; confession, abandonment, and mercy move toward the opposites.
Secret conduct advances the axes but does not create a public reputation. Conviction or
exposure grants Murderer (-15 opinion), Abductor (-10), or Traitor (-20) where applicable,
and an accomplice receives the same culpability. A proven killing of spouse or blood kin
also grants Kinslayer.

Intrigue captivity is a character condition read through the exact captive record.
Captives cannot travel, marry, hold or join plots, accept new household/Council offices,
or receive relationship visits. A captive sovereign cannot begin wars or schemes and
fields 20% less base host strength. These gates augment the existing protagonist prison
flag rather than introducing a second general prison simulation.
