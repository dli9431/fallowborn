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
    'agenda_provincial_terms','agenda_dues','agenda_public_record','agenda_mobile_offer'];
  var recordKinds = ['agenda_appointments','agenda_recognition','agenda_mobile_agreement','agenda_collective_decision'];
  function check(def, context) {
    function need(ok, field) { if (!ok) throw new Error('Invalid ruler agenda: ' + field + '.'); }
    need(keys(def, ['id','type','subjectRealmId','title','intro','requires','stages','registrationBefore','registrationAfter']), 'fields');
    need(slug(def.subjectRealmId) && text(def.title) && text(def.intro), 'subject or display');
    need(Array.isArray(def.stages) && def.stages.length > 0 && def.stages.length <= 16, 'stages');
    var stages = Object.create(null), choices = Object.create(null);
    def.stages.forEach(function (stage) {
      need(keys(stage, ['id','name','text','year','season','choices']) && slug(stage.id) && !stages[stage.id], 'stage');
      stages[stage.id] = true;
      need(text(stage.name) && text(stage.text) && Number.isInteger(stage.year) && stage.year > 0 && stage.year <= 9999 &&
        Number.isInteger(stage.season) && stage.season >= 0 && stage.season <= 3, 'stage date or display');
      need(Array.isArray(stage.choices) && stage.choices.length > 0 && stage.choices.length <= 12, 'choices');
      need(stage.choices.some(function (c) { return c.operation === 'agenda_priority'; }), 'unconditional alternative');
      stage.choices.forEach(function (c) {
        need(keys(c, ['id','label','detail','operation','storyId','choiceId','field','values','interestId','revenue','levy','amount','duration',
          'recordKind','otherRealmId','recordOperation']) && slug(c.id) && c.id !== 'agenda_stop_program' && !choices[c.id], 'choice fields or duplicate');
        choices[c.id] = true;
        need(text(c.label) && text(c.detail) && operations.indexOf(c.operation) >= 0, 'choice operation or display');
        var fields = ['id','label','detail','operation'];
        if (c.operation === 'agenda_story_choice' || c.operation === 'agenda_story_fact') {
          fields.push('storyId');
          need((def.requires || []).indexOf(c.storyId) >= 0 && context.get(c.storyId), 'source dependency');
          if (c.operation === 'agenda_story_choice') {
            fields.push('choiceId'); need(slug(c.choiceId) && c.storyId !== def.id, 'source choice');
          } else {
            fields = fields.concat(['field','values']);
            need(['result','aiResolution','governanceResolved','playerDecision'].indexOf(c.field) >= 0 &&
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
    });
  }
  function factory(def, context) {
    var C = FB.governments.support;
    function realm(s) { return FB.startRealmId(s, def.subjectRealmId); }
    function subject(s) {
      var rid = realm(s), r = s.realms[rid], row = C.row(s, rid), delegated = C.isDelegated(s, rid);
      var c = delegated ? C.delegate(s, rid) : r && r.alive && FB.stories.ruler(s, def.subjectRealmId);
      return { id:c && c.id || null, generation:FB.realmRulerGeneration(s, rid),
        mandateId:delegated && row && row.mandate ? row.mandate.id : null,
        jurisdiction:!!(r && r.alive) && (delegated ? !!row && row.scopes.every(function (pid) { return s.owner[pid] === rid && s.holder[pid] === rid; }) :
          !!r.nonTerritorial || FB.realmTerritory(s, rid).length > 0) };
    }
    function current(s, t) {
      var f = subject(s), c = s.chars[t.subjectId];
      return t.status === 'agenda_open' && !!c && !c.dead && !s.player.dead && s.player.charId === t.subjectId &&
        s.start && s.start.rulerRealmId === def.subjectRealmId && f.id === t.subjectId && f.generation === t.generation &&
        f.mandateId === t.mandateId && f.jurisdiction;
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
        var mobile = FB.mobile.row(s, FB.startRealmId(s, c.otherRealmId));
        rows = (mobile && mobile.agreements || []).filter(function (a) {
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
      if (c.operation === 'agenda_story_choice') {
        var story = context.get(c.storyId), rec = FB.stories.record(s, c.storyId);
        return story && rec && story.choices && story.choices(s, rec).some(function (row) { return row.id === c.choiceId; }) &&
          story.quote ? story.quote(s, rec, c.choiceId) : null;
      }
      if (c.operation === 'agenda_story_fact') {
        var saved = FB.stories.record(s, c.storyId);
        return saved && typeof saved[c.field] === 'string' ? { value:saved[c.field], allowed:c.values.indexOf(saved[c.field]) >= 0 } : null;
      }
      if (c.operation === 'agenda_provincial_terms') return FB.aristocracy.provincialQuote(s,
        { kind:'realm', id:realm(s) }, realm(s), c.interestId, 'negotiate', { revenue:c.revenue, levy:c.levy });
      if (c.operation === 'agenda_dues') return C.duesQuote(s, realm(s), { amount:c.amount, duration:c.duration });
      if (c.operation === 'agenda_mobile_offer') {
        var mobileId = FB.startRealmId(s, c.otherRealmId), mobile = FB.mobile.row(s, mobileId);
        var offer = (mobile && mobile.agreements || []).filter(function (a) { return a.status === 'offered' && a.partnerId === realm(s); })
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
      return { id:id, allowed:!!(current(s, t) && (cancel || ready(s, st) && c && (!hasAction || q && q.allowed))),
        facts:{ definition:copy(def), record:copy(t), subject:subject(s), turn:s.turn, date:copy(s.date), source:q,
          publicFunds:FB.treasuryAvailable(s, realm(s)), privateFunds:s.player.gold } };
    }
    function close(s, t, status) { t.status = status; t.outcomeTurn = s.turn; }
    function apply(s, t, id, reviewed) {
      var fresh = quote(s, t, id);
      if (!reviewed || !fresh.allowed || !same(fresh, reviewed)) return false;
      if (id === 'agenda_stop_program') { close(s, t, 'agenda_stopped'); return true; }
      var c = choice(t, id), q = fresh.facts.source;
      if (c.operation === 'agenda_story_choice') {
        if (!FB.stories.apply(s, c.storyId, c.choiceId, q)) return false;
      } else if (c.operation === 'agenda_provincial_terms' && !FB.aristocracy.apply(s, q)) return false;
      else if (c.operation === 'agenda_dues' && !C.imposeDues(s, q)) return false;
      else if (c.operation === 'agenda_mobile_offer' && !FB.mobile.commit(s, q.reviewed)) return false;
      t.decisions.push({ stageId:stage(t).id, choiceId:id, turn:s.turn });
      t.step++;
      if (t.step === def.stages.length || c.operation === 'agenda_finish') close(s, t, 'agenda_complete');
      return true;
    }
    function day(s, t) { if (t.status === 'agenda_open' && !current(s, t)) close(s, t, 'agenda_interrupted'); }
    function validate(t, s) {
      function need(ok) { if (!ok) throw new Error(FB.T('Invalid v4 save field at {path}.', { path:'state.stories.' + def.id })); }
      need(keys(t, ['schema','subjectId','generation','mandateId','step','status','openedTurn','outcomeTurn','decisions']) && Object.keys(t).length === 9);
      need(t.schema === 1 && typeof t.subjectId === 'string' && !!t.subjectId && Number.isInteger(t.generation) && t.generation >= 1 &&
        (t.mandateId === null || typeof t.mandateId === 'string' && !!t.mandateId));
      need(Number.isInteger(t.openedTurn) && t.openedTurn >= 0 && Number.isInteger(t.step) && t.step >= 0 && t.step <= def.stages.length &&
        ['agenda_open','agenda_complete','agenda_stopped','agenda_interrupted'].indexOf(t.status) >= 0);
      need(Array.isArray(t.decisions) && t.decisions.length === t.step);
      var lastTurn = t.openedTurn, finish = false;
      t.decisions.forEach(function (d, i) {
        var st = def.stages[i], c = plain(d) && st.choices.filter(function (row) { return row.id === d.choiceId; })[0];
        need(keys(d, ['stageId','choiceId','turn']) && Object.keys(d).length === 3 && d.stageId === st.id && c && !finish &&
          Number.isInteger(d.turn) && d.turn >= lastTurn);
        lastTurn = d.turn; finish = c.operation === 'agenda_finish';
      });
      need(t.status === 'agenda_open' ? t.step < def.stages.length && !finish && t.outcomeTurn === null :
        Number.isInteger(t.outcomeTurn) && t.outcomeTurn >= lastTurn && (t.status !== 'agenda_complete' || finish || t.step === def.stages.length));
      need(t.status === 'agenda_complete' || t.step < def.stages.length && !finish);
      if (s) need(s.start && s.start.rulerRealmId === def.subjectRealmId && t.openedTurn <= s.turn && lastTurn <= s.turn &&
        (t.outcomeTurn === null || t.outcomeTurn <= s.turn));
    }
    return { id:def.id, kind:'track', requires:def.requires,
      appliesToBookmark:function (bm) { return (bm.realms || []).some(function (r) { return r.id === def.subjectRealmId; }); },
      init:function (s) {
        var f = subject(s);
        if (!s.start || s.start.rulerRealmId !== def.subjectRealmId || !f.id || f.id !== s.player.charId || !f.jurisdiction) return;
        return { schema:1, subjectId:f.id, generation:f.generation, mandateId:f.mandateId, step:0,
          status:'agenda_open', openedTurn:s.turn, outcomeTurn:null, decisions:[] };
      },
      title:function () { return FB.T(def.title); }, intro:function () { return FB.T(def.intro); },
      status:function (s, t) {
        var st = stage(t), lines = [];
        if (t.status === 'agenda_interrupted') lines.push(FB.T('This personal program ended when its original incumbent lost the office, mandate or required jurisdiction.'));
        else if (t.status === 'agenda_stopped') lines.push(FB.T('You set this program aside. Ordinary decisions remain available.'));
        else if (t.status === 'agenda_complete') lines.push(FB.T('The program is complete. Its decisions create no additional reward.'));
        else {
          lines.push(FB.T(st.text));
          if (!ready(s, st)) lines.push(FB.T('The next review opens in year {year}, season {season}.', { year:st.year, season:st.season + 1 }));
        }
        return { phase:t.status, name:st && t.status === 'agenda_open' ? FB.T(st.name) : FB.T(def.title), lines:lines };
      },
      choices:function (s, t) {
        if (!current(s, t)) return [];
        var rows = ready(s, stage(t)) ? stage(t).choices.map(function (c) {
          var story = c.operation === 'agenda_story_choice' && context.get(c.storyId), rec = story && FB.stories.record(s, c.storyId);
          var original = rec && story.choices && story.choices(s, rec).filter(function (row) { return row.id === c.choiceId; })[0];
          return { id:c.id, label:FB.T(c.label), detail:FB.T(c.detail) + (original ? ' ' + original.detail : '') };
        }) : [];
        rows.push({ id:'agenda_stop_program', label:FB.T('Set the program aside'), detail:FB.T('End this personal agenda without a payment, political commitment or restriction on ordinary play.') });
        return rows;
      }, quote:quote, apply:apply, day:day, season:day, year:day,
      blocker:function () { return FB.T('The original incumbent, review date and current source decision or recorded public action must still permit this choice. Use its ordinary review or retain the present arrangements.'); },
      review:function (s, t, id, reviewed) {
        var q = reviewed.facts.source, lines = [FB.T('Recording this agenda adds no reward. Any political effect uses the existing decision and its current consent.')];
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
