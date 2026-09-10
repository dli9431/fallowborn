'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/wars.js', 'js/world.js', 'js/actions.js',
  'js/modifiers.js', 'js/save.js', 'js/ui_misc.js', 'js/ui_modals.js',
  'data/modifiers.js', 'data/map_data.js']);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

for (const player of [true, false]) {
  test('aggression stacks across counties for ' + (player ? 'player' : 'AI'), async function ({ page }, testInfo) {
    const ids = await startWarSafety(page, testInfo);
    const result = await page.evaluate(function (args) {
      const s = FB.state, ids = args.ids;
      FB.endPlayerWar(s, true);
      const attacker = args.player ? 'player' : ids.enemy;
      const enemies = [args.player ? ids.enemy : 'player', ids.liege, ids.other];
      const home = s.realms[attacker].capital;
      const targets = enemies.map(function (rid) { return s.realms[rid].capital; });
      const snapshots = [];
      function penalty(pid) {
        return FB.countyModifierRecords(s, pid).reduce(function (sum, record) {
          return sum + (['conquered_without_right', 'aggressive_rule'].indexOf(record.id) >= 0
            ? FB.modifierEffects(s, record.id, record).commonVoice : 0);
        }, 0);
      }
      for (let i = 0; i < 3; i++) {
        const target = targets[i], war = FB.registerOrdinaryWar(s, attacker, {
          enemy:enemies[i], target:target, casus:{ type:'aggression' },
          objectives:[{ target:target, type:'aggression' }], legacy:false
        });
        FB.recordWarDeclaration(s, war, { unlawful:false });
        FB.recordWarDeclaration(s, war, { unlawful:false }); // retries cannot charge twice
        const beforeConquest = penalty(target);
        FB.transferProvince(s, target, FB.topRealm(s, attacker));
        s.holder[target] = attacker;
        if (attacker === 'player') s.player.provs.push(target);
        FB.invalidateRealmCache();
        FB.applyAggressionConquest(s, war, target);
        const record = FB.countyModifierRecords(s, target).find(function (r) { return r.id === 'conquered_without_right'; });
        snapshots.push({ home:penalty(home), conquered:targets.slice(0, i + 1).map(penalty),
          beforeConquest:beforeConquest, duration:record.endTurn - s.turn,
          sequence:war.aggressionSequence });
      }
      const count = FB.aggressionDeclarationCount(s, attacker);
      const exported = FB.save.parseExport(FB.save.serialize());
      const savedCount = FB.aggressionDeclarationCount(exported.state, attacker);
      const savedSequences = Object.keys(exported.state.wars).map(function (id) {
        return exported.state.wars[id].aggressionSequence;
      }).filter(Boolean).sort();
      const saved = JSON.stringify(s.modifiers);
      s.modifiers = JSON.parse(saved); FB.ensureModifiers(s);
      const roundTrip = saved === JSON.stringify(s.modifiers);
      const tooltip = FB.ui._shared.modifierEffectText(s, 'conquered_without_right', 1, false,
        FB.countyModifierRecords(s, targets[2]).find(function (r) { return r.id === 'conquered_without_right'; }));
      s.turn += 4319; FB.modifierTick(s);
      const beforeExpiry = targets.map(penalty);
      s.turn++; FB.modifierTick(s);
      return { snapshots:snapshots, count:count, savedCount:savedCount, savedSequences:savedSequences,
        roundTrip:roundTrip, tooltip:tooltip,
        beforeExpiry:beforeExpiry, expired:targets.map(penalty), homeExpired:penalty(home),
        retainedCount:FB.aggressionDeclarationCount(s, attacker) };
    }, { ids:ids, player:player });
    expect(result.snapshots).toEqual([
      { home:-20, conquered:[-40], beforeConquest:0, duration:4320, sequence:1 },
      { home:-50, conquered:[-70,-50], beforeConquest:0, duration:4320, sequence:2 },
      { home:-90, conquered:[-110,-90,-60], beforeConquest:0, duration:4320, sequence:3 }
    ]);
    expect(result.count).toBe(3);
    expect(result.savedCount).toBe(3);
    expect(result.savedSequences).toEqual([1,2,3]);
    expect(result.roundTrip).toBe(true);
    expect(result.tooltip).toContain('-60 Popular support');
    [-110,-90,-60].forEach(function (value, i) { expect(result.beforeExpiry[i]).toBeCloseTo(value / 12); });
    expect(result.expired).toEqual([0,0,0]);
    expect(result.homeExpired).toBe(0);
    expect(result.retainedCount).toBe(3);
  });
}

test('escalated declaration preview is exact and read-only', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    FB.endPlayerWar(s, true);
    s.realms.player.aggressionDeclarations = 2;
    const before = JSON.stringify(s), rng = FB.getRngState();
    const preview = FB.warCausePreview(s, { type:'aggression', enemy:ids.other, target:s.realms[ids.other].capital });
    return { support:preview.aggression.modifier.fx.commonVoice,
      realm:preview.aggression.realmSupportChange, days:preview.aggression.modifier.days,
      unchanged:before === JSON.stringify(s) && rng === FB.getRngState() };
  }, ids);
  expect(result).toEqual({ support:-60, realm:-40, days:4320, unchanged:true });
});
