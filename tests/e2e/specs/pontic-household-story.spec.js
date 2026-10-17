'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['index.html','data/story_households_pontic_476.js','data/story_instances.js',
  'data/mobile_confederations.js','data/bookmark_476.js','data/bookmark_476_wider.js',
  'data/bookmark_476_wider_identities.js','data/communal_revisions.js','data/government_rollout.js',
  'data/starts.js','data/technology.js','data/travel.js','data/events_travel.js','js/story_household.js',
  'js/stories.js','js/starts.js','js/bookmark_setup.js','js/mobile_confederations.js','js/federates.js',
  'js/government_selection.js','js/governments.js','js/authority.js','js/treasury.js','js/market.js',
  'js/population.js','js/armies.js','js/travel.js','js/model.js','js/world.js','js/main.js','js/i18n.js',
  'js/save.js','js/save_v4.js','js/ui_misc.js','js/ui_panels.js']);

const ID = 'pontic_household_track_476';

async function waiting(page, info) {
  await beginBookmark(page, info, '476', 'mobile_household_476');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'pontic_household_track_476';
    return ['keep_farming','watch'].every(function (choice) {
      return FB.stories.apply(s, id, choice, FB.stories.quote(s, id, choice));
    });
  })).toBe(true);
}

async function road(page, info) {
  await waiting(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'pontic_household_track_476', rid = 'pontic_following_476';
    // Stage the field host's arrival, then let its ordinary owner move the civilian court.
    const host = FB.mobile.host(s, rid);
    host.at = 'tomis'; host.from = 'tomis'; host.path = []; host.goal = null; host.moveLeft = 0; host.mobileCourt = true;
    FB.federateDay(s);
    FB.stories.get(id).day(s, s.stories[id]);
    const departed = s.stories[id].phase === 'departure';
    const planned = FB.stories.apply(s, id, 'seek_camp', FB.stories.quote(s, id, 'seek_camp'));
    s.player.gold = 1000;
    return departed && planned && s.stories[id].phase === 'road_review' && FB.mobile.migration(s, rid).at === 'tomis';
  })).toBe(true);
}

async function arrive(page) {
  return page.evaluate(function () {
    const s = FB.state;
    // Only the actual journey owner ticks, for at most one season.
    for (let day = 0; day < 90 && s.player.travel && s.player.travel.phase === 'outbound'; day++) { s.turn++; FB.travelTick(s); }
    FB.stories.get('pontic_household_track_476').day(s, s.stories.pontic_household_track_476);
    return s.stories.pontic_household_track_476.phase;
  });
}

test('only the Pontic opening at Cherson attaches the household track across its offered revisions', async function ({ page }, info) {
  await openGame(page, info);
  const result = await page.evaluate(function () {
    const sc = FBDATA.startScenarios.find(function (r) { return r.id === 'mobile_household_476'; });
    const bm = FBDATA.bookmarks['476'];
    return { here:FB.startTracks(sc, 'cherson'), elsewhere:FB.startTracks(sc, 'tomis'),
      unrelated:FBDATA.startScenarios.filter(function (r) { return r.id !== sc.id && (r.tracks || []).indexOf('pontic_household_track_476') >= 0; }).length,
      resources:[sc.tier,sc.profession,sc.gold,sc.prestige,sc.piety,sc.startEffects.landPlots,sc.startCulture,sc.startReligion],
      revisions:Object.keys(bm.revisions).filter(function (revision) {
        const world = FB.bookmark('476', revision);
        return (!world.starts || world.starts.indexOf(sc.id) >= 0) && FB.startProvinceAllowed(sc, world, 'cherson');
      }).map(function (revision) { return FB.validateBookmark(FB.bookmark('476', revision)); }) };
  });
  expect(result).toMatchObject({ here:[ID], elsewhere:[], unrelated:0,
    resources:[1,'farmer',20,5,0,1,'greek','chalcedonian'] });
  expect(result.revisions.length).toBeGreaterThan(1); expect(result.revisions.every(function (r) { return r.length === 0; })).toBe(true);
  await beginBookmark(page, info, '476', 'mobile_household_476');
  expect(await page.evaluate(function () { return FB.state.stories.pontic_household_track_476.phase; })).toBe('opening');
});

test('a sixteen-year-old independent worker is paid once without acquiring leadership or membership', async function ({ page }, info) {
  await beginBookmark(page, info, '476', 'mobile_household_476');
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'pontic_household_track_476', rid = 'pontic_following_476', actor = { kind:'character', id:s.player.charId };
    s.chars[s.player.charId].born = s.date.year - 16;
    const owners = JSON.stringify([s.owner,s.holder]), identity = [s.chars[actor.id].culture,s.chars[actor.id].religion];
    function choose(c) { return FB.stories.apply(s, id, c, FB.stories.quote(s, id, c)); }
    const asked = choose('seek_work'), q = FB.stories.quote(s, id, 'work');
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.stories.cards(s); FB.stories.get(id).review(s, s.stories[id], 'work', q);
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const gold = s.player.gold, food = FB.mobile.row(s, rid).food, funds = FB.treasuryAvailable(s, rid);
    const paid = FB.stories.apply(s, id, 'work', q), repeated = FB.stories.apply(s, id, 'work', q);
    const again = FB.stories.quote(s, id, 'another_service').allowed;
    const trader = FB.mobile.review(s, { realmId:rid, action:'trade', terms:{countyId:'cherson',count:1,direction:'sell'}, actor:actor }).review.allowed;
    const member = FB.mobile.members(s, rid).some(function (m) { return m.principal.id === actor.id; });
    const finished = choose('finish');
    return { asked:asked, pure:pure, paid:paid, repeated:repeated, again:again, trader:trader, member:member,
      deltas:[s.player.gold-gold,funds-FB.treasuryAvailable(s, rid),food-FB.mobile.row(s, rid).food],
      identity:identity[0] === s.chars[actor.id].culture && identity[1] === s.chars[actor.id].religion,
      owners:owners === JSON.stringify([s.owner,s.holder]), finished:finished, phase:s.stories[id].phase };
  });
  expect(result).toMatchObject({ asked:true, pure:true, paid:true, repeated:false, again:false, trader:false, member:false,
    identity:true, owners:true, finished:true, phase:'rooted_household' });
  expect(result.deltas[0]).toBeCloseTo(0.2); expect(result.deltas[1]).toBeCloseTo(0.2); expect(result.deltas[2]).toBe(1);
});

test('missing camp food, empty treasury and a stale review leave the farm exit available', async function ({ page }, info) {
  await beginBookmark(page, info, '476', 'mobile_household_476');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'pontic_household_track_476', rid = 'pontic_following_476', r = FB.mobile.row(s, rid);
    function choose(c) { return FB.stories.apply(s, id, c, FB.stories.quote(s, id, c)); }
    choose('seek_work'); const q = FB.stories.quote(s, id, 'work'), food = r.food, gold = s.player.gold;
    r.food = 0;
    const stale = FB.stories.apply(s, id, 'work', q), noFood = FB.stories.quote(s, id, 'work').allowed;
    r.food = food; FB.treasurySpend(s, rid, FB.treasuryAvailable(s, rid));
    const noFunds = FB.stories.quote(s, id, 'work').allowed;
    const refused = choose('decline'), ended = choose('finish');
    return { stale:stale, noFood:noFood, noFunds:noFunds, refused:refused, ended:ended,
      noPay:s.player.gold === gold && r.food === food, home:s.player.provinceId, phase:s.stories[id].phase };
  })).toEqual({ stale:false, noFood:false, noFunds:false, refused:true, ended:true, noPay:true, home:'cherson', phase:'rooted_household' });
});

test('live scarcity and the campaign-season boundary do not restart after intermediate decisions', async function ({ page }, info) {
  await beginBookmark(page, info, '476', 'mobile_household_476');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'pontic_household_track_476', t = s.stories[id], module = FB.stories.get(id), gold = s.player.gold;
    function choose(c) { return FB.stories.apply(s, id, c, FB.stories.quote(s, id, c)); }
    choose('keep_farming'); FB.mobile.row(s, 'pontic_following_476').food = 0;
    module.day(s, t); const scarcity = t.phase;
    s.turn = 89; choose('watch'); const entered = t.stageTurn;
    s.turn = 90; const expiredQuote = FB.stories.quote(s, id, 'finish').allowed;
    module.season(s, t); const boundary = t.phase;
    const continued = choose('local_work'), record = JSON.stringify(t);
    const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
    FB.stories.get(id).day(FB.state, FB.state.stories[id]);
    return { scarcity:scarcity, entered:entered, expiredQuote:expiredQuote, boundary:boundary, continued:continued,
      phase:FB.state.stories[id].phase, retained:record === JSON.stringify(FB.state.stories[id]), noPay:gold === FB.state.player.gold };
  })).toEqual({ scarcity:'scarce', entered:89, expiredQuote:false, boundary:'stationary', continued:true, phase:'continued_local', retained:true, noPay:true });
});

test('a field-host march leaves the household waiting, while court carriage opens departure', async function ({ page }, info) {
  await waiting(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'pontic_household_track_476', rid = 'pontic_following_476', host = FB.mobile.host(s, rid), module = FB.stories.get(id);
    host.path = ['tomis']; host.moveLeft = 1; host.mobileCourt = false;
    module.day(s, s.stories[id]); const field = s.stories[id].phase;
    host.mobileCourt = true;
    const obsolete = FB.stories.quote(s, id, 'finish').allowed;
    module.day(s, s.stories[id]);
    const home = s.player.provinceId, before = s.player.gold;
    const stayed = FB.stories.apply(s, id, 'stay', FB.stories.quote(s, id, 'stay'));
    return { field:field, obsolete:obsolete, stayed:stayed, phase:s.stories[id].phase,
      court:FB.mobile.migration(s, rid).at, home:home === s.player.provinceId, money:before === s.player.gold };
  })).toEqual({ field:'waiting', obsolete:false, stayed:true, phase:'rooted_household', court:'cherson', home:true, money:true });
});

test('the actual journey reaches the camp before work and restores without family relocation or repayment', async function ({ page }, info) {
  await road(page, info);
  const started = await page.evaluate(function () {
    let s = FB.state; const id = 'pontic_household_track_476';
    const q = FB.stories.quote(s, id, 'go'), before = s.player.gold;
    const kin = FB.householdMembers(s).filter(function (c) { return c.id !== s.player.charId; }).map(function (c) { return [c.id,c.homeProvinceId]; });
    const begun = FB.stories.apply(s, id, 'go', q), price = before - s.player.gold;
    const travel = JSON.stringify(s.player.travel), record = JSON.stringify(s.stories[id]);
    const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved); s = FB.state;
    return { begun:begun, price:price, quote:q.facts.terms.cost, noRestart:travel === JSON.stringify(s.player.travel),
      retained:record === JSON.stringify(s.stories[id]), home:s.player.provinceId,
      kin:kin.every(function (row) { return s.chars[row[0]].homeProvinceId === row[1]; }) };
  });
  expect(started).toMatchObject({ begun:true, noRestart:true, retained:true, home:'cherson', kin:true }); expect(started.price).toBeCloseTo(started.quote);
  expect(await arrive(page)).toBe('camp_work');
  const paid = await page.evaluate(function () {
    let s = FB.state; const id = 'pontic_household_track_476', before = s.player.gold;
    const q = FB.stories.quote(s, id, 'work'), applied = FB.stories.apply(s, id, 'work', q), gold = s.player.gold;
    const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved); s = FB.state;
    return { applied:applied, delta:gold-before, phase:s.stories[id].phase, home:s.player.provinceId,
      location:s.player.travel.currentId, noReplay:gold === s.player.gold, repeated:FB.stories.apply(s, id, 'work', q) };
  });
  expect(paid).toMatchObject({ applied:true, phase:'road_worker', home:'cherson', location:'tomis', noReplay:true, repeated:false }); expect(paid.delta).toBeCloseTo(0.2);
});

test('stale, blocked and moving-camp travel reviews start no journey', async function ({ page }, info) {
  await road(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'pontic_household_track_476', rid = 'pontic_following_476', gold = s.player.gold;
    const q = FB.stories.quote(s, id, 'go'); FB.mobile.row(s, rid).food--;
    const stale = FB.stories.apply(s, id, 'go', q);
    const adj = FB.world.adj.cherson; FB.world.adj.cherson = {};
    const unreachable = FB.stories.quote(s, id, 'go').allowed; FB.world.adj.cherson = adj;
    const host = FB.mobile.host(s, rid); host.mobileCourt = true; host.path = ['constantinople']; host.moveLeft = 1;
    const moving = FB.stories.quote(s, id, 'go').allowed;
    host.path = []; host.moveLeft = 0; s.player.flags.in_prison = 1;
    const captive = FB.stories.quote(s, id, 'go').allowed; delete s.player.flags.in_prison;
    const stopped = FB.stories.apply(s, id, 'stop', FB.stories.quote(s, id, 'stop'));
    return { stale:stale, unreachable:unreachable, moving:moving, captive:captive, stopped:stopped,
      preserved:gold === s.player.gold && !s.player.travel, phase:s.stories[id].phase };
  })).toEqual({ stale:false, unreachable:false, moving:false, captive:false, stopped:true, preserved:true, phase:'ended_service' });
});

test('camp movement after arrival allows an ordinary return and records completion only at home', async function ({ page }, info) {
  await road(page, info);
  await page.evaluate(function () { const s = FB.state, id = 'pontic_household_track_476'; FB.stories.apply(s, id, 'go', FB.stories.quote(s, id, 'go')); });
  expect(await page.evaluate(function () {
    const s = FB.state, t = s.player.travel;
    // Stage the arrival boundary for this return-focused test.
    t.currentId = t.destinationId; t.remainingRoute = []; s.turn++; FB.travelTick(s);
    FB.stories.get('pontic_household_track_476').day(s, s.stories.pontic_household_track_476);
    FB.travelCapstoneDone(s);
    return s.stories.pontic_household_track_476.phase;
  })).toBe('camp_work');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'pontic_household_track_476', module = FB.stories.get(id), host = FB.mobile.host(s, 'pontic_following_476');
    const early = FB.stories.quote(s, id, 'return').allowed;
    host.at = 'constantinople'; host.mobileCourt = true; FB.federateDay(s);
    module.day(s, s.stories[id]); const lost = s.stories[id].phase;
    // Stage minimum residence directly; do not simulate a season of ordinary life.
    s.turn = s.player.travel.stayStartTurn + 90;
    const returned = FB.stories.apply(s, id, 'return', FB.stories.quote(s, id, 'return'));
    module.day(s, s.stories[id]); const inFlight = s.stories[id].phase;
    for (let day = 0; day < 89 && s.player.travel; day++) { s.turn++; FB.travelTick(s); }
    module.day(s, s.stories[id]);
    return { early:early, lost:lost, returned:returned, inFlight:inFlight, phase:s.stories[id].phase,
      home:s.player.provinceId, journey:s.player.travel };
  })).toEqual({ early:false, lost:'lost_contact', returned:true, inFlight:'returning', phase:'returned_household', home:'cherson', journey:null });
});

test('actual dispersal closes the connection once without recreating people or payment', async function ({ page }, info) {
  await waiting(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'pontic_household_track_476', rid = 'pontic_following_476', module = FB.stories.get(id), gold = s.player.gold;
    FB.markRealmDead(s, rid);
    module.day(s, s.stories[id]); const record = JSON.stringify(s.stories[id]); module.season(s, s.stories[id]);
    return { phase:s.stories[id].phase, once:record === JSON.stringify(s.stories[id]), money:gold === s.player.gold,
      population:FB.mobile.total(s, rid), active:FB.mobile.householdSnapshot(s, rid).active };
  })).toEqual({ phase:'ended_service', once:true, money:true, population:0, active:false });
});

test('canonical settlement ends camp work without paying or granting land to the independent household', async function ({ page }, info) {
  await waiting(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'pontic_household_track_476', rid = 'pontic_following_476', M = FB.mobile, gold = s.player.gold;
    FB.transferProvince(s, 'cherson', rid);
    const people = s.population.counties.cherson.count + M.total(s, rid);
    const terms = { countyId:'cherson', count:M.total(s, rid), final:true };
    function act(action, terms, actor) {
      return M.commit(s, M.review(s, { realmId:rid, action:action, terms:terms, actor:actor || { kind:'realm', id:rid } }));
    }
    const proposed = act('propose', { operation:'settle', proposal:terms });
    const assented = M.members(s, rid).every(function (m) { return act('assent', { assent:true }, m.principal); });
    const settled = act('settle', terms);
    FB.stories.get(id).day(s, s.stories[id]);
    const record = JSON.stringify(s.stories[id]), saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
    return { proposed:proposed, assented:assented, settled:settled, phase:FB.state.stories[id].phase,
      retained:record === JSON.stringify(FB.state.stories[id]), money:gold === FB.state.player.gold,
      people:people === FB.state.population.counties.cherson.count + M.total(FB.state, rid),
      status:M.row(FB.state, rid).status, home:FB.state.player.provinceId };
  })).toEqual({ proposed:true, assented:true, settled:true, phase:'ended_service', retained:true, money:true, people:true, status:'settled', home:'cherson' });
});

test('work review cancellation and Escape retain the shared story sheet and Deeds focus', async function ({ page }, info) {
  await beginBookmark(page, info, '476', 'mobile_household_476');
  await page.evaluate(function () {
    const s = FB.state, id = 'pontic_household_track_476'; FB.stories.apply(s, id, 'seek_work', FB.stories.quote(s, id, 'seek_work')); FB.ui.refresh();
  });
  await page.locator('[data-tab="actions"]').click();
  const card = page.locator('[data-story-card="' + ID + '"]');
  await card.click(); await page.locator('[data-story-choice="work"]').click();
  await expect(page.locator('#gm-story-confirm')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.locator('[data-story-choice="decline"]')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(card).toBeFocused();
  expect(await page.evaluate(function () { return FB.state.stories.pontic_household_track_476.phase; })).toBe('work_offer');
});
