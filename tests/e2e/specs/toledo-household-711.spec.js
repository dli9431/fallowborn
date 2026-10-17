'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['index.html','data/story_households_711.js','data/story_instances.js',
  'data/starts.js','data/bookmark_711.js','data/bookmark_711_terrain.js','data/government_rollout.js',
  'data/technology.js','data/travel.js','data/events_travel.js','data/story_campaigns_711.js',
  'js/story_household.js','js/stories.js','js/starts.js','js/bookmark_setup.js','js/story_campaign.js',
  'js/story_polity_foundation.js','js/actions.js','js/travel.js','js/events.js','js/main.js',
  'js/world.js','js/model.js','js/modifiers.js','js/save.js','js/save_v4.js','js/i18n.js',
  'js/ui_misc.js','js/ui_panels.js','js/authority.js','js/lordships.js']);
const ID = 'toledo_household_track_711';

async function conquer(page) {
  await page.evaluate(function () {
    const s = FB.state;
    FB.transferProvince(s, 'toledo', 'umayyad_711');
    FB.stories.get('toledo_household_track_711').day(s, s.stories.toledo_household_track_711);
  });
}

test('Toledo attaches its track on retained and fresh worlds without changing campaign windows', async function ({ page }, info) {
  await openGame(page, info);
  expect(await page.evaluate(function () {
    const sc = FBDATA.startScenarios.find(function (r) { return r.id === 'toledo_household_711'; });
    return { tracks:FB.startTracks(sc, 'toledo'), away:FB.startTracks(sc, 'london'),
      revisions:['baseline','governments_v2','terrain_v2','terrain_v2_governments_v2'].map(function (revision) {
        return FB.validateBookmark(FB.bookmark('711', revision));
      }), windows:['strait_crossing_711','toledo_campaign_711','asturias_foundation_711'].map(function (id) {
        var d = FBDATA.storyInstances[id]; return [d.firstYear,d.lastYear];
      }), unrelated:FBDATA.startScenarios.filter(function (r) { return r.id !== sc.id && (r.tracks || []).indexOf('toledo_household_track_711') >= 0; }).length };
  })).toEqual({ tracks:[ID], away:[], revisions:[[],[],[],[]], windows:[[711,714],[714,718],[718,730]], unrelated:0 });
  await beginBookmark(page, info, '711', 'toledo_household_711');
  expect(await page.evaluate(function () { return {
    phase:FB.state.stories.toledo_household_track_711.phase,
    owner:FB.topRealm(FB.state, FB.state.owner.toledo),
    asturias:!!FB.state.realms.asturias_711,
    household:FB.state.stories.toledo_household_track_711.householdId === FB.state.player.charId
  }; })).toEqual({ phase:'waiting', owner:'visigoths_711', asturias:false, household:true });
});

test('a failed crossing closes quietly and started news does not invent court departures', async function ({ page }, info) {
  await beginBookmark(page, info, '711', 'toledo_household_711');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'toledo_household_track_711', module = FB.stories.get(id), original = JSON.parse(JSON.stringify(s.stories[id]));
    const source = s.stories.strait_crossing_711, money = s.player.gold, owners = JSON.stringify(s.owner);
    source.phase = 'resolved'; source.result = 'failed'; source.outcomeTurn = s.turn;
    module.day(s, s.stories[id]); const quiet = s.stories[id].phase;
    s.stories[id] = original; source.phase = 'started'; source.result = null; source.startedTurn = s.turn; source.outcomeTurn = null;
    module.day(s, original); const news = original.phase;
    const q = FB.stories.quote(s, id, 'prepare');
    const pure = !Object.keys(original.householdReceipts).length;
    const prepared = FB.stories.apply(s, id, 'prepare', q);
    module.day(s, original);
    return { quiet:quiet, news:news, pure:pure, prepared:prepared,
      next:original.phase, money:money === s.player.gold, owners:owners === JSON.stringify(s.owner),
      receipts:Object.keys(original.householdReceipts).length };
  })).toMatchObject({ quiet:'quiet', news:'news', pure:true, prepared:true, money:true, owners:true, receipts:1 });
});

test('actual ordinary conquest offers the stay branch without changing world-story outcomes or adding taxes', async function ({ page }, info) {
  await beginBookmark(page, info, '711', 'toledo_household_711');
  await conquer(page);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'toledo_household_track_711', t = s.stories[id];
    const source = JSON.stringify([s.stories.strait_crossing_711,s.stories.toledo_campaign_711,s.stories.asturias_foundation_711]);
    const before = JSON.stringify([s.player.gold,s.player.piety,s.player.prestige,s.owner,s.holder,s.chars[s.player.charId].religion]);
    const opening = t.phase;
    function choose(choice) { return FB.stories.apply(s, id, choice, FB.stories.quote(s, id, choice)); }
    const stayed = choose('stay'), finished = choose('resume'), record = JSON.stringify(t);
    const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
    return { opening:opening, stayed:stayed, finished:finished, phase:FB.state.stories[id].phase,
      money:before === JSON.stringify([FB.state.player.gold,FB.state.player.piety,FB.state.player.prestige,FB.state.owner,FB.state.holder,FB.state.chars[FB.state.player.charId].religion]),
      sources:source === JSON.stringify([FB.state.stories.strait_crossing_711,FB.state.stories.toledo_campaign_711,FB.state.stories.asturias_foundation_711]),
      retained:record === JSON.stringify(FB.state.stories[id]), receipts:Object.keys(FB.state.stories[id].householdReceipts).length };
  })).toEqual({ opening:'changed_rule', stayed:true, finished:true, phase:'stayed', money:true, sources:true, retained:true, receipts:1 });
});

test('wartime court business and the later Toledo campaign remain separate household beats', async function ({ page }, info) {
  await beginBookmark(page, info, '711', 'toledo_household_711');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'toledo_household_track_711', module = FB.stories.get(id), t = s.stories[id];
    const money = s.player.gold, owner = s.owner.toledo;
    const war = FB.registerOrdinaryWar(s, 'umayyad_711', { enemy:'visigoths_711', target:'malaga',
      legacy:false, casus:{ type:'border', target:'malaga' }, objectives:[{ type:'border', target:'malaga' }] });
    s.stories.strait_crossing_711.phase = 'started'; s.stories.strait_crossing_711.startedTurn = s.turn;
    module.day(s, t);
    const news = t.phase;
    function choose(c) { return FB.stories.apply(s, id, c, FB.stories.quote(s, id, c)); }
    const work = choose('continue_work'); module.day(s, t);
    const perspective = t.phase, deferred = choose('wait'); module.day(s, t);
    const court = t.phase, followed = choose('seek_news');
    s.date.year = 715; s.turn = 1440; s.stories.toledo_campaign_711.phase = 'started';
    module.day(s, t); const approach = t.phase, remain = choose('remain');
    s.stories.toledo_campaign_711.phase = 'resolved'; s.stories.toledo_campaign_711.result = 'failed';
    module.day(s, t);
    return { war:!!war, news:news, work:work, perspective:perspective, deferred:deferred, court:court, followed:followed, approach:approach, remain:remain,
      final:t.phase, money:money === s.player.gold, owner:owner === s.owner.toledo };
  })).toEqual({ war:true, news:'news', work:true, perspective:'roman_roots', deferred:true, court:'court', followed:true, approach:'approach', remain:true,
    final:'quiet', money:true, owner:true });
});

for (const scope of ['self','household']) {
  test('Toledo ' + scope + ' conversion uses the ordinary costs and preserves scope across restore', async function ({ page }, info) {
    await beginBookmark(page, info, '711', 'toledo_household_711'); await conquer(page);
    const result = await page.evaluate(function (scope) {
      const s = FB.state, id = 'toledo_household_track_711', faith = 'umayyad_sunni_711';
      FB.stories.apply(s, id, 'consider_conversion', FB.stories.quote(s, id, 'consider_conversion'));
      const choice = scope === 'self' ? 'convert_self' : 'convert_household';
      const poor = FB.stories.quote(s, id, choice).allowed;
      const failed = FB.stories.apply(s, id, choice, FB.stories.quote(s, id, choice));
      s.player.piety = 1000; s.player.prestige = 1000;
      s.player.encounteredFaiths = Object.assign({}, s.player.encounteredFaiths); s.player.encounteredFaiths[faith] = 1;
      const ordinary = FB.conversionStatus(s, 'faith', faith, scope), q = FB.stories.quote(s, id, choice);
      const family = FB.householdMembers(s).map(function (c) { return [c.id,c.religion,c.culture]; });
      const before = [s.player.piety,s.player.prestige], applied = FB.stories.apply(s, id, choice, q);
      const rec = JSON.stringify(s.stories[id]), after = [s.player.piety,s.player.prestige];
      const identity = s.chars[s.player.charId].religion;
      const scopeKept = family.every(function (row) {
        var c = s.chars[row[0]];
        return c.culture === row[2] && c.religion === (scope === 'household' || c.id === s.player.charId ? faith : row[1]);
      });
      const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
      return { poor:poor, failed:failed, ordinary:ordinary.ok, applied:applied, identity:identity, scopeKept:scopeKept,
        charged:[before[0]-after[0],before[1]-after[1]], costs:[ordinary.pietyCost,ordinary.prestigeCost],
        retained:rec === JSON.stringify(FB.state.stories[id]), repeated:FB.stories.apply(FB.state, id, choice, q),
        noReplay:after[0] === FB.state.player.piety && after[1] === FB.state.player.prestige };
    }, scope);
    expect(result.charged).toEqual(result.costs);
    expect(result).toMatchObject({ poor:false, failed:false, ordinary:true, applied:true, identity:'umayyad_sunni_711', scopeKept:true,
      retained:true, repeated:false, noReplay:true });
  });
}

test('a stale conversion review and cancellation preserve identity and resources', async function ({ page }, info) {
  await beginBookmark(page, info, '711', 'toledo_household_711'); await conquer(page);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'toledo_household_track_711';
    FB.stories.apply(s, id, 'consider_conversion', FB.stories.quote(s, id, 'consider_conversion'));
    s.player.piety = 1000; s.player.prestige = 1000; s.player.encounteredFaiths = { umayyad_sunni_711:1 };
    const q = FB.stories.quote(s, id, 'convert_household');
    s.player.piety--;
    const before = JSON.stringify([s.player.piety,s.player.prestige,FB.householdMembers(s)]);
    const stale = FB.stories.apply(s, id, 'convert_household', q);
    const cancelled = FB.stories.apply(s, id, 'keep_faith', FB.stories.quote(s, id, 'keep_faith'));
    return { reviewed:q.allowed, stale:stale, cancelled:cancelled, preserved:before === JSON.stringify([s.player.piety,s.player.prestige,FB.householdMembers(s)]), phase:s.stories[id].phase };
  })).toEqual({ reviewed:true, stale:false, cancelled:true, preserved:true, phase:'stay' });
});

test('a reviewed northern journey separates personal arrival from later household settlement', async function ({ page }, info) {
  await beginBookmark(page, info, '711', 'toledo_household_711'); await conquer(page);
  const result = await page.evaluate(function () {
    let s = FB.state; const id = 'toledo_household_track_711';
    function choose(c) { return FB.stories.apply(s, id, c, FB.stories.quote(s, id, c)); }
    choose('leave'); s.player.gold = 0;
    const poor = FB.stories.quote(s, id, 'go_ahead').allowed;
    s.player.gold = 1000;
    const q = FB.stories.quote(s, id, 'go_ahead'), gold = s.player.gold;
    const kin = FB.householdMembers(s).filter(function (c) { return c.id !== s.player.charId; }).map(function (c) { return [c.id,c.homeProvinceId]; });
    const begun = FB.stories.apply(s, id, 'go_ahead', q);
    const charged = gold - s.player.gold, price = q.facts.terms.cost;
    const start = JSON.parse(FB.save.serialize()); FB.save.restore(start); s = FB.state;
    const noRestart = s.player.gold === gold - price && s.player.travel.startTurn === start.state.player.travel.startTurn;
    // Only the journey owner advances. Bound the actual route to one season.
    for (var day = 0; day < 90 && s.player.travel && s.player.travel.phase === 'outbound'; day++) { s.turn++; FB.travelTick(s); }
    FB.stories.get(id).day(s, s.stories[id]);
    const arrival = s.stories[id].phase, home = s.player.provinceId;
    const kinStayed = kin.every(function (row) { return s.chars[row[0]].homeProvinceId === row[1]; });
    const tooSoon = FB.stories.quote(s, id, 'settle').allowed;
    const noAsturias = !s.realms.asturias_711;
    FB.travelCapstoneDone(s);
    // Stage the ordinary residence/work boundary without simulating a year.
    s.turn += 360; s.date.year++;
    s.player.travel.workEvents = 4;
    const settled = choose('settle'), rec = JSON.stringify(s.stories[id]);
    const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved); s = FB.state;
    return { poor:poor, begun:begun, charged:charged, price:price, noRestart:noRestart, arrival:arrival, home:home,
      kinStayed:kinStayed, tooSoon:tooSoon, noAsturias:noAsturias, settled:settled,
      destination:s.player.provinceId, travel:s.player.travel, phase:s.stories[id].phase,
      retained:rec === JSON.stringify(s.stories[id]) };
  });
  expect(result.charged).toBe(result.price);
  expect(result).toMatchObject({ poor:false, begun:true, noRestart:true, arrival:'northern', home:'toledo', kinStayed:true,
    tooSoon:false, noAsturias:true, settled:true, destination:'oviedo', travel:null, phase:'settled', retained:true });
});

test('unavailable and interrupted refuge attempts do not certify arrival', async function ({ page }, info) {
  await beginBookmark(page, info, '711', 'toledo_household_711'); await conquer(page);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'toledo_household_track_711';
    function choose(c) { return FB.stories.apply(s, id, c, FB.stories.quote(s, id, c)); }
    choose('leave'); s.player.gold = 1000;
    const adjacency = FB.world.adj.toledo; FB.world.adj.toledo = {};
    const unreachable = FB.stories.quote(s, id, 'go_ahead').allowed;
    FB.world.adj.toledo = adjacency; s.player.flags.in_prison = 1;
    const captive = FB.stories.quote(s, id, 'go_ahead').allowed;
    delete s.player.flags.in_prison;
    const q = FB.stories.quote(s, id, 'go_ahead'); s.player.gold++;
    const before = s.player.gold, stale = FB.stories.apply(s, id, 'go_ahead', q);
    const unchanged = s.player.gold === before && !s.player.travel;
    const started = choose('go_ahead'); FB.travelCancel(s);
    FB.stories.get(id).day(s, s.stories[id]);
    return { unreachable:unreachable, captive:captive, stale:stale, unchanged:unchanged, started:started, phase:s.stories[id].phase, home:s.player.provinceId };
  })).toEqual({ unreachable:false, captive:false, stale:false, unchanged:true, started:true, phase:'interrupted_journey', home:'toledo' });
});

test('third-party rule and absence close local decisions without costs or conversion', async function ({ page }, info) {
  await beginBookmark(page, info, '711', 'toledo_household_711');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'toledo_household_track_711', module = FB.stories.get(id);
    const original = JSON.parse(JSON.stringify(s.stories[id])), faith = s.chars[s.player.charId].religion;
    FB.transferProvince(s, 'toledo', 'achila_711'); module.day(s, s.stories[id]);
    const other = s.stories[id].phase;
    FB.transferProvince(s, 'toledo', 'visigoths_711'); s.stories[id] = original;
    s.player.gold = 1000;
    const start = FB.travelStart(s, 'toledo_refuge_711', 'oviedo');
    for (var day = 0; day < 30 && s.player.travel.currentId === 'toledo'; day++) { s.turn++; FB.travelTick(s); }
    module.day(s, original);
    const remote = original.phase;
    FB.transferProvince(s, 'toledo', 'umayyad_711'); module.day(s, original);
    return { other:other, start:start, remote:remote, stillRemote:original.phase,
      localChoices:FB.stories.choices(s, id).length, faith:faith === s.chars[s.player.charId].religion };
  })).toEqual({ other:'other_rule', start:true, remote:'remote', stillRemote:'remote', localChoices:0, faith:true });
});

test('Toledo choices use the shared review, cancel and focus return', async function ({ page }, info) {
  await beginBookmark(page, info, '711', 'toledo_household_711'); await conquer(page);
  await page.locator('[data-tab="actions"]').click();
  await page.evaluate(function () { FB.ui.refresh(); });
  const card = page.locator('[data-story-card="' + ID + '"]');
  await card.click();
  await page.locator('[data-story-choice="consider_conversion"]').click();
  await expect(page.locator('#gm-story-confirm')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-story-choice="stay"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card).toBeFocused();
  expect(await page.evaluate(function () { return FB.state.stories.toledo_household_track_711.phase; })).toBe('changed_rule');
});
