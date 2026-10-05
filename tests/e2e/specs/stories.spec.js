'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'js/stories.js', 'js/story_western_court_476.js',
  'js/story_federate_track_476.js', 'js/main.js', 'js/save.js', 'js/save_v4.js',
  'js/i18n.js', 'js/ui_panels.js', 'js/world.js',
  'data/starts.js', 'data/bookmarks.js', 'data/bookmark_476.js', 'data/eras.js',
  'data/actions.js', 'js/actions.js', 'js/systems.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');

async function startCode(page, testInfo, code) {
  await openGame(page, testInfo);
  await page.evaluate(function () { FB.startProgression.noteTier(3); });
  const fullStartButton = page.locator('#btn-choose-beginning');
  if (await fullStartButton.isVisible()) await fullStartButton.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(code);
  await page.locator('#ng-seed').press('Enter');
}

async function begin(page, testInfo, code) {
  await startCode(page, testInfo, code);
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
}

const CODE_476 = 'STORIES-476-federate_476-ravenna-m-Marcus-standard-0-gothic.homoian';

for (const bookmark of ['867', '1066']) {
  test(bookmark + ' campaigns attach no story and show no story card',
    async function ({ page }, testInfo) {
      await begin(page, testInfo, 'STORIES-' + bookmark + '-serf-london-f-Ada');
      await page.locator('[data-tab="actions"]').click();
      const result = await page.evaluate(function () {
        const s = FB.state, before = JSON.stringify(s), rng = FB.getRngState();
        FB.stories.day(s);
        FB.stories.season(s);
        FB.stories.year(s);
        return { has:Object.prototype.hasOwnProperty.call(s, 'stories'),
          attached:FB.stories.attached(s), cards:FB.stories.cards(s),
          saved:JSON.parse(FB.save.serialize()).state.stories,
          untouched:before === JSON.stringify(s) && rng === FB.getRngState() };
      });
      expect(result).toEqual({ has:false, attached:[], cards:[], saved:undefined,
        untouched:true });
      await expect(page.locator('[data-story-card]')).toHaveCount(0);
    });
}

test('stories register in order at load time only and resolve by id',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      let late = '';
      try {
        FB.stories.register({ id:'late_story', kind:'world', init:function () { return {}; } });
      } catch (error) { late = error.message; }
      return {
        order:FB.stories.list().map(function (story) { return story.id + ':' + story.kind; }),
        world:!!FB.stories.get('western_court_476'), unknown:FB.stories.get('missing_story'),
        late:late, registered:!!FB.stories.get('late_story'),
        bookmark:FBDATA.bookmarks['476'].stories,
        tracks:FBDATA.startScenarios.filter(function (sc) {
          return sc.tracks;
        }).map(function (sc) { return sc.id + ':' + sc.tracks.join(','); })
      };
    });
    expect(result.order).toEqual(['western_court_476:world', 'federate_track_476:track']);
    expect(result.world).toBe(true);
    expect(result.unknown).toBeNull();
    expect(result.late).toContain('load time only');
    expect(result.registered).toBe(false);
    expect(result.bookmark).toEqual(['western_court_476']);
    expect(result.tracks).toEqual(['federate_476:federate_track_476']);
  });

test('a branch save holding state.situation476 migrates once into both story records',
  async function ({ page }, testInfo) {
    await begin(page, testInfo, CODE_476);
    const result = await page.evaluate(function () {
      const own = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
      const source = JSON.parse(FB.save.serialize());
      const world = source.state.stories.western_court_476;
      const track = source.state.stories.federate_track_476;
      function legacyOf(data, overrides) {
        const copy = JSON.parse(JSON.stringify(data));
        copy.state.situation476 = Object.assign({},
          copy.state.stories.western_court_476,
          copy.state.stories.federate_track_476, overrides || {});
        delete copy.state.stories;
        return copy;
      }
      const legacy = legacyOf(source);
      const bytes = JSON.stringify(legacy);
      const once = FB.save.v4.migrate(legacy);
      const twice = FB.save.v4.migrate(once);
      FB.save.restore(legacy);
      const live = FB.state;
      /* A household that declined owns no bargain: the courts' contract and
         recognitions move to the world story, and an AI result reads as declined. */
      const outside = FB.save.v4.migrate(legacyOf(source, { role:'outside',
        phase:'complete', result:'ai_negotiated', contractId:'federate-9',
        civicRecognitionId:'recognition-8', churchRecognitionId:'recognition-7',
        aiResolution:'negotiated' })).state.stories;
      const both = JSON.parse(JSON.stringify(source));
      both.state.situation476 = Object.assign({}, world, track);
      let conflict = '';
      try { FB.save.v4.migrate(both); } catch (error) { conflict = error.message; }
      return {
        immutable:bytes === JSON.stringify(legacy),
        world:JSON.stringify(once.state.stories.western_court_476) === JSON.stringify(world),
        track:JSON.stringify(once.state.stories.federate_track_476) === JSON.stringify(track),
        dropped:!own(once.state, 'situation476'),
        idempotent:JSON.stringify(once) === JSON.stringify(twice),
        restored:!own(live, 'situation476') && FB.stories.attached(live).join(','),
        phase:live.stories.federate_track_476.phase,
        outsideTrack:[outside.federate_track_476.result, outside.federate_track_476.role,
          own(outside.federate_track_476, 'contractId')],
        outsideWorld:[outside.western_court_476.contractId,
          outside.western_court_476.civicRecognitionId,
          outside.western_court_476.churchRecognitionId,
          outside.western_court_476.aiResolution],
        conflict:conflict
      };
    });
    expect(result).toEqual({
      immutable:true, world:true, track:true, dropped:true, idempotent:true,
      restored:'western_court_476,federate_track_476', phase:'delegate',
      outsideTrack:['declined', 'outside', false],
      outsideWorld:['federate-9', 'recognition-8', 'recognition-7', 'negotiated'],
      conflict:result.conflict
    });
    expect(result.conflict).toContain('state.situation476');
  });

test('invalid story records are rejected before adoption',
  async function ({ page }, testInfo) {
    await begin(page, testInfo, CODE_476);
    const result = await page.evaluate(function () {
      const source = FB.save.serialize();
      return [
        function (d) { delete d.state.stories.federate_track_476.phase; },
        function (d) { d.state.stories.western_court_476.courtAt = 3; }
      ].map(function (change) {
        const input = JSON.parse(source), live = FB.state;
        change(input);
        let message = '';
        try { FB.save.restore(input); } catch (error) { message = error.message; }
        return { message:message, unchanged:FB.state === live };
      });
    });
    expect(result[0].message).toContain('state.stories.federate_track_476.phase');
    expect(result[1].message).toContain('state.stories.western_court_476.courtAt');
    expect(result.every(function (row) { return row.unchanged; })).toBe(true);
  });

test('the start picker and family presets follow scenario data',
  async function ({ page }, testInfo) {
    await startCode(page, testInfo, CODE_476);
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    const family = page.locator('#cg-family label');
    await expect(family).toHaveCount(1);
    await expect(family).toContainText('Free household');
    await expect(family).toContainText('age 24 · federate service');
    await expect(page.locator('input[name=cg-family][value="standard"]')).toBeChecked();
    await page.locator('#btn-cg-back').click();
    const cards = page.locator('#scenariolist .scencard');
    await expect(cards).toHaveCount(2);
    const federate = cards.filter({ hasText:'Federate Soldier' });
    await expect(federate).toHaveCount(1);
    await expect(federate).not.toHaveClass(/locked/);
    await expect(cards.filter({ hasText:'Observe' })).toHaveCount(1);

    for (const code of ['STORIES-476-serf-ravenna-m-Marcus',
      'STORIES-476-federate_476-ravenna-m-Marcus-elder-0-gothic.homoian',
      'STORIES-867-federate_476-ravenna-m-Marcus']) {
      await startCode(page, testInfo, code);
      await expect(page.locator('#ng-seed-err')).toHaveText(
        'That start code doesn’t parse — check it was copied whole.');
      await expect(page.locator('#chargen')).toHaveClass(/hidden/);
    }

    /* Scenarios without a familyPresets map keep every shape. */
    await startCode(page, testInfo, 'STORIES-867-farmer-london-m-Ada-elder');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await expect(page.locator('#cg-family label')).toHaveCount(3);
    await expect(page.locator('input[name=cg-family][value="elder"]')).toBeChecked();
  });
