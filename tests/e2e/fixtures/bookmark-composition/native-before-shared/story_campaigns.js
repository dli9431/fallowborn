/* Registered campaign instances. Conditions and messages are authoring data;
   the campaign story type contains no bookmark or historical-person selectors. */
window.FBDATA = window.FBDATA || {};
/* Named actors have authored identities and game-scaled ages and standing. */
FBDATA.storyActors476 = FBDATA.bookmarkRegions476.dalmatia_east.storyActors;
FBDATA.storyCampaigns = {
  clovis_syagrius_476:FBDATA.bookmarkRegions476.gaul_iberia.storyCampaigns.clovis_syagrius_476,
  theoderic_italy_476:FBDATA.bookmarkRegions476.dalmatia_east.campaigns.theoderic_italy_476,
  eastern_africa_476:FBDATA.bookmarkRegions476.africa.campaigns.eastern_africa_476,
  eastern_italy_476:{ id:'eastern_italy_476', type:'campaign',
    requires:['western_court_476'], name:'The Eastern Italian Campaign',
    desc:'The eastern court may contest the present ruler of Ravenna. No historical date guarantees an Italian conquest.',
    firstYear:535, lastYear:560, durationDays:2880,
    actor:{ realmId:'byzantium' }, target:{ provinceId:'ravenna' },
    conditions:[{ kind:'owner', provinceId:'constantinople', realmId:'byzantium' }],
    news:{
      started:{ key:'news.476.italy_campaign', text:'⚔ The eastern court opens an Italian reconquest campaign against the current ruler of Ravenna.' },
      won:{ key:'news.476.italy_won', text:'🏛 The eastern court secures Ravenna through its campaign.' },
      failed:{ key:'news.476.italy_failed', text:'🏳 The eastern Italian campaign ends without securing Ravenna.' },
      diverted:{ key:'news.476.italy_diverted', text:'📜 The Italian reconquest opportunity closes as the courts take another course.' },
      interrupted:{ key:'news.476.italy_interrupted', text:'📜 A change of eastern court interrupts the Italian campaign.' }
    } }
};

Object.assign(FBDATA.storyCampaigns, FBDATA.bookmarkRegions476.italy.storyCampaigns);

Object.assign(FBDATA.storyCampaigns, FBDATA.bookmarkRegions476.dalmatia_east.campaigns);
Object.assign(FBDATA.storyCampaigns, FBDATA.bookmarkRegions476.gaul_iberia.storyCampaigns);
