/* Era ladder permissions, overlaid by the subject's government strategy.
   Numeric identities stay saved; only this resolver interprets their order. */
window.FB = window.FB || {};
(function () {
  'use strict';
  var S = FB.station = {}, R = FB.realmRank = {}, C = FB.socialStation = {};
  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function object(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function stateOf(s) { return s === undefined ? FB.state : s; }
  function tierOf(o) { return object(o) ? o.tier : o; }
  function rankOf(o) { return object(o) ? o.rank : o; }
  function socialOf(o) { return object(o) ? FB.stationOf(o) : o; }
  function homeRealm(s, o) {
    if (!s || !o) return null;
    if (s.player && (o === s.player || o.id && o.id === s.player.charId)) {
      if (s.realms && s.realms.player && s.realms.player.alive) return 'player';
      return s.player.liege || s.holder && s.holder[s.player.provinceId] ||
        s.owner && s.owner[s.player.provinceId] || null;
    }
    if (o.id && s.realms && s.realms[o.id] &&
        (s.realms[o.id] === o || o.rank !== undefined)) return o.id;
    if (o.realmId && s.realms && s.realms[o.realmId]) return o.realmId;
    if (o.tier !== undefined && s.player && !(o.id && s.chars && s.chars[o.id]))
      return homeRealm(s, s.player);
    if (o.id && FB.realmIdForRulerCharacter) {
      var rid = FB.realmIdForRulerCharacter(s, o.id);
      if (rid) return rid;
    }
    var pid = o.homeProvinceId || o.provinceId;
    if (!pid && o.id && FB.characterResidence) pid = FB.characterResidence(s, o);
    return pid && (s.holder && s.holder[pid] || s.owner && s.owner[pid]) || null;
  }
  /* Actor queries use station too. Read the authority row without actor
     recursion, cloning, materialization or save repair. */
  function formOf(o, s) {
    if (object(o) && (o.government || o.formId)) return o.government || o.formId;
    var rid = homeRealm(s, object(o) ? o : s && s.player);
    var rows = s && s.authority && s.authority.governments;
    var row = rid && rows && own(rows, rid) && rows[rid];
    return row && row.formId || s && s.start && s.start.defaultGovernment || 'territorial';
  }
  function layers(o, s) {
    s = stateOf(s);
    var eraId = object(o) && o.era || (s && FB.campaignEra ? FB.campaignEra(s) : null);
    var era = eraId && FBDATA.eras && FBDATA.eras[eraId];
    var base = era && era.ladder || FBDATA.stationLadders.feudal;
    var form = FBDATA.governmentForms && FBDATA.governmentForms[formOf(o, s)];
    var overlay = form && form.ladder && FB.governments &&
      FB.governments.strategy('ladder', form.ladder);
    return [base, overlay];
  }
  function atTier(o, tier, s) {
    var context = S.context(o, s);
    return { tier:tier, formId:context.formId, era:context.era };
  }
  function value(o, s, table, index, key) {
    var stack = layers(o, s), answer, active = true;
    for (var i = 0; i < stack.length; i++) {
      var row = stack[i] && stack[i][table] && stack[i][table][index];
      if (row && own(row, key)) answer = row[key];
      if (table === 'bands' && row && own(row, 'used')) active = row.used;
    }
    return table === 'bands' && !active && key !== 'used' ? undefined : answer;
  }
  function band(o, key, s) { return value(o, s, 'bands', tierOf(o), key); }
  function used(o, s) { return band(o, 'used', s) === true; }
  S.bandCount = 8;
  var meanings = ['isSerf','isFreeholder','isGentry','isBaron','isCount','isDuke',
    'isKing','isEmperor','isFree','isGentle','isLanded','isFreeUnlanded',
    'rulesRealm','holdsCounty','sitsInEstates','isDucal','isRoyal','mayHoldCouncil',
    'isImperial','mayCommand','mayAdministerJustice','mayArrangeDynasticMarriage'];
  S.meanings = meanings.slice();
  S.has = function (o, meaning, s) { return band(o, meaning, s) === true; };
  meanings.forEach(function (name) {
    S[name] = function (o, s) { return S.has(o, name, s); };
  });
  S.societalRole = function (o, s) { return band(o, 'role', s); };
  S.reaches = function (o, minTier, s) {
    return minTier === undefined || used(o, s) && !(band(o, 'eligibilityTier', s) < minTier);
  };
  S.exceeds = function (o, maxTier, s) {
    return maxTier !== undefined && (!used(o, s) || band(o, 'eligibilityTier', s) > maxTier);
  };
  S.socialClass = function (o, s) { return band(o, 'socialStation', s); };
  S.realmRank = function (o, s) { return band(o, 'realmRank', s); };
  S.above = function (o, other, s) { return band(o, 'order', s) > band(other, 'order', s); };
  S.higherTier = function (o, other, s) { return tierOf(S.above(o, other, s) ? o : other); };
  S.same = function (o, other) { return tierOf(o) === tierOf(other); };
  S.promotion = function (o, s) { return band(o, 'promotion', s); };
  S.next = function (o, s) {
    var rule = S.promotion(o, s);
    return rule && rule.next !== null && used(atTier(o, rule.next, s), s)
      ? rule.next : null;
  };
  S.lowerSocialClass = function (o, s) {
    var prior = S.previous(o, s);
    return prior === null || prior === undefined ? 0 : S.socialClass(atTier(o, prior, s), s);
  };
  S.previous = function (o, s) { return band(o, 'previous', s); };
  S.succession = function (o, s) { return band(o, 'succession', s); };
  S.tierFor = function (meaning, o, s) {
    for (var tier = 0; tier < S.bandCount; tier++)
      if (S.has(atTier(o, tier, s), meaning, s)) return tier;
    return null;
  };
  S.context = function (o, s) {
    s = stateOf(s);
    return { formId:formOf(o, s), era:object(o) && o.era ||
      (s && FB.campaignEra ? FB.campaignEra(s) : null) };
  };
  S.definition = function (o, s) {
    var stack = layers(o, s), out = { bands:{}, ranks:{}, social:{} };
    Object.keys(out).forEach(function (table) {
      stack.forEach(function (layer) {
        for (var index in layer && layer[table] || {}) if (own(layer[table], index)) {
          var row = out[table][index] = out[table][index] || {};
          for (var field in layer[table][index]) if (own(layer[table][index], field))
            row[field] = layer[table][index][field];
        }
      });
    });
    return out;
  };
  S.titlesValid = function (titles, ladder) {
    if (!object(titles) || !Array.isArray(titles.m) || !Array.isArray(titles.f) ||
        titles.m.length > S.bandCount || titles.f.length > S.bandCount) return false;
    var bands = (ladder || FBDATA.stationLadders.feudal).bands;
    for (var tier = 0; tier < S.bandCount; tier++) {
      var required = bands[tier] && bands[tier].used;
      for (var si = 0; si < 2; si++) {
        var title = titles[si ? 'f' : 'm'][tier];
        if (required || title !== undefined && title !== null)
          if (typeof title !== 'string' || !title) return false;
      }
    }
    return true;
  };
  var ranks = ['isCounty','isDuchy','isKingdom','isEmpire','isTerritorial','isDucal','isRoyal','isImperial'];
  ranks.forEach(function (name) {
    R[name] = function (o, s) { return value(o, s, 'ranks', rankOf(o), name) === true; };
  });
  R.tier = function (o, s, fallback) { return value(o, s, 'ranks', rankOf(o) || fallback || 0, 'tier'); };
  R.above = function (o, other, s) {
    return value(o, s, 'ranks', rankOf(o), 'order') > value(other, s, 'ranks', rankOf(other), 'order');
  };
  R.same = function (o, other) { return rankOf(o) === rankOf(other); };
  R.higherRank = function (o, other, s) { return rankOf(R.above(o, other, s) ? o : other); };
  var social = ['isLowborn','isFree','isGentle','isNoble','isRoyal'];
  social.forEach(function (name) {
    C[name] = function (o, s) { return value(o, s, 'social', socialOf(o), name) === true; };
  });
  C.gap = function (o, other, s) {
    return value(o, s, 'social', socialOf(o), 'order') - value(other, s, 'social', socialOf(other), 'order');
  };
  C.reaches = function (o, min, s) { return min === undefined || C.gap(o, min, s) >= 0; };
  C.exceeds = function (o, max, s) { return max !== undefined && C.gap(o, max, s) > 0; };
  C.same = function (o, other) { return socialOf(o) === socialOf(other); };
  S.validateLadder = function (ladder, label, partial) {
    if (ladder === null || ladder === undefined) return [];
    var errors = [];
    function fault(detail) { errors.push(FB.T('Ladder {label}: {detail}', { label:label, detail:detail })); }
    if (!object(ladder)) { fault(FB.T('Expected a ladder object.')); return errors; }
    var tables = { bands:8, ranks:5, social:5 };
    for (var table in ladder) if (own(ladder, table) && !own(tables, table)) fault(FB.T('Unknown ladder table.'));
    for (var key in tables) {
      var rows = ladder[key];
      if (partial && rows === undefined) continue;
      if (!object(rows) && !Array.isArray(rows)) { fault(FB.T('Missing ladder rows.')); continue; }
      for (var index in rows) if (own(rows, index)) {
        if (!/^\d+$/.test(index) || Number(index) >= tables[key] || !object(rows[index])) {
          fault(FB.T('Invalid ladder row.')); continue;
        }
        var row = rows[index];
        var numeric = key === 'bands' ? ['order','eligibilityTier','socialStation','realmRank','previous'] :
          key === 'ranks' ? ['order','tier'] : ['order'];
        var flags = key === 'bands' ? meanings.concat(['used']) : key === 'ranks' ? ranks : social;
        for (var field in row) if (own(row, field)) {
          if (flags.indexOf(field) >= 0) {
            if (typeof row[field] !== 'boolean') fault(FB.T('Permission flags must be boolean.'));
          } else if (numeric.indexOf(field) >= 0) {
            var n = row[field], limit = field === 'socialStation' || field === 'realmRank' ? 4 : 7;
            if (!Number.isInteger(n) || n < 0 || n > limit) fault(FB.T('Invalid ladder band reference.'));
          } else if (key === 'bands' && field === 'promotion') {
            var p = row[field];
            if (p !== null && (!object(p) || ['freedom','manor','barony','county','higher'].indexOf(p.route) < 0 ||
                (p.next !== null && (!Number.isInteger(p.next) || p.next < 0 || p.next >= S.bandCount || p.next === Number(index)))))
              fault(FB.T('Invalid promotion rule.'));
          } else if (key === 'bands' && field === 'role') {
            if (['serf','commoner','gentry','lord','crowned'].indexOf(row[field]) < 0) fault(FB.T('Invalid societal role.'));
          } else if (key === 'bands' && field === 'succession') {
            if (['personal','dynastic'].indexOf(row[field]) < 0) fault(FB.T('Invalid succession rule.'));
          } else fault(FB.T('Unknown ladder field.'));
        }
        if (!partial && key === 'bands' && typeof row.used !== 'boolean') fault(FB.T('Bands need a used flag.'));
        if (!partial && (key !== 'bands' || row.used) && numeric.some(function (f) { return !Number.isInteger(row[f]); }))
          fault(FB.T('Used bands need ordering and scale mappings.'));
        if (!partial && key === 'bands' && row.used &&
            (!own(row, 'role') || !own(row, 'succession') || !own(row, 'promotion')))
          fault(FB.T('Used bands need role, succession and promotion rules.'));
      }
      if (!partial) for (var ri = 0; ri < tables[key]; ri++) if (!own(rows, ri)) fault(FB.T('Missing ladder row.'));
    }
    return errors;
  };
})();
