'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/actions.js',
  'js/actions.js',
  'js/events.js',
  'js/world.js',
  'js/lordships.js',
  'data/map_data.js',
  'data/events_common.js',
  'js/ui_misc.js',
  'css/style.css',
  'js/model.js',
  'js/ui_modals.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('warm ruler contacts retain class distance and a serf needs exceptional Standing for friendship', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player;
    p.tier = 0; p.gold = 1000; p.courtingId = null;
    p.socialAttention = {}; p.friendContacts = {};
    delete s.roles.friend;
    const lord = FB.getRole(s, 'lord', true);
    lord.opinion = 40;
    FB.noteFriendContact(s, lord);
    FB.socialAttentionAssign(s, lord);
    const warm = FB.socialAttentionStatus(s, lord);
    const gift = FB.characterGiftStatus(s, lord.id);
    const tooSoon = FB.nameFriend(s, lord);
    lord.opinion = 79;
    const automaticTooSoon = FB.attentionFriendCandidate(s);
    const remaining = FB.socialAttentionDaysToThreshold(s, lord);
    lord.opinion = 80;
    const named = FB.nameFriend(s, lord);
    const friendAccess = FB.rankAccessStatus(s, { kind:'character', id:lord.id });
    const priest = FB.getRole(s, 'priest', true);
    priest.opinion = 40; FB.noteFriendContact(s, priest);
    const ordinary = FB.friendshipStatus(s, priest);
    return { threshold:FB.friendshipStandingThreshold(s, lord), rate:warm.rate,
      giftCost:gift.cost, giftStanding:gift.standing, tooSoon:tooSoon,
      automaticTooSoon:automaticTooSoon === null, remaining:remaining,
      named:named, friendMultiplier:friendAccess.standingMultiplier,
      ordinaryThreshold:ordinary.threshold, ordinaryReady:ordinary.ready };
  });
  expect(result).toEqual({ threshold:80, rate:0.05, giftCost:20, giftStanding:1,
    tooSoon:false, automaticTooSoon:true, remaining:20, named:true,
    friendMultiplier:0.25, ordinaryThreshold:40, ordinaryReady:true });
});

test('Standing Surety excludes the local ruler and invalidates previously queued testimony', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player, pid = p.provinceId;
    p.tier = 0;
    const event = FB.eventById('friend_vouch');
    const lord = FB.getRole(s, 'lord', true);
    s.roles.friend = lord.id; lord.opinion = 80;
    const localContext = FB.eventContext(s, { locationId:pid });
    FB.ensureEventParticipants(s, event, localContext);
    const localBlocked = !FB.checkTrigger(s, event.trigger, localContext);
    const localStale = !FB.eventContextStillValid(s, event, localContext);
    const chain = FB.liegeChain(s, FB.homeCountyAuthority(s).realmId);
    const foreignId = Object.keys(s.realms).find(function (id) {
      return id !== 'player' && s.realms[id].alive && chain.indexOf(id) < 0;
    });
    const foreign = FB.materializeRealmRuler(s, foreignId);
    s.roles.friend = foreign.id;
    const foreignEligible = FB.fns.friend_vouch_valid(s, FB.eventContext(s, { locationId:pid }));
    const ordinary = FB.makeCharacter(s, { name:'Grain Witness', born:s.date.year - 30,
      station:0, homeCounty:pid, traitsN:0 });
    ordinary.opinion = 50; s.roles.friend = ordinary.id;
    const ctx = FB.eventContext(s, { locationId:pid });
    FB.ensureEventParticipants(s, event, ctx);
    const eligible = FB.fns.friend_vouch_valid(s, ctx);
    const rid = FB.homeCountyAuthority(s).realmId;
    const realm = s.realms[rid], member = realm.succession.members[realm.succession.rulerMemberId];
    member.charId = ordinary.id;
    FB.rebuildRulerIndex(s);
    const promotedStale = !FB.eventContextStillValid(s, event, ctx);
    const before = { gold:p.gold, prestige:p.prestige, standing:ordinary.opinion, rng:FB.getRngState() };
    const rejected = FB.resolveEventOption(s, event, event.options[0], ctx) === false;
    return { localBlocked:localBlocked, localStale:localStale, foreignEligible:foreignEligible, eligible:eligible,
      promotedStale:promotedStale, rejected:rejected,
      unchanged:JSON.stringify(before) === JSON.stringify({ gold:p.gold,
        prestige:p.prestige, standing:ordinary.opinion, rng:FB.getRngState() }) };
  });
  expect(result).toEqual({ localBlocked:true, localStale:true, foreignEligible:true, eligible:true,
    promotedStale:true, rejected:true, unchanged:true });
});

test('a lowborn household reaches its lord through a warm intermediary ladder',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      p.tier = 0;
      p.gold = 100;
      p.profession = 'farmer';
      p.war = null;
      p.courtingId = null;
      p.socialAttention = {};
      p.friendContacts = {};
      delete p.flags.lords_favor;
      delete p.flags.on_campaign;
      delete p.flags.with_liege_host;
      for (const rid in s.realms) s.realms[rid].war = null;

      const lord = FB.getRole(s, 'lord', true);
      const steward = FB.getRole(s, 'steward', true);
      const priest = FB.getRole(s, 'priest', true);
      priest.opinion = 0;
      steward.opinion = 0;
      lord.opinion = 0;

      const firstPriest = FB.rankAccessStatus(s, {
        kind:'character', id:priest.id
      });
      const firstSteward = FB.rankAccessStatus(s, {
        kind:'character', id:steward.id
      });
      const firstLord = FB.rankAccessStatus(s, {
        kind:'character', id:lord.id
      });
      const firstCourtship = FB.courtshipStatus(s, lord, false);

      priest.opinion = FB.relationshipOpinionThreshold();
      FB.noteFriendContact(s, priest);
      const priestIntroducesSteward = FB.rankAccessStatus(s, {
        kind:'character', id:steward.id
      });
      const lordStillBlocked = FB.rankAccessStatus(s, {
        kind:'character', id:lord.id
      });

      steward.opinion = FB.relationshipOpinionThreshold();
      FB.noteFriendContact(s, steward);
      const brokeredLord = FB.rankAccessStatus(s, {
        kind:'character', id:lord.id
      });
      const brokeredCourtship = FB.courtshipStatus(s, lord, false);
      const cash = FB.characterGiftStatus(s, lord.id);
      const attention = FB.socialAttentionStatus(s, lord);
      const assigned = FB.socialAttentionAssign(s, lord);
      const ref = FB.issueItem(s, 'silver_ring');
      const item = FB.resolveItem(s, ref);
      const itemGift = FB.itemGiftStatus(s, ref, 'character', lord.id);
      const realmId = Object.keys(s.realms).filter(function (rid) {
        return rid !== 'player' && s.realms[rid].alive &&
          s.realms[rid].rank <= 2;
      })[0];
      const rulerAccess = FB.rankAccessStatus(s, {
        kind:'realm', id:realmId
      });
      const rulerGift = FB.rulerGiftStatus(s, realmId);
      const rulerItemGift = FB.itemGiftStatus(s, ref, 'ruler', realmId);
      const card = FB.ui.characterInteractionCard(s, lord.id);
      const accessRow = card.context.filter(function (row) {
        return row.label === FB.T('Access');
      })[0];

      p.friendContacts = {};
      p.socialAttention = {};
      p.flags.on_campaign = 1;
      const wartimeLord = FB.rankAccessStatus(s, {
        kind:'character', id:lord.id
      });
      const stranger = FB.makeCharacter(s, {
        name:'Distant Noble', sex:'f',
        culture:lord.culture, religion:lord.religion,
        born:s.date.year - 35, station:3, traitsN:0
      });
      const wartimeStranger = FB.rankAccessStatus(s, {
        kind:'character', id:stranger.id
      });

      return {
        roles:{
          priest:FB.stationOf(priest),
          steward:FB.stationOf(steward),
          lord:FB.stationOf(lord)
        },
        first:{
          priest:firstPriest.ready,
          steward:firstSteward.ready,
          stewardNeeded:firstSteward.neededStation,
          lord:firstLord.ready,
          courtship:firstCourtship.ready,
          courtshipCode:firstCourtship.code
        },
        afterPriest:{
          steward:priestIntroducesSteward.ready,
          lord:lordStillBlocked.ready,
          lordNeeded:lordStillBlocked.neededStation
        },
        brokered:{
          ready:brokeredLord.ready,
          mode:brokeredLord.mode,
          intermediaries:brokeredLord.intermediaries,
          standingMultiplier:brokeredLord.standingMultiplier,
          cashMultiplier:brokeredLord.cashMultiplier
        },
        brokeredCourtship:brokeredCourtship.ready,
        cash:{
          ready:cash.ready,
          cost:cash.cost,
          standing:cash.standing
        },
        attention:{ ready:attention.ready, rate:attention.rate, assigned:assigned },
        item:{
          ready:itemGift.ready,
          base:FB.giftOpinion(item),
          standing:itemGift.standing
        },
        ruler:{
          access:rulerAccess.ready,
          baseCost:rulerGift.baseCost,
          cost:rulerGift.cost,
          standing:rulerGift.standing,
          itemStanding:rulerItemGift.standing
        },
        accessRow:accessRow && accessRow.value,
        wartime:{
          lordReady:wartimeLord.ready,
          lordMode:wartimeLord.mode,
          strangerReady:wartimeStranger.ready
        }
      };
    });

    expect(result.roles).toEqual({ priest:1, steward:2, lord:3 });
    expect(result.first).toEqual({
      priest:true,
      steward:false,
      stewardNeeded:1,
      lord:false,
      courtship:false,
      courtshipCode:'access'
    });
    expect(result.afterPriest).toEqual({
      steward:true,
      lord:false,
      lordNeeded:2
    });
    expect(result.brokered.ready).toBe(true);
    expect(result.brokered.mode).toBe('brokered');
    expect(result.brokered.intermediaries).toEqual(expect.any(Array));
    expect(result.brokered.intermediaries).toHaveLength(2);
    expect(result.brokered.standingMultiplier).toBe(0.25);
    expect(result.brokered.cashMultiplier).toBe(4);
    expect(result.brokeredCourtship).toBe(true);
    expect(result.cash).toEqual({ ready:true, cost:20, standing:1 });
    expect(result.attention).toEqual({ ready:true, rate:0.05, assigned:true });
    expect(result.item.ready).toBe(true);
    expect(result.item.standing).toBe(result.item.base * 0.25);
    expect(result.ruler.access).toBe(true);
    expect(result.ruler.cost).toBe(result.ruler.baseCost * 4);
    expect(result.ruler.standing).toBe(3.8);
    expect(result.ruler.itemStanding).toBe(result.item.base * 0.25);
    expect(result.accessRow).toContain('25%');
    expect(result.wartime).toEqual({
      lordReady:true,
      lordMode:'wartime',
      strangerReady:false
    });
  });


test('a serf can follow the visible Freeholder introduction and cultivate the priest', async function ({ page }) {
  const ids = await page.evaluate(function () {
    const s = FB.state;
    FB.setPlayerTier(s, 0, { tenureFormationReason:'rank_change' });
    s.player.friendContacts = {};
    s.player.socialAttention = {};
    s.player.courtingId = null;
    s.player.war = null;
    const steward = FB.getRole(s, 'steward', true);
    const priest = FB.getRole(s, 'priest', true);
    FB.ui.showCharModal(steward.id);
    return { priest:priest.id, steward:steward.id };
  });
  await expect(page.locator('[data-social-access-route]')).toContainText('Freeholder');
  const introduction = page.locator('[data-social-intermediary="' + ids.priest + '"]');
  await expect(introduction.locator('canvas')).toBeVisible();
  await introduction.click();
  const cultivate = page.locator('[data-interaction-action="relationship.attention.assign"]');
  await expect(cultivate).toBeEnabled();
  await cultivate.click();
  expect(await page.evaluate(function (id) {
    return !!FB.state.player.socialAttention[id];
  }, ids.priest)).toBe(true);
});
