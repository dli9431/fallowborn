'use strict';
const { test, expect } = require('../support/fixture');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const { openGame } = require('../support/game/navigation');
const { openCrazyGame } = require('../support/game/crazygames-title');
const { mockCrazyGames } = require('../support/crazygames');
const { startParityGame } = require('../support/game/parity');
const { restoreBookmark, advanceBookmark } = require('../support/game/bookmark-acceptance');
const { injectBrowserHarness } = require('../support/game/browser-harness');
dependsOnRuntime(__filename, [
  'data/story_courts_476.js',
  'data/aristocratic_courts.js', 'js/government_aristocracy.js', 'js/government_recognition.js', 'js/government_administration.js', 'js/bookmark_setup.js', 'js/starts.js',
  'index.html', 'data/bookmark_476_outer.js', 'data/bookmark_476.js', 'data/mobile_confederations.js',
  'data/assembly_polities.js', 'js/government_support.js', 'js/government_collective.js', 'js/government_assembly.js',
  'data/bookmark_476_italy.js', 'data/bookmark_476_dalmatia_east.js',
  'data/bookmark_476_gaul_iberia.js', 'data/bookmark_476_africa.js',
  'data/starts.js', 'data/cultures.js', 'data/intrigue.js',
  'data/political_institutions.js', 'data/technology.js', 'data/settlements.js',
  'data/geographies.js', 'data/climate.js', 'data/eras.js', 'data/systems.js',
  'data/story_campaigns.js', 'data/distribution_crazygames.js', 'js/crazygames.js',
  'js/world.js', 'js/model.js', 'js/institutions.js', 'js/religion.js',
  'js/authority.js', 'js/population.js', 'js/justice.js', 'js/technology.js',
  'js/climate.js', 'js/governments.js', 'js/settlement.js', 'js/events.js',
  'js/stories.js', 'js/story_courts.js', 'data/story_instances.js',
  'js/save.js', 'js/save_v4.js', 'js/main.js'
]);

async function start(page, testInfo, county, identity, scenario) {
  const family = scenario === 'federate_476' ? 'standard' : 'established';
  await startParityGame(page, testInfo, { bookmark:'476',
    code:'OUTER476-476-' + (scenario || 'farmer_476') + '-' +
      (county || 'shrewsbury') + '-m-Review-' + family + '-0-' + (identity || 'brittonic.nicene') });
}

async function saveBudget(page, testInfo, label, budget) {
  const source = await page.evaluate(function () { return FB.save.serialize(); });
  const bytes = Buffer.byteLength(source, 'utf8');
  await testInfo.attach(label + '-budget.json', { contentType:'application/json',
    body:Buffer.from(JSON.stringify({ bookmark:'476', bytes:bytes, ceiling:budget })) });
  expect(bytes, label + ' uncompressed v4 JSON').toBeLessThanOrEqual(budget);
  return source;
}

for (const crazygames of [false, true]) {
  for (const sample of [
    ['shrewsbury','brittonic.nicene'], ['lund','north_germanic_476.germanic_pagan'],
    ['baghdad','syriac.east_syriac'], ['istakhr','persian.zoroastrian'], ['antioch','greek.miaphysite']
  ]) {
    test('wider 476 household at ' + sample[0] + ' preserves independent regional content with flag ' + crazygames,
      async function ({ page }, testInfo) {
        if (crazygames) await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
        await start(page, testInfo, sample[0], sample[1]);
        const result = await page.evaluate(function () {
          const s = FB.state, b = FB.bookmark('476'), earlier = FB.bookmark('867');
          const region = FBDATA.bookmarkRegions476.outer;
          const medieval = JSON.stringify(FB.bookmark('867'));
          const sites = region.provinces.map(function (p) {
            return FB.world.sitesByProv[p.id].list.filter(function (site) { return site.authored; })
              .map(function (site) { return site.site; });
          });
          const identity = [s.chars[s.player.charId].culture, s.chars[s.player.charId].religion];
          const pero = FB.authoredRoyalMemberSnapshot(s, 'sasanian_476', 'ruler');
          const father = FB.authoredRoyalMemberSnapshot(s, 'sasanian_476', 'yazdegerd');
          const brother = FB.authoredRoyalMemberSnapshot(s, 'sasanian_476', 'balash');
          const initial = JSON.stringify(s.authority.rights);
          FB.save.restore(JSON.parse(FB.save.serialize()));
          return {
            faults:FB.validateBookmark(b), legal:FB.validateLegalTraditions(), technology:FB.validateTechnologyData(true),
            stable:b.provinces.map(function (p) { return p.id; }).sort().join('|') ===
              earlier.provinces.map(function (p) { return p.id; }).sort().join('|'),
            unique:new Set(b.provinces.map(function (p) { return p.id; })).size === b.provinces.length,
            added:region.provinces.length, courts:region.realms.length,
            direct:region.provinces.every(function (p) {
              return FB.state.owner[p.id] === p.realm && FB.state.holder[p.id] === p.realm;
            }),
            weighted:region.provinces.every(function (p) {
              return p.communities.reduce(function (n, c) { return n + c.populationShare0; }, 0) === 10000;
            }),
            heads:sites.every(function (list) { return list.length === 1; }),
            sites:sites.every(function (list, i) {
              return list[0] === region.provinces[i].id + '_outer_476';
            }),
            restoredRights:initial === JSON.stringify(FB.state.authority.rights),
            untouched:medieval === JSON.stringify(FB.bookmark('867')),
            identity:identity,
            offMap:['nicosia','novgorod','merv','balkh','etelkoz','norrland','scone','tara'].every(function (id) {
              return FB.world.byId[id].wasteland && !FB.state.owner[id] && !FB.state.holder[id];
            }),
            generated:region.realms.every(function (r) {
              return r.id === 'sasanian_476' ? r.ruler.name === 'Peroz' : r.ruler.generated === true && !r.ruler.name;
            }),
            royalFamily:pero.dyn === 'Sasan' && pero.fatherId === father.id &&
              brother.fatherId === father.id && brother.name === 'Balash' &&
              brother.alive && !father.alive && father.died === 457,
            chapters:!!FB.state.stories.western_court_476 && !!FB.state.stories.zeno_return_476,
            valid:FB.save.v4.validatePlatform(JSON.parse(FB.save.serialize()).state),
            reviews:['british','northern','near_east'].map(function (id) {
              return FBDATA.techImpactReviews.features['period_476_' + id + '_region'].mode;
            })
          };
        });
        expect(result).toEqual({ faults:[], legal:[], technology:[], stable:true, unique:true, added:106, courts:17,
          direct:true, weighted:true, heads:true, sites:true, restoredRights:true, untouched:true,
          identity:sample[1].split('.'), offMap:true, generated:true, royalFamily:true, chapters:true, valid:true,
          reviews:['none','none','none'] });
        await saveBudget(page, testInfo, 'fresh-' + sample[0], 4 * 1024 * 1024);
        if (!crazygames && ['shrewsbury','lund','baghdad'].indexOf(sample[0]) >= 0) {
          await injectBrowserHarness(page);
          await advanceBookmark(page, 360);
          const checkpoint = await saveBudget(page, testInfo, 'household-year1-' + sample[0], 6 * 1024 * 1024);
          await restoreBookmark(page, checkpoint);
          expect(await page.evaluate(function () { return FB.state.start.id; })).toBe('476');
        }
      });
  }
}

for (const sample of [
  ['craftsman_476','lund','north_germanic_476.germanic_pagan','craftsman'],
  ['cleric_476','baghdad','syriac.east_syriac','monk']
]) {
  test('wider local ' + sample[0] + ' retains its household profession without a Ravenna track',
    async function ({ page }, testInfo) {
      await start(page, testInfo, sample[1], sample[2], sample[0]);
      const saved = await saveBudget(page, testInfo, sample[0], 4 * 1024 * 1024);
      await restoreBookmark(page, saved);
      const result = await page.evaluate(function () {
        const s = FB.state;
        return { bookmark:s.start.id, province:s.player.provinceId, profession:s.player.profession,
          tracks:['federate_track_476','curialis_track_476'].filter(function (id) { return !!s.stories[id]; }),
          valid:FB.save.v4.validatePlatform(JSON.parse(FB.save.serialize()).state) };
      });
      expect(result).toEqual({ bookmark:'476', province:sample[1], profession:sample[3], tracks:[], valid:true });
    });
}

test('on-map Antioch and Jerusalem retain offices while other bookmarks keep off-map seats and institutions survive restore',
  async function ({ page }, testInfo) {
    await start(page, testInfo, 'antioch', 'greek.miaphysite');
    const result = await page.evaluate(function () {
      const s = FB.state, defs = FB.localInstitutionDefinitions(s);
      const original = FBDATA.localInstitutions;
      const antioch = FB.religiousOfficeSnapshot(s, 'antioch_patriarch');
      const jerusalem = FB.religiousOfficeSnapshot(s, 'jerusalem_bishop');
      const records = JSON.stringify(s.localInstitutions);
      const crossings = FBDATA.bookmarkRegions476.outer.straits.every(function (pair) {
        return !!FB.world.adj[pair[0]][pair[1]] && !!FB.world.adj[pair[1]][pair[0]];
      });
      const season = [FB.climateZoneOf('antioch'), FB.climateZoneOf('baghdad'), FB.climateZoneOf('lund')];
      const dual = ['ctesiphon_fire_congregation_476','ctesiphon_syriac_congregation_476'].map(function (id) {
        const c = s.chars[s.localInstitutions[id].representativeId]; return [c.religion, c.generatedOfficeholder];
      });
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { antioch:[defs.antioch_see.provinceId, defs.antioch_see.site, antioch.name],
        jerusalem:[defs.jerusalem_see.provinceId, jerusalem.name],
        oldSeats:[original.antioch_see.site, original.antioch_see.provinceId, original.jerusalem_see.site],
        present:Object.keys(FBDATA.bookmarkRegions476.outer.institutions).every(function (id) {
          return !!FB.state.localInstitutions[id];
        }),
        restored:records === JSON.stringify(FB.state.localInstitutions), crossings:crossings,
        season:season, dual:dual,
        roman:FB.bookmark('476').provinces.filter(function (p) {
          return p.realm === 'byzantium';
        }).every(function (p) { return !!FB.bookmark('476').duchies[p.duchy]; }) };
    });
    expect(result).toEqual({ antioch:['antioch','antioch_outer_476','Peter the Fuller'],
      jerusalem:['jerusalem','Anastasius'], oldSeats:[null,null,null], present:true, restored:true,
      crossings:true, season:['mediterranean','continental','northern_temperate'],
      dual:[['zoroastrian',true],['east_syriac',true]], roman:true });
  });

for (const scenario of ['federate_476','curialis_476']) {
  test('the wider world retains the Ravenna ' + scenario + ' opening and its exact player track',
    async function ({ page }, testInfo) {
      const identity = scenario === 'federate_476' ? 'gothic.homoian' : 'roman.nicene';
      await start(page, testInfo, 'ravenna', identity, scenario);
      const result = await page.evaluate(function () {
        const s = FB.state;
        return { western:!!s.stories.western_court_476,
          tracks:['federate_track_476','curialis_track_476'].filter(function (id) { return !!s.stories[id]; }),
          host:s.armies.filter(function (a) { return a.id === 'host_476_federates'; }).length,
          owner:s.owner.ravenna };
      });
      expect(result).toEqual({ western:true,
        tracks:[scenario === 'federate_476' ? 'federate_track_476' : 'curialis_track_476'],
        host:1, owner:'italy' });
    });
}

test('local practice and provincial jurisdiction use baseline rights without research or population replacement',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const accused = function (culture, faith, home) {
        const c = FB.makeCharacter(s, { sex:'m', culture:culture, religion:faith,
          born:446, station:1, quality:1, traitsN:0 });
        c.homeProvinceId = home; return c.id;
      };
      const british = accused('brittonic','nicene','canterbury');
      const saxon = accused('saxon_476','germanic_pagan','canterbury');
      const syriac = accused('syriac','east_syriac','baghdad');
      const kent = FB.materializeRealmRuler(s, 'kentish_settlers_476');
      const persia = FB.materializeRealmRuler(s, 'sasanian_476');
      const bytes = JSON.stringify(s), rng = FB.getRngState();
      const laws = [
        FB.justiceTradition(s, kent.id, 'secular', { accusedId:british }).id,
        FB.justiceTradition(s, kent.id, 'secular', { accusedId:saxon }).id,
        FB.justiceTradition(s, persia.id, 'secular', { accusedId:syriac }).id
      ];
      const rights = ['peace','revenue'].every(function (power) {
        return s.authority.rights.some(function (r) {
          return r.power === power && r.scope.id === 'antioch' &&
            r.basisRef === 'provincial_court_476:antioch';
        });
      });
      const mixed = FB.countyCultureShare(s, 'canterbury', 'brittonic') > 0.30 &&
        FB.countyReligionShare(s, 'baghdad', 'east_syriac') > 0.50;
      return { laws:laws, rights:rights, mixed:mixed,
        pure:bytes === JSON.stringify(s) && rng === FB.getRngState() };
    });
    expect(result).toEqual({ laws:['british_custom_476','saxon_custom_476','sasanian_custom_476'],
      rights:true, mixed:true, pure:true });
  });

for (const crazygames of [false, true]) {
  test('regional community events leave the complete catalogue valid at medieval boot with flag ' + crazygames,
    async function ({ page }, testInfo) {
      if (crazygames) {
        await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
        await mockCrazyGames(page);
        await openCrazyGame(page, testInfo);
      } else await openGame(page, testInfo);
      const result = await page.evaluate(async function () {
        await new Promise(function (resolve, reject) {
          FB.activateBookmark('867', null, function (error) { if (error) reject(error); else resolve(); });
        });
        const rng = FB.getRngState(), uid = FB.getUidCounter(), faults = [];
        FBDATA.events.forEach(function (event) {
          try { FB.validateCommunityEvent(event); }
          catch (error) { faults.push({ id:event.id, message:error.message }); }
        });
        const relief = FB.eventById('antioch_congregation_relief_476');
        const invalid = JSON.parse(JSON.stringify(relief));
        invalid.trigger.countyCommunityShare.kind = 'religion';
        let rejected = '';
        try { FB.validateCommunityEvent(invalid); } catch (error) { rejected = error.message; }
        return { bookmark:FB.activeBookmarkId, faults:faults,
          share:relief.trigger.countyCommunityShare,
          unrelated:!!FB.eventById('ghw_called'), rejected:rejected,
          pure:rng === FB.getRngState() && uid === FB.getUidCounter() };
      });
      expect(result).toEqual({ bookmark:'867', faults:[],
        share:{ kind:'faith', target:'miaphysite', min:0.1 }, unrelated:true,
        rejected:'trigger.countyCommunityShare.kind must be culture or faith.', pure:true });
    });
}

test('regional events follow live communities, county and period gates with reviewed local receipts',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      const initial = JSON.parse(FB.save.serialize());
      const tests = [
        ['british_farm_boundary_476','shrewsbury',0,2],
        ['british_coastal_households_476','canterbury',-3,2],
        ['northern_iron_exchange_476','lund',0,0],
        ['northern_assembly_compensation_476','bremen',0,2],
        ['antioch_congregation_relief_476','antioch',-4,2],
        ['mesopotamian_frontier_receipt_476','amida',2,0],
        ['sasanian_water_channels_476','baghdad',-4,2],
        ['ctesiphon_multilingual_market_476','baghdad',0,0]
      ];
      return tests.map(function (row) {
        FB.save.restore(JSON.parse(JSON.stringify(initial)));
        const s = FB.state, p = s.player, c = s.chars[p.charId], event = FB.eventById(row[0]);
        p.provinceId = row[1]; p.profession = 'merchant'; p.gold = 100; c.born = 446; c.traits = [];
        FB.setCountySupport(s, row[1], 0);
        const allowed = FB.checkTrigger(s, event.trigger);
        p.provinceId = 'ravenna';
        const away = FB.checkTrigger(s, event.trigger);
        p.provinceId = row[1];
        const now = FB.eventPeriodEnabled(s, event);
        s.date.year = 650; const later = FB.eventPeriodEnabled(s, event); s.date.year = 476;
        const option = event.options[0], ctx = FB.eventContextFor(s, event, {});
        const bytes = JSON.stringify(s), rng = FB.getRngState();
        const preview = FB.previewEventOption(s, event, option, ctx);
        const pure = bytes === JSON.stringify(s) && rng === FB.getRngState();
        const receipt = FB.resolveEventOption(s, event, option, ctx);
        const hasSupport = function (impacts) {
          return impacts.some(function (i) { return i.type === 'commonVoice' && i.amount === row[3]; });
        };
        const gold = p.gold - 100, support = FB.countySupportBase(s, row[1]);
        const reported = row[3] === 0 || hasSupport(receipt.impacts) &&
          preview.sections.some(function (section) { return hasSupport(section.impacts); });
        const log = JSON.stringify(s.log);
        FB.save.restore(JSON.parse(FB.save.serialize()));
        return { id:row[0], allowed:allowed, away:away, now:now, later:later,
          pure:pure, reported:reported, gold:gold, support:support,
          saved:log === JSON.stringify(FB.state.log) && FB.countySupportBase(FB.state, row[1]) === support };
      });
    });
    expect(result).toEqual([
      ['british_farm_boundary_476',0,2], ['british_coastal_households_476',-3,2],
      ['northern_iron_exchange_476',0,0], ['northern_assembly_compensation_476',0,2],
      ['antioch_congregation_relief_476',-4,2], ['mesopotamian_frontier_receipt_476',2,0],
      ['sasanian_water_channels_476',-4,2], ['ctesiphon_multilingual_market_476',0,0]
    ].map(function (row) {
      return { id:row[0], allowed:true, away:false, now:true, later:false,
        pure:true, reported:true, gold:row[1], support:row[2], saved:true };
    }));
    const absent = await page.evaluate(function () {
      const s = FB.state, e = FB.eventById('british_coastal_households_476');
      s.player.provinceId = 'canterbury';
      const old = e.trigger;
      return !FB.checkTrigger(s, Object.assign({}, old, {
        countyCommunityShare:{ kind:'culture', target:'brittonic', min:0.99 }
      }));
    });
    expect(absent).toBe(true);
  });

test('one 476 bookmark carries every Wave 12 consumer and retires the separate wider and mobile ids',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      const b = FB.bookmark('476');
      const realm = function (id) { const r = b.realms.find(function (row) { return row.id === id; }); return r && r.government; };
      const offered = FBDATA.startScenarios.filter(function (sc) {
        return Array.isArray(sc.bookmarkIds) && sc.bookmarkIds.indexOf('476') >= 0;
      }).map(function (sc) { return sc.id; });
      const disabled = b.provinces.filter(function (p) { return p.wasteland; });
      return {
        retired:['476_outer','476_mobile'].filter(function (id) { return !!FBDATA.bookmarks[id]; }),
        stale:FBDATA.startScenarios.filter(function (sc) {
          return (sc.bookmarkIds || []).some(function (id) { return id === '476_outer' || id === '476_mobile'; });
        }).map(function (sc) { return sc.id; }),
        revisions:[b.openingRevision, b.openingLegacyRevision, Object.keys(b.openingRevisions).sort()],
        governments:['sasanian_476','cashel_local_476','north_coast_476','pontic_following_476'].map(realm),
        cashel:b.stories.indexOf('cashel_recognition_476') >= 0,
        starts:['farmer_476','craftsman_476','cleric_476','peroz_476','mobile_household_476',
          'federate_476','curialis_476','colonus_476'].every(function (id) { return offered.indexOf(id) >= 0; }),
        anchors:[disabled.filter(function (p) { return !/^w_/.test(p.id); }).length,
          disabled.filter(function (p) { return /^w_/.test(p.id); }).length],
        faults:FB.validateBookmark(b)
      };
    });
    expect(result).toEqual({ retired:[], stale:[],
      revisions:['wider_v1','core_v1',['balkans_v1','core_v1','wider_v1']],
      governments:['aristocratic_monarchy','lineage_kingship','assembly_polity','mobile_confederation'],
      cashel:true, starts:true, anchors:[152,21], faults:[] });
  });

test('a merged 476 save restores, while retired wider and mobile ids fail without changing the live campaign',
  async function ({ page }, testInfo) {
    await start(page, testInfo, 'ravenna', 'roman.nicene');
    const saved = await page.evaluate(function () { return FB.save.serialize(); });
    for (const retired of ['476_outer','476_mobile']) {
      const outcome = await page.evaluate(function (id) {
        const data = JSON.parse(FB.save.serialize());
        data.state.start.id = id;
        const before = FB.save.serialize(), rng = FB.getRngState();
        const accepted = FB.game.loadData(data, function () { window.__retiredLoaded = true; });
        return { accepted:accepted, loaded:!!window.__retiredLoaded, active:FB.activeBookmark.id,
          unchanged:before === FB.save.serialize() && rng === FB.getRngState() };
      }, retired);
      expect(outcome, retired).toEqual({ accepted:false, loaded:false, active:'476', unchanged:true });
    }
    await restoreBookmark(page, saved);
    const result = await page.evaluate(function () {
      const s = FB.state;
      return { id:s.start.id, warnings:FB.save.lastRestoreWarnings.length,
        seats:[s.localInstitutions.antioch_see.site, s.localInstitutions.jerusalem_see.site],
        courts:FBDATA.bookmarkRegions476.outer.realms.every(function (r) { return !!s.realms[r.id]; }),
        platform:FB.save.v4.validatePlatform(JSON.parse(FB.save.serialize()).state) };
    });
    expect(result).toEqual({ id:'476', warnings:0, seats:['antioch_outer_476','jerusalem_outer_476'],
      courts:true, platform:true });
  });

test('merged 476 observes one season with bounded timings, save budgets and cross-bookmark restore',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const error = await page.evaluate(function () {
      return new Promise(function (resolve) {
        FB.activateBookmark('476', null, function (error) {
          if (error) { resolve(error.message); return; }
          FB.game.pending = { seed:'OUTERSEASON' }; FB.game.startObserve();
          FB.game.setPaused(true); resolve(null);
        });
      });
    });
    expect(error).toBe(null);
    await injectBrowserHarness(page);
    await saveBudget(page, testInfo, 'observer-fresh', 4 * 1024 * 1024);
    const timings = [];
    for (let half = 0; half < 2; half++) {
      const result = await page.evaluate(function () {
        const before = FB.state.turn, started = performance.now();
        for (let day = 0; day < 45; day++) {
          const turn = FB.state.turn;
          FB.game.passDay({ deferUi:true });
          if (FB.state.turn !== turn + 1) throw new Error('Wider observer stalled at turn ' + turn);
        }
        return { days:FB.state.turn - before, ms:performance.now() - started, errors:FBTEST.checkInvariants() };
      });
      expect(result.days).toBe(45); expect(result.errors).toEqual([]);
      expect(result.ms, '45-day observer slice').toBeLessThan(30000);
      timings.push(result.ms);
      if (half === 0) {
        const checkpoint = await saveBudget(page, testInfo, 'observer-midpoint', 8 * 1024 * 1024);
        await page.evaluate(function () {
          return new Promise(function (resolve, reject) {
            FB.activateBookmark('867', null, function (error) { if (error) reject(error); else resolve(); });
          });
        });
        await restoreBookmark(page, checkpoint);
        await page.evaluate(function () { FB.game.observe = true; });
      }
    }
    await testInfo.attach('outer-season-timings.json', { contentType:'application/json',
      body:Buffer.from(JSON.stringify({ days:90, sliceMs:timings, sliceCeilingMs:30000 })) });
    const saved = await saveBudget(page, testInfo, 'observer-season', 8 * 1024 * 1024);
    await restoreBookmark(page, saved);
    const result = await page.evaluate(function () {
      const s = FB.state;
      return { date:s.date, id:s.start.id, faults:FB.validateBookmark(FB.bookmark('476')),
        warnings:FB.save.lastRestoreWarnings.length,
        holders:FBDATA.bookmarkRegions476.outer.provinces.every(function (p) {
          return !!s.realms[s.owner[p.id]] && !!s.realms[s.holder[p.id]];
        }), valid:FB.save.v4.validatePlatform(JSON.parse(FB.save.serialize()).state) };
    });
    expect(result).toEqual({ date:{ year:476, season:1, day:1 }, id:'476', faults:[], warnings:0, holders:true, valid:true });
  });
