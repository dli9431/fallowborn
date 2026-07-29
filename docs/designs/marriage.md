# Marriage & child matches

## Royal marriages

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

Faith sets doctrine (`FB.marriageDoctrine` in model.js): muslim/pagan/jewish players
divorce from the spouse's char sheet (muslim `talaq` and jewish `get` scale off
`dowryByStation`; pagan `sunder` costs no coin but a prestige hit instead), Christians
petition via the `annulment_plea` event (`annulment` named chance, yearly cooldown), and
`balance.wivesByGroup` grants polygyny (`FB.spousesOf`/`FB.canWed`/`FB.promoteSpouse`;
every wife can conceive, the first holds the spouse role). The spouse sheet carries a
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
unpledged kin still auto-wed at `balance.kinMarryChance`. A daughter's dowry is paid at
the pledge, and the same rule applies to a granddaughter; death before the wedding refunds
it through `FB.killChar`. A son's or grandson's bride brings hers to the wedding. All four
relationships swing prestige at half the player's own `marryUpPrestige` rates, and matches
above the player's station gate on prestige (20 per step). Marriage removes that descendant
from the managed household, clears work and equipment assignments, and leaves their outfit
in the shared armory.

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

Related: [characters.md](characters.md) for the rest of the character lifecycle,
[piety-intrigue-diplomacy.md](piety-intrigue-diplomacy.md) for the plot system.

**Occupational marriage backgrounds are real state.** The station-flavored match
epithets seed a compatible career on the candidate. In particular, a
Guildmaster's son or daughter carries `background.guildmasterFamily`; marriage sponsors
a craft/merchant player into the guild, or otherwise brings ten gold and commercial
contacts. The spouse then joins the managed household workforce and may staff an
enterprise like any other resident adult.
