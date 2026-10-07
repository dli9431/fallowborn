'use strict';
const fixture = require('../../fixtures/bookmarks/court-proof.json');

async function installCourtProof(page) {
  await page.addInitScript(function (fixture) {
    let data;
    Object.defineProperty(window, 'FBDATA', {
      configurable:true, enumerable:true,
      get:function () { return data; },
      set:function (next) {
        data = next;
        if (Object.prototype.hasOwnProperty.call(data, 'storyInstances')) return;
        let instances;
        Object.defineProperty(data, 'storyInstances', {
          configurable:true, enumerable:true,
          get:function () { return instances; },
          set:function (table) {
            instances = table;
            Object.assign(table, fixture.storyInstances);
            Object.assign(data.settlementSites, fixture.settlementSites);
            data.bookmarks[fixture.bookmark.id] = fixture.bookmark;
            data.startScenarios.push.apply(data.startScenarios, fixture.startScenarios);
          }
        });
      }
    });
  }, fixture);
}
module.exports = { installCourtProof };
