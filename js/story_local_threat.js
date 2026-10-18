/* Finite local intent and attempts. This owner records agency and exact-site
   facts; it neither resolves violence nor creates a person's presence. */
(function () {
  'use strict';
  function plain(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function keys(o, list) { return plain(o) && Object.keys(o).every(function (k) { return list.indexOf(k) >= 0; }); }
  function exact(o, list) { return keys(o, list) && Object.keys(o).length === list.length; }
  function integer(n) { return Number.isSafeInteger(n) && n >= 0; }
  function slug(v) { return typeof v === 'string' && /^[a-z][a-z0-9_]{0,199}$/.test(v); }
  function ref(v) { return typeof v === 'string' && v.length > 0 && v.length <= 200; }
  function text(v) { return typeof v === 'string' && v.length > 0 && v.length <= 4000; }
  var liveStatuses = ['dormant','available','threatened','attempted'];
  var terminalStatuses = ['resolved','withdrawn','expired','interrupted'];
  var operations = ['intimidate','attempt','resolve','withdraw'];
  function date(d) {
    return exact(d, ['year','season','day']) && integer(d.year) && d.year > 0 && d.year <= 9999 &&
      integer(d.season) && d.season < 4 && integer(d.day) && d.day >= 1 && d.day <= 90;
  }
  function ordinal(d) { return d.year * 360 + d.season * 90 + d.day - 1; }
  function phaseLabel(status) {
    return { dormant:FB.T('Dormant'), available:FB.T('Available'), threatened:FB.T('Threatened'),
      attempted:FB.T('Attempted'), resolved:FB.T('Resolved'), withdrawn:FB.T('Withdrawn'),
      expired:FB.T('Expired'), interrupted:FB.T('Interrupted') }[status];
  }
  function check(def, context, bookmark) {
    function need(ok, field) { if (!ok) throw new Error('Invalid local threat: ' + field + '.'); }
    need(keys(def, ['id','type','title','intro','actor','locality','authorityRealmId','firstDate','lastDate',
      'choices','ai','requires','requirements','registrationBefore','registrationAfter']), 'fields');
    need(text(def.title) && text(def.intro) && FB.householdStories.localityValid(def.locality, bookmark), 'display or locality');
    need(date(def.firstDate) && date(def.lastDate) && ordinal(def.lastDate) >= ordinal(def.firstDate) &&
      ordinal(def.lastDate) - ordinal(def.firstDate) < 1440, 'finite window');
    var a = def.actor;
    need(plain(a), 'actor');
    if (a.kind === 'protagonist') need(exact(a, ['kind']), 'protagonist');
    else if (a.kind === 'resident') need(exact(a, ['kind','characterId']) && ref(a.characterId) &&
      /^lf_[a-z0-9_]+_[0-9]+_[0-9]+$/.test(a.characterId), 'resident identity');
    else need(a.kind === 'opening_actor' && FB.stories.referenceValid(a, def), 'actor reference');
    need(def.authorityRealmId === undefined || slug(def.authorityRealmId), 'authority');
    need(exact(def.ai, ['policy','minPressure']) && ['hold','withdraw','local_pressure'].indexOf(def.ai.policy) >= 0 &&
      Number.isFinite(def.ai.minPressure) && def.ai.minPressure > 0 && def.ai.minPressure <= 100, 'agency policy');
    need(Array.isArray(def.choices) && def.choices.length >= 2 && def.choices.length <= 4, 'choices');
    var seen = Object.create(null), actions = Object.create(null);
    def.choices.forEach(function (c) {
      need(exact(c, ['id','label','detail','operation']) && slug(c.id) && !seen[c.id] && text(c.label) && text(c.detail) &&
        operations.indexOf(c.operation) >= 0 && !actions[c.operation], 'choice');
      seen[c.id] = true; actions[c.operation] = true;
    });
    need(actions.withdraw && actions.intimidate && (!actions.attempt || actions.resolve), 'refusal and supported endings');
    if (bookmark && def.authorityRealmId) need((bookmark.realms || []).some(function (r) {
      return r.id === def.authorityRealmId;
    }), 'authority reference');
  }
  function factory(def) {
    function actorId(s) {
      return def.actor.kind === 'protagonist' ? s.player.charId : def.actor.kind === 'resident' ?
        def.actor.characterId : FB.stories.resolve(s, def.actor);
    }
    function authority(s) {
      if (!def.authorityRealmId) return null;
      var rid = FB.startRealmId(s, def.authorityRealmId), r = s.realms[rid];
      var c = r && r.alive && FB.stories.ruler(s, def.authorityRealmId);
      return { realmId:rid, characterId:c && c.id || null, generation:FB.realmRulerGeneration(s, rid) };
    }
    function capable(s, c) {
      return !!c && !c.dead && !c.captive && !c.exiled && !c.travel && !c.religiousActivity &&
        (c.health === undefined || c.health > 0) && FB.ageOf(c, s.date.year) >= 16 &&
        !(FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(s, c.id)) &&
        !(FB.justiceCustodyOf && FB.justiceCustodyOf(s, c.id)) &&
        !(s.justice && s.justice.exiles && s.justice.exiles[c.id] && s.justice.exiles[c.id].endTurn > s.turn);
    }
    function presence(s, id) {
      if (id === s.player.charId) return FB.householdStories.atLocality(s, def.locality) ?
        { kind:'protagonist', location:copy(def.locality) } : null;
      // Read the existing persistent household; never generate or select a substitute.
      var resident = FB.localFolkRecord(s, id), info = FB.world.sitesByProv && FB.world.sitesByProv[def.locality.provinceId];
      var site = resident && info && info.list[resident.settlement];
      return resident && resident.provinceId === def.locality.provinceId && site && site.authored &&
        site.site === def.locality.siteId && FB.siteVisible(s, site) &&
        FB.characterResidence(s, resident.character) === resident.provinceId &&
        !(FB.realmIdForRulerCharacter && FB.realmIdForRulerCharacter(s, resident.character)) &&
        !(FB.isHouseholdCharacter && FB.isHouseholdCharacter(s, id)) ?
        { kind:'resident', householdId:resident.household.id, location:copy(def.locality) } : null;
    }
    function facts(s, t) {
      var c = t.actorId && s.chars[t.actorId], currentAuthority = authority(s), source = actorId(s);
      var validAuthority = !def.authorityRealmId || !!(currentAuthority && currentAuthority.characterId &&
        same(currentAuthority, t.authority) && capable(s, s.chars[currentAuthority.characterId]) &&
        s.holder[def.locality.provinceId] === currentAuthority.realmId && s.owner[def.locality.provinceId] === currentAuthority.realmId);
      return { actor:source, capable:capable(s, c), character:c ? copy(c) : null,
        presence:presence(s, t.actorId), authority:currentAuthority, validAuthority:validAuthority,
        holder:s.holder[def.locality.provinceId] || null, owner:s.owner[def.locality.provinceId] || null,
        pressure:Math.max(0, -Number(FB.countySupportBase(s, def.locality.provinceId) || 0)),
        date:copy(s.date), turn:s.turn };
    }
    function choice(id) { return def.choices.filter(function (c) { return c.id === id; })[0] || null; }
    function active(t) { return liveStatuses.indexOf(t.status) >= 0; }
    function eligible(s, t, f) {
      return active(t) && f.actor === t.actorId && f.capable && f.validAuthority && !!f.presence &&
        ordinal(s.date) >= ordinal(def.firstDate) && ordinal(s.date) <= ordinal(def.lastDate) && s.turn <= t.endTurn;
    }
    function quote(s, t, id) {
      var c = choice(id), f = facts(s, t), op = c && c.operation;
      var validStep = op === 'withdraw' || op === 'intimidate' && ['dormant','available'].indexOf(t.status) >= 0 ||
        op === 'attempt' && t.status === 'threatened' || op === 'resolve' && t.status === 'attempted';
      return { id:id, allowed:!!(c && validStep && eligible(s, t, f) &&
          (op === 'withdraw' || t.occurrences.length === 0 || t.occurrences[t.occurrences.length - 1].turn < s.turn)),
        facts:{ definition:copy(def), record:copy(t), current:f } };
    }
    function end(s, t, status) { t.status = status; t.endedTurn = s.turn; t.revision++; }
    function apply(s, t, id, reviewed) {
      var q = quote(s, t, id);
      if (!reviewed || !q.allowed || !same(reviewed, q)) return false;
      var op = choice(id).operation;
      if (op === 'withdraw') { end(s, t, 'withdrawn'); return true; }
      var status = { intimidate:'threatened', attempt:'attempted', resolve:'resolved' }[op];
      t.occurrences.push({ serial:t.occurrences.length + 1, milestone:status, turn:s.turn,
        locality:copy(def.locality), actorId:t.actorId, authority:copy(t.authority), sourceResult:null });
      t.status = status; t.revision++;
      if (status === 'resolved') t.endedTurn = s.turn;
      return true;
    }
    function day(s, t) {
      if (!active(t)) return;
      var f = facts(s, t);
      if (f.actor !== t.actorId || !f.capable || !f.validAuthority) { end(s, t, 'interrupted'); return; }
      if (ordinal(s.date) > ordinal(def.lastDate) || s.turn > t.endTurn) { end(s, t, 'expired'); return; }
      if (ordinal(s.date) < ordinal(def.firstDate)) return;
      if (!f.presence) {
        if (t.status === 'available') { t.status = 'dormant'; t.revision++; }
        else if (t.status === 'threatened' || t.status === 'attempted') end(s, t, 'interrupted');
        return;
      }
      if (t.status === 'dormant') { t.status = 'available'; t.revision++; }
      if (t.actorId === s.player.charId || def.ai.policy === 'hold') return;
      // AI intent depends on current local pressure, never just a historical date.
      var op = def.ai.policy === 'withdraw' || f.pressure < def.ai.minPressure ? 'withdraw' :
        t.status === 'available' ? 'intimidate' : t.status === 'threatened' ? 'attempt' : 'resolve';
      var c = def.choices.filter(function (row) { return row.operation === op; })[0];
      if (c) apply(s, t, c.id, quote(s, t, c.id));
    }
    function validate(t, s) {
      function need(ok) { if (!ok) throw new Error(FB.T('Invalid v4 save field at {path}.', { path:'state.stories.' + def.id })); }
      need(exact(t, ['version','actorId','authority','locality','status','revision','openedTurn','endTurn','endedTurn','occurrences']));
      need(t.version === 1 && (t.actorId === null || ref(t.actorId)) && same(t.locality, def.locality) &&
        integer(t.revision) && integer(t.openedTurn) && integer(t.endTurn) && t.endTurn >= t.openedTurn &&
        t.endTurn - t.openedTurn < 1440 && liveStatuses.concat(terminalStatuses).indexOf(t.status) >= 0);
      need(def.authorityRealmId ? exact(t.authority, ['realmId','characterId','generation']) &&
        ref(t.authority.realmId) && (t.authority.characterId === null || ref(t.authority.characterId)) &&
        integer(t.authority.generation) && t.authority.generation >= 1 : t.authority === null);
      need(Array.isArray(t.occurrences) && t.occurrences.length <= 3);
      var steps = ['threatened','attempted','resolved'], last = t.openedTurn - 1;
      t.occurrences.forEach(function (e, i) {
        need(exact(e, ['serial','milestone','turn','locality','actorId','authority','sourceResult']) &&
          e.serial === i + 1 && e.milestone === steps[i] && integer(e.turn) && e.turn > last && e.turn <= t.endTurn &&
          same(e.locality, t.locality) && e.actorId === t.actorId && e.actorId !== null &&
          same(e.authority, t.authority) && e.sourceResult === null);
        need(def.choices.some(function (c) { return c.operation === ['intimidate','attempt','resolve'][i]; }));
        last = e.turn;
      });
      need(t.revision >= t.occurrences.length && t.revision <= 1000000);
      if (['dormant','available'].indexOf(t.status) >= 0) need(t.occurrences.length === 0);
      if (t.status === 'threatened') need(t.occurrences.length === 1);
      if (t.status === 'attempted') need(t.occurrences.length === 2);
      if (t.status === 'resolved') need(t.occurrences.length === 3);
      else need(t.occurrences.length < 3);
      need(active(t) ? t.endedTurn === null : integer(t.endedTurn) && t.endedTurn >= t.openedTurn && t.endedTurn >= last);
      if (s) {
        var bm = FB.campaignBookmark(s), attached = bm && bm.stories || [];
        need(attached.indexOf(def.id) >= 0 && FB.householdStories.localityValid(t.locality, bm) &&
          t.openedTurn === 0 && t.endTurn === Math.max(0, ordinal(def.lastDate) - ordinal(bm.date)) &&
          t.openedTurn <= s.turn && last <= s.turn && (t.endedTurn === null || t.endedTurn <= s.turn));
        t.occurrences.forEach(function (e) { need(e.turn >= ordinal(def.firstDate) - ordinal(bm.date)); });
        if (def.actor.kind === 'resident') need(t.actorId === def.actor.characterId);
        else if (def.actor.kind === 'opening_actor') need(t.actorId === ((FB.bookmarkActor(s, def.actor.actorId) || {}).id || null));
        else need(t.actorId === s.player.houseFounderId);
        // The original actor can be dead or no longer incumbent. Never repair it on restore.
        if (t.actorId !== null && def.actor.kind !== 'resident') need(!!s.chars[t.actorId]);
        if (t.authority) need(t.authority.realmId === FB.startRealmId(s, def.authorityRealmId) &&
          !!s.realms[t.authority.realmId] && t.authority.generation <= FB.realmRulerGeneration(s, t.authority.realmId) &&
          (t.authority.characterId === null || !!s.chars[t.authority.characterId]));
      }
    }
    return { id:def.id, kind:'world', requires:def.requires,
      appliesToBookmark:function (bm) { return FB.householdStories.localityValid(def.locality, bm) &&
        ordinal(def.lastDate) >= ordinal(bm.date) && ordinal(def.lastDate) - ordinal(bm.date) < 1440; },
      init:function (s) {
        var bm = FB.campaignBookmark(s);
        if (s.turn !== 0) return;
        return { version:1, actorId:actorId(s), authority:authority(s), locality:copy(def.locality), status:'dormant',
          revision:0, openedTurn:s.turn, endTurn:ordinal(def.lastDate) - ordinal(bm.date), endedTurn:null, occurrences:[] };
      },
      householdLocalities:['threatened','attempted','resolved'].map(function (milestone) {
        return { milestone:milestone, provinceId:def.locality.provinceId, siteId:def.locality.siteId };
      }),
      householdEvents:function (s, t) {
        return t.occurrences.map(function (e) { return { source:def.id, milestone:e.milestone,
          provinceId:e.locality.provinceId, siteId:e.locality.siteId, turn:e.turn, before:null, after:null }; });
      },
      title:function () { return FB.T(def.title); }, intro:function () { return FB.T(def.intro); },
      status:function (s, t) {
        var info = FB.world.sitesByProv && FB.world.sitesByProv[def.locality.provinceId];
        var site = info && info.list.filter(function (row) { return row.site === def.locality.siteId; })[0];
        return { phase:t.status, name:FB.T(def.title), lines:[FB.T(def.intro),
          FB.T('Local incident: {phase}. Site: {site}. Committed occurrences: {count}.',
            { phase:phaseLabel(t.status), site:site ? site.name : def.locality.siteId, count:t.occurrences.length }),
          FB.T('An attempt records local pressure only. It establishes no injury, death, conversion, custody, property loss or safe arrival.')] };
      },
      people:function (s, t) { return t.actorId && s.chars[t.actorId] ? [{ characterId:t.actorId, label:FB.T('Original local actor'),
        detail:FB.T('Presence and current agency are checked before each decision.'), reason:'' }] : []; },
      choices:function (s, t) {
        return active(t) && t.actorId === s.player.charId ? def.choices.map(function (c) {
          return { id:c.id, label:FB.T(c.label), detail:FB.T(c.detail) };
        }) : [];
      },
      blocker:function () { return FB.T('The original living actor must be present at this exact settlement, free to act, within the opportunity and under the original current authority. Each new attempt needs a separate day.'); },
      review:function (s, t) { return [FB.T('Actor: {name}.', { name:(s.chars[t.actorId] || {}).name || FB.T('Unavailable actor') }),
        FB.T('Costs no money or action days. This decision records intent or an attempt only and grants no reward or harmful outcome.')]; },
      quote:quote, apply:apply, day:day, season:day, year:day, validate:validate };
  }
  FB.stories.registerType('local_threat', factory, 'js/story_local_threat.js', check);

  // Opted-in world episodes attach at fresh boot and cannot be removed from a save.
  // This detached parent check deliberately performs no initialization or dispatch.
  var validatePlatform = FB.save.v4.validatePlatform;
  FB.save.v4.validatePlatform = function (s) {
    validatePlatform(s);
    var bm = s.start && FB.campaignBookmark(s);
    (bm && bm.stories || []).forEach(function (id) {
      var story = FB.stories.get(id);
      if (story && story.declaration && story.declaration.type === 'local_threat' && !FB.stories.record(s, id))
        throw new Error(FB.T('Invalid v4 save field at {path}.', { path:'state.stories.' + id }));
    });
    return true;
  };
})();
