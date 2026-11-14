'use strict';
const proof = require('../../fixtures/bookmarks/settlement-proof.json');

// Ordinary persisted JSON keeps source preparation ahead of detached mod
// validation and story registration, on file:// and served boot.
async function installStoryProof(page) {
  const mod = { name:'Settlement story proof', bookmarks:{}, storyInstances:proof.storyInstances };
  mod.bookmarks[proof.bookmark.id] = proof.bookmark;
  await page.addInitScript(function (source) {
    if (localStorage.getItem('fb_mods') === null) localStorage.setItem('fb_mods', JSON.stringify([source]));
  }, JSON.stringify(mod));
}
module.exports = { installStoryProof };
