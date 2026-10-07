'use strict';
const proof = require('../../fixtures/bookmarks/settlement-proof.json');

// Add literal declarations at the data catalogue boundary. This works for
// file:// as well as served boot, and never injects a factory or engine hook.
async function installStoryProof(page) {
  await page.addInitScript(function (fixture) {
    let data;
    Object.defineProperty(window, 'FBDATA', {
      configurable:true,
      enumerable:true,
      get:function () { return data; },
      set:function (next) {
        data = next;
        if (Object.prototype.hasOwnProperty.call(data, 'storyInstances')) return;
        let instances;
        Object.defineProperty(data, 'storyInstances', {
          configurable:true,
          enumerable:true,
          get:function () { return instances; },
          set:function (table) {
            instances = table;
            Object.assign(table, fixture.storyInstances);
            data.bookmarks[fixture.bookmark.id] = fixture.bookmark;
          }
        });
      }
    });
  }, proof);
}
module.exports = { installStoryProof };
