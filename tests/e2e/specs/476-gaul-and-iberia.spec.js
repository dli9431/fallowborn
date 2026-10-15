'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/story_courts_476.js',
  'index.html', 'data/bookmarks.js', 'data/bookmark_476.js',
  'data/bookmark_476_gaul_iberia.js', 'data/cultures.js', 'data/geographies.js',
  'data/settlements.js', 'data/settlements_real.js', 'data/counties.js',
  'data/map_data.js', 'data/climate.js', 'data/eras.js', 'data/systems.js',
  'data/intrigue.js', 'data/political_institutions.js', 'data/technology.js',
  'data/story_campaigns.js', 'data/starts.js', 'data/economy.js',
  'js/world.js', 'js/model.js', 'js/population.js', 'js/justice.js',
  'js/authority.js', 'js/politics.js', 'js/institutions.js', 'js/religion.js',
  'js/systems.js', 'js/governments.js', 'js/station.js', 'js/events.js', 'js/technology.js', 'js/stories.js',
  'js/story_campaign.js', 'data/story_instances.js', 'js/story_courts.js',
  'js/story_track.js', 'js/treasury.js',
  'js/wars.js', 'js/armies.js', 'js/main.js', 'js/save.js', 'js/save_v4.js',
  'js/messages.js', 'js/i18n.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startHistoricalGame } = require('../support/game/historical-start');

async function start476(page, testInfo) {
  await startHistoricalGame(page, testInfo, { bookmark:'476',
    code:'GAULIBERIA-476-curialis_476-ravenna-m-Marcus' }, false);
}

test('476 smoke creates period settlements, competing courts and provincial majorities',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, region = FBDATA.bookmarkRegions476.gaul_iberia;
      const w = s.stories.western_court_476;
      return {
        faults:FB.validateBookmark(FB.bookmark('476')).concat(FB.validateCultureData(s),
          FB.validateLegalTraditions(), FB.validateReligionInstitutionsData(), FB.validateTechnologyData()),
        count:region.provinces.length,
        sites:region.provinces.every(function (p) {
          const site = FB.world.sitesByProv[p.id].list[0];
          const index = Math.round(site.y) * FB.world.W + Math.round(site.x);
          return site.authored && site.site === region.settlementLayouts[p.id][0].site &&
            site.name === region.settlementLayouts[p.id][0].name &&
            FB.world.grid[index] === FB.world.byId[p.id].idx + 1;
        }),
        owners:['laon','ghent','toulouse','lyon','lugo','rennes','cologne','strasbourg']
          .map(function (pid) { return s.owner[pid]; }),
        rulers:['west_francia','franks_476','aquitaine','burgundy']
          .map(function (rid) { return FB.realmRulerCharacterSnapshot(s, rid).name; }),
        generated:['suebi_476','armorica_476','rhein_franks_476','alamanni_476']
          .every(function (rid) { return s.realms[rid].ruler.generated === true; }),
        heir:s.realms.burgundy.succession.members[s.realms.burgundy.succession.heirId].name,
        clovis:[s.chars[w.clovisId].name, s.chars[w.clovisId].born, s.chars[w.clovisId].fatherId === w.childericId],
        communities:['toulouse','barcelona','lugo','ghent','strasbourg'].map(function (pid) {
          return [FB.countyCulture(s, pid), FB.countyReligion(s, pid)];
        }),
        courtFaith:FB.political.governingIdentity(s, 'aquitaine').eliteFaithId,
        inherited:['gallo_roman','hispano_roman'].every(function (culture) {
          return JSON.stringify(FB.cultureNamePool(culture, 'm', s)) ===
            JSON.stringify(FB.cultureNamePool('roman', 'm', s));
        }),
        rights:region.provinces.every(function (p) {
          return ['peace','revenue'].every(function (power) {
            return s.authority.rights.some(function (r) {
              return r.scope.kind === 'county' && r.scope.id === p.id && r.power === power &&
                r.beneficiary.kind === 'realm' && r.beneficiary.id === p.realm && r.basis === 'tenure';
            });
          });
        })
      };
    });
    expect(result).toMatchObject({ faults:[], count:117, sites:true, generated:true,
      heir:'Gundobad', clovis:['Clovis',466,true], courtFaith:'homoian', inherited:true, rights:true });
    expect(result.owners).toEqual(['west_francia','franks_476','aquitaine','burgundy',
      'suebi_476','armorica_476','rhein_franks_476','alamanni_476']);
    expect(result.rulers).toEqual(['Syagrius','Childeric','Euric','Chilperic I']);
    expect(result.communities).toEqual([['gallo_roman','nicene'],['hispano_roman','nicene'],
      ['hispano_roman','nicene'],['gallo_roman','nicene'],['gallo_roman','nicene']]);
  });

test('provincials retain Roman personal law while successor and mixed cases use local custom',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state;
      function party(culture) {
        return FB.makeCharacter(s, { sex:'m', culture:culture, religion:'nicene',
          born:446, station:1, traitsN:0 }).id;
      }
      const roman = party('gallo_roman'), hispano = party('hispano_roman');
      const rows = [['aquitaine','gothic','euric_code_476'],
        ['burgundy','burgundian','burgundian_custom'], ['suebi_476','suevic','suevic_custom'],
        ['franks_476','frankish','frankish_custom'], ['rhein_franks_476','frankish','frankish_custom'],
        ['armorica_476','brezhon','armorican_custom'], ['alamanni_476','alamannic','alamannic_custom']];
      return rows.map(function (entry) {
        const actor = FB.realmRulerCharacterSnapshot(s, entry[0]).id, local = party(entry[1]);
        const one = FB.justiceTradition(s, actor, 'secular', { accusedId:roman });
        const same = FB.justiceTradition(s, actor, 'secular', { accusedId:roman, otherPartyId:hispano });
        const elite = FB.justiceTradition(s, actor, 'secular', { accusedId:local });
        const mixed = FB.justiceTradition(s, actor, 'secular', { accusedId:local, otherPartyId:roman });
        return { roman:one.id, same:same.id, elite:elite.id, expected:entry[2],
          mixed:mixed.id, source:mixed.source, assessor:mixed.assessorId,
          noLaterSentences:mixed.definition.sentences.indexOf('blinding') < 0 &&
            mixed.definition.sentences.indexOf('penance') < 0 };
      });
    });
    for (const row of result) {
      expect(row).toMatchObject({ roman:'late_roman', same:'late_roman', source:'mixed',
        assessor:'late_roman', noLaterSentences:true });
      expect(row.elite).toBe(row.expected);
      expect(row.mixed).toBe(row.expected);
    }
  });

test('city and church actors preserve vacancies and scoped mediation across restore',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    const result = await page.evaluate(function () {
      let s = FB.state;
      const defs = FBDATA.bookmarkRegions476.gaul_iberia.localInstitutions;
      const subject = { kind:'realm', id:'aquitaine' };
      const land = JSON.stringify([s.owner,s.holder,s.population]);
      const named = ['arles_see','lyon_see','marseille_see','reims_see'].map(function (id) {
        const c = s.chars[s.localInstitutions[id].representativeId];
        return [c.name, c.generatedOfficeholder];
      });
      const vacant = s.localInstitutions.bordeaux_see.representativeId === null &&
        s.religiousHeads.bordeaux_bishop === null;
      const refused = FB.localInstitutionMediate(s, 'bordeaux_see', subject, 'bordeaux') === null;
      const grant = FB.localInstitutionMediate(s, 'toulouse_see', subject, 'toulouse');
      const petition = FB.localInstitutionQuote(s, 'toulouse_council', subject, 'petition',
        { courts:true, tolerance:true, taxRelief:true });
      const view = function () {
        return JSON.stringify([s.localInstitutions,s.religiousHeads,s.authority.rights,
          s.authority.recognitions]);
      };
      const before = view();
      FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
      FB.ensureLocalInstitutions(s);
      return { present:Object.keys(defs).every(function (id) { return !!s.localInstitutions[id]; }),
        named:named, vacant:vacant, refused:refused, granted:!!grant, petition:petition.allowed,
        durable:before === view(), land:land === JSON.stringify([s.owner,s.holder,s.population]),
        scoped:!!grant && FB.political.legitimacy(s, subject, { kind:'county', id:'toulouse' },
          'church_support').some(function (row) { return row.id === grant.id; }),
        generated:s.chars[s.localInstitutions.tarragona_see.representativeId].generatedOfficeholder,
        valid:FB.save.v4.validatePlatform(JSON.parse(FB.save.serialize()).state),
        tech:['local_institution_bargains','dual_jurisdiction'].map(function (id) {
          return FBDATA.techImpactReviews.features[id].mode;
        }) };
    });
    expect(result).toEqual({ present:true,
      named:[['Leontius',false],['Patiens',false],['Graecus',false],['Remigius',false]],
      vacant:true, refused:true, granted:true, petition:true, durable:true, land:true,
      scoped:true, generated:true, valid:true, tech:['none','none'] });
  });

test('regional events use live local communities, dated eligibility and ordinary effect receipts',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId];
      c.born = 446; c.religion = 'nicene'; s.player.profession = 'curialis'; s.player.gold = 100;
      const checks = [['gaul_476_two_laws','toulouse','lyon'],
        ['gaul_476_city_accounts','arles','barcelona'],
        ['gaul_476_empty_bishopric','bordeaux','laon'],
        ['gaul_476_burgundian_relief','lyon','toulouse'],
        ['iberia_476_land_register','barcelona','toulouse'],
        ['gaul_476_frankish_supplies','ghent','toulouse'],
        ['armorica_476_coastal_guests','quimper','toulouse'],
        ['rhine_476_captive_relief','strasbourg','lyon']];
      const eligibility = checks.map(function (row) {
        const ev = FB.eventById(row[0]);
        return [FB.eventPeriodEnabled(s, ev), FB.checkTrigger(s, ev.trigger, { locationId:row[1] }),
          FB.checkTrigger(s, ev.trigger, { locationId:row[2] })];
      });
      const ev = FB.eventById('gaul_476_two_laws');
      const land = JSON.stringify([s.owner,s.holder,s.population,s.localInstitutions]);
      const prestige = s.player.prestige;
      const receipt = FB.resolveEventOption(s, ev, ev.options[0],
        FB.eventContext(s, { locationId:'toulouse' }), { automated:false });
      const effects = [s.player.gold, s.player.prestige - prestige, !!receipt];
      s.date.year = 601;
      return { eligibility:eligibility, effects:effects,
        land:land === JSON.stringify([s.owner,s.holder,s.population,s.localInstitutions]),
        expired:checks.every(function (row) { return !FB.eventPeriodEnabled(s, FB.eventById(row[0])); }) };
    });
    expect(result).toEqual({ eligibility:Array(8).fill([true,true,false]),
      effects:[97,4,true], land:true, expired:true });
  });

test('the regional Clovis declaration still waits for inheritance and resolves an actual campaign',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    const result = await page.evaluate(function () {
      let s = FB.state;
      const def = FBDATA.bookmarkRegions476.gaul_iberia.storyCampaigns.clovis_syagrius_476;
      const story = FB.stories.get(def.id), w = s.stories.western_court_476;
      const routed = FBDATA.storyCampaigns[def.id] === def;
      s.date.year = 486;
      story.day(s, s.stories[def.id]);
      const waiting = s.stories[def.id].phase === 'pending' && s.owner.laon === 'west_francia';
      FB.assignRealmRulerCharacter(s, 'franks_476', w.clovisId, { replaceAuthored:true });
      story.day(s, s.stories[def.id]);
      const rec = s.stories[def.id], war = FB.ordinaryWarById(s, rec.warId);
      const started = rec.phase === 'started' && !!war && war.objectives[0].target === 'laon';
      const noAward = s.owner.laon === 'west_francia';
      FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
      FB.transferProvince(s, 'laon', 'franks_476');
      FB.settleOrdinaryWar(s, s.stories[def.id].warId, 'victory');
      story.day(s, s.stories[def.id]);
      const before = JSON.stringify([s.stories[def.id],s.wars]);
      FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
      story.day(s, s.stories[def.id]);
      return { routed:routed, waiting:waiting, started:started, noAward:noAward,
        phase:s.stories[def.id].phase, result:s.stories[def.id].result,
        durable:before === JSON.stringify([s.stories[def.id],s.wars]) };
    });
    expect(result).toEqual({ routed:true, waiting:true, started:true, noAward:true,
      phase:'resolved', result:'won', durable:true });
  });

test('one observer season retains valid courts, sites and bounded regional stories',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    await page.evaluate(function () {
      FB.game.observe = true;
      delete FB.state.stories.curialis_track_476;
    });
    await page.evaluate(function () {
      for (let day = 0; day < 90; day++) {
        const turn = FB.state.turn;
        FB.game.passDay({ deferUi:true });
        if (FB.state.turn !== turn + 1) throw new Error('Regional observer stalled at turn ' + turn);
      }
    });
    const result = await page.evaluate(function () {
      const s = FB.state, region = FBDATA.bookmarkRegions476.gaul_iberia;
      const rec = s.stories.clovis_syagrius_476;
      const before = JSON.stringify(rec);
      const identities = region.provinces.every(function (p) {
        return s.realms[s.owner[p.id]] && s.realms[s.holder[p.id]] &&
          FB.countyCulture(s, p.id) && FB.countyReligion(s, p.id) && FB.world.sitesByProv[p.id].list[0].authored;
      });
      const rights = s.authority.rights.map(function (r) { return r.id; });
      const bounded = rec.phase === 'pending' || rec.phase === 'resolved' && !!rec.result ||
        rec.phase === 'started' && rec.deadline > s.turn && rec.deadline <= s.turn + 2880 &&
          !!FB.ordinaryWarById(s, rec.warId);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { date:FB.state.date, turn:FB.state.turn, identities:!!identities, uniqueRights:new Set(rights).size === rights.length,
        bounded:!!bounded, durable:before === JSON.stringify(FB.state.stories.clovis_syagrius_476),
        valid:FB.save.v4.validatePlatform(JSON.parse(FB.save.serialize()).state),
        religionValid:FB.validateReligionInstitutionState(FB.state) };
    });
    expect(result).toMatchObject({ date:{ year:476, season:1, day:1 }, turn:90, identities:true, uniqueRights:true, bounded:true, durable:true,
      valid:true, religionValid:true });
  });

for (const bookmark of ['867','1066']) {
  test(bookmark + ' retains its settlements and excludes late antique institutions and events',
    async function ({ page }, testInfo) {
      await openGame(page, testInfo);
      const result = await page.evaluate(function (id) {
        return new Promise(function (resolve) {
          const original = JSON.stringify(FB.bookmark(id));
          FB.activateBookmark(id, null, function (fault) {
            if (fault) { resolve({ fault:fault.message }); return; }
            FB.game.pending = { seed:'GAUL-ISOLATION' };
            FB.game.startObserve(); FB.game.setPaused(true);
            const s = FB.state;
            resolve({ same:original === JSON.stringify(FB.bookmark(id)),
              regionalSite:FB.world.sitesByProv.toulouse.list.some(function (site) {
                return site.site === 'toulouse_476';
              }),
              institution:FB.localInstitutionList(s).filter(function (item) {
                return Object.prototype.hasOwnProperty.call(FBDATA.bookmarkRegions476.gaul_iberia.institutions,item.id);
              }).length,
              events:FBDATA.events.filter(function (ev) {
                return ev.pack === 'gaul_iberia_476' && FB.eventPeriodEnabled(s, ev);
              }).length });
          });
        });
      }, bookmark);
      expect(result).toEqual({ same:true, regionalSite:false, institution:0, events:0 });
    });
}
