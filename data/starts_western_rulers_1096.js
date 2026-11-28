FB.bookmarkSources.stage({"source":"data/starts_western_rulers_1096.js","bookmarks":["1096"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Landed western rulers adopt their single existing court and authored kin. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_western_rulers_1096 = [
  { id:'godfrey_1096', bookmarkIds:['1096'], alwaysUnlocked:true,
    rulerRealmId:'lower_lotharingia_1096', governmentForm:'territorial', fixedProvinceId:'verdun',
    characterName:'Godfrey of Bouillon', sex:'m', startCulture:'frankish', startReligion:'catholic',
    name:'Godfrey of Bouillon', desc:'You govern Lower Lotharingia from your castle at Bouillon, in Verdun on the map. The call to march east has reached your court.',
    tier:5, profession:'noble', gold:100, prestige:100, piety:0,
    familyPresets:{ standard:{ name:'Godfrey and his named kin', diff:'age 36 · unmarried',
      desc:'Your mother Ida and your brothers Eustace III and Baldwin. You are unmarried and have no children.' } },
    tracks:['godfrey_agenda_1096','opening_godfrey_1096'],
    trackLocations:{ godfrey_agenda_1096:['verdun'], opening_godfrey_1096:['verdun'] },
    onboarding:'ruler',
    intro:'You are Godfrey of Bouillon, holding Lower Lotharingia for Henry IV from your castle at Bouillon, which the map shows within Verdun. Preachers are calling the lords of the West to march east, and your brothers Eustace and Baldwin are listening. You can stay and govern, or raise a following and take the road. Open your court agenda in Deeds to begin.' },
  { id:'raymond_1096', bookmarkIds:['1096'], alwaysUnlocked:true,
    rulerRealmId:'toulouse_1096', governmentForm:'territorial', fixedProvinceId:'toulouse',
    characterName:'Raymond IV', sex:'m', startCulture:'occitan', startReligion:'catholic',
    name:'Raymond of Toulouse', desc:'You rule Toulouse with your wife Elvira and your son Bertrand at court. Pope Urban wants the great lords of the West to march east, and Toulouse still needs governing.',
    tier:4, profession:'noble', gold:100, prestige:100, piety:0,
    familyPresets:{ standard:{ name:'Raymond’s named household', diff:'about age 54 · existing household',
      desc:'Your wife Elvira of Castile and Bertrand, your son from an earlier marriage.' } },
    tracks:['raymond_agenda_1096','opening_raymond_1096'],
    trackLocations:{ raymond_agenda_1096:['toulouse'], opening_raymond_1096:['toulouse'] },
    onboarding:'ruler',
    intro:'You are Raymond IV, ruling Toulouse in 1096 with your wife Elvira and your son Bertrand. Pope Urban has called the lords of the West to march east, and he looks to you to lead the south. You can stay and govern, or raise a following and take the road; Bertrand rules in your place only if you appoint him. Open your court agenda in Deeds to begin.' },
  { id:'bohemond_1096', bookmarkIds:['1096'], alwaysUnlocked:true,
    rulerRealmId:'bohemond_lordships_1096', governmentForm:'territorial', fixedProvinceId:'taranto',
    characterName:'Bohemond', sex:'m', startCulture:'norman', startReligion:'catholic',
    name:'Bohemond', desc:'You are Bohemond, son of Robert Guiscard, holding Taranto and your Apulian lordships. News of the march east is spreading through southern Italy.',
    tier:4, profession:'noble', gold:100, prestige:100, piety:0,
    familyPresets:{ standard:{ name:'Bohemond at home', diff:'about age 42 · unmarried',
      desc:'You are unmarried and have no children. Tancred and your other kin are not in this start.' } },
    tracks:['bohemond_agenda_1096','opening_bohemond_1096'],
    trackLocations:{ bohemond_agenda_1096:['taranto'], opening_bohemond_1096:['taranto'] },
    onboarding:'ruler',
    intro:'You are Bohemond, eldest son of Robert Guiscard, holding Taranto and your lordships in Apulia but not your father’s title. News of the march east is reaching the Norman lords of the south. You can stay and govern, or raise a following and take the coast road to Bari. Open your court agenda in Deeds to begin.' }
];
Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_western_rulers_1096);
FBDATA.bookmarks['1096'].startLocations.godfrey_1096 = ['verdun'];
FBDATA.bookmarks['1096'].startLocations.raymond_1096 = ['toulouse'];
FBDATA.bookmarks['1096'].startLocations.bohemond_1096 = ['taranto'];
});
