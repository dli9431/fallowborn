'use strict';
const fixture = require('../../fixtures/bookmarks/court-proof.json');

async function installCourtProof(page) {
  const mod = { name:'Court story proof', bookmarks:{}, storyInstances:fixture.storyInstances,
    settlementSites:fixture.settlementSites,
    // Ordinary imports require introduction text and the soldier's male sex.
    // Complete the literal start without mutating the shared fixture.
    startScenarios:fixture.startScenarios.map(function (start) {
      return Object.assign({ intro:start.desc, sex:'m' }, start);
    }) };
  mod.bookmarks[fixture.bookmark.id] = fixture.bookmark;
  await page.addInitScript(function (source) {
    if (localStorage.getItem('fb_mods') === null) localStorage.setItem('fb_mods', JSON.stringify([source]));
  }, JSON.stringify(mod));
}
module.exports = { installCourtProof };
