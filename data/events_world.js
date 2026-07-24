/* =========================================================================
   Fallowborn — WORLD EVENTS: raids, plagues, portents, the levy.
   ========================================================================= */
window.FBDATA = window.FBDATA || {};
FBDATA.events = FBDATA.events || [];

FBDATA.events.push(

{ id:'raiders_come', title:'Sails on the Horizon',
  trigger:{ tierMax:2, coastal:true, religionGroup:'christian', yearMax:1000, chance:0.12 }, childhood:true, weight:8, cooldown:8,
  text:'Dragon-prowed ships ground on the shingle and armed men pour out, moving with terrible practice toward the village and its church.',
  options:[
    { label:'Flee to the woods with what you can carry.', desc:'Better a lighter purse than a shallow grave.', effects:{ gold:-5, health:0, log:'Survived a raid by hiding.' } },
    { label:'Stand with the levy at the bridge.', require:{ minAge:16 }, desc:'Glory if the line holds; a wound and ashes if it breaks.', chance:0.45,
      success:{ text:'Against all odds the bridge holds. The raiders take their dead and go. You are a hero.', effects:{ prestige:15, skills:{mar:2}, addTrait:'brave', log:'Helped repel northmen raiders!' } },
      failure:{ text:'The line breaks in moments. You wake wounded among the ashes.', effects:{ health:-3, gold:-8, addTrait:'scarred' } } },
    { label:'Hide in the church and pray.', desc:'{god} may shield the altar — or the raiders may look there first.', chance:0.5,
      success:{ text:'The raiders, laden elsewhere, pass the church by. A miracle, plainly.', effects:{ piety:8 } },
      failure:{ text:'The church is exactly where they went first.', effects:{ gold:-10, health:-2 } } }
  ]},
{ id:'levy_call', title:'The Levy Is Called',
  trigger:{ tierMax:1, sex:'m', minAge:16, maxAge:45, realmAtWar:true, notFlags:['on_campaign'], professions:['farmer','craftsman','merchant'], chance:0.35 }, weight:12, cooldown:8,
  text:'War. The reeve reads the summons at the {temple} door: every able man of {province} to muster with spear, shield, and three weeks’ bread.',
  options:[
    { label:'March with the levy.', desc:'Three weeks’ bread, and whatever the war leaves of you.', effects:{ setFlag:'on_campaign', profession:'soldier', setFlag2:'was_civilian', log:'Marched to war with the levy.' } },
    { label:'Pay a stranger to march in your place.', require:{ goldMin:10 }, desc:'Silver buys another man’s courage, and the village’s contempt.', effects:{ gold:-10, prestige:-2 } },
    { label:'Hide until the muster passes.', desc:'A hayloft is no fortress if the reeve knows his business.', chance:0.6,
      success:{ text:'You dodge the levy — and the war.', effects:{ prestige:-5 } },
      failure:{ text:'Dragged from the hayloft and marched off in a rope collar.', effects:{ setFlag:'on_campaign', profession:'soldier', setFlag2:'was_civilian', prestige:-8, popularOpinion:-5 } } }
  ]},
{ id:'campaign_ends', title:'The War Lets You Go',
  trigger:{ flags:['on_campaign'], realmAtWar:false }, wartime:true, weight:40,
  text:'Peace, or something shaped like it. The host disbands, and the survivors trudge home to their fields, changed.',
  options:[
    { label:'Home again.', desc:'The fields kept, and so did you.', effects:{ clearFlag:'on_campaign', restoreProfession:true, gold:4, log:'Came home from the war.' } }
  ]},
{ id:'pestilence_arrives', title:'The Pestilence',
  trigger:{ chance:0.02, notFlags:['plague_here'], yearMin:870 }, childhood:true, weight:6, cooldown:40,
  text:{ default:'It came with the traders, they say. First the fever, then the marks, then the bells. The pestilence has reached {province}.',
    muslim:'It came with the traders, they say. First the fever, then the marks, then the wailing. The pestilence has reached {province}.',
    pagan:'It came with the traders, they say. First the fever, then the marks, then the pyres. The pestilence has reached {province}.' },
  options:[
    { label:'{god} preserve us.', desc:'There is little to do now but bar the door and pray.', effects:{ setFlag:'plague_here', piety:3, log:'Pestilence reached {province}.' } }
  ]},
{ id:'pestilence_rages', title:'The Dying Time',
  trigger:{ flags:['plague_here'], chance:0.6 }, wartime:true, childhood:true, weight:20, cooldown:2,
  text:'Carts in the lanes, lime on the doors. Every family has a grave to dig; some have no one left to dig it.',
  options:[
    { label:'Shut your household away.', desc:'Hide from the sickness and hope it passes your door.', chance:0.75,
      success:{ text:'The sickness passes your door.', effects:{ gold:-3 } },
      failure:{ text:'It finds a crack. The fever takes you.', effects:{ health:-3, setFlag:'ill' } } },
    { label:'Help bury the dead.', desc:'The village will remember — if the fever does not claim you too.', chance:0.55,
      success:{ text:'Grim work, holy work. The village will not forget.', effects:{ piety:12, prestige:8, popularOpinion:10 } },
      failure:{ text:'The dead share their sickness with the living.', effects:{ piety:8, health:-3, setFlag:'ill' } } },
    { label:'Flee to another province.', desc:'Somewhere the bells are not ringing. Perhaps.', effects:{ moveRandom:true, gold:-5, clearFlag:'plague_here', log:'Fled the pestilence.' } }
  ]},
{ id:'pestilence_ends', title:'The Bells Fall Silent',
  trigger:{ flags:['plague_here'], chance:0.3 }, wartime:true, childhood:true, weight:10,
  text:'A season passes with no new graves. Thin, wary, the survivors of {province} step into the sun and count who remains.',
  options:[ { label:'It is over.', desc:'Count the living and begin again.', effects:{ clearFlag:'plague_here', piety:5, log:'The pestilence ended.' } } ]},
{ id:'comet', title:'A Hairy Star',
  trigger:{ chance:0.03 }, childhood:true, weight:3, cooldown:60,
  text:'A comet drags its burning hair across the night sky. Preachers cry doom; wise women sell charms; everyone looks up.',
  options:[
    { label:'An omen of my rise.', desc:'Let the heavens burn for you.', effects:{ prestige:5 } },
    { label:'A warning to repent.', desc:'Best to kneel while there is still time.', effects:{ piety:8 } },
    { label:'A rock in the sky.', desc:'Someone in this village has read a book.', effects:{ skills:{lea:1} } }
  ]},
{ id:'wandering_skald', title:'The Storyteller',
  trigger:{ chance:0.1 }, weight:4, cooldown:12,
  text:'A traveling singer works the crowd by the fire — wars in far lands, kings dead and crowned, and a rumor for every purse.',
  options:[
    { label:'Buy him ale for the news.', require:{ goldMin:1, religionGroups:['christian','pagan','jewish'] }, desc:'A little silver, a lot of the world.', effects:{ gold:-1, skills:{dip:1}, worldNews:true } },
    { label:'Buy him supper for the news.', require:{ goldMin:1, religionGroups:['muslim'] }, desc:'A full belly loosens any tongue.', effects:{ gold:-1, skills:{dip:1}, worldNews:true } },
    { label:'Tell him YOUR story.', desc:'Songs could carry your name — or bury it in his.', chance:0.4,
      success:{ text:'He weaves your deeds into his tale. Your name will travel roads you never will.', effects:{ prestige:8 } },
      failure:{ text:'He improves your story until it is no longer yours, then leaves.', effects:{ } } }
  ]},
{ id:'conversion_pressure', title:'The New Faith',
  trigger:{ religionGroup:'pagan', provinceReligionGroup:'christian', chance:0.15 }, weight:6, cooldown:12,
  text:'The missionaries grow bolder, and converts multiply around you. The old gods’ shrines stand quieter each year. To rise here may mean to kneel at their font.',
  options:[
    { label:'Take their baptism.', desc:'A new god, an old ambition — the font may open doors.', effects:{ convertToProvince:true, piety:0, prestige:5, log:'Converted to the local faith.' } },
    { label:'Keep the old ways.', desc:'The old gods remember those who remember them.', effects:{ piety:5, prestige:-3 } }
  ]},
{ id:'strange_bounty', title:'The Sea Gives',
  trigger:{ coastal:true, chance:0.08 }, weight:4, cooldown:16,
  text:'A storm-tide leaves a broken ship on the strand — timbers, casks, and a drowned man with rings on his fingers. By law it is the lord’s. By dawn, it is whoever’s got there first.',
  options:[
    { label:'Take what the sea offers.', desc:'The sea pays no tithe, but the lord’s men keep accounts.', chance:0.7,
      success:{ text:{ default:'Casks of wine and a purse of foreign silver, safely hidden.',
        muslim:'Bolts of dyed cloth and a purse of foreign silver, safely hidden.' }, effects:{ gold:10, piety:-2 } },
      failure:{ text:'The lord’s men arrive while your arms are full.', effects:{ gold:-3, prestige:-4, opinion:{role:'lord', amt:-10} } } },
    { label:'Report it to the lord.', desc:'Honesty is cheaper than a whipping, and sometimes rewarded.', effects:{ opinion:{role:'lord', amt:8}, gold:2 } },
    { label:'Bury the drowned man properly.', desc:'The dead deserve better than gulls.', effects:{ piety:8 } }
  ]}
);
