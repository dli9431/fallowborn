'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/eras.js',
  'data/technology.js',
  'data/map_data.js',
  'data/units.js',
  'data/bookmarks.js',
  'data/bookmark_476.js',
  'data/bookmark_476_italy.js', 'data/bookmark_476_dalmatia_east.js',
  'data/bookmark_476_gaul_iberia.js', 'data/bookmark_476_africa.js',
  'js/world.js',
  'js/technology.js',
  'js/armies.js',
  'js/items.js',
  'js/actions.js',
  'js/events.js',
  'js/mods.js',
  'js/ui_panels.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test('every era declares a valid technology window and starting-knowledge policy',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      const out = { slots:{}, errors:FB.validateEraData(), coverage:FBDATA.techCoverage };
      Object.keys(FBDATA.eras).forEach(function (id) {
        out.slots[id] = FBDATA.eras[id].technology;
      });
      out.bookmarks = ['867', '1066', '476'].map(function (id) {
        return FB.validateBookmark(FB.bookmark(id));
      });
      out.policies = Object.keys(FB.techStartingKnowledge);
      return out;
    });
    expect(result.errors).toEqual([]);
    expect(result.coverage).toEqual({ from:476, to:1300 });
    expect(result.slots).toEqual({
      late_antique:{ from:476, to:649, startingKnowledge:'historical' },
      early_medieval:{ from:650, to:999, startingKnowledge:'historical' },
      high_medieval:{ from:1000, to:1300, startingKnowledge:'historical' }
    });
    expect(result.bookmarks).toEqual([[], [], []]);
    expect(result.policies).toEqual(['historical']);
  });

test('a bookmark outside the catalogue coverage or its era window is rejected by name',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      const base = FB.bookmark('867');
      function errors(changes) {
        return FB.validateBookmark(Object.assign({}, base, changes));
      }
      const undeclared = Object.assign({}, base);
      delete undeclared.era;
      const firstRealm = base.realms[0].id;
      const badTradition = base.realms.map(function (realm, index) {
        return index ? realm : Object.assign({}, realm, { techTraditions:['e2e_missing'] });
      });
      const lateAntique = FBDATA.eras.late_antique.technology;
      let windowErrors;
      try {
        FBDATA.eras.late_antique.technology = Object.assign({}, lateAntique, { from:500 });
        windowErrors = errors({ era:'late_antique', date:{ year:480, season:0, day:1 } });
      } finally {
        FBDATA.eras.late_antique.technology = lateAntique;
      }
      const traditionErrors = errors({ realms:badTradition });
      return {
        early:errors({ era:'late_antique', date:{ year:400, season:0, day:1 } }),
        late:FB.validateBookmark(Object.assign({}, undeclared,
          { date:{ year:1350, season:0, day:1 } })),
        windowErrors:windowErrors,
        traditionErrors:traditionErrors,
        traditionMessage:'Bookmark 867 realm ' + firstRealm +
          ': invalid technology tradition e2e_missing.'
      };
    });
    expect(result.early).toContain(
      'Bookmark 867: start year 400 is outside the technology catalogue coverage (476–1300).');
    expect(result.early.join('\n')).not.toContain('technology window');
    expect(result.late).toEqual([
      'Bookmark 867: start year 1350 is outside the technology catalogue coverage (476–1300).'
    ]);
    expect(result.windowErrors).toContain(
      'Bookmark 867: start year 480 is outside era late_antique technology window (500–649).');
    /* reported once, although the catalogue-wide check also reads realms */
    expect(result.traditionErrors.filter(function (error) {
      return error === result.traditionMessage;
    })).toHaveLength(1);
  });

test('era technology and military slots are validated',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const errors = await page.evaluate(function () {
      const saved = FBDATA.eras.e2e_era;
      try {
        FBDATA.eras.e2e_era = { from:1301, to:1400,
          defaultGovernment:'territorial', defaultCulture:'frankish',
          technology:{ from:1290, to:1350, startingKnowledge:'e2e_missing_policy' },
          military:{ excludeRoles:['levy_infantry', 'e2e_missing_role'],
            equipment:{ from:1400, to:1301 } } };
        return FB.validateEraData();
      } finally {
        if (saved === undefined) delete FBDATA.eras.e2e_era;
        else FBDATA.eras.e2e_era = saved;
      }
    });
    expect(errors).toEqual(expect.arrayContaining([
      'Era e2e_era: technology window 1290–1350 lies outside the era (1301–1400).',
      'Era e2e_era: technology window 1290–1350 lies outside the technology catalogue coverage (476–1300).',
      'Era e2e_era: unknown starting-knowledge policy e2e_missing_policy.',
      'Era e2e_era cannot exclude the core unit role levy_infantry.',
      'Era e2e_era excludes unknown unit role e2e_missing_role.',
      'Era e2e_era: equipment must name whole years from and to, from first.'
    ]));
  });

test('starting knowledge is seeded through the campaign era policy',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const year = state.date.year;
      const eraId = FB.campaignEra(state);
      const sovereigns = Object.keys(state.realms).filter(function (rid) {
        const realm = state.realms[rid];
        return realm && realm.alive && !realm.liege && !realm.techSeed;
      });
      function reseed() {
        const copy = JSON.parse(JSON.stringify(state));
        copy.realmTech = {};
        FB.seedRealmTechnologies(copy, true);
        return copy;
      }
      /* The historical policy is the regional-adoption rule: every entry
         adopted by the start year is complete and every emerged one exposed. */
      const seeded = reseed();
      const violations = [];
      sovereigns.forEach(function (rid) {
        const record = seeded.realmTech[rid];
        Object.keys(FBDATA.tech).forEach(function (id) {
          const window = FB.techHistoricalWindow(seeded, id, rid);
          if (window.widespread <= year && record.completed.indexOf(id) < 0) {
            violations.push(rid + ' missing complete ' + id);
          }
          if (window.emergence <= year && record.exposed.indexOf(id) < 0) {
            violations.push(rid + ' missing exposed ' + id);
          }
        });
      });
      /* A registered policy named by the era replaces the rule. */
      const slot = FBDATA.eras[eraId].technology;
      const reseeded = {};
      FB.techStartingKnowledge.e2e_only_one = function (seedState, rid, seedYear, seeding) {
        seeding.complete('scratch_plough');
      };
      try {
        FBDATA.eras[eraId].technology = Object.assign({}, slot,
          { startingKnowledge:'e2e_only_one' });
        const copy = reseed();
        const rid = sovereigns[0];
        reseeded.completed = copy.realmTech[rid].completed.slice().sort();
        reseeded.exposed = copy.realmTech[rid].exposed.slice().sort();
      } finally {
        FBDATA.eras[eraId].technology = slot;
        delete FB.techStartingKnowledge.e2e_only_one;
      }
      return {
        eraId:eraId, policy:slot.startingKnowledge, sovereigns:sovereigns.length,
        violations:violations.slice(0, 5), reseeded:reseeded
      };
    });
    expect(result.eraId).toBe('early_medieval');
    expect(result.policy).toBe('historical');
    expect(result.sovereigns).toBeGreaterThan(10);
    expect(result.violations).toEqual([]);
    expect(result.reseeded).toEqual({
      completed:['scratch_plough'], exposed:['scratch_plough']
    });
  });

test('historic raid families follow the raiding data exactly as the former checks did',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const p = state.player;
      const c = state.chars[p.charId];
      /* The selector as engine code wrote it before the raid families became
         data; this is the parity reference. */
      function cultureIs(cultureId, ids) {
        return ids.some(function (id) {
          return cultureId === id || (FB.cultureIsA && FB.cultureIsA(cultureId, id, state));
        });
      }
      function formerProfile() {
        if (FB.faithIsA(c.religion, 'christian', state)) return 'northmen';
        if (FB.faithIsA(c.religion, 'muslim', state)) return 'cross_banners';
        if (FB.faithIsA(c.religion, 'zoroastrian', state)) return 'steppe_riders';
        if (FB.faithIsA(c.religion, 'norse_pagan', state)) return 'saxon_host';
        if (FB.faithIsA(c.religion, 'baltic_pagan', state)) return 'saxon_host';
        if (FB.faithIsA(c.religion, 'slavic_pagan', state)) return 'steppe_riders';
        if (FB.faithIsA(c.religion, 'tengri', state)) return 'rus_raiders';
        if (FB.faithIsA(c.religion, 'jewish', state) &&
            cultureIs(c.culture, ['turkic', 'magyar', 'khazar'])) return 'rus_raiders';
        if (cultureIs(c.culture, ['persian', 'armenian', 'georgian', 'slavic'])) {
          return 'steppe_riders';
        }
        if (cultureIs(c.culture, ['norse', 'baltic'])) return 'saxon_host';
        if (cultureIs(c.culture, ['turkic', 'magyar', 'khazar'])) return 'rus_raiders';
        if (cultureIs(c.culture, ['arabic', 'andalusi', 'berber'])) return 'cross_banners';
        return 'rival_raiders';
      }
      function formerMatches(pr, profile) {
        if (!pr || pr.wasteland || pr.id === p.provinceId) return false;
        const holder = (state.holder && state.holder[pr.id]) || state.owner[pr.id];
        if (holder === 'player') return false;
        const culture = FB.countyCulture ? FB.countyCulture(state, pr.id) : pr.culture;
        const religion = FB.countyReligion ? FB.countyReligion(state, pr.id) : pr.religion;
        if (profile === 'northmen') return cultureIs(culture, ['norse']) ||
          FB.faithIsA(religion, 'norse_pagan', state);
        if (profile === 'cross_banners') return FB.faithIsA(religion, 'christian', state);
        if (profile === 'saxon_host') return cultureIs(culture, ['german', 'frankish', 'english']) ||
          FB.faithIsA(religion, 'christian', state);
        if (profile === 'steppe_riders') return cultureIs(culture, ['turkic', 'magyar', 'khazar']) ||
          FB.faithIsA(religion, 'tengri', state);
        if (profile === 'rus_raiders') return cultureIs(culture, ['slavic', 'norse']) ||
          FB.faithIsA(religion, 'slavic_pagan', state) || FB.faithIsA(religion, 'orthodox', state);
        return culture !== c.culture || religion !== c.religion;
      }
      function formerContexts() {
        let profile = formerProfile();
        const home = FB.world.byId[p.provinceId];
        let candidates = FB.world.provs.filter(function (pr) { return formerMatches(pr, profile); });
        if (!candidates.length) {
          profile = 'rival_raiders';
          candidates = FB.world.provs.filter(function (pr) { return formerMatches(pr, profile); });
        }
        candidates.sort(function (a, b) {
          const adx = home ? a.sx - home.sx : 0, ady = home ? a.sy - home.sy : 0;
          const bdx = home ? b.sx - home.sx : 0, bdy = home ? b.sy - home.sy : 0;
          const distance = adx * adx + ady * ady - bdx * bdx - bdy * bdy;
          return distance || (a.id < b.id ? -1 : (a.id > b.id ? 1 : 0));
        });
        return candidates.slice(0, 6).map(function (pr) {
          return { raidProfile:profile, destinationId:pr.id };
        });
      }
      const identities = [
        ['catholic', 'frankish'], ['orthodox', 'greek'], ['sunni', 'arabic'],
        ['shia', 'persian'], ['zoroastrian', 'persian'], ['norse_pagan', 'norse'],
        ['baltic_pagan', 'baltic'], ['slavic_pagan', 'slavic'], ['tengri', 'turkic'],
        ['jewish', 'khazar'], ['jewish', 'frankish'], ['catholic', 'norse']
      ];
      const original = { religion:c.religion, culture:c.culture };
      const rows = [];
      try {
        identities.forEach(function (identity) {
          c.religion = identity[0];
          c.culture = identity[1];
          rows.push({
            identity:identity.join('/'),
            now:FB.eventContextOptions(state, 'historic_raider'),
            former:formerContexts()
          });
        });
      } finally {
        c.religion = original.religion;
        c.culture = original.culture;
      }
      const first = rows[0].now[0];
      return {
        rows:rows,
        valid:FB.fns.historic_raid_context_valid(state, Object.assign(
          { protagonistId:p.charId }, first)),
        unknown:FB.fns.historic_raid_context_valid(state, {
          protagonistId:p.charId, raidProfile:'e2e_missing', destinationId:first.destinationId
        })
      };
    });
    for (const row of result.rows) {
      expect(row.now, row.identity).toEqual(row.former);
      expect(row.now.length, row.identity).toBeGreaterThan(0);
    }
    expect(result.valid).toBe(true);
    expect(result.unknown).toBe(false);
  });

test('runtime mods may replace the historic raid families and are validated',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      /* apply validates the whole mod before it changes anything */
      function attempt(raidingTraditions) {
        try {
          FB.mods.apply({ raidingTraditions:raidingTraditions });
          return '';
        } catch (error) {
          return error.message;
        }
      }
      const out = {
        unknownProfile:attempt({ victims:[{ faiths:['christian'], profile:'e2e_missing' }] }),
        emptyRule:attempt({ victims:[{ profile:'northmen' }] }),
        unknownCulture:attempt({ profiles:{ rival_raiders:{ cultures:['e2e_missing'] } },
          fallbackProfile:'rival_raiders', victims:[] }),
        missingFallback:attempt({ fallbackProfile:'e2e_missing' }),
        untouched:Object.keys(FBDATA.raidingTraditions.profiles).sort()
      };
      out.valid = attempt({
        victims:[{ faiths:['christian'], profile:'e2e_raiders' }],
        profiles:{ e2e_raiders:{ cultures:['norse'] }, rival_raiders:{} }
      });
      out.applied = {
        victims:FBDATA.raidingTraditions.victims,
        profiles:Object.keys(FBDATA.raidingTraditions.profiles).sort(),
        fallback:FBDATA.raidingTraditions.fallbackProfile,
        cultures:FBDATA.raidingTraditions.cultures.length > 0
      };
      return out;
    });
    expect(result.valid).toBe('');
    expect(result.unknownProfile).toContain('raidingTraditions.victims[0].profile');
    expect(result.emptyRule).toContain('must name cultures, faiths or both.');
    expect(result.unknownCulture).toContain('references unknown id e2e_missing');
    expect(result.missingFallback).toContain('raidingTraditions.fallbackProfile');
    expect(result.untouched).toEqual(['cross_banners', 'northmen', 'rival_raiders',
      'rus_raiders', 'saxon_host', 'steppe_riders']);
    expect(result.applied).toEqual({
      victims:[{ faiths:['christian'], profile:'e2e_raiders' }],
      profiles:['e2e_raiders', 'rival_raiders'],
      fallback:'rival_raiders',
      cultures:true
    });
  });

test('an era restriction hides a unit class and an equipment window hides an item',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const eraId = FB.campaignEra(state);
      const era = FBDATA.eras[eraId];
      const savedMilitary = era.military;
      /* any realm that fields a class of a role that is not core */
      let pair = null;
      Object.keys(state.realms).some(function (rid) {
        return FB.unitClassIds().some(function (classId) {
          const role = FB.unitClassRole(classId);
          if (!role || FB.UNIT_ROLES[role].core) return false;
          if (!FB.unitClassUnlocked(state, classId, rid)) return false;
          pair = { rid:rid, classId:classId, role:role };
          return true;
        });
      });
      FBDATA.items.e2e_late_jack = Object.assign({}, FBDATA.items.padded_jack, { yearMin:700 });
      FBDATA.items.e2e_old_jack = Object.assign({}, FBDATA.items.padded_jack, { yearMax:800 });
      const out = { pair:pair };
      try {
        out.before = FB.unitClassUnlocked(state, pair.classId, pair.rid);
        out.lateBefore = FB.itemAvailability(state, 'e2e_late_jack').ready;
        out.old = FB.itemAvailability(state, 'e2e_old_jack');
        era.military = { excludeRoles:[pair.role], equipment:{ from:476, to:649 } };
        out.validation = FB.validateEraMilitary(eraId, era);
        out.allowed = FB.unitClassEraAllowed(state, pair.classId);
        out.after = FB.unitClassUnlocked(state, pair.classId, pair.rid);
        out.levy = FB.unitClassEraAllowed(state, FB.unitRoleClass('levy_infantry'));
        out.late = FB.itemAvailability(state, 'e2e_late_jack');
        out.plain = FB.itemAvailability(state, 'padded_jack').ready;
      } finally {
        era.military = savedMilitary;
        delete FBDATA.items.e2e_late_jack;
        delete FBDATA.items.e2e_old_jack;
      }
      out.restored = FB.unitClassUnlocked(state, pair.classId, pair.rid);
      return out;
    });
    expect(result.pair).not.toBeNull();
    expect(result.before).toBe(true);
    expect(result.validation).toEqual([]);
    expect(result.allowed).toBe(false);
    expect(result.after).toBe(false);
    expect(result.levy).toBe(true);
    expect(result.restored).toBe(true);
    expect(result.lateBefore).toBe(true);
    expect(result.old).toMatchObject({ ready:false, reason:'No longer made after 800.' });
    expect(result.late).toMatchObject({ ready:false, reason:'Not made in this era.' });
    expect(result.plain).toBe(true);
  });
