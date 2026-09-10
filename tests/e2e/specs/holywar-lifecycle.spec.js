'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/wars.js', 'js/ui_wars.js',
  'js/holywar.js',
  'js/armies.js',
  'js/fortifications.js',
  'js/technology.js',
  'data/map_data.js',
  'data/units.js',
  'js/save.js',
  'js/world.js',
  'data/events_world.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { injectHolyWarHarness } = require('../support/game/holywar-harness');

test.beforeEach(async function ({ page }, testInfo) {
  test.skip(testInfo.project.name !== 'chromium-file' &&
      testInfo.project.name !== 'chromium-served',
    'Lifecycle boundaries run against the two primary Chromium targets.');
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await injectHolyWarHarness(page);
});

test('holy-war participation preserves an unrelated ordinary campaign and its host assignment', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    FB.ensureWars(s);
    const campaign = FBTEST.makeGreatHolyWar({ phase:'active', capturedCounties:[],
      attackers:[{ realm:'west_francia', mustered:false }, { realm:'italy', mustered:false }] });
    const other = Object.keys(s.realms).filter(function (rid) {
      return rid !== 'player' && s.realms[rid].alive && !s.realms[rid].liege &&
        !FB.greatHolyWarCamp(s, rid);
    }).sort()[0];
    const w = FB.registerOrdinaryWar(s, 'west_francia', { enemy:other, target:s.realms[other].capital });
    FB.armyTick(s);
    const host = FB.hostOf(s, 'west_francia');
    FB.assignHostCampaign(s, host.id, w.id);
    const before = host.men;
    const enrolled = !!FB.greatHolyWarCamp(s, 'west_francia');
    FB.repairWars(s);
    FB.settleOrdinaryWar(s, w.id, 'white_peace');
    FB.repairWars(s);
    return { enrolled:enrolled, sameCampaign:s.greatHolyWar.id === campaign.id,
      retained:!!FB.hostOf(s, 'west_francia'), conserved:host.men === before, reassigned:host.warId === 'holy' };
  });
  expect(result).toEqual({ enrolled:true, sameCampaign:true, retained:true, conserved:true, reassigned:true });
});

test('active holy-war leaders and participants muster and remuster without ordinary wars',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      s.player.war = null;
      for (const id in s.realms) s.realms[id].war = null;
      s.armies = [];
      s.armyDown = {};
      const campaign = FBTEST.makeGreatHolyWar({
        phase:'preparation', capturedCounties:[],
        attackers:[
          { realm:'west_francia', mustered:false },
          { realm:'italy', mustered:false }
        ]
      });
      const realms = ['west_francia', 'italy', 'abbasid'];
      function fielded() {
        return realms.map(function (id) {
          return FB.hostsOf(s, id).some(function (host) {
            return host.men > 0;
          });
        });
      }
      FB.armyTick(s);
      const preparation = fielded();
      campaign.phase = 'active';
      campaign.resolve = 0;
      FB.armyTick(s);
      const active = fielded();
      const leader = !!FB.hostOf(s, campaign.leaderRealm);
      const mustered = campaign.participants.attackers.map(function (part) {
        return part.mustered;
      });
      s.turn++;
      FB.armyTick(s);
      const retained = fielded();
      // Model shattered banners; the ordinary rearm boundary also applies here.
      s.armies = [];
      for (const id of realms) s.armyDown[id] = s.turn;
      FB.armyTick(s);
      const waiting = fielded();
      s.turn += FBDATA.balance.armyRearmDays;
      FB.armyTick(s);
      const remustered = fielded();
      return { preparation, active, leader, mustered, retained, waiting, remustered };
    });
    expect(result).toEqual({
      preparation:[false, false, false],
      active:[true, true, true],
      leader:true,
      mustered:[true, true],
      retained:[true, true, true],
      waiting:[false, false, false],
      remustered:[true, true, true]
    });
  });

test('campaign passage distinguishes coalition depots, neutral forts, and enemy objectives',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const campaign = FBTEST.makeGreatHolyWar({ capturedCounties:[] });
      s.player.war = null;
      for (const id in s.realms) s.realms[id].war = null;
      const host = { realm:'west_francia', at:'rome', men:1000 };
      function control(pid, realm) {
        s.owner[pid] = realm;
        s.holder[pid] = realm;
        s.buildings[pid] = [{ id:'walls', s:0, level:2 }];
      }
      control('rome', 'italy');
      control('paris', 'papacy');
      control('jerusalem', 'abbasid');
      FB.invalidateRealmCache();
      FB.invalidateFortIndex();
      function view(pid) {
        return {
          friendly:FB.armyFriendlyProvince(s, host, pid),
          blocked:FB.fortBlocksArmy(s, pid, host)
        };
      }
      const ally = view('rome');
      const neutral = view('paris');
      const enemy = view('jerusalem');
      campaign.occupations.jerusalem.occupied = true;
      const captured = view('jerusalem');
      campaign.phase = 'preparation';
      const gathering = view('rome');
      campaign.phase = 'active';
      campaign.leaderRealm = 'player';
      FB.repairGreatHolyWar(s);
      const repairedLeader = campaign.leaderRealm;
      return { ally, neutral, enemy, captured, gathering,
        validLeader:campaign.participants.attackers.some(function (part) {
          return part.realm === repairedLeader && part.sovereign;
        }) };
    });
    expect(result).toEqual({
      ally:{ friendly:true, blocked:false },
      neutral:{ friendly:false, blocked:false },
      enemy:{ friendly:false, blocked:true },
      captured:{ friendly:false, blocked:false },
      gathering:{ friendly:false, blocked:true },
      validLeader:true
    });
  });

test('holy-war armies march on objectives instead of a stronger remote enemy',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      FBTEST.makeGreatHolyWar({
        objectiveCounties:['orleans'], holyCounties:[], capturedCounties:[]
      });
      s.player.war = null;
      for (const id in s.realms) {
        s.realms[id].war = null;
        s.armyDown[id] = s.turn;
      }
      s.owner.paris = s.holder.paris = 'west_francia';
      s.owner.orleans = s.holder.orleans = 'abbasid';
      s.owner.rome = s.holder.rome = 'abbasid';
      s.buildings.paris = [];
      s.buildings.orleans = [];
      s.buildings.rome = [];
      FB.invalidateRealmCache();
      FB.invalidateFortIndex();
      FB.world.adj = { paris:{ orleans:1, rome:1 },
        orleans:{ paris:1 }, rome:{ paris:1 } };
      const host = { id:'campaign-march', realm:'west_francia', at:'paris',
        from:'paris', men:500, size:500, units:{ levy:500 }, supply:100,
        path:[], moveLeft:0, goal:null };
      s.armies = [host, { id:'remote-enemy', realm:'abbasid', at:'rome',
        from:'rome', men:10000, size:10000, units:{ levy:10000 }, supply:100,
        path:[], moveLeft:0, goal:null }];
      FB.armyTick(s);
      return host.goal === 'orleans' || host.at === 'orleans';
    });
    expect(result).toBe(true);
  });

test('completed holy-war occupations damage development once per transition',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The occupation transition runs once against file mode.');
    const result = await page.evaluate(function () {
      const s = FB.state;
      const pid = 'jerusalem';
      const campaign = FBTEST.makeGreatHolyWar({
        phase:'active',
        objectiveCounties:['jerusalem', 'acre', 'damascus'],
        capturedCounties:[]
      });
      campaign.resolve = 0;
      s.dev[pid] = 5;
      s.buildings[pid] = [];
      FB.invalidateFortIndex();
      const occupation = campaign.occupations[pid];
      occupation.fortLevel = 0;
      occupation.progressCamp = 'attackers';
      occupation.progress = FB.greatHolyWarSiegeRequirement(
        s, pid, occupation) - 1;
      s.armies = [{
        id:'occupation-attacker', realm:'west_francia', at:pid, men:10000,
        units:{ levy:10000, arch:0, cav:0, ret:0, mercs:0 }
      }];
      FB.greatHolyWarTick(s);
      const afterOccupation = {
        occupied:occupation.occupied,
        development:s.dev[pid]
      };

      occupation.fortLevel = 0;
      occupation.progressCamp = 'defenders';
      occupation.progress = FB.greatHolyWarSiegeRequirement(
        s, pid, occupation) - 1;
      s.armies = [{
        id:'occupation-defender', realm:'abbasid', at:pid, men:10000,
        units:{ levy:10000, arch:0, cav:0, ret:0, mercs:0 }
      }];
      FB.greatHolyWarTick(s);
      return {
        afterOccupation:afterOccupation,
        afterRecapture:{
          occupied:occupation.occupied,
          development:s.dev[pid]
        }
      };
    });

    expect(result).toEqual({
      afterOccupation:{ occupied:true, development:4 },
      afterRecapture:{ occupied:false, development:3 }
    });
  });

test('preparation, service, succession, renewal, and withdrawal states restore',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The lifecycle state matrix runs once against file mode.');
    const result = await page.evaluate(function () {
      var saved = JSON.parse(FB.save.serialize());
      function reset() {
        FB.save.restore(JSON.parse(JSON.stringify(saved)));
        FB.game.observe = false;
        FB.state.player.piety = 1000;
        FB.state.player.prestige = 1000;
      }
      function roundTrip() {
        var payload = JSON.parse(FB.save.serialize());
        FB.save.restore(JSON.parse(JSON.stringify(payload)));
      }
      function withdrawal(served, mustered, inherited, renew) {
        reset();
        FBTEST.makeGreatHolyWar({
          includePlayer:true,
          phase:'active',
          playerServed:served,
          playerMustered:mustered,
          playerSeasons:4
        });
        if (inherited) FB.greatHolyWarSuccession(FB.state);
        if (renew) FB.renewGreatHolyWarVow(FB.state);
        var cost = FB.greatHolyWarWithdrawalCost(FB.state);
        var before = {
          piety:FB.state.player.piety,
          prestige:FB.state.player.prestige
        };
        var ok = FB.withdrawGreatHolyWar(FB.state);
        roundTrip();
        return {
          ok:ok,
          cost:cost,
          outcome:FB.state.player.greatHolyWar.vowOutcome,
          withdrawn:FB.state.player.greatHolyWar.withdrawn,
          landEligible:FB.state.player.greatHolyWar.landEligible,
          pietyLoss:before.piety - FB.state.player.piety,
          prestigeLoss:before.prestige - FB.state.player.prestige
        };
      }

      reset();
      FBTEST.makeGreatHolyWar({
        includePlayer:true,
        phase:'preparation',
        playerServed:0,
        playerMustered:false,
        playerDesire:{ kind:'county', id:'acre' }
      });
      roundTrip();
      var preparation = {
        phase:FB.state.greatHolyWar.phase,
        desire:FB.state.player.greatHolyWar.vowTerms.desire,
        mustered:FB.state.player.greatHolyWar.vowTerms.mustered
      };

      reset();
      FBTEST.makeGreatHolyWar({
        includePlayer:true,
        phase:'active',
        playerServed:3,
        playerMustered:true
      });
      FB.greatHolyWarSeason(FB.state);
      roundTrip();
      var active = {
        phase:FB.state.greatHolyWar.phase,
        served:FB.state.player.greatHolyWar.vowTerms.served,
        contribution:FB.state.greatHolyWar.contribution.player
      };

      reset();
      FBTEST.makeGreatHolyWar({
        includePlayer:true,
        phase:'active',
        playerServed:4,
        playerMustered:true
      });
      FB.greatHolyWarSuccession(FB.state);
      roundTrip();
      var succession = {
        renewalRequired:FB.state.player.greatHolyWar.renewalRequired,
        vow:FB.state.player.greatHolyWar.vow,
        landEligible:FB.state.player.greatHolyWar.landEligible
      };
      var renewed = FB.renewGreatHolyWarVow(FB.state);
      roundTrip();
      var renewal = {
        result:renewed,
        renewalRequired:FB.state.player.greatHolyWar.renewalRequired,
        vow:FB.state.player.greatHolyWar.vow,
        landEligible:FB.state.player.greatHolyWar.landEligible
      };

      return {
        preparation:preparation,
        active:active,
        succession:succession,
        renewal:renewal,
        fulfilled:withdrawal(4, true, false, false),
        broken:withdrawal(1, true, false, false),
        inherited:withdrawal(4, true, true, false),
        renewed:withdrawal(4, true, true, true)
      };
    });

    expect(result.preparation).toEqual({
      phase:'preparation',
      desire:{ kind:'county', id:'acre' },
      mustered:false
    });
    expect(result.active.phase).toBe('active');
    expect(result.active.served).toBe(4);
    expect(result.active.contribution).toBe(51);
    expect(result.succession).toEqual({
      renewalRequired:true,
      vow:false,
      landEligible:false
    });
    expect(result.renewal).toEqual({
      result:true,
      renewalRequired:false,
      vow:true,
      landEligible:true
    });
    expect(result.fulfilled).toMatchObject({
      ok:true,
      outcome:'fulfilled',
      withdrawn:true,
      landEligible:false,
      pietyLoss:100,
      prestigeLoss:50
    });
    expect(result.fulfilled.cost).toMatchObject({
      fulfilled:true, broken:false, inherited:false
    });
    expect(result.broken).toMatchObject({
      ok:true,
      outcome:'broken',
      withdrawn:true,
      landEligible:false,
      pietyLoss:200,
      prestigeLoss:100
    });
    expect(result.broken.cost).toMatchObject({
      fulfilled:false, broken:true, inherited:false
    });
    expect(result.inherited).toMatchObject({
      ok:true,
      outcome:'declined',
      pietyLoss:0,
      prestigeLoss:0
    });
    expect(result.inherited.cost.inherited).toBe(true);
    expect(result.renewed.outcome).toBe('fulfilled');
  });

test('open, partial, pending, applied, and completed council saves repair cleanly',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The council repair matrix runs once against file mode.');
    const result = await page.evaluate(function () {
      var saved = JSON.parse(FB.save.serialize());
      function reset() {
        FB.save.restore(JSON.parse(JSON.stringify(saved)));
        FB.game.observe = false;
      }
      function roundTrip() {
        var payload = JSON.parse(FB.save.serialize());
        FB.save.restore(JSON.parse(JSON.stringify(payload)));
      }

      reset();
      var openOwnerBefore = FB.state.owner.jerusalem;
      FBTEST.resolveGreatHolyWar({
        includePlayer:true,
        capturedCounties:['jerusalem', 'acre']
      });
      roundTrip();
      var open = {
        status:FB.state.greatHolyWar.settlement.case.status,
        step:FB.state.greatHolyWar.settlement.case.step,
        needsPlayer:FB.greatHolyWarSettlementNeedsPlayer(FB.state),
        ownershipUnchanged:FB.state.owner.jerusalem === openOwnerBefore
      };

      FB.greatHolyWarSettlementMove(
        FB.state, { kind:'acquiesce' });
      roundTrip();
      var partial = {
        status:FB.state.greatHolyWar.settlement.case.status,
        step:FB.state.greatHolyWar.settlement.case.step,
        awards:FB.state.greatHolyWar.settlement.case.awards.length,
        firstMove:FB.state.greatHolyWar.settlement.case.awards[0].move
      };

      reset();
      var pendingCampaign = FBTEST.resolveGreatHolyWar({
        includePlayer:true,
        playerContribution:100,
        playerDesire:{ kind:'crown', id:null },
        attackers:[{
          realm:'west_francia',
          contribution:0,
          desire:{ kind:'honor', id:null }
        }],
        capturedCounties:['acre'],
        defaultOccupiedBy:'player'
      }).campaign;
      FB.greatHolyWarSettlementMove(
        FB.state, { kind:'acquiesce' });
      roundTrip();
      var pending = {
        status:FB.state.greatHolyWar.settlement.case.status,
        pending:FB.state.greatHolyWar.settlement.pendingPlayer,
        needsPlayer:FB.greatHolyWarSettlementNeedsPlayer(FB.state)
      };

      var appliedPayload = JSON.parse(FB.save.serialize());
      appliedPayload.state.greatHolyWar.settlement.applied = true;
      FB.save.restore(appliedPayload);
      var applied = {
        active:FB.state.greatHolyWar,
        history:FB.state.greatHolyWarHistory.campaigns.slice(-1)[0]
      };

      reset();
      FBTEST.resolveGreatHolyWar({
        includePlayer:true,
        playerContribution:100,
        playerDesire:{ kind:'crown', id:null },
        attackers:[{
          realm:'west_francia',
          contribution:0,
          desire:{ kind:'honor', id:null }
        }],
        capturedCounties:['acre'],
        defaultOccupiedBy:'player'
      });
      FB.greatHolyWarSettlementMove(
        FB.state, { kind:'acquiesce' });
      FB.greatHolyWarSettlementChoice(FB.state, true);
      var completedPayload = JSON.parse(FB.save.serialize());
      var beforeRestore = {
        owner:FB.state.owner.acre,
        holder:FB.state.holder.acre,
        history:FB.state.greatHolyWarHistory.campaigns.slice(-1)[0]
      };
      FB.save.restore(JSON.parse(JSON.stringify(completedPayload)));
      var completed = {
        active:FB.state.greatHolyWar,
        owner:FB.state.owner.acre,
        holder:FB.state.holder.acre,
        history:FB.state.greatHolyWarHistory.campaigns.slice(-1)[0]
      };

      reset();
      var legacyCampaign = FBTEST.makeGreatHolyWar({
        includePlayer:true,
        phase:'settlement',
        capturedCounties:['acre']
      });
      legacyCampaign.result = {
        outcome:'attackers', reason:'legacy', turn:FB.state.turn
      };
      legacyCampaign.settlement = {
        schema:1,
        captured:['acre'],
        pendingPlayer:{
          sovereign:true,
          rank:1,
          kind:'county',
          counties:['acre'],
          share:1
        }
      };
      roundTrip();
      var legacy = {
        active:!!FB.state.greatHolyWar,
        legacy:FB.state.greatHolyWar.settlement.legacy,
        pending:FB.state.greatHolyWar.settlement.pendingPlayer.kind
      };

      return {
        open:open,
        partial:partial,
        pending:pending,
        applied:applied,
        beforeRestore:beforeRestore,
        completed:completed,
        legacy:legacy,
        pendingCampaignId:pendingCampaign.id
      };
    });

    expect(result.open).toEqual({
      status:'open', step:0, needsPlayer:true, ownershipUnchanged:true
    });
    expect(result.partial).toEqual({
      status:'open', step:1, awards:1, firstMove:'acquiesce'
    });
    expect(result.pending.status).toBe('resolved');
    expect(result.pending.pending).toMatchObject({
      sovereign:true,
      kind:'county',
      counties:['acre']
    });
    expect(result.pending.needsPlayer).toBe(true);
    expect(result.applied.active).toBeNull();
    expect(result.applied.history.id).toBe(result.pendingCampaignId);
    expect(result.completed).toEqual({
      active:null,
      owner:result.beforeRestore.owner,
      holder:result.beforeRestore.holder,
      history:result.beforeRestore.history
    });
    expect(result.legacy).toEqual({
      active:true,
      legacy:true,
      pending:'county'
    });
  });

test('a partially decided council reloads from a real storage slot',
  async function ({ page }, testInfo) {
    test.skip(!testInfo.project.name.endsWith('-served'),
      'Origin-backed localStorage is required for this reload contract.');
    await page.evaluate(function () {
      FBTEST.resolveGreatHolyWar({
        includePlayer:true,
        capturedCounties:['jerusalem', 'acre']
      });
      FB.greatHolyWarSettlementMove(
        FB.state, { kind:'acquiesce' });
      if (!FB.save.toSlot(1)) throw new Error('Could not write test slot');
      FB.state.greatHolyWar.settlement.case.step = 0;
      FB.state.greatHolyWar.settlement.case.awards = [];
      FB.game.loadSlot(1);
    });

    await expect.poll(function () {
      return page.evaluate(function () {
        var campaign = FB.state && FB.state.greatHolyWar;
        var settlementCase = campaign && campaign.settlement &&
          campaign.settlement.case;
        return settlementCase && {
          step:settlementCase.step,
          awards:settlementCase.awards.length
        };
      });
    }).toEqual({ step:1, awards:1 });

    await page.evaluate(function () {
      FB.game.passDay();
    });
    await expect(page.getByRole('heading', {
      name:/Settlement council/
    })).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Prior awards', {
      exact:true
    })).toBeVisible();
    expect(await page.evaluate(function () {
      var settlementCase = FB.state.greatHolyWar.settlement.case;
      return {
        step:settlementCase.step,
        awards:settlementCase.awards.length,
        needsPlayer:FB.greatHolyWarSettlementNeedsPlayer(FB.state)
      };
    })).toEqual({ step:1, awards:1, needsPlayer:true });
  });
