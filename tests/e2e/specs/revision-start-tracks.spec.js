'use strict';
const path = require('path');
const {test, expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {beginBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const examples = {harbor:require('../fixtures/authoring/revision-start-tracks-harbor.json'),
  dune:require('../fixtures/authoring/revision-start-tracks-dune.json')};
dependsOnRuntime(__filename, ['index.html','data/starts.js','data/mobile_confederations.js',
  'js/starts.js','js/world.js','js/mods.js','js/main.js','js/stories.js','js/bookmark_setup.js',
  'js/story_government_selection.js','js/story_opening_goals.js','js/story_expedition_preparation.js',
  'js/story_expedition_participation.js','js/story_household_party.js','js/household_party_camp.js',
  'js/mobile_confederations.js','js/mobile_command.js','js/save.js','js/save_v4.js',
  'js/model.js','js/treasury.js','js/authority.js','js/ui_misc.js','js/ui_modals.js']);

async function importExample(page, info, prefix, revision) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,
    '../fixtures/authoring/revision-start-tracks-' + prefix + '.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}), page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (prefix) {
    return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix + '_world'];
  }, prefix);
  // Choose which retained definition is offered as fresh in this isolated
  // context. Both revisions and the exact stored JSON fingerprint coexist.
  if (revision) await page.evaluate(function (args) {
    FBDATA.bookmarks[args.prefix + '_world'].revision = args.revision;
  }, {prefix:prefix, revision:revision});
}

for (const prefix of ['harbor','dune']) {
  test(prefix + ' accepts the complete detached import and validates both effective worlds without effects', async function ({page}, info) {
    await openGame(page, info);
    const pure = await page.evaluate(function (input) {
      const data = JSON.stringify(FBDATA), state = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
      const registry = FB.stories.list(), messages = JSON.stringify(FB.englishMessages());
      const faults = FB.mods.validate(input);
      return {faults:faults, pure:data === JSON.stringify(FBDATA) && state === FB.state &&
        rng === FB.getRngState() && uid === FB.getUidCounter() &&
        messages === JSON.stringify(FB.englishMessages()) &&
        registry.every(function (story, i) { return FB.stories.list()[i] === story; })};
    }, examples[prefix]);
    expect(pure).toEqual({faults:[], pure:true});
    await importExample(page, info, prefix);
    const result = await page.evaluate(function (prefix) {
      const id = prefix + '_world', sc = FBDATA.startScenarios.find(function (r) { return r.id === prefix + '_household'; });
      const bm = FBDATA.bookmarks[id], before = JSON.stringify(bm), rng = FB.getRngState(), uid = FB.getUidCounter();
      const revisions = FB.bookmarkRevisions(id).map(function (world) {
        return {id:world.revision, faults:FB.validateBookmark(world),
          tracks:FB.startTracks(sc, sc.fixedProvinceId, world),
          allowed:FB.startProvinceAllowed(sc, world, sc.fixedProvinceId)};
      });
      const absent = Object.assign({}, FB.bookmark(id, 'expanded'), {startTrackOverrides:undefined});
      const empty = Object.assign({}, absent, {startTrackOverrides:{schema:1, entries:{}}});
      return {faults:FB.validateBookmark(bm), revisions:revisions,
        fallback:JSON.stringify(FB.startTracks(sc, sc.fixedProvinceId, absent)) === JSON.stringify(sc.tracks),
        entryFallback:JSON.stringify(FB.startTracks(sc, sc.fixedProvinceId, empty)) === JSON.stringify(sc.tracks),
        unchanged:before === JSON.stringify(bm) && rng === FB.getRngState() && uid === FB.getUidCounter(),
        mode:FBDATA.techImpactReviews.features.revision_start_tracks.mode};
    }, prefix);
    expect(result).toMatchObject({faults:[], fallback:true, entryFallback:true, unchanged:true, mode:'none'});
    expect(result.revisions.map(function (r) { return [r.id,r.faults,r.tracks.length,r.allowed]; }))
      .toEqual([['baseline',[],2,true],['expanded',[],4,true]]);
  });

  for (const revision of ['baseline','expanded']) {
    test(prefix + ' ' + revision + ' picker offers the same household and attaches its effective set', async function ({page}, info) {
      await importExample(page, info, prefix, revision);
      const full = page.locator('#btn-choose-beginning');
      if (await full.isVisible()) await full.click();
      else await page.getByRole('button', {name:'New Game', exact:true}).click();
      await page.locator('[data-bookmark="' + prefix + '_world"]').click();
      const card = page.locator('[data-scenario="' + prefix + '_household"]');
      await expect(card).toContainText('Story start');
      await card.click();
      await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
      await page.getByRole('button', {name:'Begin Your Story', exact:true}).click();
      await page.getByRole('button', {name:'Begin', exact:true}).click();
      const result = await page.evaluate(function () {
        FB.game.setPaused(true);
        const s = FB.state, sc = FB.game.SCENARIOS.find(function (row) { return row.id === s.start.scenarioId; });
        return {revision:s.start.revision, opening:s.bookmarkSetup.revision,
          tracks:s.start.storyAttachments.tracks.slice().sort(),
          expected:FB.startTracks(sc, sc.fixedProvinceId, FB.campaignBookmark(s)).slice().sort(),
          count:s.start.storyAttachments.tracks.length};
      });
      expect(result.tracks).toEqual(result.expected);
      expect(result).toMatchObject({revision:revision, opening:revision === 'baseline' ? 'original' : 'expanded',
        count:revision === 'baseline' ? 2 : 4});
    });

    for (const legacy of [false,true]) {
      test(prefix + ' ' + revision + ' ' + (legacy ? 'legacy' : 'stamped') + ' code/save keeps original tracks under fresh expansion', async function ({page}, info) {
        await importExample(page, info, prefix, revision);
        await beginBookmark(page, info, prefix + '_world', prefix + '_household');
        const result = await page.evaluate(function (args) {
          let saved = JSON.parse(FB.save.serialize());
          const signature = saved.mods, attachments = JSON.stringify(saved.state.start.storyAttachments);
          if (args.legacy) { delete saved.state.start.storyAttachments; delete saved.storyAttachmentSchema; }
          FBDATA.bookmarks[args.prefix + '_world'].revision = 'expanded';
          function facts(s) { return JSON.stringify([s.stories,s.chars,s.player.gold,s.player.provinceId,
            s.player.travel,s.authority,s.armies,s.population,s.bookmarkSetup,s.start.revision]); }
          const before = facts(FB.state), rng = FB.getRngState(), uid = FB.getUidCounter();
          let stable = true;
          for (let i = 0; i < 3; i++) {
            FB.save.restore(saved);
            stable = stable && before === facts(FB.state);
            saved = JSON.parse(FB.save.serialize());
            stable = stable && saved.mods === signature;
          }
          const sc = FBDATA.startScenarios.find(function (r) { return r.id === args.prefix + '_household'; });
          return {stable:stable, rng:rng === FB.getRngState(), uid:uid === FB.getUidCounter(),
            revision:FB.state.start.revision, original:args.legacy ? saved.state.start.storyAttachments === undefined &&
              saved.storyAttachmentSchema === undefined : attachments === JSON.stringify(saved.state.start.storyAttachments),
            tracks:Object.keys(saved.state.stories).filter(function (id) { return FB.stories.get(id).kind === 'track'; }).length,
            global:sc.tracks.length, fresh:FB.startTracks(sc, sc.fixedProvinceId, FB.bookmark(args.prefix + '_world')).length};
        }, {prefix:prefix, legacy:legacy});
        expect(result).toEqual({stable:true, rng:true, uid:true, revision:revision, original:true,
          tracks:revision === 'baseline' ? 2 : 4, global:2, fresh:4});
      });
    }
  }

  test(prefix + ' direct creation uses the same expanded selection and rejects an absent home storyline', async function ({page}, info) {
    await importExample(page, info, prefix);
    await page.evaluate(function (prefix) {
      return new Promise(function (resolve, reject) {
        FB.activateBookmark(prefix + '_world', null, function (error) { if (error) reject(error); else resolve(); });
      });
    }, prefix);
    const result = await page.evaluate(function (prefix) {
      const bm = FB.bookmark(prefix + '_world');
      const sc = FBDATA.startScenarios.find(function (r) { return r.id === prefix + '_household'; });
      FB.game.pending = {scenario:sc, bookmarkId:bm.id, provinceId:sc.fixedProvinceId,
        name:'Review', sex:'m', familyPreset:'standard', seed:'TRACKWORLDS'};
      FB.game.start(); FB.game.setPaused(true);
      const count = FB.state.start.storyAttachments.tracks.length;
      const raw = FBDATA.bookmarks[bm.id], entry = raw.revisions.expanded.startTrackOverrides.entries[sc.id];
      const old = entry.tracks; entry.tracks = [prefix + '_opening_review'];
      FB.game.pending = {scenario:sc, bookmarkId:bm.id, provinceId:sc.fixedProvinceId, seed:'REFUSED'};
      const state = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
      const rejected = FB.game.start() === false;
      entry.tracks = old;
      return {count:count, rejected:rejected, pure:state === FB.state && rng === FB.getRngState() && uid === FB.getUidCounter()};
    }, prefix);
    expect(result).toEqual({count:4, rejected:true, pure:true});
    await expect(page.locator('#scenariolist [data-scenario="' + prefix + '_household"]')).toHaveCount(0);
  });

  test(prefix + ' code rejects an effective profile-only household despite its global storyline', async function ({page}, info) {
    await importExample(page, info, prefix);
    await page.evaluate(function (prefix) {
      const sc = FBDATA.startScenarios.find(function (r) { return r.id === prefix + '_household'; });
      const row = FBDATA.bookmarks[prefix + '_world'].revisions.expanded.startTrackOverrides.entries[sc.id];
      row.tracks = [prefix + '_opening_review']; row.trackLocations = {};
    }, prefix);
    const full = page.locator('#btn-choose-beginning');
    if (await full.isVisible()) await full.click();
    else await page.getByRole('button', {name:'New Game', exact:true}).click();
    // Code parsing checks eligibility before activating this invalid edited
    // world, preserving the same no-storyline boundary as direct creation.
    await page.locator('#btn-bm-seed').click();
    const sc = examples[prefix].startScenarios[0];
    await page.locator('#ng-seed').fill('TRACKWORLD-' + prefix + '_world-' + sc.id + '-' + sc.fixedProvinceId + '-m-Review-standard');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#ng-seed-err')).toContainText('doesn’t parse');
    expect(await page.evaluate(function (prefix) {
      const sc = FBDATA.startScenarios.find(function (r) { return r.id === prefix + '_household'; });
      return FB.startStoryTracks(sc,sc.fixedProvinceId,null,FB.bookmark(prefix + '_world')).length;
    }, prefix)).toBe(0);
  });

  test(prefix + ' expanded saves reject missing original records and malformed provenance atomically', async function ({page}, info) {
    await importExample(page, info, prefix);
    await beginBookmark(page, info, prefix + '_world', prefix + '_household');
    const result = await page.evaluate(function (prefix) {
      const saved = JSON.parse(FB.save.serialize()), before = JSON.stringify(FB.state), rng = FB.getRngState(), uid = FB.getUidCounter();
      const changes = [function (d) { delete d.state.stories[prefix + '_admission']; },
        function (d) { delete d.state.stories[prefix + '_family_plan']; },
        function (d) { delete d.state.start.storyAttachments; }, function (d) { delete d.storyAttachmentSchema; },
        function (d) { d.state.start.storyAttachments.schema = 2; },
        function (d) { d.state.start.storyAttachments.extra = true; },
        function (d) { d.state.start.storyAttachments.tracks.push(prefix + '_admission'); },
        function (d) { d.state.start.storyAttachments.tracks.push('unknown_track'); },
        function (d) { d.mods += 'changed-content'; }];
      return changes.map(function (change) {
        const d = JSON.parse(JSON.stringify(saved)); change(d); let failed = false;
        try { FB.save.restore(d); } catch (_) { failed = true; }
        return failed && before === JSON.stringify(FB.state) && rng === FB.getRngState() && uid === FB.getUidCounter();
      });
    }, prefix);
    expect(result).toEqual(Array(9).fill(true));
  });

  test(prefix + ' older ordinary save without a scenario stamp or profile stays unexpanded', async function ({page}, info) {
    await importExample(page, info, prefix, 'baseline');
    await beginBookmark(page, info, prefix + '_world', prefix + '_household');
    const result = await page.evaluate(function (prefix) {
      let saved = JSON.parse(FB.save.serialize());
      const profile = prefix + '_opening_review';
      // The earlier ordinary constructor did not stamp scenarioId and skipped
      // opening_profile eligibility. Preserve that actual historical absence.
      delete saved.state.start.scenarioId;
      delete saved.state.stories[profile];
      delete saved.state.start.storyAttachments;
      delete saved.storyAttachmentSchema;
      FBDATA.bookmarks[prefix + '_world'].revision = 'expanded';
      const chars = JSON.stringify(saved.state.chars), gold = saved.state.player.gold, sig = saved.mods;
      for (let i = 0; i < 3; i++) { FB.save.restore(saved); saved = JSON.parse(FB.save.serialize()); }
      return {unmarked:saved.state.start.scenarioId === undefined,
        noProfile:saved.state.stories[profile] === undefined,
        noAdmission:saved.state.stories[prefix + '_admission'] === undefined,
        legacy:saved.state.start.storyAttachments === undefined && saved.storyAttachmentSchema === undefined,
        stable:chars === JSON.stringify(saved.state.chars) && gold === saved.state.player.gold && sig === saved.mods};
    }, prefix);
    expect(result).toEqual({unmarked:true,noProfile:true,noAdmission:true,legacy:true,stable:true});
  });
}

test('override inheritance, complete replacement and omitted birthplace maps use whole revision semantics', async function ({page}, info) {
  await openGame(page, info);
  const result = await page.evaluate(function (source) {
    const input = JSON.parse(JSON.stringify(source)), b = input.bookmarks.harbor_world, sc = input.startScenarios[0];
    b.revisions.baseline.startTrackOverrides = {schema:1,entries:{harbor_household:{tracks:sc.tracks.slice()}}};
    b.revisions.inherited = JSON.parse(JSON.stringify(b.revisions.expanded));
    delete b.revisions.inherited.startTrackOverrides;
    b.revisions.expanded.startTrackOverrides.entries.harbor_household = {tracks:['harbor_admission']};
    const faults = FB.mods.validate(input);
    const selected = FB.bookmarkRevisions(b.id,b).map(function (world) {
      return {id:world.revision, tracks:FB.startTracks(sc,'harbor_quay',world),
        // An omitted replacement map is empty, not the scenario's old map.
        elsewhere:FB.startTracks(sc,'harbor_gardens',world)};
    });
    return {faults:faults, selected:selected, original:sc.tracks.length};
  }, examples.harbor);
  expect(result.faults).toEqual([]);
  expect(result.original).toBe(2);
  expect(result.selected).toEqual([
    {id:'baseline',tracks:['harbor_candidacy','harbor_opening_review'],elsewhere:['harbor_candidacy','harbor_opening_review']},
    {id:'expanded',tracks:['harbor_admission'],elsewhere:['harbor_admission']},
    {id:'inherited',tracks:['harbor_candidacy','harbor_opening_review'],elsewhere:['harbor_candidacy','harbor_opening_review']}
  ]);
});

test('a retained world cannot inherit fresh-only hosts, tracks or dependencies through an override', async function ({page}, info) {
  await openGame(page, info);
  const result = await page.evaluate(function (source) {
    const changes = [function (b) { b.revisions.baseline.startTrackOverrides = b.revisions.expanded.startTrackOverrides; },
      function (b) { b.revisions.expanded.starts = []; },
      function (b) { b.revisions.expanded.stories = b.revisions.expanded.stories.filter(function (id) { return id !== 'harbor_offices'; }); },
      function (b) { b.revisions.expanded.startLocations = {harbor_household:['harbor_gardens']}; }];
    return changes.map(function (change) {
      const input = JSON.parse(JSON.stringify(source)); change(input.bookmarks.harbor_world);
      return FB.mods.validate(input).length > 0;
    });
  }, examples.harbor);
  expect(result).toEqual([true,true,true,true]);
});

test('invalid complete overrides and effective references reject ordinary imports without publication', async function ({page}, info) {
  await openGame(page, info);
  const result = await page.evaluate(function (source) {
    const changes = [function (p) { p.schema = 2; }, function (p) { p.extra = true; },
      function (p) { p.entries = {}; }, function (p) { p.entries.missing_start = p.entries.harbor_household; },
      function (p) { p.entries.harbor_household = null; },
      function (p) { p.entries.harbor_household.tracks = ['harbor_offices']; },
      function (p) { p.entries.harbor_household.tracks.push('missing_track'); },
      function (p) { p.entries.harbor_household.tracks.push('harbor_admission'); },
      function (p) { p.entries.harbor_household.tracks = []; },
      function (p) { p.entries.harbor_household.tracks = ['harbor_opening_review']; p.entries.harbor_household.trackLocations = {}; },
      function (p) { p.entries.harbor_household.extra = true; },
      function (p) { delete p.entries.harbor_household.tracks; },
      function (p) { p.entries.harbor_household.trackLocations.harbor_admission = ['missing_county']; },
      function (p) { p.entries.harbor_household.trackLocations.harbor_admission = ['harbor_gardens']; },
      function (p) { p.entries.harbor_household.trackLocations.missing_track = ['harbor_quay']; },
      function (p) { p.entries.harbor_household.trackLocations.harbor_admission = []; },
      function (p) { p.entries.harbor_household.trackLocations.harbor_admission = ['harbor_quay','harbor_quay']; },
      function (p) { p.entries.harbor_household.tracks = ['harbor_candidacy','harbor_opening_review','harbor_family_plan'];
        delete p.entries.harbor_household.trackLocations.harbor_admission; },
      function (p) { p.entries.harbor_household.tracks = Array(513).fill('harbor_admission'); }];
    const data = JSON.stringify(FBDATA), registry = FB.stories.list(), state = FB.state;
    const messages = JSON.stringify(FB.englishMessages()), storage = localStorage.getItem('fb_mods');
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    return changes.map(function (change) {
      const mod = JSON.parse(JSON.stringify(source));
      change(mod.bookmarks.harbor_world.revisions.expanded.startTrackOverrides);
      const errors = FB.mods.validate(mod), stored = FB.mods.store(JSON.stringify(mod));
      let rejected = false; try { FB.mods.apply(mod); } catch (_) { rejected = true; }
      return errors.length > 0 && stored === false && rejected && data === JSON.stringify(FBDATA) &&
        state === FB.state && rng === FB.getRngState() && uid === FB.getUidCounter() &&
        messages === JSON.stringify(FB.englishMessages()) && storage === localStorage.getItem('fb_mods') &&
        registry.every(function (story, i) { return FB.stories.list()[i] === story; });
    });
  }, examples.harbor);
  expect(result).toEqual(Array(19).fill(true));
});

test('succession keeps original revision tracks and leaves personal admission with its founder', async function ({page}, info) {
  await importExample(page, info, 'harbor');
  await beginBookmark(page, info, 'harbor_world', 'harbor_household');
  const result = await page.evaluate(function () {
    const s = FB.state, founder = s.player.charId, provenance = JSON.stringify(s.start.storyAttachments);
    const heir = Object.keys(s.chars).map(function (id) { return s.chars[id]; }).find(function (c) {
      return c.id !== founder && !c.dead && c.role === 'sibling' && FB.ageOf(c,s.date.year) >= 16;
    });
    s.chars[founder].dead = true; s.player.charId = heir.id; s.player.dead = false; s.player.travel = null;
    ['harbor_admission','harbor_family_plan'].forEach(function (id) { FB.stories.get(id).day(s,s.stories[id]); });
    const before = JSON.stringify([s.stories,s.chars,s.player.gold,s.player.travel,s.armies]);
    for (let i = 0; i < 3; i++) FB.save.restore(JSON.parse(FB.save.serialize()));
    const now = FB.state;
    return {same:provenance === JSON.stringify(now.start.storyAttachments),
      stable:before === JSON.stringify([now.stories,now.chars,now.player.gold,now.player.travel,now.armies]),
      founder:now.stories.harbor_admission.actorId === founder && now.stories.harbor_family_plan.actorId === founder,
      noEnrollment:now.player.travel === null && now.stories.harbor_admission.roleId === null};
  });
  expect(result).toEqual({same:true,stable:true,founder:true,noEnrollment:true});
});

test('named household offering and adopted ruler restore use effective original tracks', async function ({page}, info) {
  const input = JSON.parse(JSON.stringify(require('../fixtures/authoring/existing-person-harbor.json')));
  const ruler = input.startScenarios.find(function (sc) { return sc.rulerRealmId; });
  const base = input.storyInstances.harbor_existing_track;
  input.storyInstances.harbor_ruler_review = Object.assign({},base,{id:'harbor_ruler_review',homeProvinceId:ruler.fixedProvinceId});
  input.storyInstances.harbor_replacement_review = Object.assign({},base,{id:'harbor_replacement_review'});
  ruler.tracks = ['harbor_ruler_review'];
  input.bookmarks.harbor_world.startTrackOverrides = {schema:1,entries:{
    harbor_existing_household:{tracks:['harbor_replacement_review']}, harbor_existing_ruler:{tracks:[]}}};
  await openGame(page, info);
  expect(await page.evaluate(function (input) { return FB.mods.validate(input); },input)).toEqual([]);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({name:'named-effective-tracks.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(input))});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks.harbor_world; });
  expect(await page.evaluate(function () {
    const sc = FBDATA.startScenarios.find(function (row) { return row.existingPerson; });
    return !!FB.existingPersonStartProfile(sc,FB.bookmark('harbor_world'));
  })).toBe(true);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('TRACKRULER-harbor_world-' + ruler.id + '-' + ruler.fixedProvinceId + '-m-Aren_Reed-standard');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  const result = await page.evaluate(function () {
    FB.game.setPaused(true);
    const s = FB.state, before = JSON.stringify([s.stories,s.chars,s.player.gold,s.start.storyAttachments]);
    for (let i = 0; i < 3; i++) FB.save.restore(JSON.parse(FB.save.serialize()));
    return {absent:!FB.state.stories || !FB.state.stories.harbor_ruler_review,
      tracks:FB.state.start.storyAttachments.tracks,
      stable:before === JSON.stringify([FB.state.stories,FB.state.chars,FB.state.player.gold,FB.state.start.storyAttachments])};
  });
  expect(result).toEqual({absent:true,tracks:[],stable:true});
});
