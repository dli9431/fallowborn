/* Historical ambitions: pure previews, once-only transactions, seasonal AI. */
window.FB = window.FB || {};
(function () {
  'use strict';
  // Register English fallbacks at boot, including when a saved Chronicle is opened
  // before any ambition completes in this session and locale catalogs are stale.
  const foundationMessages = {
    normandy:FB.msg('news.ambition.normandy', '{realm} establishes Normandy.'),
    norway:FB.msg('news.ambition.norway', '{realm} unifies Norway.'),
    england:FB.msg('news.ambition.england', '{realm} unites England.'),
    sicily:FB.msg('news.ambition.sicily', '{realm} establishes the Sicilian crown.')
  };
  const rewardMessages = {
    tax:FB.msg('news.ambition.tax_reward',
      'The foundation grants {prestige} prestige and +{percent}% county tax income in controlled {region} counties for {days} days. Recognition costs {money:gold}, {paidPrestige} prestige, and {piety} piety.'),
    levy:FB.msg('news.ambition.levy_reward',
      'The foundation grants {prestige} prestige and +{percent}% county levy capacity in controlled {region} counties for {days} days. Recognition costs {money:gold}, {paidPrestige} prestige, and {piety} piety.')
  };
  function definitions() { return FBDATA.historicalAmbitions || []; }
  function definition(id) {
    return definitions().filter(function (d) { return d.id === id; })[0] || null;
  }
  function regionCounties(d) {
    return d.tier === 5 ? FB.duchyCounties(d.region) : FB.kingdomCounties(d.region);
  }
  function holds(state, rid, pid) {
    let holder = state.holder && state.holder[pid] || state.owner[pid];
    const seen = {};
    while (holder && !seen[holder]) {
      if (holder === rid) return true;
      seen[holder] = true;
      holder = holder === 'player' ? state.player.liege :
        state.realms[holder] && state.realms[holder].liege;
    }
    return false;
  }
  function record(state, d) {
    const saved = state.historicalAmbitions && state.historicalAmbitions[d.id];
    if (saved) return saved;
    const bookmark = state.start && state.start.id || '867';
    return d.established.indexOf(bookmark) >= 0 ? { established:true } : null;
  }
  FB.ensureHistoricalAmbitions = function (state) {
    if (!state.historicalAmbitions || typeof state.historicalAmbitions !== 'object' ||
        Array.isArray(state.historicalAmbitions)) state.historicalAmbitions = {};
    definitions().forEach(function (d) {
      const existing = record(state, d);
      if (existing && !state.historicalAmbitions[d.id]) state.historicalAmbitions[d.id] = existing;
    });
  };
  function culture(state, rid) {
    if (rid === 'player') {
      const c = state.chars[state.player.charId];
      return c && c.culture;
    }
    const r = state.realms[rid];
    return r && r.ruler && r.ruler.culture || r && r.culture;
  }
  function atWar(state, rid) {
    return FB.isRealmAtWar(state, rid) || FB.isRealmAtWar(state, FB.topRealm(state, rid));
  }
  FB.historicalAmbitionRelevant = function (state, id, rid) {
    rid = rid || 'player';
    const d = definition(id), r = state.realms[rid];
    const tier = rid === 'player' ? state.player.tier : r && r.rank + 3;
    if (!d || tier < 4 || !tier) return false;
    const done = record(state, d);
    if (done && done.realmId === rid) return true;
    if (d.culture && culture(state, rid) !== d.culture) return false;
    return regionCounties(d).some(function (pid) { return holds(state, rid, pid); });
  };
  FB.historicalAmbitionStatus = function (state, id, rid) {
    rid = rid || 'player';
    const d = definition(id);
    if (!d) return null;
    const player = rid === 'player', p = state.player, r = state.realms[rid];
    const tier = player ? p.tier : r && r.rank + 3 || 0;
    const liegeId = player ? p.liege : r && r.liege;
    const counties = regionCounties(d);
    const have = counties.filter(function (pid) { return holds(state, rid, pid); }).length;
    const need = Math.max(d.tier === 5 ? 2 : 1, Math.ceil(counties.length * d.share));
    const checks = [];
    function check(label, met, progress) { checks.push({ label:label, met:!!met, progress:!!progress }); }
    check(FB.T('Count rank or higher'), tier >= 4);
    if (d.culture) check(FB.T('Norse ruler'), culture(state, rid) === d.culture);
    check(FB.T('Regional counties: {have}/{need}', { have:have, need:need }),
      counties.length > 0 && have >= need, true);
    if (d.capital) check(FB.T('Control Rouen'), holds(state, rid, d.capital));
    if (d.island) {
      const island = FB.duchyCounties(d.island);
      const islandHave = island.filter(function (pid) { return holds(state, rid, pid); }).length;
      const islandNeed = Math.max(1, Math.ceil(island.length / 2));
      check(FB.T('Island counties: {have}/{need}', { have:islandHave, need:islandNeed }),
        islandHave >= islandNeed, true);
      check(FB.T('Control a county in Apulia or Calabria'), d.mainland.some(function (did) {
        return FB.duchyCounties(did).some(function (pid) { return holds(state, rid, pid); });
      }));
    }
    check(FB.T('At peace'), !atWar(state, rid));
    if (d.tier === 6) check(FB.T('Independent ruler'), !liegeId);
    if (d.tier === 5) check(FB.T('Independent or sworn to a king or emperor'),
      !liegeId || state.realms[liegeId] && state.realms[liegeId].alive && state.realms[liegeId].rank >= 3);
    let elevation = null, cost = { gold:0, prestige:0, piety:0 };
    if (player) {
      const c = state.chars[p.charId];
      check(FB.T('Adult ruler, alive and at home'), c && !c.dead && !p.dead &&
        FB.ageOf(c, state.date.year) >= 16 && !p.travel);
      check(FB.T('Free from captivity'), !(p.flags && p.flags.in_prison) && !p.captive && !(c && c.captive));
      if (tier < d.tier) {
        elevation = FB.rankElevationStatus(state, d.tier, { route:'higher', region:d.region });
        cost = elevation.cost;
        check(elevation.ready ? FB.T('Title recognition requirements met') :
          elevation.reason || FB.T('Title recognition requirements unmet'), elevation.ready);
      }
    } else check(FB.T('Living ruler'), r && r.alive);
    const completed = record(state, d);
    return { definition:d, realmId:rid, checks:checks, cost:cost, elevation:elevation,
      completed:completed, ready:!completed && checks.every(function (c) { return c.met; }),
      have:have, need:need };
  };
  FB.completeHistoricalAmbition = function (state, id, rid) {
    rid = rid || 'player';
    const status = FB.historicalAmbitionStatus(state, id, rid);
    if (!status || !status.ready || !foundationMessages[id] || !rewardMessages[status.definition.bonus]) return null;
    const d = status.definition, player = rid === 'player';
    if (player && status.elevation && !FB.claimRankElevation(state,
        FB.rankElevationContext(state, status.elevation), { combinedResult:true })) return null;
    FB.ensureHistoricalAmbitions(state);
    if (player && (!state.realms.player || !state.realms.player.alive)) FB.foundPlayerRealm(state);
    const r = state.realms[rid];
    if (!r) return null;
    if (!player && r.rank < d.tier - 3) r.rank = d.tier - 3;
    if ((player ? state.player.tier : r.rank + 3) === d.tier) {
      r.ambitionTitleRegion = d.region;
      const place = d.tier === 5 ? FBDATA.duchies[d.region] : FBDATA.kingdoms[d.region];
      r.name = (d.tier === 5 ? 'Duchy of ' : 'Kingdom of ') + place.name;
    }
    const result = { realmId:rid, turn:state.turn, endTurn:state.turn + d.days,
      cost:status.cost, prestige:player ? d.prestige : 0 };
    state.historicalAmbitions[id] = result;
    if (player) state.player.prestige += d.prestige;
    FB.invalidateRealmCache();
    if (player && FB.notePlayerStatus) FB.notePlayerStatus(state);
    // Keep the legacy parameter name so saved messages and catalogs remain compatible.
    // Snapshot the founder, rather than looking up a later ruler when rendering history.
    const founder = player ? FB.fullName(state.chars[state.player.charId]) : r.ruler.name;
    const params = { realm:founder };
    FB.news(state, FB.message(foundationMessages[id].key, params));
    if (player) {
      const rewardParams = { prestige:d.prestige, gold:status.cost.gold,
        paidPrestige:status.cost.prestige, piety:status.cost.piety,
        percent:d.amount * 100, days:d.days,
        region:(FBDATA.duchies[d.region] || FBDATA.kingdoms[d.region]).name };
      FB.news(state, FB.message(rewardMessages[d.bonus].key, rewardParams));
    }
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
    if (player && FB.ui && FB.ui.refresh) FB.ui.refresh();
    return result;
  };
  FB.historicalAmbitionBonus = function (state, pid, key) {
    let sum = 0;
    definitions().forEach(function (d) {
      if (d.bonus !== key) return;
      const rec = state.historicalAmbitions && state.historicalAmbitions[d.id];
      const r = rec && state.realms[rec.realmId];
      if (!rec || rec.established || !(state.turn < rec.endTurn) || !r || !r.alive ||
          FB.dejureOf(pid)[d.tier === 5 ? 'duchy' : 'kingdom'] !== d.region ||
          !holds(state, rec.realmId, pid)) return;
      sum += d.amount;
    });
    return sum;
  };
  FB.historicalAmbitionRealmEnded = function (state, rid) {
    const records = state.historicalAmbitions || {};
    Object.keys(records).forEach(function (id) {
      if (records[id] && records[id].realmId === rid) {
        records[id].endTurn = Math.min(records[id].endTurn, state.turn);
      }
    });
  };
  FB.historicalAmbitionRealmInherited = function (state, from, to) {
    const records = state.historicalAmbitions || {};
    Object.keys(records).forEach(function (id) {
      if (records[id] && records[id].realmId === from) records[id].realmId = to;
    });
  };
  FB.historicalAmbitionsSeason = function (state) {
    FB.ensureHistoricalAmbitions(state);
    const season = Math.floor((state.date.year * 360 + state.date.season * 90 + state.date.day - 1) / 90);
    if (state.historicalAmbitionSeason === season) return;
    state.historicalAmbitionSeason = season;
    const realms = Object.keys(state.realms).sort();
    definitions().forEach(function (d) {
      if (record(state, d)) return;
      for (let i = 0; i < realms.length; i++) {
        const rid = realms[i];
        if (rid === 'player' || !state.realms[rid].alive ||
            !FB.historicalAmbitionRelevant(state, d.id, rid)) continue;
        if (FB.completeHistoricalAmbition(state, d.id, rid)) break;
      }
    });
  };
})();
