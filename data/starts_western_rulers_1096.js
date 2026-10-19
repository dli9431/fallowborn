/* Landed western rulers adopt their single existing court and authored kin. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_western_rulers_1096 = [
  { id:'godfrey_1096', bookmarkIds:['1096'], alwaysUnlocked:true,
    rulerRealmId:'lower_lotharingia_1096', governmentForm:'territorial', fixedProvinceId:'verdun',
    characterName:'Godfrey of Bouillon', sex:'m', startCulture:'frankish', startReligion:'catholic',
    name:'Godfrey of Bouillon', desc:'Govern from Bouillon, represented within Verdun. Review home obligations and decide whether to remain or consider a personal journey east.',
    tier:5, profession:'noble', gold:100, prestige:100, piety:0,
    familyPresets:{ standard:{ name:'Godfrey and his named kin', diff:'age 36 · unmarried',
      desc:'Ida, Eustace III and Baldwin retain their own identities. Supporting ages and home presentations are approximate; no spouse or children are invented.' } },
    tracks:['godfrey_agenda_1096','opening_godfrey_1096'],
    trackLocations:{ godfrey_agenda_1096:['verdun'], opening_godfrey_1096:['verdun'] },
    onboarding:'ruler',
    intro:'You are Godfrey of Bouillon. Your ducal office and Bouillon property are represented by the Verdun holding; the title does not give you Liège or its church property. Review your home government in Deeds. You may remain at home or use ordinary personal travel. Planning a journey creates no expedition command, vow or sale of Bouillon.' },
  { id:'raymond_1096', bookmarkIds:['1096'], alwaysUnlocked:true,
    rulerRealmId:'toulouse_1096', governmentForm:'territorial', fixedProvinceId:'toulouse',
    characterName:'Raymond IV', sex:'m', startCulture:'occitan', startReligion:'catholic',
    name:'Raymond of Toulouse', desc:'Lead the existing Toulouse court with Elvira and Bertrand. Balance present government, household obligations and the possibility of a personal journey.',
    tier:4, profession:'noble', gold:100, prestige:100, piety:0,
    familyPresets:{ standard:{ name:'Raymond’s named household', diff:'about age 54 · existing household',
      desc:'Elvira and Bertrand have approximate ages. Bertrand is Raymond’s son from an earlier marriage; no later-born infant or generated historical relatives are added.' } },
    tracks:['raymond_agenda_1096','opening_raymond_1096'],
    trackLocations:{ raymond_agenda_1096:['toulouse'], opening_raymond_1096:['toulouse'] },
    onboarding:'ruler',
    intro:'You are Raymond of Toulouse. Toulouse is your chosen home anchor, with the current holdings represented at county scale. Elvira and Bertrand are distinct people, and Bertrand has no automatic deputy mandate. Review government and household priorities in Deeds. Ordinary travel, diplomacy and war keep their actual costs and restrictions; this opening grants no future Syrian territory.' },
  { id:'bohemond_1096', bookmarkIds:['1096'], alwaysUnlocked:true,
    rulerRealmId:'bohemond_lordships_1096', governmentForm:'territorial', fixedProvinceId:'taranto',
    characterName:'Bohemond', sex:'m', startCulture:'norman', startReligion:'catholic',
    name:'Bohemond', desc:'Govern the Apulian lordships from the chosen Taranto anchor. Review present obligations, news of the undertaking and the choice to stay or consider a personal journey.',
    tier:4, profession:'noble', gold:100, prestige:100, piety:0,
    familyPresets:{ standard:{ name:'Bohemond at home', diff:'about age 42 · unmarried',
      desc:'The opening supplies no spouse or children. Uncertain kinship and later companions are omitted; the working birth year and Taranto residence are simulation choices.' } },
    tracks:['bohemond_agenda_1096','opening_bohemond_1096'],
    trackLocations:{ bohemond_agenda_1096:['taranto'], opening_bohemond_1096:['taranto'] },
    onboarding:'ruler',
    intro:'You are Bohemond, holding the existing Apulian lordships represented at county scale. Taranto is your chosen home anchor. Review current government in Deeds, remain at home or consider ordinary personal travel. Your local office grants neither the whole duchy of Apulia nor a formal Taranto principality. Any journey keeps its actual costs and restrictions.' }
];
Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_western_rulers_1096);
FBDATA.bookmarks['1096'].startLocations.godfrey_1096 = ['verdun'];
FBDATA.bookmarks['1096'].startLocations.raymond_1096 = ['toulouse'];
FBDATA.bookmarks['1096'].startLocations.bohemond_1096 = ['taranto'];
