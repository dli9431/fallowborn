'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/cultures.js', 'data/economy.js', 'data/map_data.js', 'data/technology.js',
  'js/actions.js', 'js/model.js', 'js/economy.js', 'js/events.js',
  'js/save.js', 'js/technology.js', 'js/ui_panels.js', 'js/ui_misc.js', 'js/ui_modals.js', 'js/i18n.js', 'js/mods.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { seedDoctrineContacts } = require('../support/game/doctrines');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('doctrine buttons label spending and learning tooltips explain timing and adoption limits',
  async function ({ page }) {
    await seedDoctrineContacts(page);
    await page.evaluate(function () {
      var s = FB.state;
      s.chars[s.player.charId].culture = 'german';
      s.player.prestige = 5000; s.player.war = null; s.player.cooldowns = {};
      FB.ui.showDoctrineOptions('culture', 'learning');
    });
    const button = page.locator('[data-doctrine-option="nordic"]');
    await expect(button).toContainText('Cost: 300 prestige');
    const detailsId = await button.getAttribute('aria-describedby');
    const details = page.locator('#' + detailsId);
    await expect(details).toContainText('Effect:');
    await expect(details).toContainText('adoption dates and research costs');
    await expect(details).toContainText('Later widespread adoption (examples)');
    await expect(details).toContainText('instead of');
    await expect(details).toContainText('Cost: 300 prestige');
    await expect(details).toContainText('Common Voice: -5');
    await expect(details).toContainText('Requires local dominance');
    await expect(details).toContainText('Vassals use sovereign traditions');
    const copy = await details.textContent();
    expect(copy.trim().split(/\s+/).length).toBeLessThanOrEqual(160);
    expect((copy.match(/instead of/g) || []).length).toBeLessThanOrEqual(2);
    await button.click();
    await expect(page.locator('#gm-body')).toContainText('Later widespread adoption (examples)');
    await expect(page.locator('#gm-body')).toContainText('Completed technology is retained');
    await page.evaluate(function () {
      FB.state.player.prestige = 0;
      FB.ui.showDoctrineOptions('culture', 'learning');
    });
    await expect(button).toBeDisabled();
    await expect(button).toContainText('Cost: 300 prestige');
    await expect(page.locator('#' + detailsId)).toContainText('Requires 300 prestige');
  });

for (const kind of ['faith', 'culture']) {
  test(kind + ' doctrine choices require a real encountered source and revalidate confirmation',
    async function ({ page }) {
      const setup = await page.evaluate(function (kind) {
        var s = FB.state, p = s.player, me = s.chars[p.charId];
        me.religion = 'catholic'; me.culture = 'german';
        p.piety = 5000; p.prestige = 5000; p.war = null; p.cooldowns = {};
        var doctrine = kind === 'faith' ? 'marriage_form' : 'craftsmanship';
        var option = kind === 'faith' ? 'plural' : 'contact_craft';
        if (kind === 'culture') {
          FBDATA.doctrineCatalogs.culture.craftsmanship.options.contact_craft = {
            name:'Contact craft', desc:'A modded craft practice.', value:0.2, cost:{ prestige:300 }
          };
        }
        // Authored identities have no campaign creation stamp granting discovery.
        var donor = kind === 'faith' ? 'remote_fellowship' : 'remote_craftsmen';
        FB.mods.apply(kind === 'faith' ? {
          religions:{ remote_fellowship:{
            name:'Remote fellowship', parent:'pagan', relationToParent:'hostile',
            properties:{ marriage:{ spouseLimit:{ m:3, f:3 } } }
          } }
        } : {
          cultures:{ remote_craftsmen:{
            name:'Remote craftsmen', parent:'arabic', doctrines:{ craftsmanship:0.2 }
          } }
        });
        if (!(kind === 'faith' ? FB.faithAssignable(donor, s) : FB.cultureAssignable(donor, s))) {
          throw new Error('Remote doctrine source must be an assignable authored identity.');
        }
        var before = JSON.stringify(s);
        var rejected = FB.applyDoctrineReform(s, kind, doctrine, option);
        var unchanged = before === JSON.stringify(s);
        FB.ui.showDoctrineOptions(kind, doctrine);
        return { donor:donor, doctrine:doctrine, option:option, rejected:rejected, unchanged:unchanged };
      }, kind);
      expect(setup.rejected).toBe(false);
      expect(setup.unchanged).toBe(true);
      const choice = page.locator('[data-doctrine-option="' + setup.option + '"]');
      await expect(choice).toHaveCount(0);
      await page.evaluate(function (args) {
        var p = FB.state.player;
        var field = args.kind === 'faith' ? 'encounteredFaiths' : 'encounteredCultures';
        p[field] = p[field] || {}; p[field][args.setup.donor] = 1;
        FB.ui.showDoctrineOptions(args.kind, args.setup.doctrine);
      }, { kind:kind, setup:setup });
      await expect(choice).toBeEnabled();
      await expect(choice).toContainText(kind === 'faith' ? 'Cost: 300 piety' : 'Cost: 300 prestige');
      const choiceDetails = page.locator('#' + await choice.getAttribute('aria-describedby'));
      await expect(choiceDetails).toContainText('Effect:');
      const choiceCopy = await choiceDetails.textContent();
      expect(choiceCopy.trim().split(/\s+/).length).toBeLessThanOrEqual(100);
      await choice.click();
      await expect(page.locator('#gm-body')).toContainText('Common Voice: -5');
      await expect(page.locator('#gm-body')).toContainText('Next reform in 360 days');
      const result = await page.evaluate(function (args) {
        var s = FB.state, p = s.player;
        var field = args.kind === 'faith' ? 'encounteredFaiths' : 'encounteredCultures';
        delete p[field][args.setup.donor];
        var before = JSON.stringify(s);
        document.getElementById('doctrine-confirm').click();
        return before === JSON.stringify(s);
      }, { kind:kind, setup:setup });
      expect(result).toBe(true);
    });

  test(kind + ' reforms escalate costs, backlash and cooldown across saves and parent returns',
    async function ({ page }) {
      await seedDoctrineContacts(page);
      const result = await page.evaluate(function (kind) {
        var s = FB.state, p = s.player, me = s.chars[p.charId];
        me.religion = 'catholic'; me.culture = 'german';
        p.piety = 20000; p.prestige = 20000; p.pop = 50;
        p.war = null; p.cooldowns = {};
        var first = kind === 'faith' ? ['close_kin', 'sanctioned'] : ['raiding', 'practiced'];
        var second = kind === 'faith' ? ['marriage_form', 'plural'] : ['military', 'huscarl'];
        var restore = kind === 'faith' ? 'monogamy' : 'levy';
        var firstStatus = FB.doctrineReformStatus(s, kind, first[0], first[1]);
        var branch = FB.applyDoctrineReform(s, kind, first[0], first[1]);
        var pop1 = p.pop;
        var immediate = FB.doctrineReformStatus(s, kind, second[0], second[1]);
        s.turn += firstStatus.cooldownDays;
        var secondStatus = FB.doctrineReformStatus(s, kind, second[0], second[1]);
        FB.applyDoctrineReform(s, kind, second[0], second[1]);
        var pop2 = p.pop;
        FB.save.restore(JSON.parse(FB.save.serialize()));
        s = FB.state; p = s.player;
        var history = JSON.parse(JSON.stringify(p.doctrineReforms[kind]));
        s.turn += secondStatus.cooldownDays;
        var restoring = FB.doctrineReformStatus(s, kind, second[0], restore);
        FB.applyDoctrineReform(s, kind, second[0], restore);
        var pop3 = p.pop;
        s.turn += restoring.cooldownDays;
        var finalRestore = FB.doctrineReformStatus(s, kind, first[0], 'forbidden');
        FB.applyDoctrineReform(s, kind, first[0], 'forbidden');
        s.turn += finalRestore.cooldownDays;
        var repeat = FB.doctrineReformStatus(s, kind, first[0], first[1]);
        return { branch:branch, first:firstStatus, immediate:immediate,
          second:secondStatus, pop1:pop1, pop2:pop2, pop3:pop3,
          history:history, restoring:restoring, finalRestore:finalRestore, repeat:repeat };
      }, kind);
      expect(result.branch).toBeTruthy();
      expect(result.immediate.ok).toBe(false);
      expect(result.first.cooldownDays).toBe(360);
      expect(result.second.cooldownDays).toBe(450);
      expect(result.second.popularOpinion).toBe(-10);
      expect(result.pop1).toBe(45);
      expect(result.pop2).toBe(35);
      expect(result.pop3).toBe(35);
      expect(result.history.count).toBe(2);
      expect(result.restoring.popularOpinion).toBe(0);
      expect(result.finalRestore.restoresParent).toBe(true);
      expect(result.repeat.ok).toBe(true);
      const currency = kind === 'faith' ? 'pietyCost' : 'prestigeCost';
      expect(result.repeat[currency]).toBe(result.first[currency] * 2);
      expect(result.repeat.cooldownDays).toBe(720);
      expect(result.repeat.popularOpinion).toBe(-25);
    });
}

test('doctrine benefits reach seasonal ledgers and resident followers without household stacking',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      var s = FB.state, p = s.player, me = s.chars[p.charId];
      p.tier = 1; p.travel = null; p.pop = 0; me.traits = [];
      for (var member of FB.householdMembers(s)) {
        member.culture = 'german'; member.religion = 'norse_pagan';
        member.career = { profession:'farmer', rank:'journeyman', chosen:true,
          experience:0, startedYear:s.date.year, guildRank:'none', guildStanding:0 };
      }
      var plain = FB.createFaith(s, { name:'Quiet faith', parent:'norse_pagan' });
      var worship = FB.createFaith(s, { name:'Worship faith', parent:plain,
        properties:{ doctrines:{ observance:2 } } });
      var charity = FB.createFaith(s, { name:'Alms faith', parent:plain,
        properties:{ doctrines:{ charity:1 } } });
      me.religion = plain;
      var plainPiety = FB.livelihoodPiety(s);
      me.religion = worship;
      var worshipPiety = FB.livelihoodPiety(s);
      var pietyBefore = p.piety;
      FB.livelihoodSeason(s);
      var seasonalPiety = p.piety - pietyBefore;
      me.religion = charity; p.gold = 100;
      var lines = FB.livelihoodBreakdown(s);
      var expectedGold = p.gold + lines.reduce(function (sum, line) { return sum + line.amount; }, 0);
      FB.livelihoodSeason(s);
      var gold = p.gold, pop = p.pop;
      p.gold = -10000;
      var brokeAlms = FB.livelihoodBreakdown(s).filter(function (line) { return line.doctrineAlms; });
      var spouse = FB.makeCharacter(s, { name:'Craft worker', sex:'m', culture:'german',
        religion:plain, born:s.date.year - 25, dyn:me.dyn, role:'spouse', traits:[] });
      me.spouseId = spouse.id; spouse.spouseId = me.id;
      spouse.career = { profession:'farmer', rank:'journeyman', chosen:true,
        experience:0, startedYear:s.date.year, guildRank:'none', guildStanding:0 };
      function wage() {
        return FB.livelihoodBreakdown(s).filter(function (line) {
          return line.label.indexOf('Craft worker') >= 0;
        })[0].amount;
      }
      var baseWage = wage();
      var craft = FB.createCulture(s, { name:'Craft branch', parent:'german', doctrines:{ craftsmanship:0.1 } });
      me.culture = craft;
      var founderOnlyWage = wage();
      spouse.culture = craft;
      var adoptedWage = wage();
      me.culture = 'german'; spouse.culture = 'german';
      var baseProtection = FB.householdMedicalProtection(s);
      spouse.culture = 'gaelic';
      var nursingProtection = FB.householdMedicalProtection(s);
      me.culture = 'gaelic';
      var stackedProtection = FB.householdMedicalProtection(s);
      spouse.dead = true; p.travel = { phase:'outbound' };
      var absentProtection = FB.householdMedicalProtection(s);
      return { piety:worshipPiety - plainPiety, seasonalPiety:seasonalPiety,
        expectedPiety:worshipPiety, gold:gold, expectedGold:expectedGold, pop:pop,
        brokeAlms:brokeAlms.length, baseWage:baseWage, founderOnlyWage:founderOnlyWage,
        adoptedWage:adoptedWage, baseProtection:baseProtection, nursingProtection:nursingProtection,
        stackedProtection:stackedProtection, absentProtection:absentProtection };
    });
    expect(result.piety).toBe(2);
    expect(result.seasonalPiety).toBeCloseTo(result.expectedPiety, 8);
    expect(result.gold).toBeCloseTo(result.expectedGold, 8);
    expect(result.pop).toBe(1);
    expect(result.brokeAlms).toBe(0);
    expect(result.baseWage).toBeGreaterThan(0);
    expect(result.founderOnlyWage).toBe(result.baseWage);
    expect(result.adoptedWage).toBeCloseTo(result.baseWage * 1.1, 8);
    expect(result.nursingProtection - result.baseProtection).toBeCloseTo(0.001, 8);
    expect(result.stackedProtection).toBe(result.nursingProtection);
    expect(result.absentProtection).toBe(result.baseProtection);
  });

test('household doctrines inherit through saves and carry explicit ungated technology reviews',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      var s = FB.state;
      var culture = FB.createCulture(s, { name:'Inherited nursing', parent:'gaelic' });
      var faith = FB.createFaith(s, { name:'Inherited worship', parent:'catholic' });
      var ids = ['doctrine_communal_worship', 'doctrine_organized_alms',
        'doctrine_craft_mentorship', 'doctrine_mutual_care'];
      var reviews = ids.map(function (id) { return FBDATA.techImpactReviews.features[id].mode; });
      var errors = FB.validateTechnologyData();
      FB.save.restore(JSON.parse(FB.save.serialize()));
      s = FB.state;
      return { reviews:reviews, errors:errors,
        culture:FB.doctrineOption(s, 'culture', culture, 'mutual_care').definition.id,
        faith:FB.doctrineOption(s, 'faith', faith, 'observance').definition.id,
        neutral:FB.doctrineOption(s, 'culture', 'german', 'craftsmanship').definition.id };
    });
    expect(result.reviews).toEqual(['none', 'none', 'none', 'none']);
    expect(result.errors).toEqual([]);
    expect(result.culture).toBe('communal');
    expect(result.faith).toBe('communal');
    expect(result.neutral).toBe('customary');
  });
