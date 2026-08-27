'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/actions.js',
  'js/actions.js',
  'js/economy.js',
  'js/items.js',
  'js/market.js',
  'js/ui_modals.js',
  'data/economy.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('bounded item auctions fix their rival, survive restore, and clean temporary lots',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      let state = FB.state;
      const originalItems = FBDATA.items;
      const originalLotTypes = FBDATA.auctionLotTypes;
      let output;
      try {
        FBDATA.items = {
          auction_item_fixture:{
            name:'Auction Fixture', icon:'book', rarity:'fine', value:40,
            unique:false, slot:'hand', fx:{}, art:{ kind:'book' },
            desc:'A deterministic auction test item.'
          }
        };
        FBDATA.auctionLotTypes = {
          item:{ weight:1 }, enterprise:{ weight:0 }, claim:{ weight:0 }
        };
        state.player.gold = 500;
        state.dev[state.player.provinceId] = 7;
        const venue = FB.auctionVenues(state)[0];
        state.player.flags = state.player.flags || {};
        state.player.flags.in_prison = 1;
        const captivityBlocked = FB.beginAuction(state, venue) === null;
        delete state.player.flags.in_prison;
        const invalidVenueBlocked = FB.beginAuction(state, {
          provinceId:'missing_auction_venue', settlement:0
        }) === null;
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
        const immediateRetryBlocked =
          FB.beginAuction(state, FB.auctionVenues(state)[0]) === null;
        const cooldownAfterWin = FB.auctionCooldownRemaining(state);

        state.turn += FBDATA.balance.auctionCooldownDays;
        const cancelled = FB.beginAuction(state, FB.auctionVenues(state)[0]);
        const cancelledRef = cancelled.lot.ref;
        cancelled.rivalMaximum = 999999;
        const goldBeforeCancel = state.player.gold;
        const cancelledBid = FB.placeAuctionBid(state, 1);
        const cancelledOk = FB.cancelAuction(state);
        const cancelGoldUnchanged = state.player.gold === goldBeforeCancel;
        const cancelMessage = FB.newsText(state.log[state.log.length - 1],
          state, state.player.charId);
        const invitationBlockedAfterCancel =
          !FB.fns.auction_invitation_available(state);

        state.turn += FBDATA.balance.auctionCooldownDays;
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
        state.turn += FBDATA.balance.auctionCooldownDays;
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
          captivityBlocked:captivityBlocked,
          invalidVenueBlocked:invalidVenueBlocked,
          deedListed:deedListed,
          duplicateBlocked:duplicateBlocked,
          restoredRival:restoredRival,
          won:won,
          owner:owner && owner.kind,
          immediateRetryBlocked:immediateRetryBlocked,
          cooldownAfterWin:cooldownAfterWin,
          cancelledBid:cancelledBid && cancelledBid.status,
          cancelledOk:cancelledOk,
          cancelGoldUnchanged:cancelGoldUnchanged,
          cancelMessage:cancelMessage,
          invitationBlockedAfterCancel:invitationBlockedAfterCancel,
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
        FBDATA.auctionLotTypes = originalLotTypes;
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
    expect(result.captivityBlocked).toBe(true);
    expect(result.invalidVenueBlocked).toBe(true);
    expect(result.deedListed).toBe(true);
    expect(result.duplicateBlocked).toBe(true);
    expect(result.restoredRival).toBe(result.opened.rivalMaximum);
    expect(result.won).toMatchObject({ status:'won', awarded:{ kind:'item' } });
    expect(result.owner).toBe('armory');
    expect(result.immediateRetryBlocked).toBe(true);
    expect(result.cooldownAfterWin).toBeGreaterThan(0);
    expect(result.cancelledBid).toBe('countered');
    expect(result.cancelledOk).toBe(true);
    expect(result.cancelGoldUnchanged).toBe(true);
    expect(result.cancelMessage).toContain('purse stays closed');
    expect(result.invitationBlockedAfterCancel).toBe(true);
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
      const originalLotTypes = FBDATA.auctionLotTypes;
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
        const technology = FB.realmTechRecord(state);
        if (technology.completed.indexOf('notarial_contracts') < 0) {
          technology.completed.push('notarial_contracts');
        }
        const claimCandidates = FB.claimCandidates(state);
        FBDATA.auctionLotTypes = {
          item:{ weight:0 }, enterprise:{ weight:0 },
          claim:{ weight:1, requiresTech:'notarial_contracts' }
        };
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
        const strongpoint = FB.fortSiegeStatus(state, claim.pid, {}, 0);
        state.player.war.siegeFortLevel = strongpoint.level;
        state.player.war.siege = strongpoint.required;
        FB.warCapture(state);
        const claimCleared = !state.player.fabricatedClaim;

        state.turn += FBDATA.balance.auctionCooldownDays;
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
            yield:2, devMin:1, tags:['fixture'], requiresTech:'horizontal_loom',
            desc:'A deterministic auction enterprise.'
          }
        };
        FBDATA.auctionLotTypes = {
          item:{ weight:0 }, enterprise:{ weight:1 }, claim:{ weight:0 }
        };
        const venue = FB.auctionVenues(state)[0];
        technology.completed = technology.completed.filter(function (id) {
          return id !== 'horizontal_loom';
        });
        const availableWhileLocked = FB.enterpriseAvailable(state,
          venue.provinceId, venue.settlement).length;
        technology.completed.push('horizontal_loom');
        const availableBefore = FB.enterpriseAvailable(state, venue.provinceId,
          venue.settlement).length;
        const enterpriseAuction = FB.beginAuction(state, venue);
        technology.completed = technology.completed.filter(function (id) {
          return id !== 'horizontal_loom';
        });
        const enterpriseGrandfathered = !!FB.auctionOf(state);
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
          availableWhileLocked:availableWhileLocked,
          availableBefore:availableBefore,
          enterpriseGrandfathered:enterpriseGrandfathered,
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
        FBDATA.auctionLotTypes = originalLotTypes;
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
    expect(result.availableWhileLocked).toBe(0);
    expect(result.availableBefore).toBeGreaterThan(0);
    expect(result.enterpriseGrandfathered).toBe(true);
    expect(result.enterpriseLot).toBe('enterprise');
    expect(result.enterpriseWin).toMatchObject({
      status:'won', awarded:{ kind:'enterprise' }
    });
    expect(result.enterpriseSite).toMatchObject({ provinceId:expect.any(String) });
    expect(result.staffedYield).toBeGreaterThan(0);
    expect(result.idleAfterMove).toBe(true);
  });

test('guild routes use balanced technology gates and interactive invitations stay manual',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const c = s.chars[s.player.charId];
      const technology = FB.realmTechRecord(s);
      const originalStandingMax = FBDATA.balance.guildStandingMax;
      const brokerDefinition = FBDATA.careers.merchant.specializations.broker;
      const originalBrokerRequirement = brokerDefinition.requiresTech;
      function addTech(id) {
        if (technology.completed.indexOf(id) < 0) technology.completed.push(id);
      }
      function removeTech(id) {
        technology.completed = technology.completed.filter(function (entry) {
          return entry !== id;
        });
      }
      function bySpecialization(list) {
        const out = {};
        list.forEach(function (entry) { out[entry.specialization] = entry; });
        return out;
      }
      let output;
      try {
        s.player.tier = 1;
        s.player.gold = 100;
        c.skills.ste = 9;
        addTech('bloomery_iron');
        addTech('weights_measures');
        removeTech('horizontal_loom');
        removeTech('cooperage');
        removeTech('trade_houses');
        removeTech('coastal_piloting');
        c.career = {
          profession:'craftsman', rank:'master', experience:12,
          startedYear:s.date.year - 12, guildRank:'guildmaster',
          guildStanding:35, chosen:true
        };
        FB.syncPlayerCareer(s);
        const craftLocked = bySpecialization(
          FB.careerSpecializationOptions(s, c));
        const lockedChoice = FB.chooseCareerSpecialization(s, c, 'weaver');
        addTech('horizontal_loom');
        const craftUnlocked = bySpecialization(
          FB.careerSpecializationOptions(s, c));
        const chosen = FB.chooseCareerSpecialization(s, c, 'weaver');
        const chosenSpecialization = c.career.specialization;

        c.career = {
          profession:'merchant', rank:'master', experience:12,
          startedYear:s.date.year - 12, guildRank:'guildmaster',
          guildStanding:35, chosen:true
        };
        FB.syncPlayerCareer(s);
        const tradeLocked = bySpecialization(
          FB.careerSpecializationOptions(s, c));
        removeTech('urban_markets');
        removeTech('authenticated_seals');
        brokerDefinition.requiresTech = ['urban_markets','authenticated_seals'];
        const arrayRequirement = bySpecialization(
          FB.careerSpecializationOptions(s, c)).broker;
        if (originalBrokerRequirement === undefined) {
          delete brokerDefinition.requiresTech;
        } else {
          brokerDefinition.requiresTech = originalBrokerRequirement;
        }
        addTech('coastal_piloting');
        const tradeUnlocked = bySpecialization(
          FB.careerSpecializationOptions(s, c));

        FBDATA.balance.guildStandingMax = 42;
        c.career.guildStanding = 41;
        const standingLedger = FB.applyEffects(s, { guildStanding:10 }, {}, null);

        const invitation = FB.eventById('rare_auction_invitation');
        const attend = invitation.options[0];
        const beforeAutomatic = FB.save.serialize();
        const rngBeforeAutomatic = FB.getRngState();
        const automated = FB.resolveEventOption(s, invitation, attend, {}, {
          automated:true
        });
        output = {
          definitions:{
            smith:FBDATA.careers.craftsman.specializations.smith.requiresTech || null,
            broker:FBDATA.careers.merchant.specializations.broker.requiresTech || null,
            maritime:FBDATA.careers.merchant.specializations.maritime_factor.requiresTech
          },
          craftLocked:{
            smith:craftLocked.smith.ready,
            weaver:craftLocked.weaver.ready,
            weaverMissing:craftLocked.weaver.missing.join(' | '),
            cooper:craftLocked.cooper.ready,
            smithRequirements:craftLocked.smith.requirements
          },
          lockedChoice:lockedChoice,
          weaverUnlocked:craftUnlocked.weaver.ready,
          chosen:!!chosen,
          chosenSpecialization:chosenSpecialization,
          tradeLocked:{
            broker:tradeLocked.broker.ready,
            caravan:tradeLocked.caravan_factor.ready,
            maritime:tradeLocked.maritime_factor.ready,
            maritimeMissing:tradeLocked.maritime_factor.missing.join(' | ')
          },
          maritimeUnlocked:tradeUnlocked.maritime_factor.ready,
          arrayRequirement:{
            ready:arrayRequirement.ready,
            missing:arrayRequirement.missing.join(' | ')
          },
          standing:{
            value:c.career.guildStanding,
            previewRegistered:FB.eventPreviewEffectKeys.guildStanding,
            impact:standingLedger.filter(function (entry) {
              return entry.type === 'guildStanding';
            })[0]
          },
          invitation:{
            manualOnly:attend.manualOnly,
            automated:automated,
            unchanged:beforeAutomatic === FB.save.serialize() &&
              rngBeforeAutomatic === FB.getRngState()
          }
        };
      } finally {
        FBDATA.balance.guildStandingMax = originalStandingMax;
        if (originalBrokerRequirement === undefined) {
          delete brokerDefinition.requiresTech;
        } else {
          brokerDefinition.requiresTech = originalBrokerRequirement;
        }
      }
      return output;
    });

    expect(result.definitions).toEqual({
      smith:null, broker:null, maritime:'coastal_piloting'
    });
    expect(result.craftLocked.smith).toBe(true);
    expect(result.craftLocked.weaver).toBe(false);
    expect(result.craftLocked.weaverMissing).toContain('Horizontal Loom');
    expect(result.craftLocked.cooper).toBe(false);
    expect(result.craftLocked.smithRequirements.join(' | ')).toContain(
      'Guild Standing 35');
    expect(result.craftLocked.smithRequirements.join(' | ')).toContain(
      'Stewardship 9');
    expect(result.lockedChoice).toBe(false);
    expect(result.weaverUnlocked).toBe(true);
    expect(result.chosen).toBe(true);
    expect(result.chosenSpecialization).toBe('weaver');
    expect(result.tradeLocked.broker).toBe(true);
    expect(result.tradeLocked.caravan).toBe(false);
    expect(result.tradeLocked.maritime).toBe(false);
    expect(result.tradeLocked.maritimeMissing).toContain('Coastal Piloting');
    expect(result.maritimeUnlocked).toBe(true);
    expect(result.arrayRequirement.ready).toBe(false);
    expect(result.arrayRequirement.missing).toContain('Urban Markets');
    expect(result.arrayRequirement.missing).toContain('Authenticated Seals');
    expect(result.standing.value).toBe(42);
    expect(result.standing.previewRegistered).toBe(true);
    expect(result.standing.impact).toMatchObject({ amount:1 });
    expect(result.invitation).toEqual({
      manualOnly:true, automated:false, unchanged:true
    });
  });
