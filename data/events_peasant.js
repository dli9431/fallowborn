/* =========================================================================
   Fallowborn — PEASANT, VILLAGE & LOWER-STATION EVENTS (tiers 0-2)
   ========================================================================= */
window.FBDATA = window.FBDATA || {};
FBDATA.events = FBDATA.events || [];

FBDATA.events.push(

/* ---------- the farming year ---------- */
{ id:'spring_sowing', title:'Sowing Season',
  trigger:{ tierMax:1, professions:['farmer'], seasons:[0], chance:0.5 }, weight:10, cooldown:3,
  text:'The thaw has come and the earth turns soft. What goes into the ground now decides who eats next winter.',
  options:[
    { label:'Sow the proven barley.', effects:{ setFlag:'crop_safe', log:'Sowed barley.' } },
    { label:'Gamble on wheat — richer, riskier.', effects:{ setFlag:'crop_risky', log:'Gambled on wheat.' } },
    { label:'Sow little, hire out your back instead.', effects:{ gold:3 } }
  ]},
{ id:'summer_storm', title:'Black Clouds Over the Fields',
  trigger:{ tierMax:1, professions:['farmer'], seasons:[1], chance:0.3 }, weight:8, cooldown:3,
  text:'Hail-heavy clouds pile up beyond the hills. A summer storm could flatten every stalk you own.',
  options:[
    { label:'Rush the early cutting.', effects:{ gold:2, clearFlag:'crop_risky', setFlag:'crop_safe', health:-1 } },
    { label:'Trust to {god} and luck.', chance:0.6,
      success:{ text:'The storm slides past. Your fields glitter, unharmed.', effects:{ } },
      failure:{ text:'Hail like slingstones. The crop is battered flat.', effects:{ clearFlag:'crop_safe', clearFlag2:'crop_risky', setFlag:'crop_ruined' } } }
  ]},
{ id:'harvest', title:'The Harvest',
  trigger:{ tierMax:1, professions:['farmer'], seasons:[2] }, weight:25, cooldown:3,
  text:'Scythes hiss in the fields from first light to last. The whole village works, prays, and counts.',
  options:[
    { label:'Bring it in.', chance:'harvest',
      success:{ text:'A fat harvest! Granaries groan, and there is a surplus to sell.', effects:{ gold:'harvest_good', prestige:2, clearHarvestFlags:true } },
      failure:{ text:'A thin, sad yield. Winter will have teeth this year.', effects:{ gold:1, setFlag:'lean_winter', clearHarvestFlags:true } } }
  ]},
{ id:'lean_winter', title:'The Hungry Months',
  trigger:{ tierMax:1, seasons:[3], flags:['lean_winter'] }, weight:25,
  text:'The grain jar echoes. Your household chews bark-bread and watches the snow.',
  options:[
    { label:'Buy grain at winter prices.', require:{ goldMin:6 }, effects:{ gold:-6, clearFlag:'lean_winter' } },
    { label:'Tighten belts and endure.', effects:{ health:-1, clearFlag:'lean_winter' } },
    { label:'Poach the lord’s deer.', chance:0.6,
      success:{ text:'Venison in the pot, and none the wiser.', effects:{ clearFlag:'lean_winter', skills:{int:1} } },
      failure:{ text:'The forester catches you red-handed over the carcass.', effects:{ clearFlag:'lean_winter', queue:'caught_poaching' } } }
  ]},
{ id:'caught_poaching', title:'Caught!', trigger:{ never:true },
  text:'The forester marches you before {lord}. Poaching the lord’s game can cost a hand — or worse.',
  options:[
    { label:'Beg for mercy.', chance:0.6,
      success:{ text:'The lord waves you off with a fine and a warning.', effects:{ gold:-5, opinion:{role:'lord', amt:-10} } },
      failure:{ text:'The lord orders you flogged in the yard as a lesson.', effects:{ health:-2, prestige:-5, opinion:{role:'lord', amt:-10} } } },
    { label:'Claim the deer was already dead.', chance:0.3,
      success:{ text:'Astonishingly, the lie holds.', effects:{ skills:{int:1} } },
      failure:{ text:'No one believes it. The flogging is worse for the insult.', effects:{ health:-2, prestige:-8, opinion:{role:'lord', amt:-15} } } }
  ]},

/* ---------- the lord's shadow (serfs) ---------- */
{ id:'corvee', title:'The Lord’s Due',
  trigger:{ tierMax:0, chance:0.35 }, weight:10, cooldown:4,
  text:'The reeve bangs on doors at dawn: {lord} requires labor — hauling stone, mending the mill-race, digging ditches.',
  options:[
    { label:'Work hard and be noticed.', effects:{ health:-1, opinion:{role:'lord', amt:8}, log:'Labored on the lord’s works.' } },
    { label:'Do the least you can.', chance:0.7,
      success:{ text:'You shirk artfully and save your strength.', effects:{ } },
      failure:{ text:'The reeve notices, and his stick argues the point.', effects:{ health:-1, opinion:{role:'lord', amt:-8} } } },
    { label:'Bribe the reeve to overlook you.', require:{ goldMin:3 }, effects:{ gold:-3 } }
  ]},
{ id:'tax_collector', title:'The Taxman Cometh',
  trigger:{ tierMax:1, seasons:[2], chance:0.4 }, weight:12, cooldown:3,
  text:'The lord’s man arrives with his ledger and his soldiers, tallying hearths and hens alike.',
  options:[
    { label:'Pay what is owed.', require:{ goldMin:3 }, effects:{ gold:-3, opinion:{role:'lord', amt:3} } },
    { label:'Hide the second goat.', chance:0.65,
      success:{ text:'The ledger records one thin goat. The fat one chews safely in the wood.', effects:{ gold:-1, skills:{int:1} } },
      failure:{ text:'Bleating betrays you. The fine stings worse than the tax.', effects:{ gold:-6, opinion:{role:'lord', amt:-10} } } },
    { label:'Plead poverty.', chance:0.4,
      success:{ text:'The collector sighs and moves on.', effects:{ } },
      failure:{ text:'He takes your goods in lieu of coin.', effects:{ gold:-4 } } }
  ]},
{ id:'lords_notice', title:'The Lord’s Eye',
  trigger:{ tierMax:0, roleOpinionAbove:{role:'lord', value:25}, chance:0.4 }, weight:10, once:true,
  text:'{lord} reins in beside your strip of field. “You. You’re the one who works like two men. What is it you want in this life?”',
  options:[
    { label:'“My freedom, lord, if I earn it.”', effects:{ setFlag:'freedom_promised', opinion:{role:'lord', amt:5}, log:'The lord spoke of freedom.' } },
    { label:'“Only to serve, lord.”', effects:{ opinion:{role:'lord', amt:10} } },
    { label:'“Land of my own, someday.”', effects:{ opinion:{role:'lord', amt:3} } }
  ]},
{ id:'manumission', title:'A Man of Your Own',
  trigger:{ tierMax:0, flags:['freedom_promised'], goldMin:30, chance:0.5 }, weight:20,
  text:'The {holy} drafts the charter by candlelight. For thirty pieces of silver, {lord} will strike your name from the roll of serfs — forever.',
  options:[
    { label:'Pay. Be free.', effects:{ gold:-30, tierSet:1, prestige:15, piety:5, log:'Bought freedom from serfdom!' } },
    { label:'Not yet. Save more first.', effects:{ } }
  ]},

/* ---------- village life ---------- */
{ id:'village_festival', title:'Festival Day',
  trigger:{ tierMax:2, seasons:[1], chance:0.35 }, weight:8, cooldown:4,
  text:'Garlands on the well, a lamb on the spit, and the musicians already flushed with cheer. {province} forgets its burdens for a day.',
  options:[
    { label:'Dance, eat, laugh.', effects:{ health:1, opinion:{role:'friend', amt:5} } },
    { label:'Enter the wrestling.', chance:0.5,
      success:{ text:'You pin the miller’s enormous son to roars of delight.', effects:{ prestige:5, skills:{mar:1} } },
      failure:{ text:'You eat dirt in front of the whole village. They cheer anyway.', effects:{ health:-1, prestige:-1 } } },
    { label:'Sell ale to the merrymakers.', require:{ goldMin:2, religionGroups:['christian','pagan','jewish'] }, effects:{ gold:4, skills:{ste:1} } },
    { label:'Sell sweets and sherbet to the crowd.', require:{ goldMin:2, religionGroups:['muslim'] }, effects:{ gold:4, skills:{ste:1} } }
  ]},
{ id:'wolves', title:'Wolves at the Fold',
  trigger:{ tierMax:1, seasons:[3], terrains:['forest','hills','mountains'], chance:0.25 }, weight:8, cooldown:8,
  text:'Tracks in the snow, big as your palm. Something has been at the sheep, and the dogs whine at dusk.',
  options:[
    { label:'Hunt the beast.', chance:0.55,
      success:{ text:{ default:'You come home dragging a grey carcass. The village drinks your health.',
        muslim:'You come home dragging a grey carcass. The village feasts you as a hero.' }, effects:{ prestige:6, gold:2, skills:{mar:1} } },
      failure:{ text:'The wolf leaves you a scar to remember it by.', effects:{ health:-2, addTrait:'scarred' } } },
    { label:'Pen the flock and wait for spring.', effects:{ gold:-2 } }
  ]},
{ id:'boundary_dispute', title:'The Moved Stone',
  trigger:{ tierMin:1, tierMax:1, professions:['farmer'], chance:0.15 }, weight:6, cooldown:12,
  text:'Your neighbor’s plough has crept over the boundary stone — or did the stone itself walk? A strip of your land is suddenly his.',
  options:[
    { label:'Bring it before the village moot.', chance:0.6,
      success:{ text:'The elders find for you. The stone walks home.', effects:{ prestige:4 } },
      failure:{ text:'His cousin sits on the moot. The stone stays.', effects:{ prestige:-3 } } },
    { label:'Move it back by night.', chance:0.7,
      success:{ text:'The stone returns as mysteriously as it left.', effects:{ skills:{int:1} } },
      failure:{ text:'Caught in the moonlight, shovel in hand. The moot fines you.', effects:{ gold:-4, prestige:-4 } } },
    { label:'Let it go.', effects:{ opinion:{role:'rival', amt:5} } }
  ]},
{ id:'foundling', title:'The Basket at the Door',
  trigger:{ tierMax:1, chance:0.06, married:true }, weight:3, once:true,
  text:'A baby, swaddled in rags, left at your doorstep in the night. It looks up at you and does not cry.',
  options:[
    { label:'Raise it as your own.', effects:{ adoptChild:true, piety:10, gold:-2, log:'Took in a foundling.' } },
    { label:'Carry it to the {temple}.', effects:{ piety:3, opinion:{role:'priest', amt:5} } }
  ]},
{ id:'market_day_find', title:'A Bargain at Market',
  trigger:{ tierMax:1, chance:0.15, goldMin:4 }, weight:5, cooldown:8,
  text:'A trader down on his luck offers a sturdy ox for a quarter its worth. His eyes dart as he talks.',
  options:[
    { label:'Buy it. (4 gold)', chance:0.7,
      success:{ text:'A fine beast, honestly come by or not. Your ploughing doubles.', effects:{ gold:-4, setFlag:'own_ox' } },
      failure:{ text:'A week later its owner arrives with the reeve. The ox goes home; your coin does not.', effects:{ gold:-4, prestige:-3 } } },
    { label:'Too good to be honest.', effects:{ } }
  ]},
{ id:'bandits_village', title:'Riders on the Road',
  trigger:{ tierMax:1, chance:0.12, notFlags:['on_campaign'] }, weight:6, cooldown:10,
  text:'Masterless men have made camp in the wood — deserters and debtors with knives. Now a shepherd lies dead, and folk bar their doors.',
  options:[
    { label:'Rouse the village to drive them out.', chance:0.55,
      success:{ text:'Pitchforks and fury. The bandits scatter, leaving loot behind.', effects:{ gold:5, prestige:8, skills:{mar:1}, log:'Drove bandits from {province}.' } },
      failure:{ text:'They are harder men than farmers. You carry home a wound.', effects:{ health:-2, prestige:2 } } },
    { label:'Send to {lord} for soldiers.', effects:{ opinion:{role:'lord', amt:3}, gold:-1 } },
    { label:'Pay them to move on.', require:{ goldMin:5 }, effects:{ gold:-5 } }
  ]},
{ id:'buy_farm', title:'Land of Your Own',
  trigger:{ tierMin:1, tierMax:1, professions:['farmer'], goldMin:120, notFlags:['has_farm'], chance:0.5 }, weight:15,
  text:'Old Widow Hedda’s strips lie fallow since her sons died. Her price is fair, and freehold land is the root of every fortune.',
  options:[
    { label:'Buy the land. (120 gold)', effects:{ gold:-120, setFlag:'has_farm', prestige:20, log:'Bought a freehold farm.' } },
    { label:'Not yet.', effects:{ } }
  ]},
{ id:'good_ox_year', title:'A Strong Team',
  trigger:{ flags:['own_ox'], seasons:[2], chance:0.5 }, weight:6, cooldown:3,
  text:'With the ox pulling, you plough deeper and faster than any neighbor. The extra furlongs pay.',
  options:[ { label:'The beast earns its hay.', effects:{ gold:4 } } ]},

{ id:'lord_covets_horse', title:'A Lord’s Long Look',
  trigger:{ holdings:['warhorse'], tierMax:1, chance:0.12 }, weight:4, cooldown:16,
  text:'{lord} reins in beside your warhorse and looks it over far too long. “A fine beast,” he says, “for a common man.”',
  options:[
    { label:'Offer it as a gift.', effects:{ loseHolding:'warhorse', opinion:{role:'lord', amt:25}, prestige:5 } },
    { label:'“Bred and paid for, lord.”', chance:0.7,
      success:{ text:'He grunts, half insulted and half impressed, and rides on.', effects:{ prestige:3 } },
      failure:{ text:'Days later the horse is “requisitioned for the levy.” You are paid a tenth of its worth.',
        effects:{ loseHolding:'warhorse', gold:3, opinion:{role:'lord', amt:-5} } } }
  ]},

/* ---------- serf flight ---------- */
{ id:'flee_serfdom', title:'The Open Road',
  trigger:{ tierMax:0, chance:0.08, roleOpinionBelow:{role:'lord', value:-20} }, weight:6, cooldown:12,
  text:'They say a serf who reaches a town and lives there a year and a day is free. The road is long, the law is against you — but the door stands open tonight.',
  options:[
    { label:'Run.', chance:0.5,
      success:{ text:'Weeks of hedgerows and hunger — but you make it. A new province, a new name, a free life.', effects:{ tierSet:1, moveRandom:true, gold:-3, prestige:5, log:'Fled serfdom to a new land!' } },
      failure:{ text:'The lord’s riders catch you at the ford. You are dragged back in a halter.', effects:{ health:-2, prestige:-10, opinion:{role:'lord', amt:-20} } } },
    { label:'Stay. This is home, chains and all.', effects:{ } }
  ]},

/* ================= THE OLD CUSTOM — five-part landmark chain ================= */
{ id:'old_custom_stakes', title:'Stakes in the Common',
  trigger:{ tierMax:2, minAge:16, chance:0.2 }, weight:15, once:true,
  text:'Fresh stakes stand across the waste where the households of {province} have grazed beasts, cut fuel, and drawn water since anyone remembers. The reeve says it is the lord’s land, and tomorrow it will be closed.',
  options:[
    { label:'Call every household together.', chance:'skill_dip', effects:{ setFlag:'old_custom_1' },
      success:{ text:'Quarrels are put aside. One by one, the households agree to speak with a single voice.', effects:{ setFlag:'rights_evidence', prestige:2, popularOpinion:3, skills:{dip:1} } },
      failure:{ text:'Old grudges prove stronger than old custom. Half the village will not stand beside the other half.', effects:{ popularOpinion:-2 } } },
    { label:'Measure exactly what is being taken.', chance:'skill_ste', effects:{ setFlag:'old_custom_1' },
      success:{ text:'Paces, rents, beasts, winter fuel — you put a number to every loss.', effects:{ setFlag:'rights_evidence', prestige:2, skills:{ste:1} } },
      failure:{ text:'The strips, ditches, and remembered bounds refuse to add up cleanly.', effects:{ } } },
    { label:'Find words older than the reeve.', chance:'skill_lea', effects:{ setFlag:'old_custom_1' },
      success:{ text:'A neglected record speaks of pasture and fuel owed to every hearth.', effects:{ setFlag:'rights_evidence', prestige:2, skills:{lea:1} } },
      failure:{ text:'Dust, worm-holes, and pious accounts — but no grant anyone can use.', effects:{ } } },
    { label:'Tell the reeve who is stirring trouble.', chance:'skill_int', effects:{ setFlag:'old_custom_1', setFlag2:'rights_collaborator', popularOpinion:-4 },
      success:{ text:'The reeve pays for names and promises to remember yours kindly.', effects:{ gold:3, opinion:{role:'lord', amt:5}, skills:{int:1} } },
      failure:{ text:'He takes the names, keeps his coin, and looks at you with contempt.', effects:{ opinion:{role:'lord', amt:-5}, prestige:-2 } } }
  ]},

{ id:'old_custom_memory', title:'What the Old Folk Remember',
  trigger:{ flags:['old_custom_1'] }, weight:50, once:true,
  text:'Every elder remembers the boundary, but none remembers it quite alike. If custom is to stand before judgment, memory must become proof.',
  options:[
    { label:'Take sworn testimony from every hearth.', chance:'skill_dip', effects:{ clearFlag:'old_custom_1', setFlag:'old_custom_2' },
      success:{ text:'The stories agree where it matters. A village speaking together is difficult to dismiss.', effects:{ setFlag:'rights_evidence', prestige:3, skills:{dip:1} } },
      failure:{ text:'Two witnesses fall to shouting over whose grandfather owned which sow.', effects:{ popularOpinion:-2 } } },
    { label:'Search the old records again.', chance:'skill_lea', effects:{ clearFlag:'old_custom_1', setFlag:'old_custom_2' },
      success:{ text:'In a faded hand: pasture, fallen wood, and water, reserved to the households in perpetuity.', effects:{ setFlag:'rights_evidence', prestige:3, skills:{lea:1} } },
      failure:{ text:'The page that might have settled it was scraped clean generations ago.', effects:{ } } },
    { label:'Walk the old boundary by night.', chance:'skill_ste', effects:{ clearFlag:'old_custom_1', setFlag:'old_custom_2' },
      success:{ text:'Notches on trees and stones beneath the moss agree with the oldest memories.', effects:{ setFlag:'rights_evidence', skills:{ste:1} } },
      failure:{ text:'The forester finds you beyond the new stakes and reports the trespass.', effects:{ opinion:{role:'lord', amt:-6}, prestige:-2 } } },
    { label:'Pay a clerk for a clean copy. (8 gold)', require:{ goldMin:8 },
      effects:{ gold:-8, clearFlag:'old_custom_1', setFlag:'old_custom_2', setFlag2:'rights_evidence' } },
    { label:'Write the missing custom yourself.', chance:'skill_int', effects:{ clearFlag:'old_custom_1', setFlag:'old_custom_2' },
      success:{ text:'Old ink, old phrasing, an old seal impressed again. It may be enough.', effects:{ setFlag:'rights_evidence', skills:{int:1}, piety:-2 } },
      failure:{ text:'The clerk recognizes his predecessor’s hand — and knows this is not it.', effects:{ prestige:-5, opinion:{role:'lord', amt:-10}, piety:-3 } } }
  ]},

{ id:'old_custom_reeve', title:'The Reeve Comes at Dusk',
  trigger:{ flags:['old_custom_2'] }, weight:50, once:true,
  text:'The reeve comes without his men. First he offers a purse. Then he explains, very softly, what refusal may cost.',
  options:[
    { label:'Reject his purse before witnesses.',
      effects:{ clearFlag:'old_custom_2', setFlag:'old_custom_3', prestige:5, popularOpinion:5, opinion:{role:'lord', amt:-5} } },
    { label:'Take the purse and give him names.',
      effects:{ clearFlag:'old_custom_2', setFlag:'old_custom_3', setFlag2:'rights_collaborator', gold:12, popularOpinion:-12, opinion:{role:'lord', amt:10} } },
    { label:'Make him reveal whose purse it truly is.', chance:'skill_int', effects:{ clearFlag:'old_custom_2', setFlag:'old_custom_3' },
      success:{ text:'A feigned misunderstanding draws out the second tally — the one the lord has never seen.', effects:{ setFlag:'rights_evidence', prestige:5, skills:{int:1} } },
      failure:{ text:'He recognizes the trap and leaves smiling. The next threat will not be private.', effects:{ opinion:{role:'lord', amt:-6} } } },
    { label:'Make him use the stick in public.', chance:'battle', effects:{ clearFlag:'old_custom_2', setFlag:'old_custom_3' },
      success:{ text:'You do not give ground. By morning every bruise in the village belongs to your cause.', effects:{ setFlag:'rights_evidence', prestige:8, popularOpinion:5, skills:{mar:1} } },
      failure:{ text:'His men put you down hard, but they must do it where everyone can see.', effects:{ health:-2, prestige:3, popularOpinion:3 } } },
    { label:'Ask {lord} to examine his own reeve.', require:{ roleOpinionAbove:{role:'lord', value:20} },
      effects:{ clearFlag:'old_custom_2', setFlag:'old_custom_3', setFlag2:'rights_evidence', opinion:{role:'lord', amt:-3} } },
    { label:'Ask {priest} to stand as protector. (5 piety)', require:{ pietyMin:40 },
      effects:{ piety:-5, clearFlag:'old_custom_2', setFlag:'old_custom_3', setFlag2:'rights_evidence', opinion:{role:'priest', amt:10} } }
  ]},

{ id:'old_custom_hearing', title:'Before the Lord’s Bench',
  trigger:{ flags:['old_custom_3'] }, weight:60, once:true,
  text:'The households crowd the hall. The reeve has his tally and his men; you have whatever truth, skill, and favor you managed to gather.',
  options:[
    { label:'“Custom lives in those who keep it.”', chance:'rights_dip', effects:{ clearFlag:'old_custom_3' },
      success:{ text:'One witness follows another until even the steward must call the custom proven.', effects:{ setFlag:'old_custom_resolve', setFlag2:'old_custom_won', prestige:6, skills:{dip:1} } },
      failure:{ text:'The steward calls it noise, not law. The reeve’s smile returns.', effects:{ setFlag:'old_custom_resolve', setFlag2:'old_custom_lost', prestige:-4 } } },
    { label:'Lay out the rents, measures, and losses.', chance:'rights_ste', effects:{ clearFlag:'old_custom_3' },
      success:{ text:'The reeve’s demand contradicts his own accounts. The bench notices.', effects:{ setFlag:'old_custom_resolve', setFlag2:'old_custom_won', prestige:6, skills:{ste:1} } },
      failure:{ text:'The steward finds three errors before you finish the first column.', effects:{ setFlag:'old_custom_resolve', setFlag2:'old_custom_lost', prestige:-4 } } },
    { label:'Read the oldest words you found.', chance:'rights_lea', effects:{ clearFlag:'old_custom_3' },
      success:{ text:'The old formula leaves little room to wriggle. The right is older than the reeve’s office.', effects:{ setFlag:'old_custom_resolve', setFlag2:'old_custom_won', prestige:6, skills:{lea:1} } },
      failure:{ text:'The record speaks of another field, or perhaps another village. The case collapses in the reading.', effects:{ setFlag:'old_custom_resolve', setFlag2:'old_custom_lost', prestige:-4 } } },
    { label:'Prove that the reeve means to rob lord and village alike.', chance:'rights_int', effects:{ clearFlag:'old_custom_3' },
      success:{ text:'A concealed tally and a frightened clerk do what righteous speeches could not.', effects:{ setFlag:'old_custom_resolve', setFlag2:'old_custom_won', prestige:6, skills:{int:1} } },
      failure:{ text:'The accusation lands as slander. The steward fines insolence as well as defeat.', effects:{ setFlag:'old_custom_resolve', setFlag2:'old_custom_lost', gold:-5, prestige:-5 } } },
    { label:'Buy a narrow settlement. (10 gold)', require:{ goldMin:10 },
      effects:{ gold:-10, clearFlag:'old_custom_3', setFlag:'old_custom_resolve', setFlag2:'old_custom_compromise' } },
    { label:'Testify for the reeve.', require:{ flags:['rights_collaborator'] },
      effects:{ gold:8, clearFlag:'old_custom_3', setFlag:'old_custom_resolve', setFlag2:'old_custom_betrayed', opinion:{role:'lord', amt:10}, popularOpinion:-10 } }
  ]},

{ id:'old_custom_end', title:'What Is Remembered',
  trigger:{ flags:['old_custom_resolve'] }, weight:80, once:true,
  text:'The stakes, the hearing, and the names spoken there will be remembered. What matters now is what your household carries away.',
  options:[
    { label:'Bind the right to every hearth.', require:{ flags:['old_custom_won'], notHoldings:['common_rights'] },
      effects:{ holding:'common_rights', prestige:15, popularOpinion:10, opinion:{role:'lord', amt:-5}, clearFlag:'old_custom_resolve', clearFlag2:'old_custom_won', log:'Secured the ancient rights of common.' } },
    { label:'Renew the right already held by your house.', require:{ flags:['old_custom_won'], holdings:['common_rights'] },
      effects:{ prestige:15, popularOpinion:10, opinion:{role:'lord', amt:5}, clearFlag:'old_custom_resolve', clearFlag2:'old_custom_won' } },
    { label:'Ask for your freedom as the price.', require:{ flags:['old_custom_won'], tierMax:0 },
      effects:{ tierSet:1, prestige:15, popularOpinion:-5, opinion:{role:'lord', amt:10}, clearFlag:'old_custom_resolve', clearFlag2:'old_custom_won', log:'Won freedom in the struggle over the common.' } },
    { label:'Ask instead for a place in the lord’s service.', require:{ flags:['old_custom_won'], tierMin:1, tierMax:2 },
      effects:{ prestige:20, popularOpinion:-3, opinion:{role:'lord', amt:25}, clearFlag:'old_custom_resolve', clearFlag2:'old_custom_won' } },

    { label:'Accept the narrow peace.', require:{ flags:['old_custom_compromise'] },
      effects:{ prestige:8, opinion:{role:'lord', amt:10}, clearFlag:'old_custom_resolve', clearFlag2:'old_custom_compromise' } },
    { label:'Pay for full confirmation. (12 gold)', require:{ flags:['old_custom_compromise'], goldMin:12, notHoldings:['common_rights'] },
      effects:{ gold:-12, holding:'common_rights', prestige:10, popularOpinion:6, clearFlag:'old_custom_resolve', clearFlag2:'old_custom_compromise', log:'Bought confirmation of the household’s common rights.' } },
    { label:'Pull the stakes down after dark.', require:{ flags:['old_custom_compromise'], notHoldings:['common_rights'] }, chance:'skill_int',
      effects:{ clearFlag:'old_custom_resolve', clearFlag2:'old_custom_compromise' },
      success:{ text:'By dawn no stake stands and no witness remembers a face. Use becomes custom once more.', effects:{ holding:'common_rights', prestige:8, opinion:{role:'lord', amt:-15}, skills:{int:1} } },
      failure:{ text:'The reeve’s men are waiting among the trees.', effects:{ health:-2, gold:-8, opinion:{role:'lord', amt:-20} } } },

    { label:'Pay the amercement. (8 gold)', require:{ flags:['old_custom_lost'], goldMin:8 },
      effects:{ gold:-8, prestige:4, clearFlag:'old_custom_resolve', clearFlag2:'old_custom_lost' } },
    { label:'Take the punishment for everyone.', require:{ flags:['old_custom_lost'] },
      effects:{ health:-2, prestige:6, popularOpinion:12, clearFlag:'old_custom_resolve', clearFlag2:'old_custom_lost' } },
    { label:'Endure the judgment and remember.', require:{ flags:['old_custom_lost'] },
      effects:{ prestige:2, clearFlag:'old_custom_resolve', clearFlag2:'old_custom_lost' } },

    { label:'Take the reeve’s purse and office.', require:{ flags:['old_custom_betrayed'] },
      effects:{ gold:20, prestige:4, popularOpinion:-20, opinion:{role:'lord', amt:25}, addTrait:'deceitful', clearFlag:'old_custom_resolve', clearFlag2:'old_custom_betrayed', log:'Profited from the closing of the common.' } },
    { label:'Confess, and expose what the reeve paid for.', require:{ flags:['old_custom_betrayed'] },
      effects:{ piety:8, popularOpinion:10, prestige:-4, opinion:{role:'lord', amt:-15}, clearFlag:'old_custom_resolve', clearFlag2:'old_custom_betrayed' } }
  ]},

/* ================= MEDIUM STORIES — two events each ================= */
{ id:'mill_will_not_turn', title:'The Wheel Will Not Turn',
  trigger:{ tierMax:2, minAge:16, seasons:[1,2], chance:0.25 }, weight:10, once:true,
  text:'The mill wheel shudders to a stop with half the village’s grain waiting and rain in the air. Spoiled grain feeds nobody, but the miller still speaks of his toll.',
  options:[
    { label:'Put shoulder and tools to the gearing.', chance:'skill_ste', effects:{ setFlag:'mill_path_repair', queue:'mill_reckoning' },
      success:{ text:'By dusk the wheel turns again. Every sack behind yours was saved by your hands.', effects:{ gold:4, prestige:4, skills:{ste:1} } },
      failure:{ text:'The timber shifts at the wrong moment. The wheel remains still and you limp home.', effects:{ health:-1 } } },
    { label:'Carry the grain to another mill.', effects:{ gold:-2, health:-1, setFlag:'mill_path_carry', queue:'mill_reckoning' } },
    { label:'Load it on the pack mule.', require:{ holdings:['pack_mule'] },
      effects:{ gold:-1, setFlag:'mill_path_carry', queue:'mill_reckoning' } },
    { label:'Grind secretly and deny the toll.', chance:'skill_int', effects:{ setFlag:'mill_path_secret', queue:'mill_reckoning' },
      success:{ text:'The hand-querns turn behind shuttered doors. The flour is poor, but it is yours.', effects:{ gold:2, skills:{int:1} } },
      failure:{ text:'Flour dust and gossip travel equally well. The miller knows.', effects:{ opinion:{role:'lord', amt:-5} } } },
    { label:'Ask {lord} to suspend the toll.', chance:'skill_dip', effects:{ setFlag:'mill_path_appeal', queue:'mill_reckoning' },
      success:{ text:'The request is judged reasonable. The miller is told to swallow the loss.', effects:{ opinion:{role:'lord', amt:5}, prestige:2 } },
      failure:{ text:'A toll is a toll, you are told, whether or not the wheel turned.', effects:{ } } }
  ]},

{ id:'mill_reckoning', title:'The Miller’s Reckoning', trigger:{ never:true },
  text:'The miller arrives with his tally. Broken wheel or not, he says the lord is owed his customary share.',
  options:[
    { label:'Demand payment for the work you did.', require:{ flags:['mill_path_repair'] }, chance:'skill_dip', effects:{ clearFlag:'mill_path_repair' },
      success:{ text:'The miller pays rather than explain to the village why its savior owes him coin.', effects:{ gold:6, prestige:6, skills:{dip:1} } },
      failure:{ text:'He calls the repair a tenant’s duty and takes the toll besides.', effects:{ gold:-4 } } },
    { label:'Take a season’s freedom from toll instead.', require:{ flags:['mill_path_repair'] },
      effects:{ prestige:3, clearFlag:'mill_path_repair' } },
    { label:'Show that a failed mill voids its toll.', require:{ flags:['mill_path_carry'] }, chance:'skill_lea', effects:{ clearFlag:'mill_path_carry' },
      success:{ text:'The old custom is plain enough. The tally closes without your name.', effects:{ prestige:5, opinion:{role:'lord', amt:3}, skills:{lea:1} } },
      failure:{ text:'The words are less plain than you hoped. Two millers now want paying.', effects:{ gold:-5 } } },
    { label:'Pay both millers and be done. (4 gold)', require:{ flags:['mill_path_carry'] },
      effects:{ gold:-4, clearFlag:'mill_path_carry' } },
    { label:'Deny there was ever another quern.', require:{ flags:['mill_path_secret'] }, chance:'skill_int', effects:{ clearFlag:'mill_path_secret' },
      success:{ text:'He finds neither flour nor witness, and leaves with an empty tally.', effects:{ skills:{int:1} } },
      failure:{ text:'A child points directly at the hidden sack. The fine is immediate.', effects:{ gold:-6, prestige:-3 } } },
    { label:'Pay the fine before it grows. (6 gold)', require:{ flags:['mill_path_secret'], goldMin:6 },
      effects:{ gold:-6, clearFlag:'mill_path_secret', opinion:{role:'lord', amt:2} } },
    { label:'Press the appeal one last time.', require:{ flags:['mill_path_appeal'] }, chance:'skill_dip', effects:{ clearFlag:'mill_path_appeal' },
      success:{ text:'The lord confirms the waiver and rebukes the miller for greed.', effects:{ prestige:6, opinion:{role:'lord', amt:5}, skills:{dip:1} } },
      failure:{ text:'The lord tires of the question. The toll stands.', effects:{ gold:-4, opinion:{role:'lord', amt:-3} } } },
    { label:'Accept the lord’s judgment.', require:{ flags:['mill_path_appeal'] },
      effects:{ gold:-4, opinion:{role:'lord', amt:3}, clearFlag:'mill_path_appeal' } }
  ]},

{ id:'masters_empty_bench', title:'The Master’s Empty Bench',
  trigger:{ tierMin:1, tierMax:2, minAge:16, professions:['craftsman'], chance:0.3 }, weight:12, once:true,
  text:'Your old master dies with a commission unfinished, debts in the ledger, and a widow facing men who have already begun measuring the workshop.',
  options:[
    { label:'Finish the commission yourself.', chance:'skill_ste', effects:{ setFlag:'bench_path_finish', queue:'bench_mark' },
      success:{ text:'The work comes together beneath hands the master trained.', effects:{ skills:{ste:1}, prestige:3 } },
      failure:{ text:'Good material becomes expensive scrap. The widow says nothing.', effects:{ gold:-3 } } },
    { label:'Advance the widow six gold for materials.', require:{ goldMin:6 },
      effects:{ gold:-6, piety:3, setFlag:'bench_path_advance', queue:'bench_mark' } },
    { label:'Examine the master’s ledger.', chance:'skill_lea', effects:{ setFlag:'bench_path_ledger', queue:'bench_mark' },
      success:{ text:'The patron has paid less than half while claiming to have paid all.', effects:{ skills:{lea:1} } },
      failure:{ text:'Figures wander across the page without yielding a useful truth.', effects:{ } } },
    { label:'Buy the tools and obligations together. (12 gold)', require:{ goldMin:12 },
      effects:{ gold:-12, setFlag:'bench_path_buy', queue:'bench_mark' } },
    { label:'A dead master’s debts are not yours.', effects:{ prestige:-2 } }
  ]},

{ id:'bench_mark', title:'Whose Mark Is It?', trigger:{ never:true },
  text:'The patron arrives with guildsmen and sharp eyes. The work, the tools, and the widow’s livelihood will be decided before they leave.',
  options:[
    { label:'Finish it beneath the master’s mark.', require:{ flags:['bench_path_finish'] }, chance:'skill_ste', effects:{ clearFlag:'bench_path_finish' },
      success:{ text:'The patron pays, and the masters praise a loyalty that did not cheapen the craft.', effects:{ gold:8, prestige:8, piety:5, skills:{ste:1} } },
      failure:{ text:'The work is accepted at half price. Loyalty cannot plane a warped board.', effects:{ gold:2 } } },
    { label:'Put your own mark upon it.', require:{ flags:['bench_path_finish'] }, chance:'skill_ste', effects:{ clearFlag:'bench_path_finish' },
      success:{ text:'The piece bears your name, and buyers begin asking after it.', effects:{ gold:14, prestige:10, skills:{ste:1} } },
      failure:{ text:'The masters call it presumption and make certain the market hears.', effects:{ prestige:-10 } } },
    { label:'Defend the widow’s right to finish the trade.', require:{ flags:['bench_path_advance'] }, chance:'skill_dip', effects:{ clearFlag:'bench_path_advance' },
      success:{ text:'The bench remains hers, and your advance returns with grateful thanks.', effects:{ gold:6, prestige:8, piety:5, skills:{dip:1} } },
      failure:{ text:'The masters close ranks. Your silver bought only a little time.', effects:{ piety:3 } } },
    { label:'Let the gift stand without argument.', require:{ flags:['bench_path_advance'] },
      effects:{ piety:8, popularOpinion:5, clearFlag:'bench_path_advance' } },
    { label:'Use the ledger to demand the true price.', require:{ flags:['bench_path_ledger'] }, chance:'skill_int', effects:{ clearFlag:'bench_path_ledger' },
      success:{ text:'Faced with his own seal and figures, the patron pays what he owes.', effects:{ gold:12, prestige:6, skills:{int:1} } },
      failure:{ text:'He calls the figures a dead man’s fraud and your demand extortion.', effects:{ prestige:-8, opinion:{role:'lord', amt:-3} } } },
    { label:'Take the tools you bought.', require:{ flags:['bench_path_buy'], notHoldings:['fine_tools'] },
      effects:{ holding:'fine_tools', prestige:4, clearFlag:'bench_path_buy', log:'Bought a dead master’s tools and obligations.' } },
    { label:'Sell the duplicate tools.', require:{ flags:['bench_path_buy'], holdings:['fine_tools'] },
      effects:{ gold:10, prestige:4, clearFlag:'bench_path_buy' } }
  ]},

{ id:'words_before_dawn', title:'Words Before Dawn',
  trigger:{ tierMax:2, minAge:16, chance:0.16 }, weight:8, once:true,
  text:'A dying householder names who should receive the best beast, the tools, the household goods, and a final gift to the {temple}. There is no clerk — only breath, witnesses, and very little time.',
  options:[
    { label:'Commit every word to memory.', chance:'skill_lea', effects:{ setFlag:'testament_memory', queue:'testament_challenge' },
      success:{ text:'The phrasing fixes itself in your mind as if written there.', effects:{ setFlag:'testament_proof', skills:{lea:1} } },
      failure:{ text:'By dawn, three vital words have three possible meanings.', effects:{ } } },
    { label:'Gather two more witnesses.', chance:'skill_dip', effects:{ setFlag:'testament_witnesses', queue:'testament_challenge' },
      success:{ text:'Three households hear the same words and agree upon them.', effects:{ setFlag:'testament_proof', skills:{dip:1} } },
      failure:{ text:'One arrives too late; the other is kin to the expected claimant.', effects:{ } } },
    { label:'Inventory and seal the goods.', chance:'skill_ste', effects:{ setFlag:'testament_seal', queue:'testament_challenge' },
      success:{ text:'Every tool and animal is counted before anyone can spirit it away.', effects:{ setFlag:'testament_proof', skills:{ste:1} } },
      failure:{ text:'A chest is already open and nobody admits touching it.', effects:{ } } },
    { label:'Shade the wording for a promised fee.', chance:'skill_int', effects:{ setFlag:'testament_crooked', queue:'testament_challenge' },
      success:{ text:'The favored claimant presses three coins into your hand.', effects:{ gold:3, skills:{int:1}, piety:-3 } },
      failure:{ text:'The offer was a test. Your reputation reaches the door before you do.', effects:{ prestige:-5, piety:-3 } } },
    { label:'Refuse the responsibility.', effects:{ } }
  ]},

{ id:'testament_challenge', title:'The Claimant’s Challenge', trigger:{ never:true },
  text:'A kinsman rejects the last words and demands the goods. The local court wants something firmer than grief.',
  options:[
    { label:'Recite the words exactly.', require:{ flags:['testament_memory','testament_proof'] }, chance:0.8, effects:{ clearFlag:'testament_memory' },
      success:{ text:'Question follows question; the wording never changes. The testament stands.', effects:{ gold:4, prestige:8, piety:6 } },
      failure:{ text:'One phrase slips. The claimant drives a wedge into the uncertainty.', effects:{ prestige:-3 } } },
    { label:'Bring every witness forward.', require:{ flags:['testament_witnesses','testament_proof'] }, chance:0.75, effects:{ clearFlag:'testament_witnesses' },
      success:{ text:'Too many honest voices agree for the claimant to overcome them.', effects:{ gold:4, prestige:8, piety:6 } },
      failure:{ text:'Under pressure, the witnesses remember different gifts.', effects:{ prestige:-3 } } },
    { label:'Break the seal and read the inventory.', require:{ flags:['testament_seal','testament_proof'] }, chance:0.8, effects:{ clearFlag:'testament_seal' },
      success:{ text:'Nothing is missing and every mark is witnessed. The division proceeds.', effects:{ gold:5, prestige:8, piety:5 } },
      failure:{ text:'One seal is damaged. Suspicion swallows the rest of the evidence.', effects:{ prestige:-3 } } },
    { label:'Admit the proof is uncertain and refer it upward.', require:{ notFlags:['testament_proof'], flags:['testament_memory'] },
      effects:{ piety:2, opinion:{role:'lord', amt:3}, clearFlag:'testament_memory' } },
    { label:'Admit the witnesses are uncertain and refer it upward.', require:{ notFlags:['testament_proof'], flags:['testament_witnesses'] },
      effects:{ piety:2, opinion:{role:'lord', amt:3}, clearFlag:'testament_witnesses' } },
    { label:'Admit the inventory is uncertain and refer it upward.', require:{ notFlags:['testament_proof'], flags:['testament_seal'] },
      effects:{ piety:2, opinion:{role:'lord', amt:3}, clearFlag:'testament_seal' } },
    { label:'Sell the testimony as promised.', require:{ flags:['testament_crooked'] }, chance:'skill_int', effects:{ clearFlag:'testament_crooked' },
      success:{ text:'Your chosen version becomes the court’s version. The claimant pays well.', effects:{ gold:12, piety:-8, skills:{int:1} } },
      failure:{ text:'Another witness names the bargain aloud. The court turns on you.', effects:{ prestige:-10, piety:-5, opinion:{role:'lord', amt:-8} } } },
    { label:'Repent and tell the court about the bribe.', require:{ flags:['testament_crooked'] },
      effects:{ piety:6, prestige:-2, clearFlag:'testament_crooked' } }
  ]},

/* ================= LOWER-STATION ONE-OFFS ================= */
{ id:'after_reapers', title:'After the Reapers',
  trigger:{ tierMax:2, minAge:16, seasons:[2], chance:0.12 }, weight:6, cooldown:12,
  text:'A poor household moves through the stubble, gathering fallen stalks before everyone agrees the harvest is finished. There is little grain in their sack, but less in their house.',
  options:[
    { label:'Let them glean in peace.', effects:{ piety:5, popularOpinion:4 } },
    { label:'Hire them to thresh. (2 gold)', require:{ goldMin:2 }, chance:'skill_ste', effects:{ gold:-2 },
      success:{ text:'Their labor saves more grain than their wages cost.', effects:{ gold:5, popularOpinion:4, skills:{ste:1} } },
      failure:{ text:'Rain comes before the last sheaf is beaten. At least the household ate.', effects:{ piety:3 } } },
    { label:'Share fruit from the orchard instead.', require:{ holdings:['orchard'] }, effects:{ piety:7, popularOpinion:5 } },
    { label:'Keep every stalk.', effects:{ gold:3, piety:-3, popularOpinion:-4 } }
  ]},

{ id:'bad_silver', title:'Bad Silver',
  trigger:{ tierMax:2, minAge:16, goldMin:1, chance:0.1 }, weight:5, cooldown:12,
  text:'Two coins in your payment are thin at the edge and wrong in the color. They may be foreign, clipped, or simply made by a liar.',
  options:[
    { label:'Weigh and test them.', chance:'skill_ste',
      success:{ text:'The balance reveals the fraud before the seller leaves.', effects:{ gold:2, prestige:3, skills:{ste:1} } },
      failure:{ text:'Your test proves nothing. By the time another man spots the clipping, the seller is gone.', effects:{ gold:-2 } } },
    { label:'Read the mint and ruler on the face.', chance:'skill_lea',
      success:{ text:'Foreign, not false — and worth slightly more than either of you knew.', effects:{ gold:3, skills:{lea:1} } },
      failure:{ text:'The worn letters offer no answer.', effects:{ } } },
    { label:'Pass them to the next fool.', chance:'skill_int',
      success:{ text:'The bad silver leaves your purse and becomes another household’s lesson.', effects:{ gold:3, piety:-2, skills:{int:1} } },
      failure:{ text:'The market catches the trick and remembers your face.', effects:{ prestige:-6, popularOpinion:-3 } } },
    { label:'Surrender them to the lord’s officer.', effects:{ gold:-2, prestige:3, opinion:{role:'lord', amt:5} } }
  ]},

{ id:'retinue_at_door', title:'The Retinue at the Door',
  trigger:{ tierMax:2, minAge:16, realmAtWar:true, chance:0.12 }, wartime:true, weight:6, cooldown:12,
  text:'Men wearing the lord’s colors fill the lane. They require food, fodder, and dry floor before they march again — and requirement sounds very much like command.',
  options:[
    { label:'Host them properly. (5 gold)', require:{ goldMin:5 }, effects:{ gold:-5, opinion:{role:'lord', amt:10}, prestige:3 } },
    { label:'Repair their gear for payment.', require:{ professions:['craftsman'] }, chance:'skill_ste',
      success:{ text:'Straps, rivets, and wheels leave sounder than they arrived.', effects:{ gold:4, opinion:{role:'lord', amt:8}, skills:{ste:1} } },
      failure:{ text:'A hasty repair fails inspection. They take food in place of payment.', effects:{ gold:-3 } } },
    { label:'Trade supper for campaign gossip.', chance:'skill_int',
      success:{ text:'By midnight you know where the banners march and which captain fears whom.', effects:{ prestige:3, worldNews:true, skills:{int:1} } },
      failure:{ text:'Soldiers eat your supper and tell lies for sport.', effects:{ gold:-2 } } },
    { label:'Cite the custom limiting their demands.', chance:'skill_lea',
      success:{ text:'The captain recognizes the words and takes only what is owed.', effects:{ prestige:4, skills:{lea:1} } },
      failure:{ text:'He interprets the custom differently, with six hungry men behind him.', effects:{ gold:-5, opinion:{role:'lord', amt:-8} } } },
    { label:'Bar the door.', chance:'battle',
      success:{ text:'The first man through finds himself back in the mud. The rest decide another roof is easier.', effects:{ prestige:5, opinion:{role:'lord', amt:-5} } },
      failure:{ text:'The door gives, then you do. They leave bruises and an empty larder.', effects:{ health:-1, gold:-4, opinion:{role:'lord', amt:-10} } } }
  ]},

{ id:'swarm_in_eaves', title:'A Swarm in the Eaves',
  trigger:{ tierMax:2, minAge:16, seasons:[0,1], chance:0.1 }, weight:5, cooldown:16,
  text:'A cloud of bees settles beneath the eaves, heavy with promise and noise. Honey keeps; wax sells; stings swell.',
  options:[
    { label:'Hive them with smoke and patience.', chance:'swarm',
      success:{ text:'The queen settles into the basket. By autumn there is honey enough to sell.', effects:{ gold:5, skills:{ste:1} } },
      failure:{ text:'The swarm takes offense and then takes flight.', effects:{ health:-1 } } },
    { label:'Ask {friend} to help.', require:{ hasRole:'friend' }, effects:{ gold:3, opinion:{role:'friend', amt:5} } },
    { label:'Give the first wax and honey to the {temple}.', effects:{ piety:6, opinion:{role:'priest', amt:5} } },
    { label:'Drive them away.', effects:{ } }
  ]},

{ id:'ford_in_flood', title:'The Ford in Flood',
  trigger:{ tierMax:2, minAge:16, seasons:[0], terrains:['farmland','forest','hills','mountains','marsh'], chance:0.12 }, weight:6, cooldown:12,
  text:'Snowmelt has turned the ford brown and violent. A cart has slewed sideways in the current, with a family clinging to it as the water rises.',
  options:[
    { label:'Ride or swim out to them.', chance:'battle',
      success:{ text:'One by one, every hand reaches the bank. The whole road saw who went first.', effects:{ prestige:7, popularOpinion:4, skills:{mar:1} } },
      failure:{ text:'The current hammers you against the cart before others drag everyone clear.', effects:{ health:-2, prestige:2 } } },
    { label:'Rig a rope and lever from the bank.', chance:'skill_ste',
      success:{ text:'The cart turns with the rope instead of against it. Wood, beasts, and people come free together.', effects:{ prestige:6, skills:{ste:1} } },
      failure:{ text:'The first rope parts and whips your hands raw.', effects:{ health:-1 } } },
    { label:'Put every bystander to work.', chance:'skill_dip',
      success:{ text:'A frightened crowd becomes a line of hands. Nobody is lost.', effects:{ prestige:4, popularOpinion:5, skills:{dip:1} } },
      failure:{ text:'Everyone shouts a different command until a stronger voice takes over.', effects:{ prestige:-2 } } },
    { label:'Run for more help.', effects:{ prestige:1 } },
    { label:'Keep walking.', effects:{ prestige:-2 } }
  ]}
);
