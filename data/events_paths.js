/* =========================================================================
   Fallowborn — PATH EVENTS: craft & trade, soldiering, the cloth,
   and the landed gentry (tier 2).
   ========================================================================= */
window.FBDATA = window.FBDATA || {};
FBDATA.events = FBDATA.events || [];

FBDATA.events.push(

/* ================= CRAFT & TRADE ================= */
{ id:'guild_monopoly_petition', title:'A Monopoly Petition',
  trigger:{ never:true },
  text:'Before {grantor}, you petition for exclusive privilege across your whole profession. The charter would last {years} years and add {enterprisePercent}% profit to every matching staffed family enterprise.',
  options:[
    { label:'Pay {money:25} for the seal.', require:{ goldMin:25 },
      desc:'Spend {money:25}; the charter is guaranteed.',
      effects:{ gold:-25, custom:'guild_monopoly_paid' } },
    { label:'Persuade the grantor.',
      desc:'A {persuasionPercent}% Diplomacy chance: success grants the charter and 5 prestige; failure costs 5 prestige and lowers Standing with the grantor by 8.',
      chance:'skill_dip',
      success:{
        text:'Your case carries the hall. {grantor} orders the charter sealed.',
        effects:{ custom:'guild_monopoly_persuade_success' }
      },
      failure:{
        text:'The court is unmoved, and {grantor} takes the pressure as an insult.',
        effects:{ custom:'guild_monopoly_persuade_failure' }
      } },
    { label:'Withdraw the petition.',
      desc:'Keep your resources; the day and 360-day petition interval remain spent.',
      effects:{} }
  ]},
{ id:'guild_entry', title:'The Guild Bench',
  trigger:{ professions:['craftsman'], tierMin:1, chance:0.3, notFlags:['guild_member'] }, weight:10,
  text:{ default:'The masters of the craft drink together, set prices together, and bury each other’s dead. A seat at their bench costs silver — and buys a future.',
    muslim:'The masters of the craft eat together, set prices together, and bury each other’s dead. A seat at their bench costs silver — and buys a future.' },
  options:[
    { label:'Pay the entry fee. ({money:15})', require:{ goldMin:15 }, desc:'Silver buys a name the craft will honor.', effects:{ gold:-15, setFlag:'guild_member', prestige:8, log:'Joined the craft guild.' } },
    { label:'Work outside the guild.', desc:'Freedom, and no friends at the bench.', effects:{ } }
  ]},
{ id:'masterwork', title:'The Masterwork',
  trigger:{ professions:['craftsman'], flags:['guild_member'], chance:0.2 }, weight:8, cooldown:12,
  text:'A commission worthy of your best: fine work for a great house. Succeed, and your name travels farther than you ever have.',
  options:[
    { label:'Labor over it for months.', desc:'Patient work could make your name — or waste the season.', chance:'skill_ste',
      success:{ text:'It is the finest thing you have ever made. Word spreads.', effects:{ gold:20, prestige:12, skills:{ste:1}, log:'Completed a masterwork.' } },
      failure:{ text:'A flaw in the final hour ruins it. The patron pays half, scowling.', effects:{ gold:5, prestige:-4 } } }
  ]},
{ id:'caravan_venture', title:'The Caravan',
  trigger:{ professions:['merchant','craftsman'], tierMin:1, goldMin:20, chance:0.35,
    custom:'finance_can_invest' }, weight:10, cooldown:6,
  text:'A caravan is forming for the long route — spice, cloth, and salt. Shares are open to any with silver and a strong stomach for risk.',
  options:[
    { label:'Stake {money:20}.', desc:'The stake leaves now; the partnership returns in four seasons, if it returns at all.',
      effects:{ custom:'finance_trade_20' } },
    { label:'Stake {money:50}.', require:{ goldMin:50 }, desc:'A larger four-season partnership risks more coin on the same distant roads.',
      effects:{ custom:'finance_trade_50' } },
    { label:'Keep your coin at home.', desc:'No risk, no profit, no stories.', effects:{ } }
  ]},
{ id:'shop_fire', title:'Fire!',
  trigger:{ professions:['craftsman','merchant'], tierMin:1, chance:0.08 }, weight:5, cooldown:20,
  text:'You wake to shouting and an orange glow. Fire is eating through the workshop quarter, leaping thatch to thatch.',
  options:[
    { label:'Fight the flames for your stock.', desc:'Brave the fire to save your stock — or lose more trying.', chance:0.5,
      success:{ text:'Scorched but standing. You saved the most of it.', effects:{ gold:-5, health:-1 } },
      failure:{ text:'You save your skin and little else.', effects:{ gold:-15, health:-1 } } },
    { label:'Help the neighbors first.', desc:'Let yours burn; the town remembers who came.', effects:{ gold:-10, prestige:8, opinion:{role:'friend', amt:15} } }
  ]},
{ id:'moneylending', title:'Silver Breeds Silver',
  trigger:{ professions:['merchant'], goldMin:30, chance:0.25 }, weight:8, cooldown:8,
  text:'A landowner needs thirty pieces before harvest and will pledge his mill as surety. Usury is frowned upon — profit rarely is.',
  options:[
    { label:'Lend at hard interest.', desc:'Good profit, poor prayers — and his mill if he fails.', chance:0.7,
      success:{ text:'Repaid in full, and handsomely.', effects:{ gold:12, piety:-3, skills:{ste:1} } },
      failure:{ text:'He defaults — but the mill pledge makes you whole, and his kin blacken your name through the market.', effects:{ gold:5, popularOpinion:-2 } } },
    { label:'Lend as a kindness.', desc:'A small loss for a warm reputation.', effects:{ gold:-2, piety:5, prestige:5 } },
    { label:'Decline.', desc:'Let some other purse take the risk.', effects:{ } }
  ]},
{ id:'become_merchant', title:'From Bench to Ledger',
  trigger:{ professions:['craftsman'], tierMin:1, goldMin:40, chance:0.2 }, weight:6, once:true,
  text:'You know the roads now, the prices, the men who move goods. Why make one chair when you can sell a hundred?',
  options:[
    { label:'Take up the merchant’s life.', desc:'Trade the workbench for the open road.', effects:{ profession:'merchant', log:'Became a merchant.' } },
    { label:'Stay true to the craft.', desc:'The honest work you know, and nothing more.', effects:{ } }
  ]},
{ id:'town_elder', title:'A Voice in the Town',
  trigger:{ professions:['merchant','craftsman','administration'], tierMin:1, tierMax:2,
    prestigeMin:60, notFlags:['councilman'], chance:0.25 }, weight:8, cooldown:8,
  text:'The townsfolk mutter that the council needs a man of sense — your name comes up more than once.',
  options:[
    { label:'Stand for the council.', desc:'A seat on the bench, if the town will have you.', chance:0.6,
      success:{ text:'They raise you to the council bench. Small power, but power.', effects:{ prestige:15, setFlag:'councilman', custom:'local_council_elected', log:'Elected to the town council.' } },
      failure:{ text:'An older name edges you out. Next time.', effects:{ prestige:3 } } },
    { label:'Trade needs no title.', desc:'Coin over ceremony.', effects:{ gold:3 } }
  ]},

/* ================= SOLDIERING ================= */
{ id:'first_muster', title:'The Muster Field',
  trigger:{ professions:['soldier'], chance:0.4, notFlags:['seen_battle'] }, wartime:true, weight:10, cooldown:6,
  text:'Drill, drill, and drill again. The sergeant’s stick finds every lazy elbow. “Sloppy lines die,” he says. “Neat lines kill.”',
  options:[
    { label:'Sweat now, live later.', desc:'Hard drill today keeps you breathing tomorrow.', effects:{ skills:{mar:1}, health:0 } },
    { label:'Dice with the veterans instead.', desc:'Their coin and their stories, if the dice are kind.', chance:0.5,
      success:{ text:'You win their coin and, better, their stories.', effects:{ gold:3, skills:{int:1} } },
      failure:{ text:'They take your pay and laugh you back to the drill-yard.', effects:{ gold:-3 } } }
  ]},
{ id:'first_battle', title:'The Shield-Wall',
  trigger:{ professions:['soldier'], realmAtWar:true, chance:0.5 }, wartime:true, weight:15, cooldown:4,
  text:'Horns. Mud. A line of strangers who mean to kill you, close enough now to see their teeth. The man beside you is praying; the man beyond him is laughing.',
  options:[
    { label:'Stand in the line.', desc:'Glory and scars both wait in the shield-wall.', chance:'battle',
      success:{ text:'The wall holds. The enemy breaks first, and you are alive — alive! — with loot on the field.', effects:{ gold:8, prestige:10, skills:{mar:1}, setFlag:'seen_battle', addTrait:'veteran', log:'Survived the shield-wall.' } },
      failure:{ text:'The line buckles. You take a blade and are dragged from the press, bleeding.', effects:{ health:-3, setFlag:'seen_battle', addTrait:'scarred', prestige:3 } } },
    { label:'Hang back among the baggage.', desc:'Live quiet, and let men name it.', effects:{ prestige:-5, addTrait:'craven' } }
  ]},
{ id:'save_the_lord', title:'A Lord Unhorsed',
  trigger:{ professions:['soldier'], flags:['seen_battle'], realmAtWar:true, chance:0.2 }, wartime:true, weight:8, once:true,
  text:'Through the din you see it: {lord} down, horse screaming, enemies closing like crows. No one else is near enough. You are.',
  options:[
    { label:'Charge to the rescue.', desc:'Risk your neck; a grateful lord pays for years.', chance:0.55,
      success:{ text:'You stand over the fallen lord, roaring, until help arrives. He grips your arm: “I will not forget this.”', effects:{ prestige:20, opinion:{role:'lord', amt:50}, skills:{mar:1}, setFlag:'lords_favor', log:'Saved the lord’s life in battle!' } },
      failure:{ text:'You reach him — then something bursts against your helm. You wake in the surgeons’ tent, honored and broken.', effects:{ health:-3, prestige:12, opinion:{role:'lord', amt:25}, addTrait:'scarred' } } },
    { label:'A dead lord pays no wages. Keep formation.', desc:'Cold sense — and men will see that it was cold.', effects:{ prestige:-2 } }
  ]},
{ id:'knighted', title:'Raised Up',
  trigger:{ professions:['soldier'], flags:['lords_favor'], tierMax:1, realmAtWar:true, chance:0.5 }, wartime:true, weight:20,
  text:'Before the assembled retinue, {lord} bids you kneel. A sword touches your shoulder. When you rise, you are no longer common.',
  options:[
    { label:'Rise, and serve with honor.', desc:'The first step out of the mud. Take it.', effects:{ tierSet:2, profession:'noble', prestige:40, log:'Raised to the gentry for valor!' } }
  ]},
{ id:'loot_temptation', title:'The Sacked Town',
  trigger:{ professions:['soldier'], realmAtWar:true, flags:['seen_battle'], chance:0.3 }, wartime:true, weight:8, cooldown:6,
  text:'The town has fallen and discipline with it. Doors splinter; men stagger past with armfuls of plate and cloth. The {temple} stands unguarded.',
  options:[
    { label:'Take your share of houses — not the {temple}.', desc:'Honest plunder, if plunder can be honest.', effects:{ gold:10, piety:-2 } },
    { label:'Strip the {temple} too.', desc:'Rich pickings, with {god} watching.', effects:{ gold:25, piety:-15, prestige:-5, custom:'loot_item' } },
    { label:'Guard the {temple} door.', desc:'No coin in it, but the priests will remember.', effects:{ piety:12, prestige:6, opinion:{role:'priest', amt:10} } }
  ]},
{ id:'wardeath_friend', title:'An Empty Place at the Fire',
  trigger:{ professions:['soldier'], flags:['seen_battle'], hasRole:'friend', chance:0.15 }, wartime:true, weight:5, once:true,
  text:'{friend} does not answer the roll. You find them at last among the rows of the dead, looking almost surprised.',
  options:[
    { label:'Dig the grave yourself.', desc:'Hard labor, and a little peace beside it.', effects:{ killRole:'friend', piety:5, health:-1, log:'Buried a friend after battle.' } },
    { label:'Drink until the face blurs.', require:{ religionGroups:['christian','pagan','jewish'] }, desc:'A few coins to drown the picture.', effects:{ killRole:'friend', gold:-2 } },
    { label:'Keep vigil by the grave until dawn.', require:{ religionGroups:['muslim'] }, desc:'A cold night’s watch for a warm friend.', effects:{ killRole:'friend', piety:2 } }
  ]},
{ id:'sergeant', title:'Stripes of a Sort',
  trigger:{ professions:['soldier'], flags:['seen_battle'], prestigeMin:30, chance:0.3 }, wartime:true, weight:8, once:true,
  text:'The captain needs a steady hand over the new levies. Your name is spoken.',
  options:[
    { label:'Take the post.', desc:'More coin, more blame, a louder voice.', effects:{ prestige:8, gold:2, skills:{mar:1}, setFlag:'sergeant', log:'Promoted to sergeant.' } },
    { label:'Responsibility is a slower way to die.', desc:'Stay a spearman; let others carry the worry.', effects:{ } }
  ]},

/* ================= THE CLOTH ================= */
{ id:'scriptorium', title:'Ink and Vellum',
  trigger:{ professions:['monk'], religionGroups:['christian'], chance:0.5 }, weight:10, cooldown:4,
  text:'Cold fingers, aching eyes, and the slow miracle of letters spreading down the page. The abbot watches your copying with interest.',
  options:[
    { label:'Perfect your hand.', desc:'Steady work that sharpens the mind.', effects:{ skills:{lea:1}, addTraitOnce:'literate', piety:2 } },
    { label:'Illuminate the margins with beasts.', desc:'Golden lions could delight the abbot — or scandalize him.', chance:0.6,
      success:{ text:'Your golden lions delight the abbot.', effects:{ prestige:5, opinion:{role:'lord', amt:10}, skills:{lea:1} } },
      failure:{ text:'“Is that a DOG in the Gospel?” Scraping vellum for a month.', effects:{ piety:1 } } }
  ]},
{ id:'tend_sick', title:'The Infirmary',
  trigger:{ professions:['monk','priest'], chance:0.3 }, weight:8, cooldown:6,
  text:'Fever season fills the infirmary. The sick call for water, for prayers, for their mothers.',
  options:[
    { label:'Nurse them day and night.', desc:'Their gratitude is likely; their fevers are catching.', chance:0.8,
      success:{ text:'Many recover, blessing your name.', effects:{ piety:10, prestige:4, skills:{lea:1} } },
      failure:{ text:'You catch what they carry.', effects:{ piety:8, health:-2, setFlag:'ill' } } },
    { label:'Pray for them from a safe distance.', desc:'Pious, prudent, and a little hollow.', effects:{ piety:2 } }
  ]},
{ id:'relic_found', title:'Bones in the Crypt',
  trigger:{ professions:['monk','priest'], religionGroups:['christian'], chance:0.08 }, weight:4, once:true,
  text:'Workmen shoring the crypt uncover an ancient coffer: bones, a rusted ring, a scrap of cloth. The prior’s eyes gleam. Relics draw pilgrims — and pilgrims draw silver.',
  options:[
    { label:'Declare them a saint’s remains.', desc:'Pilgrims and silver — unless the bishop counts sheep bones.', chance:0.6,
      success:{ text:'Miracles are soon reported. Pilgrims flood in, and the house prospers — as do you.', effects:{ gold:15, piety:10, prestige:10, log:'Discovered holy relics.' } },
      failure:{ text:'The bishop’s examiner declares them sheep bones. Humiliation.', effects:{ piety:-8, prestige:-8 } } },
    { label:'Bury them again with honest prayers.', desc:'No profit, but a clear conscience.', effects:{ piety:8 } }
  ]},
{ id:'made_abbot', title:'The Abbot’s Chair',
  trigger:{ never:true },
  text:'The old abbot has gone to his reward. The brothers gather to choose a successor, and many eyes turn to you.',
  options:[
    { label:'Accept the burden.', desc:'The brothers may raise you — or close ranks against you.', chance:0.65,
      success:{ text:'The house is yours to rule — lands, tithes, and souls.', effects:{ tierSet:2, prestige:30, piety:10, setFlag:'abbot', log:'Elected abbot!' } },
      failure:{ text:'The prior’s faction outvotes yours. You remain a brother among brothers.', effects:{ piety:3 } } },
    { label:'Decline in humility.', desc:'Piety grows fastest out of office.', effects:{ piety:10, addTrait:'humble' } }
  ]},
{ id:'bishops_mitre', title:'A Mitre Within Reach',
  trigger:{ never:true },
  text:'After the lawful appointment fails, an intermediary returns by a quieter door. For {money:200}, he says, objections can vanish and the mitre can still be yours.',
  options:[
    { label:'Buy the office. ({money:200})', require:{ goldMin:200 },
      desc:'Gain the see, but lose 40 piety, 20 Standing with the Pope, 10 Common Voice, and bear a permanent Simoniac reputation.',
      effects:{ gold:-200, piety:-40, papalOpinion:-20, popularOpinion:-10,
        custom:'bishop_simony_accept', log:'Bought the bishop’s mitre.' } },
    { label:'Expose the intermediary.', desc:'Keep the appointment lost, but put the offer before Rome.',
      effects:{ piety:10, papalOpinion:5, custom:'bishop_simony_clear' } },
    { label:'Refuse and say nothing.', desc:'Keep clean hands and leave the failed petition behind.',
      effects:{ piety:5, custom:'bishop_simony_clear' } }
  ]},
{ id:'bishop_visit_diocese', title:'A Circuit of the Diocese',
  trigger:{ never:true },
  text:'Road dust, parish bells, crowded porches: the diocese waits to see what kind of bishop has come among it.',
  options:[
    { label:'Make a pastoral circuit.', desc:'Hear grievances, bless children, and be seen.',
      effects:{ piety:8, popularOpinion:6 } },
    { label:'Inspect the clergy.', desc:'Correct discipline and learn how the parishes truly work.',
      effects:{ piety:6, papalOpinion:5, popularOpinion:-3, skills:{lea:1} } },
    { label:'Receive the local notables.', desc:'Hospitality turns acquaintance into temporal support.',
      effects:{ prestige:6, opinionLiege:5, gold:3 } }
  ]},
{ id:'bishop_ecclesiastical_court', title:'The Ecclesiastical Court',
  trigger:{ never:true },
  text:'Petitioners fill the hall with broken vows, disputed penances, and quarrels that no lay court can settle cleanly.',
  options:[
    { label:'Impose merciful penance.', desc:'Correction need not become humiliation.',
      effects:{ piety:6, popularOpinion:6 } },
    { label:'Apply the strict canon.', desc:'Order wins respect in Rome and unease at home.',
      effects:{ prestige:5, papalOpinion:4, popularOpinion:-3 } },
    { label:'Collect the customary fees.', desc:'The court pays for itself, at a spiritual price.',
      effects:{ gold:6, piety:-4, popularOpinion:-5 } }
  ]},
{ id:'bishop_synod', title:'The Diocesan Synod',
  trigger:{ never:true },
  text:'Clergy and learned advisers assemble beneath your seal. The ten measures of silver spent on the gathering can now be turned toward discipline, learning, or mercy.',
  options:[
    { label:'Reform clerical discipline.', desc:'Rome approves; comfortable local habits do not.',
      effects:{ piety:12, papalOpinion:8, popularOpinion:-4 } },
    { label:'Found a cathedral school.', desc:'Put ink, masters, and books behind the see’s authority.',
      effects:{ research:20, skills:{lea:1}, prestige:5 } },
    { label:'Organize diocesan alms.', desc:'Make the synod visible in bread rather than decrees.',
      effects:{ popularOpinion:10, piety:8 } }
  ]},
{ id:'bishop_extraordinary_tithe', title:'An Extraordinary Tithe',
  trigger:{ never:true },
  text:'Repairs, hospitality, and obligations have thinned the episcopal chest. The diocese can be made to answer — or spared.',
  options:[
    { label:'Collect the full tithe.', desc:'Twelve measures of silver, and anger in every parish.',
      effects:{ gold:12, popularOpinion:-8, papalOpinion:-4,
        traitProgress:{id:'rent_shrewd'} } },
    { label:'Moderate the collection.', desc:'Take seven measures and show the liege a governable church.',
      effects:{ gold:7, popularOpinion:-3, opinionLiege:3,
        traitProgress:{id:'rent_shrewd'} } },
    { label:'Remit it entirely.', desc:'The poor keep their coin; your pastoral name grows.',
      effects:{ piety:10, popularOpinion:8 } }
  ]},
{ id:'bishop_sanctuary', title:'Sanctuary at the Cathedral Door',
  trigger:{ flags:['bishop'], notFlags:['pope'], chance:0.15 }, weight:7, cooldown:10,
  text:'A fugitive clings to the cathedral door-ring while armed men demand surrender. Sanctuary, justice, and your liege’s patience pull in different directions.',
  options:[
    { label:'Defend the sanctuary.', desc:'Church peace stands, even against the liege’s officers.',
      effects:{ piety:10, popularOpinion:5, opinionLiege:-10 } },
    { label:'Surrender the fugitive.', desc:'Temporal justice is satisfied; the nave remembers.',
      effects:{ opinionLiege:10, piety:-8, popularOpinion:-5 } },
    { label:'Broker a settlement.', desc:'Diplomacy may preserve both law and sanctuary.', chance:'skill_dip',
      success:{ text:'A penance, a surety, and a face-saving agreement empty the cathedral without blood.',
        effects:{ prestige:6, opinionLiege:5, popularOpinion:5 } },
      failure:{ text:'Both sides leave convinced that you favored the other.',
        effects:{ opinionLiege:-5, popularOpinion:-5 } } }
  ]},
{ id:'bishop_clergy_misconduct', title:'A Priest’s Scandal',
  trigger:{ flags:['bishop'], notFlags:['pope'], chance:0.14 }, weight:7, cooldown:12,
  text:'Evidence reaches you of a priest selling favors and neglecting his parish. His patrons call it gossip; his parishioners call it Tuesday.',
  options:[
    { label:'Remove him and reform the parish.', desc:'Clean discipline, with local resentment from his friends.',
      effects:{ piety:8, papalOpinion:8, popularOpinion:-5 } },
    { label:'Conceal it for a contribution.', desc:'The chest gains five measures. Your conscience and Rome do not.',
      effects:{ gold:5, piety:-10, papalOpinion:-8 } },
    { label:'Impose mercy and restitution.', desc:'A lighter correction wins affection, if not awe.',
      effects:{ popularOpinion:6, piety:3 } }
  ]},
{ id:'bishop_chapter_resistance', title:'The Chapter Resists',
  trigger:{ flags:['bishop'], notFlags:['pope'], chance:0.14 }, weight:6, cooldown:12,
  text:'The cathedral canons answer your latest order with old privileges, older seals, and the serene confidence of men who expect to outlast you.',
  options:[
    { label:'Negotiate the custom.', desc:'Diplomacy may turn obstruction into consent.', chance:'skill_dip',
      success:{ text:'A carefully narrowed decree passes with the chapter’s dignity intact.',
        effects:{ prestige:8, papalOpinion:5 } },
      failure:{ text:'Weeks of talk end with the same locked archive.',
        effects:{ prestige:-5 } } },
    { label:'Assert episcopal authority.', desc:'Win the immediate contest and spend curial goodwill.',
      effects:{ prestige:10, papalOpinion:-8 } },
    { label:'Fund books for the chapter. ({money:10})', require:{ goldMin:10 },
      desc:'Patronage makes learned allies where argument could not.',
      effects:{ gold:-10, research:15, papalOpinion:4 } }
  ]},
{ id:'bishop_tithe_dispute', title:'The Tithe Disputed',
  trigger:{ flags:['bishop'], notFlags:['pope'], chance:0.16 }, weight:7, cooldown:10,
  text:'Three villages produce three incompatible tallies and one shared conviction that the cathedral has already received enough.',
  options:[
    { label:'Enforce the full assessment.', desc:'The treasury gains ten measures; the villages remember.',
      effects:{ gold:10, popularOpinion:-10, traitProgress:{id:'rent_shrewd'} } },
    { label:'Audit the collectors.', desc:'Stewardship may find both missing silver and honest grievances.', chance:'skill_ste',
      success:{ text:'False entries surface. The chest and the villages both receive redress.',
        effects:{ gold:7, popularOpinion:5 } },
      failure:{ text:'The parchments defeat you in public.',
        effects:{ prestige:-3 } } },
    { label:'Remit the disputed amount.', desc:'Choose pastoral peace over doubtful revenue.',
      effects:{ piety:8, popularOpinion:8 } }
  ]},
{ id:'bishop_doubtful_relic', title:'A Doubtful Relic',
  trigger:{ flags:['bishop'], notFlags:['pope'], chance:0.08 }, weight:4, once:true,
  text:'A shrine in the diocese draws crowds around a bone no record mentions. Offerings grow while learned clergy exchange uneasy looks.',
  options:[
    { label:'Investigate the claim.', desc:'Learning may separate devotion from fraud.', chance:'skill_lea',
      success:{ text:'Patient inquiry uncovers an old and credible chain of custody.',
        effects:{ piety:10, prestige:8 } },
      failure:{ text:'The testimony tangles. You can prove neither sanctity nor fraud.',
        effects:{ piety:2 } } },
    { label:'Endorse the shrine.', desc:'Most such devotions flourish; a false one will disgrace you.', chance:0.65,
      success:{ text:'Pilgrims multiply, and the shrine becomes a beloved diocesan devotion.',
        effects:{ gold:12, popularOpinion:6 } },
      failure:{ text:'A shepherd identifies the bone. The laughter travels farther than the pilgrims did.',
        effects:{ piety:-12, prestige:-10 } } },
    { label:'Suppress the cult.', desc:'Rome values caution; the pilgrims do not.',
      effects:{ papalOpinion:6, popularOpinion:-5 } }
  ]},
{ id:'heresy_whiff', title:'Dangerous Questions',
  trigger:{ professions:['monk','priest'], leaMin:6, chance:0.1 }, weight:4, once:true,
  text:'Late study breeds late thoughts. In the margin of an old text you have written something that, read coldly, smells of heresy. Another hand has underlined it.',
  options:[
    { label:'Burn the page and recant privately.', desc:'Burn the evidence, keep your skin.', effects:{ piety:3 } },
    { label:'Defend the idea openly.', desc:'Brilliance could vindicate you — or put you barefoot in the snow.', chance:0.4,
      success:{ text:'Your argument dazzles the examiners; the notion is ruled orthodox after all.', effects:{ prestige:12, piety:5, skills:{lea:2} } },
      failure:{ text:'You are made to do public penance, barefoot in the snow.', effects:{ piety:-10, prestige:-10, health:-1 } } }
  ]},

/* ================= THE PATH OF LEARNING (Muslim lands) ================= */
{ id:'madrasa_study', title:'Reed Pen and Paper',
  trigger:{ professions:['monk','priest'], religionGroups:['muslim'], chance:0.5 }, weight:10, cooldown:4,
  text:'Cool tiles, murmured recitation, and the scratch of reed pens. Your calligraphy improves line by line, and the master of the madrasa watches your progress with interest.',
  options:[
    { label:'Perfect your hand.', desc:'Steady work that sharpens the mind.', effects:{ skills:{lea:1}, addTraitOnce:'literate', piety:2 } },
    { label:'Copy the great works of law and medicine.', desc:'Fine copies make a scholar’s name — or a week of blots.', chance:0.6,
      success:{ text:'Your copies are precise and sought after. Scholars speak your name.', effects:{ prestige:5, gold:3, skills:{lea:1} } },
      failure:{ text:'A blot of ink ruins a week’s work. Begin again, with patience.', effects:{ piety:1 } } }
  ]},
{ id:'made_qadi', title:'The Qadi’s Seat',
  trigger:{ professions:['monk','priest'], religionGroups:['muslim'], sex:'m', notFlags:['qadi','chief_qadi'], pietyMin:80, leaMin:8, chance:0.3 }, weight:10, once:true,
  text:'The old qadi has died, and the district needs a judge — a man of learning, piety, and patience. The notables gather, and many eyes turn to you.',
  options:[
    { label:'Accept the burden of judgment.', desc:'The seat could be yours, if the notables agree.', chance:0.65,
      success:{ text:'The seat is yours — disputes, deeds, and dowries, all beneath your seal.', effects:{ tierSet:2, prestige:30, piety:10, setFlag:'qadi', log:'Appointed qadi!' } },
      failure:{ text:'A rival with better connections is chosen. Your time will come.', effects:{ piety:3 } } },
    { label:'Decline in humility.', desc:'Piety grows fastest out of office.', effects:{ piety:10, addTrait:'humble' } }
  ]},
{ id:'chief_qadi', title:'The Emir’s Justice',
  trigger:{ professions:['monk','priest'], religionGroups:['muslim'], sex:'m', flags:['qadi'], notFlags:['chief_qadi'], pietyMin:150, chance:0.2 }, weight:8, once:true,
  text:'The emir requires a chief judge for the whole province, and hints the appointment can be yours — for merit, or for a “gift to the treasury” of {money:200}.',
  options:[
    { label:'Pay the gift.', require:{ goldMin:200 }, desc:'{money:200} buys the seat — and {god}’s raised eyebrow.',
      effects:{ gold:-200, tierSet:3, prestige:50, piety:-10, setFlag:'chief_qadi', log:'Bought the chief judgeship.' } },
    { label:'Trust to merit alone.', desc:'Merit against money; money usually wins.', chance:0.35,
      success:{ text:'Against all cynics, learning prevails. The judgeship is yours.', effects:{ tierSet:3, prestige:60, piety:20, setFlag:'chief_qadi', log:'Raised to Grand Qadi!' } },
      failure:{ text:'A richer man with poorer Arabic is chosen.', effects:{ piety:5 } } },
    { label:'Refuse the game entirely.', desc:'Keep your hands clean and your seat low.', effects:{ piety:12 } }
  ]},
{ id:'poetry_quarrel', title:'A Duel of Verses',
  trigger:{ religionGroups:['muslim'], minAge:16, chance:0.1 }, weight:4, cooldown:12,
  text:'At the evening majlis a braggart recites verses mocking your family — polished, cruel, and already being repeated with delight.',
  options:[
    { label:'Answer with sharper verses of your own.', desc:'A keen reply could shame him — or you.', chance:0.5,
      success:{ text:'Your reply cuts twice as deep. The gathering roars; his shame will outlive him.', effects:{ prestige:6, skills:{dip:1} } },
      failure:{ text:'You stumble on the meter. The laughter is not with you.', effects:{ prestige:-4 } } },
    { label:'Smile and let the verses die.', desc:'Some insults die faster than feuds.', effects:{ } },
    { label:'Answer with your fists.', desc:'Simpler than verse, and bloodier to lose.', chance:0.55,
      success:{ text:'Poetry has its place; so does a good grip. He recants, wheezing.', effects:{ prestige:3, skills:{mar:1} } },
      failure:{ text:'His friends pull you apart — after the worst of it.', effects:{ health:-1, prestige:-2 } } }
  ]},
{ id:'hawk_with_emir', title:'The Emir’s Hawking',
  trigger:{ tierMin:2, tierMax:2, chance:0.25, professions:['noble'], religionGroups:['muslim'] }, weight:8, cooldown:6,
  text:'An invitation to ride with {lord} and his falcons — swift horses, gazelle on the plain, and the quiet talk between great men that shapes small futures.',
  options:[
    { label:'Ride well, speak better.', desc:'Charm is safer than glory in a great man’s company.', effects:{ opinion:{role:'lord', amt:10}, skills:{dip:1} } },
    { label:'Loose your own falcon first.', desc:'Outshine the emir and men will talk — including the emir.', chance:0.5,
      success:{ text:'Your bird stoops first and truest. Bold — perhaps too bold. But men saw it.', effects:{ prestige:10, opinion:{role:'lord', amt:-3}, skills:{mar:1} } },
      failure:{ text:'Your falcon vanishes over the ridge with your dignity.', effects:{ prestige:-4, gold:-3 } } }
  ]},
{ id:'friday_khutba', title:'Words After Prayer',
  trigger:{ religionGroups:['muslim'], chance:0.2 }, weight:4, cooldown:12,
  text:'{priest} preaches the Friday khutba with unusual fire — of wealth, its duties, and the scales that weigh every deed.',
  options:[
    { label:'Take it to heart.', desc:'A little grace, and the preacher’s goodwill.', effects:{ piety:5, opinion:{role:'priest', amt:5} } },
    { label:'Let your mind wander to business.', desc:'Profit for the mind, frost from the pulpit.', effects:{ opinion:{role:'priest', amt:-5}, skills:{ste:1} } }
  ]},

/* ================= GENTRY (tier 2) ================= */
{ id:'melee_games', title:'The War-Games',
  trigger:{ tierMin:2, tierMax:2, chance:0.3, professions:['noble'] }, weight:10, cooldown:6,
  text:'{lord} holds a gathering of arms: mock battle with blunted steel, wagers, and every ambitious sword in the province watching.',
  options:[
    { label:'Fight in the melee.', desc:'Prize and glory for the winner; bruises for the rest.', chance:'battle',
      success:{ text:'You unhorse two men and yield to none. The prize purse and the glory are yours.', effects:{ gold:12, prestige:15, skills:{mar:1}, opinion:{role:'lord', amt:8} } },
      failure:{ text:'A mace you never saw ends your day early.', effects:{ health:-2, prestige:2 } } },
    { label:'Wager on the champion.', require:{ goldMin:5 }, desc:'{money:5} says another man bleeds for you.', chance:0.5,
      success:{ text:'Your man carries the field.', effects:{ gold:8 } },
      failure:{ text:'Your man eats mud in the first pass.', effects:{ gold:-5 } } }
  ]},
{ id:'hunt_with_lord', title:'The Lord’s Hunt',
  trigger:{ tierMin:2, tierMax:2, chance:0.25, professions:['noble'], religionGroups:['christian','pagan','jewish'] }, weight:8, cooldown:6,
  text:'An invitation to ride with {lord}’s hunt — hounds, horns, and the talk between great men that shapes small futures.',
  options:[
    { label:'Ride well, speak better.', desc:'Charm is safer than glory in a great man’s company.', effects:{ opinion:{role:'lord', amt:10}, skills:{dip:1} } },
    { label:'Take the boar yourself.', desc:'Steal the lord’s kill and men will talk — including the lord.', chance:0.5,
      success:{ text:'Your spear takes the boar before the lord’s. Bold — perhaps too bold. But men saw it.', effects:{ prestige:10, opinion:{role:'lord', amt:-3}, skills:{mar:1} } },
      failure:{ text:'The boar takes exception. You are carried home on a litter.', effects:{ health:-2, addTrait:'scarred' } } }
  ]},
{ id:'grant_of_barony', title:'A Banner of Your Own',
  trigger:{ tierMin:2, tierMax:2, custom:'barony_offer_eligible', chance:0.3 }, weight:15, once:true,
  text:'{lord} summons you before the hall. “You have served beyond any debt. The vacant lands and tower shall be yours — swear to me, and hold them as my sworn baron.”',
  options:[
    { label:'Kneel and swear.', desc:'A tower, a banner, and a lord above you.', effects:{ tierSet:3, prestige:60, custom:'record_liege_grant', log:'Granted a barony — a lord at last!' } },
    { label:'Decline, but ask for coin.', desc:'A fat purse, and a colder look from {lord}.', effects:{ gold:80, opinion:{role:'lord', amt:-10}, rivalContact:{role:'lord', score:1, cause:'public_refusal'} } },
    { label:'Decline graciously.', desc:'Remain gentry, without turning the refusal into an insult.', effects:{ } }
  ]},
{ id:'feud_gentry', title:'An Affair of Honor',
  trigger:{ tierMin:2, hasRole:'rival', roleOpinionBelow:{role:'rival', value:-40}, rivalHeatMin:40, chance:0.2 }, weight:6, cooldown:12,
  text:'{rival} insults your house before witnesses. Among the gentry, such words are answered with steel or with cunning — never with silence.',
  options:[
    { label:'Demand a duel.', desc:'Honor by steel — win loud or bleed quiet.', chance:'battle',
      success:{ text:'Steel rings; your point finds their shoulder. Honor is satisfied, loudly.', effects:{ prestige:15, opinion:{role:'rival', amt:10}, endRivalry:true, log:'Won a duel of honor and ended a feud.' } },
      failure:{ text:'Their blade is quicker. You yield, bleeding — and before the witnesses concede that satisfaction has been given.', effects:{ health:-2, prestige:-10, addTrait:'scarred', endRivalry:true, log:'Yielded a duel and ended a feud.' } } },
    { label:'Ruin them quietly instead.', desc:'Debts and rumors cut deeper, if the knife stays hidden.', chance:0.5,
      success:{ text:'Debts called, rumors seeded — within a year their fortunes crumble.', effects:{ skills:{int:2}, prestige:5, opinion:{role:'rival', amt:-20}, rivalHeat:20 } },
      failure:{ text:'Your scheming is uncovered and named for what it is.', effects:{ prestige:-12, rivalHeat:15 } } },
    { label:'Laugh it off.', desc:'Peace bought with a little pride.', effects:{ prestige:-5, rivalHeat:-15 } }
  ]},

/* ================= MORE STATION LIFE ================= */
{ id:'apprentice_trouble', title:'The Apprentice’s Mistake',
  trigger:{ professions:['craftsman'], chance:0.2 }, weight:6, cooldown:8,
  text:'A week of work lies in pieces on the floor, and your apprentice stands over it, white as chalk.',
  options:[
    { label:'Make him redo it beside you.', desc:'Slow teaching, well learned.', effects:{ skills:{ste:1}, prestige:1 } },
    { label:'Take it out of his hide.', desc:'Quick justice; the street will not love it.', effects:{ popularOpinion:-2, prestige:-1 } },
    { label:'“I broke worse at your age.”', desc:'Mercy costs a little coin and buys goodwill.', effects:{ popularOpinion:2, gold:-2 } }
  ]},
{ id:'iron_shortage', title:'No Iron at Any Price',
  trigger:{ professions:['craftsman'], chance:0.15 }, weight:5, cooldown:12,
  text:'The ore caravans have not come — war or weather, nobody knows. Every smith and joiner in town is bidding for the same scraps.',
  options:[
    { label:'Pay the famine price.', require:{ goldMin:6 }, desc:'Dear iron, but the work goes on.', effects:{ gold:-6, skills:{ste:1} } },
    { label:'Make do with poorer stuff.', desc:'Cheap scrap might pass — until someone looks closely.', chance:0.5,
      success:{ text:'Nobody notices the difference. This season, at least.', effects:{ gold:2 } },
      failure:{ text:'A customer notices. Loudly. In the market.', effects:{ prestige:-4 } } },
    { label:'Let the bench stand idle.', desc:'No work, no scandal, no bread.', effects:{ gold:-2 } }
  ]},
{ id:'partner_offer', title:'A Partner from Far Off',
  trigger:{ professions:['merchant'], goldMin:15, chance:0.15 }, weight:5, cooldown:12,
  text:'A foreign merchant — silk cuffs, careful eyes — proposes a joint venture: your local knowledge, his distant markets.',
  options:[
    { label:'Shake on it. (risk {money:15})', desc:'His markets could pay richly — or swallow your stake.', chance:0.6,
      success:{ text:'His letters prove good as gold. The partnership pays handsomely.', effects:{ gold:12, skills:{dip:1, ste:1} } },
      failure:{ text:'The letters stop coming. So does the money.', effects:{ gold:-15 } } },
    { label:'Trade information only.', desc:'No coin risked; knowledge travels both ways.', effects:{ skills:{ste:1}, worldNews:true } },
    { label:'Decline politely.', desc:'Suspicious silk is cheap to refuse.', effects:{ } }
  ]},
{ id:'wreck_auction', title:'Salvage on the Block',
  trigger:{ professions:['merchant'], goldMin:8, chance:0.15 }, weight:5, cooldown:10,
  text:'A storm-broken cargo goes under the hammer, sight unseen: sodden bales that might be ruined wool — or sea-stained silk.',
  options:[
    { label:'Bid on the lot. ({money:8})', desc:'Silk or rotten wool — the hammer decides.', chance:0.5,
      success:{ text:'Under the ruined top layer: silk, barely touched.', effects:{ gold:10, skills:{ste:1} } },
      failure:{ text:'Wool. Rotten. All of it.', effects:{ gold:-8 } } },
    { label:'Watch others gamble.', desc:'Learn what a wreck is worth at no cost.', effects:{ skills:{ste:1} } }
  ]},
{ id:'sparring_challenge', title:'The Old Sergeant’s Wager',
  trigger:{ professions:['soldier'], chance:0.2 }, weight:6, cooldown:8,
  text:'A grizzled sergeant taps your shoulder with a practice blade: “Young ones always think it’s about strength. Care to learn otherwise, for a wager?”',
  options:[
    { label:'Take the wager. ({money:2})', require:{ goldMin:2 }, desc:'{money:2} says youth beats cunning.', chance:'battle',
      success:{ text:'You catch him older and slower than his stories. The garrison hoots; he pays with a grin.', effects:{ gold:2, prestige:2, skills:{mar:1} } },
      failure:{ text:'It is not about strength. You pay up, aching in new places — and wiser.', effects:{ gold:-2, skills:{mar:1} } } },
    { label:'Watch him school someone else.', desc:'Free lessons from the safe side of the yard.', effects:{ skills:{mar:1} } }
  ]},
{ id:'quiet_garrison', title:'Long Watches',
  trigger:{ professions:['soldier'], realmAtWar:false, chance:0.2 }, weight:5, cooldown:8,
  text:'No war, no drills worth the name — just walls, weather, and wages. A soldier’s enemy in peacetime is the calendar.',
  options:[
    { label:'Keep your edge regardless.', desc:'Rust is for lazy blades.', effects:{ skills:{mar:1} } },
    { label:'Hire out as a caravan guard.', desc:'Dull roads, and pay that mostly arrives.', chance:0.7,
      success:{ text:'Dull roads, good pay.', effects:{ gold:4 } },
      failure:{ text:'The caravan master pays late and short.', effects:{ gold:1 } } },
    { label:'Court the quartermaster’s favor.', desc:'Friendship with the man who counts the loaves.', effects:{ skills:{dip:1}, opinion:{role:'lord', amt:3} } }
  ]},
{ id:'judgment_at_door', title:'Two Families, One Gate',
  trigger:{ professions:['monk','priest'], chance:0.2 }, weight:6, cooldown:8,
  text:'Two families arrive at the {temple} gate with one dispute, three witnesses, and absolute certainty on both sides. They will take your word as {god}’s.',
  options:[
    { label:'Hear both sides fully.', desc:'A fair ear could satisfy both — or make one an enemy.', chance:0.65,
      success:{ text:'Your judgment threads the needle; both leave grumbling equally — which is to say, satisfied.', effects:{ piety:5, prestige:3, skills:{lea:1} } },
      failure:{ text:'Your ruling pleases one house and makes an enemy of the other.', effects:{ piety:2, popularOpinion:-3 } } },
    { label:'Send them to the lord’s court.', desc:'Pass the thorn uphill, and lose a little grace.', effects:{ opinion:{role:'lord', amt:3}, piety:-2 } }
  ]},
{ id:'gentry_feuding_neighbors', title:'A Feud on Your Doorstep',
  trigger:{ tierMin:2, tierMax:2, professions:['noble'], chance:0.15 }, weight:6, cooldown:12,
  text:'Two neighboring houses have fallen out over a mill-race, and both send riders to your hall the same afternoon, seeking your name for their cause.',
  options:[
    { label:'Broker a peace between them.', desc:'Both houses could owe you — or hate you together.', chance:0.55,
      success:{ text:'Hard words soften across your table. Both houses owe you now.', effects:{ prestige:6, skills:{dip:2} } },
      failure:{ text:'The feud finds a second wind — with your name tangled in it.', effects:{ prestige:-4 } } },
    { label:'Back the stronger house.', desc:'Safe favor with the likely winner.', effects:{ prestige:2, opinion:{role:'lord', amt:3} } },
    { label:'Keep clear of it.', desc:'Their feud, their funerals.', effects:{ } }
  ]}
);

/* ================= GUILD PATHS =================
   Permanent Craft and Trade specialties use the normal slot-day scheduler.
   Their career trigger keeps these stories personal work, never a ruler’s
   former calling, and their long cooldowns make a guild path an occasion. */
FBDATA.events.push(
{ id:'smith_tempered_steel', title:'Steel for a Captain',
  trigger:{ career:{ profession:'craftsman', specialization:'smith', guildRankMin:'guildmaster' }, chance:0.22 }, weight:3, cooldown:16,
  text:'A captain lays a purse and a snapped sword on your anvil. His company marches soon; he wants a blade that will not fail when men crowd close.',
  options:[
    { label:'Forge the blade for hard coin.', desc:'Take the captain’s silver and keep the guild out of the bargain.', effects:{ gold:14 } },
    { label:'Call the masters to witness the work.', desc:'A public masterwork grows Guild Standing and your name.', effects:{ guildStanding:7, prestige:5, skills:{ste:1} } },
    { label:'Set the town smithies to shared standards.', desc:'Earn less now; the market gains a temporary charter.',
      requiresTech:['urban_markets','authenticated_seals'], showWhenTechLocked:true,
      effects:{ gold:4, addModifier:{id:'market_charter'} } }
  ]},
{ id:'smith_bridge_irons', title:'Iron at the Bridge',
  trigger:{ career:{ profession:'craftsman', specialization:'smith', guildRankMin:'guildmaster' }, seasons:[1,2], chance:0.18 }, weight:3, cooldown:18,
  text:'The bridge master needs fresh chains and pins before the autumn carts arrive. A shoddy repair would be cheaper, and nobody would know until floodwater comes.',
  options:[
    { label:'Charge the full lawful price.', desc:'Good iron brings good money.', effects:{ gold:12 } },
    { label:'Give the guild’s labor at cost.', desc:'The masters reward public service with Standing.', effects:{ guildStanding:8, prestige:3 } },
    { label:'Train two young hands on the repair.', desc:'A slower job sharpens your Stewardship.', effects:{ skills:{ste:2}, addModifier:{id:'roads_patrolled'} } }
  ]},
{ id:'weaver_hall_hangings', title:'Hangings for the Hall',
  trigger:{ career:{ profession:'craftsman', specialization:'weaver', guildRankMin:'guildmaster' }, chance:0.22 }, weight:3, cooldown:16,
  text:'The town hall asks for new hangings before a visiting lord arrives. The council offers coin, the guild offers its seal, and the apprentices beg to weave their own marks into the border.',
  options:[
    { label:'Take the council’s commission.', desc:'The household gains a useful purse.', effects:{ gold:13 } },
    { label:'Weave the guild’s mark openly.', desc:'Public credit becomes Guild Standing and prestige.', effects:{ guildStanding:7, prestige:5 } },
    { label:'Let the apprentices design the border.', desc:'Teach the bench and make the market more welcoming.',
      requiresTech:['urban_markets','authenticated_seals'], showWhenTechLocked:true,
      effects:{ skills:{ste:1}, addModifier:{id:'market_charter'} } }
  ]},
{ id:'weaver_dyed_thread', title:'A Dyer’s Dispute',
  trigger:{ career:{ profession:'craftsman', specialization:'weaver', guildRankMin:'guildmaster' }, chance:0.18 }, weight:3, cooldown:18,
  text:'A dyer claims a rival has spoiled imported thread with bad mordant. Both demand that you judge the cloth before the market opens.',
  options:[
    { label:'Sell the sound bolts quickly.', desc:'The dispute becomes a tidy profit.', effects:{ gold:11 } },
    { label:'Judge by the guild book.', desc:'A patient ruling improves your Standing with the masters.', effects:{ guildStanding:8, skills:{ste:1} } },
    { label:'Compensate both workshops and keep peace.', desc:'Your name rises and market grievance cools.',
      requiresTech:['urban_markets','authenticated_seals'], showWhenTechLocked:true,
      effects:{ gold:-3, prestige:7, addModifier:{id:'market_charter'} } }
  ]},
{ id:'cooper_vintage_casks', title:'Casks Before the Vintage',
  trigger:{ career:{ profession:'craftsman', specialization:'cooper', guildRankMin:'guildmaster' }, seasons:[2], chance:0.22 }, weight:3, cooldown:16,
  text:'Wine merchants discover their cellars are short of sound casks. Every vineyard wants your hoops and staves before the first pressing.',
  options:[
    { label:'Auction your casks to the highest bidder.', desc:'The shortage pays in hard coin.', effects:{ gold:15 } },
    { label:'Divide them by the guild’s allotment.', desc:'Fair dealing earns Guild Standing.', effects:{ guildStanding:8, prestige:3 } },
    { label:'Reserve a share for the public granary.', desc:'The town gains a modest local safeguard.', effects:{ skills:{ste:1}, addModifier:{id:'granaries_opened'} } }
  ]},
{ id:'cooper_caravan_barrels', title:'Barrels for the Road',
  trigger:{ career:{ profession:'craftsman', specialization:'cooper', guildRankMin:'guildmaster' }, chance:0.18 }, weight:3, cooldown:18,
  text:'A caravan master wants water barrels for a long crossing. The price is generous, but the drivers fear bandits on the route.',
  options:[
    { label:'Sell every barrel at the offered price.', desc:'A quick contract fills the purse.', effects:{ gold:12 } },
    { label:'Stamp every barrel with the guild seal.', desc:'A dependable lot brings Standing and a better craft reputation.', effects:{ guildStanding:7, skills:{ste:1} } },
    { label:'Contribute casks for the road patrol.', desc:'Spend some material to make local roads safer.', effects:{ gold:3, prestige:5, addModifier:{id:'roads_patrolled'} } }
  ]},
{ id:'broker_grain_contract', title:'A Grain Contract',
  trigger:{ career:{ profession:'merchant', specialization:'broker', guildRankMin:'guildmaster' }, chance:0.22 }, weight:3, cooldown:16,
  text:'Two estates bring competing grain contracts to your table. Each will pay for a favorable introduction, and each has enough cousins to make a public quarrel costly.',
  options:[
    { label:'Take the richer commission.', desc:'The better contract yields a private fee.', effects:{ gold:14 } },
    { label:'Match the terms by the guild ledger.', desc:'Neutral dealing earns Guild Standing and prestige.', effects:{ guildStanding:8, prestige:4 } },
    { label:'Publish fair measures for both houses.', desc:'Your careful bargain improves Stewardship and the market’s standing.',
      requiresTech:['urban_markets','authenticated_seals'], showWhenTechLocked:true,
      effects:{ skills:{ste:2}, addModifier:{id:'market_charter'} } }
  ]},
{ id:'broker_debtors', title:'Debtors at Market',
  trigger:{ career:{ profession:'merchant', specialization:'broker', guildRankMin:'guildmaster' }, chance:0.18 }, weight:3, cooldown:18,
  text:'A debtor and a cloth seller accuse each other before the market crowd. Both ask you to value goods that may be worth less by next week.',
  options:[
    { label:'Buy the claim cheaply.', desc:'Risk a little reputation for immediate profit.', effects:{ gold:10 } },
    { label:'Arbitrate under the guild seal.', desc:'Your measured judgment gains Guild Standing.', effects:{ guildStanding:8, skills:{ste:1} } },
    { label:'Remit the market toll for the day.', desc:'The crowd remembers generosity, and local resentment eases.', effects:{ prestige:6, addModifier:{id:'tax_concession'} } }
  ]},
{ id:'caravan_factor_guard_contract', title:'Guard Contract for the Caravan',
  trigger:{ career:{ profession:'merchant', specialization:'caravan_factor', guildRankMin:'guildmaster' }, chance:0.22 }, weight:3, cooldown:16,
  text:'Three wagon masters want one escort contract for the eastern road. They trust your books, but disagree over who should bear the cost of armed riders.',
  options:[
    { label:'Charge each wagon a factor’s fee.', desc:'Your ledger work becomes household coin.', effects:{ gold:15 } },
    { label:'Write the agreement before the guild.', desc:'The public contract gains Guild Standing and prestige.', effects:{ guildStanding:7, prestige:5 } },
    { label:'Put part of the fee into patrols.', desc:'A smaller fee makes the road safer and teaches practical Stewardship.', effects:{ gold:4, skills:{ste:1}, addModifier:{id:'roads_patrolled'} } }
  ]},
{ id:'caravan_factor_missing_bales', title:'Missing Bales',
  trigger:{ career:{ profession:'merchant', specialization:'caravan_factor', guildRankMin:'guildmaster' }, chance:0.18 }, weight:3, cooldown:18,
  text:'A caravan arrives with three bales missing and six conflicting accounts. The drivers want payment today; the investors want someone blamed.',
  options:[
    { label:'Settle the books for a fee.', desc:'Untangle the ledgers and collect a broker’s share.', effects:{ gold:12, skills:{ste:1} } },
    { label:'Make the guild absorb the loss fairly.', desc:'The masters prize a clean accounting.', effects:{ guildStanding:8, prestige:3 } },
    { label:'Fund a search party along the route.', desc:'The immediate purse shrinks, but patrols strengthen.', effects:{ gold:-2, prestige:6, addModifier:{id:'roads_patrolled'} } }
  ]},
{ id:'maritime_factor_harbor_duty', title:'Harbor Duties',
  trigger:{ career:{ profession:'merchant', specialization:'maritime_factor', guildRankMin:'guildmaster' }, coastal:true, chance:0.22 }, weight:3, cooldown:16,
  text:'A captain’s cargo waits on the quay while port officers argue over duties. Every tide lost costs money, and every favor shown will be remembered.',
  options:[
    { label:'Clear the cargo for a private fee.', desc:'Speed brings silver to the household.', effects:{ gold:14 } },
    { label:'Submit the manifest to the guild court.', desc:'Orderly practice earns Guild Standing and prestige.', effects:{ guildStanding:7, prestige:5 } },
    { label:'Pay for quay watchmen through the season.', desc:'The port road grows safer and your Stewardship improves.', effects:{ gold:2, skills:{ste:1}, addModifier:{id:'roads_patrolled'} } }
  ]},
{ id:'maritime_factor_storm_surety', title:'Surety After the Storm',
  trigger:{ career:{ profession:'merchant', specialization:'maritime_factor', guildRankMin:'guildmaster' }, coastal:true, chance:0.18 }, weight:3, cooldown:18,
  text:'A storm scatters a convoy and leaves merchants arguing about salvage. They ask you to set a value before the next ship sails.',
  options:[
    { label:'Buy the salvage rights.', desc:'A risky valuation can still be profitable.', effects:{ gold:11 } },
    { label:'Settle the shares by guild custom.', desc:'A fair division wins Guild Standing and sharper accounts.', effects:{ guildStanding:8, skills:{ste:1} } },
    { label:'Reserve timber for the harbor stores.', desc:'Less money now, but a public supply eases the county’s next lean season.', effects:{ prestige:6, addModifier:{id:'granaries_opened'} } }
  ]},
{ id:'rare_auction_invitation', title:'An Invitation to Auction',
  trigger:{ tierMin:1, tierMax:2, chance:0.06, custom:'auction_invitation_available' }, weight:2, cooldown:16,
  text:'A sealed market invitation offers one rare lot under the hammer. The auctioneer promises a short room, fixed increments, and no debt for a losing bid.',
  options:[
    { label:'Attend the auction.', desc:'Open one saved lot and bid against a single immediate rival.',
      manualOnly:true, effects:{ custom:'auction_invitation_open' } },
    { label:'Send regrets.', desc:'Keep the invitation’s mystery for another market day.', effects:{} }
  ]}
);
