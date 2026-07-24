# Marriage & child matches

**Marriage is station-gated.** Characters carry a social rank `station` 0–4
(`FB.stationOf` in model.js; the player's is their tier capped at 4). Courting 3+ steps
up is blocked (`FB.canCourt`), the `proposal` named chance drops per step up
(`balance.proposalStationPenalty`), weddings settle a station-scaled dowry and prestige
swing (`FB.doMarry`), and matchmade suitors come from the player's own walk
(`FB.spawnSuitor`). Outliving a spouse of higher station queues `widow_settlement` /
`house_claim` (`FB.spouseDied`, called from the mortality tick and `killRole:'spouse'`;
payout fns `dower_*`/`claim_*` in events.js — a won claim can lift a commoner to tier 2).

Faith sets doctrine (`FB.marriageDoctrine` in model.js): muslim/pagan/jewish players
divorce from the spouse's char sheet (costs scale off `dowryByStation`), Christians
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
