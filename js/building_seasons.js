/* Finite seasonal commitments over the existing resource, building and material owners. */
(function () {
  'use strict';
  var S = FB.buildingSeasons = {}, LIMIT = 1024;
  var fields = ['tax','piety','research','populationCapacity','populationFamineProtection','populationCrisisProtection','migrationAttraction'];
  function own(o,k) { return Object.prototype.hasOwnProperty.call(o || {},k); }
  function obj(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function keys(o,list) { return obj(o) && Object.keys(o).length === list.length && list.every(function(k){return own(o,k);}); }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  function eq(a,b) { return JSON.stringify(a) === JSON.stringify(b); }
  function int(n,lo,hi) { return Number.isSafeInteger(n) && n >= lo && n <= hi; }
  function id(v) { return typeof v === 'string' && /^[a-z][a-z0-9_]{0,79}$/.test(v) && ['constructor','prototype','__proto__'].indexOf(v)<0; }
  function actor(a) { return keys(a,['kind','id']) && ['realm','character'].indexOf(a.kind)>=0 && typeof a.id==='string'; }
  S.catalogFaults = function(c) {
    var errors=[],table=c.buildingSeasonProfiles;
    if (!obj(table) || Object.keys(table).length>128) return ['buildingSeasonProfiles requires at most 128 policies.'];
    Object.keys(table).forEach(function(key){
      var p=table[key],seen={};
      if (!id(key) || !keys(p,['seasonKinds','periodDays','maxDays','care','stockLives','benefit']) ||
          !Array.isArray(p.seasonKinds) || !p.seasonKinds.length || p.seasonKinds.length>16 ||
          new Set(p.seasonKinds).size!==p.seasonKinds.length || p.seasonKinds.some(function(k){return !own(c.seasonKinds,k);}) ||
          !int(p.periodDays,1,90) || !int(p.maxDays,1,p.periodDays) || typeof p.care!=='boolean' ||
          !Array.isArray(p.stockLives) || p.stockLives.length>8 || p.stockLives.some(function(l){
            if (!keys(l,['goodId','days']) || !own(c.productionGoods,l.goodId) || seen[l.goodId] || !int(l.days,1,360)) return true;
            seen[l.goodId]=true;return false;
          }) || p.benefit!==null && (!keys(p.benefit,['goodId','quantity','effect','days']) ||
            !seen[p.benefit.goodId] || !int(p.benefit.quantity,1,10000) || fields.indexOf(p.benefit.effect)<0 || !int(p.benefit.days,1,90)))
        errors.push('buildingSeasonProfiles.'+key+': invalid season, bounded term, lifetime or existing-field benefit.');
    });
    return errors;
  };
  S.compilePrepared = function(bm) {
    var out={assignments:[],errors:S.catalogFaults(FBDATA)},rows=bm && bm.buildingSeasonAssignments;
    if (rows===undefined || out.errors.length) return out;
    function fail(){out.errors.push('buildingSeasonAssignments: invalid physical consumer, resource or seasonal policy.');}
    if (!Array.isArray(rows) || rows.length>128) {fail();return out;}
    var water=FB.buildingOperations.compilePrepared(bm),production=FB.production.compilePrepared(bm),resources=FB.siteResources.compilePrepared(bm);
    out.errors=out.errors.concat(water.errors,production.errors,resources.errors);
    var seen={},assets={};
    rows.forEach(function(a){
      if (!keys(a,['id','profileId','operationId','productionSiteId','resources']) || !id(a.id) || seen[a.id] || !id(a.profileId) ||
          (a.operationId===null ? !id(a.productionSiteId) : !id(a.operationId) || a.productionSiteId!==null) ||
          !Array.isArray(a.resources) || a.resources.length>8) {fail();return;}
      seen[a.id]=true;
      var p=FBDATA.buildingSeasonProfiles[a.profileId],consumer=a.operationId===null ? production.sites.find(function(x){return x.id===a.productionSiteId;}) : water.assignments.find(function(x){return x.id===a.operationId;});
      var physical=consumer && JSON.stringify([consumer.countyId,consumer.siteId,consumer.buildingId]),rs={};
      if (!p || !consumer || assets[physical]) {fail();return;}
      assets[physical]=true;
      var d=FBDATA.buildings[consumer.buildingId];
      if (a.productionSiteId!==null && p.benefit===null && fields.some(function(k){return !!d[k];})) {fail();return;}
      if (a.operationId!==null ? p.benefit!==null || p.stockLives.length : p.benefit &&
          (!(d[p.benefit.effect]>0) || d.operationProfile || d.dev || d.pop || d.prestige || d.levy || d.retinue || d.archers || d.defense || d.siege || d.communityFaithPressure ||
            fields.some(function(k){return d[k] && k!==p.benefit.effect;}))) {fail();return;}
      if (p.stockLives.some(function(l){return !consumer.openingLots || !consumer.openingLots.some(function(g){return g.goodId===l.goodId;}) &&
          !consumer.recipeIds.some(function(k){return FBDATA.productionRecipes[k].outputs.some(function(g){return g.goodId===l.goodId;});}) &&
          !(bm.productionExchangeAssignments || []).some(function(x){return x.toSiteId===consumer.id && FBDATA.productionExchangeProfiles[x.profileId].goodId===l.goodId;}) &&
          !(bm.productionProducerAssignments || []).some(function(x){return x.siteId===consumer.id && FBDATA.productionProducerProfiles[x.profileId].goodId===l.goodId;});})) {fail();return;}
      if (a.resources.some(function(r){
        var source=r && resources.sources.find(function(x){return x.id===r.sourceId;});
        if (!keys(r,['sourceId','amount']) || !source || rs[r.sourceId] || !int(r.amount,1,source.profile.capacity) ||
            source.countyId!==consumer.countyId || source.siteId!==consumer.siteId || ['water','grazing'].indexOf(source.profile.unit)<0) return true;
        rs[r.sourceId]=true;return false;
      })) {fail();return;}
      out.assignments.push(Object.assign(copy(a),{countyId:consumer.countyId,siteId:consumer.siteId,buildingId:consumer.buildingId,slot:consumer.slot,profile:copy(p)}));
    });
    if (out.errors.length) out.assignments=[];
    return out;
  };
  S.compile=function(bm){return FB.compileBuildingSeasons(bm);};
  var cache=null;
  function plan(s) {
    var bm=FB.campaignBookmark(s),raw=FBDATA.bookmarks[bm.id],sig=FB.mods.sig();
    if (!cache || cache.raw!==raw || cache.revision!==bm.revision || cache.sig!==sig)
      cache={raw:raw,revision:bm.revision,sig:sig,value:S.compile(bm)};
    return cache.value;
  }
  function definition(s) {
    var p=plan(s);
    if (!cache.definition) cache.definition=FB.mods.fingerprint(p.assignments.map(function(a){return [a,fields.map(function(k){return FBDATA.buildings[a.buildingId][k] || 0;})];}));
    return cache.definition;
  }
  function blank(s) {return {version:1,definition:definition(s),revision:0,terms:[],debits:[]};}
  function building(s,a) {return (s.buildings[a.countyId] || []).find(function(b){return b.id===a.buildingId && b.s===a.slot;});}
  function identity(s,a,who) {
    var person=actor(who) && FB.political.actor(s,who),c=person && s.chars[person.characterId],b=building(s,a);
    if (!c || c.dead || c.captive || c.imprisoned || c.prisonerOf || c.exiled || c.unfree || FB.ageOf(c,s.date.year)<16 ||
        FB.justiceCustodyOf(s,c.id) || c.id===s.player.charId && (s.player.dead || s.player.flags.in_prison) ||
        !b || b.ruined || !FB.settlementConstructionAuthority(s,a.countyId,a.slot,who).direct ||
        FB.recruitmentCountyBlocked(s,s.holder[a.countyId] || s.owner[a.countyId],a.countyId) ||
        b.institutionBinding && !FB.buildingInstitutionOperating(s,a.countyId,b)) return null;
    if (a.profile.care && (FB.characterLocation(s,c)!==a.countyId || c.armyId || c.war ||
        c.id===s.player.charId && (s.player.travel || s.player.war || (FB.householdServiceRecord && FB.householdServiceRecord(s))) ||
        (s.player.enterpriseLabor || []).some(function(x){return x.charId===c.id;}) ||
        Object.keys(s.player.familyOffices || {}).some(function(k){return s.player.familyOffices[k]===c.id;}) ||
        (s.player.enterprises || []).some(function(e){return FB.enterpriseWorkerIds(e).indexOf(c.id)>=0;}))) return null;
    var stamp=a.operationId!==null ? b.waterOperation : b.productionAsset;
    if (stamp && (a.operationId!==null ? stamp.assignmentId!==a.operationId : !s.production || !s.production.assets.some(function(x){return x.id===stamp.id && x.siteId===a.productionSiteId && eq(x.owner,who);}))) return null;
    return stamp ? {characterId:c.id,generation:who.kind==='realm' ? person.rulerGeneration : null,assetId:stamp.id} : null;
  }
  function term(s,a) {return s.buildingSeasons && s.buildingSeasons.terms.filter(function(t){return t.assignmentId===a.id;}).slice(-1)[0];}
  function live(s,a,t) {
    if (!t || t.endedTurn!==null || s.turn<t.turn || s.turn>=t.untilTurn || a.profile.seasonKinds.indexOf(FB.localSeason(s,a.countyId))<0 ||
        !eq(identity(s,a,t.actor),{characterId:t.characterId,generation:t.generation,assetId:t.assetId})) return false;
    var rows=FB.siteResources.snapshot(s,null,null,t.actor);
    return t.resources.every(function(r){var row=rows.find(function(x){return x.id===r.sourceId;});
      // Consumed capacity need not be available a second time, but rights and period must remain current.
      return row && row.period===r.period && row.allowed;
    });
  }
  function assignment(s,key,value) {return plan(s).assignments.find(function(a){return a[key]===value;});}
  S.hasCounty=function(s,pid) {return plan(s).assignments.some(function(a){return a.countyId===pid;});};
  S.hasOperation=function(s,operationId) {return !!assignment(s,'operationId',operationId);};
  S.ready=function(s,key,value,who) {
    var a=assignment(s,key,value);if (!a) return true;
    var t=term(s,a);return live(s,a,t) && eq(t.actor,who);
  };
  S.until=function(s,key,value) {var a=assignment(s,key,value),t=a && term(s,a);return t ? t.untilTurn : Infinity;};
  S.prospective=function(s,operationId) {
    var a=assignment(s,'operationId',operationId);
    return !a || a.profile.seasonKinds.indexOf(FB.localSeason(s,a.countyId))>=0;
  };
  function life(s,lot,path) {
    if (!plan(s).assignments.length) return null;
    path=path || [];
    if (!lot || path.length>=512 || path.indexOf(lot.id)>=0) throw new Error(FB.T('Invalid saved seasonal stock provenance.'));
    var asset=s.production && s.production.assets.find(function(x){return x.id===lot.assetId;}),a=asset && assignment(s,'productionSiteId',asset.siteId);
    var l=a && a.profile.stockLives.find(function(x){return x.goodId===lot.goodId;});
    var batch=lot.origin.kind==='batch' && s.production.batches.find(function(x){return x.id===lot.origin.batchId;});
    var economic=(s.production.economy && s.production.economy.receipts || []).find(function(x){return x.id===lot.origin.receiptId;});
    var born=lot.origin.kind==='opening' ? asset.openedTurn : batch ? batch.closedTurn : economic && economic.turn;
    var until=l ? born+l.days : Infinity,source=null;
    if (lot.origin.kind==='exchange' && economic) economic.inputs.forEach(function(x){
      var input=s.production.lots.find(function(y){return y.id===x.lotId;}),prior=life(s,input,path.concat([lot.id]));
      if(prior && prior.born+prior.days<until){until=prior.born+prior.days;source=prior;}
    });
    return until===Infinity ? null : {assignment:l ? a : source.assignment,born:born,days:until-born};
  }
  S.lotAvailable=function(s,lot) {var l=life(s,lot);return l && s.turn>=l.born+l.days ? 0 : lot.remaining;};
  S.lotExpiry=function(s,lot) {var l=life(s,lot);return l ? l.born+l.days : Infinity;};
  S.debited=function(s,lotId) {return (s.buildingSeasons && s.buildingSeasons.debits || []).reduce(function(n,d){return n+(d.lotId===lotId ? d.quantity : 0);},0);};
  S.quote=function(s,request) {
    var q={allowed:false,reason:'season',request:obj(request) ? copy(request) : null};
    if (!keys(request,['operation','assignmentId','actor','lotId']) || ['open','allocate'].indexOf(request.operation)<0 || !actor(request.actor)) return q;
    var a=assignment(s,'id',request.assignmentId),r=s.buildingSeasons,person=a && identity(s,a,request.actor);
    if (!a || plan(s).errors.length || !person || a.profile.seasonKinds.indexOf(FB.localSeason(s,a.countyId))<0) return q;
    if (s.production) FB.production.validate(s);
    S.validate(s);
    if (r && (r.revision>=1000000 || r.terms.length>=512 || r.debits.length>=LIMIT)) return q;
    var old=term(s,a),period=Math.floor(s.turn/a.profile.periodDays),until=Math.min((period+1)*a.profile.periodDays,s.turn+a.profile.maxDays,s.turn+91-s.date.day);
    q.reason='period';
    if (request.operation==='open') {
      if (request.lotId!==null || old && old.period>=period) return q;
      var t=Object.assign({},s);if (s.siteResources!==undefined) t.siteResources=copy(s.siteResources);
      var refs=[];q.water=0;q.grazing=0;
      for (var i=0;i<a.resources.length;i++) {
        var req=a.resources[i],row=FB.siteResources.snapshot(t).find(function(x){return x.id===req.sourceId;});
        var review=FB.siteResources.quote(t,{operation:'reserve',sourceId:req.sourceId,actor:request.actor,amount:req.amount});
        var claim=FB.siteResources.commit(t,review);
        q.reason='resources';if (!claim || !row) return q;
        if (!FB.siteResources.commit(t,FB.siteResources.quote(t,{operation:'consume',sourceId:req.sourceId,actor:request.actor,reservationId:claim}))) return q;
        refs.push({sourceId:req.sourceId,period:row.period,claimId:claim,amount:req.amount});
        if(row.unit==='water')q.water+=req.amount;else q.grazing+=req.amount;
        if (row.periodDays) until=Math.min(until,(row.period+1)*row.periodDays);
      }
      q.resources=refs;q.identity=person;q.period=period;q.untilTurn=until;
      q.resourceState=t.siteResources===undefined ? null : t.siteResources;
    } else {
      q.reason='stock';
      var b=a.profile.benefit,lot=s.production && s.production.lots.find(function(x){return x.id===request.lotId;});
      var l=lot && life(s,lot),held=0;
      if (s.production) s.production.batches.forEach(function(batch){if(batch.status==='reserved') batch.inputs.forEach(function(x){if(x.lotId===request.lotId)held+=x.quantity;});});
      if (!b || !l || l.assignment.id!==a.id || lot.goodId!==b.goodId || !eq(lot.owner,request.actor) || !live(s,a,old) || !eq(old.actor,request.actor) ||
          S.lotAvailable(s,lot)-held<b.quantity || (r && r.debits.some(function(d){return d.kind==='allocated' && d.termId===old.id;}))) return q;
      q.termId=old.id;q.quantity=b.quantity;q.untilTurn=Math.min(s.turn+b.days,l.born+l.days,old.untilTurn);
    }
    q.allowed=true;q.reason=null;
    q.signature=JSON.stringify([s.turn,s.date,definition(s),r || null,s.production || null,s.siteResources || null,building(s,a),person,q]);
    return q;
  };
  function apply(s,q,notify) {
    var a=assignment(s,'id',q.request.assignmentId),r=s.buildingSeasons ? copy(s.buildingSeasons) : blank(s);
    if (q.request.operation==='open') {
      r.terms.push({id:r.terms.length+1,assignmentId:a.id,actor:copy(q.request.actor),characterId:q.identity.characterId,generation:q.identity.generation,assetId:q.identity.assetId,
        turn:s.turn,untilTurn:q.untilTurn,period:q.period,endedTurn:null,resources:copy(q.resources)});
      if (q.resourceState!==null) s.siteResources=copy(q.resourceState);
    } else {
      s.production.lots.find(function(l){return l.id===q.request.lotId;}).remaining-=q.quantity;
      r.debits.push({kind:'allocated',assignmentId:a.id,lotId:q.request.lotId,quantity:q.quantity,turn:s.turn,termId:q.termId,untilTurn:q.untilTurn});
    }
    r.revision++;s.buildingSeasons=r;if(notify)FB.invalidateBuildingIndex(s,a.countyId);return true;
  }
  S.commit=function(s,review) {
    if (!review || !review.allowed) return false;
    var q=S.quote(s,review.request);if (!q.allowed || !eq(q,review)) return false;
    return apply(s,q,true);
  };
  S.effects=function(s,pid,b,base) {
    var a=plan(s).assignments.find(function(x){return x.countyId===pid && x.slot===b.s && x.buildingId===b.id &&
      (x.operationId===null || b.waterOperation && b.waterOperation.assignmentId===x.operationId);});
    if (!a) return base;
    var out=Object.assign({},base),t=term(s,a),on=live(s,a,t),benefit=a.profile.benefit;
    if (benefit) on=on && !!(s.buildingSeasons.debits.find(function(d){return d.kind==='allocated' && d.termId===t.id && d.untilTurn>s.turn;}));
    fields.forEach(function(k){if (!on || benefit && benefit.effect!==k) out[k]=0;});
    return out;
  };
  S.boundary=function(s) {
    if (!plan(s).assignments.length) return 0;
    var changed=0,r=s.buildingSeasons;
    if (r) r.terms.forEach(function(t){var a=assignment(s,'id',t.assignmentId);if(t.endedTurn===null && !live(s,a,t)) {
      t.endedTurn=Math.min(s.turn,t.untilTurn);r.revision++;changed++;FB.invalidateBuildingIndex(s,a.countyId);
    }});
    (s.production && s.production.lots || []).forEach(function(lot){
      var l=life(s,lot);if(!l || s.turn<l.born+l.days || !lot.remaining)return;
      if (!r) {r=blank(s);s.buildingSeasons=r;}
      // One loss receipt per lot; reserved work closes through the material owner before stock is lost.
      if (r.debits.length>=LIMIT || r.revision>=1000000) return;
      s.production.batches.forEach(function(b){if(b.status==='reserved' && b.inputs.some(function(x){return x.lotId===lot.id;})) FB.production.expireSeasonalBatch(s,b.id);});
      r.debits.push({kind:'expired',assignmentId:l.assignment.id,lotId:lot.id,quantity:lot.remaining,turn:l.born+l.days,termId:null,untilTurn:null});
      lot.remaining=0;r.revision++;changed++;
    });
    return changed;
  };
  S.runAI=function(s) {
    var count=0;
    plan(s).assignments.forEach(function(a){
      if (count>=32)return;
      var who=FB.settlementHolder(s,a.countyId,a.slot);
      if(!who || who.id==='player' || who.kind==='character' && who.id===s.player.charId)return;
      var review=S.quote(s,{operation:'open',assignmentId:a.id,actor:who,lotId:null});
      if (review.allowed) {
        var preview=copy(s);apply(preview,review,false);
        var useful=a.operationId!==null ? FB.buildingOperations.quote(preview,{countyId:a.countyId,settlement:a.slot,buildingId:a.buildingId,actor:who}).allowed :
          FB.production.snapshot(preview,a.countyId,a.siteId).some(function(row){return row.site.id===a.productionSiteId && row.site.recipeIds.some(function(recipeId){
            return FB.production.aiQuote(preview,row.site.id,'reserve',{recipeId:recipeId,disposition:'store'}).allowed;
          }) || row.lots.some(function(l){return S.quote(preview,{operation:'allocate',assignmentId:a.id,actor:who,lotId:l.id}).allowed;});});
        if (useful && S.commit(s,review)) count++;
      }
      if (a.profile.benefit && s.production) s.production.lots.some(function(l){return S.commit(s,S.quote(s,{operation:'allocate',assignmentId:a.id,actor:who,lotId:l.id}));});
    });
    return count;
  };
  S.dayAI=function(s) {
    var due=plan(s).assignments.some(function(a){return s.turn===1 || s.date.day===1 || s.turn%a.profile.periodDays===0;});
    if(!due)return 0;
    return S.runAI(s)+FB.buildingOperations.runAI(s,true);
  };
  S.snapshot=function(s,pid,slot) {
    return plan(s).assignments.filter(function(a){return a.countyId===pid && a.slot===slot;}).map(function(a){return {assignment:copy(a),term:term(s,a) ? copy(term(s,a)) : null};});
  };
  S.referencesCharacter=function(s,cid) {return !!s.buildingSeasons && s.buildingSeasons.terms.some(function(t){return t.characterId===cid;});};
  S.reason=function(q) {
    if(q.allowed && q.request.operation==='open') return FB.T('Commit a local window through day {day}, consuming {water} water units and {grazing} grazing places once. No gold payment, output or benefit; ordinary paid work and service are still required.',{day:q.untilTurn,water:q.water,grazing:q.grazing});
    if(q.allowed) return FB.T('Commit {n} owned stock units once, through day {day}. Committed stock cannot be sold or used again.',{n:q.quantity,day:q.untilTurn});
    if(q.reason==='stock') return FB.T('A live local term and enough owned, unreserved, unexpired stock are required. Each term accepts one benefit allocation.');
    if(q.reason==='resources') return FB.T('The actual site needs lawful, finite seasonal water or grazing capacity.');
    if(q.reason==='period') return FB.T('This asset already committed its current operating period.');
    return FB.T('The local season, standing asset, original authority and required local care must all be available.');
  };
  S.validate=function(s) {
    function fail(){throw new Error(FB.T('Invalid saved seasonal building commitment.'));}
    var r=s.buildingSeasons;
    if(r===undefined) {
      if ((s.production && s.production.batches || []).some(function(b){return !!assignment(s,'productionSiteId',b.siteId);}) ||
          Object.keys(s.buildingOperations && s.buildingOperations.receipts || {}).some(function(k){return !!assignment(s,'operationId',s.buildingOperations.receipts[k].assignmentId);})) fail();
      return true;
    }
    if (!keys(r,['version','definition','revision','terms','debits']) || r.version!==1 || r.definition!==definition(s) ||
        !int(r.revision,0,1000000) || !Array.isArray(r.terms) || r.terms.length>512 || !Array.isArray(r.debits) || r.debits.length>LIMIT || plan(s).errors.length) fail();
    var terms={},periods={},losses={},allocated={},sum={},consumed={},resourceIds={};
    var resources=FB.siteResources.compile(FB.campaignBookmark(s)),production=FB.production.compile(FB.campaignBookmark(s));
    Object.keys(s.siteResources && s.siteResources.sources || {}).forEach(function(k){s.siteResources.sources[k].reservations.forEach(function(c){resourceIds[c.id]=true;});});
    (s.production && s.production.batches || []).forEach(function(b){if(b.waterClaimId!==null)resourceIds[b.waterClaimId]=true;});
    r.terms.forEach(function(t,i){
      var a=t && assignment(s,'id',t.assignmentId),person=t && s.chars[t.characterId];
      if (!a || !keys(t,['id','assignmentId','actor','characterId','generation','assetId','turn','untilTurn','period','endedTurn','resources']) || t.id!==i+1 || !actor(t.actor) ||
          !person || (t.actor.kind==='realm' ? !own(s.realms,t.actor.id) || !int(t.generation,0,FB.realmRulerGeneration(s,t.actor.id)) : t.actor.id!==t.characterId || t.generation!==null) ||
          !int(t.turn,0,s.turn) || !int(t.untilTurn,t.turn+1,t.turn+a.profile.maxDays) || t.period!==Math.floor(t.turn/a.profile.periodDays) || t.untilTurn>(t.period+1)*a.profile.periodDays ||
          t.endedTurn!==null && !int(t.endedTurn,t.turn,Math.min(s.turn,t.untilTurn)) || own(periods,a.id) && periods[a.id]>=t.period ||
          !Array.isArray(t.resources) || t.resources.length!==a.resources.length) fail();
      periods[a.id]=t.period;terms[t.id]=t;
      var elapsed=s.turn-t.turn,day=((s.date.day-1-elapsed)%90+90)%90+1;
      var calendar=Math.floor((s.date.season*90+s.date.day-1-elapsed)/90);
      if (t.untilTurn>t.turn+91-day || a.profile.seasonKinds.indexOf(FB.seasonKindAt(a.countyId,calendar,FB.campaignBookmark(s)))<0 ||
          (a.operationId!==null ? !id(t.assetId) : !s.production || !s.production.assets.some(function(x){return x.id===t.assetId && x.siteId===a.productionSiteId && eq(x.owner,t.actor);}))) fail();
      t.resources.forEach(function(v,j){
        var source=v && resources.sources.find(function(x){return x.id===v.sourceId;}),saved=source && s.siteResources && s.siteResources.sources[v.sourceId];
        if(!keys(v,['sourceId','period','claimId','amount']) || !source || !saved || v.sourceId!==a.resources[j].sourceId || v.amount!==a.resources[j].amount ||
            !int(v.claimId,1,s.siteResources.nextId-1) || resourceIds[v.claimId] ||
            (source.profile.kind==='storage' ? v.period!==null : v.period!==Math.floor(t.turn/source.profile.periodDays) || saved.period<v.period || t.untilTurn>(v.period+1)*source.profile.periodDays)) fail();
        resourceIds[v.claimId]=true;
        if(saved.period===v.period && source.profile.kind!=='storage') consumed[v.sourceId]=(consumed[v.sourceId] || 0)+v.amount;
      });
    });
    r.debits.forEach(function(d){
      var lot=d && s.production && s.production.lots.find(function(x){return x.id===d.lotId;}),l=lot && life(s,lot),t=d && terms[d.termId],a=l && l.assignment;
      if(!keys(d,['kind','assignmentId','lotId','quantity','turn','termId','untilTurn']) || !l || d.assignmentId!==a.id || !int(d.quantity,1,lot.quantity) || !int(d.turn,l.born,s.turn))fail();
      if(d.kind==='expired') {
        if(d.turn!==l.born+l.days || d.termId!==null || d.untilTurn!==null || losses[d.lotId] || lot.remaining!==0)fail();losses[d.lotId]=true;
      } else if(d.kind==='allocated') {
        var b=a.profile.benefit;
        if(!b || !t || t.assignmentId!==a.id || !eq(t.actor,lot.owner) || lot.goodId!==b.goodId || d.quantity!==b.quantity || allocated[t.id] ||
            d.turn<t.turn || d.turn>=t.untilTurn || t.endedTurn!==null && d.turn>t.endedTurn || d.turn>=l.born+l.days || d.untilTurn!==Math.min(d.turn+b.days,l.born+l.days,t.untilTurn))fail();
        allocated[t.id]=true;
      } else fail();
      sum[d.lotId]=(sum[d.lotId] || 0)+d.quantity;if(sum[d.lotId]>lot.quantity-lot.remaining)fail();
    });
    if(r.revision!==r.terms.length+r.debits.length+r.terms.filter(function(t){return t.endedTurn!==null;}).length)fail();
    (s.production && s.production.batches || []).forEach(function(b){
      var a=assignment(s,'productionSiteId',b.siteId);if(!a)return;
      var t=r.terms.find(function(t){return t.assignmentId===a.id && t.assetId===b.assetId && eq(t.actor,b.actor) && t.characterId===b.workerId &&
        t.generation===b.generation && t.turn<=b.openedTurn && t.untilTurn>b.openedTurn;});
      if(!t || b.workTurns.some(function(w){return w>=t.untilTurn || t.endedTurn!==null && w>t.endedTurn;}) ||
          b.status==='committed' && (b.closedTurn>=t.untilTurn || t.endedTurn!==null && b.closedTurn>t.endedTurn))fail();
    });
    // Shared water and manufacturing uses count alongside seasonal allocations, never as alternative proofs of the same capacity.
    Object.keys(s.buildingOperations && s.buildingOperations.receipts || {}).forEach(function(k){
      var v=s.buildingOperations.receipts[k];
      var a=assignment(s,'operationId',v.assignmentId);
      if(a && !r.terms.some(function(t){return t.assignmentId===a.id && t.assetId===v.assetId && eq(t.actor,v.actor) &&
        t.characterId===v.authority.characterId && t.generation===v.authority.generation && t.turn<=v.turn && v.turn<t.untilTurn && v.untilTurn<=t.untilTurn;}))fail();
      v.sources.forEach(function(u){var row=s.siteResources && s.siteResources.sources[u.id];
        if (row && u.period!==null && row.period===u.period) consumed[u.id]=(consumed[u.id] || 0)+v.amount;
      });
    });
    (s.production && s.production.batches || []).forEach(function(b){
      if(b.status!=='committed' || b.waterClaimId===null)return;
      var site=production.sites.find(function(a){return a.id===b.siteId;}),row=site && s.siteResources && s.siteResources.sources[site.sourceId];
      if(row && b.waterPeriod!==null && row.period===b.waterPeriod) consumed[site.sourceId]=(consumed[site.sourceId] || 0)+FBDATA.productionRecipes[b.recipeId].water;
    });
    Object.keys(consumed).forEach(function(k){if(s.siteResources.sources[k].consumed<consumed[k])fail();});
    return true;
  };
})();
