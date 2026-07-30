'use strict';

const { test, expect } = require('../support/fixture');
const {
  openGame,
  startDeterministicGame
} = require('../support/game');

async function startGovernanceGame(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
}

async function configureGovernance(page, kind) {
  return page.evaluate(function (setupKind) {
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
      p.liegeOp = 28;
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
      p.liegeOps[vassalId] = 48;
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
    FB.ui.refresh();
    return {
      homeId:homeId,
      liegeId:p.liege,
      vassalId:s.realms.governance_vassal
        ? 'governance_vassal' : null
    };
  }, kind);
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
    await page.locator('.tab[data-tab="network"]').click();
    await expect(page.locator('#network-governance')).toBeVisible();
    await expect(page.locator('#network-governance')).toContainText(
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
    await page.evaluate(function (rid) {
      FB.ui.showLiegeModal(rid);
    }, setup.vassalId);
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
        return {
          rowDisplay:getComputedStyle(row).display,
          rowColumns:getComputedStyle(row).gridTemplateColumns.split(' ').length,
          statColumns:getComputedStyle(stats).gridTemplateColumns.split(' ').length,
          actionsVisible:actions.getClientRects().length > 0,
          rowHeight:row.getBoundingClientRect().height
        };
      });
    expect(layout.rowDisplay).toBe('grid');
    expect(layout.rowColumns).toBe(3);
    expect(layout.statColumns).toBe(5);
    expect(layout.actionsVisible).toBe(true);
    expect(layout.rowHeight).toBeLessThan(150);

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
        return {
          rowDisplay:getComputedStyle(row).display,
          statColumns:getComputedStyle(stats).gridTemplateColumns.split(' ').length,
          actionColumns:getComputedStyle(actions).gridTemplateColumns.split(' ').length
        };
      });
    expect(vassalLayout.rowDisplay).toBe('block');
    expect(vassalLayout.statColumns).toBe(2);
    expect(vassalLayout.actionColumns).toBe(2);

    await page.locator('[data-governance-section="institution"]').click();
    await page.locator(
      '#governance-institution [data-governance-institution="council"]').click();
    await expect(page.getByRole('heading', {
      name:'The Royal Council', exact:true
    })).toBeVisible();
    await page.evaluate(function () {
      history.back();
    });
    await expect(page.getByRole('heading', {
      name:'🏛 Governance', exact:true
    })).toBeVisible();
    await expect(page.locator('#governance-institution')).toBeFocused();
  });
