/* Conditional opportunities use the existing campaign factory. No calendar
   entry grants land, kills a ruler or changes an unrelated campaign's law. */
window.FBDATA = window.FBDATA || {};
FBDATA.storyCampaigns800 = {
  barcelona_800:{ id:'barcelona_800', type:'campaign',
    name:'The Barcelona Frontier',
    desc:'The Aquitanian court may contest Barcelona while the Carolingian frontier and the Cordoban emirate survive. A siege must secure the city.',
    firstYear:801, lastYear:804, durationDays:1080,
    actor:{ realmId:'carolingian_800' },
    target:{ provinceId:'barcelona', ownerIds:['cordoba'] },
    conditions:[{ kind:'owner', provinceId:'aachen', realmId:'carolingian_800' },
      { kind:'owner', provinceId:'bordeaux', realmId:'carolingian_800' }],
    news:{
      started:{ key:'news.800.barcelona_started', text:'⚔ The Aquitanian court opens a campaign for Barcelona.' },
      won:{ key:'news.800.barcelona_won', text:'🏰 The Aquitanian campaign secures Barcelona.' },
      failed:{ key:'news.800.barcelona_failed', text:'🏳 Barcelona remains beyond the Aquitanian campaign’s reach.' },
      diverted:{ key:'news.800.barcelona_diverted', text:'📜 Changed frontier control closes the Barcelona opportunity.' },
      interrupted:{ key:'news.800.barcelona_interrupted', text:'📜 A change of court interrupts the Barcelona campaign.' }
    } },
  danish_friesland_800:{ id:'danish_friesland_800', type:'campaign',
    name:'The Danish Coast Campaign',
    desc:'A surviving Danish court may contest the Carolingian coast. This territorial campaign approximates the pressure of seaborne raids without awarding tribute or conquest on a fixed date.',
    firstYear:810, lastYear:813, durationDays:720,
    actor:{ realmId:'denmark' },
    target:{ provinceId:'groningen', ownerIds:['carolingian_800'] },
    conditions:[{ kind:'owner', provinceId:'roskilde', realmId:'denmark' },
      { kind:'owner', provinceId:'aachen', realmId:'carolingian_800' }],
    news:{
      started:{ key:'news.800.danish_started', text:'⚔ The Danish court challenges the Carolingian coast.' },
      won:{ key:'news.800.danish_won', text:'🏰 The Danish coastal campaign secures Groningen.' },
      failed:{ key:'news.800.danish_failed', text:'🏳 The Danish coastal campaign ends without securing Groningen.' },
      diverted:{ key:'news.800.danish_diverted', text:'📜 Changed coastal control closes the Danish opportunity.' },
      interrupted:{ key:'news.800.danish_interrupted', text:'📜 A change of Danish court interrupts its coastal campaign.' }
    } },
  abbasid_anatolia_800:{ id:'abbasid_anatolia_800', type:'campaign',
    name:'The Anatolian Frontier Campaign',
    desc:'The Abbasid court may challenge the eastern empire across the Anatolian frontier. Existing diplomacy, peace and the survival of both capitals govern the opportunity.',
    firstYear:806, lastYear:809, durationDays:1080,
    actor:{ realmId:'abbasid' },
    target:{ provinceId:'ikonion', ownerIds:['byzantium'] },
    conditions:[{ kind:'owner', provinceId:'baghdad', realmId:'abbasid' },
      { kind:'owner', provinceId:'constantinople', realmId:'byzantium' }],
    news:{
      started:{ key:'news.800.anatolia_started', text:'⚔ The Abbasid court opens an Anatolian frontier campaign.' },
      won:{ key:'news.800.anatolia_won', text:'🏰 The Abbasid campaign secures Iconium.' },
      failed:{ key:'news.800.anatolia_failed', text:'🏳 The Anatolian frontier campaign ends without securing Iconium.' },
      diverted:{ key:'news.800.anatolia_diverted', text:'📜 Changed imperial control closes the Anatolian opportunity.' },
      interrupted:{ key:'news.800.anatolia_interrupted', text:'📜 A change of caliphal court interrupts the Anatolian campaign.' }
    } },
  italian_lagoon_800:{ id:'italian_lagoon_800', type:'campaign',
    name:'The Adriatic Rivalry',
    desc:'The Italian court may challenge Venice while the eastern court retains its capital. The lagoon remains subject to ordinary armies and peace terms.',
    firstYear:810, lastYear:812, durationDays:720,
    actor:{ realmId:'carolingian_800' },
    target:{ provinceId:'venezia', ownerIds:['byzantium'] },
    conditions:[{ kind:'owner', provinceId:'pavia', realmId:'carolingian_800' },
      { kind:'owner', provinceId:'aachen', realmId:'carolingian_800' },
      { kind:'owner', provinceId:'constantinople', realmId:'byzantium' }],
    news:{
      started:{ key:'news.800.lagoon_started', text:'⚔ The Italian court challenges Venice in the Adriatic rivalry.' },
      won:{ key:'news.800.lagoon_won', text:'🏰 The Italian campaign secures Venice.' },
      failed:{ key:'news.800.lagoon_failed', text:'🏳 The Italian lagoon campaign ends without securing Venice.' },
      diverted:{ key:'news.800.lagoon_diverted', text:'📜 Changed Adriatic control closes the Italian opportunity.' },
      interrupted:{ key:'news.800.lagoon_interrupted', text:'📜 A change of Italian court interrupts the lagoon campaign.' }
    } }
};
Object.assign(FBDATA.storyCampaigns, FBDATA.storyCampaigns800);

/* Only relatives already born at the opening are seeded. Later births and
   deaths belong to the dynasty simulation, never a historical calendar. */
var courts800 = {
  carolingian_800:{ dynasty:'Carolingian', spouseId:null, members:[
    { id:'charles', name:'Charles', sex:'m', born:772, culture:'frankish',
      religion:'catholic', fatherId:'ruler', spouseId:null }
  ] },
  aquitaine:{ dynasty:'Carolingian', members:[
    { id:'lothair', name:'Lothair', sex:'m', born:795, culture:'frankish', religion:'catholic', fatherId:'ruler' },
    { id:'pippin', name:'Pippin', sex:'m', born:797, culture:'frankish', religion:'catholic', fatherId:'ruler' }
  ] },
  italy:{ dynasty:'Carolingian', members:[
    { id:'bernard', name:'Bernard', sex:'m', born:797, culture:'frankish', religion:'catholic', fatherId:'ruler' }
  ] }
};
FBDATA.bookmarks['800'].realms.forEach(function (realm) {
  if (courts800[realm.id]) realm.royalCourt = courts800[realm.id];
});
FBDATA.carolingianSettlements800 = {
  divisio:{ firstYear:806, lastYear:813 },
  ordinatio:{ firstYear:817, lastYear:823 },
  gifts:{ firstYear:801, lastYear:809, westernGift:15, easternGift:25 },
  recognition:{ firstYear:812, lastYear:814, coastalCounties:['venezia','split'] },
  verdun:{ firstYear:843, lastYear:846 },
  regions:{
    west:{ realmId:'carolingian_west_800', capital:'paris', titleId:'west_francia',
      duchies:['ile','normandy','anjou','blois','champagne','vermandois','flanders','aquitaine','poitou','toulouse','auvergne','gascogne','narbonne'] },
    east:{ realmId:'carolingian_east_800', capital:'regensburg', titleId:'east_francia',
      duchies:['bavaria','carantania','ostmark','saxony','thuringia','franconia','swabia','rhineland'] },
    aquitaine:{ realmId:'carolingian_aquitaine_800', capital:'bordeaux', titleId:'aquitaine',
      duchies:['aquitaine','poitou','toulouse','auvergne','gascogne','narbonne'] },
    bavaria:{ realmId:'carolingian_bavaria_800', capital:'regensburg', titleId:'east_francia',
      duchies:['bavaria','carantania','ostmark'] }
  }
};
