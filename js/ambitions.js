/* Historical ambitions: pure previews, once-only transactions, seasonal AI. */
window.FB = window.FB || {};
(function () {
  'use strict';
  FB.registerAmbitionMessages = function () {
    definitions().forEach(function (d) { FB.registerMessage('news.ambition.' + d.id, { text:d.news }); });
  };
  FB.validateHistoricalAmbitions = function (rows) {
    const errors = [], seen = {}, titles = { duchies:{}, kingdoms:{} }, provinces = {};
    if (!Array.isArray(rows) || rows.length > 128) return ['historicalAmbitions must contain at most 128 records.'];
    Object.keys(FBDATA.bookmarks || {}).forEach(function (id) {
      FB.bookmarkRevisions(id).forEach(function (bm) {
        Object.assign(titles.duchies, bm.duchies); Object.assign(titles.kingdoms, bm.kingdoms);
        Object.keys(bm.provinces || {}).forEach(function (key) { const row = bm.provinces[key]; provinces[row.id || key] = true; });
      });
    });
    Object.assign(titles.duchies, FBDATA.duchies); Object.assign(titles.kingdoms, FBDATA.kingdoms);
    (FBDATA.provinces || []).forEach(function (p) { provinces[p.id] = true; });
    rows.forEach(function (d) {
      if (!d || typeof d !== 'object' || Array.isArray(d)) { errors.push('historicalAmbitions requires records.'); return; }
      const path = 'historicalAmbitions.' + d.id;
      if (typeof d.id !== 'string' || !/^[a-z][a-z0-9_]*$/.test(d.id) || seen[d.id] || ['tax_reward','levy_reward'].indexOf(d.id) >= 0) errors.push(path + ' needs a unique stable id.');
      seen[d.id] = true;
      Object.keys(d).forEach(function (key) {
        if (['id','name','desc','news','region','tier','culture','capital','share','prestige','bonus','amount','days','foundedYear','established','island','mainland'].indexOf(key) < 0) errors.push(path + '.' + key + ' is unsupported.');
      });
      ['name','desc','news'].forEach(function (key) { if (typeof d[key] !== 'string' || !d[key] || d[key].length > 2000) errors.push(path + '.' + key + ' needs bounded text.'); });
      if ([5,6].indexOf(d.tier) < 0 || !Object.prototype.hasOwnProperty.call(titles[d.tier === 5 ? 'duchies' : 'kingdoms'], d.region)) errors.push(path + '.region needs a title of the declared tier.');
      if (d.culture !== undefined && !FBDATA.cultures[d.culture]) errors.push(path + '.culture is unknown.');
      if (d.capital !== undefined && !provinces[d.capital]) errors.push(path + '.capital is unknown.');
      if (typeof d.share !== 'number' || !isFinite(d.share) || d.share <= 0 || d.share > 1) errors.push(path + '.share must be in (0,1].');
      if (!Number.isInteger(d.prestige) || d.prestige < 0 || d.prestige > 10000 || ['tax','levy'].indexOf(d.bonus) < 0 || typeof d.amount !== 'number' || !isFinite(d.amount) || d.amount < 0 || d.amount > 1 || !Number.isInteger(d.days) || d.days < 1 || d.days > 36000) errors.push(path + ' has invalid reward terms.');
      if (d.foundedYear !== undefined && (!Number.isInteger(d.foundedYear) || d.foundedYear < 1 || d.foundedYear > 10000)) errors.push(path + '.foundedYear is out of bounds.');
      if (d.established !== undefined && (!Array.isArray(d.established) || d.established.length > 128 || d.established.some(function (id, i) { return !FBDATA.bookmarks[id] || d.established.indexOf(id) !== i; }))) errors.push(path + '.established needs unique bookmark ids.');
      if (d.island !== undefined || d.mainland !== undefined) {
        if (!titles.duchies[d.island] || !Array.isArray(d.mainland) || !d.mainland.length || d.mainland.length > 32 || d.mainland.some(function (id, i) { return !titles.duchies[id] || d.mainland.indexOf(id) !== i; })) errors.push(path + ' needs an island duchy and unique mainland duchies.');
      }
    });
    return errors;
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
    return FB.station.isDuke(d) ? FB.duchyCounties(d.region) : FB.kingdomCounties(d.region);
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
    const start = state.start || { id:'867', year:867 };
    /* An explicitly authored legacy list overrides the date, even when empty. */
    const bookmark = start.year === undefined && FB.bookmark(start.id);
    const startYear = start.year === undefined ? bookmark && bookmark.date.year : start.year;
    const established = Array.isArray(d.established)
      ? d.established.indexOf(String(start.id)) >= 0
      : d.foundedYear !== undefined && startYear >= d.foundedYear;
    return established ? { established:true } : null;
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
    const tier = rid === 'player' ? state.player.tier : r && FB.realmRank.tier(r, state);
    if (!d || !FB.station.rulesRealm({ tier:tier, realmId:rid }, state) || !tier) return false;
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
    const tier = player ? p.tier : r && FB.realmRank.tier(r, state) || 0;
    const liegeId = player ? p.liege : r && r.liege;
    const counties = regionCounties(d);
    const have = counties.filter(function (pid) { return holds(state, rid, pid); }).length;
    const need = Math.max(FB.station.isDuke(d, state) ? 2 : 1, Math.ceil(counties.length * d.share));
    const checks = [];
    function check(label, met, progress) { checks.push({ label:label, met:!!met, progress:!!progress }); }
    check(FB.T('Count rank or higher'), FB.station.rulesRealm({ tier:tier, realmId:rid }, state));
    if (d.culture) check(FB.T('{culture} ruler', { culture:FB.dataText(state, null, 'culture', d.culture, FBDATA.cultures[d.culture], 'name', {}) }), culture(state, rid) === d.culture);
    check(FB.T('Regional counties: {have}/{need}', { have:have, need:need }),
      counties.length > 0 && have >= need, true);
    if (d.capital) check(FB.T('Control {county}', { county:FB.world.byId[d.capital] && FB.world.byId[d.capital].name || d.capital }), holds(state, rid, d.capital));
    if (d.island) {
      const island = FB.duchyCounties(d.island);
      const islandHave = island.filter(function (pid) { return holds(state, rid, pid); }).length;
      const islandNeed = Math.max(1, Math.ceil(island.length / 2));
      check(FB.T('Island counties: {have}/{need}', { have:islandHave, need:islandNeed }),
        islandHave >= islandNeed, true);
      check(FB.T('Control a county in: {regions}', { regions:d.mainland.map(function (id) { return FBDATA.duchies[id] && FBDATA.duchies[id].name || id; }).join(', ') }), d.mainland.some(function (did) {
        return FB.duchyCounties(did).some(function (pid) { return holds(state, rid, pid); });
      }));
    }
    check(FB.T('At peace'), !atWar(state, rid));
    if (FB.station.isKing(d, state)) check(FB.T('Independent ruler'), !liegeId);
    if (FB.station.isDuke(d, state)) check(FB.T('Independent or sworn to a {term:king} or {term:emperor}'),
      !liegeId || state.realms[liegeId] && state.realms[liegeId].alive && FB.realmRank.isRoyal(state.realms[liegeId], state));
    let elevation = null, cost = { gold:0, prestige:0, piety:0 };
    if (player) {
      const c = state.chars[p.charId];
      check(FB.T('Adult ruler, alive and at home'), c && !c.dead && !p.dead &&
        FB.ageOf(c, state.date.year) >= 16 && !p.travel);
      check(FB.T('Free from captivity'), !(p.flags && p.flags.in_prison) && !p.captive && !(c && c.captive));
      if (FB.station.above(d, tier, state)) {
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
    if (!status || !status.ready || !rewardMessages[status.definition.bonus]) return null;
    const d = status.definition, player = rid === 'player';
    if (player && status.elevation && !FB.claimRankElevation(state,
        FB.rankElevationContext(state, status.elevation), { combinedResult:true })) return null;
    FB.ensureHistoricalAmbitions(state);
    if (player && (!state.realms.player || !state.realms.player.alive)) FB.foundPlayerRealm(state);
    const r = state.realms[rid];
    if (!r) return null;
    if (!player && FB.realmRank.above(FB.station.realmRank(d, state), r, state)) r.rank = FB.station.realmRank(d, state);
    if ((player ? state.player.tier : FB.realmRank.tier(r, state)) === d.tier) {
      r.ambitionTitleRegion = d.region;
      FB.setRealmTitle(state, r, FB.station.isDuke(d, state) ? 'duchy' : 'kingdom', d.region);
    }
    const result = { realmId:rid, turn:state.turn, endTurn:state.turn + d.days,
      cost:status.cost, prestige:player ? d.prestige : 0 };
    state.historicalAmbitions[id] = result;
    if (FB.noteLifeEvent) {
      const founderId = FB.lifeHistoryRulerId(state, rid);
      if (founderId) FB.noteLifeEvent(state, founderId, 'foundation', {
        foundation:FB.dataParam('ambition', id, 'name')
      });
    }
    if (player) state.player.prestige += d.prestige;
    FB.invalidateRealmCache();
    if (player && FB.notePlayerStatus) FB.notePlayerStatus(state);
    // Keep the legacy parameter name so saved messages and catalogs remain compatible.
    // Snapshot the founder, rather than looking up a later ruler when rendering history.
    const founder = player ? FB.fullName(state.chars[state.player.charId]) : r.ruler.name;
    const params = { realm:founder };
    FB.news(state, FB.message('news.ambition.' + id, params));
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
          FB.dejureOf(pid)[FB.station.isDuke(d, state) ? 'duchy' : 'kingdom'] !== d.region ||
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
  FB.registerAmbitionMessages();
})();
