'use strict';

const { openGame } = require('./navigation');
const { startDeterministicGame } = require('./start');

async function startSerfGame(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () {
    FB.setPlayerTier(FB.state, 0, { tenureFormationReason:'rank_change' });
    FB.state.eventQueue = [];
  });
}

module.exports = { startSerfGame };
