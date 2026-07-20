/* =========================================================================
   Fallowborn — PEASANT & VILLAGE EVENTS (tiers 0-1, farming folk)
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
  ]}
);
