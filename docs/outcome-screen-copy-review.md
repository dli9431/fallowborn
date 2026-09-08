# Outcome-screen copy review

Exact authored English source; placeholders become names, places, amounts, or dates in play. Choice labels provide context; only the selected branch and actual custom-handler messages appear. Ordinary declines can be excluded by the resolver.

Freedom: Your household rises from Serf to Freeholder, free of customary service and able to travel, pursue free livelihoods, and own lasting property.

Shared titles: Freedom gained; Success; Failure; Outcome; The fever breaks; A child lost; Wedding vows; Proposal refused; Escape failed; Station lost. War titles use the recorded result.

Outcomes without authored prose show the actual consequence chips, without repeating the chosen instruction. Specific custom-handler messages take precedence over generic chance-result text.

## A Man of Your Own (`manumission`)

Source: `data/events_peasant.js`

- **Choice:** Pay {money:price} now and accept {serviceDays} days of final service.
- **Choice:** Not yet; keep these terms until their stated expiry.

## The Open Road (`flee_serfdom`)

Source: `data/events_peasant.js`

- **Choice:** Run.
- **Outcome prose:** {lord}’s riders catch you at the ford. You are dragged back in a halter.
- **Choice:** Stay. This is home, chains and all.

## What Is Remembered (`old_custom_end`)

Source: `data/events_peasant.js`

- **Choice:** Bind the right to every hearth.
- **Resolved log:** Secured the ancient rights of common.
- **Choice:** Renew the right already held by your house.
- **Choice:** Ask for your freedom as the price.
- **Choice:** Ask instead for a place in the lord’s service.
- **Choice:** Accept the narrow peace.
- **Choice:** Pay for full confirmation. ({money:12})
- **Resolved log:** Bought confirmation of the household’s common rights.
- **Choice:** Pull the stakes down after dark.
- **Outcome prose:** By dawn no stake stands and no witness remembers a face. Use becomes custom once more.
- **Outcome prose:** {officer}’s men are waiting among the trees.
- **Choice:** Pay the amercement. ({money:8})
- **Choice:** Take the punishment for everyone.
- **Choice:** Endure the judgment and remember.
- **Choice:** Take {officer}’s purse and office.
- **Resolved log:** Profited from the closing of the common.
- **Choice:** Confess, and expose what {officer} paid for.

## The Sentence of Forfeiture (`attainder_sentence`)

Source: `data/events_noble.js`

- **Choice:** Yield the fief and beg mercy.
- **Resolved log:** Fief attainted and yielded to the liege.
- **Choice:** Resist with steel.
- **Resolved log:** Answered attainder with rebellion.

## The Realm Rises (`df_revolt`)

Source: `data/events_noble.js`

- **Choice:** Fight for your seat.
- **Outcome prose:** You defeat the uprising and retain your lands.
- **Resolved log:** Crushed the great rising of the commons.
- **Outcome prose:** The uprising defeats your host, and you flee without your lands or title.
- **Resolved log:** Cast down by a rising of the commons.
- **Choice:** Abdicate and slip away.
- **Resolved log:** Fled a rising of the commons.
- **Choice:** Beg your liege’s aid. ({money:20})
- **Resolved log:** The liege’s host put down the rising — at a price.

## The Usurper’s Banners (`df_usurp`)

Source: `data/events_noble.js`

- **Choice:** Meet them in the field.
- **Outcome prose:** You defeat the pretender and secure your rule.
- **Resolved log:** Destroyed a pretender in open war.
- **Outcome prose:** Your army abandons you, and the rival claimant takes your lands and title.
- **Resolved log:** Overthrown by a rival claimant.
- **Choice:** Yield and beg terms.
- **Resolved log:** Yielded everything to a rival claimant.

## The Knife (`df_knife`)

Source: `data/events_noble.js`

- **Choice:** Fight for your life.
- **Outcome prose:** You survive the conspiracy wounded, but keep your lands and title.
- **Resolved log:** Survived the great conspiracy.
- **Outcome prose:** You survive the attack, but your enemies seize your lands and title.
- **Resolved log:** Left for dead; the house was cast down in the night.
- **Choice:** Beg sanctuary of the {temple}.
- **Resolved log:** Fled into sanctuary; the lands were seized behind you.

## The Manor Forfeit (`manor_forfeit`)

Source: `data/events_common.js`

- **Choice:** Surrender the manor.
- **Resolved log:** Surrendered the manor for debt.
- **Choice:** Flee beyond the court’s reach.
- **Resolved log:** Fled a final debt judgment.

## Bound to the Land (`bondage_sentence`)

Source: `data/events_common.js`

- **Choice:** Bend your neck to the land.
- **Resolved log:** Bound to the land for debt.
- **Choice:** Flee in the night.
- **Resolved log:** Fled a debt-bondage sentence.

## Labor for the Debt (`debt_labor_sentence`)

Source: `data/events_common.js`

- **Choice:** Accept the extra labor.
- **Resolved log:** Worked off a debt in the lord’s fields.
- **Choice:** Flee in the night.
- **Resolved log:** Fled rather than labor for a debt.

## historic_raid_captive (`historic_raid_captive`)

Source: `data/events_world.js`

- **Choice:** Submit to the rope and keep the household alive.
- **Resolved log:** Was carried away in a raid and bound to the land.
- **Choice:** Run when the column crosses broken ground.
- **Outcome prose:** You wrench free in the confusion. The guards take what falls from you, but darkness and rough ground hide the living.
- **Resolved log:** Escaped a captive column after losing household wealth.
- **Outcome prose:** The guard catches you before the slope ends. The blow is deliberate, final, and meant as a lesson to every captive still standing.
- **Resolved log:** Died attempting to escape a raiding column.

## The Lord’s Bargain (`devastation_protection`)

Source: `data/events_world.js`

- **Choice:** Commend the family to the lord.
- **Resolved log:** Commended the family to the lord for protection.
- **Choice:** Stay free and exposed.
- **Resolved log:** Refused the lord’s protection.

## Envoys Under a White Flag (`war_tribute_offer`)

Source: `data/events_war.js`

- **Choice:** Take the tribute.
- **Resolved log:** Took the enemy’s tribute and ended the war.
- **Choice:** Press on for {target}.
- **Resolved log:** Refused tribute; the war goes on.

## Terms From the Victor’s Seat (`war_submission_offer`)

Source: `data/events_war.js`

- **Choice:** Bend the knee.
- **Resolved log:** Swore the oaths to end a losing war.
- **Choice:** Buy the peace with heavy tribute.
- **Resolved log:** Bought off a conqueror.
- **Choice:** Fight on.
- **Resolved log:** Refused the enemy’s terms; the war goes on.

## A Road Out of the War (`war_negotiated_withdrawal`)

Source: `data/events_war.js`

- **Choice:** Negotiate the withdrawal.
- **Choice:** Use the talks to rest the host.
- **Choice:** Break off the talks.

## The Captor’s Price (`prison_ransom`)

Source: `data/events_war.js`

- **Choice:** Pay the ransom.
- **Resolved log:** Paid a war ransom.
- **Choice:** Offer land instead.
- **Resolved log:** Ceded a county as ransom.
- **Choice:** Rot a while.
- **Resolved log:** Endured captivity.

## A Ransom from the Shadows (`intrigue_captive_ransom`)

Source: `data/events_intrigue.js`

- **Choice:** Pay the ransom. ({money:ransom})
- **Choice:** Refuse.

## Called to Answer (`intrigue_hearing`)

Source: `data/events_intrigue.js`

- **Choice:** Challenge the proof.
- **Choice:** Offer compensation.
- **Choice:** Accept religious penance.
- **Choice:** Submit to sentence.
- **Choice:** Flee before judgment.
- **Choice:** Resist with force.

## The Question Is Asked (`proposal_made`)

Source: `data/events_common.js`

- **Choice:** Await the answer.
- **Outcome prose:** It is agreed! Before {holy} and kin, you are wed to {suitor}.
- **Resolved log:** Married {spouse}.
- **Outcome prose:** The family refuses — politely, but firmly. Perhaps with more standing, or more silver…

## Vows Against the World (`sibling_proposal_made`)

Source: `data/events_common.js`

- **Choice:** Ask for the vows.
- **Outcome prose:** {suitor} accepts. Whatever the world calls it, the two of you will make a household.
- **Outcome prose:** At the final threshold, {suitor} refuses. The courtship is over and will never be renewed.

## A Word That Cannot Be Recalled (`sibling_courtship_approach`)

Source: `data/events_common.js`

- **Choice:** Speak plainly.
- **Choice:** Keep silence.

## A Proposal From {rname} (`ruler_marriage_offer`)

Source: `data/events_agency.js`

- **Choice:** Accept the match.
- **Choice:** Decline with courtesy.

## After the Field (`polly_reunion`)

Source: `data/events_peasant.js`

- **Choice:** Take his hand — you did not cross a war to lose him now.
- **Resolved log:** Wed the soldier she followed to war.
- **Choice:** “I crossed a war to find you — and found I like myself better.”
- **Resolved log:** Spurned her sweetheart and marched home her own woman.
- **Choice:** Pull the helm back on and slip away a stranger.
- **Resolved log:** Vanished from the field a stranger, and went home to her own life.

## A Flaw in the Vows (`annulment_plea`)

Source: `data/events_common.js`

- **Choice:** Press the plea.
- **Outcome prose:** The judgment comes down: null and void from the first day. {spouse} returns to their kin, and you stand free before {god}.
- **Resolved log:** The church annulled the marriage.
- **Outcome prose:** The church finds the marriage sound — and your motives less so. The plea is refused; the donation is kept, and {spouse} learns what you tried.
- **Choice:** Withdraw the plea.
- **Resolved log:** Thought better of an annulment plea.

## A Child Burns With Fever (`child_fever`)

Source: `data/events_common.js`

- **Choice:** Pay for a physician.
- **Outcome prose:** The fever breaks. The child will live.
- **Outcome prose:** Coin could not buy what {god} would not give. The child is gone.
- **Choice:** Pray through the night.
- **Outcome prose:** By dawn the fever breaks. A small miracle.
- **Outcome prose:** By dawn the little body is still. You dig a small grave.
- **Choice:** Call the wise woman.
- **Outcome prose:** Her simples do their work. The fever breaks; the child will live.
- **Outcome prose:** Herbs and charms were not enough. The child is gone.
- **Choice:** Summon a renowned physician.
- **Outcome prose:** The great physician doses, bleeds, and waits — and the fever breaks. The child will live.
- **Outcome prose:** Even the great physician bows his head. The child is gone.

## A Word With the Liege (`title_request`)

Source: `data/events_noble.js`

- **Choice:** Make your case.
- **Outcome prose:** Your liege grants you new lands in return for your payment.
- **Resolved log:** Won new lands from the liege.
- **Outcome prose:** Your liege refuses to grant you more land.

## A Suit Against a Neighbor (`county_petition`)

Source: `data/events_noble.js`

- **Choice:** Press the suit.
- **Outcome prose:** Your liege grants you the fief of {cname}.
- **Resolved log:** Won a neighbor’s fief by petition.
- **Outcome prose:** Your liege refuses your claim to {cname}.

## Blood of the House (`house_claim`)

Source: `data/events_common.js`

- **Choice:** Press {childname}’s claim.
- **Outcome prose:** The house recognizes {childname}’s inheritance, placing it in your household’s care.
- **Resolved log:** {childname} was acknowledged by the house of {late}.
- **Outcome prose:** The house rejects {childname}’s claim and offers only a small payment.
- **Resolved log:** The house of {late} shut its doors on {childname}.
- **Choice:** Sell the claim back to them.
- **Resolved log:** Sold {childname}’s claim on the house of {late}.
- **Choice:** Let the claim sleep. The child needs no feud.
- **Resolved log:** Let {childname}’s claim on the house of {late} rest.

## A Banner Won in Blood (`military_barony_victory`)

Source: `data/events_war.js`

- **Choice:** Kneel, and rise a baron.
- **Resolved log:** Won a barony by leading the ruler’s host to victory.
- **Choice:** Ask for the victor’s purse instead.
- **Resolved log:** Refused a battlefield barony for the victor’s purse.
- **Choice:** Decline the reward.

## A Mitre Within Reach (`bishops_mitre`)

Source: `data/events_paths.js`

- **Choice:** Buy the office. ({money:200})
- **Resolved log:** Bought the bishop’s mitre.
- **Choice:** Expose the intermediary.
- **Choice:** Refuse and say nothing.

## Whispers of a Crown (`independence_offer`)

Source: `data/events_noble.js`

- **Choice:** Declare independence!
- **Resolved log:** Declared independence!
- **Choice:** Report the plotters to the liege.
- **Choice:** Say nothing. Remember everything.

## Revocation of a Fief (`vassal_revoke`)

Source: `data/events_noble.js`

- **Choice:** Demand the surrender of the fief.
- **Outcome prose:** He bows stiffly and yields. The court notes your firmness — and his restraint.
- **Outcome prose:** “Come and take it,” he answers, and rides home to raise his spears.
- **Choice:** Think better of it.

## A Vassal Renounces You (`vassal_revolt`)

Source: `data/events_noble.js`

- **Choice:** Let him go in peace.
- **Choice:** Answer rebellion with iron.

## The Charter of Liberties (`council_charter`)

Source: `data/events_council.js`

- **Choice:** Seal the charter.
- **Resolved log:** Sealed a charter of liberties for the great council.
- **Choice:** Tear it up before their faces.
- **Outcome prose:** The council submits, and you retain your authority without a charter.
- **Outcome prose:** Your refusal drives a councillor into armed rebellion.

## A Demand for {privilege} (`collective_privilege_demand`)

Source: `data/events_politics.js`

- **Choice:** Grant {privilege}.
- **Resolved log:** Granted a collective demand for {privilege}.
- **Choice:** Negotiate the terms. ({money:20})
- **Outcome prose:** Both sides accept a settlement granting the demanded privilege.
- **Outcome prose:** Negotiations fail, leaving the delegates divided and angry.
- **Choice:** Refuse the demand.
- **Resolved log:** Refused a collective demand for {privilege}.

## The Liege Demands an Aid (`parliament_aid_hike`)

Source: `data/events_parliament.js`

- **Choice:** Rise and consent at once.
- **Choice:** Put it to the estates.
- **Outcome prose:** The estates reject the increased aid, and your liege resents your opposition.
- **Outcome prose:** The estates approve the increased aid, raising your payments to the liege.
- **Choice:** Refuse to your feet, alone if need be.

## serf_tenure_review (`serf_tenure_review`)

Source: `data/events_peasant.js`

- **Choice:** Accept the proposed term.
- **Choice:** Bring the witness or record.
- **Choice:** Pay to have the old terms entered. ({money:4})
- **Choice:** Leave the old dispute closed.

## The Claim of Legend (`artifact_trial`)

Source: `data/events_artifacts.js`

- **Choice:** Make the proper offering. ({money:artifactprice})
- **Choice:** Take it by strength and daring.
- **Outcome prose:** Steel, nerve, and a long moment where the world holds its breath — then the legend is in your hand.
- **Outcome prose:** It goes wrong badly and fast. You escape with your life, and little else of yours intact.
- **Choice:** Prove your devotion. (25 piety)
- **Choice:** Walk away.

## Covetous Eyes (`artifact_coveted`)

Source: `data/events_artifacts.js`

- **Choice:** Yield it with ceremony.
- **Choice:** Refuse — it is yours by right.
- **Outcome prose:** They swallow the insult and ride home. For now, the legend stays.
- **Outcome prose:** Agents in the night, a bribed guard, a reliquary found empty at dawn. The legend has a new keeper.

## Out of the Earth (`artifact_found`)

Source: `data/events_common.js`

- **Choice:** Keep it.
- **Choice:** Give it to the {temple}.
- **Choice:** Sell it quietly.

## The Guild Bench (`guild_entry`)

Source: `data/events_paths.js`

- **Choice:** Pay the entry fee. ({money:15})
- **Resolved log:** Joined the craft guild.
- **Choice:** Work outside the guild.

## A Voice in the Town (`town_elder`)

Source: `data/events_paths.js`

- **Choice:** Stand for the council.
- **Outcome prose:** They raise you to the council bench. Small power, but power.
- **Resolved log:** Elected to the town council.
- **Outcome prose:** An older name edges you out. Next time.
- **Choice:** Trade needs no title.

## Stripes of a Sort (`sergeant`)

Source: `data/events_paths.js`

- **Choice:** Take the post.
- **Resolved log:** Promoted to sergeant.
- **Choice:** Responsibility is a slower way to die.

## From Bench to Ledger (`become_merchant`)

Source: `data/events_paths.js`

- **Choice:** Take up the merchant’s life.
- **Resolved log:** Became a merchant.
- **Choice:** Stay true to the craft.

## The Open Door (`diplomacy_warm_opening`)

Source: `data/events_world.js`

- **Choice:** Propose a two-year peace pact. ({money:10})
- **Outcome prose:** The gifts are received and the oaths exchanged.
- **Outcome prose:** The court receives the gifts but avoids the oath.
- **Choice:** Propose a defensive alliance. ({money:25})
- **Outcome prose:** The crowns pledge mutual defense until either ruler changes.
- **Outcome prose:** Warm words stop short of a military oath.
- **Choice:** Ask only for another exchange of envoys.

## The Pact’s Wax Cools (`diplomacy_pact_renewal`)

Source: `data/events_world.js`

- **Choice:** Renew for another year. ({money:8})
- **Choice:** Keep the present term and promise nothing.
- **Choice:** Let the pact lapse now.

## Two Crowns, One Harbor (`diplomacy_alliance_concession`)

Source: `data/events_world.js`

- **Choice:** Grant the privilege.
- **Choice:** Offer equal treatment, not privilege.
- **Outcome prose:** Both merchant benches accept the equal charter.
- **Outcome prose:** Each side hears only what it was denied.
- **Choice:** End the alliance before it buys your law.

## The Compact After the Funeral (`diplomacy_succession_compact`)

Source: `data/events_world.js`

- **Choice:** Offer a fresh two-year peace pact. ({money:10})
- **Choice:** Renew the surviving pact. ({money:8})
- **Choice:** Send condolences and no compact.

## The New Faith (`conversion_pressure`)

Source: `data/events_world.js`

- **Choice:** Take their baptism.
- **Resolved log:** Converted to the local faith.
- **Choice:** Keep the old ways.

## A Petition for Absolution (`papal_absolution_petition`)

Source: `data/events_world.js`

- **Choice:** Grant absolution.
- **Choice:** Refuse the petition.

## A Writ of Distraint (`distraint_writ`)

Source: `data/events_common.js`

- **Choice:** Pay off the debt.
- **Resolved log:** Paid off a called debt.
- **Choice:** Yield goods toward the debt.
- **Resolved log:** Yielded goods toward a called debt.
- **Choice:** Stall them.

## The Bailiffs Come (`distraint_seizure`)

Source: `data/events_common.js`

- **Choice:** Open the doors.
- **Resolved log:** Distrained for debt.
- **Choice:** Pay them off on the doorstep.
- **Resolved log:** Paid off a called debt on the doorstep.
- **Choice:** Bar the door and dare the writ.
- **Outcome prose:** Shouting, shoving, a slammed door — and they withdraw, vowing to return. You have won a season, no more.
- **Outcome prose:** The door gives. So does your lip. They take what the writ allows, and a little dignity besides.

## Fire on the Home Road (`devastation_raiders`)

Source: `data/events_world.js`

- **Choice:** Cart the goods into the woods. ({money:10})
- **Resolved log:** Hid the household goods from raiders.
- **Choice:** Trust to luck and locked doors.
- **Outcome prose:** They pass down the valley — close enough to smell the smoke, not close enough to stop. This time.
- **Outcome prose:** They do not pass. What cannot be carried is burned; what cannot be burned is broken.

## What the House Owes (`widow_settlement`)

Source: `data/events_common.js`

- **Choice:** Take what is owed, with dignity.
- **Resolved log:** Received a settlement from the house of {late}.
- **Choice:** Press for the full portion.
- **Outcome prose:** Grumbling, they pay it out — the full portion, as the old custom names it.
- **Resolved log:** Pressed the house of {late} for the full portion.
- **Outcome prose:** Papers are produced; clerks smile thinly. You leave with hard words and an empty purse.
- **Choice:** Want nothing of theirs.
- **Resolved log:** Refused the silver of the house of {late}.

## A Monopoly Petition (`guild_monopoly_petition`)

Source: `data/events_paths.js`

- **Choice:** Pay {money:25} for the seal.
- **Choice:** Persuade the grantor.
- **Outcome prose:** Your case carries the hall. {grantor} orders the charter sealed.
- **Outcome prose:** The court is unmoved, and {grantor} takes the pressure as an insult.
- **Choice:** Withdraw the petition.

## The Venture’s Reckoning (`travel_capstone_trade`)

Source: `data/events_travel.js`

- **Choice:** Take the cautious return.
- **Resolved log:** Closed a cautious venture in {destination}.
- **Choice:** Press the great bargain.
- **Outcome prose:** Every weight, promise, and delivery falls into place. The venture returns handsomely.
- **Resolved log:** Won a rich bargain in {destination}.
- **Outcome prose:** A hidden fee and a spoiled consignment consume nearly all the stake.
- **Resolved log:** The venture in {destination} barely returned a coin.

## At the Holy Place (`travel_capstone_pilgrimage`)

Source: `data/events_travel.js`

- **Choice:** Complete the pilgrimage.
- **Resolved log:** Completed a pilgrimage to {destination}.

## The Contract Is Served (`travel_merc_contract_complete`)

Source: `data/events_lifepaths.js`

- **Choice:** Collect the purse and take the road home.
- **Resolved log:** Served out a full mercenary contract with {rname}.
- **Choice:** Renew for another term.
- **Resolved log:** Renewed the mercenary contract with {rname}.
- **Choice:** Remain at court as a retainer.
- **Resolved log:** Ended the contract with {rname} and remained at {destination}.

## A Lifetime of Remedies (`physician_book_of_remedies`)

Source: `data/events_lifepaths.js`

- **Choice:** Set down the Book of Remedies.
- **Resolved log:** Compiled a Book of Remedies.
- **Choice:** Keep it in your head.

## The Completed Tables (`astronomer_star_tables`)

Source: `data/events_lifepaths.js`

- **Choice:** Bind the Star Tables.
- **Resolved log:** Completed the Star Tables.
- **Choice:** Not yet — keep observing.

## A Commission for a Work (`author_commission`)

Source: `data/events_lifepaths.js`

- **Choice:** Accept the commission.
- **Outcome prose:** You complete the commissioned work, earn your fee, and keep a copy for your family.
- **Resolved log:** Completed a commissioned work.
- **Outcome prose:** You miss the deadline and receive only a quarter of the agreed fee.
- **Choice:** Decline politely.

## Foreign Soil (`travel_capstone_expedition`)

Source: `data/events_lifepaths.js`

- **Choice:** Record everything: coasts, customs, tongues.
- **Resolved log:** Charted the ways of {destination}.
- **Choice:** Turn the novelties to profit.
- **Resolved log:** Traded on foreign novelties in {destination}.

## An Invitation to the Lists (`tournament_invitation`)

Source: `data/events_tournament.js`

- **Choice:** Ride in the joust. ({money:10} for harness and heralds)
- **Outcome prose:** You win the joust and receive the champion’s purse from {lord}.
- **Resolved log:** Won the joust at a tourney.
- **Outcome prose:** You are unhorsed and injured; your opponent wins the joust.
- **Choice:** Fight in the melee.
- **Outcome prose:** You win the melee and earn the captains’ respect.
- **Outcome prose:** An injury ends your melee; the surgeon tends your wounds. The surgeon calls the bruises instructive.
- **Choice:** Wager {money:5} on the champion.
- **Outcome prose:** Your chosen champion wins, and your wager pays out.
- **Outcome prose:** Your chosen champion loses, and so does your wager. The stands find it hilarious.
- **Choice:** Make a gift to the host’s stable. ({money:5})
- **Choice:** Watch from the stands as {lord}’s guest.
- **Choice:** Send your regrets.

## A Great Tourney (`tournament_invitation_lord`)

Source: `data/events_tournament.js`

- **Choice:** Enter the joust. ({money:25} in harness and herald’s fees)
- **Outcome prose:** You win the great joust, and {lord} names you champion.
- **Resolved log:** Carried the lists at a great tourney.
- **Outcome prose:** You lose the great joust and leave the lists injured.
- **Choice:** Ride in the melee.
- **Outcome prose:** Your riders win the melee and earn the captains’ respect.
- **Outcome prose:** Your riders lose the melee; you recover your battered equipment.
- **Choice:** Wager {money:20} on the champion.
- **Outcome prose:** Your chosen champion wins, and your wager pays out.
- **Outcome prose:** Your chosen champion loses, and so does your wager.
- **Choice:** Patronize a promising rider. ({money:20})
- **Choice:** Grace the stands and the feast.
- **Choice:** Send your regrets.

## Whose Mark Is It? (`bench_mark`)

Source: `data/events_peasant.js`

- **Choice:** Finish it beneath the master’s mark.
- **Outcome prose:** The patron pays, and the masters praise a loyalty that did not cheapen the craft.
- **Outcome prose:** The work is accepted at half price. Loyalty cannot plane a warped board.
- **Choice:** Put your own mark upon it.
- **Outcome prose:** The piece bears your name, and buyers begin asking after it.
- **Outcome prose:** The masters call it presumption and make certain the market hears.
- **Choice:** Defend the widow’s right to finish the trade.
- **Outcome prose:** The bench remains hers, and your advance returns with grateful thanks.
- **Outcome prose:** The masters close ranks. Your silver bought only a little time.
- **Choice:** Let the gift stand without argument.
- **Choice:** Use the ledger to demand the true price.
- **Outcome prose:** Faced with his own seal and figures, the patron pays what he owes.
- **Outcome prose:** He calls the figures a dead man’s fraud and your demand extortion.
- **Choice:** Take the tools you bought.
- **Resolved log:** Bought a dead master’s tools and obligations.
- **Choice:** Sell the duplicate tools.

## The Claimant’s Challenge (`testament_challenge`)

Source: `data/events_peasant.js`

- **Choice:** Recite the words exactly.
- **Outcome prose:** Question follows question; the wording never changes. The testament stands.
- **Outcome prose:** One phrase slips. The claimant drives a wedge into the uncertainty.
- **Choice:** Bring every witness forward.
- **Outcome prose:** Too many honest voices agree for the claimant to overcome them.
- **Outcome prose:** Under pressure, the witnesses remember different gifts.
- **Choice:** Break the seal and read the inventory.
- **Outcome prose:** Nothing is missing and every mark is witnessed. The division proceeds.
- **Outcome prose:** One seal is damaged. Suspicion swallows the rest of the evidence.
- **Choice:** Admit the proof is uncertain and refer it upward.
- **Choice:** Admit the witnesses are uncertain and refer it upward.
- **Choice:** Admit the inventory is uncertain and refer it upward.
- **Choice:** Sell the testimony as promised.
- **Outcome prose:** Your chosen version becomes the court’s version. The claimant pays well.
- **Outcome prose:** Another witness names the bargain aloud. The court turns on you.
- **Choice:** Repent and tell the court about the bribe.

## Delayed and custom milestone messages

- `news.freedom.purchase`: 📜 {protagonist} bought lawful freedom from {lord} at {home} for {money:price}.
- `news.freedom.manumission`: 📜 {protagonist} accepted lawful freedom from {lord} at {home} for {money:price}.
- `news.freedom.manumission_service`: 📜 {protagonist} completed {days} days of final service and received lawful freedom from {lord} at {home} for {money:price}.
- `news.freedom.old_custom`: 📜 {protagonist} won lawful freedom from {lord} at {home} under the Old Custom.
- `news.freedom.flight`: 🏃 {protagonist} fled serfdom from {home}; no lawful charter was granted.
- `news.freedom.family_manumission`: 📜 {name} receives lawful freedom for {money:price}.
- `news.freedom.service_accepted`: Freedom agreement accepted. {days} days of final service remain before the household becomes free.
- `news.war.conquest`: 🏰 {province} is yours by conquest!
- `news.war.crown_restored`: 👑 The usurper’s crown and vassals return intact to your rightful rule.
- `news.war.tribute_without_prize`: 🕊 The prize has slipped away, but tribute is paid. The war ends in your favor.
- `news.war.province_lost`: 🏚 {province} is torn from your grasp.
- `news.war.landless`: ⬇ Landless once more. The banners are folded away.
- `news.war.reparations`: 🕊 A humiliating peace. Reparations drain your coffers.
- `news.war.captured`: ⛓ Taken in the rout! You are a prisoner of {enemy}.
- `news.war.tribute`: 🕊 Bled white in the field, the enemy buys peace with tribute.
- `news.war.submission`: 🛡 You kneel to {enemy} and swear the oaths. The war is over; your lands remain — under a new banner.
- `news.war.submission_tribute`: 🕊 A conqueror’s tribute buys the peace — {money:price} to {enemy}.
- `news.war.negotiated_withdrawal`: 🕊 Safe conduct is agreed; the surviving host withdraws and the war ends.
- `news.war.prison_released`: 🕊 The peace opens your cell — you come home thinner, but free.
- `news.war.prison_escaped`: ⛓ A bribed gaoler, a moonless night, a swift horse — you are free of {enemy}.
- `news.war.prison_ransomed`: ⛓ The ransom is counted out — you ride home poorer, and free.
- `news.war.prison_ceded`: ⛓ {province} signs the ransom roll — you ride home a county poorer, and free.
- `news.world.title_lapsed`: ⬇ The style of {title} rings hollow — the world now names you one rung lower.
- `news.world.cast_down`: ⬇ Cast down. The family keeps its coffers and its name — but not an acre.
- `news.religion.bishop_refused`: ⛪ The appointment of {name} is refused; another petition may be made in two years.
- `news.religion.bishop_appointed`: ⛪ {name} is invested as Bishop of {province}.
- `news.travel.frontier_settled`: 🛖 The household raises a permanent homestead in {province}, on land answerable to the lord of {gateway}.

Other events also receive the shared screen when their resolved effects change rank, land, death, faith, home, or marriage, and eligible plot finales can qualify. Their selected outcome or custom Chronicle message is used verbatim; numeric impact chips are generated from actual changes. Existing dedicated investiture, battle, birth, death/succession, and Estates screens remain separate.


## Additional message variants

- Peace bought: "Peace is bought from {enemy} for {money:cost}." / "Peace is bought from the enemy for {money:cost}."
- War concluded: "The war with {enemy} ends in victory." / "The war with {enemy} ends in defeat." / "The war with {enemy} ends on favorable terms." / "The war with {enemy} ends on unfavorable terms." / "The war with {enemy} ends in peace."
- Investment: "The household's venture to {destination} is lost with every coin invested." / "The venture to {destination} limps home with {money:payout}." / "The venture to {destination} returns {money:payout}." / "The venture to {destination} returns a remarkable {money:payout}." / "The household's venture to {destination} is resolved."
- Return cargo: "The return cargo of {good} suffered spoilage and loss on the road home; {money:payout} is salvaged at {home}." / "Returned safely to {home} and sold the return cargo of {good} for {money:payout}." / "The return cargo of {good} found a hungry market in {home}, returning {money:payout}." / "The return cargo of {good} is sold at {home} for {money:payout}."

## Custom social and diplomatic messages

- `news.diplomacy.pact_made`: 🕊 {realm} swears a two-year pact of peace.
- `news.diplomacy.pact_extended`: 🕊 The pact with {realm} is renewed for another year.
- `news.diplomacy.pact_ended`: 🕊 The pact with {realm} is allowed to lapse.
- `news.diplomacy.alliance_formed`: 🤝 Your crown and {realm} enter a defensive alliance.
- `news.diplomacy.alliance_ended`: 🤝 The defensive alliance with {realm} is ended.
- `news.agency.royal_match_refused`: ðŸ“œ The court of {realm} refuses the proposed match between {student} and {partner}.
- `news.agency.royal_match_accepted`: ðŸ¤ {realm} accepts the match between {student} and {partner}.
- `news.serf.tenure_review_amended`: The household custom at {province} is amended under the current authority.
- `news.serf.tenure_review_confirmed`: The household custom at {province} is confirmed without changing its terms.
- `news.social.sibling_courtship_accepted`: 🕯 {name} answers yes. The dangerous courtship begins.
- `news.social.sibling_courtship_refused`: 🚪 {name} refuses the forbidden approach, once and for all.
- `news.event.vassal_released`: 🕊 {realm} goes its own way, released from your fealty.
- `news.intrigue.ransom_paid`: ⛓ The ransom is paid and the captive returns home.
- `news.papacy.absolution`: 🕊 {pope} grants absolution to {target}; the sentence is lifted.
- `news.papacy.absolution_refused`: ⛓ {pope} refuses absolution to {target}; the sentence remains.
