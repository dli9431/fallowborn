'use strict';

const { test, expect } = require('../support/fixture');
const { openGame, startDeterministicGame } = require('../support/game');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('adds five context-gated plots without adding another plot slot',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const home = FB.world.byId[p.provinceId];
      const rival = FB.makeCharacter(s, {
        name:'Political Rival',
        sex:'m',
        culture:home.culture,
        religion:home.religion,
        born:s.date.year - 32,
        station:2,
        quality:2,
        opinion:-60
      });
      rival.restorationRight = {
        realmId:Object.keys(s.realms).filter(function (id) {
          return id !== 'player' && s.realms[id] && s.realms[id].alive;
        })[0],
        titleName:'A Lost Crown',
        rank:3,
        createdTurn:s.turn
      };
      s.roles.rival = rival.id;
      p.rivalry = {
        heat:40, startedTurn:s.turn, lastMoveTurn:s.turn,
        initiator:'npc', cause:'test'
      };
      p.guildMonopolies = {
        incoming:{
          contractId:'guild_monopoly:incoming:0:merchant',
          profession:'merchant',
          grantorKind:'local',
          grantorId:null,
          grantorName:'Local Lord',
          grantorRulerName:'Local Lord',
          recipientKind:'household',
          scope:'province',
          scopeId:p.provinceId,
          tier:3,
          years:2,
          durationDays:720,
          startTurn:s.turn,
          endTurn:s.turn + 720,
          enterpriseBonus:0.1,
          rulerFee:20,
          taxBonus:0.05,
          popularOpinion:-5
        },
        outgoing:null
      };
      p.tier = 2;
      const available = FB.plotAvailable(s).map(function (entry) {
        return entry.id;
      });
      const ids = Object.keys(FBDATA.plots);
      return {
        count:ids.length,
        newIds:[
          'feudal_obligation',
          'guild_monopoly',
          'council_counter',
          'diplomatic_correspondence',
          'rival_claimant'
        ].filter(function (id) { return !!FBDATA.plots[id]; }),
        available:available,
        rivalContext:FB.plotTargetOptions(
          s, FBDATA.plots.rival_claimant
        )[0].context,
        guildContext:FB.plotTargetOptions(
          s, FBDATA.plots.guild_monopoly
        )[0].context,
        plotFieldCount:Object.keys(p).filter(function (key) {
          return key === 'plot' || key === 'plots';
        }).length,
        hasIntrigueResource:Object.prototype.hasOwnProperty.call(p, 'intrigue')
      };
    });

    expect(result.count).toBeGreaterThanOrEqual(12);
    expect(result.newIds).toEqual([
      'feudal_obligation',
      'guild_monopoly',
      'council_counter',
      'diplomatic_correspondence',
      'rival_claimant'
    ]);
    expect(result.available).toContain('guild_monopoly');
    expect(result.available).toContain('rival_claimant');
    expect(result.available).not.toContain('feudal_obligation');
    expect(result.available).not.toContain('council_counter');
    expect(result.available).not.toContain('diplomatic_correspondence');
    expect(result.rivalContext.characterId).toBeTruthy();
    expect(result.rivalContext.contractId)
      .toMatch(/^restoration_right:\d+$/);
    expect(result.guildContext.contractId)
      .toBe('guild_monopoly:incoming:0:merchant');
    expect(result.plotFieldCount).toBe(1);
    expect(result.hasIntrigueResource).toBe(false);
  });

test('stores a semantic realm target through export and fails safely when it dies',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const priorFocus = p.focus;
      p.tier = 4;
      p.liege = null;
      p.provs = [p.provinceId];
      FB.foundPlayerRealm(s);
      const rid = FB.foreignPolicyTargets(s)[0];
      FB.beginPlot(s, 'diplomatic_correspondence', { realmId:rid });
      const begun = JSON.parse(JSON.stringify(p.plot));
      const exported = JSON.parse(FB.save.serialize());
      FB.save.restore(exported);
      const restored = JSON.parse(JSON.stringify(FB.state.player.plot));
      FB.state.realms[rid].alive = false;
      const scheming = FB.focuses.filter(function (focus) {
        return focus.id === 'scheming';
      })[0];
      scheming.tick(FB.state);
      const last = FB.state.log[FB.state.log.length - 1];
      return {
        rid:rid,
        priorFocus:priorFocus,
        begun:begun,
        restored:restored,
        plotAfterLoss:FB.state.player.plot,
        focusAfterLoss:FB.state.player.focus,
        lastKey:last && last.msg && last.msg.key
      };
    });

    expect(result.rid).toBeTruthy();
    expect(result.begun.context).toEqual({ realmId:result.rid });
    expect(result.restored).toEqual(result.begun);
    expect(result.begun.id).toBe('diplomatic_correspondence');
    expect(result.begun.power).toBe(0);
    expect(result.plotAfterLoss).toBeNull();
    expect(result.focusAfterLoss).toBe(result.priorFocus);
    expect(result.lastKey).toBe('news.action.plot_semantic_target_lost');
  });

test('contract and institution target changes never silently retarget a plot',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      p.guildMonopolies = {
        incoming:{
          contractId:'guild_monopoly:incoming:0:craftsman',
          profession:'craftsman',
          grantorKind:'local',
          grantorId:null,
          grantorName:'Local Lord',
          grantorRulerName:'Local Lord',
          recipientKind:'household',
          scope:'province',
          scopeId:p.provinceId,
          tier:3,
          years:1,
          durationDays:360,
          startTurn:s.turn,
          endTurn:s.turn + 360,
          enterpriseBonus:0.1,
          rulerFee:10,
          taxBonus:0.05,
          popularOpinion:-4
        },
        outgoing:null
      };
      const context = FB.plotTargetOptions(
        s, FBDATA.plots.guild_monopoly
      )[0].context;
      FB.beginPlot(s, 'guild_monopoly', context);
      const exactBefore = FB.plotTargetValid(
        s, FBDATA.plots.guild_monopoly, p.plot.context
      );
      const queuedContext = {
        plotId:'guild_monopoly',
        contractId:p.plot.context.contractId
      };
      const queuedBefore = FB.fns.plot_event_context_valid(s, queuedContext);
      p.guildMonopolies.incoming = {
        contractId:'guild_monopoly:incoming:1:craftsman',
        profession:'craftsman',
        grantorKind:'local',
        grantorId:null,
        grantorName:'Another Lord',
        grantorRulerName:'Another Lord',
        recipientKind:'household',
        scope:'province',
        scopeId:p.provinceId,
        tier:3,
        years:1,
        durationDays:360,
        startTurn:s.turn + 1,
        endTurn:s.turn + 361,
        enterpriseBonus:0.1,
        rulerFee:10,
        taxBonus:0.05,
        popularOpinion:-4
      };
      const exactAfter = FB.plotTargetValid(
        s, FBDATA.plots.guild_monopoly, p.plot.context
      );
      const queuedAfter = FB.fns.plot_event_context_valid(s, queuedContext);
      const scheming = FB.focuses.filter(function (focus) {
        return focus.id === 'scheming';
      })[0];
      scheming.tick(s);
      const lieges = Object.keys(s.realms).filter(function (id) {
        return id !== 'player' && s.realms[id] && s.realms[id].alive;
      }).slice(0, 2);
      p.tier = 3;
      p.liege = lieges[0];
      const obligation = FB.plotTargetOptions(
        s, FBDATA.plots.feudal_obligation
      )[0].context;
      FB.beginPlot(s, 'feudal_obligation', obligation);
      const obligationBefore = FB.plotTargetValid(
        s, FBDATA.plots.feudal_obligation, p.plot.context
      );
      p.prestige = 0;
      s.chars[p.charId].skills.dip = 0;
      const ordinaryWithoutEvidence = FB.namedChance(s, 'parliament_vote');
      const redressWithoutEvidence = FB.namedChance(
        s, 'parliament_redress_vote'
      );
      p.flags.plot_obligation_evidence = {
        realmId:obligation.realmId,
        institution:obligation.institution,
        contractId:obligation.contractId
      };
      const ordinaryWithEvidence = FB.namedChance(s, 'parliament_vote');
      const redressWithEvidence = FB.namedChance(
        s, 'parliament_redress_vote'
      );
      p.liege = lieges[1];
      const obligationAfter = FB.plotTargetValid(
        s, FBDATA.plots.feudal_obligation, p.plot.context
      );
      return {
        context:context,
        exactBefore:exactBefore,
        exactAfter:exactAfter,
        guildPlotAfterTick:p.plot && p.plot.id === 'guild_monopoly',
        replacement:p.guildMonopolies.incoming.contractId,
        queuedBefore:queuedBefore,
        queuedAfter:queuedAfter,
        obligation:obligation,
        obligationBefore:obligationBefore,
        obligationAfter:obligationAfter,
        ordinaryEvidenceDelta:ordinaryWithEvidence - ordinaryWithoutEvidence,
        redressEvidenceDelta:redressWithEvidence - redressWithoutEvidence
      };
    });

    expect(result.context.contractId)
      .toBe('guild_monopoly:incoming:0:craftsman');
    expect(result.exactBefore).toBe(true);
    expect(result.exactAfter).toBe(false);
    expect(result.guildPlotAfterTick).toBe(false);
    expect(result.replacement).toBe('guild_monopoly:incoming:1:craftsman');
    expect(result.queuedBefore).toBe(true);
    expect(result.queuedAfter).toBe(false);
    expect(result.obligation.institution).toBe('estates');
    expect(result.obligationBefore).toBe(true);
    expect(result.obligationAfter).toBe(false);
    expect(result.ordinaryEvidenceDelta).toBe(0);
    expect(result.redressEvidenceDelta).toBeCloseTo(0.15, 5);
  });

test('fixed RNG states reproduce plot success, failure, and discovery rolls',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const home = FB.world.byId[p.provinceId];
      const rival = FB.makeCharacter(s, {
        name:'Deterministic Rival',
        sex:'f',
        culture:home.culture,
        religion:home.religion,
        born:s.date.year - 30,
        station:2,
        quality:2,
        opinion:-50
      });
      rival.restorationRight = {
        realmId:Object.keys(s.realms).filter(function (id) {
          return id !== 'player' && s.realms[id] && s.realms[id].alive;
        })[0],
        titleName:'Test Right',
        rank:3,
        createdTurn:s.turn
      };
      s.roles.rival = rival.id;
      p.rivalry = {
        heat:40, startedTurn:s.turn, lastMoveTurn:s.turn,
        initiator:'npc', cause:'test'
      };
      p.tier = 2;
      FB.beginPlot(s, 'rival_claimant', { characterId:rival.id,
        realmId:rival.restorationRight.realmId,
        contractId:'restoration_right:' + rival.restorationRight.createdTurn });
      const plotChance = FB.namedChance(s, 'plot');
      const discoveryChance = FB.namedChance(s, 'plot_discovery');

      function seedFor(chance, wanted) {
        for (let seed = 1; seed < 10000; seed++) {
          FB.setRngState(seed);
          if (FB.chance(chance) === wanted) return seed;
        }
        return null;
      }
      function twice(seed, chance) {
        FB.setRngState(seed);
        const first = FB.chance(chance);
        FB.setRngState(seed);
        const second = FB.chance(chance);
        return [first, second];
      }
      const successSeed = seedFor(plotChance, true);
      const failureSeed = seedFor(plotChance, false);
      const discoverySeed = seedFor(discoveryChance, true);
      return {
        plotChance:plotChance,
        discoveryChance:discoveryChance,
        success:twice(successSeed, plotChance),
        failure:twice(failureSeed, plotChance),
        discovery:twice(discoverySeed, discoveryChance)
      };
    });

    expect(result.plotChance).toBeGreaterThanOrEqual(0.15);
    expect(result.discoveryChance).toBe(0.35);
    expect(result.success).toEqual([true, true]);
    expect(result.failure).toEqual([false, false]);
    expect(result.discovery).toEqual([true, true]);
  });

test('diplomatic selectors bind the correct direction, pact, alliance, and generation',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      p.tier = 6;
      p.liege = null;
      p.provs = [p.provinceId];
      FB.foundPlayerRealm(s);
      const targets = FB.foreignPolicyTargets(s).slice(0, 2);
      FB.setForeignPolicy(s, targets[0], 1);
      FB.setForeignPolicy(s, targets[1], -1);
      s.pacts = s.pacts || {};
      s.pacts[targets[0]] = s.turn + 360;
      for (const realmId in s.realms) {
        const realm = s.realms[realmId];
        if (realmId === targets[1] || realmId === 'player' ||
            (realm && realm.war &&
              (realm.war.enemy === targets[1] ||
                realm.war.enemy === 'player'))) {
          realm.war = null;
        }
      }
      const allianceFormed = FB.formAlliance(
        s, 'player', targets[1], 'test'
      );
      const improve = FB.eventContextOptions(s, 'foreign_policy_improve');
      const provoke = FB.eventContextOptions(s, 'foreign_policy_provoke');
      const pact = FB.eventContextOptions(s, 'active_pact');
      const alliance = FB.eventContextOptions(s, 'active_alliance');
      const pactEvent = FB.eventById('diplomacy_pact_renewal');
      const pendingPactBefore = FB.eventContextStillValid(
        s, pactEvent, FB.eventContext(s, pact[0])
      );
      const pactEnd = s.pacts[targets[0]];
      delete s.pacts[targets[0]];
      const pendingPactAfter = FB.eventContextStillValid(
        s, pactEvent, FB.eventContext(s, pact[0])
      );
      s.pacts[targets[0]] = pactEnd;
      FB.adjustStanding(s, { kind:'realm', id:targets[1] }, 55,
        'test:predecessor');
      const oldGeneration = FB.realmRulerGeneration(s, targets[1]);
      const oldChance = FBDATA.balance.diplomacySuccessionChance;
      FBDATA.balance.diplomacySuccessionChance = 1;
      FB.advanceRealmSuccession(s, targets[1]);
      FBDATA.balance.diplomacySuccessionChance = oldChance;
      const queued = s.eventQueue.filter(function (item) {
        return item.id === 'diplomacy_succession_compact' &&
          item.ctx.realmId === targets[1];
      })[0];
      const validBefore = FB.fns.diplomacy_succession_valid(s, queued.ctx);
      s.realms[targets[1]].ruler.generation++;
      const validAfter = FB.fns.diplomacy_succession_valid(s, queued.ctx);
      return {
        targets:targets,
        allianceFormed:allianceFormed,
        improve:improve,
        provoke:provoke,
        pact:pact,
        alliance:alliance,
        oldGeneration:oldGeneration,
        queued:queued,
        alliedAfterSuccession:FB.areAllied(s, 'player', targets[1]),
        standingAfterSuccession:FB.standingOf(s, {
          kind:'realm', id:targets[1]
        }),
        validBefore:validBefore,
        validAfter:validAfter,
        pendingPactBefore:pendingPactBefore,
        pendingPactAfter:pendingPactAfter,
        hasOpinionMatrix:Object.prototype.hasOwnProperty.call(s, 'realmOpinions')
      };
    });

    expect(result.targets).toHaveLength(2);
    expect(result.allianceFormed).toBe(true);
    expect(result.improve).toEqual([{ realmId:result.targets[0] }]);
    expect(result.provoke).toEqual([{ realmId:result.targets[1] }]);
    expect(result.pact[0].realmId).toBe(result.targets[0]);
    expect(result.alliance[0].realmId).toBe(result.targets[1]);
    expect(result.queued.id).toBe('diplomacy_succession_compact');
    expect(result.queued.ctx.rulerGeneration).toBe(result.oldGeneration + 1);
    expect(result.queued.ctx.formerAlliance).toBe('yes');
    expect(result.alliedAfterSuccession).toBe(false);
    expect(result.standingAfterSuccession).toBe(0);
    expect(result.validBefore).toBe(true);
    expect(result.validAfter).toBe(false);
    expect(result.pendingPactBefore).toBe(true);
    expect(result.pendingPactAfter).toBe(false);
    expect(result.hasOpinionMatrix).toBe(false);
  });

test('diplomatic data covers all four families and writes locale-neutral results',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      p.tier = 4;
      p.liege = null;
      p.provs = [p.provinceId];
      p.gold = 100;
      FB.foundPlayerRealm(s);
      const rid = FB.foreignPolicyTargets(s)[0];
      const other = FB.foreignPolicyTargets(s).filter(function (id) {
        return id !== rid;
      })[0];
      FB.applyEffects(s, { standingRealm:11 }, { realmId:rid }, {
        id:'test_diplomatic_effect'
      });
      const untouched = FB.standingOf(s, { kind:'realm', id:other });
      FB.fns.diplomacy_make_pact(s, { realmId:rid });
      const last = s.log[s.log.length - 1];
      const ids = [
        'diplomacy_border_arbitration',
        'diplomacy_safe_conduct',
        'diplomacy_warm_opening',
        'diplomacy_insulted_envoy',
        'diplomacy_disputed_tolls',
        'diplomacy_border_riders',
        'diplomacy_pact_safe_conduct',
        'diplomacy_pact_renewal',
        'diplomacy_alliance_subsidy',
        'diplomacy_alliance_concession',
        'diplomacy_succession_embassy',
        'diplomacy_succession_compact'
      ];
      return {
        definitions:ids.map(function (id) {
          const ev = FB.eventById(id);
          return {
            id:id,
            selector:ev && ev.contextSelector || null,
            validator:ev && ev.contextValidator || null,
            cooldown:ev && ev.cooldown || null
          };
        }),
        targetStanding:FB.standingOf(s, { kind:'realm', id:rid }),
        untouched:untouched,
        pactEnd:s.pacts[rid],
        logKey:last && last.msg && last.msg.key,
        legacyText:last && Object.prototype.hasOwnProperty.call(last, 't')
      };
    });

    expect(result.definitions).toHaveLength(12);
    expect(result.definitions.slice(0, 10).every(function (row) {
      return !!row.selector && row.cooldown >= 12;
    })).toBe(true);
    expect(result.definitions.slice(10).every(function (row) {
      return row.validator === 'diplomacy_succession_valid';
    })).toBe(true);
    expect(result.targetStanding).toBe(11);
    expect(result.untouched).toBe(0);
    expect(result.pactEnd).toBeGreaterThan(0);
    expect(result.logKey).toBe('news.diplomacy.pact_made');
    expect(result.legacyText).toBe(false);
  });

test('visible and autoresolved diplomatic choices apply the same authoritative effects',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      p.tier = 4;
      p.liege = null;
      p.provs = [p.provinceId];
      p.gold = 100;
      FB.foundPlayerRealm(s);
      const rid = FB.foreignPolicyTargets(s)[0];
      FB.setForeignPolicy(s, rid, 1);
      const ev = FB.eventById('diplomacy_border_arbitration');
      const ctx = FB.eventContext(s, { realmId:rid });
      const payload = JSON.parse(FB.save.serialize());
      const oldAuto = FB.game.auto;
      FB.game.auto = { all:true, style:'first' };
      FB.ui.runEvents([{ id:ev.id, ctx:ctx, rnd:true }]);
      const automated = {
        gold:FB.state.player.gold,
        prestige:FB.state.player.prestige,
        standing:FB.standingOf(FB.state, { kind:'realm', id:rid })
      };
      FB.save.restore(payload);
      FB.applyEffects(FB.state, ev.options[0].effects, ctx, ev);
      const visible = {
        gold:FB.state.player.gold,
        prestige:FB.state.player.prestige,
        standing:FB.standingOf(FB.state, { kind:'realm', id:rid })
      };
      FB.game.auto = oldAuto;
      return { automated:automated, visible:visible };
    });

    expect(result.automated).toEqual(result.visible);
  });

test('plot target picker shows realm cards and starts the exact selected plot',
  async function ({ page }) {
    const setup = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      p.tier = 4;
      p.liege = null;
      p.provs = [p.provinceId];
      FB.foundPlayerRealm(s);
      FB.ui.refresh();
      FB.ui.showPlotTargets('diplomatic_correspondence');
      return {
        first:FB.plotTargetOptions(
          s, FBDATA.plots.diplomatic_correspondence
        )[0].context.realmId
      };
    });

    await expect(page.locator('#gm-title')).toHaveText('Choose the Target');
    await expect(page.locator('#gm-body .realmcard').first()).toBeVisible();
    await expect(page.locator('[data-plot-target]').first()).toBeVisible();
    await page.locator('[data-plot-target]').first().focus();
    await expect(page.locator('[data-plot-target]').first()).toBeFocused();
    await page.locator('[data-plot-target]').first().click();

    const plot = await page.evaluate(function () {
      return FB.state.player.plot;
    });
    expect(plot.id).toBe('diplomatic_correspondence');
    expect(plot.context).toEqual({ realmId:setup.first });
  });
