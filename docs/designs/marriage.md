# Marriage & child matches

## Royal marriages

Royal courtship uses the ordinary marriage rules. Ruler sheets in the player's liege
chain show their compact family and ordered succession, and an independent player king
or emperor may also approach an adjacent sovereign royal court. Count and duke children
have station 3; king and emperor children station 4. A royal proposal uses the normal
proposal formula plus that realm's opinion divided by 400 and clamps at 5-90%. Only the
current protagonist may create a royal compact, and only one such compact may be active
at once; adulthood, sex, kinship, doctrine, courtship, proposal, and spouse capacity
remain the standard gates.

Every ordinary, matchmade, or royal courtship assigns the player's one
`player.socialAttention` slot to that suitor while leaving the normal work/study focus
alone. A proposal is unavailable until the suitor reaches the shared
`balance.relationshipOpinionThreshold` (+40 by default); after that readiness gate, the
existing proposal probability still weighs Regard, prestige, station, traits, and royal
realm opinion. Starting another suit ends the former one with −20 Regard and records the
same hostile contact as a manual breakoff. Marriage, refusal, breakoff, death, succession,
and permanent-relocation cleanup release the assignment.

Marriage to any listed child forms a dynastic tie, but only the visibly designated heir
currently transmits the crown. The spouse succeeds first. Shared children form that
spouse's branch, and if the spouse dies they retain the branch's place before royal
siblings. A landed royal child may rule the AI realm before the player ever selects
them; the title joins player control only when that rightful character becomes the
protagonist. Divorce, the royal spouse's death, or the protagonist's death ends the
marriage-based military alliance, but already-born descendants keep their succession
position.

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
unaffected. The `widow_veil` plot
(map_data.js → `plot_spouse_end`) murders the current spouse.

Parents arrange child matches: from age 12 an unwed child's sheet offers three
sounded-out families (`FB.spawnMatchCandidates`/`FB.sealKinMatch`/`FB.doKinWedding` in
events.js, picker in ui.js; the candidates persist on the child as `matchIds`). A pledge
sets `betrothedId` and the yearly `kinLifeTick` weds the pair once both are 16 —
unpledged kin still auto-wed at `balance.kinMarryChance`. A daughter's dowry is paid at
the pledge and refunded by `FB.killChar` if death unmakes it; a son's bride brings hers
to the wedding; both swing prestige at half the player's own `marryUpPrestige` rates, and
matches above the player's station gate on prestige (20 per step).

Related: [characters.md](characters.md) for the rest of the character lifecycle,
[piety-intrigue-diplomacy.md](piety-intrigue-diplomacy.md) for the plot system.

**Occupational marriage backgrounds are real state.** The station-flavored match
epithets seed a compatible career on the candidate. In particular, a
Guildmaster's son or daughter carries `background.guildmasterFamily`; marriage sponsors
a craft/merchant player into the guild, or otherwise brings ten gold and commercial
contacts. The spouse then joins the managed household workforce and may staff an
enterprise like any other resident adult.
