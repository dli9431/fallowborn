/* Registered campaign instances. Conditions and messages are authoring data;
   the campaign story type contains no bookmark or historical-person selectors. */
window.FBDATA = window.FBDATA || {};
/* Named actors have authored identities and game-scaled ages and standing. */
FBDATA.storyActors476 = {
  illus:{ name:'Illus', culture:'greek', religion:'chalcedonian', age:40,
    station:4, role:'commander', home:'ikonion' },
  trocundes:{ name:'Trocundes', culture:'greek', religion:'chalcedonian', age:40,
    station:4, role:'commander', home:'ikonion' }
};
FBDATA.storyCampaigns = {
  clovis_syagrius_476:{ id:'clovis_syagrius_476', type:'campaign',
    requires:['western_court_476'], name:'The Roman Domain at Soissons',
    desc:'Clovis may contest Syagrius after inheriting the Frankish court. Their living courts and an ordinary campaign decide the outcome.',
    firstYear:486, lastYear:500, durationDays:2880,
    actor:{ realmId:'franks_476', character:{ storyId:'western_court_476', field:'clovisId' } },
    target:{ provinceId:'laon', ownerIds:['west_francia'],
      character:{ storyId:'western_court_476', field:'syagriusId' } },
    news:{
      started:{ key:'news.476.clovis_campaign', text:'⚔ Clovis contests the Roman domain around Soissons. Its actual war will decide the county.' },
      won:{ key:'news.476.clovis_won', text:'🏛 The Frankish court secures Soissons through its campaign.' },
      failed:{ key:'news.476.clovis_failed', text:'🏳 The Frankish attempt at Soissons ends without its objective.' },
      diverted:{ key:'news.476.clovis_diverted', text:'📜 The courts around Soissons have taken another course; the Clovis opportunity closes.' },
      interrupted:{ key:'news.476.clovis_interrupted', text:'📜 The living actors of the Soissons campaign no longer hold their original positions.' }
    } },
  theoderic_italy_476:{ id:'theoderic_italy_476', type:'campaign',
    requires:['western_court_476'], name:'The Amal Commission for Italy',
    desc:'Theoderic the Amal can receive Zeno’s commission and lead his existing host and court toward Ravenna. Theoderic Strabo’s Thracian host remains a separate body.',
    firstYear:488, lastYear:493, durationDays:2160,
    actor:{ realmId:'pannonia', character:{ storyId:'western_court_476', field:'theodericId' } },
    target:{ provinceId:'ravenna', ownerIds:['italy','federates_476'] },
    conditions:[
      { kind:'ruler', realmId:'byzantium', character:{ storyId:'western_court_476', field:'zenoId' } },
      { kind:'owner', provinceId:'constantinople', realmId:'byzantium' },
      { kind:'landless', realmId:'pannonia' },
      { kind:'host', hostId:'host_476_amal', realmId:'pannonia' }
    ],
    commission:{ source:'imperial_commission', issuerRealmId:'byzantium' },
    migrationId:'theoderic_italy',
    settlement:{ churchId:'rome_see', civicId:'ravenna_council',
      faithId:'nicene', minimumShare:0.5, governmentForm:'roman_civic' },
    news:{
      started:{ key:'news.476.theoderic_campaign', text:'⚔ The Amal court marches toward Ravenna under an eastern commission. War and settlement must secure its objective.' },
      won:{ key:'news.476.theoderic_outcome', text:'🏛 The Gothic court now holds Ravenna; local church and civic rights depend on the surviving delegates.' },
      failed:{ key:'news.476.theoderic_failed', text:'🏳 The Amal campaign ends without completing its Italian settlement.' },
      diverted:{ key:'news.476.theoderic_diverted', text:'📜 The Italian opportunity no longer fits the Amal and eastern courts.' },
      interrupted:{ key:'news.476.theoderic_interrupted', text:'📜 The host or living imperial mandate needed for the Amal campaign is lost.' }
    } },
  eastern_africa_476:{ id:'eastern_africa_476', type:'campaign',
    requires:['western_court_476'], name:'The Eastern African Campaign',
    desc:'An eastern court retaining Constantinople may contest Carthage against its current sovereign. The map’s armies decide possession.',
    firstYear:533, lastYear:550, durationDays:2880,
    actor:{ realmId:'byzantium' }, target:{ provinceId:'tunis' },
    conditions:[{ kind:'owner', provinceId:'constantinople', realmId:'byzantium' }],
    news:{
      started:{ key:'news.476.africa_campaign', text:'⚔ The eastern court opens an African reconquest campaign against the current ruler of Carthage.' },
      won:{ key:'news.476.africa_won', text:'🏛 The eastern court secures Carthage through its campaign.' },
      failed:{ key:'news.476.africa_failed', text:'🏳 The eastern African campaign ends without securing Carthage.' },
      diverted:{ key:'news.476.africa_diverted', text:'📜 The African reconquest opportunity closes as its political conditions change.' },
      interrupted:{ key:'news.476.africa_interrupted', text:'📜 A change of eastern court interrupts the African campaign.' }
    } },
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
