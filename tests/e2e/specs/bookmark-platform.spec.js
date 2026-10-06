'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startParityGame } = require('../support/game/parity');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, [
  'index.html', 'data/bookmarks.js', 'data/bookmark_476.js',
  'data/bookmark_476_italy.js', 'data/bookmark_476_dalmatia_east.js',
  'data/bookmark_476_gaul_iberia.js', 'data/bookmark_476_africa.js',
  'data/political_institutions.js', 'data/starts.js', 'data/cultures.js',
  'data/geographies.js', 'data/settlements.js', 'data/eras.js', 'data/systems.js', 'data/technology.js',
  'js/world.js', 'js/model.js', 'js/mods.js', 'js/main.js', 'js/institutions.js',
  'js/progression.js', 'js/religion.js', 'js/authority.js', 'js/politics.js',
  'js/stories.js', 'js/story_western_court_476.js', 'js/systems.js', 'js/bookmark_setup.js',
  'js/save.js', 'js/save_v4.js', 'js/technology.js'
]);

const REVIEW_CODE = 'SIBLING-sibling_review-sibling_commoner-ravenna-m-Marcus-standard-0-roman.nicene';

test('data-only starts accept an empty track list and reject malformed or unknown tracks atomically',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      const scenario = JSON.parse(JSON.stringify(FBDATA.startScenarios.filter(function (row) { return row.id === 'farmer'; })[0]));
      scenario.id = 'empty_tracks_review'; scenario.tracks = [];
      const mod = { startScenarios:[scenario] }, errors = FB.mods.validate(mod);
      FB.mods.apply(mod);
      const track = FB.stories.list().filter(function (row) { return row.kind === 'track'; })[0].id;
      const world = FB.stories.list().filter(function (row) { return row.kind === 'world'; })[0].id;
      const rejected = [null, 'track', ['missing_track'], [track, track], [world]].map(function (tracks) {
        const invalid = JSON.parse(JSON.stringify(scenario)); invalid.tracks = tracks;
        const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
        let failed = false;
        try { FB.mods.apply({ startScenarios:[invalid] }); } catch (error) { failed = /tracks/.test(error.message); }
        return failed && before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter();
      });
      return { errors:errors, tracks:FBDATA.startScenarios.filter(function (row) { return row.id === scenario.id; })[0].tracks,
        rejected:rejected };
    });
    expect(result).toEqual({ errors:[], tracks:[], rejected:Array(5).fill(true) });
  });

// Artificial data-only world: these profiles are test fiction, not historical claims.
async function registerReview(page, hidden) {
  return page.evaluate(function (isHidden) {
    const clone = function (v) { return JSON.parse(JSON.stringify(v)); };
    const def = clone(FB.bookmark('476'));
    def.id = 'sibling_review'; def.name = 'Sibling review';
    def.date = { year:493, season:0, day:1 }; def.hidden = isHidden;
    def.stories = [];
    def.opening = {
      actors:{ reviewer:{ name:'Review clerk', sex:'m', culture:'roman', religion:'nicene',
        born:453, station:3, role:'notable', home:'ravenna' } },
      appointments:{ reviewer_prefecture:{ officeId:'praetorian_prefect', actorId:'reviewer',
        realmId:'italy', scope:{ kind:'realm', id:'italy' } } },
      estates:[], claims:[], migrations:[]
    };
    const base = FBDATA.localInstitutions;
    def.localInstitutions = {
      rome_see:clone(base.rome_see), constantinople_see:clone(base.constantinople_see),
      carthage_see:clone(base.carthage_see), milan_council:clone(base.milan_council)
    };
    ['rome_see','constantinople_see'].forEach(function (id, i) {
      delete def.localInstitutions[id].historicalName;
      def.localInstitutions[id].representative = { name:i ? 'Eastern reviewer' : 'Roman reviewer',
        born:453, role:'priest', skills:{ lea:12 }, traits:[] };
    });
    const scenario = clone(FBDATA.startScenarios.filter(function (s) { return s.id === 'curialis_476'; })[0]);
    scenario.id = 'sibling_commoner'; scenario.bookmarkIds = [def.id]; scenario.tracks = [];
    scenario.intro = 'A civic household begins its review campaign.';
    FB.mods.apply({ name:'Sibling platform fixture', bookmarks:[def], startScenarios:[scenario] });
    return FB.validateBookmark(FB.bookmark(def.id));
  }, hidden);
}

async function chooseDate(page) {
  const fullStart = page.locator('#btn-choose-beginning');
  if (await fullStart.isVisible()) await fullStart.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await expect(page.locator('#bookmarks:not(.hidden)')).toBeVisible();
}

async function beginReview(page) {
  await page.evaluate(function () { FB.ui.closeModal(); FB.ui.showScreen('title'); });
  await chooseDate(page);
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(REVIEW_CODE);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await page.evaluate(function () {
    FB.game.setPaused(true); FB.game.uiPrefs.hideTips = true;
    FB.game.uiPrefs.hideBeginnerHints = true; delete FB.state.player.flags.tutorial;
  });
}

async function activate(page, id) {
  expect(await page.evaluate(function (bookmarkId) {
    return new Promise(function (resolve) {
      FB.activateBookmark(bookmarkId, null, function (error) { resolve(error && error.message || null); });
    });
  }, id)).toBe(null);
}

test('hidden bookmarks reject picker, start codes, Quick Start, direct creation and observer without mutation',
  async function ({ page }, testInfo) {
    test.setTimeout(120 * 1000);
    await openGame(page, testInfo);
    expect(await registerReview(page, true)).toEqual([]);
    await page.evaluate(function () { FBDATA.bookmarks['867'].hidden = true; });
    await chooseDate(page);
    await expect(page.locator('#bookmarklist button').filter({ hasText:'Sibling review' })).toHaveCount(0);
    await expect(page.locator('[data-quick-start="osric_867"]')).toHaveCount(0);
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill(REVIEW_CODE);
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#ng-seed-err')).toContainText('hidden for new campaigns');
    await page.locator('#ng-cancel').click();
    await activate(page, 'sibling_review'); // inspection remains available
    const result = await page.evaluate(function () {
      FB.game.pending = { bookmarkId:'sibling_review', seed:'SIBLING', provinceId:'ravenna',
        scenario:FBDATA.startScenarios.filter(function (s) { return s.id === 'sibling_commoner'; })[0] };
      const state = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
      const start = FB.game.start(), observer = FB.game.startObserve();
      return { visible:FB.bookmarkAvailable('sibling_review'),
        all:FB.bookmarks(true).some(function (d) { return d.id === 'sibling_review'; }),
        start:start, observer:observer, preserved:FB.state === state &&
          FB.getRngState() === rng && FB.getUidCounter() === uid && !FB.game.observe };
    });
    expect(result).toEqual({ visible:false, all:true, start:false, observer:false, preserved:true });
    await page.evaluate(function () {
      FBDATA.bookmarks.sibling_review.hidden = false;
      FBDATA.bookmarks['867'].hidden = false;
    });
    await beginReview(page);
    expect(await page.evaluate(function () { return FB.state.start.id; })).toBe('sibling_review');
  });

test('data-only institutions remain independent across activation orders and matching hidden save loads',
  async function ({ page }, testInfo) {
    test.setTimeout(120 * 1000);
    await startParityGame(page, testInfo, {
      bookmark:'476', code:'PLATFORM-476-curialis_476-ravenna-m-Marcus'
    });
    const original = await page.evaluate(function () { return FB.save.serialize(); });
    expect(await registerReview(page, false)).toEqual([]);
    await page.evaluate(function () { FB.ui.closeModal(); FB.ui.showScreen('title'); });
    await beginReview(page);
    const facts = await page.evaluate(function () {
      const s = FB.state, rome = FB.religiousOfficeSnapshot(s, 'rome_bishop');
      const east = FB.religiousOfficeSnapshot(s, 'constantinople_patriarch');
      return { rome:rome.name, born:rome.born, role:rome.role, learning:rome.skills.lea,
        east:east && east.name, vacant:s.religiousHeads.carthage_bishop === null,
        isolated:!FB.religiousOffices(s).ravenna_nicene_bishop,
        cast:!(s.stories && s.stories.western_court_476),
        opening:!!s.bookmarkSetup.appointments.reviewer_prefecture,
        catalogue:FBDATA.localInstitutions.rome_see.historicalName };
    });
    expect(facts).toEqual({ rome:'Roman reviewer', born:453, role:'priest', learning:12,
      east:'Eastern reviewer', vacant:true, isolated:true, cast:true, opening:true, catalogue:'Simplicius' });
    const saved = await page.evaluate(function () {
      const s = FB.state;
      FB.localInstitutionSettle(s, 'milan_council', { kind:'realm', id:'italy' },
        { provision:true, protection:true, courts:true, tolerance:true, taxRelief:true });
      FB.localInstitutionApply(s, FB.localInstitutionQuote(s, 'rome_see', { kind:'realm', id:'italy' }, 'petition'));
      s.chars[s.localInstitutions.rome_see.representativeId].dead = true;
      FB.ensureReligiousHeads(s);
      return FB.save.serialize();
    });
    await activate(page, '476');
    expect(await page.evaluate(function () {
      FB.save.v4.validatePlatform(FB.state);
      return { name:FB.localInstitutionDefinitions(FB.state).rome_see.representative.name,
        office:!!FB.religiousOffices(FB.state).constantinople_patriarch };
    })).toEqual({ name:'Roman reviewer', office:true });
    await page.evaluate(function () {
      FBDATA.bookmarks.sibling_review.hidden = true;
      FBDATA.bookmarks.sibling_review.localInstitutions.constantinople_see.representative.name = 'Changed seed';
    });
    expect(await page.evaluate(function (json) {
      return FB.game.loadData(JSON.parse(json));
    }, saved)).toBe(true);
    await expect(page.locator('#game:not(.hidden)')).toBeVisible();
    const restored = await page.evaluate(function (json) {
      const before = JSON.parse(json).state, s = FB.state;
      FB.ensureLocalInstitutions(s); FB.ensureLocalInstitutions(s);
      return { ledger:JSON.stringify(s.localInstitutions) === JSON.stringify(before.localInstitutions),
        vacancies:JSON.stringify(s.religiousHeadVacancies) === JSON.stringify(before.religiousHeadVacancies),
        heads:JSON.stringify(s.religiousHeads) === JSON.stringify(before.religiousHeads),
        dead:s.chars[s.localInstitutions.rome_see.representativeId].dead,
        east:FB.religiousOfficeSnapshot(s, 'constantinople_patriarch').name,
        error:FB.game.lastLoadError && FB.game.lastLoadError.message,
        count:Object.keys(s.chars).length === Object.keys(before.chars).length };
    }, saved);
    expect(restored).toEqual({ ledger:true, vacancies:true, heads:true, dead:true,
      east:'Eastern reviewer', error:null, count:true });
    expect(await page.evaluate(function (json) { return FB.game.loadData(JSON.parse(json)); }, original)).toBe(true);
    await expect(page.locator('#game:not(.hidden)')).toBeVisible();
    expect(await page.evaluate(function () {
      return { id:FB.state.start.id, rome:FB.religiousOfficeSnapshot(FB.state, 'rome_bishop').name,
        east:FB.religiousOfficeSnapshot(FB.state, 'constantinople_patriarch').name,
        faults:FB.validateBookmark(FB.bookmark('476')) };
    })).toEqual({ id:'476', rome:'Simplicius', east:'Acacius', faults:[] });
  });

test('bookmark and runtime-mod validation reject invalid visibility, seats, offices and representative profiles',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    expect(await registerReview(page, false)).toEqual([]);
    const result = await page.evaluate(function () {
      const base = FB.bookmark('sibling_review'), cases = [
        function (d) { d.hidden = 'yes'; },
        function (d) { d.localInstitutions = []; },
        function (d) { d.localInstitutions.rome_see.site = 'unknown_site'; },
        function (d) { d.localInstitutions.rome_see.provinceId = 'unknown_county'; },
        function (d) { d.localInstitutions.rome_see.religion = 'unknown_faith'; },
        function (d) { d.localInstitutions.rome_see.culture = 'unknown_culture'; },
        function (d) { d.localInstitutions.rome_see.officeId = 'bad office'; },
        function (d) { d.localInstitutions.rome_see.officeId = d.localInstitutions.constantinople_see.officeId; },
        function (d) { d.localInstitutions.rome_see.representative.born = 490; },
        function (d) { d.localInstitutions.rome_see.representative.role = 'notable'; },
        function (d) { d.localInstitutions.rome_see.representative.skills = { unknown:12 }; },
        function (d) { d.localInstitutions.rome_see.representative.traits = ['unknown_trait']; },
        function (d) { d.localInstitutions.rome_see.vacant = true; }
      ];
      return cases.map(function (edit) {
        const def = JSON.parse(JSON.stringify(base)); edit(def);
        const rejected = FB.validateBookmark(def).length > 0;
        const registry = JSON.stringify(FBDATA.bookmarks), rng = FB.getRngState();
        let modRejected = false;
        try { FB.mods.apply({ bookmarks:[def] }); } catch (error) { modRejected = true; }
        return rejected && modRejected && JSON.stringify(FBDATA.bookmarks) === registry && FB.getRngState() === rng;
      });
    });
    expect(result).toEqual(Array(13).fill(true));
  });

test('visibility composes with legacy mod restrictions and explicit empty institution tables',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      const def = JSON.parse(JSON.stringify(FB.bookmark('476')));
      def.id = 'empty_review'; def.stories = []; def.localInstitutions = {};
      FB.mods.apply({ bookmarks:[def] });
      const state = { start:{ id:def.id, era:def.era }, chars:{}, realms:{}, player:{} };
      FB.ensureLocalInstitutions(state);
      const local = FB.localInstitutionDefinitions(state);
      FB.mods.apply({ provinces:[] });
      return { empty:Object.keys(local).length === 0 && !FB.religiousOffices(state).milan_bishop && !state.localInstitutions,
        faithHead:!!FB.religiousOffices(state).rome_bishop,
        faults:FB.validateBookmark(FB.bookmark(def.id)),
        blocked:!FB.bookmarkAvailable('1066') && !FB.bookmarks(false).some(function (b) { return b.id === '1066'; }),
        warning:FB.bookmarkUnavailableReason('1066') === FB.mods.bookmarkWarning(),
        older:FB.bookmarkAvailable('867') };
    });
    expect(result).toEqual({ empty:true, faithHead:true, faults:[], blocked:true, warning:true, older:true });
  });
