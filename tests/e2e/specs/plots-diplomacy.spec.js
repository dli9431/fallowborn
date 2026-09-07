'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/actions.js',
  'data/map_data.js',
  'js/model.js',
  'js/world.js',
  'js/events.js',
  'js/actions.js',
  'js/intrigue.js',
  'js/ui_modals.js',
  'data/intrigue.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

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

test('plot target discovery does not form Estates or Council state',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const liegeId = Object.keys(s.realms).filter(function (id) {
        return id !== 'player' && s.realms[id] && s.realms[id].alive;
      })[0];
      p.tier = 3;
      p.liege = liegeId;
      delete s.realms[liegeId].obl;
      const estatesBefore = {
        state:JSON.stringify(s),
        rng:FB.getRngState(),
        uid:FB.getUidCounter()
      };
      const obligationTargets = FB.plotTargetOptions(
        s, FBDATA.plots.feudal_obligation
      );
      const estatesAfter = {
        state:JSON.stringify(s),
        rng:FB.getRngState(),
        uid:FB.getUidCounter(),
        formed:Object.prototype.hasOwnProperty.call(
          s.realms[liegeId], 'obl'
        )
      };

      p.tier = 6;
      p.liege = null;
      delete s.council;
      const councilBefore = {
        state:JSON.stringify(s),
        rng:FB.getRngState(),
        uid:FB.getUidCounter()
      };
      const councilTargets = FB.plotTargetOptions(
        s, FBDATA.plots.council_counter
      );
      const councilAfter = {
        state:JSON.stringify(s),
        rng:FB.getRngState(),
        uid:FB.getUidCounter(),
        formed:Object.prototype.hasOwnProperty.call(s, 'council')
      };
      return {
        obligationTargets:obligationTargets,
        estatesBefore:estatesBefore,
        estatesAfter:estatesAfter,
        councilTargets:councilTargets,
        councilBefore:councilBefore,
        councilAfter:councilAfter
      };
    });

    expect(result.obligationTargets).toHaveLength(1);
    expect(result.estatesAfter.state).toBe(result.estatesBefore.state);
    expect(result.estatesAfter.rng).toBe(result.estatesBefore.rng);
    expect(result.estatesAfter.uid).toBe(result.estatesBefore.uid);
    expect(result.estatesAfter.formed).toBe(false);
    expect(result.councilTargets).toEqual([]);
    expect(result.councilAfter.state).toBe(result.councilBefore.state);
    expect(result.councilAfter.rng).toBe(result.councilBefore.rng);
    expect(result.councilAfter.uid).toBe(result.councilBefore.uid);
    expect(result.councilAfter.formed).toBe(false);
  });

test('stores a semantic realm target through export and fails safely when it dies',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      p.tier = 4;
      p.liege = null;
      p.provs = [p.provinceId];
      FB.foundPlayerRealm(s);
      FB.validateFocus(s);
      const priorFocus = p.focus;
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
    /* The predecessor's cultivated +55 does not survive succession; the heir
       reigns with their own seeded court disposition, rolled in -5..20. */
    expect(result.standingAfterSuccession).toBeGreaterThanOrEqual(-5);
    expect(result.standingAfterSuccession).toBeLessThanOrEqual(20);
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
      const targetBefore = FB.standingOf(s, { kind:'realm', id:rid });
      const untouchedBefore = FB.standingOf(s, { kind:'realm', id:other });
      FB.applyEffects(s, { standingRealm:11 }, { realmId:rid }, {
        id:'test_diplomatic_effect'
      });
      const targetAfter = FB.standingOf(s, { kind:'realm', id:rid });
      const untouchedAfter = FB.standingOf(s, { kind:'realm', id:other });
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
        targetStandingChange:targetAfter - targetBefore,
        untouchedStandingChange:untouchedAfter - untouchedBefore,
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
    expect(result.targetStandingChange).toBe(11);
    expect(result.untouchedStandingChange).toBe(0);
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
      p.roleOrientationsSeen = p.roleOrientationsSeen || {};
      p.roleOrientationsSeen['role-tier-' + p.tier] = 1;
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


test('dynastic ties require living weddings, do not stack, and follow current families', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    const rid = Object.keys(s.realms).find(function (id) { return id !== 'player' && s.realms[id].alive && !s.realms[id].liege; });
    FB.ensureRealmCourtForDisplay(s, rid);
    const ruler = FB.materializeRealmRuler(s, rid);
    function child(parent, sex, name) {
      const c = FB.makeCharacter(s, { name:name, sex:sex, born:s.date.year - 20,
        culture:me.culture, religion:me.religion, station:2 });
      c.fatherId = parent.id;
      parent.childrenIds = (parent.childrenIds || []).concat(c.id);
      return c;
    }
    const a = child(me, 'm', 'Tie Son'), b = child(ruler, 'f', 'Tie Daughter');
    a.betrothedId = b.id; b.betrothedId = a.id;
    FB.touchFamily();
    const pledged = FB.dynasticAllianceTieSnapshot(s, rid).qualifying;
    a.betrothedId = null; b.betrothedId = null;
    a.spouseId = b.id; b.spouseId = a.id; FB.touchFamily();
    const wedding = FB.dynasticAllianceTieSnapshot(s, rid);
    const c = child(me, 'm', 'Second Son'), d = child(ruler, 'f', 'Second Daughter');
    c.spouseId = d.id; d.spouseId = c.id; FB.touchFamily();
    const multiple = FB.dynasticAllianceTieSnapshot(s, rid);
    const restored = FB.dynasticAllianceTieSnapshot(JSON.parse(JSON.stringify(s)), rid);
    b.dead = true; d.dead = true; FB.touchFamily();
    const death = FB.dynasticAllianceTieSnapshot(s, rid).qualifying;
    b.dead = false; d.dead = false;
    a.spouseId = null; b.spouseId = null; c.spouseId = null; d.spouseId = null; FB.touchFamily();
    const divorce = FB.dynasticAllianceTieSnapshot(s, rid).qualifying;
    a.spouseId = b.id; b.spouseId = a.id; FB.touchFamily();
    s.player.charId = c.id;
    const playerSuccession = FB.dynasticAllianceTieSnapshot(s, rid).qualifying;
    const replacement = child({ id:'unrelated', childrenIds:[] }, 'm', 'Replacement House');
    s.realms[rid].succession.members[s.realms[rid].succession.rulerMemberId].charId = replacement.id;
    const replacementTie = FB.dynasticAllianceTieSnapshot(s, rid).qualifying;
    return { pledged:pledged, wedding:wedding, multiple:multiple, restored:restored,
      death:death, divorce:divorce, playerSuccession:playerSuccession, replacement:replacementTie };
  });
  expect(result.pledged).toBe(false);
  expect(result.wedding.qualifying).toBe(true);
  expect(result.wedding.bonus).toBe(0.15);
  expect(result.multiple.marriages).toHaveLength(2);
  expect(result.multiple.bonus).toBe(0.15);
  expect(result.restored.bonus).toBe(0.15);
  expect(result.death).toBe(false);
  expect(result.divorce).toBe(false);
  expect(result.playerSuccession).toBe(true);
  expect(result.replacement).toBe(false);
});

test('alliance offers use their displayed final chance and retain diplomatic gates', async function ({ page }) {
  const setup = await page.evaluate(function () {
    const s = FB.state, p = s.player;
    p.tier = 6; p.liege = null; p.provs = [p.provinceId]; p.gold = 1000; p.prestige = 0;
    FB.foundPlayerRealm(s);
    const rid = Object.keys(s.realms).find(function (id) {
      return id !== 'player' && s.realms[id].alive && !s.realms[id].liege && FB.realmsAdjacent(s, 'player', id);
    });
    const r = s.realms[rid]; r.rank = 3;
    for (const id in s.realms) s.realms[id].war = null;
    s.alliances = [];
    FB.adjustStanding(s, { kind:'realm', id:rid }, 60 - FB.standingOf(s, { kind:'realm', id:rid }), 'test');
    FB.ensureRealmCourtForDisplay(s, rid);
    const ruler = FB.materializeRealmRuler(s, rid), me = s.chars[p.charId];
    const a = FB.makeCharacter(s, { name:'Alliance Son', sex:'m', born:s.date.year - 20, culture:me.culture, religion:me.religion });
    const b = FB.makeCharacter(s, { name:'Alliance Daughter', sex:'f', born:s.date.year - 20, culture:me.culture, religion:me.religion });
    a.fatherId = me.id; b.fatherId = ruler.id;
    a.spouseId = b.id; b.spouseId = a.id; FB.touchFamily();
    const peace = FB.envoyChance(s, rid), status = FB.allianceOfferStatus(s, rid);
    p.prestige = 10000;
    const ceiling = FB.allianceOfferStatus(s, rid).chance;
    p.prestige = 0;
    p.gold = 0; const poor = FB.allianceOfferStatus(s, rid); p.gold = 1000;
    FB.adjustStanding(s, { kind:'realm', id:rid }, -1, 'test');
    const standing = FB.allianceOfferStatus(s, rid);
    FB.adjustStanding(s, { kind:'realm', id:rid }, 1, 'test');
    r.liege = 'player'; const vassal = FB.allianceOfferStatus(s, rid); r.liege = null;
    p.tier = 2; const rank = FB.allianceOfferStatus(s, rid); p.tier = 6;
    r.war = { enemy:'player' }; const war = FB.allianceOfferStatus(s, rid); r.war = null;
    FB.ui.showEnvoys(rid);
    window.allianceTestRealm = rid;
    return { rid:rid, chance:status.chance, base:status.baseChance, peace:peace,
      ready:status.ready, ceiling:ceiling,
      gates:[poor, standing, vassal, rank, war].map(function (x) { return !x.ready && !!x.reason; }) };
  });
  expect(setup.ready).toBe(true);
  expect(setup.chance).toBe(Math.min(0.9, setup.base + 0.15));
  expect(setup.base).toBe(setup.peace);
  expect(setup.ceiling).toBe(0.9);
  expect(setup.gates).toEqual([true, true, true, true, true]);
  await expect(page.locator('[data-alliance-offer="' + setup.rid + '"]')).toContainText(String(Math.round(setup.chance * 100)) + '%');
  const resolution = await page.evaluate(function () {
    const s = FB.state, rid = window.allianceTestRealm;
    const original = FB.chance;
    let used = null;
    FB.chance = function (chance) { used = chance; return false; };
    const gold = s.player.gold;
    try {
      FB.offerAlliance(s, rid);
      const spent = gold - s.player.gold;
      FB.formAlliance(s, 'player', rid, 'envoy');
      const blocked = !FB.allianceOfferStatus(s, rid).ready;
      const tie = FB.dynasticAllianceTieSnapshot(s, rid).marriages[0];
      s.chars[tie.subjectId].spouseId = null; s.chars[tie.partnerId].spouseId = null;
      FB.touchFamily();
      return { used:used, spent:spent, blocked:blocked,
        retained:FB.areAlliedSnapshot(s, 'player', rid), bonus:FB.dynasticAllianceTieSnapshot(s, rid).bonus };
    } finally { FB.chance = original; }
  });
  expect(resolution.used).toBe(setup.chance);
  expect(resolution.spent).toBe(25);
  expect(resolution.blocked).toBe(true);
  expect(resolution.retained).toBe(true);
  expect(resolution.bonus).toBe(0);
});


test('close-family eligibility includes every generation and excludes cousins and sibling unions', async function ({ page }) {
  const result = await page.evaluate(function () {
    const original = FB.state;
    const rid = Object.keys(original.realms).find(function (id) { return original.realms[id].alive && id !== 'player'; });
    function sample(left, right, exceptional) {
      const s = Object.assign({}, original, { chars:{}, roles:{},
        player:Object.assign({}, original.player, { charId:'tie-me' }),
        realms:Object.assign({}, original.realms) });
      function person(id) { return s.chars[id] = { id:id, childrenIds:[], born:800 }; }
      const me = person('tie-me'), ruler = person('tie-ruler');
      s.realms[rid] = Object.assign({}, original.realms[rid], { succession:{
        rulerMemberId:'root', members:{ root:{ id:'root', charId:ruler.id, alive:true } }
      } });
      function relative(root, kind) {
        if (kind === 'self') return root;
        const c = person(root.id + '-relative'), parent = person(root.id + '-parent');
        if (kind === 'parent') root.fatherId = c.id;
        if (kind === 'grandparent') { root.fatherId = parent.id; parent.fatherId = c.id; }
        if (kind === 'sibling') { root.fatherId = parent.id; c.fatherId = parent.id; }
        if (kind === 'child') c.fatherId = root.id;
        if (kind === 'grandchild') { parent.fatherId = root.id; c.fatherId = parent.id; }
        if (kind === 'cousin') {
          const uncle = person(root.id + '-uncle'), grand = person(root.id + '-grand');
          root.fatherId = parent.id; parent.fatherId = grand.id;
          uncle.fatherId = grand.id; c.fatherId = uncle.id;
        }
        return c;
      }
      const a = relative(me, left), b = relative(ruler, right);
      if (exceptional) { a.motherId = 'shared-mother'; b.motherId = 'shared-mother'; }
      a.spouseId = b.id; b.spouseId = a.id;
      FB.touchFamily();
      return FB.dynasticAllianceTieSnapshot(s, rid).qualifying;
    }
    const kinds = ['self', 'parent', 'grandparent', 'sibling', 'child', 'grandchild'];
    const included = [];
    kinds.forEach(function (a) { kinds.forEach(function (b) { included.push(sample(a, b, false)); }); });
    return { included:included, cousin:sample('cousin', 'child', false),
      exceptional:sample('self', 'self', true) };
  });
  expect(result.included).toEqual(Array(36).fill(true));
  expect(result.cousin).toBe(false);
  expect(result.exceptional).toBe(false);
});
