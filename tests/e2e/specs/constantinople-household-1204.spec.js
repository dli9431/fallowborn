'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['index.html','data/starts.js','data/story_households_1204.js',
  'data/bookmark_1204.js','data/bookmark_1204_campaigns.js','data/bookmark_1204_terrain.js',
  'data/christian_rollout.js','data/communal_revisions.js','data/religious_institutions.js',
  'data/actions.js','data/technology.js','data/travel.js','data/events_travel.js',
  'js/story_household.js','js/stories.js','js/starts.js','js/story_campaign.js','js/story_history.js',
  'js/actions.js','js/travel.js','js/events.js','js/main.js','js/world.js','js/model.js',
  'js/government_civic.js','js/civic_transactions.js','js/religious_institutions.js',
  'js/save.js','js/save_v4.js','js/i18n.js','js/ui_misc.js','js/ui_panels.js']);

const ID = 'constantinople_household_track_1204';

async function patron(page) {
  await page.evaluate(function () {
    const s = FB.state, id = 'constantinople_household_track_1204';
    function choose(c) { return FB.stories.apply(s, id, c, FB.stories.quote(s, id, c)); }
    if (!choose('recover') || !choose('earn_first') || !choose('unchanged')) throw new Error('Could not review customers.');
  });
}

test('Constantinople attaches only at its start and validates every offered revision', async function ({ page }, info) {
  await openGame(page, info);
  expect(await page.evaluate(function () {
    const sc = FBDATA.startScenarios.find(function (r) { return r.id === 'constantinople_household_1204'; });
    const bm = FBDATA.bookmarks['1204'];
    const revisions = Object.keys(bm.revisions).filter(function (revision) {
      const b = FB.bookmark('1204', revision);
      return !b.starts || b.starts.indexOf(sc.id) >= 0;
    });
    return { tracks:FB.startTracks(sc, 'constantinople'), away:FB.startTracks(sc, 'nicaea'),
      valid:revisions.length > 1 && revisions.every(function (r) { return FB.validateBookmark(FB.bookmark('1204', r)).length === 0; }),
      elsewhere:FBDATA.startScenarios.filter(function (r) { return r.id !== sc.id && (r.tracks || []).indexOf('constantinople_household_track_1204') >= 0; }).length };
  })).toEqual({ tracks:[ID], away:[], valid:true, elsewhere:0 });
  await beginBookmark(page, info, '1204', 'constantinople_household_1204');
  expect(await page.evaluate(function () {
    const s = FB.state;
    return { phase:s.stories.constantinople_household_track_1204.phase, gold:s.player.gold,
      faith:s.chars[s.player.charId].religion, culture:s.chars[s.player.charId].culture,
      home:s.player.provinceId, profession:s.player.profession,
      world:s.stories.latin_bithynia_1204.phase };
  })).toMatchObject({ phase:'inventory', gold:15, faith:'orthodox', culture:'greek', home:'constantinople', profession:'craftsman' });
});

for (const outcome of ['stay','serve']) {
  test('Constantinople ' + outcome + ' requires actual ordinary work and preserves faith through restore', async function ({ page }, info) {
    await beginBookmark(page, info, '1204', 'constantinople_household_1204');
    expect(await page.evaluate(function (outcome) {
      let s = FB.state;
      const id = 'constantinople_household_track_1204';
      function choose(c) { return FB.stories.apply(s, id, c, FB.stories.quote(s, id, c)); }
      const faiths = FB.householdMembers(s).map(function (c) { return [c.id,c.religion]; });
      const world = JSON.stringify([s.stories.latin_bithynia_1204,s.stories.nicaean_return_1204]);
      choose('recover');
      const initial = s.player.gold, supplies = choose('buy_supplies'), spent = initial - s.player.gold;
      const repeat = choose('buy_supplies');
      choose('latin_information');
      const before = s.player.gold, selected = choose(outcome === 'stay' ? 'local_work' : 'latin_work');
      const noWage = before === s.player.gold;
      FB.stories.get(id).day(s, s.stories[id]);
      const premature = choose(outcome);
      FB.tickFocus(s);
      const earned = s.player.gold > before, ready = s.stories[id].phase;
      const funds = s.player.gold, finished = choose(outcome), phase = s.stories[id].phase;
      const noBonus = funds === s.player.gold;
      const rec = JSON.stringify(s.stories[id]);
      FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
      return { supplies:supplies, spent:spent, repeat:repeat, selected:selected, noWage:noWage, premature:premature,
        earned:earned, ready:ready, finished:finished, phase:phase, noBonus:noBonus,
        faith:faiths.every(function (r) { return s.chars[r[0]].religion === r[1]; }),
        world:world === JSON.stringify([s.stories.latin_bithynia_1204,s.stories.nicaean_return_1204]),
        retained:rec === JSON.stringify(s.stories[id]) && funds === s.player.gold };
    }, outcome)).toEqual({ supplies:true, spent:3, repeat:false, selected:true, noWage:true, premature:false,
      earned:true, ready:'roads', finished:true, phase:outcome === 'stay' ? 'stayed' : 'served', noBonus:true,
      faith:true, world:true, retained:true });
  });
}

test('retained baseline permits informational worship with missing congregations', async function ({ page }, info) {
  await openGame(page, info);
  await page.evaluate(function () { FBDATA.bookmarks['1204'].revision = 'baseline'; FBDATA.bookmarks['1204'].hidden = false; });
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('CONSTBASE-1204-constantinople_household_1204-constantinople-m-Review-established-0-greek.orthodox');
  await page.locator('#ng-seed').press('Enter');
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'constantinople_household_track_1204';
    FB.game.setPaused(true);
    function choose(c) { return FB.stories.apply(s, id, c, FB.stories.quote(s, id, c)); }
    const absent = !s.localInstitutions || !s.localInstitutions.constantinople_greek_service_1204 && !s.localInstitutions.constantinople_latin_service_1204;
    choose('recover'); choose('postpone');
    const before = JSON.stringify(s.localInstitutions), faith = s.chars[s.player.charId].religion, gold = s.player.gold;
    const applied = choose('greek_worship');
    return { absent:absent, applied:applied, phase:s.stories[id].phase,
      same:before === JSON.stringify(s.localInstitutions) && faith === s.chars[s.player.charId].religion && gold === s.player.gold };
  })).toEqual({ absent:true, applied:true, phase:'patron', same:true });
});

test('Venetian work requires the effective quarter and withdraws a stale review', async function ({ page }, info) {
  await beginBookmark(page, info, '1204', 'constantinople_household_1204'); await patron(page);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'constantinople_household_track_1204';
    const q = FB.stories.quote(s, id, 'venetian_work'), ready = q.allowed;
    const civic = FB.civicGovernment.row(s, 'venice_1204');
    const right = civic.rights.find(function (r) { return r.evidenceId === 'venetian_quarter_1204'; });
    const gold = s.player.gold;
    right.status = 'suspended';
    const stale = FB.stories.apply(s, id, 'venetian_work', q), blocked = FB.stories.quote(s, id, 'venetian_work').allowed;
    const local = FB.stories.quote(s, id, 'local_work').allowed;
    right.status = 'active';
    const started = FB.stories.apply(s, id, 'venetian_work', FB.stories.quote(s, id, 'venetian_work'));
    right.status = 'suspended';
    FB.tickFocus(s);
    const noService = s.stories[id].phase === 'quarter_work';
    FB.stories.get(id).day(s, s.stories[id]);
    return { ready:ready, stale:stale, blocked:blocked, local:local, started:started, noService:noService,
      phase:s.stories[id].phase, ordinaryIncome:s.player.gold > gold, faith:s.chars[s.player.charId].religion };
  })).toEqual({ ready:true, stale:false, blocked:false, local:true, started:true, noService:true,
    phase:'changed_world', ordinaryIncome:true, faith:'orthodox' });
});

test('changed city control rejects a supply review and keeps ordinary work available', async function ({ page }, info) {
  await beginBookmark(page, info, '1204', 'constantinople_household_1204');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'constantinople_household_track_1204';
    function choose(c) { return FB.stories.apply(s, id, c, FB.stories.quote(s, id, c)); }
    choose('recover'); const q = FB.stories.quote(s, id, 'buy_supplies');
    FB.transferProvince(s, 'constantinople', 'nicaea_1204');
    const money = s.player.gold, stale = FB.stories.apply(s, id, 'buy_supplies', q), noCharge = money === s.player.gold;
    FB.stories.get(id).day(s, s.stories[id]);
    const changed = s.stories[id].phase, work = choose('ordinary_work');
    FB.tickFocus(s); const paid = s.stories[id].phase;
    const finished = choose('stay');
    return { stale:stale, noCharge:noCharge, changed:changed, work:work, paid:paid, finished:finished, phase:s.stories[id].phase };
  })).toEqual({ stale:false, noCharge:true, changed:'changed_world', work:true, paid:'ordinary_roads', finished:true, phase:'stayed' });
});

test('Nicaean arrival remains a personal stay until ordinary settlement succeeds', async function ({ page }, info) {
  await beginBookmark(page, info, '1204', 'constantinople_household_1204'); await patron(page);
  const result = await page.evaluate(function () {
    let s = FB.state;
    const id = 'constantinople_household_track_1204';
    function choose(c) { return FB.stories.apply(s, id, c, FB.stories.quote(s, id, c)); }
    choose('decline_work'); choose('leave');
    const kin = FB.householdMembers(s).filter(function (c) { return c.id !== s.player.charId; }).map(function (c) { return [c.id,c.homeProvinceId]; });
    s.player.gold = 0; const poor = choose('go_ahead');
    s.player.gold = 1000;
    const q = FB.stories.quote(s, id, 'go_ahead'), price = q.facts.terms.cost, before = s.player.gold;
    const started = FB.stories.apply(s, id, 'go_ahead', q), charge = before - s.player.gold;
    const progress = JSON.stringify(s.player.travel);
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    const noRestart = progress === JSON.stringify(s.player.travel);
    // Only the canonical route owner advances; never run a multi-year simulation.
    for (var day = 0; day < 90 && s.player.travel.phase === 'outbound'; day++) { s.turn++; FB.travelTick(s); }
    FB.stories.get(id).day(s, s.stories[id]);
    const arrival = s.stories[id].phase, stillHome = s.player.provinceId;
    const relativesStayed = kin.every(function (r) { return s.chars[r[0]].homeProvinceId === r[1]; });
    const early = choose('settle');
    const event = FBDATA.events.find(function (e) { return e.id === 'household_nicaea_arrival_1204'; });
    const arrivalNoGrant = event.options.every(function (o) { return Object.keys(o.effects).join(',') === 'custom'; });
    FB.travelCapstoneDone(s);
    s.turn += 360; s.date.year++; s.player.travel.workEvents = 4;
    const settled = choose('settle'), rec = JSON.stringify(s.stories[id]), funds = s.player.gold;
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    return { poor:poor, started:started, charge:charge, price:price, noRestart:noRestart, arrival:arrival,
      stillHome:stillHome, relativesStayed:relativesStayed, early:early, arrivalNoGrant:arrivalNoGrant,
      settled:settled, home:s.player.provinceId, travel:s.player.travel, phase:s.stories[id].phase,
      retained:rec === JSON.stringify(s.stories[id]) && funds === s.player.gold };
  });
  expect(result.charge).toBe(result.price);
  expect(result).toMatchObject({ poor:false, started:true, noRestart:true, arrival:'arrival', stillHome:'constantinople',
    relativesStayed:true, early:false, arrivalNoGrant:true, settled:true, home:'nicaea', travel:null, phase:'resettled', retained:true });
});

test('unreachable, changed-destination and cancelled journeys do not certify refuge', async function ({ page }, info) {
  await beginBookmark(page, info, '1204', 'constantinople_household_1204'); await patron(page);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'constantinople_household_track_1204';
    function choose(c) { return FB.stories.apply(s, id, c, FB.stories.quote(s, id, c)); }
    choose('decline_work'); choose('leave'); s.player.gold = 1000;
    const adj = FB.world.adj.constantinople; FB.world.adj.constantinople = {};
    const unreachable = choose('go_ahead'); FB.world.adj.constantinople = adj;
    const q = FB.stories.quote(s, id, 'go_ahead');
    FB.transferProvince(s, 'nicaea', 'latin_1204');
    const gold = s.player.gold, stale = FB.stories.apply(s, id, 'go_ahead', q), noCharge = gold === s.player.gold;
    FB.transferProvince(s, 'nicaea', 'nicaea_1204');
    const begun = choose('go_ahead'); FB.travelCancel(s);
    FB.stories.get(id).day(s, s.stories[id]);
    return { unreachable:unreachable, stale:stale, noCharge:noCharge, begun:begun, phase:s.stories[id].phase, home:s.player.provinceId };
  })).toEqual({ unreachable:false, stale:false, noCharge:true, begun:true, phase:'interrupted_journey', home:'constantinople' });
});

test('death ends the personal plan and existing saves without it remain without it', async function ({ page }, info) {
  await beginBookmark(page, info, '1204', 'constantinople_household_1204');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'constantinople_household_track_1204', t = s.stories[id];
    const saved = JSON.parse(FB.save.serialize()), money = s.player.gold;
    s.player.dead = true;
    FB.stories.get(id).day(s, t);
    const interrupted = t.phase, noCost = money === s.player.gold;
    delete saved.state.stories[id];
    FB.save.restore(saved);
    return { interrupted:interrupted, noCost:noCost, missing:!FB.state.stories[id] };
  })).toEqual({ interrupted:'interrupted', noCost:true, missing:true });
});

test('absence withdraws local costs before the next story boundary', async function ({ page }, info) {
  await beginBookmark(page, info, '1204', 'constantinople_household_1204');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'constantinople_household_track_1204';
    FB.stories.apply(s, id, 'recover', FB.stories.quote(s, id, 'recover'));
    const q = FB.stories.quote(s, id, 'buy_supplies'), gold = s.player.gold;
    // Stage an externally completed residence change at this boundary.
    s.player.provinceId = 'nicaea';
    const stale = FB.stories.apply(s, id, 'buy_supplies', q);
    FB.stories.get(id).day(s, s.stories[id]);
    return { stale:stale, phase:s.stories[id].phase, noCost:gold === s.player.gold };
  })).toEqual({ stale:false, phase:'remote', noCost:true });
});

test('supplies use the shared confirmation with cancel and focus return', async function ({ page }, info) {
  await beginBookmark(page, info, '1204', 'constantinople_household_1204');
  await page.evaluate(function () {
    const s = FB.state, id = 'constantinople_household_track_1204';
    FB.stories.apply(s, id, 'recover', FB.stories.quote(s, id, 'recover'));
  });
  await page.locator('[data-tab="actions"]').click();
  await page.evaluate(function () { FB.ui.refresh(); });
  const card = page.locator('[data-story-card="' + ID + '"]');
  await card.click();
  await page.locator('[data-story-choice="buy_supplies"]').click();
  await expect(page.locator('#gm-story-confirm')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-story-choice="earn_first"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card).toBeFocused();
  expect(await page.evaluate(function () { return { phase:FB.state.stories.constantinople_household_track_1204.phase, gold:FB.state.player.gold }; })).toEqual({ phase:'workroom', gold:15 });
});
