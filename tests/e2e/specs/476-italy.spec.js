'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/story_courts_476.js',
  'index.html', 'data/bookmark_476.js', 'data/bookmark_476_italy.js',
  'data/bookmark_476_africa.js', 'data/bookmark_476_dalmatia_east.js',
  'data/bookmark_476_gaul_iberia.js', 'data/bookmarks.js', 'data/counties.js',
  'data/settlements.js', 'data/settlements_real.js', 'data/geographies.js',
  'data/cultures.js', 'data/political_institutions.js', 'data/story_campaigns.js',
  'data/technology.js', 'data/eras.js', 'data/systems.js', 'data/starts.js', 'data/modifiers.js',
  'data/distribution_crazygames.js', 'js/world.js', 'js/model.js',
  'js/population.js', 'js/settlement.js', 'js/authority.js', 'js/institutions.js',
  'js/technology.js', 'js/systems.js', 'js/treasury.js', 'js/politics.js', 'js/federates.js',
  'js/religion.js', 'js/stories.js', 'js/story_campaign.js', 'data/story_instances.js', 'js/bookmark_setup.js', 'js/story_agreements.js',
  'js/story_courts.js', 'js/story_track.js',
  'js/armies.js', 'js/wars.js', 'js/events.js', 'js/main.js', 'js/save.js',
  'js/save_v4.js', 'js/ui_modals.js', 'js/ui_misc.js', 'js/crazygames.js'
]);
const { test, expect } = require('../support/fixture');
const { startHistoricalGame } = require('../support/game/historical-start');
const { openGame } = require('../support/game/navigation');

async function startItaly(page, testInfo, crazygames) {
  await startHistoricalGame(page, testInfo, {
    bookmark:'476', code:'ITALY476-476-federate_476-ravenna-m-Marcus-standard-0-gothic.homoian'
  }, crazygames);
}

for (const crazygames of [false, true]) {
  test('Italian opening, islands and institutions work with distribution flag ' + crazygames,
    async function ({ page }, testInfo) {
      await startItaly(page, testInfo, crazygames);
      const result = await page.evaluate(function () {
        const s = FB.state, region = FBDATA.bookmarkRegions476.italy;
        const counties = region.provinces;
        const snapshot = JSON.stringify(region);
        const correct = counties.every(function (p) {
          const pairs = FB.countyCommunities(s, p.id), count = FB.countyPopulation(s, p.id);
          const rows = FB.settlementPopulations(s, p.id);
          return s.owner[p.id] === p.realm && s.holder[p.id] === p.realm && count > 0 &&
            p.communities.reduce(function (total, c) { return total + c.populationShare0; }, 0) === 10000 &&
            pairs.reduce(function (total, c) { return total + c.count; }, 0) === count &&
            rows.reduce(function (total, n) { return total + n; }, 0) === count &&
            rows.every(function (n, index) {
              return FB.settlementCommunities(s, p.id, index).reduce(function (total, c) {
                return total + c.count;
              }, 0) === n;
            }) && FB.world.sitesByProv[p.id].list[0].authored;
        });
        const seats = Object.keys(region.localInstitutions);
        const present = seats.every(function (id) {
          const def = region.localInstitutions[id], record = s.localInstitutions[id];
          return !!record && record.site === def.site &&
            FB.world.sitesByProv[def.provinceId].list.some(function (site) { return site.site === def.site; });
        });
        const rights = counties.every(function (p) {
          return ['peace','revenue'].every(function (power) {
            return s.authority.rights.some(function (right) {
              return right.scope.id === p.id && right.power === power &&
                right.beneficiary.id === p.realm && right.status === 'active';
            });
          });
        });
        const facts = {
          provinces:counties.length, correct:correct, present:present, rights:rights,
          islands:['palermo','messina','siracusa','cagliari','sassari','ajaccio'].every(function (id) {
            return s.owner[id] === 'aghlabids';
          }),
          host:FB.realmTerritory(s, 'federates_476').length,
          protagonist:[s.chars[s.player.charId].culture, s.chars[s.player.charId].religion, s.player.provs.length],
          bishop:FB.religiousOfficeSnapshot(s, 'ticinum_bishop').name,
          bishopGenerated:s.chars[s.religiousHeads.ticinum_bishop].generatedOfficeholder,
          minority:FB.countyReligionShare(s, 'wien', 'nicene') > 0.6 &&
            FB.countyCultureShare(s, 'wien', 'rugian') > 0.3,
          ruler:FB.realmRulerCharacterSnapshot(s, 'rugi_476').culture,
          campaign:s.stories.rugian_frontier_476.phase,
          faults:FB.validateBookmark(FB.bookmark('476')),
          technology:FB.validateTechnologyData(),
          mode:FBDATA.techImpactReviews.features.period_476_rugian_campaign.mode
        };
        FB.save.restore(JSON.parse(FB.save.serialize()));
        facts.restored = seats.every(function (id) { return !!FB.state.localInstitutions[id]; }) &&
          FB.religiousOfficeSnapshot(FB.state, 'ticinum_bishop').name === 'Epiphanius';
        facts.unchanged = snapshot === JSON.stringify(region);
        return facts;
      });
      expect(result).toEqual({ provinces:48, correct:true, present:true, rights:true,
        islands:true, host:0, protagonist:['gothic','homoian',0], bishop:'Epiphanius',
        bishopGenerated:false, minority:true, ruler:'rugian', campaign:'pending',
        faults:[], technology:[], mode:'none', restored:true, unchanged:true });
    });
}

test('settlement sheets show the period sites and preserve their slots through restore',
  async function ({ page }, testInfo) {
    await startItaly(page, testInfo);
    for (const place of [
      ['pavia',0,'Ticinum'], ['milano',0,'Mediolanum'], ['aquileia',0,'Aquileia'],
      ['capua',1,'Neapolis'], ['roma',2,'Portus'], ['linz',1,'Lauriacum'],
      ['wien',1,'Favianis'], ['ajaccio',0,'Aleria'], ['foggia',0,'Luceria']
    ]) {
      await page.evaluate(function (place) { FB.ui.showSettlement(place[0], place[1]); }, place);
      await expect(page.locator('#gm-title')).toContainText(place[2]);
      await page.locator('[data-modal-nav="close"]').click();
    }
    const result = await page.evaluate(function () {
      const ids = FBDATA.bookmarkRegions476.italy.provinces.map(function (p) { return p.id; });
      function sites() {
        return ids.map(function (id) {
          return FB.settlementsOf(FB.state, id).map(function (site) { return [site.site, site.name]; });
        });
      }
      const initial = sites(), medieval = ['867','1066'].map(function (id) {
        return JSON.stringify(FB.bookmark(id));
      });
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { retained:JSON.stringify(initial) === JSON.stringify(sites()),
        names:[FB.world.byId.foggia.name, FB.world.byId.viterbo.name, FB.world.byId.venezia.name],
        medieval:medieval.every(function (before, index) {
          return before === JSON.stringify(FB.bookmark(index ? '1066' : '867'));
        }) };
    });
    expect(result).toEqual({ retained:true, names:['Luceria','Volsinii','Altinum'], medieval:true });
  });

test('provincial and island councils use real consent and seasonal AI beyond Ravenna',
  async function ({ page }, testInfo) {
    await startItaly(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, owner = JSON.stringify(s.owner), population = JSON.stringify(s.population);
      const accepted = FB.localInstitutionSettle(s, 'ticinum_council', { kind:'realm', id:'italy' },
        { provision:true, protection:true, courts:true, tolerance:true, taxRelief:true });
      const holder = s.localInstitutions.ticinum_council.representativeId;
      const powers = FB.political.rights(s, { kind:'character', id:holder })
        .filter(function (r) { return r.effective; }).map(function (r) { return r.power; }).sort();
      const mediated = FB.localInstitutionMediate(s, 'syracusae_see', { kind:'realm', id:'aghlabids' }, 'siracusa');
      s.turn = 90;
      FB.localInstitutionsSeason(s);
      const stages = ['aquileia_council','lauriacum_council','syracusae_council'].map(function (id) {
        const pid = FBDATA.localInstitutions[id].provinceId;
        return s.localInstitutions[id].petitions['realm:' + s.owner[pid]].stage;
      });
      const ledger = JSON.stringify(s.localInstitutions), rng = FB.getRngState();
      FB.localInstitutionsSeason(s);
      return { stage:accepted.stage, powers:powers, mediated:!!mediated, stages:stages,
        stable:ledger === JSON.stringify(s.localInstitutions) && rng === FB.getRngState(),
        preserved:owner === JSON.stringify(s.owner) && population === JSON.stringify(s.population) };
    });
    expect(result).toEqual({ stage:'ratified', powers:['consent','peace'], mediated:true,
      stages:['ratified','ratified','ratified'], stable:true, preserved:true });
  });

test('Italian everyday events have live community gates and only bounded household effects',
  async function ({ page }, testInfo) {
    await startItaly(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, ids = ['italy_476_grain_roll','italy_476_civic_records','italy_476_two_congregations'];
      const enabled = ids.every(function (id) {
        const event = FB.eventById(id);
        return event.tags.indexOf('late_antique') >= 0 && FB.eventPeriodEnabled(s, event) &&
          FB.validateEventPeriod(event) === null && FB.checkTrigger(s, event.trigger);
      });
      const unmixed = FB.checkTrigger(s, FB.eventById(ids[2]).trigger, { locationId:'cosenza' });
      const before = JSON.stringify([s.owner,s.holder,s.population,s.authority]);
      const gold = s.player.gold;
      const event = FB.eventById(ids[0]);
      FB.resolveEventOption(s, event, event.options[0], FB.eventContext(s));
      const preserved = before === JSON.stringify([s.owner,s.holder,s.population,s.authority]);
      const older = ['867','1066'].every(function (id) {
        return ids.every(function (eventId) {
          return !FB.eventPeriodEnabled({ start:{ id:id, era:FB.bookmark(id).era }, date:{ year:Number(id) } },
            FB.eventById(eventId));
        });
      });
      return { enabled:enabled, unmixed:unmixed, cost:gold - s.player.gold, preserved:preserved, older:older };
    });
    expect(result).toEqual({ enabled:true, unmixed:false, cost:3, preserved:true, older:true });
  });

for (const compatible of [false, true]) {
  test('Rugian opportunity requires an actual Odoacer court at Ravenna: ' + compatible,
    async function ({ page }, testInfo) {
      await startItaly(page, testInfo);
      const result = await page.evaluate(function (compatible) {
        let s = FB.state;
        const id = 'rugian_frontier_476', story = FB.stories.get(id);
        if (compatible) {
          FB.transferProvince(s, 'ravenna', 'federates_476');
          s.realms.federates_476.nonTerritorial = false;
          s.realms.federates_476.capital = 'ravenna';
          FB.authoritySetGovernment(s, 'federates_476', 'regnum');
        }
        s.date.year = 487;
        const population = JSON.stringify(s.population), owner = s.owner.wien;
        story.day(s, s.stories[id]);
        const rec = s.stories[id], war = rec.warId && FB.ordinaryWarById(s, rec.warId);
        const begun = rec.phase, noAward = s.owner.wien === owner;
        if (compatible) {
          FB.transferProvince(s, 'wien', 'federates_476');
          FB.settleOrdinaryWar(s, rec.warId, 'victory');
          story.day(s, rec);
        }
        const saved = JSON.stringify(s.stories[id]), commitments = s.authority.contracts.length;
        FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
        story.day(s, s.stories[id]);
        return { begun:begun, noAward:noAward, result:s.stories[id].result,
          target:war ? war.objectives[0].target : null,
          unchanged:population === JSON.stringify(s.population),
          stable:saved === JSON.stringify(s.stories[id]) && commitments === s.authority.contracts.length };
      }, compatible);
      expect(result).toEqual({ begun:compatible ? 'started' : 'resolved', noAward:true,
        result:compatible ? 'won' : 'diverted', target:compatible ? 'wien' : null,
        unchanged:true, stable:true });
    });
}

test('one season keeps every Italian county owned, populated and partitioned through a save restore',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const error = await page.evaluate(function () {
      return new Promise(function (resolve) {
        FB.activateBookmark('476', null, function (fault) {
          if (fault) { resolve(fault.message); return; }
          FB.game.pending = { seed:'ITALY-SEASON' };
          FB.game.startObserve(); FB.game.setPaused(true); resolve(null);
        });
      });
    });
    expect(error).toBe(null);
    const initial = await page.evaluate(function () {
      const region = FBDATA.bookmarkRegions476.italy;
      window.italy476Audit = function () {
        const s = FB.state;
        return region.provinces.every(function (p) {
          const count = FB.countyPopulation(s, p.id), communities = FB.countyCommunities(s, p.id);
          const rows = FB.settlementPopulations(s, p.id);
          return !!s.realms[s.owner[p.id]] && !!s.realms[s.holder[p.id]] && count > 0 &&
            communities.every(function (c) { return Number.isInteger(c.count) && c.count >= 0; }) &&
            communities.reduce(function (sum, c) { return sum + c.count; }, 0) === count &&
            rows.reduce(function (sum, n) { return sum + n; }, 0) === count;
        });
      };
      return { turn:FB.state.turn, data:JSON.stringify(region), valid:window.italy476Audit() };
    });
    expect(initial.valid).toBe(true);
    // Yield to the browser between short batches. Keep the per-day county
    // audit, while using the runtime's normal fast-forward paint deferral.
    for (let batch = 0; batch < 3; batch++) {
      const advanced = await page.evaluate(function () {
        const before = FB.state.turn, wasForwarding = FB.game.fastForwarding;
        FB.game.fastForwarding = true;
        try {
          for (let day = 0; day < 30; day++) {
            const turn = FB.state.turn;
            FB.game.passDay({ deferUi:true });
            if (FB.state.turn !== turn + 1) throw new Error('Italian observer stalled at turn ' + turn);
            if (!window.italy476Audit()) throw new Error('Italian county failed at turn ' + FB.state.turn);
          }
          return FB.state.turn - before;
        } finally { FB.game.fastForwarding = wasForwarding; }
      });
      expect(advanced, 'Italian observer batch ' + batch).toBe(30);
    }
    const result = await page.evaluate(function (initial) {
      let s = FB.state;
      const population = JSON.stringify(s.population);
      FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
      FB.ui.fastForwardFinished();
      return { days:s.turn - initial.turn, valid:window.italy476Audit(),
        restored:population === JSON.stringify(s.population), unchanged:initial.data === JSON.stringify(FBDATA.bookmarkRegions476.italy) };
    }, initial);
    expect(result).toEqual({ days:90, valid:true, restored:true, unchanged:true });
  });
