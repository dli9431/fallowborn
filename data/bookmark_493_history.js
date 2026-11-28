FB.bookmarkSources.stage({"source":"data/bookmark_493_history.js","bookmarks":["493"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Independent late antique opportunities. Dates open ordinary campaigns;
   they never force a ruler death, conversion, succession or territorial award. */
window.FBDATA = window.FBDATA || {};
FBDATA.storyCampaigns493 = {
  alamannic_campaign_493:{ id:'alamannic_campaign_493', type:'campaign',
    name:'The march on Argentoratum',
    desc:'From 496 the Franks can march on Argentoratum, seat of the Alamanni on the upper Rhine.',
    firstYear:496, lastYear:506, durationDays:1440,
    actor:{ realmId:'franks_493' },
    target:{ provinceId:'strasbourg', ownerIds:['alamanni_493'] },
    conditions:[{ kind:'owner', provinceId:'laon', realmId:'franks_493' }],
    news:{
      started:{ key:'news.493.alamanni.started', text:'⚔ The Frankish court opens a campaign on the upper Rhine.' },
      won:{ key:'news.493.alamanni.won', text:'⚔ Frankish armies secure the Alamannic seat. Its communities retain their own beliefs.' },
      failed:{ key:'news.493.alamanni.failed', text:'🏳 The upper Rhine campaign ends without its objective.' },
      diverted:{ key:'news.493.alamanni.diverted', text:'📜 Changed possession closes the upper Rhine opportunity.' },
      interrupted:{ key:'news.493.alamanni.interrupted', text:'📜 A change of ruling court interrupts the upper Rhine campaign.' }
    } },
  burgundian_campaign_493:{ id:'burgundian_campaign_493', type:'campaign',
    name:'The war for Lugdunum',
    desc:'Gundobad and Godegisel head rival Burgundian courts. From 500, while Godegisel holds Genava, the Franks can attack Gundobad at Lugdunum.',
    firstYear:500, lastYear:503, durationDays:1080,
    actor:{ realmId:'franks_493' },
    target:{ provinceId:'lyon', ownerIds:['burgundy_493'] },
    conditions:[{ kind:'owner', provinceId:'laon', realmId:'franks_493' },
      { kind:'owner', provinceId:'geneva', realmId:'godegisel_493' }],
    news:{
      started:{ key:'news.493.burgundy.started', text:'⚔ The Frankish court contests the senior Burgundian seat.' },
      won:{ key:'news.493.burgundy.won', text:'🏛 The campaign secures the Burgundian seat through ordinary war.' },
      failed:{ key:'news.493.burgundy.failed', text:'🏳 The Burgundian campaign ends without securing its objective.' },
      diverted:{ key:'news.493.burgundy.diverted', text:'📜 Changed Burgundian or Frankish possession closes the rivalry opportunity.' },
      interrupted:{ key:'news.493.burgundy.interrupted', text:'📜 A change of ruling court interrupts the Burgundian campaign.' }
    } },
  visigothic_campaign_493:{ id:'visigothic_campaign_493', type:'campaign',
    name:'The march on Tolosa',
    desc:'From 507 the Franks can march on Alaric’s capital at Tolosa.',
    firstYear:507, lastYear:511, durationDays:1800,
    actor:{ realmId:'franks_493' },
    target:{ provinceId:'toulouse', ownerIds:['visigoths_493'] },
    conditions:[{ kind:'owner', provinceId:'laon', realmId:'franks_493' }],
    news:{
      started:{ key:'news.493.toulouse.started', text:'⚔ The Frankish court opens a campaign toward Toulouse.' },
      won:{ key:'news.493.toulouse.won', text:'🏛 Frankish armies secure Toulouse. Surviving Gothic possessions are unchanged by the story.' },
      failed:{ key:'news.493.toulouse.failed', text:'🏳 The Toulouse campaign ends without securing the Gothic capital.' },
      diverted:{ key:'news.493.toulouse.diverted', text:'📜 Different courts or capital possession close the Toulouse opportunity.' },
      interrupted:{ key:'news.493.toulouse.interrupted', text:'📜 A change of ruling court interrupts the Toulouse campaign.' }
    } },
  sirmium_campaign_493:{ id:'sirmium_campaign_493', type:'campaign',
    name:'The war for Sirmium',
    desc:'From 505 the Goths of Italy can attack the Gepids at Sirmium, as long as the Goths still hold Ravenna.',
    firstYear:505, lastYear:510, durationDays:1440,
    actor:{ realmId:'ostrogoths_493' },
    target:{ provinceId:'sirmium', ownerIds:['gepids_493'] },
    conditions:[{ kind:'owner', provinceId:'ravenna', realmId:'ostrogoths_493' }],
    news:{
      started:{ key:'news.493.sirmium.started', text:'⚔ The Italian Gothic court contests Sirmium.' },
      won:{ key:'news.493.sirmium.won', text:'🏛 Gothic armies secure Sirmium through ordinary war.' },
      failed:{ key:'news.493.sirmium.failed', text:'🏳 The Sirmium campaign ends without securing its objective.' },
      diverted:{ key:'news.493.sirmium.diverted', text:'📜 Changed frontier possession closes the Sirmium opportunity.' },
      interrupted:{ key:'news.493.sirmium.interrupted', text:'📜 A change of ruling court interrupts the Sirmium campaign.' }
    } },
  african_campaign_493:{ id:'african_campaign_493', type:'campaign',
    name:'The expedition against Carthage',
    desc:'From 533 the eastern court can send an army against the Vandals at Carthage.',
    firstYear:533, lastYear:535, durationDays:1800,
    actor:{ realmId:'east_493' },
    target:{ provinceId:'tunis', ownerIds:['vandals_493'] },
    conditions:[{ kind:'owner', provinceId:'constantinople', realmId:'east_493' }],
    news:{
      started:{ key:'news.493.africa.started', text:'⚔ The eastern Roman court opens an expedition against Carthage.' },
      won:{ key:'news.493.africa.won', text:'🏛 Eastern Roman armies secure Carthage through ordinary war.' },
      failed:{ key:'news.493.africa.failed', text:'🏳 The African expedition ends without securing Carthage.' },
      diverted:{ key:'news.493.africa.diverted', text:'📜 Changed eastern or African possession closes the expedition opportunity.' },
      interrupted:{ key:'news.493.africa.interrupted', text:'📜 A change of ruling court interrupts the African expedition.' }
    } },
  italian_campaign_493:{ id:'italian_campaign_493', type:'campaign',
    name:'The eastern war for Ravenna',
    desc:'From 535, once it holds Carthage, the eastern court can attack the Goths at Ravenna.',
    firstYear:535, lastYear:540, durationDays:2520,
    actor:{ realmId:'east_493' },
    target:{ provinceId:'ravenna', ownerIds:['ostrogoths_493'] },
    conditions:[{ kind:'owner', provinceId:'constantinople', realmId:'east_493' },
      { kind:'owner', provinceId:'tunis', realmId:'east_493' }],
    news:{
      started:{ key:'news.493.italy.started', text:'⚔ An eastern Roman foothold supports a campaign toward Ravenna.' },
      won:{ key:'news.493.italy.won', text:'🏛 Eastern Roman armies secure Ravenna. Their remaining Italian objectives require ordinary conquest.' },
      failed:{ key:'news.493.italy.failed', text:'🏳 The Italian campaign ends without securing Ravenna.' },
      diverted:{ key:'news.493.italy.diverted', text:'📜 Changed African or Italian possession closes the Ravenna opportunity.' },
      interrupted:{ key:'news.493.italy.interrupted', text:'📜 A change of ruling court interrupts the Italian campaign.' }
    } }
};
Object.assign(FBDATA.storyCampaigns, FBDATA.storyCampaigns493);
});
