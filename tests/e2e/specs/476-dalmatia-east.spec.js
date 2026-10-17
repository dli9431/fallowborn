'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/start_ambitions.js', 'js/story_opening_goals.js',
  'data/bookmark_476_wider.js', 'data/bookmark_476_wider_identities.js', 'data/geography_expansion.js',
  'data/story_courts_476.js',
  'index.html', 'data/bookmarks.js', 'data/bookmark_476.js',
  'data/bookmark_476_dalmatia_east.js', 'data/bookmark_476_italy.js',
  'data/bookmark_476_gaul_iberia.js', 'data/bookmark_476_africa.js',
  'data/political_institutions.js', 'data/story_campaigns.js', 'data/technology.js',
  'data/eras.js', 'data/systems.js', 'data/starts.js', 'data/cultures.js',
  'data/counties.js', 'data/map_data.js', 'data/geographies.js',
  'data/settlements.js', 'data/settlements_real.js',
  'js/world.js', 'js/model.js', 'js/institutions.js', 'js/religion.js', 'js/authority.js',
  'js/politics.js', 'js/governments.js', 'js/treasury.js', 'js/population.js',
  'js/events.js', 'js/messages.js', 'js/station.js', 'js/systems.js',
  'js/stories.js', 'js/story_campaign.js', 'data/story_instances.js',
  'js/story_courts.js', 'js/story_track.js',
  'js/federates.js', 'js/armies.js', 'js/wars.js', 'js/main.js',
  'js/save.js', 'js/save_v4.js', 'js/bookmark_setup.js'
]);
const { test, expect } = require('../support/fixture');
const { startParityGame } = require('../support/game/parity');
const { injectBrowserHarness } = require('../support/game/browser-harness');

async function start476(page, testInfo, civic) {
  await startParityGame(page, testInfo, {
    bookmark:'476', code:civic
      ? 'EAST476-476-curialis_476-ravenna-m-Marcus'
      : 'EAST476-476-federate_476-ravenna-m-Marcus-standard-0-gothic.homoian'
  });
}

test('476 smoke preserves authored eastern sites, communities, courts and generated sees through restore',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    const result = await page.evaluate(function () {
      const region = FBDATA.bookmarkRegions476.dalmatia_east;
      const medieval = JSON.stringify([FB.bookmark('867'), FB.bookmark('1066')]);
      function snapshot() {
        const s = FB.state, w = s.stories.western_court_476;
        return {
          names:region.provinces.map(function (p) { return [p.id, FB.world.byId[p.id].name]; }),
          sites:region.provinces.map(function (p) {
            return FB.world.sitesByProv[p.id].list.filter(function (site) { return site.authored; })
              .map(function (site) { return site.site; });
          }),
          heads:Object.keys(region.institutions).filter(function (id) { return region.institutions[id].officeId; })
            .map(function (id) { return [id, s.localInstitutions[id].representativeId]; }),
          cast:[FB.realmRulerCharacterSnapshot(s, 'croatia').name,
            FB.realmRulerCharacterSnapshot(s, 'byzantium').name,
            FB.realmRulerCharacterSnapshot(s, 'pannonia').name,
            FB.realmRulerCharacterSnapshot(s, 'thracian_goths_476').name,
            s.chars[w.zenoId].name, s.chars[s.stories.zeno_return_476.illusId].name,
            s.chars[s.stories.zeno_return_476.trocundesId].name],
          zeno:[s.chars[w.zenoId].homeProvinceId, w.zenoCourt.site, s.owner.ikonion]
        };
      }
      const s = FB.state, before = snapshot();
      const generated = ['thessalonica_see','dyrrachium_see','serdica_see',
        'nicaea_see','ephesus_see','caesarea_see'].every(function (id) {
        const def = region.institutions[id], c = FB.religiousOfficeSnapshot(s, def.officeId);
        return c && !c.dead && c.role === 'priest' && c.generatedOfficeholder === true &&
          c.homeProvinceId === def.provinceId && s.localInstitutions[id].representativeId === c.id;
      });
      const communities = region.provinces.every(function (p) {
        return p.communities.reduce(function (n, row) { return n + row.populationShare0; }, 0) === 10000 &&
          p.communities[0].culture === p.culture && p.communities[0].religion === p.religion &&
          FB.countyCulture(s, p.id) === p.culture && FB.countyReligion(s, p.id) === p.religion;
      });
      const dated = region.provinces.every(function (p) {
        return p.names.some(function (row) { return row.from <= 476 && row.to >= 476 && row.name === p.name; }) &&
          FB.world.byId[p.id].name === p.name;
      });
      const matchingSites = before.sites.every(function (sites, index) {
        return JSON.stringify(sites) === JSON.stringify(region.layouts[region.provinces[index].id].map(function (row) { return row.site; }));
      });
      const historical = [FB.religiousOfficeSnapshot(s, 'salona_bishop').name,
        FB.religiousOfficeSnapshot(s, 'constantinople_patriarch').name];
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { counties:region.provinces.length, generated:generated, communities:communities,
        dated:dated, matchingSites:matchingSites, cast:before.cast, zeno:before.zeno,
        historical:historical, retained:JSON.stringify(before) === JSON.stringify(snapshot()),
        medieval:medieval === JSON.stringify([FB.bookmark('867'), FB.bookmark('1066')]),
        salona:before.sites[region.provinces.findIndex(function (p) { return p.id === 'split'; })],
        isauria:before.sites[region.provinces.findIndex(function (p) { return p.id === 'ikonion'; })] };
    });
    expect(result).toEqual({ counties:40, generated:true, communities:true, dated:true, matchingSites:true,
      cast:['Julius Nepos','Basiliscus','Theoderic the Amal','Theoderic Strabo','Zeno','Illus','Trocundes'],
      zeno:['ikonion','isauria_476','byzantium'], historical:['Glycerius','Acacius'],
      retained:true, medieval:true, salona:['salona_476','split'], isauria:['ikonion_476','isauria_476'] });
  });

test('Salona and Constantinople ratify local guarantees and regional sees mediate without granting land',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    const result = await page.evaluate(function () {
      let s = FB.state;
      const land = JSON.stringify([s.owner, s.holder]);
      const terms = { provision:true, protection:true, courts:true, tolerance:true, taxRelief:true };
      const councils = [['salona_council','croatia'], ['constantinople_senate','byzantium']];
      const bargains = councils.map(function (pair) {
        const subject = { kind:'realm', id:pair[1] }, before = FB.treasuryAvailable(s, pair[1]);
        const accepted = FB.localInstitutionSettle(s, pair[0], subject, terms);
        const paid = FB.treasuryAvailable(s, pair[1]);
        const repeated = FB.localInstitutionSettle(s, pair[0], subject, terms);
        const rights = FB.political.rights(s, { kind:'character', id:s.localInstitutions[pair[0]].representativeId })
          .filter(function (right) { return right.effective; }).map(function (right) { return right.power; }).sort();
        return { stage:accepted && accepted.stage, support:accepted && accepted.ballot.supportWeight,
          cost:before - paid, once:paid === FB.treasuryAvailable(s, pair[1]) &&
            repeated && repeated.recognitionId === accepted.recognitionId, rights:rights };
      });
      const subject = { kind:'realm', id:'byzantium' };
      const sees = ['thessalonica_see','dyrrachium_see','serdica_see','nicaea_see','ephesus_see','caesarea_see'];
      const mediation = sees.map(function (id) {
        const def = FBDATA.localInstitutions[id], before = JSON.stringify(s), rng = FB.getRngState();
        const q = FB.localInstitutionMediationQuote(s, id, subject, def.provinceId);
        const pure = before === JSON.stringify(s) && rng === FB.getRngState();
        const support = FB.localInstitutionMediate(s, id, subject, def.provinceId, q);
        return pure && q.allowed && support && support.issuer.id === def.officeId &&
          support.scope.kind === 'county' && support.scope.id === def.provinceId;
      });
      const beforeCouncil = JSON.stringify(s), councilRng = FB.getRngState();
      const councilQuote = FB.churchCouncilQuote(s, 'byzantium', 'chalcedonian');
      const councilPure = beforeCouncil === JSON.stringify(s) && councilRng === FB.getRngState();
      const funds = FB.treasuryAvailable(s, 'byzantium');
      const council = FB.conveneChurchCouncil(s, councilQuote);
      const councilCost = funds - FB.treasuryAvailable(s, 'byzantium');
      const records = JSON.stringify(s.localInstitutions);
      const recognitions = JSON.stringify(s.authority.recognitions);
      FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
      return { bargains:bargains, mediation:mediation.every(Boolean),
        council:!!council && councilPure, bishops:councilQuote.bishops.length, councilCost:councilCost,
        faith:s.realms.byzantium.religion,
        land:land === JSON.stringify([s.owner, s.holder]),
        records:records === JSON.stringify(s.localInstitutions),
        recognitions:recognitions === JSON.stringify(s.authority.recognitions),
        valid:FB.save.v4.validateAuthority(JSON.parse(FB.save.serialize()).state.authority, s) };
    });
    expect(result).toEqual({ bargains:[0,1].map(function () {
      return { stage:'ratified', support:10, cost:5, once:true, rights:['consent','peace'] };
    // The merged bookmark adds the Chalcedonian see of Byzantine Jerusalem.
    }), mediation:true, council:true, bishops:21, councilCost:30, faith:'chalcedonian',
      land:true, records:true, recognitions:true, valid:true });
  });

test('regional events use live community gates, period windows and ordinary previews and receipts',
  async function ({ page }, testInfo) {
    await start476(page, testInfo, true);
    const result = await page.evaluate(function () {
      let s = FB.state;
      const ids = FBDATA.events.filter(function (ev) { return ev.pack === 'dalmatia_east_476'; }).map(function (ev) { return ev.id; });
      s.player.gold = 100;
      function qualifies(id, at) {
        s.player.provinceId = at;
        return FB.checkTrigger(s, Object.assign({}, FB.eventById(id).trigger, { chance:1 }), {});
      }
      const gates = [
        qualifies('dalmatian_petition_476', 'split'), !qualifies('dalmatian_petition_476', 'thessaloniki'),
        qualifies('salona_episcopal_letters_476', 'split'),
        qualifies('eastern_commission_forms_476', 'constantinople'), !qualifies('eastern_commission_forms_476', 'split'),
        qualifies('balkan_federate_receipts_476', 'thessaloniki'), !qualifies('balkan_federate_receipts_476', 'nicaea'),
        qualifies('danube_road_accounts_476', 'sirmium'), !qualifies('danube_road_accounts_476', 'athens'),
        qualifies('constantinople_encyclical_memory_476', 'constantinople'),
        qualifies('isaurian_household_letters_476', 'ikonion'),
        qualifies('persian_frontier_dispatch_476', 'nicaea')
      ];
      const medieval = { start:{ id:'867', era:'early_medieval' }, date:{ year:867 } };
      const period = ids.every(function (id) {
        // Later Gothic and Isaurian events open in their own year windows.
        const ev = FB.eventById(id);
        const opened = Object.assign({}, s, { date:Object.assign({}, s.date, { year:ev.yearMin || s.date.year }) });
        return ev.tags.indexOf('late_antique') >= 0 && FB.eventPeriodEnabled(opened, ev) &&
          !FB.eventPeriodEnabled(medieval, ev);
      });
      const event = FB.eventById('persian_frontier_dispatch_476');
      const ctx = FB.eventContextFor(s, event, {}), before = JSON.stringify(s), rng = FB.getRngState();
      const preview = FB.previewEventOption(s, event, event.options[0], ctx);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState();
      // Restore stamps the frozen authority schema on live state; compare the records.
      const records = function (a) { return Object.assign({}, a, { schema:undefined }); };
      const land = JSON.stringify([s.owner, s.holder]), politics = JSON.stringify(records(s.authority)), gold = s.player.gold;
      const receipt = FB.resolveEventOption(s, event, event.options[0], ctx);
      const expired = FB.eventById('isaurian_household_letters_476');
      const staleCtx = FB.eventContextFor(s, expired, {});
      s.date.year = 478;
      const expiredState = JSON.stringify(s), expiredRng = FB.getRngState();
      const stale = FB.resolveEventOption(s, expired, expired.options[0], staleCtx);
      const rejectionPure = expiredState === JSON.stringify(s) && expiredRng === FB.getRngState();
      const window = !FB.eventPeriodEnabled(s, expired) &&
        !FB.eventPeriodEnabled(s, FB.eventById('constantinople_encyclical_memory_476')) &&
        FB.eventPeriodEnabled(s, event);
      const persistedLog = JSON.stringify(s.log);
      FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
      return { count:ids.length, gates:gates.every(Boolean), period:period, preview:!!preview && pure,
        cost:gold - s.player.gold, receipt:receipt && receipt.eventId, impacts:receipt && receipt.impacts.length > 0,
        land:land === JSON.stringify([s.owner, s.holder]), politics:politics === JSON.stringify(records(s.authority)),
        inhabited:['nicosia','kiev','mecca'].every(function (id) { return !!s.owner[id] && !!s.holder[id]; }),
        noPersia:!s.realms.persia && !s.realms.persia_476, stale:stale, rejectionPure:rejectionPure,
        window:window, log:persistedLog === JSON.stringify(s.log) };
    });
    expect(result).toEqual({ count:16, gates:true, period:true, preview:true, cost:4,
      receipt:'persian_frontier_dispatch_476', impacts:true, land:true, politics:true,
      inhabited:true, noPersia:true, stale:false, rejectionPure:true, window:true, log:true });
  });

test('one world season retains regional institutions before staged Zeno and Theoderic outcomes',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served', 'Run the bounded world journey once; regional smoke covers the browser matrix.');
    await start476(page, testInfo);
    await injectBrowserHarness(page);
    await page.evaluate(function () {
      FB.game.observe = true;
      delete FB.state.stories.federate_track_476; delete FB.state.stories.opening_federate_476;
      // This journey isolates the original eastern return and Italian rail.
      // The full regional campaign journey lives in 476-balkans-anatolia.spec.js.
      delete FB.state.stories.thracian_pressure_476;
      delete FB.state.stories.amal_epirus_476;
      // Isolate random diplomacy while real daily, seasonal, treasury,
      // institution and campaign transactions continue.
      window.east476OriginalChance = FB.chance;
      FB.chance = function (probability) { return probability >= 1; };
    });
    try {
      for (let batch = 0; batch < 3; batch++) {
        const tick = await page.evaluate(function () {
          const before = FB.state.turn;
          for (let day = 0; day < 30; day++) {
            const turn = FB.state.turn;
            FB.game.passDay({ deferUi:true });
            if (FB.state.turn !== turn + 1) throw new Error('Eastern observer stalled at turn ' + turn);
          }
          return { days:FB.state.turn - before, errors:FBTEST.checkInvariants() };
        });
        expect(tick).toEqual({ days:30, errors:[] });
        if (batch === 1) await page.evaluate(function () { FB.save.restore(JSON.parse(FB.save.serialize())); });
      }
      const journey = await page.evaluate(function () {
        const s = FB.state, host = s.armies.find(function (a) { return a.id === 'host_476_amal'; });
        return { date:s.date, turn:s.turn, phase:s.stories.zeno_return_476.phase,
          zeno:FB.realmRulerCharacterSnapshot(s, 'byzantium').name,
          institutions:Object.keys(FBDATA.bookmarkRegions476.dalmatia_east.institutions).every(function (id) {
            return !!s.localInstitutions[id];
          }), host:!!host && host.men >= 120,
          inhabited:['nicosia','kiev','mecca'].every(function (id) { return !!s.owner[id]; }) };
      });
      expect(journey).toEqual({ date:{ year:476, season:1, day:1 }, turn:90, phase:'pending',
        zeno:'Basiliscus', institutions:true, host:true, inhabited:true });
      const restoration = await page.evaluate(function () {
        // Review the later return boundary directly instead of simulating
        // another season solely to reach the authored opportunity.
        const s = FB.state;
        s.date = { year:476, season:2, day:1 }; s.turn = 180;
        FB.stories.day(s);
        FB.save.restore(JSON.parse(FB.save.serialize()));
        return { result:FB.state.stories.zeno_return_476.result,
          zeno:FB.realmRulerCharacterSnapshot(FB.state, 'byzantium').name };
      });
      expect(restoration).toEqual({ result:'restored', zeno:'Zeno' });
      const campaign = await page.evaluate(function () {
        const s = FB.state, host = s.armies.find(function (a) { return a.id === 'host_476_amal'; });
        // The campaign opportunity begins after the observed season. Advance
        // its date boundary, then stage a won ordinary war rather than forcing history.
        s.date = { year:488, season:0, day:1 }; s.turn = 12 * 360;
        s.realms.byzantium.treasury.gold = 1000;
        FB.stories.day(s);
        const rec = s.stories.theoderic_italy_476;
        const moving = FB.political.movingPolity(s, rec.migrationId);
        const begun = rec.phase === 'started' && moving.hostId === host.id && s.owner.ravenna !== 'pannonia';
        const war = FB.ordinaryWarById(s, moving.warId);
        FB.transferProvince(s, 'ravenna', 'pannonia');
        FB.settleOrdinaryWar(s, moving.warId, 'victory');
        host.at = 'ravenna'; host.moveLeft = 0; host.path = [];
        FB.federateDay(s); FB.stories.day(s);
        const outcome = rec.result, records = JSON.stringify(s.stories);
        FB.save.restore(JSON.parse(FB.save.serialize()));
        return { begun:begun, target:war.objectives[0].target, outcome:outcome,
          settled:FB.political.movingPolity(FB.state, moving.id).status,
          saved:records === JSON.stringify(FB.state.stories), errors:FBTEST.checkInvariants() };
      });
      expect(campaign).toEqual({ begun:true, target:'ravenna', outcome:'won', settled:'settled', saved:true, errors:[] });
    } finally {
      await page.evaluate(function () { FB.chance = window.east476OriginalChance; delete window.east476OriginalChance; });
    }
  });
