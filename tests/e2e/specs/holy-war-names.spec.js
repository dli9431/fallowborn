'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/holywar.js', 'js/model.js', 'js/messages.js',
  'js/i18n.js', 'data/cultures.js', 'data/events_war.js', 'js/ui_modals.js', 'js/ui_panels.js']);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test('campaign names follow the calling faith in UI, saved messages, and events', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  const rows = await page.evaluate(function () {
    const s = FB.state;
    return ['catholic', 'orthodox', 'sunni', 'shia', 'norse_pagan', 'slavic_pagan', 'unknown-faith'].map(function (id) {
      const type = FB.holyWarCampaignType(s, id);
      const ctx = { campaignType:type, caller:'Test caller', leader:'Test leader', kingdom:'Test kingdom' };
      const message = FB.msg('news.test.holywar_name', '{campaign}', {
        campaign:FB.holyWarNameParam(s, id)
      });
      return { name:FB.holyWarName(s, id),
        saved:FB.renderMessage(JSON.parse(JSON.stringify(message)), { state:s }),
        call:FB.eventText(s, s.player.charId, FB.eventById('ghw_called'), 'title', ctx),
        muster:FB.eventText(s, s.player.charId, FB.eventById('ghw_muster_complete'), 'title', ctx),
        text:FB.eventText(s, s.player.charId, FB.eventById('ghw_called'), 'text', ctx) };
    });
  });
  const names = ['Crusade', 'Crusade', 'Jihad', 'Jihad', 'Sacred War', 'Sacred War', 'Holy War'];
  rows.forEach(function (row, index) {
    expect(row.name).toBe(names[index]);
    expect(row.saved).toBe(names[index]);
    expect(row.call).toContain(names[index]);
    expect(row.muster).toContain(names[index]);
    expect(row.text).not.toContain('{kingdom}');
  });
  expect(rows[1].text).not.toContain('Latin realms');
  expect(rows[4].text).toContain('Sacred War');
});
