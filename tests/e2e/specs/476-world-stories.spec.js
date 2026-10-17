'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/story_household_effects_476_493.js', 'js/story_household_observer.js',
  'data/story_courts_476.js',
  'index.html', 'data/story_campaigns.js', 'data/bookmarks.js', 'data/bookmark_476.js',
  'data/eras.js', 'data/systems.js', 'js/systems.js', 'data/cultures.js',
  'data/settlements.js', 'data/map_data.js', 'data/counties.js',
  'js/util.js', 'js/crazygames.js', 'data/distribution_crazygames.js',
  'data/bookmark_476_italy.js', 'data/bookmark_476_dalmatia_east.js',
  'data/bookmark_476_gaul_iberia.js', 'data/bookmark_476_africa.js',
  'data/political_institutions.js', 'data/technology.js', 'data/starts.js',
  'js/stories.js', 'js/story_campaign.js', 'data/story_instances.js', 'js/bookmark_setup.js', 'js/story_agreements.js',
  'js/story_courts.js', 'js/story_track.js',
   'js/authority.js', 'js/federates.js',
  'js/wars.js', 'js/armies.js', 'js/politics.js', 'js/world.js', 'js/model.js',
  'js/treasury.js', 'js/institutions.js', 'js/main.js', 'js/save.js',
  'js/save_v4.js', 'js/messages.js', 'js/i18n.js', 'js/ui_panels.js', 'js/ui_misc.js', 'js/religion.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { openCrazyGame } = require('../support/game/crazygames-title');
const { mockCrazyGames } = require('../support/crazygames');
const RAILS = ['zeno_return_476','clovis_syagrius_476','theoderic_italy_476',
  'eastern_africa_476','eastern_italy_476','rugian_frontier_476','sicilian_tribute_476',
  'norican_evacuation_476','thracian_pressure_476','amal_epirus_476',
  'clovis_alamanni_476','suevic_frontier_476','cantabrian_campaign_476',
  'vasconian_campaign_476','gallaecian_campaign_476',
  'western_office_476'];

async function start(page, testInfo, bookmark, crazygames, scenario) {
  if (crazygames) {
    await mockCrazyGames(page);
    await openCrazyGame(page, testInfo);
    await page.locator('#btn-choose-beginning').click();
  } else {
    await openGame(page, testInfo);
    await page.getByRole('button', { name:'New Game', exact:true }).click();
  }
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(bookmark === '867'
    ? 'WORLDSTORIES-867-serf-london-f-Ada'
    : scenario === 'curialis_476' ? 'WORLDSTORIES-476-curialis_476-ravenna-m-Marcus'
    : 'WORLDSTORIES-476-federate_476-ravenna-m-Marcus-standard-0-gothic.homoian');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
}

for (const crazygames of [false,true]) {
  test('independent world stories attach and save with distribution flag ' + crazygames,
    async function ({ page }, testInfo) {
      if (crazygames) await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
      await start(page, testInfo, '476', crazygames);
      const result = await page.evaluate(function () {
        const s = FB.state, stories = FBDATA.bookmarks['476'].stories;
        const before = JSON.stringify(s), rng = FB.getRngState();
        const cards = FB.stories.cards(s);
        const pure = before === JSON.stringify(s) && rng === FB.getRngState();
        const serialized = FB.save.serialize();
        FB.save.restore(JSON.parse(serialized));
        return { attached:FB.stories.attached(FB.state), pure:pure,
          world:stories.every(function (id) { return FB.stories.get(id).kind === 'world'; }),
          noLegacy:!FB.state.stories.western_court_476.historical,
          cards:cards.map(function (card) { return card.id; }),
          modes:['period_476_conditional_campaigns','period_476_eastern_return','period_476_western_office']
            .map(function (id) { return FBDATA.techImpactReviews.features[id].mode; }),
          valid:FB.save.v4.validatePlatform(JSON.parse(FB.save.serialize()).state) };
      });
      expect(result.attached.filter(function (id) { return id.indexOf('household_effects_') !== 0; })).toEqual(['western_court_476'].concat(RAILS, ['cashel_recognition_476','federate_track_476']));
      expect(result).toMatchObject({ pure:true, world:true, noLegacy:true, valid:true, modes:['none','none','none'] });
      // The Suevic frontier window opens in 476, so its campaign card shows from the start.
      expect(result.cards.filter(function (id) { return id.indexOf('household_effects_') !== 0; })).toEqual(['zeno_return_476','suevic_frontier_476','western_office_476','federate_track_476']);
    });
}

test('independent court bargaining waits for an undecided civic household',
  async function ({ page }, testInfo) {
    await start(page, testInfo, '476', false, 'curialis_476');
    const result = await page.evaluate(function () {
      const s = FB.state, w = s.stories.western_court_476;
      s.turn = 90; FB.stories.day(s);
      const waiting = !w.aiResolution && !w.contractId;
      const review = FB.stories.quote(s, 'curialis_track_476', 'keep_household');
      const completed = FB.stories.apply(s, 'curialis_track_476', 'keep_household', review);
      FB.stories.day(s);
      return { waiting:waiting, completed:completed, result:w.aiResolution,
        phase:s.stories.curialis_track_476.phase };
    });
    expect(result).toEqual({ waiting:true, completed:true, result:'negotiated', phase:'complete' });
  });

test('world status sheets retain their originating card and registration remains sealed',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    await page.locator('[data-tab="actions"]').click();
    const card = page.locator('[data-story-card="zeno_return_476"]');
    await card.click();
    await expect(page.locator('#genmodal')).toContainText('A displaced claimant');
    await expect(page.locator('[data-story-choice]')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    await expect(card).toBeFocused();
    const result = await page.evaluate(function () {
      const rejected = [];
      for (const action of [
        function () { FB.stories.registerType('late_campaign', function () { return {}; }); },
        function () { FB.stories.registerData(FBDATA.storyCampaigns.clovis_syagrius_476); }
      ]) {
        try { action(); rejected.push(false); } catch (error) { rejected.push(error.message.indexOf('load time only') >= 0); }
      }
      return rejected;
    });
    expect(result).toEqual([true,true]);
  });

test('Zeno’s commanders restore the office and replace a stale commission exactly once',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      let s = FB.state;
      const w = s.stories.western_court_476, rec = s.stories.zeno_return_476;
      const t = s.stories.federate_track_476;
      const old = FB.storyCourts.context('western_court_476').recognize(s, 'imperial_commission',
        { kind:'realm', id:'byzantium' }, { kind:'realm', id:'federates_476' },
        { kind:'realm', id:'federates_476' });
      t.backedClaimant = 'zeno';
      const ownership = JSON.stringify(s.owner), hosts = s.armies.length;
      s.turn = 149; FB.stories.get('zeno_return_476').day(s, rec);
      const early = !t.imperialRecognitionId && rec.phase === 'pending';
      s.turn = 150; FB.stories.get('zeno_return_476').day(s, rec);
      const live = FB.political.legitimacy(s, { kind:'realm', id:'federates_476' },
        { kind:'realm', id:'federates_476' }, 'imperial_commission');
      const counts = [s.authority.appointments.length,s.authority.recognitions.length,s.armies.length];
      const bytes = JSON.stringify(rec);
      FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
      FB.stories.get('zeno_return_476').day(s, s.stories.zeno_return_476);
      return { early:early, result:rec.result, turn:rec.outcomeTurn,
        newCommission:live.some(function (row) { return row.id === t.imperialRecognitionId; }),
        oldLapsed:!live.some(function (row) { return row.id === old.id; }),
        ruler:FB.realmRulerCharacterSnapshot(s, 'byzantium').id === w.zenoId,
        commanders:[rec.illusId,rec.trocundesId].every(function (id) { return s.chars[id].homeProvinceId === 'constantinople'; }),
        ownership:ownership === JSON.stringify(s.owner), hosts:hosts === s.armies.length,
        replay:bytes === JSON.stringify(s.stories.zeno_return_476) &&
          JSON.stringify(counts) === JSON.stringify([s.authority.appointments.length,s.authority.recognitions.length,s.armies.length]) };
    });
    expect(result).toEqual({ early:true, result:'restored', turn:150, newCommission:true,
      oldLapsed:true, ruler:true, commanders:true, ownership:true, hosts:true, replay:true });
  });

for (const cause of ['claimant','commander','succession','capital','war']) {
  test('Zeno return resolves after ' + cause + ' interruption without a county award',
    async function ({ page }, testInfo) {
      await start(page, testInfo);
      const result = await page.evaluate(function (cause) {
        const s = FB.state, w = s.stories.western_court_476, rec = s.stories.zeno_return_476;
        if (cause === 'claimant') s.chars[w.zenoId].dead = true;
        if (cause === 'commander') s.chars[rec.illusId].dead = true;
        if (cause === 'succession') FB.assignRealmRulerCharacter(s, 'byzantium', w.senatorId, { replaceAuthored:true });
        if (cause === 'capital') FB.transferProvince(s, 'constantinople', 'croatia');
        if (cause === 'war') FB.registerOrdinaryWar(s, 'byzantium', { enemy:'croatia', target:'split', legacy:false,
          casus:{ type:'border', target:'split' }, objectives:[{ type:'border', target:'split' }] });
        const owners = JSON.stringify(s.owner);
        s.turn = 180; FB.stories.get('zeno_return_476').day(s, rec);
        const delayed = rec.phase === 'pending';
        if (cause === 'war') { s.turn = 360; FB.stories.get('zeno_return_476').day(s, rec); }
        const before = JSON.stringify(rec);
        FB.save.restore(JSON.parse(FB.save.serialize()));
        FB.stories.get('zeno_return_476').day(FB.state, FB.state.stories.zeno_return_476);
        return { result:rec.result, resolved:rec.phase === 'resolved', delayed:delayed,
          unchanged:owners === JSON.stringify(FB.state.owner), durable:before === JSON.stringify(FB.state.stories.zeno_return_476) };
      }, cause);
      expect(result).toEqual({ result:cause === 'capital' || cause === 'war' ? 'diverted' : 'interrupted',
        resolved:true, delayed:cause === 'war', unchanged:true, durable:true });
    });
}

for (const id of ['clovis_syagrius_476','theoderic_italy_476','eastern_africa_476','eastern_italy_476']) {
  test(id + ' declares once, follows an actual award, and persists its result',
    async function ({ page }, testInfo) {
      await start(page, testInfo);
      const result = await page.evaluate(function (id) {
        let s = FB.state;
        const def = FBDATA.storyCampaigns[id], w = s.stories.western_court_476;
        const rec = s.stories[id], story = FB.stories.get(id);
        if (id === 'clovis_syagrius_476') FB.assignRealmRulerCharacter(s, 'franks_476', w.clovisId, { replaceAuthored:true });
        if (id === 'theoderic_italy_476') {
          s.turn = 180; FB.stories.get('zeno_return_476').day(s, s.stories.zeno_return_476);
          s.realms.byzantium.treasury.gold = 1000;
        }
        if (id === 'eastern_africa_476') FB.transferProvince(s, 'tunis', 'croatia');
        s.date.year = def.firstYear;
        const owner = s.owner[def.target.provinceId], funds = FB.treasuryAvailable(s, 'byzantium');
        story.day(s, rec);
        const war = FB.ordinaryWarById(s, rec.warId);
        const started = rec.phase, noAward = s.owner[def.target.provinceId] === owner;
        const commitments = [s.authority.appointments.length,s.authority.recognitions.length,
          s.authority.contracts.length,(s.authority.migrations || []).length,Object.keys(s.wars).length];
        const paid = FB.treasuryAvailable(s, 'byzantium'); story.day(s, rec);
        const once = paid === FB.treasuryAvailable(s, 'byzantium') && JSON.stringify(commitments) ===
          JSON.stringify([s.authority.appointments.length,s.authority.recognitions.length,
            s.authority.contracts.length,(s.authority.migrations || []).length,Object.keys(s.wars).length]);
        const commission = !def.commission || FB.political.legitimacy(s,
          { kind:'realm', id:def.actor.realmId }, { kind:'realm', id:def.actor.realmId }, def.commission.source)
          .some(function (row) { return row.id === rec.commissionId; });
        const warFacts = { target:war && war.objectives[0].target, enemy:war && war.defender };
        FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
        // Stage the award boundary of the declared ordinary war, rather than a historical-date transfer.
        FB.transferProvince(s, def.target.provinceId, def.actor.realmId);
        FB.settleOrdinaryWar(s, rec.warId, 'victory');
        if (rec.migrationId) {
          const army = s.armies.find(function (a) { return a.migrationId === rec.migrationId; });
          army.at = def.target.provinceId; army.path = []; army.moveLeft = 0;
          FB.federateDay(s);
        }
        story.day(s, s.stories[id]);
        const outcome = JSON.stringify(s.stories[id]);
        FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
        story.day(s, s.stories[id]);
        return { started:started, noAward:noAward, once:once, commission:commission, war:warFacts,
          owner:owner, result:s.stories[id].result, phase:s.stories[id].phase,
          durable:outcome === JSON.stringify(s.stories[id]), equipment:funds - paid };
      }, id);
      expect(result).toMatchObject({ started:'started', noAward:true, once:true,
        commission:true, result:'won', phase:'resolved', durable:true });
      expect(result.war).toEqual({ target:id === 'clovis_syagrius_476' ? 'laon' :
        id === 'eastern_africa_476' ? 'tunis' : 'ravenna', enemy:result.owner });
      expect(result.equipment).toBe(id === 'theoderic_italy_476' ? 40 : 0);
    });

  for (const cause of ['diverted','extinct','death','succession','defeat','timeout']) {
    test(id + ' durably resolves ' + cause,
      async function ({ page }, testInfo) {
        await start(page, testInfo);
        const result = await page.evaluate(function (options) {
          const s = FB.state, id = options.id, cause = options.cause;
          const def = FBDATA.storyCampaigns[id], w = s.stories.western_court_476;
          const story = FB.stories.get(id), rec = s.stories[id];
          if (id === 'clovis_syagrius_476') FB.assignRealmRulerCharacter(s, 'franks_476', w.clovisId, { replaceAuthored:true });
          if (id === 'theoderic_italy_476') {
            s.turn = 180; FB.stories.get('zeno_return_476').day(s, s.stories.zeno_return_476);
            s.realms.byzantium.treasury.gold = 1000;
          }
          s.date.year = def.firstYear;
          if (cause === 'diverted') {
            if (id === 'clovis_syagrius_476' || id === 'theoderic_italy_476')
              FB.transferProvince(s, def.target.provinceId, 'croatia');
            else FB.transferProvince(s, 'constantinople', 'croatia');
          }
          if (cause === 'extinct') s.realms[def.actor.realmId].alive = false;
          const ownership = JSON.stringify(s.owner);
          story.day(s, rec);
          if (cause === 'death') s.chars[rec.actorId].dead = true;
          if (cause === 'succession') {
            FB.assignRealmRulerCharacter(s, def.commission ? def.commission.issuerRealmId : def.actor.realmId,
              w.senatorId, { replaceAuthored:true });
          }
          if (cause === 'defeat') FB.settleOrdinaryWar(s, rec.warId, 'defeat');
          if (cause === 'timeout') s.turn = rec.deadline;
          story.day(s, rec);
          const bytes = JSON.stringify(rec);
          const saved = JSON.parse(FB.save.serialize());
          FB.save.restore(saved);
          story.day(FB.state, FB.state.stories[id]);
          return { result:rec.result, phase:rec.phase, noAward:ownership === JSON.stringify(FB.state.owner),
            durable:bytes === JSON.stringify(FB.state.stories[id]),
            migration:!rec.migrationId || FB.political.movingPolity(FB.state, rec.migrationId).status === 'failed' };
        }, { id:id, cause:cause });
        expect(result).toEqual({ result:cause === 'diverted' ? 'diverted' :
          cause === 'extinct' || cause === 'death' || cause === 'succession' ? 'interrupted' : 'failed',
          phase:'resolved', noAward:true, durable:true, migration:true });
      });
  }
}

for (const cause of ['succession','issuer death','issuer extinction']) {
  test('Theoderic negotiation survives saving and interrupts on ' + cause,
    async function ({ page }, testInfo) {
      await start(page, testInfo);
      const result = await page.evaluate(function (cause) {
        let s = FB.state;
        const w = s.stories.western_court_476, story = FB.stories.get('theoderic_italy_476');
        s.turn = 180; FB.stories.get('zeno_return_476').day(s, s.stories.zeno_return_476);
        s.realms.byzantium.treasury.gold = 0; s.date.year = 488;
        const owners = JSON.stringify(s.owner);
        story.day(s, s.stories.theoderic_italy_476);
        const before = JSON.stringify(s.stories.theoderic_italy_476);
        const phase = s.stories.theoderic_italy_476.phase;
        const contracts = s.authority.contracts.length;
        FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
        const restored = before === JSON.stringify(s.stories.theoderic_italy_476);
        const rec = s.stories.theoderic_italy_476;
        if (cause === 'succession')
          FB.assignRealmRulerCharacter(s, 'byzantium', w.senatorId, { replaceAuthored:true });
        else if (cause === 'issuer extinction') s.realms.byzantium.alive = false;
        else s.chars[w.zenoId].dead = true;
        story.day(s, rec);
        const outcome = JSON.stringify(rec), army = s.armies.find(function (row) { return row.id === 'host_476_amal'; });
        const moving = FB.political.movingPolity(s, rec.migrationId), deal = FB.political.contract(s, rec.contractId);
        FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
        story.day(s, s.stories.theoderic_italy_476);
        return { phase:phase, restored:restored, result:rec.result,
          durable:outcome === JSON.stringify(s.stories.theoderic_italy_476),
          noAward:owners === JSON.stringify(s.owner), noWar:!rec.warId,
          noPayment:FB.treasuryAvailable(s, 'byzantium') === 0,
          once:contracts === s.authority.contracts.length,
          contract:deal ? deal.status : null, migration:moving.status,
          hostSurvived:army.men > 0 && !army.migrationId && s.realms.pannonia.alive };
      }, cause);
      expect(result).toEqual({ phase:'negotiating', restored:true, result:'interrupted', durable:true,
        noAward:true, noWar:true, noPayment:true, once:true,
        contract:null, migration:'failed', hostSurvived:true });
    });
}

test('the western office survives, is deposed and restores with mandates independent of land',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      let s = FB.state;
      const w = s.stories.western_court_476, rec = s.stories.western_office_476;
      s.stories.federate_track_476.role = 'outside';
      s.turn = 361; FB.storyCourts.context('western_court_476').syncOffice(s);
      const survived = rec.result;
      const old = w.westOfficeId;
      FB.transferProvince(s, 'ravenna', 'federates_476'); FB.storyCourts.context('western_court_476').syncOffice(s);
      const deposed = rec.result;
      const removed = s.authority.appointments.find(function (row) { return row.id === old; }).status;
      FB.transferProvince(s, 'ravenna', 'italy'); FB.storyCourts.context('western_court_476').syncOffice(s);
      const live = FB.political.offices(s, { kind:'character', id:w.westRulerId })
        .filter(function (row) { return row.ref.appointmentId === w.westOfficeId && row.status === 'active'; }).length;
      const newId = w.westOfficeId, before = JSON.stringify(rec), count = s.authority.appointments.length;
      FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
      FB.storyCourts.context('western_court_476').syncOffice(s);
      return { survived:survived, deposed:deposed, removed:removed, result:rec.result, live:live,
        newOffice:newId !== old, owner:s.owner.ravenna,
        durable:before === JSON.stringify(s.stories.western_office_476), once:count === s.authority.appointments.length };
    });
    expect(result).toEqual({ survived:'survived', deposed:'deposed', removed:'removed',
      result:'restored', live:1, newOffice:true, owner:'italy', durable:true, once:true });
  });

test('legacy campaign records migrate without inventing actors, awards or payments',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      const old = JSON.parse(FB.save.serialize());
      // Pre-rails saves predate declarative openings, so they carry no bookmarkSetup.
      delete old.state.bookmarkSetup;
      const w = old.state.stories.western_court_476;
      delete w.railsSchema; w.easternReturn = 'interrupted';
      w.historical = { clovis:'won', theoderic:'failed', africa:'diverged', italy:'pending' };
      for (const id of FBDATA.bookmarks['476'].stories)
        if (id !== 'western_court_476') delete old.state.stories[id];
      const source = JSON.stringify(old), actors = JSON.stringify(old.state.chars);
      const owners = JSON.stringify(old.state.owner), treasury = JSON.stringify(old.state.realms);
      const first = FB.save.v4.migrate(old), second = FB.save.v4.migrate(first);
      const stories = first.state.stories;
      return { immutable:source === JSON.stringify(old), idempotent:JSON.stringify(first) === JSON.stringify(second),
        actors:actors === JSON.stringify(first.state.chars), owners:owners === JSON.stringify(first.state.owner),
        treasury:treasury === JSON.stringify(first.state.realms), noLegacy:!stories.western_court_476.historical,
        commanders:stories.zeno_return_476.illusId === null && stories.zeno_return_476.trocundesId === null,
        results:[stories.zeno_return_476.result,stories.clovis_syagrius_476.result,
          stories.theoderic_italy_476.result,stories.eastern_africa_476.result,stories.eastern_italy_476.phase] };
    });
    expect(result).toEqual({ immutable:true, idempotent:true, actors:true, owners:true, treasury:true,
      noLegacy:true, commanders:true, results:['interrupted','won','failed','diverted','pending'] });
  });

test('malformed or missing rail records fail before adopting state or RNG',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    const result = await page.evaluate(function () {
      const original = FB.state, rng = FB.getRngState(), saved = JSON.parse(FB.save.serialize());
      const edits = [
        function (s) { s.stories.clovis_syagrius_476.phase = 'unending'; },
        function (s) { s.stories.eastern_africa_476.phase = 'resolved'; s.stories.eastern_africa_476.result = 'won'; },
        function (s) { s.stories.zeno_return_476.illusId = 42; },
        function (s) { delete s.stories.western_office_476; },
        function (s) { s.stories.theoderic_italy_476.deadline = -1; }
      ];
      return edits.map(function (edit) {
        const copy = JSON.parse(JSON.stringify(saved)); edit(copy.state);
        let rejected = false;
        try { FB.save.restore(copy); } catch (_) { rejected = true; }
        return rejected && FB.state === original && FB.getRngState() === rng;
      });
    });
    expect(result).toEqual([true,true,true,true,true]);
  });

test('campaign configuration works in a medieval world without a 476 engine selector',
  async function ({ page }, testInfo) {
    await start(page, testInfo, '867');
    const result = await page.evaluate(function () {
      // The registry runs its own copy of each declaration; edit that copy.
      const s = FB.state, def = FB.stories.get('clovis_syagrius_476').declaration;
      def.actor = { realmId:s.owner.roma }; def.target = { provinceId:'constantinople' };
      def.firstYear = 867; def.lastYear = 870;
      const story = FB.stories.get(def.id), rec = story.init(s), owner = s.owner.constantinople;
      story.day(s, rec);
      const war = FB.ordinaryWarById(s, rec.warId);
      return { phase:rec.phase, target:war && war.objectives[0].target,
        noAward:s.owner.constantinople === owner, attached:FB.stories.attached(s) };
    });
    expect(result).toEqual({ phase:'started', target:'constantinople', noAward:true, attached:[] });
  });

test('one observer season preserves bounded historical opportunities through restore',
  async function ({ page }, testInfo) {
    await start(page, testInfo);
    await page.evaluate(function () {
      FB.game.observe = true;
      delete FB.state.stories.federate_track_476;
    });
    // Keep each browser task bounded and exercise real daily/seasonal ordering.
    for (let batch = 0; batch < 3; batch++) {
      await page.evaluate(function () {
        for (let day = 0; day < 30; day++) {
          const turn = FB.state.turn;
          FB.game.passDay({ deferUi:true });
          if (FB.state.turn !== turn + 1) throw new Error('World-story observer stalled at turn ' + turn);
        }
      });
    }
    const result = await page.evaluate(function (ids) {
      const s = FB.state;
      const statuses = ids.map(function (id) {
        const rec = s.stories[id];
        return { id:id, phase:rec.phase, result:rec.result,
          boundedCampaign:rec.phase === 'started' && rec.deadline > s.turn &&
            rec.deadline <= s.turn + 2880 && !!FB.ordinaryWarById(s, rec.warId) };
      });
      const before = JSON.stringify(ids.map(function (id) { return s.stories[id]; }));
      FB.save.restore(JSON.parse(FB.save.serialize()));
      FB.stories.day(FB.state);
      return { statuses:statuses, date:FB.state.date, turn:FB.state.turn,
        durable:before === JSON.stringify(ids.map(function (id) { return FB.state.stories[id]; })) };
    }, RAILS);
    expect(result).toMatchObject({ date:{ year:476, season:1, day:1 }, turn:90 });
    expect(result.statuses.every(function (rec) {
      return rec.phase === 'pending' || rec.phase === 'resolved' && !!rec.result || rec.boundedCampaign;
    })).toBe(true);
    expect(result.durable).toBe(true);
  });
