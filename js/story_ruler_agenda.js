/* Bounded personal agendas. Political effects belong to the reviewed source
   transaction; recording a priority or an observed fact grants no reward. */
(function () {
  'use strict';
  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function plain(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function slug(v) { return typeof v === 'string' && /^[a-z][a-z0-9_]*$/.test(v); }
  function keys(o, allowed) { return plain(o) && Object.keys(o).every(function (k) { return allowed.indexOf(k) >= 0; }); }
  function text(v) { return typeof v === 'string' && v.length > 0 && v.length <= 4000; }
  var operations = ['agenda_priority','agenda_finish','agenda_story_choice','agenda_story_fact',
    'agenda_provincial_terms','agenda_dues','agenda_public_record','agenda_mobile_offer',
    'agenda_mobile','agenda_mobile_prepare','agenda_mobile_result','agenda_defer','agenda_mandate'];
  var recordKinds = ['agenda_appointments','agenda_recognition','agenda_mobile_agreement','agenda_collective_decision'];
  function check(def, context, bm) {
    function need(ok, field) { if (!ok) throw new Error('Invalid ruler agenda: ' + field + '.'); }
    need(keys(def, ['id','type','subjectRealmId','binding','title','intro','requires','stages','registrationBefore','registrationAfter']), 'fields');
    need(slug(def.subjectRealmId) && text(def.title) && text(def.intro), 'subject or display');
    if (def.binding !== undefined) need(FB.schema.valid(def.binding,{type:'object',fields:{
      kind:{enum:['mandate_holder','mandate_court']},officeId:{type:'string',ref:{table:'authorityOffices'}},
      waitForOffice:{value:true,optional:'absent'}}}) &&
      (!def.binding.waitForOffice || def.binding.kind === 'mandate_court') &&
      !!FBDATA.authorityOffices[def.binding.officeId].mandate, 'mandate binding');
    if (bm && def.binding) need((bm.realms || []).some(function (r) {return r.id === def.subjectRealmId;}), 'mandate court');
    need(Array.isArray(def.stages) && def.stages.length > 0 && def.stages.length <= 16, 'stages');
    var stages = Object.create(null), choices = Object.create(null);
    def.stages.forEach(function (stage) {
      need(keys(stage, ['id','name','text','year','season','choices','completion','retiredChoiceIds']) && slug(stage.id) && !stages[stage.id], 'stage');
      stages[stage.id] = true;
      need(text(stage.name) && text(stage.text) && Number.isInteger(stage.year) && stage.year > 0 && stage.year <= 9999 &&
        Number.isInteger(stage.season) && stage.season >= 0 && stage.season <= 3, 'stage date or display');
      need(Array.isArray(stage.choices) && stage.choices.length > 0 && stage.choices.length <= 12, 'choices');
      if (stage.completion!==undefined) {
        need(keys(stage.completion,['kind']) && Object.keys(stage.completion).length===1 &&
          ['demand','raid','distribution','arrival','settlement'].indexOf(stage.completion.kind)>=0, 'mobile completion');
        need(FB.mobile.storyCompletionValid(stage.completion.kind,def.subjectRealmId,bm), 'mobile source policy');
        need(stage.choices.some(function (c) {return c.operation==='agenda_defer';}) &&
          stage.choices.filter(function (c) {return c.operation==='agenda_mobile_result';}).length===1 &&
          stage.choices.every(function (c) {return ['agenda_mobile','agenda_mobile_prepare','agenda_mobile_result','agenda_defer'].indexOf(c.operation)>=0;}), 'transaction stage alternatives');
      } else need(stage.choices.some(function (c) { return c.operation === 'agenda_priority'; }), 'unconditional alternative');
      stage.choices.forEach(function (c) {
        need(plain(c) && (c.operation === 'agenda_mandate' ? FB.schema.valid(c,{type:'object',fields:{
          id:{type:'string'},label:{type:'string'},detail:{type:'string'},operation:{value:'agenda_mandate'},service:FB.officeMandates.storySpec}}) :
          keys(c, ['id','label','detail','operation','storyId','choiceId','stateField','values','interestId','revenue','levy','amount','duration',
            'recordKind','otherRealmId','recordOperation','action','terms'])) && slug(c.id) && c.id !== 'agenda_stop_program' && !choices[c.id], 'choice fields or duplicate');
        choices[c.id] = true;
        need(text(c.label) && text(c.detail) && operations.indexOf(c.operation) >= 0, 'choice operation or display');
        var fields = ['id','label','detail','operation'];
        if (c.operation === 'agenda_mandate') {
          need(!!def.binding && !FB.officeMandates.storyFaults(c.service,bm).length &&
            c.service.realmId === def.subjectRealmId && c.service.officeId === def.binding.officeId &&
            c.service.action !== 'petition' && (c.service.action === 'dismiss') === (def.binding.kind === 'mandate_court'), 'mandate transaction');
          return;
        } else if (c.operation==='agenda_mobile' || c.operation==='agenda_mobile_prepare') {
          fields=fields.concat(['action','terms']);
          need(!!stage.completion && !FB.mobile.storyActionFaults(c.action,c.terms,def.subjectRealmId,bm), 'mobile transaction');
          need(c.operation!=='agenda_mobile_prepare' || ['demand','raid','access','settle'].indexOf(c.action)>=0, 'mobile proposal');
        } else if (c.operation==='agenda_defer' || c.operation==='agenda_mobile_result') {
          need(!!stage.completion, 'transaction-only choice');
        } else if (c.operation === 'agenda_story_choice' || c.operation === 'agenda_story_fact') {
          fields.push('storyId');
          need((def.requires || []).indexOf(c.storyId) >= 0 && context.get(c.storyId), 'source dependency');
          if (c.operation === 'agenda_story_choice') {
            fields.push('choiceId'); need(slug(c.choiceId) && c.storyId !== def.id, 'source choice');
          } else {
            fields = fields.concat(['stateField','values']);
            need(['result','aiResolution','governanceResolved','playerDecision'].indexOf(c.stateField) >= 0 &&
              Array.isArray(c.values) && c.values.length > 0 && c.values.length <= 16 && c.values.every(function (v, i) {
                return slug(v) && c.values.indexOf(v) === i;
              }), 'source fact');
          }
          var source = context.get(c.storyId);
          need(source.kind === 'world' && (!source.declaration || source.declaration.type !== def.type), 'world source');
          if (c.operation === 'agenda_story_choice') {
            var declared = source.declaration && source.declaration.choices;
            var ids = declared ? Object.keys(declared).map(function (key) { return declared[key].id; }) : source.choiceIds;
            need(Array.isArray(ids) && ids.indexOf(c.choiceId) >= 0, 'unknown or unsupported source choice');
          }
        } else if (c.operation === 'agenda_provincial_terms') {
          fields = fields.concat(['interestId','revenue','levy']);
          need(slug(c.interestId) && Number.isFinite(c.revenue) && c.revenue >= 0 && c.revenue <= 1 &&
            Number.isFinite(c.levy) && c.levy >= 0 && c.levy <= 1, 'provincial terms');
        } else if (c.operation === 'agenda_dues') {
          fields = fields.concat(['amount','duration']);
          need(Number.isFinite(c.amount) && c.amount > 0 && c.amount <= 100000 && Number.isInteger(c.duration) &&
            c.duration > 0 && c.duration <= 360, 'dues terms');
        } else if (c.operation === 'agenda_mobile_offer') {
          fields.push('otherRealmId'); need(slug(c.otherRealmId) && c.otherRealmId !== def.subjectRealmId, 'offer party');
        } else if (c.operation === 'agenda_public_record') {
          fields.push('recordKind'); need(recordKinds.indexOf(c.recordKind) >= 0, 'record kind');
          if (c.recordKind === 'agenda_mobile_agreement') {
            fields.push('otherRealmId'); need(slug(c.otherRealmId) && c.otherRealmId !== def.subjectRealmId, 'agreement party');
          } else if (c.recordKind === 'agenda_collective_decision') {
            fields.push('recordOperation'); need(['war','treaty','extraordinary_tax'].indexOf(c.recordOperation) >= 0, 'reserved operation');
          }
        }
        need(Object.keys(c).every(function (k) { return fields.indexOf(k) >= 0; }), 'incompatible choice fields');
      });
      /* Ids of removed choices that old saves may hold. They restore as a
         decided priority and are never offered or quoted again. */
      if (stage.retiredChoiceIds !== undefined) need(!stage.completion && Array.isArray(stage.retiredChoiceIds) &&
        stage.retiredChoiceIds.length > 0 && stage.retiredChoiceIds.length <= 12 && stage.retiredChoiceIds.every(function (id) {
          if (!slug(id) || id === 'agenda_stop_program' || choices[id]) return false;
          choices[id] = true; return true;
        }), 'retired choices');
    });
  }
  function retired(st, id) {
    return !!st && Array.isArray(st.retiredChoiceIds) && st.retiredChoiceIds.indexOf(id) >= 0 ?
      { id:id, operation:'agenda_priority' } : null;
  }
  function factory(def, context) {
    var C = FB.governments.support;
    function beginning(s) {
      if (def.binding && def.binding.waitForOffice) return !!s.start;
      if (def.binding && def.binding.kind === 'mandate_holder') return !!s.start;
      return !!s.start && (s.start.rulerRealmId === def.subjectRealmId ||
        s.start.mobilePrincipal && s.start.mobilePrincipal.realmId === def.subjectRealmId);
    }
    function realm(s) {
      var row = def.binding && FB.officeMandates.storyRow(s,{realmId:def.subjectRealmId,officeId:def.binding.officeId});
      return row ? row.institutionId : FB.startRealmId(s, def.subjectRealmId);
    }
    function subject(s,t) {
      var rid = realm(s), r = s.realms[rid], row = C.row(s, rid), delegated = C.isDelegated(s, rid);
      if (def.binding) {
        var a = {realmId:def.subjectRealmId,officeId:def.binding.officeId};
        var appointment = FB.officeMandates.storyRow(s,a,s.player.charId,t && t.mandateId,def.binding.kind === 'mandate_court');
        var who = def.binding.kind === 'mandate_holder' ? appointment ? s.chars[appointment.holder.id] : s.chars[s.player.charId] :
          rid === 'player' ? s.chars[s.player.charId] : FB.realmRulerCharacterSnapshot(s,rid);
        return {id:who && who.id || null,generation:FB.realmRulerGeneration(s,rid),mandateId:appointment && appointment.id || null,
          jurisdiction:!!r && r.alive && (!!r.nonTerritorial || FB.realmTerritory(s,rid).length > 0) &&
            (def.binding.kind !== 'mandate_holder' || !FB.isReigningRealmRuler(s,who) && !FB.station.rulesRealm(s.player,s))};
      }
      var c = delegated ? C.delegate(s, rid) : r && r.alive && FB.stories.ruler(s, def.subjectRealmId);
      return { id:c && c.id || null, generation:FB.realmRulerGeneration(s, rid),
        mandateId:delegated && row && row.mandate ? row.mandate.id : null,
        jurisdiction:!!(r && r.alive) && (delegated ? !!row && row.scopes.every(function (pid) { return s.owner[pid] === rid && s.holder[pid] === rid; }) :
          !!r.nonTerritorial || FB.realmTerritory(s, rid).length > 0) };
    }
    function current(s, t) {
      if (def.binding && def.binding.kind === 'mandate_holder' && !t.mandateId) return false;
      var f = subject(s,t), c = s.chars[t.subjectId];
      var mobile=FB.mobile.row(s,realm(s)),settled=stage(t) && stage(t).completion && stage(t).completion.kind==='settlement' &&
        mobile && mobile.status==='settled' && mobile.lastSettlement && mobile.lastSettlement.final &&
        mobile.lastSettlement.principal.characterId===t.subjectId && mobile.lastSettlement.principal.generation===t.generation;
      return t.status === 'agenda_open' && !!c && !c.dead && !s.player.dead && s.player.charId === t.subjectId &&
        beginning(s) && (settled || f.id === t.subjectId && f.generation === t.generation &&
        (def.binding && def.binding.kind === 'mandate_court' || f.mandateId === t.mandateId) && f.jurisdiction);
    }
    function stage(t) { return def.stages[t.step] || null; }
    function ready(s, st) { return !!st && (s.date.year > st.year || s.date.year === st.year && s.date.season >= st.season); }
    function choice(t, id) { return stage(t) && stage(t).choices.filter(function (c) { return c.id === id; })[0] || null; }
    function observed(s, t, c) {
      var rid = realm(s), rows = [], gov = s.authority && s.authority.governments[rid];
      if (c.recordKind === 'agenda_appointments') {
        rows = FB.publicOfficeRows(s, rid).filter(function (a) { return a.effective && a.startTurn >= t.openedTurn; });
      } else if (c.recordKind === 'agenda_recognition') {
        rows = Object.keys(gov && gov.recognition || {}).sort().map(function (id) { return gov.recognition[id]; }).filter(function (r) {
          return r && r.generation === t.generation && !!r.candidateId;
        });
      } else if (c.recordKind === 'agenda_mobile_agreement') {
        rows = FB.mobile.agreements(s, FB.startRealmId(s, c.otherRealmId)).filter(function (a) {
          return a.status === 'active' && a.partnerId === rid && a.endTurn > s.turn && a.startTurn >= t.openedTurn;
        });
      } else if (c.recordKind === 'agenda_collective_decision') {
        var local = C.row(s, rid);
        rows = (local && local.decisions || []).filter(function (d) {
          return d.status === 'executed' && d.operation === c.recordOperation && d.generation === t.generation &&
            d.mandateId === t.mandateId && d.turn >= t.openedTurn;
        });
      }
      return copy(rows);
    }
    function source(s, t, c) {
      if (!c) return null;
      if (c.operation === 'agenda_mandate') return FB.officeMandates.storyReview(s,c.service,t.subjectId,t.mandateId);
      if (c.operation==='agenda_defer') return {allowed:true};
      if (c.operation==='agenda_mobile' || c.operation==='agenda_mobile_prepare') {
        var reviewed=FB.mobile.storyReview(s,realm(s),t.subjectId,c.action,c.terms,c.operation==='agenda_mobile_prepare');
        return reviewed ? {allowed:reviewed.review.allowed,reviewed:reviewed} : null;
      }
      if (c.operation==='agenda_mobile_result') {
        var since=t.step ? t.decisions[t.step-1].turn : t.openedTurn;
        var evidence=FB.mobile.storyEvidence(s,realm(s),stage(t).completion.kind,t.subjectId,t.generation,since);
        var used=evidence && t.decisions.some(function (d) {return d.evidence && same(d.evidence,evidence);});
        return {allowed:!!evidence && !used,evidence:evidence};
      }
      if (c.operation === 'agenda_story_choice') {
        var story = context.get(c.storyId), rec = FB.stories.record(s, c.storyId);
        return story && rec && story.choices && story.choices(s, rec).some(function (row) { return row.id === c.choiceId; }) &&
          story.quote ? story.quote(s, rec, c.choiceId) : null;
      }
      if (c.operation === 'agenda_story_fact') {
        var saved = FB.stories.record(s, c.storyId);
        return saved && typeof saved[c.stateField] === 'string' ? { value:saved[c.stateField], allowed:c.values.indexOf(saved[c.stateField]) >= 0 } : null;
      }
      if (c.operation === 'agenda_provincial_terms') return FB.aristocracy.provincialQuote(s,
        { kind:'realm', id:realm(s) }, realm(s), c.interestId, 'negotiate', { revenue:c.revenue, levy:c.levy });
      if (c.operation === 'agenda_dues') return C.duesQuote(s, realm(s), { amount:c.amount, duration:c.duration });
      if (c.operation === 'agenda_mobile_offer') {
        var mobileId = FB.startRealmId(s, c.otherRealmId);
        var offer = FB.mobile.agreements(s, mobileId).filter(function (a) { return a.status === 'offered' && a.partnerId === realm(s); })
          .sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; })[0];
        var review = offer && FB.mobile.review(s, { realmId:mobileId, action:'accept', actor:{ kind:'realm', id:realm(s) }, terms:{ agreementId:offer.id } });
        return review ? { allowed:review.review.allowed, reviewed:review, offer:copy(offer) } : null;
      }
      if (c.operation === 'agenda_public_record') {
        var rows = observed(s, t, c); return { allowed:rows.length > 0, rows:rows };
      }
      return null;
    }
    function quote(s, t, id) {
      var c = choice(t, id), cancel = id === 'agenda_stop_program', st = stage(t);
      var q = c && source(s, t, c), hasAction = c && ['agenda_priority','agenda_finish'].indexOf(c.operation) < 0;
      var waiting = def.binding && (def.binding.waitForOffice && t.generation === 0 || def.binding.kind === 'mandate_holder' && !t.mandateId) && t.status === 'agenda_open' &&
        t.subjectId === s.player.charId && !s.player.dead && s.chars[t.subjectId] && !s.chars[t.subjectId].dead;
      return { id:id, allowed:!!(waiting && cancel || current(s, t) && (cancel || ready(s, st) && c && (!hasAction || q && q.allowed))),
        reason:c && c.operation === 'agenda_mandate' && q && !q.allowed ? {mandateReason:q.reason} :
          c && c.operation === 'agenda_story_choice' && q && !q.allowed ? { storyId:c.storyId, reason:q.reason } :
          q && q.reviewed && !q.allowed ? {mobileReason:q.reviewed.review.reason,
            action:q.reviewed.request.action,countyId:q.reviewed.request.terms.countyId || null} : null,
        facts:{ definition:copy(def), record:copy(t), subject:subject(s,t), turn:s.turn, date:copy(s.date), source:q,
          publicFunds:FB.treasuryAvailable(s, realm(s)), privateFunds:s.player.gold } };
    }
    function close(s, t, status) { t.status = status; t.outcomeTurn = s.turn; }
    function apply(s, t, id, reviewed) {
      var fresh = quote(s, t, id);
      if (!reviewed || !fresh.allowed || !same(fresh, reviewed)) return false;
      if (id === 'agenda_stop_program') { close(s, t, 'agenda_stopped'); return true; }
      var c = choice(t, id), q = fresh.facts.source;
      var officeResult = null;
      if (c.operation === 'agenda_mandate') {
        officeResult = FB.officeMandates.storyCommit(s,c.service,t.subjectId,t.mandateId,q);
        if (!officeResult) return false;
      }
      if (c.operation==='agenda_defer') return true;
      if (c.operation==='agenda_mobile' || c.operation==='agenda_mobile_prepare') return FB.mobile.commit(s,q.reviewed);
      if (c.operation === 'agenda_story_choice') {
        if (!FB.stories.apply(s, c.storyId, c.choiceId, q)) return false;
      } else if (c.operation === 'agenda_provincial_terms' && !FB.aristocracy.apply(s, q)) return false;
      else if (c.operation === 'agenda_dues' && !C.imposeDues(s, q)) return false;
      else if (c.operation === 'agenda_mobile_offer' && !FB.mobile.commit(s, q.reviewed)) return false;
      var decision={stageId:stage(t).id,choiceId:id,turn:s.turn};
      if (officeResult) decision.office = FB.officeMandates.storyEvidence(q,officeResult);
      if (c.operation==='agenda_mobile_result') decision.evidence=copy(q.evidence);
      t.decisions.push(decision);
      t.step++;
      if (t.step === def.stages.length || c.operation === 'agenda_finish') close(s, t, 'agenda_complete');
      return true;
    }
    function day(s, t) {
      if (t.status !== 'agenda_open') return;
      if (def.binding && def.binding.waitForOffice && t.generation === 0) {
        var authority = subject(s,t);
        if (s.player.charId !== t.subjectId || s.player.dead || !s.chars[t.subjectId] || s.chars[t.subjectId].dead) {close(s,t,'agenda_interrupted');return;}
        if (authority.id !== t.subjectId || !authority.jurisdiction) return;
        t.generation = authority.generation; t.mandateId = authority.mandateId;
      }
      if (def.binding && !t.mandateId) {
        var f = subject(s,t);
        if (f.id === t.subjectId && f.generation === t.generation && f.jurisdiction && !s.player.dead &&
            s.chars[t.subjectId] && !s.chars[t.subjectId].dead) {
          if (!f.mandateId && def.binding.kind === 'mandate_holder') return;
          t.mandateId = f.mandateId;
        }
      }
      if (!current(s,t)) {close(s,t,'agenda_interrupted');return;}
      if (stage(t).completion && ready(s,stage(t))) {
        var c=stage(t).choices.filter(function (c) {return c.operation==='agenda_mobile_result';})[0],q=quote(s,t,c.id);
        if (q.allowed) apply(s,t,c.id,q);
      }
    }
    function validate(t, s) {
      function need(ok) { if (!ok) throw new Error(FB.T('Invalid v4 save field at {path}.', { path:'state.stories.' + def.id })); }
      need(keys(t, ['schema','subjectId','generation','mandateId','step','status','openedTurn','outcomeTurn','decisions']) && Object.keys(t).length === 9);
      need(t.schema === 1 && typeof t.subjectId === 'string' && !!t.subjectId && Number.isInteger(t.generation) &&
        (t.generation >= 1 || def.binding && def.binding.waitForOffice && t.generation === 0 && t.mandateId === null && t.step === 0) &&
        (t.mandateId === null || typeof t.mandateId === 'string' && !!t.mandateId));
      need(Number.isInteger(t.openedTurn) && t.openedTurn >= 0 && Number.isInteger(t.step) && t.step >= 0 && t.step <= def.stages.length &&
        ['agenda_open','agenda_complete','agenda_stopped','agenda_interrupted'].indexOf(t.status) >= 0);
      need(Array.isArray(t.decisions) && t.decisions.length === t.step);
      var lastTurn = t.openedTurn, finish = false;
      t.decisions.forEach(function (d, i) {
        var st = def.stages[i], c = plain(d) && (st.choices.filter(function (row) { return row.id === d.choiceId; })[0] ||
          retired(st, d.choiceId));
        need(keys(d, ['stageId','choiceId','turn','evidence','office']) && Object.keys(d).length === (st.completion || c && c.operation === 'agenda_mandate' ? 4 : 3) && d.stageId === st.id && c && !finish &&
          Number.isInteger(d.turn) && d.turn >= lastTurn);
        need(c.operation === 'agenda_mandate' ? d.office && d.office.appointmentId === t.mandateId &&
          FB.officeMandates.storyEvidenceValid(s,d.office,c.service,t.subjectId,d.turn) : !own(d,'office'));
        if (st.completion) need(c.operation==='agenda_mobile_result' &&
          FB.mobile.storyEvidenceValid(d.evidence,st.completion.kind,t.subjectId,t.generation,lastTurn,d.turn) &&
          (!s || FB.mobile.storyEvidenceMatches(s,realm(s),d.evidence)) &&
          !t.decisions.slice(0,i).some(function (old) {return old.evidence && same(old.evidence,d.evidence);}));
        lastTurn = d.turn; finish = c.operation === 'agenda_finish';
      });
      need(t.status === 'agenda_open' ? t.step < def.stages.length && !finish && t.outcomeTurn === null :
        Number.isInteger(t.outcomeTurn) && t.outcomeTurn >= lastTurn && (t.status !== 'agenda_complete' || finish || t.step === def.stages.length));
      need(t.status === 'agenda_complete' || t.step < def.stages.length && !finish);
      if (s) need(beginning(s) && t.openedTurn <= s.turn && lastTurn <= s.turn &&
        (t.outcomeTurn === null || t.outcomeTurn <= s.turn));
      if (s && def.binding && t.mandateId) need(!!FB.officeMandates.storyRow(s,
        {realmId:def.subjectRealmId,officeId:def.binding.officeId},t.subjectId,t.mandateId,def.binding.kind === 'mandate_court'));
      if (def.binding && def.binding.kind === 'mandate_holder' && !t.mandateId) need(t.step === 0);
    }
    return { id:def.id, kind:'track', requires:def.requires,
      appliesToBookmark:function (bm) { return (bm.realms || []).some(function (r) { return r.id === def.subjectRealmId; }); },
      init:function (s) {
        var f = subject(s);
        if (def.binding && def.binding.waitForOffice && beginning(s) && f.id !== s.player.charId) return {
          schema:1,subjectId:s.player.charId,generation:0,mandateId:null,step:0,status:'agenda_open',openedTurn:s.turn,outcomeTurn:null,decisions:[]};
        if (!beginning(s) || !f.id || f.id !== s.player.charId || !f.jurisdiction) return;
        return { schema:1, subjectId:f.id, generation:f.generation, mandateId:f.mandateId, step:0,
          status:'agenda_open', openedTurn:s.turn, outcomeTurn:null, decisions:[] };
      },
      title:function () { return FB.T(def.title); }, intro:function () { return FB.T(def.intro); },
      people:function (s, t) {
        var waiting = def.binding && (t.generation === 0 || def.binding.kind === 'mandate_holder' && !t.mandateId);
        return [{ characterId:t.subjectId, label:waiting ? FB.T('Original person') : FB.T('Original incumbent'),
          detail:waiting ? FB.T('This program grants no office. It waits for the original person to acquire the declared authority.') :
            def.binding && def.binding.kind === 'mandate_holder' ? FB.T('This personal program belongs to the original service holder and appointment.') :
              FB.T('This personal program belongs to this ruler and the original mandate.'), reason:'' }];
      },
      status:function (s, t) {
        var st = stage(t), lines = [];
        if (t.generation === 0) lines.push(FB.T('This program waits until its original protagonist actually holds the declared court. Attachment grants no authority.'));
        if (def.binding && def.binding.kind === 'mandate_holder' && !t.mandateId) lines.push(FB.T('This program waits for an actual personal service appointment from its declared court.'));
        if (t.status === 'agenda_interrupted') lines.push(FB.T('This personal program ended when its original incumbent lost the office, mandate or required jurisdiction.'));
        else if (t.status === 'agenda_stopped') lines.push(FB.T('You set this program aside. Ordinary decisions remain available.'));
        else if (t.status === 'agenda_complete') lines.push(FB.T('The program is complete. Its decisions create no additional reward.'));
        else {
          lines.push(FB.T(st.text));
          var rid = realm(s), seen = Object.create(null);
          lines.push(FB.treasurySeparated(s, rid) ?
            FB.T('Available public funds: {money:funds}. Private purse: {money:privateFunds}.',
              { funds:FB.treasuryAvailable(s, rid), privateFunds:s.player.gold }) :
            FB.T('Available court funds: {money:funds}.', { funds:FB.treasuryAvailable(s, rid) }));
          st.choices.forEach(function (c) {
            if (!c.storyId || seen[c.storyId]) return;
            seen[c.storyId] = true;
            var story = context.get(c.storyId), rec = FB.stories.record(s, c.storyId);
            var status = story && rec && story.status && story.status(s, rec);
            if (!status) return;
            lines.push(FB.T('{story}: {status}.', { story:story.title(s, rec), status:status.name }));
            lines = lines.concat(status.lines || []);
          });
          if (!ready(s, st)) lines.push(FB.T('The next review opens in year {year}, season {season}.', { year:st.year, season:st.season + 1 }));
        }
        return { phase:t.status, name:st && t.status === 'agenda_open' ? FB.T(st.name) : FB.T(def.title), lines:lines };
      },
      choices:function (s, t) {
        if (!current(s, t)) return quote(s,t,'agenda_stop_program').allowed ? [{id:'agenda_stop_program',
          label:FB.T('Set the program aside'),detail:FB.T('End this personal agenda without a payment, political commitment or restriction on ordinary play.')}] : [];
        var rows = ready(s, stage(t)) ? stage(t).choices.map(function (c) {
          var story = c.operation === 'agenda_story_choice' && context.get(c.storyId), rec = story && FB.stories.record(s, c.storyId);
          var original = rec && story.choices && story.choices(s, rec).filter(function (row) { return row.id === c.choiceId; })[0];
          return { id:c.id, label:FB.T(c.label), detail:FB.T(c.detail) + (original ? ' ' + original.detail : '') };
        }) : [];
        rows.push({ id:'agenda_stop_program', label:FB.T('Set the program aside'), detail:FB.T('End this personal agenda without a payment, political commitment or restriction on ordinary play.') });
        return rows;
      }, quote:quote, apply:apply, day:day, season:day, year:day, observe:day,
      blocker:function (s, t, reason) {
        if (reason && reason.mandateReason) return reason.mandateReason;
        if (reason && reason.action==='settle' && reason.countyId && FB.world.byId[reason.countyId] &&
            FB.mobile.migration(s,realm(s)) && FB.mobile.migration(s,realm(s)).at!==reason.countyId)
          return FB.T('This settlement choice concerns {province}. The civilian camp must actually arrive there, with lawful land rights and member assent.',{province:FB.world.byId[reason.countyId].name});
        if (reason && reason.mobileReason==='commitment') return FB.T('A current tribute, protection or service commitment, war or moving host blocks this action. Wait for the finite agreement to end and reunite the halted host with the camp before reviewing again.');
        if (reason && reason.mobileReason==='withheld') return FB.T('The members have not assented to these exact terms. Propose them here, give only your own assent in Mobile coalition, and let the other members answer before returning.');
        if (reason && reason.mobileReason==='access') return FB.T('The actual holder must grant current access to the ground and every intervening county. Send the offer after member assent, wait for outside acceptance and review the real route again.');
        var story = reason && reason.storyId && context.get(reason.storyId);
        if (story && story.blocker) return story.blocker(s, FB.stories.record(s, reason.storyId), reason.reason);
        return FB.T('The original incumbent, review date and current source decision or recorded public action must still permit this choice. Use its ordinary review or retain the present arrangements.');
      },
      review:function (s, t, id, reviewed) {
        var q = reviewed.facts.source, lines = [FB.T('Recording this agenda adds no reward. Any political effect uses the existing decision and its current consent.')];
        var serviceChoice = choice(t,id);
        if (serviceChoice && serviceChoice.operation === 'agenda_mandate') return FB.officeMandates.storyDetails(s,serviceChoice.service,q);
        var mobile=choice(t,id);
        if (mobile && ['agenda_mobile','agenda_mobile_prepare'].indexOf(mobile.operation)>=0 && q && q.reviewed) {
          var review=q.reviewed.review;
          lines.push(FB.T('Public cost: {money:cost}. Member assent and outside consent remain independent. Proposals and departures leave the stage pending.',{cost:review.cost || 0}));
          var request=q.reviewed.request,terms=request.action==='propose' ? request.terms.proposal : request.terms;
          if (request.action==='settle' || request.action==='propose' && request.terms.operation==='settle')
            lines.push(FB.T('Settlement: {count} people at {province}. People remaining mobile: {remaining}.',
              {count:terms.count,province:FB.world.byId[terms.countyId].name,remaining:Math.max(0,FB.mobile.total(s,realm(s))-terms.count)}));
          if (review.round) lines.push(FB.T('Travel food surcharge: {food}. Journey: {days} days. Completion requires the actual camp and host to arrive.',{food:review.round.food,days:review.round.days}));
          if (review.distribution) {
            lines.push(FB.T('Immediate food consumption: {food}. This divides existing receipts and creates no reward.',{food:review.distribution.food}));
            review.distribution.rows.forEach(function (part) {lines.push(FB.T('Member share: {money:gold}, {food} food; resulting support {support}.',
              {gold:part.gold,food:part.food,support:part.support}));});
          }
          if (review.raid) lines.push(FB.T('Raid forecast: {money:gold}, {food} food; {losses} fighter casualties. No land or occupation is granted.',{gold:review.raid.gold,food:review.raid.food,losses:review.raid.casualties}));
          return lines;
        }
        if (q && Number.isFinite(q.cost)) lines.push(FB.T('Public treasury cost: {money:cost}.', { cost:q.cost }));
        if (q && q.terms && q.terms.amount !== undefined) lines.push(FB.T('Proposed extraordinary dues: {money:amount} for {days} days. Receipts belong to the public institution.', { amount:q.terms.amount, days:q.terms.duration }));
        if (q && q.reviewed) {
          lines.push(q.reviewed.review.payer === realm(s) ? FB.T('Your public treasury pays {money:price} for {days} days.', { price:q.offer.price, days:q.offer.duration }) :
            FB.T('The following pays your public treasury {money:price} for {days} days.', { price:q.offer.price, days:q.offer.duration }));
          lines.push(FB.T('Agreement terms: {kind}. Capacity: {capacity}. Promised fighters: {levy}. Recruitment permitted: {recruit}.',
            { kind:FB.T(q.offer.kind), capacity:q.offer.capacity || 0, levy:q.offer.levy || 0, recruit:q.offer.allowRecruit ? FB.T('Yes') : FB.T('No') }));
          if (q.offer.countyIds) lines.push(FB.T('Access counties: {places}.', { places:q.offer.countyIds.map(function (pid) {
            return FB.world.byId[pid].name;
          }).join(', ') }));
        }
        var c = choice(t, id), story = c && c.operation === 'agenda_story_choice' && context.get(c.storyId);
        if (story && story.review) lines = lines.concat(story.review(s, FB.stories.record(s, c.storyId), c.choiceId, q) || []);
        return lines;
      }, validate:validate };
  }
  FB.stories.registerType('ruler_agenda', factory, 'js/story_ruler_agenda.js', check);
})();
