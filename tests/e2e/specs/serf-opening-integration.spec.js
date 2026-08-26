'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html',
  'css/style.css',
  'data/actions.js',
  'data/bookmarks.js',
  'data/cultures.js',
  'data/economy.js',
  'data/events_peasant.js',
  'data/map_data.js',
  'data/starts.js',
  'data/technology.js',
  'js/actions.js',
  'js/events.js',
  'js/i18n.js',
  'js/keys.js',
  'js/main.js',
  'js/messages.js',
  'js/model.js',
  'js/save.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'js/ui_panels.js',
  'js/ui_topbar.js',
  'js/world.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { waitForUiRefresh } = require('../support/game/ui');
const SERF_START_CODE = 'ASCENT-867-serf-london-f-Ada';

async function startSerfFixture(page, testInfo, tutorial) {
  await openGame(page, testInfo);
  await startDeterministicGame(page, { keepTutorial:!!tutorial });
  await page.evaluate(function (keepTutorial) {
    const s = FB.state;
    FB.setPlayerTier(s, 0, { tenureFormationReason:'rank_change' });
    FB.ensureSerfTenure(s, 'rank_change');
    FB.getRole(s, 'lord', true);
    s.eventQueue = [];
    s.player.flags = s.player.flags || {};
    if (keepTutorial) {
      s.player.flags.tutorial = 1;
      delete s.player.flags.tutorial_done;
    }
    FB.ui.refresh();
  }, !!tutorial);
  await waitForUiRefresh(page);
}

test('tier 0 onboarding keeps three First steps and links one integrated tenure surface',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await page.getByRole('button', { name:'New Game', exact:true }).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill(SERF_START_CODE);
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button', { name:'Begin Your Story', exact:true })
      .click();
    await expect(page.locator('[data-serf-start-pointer]')).toContainText(
      "Your household's terms and routes to freedom are in Rank & Realm");
    await page.getByRole('button', { name:'Begin', exact:true }).click();
    await page.evaluate(function () {
      FB.ui.showTab('actions');
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);

    const card = page.locator('#tutorial-guidance');
    await expect(card).toHaveAttribute('data-tutorial-track', 'first_steps');
    await expect(card.locator('li')).toHaveCount(3);
    await expect(page.locator('#tutorial-serf-tenure')).toContainText(
      'Review your tenure and routes to freedom in Rank & Realm');
    await page.locator('#tutorial-serf-tenure').click();

    await expect(page.locator('[data-serf-tenure]')).toBeVisible();
    await expect(page.locator('[data-serf-next-duty]')).toBeVisible();
    await expect(page.locator('[data-serf-freedom-routes]')).toBeVisible();
    await expect(page.locator('[data-serf-freedom-routes]'))
      .toContainText('Current gold');
    await expect(page.locator('[data-serf-freedom-routes]'))
      .toContainText('Standing with current lord');
    await expect(page.locator('[data-serf-freedom-routes]'))
      .toContainText('Petition eligibility');
    expect(await page.evaluate(function () {
      const state = FB.serfOnboardingState(FB.state);
      return state.rankRealmSeen && state.freedomRoutesSeen;
    })).toBe(true);

    await page.evaluate(function () {
      document.querySelector('[data-serf-tenure]')
        .setAttribute('data-retained-test', 'yes');
      FB.ui.refresh({ liveTick:true });
    });
    await waitForUiRefresh(page);
    await expect(page.locator('[data-serf-tenure]'))
      .toHaveAttribute('data-retained-test', 'yes');
    await page.locator('[data-tenure-home]').focus();
    await page.evaluate(function () {
      FB.state.player.gold = FB.freedomPurchasePrice(FB.state) + 1;
      FB.ui.refresh({ liveTick:true });
    });
    await waitForUiRefresh(page);
    await expect(page.locator('[data-serf-tenure]'))
      .not.toHaveAttribute('data-retained-test', 'yes');
    await expect(page.locator('[data-tenure-home]')).toBeFocused();

    await page.locator('[data-tenure-home]').click();
    await expect(page.locator('#gm-cancel')).toHaveText('Back');
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-serf-tenure]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    await expect(page.locator('#tutorial-serf-tenure')).toBeFocused();
  });

test('the tenure coach follows First steps, precedes optional deeds, and acknowledges per save',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page, {
      keepFirstTimeTips:true, keepTutorial:true
    });
    const shown = await page.evaluate(function () {
      const s = FB.state;
      FB.ui.coachmarkReset();
      FB.setPlayerTier(s, 0, { tenureFormationReason:'rank_change' });
      FB.ensureSerfTenure(s, 'rank_change');
      s.player.flags.tutorial = 1;
      s.player.flags.tut_deed = 1;
      s.player.flags.tut_time = 1;
      s.player.flags.tut_event = 1;
      s.player.flags.tut_track_first_steps = 1;
      delete s.player.flags.hint_serf_tenure;
      FB.game.uiPrefs.hideTips = false;
      FB.game.uiPrefs.hideBeginnerHints = false;
      FB.game.uiPrefs.tipsGrandfathered = false;
      FB.game.uiPrefs.tipsSeen = {
        'map-controls':1, 'map-home':1, 'map-filters':1,
        'first-event-result':1
      };
      FB.ui.showTab('actions');
      return FB.ui.resumePostFirstStepsTips();
    });
    expect(shown).toBe(true);
    const coach = page.locator('.coachmark', {
      hasText:'Rank & Realm contains your household terms'
    });
    await expect(coach).toBeVisible();
    await expect(page.locator(
      '[data-action-id="review_serf_tenure"]')).toBeVisible();
    await coach.getByRole('button', { name:'Got it', exact:true }).click();
    expect(await page.evaluate(function () {
      return {
        acknowledged:!!FB.state.player.flags.hint_serf_tenure,
        repeated:FB.ui.maybeSerfTenureTip()
      };
    })).toEqual({ acknowledged:true, repeated:false });

    expect(await page.evaluate(function () {
      delete FB.state.player.flags.hint_serf_tenure;
      FB.game.uiPrefs.hideBeginnerHints = true;
      return FB.ui.maybeSerfTenureTip();
    })).toBe(false);
    await expect(page.locator('[data-action-id="review_serf_tenure"]'))
      .toBeVisible();
  });

test('first visible duty teaches its cadence and advances the cached schedule once',
  async function ({ page }, testInfo) {
    await startSerfFixture(page, testInfo, false);
    const due = await page.evaluate(function () {
      const s = FB.state;
      const tenure = FB.activeSerfTenure(s);
      for (let i = 0; i < tenure.duties.length; i++) {
        tenure.duties[i].nextDueTurn = s.turn + 900 + i;
      }
      const duty = tenure.duties[0];
      duty.nextDueTurn = s.turn;
      tenure.lastPresentedSeasonKey = null;
      delete s.player.flags.hint_serf_first_duty;
      FB.refreshSerfTenureDueCache(s, tenure);
      FB.tenureDay(s);
      const queued = s.eventQueue.splice(0);
      const oldTurn = duty.nextDueTurn;
      FB.ui.runEvents(queued);
      return { oldTurn:oldTurn, dutyId:duty.id };
    });

    const teaching = page.locator('[data-serf-duty-teaching]');
    const teachingDetails = teaching.locator('.event-duty-help-details');
    const teachingAnchor = teaching.locator('.event-duty-help-anchor');
    await expect(teaching).toBeVisible();
    expect(await teachingAnchor.evaluate(function (node) {
      return node.textContent.trim().length;
    })).toBeGreaterThan(20);
    await expect(teachingDetails).toHaveClass(/hidden/);
    await expect(teachingDetails.locator('.event-duty-valid li').first())
      .toBeAttached();
    await teachingAnchor.hover();
    await expect(page.locator('#tooltip')).toContainText('How this duty works');
    await expect(page.locator('#tooltip')).toContainText('Valid answers now');
    await page.setViewportSize({ width:390, height:844 });
    const dutyInfo = teaching.locator('.settcard-info');
    await expect(dutyInfo).toBeVisible();
    await teachingAnchor.click();
    await expect(teachingDetails).not.toHaveClass(/hidden/);
    await dutyInfo.click();
    await expect(teachingDetails).toHaveClass(/hidden/);
    await expect(page.locator('#ev-options .evopt').first()).toBeInViewport();
    await page.locator('#ev-options .evopt:not([disabled])').first().click();
    const after = await page.evaluate(function (dutyId) {
      const s = FB.state;
      const tenure = FB.activeSerfTenure(s);
      const duty = tenure.duties.filter(function (item) {
        return item.id === dutyId;
      })[0];
      return {
        flag:!!s.player.flags.hint_serf_first_duty,
        next:duty.nextDueTurn,
        cached:tenure.nextDutyTurn,
        receipts:s.log.filter(function (entry) {
          return entry.receipt && entry.receipt.eventId === duty.eventId;
        }).length
      };
    }, due.dutyId);
    expect(after.flag).toBe(true);
    expect(after.next).toBeGreaterThan(due.oldTurn);
    expect(after.cached).toBeGreaterThan(due.oldTurn);
    expect(after.receipts).toBe(1);
  });

test('major Automation resolves a due duty without consuming unseen teaching',
  async function ({ page }, testInfo) {
    await startSerfFixture(page, testInfo, false);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const tenure = FB.activeSerfTenure(s);
      for (let i = 0; i < tenure.duties.length; i++) {
        tenure.duties[i].nextDueTurn = s.turn + 900 + i;
      }
      const duty = tenure.duties[0];
      duty.nextDueTurn = s.turn;
      tenure.lastPresentedSeasonKey = null;
      delete s.player.flags.hint_serf_first_duty;
      FB.refreshSerfTenureDueCache(s, tenure);
      FB.game.auto.major = true;
      FB.game.auto.all = false;
      FB.game.auto.style = 'safe';
      FB.tenureDay(s);
      const queued = s.eventQueue.splice(0);
      const oldTurn = duty.nextDueTurn;
      FB.ui.runEvents(queued);
      return {
        oldTurn:oldTurn,
        nextTurn:duty.nextDueTurn,
        cachedTurn:tenure.nextDutyTurn,
        taught:!!s.player.flags.hint_serf_first_duty,
        receipts:s.log.filter(function (entry) {
          return entry.receipt && entry.receipt.eventId === duty.eventId;
        }).length
      };
    });
    expect(result.taught).toBe(false);
    expect(result.nextTurn).toBeGreaterThan(result.oldTurn);
    expect(result.cachedTurn).toBeGreaterThan(result.oldTurn);
    expect(result.receipts).toBe(1);
    await expect(page.locator('#eventmodal')).toHaveClass(/hidden/);
  });

test('scheduled duty help remains available after its teaching acknowledgement',
  async function ({ page }, testInfo) {
    await startSerfFixture(page, testInfo, false);
    await page.evaluate(function () {
      const s = FB.state;
      const tenure = FB.activeSerfTenure(s);
      for (let i = 0; i < tenure.duties.length; i++) {
        tenure.duties[i].nextDueTurn = s.turn + 900 + i;
      }
      tenure.duties[0].nextDueTurn = s.turn;
      tenure.lastPresentedSeasonKey = null;
      s.player.flags.hint_serf_first_duty = 1;
      FB.refreshSerfTenureDueCache(s, tenure);
      FB.tenureDay(s);
      FB.ui.runEvents(s.eventQueue.splice(0));
    });

    const teaching = page.locator('[data-serf-duty-teaching]');
    await expect(teaching).toBeVisible();
    await teaching.locator('.event-duty-help-anchor').hover();
    await expect(page.locator('#tooltip')).toBeVisible();
    await expect(page.locator('#tooltip')).toContainText('Valid answers now');
  });

test('unchanged daily tenure checks retain the cached pointer without rescanning duties',
  async function ({ page }, testInfo) {
    await startSerfFixture(page, testInfo, false);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const tenure = FB.activeSerfTenure(s);
      for (let i = 0; i < tenure.duties.length; i++) {
        tenure.duties[i].nextDueTurn = s.turn + 900 + i;
      }
      tenure.nextWarCheckTurn = s.turn + 90;
      FB.refreshSerfTenureDueCache(s, tenure);
      const expectedId = tenure.nextDutyId;
      const expectedTurn = tenure.nextDutyTurn;
      const originalRefresh = FB.refreshSerfTenureDueCache;
      let rescans = 0;
      FB.refreshSerfTenureDueCache = function (state, record) {
        rescans++;
        return originalRefresh(state, record);
      };
      for (let day = 0; day < 30; day++) {
        s.turn++;
        FB.tenureDay(s);
      }
      FB.refreshSerfTenureDueCache = originalRefresh;
      return {
        rescans:rescans,
        sameId:tenure.nextDutyId === expectedId,
        sameTurn:tenure.nextDutyTurn === expectedTurn,
        queueLength:s.eventQueue.length
      };
    });
    expect(result).toEqual({
      rescans:0, sameId:true, sameTurn:true, queueLength:0
    });
  });

test('offer terms, narrow layout, and lawful freedom share semantic hooks and history',
  async function ({ page }, testInfo) {
    await page.setViewportSize({ width:320, height:829 });
    await startSerfFixture(page, testInfo, false);
    const terms = await page.evaluate(function () {
      const s = FB.state;
      const lord = FB.getRole(s, 'lord', true);
      const target = { kind:'character', id:lord.id };
      FB.adjustStanding(s, target,
        60 - FB.standingOf(s, target), 'test:phase6_offer');
      s.player.gold = 500;
      const offer = FB.createFreedomOffer(s, 'petition');
      FB.ui.showRankDetails();
      return {
        price:offer.price,
        serviceDays:offer.serviceDays,
        revision:offer.tenureRevision
      };
    });

    const offer = page.locator('[data-serf-offer]');
    await expect(offer).toBeVisible();
    await expect(offer).toContainText(String(terms.price));
    await expect(offer).toContainText(String(terms.serviceDays));
    await expect(offer).toContainText('tenure revision ' + terms.revision);
    const geometry = await page.locator('[data-serf-tenure]').evaluate(
      function (node) {
        const rect = node.getBoundingClientRect();
        return { left:rect.left, right:rect.right, viewport:window.innerWidth };
      });
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewport + 1);
    expect(await page.locator('[data-tenure-home]').evaluate(function (node) {
      return node.getBoundingClientRect().height;
    })).toBeGreaterThanOrEqual(44);

    await page.locator('#rank-details-close').click();
    await page.evaluate(function () {
      const s = FB.state;
      const record = s.player.freedomOffer;
      s.eventQueue = [];
      FB.ui.runEvents([{
        id:'manumission',
        ctx:{
          offerCreatedTurn:record.createdTurn,
          lordId:record.lordId,
          protagonistId:record.protagonistId,
          locationId:record.provinceId,
          provinceId:record.provinceId,
          settlementIndex:record.settlementIndex,
          tenureFormedTurn:record.tenureFormedTurn,
          tenureRevision:record.tenureRevision,
          price:record.price,
          serviceDays:record.serviceDays,
          expiryTurn:record.expiryTurn
        }
      }]);
    });
    await expect(page.locator('[data-serf-offer-terms]')).toBeVisible();
    await expect(page.locator('[data-serf-offer-terms]'))
      .toContainText('material change to the named tenure invalidates');
    await expect(page.locator('#ev-options')).toContainText(
      'now and accept ' + terms.serviceDays + ' days of final service');
    await page.locator('#ev-options .evopt').last().click();
    const freed = await page.evaluate(function () {
      const s = FB.state;
      delete s.player.freedomOffer;
      s.player.gold = FB.freedomPurchasePrice(s);
      const result = FB.resolveSerfFreedom(s, { route:'purchase' }, {});
      return {
        resolved:!!result,
        tier:s.player.tier,
        tenure:s.player.tenure.status,
        taught:!!s.player.flags.hint_serf_freed,
        landmark:s.player.familyFreedom &&
          s.player.familyFreedom.first &&
          s.player.familyFreedom.first.route
      };
    });
    expect(freed).toEqual({
      resolved:true, tier:1, tenure:'closed', taught:true,
      landmark:'purchase'
    });
    await expect(page.locator('#toasts')).toContainText(
      'scheduled serf duties and serf-only restrictions no longer apply');
    await page.evaluate(function () { FB.ui.showTab('family'); });
    await expect(page.locator('[data-family-freedom]')).toBeVisible();
  });

test('lawful manumission keeps its normal receipt and shows first-freedom guidance through event suppression',
  async function ({ page }, testInfo) {
    await startSerfFixture(page, testInfo, false);
    await page.evaluate(function () {
      const s = FB.state;
      const lord = FB.getRole(s, 'lord', true);
      const target = { kind:'character', id:lord.id };
      FB.adjustStanding(s, target,
        40 - FB.standingOf(s, target), 'test:phase6_notice');
      s.player.gold = 500;
      const record = FB.createFreedomOffer(s, 'petition');
      FB.ui.runEvents([{
        id:'manumission',
        ctx:{
          offerCreatedTurn:record.createdTurn,
          lordId:record.lordId,
          protagonistId:record.protagonistId,
          locationId:record.provinceId,
          provinceId:record.provinceId,
          settlementIndex:record.settlementIndex,
          tenureFormedTurn:record.tenureFormedTurn,
          tenureRevision:record.tenureRevision,
          price:record.price,
          serviceDays:record.serviceDays,
          expiryTurn:record.expiryTurn
        }
      }]);
    });
    await page.locator('#ev-options .evopt:not([disabled])').first().click();
    await expect(page.locator('#toasts')).toContainText(
      'the first lawful freedom is recorded in Family landmarks');
    const result = await page.evaluate(function () {
      const s = FB.state;
      return {
        tier:s.player.tier,
        tenure:s.player.tenure.status,
        flag:!!s.player.flags.hint_serf_freed,
        route:s.player.familyFreedom.first.route,
        receipts:s.log.filter(function (entry) {
          return entry.receipt && entry.receipt.eventId === 'manumission';
        }).length
      };
    });
    expect(result).toEqual({
      tier:1, tenure:'closed', flag:true,
      route:'manumission', receipts:1
    });
  });

test('favorable offer survives save restoration and expires just after its stated turn',
  async function ({ page }, testInfo) {
    await startSerfFixture(page, testInfo, false);
    const result = await page.evaluate(function () {
      let s = FB.state;
      const lord = FB.getRole(s, 'lord', true);
      const target = { kind:'character', id:lord.id };
      FB.adjustStanding(s, target,
        60 - FB.standingOf(s, target), 'test:phase6_persistence');
      s.player.gold = 500;
      const offered = FB.createFreedomOffer(s, 'petition');
      const serialized = FB.save.serialize();
      FB.save.restore(JSON.parse(serialized));
      s = FB.state;
      const restored = s.player.freedomOffer;
      s.turn = restored.expiryTurn;
      const atBoundary = FB.freedomOfferView(s);
      s.turn = restored.expiryTurn + 1;
      const afterBoundary = FB.freedomOfferView(s);
      return {
        same:JSON.stringify(offered) === JSON.stringify(restored),
        atBoundary:atBoundary.status,
        afterBoundary:afterBoundary.status,
        acceptanceAfter:afterBoundary.acceptanceReady,
        hintStored:Object.prototype.hasOwnProperty.call(
          JSON.parse(serialized).state.player.flags,
          'hint_serf_offer_terms')
      };
    });
    expect(result).toEqual({
      same:true,
      atBoundary:'offered',
      afterBoundary:'expired',
      acceptanceAfter:false,
      hintStored:false
    });
  });

test('authority confirmation preserves regional terms and one amendment changes only its named duty',
  async function ({ page }, testInfo) {
    await startSerfFixture(page, testInfo, false);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const tenure = FB.activeSerfTenure(s);
      const oldLord = FB.getRole(s, 'lord', true);
      const regionalArchetype = tenure.archetypeId;
      const beforeConfirmation = JSON.stringify({
        duties:tenure.duties, rights:tenure.rights
      });
      FB.killChar(s, oldLord);
      s.eventQueue = [];
      FB.tenureDay(s);
      const confirmation = s.player.tenureTransition;
      const confirmed = confirmation && FB.resolveSerfTenureTransition(
        s, confirmation.revision, 'preserve');
      const confirmationPreserved = beforeConfirmation === JSON.stringify({
        duties:tenure.duties, rights:tenure.rights
      });

      const home = tenure.provinceId;
      const site = FB.world.sitesByProv[home].list[tenure.settlement];
      site.kind = 'village';
      tenure.archetypeId = 'dependent_farming';
      tenure.duties = [
        { id:'customary_labor', eventId:'serf_weekwork_tally',
          nextDueTurn:s.turn + 300, lastResolvedTurn:null },
        { id:'seasonal_harvest', eventId:'serf_boon_harvest',
          nextDueTurn:s.turn + 600, lastResolvedTurn:null }
      ];
      tenure.rights = [];
      tenure.revision = 0;
      tenure.transitionEligibleTurn = s.turn;
      tenure.authorityCheckpoint = FB.serfHomeAuthority(s);
      FB.refreshSerfTenureDueCache(s, tenure);
      const existingIds = tenure.duties.map(function (duty) {
        return duty.id;
      });
      const currentHolder = s.holder[home] || s.owner[home];
      const replacement = Object.keys(s.realms).filter(function (id) {
        return id !== 'player' && id !== currentHolder &&
          s.realms[id] && s.realms[id].alive;
      })[0];
      const beforeTransfer = FB.serfHomeAuthority(s);
      s.holder[home] = replacement;
      s.owner[home] = replacement;
      const afterTransfer = FB.serfHomeAuthority(s);
      FB.noteSerfHomeTransition(s, 'county_transfer',
        beforeTransfer, afterTransfer);
      s.eventQueue = [];
      FB.tenureDay(s);
      const amendment = s.player.tenureTransition;
      const namedDuty = amendment && amendment.proposal.additionalDutyId;
      const amended = amendment && amendment.proposal.kind === 'add_duty' &&
        FB.resolveSerfTenureTransition(s, amendment.revision, 'accept');
      const addedIds = tenure.duties.map(function (duty) {
        return duty.id;
      }).filter(function (id) { return existingIds.indexOf(id) < 0; });
      const view = FB.tenureView(s);
      return {
        confirmed:!!confirmed,
        confirmationPreserved:confirmationPreserved,
        regionalArchetype:regionalArchetype,
        amended:!!amended,
        namedDuty:namedDuty,
        addedIds:addedIds,
        rights:tenure.rights,
        revision:tenure.revision,
        viewArchetype:view.archetypeId,
        cached:view.nearestDueTurn === tenure.nextDutyTurn
      };
    });
    expect(result.confirmed).toBe(true);
    expect(result.confirmationPreserved).toBe(true);
    expect(result.regionalArchetype).toBeTruthy();
    expect(result.amended).toBe(true);
    expect(result.addedIds).toEqual([result.namedDuty]);
    expect(result.rights).toEqual([]);
    expect(result.revision).toBe(1);
    expect(result.viewArchetype).toBe('dependent_farming');
    expect(result.cached).toBe(true);
  });

test('succession preserves tenure and acknowledged coaching for the next household head',
  async function ({ page }, testInfo) {
    await startSerfFixture(page, testInfo, true);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const tenure = FB.activeSerfTenure(s);
      const me = s.chars[s.player.charId];
      const original = {
        formedTurn:tenure.formedTurn,
        nextDutyId:tenure.nextDutyId,
        nextDutyTurn:tenure.nextDutyTurn
      };
      s.player.flags.hint_serf_tenure = 1;
      s.player.flags.hint_serf_freedom_routes = 1;
      s.player.flags.hint_serf_first_duty = 1;
      const child = FB.makeCharacter(s, {
        name:'Phase Six Heir', sex:'f', born:s.date.year - 18,
        fatherId:me.sex === 'm' ? me.id : null,
        motherId:me.sex === 'f' ? me.id : null,
        culture:me.culture, religion:me.religion,
        dyn:me.dyn, traitsN:0
      });
      me.childrenIds = me.childrenIds || [];
      me.childrenIds.push(child.id);
      FB.game.succeedTo(child.id);
      const inherited = FB.activeSerfTenure(s);
      const onboarding = FB.serfOnboardingState(s);
      return {
        sameTenure:inherited.formedTurn === original.formedTurn &&
          inherited.nextDutyId === original.nextDutyId &&
          inherited.nextDutyTurn === original.nextDutyTurn,
        protagonist:s.player.charId,
        child:child.id,
        rankSeen:onboarding.rankRealmSeen,
        routesSeen:onboarding.freedomRoutesSeen,
        dutySeen:onboarding.firstDutySeen,
        coachRepeated:FB.ui.maybeSerfTenureTip()
      };
    });
    expect(result).toEqual({
      sameTenure:true,
      protagonist:result.child,
      child:result.child,
      rankSeen:true,
      routesSeen:true,
      dutySeen:true,
      coachRepeated:false
    });
  });

test('flight and forced settlement never masquerade as lawful freedom',
  async function ({ page }, testInfo) {
    await startSerfFixture(page, testInfo, false);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const flight = FB.resolveSerfFreedom(s, { route:'flight' }, {
        event:FB.eventById('flee_serfdom')
      });
      const afterFlight = {
        resolved:!!flight,
        lawful:!!(p.familyFreedom && p.familyFreedom.first &&
          p.familyFreedom.first.lawful),
        lawfulHint:!!p.flags.hint_serf_freed,
        tenureStatus:p.tenure.status
      };

      FB.setPlayerTier(s, 0, { formTenure:false });
      delete p.tenure;
      delete p.familyFreedom;
      delete p.flags.hint_serf_freed;
      FB.ensureSerfTenure(s, 'rank_change');
      const formerProvince = p.tenure.provinceId;
      const destination = p.home === 'paris' ? 'london' : 'paris';
      p.home = destination;
      p.provinceId = destination;
      p.homeSettlement = 0;
      p.settlement = 0;
      const replacement = FB.replaceSerfTenure(
        s, 'forced_settlement', 'forced_relocation');
      return {
        afterFlight:afterFlight,
        replacementActive:replacement.status === 'active',
        replacementReason:replacement.formedBy,
        replacedPrior:replacement.priorClosure &&
          replacement.priorClosure.provinceId === formerProvince,
        familyFreedom:!!p.familyFreedom,
        lawfulHint:!!p.flags.hint_serf_freed
      };
    });
    expect(result).toEqual({
      afterFlight:{
        resolved:true, lawful:false, lawfulHint:false,
        tenureStatus:'closed'
      },
      replacementActive:true,
      replacementReason:'forced_settlement',
      replacedPrior:true,
      familyFreedom:false,
      lawfulHint:false
    });
  });
