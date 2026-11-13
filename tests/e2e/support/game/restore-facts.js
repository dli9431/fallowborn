'use strict';

// Opt in after navigation. Decode a detached copy without serializing, loading,
// repairing or replaying a campaign. Canonicalization retains array order.
async function installRestoreFacts(page) {
  await page.evaluate(function () {
    window.restoreFacts = function (state, project) {
      return FB.contentValues.canonical({
        facts:project(FB.save.expandedSnapshot(state)),
        rng:FB.getRngState() >>> 0,
        uid:FB.getUidCounter()
      });
    };
  });
}

module.exports = {installRestoreFacts:installRestoreFacts};
