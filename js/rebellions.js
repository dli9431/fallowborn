/* Fallowborn -- county revolts, armed rebels, and negotiated settlements. */
window.FB = window.FB || {};
(function () {
  'use strict';
  function balance(key, fallback) {
    var value = Number(FBDATA.balance[key]);
    return isFinite(value) ? value : fallback;
  }
  function store(state) {
    if (!state.rebellions || typeof state.rebellions !== 'object') state.rebellions = {};
    var out = state.rebellions;
    ['groups', 'warnings', 'cooldowns'].forEach(function (key) {
      if (!out[key] || typeof out[key] !== 'object' || Array.isArray(out[key])) out[key] = {};
    });
    return out;
  }
  var noGroups = {};
  function groups(state) { return state.rebellions && state.rebellions.groups || noGroups; }
  function countyName(pid) { return FB.world.byId[pid].name; }
  function notice(state, key, text, params) {
    FB.news(state, FB.msg('news.rebellion.' + key, text, params));
  }
  FB.rebellionById = function (state, id) { return groups(state)[id] || null; };
  var indexState = null, indexGroups = null, indexRevision = -1, indexCounties = {}, indexRealms = {};
  function invalidateIndex() { indexState = null; }
  function index(state) {
    var rows = groups(state), revision = FB.realmStateRevision();
    if (indexState === state && indexGroups === rows && indexRevision === revision) return;
    indexState = state; indexGroups = rows; indexRevision = revision;
    indexCounties = {}; indexRealms = {};
    for (var id in rows) {
      indexRealms[rows[id].target] = true;
      for (var pid in rows[id].counties) {
        indexCounties[pid] = rows[id];
        if (state.holder[pid]) indexRealms[state.holder[pid]] = true;
        if (state.owner[pid]) indexRealms[state.owner[pid]] = true;
      }
    }
  }
  FB.countyInOpenRevolt = function (state, pid) { index(state); return indexCounties[pid] || null; };
  FB.realmHasRebellion = function (state, rid) { index(state); return !!indexRealms[rid]; };
  function targetOf(state, pid) {
    var holder = state.holder[pid] || state.owner[pid];
    return holder === 'player' || (holder && FB.liegeChain(state, holder).indexOf('player') >= 0)
      ? 'player' : state.owner[pid];
  }
  function supportUnits(state, pid) {
    return 1 + Math.max(0, -FB.countyPopularSupport(state, pid) - 20) / 20;
  }
  FB.revoltResponseTerms = function (state, counties, rulerId) {
    counties = (counties || []).filter(function (pid, i, ids) {
      return FB.world.byId[pid] && ids.indexOf(pid) === i;
    });
    var units = counties.reduce(function (sum, pid) { return sum + supportUnits(state, pid); }, 0);
    var severity = units / Math.max(1, counties.length);
    var player = !rulerId || rulerId === 'player';
    var ruler = player ? state.chars[state.player.charId] : FB.realmRulerCharacterSnapshot(state, rulerId);
    var dip = ruler ? FB.skillOf(ruler, 'dip') : 0;
    var goldShare = player ? Math.ceil(Math.max(0, state.player.gold) * balance('revoltGoldShare', 0.2)) : 0;
    var prestige = player ? Math.ceil(Math.max(0, state.player.prestige) * balance('revoltPrestigeShare', 0.1)) : 0;
    return { counties:counties, units:units, severity:severity, prestige:prestige,
      concede:Math.ceil(balance('revoltConcessionGold', 180) * units) + goldShare,
      negotiate:Math.ceil(balance('revoltNegotiationGold', 120) * units) + goldShare,
      suppress:Math.ceil(balance('revoltSuppressionGold', 150) * units) + goldShare,
      negotiationChance:FB.clamp(0.30 + dip * 0.04 - 0.05 * (severity - 1), 0.1, 0.9),
      suppressionChance:FB.clamp(0.65 - 0.05 * (severity - 1), 0.1, 0.65) };
  };
  function responseCounties(state, ctx) {
    if (ctx && ctx.localCountyIds) return ctx.localCountyIds;
    var row = state.collectiveDemands && state.collectiveDemands.uprising;
    var group = row && row.rebellionId && FB.rebellionById(state, row.rebellionId);
    var counties = (row && row.countyIds || []).slice();
    if (group) Object.keys(group.counties).forEach(function (pid) {
      if (counties.indexOf(pid) < 0) counties.push(pid);
    });
    return counties;
  }
  function terms(state, ctx) { return FB.revoltResponseTerms(state, responseCounties(state, ctx), 'player'); }
  function settlement(state, pid) {
    FB.addModifier(state, 'uprising_settlement', pid, { silent:true });
  }
  function aiExpense(state, pid, action) {
    var days = Math.ceil(360 * supportUnits(state, pid) * (action === 'concede' ? 1.5 : 1));
    FB.addModifier(state, 'uprising_response_cost', pid, { silent:true });
    var record = FB.countyModifierRecords(state, pid).filter(function (r) { return r.id === 'uprising_response_cost'; })[0];
    if (record) record.endTurn = state.turn + Math.min(3600, days);
  }
  function pay(state, ctx, action) {
    if (!FB.fns.commons_uprising_valid(state, ctx)) return false;
    var quote = terms(state, ctx);
    if (!quote.counties.length || state.player.gold < quote[action]) return false;
    state.player.gold -= quote[action];
    state.player.prestige -= quote.prestige;
    return true;
  }
  var textParams = FB.textParams;
  FB.textParams = function (state, viewer, source, ctx, semantic) {
    var out = textParams(state, viewer, source, ctx, semantic);
    if (state && ctx && ctx.uprisingId) {
      var quote = terms(state, ctx);
      out.revoltConcessionGold = quote.concede;
      out.revoltNegotiationGold = quote.negotiate;
      out.revoltSuppressionGold = quote.suppress;
      out.revoltPrestige = quote.prestige;
      out.revoltNegotiationChance = Math.round(quote.negotiationChance * 100);
      out.revoltSuppressionChance = Math.round(quote.suppressionChance * 100);
    }
    return out;
  };
  var namedChance = FB.namedChance;
  FB.namedChance = function (state, key, ctx) {
    if (key === 'revolt_negotiation') return terms(state, ctx).negotiationChance;
    if (key === 'revolt_suppression') return terms(state, ctx).suppressionChance;
    return namedChance(state, key, ctx);
  };
  var optionStatus = FB.eventOptionStatus;
  FB.eventOptionStatus = function (state, ev, option, ctx) {
    var result = optionStatus(state, ev, option, ctx);
    var custom = option && option.effects && option.effects.custom;
    var action = custom === 'commons_uprising_buy_concession' ? 'concede' :
      custom === 'commons_uprising_pay_negotiation' ? 'negotiate' :
      custom === 'commons_uprising_pay_suppression' ? 'suppress' : null;
    if (action && !result.techLocked) {
      var cost = terms(state, ctx)[action];
      result.visible = true;
      result.ready = result.ready && state.player.gold >= cost;
      if (state.player.gold < cost) result.reason = FB.T('Requires {money:cost}.', { cost:cost });
    }
    return result;
  };
  ['negotiation', 'suppression'].forEach(function (kind) {
    var action = kind === 'negotiation' ? 'negotiate' : 'suppress';
    FB.fns['commons_uprising_pay_' + kind] = function (state, ctx) { return pay(state, ctx, action); };
  });
  function responsePreview(action) {
    return { preview:function (state, ctx) {
      var quote = terms(state, ctx);
      return [{ type:'gold', amount:-quote[action] }, { type:'prestige', amount:-quote.prestige }];
    }, report:function () { return []; } };
  }
  FB.eventImpactAdapters.commons_uprising_pay_negotiation = responsePreview('negotiate');
  FB.eventImpactAdapters.commons_uprising_pay_suppression = responsePreview('suppress');
  ['concede', 'local_settle', 'suppress'].forEach(function (action) {
    var adapter = FB.eventImpactAdapters['commons_uprising_' + action];
    FB.eventImpactAdapters['commons_uprising_' + action] = {
      preview:function (state, ctx) {
        var out = adapter.preview(state, ctx);
        if (!out.length) return out;
        if (action === 'suppress') out.push({ type:'commonVoice', amount:-20 });
        else responseCounties(state, ctx).forEach(function (pid) {
          out.push({ type:'modifier', action:'add', id:'uprising_settlement', pid:pid });
        });
        return out;
      }, report:adapter.report
    };
  });
  FB.eventImpactAdapters.commons_uprising_buy_concession = {
    preview:function (state, ctx) {
      return responsePreview('concede').preview(state, ctx).concat(
        FB.eventImpactAdapters.commons_uprising_concede.preview(state, ctx));
    }, report:FB.eventImpactAdapters.commons_uprising_concede.report
  };

  function finish(state, group, reason) {
    var saved = store(state);
    (state.armies || []).slice().forEach(function (host) {
      if (host.rebellionId === group.id) FB.disbandArmy(state, host);
    });
    Object.keys(group.counties).forEach(function (pid) {
      FB.removeModifier(state, 'commons_uprising', pid, { notice:false });
      saved.cooldowns[pid] = state.turn + 720;
      delete saved.warnings[pid];
    });
    delete saved.groups[group.id];
    delete state.realms[group.faction];
    if (state.armyCohorts) delete state.armyCohorts[group.faction];
    if (state.armyDown) delete state.armyDown[group.faction];
    if (state.armyDetachmentDown) delete state.armyDetachmentDown[group.faction];
    invalidateIndex();
    var row = state.collectiveDemands && state.collectiveDemands.uprising;
    if (row && row.rebellionId === group.id) {
      state.collectiveDemands.uprising = null;
      state.collectiveDemands.uprisingCooldownUntil = state.turn + 720;
    }
    FB.invalidateRealmCache();
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
    notice(state, 'ended', { forms:{ select:'value', param:'reason', cases:{
      independence:'The uprising in {county} ends with independence.',
      concession:'The uprising in {county} ends in a negotiated settlement.',
      other:'The rebel hosts in {county} are defeated. Occupation ends; resentment remains, with a two-year revolt cooldown.'
    } } }, { county:Object.keys(group.counties).map(countyName).join(', '), reason:reason });
  }
  function settleOpenCounties(state, counties) {
    var rows = groups(state);
    Object.keys(rows).forEach(function (id) {
      var row = rows[id];
      var affected = Object.keys(row.counties).filter(function (pid) { return counties.indexOf(pid) >= 0; });
      if (!affected.length) return;
      // A merged host represents every county in its uprising. A military peace
      // therefore requires terms covering the full group, never a cheap local exit.
      if (affected.length === Object.keys(row.counties).length) finish(state, row, 'concession');
    });
  }
  var concede = FB.fns.commons_uprising_concede;
  FB.fns.commons_uprising_concede = function (state, ctx) {
    var counties = responseCounties(state, ctx).slice();
    if (!concede(state, ctx)) return false;
    counties.forEach(function (pid) { settlement(state, pid); });
    settleOpenCounties(state, counties);
    return true;
  };
  FB.fns.commons_uprising_buy_concession = function (state, ctx) {
    if (!FB.fns.commons_uprising_valid(state, ctx)) return false;
    var quote = terms(state, ctx);
    if (state.player.gold < quote.concede) return false;
    if (!FB.fns.commons_uprising_concede(state, ctx)) return false;
    state.player.gold -= quote.concede;
    state.player.prestige -= quote.prestige;
    return true;
  };
  var suppress = FB.fns.commons_uprising_suppress;
  FB.fns.commons_uprising_suppress = function (state, ctx) {
    var counties = responseCounties(state, ctx).slice();
    if (!suppress(state, ctx)) return false;
    counties.forEach(function (pid) { FB.adjustCountySupport(state, pid, -20); });
    Object.keys(groups(state)).forEach(function (id) {
      var group = groups(state)[id];
      if (Object.keys(group.counties).every(function (pid) { return counties.indexOf(pid) >= 0; })) finish(state, group, 'defeat');
    });
    return true;
  };
  FB.fns.commons_uprising_suppression_failed = function (state, ctx) {
    if (!FB.fns.commons_uprising_valid(state, ctx)) return false;
    responseCounties(state, ctx).forEach(function (pid) { FB.adjustCountySupport(state, pid, -30); });
    return FB.fns.commons_uprising_endure(state, ctx);
  };
  FB.eventImpactAdapters.commons_uprising_suppression_failed = {
    preview:function (state, ctx) {
      return FB.eventImpactAdapters.commons_uprising_endure.preview(state, ctx).concat([{ type:'commonVoice', amount:-30 }]);
    }, report:function () { return []; }
  };
  FB.applyRevoltLocalSettlement = function (state, rid, counties, success) {
    if (rid !== 'player') counties.forEach(function (pid) { aiExpense(state, pid, 'negotiate'); });
    if (success) {
      counties.forEach(function (pid) { settlement(state, pid); });
      settleOpenCounties(state, counties);
    }
  };
  FB.localRevoltResponseAllowed = function (state, counties) {
    return counties.every(function (pid) {
      var group = FB.countyInOpenRevolt(state, pid);
      return !group || Object.keys(group.counties).every(function (id) { return counties.indexOf(id) >= 0; });
    });
  };
  FB.rebelLevySize = function (state, pid) {
    // Potential population levy, before support and refusal suppress recruitment.
    var maximum = (state.dev[pid] || 1) * (FB.countyPopulationFactor ? FB.countyPopulationFactor(state, pid) : 1) * FBDATA.balance.levyPerDev;
    maximum += buildingBonusIn ? buildingBonusIn(state, pid, 'levy') : 0;
    return Math.max(1, Math.floor(maximum * FB.clamp(-FB.countyPopularSupport(state, pid) / 100, 0.5, 1)));
  };
  function join(state, group, pid, muster) {
    if (!group.counties[pid]) group.counties[pid] = { joinedTurn:state.turn, progress:0 };
    var county = group.counties[pid];
    invalidateIndex();
    if (muster && !county.mustered) {
      county.mustered = true;
      var men = FB.rebelLevySize(state, pid);
      state.armies.push({ id:FB.uid(), realm:group.faction, rebellionId:group.id,
        homeCounty:pid, at:pid, from:pid, men:men, size:men, units:{ levy:men },
        moveLeft:0, path:[], goal:null, supply:100 });
      notice(state, 'muster', 'The commons of {county} muster {men} rebels against {realm}.', {
        county:countyName(pid), men:men, realm:state.realms[group.target].name });
    }
    FB.addModifier(state, 'commons_uprising', pid, { silent:true });
    var effect = FB.countyModifierRecords(state, pid).filter(function (r) { return r.id === 'commons_uprising'; })[0];
    if (effect) delete effect.endTurn;
    var row = state.collectiveDemands && state.collectiveDemands.uprising;
    if (row && row.rebellionId === group.id && row.countyIds.indexOf(pid) < 0) {
      row.countyIds.push(pid);
      row.countyStates[pid] = { phase:'active', joinedTurn:state.turn, dueTurn:state.turn + 180 };
      if (row.visitedCountyIds.indexOf(pid) < 0) row.visitedCountyIds.push(pid);
    }
  }
  FB.startOpenRevolt = function (state, pid) {
    if (!FB.world.byId[pid] || FB.countyPopularSupport(state, pid) > balance('revoltArmedSupport', -50)) return null;
    var saved = store(state), target = targetOf(state, pid);
    if (!state.realms[target] || !state.realms[target].alive || (saved.cooldowns[pid] || 0) > state.turn) return null;
    var group = Object.keys(saved.groups).map(function (id) { return saved.groups[id]; }).filter(function (row) { return row.target === target; })[0];
    if (!group) {
      var id = 'rebellion_' + FB.uid(), faction = 'rebels_' + id;
      group = saved.groups[id] = { id:id, faction:faction, target:target, startedTurn:state.turn, counties:{} };
      // Non-sovereign map identity: excluded from diplomacy and seasonal AI.
      state.realms[faction] = { id:faction, alive:false, rebelFaction:true, rank:1,
        name:countyName(pid), capital:pid, color:'#a94032', religion:FB.world.byId[pid].religion,
        ruler:{ name:countyName(pid), mar:0, age:30 }, liege:null };
    }
    join(state, group, pid, true);
    var row = state.collectiveDemands && state.collectiveDemands.uprising;
    if (!row && target === 'player' && state.player.tier >= 4) {
      var demands = state.collectiveDemands || (state.collectiveDemands = {});
      row = demands.uprising = { id:'uprising:' + group.id, stage:'active', scopeId:pid,
        privilegeId:'tax_concession', countyIds:[pid], visitedCountyIds:[pid], countyStates:{},
        protagonistId:state.player.charId, liegeId:state.player.liege || null, startedTurn:state.turn };
      row.countyStates[pid] = { phase:'active', joinedTurn:state.turn, dueTurn:state.turn + 180 };
    }
    if (row && (row.countyIds.indexOf(pid) >= 0 || target === 'player')) {
      row.rebellionId = group.id;
      Object.keys(group.counties).forEach(function (county) {
        if (row.countyIds.indexOf(county) < 0) {
          row.countyIds.push(county);
          row.countyStates[county] = { phase:'active', joinedTurn:state.turn, dueTurn:state.turn + 180 };
          if (row.visitedCountyIds.indexOf(county) < 0) row.visitedCountyIds.push(county);
        }
      });
    }
    FB.invalidateRealmCache();
    if (row && row.rebellionId === group.id && FB.restoreCommonsUprising) FB.restoreCommonsUprising(state);
    if (FB.realmHasRebellion(state, 'player')) FB.raisePlayerHost(state);
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
    return group;
  };
  FB.rebellionWarringRealms = function (state, warring) {
    var rows = groups(state);
    for (var id in rows) {
      var row = rows[id];
      warring[row.target] = row.faction;
      for (var pid in row.counties) {
        if (state.holder[pid]) warring[state.holder[pid]] = row.faction;
        if (state.owner[pid]) warring[state.owner[pid]] = row.faction;
      }
    }
  };
  var hostile = FB.armiesHostile;
  FB.armiesHostile = function (state, a, b) {
    var ar = a.rebellionId || (state.realms[a.realm] && state.realms[a.realm].rebelFaction);
    var br = b.rebellionId || (state.realms[b.realm] && state.realms[b.realm].rebelFaction);
    if (ar || br) return a.realm !== b.realm;
    return hostile(state, a, b);
  };
  // Realm-only sharing is valid for ordinary hosts; rebel hosts opt out below.
  FB.armiesHostile.militaryCacheSafe = hostile.militaryCacheSafe;
  var friendly = FB.armyFriendlyProvince;
  FB.armyFriendlyProvince = function (state, army, pid, relations) {
    var group = FB.countyInOpenRevolt(state, pid);
    if (group && group.counties[pid].occupied) return army.realm === group.faction;
    if (army.rebellionId) return false;
    return friendly(state, army, pid, relations);
  };
  var fortBlocks = FB.fortBlocksArmy;
  FB.fortBlocksArmy = function (state, pid, army, relations) {
    var group = FB.countyInOpenRevolt(state, pid);
    if (army.rebellionId && (group && group.id === army.rebellionId || targetOf(state, pid) === (FB.rebellionById(state, army.rebellionId) || {}).target)) return false;
    return fortBlocks(state, pid, army, army.rebellionId ? null : relations);
  };
  var recruitmentBlocked = FB.recruitmentCountyBlocked;
  FB.recruitmentCountyBlocked = function (state, rid, pid, hosts) {
    var group = FB.countyInOpenRevolt(state, pid);
    if (group && group.counties[pid].occupied && rid !== group.faction) return true;
    return recruitmentBlocked(state, rid, pid, hosts);
  };
  var buildingBonusIn = FB.buildingBonusIn;
  FB.buildingBonusIn = function (state, pid, key) {
    var group = (key === 'tax' || key === 'levy') && FB.countyInOpenRevolt(state, pid);
    if (group && group.counties[pid].occupied) return 0;
    return buildingBonusIn(state, pid, key);
  };
  var modBonus = FB.modBonus;
  FB.modBonus = function (state, key, pid, support, records) {
    if (key === 'tax' || key === 'levy') {
      var group = FB.countyInOpenRevolt(state, pid);
      if (group && group.counties[pid].occupied) return -1;
    }
    return modBonus(state, key, pid, support, records);
  };
  FB.modBonus.militaryCacheSafe = !!modBonus.militaryCacheSafe;
  FB.rebelArmyGoal = function (state, army) {
    var group = FB.rebellionById(state, army.rebellionId);
    if (!group) return army.at;
    if (army.broken !== undefined && state.turn - army.broken < FBDATA.balance.armyRoutDays) return FB.armyRetreatGoal(state, army) || army.at;
    if (group.counties[army.at] && !group.counties[army.at].occupied) {
      var status = FB.fortSiegeStatus(state, army.at, group.counties[army.at], state.armies.filter(function (a) { return a.realm === group.faction && a.at === army.at && a.moveLeft <= 0; }));
      if (status.canProgress) return army.at;
    }
    var allies = state.armies.filter(function (a) { return a.realm === group.faction && a.id !== army.id && a.at !== army.at; });
    if (allies.length) {
      allies.sort(function (a, b) { return b.men - a.men || (String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0); });
      if (allies[0].men > army.men || (allies[0].men === army.men && String(allies[0].id) < String(army.id))) return allies[0].at;
    }
    var targets = Object.keys(group.counties).filter(function (pid) { return !group.counties[pid].occupied; }).sort(function (a, b) {
      if (a === army.homeCounty) return -1; if (b === army.homeCounty) return 1; return a < b ? -1 : a > b ? 1 : 0;
    });
    for (var i = 0; i < targets.length; i++) if (FB.armyHasRouteTo(state, army, targets[i]) || FB.findArmyPath(state, army, targets[i])) return targets[i];
    return army.at;
  };
  FB.rebellionDefenseGoal = function (state, army) {
    if (!FB.realmHasRebellion(state, army.realm)) return null;
    var targets = (state.armies || []).filter(function (a) {
      var row = a.rebellionId && FB.rebellionById(state, a.rebellionId);
      return row && (row.target === army.realm || Object.keys(row.counties).some(function (pid) { return state.holder[pid] === army.realm || state.owner[pid] === army.realm; }));
    }).sort(function (a, b) { return a.men - b.men || (String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0); });
    for (var i = 0; i < targets.length; i++) if (FB.armyHasRouteTo(state, army, targets[i].at) || FB.findArmyPath(state, army, targets[i].at)) return targets[i].at;
    return null;
  };

  function independent(state, group) {
    var remaining = Object.keys(group.counties).sort();
    while (remaining.length) {
      var component = [remaining.shift()];
      for (var i = 0; i < component.length; i++) {
        Object.keys(FB.world.adj[component[i]] || {}).sort().forEach(function (pid) {
          var at = remaining.indexOf(pid);
          if (at >= 0) { remaining.splice(at, 1); component.push(pid); }
        });
      }
      var capital = component[0], id = 'free_' + FB.uid();
      state.realms[id] = { id:id, alive:true, name:countyName(capital), capital:capital,
        rank:component.length > 1 ? 2 : 1, color:'#a96f42', aggression:0.5,
        religion:FB.countyReligion ? FB.countyReligion(state, capital) : FB.world.byId[capital].religion,
        liege:null, war:null, op:0 };
      if (FB.treasuryCreateFromCounties) FB.treasuryCreateFromCounties(state, id, component);
      if (FB.mergeRealmTech) FB.mergeRealmTech(state, id, group.target);
      component.forEach(function (pid) { FB.transferProvince(state, pid, id); });
      FB.ensureRealmSuccession(state, id);
      // The new polity uses its capital's proper name and the normal rank label.
      notice(state, 'independence', 'The rebel counties of {counties} become independent under a new ruler.', { counties:component.map(countyName).join(', ') });
    }
    if (state.player.tier >= 4 && !state.player.provs.length && FB.loseAllLand) FB.loseAllLand(state);
    finish(state, group, 'independence');
  }
  FB.rebellionsAfterArmies = function (state) {
    var rows = groups(state);
    Object.keys(rows).forEach(function (id) {
      var group = rows[id];
      var hosts = (state.armies || []).filter(function (a) { return a.rebellionId === id && a.men > 0; });
      if (!hosts.length) { finish(state, group, 'defeat'); return; }
      var byCounty = {};
      hosts.forEach(function (a) {
        if (!byCounty[a.at]) byCounty[a.at] = a;
        else if (a.moveLeft <= 0 && byCounty[a.at].moveLeft <= 0) byCounty[a.at] = FB.mergeHosts(state, byCounty[a.at], a);
      });
      Object.keys(group.counties).forEach(function (pid) {
        var record = group.counties[pid];
        if (targetOf(state, pid) !== group.target) { FB.removeModifier(state, 'commons_uprising', pid, { notice:false }); delete group.counties[pid]; invalidateIndex(); return; }
        var here = state.armies.filter(function (a) { return a.at === pid && a.men > 0 && a.moveLeft <= 0 && (a.broken === undefined || state.turn - a.broken >= FBDATA.balance.armyRoutDays); });
        var rebels = here.filter(function (a) { return a.rebellionId === id; });
        var others = here.filter(function (a) { return a.rebellionId !== id; });
        if (rebels.length && !others.length && !record.occupied) {
          if (record.nextPulse === undefined) record.nextPulse = state.turn + 30;
          if (state.turn >= record.nextPulse) {
            var siege = FB.advanceFortSiegePulse(state, pid, record, { hosts:rebels });
            record.nextPulse = state.turn + 30;
            if (siege.breached) {
              record.occupied = true;
              FB.invalidateRealmCache();
              notice(state, 'occupied', 'Rebels occupy {county}. Collection and muster cease until the county is recovered.', { county:countyName(pid) });
              Object.keys(FB.world.adj[pid] || {}).sort().forEach(function (neighbor) {
                if (targetOf(state, neighbor) === group.target && !group.counties[neighbor] &&
                    FB.countyPopularSupport(state, neighbor) < 0 && !FB.hasModifier(state, 'uprising_settlement', neighbor)) join(state, group, neighbor, false);
              });
            }
          }
        } else if (record.occupied && others.length && !rebels.length) {
          if (!record.recovery) record.recovery = { progress:0, nextPulse:state.turn + 30 };
          if (state.turn >= record.recovery.nextPulse) {
            var recovered = FB.advanceFortSiegePulse(state, pid, record.recovery, { hosts:others });
            record.recovery.nextPulse = state.turn + 30;
            if (recovered.breached) { record.occupied = false; record.progress = 0; delete record.recovery; FB.invalidateRealmCache(); }
          }
        } else { delete record.nextPulse; delete record.recovery; }
      });
      var counties = Object.keys(group.counties);
      if (!counties.length) { finish(state, group, 'defeat'); return; }
      if (!(state.armies || []).some(function (host) { return host.rebellionId === id && host.men > 0; })) { finish(state, group, 'defeat'); return; }
      if (counties.every(function (pid) { return group.counties[pid].occupied; })) independent(state, group);
    });
  };

  FB.countyRevoltStatus = function (state, pid) {
    var group = FB.countyInOpenRevolt(state, pid);
    if (group) {
      var county = group.counties[pid];
      return { phase:county.occupied ? 'occupied' : 'armed',
        progress:county.progress || 0,
        required:FB.fortSiegeStatus(state, pid, county, []).required };
    }
    var warning = state.rebellions && state.rebellions.warnings && state.rebellions.warnings[pid];
    return warning ? { phase:warning.phase, days:Math.max(0, warning.dueTurn - state.turn) } : null;
  };
  FB.ensureRebellions = function (state) {
    var saved = store(state);
    Object.keys(saved.groups).forEach(function (id) {
      var group = saved.groups[id];
      if (!group || group.id !== id || !state.realms[group.faction] || !state.realms[group.target] ||
          !group.counties || typeof group.counties !== 'object' || Array.isArray(group.counties)) { delete saved.groups[id]; return; }
      Object.keys(group.counties).forEach(function (pid) {
        var record = group.counties[pid];
        if (!FB.world.byId[pid] || !record || typeof record !== 'object') { delete group.counties[pid]; return; }
        record.progress = Number.isFinite(Number(record.progress)) ? Math.max(0, Number(record.progress)) : 0;
        if (!Number.isFinite(record.joinedTurn)) record.joinedTurn = state.turn;
        if (record.nextPulse !== undefined && !Number.isFinite(record.nextPulse)) delete record.nextPulse;
        if (record.recovery && (!Number.isFinite(record.recovery.progress) || !Number.isFinite(record.recovery.nextPulse))) delete record.recovery;
      });
      if (!Object.keys(group.counties).length) delete saved.groups[id];
    });
    Object.keys(saved.warnings).forEach(function (pid) {
      var row = saved.warnings[pid];
      if (!FB.world.byId[pid] || !row || ['warning', 'active'].indexOf(row.phase) < 0 ||
          !Number.isFinite(row.startedTurn) || !Number.isFinite(row.dueTurn)) delete saved.warnings[pid];
    });
    Object.keys(saved.cooldowns).forEach(function (pid) {
      if (!FB.world.byId[pid] || !Number.isFinite(saved.cooldowns[pid])) delete saved.cooldowns[pid];
    });
    state.armies = (state.armies || []).filter(function (army) { return !army.rebellionId || !!saved.groups[army.rebellionId]; });
    invalidateIndex();
  };
  FB.rebellionsDay = function (state) {
    var saved = store(state), row = state.collectiveDemands && state.collectiveDemands.uprising;
    if (row) (row.countyIds || []).slice().forEach(function (pid) {
      var entry = row.countyStates && row.countyStates[pid];
      if (entry && entry.phase === 'active' && FB.countyPopularSupport(state, pid) <= balance('revoltArmedSupport', -50) && !FB.countyInOpenRevolt(state, pid)) FB.startOpenRevolt(state, pid);
    });
    // One bounded county discovery pass per month, not per daily army query.
    if (saved.nextScan === undefined || state.turn >= saved.nextScan) {
      saved.nextScan = state.turn + 30;
      Object.keys(state.owner).sort().forEach(function (pid) {
        var holder = state.holder[pid] || state.owner[pid];
        if ((row && row.countyIds && row.countyIds.indexOf(pid) >= 0) || holder === 'player' || !state.realms[holder] || !state.realms[holder].alive || saved.warnings[pid] ||
            FB.countyInOpenRevolt(state, pid) || (saved.cooldowns[pid] || 0) > state.turn ||
            FB.hasModifier(state, 'uprising_settlement', pid) || FB.hasPrivilege(state, 'confirmed_custom', pid) ||
            FB.countyPopularSupport(state, pid) > -20) return;
        saved.warnings[pid] = { holder:holder, startedTurn:state.turn, dueTurn:state.turn + 90, phase:'warning' };
        notice(state, 'warning', 'The commons of {county} give their ruler 90 days to settle their grievance.', { county:countyName(pid) });
      });
    }
    Object.keys(saved.groups).forEach(function (id) {
      var group = saved.groups[id];
      Object.keys(group.counties).forEach(function (pid) {
        var county = group.counties[pid];
        if (!county.mustered && state.turn >= county.joinedTurn + 90 && FB.countyPopularSupport(state, pid) <= balance('revoltArmedSupport', -50)) join(state, group, pid, true);
      });
      if (group.target === 'player' || group.responseAttempted || state.turn < group.startedTurn + 30) return;
      group.responseAttempted = true;
      var counties = Object.keys(group.counties), quote = FB.revoltResponseTerms(state, counties, group.target);
      var negotiate = FB.chance(0.5);
      counties.forEach(function (pid) { aiExpense(state, pid, negotiate ? 'negotiate' : 'suppress'); });
      var success = FB.chance(negotiate ? quote.negotiationChance : quote.suppressionChance);
      if (negotiate && success) {
        counties.forEach(function (pid) { settlement(state, pid); FB.addModifier(state, 'tax_concession', pid, { silent:true }); });
        finish(state, group, 'concession');
      } else if (!negotiate) {
        counties.forEach(function (pid) { FB.adjustCountySupport(state, pid, success ? -20 : -30); });
        if (success) finish(state, group, 'defeat');
      }
    });
    if (saved.nextResponse !== undefined && state.turn < saved.nextResponse) return;
    saved.nextResponse = state.turn + 30;
    Object.keys(saved.warnings).sort().forEach(function (pid) {
      var warning = saved.warnings[pid], holder = state.holder[pid] || state.owner[pid];
      if (row && row.countyIds && row.countyIds.indexOf(pid) >= 0) { delete saved.warnings[pid]; return; }
      if (!FB.world.byId[pid] || holder === 'player' || !state.realms[holder] || !state.realms[holder].alive) { delete saved.warnings[pid]; return; }
      if (FB.hasModifier(state, 'uprising_settlement', pid) || (warning.phase === 'warning' && FB.countyPopularSupport(state, pid) > -10)) {
        delete saved.warnings[pid]; return;
      }
      if (!warning.attempted && state.turn >= warning.startedTurn + 30) {
        warning.attempted = true;
        var quote = FB.revoltResponseTerms(state, [pid], holder);
        aiExpense(state, pid, 'negotiate');
        if (FB.chance(quote.negotiationChance)) {
          settlement(state, pid); FB.addModifier(state, 'tax_concession', pid, { silent:true });
          delete saved.warnings[pid];
          notice(state, 'ai_settlement', 'The ruler of {county} accepts costly local concessions to avert revolt.', { county:countyName(pid) });
          return;
        }
      }
      if (warning.phase === 'active' && FB.countyPopularSupport(state, pid) <= balance('revoltArmedSupport', -50) && !FB.countyInOpenRevolt(state, pid)) FB.startOpenRevolt(state, pid);
      if (state.turn < warning.dueTurn) return;
      if (warning.phase === 'warning') {
        warning.phase = 'active'; warning.dueTurn = state.turn + 180;
        FB.addModifier(state, 'commons_uprising', pid, { silent:true });
        if (FB.countyPopularSupport(state, pid) <= balance('revoltArmedSupport', -50)) FB.startOpenRevolt(state, pid);
      } else if (!FB.countyInOpenRevolt(state, pid)) {
        FB.removeModifier(state, 'commons_uprising', pid, { notice:false });
        saved.cooldowns[pid] = state.turn + 720; delete saved.warnings[pid];
      }
    });
  };
})();
