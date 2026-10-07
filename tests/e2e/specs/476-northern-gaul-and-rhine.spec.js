'use strict';
const fs = require('fs');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/story_courts_476.js',
  'index.html', 'data/bookmarks.js', 'data/bookmark_476.js',
  'data/bookmark_476_gaul_iberia.js', 'data/political_institutions.js',
  'data/story_campaigns.js', 'data/cultures.js', 'data/technology.js',
  'data/settlements.js', 'data/starts.js', 'data/eras.js', 'data/systems.js',
  'data/geographies.js', 'data/counties.js', 'data/map_data.js', 'data/climate.js',
  'data/intrigue.js', 'data/economy.js', 'data/modifiers.js', 'data/distribution_crazygames.js',
  'js/world.js', 'js/model.js', 'js/population.js', 'js/settlement.js', 'js/station.js',
  'js/authority.js', 'js/politics.js', 'js/institutions.js', 'js/religion.js',
  'js/governments.js', 'js/systems.js', 'js/justice.js', 'js/events.js', 'js/technology.js', 'js/bookmark_setup.js',
  'js/stories.js', 'js/story_campaign.js', 'data/story_instances.js',
  'js/story_courts.js', 'js/story_track.js', 'js/treasury.js', 'js/wars.js', 'js/armies.js',
  'js/main.js', 'js/save.js', 'js/save_v4.js', 'js/messages.js', 'js/i18n.js', 'js/crazygames.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startHistoricalGame } = require('../support/game/historical-start');

const addedInstitutions = [
  'paris_council','orleans_council','reims_council','troyes_council','tours_council',
  'rouen_council','angers_council','metz_council','trier_council','cologne_council',
  'tournai_council','rennes_council','nantes_council','vannes_council','strasbourg_council',
  'soissons_see','paris_see','orleans_see','troyes_see','tours_see','rouen_see',
  'metz_see','trier_see','rennes_see','nantes_see','vannes_see',
  'trier_homoian_congregation','cologne_congregation','tournai_congregation','strasbourg_congregation'
];

async function start476(page, testInfo, crazygames) {
  await startHistoricalGame(page, testInfo, {
    bookmark:'476',
    code:'NORTHGAUL-476-curialis_476-ravenna-m-Marcus-established-0-roman.nicene'
  }, crazygames);
}

for (const crazygames of [false,true]) {
  test('northern 476 smoke preserves courts, scoped rights and living institutions, distribution ' + crazygames,
    async function ({ page }, testInfo) {
      await start476(page, testInfo, crazygames);
      const result = await page.evaluate(function (ids) {
        const s = FB.state, region = FBDATA.bookmarkRegions476.gaul_iberia;
        const basina = FB.authoredRoyalMemberSnapshot(s, 'franks_476', 'basina');
        const clovis = FB.authoredRoyalMemberSnapshot(s, 'franks_476', 'clovis');
        const named = ['reims_see','soissons_see','troyes_see','tours_see'].map(function (id) {
          const c = s.chars[s.localInstitutions[id].representativeId];
          return [c.name,c.generatedOfficeholder];
        });
        const counties = ['laon','paris','orleans','reims','ghent','cologne','trier','strasbourg','rennes','nantes','vannes'];
        return {
          faults:FB.validateBookmark(FB.bookmark('476')).concat(FB.validateCultureData(s),
            FB.validateLegalTraditions(), FB.validateReligionInstitutionsData(), FB.validateTechnologyData()),
          institutions:ids.every(function (id) {
            const d = region.localInstitutions[id], rec = s.localInstitutions[id];
            return rec && s.chars[rec.representativeId] && FB.world.sitesByProv[d.provinceId].list
              .some(function (site) { return site.site === d.site && site.authored; });
          }),
          named:named,
          generated:['paris_see','vannes_see','cologne_congregation'].every(function (id) {
            return s.chars[s.localInstitutions[id].representativeId].generatedOfficeholder;
          }) && ['armorica_476','rhein_franks_476','alamanni_476'].every(function (id) {
            return s.realms[id].ruler.generated === true;
          }),
          mother:!!basina && clovis.motherId === basina.id && basina.name === 'Basina',
          roman:FB.political.government(s, { kind:'realm', id:'west_francia' }).formId,
          rights:counties.every(function (pid) {
            return ['peace','revenue'].every(function (power) {
              return s.authority.rights.some(function (r) {
                return r.scope.kind === 'county' && r.scope.id === pid && r.power === power &&
                  r.beneficiary.kind === 'realm' && r.beneficiary.id === s.holder[pid] && r.basis === 'tenure';
              });
            });
          }),
          owners:counties.map(function (pid) { return s.owner[pid]; }),
          parisName:FB.world.sitesByProv.paris.list[0].name,
          minority:region.provinces.find(function (p) { return p.id === 'trier'; }).communities
            .some(function (c) { return c.religion === 'homoian'; }),
          campaign:s.stories.clovis_alamanni_476.phase,
          tech:FBDATA.techImpactReviews.features.period_476_alamannic_campaign.mode,
          valid:FB.save.v4.validatePlatform(JSON.parse(FB.save.serialize()).state)
        };
      }, addedInstitutions);
      expect(result).toMatchObject({ faults:[], institutions:true, generated:true, mother:true,
        roman:'roman_civic', rights:true, parisName:'Parisii', minority:true, campaign:'pending', tech:'none', valid:true });
      expect(result.named).toEqual([['Remigius',false],['Principius',false],['Lupus',false],['Perpetuus',false]]);
      expect(result.owners).toEqual(['west_francia','west_francia','west_francia','west_francia',
        'franks_476','rhein_franks_476','rhein_franks_476','alamanni_476','armorica_476','armorica_476','armorica_476']);
    });
}

test('northern city bargains, bishop mediation and civil offices retain county scope through restore',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, land = JSON.stringify([s.owner,s.holder,s.population]);
      const terms = { provision:true, protection:true, courts:true, tolerance:true, taxRelief:true };
      const rows = [['soissons_council','soissons_see','laon','west_francia'],
        ['tournai_council','reims_see','ghent','franks_476'],
        ['rennes_council','rennes_see','rennes','armorica_476']].map(function (entry) {
        const subject = { kind:'realm', id:entry[3] };
        s.realms[entry[3]].treasury.gold = 1000;
        const mediation = FB.localInstitutionMediate(s, entry[1], subject, entry[2]);
        const actions = ['petition','bargain','ratify'].map(function (action) {
          const q = FB.localInstitutionQuote(s, entry[0], subject, action, terms);
          return q.allowed && !!FB.localInstitutionApply(s, q);
        });
        const rights = FB.localInstitutionRights(s, entry[0], entry[3]);
        const repId = s.localInstitutions[entry[0]].representativeId;
        s.chars[repId].skills.dip = 12;
        const q = FB.officeAppointmentQuote(s, subject, { officeId:'defensor_civitatis', institutionId:entry[3],
          holder:{ kind:'character', id:repId }, scope:{ kind:'county', id:entry[2] } });
        const office = q.allowed && FB.officeSeekAppointment(s, q);
        return { mediation:!!mediation, actions:actions, agreement:FB.localInstitutionConsent(s, entry[0], subject),
          rights:!!rights, office:!!office, outside:FB.political.power(s, { kind:'character', id:repId },
            'peace', { provinceId:'roma' }).allowed,
          inside:FB.political.power(s, { kind:'character', id:repId }, 'peace', { provinceId:entry[2] }).allowed };
      });
      const congregations = ['trier_homoian_congregation','cologne_congregation',
        'tournai_congregation','strasbourg_congregation'].every(function (id) {
        const d = FB.localInstitutionDefinitions(s)[id], subject = { kind:'realm', id:s.owner[d.provinceId] };
        s.realms[subject.id].treasury.gold = 1000;
        return !!FB.localInstitutionSettle(s, id, subject, terms);
      });
      function retained(state) {
        return JSON.stringify([state.localInstitutions,state.authority.appointments,
          state.authority.recognitions,state.authority.rights]);
      }
      const before = retained(s);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { rows:rows, congregations:congregations, durable:before === retained(FB.state),
        land:land === JSON.stringify([FB.state.owner,FB.state.holder,FB.state.population]) };
    });
    expect(result).toEqual({ rows:Array(3).fill({ mediation:true, actions:[true,true,true],
      agreement:true, rights:true, office:true, outside:false, inside:true }), congregations:true, durable:true, land:true });
  });

test('northern incidents follow live locations, faiths and communities without enacting public policy',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, c = s.chars[s.player.charId];
      c.born = 446; c.religion = 'nicene'; s.player.gold = 100; s.player.profession = 'curialis';
      const rows = [['north_gaul_476_public_registers','laon'],['north_gaul_476_church_petition','reims'],
        ['franks_476_settled_boundaries','ghent'],['franks_476_neighbor_worship','cologne'],
        ['rhine_476_two_congregations','trier'],['rhine_476_ford_receipts','strasbourg'],
        ['armorica_476_two_tongues','rennes'],['armorica_476_church_letters','vannes']];
      s.player.provinceId = 'toulouse';
      const eligibility = rows.map(function (row) {
        const ev = FB.eventById(row[0]);
        return [FB.eventPeriodEnabled(s, ev), FB.checkTrigger(s, ev.trigger, { locationId:row[1] }),
          FB.checkTrigger(s, ev.trigger, { locationId:'toulouse' })];
      });
      const ev = FB.eventById('franks_476_settled_boundaries');
      const before = JSON.stringify([s.owner,s.holder,s.population,s.localInstitutions,s.authority]);
      const prestige = s.player.prestige;
      const receipt = FB.resolveEventOption(s, ev, ev.options[0],
        FB.eventContext(s, { locationId:'ghent' }), { automated:false });
      const publicState = before === JSON.stringify([s.owner,s.holder,s.population,s.localInstitutions,s.authority]);
      c.religion = 'germanic_pagan';
      const faithGate = !FB.checkTrigger(s, FB.eventById('rhine_476_two_congregations').trigger, { locationId:'trier' });
      c.religion = 'nicene';
      // Exercise the live gate after the minority disappears through ordinary policy.
      FB.convertCountyCommunity(s, 'trier', { kind:'faith', target:'nicene', source:'homoian', rate:1 });
      const communityGate = !FB.checkTrigger(s, FB.eventById('rhine_476_two_congregations').trigger, { locationId:'trier' });
      s.date.year = 601;
      return { eligibility:eligibility, gold:s.player.gold, prestige:s.player.prestige - prestige,
        receipt:!!receipt, publicState:publicState,
        faithGate:faithGate, communityGate:communityGate,
        expired:rows.every(function (row) { return !FB.eventPeriodEnabled(s, FB.eventById(row[0])); }) };
    });
    expect(result).toEqual({ eligibility:Array(8).fill([true,true,false]), gold:97, prestige:4,
      receipt:true, publicState:true, faithGate:true, communityGate:true, expired:true });
  });

test('the Upper Rhine opportunity waits for Clovis and uses an actual war without forced conversion',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    const result = await page.evaluate(function () {
      let s = FB.state;
      const id = 'clovis_alamanni_476', story = FB.stories.get(id);
      const w = s.stories.western_court_476;
      FB.transferProvince(s, 'laon', 'franks_476');
      s.date.year = 496;
      story.day(s, s.stories[id]);
      const waiting = s.stories[id].phase === 'pending';
      FB.assignRealmRulerCharacter(s, 'franks_476', w.clovisId, { replaceAuthored:true });
      const population = JSON.stringify(s.population);
      const faith = s.realms.franks_476.religion;
      story.day(s, s.stories[id]);
      const war = FB.ordinaryWarById(s, s.stories[id].warId);
      const started = s.stories[id].phase === 'started' && !!war && war.objectives[0].target === 'strasbourg';
      const noAward = s.owner.strasbourg === 'alamanni_476';
      FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
      FB.transferProvince(s, 'strasbourg', 'franks_476');
      FB.settleOrdinaryWar(s, s.stories[id].warId, 'victory');
      story.day(s, s.stories[id]);
      const before = JSON.stringify([s.stories[id],s.wars]);
      FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
      story.day(s, s.stories[id]);
      return { waiting:waiting, started:started, noAward:noAward, outcome:s.stories[id].result,
        noConversion:population === JSON.stringify(s.population) && s.realms.franks_476.religion === faith,
        once:before === JSON.stringify([s.stories[id],s.wars]) };
    });
    expect(result).toEqual({ waiting:true, started:true, noAward:true, outcome:'won', noConversion:true, once:true });
  });

for (const divergence of ['capital','target','dead','timeout']) {
  test('the Upper Rhine opportunity closes durably after ' + divergence,
    async function ({ page }, testInfo) {
      await start476(page, testInfo);
      const result = await page.evaluate(function (mode) {
        const s = FB.state, id = 'clovis_alamanni_476', story = FB.stories.get(id);
        const w = s.stories.western_court_476;
        s.date.year = 496;
        if (mode !== 'capital') FB.transferProvince(s, 'laon', 'franks_476');
        if (mode === 'target') FB.transferProvince(s, 'strasbourg', 'burgundy');
        if (mode === 'dead') s.chars[w.clovisId].dead = true;
        if (mode === 'timeout') s.date.year = 507;
        story.day(s, s.stories[id]);
        const before = JSON.stringify([s.stories[id],s.owner,s.wars]);
        FB.save.restore(JSON.parse(FB.save.serialize()));
        story.day(FB.state, FB.state.stories[id]);
        return { result:FB.state.stories[id].result, war:FB.state.stories[id].warId,
          once:before === JSON.stringify([FB.state.stories[id],FB.state.owner,FB.state.wars]) };
      }, divergence);
      expect(result).toEqual({ result:divergence === 'dead' ? 'interrupted' : 'diverted', war:null, once:true });
    });
}

test('a campaign created with the pre-expansion 476 declarations restores under the expanded data',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function (ids) {
      return new Promise(function (resolve, reject) {
        const bm = FB.bookmark('476');
        const realm = bm.realms.find(function (r) { return r.id === 'franks_476'; });
        const current = { institutions:bm.localInstitutions, stories:bm.stories, court:realm.royalCourt };
        // Reconstruct the old declaration shape before creating and serializing
        // a real campaign. This is not an owner-provided historical save fixture.
        bm.localInstitutions = Object.assign({}, current.institutions);
        ids.forEach(function (id) { delete bm.localInstitutions[id]; });
        bm.stories = current.stories.filter(function (id) { return id !== 'clovis_alamanni_476'; });
        realm.royalCourt = JSON.parse(JSON.stringify(current.court));
        realm.royalCourt.members = realm.royalCourt.members.filter(function (m) { return m.id !== 'basina'; });
        delete realm.royalCourt.spouseId;
        delete realm.royalCourt.members[0].motherId;
        function reinstate() {
          bm.localInstitutions = current.institutions; bm.stories = current.stories; realm.royalCourt = current.court;
        }
        FB.activateBookmark('476', null, function (fault) {
          if (fault) { reinstate(); reject(fault); return; }
          try {
            FB.game.pending = { seed:'NORTHGAUL-LEGACY' };
            FB.game.startObserve(); FB.game.setPaused(true);
            const saved = JSON.parse(FB.save.serialize());
            const live = FB.state;
            const old = JSON.stringify([live.owner,live.holder,live.population,
              live.bookmarkSetup,live.stories,live.realms.franks_476.succession]);
            const existing = Object.keys(live.localInstitutions);
            const institutions = JSON.stringify(existing.map(function (id) { return live.localInstitutions[id]; }));
            reinstate();
            FB.save.restore(saved);
            const s = FB.state;
            resolve({ preserved:old === JSON.stringify([s.owner,s.holder,s.population,s.bookmarkSetup,
              s.stories,s.realms.franks_476.succession]),
              institutions:institutions === JSON.stringify(existing.map(function (id) { return s.localInstitutions[id]; })),
              absent:!s.stories.clovis_alamanni_476 && !FB.authoredRoyalMemberSnapshot(s, 'franks_476', 'basina'),
              valid:FB.save.v4.validatePlatform(JSON.parse(FB.save.serialize()).state) });
          } catch (error) { reinstate(); reject(error); }
        });
      });
    }, addedInstitutions);
    expect(result).toEqual({ preserved:true, institutions:true, absent:true, valid:true });
  });

test('an owner-supplied pre-expansion 476 export imports without replaying the new campaign',
  async function ({ page }, testInfo) {
    const savePath = process.env.FALLOWBORN_476_LEGACY_SAVE;
    test.skip(!savePath, 'Set FALLOWBORN_476_LEGACY_SAVE to an archived 2.0-era 476 export.');
    const source = fs.readFileSync(savePath, 'utf8');
    await openGame(page, testInfo);
    const result = await page.evaluate(function (text) {
      const incoming = FB.save.parseExport(text);
      if (!incoming || !incoming.state || !incoming.state.start || incoming.state.start.id !== '476')
        throw new Error('The selected legacy export must be a 476 campaign.');
      if (incoming.state.stories && incoming.state.stories.clovis_alamanni_476)
        throw new Error('The selected export already contains the northern expansion.');
      const owners = JSON.stringify(incoming.state.owner), holders = JSON.stringify(incoming.state.holder);
      FB.save.restore(incoming); FB.game.setPaused(true);
      const s = FB.state, before = JSON.stringify([s.owner,s.holder,s.population,s.stories]);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { bookmark:FB.state.start.id, ownership:owners === JSON.stringify(FB.state.owner),
        holders:holders === JSON.stringify(FB.state.holder), absent:!FB.state.stories.clovis_alamanni_476,
        repeat:before === JSON.stringify([FB.state.owner,FB.state.holder,FB.state.population,FB.state.stories]),
        valid:FB.save.v4.validatePlatform(JSON.parse(FB.save.serialize()).state) };
    }, source);
    expect(result).toEqual({ bookmark:'476', ownership:true, holders:true, absent:true, repeat:true, valid:true });
  });

test('one season of northern world simulation retains valid institutions and saved campaign records',
  async function ({ page }, testInfo) {
    await start476(page, testInfo);
    await page.evaluate(function () {
      FB.game.observe = true;
      delete FB.state.stories.curialis_track_476;
      FB.state.player.provinceId = 'laon';
    });
    for (let half = 0; half < 2; half++) {
      await page.evaluate(function () {
        for (let day = 0; day < 45; day++) {
          const turn = FB.state.turn;
          FB.game.passDay({ deferUi:true });
          if (FB.state.turn !== turn + 1) throw new Error('Northern observer stalled at turn ' + turn);
        }
      });
      if (half === 0) await page.evaluate(function () { FB.save.restore(JSON.parse(FB.save.serialize())); });
    }
    const result = await page.evaluate(function (ids) {
      const s = FB.state, before = JSON.stringify([s.stories,s.localInstitutions]);
      const rights = s.authority.rights.map(function (r) { return r.id; });
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { date:FB.state.date, durable:before === JSON.stringify([FB.state.stories,FB.state.localInstitutions]),
        present:ids.every(function (id) { return !!FB.state.localInstitutions[id]; }),
        unique:new Set(rights).size === rights.length,
        valid:FB.save.v4.validatePlatform(JSON.parse(FB.save.serialize()).state),
        localValid:FB.validateLocalInstitutionState(FB.state),
        religionValid:FB.validateReligionInstitutionState(FB.state) };
    }, addedInstitutions);
    expect(result).toMatchObject({ date:{ year:476, season:1, day:1 }, durable:true, present:true, unique:true, valid:true, localValid:true, religionValid:true });
  });
