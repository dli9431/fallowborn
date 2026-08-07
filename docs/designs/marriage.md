# Marriage & child matches

## Exceptional sibling courtship

Close-kin prohibition remains the default and the AI rule. Parent/child,
grandparent/grandchild, sibling, and avuncular pairs fail the centralized
`FB.kinshipDegreeSnapshot` / `FB.closeMarriageKinSnapshot` gate in ordinary
courtship, descendant matchmaking, royal offers, and ruler-agency marriages;
cousins remain eligible under the ordinary rule. The sole exception is an
explicit player approach to an adult opposite-sex full or half sibling. It
never authorizes an arranged match or AI choice.

The approach is available only while both characters are alive, unwed,
unbetrothed, able to marry under their offices and vows, co-located, free of
another courtship, and at +40 personal Standing. Player traits must total at
least +1: Lustful +2; Cynical or Deceitful +1; Chaste -2; Honest -1;
Ambitious +1 only when titled succession makes the sibling relevant; Zealous
+1 under an authorizing rite and -2 otherwise; Lettered +1 under the rite.
The target then makes a separate seeded response roll: 5% base, up to 30
percentage points from Standing above +40, and route-sensitive modifiers from
Lustful, Ambitious, Cynical, Deceitful, Zealous, Chaste, Content, and Honest.
Illicit approaches without a receptive target trait cap at 10%. Refusal is
permanent for the pair.

Acceptance creates the ordinary single personal-attention assignment, but
`FB.courtshipStandingThreshold` raises proposal readiness to +80. Proposal is
another target-trait roll capped at 60%. Rejection permanently closes the
pair; a player breakoff applies the ordinary -20 Standing and a five-year
pair cooldown. An illicit accepted courtship makes one exposure check per
season (4-18%, traits and Intrigue included) until exposed. The exposure event
can end, deny, or openly persist in the relationship.

Exact shared faith with `marriage.kinship.siblingRite:'xwedodah'` authorizes a
recognized rite costing 75 piety and 25 gold. Every other route is an
irregular union costing 75 piety, 25 prestige, 15 Common Voice, and 20 liege
Standing; both spouses gain the non-inherited `scandalous_union` reputation,
and the relevant faith authority receives a consequence. Neither route pays
a dowry, forms a royal compact, or creates an alliance. Full-sibling children
receive a 20% health-risk roll and half-sibling children 10%; each parent with
recorded close-kin parentage adds five percentage points, capped at 35%.
Outcomes are Frail, Sickly, or one lost health point.

## Royal marriages

AI rulers may initiate a bounded royal-family offer during the annual ruler
agency pass. The proposing ruler must pass the distance/culture/faith relevance
rule in [realms.md](realms.md), and their current aim must favor dynastic security,
peace, or crown consolidation. The candidate on the player's side is drawn only
from managed family, never arbitrary visible kin; both people must be at least
twelve, uncommitted, opposite-sex under the modeled doctrine, exact-faith
compatible, and outside the close-kin gate. The proposing court weighs realm
Standing, player prestige and station, the family member's station and Diplomacy,
and the ruler's dynastic aim. The queued context freezes exact character ids,
ruler generation, payer, and dowry; resolution revalidates every live gate.

Acceptance uses the ordinary bride's-house transfer exactly once and the normal
`FB.doKinWedding` path at majority. Declining cools Standing with the proposing
realm. Player-initiated royal proposals continue to use the ordinary formula;
the target ruler's current aim now modestly favors a dynasty-securing or peaceful
match and resists one while consolidating the crown.

Royal courtship uses the ordinary marriage rules. Ruler sheets in the player's liege
chain show their compact family and ordered succession, and an independent player king
or emperor may also approach an adjacent sovereign royal court. Count and duke children
have station 3; king and emperor children station 4. A royal proposal uses the normal
proposal formula plus Standing with that realm's ruler divided by 400 and clamps at
5-90%. Only the
current protagonist may create a royal compact, and only one such compact may be active
at once; adulthood, sex, kinship, doctrine, courtship, proposal, and spouse capacity
remain the standard gates.

Every ordinary, matchmade, or royal courtship assigns the player's one
`player.socialAttention` slot to that suitor while leaving the normal work/study focus
alone. A proposal is unavailable until the suitor reaches the shared
`balance.relationshipOpinionThreshold` (+40 by default); after that readiness gate, the
existing proposal probability still weighs Standing, prestige, station, traits, and
royal-realm Standing. Starting another suit ends the former one with −20 Standing and records the
same hostile contact as a manual breakoff. Marriage, refusal, breakoff, death, succession,
and permanent-relocation cleanup release the assignment.

Beginning courtship requires county co-location. A remote ordinary or royal
candidate opens the relationship-visit review; departure begins the suit and
attention assignment atomically, road days pause progress, and Standing starts changing at
the target’s residence. Materialized royal children reside at their realm’s
current capital. A ruler can likewise be materialized from their realm sheet and
courted through the same visit, centralized `FB.canCourt` gates, and proposal flow,
so either visit always follows capital movement. Proposals remain deliverable at
distance once Standing reaches the threshold.

Marriage to any listed child forms a dynastic tie, but only the visibly designated heir
currently transmits the crown. The spouse succeeds first. Shared children form that
spouse's branch, and if the spouse dies they retain the branch's place before royal
siblings. A landed royal child may rule the AI realm before the player ever selects
them; the title joins player control only when that rightful character becomes the
protagonist. Divorce, the royal spouse's death, or the protagonist's death ends the
marriage-based military alliance, but already-born descendants keep their succession
position.

A living betrothal remains exclusive when either partner inherits. Accession never
seeds or links a generated consort beside the pledge, so the ordinary age-sixteen
`FB.doKinWedding` path can still complete it. A ruler who inherits before sixteen
receives only a same-age compact future-consort reservation: no character, spouse link,
or generated betrothal exists until both turn sixteen. A real pledge made meanwhile
supersedes that reservation; otherwise the eager court ensure materializes and marries
the pair at majority. Divorce and primary-spouse promotion invalidate the shared family
index in the same operation, so relationship views update within the turn.

A reigning ruler who marries the player does not join the managed household. The ordinary
spouse links, station effects, royal compact, alliance, and children remain, but
`FB.characterResidence` keeps that spouse at the realm’s current capital. They provide no
household work or upkeep and cannot use the family armory. The player and ruler may
conceive only when the player’s physical travel location is the capital; every shared
child is registered beneath the reigning compact member and therefore enters the realm’s
normal succession.

## Marriage residence and living abdication

When a tier-3+ protagonist marries the exact relationship-visit target in that
character’s county, the completed wedding preserves the destination stay and
opens a non-dismissible residence decision. A reigning-ruler spouse qualifies.
The lawful heir shown in the modal is recomputed from `FB.heirsOf`; both
abdication paths recompute and validate it again at confirmation.

- **Remain the protagonist:** the ruler abdicates, moves the household to the
  wedding county, and continues as tier-2 landless gentry. Counts and greater
  rulers hand their intact player realm to the heir as an AI realm; a barony has
  no realm node and returns to the local count. The protagonist’s royal compact
  and already-created descendant claims remain, but any realm-to-realm alliance
  ends once the protagonist is landless.
- **Continue as the heir:** the playable generation advances through the normal
  successor resets while the former ruler remains alive. The existing title,
  household home, and player realm where one exists stay in place. The former
  ruler and spouse remain married, receive explicit residence in the wedding
  county, and leave the managed household. The former ruler’s compact and
  alliance end, while already-born descendants keep their royal succession
  positions.
- **Decide later:** the ordinary destination stay and eventual return remain
  available. The automatic prompt clears, but **Stay after marriage…** remains
  in Deeds until the journey ends.

This decision bypasses the ordinary year/four-story settlement threshold but
still consumes the protagonist’s one lifetime relocation. The heir path is
disabled while either member of the retiring couple participates in the active
pregnancy record, so a deferred decision can be completed after the birth.
Living abdication never marks the predecessor dead, records a legend, charges
death dues, or clears an unrelated pregnancy.

**Marriage is station-gated.** Characters carry a social rank `station` 0–4
(`FB.stationOf` in model.js; the player's is their tier capped at 4). Courting 3+ steps
up is blocked (`FB.canCourt`), the `proposal` named chance drops per step up
(`balance.proposalStationPenalty`), weddings settle a station-scaled dowry and prestige
swing (`FB.doMarry`), and matchmaking sounds out three families at once
(`FB.spawnSuitor`): an established house (older, a step up — fatter dowry, harder
suit, fewer childbearing years), a peer, and a young match a step down. The three
persist on the player as `suitorIds` until one is chosen in the picker
(`UI.showSuitorPicker` → `FB.pickSuitor`); the usual meet-and-court event flow
follows. Outliving a spouse of higher station queues `widow_settlement` /
`house_claim` (`FB.spouseDied`, called from the mortality tick and `killRole:'spouse'`;
payout fns `dower_*`/`claim_*` in events.js — a won claim can lift a commoner to tier 2).

`FB.marriageTerms` is the single transfer rule for protagonist and descendant
marriages: the bride's house pays the displayed dowry. A protagonist courtship
freezes `{suitorId,amount,playerPays}` in `player.courtshipTerms`, so proposal
status and confirmation show the exact payer, recipient, and amount that
`FB.doMarry` later settles. The wedding preflights an outgoing payment and moves
the money exactly once. Authored story weddings may use `marry:'informal'` when
the story itself replaces formal family negotiations; those marriages transfer
no dowry.

Faith inheritance sets doctrine (`FB.marriageDoctrine` in model.js). Effective
`properties.marriage.spouseLimit.m` / `.f` grants monogamy, polygyny, or
polyandry;
`properties.marriage.divorce` supplies the kind, direct/petition route, costs, and
cooldown; and `acceptedRelations` says whether another faith is eligible according to
the directional relation graph. Muslim `talaq` and Jewish `get` scale off
`dowryByStation`; pagan `sunder` costs no coin but prestige; Christians petition via
the `annulment_plea` event. `balance.wivesByGroup` is read only as a compatibility
fallback for a legacy faith definition with no inherited marriage property. The family
mechanics remain `FB.spousesOf`/`FB.canWed`/`FB.promoteSpouse`: every eligible spouse
pairing can conceive, and the first holds the spouse role. See
[religions.md](religions.md). The spouse sheet carries a
🛑 No more children toggle (`player.flags.noChildren`) that skips the conception rolls in
`birthTick` — a pregnancy already begun still comes to term, and kin households are
unaffected. Pregnancy follows its recorded parents across succession: a surviving
mother still gives birth after the father dies, and the newborn is linked as the new
protagonist's sibling rather than child. The `widow_veil` plot
(map_data.js → `plot_spouse_end`) murders the current spouse.

Catholic Bishoprics, Cardinalates, and Papal claims are personally celibate offices.
`FB.canCourt`, `FB.canWed`, `FB.doMarry`, and the queued-wedding path all reject a living
holder while preserving earlier marriages, children, legitimacy, and dynasty links. A
candidate must be unmarried or widowed and not betrothed before episcopal appointment;
a widowed Bishop may later petition for the red hat, but cannot remarry while holding
either office.

The household head arranges descendant matches: from age 12 an unwed resident child or
grandchild's sheet offers three sounded-out families
(`FB.spawnMatchCandidates`/`FB.sealKinMatch`/`FB.doKinWedding` in events.js, picker in
ui.js; the candidates persist on the descendant as `matchIds`). A pledge
sets `betrothedId` and the yearly `kinLifeTick` weds the pair once both are 16 —
unpledged kin still auto-wed at `balance.kinMarryChance`. Past
`balance.familyMaxChars` tracked family records the unscripted weddings and kin
births pause — the localStorage-quota backstop (see
[state-and-saves.md](state-and-saves.md)) — while sealed betrothals still wed,
since a pledge is a player promise that joins two existing records. A daughter's dowry is paid at
the pledge, and the same rule applies to a granddaughter; death before the wedding refunds
it through `FB.killChar`. A son's or grandson's bride brings hers to the wedding. All four
relationships swing prestige at half the player's own `marryUpPrestige` rates, and matches
above the player's station gate on prestige (20 per step). Marriage removes that descendant
from the managed household, clears work and equipment assignments, and leaves their outfit
in the shared armory.

Marriage candidate rows preview child identity through `FB.childIdentityPreview`, the
same two paths used by birth simulation. A protagonist-line child takes culture, faith,
and house from the recorded playable-line parent. A collateral child takes culture and
faith from the managed family parent while house follows the father (the family son or
the daughter’s spouse). The preview names the source parent for each field; it does not
change the recorded mother/father links.

The optional **Descendant Match Assistant** stores household limits for minimum station,
maximum dowry, maximum immediate gold expense, and maximum prestige requirement. It
reviews the same three persistent `matchIds`, applies their ordinary current-resource,
faith, close-kin, celibacy/doctrine, and royal-compact gates, then ranks qualifying
families by higher station, lower immediate expense, lower prestige requirement, and
nearer age. Saving the policy triggers an immediate review, and each New Year reviews
eligible resident descendants from age 12. `matchRecommendation` records only a candidate
id and the policy signature;
it creates a Household Plan marker and one Chronicle notice, not a betrothal. Previewing,
saving, and refreshing a recommendation spend no resources or days. The ordinary picker
lists the recommendation first but preserves all manual choices, and only
`FB.sealKinMatch` can make the consequential pledge.
The household head may put an eligible descendant in the `matchCharacter` protection
scope from that same picker. Protected descendants are omitted from immediate and New Year
recommendation passes, and an existing recommendation marker is removed; their persistent
candidate families and manual pledge controls are unchanged. A match sealed from Household
Plan still spends its ordinary day, then returns to the refreshed plan instead of dismissing
the whole management flow.

Related: [characters.md](characters.md) for the rest of the character lifecycle,
[piety-intrigue-diplomacy.md](piety-intrigue-diplomacy.md) for the plot system.

**Marriage actions are presented by the character interaction card but remain
marriage mechanics.** `FB.courtshipStatus` is the explanatory form of the
authoritative `FB.canCourt` gate, and `FB.proposalStatus` adds the active-suit
and Standing-threshold requirements used by `FB.canPropose`. The card shows
travel cost and days before a remote courtship, the one personal-attention
assignment and any abandoned-suit consequence, then routes to the existing
visit, proposal event, breakoff, divorce, annulment, or arranged-match flow.
Rendering never begins a courtship, materializes a royal child, or alters a
marriage. `FB.spouseSnapshot`, `FB.canWedSnapshot`, and
`FB.royalCloseKinSnapshot` let the explanatory gate inspect an old or partial
save without performing spouse cleanup or succession repair; the explicit
courtship action performs those compatibility repairs before revalidating.

Royal children in the bounded displayed court are eager character records; collateral
branches outside it remain compact until accession or an explicit interaction needs
them. The realm card's courtship route reuses or materializes the selected child and
then uses the ordinary courtship and travel gates. A materialized reigning
spouse links between personal and political sheets; the political side retains
succession and ruler gifts while the personal side retains marriage and
residence choices.

**Stepfamily is visible without rewriting blood or succession.** At marriage,
every existing child of either spouse retains their biological parent ids,
dynasty, residence, and any royal succession membership. Royal compact children
of the spouse are materialized and reconciled with the same ordinary
parent-child links used by the family tree. The child records the additive
`stepParentIds` relationship; this powers a separate Stepfamily branch, kin
links, gift access, and the marriage-affinity gate. It does not make the child a
managed descendant, household worker, or heir. The relationship remains family
history after divorce or death, and restore repairs missing current-spouse
links without duplicating an existing one.

**Occupational marriage backgrounds are real state.** The station-flavored match
epithets seed a compatible career on the candidate. In particular, a
Guildmaster's son or daughter carries `background.guildmasterFamily`; marriage sponsors
a craft/merchant player into the guild, or otherwise brings ten gold and commercial
contacts. The spouse then joins the managed household workforce and may staff an
enterprise like any other resident adult.
