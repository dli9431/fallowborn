'use strict';

/* The 476 branch opens every beginning for owner review
   (FBDATA.reviewOpenStarts in data/starts.js). Specifications of the
   released rules, hidden candidates and earned-station locks, preset the
   switch off before the data scripts run. Call before openGame. */
async function useReleasedStartRules(page) {
  await page.addInitScript(function () {
    window.FBDATA = window.FBDATA || {};
    window.FBDATA.reviewOpenStarts = false;
  });
}

module.exports = { useReleasedStartRules:useReleasedStartRules };
