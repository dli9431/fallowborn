/* Bounded household graphs. Content, places and historical outcomes belong to data. */
(function () {
  'use strict';
  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function plain(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function slug(v) { return typeof v === 'string' && /^[a-z][a-z0-9_]*$/.test(v); }
  function keys(o, allowed) { return plain(o) && Object.keys(o).every(function (k) { return allowed.indexOf(k) >= 0; }); }
  function integer(v) { return Number.isInteger(v) && v >= 0; }
  function present(s) { return s.player.travel ? s.player.travel.currentId : s.player.provinceId; }
  function sovereign(s, id) { return s.owner[id] ? FB.topRealm(s, s.owner[id]) : null; }
  function living(s) { var c = s.chars[s.player.charId]; return !!c && !c.dead && !s.player.dead; }
  function shadow(s) { return Object.assign({}, s, { player:JSON.parse(JSON.stringify(s.player)) }); }
  function household(s) {
    var ids = Object.keys(s.stories || {});
    for (var i = 0; i < ids.length; i++) {
      var r = s.stories[ids[i]];
      if (r.householdId && r.householdReceipts) return r.householdId;
    }
    return s.player.charId;
  }
  /* Shared receipt protocol for personal tracks and local world observers.
     A control event uses the actual transition's turn and old/new sovereigns.
     Campaign victory aliases must use that same control event, not a new key. */
  function receiptKey(householdId, event) {
    return JSON.stringify([householdId, event.source, event.milestone,
      event.provinceId, event.turn, event.before, event.after]);
  }
  function receipt(s, key) {
    var ids = Object.keys(s.stories || {});
    for (var i = 0; i < ids.length; i++) {
      var rows = s.stories[ids[i]].householdReceipts;
      if (own(rows, key)) return rows[key];
    }
    return null;
  }
  FB.householdStories = { householdId:household, receiptKey:receiptKey, receipt:receipt,
    owner:function (s, key) {
      var list = FB.stories.list();
      for (var i = 0; i < list.length; i++) {
        var rec = FB.stories.record(s, list[i].id);
        if (rec && list[i].householdIncident && list[i].householdIncident(s, rec, key)) return list[i].id;
      }
      return null;
    }
  };

  function validate(def, context) {
    function need(ok, field) { if (!ok) throw new Error('Invalid household track: ' + field + '.'); }
    need(keys(def, ['id','type','title','intro','homeProvinceId','continuity','initialStage',
      'stages','requires','requirements','registrationBefore','registrationAfter']), 'fields');
    need(typeof def.title === 'string' && def.title.length > 0 && def.title.length <= 240 &&
      typeof def.intro === 'string' && def.intro.length <= 4000, 'presentation');
    need(slug(def.homeProvinceId) && def.continuity === 'household', 'home or continuity');
    need(plain(def.stages) && Object.keys(def.stages).length > 0 && Object.keys(def.stages).length <= 64 &&
      slug(def.initialStage) && own(def.stages, def.initialStage), 'stages');
    function dependency(id) { need((def.requires || []).indexOf(id) >= 0 && context.get(id), 'story dependency'); }
    function mobileRealm(id) {
      need(slug(id) && (def.requirements && def.requirements.realms || []).indexOf(id) >= 0, 'mobile realm dependency');
    }
    var predicateCount = 0;
    function predicate(p, depth) {
      if (p === undefined) return;
      need(++predicateCount <= 2048 && depth <= 5 && plain(p), 'predicate bounds');
      if (p.all || p.any) {
        var list = p.all || p.any;
        need(keys(p, p.all ? ['all'] : ['any']) && Array.isArray(list) && list.length > 0 && list.length <= 16, 'predicate group');
        list.forEach(function (v) { predicate(v, depth + 1); }); return;
      }
      if (p.not) { need(keys(p, ['not']), 'negation'); predicate(p.not, depth + 1); return; }
      if (p.kind === 'elapsed') {
        need(keys(p, ['kind','minDays','sinceCampaign']) && integer(p.minDays) && p.minDays <= 1440 &&
          (p.sinceCampaign === undefined || p.sinceCampaign === true), 'elapsed predicate');
      } else if (p.kind === 'travelling') need(keys(p, ['kind']), 'journey predicate');
      else if (p.kind === 'mobile_state') {
        mobileRealm(p.realmId);
        need(keys(p, ['kind','realmId','condition','provinceId']) && slug(p.realmId) &&
          ['active','camp','present','moving','scarce'].indexOf(p.condition) >= 0 &&
          (p.condition === 'camp' ? slug(p.provinceId) : p.provinceId === undefined), 'mobile predicate');
      } else if (p.kind === 'home' || p.kind === 'present' || p.kind === 'arrived' || p.kind === 'at_war' || p.kind === 'journey') {
        need(keys(p, ['kind','provinceId']) && slug(p.provinceId), 'location predicate');
      } else if (p.kind === 'sovereign') {
        need(keys(p, ['kind','provinceId','realmId']) && slug(p.provinceId) && slug(p.realmId), 'sovereign predicate');
      } else if (p.kind === 'identity') {
        need(keys(p, ['kind','cultureId','faithId']) && (p.cultureId || p.faithId) &&
          (!p.cultureId || own(FBDATA.cultures, p.cultureId)) && (!p.faithId || own(FBDATA.religions, p.faithId)), 'identity predicate');
      } else if (p.kind === 'year') {
        need(keys(p, ['kind','min','max']) && integer(p.min) && integer(p.max) && p.min <= p.max && p.max <= 10000, 'year predicate');
      } else if (p.kind === 'story_state') {
        need(keys(p, ['kind','storyId','stateField','values']) && ['phase','result'].indexOf(p.stateField) >= 0 &&
          Array.isArray(p.values) && p.values.length > 0 && p.values.length <= 16 &&
          p.values.every(function (v) { return v === null || slug(v); }), 'story state predicate');
        dependency(p.storyId);
      } else need(false, 'unknown predicate');
    }
    function operation(op) {
      need(plain(op), 'operation');
      if (op.kind === 'record_decision') need(keys(op, ['kind']), 'decision terms');
      else if (op.kind === 'convert_faith') need(keys(op, ['kind','faithId','scope']) &&
        own(FBDATA.religions, op.faithId) && ['self','household'].indexOf(op.scope) >= 0, 'conversion terms');
      else if (op.kind === 'travel_site') {
        need(keys(op, ['kind','travelSiteId']) && (FBDATA.travelSites || []).some(function (site) {
          var purpose = FBDATA.travelPurposes[site.purpose];
          return site.id === op.travelSiteId && purpose && !purpose.targeted && purpose.mode === 'sites';
        }), 'travel terms');
      } else if (op.kind === 'settle_household') need(keys(op, ['kind']), 'settlement terms');
      else if (op.kind === 'mobile_work') { mobileRealm(op.realmId); need(keys(op, ['kind','realmId']), 'mobile work terms'); }
      else if (op.kind === 'travel_mobile') {
        mobileRealm(op.realmId);
        var purpose = FBDATA.travelPurposes && FBDATA.travelPurposes[op.purposeId];
        need(keys(op, ['kind','realmId','purposeId']) && slug(op.realmId) && purpose && !purpose.targeted && purpose.mode === 'capitals', 'mobile journey terms');
      } else if (op.kind === 'return_home') need(keys(op, ['kind']), 'return terms');
      else need(false, 'unknown operation');
    }
    Object.keys(def.stages).forEach(function (id) {
      var stage = def.stages[id];
      need(slug(id) && keys(stage, ['name','text','terminal','choices','transitions','incident','afterIncident']), 'stage fields');
      need(typeof stage.name === 'string' && stage.name.length > 0 && stage.name.length <= 240 &&
        typeof stage.text === 'string' && stage.text.length <= 4000, 'stage presentation');
      need(stage.terminal === undefined || stage.terminal === true, 'terminal');
      need(Array.isArray(stage.choices) && stage.choices.length <= 12 &&
        Array.isArray(stage.transitions) && stage.transitions.length <= 16, 'stage lists');
      need(!stage.terminal || !stage.choices.length && !stage.transitions.length, 'terminal routes');
      need(stage.terminal || stage.choices.length + stage.transitions.length > 0, 'unfinished dead end');
      if (stage.incident) {
        need(!stage.terminal && own(def.stages, stage.afterIncident) && stage.afterIncident !== id, 'incident closure route');
        var inc = stage.incident;
        need(keys(inc, ['source','provinceId','storyId','milestone']) && slug(inc.provinceId), 'incident');
        if (inc.source === 'control') need(!inc.storyId && inc.milestone === 'rule_changed', 'control incident');
        else { need(inc.source === 'story' && ['started','won','failed','diverted','interrupted'].indexOf(inc.milestone) >= 0, 'story incident'); dependency(inc.storyId); }
      } else need(stage.afterIncident === undefined, 'orphan incident route');
      var seen = Object.create(null);
      stage.choices.forEach(function (choice) {
        need(keys(choice, ['id','label','detail','when','next','operation']) && slug(choice.id) && !seen[choice.id], 'choice');
        seen[choice.id] = true;
        need(typeof choice.label === 'string' && choice.label.length > 0 && choice.label.length <= 240 &&
          typeof choice.detail === 'string' && choice.detail.length <= 4000, 'choice presentation');
        need(own(def.stages, choice.next), 'choice destination'); predicate(choice.when, 0); operation(choice.operation);
      });
      stage.transitions.forEach(function (route) {
        need(keys(route, ['when','next']) && plain(route.when) && own(def.stages, route.next) && route.next !== id, 'transition');
        predicate(route.when, 0);
      });
    });
    var reached = Object.create(null), pending = [def.initialStage];
    while (pending.length) {
      var id = pending.shift(); if (reached[id]) continue; reached[id] = true;
      def.stages[id].choices.concat(def.stages[id].transitions).forEach(function (r) { pending.push(r.next); });
      if (def.stages[id].afterIncident) pending.push(def.stages[id].afterIncident);
    }
    need(Object.keys(def.stages).every(function (id) { return reached[id]; }), 'unreachable stage');
    // Every stage must have a route to an explicit terminal, even in a cyclic graph.
    var finishes = Object.create(null);
    Object.keys(def.stages).forEach(function (id) { if (def.stages[id].terminal) finishes[id] = true; });
    for (var n = 0; n < 64; n++) Object.keys(def.stages).forEach(function (id) {
      if (finishes[def.stages[id].afterIncident] || def.stages[id].choices.concat(def.stages[id].transitions).some(function (r) { return finishes[r.next]; })) finishes[id] = true;
    });
    need(Object.keys(def.stages).every(function (id) { return finishes[id]; }), 'no terminal route');
    Object.keys(def.stages).forEach(function (origin) {
      if (!def.stages[origin].incident) return;
      var visited = Object.create(null), todo = def.stages[origin].choices.concat(def.stages[origin].transitions).map(function (r) { return r.next; });
      todo.push(def.stages[origin].afterIncident);
      while (todo.length) {
        var id = todo.pop(); need(id !== origin, 'incident cycle');
        if (visited[id]) continue; visited[id] = true;
        var stage = def.stages[id];
        stage.choices.concat(stage.transitions).forEach(function (r) { todo.push(r.next); });
        if (stage.afterIncident) todo.push(stage.afterIncident);
      }
    });
  }

  function factory(def) {
    var controls = Object.create(null), places = Object.create(null), mobileRealms = Object.create(null);
    function scan(v) {
      if (!v || typeof v !== 'object') return;
      if (v.source === 'control') controls[v.provinceId] = true;
      if (v.provinceId) places[v.provinceId] = true;
      if (v.kind === 'mobile_state' || v.kind === 'mobile_work' || v.kind === 'travel_mobile') mobileRealms[v.realmId] = true;
      Object.keys(v).forEach(function (k) { scan(v[k]); });
    }
    scan(def.stages);
    function test(s, p, t) {
      if (!p) return true;
      if (p.all) return p.all.every(function (v) { return test(s, v, t); });
      if (p.any) return p.any.some(function (v) { return test(s, v, t); });
      if (p.not) return !test(s, p.not, t);
      if (p.kind === 'elapsed') return s.turn - (p.sinceCampaign ? 0 : t.stageTurn) >= p.minDays;
      if (p.kind === 'travelling') return !!s.player.travel;
      if (p.kind === 'mobile_state') {
        var mobile = FB.mobile.householdSnapshot(s, FB.startRealmId(s, p.realmId));
        if (!mobile || !mobile.active) return false;
        if (p.condition === 'active') return true;
        if (p.condition === 'camp') return mobile.provinceId === p.provinceId;
        if (p.condition === 'present') return mobile.provinceId === present(s);
        if (p.condition === 'moving') return mobile.moving;
        return mobile.scarce;
      }
      if (p.kind === 'home') return s.player.provinceId === p.provinceId;
      if (p.kind === 'present') return present(s) === p.provinceId;
      if (p.kind === 'arrived') return !!s.player.travel && s.player.travel.phase === 'arrived' && s.player.travel.destinationId === p.provinceId;
      if (p.kind === 'journey') return !!s.player.travel && s.player.travel.destinationId === p.provinceId;
      if (p.kind === 'sovereign') return sovereign(s, p.provinceId) === FB.startRealmId(s, p.realmId);
      if (p.kind === 'identity') { var c = s.chars[s.player.charId]; return !!c && (!p.cultureId || c.culture === p.cultureId) && (!p.faithId || c.religion === p.faithId); }
      if (p.kind === 'year') return s.date.year >= p.min && s.date.year <= p.max;
      if (p.kind === 'at_war') return FB.isRealmAtWar(s, sovereign(s, p.provinceId));
      var row = FB.stories.record(s, p.storyId);
      return !!row && p.values.indexOf(row[p.stateField]) >= 0;
    }
    function event(s, t, inc) {
      if (!inc) return null;
      if (inc.source === 'control') {
        var o = t.controls[inc.provinceId];
        var current = sovereign(s, inc.provinceId);
        // World observers may run before this track's day hook. Project the
        // same transition without consuming or mutating the saved baseline.
        if (o && o.after !== current) o = { before:o.after, after:current, turn:s.turn };
        if (!o || o.turn === null) return null;
        return { source:inc.source, milestone:inc.milestone, provinceId:inc.provinceId, turn:o.turn, before:o.before, after:o.after };
      }
      var row = FB.stories.record(s, inc.storyId);
      if (!row || (inc.milestone === 'started' ? row.startedTurn === null : row.result !== inc.milestone)) return null;
      var turn = inc.milestone === 'started' ? row.startedTurn : row.outcomeTurn;
      if (!integer(turn)) return null;
      return { source:inc.storyId, milestone:inc.milestone, provinceId:inc.provinceId, turn:turn, before:null, after:null };
    }
    function incident(s, t, stage) {
      var e = event(s, t, stage.incident); return e ? receiptKey(t.householdId, e) : null;
    }
    function close(s, t, stage, reason) {
      var key = incident(s, t, stage);
      if (key && !receipt(s, key)) t.householdReceipts[key] = { owner:def.id, status:reason, turn:s.turn };
    }
    function move(s, t, next) { t.phase = next; t.revision++; t.stageTurn = s.turn; }
    function update(s, t) {
      Object.keys(controls).forEach(function (id) {
        var current = sovereign(s, id), o = t.controls[id];
        if (o.after !== current) t.controls[id] = { before:o.after, after:current, turn:s.turn };
      });
      if (!living(s)) return;
      if (t.actorId !== s.player.charId) { t.actorId = s.player.charId; t.revision++; }
      // One automatic edge per boundary; malformed cyclic content cannot spin a tick.
      var stage = def.stages[t.phase];
      var key = incident(s, t, stage);
      if (key && receipt(s, key)) { move(s, t, stage.afterIncident); return; }
      for (var i = 0; i < stage.transitions.length; i++) {
        if (test(s, stage.transitions[i].when, t)) { close(s, t, stage, 'expired'); move(s, t, stage.transitions[i].next); return; }
      }
    }
    function operation(s, op) {
      if (op.kind === 'mobile_work') {
        var request = { realmId:FB.startRealmId(s, op.realmId), action:'work', terms:{}, actor:{ kind:'character', id:s.player.charId } };
        var review = FB.mobile.review(s, request);
        return { allowed:!!review.review.allowed, reason:FB.T('Paid camp work requires actual presence, age sixteen, an available worker, food, treasury funds and no previous payment today.'), terms:review };
      }
      if (op.kind === 'travel_mobile') {
        var rid = FB.startRealmId(s, op.realmId), mobile = FB.mobile.householdSnapshot(s, rid);
        var dest = mobile && mobile.active && !mobile.moving && FB.travelRealmSnapshot(s, op.purposeId, rid);
        return { allowed:!!dest && dest.destinationId === mobile.provinceId && s.player.gold >= dest.cost,
          reason:FB.T('A stationary living camp, an ordinary reachable court destination and the full journey price are required.'), terms:dest || null };
      }
      if (op.kind === 'return_home') {
        var eligible = FB.travelReturnEligible(shadow(s));
        return { allowed:eligible === true, reason:eligible === true ? '' : eligible, terms:s.player.travel };
      }
      if (op.kind === 'convert_faith') {
        var c = FB.conversionStatus(s, 'faith', op.faithId, op.scope);
        return { allowed:!!c.ok && !!c.encountered, reason:c.reason, terms:c };
      }
      if (op.kind === 'travel_site') {
        var dest = FB.travelSiteSnapshot(s, op.travelSiteId);
        return { allowed:!!dest && s.player.gold >= dest.cost,
          reason:FB.T('A reachable destination, an eligible traveller and the full journey price are required.'), terms:dest };
      }
      if (op.kind === 'settle_household') {
        var eligible = FB.travelSettlementEligible(shadow(s));
        return { allowed:eligible === true, reason:eligible === true ? '' : eligible, terms:s.player.travel };
      }
      return { allowed:true, reason:'', terms:null };
    }
    function quote(s, t, id) {
      var stage = def.stages[t.phase], choice = stage.choices.filter(function (c) { return c.id === id; })[0];
      var op = choice ? operation(s, choice.operation) : { allowed:false, terms:null };
      var key = incident(s, t, stage), closed = key && receipt(s, key);
      var facts = { turn:s.turn, actor:s.player.charId, alive:living(s), phase:t.phase, revision:t.revision,
        home:s.player.provinceId, presence:present(s), funds:[s.player.gold,s.player.piety,s.player.prestige],
        travel:s.player.travel,
        control:Object.keys(places).map(function (pid) { return [pid,s.owner[pid],s.holder[pid],sovereign(s, pid)]; }),
        identity:[s.chars[s.player.charId].culture,s.chars[s.player.charId].religion],
        family:FB.householdMembers(s).map(function (c) { return [c.id,!!c.dead,c.religion,c.culture]; }),
        stageReady:!stage.transitions.some(function (r) { return test(s, r.when, t); }),
        local:!stage.incident || s.player.provinceId === stage.incident.provinceId && present(s) === stage.incident.provinceId,
        when:!!choice && test(s, choice.when, t), incident:key, closed:closed || null, terms:op.terms,
        graph:def };
      if (Object.keys(mobileRealms).length) facts.mobile = Object.keys(mobileRealms).sort().map(function (rid) {
        return FB.mobile.householdSnapshot(s, FB.startRealmId(s, rid));
      });
      if (choice && choice.operation.kind === 'convert_faith') facts.modifier = FBDATA.modifiers && FBDATA.modifiers['zealot_unrest'];
      return { id:id, allowed:!!choice && living(s) && facts.stageReady && facts.local && facts.when && op.allowed &&
        (!stage.incident || !!key && !closed), reason:op.reason || FB.T('The local situation has changed. Review the household again.'),
        facts:facts, stamp:JSON.stringify(facts) };
    }
    function apply(s, t, id, reviewed) {
      var q = quote(s, t, id);
      if (!q.allowed || !reviewed || reviewed.id !== id || reviewed.stamp !== q.stamp) return false;
      var stage = def.stages[t.phase], choice = stage.choices.filter(function (c) { return c.id === id; })[0], op = choice.operation;
      if (op.kind === 'convert_faith' && !FB.applyConversion(s, 'faith', op.faithId, op.scope)) return false;
      if (op.kind === 'travel_site' && !FB.travelStart(s, q.facts.terms.purpose, q.facts.terms.destinationId, q.facts.terms.destinationRealm)) return false;
      if (op.kind === 'settle_household' && !FB.travelSettle(s)) return false;
      if (op.kind === 'mobile_work' && !FB.mobile.commit(s, q.facts.terms)) return false;
      if (op.kind === 'travel_mobile' && !FB.travelStart(s, q.facts.terms.purpose, q.facts.terms.destinationId, q.facts.terms.destinationRealm)) return false;
      if (op.kind === 'return_home' && !(s.player.travel.phase === 'arrived' ? FB.travelReturn(s) : FB.travelTurnBack(s))) return false;
      close(s, t, stage, 'resolved');
      t.decisions[t.phase] = { choiceId:id, turn:s.turn, actorId:s.player.charId };
      move(s, t, choice.next); return true;
    }
    return { id:def.id, kind:'track', requires:def.requires,
      appliesTo:function (s) { return living(s) && s.player.provinceId === def.homeProvinceId; },
      init:function (s) {
        var rows = {};
        Object.keys(controls).forEach(function (id) { rows[id] = { before:null, after:sovereign(s, id), turn:null }; });
        return { version:1, householdId:household(s), actorId:s.player.charId, phase:def.initialStage,
          revision:0, stageTurn:s.turn, decisions:{}, controls:rows, householdReceipts:{} };
      },
      title:function () { return FB.T(def.title); }, intro:function () { return FB.T(def.intro); },
      day:update, season:update, year:update,
      householdIncident:function (s, t, key) {
        if (def.stages[t.phase].terminal || !living(s) || receipt(s, key)) return false;
        return Object.keys(def.stages).some(function (id) {
          var inc = def.stages[id].incident;
          return inc && s.player.provinceId === inc.provinceId && present(s) === inc.provinceId && incident(s, t, def.stages[id]) === key;
        });
      },
      status:function (s, t) {
        var stage = def.stages[t.phase], lines = [FB.T(stage.text)];
        Object.keys(mobileRealms).sort().forEach(function (rid) {
          var row = FB.mobile.householdSnapshot(s, FB.startRealmId(s, rid));
          if (!row || !row.active) { lines.push(FB.T('The mobile following is no longer available.')); return; }
          lines.push(FB.T('Civilian camp: {place}. Food stock: {food}. Public treasury: {money:gold}. Local market food: {market}.',
            { place:FB.world.byId[row.provinceId].name, food:Math.floor(row.food), gold:row.treasury, market:Math.floor(row.marketFood) }));
          lines.push(row.access ? FB.T('Current lawful access is active; pasture and recruitment remain subject to its terms.') :
            FB.T('No current lawful access concession is active here. Work does not negotiate one.'));
        });
        return { phase:t.phase, name:FB.T(stage.name), lines:lines };
      },
      choices:function (s, t) { return def.stages[t.phase].choices.map(function (c) { return { id:c.id, label:FB.T(c.label), detail:FB.T(c.detail) }; }); },
      quote:quote, apply:apply, blocker:function (s, t, reason) { return reason; },
      review:function (s, t, id, q) {
        var choice = def.stages[t.phase].choices.filter(function (c) { return c.id === id; })[0], op = choice.operation, terms = q.facts.terms;
        if (op.kind === 'convert_faith') return [FB.T('Cost: {piety} piety and {prestige} prestige.', { piety:terms.pietyCost, prestige:terms.prestigeCost }),
          op.scope === 'self' ? FB.T('Only your own faith changes. Your relatives keep theirs.') : FB.T('Household members adopting this faith: {names}.',
            { names:FB.householdMembers(s).filter(function (c) { return !c.dead; }).map(function (c) { return FB.fullName(c); }).join(', ') }),
          FB.T('Popular opinion: {n}.', { n:terms.popularOpinion }),
          FB.T('Old-fold Standing: {standing} with {n} courts. Vassal Standing: {vassal} with {count} courts.',
            { standing:terms.foldStanding, n:terms.oldFoldRealmIds.length, vassal:terms.vassalStanding, count:terms.vassalIds.length }),
          op.scope === 'household' && q.facts.modifier ? FB.T('Household unrest for {days} days: {unrest}% unrest, {support} Popular support, {tax}% tax and {levy}% levy.',
            { days:q.facts.modifier.days, unrest:Math.round(100 * (q.facts.modifier.fx.unrest || 0)), support:q.facts.modifier.fx.commonVoice || 0,
              tax:Math.round(100 * (q.facts.modifier.fx.tax || 0)), levy:Math.round(100 * (q.facts.modifier.fx.levy || 0)) }) : FB.T('No household conversion unrest is added.'),
          terms.excommunicates ? FB.T('The old obedience may excommunicate you for apostasy.') : FB.T('No papal excommunication applies.'),
          FB.T('Culture, property, taxes and safety are not guaranteed by conversion.')];
        if (op.kind === 'mobile_work') return [FB.T('The coalition pays you {money:gold} from its treasury and consumes one food unit.', { gold:terms.review.cost }),
          FB.T('This is one paid service today. It grants no membership, pasture, land, conversion or authority over the following.')];
        if (op.kind === 'return_home') return [FB.T('Use the existing journey to return home. Ordinary minimum-stay rules still apply; completion requires actual arrival.')];
        if (op.kind === 'travel_site' || op.kind === 'travel_mobile') return [FB.T('Journey price: {gold}. Route time: {days} days.', { gold:terms.cost, days:terms.days }),
          FB.T('Traveller: {name}. Relatives remain at home until an ordinary household settlement.', { name:FB.fullName(s.chars[s.player.charId]) }),
          FB.T('Travel risks and interruptions apply. Arrival grants no land or protection.')];
        if (op.kind === 'settle_household') return [FB.T('Move the household through the ordinary settlement rules. This uses your one permanent move in this lifetime.')];
        return [FB.T('Record this decision without a payment, grant or change of identity.')];
      },
      validate:function (t, s) {
        function need(ok) { if (!ok) throw new Error('Invalid household story record: ' + def.id + '.'); }
        need(keys(t, ['version','householdId','actorId','phase','revision','stageTurn','decisions','controls','householdReceipts']) && t.version === 1 &&
          typeof t.householdId === 'string' && t.householdId.length > 0 && typeof t.actorId === 'string' && t.actorId.length > 0 &&
          own(def.stages, t.phase) && integer(t.revision) && integer(t.stageTurn) && plain(t.decisions) && plain(t.controls) && plain(t.householdReceipts));
        need(!s || t.stageTurn <= s.turn);
        need(Object.keys(t.decisions).length <= 64 && Object.keys(t.householdReceipts).length <= 64);
        Object.keys(t.decisions).forEach(function (id) {
          var d = t.decisions[id];
          need(own(def.stages, id) && keys(d, ['choiceId','turn','actorId']) && integer(d.turn) && typeof d.actorId === 'string' &&
            def.stages[id].choices.some(function (c) { return c.id === d.choiceId; }));
          need(!s || d.turn <= s.turn);
        });
        need(Object.keys(t.controls).length === Object.keys(controls).length);
        Object.keys(t.controls).forEach(function (id) {
          var c = t.controls[id];
          need(controls[id] && keys(c, ['before','after','turn']) && (c.before === null || typeof c.before === 'string') &&
            (c.after === null || typeof c.after === 'string') && (c.turn === null || integer(c.turn)));
          need(!s || c.turn === null || c.turn <= s.turn);
        });
        Object.keys(t.householdReceipts).forEach(function (key) {
          var r = t.householdReceipts[key], parts;
          try { parts = JSON.parse(key); } catch (e) { need(false); }
          need(Array.isArray(parts) && parts.length === 7 && parts[0] === t.householdId &&
            typeof parts[1] === 'string' && typeof parts[2] === 'string' && typeof parts[3] === 'string' && integer(parts[4]) &&
            (parts[5] === null || typeof parts[5] === 'string') && (parts[6] === null || typeof parts[6] === 'string') &&
            keys(r, ['owner','status','turn']) && r.owner === def.id && ['resolved','expired'].indexOf(r.status) >= 0 && integer(r.turn));
          need(key === JSON.stringify(parts) && (!s || r.turn <= s.turn && parts[4] <= r.turn));
          need(Object.keys(def.stages).some(function (id) {
            var inc = def.stages[id].incident;
            return inc && parts[1] === (inc.source === 'control' ? inc.source : inc.storyId) &&
              parts[2] === inc.milestone && parts[3] === inc.provinceId;
          }));
        });
      }
    };
  }
  FB.stories.registerType('household_track', factory, 'js/story_household.js', validate);
})();
