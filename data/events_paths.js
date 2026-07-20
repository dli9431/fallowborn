/* =========================================================================
   Fallowborn — PATH EVENTS: craft & trade, soldiering, the cloth,
   and the landed gentry (tier 2).
   ========================================================================= */
window.FBDATA = window.FBDATA || {};
FBDATA.events = FBDATA.events || [];

FBDATA.events.push(

/* ================= CRAFT & TRADE ================= */
{ id:'guild_entry', title:'The Guild Bench',
  trigger:{ professions:['craftsman'], tierMin:1, chance:0.3, notFlags:['guild_member'] }, weight:10,
  text:{ default:'The masters of the craft drink together, set prices together, and bury each other’s dead. A seat at their bench costs silver — and buys a future.',
    muslim:'The masters of the craft eat together, set prices together, and bury each other’s dead. A seat at their bench costs silver — and buys a future.' },
  options:[
    { label:'Pay the entry fee. (15 gold)', require:{ goldMin:15 }, effects:{ gold:-15, setFlag:'guild_member', prestige:8, log:'Joined the craft guild.' } },
    { label:'Work outside the guild.', effects:{ } }
  ]},
{ id:'masterwork', title:'The Masterwork',
  trigger:{ professions:['craftsman'], flags:['guild_member'], chance:0.2 }, weight:8, cooldown:12,
  text:'A commission worthy of your best: fine work for a great house. Succeed, and your name travels farther than you ever have.',
  options:[
    { label:'Labor over it for months.', chance:'skill_ste',
      success:{ text:'It is the finest thing you have ever made. Word spreads.', effects:{ gold:20, prestige:12, skills:{ste:1}, log:'Completed a masterwork.' } },
      failure:{ text:'A flaw in the final hour ruins it. The patron pays half, scowling.', effects:{ gold:5, prestige:-4 } } }
  ]},
{ id:'caravan_venture', title:'The Caravan',
  trigger:{ professions:['merchant','craftsman'], tierMin:1, goldMin:20, chance:0.35 }, weight:10, cooldown:6,
  text:'A caravan is forming for the long route — spice, cloth, and salt. Shares are open to any with silver and a strong stomach for risk.',
  options:[
    { label:'Stake 20 gold.', chance:0.65,
      success:{ text:'Months later word returns: the venture prospered! Your stake comes back doubled.', effects:{ gold:22, skills:{ste:1}, log:'A trade venture paid off.' } },
      failure:{ text:'Raiders took the caravan at a desert well. Your silver is scattered across the sand.', effects:{ gold:-20 } } },
    { label:'Stake 50 gold.', require:{ goldMin:50 }, chance:0.65,
      success:{ text:'The great gamble pays! Profits beyond your hopes.', effects:{ gold:60, prestige:5, skills:{ste:1} } },
      failure:{ text:'The sea — or the steppe — keeps your fortune. A bitter year.', effects:{ gold:-50 } } },
    { label:'Keep your coin at home.', effects:{ } }
  ]},
{ id:'shop_fire', title:'Fire!',
  trigger:{ professions:['craftsman','merchant'], tierMin:1, chance:0.08 }, weight:5, cooldown:20,
  text:'You wake to shouting and an orange glow. Fire is eating through the workshop quarter, leaping thatch to thatch.',
  options:[
    { label:'Fight the flames for your stock.', chance:0.5,
      success:{ text:'Scorched but standing. You saved the most of it.', effects:{ gold:-5, health:-1 } },
      failure:{ text:'You save your skin and little else.', effects:{ gold:-15, health:-1 } } },
    { label:'Help the neighbors first.', effects:{ gold:-10, prestige:8, opinion:{role:'friend', amt:15} } }
  ]},
{ id:'moneylending', title:'Silver Breeds Silver',
  trigger:{ professions:['merchant'], goldMin:30, chance:0.25 }, weight:8, cooldown:8,
  text:'A landowner needs thirty pieces before harvest and will pledge his mill as surety. Usury is frowned upon — profit rarely is.',
  options:[
    { label:'Lend at hard interest.', chance:0.7,
      success:{ text:'Repaid in full, and handsomely.', effects:{ gold:12, piety:-3, skills:{ste:1} } },
      failure:{ text:'He defaults — but the mill pledge makes you whole, and an enemy.', effects:{ gold:5, opinion:{role:'rival', amt:-15} } } },
    { label:'Lend as a kindness.', effects:{ gold:-2, piety:5, prestige:5 } },
    { label:'Decline.', effects:{ } }
  ]},
{ id:'become_merchant', title:'From Bench to Ledger',
  trigger:{ professions:['craftsman'], tierMin:1, goldMin:40, chance:0.2 }, weight:6, once:true,
  text:'You know the roads now, the prices, the men who move goods. Why make one chair when you can sell a hundred?',
  options:[
    { label:'Take up the merchant’s life.', effects:{ profession:'merchant', log:'Became a merchant.' } },
    { label:'Stay true to the craft.', effects:{ } }
  ]},
{ id:'town_elder', title:'A Voice in the Town',
  trigger:{ professions:['merchant','craftsman'], tierMin:1, prestigeMin:60, chance:0.25 }, weight:8, once:true,
  text:'The townsfolk mutter that the council needs a man of sense — your name comes up more than once.',
  options:[
    { label:'Stand for the council.', chance:0.6,
      success:{ text:'They raise you to the council bench. Small power, but power.', effects:{ prestige:15, setFlag:'councilman', log:'Elected to the town council.' } },
      failure:{ text:'An older name edges you out. Next time.', effects:{ prestige:3 } } },
    { label:'Trade needs no title.', effects:{ gold:3 } }
  ]},

/* ================= SOLDIERING ================= */
{ id:'first_muster', title:'The Muster Field',
  trigger:{ professions:['soldier'], chance:0.4, notFlags:['seen_battle'] }, wartime:true, weight:10, cooldown:6,
  text:'Drill, drill, and drill again. The sergeant’s stick finds every lazy elbow. “Sloppy lines die,” he says. “Neat lines kill.”',
  options:[
    { label:'Sweat now, live later.', effects:{ skills:{mar:1}, health:0 } },
    { label:'Dice with the veterans instead.', chance:0.5,
      success:{ text:'You win their coin and, better, their stories.', effects:{ gold:3, skills:{int:1} } },
      failure:{ text:'They take your pay and laugh you back to the drill-yard.', effects:{ gold:-3 } } }
  ]},
{ id:'first_battle', title:'The Shield-Wall',
  trigger:{ professions:['soldier'], realmAtWar:true, chance:0.5 }, wartime:true, weight:15, cooldown:4,
  text:'Horns. Mud. A line of strangers who mean to kill you, close enough now to see their teeth. The man beside you is praying; the man beyond him is laughing.',
  options:[
    { label:'Stand in the line.', chance:'battle',
      success:{ text:'The wall holds. The enemy breaks first, and you are alive — alive! — with loot on the field.', effects:{ gold:8, prestige:10, skills:{mar:1}, setFlag:'seen_battle', addTrait:'veteran', log:'Survived the shield-wall.' } },
      failure:{ text:'The line buckles. You take a blade and are dragged from the press, bleeding.', effects:{ health:-3, setFlag:'seen_battle', addTrait:'scarred', prestige:3 } } },
    { label:'Hang back among the baggage.', effects:{ prestige:-5, addTrait:'craven' } }
  ]},
{ id:'save_the_lord', title:'A Lord Unhorsed',
  trigger:{ professions:['soldier'], flags:['seen_battle'], realmAtWar:true, chance:0.2 }, wartime:true, weight:8, once:true,
  text:'Through the din you see it: {lord} down, horse screaming, enemies closing like crows. No one else is near enough. You are.',
  options:[
    { label:'Charge to the rescue.', chance:0.55,
      success:{ text:'You stand over the fallen lord, roaring, until help arrives. He grips your arm: “I will not forget this.”', effects:{ prestige:20, opinion:{role:'lord', amt:50}, skills:{mar:1}, setFlag:'lords_favor', log:'Saved the lord’s life in battle!' } },
      failure:{ text:'You reach him — then something bursts against your helm. You wake in the surgeons’ tent, honored and broken.', effects:{ health:-3, prestige:12, opinion:{role:'lord', amt:25}, addTrait:'scarred' } } },
    { label:'A dead lord pays no wages. Keep formation.', effects:{ prestige:-2 } }
  ]},
{ id:'knighted', title:'Raised Up',
  trigger:{ professions:['soldier'], flags:['lords_favor'], tierMax:1, chance:0.5 }, wartime:true, weight:20,
  text:'Before the assembled retinue, {lord} bids you kneel. A sword touches your shoulder. When you rise, you are no longer common.',
  options:[
    { label:'Rise, and serve with honor.', effects:{ tierSet:2, profession:'noble', prestige:40, log:'Raised to the gentry for valor!' } }
  ]},
{ id:'loot_temptation', title:'The Sacked Town',
  trigger:{ professions:['soldier'], realmAtWar:true, flags:['seen_battle'], chance:0.3 }, wartime:true, weight:8, cooldown:6,
  text:'The town has fallen and discipline with it. Doors splinter; men stagger past with armfuls of plate and cloth. The {temple} stands unguarded.',
  options:[
    { label:'Take your share of houses — not the {temple}.', effects:{ gold:10, piety:-2 } },
    { label:'Strip the {temple} too.', effects:{ gold:25, piety:-15, prestige:-5, custom:'loot_item' } },
    { label:'Guard the {temple} door.', effects:{ piety:12, prestige:6, opinion:{role:'priest', amt:10} } }
  ]},
{ id:'wardeath_friend', title:'An Empty Place at the Fire',
  trigger:{ professions:['soldier'], flags:['seen_battle'], hasRole:'friend', chance:0.15 }, wartime:true, weight:5, once:true,
  text:'{friend} does not answer the roll. You find them at last among the rows of the dead, looking almost surprised.',
  options:[
    { label:'Dig the grave yourself.', effects:{ killRole:'friend', piety:5, health:-1, log:'Buried a friend after battle.' } },
    { label:'Drink until the face blurs.', require:{ religionGroups:['christian','pagan','jewish'] }, effects:{ killRole:'friend', gold:-2 } },
    { label:'Keep vigil by the grave until dawn.', require:{ religionGroups:['muslim'] }, effects:{ killRole:'friend', piety:2 } }
  ]},
{ id:'sergeant', title:'Stripes of a Sort',
  trigger:{ professions:['soldier'], flags:['seen_battle'], prestigeMin:30, chance:0.3 }, wartime:true, weight:8, once:true,
  text:'The captain needs a steady hand over the new levies. Your name is spoken.',
  options:[
    { label:'Take the post.', effects:{ prestige:8, gold:2, skills:{mar:1}, setFlag:'sergeant', log:'Promoted to sergeant.' } },
    { label:'Responsibility is a slower way to die.', effects:{ } }
  ]},

/* ================= THE CLOTH ================= */
{ id:'scriptorium', title:'Ink and Vellum',
  trigger:{ professions:['monk'], religionGroups:['christian'], chance:0.5 }, weight:10, cooldown:4,
  text:'Cold fingers, aching eyes, and the slow miracle of letters spreading down the page. The abbot watches your copying with interest.',
  options:[
    { label:'Perfect your hand.', effects:{ skills:{lea:1}, addTraitOnce:'literate', piety:2 } },
    { label:'Illuminate the margins with beasts.', chance:0.6,
      success:{ text:'Your golden lions delight the abbot.', effects:{ prestige:5, opinion:{role:'lord', amt:10}, skills:{lea:1} } },
      failure:{ text:'“Is that a DOG in the Gospel?” Scraping vellum for a month.', effects:{ piety:1 } } }
  ]},
{ id:'tend_sick', title:'The Infirmary',
  trigger:{ professions:['monk','priest'], chance:0.3 }, weight:8, cooldown:6,
  text:'Fever season fills the infirmary. The sick call for water, for prayers, for their mothers.',
  options:[
    { label:'Nurse them day and night.', chance:0.8,
      success:{ text:'Many recover, blessing your name.', effects:{ piety:10, prestige:4, skills:{lea:1} } },
      failure:{ text:'You catch what they carry.', effects:{ piety:8, health:-2, setFlag:'ill' } } },
    { label:'Pray for them from a safe distance.', effects:{ piety:2 } }
  ]},
{ id:'relic_found', title:'Bones in the Crypt',
  trigger:{ professions:['monk','priest'], religionGroups:['christian'], chance:0.08 }, weight:4, once:true,
  text:'Workmen shoring the crypt uncover an ancient coffer: bones, a rusted ring, a scrap of cloth. The prior’s eyes gleam. Relics draw pilgrims — and pilgrims draw silver.',
  options:[
    { label:'Declare them a saint’s remains.', chance:0.6,
      success:{ text:'Miracles are soon reported. Pilgrims flood in, and the house prospers — as do you.', effects:{ gold:15, piety:10, prestige:10, log:'Discovered holy relics.' } },
      failure:{ text:'The bishop’s examiner declares them sheep bones. Humiliation.', effects:{ piety:-8, prestige:-8 } } },
    { label:'Bury them again with honest prayers.', effects:{ piety:8 } }
  ]},
{ id:'made_abbot', title:'The Abbot’s Chair',
  trigger:{ professions:['monk'], religionGroups:['christian'], pietyMin:80, leaMin:8, chance:0.3 }, weight:10, once:true,
  text:'The old abbot has gone to his reward. The brothers gather to choose a successor, and many eyes turn to you.',
  options:[
    { label:'Accept the burden.', chance:0.65,
      success:{ text:'The house is yours to rule — lands, tithes, and souls.', effects:{ tierSet:2, prestige:30, piety:10, setFlag:'abbot', log:'Elected abbot!' } },
      failure:{ text:'The prior’s faction outvotes yours. You remain a brother among brothers.', effects:{ piety:3 } } },
    { label:'Decline in humility.', effects:{ piety:10, addTrait:'humble' } }
  ]},
{ id:'bishops_mitre', title:'A Mitre Within Reach',
  trigger:{ professions:['monk','priest'], religionGroups:['christian'], flags:['abbot'], pietyMin:150, chance:0.2 }, weight:8, once:true,
  text:'The bishop’s seat stands empty, and the metropolitan hints it can be yours — for merit, or for a “gift to the church” of two hundred gold.',
  options:[
    { label:'Pay the gift.', require:{ goldMin:200 },
      effects:{ gold:-200, tierSet:3, prestige:50, piety:-10, setFlag:'bishop', log:'Bought the bishop’s mitre.' } },
    { label:'Trust to merit alone.', chance:0.35,
      success:{ text:'Against all cynics, holiness prevails. The mitre is yours.', effects:{ tierSet:3, prestige:60, piety:20, setFlag:'bishop', log:'Elevated to bishop!' } },
      failure:{ text:'A richer man in poorer cloth is chosen.', effects:{ piety:5 } } },
    { label:'Refuse the game entirely.', effects:{ piety:12 } }
  ]},
{ id:'heresy_whiff', title:'Dangerous Questions',
  trigger:{ professions:['monk','priest'], leaMin:6, chance:0.1 }, weight:4, once:true,
  text:'Late study breeds late thoughts. In the margin of an old text you have written something that, read coldly, smells of heresy. Another hand has underlined it.',
  options:[
    { label:'Burn the page and recant privately.', effects:{ piety:3 } },
    { label:'Defend the idea openly.', chance:0.4,
      success:{ text:'Your argument dazzles the examiners; the notion is ruled orthodox after all.', effects:{ prestige:12, piety:5, skills:{lea:2} } },
      failure:{ text:'You are made to do public penance, barefoot in the snow.', effects:{ piety:-10, prestige:-10, health:-1 } } }
  ]},

/* ================= THE PATH OF LEARNING (Muslim lands) ================= */
{ id:'madrasa_study', title:'Reed Pen and Paper',
  trigger:{ professions:['monk','priest'], religionGroups:['muslim'], chance:0.5 }, weight:10, cooldown:4,
  text:'Cool tiles, murmured recitation, and the scratch of reed pens. Your calligraphy improves line by line, and the master of the madrasa watches your progress with interest.',
  options:[
    { label:'Perfect your hand.', effects:{ skills:{lea:1}, addTraitOnce:'literate', piety:2 } },
    { label:'Copy the great works of law and medicine.', chance:0.6,
      success:{ text:'Your copies are precise and sought after. Scholars speak your name.', effects:{ prestige:5, gold:3, skills:{lea:1} } },
      failure:{ text:'A blot of ink ruins a week’s work. Begin again, with patience.', effects:{ piety:1 } } }
  ]},
{ id:'made_qadi', title:'The Qadi’s Seat',
  trigger:{ professions:['monk','priest'], religionGroups:['muslim'], pietyMin:80, leaMin:8, chance:0.3 }, weight:10, once:true,
  text:'The old qadi has died, and the district needs a judge — a man of learning, piety, and patience. The notables gather, and many eyes turn to you.',
  options:[
    { label:'Accept the burden of judgment.', chance:0.65,
      success:{ text:'The seat is yours — disputes, deeds, and dowries, all beneath your seal.', effects:{ tierSet:2, prestige:30, piety:10, setFlag:'qadi', log:'Appointed qadi!' } },
      failure:{ text:'A rival with better connections is chosen. Your time will come.', effects:{ piety:3 } } },
    { label:'Decline in humility.', effects:{ piety:10, addTrait:'humble' } }
  ]},
{ id:'chief_qadi', title:'The Emir’s Justice',
  trigger:{ professions:['monk','priest'], religionGroups:['muslim'], flags:['qadi'], pietyMin:150, chance:0.2 }, weight:8, once:true,
  text:'The emir requires a chief judge for the whole province, and hints the appointment can be yours — for merit, or for a “gift to the treasury” of two hundred gold.',
  options:[
    { label:'Pay the gift.', require:{ goldMin:200 },
      effects:{ gold:-200, tierSet:3, prestige:50, piety:-10, setFlag:'chief_qadi', log:'Bought the chief judgeship.' } },
    { label:'Trust to merit alone.', chance:0.35,
      success:{ text:'Against all cynics, learning prevails. The judgeship is yours.', effects:{ tierSet:3, prestige:60, piety:20, setFlag:'chief_qadi', log:'Raised to Grand Qadi!' } },
      failure:{ text:'A richer man with poorer Arabic is chosen.', effects:{ piety:5 } } },
    { label:'Refuse the game entirely.', effects:{ piety:12 } }
  ]},
{ id:'poetry_quarrel', title:'A Duel of Verses',
  trigger:{ religionGroups:['muslim'], minAge:16, chance:0.1 }, weight:4, cooldown:12,
  text:'At the evening majlis a braggart recites verses mocking your family — polished, cruel, and already being repeated with delight.',
  options:[
    { label:'Answer with sharper verses of your own.', chance:0.5,
      success:{ text:'Your reply cuts twice as deep. The gathering roars; his shame will outlive him.', effects:{ prestige:6, skills:{dip:1} } },
      failure:{ text:'You stumble on the meter. The laughter is not with you.', effects:{ prestige:-4 } } },
    { label:'Smile and let the verses die.', effects:{ } },
    { label:'Answer with your fists.', chance:0.55,
      success:{ text:'Poetry has its place; so does a good grip. He recants, wheezing.', effects:{ prestige:3, skills:{mar:1} } },
      failure:{ text:'His friends pull you apart — after the worst of it.', effects:{ health:-1, prestige:-2 } } }
  ]},
{ id:'hawk_with_emir', title:'The Emir’s Hawking',
  trigger:{ tierMin:2, tierMax:2, chance:0.25, professions:['noble'], religionGroups:['muslim'] }, weight:8, cooldown:6,
  text:'An invitation to ride with {lord} and his falcons — swift horses, gazelle on the plain, and the quiet talk between great men that shapes small futures.',
  options:[
    { label:'Ride well, speak better.', effects:{ opinion:{role:'lord', amt:10}, skills:{dip:1} } },
    { label:'Loose your own falcon first.', chance:0.5,
      success:{ text:'Your bird stoops first and truest. Bold — perhaps too bold. But men saw it.', effects:{ prestige:10, opinion:{role:'lord', amt:-3}, skills:{mar:1} } },
      failure:{ text:'Your falcon vanishes over the ridge with your dignity.', effects:{ prestige:-4, gold:-3 } } }
  ]},
{ id:'friday_khutba', title:'Words After Prayer',
  trigger:{ religionGroups:['muslim'], chance:0.2 }, weight:4, cooldown:12,
  text:'{priest} preaches the Friday khutba with unusual fire — of wealth, its duties, and the scales that weigh every deed.',
  options:[
    { label:'Take it to heart.', effects:{ piety:5, opinion:{role:'priest', amt:5} } },
    { label:'Let your mind wander to business.', effects:{ opinion:{role:'priest', amt:-5}, skills:{ste:1} } }
  ]},

/* ================= GENTRY (tier 2) ================= */
{ id:'melee_games', title:'The War-Games',
  trigger:{ tierMin:2, tierMax:2, chance:0.3, professions:['noble'] }, weight:10, cooldown:6,
  text:'{lord} holds a gathering of arms: mock battle with blunted steel, wagers, and every ambitious sword in the province watching.',
  options:[
    { label:'Fight in the melee.', chance:'battle',
      success:{ text:'You unhorse two men and yield to none. The prize purse and the glory are yours.', effects:{ gold:12, prestige:15, skills:{mar:1}, opinion:{role:'lord', amt:8} } },
      failure:{ text:'A mace you never saw ends your day early.', effects:{ health:-2, prestige:2 } } },
    { label:'Wager on the champion.', require:{ goldMin:5 }, chance:0.5,
      success:{ text:'Your man carries the field.', effects:{ gold:8 } },
      failure:{ text:'Your man eats mud in the first pass.', effects:{ gold:-5 } } }
  ]},
{ id:'hunt_with_lord', title:'The Lord’s Hunt',
  trigger:{ tierMin:2, tierMax:2, chance:0.25, professions:['noble'], religionGroups:['christian','pagan','jewish'] }, weight:8, cooldown:6,
  text:'An invitation to ride with {lord}’s hunt — hounds, horns, and the talk between great men that shapes small futures.',
  options:[
    { label:'Ride well, speak better.', effects:{ opinion:{role:'lord', amt:10}, skills:{dip:1} } },
    { label:'Take the boar yourself.', chance:0.5,
      success:{ text:'Your spear takes the boar before the lord’s. Bold — perhaps too bold. But men saw it.', effects:{ prestige:10, opinion:{role:'lord', amt:-3}, skills:{mar:1} } },
      failure:{ text:'The boar takes exception. You are carried home on a litter.', effects:{ health:-2, addTrait:'scarred' } } }
  ]},
{ id:'grant_of_barony', title:'A Banner of Your Own',
  trigger:{ tierMin:2, tierMax:2, roleOpinionAbove:{role:'lord', value:60}, prestigeMin:120, chance:0.3 }, weight:15, once:true,
  text:'{lord} summons you before the hall. “You have served beyond any debt. The vacant lands and tower shall be yours — swear to me, and hold them as my sworn baron.”',
  options:[
    { label:'Kneel and swear.', effects:{ tierSet:3, prestige:60, log:'Granted a barony — a lord at last!' } },
    { label:'Ask instead for gold.', effects:{ gold:80, opinion:{role:'lord', amt:-10} } }
  ]},
{ id:'feud_gentry', title:'An Affair of Honor',
  trigger:{ tierMin:2, hasRole:'rival', roleOpinionBelow:{role:'rival', value:-40}, chance:0.2 }, weight:6, cooldown:12,
  text:'{rival} insults your house before witnesses. Among the gentry, such words are answered with steel or with cunning — never with silence.',
  options:[
    { label:'Demand a duel.', chance:'battle',
      success:{ text:'Steel rings; your point finds their shoulder. Honor is satisfied, loudly.', effects:{ prestige:15, opinion:{role:'rival', amt:-10}, log:'Won a duel of honor.' } },
      failure:{ text:'Their blade is quicker. You yield, bleeding.', effects:{ health:-2, prestige:-10, addTrait:'scarred' } } },
    { label:'Ruin them quietly instead.', chance:0.5,
      success:{ text:'Debts called, rumors seeded — within a year their fortunes crumble.', effects:{ skills:{int:2}, prestige:5, opinion:{role:'rival', amt:-20} } },
      failure:{ text:'Your scheming is uncovered and named for what it is.', effects:{ prestige:-12 } } },
    { label:'Laugh it off.', effects:{ prestige:-5 } }
  ]},

/* ================= MORE STATION LIFE ================= */
{ id:'apprentice_trouble', title:'The Apprentice’s Mistake',
  trigger:{ professions:['craftsman'], chance:0.2 }, weight:6, cooldown:8,
  text:'A week of work lies in pieces on the floor, and your apprentice stands over it, white as chalk.',
  options:[
    { label:'Make him redo it beside you.', effects:{ skills:{ste:1}, prestige:1 } },
    { label:'Take it out of his hide.', effects:{ popularOpinion:-2, prestige:-1 } },
    { label:'“I broke worse at your age.”', effects:{ popularOpinion:2, gold:-2 } }
  ]},
{ id:'iron_shortage', title:'No Iron at Any Price',
  trigger:{ professions:['craftsman'], chance:0.15 }, weight:5, cooldown:12,
  text:'The ore caravans have not come — war or weather, nobody knows. Every smith and joiner in town is bidding for the same scraps.',
  options:[
    { label:'Pay the famine price.', require:{ goldMin:6 }, effects:{ gold:-6, skills:{ste:1} } },
    { label:'Make do with poorer stuff.', chance:0.5,
      success:{ text:'Nobody notices the difference. This season, at least.', effects:{ gold:2 } },
      failure:{ text:'A customer notices. Loudly. In the market.', effects:{ prestige:-4 } } },
    { label:'Let the bench stand idle.', effects:{ gold:-2 } }
  ]},
{ id:'partner_offer', title:'A Partner from Far Off',
  trigger:{ professions:['merchant'], goldMin:15, chance:0.15 }, weight:5, cooldown:12,
  text:'A foreign merchant — silk cuffs, careful eyes — proposes a joint venture: your local knowledge, his distant markets.',
  options:[
    { label:'Shake on it. (risk 15 gold)', chance:0.6,
      success:{ text:'His letters prove good as gold. The partnership pays handsomely.', effects:{ gold:12, skills:{dip:1, ste:1} } },
      failure:{ text:'The letters stop coming. So does the money.', effects:{ gold:-15 } } },
    { label:'Trade information only.', effects:{ skills:{ste:1}, worldNews:true } },
    { label:'Decline politely.', effects:{ } }
  ]},
{ id:'wreck_auction', title:'Salvage on the Block',
  trigger:{ professions:['merchant'], goldMin:8, chance:0.15 }, weight:5, cooldown:10,
  text:'A storm-broken cargo goes under the hammer, sight unseen: sodden bales that might be ruined wool — or sea-stained silk.',
  options:[
    { label:'Bid on the lot. (8 gold)', chance:0.5,
      success:{ text:'Under the ruined top layer: silk, barely touched.', effects:{ gold:10, skills:{ste:1} } },
      failure:{ text:'Wool. Rotten. All of it.', effects:{ gold:-8 } } },
    { label:'Watch others gamble.', effects:{ skills:{ste:1} } }
  ]},
{ id:'sparring_challenge', title:'The Old Sergeant’s Wager',
  trigger:{ professions:['soldier'], chance:0.2 }, weight:6, cooldown:8,
  text:'A grizzled sergeant taps your shoulder with a practice blade: “Young ones always think it’s about strength. Care to learn otherwise, for a wager?”',
  options:[
    { label:'Take the wager. (2 gold)', require:{ goldMin:2 }, chance:'battle',
      success:{ text:'You catch him older and slower than his stories. The garrison hoots; he pays with a grin.', effects:{ gold:2, prestige:2, skills:{mar:1} } },
      failure:{ text:'It is not about strength. You pay up, aching in new places — and wiser.', effects:{ gold:-2, skills:{mar:1} } } },
    { label:'Watch him school someone else.', effects:{ skills:{mar:1} } }
  ]},
{ id:'quiet_garrison', title:'Long Watches',
  trigger:{ professions:['soldier'], realmAtWar:false, chance:0.2 }, weight:5, cooldown:8,
  text:'No war, no drills worth the name — just walls, weather, and wages. A soldier’s enemy in peacetime is the calendar.',
  options:[
    { label:'Keep your edge regardless.', effects:{ skills:{mar:1} } },
    { label:'Hire out as a caravan guard.', chance:0.7,
      success:{ text:'Dull roads, good pay.', effects:{ gold:4 } },
      failure:{ text:'The caravan master pays late and short.', effects:{ gold:1 } } },
    { label:'Court the quartermaster’s favor.', effects:{ skills:{dip:1}, opinion:{role:'lord', amt:3} } }
  ]},
{ id:'judgment_at_door', title:'Two Families, One Gate',
  trigger:{ professions:['monk','priest'], chance:0.2 }, weight:6, cooldown:8,
  text:'Two families arrive at the {temple} gate with one dispute, three witnesses, and absolute certainty on both sides. They will take your word as {god}’s.',
  options:[
    { label:'Hear both sides fully.', chance:0.65,
      success:{ text:'Your judgment threads the needle; both leave grumbling equally — which is to say, satisfied.', effects:{ piety:5, prestige:3, skills:{lea:1} } },
      failure:{ text:'Your ruling pleases one house and makes an enemy of the other.', effects:{ piety:2, popularOpinion:-3 } } },
    { label:'Send them to the lord’s court.', effects:{ opinion:{role:'lord', amt:3}, piety:-2 } }
  ]},
{ id:'gentry_feuding_neighbors', title:'A Feud on Your Doorstep',
  trigger:{ tierMin:2, tierMax:2, professions:['noble'], chance:0.15 }, weight:6, cooldown:12,
  text:'Two neighboring houses have fallen out over a mill-race, and both send riders to your hall the same afternoon, seeking your name for their cause.',
  options:[
    { label:'Broker a peace between them.', chance:0.55,
      success:{ text:'Hard words soften across your table. Both houses owe you now.', effects:{ prestige:6, skills:{dip:2} } },
      failure:{ text:'The feud finds a second wind — with your name tangled in it.', effects:{ prestige:-4 } } },
    { label:'Back the stronger house.', effects:{ prestige:2, opinion:{role:'lord', amt:3} } },
    { label:'Keep clear of it.', effects:{ } }
  ]}
);
