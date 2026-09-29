'use strict';
const { openGame } = require('./navigation');
const { startDeterministicGame } = require('./start');

async function startGames(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  return page.evaluate(function () {
    FB.game.setPaused(true);
    var s = FB.state, p = s.player, c = s.chars[p.charId];
    Object.keys(s.realms).forEach(function (rid) { s.realms[rid].war = null; });
    s.wars = {}; s.greatHolyWar = null; s.rebellions = {groups:{},cooldowns:{}};
    p.war = null; p.greatHolyWar = null; p.flags.with_liege_host = false; p.flags.on_campaign = false;
    p.flags.in_prison = false; p.militaryService = null; p.travel = null;
    p.tier = 6; p.provs = [p.provinceId]; p.liege = null; p.gold = 1000000;
    c.station = 4; c.sex = 'm'; c.health = 10; c.born = s.date.year - 30;
    c.skills.mar = 10; c.skills.dip = 10; c.skills.lea = 10;
    s.date.season = 0; s.date.day = 1;
    FB.foundPlayerRealm(s);
    s.realms.player.capital = p.provinceId; s.realms.player.liege = null;
    s.owner[p.provinceId] = 'player'; s.holder[p.provinceId] = 'player'; s.dev[p.provinceId] = 10;
    FB.invalidateRealmCache(); FB.ensureSettlementLordships(s);
    FB.tournaments.ensure(s); s.eventQueue = [];
    var hosts = Object.keys(s.realms).sort().filter(function (rid) {
      var r = s.realms[rid], person = FB.realmRulerCharacterSnapshot(s,rid);
      var route = r && r.capital && FB.travelRoute(p.provinceId,r.capital);
      var kingdom = r && r.capital && FB.tournaments.capacity(s,r.capital,'local').kingdom;
      return rid !== 'player' && r.alive && !r.liege && person && FB.ageOf(person,s.date.year) >= 16 &&
        route && route.length >= 2 && route.length <= 20 && FB.settlementsOf(s,r.capital).length &&
        kingdom !== FB.tournaments.capacity(s,p.provinceId,'local').kingdom &&
        FB.settlementConstructionAuthority(s,r.capital,0,rid).direct;
    });
    var rid = hosts[0], host = FB.realmRulerCharacterSnapshot(s,rid), venue = s.realms[rid].capital;
    if (!host) throw new Error('The deterministic world needs a nearby independent host.');
    s.realms[rid].treasury.gold = 1000000; s.realms[rid].treasury.militaryAccrued = 0;
    host.health = 10;
    return { home:p.provinceId, id:p.charId, host:host.id, hostRealm:rid, venue:venue, enemy:hosts[1] };
  });
}
async function bookGames(page, ids, foreign, extra) {
  return page.evaluate(function (args) {
    var s = FB.state, ids = args.ids;
    var q = FB.tournaments.quote(s,Object.assign({hostId:args.foreign ? ids.host : ids.id,
      provinceId:args.foreign ? ids.venue : ids.home,settlement:0,scale:'local',programme:'martial',startTurn:s.turn+90},args.extra));
    if (!q.ok) throw new Error(q.reasons.join(' '));
    var event = FB.tournaments.book(s,q);
    if (!event) throw new Error('Fresh booking was refused.');
    return event.id;
  },{ids:ids,foreign:foreign,extra:extra || {}});
}
module.exports = { startGames, bookGames };
