# Characters: skills & growing up

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
unaffected.

**Equipment bonuses belong to the wearer.** `FB.skillOf` adds skill effects from that
character's household loadout, not from every object the dynasty owns. Equipped health
protection likewise lowers that wearer's yearly mortality, including spouses and resident
children and grandchildren. Battle odds and seasonal gold/prestige/piety remain
head-of-household effects and count only the current protagonist's outfit. AI rulers,
strangers, siblings, and married-away descendants do not simulate equipment. See
[items.md](items.md).

**Children are players too.** When a minor heir succeeds (age < 16), the daily picker
fires only events tagged `childhood:true` (the childhood section of events_common.js plus
age-neutral events like sickness and plague) until they come of age.

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
patronage — liege favor and prestige). Old saves self-heal: `FB.validateFocus` drops
a now-hidden martial focus and `FB.defaultFocus` re-maps it. The one road left for a woman who
means to actually *fight* is the *Sweet Polly Oliver* event chain (events_peasant.js) — cutting
her hair and following the war levy in disguise, which trains martial across about a year; see
[events.md](events.md).

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

**A rich table protects the young.** Each station above serf trims the yearly
mortality of the household's resident children and grandchildren (and of a child
protagonist) by `balance.richChildMortalityBonus` (7%), and each station gives a
`balance.richChildHealthChance` (10%) yearly chance that a resident descendant
under 16 gains a point of health, up to 8 — so the young descendants of rulers
and rich merchants die a little less often and grow a little hardier than a serf's.
Paid care in the `child_fever` event follows the schooling ladder: the wise
woman (3 gold, 60%), a physician (10, 75%), a renowned physician (30, 90%),
beside free prayer (55%).

**Regard earns its keep.** Every character carries one `opinion` of the player (−100…100).
It gates deeds and events (courtship, petitions, `roleOpinionAbove/Below` triggers), and
three multipliers make it felt everywhere: the dead `traitAgg(me).opinion` aggregate now
scales positive opinion effects in `FB.applyEffects` (likeable traits warm folk faster),
and the `scheme_rival` deed and the `plot` named chance (for plots with a personal victim)
add the target's `opinion/500` to success — a trusting victim is easier to undo.
`player.socialAttention` is not another relationship meter: it names the one character
whose existing Regard gains `balance.socialAttentionDailyOpinion` (+0.2 by default) each
ordinary player day. Assignment and withdrawal cost no day, and Diplomacy does not change
that fixed rate. Attention pauses during overland travel and Observe mode but continues
alongside work, study, war, and deeds that consume a day.

**Explicit gifts are recipient-bound.** Every living non-player character sheet offers one
gift picker. Cash costs 5 gold for `balance.socialCashGiftOpinion` Regard (+4 by default);
an unequipped, unpledged armory object grants the quality-tier value from
`balance.socialItemGiftOpinion` (+4/+8/+12). Cash and items share the character-id clock in
`player.socialGiftTurns`, so the same person may receive only one explicit gift every
`balance.socialGiftCooldownDays` (90 by default), and every accepted gift spends one day.
Spouses, dependent children, retainers, and other managed household members may receive
cash, but not an armory object: their equipment remains family property managed through the
shared loadouts. These are ordinary-character gifts and change only Regard; lightweight
realm rulers use the realm gift rules in [realms.md](realms.md).

**Rivalries grow out of contact.** The rival seat remains `state.roles.rival`, so old saves,
events, and mods keep one canonical personal enemy. The player may deliberately name any
non-family character at opinion ≤ −40. An NPC may claim the seat only if that exact,
already-existing character has a life-local entry in `player.rivalContacts`, written by an
explicit hostile interaction (`FB.noteRivalContact` / event effect `rivalContact`), and is
also at opinion ≤ `balance.rivalOpinionThreshold`. Merely losing opinion is not enough, and
`{rival}` text or an `opinion` effect can never lazily invent a rival. Contacts expire after
`balance.rivalContactMaxAge`; wrathful, proud, cruel, and ambitious characters are readier
to declare, while patient, humble, kind, and content characters are slower.

An active feud has life-local `player.rivalry` metadata with heat 0–100. Heat, not opinion,
gates escalation: opinion measures willingness to make peace, while heat measures whether
the quarrel is cooling, simmering, open, or a blood feud. Hostile deeds and event choices
raise it; restraint and common cause lower it; a long quiet reduces it toward 5. The
character sheet offers mediated settlement instead of unilateral deletion. `FB.endRivalry`
clears the seat, rival plot, and rival-specific downfall flags, then protects the peace for
`balance.rivalPeaceDays`. On succession contacts reset and an active enemy produces the
queued `rival_legacy` choice: bury the dead ruler's quarrel, seek peace, or inherit it.
Old saves with a rival lazily receive `balance.rivalHeatOldSave`.

Related: [marriage.md](marriage.md) for spouses and child matches,
[events.md](events.md) for the event picker.

**Careers belong to characters.** Every managed household member lazily receives
`c.career = {profession,rank,experience,startedYear,guildRank,guildStanding,chosen}` through
`FB.careerOf` (`js/economy.js`). `player.profession` remains a compatibility mirror for
existing events, portraits, titles, and mods; succession mirrors the heir's own career
instead of inheriting the dead parent's occupation. That mirror now remains the head's
actual career at every station: acquiring a landed title does not silently replace a
merchant, craft, clerical, or military occupation with `noble`.

At tier 3+, that career is biography rather than daily employment. The player cannot
change occupation, seek guild advancement, earn ordinary career experience, or staff
an enterprise personally. Existing rank, guild standing, and history remain available
to flavor and return if the character becomes landless gentry again. Spouses, dependent
children and grandchildren, and retainers continue their normal work and enterprise
progression. Landed monks and priests keep gaining the vocational years required for
religious-office advancement, and office-derived seasonal piety remains active, but their
hands-on scriptorium and parish work stops.

**Guild standing is separate from career rank.** Guild careers display their standing as
Guild member → Master → Guild officer → Guildmaster. The saved `guildRank` ids remain
`member`, `master`, `officer`, and `guildmaster`; reaching Master also promotes the
character's vocational `rank` from journeyman to master.

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

**Paid retainers are managed people, not family members.** `player.retainers` stores
compact contracts pointing to ordinary characters. The office is additive to the
character's career: a merchant may serve as factor, a soldier as captain, and a monk as
tutor. Retainers may staff enterprises, teach children, and use household equipment, but
do not bring family wages or piety and do not add resident-family upkeep. Capacity follows
station through `balance.retainerCapacity`; seasonal pay, arrears, dismissal, death, and
succession are handled by the shared retainer APIs in `js/economy.js`. Contracts pass to
an heir with a regard penalty, keeping inherited service distinct from inherited
friendship. Each office has one holder; two unpaid seasons or regard at −40 ends service,
and marriage replaces a paid contract with ordinary spouse membership.

**Apprenticeship complements tutoring.** A resident child or grandchild old enough for a
career's `apprenticeAge` may be placed with that trade from their sheet. It costs the
career's entry fee, adds vocational experience and the career skill during the yearly life
tick, and becomes journeyman work at sixteen. The ordinary education focus and instruction
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

**Religious standing belongs to characters too.** Catholic and Muslim household members
lazily carry `c.religiousRanks`, a map from path id to attained step. Changing occupations
selects a different path without erasing progress on the old one. Ordinary careers use a
lay path built around almsgiving, pilgrimage, and patronage; `monk` and `priest` select a
vocation path. The title and next step appear beside the character's livelihood, and the
household may sponsor advancement when that character meets its age, Learning, vocational
experience, piety, prestige, and gold requirements.

The paths are deliberately not symmetrical ordination trees. Catholic monastic standing is
novice → professed brother/sister → prior/prioress → abbot/abbess, with a male abbot able to
become bishop; Catholic clerical service follows clerk → acolyte → deacon → priest →
archpriest → bishop. Muslim learned service follows student → licensed scholar → mudarris →
mufti → qadi → chief qadi, while public mosque service follows servant → muezzin → imam →
khatib → chief imam. Islam has no ordained church hierarchy here: the learned path represents
recognized teaching, legal authority, and appointments. Women may become abbesses and Muslim
scholars or muftis; Catholic episcopal and modeled judicial appointments remain male-gated.

Higher vocation offices raise a dependent's `station` for marriage and household society.
For the player, abbot/qadi still raises tier to gentry and bishop/chief qadi to baron, preserving
the religious alternate route into the secular game. Legacy `player.flags.abbot/bishop/qadi/
chief_qadi` self-heal the matching character rank, and new ladder promotions set those flags
so existing titles and events remain compatible.
