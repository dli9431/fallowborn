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
  'js/model.js',
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

test('freedom prices the living family and freezes that family in negotiated terms',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const me = s.chars[p.charId];
      const spouse = FB.makeCharacter(s, {
        name:'Resident Spouse', sex:me.sex === 'm' ? 'f' : 'm',
        culture:me.culture, religion:me.religion,
        born:s.date.year - 28, station:0, traitsN:0,
        dyn:me.dyn
      });
      me.spouseId = spouse.id;
      spouse.spouseId = me.id;
      function child(name, age) {
        const c = FB.makeCharacter(s, {
          name:name, sex:'f', culture:me.culture, religion:me.religion,
          born:s.date.year - age, station:0, traitsN:0, dyn:me.dyn,
          fatherId:me.sex === 'm' ? me.id : spouse.id,
          motherId:me.sex === 'f' ? me.id : spouse.id
        });
        me.childrenIds.push(c.id);
        spouse.childrenIds.push(c.id);
        return c;
      }
      const separateChild = child('Married Child', 18);
      child('Resident Child', 10);
      const separateSpouse = FB.makeCharacter(s, {
        name:'Separate Spouse', sex:'m', culture:me.culture,
        religion:me.religion, born:s.date.year - 20,
        station:0, traitsN:0
      });
      separateChild.spouseId = separateSpouse.id;
      separateSpouse.spouseId = separateChild.id;
      const grandchild = FB.makeCharacter(s, {
        name:'Living Grandchild', sex:'m', culture:me.culture,
        religion:me.religion, born:s.date.year - 1,
        station:0, traitsN:0, dyn:me.dyn,
        motherId:separateChild.id, fatherId:separateSpouse.id
      });
      separateChild.childrenIds.push(grandchild.id);
      separateSpouse.childrenIds.push(grandchild.id);

      const originalCost = FBDATA.balance.freedomCost;
      FBDATA.balance.freedomCost = 101;
      const rounded = FB.freedomPurchaseQuote(s);
      FBDATA.balance.freedomCost = originalCost;
      const initial = FB.freedomPurchaseQuote(s);
      const lord = FB.getRole(s, 'lord', true);
      const target = { kind:'character', id:lord.id };
      FB.adjustStanding(s, target, 40 - FB.standingOf(s, target),
        'test:household_freedom');
      const offer = FB.createFreedomOffer(s, 'petition');
      const saved = {
        baseCost:offer.baseCost,
        price:offer.price,
        headCost:offer.headCost,
        spouseCount:offer.spouseCount,
        descendantCount:offer.descendantCount,
        familySize:offer.familySize
      };
      child('Later Child', 1);
      const current = FB.freedomPurchaseQuote(s);
      const view = FB.freedomOfferView(s);
      const malformed = JSON.parse(JSON.stringify(offer));
      malformed.descendantCount++;
      const malformedValid = FB.freedomOfferSemanticsValid(malformed);
      const buyFreedom = FB.instants.filter(function (deed) {
        return deed.id === 'buy_freedom';
      })[0];
      p.gold = current.price - 1;
      const blocked = buyFreedom.can(s);
      p.gold = current.price;
      const goldBefore = p.gold;
      const resolved = FB.resolveSerfFreedom(s, { route:'purchase' }, {});
      return {
        rounded:rounded,
        initial:initial,
        saved:saved,
        current:current,
        viewPricing:view.familyPricing,
        malformedValid:malformedValid,
        blocked:blocked,
        resolved:!!resolved,
        charged:goldBefore - p.gold,
        recordedPrice:p.familyFreedom.first.price
      };
    });

    expect(result.rounded).toEqual({
      headCost:101,
      spouseCount:1,
      spouseUnitCost:51,
      descendantCount:3,
      descendantUnitCost:26,
      familySize:5,
      price:230
    });
    expect(result.initial).toEqual({
      headCost:100,
      spouseCount:1,
      spouseUnitCost:50,
      descendantCount:3,
      descendantUnitCost:25,
      familySize:5,
      price:225
    });
    expect(result.saved).toEqual({
      baseCost:225,
      price:169,
      headCost:100,
      spouseCount:1,
      descendantCount:3,
      familySize:5
    });
    expect(result.current).toEqual({
      headCost:100,
      spouseCount:1,
      spouseUnitCost:50,
      descendantCount:4,
      descendantUnitCost:25,
      familySize:6,
      price:250
    });
    expect(result.viewPricing).toEqual(result.initial);
    expect(result.malformedValid).toBe(false);
    expect(result.blocked).toContain('Not enough money');
    expect(result.resolved).toBe(true);
    expect(result.charged).toBe(250);
    expect(result.recordedPrice).toBe(250);
  });

test('freedom is personal and an unmanumitted collateral heir returns to serfdom',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const me = s.chars[p.charId];
      const parents = FB.parentsOf(s, me);
      const siblings = FB.siblingsOf(s, me);
      const selectedSibling = siblings[0];
      let unselectedSibling = siblings[1];
      if (!unselectedSibling) {
        unselectedSibling = FB.makeCharacter(s, {
          name:'Unselected Sibling', sex:selectedSibling.sex === 'm' ? 'f' : 'm',
          culture:me.culture, religion:me.religion,
          born:s.date.year - 22, station:0, unfree:true, traitsN:0, dyn:me.dyn,
          fatherId:me.fatherId, motherId:me.motherId
        });
        parents.forEach(function (parent) {
          parent.childrenIds.push(unselectedSibling.id);
        });
        FB.touchFamily();
      }
      const lord = FB.getRole(s, 'lord', true);
      const target = { kind:'character', id:lord.id };
      FB.adjustStanding(s, target, 0 - FB.standingOf(s, target),
        'test:personal_freedom');
      p.gold = 1000;
      const selectedQuote = FB.freedomPurchaseQuote(s, [selectedSibling.id]);
      const freedom = FB.resolveSerfFreedom(s, {
        route:'purchase', additionalIds:[selectedSibling.id]
      }, {});
      const afterFreedom = {
        head:FB.stationOf(me),
        parent:FB.stationOf(parents[0]),
        selected:FB.stationOf(selectedSibling),
        unselected:FB.stationOf(unselectedSibling),
        parentUnfree:FB.isUnfreeCharacter(s, parents[0]),
        selectedUnfree:FB.isUnfreeCharacter(s, selectedSibling),
        unselectedUnfree:FB.isUnfreeCharacter(s, unselectedSibling),
        parentTree:FB.ui.familyTreeStatusHtml(s, parents[0]),
        selectedTree:FB.ui.familyTreeStatusHtml(s, selectedSibling),
        coversHead:freedom.memberIds.indexOf(me.id) >= 0,
        coversSelected:freedom.memberIds.indexOf(selectedSibling.id) >= 0,
        coversParent:freedom.memberIds.indexOf(parents[0].id) >= 0,
        coversUnselected:freedom.memberIds.indexOf(unselectedSibling.id) >= 0,
        relativeCount:selectedQuote.relativeCount,
        relativeCost:selectedQuote.relativeUnitCost
      };
      const separate = FB.resolveFamilyManumission(s, parents[0].id);
      p.flags.own_ox = 1;
      FB.game.succeedTo(unselectedSibling.id);
      return {
        afterFreedom:afterFreedom,
        separatelyFreed:!!separate,
        parentAfter:FB.stationOf(parents[0]),
        parentUnfreeAfter:FB.isUnfreeCharacter(s, parents[0]),
        successorTier:p.tier,
        successorStation:FB.stationOf(unselectedSibling),
        tenureStatus:p.tenure && p.tenure.status,
        inheritedOx:!!p.flags.own_ox,
        lastKeys:s.log.slice(-3).map(function (entry) {
          return entry.msg && entry.msg.key;
        })
      };
    });

    expect(result.afterFreedom.head).toBe(1);
    expect(result.afterFreedom.parent).toBe(0);
    expect(result.afterFreedom.selected).toBe(1);
    expect(result.afterFreedom.unselected).toBe(0);
    expect(result.afterFreedom.parentTree).toContain('Serf');
    expect(result.afterFreedom.parentTree).not.toContain('Freeholder');
    expect(result.afterFreedom.selectedTree).toContain('Freeholder');
    expect(result.afterFreedom.parentUnfree).toBe(true);
    expect(result.afterFreedom.selectedUnfree).toBe(false);
    expect(result.afterFreedom.unselectedUnfree).toBe(true);
    expect(result.afterFreedom.relativeCount).toBe(1);
    expect(result.afterFreedom.relativeCost).toBe(50);
    expect(result.afterFreedom.coversHead).toBe(true);
    expect(result.afterFreedom.coversSelected).toBe(true);
    expect(result.afterFreedom.coversParent).toBe(false);
    expect(result.afterFreedom.coversUnselected).toBe(false);
    expect(result.separatelyFreed).toBe(true);
    expect(result.parentAfter).toBe(1);
    expect(result.parentUnfreeAfter).toBe(false);
    expect(result.successorTier).toBe(0);
    expect(result.successorStation).toBe(0);
    expect(result.tenureStatus).toBe('active');
    expect(result.inheritedOx).toBe(true);
    expect(result.lastKeys).toContain('news.life.unfree_successor');
  });

test('legacy restore derives only the current protagonist personal station',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const parent = FB.parentsOf(s, me)[0];
      const sibling = FB.siblingsOf(s, me)[0];
      FB.setPlayerTier(s, 1, { freedomResolution:true });
      const payload = JSON.parse(FB.save.serialize());
      delete payload.state.chars[me.id].station;
      delete payload.state.chars[me.id].unfree;
      delete payload.state.chars[parent.id].unfree;
      delete payload.state.chars[sibling.id].unfree;
      delete payload.state.player.familyFreedom;
      FB.save.restore(payload);
      return {
        current:FB.stationOf(FB.state.chars[me.id]),
        parent:FB.stationOf(FB.state.chars[parent.id]),
        sibling:FB.stationOf(FB.state.chars[sibling.id])
      };
    });

    expect(result).toEqual({ current:1, parent:0, sibling:0 });
  });

test('purchase selection and a character sheet can manumit exact relatives',
  async function ({ page }) {
    const ids = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const parent = FB.parentsOf(s, me)[0];
      const sibling = FB.siblingsOf(s, me)[0];
      s.player.gold = 1000;
      FB.ui.showFreedomPurchase();
      return { parent:parent.id, sibling:sibling.id };
    });

    await expect(page.getByRole('heading', { name:'Buy freedom' })).toBeVisible();
    await page.locator('[data-freedom-relative="' + ids.parent + '"]').check();
    await expect(page.locator('[data-freedom-family-price]'))
      .toContainText('Selected parent or sibling shares 1 x');
    await page.locator('#freedom-purchase-confirm').click();
    await waitForUiRefresh(page);

    const afterPurchase = await page.evaluate(function (ids) {
      return {
        tier:FB.state.player.tier,
        parent:FB.stationOf(FB.state.chars[ids.parent]),
        sibling:FB.stationOf(FB.state.chars[ids.sibling])
      };
    }, ids);
    expect(afterPurchase).toEqual({ tier:1, parent:1, sibling:0 });

    await page.evaluate(function (siblingId) {
      FB.ui.showCharModal(siblingId);
    }, ids.sibling);
    await expect(page.locator('#gm-body')).toContainText('Serf');
    const manumit = page.locator(
      '[data-interaction-action="management.family.manumission"]');
    await expect(manumit).toBeVisible();
    await manumit.click();
    await expect(page.getByRole('heading', { name:'Family Manumission' }))
      .toBeVisible();
    await page.locator('#family-manumission-confirm').click();
    await waitForUiRefresh(page);

    const inherited = await page.evaluate(function (siblingId) {
      const s = FB.state;
      const before = FB.stationOf(s.chars[siblingId]);
      FB.game.succeedTo(siblingId, { livingAbdication:true });
      return { before:before, tier:s.player.tier };
    }, ids.sibling);
    expect(inherited).toEqual({ before:1, tier:1 });
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
      p.gold = FB.freedomPurchasePrice(s) + 20;
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
        tenureRevision:blocked(function () { p.tenure.revision++; },
          function () { p.tenure.revision--; }),
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
      const me = s.chars[p.charId];
      const spouse = FB.makeCharacter(s, {
        name:'Quoted Spouse', sex:me.sex === 'm' ? 'f' : 'm',
        culture:me.culture, religion:me.religion,
        born:s.date.year - 28, station:0, traitsN:0, dyn:me.dyn
      });
      me.spouseId = spouse.id;
      spouse.spouseId = me.id;
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
    await expect(page.locator('[data-freedom-family-price]'))
      .toContainText('spouse shares 1 × 50');
    await expect(page.locator('[data-freedom-offer-price]'))
      .toContainText('113');
    await expect(page.locator('[data-freedom-offer-family-price]'))
      .toContainText('head 100');
    await expect(page.locator('[data-freedom-offer-service]'))
      .toContainText('none');
    await expect(page.locator('[data-freedom-offer-expiry]')).toBeVisible();

    await page.locator('#rank-petition-freedom').click();
    await expect(page.getByRole('heading', { name:'Terms of freedom' }))
      .toBeVisible();
    await expect(page.locator('[data-freedom-offer-family-price]'))
      .toContainText('spouse shares 1 × 50');
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

test('local advocacy snapshots an exact +10 term and acceptance falls back to the lord’s current Standing',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const lord = FB.getRole(s, 'lord', true);
      const steward = FB.getRole(s, 'steward', false);
      const lordTarget = { kind:'character', id:lord.id };
      const stewardTarget = { kind:'character', id:steward.id };
      FB.adjustStanding(s, lordTarget,
        34 - FB.standingOf(s, lordTarget), 'test:advocacy_lord');
      FB.adjustStanding(s, stewardTarget,
        52 - FB.standingOf(s, stewardTarget), 'test:advocacy_steward');
      delete p.freedomOffer;
      delete p.freedomInvitation;
      p.rivalContacts = p.rivalContacts || {};
      delete p.rivalContacts[steward.id];
      const rngBefore = FB.getRngState();
      const advocates = FB.freedomAdvocates(s);
      const preview = FB.freedomAdvocacyPreview(s, steward.id);
      const offer = FB.createFreedomOffer(s, 'petition', steward.id);
      const rngAfter = FB.getRngState();
      const serialized = JSON.parse(FB.save.serialize());
      delete p.freedomOffer;
      FB.adjustStanding(s, lordTarget,
        5 - FB.standingOf(s, lordTarget), 'test:advocacy_invitation');
      FB.inviteFreedomOffer(s, 'lords_notice');
      const invitedPreview = FB.freedomAdvocacyPreview(s, steward.id);
      const invitedOffer = FB.createFreedomOffer(s, 'petition', steward.id);
      FB.save.restore(serialized);
      const restored = FB.state;
      const restoredOffer = restored.player.freedomOffer;
      const restoredSteward = restored.chars[steward.id];
      const restoredLord = restored.chars[lord.id];
      FB.adjustStanding(restored, { kind:'character', id:restoredSteward.id },
        39 - FB.standingOf(restored, {
          kind:'character', id:restoredSteward.id
        }), 'test:lost_support');
      const lost = FB.freedomOfferAcceptanceStatus(restored);
      FB.adjustStanding(restored, { kind:'character', id:restoredLord.id },
        40 - FB.standingOf(restored, {
          kind:'character', id:restoredLord.id
        }), 'test:lord_supports');
      const independent = FB.freedomOfferAcceptanceStatus(restored);
      const malformed = JSON.parse(JSON.stringify(restoredOffer));
      malformed.effectiveStandingAtCreation += 1;
      restored.player.freedomOffer = malformed;
      const malformedStatus = FB.ensureFreedomOffer(restored).status;
      return {
        advocates:advocates,
        preview:preview,
        offer:offer,
        rngStable:rngBefore === rngAfter,
        invitedPreview:invitedPreview,
        invitedOffer:invitedOffer,
        restoredOffer:restoredOffer,
        lost:lost,
        independent:independent,
        malformedStatus:malformedStatus,
        tech:{
          participants:FBDATA.techImpactReviews.features
            .recurring_local_event_participants.mode,
          advocacy:FBDATA.techImpactReviews.features.serf_freedom_advocacy.mode
        }
      };
    });

    expect(result.advocates.map(function (entry) { return entry.role; }))
      .toEqual(['steward']);
    expect(result.preview).toMatchObject({
      actualLordStanding:34,
      bonus:10,
      effectiveStanding:44,
      unassistedTermId:'cash_standard',
      termId:'cash_favored',
      changesTerm:true
    });
    expect(result.offer.advocacy).toMatchObject({
      role:'steward', standingRequired:40, standingAtCreation:52, bonus:10
    });
    expect(result.offer.actualLordStandingAtCreation).toBe(34);
    expect(result.offer.effectiveStandingAtCreation).toBe(44);
    expect(result.rngStable).toBe(true);
    expect(result.invitedPreview).toMatchObject({
      actualLordStanding:5,
      invitationFloor:40,
      effectiveStanding:50,
      termId:'cash_favored'
    });
    expect(result.invitedOffer).toMatchObject({
      source:'lords_notice', actualLordStandingAtCreation:5,
      effectiveStandingAtCreation:50, termId:'cash_favored'
    });
    expect(result.restoredOffer).toEqual(result.offer);
    expect(result.lost.ready).toBe(false);
    expect(result.lost.reason).toBe('Support for these terms has been lost.');
    expect(result.independent.ready).toBe(true);
    expect(result.malformedStatus).toBe('invalid');
    expect(result.tech).toEqual({ participants:'none', advocacy:'none' });
  });

test('the petition sheet discloses optional advocacy before creation and preserves its saved audit',
  async function ({ page }) {
    const expected = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const lord = FB.getRole(s, 'lord', true);
      const steward = FB.getRole(s, 'steward', false);
      FB.adjustStanding(s, { kind:'character', id:lord.id },
        34 - FB.standingOf(s, { kind:'character', id:lord.id }),
        'test:advocacy_ui_lord');
      FB.adjustStanding(s, { kind:'character', id:steward.id },
        52 - FB.standingOf(s, { kind:'character', id:steward.id }),
        'test:advocacy_ui_steward');
      delete p.freedomOffer;
      delete p.freedomInvitation;
      FB.ui.showFreedomPetition({ intro:true });
      return { stewardId:steward.id, stewardName:FB.fullName(steward) };
    });

    const preview = page.locator(
      '[data-freedom-advocate-preview="' + expected.stewardId + '"]');
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(expected.stewardName);
    await expect(preview).toContainText('effective lord Standing 44');
    await expect(preview).toContainText('Changes the offered term band');
    await expect(page.locator('#freedom-petition-create'))
      .toContainText('without a supporter');
    const choose = page.locator(
      '[data-freedom-advocate="' + expected.stewardId + '"]');
    await expect(choose).toBeVisible();
    await choose.click();
    await expect(page.locator('[data-freedom-offer-advocacy]')).toBeVisible();
    await expect(page.locator('[data-freedom-offer-advocacy]'))
      .toContainText(expected.stewardName);
    await expect(page.locator('[data-freedom-offer-advocacy]'))
      .toContainText('Lord 34 + advocate 10 = effective 44');
  });
