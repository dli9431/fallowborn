/* Fallowborn — endowed women's communities, offices and temporary residents. */
window.FB = window.FB || {};
(function () {
  'use strict';
  /* Register literal fallbacks at boot for old Chronicle entries and extraction. */
  FB.msg('news.abbey.concede', '⛪ {name} pays a settlement in the dispute at {house}.');
  FB.msg('news.abbey.defend', '⛪ {name} contests an encroachment on the rights of {house}.');
  FB.msg('news.abbey.departed', '⛪ {name} leaves the community at {house} and returns to secular life.');
  FB.msg('news.abbey.elected', '⛪ {name} is elected abbess at {house}. The endowed estate remains the community’s property.');
  FB.msg('news.abbey.election_refused', '⛪ The community at {house} declines {name}’s candidacy. Another election may be sought in a year.');
  FB.msg('news.abbey.encroachment', '⛪ A local lord challenges the rights of {house}. Its abbess must answer the dispute.');
  FB.msg('news.abbey.endowed', '⛪ {name} permanently endows the community at {house}.');
  FB.msg('news.abbey.founded', '⛪ {name} endows a religious house at {house}. Its property belongs to the community.');
  FB.msg('news.abbey.invitation_refused', '⛪ {name} declines an invitation to stay at {house}.');
  FB.msg('news.abbey.mediate', '⛪ {name} mediates disputes and strengthens the connections of {house}.');
  FB.msg('news.abbey.patronage', '⛪ {name} secures a new subscription to the endowment at {house}.');
  FB.msg('news.abbey.privilege', '⛪ {name} secures new privileges for the community at {house}.');
  FB.msg('news.abbey.privilege_refused', '⛪ The petition for new privileges at {house} is refused.');
  FB.msg('news.abbey.relief', '⛪ {name} distributes relief from the treasury at {house}.');
  FB.msg('news.abbey.rents', '⛪ {name} collects additional rents for {house}, straining community support.');
  FB.msg('news.abbey.resident', '⛪ {name} enters the community at {house} for a temporary stay, without religious vows.');
  FB.msg('news.abbey.school', '⛪ {name} funds instruction for the pupils at {house}.');
  function cfg() { return FBDATA.abbeys; }
  function me(s) { return s.chars[s.player.charId]; }
  function houses(s) { return s.abbeys && s.abbeys.houses || []; }
  function catholic(s, c) {
    return !!(c && !c.dead && FB.faithHasSystem(c.religion, 'papacy', s));
  }
  function standing(s, id) {
    return id && s.chars[id] && !s.chars[id].dead
      ? FB.standingOf(s, { kind:'character', id:id }) : 0;
  }
  function adjust(s, id, amount) {
    if (id && s.chars[id] && !s.chars[id].dead) {
      FB.adjustStanding(s, { kind:'character', id:id }, amount);
    }
  }
  function patron(s, h) { return !!(h && h.patronDyn && h.patronDyn === me(s).dyn); }
  FB.abbeyCandidateFamily = function (s, c) {
    return !!(c && (c.id === s.player.charId || c.dyn && c.dyn === me(s).dyn ||
      FB.kinOf(s).byId[c.id]));
  };
  function available(s, c) {
    const exile = c && s.justice && s.justice.exiles && s.justice.exiles[c.id];
    return catholic(s, c) && !(exile && exile.endTurn > s.turn) &&
      !(FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(s, c.id));
  }
  function record(s, pid) {
    return houses(s).filter(function (h) { return h.provinceId === pid; })[0] || null;
  }
  function lord(s, h) {
    const pid = h ? h.provinceId : s.player.provinceId;
    const rid = s.holder && s.holder[pid] || s.owner[pid];
    return FB.realmRulerCharacterSnapshot(s, rid);
  }
  function sovereign(s, h) {
    let rid = s.owner[h.provinceId], seen = {};
    while (s.realms[rid] && s.realms[rid].liege && !seen[rid]) {
      seen[rid] = true; rid = s.realms[rid].liege;
    }
    return FB.realmRulerCharacterSnapshot(s, rid);
  }
  function pope(s) {
    const p = s.papacy;
    const oid = p && FB.papalObedienceForCharacter(s, me(s));
    const o = p && p.obediences[oid || p.romanObedience];
    return o && s.chars[o.claimantId] || null;
  }
  function check(ok, text, missing) { if (!ok) missing.push(text); }
  function status(missing, extra) {
    const out = extra || {};
    out.missing = missing; out.ready = !missing.length;
    return out;
  }
  function news(s, key, h, c) {
    FB.news(s, FB.message(key, {
      house:FB.world.byId[h.provinceId].name,
      name:c ? c.name : me(s).name
    }));
  }
  function newHouse(s, founded) {
    if (!s.abbeys) s.abbeys = { v:1, houses:[] };
    const h = {
      id:'abbey:' + s.player.provinceId, provinceId:s.player.provinceId,
      foundedTurn:s.turn, holderId:null, patronDyn:founded ? me(s).dyn : null,
      religion:me(s).religion, culture:me(s).culture,
      capital:founded ? cfg().foundationCapital : 0,
      rents:founded ? 0 : cfg().existingRent, treasury:40, plots:[],
      support:50, privileges:[], residents:[], connections:[],
      cooldowns:{}, petitions:{}, invitations:{}, vacancyTurn:s.turn,
      lastSeason:s.turn, lastDispute:s.turn
    };
    s.abbeys.houses.push(h);
    FB.realmRulerCharacter(s, s.owner[h.provinceId]);
    if (s.holder && s.holder[h.provinceId]) FB.realmRulerCharacter(s, s.holder[h.provinceId]);
    return h;
  }
  FB.abbeyHouses = houses;
  FB.abbeyAt = record;
  FB.abbeyOf = function (s, c) {
    c = c || me(s);
    return c && !c.dead && houses(s).filter(function (h) {
      return h.holderId === c.id;
    })[0] || null;
  };
  FB.abbeyResidentHouse = function (s, id) {
    return houses(s).filter(function (h) {
      return h.residents.some(function (r) { return r.charId === id; });
    })[0] || null;
  };
  FB.abbeyRetainsCharacter = function (s, id) {
    return houses(s).some(function (h) {
      return h.holderId === id || h.residents.some(function (r) {
        return r.charId === id || r.sponsorId === id;
      }) || h.connections.some(function (r) { return r.charId === id; }) ||
        (h.dispute && h.dispute.lordId === id);
    });
  };
  FB.playerAbbeyOnly = function (s) {
    return !!(FB.abbeyOf(s) && !(s.player.provs || []).length &&
      !(FB.directSettlements && FB.directSettlements(s).length) &&
      !(FB.castellanyOf && FB.castellanyOf(s)));
  };
  FB.playerChurchOfficeOnly = function (s) {
    return FB.playerBishopricOnly(s) || FB.playerAbbeyOnly(s);
  };
  FB.abbeyTitle = function (h) {
    return h.privileges.length ? FB.T('Privileged abbess') : FB.T('Abbess');
  };
  FB.abbeyFinance = function (s, h) {
    let revenue = h.rents + h.capital * cfg().capitalYield;
    h.plots.forEach(function (g) { revenue += FB.landGroupYield(g.count); });
    revenue += h.privileges.length * cfg().privilegeIncome;
    if (h.dispute) revenue = Math.max(0, revenue - cfg().disputeLoss);
    const upkeep = cfg().upkeep + h.residents.length * cfg().residentUpkeep;
    const allowance = h.holderId && s.chars[h.holderId] && !s.chars[h.holderId].dead
      ? Math.min(cfg().allowance + h.privileges.length * cfg().privilegeIncome,
        Math.max(0, h.treasury + revenue - upkeep)) : 0;
    return { revenue:revenue, upkeep:upkeep, allowance:allowance,
      balance:revenue - upkeep - allowance };
  };
  FB.abbeyIncome = function (s) {
    const h = FB.abbeyOf(s);
    return h && catholic(s, me(s)) ? FB.abbeyFinance(s, h).allowance : 0;
  };
  FB.abbeyRetinue = function (s) {
    const h = FB.abbeyOf(s);
    return h ? 80 + cfg().privilegeTroops * h.privileges.length : 0;
  };
  FB.abbeyAccess = function (s) {
    return catholic(s, me(s)) && FB.ageOf(me(s), s.date.year) >= 16;
  };
  FB.abbeyFoundationStatus = function (s) {
    const missing = [];
    check(FB.abbeyAccess(s) && available(s, me(s)), FB.T('An available Catholic adult'), missing);
    check(s.player.tier >= 1, FB.T('A free household'), missing);
    check(!record(s, s.player.provinceId), FB.T('No existing abbey in this county'), missing);
    check(houses(s).length < cfg().maxHouses, FB.T('Space for another religious house'), missing);
    check(s.player.gold >= cfg().foundationCost, FB.T('Requires {money:cost}', { cost:cfg().foundationCost }), missing);
    check(s.player.piety >= 80, FB.T('80 piety'), missing);
    return status(missing, { cost:cfg().foundationCost });
  };
  FB.foundAbbey = function (s) {
    const q = FB.abbeyFoundationStatus(s);
    if (!q.ready) return false;
    s.player.gold -= q.cost;
    const h = newHouse(s, true);
    s.player.prestige += cfg().foundationPrestige;
    news(s, 'news.abbey.founded', h);
    return h;
  };
  function unmarried(s, c) {
    return !FB.spousesOf(s, c).length && !c.betrothedId;
  }
  function candidateChecks(s, c, h) {
    const missing = [];
    const career = c && c.career;
    const rank = Math.max(c && c.religiousRanks && c.religiousRanks.catholic_monastic || 0,
      c && c.id === s.player.charId && s.player.flags.abbot ? 3 : 0);
    const age = c ? FB.ageOf(c, s.date.year) : 0;
    const vocation = rank >= 2 && career && career.profession === 'monk' && career.experience >= 10;
    const mature = c && age >= 35 && FB.stationOf(c) >= 2 && FB.skillOf(c, 'ste') >= 10;
    check(c && available(s, c) && c.sex === 'f', FB.T('An available Catholic woman'), missing);
    check(age >= 24, FB.T('Age 24'), missing);
    check(c && unmarried(s, c), FB.T('Unmarried or widowed, without a betrothal'), missing);
    check(c && FB.skillOf(c, 'lea') >= 9, FB.T('Learning 9'), missing);
    check(vocation || mature || rank >= 3, FB.T('Ten monastic years as a prioress, an existing abbess, or age 35 with noble standing and Stewardship 10'), missing);
    check(c && !(c.traits || []).includes('excommunicated'), FB.T('Good standing with the Church'), missing);
    check(c && !FB.abbeyOf(s, c) && !(FB.hasBishopric && FB.hasBishopric(s, c)), FB.T('No other religious office'), missing);
    check(c && (c.id === s.player.charId || !FB.realmIdForRulerCharacter(s, c)), FB.T('Available to reside at the abbey'), missing);
    if (h) check(!h.holderId, FB.T('A vacant abbacy'), missing);
    return missing;
  }
  FB.abbeyAppointmentStatus = function (s, h, c) {
    c = c || me(s);
    const missing = candidateChecks(s, c, h);
    check(FB.abbeyAccess(s) && available(s, me(s)), FB.T('An available Catholic sponsor'), missing);
    check(!h || houses(s).indexOf(h) >= 0, FB.T('An existing religious house'), missing);
    check(!!h || houses(s).length < cfg().maxHouses, FB.T('Space for another religious house'), missing);
    check(!!h || !record(s, s.player.provinceId), FB.T('Choose the existing local house'), missing);
    check(!h || h.provinceId === s.player.provinceId || patron(s, h), FB.T('Local access or family patronage'), missing);
    check(FB.abbeyCandidateFamily(s, c), FB.T('A candidate from your family'), missing);
    check(s.player.piety >= 100, FB.T('100 piety'), missing);
    check(s.player.prestige >= 40, FB.T('40 prestige'), missing);
    check(c && !c.unfree && (c.id !== s.player.charId || s.player.tier >= 1), FB.T('A free candidate'), missing);
    const last = h && c && h.petitions[c.id];
    const remaining = last === undefined || last === null ? 0 : Math.max(0, last + cfg().electionCooldown - s.turn);
    check(!remaining, FB.T('{days} days before another election', { days:remaining }), missing);
    const support = h ? h.support : 50;
    const contacts = h ? h.connections.reduce(function (n, r) {
      return n + (standing(s, r.charId) >= 20 ? 1 : 0);
    }, 0) : 0;
    const chance = FB.clamp(0.45 + Math.max(0, (c ? FB.skillOf(c, 'lea') : 0) - 9) * 0.02 +
      (support - 50) / 200 + (h && patron(s, h) ? 0.1 : 0) + Math.min(0.1, contacts * 0.025), 0.2, 0.85);
    return status(missing, { chance:chance, cost:0 });
  };
  function install(s, h, c) {
    h.holderId = c.id; h.appointedTurn = s.turn; delete h.vacancyTurn;
    c.abbeyVows = true;
    c.religiousRanks = c.religiousRanks || {};
    c.religiousRanks.catholic_monastic = Math.max(3, c.religiousRanks.catholic_monastic || 0);
    c.homeProvinceId = h.provinceId;
    if (FB.unassignEnterpriseWorker) FB.unassignEnterpriseWorker(s, c.id);
    if (c.id === s.player.charId) {
      s.player.flags.abbot = 1;
      if (s.player.tier < 3) FB.setPlayerTier(s, 3, { stationFarewell:false });
      if (FB.validateFocus) FB.validateFocus(s);
    }
    c.station = Math.max(FB.stationOf(c), h.privileges.length ? 4 : 3);
    news(s, 'news.abbey.elected', h, c);
  }
  FB.seekAbbeyAppointment = function (s, h, c) {
    c = c || me(s);
    const q = FB.abbeyAppointmentStatus(s, h, c);
    if (!q.ready) return false;
    h = h || newHouse(s, false);
    h.petitions[c.id] = s.turn;
    const accepted = FB.chance(q.chance);
    if (accepted) { install(s, h, c); s.player.prestige += cfg().electionPrestige; }
    else news(s, 'news.abbey.election_refused', h, c);
    return { accepted:accepted, house:h };
  };
  FB.abbeyEndowmentStatus = function (s, h, group) {
    const missing = [];
    check(FB.abbeyAccess(s) && available(s, me(s)), FB.T('An available Catholic donor'), missing);
    check(houses(s).indexOf(h) >= 0, FB.T('An existing religious house'), missing);
    let cost = cfg().donation;
    let actual = null;
    if (group) {
      cost = 0;
      actual = FB.landBreakdown(s).filter(function (g) {
        return g.provinceId === group.provinceId && g.settlement === group.settlement && g.count === group.count;
      })[0];
      check(!!actual, FB.T('The reviewed plots must still belong to the family'), missing);
      check(actual && !FB.financeCollateralPledged(s, 'land', group.provinceId + ':' + group.settlement), FB.T('Unpledged family land'), missing);
    } else check(s.player.gold >= cost, FB.T('Requires {money:cost}', { cost:cost }), missing);
    return status(missing, { cost:cost, group:actual });
  };
  FB.endowAbbey = function (s, h, group) {
    const q = FB.abbeyEndowmentStatus(s, h, group);
    if (!q.ready) return false;
    s.player.gold -= q.cost;
    if (q.group) {
      const g = q.group;
      s.player.landPlots = FB.landPlots(s).filter(function (plot) {
        return plot.provinceId !== g.provinceId || plot.settlement !== g.settlement;
      });
      const owned = h.plots.filter(function (plot) {
        return plot.provinceId === g.provinceId && plot.settlement === g.settlement;
      })[0];
      if (owned) owned.count += g.count;
      else h.plots.push({ provinceId:g.provinceId, settlement:g.settlement, count:g.count });
      const manor = s.player.manor;
      if (manor && manor.provinceId === g.provinceId && manor.settlement === g.settlement) {
        s.player.manor = null;
        if (s.player.tier === 2 && !s.player.flags.abbot) FB.setPlayerTier(s, 1);
      }
    } else h.capital += q.cost;
    h.support = Math.min(100, h.support + cfg().endowmentSupport);
    s.player.piety += cfg().endowmentPiety;
    news(s, 'news.abbey.endowed', h);
    return true;
  };
  function controller(s, h) { return !!(houses(s).indexOf(h) >= 0 && h.holderId === s.player.charId && available(s, me(s))); }
  function sponsorOf(s, c) {
    const ids = [c.fatherId, c.motherId];
    for (const id of ids) if (s.chars[id] && !s.chars[id].dead) return id;
    const ruler = c.royalLine && FB.realmRulerCharacterSnapshot(s, c.royalLine.realmId);
    return ruler && ruler.id !== c.id ? ruler.id : c.id;
  }
  FB.abbeyResidentStatus = function (s, h, c, kind) {
    if (houses(s).indexOf(h) < 0) return status([FB.T('An existing religious house')]);
    const missing = [];
    check(controller(s, h), FB.T('The acting abbess must be available'), missing);
    check(c && catholic(s, c) && c.sex === 'f' && c.id !== s.player.charId, FB.T('A living Catholic woman or girl'), missing);
    check(c && FB.stationOf(c) >= 2, FB.T('A noble family'), missing);
    check(c && !FB.isHouseholdCharacter(s, c.id) && !FB.realmIdForRulerCharacter(s, c), FB.T('A guest from another household, without a ruling office'), missing);
    check(c && available(s, c) && unmarried(s, c) && !c.abbeyVows && !FB.abbeyOf(s, c) && !FB.abbeyResidentHouse(s, c.id), FB.T('Available for a temporary stay'), missing);
    check(c && (!c.career || ['monk', 'priest'].indexOf(c.career.profession) < 0), FB.T('A lay resident'), missing);
    const age = c ? FB.ageOf(c, s.date.year) : 0;
    check(kind === 'pupil' ? age >= 6 && age < 16 : (kind === 'guest' || kind === 'refuge') && age >= 16, FB.T('Pupils are ages 6–15; adult guests are at least 16'), missing);
    check(c && FB.characterResidence(s, c) === h.provinceId, FB.T('A resident of this county'), missing);
    check(h.residents.length < cfg().residentCapacity + h.privileges.length, FB.T('An available resident place'), missing);
    check(h.treasury >= cfg().residentUpkeep, FB.T('Funds for the first season of hospitality'), missing);
    const last = c && h.invitations[c.id];
    check(last === undefined || s.turn - last >= cfg().invitationCooldown, FB.T('Wait {days} days between invitations to this person', { days:cfg().invitationCooldown }), missing);
    const sponsor = c && sponsorOf(s, c);
    return status(missing, { sponsorId:sponsor, chance:FB.clamp(0.65 + standing(s, sponsor) / 250, 0.25, 0.9),
      days:kind === 'pupil' ? cfg().pupilDays : cfg().guestDays, cost:cfg().residentUpkeep });
  };
  function connection(h, id) {
    if (!id) return;
    const old = h.connections.filter(function (r) { return r.charId === id; })[0];
    if (!old) {
      if (h.connections.length >= 16) h.connections.shift();
      h.connections.push({ charId:id });
    }
  }
  FB.inviteAbbeyResident = function (s, h, c, kind) {
    const q = FB.abbeyResidentStatus(s, h, c, kind);
    if (!q.ready) return false;
    h.invitations[c.id] = s.turn;
    const accepted = FB.chance(q.chance);
    if (accepted) {
      h.residents.push({ charId:c.id, sponsorId:q.sponsorId, kind:kind, endTurn:s.turn + q.days });
      connection(h, q.sponsorId);
      adjust(s, q.sponsorId, 5);
      if (kind === 'refuge') {
        const l = lord(s, h);
        if (l && !l.dead && l.id !== q.sponsorId && l.id !== s.player.charId) {
          adjust(s, l.id, -cfg().refugeStanding);
          h.dispute = { lordId:l.id, turn:s.turn };
        }
      }
      news(s, 'news.abbey.resident', h, c);
    } else news(s, 'news.abbey.invitation_refused', h, c);
    return { accepted:accepted };
  };
  FB.dismissAbbeyResident = function (s, h, id) {
    if (!controller(s, h)) return false;
    const r = h.residents.filter(function (row) { return row.charId === id; })[0];
    if (!r) return false;
    adjust(s, r.sponsorId, -cfg().dismissStanding);
    h.residents.splice(h.residents.indexOf(r), 1);
    news(s, 'news.abbey.departed', h, s.chars[id]);
    return true;
  };
  FB.abbeyActionStatus = function (s, h, id) {
    if (houses(s).indexOf(h) < 0) return status([FB.T('An existing religious house')]);
    const d = cfg().actions[id];
    const missing = [];
    check(controller(s, h), FB.T('The acting abbess must be available'), missing);
    check(!!d, FB.T('A recognized abbey action'), missing);
    if (!d) return status(missing);
    check(h.treasury >= d.cost, FB.T('Abbey treasury needs {money:cost}', { cost:d.cost }), missing);
    const left = Math.max(0, (h.cooldowns[id] === undefined ? -Infinity : h.cooldowns[id]) + d.days - s.turn);
    check(!left, FB.T('{days} days remaining', { days:left }), missing);
    if (id === 'defend' || id === 'concede') check(!!h.dispute, FB.T('An unresolved dispute'), missing);
    if (id === 'school') check(h.residents.some(function (r) { return r.kind === 'pupil'; }), FB.T('At least one pupil'), missing);
    if (id === 'patronage') check(h.connections.some(function (r) { return standing(s, r.charId) >= 20; }), FB.T('A living connected patron with Standing 20'), missing);
    return status(missing, { cost:d.cost, days:d.days, chance:id === 'defend'
      ? FB.clamp(0.45 + FB.skillOf(me(s), 'dip') * 0.02 + h.privileges.length * 0.15, 0.25, 0.9) : undefined });
  };
  FB.runAbbeyAction = function (s, h, id) {
    const q = FB.abbeyActionStatus(s, h, id);
    if (!q.ready) return false;
    h.treasury -= q.cost; h.cooldowns[id] = s.turn;
    const d = cfg().actions[id];
    let accepted = true;
    if (id === 'rents') { h.treasury += d.treasury; h.support += d.support; }
    if (id === 'school') {
      h.support += d.support;
      h.residents.forEach(function (r) {
        if (r.kind === 'pupil' && s.chars[r.charId] && !s.chars[r.charId].dead) FB.gainSkill(s.chars[r.charId], 'lea', d.learning);
      });
    }
    if (id === 'relief') { h.support += d.support; FB.applyEffects(s, { popularOpinion:d.popular, piety:d.piety }); }
    if (id === 'mediate') {
      h.support += d.support; s.player.prestige += d.prestige;
      h.connections.forEach(function (r) { adjust(s, r.charId, d.standing); });
      if (h.dispute) { adjust(s, h.dispute.lordId, d.lordStanding); delete h.dispute; }
    }
    if (id === 'patronage') {
      /* The gift is a bounded institutional subscription, not a debit from
         an invented private treasury belonging to the named contact. */
      h.capital += d.capital; s.player.prestige += d.prestige;
      h.connections.forEach(function (r) { if (standing(s, r.charId) >= 20) adjust(s, r.charId, d.standing); });
    }
    if (id === 'defend') {
      accepted = FB.chance(q.chance);
      h.support += accepted ? d.support : d.failSupport;
      adjust(s, h.dispute.lordId, accepted ? d.lordStanding : d.failLordStanding);
      if (!accepted) h.treasury = Math.max(0, h.treasury - d.failLoss);
      delete h.dispute;
    }
    if (id === 'concede') { adjust(s, h.dispute.lordId, d.lordStanding); h.support += d.support; delete h.dispute; }
    h.support = FB.clamp(h.support, 0, 100);
    const messages = {
      rents:'news.abbey.rents',
      school:'news.abbey.school',
      relief:'news.abbey.relief',
      mediate:'news.abbey.mediate',
      patronage:'news.abbey.patronage',
      defend:'news.abbey.defend',
      concede:'news.abbey.concede'
    };
    const message = messages[id];
    news(s, message, h);
    return { accepted:accepted };
  };
  FB.abbeyPrivilegeStatus = function (s, h, id) {
    if (houses(s).indexOf(h) < 0) return status([FB.T('An existing religious house')]);
    const missing = [];
    const authority = id === 'royal' ? sovereign(s, h) : pope(s);
    check(controller(s, h), FB.T('The acting abbess must be available'), missing);
    check(id === 'royal' || id === 'papal', FB.T('A recognized privilege'), missing);
    check(h.privileges.indexOf(id) < 0, FB.T('Privilege already granted'), missing);
    check(id !== 'papal' || h.privileges.indexOf('royal') >= 0, FB.T('Royal protection'), missing);
    check(authority && !authority.dead && authority.id !== s.player.charId, FB.T('A living external granting authority'), missing);
    check(s.turn - h.appointedTurn >= 360, FB.T('One year governing this house'), missing);
    check(h.support >= 60, FB.T('Community support 60'), missing);
    check(s.player.piety >= 160 && s.player.prestige >= 80, FB.T('160 piety and 80 prestige'), missing);
    check(h.treasury >= cfg().privilegeCost, FB.T('Abbey treasury needs {money:cost}', { cost:cfg().privilegeCost }), missing);
    const last = h.cooldowns['privilege_' + id];
    check(last === undefined || s.turn - last >= 720, FB.T('Two years between privilege petitions'), missing);
    return status(missing, { authority:authority, cost:cfg().privilegeCost,
      chance:FB.clamp(0.4 + FB.skillOf(me(s), 'dip') * 0.02 + standing(s, authority && authority.id) / 250, 0.2, 0.9) });
  };
  FB.seekAbbeyPrivilege = function (s, h, id) {
    const q = FB.abbeyPrivilegeStatus(s, h, id);
    if (!q.ready) return false;
    h.treasury -= q.cost; h.cooldowns['privilege_' + id] = s.turn;
    const accepted = FB.chance(q.chance);
    if (accepted) {
      h.privileges.push(id); me(s).station = Math.max(4, FB.stationOf(me(s)));
      s.player.prestige += cfg().privilegePrestige;
      news(s, 'news.abbey.privilege', h);
    } else news(s, 'news.abbey.privilege_refused', h);
    return { accepted:accepted };
  };
  FB.releaseAbbeyOffice = function (s, c) {
    const h = houses(s).filter(function (row) { return row.holderId === c.id; })[0];
    if (!h) return false;
    const only = c.id === s.player.charId && !(s.player.provs || []).length &&
      !(FB.directSettlements && FB.directSettlements(s).length) &&
      !(FB.castellanyOf && FB.castellanyOf(s));
    h.holderId = null; h.vacancyTurn = s.turn;
    if (only && s.player.tier === 3) {
      FB.setPlayerTier(s, 2, { attachLiege:false });
      if (FB.validateFocus) FB.validateFocus(s);
    }
    return true;
  };
  FB.activateAbbeyForPlayer = function (s, c, restoring) {
    const h = FB.abbeyOf(s, c);
    if (!h) return;
    s.player.flags.abbot = 1;
    if (s.player.tier < 3) {
      if (restoring) s.player.tier = 3;
      else FB.setPlayerTier(s, 3, { stationFarewell:false });
    }
    c.station = Math.max(FB.stationOf(c), h.privileges.length ? 4 : 3);
  };
  FB.abbeySeason = function (s) {
    houses(s).forEach(function (h) {
      if (h.lastSeason === s.turn) return;
      h.lastSeason = s.turn;
      const holder = s.chars[h.holderId];
      if (h.holderId && (!holder || !catholic(s, holder))) {
        if (holder) FB.releaseAbbeyOffice(s, holder);
        else { h.holderId = null; h.vacancyTurn = s.turn; }
      }
      const f = FB.abbeyFinance(s, h);
      const supported = h.treasury + f.revenue >= f.upkeep;
      h.treasury = Math.max(0, h.treasury + f.balance);
      if (!supported) h.support = Math.max(0, h.support - 8);
      h.residents = h.residents.filter(function (r) {
        const c = s.chars[r.charId];
        if (!c || c.dead) return false;
        if (s.turn >= r.endTurn || !supported || !unmarried(s, c) || FB.realmIdForRulerCharacter(s, c)) {
          if (supported && s.turn >= r.endTurn) { adjust(s, r.sponsorId, 8); adjust(s, c.id, 5); }
          news(s, 'news.abbey.departed', h, c);
          return false;
        }
        if (supported) adjust(s, r.sponsorId, 2);
        return true;
      });
      const recentPetition = Object.keys(h.petitions).some(function (id) {
        return s.chars[id] && !s.chars[id].dead &&
          s.turn - h.petitions[id] < cfg().electionCooldown + 90;
      });
      if (!h.holderId && !recentPetition && s.turn - h.vacancyTurn >= cfg().vacancyDays) {
        const c = FB.makeCharacter(s, { sex:'f', culture:h.culture, religion:h.religion,
          born:s.date.year - 40, dyn:null });
        c.skills.lea = 12; c.career = { profession:'monk', rank:'master', experience:20,
          startedYear:s.date.year - 20, chosen:true, guildRank:'none', guildStanding:0 };
        install(s, h, c);
      }
      const l = lord(s, h);
      if (h.holderId === s.player.charId && !h.dispute && l && l.id !== s.player.charId &&
          s.turn - h.lastDispute >= 360 && h.support < 60) {
        h.lastDispute = s.turn;
        if (FB.chance(h.privileges.length ? 0.08 : 0.2)) {
          h.dispute = { lordId:l.id, turn:s.turn };
          news(s, 'news.abbey.encroachment', h);
        }
      }
      h.connections = h.connections.filter(function (r) { return s.chars[r.charId] && !s.chars[r.charId].dead; });
      ['petitions', 'invitations'].forEach(function (key) {
        Object.keys(h[key]).forEach(function (id) {
          if (!s.chars[id] || s.chars[id].dead || s.turn - h[key][id] >= 720) delete h[key][id];
        });
      });
    });
  };
  FB.repairAbbeys = function (s) {
    if (!s.abbeys) return;
    if (!Array.isArray(s.abbeys.houses)) { delete s.abbeys; return; }
    const playerHeldOffice = s.abbeys.houses.some(function (h) { return h && h.holderId === s.player.charId; });
    const seen = {}, holders = {}, residents = {};
    s.abbeys.houses = s.abbeys.houses.filter(function (h) {
      if (!h || !FB.world.byId[h.provinceId] || seen[h.provinceId]) return false;
      seen[h.provinceId] = true;
      h.id = 'abbey:' + h.provinceId;
      if (typeof h.religion !== 'string' || !FB.faithHasSystem(h.religion, 'papacy', s)) h.religion = 'catholic';
      if (typeof h.culture !== 'string') h.culture = me(s).culture;
      if (typeof h.patronDyn !== 'string') h.patronDyn = null;
      ['capital','rents','treasury','support','foundedTurn','lastSeason','lastDispute','appointedTurn'].forEach(function (key) {
        h[key] = Math.max(0, Number(h[key]) || 0);
        if (!isFinite(h[key])) h[key] = 0;
      });
      h.support = Math.min(100, h.support);
      h.privileges = Array.isArray(h.privileges) ? ['royal','papal'].filter(function (id) { return h.privileges.indexOf(id) >= 0; }) : [];
      h.plots = Array.isArray(h.plots) ? h.plots.filter(function (g) {
        return g && FB.world.byId[g.provinceId] && Number.isInteger(g.settlement) && g.settlement >= 0 && Number.isInteger(g.count) && g.count > 0;
      }) : [];
      ['cooldowns','petitions','invitations'].forEach(function (key) {
        if (!h[key] || typeof h[key] !== 'object' || Array.isArray(h[key])) h[key] = {};
        Object.keys(h[key]).forEach(function (id) {
          if (typeof h[key][id] !== 'number' || !isFinite(h[key][id]) || h[key][id] < 0) delete h[key][id];
        });
      });
      const c = s.chars[h.holderId];
      if (!c || !catholic(s, c) || c.sex !== 'f' || holders[c.id]) {
        h.holderId = null;
        if (typeof h.vacancyTurn !== 'number' || !isFinite(h.vacancyTurn) || h.vacancyTurn < 0) h.vacancyTurn = s.turn;
      }
      else { holders[c.id] = true; c.abbeyVows = true; }
      h.residents = Array.isArray(h.residents) ? h.residents.filter(function (r) {
        if (!r || !s.chars[r.charId] || s.chars[r.charId].dead || residents[r.charId] || holders[r.charId] ||
            typeof r.endTurn !== 'number' || !isFinite(r.endTurn) || r.endTurn <= s.turn ||
            ['pupil','guest','refuge'].indexOf(r.kind) < 0) return false;
        residents[r.charId] = true; return true;
      }).slice(0, cfg().residentCapacity + h.privileges.length) : [];
      h.connections = Array.isArray(h.connections) ? h.connections.filter(function (r) { return r && s.chars[r.charId]; }).slice(-16) : [];
      if (h.dispute && !s.chars[h.dispute.lordId]) delete h.dispute;
      return true;
    }).slice(0, cfg().maxHouses);
    if (playerHeldOffice && !FB.abbeyOf(s) && s.player.tier === 3 &&
        !(s.player.provs || []).length && !FB.directSettlements(s).length && !FB.castellanyOf(s)) {
      /* Repair before legacy barony migration. Load must not award a secular
         title or run promotion side effects for a vacated religious office. */
      s.player.tier = 2;
      if (me(s) && !me(s).dead) me(s).station = 2;
    }
    FB.activateAbbeyForPlayer(s, me(s), true);
  };
})();
