'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html',
  'css/style.css',
  'data/actions.js',
  'data/economy.js',
  'data/events_peasant.js',
  'data/map_data.js',
  'data/technology.js',
  'js/actions.js',
  'js/events.js',
  'js/i18n.js',
  'js/main.js',
  'js/messages.js',
  'js/save.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'js/ui_panels.js',
  'js/world.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { waitForUiRefresh } = require('../support/game/ui');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () {
    const s = FB.state;
    const me = s.chars[s.player.charId];
    me.born = s.date.year - 30;
    s.player.travel = null;
    delete s.player.flags.in_prison;
    if (s.player.tier !== 0) {
      FB.setPlayerTier(s, 0, { tenureFormationReason:'rank_change' });
    }
    FB.ensureSerfTenure(s, 'new_game');
    FB.getRole(s, 'lord', true);
    s.eventQueue = [];
  });
});

test('freedom terms validate and Standing deterministically freezes exact offers',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const lord = FB.getRole(s, 'lord', true);
      const target = { kind:'character', id:lord.id };
      const originalCost = FBDATA.balance.freedomCost;
      FBDATA.balance.freedomCost = 101;
      const turnBeforeOffers = s.turn;
      const originalAutosave = FB.save.autosave;
      let autosaves = 0;
      FB.save.autosave = function () { autosaves++; };
      function standing(value) {
        FB.adjustStanding(s, target, value - FB.standingOf(s, target),
          'test:freedom_offer');
      }
      function offerAt(value) {
        delete s.player.freedomOffer;
        delete s.player.freedomInvitation;
        standing(value);
        const before = JSON.stringify(FB.getRngState());
        const offer = FB.createFreedomOffer(s, 'petition');
        const after = JSON.stringify(FB.getRngState());
        return {
          termId:offer && offer.termId,
          price:offer && offer.price,
          serviceDays:offer && offer.serviceDays,
          rngStable:before === after,
          same:FB.createFreedomOffer(s, 'petition') === offer
        };
      }
      const blocked = offerAt(19);
      const standard = offerAt(20);
      const favored = offerAt(40);
      const service = offerAt(60);
      s.player.travel = {};
      const offeredWhileTraveling = FB.freedomPetitionStatus(s);
      s.player.travel = null;
      delete s.player.freedomOffer;
      standing(5);
      FB.inviteFreedomOffer(s, 'legacy_invitation');
      const invited = FB.createFreedomOffer(s, 'petition');
      const invitedSummary = {
        source:invited.source, termId:invited.termId,
        requiredStanding:invited.requiredStanding,
        invitationConsumed:!s.player.freedomInvitation
      };
      delete s.player.freedomOffer;
      delete s.player.freedomInvitation;
      s.player.flags.freedom_promised = 1;
      const legacyRngBefore = JSON.stringify(FB.getRngState());
      const legacyOffer = FB.ensureFreedomOffer(s);
      const legacy = {
        offer:legacyOffer,
        source:s.player.freedomInvitation &&
          s.player.freedomInvitation.source,
        flag:!!s.player.flags.freedom_promised,
        rngStable:legacyRngBefore === JSON.stringify(FB.getRngState())
      };
      const savedLordRole = s.roles.lord;
      delete s.roles.lord;
      const missingLordRngBefore = JSON.stringify(FB.getRngState());
      const noLordPetition = FB.freedomPetitionStatus(s);
      s.player.gold = FBDATA.balance.freedomCost;
      const buyFreedom = FB.instants.filter(function (deed) {
        return deed.id === 'buy_freedom';
      })[0];
      const noLordPurchase = buyFreedom.can(s);
      const missingLordRngStable = missingLordRngBefore ===
        JSON.stringify(FB.getRngState());
      s.roles.lord = savedLordRole;

      function invalid(mutator) {
        const terms = JSON.parse(JSON.stringify(FBDATA.freedomTerms));
        mutator(terms);
        try {
          FB.validateFreedomTerms(terms, FBDATA.freedomBargaining);
          return false;
        } catch (error) { return true; }
      }
      const failures = {
        overlap:invalid(function (terms) { terms[1].minStanding = 39; }),
        gap:invalid(function (terms) { terms[1].minStanding = 41; }),
        price:invalid(function (terms) { terms[0].priceFactor = 0; }),
        serviceDays:invalid(function (terms) { terms[2].serviceDays = 361; }),
        duplicate:invalid(function (terms) { terms[1].id = terms[0].id; })
      };
      FB.save.autosave = originalAutosave;
      FBDATA.balance.freedomCost = originalCost;
      return {
        blocked:blocked,
        standard:standard,
        favored:favored,
        service:service,
        invited:invitedSummary,
        legacy:legacy,
        offeredWhileTraveling:{
          ready:offeredWhileTraveling.ready,
          status:offeredWhileTraveling.offer.status
        },
        noLord:{
          petition:noLordPetition.reason,
          purchase:noLordPurchase,
          rngStable:missingLordRngStable
        },
        offerTurnStable:s.turn === turnBeforeOffers,
        autosaves:autosaves,
        failures:failures,
        timings:FBDATA.freedomBargaining
      };
    });

    expect(result.blocked.termId).toBeFalsy();
    expect(result.standard).toEqual({
      termId:'cash_standard', price:101, serviceDays:0,
      rngStable:true, same:true
    });
    expect(result.favored).toEqual({
      termId:'cash_favored', price:76, serviceDays:0,
      rngStable:true, same:true
    });
    expect(result.service).toEqual({
      termId:'cash_service', price:51, serviceDays:90,
      rngStable:true, same:true
    });
    expect(result.invited).toEqual({
      source:'legacy_invitation', termId:'cash_favored',
      requiredStanding:40, invitationConsumed:true
    });
    expect(result.legacy).toEqual({
      offer:null, source:'legacy_invitation', flag:false, rngStable:true
    });
    expect(result.offeredWhileTraveling).toEqual({
      ready:true, status:'offered'
    });
    expect(result.noLord.petition).toContain('No current lord');
    expect(result.noLord.purchase).toContain('No current lord');
    expect(result.noLord.rngStable).toBe(true);
    expect(result.offerTurnStable).toBe(true);
    expect(result.autosaves).toBe(4);
    expect(result.failures).toEqual({
      overlap:true, gap:true, price:true, serviceDays:true, duplicate:true
    });
    expect(result.timings).toEqual({
      petitionMinStanding:20, offerDays:180,
      petitionCooldownDays:360, finalServiceDays:90
    });
  });

test('purchase uses the shared resolver once while a generic rank change creates no history',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      delete p.familyFreedom;
      FB.setPlayerTier(s, 1);
      const genericHistory = p.familyFreedom || null;
      FB.setPlayerTier(s, 0, { tenureFormationReason:'rank_change' });
      const tenure = FB.ensureSerfTenure(s, 'rank_change');
      const lord = FB.getRole(s, 'lord', true);
      const target = { kind:'character', id:lord.id };
      FB.adjustStanding(s, target, 0 - FB.standingOf(s, target),
        'test:purchase');
      p.gold = FBDATA.balance.freedomCost + 20;
      const before = {
        gold:p.gold, prestige:p.prestige, piety:p.piety,
        log:s.log.length, rng:JSON.stringify(FB.getRngState())
      };
      const first = FB.resolveSerfFreedom(s, { route:'purchase' }, {});
      const replay = FB.resolveSerfFreedom(s, { route:'purchase' }, {});
      return {
        genericHistory:genericHistory,
        resolved:!!first,
        replay:replay,
        tier:p.tier,
        gold:p.gold,
        goldDelta:p.gold - before.gold,
        prestigeDelta:p.prestige - before.prestige,
        pietyDelta:p.piety - before.piety,
        rngStable:before.rng === JSON.stringify(FB.getRngState()),
        tenureStatus:tenure.status,
        tenureReason:tenure.endReason,
        history:p.familyFreedom,
        chronicle:s.log.slice(before.log).map(function (entry) {
          return entry.msg && entry.msg.key;
        })
      };
    });

    expect(result.genericHistory).toBeNull();
    expect(result.resolved).toBe(true);
    expect(result.replay).toBe(false);
    expect(result.tier).toBe(1);
    expect(result.goldDelta).toBe(-100);
    expect(result.prestigeDelta).toBe(15);
    expect(result.pietyDelta).toBe(5);
    expect(result.rngStable).toBe(true);
    expect(result.tenureStatus).toBe('closed');
    expect(result.tenureReason).toBe('purchase');
    expect(result.history.first.route).toBe('purchase');
    expect(result.history.first.price).toBe(100);
    expect(result.chronicle).toEqual(['news.freedom.purchase']);
  });

test('paid final service survives succession and completes on its exact turn without a second charge',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const oldId = p.charId;
      const old = s.chars[oldId];
      const lord = FB.getRole(s, 'lord', true);
      const target = { kind:'character', id:lord.id };
      FB.adjustStanding(s, target, 60 - FB.standingOf(s, target),
        'test:service');
      p.gold = 200;
      const offer = FB.createFreedomOffer(s, 'petition');
      const goldBefore = p.gold;
      const rngBeforeAcceptance = JSON.stringify(FB.getRngState());
      const service = FB.acceptFreedomOffer(s, { spendDay:false });
      const acceptanceRngStable = rngBeforeAcceptance ===
        JSON.stringify(FB.getRngState());
      const afterPayment = p.gold;
      const heir = FB.makeCharacter(s, {
        name:'Service Heir', sex:old.sex,
        culture:old.culture, religion:old.religion,
        born:s.date.year - 20, station:0, traitsN:0,
        fatherId:old.sex === 'm' ? old.id : null,
        motherId:old.sex === 'f' ? old.id : null,
        dyn:old.dyn
      });
      old.childrenIds.push(heir.id);
      FB.game.succeedTo(heir.id, { livingAbdication:true });
      const inherited = {
        status:p.freedomOffer.status,
        protagonistId:p.freedomOffer.protagonistId,
        endTurn:p.freedomOffer.serviceEndTurn,
        gold:p.gold
      };
      s.turn = offer.serviceEndTurn - 1;
      FB.freedomDay(s);
      const beforeDue = { tier:p.tier, gold:p.gold };
      s.turn = offer.serviceEndTurn;
      FB.freedomDay(s);
      return {
        serviceStarted:!!service,
        paid:goldBefore - afterPayment,
        acceptanceRngStable:acceptanceRngStable,
        originalProtagonistId:oldId,
        inherited:inherited,
        beforeDue:beforeDue,
        afterDue:{ tier:p.tier, gold:p.gold, status:p.freedomOffer.status },
        tenureReason:p.tenure.endReason,
        history:p.familyFreedom,
        lastKey:s.log[s.log.length - 1].msg.key
      };
    });

    expect(result.serviceStarted).toBe(true);
    expect(result.paid).toBe(50);
    expect(result.acceptanceRngStable).toBe(true);
    expect(result.inherited.status).toBe('service');
    expect(result.inherited.protagonistId)
      .toBe(result.originalProtagonistId);
    expect(result.beforeDue.tier).toBe(0);
    expect(result.afterDue).toEqual({ tier:1, gold:result.inherited.gold,
      status:'resolved' });
    expect(result.tenureReason).toBe('manumission');
    expect(result.history.first.route).toBe('manumission');
    expect(result.history.first.serviceDays).toBe(90);
    expect(result.history.first.protagonistId)
      .toBe(result.inherited.protagonistId);
    expect(result.lastKey).toBe('news.freedom.manumission_service');
  });

test('offer acceptance revalidates every saved authority before mutation and spends one day on success',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const lord = FB.getRole(s, 'lord', true);
      const target = { kind:'character', id:lord.id };
      FB.adjustStanding(s, target, 20 - FB.standingOf(s, target),
        'test:acceptance_validation');
      p.gold = 200;
      const offer = FB.createFreedomOffer(s, 'petition');
      const originalTurn = s.turn;
      function snapshot() {
        return JSON.stringify({
          gold:p.gold, tier:p.tier, prestige:p.prestige, piety:p.piety,
          offer:p.freedomOffer, tenure:p.tenure,
          familyFreedom:p.familyFreedom || null, logLength:s.log.length
        });
      }
      function blocked(change, restore) {
        change();
        const before = snapshot();
        const status = FB.freedomOfferAcceptanceStatus(s);
        const accepted = FB.acceptFreedomOffer(s, { spendDay:false });
        const unchanged = before === snapshot();
        restore();
        return { ready:status.ready, reason:status.reason,
          accepted:accepted, unchanged:unchanged };
      }
      const oldCharId = p.charId;
      const stranger = FB.makeCharacter(s, {
        name:'Wrong Petitioner', sex:'m', culture:s.chars[oldCharId].culture,
        religion:s.chars[oldCharId].religion,
        born:s.date.year - 30, station:0, traitsN:0
      });
      const checks = {
        protagonist:blocked(function () { p.charId = stranger.id; },
          function () { p.charId = oldCharId; }),
        lord:blocked(function () { lord.dead = true; },
          function () { lord.dead = false; }),
        home:blocked(function () { p.homeSettlement++; },
          function () { p.homeSettlement--; }),
        tenure:blocked(function () { p.tenure.formedTurn++; },
          function () { p.tenure.formedTurn--; }),
        standing:blocked(function () {
          FB.adjustStanding(s, target, 19 - FB.standingOf(s, target),
            'test:standing_drop');
        }, function () {
          FB.adjustStanding(s, target, 20 - FB.standingOf(s, target),
            'test:standing_restore');
        }),
        gold:blocked(function () { p.gold = offer.price - 1; },
          function () { p.gold = 200; }),
        term:blocked(function () { offer.serviceDays++; },
          function () { offer.serviceDays--; }),
        expiry:blocked(function () { s.turn = offer.expiryTurn + 1; },
          function () { s.turn = originalTurn; })
      };
      const accepted = FB.acceptFreedomOffer(s);
      return {
        checks:checks,
        accepted:!!accepted,
        turnDelta:s.turn - originalTurn,
        tier:p.tier,
        recordedPrice:p.familyFreedom.first.price
      };
    });

    Object.keys(result.checks).forEach(function (key) {
      expect(result.checks[key].ready, key).toBe(false);
      expect(result.checks[key].accepted, key).toBe(false);
      expect(result.checks[key].unchanged, key).toBe(true);
      expect(result.checks[key].reason, key).not.toBe('');
    });
    expect(result.accepted).toBe(true);
    expect(result.turnDelta).toBe(1);
    expect(result.tier).toBe(1);
    expect(result.recordedPrice).toBe(100);
  });

test('lords notice queues one exact non-random manumission offer and expiry honors cooldown boundaries',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const lord = FB.getRole(s, 'lord', true);
      const target = { kind:'character', id:lord.id };
      FB.adjustStanding(s, target, 30 - FB.standingOf(s, target),
        'test:lords_notice');
      p.gold = 200;
      const notice = FB.eventById('lords_notice');
      FB.resolveEventOption(s, notice, notice.options[0], {}, {
        automated:false
      });
      const offered = JSON.parse(JSON.stringify(p.freedomOffer));
      const queueAfterFirst = s.eventQueue.filter(function (item) {
        return item.id === 'manumission';
      });
      FB.fns.freedom_lords_notice(s);
      const queueAfterReuse = s.eventQueue.filter(function (item) {
        return item.id === 'manumission';
      });
      const queued = queueAfterReuse[0];
      const manumission = FB.eventById('manumission');
      const contextValid = FB.fns.freedom_offer_context_valid(s, queued.ctx);
      const beforeDecline = JSON.stringify(p.freedomOffer);
      FB.resolveEventOption(s, manumission, manumission.options[1],
        queued.ctx, { automated:false });
      const afterDecline = JSON.stringify(p.freedomOffer);
      FB.adjustStanding(s, target, 40 - FB.standingOf(s, target),
        'test:accept_offer');
      const ready = FB.eventOptionStatus(s, manumission,
        manumission.options[0], queued.ctx);
      const originalRole = s.roles.lord;
      const stranger = FB.makeCharacter(s, {
        name:'Replacement Lord', sex:'m', culture:lord.culture,
        religion:lord.religion, born:s.date.year - 40,
        station:3, traitsN:0
      });
      s.roles.lord = stranger.id;
      const stale = FB.freedomOfferAcceptanceStatus(s);
      s.roles.lord = originalRole;
      const goldBeforeAcceptance = p.gold;
      const accepted = FB.resolveEventOption(s, manumission,
        manumission.options[0], queued.ctx, { automated:true });
      const acceptedCharge = goldBeforeAcceptance - p.gold;

      FB.setPlayerTier(s, 0, { tenureFormationReason:'rank_change' });
      FB.ensureSerfTenure(s, 'rank_change');
      delete p.freedomOffer;
      FB.adjustStanding(s, target, 20 - FB.standingOf(s, target),
        'test:expiry');
      const expiring = FB.createFreedomOffer(s, 'petition');
      s.turn = expiring.expiryTurn;
      const expiryTurnReady = FB.freedomOfferAcceptanceStatus(s).ready;
      s.turn = expiring.expiryTurn + 1;
      FB.freedomDay(s);
      const expiredStatus = p.freedomOffer.status;
      s.turn = expiring.cooldownUntil - 1;
      const beforeCooldown = FB.createFreedomOffer(s, 'petition');
      s.turn = expiring.cooldownUntil;
      const atCooldown = FB.createFreedomOffer(s, 'petition');
      return {
        offered:offered,
        queueFirst:queueAfterFirst.length,
        queueReused:queueAfterReuse.length,
        randomDisabled:manumission.trigger.never === true,
        contextValid:contextValid,
        declinedUnchanged:beforeDecline === afterDecline,
        ready:ready,
        stale:stale,
        accepted:!!accepted,
        acceptedCharge:acceptedCharge,
        firstRoute:p.familyFreedom.first.route,
        expiryTurnReady:expiryTurnReady,
        expiredStatus:expiredStatus,
        beforeCooldown:beforeCooldown,
        atCooldown:atCooldown
      };
    });

    expect(result.offered.source).toBe('lords_notice');
    expect(result.offered.termId).toBe('cash_favored');
    expect(result.queueFirst).toBe(1);
    expect(result.queueReused).toBe(1);
    expect(result.randomDisabled).toBe(true);
    expect(result.contextValid).toBe(true);
    expect(result.declinedUnchanged).toBe(true);
    expect(result.ready.ready).toBe(true);
    expect(result.stale.ready).toBe(false);
    expect(result.stale.reason).toContain('no longer holds authority');
    expect(result.accepted).toBe(true);
    expect(result.acceptedCharge).toBe(75);
    expect(result.firstRoute).toBe('manumission');
    expect(result.expiryTurnReady).toBe(true);
    expect(result.expiredStatus).toBe('expired');
    expect(result.beforeCooldown).toBe(false);
    expect(result.atCooldown.status).toBe('offered');
  });

test('story routes preflight atomically, record flight origin, and leave no bare freedom tier effects',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const origin = p.provinceId;
      const initialGold = p.gold;
      const flee = FB.eventById('flee_serfdom');
      const rejected = FB.applyEffects(s, {
        serfFreedom:{ route:'flight' }, tierSet:1, gold:99
      }, {}, flee);
      const afterConflict = { tier:p.tier, gold:p.gold };
      const invalidContext = FB.applyEffects(s, {
        serfFreedom:{ route:'flight' }, gold:99
      }, {}, FB.eventById('lords_notice'));
      const afterInvalid = { tier:p.tier, gold:p.gold };
      const flight = FB.applyEffects(s,
        flee.options[0].success.effects, {}, flee);
      const flightRecord = p.familyFreedom.first;

      FB.setPlayerTier(s, 0, { tenureFormationReason:'rank_change' });
      FB.ensureSerfTenure(s, 'rank_change');
      // Flight clears the former county's local cast. Materialize the new
      // county's lord before exercising a separate lawful judgment route.
      FB.getRole(s, 'lord', true);
      p.flags.old_custom_resolve = 1;
      p.flags.old_custom_won = 1;
      const oldCustom = FB.eventById('old_custom_end');
      const personalFreedom = oldCustom.options.filter(function (option) {
        return option.effects && option.effects.serfFreedom;
      })[0];
      FB.applyEffects(s, personalFreedom.effects, {}, oldCustom);
      const bounded = p.familyFreedom;
      const bare = [];
      FBDATA.events.forEach(function (event) {
        (event.options || []).forEach(function (option, index) {
          const branches = [option.effects,
            option.success && option.success.effects,
            option.failure && option.failure.effects];
          branches.forEach(function (effects) {
            if (effects && Number(effects.tierSet) === 1) {
              bare.push(event.id + ':' + index);
            }
          });
        });
      });
      return {
        initialGold:initialGold,
        rejected:rejected,
        invalidContext:invalidContext,
        afterConflict:afterConflict,
        afterInvalid:afterInvalid,
        flightImpacts:flight,
        flightOrigin:flightRecord.provinceId,
        flightLawful:flightRecord.lawful,
        movedTo:p.provinceId,
        firstRoute:bounded.first.route,
        lawfulRoute:bounded.firstLawful && bounded.firstLawful.route,
        boundedKeys:Object.keys(bounded).sort(),
        bare:bare,
        tech:{
          petition:FBDATA.techImpactReviews.features.serf_freedom_petition.mode,
          history:FBDATA.techImpactReviews.features.family_freedom_record.mode
        }
      };
    });

    expect(result.rejected).toEqual([]);
    expect(result.invalidContext).toEqual([]);
    expect(result.afterConflict).toEqual({ tier:0, gold:result.initialGold });
    expect(result.afterInvalid).toEqual({ tier:0, gold:result.initialGold });
    expect(result.flightOrigin).toBeDefined();
    expect(result.flightOrigin).not.toBe(result.movedTo);
    expect(result.flightLawful).toBe(false);
    expect(result.firstRoute).toBe('flight');
    expect(result.lawfulRoute).toBe('old_custom');
    expect(result.boundedKeys).toEqual(['first','firstLawful','version']);
    expect(result.bare).toEqual([]);
    expect(result.tech).toEqual({ petition:'none', history:'none' });
  });

test('saved offers round-trip and the rank, petition, and Kin surfaces expose stable selectors',
  async function ({ page }) {
    await page.setViewportSize({ width:390, height:760 });
    const record = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const lord = FB.getRole(s, 'lord', true);
      const target = { kind:'character', id:lord.id };
      FB.adjustStanding(s, target, 40 - FB.standingOf(s, target),
        'test:ui');
      p.gold = 200;
      const offer = FB.createFreedomOffer(s, 'petition');
      const serialized = FB.save.serialize();
      const parsed = JSON.parse(serialized);
      FB.save.restore(parsed);
      FB.ui.showRankDetails();
      return {
        offer:offer,
        restored:FB.state.player.freedomOffer,
        wrapper:parsed.v
      };
    });
    await waitForUiRefresh(page);

    expect(record.wrapper).toBe(3);
    expect(record.restored).toEqual(record.offer);
    await expect(page.locator('[data-freedom-routes]')).toBeVisible();
    await expect(page.locator('[data-freedom-offer-price]'))
      .toContainText('75');
    await expect(page.locator('[data-freedom-offer-service]'))
      .toContainText('none');
    await expect(page.locator('[data-freedom-offer-expiry]')).toBeVisible();

    await page.locator('#rank-petition-freedom').click();
    await expect(page.getByRole('heading', { name:'Terms of freedom' }))
      .toBeVisible();
    await expect(page.locator('#freedom-offer-accept')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);

    await page.evaluate(function () {
      const s = FB.state;
      const offer = s.player.freedomOffer;
      s.player.familyFreedom = {
        version:1,
        first:{
          route:'flight', lawful:false,
          protagonistId:offer.protagonistId, lordId:null,
          provinceId:offer.provinceId,
          settlementIndex:offer.settlementIndex,
          turn:s.turn, year:s.date.year,
          price:0, serviceDays:0
        }
      };
      FB.ui.showTab('family');
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);
    await expect(page.locator('[data-family-freedom]')).toBeVisible();
    await expect(page.locator('[data-family-freedom-first]'))
      .toContainText('no lawful charter was granted');
  });
