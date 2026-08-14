'use strict';

const { test, expect } = require('../support/fixture');
const { openGame, startDeterministicGame } = require('../support/game');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('bounded item auctions fix their rival, survive restore, and clean temporary lots',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      let state = FB.state;
      const originalItems = FBDATA.items;
      const originalWeights = FBDATA.balance.auctionLotWeights;
      let output;
      try {
        FBDATA.items = {
          auction_item_fixture:{
            name:'Auction Fixture', icon:'book', rarity:'fine', value:40,
            unique:false, slot:'hand', fx:{}, art:{ kind:'book' },
            desc:'A deterministic auction test item.'
          }
        };
        FBDATA.balance.auctionLotWeights = { item:1, enterprise:0, claim:0 };
        state.player.gold = 500;
        state.dev[state.player.provinceId] = 7;
        const venue = FB.auctionVenues(state)[0];
        const auctionDeed = FB.instantStatus(state, 'attend_auction');
        const deedListed = FB.listInstants(state).some(function (item) {
          return item.a.id === 'attend_auction';
        });
        const opened = FB.beginAuction(state, venue);
        const openedRef = opened && opened.lot.ref;
        const duplicateBlocked = FB.beginAuction(state, venue) === null;
        const saved = JSON.parse(FB.save.serialize());
        FB.save.restore(saved);
        state = FB.state;
        const restored = FB.auctionOf(state);
        const restoredRival = restored && restored.rivalMaximum;
        restored.rivalMaximum = restored.currentBid;
        const won = FB.placeAuctionBid(state, 1);
        const owner = FB.itemOwner(state, openedRef);

        const cancelled = FB.beginAuction(state, FB.auctionVenues(state)[0]);
        const cancelledRef = cancelled.lot.ref;
        const cancelledOk = FB.cancelAuction(state);

        const lost = FB.beginAuction(state, FB.auctionVenues(state)[0]);
        lost.rivalMaximum = 999999;
        const goldBeforeLoss = state.player.gold;
        const first = FB.placeAuctionBid(state, 1);
        const second = FB.placeAuctionBid(state, 1);
        const third = FB.placeAuctionBid(state, 1);
        const lossGoldUnchanged = state.player.gold === goldBeforeLoss;

        const opener = document.createElement('button');
        opener.textContent = 'Auction opener';
        opener.setAttribute('data-action-id', 'attend_auction');
        document.body.appendChild(opener);
        opener.focus();
        state.player.gold = 0;
        const uiAuction = FB.beginAuction(state, FB.auctionVenues(state)[0]);
        FB.ui.showAuction();
        const disabledBids = document.querySelectorAll(
          '[data-auction-bid][disabled]').length;
        const auctionHeading = document.getElementById('gm-title').textContent;
        FB.ui.closeModal();
        const focusRestored = document.activeElement === opener;
        FB.cancelAuction(state);
        opener.remove();

        output = {
          opened:opened && {
            kind:opened.lot.kind,
            venue:opened.venue,
            openingBid:opened.openingBid,
            bidIncrement:opened.bidIncrement,
            rivalMaximum:opened.rivalMaximum,
            bidCount:opened.bidCount
          },
          auctionDeed:{ shown:auctionDeed.shown, can:auctionDeed.can },
          deedListed:deedListed,
          duplicateBlocked:duplicateBlocked,
          restoredRival:restoredRival,
          won:won,
          owner:owner && owner.kind,
          cancelledOk:cancelledOk,
          cancelledRemoved:!state.itemInstances[cancelledRef],
          lossStatuses:[first && first.status, second && second.status,
            third && third.status],
          lossGoldUnchanged:lossGoldUnchanged,
          noNegativeGold:state.player.gold >= 0,
          disabledBids:disabledBids,
          auctionHeading:auctionHeading,
          focusRestored:focusRestored,
          uiOpened:!!uiAuction
        };
        FB.transferItem(state, openedRef, null, { force:true });
        delete state.itemInstances[openedRef];
      } finally {
        FBDATA.items = originalItems;
        FBDATA.balance.auctionLotWeights = originalWeights;
      }
      return output;
    });

    expect(result.opened).toMatchObject({
      kind:'item', bidCount:0,
      venue:expect.objectContaining({ provinceId:expect.any(String) })
    });
    expect(result.opened.openingBid).toBeGreaterThan(0);
    expect(result.opened.bidIncrement).toBeGreaterThan(0);
    expect(result.auctionDeed).toEqual({ shown:true, can:true });
    expect(result.deedListed).toBe(true);
    expect(result.duplicateBlocked).toBe(true);
    expect(result.restoredRival).toBe(result.opened.rivalMaximum);
    expect(result.won).toMatchObject({ status:'won', awarded:{ kind:'item' } });
    expect(result.owner).toBe('armory');
    expect(result.cancelledOk).toBe(true);
    expect(result.cancelledRemoved).toBe(true);
    expect(result.lossStatuses).toEqual(['countered', 'countered', 'lost']);
    expect(result.lossGoldUnchanged).toBe(true);
    expect(result.noNegativeGold).toBe(true);
    expect(result.uiOpened).toBe(true);
    expect(result.disabledBids).toBe(3);
    expect(result.auctionHeading).toContain('Auction at');
    expect(result.focusRestored).toBe(true);
  });

test('auctioned claims and enterprises use their existing transfer paths',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      let state = FB.state;
      const originalEnterprises = FBDATA.enterprises;
      const originalWeights = FBDATA.balance.auctionLotWeights;
      let output;
      try {
        const home = state.player.provinceId;
        const me = state.chars[state.player.charId];
        state.player.tier = 4;
        state.player.provs = [home];
        state.player.liege = null;
        state.player.gold = 500;
        state.player.fabricatedClaim = null;
        state.dev[home] = 7;
        FB.foundPlayerRealm(state);
        const claimCandidates = FB.claimCandidates(state);
        FBDATA.balance.auctionLotWeights = { item:0, enterprise:0, claim:1 };
        const claimAuction = FB.beginAuction(state, FB.auctionVenues(state)[0]);
        claimAuction.rivalMaximum = claimAuction.currentBid;
        const claimWin = FB.placeAuctionBid(state, 1);
        const claim = state.player.fabricatedClaim;
        const fabricationBlocked = FB.claimCandidates(state).length === 0;
        const lawfulCause = FB.warCauses(state, true).filter(function (cause) {
          return cause.type === 'fabricated' && claim && cause.target === claim.pid;
        })[0];
        state.player.war = {
          enemy:state.owner[claim.pid], target:claim.pid,
          wins:0, losses:0, seasons:0, defending:false,
          casus:{ type:'fabricated', target:claim.pid }
        };
        FB.warCapture(state);
        const claimCleared = !state.player.fabricatedClaim;

        state.player.tier = 1;
        state.player.provinceId = home;
        state.player.provs = [];
        me.career = {
          profession:'farmer', rank:'journeyman', experience:3,
          startedYear:state.date.year - 3, guildRank:'none', guildStanding:0,
          chosen:true
        };
        FB.syncPlayerCareer(state);
        FBDATA.enterprises = {
          auction_enterprise_fixture:{
            name:'Auction Workshop', icon:'house', cost:40, profession:'farmer',
            yield:2, devMin:1, tags:['fixture'],
            desc:'A deterministic auction enterprise.'
          }
        };
        FBDATA.balance.auctionLotWeights = { item:0, enterprise:1, claim:0 };
        const venue = FB.auctionVenues(state)[0];
        const availableBefore = FB.enterpriseAvailable(state, venue.provinceId,
          venue.settlement).length;
        const enterpriseAuction = FB.beginAuction(state, venue);
        enterpriseAuction.rivalMaximum = enterpriseAuction.currentBid;
        const enterpriseWin = FB.placeAuctionBid(state, 1);
        const enterprise = state.player.enterprises.filter(function (entry) {
          return entry.type === 'auction_enterprise_fixture';
        })[0];
        const staffedYield = FB.enterpriseYield(state, enterprise);
        const remote = FB.world.provs.filter(function (province) {
          return !province.wasteland && province.id !== home;
        })[0].id;
        state.player.provinceId = remote;
        FB.enterpriseList(state);
        output = {
          claimCandidates:claimCandidates.length,
          claimLot:claimAuction.lot.kind,
          claimWin:claimWin,
          claim:claim,
          fabricationBlocked:fabricationBlocked,
          lawfulCause:lawfulCause && lawfulCause.type,
          claimCleared:claimCleared,
          availableBefore:availableBefore,
          enterpriseLot:enterpriseAuction.lot.kind,
          enterpriseWin:enterpriseWin,
          enterpriseSite:enterprise && {
            provinceId:enterprise.provinceId, settlement:enterprise.settlement
          },
          staffedYield:staffedYield,
          idleAfterMove:enterprise && !enterprise.workerId &&
            FB.enterpriseYield(state, enterprise) === 0
        };
      } finally {
        FBDATA.enterprises = originalEnterprises;
        FBDATA.balance.auctionLotWeights = originalWeights;
      }
      return output;
    });

    expect(result.claimCandidates).toBeGreaterThan(0);
    expect(result.claimLot).toBe('claim');
    expect(result.claimWin).toMatchObject({
      status:'won', awarded:{ kind:'claim' }
    });
    expect(result.claim).toMatchObject({ source:'auction', madeTurn:expect.any(Number) });
    expect(result.fabricationBlocked).toBe(true);
    expect(result.lawfulCause).toBe('fabricated');
    expect(result.claimCleared).toBe(true);
    expect(result.availableBefore).toBeGreaterThan(0);
    expect(result.enterpriseLot).toBe('enterprise');
    expect(result.enterpriseWin).toMatchObject({
      status:'won', awarded:{ kind:'enterprise' }
    });
    expect(result.enterpriseSite).toMatchObject({ provinceId:expect.any(String) });
    expect(result.staffedYield).toBeGreaterThan(0);
    expect(result.idleAfterMove).toBe(true);
  });
