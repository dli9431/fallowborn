/* Reusable bilateral cession and conserved civilian relocation stories.
   Dates open opportunities. Consent and current world facts establish outcomes. */
(function () {
  'use strict';
  var V = FB.stories.tokens;
  function plain(v) { return !!v && typeof v === V.object && !Array.isArray(v); }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function ruler(s, rid) { return FB.stories.ruler(s, rid); }
  function generation(s, rid) { return FB.realmRulerGeneration(s, rid); }
  function cast(s, ref) { return FB.stories.resolve(s, ref); }
  function fail(id, key) { throw new Error(FB.T('Invalid v4 save field at {path}.', { path:'state.stories.' + id + '.' + key })); }
  function finish(s, r, result, reason) {
    r.phase = 'resolved'; r.result = result; r.reason = reason; r.outcomeTurn = s.turn;
  }
  function common(def) {
    if (!plain(def) || typeof def.name !== V.string || typeof def.desc !== V.string ||
        !Number.isInteger(def.firstYear) || !Number.isInteger(def.lastYear) || def.lastYear < def.firstYear)
      throw new Error('Invalid agreement story declaration.');
    Object.keys(FBDATA.bookmarks).forEach(function (id) {
      var bm = FBDATA.bookmarks[id];
      if ((bm.stories || []).indexOf(def.id) < 0) return;
      var counties = {}, realms = {};
      (bm.provinces || []).forEach(function (p) { if (!p.wasteland) counties[p.id] = true; });
      (bm.realms || []).forEach(function (r) { realms[r.id] = true; });
      if (!def.actor || !realms[def.actor.realmId] || def.source && !realms[def.source.realmId] ||
          (def.countyIds || []).concat(def.retainedCountyIds || []).some(function (pid) { return !counties[pid]; }) ||
          (def.routes || []).some(function (r) { return !r || !counties[r.from] || !counties[r.to]; }) ||
          (def.conditions || []).some(function (c) { return !c || c.kind === V.owner && (!counties[c.provinceId] || !realms[c.realmId]); }))
        throw new Error('Agreement parties and counties must resolve in the owning bookmark.');
    });
  }
  function text(s, d, field) { return FB.dataText(s, null, 'storyCampaign', d.id, d, field, {}); }
  function conditions(s, d) {
    return (d.conditions || []).every(function (c) {
      if (c.kind === V.owner) return s.owner[c.provinceId] === c.realmId;
      if (c.kind === V.story_result) {
        var rec = FB.stories.record(s, c.storyId);
        return rec && rec.phase === 'resolved' && rec.result === c.result;
      }
      return false;
    });
  }
  function definitionConditions(def) {
    if (def.conditions !== undefined && (!Array.isArray(def.conditions) || def.conditions.some(function (c) {
      return !plain(c) || c.kind === V.owner && (typeof c.provinceId !== V.string || typeof c.realmId !== V.string) ||
        c.kind === V.story_result && (!(def.requires || []).includes(c.storyId) || typeof c.result !== V.string) ||
        [V.owner,V.story_result].indexOf(c.kind) < 0;
    }))) throw new Error('Invalid agreement story conditions.');
  }
  function treatyFresh(s, d) {
    var a = FB.materializeRealmRuler(s, d.actor.realmId) || ruler(s, d.actor.realmId);
    var b = FB.materializeRealmRuler(s, d.source.realmId) || ruler(s, d.source.realmId);
    return { phase:'pending', result:null, reason:null, outcomeTurn:null, approvals:{},
      actorId:a && a.id || null, sourceId:b && b.id || null,
      actorGeneration:generation(s, d.actor.realmId), sourceGeneration:generation(s, d.source.realmId),
      ceded:false, acceptedTurn:null, paidThroughTurn:null, totalPaid:0 };
  }
  function treatyChanged(s, r, d) {
    var a = ruler(s, d.actor.realmId), b = ruler(s, d.source.realmId);
    return !a || !b || a.dead || b.dead || !s.realms[d.actor.realmId] || !s.realms[d.actor.realmId].alive ||
      !s.realms[d.source.realmId] || !s.realms[d.source.realmId].alive ||
      a.id !== r.actorId || b.id !== r.sourceId || generation(s, d.actor.realmId) !== r.actorGeneration ||
      generation(s, d.source.realmId) !== r.sourceGeneration ||
      d.actor.character && cast(s, d.actor.character) !== a.id;
  }
  function treatyTerritory(s, r, d) {
    return d.countyIds.every(function (pid) {
      var expected = r.ceded ? d.actor.realmId : d.source.realmId;
      return s.owner[pid] === expected && FB.settlementCountyHolder(s, pid) === expected;
    }) && d.retainedCountyIds.every(function (pid) {
      return s.owner[pid] === d.source.realmId && FB.settlementCountyHolder(s, pid) === d.source.realmId;
    });
  }
  function treatyQuote(s, r, d, rid, choice) {
    choice = choice || 'approve';
    var allowed = r.phase === 'pending' && [d.actor.realmId,d.source.realmId].indexOf(rid) >= 0 &&
      s.date.year >= d.firstYear && s.date.year <= d.lastYear && s.turn >= (d.firstTurn || 0) &&
      !treatyChanged(s, r, d) && (choice === 'decline' || treatyTerritory(s, r, d) && conditions(s, d) &&
      !FB.isRealmAtWar(s, d.actor.realmId) && !FB.isRealmAtWar(s, d.source.realmId) &&
      FB.treasuryAvailable(s, d.actor.realmId) >= d.tribute) && ['approve','decline'].indexOf(choice) >= 0;
    return { allowed:!!allowed, id:choice, realmId:rid,
      stamp:JSON.stringify([choice, s.turn, r, d, ruler(s, d.actor.realmId), ruler(s, d.source.realmId),
        d.countyIds.concat(d.retainedCountyIds).map(function (pid) { return [s.owner[pid],FB.settlementCountyHolder(s,pid)]; }),
        FB.treasuryAvailable(s, d.actor.realmId), allowed]) };
  }
  function treatyTerms(s, d) {
    return [FB.T('Annual tribute: {money:amount}.', { amount:d.tribute }),
      FB.T('Ceded counties: {counties}.', { counties:d.countyIds.map(function (pid) { return FB.world.byId[pid].name; }).join(', ') }),
      FB.T('Retained counties: {counties}.', { counties:d.retainedCountyIds.map(function (pid) { return FB.world.byId[pid].name; }).join(', ') })];
  }
  function approve(s, r, d, rid, reviewed) {
    var q = treatyQuote(s, r, d, rid);
    if (!q.allowed || reviewed && reviewed.stamp !== q.stamp) return false;
    r.approvals[rid] = generation(s, rid);
    if (r.approvals[d.actor.realmId] !== r.actorGeneration ||
        r.approvals[d.source.realmId] !== r.sourceGeneration) return true;
    /* Every county and the retained foothold was rechecked before the single
       payment boundary. Transfers use ordinary political ownership cleanup. */
    if (!FB.treasuryTransfer(s, d.actor.realmId, d.source.realmId, d.tribute)) return false;
    r.totalPaid += d.tribute; r.acceptedTurn = s.turn; r.paidThroughTurn = s.turn;
    d.countyIds.forEach(function (pid) { FB.transferProvince(s, pid, d.actor.realmId); });
    r.ceded = true; r.phase = V.active;
    FB.news(s, FB.msg('news.agreement.cession',
      '📜 {recipient} and {source} consent to an island cession for {money:amount} in annual tribute. The source retains its named foothold.',
      { recipient:FB.realmNameParam(s, d.actor.realmId), source:FB.realmNameParam(s, d.source.realmId), amount:d.tribute }));
    return true;
  }
  function treatyDay(s, r, d) {
    if (r.phase === 'resolved') return;
    if (treatyChanged(s, r, d)) { finish(s, r, V.interrupted, 'changed_party'); return; }
    if (r.phase === 'pending') {
      if (s.date.year > d.lastYear) { finish(s, r, V.diverted, 'window_closed'); return; }
      if (s.date.year < d.firstYear || s.turn < (d.firstTurn || 0) || !conditions(s, d)) return;
      if (!treatyTerritory(s, r, d)) { finish(s, r, V.diverted, 'incompatible_territory'); return; }
      [d.actor.realmId,d.source.realmId].forEach(function (rid) {
        if (rid !== V.player && !Object.prototype.hasOwnProperty.call(r.approvals, rid)) approve(s, r, d, rid);
      });
      return;
    }
    if (!treatyTerritory(s, r, d) || !conditions(s, d) || FB.isRealmAtWar(s, d.actor.realmId) || FB.isRealmAtWar(s, d.source.realmId)) {
      finish(s, r, V.interrupted, 'agreement_scope_lost'); return;
    }
    if (s.turn < r.paidThroughTurn + d.intervalDays) return;
    if (!FB.treasuryTransfer(s, d.actor.realmId, d.source.realmId, d.tribute)) {
      finish(s, r, 'breached', 'unpaid');
      FB.news(s, FB.msg('news.agreement.unpaid', '📜 The island tribute agreement lapses after an unpaid installment. Current possession remains.', {}));
      return;
    }
    r.paidThroughTurn = s.turn; r.totalPaid += d.tribute;
    FB.news(s, FB.msg('news.agreement.tribute', '💰 {recipient} pays {money:amount} in island tribute to {source}.',
      { recipient:FB.realmNameParam(s, d.actor.realmId), source:FB.realmNameParam(s, d.source.realmId), amount:d.tribute }));
  }
  function treatyDefinition(d) {
    common(d); definitionConditions(d);
    if (!plain(d.actor) || !plain(d.source) || typeof d.actor.realmId !== V.string || typeof d.source.realmId !== V.string ||
        d.actor.realmId === d.source.realmId || !Number.isInteger(d.tribute) || d.tribute < 1 ||
        !Number.isInteger(d.intervalDays) || d.intervalDays < 1 ||
        d.firstTurn !== undefined && (!Number.isInteger(d.firstTurn) || d.firstTurn < 0) ||
        !Array.isArray(d.countyIds) || !d.countyIds.length || !Array.isArray(d.retainedCountyIds) || !d.retainedCountyIds.length ||
        d.countyIds.concat(d.retainedCountyIds).some(function (id, i, all) { return typeof id !== V.string || !id || all.indexOf(id) !== i; }) ||
        d.actor.character && !FB.stories.referenceValid(d.actor.character, d))
      throw new Error('Invalid tribute cession declaration.');
  }
  FB.stories.registerType(V.tribute_cession, function (d) {
    treatyDefinition(d);
    return { id:d.id, kind:V.world, requires:d.requires || [],
      init:function (s) { return treatyFresh(s, d); },
      day:function (s, r) { treatyDay(s, r, FB.stories.definition(s, d)); },
      title:function (s) { return text(s, d, V.name); }, intro:function (s) { return text(s, d, V.desc); },
      status:function (s, r) {
        if (r.phase === 'pending' && (s.date.year < d.firstYear || s.turn < (d.firstTurn || 0))) return null;
        return { phase:r.phase, name:r.phase === V.active ? FB.T('Cession and annual tribute') : r.phase === 'pending'
          ? FB.T('Awaiting both courts’ consent') : FB.T('Agreement ended'),
          lines:treatyTerms(s, d) };
      },
      choices:function (s, r) {
        var e = FB.stories.definition(s, d);
        if (r.phase !== 'pending' || [e.actor.realmId,e.source.realmId].indexOf(V.player) < 0 || r.approvals.player !== undefined) return [];
        return [{ id:'approve', label:FB.T('Consent to the cession'),
          detail:FB.T('Both current courts must consent. The recipient pays the first annual tribute before territory changes; the named foothold remains with the source.') },
        { id:'decline', label:FB.T('Decline this agreement'), detail:FB.T('Close this agreement without payment or territory transfer.') }];
      },
      quote:function (s, r, id) {
        return treatyQuote(s, r, FB.stories.definition(s, d), V.player, id);
      },
      review:function (s) { return treatyTerms(s, d); },
      blocker:function () { return FB.T('Consent needs the original living courts, peaceful direct holdings and enough treasury for the first installment. Review the current agreement again.'); },
      apply:function (s, r, id, reviewed) {
        var e = FB.stories.definition(s, d), q = treatyQuote(s, r, e, V.player, id);
        if (!reviewed || reviewed.id !== id || !q.allowed || q.stamp !== reviewed.stamp) return false;
        if (id === 'decline') { finish(s, r, V.diverted, V.declined); return true; }
        return id === 'approve' && approve(s, r, e, V.player, reviewed);
      },
      validate:function (r, s) {
        if (!plain(r) || ['pending',V.active,'resolved'].indexOf(r.phase) < 0 || !plain(r.approvals) ||
            typeof r.ceded !== 'boolean' || !Number.isInteger(r.totalPaid) || r.totalPaid < 0 ||
            r.phase === 'resolved' && ([V.interrupted,V.diverted,'breached'].indexOf(r.result) < 0 ||
              typeof r.reason !== V.string || !Number.isInteger(r.outcomeTurn) || r.outcomeTurn < 0) ||
            r.phase !== 'resolved' && (r.result !== null || r.reason !== null || r.outcomeTurn !== null)) fail(d.id, V.phase);
        var e = FB.stories.definition(s, d);
        if (typeof r.actorId !== V.string || !s.chars[r.actorId] || typeof r.sourceId !== V.string || !s.chars[r.sourceId] ||
            !Number.isInteger(r.actorGeneration) || r.actorGeneration < 1 ||
            !Number.isInteger(r.sourceGeneration) || r.sourceGeneration < 1) fail(d.id, 'parties');
        Object.keys(r.approvals).forEach(function (rid) {
          if ([e.actor.realmId,e.source.realmId].indexOf(rid) < 0 || r.approvals[rid] !==
              (rid === e.actor.realmId ? r.actorGeneration : r.sourceGeneration)) fail(d.id, 'approvals');
        });
        if (r.ceded ? r.phase === 'pending' || !Number.isInteger(r.acceptedTurn) || r.acceptedTurn < 0 || !Number.isInteger(r.paidThroughTurn) ||
            r.paidThroughTurn < r.acceptedTurn || r.paidThroughTurn > s.turn ||
            r.totalPaid < d.tribute || r.totalPaid % d.tribute ||
            r.totalPaid > d.tribute * (1 + Math.floor((r.paidThroughTurn - r.acceptedTurn) / d.intervalDays)) ||
            r.approvals[e.actor.realmId] !== r.actorGeneration || r.approvals[e.source.realmId] !== r.sourceGeneration :
            r.acceptedTurn !== null || r.paidThroughTurn !== null || r.totalPaid !== 0 || r.phase === V.active) fail(d.id, 'payment');
      } };
  }, 'js/story_agreements.js', treatyDefinition);

  /* Relocations draw a fixed ceiling from the live source when authorized.
     Each seasonal batch is one conserved population transaction, never a host. */
  function migrationFresh() { return { phase:'pending', result:null, reason:null, outcomeTurn:null,
    actorId:null, actorGeneration:null, routes:[], lastPeriod:null, playerDecision:null }; }
  function migrationReady(s, d) {
    return s.date.year >= d.firstYear && s.date.year <= d.lastYear && conditions(s, d) &&
      s.realms[d.actor.realmId] && s.realms[d.actor.realmId].alive &&
      ruler(s, d.actor.realmId) && !ruler(s, d.actor.realmId).dead && !FB.isRealmAtWar(s, d.actor.realmId) &&
      d.routes.every(function (r) { return s.owner[r.from] === d.actor.realmId && s.owner[r.to] === d.actor.realmId; });
  }
  function migrationQuote(s, r, d, id) {
    var allowed = r.phase === 'pending' && d.actor.realmId === V.player && migrationReady(s, d) && ['authorize','decline'].indexOf(id) >= 0;
    return { id:id, allowed:!!allowed, stamp:JSON.stringify([s.turn,r,d,generation(s,d.actor.realmId),
      d.routes.map(function (route) { return [s.owner[route.from],s.owner[route.to], FB.countyCommunities(s,route.from)]; }),allowed]) };
  }
  function migrationDay(s, r, d) {
    if (r.phase === 'resolved') return;
    if (r.phase === 'pending') {
      if (s.date.year > d.lastYear) { finish(s,r,V.diverted,'window_closed'); return; }
      if (!migrationReady(s,d) || d.actor.realmId === V.player && r.playerDecision !== 'authorize') return;
      var commander = FB.materializeRealmRuler(s,d.actor.realmId) || ruler(s,d.actor.realmId);
      r.phase = V.active; r.actorId = commander.id; r.actorGeneration = generation(s,d.actor.realmId);
      r.routes = d.routes.map(function (route) {
        var eligible = FB.countyCommunities(s,route.from).filter(function (c) {
          return c.culture === d.community.culture && c.religion === d.community.religion;
        }).reduce(function (n,c) { return n+c.count; },0);
        return { from:route.from,to:route.to,planned:Math.floor(eligible*d.share),moved:0 };
      });
    }
    if (!s.realms[d.actor.realmId] || !s.realms[d.actor.realmId].alive ||
        !ruler(s,d.actor.realmId) || ruler(s,d.actor.realmId).dead || ruler(s,d.actor.realmId).id !== r.actorId ||
        generation(s,d.actor.realmId) !== r.actorGeneration || !conditions(s,d) ||
        r.routes.some(function (route) { return s.owner[route.from] !== d.actor.realmId || s.owner[route.to] !== d.actor.realmId; })) {
      finish(s,r,V.interrupted,'changed_route_or_court'); return;
    }
    var period = Math.floor(s.turn/90);
    if (r.lastPeriod === period || FB.isRealmAtWar(s,d.actor.realmId)) return;
    r.lastPeriod = period;
    var moved = 0, exhausted = false;
    r.routes.forEach(function (route) {
      var amount = Math.min(d.batchSize,route.planned-route.moved);
      if (amount <= 0) return;
      var result = FB.moveCommunityPopulationByPolicy(s,route.from,route.to,{ amount:amount,community:d.community,cause:'civilian relocation' });
      route.moved += result.count; moved += result.count;
      if (!result.count) exhausted = true;
    });
    if (moved) FB.news(s,FB.msg('news.migration.civilians','🏘 {count} civilians reach new homes through the agreed evacuation route.',{count:moved}));
    if (exhausted) { finish(s,r,V.interrupted,'source_exhausted'); return; }
    if (r.routes.every(function (route) { return route.moved === route.planned; })) finish(s,r,'completed','cohorts_relocated');
  }
  function migrationDefinition(d) {
    common(d); definitionConditions(d);
    if (!plain(d.actor) || typeof d.actor.realmId !== V.string || !plain(d.community) ||
        !FBDATA.cultures[d.community.culture] || !FB.faithAssignable(d.community.religion,null) ||
        !Number.isFinite(d.share) || d.share <= 0 || d.share > 1 || !Number.isInteger(d.batchSize) || d.batchSize < 1 ||
        !Array.isArray(d.routes) || !d.routes.length || d.routes.some(function (r,i) {
          return !plain(r) || typeof r.from !== V.string || typeof r.to !== V.string || r.from === r.to ||
            d.routes.some(function (other,j) { return j<i && other.from === r.from; });
        })) throw new Error('Invalid civilian migration declaration.');
  }
  FB.stories.registerType(V.civilian_migration,function (d) {
    migrationDefinition(d);
    return { id:d.id,kind:V.world,requires:d.requires || [],init:migrationFresh,
      day:function (s,r) { migrationDay(s,r,FB.stories.definition(s,d)); },
      title:function (s) { return text(s,d,V.name); },intro:function (s) { return text(s,d,V.desc); },
      status:function (s,r) {
        if (r.phase === 'pending' && !migrationReady(s,FB.stories.definition(s,d))) return null;
        return {phase:r.phase,name:r.phase === V.active ? FB.T('Civilian evacuation underway') : r.phase === 'pending'
          ? FB.T('Awaiting authorization') : FB.T('Civilian evacuation ended'),
          lines:[FB.T('Relocated civilians: {count}.',{count:r.routes.reduce(function (n,route) {return n+route.moved;},0)})]};
      },
      choices:function (s,r) {
        if (r.phase !== 'pending' || FB.startRealmId(s,d.actor.realmId) !== V.player) return [];
        return [{id:'authorize',label:FB.T('Authorize civilian evacuation'),detail:FB.T('Move the declared civilian community in seasonal batches to the receiving counties. Existing culture, faith and total population are conserved.')},
          {id:'decline',label:FB.T('Keep the present communities'),detail:FB.T('Close the evacuation opportunity without moving residents.')}];
      },
      quote:function (s,r,id) { return migrationQuote(s,r,FB.stories.definition(s,d),id); },
      blocker:function () { return FB.T('Evacuation needs its date window, completed prerequisite, a living peaceful court and current control of both route ends. Review the current route again.'); },
      apply:function (s,r,id,reviewed) {
        var e=FB.stories.definition(s,d),q=migrationQuote(s,r,e,id);
        if (!reviewed || !q.allowed || q.id!==reviewed.id || q.stamp!==reviewed.stamp) return false;
        r.playerDecision=id;
        if (id==='decline') finish(s,r,V.diverted,V.declined); else migrationDay(s,r,e);
        return true;
      },
      validate:function (r,s) {
        if (!plain(r) || ['pending',V.active,'resolved'].indexOf(r.phase)<0 || !Array.isArray(r.routes) ||
            r.playerDecision!==null && ['authorize','decline'].indexOf(r.playerDecision)<0 ||
            r.phase==='resolved' && (['completed',V.interrupted,V.diverted].indexOf(r.result)<0 ||
              !Number.isInteger(r.outcomeTurn) || r.outcomeTurn<0 || typeof r.reason!==V.string) ||
            r.phase!=='resolved' && (r.result!==null || r.outcomeTurn!==null || r.reason!==null)) fail(d.id,V.phase);
        if (r.routes.length) {
          if (r.routes.length!==d.routes.length || typeof r.actorId!==V.string || !s.chars[r.actorId] ||
              !Number.isInteger(r.actorGeneration) || r.actorGeneration<1 ||
              !Number.isInteger(r.lastPeriod) || r.lastPeriod<0 || r.lastPeriod>Math.floor(s.turn/90)) fail(d.id,V.routes);
          r.routes.forEach(function (route,i) {
            if (!plain(route) || route.from!==d.routes[i].from || route.to!==d.routes[i].to ||
                !Number.isInteger(route.planned) || !Number.isInteger(route.moved) || route.moved<0 || route.planned<route.moved ||
                r.result==='completed' && route.moved!==route.planned) fail(d.id,V.routes);
          });
        } else if (r.actorId!==null || r.actorGeneration!==null || r.lastPeriod!==null || r.phase===V.active) fail(d.id,V.routes);
      }};
  }, 'js/story_agreements.js', migrationDefinition);
})();
