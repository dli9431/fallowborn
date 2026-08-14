'use strict';

const { test, expect } = require('../support/fixture');
const { openGame, startDeterministicGame } = require('../support/game');

async function startGame(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
}

test('town council seats are local, retryable, and apply each bounded ordinance',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    const result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      var home = p.provinceId;
      var other = FB.world.provs.filter(function (province) {
        return !province.wasteland && province.id !== home;
      })[0].id;
      p.tier = 1;
      p.profession = 'merchant';
      p.flags.councilman = 1;
      delete p.localCouncil;
      me.skills.dip = 8;
      me.skills.ste = 7;
      p.pop = 25;
      var legacy = FB.localCouncilValidate(s, true);
      var legacyAvailable = legacy.nextMotionTurn === s.turn;
      var chance = FB.localCouncilMotionChance(s);
      var expectedChance = FB.clamp(0.50 + 0.02 *
        (FB.skillOf(me, 'dip') + FB.skillOf(me, 'ste') - 10) +
        0.002 * p.pop, 0.20, 0.90);
      var oldChance = FB.chance;
      var effects = {};
      FB.chance = function () { return true; };
      Object.keys(FBDATA.localCouncilMotions).forEach(function (motionId) {
        p.localCouncil.nextMotionTurn = s.turn;
        FB.proposeLocalCouncilMotion(s, motionId);
        effects[motionId] = {
          enterprise:FB.positionBonus(s, 'enterprise'),
          gold:FB.positionBonus(s, 'gold'),
          retinue:FB.positionBonus(s, 'retinue'),
          endTurn:p.localCouncil.ordinance.endTurn
        };
      });
      FB.chance = oldChance;
      var expiry = p.localCouncil.ordinance.endTurn;
      s.turn = expiry;
      FB.localCouncilValidate(s, true);
      var expired = FB.localCouncilOrdinance(s);

      p.localCouncil.nextMotionTurn = s.turn;
      p.provinceId = other;
      FB.localCouncilValidate(s, true);
      var relocated = !!p.localCouncil;

      p.provinceId = home;
      p.flags.councilman = 1;
      FB.localCouncilValidate(s, true);
      p.tier = 3;
      FB.localCouncilValidate(s, true);
      var promoted = !!p.localCouncil;

      p.tier = 2;
      p.profession = 'administration';
      p.flags.councilman = 1;
      FB.localCouncilValidate(s, true);
      me.dead = true;
      FB.localCouncilValidate(s, true);
      var dead = !!p.localCouncil;
      me.dead = false;

      var event = FB.eventById('town_elder');
      return {
        legacyProvince:legacy.provinceId,
        legacyAvailable:legacyAvailable,
        chance:chance,
        expectedChance:expectedChance,
        effects:effects,
        expired:expired,
        relocated:relocated,
        promoted:promoted,
        dead:dead,
        cooldown:event.cooldown,
        once:!!event.once,
        professions:event.trigger.professions.slice(),
        electionCustom:event.options[0].success.effects.custom
      };
    });

    expect(result.legacyProvince).toBeTruthy();
    expect(result.legacyAvailable).toBe(true);
    expect(result.chance).toBeCloseTo(result.expectedChance, 8);
    expect(result.effects.fair_measures.enterprise).toBeCloseTo(0.15, 8);
    expect(result.effects.civic_works.gold).toBeCloseTo(1.5, 8);
    expect(result.effects.watch_and_ward.retinue).toBe(30);
    expect(result.expired).toBeNull();
    expect(result.relocated).toBe(false);
    expect(result.promoted).toBe(false);
    expect(result.dead).toBe(false);
    expect(result.cooldown).toBe(8);
    expect(result.once).toBe(false);
    expect(result.professions).toContain('administration');
    expect(result.electionCustom).toBe('local_council_elected');
  });

test('four service charters produce exact distinct tax, levy, and political terms',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    const result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var home = p.provinceId;
      var counties = FB.world.provs.filter(function (province) {
        return !province.wasteland && province.id !== home;
      }).slice(0, 5).map(function (province) { return province.id; });
      p.tier = 6;
      p.provs = [home].concat(counties);
      p.liege = null;
      s.owner[home] = 'player';
      s.holder[home] = 'player';
      counties.forEach(function (pid) {
        s.owner[pid] = 'player';
        s.holder[pid] = 'player';
        s.dev[pid] = 10;
      });
      FB.foundPlayerRealm(s);
      s.realms.player.alive = true;
      s.realms.player.rank = 3;
      s.realms.player.liege = null;
      var ids = Object.keys(FBDATA.feudalServiceCharters);
      var rows = {};
      var oldRebelSupport = FB.rebelSupportMultiplier;
      FB.rebelSupportMultiplier = function () { return 1; };
      var tenureStanding = {
        hereditary:FB.feudalGrantPreview(s, 'county', counties[0],
          'customary_service', 'hereditary').initialStanding,
        life:FB.feudalGrantPreview(s, 'county', counties[0],
          'customary_service', 'life').initialStanding,
        term:FB.feudalGrantPreview(s, 'county', counties[0],
          'customary_service', 'term').initialStanding
      };
      ids.forEach(function (charterId, index) {
        var pid = counties[index];
        var preview = FB.feudalGrantPreview(s, 'county', pid,
          charterId, 'hereditary');
        FB.grantCounty(s, pid, charterId, 'hereditary');
        var rid = 'pv_' + pid;
        rows[charterId] = {
          previewTax:preview.tax,
          previewLevy:preview.levy,
          tax:FB.vassalTaxContribution(s, rid),
          levy:FB.vassalLevyContribution(s, rid),
          standing:preview.initialStanding,
          breakaway:FB.feudalCharterBreakawayMultiplier(s, rid),
          breakawayChance:FB.vassalBreakawayChance(s, rid),
          exempt:FB.feudalCharterDef(charterId).extraordinaryTaxExempt,
          contract:FB.feudalContractOf(s, rid)
        };
      });
      FB.rebelSupportMultiplier = oldRebelSupport;
      var oldGold = p.gold;
      var oldSte = s.chars[p.charId].skills.ste;
      s.chars[p.charId].skills.ste = 0;
      FB.demandTaxes(s);
      var extraordinary = p.gold - oldGold;
      s.chars[p.charId].skills.ste = oldSte;

      function security(row) {
        return (row.exempt ? 2 : 0) + (2 - row.breakaway);
      }
      var dominated = [];
      ids.forEach(function (a) {
        ids.forEach(function (b) {
          if (a === b) return;
          var ar = rows[a], br = rows[b];
          if (br.tax >= ar.tax && br.levy >= ar.levy &&
              security(br) >= security(ar) &&
              (br.tax > ar.tax || br.levy > ar.levy ||
                security(br) > security(ar))) dominated.push(a + '<' + b);
        });
      });
      return { rows:rows, tenureStanding:tenureStanding,
        extraordinary:extraordinary, dominated:dominated };
    });

    expect(result.rows.customary_service.tax).toBeCloseTo(3, 8);
    expect(result.rows.customary_service.levy).toBeCloseTo(135, 8);
    expect(result.rows.scutage_compact.tax).toBeCloseTo(4.5, 8);
    expect(result.rows.scutage_compact.levy).toBe(0);
    expect(result.rows.host_duty.tax).toBeCloseTo(0.75, 8);
    expect(result.rows.host_duty.levy).toBeCloseTo(270, 8);
    expect(result.rows.charter_of_liberties.tax).toBeCloseTo(1.5, 8);
    expect(result.rows.charter_of_liberties.levy).toBeCloseTo(45, 8);
    Object.keys(result.rows).forEach(function (charterId) {
      var row = result.rows[charterId];
      expect(row.previewTax).toBeCloseTo(row.tax, 8);
      expect(row.previewLevy).toBeCloseTo(row.levy, 8);
      expect(row.contract.charterId).toBe(charterId);
      expect(row.contract.tenure).toBe('hereditary');
    });
    expect(result.rows.charter_of_liberties.standing).toBe(55);
    expect(result.rows.host_duty.breakaway).toBe(1.25);
    expect(result.rows.charter_of_liberties.breakaway).toBe(0.5);
    expect(result.rows.host_duty.breakawayChance /
      result.rows.customary_service.breakawayChance).toBeCloseTo(1.25, 8);
    expect(result.rows.charter_of_liberties.breakawayChance /
      result.rows.customary_service.breakawayChance).toBeCloseTo(0.5, 8);
    expect(result.rows.charter_of_liberties.exempt).toBe(true);
    expect(result.tenureStanding).toEqual({ hereditary:40, life:35, term:30 });
    expect(result.extraordinary).toBe(33);
    expect(result.dominated).toEqual([]);
  });

test('fixed and life tenure revert through escheat while hereditary contracts survive restore',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    const result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var home = p.provinceId;
      var counties = FB.world.provs.filter(function (province) {
        return !province.wasteland && province.id !== home;
      }).slice(0, 4).map(function (province) { return province.id; });
      p.tier = 6;
      p.provs = [home].concat(counties);
      p.liege = null;
      [home].concat(counties).forEach(function (pid) {
        s.owner[pid] = 'player';
        s.holder[pid] = 'player';
        s.dev[pid] = 5;
      });
      FB.foundPlayerRealm(s);
      s.realms.player.alive = true;
      s.realms.player.rank = 3;
      FB.grantCounty(s, counties[0], 'host_duty', 'term');
      var termId = 'pv_' + counties[0];
      var term = s.realms[termId].feudalContract;
      var firstExpiry = term.expiryTurn;
      s.turn = term.expiryTurn - 90;
      FB.localGovernmentDay(s);
      var queued = term.renewal;
      var renewalEvent = s.eventQueue.filter(function (item) {
        return item.id === 'vassal_tenure_renewal' &&
          item.ctx && item.ctx.realmId === termId;
      })[0];
      FB.fns.feudal_renewal_accept(s, { realmId:termId });
      var renewedExpiry = term.expiryTurn;
      var renewedBy = renewedExpiry - firstExpiry;
      var renewedCharter = term.charterId;
      s.turn = renewedExpiry - 90;
      FB.localGovernmentDay(s);
      FB.fns.feudal_renewal_decline(s, { realmId:termId });
      var declinedRenewal = term.renewal;

      var subordinate = 'tenure_subordinate';
      s.realms[subordinate] = {
        id:subordinate, name:'Lesser Fee', capital:counties[1], rank:1,
        liege:termId, alive:true,
        ruler:{ name:'Osric', sex:'m', culture:'anglo_saxon', age:30,
          mar:5, generation:1 }
      };
      p.provs.splice(p.provs.indexOf(counties[1]), 1);
      s.owner[counties[1]] = 'player';
      s.holder[counties[1]] = subordinate;
      var enemyId = Object.keys(s.realms).filter(function (rid) {
        return rid !== 'player' && rid !== termId && rid !== subordinate &&
          s.realms[rid] && s.realms[rid].alive;
      })[0];
      s.realms[enemyId].war = { enemy:termId, years:0, captures:0 };
      p.war = { enemy:termId, defending:true, wins:0, losses:0, seasons:0 };
      s.turn = term.expiryTurn;
      FB.localGovernmentDay(s);
      var reverted = {
        held:p.provs.indexOf(counties[0]) >= 0,
        dead:!s.realms[termId].alive,
        subordinateLiege:s.realms[subordinate].liege,
        otherWar:s.realms[enemyId].war,
        playerWar:p.war
      };

      FB.grantCounty(s, counties[2], 'scutage_compact', 'hereditary');
      var hereditaryId = 'pv_' + counties[2];
      var hereditaryDeath = FB.feudalTenureEndsAtDeath(s, hereditaryId);
      var oldGeneration = s.realms[hereditaryId].ruler.generation;
      var hereditaryRuler = FB.realmRulerCharacter(s, hereditaryId);
      FB.killChar(s, hereditaryRuler);
      var inheritedContract = FB.feudalContractOf(s, hereditaryId);
      var hereditarySuccession = {
        alive:s.realms[hereditaryId].alive,
        generationChanged:s.realms[hereditaryId].ruler.generation !== oldGeneration,
        charterId:inheritedContract.charterId,
        tenure:inheritedContract.tenure
      };
      FB.grantCounty(s, counties[3], 'charter_of_liberties', 'life');
      var lifeId = 'pv_' + counties[3];
      var lifeEndsAtDeath = FB.feudalTenureEndsAtDeath(s, lifeId);
      var lifeRuler = FB.realmRulerCharacter(s, lifeId);
      FB.killChar(s, lifeRuler);
      var lifeReverted = p.provs.indexOf(counties[3]) >= 0 &&
        !s.realms[lifeId].alive;
      var saved = JSON.parse(FB.save.serialize());
      var savedRng = saved.rng;
      delete saved.state.realms[hereditaryId].feudalContract;
      FB.save.restore(saved);
      var legacy = FB.feudalContractOf(FB.state, hereditaryId);
      return {
        queued:queued,
        queuedDays:renewalEvent && renewalEvent.ctx.days,
        renewedBy:renewedBy,
        renewedCharter:renewedCharter,
        declinedRenewal:declinedRenewal,
        reverted:reverted,
        hereditaryDeath:hereditaryDeath,
        hereditarySuccession:hereditarySuccession,
        lifeEndsAtDeath:lifeEndsAtDeath,
        lifeReverted:lifeReverted,
        legacy:legacy,
        rngPreserved:FB.getRngState() === savedRng
      };
    });

    expect(result.queued).toBe('queued');
    expect(result.queuedDays).toBe(90);
    expect(result.renewedBy).toBe(3600);
    expect(result.renewedCharter).toBe('host_duty');
    expect(result.declinedRenewal).toBe('declined');
    expect(result.reverted.held).toBe(true);
    expect(result.reverted.dead).toBe(true);
    expect(result.reverted.subordinateLiege).toBe('player');
    expect(result.reverted.otherWar).toBeNull();
    expect(result.reverted.playerWar).toBeNull();
    expect(result.hereditaryDeath).toBe(false);
    expect(result.hereditarySuccession).toEqual({
      alive:true, generationChanged:true,
      charterId:'scutage_compact', tenure:'hereditary'
    });
    expect(result.lifeEndsAtDeath).toBe(true);
    expect(result.lifeReverted).toBe(true);
    expect(result.legacy.charterId).toBe('customary_service');
    expect(result.legacy.tenure).toBe('hereditary');
    expect(result.rngPreserved).toBe(true);
  });

test('Castellan is an appointed tier-three office with renewal and clean demotion paths',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    const result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      var home = p.provinceId;
      var patronId = (s.holder && s.holder[home]) || s.owner[home];
      if (!s.realms[patronId] || patronId === 'player') {
        patronId = Object.keys(s.realms).filter(function (rid) {
          return rid !== 'player' && s.realms[rid] && s.realms[rid].alive;
        })[0];
        s.holder[home] = patronId;
        s.owner[home] = FB.topRealm(s, patronId);
      }
      p.tier = 2;
      p.provs = [];
      p.liege = patronId;
      p.prestige = 200;
      p.liegeGrants = 0;
      me.skills.mar = 10;
      me.skills.ste = 4;
      FB.setRealmRulerStanding(s, patronId, 60);
      var status = FB.castellanAppointmentStatus(s, 'term');
      var lifeStatus = FB.castellanAppointmentStatus(s, 'life');
      var expectedBaseChance = FB.clamp(0.15 + status.standing / 400 +
        p.prestige / 1200 + status.bestSkill / 100, 0.10, 0.85);
      var expectedLifeChance = FB.clamp(0.15 + lifeStatus.standing / 400 +
        p.prestige / 1200 + lifeStatus.bestSkill / 100 - 0.20,
        0.10, 0.85);
      p.liegeGrants = 1;
      var repeatedStatus = FB.castellanAppointmentStatus(s, 'term');
      p.liegeGrants = 0;
      var oldChance = FB.chance;
      FB.chance = function () { return true; };
      var ownerBefore = s.owner[home];
      var appointed = FB.appointCastellan(s, 'term');
      var tierAtOffice = p.tier;
      var title = FB.styledTitle(s);
      var benefits = {
        tax:FB.playerTaxParts(s).rentBase,
        retinue:FB.playerCompositionBreakdown(s).units.ret,
        governance:!!FB.governanceSummary(s),
        ownerUnchanged:s.owner[home] === ownerBefore
      };
      s.turn = p.castellany.expiryTurn - 90;
      var renewal = FB.castellanRenewalStatus(s);
      var renewalExpected = FB.clamp(0.25 +
        FB.standingOf(s, { kind:'realm', id:patronId }) / 300 +
        Math.max(FB.skillOf(me, 'mar'), FB.skillOf(me, 'ste')) / 80,
        0.20, 0.90);
      var oldExpiry = p.castellany.expiryTurn;
      FB.renewCastellany(s);
      var renewedBy = p.castellany.expiryTurn - oldExpiry;
      FB.endCastellany(s, 'resignation', true);
      var resigned = {
        tier:p.tier, record:p.castellany || null, liege:p.liege || null
      };

      p.tier = 2;
      p.liege = patronId;
      p.prestige = 200;
      p.liegeGrants = 0;
      FB.setRealmRulerStanding(s, patronId, 60);
      FB.appointCastellan(s, 'life');
      s.holder[home] = Object.keys(s.realms).filter(function (rid) {
        return rid !== patronId && rid !== 'player' && s.realms[rid] &&
          s.realms[rid].alive;
      })[0];
      FB.castellanyValidate(s, true);
      var lostControl = {
        tier:p.tier, record:p.castellany || null, liege:p.liege || null
      };

      s.holder[home] = patronId;
      p.tier = 2;
      p.liege = patronId;
      p.prestige = 200;
      p.liegeGrants = 0;
      me.dead = false;
      FB.setRealmRulerStanding(s, patronId, 60);
      FB.appointCastellan(s, 'life');
      me.dead = true;
      FB.castellanyValidate(s, true);
      var diedInOffice = {
        tier:p.tier, record:p.castellany || null, liege:p.liege || null
      };
      me.dead = false;

      p.tier = 2;
      p.liege = patronId;
      p.prestige = 200;
      p.liegeGrants = 0;
      FB.setRealmRulerStanding(s, patronId, 60);
      FB.appointCastellan(s, 'term');
      s.turn = p.castellany.expiryTurn;
      FB.castellanyValidate(s, true);
      var expired = {
        tier:p.tier, record:p.castellany || null, liege:p.liege || null
      };

      s.holder[home] = patronId;
      p.tier = 2;
      p.liege = patronId;
      p.prestige = 200;
      p.liegeGrants = 0;
      FB.setRealmRulerStanding(s, patronId, 60);
      FB.appointCastellan(s, 'term');
      p.provs = [home];
      s.owner[home] = 'player';
      s.holder[home] = 'player';
      FB.setPlayerTier(s, 4, { attachLiege:false });
      var superseded = p.castellany || null;
      FB.chance = oldChance;
      return {
        chance:status.chance,
        lifeChance:lifeStatus.chance,
        expectedBaseChance:expectedBaseChance,
        expectedLifeChance:expectedLifeChance,
        repeatedChance:repeatedStatus.chance,
        repeatMultiplier:FBDATA.balance.liegeGrantRepeatMult,
        appointed:appointed.accepted,
        tierAtOffice:tierAtOffice,
        title:title,
        benefits:benefits,
        renewalVisible:renewal.visible,
        renewalChance:renewal.chance,
        renewalExpected:renewalExpected,
        renewedBy:renewedBy,
        resigned:resigned,
        lostControl:lostControl,
        diedInOffice:diedInOffice,
        expired:expired,
        superseded:superseded
      };
    });

    expect(result.chance).toBeCloseTo(result.expectedBaseChance, 8);
    expect(result.lifeChance).toBeCloseTo(result.expectedLifeChance, 8);
    expect(result.repeatedChance).toBeCloseTo(
      result.chance * result.repeatMultiplier, 8);
    expect(result.appointed).toBe(true);
    expect(result.tierAtOffice).toBe(3);
    expect(result.title).toContain('Castellan of');
    expect(result.title).not.toContain('Baron');
    expect(result.benefits.tax).toBe(6);
    expect(result.benefits.retinue).toBeGreaterThanOrEqual(120);
    expect(result.benefits.governance).toBe(true);
    expect(result.benefits.ownerUnchanged).toBe(true);
    expect(result.renewalVisible).toBe(true);
    expect(result.renewalChance).toBeCloseTo(result.renewalExpected, 8);
    expect(result.renewedBy).toBe(3600);
    expect(result.resigned).toEqual({ tier:2, record:null, liege:null });
    expect(result.lostControl).toEqual({ tier:2, record:null, liege:null });
    expect(result.diedInOffice).toEqual({ tier:2, record:null, liege:null });
    expect(result.expired).toEqual({ tier:2, record:null, liege:null });
    expect(result.superseded).toBeNull();
  });

test('grant terms and local council state are visible before and after confirmation',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    const setup = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var home = p.provinceId;
      var county = FB.world.provs.filter(function (province) {
        return !province.wasteland && province.id !== home;
      })[0].id;
      p.tier = 6;
      p.provs = [home, county];
      p.liege = null;
      s.owner[home] = s.owner[county] = 'player';
      s.holder[home] = s.holder[county] = 'player';
      s.dev[county] = 10;
      FB.foundPlayerRealm(s);
      s.realms.player.alive = true;
      s.realms.player.rank = 3;
      FB.ui.showGrantLand();
      return { county:county };
    });
    await page.locator('[data-pid="' + setup.county + '"]').click();
    await expect(page.getByRole('heading', {
      name:'Choose a Recipient', exact:true
    })).toBeVisible();
    await page.getByRole('button', { name:/new loyal vassal/i }).click();
    await expect(page.getByRole('heading', { name:/Terms for/ })).toBeVisible();
    await expect(page.locator('#gm-body')).toContainText('3 gold/season');
    await expect(page.locator('#gm-body')).toContainText('135 soldiers');
    await page.locator('[data-grant-charter="host_duty"]').click();
    await page.locator('[data-grant-tenure="term"]').click();
    await expect(page.locator('#gm-body')).toContainText('270 soldiers');
    await expect(page.locator('#gm-body')).toContainText('initial Standing +30');
    await page.locator('#grant-terms-confirm').click();

    const contract = await page.evaluate(function (pid) {
      var rid = 'pv_' + pid;
      FB.ui.showGovernance('vassals');
      return FB.feudalContractOf(FB.state, rid);
    }, setup.county);
    expect(contract.charterId).toBe('host_duty');
    expect(contract.tenure).toBe('term');
    await expect(page.locator('#governance-vassals')).toContainText('Host Duty');
    await expect(page.locator('#governance-vassals')).toContainText('Ten-year');
    await expect(page.locator('#governance-vassals')).toContainText('Breakaway ×1.25');
  });
