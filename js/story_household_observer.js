/* Local household notices observe canonical stories. They never execute the
   source's war, payment, accession, service or population transaction. */
(function () {
  'use strict';
  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function plain(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function keys(o, allowed) { return plain(o) && Object.keys(o).every(function (k) { return allowed.indexOf(k) >= 0; }); }
  function slug(v) { return typeof v === 'string' && /^[a-z][a-z0-9_]*$/.test(v); }
  function integer(v) { return Number.isInteger(v) && v >= 0; }
  function text(v, max) { return typeof v === 'string' && v.length > 0 && v.length <= max; }
  function present(s) { return s.player.travel ? s.player.travel.currentId : s.player.provinceId; }
  function living(s) { var c = s.chars[s.player.charId]; return !!c && !c.dead && !s.player.dead; }
  function sovereign(s, pid) { return s.owner[pid] ? FB.topRealm(s, s.owner[pid]) : null; }
  var EVENTS = {
    campaign:['negotiating','started','won','failed','diverted','interrupted'],
    court_settlement:['opening','pressure','paid_accord','service_period','contest','contest_won',
      'contest_failed','diverged','civic_result','route_departure','route_arrival','route_interrupted','terms_changed'],
    ruler_restoration:['pending','restored','diverted','interrupted'],
    contested_office:['review','survived','deposed','restored','interrupted'],
    tribute_cession:['pending','active','installment','breached','diverted','interrupted'],
    civilian_migration:['pending','active','batch','completed','diverted','interrupted'],
    government_contest:['open','resolved','changed'],
    polity_foundation:['rebelling','founded','failed','diverted'],
    partition:['granted','declined','diverted','interrupted'],
    succession_partition:['agreed','executed','declined','expired','interrupted','diverted'],
    designated_succession:['agreed','declined','expired','interrupted','diverted'],
    diplomatic_exchange:['agreed','declined','expired','interrupted','diverted'],
    recognition:['agreed','declined','expired','interrupted','diverted'],
    treaty_settlement:['agreed','pressure','declined','expired','interrupted','diverted'],
    holy_war:['called','won','failed','declined','diverted']
  };
  function validate(def, context) {
    function need(ok, field) { if (!ok) throw new Error('Invalid household observer: ' + field + '.'); }
    need(keys(def, ['id','type','title','intro','sourceStoryId','provinceIds','expiryTurns','beats',
      'requires','requirements','registrationBefore','registrationAfter']), 'fields');
    var source = context.get(def.sourceStoryId), d = source && source.declaration;
    need(d && own(EVENTS, d.type) && (def.requires || []).indexOf(def.sourceStoryId) >= 0, 'source');
    need(text(def.title, 240) && text(def.intro, 4000) && integer(def.expiryTurns) &&
      def.expiryTurns >= 1 && def.expiryTurns <= 360, 'presentation or expiry');
    need(Array.isArray(def.provinceIds) && def.provinceIds.length > 0 && def.provinceIds.length <= 32 &&
      def.provinceIds.every(function (pid, i) { return slug(pid) && def.provinceIds.indexOf(pid) === i; }), 'places');
    need(plain(def.requirements) && Array.isArray(def.requirements.provinces) &&
      def.provinceIds.every(function (pid) { return def.requirements.provinces.indexOf(pid) >= 0; }), 'place requirements');
    need(Array.isArray(def.beats) && def.beats.length > 0 && def.beats.length <= 32, 'beats');
    var seen = Object.create(null), triggers = Object.create(null);
    def.beats.forEach(function (b) {
      need(keys(b, ['id','trigger','reach','name','text','choices']) && slug(b.id) && !seen[b.id] &&
        EVENTS[d.type].indexOf(b.trigger) >= 0 && !triggers[b.trigger], 'beat');
      seen[b.id] = true; triggers[b.trigger] = true;
      need(['local','previous','service','none'].indexOf(b.reach) >= 0 &&
        text(b.name, 240) && text(b.text, 4000) && Array.isArray(b.choices) && b.choices.length > 0 && b.choices.length <= 4, 'beat terms');
      var ids = Object.create(null);
      b.choices.forEach(function (c) {
        need(keys(c, ['id','label','detail','operation']) && slug(c.id) && !ids[c.id] &&
          text(c.label, 240) && text(c.detail, 4000) &&
          ['review_records','continue_livelihood'].indexOf(c.operation) >= 0, 'choice');
        ids[c.id] = true;
      });
      need(b.reach !== 'service' || d.type === 'court_settlement', 'service entitlement');
    });
  }

  function factory(def, context) {
    var source = context.get(def.sourceStoryId).declaration;
    function row(s) { return FB.stories.record(s, def.sourceStoryId); }
    function host(s, id) { return (s.armies || []).filter(function (a) { return a.id === id && a.men > 0; })[0]; }
    function service(s) { return source.parameters && FB.stories.record(s, source.parameters.serviceTrackId); }
    function parties(s) {
      var r = row(s) || {}, ids = [source.actor && source.actor.realmId, source.source && source.source.realmId,
        r.realmId, r.callerRealmId].filter(Boolean);
      return ids.map(function (id) {
        var rid = FB.startRealmId(s, id), realm = s.realms[rid], person = FB.realmRulerCharacterSnapshot(s, rid);
        return [rid, !!(realm && realm.alive), realm && FB.realmRulerGeneration(s, rid),
          person && person.id || null, !!(person && person.dead)];
      });
    }
    function events(s) {
      var r = row(s), out = [], p = source.parameters || {};
      if (!r) return out;
      function add(code, turn, token, places) {
        if (!integer(turn) || turn > s.turn) return;
        out.push({ code:code, turn:turn, token:JSON.stringify([code, token]), places:places || def.provinceIds.slice() });
      }
      if (source.type === 'campaign') {
        var armies = (s.armies || []).filter(function (a) {
          return a.men > 0 && (source.hostId && a.id === source.hostId ||
            (source.conditions || []).some(function (c) { return c.kind === 'host' && c.hostId === a.id; }) ||
            r.warId && a.warId === r.warId);
        });
        var places = [source.target.provinceId].concat(armies.map(function (a) { return a.at; }));
        if (r.phase === 'negotiating' && r.migrationId) add('negotiating', r.startedTurn, r.migrationId,
          armies.map(function (a) { return a.at; }));
        if (r.phase === 'started')
          add('started', r.startedTurn, [r.warId, armies.map(function (a) { return [a.id,a.at]; })], places);
        if (r.result) add(r.result, r.outcomeTurn, r.result);
      } else if (source.type === 'court_settlement') {
        var t = service(s), escort = host(s, p.patronHostId), command = host(s, p.serviceHostId);
        // Opening is an attachment baseline, never an invented new pressure.
        add('opening', 0, true);
        if (r.pressureNoted) add('pressure', s.turn, true,
          [p.targetProvinceId,command && command.at].filter(Boolean));
        var result = t && t.result, agreement = t && t.contractId && FB.political.contract(s, t.contractId);
        if (r.aiResolution === 'negotiated' || t && t.contractId && result === 'negotiated')
          add('paid_accord', integer(t && t.outcomeTurn) ? t.outcomeTurn : s.turn, r.contractId || t && t.contractId);
        if (t && t.role !== 'outside' && t.contractId && t.lastAllocatedPeriod > 0)
          add('service_period', s.turn, [t.contractId,t.lastAllocatedPeriod]);
        var court = s.realms[FB.startRealmId(s, p.serviceRealmId)];
        var personalContest = result === 'contested' && command && command.warId === p.contestWarId &&
          court && court.war && court.war.enemy === FB.startRealmId(s, p.patronRealmId);
        if (r.aiResolution === 'war' || personalContest)
          add('contest', s.turn, r.aiWarId || command && command.warId,
            [p.targetProvinceId,command && command.at].filter(Boolean));
        if ((r.aiResolution === 'won' || result === 'contested_victory') &&
            s.owner[p.targetProvinceId] === FB.startRealmId(s, p.serviceRealmId)) add('contest_won', s.turn, 'won');
        if (r.aiResolution === 'failed' || ['contested_defeat','contested_withdrawal'].indexOf(result) >= 0)
          add('contest_failed', s.turn, result || 'failed');
        if (['diverged','declined'].indexOf(r.aiResolution) >= 0 || result === 'declined' || r.rulerInterruptionTurn !== undefined)
          add('diverged', s.turn, r.aiResolution || result || 'interrupted');
        if (r.governanceResolved) add('civic_result', s.turn, r.governanceResolved);
        if (r.courtMove === 'travelling' && escort)
          add('route_departure', s.turn, [escort.id,escort.at], [p.targetProvinceId,escort.at]);
        if (r.courtAt === p.retreatProvinceId && !r.courtMove)
          add('route_arrival', s.turn, r.courtAt, [p.retreatProvinceId]);
        if (r.courtMove === 'interrupted' || r.courtAt === 'displaced') add('route_interrupted', s.turn, [r.courtMove,r.courtAt]);
        if (agreement && (agreement.status !== 'active' || !agreement.effective))
          add('terms_changed', s.turn, [t.contractId,agreement.status,!!agreement.effective]);
      } else if (source.type === 'contested_office') {
        if (s.turn >= p.officeReviewTurn && !r.result) add('review', p.officeReviewTurn, true);
        (r.history || []).forEach(function (h) { add(h.result === 'diverted' ? 'interrupted' : h.result, h.turn, [h.turn,h.result,h.officeId]); });
      } else if (source.type === 'tribute_cession') {
        if (r.phase === 'pending' && Object.keys(r.approvals).length) add('pending', s.turn, r.approvals);
        if (r.ceded) add('active', r.acceptedTurn, r.acceptedTurn);
        if (r.paidThroughTurn > r.acceptedTurn) add('installment', r.paidThroughTurn, r.totalPaid);
        if (r.result) add(r.result, r.outcomeTurn, r.result);
      } else if (source.type === 'civilian_migration') {
        var ends = (r.routes || []).reduce(function (ids, route) { return ids.concat([route.from,route.to]); }, []);
        if (r.routes.length) add('active', s.turn, [r.actorId,r.actorGeneration,r.routes.map(function (route) { return [route.from,route.to,route.planned]; })], ends);
        if (r.routes.some(function (route) { return route.moved > 0; }))
          add('batch', s.turn, [r.lastPeriod,r.routes.map(function (route) { return [route.from,route.to,route.moved]; })], ends);
        if (r.result) add(r.result, r.outcomeTurn, r.result, ends.length ? ends : undefined);
      } else if (source.type === 'polity_foundation') {
        var revolt = r.rebellionId && FB.rebellionById(s, r.rebellionId);
        if (r.phase === 'rebelling' && revolt && revolt.counties[source.realm.capital])
          add('rebelling', r.startedTurn, r.rebellionId, [source.realm.capital]);
        if (r.result) add(r.result, r.outcomeTurn, r.result, r.result === 'founded' ?
          r.counties.filter(function (pid) { return s.owner[pid] === FB.startRealmId(s, r.realmId); }) : []);
      } else if (source.type === 'partition') {
        if (r.result) add(r.result, r.outcomeTurn, r.result, r.result === 'granted' ?
          r.grantedCounties.filter(function (pid) { return s.holder[pid] === FB.startRealmId(s, r.realmId); }) : []);
      } else if (['succession_partition','designated_succession','diplomatic_exchange','recognition','treaty_settlement'].indexOf(source.type) >= 0) {
        var places = [source.actor.capital];
        if (source.source) places.push(source.source.capital);
        if (source.type === 'succession_partition') (r.plan && r.plan.shares || []).forEach(function (share) {
          var realm = s.realms[FB.startRealmId(s, share.realmId)];
          if (realm && realm.alive) places.push(realm.capital);
        });
        if (source.type === 'recognition') places = places.concat(FB.stories.resolve(s, source.region));
        if (source.type === 'designated_succession' || source.type === 'treaty_settlement')
          (r.plan && r.plan.shares || []).forEach(function (share) {
            var region = source.regions.filter(function (v) { return v.id === share.region; })[0];
            places = places.concat(share.counties || region && FB.stories.resolve(s, region.selector) || []);
          });
        // Planning an inheritance is an agreement, not its later execution.
        if (source.type === 'succession_partition' && r.phase === 'planned') add('agreed', r.turn, r.turn, places);
        if (r.result) add(r.result, r.turn, [r.result,r.turn], places);
        var pressure = r.pressure, war = pressure && pressure.warId && FB.ordinaryWars(s).filter(function (w) {
          return w.id === pressure.warId && w.attacker === FB.startRealmId(s, source.actor.realmId) &&
            w.defender === FB.startRealmId(s, pressure.rebelId);
        })[0];
        if (war && !r.result) {
          var armies = (s.armies || []).filter(function (a) { return a.men > 0 && a.warId === war.id; });
          var rebel = s.realms[war.defender];
          add('pressure', s.turn, war.id, [source.actor.capital,rebel && rebel.capital].filter(Boolean)
            .concat(armies.map(function (a) { return a.at; })));
        }
      } else if (source.type === 'holy_war') {
        var call = s.greatHolyWar, past = (s.greatHolyWarHistory && s.greatHolyWarHistory.campaigns || []).filter(function (h) {
          return h.id === r.campaignId && !h.historical && h.religion === source.religion && h.turn >= r.calledTurn;
        })[0];
        if (r.phase === 'started' && call && call.id === r.campaignId && call.calledTurn === r.calledTurn &&
            call.callingReligion === source.religion)
          add('called', r.calledTurn, r.campaignId, call.objectiveCounties.slice());
        if (r.result && (['won','failed'].indexOf(r.result) < 0 || past || r.reason === 'campaign_missing'))
          add(r.result, r.outcomeTurn, [r.campaignId,r.result], past ? FB.kingdomCounties(past.target) : []);
      } else if (source.type === 'government_contest') {
        var rid = FB.startRealmId(s, r.realmId), realm = s.realms[rid];
        var selection = realm && realm.alive && FB.governmentSelection.state(s, rid), vacancy = selection && selection.vacancy;
        if (vacancy && ['contested','vacant','minority','resolved'].indexOf(vacancy.status) >= 0) {
          add(vacancy.status === 'resolved' ? 'resolved' : 'open', s.turn,
            [vacancy.generation,vacancy.openedTurn,vacancy.status]);
          add('changed', s.turn, [vacancy.generation,vacancy.openedTurn]);
        }
        else add('changed', s.turn, selection ? 'no_vacancy' : 'no_court');
      } else if (r.result) add(r.result, r.outcomeTurn, r.result);
      return out;
    }
    function signature(e) { return e.token; }
    function beat(id) { return def.beats.filter(function (b) { return b.id === id; })[0]; }
    function currentControl(s, pid) {
      var rid = sovereign(s, pid), realm = rid && s.realms[rid];
      return [s.owner[pid] || null,s.holder[pid] || null,rid,
        realm && realm.alive ? FB.realmRulerGeneration(s, rid) : null];
    }
    function occurrence(s, t, e, pid) {
      var c = t.controls[pid];
      if (source.type === 'campaign' && e.code === 'won' && c && c.turn !== null && c.after === sovereign(s, pid) &&
          s.owner[pid] === FB.startRealmId(s, source.actor.realmId) &&
          c.after === FB.topRealm(s, FB.startRealmId(s, source.actor.realmId)) && c.turn >= row(s).startedTurn)
        return { source:'control', milestone:'rule_changed', provinceId:pid, turn:c.turn, before:c.before, after:c.after };
      return { source:def.sourceStoryId, milestone:e.code, provinceId:pid, turn:e.turn, before:null, after:null };
    }
    function closure(s, t, item, status) {
      // A personal scene owns its receipt even when the observer is expiring.
      if (!FB.householdStories.receipt(s, item.key) && !FB.householdStories.owner(s, item.key))
        t.householdReceipts[item.key] = { owner:def.id, status:status, turn:s.turn };
      var ids = Object.keys(t.householdReceipts);
      while (ids.length > 64) delete t.householdReceipts[ids.shift()];
    }
    function available(s, t, item) {
      return living(s) && s.player.provinceId === item.provinceId && present(s) === item.provinceId &&
        s.turn <= item.expiresTurn && JSON.stringify(currentControl(s, item.provinceId)) === JSON.stringify(item.control) &&
        events(s).some(function (e) { return e.code === beat(item.beatId).trigger && e.token === item.sourceToken; }) &&
        !FB.householdStories.receipt(s, item.key) && !FB.householdStories.owner(s, item.key);
    }
    function poll(s, t) {
      if (!row(s)) return;
      Object.keys(t.controls).forEach(function (pid) {
        var after = sovereign(s, pid), old = t.controls[pid];
        if (old.after !== after) t.controls[pid] = { before:old.after, after:after, turn:s.turn };
      });
      if (t.actorId !== s.player.charId) { t.actorId = s.player.charId; t.revision++; }
      t.pending = t.pending.filter(function (item) {
        if (available(s, t, item) || s.turn <= item.expiresTurn &&
            s.player.provinceId === item.provinceId && present(s) === item.provinceId && FB.householdStories.owner(s, item.key)) return true;
        closure(s, t, item, 'expired'); t.revision++; return false;
      });
      events(s).forEach(function (e) {
        var b = def.beats.filter(function (v) { return v.trigger === e.code; })[0];
        if (!b) return;
        var old = t.cursors[b.id], token = signature(e);
        if (old && (old.token === token || e.turn < old.turn)) return;
        t.cursors[b.id] = { token:token, turn:e.turn };
        if (!living(s) || b.reach === 'none') return;
        var pid = s.player.provinceId;
        if (present(s) !== pid || !FB.world.byId[pid]) return;
        if (b.reach === 'previous' ? t.reached.indexOf(pid) < 0 : e.places.indexOf(pid) < 0) return;
        if (b.reach === 'service' && (!service(s) || !service(s).contractId)) return;
        var event = occurrence(s, t, e, pid), key = FB.householdStories.receiptKey(t.householdId, event);
        if (FB.householdStories.receipt(s, key) || t.pending.some(function (item) { return item.key === key; })) return;
        if (t.reached.indexOf(pid) < 0) { t.reached.push(pid); if (t.reached.length > 32) t.reached.shift(); }
        // A later result supersedes unaccepted notices from this source.
        if (['won','failed','diverted','interrupted','contest_won','contest_failed','diverged',
          'founded','granted','agreed','executed','declined','expired'].indexOf(e.code) >= 0) {
          t.pending.forEach(function (item) { closure(s, t, item, 'expired'); }); t.pending = [];
        }
        var item = { beatId:b.id, key:key, provinceId:pid, event:event, sourceToken:e.token, offeredTurn:s.turn,
          expiresTurn:s.turn + def.expiryTurns, control:currentControl(s, pid) };
        t.pending.push(item); t.revision++;
        while (t.pending.length > 8) closure(s, t, t.pending.shift(), 'expired');
      });
    }
    function selected(s, t) { return t.pending.filter(function (item) { return available(s, t, item); })[0] || null; }
    function quote(s, t, id) {
      var item = selected(s, t), b = item && beat(item.beatId);
      var choice = b && b.choices.filter(function (c) { return c.id === id; })[0];
      var facts = { turn:s.turn, actorId:s.player.charId, alive:living(s), home:s.player.provinceId, presence:present(s),
        revision:t.revision, item:item, source:row(s), events:events(s), service:service(s), parties:parties(s),
        tenure:s.player.tenure || null, control:item && currentControl(s, item.provinceId), definition:def };
      return { id:id, allowed:!!choice, reason:FB.T('This local notice is no longer available. Review the household again.'),
        facts:facts, stamp:JSON.stringify(facts) };
    }
    function fresh(s) {
      var t = { version:1, householdId:FB.householdStories.householdId(s), actorId:s.player.charId,
        revision:0, attachedTurn:s.turn, cursors:{}, controls:{}, reached:[], pending:[], history:[], householdReceipts:{} };
      def.provinceIds.forEach(function (pid) { t.controls[pid] = { before:null, after:sovereign(s, pid), turn:null }; });
      events(s).forEach(function (e) {
        var b = def.beats.filter(function (v) { return v.trigger === e.code; })[0];
        if (b && e.code !== 'opening') t.cursors[b.id] = { token:signature(e), turn:e.turn };
      });
      poll(s, t);
      return t;
    }
    function validateRecord(t, s) {
      function need(ok) { if (!ok) throw new Error('Invalid household observer record: ' + def.id + '.'); }
      function stamp(v) { return integer(v) && (!s || v <= s.turn); }
      function person(v) { return text(v, 200); }
      need(keys(t, ['version','householdId','actorId','revision','attachedTurn','cursors','controls','reached','pending','history','householdReceipts']) &&
        t.version === 1 && person(t.householdId) && person(t.actorId) && integer(t.revision) && stamp(t.attachedTurn) &&
        plain(t.cursors) && plain(t.controls) && plain(t.householdReceipts) && Array.isArray(t.reached) &&
        t.reached.length <= 32 && Array.isArray(t.pending) && t.pending.length <= 8 && Array.isArray(t.history) && t.history.length <= 16);
      t.reached.forEach(function (pid, i) { need(slug(pid) && t.reached.indexOf(pid) === i && (!s || own(s.owner, pid))); });
      Object.keys(t.cursors).forEach(function (id) {
        var c = t.cursors[id]; need(beat(id) && keys(c, ['token','turn']) && stamp(c.turn) && text(c.token, 8000));
        var value; try { value = JSON.parse(c.token); } catch (err) { need(false); }
        need(Array.isArray(value) && value.length === 2 && value[0] === beat(id).trigger && JSON.stringify(value) === c.token);
      });
      need(Object.keys(t.controls).length === def.provinceIds.length);
      Object.keys(t.controls).forEach(function (pid) {
        var c = t.controls[pid]; need(def.provinceIds.indexOf(pid) >= 0 && keys(c, ['before','after','turn']) &&
          (c.before === null || slug(c.before)) && (c.after === null || slug(c.after)) && (c.turn === null || stamp(c.turn)));
      });
      function event(e) {
        need(keys(e, ['source','milestone','provinceId','turn','before','after']) && slug(e.provinceId) && stamp(e.turn) &&
          (e.source === def.sourceStoryId && def.beats.some(function (b) { return b.trigger === e.milestone; }) && e.before === null && e.after === null ||
          source.type === 'campaign' && e.source === 'control' && e.milestone === 'rule_changed' &&
          def.provinceIds.indexOf(e.provinceId) >= 0 && (e.before === null || slug(e.before)) && (e.after === null || slug(e.after))));
      }
      var pendingKeys = Object.create(null);
      t.pending.forEach(function (item) {
        need(keys(item, ['beatId','key','provinceId','event','sourceToken','offeredTurn','expiresTurn','control']) && beat(item.beatId) &&
          text(item.sourceToken, 8000) &&
          stamp(item.offeredTurn) && item.offeredTurn >= t.attachedTurn && integer(item.expiresTurn) &&
          item.expiresTurn === item.offeredTurn + def.expiryTurns && item.provinceId === item.event.provinceId &&
          Array.isArray(item.control) && item.control.length === 4 && item.control.slice(0,3).every(function (id) { return id === null || slug(id); }) &&
          (item.control[3] === null || integer(item.control[3])));
        var token; try { token = JSON.parse(item.sourceToken); } catch (err) { need(false); }
        need(Array.isArray(token) && token.length === 2 && token[0] === beat(item.beatId).trigger && JSON.stringify(token) === item.sourceToken);
        event(item.event); need(item.event.turn <= item.offeredTurn &&
          (!s || own(s.owner, item.provinceId)) &&
          item.key === FB.householdStories.receiptKey(t.householdId, item.event) && !pendingKeys[item.key] &&
          !own(t.householdReceipts, item.key)); pendingKeys[item.key] = true;
      });
      t.history.forEach(function (h) {
        var b = beat(h.beatId); need(keys(h, ['beatId','choiceId','actorId','turn']) && b &&
          b.choices.some(function (c) { return c.id === h.choiceId; }) && person(h.actorId) && stamp(h.turn));
      });
      need(Object.keys(t.householdReceipts).length <= 64);
      Object.keys(t.householdReceipts).forEach(function (key) {
        var parts, r = t.householdReceipts[key];
        try { parts = JSON.parse(key); } catch (err) { need(false); }
        need(Array.isArray(parts) && parts.length === 7 && parts[0] === t.householdId && JSON.stringify(parts) === key);
        event({ source:parts[1], milestone:parts[2], provinceId:parts[3], turn:parts[4], before:parts[5], after:parts[6] });
        need(keys(r, ['owner','status','turn']) && r.owner === def.id && ['resolved','expired'].indexOf(r.status) >= 0 && stamp(r.turn) && r.turn >= parts[4]);
      });
    }
    return { id:def.id, kind:'world', requires:def.requires,
      init:fresh, day:poll, season:poll, year:poll,
      observe:function (s, t, id) { if (id === def.sourceStoryId || source.parameters && id === source.parameters.serviceTrackId) poll(s, t); },
      title:function () { return FB.T(def.title); }, intro:function () { return FB.T(def.intro); },
      status:function (s, t) { var item = selected(s, t); if (!item) return null; var b = beat(item.beatId);
        return { phase:'offered', name:FB.T(b.name), lines:[FB.T(b.text)] }; },
      choices:function (s, t) { var item = selected(s, t); return item ? beat(item.beatId).choices.map(function (c) {
        return { id:c.id, label:FB.T(c.label), detail:FB.T(c.detail) }; }) : []; },
      quote:quote, blocker:function (s, t, reason) { return reason; },
      review:function (s, t, id, q) {
        var lines = [FB.T('No payment or action days. This records your response to a local report.'),
          FB.T('Existing property, faith, service, debts and wars continue under their ordinary rules.')];
        if (q.facts.tenure) lines.push(FB.T('Your current tenure and its obligations remain in Station & home. This notice waives none of them.'));
        var r = row(s), status = FB.stories.status(s, def.sourceStoryId), entitlement = service(s);
        if (status) { lines.push(status.name); lines = lines.concat(status.lines || []); }
        if (source.type === 'tribute_cession' && r.ceded)
          lines.push(FB.T('Public tribute paid so far: {money:amount}. This is a court payment.', { amount:r.totalPaid }));
        if (source.type === 'civilian_migration') (r.routes || []).forEach(function (route) {
          lines.push(FB.T('{from} to {to}: {moved} of {planned} civilians relocated.',
            { from:FB.world.byId[route.from].name, to:FB.world.byId[route.to].name, moved:route.moved, planned:route.planned }));
        });
        if (entitlement && entitlement.contractId && entitlement.lastAllocatedPeriod > 0)
          lines.push(FB.T('Last recorded household service payment: period {n}.', { n:entitlement.lastAllocatedPeriod }));
        return lines;
      },
      apply:function (s, t, id, reviewed) {
        var q = quote(s, t, id);
        if (!q.allowed || !reviewed || reviewed.id !== id || reviewed.stamp !== q.stamp) return false;
        var item = selected(s, t); closure(s, t, item, 'resolved');
        t.history.push({ beatId:item.beatId, choiceId:id, actorId:s.player.charId, turn:s.turn });
        if (t.history.length > 16) t.history.shift();
        t.pending = t.pending.filter(function (other) { return other.key !== item.key; }); t.revision++; return true;
      },
      validate:validateRecord
    };
  }
  FB.stories.registerType('household_observer', factory, 'js/story_household_observer.js', validate);
})();
