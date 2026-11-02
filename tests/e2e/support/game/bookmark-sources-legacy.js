'use strict';
const fs = require('fs');
const path = require('path');
const nativeSourceFiles = require('../../fixtures/bookmark-composition/native-before-shared/sources.json');

// 7b557cd0 source text, executed at the original URLs only by the owner's
// browser harness. The compatibility adapter supplies no runtime validation.
async function installNativeLegacy(page) {
  await page.route('**/js/bookmark_sources.js',function (route) {
    return route.fulfill({contentType:'application/javascript',body:
      'FB.bookmarkSources={current:function(){return null;},ready:function(){return false;},owns:function(){return false;},reports:function(){return [];},finish:function(){},stage:function(spec,fn){fn(FBDATA);}};'});
  });
  for (const file of nativeSourceFiles) {
    const body = fs.readFileSync(path.resolve(__dirname,'../../fixtures/bookmark-composition/native-before-shared',path.basename(file)),'utf8');
    await page.route('**/' + file,function (route) { return route.fulfill({contentType:'application/javascript',body:body}); });
  }
}
module.exports = {installNativeLegacy,nativeSourceFiles};
