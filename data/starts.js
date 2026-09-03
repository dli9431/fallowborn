/* Fallowborn — authored new-campaign scenarios and family shapes.
   Definitions materialize ordinary save-format-3 state once, at campaign
   creation. The engine retains character wiring, validation, and sequencing. */
window.FBDATA = window.FBDATA || {};

(function () {
  'use strict';

  FBDATA.startScenarios = [
    { id:'serf', name:'Serf',
      desc:'Bound to the land, with no property or freedom.',
      tier:0, profession:'farmer', gold:5, prestige:0, piety:0,
      intro:'You are {name}, a serf of {province}. The lord owns your labor; the church owns your Sundays; the soil will own your bones — unless you claw your way to something more.' },
    { id:'farmer', name:'Free Farmer',
      desc:'Free, with a small plot and modest savings.',
      tier:1, profession:'farmer', gold:20, prestige:5, piety:0,
      startEffects:{ landPlots:1 },
      intro:'You are {name}, a free farmer of {province}. Your land is small, your debts are few, and your ambitions need not be.' },
    { id:'apprentice', name:'Craftsman’s Apprentice',
      desc:'Train in a skilled trade under a master.',
      tier:1, profession:'craftsman', gold:15, prestige:5, piety:0,
      intro:'You are {name}, apprenticed to a master of the craft in {province}. Your hands are learning what your purse will someday know.' },
    { id:'monk', name:'Novice of the Faith',
      desc:'Begin in religious service with education and piety.',
      tier:1, profession:'monk', gold:2, prestige:0, piety:25,
      intro:'You are Brother {name} of {province}, newly sworn. Letters, prayer, and patience can raise a nobody higher than any sword — but a dynasty will need... arrangements.',
      intro_f:'You are Sister {name} of {province}, newly sworn. Letters, prayer, and patience can raise a nobody higher than any sword — but a dynasty will need... arrangements.',
      intro_muslim:'You are {name}, a student of the madrasa of {province}. Ink, memory, and the law can raise a nobody higher than any sword — and unlike the Christians’ monks, a scholar may yet marry and found a house.',
      intro_other:'You are {name}, a novice of the faith in {province}. Letters, devotion, and patience can raise a nobody higher than any sword — but a dynasty will need... arrangements.' },
    { id:'soldier', name:'Man-at-Arms',
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
    { id:'knight', name:'Hedge Knight',
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
    { id:'baron', name:'Petty Baron',
      desc:'Rule a small barony under a powerful liege.',
      tier:3, profession:'noble', gold:80, prestige:150, piety:0,
      intro:'You are {name}, Baron in {province}, sworn to {realm}. Your tower is small and your ambitions are welcome to be otherwise.' }
  ];

  /* Curated one-click Serf lives. Each one names an exact physical settlement
     site, which the start screen resolves to that bookmark's stable slot and
     proper name. Names are generated-person proper names; every other label
     resolves from the selected bookmark's live data. The first three belong
     to 867 and the next three to 1066 so their visual order also makes the
     date split legible without another control. */
  FBDATA.quickStarts = [
    { id:'aed_867', bookmarkId:'867', provinceId:'galway',
      settlementSite:'rathcroghan',
      culture:'gaelic', religion:'catholic', sex:'m', characterName:'Aed' },
    { id:'freydis_867', bookmarkId:'867', provinceId:'uppsala',
      settlementSite:'uppsala',
      culture:'norse', religion:'norse_pagan', sex:'f', characterName:'Freydis' },
    { id:'kahina_867', bookmarkId:'867', provinceId:'tunis',
      settlementSite:'tunis',
      culture:'berber', religion:'sunni', sex:'f', characterName:'Kahina' },
    { id:'gormlaith_1066', bookmarkId:'1066', provinceId:'ulaid',
      settlementSite:'downpatrick',
      culture:'gaelic', religion:'catholic', sex:'f', characterName:'Gormlaith' },
    { id:'biera_1066', bookmarkId:'1066', provinceId:'norrland',
      settlementSite:'norrland_head',
      culture:'sami', religion:'norse_pagan', sex:'m', characterName:'Biera' },
    { id:'ahmad_1066', bookmarkId:'1066', provinceId:'fustat',
      settlementSite:'fustat',
      culture:'arabic', religion:'shia', sex:'m', characterName:'Ahmad' }
  ];

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
