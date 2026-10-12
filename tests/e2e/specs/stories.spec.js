'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/story_courts_476.js',
  'index.html', 'js/starts.js', 'js/story_track.js', 'js/stories.js', 'js/story_campaign.js', 'data/story_instances.js',
  'js/bookmark_setup.js', 'js/story_agreements.js',
  'data/bookmark_800_history.js', 'js/story_settlements.js', 'js/royal_settlements.js',
  'data/story_campaigns.js', 'data/story_campaigns_711.js', 'js/story_courts.js',
  'data/bookmark_493.js', 'data/bookmark_493_history.js',
  'data/bookmark_1204_campaigns.js', 'js/story_history.js',
  'js/story_polity_foundation.js', 'js/rebellions.js',
   'js/main.js', 'js/save.js', 'js/save_v4.js',
  'js/i18n.js', 'js/ui_panels.js', 'js/world.js',
  'data/starts.js', 'data/bookmarks.js', 'data/bookmark_476.js', 'data/bookmark_476_wider.js',
  'data/bookmark_476_italy.js', 'data/bookmark_476_dalmatia_east.js',
  'data/bookmark_476_gaul_iberia.js', 'data/bookmark_476_africa.js', 'data/eras.js', 'data/political_institutions.js',
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

const WORLD_STORIES = ['western_court_476','zeno_return_476','clovis_syagrius_476',
  'theoderic_italy_476','eastern_africa_476','eastern_italy_476','western_office_476','rugian_frontier_476',
  'sicilian_tribute_476','norican_evacuation_476','thracian_pressure_476','amal_epirus_476',
  'clovis_alamanni_476','suevic_frontier_476','cantabrian_campaign_476',
  'vasconian_campaign_476','gallaecian_campaign_476'];

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
    // The catalogue lists before/after batches before their data anchors.
    // Assert their dispatch boundaries even when a batch has no requires.
    const expectedOrder = ['divisio_800','ordinatio_800','gifts_800','recognition_800','verdun_800']
      .concat(WORLD_STORIES.filter(function (id) { return id !== 'western_office_476'; }))
      .concat(['alamannic_campaign_493','burgundian_campaign_493','visigothic_campaign_493',
        'sirmium_campaign_493','african_campaign_493','italian_campaign_493',
        'strait_crossing_711','toledo_campaign_711','septimania_campaign_711',
        'gaul_campaign_711','barcelona_800','danish_friesland_800',
        'abbasid_anatolia_800','italian_lagoon_800','latin_thessalonica_1204','nicaean_return_1204',
        'bulgarian_thrace_1204','epirote_macedonia_1204','castilian_frontier_1204',
        'portuguese_algarve_1204','aragonese_valencia_1204','capetian_normandy_1204',
        'thessalonica_partition_1204','athens_partition_1204','achaia_partition_1204',
        'latin_athens_1204','latin_achaia_1204','fifth_crusade_call_1204','latin_bithynia_1204',
        'western_office_476','asturias_foundation_711']).map(function (id) { return id + ':world'; })
      .concat(['federate_track_476:track','curialis_track_476:track','nepos_track_476:track']);
    expect(result.order.filter(function (entry) { return expectedOrder.includes(entry); })).toEqual(expectedOrder);
    expect(new Set(result.order).size).toBe(result.order.length);
    expect(result.world).toBe(true);
    expect(result.unknown).toBeNull();
    expect(result.late).toContain('load time only');
    expect(result.registered).toBe(false);
    expect(result.bookmark).toEqual(WORLD_STORIES.concat(['cashel_recognition_476']));
    expect(result.tracks).toEqual(['peroz_476:','nepos_476:nepos_track_476','federate_476:federate_track_476','curialis_476:curialis_track_476','peroz_sasanian_476:']);
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
        delete copy.state.situation476.railsSchema;
        delete copy.state.stories;
        // This legacy format predates opening records and their story references.
        delete copy.state.bookmarkSetup;
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
        world:Object.keys(world).every(function (key) {
          return JSON.stringify(once.state.stories.western_court_476[key]) === JSON.stringify(world[key]);
        }) && Object.keys(once.state.stories.western_court_476).length === Object.keys(world).length,
        track:JSON.stringify(once.state.stories.federate_track_476) === JSON.stringify(track),
        dropped:!own(once.state, 'situation476'),
        noOpening:!own(live, 'bookmarkSetup'),
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
      immutable:true, world:true, track:true, dropped:true, noOpening:true, idempotent:true,
      restored:WORLD_STORIES.filter(function (id) { return !['rugian_frontier_476','sicilian_tribute_476','norican_evacuation_476',
        'thracian_pressure_476','amal_epirus_476','clovis_alamanni_476','suevic_frontier_476',
        'cantabrian_campaign_476','vasconian_campaign_476','gallaecian_campaign_476'].includes(id); })
        .concat(['federate_track_476']).join(','), phase:'delegate',
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
    // Seven 476 starts (federate, colonus, curialis, three free households and
    // the Pontic household) plus the Observe card; hidden ruler starts stay out.
    await expect(cards).toHaveCount(8);
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
