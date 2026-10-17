'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { useReleasedStartRules } = require('../support/game/released-starts');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['index.html','data/starts_crossing_711.js','data/story_households_crossing_711.js',
  'data/starts.js','data/story_instances.js','data/bookmark_711.js','data/bookmark_711_terrain.js',
  'data/communal_revisions.js','data/government_rollout.js','data/story_campaigns_711.js',
  'data/travel.js','data/events_travel.js','data/technology.js','data/actions.js','data/economy.js',
  'js/starts.js','js/stories.js','js/story_household.js','js/story_household_observer.js',
  'js/story_campaign.js','js/story_polity_foundation.js','js/mods.js','js/world.js',
  'js/main.js','js/model.js','js/actions.js','js/travel.js','js/events.js','js/wars.js',
  'js/save.js','js/save_v4.js','js/ui_misc.js','js/ui_panels.js','js/ui_modals.js']);
const ID = 'crossing_soldier_track_711';

async function begin(page, info) {
  await beginBookmark(page, info, '711', 'crossing_soldier_711');
}

test('the soldier validates on every offered revision with unchanged campaign and foundation windows', async function ({ page }, info) {
  await openGame(page, info);
  const result = await page.evaluate(function () {
    const sc = FBDATA.startScenarios_crossing_711[0], before = JSON.stringify(FBDATA.bookmarks['711']);
    const errors = FB.mods.validate({ name:'Soldier declaration', startScenarios:[JSON.parse(JSON.stringify(sc))] });
    return { errors, pure:before === JSON.stringify(FBDATA.bookmarks['711']),
      revisions:FB.bookmarkRevisions('711',FBDATA.bookmarks['711']).map(function (bm) {
        return { id:bm.revision, errors:FB.validateBookmark(bm) };
      }), tracks:FB.startStoryTracks(sc,'tangier'), away:FB.startTracks(sc,'toledo'),
      fixed:sc.fixedProvinceId, family:Object.keys(sc.familyPresets),
      windows:['strait_crossing_711','toledo_campaign_711','asturias_foundation_711'].map(function (id) {
        const d = FBDATA.storyInstances[id]; return [d.firstYear,d.lastYear,d.durationDays];
      }) };
  });
  expect(result).toMatchObject({ errors:[], pure:true, tracks:[ID], away:[], fixed:'tangier', family:['standard'],
    windows:[[711,714,1080],[714,718,1800],[718,730,1080]] });
  for (const revision of result.revisions) expect(revision.errors, revision.id).toEqual([]);
  await begin(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    return { phase:s.stories.crossing_soldier_track_711.phase, home:s.player.provinceId,
      culture:me.culture, faith:me.religion, age:FB.ageOf(me,s.date.year), career:me.profession,
      tier:s.player.tier, court:!!s.start.rulerRealmId, asturias:!!s.realms.asturias_711 };
  })).toEqual({ phase:'opening', home:'tangier', culture:'berber', faith:'umayyad_sunni_711',
    age:24, career:'soldier', tier:1, court:false, asturias:false });
});

for (const community of ['berber.catholic','arabic.umayyad_sunni_711']) {
  test('the Story picker and code retain the selected ' + community + ' community', async function ({ page }, info) {
    await useReleasedStartRules(page);
    await openGame(page, info);
    const full = page.locator('#btn-choose-beginning');
    if (await full.isVisible()) await full.click();
    else await page.getByRole('button', { name:'New Game', exact:true }).click();
    await page.locator('#bookmarklist [data-bookmark="711"]').click();
    await expect(page.getByRole('button', { name:'Soldier at the Strait', exact:true })).toBeVisible();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('STRAIT-711-crossing_soldier_711-tangier-m-Amal-standard-0-' + community);
    await page.locator('#ng-seed').press('Enter');
    await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
    await page.getByRole('button', { name:'Begin', exact:true }).click();
    expect(await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId], id = 'crossing_soldier_track_711';
      const before = [c.culture,c.religion], source = JSON.stringify([s.stories.strait_crossing_711,s.wars,s.owner]);
      const selected = FB.stories.apply(s,id,'pursue',FB.stories.quote(s,id,'pursue'));
      return { identity:c.culture + '.' + c.religion, selected, phase:s.stories[id].phase,
        sameIdentity:JSON.stringify(before) === JSON.stringify([c.culture,c.religion]),
        sameWorld:source === JSON.stringify([s.stories.strait_crossing_711,s.wars,s.owner]) };
    })).toEqual({ identity:community, selected:true, phase:'waiting', sameIdentity:true, sameWorld:true });
  });
}

test('local work advances only on actual ordinary income and does not pay twice after restore', async function ({ page }, info) {
  await begin(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'crossing_soldier_track_711', gold = s.player.gold;
    const choice = FB.stories.apply(s,id,'local',FB.stories.quote(s,id,'local'));
    const selectedOnly = s.player.gold === gold && s.stories[id].phase === 'local_work';
    FB.householdStories.focusPaid(s,'stand_guard',0);
    const unpaid = s.stories[id].phase;
    FB.tickFocus(s);
    const after = s.player.gold, record = JSON.stringify(s.stories[id]);
    const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
    FB.stories.get(id).day(FB.state,FB.state.stories[id]);
    return { choice, selectedOnly, unpaid, phase:FB.state.stories[id].phase, paid:after > gold,
      noReplay:FB.state.player.gold === after, recordKept:record === JSON.stringify(FB.state.stories[id]) };
  })).toEqual({ choice:true, selectedOnly:true, unpaid:'local_work', phase:'stayed', paid:true, noReplay:true, recordKept:true });
});

test('declining is costless, terminal and leaves public authority with the courts', async function ({ page }, info) {
  await begin(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'crossing_soldier_track_711';
    const before = JSON.stringify([s.realms,s.owner,s.holder,s.wars,s.armies,s.player.gold,s.turn]);
    const political = FB.stories.quote(s,'strait_crossing_711','face_campaign');
    const declined = FB.stories.apply(s,id,'decline',FB.stories.quote(s,id,'decline'));
    const repeated = FB.stories.apply(s,id,'decline',FB.stories.quote(s,id,'decline'));
    return { declined, repeated, political:political.allowed, phase:s.stories[id].phase,
      unchanged:before === JSON.stringify([s.realms,s.owner,s.holder,s.wars,s.armies,s.player.gold,s.turn]) };
  })).toEqual({ declined:true, repeated:false, political:false, phase:'stayed', unchanged:true });
});

for (const result of ['won','failed','diverted','interrupted']) {
  test('the personal review follows the saved ' + result + ' campaign result without a reward', async function ({ page }, info) {
    await begin(page, info);
    expect(await page.evaluate(function (result) {
      const s = FB.state, id = 'crossing_soldier_track_711', t = s.stories[id], story = FB.stories.get(id);
      FB.stories.apply(s,id,'pursue',FB.stories.quote(s,id,'pursue'));
      // Stage the authoritative outcome boundary without simulating several years.
      const source = s.stories.strait_crossing_711;
      source.phase = 'resolved'; source.result = result; source.outcomeTurn = s.turn;
      if (result === 'won') FB.transferProvince(s,'malaga','umayyad_711');
      const world = JSON.stringify([s.owner,s.realms,s.wars,s.armies,source,s.stories.asturias_foundation_711]);
      const gold = s.player.gold;
      story.day(s,t); const phase = t.phase;
      const accepted = FB.stories.apply(s,id,'finish',FB.stories.quote(s,id,'finish'));
      const record = JSON.stringify(t), saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
      return { phase, accepted, terminal:FB.state.stories[id].phase,
        noReward:FB.state.player.gold === gold, retained:record === JSON.stringify(FB.state.stories[id]),
        sourceKept:world === JSON.stringify([s.owner,s.realms,s.wars,s.armies,source,s.stories.asturias_foundation_711]) };
    }, result)).toEqual({ phase:result === 'won' ? 'foothold' : result === 'interrupted' ? 'campaign_interrupted' : result,
      accepted:true, terminal:'stayed', noReward:true, retained:true, sourceKept:true });
  });
}

test('ordinary crossing travel quotes real cost, moves the protagonist alone and survives restore', async function ({ page }, info) {
  await begin(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'crossing_soldier_track_711', t = s.stories[id], story = FB.stories.get(id);
    FB.stories.apply(s,id,'pursue',FB.stories.quote(s,id,'pursue'));
    FB.stories.get('strait_crossing_711').day(s,s.stories.strait_crossing_711);
    story.day(s,t);
    const departure = t.phase, publicStory = JSON.stringify(s.stories.strait_crossing_711);
    s.player.gold = 0;
    const poor = FB.stories.quote(s,id,'cross').allowed;
    s.player.gold = 1000;
    const family = JSON.stringify(FB.householdMembers(s).map(function (c) { return c.id; }));
    const q = FB.stories.quote(s,id,'cross'), gold = s.player.gold;
    const went = FB.stories.apply(s,id,'cross',q), journey = JSON.stringify(s.player.travel);
    const facts = { departure, poor, went, paidExact:gold-s.player.gold === q.facts.terms.cost,
      phase:t.phase, home:s.player.provinceId, current:s.player.travel.currentId, destination:s.player.travel.destinationId,
      familyKept:family === JSON.stringify(FB.householdMembers(s).map(function (c) { return c.id; })),
      publicKept:publicStory === JSON.stringify(s.stories.strait_crossing_711) };
    const saved = JSON.parse(FB.save.serialize()); FB.activateBookmark('1066'); FB.save.restore(saved);
    facts.restored = journey === JSON.stringify(FB.state.player.travel);
    const restored = FB.state, rec = restored.stories[id];
    // Stage actual location boundaries; ordinary travel owns movement between them.
    restored.player.travel.currentId = 'malaga'; restored.player.travel.phase = 'outbound';
    story.day(restored,rec); facts.passing = rec.phase;
    restored.player.travel.phase = 'arrived'; story.day(restored,rec); facts.arrived = rec.phase;
    rec.phase = 'returning'; rec.revision++; delete restored.player.travel;
    story.day(restored,rec); facts.returned = rec.phase;
    return facts;
  })).toEqual({ departure:'departure', poor:false, went:true, paidExact:true, phase:'crossing_journey',
    home:'tangier', current:'tangier', destination:'malaga', familyKept:true, publicKept:true,
    restored:true, passing:'crossing_journey', arrived:'arrival', returned:'returned' });
});

test('changed campaign terms invalidate a journey confirmation without spending or travelling', async function ({ page }, info) {
  await begin(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'crossing_soldier_track_711', story = FB.stories.get(id);
    FB.stories.apply(s,id,'pursue',FB.stories.quote(s,id,'pursue'));
    FB.stories.get('strait_crossing_711').day(s,s.stories.strait_crossing_711); story.day(s,s.stories[id]);
    s.player.gold = 1000;
    const q = FB.stories.quote(s,id,'cross');
    Object.assign(s.stories.strait_crossing_711,{ phase:'resolved',result:'failed',outcomeTurn:s.turn });
    const before = JSON.stringify(s), applied = FB.stories.apply(s,id,'cross',q);
    return { reviewed:q.allowed, applied, pure:before === JSON.stringify(s), noTravel:!s.player.travel };
  })).toEqual({ reviewed:true, applied:false, pure:true, noTravel:true });
});

test('ordinary arrival starts a visitor stay without a phantom patron or an arrival reward', async function ({ page }, info) {
  await begin(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'crossing_soldier_track_711', story = FB.stories.get(id);
    FB.stories.apply(s,id,'pursue',FB.stories.quote(s,id,'pursue'));
    FB.stories.get('strait_crossing_711').day(s,s.stories.strait_crossing_711); story.day(s,s.stories[id]);
    s.player.gold = 1000;
    const went = FB.stories.apply(s,id,'cross',FB.stories.quote(s,id,'cross'));
    const gold = s.player.gold, t = s.player.travel;
    // Stage the final route boundary and let the travel owner perform arrival.
    t.currentId = t.destinationId; t.remainingRoute = [];
    FB.travelTick(s); story.day(s,s.stories[id]);
    const events = s.eventQueue.map(function (row) { return row.id; });
    const before = s.player.gold; FB.travelCapstoneDone(s);
    return { went, phase:t.phase, story:s.stories[id].phase, home:s.player.provinceId,
      capstone:events.indexOf('soldier_arrival_711') >= 0,
      phantom:events.indexOf('travel_patron_gone') >= 0, contract:!!t.contract,
      noReward:s.player.gold === gold && s.player.gold === before,
      stay:t.stayStarted, visitorWork:FB.stories.quote(s,id,'work').allowed };
  })).toEqual({ went:true, phase:'arrived', story:'arrival', home:'tangier', capstone:true,
    phantom:false, contract:false, noReward:true, stay:true, visitorWork:false });
});

test('inland travel requires the live Toledo campaign and current coastal sovereignty', async function ({ page }, info) {
  await begin(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'crossing_soldier_track_711', t = s.stories[id], story = FB.stories.get(id);
    FB.stories.apply(s,id,'pursue',FB.stories.quote(s,id,'pursue'));
    Object.assign(s.stories.strait_crossing_711,{ phase:'resolved',result:'won',outcomeTurn:s.turn });
    FB.transferProvince(s,'malaga','umayyad_711'); story.day(s,t);
    FB.stories.apply(s,id,'watch_inland',FB.stories.quote(s,id,'watch_inland'));
    story.day(s,t); const pending = t.phase;
    s.date.year = 714; s.turn = 1080;
    FB.stories.get('toledo_campaign_711').day(s,s.stories.toledo_campaign_711); story.day(s,t);
    const offered = t.phase; s.player.gold = 1000;
    const q = FB.stories.quote(s,id,'go');
    FB.transferProvince(s,'malaga','visigoths_711');
    const before = JSON.stringify(s), accepted = FB.stories.apply(s,id,'go',q), pure = before === JSON.stringify(s);
    story.day(s,t);
    return { pending, offered, reviewed:q.allowed, accepted, pure, closed:t.phase, noTravel:!s.player.travel };
  })).toEqual({ pending:'inland_wait', offered:'inland_offer', reviewed:true, accepted:false, pure:true,
    closed:'lost_foothold', noTravel:true });
});

test('a recorded victory without current possession cannot offer foothold work or an inland march', async function ({ page }, info) {
  await begin(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'crossing_soldier_track_711';
    Object.assign(s.stories.strait_crossing_711,{ phase:'resolved',result:'won',outcomeTurn:s.turn });
    FB.stories.get(id).day(s,s.stories[id]);
    return { phase:s.stories[id].phase, travel:!!s.player.travel, gold:s.player.gold };
  })).toEqual({ phase:'lost_foothold', travel:false, gold:20 });
});

for (const boundary of ['window','death','successor']) {
  test(boundary + ' closes the personal plan without transferring an expedition entitlement', async function ({ page }, info) {
    await begin(page, info);
    expect(await page.evaluate(function (boundary) {
      const s = FB.state, id = 'crossing_soldier_track_711', t = s.stories[id], story = FB.stories.get(id);
      FB.stories.apply(s,id,'pursue',FB.stories.quote(s,id,'pursue'));
      const actor = t.actorId, gold = s.player.gold;
      if (boundary === 'window') { s.date.year = 719; s.turn = 2880; }
      else if (boundary === 'death') s.chars[actor].dead = true;
      else s.player.charId = FB.householdMembers(s).find(function (c) { return c.id !== actor && !c.dead; }).id;
      story.day(s,t); const closed = JSON.stringify(t); story.day(s,t);
      return { phase:t.phase, originalActor:t.actorId === actor, once:closed === JSON.stringify(t), money:s.player.gold === gold };
    }, boundary)).toEqual({ phase:boundary === 'window' ? 'window_closed' : 'personal_ended', originalActor:true, once:true, money:true });
  });
}

test('unrelated starts attach no soldier story and a missing optional record stays missing on restore', async function ({ page }, info) {
  await beginBookmark(page, info, '711', 'toledo_household_711');
  expect(await page.evaluate(function () { return !!FB.state.stories.crossing_soldier_track_711; })).toBe(false);
  await page.reload();
  await begin(page, info);
  expect(await page.evaluate(function () {
    const saved = JSON.parse(FB.save.serialize()); delete saved.state.stories.crossing_soldier_track_711;
    FB.save.restore(saved); FB.stories.day(FB.state);
    return !!FB.state.stories.crossing_soldier_track_711;
  })).toBe(false);
});

test('another date keeps its ordinary open start without the soldier track or its dated journey', async function ({ page }, info) {
  await beginBookmark(page, info, '867', 'soldier');
  expect(await page.evaluate(function () {
    const s = FB.state;
    return { track:!!(s.stories && s.stories.crossing_soldier_track_711),
      destination:FB.travelSiteSnapshot(s,'soldier_malaga_711') };
  })).toEqual({ track:false, destination:null });
});
