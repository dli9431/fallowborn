'use strict';
const fs = require('fs');
const path = require('path');

// Immutable f15cb61c data scripts. Read as text here, execute only in the
// owner's browser harness at each original source position.
const legacy568Files = ['starts_568.js','bookmark_568.js','starts_568_ravenna.js','starts_rulers_568.js',
  'story_ruler_agendas_568.js','starts_rulers_568_east.js','story_ruler_agendas_568_east.js','story_households_568_ravenna.js'];
async function installLegacy568(page) {
  for (const file of legacy568Files) {
    const body = fs.readFileSync(path.resolve(__dirname,'../../fixtures/bookmark-composition/568-before-shared',file),'utf8');
    await page.route('**/data/' + file,function (route) { return route.fulfill({contentType:'application/javascript',body:body}); });
  }
  await page.route('**/data/bookmark_568_composition.js',function (route) { return route.fulfill({contentType:'application/javascript',body:''}); });
}
module.exports = {installLegacy568,legacy568Files};
