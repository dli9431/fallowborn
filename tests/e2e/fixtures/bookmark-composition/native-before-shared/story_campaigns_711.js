/* Review-candidate instances of the existing campaign story type.
   Registering these records attaches nothing to an accepted bookmark.
   A missing prerequisite resolves divergence rather than forcing history. */
window.FBDATA = window.FBDATA || {};
FBDATA.storyCampaigns711 = {
  strait_crossing_711:{ id:'strait_crossing_711', type:'campaign',
    name:'Across the Strait',
    desc:'The Umayyad court may contest the southern Gothic coast from its North African possessions. Malaga represents the landing region on this county grid; the date grants neither a beachhead nor a victory.',
    firstYear:711, lastYear:714, durationDays:1080,
    actor:{ realmId:'umayyad_711' },
    target:{ provinceId:'malaga', ownerIds:['visigoths_711'] },
    conditions:[{ kind:'owner', provinceId:'tangier', realmId:'umayyad_711' }],
    news:{
      started:{ key:'news.711.crossing.started', text:'⚔ The Umayyad court opens a campaign across the strait against the southern Gothic coast.' },
      won:{ key:'news.711.crossing.won', text:'⚔ The Umayyad court secures a southern Iberian foothold through its armies.' },
      failed:{ key:'news.711.crossing.failed', text:'🏳 The crossing campaign ends without securing its coastal objective.' },
      diverted:{ key:'news.711.crossing.diverted', text:'📜 The courts or coastal possession take the crossing opportunity in another direction.' },
      interrupted:{ key:'news.711.crossing.interrupted', text:'📜 A change of ruling court interrupts the crossing campaign.' }
    } },
  toledo_campaign_711:{ id:'toledo_campaign_711', type:'campaign',
    name:'The Road to Toledo',
    desc:'A surviving Umayyad foothold can support a campaign against Toledo. The Gothic court may survive, lose its capital or take another course; no date deposes its ruler or transfers its remaining counties.',
    firstYear:714, lastYear:718, durationDays:1800,
    actor:{ realmId:'umayyad_711' },
    target:{ provinceId:'toledo', ownerIds:['visigoths_711'] },
    conditions:[{ kind:'owner', provinceId:'malaga', realmId:'umayyad_711' }],
    news:{
      started:{ key:'news.711.toledo.started', text:'⚔ An Umayyad foothold supports a campaign toward Toledo.' },
      won:{ key:'news.711.toledo.won', text:'🏛 Toledo falls through ordinary war. Surviving Gothic possessions and communities keep their own histories.' },
      failed:{ key:'news.711.toledo.failed', text:'🏳 The campaign ends without securing Toledo.' },
      diverted:{ key:'news.711.toledo.diverted', text:'📜 The coastal foothold or Gothic capital no longer supports the Toledo opportunity.' },
      interrupted:{ key:'news.711.toledo.interrupted', text:'📜 A change of ruling court interrupts the Toledo campaign.' }
    } },
  septimania_campaign_711:{ id:'septimania_campaign_711', type:'campaign',
    name:'The Septimanian Campaign',
    desc:'After an Iberian advance, the Umayyad court may contest the northeastern Gothic kingdom at Narbonne. A surviving rival court must be defeated through ordinary war.',
    firstYear:719, lastYear:725, durationDays:2160,
    actor:{ realmId:'umayyad_711' },
    target:{ provinceId:'narbonne', ownerIds:['achila_711'] },
    conditions:[{ kind:'owner', provinceId:'toledo', realmId:'umayyad_711' }],
    news:{
      started:{ key:'news.711.septimania.started', text:'⚔ The Umayyad court contests the Gothic seat at Narbonne.' },
      won:{ key:'news.711.septimania.won', text:'🏛 The Umayyad armies secure Narbonne.' },
      failed:{ key:'news.711.septimania.failed', text:'🏳 The Septimanian campaign ends without securing Narbonne.' },
      diverted:{ key:'news.711.septimania.diverted', text:'📜 Changed Iberian possession or a different northeastern court closes the Septimanian opportunity.' },
      interrupted:{ key:'news.711.septimania.interrupted', text:'📜 A change of ruling court interrupts the Septimanian campaign.' }
    } },
  gaul_campaign_711:{ id:'gaul_campaign_711', type:'campaign',
    name:'The Aquitanian Campaign',
    desc:'A surviving Umayyad foothold at Narbonne may open a campaign toward Toulouse. The armies decide the outcome; an attack on Aquitaine does not guarantee a march to Tours.',
    firstYear:725, lastYear:732, durationDays:2520,
    actor:{ realmId:'umayyad_711' },
    target:{ provinceId:'toulouse', ownerIds:['aquitaine_711'] },
    conditions:[{ kind:'owner', provinceId:'narbonne', realmId:'umayyad_711' }],
    news:{
      started:{ key:'news.711.gaul.started', text:'⚔ The Umayyad court opens an Aquitanian campaign from its Septimanian foothold.' },
      won:{ key:'news.711.gaul.won', text:'🏛 The campaign secures Toulouse through ordinary war.' },
      failed:{ key:'news.711.gaul.failed', text:'🏳 The Aquitanian campaign ends without securing Toulouse.' },
      diverted:{ key:'news.711.gaul.diverted', text:'📜 Changed Septimanian possession or an altered Aquitanian court closes the campaign opportunity.' },
      interrupted:{ key:'news.711.gaul.interrupted', text:'📜 A change of ruling court interrupts the Aquitanian campaign.' }
    } }
};
Object.assign(FBDATA.storyCampaigns, FBDATA.storyCampaigns711);

/* Asturias is absent at creation. A surviving northern remnant or an earned
   local revolt settlement can establish this court after Toledo falls. */
FBDATA.storyFoundations = {
  asturias_foundation_711:{ id:'asturias_foundation_711', type:'polity_foundation',
    name:'The Asturian Resistance',
    desc:'After the Umayyads take Toledo, the Asturian uplands may form a court under Pelayo. A surviving Gothic remnant can break away at peace. Conquered uplands must earn independence through an ordinary local revolt; the date guarantees no victory.',
    firstYear:718, lastYear:730, durationDays:1080,
    collapse:{ provinceId:'toledo', formerRealmId:'visigoths_711', ownerIds:['umayyad_711'] },
    remnantRealmIds:['visigoths_711'], revoltRealmIds:['umayyad_711'],
    community:{ faithId:'catholic', minimumShare:0.5 },
    realm:{ id:'asturias_711', name:'Asturias', color:'#b58a42', capital:'oviedo',
      rank:3, aggression:0.7, government:'territorial', religion:'catholic',
      ruler:{ name:'Pelayo', sex:'m', culture:'gothic', born:685, mar:10, trait:'patient' } },
    news:{
      founded:{ key:'news.711.asturias.founded', text:'🏔 Pelayo establishes an Asturian court after the loss of Toledo. Its surviving territory and future wars follow ordinary political rules.' },
      failed:{ key:'news.711.asturias.failed', text:'🏳 The northern uprising ends without founding Pelayo’s court. Its ordinary military and local settlement outcomes remain in force.' },
      diverted:{ key:'news.711.asturias.diverted', text:'📜 Northern control or the course of the Gothic conquest closes the Asturian foundation opportunity.' }
    } }
};
