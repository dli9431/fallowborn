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
