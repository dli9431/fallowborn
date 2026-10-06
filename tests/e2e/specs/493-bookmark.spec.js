'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'data/bookmark_493.js', 'data/bookmark_493_history.js',
  'data/bookmark_476.js', 'data/bookmark_476_italy.js',
  'data/bookmark_476_dalmatia_east.js', 'data/bookmark_476_gaul_iberia.js',
  'data/bookmark_476_africa.js', 'data/bookmarks.js', 'data/counties.js',
  'data/geographies.js', 'data/settlements.js', 'data/political_institutions.js',
  'data/starts.js', 'data/cultures.js', 'data/eras.js', 'data/systems.js',
  'data/story_campaigns.js', 'data/technology.js', 'js/bookmark_setup.js',
  'js/stories.js', 'js/story_campaign.js', 'js/story_476_rails.js',
  'js/world.js', 'js/model.js', 'js/governments.js', 'js/authority.js',
  'js/institutions.js', 'js/religion.js', 'js/systems.js', 'js/technology.js',
  'js/main.js', 'js/starts.js', 'js/save.js', 'js/save_v4.js',
  'js/politics.js', 'js/treasury.js', 'js/armies.js', 'js/wars.js',
  'js/events.js', 'js/ui_modals.js', 'js/crazygames.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { openCrazyGame } = require('../support/game/crazygames-title');
const { startParityGame } = require('../support/game/parity');
const { injectBrowserHarness } = require('../support/game/browser-harness');

const CAMPAIGNS = ['alamannic_campaign_493', 'burgundian_campaign_493',
  'visigothic_campaign_493', 'sirmium_campaign_493',
  'african_campaign_493', 'italian_campaign_493'];

async function start(page, testInfo, scenario, crazygames, family) {
  if (crazygames) {
    await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
    await openCrazyGame(page, testInfo);
  } else await openGame(page, testInfo);
  const faults = await page.evaluate(function () {
    // Owner review exposes this date only in the fresh test context.
    FBDATA.bookmarks['493'].hidden = false;
    return FB.validateBookmark(FB.bookmark('493'));
  });
  expect(faults).toEqual([]);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  const county = scenario === 'cleric_493' ? 'roma' : 'ravenna';
  await page.locator('#ng-seed').fill('RAVENNA493-493-' + scenario + '-' + county +
    '-m-Marcus-' + (family || 'standard') + '-0-roman.nicene');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  await expect(page.locator('#game:not(.hidden)')).toBeVisible();
  await page.evaluate(function () {
    FB.game.setPaused(true); FB.game.uiPrefs.hideTips = true;
    FB.game.uiPrefs.hideBeginnerHints = true; FB.ui.coachmarkReset();
    delete FB.state.player.flags.tutorial;
  });
}

test('493 is a registered independent hidden review candidate at every new-campaign entry point',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const definition = await page.evaluate(function () {
      const b = FB.bookmark('493'), bytes = JSON.stringify(b);
      const earlier = FBDATA.bookmarks['476'];
      const ruler = earlier.realms[0].ruler.name;
      const owner = earlier.provinces[0].realm;
      const incumbent = earlier.localInstitutions.rome_see.historicalName;
      let independent;
      try {
        earlier.realms[0].ruler.name = 'Review replacement';
        earlier.provinces[0].realm = 'review_replacement';
        earlier.localInstitutions.rome_see.historicalName = 'Earlier replacement';
        independent = bytes === JSON.stringify(b);
      } finally {
        earlier.realms[0].ruler.name = ruler;
        earlier.provinces[0].realm = owner;
        earlier.localInstitutions.rome_see.historicalName = incumbent;
      }
      return { hidden:b.hidden, faults:FB.validateBookmark(b), independent:independent,
        offered:FB.bookmarks().some(function (row) { return row.id === '493'; }),
        inspectable:FB.bookmarks(true).some(function (row) { return row.id === '493'; }),
        stories:b.stories, registered:b.stories.every(function (id) { return !!FB.stories.get(id); }) };
    });
    expect(definition).toEqual({ hidden:true, faults:[], independent:true,
      offered:false, inspectable:true, stories:CAMPAIGNS, registered:true });
    const full = page.locator('#btn-choose-beginning');
    if (await full.isVisible()) await full.click();
    else await page.getByRole('button', { name:'New Game', exact:true }).click();
    await expect(page.locator('#bookmarklist')).not.toContainText('The Ravenna Settlement');
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('RAVENNA493-493-farmer_493-ravenna-m-Marcus');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#ng-seed-err')).toContainText('hidden for new campaigns');
    await page.locator('#ng-cancel').click();
    expect(await page.evaluate(function () {
      return new Promise(function (resolve) {
        FB.activateBookmark('493', null, function (error) { resolve(error && error.message || null); });
      });
    })).toBeNull();
    const rejected = await page.evaluate(function () {
      FB.game.pending = { bookmarkId:'493', seed:'RAVENNA493', provinceId:'ravenna',
        scenario:FBDATA.startScenarios.find(function (s) { return s.id === 'farmer_493'; }) };
      const state = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
      return { start:FB.game.start(), observe:FB.game.startObserve(),
        unchanged:FB.state === state && FB.getRngState() === rng && FB.getUidCounter() === uid };
    });
    expect(rejected).toEqual({ start:false, observe:false, unchanged:true });
  });

for (const scenario of ['farmer_493', 'craftsman_493', 'cleric_493', 'curialis_493']) {
  test('493 ' + scenario + ' boots, keeps date-specific offices and completes an ordinary smoke journey',
    async function ({ page }, testInfo) {
      await start(page, testInfo, scenario);
      await injectBrowserHarness(page);
      const result = await page.evaluate(function () {
        const s = FB.state, setup = s.bookmarkSetup;
        const prefect = s.authority.appointments.find(function (row) {
          return row.id === setup.appointments.liberius_prefecture.id;
        });
        const before = JSON.stringify([s.bookmarkSetup, s.stories, s.localInstitutions]);
        FB.save.restore(JSON.parse(FB.save.serialize()));
        const retained = before === JSON.stringify([FB.state.bookmarkSetup, FB.state.stories, FB.state.localInstitutions]);
        const run = FBTEST.advanceDays({ days:30, maxDays:30, maxEvents:80, checkEvery:10 });
        return { bookmark:s.start.id, year:s.start.year, advanced:run.advanced,
          rulers:['ostrogoths_493','east_493','vandals_493','franks_493','visigoths_493']
            .map(function (id) { return FB.realmRulerCharacterSnapshot(s, id).name; }),
          owners:['ravenna','split','siracusa','laon','geneva','sirmium']
            .map(function (pid) { return s.owner[pid]; }),
          heads:['rome_bishop','constantinople_patriarch','carthage_bishop']
            .map(function (id) { return FB.religiousOfficeSnapshot(s, id).name; }),
          prefect:prefect.officeId === 'praetorian_prefect' && prefect.scope.kind === 'realm' &&
            prefect.scope.id === 'ostrogoths_493' && prefect.holder.id === setup.actors.liberius,
          cast:!s.stories.western_court_476 && !s.realms.federates_476 && !s.realms.croatia,
          disabled:['papacy','great_holy_wars','manorial_tenure','feudal_service','scutage','tournaments']
            .every(function (id) { return !FB.systemEnabled(s, id); }),
          retained:retained, errors:FBTEST.checkInvariants(), valid:FB.save.v4.validatePlatform(FB.state) };
      });
      expect(result).toEqual({ bookmark:'493', year:493, advanced:30,
        rulers:['Theoderic','Anastasius I','Gunthamund','Clovis','Alaric II'],
        owners:['ostrogoths_493','ostrogoths_493','ostrogoths_493','franks_493','godegisel_493','gepids_493'],
        heads:['Gelasius I','Euphemius','Eugenius'], prefect:true, cast:true,
        disabled:true, retained:true, errors:[], valid:true });
    });
}

test('493 ordinary CrazyGames-flag creation retains the same independent opening and save',
  async function ({ page }, testInfo) {
    await start(page, testInfo, 'farmer_493', true);
    const result = await page.evaluate(function () {
      const before = JSON.stringify([FB.state.bookmarkSetup, FB.state.stories, FB.state.religiousHeads]);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { flagged:FB.platform.isCrazyGames, date:FB.state.start.id,
        same:before === JSON.stringify([FB.state.bookmarkSetup, FB.state.stories, FB.state.religiousHeads]),
        valid:FB.save.v4.validatePlatform(FB.state) };
    });
    expect(result).toEqual({ flagged:true, date:'493', same:true, valid:true });
  });

test('476 and 493 retain their own incumbents in both activation orders and hidden save loads',
  async function ({ page }, testInfo) {
    test.setTimeout(120000);
    await startParityGame(page, testInfo, { bookmark:'476',
      code:'DATES-476-curialis_476-ravenna-m-Marcus-standard-0-roman.nicene' });
    const earlier = await page.evaluate(function () { return FB.save.serialize(); });
    await start(page, testInfo, 'curialis_493');
    const later = await page.evaluate(function () { return FB.save.serialize(); });
    await page.evaluate(function () { FBDATA.bookmarks['493'].hidden = true; });
    for (const entry of [{ json:earlier, date:'476', rome:'Simplicius', east:'Acacius' },
      { json:later, date:'493', rome:'Gelasius I', east:'Euphemius' },
      { json:earlier, date:'476', rome:'Simplicius', east:'Acacius' },
      { json:later, date:'493', rome:'Gelasius I', east:'Euphemius' }]) {
      expect(await page.evaluate(function (json) { return FB.game.loadData(JSON.parse(json)); }, entry.json)).toBe(true);
      await expect(page.locator('#game:not(.hidden)')).toBeVisible();
      const result = await page.evaluate(function (json) {
        const s = FB.state, saved = JSON.parse(json).state;
        return { date:s.start.id, rome:FB.religiousOfficeSnapshot(s, 'rome_bishop').name,
          east:FB.religiousOfficeSnapshot(s, 'constantinople_patriarch').name,
          actors:JSON.stringify(s.bookmarkSetup) === JSON.stringify(saved.bookmarkSetup),
          ledger:JSON.stringify(s.localInstitutions) === JSON.stringify(saved.localInstitutions),
          stories:JSON.stringify(s.stories) === JSON.stringify(saved.stories),
          count:Object.keys(s.chars).length === Object.keys(saved.chars).length };
      }, entry.json);
      expect(result).toEqual({ date:entry.date, rome:entry.rome, east:entry.east,
        actors:true, ledger:true, stories:true, count:true });
    }
  });

for (const id of CAMPAIGNS) {
  test('493 ' + id + ' requires actual possession and records a durable ordinary-war outcome',
    async function ({ page }, testInfo) {
      await start(page, testInfo, 'farmer_493');
      const result = await page.evaluate(function (id) {
        let s = FB.state;
        const def = FBDATA.storyCampaigns493[id], story = FB.stories.get(id);
        s.date = { year:def.firstYear, season:0, day:1 };
        s.turn = (def.firstYear - 493) * 360;
        // Supply only the Italian campaign's separately earned African prerequisite.
        if (id === 'italian_campaign_493') FB.transferProvince(s, 'tunis', 'east_493');
        const pending = FB.save.serialize(), owner = JSON.stringify(s.owner);
        story.day(s, s.stories[id]);
        const rec = s.stories[id], started = rec.phase;
        const ordinary = !!FB.ordinaryWarById(s, rec.warId);
        const noAward = owner === JSON.stringify(s.owner);
        // Stage the ordinary conquest boundary; this is not a siege simulation.
        FB.transferProvince(s, def.target.provinceId, def.actor.realmId);
        FB.settleOrdinaryWar(s, rec.warId, 'victory');
        story.day(s, rec);
        const completed = JSON.stringify(rec);
        FB.save.restore(JSON.parse(FB.save.serialize()));
        story.day(FB.state, FB.state.stories[id]);
        const durable = completed === JSON.stringify(FB.state.stories[id]);
        FB.save.restore(JSON.parse(pending)); s = FB.state;
        // A real change of capital possession closes this date's opportunity.
        const condition = def.conditions[0];
        FB.transferProvince(s, condition.provinceId, 'armorica_493');
        const changed = JSON.stringify(s.owner);
        story.day(s, s.stories[id]);
        return { started:started, ordinary:ordinary, noAward:noAward,
          result:JSON.parse(completed).result, durable:durable,
          divergence:s.stories[id].result, unchanged:changed === JSON.stringify(s.owner) };
      }, id);
      expect(result).toEqual({ started:'started', ordinary:true, noAward:true,
        result:'won', durable:true, divergence:'diverted', unchanged:true });
    });
}

for (const outcome of ['failed','interrupted']) {
  test('493 a ' + outcome + ' campaign remains terminal across restore', async function ({ page }, testInfo) {
    await start(page, testInfo, 'farmer_493');
    const result = await page.evaluate(function (outcome) {
      const s = FB.state, id = 'visigothic_campaign_493', story = FB.stories.get(id);
      s.date = { year:507, season:0, day:1 }; s.turn = 14 * 360;
      story.day(s, s.stories[id]);
      const rec = s.stories[id], phase = rec.phase, owners = JSON.stringify(s.owner);
      if (outcome === 'failed') FB.settleOrdinaryWar(s, rec.warId, 'defeat');
      else s.chars[rec.actorId].dead = true;
      story.day(s, rec);
      const bytes = JSON.stringify(rec);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      story.day(FB.state, FB.state.stories[id]);
      return { started:phase, result:FB.state.stories[id].result,
        durable:bytes === JSON.stringify(FB.state.stories[id]), unchanged:owners === JSON.stringify(FB.state.owner) };
    }, outcome);
    expect(result).toEqual({ started:'started', result:outcome, durable:true, unchanged:true });
  });
}

test('493 completes ten years of ordinary household play with midpoint and hidden final saves',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served', 'Run the bounded natural journey once; smoke covers every browser project.');
    test.setTimeout(10 * 60 * 1000);
    await start(page, testInfo, 'farmer_493', false, 'established');
    await injectBrowserHarness(page);
    await page.evaluate(function () { FB.game.auto.all = true; FB.game.auto.style = 'first'; });
    for (let quarter = 0; quarter < 40; quarter++) {
      const result = await page.evaluate(function () {
        const target = FB.state.turn + 90;
        for (let attempts = 0; attempts < 120 && FB.state.turn < target; attempts++) {
          if (FB.state.player.dead) {
            const heirs = FB.heirsOf(FB.state);
            if (!heirs.length) throw new Error('The natural 493 dynasty ended before its review boundary.');
            FB.ui.closeModal(); FB.game.succeedTo(heirs[0].id); FB.ui.closeModal();
            FB.game.auto.all = true;
          }
          FB.game.passDay({ deferUi:true });
        }
        return { remaining:target - FB.state.turn, errors:FBTEST.checkInvariants() };
      });
      expect(result).toEqual({ remaining:0, errors:[] });
      if (quarter === 19) await page.evaluate(function () { FB.save.restore(JSON.parse(FB.save.serialize())); });
    }
    const end = await page.evaluate(function () {
      const stories = JSON.stringify(FB.state.stories);
      FBDATA.bookmarks['493'].hidden = true;
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { year:FB.state.date.year, turn:FB.state.turn, ordinary:!FB.game.observe,
        bookmark:FB.state.start.id, stories:stories === JSON.stringify(FB.state.stories),
        errors:FBTEST.checkInvariants(), valid:FB.save.v4.validatePlatform(FB.state) };
    });
    expect(end).toEqual({ year:503, turn:3600, ordinary:true, bookmark:'493',
      stories:true, errors:[], valid:true });
  });
