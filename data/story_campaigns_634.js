FB.bookmarkSources.stage({source:'data/story_campaigns_634.js',bookmarks:['634'],catalogs:[],shared:[]}, function (FBDATA) {
/* Independent court opportunities; ordinary war owns every territorial outcome. */
(function () {
  'use strict';
  var display = FBDATA.bookmarkContent['634'].campaigns;
  FBDATA.storyCampaigns634 = {
    syrian_front_634:{id:'syrian_front_634',type:'campaign',
      name:display.syrian_front_634.name,desc:display.syrian_front_634.desc,
      requires:[],firstYear:634,lastYear:635,durationDays:360,
      actor:{realmId:'rashidun_634'},
      target:{provinceId:'damascus',ownerIds:['byzantium_634']},conditions:[],
      admission:{schema:1,mode:'ordinary_declaration',cause:'aggression'}},
    iraqi_front_634:{id:'iraqi_front_634',type:'campaign',
      name:display.iraqi_front_634.name,desc:display.iraqi_front_634.desc,
      requires:[],firstYear:634,lastYear:635,durationDays:180,
      actor:{realmId:'rashidun_634'},
      target:{provinceId:'kufa',ownerIds:['sasanian_634']},conditions:[],
      admission:{schema:1,mode:'ordinary_declaration',cause:'aggression'}}
  };
  var source = FBDATA.bookmarkCompositionSources && FBDATA.bookmarkCompositionSources.autumn_634;
  if (!source || !source.input) return;
  source.input.catalogs.storyInstances = JSON.parse(JSON.stringify(FBDATA.storyCampaigns634));
  var world = source.input.bookmark.revisions.core_courts_v4;
  world.stories = (world.stories || source.input.bookmark.stories || []).concat(Object.keys(FBDATA.storyCampaigns634));
})();
});
