'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/institutions.js',
  'js/parliament.js',
  'js/politics.js',
  'js/population.js',
  'js/technology.js',
  'js/ui_modals.js',
  'data/policies.js',
  'data/modifiers.js',
  'data/political_institutions.js',
  'data/events_politics.js',
  'data/technology.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { waitForUiRefresh } = require('../support/game/ui');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

/* A sovereign tier-6 player realm holding two counties — one of the realm's
   faith, one of another — with an other-faith vassal and two foreign
   sovereigns, one per fold. Same synthetic-court pattern as policies.spec.js. */
async function configureCrown(page) {
  const configured = await page.evaluate(function () {
    const s = FB.state;
    const p = s.player;
    const me = s.chars[p.charId];
    const provinces = FB.world.provs.filter(function (province) {
      return !province.wasteland;
    });
    const countyIds = [p.provinceId];
    for (let i = 0; i < provinces.length && countyIds.length < 8; i++) {
      if (countyIds.indexOf(provinces[i].id) < 0) {
        countyIds.push(provinces[i].id);
      }
    }
    const religion = me.religion;
    let otherReligion = null;
    const religionIds = Object.keys(FBDATA.religions).sort();
    for (let i = 0; i < religionIds.length; i++) {
      if (!FB.faithInFold(s, religion, religionIds[i])) {
        otherReligion = religionIds[i];
        break;
      }
    }

    function realm(id, name, rank, liege, capital, realmReligion) {
      s.realms[id] = {
        id:id, name:name, color:'#705435', capital:capital,
        aggression:0, rank:rank, liege:liege, alive:true, favor:0,
        religion:realmReligion,
        ruler:{ name:name + ' Ruler', sex:'m', culture:me.culture,
          age:40, mar:6, ste:6, dip:6, trait:'content', generation:1 }
      };
    }
    realm('policy_foreign', 'Foreign Crown', 3, null, countyIds[5],
      otherReligion);
    realm('policy_ally', 'Kindred Crown', 3, null, countyIds[6],
      religion);
    realm('policy_vassal', 'Alien March', 1, 'player', countyIds[4],
      otherReligion);

    FB.game.observe = false;
    p.dead = false;
    p.tier = 6;
    p.gold = 500;
    p.prestige = 200;
    p.piety = 100;
    p.pop = 0;
    p.liege = null;
    p.war = null;
    p.travel = null;
    const home = countyIds[0];
    const minority = countyIds[1];
    FB.world.byId[minority].religion = otherReligion;
    p.provs = [home, minority];
    p.provinceId = home;
    s.owner[home] = 'player';
    s.holder[home] = 'player';
    s.owner[minority] = 'player';
    s.holder[minority] = 'player';
    s.dev[home] = 3;
    s.dev[minority] = 1;
    s.realmPolicies = null;
    s.privileges = [];
    s.collectiveDemands = null;
    FB.foundPlayerRealm(s);
    s.realms.player.rank = 3;
    s.realms.player.liege = null;
    FB.invalidateRealmCache();
    FB.ensureInstitutions(s, { silent:true });
    p.roleOrientationsSeen = p.roleOrientationsSeen || {};
    p.roleOrientationsSeen['role-tier-' + p.tier] = 1;
    FB.ui.refresh();
    return {
      home:home,
      minority:minority,
      religion:religion,
      otherReligion:otherReligion
    };
  });
  // Settle onboarding writes caused by the synthetic rank change before
  // callers take read-only baselines.
  await waitForUiRefresh(page);
  return configured;
}

test('old saves heal to the declared default levels with no standing effects',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      FB.ensureInstitutions(s, { silent:true });
      const healed = {
        tolerance:FB.realmPolicyLevelId(s, 'religious_tolerance'),
        settlement:FB.realmPolicyLevelId(s, 'settlement_policy'),
        active:FB.realmPolicyActive(s),
        modifier:FB.hasModifier(s, 'persecuted_minorities',
          s.player.provinceId),
        blocked:FB.realmPolicyStatus(s, 'religious_tolerance', 'persecution')
      };
      /* Legacy garbage: an unknown level and an unknown policy id are
         repaired to the declared default and dropped. */
      s.realmPolicies = {
        religious_tolerance:{ level:'not_a_level', setTurn:5, setYear:866 },
        bogus_policy:{ level:'x' }
      };
      FB.ensureInstitutions(s, { silent:true });
      return {
        healed:healed,
        repaired:{
          tolerance:s.realmPolicies.religious_tolerance.level,
          bogusRemoved:!s.realmPolicies.bogus_policy,
          settlement:s.realmPolicies.settlement_policy.level
        },
        forecastExcluded:FB.politicalMotionForecast(
          s, 'religious_tolerance') === null
      };
    });

    expect(result.healed.tolerance).toBe('confessional_preference');
    expect(result.healed.settlement).toBe('licensed_newcomers');
    expect(result.healed.active).toBe(false);
    expect(result.healed.modifier).toBe(false);
    expect(result.healed.blocked.ready).toBe(false);
    expect(result.healed.blocked.reason).toContain('crowned sovereign');
    expect(result.repaired.tolerance).toBe('confessional_preference');
    expect(result.repaired.bogusRemoved).toBe(true);
    expect(result.repaired.settlement).toBe('licensed_newcomers');
    expect(result.forecastExcluded).toBe(true);
  });

test('persecution applies through existing ledgers and feeds mistreatment',
  async function ({ page }) {
    const setup = await configureCrown(page);
    const result = await page.evaluate(function (ids) {
      const s = FB.state;
      const p = s.player;
      const goldBefore = p.gold;
      const pietyBefore = p.piety;
      const researchBefore = FB.techResearchRate(s, 'player');
      const faithBefore = FB.world.byId[ids.minority].religion;
      /* standings carry faith-relation priors; measure the policy's deltas */
      const foreignBefore = FB.standingOf(s, {
        kind:'realm', id:'policy_foreign' });
      const allyBefore = FB.standingOf(s, {
        kind:'realm', id:'policy_ally' });
      const vassalBefore = FB.standingOf(s, {
        kind:'realm', id:'policy_vassal' });
      const minority = FB.realmPolicyMinorityCounties(s);
      const proclaimed = FB.realmPolicyProclaim(
        s, 'religious_tolerance', 'persecution');
      const record = FB.realmPolicyRecord(s, 'religious_tolerance');
      const yearAtProclaim = s.date.year;
      const goldAfterProclaim = p.gold;
      const foreignAfterProclaim = FB.standingOf(s, {
        kind:'realm', id:'policy_foreign' });
      const allyAfterProclaim = FB.standingOf(s, {
        kind:'realm', id:'policy_ally' });
      const vassalAfterProclaim = FB.standingOf(s, {
        kind:'realm', id:'policy_vassal' });
      const researchAfterProclaim = FB.techResearchRate(s, 'player');
      const persecutedOnMinority = FB.hasModifier(
        s, 'persecuted_minorities', ids.minority);
      const persecutedOnHome = FB.hasModifier(
        s, 'persecuted_minorities', ids.home);
      const seasonPietyBefore = p.piety;
      FB.realmPolicySeason(s);
      const sameFamily = FB.realmPolicyStatus(
        s, 'religious_tolerance', 'tolerated_minorities');
      const otherFamily = FB.realmPolicyStatus(
        s, 'settlement_policy', 'closed_settlement');
      const mistreatment = (s.collectiveDemands.mistreatment || [])
        .filter(function (row) { return row.kind === 'religious_persecution'; });
      const yearlyBefore = mistreatment.length;
      FB.realmPolicyYearly(s);
      const yearlyAfter = (s.collectiveDemands.mistreatment || [])
        .filter(function (row) { return row.kind === 'religious_persecution'; })
        .length;
      /* Repeal is an ordinary proclamation of another level once the
         family's year has passed. */
      s.date.year++;
      const repealed = FB.realmPolicyProclaim(
        s, 'religious_tolerance', 'tolerated_minorities');
      return {
        minority:minority,
        proclaimed:proclaimed,
        goldAfter:goldAfterProclaim,
        recordLevel:record.level,
        recordYear:record.setYear === yearAtProclaim,
        pietyGained:p.piety - pietyBefore,
        seasonPiety:p.piety - seasonPietyBefore,
        researchFactor:researchAfterProclaim / researchBefore,
        persecutedOnMinority:persecutedOnMinority,
        persecutedOnHome:persecutedOnHome,
        faithUnchanged:FB.world.byId[ids.minority].religion === faithBefore,
        foreignStanding:foreignAfterProclaim - foreignBefore,
        allyStanding:allyAfterProclaim - allyBefore,
        vassalStanding:vassalAfterProclaim - vassalBefore,
        mistreatmentCount:yearlyBefore,
        yearlyAdded:yearlyAfter - yearlyBefore,
        sameFamilyReady:sameFamily.ready,
        sameFamilyReason:sameFamily.reason,
        otherFamilyReady:otherFamily.ready,
        repealed:repealed,
        swappedOut:!FB.hasModifier(s, 'persecuted_minorities', ids.minority),
        swappedIn:FB.hasModifier(s, 'tolerated_minorities', ids.minority)
      };
    }, setup);

    expect(result.minority).toEqual([setup.minority]);
    expect(result.proclaimed).toBe(true);
    expect(result.goldAfter).toBe(480);
    expect(result.recordLevel).toBe('persecution');
    expect(result.recordYear).toBe(true);
    expect(result.pietyGained).toBe(10 + 2); // proclamation plus one season
    expect(result.seasonPiety).toBe(2);
    expect(result.researchFactor).toBeCloseTo(0.85, 5);
    expect(result.persecutedOnMinority).toBe(true);
    expect(result.persecutedOnHome).toBe(false);
    expect(result.faithUnchanged).toBe(true);
    expect(result.foreignStanding).toBe(-8);
    expect(result.allyStanding).toBe(3);
    expect(result.vassalStanding).toBe(-15);
    // deltas against each realm's faith-relation prior, not absolutes
    expect(result.mistreatmentCount).toBe(1);
    expect(result.yearlyAdded).toBe(1);
    expect(result.sameFamilyReady).toBe(false);
    expect(result.sameFamilyReason).toContain('faith');
    expect(result.otherFamilyReady).toBe(true);
    expect(result.repealed).toBe(true);
    expect(result.swappedOut).toBe(true);
    expect(result.swappedIn).toBe(true);
  });

test('protected worship records faith privileges and early repeal is unlawful',
  async function ({ page }) {
    const setup = await configureCrown(page);
    const result = await page.evaluate(function (ids) {
      const s = FB.state;
      const p = s.player;
      FB.realmPolicyProclaim(s, 'religious_tolerance', 'protected_worship');
      const privileges = FB.privilegeSummary(s).filter(function (record) {
        return record.defId === 'protected_worship';
      });
      /* A later year is still inside the protected term: leaving early is
         the unlawful-revocation path, warned about before the proclamation. */
      s.date.year++;
      const status = FB.realmPolicyStatus(
        s, 'religious_tolerance', 'confessional_preference');
      const popBefore = p.pop;
      const repealed = FB.realmPolicyProclaim(
        s, 'religious_tolerance', 'confessional_preference');
      /* read the unlawful-repeal cost now, before the lawful sequence below
         re-proclaims and pays its own onEnact pop */
      const popAfterRepeal = p.pop;
      const demands = FB.collectiveDemandSummary(s);
      const mistreatment = (s.collectiveDemands.mistreatment || [])
        .filter(function (row) {
          return row.kind === 'unlawful_privilege_revocation';
        });
      /* Once the protected term has run, repeal is lawful again. */
      const mistakesBefore = mistreatment.length;
      s.date.year++;
      FB.realmPolicyProclaim(s, 'religious_tolerance', 'protected_worship');
      s.turn += (FBDATA.balance.realmPolicyProtectedWorshipDays || 1440);
      s.date.year++;
      const lawful = FB.realmPolicyProclaim(
        s, 'religious_tolerance', 'tolerated_minorities');
      const mistakesAfter = (s.collectiveDemands.mistreatment || [])
        .filter(function (row) {
          return row.kind === 'unlawful_privilege_revocation';
        }).length;
      return {
        privilege:privileges[0] || null,
        modifierHeld:FB.hasModifier(s, 'protected_worship', ids.minority),
        warnedDays:status.warning ? status.warning.days : null,
        repealed:repealed,
        popDelta:popAfterRepeal - popBefore,
        mistreatment:mistreatment.length,
        faithOpposition:demands.opposition.some(function (row) {
          return row.constituency === 'faith';
        }),
        privilegeGone:!FB.privilegeSummary(s).some(function (record) {
          return record.defId === 'protected_worship';
        }),
        lawful:lawful,
        lawfulMistreatmentDelta:mistakesAfter - mistakesBefore
      };
    }, setup);

    expect(result.privilege).toMatchObject({
      defId:'protected_worship', holderType:'faith', scopeType:'county',
      scopeId:setup.minority, effectKind:'modifier',
      effectId:'protected_worship', revocationRule:'policy_change'
    });
    expect(result.warnedDays).toBeGreaterThan(0);
    expect(result.repealed).toBe(true);
    expect(result.popDelta).toBe(-10);
    expect(result.mistreatment).toBe(1);
    expect(result.faithOpposition).toBe(true);
    expect(result.privilegeGone).toBe(true);
    expect(result.modifierHeld).toBe(false);
    expect(result.lawful).toBe(true);
    expect(result.lawfulMistreatmentDelta).toBe(0);
  });

test('encouraged settlement moves migration draw, markets, and development',
  async function ({ page }) {
    const setup = await configureCrown(page);
    const result = await page.evaluate(function (ids) {
      const s = FB.state;
      const attractionBefore = FB.countyMigrationAttraction(s, ids.home);
      const researchBefore = FB.techResearchRate(s, 'player');
      const proclaimed = FB.realmPolicyProclaim(
        s, 'settlement_policy', 'encouraged_settlement');
      const attractionAfter = FB.countyMigrationAttraction(s, ids.home);
      /* the season tick below grows the minority county's development, which
         lifts realm strength and with it the raw research numerator; measure
         the policy factor before it runs */
      const researchAfterProclaim = FB.techResearchRate(s, 'player');
      const devBefore = s.dev[ids.minority];
      const originalRng = FB.rng;
      FB.rng = function () { return 0; };
      FB.realmPolicySeason(s);
      FB.rng = originalRng;
      const triggers = {
        persecution:FB.fns.realm_policy_persecution_due(s),
        settlers:FB.fns.realm_policy_encouraged_settlement_due(s),
        refugees:FB.fns.realm_policy_protected_worship_due(s)
      };
      return {
        proclaimed:proclaimed,
        attractionShift:attractionAfter - attractionBefore,
        policyAttraction:FB.realmPolicySettlementAttraction(s),
        onHome:FB.hasModifier(s, 'encouraged_settlement', ids.home),
        onMinority:FB.hasModifier(s, 'encouraged_settlement', ids.minority),
        researchRatio:researchAfterProclaim / researchBefore,
        devBefore:devBefore,
        devAfter:s.dev[ids.minority],
        devHomeUnchanged:s.dev[ids.home] === 3,
        triggers:triggers
      };
    }, setup);

    expect(result.proclaimed).toBe(true);
    expect(result.policyAttraction).toBe(2);
    expect(result.attractionShift).toBe(2);
    expect(result.onHome).toBe(true);
    expect(result.onMinority).toBe(true);
    expect(result.researchRatio).toBeCloseTo(1.05, 5);
    expect(result.devAfter).toBe(result.devBefore + 1);
    expect(result.devHomeUnchanged).toBe(true);
    expect(result.triggers).toEqual({
      persecution:false, settlers:true, refugees:false });
  });

test('the Estates refuse crown policy and the royal sheet shows every level',
  async function ({ page }) {
    const setup = await configureCrown(page);

    /* A vassal sworn to a living liege cannot move crown families before the
       Estates; the bloc forecast excludes them entirely. */
    const gates = await page.evaluate(function () {
      const s = FB.state;
      s.player.tier = 4;
      s.player.liege = 'policy_foreign';
      const status = FB.parliamentMotionStatus(s, 'religious_tolerance');
      return {
        active:FB.parliamentActive(s),
        ready:status.ready,
        reason:status.reason,
        forecast:FB.politicalMotionForecast(s, 'religious_tolerance'),
        redressForecast:!!FB.politicalMotionForecast(s, 'redress'),
        settlementReady:FB.realmPolicyStatus(
          s, 'settlement_policy', 'closed_settlement').ready
      };
    });
    expect(gates.active).toBe(true);
    expect(gates.ready).toBe(false);
    expect(gates.reason).toContain('crown');
    expect(gates.forecast).toBeNull();
    expect(gates.redressForecast).toBe(true);
    expect(gates.settlementReady).toBe(false);

    await page.evaluate(function () {
      const s = FB.state;
      s.player.tier = 6;
      s.player.liege = null;
    });

    const before = await page.evaluate(function () {
      return {
        save:FB.save.serialize(),
        rng:JSON.stringify(FB.getRngState())
      };
    });
    await page.evaluate(function () {
      FB.ui.showGovernance('institution');
    });
    await page.locator('[data-governance-policies]').click();
    await expect(page.locator('#gm-body')).toContainText('Religious Tolerance');
    await expect(page.locator('#gm-body')).toContainText('Settlement Policy');
    await expect(page.locator('#gm-body')).toContainText('Persecution');
    await expect(page.locator('#gm-body')).toContainText('Protected Worship');
    await expect(page.locator('#gm-body')).toContainText('Closed Settlement');
    await expect(page.locator('#gm-body')).toContainText('Standing policy');
    await expect(page.locator('#gm-body')).toContainText(
      'before the protected term ends is an unlawful revocation');
    await expect(page.locator(
      '#gm-body > .gm-footer > #realm-policies-back')).toBeVisible();
    await expect.poll(async function () {
      return page.evaluate(function () {
        return document.activeElement && document.activeElement.id;
      });
    }).toBe('genmodal');

    /* Proclaiming through the sheet updates the standing level in place and
       spends the family's year; other levels show the exact blocked reason. */
    await page.locator(
      '[data-realm-policy="settlement_policy:closed_settlement"]').click();
    await expect(page.locator('#gm-body')).toContainText(
      'Closed Settlement · Standing policy');
    await expect(page.locator(
      '[data-realm-policy="settlement_policy:encouraged_settlement"]'))
      .toBeDisabled();
    await expect(page.locator('#gm-body')).toContainText(
      'already settled settlement policy this year');
    const record = await page.evaluate(function () {
      return FB.realmPolicyRecord(FB.state, 'settlement_policy').level;
    });
    expect(record).toBe('closed_settlement');

    await page.locator('#realm-policies-back').click();
    await expect(page.locator('#governance-institution')).toBeVisible();

    const after = await page.evaluate(function () {
      return {
        save:FB.save.serialize(),
        rng:JSON.stringify(FB.getRngState())
      };
    });
    /* Only the proclamation itself may have written state; reading the
       sheets consumes neither RNG nor unrelated save data. */
    expect(after.rng).toBe(before.rng);
  });
