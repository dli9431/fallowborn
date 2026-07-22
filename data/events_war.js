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
  text:'War with {enemy}. A host must be made of farmers, spears, and pride — and made now, before the season turns. How will you raise it?',
  options:[
    { label:'Hire mercenaries. (20 gold)', require:{ goldMin:20 }, desc:'A company of ~150 hard men, promptly paid (4 gold a season).',
      effects:{ gold:-20, custom:'war_mercs', log:'Hired mercenaries for the war.' } },
    { label:'Call up every able man.', desc:'A greater levy — but the fields will miss them.',
      effects:{ custom:'war_mass', popularOpinion:-8, log:'Called a great levy to war.' } },
    { label:'March with what you have.', effects:{ prestige:3, custom:'war_raise' } }
  ]},
{ id:'war_defense_muster', title:'War Comes to You', trigger:{ never:true }, wartime:true,
  text:'{enemy} marches on your lands. Roads fill with carts and rumor; your captains stand in the yard, waiting for orders.',
  options:[
    { label:'Hire mercenaries. (20 gold)', require:{ goldMin:20 }, desc:'A company of ~150 hard men, promptly paid (4 gold a season).',
      effects:{ gold:-20, custom:'war_mercs', log:'Hired mercenaries for the defense.' } },
    { label:'Call up every able man.', desc:'A greater levy — but the fields will miss them.',
      effects:{ custom:'war_mass', popularOpinion:-8, log:'Called a great levy to the defense.' } },
    { label:'Stand ready at the border.', effects:{ prestige:2, custom:'war_raise' } }
  ]},
{ id:'war_council', title:'The War Council', trigger:{ never:true }, wartime:true,
  text:'Maps, candle-stubs, and hard-eyed captains. {warstate}. The war against {enemy} must be given its next move — and the men must see you certain of it.',
  options:[
    { label:'Offer pitched battle.', chance:'war_battle', require:{ custom:'war_no_enemy_host' },
      desc:'Force a decision in the field — only while they have no host raised. A fielded enemy must be hunted on the map.',
      success:{ text:'The lines meet with a sound like a falling forest — and it is theirs that breaks. The field is yours.',
        effects:{ custom:'war_win', prestige:8, skills:{mar:1} } },
      failure:{ text:'The day goes against you. You are carried back with the remnant of your host — alive, and little else.',
        effects:{ custom:'war_loss', gold:-4, health:-1, prestige:-4 } } },
    { label:'Hunt down their field host.', require:{ custom:'war_can_hunt' },
      desc:'March on their army in the field — battle joins when you catch it.',
      effects:{ custom:'war_hunt' } },
    { label:'Press the siege of {target}.', require:{ custom:'war_can_siege' },
      desc:'Ladders, mines, and patience — your host must stand in the target province; three seasons of siege take the prize. Beware sorties.',
      effects:{ custom:'war_siege', prestige:2, skills:{mar:1} } },
    { label:'Harry their lands.', chance:0.7, desc:'Burn and take — weaken them before the next battle.',
      success:{ text:'Granaries burn and herds change owners. Their war grows dearer by the day — and yours a little richer.',
        effects:{ custom:'war_harry', gold:6, skills:{mar:1} } },
      failure:{ text:'Their riders were waiting at the ford. Your raiders return fewer, poorer, and ashamed.',
        effects:{ gold:-3, prestige:-2 } } },
    { label:'Fall back and refit.', desc:'The host mends and your borders are relieved — but no ground is gained.',
      effects:{ custom:'war_hold', health:1 } },
    { label:'Seek terms.', desc:'End the war now, at a price.', effects:{ custom:'war_terms' } }
  ]},

/* ---------- riding with the liege’s host (vassals) ---------- */
{ id:'host_battle', title:'The Banners Meet',
  trigger:{ flags:['with_liege_host'], liegeAtWar:true, chance:0.6 }, wartime:true, weight:14, cooldown:2,
  text:'The liege’s war finds its field. Your banner has its place in the line, and great men are watching how you hold it.',
  options:[
    { label:'Fight where the press is thickest.', chance:'battle',
      success:{ text:'Your part of the line holds, then breaks them. The liege marks it — and so does everyone else.',
        effects:{ prestige:10, opinionLiege:15, gold:4, skills:{mar:1} } },
      failure:{ text:'A mace finds your helm; your men drag you clear. You bled in the liege’s cause, and that too is remembered.',
        effects:{ health:-2, opinionLiege:8, prestige:2, addTrait:'scarred' } } },
    { label:'Hold your ground and spend your men carefully.', effects:{ opinionLiege:5, prestige:2, skills:{mar:1} } }
  ]},
{ id:'host_camp', title:'Fires of the Great Camp',
  trigger:{ flags:['with_liege_host'], liegeAtWar:true, chance:0.5 }, wartime:true, weight:8, cooldown:2,
  text:'A war camp is a court under canvas: lords trade grievances, wagers, and promises between the watch-fires.',
  options:[
    { label:'Talk your house upward.', chance:0.6,
      success:{ text:'The right ears, the right words. Doors will open after this war.', effects:{ prestige:6, skills:{dip:1} } },
      failure:{ text:'You misjudge a jest at a great man’s expense. Cold looks follow you to your tent.', effects:{ prestige:-3 } } },
    { label:'Drill your men instead.', effects:{ skills:{mar:1}, opinionLiege:3 } },
    { label:'Rest while you can.', effects:{ health:1 } }
  ]},
{ id:'liege_war_ends', title:'The Host Disbands',
  trigger:{ flags:['with_liege_host'], liegeAtWar:false }, wartime:true, weight:50,
  text:'The liege’s war is done. The great camp folds tent by tent, and the banners turn for home — yours among them, with honor.',
  options:[
    { label:'Home, to what waited.', effects:{ clearFlag:'with_liege_host', opinionLiege:10, prestige:8, gold:5, log:'Came home from the liege’s war.' } }
  ]},

/* ---------- life on campaign (soldiers and levied men) ---------- */
{ id:'camp_forage', title:'Empty Wagons',
  trigger:{ professions:['soldier'], realmAtWar:true, chance:0.4 }, wartime:true, weight:8, cooldown:2,
  text:'The supply wagons are late again, and the host eats the countryside as it goes. A farmstead ahead has full cribs and frightened eyes.',
  options:[
    { label:'Take what the host needs.', effects:{ gold:2, piety:-4, popularOpinion:-3 } },
    { label:'Pay for what you take.', require:{ goldMin:2 }, effects:{ gold:-2, piety:5 } },
    { label:'March hungry.', effects:{ health:-1, piety:2 } }
  ]},
{ id:'night_sortie', title:'Volunteers for the Night',
  trigger:{ professions:['soldier'], realmAtWar:true, flags:['seen_battle'], chance:0.3 }, wartime:true, weight:7, cooldown:3,
  text:'The captain wants men for a night raid on the enemy pickets — quiet feet, quick knives, and no promises about the morning.',
  options:[
    { label:'Step forward.', chance:'battle',
      success:{ text:'Fires in the dark, cut ropes, panicked horses. You are back before dawn with loot and a story.',
        effects:{ gold:5, prestige:6, skills:{mar:1} } },
      failure:{ text:'A sentry’s cry, a running fight in the dark. You crawl back to the lines bleeding.',
        effects:{ health:-2, addTrait:'scarred', prestige:2 } } },
    { label:'Let braver fools go.', effects:{ } }
  ]},
{ id:'camp_fires', title:'The Long Wait',
  trigger:{ professions:['soldier'], realmAtWar:true, chance:0.4 }, wartime:true, weight:6, cooldown:2,
  text:'Armies are mostly waiting. Around the fires the veterans dice, wrestle, and retell battles that grow with every telling.',
  options:[
    { label:'Dice with the veterans.', require:{ religionGroups:['christian','pagan','jewish'] }, chance:0.5,
      success:{ text:'The bones favor you tonight.', effects:{ gold:3, skills:{int:1} } },
      failure:{ text:'The bones do not.', effects:{ gold:-3 } } },
    { label:'Wrestle for the camp’s honor.', chance:0.5,
      success:{ text:'You pin a man twice your size while the fires roar approval.', effects:{ prestige:4, skills:{mar:1} } },
      failure:{ text:'You eat mud to great applause.', effects:{ health:-1 } } },
    { label:'Listen, and learn the old tricks.', effects:{ skills:{mar:1} } }
  ]},

/* ---------- the ruler’s camp (random wartime happenings) ---------- */
{ id:'host_discipline', title:'Plunder in the Baggage',
  trigger:{ flags:['with_liege_host'], liegeAtWar:true, chance:0.4 }, wartime:true, weight:7, cooldown:2,
  text:'Two of your men are dragged before you with a farmwife’s silver in their packs. The camp watches to see what your banner is worth.',
  options:[
    { label:'Hang them before the tents.', effects:{ opinionLiege:8, prestige:2, popularOpinion:-2 } },
    { label:'Flog them and repay the woman.', effects:{ gold:-2, opinionLiege:4, piety:3 } },
    { label:'“Spoils of war.” Look away.', effects:{ piety:-4, prestige:-2 } }
  ]},
{ id:'war_deserters', title:'Empty Bedrolls',
  trigger:{ tierMin:3, atWar:true, chance:0.3 }, wartime:true, weight:7, cooldown:2,
  text:'Morning count comes up short again — men slipping home to their harvests, their wives, their unfinished lives. The ones who stay are watching you.',
  options:[
    { label:'Hunt them down and hang one.', effects:{ prestige:3, popularOpinion:-5 } },
    { label:'Promise double pay at war’s end.', require:{ goldMin:8 }, desc:'The ranks steady.', effects:{ gold:-8, custom:'war_supply' } },
    { label:'Let the faint-hearted go.', effects:{ custom:'war_thin', prestige:-2 } }
  ]},
{ id:'war_grain_seller', title:'Grain at Sword-Season Prices',
  trigger:{ tierMin:3, atWar:true, chance:0.3 }, wartime:true, weight:7, cooldown:2,
  text:'A merchant with excellent timing and no shame offers grain enough to keep the host fed — at thrice the honest price.',
  options:[
    { label:'Pay him. (8 gold)', require:{ goldMin:8 }, desc:'A fed host fights better.', effects:{ gold:-8, custom:'war_supply' } },
    { label:'“Requisition” the wagons.', chance:0.6,
      success:{ text:'The host eats; the merchant curses your name in three ports.', effects:{ custom:'war_supply', prestige:-2, piety:-3 } },
      failure:{ text:'His guards were better than his prices. Men are hurt for nothing.', effects:{ custom:'war_thin', prestige:-3 } } },
    { label:'The men can tighten their belts.', effects:{ custom:'war_thin' } }
  ]},

/* ---------- battles on the map (hosts meeting in a province, js/armies.js) ---------- */
{ id:'field_battle_won', title:'Battle — the Field Is Yours', trigger:{ never:true }, wartime:true,
  text:'Steel and shouting at {cname} — and when the lines part it is their banner that falls back, their dead that thicken the ground. Your host holds the field.',
  options:[
    { label:'Tend the wounded, and count the spoils.', effects:{ prestige:8, skills:{mar:1} } }
  ]},
{ id:'field_battle_lost', title:'Battle — the Day Is Lost', trigger:{ never:true }, wartime:true,
  text:'The line bent, then broke at {cname}. You are borne away with the remnant of your host — bloodied, beaten, but breathing.',
  options:[
    { label:'Rally who you can in the dark.', effects:{ gold:-4, health:-1, prestige:-4 } }
  ]}
);
