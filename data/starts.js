/* Fallowborn — authored new-campaign scenarios and family shapes.
   Definitions materialize ordinary save-format-3 state once, at campaign
   creation. The engine retains character wiring, validation, and sequencing.

   A scenario carries its own start rules as data:
     bookmarkIds, eras: where it is offered (both optional; eras match the
       bookmark's era)
     alwaysUnlocked: skips the starting-rank progression lock
     hidden: rejects picker, start-code and direct creation until accepted
     rulerRealmId, governmentForm, characterName: adopt a fixed existing court
     onboarding: selects the ruler checklist for an existing-ruler opening
     familyPresets: the allowed family shapes in picker order, each with
       optional authored name and diff labels; the first is the default
     tracks: player-track stories attached at creation (js/stories.js)
     trackLocations: optional { trackId:[countyIds] }; a listed track attaches
       only to a beginning in one of its counties, elsewhere the start is an
       ordinary household
     birthplaces: optional typed rule for where the start may begin
       (institutions, capitalsOf, realms, counties, storyCounties); see
       FB.startBirthplaces in js/starts.js
     intro, intro_f, intro_muslim, intro_other: the opening text */
window.FBDATA = window.FBDATA || {};

(function () {
  'use strict';

  FBDATA.startScenarios = [
    /* Candidates remain hidden until the owner accepts each opening. */
    { id:'peroz_476', bookmarkIds:['476'], hidden:true, alwaysUnlocked:true,
      rulerRealmId:'sasanian_476', governmentForm:'aristocratic_monarchy', fixedProvinceId:'baghdad',
      characterName:'Peroz', sex:'m', startCulture:'persian', startReligion:'zoroastrian',
      name:'Peroz and the magnate court', desc:'Govern through royal kin, inherited family interests and appointed provincial officers.',
      tier:7, profession:'noble', gold:120, prestige:180, piety:20,
      familyPresets:{ standard:{ name:'Existing royal household', diff:'age 46 · existing court family',
        desc:'Keep the declared royal kin and generated supporting households.' } }, tracks:[], onboarding:'ruler',
      intro:'You are Peroz at Ctesiphon. Public administration in Deeds shows your royal candidates, provincial family rights and appointed officers. Review actual receipts and military burdens with the magnates. Balash has royal ancestry, but recognition decides accession. Your subjects retain their own worship and private estates.' },
    { id:'nepos_476', bookmarkIds:['476'], hidden:true, alwaysUnlocked:true,
      rulerRealmId:'croatia', governmentForm:'roman_civic', fixedProvinceId:'split',
      characterName:'Julius Nepos', sex:'m', startCulture:'roman', startReligion:'nicene',
      name:'Julius Nepos at Salona',
      desc:'Hold Dalmatia while maintaining a contested western imperial claim. Seek recognition without confusing a mandate with possession of Italy.',
      tier:6, profession:'noble', gold:120, prestige:180, piety:20,
      familyPresets:{ standard:{ name:'Dalmatian court household', diff:'age 46 · existing court family', desc:'Keep the court’s seeded family. Unattested relatives are generated campaign characters.' } },
      tracks:['nepos_track_476'], onboarding:'ruler',
      intro:'You are Julius Nepos at Salona. Dalmatia is in your hands; Italy is not. Your western imperial claim survives alongside Romulus’s office at Ravenna. Review Offices & Legitimacy and the western claim story in Deeds, then decide whether to pursue recognition, restoration through an ordinary campaign, or Dalmatian rule.' },
    { id:'odoacer_476', bookmarkIds:['476'], hidden:true, alwaysUnlocked:true,
      rulerRealmId:'federates_476', governmentForm:'federate_polity', fixedProvinceId:'pavia',
      characterName:'Odoacer', sex:'m', startCulture:'gothic', startReligion:'homoian',
      name:'Odoacer and the federate host',
      desc:'Lead an existing host near Ticinum without county ownership. Review paid service or contest Ravenna; civic recognition and territorial rule remain separate.',
      tier:4, profession:'soldier', gold:0, prestige:120, piety:0,
      familyPresets:{ standard:{ name:'Federate court household', diff:'age 43 · existing court family', desc:'Keep the host court’s seeded family. Unattested relatives are generated campaign characters.' } },
      onboarding:'ruler',
      intro:'You are Odoacer with the federate host near Ticinum. You command its existing soldiers, but hold no county. Open the western court story in Deeds to review paid service or an ordinary campaign for Ravenna. Contracts require both courts’ consent; victory alone supplies neither civic acceptance nor an imperial office. The map’s army controls command your host.' },
    { id:'syagrius_476', bookmarkIds:['476'], hidden:true, alwaysUnlocked:true,
      rulerRealmId:'west_francia', governmentForm:'roman_civic', fixedProvinceId:'laon',
      characterName:'Syagrius', sex:'m', startCulture:'roman', startReligion:'nicene',
      name:'Syagrius at Soissons',
      desc:'Govern the northern Gallic Roman domain between Frankish and Gothic courts. Keep local support and decide how to meet a living Frankish challenge.',
      tier:6, profession:'noble', gold:120, prestige:150, piety:10,
      familyPresets:{ standard:{ name:'Gallic court household', diff:'age 46 · existing court family', desc:'Keep the court’s seeded family. Unattested relatives are generated campaign characters.' } },
      onboarding:'ruler',
      intro:'You are Syagrius at Soissons. Your Roman domain has its own treasury and resident communities. Review Governance and Offices & Legitimacy in Deeds, manage your actual territory and prepare for neighboring courts. If Clovis inherits and challenges your domain, the story offers a decision; no historical date hands over your land.' },
    { id:'federate_476', bookmarkIds:['476'],
      alwaysUnlocked:true,
      name:'Federate Soldier',
      desc:'A free soldier in a federate host. Earn wages, maintain your household and seek command while courts bargain over pay and land.',
      tier:1, sex:'m', profession:'soldier', gold:20, prestige:5, piety:0,
      startAge:24, startCulture:'gothic', startReligion:'homoian',
      startEffects:{ skills:{ mar:2 },
        items:[{ item:'ash_spear', quality:'plain', equip:'rightHand' }] },
      familyPresets:{
        standard:{ name:'Free household', diff:'age 24 · federate service' }
      },
      tracks:['federate_track_476'], trackLocations:{ federate_track_476:['ravenna'] },
      /* a federate host's camp, or where the role's own story places its host */
      birthplaces:{ capitalsOf:['federate_polity'], storyCounties:true },
      intro:'You are {name}, a free federate soldier of {province}. The host lives on promised pay, and the courts it serves each want a different settlement. Your household can work and trade while you decide whom to serve. At Ravenna, the western court story in Deeds follows the host’s pay dispute; personal standing and a command are separate rewards.' },
    { id:'colonus_476', bookmarkIds:['476'], systems:['colonate'], alwaysUnlocked:true,
      /* Estate tenure is positively scoped: regional imperial estates and the
         authored Gallic and African estate archetypes. */
      birthplaces:{ realms:['italy','croatia','byzantium'],
        counties:['laon','paris','reims','orleans','lyon','arles','toulouse','bordeaux',
          'tunis','kairouan','tripoli','sirte'] },
      name:'Colonus', desc:'A Roman tenant household bound to an estate. Meet crop and account dues, earn the possessor’s consent, buy release or risk flight.',
      tier:0, profession:'colonus', gold:5, prestige:0, piety:0,
      startAge:24, startCulture:'roman', startReligion:'nicene',
      familyPresets:{
        standard:{ name:'Young tenant household', diff:'age 24 · parents and siblings' },
        established:{ name:'Established tenant household', diff:'spouse and young children' }
      },
      intro:'You are {name}, a colonus of {province}. Your household cultivates an estate’s land; use of its fields and dwelling gives you no ownership. Crop and account dues continue whichever daily focus you choose. Open Review estate & freedom in Deeds to meet the possessor, inspect your obligations and review purchase, consented military service, consented ordination or risky flight. Release includes your spouse and descendants; parents and siblings need separate paid release. Flight grants no lawful charter.' },
    { id:'curialis_476', bookmarkIds:['476'], alwaysUnlocked:true,
      name:'Curialis', desc:'A Roman civic household in a council city. Serve the council, seek a local mandate, or keep your livelihood outside the courts’ disputes.',
      tier:2, profession:'curialis', gold:80, prestige:30, piety:10,
      startAge:30, startCulture:'roman', startReligion:'nicene',
      startEffects:{ skills:{ ste:2, lea:2 }, careerExperience:5 },
      familyPresets:{
        established:{ name:'Civic household', diff:'age 30 · spouse and young children' },
        standard:{ name:'Unmarried curialis', diff:'age 30 · parents and siblings' }
      },
      tracks:['curialis_track_476'], trackLocations:{ curialis_track_476:['ravenna'] },
      birthplaces:{ institutions:['council'] },
      intro:'You are {name}, a curialis of {province}. Civic accounts and family obligations fill your days while distant courts and hosts negotiate. A council mandate can bring standing, but it does not give you the city’s land or treasury. At Ravenna, your civic story in Deeds follows the western court’s mandate; elsewhere, keep working for your household. Rank & Realm distinguishes your standing from the powers of an appointment.' },
    { id:'farmer_476', bookmarkIds:['476'], alwaysUnlocked:true,
      name:'Free Farming Household',
      desc:'A free household with a small plot in the wider late antique world.',
      tier:1, profession:'farmer', gold:20, prestige:5, piety:0,
      startEffects:{ landPlots:1 },
      intro:'You are {name}, a free farmer of {province}. Your neighbors, fields and family have their own needs while distant courts bargain and fight.' },
    { id:'craftsman_476', bookmarkIds:['476'], alwaysUnlocked:true,
      name:'Artisan’s Apprentice',
      desc:'Learn a skilled trade among the households of a late antique settlement.',
      tier:1, profession:'craftsman', gold:15, prestige:5, piety:0,
      intro:'You are {name}, learning a craft in {province}. Work, household ties and the local market offer a place to begin your family’s story.' },
    { id:'cleric_476', bookmarkIds:['476'], alwaysUnlocked:true,
      name:'Religious Household',
      desc:'Begin in local religious service with letters and piety.',
      tier:1, profession:'monk', gold:2, prestige:0, piety:25,
      intro:'You are {name}, serving your faith in {province}. Prayer, study and neighbors’ needs give your household a place in the community.' },
    { id:'farmer_493', bookmarkIds:['493'], alwaysUnlocked:true,
      name:'Free Farming Household',
      desc:'A free household with a small plot among the late Roman communities.',
      tier:1, profession:'farmer', gold:20, prestige:5, piety:0,
      startEffects:{ landPlots:1 },
      intro:'You are {name}, a free farmer of {province}. Courts change and armies pass, while your household tends its plot and decides where to seek a living.' },
    { id:'craftsman_493', bookmarkIds:['493'], alwaysUnlocked:true,
      name:'Artisan’s Apprentice',
      desc:'Learn a skilled trade in a late Roman town.',
      tier:1, profession:'craftsman', gold:15, prestige:5, piety:0,
      intro:'You are {name}, learning a craft in {province}. Workshop orders and household obligations fill your days; a new ruler has not changed the work already on your bench.' },
    { id:'cleric_493', bookmarkIds:['493'], alwaysUnlocked:true,
      birthplaces:{ institutions:['see','patriarchate'] },
      name:'Church Household',
      desc:'Begin in local religious service with letters and piety.',
      tier:1, profession:'monk', gold:2, prestige:0, piety:25,
      startCulture:'roman', startReligion:'nicene',
      intro:'You are {name}, serving the church in {province}. Letters, prayer and neighbors’ needs give your household a place in the city. Local religious authority remains separate from the ruling court.' },
    { id:'curialis_493', bookmarkIds:['493'], alwaysUnlocked:true,
      birthplaces:{ institutions:['council'] },
      startCulture:'roman', startReligion:'nicene',
      name:'Curialis',
      desc:'Keep civic accounts for a council city in the new kingdoms.',
      tier:2, profession:'curialis', gold:80, prestige:30, piety:10,
      startAge:30, startEffects:{ skills:{ste:2,lea:2}, careerExperience:5 },
      familyPresets:{ established:{ name:'Civic household', diff:'age 30 · spouse and young children' },
        standard:{ name:'Unmarried curialis', diff:'age 30 · parents and siblings' } },
      intro:'You are {name}, a curialis of {province}. New kings hold the courts, yet the city still needs its records. Work for your household, deal with the council, and seek an ordinary appointment without inheriting an earlier court dispute.' },
    { id:'serf', eras:['early_medieval','high_medieval'], name:'Serf',
      desc:'Bound to the land, with no property or freedom.',
      tier:0, profession:'farmer', gold:5, prestige:0, piety:0,
      intro:'You are {name}, a serf of {province}. The lord owns your labor; the church owns your Sundays; the soil will own your bones — unless you claw your way to something more.' },
    { id:'farmer', eras:['early_medieval','high_medieval'], name:'Free Farmer',
      desc:'Free, with a small plot and modest savings.',
      tier:1, profession:'farmer', gold:20, prestige:5, piety:0,
      startEffects:{ landPlots:1 },
      intro:'You are {name}, a free farmer of {province}. Your land is small, your debts are few, and your ambitions need not be.' },
    { id:'apprentice', eras:['early_medieval','high_medieval'], name:'Craftsman’s Apprentice',
      desc:'Train in a skilled trade under a master.',
      tier:1, profession:'craftsman', gold:15, prestige:5, piety:0,
      intro:'You are {name}, apprenticed to a master of the craft in {province}. Your hands are learning what your purse will someday know.' },
    { id:'monk', eras:['early_medieval','high_medieval'], name:'Novice of the Faith',
      desc:'Begin in religious service with education and piety.',
      tier:1, profession:'monk', gold:2, prestige:0, piety:25,
      intro:'You are Brother {name} of {province}, newly sworn. Letters, prayer, and patience can raise a nobody higher than any sword — but a dynasty will need... arrangements.',
      intro_f:'You are Sister {name} of {province}, newly sworn. Letters, prayer, and patience can raise a nobody higher than any sword — but a dynasty will need... arrangements.',
      intro_muslim:'You are {name}, a student of the madrasa of {province}. Ink, memory, and the law can raise a nobody higher than any sword — and unlike the Christians’ monks, a scholar may yet marry and found a house.',
      intro_other:'You are {name}, a novice of the faith in {province}. Letters, devotion, and patience can raise a nobody higher than any sword — but a dynasty will need... arrangements.' },
    { id:'soldier', eras:['early_medieval','high_medieval'], name:'Man-at-Arms',
      desc:'Earn wages and status through military service.',
      tier:1, profession:'soldier', gold:10, prestige:10, piety:0, sex:'m',
      startEffects:{
        skills:{ mar:3 },
        items:[
          { item:'ash_spear', quality:'plain', equip:'rightHand' },
          { item:'padded_jack', quality:'plain', equip:'body' }
        ]
      },
      intro:'You are {name}, a spear in the service of the lord of {province}. Wages are thin, but battlefields are where nobodies become somebodies.' },
    { id:'knight', eras:['early_medieval','high_medieval'], name:'Hedge Knight',
      desc:'A trained warrior of noble birth with little money.',
      tier:2, profession:'noble', gold:40, prestige:60, piety:0,
      startEffects:{
        skills:{ mar:4 }, focus:'train_arms',
        items:[
          { item:'broad_sword', quality:'well', equip:'rightHand' },
          { item:'round_shield', quality:'plain', equip:'leftHand' }
        ]
      },
      intro:'You are {name}, gently born and poorly landed. The gentry’s door is open; the baron’s hall is the next to force.' },
    { id:'baron', eras:['early_medieval','high_medieval'], name:'Petty Baron',
      desc:'Rule a small barony under a powerful liege.',
      tier:3, profession:'noble', gold:80, prestige:150, piety:0,
      intro:'You are {name}, Baron in {province}, sworn to {realm}. Your tower is small and your ambitions are welcome to be otherwise.' },
    /* One household at each later date's headline place. Like the Pontic
       household, a date-specific beginning is always open. */
    { id:'toledo_household_711', bookmarkIds:['711'], alwaysUnlocked:true,
      fixedProvinceId:'toledo', startCulture:'hispano_roman', startReligion:'catholic',
      name:'Toledo Household',
      desc:'Begin as a free household in Toledo, the Gothic royal city, as rival kings face a crossing from North Africa.',
      tier:1, profession:'craftsman', gold:15, prestige:5, piety:0,
      intro:'You are {name}, a free craftsman of {province}. The royal city waits on news from the south, where rival Gothic kings and a force from North Africa contend. Your workshop and household carry on whichever court prevails.' },
    { id:'aachen_household_800', bookmarkIds:['800'], alwaysUnlocked:true,
      fixedProvinceId:'aachen', startCulture:'frankish', startReligion:'catholic',
      name:'Aachen Household',
      desc:'Begin as a free household at Aachen, seat of Charlemagne’s palace, as news of his imperial crown arrives from Rome.',
      tier:1, profession:'farmer', gold:20, prestige:5, piety:0,
      startEffects:{ landPlots:1 },
      intro:'You are {name}, a free farmer of {province}. The palace draws officials, clergy and petitioners, and news of the imperial crown has crossed the Alps. Your fields and family come first, though the court’s business may still reach your door.' },
    { id:'constantinople_household_1204', bookmarkIds:['1204'], alwaysUnlocked:true,
      fixedProvinceId:'constantinople', startCulture:'greek', startReligion:'orthodox',
      name:'Constantinople Household',
      desc:'Begin as an artisan household in Constantinople under its new Latin rulers. Choose among the city’s resident communities.',
      tier:1, profession:'craftsman', gold:15, prestige:5, piety:0,
      intro:'You are {name}, a craftsman of {province}. Baldwin holds the city, the crusaders’ partition is unfinished, and Greek courts gather beyond the walls. Your workshop must find a living under whichever authority prevails.' }
  ];

  /* 476 BRANCH REVIEW SWITCH. While true, every beginning is open to every
     player: hidden candidates (the 476 courts) are offered and the
     earned-station ladder is unlocked. Owner testing only; set this to false
     or delete it before the branch ships. Specifications of the released
     rules preset it to false before the data scripts run. */
  if (FBDATA.reviewOpenStarts === undefined) FBDATA.reviewOpenStarts = true;

  /* Curated one-click Serf lives. Each one names an exact physical settlement
     site, which the start screen resolves to that bookmark's stable slot and
     proper name. Names are generated-person proper names; every other label
     resolves from the selected bookmark's live data. The first four belong
     to 867 and the next three to 1066 so their visual order also makes the
     date split legible without another control. */
  FBDATA.quickStarts = [
    { id:'osric_867', distributionDefault:true, firstDeedTip:'💡 You are Osric, a {term:serf} in Barcelona. Try Go into town as your first deed: pick a settlement and what to do there, then press Play to see what happens next.', scenarioId:'serf', familyPreset:'standard', bookmarkId:'867', provinceId:'barcelona',
      settlementSite:'barcelona',
      culture:'iberian', religion:'catholic', sex:'m', characterName:'Osric',
      portraitProfile:'osric' },
    { id:'aed_867', scenarioId:'serf', familyPreset:'standard', bookmarkId:'867', provinceId:'galway',
      settlementSite:'rathcroghan',
      culture:'gaelic', religion:'catholic', sex:'m', characterName:'Aed' },
    { id:'freydis_867', scenarioId:'serf', familyPreset:'standard', bookmarkId:'867', provinceId:'uppsala',
      settlementSite:'uppsala',
      culture:'norse', religion:'norse_pagan', sex:'f', characterName:'Freydis' },
    { id:'kahina_867', scenarioId:'serf', familyPreset:'standard', bookmarkId:'867', provinceId:'tunis',
      settlementSite:'tunis',
      culture:'berber', religion:'sunni', sex:'f', characterName:'Kahina' },
    { id:'gormlaith_1066', scenarioId:'serf', familyPreset:'standard', bookmarkId:'1066', provinceId:'ulaid',
      settlementSite:'downpatrick',
      culture:'gaelic', religion:'catholic', sex:'f', characterName:'Gormlaith' },
    { id:'biera_1066', scenarioId:'serf', familyPreset:'standard', bookmarkId:'1066', provinceId:'norrland',
      settlementSite:'norrland_head',
      culture:'sami', religion:'norse_pagan', sex:'m', characterName:'Biera' },
    { id:'ahmad_1066', scenarioId:'serf', familyPreset:'standard', bookmarkId:'1066', provinceId:'fustat',
      settlementSite:'fustat',
      culture:'arabic', religion:'shia', sex:'m', characterName:'Ahmad' }
  ];

  /* Authored visual identities change no campaign stats or random draws. */
  FBDATA.portraitProfiles = {
    osric:{
      identity:'osric', hairColor:'black', eyeColor:'brown', pigment:1.05,
      faceWidth:.96, jaw:.94, chin:1.03, cheek:.48,
      eyeSize:.97, eyeSpacing:.98, browWeight:.9,
      noseW:.98, noseLen:1.08, mouthW:.96, lipFull:.9,
      yaw:0, bgHue:164, bareheadedSerf:true,
      appearance:{ hairStyle:'longLoose', beardKind:'full', beardCut:'natural' }
    }
  };

  /* `standard` is the historical no-extra-draw family. Its zero age means
     FBDATA.balance.startAge; every other preset authors an exact adult age. */
  FBDATA.familyPresets = [
    { id:'standard', name:'Youth',
      diff:'age 16 · the whole road ahead',
      desc:'Unmarried. Your parents and siblings are beside you.',
      age:0 },
    { id:'established', name:'Established',
      diff:'age 30 · a head start, fewer years left',
      desc:'Married, with young children in the cradle.',
      age:30, spouseAge:[-4, 4], children:[1, 2], eldestMin:1 },
    { id:'elder', name:'Elder',
      diff:'age 48 · an adult heir, little time left',
      desc:'Married, with grown children ready to inherit.',
      age:48, spouseAge:[-4, 4], children:[2, 3], eldestMin:16 }
  ];
})();
