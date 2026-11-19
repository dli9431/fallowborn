'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startParityGame, FRESH_JOURNEYS } = require('../support/game/parity');
const { installRestoreFacts } = require('../support/game/restore-facts');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, [
  'data/story_instances.js',
  'data/story_courts_476.js',
  'index.html', 'data/bookmarks.js', 'data/bookmark_476.js',
  'data/bookmark_476_italy.js', 'data/bookmark_476_dalmatia_east.js',
  'data/bookmark_476_gaul_iberia.js', 'data/bookmark_476_africa.js',
  'data/political_institutions.js', 'data/starts.js', 'data/cultures.js',
  'data/geographies.js', 'data/settlements.js', 'data/eras.js', 'data/systems.js', 'data/technology.js',
  'js/world.js', 'js/model.js', 'js/mods.js', 'js/main.js', 'js/institutions.js',
  'js/progression.js', 'js/religion.js', 'js/authority.js', 'js/politics.js',
  'js/stories.js', 'js/story_courts.js', 'js/systems.js', 'js/bookmark_setup.js',
  'js/bookmark_composition.js', 'js/save.js', 'js/save_v4.js', 'js/technology.js'
]);

const CIVIC_CODE = FRESH_JOURNEYS.find(function (row) { return row.id === 'fresh-476-curialis_476'; }).code;
async function reviewCounty(page) {
  return page.evaluate(function () {
    const bm = FB.bookmark('sibling_review');
    const scenario = FBDATA.startScenarios.find(function (s) { return s.id === 'sibling_commoner'; });
    return bm.provinces.find(function (p) { return FB.startProvinceAllowed(scenario,bm,p.id); }).id;
  });
}

async function reviewCode(page) {
  return CIVIC_CODE.replace('PARITY-476-curialis_476-ravenna-',
    'SIBLING-sibling_review-sibling_commoner-' + await reviewCounty(page) + '-');
}

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
    delete def.revision; // the resolved copy carries no revision catalogue
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
    // the minimal opening replaces the copied opening revision catalogue
    delete def.openingRevision; delete def.openingRevisions; delete def.openingLegacyRevision;
    // without the copied royal trees, aristocratic courts use the era default government
    def.realms.forEach(function (realm) {
      const form = FBDATA.governmentForms[realm.government];
      if (!form || !form.aristocraticProfileId) return;
      ['government','royalCourt','aristocraticProfileId','administrationProfileId'].forEach(function (key) {
        delete realm[key];
      });
    });
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
    delete scenario.trackLocations;
    scenario.intro = 'A civic household begins its review campaign.';
    def.starts = [scenario.id];
    delete def.startTrackOverrides;
    // A sibling world extends the 476-scoped faiths its copied communities use.
    const religions = {};
    Object.keys(FBDATA.religions).forEach(function (id) {
      const availability = FBDATA.religions[id].availability;
      if (!availability || !availability.bookmarkIds || availability.bookmarkIds.indexOf('476') < 0) return;
      religions[id] = clone(FBDATA.religions[id]);
      religions[id].availability.bookmarkIds = availability.bookmarkIds.concat(def.id);
    });
    FB.mods.apply({ name:'Sibling platform fixture', bookmarks:[def], startScenarios:[scenario], religions:religions });
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
  await page.locator('#ng-seed').fill(await reviewCode(page));
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

test('hidden bookmarks are omitted from the picker and Quick Start and reject start codes',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    expect(await registerReview(page, true)).toEqual([]);
    await page.evaluate(function () { FBDATA.bookmarks['867'].hidden = true; });
    await chooseDate(page);
    await expect(page.locator('#bookmarklist button').filter({ hasText:'Sibling review' })).toHaveCount(0);
    await expect(page.locator('[data-quick-start="osric_867"]')).toHaveCount(0);
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill(await reviewCode(page));
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#ng-seed-err')).toContainText('hidden for new campaigns');
    await page.locator('#ng-cancel').click();
  });

test('hidden bookmarks allow inspection but reject direct creation and observation without mutation',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    expect(await registerReview(page, true)).toEqual([]);
    await activate(page, 'sibling_review'); // inspection remains available
    const result = await page.evaluate(function (provinceId) {
      FB.game.pending = { bookmarkId:'sibling_review', seed:'SIBLING', provinceId:provinceId,
        scenario:FBDATA.startScenarios.filter(function (s) { return s.id === 'sibling_commoner'; })[0] };
      const state = FB.state, world = FB.world, rng = FB.getRngState(), uid = FB.getUidCounter();
      const preserved = function () {
        return FB.state === state && FB.world === world && FB.getRngState() === rng &&
          FB.getUidCounter() === uid && !FB.game.observe;
      };
      const ready = FB.game.campaignReady('sibling_review') && FB.activeBookmarkId === 'sibling_review';
      const start = FB.game.start(), startPreserved = preserved();
      const observer = FB.game.startObserve();
      return { visible:FB.bookmarkAvailable('sibling_review'),
        all:FB.bookmarks(true).some(function (d) { return d.id === 'sibling_review'; }),
        ready:ready, start:start, startPreserved:startPreserved, observer:observer, observerPreserved:preserved() };
    }, await reviewCounty(page));
    expect(result).toEqual({ visible:false, all:true, ready:true, start:false, startPreserved:true,
      observer:false, observerPreserved:true });
  });

test('unhiding a sibling bookmark permits creation with independent institutions after 476',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    expect(await registerReview(page, true)).toEqual([]);
    await activate(page, '476');
    await page.evaluate(function () { FBDATA.bookmarks.sibling_review.hidden = false; });
    await beginReview(page);
    expect(await page.evaluate(function () { return FB.state.start.id; })).toBe('sibling_review');
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
  });

test('sibling institutions survive 476 activation and a matching hidden save load',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    expect(await registerReview(page, false)).toEqual([]);
    await beginReview(page);
    await installRestoreFacts(page);
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
      window.hiddenSaveRestored = false;
      return FB.game.loadData(JSON.parse(json), function () { window.hiddenSaveRestored = true; });
    }, saved)).toBe(true);
    await expect.poll(function () {
      return page.evaluate(function () { return window.hiddenSaveRestored; });
    }).toBe(true);
    await expect(page.locator('#game:not(.hidden)')).toBeVisible();
    const restored = await page.evaluate(function (json) {
      const before = JSON.parse(json).state, s = FB.state;
      FB.ensureLocalInstitutions(s); FB.ensureLocalInstitutions(s);
      return { ledger:restoreFacts(s,function (v) { return v.localInstitutions; }) === restoreFacts(before,function (v) { return v.localInstitutions; }),
        vacancies:restoreFacts(s,function (v) { return v.religiousHeadVacancies; }) === restoreFacts(before,function (v) { return v.religiousHeadVacancies; }),
        heads:restoreFacts(s,function (v) { return v.religiousHeads; }) === restoreFacts(before,function (v) { return v.religiousHeads; }),
        dead:s.chars[s.localInstitutions.rome_see.representativeId].dead,
        east:FB.religiousOfficeSnapshot(s, 'constantinople_patriarch').name,
        error:FB.game.lastLoadError && FB.game.lastLoadError.message,
        count:Object.keys(s.chars).length === Object.keys(before.chars).length };
    }, saved);
    expect(restored).toEqual({ ledger:true, vacancies:true, heads:true, dead:true,
      east:'Eastern reviewer', error:null, count:true });
    expect(await page.evaluate(function () {
      const local = FB.bookmark('476').localInstitutions;
      return { rome:local.rome_see.historicalName, east:local.constantinople_see.historicalName,
        faults:FB.validateBookmark(FB.bookmark('476')) };
    })).toEqual({ rome:'Simplicius', east:'Acacius', faults:[] });
  });

test('the sibling catalogue rejects a pre-mod 476 save without adopting campaign state',
  async function ({ page }, testInfo) {
    await startParityGame(page, testInfo, { bookmark:'476', code:CIVIC_CODE });
    const original = await page.evaluate(function () { return FB.save.serialize(); });
    expect(await registerReview(page, false)).toEqual([]);
    const result = await page.evaluate(function (json) {
      const save = JSON.parse(json), state = FB.state, world = FB.world, bookmark = FB.activeBookmark;
      const rng = FB.getRngState(), uid = FB.getUidCounter();
      const otherWorld = FB.save.otherWorld(save);
      const accepted = FB.game.loadData(save);
      return { otherWorld:otherWorld, accepted:accepted, stage:FB.game.lastLoadStage,
        preserved:FB.state === state && FB.world === world && FB.activeBookmark === bookmark &&
          FB.getRngState() === rng && FB.getUidCounter() === uid };
    }, original);
    expect(result).toEqual({ otherWorld:true, accepted:false, stage:'save preflight', preserved:true });
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
      delete def.revision; def.starts = [];
      delete def.startTrackOverrides;
      // without its stories the copy keeps no story-bound opening actors or courts
      def.opening = { actors:{}, appointments:{}, estates:[], claims:[], migrations:[] };
      delete def.openingRevision; delete def.openingRevisions; delete def.openingLegacyRevision;
      def.realms.forEach(function (realm) {
        const form = FBDATA.governmentForms[realm.government];
        if (!form || !form.aristocraticProfileId) return;
        ['government','royalCourt','aristocraticProfileId','administrationProfileId'].forEach(function (key) {
          delete realm[key];
        });
      });
      // the sibling world extends the 476-scoped faiths its copied communities use
      const religions = {};
      Object.keys(FBDATA.religions).forEach(function (id) {
        const availability = FBDATA.religions[id].availability;
        if (!availability || !availability.bookmarkIds || availability.bookmarkIds.indexOf('476') < 0) return;
        religions[id] = JSON.parse(JSON.stringify(FBDATA.religions[id]));
        religions[id].availability.bookmarkIds = availability.bookmarkIds.concat(def.id);
      });
      FB.mods.apply({ bookmarks:[def], religions:religions });
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
