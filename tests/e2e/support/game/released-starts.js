'use strict';

/* Released rules are the default. Fixtures can still explicitly pin either
   released locks or review access before openTitle/openGame loads data. */
async function useReleasedStartRules(page) {
  await page.addInitScript(function () {
    window.FBDATA = window.FBDATA || {};
    window.FBDATA.reviewOpenStarts = false;
  });
}

async function useReviewStartRules(page) {
  await page.addInitScript(function () {
    window.FBDATA = window.FBDATA || {};
    window.FBDATA.reviewOpenStarts = true;
  });
}

module.exports = {
  useReleasedStartRules:useReleasedStartRules,
  useReviewStartRules:useReviewStartRules
};
