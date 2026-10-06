'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'data/bookmark_476_africa.js', 'data/bookmark_476.js',
  'data/bookmarks.js', 'data/settlements.js', 'data/geographies.js',
  'data/intrigue.js', 'data/political_institutions.js', 'data/story_campaigns.js',
  'data/eras.js', 'data/systems.js', 'data/economy.js', 'data/cultures.js',
  'data/distribution_crazygames.js', 'js/world.js', 'js/institutions.js',
  'js/authority.js', 'js/justice.js', 'js/population.js', 'js/events.js',
  'js/stories.js', 'js/story_campaign.js', 'js/story_476_rails.js',
  'js/story_western_court_476.js', 'js/wars.js', 'js/armies.js',
  'js/save.js', 'js/save_v4.js', 'js/main.js', 'js/modifiers.js', 'js/model.js'
]);
const { test, expect } = require('../support/fixture');
const { startParityGame } = require('../support/game/parity');
const { openGame } = require('../support/game/navigation');

async function start(page, testInfo) {
  await startParityGame(page, testInfo, { bookmark:'476',
    code:'AFRICA476-476-federate_476-ravenna-m-Marcus-standard-0-gothic.homoian' });
}

for (const crazygames of [false, true]) {
  test('Africa smoke and save retain authored courts, communities and sites with flag ' + crazygames,
    async function ({ page }, testInfo) {
      if (crazygames) await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
      await start(page, testInfo);
      const result = await page.evaluate(function () {
        const s = FB.state, region = FBDATA.bookmarkRegions476.africa;
        const initial = region.provinces.map(function (p) {
          return [p.id, s.owner[p.id], s.holder[p.id], FB.world.byId[p.id].name];
        });
        const heads = function () {
          return ['tunis','kairouan','constantine','tlemcen'].map(function (id) {
            return FB.world.sitesByProv[id].list.filter(function (site) { return site.authored; })
              .map(function (site) { return site.site; });
          });
        };
        const sites = heads();
        const ruler = FB.realmRulerCharacterSnapshot(s, 'aghlabids');
        const source = JSON.stringify(FBDATA.bookmarks['867']);
        FB.save.restore(JSON.parse(FB.save.serialize()));
        return { faults:FB.validateBookmark(FB.bookmark('476')),
          direct:initial.every(function (row, i) {
            return row[1] === region.provinces[i].realm && row[2] === row[1] &&
              FB.state.owner[row[0]] === row[1] && FB.state.holder[row[0]] === row[2];
          }),
          courts:region.realms.map(function (r) { return [r.id, r.capital]; }),
          generated:region.realms.filter(function (r) { return r.id !== 'aghlabids'; })
            .every(function (r) { return r.ruler.generated && !r.ruler.name; }),
          ruler:ruler.name, coast:FB.countyReligionShare(FB.state, 'tunis', 'nicene') > 0.70,
          mixed:FB.countyCultureShare(FB.state, 'tlemcen', 'roman') > 0.10 &&
            FB.countyReligionShare(FB.state, 'tlemcen', 'nicene') > 0.50,
          sites:sites, restoredSites:heads(),
          crossing:!!FB.world.adj.siracusa.tunis && !!FB.world.adj.tunis.siracusa,
          medieval:source === JSON.stringify(FBDATA.bookmarks['867']),
          valid:FB.save.v4.validatePlatform(JSON.parse(FB.save.serialize()).state) };
      });
      expect(result).toMatchObject({ faults:[], direct:true, generated:true, ruler:'Gaiseric',
        coast:true, mixed:true, crossing:true, medieval:true, valid:true });
      expect(result.courts).toEqual([['aghlabids','tunis'], ['mauri_476','constantine'],
        ['altava_476','tlemcen'], ['tingitana_476','fes']]);
      expect(result.sites).toEqual([['carthage_476'], ['sufetula_476','hadrumetum_476'],
        ['constantine_476','hippo_regius_476'], ['pomaria_476','altava_476']]);
      expect(result.restoredSites).toEqual(result.sites);
    });
}

test('Carthage keeps a suppressed Nicene vacancy beside a separate living royal congregation',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const ids = ['carthage_council','carthage_see','carthage_homoian_see',
        'sufetula_council','hippo_council','altava_council','altava_see'];
      const rows = ids.map(function (id) { return s.localInstitutions[id]; });
      const bishop = FB.religiousOfficeSnapshot(s, 'carthage_homoian_bishop');
      const vacant = !FB.religiousOfficeSnapshot(s, 'carthage_bishop');
      const before = JSON.stringify(rows);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { present:rows.every(Boolean), vacant:vacant,
        separate:bishop && bishop.religion === 'homoian' && bishop.generatedOfficeholder === true,
        durable:before === JSON.stringify(ids.map(function (id) { return FB.state.localInstitutions[id]; })),
        stillVacant:!FB.religiousOfficeSnapshot(FB.state, 'carthage_bishop') };
    });
    expect(result).toEqual({ present:true, vacant:true, separate:true, durable:true, stillVacant:true });
  });

test('Vandal personal law and estate privilege affect treatment without converting provincials',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, ruler = FB.materializeRealmRuler(s, 'aghlabids');
      const make = function (culture) {
        const c = FB.makeCharacter(s, { sex:'m', culture:culture, religion:'nicene',
          born:446, station:1, quality:1, traitsN:0 });
        c.homeProvinceId = 'tunis'; return c.id;
      };
      const roman = make('roman'), vandal = make('vandal');
      const bytes = JSON.stringify(s), rng = FB.getRngState();
      const local = FB.political.communityGovernance(s, 'tunis');
      const laws = [
        FB.justiceTradition(s, ruler.id, 'secular', { accusedId:roman }).id,
        FB.justiceTradition(s, ruler.id, 'secular', { accusedId:vandal }).id,
        FB.justiceTradition(s, ruler.id, 'secular', { accusedId:roman, otherPartyId:vandal }).id
      ];
      return { laws:laws, tax:local.identity.taxation, tension:local.annualSupport < 0,
        roman:FB.countyCultureShare(s, 'tunis', 'roman') > 0.70,
        pure:bytes === JSON.stringify(s) && rng === FB.getRngState(),
        faults:FB.validateLegalTraditions(),
        right:(s.authority.rights || []).some(function (r) {
          return r.scope.id === 'tunis' && r.power === 'revenue' && r.basisRef === 'vandal_estates_476:tunis';
        }) };
    });
    expect(result).toEqual({ laws:['late_roman','vandal_custom','vandal_custom'],
      tax:'discriminatory', tension:true, roman:true, pure:true, faults:[], right:true });
  });

test('African event content follows local communities, profession and the late antique period',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, p = s.player;
      const event = function (id) { return FBDATA.events.find(function (e) { return e.id === id; }); };
      p.profession = 'civic_clerk'; p.provinceId = 'tunis';
      const eligible = FB.checkTrigger(s, event('africa_estate_rolls_476').trigger);
      p.provinceId = 'ravenna';
      const away = FB.checkTrigger(s, event('africa_estate_rolls_476').trigger);
      p.provinceId = 'tlemcen';
      const market = FB.checkTrigger(s, event('africa_highland_market_476').trigger);
      p.profession = 'merchant'; p.provinceId = 'tunis';
      const cargo = FB.checkTrigger(s, event('africa_sicilian_cargo_476').trigger);
      const authored = FBDATA.bookmarkRegions476.africa.events;
      const now = authored.every(function (e) { return FB.eventPeriodEnabled(s, e); });
      s.date.year = 601;
      const later = authored.some(function (e) { return FB.eventPeriodEnabled(s, e); });
      return { eligible:eligible, away:away, market:market, cargo:cargo,
        now:now, later:later, tagged:authored.every(function (e) {
          return e.pack === 'africa_476' && e.eras.join('|') === 'late_antique';
        }) };
    });
    expect(result).toEqual({ eligible:true, away:false, market:true, cargo:true,
      now:true, later:false, tagged:true });
  });

for (const crazygames of [false, true]) {
  test('African household goodwill reaches county support, previews and saved receipts with flag ' + crazygames,
    async function ({ page }, testInfo) {
      if (crazygames) await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
      await start(page, testInfo);
      const results = await page.evaluate(function () {
        const initial = JSON.parse(FB.save.serialize());
        return [
          { id:'africa_estate_rolls_476', option:0, county:'tunis', support:2, gold:-2 },
          { id:'africa_two_congregations_476', option:0, county:'tunis', support:2, gold:-3 },
          { id:'africa_highland_market_476', option:0, county:'tlemcen', support:2, gold:0 },
          { id:'africa_highland_market_476', option:1, county:'tlemcen', support:3, gold:-3 }
        ].map(function (def) {
          FB.save.restore(JSON.parse(JSON.stringify(initial)));
          let s = FB.state;
          const p = s.player, me = s.chars[p.charId];
          p.provinceId = def.county; p.profession = 'civic_clerk'; p.gold = 100;
          me.traits = [];
          FB.setCountySupport(s, def.county, 0);
          const elsewhere = FB.countySupportBase(s, 'ravenna');
          const event = FB.eventById(def.id), option = event.options[def.option];
          const ctx = FB.eventContextFor(s, event, {});
          const bytes = JSON.stringify(s), rng = FB.getRngState();
          const preview = FB.previewEventOption(s, event, option, ctx);
          const pure = bytes === JSON.stringify(s) && rng === FB.getRngState();
          const disclosed = preview.sections.some(function (section) {
            return section.impacts.some(function (impact) {
              return impact.type === 'commonVoice' && impact.amount === def.support;
            });
          });
          const receipt = FB.resolveEventOption(s, event, option, ctx);
          const support = FB.countySupportBase(s, def.county), gold = p.gold - 100;
          const reported = receipt.impacts.some(function (impact) {
            return impact.type === 'commonVoice' && impact.amount === def.support;
          });
          const log = JSON.stringify(s.log);
          FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
          return { id:def.id, option:def.option, pure:pure, disclosed:disclosed, reported:reported,
            support:support, gold:gold, local:FB.countySupportBase(s, 'ravenna') === elsewhere,
            saved:FB.countySupportBase(s, def.county) === support && log === JSON.stringify(s.log) };
        });
      });
      expect(results).toEqual([
        { id:'africa_estate_rolls_476', option:0, support:2, gold:-2 },
        { id:'africa_two_congregations_476', option:0, support:2, gold:-3 },
        { id:'africa_highland_market_476', option:0, support:2, gold:0 },
        { id:'africa_highland_market_476', option:1, support:3, gold:-3 }
      ].map(function (row) {
        return Object.assign(row, { pure:true, disclosed:true, reported:true, local:true, saved:true });
      }));
    });
}

for (const outcome of ['won','failed','diverted']) {
  test('African reconquest resolves ' + outcome + ' against the current coastal ruler and cannot replay',
    async function ({ page }, testInfo) {
      await start(page, testInfo);
      const result = await page.evaluate(function (outcome) {
        let s = FB.state;
        const story = FB.stories.get('eastern_africa_476');
        FB.transferProvince(s, 'tunis', 'altava_476');
        s.date.year = 533;
        const rec = s.stories.eastern_africa_476;
        story.day(s, rec);
        const war = FB.ordinaryWarById(s, rec.warId);
        const start = { phase:rec.phase, enemy:war && war.defender, owner:s.owner.tunis };
        const warId = rec.warId;
        story.day(s, rec);
        const once = rec.warId === warId;
        FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
        if (outcome === 'won') {
          FB.transferProvince(s, 'tunis', 'byzantium');
          FB.settleOrdinaryWar(s, warId, 'victory');
        } else if (outcome === 'failed') FB.settleOrdinaryWar(s, warId, 'white_peace');
        else FB.transferProvince(s, 'tunis', 'mauri_476');
        story.day(s, s.stories.eastern_africa_476);
        const closed = JSON.stringify(s.stories.eastern_africa_476), owner = s.owner.tunis;
        FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
        story.day(s, s.stories.eastern_africa_476);
        return { start:start, once:once, result:s.stories.eastern_africa_476.result,
          durable:closed === JSON.stringify(s.stories.eastern_africa_476), owner:owner,
          noReplay:owner === s.owner.tunis };
      }, outcome);
      expect(result).toEqual({ start:{ phase:'started', enemy:'altava_476', owner:'altava_476' },
        once:true, result:outcome, durable:true, noReplay:true,
        owner:outcome === 'won' ? 'byzantium' : outcome === 'failed' ? 'altava_476' : 'mauri_476' });
    });
}

test('the African region remains a valid world through one observer season and restore',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const fault = await page.evaluate(function () {
      return new Promise(function (resolve) {
        FB.activateBookmark('476', null, function (error) {
          if (error) { resolve(error.message); return; }
          FB.game.pending = { seed:'AFRICA-SEASON' }; FB.game.startObserve();
          FB.game.setPaused(true); resolve(null);
        });
      });
    });
    expect(fault).toBe(null);
    const result = await page.evaluate(function () {
      const s = FB.state, initialTurn = s.turn;
      const authored = JSON.stringify(FBDATA.bookmarkRegions476.africa);
      for (let i = 0; i < 90; i++) {
        const turn = s.turn; FB.game.passDay({ deferUi:true });
        if (s.turn !== turn + 1) throw new Error('Observer stalled on day ' + i);
      }
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { days:FB.state.turn - initialTurn,
        unchanged:authored === JSON.stringify(FBDATA.bookmarkRegions476.africa),
        faults:FB.validateBookmark(FB.bookmark('476')),
        valid:FB.save.v4.validatePlatform(JSON.parse(FB.save.serialize()).state),
        holders:FBDATA.bookmarkRegions476.africa.provinces.every(function (p) {
          return !!FB.state.realms[FB.state.owner[p.id]] && !!FB.state.realms[FB.state.holder[p.id]];
        }) };
    });
    expect(result).toEqual({ days:90, unchanged:true, faults:[], valid:true, holders:true });
  });
