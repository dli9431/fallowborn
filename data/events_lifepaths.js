/* =========================================================================
   Fallowborn — LIFE PATH EVENTS: soldier command, the physician’s art,
   scholarship and the stars, commissioned works, mercenary contracts,
   and adventuring expeditions.

   The soldier, physician, scholar, and author stories extend the existing
   careers in data/economy.js and never pass at landed tiers (professions
   and career triggers exclude tier 3+). Mercenary contracts and expeditions
   ride the travel system in js/travel.js.
   ========================================================================= */
window.FBDATA = window.FBDATA || {};
FBDATA.events = FBDATA.events || [];

FBDATA.events.push(

/* ================= SOLDIER: command & operational decisions ================= */
{ id:'soldier_command_scouts', title:'Before the Army Moves',
  trigger:{ professions:['soldier'], flags:['seen_battle'], realmAtWar:true, chance:0.35 }, wartime:true, weight:8, cooldown:6,
  text:'The army halts at the edge of unknown country. The captain needs the ground ahead read — fords, woods, and where the enemy’s outriders water their horses. His eye travels down the line and stops at you. “Take six riders. Bring me back the truth.”',
  options:[
    { label:'Lead the scouting party.', desc:'A command of your own — and the first blades of the war.', chance:'battle',
      success:{ text:'You find the ford unguarded and the enemy’s horse-lines by dusk. The captain hears your report twice over and asks for your name again.', effects:{ prestige:8, gold:5, skills:{mar:1}, warService:1, opinion:{role:'lord', amt:6}, log:'Led a scouting party and returned with the truth.' } },
      failure:{ text:'Enemy outriders find you first. You bring three riders home out of six, and an arrow’s kiss across the ribs.', effects:{ health:-2, prestige:2, warService:1, addTraitOnce:'scarred' } } },
    { label:'Another man’s turn.', desc:'Let someone hungrier take the risk.', effects:{ prestige:-2 } }
  ]},
{ id:'soldier_command_rearguard', title:'The Rearguard',
  trigger:{ professions:['soldier'], flags:['seen_battle'], realmAtWar:true, chance:0.3 }, wartime:true, weight:7, cooldown:6,
  text:'The army crosses the marsh at first light, and someone must hold the baggage and the wounded against whoever comes sniffing after. The captain names you. “Nothing passes you. Nothing.”',
  options:[
    { label:'Hold the crossing until the last cart is over.', desc:'Slow, thankless work — until it is suddenly very sharp.', chance:'battle',
      success:{ text:'You sell every yard of the causeway dearly. The wounded cross; the pursuers do not.', effects:{ prestige:10, gold:4, warService:1, opinion:{role:'lord', amt:8}, log:'Held the rearguard at the crossing.' } },
      failure:{ text:'The wagons are saved, but the price is written in blood — some of it yours.', effects:{ health:-2, warService:1, prestige:3 } } },
    { label:'Abandon the baggage and save the men.', desc:'Coin can be replaced. The captain will not see it that way.', effects:{ prestige:-4, opinion:{role:'lord', amt:-6}, health:1 } }
  ]},
{ id:'soldier_muster_drill', title:'The Quiet Muster',
  trigger:{ professions:['soldier'], custom:'lifepath_realm_at_peace', chance:0.3 }, weight:7, cooldown:6,
  text:'Peace has come, and with it the green levy: boys from the lanes who hold a spear like a hoe. The sergeant asks you to knock them into shape before the next war does it for you.',
  options:[
    { label:'Drill them honestly.', desc:'Hard days on the green; the village will thank you when it matters.', effects:{ skills:{mar:1}, prestige:3, popularOpinion:3, log:'Drilled the levy in peacetime.' } },
    { label:'Take the coin and go easy on them.', desc:'Full pay for half the work.', effects:{ gold:5, prestige:-2 } },
    { label:'Spend the season with your own household.', desc:'The levy can wait; the fire at home cannot.', effects:{ health:1, popularOpinion:1 } }
  ]},

/* ================= PHYSICIAN ================= */
{ id:'physician_outbreak', title:'A Fever in the Lanes',
  trigger:{ professions:['physician'], chance:0.35 }, weight:8, cooldown:6,
  text:'A sweating sickness moves through {location} — first the dyer’s house, then the lane behind it. Neighbors bar their doors; the sick call for water. Every eye that knows your craft turns to you.',
  options:[
    { label:'Tend the sick in their homes.', desc:'Your art against the fever, at arm’s length from it.', chance:'skill_lea',
      success:{ text:'Cool cloths, bitter infusions, and clean dressings: more rise from their beds than are carried out. The lane remembers.', effects:{ prestige:6, popularOpinion:4, gold:4, skills:{lea:1}, log:'Tended the sick through a fever outbreak.' } },
      failure:{ text:'The fever does not read books. Three days later your own brow burns, and the lane buries its dead without you.', effects:{ health:-2, prestige:2, popularOpinion:2 } } },
    { label:'Advise from the well-head.', desc:'Guard the water, keep the sick apart, and keep your distance.', effects:{ popularOpinion:2, prestige:2, skills:{lea:1} } },
    { label:'See your own household safe first.', desc:'Bar the door and boil the water at home; the lanes must manage.', effects:{ health:1, prestige:-3, popularOpinion:-2 } }
  ]},
{ id:'physician_noble_patient', title:'The Lord’s Sickroom',
  trigger:{ professions:['physician'], chance:0.3 }, weight:7, cooldown:8,
  text:'A rider comes at dusk: {lord}’s own child burns with fever, and the household remedies have failed. “Come,” the rider says. “Whatever you ask — only come.”',
  options:[
    { label:'Attend the child yourself.', desc:'A lord’s gratitude is a rich medicine; a lord’s grief is a dangerous one.', chance:'skill_lea',
      success:{ text:'You break the fever on the third night with willow-bark and patience. {lord} pays in silver and in memory.', effects:{ gold:12, opinion:{role:'lord', amt:12}, prestige:6, log:'Tended the lord’s sick child.' } },
      failure:{ text:'The child worsens despite everything. {lord} says nothing at all, which is worse than shouting.', effects:{ opinion:{role:'lord', amt:-10}, prestige:-4 } } },
    { label:'Send written instruction instead.', desc:'Safer for you, if colder for them.', effects:{ gold:3, prestige:-1 } }
  ]},
{ id:'physician_book_of_remedies', title:'A Lifetime of Remedies',
  trigger:{ career:{ profession:'physician', specialization:'physician' }, chance:0.5 }, weight:6, once:true,
  text:'Years of fevers, births, wounds, and slow recoveries fill your memory and your margins. A copyist offers to set it all down properly: one book of remedies, written in your hand, that would outlive you.',
  options:[
    { label:'Set down the Book of Remedies.', desc:'A durable family work — knowledge no fever can burn.', effects:{ giveItem:'book_of_remedies', research:5, prestige:8, log:'Compiled a Book of Remedies.' } },
    { label:'Keep it in your head.', desc:'Knowledge carried is knowledge never borrowed.', effects:{ gold:4 } }
  ]},

/* ================= SCHOLARSHIP ================= */
{ id:'scholar_disputation', title:'A Visiting Master',
  trigger:{ professions:['scholar'], chance:0.35 }, weight:7, cooldown:5,
  text:'Outside the {temple}, a traveling master takes all comers in disputation, and a crowd gathers to watch scholars bleed. A place beside him is open — and so is his purse, for the one who bests him.',
  options:[
    { label:'Dispute with him.', desc:'A public contest of learning, with a public price for losing.', chance:'skill_lea',
      success:{ text:'Your distinctions hold; his do not. The crowd laughs with you, and the purse is yours.', effects:{ prestige:6, gold:3, skills:{lea:1}, log:'Bested a visiting master in disputation.' } },
      failure:{ text:'He turns your own argument against you before the whole square. The crowd enjoys that too.', effects:{ prestige:-3 } } },
    { label:'Listen and take notes.', desc:'Another mind’s method is worth more than one afternoon’s pride.', effects:{ skills:{lea:1} } }
  ]},
{ id:'astronomer_observations', title:'Three Clear Nights',
  trigger:{ career:{ profession:'scholar', specialization:'astronomer' }, chance:0.4 }, weight:8, cooldown:5,
  text:'Three clear nights in a row, and the wanderers are bright. Your tables wait on the roof beside the astrolabe; below, a messenger from a wealthy patron waits for a horoscope and does not care about the wanderers at all.',
  options:[
    { label:'Record the wanderers’ paths.', desc:'Patient observation, written down for the nation’s learning.', effects:{ research:6, skills:{lea:1}, log:'Recorded the paths of the wandering stars.' } },
    { label:'Cast the patron’s horoscope.', desc:'Coin for reading the heavens — but a failed prophecy is remembered.', chance:'skill_lea',
      success:{ text:'You promise a fortunate season, and the season obliges. The patron pays double.', effects:{ gold:9, prestige:3, opinion:{role:'lord', amt:4} } },
      failure:{ text:'You promise rain for the harvest and the heavens send none. The patron tells everyone.', effects:{ prestige:-3, opinion:{role:'lord', amt:-5} } } }
  ]},
{ id:'astronomer_star_tables', title:'The Completed Tables',
  trigger:{ career:{ profession:'scholar', specialization:'astronomer' }, chance:0.5 }, weight:6, once:true,
  text:'Year upon year of observations have piled into something whole: tables from which any careful reader may find the wanderers without ever climbing your roof. It is ready to be bound.',
  options:[
    { label:'Bind the Star Tables.', desc:'A durable family work — the heavens, made portable.', effects:{ giveItem:'star_tables', research:8, prestige:8, log:'Completed the Star Tables.' } },
    { label:'Not yet — keep observing.', desc:'Another year of nights can only make them truer.', effects:{ skills:{lea:1} } }
  ]},
{ id:'author_commission', title:'A Commission for a Work',
  trigger:{ career:{ profession:'scholar', specialization:'author' }, chance:0.4 }, weight:8, cooldown:6,
  text:'{lord} desires a work to give the household luster — a book with your name in it and the patron’s arms on the cover. The fee is agreed in advance; only the writing remains.',
  options:[
    { label:'Accept the commission.', desc:'Months at the writing desk for coin, standing, and another family work.', chance:'skill_lea',
      success:{ text:'The work is finished, read aloud, and praised in the right houses. A fair copy stays with your own family.', effects:{ gold:15, prestige:6, custom:'lifepath_author_work', log:'Completed a commissioned work.' } },
      failure:{ text:'The words will not come together, and the deadline will not wait. The patron pays a quarter fee and looks elsewhere.', effects:{ gold:4, prestige:-2 } } },
    { label:'Decline politely.', desc:'Your own projects need the winter more.', effects:{} }
  ]},

/* ================= MERCENARY CONTRACTS (paid service at war) ================= */
{ id:'travel_capstone_mercenary', title:'A Captain’s Offer', trigger:{never:true},
  travel:{ kind:'capstone', purpose:'service' },
  text:'You come to {destination} seeking service and find {rname} at war. The captain looks you over — the scars, the stance, the way you hold a spear — and names terms: {money:mercPay} each season, for {mercSeasons} seasons, paid from the company chest. Danger is not promised, merely very likely.',
  options:[
    { label:'Sign the contract.', desc:'Sustained paid war service: seasonal silver, campaign work, and a final purse at term’s end.', effects:{ custom:'merc_contract_accept', log:'Signed a mercenary contract with {rname}.' } },
    { label:'Take ordinary court service instead.', desc:'Wages and polish without the war.', effects:{ gold:6, prestige:4, skills:{dip:1}, custom:'travel_capstone_done', log:'Served at the court in {destination}.' } }
  ]},
{ id:'travel_work_merc_patrol', title:'Riding the March', trigger:{never:true},
  travel:{ kind:'work', purpose:'service', contract:true },
  text:'The contract’s bread is patrol: the border villages, the burned mill, the road where the enemy’s scouts were seen on the last new moon. {mercServed} of {mercSeasons} seasons are served.',
  options:[
    { label:'Ride out and be seen.', desc:'The contract pays for presence; presence invites trouble.', chance:'battle',
      success:{ text:'You scatter a raiding party from a farmstead and bring back its captured oxen. The village pays a bonus on the spot.', effects:{ gold:4, prestige:3, skills:{mar:1}, warService:1, log:'Rode the march under contract.' } },
      failure:{ text:'An ambush at the ford. You fight clear, but not untouched.', effects:{ health:-2, gold:1, warService:1, addTraitOnce:'scarred' } } },
    { label:'Keep the camp and the horses.', desc:'Dull, safe, and still paid.', effects:{ gold:2 } }
  ]},
{ id:'travel_work_merc_storm', title:'Ladders Against the Wall', trigger:{never:true},
  travel:{ kind:'work', purpose:'service', contract:true },
  text:'The patron’s host has sat before a stubborn wall for weeks, and patience is spent. The storming party goes forward at dawn — volunteers first, extra pay for the front rank.',
  options:[
    { label:'Join the storming party.', desc:'The front rank is where contracts are made glorious or fatal.', chance:'battle',
      success:{ text:'Over the palisade before the horn finishes sounding. The patron’s captain sees it, and so does everyone else.', effects:{ gold:8, prestige:6, warService:1, log:'Stormed a wall under contract.' } },
      failure:{ text:'A stone from the wall takes you in the shoulder and the ladder comes down with you. You wake bandaged, poorer in blood but not in pay.', effects:{ health:-3, warService:1, prestige:2 } } },
    { label:'Hold the siege lines.', desc:'Let the young and hungry have the ladder’s top.', effects:{ gold:2, prestige:1 } }
  ]},
{ id:'travel_work_merc_camp', title:'The Company at Dice', trigger:{never:true},
  travel:{ kind:'work', purpose:'service', contract:true },
  text:'Between musters the company idles: dice by the fire, blisters to mend, and a peddler who will carry a letter — or a coin — home for a price.',
  options:[
    { label:'Sit in at dice.', desc:'The company’s coin moves in circles; yours could join the orbit.', chance:0.5,
      success:{ text:'The dice love you tonight. The veterans grumble and pay.', effects:{ gold:3, skills:{int:1} } },
      failure:{ text:'The dice do not love you tonight.', effects:{ gold:-3 } } },
    { label:'Drill the new spears.', desc:'Someone must teach them what the shield-wall taught you.', effects:{ skills:{mar:1}, prestige:1 } },
    { label:'Send coin and a letter home.', desc:'The family eats better for your absence.', effects:{ gold:-2, prestige:2, log:'Sent coin and a letter home from the campaign.' } }
  ]},
{ id:'travel_merc_contract_complete', title:'The Contract Is Served', trigger:{never:true},
  travel:{ kind:'decision', purpose:'service' },
  text:'The muster roll is read one last time: {mercSeasons} seasons served, every one paid. The captain offers the final purse of {money:mercPurse} — and, if you want it, a fresh term on the same terms.',
  options:[
    { label:'Collect the purse and take the road home.', desc:'The final payment, a veteran’s name, and the first company’s standard once in a life.', effects:{ custom:'merc_contract_collect', travelReturn:true, prestige:8, addTraitOnce:'veteran', log:'Served out a full mercenary contract with {rname}.' } },
    { label:'Renew for another term.', desc:'The war goes on, and so does the silver.', require:{ custom:'merc_contract_ongoing' }, effects:{ custom:'merc_contract_renew', log:'Renewed the mercenary contract with {rname}.' } },
    { label:'Remain at court as a retainer.', desc:'End the contract in good order and stay on at {destination}.', effects:{ custom:'merc_contract_release', gold:2, log:'Ended the contract with {rname} and remained at {destination}.' } }
  ]},
{ id:'travel_merc_contract_peace', title:'Peace Breaks Out', trigger:{never:true},
  travel:{ kind:'decision', purpose:'service' },
  text:'Riders bring word to the camp: {rname} has made peace, and a contract without a war is a rope without a weight. The captain settles accounts honestly and releases the company.',
  options:[
    { label:'Take the severance and turn for home.', desc:'A small parting payment, and the long road back.', effects:{ custom:'merc_contract_release', gold:3, travelReturn:true, log:'Released from the contract when {rname} made peace.' } },
    { label:'Remain at the court a while.', desc:'The war is over; the hospitality is not.', effects:{ custom:'merc_contract_release', gold:3, log:'Released from the contract when {rname} made peace.' } }
  ]},

/* ================= EXPEDITIONS (foreign discovery) ================= */
{ id:'travel_capstone_expedition', title:'Foreign Soil', trigger:{never:true},
  travel:{ kind:'capstone', purpose:'expedition' },
  text:'{destination} at last: speech you must guess at, measures you must learn, and customs that would be tall tales if you were not standing in them. This is what the road was for.',
  options:[
    { label:'Record everything: coasts, customs, tongues.', desc:'The first foreign expedition written down becomes the family’s Travel Journal — once in a life.', effects:{ skills:{lea:1, ste:1}, research:4, prestige:6, custom:'travel_expedition_record', log:'Charted the ways of {destination}.' } },
    { label:'Turn the novelties to profit.', desc:'Curiosities and contacts are worth coin to the right buyers.', effects:{ gold:10, skills:{dip:1}, custom:'travel_capstone_done', log:'Traded on foreign novelties in {destination}.' } }
  ]},
{ id:'travel_work_expedition_guides', title:'Tongues for Hire', trigger:{never:true},
  travel:{ kind:'work', purpose:'expedition' },
  text:'A local guide offers safe paths, fair prices, and the names of things — for a price. Your own eyes are free, but they have never seen this country.',
  options:[
    { label:'Hire the guide.', desc:'Coin buys safe paths and true names.', effects:{ gold:-2, skills:{dip:1} } },
    { label:'Trust your own eyes.', desc:'The hard way teaches more — when it does not teach too much.', chance:0.6,
      success:{ text:'You learn the fords and the market days by watching, and lose nothing but boot leather.', effects:{ skills:{lea:1}, prestige:2 } },
      failure:{ text:'A wrong path through a bog costs you a day, a boot, and a chill.', effects:{ health:-1 } } }
  ]},
{ id:'travel_work_expedition_market', title:'The Foreign Market', trigger:{never:true},
  travel:{ kind:'work', purpose:'expedition' },
  text:'The market of {destination} sells things with no names in your tongue. Merchants watch the stranger with professional interest.',
  options:[
    { label:'Study their weights and measures.', desc:'How strangers count is how strangers prosper.', effects:{ skills:{ste:1}, gold:2 } },
    { label:'Buy curiosities for home.', desc:'Small wonders that will draw a crowd and open purses.', effects:{ gold:-3, prestige:3, log:'Bought foreign curiosities in {destination}.' } }
  ]},
{ id:'travel_work_expedition_wilds', title:'The Lawless Miles', trigger:{never:true},
  travel:{ kind:'work', purpose:'expedition' },
  text:'Between the towns of {destination} the road belongs to whoever holds it. A merchant caravan forms at the gate; beyond it, the hills make their own suggestions.',
  options:[
    { label:'Travel with the caravan.', desc:'Slow, crowded, safe — and the guards expect a contribution.', effects:{ gold:-2, skills:{ste:1} } },
    { label:'Take the hills alone.', desc:'The direct road, with all the direct road’s company.', chance:0.55,
      success:{ text:'You pass the hills unseen and learn their paths besides.', effects:{ prestige:2, skills:{ste:1} } },
      failure:{ text:'Shapes on the ridgeline. You run, and keep running, and leave blood on a stone.', effects:{ health:-2 } } }
  ]}
);
