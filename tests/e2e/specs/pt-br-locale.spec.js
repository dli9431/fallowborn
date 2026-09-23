'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'js/i18n.js', 'js/main.js', 'js/ui_modals.js',
  'data/lang_en.js', 'data/lang_pt-BR.js'
]);

const { test, expect } = require('../support/fixture');
const { targetUrl } = require('../support/game/navigation');

test('Brazilian Portuguese loads as a selectable Preview locale',
  async function ({ page }, testInfo) {
    await page.addInitScript(function () {
      localStorage.setItem('fb_lang', 'pt-BR');
      localStorage.setItem('fb_ui', JSON.stringify({ musicChoice:'off' }));
    });
    await page.goto(targetUrl(testInfo), { waitUntil:'domcontentloaded' });
    await expect(page.locator('#title:not(.hidden)')).toBeVisible({
      timeout:30 * 1000
    });
    await expect.poll(function () {
      return page.evaluate(function () {
        return !!(window.FB && FB.game && FB.game.bootReady);
      });
    }).toBe(true);

    const locale = await page.evaluate(function () {
      const scripts = Array.from(document.scripts).map(function (script) {
        return script.src || '';
      });
      const englishAt = scripts.findIndex(function (src) {
        return /\/data\/lang_en\.js(?:\?|$)/.test(src);
      });
      const portugueseAt = scripts.findIndex(function (src) {
        return /\/data\/lang_pt-BR\.js(?:\?|$)/.test(src);
      });
      const definition = FB.availableLocales().find(function (item) {
        return item.code === 'pt-BR';
      });
      return {
        active:FB.locale, documentLanguage:document.documentElement.lang,
        catalogCode:FBDATA.lang['pt-BR'] && FBDATA.lang['pt-BR'].code,
        loadOrder:englishAt >= 0 && portugueseAt > englishAt,
        name:definition && definition.name, status:definition && definition.status,
        languageLabel:FB.T('Language'),
        pluralZero:FB.pluralCategory('pt-BR', 0),
        pluralOne:FB.pluralCategory('pt-BR', 1)
      };
    });
    expect(locale).toEqual({
      active:'pt-BR', documentLanguage:'pt-BR', catalogCode:'pt-BR',
      loadOrder:true, name:'Português (Brasil)', status:'preview',
      languageLabel:'Idioma', pluralZero:'other', pluralOne:'one'
    });
    await expect(page.locator('#btn-newgame')).toContainText('Novo Jogo');

    await page.locator('#btn-settings').click();
    await expect(page.locator('#set-lang')).toHaveValue('pt-BR');
    await expect(page.locator('#set-lang option[value="pt-BR"]'))
      .toContainText('Português (Brasil)');
  });
