'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['index.html','data/story_household_effects_711_800_1204.js',
  'data/bookmark_711.js','data/bookmark_711_terrain.js','data/story_campaigns_711.js',
  'data/bookmark_800.js','data/bookmark_800_history.js','data/bookmark_800_expansion.js',
  'data/bookmark_1204.js','data/bookmark_1204_campaigns.js','data/bookmark_1204_terrain.js',
  'data/story_instances.js','data/story_households_711.js','data/story_households_800.js',
  'data/story_households_1204.js','data/starts.js','data/technology.js','data/distribution_crazygames.js',
  'js/story_household_observer.js','js/story_household.js','js/stories.js','js/story_campaign.js',
  'js/story_settlements.js','js/story_history.js','js/story_polity_foundation.js','js/rebellions.js',
  'js/world.js','js/starts.js','js/main.js','js/wars.js','js/armies.js','js/royal_settlements.js',
  'js/holywar.js','js/authority.js','js/treasury.js','js/save.js','js/save_v4.js','js/crazygames.js']);

test('all 29 sources and 122 news milestones have bounded revision-scoped household rules', async function ({page}, info) {
  await openGame(page, info);
  expect(await page.evaluate(function () {
    const defs = Object.values(FBDATA.householdEffects_711_800_1204), revisions = [], counts = [];
    ['711','800','1204'].forEach(function (id) {
      const bm = FB.bookmark(id), local = defs.filter(function (d) { return bm.stories.indexOf(d.sourceStoryId) >= 0; });
      counts.push(local.length);
      FB.bookmarkRevisions(id,FBDATA.bookmarks[id]).forEach(function (revision) {
        revisions.push(FB.validateBookmark(revision).length === 0 && defs.every(function (d) {
          return (revision.stories.indexOf(d.id) >= 0) === (revision.stories.indexOf(d.sourceStoryId) >= 0);
        }));
      });
    });
    const news = defs.reduce(function (n,d) { return n+Object.keys(FB.stories.get(d.sourceStoryId).declaration.news).length; },0);
    return {sources:defs.length,counts:counts,beats:defs.reduce(function (n,d) { return n+d.beats.length; },0),news:news,
      covered:defs.every(function (d) { return Object.keys(FB.stories.get(d.sourceStoryId).declaration.news).every(function (key) {
        return d.beats.some(function (b) { return b.trigger === key; }); }); }),revisions:revisions.every(Boolean),
      technology:FBDATA.techImpactReviews.features.household_world_notices.mode,
      costs:defs.every(function (d) { return d.beats.every(function (b) { return b.choices.every(function (c) {
        return ['review_records','continue_livelihood'].indexOf(c.operation) >= 0; }); }); }),
      released:['867','1066'].every(function (id) { return !(FB.bookmark(id).stories || []).some(function (key) {
        return key.indexOf('household_effects_') === 0; }); })};
  })).toEqual({sources:29,counts:[5,9,15],beats:143,news:122,covered:true,revisions:true,technology:'none',costs:true,released:true});
});

for (const bookmark of ['711','800','1204']) {
  test(bookmark+' campaign reports preserve resources and cover every ending without daily simulation', async function ({page}, info) {
    await beginBookmark(page,info,bookmark,'serf');
    expect(await page.evaluate(function () {
      const s = FB.state, checks = [];
      Object.values(FBDATA.householdEffects_711_800_1204).filter(function (d) {
        return !!s.stories[d.id] && FB.stories.get(d.sourceStoryId).declaration.type === 'campaign';
      }).forEach(function (d) {
        const r = s.stories[d.sourceStoryId], module = FB.stories.get(d.id), original = JSON.parse(JSON.stringify(r));
        ['won','failed','diverted','interrupted'].forEach(function (result) {
          Object.assign(r,original); s.player.provinceId = d.provinceIds[0]; s.turn = 10;
          s.stories[d.id] = module.init(s); const t = s.stories[d.id];
          Object.assign(r,{phase:'started',result:null,startedTurn:10,warId:'local_review',outcomeTurn:null});
          module.day(s,t); const started = !!FB.stories.status(s,d.id);
          const q = FB.stories.quote(s,d.id,'records'), source = JSON.stringify(r), gold = s.player.gold;
          const accepted = FB.stories.apply(s,d.id,'records',q);
          const sourceUnchanged = source === JSON.stringify(r);
          s.turn = 11; Object.assign(r,{phase:'resolved',result:result,outcomeTurn:11});
          const before = JSON.stringify([s.player.gold,s.owner,s.holder,s.population,s.realms,s.armies]);
          module.day(s,t); const ending = FB.stories.status(s,d.id);
          const applied = FB.stories.apply(s,d.id,'continue',FB.stories.quote(s,d.id,'continue'));
          module.day(s,t); module.season(s,t);
          checks.push(started && accepted && sourceUnchanged && ending && applied &&
            t.history.map(function (h) { return h.beatId; }).join(',') === d.sourceStoryId+'_started,'+d.sourceStoryId+'_'+result &&
            gold === s.player.gold && before === JSON.stringify([s.player.gold,s.owner,s.holder,s.population,s.realms,s.armies]) &&
            FB.stories.status(s,d.id) === null);
        });
        Object.assign(r,original);
      });
      return {checks:checks.length,passed:checks.every(Boolean)};
    })).toEqual({checks:bookmark === '711' || bookmark === '800' ? 16 : 44,passed:true});
  });
}

test('remote, absent and newly arriving households receive no invented loss or old campaign replay', async function ({page}, info) {
  await beginBookmark(page,info,'800','serf');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'household_effects_barcelona_800', module = FB.stories.get(id), t = s.stories[id];
    s.turn = 10; s.player.provinceId = 'aachen';
    Object.assign(s.stories.barcelona_800,{phase:'started',startedTurn:10,warId:'local_review'});
    const assets = JSON.stringify([s.player.gold,s.player.holdings,s.population]); module.day(s,t);
    const remote = FB.stories.status(s,id);
    s.player.provinceId = 'barcelona'; s.player.travel = {currentId:'aachen'}; module.day(s,t);
    const absent = FB.stories.status(s,id); s.player.travel = null;
    Object.assign(s.stories.barcelona_800,{phase:'resolved',result:'failed',outcomeTurn:11}); s.turn = 11;
    module.day(s,t); const arriving = FB.stories.status(s,id);
    const initialized = module.init(s);
    return {remote:remote,absent:absent,arriving:arriving,baseline:initialized.pending.length,
      resources:assets === JSON.stringify([s.player.gold,s.player.holdings,s.population])};
  })).toEqual({remote:null,absent:null,arriving:null,baseline:0,resources:true});
});

test('inheritance planning and execution use their actual timestamps and silent closures supersede notices', async function ({page}, info) {
  await beginBookmark(page,info,'800','serf');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'household_effects_divisio_800', module = FB.stories.get(id), t = s.stories[id];
    s.player.provinceId = 'aachen'; s.turn = 10;
    Object.assign(s.stories.divisio_800,{phase:'planned',turn:10,plan:{shares:[]}}); module.day(s,t);
    const agreement = t.pending[0].event.turn;
    FB.stories.apply(s,id,'records',FB.stories.quote(s,id,'records'));
    s.turn = 11; Object.assign(s.stories.divisio_800,{phase:'resolved',result:'executed',turn:11}); module.day(s,t);
    const execution = t.pending[0].event.turn;
    const endings = ['declined','expired','interrupted','diverted'].map(function (result) {
      const source = s.stories.gifts_800, key = 'household_effects_gifts_800', m = FB.stories.get(key);
      Object.assign(source,{phase:'pending',result:null,turn:null}); s.stories[key] = m.init(s); const observer = s.stories[key];
      s.turn++; Object.assign(source,{phase:'resolved',result:'agreed',turn:s.turn}); m.day(s,observer);
      const old = FB.stories.quote(s,key,'records');
      s.turn++; Object.assign(source,{result:result,turn:s.turn}); m.day(s,observer);
      return observer.pending.length === 1 && observer.pending[0].beatId === 'gifts_800_'+result &&
        !FB.stories.apply(s,key,'records',old);
    });
    return {agreement:agreement,execution:execution,endings:endings};
  })).toEqual({agreement:10,execution:11,endings:[true,true,true,true]});
});

for (const conquered of [false,true]) {
  test('the actual Asturian '+(conquered ? 'revolt' : 'peaceful foundation')+' reaches a household without a second transaction', async function ({page}, info) {
    await beginBookmark(page,info,'711','serf');
    expect(await page.evaluate(function (conquered) {
      const s = FB.state, sourceId = 'asturias_foundation_711', id = 'household_effects_'+sourceId;
      const source = FB.stories.get(sourceId), m = FB.stories.get(id), t = s.stories[id];
      s.player.provinceId = 'oviedo'; s.date = {year:718,season:0,day:1}; s.turn = 7*360;
      FB.transferProvince(s,'toledo','umayyad_711');
      if (conquered) {
        FB.transferProvince(s,'oviedo','umayyad_711'); FB.setCountySupport(s,'oviedo',-80);
        if (!FB.startOpenRevolt(s,'oviedo')) throw new Error('The ordinary local revolt must exist.');
      }
      source.day(s,s.stories[sourceId]);
      const before = JSON.stringify([s.owner,s.holder,s.realms,s.armies,s.population,s.player.gold]); m.day(s,t);
      const notice = t.pending[0], accepted = FB.stories.apply(s,id,'records',FB.stories.quote(s,id,'records'));
      m.day(s,t); m.season(s,t);
      return {trigger:notice.event.milestone,accepted:accepted,once:t.history.length,
        unchanged:before === JSON.stringify([s.owner,s.holder,s.realms,s.armies,s.population,s.player.gold])};
    },conquered)).toEqual({trigger:conquered ? 'rebelling' : 'founded',accepted:true,once:1,unchanged:true});
  });
}

test('Verdun pressure requires the recorded ordinary war and never becomes a private levy', async function ({page}, info) {
  await beginBookmark(page,info,'800','serf');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'household_effects_verdun_800', r = s.stories.verdun_800, m = FB.stories.get(id), t = s.stories[id];
    s.turn = 10; s.player.provinceId = 'aachen'; r.pressure.amount = 4; m.day(s,t);
    const amountOnly = FB.stories.status(s,id);
    FB.releaseRoyalRegion(s,'carolingian_800','aquitaine');
    const war = FB.registerOrdinaryWar(s,'carolingian_800',{enemy:'aquitaine',legacy:false,
      casus:{type:'independence',rebel:'aquitaine',formerLiege:'carolingian_800'}});
    if (!war) throw new Error('The ordinary pressure war must exist.');
    r.pressure.warId = war.id; r.pressure.rebelId = 'aquitaine';
    const before = JSON.stringify([s.wars,s.realms,s.player.gold]); m.day(s,t);
    const q = FB.stories.quote(s,id,'records'), accepted = FB.stories.apply(s,id,'records',q);
    m.day(s,t); m.season(s,t);
    return {amountOnly:amountOnly,accepted:accepted,payments:before === JSON.stringify([s.wars,s.realms,s.player.gold]),
      receipts:t.history.length,pending:t.pending.length};
  })).toEqual({amountOnly:null,accepted:true,payments:true,receipts:1,pending:0});
});

test('a grant reaches only actual granted counties and cannot confirm after third-party possession', async function ({page}, info) {
  await beginBookmark(page,info,'1204','serf');
  expect(await page.evaluate(function () {
    const s = FB.state, source = s.stories.athens_partition_1204, id = 'household_effects_athens_partition_1204';
    const m = FB.stories.get(id), t = s.stories[id]; s.turn = 10; s.player.provinceId = 'athens';
    Object.assign(source,{phase:'resolved',result:'granted',outcomeTurn:10,realmId:'athens_latin_1204',grantedCounties:['athens']});
    m.day(s,t); const unheld = FB.stories.status(s,id);
    s.holder.athens = 'athens_latin_1204'; s.stories[id] = m.init(s);
    // A fresh observer baselines an old grant. Deliver only a later occurrence.
    source.outcomeTurn = 11; s.turn = 11; m.day(s,s.stories[id]);
    const q = FB.stories.quote(s,id,'records');
    s.holder.athens = 'nicaea_1204'; FB.invalidateRealmCache();
    return {unheld:unheld,offered:q.allowed,stale:FB.stories.apply(s,id,'records',q)};
  })).toEqual({unheld:null,offered:true,stale:false});
});

for (const crazy of [false,true]) {
  test('live religious objectives reach minority households without replay or costs, flag '+crazy, async function ({page}, info) {
    if (crazy) await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
    await beginBookmark(page,info,'1204','serf');
    expect(await page.evaluate(function () {
      const s = FB.state, id = 'household_effects_fifth_crusade_call_1204', m = FB.stories.get(id), t = s.stories[id];
      const r = s.stories.fifth_crusade_call_1204, initial = t.pending.length;
      s.turn = 10; s.player.provinceId = 'jerusalem'; s.chars[s.player.charId].religion = 'sunni';
      Object.assign(r,{phase:'started',campaignId:'ghw_101',calledTurn:10,callerRealmId:'papacy_1204'});
      s.greatHolyWar = {id:'ghw_102',calledTurn:10,callingReligion:'catholic',objectiveCounties:['jerusalem']};
      m.day(s,t); const wrong = FB.stories.status(s,id);
      s.greatHolyWar.id = 'ghw_101'; m.day(s,t);
      const q = FB.stories.quote(s,id,'records'), source = JSON.stringify([s.greatHolyWar,s.greatHolyWarHistory,s.player.gold]);
      const called = FB.stories.apply(s,id,'records',q);
      s.turn = 11; s.greatHolyWar = null;
      Object.assign(r,{phase:'resolved',result:'failed',reason:'campaign_missing',outcomeTurn:11}); m.day(s,t);
      const closure = FB.stories.apply(s,id,'continue',FB.stories.quote(s,id,'continue'));
      m.day(s,t); const baseline = m.init(s);
      return {initial:initial,wrong:wrong,called:called,closure:closure,faith:s.chars[s.player.charId].religion,
        pending:t.pending.length,baseline:baseline.pending.length,history:s.greatHolyWarHistory.campaigns.every(function (h) { return h.historical; }),
        privateResources:JSON.parse(source)[2] === s.player.gold};
    })).toEqual({initial:0,wrong:null,called:true,closure:true,faith:'sunni',pending:0,baseline:0,history:true,privateResources:true});
  });
}

test('Toledo victory shares the personal control receipt before that track dispatches', async function ({page}, info) {
  await beginBookmark(page,info,'711','toledo_household_711');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'household_effects_toledo_campaign_711', m = FB.stories.get(id), t = s.stories[id];
    s.turn = 10; Object.assign(s.stories.toledo_campaign_711,{phase:'started',startedTurn:10,warId:'local_review'}); m.day(s,t);
    s.turn = 11; FB.transferProvince(s,'toledo','umayyad_711');
    Object.assign(s.stories.toledo_campaign_711,{phase:'resolved',result:'won',outcomeTurn:11}); m.day(s,t);
    const item = t.pending.filter(function (n) { return n.beatId === 'toledo_campaign_711_won'; })[0];
    const q = FB.stories.quote(s,id,'records');
    return {alias:item.event.source,owner:FB.householdStories.owner(s,item.key),visible:!!FB.stories.status(s,id),
      accepted:q.allowed,unclosed:!FB.householdStories.receipt(s,item.key)};
  })).toEqual({alias:'control',owner:'toledo_household_track_711',visible:false,accepted:false,unclosed:true});
});

test('a religious victory needs the matching nonhistorical campaign and actual recorded target', async function ({page}, info) {
  await beginBookmark(page,info,'1204','serf');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'household_effects_fifth_crusade_call_1204', m = FB.stories.get(id);
    const r = s.stories.fifth_crusade_call_1204; s.turn = 10; s.player.provinceId = 'jerusalem';
    Object.assign(r,{phase:'resolved',campaignId:'ghw_101',calledTurn:9,callerRealmId:'papacy_1204',
      result:'won',reason:'campaign_ended',outcomeTurn:10});
    // The opening records and a different live campaign are neither this victory.
    s.greatHolyWarHistory.campaigns.push({id:'ghw_102',religion:'catholic',target:'syria',outcome:'attackers',turn:10});
    m.day(s,s.stories[id]); const unrelated = FB.stories.status(s,id);
    s.greatHolyWarHistory.campaigns.push({id:'ghw_101',religion:'catholic',target:'syria',outcome:'attackers',turn:10});
    m.day(s,s.stories[id]);
    const source = JSON.stringify([s.greatHolyWarHistory,s.owner,s.player.gold]);
    const accepted = FB.stories.apply(s,id,'records',FB.stories.quote(s,id,'records'));
    return {unrelated:unrelated,accepted:accepted,unchanged:source === JSON.stringify([s.greatHolyWarHistory,s.owner,s.player.gold])};
  })).toEqual({unrelated:null,accepted:true,unchanged:true});
});
