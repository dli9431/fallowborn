/* A contest card references the canonical government vacancy. It creates no
   rival candidates, elections, incumbents, property or succession scheduler. */
(function () {
  'use strict';
  function validateDefinition(def) {
    if (!def || typeof def.realmId !== 'string' || typeof def.name !== 'string' || typeof def.desc !== 'string')
      throw new Error(FB.T('A government contest needs a court, name and description.'));
  }
  FB.stories.registerType('government_contest', function (def) {
    validateDefinition(def);
    return { id:def.id, kind:'world', requires:def.requires || [],
      appliesTo:function (s) { return !!FB.governmentSelection.state(s, def.realmId) || !!FB.civicGovernment.row(s,def.realmId); },
      init:function () { return { realmId:def.realmId }; },
      validate:function (rec, s) {
        if (!rec || Object.keys(rec).length !== 1 || typeof rec.realmId !== 'string' || !s.realms[rec.realmId])
          throw new Error(FB.T('Invalid government contest reference.'));
      },
      title:function (s) { return FB.dataText(s, null, 'governmentContest', def.id, def, 'name', {}); },
      intro:function (s) { return FB.dataText(s, null, 'governmentContest', def.id, def, 'desc', {}); },
      status:function (s, rec) {
        var civic = FB.civicGovernment.row(s,rec.realmId);
        if (civic && FB.civicGovernment.active(s,rec.realmId)) {
          var vacancies = civic.offices.filter(function (o) { return o.vacancy && o.vacancy.status === 'open'; });
          return { phase:vacancies.length ? 'active' : 'resolved',name:vacancies.length ? FB.T('Civic selection remains open') : FB.T('Civic offices are occupied'),
            lines:[FB.T('{count} public offices await recognition; civic property and household livelihoods continue.',{ count:vacancies.length })] };
        }
        var data = FB.governmentSelection.state(s, rec.realmId), v = data && data.vacancy;
        if (!v || ['contested','vacant','minority','resolved'].indexOf(v.status) < 0) return null;
        var names = { contested:FB.T('Local recognition is divided'), vacant:FB.T('No eligible successor'),
          minority:FB.T('Eligible candidates are still minors'), resolved:FB.T('Local accession recorded') };
        var t = s.realms[rec.realmId].succession;
        var claims = Object.keys(v.support).map(function (id) { return v.support[id].candidateId; }).filter(function (id, i, ids) {
          return id && ids.indexOf(id) === i && t.members[id];
        }).map(function (id) { return t.members[id].name; });
        return { phase:v.status === 'resolved' ? 'resolved' : 'active', name:names[v.status],
          lines:[FB.T('{count} eligible adult candidates; private households continue.',
            { count:FB.governmentSelection.candidates(s, rec.realmId).length }),
            FB.T('Current supported claims: {names}. County possession follows ordinary control and war.',
              { names:claims.length ? claims.join(', ') : FB.T('None') })] };
      }
    };
  }, 'js/story_government_selection.js', validateDefinition);

  /* A household branch delegates nomination to the civic office owner. */
  function candidacyDefinition(def) {
    var allowed = ['id','type','requires','requirements','registrationBefore','registrationAfter','realmId','officeId','name','desc','choices'];
    function text(value) { return typeof value === 'string' && value.length > 0 && value.length <= 2000; }
    if (Object.keys(def).some(function (key) { return allowed.indexOf(key) < 0; }) ||
        !text(def.name) || !text(def.desc) || !text(def.realmId) || !text(def.officeId) ||
        !def.choices || Object.keys(def.choices).sort().join(',') !== 'decline,stand') throw new Error('Invalid civic candidacy definition.');
    var ids = [];
    ['stand','decline'].forEach(function (operation) {
      var choice = def.choices[operation];
      if (!choice || Object.keys(choice).sort().join(',') !== 'detail,id,label' ||
          !/^[a-z][a-z0-9_]*$/.test(choice.id || '') || ids.indexOf(choice.id) >= 0 ||
          !text(choice.label) || !text(choice.detail)) throw new Error('Invalid civic candidacy choice.');
      ids.push(choice.id);
    });
    var matching = [];
    Object.keys(FBDATA.bookmarks).forEach(function (id) {
      FB.bookmarkRevisions(id, FBDATA.bookmarks[id]).forEach(function (bm) {
        (bm.realms || []).forEach(function (realm) { if (realm.id === def.realmId) matching.push(realm); });
      });
    });
    if (!matching.length || matching.some(function (realm) {
      var form = FBDATA.governmentForms[realm.government], profile = FBDATA.civicProfiles[realm.civicProfileId || form && form.civicProfileId];
      return !profile || !profile.offices.some(function (office) { return office.id === def.officeId; });
    })) throw new Error('Civic candidacy needs an effective civic realm and office.');
  }
  FB.stories.registerType('civic_candidacy', function (def) {
    var civicGov = FB.civicGovernment;
    function office(s) {
      var row = civicGov.row(s, def.realmId);
      return row && row.offices.filter(function (o) { return o.id === def.officeId; })[0];
    }
    function quote(s, rec, id) {
      var op = id === def.choices.stand.id ? 'stand' : id === def.choices.decline.id ? 'decline' : null;
      var review = op === 'stand' ? civicGov.officeQuote(s, def.realmId, def.officeId, 'nominate', {candidateId:s.player.charId}) : null;
      return { id:id, operation:op, allowed:!!op && rec.phase === 'offered' && rec.charId === s.player.charId &&
        !s.player.dead && (op === 'decline' || !!review && review.allowed), phase:rec.phase, charId:s.player.charId, review:review };
    }
    function end(s, rec, result) { rec.phase = result === 'interrupted' ? 'interrupted' : 'complete'; rec.result = result; rec.endTurn = s.turn; }
    return { id:def.id, kind:'track', requires:def.requires || [],
      init:function (s) { return {phase:'offered',charId:s.player.charId,result:null,officeGeneration:null,endTurn:null}; },
      title:function (s) { return FB.dataText(s,null,'civicCandidacy',def.id,def,'name',{}); },
      intro:function (s) { return FB.dataText(s,null,'civicCandidacy',def.id,def,'desc',{}); },
      status:function (s, rec) { return {phase:rec.phase,name:rec.phase === 'offered' ? FB.T('A public nomination') :
        rec.phase === 'nominated' ? FB.T('Awaiting selection') : FB.T('Decision recorded'),lines:[]}; },
      choices:function (s, rec) {
        if (rec.phase !== 'offered') return [];
        return ['stand','decline'].map(function (op) {
          var row = def.choices[op];
          return {id:row.id,label:FB.dataText(s,null,'civicCandidacyChoice',def.id + '.' + op,row,'label',{}),
            detail:FB.dataText(s,null,'civicCandidacyChoice',def.id + '.' + op,row,'detail',{})};
        });
      },
      quote:quote,
      review:function (s, rec, id, q) { return q.review ? [FB.T('Nomination cost: {money:cost}.',{cost:q.review.cost})] : []; },
      apply:function (s, rec, id, reviewed) {
        var q = quote(s,rec,id);
        if (!q.allowed || JSON.stringify(q) !== JSON.stringify(reviewed)) return false;
        if (q.operation === 'decline') end(s,rec,'declined');
        else {
          if (!civicGov.officeApply(s,q.review)) return false;
          rec.phase = 'nominated'; rec.officeGeneration = office(s).generation;
        }
        return true;
      },
      day:function (s, rec) {
        if (rec.phase === 'complete' || rec.phase === 'interrupted') return;
        if (rec.charId !== s.player.charId || s.player.dead || !s.chars[rec.charId] || s.chars[rec.charId].dead) { end(s,rec,'interrupted'); return; }
        if (rec.phase !== 'nominated') return;
        var o = office(s);
        if (!o) end(s,rec,'interrupted');
        else if (o.incumbentId === rec.charId) end(s,rec,'elected');
        else if (o.generation !== rec.officeGeneration || o.incumbentId) end(s,rec,'rejected');
      },
      validate:function (rec, s) {
        if (!rec || Object.keys(rec).sort().join(',') !== 'charId,endTurn,officeGeneration,phase,result' ||
            ['offered','nominated','complete','interrupted'].indexOf(rec.phase) < 0 || typeof rec.charId !== 'string' ||
            [null,'declined','elected','rejected','interrupted'].indexOf(rec.result) < 0 ||
            rec.officeGeneration !== null && (!Number.isInteger(rec.officeGeneration) || rec.officeGeneration < 0) ||
            rec.phase === 'offered' && rec.officeGeneration !== null ||
            rec.phase === 'nominated' && rec.officeGeneration === null ||
            (rec.phase === 'interrupted') !== (rec.result === 'interrupted') ||
            rec.result === 'declined' && rec.officeGeneration !== null ||
            (rec.result === 'elected' || rec.result === 'rejected') && rec.officeGeneration === null ||
            ((rec.phase === 'complete' || rec.phase === 'interrupted') ? !rec.result || !Number.isInteger(rec.endTurn) || rec.endTurn < 0 || rec.endTurn > s.turn : rec.result !== null || rec.endTurn !== null))
          throw new Error('Invalid civic candidacy record.');
      }
    };
  }, 'js/story_government_selection.js', candidacyDefinition);
})();
