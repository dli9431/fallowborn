'use strict';
const { openGame } = require('./navigation');
const { startDeterministicGame } = require('./start');

async function startWarSafety(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  return page.evaluate(function () {
    FB.game.setPaused(true);
    const s = FB.state, p = s.player;
    const ids = Object.keys(s.realms).filter(function (id) {
      return id !== 'player' && s.realms[id].alive && !s.realms[id].liege &&
        s.realms[id].capital !== p.provinceId;
    }).sort();
    for (const id in s.realms) s.realms[id].war = null;
    const home = p.provinceId;
    const second = Object.keys(FB.world.adj[home]).filter(function (pid) {
      return !FB.world.byId[pid].wasteland && pid !== s.realms[ids[0]].capital;
    }).sort()[0];
    p.tier = 4; p.provs = [home, second]; p.liege = null;
    p.gold = 500; p.prestige = 100;
    FB.foundPlayerRealm(s);
    s.realms.player.capital = home; s.realms.player.liege = null;
    for (const pid of p.provs) {
      s.owner[pid] = 'player'; s.holder[pid] = 'player'; s.dev[pid] = 20;
      s.buildings[pid] = [];
    }
    FB.invalidateRealmCache();
    FB.invalidateFortIndex();
    p.war = { enemy:ids[0], target:s.realms[ids[0]].capital,
      wins:3, losses:2, seasons:4, strength:1, defending:false,
      casus:{ type:'fabricated' } };
    s.armies = []; s.armyDown = {}; s.armyDetachmentDown = {};
    s.armyCohorts = {}; s.eventQueue = []; s.truces = {};
    FB.game.auto.all = false; FB.game.auto.war = false;
    FB.game.auto.major = false; FB.game.auto.hosts = 'manual';
    FB.warFooting(s);
    s.eventQueue = [];
    return { home:home, second:second, enemy:ids[0], liege:ids[1], other:ids[2] };
  });
}
module.exports = { startWarSafety };
