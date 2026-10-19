/* Optional personal objectives observe ordinary transactions. They never pay
   rewards, change authority or turn a named person into an acquaintance. */
(function () {
  'use strict';
  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function plain(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function keys(o, list) { return plain(o) && Object.keys(o).every(function (k) { return list.indexOf(k) >= 0; }); }
  function slug(v) { return typeof v === 'string' && /^[a-z][a-z0-9_]*$/.test(v); }
  function text(v) { return typeof v === 'string' && v.length > 0 && v.length <= 2000; }
  function integer(v) { return Number.isInteger(v) && v >= 0; }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  var eventKinds = ['profile_receipt','profile_host_payment','profile_provincial_bargain','profile_royal_choice','profile_consent'];
  function check(d, context, bm) {
    function need(ok, where) { if (!ok) throw new Error('Invalid opening profile: ' + where + '.'); }
    need(keys(d, ['id','type','title','intro','scenarioIds','provinceIds','officeRealmId','requires','goals','contacts','registrationBefore','registrationAfter']), 'fields');
    function list(v, max) { return Array.isArray(v) && v.length > 0 && v.length <= max && v.every(function (id, i) { return slug(id) && v.indexOf(id) === i; }); }
    need(text(d.title) && text(d.intro) && list(d.scenarioIds, 8), 'display or scenarios');
    need(d.provinceIds === undefined || list(d.provinceIds, 16), 'birthplaces');
    need(d.officeRealmId === undefined || slug(d.officeRealmId), 'office');
    need(Array.isArray(d.goals) && d.goals.length > 0 && d.goals.length <= 8 && Array.isArray(d.contacts) && d.contacts.length <= 4, 'bounds');
    var ids = Object.create(null);
    function criterion(c, depth) {
      need(plain(c) && depth <= 4, 'criterion depth');
      var fields = ['kind'];
      if (c.kind === 'any') {
        fields.push('conditions'); need(Array.isArray(c.conditions) && c.conditions.length > 0 && c.conditions.length <= 8, 'alternatives');
        c.conditions.forEach(function (row) { criterion(row, depth + 1); });
      } else if (c.kind === 'reserve' || c.kind === 'earnings') {
        fields.push('amount'); need(Number.isFinite(c.amount) && c.amount > 0 && c.amount <= 100000, 'amount');
        if (c.kind === 'earnings') { fields.push('focusIds'); need(list(c.focusIds, 8) && c.focusIds.every(function (id) { return FBDATA.focuses.some(function (f) { return f.id === id; }); }), 'focus'); }
      } else if (c.kind === 'event') {
        fields = fields.concat(['eventKind','realmId']); need(eventKinds.indexOf(c.eventKind) >= 0 && slug(c.realmId), 'event');
        if (bm) need((bm.realms || []).some(function (r) { return r.id === c.realmId; }), 'event realm');
      } else if (c.kind === 'pact') {
        fields.push('realmId'); need(slug(c.realmId), 'pact realm');
        if (bm) need((bm.realms || []).some(function (r) { return r.id === c.realmId; }), 'pact realm');
      } else if (c.kind === 'hold') {
        fields.push('reason'); need(text(c.reason), 'hold reason');
      } else {
        fields.push('storyId');
        var story = context.get(c.storyId), source = story && story.declaration;
        need((d.requires || []).indexOf(c.storyId) >= 0 && !!source, 'source dependency');
        if (c.kind === 'story_choice') {
          fields.push('choiceIds'); need(list(c.choiceIds, 32), 'source choices');
          var choices = [];
          if (Array.isArray(source.stages)) source.stages.forEach(function (stage) { choices = choices.concat(stage.choices || []); });
          else Object.keys(source.stages || {}).forEach(function (id) { choices = choices.concat(source.stages[id].choices || []); });
          if (source.choices && !Array.isArray(source.choices)) Object.keys(source.choices).forEach(function (id) { choices.push(source.choices[id]); });
          (story.choiceIds || []).forEach(function (id) { choices.push({ id:id }); });
          need(c.choiceIds.every(function (id) { return choices.some(function (choice) { return choice.id === id; }); }), 'unknown source choice');
        } else if (c.kind === 'household_phase') {
          fields.push('phases'); need(source.type === 'household_track' && list(c.phases, 16) && c.phases.every(function (id) {
            return own(source.stages, id) && source.stages[id].terminal === true;
          }), 'household conclusion');
        } else if (c.kind === 'job_complete') {
          fields.push('jobId'); need(source.type === 'household_track' && own(source.jobs, c.jobId), 'job');
        } else need(['service_payment','civic_mandate'].indexOf(c.kind) >= 0 && source.type === 'political_track' &&
          (c.kind === 'service_payment' ? source.profile === 'service_negotiation' : source.profile === 'civic_mandate'), 'source evidence');
      }
      need(keys(c, fields), 'criterion fields');
    }
    d.goals.forEach(function (g) {
      need(keys(g, ['id','name','text','office','criterion']) && slug(g.id) && !own(ids, g.id) && text(g.name) && text(g.text) &&
        (g.office === undefined || typeof g.office === 'boolean') && (!g.office || !!d.officeRealmId), 'goal');
      ids[g.id] = true; criterion(g.criterion, 0);
    });
    ids = Object.create(null);
    d.contacts.forEach(function (c) {
      need(keys(c, ['id','label','text','linkKind','required','person']) && slug(c.id) && !own(ids, c.id) && text(c.label) && text(c.text) &&
        ['target','kin','introduction'].indexOf(c.linkKind) >= 0 && typeof c.required === 'boolean', 'contact');
      ids[c.id] = true;
      var p = c.person, fields = ['source'];
      need(plain(p), 'person selector');
      var realm;
      if (p.source === 'realm_ruler' || p.source === 'royal_member') {
        fields.push('realmId'); need(slug(p.realmId), 'person realm');
        realm = bm && (bm.realms || []).filter(function (r) { return r.id === p.realmId; })[0];
        if (p.source === 'royal_member') { fields.push('memberId'); need(slug(p.memberId), 'royal member'); }
        if (bm && c.required) need(!!realm && (p.source !== 'royal_member' || realm.royalCourt &&
          (realm.royalCourt.members || []).some(function (m) { return m.id === p.memberId; })), 'required person');
      } else if (p.source === 'opening_actor') {
        fields.push('actorId'); need(slug(p.actorId), 'opening actor');
        if (bm && c.required) need(own(bm.opening && bm.opening.actors, p.actorId), 'required actor');
      } else if (p.source === 'story') {
        fields = fields.concat(['storyId','stateField']);
        need(FB.stories.referenceValid({ kind:'story', storyId:p.storyId, field:p.stateField }, d) && context.get(p.storyId), 'story person');
        var parent = context.get(p.storyId);
        need(!parent.fields || parent.fields.indexOf(p.stateField) >= 0, 'story person field');
      } else need(false, 'person source');
      need(keys(p, fields), 'person fields');
    });
    if (bm) {
      need(!d.officeRealmId || (bm.realms || []).some(function (r) { return r.id === d.officeRealmId; }), 'office realm');
      need(!d.provinceIds || d.provinceIds.every(function (id) { return (bm.provinces || []).some(function (p) { return p.id === id && !p.wasteland; }); }), 'birthplace');
    }
  }
  function profiles(s, fn) {
    FB.stories.list().forEach(function (story) {
      var t = FB.stories.record(s, story.id);
      if (t && story.declaration && story.declaration.type === 'opening_profile') fn(story, t);
    });
  }
  function office(s, d) {
    if (!d.officeRealmId) return null;
    var rid = FB.startRealmId(s, d.officeRealmId), C = FB.governments.support, row = C.row(s, rid);
    var delegated = C.isDelegated(s, rid), c = delegated ? C.delegate(s, rid) : FB.stories.ruler(s, d.officeRealmId);
    var realm = s.realms[rid];
    return { characterId:c && c.id || null, generation:FB.realmRulerGeneration(s, rid), mandateId:delegated && row && row.mandate ? row.mandate.id : null,
      jurisdiction:!!realm && !!realm.alive && (delegated ? !!row && row.scopes.every(function (pid) { return s.owner[pid] === rid && s.holder[pid] === rid; }) :
        !!realm.nonTerritorial || FB.realmTerritory(s, rid).length > 0) };
  }
  function personal(s, t) { var c = s.chars[t.actorId]; return !!c && !c.dead && !s.player.dead && s.player.charId === t.actorId; }
  function ownsOffice(s, d, t) { return !t.office || same(t.office, office(s, d)) && t.office.characterId === t.actorId && t.office.jurisdiction; }
  function eligible(s, d) {
    return !!s.start && d.scenarioIds.indexOf(s.start.scenarioId) >= 0 && (!d.provinceIds || d.provinceIds.indexOf(s.player.provinceId) >= 0);
  }
  function passes(s, t, c, event) {
    var r = c.storyId && FB.stories.record(s, c.storyId);
    if (c.kind === 'any') return c.conditions.some(function (row) { return passes(s, t, row, event); });
    if (c.kind === 'reserve') return s.player.gold >= c.amount && FB.station.isFree(s.player, s);
    if (c.kind === 'earnings') return (t.earnings[c.focusIds.join('|')] || 0) >= c.amount;
    if (c.kind === 'event') return !!event && event.kind === c.eventKind && event.realmId === FB.startRealmId(s, c.realmId);
    if (c.kind === 'story_choice') return !!event && event.storyId === c.storyId && c.choiceIds.indexOf(event.choiceId) >= 0;
    if (c.kind === 'household_phase') return !!r && c.phases.indexOf(r.phase) >= 0 && !!r.decisions && Object.keys(r.decisions).length > 0;
    if (c.kind === 'job_complete') { var job = r && r.jobs && r.jobs[c.jobId]; return !!job && job.daysWorked > 0 && job.paid > 0 && ['disputed','settled'].indexOf(job.status) >= 0 && job.workerId === t.actorId; }
    if (c.kind === 'service_payment') return !!r && r.lastAllocatedPeriod > Math.floor(t.openedTurn / 90);
    if (c.kind === 'civic_mandate') return !!r && r.result === 'civic_mandate' && !!r.officeId;
    if (c.kind === 'pact') { var end = s.pacts && s.pacts[FB.startRealmId(s, c.realmId)]; return Number.isFinite(end) && end > s.turn && end !== t.pacts[c.realmId]; }
    return false;
  }
  function update(s, d, t, event) {
    if (!t.ready) return;
    d.goals.forEach(function (g) {
      var row = t.goals[g.id];
      if (row.status !== 'pending') return;
      if (!personal(s, t) || g.office && !ownsOffice(s, d, t)) { row.status = 'archived'; row.turn = s.turn; }
      else if (passes(s, t, g.criterion, event)) { row.status = 'completed'; row.turn = s.turn; }
    });
  }
  function resolvePerson(s, p) {
    if (p.source === 'royal_member') {
      var rid = FB.startRealmId(s, p.realmId), member = FB.authoredRoyalMemberSnapshot(s, rid, p.memberId);
      var c = member && member.alive !== false && FB.materializeRoyalMember(s, rid, member.id);
      /* Territorial adoption hands the fully materialized family to ordinary
         player kin and removes the compact AI succession owner. Reuse those
         existing identities only for its original authored protagonist. */
      if (!member && rid === 'player' && s.start && s.start.rulerRealmId === p.realmId &&
          s.player.charId === FB.courtCharacterId('royal_' + p.realmId + '_authored_ruler')) {
        var adopted = s.chars[FB.courtCharacterId('royal_' + p.realmId + '_authored_' + p.memberId)];
        if (adopted && !adopted.dead) c = adopted;
      }
      return c && c.id || member && member.charId || null;
    }
    var ref = Object.assign({}, p, { kind:p.source }); delete ref.source;
    if (ref.stateField !== undefined) { ref.field = ref.stateField; delete ref.stateField; }
    return FB.stories.resolve(s, ref);
  }
  function earningRules(d) {
    var out = Object.create(null);
    function visit(c) {
      if (c.kind === 'any') c.conditions.forEach(visit);
      if (c.kind === 'earnings') { var id = c.focusIds.join('|'); out[id] = Math.max(out[id] || 0, c.amount); }
    }
    d.goals.forEach(function (g) { visit(g.criterion); }); return out;
  }
  function pactRules(d) {
    var out = Object.create(null);
    function visit(c) { if (c.kind === 'any') c.conditions.forEach(visit); if (c.kind === 'pact') out[c.realmId] = null; }
    d.goals.forEach(function (g) { visit(g.criterion); }); return out;
  }
  FB.openingGoals = {
    start:function (s) {
      profiles(s, function (story, t) {
        if (t.ready) return;
        var d = story.declaration;
        t.office = office(s, d);
        d.contacts.forEach(function (c) {
          var id = resolvePerson(s, c.person); t.contacts[c.id] = id || null;
          if (id && c.linkKind === 'introduction') FB.noteFriendContact(s, s.chars[id], { cultivated:false, source:d.id });
        });
        Object.keys(t.pacts).forEach(function (rid) { t.pacts[rid] = s.pacts && s.pacts[FB.startRealmId(s, rid)] || null; });
        t.ready = true; update(s, d, t);
      });
    },
    note:function (s, event) { profiles(s, function (story, t) { update(s, story.declaration, t, event); }); },
    fiscal:function (s, rid, income) { if (income > 0) FB.openingGoals.note(s, { kind:'profile_receipt', realmId:rid }); }
  };
  function factory(d) {
    var rules = earningRules(d);
    function progress(s, t, c) {
      if (c.kind === 'any') return c.conditions.map(function (row) { return progress(s, t, row); }).filter(Boolean).join(' ');
      if (c.kind === 'earnings') return FB.T('Earned work: {earned}/{required} gold.', { earned:Math.floor(t.earnings[c.focusIds.join('|')] || 0), required:c.amount });
      if (c.kind === 'reserve') return FB.T('Private reserve: {current}/{required} gold.', { current:Math.floor(s.player.gold), required:c.amount });
      return '';
    }
    function fresh(s, t, id) {
      var goal = d.goals.filter(function (g) { return id === 'dismiss_' + g.id; })[0];
      return { allowed:!!goal && t.ready && personal(s, t) && (!goal.office || ownsOffice(s, d, t)) && t.goals[goal.id].status === 'pending',
        facts:{ actor:s.player.charId, turn:s.turn, office:office(s, d), record:copy(t) } };
    }
    return { id:d.id, kind:'track', requires:d.requires,
      appliesTo:function (s) {
        var o = office(s, d);
        return eligible(s, d) && (!o || o.characterId === s.player.charId && o.jurisdiction);
      },
      init:function (s) {
        var goals = {}, earnings = {}, pacts = pactRules(d);
        d.goals.forEach(function (g) { goals[g.id] = { status:'pending', turn:null }; });
        Object.keys(rules).forEach(function (key) { earnings[key] = 0; });
        return { schema:1, actorId:s.player.charId, scenarioId:s.start.scenarioId, provinceId:s.player.provinceId,
          bookmarkId:s.start.id, revision:FB.campaignBookmark(s).revision, openedTurn:s.turn,
          ready:false, office:null, goals:goals, contacts:{}, earnings:earnings, lastEarnedTurn:null, pacts:pacts };
      },
      day:function (s, t) { update(s, d, t); }, season:function (s, t) { update(s, d, t); }, year:function (s, t) { update(s, d, t); },
      observe:function (s, t) { update(s, d, t); },
      householdFocusPaid:function (s, t, focusId, amount) {
        if (!t.ready || !personal(s, t) || !(amount > 0) || !Number.isFinite(amount) || t.lastEarnedTurn === s.turn) return;
        Object.keys(rules).forEach(function (key) {
          if (key.split('|').indexOf(focusId) >= 0) t.earnings[key] = Math.min(rules[key], t.earnings[key] + amount);
        });
        t.lastEarnedTurn = s.turn; update(s, d, t);
      },
      title:function () { return FB.T(d.title); }, intro:function () { return FB.T(d.intro); },
      status:function (s, t) {
        var labels = { pending:FB.T('Pending'), completed:FB.T('Completed'), dismissed:FB.T('Dismissed'), archived:FB.T('Archived') };
        var lines = d.goals.map(function (g) {
          var row = t.goals[g.id], state = row.status === 'pending' && (!personal(s, t) || g.office && !ownsOffice(s, d, t)) ? 'archived' : row.status;
          return FB.T('{goal}: {status}. {detail}', { goal:FB.T(g.name), status:labels[state], detail:FB.T(g.text) }) +
            (state === 'pending' ? ' ' + progress(s, t, g.criterion) : '') +
            (g.criterion.kind === 'hold' && state === 'pending' ? ' ' + FB.T(g.criterion.reason) : '');
        });
        return { phase:'opening_objectives', name:FB.T('Your opening goals'), lines:lines };
      },
      people:function (s, t) { return d.contacts.map(function (c) {
        var id = t.contacts[c.id], person = id && s.chars[id];
        var reason = !person ? FB.T('This person is unavailable; no replacement is introduced.') : person.dead ? FB.T('This person has died. The personal link stays with them.') :
          FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(s, id) ? FB.T('This person is captive. Ordinary access restrictions apply.') : FB.T('Ordinary rank, presence, travel and social access rules apply.');
        return { characterId:person && person.id || null, label:FB.T(c.label), detail:FB.T(c.text), reason:reason };
      }); },
      choices:function (s, t) { return d.goals.filter(function (g) { return t.goals[g.id].status === 'pending'; }).map(function (g) {
        return { id:'dismiss_' + g.id, label:FB.T('Set aside {goal}', { goal:FB.T(g.name) }), detail:FB.T('Dismiss this optional goal. No money, standing, authority or reward changes.') };
      }); },
      quote:fresh,
      apply:function (s, t, id, reviewed) {
        var q = fresh(s, t, id);
        if (!q.allowed || !same(q, reviewed)) return false;
        var g = d.goals.filter(function (goal) { return id === 'dismiss_' + goal.id; })[0];
        t.goals[g.id] = { status:'dismissed', turn:s.turn }; return true;
      },
      review:function () { return [FB.T('This goal can be set aside freely. Completed transactions and other goals remain recorded.')]; },
      validate:function (t, s) {
        function need(ok) { if (!ok) throw new Error('Invalid opening profile record: ' + d.id + '.'); }
        need(keys(t, ['schema','actorId','scenarioId','provinceId','bookmarkId','revision','openedTurn','ready','office','goals','contacts','earnings','lastEarnedTurn','pacts']) && Object.keys(t).length === 14 && t.schema === 1);
        need(typeof t.actorId === 'string' && !!t.actorId && d.scenarioIds.indexOf(t.scenarioId) >= 0 && typeof t.bookmarkId === 'string' &&
          typeof t.revision === 'string' && slug(t.provinceId) && (!d.provinceIds || d.provinceIds.indexOf(t.provinceId) >= 0) && integer(t.openedTurn) && t.ready === true);
        need(plain(t.goals) && Object.keys(t.goals).length === d.goals.length && plain(t.contacts) && Object.keys(t.contacts).length === d.contacts.length && plain(t.earnings) && plain(t.pacts));
        need(d.officeRealmId ? keys(t.office, ['characterId','generation','mandateId','jurisdiction']) && Object.keys(t.office).length === 4 &&
          t.office.characterId === t.actorId && integer(t.office.generation) && t.office.generation > 0 && t.office.jurisdiction === true &&
          (t.office.mandateId === null || typeof t.office.mandateId === 'string') : t.office === null);
        d.goals.forEach(function (g) {
          var row = t.goals[g.id]; need(keys(row, ['status','turn']) && Object.keys(row).length === 2 &&
            ['pending','completed','dismissed','archived'].indexOf(row.status) >= 0 && (row.status === 'pending' ? row.turn === null : integer(row.turn) && row.turn >= t.openedTurn && (!s || row.turn <= s.turn)));
        });
        d.contacts.forEach(function (c) { need(own(t.contacts, c.id) && (t.contacts[c.id] === null || typeof t.contacts[c.id] === 'string' && !!t.contacts[c.id])); });
        need(Object.keys(t.earnings).length === Object.keys(rules).length);
        Object.keys(rules).forEach(function (key) { need(own(t.earnings, key) && Number.isFinite(t.earnings[key]) && t.earnings[key] >= 0 && t.earnings[key] <= rules[key]); });
        need(t.lastEarnedTurn === null || integer(t.lastEarnedTurn) && t.lastEarnedTurn >= t.openedTurn && (!s || t.lastEarnedTurn <= s.turn));
        var pactIds = Object.keys(pactRules(d)); need(Object.keys(t.pacts).length === pactIds.length);
        pactIds.forEach(function (rid) { need(own(t.pacts, rid) && (t.pacts[rid] === null || integer(t.pacts[rid]))); });
        if (s) {
          need(s.start && !!s.chars[t.actorId] && t.scenarioId === s.start.scenarioId && t.bookmarkId === s.start.id && t.revision === FB.campaignBookmark(s).revision && t.openedTurn <= s.turn);
          d.contacts.forEach(function (c) { need(t.contacts[c.id] === null || own(s.chars, t.contacts[c.id])); });
        }
      }
    };
  }
  FB.stories.registerType('opening_profile', factory, 'js/story_opening_goals.js', check, { storyline:false });
  var military = FB.treasuryCommitMilitary;
  FB.treasuryCommitMilitary = function (s, batch) {
    var before = s.treasuryAccounting && s.treasuryAccounting.lastMilitaryTurn, funds = FB.treasuryAvailable(s, 'player');
    var paidBefore = s.treasuryAccounting && s.treasuryAccounting.playerMilitary || 0;
    var result = military(s, batch);
    var charge = s.treasuryAccounting && (s.treasuryAccounting.playerMilitary || 0) - paidBefore;
    if (s.treasuryAccounting && before !== s.treasuryAccounting.lastMilitaryTurn && charge > 0 && funds >= charge)
      FB.openingGoals.note(s, { kind:'profile_host_payment', realmId:'player' });
    return result;
  };
  var treasury = FB.treasurySeason;
  FB.treasurySeason = function (s, parts) {
    var result = treasury(s, parts);
    if (result) Object.keys(s.realms).forEach(function (rid) {
      var row = s.realms[rid].treasury, last = row && row.lastSummary;
      if (last && last.period === Math.floor(s.turn / 90)) FB.openingGoals.fiscal(s, rid, last.income + last.duesIn);
    });
    return result;
  };
  var provincial = FB.aristocracy.apply;
  FB.aristocracy.apply = function (s, q) {
    var result = provincial(s, q);
    if (result && q.action === 'negotiate') FB.openingGoals.note(s, { kind:'profile_provincial_bargain', realmId:q.realmId });
    return result;
  };
  var nominate = FB.governmentRecognition.nominate;
  FB.governmentRecognition.nominate = function (s, q) {
    var result = nominate(s, q);
    if (result) FB.openingGoals.note(s, { kind:'profile_royal_choice', realmId:q.realmId });
    return result;
  };
  var support = FB.governmentRecognition.applySupport;
  FB.governmentRecognition.applySupport = function (s, q) {
    var result = support(s, q), a = q && q.actor;
    if (result && a && (a.kind === 'character' && a.id === s.player.charId || a.kind === 'realm' && a.id === 'player'))
      FB.openingGoals.note(s, { kind:'profile_royal_choice', realmId:q.realmId });
    return result;
  };
  var consent = FB.governments.support.assent;
  FB.governments.support.assent = function (s, q) {
    var row = q && FB.governments.support.row(s, q.realmId), serial = row && row.serial;
    var result = consent(s, q);
    if (row && row.serial !== serial) FB.openingGoals.note(s, { kind:'profile_consent', realmId:q.realmId });
    return result;
  };
  var retained = FB.courtRecordRetained;
  FB.courtRecordRetained = function (s, c, kin, links) {
    var keep = false;
    if (s && c) profiles(s, function (story, t) {
      if (t.actorId === c.id || Object.keys(t.contacts).some(function (id) { return t.contacts[id] === c.id; })) keep = true;
    });
    return keep || retained(s, c, kin, links);
  };
})();
