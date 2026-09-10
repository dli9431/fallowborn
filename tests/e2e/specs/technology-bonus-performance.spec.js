'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/technology.js', 'js/mods.js']);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test('combined technology bonuses reuse effects and invalidate for research, caps and definition edits', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  const result = await page.evaluate(function () {
    const originalList = FB.techList, originalTech = FBDATA.tech, originalCaps = FBDATA.techCaps;
    const list = ['a', 'b'];
    let reads = 0, supply = 0.1;
    FBDATA.tech = { a:{}, b:{ fx:{ supply:0.2, battle:0.3, seaTransport:600 } } };
    Object.defineProperty(FBDATA.tech.a, 'fx', { configurable:true, get:function () {
      reads++; return { supply:supply, battle:0.1, seaTransport:300 };
    } });
    FBDATA.techCaps = { supply:0.25 };
    FB.techList = function () { return list; };
    const rng = FB.getRngState();
    try {
      const first = FB.techBonus(FB.state, 'supply');
      const before = reads;
      const battle = FB.techBonus(FB.state, 'battle');
      const transport = FB.techSeaTransportCapacity(FB.state);
      const extraReads = reads - before;
      list.splice(1,1);
      const removed = FB.techBonus(FB.state, 'supply');
      list[0] = 'b';
      const replaced = FB.techBonus(FB.state, 'supply');
      FBDATA.techCaps.supply = 0.15;
      const capped = FB.techBonus(FB.state, 'supply');
      FBDATA.tech.b.fx.supply = 0.05; FB.invalidateTechBonuses();
      const edited = FB.techBonus(FB.state, 'supply');
      return { first:first, battle:battle, transport:transport, extraReads:extraReads,
        removed:removed, replaced:replaced, capped:capped, edited:edited, rngStable:rng === FB.getRngState() };
    } finally { FB.techList = originalList; FBDATA.tech = originalTech; FBDATA.techCaps = originalCaps; FB.invalidateTechBonuses(); }
  });
  expect(result).toEqual({ first:0.25, battle:0.4, transport:600, extraReads:0,
    removed:0.1, replaced:0.2, capped:0.15, edited:0.05, rngStable:true });
});
