/* =========================================================================
   Fallowborn — WAR EVENTS: councils, musters, and life on campaign.
   All carry `wartime:true`: while the player is personally at war (own
   war, soldiering in a realm at war, or riding with the liege’s host) the
   daily picker draws ONLY wartime events — ordinary life waits for peace.
   ========================================================================= */
window.FBDATA = window.FBDATA || {};
FBDATA.events = FBDATA.events || [];

FBDATA.events.push(

/* ---------- the ruler’s war (tier 4+, own banner) ---------- */
{ id:'war_muster', title:'The Banners Rise', trigger:{ never:true }, wartime:true,
  contextValidator:'war_event_context_valid',
  text:'War with {enemy}. The host musters at your banner even now — farmers, spears, and pride. Will you swell its ranks before it marches? And mark this: {target} falls only to a siege — your host must stand upon its walls, season by season, until the works are done.',
  options:[
    { label:'Hire mercenaries. ({money:20})', require:{ goldMin:20 }, desc:'A company of ~150 hard men, promptly paid ({money:4} a season while the host is raised).',
      effects:{ gold:-20, custom:'war_mercs', log:'Hired mercenaries for the war.' } },
    { label:'Call up every able man.', desc:'A greater levy — but the fields will miss them.',
      effects:{ custom:'war_mass', popularOpinion:-8, log:'Called a great levy to war.' } },
    { label:'March with what you have.', desc:'Trust the spears that answered the first call.', effects:{ prestige:3, custom:'war_raise' } }
  ]},
{ id:'war_defense_muster', title:'War Comes to You', trigger:{ never:true }, wartime:true,
  contextValidator:'war_event_context_valid',
  text:'{enemy} marches on your lands. Roads fill with carts and rumor; your captains stand in the yard, waiting for orders.',
  options:[
    { label:'Hire mercenaries. ({money:20})', require:{ goldMin:20 }, desc:'A company of ~150 hard men, promptly paid ({money:4} a season while the host is raised).',
      effects:{ gold:-20, custom:'war_mercs', log:'Hired mercenaries for the defense.' } },
    { label:'Call up every able man.', desc:'A greater levy — but the fields will miss them.',
      effects:{ custom:'war_mass', popularOpinion:-8, log:'Called a great levy to the defense.' } },
    { label:'Stand ready at the border.', desc:'Meet them with the host you already have.', effects:{ prestige:2, custom:'war_raise' } }
  ]},
{ id:'war_council', title:'The War Council', trigger:{ never:true }, wartime:true, warStatus:true,
  contextValidator:'war_event_context_valid',
  text:'Maps, candle-stubs, and hard-eyed captains. The war against {enemy} must be given its next move — and the men must see you certain of it.',
  options:[
    { label:'Hunt down their field host.', require:{ custom:'war_can_hunt' },
      desc:'March on their army in the field — battle joins when you catch it.',
      effects:{ custom:'war_hunt' } },
    { label:'Fall back and refit.', desc:'The host mends and your borders are relieved — but no ground is gained.',
      effects:{ custom:'war_hold', health:1 } },
    { label:'Seek terms.', desc:'End the war now, at a price.', effects:{ custom:'war_terms' } }
  ]},
{ id:'war_tribute_offer', title:'Envoys Under a White Flag', trigger:{ never:true }, wartime:true, warStatus:true,
  contextValidator:'war_event_context_valid',
  text:'Beaten in the field again and again, {enemy} sends envoys under a white flag: silver enough to end this war today, if you sheath the sword. But {target} still stands untaken — and its walls will not fall to a purse.',
  options:[
    { label:'Take the tribute.', desc:'Their coin, your glory — the war ends here.',
      effects:{ custom:'war_accept_tribute', log:'Took the enemy’s tribute and ended the war.' } },
    { label:'Press on for {target}.', desc:'Keep your host standing on {target} — the works advance each season it holds the ground. Fortifications may demand more work and a larger host.',
      effects:{ prestige:2, custom:'war_press_on', log:'Refused tribute; the war goes on.' } }
  ]},

/* the loser’s homage (docs/designs/descent.md): queued once per war by
   FB.maybeOfferSubmission when a greater, much stronger victor has the war
   all but won — kneel and keep the land, buy the peace dear, or fight on */
{ id:'war_submission_offer', title:'Terms From the Victor’s Seat', trigger:{ never:true }, wartime:true, warStatus:true,
  contextValidator:'war_submission_valid',
  text:'The herald of {enemy} does not gloat — greatness need not. His master’s offer is plain: kneel, swear the oaths, and this war dies here. Keep every acre, every tower, every man still breathing — held from a new lord. Or refuse, and lose them one by one.',
  options:[
    { label:'Bend the knee.', desc:'The war ends at once. Your lands remain yours — held now from {enemy}.',
      effects:{ custom:'war_submit', log:'Swore the oaths to end a losing war.' } },
    { label:'Buy the peace with heavy tribute.', desc:'Silver where oaths would serve — {enemy} will name a conqueror’s price.',
      require:{ custom:'war_submission_tribute_affordable' },
      effects:{ custom:'war_submission_tribute', log:'Bought off a conqueror.' } },
    { label:'Fight on.', desc:'Better a free fall than a kneeling survival.',
      effects:{ prestige:3, log:'Refused the enemy’s terms; the war goes on.' } }
  ]},

/* capture & ransom (docs/designs/descent.md): queued by FB.maybeCapturePlayer
   when the beaten player is taken in the rout. Pay, sign over a border
   county, or endure and trust to gaolers, seasons, and the war’s end */
{ id:'prison_ransom', title:'The Captor’s Price', trigger:{ never:true }, wartime:true, warStatus:true,
  contextValidator:'prison_still',
  text:'A courteous letter and a heavy chain: {enemy} names the price of your freedom, and will wait — comfortably — while your household counts its silver. A prisoner of rank is an asset, and an asset can wait for its market.',
  options:[
    { label:'Pay the ransom.', require:{ custom:'prison_can_pay' }, desc:'Silver buys the key — the price scales with your dignity.',
      effects:{ custom:'prison_pay', log:'Paid a war ransom.' } },
    { label:'Offer land instead.', require:{ custom:'prison_can_cede' }, desc:'A border county signs the ransom roll. The war, mark you, goes on.',
      effects:{ custom:'prison_cede_land', log:'Ceded a county as ransom.' } },
    { label:'Rot a while.', desc:'Let them wait. Gaolers can be bribed, wars end, and chains are mortal things.',
      effects:{ prestige:-2, log:'Endured captivity.' } }
  ]},

/* ---------- riding with the liege’s host (vassals) ---------- */
{ id:'host_battle', title:'The Banners Meet',
  trigger:{ flags:['with_liege_host'], liegeAtWar:true, chance:0.6 }, wartime:true, weight:14, cooldown:2,
  text:'The liege’s war finds its field. Your banner has its place in the line, and great men are watching how you hold it.',
  options:[
    { label:'Fight where the press is thickest.', chance:'battle', desc:'Renown and ruin stand side by side in the press.',
      success:{ text:'Your part of the line holds, then breaks them. The liege marks it — and so does everyone else.',
        effects:{ prestige:10, opinionLiege:15, gold:4, skills:{mar:1}, warService:2 } },
      failure:{ text:'A mace finds your helm; your men drag you clear. You bled in the liege’s cause, and that too is remembered.',
        effects:{ health:-2, opinionLiege:8, prestige:2, addTrait:'scarred', warService:1,
          deathProvenance:{ kind:'battle', enemy:'liegeWar' } } } },
    { label:'Hold your ground and spend your men carefully.', desc:'A quiet day, well held, is remembered too.', effects:{ opinionLiege:5, prestige:2, skills:{mar:1}, warService:1 } }
  ]},
{ id:'host_camp', title:'Fires of the Great Camp',
  trigger:{ flags:['with_liege_host'], liegeAtWar:true, chance:0.5 }, wartime:true, weight:8, cooldown:2,
  text:'A war camp is a court under canvas: lords trade grievances, wagers, and promises between the watch-fires.',
  options:[
    { label:'Talk your house upward.', chance:0.6, desc:'Fine words may open doors — or close them.',
      success:{ text:'The right ears, the right words. Doors will open after this war.', effects:{ prestige:6, skills:{dip:1} } },
      failure:{ text:'You misjudge a jest at a great man’s expense. Cold looks follow you to your tent.', effects:{ prestige:-3 } } },
    { label:'Drill your men instead.', desc:'Sweat now buys blood saved later.', effects:{ skills:{mar:1}, opinionLiege:3 } },
    { label:'Rest while you can.', desc:'The war will not wait for you to wake.', effects:{ health:1 } }
  ]},
{ id:'liege_war_ends', title:'The Host Disbands',
  trigger:{ flags:['with_liege_host'], liegeAtWar:false }, wartime:true, weight:50,
  text:'The liege’s war is done. The great camp folds tent by tent, and the banners turn for home — yours among them, with honor.',
  options:[
    { label:'Home, to what waited.', desc:'The road home, with honor in your saddlebags.', effects:{ clearFlag:'with_liege_host', opinionLiege:10, prestige:8, gold:5, warService:2, log:'Came home from the liege’s war.' } }
  ]},

/* ---------- an extraordinary first-life command (newly gentle founder) ---------- */
{ id:'military_barony_victory', title:'A Banner Won in Blood',
  trigger:{ never:true }, wartime:true,
  text:'At {cname}, the contingent held to your command while the enemy host broke. Before the surviving banners, {rulername} calls the victory proof no pedigree can gainsay: a tower, land, and a banner of your own are offered to you.',
  options:[
    { label:'Kneel, and rise a baron.', desc:'The founder of a gentle house becomes its first landed lord.',
      effects:{ tierSet:3, prestige:100, standingRealm:20, custom:'record_liege_grant', log:'Won a barony by leading the ruler’s host to victory.' } },
    { label:'Ask for the victor’s purse instead.', desc:'Take wealth and renown, but remain gentry.',
      effects:{ gold:100, prestige:25, standingRealm:-5, log:'Refused a battlefield barony for the victor’s purse.' } },
    { label:'Decline the reward.', desc:'Let the victory stand without changing your station.',
      effects:{ prestige:15, standingRealm:5 } }
  ]},

/* ---------- life on campaign (soldiers and levied men) ---------- */
{ id:'camp_forage', title:'Empty Wagons',
  trigger:{ professions:['soldier'], realmAtWar:true, chance:0.4 }, wartime:true, weight:8, cooldown:2,
  text:'The supply wagons are late again, and the host eats the countryside as it goes. A farmstead ahead has full cribs and frightened eyes.',
  options:[
    { label:'Take what the host needs.', desc:'Their hunger against yours — and yours is armed.', effects:{ gold:2, piety:-4, popularOpinion:-3 } },
    { label:'Pay for what you take.', require:{ goldMin:2 }, desc:'A clear conscience, at market price.', effects:{ gold:-2, piety:5 } },
    { label:'March hungry.', desc:'An empty belly, but a clean one.', effects:{ health:-1, piety:2 } }
  ]},
{ id:'night_sortie', title:'Volunteers for the Night',
  trigger:{ professions:['soldier'], realmAtWar:true, flags:['seen_battle'], chance:0.3 }, wartime:true, weight:7, cooldown:3,
  text:'The captain wants men for a night raid on the enemy pickets — quiet feet, quick knives, and no promises about the morning.',
  options:[
    { label:'Step forward.', chance:'battle', desc:'Loot and stories favor the bold — if the dark allows.',
      success:{ text:'Fires in the dark, cut ropes, panicked horses. You are back before dawn with loot and a story.',
        effects:{ gold:5, prestige:6, skills:{mar:1} } },
      failure:{ text:'A sentry’s cry, a running fight in the dark. You crawl back to the lines bleeding.',
        effects:{ health:-2, addTrait:'scarred', prestige:2 } } },
    { label:'Let braver fools go.', desc:'The cautious live to be levied again.', effects:{ } }
  ]},
{ id:'camp_fires', title:'The Long Wait',
  trigger:{ professions:['soldier'], realmAtWar:true, chance:0.4 }, wartime:true, weight:6, cooldown:2,
  text:'Armies are mostly waiting. Around the fires the veterans dice, wrestle, and retell battles that grow with every telling.',
  options:[
    { label:'Dice with the veterans.', require:{ religionGroups:['christian','pagan','jewish'] }, chance:0.5, desc:'The bones care nothing for your purse.',
      success:{ text:'The bones favor you tonight.', effects:{ gold:3, skills:{int:1} } },
      failure:{ text:'The bones do not.', effects:{ gold:-3 } } },
    { label:'Wrestle for the camp’s honor.', chance:0.5, desc:'Win a name, or eat the mud.',
      success:{ text:'You pin a man twice your size while the fires roar approval.', effects:{ prestige:4, skills:{mar:1} } },
      failure:{ text:'You eat mud to great applause.', effects:{ health:-1 } } },
    { label:'Listen, and learn the old tricks.', desc:'Old soldiers’ tales are lessons in disguise.', effects:{ skills:{mar:1} } }
  ]},
{ id:'campaign_fear_before_dawn', title:'Before the Horns',
  trigger:{ professions:['soldier'], realmAtWar:true, flags:['seen_battle'], chance:0.3 }, wartime:true, weight:7, cooldown:4,
  text:'Before dawn the word passes down the line: battle today. Your hands will not stop shaking. No one speaks of fear, which leaves it everywhere.',
  options:[
    { label:'Name the fear, then master it.', desc:'Courage is what remains after fear is admitted.', effects:{ prestige:3, skills:{mar:1} } },
    { label:'Ask for the most dangerous place.', chance:'battle', desc:'Valor may burn the fear out — or burn you with it.',
      success:{ text:'You are first across the ditch and still standing when the line follows.', effects:{ prestige:9, skills:{mar:1}, warService:1 } },
      failure:{ text:'A spear finds the gap beneath your arm. The line advances over you.', effects:{ health:-2, prestige:2, warService:1, deathProvenance:{kind:'battle',enemy:'realmWar'} } } },
    { label:'Find duty with the baggage.', desc:'Safer work, if the others let you forget why you chose it.', effects:{ prestige:-3 } }
  ]},
{ id:'campaign_wound_watch', title:'The Wound Will Not Close',
  trigger:{ professions:['soldier'], realmAtWar:true, flags:['seen_battle'], healthMax:7, chance:0.25 }, wartime:true, weight:6, cooldown:4,
  text:'The old wound has opened beneath sweat and mail. The surgeon says one quiet week may close it; the captain says the line is already short.',
  options:[
    { label:'Report to the surgeon.', desc:'Protect your health and accept the muttering.', effects:{ health:1, prestige:-2 } },
    { label:'Bind it tight and stay in line.', chance:0.65, desc:'Your reputation rises if the body holds.',
      success:{ text:'The binding holds through the march. The veterans begin to use your name.', effects:{ prestige:6, warService:1 } },
      failure:{ text:'Blood soaks the binding before noon.', effects:{ health:-2, prestige:2 } } }
  ]},
{ id:'campaign_orders_in_mud', title:'Two Orders in the Rain',
  trigger:{ professions:['soldier'], realmAtWar:true, flags:['sergeant'], chance:0.25 }, wartime:true, weight:6, cooldown:4,
  text:'One officer orders your file to the ford; another shouts for it at the ridge. Rain eats both voices while the soldiers wait for yours.',
  options:[
    { label:'Choose the ford and take the blame.', chance:0.6, desc:'A clear wrong order can be better than two right ones.',
      success:{ text:'The ford holds. By dusk even the angry officer calls it judgment.', effects:{ prestige:7, skills:{mar:1}, warService:1 } },
      failure:{ text:'The ford becomes a trap, and your name travels back with the wounded.', effects:{ prestige:-5, health:-1 } } },
    { label:'Hold until the officers agree.', desc:'Discipline preserved; opportunity surrendered.', effects:{ prestige:-1, skills:{int:1} } }
  ]},
{ id:'campaign_camp_fever', title:'Heat Beneath the Blanket',
  trigger:{ professions:['soldier'], realmAtWar:true, chance:0.22 }, wartime:true, weight:6, cooldown:5,
  text:'A sour fever moves from tent to tent. Men who marched yesterday cannot stand today, and tonight your own skin feels too hot.',
  options:[
    { label:'Go to the infirmary before it worsens.', desc:'Lose a little standing and perhaps save your life.', effects:{ health:-1, setFlag:'ill', prestige:-1 } },
    { label:'Keep the watch and say nothing.', chance:0.55, desc:'The body may master it. The camp may remember.',
      success:{ text:'By dawn the fever breaks and you are still at your post.', effects:{ prestige:5, health:-1 } },
      failure:{ text:'You collapse against the spear-rack before relief comes.', effects:{ health:-2, setFlag:'ill' } } }
  ]},
{ id:'campaign_name_on_the_roll', title:'A Name the Captain Knows',
  trigger:{ professions:['soldier'], realmAtWar:true, flags:['seen_battle'], prestigeMin:25, chance:0.2 }, wartime:true, weight:5, cooldown:6,
  text:'The captain reads the night-watch roll, pauses at your name, and looks up. Around you, strangers now know whom he means.',
  options:[
    { label:'Use the name to steady the new men.', desc:'Reputation becomes responsibility.', effects:{ prestige:5, skills:{dip:1}, warService:1 } },
    { label:'Use it to claim a better share.', desc:'A famous hand can reach deeper into the purse.', effects:{ gold:4, prestige:-1 } }
  ]},

/* ---------- the ruler’s camp (random wartime happenings) ---------- */
{ id:'host_discipline', title:'Plunder in the Baggage',
  trigger:{ flags:['with_liege_host'], liegeAtWar:true, chance:0.4 }, wartime:true, weight:7, cooldown:2,
  text:'Two of your men are dragged before you with a farmwife’s silver in their packs. The camp watches to see what your banner is worth.',
  options:[
    { label:'Hang them before the tents.', desc:'Order at the end of a rope.', effects:{ opinionLiege:8, prestige:2, popularOpinion:-2 } },
    { label:'Flog them and repay the woman.', desc:'Justice, with mercy and a little silver.', effects:{ gold:-2, opinionLiege:4, piety:3 } },
    { label:'“Spoils of war.” Look away.', desc:'The camp remembers what you forgive.', effects:{ piety:-4, prestige:-2 } }
  ]},
{ id:'war_deserters', title:'Empty Bedrolls',
  trigger:{ tierMin:3, atWar:true, custom:'war_deserters_due', chance:0.35 }, wartime:true, warStatus:true, weight:9, cooldown:2,
  text:'After a recent defeat and {warLosses} recorded campaign losses, the morning count wavers. {hostMen} soldiers still stand beneath the banner, but men are slipping home to harvests, wives, and unfinished lives.',
  options:[
    { label:'Hunt them down and hang one.', desc:'Discipline raises abstract campaign condition; no live troops return or leave.', effects:{ custom:'war_discipline_deserters', prestige:3, popularOpinion:-5 } },
    { label:'Clear the arrears. ({money:deserterPay})', require:{ custom:'war_can_pay_deserters' }, desc:'Pay two seasons of current live-host logistics. Supply raises abstract condition; live troops do not change.', effects:{ custom:'war_pay_deserters' } },
    { label:'Let the faint-hearted go.', desc:'A seeded {deserterMinPercent}–{deserterMaxPercent}% leave the live host by deterministic casualty order; abstract condition does not change.', effects:{ custom:'war_desert', prestige:-2 } }
  ]},
{ id:'war_grain_seller', title:'Grain at Sword-Season Prices',
  trigger:{ tierMin:3, atWar:true, custom:'war_live_host', chance:0.2 }, wartime:true, warStatus:true, weight:7, cooldown:4,
  text:'A merchant with excellent timing and no shame offers grain enough to keep the host fed — at thrice the honest price.',
  options:[
    { label:'Pay him. ({money:8})', require:{ goldMin:8 }, desc:'Supply raises abstract campaign condition; live troop totals do not change.', effects:{ gold:-8, custom:'war_supply' } },
    { label:'“Requisition” the wagons.', chance:0.6, desc:'Take it by right of hunger — success changes abstract supply, not live troops.',
      success:{ text:'The host eats; the merchant curses your name in three ports.', effects:{ custom:'war_supply', prestige:-2, piety:-3 } },
      failure:{ text:'His guards were better than his prices. Men are hurt for nothing.', effects:{ custom:'war_thin', prestige:-3 } } },
    { label:'The men can tighten their belts.', desc:'Thin ranks lower abstract campaign condition; live troop totals do not change.', effects:{ custom:'war_thin' } }
  ]},
{ id:'war_pay_chest', title:'The Pay Chest Is Light',
  trigger:{ tierMin:3, atWar:true, custom:'war_host_under_pressure', chance:0.28 }, wartime:true, warStatus:true, weight:7, cooldown:3,
  text:'The paymaster opens a chest that should be heavy and is not. The host has already suffered; another promise may sound like an insult.',
  options:[
    { label:'Make up the arrears yourself. ({money:10})', require:{ goldMin:10 }, desc:'Restored supply raises abstract campaign condition; no live troops change.', effects:{ gold:-10, custom:'war_supply', prestige:2 } },
    { label:'Put the officers before the ranks.', desc:'Visible discipline raises abstract condition, but the purse stays empty.', effects:{ custom:'war_discipline', prestige:1 } },
    { label:'Issue another promise.', desc:'Disorder lowers abstract condition; live troop totals do not change yet.', effects:{ custom:'war_disorder', prestige:-2 } }
  ]},
{ id:'war_camp_discipline', title:'A Knife Between Companies',
  trigger:{ tierMin:3, atWar:true, custom:'war_live_host', chance:0.22 }, wartime:true, warStatus:true, weight:6, cooldown:3,
  text:'A quarrel between two companies ends with a knife in the mud and both sides reaching for spears. The whole camp waits on the judgment.',
  options:[
    { label:'Judge the killers in public.', desc:'Discipline raises abstract condition; the live roster is unchanged.', effects:{ custom:'war_discipline', prestige:3, popularOpinion:-2 } },
    { label:'Make both companies drill together.', desc:'Slow reconciliation raises abstract discipline without executions.', effects:{ custom:'war_discipline', skills:{mar:1} } },
    { label:'Let their captains settle it.', desc:'Disorder lowers abstract condition; live troop totals do not change.', effects:{ custom:'war_disorder', prestige:-2 } }
  ]},
{ id:'war_officers_divided', title:'Captains at Cross Purposes',
  trigger:{ tierMin:3, atWar:true, custom:'war_campaign_deep', chance:0.2 }, wartime:true, warStatus:true, weight:6, cooldown:4,
  text:'The senior captains no longer argue about roads. They argue about who will be blamed for the road already taken.',
  options:[
    { label:'Set one command and own it.', desc:'A clear chain of command raises abstract discipline.', effects:{ custom:'war_discipline', prestige:3, skills:{mar:1} } },
    { label:'Balance every grievance.', chance:0.55, desc:'Diplomacy may reconcile them; failure deepens abstract disorder.',
      success:{ text:'Each captain leaves heard, and all leave with the same written order.', effects:{ custom:'war_discipline', skills:{dip:1} } },
      failure:{ text:'Each hears a different promise and distrusts the others more.', effects:{ custom:'war_disorder', prestige:-2 } } }
  ]},
{ id:'war_camp_followers', title:'The Road Behind the Host',
  trigger:{ tierMin:3, atWar:true, custom:'war_live_host', chance:0.18 }, wartime:true, warStatus:true, weight:5, cooldown:4,
  text:'Smiths, laundresses, traders, children, gamblers, and wounded men stretch the camp into a second army. They feed the host and slow it in equal measure.',
  options:[
    { label:'License the camp market.', desc:'Order and supplies raise abstract campaign condition.', effects:{ gold:3, custom:'war_supply', popularOpinion:1 } },
    { label:'Drive away everyone without a spear.', desc:'Harsh discipline raises abstract condition at a cost in reputation.', effects:{ custom:'war_discipline', prestige:-2, popularOpinion:-2 } },
    { label:'Leave the road to govern itself.', desc:'Disorder lowers abstract condition; the live roster is unchanged.', effects:{ custom:'war_disorder' } }
  ]},
{ id:'war_local_requisition', title:'The Villages Bar Their Doors',
  trigger:{ tierMin:3, atWar:true, custom:'war_host_abroad', chance:0.25 }, wartime:true, warStatus:true, weight:7, cooldown:3,
  text:'The host stands on enemy soil and the nearby villages hide grain, carts, and livestock. Your foragers ask how much law follows a banner across the border.',
  options:[
    { label:'Pay for every sack. ({money:6})', require:{ goldMin:6 }, desc:'Bought food raises abstract supply; live troops do not change.', effects:{ gold:-6, custom:'war_supply', piety:2 } },
    { label:'Take what the campaign requires.', desc:'Requisition raises abstract supply and damages your name.', effects:{ custom:'war_supply', gold:3, piety:-3, prestige:-2 } },
    { label:'Move on hungry.', desc:'Thin ranks lower abstract condition; no troops are directly removed.', effects:{ custom:'war_thin', piety:2 } }
  ]},

/* ---------- the whole war: objectives, allies, exhaustion, and peace ---------- */
{ id:'war_objective_council', title:'What Is This War For?',
  trigger:{ tierMin:3, atWar:true, custom:'war_objective_under_debate', chance:0.2 }, wartime:true, warStatus:true, weight:6, cooldown:4,
  text:'The captains point at {target}; the treasurer points at the empty columns beside it. What began as one clean objective now carries a dozen private ambitions.',
  options:[
    { label:'Name {target}, and nothing beyond it.', desc:'A limited objective restores abstract discipline.', effects:{ custom:'war_discipline', prestige:3 } },
    { label:'Promise the host whatever it can take.', desc:'Plunder buys enthusiasm but weakens abstract discipline.', effects:{ gold:4, custom:'war_disorder', piety:-3 } },
    { label:'Admit the objective must wait.', desc:'Restored supply raises condition, but public resolve suffers.', effects:{ custom:'war_supply', popularOpinion:2, prestige:-3 } }
  ]},
{ id:'war_allied_hesitation', title:'An Ally Counts the Cost',
  trigger:{ tierMin:3, atWar:true, custom:'war_has_allied_host', chance:0.22 }, wartime:true, warStatus:true, weight:7, cooldown:4,
  text:'Your ally’s captain says {alliedMen} spears were promised for defense, not for every road the campaign might choose. Their camp is already packing.',
  options:[
    { label:'Pay their disputed costs. ({money:8})', require:{ goldMin:8 }, desc:'The allied live troops remain and abstract supply improves.', effects:{ gold:-8, custom:'war_supply' } },
    { label:'Call on the honor of their oath.', desc:'Discipline rises in the abstract ledger; allied troops remain.', effects:{ custom:'war_discipline', prestige:3 } },
    { label:'Let them march home.', desc:'Their men leave the live host and abstract condition falls; the feedback ledger records both.', effects:{ custom:'war_allied_withdrawal', prestige:-2 } }
  ]},
{ id:'war_enemy_concessions', title:'A Lesser Offer from the Enemy',
  trigger:{ tierMin:3, atWar:true, custom:'war_enemy_offer_possible', chance:0.18 }, wartime:true, warStatus:true, weight:5, cooldown:4,
  text:'Enemy envoys offer prisoners, wagons, and a purse — not peace, and not {target}, but enough to test whether the war’s purpose is still worth its price.',
  options:[
    { label:'Exchange prisoners and take the wagons.', desc:'Supplies raise abstract condition; the live roster does not change.', effects:{ gold:5, custom:'war_supply', piety:2 } },
    { label:'Take only the wounded home.', desc:'Mercy helps public resolve without altering either army ledger.', effects:{ popularOpinion:3, piety:3 } },
    { label:'Send them back unheard.', desc:'A show of discipline raises abstract condition.', effects:{ custom:'war_discipline', prestige:2 } }
  ]},
{ id:'war_public_exhaustion', title:'The Roll Counts Empty Houses',
  trigger:{ tierMin:3, atWar:true, custom:'war_campaign_exhausted', chance:0.28 }, wartime:true, warStatus:true, weight:8, cooldown:3,
  text:'Four seasons and more have passed. At home, rents arrive late, fields go short of hands, and every household tally seems to count someone beneath your banner.',
  options:[
    { label:'Send relief home. ({money:8})', require:{ goldMin:8 }, desc:'Public patience and abstract supply recover; live troops remain.', effects:{ gold:-8, popularOpinion:5, custom:'war_supply' } },
    { label:'Demand one more effort.', desc:'Discipline rises while Common Voice falls.', effects:{ custom:'war_discipline', popularOpinion:-7, prestige:2 } },
    { label:'Acknowledge the cost in public.', desc:'Common Voice recovers, but thin ranks lower abstract condition.', effects:{ popularOpinion:3, custom:'war_thin', prestige:-2 } }
  ]},
{ id:'war_occupation_policy', title:'Under Your Banner',
  trigger:{ never:true }, wartime:true, warStatus:true,
  contextValidator:'war_event_context_valid',
  text:'The siege works bite into {target}. Farms and streets behind your lines now answer to soldiers who ask whether they are conquerors, guests, or thieves.',
  options:[
    { label:'Protect market, shrine, and field.', require:{ goldMin:4 }, desc:'Restraint raises abstract discipline and costs {money:4}.', effects:{ gold:-4, custom:'war_discipline', piety:4, popularOpinion:2 } },
    { label:'Requisition under written receipts.', desc:'Supplies raise abstract condition; promises burden your reputation.', effects:{ custom:'war_supply', prestige:-1 } },
    { label:'Let fear shorten the siege.', desc:'Disorder and cruelty lower abstract condition despite immediate plunder.', effects:{ gold:7, custom:'war_disorder', piety:-6, popularOpinion:-4 } }
  ]},
{ id:'war_negotiated_withdrawal', title:'A Road Out of the War',
  trigger:{ tierMin:3, atWar:true, custom:'war_negotiation_possible', chance:0.24 }, wartime:true, warStatus:true, weight:7, cooldown:3,
  text:'A neutral household offers safe conduct, an exchange of captives, and an end without triumph. The road home is open now; another defeat may close it.',
  options:[
    { label:'Negotiate the withdrawal.', desc:'End the war now with a smaller prestige loss than abandoning it unilaterally.', effects:{ custom:'war_negotiated_withdrawal' } },
    { label:'Use the talks to rest the host.', desc:'Supply raises abstract condition; the war continues.', effects:{ custom:'war_supply', prestige:-1 } },
    { label:'Break off the talks.', desc:'Discipline rises in the abstract ledger; the war continues.', effects:{ custom:'war_discipline', prestige:2 } }
  ]},

/* ---------- battles on the map (hosts meeting in a province, js/armies.js) ---------- */
{ id:'field_battle_won', title:'Battle — the Field Is Yours', trigger:{ never:true }, wartime:true,
  text:'Steel and shouting at {cname} — and when the lines part it is their banner that falls back, their dead that thicken the ground. Your host holds the field.',
  options:[
    { label:'Tend the wounded, and count the spoils.', desc:'Savor it; the crows already do.', effects:{ prestige:8, skills:{mar:1} } }
  ]},
{ id:'field_battle_lost', title:'Battle — the Day Is Lost', trigger:{ never:true }, wartime:true,
  text:'The line bent, then broke at {cname}. You are borne away with the remnant of your host — bloodied, beaten, but breathing.',
  options:[
    { label:'Rally who you can in the dark.', desc:'Live now; be avenged later.', effects:{ gold:-4, health:-1, prestige:-4,
      deathProvenance:{ kind:'battle', province:'context', enemy:'war' } } }
  ]},
/* variants for a host with men-at-arms: the hard core earns a mention */
{ id:'field_battle_won_steel', title:'Battle — the Field Is Yours', trigger:{ never:true }, wartime:true,
  text:'Steel and shouting at {cname} — the levy wavered, but your men-at-arms stood like a wall and it was their banner that fell back, their dead that thickened the ground. Your host holds the field.',
  options:[
    { label:'Tend the wounded, and count the spoils.', desc:'Savor it; the crows already do.', effects:{ prestige:8, skills:{mar:1} } }
  ]},
{ id:'field_battle_lost_steel', title:'Battle — the Day Is Lost', trigger:{ never:true }, wartime:true,
  text:'The levy broke first at {cname}, as levy will. Your men-at-arms sold their ground dearly and formed the rearguard that bore you off — bloodied, beaten, but breathing.',
  options:[
    { label:'Rally who you can in the dark.', desc:'Live now; be avenged later.', effects:{ gold:-4, health:-1, prestige:-4,
      deathProvenance:{ kind:'battle', province:'context', enemy:'war' } } }
  ]},

/* ---------- great holy wars: field offers and queued campaign reports ---------- */
{ id:'ghw_pilgrims_under_arms', title:'Pilgrims Under Arms',
  trigger:{ custom:'ghw_has_field_host', chance:0.01 },
  wartime:true, weight:2, cooldown:36,
  text:'Pilgrims, penitents, and younger sons come straggling beneath the sacred banners. They have brought their own spears and little else, asking only for a place in the line.',
  options:[
    { label:'Give them a place in the line.',
      desc:'120 volunteers join as levy without a recruitment fee. Their supplies still add about {money:0.6} to seasonal logistics.',
      effects:{ custom:'ghw_recruit_volunteers',
        log:'Accepted armed pilgrims into the great holy-war host.' } }
  ]},
{ id:'ghw_swords_seeking_banner', title:'Swords Seeking a Banner',
  trigger:{ custom:'ghw_has_field_host', goldMin:15, chance:0.25 },
  wartime:true, weight:10, cooldown:4,
  text:'The great camp draws fighting men who own no banner of their own. Three companies send captains to your fire, each naming a different price for service in the holy war.',
  options:[
    { label:'Hire the mercenary company. ({money:15})',
      require:{ goldMin:15 },
      desc:'150 mercenaries join the current host; their contract adds {money:4} to seasonal logistics.',
      effects:{ gold:-15, custom:'ghw_recruit_mercenaries',
        log:'Hired a mercenary company for the great holy war.' } },
    { label:{
        default:'Take the landless knights into service. ({money:20})',
        muslim:'Take the landless horsemen into service. ({money:20})',
        pagan:'Take the landless champions into service. ({money:20})'
      },
      require:{ goldMin:20 },
      desc:'75 seasoned cavalry join the current host, adding about {money:1.5} to seasonal logistics.',
      effects:{ gold:-20, custom:'ghw_recruit_knights',
        log:{
          default:'Took landless knights into service for the great holy war.',
          muslim:'Took landless horsemen into service for the great holy war.',
          pagan:'Took landless champions into service for the great holy war.'
        } } },
    { label:'Take on the adventurers. ({money:25})',
      require:{ goldMin:25 },
      desc:'100 men-at-arms join the current host, adding about {money:2} to seasonal logistics.',
      effects:{ gold:-25, custom:'ghw_recruit_adventurers',
        log:'Took a band of adventurers into service for the great holy war.' } },
    { label:'Send them in search of another banner.',
      desc:'Keep your coin and the host you already have.',
      effects:{} }
  ]},
{ id:'ghw_called',
  title:{ forms:{ select:'value', param:'campaignType', cases:{
    crusade:'The Pope Calls a Crusade',
    jihad:'The Caliph Calls a Jihad',
    other:'A Great Holy War Is Called'
  }}},
  trigger:{ never:true }, wartime:true,
  text:{ forms:{ select:'value', param:'campaignType', cases:{
    crusade:'The Pope calls Christendom to a Crusade for {kingdom}. Across the Latin realms, preachers carry the summons and rulers take the cross. The banners have 180 days to gather.',
    jihad:'The Caliph calls the faithful to Jihad for {kingdom}. Across the Muslim realms, preachers carry the summons and rulers take the vow. The armies have 180 days to gather.',
    other:'{caller} calls the faithful to a great holy war for {kingdom}. Preachers carry the summons from court to court, and the armies have 180 days to gather.'
  }}},
  options:[
    { label:'The summons is heard.',
      desc:'Eligible freeholders and rulers can answer from the Deeds tab during the 180-day gathering.',
      effects:{} }
  ]},
{ id:'ghw_muster_complete',
  title:{ forms:{ select:'value', param:'campaignType', cases:{
    crusade:'The Crusade Begins',
    jihad:'The Jihad Begins',
    other:'The Great Holy War Begins'
  }}},
  trigger:{ never:true }, wartime:true,
  text:{ forms:{ select:'value', param:'campaignType', cases:{
    crusade:'The 180 days of preaching and preparation are ended. The crusading hosts stand beneath their banners, and {leader} takes command for the march on {kingdom}.',
    jihad:'The 180 days of preaching and preparation are ended. The armies of the jihad stand beneath their banners, and {leader} takes command for the march on {kingdom}.',
    other:'The 180 days of preaching and preparation are ended. The gathered hosts stand beneath their banners, and {leader} takes command for the march on {kingdom}.'
  }}},
  options:[
    { label:'Let the armies march.',
      desc:'The campaign is active and the gathered hosts are now in the field.',
      effects:{} }
  ]},
{ id:'ghw_field_battle_won', title:'A Victory for the Faith', trigger:{ never:true }, wartime:true,
  text:'The opposing host breaks at {cname}. Your banner remains among the victorious ranks, and every campfire carries the tale before nightfall.',
  options:[
    { label:'Give thanks, then tend the wounded.', desc:'Your service is written into the campaign’s reckoning.',
      effects:{ prestige:8, piety:4, skills:{mar:1} } }
  ]},
{ id:'ghw_field_battle_lost', title:'The Faithful Are Driven Back', trigger:{ never:true }, wartime:true,
  text:'Your camp’s line buckles at {cname}. You escape with the remnant while the enemy holds the field.',
  options:[
    { label:'Rally beneath the nearest banner.', desc:'The campaign is not decided by one bloody day.',
      effects:{ health:-1, prestige:-3, deathProvenance:{ kind:'battle', province:'context' } } }
  ]},
{ id:'ghw_expedition_service', title:'A Season Beneath the Banners',
  trigger:{ never:true }, wartime:true,
  text:'You pass a season in the great host: dusty marches, cold watches, and the endless labor that keeps an army together.',
  options:[
    { label:'Continue your service.', desc:'Quiet duty still counts when the spoils are divided.',
      effects:{ custom:'ghw_service_safe', piety:1 } }
  ]},
{ id:'ghw_expedition_danger', title:'Beyond the Campfires',
  trigger:{ never:true }, wartime:true,
  text:'Scouts need volunteers to cross dangerous ground before dawn. Success would bring useful intelligence; failure may leave no road home.',
  options:[
    { label:'Go with the scouts.', chance:'battle', desc:'Risk blood for a larger share of the campaign’s honor.',
      success:{ text:'You return with prisoners and a sure account of the enemy road.',
        effects:{ custom:'ghw_service_danger', prestige:5, skills:{mar:1} } },
      failure:{ text:'The patrol is discovered. You crawl back after a running fight in the dark.',
        effects:{ custom:'ghw_service_safe', health:-2, prestige:1,
          deathProvenance:{ kind:'battle', province:'player' } } } },
    { label:'Remain with the baggage.', desc:'Safe service is service nonetheless.',
      effects:{ custom:'ghw_service_safe', piety:1 } }
  ]}
);
