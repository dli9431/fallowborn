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
/* Region selectors belong to the bookmark, independently of story mechanics. */
FBDATA.bookmarkCandidates['800'].storyRegions = {
  west:{ duchies:['ile','normandy','anjou','blois','champagne','vermandois','flanders','aquitaine','poitou','toulouse','auvergne','gascogne','narbonne'] },
  east:{ duchies:['bavaria','carantania','ostmark','saxony','thuringia','franconia','swabia','rhineland'] },
  aquitaine:{ duchies:['aquitaine','poitou','toulouse','auvergne','gascogne','narbonne'] },
  bavaria:{ duchies:['bavaria','carantania','ostmark'] }
};
FBDATA.storySettlements800 = {
  divisio_800:{ id:'divisio_800', type:'succession_partition', name:'806 inheritance settlement',
    desc:'Living sons and existing regional crowns determine the inheritance plan. Borders remain unchanged until succession replaces the present ruler.',
    firstYear:806, lastYear:813, chance:0.65, truceDays:0,
    actor:{ realmId:'carolingian_800', capital:'aachen', castField:'charlemagne' },
    branchRealmIds:['italy','aquitaine'],
    cast:{ charlemagne:{ kind:'realm_ruler', realmId:'carolingian_800' },
      louis:{ kind:'realm_ruler', realmId:'aquitaine' }, pippin:{ kind:'realm_ruler', realmId:'italy' },
      harun:{ kind:'realm_ruler', realmId:'abbasid' } },
    shares:[{ realmId:'aquitaine', castField:'louis' },{ realmId:'italy', castField:'pippin' }],
    news:{ agreed:{ key:'news.800.divisio', text:'📜 The Carolingian court settles its inheritance shares. Regional crowns remain subordinate until the present ruler’s succession.' },
      executed:{ key:'news.800.partition_accession', text:'📜 The surviving regional shares of the Carolingian inheritance become independent after succession.' } } },
  ordinatio_800:{ id:'ordinatio_800', type:'designated_succession', requires:['divisio_800'], name:'817 imperial arrangement',
    desc:'The senior living son receives the succession designation. Younger living sons receive regional government while the imperial realm stays united.',
    firstYear:817, lastYear:823, chance:0.65, truceDays:0,
    actor:{ realmId:'carolingian_800', capital:'aachen', character:{ kind:'story', storyId:'divisio_800', field:'cast.louis' } },
    regions:[{ id:'aquitaine', selector:{ kind:'region', regionId:'aquitaine' },
      grant:{ id:'carolingian_aquitaine_800', capital:'bordeaux', titleId:'aquitaine', rank:3, titleKind:'kingdom' } },
      { id:'bavaria', selector:{ kind:'region', regionId:'bavaria' },
        grant:{ id:'carolingian_bavaria_800', capital:'regensburg', titleId:'east_francia', rank:3, titleKind:'kingdom' } }],
    news:{ agreed:{ key:'news.800.ordinatio', text:'📜 The Carolingian court designates a senior successor and grants regional government to younger sons. The imperial realm remains united.' } } },
  gifts_800:{ id:'gifts_800', type:'diplomatic_exchange', requires:['ordinatio_800','divisio_800'], name:'Frankish-Abbasid gifts',
    desc:'Both original courts must be sovereign and peaceful, hold their capitals and fund their own gifts. The exchange establishes a limited peace.',
    firstYear:801, lastYear:809, chance:0.65, truceDays:720, actorGift:15, sourceGift:25, opinion:0,
    actor:{ realmId:'carolingian_800', capital:'aachen', character:{ kind:'story', storyId:'divisio_800', field:'cast.charlemagne' } },
    source:{ realmId:'abbasid', capital:'baghdad', character:{ kind:'story', storyId:'divisio_800', field:'cast.harun' } },
    news:{ agreed:{ key:'news.800.gifts', text:'🎁 The Frankish and Abbasid courts exchange funded gifts and agree to a limited peace.' } } },
  recognition_800:{ id:'recognition_800', type:'recognition', requires:['gifts_800','divisio_800'], name:'Eastern imperial recognition',
    desc:'The eastern imperial court recognizes the living western emperor. Participating western-held Adriatic counties return to eastern government and the courts agree to peace.',
    firstYear:812, lastYear:814, chance:0.65, truceDays:720, authoritySource:'imperial_commission', requireImperial:true,
    actor:{ realmId:'carolingian_800', capital:'aachen', character:{ kind:'story', storyId:'divisio_800', field:'cast.charlemagne' } },
    source:{ realmId:'byzantium', capital:'constantinople' }, region:{ kind:'provinces', provinceIds:['venezia','split'] },
    news:{ agreed:{ key:'news.800.recognition', text:'📜 The eastern court recognizes the western imperial title in an Adriatic peace agreement.' } } },
  verdun_800:{ id:'verdun_800', type:'treaty_settlement', requires:['recognition_800','ordinatio_800'], name:'843 partition negotiations',
    desc:'The surviving senior successor and two original regional beneficiaries may divide the realm. Only their mutual ordinary wars can end through this agreement; foreign wars block it.',
    firstYear:843, lastYear:846, chance:0.65, truceDays:720,
    actor:{ realmId:'carolingian_800', capital:'aachen' }, planRef:{ kind:'story', storyId:'ordinatio_800', field:'plan' },
    regions:[{ id:'west', selector:{ kind:'region', regionId:'west' }, titleId:'west_francia' },
      { id:'east', selector:{ kind:'region', regionId:'east' }, titleId:'east_francia' }],
    pressure:{ threshold:4, chance:0.35 },
    news:{ agreed:{ key:'news.800.verdun', text:'📜 The surviving Carolingian brothers agree to a western, middle and eastern division. Their existing subjects retain their local government.' },
      pressure:{ key:'news.800.sibling_pressure', text:'⚔ A regional Carolingian court contests the senior ruler’s authority. Ordinary armies and peace decide the dispute.' } } }
};
/* An exact typed split on the detached save copy, never new-game init. */
FBDATA.storyRecordMigrations = [{ sourceId:'carolingian_settlements_800',
  opportunityFields:['divisio','ordinatio','gifts','recognition','verdun'],
  targets:[{ id:'divisio_800', recordField:'opportunities.divisio', fields:{ cast:'cast' } },
    { id:'ordinatio_800', recordField:'opportunities.ordinatio', fields:{} },
    { id:'gifts_800', recordField:'opportunities.gifts', fields:{} },
    { id:'recognition_800', recordField:'opportunities.recognition', fields:{} },
    { id:'verdun_800', recordField:'opportunities.verdun', fields:{ pressure:'pressure' } }] }];
