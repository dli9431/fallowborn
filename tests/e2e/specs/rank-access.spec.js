'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/actions.js',
  'js/actions.js',
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
