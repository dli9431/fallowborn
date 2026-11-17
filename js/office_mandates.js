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
    else if (!serviceEnabled(s,r.institutionId)) q.reason = FB.T('This court’s office system is disabled.');
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
  /* Story and event projections select existing appointments; only their
     canonical owners can grant, exercise or end an office. */
  var storyInputs = {
    petition:{hostId:{type:'string',optional:'absent',minLength:1,maxLength:200}},
    command:{destination:{type:'string',optional:'absent',minLength:1,maxLength:200}},
    consent:{templateId:idSpec('federateContractTerms')},
    confirm:{}, accept_loss:{}, dismiss:{}, acclaim:{}, renounce:{}
  };
  M.storySpec = {type:'object',fields:{realmId:{type:'string',optional:'absent',minLength:1,maxLength:200},officeId:idSpec('authorityOffices'),
    action:{enum:Object.keys(storyInputs)},input:{type:'object'}},test:function (a,c) {
    var data = c.data || FBDATA, d = data.authorityOffices[a.officeId];
    if (!d || !d.mandate || !FB.schema.valid(a.input,{type:'object',fields:storyInputs[a.action] || {}},{data:data})) return false;
    if (a.action === 'petition') return !!d.appointment && d.scopes.indexOf('host') >= 0;
    if (a.action === 'command') return d.mandate.powers.indexOf('command') >= 0;
    if (a.action === 'consent') return d.mandate.contractTemplates.indexOf(a.input.templateId) >= 0;
    if (a.action === 'acclaim' || a.action === 'renounce') return !!d.mandate.acclamation;
    return true;
  }};
  M.storyFaults = function (a,bm) {
    var faults = FB.schema.faults(a,M.storySpec,'officeMandates.service');
    if (faults.length) return faults;
    if (bm && (!a.realmId || !(bm.realms || []).some(function (r) {return r.id === a.realmId;}))) faults.push('service.realmId');
    if (bm && a.action === 'command' && a.input.destination && !(bm.provinces || []).some(function (p) {
      return p.id === a.input.destination && !p.wasteland;
    })) faults.push('service.input.destination');
    return faults;
  };
  M.storyRow = function (s,a,cid,id,other) {
    return rows(s).filter(function (r) {
      return r.mandate && r.officeId === a.officeId && M.institutionMatches(s,a.realmId || FB.officeEventReviews.court(s),r.institutionId) &&
        r.holder.kind === 'character' && (!cid || (other ? r.holder.id !== cid : r.holder.id === cid)) && (!id || r.id === id) &&
        (!other || id || ['removed','expired'].indexOf(Q.appointmentStatus(s,r)) < 0);
    }).slice(-1)[0] || null;
  };
  function serviceEnabled(s,rid) {
    return FB.courtOfficeSystemEnabled(s,rid);
  }
  M.storyReview = function (s,a,cid,id) {
    var actor = {kind:'character',id:cid}, rid = a.realmId ? FB.startRealmId(s,a.realmId) : FB.officeEventReviews.court(s),
      r = M.storyRow(s,a,cid,id,a.action === 'dismiss'), q = null;
    if (r && a.action !== 'petition') rid = r.institutionId;
    if (!M.storyFaults(a).length && serviceEnabled(s,rid)) {
      if (a.action === 'petition') {
        var scopes = FB.administrationProfile(s,rid) ? (s.armies || []).filter(function (h) {
          return h.realm === rid && h.men > 0;
        }).map(function (h) {return {kind:'host',id:h.id};}) : FB.officeScopes(s,rid,a.officeId);
        scopes = scopes.filter(function (at) {return at.kind === 'host' && (!a.input.hostId || at.id === a.input.hostId);});
        for (var i=0;i<scopes.length;i++) {
          var at = scopes[i], next = FB.administrationProfile(s,rid) ? FB.publicAppointmentQuote(s,actor,{
            institutionId:rid,officeId:a.officeId,holderId:cid,provinceId:s.player.provinceId,scope:at}) :
            FB.officeAppointmentQuote(s,actor,{institutionId:rid,officeId:a.officeId,holder:actor,scope:at});
          if (!q || next && next.allowed) q = next;
          if (q && q.allowed) break;
        }
      } else if (r) {
        var input = {}, h = host(s,r.scope.id);
        if (a.action === 'command') input = {hostId:r.scope.id,destination:a.input.destination || h && h.at || ''};
        if (a.action === 'acclaim') input = {hostId:r.scope.id};
        if (a.action === 'consent') {
          var offer = Q.contracts(s,rid).filter(function (c) {return c.patronRealmId === rid && c.templateId === a.input.templateId &&
            c.status === 'offered' && c.approvals[c.federateRealmId] === FB.realmRulerGeneration(s,c.federateRealmId);})[0];
          input = {contractId:offer && offer.id || ''};
        }
        q = M.review(s,actor,r.id,a.action,input);
      }
    }
    var ended = a.action !== 'accept_loss' || r && ['removed','expired'].indexOf(Q.appointmentStatus(s,r)) >= 0;
    return {allowed:!!(q && q.allowed && ended),reason:!ended ? FB.T('Acceptance requires an actual dismissal or expired term, not a suspended warrant.') :
      q && q.reason || FB.T('A living court, available host and current personal mandate are required.'),
      action:a.action,appointmentId:r && r.id || null,quote:q};
  };
  M.storyCommit = function (s,a,cid,id,reviewed) {
    var q = M.storyReview(s,a,cid,id);
    if (!reviewed || !q.allowed || !equal(q,reviewed)) return false;
    return a.action === 'petition' ? q.quote.input ? FB.publicAppoint(s,q.quote) : FB.officeSeekAppointment(s,q.quote) : M.commit(s,q.quote);
  };
  M.storyEvidence = function (q,result) {
    var e = {appointmentId:q.action === 'petition' ? result.id : q.appointmentId,action:q.action};
    if (q.action === 'consent') e.contractId = q.quote.input.contractId;
    return e;
  };
  M.storyEvidenceValid = function (s,e,a,cid,turn) {
    var fields = {appointmentId:idSpec(),action:{value:a.action}};
    if (a.action === 'consent') fields.contractId = idSpec();
    if (!FB.schema.valid(e,{type:'object',fields:fields})) return false;
    if (!s) return true;
    var r = M.storyRow(s,a,cid,e.appointmentId,a.action === 'dismiss');
    if (!r || !s.chars[cid] || r.startTurn > turn) return false;
    if (a.action === 'petition') return r.startTurn === turn;
    if (a.action === 'dismiss') return r.status === 'removed' && r.changedTurn === turn;
    if (a.action === 'accept_loss') return !!r.mandate.response && r.mandate.response.choice === 'accept' && r.mandate.response.turn === turn &&
      (r.status === 'removed' && r.changedTurn <= turn || r.endTurn <= turn);
    if (a.action === 'acclaim') return !!r.mandate.claim && r.mandate.claim.turn === turn;
    if (a.action === 'renounce') return !!r.mandate.claim && r.mandate.claim.status === 'failed';
    if (a.action === 'consent') {
      var c = Q.contract(s,e.contractId);
      return !!c && M.institutionMatches(s,a.realmId,c.patronRealmId) && c.publicPayer === true &&
        c.templateId === a.input.templateId && Number.isSafeInteger(c.initialPaidTurn) && c.initialPaidTurn <= turn;
    }
    return true;
  };
  M.storyDetails = function (s,a,q) {
    var r = q.appointmentId && row(s,q.appointmentId), d = FBDATA.authorityOffices[a.officeId], m = d.mandate;
    var rid = r ? r.institutionId : a.realmId ? FB.startRealmId(s,a.realmId) : FB.officeEventReviews.court(s), account = FB.treasuryPublicAccountSnapshot(s,rid);
    var input = q.quote && (q.quote.terms || q.quote.input), at = r ? r.scope : input && input.scope,
      force = at && at.kind === 'host' && host(s,at.id), destination = q.quote && q.quote.input && q.quote.input.destination;
    var lines = [FB.officeText(s,a.officeId,'name'),FB.officeText(s,a.officeId,'desc'),
      FB.T('Court: {court}.',{court:s.realms[rid] && s.realms[rid].name || ''}),
      a.action === 'consent' ? FB.T('Public funds required for initial payment and one seasonal reserve: {money:cost}.',{cost:q.quote && q.quote.cost || 0}) :
        FB.T('Payment on confirmation: {money:cost}.',{cost:q.quote && q.quote.cost || 0}),
      a.action === 'petition' ? q.quote && q.quote.input ? FB.T('The public treasury pays the appointment fee; salary and service use the existing source receipts.') :
        FB.T('The applicant pays the registration fee once. This is a scoped appointment, not a grant of land.') :
        FB.T('The original appointment and its living holder retain their canonical authority checks.'),
      FB.T('Public account: {money:gold}. Private household money remains separate.',{gold:account ? account.available : 0}),
      FB.T('Required court Standing: {favor}. Maximum term: {days} days.',{favor:m.favor.minimum,days:m.tenureDays}),
      FB.T('Dismissal and expiry end delegated powers. Accepted public obligations remain with the court. Acceptance of loss restores no authority.'),
      q.allowed ? FB.T('Cancel leaves the decision, money and mandate unchanged.') : q.reason];
    if (a.action === 'consent' && q.quote && q.quote.owner) {
      lines.push(FB.T('Service counterparty: {court}.',{court:s.realms[q.quote.owner.federateRealmId] && s.realms[q.quote.owner.federateRealmId].name || ''}));
      lines.push(FB.T('Court payment now: {money:initial}. Seasonal obligation: {money:season}. Term: {days} days. The other court has already consented.',{
        initial:q.quote.owner.initialPaidTurn === undefined ? q.quote.owner.initialPay || 0 : 0,
        season:q.quote.owner.payPerSeason,days:Math.max(0,q.quote.owner.endTurn-s.turn)}));
    }
    if (d.appointment) lines.push(FB.T('Qualification: {skill} {minimum}; retained prestige {prestige}.',{
      skill:FB.T(FB.SKILL_NAMES[d.appointment.skill]),minimum:d.appointment.minimum,prestige:d.appointment.prestige}));
    if (force) lines.push(FB.T('Commissioned force: {men} soldiers at {place}. Ownership and supplies remain with the existing host.',{
      men:force.men,place:FB.world.byId[force.at] && FB.world.byId[force.at].name || ''}));
    if (destination) lines.push(FB.T('Destination: {place}.',{place:FB.world.byId[destination] && FB.world.byId[destination].name || ''}));
    return lines;
  };
  FB.eventReviews.register('mandate_service',{owner:'authority',args:M.storySpec,partySlots:{official:true},
    bind:function (s,a) {
      var r = M.storyRow(s,a,s.player.charId,null,a.action === 'dismiss');
      if (a.action !== 'petition' && !r) return null;
      return {participants:{official:r ? r.holder.id : s.player.charId},serviceAppointmentId:r ? r.id : null,
        serviceCourtId:FB.officeEventReviews.court(s),serviceProvinceId:s.player.provinceId};
    },quote:function (s,a,ctx) {
      var r = ctx.serviceAppointmentId && row(s,ctx.serviceAppointmentId);
      if (!own(ctx,'serviceAppointmentId') || ctx.serviceCourtId !== FB.officeEventReviews.court(s) ||
          ctx.serviceProvinceId !== s.player.provinceId || !ctx.participants ||
          ctx.participants.official !== (a.action === 'petition' ? s.player.charId : r && r.holder.id)) return null;
      return M.storyReview(s,a,s.player.charId,ctx.serviceAppointmentId);
    },apply:function (s,a,q) {return M.storyCommit(s,a,s.player.charId,q.appointmentId,q);},
    details:M.storyDetails
  });
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
