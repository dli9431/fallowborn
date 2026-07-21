/* =========================================================================
   Fallowborn — RULERSHIP EVENTS (tier 3+: barons, counts, dukes, kings)
   ========================================================================= */
window.FBDATA = window.FBDATA || {};
FBDATA.events = FBDATA.events || [];

FBDATA.events.push(

{ id:'hold_court_event', title:'Petitioners at the Gate', trigger:{ never:true },
  text:'Court day. Two farmers claim one cow; a widow begs relief of taxes; a merchant accuses your reeve of taking bribes.',
  options:[
    { label:'Judge with care and patience.', effects:{ prestige:5, skills:{dip:1}, popularOpinion:5 } },
    { label:'Judge swiftly and harshly.', effects:{ prestige:3, skills:{int:1}, popularOpinion:-5 } },
    { label:'Let the reeve sort it out.', effects:{ popularOpinion:-3, gold:2 } }
  ]},
{ id:'peasant_revolt', title:'The Commons Rise',
  trigger:{ tierMin:3, popularOpinionBelow:-30, chance:0.3 }, weight:12, cooldown:8,
  text:'Torches in the night. Your taxmen beaten, your granary seized — the peasants of {province} have risen, led by a man they call the Ploughman King.',
  options:[
    { label:'Crush them with steel.', chance:'battle',
      success:{ text:'The revolt breaks against your armed men. The Ploughman King hangs at the crossroads.', effects:{ prestige:8, popularOpinion:-10, log:'Crushed a peasant revolt.' } },
      failure:{ text:'Pitchforks in the dark defeat proud steel. You flee your own lands for a season, humiliated.', effects:{ prestige:-20, gold:-20, health:-1 } } },
    { label:'Hear their grievances.', chance:0.6,
      success:{ text:'You remit the worst taxes; the crowd disperses, grudging but calm. Wise lords bend.', effects:{ gold:-10, popularOpinion:25, prestige:3, log:'Settled a revolt with mercy.' } },
      failure:{ text:'They take patience for weakness and demand more, emboldened.', effects:{ gold:-15, popularOpinion:5, prestige:-8 } } }
  ]},
{ id:'vassal_demand', title:'A Baron Grows Bold',
  trigger:{ tierMin:4, chance:0.2 }, weight:8, cooldown:10,
  text:'One of your sworn men arrives with too many retainers and too few courtesies, demanding lower dues and a seat at your right hand.',
  options:[
    { label:'Grant a little, graciously.', effects:{ gold:-5, prestige:2 } },
    { label:'Refuse him flatly.', chance:0.6,
      success:{ text:'He blusters, bows, and yields. The hall takes note.', effects:{ prestige:8 } },
      failure:{ text:'He storms out. Soon his men raid your borderlands.', effects:{ gold:-12, prestige:-4 } } },
    { label:'Refuse — and humiliate him.', chance:0.4,
      success:{ text:'Broken before the court, he will never trouble you again.', effects:{ prestige:12, skills:{int:1} } },
      failure:{ text:'You make an enemy for life, and other vassals mutter.', effects:{ prestige:-6, popularOpinion:-5 } } }
  ]},
{ id:'court_feast', title:'A Feast to Remember', trigger:{ never:true },
  text:{ default:'Your hall blazes with candles. Neighbors, vassals, and rivals eat your meat and drink your mead — and measure you all the while.',
    muslim:'Your hall blazes with lamps. Neighbors, vassals, and rivals eat your meat and drink your chilled sherbet — and measure you all the while.' },
  options:[
    { label:'Spare no expense.', effects:{ gold:-15, prestige:20, popularOpinion:10 } },
    { label:'Generous but shrewd.', effects:{ gold:-8, prestige:10, popularOpinion:5 } },
    { label:'Water the wine.', require:{ religionGroups:['christian','pagan','jewish'] }, chance:0.5,
      success:{ text:'No one notices. Profitably done.', effects:{ gold:-3, prestige:6 } },
      failure:{ text:'Everyone notices. “The Watered Cup,” they toast, snickering.', effects:{ gold:-3, prestige:-8 } } },
    { label:'Thin the sherbet.', require:{ religionGroups:['muslim'] }, chance:0.5,
      success:{ text:'No one notices. Profitably done.', effects:{ gold:-3, prestige:6 } },
      failure:{ text:'Everyone notices. “The Watered Cup,” they murmur, snickering.', effects:{ gold:-3, prestige:-8 } } }
  ]},
{ id:'assassin_night', title:'A Step on the Stair',
  trigger:{ tierMin:3, chance:0.06 }, weight:5, cooldown:16,
  text:'You wake to a floorboard’s groan. A shadow crosses your chamber — and moonlight finds the knife.',
  options:[
    { label:'Fight for your life.', chance:'battle',
      success:{ text:'You wrestle the blade away and pin the assassin, roaring for guards.', effects:{ prestige:10, queue:'assassin_caught', log:'Survived an assassin!' } },
      failure:{ text:'Steel bites before help comes. You survive — barely.', effects:{ health:-4, addTrait:'scarred', log:'Wounded by an assassin.' } } },
    { label:'Roll away and shout for the guard.', chance:0.7,
      success:{ text:'Guards burst in; the assassin dives through the window into the night.', effects:{ } },
      failure:{ text:'The knife finds you as you scramble.', effects:{ health:-3 } } }
  ]},
{ id:'assassin_caught', title:'The Question', trigger:{ never:true },
  text:'The assassin hangs in your dungeon. Under hard questioning, a name is finally spat out — a rival hand paid for your death.',
  options:[
    { label:'Justice, publicly.', effects:{ prestige:8, opinion:{role:'rival', amt:-30} } },
    { label:'Turn the blade back on its buyer.', effects:{ skills:{int:2}, killRole:'rival', prestige:-5, log:'Repaid an assassin in kind.' } },
    { label:'Mercy — and a message.', effects:{ piety:8, prestige:4 } }
  ]},
{ id:'build_opportunity', title:'The Master Builder',
  trigger:{ tierMin:3, chance:0.2, notFlags:['mason_visit'] }, weight:6, cooldown:12,
  text:{ default:'A wandering master mason, church-trained and road-worn, offers to oversee your works before moving on to richer courts.',
    muslim:'A wandering master mason, schooled on the great mosques and road-worn, offers to oversee your works before moving on to richer courts.' },
  options:[
    { label:'Engage him.', desc:'Your next building costs a quarter less.', effects:{ setFlag:'mason_visit', log:'A master mason directs the works.' } },
    { label:'Send him on his way.', effects:{ } }
  ]},
{ id:'wandering_scholar', title:'A Scholar Seeks Patronage',
  trigger:{ tierMin:3, chance:0.15 }, weight:5, cooldown:8,
  text:'A traveling scholar — threadbare, sharp-eyed, trailing manuscripts — asks leave to work beneath your roof for a season.',
  options:[
    { label:'Fund his work. (10 gold)', require:{ goldMin:10 }, effects:{ gold:-10, research:15, skills:{lea:1}, prestige:2 } },
    { label:'A meal and a bed for the night.', require:{ goldMin:1 }, effects:{ gold:-1, research:3 } },
    { label:'Turn him away.', effects:{ } }
  ]},
{ id:'famine_relief', title:'Empty Granaries',
  trigger:{ tierMin:3, seasons:[3], chance:0.12 }, weight:8, cooldown:12,
  text:'The harvest failed across {province}, and now the roads fill with hollow-eyed families drifting toward your keep.',
  options:[
    { label:'Open the granary reserves.', require:{ buildings:['granary'] },
      effects:{ popularOpinion:25, piety:10, prestige:10, log:'The granary fed {province} through the famine.' } },
    { label:'Buy grain to give out. (20 gold)', require:{ goldMin:20 },
      effects:{ gold:-20, popularOpinion:25, piety:10, prestige:10, log:'Fed the hungry in famine.' } },
    { label:'Sell grain at famine prices.', effects:{ gold:25, popularOpinion:-25, piety:-10 } },
    { label:'Guard the stores and wait.', effects:{ popularOpinion:-10 } }
  ]},
{ id:'church_relations', title:'The {holy} Comes Calling',
  trigger:{ tierMin:3, chance:0.15 }, weight:6, cooldown:10,
  text:'The local {holy} arrives in state, praising your piety at length — and, at greater length, the leaking roof of the great {temple}.',
  options:[
    { label:'Fund the roof handsomely.', require:{ goldMin:15 }, effects:{ gold:-15, piety:15, opinion:{role:'priest', amt:20} } },
    { label:'Promise prayers instead.', effects:{ piety:-2, opinion:{role:'priest', amt:-8} } }
  ]},
{ id:'heir_question', title:'The Succession',
  trigger:{ tierMin:3, minAge:45, hasChildren:true, chance:0.15 }, weight:5, once:true,
  text:'Your counselors raise it delicately: you will not live forever, and unsettled successions drown realms in blood.',
  options:[
    { label:'Name your heir plainly, now.', desc:'Choose who inherits, before witnesses.', effects:{ pickHeir:true, log:'Settled the succession.' } },
    { label:'Let them compete for it.', effects:{ skills:{int:1}, prestige:-3 } },
    { label:'“I do not intend to die.”', effects:{ prestige:2 } }
  ]},
{ id:'border_raid', title:'Smoke on the Border',
  trigger:{ tierMin:3, chance:0.15, atWar:false }, weight:8, cooldown:8,
  text:'Riders from over the border have burned two of your hamlets and driven off cattle. Your people look to you for an answer.',
  options:[
    { label:'Raid them back, twice as hard.', chance:'battle',
      success:{ text:'Your riders return laden, leaving mirrored smoke on their horizon.', effects:{ gold:12, prestige:10, popularOpinion:8, log:'Repaid a border raid.' } },
      failure:{ text:'An ambush awaits. You lose men and face.', effects:{ gold:-8, prestige:-8 } } },
    { label:'Fortify the border farms.', effects:{ gold:-10, popularOpinion:5 } },
    { label:'Swallow it — this time.', effects:{ prestige:-6, popularOpinion:-5 } }
  ]},
{ id:'liege_summons', title:'The Liege’s Banner Call',
  trigger:{ tierMin:3, tierMax:4, minAge:16, isVassal:true, liegeAtWar:true, notFlags:['with_liege_host'], chance:0.5 }, weight:12, cooldown:6,
  text:'A herald in your liege’s colors: war is declared, and your banner is called to muster with all your strength.',
  options:[
    { label:'Ride to the muster.', desc:'Join the liege’s host for the length of the war.',
      effects:{ setFlag:'with_liege_host', focusSet:'lead_host', opinionLiege:10, prestige:4, log:'Rode to the liege’s war.' } },
    { label:'Send gold in your stead.', require:{ goldMin:20 }, effects:{ gold:-20, opinionLiege:-5 } },
    { label:'Ignore the summons.', effects:{ opinionLiege:-30, prestige:-8 } }
  ]},
{ id:'title_request', title:'A Word With the Liege',
  trigger:{ never:true }, /* fired from action */
  text:'You stand before your liege’s seat and ask, with every courtesy, for greater lands and title.',
  options:[
    { label:'Make your case.', chance:'liege_grant',
      success:{ text:'The liege nods slowly. “It is earned.” New lands are added to your charge — and a rich gift to the liege’s chest seals the investiture.', effects:{ tierUp:1, prestige:25, opinionLiege:-15, gold:-50, log:'Granted a higher title by the liege!' } },
      failure:{ text:'“In time,” says the liege, meaning never. Courtiers hide their smiles.', effects:{ prestige:-5, opinionLiege:-8 } } }
  ]},
{ id:'spouse_council', title:'A Voice Behind the Throne',
  trigger:{ tierMin:3, married:true, chance:0.15 }, weight:5, cooldown:10,
  text:'{spouse} speaks quietly after the hall empties: a shrewd reading of your rivals, your coffers, and your next move.',
  options:[
    { label:'Heed the counsel.', effects:{ skills:{ste:1}, opinion:{role:'spouse', amt:10}, gold:4 } },
    { label:'Rule alone.', effects:{ opinion:{role:'spouse', amt:-10}, prestige:1 } }
  ]},
{ id:'independence_offer', title:'Whispers of a Crown',
  trigger:{ tierMin:3, tierMax:4, isVassal:true, prestigeMin:200, chance:0.1 }, weight:5, cooldown:20,
  text:'Discontented lords gather in your hall when the candles burn low. “Why kneel at all?” they murmur. “Your own banner. Your own crown.”',
  options:[
    { label:'Declare independence!', effects:{ declareIndependence:true, log:'Declared independence!' } },
    { label:'Report the plotters to the liege.', effects:{ opinionLiege:25, prestige:-5, popularOpinion:-8 } },
    { label:'Say nothing. Remember everything.', effects:{ skills:{int:1} } }
  ]},
/* ---- the liege chain: taxes, appeals, and life between count and crown ---- */
{ id:'liege_tax', title:'The Liege’s Aid',
  trigger:{ tierMin:4, isVassal:true, chance:0.2 }, weight:8, cooldown:8,
  text:'Collectors arrive from {liege} with tallies and wax: the lord calls an extraordinary aid upon all his vassals — your chest included.',
  options:[
    { label:'Pay without a murmur. (12 gold)', require:{ goldMin:12 }, effects:{ gold:-12, opinionLiege:8 } },
    { label:'Send a third, with apologies.', require:{ goldMin:4 }, effects:{ gold:-4, opinionLiege:-5 } },
    { label:'Refuse outright.', effects:{ opinionLiege:-20, prestige:-3 } }
  ]},
{ id:'liege_appeal', title:'An Appeal Above Your Liege', trigger:{ never:true },
  text:'You kneel before {rulername} of {rname} and lay out your suit: your own lord is unjust, you say, and you would serve a worthier hand — his.',
  options:[
    { label:'Press the appeal.', chance:'appeal_outcome',
      success:{ text:'The high lord strokes his beard. “No good sword should rust under a small master.” He takes your oath himself.', effects:{ custom:'appeal_win', prestige:8, log:'Won a higher lord’s favor.' } },
      failure:{ text:'“I do not poach another man’s vassals.” Worse — a letter about your visit rides back to your liege.', effects:{ custom:'appeal_lose' } } },
    { label:'Think better of it, and withdraw.', effects:{ } }
  ]},
/* ---- the player as liege ---- */
{ id:'vassal_petition', title:'A Vassal’s Suit',
  trigger:{ isLiege:true, chance:0.15 }, weight:6, cooldown:8,
  text:'One of your sworn men kneels at your gate: debts press him hard, and only your generosity stands between his family and ruin.',
  options:[
    { label:'Help him handsomely. (15 gold)', require:{ goldMin:15 }, effects:{ gold:-15, custom:'vassal_favor', prestige:3 } },
    { label:'Good words, empty hands.', effects:{ custom:'vassal_snub' } }
  ]},
{ id:'vassal_feud', title:'Knives Between Vassals',
  trigger:{ isLiege:true, chance:0.12 }, weight:5, cooldown:10,
  text:'Two of your sworn men feud over a boundary mill — each demands you judge for him, and each watches the other’s face at your board.',
  options:[
    { label:'Judge it yourself, fairly.', chance:0.6,
      success:{ text:'Your Solomonic ruling pleases both; they leave as uneasy friends.', effects:{ custom:'vassal_favor', prestige:4 } },
      failure:{ text:'Both hear favoritism in your words. Both leave sulking.', effects:{ custom:'vassal_snub' } } },
    { label:'Let them tire of it.', effects:{ prestige:-2 } }
  ]},
{ id:'vassal_tax_refusal', title:'The Empty Chest',
  trigger:{ isLiege:true, chance:0.12 }, weight:6, cooldown:8,
  text:'The season’s tallies come in — and one of your vassals has sent, instead of silver, a letter of excuses as long as your arm.',
  options:[
    { label:'Insist on payment, with interest.', effects:{ custom:'vassal_insist' } },
    { label:'Let it pass — this once.', effects:{ prestige:-2 } }
  ]},
{ id:'vassal_revoke', title:'Revocation of a Fief', trigger:{ never:true },
  text:'You summon {rulername} of {rname} and demand the fief back into your own hand. Such a demand is lawful — but law and gratitude are different things.',
  options:[
    { label:'Demand the surrender of the fief.', chance:'vassal_comply',
      success:{ text:'He bows stiffly and yields. The court notes your firmness — and his restraint.', effects:{ custom:'vassal_reclaim', prestige:5 } },
      failure:{ text:'“Come and take it,” he answers, and rides home to raise his spears.', effects:{ custom:'vassal_refuse' } } },
    { label:'Think better of it.', effects:{ } }
  ]},
{ id:'vassal_revolt', title:'A Vassal Renounces You', trigger:{ never:true },
  text:'{rulername} of {rname} sends back your oath-knot in pieces: he will pay no more, kneel no more. His spears are sharpening.',
  options:[
    { label:'Let him go in peace.', effects:{ custom:'vassal_release', prestige:-10 } },
    { label:'Answer rebellion with iron.', effects:{ custom:'vassal_crush' } }
  ]},
/* ---- the downfall chains: how great houses fall -------------------------
   Three slow cascades (the commons rise, a rival’s claim, the knife), each
   three flag-marked stages deep. Every stage offers a paid or skill escape;
   only sustained neglect or repeated bad luck reaches the final stage, whose
   failure calls FB.loseAllLand (df_fall / df_fall_flee) — the family keeps
   its gold, treasures, holdings and name, but not an acre. */
{ id:'df_murmurs', title:'Murmurs in the Villages',
  trigger:{ tierMin:4, popularOpinionBelow:-15, notFlags:['df_unrest'], chance:0.12 }, weight:6, cooldown:10,
  text:'The reeves report it carefully, eyes down: the villages are sullen, the tax carts need armed escorts, and an old song about kinder lords is sung again in the taverns of {province}.',
  options:[
    { label:'Feast and gift the worst parishes. (15 gold)', require:{ goldMin:15 }, effects:{ gold:-15, popularOpinion:15 } },
    { label:'A show of force on the roads.', chance:0.6,
      success:{ text:'Patrols at every ford and fair. The songs quiet — for now.', effects:{ prestige:4 } },
      failure:{ text:'A patrol is stoned, an armsman killed. Now there is a martyr, and the murmurs have a name to gather around.', effects:{ setFlag:'df_unrest', popularOpinion:-5 } } },
    { label:'They will tire of it.', effects:{ setFlag:'df_unrest' } }
  ]},
{ id:'df_league', title:'The League of the Discontent',
  trigger:{ tierMin:4, flags:['df_unrest'], popularOpinionBelow:-10, chance:0.25 }, weight:8, cooldown:4, wartime:true,
  text:'It is no longer songs. Headmen from a dozen villages meet in barns, and a disgraced captain drills them at night. Your bailiff names it plainly: a league, sworn against your house.',
  options:[
    { label:'Buy the ringleaders, one by one. (25 gold)', require:{ goldMin:25 },
      effects:{ gold:-25, clearFlag:'df_unrest', popularOpinion:10, log:'Bought off a rising against the house.' } },
    { label:'Cow them before they march.', chance:'battle',
      success:{ text:'Your men descend on the night-drill. The league scatters into the dark, leaderless and done.', effects:{ clearFlag:'df_unrest', prestige:6 } },
      failure:{ text:'They were ready, and your men come home bloody. Now every fence-sitter knows you can be stood against.', effects:{ setFlag:'df_league', prestige:-8 } } },
    { label:'Barns and talk. Let them meet.', effects:{ setFlag:'df_league' } }
  ]},
{ id:'df_revolt', title:'The Realm Rises',
  trigger:{ tierMin:4, flags:['df_league'], chance:0.3 }, weight:10, cooldown:2, wartime:true,
  text:'Fire in the night, from one end of your lands to the other. The league marches under a harvest-king of its own making, and your garrisons yield their towers rather than fight their neighbors. This is no riot — it is a war for your seat.',
  options:[
    { label:'Fight for your seat.', chance:'battle',
      success:{ text:'Their harvest-king falls in the first press and the host melts back to its plows. You are merciless in victory, and no one sings that song again.', effects:{ clearFlag:'df_unrest', clearFlag2:'df_league', prestige:15, popularOpinion:-10, log:'Crushed the great rising of the commons.' } },
      failure:{ text:'Your line breaks — and when it breaks, everything breaks. You ride from the field with a dozen men and the clothes you stand in.', effects:{ custom:'df_fall', log:'Cast down by a rising of the commons.' } } },
    { label:'Abdicate and slip away.', desc:'Yield the lands and flee abroad with what you can carry.',
      effects:{ custom:'df_fall_flee', log:'Fled a rising of the commons.' } },
    { label:'Beg your liege’s aid. (20 gold)', require:{ isVassal:true, goldMin:20 },
      effects:{ gold:-20, opinionLiege:-10, clearFlag:'df_unrest', clearFlag2:'df_league', log:'The liege’s host put down the rising — at a price.' } }
  ]},
{ id:'df_claim_whispers', title:'A Rival’s Quiet Work',
  trigger:{ tierMin:3, hasRole:'rival', roleOpinionBelow:{ role:'rival', value:-40 }, notFlags:['df_claim'], chance:0.12 }, weight:5, cooldown:12,
  text:'{rival} dines your neighbors, remembers their sons’ names, and asks — always lightly — whether the land might not be better served. A spy in their household brings worse: parchments are being drawn up.',
  options:[
    { label:'Buy off the waverers. (20 gold)', require:{ goldMin:20 }, effects:{ gold:-20, log:'Spent freely to keep the fence-sitters loyal.' } },
    { label:'Unmask the scheme at court.', chance:'plot',
      success:{ text:'You name names before the assembled court, and watch {rival}’s friends find urgent business elsewhere.', effects:{ prestige:6, opinion:{ role:'rival', amt:-10 } } },
      failure:{ text:'Your accusation rings hollow — half the court had already dined at {rival}’s table. They smile, and work faster.', effects:{ setFlag:'df_claim', prestige:-4 } } },
    { label:'Pay it no mind.', effects:{ setFlag:'df_claim' } }
  ]},
{ id:'df_claim_declared', title:'The Claim Declared',
  trigger:{ flags:['df_claim'], hasRole:'rival', chance:0.25 }, weight:7, cooldown:4, wartime:true,
  text:'It is done openly now: {rival} publishes a claim to everything you hold — a worm-eaten genealogy, a bought witness, and promises to every malcontent in the county, with foreign gold behind all of it. Men begin choosing which side to kneel to.',
  options:[
    { label:'Settle: gold for a renunciation. (30 gold)', require:{ goldMin:30 },
      effects:{ gold:-30, prestige:-5, clearFlag:'df_claim', log:'Bought off a rival’s claim.' } },
    { label:'Answer with a counter-plot.', chance:'plot',
      success:{ text:'Their bought witness recants, loudly, in the wrong company. The claim collapses into laughter.', effects:{ clearFlag:'df_claim', prestige:8, log:'Unraveled a rival’s claim.' } },
      failure:{ text:'Your agent is caught, and talks. Now the claim has a martyr’s righteousness about it — and backers with spears.', effects:{ setFlag:'df_claim2', prestige:-5 } } },
    { label:'Let them shout.', effects:{ setFlag:'df_claim2' } }
  ]},
{ id:'df_usurp', title:'The Usurper’s Banners',
  trigger:{ flags:['df_claim2'], chance:0.3 }, weight:10, cooldown:2, wartime:true,
  text:'{rival} has raised a banner, and half the countryside flocks to it — the malcontents, the bought, the bored. Riders in your own colors are seen changing cloaks at the crossroads. There is no more law in this, only spears — or surrender.',
  options:[
    { label:'Meet them in the field.', chance:'battle',
      success:{ text:'The pretender’s host breaks like rotten wood, and the pretender hangs from the gate they would have entered in triumph.', effects:{ clearFlag:'df_claim', clearFlag2:'df_claim2', killRole:'rival', prestige:20, log:'Destroyed a pretender in open war.' } },
      failure:{ text:'Your men would not stand — some would not even draw. You watch your own banner come down from the gate tower.', effects:{ custom:'df_fall', log:'Overthrown by a rival claimant.' } } },
    { label:'Yield and beg terms.', desc:'Surrender the lands for your lives and your strongboxes.',
      effects:{ custom:'df_fall_flee', log:'Yielded everything to a rival claimant.' } }
  ]},
{ id:'df_omen', title:'An Omen of Knives',
  trigger:{ tierMin:3, hasRole:'rival', roleOpinionBelow:{ role:'rival', value:-50 }, notFlags:['df_marked'], chance:0.1 }, weight:5, cooldown:16,
  text:'A dead dog at your threshold, its throat cut. A serving girl who knew your habits, gone in the night. Your spymaster — you pay him well — says the pattern points one way: {rival} is done waiting for you to die naturally.',
  options:[
    { label:'Double the guard, reward the loyal. (15 gold)', require:{ goldMin:15 }, effects:{ gold:-15 } },
    { label:'Set a trap for their agent.', chance:'plot',
      success:{ text:'The poisoner walks into it, and under questioning gives up a name. The knives stop — and {rival} knows that you know.', effects:{ prestige:6, skills:{int:1} } },
      failure:{ text:'Your trap catches a scullion — innocent, probably. The real agent reports your defenses in detail.', effects:{ setFlag:'df_marked' } } },
    { label:'Omens are for old women.', effects:{ setFlag:'df_marked' } }
  ]},
{ id:'df_conspiracy', title:'The Conspiracy Ripens',
  trigger:{ flags:['df_marked'], hasRole:'rival', chance:0.25 }, weight:7, cooldown:4, wartime:true,
  text:'Your oldest armsman is found in the millrace, drowned in a foot of water — and he could swim. Someone inside your walls is paid. The household eats in silence and watches itself; the net is closing, and you cannot see its ropes.',
  options:[
    { label:'Purge the household.', chance:'plot',
      success:{ text:'Three servants taken in the night; one talks. The paid knife flees your hall ahead of the rope, and the silence lifts.', effects:{ clearFlag:'df_marked', prestige:-5, piety:-3, log:'Purged a murderous conspiracy.' } },
      failure:{ text:'You seize the wrong people, and the true conspirators use the fear — half your servants flee, and the rest dare not warn you now.', effects:{ setFlag:'df_doom', prestige:-8 } } },
    { label:'Lie low at a kinsman’s hall. (10 gold)', require:{ goldMin:10 }, desc:'A season away cools even hot blood.',
      effects:{ gold:-10, prestige:-5, clearFlag:'df_marked' } },
    { label:'Trust your stars.', effects:{ setFlag:'df_doom' } }
  ]},
{ id:'df_knife', title:'The Knife',
  trigger:{ flags:['df_doom'], chance:0.35 }, weight:10, cooldown:2, wartime:true,
  text:'You wake with a hand over your mouth and steel already moving. There are three of them, and they know the room — someone drew them a map. {god} help you, the guards are not coming.',
  options:[
    { label:'Fight for your life.', chance:'battle',
      success:{ text:'You take a blade through the arm and give better than you get — two flee, one dies on the floorboards, and the conspiracy dies with him. You rule from a sickbed for a season, but you rule.', effects:{ clearFlag:'df_doom', health:-2, addTrait:'scarred', prestige:10, log:'Survived the great conspiracy.' } },
      failure:{ text:'Steel finds you again and again, and the world goes white, then strange. You wake to a physician’s face and impossible news: in the confusion your enemies have taken the seat, the keys, everything but your life.', effects:{ health:-5, addTrait:'scarred', custom:'df_fall', log:'Left for dead; the house was cast down in the night.' } } },
    { label:'Beg sanctuary of the {temple}.', desc:'Throw yourself on the mercy of {god} — and flee.',
      effects:{ piety:-10, custom:'df_fall_flee', log:'Fled into sanctuary; the lands were seized behind you.' } }
  ]}
);
