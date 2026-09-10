'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/wars.js', 'js/world.js', 'js/modifiers.js', 'js/rebellions.js',
  'data/modifiers.js', 'data/map_data.js']);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

test('AI unjust wars price escalating support debt and refuse projected revolts', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, rid = ids.enemy, home = s.realms[rid].capital, target = ids.home;
    s.realms[rid].aggressionDeclarations = 0;
    s.realms[rid].ruler.personality = 'cautious';
    s.rebellions = { groups:{}, warnings:{}, cooldowns:{} };
    s.historicalAmbitions = {};
    for (const pid of [home, target]) {
      s.modifiers.county[pid] = [];
      if (s.population.counties[pid]) delete s.population.counties[pid].settlementCommunityProjects;
      FB.setCountySupport(s, pid, 0);
    }
    FB.invalidateRealmCache();
    const rng = FB.getRngState();
    const first = FB.aiAggressionAssessment(s, rid, target, [home]);
    FB.setCountySupport(s, home, -30);
    const lowHome = FB.aiAggressionAssessment(s, rid, target, [home]);
    FB.setCountySupport(s, home, 0); FB.setCountySupport(s, target, -10);
    const lowTarget = FB.aiAggressionAssessment(s, rid, target, [home]);
    FB.setCountySupport(s, home, 50); FB.setCountySupport(s, target, 50);
    s.realms[rid].aggressionDeclarations = 1;
    const second = FB.aiAggressionAssessment(s, rid, target, [home]);
    s.realms[rid].aggressionDeclarations = 2;
    const third = FB.aiAggressionAssessment(s, rid, target, [home]);
    s.realms[rid].ruler.personality = 'bellicose';
    const bellicose = FB.aiAggressionAssessment(s, rid, target, [home]);
    return { first:first, lowHome:lowHome, lowTarget:lowTarget, second:second, third:third,
      bellicose:bellicose, rngStable:rng === FB.getRngState(), count:s.realms[rid].aggressionDeclarations };
  }, ids);
  expect(result.first.allowed).toBe(true);
  expect(result.first.declarationHit).toBe(20); expect(result.first.conquestHit).toBe(40);
  expect(result.first.chance).toBeGreaterThan(0); expect(result.first.chance).toBeLessThan(0.5);
  expect(result.lowHome.allowed).toBe(false); expect(result.lowTarget.allowed).toBe(false);
  expect(result.second.declarationHit).toBe(30); expect(result.second.conquestHit).toBe(50);
  expect(result.third.declarationHit).toBe(40); expect(result.third.conquestHit).toBe(60);
  expect(result.third.chance).toBeLessThan(result.second.chance);
  expect(result.bellicose.chance).toBeGreaterThan(result.third.chance);
  expect(result.rngStable).toBe(true); expect(result.count).toBe(2);
});

test('AI refuses additional unjust wars during an open rebellion', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, home = s.realms[ids.enemy].capital;
    const counties = {}; counties[home] = { occupied:false };
    s.rebellions = { groups:{ probe:{ id:'probe', target:ids.enemy, faction:'rebel_probe', counties:counties } }, warnings:{}, cooldowns:{} };
    FB.setCountySupport(s, home, 100); FB.setCountySupport(s, ids.home, 100);
    FB.invalidateRealmCache();
    return FB.aiAggressionAssessment(s, ids.enemy, ids.home, [home]);
  }, ids);
  expect(result.allowed).toBe(false); expect(result.chance).toBe(0);
});
