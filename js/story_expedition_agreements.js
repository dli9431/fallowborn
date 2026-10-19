/* Bounded bilateral records reviews. Access, payment and lawful transfers
   remain with their existing owners; acknowledgment creates no obligation. */
(function () {
  'use strict';
  var E = FB.expeditionAgreements = {}, TYPE = 'expedition_undertaking';
  function keys(v, allowed) { return !!v && typeof v === 'object' && !Array.isArray(v) &&
    Object.keys(v).every(function (k) { return allowed.indexOf(k) >= 0; }); }
  function whole(v) { return Number.isSafeInteger(v) && v >= 0; }
  function slug(v) { return typeof v === 'string' && /^[a-z][a-z0-9_]*$/.test(v); }
  function display(v) { return typeof v === 'string' && v.trim().length > 0 && v.length <= 4000; }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function same(a,b) { return JSON.stringify(a) === JSON.stringify(b); }
  function check(d, context, bm) {
    function need(ok) { if (!ok) throw new Error('Invalid expedition records review declaration.'); }
    need(keys(d, ['id','type','name','desc','requires','actor','source','kind','mode','firstTurn','endTurn',
      'countyIds','registrationBefore','registrationAfter','waitForFormation']));
    if (d.waitForFormation !== undefined) {
      need(keys(d.waitForFormation,['preparationId','commandId']) && Object.keys(d.waitForFormation).length === 2 &&
        slug(d.waitForFormation.preparationId) && slug(d.waitForFormation.commandId) &&
        Array.isArray(d.requires) && d.requires.indexOf(d.waitForFormation.preparationId) >= 0 &&
        d.registrationAfter === d.waitForFormation.preparationId);
    }
    need(display(d.name) && display(d.desc) && d.mode === 'records_only' &&
      ['limited_assurance','restoration_review'].indexOf(d.kind) >= 0);
    [d.actor,d.source].forEach(function (p) {
      need(keys(p,['kind','realmId']) && p.kind === 'realm_ruler' && slug(p.realmId));
    });
    need(d.actor.realmId !== d.source.realmId && whole(d.firstTurn) && whole(d.endTurn) &&
      d.endTurn > d.firstTurn && d.endTurn <= 1440);
    need(Array.isArray(d.countyIds) && d.countyIds.length <= 16 &&
      (d.kind === 'limited_assurance' ? d.countyIds.length === 0 : d.countyIds.length > 0) &&
      d.countyIds.every(function (id,i) { return slug(id) && d.countyIds.indexOf(id) === i; }));
    if (bm) {
      var a = (bm.realms || []).filter(function (r) { return r.id === d.actor.realmId; })[0];
      var b = (bm.realms || []).filter(function (r) { return r.id === d.source.realmId; })[0];
      need(a && a.mobile && a.mobile.command && b && !b.mobile);
      if (d.waitForFormation) {
        var parent=context.get(d.waitForFormation.preparationId), prep=parent && parent.declaration;
        need(prep && prep.type === 'expedition_preparation' && prep.realmId === a.id &&
          a.mobile.preparationId === prep.id && a.mobile.command.id === d.waitForFormation.commandId &&
          (bm.stories || []).indexOf(prep.id) >= 0);
      }
      need(d.countyIds.every(function (id) { return (bm.provinces || []).some(function (p) {
        return p.id === id && !p.wasteland;
      }); }));
      need((bm.stories || []).filter(function (id) {
        var m = context.get(id), other = m && m.declaration;
        return other && other.type === TYPE && other.actor.realmId === d.actor.realmId;
      }).length <= 4);
    }
  }
  function factory(d) {
    check(d);
    function preparation(s) {
      if (!d.waitForFormation) return null;
      var id=d.waitForFormation.preparationId, t=s.stories && s.stories[id],
        def=FB.campaignBookmark(s).realms.filter(function (v) {return v.id === d.actor.realmId;})[0],
        leader=def && t && t.bindings.filter(function (b) {return b.memberId === def.mobile.opening.leaderMemberId;})[0];
      return t && leader ? {binding:{id:id,commandId:d.waitForFormation.commandId,definitionKey:t.definitionKey,
        leaderId:leader.characterId,realmGeneration:t.realmGeneration,issuer:copy(t.issuer)},
        status:t.status,reason:t.reason,endTurn:t.endTurn,endedTurn:t.endedTurn,formed:t.formed} : null;
    }
    function parties(s) {
      var p=preparation(s);
      return [d.waitForFormation ? p && s.chars[p.binding.leaderId] : FB.stories.ruler(s,d.actor.realmId),
        FB.stories.ruler(s,d.source.realmId)];
    }
    function realm(s, p) { return FB.startRealmId(s,p.realmId); }
    function generations(s) { return [FB.realmRulerGeneration(s,realm(s,d.actor)),
      FB.realmRulerGeneration(s,realm(s,d.source))]; }
    function free(s,c) { return !!c && !c.dead && !c.captive && !c.prisonerOf && !c.imprisoned && !c.exiled &&
      !(FB.justiceCustodyOf && FB.justiceCustodyOf(s,c.id)); }
    function facts(s) {
      var people = parties(s);
      var f={ people:people.map(function (c) { return c ? [c.id,free(s,c)] : null; }),
        generations:generations(s), command:FB.mobile.commandSnapshot(s,realm(s,d.actor)),
        counties:d.countyIds.map(function (id) { return [id,s.owner[id],FB.settlementCountyHolder(s,id)]; }) };
      if (d.waitForFormation) {
        f.preparation=preparation(s);
        f.commandLeader=(FB.mobile.row(s,realm(s,d.actor)) || {}).leaderId || null;
      }
      return f;
    }
    function reason(s,r,f) {
      if (r.status !== 'pending' && r.status !== 'waiting') return 'closed';
      if (s.turn >= d.endTurn) return 'term';
      var p=f.preparation;
      if (d.waitForFormation && (!p || !same(p.binding,r.preparation))) return 'preparation';
      if (p && p.status === 'formed' && (!p.formed || p.formed.realmId !== d.actor.realmId ||
          p.formed.leaderId !== r.partyIds[0] || p.formed.turn < r.openedTurn)) return 'preparation';
      if (r.version === 2 && r.status === 'pending' && (p.status !== 'formed' || !same(p.formed,r.formation))) return 'preparation';
      if (f.people.some(function (p,i) { return !p || !p[1] || p[0] !== r.partyIds[i] ||
          f.generations[i] !== (i === 0 && r.status === 'waiting' && f.preparation.status === 'formed' ?
            f.preparation.formed.generation : r.generations[i]); })) return 'party';
      if (r.status === 'waiting') {
        if (p.status === 'closed') return 'preparation_'+p.reason;
        if (p.status === 'preparing') return s.turn >= p.endTurn ? 'preparation_expired' : 'formation';
        if (p.status !== 'formed') return 'preparation';
        // Ordinary dispatch observes formation once. Reads never activate a record.
        if (!f.command || !f.command.effective || f.commandLeader !== r.partyIds[0]) return 'command';
        return 'formation';
      }
      if (!f.command || !f.command.effective || d.waitForFormation && f.commandLeader !== r.partyIds[0]) return 'command';
      return s.turn < d.firstTurn ? 'window' : null;
    }
    function close(s,r,status,why) { r.status=status; r.reason=why; r.endedTurn=s.turn; r.revision++; }
    function reconcile(s,r) {
      if (r.status !== 'pending' && r.status !== 'waiting') return;
      var f=facts(s), why=reason(s,r,f);
      if (r.status === 'waiting' && why === 'formation' && f.preparation.status === 'formed') {
        r.formation=copy(f.preparation.formed); r.generations[0]=r.formation.generation;
        r.status='pending'; r.revision++; why=reason(s,r,f);
      }
      if (why && why !== 'window' && why !== 'formation') close(s,r,
        why === 'term' || why === 'preparation_expired' ? 'expired' :
          why === 'preparation_refused' ? 'declined' : 'interrupted',why);
    }
    function review(s,r,action,actorId) {
      if (!r) return null;
      var f=facts(s), why=reason(s,r,f), index=r.partyIds.indexOf(actorId);
      var allowed=!why && index >= 0 && r.decisions[index] === null && ['acknowledge','decline'].indexOf(action) >= 0;
      return {id:action,actorId:actorId,allowed:!!allowed,reason:why || (allowed ? null : 'consent'),
        stamp:JSON.stringify([d,r,s.turn,f,action,actorId])};
    }
    function commit(s,r,q) {
      if (!q) return false;
      var fresh=review(s,r,q.id,q.actorId);
      if (!fresh || !fresh.allowed || !q.allowed || fresh.stamp !== q.stamp) return false;
      var index=r.partyIds.indexOf(q.actorId);
      r.decisions[index]=q.id; r.decisionTurns[index]=s.turn; r.revision++;
      if (q.id === 'decline') { r.status='declined'; r.reason='decline'; r.endedTurn=s.turn; }
      else if (r.decisions.every(function (v) { return v === 'acknowledge'; })) {
        r.status='reviewed'; r.reason='records_only'; r.endedTurn=s.turn;
      }
      return true;
    }
    function day(s,r) {
      reconcile(s,r);
      if (reason(s,r,facts(s))) return;
      r.partyIds.forEach(function (id) {
        if (id !== s.player.charId) commit(s,r,review(s,r,'acknowledge',id));
      });
    }
    function lines(s,r) {
      var out=[FB.T('Records review only. Acknowledgment creates no enforceable promise, homage, common command, payment or land transfer.'),
        FB.T('Review window: campaign days {first} to {last}, ending before day {end}.',
          {first:d.firstTurn,last:d.endTurn-1,end:d.endTurn}),
        FB.T('Payer: none. Passage, markets and existing service agreements require their own ordinary transactions.')];
      var people=parties(s);
      if (r.status === 'waiting') out.push(FB.T('Waiting for the original expedition to form. No host or acknowledgment is created by this review.'));
      if (r.version === 2 && r.reason) {
        var endings={preparation_refused:FB.T('The original formation was refused.'),
          preparation_expired:FB.T('The original preparation expired.'),
          preparation_stopped:FB.T('The original preparation was stopped.'),
          preparation_interrupted:FB.T('The original preparation was interrupted.'),
          preparation:FB.T('The original preparation binding is unavailable.')};
        if (endings[r.reason]) out.push(endings[r.reason]);
      }
      out.push(FB.T('Original parties: {first} and {second}.',{
        first:(s.chars[r.partyIds[0]] || people[0] || {}).name || FB.T('Unavailable'),
        second:(s.chars[r.partyIds[1]] || people[1] || {}).name || FB.T('Unavailable')}));
      r.partyIds.forEach(function (id,i) {
        out.push(FB.T('{party}: {decision}.', {party:(s.chars[id] || {}).name || FB.T('Unavailable'),
          decision:r.decisions[i] === 'acknowledge' ? FB.T('Context acknowledged') :
            r.decisions[i] === 'decline' ? FB.T('Review declined') : FB.T('No decision recorded')}));
      });
      if (d.kind === 'limited_assurance') out.push(FB.T('Acknowledging this personal assurance does not guarantee anyone’s safety or constrain later actions.'));
      else {
        out.push(FB.T('Claim review only. Present control does not prove a lawful capture, grantor or receiving authority.'));
        d.countyIds.forEach(function (id) {
          var holder=FB.settlementCountyHolder(s,id);
          out.push(FB.T('{county}: controller {controller}, holder {holder}.',{
            county:(FB.world.byId[id] || {}).name || id,
            controller:(s.realms[s.owner[id]] || {}).name || FB.T('Unavailable'),
            holder:(s.realms[holder] || {}).name || FB.T('Unavailable')}));
        });
      }
      return out;
    }
    var fields=['version','partyIds','generations','openedTurn','status','decisions','decisionTurns','revision','endedTurn','reason'];
    function validate(r,s) {
      function need(ok) { if (!ok) throw new Error(FB.T('Invalid v4 save field at {path}.',{path:'state.stories.'+d.id})); }
      var allowed=d.waitForFormation ? fields.concat(['preparation','formation']) : fields;
      need(keys(r,allowed) && Object.keys(r).length === allowed.length && r.version === (d.waitForFormation ? 2 : 1));
      need(Array.isArray(r.partyIds) && r.partyIds.length === 2 && Array.isArray(r.generations) && r.generations.length === 2 &&
        Array.isArray(r.decisions) && r.decisions.length === 2 && Array.isArray(r.decisionTurns) && r.decisionTurns.length === 2);
      need((r.version === 2 ? ['waiting','pending','reviewed','declined','expired','interrupted'] :
        ['pending','reviewed','declined','expired','interrupted']).indexOf(r.status) >= 0 && whole(r.openedTurn) && r.openedTurn <= s.turn);
      var decisions=0;
      r.partyIds.forEach(function (id,i) {
        need((id === null || typeof id === 'string' && !!s.chars[id]) && whole(r.generations[i]) && r.generations[i] >= 1);
        need([null,'acknowledge','decline'].indexOf(r.decisions[i]) >= 0);
        need(r.decisions[i] === null ? r.decisionTurns[i] === null : id !== null && whole(r.decisionTurns[i]) &&
          r.decisionTurns[i] >= Math.max(r.openedTurn,d.firstTurn) && r.decisionTurns[i] < d.endTurn && r.decisionTurns[i] <= s.turn);
        if (r.decisions[i] !== null) decisions++;
      });
      need(r.partyIds[0] === null || r.partyIds[0] !== r.partyIds[1]);
      var waiting=r.status === 'waiting', refused=r.version === 2 && r.reason === 'preparation_refused';
      need(r.status === 'pending' || waiting ? r.reason === null && r.endedTurn === null && decisions < 2 && r.decisions.indexOf('decline') < 0 :
        whole(r.endedTurn) && r.endedTurn >= r.openedTurn && r.endedTurn <= s.turn &&
          r.decisionTurns.every(function (t) { return t === null || t <= r.endedTurn; }));
      if (r.status === 'reviewed') need(r.reason === 'records_only' && r.decisions.every(function (v) { return v === 'acknowledge'; }) &&
        r.endedTurn === Math.max.apply(null,r.decisionTurns));
      if (r.status === 'declined') need(refused ? decisions === 0 : r.reason === 'decline' &&
        r.decisions.filter(function (v) { return v === 'decline'; }).length === 1 &&
        r.endedTurn === r.decisionTurns[r.decisions.indexOf('decline')]);
      if (r.status === 'expired' || r.status === 'interrupted') need(r.decisions.indexOf('decline') < 0 && decisions < 2 &&
        (r.status === 'expired' ? r.reason === 'term' && r.endedTurn >= d.endTurn ||
          r.version === 2 && r.reason === 'preparation_expired' :
          (r.version === 2 ? ['party','command','preparation','preparation_stopped','preparation_interrupted'] :
            ['party','command']).indexOf(r.reason) >= 0));
      need(r.revision === decisions + (r.status === 'expired' || r.status === 'interrupted' || refused ? 1 : 0) +
        (r.version === 2 && r.formation !== null ? 1 : 0));
      if (r.version === 2) {
        var prep=preparation(s), binding=prep && prep.binding;
        need(!!binding && same(r.preparation,binding) && r.partyIds[0] === binding.leaderId &&
          r.generations[0] === (r.formation === null ? binding.realmGeneration : prep.formed && prep.formed.generation));
        need(r.formation === null ? decisions === 0 && r.status !== 'pending' && r.status !== 'reviewed' :
          prep.status === 'formed' && same(r.formation,prep.formed) && !waiting &&
          r.formation.leaderId === r.partyIds[0] && r.formation.realmId === d.actor.realmId &&
          r.formation.turn >= r.openedTurn && r.formation.turn < d.endTurn && r.formation.turn <= s.turn &&
          r.decisionTurns.every(function (t) {return t === null || t >= r.formation.turn;}) &&
          (r.endedTurn === null || r.endedTurn >= r.formation.turn));
        if (r.reason && r.reason.indexOf('preparation_') === 0) {
          var suffix=r.reason.slice(12);
          need(r.formation === null && decisions === 0 && (suffix === 'expired' ?
            r.endedTurn >= prep.endTurn && (prep.status === 'preparing' || prep.status === 'closed' && prep.reason === 'expired') :
            prep.status === 'closed' && prep.reason === suffix && r.endedTurn >= prep.endedTurn));
        }
      }
      var p=parties(s), g=generations(s);
      r.partyIds.forEach(function (id,i) {
        need(r.generations[i] <= g[i]);
        // A same-generation live office has one identity. Changed or dead
        // archived parties remain historical references, never replacements.
        if (g[i] === r.generations[i] && p[i]) need(id === p[i].id);
        if (id === null) need(r.status === 'interrupted' && r.reason === 'party' && decisions === 0);
      });
    }
    return {id:d.id,kind:'world',requires:d.requires || [],
      init:function (s) {
        // Only fresh attachment may materialize the existing territorial
        // incumbent. Reads, candidate validation and restore never do so.
        FB.materializeRealmRuler(s,realm(s,d.source));
        var p=parties(s), r={version:1,partyIds:p.map(function (c) {return c && c.id || null;}),generations:generations(s),
          openedTurn:s.turn,status:'pending',decisions:[null,null],decisionTurns:[null,null],revision:0,endedTurn:null,reason:null};
        if (d.waitForFormation) {
          var prep=preparation(s);
          r.version=2; r.preparation=copy(prep.binding); r.formation=null; r.status='waiting';
          r.generations[0]=prep.binding.realmGeneration;
        }
        if (r.partyIds.indexOf(null) >= 0) close(s,r,'interrupted','party');
        else reconcile(s,r);
        return r;
      },
      title:function (s) {return FB.dataText(s,null,'storyCampaign',d.id,d,'name',{});},
      intro:function (s) {return FB.dataText(s,null,'storyCampaign',d.id,d,'desc',{});},
      status:function (s,r) {return {phase:r.status,name:r.status === 'waiting' ? FB.T('Awaiting expedition formation') :
        r.status === 'pending' ? FB.T('Awaiting records review') :
        r.status === 'reviewed' ? FB.T('Context acknowledged, no obligation') : r.status === 'declined' ? FB.T('Records review declined') :
          r.status === 'expired' ? FB.T('Records review expired') : FB.T('Records review interrupted'),lines:lines(s,r)};},
      choices:function (s,r) {
        if (r.status !== 'pending' || r.partyIds.indexOf(s.player.charId) < 0 || r.decisions[r.partyIds.indexOf(s.player.charId)] !== null) return [];
        return [{id:'acknowledge',label:FB.T('Acknowledge the recorded context'),detail:FB.T('Costless review only. No agreement is executed.')},
          {id:'decline',label:FB.T('Decline this review'),detail:FB.T('Close this review without cost or penalty. Separate contracts remain in force.')}];
      },
      quote:function (s,r,id) {return review(s,r,id,s.player.charId);},
      apply:function (s,r,id,q) {return !!q && q.id === id && q.actorId === s.player.charId && commit(s,r,q);},
      blocker:function () {return FB.T('Review needs the original available living parties, unchanged offices, an effective expedition command and the finite review window.');},
      review:function (s,r) {return lines(s,r);},day:day,validate:validate,
      undertakingReview:review,undertakingCommit:commit};
  }
  E.review=function (s,id,action,actorId) {
    var m=FB.stories.get(id);
    return m && m.declaration && m.declaration.type === TYPE ? m.undertakingReview(s,s.stories && s.stories[id],action,actorId) : null;
  };
  E.commit=function (s,id,q) {
    var m=FB.stories.get(id), r=s.stories && s.stories[id];
    return !!(r && m && m.declaration && m.declaration.type === TYPE && m.undertakingCommit(s,r,q));
  };
  E.validateAttachments=function (s) {
    var bm=FB.campaignBookmark(s);
    (bm && bm.stories || []).forEach(function (id) {
      var m=FB.stories.get(id);
      if (m && m.declaration && m.declaration.type === TYPE && (m.requires || []).every(function (parent) {
        return !!(s.stories && s.stories[parent]);
      }) && !(s.stories && s.stories[id])) throw new Error(FB.T('Invalid v4 save field at {path}.', {path:'state.stories.'+id}));
    });
  };
  var validatePlatform=FB.save.v4.validatePlatform;
  FB.save.v4.validatePlatform=function (s) { var result=validatePlatform(s); E.validateAttachments(s); return result; };
  FB.stories.registerType(TYPE,factory,'js/story_expedition_agreements.js',check);
})();
