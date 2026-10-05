/* Scheduled games: pure quotes, reserved accounts and exact-participant mutations. */
window.FB = window.FB || {};
(function () {
  'use strict';
  var T = FB.tournaments = {}, D = FBDATA.tournaments;
  var notices = {
    announced:FB.msg('news.tournament.announced','Games are announced at {venue}; {money:funding} is committed.',{}),
    victory:FB.msg('news.tournament.victory','Won a competition at the games in {venue}.',{}),
    injury:FB.msg('news.tournament.injury','An injury at the games in {venue} requires care.',{}),
    cancelled:FB.msg('news.tournament.cancelled','The games at {venue} are cancelled. Unspent funds return to the host.',{}),
    closed:FB.msg('news.tournament.closed','The games at {venue} close. Unspent funds return to the host.',{}),
    annual_skipped:FB.msg('news.tournament.annual_skipped','This year’s games are skipped without a charge.',{}),
    departed:FB.msg('news.tournament.departed','Set out for the games at {venue}; the return journey is funded.',{}),
    returning:FB.msg('news.tournament.returning','The traveller begins the funded return home from the games.',{})
  };
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : 0; }
  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function root(s) { return s.tournaments || { events:[], annual:[], samples:{}, starts:{}, summaries:[] }; }
  function live(e) { return e && (e.status === 'announced' || e.status === 'running'); }
  function character(s, id) { return id && s.chars[id]; }
  function player(s, id) { return id === s.player.charId; }
  function tier(s, id) {
    if (player(s,id)) return s.player.tier;
    var c = character(s,id), rid = c && FB.realmIdForRulerCharacter(s,c);
    // Character station is a social class (0-4); realm rank is count-emperor (1-4).
    return rid ? FB.clamp((s.realms[rid].rank || 1) + 3,4,7) : c ? Math.min(3,FB.stationOf(c)) : -1;
  }
  function home(s, id) { return player(s, id) ? s.player.provinceId : FB.characterResidence(s, character(s, id)); }
  function realm(s, id) {
    if (!player(s,id)) return FB.realmIdForRulerCharacter(s,character(s,id));
    return s.realms.player && s.realms.player.alive ? 'player' : s.player.liege || holder(s,s.player.provinceId);
  }
  function holder(s, pid) { return s.holder && s.holder[pid] || s.owner && s.owner[pid]; }
  function actor(s, id) { return FB.settlementActor(s, { kind:'character', id:id }); }
  function account(s, id) {
    if (player(s, id)) return s.player;
    var a = actor(s, id);
    if (a.kind === 'realm') return s.realms[a.id] && s.realms[a.id].treasury;
    return s.settlementLordships && s.settlementLordships.accounts && s.settlementLordships.accounts[id];
  }
  function available(s, id) {
    var a = account(s, id);
    return a && !a.retired ? Math.max(0, num(a.gold) - num(a.militaryAccrued)) : 0;
  }
  function pay(s, id, amount) {
    if (amount === 0) return true;
    var a = account(s, id);
    if (!a || a.retired || !isFinite(amount) || (amount < 0 && available(s, id) < -amount)) return false;
    a.gold = num(a.gold) + amount;
    return true;
  }
  function refundHost(s,e,amount) {
    // Refund the funding account even when its previous protagonist has died.
    var source = e.fundingAccount || actor(s,e.hostId), a;
    if (source.kind === 'realm' && source.id === 'player') a = s.player;
    else if (source.kind === 'realm') a = s.realms[source.id] && s.realms[source.id].treasury;
    else a = account(s,source.id);
    if (a && !a.retired) a.gold = num(a.gold) + amount;
  }
  function notify(s, key, fallback, params) { FB.news(s, FB.message(notices[key].key, params || {})); }
  function status(ok, reason) { return { ok:ok, reason:reason || '' }; }
  function settlement(e) {
    var sites = FB.world.sitesByProv[e.provinceId];
    return sites && sites.list[e.settlement];
  }
  T.get = function (s, id) {
    var list = root(s).events;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  };
  T.active = function (s) { return root(s).events.filter(live); };
  T.available = function (s, id) { return available(s, id); };
  T.venueName = function (s, e) {
    var name = FB.settlementDisplayName(s, e.provinceId, e.settlement), county = FB.world.byId[e.provinceId];
    return name || county && county.name || e.provinceId;
  };
  T.defaultProgramme = function (s, id, venue) {
    var c = character(s,id), religion = c && FBDATA.religions[c.religion], culture = c && FBDATA.cultures[c.culture];
    if (religion && religion.group === 'muslim' || culture && culture.tradition === 'steppe') return 'mounted';
    if (s.date.year >= 1100 && tech(s, venue)) return 'lists';
    return 'martial';
  };
  T.ensure = function (s) {
    if (!s.tournaments) s.tournaments = { version:1, nextId:1, events:[], annual:[], samples:{}, starts:{}, summaries:[], cursors:{} };
    var r = s.tournaments;
    r.nextId = Math.max(1, num(r.nextId));
    ['events','annual','summaries'].forEach(function (key) { if (!Array.isArray(r[key])) r[key] = []; });
    ['samples','starts','cursors'].forEach(function (key) { if (!r[key]) r[key] = {}; });
    if (!s.player.circuit || s.player.circuit.charId !== s.player.charId) {
      s.player.circuit = { charId:s.player.charId, victories:0, openWins:0, earnings:0, reputation:0, contacts:[] };
    }
    s.player.circuit.contacts = (s.player.circuit.contacts || []).slice(-D.contactCap);
    Object.keys(r.samples).forEach(function (id) { r.samples[id] = r.samples[id].slice(-4); });
    return r;
  };
  function kingdom(pid) {
    var pr = FB.world.byId[pid], duchy = pr && FBDATA.duchies[pr.duchy];
    return duchy && FBDATA.kingdoms[duchy.kingdom] ? duchy.kingdom : null;
  }
  T.capacity = function (s, pid, scale) {
    var k = kingdom(pid), count = 0, events = T.active(s), occupants = [], county = [];
    Object.keys(FB.world.byId).forEach(function (id) {
      var p = FB.world.byId[id];
      if (!p.wasteland && p.culture && p.religion && kingdom(id) === k) count++;
    });
    var limits = k ? [Math.max(1, Math.floor(count / 5)), Math.max(1, Math.floor(count / 10)), Math.max(1, Math.floor(count / 15))] : [2, 0, 0];
    var used = [0, 0, 0];
    events.forEach(function (e) {
      if (e.provinceId === pid) county.push(e.id);
      if (kingdom(e.provinceId) !== k) return;
      occupants.push({ id:e.id, closeTurn:e.closeTurn, provinceId:e.provinceId, settlement:e.settlement });
      used[0]++;
      if (e.scale !== 'local') used[1]++;
      if (e.scale === 'grand') used[2]++;
    });
    return { kingdom:k, counties:count, limits:limits, used:used, occupants:occupants,
      ok:events.length < D.worldCap && county.length === 0 && used[0] < limits[0] &&
        (scale === 'local' || used[1] < limits[1]) && (scale !== 'grand' || used[2] < limits[2]),
      county:county, world:events.length };
  };
  function chainWar(s, rid) {
    var seen = {}, rebels = {};
    if (FB.rebellionWarringRealms) FB.rebellionWarringRealms(s, rebels);
    while (rid && !seen[rid]) {
      seen[rid] = true;
      var ordinary = s.wars && FB.realmWars ? FB.realmWars(s,rid).length > 0 :
        !!(s.realms[rid] && s.realms[rid].war && s.realms[rid].war.enemy) ||
        Object.keys(s.realms).some(function (id) { return s.realms[id].war && s.realms[id].war.enemy === rid; });
      var holy = s.greatHolyWar && s.greatHolyWar.phase === 'active' && FB.greatHolyWarCamp(s,rid);
      if (ordinary || holy || rebels[rid]) return rid;
      rid = rid === 'player' ? s.player.liege : s.realms[rid] && s.realms[rid].liege;
    }
    return null;
  }
  function venueConflict(s, pid) {
    if (FB.countyInOpenRevolt && FB.countyInOpenRevolt(s, pid)) return true;
    var wars = Object.keys(s.wars || {}).map(function (id) { return s.wars[id]; });
    if (s.greatHolyWar && s.greatHolyWar.phase === 'active') wars.push(s.greatHolyWar);
    return wars.some(function (w) {
      var o = w.occupations && w.occupations[pid];
      return (w.status === 'active' || w.phase === 'active') && o && (o.occupied || o.progress > 0);
    });
  }
  T.eligibility = function (s, id, e) {
    var c = character(s, id);
    if (!c || c.dead || c.health <= 0 || (player(s, id) && s.player.dead)) return status(false, FB.T('The participant is no longer living.'));
    if (FB.ageOf(c, s.date.year) < 16) return status(false, FB.T('Games are open to adults.'));
    if ((player(s, id) && s.player.flags.in_prison) || (FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(s, id)) ||
        (FB.justiceCustodyOf && FB.justiceCustodyOf(s, id))) return status(false, FB.T('A prisoner cannot attend games.'));
    if (player(s, id) && ((FB.realmWars && FB.realmWars(s,'player').length) ||
        (s.greatHolyWar && s.greatHolyWar.phase === 'active' && FB.playerGreatHolyWarActive(s)) ||
        (FB.activeMilitaryCommand && FB.activeMilitaryCommand(s)) || s.player.flags.on_campaign || s.player.flags.with_liege_host ||
        s.player.militaryService || (s.player.travel && s.player.travel.contract))) {
      return status(false, FB.T('War or military service prevents festival attendance.'));
    }
    if (chainWar(s, realm(s, id)) || chainWar(s, holder(s, home(s, id)))) {
      return status(false, FB.T('Your home realm or ruling chain is at war.'));
    }
    if (e) {
      if (e.hostId !== id) {
        var hostEligibility = T.eligibility(s,e.hostId);
        if (!hostEligibility.ok) return status(false,FB.T('The host cannot hold games: {reason}',{reason:hostEligibility.reason}));
      }
      if (e.scale && (tier(s,e.hostId) < D.scales[e.scale].tier ||
          !FB.settlementConstructionAuthority(s,e.provinceId,e.settlement,actor(s,e.hostId)).direct)) {
        return status(false,FB.T('The host no longer qualifies or directly owns the venue.'));
      }
      if (chainWar(s, realm(s, e.hostId))) return status(false, FB.T('The host’s ruling chain is at war.'));
      if (chainWar(s, holder(s, e.provinceId))) return status(false, FB.T('The venue’s governing chain is at war.'));
      if (venueConflict(s, e.provinceId)) return status(false, FB.T('The venue is besieged or occupied.'));
    }
    return status(true);
  };
  T.projection = function (s, id, fiscal) {
    // These established economic readers normalize old records. Work on a detached
    // snapshot at the quote boundary so browsing cannot rewrite an old save.
    var a = actor(s, id), shadow;
    if (player(s, id)) {
      shadow = copy(s);
      var b = FB.playerCivilianBudget(shadow, undefined, false, { excludeFocus:true });
      return b.surplus - (FB.fiscalAssignedIncome ? FB.fiscalAssignedIncome(shadow, b.surplus) : 0);
    }
    if (a.kind === 'realm') {
      var row = fiscal && fiscal.rows[a.id] || FB.treasurySnapshot(copy(s)).rows[a.id];
      return row ? num(row.income) + num(row.duesIn) - num(row.duesOut) - num(row.upkeep) - num(row.government) : 0;
    }
    var local = FB.settlementActorFiscal(s, a);
    return num(local.tax) + num(local.tolls) + num(local.duesIn) - num(local.duesOut) - num(local.upkeep);
  };
  T.income = function (s, id, fiscal) {
    var projection = T.projection(s, id, fiscal), samples = (root(s).samples[id] || []).slice(-4);
    var mean = samples.length ? samples.reduce(function (n, row) { return n + num(row.net); }, 0) / samples.length : projection;
    return { projection:projection, average:mean, samples:copy(samples), reference:Math.max(0, projection, mean) };
  };
  T.funding = function (scale, reference) {
    var d = D.scales[scale];
    if (!d) return null;
    var total = Math.ceil(Math.max(d.minimum, d.multiplier * Math.max(0, num(reference))) / 25) * 25;
    var prize = Math.floor(total / 2), services = Math.floor(total * 0.3);
    var prizes = { headline:Math.floor(prize / 2), archery:Math.floor(prize / 8), wrestling:Math.floor(prize / 8), perform:Math.floor(prize / 4) };
    var sum = prizes.headline + prizes.archery + prizes.wrestling + prizes.perform;
    return { total:total, prizes:prizes, services:services, preparation:total - sum - services };
  };
  function dayOfYear(s, turn) { return ((s.date.season * 90 + s.date.day - 1 + turn - s.turn) % 360 + 360) % 360; }
  T.date = function (s, turn) {
    var offset = s.date.season * 90 + s.date.day - 1 + turn - s.turn;
    var day = ((offset % 360) + 360) % 360;
    return { year:s.date.year + Math.floor(offset / 360), season:Math.floor(day / 90), day:day % 90 + 1 };
  };
  T.dates = function (s, id) {
    var out = [], last = root(s).starts[id];
    for (var d = D.noticeMin; d <= D.noticeMax; d++) {
      var turn = s.turn + d;
      if (dayOfYear(s, turn) < 180 && (last === undefined || turn - last >= D.spacing)) out.push(turn);
    }
    return out;
  };
  T.quote = function (s, spec, fiscal) {
    var id = spec.hostId || s.player.charId, e = { hostId:id, provinceId:spec.provinceId, settlement:spec.settlement };
    var reasons = [], eligibility = T.eligibility(s, id, e), scale = D.scales[spec.scale], prog = D.programmes[spec.programme];
    var site = settlement(e), income = T.income(s, id, fiscal), funding = T.funding(spec.scale, income.reference);
    var authority = FB.settlementConstructionAuthority(s, e.provinceId, e.settlement, actor(s, id));
    if (!eligibility.ok) reasons.push(eligibility.reason);
    if (!scale || tier(s, id) < scale.tier) reasons.push(FB.T('Your rank does not permit this scale.'));
    if (!site || !authority.direct) reasons.push(FB.T('The host must directly own this established settlement.'));
    var presentation = site && FB.settlementsOf(s, e.provinceId)[e.settlement];
    var kind = presentation && presentation.kind || site && site.kind;
    if (spec.scale === 'regional' && ['town','city'].indexOf(kind) < 0) reasons.push(FB.T('Regional games require a town or city.'));
    if (spec.scale === 'grand' && kind !== 'city') reasons.push(FB.T('Grand games require a city.'));
    if (!prog) reasons.push(FB.T('Choose a programme.'));
    if (prog && prog.requiresTech && !tech(s, e)) reasons.push(FB.T('Formal lists require the venue sovereign’s Couched Cavalry Lance.'));
    var start = spec.startTurn, last = root(s).starts[id];
    if (!Number.isInteger(start) || start - s.turn < D.noticeMin || start - s.turn > D.noticeMax || dayOfYear(s, start) >= 180) reasons.push(FB.T('Choose a spring or summer date with 60 to 180 days’ notice.'));
    if (last !== undefined && start - last < D.spacing) reasons.push(FB.T('A host’s editions must start at least 360 days apart.'));
    if (T.active(s).some(function (row) { return row.hostId === id; })) reasons.push(FB.T('This host already funds an edition.'));
    var cap = T.capacity(s, e.provinceId, spec.scale);
    if (!cap.ok) reasons.push(FB.T('Regional, county or world capacity is occupied.'));
    if (funding && available(s, id) < funding.total) reasons.push(FB.T('The host cannot fund the promised budget.'));
    var ceiling = Math.floor(num(spec.ceiling));
    if (spec.annual && (!funding || ceiling < funding.total)) reasons.push(FB.T('The annual spending ceiling is below this edition’s cost.'));
    var q = { hostId:id, provinceId:e.provinceId, settlement:e.settlement, scale:spec.scale, programme:spec.programme,
      startTurn:start, closeTurn:start + D.duration, annual:!!spec.annual, ceiling:ceiling,
      income:income, funding:funding, capacity:cap, available:available(s, id), treasury:num(account(s,id) && account(s,id).gold), reasons:reasons, ok:!reasons.length };
    q.signature = JSON.stringify([q.hostId,q.provinceId,q.settlement,q.scale,q.programme,start,q.annual,ceiling,income,funding,q.available,q.treasury,cap]);
    return q;
  };
  function strength(e) {
    return D.scales[e.scale].difficulty + Math.min(6, Math.log(1 + e.funding.total / 500) / Math.LN2) + Math.min(3, e.hostPrestige / 100);
  }
  function entrant(s, e, track, i, used) {
    var c = character(s, e.hostId), culture = FBDATA.cultures[c.culture];
    var names = culture && (culture.male || culture.namesM);
    if (!Array.isArray(names) || !names.length) names = [FB.fullName(c)];
    var known = s.player.circuit && s.player.circuit.contacts.filter(function (r) { return r.culture === c.culture && r.ability && !used[r.id]; }) || [];
    if (known.length) return {id:known[0].id,name:known[0].name,ability:known[0].ability,health:8,culture:c.culture};
    return { id:e.id + ':' + track + ':entrant:' + i, name:FB.pick(names), ability:Math.max(2, strength(e) + FB.ri(-2, 5)), health:FB.ri(7, 10), culture:c.culture };
  }
  function field(s, e) {
    var tracks = [D.programmes[e.programme].headline, 'archery', 'wrestling', 'perform'], used = {};
    tracks.forEach(function (track) {
      var entrants = [];
      for (var i = 0; i < 8; i++) {
        var row = entrant(s,e,track,i,used); entrants.push(row); used[row.id] = true;
      }
      e.contests[track] = { entrants:entrants, active:entrants.map(function (c) { return c.id; }), round:0, scores:{}, results:[], winner:null };
    });
  }
  T.book = function (s, reviewed, fiscal) {
    var q = T.quote(s, reviewed, fiscal);
    if (!q.ok || q.signature !== reviewed.signature) return false;
    var r = T.ensure(s);
    if (!pay(s, q.hostId, -q.funding.total)) return false;
    var e = { id:'games_' + r.nextId++, hostId:q.hostId, hostRealm:realm(s, q.hostId), fundingAccount:copy(actor(s,q.hostId)), provinceId:q.provinceId,
      settlement:q.settlement, scale:q.scale, programme:q.programme, startTurn:q.startTurn, closeTurn:q.closeTurn,
      announcedTurn:s.turn, status:'announced', funding:copy(q.funding), remaining:copy(q.funding.prizes), services:q.funding.services,
      hostPrestige:player(s, q.hostId) ? num(s.player.prestige) : num(character(s, q.hostId).prestige),
      participants:[], contests:{}, paid:{}, incidents:{}, refunded:0, serviceCommitted:0, quality:0 };
    r.events.push(e); r.starts[q.hostId] = q.startTurn;
    field(s, e);
    e.guests = Object.keys(s.chars).sort().filter(function (id) {
      return id !== e.hostId && home(s,id) === e.provinceId && T.eligibility(s,id,e).ok;
    }).slice(0,3);
    // Reserve anonymous workforce contracts as a whole; unused capacity remains refundable.
    e.staffCount = Math.floor(q.funding.services / 4);
    e.staffDaily = Math.floor(q.funding.services * 0.6 / 7);
    if (q.annual) {
      r.annual = r.annual.filter(function (row) { return row.hostId !== q.hostId; });
      r.annual.push({ hostId:q.hostId, household:player(s,q.hostId), provinceId:q.provinceId, settlement:q.settlement,
        scale:q.scale, programme:q.programme, nextTurn:q.startTurn + 360, ceiling:q.ceiling });
    }
    if (player(s, e.hostId)) {
      notify(s, 'announced', 'Games are announced at {venue}; {money:funding} is committed.', { venue:T.venueName(s, e), funding:e.funding.total });
      e.incidents.pending = 1;
      FB.queueEvent(s, 'scheduled_games_preparation', context(s, e, e.hostId, 'host', 1, 'host'));
    }
    return e;
  };
  T.stopAnnual = function (s, id) {
    var r = T.ensure(s), before = r.annual.length;
    r.annual = r.annual.filter(function (a) { return a.hostId !== id; });
    return r.annual.length !== before;
  };
  T.participant = function (e, id) {
    return e && e.participants.filter(function (p) { return p.charId === id; })[0] || null;
  };
  function present(s, id, e) {
    if (!player(s, id)) return home(s, id) === e.provinceId;
    var t = s.player.travel;
    return (!t || t.phase === 'arrived') && (t ? t.currentId : s.player.provinceId) === e.provinceId;
  }
  T.attendance = function (s,id,e) {
    var q = T.eligibility(s,id,e);
    if (!q.ok) return q;
    if (!live(e) || s.turn >= e.closeTurn) return status(false,FB.T('This edition has closed.'));
    if (!present(s,id,e)) return status(false,FB.T('Reach the venue first.'));
    if (s.turn < e.startTurn) return status(false,FB.T('Festivities begin on the opening date.'));
    return status(true);
  };
  function trained(c, profession) {
    var career = c && c.career && c.career.profession === profession ? c.career : c && c.careerHistory && c.careerHistory[profession];
    return !!career && ['journeyman','master'].indexOf(career.rank) >= 0;
  }
  function sponsorship(s, id, e) {
    var c = character(s, id), circuit = player(s, id) && s.player.circuit;
    var standing = player(s, id) ? FB.standingOf(s, { kind:'character', id:e.hostId }) : 0;
    return tier(s, id) === 1 && c.sex === 'm' && trained(c, 'soldier') && FB.skillSnapshot(s,c, 'mar') >= 8 && ((circuit && circuit.openWins > 0) || standing >= 40);
  }
  function tech(s, e) {
    var sovereign = FB.topRealm(s, holder(s, e.provinceId));
    var record = s.realmTech && s.realmTech[sovereign];
    // The existing technology reader handles bookmark knowledge on an isolated copy.
    return record ? record.completed.indexOf('cavalry_lances') >= 0 : FB.hasTech(copy(s), 'cavalry_lances', sovereign);
  }
  T.entry = function (s, eventId, id, track) {
    var e = T.get(s, eventId), c = character(s, id), d = D.tracks[track], reasons = [], terms = { fee:0, forfeit:0, contract:0, stake:0 };
    if (!live(e)) return { ok:false, reasons:[FB.T('This edition has closed.')], terms:terms };
    var el = T.eligibility(s, id, e), old = T.participant(e, id);
    if (!el.ok) reasons.push(el.reason);
    if (!d) reasons.push(FB.T('Choose an activity.'));
    if (old) reasons.push(FB.T('One primary activity is allowed per edition.'));
    if (e.participants.length >= D.participantCap) reasons.push(FB.T('This edition has no participant places left.'));
    if (tier(s, id) === 0 && home(s, id) !== e.provinceId) reasons.push(FB.T('Serfs may attend only in their home county.'));
    if (tier(s,id) === 0 && ['watch','archery','wrestling','carrying','kitchens','stables','repairs','guarding','treatment'].indexOf(track) < 0) {
      reasons.push(FB.T('Serfs may spectate, work, or enter open archery and wrestling.'));
    }
    if (d && d.male && c && c.sex !== 'm') reasons.push(FB.T('This contest or specialist work is open to adult men.'));
    if (d && d.contest && c && c.health < 3) reasons.push(FB.T('Recover to Health 3 before entering a competition.'));
    if (d && d.elite) {
      if (tier(s, id) < 2 && !sponsorship(s, id, e)) reasons.push(FB.T('Elite entry requires Gentry rank, or Soldiering training, Martial 8 and an open victory or 40 Standing with this host.'));
      if (!c || FB.skillSnapshot(s,c, 'mar') < 5 || c.health < 5) reasons.push(FB.T('Elite contests require Martial 5 and Health 5.'));
      if (c && !sponsorship(s, id, e) && FB.itemBonusReadOnly(s, 'battle', id) <= 0) reasons.push(FB.T('Wear battle equipment before elite entry.'));
      terms.fee = Math.min(25, Math.max(2, Math.floor(e.funding.total / 500)));
      terms.forfeit = terms.fee;
    }
    if (d && d.career) {
      var careerDef = FBDATA.careers[d.career];
      if (!trained(c,d.career)) reasons.push(FB.T('Complete training in the required career first.'));
      if (careerDef && (tier(s,id) < num(careerDef.tierMin) || careerDef.maleOnly && c && c.sex !== 'm')) {
        reasons.push(FB.T('The existing career rank and sex requirements still apply.'));
      }
    }
    if (track === 'joust' && !tech(s, e)) reasons.push(FB.T('The venue sovereign requires Couched Cavalry Lance; open games and company remain available.'));
    if (d && d.contest && !e.contests[track]) reasons.push(FB.T('This competition is outside the programme.'));
    if (d && d.contest && (s.turn >= e.startTurn + 1 || (e.contests[track] && e.contests[track].round > 0))) reasons.push(FB.T('This competition has already begun.'));
    if (d && d.contest && e.participants.some(function (p) { return p.track === track && p.status === 'active'; })) reasons.push(FB.T('The named competition field is already complete.'));
    if (d && d.wage) {
      var career = c && c.career, wageDef = career && FBDATA.careers[career.profession];
      var wage = wageDef ? (career.rank === 'master' ? wageDef.masterWage : wageDef.wage) : d.wage;
      var commission = d.career ? (e.scale === 'grand' ? 4 : e.scale === 'regional' ? 2 : 0) : 0;
      terms.contract = Math.max(1, Math.min(12, Math.ceil(num(wage) * 7 / 90 * D.servicePremium) + commission));
      if (e.services - e.serviceCommitted < terms.contract) reasons.push(FB.T('All remaining service funds are contracted.'));
    }
    if (track === 'trade') terms.stake = 10;
    if (available(s, id) < terms.fee + terms.forfeit + terms.stake) reasons.push(FB.T('You cannot cover the entry, forfeit reserve and trade stake.'));
    return { ok:!reasons.length, reasons:reasons, terms:terms, sponsored:d && d.elite && sponsorship(s, id, e),
      present:present(s, id, e), eventId:eventId, charId:id, track:track,
      signature:JSON.stringify([eventId,id,track,terms,!!(d && d.elite && sponsorship(s, id, e)),s.turn]) };
  };
  T.enter = function (s, reviewed) {
    var q = T.entry(s, reviewed.eventId, reviewed.charId, reviewed.track);
    if (!q.ok || q.signature !== reviewed.signature) return false;
    var e = T.get(s, q.eventId), d = D.tracks[q.track];
    if (!pay(s, q.charId, -(q.terms.fee + q.terms.forfeit + q.terms.stake))) return false;
    T.ensure(s);
    var p = { charId:q.charId, household:player(s,q.charId), track:q.track, status:'active', joinedTurn:s.turn,
      terms:copy(q.terms), feeUnused:q.terms.fee, forfeit:q.terms.forfeit, tradeStake:q.terms.stake,
      sponsored:q.sponsored, techAccepted:q.track === 'joust', round:0, fatigue:0, preparation:0, prepared:false,
      score:0, paid:0, workDays:0, lastWork:null, social:{}, incident:null, skillAwarded:false };
    e.participants.push(p);
    if (d.wage) e.serviceCommitted += p.terms.contract;
    if (d.contest) {
      var f = e.contests[q.track], prior = f.entrants[0].id;
      f.entrants[0] = { id:q.charId, charId:q.charId, name:FB.fullName(character(s, q.charId)) };
      f.active[f.active.indexOf(prior)] = q.charId;
      if (player(s,q.charId)) {
        var contacts = s.player.circuit.contacts.slice();
        f.entrants.slice(1).forEach(function (r) {
          contacts = contacts.filter(function (old) { return old.id !== r.id; });
          contacts.push({ id:r.id,name:r.name,ability:r.ability,culture:r.culture,lastTurn:s.turn });
        });
        s.player.circuit.contacts = contacts.slice(-D.contactCap);
      }
    }
    return p;
  };
  function credit(s, e, key, id, bucket, amount) {
    if (own(e.paid, key)) return false;
    // Prize promises are whole gold; completed slices of a work contract may
    // be fractional, like ordinary daily wages. The last slice closes exactly.
    amount = Math.max(0, num(amount));
    var left = bucket === 'services' ? e.services : e.remaining[bucket];
    if (amount > left + 0.00000001) return false;
    amount = Math.min(left,amount);
    e.paid[key] = amount;
    if (bucket === 'services') e.services -= amount;
    else e.remaining[bucket] -= amount;
    if (id) pay(s, id, amount);
    if (player(s, id)) { T.ensure(s); s.player.circuit.earnings += amount; }
    return true;
  }
  function bucket(track) { return ['joust','melee'].indexOf(track) >= 0 ? 'headline' : track; }
  function power(s, e, track, entrantId) {
    var f = e.contests[track], row = f.entrants.filter(function (r) { return r.id === entrantId; })[0];
    if (!row) return 0;
    if (!row.charId) return row.ability + (row.health - 7) * 0.3 - num(row.fatigue) * 0.65;
    var c = character(s, row.charId), p = T.participant(e, row.charId);
    if (!c || c.dead || !p || p.status !== 'active' || p.missed) return -100;
    var skill = FB.skillSnapshot(s,c, D.tracks[track].skill);
    if (track === 'perform') skill = (FB.skillSnapshot(s,c, 'dip') + FB.skillSnapshot(s,c, 'lea')) / 2;
    var traits = (c.traits || []).indexOf('brave') >= 0 ? 1 : 0;
    if ((c.traits || []).indexOf('craven') >= 0 && D.tracks[track].elite) traits--;
    var gear = D.tracks[track].elite ? Math.min(3, FB.itemBonusReadOnly(s, 'battle', c.id) * 20 + (p.sponsored ? 1 : 0)) : 0;
    return skill + traits + gear + (c.health - 7) * 0.4 + p.preparation - p.fatigue * 0.65;
  }
  T.roundPreview = function (s, eventId, id, tactic) {
    var e = T.get(s, eventId), p = T.participant(e, id), t = D.tactics[tactic];
    if (!live(e) || !p || !t || p.status !== 'active' || !e.contests[p.track]) return null;
    if (tactic === 'assist' && p.track !== 'melee') return null;
    var f = e.contests[p.track], d = D.tracks[p.track], el = T.eligibility(s, id, e);
    var index = f.active.indexOf(id), opponent = f.active[index % 2 ? index - 1 : index + 1];
    var a = power(s, e, p.track, id) + t.power;
    var b = opponent ? power(s, e, p.track, opponent) : strength(e);
    if (p.track === 'melee' && tactic === 'assist') a += 2;
    if (p.track === 'melee') {
      a = 0; b = 0;
      f.active.forEach(function (other, i) {
        var value = power(s, e, p.track, other) + (other === id ? t.power + (tactic === 'assist' ? 2 : 0) : 0);
        if ((i < 4) === (index < 4)) a += value / 4; else b += value / 4;
      });
    }
    var chance = FB.clamp(0.5 + (a - b) / 24, 0.08, 0.92);
    var injury = Math.min(0.6, d.injury * t.risk * (1 + p.fatigue / 10));
    var due = e.startTurn + 1 + f.round * 2;
    var ok = el.ok && present(s, id, e) && !p.missed && f.round < 3 && p.round === f.round &&
      s.turn >= due && s.turn < e.closeTurn && index >= 0;
    return { ok:ok, reason:!el.ok ? el.reason : !present(s, id, e) ? FB.T('Reach the venue first.') : !ok ? FB.T('The next round is not ready.') : '',
      eventId:eventId, charId:id, track:p.track, round:f.round, tactic:tactic, power:a, chance:chance, scored:p.track === 'archery' || p.track === 'perform',
      opponent:opponent, injury:injury, severe:d.severe * t.risk, fatigue:t.fatigue, dueTurn:due,
      signature:JSON.stringify([eventId,id,p.track,f.round,tactic,a,b,chance,injury,p.fatigue,p.preparation,s.turn]) };
  };
  T.prepare = function (s, eventId, id, mode) {
    var e = T.get(s, eventId), p = T.participant(e, id);
    if (!live(e) || !p || p.status !== 'active' || p.prepared || p.eliminated || p.round >= 3 ||
        !e.contests[p.track] || !T.attendance(s,id,e).ok || ['practice','rest'].indexOf(mode) < 0) return false;
    p.prepared = true;
    if (mode === 'rest') p.fatigue = Math.max(0, p.fatigue - 3);
    else { p.preparation += 1; p.fatigue++; }
    return true;
  };
  function win(s, e, track, id) {
    var f = e.contests[track], candidate = T.participant(e, id);
    var p = candidate && candidate.status === 'active' && !candidate.missed && character(s,id) && !character(s,id).dead && character(s,id).health > 0 ? candidate : null;
    f.winner = id;
    var purse = e.remaining[bucket(track)];
    if (track === 'melee' && p) {
      var share = Math.floor(purse / 4);
      if (credit(s,e,'prize:' + track,p.charId,bucket(track),share)) p.prizePaid = share;
      credit(s,e,'prize:' + track + ':teammates',null,bucket(track),purse-share);
    } else if (credit(s, e, 'prize:' + track, p && p.charId, bucket(track), purse) && p) p.prizePaid = purse;
    if (p) {
      p.won = true;
      if (player(s, id)) {
        s.player.circuit.victories++; s.player.circuit.reputation += 4;
        if (track === 'archery' || track === 'wrestling') s.player.circuit.openWins++;
        s.player.prestige += D.scales[e.scale].prestige;
        notify(s, 'victory', 'Won a competition at the games in {venue}.', { venue:T.venueName(s, e) });
        if (FB.noteLifeEvent) FB.noteLifeEvent(s, id, 'tournament', { venue:T.venueName(s, e) });
      }
    }
  }
  function resolveField(s, e, track, selection) {
    var f = e.contests[track], old = f.active.slice(), round = f.round, scores = {}, bases = {}, next = [], d = D.tracks[track];
    // One mutation owns all eight entrants and every pair in this round.
    old.forEach(function (id) {
      if (!live(e) || e.awaitingSuccessor) return;
      var p = T.participant(e, id), tactic = selection && selection.charId === id ? selection.tactic : 'balanced';
      var attending = p && p.status === 'active' && !p.missed && present(s,id,e) && T.eligibility(s,id,e).ok;
      if (p && p.status === 'active' && !attending && !p.missed) {
        // Missing the opening round forfeits the field, not the unspent escrow.
        // The visitor may still arrive for the remaining social festivities.
        p.missed = true; p.eliminated = true;
        pay(s,p.household ? s.player.charId : id,p.feeUnused + p.forfeit);
        p.feeUnused = 0; p.forfeit = 0;
      }
      var t = D.tactics[tactic], base = power(s, e, track, id) + t.power;
      if (p && !attending) base = -100;
      if (track === 'melee' && tactic === 'assist') base += 2;
      bases[id] = base;
      scores[id] = base + FB.ri(0, 12);
      if (attending) {
        if (p.feeUnused) { pay(s, e.hostId, p.feeUnused); p.feeUnused = 0; }
        p.round = round + 1; p.prepared = false; p.preparation = 0;
        var risk = Math.min(0.6, d.injury * t.risk * (1 + p.fatigue / 10)), roll = FB.rng();
        p.fatigue += t.fatigue;
        if (roll < risk && player(s, id)) {
          FB.applyEffects(s, { health:roll < d.severe * t.risk ? -6 : -1 }, {}, null);
          notify(s, 'injury', 'An injury at the games in {venue} requires care.', { venue:T.venueName(s, e) });
          if (live(e) && p.status === 'active' && !p.incident) queueIncident(s, e, p, 'injury');
        }
      } else if (!p) {
        var npc = f.entrants.filter(function (r) { return r.id === id; })[0];
        npc.fatigue = num(npc.fatigue) + t.fatigue;
      }
    });
    if (!live(e) || e.awaitingSuccessor) return;
    if (track === 'joust' || track === 'wrestling') {
      for (var i = 0; i < old.length; i += 2) {
        var chance = bases[old[i]] <= -100 ? 0 : bases[old[i + 1]] <= -100 ? 1 :
          FB.clamp(0.5 + (bases[old[i]] - bases[old[i + 1]]) / 24, 0.08, 0.92);
        var winner = FB.rng() < chance ? old[i] : old[i + 1];
        var loser = winner === old[i] ? old[i + 1] : old[i];
        next.push(winner);
        var lost = T.participant(e, loser);
        if (lost) {
          lost.eliminated = true;
          if (track === 'joust' && lost.forfeit) { pay(s, e.hostId, lost.forfeit); lost.forfeit = 0; }
        }
      }
      f.active = next;
    } else if (track === 'melee') {
      var left = 0, right = 0;
      old.forEach(function (id, i) { if (i < 4) left += bases[id] / 4; else right += bases[id] / 4; });
      var leftWon = FB.rng() < FB.clamp(0.5 + (left - right) / 24, 0.08, 0.92);
      old.forEach(function (id, i) { f.scores[id] = num(f.scores[id]) + ((i < 4) === leftWon ? 10 : 0); });
    } else old.forEach(function (id) { f.scores[id] = num(f.scores[id]) + Math.max(0, scores[id]); });
    f.results.push({ round:round, scores:scores, survivors:f.active.slice() }); f.round++;
    if (f.round === 3) {
      var finalIds = f.active.slice().sort(function (a, b) { return num(f.scores[b]) - num(f.scores[a]) || (a < b ? -1 : 1); });
      if (finalIds.length) {
        if (track === 'melee') {
          var team = f.active.indexOf(finalIds[0]) < 4 ? f.active.slice(0, 4) : f.active.slice(4);
          var member = team.filter(function (id) { var p = T.participant(e,id); return p && p.status === 'active' && !p.missed; })[0];
          win(s, e, track, member || finalIds[0]);
        } else win(s, e, track, finalIds[0]);
      }
    }
  }
  T.resolveRound = function (s, reviewed) {
    if (!reviewed) return false;
    var q = T.roundPreview(s, reviewed.eventId, reviewed.charId, reviewed.tactic);
    if (!q || !q.ok || q.signature !== reviewed.signature) return false;
    resolveField(s, T.get(s, q.eventId), q.track, q);
    return true;
  };
  function clearContexts(s, eventId, id) {
    s.eventQueue = (s.eventQueue || []).filter(function (q) {
      return !q.ctx || q.ctx.tournamentId !== eventId || (id && q.ctx.tournamentCharId !== id);
    });
  }
  T.withdraw = function (s, eventId, id, forced) {
    var e = T.get(s, eventId), p = T.participant(e, id);
    if (!p || p.status !== 'active') return false;
    p.status = forced ? 'interrupted' : 'withdrawn'; p.incident = null;
    clearContexts(s, eventId, id);
    pay(s, p.household ? s.player.charId : id, p.feeUnused + p.forfeit + p.tradeStake);
    p.feeUnused = 0; p.forfeit = 0; p.tradeStake = 0;
    e.serviceCommitted = Math.max(0, e.serviceCommitted - Math.max(0, p.terms.contract - p.paid));
    if (player(s, id) && !forced) s.player.circuit.reputation = Math.max(0, s.player.circuit.reputation - 1);
    if (player(s, id) && s.player.travel && s.player.travel.tournamentId === eventId && forced === true) T.returnHome(s, true);
    return true;
  };
  function close(s, e, cancelled) {
    if (!live(e)) return false;
    e.status = cancelled ? 'cancelled' : 'completed'; e.finishedTurn = s.turn;
    clearContexts(s, e.id);
    e.participants.forEach(function (p) {
      if (p.status === 'active') {
        if (!cancelled && (p.round === 3 || p.workDays === 7) && !p.skillAwarded && player(s, p.charId)) {
          p.skillAwarded = true;
          var skills = {}; skills[D.tracks[p.track].skill] = 1;
          FB.applyEffects(s, { skills:skills }, {}, null);
        }
        T.withdraw(s, e.id, p.charId, cancelled ? true : 'completed');
        p.status = cancelled ? 'interrupted' : 'completed';
      }
    });
    var refund = e.services;
    Object.keys(e.remaining).forEach(function (key) { refund += e.remaining[key]; e.remaining[key] = 0; });
    e.services = 0; e.refunded = refund;
    refundHost(s, e, refund);
    if (!cancelled) {
      var reward = Math.max(0,D.scales[e.scale].prestige + e.quality), host = character(s,e.hostId);
      if (player(s,e.hostId)) s.player.prestige += reward;
      else if (host) host.prestige = num(host.prestige) + reward;
      if (FB.adjustCountySupport) FB.adjustCountySupport(s, e.provinceId, 3);
      if (player(s,e.hostId)) (e.guests || []).forEach(function (id) {
        if (T.eligibility(s,id,e).ok) FB.adjustStanding(s,{kind:'character',id:id},FB.clamp(2 + e.quality,1,8));
      });
      if (FB.noteLifeEvent) FB.noteLifeEvent(s, e.hostId, 'games_hosted', { venue:T.venueName(s, e) });
    }
    if (player(s, e.hostId) || T.participant(e, s.player.charId)) notify(s, cancelled ? 'cancelled' : 'closed',
      cancelled ? 'The games at {venue} are cancelled. Unspent funds return to the host.' : 'The games at {venue} close. Unspent funds return to the host.', { venue:T.venueName(s, e) });
    var r = T.ensure(s);
    r.summaries.push({ id:e.id, hostId:e.hostId, provinceId:e.provinceId, settlement:e.settlement,
      startTurn:e.startTurn, status:e.status, funding:e.funding.total, refunded:refund });
    r.summaries = r.summaries.slice(-D.summaryCap);
    return true;
  }
  T.cancel = function (s, eventId, hostId) {
    var e = T.get(s, eventId);
    return e && e.hostId === hostId ? close(s, e, true) : false;
  };
  T.referencesCharacter = function (s, id) {
    return T.active(s).some(function (e) { return e.hostId === id || (e.guests || []).indexOf(id) >= 0 || e.participants.some(function (p) { return p.charId === id && p.status === 'active'; }); });
  };
  T.reconcile = function (s) {
    if (!s.tournaments) return;
    T.ensure(s);
    T.active(s).forEach(function (e) {
      var c = character(s, e.hostId), authority = FB.settlementConstructionAuthority(s, e.provinceId, e.settlement, actor(s, e.hostId));
      // The succession chooser pauses the world. Keep the funded household
      // commitment until its actual successor, ownership and age are known.
      if (player(s,e.hostId) && c && (c.dead || c.health <= 0 || s.player.dead) && FB.heirsOf(s).length &&
          !chainWar(s,realm(s,e.hostId)) && !chainWar(s,holder(s,e.provinceId)) && !venueConflict(s,e.provinceId)) {
        e.awaitingSuccessor = true; clearContexts(s,e.id);
        T.withdraw(s,e.id,e.hostId,'interrupted'); return;
      }
      delete e.awaitingSuccessor;
      if (!c || c.dead || !authority.direct) {
        var h = FB.settlementHolder(s, e.provinceId, e.settlement), successor = h && (h.kind === 'character' ? character(s, h.id) : h.id === 'player' ? character(s, s.player.charId) : FB.realmRulerCharacterSnapshot(s, h.id));
        var inheritedHouse = (e.hostRealm === 'player' || e.fundingAccount && e.fundingAccount.kind === 'realm' && e.fundingAccount.id === 'player') &&
          successor && successor.id === s.player.charId && e.hostId !== s.player.charId;
        var successorEvent = Object.assign({}, e, {hostId:successor && successor.id});
        if ((!c || c.dead || inheritedHouse) && successor && tier(s, successor.id) >= D.scales[e.scale].tier && T.eligibility(s, successor.id, successorEvent).ok) {
          var oldId = e.hostId; e.hostId = successor.id; e.hostRealm = realm(s, successor.id);
          e.fundingAccount = copy(actor(s,successor.id));
          clearContexts(s,e.id,oldId); e.incidents.pending = null;
          root(s).starts[e.hostId] = Math.max(num(root(s).starts[e.hostId]), e.startTurn);
          root(s).annual.forEach(function (a) { if (a.hostId === oldId) a.hostId = e.hostId; });
        } else {
          if ((!c || c.dead) && successor) e.fundingAccount = copy(actor(s,successor.id));
          close(s, e, true); return;
        }
      }
      if (tier(s, e.hostId) < D.scales[e.scale].tier || !T.eligibility(s, e.hostId, e).ok) { close(s, e, true); return; }
      e.participants.forEach(function (p) {
        if (p.status === 'active' && ((p.household && p.charId !== s.player.charId) || !T.eligibility(s, p.charId, e).ok ||
            (tier(s, p.charId) === 0 && home(s, p.charId) !== e.provinceId))) T.withdraw(s, e.id, p.charId, true);
      });
      e.guests = (e.guests || []).filter(function (id) { return T.eligibility(s,id,e).ok; });
    });
    root(s).annual = root(s).annual.filter(function (a) {
      if (a.household && a.hostId !== s.player.charId) {
        if (tier(s,s.player.charId) < D.scales[a.scale].tier ||
            !FB.settlementConstructionAuthority(s,a.provinceId,a.settlement,'player').direct) return false;
        a.hostId = s.player.charId;
      }
      var c = character(s,a.hostId);
      if (c && !c.dead) return true;
      var h = FB.settlementHolder(s,a.provinceId,a.settlement);
      var heir = h && (h.kind === 'character' ? character(s,h.id) : h.id === 'player' ? character(s,s.player.charId) : FB.realmRulerCharacterSnapshot(s,h.id));
      if (!heir || tier(s,heir.id) < D.scales[a.scale].tier) return false;
      a.hostId = heir.id; return true;
    });
    var t = s.player.travel;
    if (t && t.purpose === 'tournament' && t.phase !== 'return') {
      var e = T.get(s, t.tournamentId);
      if (!live(e) && (!e || e.status === 'cancelled') || !T.eligibility(s, s.player.charId, e).ok) T.returnHome(s, true);
    }
  };
  T.samplePlayer = function (s) {
    var r = T.ensure(s), id = s.player.charId, period = Math.floor(s.turn / 90), rows = r.samples[id] || [];
    if (rows.length && rows[rows.length - 1].season === period) return;
    rows.push({ season:period, net:T.projection(s, id) });
    r.samples[id] = rows.slice(-4);
  };
  T.season = function (s) {
    var r = T.ensure(s), period = Math.floor(s.turn / 90);
    if (r.lastSeason === period) return;
    r.lastSeason = period;
    var ids = [s.player.charId], fiscal = FB.treasurySnapshot(s);
    Object.keys(s.realms).sort().forEach(function (rid) {
      var c = FB.realmRulerCharacterSnapshot(s, rid);
      if (c && ids.indexOf(c.id) < 0) ids.push(c.id);
    });
    Object.keys(s.settlementLordships && s.settlementLordships.accounts || {}).sort().forEach(function (id) {
      if (character(s, id) && !character(s, id).dead && ids.indexOf(id) < 0) ids.push(id);
    });
    var nets = {};
    ids.forEach(function (id) {
      nets[id] = T.projection(s, id, fiscal);
      var rows = r.samples[id] || (r.samples[id] = []);
      if (!rows.length || rows[rows.length - 1].season !== period) rows.push({ season:period, net:nets[id] });
      r.samples[id] = rows.slice(-4);
    });
    Object.keys(r.samples).forEach(function (id) { if (ids.indexOf(id) < 0 && !T.referencesCharacter(s, id)) { delete r.samples[id]; delete r.starts[id]; } });
    Object.keys(r.starts).forEach(function (id) { if (ids.indexOf(id) < 0 && !T.referencesCharacter(s,id)) delete r.starts[id]; });
    var groups = {};
    ids.filter(function (id) { return id !== s.player.charId && tier(s, id) >= 3; }).sort().forEach(function (id) {
      var sites = FB.directSettlements(s, actor(s, id));
      if (!sites.length) return;
      var site = sites[0], key = kingdom(site.provinceId) || 'frontier';
      (groups[key] || (groups[key] = [])).push({ id:id, site:site });
    });
    Object.keys(groups).sort().forEach(function (key) {
      var list = groups[key], start = num(r.cursors[key]) % list.length;
      r.cursors[key] = (start + 1) % list.length;
      for (var i = 0; i < list.length; i++) {
        var candidate = list[(start + i) % list.length], id = candidate.id, dates = T.dates(s, id);
        if (!dates.length || !T.eligibility(s, id).ok || T.active(s).some(function (e) { return e.hostId === id; })) continue;
        var reserve = Math.max(500, Math.max(0, nets[id]) * 4, num(account(s, id) && account(s, id).reserveTarget));
        if (available(s, id) < reserve + 500) continue;
        var spec = { hostId:id, provinceId:candidate.site.provinceId, settlement:candidate.site.settlement,
          scale:'local', programme:'martial', startTurn:dates[0] };
        spec.programme = T.defaultProgramme(s,id,spec);
        if (!T.capacity(s, spec.provinceId, spec.scale).ok) continue;
        if (FB.rng() >= 0.12) continue;
        spec.startTurn = dates[FB.ri(0, dates.length - 1)];
        var q = T.quote(s, spec, fiscal);
        ['grand','regional'].some(function (scale) {
          var larger = T.quote(s,Object.assign({},spec,{scale:scale}),fiscal);
          if (!larger.ok || larger.available - larger.funding.total < reserve) return false;
          q = larger; return true;
        });
        if (q.ok && q.available - q.funding.total >= reserve) T.book(s, q, fiscal);
      }
    });
  };
  T.tick = function (s) {
    var r = T.ensure(s);
    T.reconcile(s);
    r.annual.slice().forEach(function (a) {
      if (s.turn < a.nextTurn - 60) return;
      var next = a.nextTurn; a.nextTurn += 360;
      var q = T.quote(s, { hostId:a.hostId, provinceId:a.provinceId, settlement:a.settlement,
        scale:a.scale, programme:a.programme, startTurn:next });
      if (q.ok && q.funding.total <= a.ceiling) T.book(s, q);
      else if (player(s, a.hostId)) notify(s, 'annual_skipped', 'This year’s games are skipped without a charge.', {});
    });
    T.active(s).forEach(function (e) {
      if (e.awaitingSuccessor) return;
      if (s.turn < e.startTurn) return;
      e.status = 'running';
      if (s.turn >= e.closeTurn) { close(s, e, false); return; }
      var day = s.turn - e.startTurn;
      if (player(s, e.hostId) && !e.incidents.pending && (day === 0 || day === 3)) {
        e.incidents.pending = day + 2;
        FB.queueEvent(s, day === 0 ? 'scheduled_games_field' : 'scheduled_games_security',
          context(s, e, e.hostId, 'host', e.incidents.pending, 'host'));
      }
      credit(s, e, 'staff:' + day, null, 'services', Math.min(e.staffDaily, Math.max(0, e.services - e.serviceCommitted)));
      e.participants.forEach(function (p) { if (p.status === 'active') attendanceDay(s, e, p); });
      Object.keys(e.contests).forEach(function (track) {
        if (!live(e)) return;
        var f = e.contests[track], due = e.startTurn + 1 + f.round * 2;
        if (f.round >= 3 || s.turn < due) return;
        var p = T.participant(e, s.player.charId);
        if (p && p.status === 'active' && !p.missed && p.track === track && f.active.indexOf(p.charId) >= 0 && present(s, p.charId, e) && !(FB.game && FB.game.observe)) {
          if (s.turn === due) queueRound(s, e, p, f.round);
          else if (s.turn > due) resolveField(s, e, track, { charId:p.charId, tactic:'conservative' });
        } else resolveField(s, e, track, null);
      });
    });
    var travel = s.player.travel;
    if (travel && travel.purpose === 'tournament' && travel.phase === 'arrived') {
      var edition = T.get(s, travel.tournamentId);
      var onward = T.active(s).some(function (other) {
        var p = T.participant(other,s.player.charId);
        return other.id !== travel.tournamentId && p && p.status === 'active' && T.travelQuote(s,other.id).ok;
      });
      if (!onward && (!edition || s.turn >= edition.closeTurn + 3)) T.returnHome(s, false);
    }
    r.events = r.events.filter(function (e) { return live(e) || s.turn < e.closeTurn + 4 || (s.player.travel && s.player.travel.tournamentId === e.id); });
    if (!(FB.game && FB.game.observe) && s.turn % 90 === 1) {
      var invitation = T.list(s, 'upcoming').filter(function (e) {
        return e.hostId !== s.player.charId && e.invited !== s.player.charId && T.eligibility(s, s.player.charId, e).ok;
      })[0];
      if (invitation) {
        invitation.invited = s.player.charId;
        FB.queueEvent(s, 'scheduled_games_invitation', context(s, invitation, s.player.charId, 'watch', 0, 'invitation'));
      }
    }
  };
  T.travelQuote = function (s, eventId) {
    var e = T.get(s, eventId), id = s.player.charId, t = s.player.travel;
    var out = { eventId:eventId, ok:false, reasons:[], cost:0, returnReserve:0, arrivalTurn:s.turn, route:[] };
    if (!live(e)) { out.reasons.push(FB.T('This edition has closed.')); return out; }
    var el = T.eligibility(s, id, e), origin = t ? t.currentId : s.player.provinceId;
    if (!el.ok) out.reasons.push(el.reason);
    if (s.player.tier < 1) out.reasons.push(FB.T('Serfs cannot take to the road.'));
    if (t && (t.purpose !== 'tournament' || t.phase !== 'arrived')) out.reasons.push(FB.T('Finish the current journey before booking this road.'));
    var p = t && T.participant(T.get(s, t.tournamentId), id);
    if (p && p.status === 'active' && t.tournamentId !== eventId) out.reasons.push(FB.T('Withdraw from the current activity before travelling onward.'));
    if (FB.justiceExileBlocks && (FB.justiceExileBlocks(s, id, e.provinceId) || FB.justiceExileBlocks(s, id, s.player.provinceId))) out.reasons.push(FB.T('Exile prevents this journey or its return home.'));
    var route = FB.travelRoute(origin, e.provinceId), back = FB.travelRoute(e.provinceId, s.player.provinceId);
    if (!route || !back) out.reasons.push(FB.T('No route connects the venue and household home.'));
    else {
      out.route = route; out.returnRoute = back;
      if (FB.justiceExileBlocks && route.concat(back).some(function (pid) { return FB.justiceExileBlocks(s,id,pid); })) {
        out.reasons.push(FB.T('Exile blocks a county on the outward or return route.'));
      }
      var shadow = copy(s); shadow.player.provinceId = origin;
      out.legDays = FB.travelLegDaysSnapshot(shadow);
      out.outbound = origin === e.provinceId ? 0 : FB.travelCostSnapshot('tournament', route.length / 2, shadow);
      shadow.player.provinceId = e.provinceId;
      out.returnReserve = e.provinceId === s.player.provinceId ? 0 : FB.travelCostSnapshot('tournament', back.length / 2, shadow);
      out.oldReserve = t ? num(t.returnReserve) : 0;
      out.cost = out.outbound + out.returnReserve - out.oldReserve;
      out.arrivalTurn = s.turn + route.length * out.legDays;
      if (out.arrivalTurn >= e.closeTurn) out.reasons.push(FB.T('The games would close before your arrival.'));
      if (s.player.gold < out.cost) out.reasons.push(FB.T('You cannot fund the journey and return allowance.'));
    }
    out.originId = origin; out.homeId = s.player.provinceId;
    out.local = origin === e.provinceId;
    out.ok = !out.reasons.length;
    out.signature = JSON.stringify([eventId,id,origin,out.homeId,out.route,out.returnRoute,out.legDays,out.cost,out.oldReserve,out.returnReserve,s.turn]);
    return out;
  };
  T.depart = function (s, reviewed) {
    var q = T.travelQuote(s, reviewed.eventId);
    if (!q.ok || q.signature !== reviewed.signature) return false;
    // Merely attending in the current county never changes another journey.
    if (q.local) return true;
    if (!pay(s, s.player.charId, -q.cost)) return false;
    var old = s.player.travel;
    var t = s.player.travel = { purpose:'tournament', tournamentId:q.eventId, charId:s.player.charId,
      homeId:q.homeId, currentId:q.originId, destinationId:T.get(s, q.eventId).provinceId,
      phase:'outbound', remainingRoute:q.route.slice(), outboundRoute:q.route.slice(),
      visited:old ? (old.visited || [q.homeId]).slice() : [q.homeId],
      returnRoute:q.returnRoute.slice(), returnReserve:q.returnReserve, cost:q.outbound,
      legDays:q.legDays, legDaysLeft:q.legDays, startTurn:s.turn,
      encounters:{ culture:0, road:0 }, seenCultures:{}, seenEvents:{}, completed:false };
    t.seenCultures[character(s, s.player.charId).culture] = 1;
    if (FB.map) FB.map.request();
    notify(s, 'departed', 'Set out for the games at {venue}; the return journey is funded.', { venue:T.venueName(s, T.get(s, q.eventId)) });
    return true;
  };
  T.returnHome = function (s, forced) {
    var t = s.player.travel;
    if (!t || t.purpose !== 'tournament' || t.phase === 'return') return false;
    var c = character(s, s.player.charId);
    if (!c || c.dead || c.health <= 0 || s.player.dead || s.player.flags.in_prison || t.charId !== s.player.charId) return false;
    var current = T.get(s,t.tournamentId), participant = T.participant(current,s.player.charId);
    if (participant && participant.status === 'active') T.withdraw(s,t.tournamentId,s.player.charId,forced ? 'interrupted' : false);
    var route = FB.travelRoute(t.currentId, t.homeId);
    if (!route) route = (t.visited || []).slice(0, -1).reverse();
    if (t.currentId !== t.homeId && (!route.length || route[route.length - 1] !== t.homeId)) return false;
    t.phase = 'return'; t.forcedReturn = !!forced; t.returnReserve = 0;
    t.remainingRoute = route; t.legDaysLeft = route.length ? t.legDays : 0;
    s.eventQueue = (s.eventQueue || []).filter(function (q) { return !q.travel && !(q.ctx && q.ctx.tournamentId === t.tournamentId); });
    notify(s, 'returning', 'The traveller begins the funded return home from the games.', {});
    return true;
  };
  T.list = function (s, filter) {
    return T.active(s).filter(function (e) {
      if (filter === 'local') return e.provinceId === s.player.provinceId;
      if (filter === 'bookings') return e.hostId === s.player.charId || !!T.participant(e, s.player.charId) || (s.player.travel && s.player.travel.tournamentId === e.id);
      if (filter === 'reachable') return T.travelQuote(s, e.id).ok || (present(s, s.player.charId, e) && T.eligibility(s, s.player.charId, e).ok);
      return true;
    }).sort(function (a, b) { return a.startTurn - b.startTurn || (a.id < b.id ? -1 : 1); });
  };
  function touchContact(s, e) {
    T.ensure(s);
    var list = s.player.circuit.contacts.filter(function (c) { return c.id !== e.hostId; });
    list.push({ id:e.hostId, name:FB.fullName(character(s, e.hostId)), lastTurn:s.turn });
    s.player.circuit.contacts = list.slice(-D.contactCap);
  }
  T.social = function (s, eventId, kind) {
    var e = T.get(s, eventId), id = s.player.charId, p = T.participant(e, id);
    if (!live(e) || !p || p.status !== 'active' || p.social[kind] || !present(s, id, e) || !T.eligibility(s, id, e).ok || s.turn < e.startTurn || s.turn >= e.closeTurn) return false;
    if (['introductions','gift'].indexOf(kind) < 0 || (kind === 'gift' && available(s, id) < 5)) return false;
    p.social[kind] = true;
    if (kind === 'gift') { pay(s, id, -5); pay(s, e.hostId, 5); s.player.prestige += 2; }
    if (e.hostId !== id) FB.adjustStanding(s, { kind:'character', id:e.hostId }, kind === 'gift' ? 6 : 3);
    touchContact(s, e);
    return true;
  };
  function attendanceDay(s, e, p) {
    if (!present(s, p.charId, e) || !T.eligibility(s, p.charId, e).ok) return;
    if (p.lastWork === s.turn) return;
    p.lastWork = s.turn;
    var d = D.tracks[p.track];
    if (d.wage) {
      p.workDays++;
      var due = p.terms.contract * Math.min(7, p.workDays) / 7 - p.paid;
      if (due > 0 && credit(s, e, 'work:' + p.charId + ':' + p.workDays, p.charId, 'services', due)) {
        p.paid += due; e.serviceCommitted = Math.max(0, e.serviceCommitted - due);
      }
    }
    if (p.track === 'trade' && p.tradeStake > 0 && s.turn >= e.closeTurn - 1) {
      // Existing merchant skill/chance and the local commodity stock are authoritative.
      var goods = Object.keys(FBDATA.marketGoods || {}).sort(), good = goods[0];
      if (good) {
        var price = FB.marketPrice(s, e.provinceId, good), quantity = p.tradeStake / price;
        if (FB.marketTakeStock(s, e.provinceId, good, quantity)) {
          var chance = FB.namedChance(s, 'travel_trade'), multiplier = FB.rng() < chance ? 1.25 : 0.65;
          var proceeds = Math.floor(p.tradeStake * multiplier);
          p.tradeProfit = proceeds - p.terms.stake;
          p.tradeStake = 0; p.tradeSettled = true;
          FB.marketDeliverStock(s, e.provinceId, good, quantity);
          pay(s, p.charId, proceeds);
          if (player(s, p.charId)) s.player.circuit.earnings += proceeds - p.terms.stake;
        }
      }
    }
    if (player(s, p.charId) && !p.introduced) {
      p.introduced = true;
      queueIncident(s, e, p, 'rival');
    } else if (player(s, p.charId) && !p.incident) {
      var day = s.turn - e.startTurn;
      if (day === 2) queueIncident(s, e, p, d.elite ? 'equipment' : 'recruitment');
      if (day === 3 && d.contest) queueIncident(s, e, p, 'result');
      if (day === 4) queueIncident(s, e, p, d.wage ? 'commission' : 'patron');
      if (day === 6) queueIncident(s, e, p, 'celebration');
    }
  }
  function context(s, e, id, track, round, kind) {
    return { tournamentId:e.id, tournamentCharId:id, tournamentTrack:track, tournamentRound:round, locationId:e.provinceId,
      tournamentKind:kind, venue:T.venueName(s, e), tournamentHost:FB.fullName(character(s, e.hostId)) };
  }
  function queueRound(s, e, p, round) {
    var q = T.roundPreview(s, e.id, p.charId, 'balanced');
    var ctx = context(s, e, p.charId, p.track, round, 'round');
    ctx.injuryRisk = Math.round(q.injury * 100); ctx.severeRisk = Math.round(q.severe * 1000) / 10;
    ctx.roundNumber = round + 1;
    FB.queueEvent(s, 'scheduled_games_round', ctx);
  }
  function queueIncident(s, e, p, kind) {
    if (p.incident) return;
    p.incident = { kind:kind, serial:(p.incidentSerial || 0) + 1 };
    p.incidentSerial = p.incident.serial;
    FB.queueEvent(s, 'scheduled_games_' + kind, context(s, e, p.charId, p.track, p.incident.serial, kind));
  }
  T.contextValid = function (s, ctx) {
    var e = T.get(s, ctx.tournamentId), id = ctx.tournamentCharId, p = T.participant(e, id);
    if (!live(e) || id !== s.player.charId || !T.eligibility(s, id, e).ok) return false;
    if (ctx.tournamentKind === 'invitation') return s.turn < e.closeTurn;
    if (ctx.tournamentKind === 'host') return e.hostId === id && e.incidents.pending === ctx.tournamentRound;
    if (!p || p.status !== 'active' || p.track !== ctx.tournamentTrack || !present(s, id, e)) return false;
    if (ctx.tournamentKind === 'round') {
      var q = T.roundPreview(s, e.id, id, 'balanced');
      return !!q && q.ok && q.round === ctx.tournamentRound;
    }
    return !!p.incident && p.incident.kind === ctx.tournamentKind && p.incident.serial === ctx.tournamentRound;
  };
  T.incident = function (s, ctx, choice) {
    if (!T.contextValid(s, ctx) || ['care','firm','leave'].indexOf(choice) < 0) return false;
    if (ctx.tournamentKind === 'round' || ctx.tournamentKind === 'invitation') return false;
    var e = T.get(s, ctx.tournamentId), p = T.participant(e, ctx.tournamentCharId);
    if (ctx.tournamentKind === 'host') {
      e.incidents.pending = null;
      e.quality += choice === 'care' ? 2 : choice === 'firm' ? -1 : 0;
      if (choice !== 'leave') FB.adjustCountySupport(s, e.provinceId, choice === 'care' ? 2 : -2);
    } else {
      p.incident = null;
      if (choice === 'care') { p.fatigue = Math.max(0, p.fatigue - 2); touchContact(s, e); }
      if (choice === 'firm') { p.preparation++; p.fatigue++; }
      if (choice === 'care' && ctx.tournamentKind === 'commission') s.player.circuit.reputation += 2;
      if (choice === 'care' && ['patron','recruitment','celebration'].indexOf(ctx.tournamentKind) >= 0 && e.hostId !== s.player.charId) {
        FB.adjustStanding(s,{kind:'character',id:e.hostId},ctx.tournamentKind === 'celebration' ? 1 : 3);
      }
    }
    return true;
  };
  FB.fns = FB.fns || {};
  FB.fns.scheduled_games_valid = T.contextValid;
  FB.fns.scheduled_games_team = function (s, ctx) { return T.contextValid(s, ctx) && ctx.tournamentTrack === 'melee'; };
  ['conservative','balanced','aggressive','assist','withdraw'].forEach(function (tactic) {
    var key = 'scheduled_games_' + tactic;
    FB.fns[key] = function (s, ctx) {
      if (!T.contextValid(s, ctx)) return false;
      if (tactic === 'withdraw') return T.withdraw(s, ctx.tournamentId, ctx.tournamentCharId, false);
      return T.resolveRound(s, T.roundPreview(s, ctx.tournamentId, ctx.tournamentCharId, tactic));
    };
  });
  ['care','firm','leave'].forEach(function (choice) {
    FB.fns['scheduled_games_' + choice] = function (s, ctx) { return T.incident(s, ctx, choice); };
  });
  FB.fns.scheduled_games_open = function (s, ctx) {
    if (T.contextValid(s, ctx) && FB.ui.showTournament) FB.ui.showTournament(ctx.tournamentId);
  };
  FB.eventImpactAdapters = FB.eventImpactAdapters || {};
  function captured(s,ctx) {
    var p = T.participant(T.get(s,ctx.tournamentId),ctx.tournamentCharId);
    return p ? { fatigue:p.fatigue,preparation:p.preparation,reputation:s.player.circuit.reputation } : null;
  }
  ['conservative','balanced','aggressive','assist','withdraw','care','firm','leave','open'].forEach(function (kind) {
    FB.eventImpactAdapters['scheduled_games_' + kind] = {
      preview:function (s, ctx) {
        if (!T.contextValid(s, ctx)) return [];
        if (ctx.tournamentKind === 'round' && D.tactics[kind]) {
          var q = T.roundPreview(s,ctx.tournamentId,ctx.tournamentCharId,kind);
          return q && q.ok ? [{type:'system',system:'tournament',field:'round',scored:q.scored,power:q.power,
            chance:q.chance,injury:q.injury,severe:q.severe,fatigue:q.fatigue}] : [];
        }
        if (ctx.tournamentKind === 'host' && kind !== 'leave') return [{ type:'commonVoice', amount:kind === 'care' ? 2 : -2, provinceId:T.get(s, ctx.tournamentId).provinceId }];
        if (kind === 'withdraw') {
          var p = T.participant(T.get(s, ctx.tournamentId), ctx.tournamentCharId);
          return [{type:'gold',amount:p.feeUnused + p.forfeit + p.tradeStake}];
        }
        if (kind === 'care') {
          var resting = T.participant(T.get(s,ctx.tournamentId),ctx.tournamentCharId);
          var care = resting ? [{type:'system',system:'tournament',field:'fatigue',amount:-Math.min(2,resting.fatigue)}] : [];
          if (ctx.tournamentKind === 'commission') care.push({type:'system',system:'tournament',field:'reputation',amount:2});
          if (['patron','recruitment','celebration'].indexOf(ctx.tournamentKind) >= 0 && T.get(s,ctx.tournamentId).hostId !== s.player.charId) {
            care.push({type:'standing',targetKind:'character',targetId:T.get(s,ctx.tournamentId).hostId,amount:ctx.tournamentKind === 'celebration' ? 1 : 3});
          }
          return care;
        }
        if (kind === 'firm') return [{type:'system',system:'tournament',field:'preparation',amount:1},{type:'system',system:'tournament',field:'fatigue',amount:1}];
        return [];
      },
      capture:captured,
      report:function (s,before,ctx) {
        // The ordinary effect ledger already records money, prestige, health and support.
        var after = captured(s,ctx), out = [];
        if (before && after) ['fatigue','preparation','reputation'].forEach(function (key) {
          var delta = after[key] - before[key];
          if (delta) out.push({type:'system',system:'tournament',field:key,amount:delta,resolved:true});
        });
        return out;
      }
    };
  });
})();
