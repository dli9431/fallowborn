# Characters: skills & growing up

**Skills grow on a soft cap.** Every skill gain (focus training, event `skills` effects,
education, coming of age) goes through `FB.gainSkill` (model.js): below
`balance.skillSoftCap` (20) each point lands; past it each must beat a
`(softCap/current)^2` roll, so single-stat stacking diminishes hard toward
`balance.skillHardCap` (40), the true ceiling `FB.skillOf` also reads up to.
Never write `c.skills[k]++` directly outside it. Daily focus training applies
`balance.focusSkillGainRate` (0.75) to its authored seasonal chance before this
soft-cap roll; event, education, and coming-of-age gains are unaffected.

**Equipment bonuses belong to the wearer.** `FB.skillOf` adds skill effects from that
character's household loadout, not from every object the dynasty owns. Equipped health
protection likewise lowers that wearer's yearly mortality, including spouses and resident
children. Battle odds and seasonal gold/prestige/piety remain head-of-household effects
and count only the current protagonist's outfit. AI rulers, strangers, siblings, and
married-away children do not simulate equipment. See [items.md](items.md).

**Children are players too.** When a minor heir succeeds (age < 16), the daily picker
fires only events tagged `childhood:true` (the childhood section of events_common.js plus
age-neutral events like sickness and plague) until they come of age.

**Focus and instruction are separate choices.** A child aged 6–15 chooses the skill being
studied, then learns at home, from a named household/neighbour tutor, at a religious charity
school, at a town merchant's school, or from a personal learned master. Named tutors use
their actual focused skill. The lord fosters only gentle children — the instruction picker
offers him only at `FB.playerStation(state) >= 2` (gentry and up); a serf's child is never
sent to his hall. Merchant schools require local development 2 and do not teach martial.
Personal masters remain generated characters, so they can pass on traits or die.

**Paid schooling is seasonal.** Charity schools, merchant schools, and personal masters
charge the exact `FBDATA.schooling` fee at every 90-day boundary. An unaffordable fee pauses
that term without cancelling the arrangement; the household retries next season. Each
completed term saves one quarter of the difference between home instruction and the
arrangement's full-year chance in `c.edu.lessonBoost`. The yearly education roll consumes
and clears that saved bonus, so changing teachers just before winter cannot buy a full
year's result. Old saves with a generated hired tutor lazily identify it as the recurring
personal-master arrangement.

**Childhood pacing.** A child's total skill income (Study focus, education tick,
childhood events) is tuned to land only modestly above an adult's (~5/yr vs ~3–4/yr):
Study starts from a 0.5 seasonal chance before the shared 0.75 focus-training
multiplier — below the best adult focus's 0.7 base chance — and childhood lesson
events carry 6–8-season cooldowns so the same lesson can't recur constantly.
Home instruction has an 18% yearly directed-learning chance, charity school 35%, merchant
school 60%, and a named tutor or personal master `30% + 4%` per point of focused tutor
skill, capped at 90%. The family Letters holding adds its existing 8 percentage points.
Keep new childhood content inside that envelope.

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

**Regard earns its keep.** Every character carries one `opinion` of the player (−100…100).
It gates deeds and events (courtship, petitions, `roleOpinionAbove/Below` triggers), and
three multipliers make it felt everywhere: the dead `traitAgg(me).opinion` aggregate now
scales positive opinion effects in `FB.applyEffects` (likeable traits warm folk faster),
and the `scheme_rival` deed and the `plot` named chance (for plots with a personal victim)
add the target's `opinion/500` to success — a trusting victim is easier to undo.

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
instead of inheriting the dead parent's occupation.

**Apprenticeship complements tutoring.** A child old enough for a career's
`apprenticeAge` may be placed with that trade from their sheet. It costs the career's
entry fee, adds vocational experience and the career skill during the yearly life tick,
and becomes journeyman work at sixteen. The ordinary education focus and instruction continue
in parallel. Household work is intentionally limited to the player, spouses, and
unmarried dependent children; distant kin do not send invisible wages home.

**Resident family members cost coin as well as earning it.** The station-based household
upkeep remains the cost of the player's own establishment. Every resident spouse and
unmarried child adds a smaller age-weighted provisions-and-quarters charge, multiplied by
the household's station standard. Married children leave this managed household. This is
an expense model, not a room-capacity simulation: births are never blocked for lack of a
housing slot.

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
