'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { openCrazyGame } = require('../support/game/crazygames-title');
const { injectBrowserHarness } = require('../support/game/browser-harness');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'data/bookmark_800.js', 'data/bookmark_800_history.js',
  'data/bookmarks.js', 'data/map_data.js', 'data/counties.js',
  'data/geographies.js', 'data/settlements.js', 'data/settlements_real.js',
  'data/eras.js', 'data/starts.js', 'data/technology.js', 'data/ambitions.js',
  'data/cultures.js', 'data/papacy.js', 'data/story_campaigns.js',
  'data/distribution_crazygames.js', 'js/crazygames.js', 'js/systems.js', 'data/systems.js',
  'js/world.js', 'js/governments.js', 'js/station.js', 'js/starts.js',
  'js/stories.js', 'js/story_campaign.js', 'js/story_476_rails.js',
  'js/royal_settlements.js', 'js/story_carolingian_800.js', 'js/treasury.js', 'js/authority.js', 'js/model.js',
  'js/papacy.js', 'js/technology.js', 'js/ambitions.js', 'js/wars.js', 'js/localfolk.js',
  'js/armies.js', 'js/main.js', 'js/save.js', 'js/save_v4.js'
]);

const RAILS = ['barcelona_800', 'danish_friesland_800',
  'abbasid_anatolia_800', 'italian_lagoon_800'];
const STORIES = ['carolingian_settlements_800'].concat(RAILS);

test('CrazyGames offers 800 in its live start registry', async function ({ page }, testInfo) {
  await page.addInitScript(function () {
    window.FB_DISTRIBUTION = 'crazygames';
    window.FB_CRAZYGAMES_STORAGE = 'localstorage';
  });
  await openCrazyGame(page, testInfo);
  const result = await page.evaluate(function () {
    return { registered:!!FB.bookmark('800'),
      selectable:FB.bookmarks().some(function (row) { return row.id === '800'; }),
      candidate:!!FBDATA.bookmarkCandidates['800'],
      faults:FB.validateBookmark(FBDATA.bookmarkCandidates['800']),
      stories:FBDATA.bookmarkCandidates['800'].stories.every(function (id) {
        return FB.stories.get(id).kind === 'world';
      }) };
  });
  expect(result).toEqual({ registered:true, selectable:true, candidate:true, faults:[], stories:true });
});

async function observe(page, testInfo) {
  await openGame(page, testInfo);
  const error = await page.evaluate(function () {
    return new Promise(function (resolve) {
      FB.activateBookmark('800', null, function (fault) {
        if (fault) { resolve(fault.message); return; }
        FB.game.pending = { seed:'CORONATION-800-OBSERVER' };
        FB.game.startObserve();
        FB.game.setPaused(true);
        resolve(null);
      });
    });
  });
  expect(error).toBe(null);
}

async function start(page, testInfo, scenario) {
  await openGame(page, testInfo);
  await page.evaluate(function () { FB.startProgression.noteTier(3); });
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('CORONATION-800-' + scenario + '-london-m-Edwin');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  await page.evaluate(function () {
    FB.game.setPaused(true);
    FB.game.uiPrefs.hideTips = true;
    FB.ui.coachmarkReset();
    delete FB.state.player.flags.tutorial;
  });
}

test('800 is selectable and owns independent world data', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  const result = await page.evaluate(function () {
    const b = FBDATA.bookmarkCandidates['800'];
    const previous = FBDATA.bookmarks['867'];
    const before = JSON.stringify(b);
    const paris = previous.provinces.find(function (p) { return p.id === 'paris'; });
    const old = paris.realm;
    let independent;
    try { paris.realm = 'e2e_changed'; independent = JSON.stringify(b) === before; }
    finally { paris.realm = old; }
    return { registered:!!FB.bookmark('800'),
      selectable:FB.bookmarks().some(function (row) { return row.id === '800'; }),
      default:FBDATA.defaultBookmark, independent:independent,
      faults:FB.validateBookmark(b),
      stable:b.provinces.map(function (p) { return p.id; }).sort().join('|') ===
        previous.provinces.map(function (p) { return p.id; }).sort().join('|'),
      scripts:b.scripted,
      distinct:['provinces','realms','duchies','kingdoms','empires','straits','crossingClasses']
        .every(function (key) { return b[key] !== previous[key]; }) };
  });
  expect(result).toEqual({ registered:true, selectable:true, default:'867',
    independent:true, faults:[], stable:true, scripts:[], distinct:true });
});

test('800 activates the full world, period communities and subordinate courts', async function ({ page }, testInfo) {
  await observe(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, b = FB.bookmark('800');
    const realm = function (id) { return b.realms.find(function (row) { return row.id === id; }); };
    const cell = function (id) { return b.provinces.find(function (row) { return row.id === id; }); };
    return { faults:FB.validateBookmark(b), start:s.start,
      hierarchy:[realm('aquitaine').liege, realm('italy').liege, realm('venice').liege,
        realm('aghlabids').liege],
      owners:['aachen','bordeaux','pavia','barcelona','york','dublin','palermo','candia']
        .map(function (id) { return s.owner[id]; }),
      rulers:['carolingian_800','byzantium','abbasid','papacy']
        .map(function (id) { return realm(id).ruler.name; }),
      irene:realm('byzantium').ruler.sex,
      communities:b.provinces.filter(function (p) { return !p.wasteland; })
        .every(function (p) { return p.communities.reduce(function (n, c) {
          return n + c.populationShare0;
        }, 0) === 10000 && p.communities[0].culture === p.culture &&
          p.communities[0].religion === p.religion; }),
      coptic:cell('fustat').culture, bulgar:s.realms.bulgaria.religion,
      sicily:['palermo','messina','siracusa'].map(function (id) {
        return [s.owner[id], cell(id).culture, cell(id).religion];
      }),
      noLaterCourts:['york','dublin','tahirids','saffarids','habbarids']
        .every(function (id) { return !realm(id); }),
      seats:['venezia','santiago','fes','raqqa'].map(function (id) {
        return FB.world.byId[id].settlements[0].name;
      }),
      traditions:[realm('carolingian_800').techTraditions, realm('abbasid').techTraditions],
      stories:FB.stories.attached(s) };
  });
  expect(result).toMatchObject({ faults:[],
    start:{ id:'800', year:800, season:3, day:25, era:'early_medieval', geography:'europe_regional' },
    hierarchy:['carolingian_800','carolingian_800','byzantium','abbasid'],
    owners:['carolingian_800','carolingian_800','carolingian_800','cordoba',
      'northumbria','leinster','byzantium','byzantium'],
    rulers:['Charlemagne','Irene','Harun al-Rashid','Leo III'], irene:'f',
    communities:true, coptic:'coptic', bulgar:'tengri', noLaterCourts:true,
    sicily:[['byzantium','greek','orthodox'],['byzantium','greek','orthodox'],['byzantium','greek','orthodox']],
    seats:['Malamocco','Iria Flavia','Walila','Raqqa'],
    traditions:[['latin'],['islamic','persianate']], stories:STORIES });
});

for (const scenario of ['serf','farmer','apprentice','monk','soldier','knight','baron']) {
  test('800 ' + scenario + ' uses the ordinary start and save journey', async function ({ page }, testInfo) {
    await start(page, testInfo, scenario);
    const result = await page.evaluate(function () {
      let s = FB.state;
      const before = JSON.stringify({ start:s.start, owner:s.owner, holder:s.holder,
        heads:s.religiousHeads, stories:s.stories, counts:s.papacy.regnalNameCounts });
      const source = JSON.stringify(FB.bookmark('800'));
      FB.ensureHistoricalAmbitions(s);
      const future = FBDATA.historicalAmbitions.every(function (d) {
        return d.foundedYear > 800 && !s.historicalAmbitions[d.id];
      });
      FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
      return { scenario:s.telemetry.scenario, date:s.date, future:future,
        heads:s.religiousHeads, stories:FB.stories.attached(s),
        restored:before === JSON.stringify({ start:s.start, owner:s.owner, holder:s.holder,
          heads:s.religiousHeads, stories:s.stories, counts:s.papacy.regnalNameCounts }),
        sourceUnchanged:source === JSON.stringify(FB.bookmark('800')),
        platform:FB.save.v4.validatePlatform(JSON.parse(FB.save.serialize()).state) };
    });
    expect(result).toMatchObject({ scenario:scenario, date:{ year:800, season:3, day:25 },
      future:true, heads:{ catholic:'papacy', sunni:'abbasid' }, stories:STORIES,
      restored:true, sourceUnchanged:true, platform:true });
  });
}

test('800 Papal names use their own seed before and after a vacancy', async function ({ page }, testInfo) {
  await start(page, testInfo, 'monk');
  const result = await page.evaluate(function () {
    const s = FB.state, papacy = FB.ensurePapacy(s);
    const counts = Object.assign({}, papacy.regnalNameCounts);
    const choices = FB.papalRegnalChoices(s, s.player.charId);
    const election = FB.succeedReligiousHead(s, 'catholic', { reason:'death' });
    const law = FB.papalElectionLaw(s);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return { counts:counts, nextLeo:choices.find(function (row) { return row.name === 'Leo'; }).display,
      law:law.id, outsideAssent:law.outsideAssent, phase:election.phase,
      retained:JSON.stringify(counts) === JSON.stringify(FB.state.papacy.regnalNameCounts),
      oldSeed:FBDATA.papacy.regnalSeeds.find(function (row) { return row.from === 867; }).counts.Leo };
  });
  expect(result).toMatchObject({ counts:{ Leo:3, John:7, Benedict:2, Gregory:3, Nicholas:0, Paschal:0 },
    nextLeo:'Leo IV', law:'roman_assent', outsideAssent:true, phase:'vacancy', retained:true, oldSeed:4 });
});

for (const id of RAILS) {
  test(id + ' declares once and waits for an actual war award', async function ({ page }, testInfo) {
    await observe(page, testInfo);
    const result = await page.evaluate(function (id) {
      let s = FB.state;
      const def = FBDATA.storyCampaigns[id], story = FB.stories.get(id), rec = s.stories[id];
      story.day(s, rec);
      const early = rec.phase === 'pending';
      s.date.year = def.firstYear;
      const owner = s.owner[def.target.provinceId];
      story.day(s, rec);
      const war = FB.ordinaryWarById(s, rec.warId);
      const started = rec.phase;
      const noAward = s.owner[def.target.provinceId] === owner;
      const warCount = Object.keys(s.wars).length;
      story.day(s, rec);
      const once = Object.keys(s.wars).length === warCount;
      FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
      FB.transferProvince(s, def.target.provinceId, def.actor.realmId);
      FB.settleOrdinaryWar(s, rec.warId, 'victory');
      story.day(s, s.stories[id]);
      const outcome = JSON.stringify(s.stories[id]);
      FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
      story.day(s, s.stories[id]);
      return { early:early, started:started, noAward:noAward, once:once,
        target:war && war.objectives[0].target, expected:def.target.provinceId,
        phase:s.stories[id].phase, result:s.stories[id].result,
        durable:outcome === JSON.stringify(s.stories[id]) };
    }, id);
    expect(result).toMatchObject({ early:true, started:'started', noAward:true,
      once:true, phase:'resolved', result:'won', durable:true });
    expect(result.target).toBe(result.expected);
  });

  test(id + ' closes on changed control without forcing conquest', async function ({ page }, testInfo) {
    await observe(page, testInfo);
    const result = await page.evaluate(function (id) {
      const s = FB.state, def = FBDATA.storyCampaigns[id], story = FB.stories.get(id);
      s.date.year = def.firstYear;
      FB.transferProvince(s, def.target.provinceId, 'asturias');
      const owners = JSON.stringify(s.owner);
      story.day(s, s.stories[id]);
      const before = JSON.stringify(s.stories[id]);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      story.day(FB.state, FB.state.stories[id]);
      return { result:FB.state.stories[id].result,
        unchanged:owners === JSON.stringify(FB.state.owner),
        durable:before === JSON.stringify(FB.state.stories[id]) };
    }, id);
    expect(result).toEqual({ result:'diverted', unchanged:true, durable:true });
  });

  for (const cause of ['death', 'timeout']) {
    test(id + ' retains its ' + cause + ' outcome after restore', async function ({ page }, testInfo) {
      await observe(page, testInfo);
      const result = await page.evaluate(function (options) {
        const s = FB.state, id = options.id, def = FBDATA.storyCampaigns[id];
        const story = FB.stories.get(id), rec = s.stories[id];
        s.date.year = def.firstYear;
        story.day(s, rec);
        const started = rec.phase;
        const owners = JSON.stringify(s.owner);
        if (options.cause === 'death') s.chars[rec.actorId].dead = true;
        else s.turn = rec.deadline;
        story.day(s, rec);
        const bytes = JSON.stringify(rec);
        FB.save.restore(JSON.parse(FB.save.serialize()));
        story.day(FB.state, FB.state.stories[id]);
        return { started:started, phase:FB.state.stories[id].phase,
          result:FB.state.stories[id].result,
          unchanged:owners === JSON.stringify(FB.state.owner),
          durable:bytes === JSON.stringify(FB.state.stories[id]) };
      }, { id:id, cause:cause });
      expect(result).toEqual({ started:'started', phase:'resolved',
        result:cause === 'death' ? 'interrupted' : 'failed', unchanged:true, durable:true });
    });
  }
}

test('800 runs ten natural years with bounded daily steps and a durable save', async function ({ page }, testInfo) {
  test.setTimeout(180000);
  test.skip(testInfo.project.name !== 'chromium-served', 'The long natural-play slice runs once.');
  await start(page, testInfo, 'farmer');
  await injectBrowserHarness(page);
  await page.evaluate(function () { FB.game.auto.all = true; FB.game.auto.style = 'first'; });
  for (let year = 0; year < 10; year++) {
    const result = await page.evaluate(function () {
      const startTurn = FB.state.turn;
      let successions = 0;
      for (let attempts = 0; attempts < 400 && FB.state.turn < startTurn + 360; attempts++) {
        if (FB.state.player.dead) {
          const heirs = FB.heirsOf(FB.state);
          if (!heirs.length) throw new Error('Natural-play dynasty ended before the ten-year review boundary.');
          FB.ui.closeModal();
          FB.game.succeedTo(heirs[0].id);
          FB.ui.closeModal();
          FB.game.auto.all = true;
          successions++;
        }
        FB.game.passDay({ deferUi:true });
      }
      return { advanced:FB.state.turn - startTurn,
        errors:FBTEST.checkInvariants(), successions:successions };
    });
    expect(result.advanced).toBe(360);
    expect(result.errors).toEqual([]);
  }
  const result = await page.evaluate(function () {
    const before = JSON.stringify({ start:FB.state.start, date:FB.state.date,
      turn:FB.state.turn, stories:FB.state.stories, heads:FB.state.religiousHeads });
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return { turn:FB.state.turn, year:FB.state.date.year,
      retained:before === JSON.stringify({ start:FB.state.start, date:FB.state.date,
        turn:FB.state.turn, stories:FB.state.stories, heads:FB.state.religiousHeads }),
      errors:FBTEST.checkInvariants() };
  });
  expect(result).toEqual({ turn:3600, year:810, retained:true, errors:[] });
});
