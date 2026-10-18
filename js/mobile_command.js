/* A commission selects authority over an existing following, never people,
   land, private station or a second purse. Mobility remains a territory rule. */
(function () {
  'use strict';
  var M=FB.mobile, G=FB.governments, S=FB.governmentSelection;
  var operations=['recruit','demuster','move','march','offer','accept','work','trade','war','peace','service','land','contract','settle','pledge','leave'];
  function copy(v) {return JSON.parse(JSON.stringify(v));}
  function own(v,k) {return !!v && Object.prototype.hasOwnProperty.call(v,k);}
  function keys(v,list) {return !!v && typeof v==='object' && !Array.isArray(v) &&
    Object.keys(v).every(function (k) {return list.indexOf(k)>=0;});}
  function live(s,c) {return !!c && !c.dead && !c.prisonerOf && !c.captive && !c.imprisoned && !c.exiled &&
    !(FB.justiceCustodyOf && FB.justiceCustodyOf(s,c.id));}
  function definition(s,rid) {
    var d=(FB.campaignBookmark(s).realms || []).filter(function (d) {return d.id===rid;})[0];
    return d && d.mobile && d.mobile.command || null;
  }
  function issuer(s,d) {
    var ref=d && d.superior, c;
    if (!ref) return null;
    /* A bounded external warrant is an authority identity, never an on-map
       character. No local actor can impersonate it to appoint or recall. */
    if (ref.kind==='external_authority') return s.turn<ref.endTurn ?
      {externalAuthorityId:ref.id,generation:ref.generation} : null;
    if (ref.kind==='opening_actor') c=FB.bookmarkActor(s,ref.actorId);
    else if (s.realms[ref.realmId] && s.realms[ref.realmId].alive) c=FB.realmRulerCharacterSnapshot(s,ref.realmId);
    return live(s,c) && s.chars[c.id] ? {characterId:c.id,generation:ref.kind==='realm_ruler' ? FB.realmRulerGeneration(s,ref.realmId) : null} : null;
  }
  /* A home office is the declared crown, never the first mobile realm found
     for this person. The start alias changes only its live lookup. */
  function homeId(s,rid) {
    var alias=FB.startRealmId(s,rid);
    return s.realms[alias] ? alias : rid;
  }
  function homeRuler(s,rid) {
    var home=homeId(s,rid), realm=s.realms[home];
    if (!realm || !realm.alive) return null;
    var c=home==='player' ? s.chars[s.player.charId] : FB.realmRulerCharacterSnapshot(s,home);
    return c && !c.dead ? c : null;
  }
  function landedAvailable(s,c) {
    return live(s,c) && !c.unfree && (c.health===undefined || c.health>0) &&
      !(FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(s,c.id)) &&
      !(c.id===s.player.charId && s.player.flags && s.player.flags.in_prison);
  }
  M.landedBindingDefinition = function (d,b,realms,bookmark) {
    var spec=d.mobile && d.mobile.command && d.mobile.command.landedCommandLink;
    var ref=b && b.person, home=spec && own(realms,spec.homeRealmId) && realms[spec.homeRealmId];
    var actor=ref && bookmark && bookmark.opening && bookmark.opening.actors &&
      own(bookmark.opening.actors,ref.actorId) && bookmark.opening.actors[ref.actorId];
    var form=home && FBDATA.governmentForms[home.government];
    return !!(keys(spec,['schema','actorId','homeRealmId','homeGeneration','endTurn']) && Object.keys(spec).length===5 &&
      spec.schema===1 && typeof spec.homeRealmId==='string' && Number.isSafeInteger(spec.homeGeneration) && spec.homeGeneration>=1 &&
      Number.isSafeInteger(spec.endTurn) && spec.endTurn>=1 && spec.endTurn<=1440 && home && home.id!==d.id &&
      home.id===spec.homeRealmId && !home.mobile && home.ruler && home.capital===d.mobile.origin && form && form.homeAuthority &&
      FB.homeAuthority && FB.homeAuthority.policyValid(form.homeAuthority) &&
      keys(ref,['kind','actorId','realmId','generation']) && Object.keys(ref).length===4 && ref.kind==='realm_ruler' &&
      ref.actorId===spec.actorId && ref.realmId===home.id && ref.generation===spec.homeGeneration &&
      spec.homeGeneration===(home.ruler.generation===undefined ? 1 : home.ruler.generation) &&
      b.memberId===d.mobile.opening.leaderMemberId && keys(actor,['ref']) && Object.keys(actor).length===1 &&
      keys(actor.ref,['kind','realmId']) && Object.keys(actor.ref).length===2 &&
      actor.ref.kind==='realm_ruler' && actor.ref.realmId===home.id);
  };
  M.landedOpeningMatches = function (s,d,b,c) {
    var bm=FB.campaignBookmark(s), realms={};
    (bm.realms || []).forEach(function (r) {realms[r.id]=r;});
    if (!M.landedBindingDefinition(d,b,realms,bm) || !landedAvailable(s,c)) return false;
    var spec=d.mobile.command.landedCommandLink, home=homeId(s,spec.homeRealmId), ruler=homeRuler(s,spec.homeRealmId);
    return !!ruler && ruler.id===c.id && FB.realmRulerGeneration(s,home)===spec.homeGeneration &&
      s.turn<spec.endTurn && FB.homeAuthority.location(s,c)===d.mobile.origin;
  };
  M.landedLink = function (s,rid) {
    var g=s.authority && s.authority.governments[rid];
    return g && g.landedCommandLink || null;
  };
  M.landedHomeRealm = function (s,cid) {
    if (!s.player || s.player.charId!==cid || !s.realms.player || !s.realms.player.alive) return null;
    var result=null;
    Object.keys(s.authority && s.authority.governments || {}).some(function (rid) {
      var link=M.landedLink(s,rid), ruler=link && homeRuler(s,link.homeRealmId);
      if (!link || link.characterId!==cid || !ruler || ruler.id!==cid ||
          FB.realmRulerGeneration(s,homeId(s,link.homeRealmId))!==link.homeGeneration) return false;
      result=homeId(s,link.homeRealmId);return true;
    });
    return result;
  };
  M.landedCommandReason = function (s,rid) {
    var d=definition(s,rid), spec=d && d.landedCommandLink;
    if (!spec) return null;
    var link=M.landedLink(s,rid), r=M.row(s,rid), c=link && s.chars[link.characterId];
    if (!link || !r || !r.command || !c) return 'mandate';
    if (c.dead) return 'death';
    if (r.status!=='active' || !s.realms[rid] || !s.realms[rid].alive) return 'closed';
    if (!landedAvailable(s,c)) return 'custody';
    var home=homeId(s,link.homeRealmId), ruler=homeRuler(s,link.homeRealmId);
    if (!ruler || ruler.id!==c.id || FB.realmRulerGeneration(s,home)!==link.homeGeneration) return 'office';
    if (s.turn>=spec.endTurn) return 'term';
    if (!r.members.some(function (m) {return m.principal.id===c.id && m.allegiance;})) return 'member';
    if (r.leaderId!==c.id || r.command.leaderGeneration!==link.commandGeneration ||
        FB.realmRulerGeneration(s,rid)!==link.commandGeneration || r.command.status!=='active' ||
        d.superior && JSON.stringify(r.command.issuer)!==JSON.stringify(issuer(s,d))) return 'mandate';
    return null;
  };
  function reconcileLanded(s,rid) {
    var link=M.landedLink(s,rid);
    if (!link) return;
    var reason=M.landedCommandReason(s,rid);
    if (link.reason!==reason) {link.reason=reason;link.changedTurn=s.turn;link.revision++;}
    if (reason) {
      (s.armies || []).forEach(function (a) {
        if (a.realm===rid && a.mobileFollowing) {a.path=[];a.goal=null;a.moveLeft=0;}
      });
    }
  }
  M.commandIssuer = function (s,rid) {return issuer(s,definition(s,rid));};
  M.commandSnapshot = function (s,rid) {
    var r=M.row(s,rid), d=definition(s,rid);
    if (!r || !r.command || !d) return null;
    var home=d.landedCommandLink && homeId(s,d.landedCommandLink.homeRealmId);
    var incumbent=home && homeRuler(s,d.landedCommandLink.homeRealmId);
    return {id:d.id,realmId:rid,superior:issuer(s,d),authority:copy(d.superior),commission:copy(r.command),operations:d.operations.slice(),
      landed:d.landedCommandLink ? {link:copy(M.landedLink(s,rid)),reason:M.landedCommandReason(s,rid),
        home:{realmId:home,characterId:incumbent && incumbent.id || null,generation:FB.realmRulerGeneration(s,home)},
        endTurn:d.landedCommandLink.endTurn} : null,effective:M.commandValid(s,rid)};
  };
  M.commandValid = function (s,rid) {
    var r=M.row(s,rid), d=definition(s,rid), c=r && r.command;
    if (!c || !d || !M.active(s,rid) || r.status!=='active' || c.status!=='active' ||
        !G.forRealm(s,rid).use.succession.commandLeadership ||
        c.id!==d.id || c.leaderGeneration!==FB.realmRulerGeneration(s,rid) ||
        !s.realms[rid] || !s.realms[rid].alive || !candidate(s,rid,r.leaderId)) return false;
    return !d.superior || JSON.stringify(c.issuer)===JSON.stringify(issuer(s,d));
  };
  M.commandPermits = function (s,rid,action) {
    var d=definition(s,rid), r=M.row(s,rid);
    return !!(d && r && r.status==='active' && d.operations.indexOf(action)>=0 &&
      (action==='pledge' || action==='leave' || M.commandValid(s,rid)));
  };
  M.commandDecision = function (s,rid,operation) {
    var action={agreement:'offer',treaty:'peace',grant:'settle',levy:'recruit'}[operation] || operation;
    return M.commandPermits(s,rid,action);
  };
  M.initializeCommand = function (s,d) {
    var r=M.row(s,d.id), spec=d.mobile.command;
    r.schema=3;
    r.command={id:spec.id,status:'active',revision:0,issuer:issuer(s,spec),
      leaderGeneration:FB.realmRulerGeneration(s,d.id)};
    if (spec.landedCommandLink) {
      var link=spec.landedCommandLink;
      s.authority.governments[d.id].landedCommandLink={schema:1,characterId:r.leaderId,
        homeRealmId:link.homeRealmId,homeGeneration:link.homeGeneration,commandGeneration:r.command.leaderGeneration,
        revision:0,reason:null,changedTurn:s.turn};
    }
  };
  function candidate(s,rid,cid) {
    var r=M.row(s,rid), p=M.profile(s,rid), c=s.chars[cid];
    var line=c && c.royalLine, court=line && s.realms[line.realmId], tree=court && court.succession;
    var d=definition(s,rid);
    if (d && d.landedCommandLink) {
      var link=M.landedLink(s,rid);
      if (!link || link.characterId!==cid || M.landedCommandReason(s,rid)) return false;
    } else if (line && line.realmId!==rid && court && court.alive && tree && tree.rulerMemberId===line.memberId) return false;
    var current=issuer(s,definition(s,rid));
    if (current && current.characterId===cid) return false;
    return live(s,c) && s.date.year-c.born>=p.minAge && r.members.some(function (m) {
      return m.principal.id===cid && m.allegiance;
    });
  }
  function quote(s,request) {
    var rid=request.realmId, r=M.row(s,rid), d=definition(s,rid), actor=request.actor;
    var q={allowed:false,reason:'command',realmId:rid,action:request.action,
      terms:{candidateId:request.candidateId || null},cost:0,signature:null};
    if (!keys(request,['realmId','commandId','action','candidateId','actor']) || !r || !r.command || !d ||
        request.commandId!==d.id || !M.active(s,rid) || r.status!=='active' || !s.realms[rid].alive ||
        !keys(actor,['kind','id']) || actor.kind!=='character' || !d.superior || d.superior.kind==='external_authority') return q;
    var current=issuer(s,d);
    if (!current || current.characterId!==actor.id ||
        request.action!=='appoint' && request.action!=='recall' ||
        request.action==='appoint' && (d.landedCommandLink || !candidate(s,rid,request.candidateId) ||
          M.commandValid(s,rid) && request.candidateId===r.leaderId) ||
        request.action==='recall' && (request.candidateId!==undefined || r.command.status==='recalled')) return q;
    q.signature=JSON.stringify([s.turn,s.date.year,r,d,current,s.chars[current.characterId],
      request.candidateId && s.chars[request.candidateId],s.realms[rid].ruler,
      M.migration(s,rid),M.host(s,rid),s.player && [s.player.charId,s.player.tier,s.player.gold],
      FB.treasuryAvailable(s,rid),M.commandSnapshot(s,rid),r.leaderId && s.chars[r.leaderId]]);
    q.allowed=true;q.reason=null;return q;
  }
  S.registerSource('mobile_command',{
    quote:quote,
    apply:function (s,request,review) {
      if (JSON.stringify(quote(s,request))!==JSON.stringify(review) || !review.allowed) return false;
      var rid=request.realmId, r=M.row(s,rid), d=definition(s,rid);
      if (request.action==='appoint') {
        M.installLeader(s,rid,request.candidateId);
        r.command.status='active';r.command.issuer=issuer(s,d);
        r.command.leaderGeneration=FB.realmRulerGeneration(s,rid);
      } else {
        r.command.status='recalled';r.selection=null;r.decision=null;
      }
      r.command.revision++;r.revision++;
      var army=M.host(s,rid);
      if (army) {army.path=[];army.goal=null;army.moveLeft=0;}
      if (M.columnStopAll) M.columnStopAll(s,rid);
      reconcileLanded(s,rid);
      return true;
    }
  });
  M.reviewCommand = function (s,request) {return S.reviewSource(s,'mobile_command',request);};
  function compose(slot,id,patch) {return Object.assign({},G.strategy(slot,id),patch);}
  ['retained_principal','superior_commission'].forEach(function (id) {
    G.register('succession',id,{commandLeadership:true,mobileLeadership:true,institutionalProperty:true,repairEmpty:false,
      eligible:function () {return false;},order:function () {return [];},candidates:function () {return [];},
      vacancy:function () {return {allowed:false};},accession:function (s,rid) {return M.leader(s,rid);},refresh:function () {return false;}});
  });
  G.register('consent','command_consent',{
    local:function () {return false;},
    decision:function (s,rid,c) {
      var leader=M.leader(s,rid), acting=c.actor && (c.actor.kind==='character' ? leader && c.actor.id===leader.id :
        c.actor.kind==='realm' && c.actor.id===rid);
      var allowed=!!acting && M.commandDecision(s,rid,c.operation);
      return {allowed:allowed,reason:allowed ? null : 'command',required:[],approvals:{}};
    },constituency:function (s,rid,c) {return {kind:'commission',realmId:rid,operation:c.operation,members:[]};}
  });
  G.register('revenue','command_receipts',compose('revenue','coalition_receipts',{
    countyBase:function () {return 0;},settlementBase:function () {return 0;},realmIncome:function () {return 0;}
  }));
  var faults=M.definitionFaults;
  M.definitionFaults = function (d,formId,provinces,realms,profiles,bookmark) {
    var errors=faults(d,formId,provinces,realms,profiles,bookmark), form=G.resolve(formId), t=d.mobile;
    if (errors.length) return errors;
    var rule=form.use.succession, command=t && t.command;
    function fail() {errors.push(FB.T('Invalid mobile command declaration.'));}
    if (!rule.commandLeadership) {if (command!==undefined || form.use.territory.mobileFollowing && !rule.mobileLeadership) fail();return errors;}
    if (!t || !t.opening || !keys(command,['id','superior','operations','landedCommandLink']) || typeof command.id!=='string' ||
        !/^[a-z][a-z0-9_]{0,95}$/.test(command.id) || !Array.isArray(command.operations) ||
        !command.operations.length || command.operations.length>operations.length ||
        command.operations.some(function (op,i) {return operations.indexOf(op)<0 || command.operations.indexOf(op)!==i;}) ||
        !form.use.territory.mobileFollowing || form.strategies.consent!=='command_consent' ||
        form.strategies.levy!=='following_levy' || form.strategies.revenue!=='command_receipts') {fail();return errors;}
    if (command.landedCommandLink!==undefined) {
      var binding=t.opening.principals.filter(function (b) {return b.memberId===t.opening.leaderMemberId;})[0];
      if (!M.landedBindingDefinition(d,binding,realms,bookmark) ||
          command.operations.some(function (op) {return ['land','contract','settle'].indexOf(op)>=0;})) fail();
    }
    var ref=command.superior;
    if (rule===G.strategy('succession','retained_principal')) {if (ref!==null) fail();}
    else if (!ref) fail();
    else if (ref.kind==='opening_actor') {
      if (!keys(ref,['kind','actorId']) || !bookmark || !bookmark.opening || !own(bookmark.opening.actors,ref.actorId) ||
          bookmark.opening.actors[ref.actorId].ref ||
          t.opening.principals.some(function (b) {return b.person.actorId===ref.actorId;})) fail();
    } else if (ref.kind==='external_authority') {
      if (!keys(ref,['kind','id','name','generation','endTurn']) || typeof ref.id!=='string' ||
          !/^[a-z][a-z0-9_]{0,95}$/.test(ref.id) || typeof ref.name!=='string' || !ref.name.trim() || ref.name.length>160 ||
          !Number.isSafeInteger(ref.generation) || ref.generation<1 || ref.generation>1000000 ||
          !Number.isSafeInteger(ref.endTurn) || ref.endTurn<1 || ref.endTurn>1440) fail();
    } else if (ref.kind!=='realm_ruler' || !keys(ref,['kind','realmId']) || !own(realms,ref.realmId) || ref.realmId===d.id ||
        !!realms[ref.realmId].mobile) fail();
    return errors;
  };
  var plan=M.openingPlan;
  M.openingPlan = function (s,d) {
    var result=plan(s,d);
    if (!result.allowed) return result;
    var spec=d.mobile && d.mobile.command, current=spec && issuer(s,spec);
    if (spec && spec.superior && (!current || d.mobile.opening.principals.some(function (b) {
      return FB.bookmarkActor(s,b.person.actorId).id===current.characterId;
    }))) result.allowed=false;
    return result;
  };
  var day=M.day, died=FB.royalCharDied;
  M.day=function (s) {
    Object.keys(s.authority && s.authority.governments || {}).forEach(function (rid) {reconcileLanded(s,rid);});
    return day(s);
  };
  FB.mobileDay=M.day;
  FB.royalCharDied=function (s,c,rid) {
    var result=died(s,c,rid);
    Object.keys(s.authority && s.authority.governments || {}).forEach(function (id) {reconcileLanded(s,id);});
    return result;
  };
  var validate=M.validate;
  M.validate = function (s) {
    validate(s);
    (FB.campaignBookmark(s).realms || []).forEach(function (d) {
      if (d.mobile && d.mobile.command && d.mobile.command.landedCommandLink && !M.landedLink(s,d.id) &&
          !(FB.expeditionPreparation && FB.expeditionPreparation.unformed(s,d.id)))
        throw new Error(FB.T('Missing saved landed command link.'));
    });
    Object.keys(s.authority && s.authority.governments || {}).forEach(function (rid) {
      var r=M.row(s,rid), spec=definition(s,rid);
      var link=M.landedLink(s,rid), declared=spec && spec.landedCommandLink;
      if (!r && FB.expeditionPreparation && FB.expeditionPreparation.unformed(s,rid)) {
        if (link!==null) throw new Error(FB.T('Invalid saved landed command link.'));
        return;
      }
      function badLink() {throw new Error(FB.T('Invalid saved landed command link.'));}
      if (!declared) {if (link!==null || own(s.authority.governments[rid],'landedCommandLink')) badLink();}
      else {
        var actor=FB.bookmarkActor(s,declared.actorId), home=homeId(s,declared.homeRealmId);
        var initial=(FB.campaignBookmark(s).realms || []).filter(function (d) {return d.id===rid;})[0];
        var original=r && r.openingBindings && r.openingBindings.filter(function (b) {return b.person.actorId===declared.actorId;})[0];
        if (!keys(link,['schema','characterId','homeRealmId','homeGeneration','commandGeneration','revision','reason','changedTurn']) ||
            Object.keys(link).length!==8 || link.schema!==1 || !actor || !original || link.characterId!==actor.id ||
            link.characterId!==original.characterId || link.homeRealmId!==declared.homeRealmId ||
            link.homeGeneration!==declared.homeGeneration || !s.realms[home] ||
            link.homeGeneration>FB.realmRulerGeneration(s,home) ||
            !Number.isSafeInteger(link.commandGeneration) || link.commandGeneration<1 ||
            link.commandGeneration!==((initial.ruler && initial.ruler.generation) || 1)+1 ||
            !r.command || link.commandGeneration!==r.command.leaderGeneration ||
            !Number.isSafeInteger(link.revision) || link.revision<0 || link.revision>=Number.MAX_SAFE_INTEGER ||
            !Number.isSafeInteger(link.changedTurn) || link.changedTurn<0 || link.changedTurn>s.turn ||
            [null,'death','custody','office','term','member','mandate','closed'].indexOf(link.reason)<0 ||
            link.revision===0 && (link.reason!==null || link.changedTurn!==(initial.mobile.preparationId &&
              FB.expeditionPreparation ? FB.expeditionPreparation.formedTurn(s,rid) : 0))) badLink();
      }
      if (!r) return;
      function fail() {throw new Error(FB.T('Invalid saved mobile command.'));}
      if (!spec) {if (r.command!==undefined || r.schema===3) fail();return;}
      var c=r.command, form=G.forRealm(s,rid);
      if (r.schema!==3 || !keys(c,['id','status','revision','issuer','leaderGeneration']) || c.id!==spec.id ||
          ['active','vacant','recalled'].indexOf(c.status)<0 || !Number.isSafeInteger(c.revision) || c.revision<0 || c.revision>r.revision ||
          !Number.isSafeInteger(c.leaderGeneration) || c.leaderGeneration<1 ||
          c.leaderGeneration>FB.realmRulerGeneration(s,rid) || r.selection!==null || r.decision!==null ||
          c.status==='active' && (!r.leaderId || r.status==='active' && c.leaderGeneration!==FB.realmRulerGeneration(s,rid)) ||
          c.status==='vacant' && r.leaderId!==null ||
          r.status==='active' && !form.use.succession.commandLeadership) fail();
      if (spec.superior) {
        if (spec.superior.kind==='external_authority') {
          if (!keys(c.issuer,['externalAuthorityId','generation']) || c.issuer.externalAuthorityId!==spec.superior.id ||
              c.issuer.generation!==spec.superior.generation) fail();
          return;
        }
        if (!keys(c.issuer,['characterId','generation']) || !own(s.chars,c.issuer.characterId)) fail();
        if (spec.superior.kind==='opening_actor') {
          var original=FB.bookmarkActor(s,spec.superior.actorId);
          if (!original || c.issuer.characterId!==original.id || c.issuer.generation!==null) fail();
        } else {
          var generation=FB.realmRulerGeneration(s,spec.superior.realmId);
          if (!Number.isSafeInteger(c.issuer.generation) || c.issuer.generation<1 || c.issuer.generation>generation) fail();
          if (c.issuer.generation===generation) {
            var ruler=FB.realmRulerCharacterSnapshot(s,spec.superior.realmId);
            var realm=s.realms[spec.superior.realmId], tree=realm && realm.succession;
            var member=tree && tree.members[tree.rulerMemberId], expected=ruler ? ruler.id : member && member.charId;
            if (!expected || expected!==c.issuer.characterId) fail();
          }
        }
      } else if (c.issuer!==null) fail();
    });
    return true;
  };
})();
