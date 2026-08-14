'use strict';

const { test, expect } = require('../support/fixture');
const {
  openGame,
  startDeterministicGame
} = require('../support/game');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('the prospective review ledger and every gate schema validate together',
  async function ({ page }) {
    var result = await page.evaluate(function () {
      var coreErrors = FB.validateTechnologyData();
      var featureIds = Object.keys(FBDATA.techImpactReviews.features).sort();
      var modes = {};
      featureIds.forEach(function (id) {
        modes[id] = FBDATA.techImpactReviews.features[id].mode;
      });

      FBDATA.techImpactReviews.features.e2e_invalid_review = {
        mode:'sometimes', tech:['missing_e2e_technology'], rationale:''
      };
      var reviewErrors = FB.validateTechnologyData().filter(function (error) {
        return error.indexOf('e2e_invalid_review') >= 0;
      });
      delete FBDATA.techImpactReviews.features.e2e_invalid_review;

      var event = FB.eventById('tournament_invitation');
      var option = event.options[0];
      var originalVisible = option.showWhenTechLocked;
      option.showWhenTechLocked = 'yes';
      var optionErrors = FB.validateTechnologyData().filter(function (error) {
        return error.indexOf(event.id + '.0') >= 0;
      });
      option.showWhenTechLocked = originalVisible;

      var invitationOption = FB.eventById('rare_auction_invitation').options[0];
      var originalManualOnly = invitationOption.manualOnly;
      invitationOption.manualOnly = 'yes';
      var manualOnlyErrors = FB.validateTechnologyData().filter(function (error) {
        return error.indexOf('rare_auction_invitation.0') >= 0;
      });
      invitationOption.manualOnly = originalManualOnly;

      var originalClaimLot = FBDATA.auctionLotTypes.claim;
      FBDATA.auctionLotTypes.claim = {
        weight:-1, requiresTech:'missing_e2e_technology'
      };
      var auctionLotErrors = FB.validateTechnologyData().filter(function (error) {
        return error.indexOf('Auction lot type claim') >= 0;
      });
      FBDATA.auctionLotTypes.claim = originalClaimLot;

      var originalRequirement = FBDATA.policies.redress.requiresTech;
      FBDATA.policies.redress.requiresTech = 'missing_e2e_technology';
      var consumerErrors = FB.validateTechnologyData().filter(function (error) {
        return error.indexOf('Policy redress') >= 0;
      });
      if (originalRequirement === undefined) {
        delete FBDATA.policies.redress.requiresTech;
      } else {
        FBDATA.policies.redress.requiresTech = originalRequirement;
      }

      var wreck = FB.eventById('strange_bounty');
      var compact = wreck.options[wreck.options.length - 1];
      var technology = FB.realmTechRecord(FB.state);
      technology.completed = technology.completed.filter(function (id) {
        return id !== 'urban_markets' && id !== 'authenticated_seals';
      });
      FB.state.player.tier = 0;
      var structurallyHidden = FB.eventOptionStatus(
        FB.state, wreck, compact, {});
      FB.state.player.tier = 3;
      var eligibleButLocked = FB.eventOptionStatus(
        FB.state, wreck, compact, {});

      var guildCharterOptions = [];
      var guildCharterEventIds = [
        'smith_tempered_steel', 'weaver_hall_hangings',
        'weaver_dyed_thread', 'broker_grain_contract'
      ];
      FBDATA.events.forEach(function (guildEvent) {
        if (guildCharterEventIds.indexOf(guildEvent.id) < 0) return;
        (guildEvent.options || []).forEach(function (guildOption) {
          var modifier = guildOption.effects && guildOption.effects.addModifier;
          if (modifier && modifier.id === 'market_charter') {
            guildCharterOptions.push(guildOption);
          }
        });
      });
      var guildChartersLocked = guildCharterOptions.map(function (guildOption) {
        return FB.eventOptionStatus(FB.state, null, guildOption, {});
      });
      technology.completed.push('urban_markets', 'authenticated_seals');
      var guildChartersReady = guildCharterOptions.every(function (guildOption) {
        return FB.eventOptionStatus(FB.state, null, guildOption, {}).ready;
      });

      technology.completed = technology.completed.filter(function (id) {
        return id !== 'notarial_contracts';
      });
      var lockedClaimLot = FB.auctionLotTypeStatus(FB.state, 'claim');
      FB.state.player.tier = 4;
      var auctionAction = FB.instants.filter(function (action) {
        return action.id === 'attend_auction';
      })[0];
      var auctionDescription = auctionAction.desc(FB.state);
      technology.completed.push('notarial_contracts');
      var readyClaimLot = FB.auctionLotTypeStatus(FB.state, 'claim');

      return {
        baseline:FBDATA.techImpactReviews.baselineVersion,
        featureIds:featureIds,
        modes:modes,
        coreErrors:coreErrors,
        reviewErrors:reviewErrors,
        optionErrors:optionErrors,
        manualOnlyErrors:manualOnlyErrors,
        auctionLotErrors:auctionLotErrors,
        consumerErrors:consumerErrors,
        structurallyHidden:structurallyHidden,
        eligibleButLocked:eligibleButLocked,
        guildCharterCount:guildCharterOptions.length,
        guildChartersLocked:guildChartersLocked,
        guildChartersReady:guildChartersReady,
        lockedClaimLot:lockedClaimLot,
        readyClaimLot:readyClaimLot,
        auctionDescription:auctionDescription
      };
    });

    expect(result.baseline).toBe('1.127.1');
    expect(result.featureIds).toEqual([
      'auction_enterprise_lots',
      'auction_item_lots',
      'auction_title_rights',
      'bounded_market_auctions',
      'confirmation_of_great_offices',
      'consent_of_estates',
      'direct_vassal_charter_of_liberties',
      'estates_scutage',
      'formal_confirmation_of_custom',
      'formal_market_charters',
      'guild_broker_path',
      'guild_caravan_factor_path',
      'guild_cooper_path',
      'guild_maritime_factor_path',
      'guild_smith_path',
      'guild_weaver_path',
      'rare_auction_invitations',
      'tournament_jousting'
    ]);
    expect(Object.values(result.modes)).toEqual([
      'none', 'none', 'hard', 'none', 'hard', 'hard', 'hard', 'hard',
      'hard', 'hard', 'none', 'hard', 'hard', 'hard', 'none', 'hard',
      'none', 'hard'
    ]);
    expect(result.coreErrors).toEqual([]);
    expect(result.reviewErrors.some(function (error) {
      return error.indexOf('mode must be hard, soft, or none') >= 0;
    })).toBe(true);
    expect(result.reviewErrors.some(function (error) {
      return error.indexOf('rationale is required') >= 0;
    })).toBe(true);
    expect(result.reviewErrors.some(function (error) {
      return error.indexOf('missing technology missing_e2e_technology') >= 0;
    })).toBe(true);
    expect(result.optionErrors).toContain(
      'Event option tournament_invitation.0: showWhenTechLocked must be a boolean.');
    expect(result.manualOnlyErrors).toContain(
      'Event option rare_auction_invitation.0: manualOnly must be a boolean.');
    expect(result.auctionLotErrors).toContain(
      'Auction lot type claim: weight must be a non-negative number.');
    expect(result.auctionLotErrors).toContain(
      'Auction lot type claim: missing required technology missing_e2e_technology.');
    expect(result.consumerErrors).toContain(
      'Policy redress: missing required technology missing_e2e_technology.');
    expect(result.structurallyHidden).toMatchObject({
      visible:false, ready:false, techLocked:true
    });
    expect(result.eligibleButLocked).toMatchObject({
      visible:true,
      ready:false,
      techLocked:true,
      missingTech:['urban_markets', 'authenticated_seals']
    });
    expect(result.guildCharterCount).toBe(4);
    result.guildChartersLocked.forEach(function (status) {
      expect(status).toMatchObject({
        visible:true, ready:false, techLocked:true,
        missingTech:['urban_markets', 'authenticated_seals']
      });
    });
    expect(result.guildChartersReady).toBe(true);
    expect(result.lockedClaimLot).toMatchObject({
      ready:false, missing:['notarial_contracts']
    });
    expect(result.readyClaimLot.ready).toBe(true);
    expect(result.auctionDescription).toContain('Notarial Contracts');
  });

test('formal privileges reject new grants, filter demands, and preserve records',
  async function ({ page }) {
    var result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var pid = p.provinceId;
      var technology = FB.realmTechRecord(s);
      technology.completed = technology.completed.filter(function (id) {
        return id !== 'customary_law';
      });
      s.privileges = [];
      FB.ensureInstitutions(s, { silent:true });
      var locked = FB.privilegeGrantStatus(s, 'confirmed_custom');
      var before = FB.save.serialize();
      var rngBefore = FB.getRngState();
      var denied = FB.grantPrivilege(s, 'confirmed_custom', {
        scopeId:pid,
        sourceType:'test',
        sourceId:'technology_gate'
      });
      var unchanged = before === FB.save.serialize() &&
        rngBefore === FB.getRngState();

      p.tier = 3;
      p.pop = -60;
      p.war = null;
      s.collectiveDemands = null;
      FB.ensureInstitutions(s, { silent:true });
      FB.notePoliticalMistreatment(s, 'extraordinary_tax', { gold:40 });
      var lockedDemands = FB.collectiveDemandCandidates(s).map(
        function (row) { return row.id; });

      technology.completed.push('customary_law');
      var ready = FB.privilegeGrantStatus(s, 'confirmed_custom');
      var unlockedDemands = FB.collectiveDemandCandidates(s).map(
        function (row) { return row.id; });
      var granted = FB.grantPrivilege(s, 'confirmed_custom', {
        scopeId:pid,
        sourceType:'test',
        sourceId:'technology_gate'
      });
      technology.completed = technology.completed.filter(function (id) {
        return id !== 'customary_law';
      });
      var activeAfterLoss = FB.hasPrivilege(s, 'confirmed_custom', pid) &&
        FB.hasModifier(s, 'custom_confirmed', pid);
      FB.removeModifier(s, 'custom_confirmed', pid);
      var legacyDemand = {
        id:'demand:commons_custom:e2e',
        definitionId:'commons_custom',
        privilegeId:'confirmed_custom',
        constituency:'commons',
        scopeId:String(pid),
        polityId:p.liege || 'player',
        protagonistId:p.charId,
        demandedTurn:s.turn,
        demandedYear:s.date.year,
        pressure:50,
        reasons:[]
      };
      s.collectiveDemands = {
        pending:legacyDemand, lastYears:{}, opposition:{}, mistreatment:[]
      };
      FB.ensureInstitutions(s, { silent:true });
      var legacyAccepted = FB.fns.collective_demand_accept(s, {
        demandId:legacyDemand.id,
        definitionId:legacyDemand.definitionId,
        privilegeId:legacyDemand.privilegeId
      });
      return {
        locked:locked,
        ready:ready,
        denied:denied,
        unchanged:unchanged,
        lockedDemands:lockedDemands,
        unlockedDemands:unlockedDemands,
        granted:!!granted,
        activeAfterLoss:activeAfterLoss,
        legacyAccepted:legacyAccepted,
        legacyDemandCleared:FB.collectiveDemandSummary(s).pending === null,
        legacyPrivilegeGranted:FB.hasPrivilege(s, 'confirmed_custom', pid)
      };
    });

    expect(result.locked).toMatchObject({
      ready:false,
      techLocked:true,
      missingTech:['customary_law']
    });
    expect(result.locked.reason).toContain('Recorded Customary Law');
    expect(result.ready.ready).toBe(true);
    expect(result.denied).toBe(false);
    expect(result.unchanged).toBe(true);
    expect(result.lockedDemands).not.toContain('commons_custom');
    expect(result.lockedDemands).toContain('tax_remission');
    expect(result.unlockedDemands).toContain('commons_custom');
    expect(result.granted).toBe(true);
    expect(result.activeAfterLoss).toBe(true);
    expect(result.legacyAccepted).toBe(true);
    expect(result.legacyDemandCleared).toBe(true);
    expect(result.legacyPrivilegeGranted).toBe(true);
  });
