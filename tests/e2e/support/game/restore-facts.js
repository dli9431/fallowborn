'use strict';

// Opt in after navigation. Decode a detached copy without serializing, loading,
// repairing or replaying a campaign. Canonicalization retains array order.
async function installRestoreFacts(page) {
  await page.evaluate(function () {
    window.restoreFacts = function (state, project) {
      const decoded=FB.save.expandedSnapshot(state);
      // The envelope writer tags authority without adding the tag to live state.
      // Normalize only its omitted form; explicit conflicting versions stay exact.
      if (decoded.authority && decoded.authority.schema===undefined)
        decoded.authority.schema=FB.save.FORMAT.authoritySchema;
      return FB.contentValues.canonical({
        facts:project(decoded),
        rng:FB.getRngState() >>> 0,
        uid:FB.getUidCounter()
      });
    };
    window.assertRestoreFacts = function (actual, expected) {
      if (actual === expected) return true;
      const differences=[];
      function visit(a,b,path) {
        if (a===b || differences.length>=12) return;
        if (a && b && typeof a==='object' && typeof b==='object' && Array.isArray(a)===Array.isArray(b)) {
          Array.from(new Set(Object.keys(a).concat(Object.keys(b)))).sort().forEach(function (key) {
            visit(a[key],b[key],path+'.'+key);
          });
        } else differences.push(path+': '+JSON.stringify(a)+' != '+JSON.stringify(b));
      }
      try {visit(JSON.parse(actual),JSON.parse(expected),'restore');}
      catch (error) {
        let index=0;while(index<actual.length && actual[index]===expected[index])index++;
        differences.push('offset '+index+': '+actual.slice(Math.max(0,index-100),index+300)+' != '+
          expected.slice(Math.max(0,index-100),index+300));
      }
      throw new Error('Restore facts differ:\n'+differences.join('\n'));
    };
  });
}

module.exports = {installRestoreFacts:installRestoreFacts};
