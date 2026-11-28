/* Reusable bilateral cession and conserved civilian relocation stories.
   Dates open opportunities. Consent and current world facts establish outcomes. */
(function () {
  'use strict';
  function plain(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function ruler(s, rid) { return FB.stories.ruler(s, rid); }
  function generation(s, rid) { return FB.realmRulerGeneration(s, rid); }
  function cast(s, ref) { return FB.stories.resolve(s, ref); }
  function fail(id, key) { throw new Error(FB.T('Invalid v4 save field at {path}.', { path:'state.stories.' + id + '.' + key })); }
  function finish(s, r, result, reason) {
    r.phase = 'resolved'; r.result = result; r.reason = reason; r.outcomeTurn = s.turn;
  }
  function common(def) {
    if (!plain(def) || typeof def.name !== 'string' || typeof def.desc !== 'string' ||
        !Number.isInteger(def.firstYear) || !Number.isInteger(def.lastYear) || def.lastYear < def.firstYear)
      throw new Error('Invalid agreement story declaration.');
    Object.keys(FBDATA.bookmarks).forEach(function (id) {
      FB.bookmarkRevisions(id).forEach(function (bm) {
        if ((bm.stories || []).indexOf(def.id) < 0) return;
        var counties = {}, realms = {};
        (bm.provinces || []).forEach(function (p) { if (!p.wasteland) counties[p.id] = true; });
        (bm.realms || []).forEach(function (r) { realms[r.id] = true; });
        if (!def.actor || !realms[def.actor.realmId] || def.source && !realms[def.source.realmId] ||
            (def.countyIds || []).concat(def.retainedCountyIds || []).some(function (pid) { return !counties[pid]; }) ||
            (def.routes || []).some(function (r) { return !r || !counties[r.from] || !counties[r.to]; }) ||
            (def.conditions || []).some(function (c) { return !c || c.kind === 'owner' && (!counties[c.provinceId] || !realms[c.realmId]); }))
          throw new Error('Agreement parties and counties must resolve in the owning bookmark.');
      });
    });
  }
  function text(s, d, field) { return FB.dataText(s, null, 'storyCampaign', d.id, d, field, {}); }
  function conditionHolds(s, c) {
    if (c.kind === 'owner') return s.owner[c.provinceId] === c.realmId;
    if (c.kind === 'story_result') {
      var rec = FB.stories.record(s, c.storyId);
      return !!rec && rec.phase === 'resolved' && rec.result === c.result;
    }
    return false;
  }
  function conditions(s, d) {
    return (d.conditions || []).every(function (c) { return conditionHolds(s, c); });
  }
  /* Presentation shared by both types. Names are live display text. */
  function realmName(s, rid) { return s.realms[rid] ? s.realms[rid].name : FB.T('No current court'); }
  function countyName(pid) { return FB.world.byId[pid].name; }
  function countyList(ids) {
    return ids.filter(function (pid, i) { return ids.indexOf(pid) === i; }).map(countyName).join(', ');
  }
  function rendered(s, message) {
    return FB.renderMessage(message, { state:s, viewer:s.player && s.player.charId });
  }
  function dateBlocker(s, d, opens) {
    return s.date.year > d.lastYear ? FB.T('Closed after {year}.', { year:d.lastYear }) :
      FB.T('Opens in {year}.', { year:opens });
  }
  // The first unmet condition: the holding or the earlier story it still needs.
  function conditionBlocker(s, d) {
    var c = (d.conditions || []).filter(function (row) { return !conditionHolds(s, row); })[0];
    if (!c) return null;
    if (c.kind === 'owner') return FB.T('{realm} must hold {county}.',
      { realm:realmName(s, c.realmId), county:countyName(c.provinceId) });
    var story = FB.stories.get(c.storyId);
    if (!story) return null;
    var p = { story:story.title ? story.title(s, FB.stories.record(s, c.storyId)) : c.storyId };
    if (c.result === 'won') return FB.T('Opens after {story} succeeds.', p);
    return c.result === 'failed' ? FB.T('Opens after {story} fails.', p) : FB.T('Opens after {story} ends.', p);
  }
  function definitionConditions(def) {
    if (def.conditions !== undefined && (!Array.isArray(def.conditions) || def.conditions.some(function (c) {
      return !plain(c) || c.kind === 'owner' && (typeof c.provinceId !== 'string' || typeof c.realmId !== 'string') ||
        c.kind === 'story_result' && (!(def.requires || []).includes(c.storyId) || typeof c.result !== 'string') ||
        ['owner','story_result'].indexOf(c.kind) < 0;
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
  function partyChanged(s, r, d, rid) {
    var actor = rid === d.actor.realmId, person = ruler(s, rid);
    return !person || person.dead || !s.realms[rid] || !s.realms[rid].alive ||
      person.id !== (actor ? r.actorId : r.sourceId) ||
      generation(s, rid) !== (actor ? r.actorGeneration : r.sourceGeneration) ||
      actor && !!d.actor.character && cast(s, d.actor.character) !== person.id;
  }
  function treatyChanged(s, r, d) {
    return partyChanged(s, r, d, d.actor.realmId) || partyChanged(s, r, d, d.source.realmId);
  }
  // The first county not held directly by the court the agreement expects.
  function treatyGap(s, r, d) {
    function gap(ids, rid) {
      var pid = ids.filter(function (id) { return s.owner[id] !== rid || FB.settlementCountyHolder(s, id) !== rid; })[0];
      return pid ? { provinceId:pid, realmId:rid } : null;
    }
    return gap(d.countyIds, r.ceded ? d.actor.realmId : d.source.realmId) ||
      gap(d.retainedCountyIds, d.source.realmId);
  }
  function treatyTerritory(s, r, d) { return !treatyGap(s, r, d); }
  /* The first failing check of a refused quote, in the order the quote tests
     them. A closed offer or an outside court has no code. */
  function treatyReason(s, r, d, rid, choice) {
    if (r.phase !== 'pending' || [d.actor.realmId,d.source.realmId].indexOf(rid) < 0) return null;
    if (s.date.year < d.firstYear || s.date.year > d.lastYear || s.turn < (d.firstTurn || 0)) return 'date';
    if (treatyChanged(s, r, d)) return 'party_changed';
    if (choice !== 'approve') return null;
    if (!treatyTerritory(s, r, d)) return 'territory';
    if (!conditions(s, d)) return 'condition';
    if (FB.isRealmAtWar(s, d.actor.realmId) || FB.isRealmAtWar(s, d.source.realmId)) return 'war_ongoing';
    return FB.treasuryAvailable(s, d.actor.realmId) >= d.tribute ? null : 'funds';
  }
  function treatyQuote(s, r, d, rid, choice) {
    choice = choice || 'approve';
    var allowed = r.phase === 'pending' && [d.actor.realmId,d.source.realmId].indexOf(rid) >= 0 &&
      s.date.year >= d.firstYear && s.date.year <= d.lastYear && s.turn >= (d.firstTurn || 0) &&
      !treatyChanged(s, r, d) && (choice === 'decline' || treatyTerritory(s, r, d) && conditions(s, d) &&
      !FB.isRealmAtWar(s, d.actor.realmId) && !FB.isRealmAtWar(s, d.source.realmId) &&
      FB.treasuryAvailable(s, d.actor.realmId) >= d.tribute) && ['approve','decline'].indexOf(choice) >= 0;
    return { allowed:!!allowed, id:choice, realmId:rid,
      reason:allowed ? null : treatyReason(s, r, d, rid, choice),
      stamp:JSON.stringify([choice, s.turn, r, d, ruler(s, d.actor.realmId), ruler(s, d.source.realmId),
        d.countyIds.concat(d.retainedCountyIds).map(function (pid) { return [s.owner[pid],FB.settlementCountyHolder(s,pid)]; }),
        FB.treasuryAvailable(s, d.actor.realmId), allowed]) };
  }
  function treatyTerms(s, d) {
    return [FB.T('Annual tribute: {money:amount}.', { amount:d.tribute }),
      FB.T('Ceded counties: {counties}.', { counties:countyList(d.countyIds) }),
      FB.T('Retained counties: {counties}.', { counties:countyList(d.retainedCountyIds) })];
  }
  // The actor receives the counties and pays; the source grants them.
  function treatyParams(s, d) {
    return { counties:countyList(d.countyIds), retained:countyList(d.retainedCountyIds), amount:d.tribute,
      days:d.intervalDays, recipient:realmName(s, d.actor.realmId), source:realmName(s, d.source.realmId) };
  }
  function treatyChoices(s, d) {
    var p = treatyParams(s, d), yearly = d.intervalDays === 360, label, detail;
    if (d.actor.realmId === 'player') {
      label = yearly ? FB.T('Take {counties} for {money:amount} a year', p) :
        FB.T('Take {counties} for {money:amount} every {days} days', p);
      detail = FB.T('{first} {second}', {
        first:rendered(s, FB.msg('fx.ui.story_agreement_take', { forms:{ select:'plural', param:'count', cases:{
          one:'You pay {source} {money:amount} now and every {days} days; {counties} becomes yours once both courts agree.',
          other:'You pay {source} {money:amount} now and every {days} days; {counties} become yours once both courts agree.' } } },
          Object.assign({ count:d.countyIds.length }, p))),
        second:rendered(s, FB.msg('fx.ui.story_agreement_retained', { forms:{ select:'plural', param:'count', cases:{
          one:'{retained} stays with {source}.', other:'{retained} stay with {source}.' } } },
          Object.assign({ count:d.retainedCountyIds.length }, p))) });
    } else {
      label = yearly ? FB.T('Cede {counties} for {money:amount} a year', p) :
        FB.T('Cede {counties} for {money:amount} every {days} days', p);
      detail = FB.T('{first} {second}', {
        first:FB.T('{recipient} pays you {money:amount} now and every {days} days and takes {counties} once both courts agree.', p),
        second:FB.T('You keep {retained}.', p) });
    }
    return [{ id:'approve', label:label, detail:detail },
      { id:'decline', label:FB.T('Refuse the agreement'), detail:FB.T('No payment and no transfer; the offer closes.') }];
  }
  /* One specific sentence for each refusal code; without a code, one general
     sentence. */
  function treatyBlocker(s, r, d, reason) {
    var actor = d.actor.realmId, source = d.source.realmId, rid, found = null;
    if (reason === 'date') return dateBlocker(s, d,
      d.firstTurn ? Math.max(d.firstYear, FB.dateAtTurn(s, d.firstTurn).year) : d.firstYear);
    if (reason === 'party_changed') {
      rid = partyChanged(s, r, d, actor) ? actor : source;
      found = s.realms[rid] && s.realms[rid].alive ?
        FB.T('{realm} has a new ruler; the agreement lapsed.', { realm:realmName(s, rid) }) :
        FB.T('{realm} has fallen; the agreement lapsed.', { realm:realmName(s, rid) });
    } else if (reason === 'territory') {
      var gap = treatyGap(s, r, d);
      if (gap) found = FB.T('{realm} must hold {county} directly.',
        { realm:realmName(s, gap.realmId), county:countyName(gap.provinceId) });
    } else if (reason === 'condition') found = conditionBlocker(s, d);
    else if (reason === 'war_ongoing') {
      rid = FB.isRealmAtWar(s, actor) ? actor : source;
      found = FB.T('{realm} is at war.', { realm:realmName(s, rid) });
    } else if (reason === 'funds') found = FB.T('{realm} holds {money:funds}; the first payment is {money:amount}.',
      { realm:realmName(s, actor), funds:FB.treasuryAvailable(s, actor), amount:d.tribute });
    return found || treatyClosedText();
  }
  function treatyClosedText() { return FB.T('This agreement is no longer open to your court.'); }
  function treatyEnding(s, r, d) {
    var p = treatyParams(s, d);
    if (r.reason === 'declined') return FB.T('the offer was refused');
    if (r.reason === 'window_closed') return FB.T('the offer closed after {year}', { year:d.lastYear });
    if (r.reason === 'incompatible_territory') return FB.T('{source} no longer holds the offered land directly', p);
    if (r.reason === 'changed_party') return FB.T('a court changed rulers or fell');
    if (r.reason === 'agreement_scope_lost') return FB.T('the agreed holdings, conditions or peace were lost');
    if (r.reason === 'unpaid') return FB.T('{recipient} missed a payment', p);
    return FB.T('history took another course');
  }
  /* The shared story status shape (docs/designs/stories.md): a one-line stage
     for the Deeds card and labeled facts for the sheet. */
  function treatyStatus(s, r, d) {
    var p = treatyParams(s, d), actor = d.actor.realmId, source = d.source.realmId, stage, now;
    if (r.phase === 'resolved') {
      stage = FB.T('Ended: {result}', { result:treatyEnding(s, r, d) });
      now = r.ceded ? FB.T('No further tribute is due; transferred land stays with its current holder.') :
        FB.T('No payment was made and no land moved.');
    } else if (r.phase === 'active') {
      stage = d.intervalDays === 360 ? FB.T('{recipient} pays {money:amount} a year for {counties}', p) :
        FB.T('{recipient} pays {money:amount} every {days} days for {counties}', p);
      var due = FB.dateAtTurn(s, r.paidThroughTurn + d.intervalDays);
      now = FB.T('The next payment of {money:amount} is due {date}.', { amount:d.tribute,
        date:FB.T('{season} {year}, day {day}', { season:FB.seasonName(due.season), year:due.year, day:due.day }) });
    } else {
      // The player's own unanswered consent comes first, then the actor's.
      var own = actor === 'player' ? actor : source === 'player' ? source : null;
      var waiting = own && r.approvals[own] === undefined ? own :
        r.approvals[actor] === undefined ? actor : source;
      var other = { other:realmName(s, waiting) };
      stage = waiting === 'player' ? FB.T('Waiting for your answer') : FB.T('Waiting for {other} to agree', other);
      var reason = treatyReason(s, r, d, waiting, 'approve');
      now = reason ? FB.T('Waiting: {reason}', { reason:treatyBlocker(s, r, d, reason) }) :
        waiting === 'player' ? FB.T('Ready for your answer.') : FB.T('{other} has not yet agreed.', other);
    }
    return { phase:r.phase, name:stage, stage:stage, lines:[], facts:[
      [FB.T('Your role'), actor === 'player' ? FB.T('Recipient') : source === 'player' ? FB.T('Grantor') : FB.T('Observer')],
      [FB.T('Counties'), p.counties],
      [FB.T('Kept by {source}', p), p.retained],
      [FB.T('Tribute'), FB.T('{money:amount} every {days} days', p)],
      [FB.T('Window'), FB.T('{first} to {last}', { first:d.firstYear, last:d.lastYear })],
      [FB.T('Now'), now]
    ] };
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
    r.ceded = true; r.phase = 'active';
    FB.news(s, FB.msg('news.agreement.cession',
      '📜 {recipient} and {source} consent to an island cession for {money:amount} in annual tribute. The source retains its named foothold.',
      { recipient:FB.realmNameParam(s, d.actor.realmId), source:FB.realmNameParam(s, d.source.realmId), amount:d.tribute }));
    return true;
  }
  function treatyDay(s, r, d) {
    if (r.phase === 'resolved') return;
    if (treatyChanged(s, r, d)) { finish(s, r, 'interrupted', 'changed_party'); return; }
    if (r.phase === 'pending') {
      if (s.date.year > d.lastYear) { finish(s, r, 'diverted', 'window_closed'); return; }
      if (s.date.year < d.firstYear || s.turn < (d.firstTurn || 0) || !conditions(s, d)) return;
      if (!treatyTerritory(s, r, d)) { finish(s, r, 'diverted', 'incompatible_territory'); return; }
      [d.actor.realmId,d.source.realmId].forEach(function (rid) {
        if (rid !== 'player' && !Object.prototype.hasOwnProperty.call(r.approvals, rid)) approve(s, r, d, rid);
      });
      return;
    }
    if (!treatyTerritory(s, r, d) || !conditions(s, d) || FB.isRealmAtWar(s, d.actor.realmId) || FB.isRealmAtWar(s, d.source.realmId)) {
      finish(s, r, 'interrupted', 'agreement_scope_lost'); return;
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
    if (!plain(d.actor) || !plain(d.source) || typeof d.actor.realmId !== 'string' || typeof d.source.realmId !== 'string' ||
        d.actor.realmId === d.source.realmId || !Number.isInteger(d.tribute) || d.tribute < 1 ||
        !Number.isInteger(d.intervalDays) || d.intervalDays < 1 ||
        d.firstTurn !== undefined && (!Number.isInteger(d.firstTurn) || d.firstTurn < 0) ||
        !Array.isArray(d.countyIds) || !d.countyIds.length || !Array.isArray(d.retainedCountyIds) || !d.retainedCountyIds.length ||
        d.countyIds.concat(d.retainedCountyIds).some(function (id, i, all) { return typeof id !== 'string' || !id || all.indexOf(id) !== i; }) ||
        d.actor.character && !FB.stories.referenceValid(d.actor.character, d))
      throw new Error('Invalid tribute cession declaration.');
  }
  FB.stories.registerType('tribute_cession', function (d) {
    treatyDefinition(d);
    return { id:d.id, kind:'world', requires:d.requires || [],
      init:function (s) { return treatyFresh(s, d); },
      day:function (s, r) { treatyDay(s, r, FB.stories.definition(s, d)); },
      title:function (s) { return text(s, d, 'name'); }, intro:function (s) { return text(s, d, 'desc'); },
      status:function (s, r) {
        if (r.phase === 'pending' && (s.date.year < d.firstYear || s.turn < (d.firstTurn || 0))) return null;
        return treatyStatus(s, r, FB.stories.definition(s, d));
      },
      choices:function (s, r) {
        var e = FB.stories.definition(s, d);
        if (r.phase !== 'pending' || [e.actor.realmId,e.source.realmId].indexOf('player') < 0 || r.approvals.player !== undefined) return [];
        return treatyChoices(s, e);
      },
      quote:function (s, r, id) {
        return treatyQuote(s, r, FB.stories.definition(s, d), 'player', id);
      },
      review:function (s) { return treatyTerms(s, FB.stories.definition(s, d)); },
      blocker:function (s, r, reason) {
        return s && r && reason ? treatyBlocker(s, r, FB.stories.definition(s, d), reason) : treatyClosedText();
      },
      apply:function (s, r, id, reviewed) {
        var e = FB.stories.definition(s, d), q = treatyQuote(s, r, e, 'player', id);
        if (!reviewed || reviewed.id !== id || !q.allowed || q.stamp !== reviewed.stamp) return false;
        if (id === 'decline') { finish(s, r, 'diverted', 'declined'); return true; }
        return id === 'approve' && approve(s, r, e, 'player', reviewed);
      },
      validate:function (r, s) {
        if (!plain(r) || ['pending','active','resolved'].indexOf(r.phase) < 0 || !plain(r.approvals) ||
            typeof r.ceded !== 'boolean' || !Number.isInteger(r.totalPaid) || r.totalPaid < 0 ||
            r.phase === 'resolved' && (['interrupted','diverted','breached'].indexOf(r.result) < 0 ||
              typeof r.reason !== 'string' || !Number.isInteger(r.outcomeTurn) || r.outcomeTurn < 0) ||
            r.phase !== 'resolved' && (r.result !== null || r.reason !== null || r.outcomeTurn !== null)) fail(d.id, 'phase');
        var e = FB.stories.definition(s, d);
        if (typeof r.actorId !== 'string' || !s.chars[r.actorId] || typeof r.sourceId !== 'string' || !s.chars[r.sourceId] ||
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
            r.acceptedTurn !== null || r.paidThroughTurn !== null || r.totalPaid !== 0 || r.phase === 'active') fail(d.id, 'payment');
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
  /* The first unmet readiness check, in the order migrationReady tests them. */
  function migrationReason(s, r, d) {
    if (r.phase !== 'pending' || d.actor.realmId !== 'player') return null;
    if (s.date.year < d.firstYear || s.date.year > d.lastYear) return 'date';
    if (!conditions(s, d)) return 'condition';
    var person = ruler(s, d.actor.realmId);
    if (!s.realms[d.actor.realmId] || !s.realms[d.actor.realmId].alive || !person || person.dead) return 'no_ruler';
    if (FB.isRealmAtWar(s, d.actor.realmId)) return 'war_ongoing';
    return routeGap(s, d) ? 'route' : null;
  }
  function routeGap(s, d) {
    var ends = [];
    d.routes.forEach(function (route) { ends.push(route.from, route.to); });
    return ends.filter(function (pid) { return s.owner[pid] !== d.actor.realmId; })[0] || null;
  }
  function migrationQuote(s, r, d, id) {
    var allowed = r.phase === 'pending' && d.actor.realmId === 'player' && migrationReady(s, d) && ['authorize','decline'].indexOf(id) >= 0;
    return { id:id, allowed:!!allowed, reason:allowed ? null : migrationReason(s, r, d),
      stamp:JSON.stringify([s.turn,r,d,generation(s,d.actor.realmId),
        d.routes.map(function (route) { return [s.owner[route.from],s.owner[route.to], FB.countyCommunities(s,route.from)]; }),allowed]) };
  }
  function migrationClosedText() { return FB.T('This evacuation is no longer open to your court.'); }
  function migrationBlocker(s, d, reason) {
    var found = null;
    if (reason === 'date') return dateBlocker(s, d, d.firstYear);
    if (reason === 'condition') found = conditionBlocker(s, d);
    else if (reason === 'no_ruler') found = FB.T('Your court has no living ruler.');
    else if (reason === 'war_ongoing') found = FB.T('You are at war.');
    else if (reason === 'route' && routeGap(s, d))
      found = FB.T('You must hold {county}.', { county:countyName(routeGap(s, d)) });
    return found || migrationClosedText();
  }
  function routeNames(routes, end) { return countyList(routes.map(function (route) { return route[end]; })); }
  // A share is authored as a fraction; one decimal keeps the percentage exact enough.
  function sharePercent(d) { return Math.round(d.share * 1000) / 10; }
  function migrationChoices(s, d) {
    var first = d.routes[0], more = d.routes.length - 1;
    var route = { from:countyName(first.from), to:countyName(first.to) };
    var batch = { count:d.batchSize, share:sharePercent(d) };
    return [{ id:'authorize',
      label:more ? rendered(s, FB.msg('fx.ui.story_migration_routes', { forms:{ select:'plural', param:'count', cases:{
        one:'Evacuate civilians from {from} to {to} and {count} more route',
        other:'Evacuate civilians from {from} to {to} and {count} more routes' } } },
        Object.assign({ count:more }, route))) :
        FB.T('Evacuate civilians from {from} to {to}', route),
      detail:rendered(s, more ? FB.msg('fx.ui.story_migration_batches', { forms:{ select:'plural', param:'count', cases:{
        one:'Each season up to {count} person moves on each route, at most {share}% of the community, at no cost. It stops if you lose a route {term:county} or go to war.',
        other:'Each season up to {count} people move on each route, at most {share}% of the community, at no cost. It stops if you lose a route {term:county} or go to war.' } } }, batch) :
        FB.msg('fx.ui.story_migration_batch', { forms:{ select:'plural', param:'count', cases:{
          one:'Each season up to {count} person moves, at most {share}% of the community, at no cost. It stops if you lose either {term:county} or go to war.',
          other:'Each season up to {count} people move, at most {share}% of the community, at no cost. It stops if you lose either {term:county} or go to war.' } } }, batch)) },
    { id:'decline', label:FB.T('Keep the civilians in {from}', { from:routeNames(d.routes, 'from') }),
      detail:FB.T('Nobody moves; the offer closes.') }];
  }
  function migrationStatus(s, r, d) {
    function total(field) { return r.routes.reduce(function (n,route) { return n + route[field]; }, 0); }
    var progress = r.routes.length ? FB.T('{moved} of {planned} moved to {to}',
      { moved:total('moved'), planned:total('planned'), to:routeNames(d.routes, 'to') }) : null;
    var stage = r.phase === 'pending' ? FB.T('Ready: civilians wait to leave {from}', { from:routeNames(d.routes, 'from') }) :
      r.phase === 'active' ? progress : FB.T('Ended');
    return { phase:r.phase, name:stage, stage:stage, lines:r.phase === 'resolved' && progress ? [progress] : [] };
  }
  function migrationDay(s, r, d) {
    if (r.phase === 'resolved') return;
    if (r.phase === 'pending') {
      if (s.date.year > d.lastYear) { finish(s,r,'diverted','window_closed'); return; }
      if (!migrationReady(s,d) || d.actor.realmId === 'player' && r.playerDecision !== 'authorize') return;
      var commander = FB.materializeRealmRuler(s,d.actor.realmId) || ruler(s,d.actor.realmId);
      r.phase = 'active'; r.actorId = commander.id; r.actorGeneration = generation(s,d.actor.realmId);
      r.routes = d.routes.map(function (route) {
        var eligible = FB.countyCommunities(s,route.from).filter(function (c) {
          return c.culture === d.community.culture && c.religion === d.community.religion;
        }).reduce(function (n,c) { return n+c.count; },0);
        return { from:route.from,to:route.to,planned:Math.floor(eligible*d.share),moved:0 };
      });
      FB.stories.observe(s, d.id);
    }
    if (!s.realms[d.actor.realmId] || !s.realms[d.actor.realmId].alive ||
        !ruler(s,d.actor.realmId) || ruler(s,d.actor.realmId).dead || ruler(s,d.actor.realmId).id !== r.actorId ||
        generation(s,d.actor.realmId) !== r.actorGeneration || !conditions(s,d) ||
        r.routes.some(function (route) { return s.owner[route.from] !== d.actor.realmId || s.owner[route.to] !== d.actor.realmId; })) {
      finish(s,r,'interrupted','changed_route_or_court'); return;
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
    if (exhausted) { finish(s,r,'interrupted','source_exhausted'); return; }
    if (r.routes.every(function (route) { return route.moved === route.planned; })) finish(s,r,'completed','cohorts_relocated');
  }
  function migrationDefinition(d) {
    common(d); definitionConditions(d);
    if (!plain(d.actor) || typeof d.actor.realmId !== 'string' || !plain(d.community) ||
        !FBDATA.cultures[d.community.culture] || !FB.faithAssignable(d.community.religion,null) ||
        !Number.isFinite(d.share) || d.share <= 0 || d.share > 1 || !Number.isInteger(d.batchSize) || d.batchSize < 1 ||
        !Array.isArray(d.routes) || !d.routes.length || d.routes.some(function (r,i) {
          return !plain(r) || typeof r.from !== 'string' || typeof r.to !== 'string' || r.from === r.to ||
            d.routes.some(function (other,j) { return j<i && other.from === r.from; });
        })) throw new Error('Invalid civilian migration declaration.');
  }
  var eventArgs = {type:'object',fields:{
    storyId:{type:'string',minLength:1,maxLength:80,optional:true},
    action:{enum:['authorize','decline']}
  },test:function (a,c) { return FB.stories.eventReviewCandidate('civilian_migration',a,c); }};
  function eventSource(s,a,ctx) {
    return FB.stories.eventReviewSource(s,'civilian_migration',a,ctx,function (state,m) {
      return FB.stories.choices(state,m.id).filter(function (v) { return v.id === a.action; })[0];
    });
  }
  function eventQuote(s,a,ctx) {
    var source = eventSource(s,a,ctx), person = s.chars[s.player.charId];
    if (!source || !ctx.storyReviewSource || !person || !ctx.participants || ctx.participants.civil_ruler !== person.id || person.dead ||
        person.captive || person.imprisoned || person.prisonerOf ||
        s.player.dead || s.player.flags && s.player.flags.in_prison ||
        FB.justiceCustodyOf && FB.justiceCustodyOf(s,person.id) ||
        FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(s,person.id) ||
        !s.realms.player || !s.realms.player.alive || !FB.station.rulesRealm(s.player,s)) return null;
    var q = FB.stories.quote(s,source.storyId,source.choiceId);
    return {allowed:!!q.allowed,source:source,review:q};
  }
  FB.eventStateReaders.register({id:'civilian_migration_review',system:'story_tracks',args:eventArgs,
    read:function (s,a) { var source=eventSource(s,a,{});return !!(source && FB.stories.quote(s,source.storyId,source.choiceId).allowed); }});
  FB.eventReviews.register('civilian_migration',{owner:'story_tracks',args:eventArgs,partySlots:{civil_ruler:true},
    bind:function (s,a,ctx) { var source=eventSource(s,a,ctx);return source ?
      {storyReviewSource:source,participants:{civil_ruler:s.player.charId}} : null; },
    quote:eventQuote,
    apply:function (s,a,q) { return FB.stories.apply(s,q.source.storyId,q.source.choiceId,q.review); },
    details:function (s,a,q) {
      var m=FB.stories.get(q.source.storyId),d=FB.stories.definition(s,m.declaration);
      var lines=[a.action === 'decline' ? FB.T('Nobody leaves {from}.',{from:routeNames(d.routes,'from')}) :
        FB.T('Civilians move from {from} to {to}; no army moves.',
          {from:countyName(d.routes[0].from),to:countyName(d.routes[0].to)}),
        rendered(s,FB.msg('fx.ui.story_migration_share',{forms:{select:'plural',param:'count',cases:{
          one:'Up to {share}% of the community, at most {count} person each season.',
          other:'Up to {share}% of the community, at most {count} people each season.'}}},
          {count:d.batchSize,share:sharePercent(d)})),
        FB.T('No cost.')];
      if (!q.allowed) lines.push(m.blocker(s,FB.stories.record(s,q.source.storyId),q.review.reason));
      // The first route is named above; any further routes follow.
      return lines.concat(d.routes.slice(1).map(function(route) {
        return FB.T('Civilian route: {from} to {to}.',{from:countyName(route.from),to:countyName(route.to)});
      }));
    }});
  FB.stories.registerType('civilian_migration',function (d) {
    migrationDefinition(d);
    return { id:d.id,kind:'world',requires:d.requires || [],init:migrationFresh,
      day:function (s,r) { migrationDay(s,r,FB.stories.definition(s,d)); },
      title:function (s) { return text(s,d,'name'); },intro:function (s) { return text(s,d,'desc'); },
      status:function (s,r) {
        var e=FB.stories.definition(s,d);
        if (r.phase === 'pending' && !migrationReady(s,e)) return null;
        return migrationStatus(s,r,e);
      },
      choices:function (s,r) {
        if (r.phase !== 'pending' || FB.startRealmId(s,d.actor.realmId) !== 'player') return [];
        return migrationChoices(s,FB.stories.definition(s,d));
      },
      quote:function (s,r,id) { return migrationQuote(s,r,FB.stories.definition(s,d),id); },
      blocker:function (s,r,reason) {
        return s && reason ? migrationBlocker(s,FB.stories.definition(s,d),reason) : migrationClosedText();
      },
      apply:function (s,r,id,reviewed) {
        var e=FB.stories.definition(s,d),q=migrationQuote(s,r,e,id);
        if (!reviewed || !q.allowed || q.id!==reviewed.id || q.stamp!==reviewed.stamp) return false;
        r.playerDecision=id;
        if (id==='decline') finish(s,r,'diverted','declined'); else migrationDay(s,r,e);
        return true;
      },
      validate:function (r,s) {
        if (!plain(r) || ['pending','active','resolved'].indexOf(r.phase)<0 || !Array.isArray(r.routes) ||
            r.playerDecision!==null && ['authorize','decline'].indexOf(r.playerDecision)<0 ||
            r.phase==='resolved' && (['completed','interrupted','diverted'].indexOf(r.result)<0 ||
              !Number.isInteger(r.outcomeTurn) || r.outcomeTurn<0 || typeof r.reason!=='string') ||
            r.phase!=='resolved' && (r.result!==null || r.outcomeTurn!==null || r.reason!==null)) fail(d.id,'phase');
        if (r.routes.length) {
          if (r.routes.length!==d.routes.length || typeof r.actorId!=='string' || !s.chars[r.actorId] ||
              !Number.isInteger(r.actorGeneration) || r.actorGeneration<1 ||
              !Number.isInteger(r.lastPeriod) || r.lastPeriod<0 || r.lastPeriod>Math.floor(s.turn/90)) fail(d.id,'routes');
          r.routes.forEach(function (route,i) {
            if (!plain(route) || route.from!==d.routes[i].from || route.to!==d.routes[i].to ||
                !Number.isInteger(route.planned) || !Number.isInteger(route.moved) || route.moved<0 || route.planned<route.moved ||
                r.result==='completed' && route.moved!==route.planned) fail(d.id,'routes');
          });
        } else if (r.actorId!==null || r.actorGeneration!==null || r.lastPeriod!==null || r.phase==='active') fail(d.id,'routes');
      }};
  }, 'js/story_agreements.js', migrationDefinition);
})();
