'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/actions.js',
  'js/actions.js',
  'js/technology.js',
  'data/technology.js',
  'data/economy.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

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

      var originalFortRequirement = FBDATA.fortLevels[1].requiresTech;
      FBDATA.fortLevels[1].requiresTech = ['missing_e2e_technology'];
      var fortConsumerErrors = FB.validateTechnologyData().filter(function (error) {
        return error.indexOf('Fort 1') >= 0;
      });
      FBDATA.fortLevels[1].requiresTech = originalFortRequirement;

      var fieldUpgrade = FBDATA.enterprises.field_strip.upgrades[0];
      var originalUpgradeRequirement = fieldUpgrade.requiresTech;
      fieldUpgrade.requiresTech = 'missing_e2e_technology';
      var enterpriseUpgradeErrors = FB.validateTechnologyData().filter(function (error) {
        return error.indexOf('Enterprise upgrade field_strip.0') >= 0;
      });
      fieldUpgrade.requiresTech = originalUpgradeRequirement;

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
        settlementDynamicRentTech:
          FBDATA.techImpactReviews.features.settlement_dynamic_rents.tech.slice(),
        coreErrors:coreErrors,
        reviewErrors:reviewErrors,
        optionErrors:optionErrors,
        manualOnlyErrors:manualOnlyErrors,
        auctionLotErrors:auctionLotErrors,
        consumerErrors:consumerErrors,
        fortConsumerErrors:fortConsumerErrors,
        enterpriseUpgradeErrors:enterpriseUpgradeErrors,
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
      'adventuring_expeditions',
      'auction_enterprise_lots',
      'auction_item_lots',
      'auction_title_rights',
      'bounded_market_auctions',
      'building_arsenal',
      'building_cathedral',
      'building_exchange',
      'building_foundry',
      'building_guildhall',
      'building_hospital',
      'building_university',
      'building_windmill',
      'chartered_trade_corridors',
      'commodity_ventures',
      'commoner_frontier_settlement',
      'concentric_fortress_upgrade',
      'confirmation_of_great_offices',
      'consent_of_estates',
      'county_community_identity',
      'county_goods_markets',
      'county_population_demographics',
      'culture_adoption',
      'culture_unit_classes',
      'data_defined_deeds',
      'data_defined_focuses',
      'direct_vassal_charter_of_liberties',
      'earned_starting_stations',
      'enterprise_hired_labor',
      'enterprise_upgrades',
      'estates_scutage',
      'faith_conversion',
      'family_freedom_record',
      'field_supply_attrition',
      'formal_confirmation_of_custom',
      'formal_market_charters',
      'fort_construction',
      'gentry_freehold_expansion',
      'guild_broker_path',
      'guild_caravan_factor_path',
      'guild_cooper_path',
      'guild_maritime_factor_path',
      'guild_smith_path',
      'guild_weaver_path',
      'host_splitting_encirclement',
      'item_shop',
      'landed_household_standards',
      'late_medieval_crafts_commerce',
      'late_medieval_warfare_gear',
      'learned_master_works',
      'legendary_artifacts',
      'local_marriage_prospect_identity',
      'mercenary_contracts',
      'minor_household_standard_reduction',
      'mounted_raiding',
      'negative_household_gold',
      'new_unit_classes',
      'overseas_raiding',
      'persistent_serf_tenure',
      'physician_practice_stories',
      'professional_replacement_cohorts',
      'raiding_navigation',
      'raiding_party_scale',
      'rare_auction_invitations',
      'royal_religious_tolerance_policy',
      'royal_settlement_policy',
      'serf_freedom_petition',
      'settlement_dynamic_rents',
      'soldier_command_assignments',
      'stone_castle_upgrade',
      'terrain_combat_modifiers',
      'tournament_jousting',
      'towered_stronghold_upgrade',
      'trade_venture_return_cargo',
      'unit_attack_defense_roles',
      'war_justification_selection'
    ]);
    const additiveNoneIds = [
      'enterprise_hired_labor',
      'family_freedom_record',
      'landed_household_standards',
      'minor_household_standard_reduction',
      'negative_household_gold',
      'persistent_serf_tenure',
      'serf_freedom_petition'
    ];
    expect(additiveNoneIds.map(function (id) { return result.modes[id]; }))
      .toEqual(['none', 'none', 'none', 'none', 'none', 'none', 'none']);
    const additiveHardIds = ['enterprise_upgrades'];
    expect(additiveHardIds.map(function (id) { return result.modes[id]; }))
      .toEqual(['hard']);
    const establishedModes = result.featureIds.filter(function (id) {
      return additiveNoneIds.indexOf(id) < 0 && additiveHardIds.indexOf(id) < 0;
    }).map(function (id) { return result.modes[id]; });
    expect(establishedModes).toEqual([
      'none', 'none', 'none', 'hard', 'none', 'hard', 'hard', 'hard', 'hard',
      'hard', 'soft', 'hard', 'soft', 'hard', 'none', 'none', 'hard', 'hard',
      'hard', 'none', 'soft', 'soft', 'none', 'none', 'none', 'none', 'hard',
      'none', 'hard',
      'none', 'soft', 'hard', 'hard', 'hard', 'none', 'none', 'hard', 'hard', 'hard', 'none',
      'hard', 'none', 'soft', 'soft', 'soft', 'none', 'none', 'none', 'none', 'soft',
      'hard', 'hard', 'none', 'none', 'soft', 'soft', 'none', 'none', 'none',
      'soft', 'none', 'hard', 'none', 'hard', 'hard', 'none', 'none', 'none'
    ]);
    expect(result.settlementDynamicRentTech).toEqual([
      'undershot_watermill', 'urban_markets', 'harbor_works',
      'stone_bridgebuilding', 'standardized_coinage', 'tax_assessment',
      'exchequer_accounts', 'scutage', 'heavy_plough', 'three_field'
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
    expect(result.fortConsumerErrors).toContain(
      'Fort 1: missing required technology missing_e2e_technology.');
    expect(result.enterpriseUpgradeErrors).toContain(
      'Enterprise upgrade field_strip.0: missing required technology missing_e2e_technology.');
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
