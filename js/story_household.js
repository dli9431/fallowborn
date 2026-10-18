/* Bounded household graphs. Content, places and historical outcomes belong to data. */
(function () {
  'use strict';
  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function plain(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function slug(v) { return typeof v === 'string' && /^[a-z][a-z0-9_]*$/.test(v); }
  function keys(o, allowed) { return plain(o) && Object.keys(o).every(function (k) { return allowed.indexOf(k) >= 0; }); }
  function integer(v) { return Number.isInteger(v) && v >= 0; }
  function calendarDay(v) {
    return Array.isArray(v) && v.length === 3 && integer(v[0]) && v[0] <= 10000 &&
      integer(v[1]) && v[1] < 4 && integer(v[2]) && v[2] >= 1 && v[2] <= 90
      ? v[0] * 360 + v[1] * 90 + v[2] - 1 : null;
  }
  function present(s) { return s.player.travel && s.player.travel.participationId && FB.expeditionParticipants && FB.expeditionParticipants.location(s) ||
    (s.player.travel ? s.player.travel.currentId : s.player.provinceId); }
  function sovereign(s, id) { return s.owner[id] ? FB.topRealm(s, s.owner[id]) : null; }
  function living(s) { var c = s.chars[s.player.charId]; return !!c && !c.dead && !s.player.dead; }
  function shadow(s) { return Object.assign({}, s, { player:JSON.parse(JSON.stringify(s.player)) }); }
  function dayOperation(op) {
    return op.kind === 'start_job' || op.kind === 'work_job' || op.kind === 'spend_day' ||
      op.kind === 'settle_job' && op.resolution === 'hearing';
  }
  function freeDay(s) {
    var p = s.player, c = s.chars[p.charId], f = p.flags || {};
    return living(s) && FB.ageOf(c, s.date.year) >= 16 && !p.travel && !p.war && !f.in_prison &&
      !(FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(s, p.charId)) && !FB.atWarPersonally(s);
  }
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
    var parts = [householdId, event.source, event.milestone,
      event.provinceId, event.turn, event.before, event.after];
    if (own(event, 'siteId')) parts.push(event.siteId);
    return JSON.stringify(parts);
  }
  /* Resolve declared physical identities against the effective, detached world.
     Neither generated slot names nor travel-purpose ids are physical aliases. */
  var localityCache = null;
  function localityValid(location, bookmark) {
    if (!keys(location, ['provinceId','siteId']) || !slug(location.provinceId) || !slug(location.siteId) ||
        location.provinceId.length > 200 || location.siteId.length > 200) return false;
    if (!bookmark) return true;
    var provinces = bookmark.provinces || [], geographyId = FB.bookmarkGeography(bookmark);
    // Effective declarations are immutable. Cache by their arrays/catalogues,
    // not the transient wrapper returned for a retained bookmark revision.
    if (!localityCache || localityCache.provinces !== provinces || localityCache.geographyId !== geographyId ||
        localityCache.geographies !== FBDATA.geographies || localityCache.layouts !== FBDATA.settlementLayouts ||
        localityCache.sites !== FBDATA.settlementSites || localityCache.layout !== bookmark.settlementLayout || localityCache.id !== bookmark.id) {
      var geography = FB.geography(geographyId), physical = geography && geography.sites || FBDATA.settlementSites || {};
      var layouts = FBDATA.settlementLayouts || {}, layoutId = bookmark.settlementLayout !== undefined ? bookmark.settlementLayout :
        own(layouts, bookmark.id) ? bookmark.id : geography && geography.defaultLayout;
      var layout = layouts[layoutId], seeds = Object.create(null), counts = Object.create(null), resolved = Object.create(null);
      (geography && geography.provinces || []).forEach(function (p) { seeds[p.id] = p; });
      provinces.forEach(function (p) {
        var entries = p.settlements, seed = seeds[p.id];
        if (entries === undefined && !p._legacySettlementPresentation && layout && seed &&
            (p.x === undefined || p.x === seed.x) && (p.y === undefined || p.y === seed.y)) entries = layout[p.id];
        (Array.isArray(entries) ? entries : []).forEach(function (entry) {
          if (!entry || !own(physical, entry.site)) return;
          counts[entry.site] = (counts[entry.site] || 0) + 1;
          if (!p.wasteland && !entry.fill) resolved[entry.site] = p.id;
        });
      });
      localityCache = { provinces:provinces, geographyId:geographyId, geographies:FBDATA.geographies,
        layouts:FBDATA.settlementLayouts, sites:FBDATA.settlementSites, layout:bookmark.settlementLayout, id:bookmark.id,
        counts:counts, resolved:resolved };
    }
    return localityCache.counts[location.siteId] === 1 && localityCache.resolved[location.siteId] === location.provinceId;
  }
  function atLocality(s, location) {
    if (!localityValid({ provinceId:location.provinceId, siteId:location.siteId }, FB.campaignBookmark(s))) return false;
    var p = s.player, info = FB.world.sitesByProv && FB.world.sitesByProv[location.provinceId];
    var site = info && integer(p.homeSettlement) && info.list[p.homeSettlement];
    return living(s) && !p.travel && !p.war && !(FB.atWarPersonally && FB.atWarPersonally(s)) && !(p.flags && p.flags.in_prison) &&
      !(FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(s, p.charId)) &&
      p.provinceId === location.provinceId && !!site && site.authored && site.site === location.siteId && FB.siteVisible(s, site);
  }
  function localSource(context, sourceId, milestone, location) {
    var source = context.get(sourceId);
    return !!source && sourceId.length <= 200 && slug(milestone) && milestone.length <= 200 &&
      typeof source.householdEvents === 'function' && (source.householdLocalities || []).some(function (e) {
      return e.milestone === milestone && e.provinceId === location.provinceId && e.siteId === location.siteId;
    });
  }
  function localEvents(s, sourceId) {
    var source = FB.stories.get(sourceId), t = FB.stories.record(s, sourceId);
    if (!source || !t || typeof source.householdEvents !== 'function') return [];
    return source.householdEvents(s, t).filter(function (e) {
      return keys(e, ['source','milestone','provinceId','siteId','turn','before','after']) && e.source === sourceId &&
        Number.isSafeInteger(e.turn) && e.turn >= 0 && e.turn <= s.turn && e.before === null && e.after === null &&
        localSource(FB.stories, sourceId, e.milestone, e) &&
        localityValid({ provinceId:e.provinceId, siteId:e.siteId }, FB.campaignBookmark(s));
    });
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
    localityValid:localityValid, atLocality:atLocality, localSource:localSource, localEvents:localEvents,
    commitDay:function (s, action) {
      var story = FB.stories.get(action.storyId), t = FB.stories.record(s, action.storyId);
      return !!(story && t && story.declaration && story.declaration.type === 'household_track' &&
        story.apply(s, t, action.choiceId, action.reviewed, true));
    },
    focusPaid:function (s, focusId, amount) {
      if (!(amount > 0)) return;
      FB.stories.list().forEach(function (story) {
        var t = FB.stories.record(s, story.id);
        if (t && story.householdFocusPaid) story.householdFocusPaid(s, t, focusId, amount);
      });
    },
    owner:function (s, key, reserveLocal) {
      var list = FB.stories.list();
      for (var i = 0; i < list.length; i++) {
        var rec = FB.stories.record(s, list[i].id);
        if (rec && list[i].householdIncident && list[i].householdIncident(s, rec, key, reserveLocal)) return list[i].id;
      }
      return null;
    }
  };

  function validate(def, context, bookmark) {
    function need(ok, field) { if (!ok) throw new Error('Invalid household track: ' + field + '.'); }
    need(keys(def, ['id','type','title','intro','homeProvinceId','continuity','interruptedStage','initialStage',
      'stages','jobs','requires','requirements','registrationBefore','registrationAfter','attachment']), 'fields');
    need(typeof def.title === 'string' && def.title.length > 0 && def.title.length <= 240 &&
      typeof def.intro === 'string' && def.intro.length <= 4000, 'presentation');
    need(slug(def.homeProvinceId) && ['household','protagonist'].indexOf(def.continuity) >= 0, 'home or continuity');
    need(plain(def.stages) && Object.keys(def.stages).length > 0 && Object.keys(def.stages).length <= 64 &&
      slug(def.initialStage) && own(def.stages, def.initialStage), 'stages');
    need(def.continuity === 'protagonist' ? slug(def.interruptedStage) && own(def.stages, def.interruptedStage) &&
      def.stages[def.interruptedStage].terminal === true : def.interruptedStage === undefined, 'interruption route');
    function focus(id) { return (FBDATA.focuses || []).some(function (f) { return f.id === id && f.vocational; }); }
    function dependency(id) { need((def.requires || []).indexOf(id) >= 0 && context.get(id), 'story dependency'); }
    var jobs = def.jobs || {};
    need(plain(jobs) && Object.keys(jobs).length <= 8, 'jobs');
    Object.keys(jobs).forEach(function (id) {
      var j = jobs[id], req = def.requirements || {};
      need(slug(id) && keys(j, ['payerRealmId','provinceId','days','fee','completionGold','settlementGold','expiresDays','yearMin','yearMax']), 'job fields');
      need(slug(j.payerRealmId) && slug(j.provinceId) && (req.realms || []).indexOf(j.payerRealmId) >= 0 &&
        (req.provinces || []).indexOf(j.provinceId) >= 0, 'job references');
      need(integer(j.days) && j.days >= 1 && j.days <= 30 && integer(j.fee) && j.fee >= 1 && j.fee <= 1000 &&
        integer(j.completionGold) && j.completionGold <= j.fee && integer(j.settlementGold) &&
        j.settlementGold <= j.fee - j.completionGold && integer(j.expiresDays) &&
        j.expiresDays >= j.days && j.expiresDays <= 360 && integer(j.yearMin) && integer(j.yearMax) &&
        j.yearMin <= j.yearMax && j.yearMax <= 10000, 'job bounds');
    });
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
      } else if (p.kind === 'calendar_window') {
        need(keys(p, ['kind','firstDay','lastDay']) && calendarDay(p.firstDay) !== null &&
          calendarDay(p.lastDay) !== null && calendarDay(p.firstDay) <= calendarDay(p.lastDay), 'calendar window');
      } else if (p.kind === 'job_state') {
        need(keys(p, ['kind','jobId','states']) && own(jobs, p.jobId) && Array.isArray(p.states) &&
          p.states.length > 0 && p.states.length <= 6 && p.states.every(function (v) {
            return ['missing','working','disputed','settled','cancelled','expired'].indexOf(v) >= 0;
          }), 'job state');
      } else if (p.kind === 'job_available' || p.kind === 'job_patron') {
        need(keys(p, ['kind','jobId']) && own(jobs, p.jobId), 'job condition');
      } else if (p.kind === 'civic_right') {
        need(keys(p, ['kind','realmId','provinceId','evidenceId']) && slug(p.realmId) && slug(p.provinceId) && slug(p.evidenceId), 'civic right');
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
      else if (op.kind === 'set_focus') need(keys(op, ['kind','focusId']) && focus(op.focusId), 'focus terms');
      else if (op.kind === 'household_expense') need(keys(op, ['kind','amount']) && Number.isFinite(op.amount) && op.amount > 0 && op.amount <= 100, 'expense terms');
      else if (op.kind === 'convert_faith') need(keys(op, ['kind','faithId','scope']) &&
        own(FBDATA.religions, op.faithId) && ['self','household'].indexOf(op.scope) >= 0, 'conversion terms');
      else if (op.kind === 'travel_site') {
        need(keys(op, ['kind','travelSiteId']) && (FBDATA.travelSites || []).some(function (site) {
          var purpose = FBDATA.travelPurposes[site.purpose];
          return site.id === op.travelSiteId && purpose && !purpose.targeted && purpose.mode === 'sites';
        }), 'travel terms');
      } else if (op.kind === 'settle_household') need(keys(op, ['kind']), 'settlement terms');
      else if (op.kind === 'spend_day') need(keys(op, ['kind']), 'day terms');
      else if (op.kind === 'start_job' || op.kind === 'work_job')
        need(keys(op, ['kind','jobId']) && own(jobs, op.jobId), 'work terms');
      else if (op.kind === 'settle_job') need(keys(op, ['kind','jobId','resolution']) && own(jobs, op.jobId) &&
        ['settlement','hearing','waive'].indexOf(op.resolution) >= 0, 'account terms');
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
      need(slug(id) && keys(stage, ['name','text','terminal','choices','transitions','incident','afterIncident','afterWork','localEvent']), 'stage fields');
      need(typeof stage.name === 'string' && stage.name.length > 0 && stage.name.length <= 240 &&
        typeof stage.text === 'string' && stage.text.length <= 4000, 'stage presentation');
      need(stage.terminal === undefined || stage.terminal === true, 'terminal');
      need(Array.isArray(stage.choices) && stage.choices.length <= 12 &&
        Array.isArray(stage.transitions) && stage.transitions.length <= 16, 'stage lists');
      need(!stage.terminal || !stage.choices.length && !stage.transitions.length, 'terminal routes');
      need(stage.afterWork === undefined || !stage.terminal && keys(stage.afterWork, ['focusId','provinceId','next']) &&
        focus(stage.afterWork.focusId) && slug(stage.afterWork.provinceId) && own(def.stages, stage.afterWork.next) && stage.afterWork.next !== id, 'work route');
      need(stage.terminal || stage.choices.length + stage.transitions.length > 0 || stage.afterWork, 'unfinished dead end');
      if (own(stage, 'localEvent')) {
        var local = stage.localEvent;
        need(keys(local, ['milestone','provinceId','siteId']) && def.id.length <= 200 && slug(local.milestone) && local.milestone.length <= 200 &&
          localityValid({ provinceId:local.provinceId, siteId:local.siteId }, bookmark) &&
          (def.requirements && def.requirements.provinces || []).indexOf(local.provinceId) >= 0, 'local event');
        need(!stage.terminal && !stage.incident && !stage.afterWork && stage.choices.length > 0 &&
          stage.choices.every(function (c) { return c.operation && c.operation.kind === 'record_decision'; }), 'local decision');
        need(!Object.keys(def.stages).some(function (other) {
          var e = other !== id && def.stages[other].localEvent;
          return e && e.milestone === local.milestone && e.provinceId === local.provinceId && e.siteId === local.siteId;
        }), 'duplicate local event');
      }
      if (stage.incident) {
        need(!stage.terminal && own(def.stages, stage.afterIncident) && stage.afterIncident !== id, 'incident closure route');
        var inc = stage.incident;
        need(keys(inc, ['source','provinceId','storyId','milestone','siteId']) && slug(inc.provinceId), 'incident');
        if (own(inc, 'siteId')) need(localityValid({ provinceId:inc.provinceId, siteId:inc.siteId }, bookmark) &&
          (def.requirements && def.requirements.provinces || []).indexOf(inc.provinceId) >= 0, 'incident locality');
        if (inc.source === 'local_story') {
          dependency(inc.storyId);
          need(own(inc, 'siteId') && localSource(context, inc.storyId, inc.milestone, inc), 'local source');
        } else if (inc.source === 'control') need(!inc.storyId && inc.milestone === 'rule_changed', 'control incident');
        else { need(inc.source === 'story' && !own(inc, 'siteId') && ['started','won','failed','diverted','interrupted'].indexOf(inc.milestone) >= 0, 'story incident'); dependency(inc.storyId); }
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
    if (own(def, 'attachment')) need(def.attachment === 'world' && !def.jobs &&
      Object.keys(def.stages).some(function (id) { return !!def.stages[id].localEvent; }) &&
      Object.keys(def.stages).every(function (id) { return def.stages[id].terminal || !!def.stages[id].localEvent; }), 'local world attachment');
    var reached = Object.create(null), pending = [def.initialStage];
    while (pending.length) {
      var id = pending.shift(); if (reached[id]) continue; reached[id] = true;
      def.stages[id].choices.concat(def.stages[id].transitions).forEach(function (r) { pending.push(r.next); });
      if (def.stages[id].afterIncident) pending.push(def.stages[id].afterIncident);
      if (def.stages[id].afterWork) pending.push(def.stages[id].afterWork.next);
      if (def.interruptedStage) pending.push(def.interruptedStage);
    }
    need(Object.keys(def.stages).every(function (id) { return reached[id]; }), 'unreachable stage');
    // Every stage must have a route to an explicit terminal, even in a cyclic graph.
    var finishes = Object.create(null);
    Object.keys(def.stages).forEach(function (id) { if (def.stages[id].terminal) finishes[id] = true; });
    for (var n = 0; n < 64; n++) Object.keys(def.stages).forEach(function (id) {
      if (finishes[def.stages[id].afterIncident] || def.stages[id].afterWork && finishes[def.stages[id].afterWork.next] ||
        def.stages[id].choices.concat(def.stages[id].transitions).some(function (r) { return finishes[r.next]; })) finishes[id] = true;
    });
    need(Object.keys(def.stages).every(function (id) { return finishes[id]; }), 'no terminal route');
    Object.keys(def.stages).forEach(function (origin) {
      if (!def.stages[origin].incident && !def.stages[origin].localEvent) return;
      var visited = Object.create(null), todo = def.stages[origin].choices.concat(def.stages[origin].transitions).map(function (r) { return r.next; });
      if (def.stages[origin].afterIncident) todo.push(def.stages[origin].afterIncident);
      while (todo.length) {
        var id = todo.pop(); need(id !== origin, 'incident cycle');
        if (visited[id]) continue; visited[id] = true;
        var stage = def.stages[id];
        stage.choices.concat(stage.transitions).forEach(function (r) { todo.push(r.next); });
        if (stage.afterIncident) todo.push(stage.afterIncident);
        if (stage.afterWork) todo.push(stage.afterWork.next);
      }
    });
  }

  function factory(def) {
    var controls = Object.create(null), places = Object.create(null), mobileRealms = Object.create(null);
    var localities = Object.keys(def.stages).filter(function (id) { return def.stages[id].localEvent; }).map(function (id) {
      return def.stages[id].localEvent;
    });
    var localVersion = localities.length || Object.keys(def.stages).some(function (id) {
      return def.stages[id].incident && own(def.stages[id].incident, 'siteId');
    }) ? 2 : 1;
    function scan(v) {
      if (!v || typeof v !== 'object') return;
      if (v.source === 'control') controls[v.provinceId] = true;
      if (v.provinceId) places[v.provinceId] = true;
      if (v.kind === 'mobile_state' || v.kind === 'mobile_work' || v.kind === 'travel_mobile') mobileRealms[v.realmId] = true;
      Object.keys(v).forEach(function (k) { scan(v[k]); });
    }
    scan(def.stages);
    scan(def.jobs);
    function payer(s, j) { return FB.startRealmId(s, j.payerRealmId); }
    function patron(s, t, id) {
      var j = def.jobs[id], rid = payer(s, j), r = s.realms[rid];
      var person = FB.stories.ruler(s, j.payerRealmId);
      return rid !== 'player' && !!r && r.alive && !!person && !person.dead &&
        !!t.jobPatrons && !!t.jobPatrons[id] && person.id === t.jobPatrons[id] && sovereign(s, j.provinceId) === rid;
    }
    function localJob(s, j) { return s.player.provinceId === j.provinceId && present(s) === j.provinceId; }
    function availableJob(s, t, id) {
      var j = def.jobs[id], rid = payer(s, j), r = s.realms[rid];
      return !!t.jobs && !own(t.jobs, id) && FB.station.isFree(s.player, s) && freeDay(s) && localJob(s, j) && patron(s, t, id) &&
        s.date.year >= j.yearMin && s.date.year <= j.yearMax &&
        !Object.keys(s.stories || {}).some(function (sid) {
          var jobs = s.stories[sid].jobs || {};
          return Object.keys(jobs).some(function (jid) { return jobs[jid].status === 'working'; });
        }) && s.treasuryAccounting && s.treasuryAccounting.mode === 'active' && r.treasury &&
        !r.treasury.retired && FB.treasuryAvailable(s, rid) >= j.fee;
    }
    function liveJob(s, t, id) {
      var j = def.jobs[id], row = t.jobs && t.jobs[id];
      return !!row && row.workerId === s.player.charId && freeDay(s) && localJob(s, j) &&
        patron(s, t, id) && row.payerId === payer(s, j) && s.turn < row.expiresTurn && s.date.year <= j.yearMax;
    }
    function payWorker(s, row, amount) {
      s.player.gold += amount; row.paid += amount; row.escrow -= amount;
    }
    function refund(s, row) {
      if (!row.escrow) return;
      var rid = row.payerId, visited = Object.create(null);
      while (rid && !visited[rid]) {
        visited[rid] = true;
        var r = s.realms[rid], a = r && r.treasury;
        if (a && a.retired) { rid = a.retirement && a.retirement.recipient; continue; }
        if (!s.treasuryAccounting || s.treasuryAccounting.mode !== 'active') return;
        if (FB.treasuryTransfer(s, null, rid, row.escrow)) {
          row.refunded += row.escrow; row.escrow = 0;
        }
        return;
      }
      // An absent recipient leaves a refundable balance in this saved escrow.
    }
    function finishJob(s, row, status, resolution, payment) {
      payWorker(s, row, payment); row.status = status; row.resolution = resolution;
      row.closedTurn = s.turn; refund(s, row);
    }
    function reconcileJobs(s, t) {
      Object.keys(t.jobs || {}).forEach(function (id) {
        var row = t.jobs[id], j = def.jobs[id];
        if (row.status !== 'working' && row.status !== 'disputed') { refund(s, row); return; }
        if (!liveJob(s, t, id)) {
          var expired = s.turn >= row.expiresTurn || s.date.year > j.yearMax;
          // Completed work earns its guaranteed fee; an interrupted shift contract
          // earns only its completed fraction of the undisputed component.
          var due = row.status === 'disputed' ? row.escrow : Math.floor(j.completionGold * row.daysWorked / j.days) - row.paid;
          finishJob(s, row, expired ? 'expired' : 'cancelled', 'interrupted', due); t.revision++;
        }
      });
    }
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
      if (p.kind === 'calendar_window') {
        var today = calendarDay([s.date.year, s.date.season, s.date.day]);
        return today !== null && today >= calendarDay(p.firstDay) && today <= calendarDay(p.lastDay);
      }
      if (p.kind === 'at_war') return FB.isRealmAtWar(s, sovereign(s, p.provinceId));
      if (p.kind === 'job_available') return availableJob(s, t, p.jobId);
      if (p.kind === 'job_patron') return patron(s, t, p.jobId);
      if (p.kind === 'job_state') return p.states.indexOf(t.jobs && t.jobs[p.jobId] ? t.jobs[p.jobId].status : 'missing') >= 0;
      if (p.kind === 'civic_right') {
        var rid = FB.startRealmId(s, p.realmId), civic = FB.civicGovernment.row(s, rid);
        return !!civic && civic.rights.some(function (r) { return r.evidenceId === p.evidenceId &&
          r.provinceId === p.provinceId && FB.civicGovernment.rightEffective(s, rid, r); });
      }
      var row = FB.stories.record(s, p.storyId);
      return !!row && p.values.indexOf(row[p.stateField]) >= 0;
    }
    function event(s, t, inc) {
      if (!inc) return null;
      if (inc.source === 'local_story') return localEvents(s, inc.storyId).filter(function (e) {
        return e.milestone === inc.milestone && e.provinceId === inc.provinceId && e.siteId === inc.siteId;
      })[0] || null;
      if (inc.source === 'control') {
        var o = t.controls[inc.provinceId];
        var current = sovereign(s, inc.provinceId);
        // World observers may run before this track's day hook. Project the
        // same transition without consuming or mutating the saved baseline.
        if (o && o.after !== current) o = { before:o.after, after:current, turn:s.turn };
        if (!o || o.turn === null) return null;
        var result = { source:inc.source, milestone:inc.milestone, provinceId:inc.provinceId, turn:o.turn, before:o.before, after:o.after };
        if (own(inc, 'siteId')) result.siteId = inc.siteId;
        return result;
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
      reconcileJobs(s, t);
      Object.keys(controls).forEach(function (id) {
        var current = sovereign(s, id), o = t.controls[id];
        if (o.after !== current) t.controls[id] = { before:o.after, after:current, turn:s.turn };
      });
      if (def.stages[t.phase].terminal) return;
      if (def.continuity === 'protagonist' && (!living(s) || t.actorId !== s.player.charId)) {
        close(s, t, def.stages[t.phase], 'expired'); move(s, t, def.interruptedStage); return;
      }
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
    function operation(s, op, t) {
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
      if (op.kind === 'set_focus') {
        var f = FB.focusStatus(s, op.focusId);
        return { allowed:f.can && !s.player.travel, reason:f.reason, terms:{ focusId:op.focusId, preview:f.preview } };
      }
      if (op.kind === 'household_expense') return { allowed:s.player.gold >= op.amount,
        reason:FB.T('The household needs the full expense in its private purse.'), terms:{ amount:op.amount } };
      if (op.kind === 'spend_day') return { allowed:freeDay(s), terms:null, reason:FB.T('A free action day at home is required.') };
      if (op.kind === 'start_job' || op.kind === 'work_job' || op.kind === 'settle_job') {
        var j = def.jobs[op.jobId], row = t.jobs && t.jobs[op.jobId], rid = payer(s, j);
        return { allowed:op.kind === 'start_job' ? availableJob(s, t, op.jobId) :
          liveJob(s, t, op.jobId) && row.status === (op.kind === 'work_job' ? 'working' : 'disputed'),
          reason:FB.T('The original living payer must still control this county. Work needs a free local day and a funded, unexpired contract.'),
          terms:{ definition:j, row:row || null, payerId:rid, rulerId:FB.stories.resolve(s, { kind:'realm_ruler', realmId:j.payerRealmId }),
            funds:FB.treasuryAvailable(s, rid), ready:freeDay(s), patron:patron(s, t, op.jobId), accounting:s.treasuryAccounting && s.treasuryAccounting.mode } };
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
      var op = choice ? operation(s, choice.operation, t) : { allowed:false, terms:null };
      var key = incident(s, t, stage), closed = key && receipt(s, key);
      var facts = { turn:s.turn, actor:s.player.charId, alive:living(s) && (def.continuity !== 'protagonist' || t.actorId === s.player.charId), phase:t.phase, revision:t.revision,
        home:s.player.provinceId, presence:present(s), funds:[s.player.gold,s.player.piety,s.player.prestige],
        travel:s.player.travel,
        control:Object.keys(places).map(function (pid) { return [pid,s.owner[pid],s.holder[pid],sovereign(s, pid)]; }),
        identity:[s.chars[s.player.charId].culture,s.chars[s.player.charId].religion],
        family:FB.householdMembers(s).map(function (c) { return [c.id,!!c.dead,c.religion,c.culture]; }),
        stageReady:!stage.transitions.some(function (r) { return test(s, r.when, t); }),
        local:(!stage.localEvent || atLocality(s, stage.localEvent)) && (!stage.incident ||
          (own(stage.incident, 'siteId') ? atLocality(s, stage.incident) :
            s.player.provinceId === stage.incident.provinceId && present(s) === stage.incident.provinceId)),
        when:!!choice && test(s, choice.when, t), spent:!!choice && choice.operation.kind === 'household_expense' && own(t.decisions, t.phase),
        incident:key, closed:closed || null, terms:op.terms,
        graph:def };
      if (Object.keys(mobileRealms).length) facts.mobile = Object.keys(mobileRealms).sort().map(function (rid) {
        return FB.mobile.householdSnapshot(s, FB.startRealmId(s, rid));
      });
      if (choice && choice.operation.kind === 'convert_faith') facts.modifier = FBDATA.modifiers && FBDATA.modifiers['zealot_unrest'];
      var location = stage.localEvent || stage.incident && own(stage.incident, 'siteId') && stage.incident;
      var requiredSite = location && localityName(location);
      return { id:id, allowed:!!choice && facts.alive && !facts.spent && facts.stageReady && facts.local && facts.when && op.allowed &&
        (!stage.incident || !!key && !closed), reason:requiredSite && !facts.local ?
          FB.T('This decision requires residence at {site}.', { site:requiredSite }) : op.reason || FB.T('The local situation has changed. Review the household again.'),
        facts:facts, stamp:JSON.stringify(facts) };
    }
    function localityName(location) {
      var info = FB.world.sitesByProv && FB.world.sitesByProv[location.provinceId];
      var site = info && info.list.filter(function (entry) { return entry.site === location.siteId; })[0];
      return site ? site.name : null;
    }
    function apply(s, t, id, reviewed, committingDay) {
      var q = quote(s, t, id);
      if (!q.allowed || !reviewed || reviewed.id !== id || reviewed.stamp !== q.stamp) return false;
      var stage = def.stages[t.phase], choice = stage.choices.filter(function (c) { return c.id === id; })[0], op = choice.operation;
      if (committingDay && !dayOperation(op)) return false;
      if (dayOperation(op) && !committingDay) {
        if (FB.state !== s || !FB.game || FB.game.observe || !FB.game.passDay) return false;
        var revision = t.revision;
        FB.game.passDay({ skipFocus:true, householdAction:{ storyId:def.id, choiceId:id, reviewed:reviewed } });
        return t.revision !== revision;
      }
      if (op.kind === 'start_job' || op.kind === 'work_job') {
        var j = def.jobs[op.jobId], row = t.jobs[op.jobId];
        if (op.kind === 'start_job') {
          var rid = payer(s, j);
          if (!FB.treasuryTransfer(s, rid, null, j.fee)) return false;
          row = t.jobs[op.jobId] = { payerId:rid, workerId:s.player.charId, openedTurn:s.turn,
            expiresTurn:s.turn + j.expiresDays, daysWorked:0, paid:0, refunded:0, escrow:j.fee,
            status:'working', resolution:null, closedTurn:null };
        }
        row.daysWorked++;
        if (row.daysWorked === j.days) {
          payWorker(s, row, j.completionGold);
          if (row.escrow) row.status = 'disputed';
          else finishJob(s, row, 'settled', 'completed', 0);
        }
      }
      if (op.kind === 'settle_job') {
        var job = t.jobs[op.jobId], terms = def.jobs[op.jobId];
        finishJob(s, job, 'settled', op.resolution,
          op.resolution === 'hearing' ? job.escrow : op.resolution === 'settlement' ? terms.settlementGold : 0);
      }
      if (op.kind === 'household_expense') s.player.gold -= op.amount;
      if (op.kind === 'set_focus') {
        FB.setFocus(s, op.focusId);
        if (s.player.focus !== op.focusId) return false;
      }
      if (op.kind === 'convert_faith' && !FB.applyConversion(s, 'faith', op.faithId, op.scope)) return false;
      if (op.kind === 'travel_site' && !FB.travelStart(s, q.facts.terms.purpose, q.facts.terms.destinationId, q.facts.terms.destinationRealm)) return false;
      if (op.kind === 'settle_household' && !FB.travelSettle(s)) return false;
      if (op.kind === 'mobile_work' && !FB.mobile.commit(s, q.facts.terms)) return false;
      if (op.kind === 'travel_mobile' && !FB.travelStart(s, q.facts.terms.purpose, q.facts.terms.destinationId, q.facts.terms.destinationRealm)) return false;
      if (op.kind === 'return_home' && !(s.player.travel.phase === 'arrived' ? FB.travelReturn(s) : FB.travelTurnBack(s))) return false;
      close(s, t, stage, 'resolved');
      t.decisions[t.phase] = { choiceId:id, turn:s.turn, actorId:s.player.charId };
      if (stage.localEvent) t.decisions[t.phase].locality = { provinceId:stage.localEvent.provinceId, siteId:stage.localEvent.siteId };
      move(s, t, choice.next); return true;
    }
    return { id:def.id, kind:def.attachment || 'track', requires:def.requires,
      householdLocalities:localities,
      householdEvents:function (s, t) {
        return Object.keys(def.stages).filter(function (id) { return def.stages[id].localEvent && own(t.decisions, id); }).map(function (id) {
          var e = def.stages[id].localEvent, d = t.decisions[id];
          return { source:def.id, milestone:e.milestone, provinceId:d.locality.provinceId, siteId:d.locality.siteId,
            turn:d.turn, before:null, after:null };
        });
      },
      appliesTo:function (s) { return living(s) && s.player.provinceId === def.homeProvinceId; },
      init:function (s) {
        var rows = {};
        Object.keys(controls).forEach(function (id) { rows[id] = { before:null, after:sovereign(s, id), turn:null }; });
        var rec = { version:localVersion, householdId:household(s), actorId:s.player.charId, phase:def.initialStage,
          revision:0, stageTurn:s.turn, decisions:{}, controls:rows, householdReceipts:{} };
        if (def.jobs) {
          rec.jobs = {}; rec.jobPatrons = {};
          Object.keys(def.jobs).forEach(function (id) {
            rec.jobPatrons[id] = FB.stories.resolve(s, { kind:'realm_ruler', realmId:def.jobs[id].payerRealmId });
          });
        }
        return rec;
      },
      title:function () { return FB.T(def.title); }, intro:function () { return FB.T(def.intro); },
      day:update, season:update, year:update,
      householdFocusPaid:function (s, t, focusId) {
        var stage = def.stages[t.phase], work = stage.afterWork, key = incident(s, t, stage);
        if (!work || !living(s) || def.continuity === 'protagonist' && t.actorId !== s.player.charId ||
          s.player.travel || work.focusId !== focusId || s.player.provinceId !== work.provinceId ||
          stage.incident && (!key || receipt(s, key) || (own(stage.incident, 'siteId') ? !atLocality(s, stage.incident) :
            s.player.provinceId !== stage.incident.provinceId || present(s) !== stage.incident.provinceId)) ||
          stage.transitions.some(function (r) { return test(s, r.when, t); })) return;
        close(s, t, stage, 'resolved'); move(s, t, work.next);
      },
      householdIncident:function (s, t, key, reserveLocal) {
        if (def.stages[t.phase].terminal || !living(s) || receipt(s, key)) return false;
        return Object.keys(def.stages).some(function (id) {
          var inc = def.stages[id].incident;
          return inc && (own(inc, 'siteId') ? reserveLocal || atLocality(s, inc) :
            s.player.provinceId === inc.provinceId && present(s) === inc.provinceId) && incident(s, t, def.stages[id]) === key;
        });
      },
      status:function (s, t) {
        var stage = def.stages[t.phase], lines = [FB.T(stage.text)];
        Object.keys(t.jobs || {}).forEach(function (id) {
          var row = t.jobs[id];
          lines.push(FB.T('Work: {days}/{total} action days. Paid: {paid} gold. Held: {held} gold. Refunded: {refunded} gold.',
            { days:row.daysWorked, total:def.jobs[id].days, paid:row.paid, held:row.escrow, refunded:row.refunded }));
        });
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
        var location = def.stages[t.phase].localEvent || def.stages[t.phase].incident;
        if (location && own(location, 'siteId') && op.kind === 'record_decision') return [
          FB.T('Required residence: {site}.', { site:localityName(location) || FB.T('Unavailable settlement') }),
          FB.T('Record this decision without a payment, grant or change of identity.')];
        if (op.kind === 'spend_day') return [FB.T('Spend one action day. Daily Focus income is replaced for that day.')];
        if (op.kind === 'start_job' || op.kind === 'work_job' || op.kind === 'settle_job') {
          var j = def.jobs[op.jobId], row = t.jobs && t.jobs[op.jobId];
          return [FB.T('Payer: {name}. Total reserved fee: {fee} gold for {days} action days.',
            { name:FB.fullName(FB.stories.ruler(s, j.payerRealmId)), fee:j.fee, days:j.days }),
          FB.T('Paid on completion: {gold} gold. Disputed balance: {balance} gold.', { gold:j.completionGold, balance:j.fee - j.completionGold }),
          FB.T('Completed working days: {days}. Payment already received: {gold} gold.', { days:row ? row.daysWorked : 0, gold:row ? row.paid : 0 }),
          op.kind === 'settle_job' ? FB.T('This choice pays {gold} gold from escrow. Unclaimed money returns to the payer.',
            { gold:op.resolution === 'hearing' ? row.escrow : op.resolution === 'settlement' ? j.settlementGold : 0 }) :
            FB.T('Work one day now, replacing Daily Focus income. Further shifts require another reviewed action.'),
          dayOperation(op) ? FB.T('Spend one action day. Daily Focus income is replaced for that day.') : FB.T('This settlement spends no action day.'),
          FB.T('Interrupted work earns only its completed share of the undisputed fee. Completed work keeps its full reserved entitlement. The contract expires {days} days after acceptance.', { days:j.expiresDays })];
        }
        if (op.kind === 'household_expense') return [FB.T('Pay {money:amount} from the private household purse once for this stage.', { amount:terms.amount }),
          FB.T('This buys the described household supplies. It grants no land, workshop holding or income bonus.')];
        if (op.kind === 'set_focus') return [FB.T('Select ordinary paid work. Choosing the focus pays nothing; its normal daily work supplies any income.'),
          FB.T('The household story acknowledges work only after the focus actually pays at the declared home. Ordinary work eligibility and risks apply.')];
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
        need(keys(t, ['version','householdId','actorId','phase','revision','stageTurn','decisions','controls','householdReceipts','jobs','jobPatrons']) && t.version === localVersion &&
          typeof t.householdId === 'string' && t.householdId.length > 0 && typeof t.actorId === 'string' && t.actorId.length > 0 &&
          own(def.stages, t.phase) && integer(t.revision) && integer(t.stageTurn) && plain(t.decisions) && plain(t.controls) && plain(t.householdReceipts));
        need(!s || t.stageTurn <= s.turn);
        if (localVersion === 2) need(Number.isSafeInteger(t.revision) && Number.isSafeInteger(t.stageTurn) &&
          t.householdId.length <= 200 && t.actorId.length <= 200 && (!s || own(s.chars, t.householdId) && own(s.chars, t.actorId)));
        need(own(t, 'jobs') === own(t, 'jobPatrons'));
        if (own(t, 'jobs')) {
          need(!!def.jobs && plain(t.jobs) && plain(t.jobPatrons) && Object.keys(t.jobs).length <= 8 &&
            Object.keys(t.jobPatrons).length === Object.keys(def.jobs).length);
          Object.keys(t.jobPatrons).forEach(function (id) {
            need(own(def.jobs, id) && (t.jobPatrons[id] === null || typeof t.jobPatrons[id] === 'string'));
          });
          Object.keys(t.jobs).forEach(function (id) {
            var r = t.jobs[id], j = def.jobs[id];
            need(own(def.jobs, id) && keys(r, ['payerId','workerId','openedTurn','expiresTurn','daysWorked','paid','refunded','escrow','status','resolution','closedTurn']));
            need(typeof r.payerId === 'string' && r.payerId.length > 0 && typeof r.workerId === 'string' && r.workerId.length > 0 &&
              integer(r.openedTurn) && r.expiresTurn === r.openedTurn + j.expiresDays && (!s || r.openedTurn <= s.turn) &&
              integer(r.daysWorked) && r.daysWorked >= 1 && r.daysWorked <= j.days && integer(r.paid) &&
              integer(r.refunded) && integer(r.escrow) && r.paid + r.refunded + r.escrow === j.fee &&
              ['working','disputed','settled','cancelled','expired'].indexOf(r.status) >= 0);
            need(!!t.jobPatrons[id] && (!s || r.payerId === payer(s, j)));
            need(!s || r.daysWorked <= s.turn - r.openedTurn + 1);
            var open = r.status === 'working' || r.status === 'disputed';
            need(open ? r.resolution === null && r.closedTurn === null && r.refunded === 0 :
              ['completed','settlement','hearing','waive','interrupted'].indexOf(r.resolution) >= 0 &&
              integer(r.closedTurn) && r.closedTurn >= r.openedTurn && (!s || r.closedTurn <= s.turn));
            if (r.status === 'working') need(r.daysWorked < j.days && r.paid === 0);
            if (r.status === 'disputed') need(r.daysWorked === j.days && r.paid === j.completionGold && r.escrow > 0);
            if (r.status === 'settled') {
              need(r.daysWorked === j.days);
              need(r.paid === (r.resolution === 'waive' ? j.completionGold : r.resolution === 'settlement' ?
                j.completionGold + j.settlementGold : j.fee));
              need(['completed','settlement','hearing','waive'].indexOf(r.resolution) >= 0);
            }
            if (r.status === 'cancelled' || r.status === 'expired') need(r.resolution === 'interrupted' &&
              r.paid === (r.daysWorked === j.days ? j.fee : Math.floor(j.completionGold * r.daysWorked / j.days)));
          });
        }
        need(Object.keys(t.decisions).length <= 64 && Object.keys(t.householdReceipts).length <= 64);
        Object.keys(t.decisions).forEach(function (id) {
          var d = t.decisions[id];
          need(own(def.stages, id) && keys(d, ['choiceId','turn','actorId','locality']) && integer(d.turn) && typeof d.actorId === 'string' &&
            def.stages[id].choices.some(function (c) { return c.id === d.choiceId; }));
          var local = def.stages[id].localEvent;
          need(local ? keys(d.locality, ['provinceId','siteId']) && d.locality.provinceId === local.provinceId &&
            d.locality.siteId === local.siteId && localityValid(d.locality, s && FB.campaignBookmark(s)) : !own(d, 'locality'));
          need(!s || d.turn <= s.turn);
          if (localVersion === 2) need(Number.isSafeInteger(d.turn) && d.actorId.length > 0 && d.actorId.length <= 200 && (!s || own(s.chars, d.actorId)));
        });
        need(Object.keys(t.controls).length === Object.keys(controls).length);
        Object.keys(t.controls).forEach(function (id) {
          var c = t.controls[id];
          need(controls[id] && keys(c, ['before','after','turn']) && (c.before === null || typeof c.before === 'string') &&
            (c.after === null || typeof c.after === 'string') && (c.turn === null || integer(c.turn)));
          need(!s || c.turn === null || c.turn <= s.turn);
          if (localVersion === 2) need(c.turn === null || Number.isSafeInteger(c.turn));
        });
        Object.keys(t.householdReceipts).forEach(function (key) {
          var r = t.householdReceipts[key], parts;
          try { parts = JSON.parse(key); } catch (e) { need(false); }
          need(Array.isArray(parts) && (parts.length === 7 || localVersion === 2 && parts.length === 8) && parts[0] === t.householdId &&
            typeof parts[1] === 'string' && typeof parts[2] === 'string' && typeof parts[3] === 'string' && integer(parts[4]) &&
            (parts[5] === null || typeof parts[5] === 'string') && (parts[6] === null || typeof parts[6] === 'string') &&
            keys(r, ['owner','status','turn']) && r.owner === def.id && ['resolved','expired'].indexOf(r.status) >= 0 && integer(r.turn));
          need(key === JSON.stringify(parts) && (!s || r.turn <= s.turn && parts[4] <= r.turn));
          if (localVersion === 2) need(Number.isSafeInteger(parts[4]) && Number.isSafeInteger(r.turn));
          need(Object.keys(def.stages).some(function (id) {
            var inc = def.stages[id].incident;
            return inc && parts[1] === (inc.source === 'control' ? inc.source : inc.storyId) &&
              parts[2] === inc.milestone && parts[3] === inc.provinceId &&
              (own(inc, 'siteId') ? parts.length === 8 && parts[7] === inc.siteId &&
                localityValid({ provinceId:parts[3], siteId:parts[7] }, s && FB.campaignBookmark(s)) : parts.length === 7) &&
              (inc.source === 'control' || parts[5] === null && parts[6] === null) &&
              (inc.source !== 'local_story' || !s || localEvents(s, inc.storyId).some(function (e) {
                return receiptKey(t.householdId, e) === key;
              }));
          }));
        });
      }
    };
  }
  FB.stories.registerType('household_track', factory, 'js/story_household.js', validate);
})();
