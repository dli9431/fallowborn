'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/messages.js', 'js/main.js', 'js/save.js',
  'js/ui_misc.js', 'js/ui_panels.js', 'js/ui_modals.js', 'js/world.js']);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

test('family and realm news default on, foreign news remains saved and can be revealed', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    const foreign = s.realms[ids.other].capital;
    const family = FB.news(s, FB.msg('news.e2e.family_notice', 'Family notice', {}));
    const local = FB.news(s, FB.msg('news.world.visibility_local', 'Local realm notice: {province}', { province:FB.world.byId[ids.home].name }));
    const distant = FB.news(s, FB.msg('news.world.visibility_foreign', 'Foreign realm notice: {province}', { province:FB.world.byId[foreign].name }));
    const defaults = [family, local, distant].map(function (entry) { return FB.newsVisible(s, entry); });
    const saved = JSON.parse(FB.save.serialize()).state;
    const unpacked = FB.chronicleEntry(saved.chronicle, saved.chronicle.entries[saved.chronicle.entries.length - 1]);
    FB.game.uiPrefs.newsFamily = false;
    const realmOnly = [family, local, distant].map(function (entry) { return FB.newsVisible(s, entry); });
    FB.game.uiPrefs.newsRealm = false;
    const neither = [family, local, distant].some(function (entry) { return FB.newsVisible(s, entry); });
    FB.game.uiPrefs.newsAll = true;
    return { defaults:defaults, realmOnly:realmOnly, neither:neither,
      all:[family, local, distant].every(function (entry) { return FB.newsVisible(s, entry); }),
      savedAudience:unpacked.audience, recentSaved:saved.log[saved.log.length - 1].audience };
  }, ids);
  expect(result).toEqual({ defaults:[true,true,false], realmOnly:[false,true,false], neither:false,
    all:true, savedAudience:4, recentSaved:4 });
});

test('settings persist all three choices and update Chronicle visibility', async function ({ page }, testInfo) {
  await startWarSafety(page, testInfo);
  await page.evaluate(function () {
    FB.news(FB.state, FB.msg('news.world.visibility_probe', 'Distant visibility probe', {}));
    FB.ui.showTab('log'); FB.ui.refresh(); FB.ui.showSettings();
  });
  await expect(page.locator('#set-news-family')).toBeChecked();
  await expect(page.locator('#set-news-realm')).toBeChecked();
  await expect(page.locator('#set-news-all')).not.toBeChecked();
  await page.locator('#set-news-family').uncheck();
  await page.locator('#set-news-realm').uncheck();
  await page.locator('#set-news-all').check();
  expect(await page.evaluate(function () {
    const prefs = JSON.parse(localStorage.getItem('fb_ui'));
    return [prefs.newsFamily, prefs.newsRealm, prefs.newsAll];
  })).toEqual([false,false,true]);
  await expect(page.locator('#tab-log')).toContainText('Distant visibility probe');
  await page.reload();
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.uiPrefs; });
  expect(await page.evaluate(function () {
    return [FB.game.uiPrefs.newsFamily, FB.game.uiPrefs.newsRealm, FB.game.uiPrefs.newsAll];
  })).toEqual([false,false,true]);
});

test('Chronicle preserves row nodes when its capped log receives more news', async function ({ page }, testInfo) {
  await startWarSafety(page, testInfo);
  const result = await page.evaluate(async function () {
    const s = FB.state;
    function paint() { return new Promise(function (resolve) { requestAnimationFrame(function () { requestAnimationFrame(resolve); }); }); }
    for (let i = 0; i < 305; i++) FB.news(s, FB.msg('news.e2e.capped', 'Capped entry {n}', { n:i }), { toast:false });
    FB.ui.showTab('log'); FB.ui.refresh(); await paint();
    const box = document.querySelector('#tab-log .chronicle-entries');
    const old = box.firstElementChild;
    FB.news(s, FB.msg('news.e2e.capped', 'Capped entry {n}', { n:305 }), { toast:false });
    FB.ui.refresh(); await paint();
    const preserved = box.children[1] === old;
    const html = box.innerHTML;
    FB.ui._shared.logRenderedTail = null;
    FB.ui.refresh(); await paint();
    return { preserved:preserved, equal:document.querySelector('#tab-log .chronicle-entries').innerHTML === html,
      capped:s.log.length, rows:document.querySelectorAll('#tab-log .logentry').length };
  });
  expect(result).toEqual({ preserved:true, equal:true, capped:300, rows:80 });
});

test('fast-forward renders only visible news and lays out the retained burst once', async function ({ page }, testInfo) {
  await startWarSafety(page, testInfo);
  const result = await page.evaluate(function () {
    document.getElementById('toasts').innerHTML = '';
    FB.game.fastForwarding = true;
    for (let i = 0; i < 10; i++) FB.news(FB.state, FB.msg('news.e2e.visible', 'Visible toast {n}', { n:i }));
    FB.news(FB.state, FB.msg('news.world.hidden', 'Hidden foreign toast', {}));
    const before = document.querySelectorAll('#toasts .toast').length;
    FB.game.fastForwarding = false;
    const layout = FB.ui.layoutMapToasts;
    let layouts = 0;
    FB.ui.layoutMapToasts = function () { layouts++; };
    try {
      FB.ui.fastForwardFinished({ liveTick:true });
      return { before:before, layouts:layouts, count:document.querySelectorAll('#toasts .toast').length,
        hidden:document.getElementById('toasts').textContent.indexOf('Hidden foreign toast') >= 0 };
    } finally { FB.ui.layoutMapToasts = layout; }
  });
  expect(result).toEqual({ before:0, layouts:1, count:5, hidden:false });
});

test('the full Chronicle viewer honors visibility without removing exported history', async function ({ page }, testInfo) {
  await startWarSafety(page, testInfo);
  await page.evaluate(function () {
    FB.news(FB.state, FB.msg('news.world.viewer_hidden', 'Remote viewer probe', {}));
    window.visibilityChronicle = FB.save.chronicleData(FB.state);
    FB.ui.showChronicleViewer(window.visibilityChronicle);
  });
  await expect(page.locator('#gm-body')).not.toContainText('Remote viewer probe');
  expect(await page.evaluate(function () {
    return window.visibilityChronicle.entries.some(function (entry) { return entry.text === 'Remote viewer probe'; });
  })).toBe(true);
  await page.evaluate(function () {
    FB.game.uiPrefs.newsAll = true;
    FB.ui.showChronicleViewer(window.visibilityChronicle);
  });
  await expect(page.locator('#gm-body')).toContainText('Remote viewer probe');
});
