'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/actions.js',
  'js/actions.js',
  'js/council.js',
  'js/parliament.js',
  'js/politics.js',
  'js/portrait.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'js/ui_panels.js',
  'data/map_data.js',
  'data/political_institutions.js',
  'css/style.css'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { waitForUiRefresh } = require('../support/game/ui');

async function startGovernanceGame(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
}

async function configureGovernance(page, kind) {
  const configured = await page.evaluate(function (setupKind) {
    var s = FB.state;
    var p = s.player;
    var me = s.chars[p.charId];
    var homeId = p.provinceId;
    var home = FB.world.byId[homeId];
    var countyIds = [homeId];
    var candidates = FB.world.provs.filter(function (province) {
      return !province.wasteland && province.id !== homeId;
    });
    for (var i = 0; i < candidates.length && countyIds.length < 12; i++) {
      countyIds.push(candidates[i].id);
    }

    FB.game.observe = false;
    p.dead = false;
    p.flags = p.flags || {};
    delete p.flags.bishop;
    delete p.flags.chief_qadi;
    delete p.flags.on_campaign;
    delete p.flags.with_liege_host;
    p.war = null;
    p.travel = null;
    p.cooldowns = {};
    p.vassalLevyFavors = {};
    p.gold = 500;
    p.prestige = 500;
    p.liegeOps = p.liegeOps || {};
    me.bishopricVacatedTurn = s.turn;
    delete me.bishopric;
    me.religiousRanks = {};
    me.skills.ste = 0;

    function liveRealm(excludeId) {
      var ids = Object.keys(s.realms);
      for (var j = 0; j < ids.length; j++) {
        var realm = s.realms[ids[j]];
        if (ids[j] !== 'player' && ids[j] !== excludeId &&
            realm && realm.alive && realm.ruler) return ids[j];
      }
      return null;
    }

    function establishRealm(tier, directIds) {
      p.tier = tier;
      p.liege = null;
      p.provs = directIds.slice();
      for (var j = 0; j < directIds.length; j++) {
        s.owner[directIds[j]] = 'player';
        s.holder[directIds[j]] = 'player';
        s.dev[directIds[j]] = 5 + j;
      }
      FB.foundPlayerRealm(s);
      s.realms.player.alive = true;
      s.realms.player.rank = tier - 3;
      s.realms.player.liege = null;
      s.realms.player.capital = directIds[0];
      p.provinceId = directIds[0];
    }

    var liegeId = liveRealm(null);
    if (setupKind === 'baron') {
      p.tier = 3;
      p.provs = [];
      p.liege = liegeId;
      FB.setRealmRulerStanding(s, liegeId, 28);
      if (s.realms.player) s.realms.player.alive = false;
      s.holder[homeId] = liegeId;
      s.owner[homeId] = FB.topRealm(s, liegeId);
      s.realms[liegeId].obl = {
        aid:0.25,
        scutage:false,
        lastMotion:null
      };
    } else if (setupKind === 'count') {
      establishRealm(4, countyIds.slice(0, 2));
    } else if (setupKind === 'duke') {
      establishRealm(5, countyIds.slice(0, 4));
    } else {
      establishRealm(setupKind === 'emperor' ? 7 : 6, countyIds.slice(0, 10));
      var vassalCounty = countyIds[10];
      var vassalId = 'governance_vassal';
      s.owner[vassalCounty] = 'player';
      s.holder[vassalCounty] = vassalId;
      s.dev[vassalCounty] = 9;
      s.realms[vassalId] = {
        id:vassalId,
        name:'Ash March',
        color:'#705435',
        capital:vassalCounty,
        aggression:0,
        rank:1,
        liege:'player',
        alive:true,
        favor:0,
        ruler:{
          name:'Aldred',
          sex:'m',
          culture:home.culture,
          age:39,
          mar:7,
          trait:'ambitious',
          generation:1
        }
      };
      FB.setRealmRulerStanding(s, vassalId, 48);
      p.vassalLevyFavors[vassalId] = s.turn + 120;
      s.council = {
        authority:32,
        seats:{
          seneschal:vassalId,
          constable:null,
          treasurer:null,
          almoner:null,
          chamberlain:null
        }
      };
    }
    FB.invalidateRealmCache();
    FB.ensureEconomy(s);
    p.roleOrientationsSeen = p.roleOrientationsSeen || {};
    p.roleOrientationsSeen['role-tier-' + p.tier] = 1;
    FB.ui.refresh();
    return {
      homeId:homeId,
      liegeId:p.liege,
      vassalId:s.realms.governance_vassal
        ? 'governance_vassal' : null
    };
  }, kind);
  // Settle onboarding writes caused by the synthetic rank and resource changes
  // before callers take read-only Governance baselines.
  await waitForUiRefresh(page);
  return configured;
}

test('Governance eligibility and roles follow territorial politics',
  async function ({ page }, testInfo) {
    await startGovernanceGame(page, testInfo);
    const result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      var homeId = p.provinceId;
      var liegeId = Object.keys(s.realms).filter(function (id) {
        return id !== 'player' && s.realms[id] && s.realms[id].alive &&
          s.realms[id].ruler;
      })[0];

      p.tier = 3;
      p.provs = [];
      p.liege = liegeId;
      s.holder[homeId] = liegeId;
      s.owner[homeId] = FB.topRealm(s, liegeId);
      s.realms[liegeId].obl = { aid:0.25, scutage:false };
      if (s.realms.player) s.realms.player.alive = false;
      delete me.bishopric;
      me.bishopricVacatedTurn = s.turn;
      p.flags = p.flags || {};
      delete p.flags.bishop;
      delete p.flags.chief_qadi;
      var baron = FB.governanceSummary(s);

      delete me.bishopricVacatedTurn;
      me.religion = 'catholic';
      me.bishopric = {
        seeProvinceId:homeId,
        appointedTurn:s.turn,
        previousTier:2,
        appointerKind:'test',
        appointerId:liegeId,
        investiturePolicy:'canonical'
      };
      var bishop = FB.governanceSummary(s);
      var bishopEntry = FB.listInstants(s).some(function (entry) {
        return entry.a.id === 'governance';
      });
      delete me.bishopric;
      me.bishopricVacatedTurn = s.turn;

      p.provs = [homeId];
      p.liege = null;
      s.owner[homeId] = 'player';
      s.holder[homeId] = 'player';
      FB.foundPlayerRealm(s);
      s.realms.player.liege = null;
      s.realms.player.capital = homeId;
      p.tier = 4;
      s.realms.player.rank = 1;
      var count = FB.governanceSummary(s);
      p.tier = 5;
      s.realms.player.rank = 2;
      var duke = FB.governanceSummary(s);
      p.tier = 6;
      s.realms.player.rank = 3;
      var king = FB.governanceSummary(s);
      p.tier = 7;
      s.realms.player.rank = 4;
      var emperor = FB.governanceSummary(s);
      FB.game.observe = true;
      var observe = FB.governanceSummary(s);
      FB.game.observe = false;
      p.tier = 5;
      s.realms.player.rank = 2;
      FB.ui.showGovernance();

      return {
        baron:{
          role:baron && baron.role,
          playerRealmId:baron && baron.playerRealmId,
          institution:baron && baron.institution,
          liegeId:baron && baron.liegeId
        },
        bishop:bishop,
        bishopEntry:bishopEntry,
        count:{ role:count.role, institution:count.institution },
        duke:{ role:duke.role, institution:duke.institution },
        king:{ role:king.role, institution:king.institution },
        emperor:{ role:emperor.role, institution:emperor.institution },
        observe:observe
      };
    });

    expect(result.baron).toEqual({
      role:'vassal',
      playerRealmId:null,
      institution:'estates',
      liegeId:result.baron.liegeId
    });
    expect(result.baron.liegeId).toBeTruthy();
    expect(result.bishop).toBeNull();
    expect(result.bishopEntry).toBe(false);
    expect(result.count).toEqual({ role:'sovereign', institution:'none' });
    expect(result.duke).toEqual({ role:'sovereign', institution:'none' });
    expect(result.king).toEqual({ role:'crowned', institution:'council' });
    expect(result.emperor).toEqual({ role:'crowned', institution:'council' });
    expect(result.observe).toBeNull();
    await expect(page.locator('#governance-position')).toContainText(
      'Independent ruler');
    await expect(page.locator('#governance-institution')).toContainText(
      'No simulated institution applies');
  });

test('summary values match domain, tax, levy, Standing, and hierarchy sources',
  async function ({ page }, testInfo) {
    await startGovernanceGame(page, testInfo);
    const setup = await configureGovernance(page, 'king');
    const result = await page.evaluate(function (ids) {
      var s = FB.state;
      var first = FB.governanceSummary(s);
      var second = FB.governanceSummary(s);
      var vassal = first.directVassals.filter(function (item) {
        return item.realmId === ids.vassalId;
      })[0];
      var taxParts = FB.playerTaxParts(s);
      var composition = FB.playerCompositionBreakdown(s);
      var ledgerLevy = composition.entries.filter(function (entry) {
        return entry.kind === 'vassal' && entry.rid === ids.vassalId;
      }).reduce(function (total, entry) {
        return total + entry.amount;
      }, 0);
      var summaryDues = first.directVassals.reduce(function (total, item) {
        return total + item.taxContribution;
      }, 0);
      FB.runInstant(s, 'royal_council');
      var councilAliasTitle = document.getElementById('gm-title').textContent;
      FB.ui.closeModal();
      var beforeOpen = FB.save.serialize();
      FB.ui.showGovernance();
      FB.ui.showCouncil('governance');
      FB.ui.showGovernance('institution');
      var afterNavigation = FB.save.serialize();
      return {
        stable:JSON.stringify(first) === JSON.stringify(second),
        councilAliasTitle:councilAliasTitle,
        navigationReadOnly:beforeOpen === afterNavigation,
        role:first.role,
        playerRealmId:first.playerRealmId,
        sovereignId:first.sovereignId,
        direct:first.directCounties.length,
        realm:first.realmCounties.length,
        excess:first.domainExcess,
        multiplier:first.domainMultiplier,
        capMatch:first.domainCap === FB.domainCap(s),
        excessMatch:first.domainExcess === FB.domainOver(s),
        multiplierMatch:first.domainMultiplier === FB.domainPenalty(s),
        taxMatch:vassal.taxContribution ===
          FB.vassalTaxContribution(s, ids.vassalId),
        levyMatch:vassal.levyContribution ===
          FB.vassalLevyContribution(s, ids.vassalId),
        taxLedgerMatch:taxParts.dues === summaryDues,
        levyLedgerMatch:ledgerLevy === vassal.levyContribution,
        standingMatch:vassal.standing === FB.standingOf(s, {
          kind:'realm', id:ids.vassalId
        }),
        councilSeat:vassal.councilSeatId,
        exceptionalUntil:vassal.exceptionalLevyUntil,
        authority:first.council.authority,
        vacancyIds:first.council.vacancyIds.slice()
      };
    }, setup);

    expect(result.stable).toBe(true);
    expect(result.councilAliasTitle).toBe('The Royal Council');
    expect(result.navigationReadOnly).toBe(true);
    expect(result.role).toBe('crowned');
    expect(result.playerRealmId).toBe('player');
    expect(result.sovereignId).toBe('player');
    expect(result.direct).toBe(10);
    expect(result.realm).toBe(11);
    expect(result.excess).toBeGreaterThan(0);
    expect(result.multiplier).toBeLessThan(1);
    expect(result.capMatch).toBe(true);
    expect(result.excessMatch).toBe(true);
    expect(result.multiplierMatch).toBe(true);
    expect(result.taxMatch).toBe(true);
    expect(result.levyMatch).toBe(true);
    expect(result.taxLedgerMatch).toBe(true);
    expect(result.levyLedgerMatch).toBe(true);
    expect(result.standingMatch).toBe(true);
    expect(result.councilSeat).toBe('seneschal');
    expect(result.exceptionalUntil).toBeGreaterThan(0);
    expect(result.authority).toBe(32);
    expect(result.vacancyIds).toEqual([
      'constable',
      'treasurer',
      'almoner',
      'chamberlain'
    ]);
    await expect(page.locator('#governance-institution')).toContainText(
      'Crown Authority');
    await expect(page.locator('#governance-institution')).toContainText(
      '32/100');
    await expect(page.locator('#governance-institution')).toContainText(
      'Seneschal');
    await expect(page.locator('#governance-institution')).toContainText(
      'Vacant');
    await expect(page.locator('#governance-vassals')).toContainText(
      'Ash March');
    await expect(page.locator('#governance-vassals')).toContainText(
      'Seasonal tax contribution');
    await expect(page.locator('#governance-vassals')).toContainText(
      'Host levy contribution');
  });

test('vassal cards keep crucial dues visible and move terms into the details tooltip',
  async function ({ page }, testInfo) {
    await startGovernanceGame(page, testInfo);
    await configureGovernance(page, 'king');
    await page.evaluate(function () { FB.ui.showGovernance('vassals'); });

    const card = page.locator('#governance-vassals .governance-vassal', {
      hasText:'Ash March' });
    await expect(card).toBeVisible();

    // the card face always carries the crucial facts
    const face = card.locator('.governance-vassal-stats').first();
    await expect(face).toContainText('Territory');
    await expect(face).toContainText('Seasonal tax contribution');
    await expect(face).toContainText('Host levy contribution');
    await expect(face).not.toContainText('Service charter');

    // the terms live in the hidden details, never duplicated on the face
    const details = card.locator('.settcard-details');
    await expect(details).toBeHidden();

    // desktop: no ? button; hovering the card opens the side tooltip
    await expect(card.locator('.settcard-info')).toBeHidden();
    await card.hover();
    const tip = page.locator('#tooltip');
    await expect(tip).toBeVisible();
    await expect(tip).toContainText('Service charter');
    await expect(tip).toContainText('Tenure');
    await expect(tip).toContainText('Council office');
    await expect(tip).toContainText('Exceptional levy');
    await expect(details).toBeHidden();
  });

test('tablet-width vassal cards swap the hover tooltip for the ? disclosure',
  async function ({ page }, testInfo) {
    await startGovernanceGame(page, testInfo);
    await configureGovernance(page, 'king');
    await page.setViewportSize({ width:1000, height:700 });
    await page.evaluate(function () { FB.ui.showGovernance('vassals'); });

    const card = page.locator('#governance-vassals .governance-vassal', {
      hasText:'Ash March' });
    await expect(card).toBeVisible();
    const infoBtn = card.locator('.settcard-info');
    await expect(infoBtn).toBeVisible();

    // the disclosure layout never opens the hover/focus side tooltip
    await card.hover();
    await expect(page.locator('#tooltip')).toBeHidden();

    // the ? button toggles the same terms inline instead
    const details = card.locator('.settcard-details');
    await expect(details).toBeHidden();
    await infoBtn.click();
    await expect(infoBtn).toHaveAttribute('aria-expanded', 'true');
    await expect(details).toBeVisible();
    await expect(details).toContainText('Service charter');
    await expect(details).toContainText('Political terms');
    await infoBtn.click();
    await expect(details).toBeHidden();
  });

test('domain cleanup is preview-first, stale-safe, and respects county reservations',
  async function ({ page }, testInfo) {
    await startGovernanceGame(page, testInfo);
    await configureGovernance(page, 'king');
    await page.evaluate(function () { FB.ui.showGovernance('domain'); });
    await page.locator('[data-governance-cleanup]').click();
    await expect(page.locator('#gm-title')).toContainText('Domain Cleanup');
    await expect(page.locator('#gm-body')).toContainText('Land tax estimate');
    await page.locator('#domain-cleanup-back').click();
    await expect(page.locator('#governance-domain')).toBeVisible();

    const result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var seat = p.provinceId;
      var reserved = p.provs[p.provs.length - 1];
      FB.setProtected(s, 'grantCounty', reserved, true);
      var saveBefore = FB.save.serialize();
      var rngBefore = JSON.stringify(FB.getRngState());
      var plan = FB.domainCleanupPlan(s);
      var readOnly = saveBefore === FB.save.serialize() &&
        rngBefore === JSON.stringify(FB.getRngState());
      var staleTarget = plan.countyIds[0];
      FB.setProtected(s, 'grantCounty', staleTarget, true);
      var stale = FB.applyDomainCleanupPlan(s, plan);
      var staleKeptCounty = p.provs.indexOf(staleTarget) >= 0;
      FB.setProtected(s, 'grantCounty', staleTarget, false);
      var fresh = FB.domainCleanupPlan(s);
      var applied = FB.applyDomainCleanupPlan(s, fresh);
      var generatedOnly = applied.ok && applied.grants.every(function (grant) {
        var rid = grant.kind === 'duchy'
          ? 'pd_' + grant.id : 'pv_' + grant.id;
        return s.realms[rid] && s.realms[rid].generated === true;
      });
      return {
        readOnly:readOnly,
        excess:plan.excess,
        unresolved:plan.unresolved,
        omittedReserved:plan.countyIds.indexOf(reserved) < 0,
        omittedSeat:plan.countyIds.indexOf(seat) < 0,
        projectionFinite:isFinite(plan.projection.beforeTax) &&
          isFinite(plan.projection.afterTax) &&
          isFinite(plan.projection.beforeLevy) &&
          isFinite(plan.projection.afterLevy),
        staleCode:stale.code,
        staleDidNotGrant:staleKeptCounty,
        applied:applied.ok,
        generatedOnly:generatedOnly,
        held:p.provs.length,
        cap:FB.domainCap(s),
        keptReserved:p.provs.indexOf(reserved) >= 0,
        keptSeat:p.provs.indexOf(seat) >= 0
      };
    });

    expect(result.readOnly).toBe(true);
    expect(result.excess).toBeGreaterThan(0);
    expect(result.unresolved).toBe(0);
    expect(result.omittedReserved).toBe(true);
    expect(result.omittedSeat).toBe(true);
    expect(result.projectionFinite).toBe(true);
    expect(result.staleCode).toBe('stale');
    expect(result.staleDidNotGrant).toBe(true);
    expect(result.applied).toBe(true);
    expect(result.generatedOnly).toBe(true);
    expect(result.held).toBe(result.cap);
    expect(result.keptReserved).toBe(true);
    expect(result.keptSeat).toBe(true);
  });

test('family land-grant recipients are deterministic, read-only, and stale-safe',
  async function ({ page }, testInfo) {
    await startGovernanceGame(page, testInfo);
    await configureGovernance(page, 'king');
    const result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      var culture = me.culture;
      var religion = me.religion;
      var dynasty = me.dyn || 'House Test';

      function child(id, name, age, sex) {
        var c = FB.makeCharacter(s, {
          id:id,
          name:name,
          sex:sex || 'm',
          culture:culture,
          religion:religion,
          born:s.date.year - age,
          dyn:dynasty,
          traits:[],
          fatherId:me.sex === 'm' ? me.id : null,
          motherId:me.sex === 'f' ? me.id : null
        });
        me.childrenIds.push(c.id);
        return c;
      }

      var eligible = child('grant_eligible', 'Eligible Kin', 31, 'f');
      eligible.religion = religion === 'catholic' ? 'norse_pagan' : 'catholic';
      eligible.career = {
        profession:'monk', rank:'journeyman', experience:4,
        startedYear:s.date.year - 5, guildRank:'none',
        guildStanding:0, chosen:true
      };
      var partner = FB.makeCharacter(s, {
        id:'grant_partner', name:'Outside Spouse', sex:'m',
        culture:culture, religion:eligible.religion,
        born:s.date.year - 33, dyn:'Outside House', traits:[]
      });
      eligible.spouseId = partner.id;
      partner.spouseId = eligible.id;
      s.intrigue = s.intrigue || {};
      s.intrigue.captives = s.intrigue.captives || [];
      s.intrigue.captives.push({
        captiveId:eligible.id,
        captorId:partner.id,
        source:'test',
        capturedTurn:s.turn
      });

      var minor = child('grant_minor', 'Minor Kin', 15, 'm');
      var spouse = child('grant_spouse', 'Related Spouse', 27, 'f');
      spouse.spouseId = me.id;
      me.spouseId = spouse.id;
      var dead = child('grant_dead', 'Dead Kin', 40, 'm');
      dead.dead = true;
      var landed = child('grant_landed', 'Landed Kin', 34, 'm');
      landed.station = 2;
      var royal = child('grant_royal', 'Royal Kin', 29, 'f');
      royal.royalLine = { realmId:'old_line', memberId:'old_member' };
      var reigning = child('grant_reigning', 'Reigning Kin', 38, 'm');
      var reignRealm = FB.makeVassalRealm(s, {
        id:'grant_reigning_realm',
        name:'County of Reigning Test',
        capital:p.provs[0],
        rank:1,
        liege:null,
        culture:culture
      });
      FB.assignRealmRulerCharacter(s, reignRealm.id, reigning.id);
      FB.touchFamily();

      var saveBefore = FB.save.serialize();
      var rngBefore = JSON.stringify(FB.getRngState());
      var first = FB.landGrantRecipients(s).map(function (row) {
        return row.id + ':' + row.rel + ':' + row.age;
      });
      var second = FB.landGrantRecipients(s).map(function (row) {
        return row.id + ':' + row.rel + ':' + row.age;
      });
      var statuses = {
        eligible:FB.landGrantRecipientStatus(s, eligible.id).code,
        minor:FB.landGrantRecipientStatus(s, minor.id).code,
        spouse:FB.landGrantRecipientStatus(s, spouse.id).code,
        dead:FB.landGrantRecipientStatus(s, dead.id).code,
        landed:FB.landGrantRecipientStatus(s, landed.id).code,
        royal:FB.landGrantRecipientStatus(s, royal.id).code,
        reigning:FB.landGrantRecipientStatus(s, reigning.id).code,
        outsider:FB.landGrantRecipientStatus(s, partner.id).code,
        missing:FB.landGrantRecipientStatus(s, 'no_such_person').code
      };
      var projectionReadOnly = saveBefore === FB.save.serialize() &&
        rngBefore === JSON.stringify(FB.getRngState());

      var did = null;
      var duchyIds = [];
      for (var candidateDid in FBDATA.duchies) {
        var candidateIds = FB.duchyCounties(candidateDid);
        if (candidateIds.length >= 2) {
          did = candidateDid;
          duchyIds = candidateIds;
          break;
        }
      }
      for (var i = 0; i < duchyIds.length; i++) {
        if (p.provs.indexOf(duchyIds[i]) < 0) p.provs.push(duchyIds[i]);
        s.holder[duchyIds[i]] = 'player';
        s.owner[duchyIds[i]] = 'player';
      }
      var staleCounty = p.provs.filter(function (pid) {
        return duchyIds.indexOf(pid) < 0;
      })[0];
      if (!staleCounty) {
        for (var provinceIndex = 0;
            provinceIndex < FB.world.provs.length; provinceIndex++) {
          var possible = FB.world.provs[provinceIndex];
          if (!possible.wasteland && duchyIds.indexOf(possible.id) < 0) {
            staleCounty = possible.id;
            p.provs.push(staleCounty);
            s.holder[staleCounty] = 'player';
            s.owner[staleCounty] = 'player';
            break;
          }
        }
      }
      eligible.station = 2;
      var staleBefore = FB.save.serialize();
      var staleRng = JSON.stringify(FB.getRngState());
      var countyGrant = FB.grantCounty(s, staleCounty, eligible.id);
      var duchyGrant = FB.grantDuchy(s, did, eligible.id);

      return {
        statuses:statuses,
        eligibleListed:first.indexOf(eligible.id + ':Daughter:31') >= 0,
        stable:JSON.stringify(first) === JSON.stringify(second),
        projectionReadOnly:projectionReadOnly,
        countyRejected:countyGrant === false,
        duchyRejected:duchyGrant === false,
        staleAtomic:staleBefore === FB.save.serialize() &&
          staleRng === JSON.stringify(FB.getRngState())
      };
    });

    expect(result.statuses).toEqual({
      eligible:'eligible',
      minor:'minor',
      spouse:'spouse',
      dead:'dead',
      landed:'landed',
      royal:'landed',
      reigning:'reigning',
      outsider:'not_kin',
      missing:'missing'
    });
    expect(result.eligibleListed).toBe(true);
    expect(result.stable).toBe(true);
    expect(result.projectionReadOnly).toBe(true);
    expect(result.countyRejected).toBe(true);
    expect(result.duchyRejected).toBe(true);
    expect(result.staleAtomic).toBe(true);
  });

test('named county grants preserve family identity and release household assignments',
  async function ({ page }, testInfo) {
    await startGovernanceGame(page, testInfo);
    await configureGovernance(page, 'king');
    const result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      var pid = p.provs[p.provs.length - 1];
      var rid = 'pv_' + pid;
      var recipient = FB.makeCharacter(s, {
        id:'county_family_grantee',
        name:'Family Recipient',
        sex:'m',
        culture:me.culture,
        religion:me.religion,
        born:s.date.year - 32,
        dyn:me.dyn || 'House Test',
        traits:[],
        opinion:5,
        fatherId:me.sex === 'm' ? me.id : null,
        motherId:me.sex === 'f' ? me.id : null
      });
      me.childrenIds.push(recipient.id);
      var spouse = FB.makeCharacter(s, {
        id:'county_grantee_spouse', name:'Preserved Spouse', sex:'f',
        culture:me.culture, religion:me.religion,
        born:s.date.year - 30, dyn:'Spouse House', traits:[]
      });
      recipient.spouseId = spouse.id;
      spouse.spouseId = recipient.id;
      var betrothed = FB.makeCharacter(s, {
        id:'county_grantee_betrothed', name:'Preserved Betrothed', sex:'f',
        culture:me.culture, religion:me.religion,
        born:s.date.year - 26, dyn:'Betrothed House', traits:[]
      });
      recipient.betrothedId = betrothed.id;
      betrothed.betrothedId = recipient.id;
      var child = FB.makeCharacter(s, {
        id:'county_grantee_child', name:'Existing Heir', sex:'m',
        culture:me.culture, religion:me.religion,
        born:s.date.year - 9, dyn:recipient.dyn, traits:[],
        fatherId:recipient.id, motherId:spouse.id
      });
      recipient.childrenIds.push(child.id);
      spouse.childrenIds.push(child.id);
      recipient.career = {
        profession:'merchant', rank:'journeyman', experience:37,
        startedYear:s.date.year - 10, guildRank:'member',
        guildStanding:24, chosen:true
      };
      recipient.careerHistory = {
        farmer:{
          profession:'farmer', rank:'journeyman', experience:12,
          startedYear:s.date.year - 18, guildRank:'none',
          guildStanding:0, chosen:true
        }
      };
      var careerBefore = JSON.stringify(recipient.career);
      var historyBefore = JSON.stringify(recipient.careerHistory);
      p.enterprises = [{
        uid:'grant_cleanup_enterprise', type:'market_stall_business',
        settlement:0, workerId:recipient.id, workerLocked:true
      }];
      p.familyOffices = { factor:recipient.id };
      p.retainers = [{
        charId:recipient.id, office:'factor', pay:2,
        startedTurn:s.turn, unpaid:0
      }];
      p.loadouts = p.loadouts || {};
      p.loadouts[recipient.id] = { head:'grant_cleanup_item' };
      FB.setProtected(s, 'staffingWorker', recipient.id, true);
      s.agency = s.agency || {};
      s.agency.familyAmbitions = s.agency.familyAmbitions || {};
      s.agency.familyAmbitions[recipient.id] = {
        id:'prosper', sinceYear:s.date.year, guidance:'encouraged',
        progress:2, lastRequestYear:null
      };
      child.edu = { focus:'lea', school:'master', tutorId:recipient.id };
      s.roles.friend = recipient.id;
      p.friendContacts = p.friendContacts || {};
      p.friendContacts[recipient.id] = {
        score:2, lastTurn:s.turn, cause:'test'
      };
      FB.touchFamily();
      var expectedOwner = FB.playerRealmId(s) || 'player';
      var granted = FB.grantCounty(s, pid, recipient.id);
      var realm = s.realms[rid];
      var ruler = FB.realmRulerCharacterSnapshot(s, rid);
      var heir = realm.succession.heirId &&
        realm.succession.members[realm.succession.heirId];
      var familyOfficeKept = Object.keys(p.familyOffices || {}).some(
        function (office) { return p.familyOffices[office] === recipient.id; });
      var retainerKept = (p.retainers || []).some(function (record) {
        return record.charId === recipient.id;
      });
      var lastNews = s.log[s.log.length - 1];

      return {
        granted:granted,
        directVassal:realm.liege === 'player',
        holder:s.holder[pid],
        owner:s.owner[pid],
        expectedOwner:expectedOwner,
        rulerId:ruler && ruler.id,
        rulerName:realm.ruler.name,
        dynasty:realm.dynasty,
        station:recipient.station,
        royalRealm:recipient.royalLine && recipient.royalLine.realmId,
        standing:FB.standingOf(s, { kind:'realm', id:rid }),
        residence:FB.characterResidence(s, recipient),
        capital:realm.capital,
        spouseLinks:recipient.spouseId === spouse.id &&
          spouse.spouseId === recipient.id,
        childLinks:recipient.childrenIds.indexOf(child.id) >= 0 &&
          child.fatherId === recipient.id && child.motherId === spouse.id,
        heirId:heir && heir.charId,
        betrothalLinks:recipient.betrothedId === betrothed.id &&
          betrothed.betrothedId === recipient.id,
        careerKept:JSON.stringify(recipient.career) === careerBefore,
        historyKept:JSON.stringify(recipient.careerHistory) === historyBefore,
        friendKept:s.roles.friend === recipient.id &&
          !!p.friendContacts[recipient.id],
        enterpriseReleased:p.enterprises[0].workerId === null &&
          p.enterprises[0].workerLocked === undefined,
        familyOfficeReleased:!familyOfficeKept,
        retainerReleased:!retainerKept,
        agencyReleased:!s.agency.familyAmbitions[recipient.id],
        tutorReleased:child.edu.tutorId === null && child.edu.school === null,
        loadoutReleased:!p.loadouts[recipient.id],
        staffingReservationReleased:!FB.isProtected(
          s, 'staffingWorker', recipient.id),
        newsKey:lastNews && lastNews.msg && lastNews.msg.key
      };
    });

    expect(result).toEqual({
      granted:true,
      directVassal:true,
      holder:result.holder,
      owner:result.expectedOwner,
      expectedOwner:result.expectedOwner,
      rulerId:'county_family_grantee',
      rulerName:'Family Recipient',
      dynasty:result.dynasty,
      station:3,
      royalRealm:result.holder,
      standing:45,
      residence:result.capital,
      capital:result.capital,
      spouseLinks:true,
      childLinks:true,
      heirId:'county_grantee_child',
      betrothalLinks:true,
      careerKept:true,
      historyKept:true,
      friendKept:true,
      enterpriseReleased:true,
      familyOfficeReleased:true,
      retainerReleased:true,
      agencyReleased:true,
      tutorReleased:true,
      loadoutReleased:true,
      staffingReservationReleased:true,
      newsKey:'news.action.family_county_granted'
    });
    expect(result.holder).toMatch(/^pv_/);
    expect(result.dynasty).toBeTruthy();
  });

test('named duchy grants map every county and seed succession from existing children',
  async function ({ page }, testInfo) {
    await startGovernanceGame(page, testInfo);
    await configureGovernance(page, 'king');
    const result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      var did = null;
      var counties = [];
      for (var candidateDid in FBDATA.duchies) {
        var candidate = FB.duchyCounties(candidateDid);
        if (candidate.length >= 2) {
          did = candidateDid;
          counties = candidate;
          break;
        }
      }
      for (var i = 0; i < counties.length; i++) {
        if (p.provs.indexOf(counties[i]) < 0) p.provs.push(counties[i]);
        s.holder[counties[i]] = 'player';
        s.owner[counties[i]] = 'player';
        s.dev[counties[i]] = 4 + i;
      }
      var outsideCounties = p.provs.filter(function (pid) {
        return counties.indexOf(pid) < 0;
      });
      if (outsideCounties.length < 2) {
        for (var provinceIndex = 0;
            provinceIndex < FB.world.provs.length; provinceIndex++) {
          var possible = FB.world.provs[provinceIndex];
          if (!possible.wasteland && counties.indexOf(possible.id) < 0 &&
              outsideCounties.indexOf(possible.id) < 0) {
            outsideCounties.push(possible.id);
            p.provs.push(possible.id);
            s.holder[possible.id] = 'player';
            s.owner[possible.id] = 'player';
            s.dev[possible.id] = 3;
            if (outsideCounties.length >= 2) break;
          }
        }
      }
      var recipient = FB.makeCharacter(s, {
        id:'duchy_family_grantee', name:'Ducal Relative', sex:'f',
        culture:me.culture, religion:me.religion,
        born:s.date.year - 36, dyn:me.dyn || 'House Test', traits:[],
        fatherId:me.sex === 'm' ? me.id : null,
        motherId:me.sex === 'f' ? me.id : null
      });
      me.childrenIds.push(recipient.id);
      var daughter = FB.makeCharacter(s, {
        id:'duchy_grantee_daughter', name:'Older Daughter', sex:'f',
        culture:me.culture, religion:me.religion,
        born:s.date.year - 14, dyn:recipient.dyn, traits:[],
        motherId:recipient.id
      });
      var son = FB.makeCharacter(s, {
        id:'duchy_grantee_son', name:'Younger Son', sex:'m',
        culture:me.culture, religion:me.religion,
        born:s.date.year - 10, dyn:recipient.dyn, traits:[],
        motherId:recipient.id
      });
      recipient.childrenIds.push(daughter.id, son.id);
      FB.touchFamily();
      var expectedOwner = FB.playerRealmId(s) || 'player';
      var granted = FB.grantDuchy(s, did, recipient.id);
      var rid = 'pd_' + did;
      var realm = s.realms[rid];
      var mapped = counties.every(function (pid) {
        return s.holder[pid] === rid && s.owner[pid] === expectedOwner &&
          p.provs.indexOf(pid) < 0;
      });
      var successionIds = realm.succession.order.map(function (memberId) {
        return realm.succession.members[memberId].charId;
      });
      var legacyPid = p.provs[p.provs.length - 1];
      var legacyGranted = FB.grantCounty(s, legacyPid);
      var legacyRealm = s.realms['pv_' + legacyPid];
      var lastNews = s.log[s.log.length - (legacyGranted ? 2 : 1)];
      return {
        granted:granted,
        rank:realm.rank,
        directVassal:realm.liege === 'player',
        mapped:mapped,
        capital:realm.capital,
        richest:counties[counties.length - 1],
        rulerId:FB.realmRulerCharacterSnapshot(s, rid).id,
        heirId:realm.succession.members[realm.succession.heirId].charId,
        successionIds:successionIds,
        childrenPreserved:recipient.childrenIds.join(',') ===
          [daughter.id, son.id].join(','),
        legacyGranted:legacyGranted,
        legacyGenerated:legacyRealm && legacyRealm.generated === true,
        legacyNamedFamily:legacyRealm &&
          legacyRealm.ruler.name === recipient.name,
        newsKey:lastNews && lastNews.msg && lastNews.msg.key
      };
    });

    expect(result.granted).toBe(true);
    expect(result.rank).toBe(2);
    expect(result.directVassal).toBe(true);
    expect(result.mapped).toBe(true);
    expect(result.capital).toBe(result.richest);
    expect(result.rulerId).toBe('duchy_family_grantee');
    expect(result.heirId).toBe('duchy_grantee_son');
    expect(result.successionIds).toEqual([
      'duchy_grantee_son',
      'duchy_grantee_daughter'
    ]);
    expect(result.childrenPreserved).toBe(true);
    expect(result.legacyGranted).toBe(true);
    expect(result.legacyGenerated).toBe(true);
    expect(result.legacyNamedFamily).toBe(false);
    expect(result.newsKey).toBe('news.action.family_duchy_granted');
  });

test('Grant Land combines recipient and terms while preserving Back and Governance return flow',
  async function ({ page }, testInfo) {
    await startGovernanceGame(page, testInfo);
    await configureGovernance(page, 'king');
    const setup = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      var recipient = FB.makeCharacter(s, {
        id:'grant_ui_relative', name:'Grant UI Relative', sex:'m',
        culture:me.culture, religion:me.religion,
        born:s.date.year - 24, dyn:me.dyn || 'House Test', traits:[],
        fatherId:me.sex === 'm' ? me.id : null,
        motherId:me.sex === 'f' ? me.id : null
      });
      me.childrenIds.push(recipient.id);
      FB.touchFamily();
      FB.ui.showGovernance('domain');
      return {
        recipientId:recipient.id,
        firstCounty:p.provs[p.provs.length - 1]
      };
    });

    await page.locator(
      '#governance-domain [data-governance-action="grant_land"]')
      .last().click();
    await page.locator('[data-pid="' + setup.firstCounty + '"]').click();
    await expect(page.getByRole('heading', {
      name:'Choose a Recipient', exact:true
    })).toBeVisible();
    await expect(page.getByRole('button', {
      name:/new loyal vassal/i
    })).toBeVisible();
    const familyChoice = page.locator(
      '[data-grant-recipient="' + setup.recipientId + '"]');
    await expect(familyChoice).toContainText('Grant UI Relative');
    await expect(familyChoice).toContainText('Son · age 24');
    await expect(familyChoice).toHaveAccessibleName(
      /Grant .* to Grant UI Relative.*your Son, age 24/);
    await page.locator('#grant-recipient-back').click();
    await expect(page.getByRole('heading', {
      name:'Grant Land', exact:true
    })).toBeVisible();
    await expect(page.locator(
      '[data-pid="' + setup.firstCounty + '"]')).toBeVisible();

    await page.locator('[data-pid="' + setup.firstCounty + '"]').click();
    await page.locator(
      '[data-grant-recipient="' + setup.recipientId + '"]').click();
    await expect(page.getByRole('heading', { name:/Terms for/ })).toBeVisible();
    await page.locator('#grant-terms-back').click();
    await expect(page.getByRole('heading', {
      name:'Choose a Recipient', exact:true
    })).toBeVisible();
    await page.locator(
      '[data-grant-recipient="' + setup.recipientId + '"]').click();
    await page.locator('[data-grant-charter="host_duty"]').click();
    await page.locator('[data-grant-tenure="term"]').click();
    await page.locator('#grant-terms-confirm').click();
    await expect(page.locator('#governance-domain')).toBeVisible();
    expect(await page.evaluate(function (ids) {
      var rid = 'pv_' + ids.firstCounty;
      var contract = FB.feudalContractOf(FB.state, rid);
      return FB.state.holder[ids.firstCounty] === rid &&
        FB.realmRulerCharacterSnapshot(
          FB.state, rid).id === ids.recipientId &&
        contract.charterId === 'host_duty' && contract.tenure === 'term';
    }, setup)).toBe(true);

    const generatedCounty = await page.evaluate(function () {
      var p = FB.state.player;
      var pid = p.provs[p.provs.length - 1];
      FB.ui.showGovernance('domain');
      return pid;
    });
    await page.locator(
      '#governance-domain [data-governance-action="grant_land"]')
      .last().click();
    await page.locator('[data-pid="' + generatedCounty + '"]').click();
    await page.getByRole('button', { name:/new loyal vassal/i }).click();
    await expect(page.getByRole('heading', { name:/Terms for/ })).toBeVisible();
    await page.locator('#grant-terms-confirm').click();
    await expect(page.locator('#governance-domain')).toBeVisible();
    expect(await page.evaluate(function (pid) {
      var realm = FB.state.realms['pv_' + pid];
      return realm && realm.generated === true &&
        realm.ruler.name !== 'Grant UI Relative';
    }, generatedCounty)).toBe(true);
  });

test('Governance county and grant flows return to Domain while Council reservations stay manual',
  async function ({ page }, testInfo) {
    await startGovernanceGame(page, testInfo);
    const setup = await configureGovernance(page, 'king');
    const result = await page.evaluate(function (ids) {
      var s = FB.state;
      var p = s.player;
      var grantedCounty = p.provs[p.provs.length - 1];
      FB.grantCounty(s, grantedCounty);
      var reservedRealm = 'pv_' + grantedCounty;
      FB.setProtected(s, 'councilRealm', reservedRealm, true);
      s.council = {
        authority:60,
        seats:{
          seneschal:null,
          constable:null,
          treasurer:null,
          almoner:null,
          chamberlain:null
        }
      };
      FB.councilEnsure(s);
      var automaticallySeated = Object.keys(s.council.seats).some(
        function (seatId) {
          return s.council.seats[seatId] === reservedRealm;
        });
      FB.councilAppoint(s, 'constable', reservedRealm);
      var originalRuler = FB.realmRulerCharacterSnapshot(
        s, ids.vassalId);
      if (!originalRuler && FB.ensureRealmCourtForDisplay) {
        originalRuler = FB.ensureRealmCourtForDisplay(
          s, ids.vassalId);
      }
      if (!originalRuler && FB.materializeRealmRuler) {
        originalRuler = FB.materializeRealmRuler(s, ids.vassalId);
      }
      FB.ui.showGovernance('domain');
      return {
        countyId:p.provinceId,
        countyName:FB.world.byId[p.provinceId].name,
        reservedRealm:reservedRealm,
        automaticallySeated:automaticallySeated,
        manualHolder:s.council.seats.constable,
        originalVassal:ids.vassalId,
        originalVassalTitle:FB.T('{title} {name}', {
          title:FB.realmRankTitle(s, s.realms[ids.vassalId]),
          name:originalRuler ? FB.fullName(originalRuler) :
            s.realms[ids.vassalId].ruler.name
        })
      };
    }, setup);

    expect(result.automaticallySeated).toBe(false);
    expect(result.manualHolder).toBe(result.reservedRealm);

    await page.locator('#governance-domain [data-governance-county="' +
      result.countyId + '"]').click();
    await expect(page.getByRole('heading', {
      name:'County of ' + result.countyName,
      exact:true
    })).toBeVisible();
    await expect(page.locator('#governance-county-back')).toHaveText('Back');
    await expect(page.locator('[data-grant-protection="' +
      result.countyId + '"]')).toBeVisible();
    await page.locator('#governance-county-back').click();
    await expect(page.locator('#governance-domain')).toBeVisible();
    await expect(page.locator(
      '[data-governance-section="domain"]')).toHaveAttribute(
        'aria-selected', 'true');

    await page.locator(
      '#governance-domain [data-governance-action="grant_land"]')
      .last().click();
    await expect(page.getByRole('heading', {
      name:'Grant Land', exact:true
    })).toBeVisible();
    await expect(page.locator('#gm-cancel')).toHaveText('Back');
    await page.locator('#gm-cancel').click();
    await expect(page.locator('#governance-domain')).toBeVisible();

    const turnBeforeLevy = await page.evaluate(function (rid) {
      delete FB.state.player.vassalLevyFavors[rid];
      FB.ui.showGovernance('vassals');
      return FB.state.turn;
    }, result.originalVassal);
    const levy = page.locator('[data-governance-vassal-levy="' +
      result.originalVassal + '"]');
    await expect(levy).toBeEnabled();
    await levy.click();
    await expect(page.locator('#gm-title')).toContainText('Governance');
    await expect(page.locator('#governance-vassals')).toBeVisible();
    expect(await page.evaluate(function () { return FB.state.turn; }))
      .toBe(turnBeforeLevy + 1);

    /* The levy control has an interactive hover sheet. Activate the realm
       row through its keyboard contract so scrolling it into view cannot
       place the stationary pointer back over that sheet. */
    const realmRow = page.locator(
      '#governance-vassals [data-governance-realm="' +
      result.originalVassal + '"]').first();
    await realmRow.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#gm-title')).toHaveText(
      result.originalVassalTitle);
    await expect(page.locator('#cm-close')).toHaveText('Back');
    await page.locator('[data-interaction-action="gift.ruler"]').click();
    await expect(page.locator('#gm-title')).toContainText('Offer a gift');
    await page.locator('#gm-cancel').click();
    await expect(page.locator('#gm-title')).toHaveText(
      result.originalVassalTitle);
    await page.locator('#cm-close').click();
    await expect(page.locator('#governance-vassals')).toBeVisible();

    await page.evaluate(function () {
      FB.ui.showCouncil('governance');
    });
    const councilProtection = page.locator('[data-council-protection="' +
      result.reservedRealm + '"]');
    await expect(councilProtection).toContainText('Reserved');
    await councilProtection.click();
    await expect(page.locator('[data-council-protection="' +
      result.reservedRealm + '"]')).toContainText('Automatic allowed');
    await page.locator('#gm-cancel').click();
    await expect(page.locator('#governance-institution')).toBeVisible();
  });

test('vassal Governance consolidates Deeds and returns through Estates without mutation',
  async function ({ page }, testInfo) {
    await startGovernanceGame(page, testInfo);
    await configureGovernance(page, 'baron');
    const before = await page.evaluate(function () {
      FB.state.player.prestige = 100;
      var ids = FB.listInstants(FB.state).map(function (entry) {
        return entry.a.id;
      });
      FB.runInstant(FB.state, 'the_estates');
      var aliasTitle = document.getElementById('gm-title').textContent;
      FB.ui.closeModal();
      var save = FB.save.serialize();
      FB.ui.showGovernance();
      return {
        save:save,
        ids:ids,
        aliasTitle:aliasTitle
      };
    });

    expect(before.ids).toContain('governance');
    expect(before.ids).not.toContain('the_estates');
    expect(before.ids).not.toContain('royal_council');
    expect(before.aliasTitle).toBe('The Estates');
    await expect(page.getByRole('heading', {
      name:'🏛 Governance', exact:true
    })).toBeVisible();
    await expect(page.locator('#governance-position')).toContainText(
      'Sworn subject');
    await expect(page.locator('#governance-obligations')).toContainText(
      '25% of noble revenue');
    await expect(page.locator('#governance-institution')).toContainText(
      'The Estates');
    await page.locator('[data-governance-section="actions"]').click();
    await expect(page.locator(
      '[data-governance-action="declare_independence"]')).toBeVisible();
    await expect(page.locator(
      '[data-governance-action="declare_independence"]')).toBeDisabled();
    await expect(page.locator(
      '[data-governance-action="declare_independence"]')).toContainText(
      'at least 200 prestige');

    await page.locator('[data-governance-section="institution"]').click();
    await page.locator(
      '#governance-institution [data-governance-institution="estates"]').click();
    await expect(page.getByRole('heading', {
      name:'The Estates', exact:true
    })).toBeVisible();
    await expect(page.locator('#gm-cancel')).toHaveText('Back');
    await page.locator('#gm-cancel').click();
    await expect(page.getByRole('heading', {
      name:'🏛 Governance', exact:true
    })).toBeVisible();
    expect(await page.evaluate(function () {
      return FB.save.serialize();
    })).toBe(before.save);

    await page.locator('#governance-close').click();
    await page.evaluate(function () {
      FB.state.player.panelIntrosSeen =
        FB.state.player.panelIntrosSeen || {};
      FB.state.player.panelIntrosSeen.network = 1;
    });
    await page.locator('.tab[data-tab="network"]').click();
    await expect(page.locator('#network-governance')).toBeVisible();
    await expect(page.locator('#network-governance')).not.toContainText(
      'authoritative view');
    await expect(page.locator('#network-action-governance')).toContainText(
      'authoritative view');
    await page.locator('#network-governance').click();
    await expect(page.getByRole('heading', {
      name:'🏛 Governance', exact:true
    })).toBeVisible();
  });

test('institution summaries stay read-only until their existing actions run',
  async function ({ page }, testInfo) {
    await startGovernanceGame(page, testInfo);
    await configureGovernance(page, 'baron');
    const legacyDefaults = await page.evaluate(function () {
      var snapshot = JSON.parse(FB.save.serialize()).state;
      var me = snapshot.chars[snapshot.player.charId];
      var realmId = FB.playerRealmId(snapshot);
      var sovereign = FB.topRealm(snapshot, realmId);
      delete me.religiousRanks;
      if (snapshot.papacy && snapshot.papacy.investiture) {
        delete snapshot.papacy.investiture[sovereign];
      }
      var before = JSON.stringify(snapshot);
      FB.religiousStandings(snapshot, me);
      FB.investiturePolicyForPlayer(snapshot);
      return before === JSON.stringify(snapshot);
    });
    expect(legacyDefaults).toBe(true);

    const estates = await page.evaluate(function () {
      var s = FB.state;
      var liege = s.realms[s.player.liege];
      var beforeOpen = FB.save.serialize();
      FB.ui.showParliament();
      var afterOpen = FB.save.serialize();
      FB.ui.closeModal();
      var gold = s.player.gold;
      var status = FB.parliamentMotionStatus(s, 'redress');
      var moved = FB.parliamentMove(s, 'redress');
      return {
        readOnly:beforeOpen === afterOpen,
        ready:status.ready,
        moved:moved,
        spent:gold - s.player.gold,
        lastMotion:liege.obl.lastMotion,
        year:s.date.year,
        queued:(s.eventQueue || []).some(function (item) {
          return item && item.id === 'parliament_redress';
        }),
        pending:!!(s.politics && s.politics.pendingMotion),
        expiresIn:s.politics && s.politics.pendingMotion
          ? s.politics.pendingMotion.expiresTurn - s.turn : null
      };
    });

    expect(estates).toEqual({
      readOnly:true,
      ready:true,
      moved:true,
      spent:15,
      lastMotion:estates.year,
      year:estates.year,
      queued:false,
      pending:true,
      expiresIn:90
    });

    const setup = await configureGovernance(page, 'king');
    const council = await page.evaluate(function (ids) {
      var s = FB.state;
      s.council = null;
      var beforeSummary = FB.save.serialize();
      var summary = FB.councilSummary(s);
      FB.ui.showCouncil();
      var afterOpen = FB.save.serialize();
      FB.ui.closeModal();
      var standing = FB.standingOf(s, {
        kind:'realm', id:ids.vassalId
      });
      FB.councilAppoint(s, 'constable', ids.vassalId);
      return {
        formedBefore:summary.formed,
        readOnly:beforeSummary === afterOpen,
        formedAfter:!!s.council,
        holder:s.council.seats.constable,
        authority:s.council.authority,
        standingGain:FB.standingOf(s, {
          kind:'realm', id:ids.vassalId
        }) - standing
      };
    }, setup);

    expect(council).toEqual({
      formedBefore:false,
      readOnly:true,
      formedAfter:true,
      holder:setup.vassalId,
      authority:58,
      standingGain:10
    });
  });

test('Council, realm, and character views agree with Governance Standing',
  async function ({ page }, testInfo) {
    await page.setViewportSize({ width:1200, height:800 });
    await startGovernanceGame(page, testInfo);
    const setup = await configureGovernance(page, 'king');
    const identity = await page.evaluate(function (ids) {
      var ruler = FB.materializeRealmRuler(FB.state, ids.vassalId);
      FB.setRealmRulerStanding(FB.state, ids.vassalId, 48);
      FB.ui.showGovernance('vassals');
      return { cid:ruler.id };
    }, setup);

    await expect(page.locator(
      '#governance-vassals .governance-vassal')).toContainText(
      '+48 (Favorable)');
    await page.evaluate(function () {
      FB.ui.showCouncil();
    });
    await expect(page.locator('#gm-body')).toContainText(
      'Standing +48 (Favorable)');
    const heraldry = page.locator('.council-ruler-heraldry').first();
    await expect(heraldry.locator('.council-ruler-heraldry-button'))
      .toHaveAttribute('aria-label', /Open ruler card for/);
    await heraldry.hover();
    await expect(page.locator('#tooltip .realm-ruler-card')).toBeVisible();
    await expect(page.locator('#tooltip .realm-ruler-card'))
      .toContainText('Realm muster');
    await expect(page.locator('#tooltip .realm-ruler-card'))
      .toContainText('+48 (Favorable)');
    await expect(page.locator('#tooltip .realm-ruler-card canvas.pface'))
      .toBeVisible();
    const previewPlacement = await page.evaluate(function () {
      var tooltip = document.getElementById('tooltip').getBoundingClientRect();
      var modal = document.querySelector('#genmodal .modalcard')
        .getBoundingClientRect();
      return { tooltipRight:tooltip.right, modalLeft:modal.left };
    });
    expect(previewPlacement.tooltipRight)
      .toBeLessThanOrEqual(previewPlacement.modalLeft + 1);
    await heraldry.locator('.council-ruler-heraldry-button').click();
    await expect(page.locator('#gm-body')).toContainText(
      '+48 (Favorable)');
    await page.evaluate(function (cid) {
      FB.ui.showCharModal(cid);
    }, identity.cid);
    await expect(page.locator('#gm-body')).toContainText(
      '+48 (Favorable)');
  });

test('Governance tabs show one compact desktop surface at a time',
  async function ({ page }, testInfo) {
    await page.setViewportSize({ width:1200, height:800 });
    await startGovernanceGame(page, testInfo);
    await configureGovernance(page, 'king');
    await page.evaluate(function () {
      FB.ui.showGovernance('vassals');
    });
    await waitForUiRefresh(page);

    const tabs = page.locator('.governance-nav [role="tab"]');
    await expect(tabs).toHaveCount(7);
    await expect(page.locator(
      '[data-governance-section="vassals"]')).toHaveAttribute(
        'aria-selected', 'true');
    await expect(page.locator('#governance-vassals')).toBeVisible();
    await expect(page.locator(
      '.governance-card:not([hidden])')).toHaveCount(1);

    const layout = await page.locator('.governance-vassal').first().evaluate(
      function (row) {
        var stats = row.querySelector('.governance-vassal-stats');
        var actions = row.querySelector('.governance-vassal-actions');
        var inline = row.querySelector('.governance-inline-actions');
        return {
          rowDisplay:getComputedStyle(row).display,
          rowColumns:getComputedStyle(row).gridTemplateColumns.split(' ').length,
          statColumns:getComputedStyle(stats).gridTemplateColumns.split(' ').length,
          actionColumns:getComputedStyle(inline)
            .gridTemplateColumns.split(' ').length,
          actionsVisible:actions.getClientRects().length > 0,
          rowHeight:row.getBoundingClientRect().height
        };
      });
    expect(layout.rowDisplay).toBe('grid');
    expect(layout.rowColumns).toBe(3);
    /* the face carries only the three crucial dues rows; the terms moved to
       the details tooltip */
    expect(layout.statColumns).toBe(3);
    // the desktop action buttons stack as one full-width column
    expect(layout.actionColumns).toBe(1);
    expect(layout.actionsVisible).toBe(true);
    /* the stacked full-width action buttons replaced the squished auto-fit
       columns, so a row is taller than the old cramped layout */
    expect(layout.rowHeight).toBeLessThan(190);

    await page.locator('[data-governance-section="domain"]').click();
    await expect(page.locator('#governance-domain')).toBeVisible();
    await expect(page.locator('#governance-domain')).toBeFocused();
    await expect(page.locator('#governance-vassals')).toBeHidden();
    await expect(page.locator(
      '[data-governance-section="domain"]')).toHaveAttribute(
        'aria-selected', 'true');

    await page.locator(
      '[data-governance-section="domain"]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator(
      '[data-governance-section="obligations"]')).toBeFocused();
    await expect(page.locator(
      '[data-governance-section="obligations"]')).toHaveAttribute(
        'aria-selected', 'true');
    await expect(page.locator('#governance-obligations')).toBeVisible();
  });

test('narrow Governance keeps focus, numbered actions, geometry, and browser Back',
  async function ({ page }, testInfo) {
    await page.setViewportSize({ width:390, height:740 });
    await startGovernanceGame(page, testInfo);
    await configureGovernance(page, 'king');
    await page.evaluate(function () {
      FB.ui.showGovernance();
    });

    await expect(page.getByRole('heading', {
      name:'🏛 Governance', exact:true
    })).toBeVisible();
    await expect.poll(function () {
      return page.evaluate(function () {
        return document.activeElement &&
          document.activeElement.dataset.governanceSection;
      });
    }).toBe('position');
    await page.keyboard.press('Enter');
    await expect(page.locator('#governance-position')).toBeFocused();
    await page.keyboard.press('1');
    await expect(page.getByRole('heading', {
      name:'🏛 Governance', exact:true
    })).toBeVisible();
    await page.locator('[data-governance-section="actions"]').click();
    await expect(page.locator(
      '#governance-actions .actionbtn .keyhint').first()).toBeVisible();
    await expect(page.locator(
      '.governance-card:not([hidden])')).toHaveCount(1);

    const geometry = await page.locator(
      '#genmodal .modalcard').evaluate(function (card) {
      var rect = card.getBoundingClientRect();
      return {
        left:rect.left,
        right:rect.right,
        top:rect.top,
        bottom:rect.bottom,
        viewportWidth:window.innerWidth,
        viewportHeight:window.innerHeight,
        scrollWidth:document.getElementById('gm-body').scrollWidth,
        clientWidth:document.getElementById('gm-body').clientWidth
      };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    expect(geometry.top).toBeGreaterThanOrEqual(0);
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 1);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);

    await page.locator('[data-governance-section="vassals"]').click();
    const vassalLayout = await page.locator(
      '.governance-vassal').first().evaluate(function (row) {
        var stats = row.querySelector('.governance-vassal-stats');
        var actions = row.querySelector('.governance-inline-actions');
        var protection = row.querySelector(
          '[data-governance-council-protection]');
        var gift = row.querySelector('[data-governance-gift]');
        return {
          rowDisplay:getComputedStyle(row).display,
          statColumns:getComputedStyle(stats).gridTemplateColumns.split(' ').length,
          actionColumns:getComputedStyle(actions).gridTemplateColumns.split(' ').length,
          /* the long Council-protection label spans the full action row so it
             stays one line */
          protectionFullWidth:!!protection && !!gift &&
            protection.getBoundingClientRect().width >
              gift.getBoundingClientRect().width * 1.5
        };
      });
    expect(vassalLayout.rowDisplay).toBe('block');
    expect(vassalLayout.statColumns).toBe(2);
    expect(vassalLayout.actionColumns).toBe(2);
    expect(vassalLayout.protectionFullWidth).toBe(true);

    await page.locator('[data-governance-section="institution"]').click();
    await page.locator(
      '#governance-institution [data-governance-institution="council"]').click();
    await expect(page.getByRole('heading', {
      name:'The Royal Council', exact:true
    })).toBeVisible();
    const councilHeraldry = page.locator(
      '.council-ruler-heraldry-button').last();
    const councilScroll = await councilHeraldry.evaluate(function (button) {
      button.scrollIntoView({ block:'center' });
      return document.getElementById('gm-body').scrollTop;
    });
    const councilSeat = await councilHeraldry.getAttribute(
      'data-council-seat');
    await councilHeraldry.click();
    await expect(page.locator('.character-interaction-modal')).toBeVisible();
    await page.locator('#cm-close').click();
    await expect(page.getByRole('heading', {
      name:'The Royal Council', exact:true
    })).toBeVisible();
    const restoredHeraldry = page.locator(
      '.council-ruler-heraldry-button[data-council-seat="' +
      councilSeat + '"]');
    await expect(restoredHeraldry).toBeFocused();
    await expect.poll(function () {
      return page.locator('#gm-body').evaluate(function (body) {
        return body.scrollTop;
      });
    }).toBeGreaterThanOrEqual(Math.max(0, councilScroll - 5));
    await page.evaluate(function () {
      history.back();
    });
    await expect(page.getByRole('heading', {
      name:'🏛 Governance', exact:true
    })).toBeVisible();
    await expect(page.locator('#governance-institution')).toBeFocused();
  });

test('a baron pays for, receives, and can see the modifiers on their seat',
  async function ({ page }, testInfo) {
    await startGovernanceGame(page, testInfo);
    await configureGovernance(page, 'baron');

    /* A baron holds no county directly: their seat belongs to their liege.
       Every modifier consumer has to agree on that one ownership rule, or the
       player pays upkeep for a record that grants nothing and appears
       nowhere. */
    expect(await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const seat = p.provinceId;

      const before = {
        tax:FB.playerTaxParts(s).total,
        levy:FB.playerLevy(s),
        pop:FB.popEffective(s),
        upkeep:FB.modifierUpkeep(s, 'gold')
      };

      FB.addModifier(s, 'market_charter', seat, {});
      FB.addModifier(s, 'levy_exemption', seat, {});

      const after = {
        tax:FB.playerTaxParts(s).total,
        levy:FB.playerLevy(s),
        pop:FB.popEffective(s),
        upkeep:FB.modifierUpkeep(s, 'gold')
      };
      const summary = FB.governanceSummary(s);
      const listed = (summary && summary.modifierCounties || [])
        .filter(function (item) { return item.provinceId === seat; });
      const ids = listed.length
        ? listed[0].records.map(function (r) { return r.id; }).sort() : [];

      return {
        holdsNothing:!(p.provs && p.provs.length),
        estatesActive:FB.parliamentActive(s),
        ruleIsSeatOnly:FB.modifierCounties(s).join(',') === seat,
        seatIsRule:FB.modifierSeat(s) === seat,
        /* Market Charter is +8% tax and 1 gold upkeep; Levy Exemption is
           -12% levy and +6 Common Voice. Each must land, not just the ones
           that happened to read the seat before. */
        chargedUpkeep:after.upkeep > before.upkeep,
        taxRose:after.tax > before.tax,
        levyFell:after.levy < before.levy,
        voiceRose:after.pop > before.pop,
        governanceShows:ids.join(',')
      };
    })).toEqual({
      holdsNothing:true,
      estatesActive:true,
      ruleIsSeatOnly:true,
      seatIsRule:true,
      chargedUpkeep:true,
      taxRose:true,
      levyFell:true,
      voiceRose:true,
      governanceShows:'levy_exemption,market_charter'
    });
  });

test('a landed ruler reads modifiers from held counties, never from a seat',
  async function ({ page }, testInfo) {
    await startGovernanceGame(page, testInfo);
    await configureGovernance(page, 'count');

    expect(await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      /* A count holds counties, so the substitution must not apply: a
         modifier on some county they do not hold stays invisible to them. */
      const foreign = FB.world.provs.filter(function (province) {
        return !province.wasteland && p.provs.indexOf(province.id) < 0;
      })[0];
      FB.addModifier(s, 'market_charter', foreign.id, {});
      const summary = FB.governanceSummary(s);
      const shown = (summary && summary.modifierCounties || [])
        .map(function (item) { return item.provinceId; });
      return {
        seatIsNull:FB.modifierSeat(s) === null,
        ruleMatchesHeld:FB.modifierCounties(s).slice().sort().join(',') ===
          p.provs.slice().sort().join(','),
        foreignNotShown:shown.indexOf(foreign.id) < 0,
        foreignNotCharged:FB.modifierUpkeepEntries(s, 'gold')
          .every(function (entry) { return entry.pid !== foreign.id; })
      };
    })).toEqual({
      seatIsNull:true,
      ruleMatchesHeld:true,
      foreignNotShown:true,
      foreignNotCharged:true
    });
  });

test('a New Year session begun on the road still targets the home county',
  async function ({ page }, testInfo) {
    await startGovernanceGame(page, testInfo);
    await configureGovernance(page, 'baron');

    expect(await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const home = p.provinceId;
      const away = FB.world.provs.filter(function (province) {
        return !province.wasteland && province.id !== home;
      })[0].id;

      /* Away from home at New Year. The agenda is chosen by reading the
         modifiers on the home seat, so the event it queues must carry the
         home county: an unstamped context takes the visited one. */
      FB.addModifier(s, 'contested_tolls', home, {});
      p.travel = {
        purpose:'relationship',
        homeId:home,
        destinationId:away,
        destinationRealm:null,
        currentId:away,
        phase:'arrived',
        remainingRoute:[],
        outboundRoute:[away],
        visited:[home, away],
        legDays:3,
        legDaysLeft:0,
        startTurn:s.turn,
        cost:0,
        overhead:0,
        encounters:{ culture:0, road:0 },
        seenCultures:{},
        seenEvents:{},
        completed:true
      };

      const travelReads = FB.travelLocation(s);
      s.eventQueue = [];
      const candidates = FB.parliamentSessionCandidates(s);
      /* Drive the queue directly rather than waiting on the session roll. */
      FB.queueEvent(s, 'parliament_local_redress', {
        locationId:s.player.provinceId
      });
      const stamped = s.eventQueue[0] && s.eventQueue[0].ctx.locationId;

      /* The session roll is a coin flip, so retry within a bound rather than
         assert nothing half the time. Forty declines is not a real outcome. */
      s.eventQueue = [];
      let yearly = null;
      for (let i = 0; i < 40 && yearly === null; i++) {
        FB.parliamentYearly(s);
        if (s.eventQueue.length) yearly = s.eventQueue[0].ctx.locationId;
      }

      return {
        travelWouldRead:travelReads && travelReads.id === away,
        agendaSawHome:candidates.indexOf('parliament_local_redress') >= 0,
        motionPathStamps:stamped === home,
        sessionQueued:yearly !== null,
        yearlyStampsHome:yearly === home,
        yearlyNeverAway:yearly !== away
      };
    })).toEqual({
      travelWouldRead:true,
      agendaSawHome:true,
      motionPathStamps:true,
      sessionQueued:true,
      yearlyStampsHome:true,
      yearlyNeverAway:true
    });
  });
