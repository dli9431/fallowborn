'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['index.html','data/starts.js','data/starts_perspectives.js','data/start_ambitions.js',
  'data/story_households_711.js','data/story_households_1204.js','data/story_households_perspectives.js',
  'data/bookmark_711.js','data/bookmark_711_terrain.js','data/story_campaigns_711.js',
  'data/bookmark_1204.js','data/bookmark_1204_terrain.js','data/bookmark_1204_campaigns.js',
  'data/cultures.js','data/communal_revisions.js','data/government_rollout.js',
  'data/actions.js','data/economy.js','data/travel.js','data/events_travel.js',
  'js/starts.js','js/stories.js','js/story_household.js','js/story_opening_goals.js','js/story_campaign.js',
  'js/main.js','js/model.js','js/world.js','js/actions.js','js/travel.js',
  'js/government_civic.js','js/civic_transactions.js','js/save.js','js/save_v4.js',
  'js/i18n.js','js/ui_misc.js','js/ui_panels.js']);

const MERCHANT = 'constantinople_merchant_household_1204';
const TRACK = 'constantinople_merchant_track_1204';

async function chargenCode(page, info, bookmark, code) {
  await openGame(page, info);
  await page.evaluate(function (bookmark) { FBDATA.bookmarks[bookmark].hidden = false; }, bookmark);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(code);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
}

async function finishBeginning(page) {
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await page.evaluate(function () {
    FB.game.setPaused(true); FB.game.auto.all = true; FB.game.auto.style = 'first';
    FB.game.uiPrefs.hideTips = true; FB.game.uiPrefs.hideBeginnerHints = true;
    delete FB.state.player.flags.tutorial;
  });
}

async function beginCommunity(page, info, bookmark, scenario, province, culture, faith) {
  await chargenCode(page, info, bookmark, 'PERSPECTIVE-' + bookmark + '-' + scenario + '-' + province + '-m-Review-established');
  const index = await page.evaluate(function (input) {
    return FB.provinceCommunities(FB.world.byId[input.province]).findIndex(function (row) {
      return row.culture === input.culture && row.religion === input.faith;
    });
  }, { province, culture, faith });
  expect(index).toBeGreaterThanOrEqual(0);
  await page.locator('input[name="cg-community"][value="' + index + '"]').check();
  await finishBeginning(page);
}

for (const [bookmark, scenario, province, culture, faith] of [
  ['711','toledo_household_711','toledo','hispano_roman','jewish'],
  ['1204',MERCHANT,'constantinople','greek','orthodox']
]) {
  test('shared code reopens the selected ' + bookmark + ' household community', async function ({ page }, info) {
    await beginCommunity(page, info, bookmark, scenario, province, culture, faith);
    const code = await page.evaluate(function () { return FB.state.seed; });
    await chargenCode(page, info, bookmark, code); await finishBeginning(page);
    expect(await page.evaluate(function () {
      const s = FB.state;
      return { seed:s.seed, communities:FB.householdMembers(s).map(function (c) { return c.culture + '/' + c.religion; }) };
    })).toEqual({ seed:code, communities:expect.arrayContaining([culture + '/' + faith]) });
    expect(await page.evaluate(function (identity) {
      return FB.householdMembers(FB.state).every(function (c) { return c.culture + '/' + c.religion === identity; });
    }, culture + '/' + faith)).toBe(true);
  });
}

for (const [culture, faith, phase] of [
  ['hispano_roman','catholic','roman_roots'], ['gothic','catholic','gothic_roots'], ['hispano_roman','jewish','jewish_roots']
]) {
  test('Toledo community picker preserves ' + culture + '/' + faith + ' through work and restore', async function ({ page }, info) {
    await beginCommunity(page, info, '711', 'toledo_household_711', 'toledo', culture, faith);
    expect(await page.evaluate(function (input) {
      let s = FB.state; const id = 'toledo_household_track_711', story = FB.stories.get(id);
      const seed = s.seed;
      const family = FB.householdMembers(s).map(function (c) { return [c.id,c.culture,c.religion]; });
      FB.stories.get('strait_crossing_711').day(s, s.stories.strait_crossing_711);
      story.day(s, s.stories[id]);
      const news = FB.stories.apply(s, id, 'continue_work', FB.stories.quote(s, id, 'continue_work'));
      story.day(s, s.stories[id]); const phase = s.stories[id].phase, before = s.player.gold;
      const campaigns = JSON.stringify([s.stories.strait_crossing_711,s.stories.toledo_campaign_711]);
      const work = FB.stories.apply(s, id, 'work', FB.stories.quote(s, id, 'work'));
      const noWage = before === s.player.gold;
      FB.tickFocus(s);
      const earned = s.player.gold > before, ready = s.stories[id].phase;
      const rec = JSON.stringify(s.stories[id]); FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
      return { news, phase, work, noWage, earned, ready, retained:rec === JSON.stringify(s.stories[id]) && seed === s.seed,
        identity:family.length > 1 && family.every(function (r) {
          return r[1] === input.culture && r[2] === input.faith && s.chars[r[0]].culture === r[1] && s.chars[r[0]].religion === r[2];
        }), campaigns:campaigns === JSON.stringify([s.stories.strait_crossing_711,s.stories.toledo_campaign_711]) };
    }, { culture, faith })).toEqual({ news:true, phase, work:true, noWage:true, earned:true, ready:'after_identity', retained:true, identity:true, campaigns:true });
  });
}

test('Jewish Toledo continuity remains voluntary after actual conquest', async function ({ page }, info) {
  await beginCommunity(page, info, '711', 'toledo_household_711', 'toledo', 'hispano_roman', 'jewish');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'toledo_household_track_711';
    const before = JSON.stringify([s.player.gold,FB.householdMembers(s)]), source = JSON.stringify(s.stories.toledo_campaign_711);
    FB.transferProvince(s, 'toledo', 'umayyad_711'); FB.stories.get(id).day(s, s.stories[id]);
    const choice = FB.stories.apply(s, id, 'jewish_continuity', FB.stories.quote(s, id, 'jewish_continuity'));
    return { choice, phase:s.stories[id].phase, unchanged:before === JSON.stringify([s.player.gold,FB.householdMembers(s)]),
      campaign:source === JSON.stringify(s.stories.toledo_campaign_711) };
  })).toEqual({ choice:true, phase:'stay', unchanged:true, campaign:true });
});

for (const [culture, faith] of [['greek','orthodox'],['frankish','catholic']]) {
  test('Constantinople artisan ' + culture + ' keeps its selected worship and can help a neighbour', async function ({ page }, info) {
    await beginCommunity(page, info, '1204', 'constantinople_household_1204', 'constantinople', culture, faith);
    expect(await page.evaluate(function (input) {
      let s = FB.state; const id = 'constantinople_household_track_1204';
      function choose(c) { return FB.stories.apply(s, id, c, FB.stories.quote(s, id, c)); }
      const kin = FB.householdMembers(s).map(function (c) { return [c.id,c.culture,c.religion]; });
      FB.stories.get(id).day(s, s.stories[id]); const opening = s.stories[id].phase;
      choose(input.culture === 'frankish' ? 'find_work' : 'recover'); choose('earn_first');
      const wrong = choose(input.faith === 'orthodox' ? 'latin_worship' : 'greek_worship');
      const worship = choose(input.faith === 'orthodox' ? 'greek_worship' : 'latin_worship');
      choose('local_work'); FB.tickFocus(s); choose('neighbour');
      const gold = s.player.gold, shared = choose('share_supplies'), spent = gold - s.player.gold, repeat = choose('share_supplies');
      const rec = JSON.stringify(s.stories[id]); FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
      return { opening, wrong, worship, shared, spent, repeat, phase:s.stories[id].phase,
        retained:rec === JSON.stringify(s.stories[id]),
        identity:kin.every(function (r) { return r[1] === input.culture && r[2] === input.faith && s.chars[r[0]].culture === r[1] && s.chars[r[0]].religion === r[2]; }) };
    }, { culture, faith })).toEqual({ opening:culture === 'frankish' ? 'new_arrival' : 'inventory', wrong:false,
      worship:true, shared:true, spent:2, repeat:false, phase:'stayed', retained:true, identity:true });
  });
}

test('the harbor start validates every offering revision and attaches its household track and opening profile', async function ({ page }, info) {
  await openGame(page, info);
  expect(await page.evaluate(function () {
    const sc = FBDATA.startScenarios.find(function (r) { return r.id === 'constantinople_merchant_household_1204'; }), id = 'constantinople_merchant_track_1204';
    const revisions = Object.keys(FBDATA.bookmarks['1204'].revisions).filter(function (r) {
      const bm = FB.bookmark('1204', r); return !bm.starts || bm.starts.indexOf(sc.id) >= 0;
    });
    return { valid:revisions.length > 1 && revisions.every(function (r) { return FB.validateBookmark(FB.bookmark('1204', r)).length === 0; }),
      defaults:[sc.startCulture,sc.startReligion,sc.profession,sc.gold], families:Object.keys(sc.familyPresets),
      tracks:FB.startTracks(sc, 'constantinople'), away:FB.startTracks(sc, 'nicaea'),
      elsewhere:FBDATA.startScenarios.filter(function (r) { return r.id !== sc.id && (r.tracks || []).indexOf(id) >= 0; }).length,
      dates:sc.bookmarkIds, property:!!sc.startEffects };
  })).toEqual({ valid:true, defaults:['italian','catholic','merchant',15], families:['established','standard'],
    tracks:[TRACK,'opening_constantinople_merchant_1204'], away:[], elsewhere:0, dates:['1204'], property:false });
});

for (const [culture, faith] of [['italian','catholic'],['greek','orthodox'],['frankish','catholic']]) {
  test('harbor merchant ' + culture + ' earns only ordinary income and retains family identity', async function ({ page }, info) {
    await beginCommunity(page, info, '1204', MERCHANT, 'constantinople', culture, faith);
    expect(await page.evaluate(function (input) {
      let s = FB.state; const id = 'constantinople_merchant_track_1204';
      function choose(c) { return FB.stories.apply(s, id, c, FB.stories.quote(s, id, c)); }
      const kin = FB.householdMembers(s).map(function (c) { return [c.id,c.culture,c.religion]; });
      const publicBefore = JSON.stringify([s.owner,s.realms,FB.civicGovernment.row(s, 'venice_1204')]);
      const seed = s.seed, gold = s.player.gold, selected = choose('local_trade'), noWage = s.player.gold === gold;
      FB.stories.get(id).day(s, s.stories[id]); const waiting = s.stories[id].phase;
      FB.tickFocus(s); const earned = s.player.gold > gold, paid = s.player.gold, ready = s.stories[id].phase;
      choose(input.culture === 'italian' ? 'share_supplies' : 'keep_reserves');
      const spent = paid - s.player.gold, afterSupplies = s.player.gold;
      const finished = choose('stay'), noBonus = s.player.gold === afterSupplies;
      const rec = JSON.stringify(s.stories[id]); FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
      const retained = rec === JSON.stringify(s.stories[id]) && seed === s.seed && s.player.gold === afterSupplies;
      const publicSame = publicBefore === JSON.stringify([s.owner,s.realms,FB.civicGovernment.row(s, 'venice_1204')]);
      const identity = kin.length > 1 && kin.every(function (r) {
        return r[1] === input.culture && r[2] === input.faith && s.chars[r[0]].culture === r[1] && s.chars[r[0]].religion === r[2];
      });
      const saved = JSON.parse(FB.save.serialize()); delete saved.state.stories[id]; FB.save.restore(saved);
      return { selected, noWage, waiting, earned, ready, spent, finished, noBonus, retained, publicSame, identity,
        missingStaysMissing:!FB.state.stories[id] };
    }, { culture, faith })).toEqual({ selected:true, noWage:true, waiting:'local_work', earned:true, ready:'relationship',
      spent:culture === 'italian' ? 2 : 0, finished:true, noBonus:true, retained:true, publicSame:true, identity:true, missingStaysMissing:true });
  });
}

test('merchant supplies reject stale funds and remain optional for a poor household', async function ({ page }, info) {
  await beginBookmark(page, info, '1204', MERCHANT);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'constantinople_merchant_track_1204';
    function choose(c) { return FB.stories.apply(s, id, c, FB.stories.quote(s, id, c)); }
    choose('decline_deal'); const q = FB.stories.quote(s, id, 'share_supplies'); s.player.gold--;
    const gold = s.player.gold, stale = FB.stories.apply(s, id, 'share_supplies', q), intact = gold === s.player.gold;
    s.player.gold = 0; const poor = choose('share_supplies'), free = choose('keep_reserves'), finish = choose('defer');
    return { reviewed:q.allowed, stale, intact, poor, free, finish, gold:s.player.gold, phase:s.stories[id].phase };
  })).toEqual({ reviewed:true, stale:false, intact:true, poor:false, free:true, finish:true, gold:0, phase:'deferred' });
});

test('merchant quarter work rechecks the public right and keeps ordinary work after control changes', async function ({ page }, info) {
  await beginBookmark(page, info, '1204', MERCHANT);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'constantinople_merchant_track_1204', story = FB.stories.get(id);
    function choose(c) { return FB.stories.apply(s, id, c, FB.stories.quote(s, id, c)); }
    const right = FB.civicGovernment.row(s, 'venice_1204').rights.find(function (r) { return r.evidenceId === 'venetian_quarter_1204'; });
    const q = FB.stories.quote(s, id, 'quarter_trade'); right.status = 'suspended';
    const stale = FB.stories.apply(s, id, 'quarter_trade', q), local = FB.stories.quote(s, id, 'local_trade').allowed;
    right.status = 'active'; const started = choose('quarter_trade');
    FB.transferProvince(s, 'constantinople', 'nicaea_1204'); FB.tickFocus(s);
    const noCompletion = s.stories[id].phase === 'quarter_work'; story.day(s, s.stories[id]);
    const changed = s.stories[id].phase, ordinary = choose('ordinary_trade'); FB.tickFocus(s);
    return { reviewed:q.allowed, stale, local, started, noCompletion, changed, ordinary, phase:s.stories[id].phase };
  })).toEqual({ reviewed:true, stale:false, local:true, started:true, noCompletion:true, changed:'changed_market', ordinary:true, phase:'relationship' });
});

test('merchant personal travel charges once and interruption never moves relatives', async function ({ page }, info) {
  await beginBookmark(page, info, '1204', MERCHANT);
  const result = await page.evaluate(function () {
    let s = FB.state; const id = 'constantinople_merchant_track_1204';
    function choose(c) { return FB.stories.apply(s, id, c, FB.stories.quote(s, id, c)); }
    choose('decline_deal'); choose('keep_reserves'); choose('leave'); s.player.gold = 0;
    const poor = choose('go_ahead'); s.player.gold = 1000;
    const q = FB.stories.quote(s, id, 'go_ahead'), gold = s.player.gold;
    const kin = FB.householdMembers(s).map(function (c) { return [c.id,c.homeProvinceId]; });
    const started = FB.stories.apply(s, id, 'go_ahead', q), charged = gold - s.player.gold;
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    const once = s.player.gold === gold - charged;
    FB.travelCancel(s); FB.stories.get(id).day(s, s.stories[id]);
    return { poor, started, charged, price:q.facts.terms.cost, once, phase:s.stories[id].phase,
      home:s.player.provinceId, kinStayed:kin.every(function (r) { return s.chars[r[0]].homeProvinceId === r[1]; }) };
  });
  expect(result.charged).toBe(result.price);
  expect(result).toMatchObject({ poor:false, started:true, once:true, phase:'interrupted_journey', home:'constantinople', kinStayed:true });
});

test('merchant death interrupts an unfinished plan without a reward', async function ({ page }, info) {
  await beginBookmark(page, info, '1204', MERCHANT);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'constantinople_merchant_track_1204', gold = s.player.gold;
    s.chars[s.player.charId].dead = true; s.player.dead = true;
    FB.stories.get(id).day(s, s.stories[id]);
    return { phase:s.stories[id].phase, unchanged:s.player.gold === gold, blocked:!FB.stories.quote(s, id, 'local_trade').allowed };
  })).toEqual({ phase:'interrupted', unchanged:true, blocked:true });
});

test('merchant work review cancels back to the story and restores its Deeds focus', async function ({ page }, info) {
  await beginBookmark(page, info, '1204', MERCHANT);
  await page.locator('[data-tab="actions"]').click(); await page.evaluate(function () { FB.ui.refresh(); });
  const card = page.locator('[data-story-card="' + TRACK + '"]');
  await card.click(); await page.locator('[data-story-choice="local_trade"]').click();
  await expect(page.locator('#gm-story-confirm')).toBeVisible(); await page.keyboard.press('Escape');
  await expect(page.locator('[data-story-choice="local_trade"]')).toBeVisible(); await page.keyboard.press('Escape');
  await expect(card).toBeFocused();
  expect(await page.evaluate(function () {
    return { phase:FB.state.stories.constantinople_merchant_track_1204.phase, gold:FB.state.player.gold };
  })).toEqual({ phase:'opening', gold:15 });
});
