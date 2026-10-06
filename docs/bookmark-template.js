/* Authoring template only. This file is not loaded by index.html.
   Copy the declarations into a new data file or equivalent JSON mod tables.
   It uses supported period data and existing physical sites. Replace the
   fictional labels and opening with researched content before acceptance.
   Run FB.validateBookmark after all related tables have been registered. */
(function () {
  'use strict';
  FBDATA.bookmarks.template_900 = {
    id:'template_900', name:'Example opening', desc:'An authoring example.',
    date:{ year:900, season:0, day:1 },
    // Hidden limits new campaigns; matching saved campaigns remain loadable.
    hidden:true, era:'early_medieval', geography:'europe_regional',
    // null opts out of inherited layouts and uses generated settlements.
    settlementLayout:null,
    // Explicitly empty avoids inheriting a different opening's local bishops.
    localInstitutions:{}, religiousHeads:{},
    systems:{ disable:['papacy','great_holy_wars'] },
    // Omit starts to use every compatible scenario. Tracks live on scenarios.
    starts:['template_farmer'], stories:[],
    // County coordinates/terrain can come from the named geography seeds.
    provinces:[
      { id:'paris', name:'Paris', realm:'example_court', duchy:'example_district',
        culture:'frankish', religion:'jewish', dev:4,
        communities:[{ culture:'frankish', religion:'jewish', populationShare0:10000 }] },
      { id:'reims', name:'Reims', realm:'example_court', duchy:'example_district',
        culture:'frankish', religion:'jewish', dev:3,
        communities:[{ culture:'frankish', religion:'jewish', populationShare0:10000 }] }
    ],
    realms:[{ id:'example_court', name:'Example court', color:'#687c91',
      capital:'paris', rank:2, aggression:0, government:'territorial', religion:'jewish',
      ruler:{ name:'Example ruler', sex:'m', culture:'frankish', born:870, mar:5, trait:'patient' } }],
    // Canonical ids have rank-scoped namespaces. Null parent stops the ladder.
    duchies:{ example_district:{ name:'Example district', kingdom:'example_region' } },
    kingdoms:{ example_region:{ name:'Example region', empire:null } }, empires:{},
    climate:{ zone:'northern_temperate', provinces:{} },
    straits:[], crossingClasses:{}, scripted:[],
    // Only existing balance keys may be overridden; no override is required.
    balance:{}, requirements:{ provinces:['paris'], governments:['territorial'] }
  };
  FBDATA.startScenarios.push({
    id:'template_farmer', name:'Example farmer', desc:'An ordinary farming household.',
    intro:'Your household begins its story.', profession:'farmer', tier:1,
    gold:18, prestige:5, piety:0, bookmarkIds:['template_900'],
    fixedProvinceId:'paris', startCulture:'frankish', startReligion:'jewish',
    tracks:[], alwaysUnlocked:true
  });
})();
