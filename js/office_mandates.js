/* Reviewed personal delegation on the canonical appointment ledger. */
(function () {
  'use strict';
  var M = FB.officeMandates = {}, Q = FB.political;
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function equal(a,b) { return JSON.stringify(a) === JSON.stringify(b); }
  function own(o,k) { return !!o && Object.prototype.hasOwnProperty.call(o,k); }
  function rows(s) { return s.authority && s.authority.appointments || []; }
  function row(s,id) { return rows(s).filter(function (r) { return r.id === id; })[0]; }
  function host(s,id) { return (s.armies || []).filter(function (a) { return a.id === id; })[0]; }
  function definition(r) { return r && FBDATA.authorityOffices[r.officeId]; }
  function terms(r) { var d = definition(r); return d && d.mandate; }
  function ruler(s,rid) { return rid === 'player' ? s.chars[s.player.charId] : FB.realmRulerCharacterSnapshot(s,rid); }
  function court(s,a,rid) { var c = ruler(s,rid); return !!(a && Q.actor(s,a) &&
    (a.kind === 'realm' && a.id === rid || a.kind === 'character' && c && a.id === c.id)); }
  function person(s,r) { return r && r.holder && r.holder.kind === 'character' && s.chars[r.holder.id]; }
  function available(s,r) {
    var c = person(s,r);
    return !!(c && !c.dead && !c.unfree && FB.ageOf(c,s.date.year) >= 16 &&
      !FB.justiceCustodyOf(s,c.id) && (c.id !== s.player.charId ||
        FB.station.isFree(s.player,s) && !(s.player.flags && s.player.flags.in_prison)));
  }
  function idSpec(table) { return {type:'string',minLength:1,maxLength:200,ref:table ? {table:table} : undefined}; }
  var powerSpec = {type:'array',minItems:1,maxItems:4,unique:true,
    items:{type:'string',enum:['command','negotiate','pay','propose']}};
  M.definitionFaults = function (d,data) {
    if (!d || d.mandate === undefined) return [];
    data = data || FBDATA;
    var faults = FB.schema.faults(d.mandate,{type:'object',fields:{
      schema:{type:'integer',value:1}, powers:powerSpec,
      tenureDays:{type:'integer',min:1,max:3600},
      favor:{type:'object',fields:{source:{type:'string',value:'court_standing'},minimum:{type:'number',min:-100,max:100}}},
      dismissal:{type:'string',value:'court'}, responseDays:{type:'integer',min:1,max:360},
      hostIds:{type:'array',optional:'absent',maxItems:8,unique:true,items:idSpec()},
      contractTemplates:{type:'array',maxItems:8,unique:true,items:idSpec('federateContractTerms')},
      acclamation:{type:'object',optional:'absent',fields:{officeId:idSpec('authorityOffices'),
        sourceId:idSpec('legitimacySources'), minimumSources:{type:'integer',min:1,max:8},
        requiredMandates:{type:'array',minItems:1,maxItems:4,unique:true,
          items:{type:'string',enum:['command','court','community','religious_head']}},
        dispute:{type:'boolean'}, afterDismissal:{type:'boolean'}}}
    }},'mandate',{data:data});
    if (faults.length) return faults;
    var t = d.mandate, a = t.acclamation, claimant = a && data.authorityOffices[a.officeId],
      source = a && data.legitimacySources[a.sourceId];
    if (d.powers.some(function (p) { return p !== 'ban'; }) || d.homePowers !== undefined ||
        d.publicRole !== undefined && d.publicRole !== 'commander' ||
        (t.powers.indexOf('command') >= 0) !== (d.powers.indexOf('ban') >= 0) ||
        t.powers.indexOf('command') >= 0 && d.scopes.indexOf('host') < 0 ||
        t.powers.indexOf('pay') >= 0 && t.powers.indexOf('negotiate') < 0 ||
        t.contractTemplates.length && t.powers.indexOf('negotiate') < 0 ||
        a && (t.powers.indexOf('command') < 0 || !claimant || claimant.scopes.indexOf('realm') < 0 ||
          claimant.powers.length || !source || source.mandate !== 'command' || source.issuerKinds.indexOf('host') < 0 ||
          (claimant.recognitionSources || []).indexOf(a.sourceId) < 0)) faults.push('mandate: incompatible powers or acclamation.');
    t.contractTemplates.forEach(function (id) {
      var c = data.federateContractTerms[id];
      if (c && (c.land !== 'none' || c.recognition !== 'none')) faults.push('mandate.contractTemplates: service without land or recognition is required.');
    });
    return faults;
  };
  M.claimOffices = function () {
    var out = Object.create(null);
    Object.keys(FBDATA.authorityOffices || {}).forEach(function (key) {
      var d = FBDATA.authorityOffices[key], m = d && d.mandate;
      if (m && m.acclamation) out[m.acclamation.officeId] = true;
    });
    return out;
  };
  M.favor = function (s,r) {
    var c = person(s,r);
    return c ? FB.patronStanding(s,c,FB.realmIdForRulerCharacter(s,c),r.institutionId) : -100;
  };
  M.suspension = function (s,r) {
    var t = terms(r);
    if (!t) return null;
    if (!r.mandate || r.mandate.definitionKey !== JSON.stringify(t)) return 'terms';
    if (!available(s,r)) return 'holder';
    if (M.favor(s,r) < t.favor.minimum) return 'favor';
    return null;
  };
  M.initialize = function (s,r) {
    var t = terms(r);
    if (!t) return;
    r.endTurn = Math.min(r.endTurn === null ? Infinity : r.endTurn,s.turn + t.tenureDays);
    r.mandate = {schema:1,definitionKey:JSON.stringify(t),originalInstitutionId:r.institutionId,originalGeneration:r.appointerGeneration,
      response:null,proposal:null,claim:null};
  };
  M.forces = function (s,r) {
    var t = terms(r), ids = r && r.scope.kind === 'host' ? [r.scope.id] : [];
    (t && t.hostIds || []).forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });
    return ids.filter(function (id) {
      var a = host(s,id);
      return a && a.men > 0 && (a.realm === r.institutionId || !r.publicTerms && Q.contracts(s,r.institutionId).some(function (c) {
        return c.effective && c.hostId === id && c.federateRealmId === a.realm;
      }));
    });
  };
  function active(s,r,power) {
    return !!(r && terms(r) && r.mandate && terms(r).powers.indexOf(power) >= 0 &&
      !M.suspension(s,r) && Q.appointmentStatus(s,r) === 'active');
  }
  function claimSupport(s,r) {
    var t = terms(r), claim = r && r.mandate && r.mandate.claim;
    if (!t || !t.acclamation || !claim) return [];
    return Q.legitimacy(s,r.holder,Q.realmReference(r.institutionId)).filter(function (p) {
      var d = definition(row(s,claim.appointmentId));
      var force = p.issuer.kind === 'host' && host(s,p.issuer.id);
      return !!d && (p.issuer.kind !== 'host' || force && force.men > 0) && (d.recognitionSources || []).indexOf(p.source) >= 0;
    });
  }
  function supported(s,r) {
    var t = terms(r).acclamation, support = claimSupport(s,r), issuers = [];
    support.forEach(function (p) { var k = JSON.stringify(p.issuer); if (issuers.indexOf(k) < 0) issuers.push(k); });
    return issuers.length >= t.minimumSources && t.requiredMandates.every(function (m) {
      return support.some(function (p) { return FBDATA.legitimacySources[p.source].mandate === m; });
    });
  }
  M.supported = supported;
  M.warAppointment = function (s,id) {
    return rows(s).filter(function (r) { return r.mandate && r.mandate.claim && r.mandate.claim.warId === id; })[0];
  };
  M.contestedCommand = function (s,actor,id) {
    return rows(s).some(function (r) {
      var c = r.mandate && r.mandate.claim, a = host(s,id), war = c && c.warId && FB.ordinaryWarById(s,c.warId);
      return equal(r.holder,actor) && available(s,r) && c && c.status === 'disputed' && war &&
        c.forces.some(function (f) { return f.hostId === id; }) && a && a.realm === c.factionId && a.men > 0;
    });
  };
  M.command = function (s,r,id) { return active(s,r,'command') && M.forces(s,r).indexOf(id) >= 0; };
  M.preservesAccount = function (s,rid) {
    return rows(s).some(function (r) { var c = r.mandate && r.mandate.claim;
      return c && c.status === 'succeeded' && c.currentCourtId === rid; });
  };
  M.institutionMatches = function (s,original,current) {
    if (original === current || s.start && s.start.rulerRealmId === original && current === 'player') return true;
    return rows(s).some(function (r) {
      var m = r.mandate, c = m && m.claim;
      return c && c.status === 'succeeded' && c.currentCourtId === current &&
        (m.originalInstitutionId === original || m.originalInstitutionId === 'player' && s.start && s.start.rulerRealmId === original);
    });
  };
  function appointmentReview(s,r,target) {
    if (!target || target.holderId === r.holder.id) return null;
    var a = Q.realmReference(r.institutionId);
    return FB.administrationProfile(s,r.institutionId) ? FB.publicAppointmentQuote(s,a,{
      institutionId:r.institutionId,officeId:target.officeId,holderId:target.holderId,
      scope:target.scope,provinceId:target.sourceProvinceId}) : FB.officeAppointmentQuote(s,a,{
      institutionId:r.institutionId,officeId:target.officeId,holder:{kind:'character',id:target.holderId},scope:target.scope});
  }
  var targetSpec = {type:'object',fields:{officeId:idSpec('authorityOffices'),holderId:idSpec(),
    scope:{type:'object',fields:{kind:{type:'string',enum:['host','county','realm']},id:idSpec()}},
    sourceProvinceId:{type:'string',optional:'absent',minLength:1,maxLength:200}}};
  var inputs = {
    command:{hostId:idSpec(),destination:idSpec()},
    offer:{templateId:idSpec('federateContractTerms'),federateRealmId:idSpec(),hostId:{type:'string',optional:'absent',minLength:1,maxLength:200}},
    consent:{contractId:idSpec()}, refuse:{contractId:idSpec()},
    renew:{contractId:idSpec(),endTurn:{type:'integer',min:1,max:Number.MAX_SAFE_INTEGER},payPerSeason:{type:'number',min:0,max:1000000}},
    propose:{target:targetSpec}, accept_proposal:{}, reject_proposal:{}, dismiss:{}, confirm:{}, accept_loss:{},
    acclaim:{hostId:idSpec()}, accede:{}, dispute:{}, withdraw:{}, renounce:{}
  };
  M.review = function (s,actor,id,operation,input) {
    if (input === undefined) input = {};
    var r = row(s,id), t = terms(r), c = person(s,r), owner = null, deal = null, payer = null, payee = null,
      power = {command:'command',offer:'negotiate',consent:'negotiate',refuse:'negotiate',renew:'negotiate',propose:'propose'}[operation];
    var q = {schema:1,actor:copy(actor || null),appointmentId:id,operation:operation,input:copy(input),
      institutionId:r && r.institutionId || null,allowed:false,reason:null,cost:0,owner:null,home:null};
    var validInput = inputs[operation] && FB.schema.valid(input,{type:'object',fields:inputs[operation]});
    var self = r && equal(actor,r.holder) && available(s,r), patron = r && court(s,actor,r.institutionId);
    var validActor = FB.schema.valid(actor,{type:'object',fields:{kind:{type:'string',enum:['character','realm']},id:idSpec()}});
    if (!r || !t || !r.mandate || !validInput || !validActor || !Q.actor(s,actor)) q.reason = FB.T('A declared mandate, original appointment and valid decision are required.');
    else if (['dismiss','accept_proposal','reject_proposal'].indexOf(operation) >= 0 ? !patron :
        operation === 'accede' ? !self && !patron : operation === 'confirm' ? !self && !patron : !self)
      q.reason = FB.T('Only the actual holder or the lawful appointing court may make this decision.');
    else if (power && !active(s,r,power) && !(operation === 'command' && M.contestedCommand(s,actor,input.hostId)))
      q.reason = FB.T('This power is undeclared or the mandate is suspended, ended or awaiting reaffirmation.');
    else if (operation === 'command') {
      var a = host(s,input.hostId);
      if (!M.command(s,r,input.hostId) && !M.contestedCommand(s,actor,input.hostId) || !FB.world.byId[input.destination])
        q.reason = FB.T('Command is limited to the declared living forces.');
      else { owner = FB.armyOrderPlan(s,a,input.destination); if (!owner.ok) q.reason = FB.T('No lawful march is available to that destination.'); }
    } else if (['offer','consent','refuse','renew'].indexOf(operation) >= 0) {
      if (operation === 'offer') owner = Q.contractTerms(s,input.templateId,{
        patronRealmId:r.institutionId,federateRealmId:input.federateRealmId,hostId:input.hostId || null});
      else {
        deal = Q.contract(s,input.contractId);
        owner = deal && (operation === 'renew' ? Q.contractRenegotiationQuote(s,deal.id,{
          endTurn:input.endTurn,payPerSeason:input.payPerSeason}) : deal);
      }
      var obligation = operation === 'offer' ? owner : deal;
      payer = FB.treasuryPublicAccountSnapshot(s,r.institutionId);
      payee = obligation && FB.treasuryPublicAccountSnapshot(s,obligation.federateRealmId);
      if (!owner || !obligation || obligation.patronRealmId !== r.institutionId ||
          t.contractTemplates.indexOf(obligation.templateId) < 0 || obligation.recognitionId ||
          (obligation.settlementCountyIds || []).length || (obligation.settlementAwards || []).length)
        q.reason = FB.T('Choose declared service terms without land or recognition awards.');
      else if (operation === 'offer' && Q.contracts(s,r.institutionId).some(function (d) {
        return d.hostId && d.hostId === obligation.hostId && (d.effective || d.status === 'offered');
      })) q.reason = FB.T('That force already has an offered or effective service contract.');
      else if (!payer || !payee) q.reason = FB.T('Both parties need actual public accounts; private cash cannot replace them.');
      else if (operation !== 'refuse') {
        var initial = operation === 'offer' || obligation.initialPaidTurn === undefined ? obligation.initialPay || 0 : 0;
        q.cost = (operation === 'renew' ? input.payPerSeason : obligation.payPerSeason) + initial;
        if (q.cost && !active(s,r,'pay')) q.reason = FB.T('This mandate does not authorize public payment.');
        else if (payer.available < q.cost) q.reason = FB.T('The court cannot cover the initial payment and one season of service.');
        else if (operation === 'consent' && (deal.status !== 'offered' || own(deal.approvals,r.institutionId) ||
          !Q.contractQuote(s,deal).allowed || deal.succession.patron !== FB.realmRulerGeneration(s,r.institutionId) ||
          deal.succession.federate !== FB.realmRulerGeneration(s,deal.federateRealmId))) q.reason = FB.T('The offer or either ruler has changed; seek new bilateral consent.');
      } else if (deal.status !== 'offered') q.reason = FB.T('Only an outstanding offer can be refused.');
    } else if (operation === 'propose' || operation === 'accept_proposal' || operation === 'reject_proposal') {
      var proposal = r.mandate.proposal, target = operation === 'propose' ? input.target : proposal && proposal.target;
      owner = appointmentReview(s,r,target);
      if (!active(s,r,'propose') || operation !== 'propose' && (!proposal || proposal.status !== 'pending' ||
          proposal.generation !== FB.realmRulerGeneration(s,r.institutionId)) ||
          operation === 'propose' && proposal && proposal.status === 'pending')
        q.reason = FB.T('The proposing mandate or pending proposal is no longer current.');
      else if (operation !== 'reject_proposal' && (!owner || !owner.allowed)) q.reason = owner && owner.reason || FB.T('Choose a qualified third person and an available office source.');
      if (owner && operation !== 'reject_proposal') q.cost = owner.cost;
    } else if (operation === 'dismiss' || operation === 'confirm') {
      owner = r.publicTerms ? FB.publicOfficeQuote(s,actor,id,operation === 'dismiss' ? 'remove' : 'confirm') :
        FB.officeTransitionQuote(s,actor,id,operation === 'dismiss' ? 'remove' : 'confirm');
      if (!owner || !owner.allowed || operation === 'confirm' && M.suspension(s,r))
        q.reason = owner && owner.reason || FB.T('The court cannot reaffirm or remove this appointment in its current state.');
    } else if (operation === 'accept_loss') {
      if (Q.appointmentStatus(s,r) === 'active' || r.mandate.response || r.mandate.claim && r.mandate.claim.status === 'disputed')
        q.reason = FB.T('There is no unanswered loss of mandate.');
    } else if (operation === 'acclaim') {
      var eligibleLoss = t.acclamation && t.acclamation.afterDismissal && r.status === 'removed' &&
        s.turn <= r.changedTurn + t.responseDays && !r.mandate.response;
      if (!t.acclamation || r.mandate.claim || !available(s,r) || FB.isReigningRealmRuler(s,c) ||
          c.id === s.player.charId && FB.station.rulesRealm(s.player,s) ||
          !active(s,r,'command') && !eligibleLoss || r.endTurn <= s.turn ||
          r.appointerGeneration !== FB.realmRulerGeneration(s,r.institutionId) || M.forces(s,r).indexOf(input.hostId) < 0)
        q.reason = FB.T('Acclamation needs a declared eligible command or an unanswered dismissal within its response term.');
      else if (!FB.treasuryPublicAccountSnapshot(s,r.institutionId)) q.reason = FB.T('The court needs its own public account.');
      else if (rows(s).some(function (p) { return p.officeId === t.acclamation.officeId && p.institutionId === r.institutionId &&
          equal(p.holder,r.holder) && ['active','contested'].indexOf(p.status) >= 0; })) q.reason = FB.T('This person already has a recorded claim.');
      else if (FB.administrationProfile(s,r.institutionId)) {
        owner = FB.governmentRecognition.nominationQuote(s,Q.realmReference(r.institutionId),r.institutionId,r.holder.id);
        if (!owner.allowed) q.reason = owner.reason;
      }
      if (!q.reason && FB.homeAuthority) {
        q.home = FB.homeAuthority.quote(s,r.institutionId,'appointment');
        if (!q.home.allowed) q.reason = FB.homeAuthority.reason();
      }
    } else if (operation === 'accede' || operation === 'dispute') {
      var claim = r.mandate.claim;
      if (!claim || claim.status !== 'claimed' || !available(s,r) || !supported(s,r) ||
          claim.generation !== FB.realmRulerGeneration(s,r.institutionId)) q.reason = FB.T('The claim needs its declared independent recognition and unchanged court.');
      else if (operation === 'dispute') {
        if (!t.acclamation.dispute || !M.forces(s,r).length || !ruler(s,r.institutionId)) q.reason = FB.T('No living incumbent and declared force are available for a dispute.');
        else if (!FB.warCountyHeldBy(s,s.realms[r.institutionId].capital,r.institutionId)) q.reason = FB.T('The court no longer holds its seat; review current political conditions.');
        else if (FB.administrationProfile(s,r.institutionId)) q.reason = FB.T('This court resolves office candidates through its public recognition procedure.');
      } else {
        owner = FB.governmentRecognition.officerAccessionQuote(s,actor,r);
        if (!owner.allowed) q.reason = owner.reason;
      }
    } else if (operation === 'withdraw') {
      var fighting = r.mandate.claim;
      if (!fighting || fighting.status !== 'disputed' || !FB.ordinaryWarById(s,fighting.warId)) q.reason = FB.T('There is no active acclamation campaign.');
    } else if (operation === 'renounce') {
      if (!r.mandate.claim || r.mandate.claim.status !== 'claimed') q.reason = FB.T('There is no unanswered claim to renounce.');
    }
    if (!q.reason && q.cost > 0 && ['offer','consent','renew'].indexOf(operation) >= 0 && FB.homeAuthority) {
      q.home = FB.homeAuthority.quote(s,r.institutionId,'spend',{characterId:r.holder.id});
      if (!q.home.allowed) q.reason = FB.homeAuthority.reason();
    }
    q.allowed = !q.reason;
    q.owner = owner ? copy(owner) : null;
    q.stamp = JSON.stringify([s.turn,r,t,c && [c.dead,c.unfree,c.born,FB.justiceCustodyOf(s,c.id)],
      r && M.favor(s,r),r && FB.realmRulerGeneration(s,r.institutionId),r && M.forces(s,r).map(function (id) { return host(s,id); }),
      r && r.mandate && r.mandate.claim && claimSupport(s,r),payer,payee,
      deal && [FB.realmRulerGeneration(s,deal.federateRealmId),deal],
      operation === 'offer' && owner && [FB.realmRulerGeneration(s,owner.federateRealmId),FBDATA.federateContractTerms[input.templateId]],
      operation === 'acclaim' && validInput && (s.authority.recognitions || []).filter(function (p) {
        return p.issuer.kind === 'host' && p.issuer.id === input.hostId && t && t.acclamation && p.source === t.acclamation.sourceId &&
          equal(p.scope,Q.realmReference(r.institutionId));
      }),
      r && FB.governments.publicAuthorityReadiness(s,r.institutionId)]);
    return q;
  };
  M.commit = function (s,reviewed) {
    if (!reviewed) return false;
    var q = M.review(s,reviewed.actor,reviewed.appointmentId,reviewed.operation,reviewed.input);
    if (!q.allowed || !equal(q,reviewed)) return false;
    var r = row(s,q.appointmentId), m = r.mandate, input = q.input, op = q.operation, result;
    if (op === 'command') return FB.orderArmy(s,host(s,input.hostId),input.destination,q.owner);
    if (op === 'offer') {
      result = FB.authorityOfferContract(s,q.owner);
      if (result) s.authority.contracts.filter(function (c) { return c.id === result.id; })[0].publicPayer = true;
      return result;
    }
    if (op === 'consent') {
      return FB.authorityConsentContract(s,input.contractId,r.institutionId,true);
    }
    if (op === 'refuse') return FB.authorityContractTransition(s,input.contractId,'release',r.institutionId);
    if (op === 'renew') {
      result = FB.authorityRenegotiateContract(s,input.contractId,r.institutionId,input,q.owner);
      if (result) s.authority.contracts.filter(function (c) { return c.id === input.contractId; })[0].publicPayer = true;
      return result;
    }
    if (op === 'propose') { m.proposal = {target:copy(input.target),generation:FB.realmRulerGeneration(s,r.institutionId),turn:s.turn,status:'pending'}; return true; }
    if (op === 'reject_proposal') { m.proposal.status = 'rejected'; return true; }
    if (op === 'accept_proposal') {
      result = r.publicTerms || FB.administrationProfile(s,r.institutionId) ? FB.publicAppoint(s,q.owner) : FB.officeSeekAppointment(s,q.owner);
      if (result) { m.proposal.status = 'accepted'; m.proposal.appointmentId = result.id; }
      return result;
    }
    if (op === 'dismiss' || op === 'confirm') return r.publicTerms ? FB.publicOfficeApply(s,q.owner) : FB.officeTransition(s,q.owner);
    if (op === 'accept_loss') { m.response = {choice:'accept',turn:s.turn}; return true; }
    if (op === 'acclaim') {
      var a = terms(r).acclamation, at = Q.realmReference(r.institutionId);
      var proof = Q.legitimacy(s,r.holder,at,a.sourceId).filter(function (p) { return p.issuer.kind === 'host' && p.issuer.id === input.hostId; })[0] ||
        FB.authorityRecognize(s,{issuer:{kind:'host',id:input.hostId},subject:r.holder,source:a.sourceId,scope:at});
      if (!proof) return false;
      var appointment = FB.authorityAppoint(s,{officeId:a.officeId,institutionId:r.institutionId,
        appointer:Q.realmReference(r.institutionId),holder:r.holder,scope:at,recognitionId:proof.id,contested:true});
      if (!appointment) throw new Error('Reviewed acclamation appointment failed.');
      (s.authority.recognitions || []).filter(function (p) {
        return p.id !== proof.id && p.status === 'active' && p.source === a.sourceId && p.issuer.kind === 'host' && p.issuer.id === input.hostId && equal(p.scope,at);
      }).forEach(function (p) { FB.authorityRecognitionTransition(s,p.id,'revoke'); });
      m.claim = {appointmentId:appointment.id,recognitionId:proof.id,generation:FB.realmRulerGeneration(s,r.institutionId),
        turn:s.turn,status:'claimed',warId:null,factionId:null,forces:[],currentCourtId:r.institutionId};
      if (FB.administrationProfile(s,r.institutionId)) {
        var nomination = FB.governmentRecognition.nominationQuote(s,Q.realmReference(r.institutionId),r.institutionId,r.holder.id);
        if (nomination.allowed) FB.governmentRecognition.nominate(s,nomination);
      }
      FB.news(s,FB.msg('news.office.mandate_acclaimed',
        '{person} is acclaimed by a declared host. This records a claim, not automatic accession.',{person:person(s,r).name}));
      return true;
    }
    if (op === 'accede') return FB.governmentRecognition.officerAccede(s,q.owner,r);
    if (op === 'dispute') return FB.governmentRecognition.openOfficeDispute(s,r);
    if (op === 'withdraw') return FB.settleOrdinaryWar(s,m.claim.warId,'white_peace');
    if (op === 'renounce') {
      FB.authorityRecognitionTransition(s,m.claim.recognitionId,'revoke'); m.claim.status = 'failed'; return true;
    }
    return false;
  };
  M.snapshot = function (s,id) {
    var r = row(s,id), t = terms(r);
    return r && t && r.mandate ? {appointment:copy(r),terms:copy(t),favor:M.favor(s,r),
      suspension:M.suspension(s,r),status:Q.appointmentStatus(s,r),forces:M.forces(s,r),
      support:claimSupport(s,r),publicAccount:FB.treasuryPublicAccountSnapshot(s,r.institutionId)} : null;
  };
  M.ai = function (s,rid) {
    var humanCourt = court(s,{kind:'character',id:s.player.charId},rid);
    rows(s).slice().forEach(function (r) {
      if (!r.mandate || r.institutionId !== rid) return;
      var actor = r.holder, patron = Q.realmReference(rid), q;
      if (!humanCourt && r.mandate.proposal && r.mandate.proposal.status === 'pending') {
        q = M.review(s,patron,r.id,'accept_proposal'); if (q.allowed) M.commit(s,q);
      }
      if (!humanCourt && M.favor(s,r) < terms(r).favor.minimum) {
        q = M.review(s,patron,r.id,'dismiss'); if (q.allowed && !court(s,{kind:'character',id:s.player.charId},rid)) M.commit(s,q);
      }
      if (r.holder.id === s.player.charId) return;
      Q.contracts(s,rid).filter(function (c) { return c.status === 'offered'; }).some(function (c) {
        q = M.review(s,actor,r.id,'consent',{contractId:c.id}); return q.allowed && M.commit(s,q);
      });
      if (!r.mandate.proposal && active(s,r,'propose')) {
        var courts = FB.officeCourts(s).filter(function (c) { return c.id === rid; }), done = false;
        (courts[0] && courts[0].offices || []).some(function (officeId) {
          return FB.officeScopes(s,rid,officeId).some(function (scope) {
            return Object.keys(s.chars).sort().some(function (cid) {
              if (cid === s.player.charId) return false;
              q = M.review(s,actor,r.id,'propose',{target:{officeId:officeId,holderId:cid,scope:scope}});
              if (q.allowed) { done = M.commit(s,q); return done; } return false;
            });
          });
        });
      }
      if (r.status === 'removed' || r.status === 'expired') {
        q = M.review(s,actor,r.id,'accept_loss'); if (q.allowed) M.commit(s,q);
      }
    });
  };
  M.validateState = function (s) {
    var error = null;
    rows(s).forEach(function (r) {
      var t = terms(r), m = r.mandate, path = 'authority.appointments.' + r.id + '.mandate';
      function fail() { error = error || path; }
      if (!t) { if (m !== undefined) fail(); return; }
      var spec = {type:'object',fields:{schema:{type:'integer',value:1},definitionKey:{type:'string',value:JSON.stringify(t)},
        originalInstitutionId:idSpec(),originalGeneration:{type:'integer',min:0,max:r.appointerGeneration},response:{type:'object',test:function (v) {
          return equal(Object.keys(v).sort(),['choice','turn']) && v.choice === 'accept' && Number.isSafeInteger(v.turn) && v.turn >= r.startTurn && v.turn <= s.turn;
        }},proposal:{type:'object'},claim:{type:'object'}}};
      // Null denotes an unspent optional intent, never a missing binding.
      var shell = m && copy(m);
      if (shell) ['response','proposal','claim'].forEach(function (k) { if (shell[k] === null) { delete shell[k]; spec.fields[k].optional = 'absent'; } });
      if (!m || !own(m,'response') || !own(m,'proposal') || !own(m,'claim') ||
          !FB.schema.valid(shell,spec) || !M.institutionMatches(s,m.originalInstitutionId,r.institutionId) ||
          r.holder.kind !== 'character' || !s.chars[r.holder.id] ||
          !Number.isSafeInteger(r.endTurn) || r.endTurn > r.startTurn + t.tenureDays) { fail(); return; }
      var p = m.proposal;
      if (p && (!FB.schema.valid(p,{type:'object',fields:{target:targetSpec,generation:{type:'integer',min:0},
        turn:{type:'integer',min:r.startTurn,max:s.turn},status:{type:'string',enum:['pending','accepted','rejected']},
        appointmentId:{type:'string',optional:'absent',minLength:1,maxLength:200}}}) ||
        !s.chars[p.target.holderId] || p.target.holderId === r.holder.id ||
        (p.status === 'accepted' ? !row(s,p.appointmentId) || !equal(row(s,p.appointmentId).holder,{kind:'character',id:p.target.holderId}) ||
          row(s,p.appointmentId).officeId !== p.target.officeId || !equal(row(s,p.appointmentId).scope,p.target.scope) : own(p,'appointmentId')))) fail();
      var c = m.claim, a = t.acclamation;
      if (c) {
        if (!a || !FB.schema.valid(c,{type:'object',fields:{appointmentId:idSpec(),recognitionId:idSpec(),
          generation:{type:'integer',min:0},turn:{type:'integer',min:r.startTurn,max:s.turn},
          status:{type:'string',enum:['claimed','disputed','succeeded','failed']},
          warId:{test:function (v) { return v === null || typeof v === 'string'; }},
          factionId:{test:function (v) { return v === null || typeof v === 'string'; }},
          currentCourtId:idSpec(),forces:{type:'array',maxItems:9,uniqueBy:['hostId'],items:{type:'object',fields:{hostId:idSpec(),realmId:idSpec()}}}}}) ||
          !row(s,c.appointmentId) || row(s,c.appointmentId).officeId !== a.officeId ||
          !M.institutionMatches(s,row(s,c.appointmentId).institutionId,r.institutionId) ||
          !equal(row(s,c.appointmentId).scope,Q.realmReference(row(s,c.appointmentId).institutionId)) ||
          !equal(row(s,c.appointmentId).holder,r.holder) || row(s,c.appointmentId).recognitionId !== c.recognitionId ||
          !s.realms[c.currentCourtId] || c.factionId && !s.realms[c.factionId] ||
          c.status === 'claimed' && (c.warId !== null || c.factionId !== null || c.forces.length) ||
          ['disputed','succeeded'].indexOf(c.status) >= 0 && r.status !== 'removed' ||
          c.status === 'disputed' && (!c.warId || !FB.ordinaryWarById(s,c.warId)) ||
          c.forces.some(function (f) { return !s.realms[f.realmId] && !M.institutionMatches(s,f.realmId,r.institutionId) ||
            [r.scope.id].concat(t.hostIds || []).indexOf(f.hostId) < 0; })) fail();
        var proof = (s.authority.recognitions || []).filter(function (p) { return p.id === c.recognitionId; })[0];
        if (!a || !proof || proof.source !== a.sourceId || !equal(proof.subject,r.holder) || proof.issuer.kind !== 'host' ||
            [r.scope.id].concat(t.hostIds || []).indexOf(proof.issuer.id) < 0 ||
            !row(s,c.appointmentId) || !equal(proof.scope,row(s,c.appointmentId).scope) ||
            !M.institutionMatches(s,m.originalInstitutionId,row(s,c.appointmentId).institutionId)) fail();
        if (c.status === 'disputed') {
          var war = c.warId && FB.ordinaryWarById(s,c.warId), faction = s.realms[c.factionId];
          if (!c.forces.length || c.factionId !== 'office_dispute_' + r.id || !faction ||
              faction.alive === false || !faction.rebelFaction || !faction.nonTerritorial || !war ||
              war.attacker !== c.factionId || war.defender !== r.institutionId ||
              !war.casus || war.casus.type !== 'office_acclamation') fail();
        }
      }
    });
    return error;
  };
  var priorReferences = FB.publicAdministrationReferencesCharacter;
  FB.publicAdministrationReferencesCharacter = function (s,cid) {
    return !!(priorReferences && priorReferences(s,cid)) || rows(s).some(function (r) {
      return r.mandate && (r.holder.id === cid || r.mandate.proposal && r.mandate.proposal.target.holderId === cid);
    });
  };
})();
