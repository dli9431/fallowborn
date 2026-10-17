'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const examples = require('../fixtures/authoring/household-graphs.json');

dependsOnRuntime(__filename, [
  'index.html', 'data/starts.js', 'data/bookmarks.js', 'data/bookmark_711.js',
  'data/bookmark_800.js', 'data/bookmark_1204.js', 'data/mobile_confederations.js',
  'data/story_households_711.js', 'data/story_households_800.js',
  'data/story_households_1204.js', 'data/story_households_pontic_476.js',
  'data/starts_perspectives.js', 'data/story_households_perspectives.js',
  'data/starts_york_wessex_867.js', 'data/story_households_867.js',
  'data/start_ambitions.js', 'data/story_courts_476.js',
  'data/bookmark_476.js', 'data/bookmark_476_wider.js', 'data/bookmark_476_italy.js',
  'data/story_ruler_agendas.js', 'data/story_instances.js', 'data/story_campaigns_711.js',
  'data/bookmark_1204_terrain.js', 'js/starts.js', 'js/mods.js', 'js/world.js',
  'js/main.js', 'js/stories.js', 'js/story_household.js', 'js/story_ruler_agenda.js',
  'js/story_opening_goals.js', 'js/story_track.js',
  'js/save.js', 'js/save_v4.js', 'js/ui_misc.js', 'js/ui_modals.js'
]);

async function chooseDate(page, id) {
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#bookmarklist [data-bookmark="' + id + '"]').click();
  await expect(page.locator('#newgame:not(.hidden)')).toBeVisible();
}

test('shipped fixed households have registered tracks in every offered world revision', async function ({ page }, info) {
  await openGame(page, info);
  const rows = await page.evaluate(function () {
    return FBDATA.startScenarios.filter(function (sc) {
      return sc.fixedProvinceId && !sc.rulerRealmId;
    }).map(function (sc) {
      const tracks = FB.startStoryTracks(sc, sc.fixedProvinceId);
      const revisions = [];
      sc.bookmarkIds.forEach(function (id) {
        FB.bookmarkRevisions(id, FBDATA.bookmarks[id]).forEach(function (bm) {
          if (bm.starts && bm.starts.indexOf(sc.id) < 0) return;
          revisions.push({ id:bm.id + ':' + bm.revision, faults:FB.validateBookmark(bm) });
        });
      });
      return { id:sc.id, tracks:tracks, registered:tracks.every(function (id) {
        const story = FB.stories.get(id);
        return story && story.kind === 'track';
      }), revisions:revisions };
    });
  });
  expect(rows.length).toBeGreaterThanOrEqual(4);
  for (const row of rows) {
    expect(row.tracks.length, row.id).toBeGreaterThan(0);
    expect(row.registered, row.id).toBe(true);
    expect(row.revisions.length, row.id).toBeGreaterThan(0);
    for (const revision of row.revisions) expect(revision.faults, row.id + ' ' + revision.id).toEqual([]);
  }
});

for (const fault of ['missing', 'empty', 'excluded', 'unknown', 'world', 'profile']) {
  test('a fixed household with ' + fault + ' tracks rejects an import without mutation', async function ({ page }, info) {
    await openGame(page, info);
    const result = await page.evaluate(function (fault) {
      const sc = JSON.parse(JSON.stringify(FBDATA.startScenarios.find(function (row) {
        return row.id === 'toledo_household_711';
      })));
      delete sc.trackLocations;
      if (fault === 'missing') delete sc.tracks;
      if (fault === 'empty') sc.tracks = [];
      if (fault === 'excluded') sc.trackLocations = { toledo_household_track_711:['oviedo'] };
      if (fault === 'unknown') sc.tracks = ['missing_household_track'];
      if (fault === 'world') sc.tracks = ['toledo_campaign_711'];
      const before = JSON.stringify(FBDATA), stories = FB.stories.list(), state = FB.state;
      const rng = FB.getRngState(), uid = FB.getUidCounter(), storage = localStorage.getItem('fb_mods');
      const messages = JSON.stringify(FB.englishMessages());
      const mod = { name:'Invalid fixed household', startScenarios:[sc] };
      if (fault === 'profile') {
        sc.tracks = ['profile_only_household'];
        sc.trackLocations = { profile_only_household:['toledo'] };
        mod.storyInstances = { profile_only_household:{ id:'profile_only_household', type:'opening_profile',
          title:'Optional reserve', intro:'A goal without a household storyline.',
          scenarioIds:[sc.id], provinceIds:['toledo'], contacts:[],
          goals:[{ id:'reserve', name:'Keep a reserve', text:'Keep twenty gold.', criterion:{ kind:'reserve', amount:20 } }] } };
      }
      const errors = FB.mods.validate(mod), stored = FB.mods.store(JSON.stringify(mod));
      let rejected = false;
      try { FB.mods.apply(mod); } catch (_) { rejected = true; }
      return { errors:errors, stored:stored, rejected:rejected,
        pure:before === JSON.stringify(FBDATA) && state === FB.state && rng === FB.getRngState() &&
          uid === FB.getUidCounter() && storage === localStorage.getItem('fb_mods') &&
          messages === JSON.stringify(FB.englishMessages()) && stories.length === FB.stories.list().length &&
          stories.every(function (story, i) { return story === FB.stories.list()[i]; }) };
    }, fault);
    expect(result.errors.join(' ')).toContain(['unknown', 'world'].includes(fault)
      ? 'unknown id' : 'fixed-place household needs a player track at its fixed birthplace');
    expect(result).toMatchObject({ stored:false, rejected:true, pure:true });
  });
}

test('bookmark validation rejects missing and filtered tracks without exempting hidden or disabled starts', async function ({ page }, info) {
  await openGame(page, info);
  const result = await page.evaluate(function () {
    const index = FBDATA.startScenarios.findIndex(function (sc) { return sc.id === 'toledo_household_711'; });
    const original = FBDATA.startScenarios[index], before = JSON.stringify(FBDATA);
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    const rows = [];
    try {
      ['missing', 'excluded', 'hidden', 'disabled', 'profile'].forEach(function (fault) {
        const sc = JSON.parse(JSON.stringify(original));
        if (fault === 'excluded') sc.trackLocations.toledo_household_track_711 = ['oviedo'];
        else if (fault === 'profile') sc.tracks = sc.tracks.filter(function (id) { return !FB.stories.isStoryline(id); });
        else { delete sc.tracks; delete sc.trackLocations; }
        if (fault === 'hidden') sc.hidden = true;
        FBDATA.startScenarios[index] = sc;
        FB.bookmarkRevisions('711', FBDATA.bookmarks['711']).forEach(function (source) {
          if (source.starts && source.starts.indexOf(sc.id) < 0) return;
          const bm = JSON.parse(JSON.stringify(source));
          if (fault === 'disabled') {
            bm.startLocations = Object.assign({}, bm.startLocations);
            bm.startLocations[sc.id] = [];
          }
          rows.push(FB.validateBookmark(bm).some(function (error) {
            return error.indexOf('fixed-place household needs a player track at its fixed birthplace') >= 0;
          }));
        });
      });
    } finally { FBDATA.startScenarios[index] = original; }
    return { rows:rows, pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  });
  expect(result.rows.length).toBeGreaterThanOrEqual(4);
  expect(result.rows.every(Boolean)).toBe(true);
  expect(result.pure).toBe(true);
});

for (const fault of ['missing', 'profile']) test('the picker, start codes and direct creation refuse a fixed household with ' + fault + ' storyline', async function ({ page }, info) {
  await openGame(page, info);
  await chooseDate(page, '711');
  await page.evaluate(function (fault) {
    const sc = FBDATA.startScenarios.find(function (row) { return row.id === 'toledo_household_711'; });
    if (fault === 'profile') sc.tracks = sc.tracks.filter(function (id) { return !FB.stories.isStoryline(id); });
    else delete sc.tracks;
    // Location metadata on its own cannot supply the missing storyline.
    FBDATA.startScenarios.find(function (row) { return row.id === 'serf'; }).trackLocations = { orphan_track:['toledo'] };
  }, fault);
  expect(await page.evaluate(function () {
    const before = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.game.pending = { scenario:FBDATA.startScenarios.find(function (sc) { return sc.id === 'toledo_household_711'; }),
      bookmarkId:'711', provinceId:'toledo', name:'Review', sex:'m', familyPreset:'standard', seed:'STORYRULE' };
    const started = FB.game.start();
    return { started:started, pure:before === FB.state && rng === FB.getRngState() && uid === FB.getUidCounter() };
  })).toEqual({ started:false, pure:true });
  await expect(page.locator('#scenariolist [data-scenario="toledo_household_711"]')).toHaveCount(0);
  await expect(page.locator('#scenariolist .scenario-story')).toHaveCount(0);
  await page.locator('#btn-ng-back').click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('STORYRULE-711-toledo_household_711-toledo-m-Review-standard');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#ng-seed-err')).toContainText('doesn’t parse');
  await expect(page.locator('#chargen')).toHaveClass(/hidden/);
});

test('located opening goals leave an open role outside the Story group and still attach', async function ({ page }, info) {
  await openGame(page, info);
  const mod = await page.evaluate(function () {
    const sc = JSON.parse(JSON.stringify(FBDATA.startScenarios.find(function (row) { return row.id === 'farmer_476'; })));
    sc.tracks = ['profile_only_open_role'];
    sc.trackLocations = { profile_only_open_role:['pavia'] };
    return { name:'Open role companion goals', startScenarios:[sc],
      storyInstances:{ profile_only_open_role:{ id:'profile_only_open_role', type:'opening_profile',
        title:'Optional reserve', intro:'A goal without a household storyline.',
        scenarioIds:[sc.id], provinceIds:['pavia'], contacts:[],
        goals:[{ id:'reserve', name:'Keep a reserve', text:'Keep twenty gold.', criterion:{ kind:'reserve', amount:20 } }] } } };
  });
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({ name:'open-role-companion.json', mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(mod)) });
  await Promise.all([page.waitForNavigation({ waitUntil:'domcontentloaded' }), page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady && FB.stories.get('profile_only_open_role'); });
  await chooseDate(page, '476');
  const card = page.locator('#scenariolist [data-scenario="farmer_476"]');
  await expect(card.locator('.scenario-story')).toHaveCount(0);
  expect(await card.evaluate(function (el) {
    let previous = el.previousElementSibling;
    while (previous && !previous.classList.contains('scen-group')) previous = previous.previousElementSibling;
    return previous && previous.textContent;
  })).toBe('Open starts');
  await card.click();
  await expect(page.locator('#pickprov:not(.hidden)')).toBeVisible();
  expect(await page.evaluate(function () { return FB.game.pending.provinceId; })).toBeNull();
  await expect(page.locator('#pickinfo .pick-story')).toHaveCount(0);
  await beginBookmark(page, info, '476', 'farmer_476');
  expect(await page.evaluate(function () {
    const sc = FBDATA.startScenarios.find(function (row) { return row.id === 'farmer_476'; });
    const s = FB.state, record = JSON.stringify(s.stories.profile_only_open_role);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return { tracks:FB.startTracks(sc, 'pavia'), stories:FB.startStoryTracks(sc, 'pavia'),
      attached:!!FB.state.stories.profile_only_open_role, home:s.player.provinceId,
      retained:record === JSON.stringify(FB.state.stories.profile_only_open_role) };
  })).toEqual({ tracks:['profile_only_open_role'], stories:[], attached:true, home:'pavia', retained:true });
});

for (const role of ['federate_476', 'curialis_476']) {
  test(role + ' keeps its Ravenna story and ordinary households elsewhere', async function ({ page }, info) {
    await openGame(page, info);
    await chooseDate(page, '476');
    const card = page.locator('#scenariolist [data-scenario="' + role + '"]');
    await expect(card.locator('.scenario-story')).toHaveText('Story start: begins in Ravenna. Another birthplace gives an ordinary household.');
    await card.click();
    await expect(page.locator('#pickinfo .pick-location-title')).toHaveText('Ravenna');
    expect(await page.evaluate(function (role) {
      const sc = FB.game.pending.scenario, home = FB.startTracks(sc, 'ravenna');
      const county = FB.bookmark('476').provinces.find(function (p) {
        return p.id !== 'ravenna' && !p.wasteland && FB.startProvinceAllowed(sc, FB.bookmark('476'), p.id);
      });
      if (!county) throw new Error('No ordinary birthplace for ' + role);
      return { home:FB.startStoryTracks(sc, 'ravenna'), companion:home.some(function (id) { return !FB.stories.isStoryline(id); }),
        moved:FB.game.pickProvince(FB.world.byId[county.id]), away:FB.startStoryTracks(sc, county.id) };
    }, role)).toEqual({ home:[role === 'federate_476' ? 'federate_track_476' : 'curialis_track_476'], companion:true, moved:true, away:[] });
    await expect(page.locator('#pickinfo .pick-story')).toHaveText('This birthplace begins an ordinary household. The story starts in Ravenna.');
  });
}

test('the Harbor Merchant household remains a Story start', async function ({ page }, info) {
  await openGame(page, info);
  await chooseDate(page, '1204');
  const card = page.locator('#scenariolist [data-scenario="constantinople_merchant_household_1204"]');
  await expect(card.locator('.scenario-story')).toHaveText('Story start: begins in Constantinople.');
  await card.click();
  await expect(page.locator('#pickinfo .pick-location-title')).toHaveText('Constantinople');
  expect(await page.evaluate(function () { return FB.startStoryTracks(FB.game.pending.scenario, 'constantinople'); }))
    .toEqual(['constantinople_merchant_track_1204']);
});

test('historical rulers and map-chosen open roles remain valid without player tracks', async function ({ page }, info) {
  await openGame(page, info);
  const result = await page.evaluate(function () {
    const ruler = JSON.parse(JSON.stringify(FBDATA.startScenarios.find(function (sc) { return sc.id === 'muhammad_1204'; })));
    const open = JSON.parse(JSON.stringify(FBDATA.startScenarios.find(function (sc) { return sc.id === 'serf'; })));
    [ruler, open].forEach(function (sc) { delete sc.tracks; delete sc.trackLocations; });
    const mod = { startScenarios:[ruler, open] }, errors = FB.mods.validate(mod);
    FB.mods.apply(mod);
    return { errors:errors, noTracks:[ruler.id, open.id].every(function (id) {
      return !FBDATA.startScenarios.find(function (sc) { return sc.id === id; }).tracks;
    }) };
  });
  expect(result).toEqual({ errors:[], noTracks:true });
  await chooseDate(page, '1204');
  await expect(page.locator('#scenariolist .scen-group')).toHaveText(['Historical starts', 'Story starts', 'Open starts']);
  const ruler = page.locator('#scenariolist [data-scenario="muhammad_1204"]');
  await expect(ruler.locator('.scenario-story')).toHaveCount(0);
  await ruler.click();
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await expect(page.locator('#cg-name-field')).toBeHidden();
});

for (const profile of [
  { start:'quay_household_example_start', track:'quay_household_example', place:'Paris', choice:'keep_private', phase:'private_life' },
  { start:'hill_household_example_start', track:'hill_household_example', place:'Aachen', choice:'remain', phase:'remained' }
]) {
  test('ordinary JSON imports a working Story start at ' + profile.place + ' with its track location rule', async function ({ page }, info) {
    await openGame(page, info);
    const mod = await page.evaluate(function (examples) {
      const mod = { name:'Fixed household story rules', storyInstances:examples.storyInstances, startScenarios:examples.startScenarios };
      const bm = FB.bookmark('867');
      mod.startScenarios.forEach(function (sc, i) {
        const county = bm.provinces.find(function (p) { return p.id === sc.fixedProvinceId; });
        sc.startCulture = county.culture;
        sc.startReligion = county.religion;
        if (i === 1) delete sc.trackLocations;
      });
      return mod;
    }, examples);
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles({ name:'fixed-household-story-rules.json', mimeType:'application/json',
      buffer:Buffer.from(JSON.stringify(mod)) });
    await Promise.all([page.waitForNavigation({ waitUntil:'domcontentloaded' }), page.locator('#mod-apply').click()]);
    await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady && !!FB.stories.get('hill_household_example'); });
    await chooseDate(page, '867');
    await expect(page.locator('#scenariolist .scen-group')).toHaveText(['Historical starts', 'Story starts', 'Open starts']);
    const card = page.locator('#scenariolist [data-scenario="' + profile.start + '"]');
    await expect(card.locator('.scenario-story')).toHaveText('Story start: begins in ' + profile.place + '.');
    await card.click();
    await expect(page.locator('#pickinfo .pick-location-title')).toHaveText(profile.place);
    await page.locator('#btn-pick-back').click();
    await expect(card).toBeFocused();
    await beginBookmark(page, info, '867', profile.start);
    const result = await page.evaluate(function (profile) {
      const s = FB.state, t = s.stories[profile.track], opening = t.phase;
      const q = FB.stories.quote(s, profile.track, profile.choice);
      const applied = FB.stories.apply(s, profile.track, profile.choice, q);
      const record = JSON.stringify(s.stories[profile.track]), saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      return { opening:opening, applied:applied, phase:FB.state.stories[profile.track].phase,
        retained:record === JSON.stringify(FB.state.stories[profile.track]) };
    }, profile);
    expect(result).toEqual({ opening:profile.track === 'quay_household_example' ? 'invitation' : 'wait',
      applied:true, phase:profile.phase, retained:true });
  });
}
