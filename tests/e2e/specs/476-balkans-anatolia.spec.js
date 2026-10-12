'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/bookmark_476_wider.js', 'data/bookmark_476_wider_identities.js', 'data/geography_expansion.js',
  'data/story_courts_476.js',
  'index.html', 'data/bookmarks.js', 'data/bookmark_476.js',
  'data/bookmark_476_dalmatia_east.js', 'data/bookmark_476_italy.js',
  'data/bookmark_476_gaul_iberia.js', 'data/bookmark_476_africa.js',
  'data/cultures.js', 'data/political_institutions.js', 'data/story_campaigns.js',
  'data/technology.js', 'data/starts.js', 'data/settlements.js', 'data/geographies.js',
  'js/bookmark_setup.js', 'js/authority.js', 'js/institutions.js',
  'js/stories.js', 'js/story_campaign.js', 'data/story_instances.js',
  'js/story_courts.js', 'js/federates.js', 'js/world.js', 'js/wars.js',
  'js/model.js', 'js/population.js', 'js/settlement.js', 'js/treasury.js',
  'js/events.js', 'js/religion.js', 'js/main.js', 'js/save.js', 'js/save_v4.js'
]);
const { test, expect } = require('../support/fixture');
const { startParityGame } = require('../support/game/parity');
const { openGame } = require('../support/game/navigation');
const { injectBrowserHarness } = require('../support/game/browser-harness');
const CODE = 'BALKANS476-476-curialis_476-ravenna-m-Marcus';
async function start(page, testInfo) {
  await startParityGame(page, testInfo, { bookmark:'476', code:CODE });
}

test('regional smoke separates governors, host commissions, magnate property and community identities',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, region = FBDATA.bookmarkRegions476.dalmatia_east;
      const governors = Object.keys(region.opening.appointments).filter(function (id) { return /_governor$/.test(id); });
      const scopes = governors.every(function (id) {
        const def = region.opening.appointments[id], c = FB.bookmarkActor(s, def.actorId);
        const office = FB.political.offices(s, {kind:'character',id:c.id}).find(function (row) {
          return row.ref.appointmentId === s.bookmarkSetup.appointments[id].id;
        });
        return c.generatedOfficeholder && office.status === 'active' &&
          office.scope.kind === 'county' && office.scope.id === def.scope.id &&
          FBDATA.authorityOffices[def.officeId].powers.join(',') === 'peace,revenue' &&
          s.owner[def.scope.id] === 'byzantium' && s.holder[def.scope.id] === 'byzantium';
      });
      const z = s.stories.zeno_return_476;
      const aliases = FB.bookmarkActor(s, 'illus').id === z.illusId &&
        FB.bookmarkActor(s, 'trocundes').id === z.trocundesId &&
        FB.bookmarkActor(s, 'amal_ruler').id === s.stories.western_court_476.theodericId &&
        FB.bookmarkActor(s, 'thracian_ruler').id === FB.realmRulerCharacterSnapshot(s, 'thracian_goths_476').id;
      const strabo = FB.bookmarkActor(s, 'thracian_ruler');
      const command = FB.political.offices(s, {kind:'character',id:strabo.id}).find(function (row) {
        return row.ref.appointmentId === s.bookmarkSetup.appointments.thracian_imperial_command.id;
      });
      const rights = region.provinces.every(function (p) {
        return p.customaryRights.some(function (r) { return r.power === 'peace'; }) &&
          p.customaryRights.some(function (r) { return r.power === 'revenue'; });
      });
      const longinus = FB.bookmarkActor(s, 'isaurian_magnate');
      const property = FB.privateEstates(s, longinus.id)[0];
      const services = ['pannonia','thracian_goths_476'].map(function (rid) {
        const c = s.authority.contracts.find(function (row) { return row.federateRealmId === rid; });
        return [c.payPerSeason, FB.political.contract(s, c.id).effective, c.settlementCountyIds.length];
      });
      // Restore stamps the frozen authority schema on live state; compare the records.
      const records = function (a) { return Object.assign({}, a, { schema:undefined }); };
      const saved = JSON.stringify([s.bookmarkSetup,records(s.authority),s.localInstitutions]);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { errors:FB.validateBookmark(FB.bookmark('476')), governors:governors.length,
        scopes:scopes, aliases:aliases, rights:rights,
        command:[command.status,command.scope.kind,command.scope.id],
        magnate:[longinus.name,longinus.culture,property.share0,s.owner.ikonion],
        gepid:FB.political.governingIdentity(s,'gepids_476').eliteCultureId,
        isaurian:s.chars[z.illusId].culture, services:services,
        demands:s.bookmarkSetup.claims.map(function (c) { return c.status; }),
        institutions:Object.keys(region.institutions).every(function (id) { return !!FB.state.localInstitutions[id]; }),
        revision:FB.state.bookmarkSetup.revision,
        saved:saved === JSON.stringify([FB.state.bookmarkSetup,records(FB.state.authority),FB.state.localInstitutions]),
        tech:['federate_host_commissions','campaign_territorial_settlement'].map(function (id) {
          return FBDATA.techImpactReviews.features[id].mode;
        }), technologyFaults:FB.validateTechnologyData() };
    });
    expect(result).toEqual({ errors:[], governors:13, scopes:true, aliases:true, rights:true,
      command:['active','host','host_476_thracian'], magnate:['Longinus','isaurian',500,'byzantium'],
      gepid:'gepid', isaurian:'isaurian', services:[[10,true,0],[12,true,0]],
      demands:['demanded','demanded','demanded'], institutions:true,
      revision:'wider_v2', saved:true, tech:['none','none'], technologyFaults:[] });
  });

test('a patron commission loses its foreign host scope when bilateral service lapses',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, c = FB.bookmarkActor(s,'thracian_ruler');
      const subject = {kind:'character',id:c.id};
      const id = s.bookmarkSetup.appointments.thracian_imperial_command.id;
      function active() { return FB.political.offices(s,subject).some(function (row) {
        return row.ref.appointmentId === id && row.status === 'active';
      }); }
      const original = active(), land = JSON.stringify([s.owner,s.holder]);
      const listed = FB.officeScopes(s,'byzantium','magister_praesentalis').some(function (at) { return at.id === 'host_476_thracian'; });
      const contract = s.authority.contracts.find(function (row) { return row.federateRealmId === 'thracian_goths_476'; });
      FB.authorityContractTransition(s,contract.id,'release','byzantium');
      const lapsed = !active();
      const blocked = FB.authorityAppoint(s,{officeId:'dux',institutionId:'byzantium',
        appointer:{kind:'realm',id:'byzantium'},holder:subject,scope:{kind:'host',id:'host_476_thracian'}});
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return { original:original, listed:listed, lapsed:lapsed, blocked:blocked,
        unlisted:!FB.officeScopes(FB.state,'byzantium','magister_praesentalis').some(function (at) { return at.id === 'host_476_thracian'; }),
        land:land === JSON.stringify([FB.state.owner,FB.state.holder]),
        valid:FB.save.v4.validateAuthority(FB.state.authority,FB.state) };
    });
    expect(result).toEqual({original:true,listed:true,lapsed:true,blocked:null,unlisted:true,land:true,valid:true});
  });

test('new regional events use local and live community gates with bounded historical windows',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state;
      function qualifies(id,pid,year) {
        s.player.provinceId = pid; s.date.year = year;
        const ev = FB.eventById(id);
        return FB.eventPeriodEnabled(s,ev) && FB.checkTrigger(s,Object.assign({},ev.trigger,{chance:1}),{});
      }
      const gates = [qualifies('provincial_registers_476','ancyra',476),
        !qualifies('provincial_registers_476','ravenna',476),
        qualifies('sirmium_mixed_court_476','sirmium',476),
        !qualifies('sirmium_mixed_court_476','athens',476),
        qualifies('novae_provision_accounts_476','pliska',476),
        qualifies('isaurian_retainer_accounts_476','ikonion',480),
        !qualifies('isaurian_retainer_accounts_476','ancyra',480),
        qualifies('gothic_office_petitions_476','adrianople',477),
        !qualifies('gothic_office_petitions_476','adrianople',484),
        qualifies('gothic_meeting_accounts_476','serres',478),
        !qualifies('gothic_meeting_accounts_476','serres',480),
        qualifies('isaurian_command_letters_476','ikonion',483),
        !qualifies('isaurian_command_letters_476','ikonion',489),
        qualifies('provincial_reconciliation_formula_476','ephesos',482),
        !qualifies('provincial_reconciliation_formula_476','ephesos',481)];
      s.player.provinceId = 'ephesos'; s.date.year = 482; s.player.gold = 100;
      const ev = FB.eventById('provincial_reconciliation_formula_476'), ctx = FB.eventContextFor(s,ev,{});
      const before = JSON.stringify(s), rng = FB.getRngState();
      const preview = FB.previewEventOption(s,ev,ev.options[1],ctx);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState();
      const identities = JSON.stringify([s.owner,s.holder,s.authority.governingIdentities,s.population]);
      const receipt = FB.resolveEventOption(s,ev,ev.options[1],ctx);
      return { gates:gates.every(Boolean), preview:!!preview && pure,
        receipt:receipt.eventId, cost:100 - s.player.gold,
        identities:identities === JSON.stringify([s.owner,s.holder,s.authority.governingIdentities,s.population]) };
    });
    expect(result).toEqual({gates:true,preview:true,receipt:'provincial_reconciliation_formula_476',cost:5,identities:true});
  });

test('the Epirus rail waits for its window and a failed attempt preserves the later Italian opportunity',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, story = FB.stories.get('amal_epirus_476'), rec = s.stories.amal_epirus_476;
      const host = s.armies.find(function (a) { return a.id === 'host_476_amal'; });
      const initialHost = [host.id,host.men], land = JSON.stringify([s.owner,s.holder]);
      s.turn = 180; FB.stories.get('zeno_return_476').day(s,s.stories.zeno_return_476);
      s.date.year = 478; story.day(s,rec);
      const early = rec.phase === 'pending';
      s.date.year = 479; story.day(s,rec);
      const started = rec.phase === 'started', war = FB.ordinaryWarById(s,rec.warId);
      FB.settleOrdinaryWar(s,rec.warId,'defeat'); story.day(s,rec);
      const failed = rec.result === 'failed', records = JSON.stringify(s.stories);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const saved = records === JSON.stringify(FB.state.stories);
      const restored = FB.state; restored.date.year = 488; restored.realms.byzantium.treasury.gold = 1000;
      FB.stories.get('theoderic_italy_476').day(restored,restored.stories.theoderic_italy_476);
      const italian = restored.stories.theoderic_italy_476;
      const moving = FB.political.movingPolity(restored,italian.migrationId);
      return {early:early,started:started,target:war.objectives[0].target,failed:failed,saved:saved,
        land:land === JSON.stringify([restored.owner,restored.holder]),
        reused:moving.hostId === initialHost[0] && restored.armies.find(function (a) { return a.id === moving.hostId; }).men === initialHost[1],
        italy:italian.phase};
    });
    expect(result).toEqual({early:true,started:true,target:'dyrrachion',failed:true,saved:true,land:true,reused:true,italy:'started'});
  });

test('an unversioned core opening restores under its retained revision without seeding new actors or institutions',
  async function ({ page }, testInfo) {
    await openGame(page,testInfo);
    await page.evaluate(function () {
      const bm = FB.bookmark('476');
      window.regionalOpening = {opening:bm.opening,revision:bm.openingRevision,stories:bm.stories,institutions:bm.localInstitutions,realms:bm.realms,starts:FBDATA.startScenarios,startSelectors:bm.starts};
      bm.opening = bm.openingRevisions.core_v1; bm.openingRevision = 'core_v1';
      // core_v1 predates the Sasanian households, so use the original court declaration
      // and set aside the Peroz start that needs the aristocratic form.
      FBDATA.startScenarios = FBDATA.startScenarios.filter(function (sc) { return sc.rulerRealmId !== 'sasanian_476'; });
      bm.starts = bm.starts.filter(function (id) {
        return FBDATA.startScenarios.some(function (sc) { return sc.id === id; });
      });
      bm.realms = bm.realms.map(function (r) {
        return r.id === 'sasanian_476' ? FBDATA.bookmarkRegions476.outer.realms.find(function (o) { return o.id === r.id; }) : r;
      });
      bm.stories = bm.stories.filter(function (id) { return ['thracian_pressure_476','amal_epirus_476'].indexOf(id) < 0; });
      const old = ['salona_council','salona_see','constantinople_senate','constantinople_see','thessalonica_see',
        'dyrrachium_see','serdica_see','nicaea_see','ephesus_see','caesarea_see'];
      bm.localInstitutions = Object.assign({},bm.localInstitutions);
      Object.keys(FBDATA.bookmarkRegions476.dalmatia_east.institutions).forEach(function (id) {
        if (old.indexOf(id) < 0) delete bm.localInstitutions[id];
      });
      FB.startProgression.noteTier(3);
    });
    const full = page.locator('#btn-choose-beginning');
    if (await full.isVisible()) await full.click();
    else await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill(CODE); await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
    await page.getByRole('button',{name:'Begin',exact:true}).click();
    const result = await page.evaluate(function () {
      const saved = JSON.parse(FB.save.serialize()); delete saved.state.bookmarkSetup.revision;
      const bm = FB.bookmark('476'), kept = window.regionalOpening;
      bm.opening = kept.opening; bm.openingRevision = kept.revision; bm.stories = kept.stories; bm.localInstitutions = kept.institutions; bm.realms = kept.realms; FBDATA.startScenarios = kept.starts; bm.starts = kept.startSelectors;
      const ids = Object.keys(saved.state.chars).sort().join(','), opening = JSON.stringify(saved.state.bookmarkSetup);
      const institutions = JSON.stringify(saved.state.localInstitutions), authority = JSON.stringify(saved.state.authority);
      FB.save.restore(saved);
      const s = FB.state;
      const stable = ids === Object.keys(s.chars).sort().join(',') && opening === JSON.stringify(s.bookmarkSetup) &&
        institutions === JSON.stringify(s.localInstitutions) && authority === JSON.stringify(s.authority);
      const invalid = JSON.parse(FB.save.serialize()); invalid.state.bookmarkSetup.revision = 'missing_revision';
      let rejected = false; try { FB.save.restore(invalid); } catch (_) { rejected = true; }
      return {stable:stable,noNewStories:!s.stories.amal_epirus_476 && !s.stories.thracian_pressure_476,
        rejected:rejected,valid:FB.save.v4.validatePlatform(JSON.parse(FB.save.serialize()).state)};
    });
    expect(result).toEqual({stable:true,noNewStories:true,rejected:true,valid:true});
  });

test('a Balkan territorial victory closes the landless Italian rail and remains durable through restore',
  async function ({page},testInfo) {
    await start(page,testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state, story = FB.stories.get('amal_epirus_476'), rec = s.stories.amal_epirus_476;
      s.turn = 180; FB.stories.get('zeno_return_476').day(s,s.stories.zeno_return_476);
      s.date.year = 479; story.day(s,rec);
      FB.transferProvince(s,'dyrrachion','pannonia');
      FB.settleOrdinaryWar(s,rec.warId,'victory'); story.day(s,rec);
      s.date.year = 488; FB.stories.get('theoderic_italy_476').day(s,s.stories.theoderic_italy_476);
      const before = JSON.stringify(s.stories);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return {epirus:rec.result,italy:s.stories.theoderic_italy_476.result,reason:s.stories.theoderic_italy_476.reason,
        saved:before === JSON.stringify(FB.state.stories),owner:FB.state.owner.dyrrachion,
        settled:[FB.state.realms.pannonia.nonTerritorial,FB.state.realms.pannonia.capital,
          FB.political.government(FB.state,{kind:'realm',id:'pannonia'}).formId]};
    });
    expect(result).toEqual({epirus:'won',italy:'diverted',reason:'already_settled',saved:true,owner:'pannonia',settled:[false,'dyrrachion','regnum']});
  });

test('opening revision and actor reference declarations reject unknown or mixed schemas',
  async function ({page},testInfo) {
    await start(page,testInfo);
    const result = await page.evaluate(function () {
      const bm = FB.bookmark('476');
      const malformed = [
        function (b) { b.openingRevision = 'unknown'; },
        function (b) { b.openingLegacyRevision = 'unknown'; },
        function (b) { b.openingRevisions.core_v1 = undefined; },
        function (b) { b.opening.actors.amal_ruler.ref.realmId = 'unknown'; },
        function (b) { b.opening.actors.illus.ref.storyId = 'unknown'; },
        function (b) { b.opening.actors.illus.ref.field = ''; },
        function (b) { b.opening.actors.illus.name = 'A duplicate'; },
        function (b) { b.opening.actors.amal_ruler.ref.realmId = ['pannonia']; },
        function (b) { b.opening.migrations[0].actorIds = ['illus']; }
      ];
      const definitions = malformed.every(function (edit) {
        const b = JSON.parse(JSON.stringify(bm));
        b.openingRevisions[b.openingRevision] = b.opening;
        edit(b); return FB.validateBookmark(b).length > 0;
      });
      const saved = JSON.parse(FB.save.serialize()).state, actors = saved.bookmarkSetup.actors;
      const illus = actors.illus; actors.illus = actors.trocundes; actors.trocundes = illus;
      let swapped = false;
      try { FB.save.v4.validatePlatform(saved); } catch (_) { swapped = true; }
      return {definitions:definitions,swapped:swapped};
    });
    expect(result).toEqual({definitions:true,swapped:true});
  });

test('one regional daily season resolves both bounded rails and retains communities and save records',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served','Run the bounded daily journey once; smoke covers the browser matrix.');
    await start(page,testInfo); await injectBrowserHarness(page);
    await page.evaluate(function () {
      const s = FB.state;
      FB.game.observe = true; delete s.stories.curialis_track_476;
      s.player.provinceId = 'thessaloniki';
      window.regionalChance = FB.chance; FB.chance = function (p) { return p >= 1; };
      // Stage Zeno's return, then open the season in 482: the Thracian window
      // (477-481) has closed while the Amal window (479-483) remains open.
      s.turn = 180; FB.stories.get('zeno_return_476').day(s,s.stories.zeno_return_476);
      s.date.year = 482;
    });
    try {
      for (let half = 0; half < 2; half++) {
        if (half === 1) {
          // The daily tick started the Amal war; settle it as an ordinary
          // defeat unless the war simulation has already decided it.
          const midpoint = await page.evaluate(function () {
            const s = FB.state, rec = s.stories.amal_epirus_476;
            const started = rec.startedTurn !== null && !!rec.warId;
            if (rec.phase === 'started' && FB.ordinaryWarById(s,rec.warId)) FB.settleOrdinaryWar(s,rec.warId,'defeat');
            return {thracian:[s.stories.thracian_pressure_476.result,s.stories.thracian_pressure_476.reason],started:started};
          });
          expect(midpoint).toEqual({thracian:['diverted','window_closed'],started:true});
        }
        const result = await page.evaluate(function () {
          const before = FB.state.turn;
          for (let day = 0; day < 45; day++) {
            const turn = FB.state.turn;
            FB.game.passDay({deferUi:true});
            if (FB.state.turn !== turn + 1) throw new Error('Regional observer stalled at turn ' + turn);
          }
          const saved = JSON.parse(FB.save.serialize()), records = JSON.stringify([saved.state.stories,saved.state.bookmarkSetup,saved.state.localInstitutions]);
          FB.save.restore(saved);
          return {days:FB.state.turn-before,errors:FBTEST.checkInvariants(),
            records:records === JSON.stringify([FB.state.stories,FB.state.bookmarkSetup,FB.state.localInstitutions])};
        });
        expect(result).toEqual({days:45,errors:[],records:true});
      }
      const result = await page.evaluate(function () {
        const thracian = FB.state.stories.thracian_pressure_476, amal = FB.state.stories.amal_epirus_476;
        return {date:FB.state.date,thracian:[thracian.phase,thracian.result,thracian.reason],
          amal:amal.phase === 'resolved' && ['won','failed'].indexOf(amal.result) >= 0,
          scope:FB.state.owner.nicosia === 'byzantium' && ['antioch','jerusalem','tarsos'].every(function (id) {
            return FB.state.owner[id] === 'byzantium';
          })};
      });
      expect(result).toEqual({date:{year:482,season:1,day:1},thracian:['resolved','diverted','window_closed'],
        amal:true,scope:true});
    } finally {
      await page.evaluate(function () { FB.chance = window.regionalChance; delete window.regionalChance; });
    }
  });
