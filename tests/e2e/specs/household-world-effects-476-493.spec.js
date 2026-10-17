'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['index.html','data/story_household_effects_476_493.js',
  'data/bookmark_476.js','data/bookmark_476_wider.js','data/bookmark_493.js','data/bookmark_493_world.js',
  'data/story_courts_476.js','data/story_campaigns.js','data/bookmark_493_history.js','data/story_instances.js',
  'data/starts.js','data/technology.js','js/story_household_observer.js','js/story_household.js','js/stories.js',
  'js/story_campaign.js','js/story_courts.js','js/story_track.js','js/story_agreements.js','js/story_government_selection.js',
  'js/government_selection.js','js/world.js','js/treasury.js','js/population.js','js/starts.js','js/main.js',
  'js/save.js','js/save_v4.js','js/wars.js','js/armies.js','js/ui_panels.js']);

test('all existing sources have bounded household coverage on each offered revision', async function ({ page }, info) {
  await openGame(page, info);
  expect(await page.evaluate(function () {
    const defs = Object.keys(FBDATA.householdEffects_476_493).map(function (id) { return FBDATA.householdEffects_476_493[id]; });
    const revisions = [];
    ['476','493'].forEach(function (id) {
      FB.bookmarkRevisions(id,FBDATA.bookmarks[id]).forEach(function (bm) {
        const observers = defs.filter(function (d) { return bm.stories.indexOf(d.sourceStoryId) >= 0; });
        revisions.push(FB.validateBookmark(bm).length === 0 && observers.every(function (d) { return bm.stories.indexOf(d.id) >= 0; }));
      });
    });
    return { sources:defs.length, beats:defs.reduce(function (n,d) { return n+d.beats.length; },0),
      revisions:revisions.every(Boolean), technology:FBDATA.techImpactReviews.features.household_world_notices.mode,
      released:['867','1066'].every(function (id) { return !(FB.bookmark(id).stories || []).some(function (key) { return key.indexOf('household_effects_') === 0; }); }),
      economic:defs.every(function (d) { return d.beats.every(function (b) { return b.choices.every(function (c) {
        return ['review_records','continue_livelihood'].indexOf(c.operation) >= 0; }); }); }) };
  })).toEqual({sources:24,beats:128,revisions:true,technology:'none',released:true,economic:true});
});

test('a never-started cancellation and unrelated households receive no fabricated local event', async function ({ page }, info) {
  await beginBookmark(page,info,'476');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'household_effects_clovis_syagrius_476', module = FB.stories.get(id), t = s.stories[id];
    s.turn = 10; s.player.provinceId = 'laon';
    Object.assign(s.stories.clovis_syagrius_476,{phase:'resolved',result:'diverted',outcomeTurn:10});
    const money = s.player.gold, before = JSON.stringify(s.owner);
    module.day(s,t);
    return {visible:FB.stories.status(s,id),pending:t.pending.length,receipts:Object.keys(t.householdReceipts).length,
      gold:money === s.player.gold,ownership:before === JSON.stringify(s.owner)};
  })).toEqual({visible:null,pending:0,receipts:0,gold:true,ownership:true});
});

for (const result of ['won','failed','diverted','interrupted']) {
  test('the ' + result + ' ending reaches prior local households and leaves ordinary war with its owner', async function ({ page }, info) {
    await beginBookmark(page,info,'476');
    expect(await page.evaluate(function (result) {
      const s = FB.state, source = s.stories.clovis_syagrius_476, id = 'household_effects_clovis_syagrius_476';
      const module = FB.stories.get(id), t = s.stories[id]; s.turn = 10; s.player.provinceId = 'laon';
      const oldOwner = s.owner.laon;
      const war = FB.registerOrdinaryWar(s,'franks_476',{enemy:oldOwner,target:'laon',legacy:false,
        casus:{type:'border',target:'laon'},objectives:[{type:'border',target:'laon'}]});
      if (!war) throw new Error('An ordinary border war is required for this staged boundary.');
      Object.assign(source,{phase:'started',startedTurn:10,deadline:100,warId:war.id,targetOwnerId:oldOwner});
      module.day(s,t);
      const started = !!FB.stories.status(s,id);
      FB.stories.apply(s,id,'continue',FB.stories.quote(s,id,'continue'));
      s.turn = 11;
      if (result === 'won') FB.transferProvince(s,'laon','franks_476');
      Object.assign(source,{phase:'resolved',result:result,outcomeTurn:11});
      module.day(s,t);
      const q = FB.stories.quote(s,id,'records'), sourceBefore = JSON.stringify(source), gold = s.player.gold;
      const wars = JSON.stringify(s.wars), properties = JSON.stringify(s.player.holdings);
      const applied = FB.stories.apply(s,id,'records',q), repeated = FB.stories.apply(s,id,'records',q);
      return {started:started,offered:q.allowed,applied:applied,repeated:repeated,
        source:sourceBefore === JSON.stringify(source),wars:wars === JSON.stringify(s.wars),
        properties:properties === JSON.stringify(s.player.holdings),gold:gold === s.player.gold,
        ending:t.history[t.history.length-1].beatId};
    },result)).toEqual({started:true,offered:true,applied:true,repeated:false,source:true,wars:true,
      properties:true,gold:true,ending:'c01_'+result});
  });
}

test('an ordinary 493 household receives a later local campaign without a special opening track', async function ({ page }, info) {
  await beginBookmark(page,info,'493');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'household_effects_alamannic_campaign_493', source = s.stories.alamannic_campaign_493;
    s.player.provinceId = 'strasbourg'; s.turn = 10;
    Object.assign(source,{phase:'started',startedTurn:10,deadline:100,warId:'staged_493_war'});
    FB.stories.get(id).day(s,s.stories[id]);
    const q = FB.stories.quote(s,id,'records'), before = JSON.stringify([s.player.gold,s.owner,s.player.holdings]);
    const applied = FB.stories.apply(s,id,'records',q);
    return {offered:q.allowed,applied:applied,unchanged:before === JSON.stringify([s.player.gold,s.owner,s.player.holdings]),
      personal:FB.stories.attached(s).some(function (key) { return FB.stories.get(key).kind === 'track'; })};
  })).toEqual({offered:true,applied:true,unchanged:true,personal:false});
});

test('repeated office history is keyed to each real result and turn without replay', async function ({ page }, info) {
  await beginBookmark(page,info,'476');
  expect(await page.evaluate(function () {
    const s = FB.state, source = s.stories.western_office_476, id = 'household_effects_western_office_476';
    const module = FB.stories.get(id), t = s.stories[id]; s.player.provinceId = 'ravenna';
    const accepted = ['survived','deposed','restored'].map(function (result,i) {
      s.turn = 400 + 20*i;
      source.history.push({result:result,turn:s.turn,officeId:source.officeId});
      Object.assign(source,{phase:'resolved',result:result,outcomeTurn:s.turn});
      module.day(s,t);
      return FB.stories.apply(s,id,'records',FB.stories.quote(s,id,'records'));
    });
    const before = JSON.stringify(t); module.day(s,t);
    return {accepted:accepted,history:t.history.map(function (h) { return h.beatId; }),
      receipts:Object.keys(t.householdReceipts).length,stable:before === JSON.stringify(t)};
  })).toEqual({accepted:[true,true,true],history:['office476_survived','office476_deposed','office476_restored'],receipts:3,stable:true});
});

test('two actual tribute installments are public receipts and never household tax or wages', async function ({ page }, info) {
  await beginBookmark(page,info,'476');
  expect(await page.evaluate(function () {
    const s = FB.state, sourceId = 'sicilian_tribute_476', d = FB.stories.get(sourceId).declaration;
    const r = s.stories[sourceId], id = 'household_effects_'+sourceId, module = FB.stories.get(id), t = s.stories[id];
    s.player.provinceId = 'messina'; s.turn = 270;
    FB.treasuryCredit(s,d.actor.realmId,1000);
    if (!FB.treasuryTransfer(s,d.actor.realmId,d.source.realmId,d.tribute)) throw new Error('The public payer must fund the agreement.');
    d.countyIds.forEach(function (pid) { FB.transferProvince(s,pid,d.actor.realmId); });
    Object.assign(r,{phase:'active',ceded:true,acceptedTurn:270,paidThroughTurn:270,totalPaid:d.tribute});
    module.day(s,t); FB.stories.apply(s,id,'records',FB.stories.quote(s,id,'records'));
    const gold = s.player.gold;
    const paid = [630,990].map(function (turn) {
      s.turn = turn;
      if (!FB.treasuryTransfer(s,d.actor.realmId,d.source.realmId,d.tribute)) throw new Error('The installment must actually be paid.');
      r.paidThroughTurn = turn; r.totalPaid += d.tribute;
      const before = JSON.stringify(s.realms);
      module.day(s,t);
      const applied = FB.stories.apply(s,id,'records',FB.stories.quote(s,id,'records'));
      return applied && before === JSON.stringify(s.realms);
    });
    module.day(s,t);
    return {paid:paid,gold:gold === s.player.gold,installments:t.history.filter(function (h) { return h.beatId === 'sicily476_installment'; }).length,
      pending:t.pending.length,total:r.totalPaid === d.tribute*3};
  })).toEqual({paid:[true,true],gold:true,installments:2,pending:0,total:true});
});

test('conserved civilian batches produce notices without moving the player or moving people twice', async function ({ page }, info) {
  await beginBookmark(page,info,'476');
  expect(await page.evaluate(function () {
    const s = FB.state, sourceId = 'norican_evacuation_476', d = FB.stories.get(sourceId).declaration;
    const r = s.stories[sourceId], id = 'household_effects_'+sourceId, module = FB.stories.get(id), t = s.stories[id];
    const route = d.routes[0]; s.player.provinceId = route.to; s.turn = 90;
    const ruler = FB.materializeRealmRuler(s,d.actor.realmId);
    Object.assign(r,{phase:'active',actorId:ruler.id,actorGeneration:FB.realmRulerGeneration(s,d.actor.realmId),
      routes:[{from:route.from,to:route.to,planned:2,moved:0}],lastPeriod:1});
    module.day(s,t); FB.stories.apply(s,id,'records',FB.stories.quote(s,id,'records'));
    const home = s.player.provinceId, gold = s.player.gold;
    function population() { return [route.from,route.to].map(function (pid) { return FB.countyCommunities(s,pid); }); }
    const accepted = [1,2].map(function (period) {
      s.turn = period*90; r.lastPeriod = period;
      const moved = FB.moveCommunityPopulationByPolicy(s,route.from,route.to,{amount:1,community:d.community,cause:'civilian relocation'});
      if (moved.count !== 1) throw new Error('The staged conserved batch must contain one civilian.');
      r.routes[0].moved += moved.count;
      const before = JSON.stringify(population()); module.day(s,t);
      const applied = FB.stories.apply(s,id,'records',FB.stories.quote(s,id,'records'));
      return applied && before === JSON.stringify(population());
    });
    Object.assign(r,{phase:'resolved',result:'interrupted',outcomeTurn:s.turn,reason:'changed_route_or_court'});
    module.day(s,t);
    return {accepted:accepted,home:home === s.player.provinceId,gold:gold === s.player.gold,moved:r.routes[0].moved,
      interrupted:!!FB.stories.status(s,id),batches:t.history.filter(function (h) { return h.beatId === 'noricum476_batch'; }).length};
  })).toEqual({accepted:[true,true],home:true,gold:true,moved:2,interrupted:true,batches:2});
});

test('canonical local recognition reaches commoners without a kingmaking action', async function ({ page }, info) {
  await beginBookmark(page,info,'476');
  expect(await page.evaluate(function () {
    const s = FB.state, rid = 'cashel_local_476', id = 'household_effects_cashel_recognition_476';
    const module = FB.stories.get(id), t = s.stories[id]; s.player.provinceId = 'cashel'; s.turn = 10;
    FB.treasuryCredit(s,rid,100); FB.setCountySupport(s,'cashel',-100);
    FB.killChar(s,FB.materializeRealmRuler(s,rid));
    module.day(s,t);
    const choices = FB.stories.choices(s,id).map(function (c) { return c.id; });
    const source = JSON.stringify(FB.governmentSelection.state(s,rid)), gold = s.player.gold;
    const applied = FB.stories.apply(s,id,'records',FB.stories.quote(s,id,'records'));
    return {choices:choices,applied:applied,canonical:source === JSON.stringify(FB.governmentSelection.state(s,rid)),gold:gold === s.player.gold};
  })).toEqual({choices:['records','continue'],applied:true,canonical:true,gold:true});
});

test('the initial court report uses the shared reviewed sheet and returns to its Deeds card', async function ({ page }, info) {
  await beginBookmark(page,info,'476','federate_476');
  await page.locator('[data-tab="actions"]').click();
  const card = page.locator('[data-story-card="household_effects_western_court_476"]');
  await expect(card).toBeVisible();
  await card.click();
  await expect(page.locator('#gm-body')).toContainText('Review household records');
  await page.keyboard.press('Escape');
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  await expect(card).toBeFocused();
});
