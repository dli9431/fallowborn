'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/ecclesiastical_profiles.js', 'js/government_ecclesiastical.js', 'js/ecclesiastical_strategies.js',
  'js/ecclesiastical_validation.js', 'js/local_office_appointments.js', 'js/ui_ecclesiastical.js',
  'data/story_courts_476.js',
  'index.html', 'data/bookmark_1204.js', 'data/bookmark_1204_campaigns.js',
  'data/bookmarks.js', 'data/counties.js', 'data/map_data.js',
  'data/settlements.js', 'data/settlements_real.js', 'data/geographies.js',
  'data/eras.js', 'data/starts.js', 'data/cultures.js', 'data/technology.js',
  'data/systems.js', 'data/story_campaigns.js', 'js/world.js', 'js/main.js',
  'data/distribution_crazygames.js', 'js/crazygames.js',
  'js/governments.js', 'js/authority.js', 'js/politics.js', 'js/population.js',
  'data/civic_profiles.js', 'js/government_civic.js', 'js/civic_transactions.js', 'js/civic_strategies.js', 'js/civic_conversion.js', 'js/civic_validation.js', 'js/story_government_selection.js',
  'js/technology.js', 'js/holywar.js', 'js/papacy.js', 'js/stories.js',
  'js/story_campaign.js', 'js/story_history.js', 'data/story_instances.js', 'js/wars.js', 'js/armies.js',
  'js/save.js', 'js/save_v4.js', 'js/events.js', 'js/ui_modals.js', 'js/localfolk.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { openCrazyGame } = require('../support/game/crazygames-title');
const { injectBrowserHarness } = require('../support/game/browser-harness');
const { advanceBookmark } = require('../support/game/bookmark-acceptance');

async function startBookmark(page, testInfo, scenario, county, identity, crazygames) {
  if (crazygames) await openCrazyGame(page, testInfo);
  else await openGame(page, testInfo);
  const faults = await page.evaluate(function () {
    FB.startProgression.noteTier(3);
    return FB.validateBookmark(FB.bookmark('1204'));
  });
  expect(faults).toEqual([]);
  const fullStart = page.locator('#btn-choose-beginning');
  if (await fullStart.isVisible()) await fullStart.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  const code = 'REVIEW1204-1204-' + (scenario || 'farmer') + '-' +
    (county || 'london') + '-m-Leo' + (identity ? '-standard-0-' + identity : '');
  await page.locator('#ng-seed').fill(code);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).press('Enter');
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  await page.evaluate(function () {
    FB.game.setPaused(true);
    FB.game.uiPrefs.hideTips = true;
    FB.game.uiPrefs.hideBeginnerHints = true;
    if (FB.ui.coachmarkReset) FB.ui.coachmarkReset();
    delete FB.state.player.flags.tutorial;
  });
  const expectedCode = await page.evaluate(function (input) {
    const p = FB.world.byId[input.county];
    return input.identity === p.culture + '.' + p.religion
      ? input.code.split('-').slice(0, 6).join('-') : input.code;
  }, { county:county || 'london', identity:identity, code:code });
  expect(await page.evaluate(function () { return FB.state.seed; })).toBe(expectedCode);
}

test('1204 is offered in the picker and ordinary start codes reach character creation', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const state = await page.evaluate(function () {
    const b = FBDATA.bookmarkCandidates['1204'];
    return { registered:FB.bookmark('1204') === b, offered:FB.bookmarks().map(function (b) { return b.id; }),
      faults:FB.validateBookmark(b), diagnostics:FB.communityShareDiagnostics(b),
      date:b.date, era:b.era, geography:b.geography, scripted:b.scripted,
      stories:b.stories.length, storiesRegistered:b.stories.every(function (id) { return !!FB.stories.get(id); }) };
  });
  expect(state).toMatchObject({ registered:true, faults:[], diagnostics:[],
    date:{ year:1204, season:0, day:76 }, era:'high_medieval', geography:'europe_regional',
    scripted:[], stories:16, storiesRegistered:true });
  expect(state.offered).toContain('1204');
  const fullStart = page.locator('#btn-choose-beginning');
  if (await fullStart.isVisible()) await fullStart.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await expect(page.locator('#bookmarklist')).toContainText('The Fall of Constantinople');
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('REVIEW1204-1204-serf-london-m-Leo');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  expect(await page.evaluate(function () { return FB.state; })).toBeNull();
});

for (const scenario of ['serf','farmer','apprentice','monk','soldier','knight','baron']) {
  test('1204 ' + scenario + ' starts through the high medieval scenario declaration and saves',
    async function ({ page }, testInfo) {
      await startBookmark(page, testInfo, scenario);
      const result = await page.evaluate(function () {
        const s = FB.state;
        const before = { start:JSON.parse(JSON.stringify(s.start)), seed:s.seed,
          owner:JSON.parse(JSON.stringify(s.owner)), holder:JSON.parse(JSON.stringify(s.holder)),
          stories:JSON.parse(JSON.stringify(s.stories)), population:JSON.parse(JSON.stringify(s.population)),
          character:s.player.charId, religion:s.realms.latin_1204.religion };
        const source = JSON.stringify(FBDATA.bookmarks['1066']);
        FB.save.restore(JSON.parse(FB.save.serialize()));
        const restored = FB.state;
        return { before:before, after:{ start:restored.start, seed:restored.seed,
          owner:restored.owner, holder:restored.holder, stories:restored.stories,
          population:restored.population, character:restored.player.charId,
          religion:restored.realms.latin_1204.religion },
          faults:FB.validateBookmark(FB.bookmark('1204')),
          sourceUnchanged:source === JSON.stringify(FBDATA.bookmarks['1066']),
          storyIds:Object.keys(restored.stories).sort() };
      });
      expect(result.after).toEqual(result.before);
      expect(result.before.start).toMatchObject({ id:'1204', era:'high_medieval', geography:'europe_regional' });
      expect(result.faults).toEqual([]);
      expect(result.sourceUnchanged).toBe(true);
      expect(result.storyIds).toHaveLength(16);
      expect(result.storyIds.every(function (id) { return id.endsWith('_1204'); })).toBe(true);
    });
}

test('spring possession, court faiths, technology, holder chains and settlement slots are independent',
  async function ({ page }, testInfo) {
    await startBookmark(page, testInfo, 'serf', 'constantinople', 'greek.orthodox');
    const result = await page.evaluate(function () {
      const s = FB.state, b = FB.bookmark('1204');
      const owners = {};
      ['constantinople','nicaea','thessaloniki','athens','sparta','candia','trebizond',
        'venezia','zadar','rouen','acre','jerusalem','fustat','baghdad','ikonion',
        'toledo','lisboa','silves','mallorca','tudela','brno','nitra','ani'].forEach(function (id) {
        owners[id] = s.owner[id];
      });
      return { owners:owners, people:['latin','nicaea','papacy','abbasid','ayyubid','rum'].map(function (id) {
        const r = id + '_1204';
        return [FB.realmRulerCharacterSnapshot(s, r).name, s.realms[r].religion];
      }), heads:['catholic','sunni'].map(function (faith) { return FB.religiousHeadOf(s, faith).id; }),
        systems:['papacy','great_holy_wars','tournaments','guild_elections','royal_council','estates']
          .map(function (id) { return FB.systemAvailable(s, id); }),
        holders:FB.world.provs.filter(function (p) { return !p.wasteland; }).every(function (p) {
          return !!s.holder[p.id] && FB.topRealm(s, s.holder[p.id]) === s.owner[p.id];
        }), knowledge:FB.bookmarkTechnologyFaults(b, 'high_medieval'),
        traditions:s.realms.latin_1204.techTraditions,
        known:FB.techList(s, 'latin_1204'),
        principal:[FB.world.byId.constantinople.culture,FB.world.byId.constantinople.religion],
        identity:[s.chars[s.player.charId].culture,s.chars[s.player.charId].religion],
        homeSite:FB.world.sitesByProv.aghmat.list[0].site,
        layoutDetached:FBDATA.settlementLayouts['1204'] !== FBDATA.settlementLayouts['1066'],
        structuresDetached:b.duchies !== FBDATA.bookmarks['1066'].duchies,
        code:s.seed };
    });
    expect(result.owners).toEqual({ constantinople:'latin_1204', nicaea:'nicaea_1204',
      thessaloniki:'thessalonica_1204', athens:'sgouros_1204', sparta:'morea_1204', candia:'crete_1204',
      trebizond:'trebizond_1204', venezia:'venice_1204', zadar:'venice_1204', rouen:'england_1204',
      acre:'jerusalem_1204', jerusalem:'ayyubid_1204', fustat:'ayyubid_1204', baghdad:'abbasid_1204',
      ikonion:'rum_1204', toledo:'castile_1204', lisboa:'portugal_1204', silves:'almohad_1204',
      mallorca:'balearic_1204', tudela:'navarre_1204', brno:'hre_1204', nitra:'hungary_1204', ani:'georgia_1204' });
    expect(result.people).toEqual([['Baldwin of Flanders','catholic'],['Theodore Laskaris','orthodox'],
      ['Innocent III','catholic'],['al-Nasir li-Din Allah','sunni'],['al-Adil I','sunni'],['Sulayman II','sunni']]);
    expect(result.heads).toEqual(['papacy_1204','abbasid_1204']);
    expect(result.systems).toEqual([true,true,true,true,true,true]);
    expect(result.holders).toBe(true);
    expect(result.knowledge).toEqual([]);
    expect(result.traditions).toEqual(['latin','byzantine']);
    expect(result.known).toContain('mail_hauberks');
    expect(result.known).not.toContain('plate_armor');
    expect(result.principal).toEqual(['greek','orthodox']);
    expect(result.identity).toEqual(['greek','orthodox']);
    expect(result.homeSite).toBe('geo_marrakesh_2542997');
    expect(result.layoutDetached && result.structuresDetached).toBe(true);
    expect(result.code).toBe('REVIEW1204-1204-serf-constantinople-m-Leo');
  });

test('the silent English distribution retains the same world and save identity',
  async function ({ page }, testInfo) {
    await page.addInitScript(function () {
      window.FB_DISTRIBUTION = 'crazygames';
      window.FB_CRAZYGAMES_STORAGE = 'localstorage';
    });
    await startBookmark(page, testInfo, null, null, null, true);
    const result = await page.evaluate(function () {
      const source = JSON.parse(FB.save.serialize());
      FB.save.restore(source);
      return { flag:FB.platform.isCrazyGames, bookmark:FB.state.start.id,
        owner:FB.state.owner.constantinople, head:FB.religiousHeadOf(FB.state, 'catholic').id,
        registered:!!FB.bookmark('1204'),
        stories:Object.keys(FB.state.stories).length,
        message:FB.renderMessage(FB.msg('news.1204.latin_thessalonica_1204.won',
          FBDATA.bookmarkContent['1204'].campaigns.latin_thessalonica_1204.news.won.text,
          { realm:'Latin Empire', province:'Thessalonica' }), { state:FB.state }) };
    });
    expect(result).toEqual({ flag:true, bookmark:'1204', owner:'latin_1204', head:'papacy_1204',
      registered:true, stories:16,
      message:'The court of Latin Empire secures Thessalonica through its campaign.' });
  });

test('holy-war calls resolve only current hostile objectives and remain durable through save',
  async function ({ page }, testInfo) {
    await startBookmark(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const targets = FB.greatHolyWarTargets(s, 'catholic');
      const first = targets[0];
      const valid = targets.length > 0 && targets.every(function (target) {
        return !!FBDATA.kingdoms[target.kingdomId] && target.objectiveCounties.length > 0 &&
          target.objectiveCounties.every(function (id) { return !!FB.world.byId[id] && !!s.owner[id]; });
      });
      const called = !!(first && FB.callGreatHolyWar(s, 'catholic', first.kingdomId, 'papacy_1204'));
      const snapshot = JSON.parse(JSON.stringify(s.greatHolyWar));
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { valid:valid, called:called, objectives:first.objectiveCounties,
        holy:first.holyCounties, snapshot:snapshot, restored:FB.state.greatHolyWar,
        scripture:FB.bookmark('1204').scripted };
    });
    expect(result.valid && result.called).toBe(true);
    expect(result.holy).toContain('jerusalem');
    expect(result.objectives).toContain('jerusalem');
    expect(result.objectives).not.toContain('acre');
    expect(result.restored).toEqual(result.snapshot);
    expect(result.scripture).toEqual([]);
  });

for (const compatible of [false, true]) {
  test('Latin partition campaign uses actual control and closes once: ' + compatible,
    async function ({ page }, testInfo) {
      await startBookmark(page, testInfo);
      const result = await page.evaluate(function (compatible) {
        let s = FB.state;
        const id = 'latin_thessalonica_1204', story = FB.stories.get(id);
        if (!compatible) FB.transferProvince(s, 'constantinople', 'nicaea_1204');
        const before = s.owner.thessaloniki;
        story.day(s, s.stories[id]);
        const rec = s.stories[id], phase = rec.phase;
        const unchanged = s.owner.thessaloniki === before;
        const war = rec.warId && FB.ordinaryWarById(s, rec.warId);
        if (compatible) {
          FB.transferProvince(s, 'thessaloniki', 'latin_1204');
          FB.settleOrdinaryWar(s, rec.warId, 'victory');
          story.day(s, rec);
        }
        const completed = JSON.parse(JSON.stringify(rec));
        FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
        story.day(s, s.stories[id]);
        return { phase:phase, unchanged:unchanged, objective:war ? war.objectives[0].target : null,
          completed:completed, restored:s.stories[id], result:s.stories[id].result };
      }, compatible);
      expect(result.phase).toBe(compatible ? 'started' : 'resolved');
      expect(result.unchanged).toBe(true);
      expect(result.objective).toBe(compatible ? 'thessaloniki' : null);
      expect(result.result).toBe(compatible ? 'won' : 'diverted');
      expect(result.restored).toEqual(result.completed);
    });
}

test('one season of ordinary household play retains a valid world and saves at the midpoint',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served', 'Run the bounded natural journey once; smoke covers every browser project.');
    await startBookmark(page, testInfo);
    await injectBrowserHarness(page);
    await page.evaluate(function () { FB.game.auto.all = true; FB.game.auto.style = 'first'; });
    // Keep seeded mortality, diplomacy, personal events, holy wars and ordinary
    // campaigns. Only the standard player automation makes daily choices.
    for (let half = 0; half < 2; half++) {
      await advanceBookmark(page, 45);
      if (half === 0) await page.evaluate(function () {
        FB.save.restore(JSON.parse(FB.save.serialize()));
      });
    }
    const end = await page.evaluate(function () {
      const s = FB.state;
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { year:FB.state.date.year, turn:FB.state.turn, errors:FBTEST.checkInvariants(),
        ordinary:!FB.game.observe, start:FB.state.start.id, stories:Object.keys(s.stories).length };
    });
    expect(end).toEqual({ year:1204, turn:90, errors:[], ordinary:true, start:'1204', stories:16 });
  });
