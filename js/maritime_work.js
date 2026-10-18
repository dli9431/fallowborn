/* Finite owned boat-work contributions to canonical household enterprise invoices. */
(function () {
  'use strict';
  var M = FB.maritimeWork = {}, P = FB.production, active = null;
  function own(v,k) { return !!v && Object.prototype.hasOwnProperty.call(v,k); }
  function obj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function keys(v,list) { return obj(v) && Object.keys(v).every(function(k){return list.indexOf(k)>=0;}); }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function eq(a,b) { return JSON.stringify(a) === JSON.stringify(b); }
  function int(v,a,b) { return Number.isSafeInteger(v) && v>=a && v<=b; }
  function id(v) { return typeof v === 'string' && /^[a-z][a-z0-9_]{0,79}$/.test(v); }
  function num(v,a,b) { return typeof v === 'number' && Number.isFinite(v) && v>=a && v<=b; }
  M.catalogFaults = function(d) {
    var table=d.maritimeWorkProfiles, errors=[];
    if (!obj(table) || Object.keys(table).length>128) return ['maritimeWorkProfiles requires at most 128 profiles.'];
    Object.keys(table).forEach(function(key){
      var p=table[key], recipe=p && d.productionRecipes[p.recipeId], enterprise=p && d.enterprises[p.enterpriseType];
      if (!id(key) || !keys(p,['name','desc','enterpriseType','recipeId','goodId','quantity','unitValue','invoiceShare','termDays']) ||
          typeof p.name!=='string' || !p.name.trim() || p.name.length>120 ||
          p.desc!==undefined && (typeof p.desc!=='string' || p.desc.length>1000) || !enterprise ||
          !own(d.enterprises,p.enterpriseType) || (d.enterpriseMechanics[p.enterpriseType] || {}).maritimeWork!==true ||
          !recipe || !own(d.productionRecipes,p.recipeId) || !own(d.productionGoods,p.goodId) || !Array.isArray(recipe.outputs) ||
          recipe.outputs.length!==1 || !recipe.outputs[0] || recipe.outputs[0].goodId!==p.goodId ||
          !int(p.quantity,1,10000) || !int(p.unitValue,1,10000) || !num(p.invoiceShare,0.001,0.1) || !int(p.termDays,1,90))
        errors.push('maritimeWorkProfiles.'+key+': requires one typed paid boat-work output, finite value and at most ten percent of an ordinary invoice.');
    });
    return errors;
  };
  M.compilePrepared = function(bm,sites) {
    var out={assignments:[],errors:M.catalogFaults(FBDATA)}, rows=bm && bm.maritimeWorkAssignments, seen={}, physical={};
    if (rows===undefined) return out;
    if (!Array.isArray(rows) || rows.length>128) { out.errors.push('maritimeWorkAssignments requires at most 128 facilities.'); return out; }
    var sources=FB.siteResources.compilePrepared(bm);
    out.errors.push.apply(out.errors,sources.errors);
    rows.forEach(function(a){
      var p=a && FBDATA.maritimeWorkProfiles[a.profileId], site=a && sites.find(function(x){return x.id===a.productionSiteId;});
      var source=a && sources.sources.find(function(x){return x.id===a.launchSourceId;});
      if (!keys(a,['id','profileId','productionSiteId','launchSourceId']) || !id(a.id) || seen[a.id] || !p || !site ||
          physical[a.productionSiteId] || site.recipeIds.indexOf(p.recipeId)<0 || !source || source.profile.unit!=='launching' ||
          source.countyId!==site.countyId || source.siteId!==site.siteId) {
        out.errors.push('maritimeWorkAssignments: requires one unique paid facility and co-located licensed launching source.'); return;
      }
      seen[a.id]=true;physical[a.productionSiteId]=true;
      out.assignments.push(Object.assign(copy(a),{countyId:site.countyId,siteId:site.siteId,slot:site.slot}));
    });
    if (out.errors.length) out.assignments=[];
    return out;
  };
  var cached;
  function plan(s) {
    var bm=FB.campaignBookmark(s),signature=FB.mods.sig(),raw=FBDATA.bookmarks[bm.id];
    if(!cached || cached.raw!==raw || cached.revision!==bm.revision || cached.signature!==signature) {
      var p=FB.compileProduction(bm);
      cached={raw:raw,revision:bm.revision,signature:signature,value:{sites:p.sites,assignments:p.maritime || [],errors:p.errors}};
    }
    return cached.value;
  }
  function stamp(p) {
    var profiles=copy(FBDATA.maritimeWorkProfiles);
    Object.keys(profiles).forEach(function(k){delete profiles[k].name;delete profiles[k].desc;});
    return FB.mods.fingerprint([profiles,p.assignments]);
  }
  function root(s) { return s.production && s.production.maritime; }
  function person(s,a) {
    var who=FB.political.actor(s,a);
    return who ? {characterId:who.characterId,generation:a.kind==='realm'?who.rulerGeneration:null} : null;
  }
  function sameHousehold(s,a) {
    var account=P.account(s,a);
    return account.payer.kind==='character' && account.payer.id===s.player.charId;
  }
  function target(s,a,p,uid) {
    var e=uid===null ? null : (s.player.enterprises || []).find(function(x){return x.uid===uid;});
    if (uid!==null && (!e || e.type!==p.enterpriseType || e.provinceId!==a.countyId || e.settlement!==a.slot)) return null;
    var status=e ? FB.enterpriseUpgradeStatus(s,e) : FB.enterprisePurchaseStatus(s,p.enterpriseType,a.countyId,a.slot,{checkFunds:false});
    var blocked=e ? status.code!=='ready' && status.code!=='funds' : status.blockers.length>0;
    return {enterprise:e,status:status,blocked:blocked,cost:status.cost || 0,level:e ? FB.enterpriseUpgradeLevel(e)+1 : 0};
  }
  M.reservations = function(s) {
    var held={};
    if (root(s)) root(s).invoices.forEach(function(x){if(x.status==='pending')x.inputs.forEach(function(i){held[i.lotId]=(held[i.lotId] || 0)+i.quantity;});});
    return held;
  };
  function value(s,profile,inputs) {
    return inputs.reduce(function(n,x){
      var lot=s.production.lots.find(function(l){return l.id===x.lotId;}), batch=lot && s.production.batches.find(function(b){return b.id===lot.origin.batchId;});
      if (!batch) return NaN;
      // One output kind: each contributed unit carries only its proportional paid processing value.
      return n+x.quantity*Math.min(profile.unitValue,batch.paid/lot.quantity);
    },0);
  }
  M.quote = function(s,request) {
    var q={allowed:false,reason:'request',request:obj(request)?copy(request):null};
    if (!keys(request,['operation','assignmentId','actor','enterpriseUid','invoiceId']) ||
        ['prepare','complete','cancel'].indexOf(request.operation)<0 || !id(request.assignmentId) ||
        !keys(request.actor,['kind','id']) || ['realm','character'].indexOf(request.actor.kind)<0 || typeof request.actor.id!=='string' || !request.actor.id) return q;
    var p=plan(s), a=p.assignments.find(function(x){return x.id===request.assignmentId;});
    if (p.errors.length || !a || !s.production) return q;
    P.validate(s);FB.siteResources.validate(s);FB.buildingSeasons.validate(s);
    var profile=FBDATA.maritimeWorkProfiles[a.profileId], r=root(s), invoice=r && r.invoices.find(function(x){return x.id===request.invoiceId;});
    var identity=person(s,request.actor), site=p.sites.find(function(x){return x.id===a.productionSiteId;});
    if (!identity || identity.characterId!==s.player.charId || !sameHousehold(s,request.actor)) {q.reason='account';return q;}
    q.payer={kind:'character',id:s.player.charId};
    if (request.operation!=='prepare') {
      if (request.enterpriseUid!==undefined || !invoice || invoice.assignmentId!==a.id || invoice.status!=='pending' ||
          !eq(invoice.actor,request.actor) || !eq(identity,invoice.identity)) return q;
      q.invoice=copy(invoice);
    } else if (request.invoiceId!==undefined || request.enterpriseUid!==null &&
        (typeof request.enterpriseUid!=='string' || !request.enterpriseUid || request.enterpriseUid.length>200)) return q;
    if (request.operation==='cancel') {q.allowed=true;q.reason=null;}
    else {
      q.reason='authority';
      var auth=P.authority(s,site,request.actor);
      if (!auth || !eq(auth,identity) || !FB.buildingSeasons.ready(s,'productionSiteId',site.id,request.actor)) return q;
      var row=P.snapshot(s,a.countyId,a.siteId).find(function(x){return x.site.id===site.id;});
      if (!row || !row.asset || !eq(row.asset.owner,request.actor)) return q;
      q.assetId=row.asset.id;
      var savedUid=FB.getUidCounter(),savedRng=FB.getRngState(),selected;
      try {selected=target(copy(s),a,profile,invoice?invoice.enterpriseUid:request.enterpriseUid);}
      finally {FB.setUidCounter(savedUid);FB.setRngState(savedRng);}
      q.reason='enterprise';if(!selected || selected.blocked)return q;
      q.baseCost=selected.cost;q.level=selected.level;
      q.launch=FB.siteResources.quote(s,{operation:'reserve',sourceId:a.launchSourceId,actor:request.actor,amount:1});
      q.reason='launch';if(!q.launch.allowed)return q;
      if (invoice) {
        q.reason='terms';
        if (invoice.baseCost!==q.baseCost || invoice.level!==q.level || invoice.assetId!==row.asset.id || s.turn>=invoice.expiresTurn) return q;
        q.inputs=copy(invoice.inputs);q.credit=invoice.credit;
        var ownHeld=M.reservations(s);
        if (q.inputs.some(function(x){var l=row.lots.find(function(l){return l.id===x.lotId;});return !l || l.available+(ownHeld[l.id] || 0)<x.quantity || FB.buildingSeasons.lotAvailable(s,l)<x.quantity;})) return q;
      } else {
        q.reason='pending';
        if (r && r.invoices.some(function(x){return x.status==='pending' && x.assignmentId===a.id;})) return q;
        q.inputs=[];var left=profile.quantity;
        row.lots.forEach(function(l){
          var batch=l.origin.kind==='batch' && s.production.batches.find(function(b){return b.id===l.origin.batchId;});
          if (!left || l.goodId!==profile.goodId || !batch || batch.recipeId!==profile.recipeId || batch.status!=='committed' ||
              batch.disposition!=='store' || !eq(batch.actor,request.actor) || !eq(batch.payer,q.payer) || batch.workerId!==identity.characterId ||
              batch.generation!==identity.generation || !eq(l.owner,request.actor)) return;
          var n=Math.min(left,l.available);if(n){q.inputs.push({lotId:l.id,quantity:n});left-=n;}
        });
        q.reason='stock';if(left)return q;
        q.credit=Math.floor(Math.min(q.baseCost*profile.invoiceShare,value(s,profile,q.inputs)));
      }
      q.due=q.baseCost-q.credit;q.reason='funds';
      if (!int(q.credit,1,1000000) || !Number.isFinite(s.player.gold) || s.player.gold<q.due) return q;
      q.reason='capacity';
      if (s.production.nextId>=1000000 || s.production.revision>=999999 ||
          request.operation==='prepare' && r && r.invoices.length>=512) return q;
      q.allowed=true;q.reason=null;
    }
    q.signature=JSON.stringify([request,s.turn,identity,s.production,s.siteResources || null,s.player.gold,s.player.enterprises || [],q.baseCost,q.level,q.credit,q.launch || null]);
    return q;
  };
  // Canonical enterprise entry points accept credit only during this exact staged transaction.
  M.invoiceCredit = function(s,invoiceId,enterpriseUid,type,countyId,slot) {
    if (!active || active.state!==s || active.invoice.id!==invoiceId) return false;
    var x=active.invoice,a=active.assignment,p=FBDATA.maritimeWorkProfiles[a.profileId];
    return x.enterpriseUid===enterpriseUid && p.enterpriseType===type && a.countyId===countyId && a.slot===slot ? x.credit : false;
  };
  M.commit = function(s,review) {
    if (!review || !review.allowed) return false;
    var q=M.quote(s,review.request);
    if (!q.allowed || q.signature!==review.signature) return false;
    var p=plan(s),a=p.assignments.find(function(x){return x.id===q.request.assignmentId;}),profile=FBDATA.maritimeWorkProfiles[a.profileId];
    var t=copy(s),r=t.production, ledger=r.maritime || (r.maritime={version:1,definition:stamp(p),invoices:[]}),result=true;
    var x=ledger.invoices.find(function(x){return x.id===q.request.invoiceId;});
    if(q.request.operation==='prepare') {
      result=r.nextId++;
      ledger.invoices.push({id:result,assignmentId:a.id,assetId:q.assetId,actor:copy(q.request.actor),identity:person(s,q.request.actor),
        payer:copy(q.payer),enterpriseUid:q.request.enterpriseUid,level:q.level,baseCost:q.baseCost,credit:q.credit,inputs:copy(q.inputs),
        openedTurn:s.turn,expiresTurn:s.turn+profile.termDays,closedTurn:null,status:'pending',resultUid:null,launchPeriod:null,launchClaimId:null});
    } else if(q.request.operation==='cancel') { x.status='cancelled';x.closedTurn=s.turn; }
    else {
      var claim=FB.siteResources.commit(t,q.launch);
      if(!claim || !FB.siteResources.commit(t,FB.siteResources.quote(t,{operation:'consume',sourceId:a.launchSourceId,actor:q.request.actor,reservationId:claim})))return false;
      var uid=FB.getUidCounter(),rng=FB.getRngState(),ok=false;
      try {
        active={state:t,invoice:x,assignment:a};
        var e=x.enterpriseUid===null ? FB.acquireEnterprise(t,profile.enterpriseType,a.countyId,a.slot,{maritimeInvoiceId:x.id}) :
          FB.upgradeEnterprise(t,x.enterpriseUid,{maritimeInvoiceId:x.id});
        if(!e)return false;
        x.resultUid=x.enterpriseUid===null ? e.uid : x.enterpriseUid;
        x.status='committed';x.closedTurn=s.turn;
        x.launchClaimId=claim;
        x.launchPeriod=FB.siteResources.snapshot(t,a.countyId,a.siteId).find(function(y){return y.id===a.launchSourceId;}).period;
        x.inputs.forEach(function(i){r.lots.find(function(l){return l.id===i.lotId;}).remaining-=i.quantity;});
        ok=true;
      } finally {active=null;if(!ok){FB.setUidCounter(uid);FB.setRngState(rng);}}
    }
    r.revision++;
    // All potentially failing work ran on detached state, including canonical payment and staffing.
    if(q.request.operation==='complete') Object.keys(t).forEach(function(key){s[key]=t[key];});
    else s.production=t.production;
    return result;
  };
  M.aiQuote = function(s,assignmentId,operation,terms) {
    var a=plan(s).assignments.find(function(x){return x.id===assignmentId;});
    return M.quote(s,Object.assign({},terms || {},{assignmentId:assignmentId,operation:operation,
      actor:a && FB.settlementHolder(s,a.countyId,a.slot)}));
  };
  M.snapshot = function(s,countyId,siteId) {
    return plan(s).assignments.filter(function(a){return a.countyId===countyId && a.siteId===siteId;}).map(copy);
  };
  M.expireLot = function(s,lotId) {
    if(!root(s))return;
    root(s).invoices.forEach(function(x){
      if(x.status==='pending' && x.inputs.some(function(i){return i.lotId===lotId;})) {
        x.status='cancelled';x.closedTurn=s.turn;s.production.revision++;
      }
    });
  };
  M.reason = function(q) {
    if(q.allowed)return FB.T('Reserve completed owned work, then pay the remaining enterprise invoice once. Ordinary staffing and technology requirements still apply.');
    if(q.reason==='account')return FB.T('This private enterprise needs work owned and paid for by the same household. Public funds cannot subsidize it.');
    if(q.reason==='launch')return FB.T('A current lawful launching place with spare capacity is required.');
    if(q.reason==='stock')return FB.T('Complete the declared paid batch and keep enough owned, unreserved output at this facility.');
    if(q.reason==='terms')return FB.T('The invoice changed or expired. Cancel it and review current terms; the original materials remain yours.');
    if(q.reason==='funds')return FB.T('The household needs enough money for the remaining ordinary invoice.');
    if(q.reason==='pending')return FB.T('Complete or cancel the existing invoice at this facility first.');
    if(q.reason==='enterprise')return FB.T('The ordinary enterprise site and exact next-stage technology requirements must be met.');
    return FB.T('A living original household owner, standing facility and current permission are required.');
  };
  M.validate = function(s) {
    var r=s.production, ledger=root(s), out={ids:[],used:{},revision:0};
    if(ledger===undefined)return out;
    function fail(){throw new Error(FB.T('Invalid saved maritime production invoice.'));}
    var p=plan(s),pending={}, committed={},launches={},claims={};
    if(p.errors.length || !keys(ledger,['version','definition','invoices']) || ledger.version!==1 || ledger.definition!==stamp(p) ||
        !Array.isArray(ledger.invoices) || !ledger.invoices.length || ledger.invoices.length>512)fail();
    ledger.invoices.forEach(function(x){
      var a=x && p.assignments.find(function(a){return a.id===x.assignmentId;}),profile=a && FBDATA.maritimeWorkProfiles[a.profileId];
      var asset=x && r.assets.find(function(y){return y.id===x.assetId;});
      if(!keys(x,['id','assignmentId','assetId','actor','identity','payer','enterpriseUid','level','baseCost','credit','inputs','openedTurn','expiresTurn','closedTurn','status','resultUid','launchPeriod','launchClaimId']) ||
          !a || !asset || asset.siteId!==a.productionSiteId || !int(x.id,asset.id+1,r.nextId-1) || !eq(x.actor,asset.owner) ||
          !keys(x.identity,['characterId','generation']) || !own(s.chars,x.identity.characterId) ||
          !eq(x.payer,{kind:'character',id:x.identity.characterId}) ||
          (x.actor.kind==='character' ? x.actor.id!==x.identity.characterId || x.identity.generation!==null :
            x.actor.kind!=='realm' || !int(x.identity.generation,0,FB.realmRulerGeneration(s,x.actor.id))) ||
          !(x.enterpriseUid===null || typeof x.enterpriseUid==='string' && x.enterpriseUid.length>0 && x.enterpriseUid.length<=200) ||
          !int(x.level,0,(FBDATA.enterprises[profile.enterpriseType].upgrades || []).length) || (x.enterpriseUid===null)!==(x.level===0) ||
          !int(x.baseCost,1,1000000) || !int(x.credit,1,Math.floor(x.baseCost*profile.invoiceShare)) ||
          !int(x.openedTurn,0,s.turn) || x.expiresTurn!==x.openedTurn+profile.termDays ||
          ['pending','committed','cancelled'].indexOf(x.status)<0 || !Array.isArray(x.inputs) || !x.inputs.length || x.inputs.length>512)fail();
      var total=0, seen={};
      x.inputs.forEach(function(i){
        var l=i && r.lots.find(function(l){return l.id===i.lotId;}),b=l && l.origin.kind==='batch' && r.batches.find(function(b){return b.id===l.origin.batchId;});
        if(!keys(i,['lotId','quantity']) || !l || seen[i.lotId] || !int(i.quantity,1,l.quantity) || l.id>=x.id || l.assetId!==x.assetId ||
            l.goodId!==profile.goodId || !b || b.recipeId!==profile.recipeId || b.status!=='committed' || b.disposition!=='store' ||
            b.closedTurn>x.openedTurn || !eq(b.actor,x.actor) || b.workerId!==x.identity.characterId || b.generation!==x.identity.generation || !eq(b.payer,x.payer))fail();
        seen[i.lotId]=true;total+=i.quantity;
        if(x.status==='committed') {
          if(x.closedTurn>=FB.buildingSeasons.lotExpiry(s,l))fail();
          out.used[l.id]=(out.used[l.id] || 0)+i.quantity;
        }
      });
      if(total!==profile.quantity || x.credit!==Math.floor(Math.min(x.baseCost*profile.invoiceShare,value(s,profile,x.inputs))))fail();
      if(x.status==='pending') {
        if(x.closedTurn!==null || x.resultUid!==null || x.launchPeriod!==null || x.launchClaimId!==null || pending[a.id])fail();pending[a.id]=true;
      } else {
        if(!int(x.closedTurn,x.openedTurn,s.turn))fail();
        if(x.status==='cancelled') {if(x.resultUid!==null || x.launchPeriod!==null || x.launchClaimId!==null)fail();}
        else {
          var source=FB.siteResources.compile(FB.campaignBookmark(s)).sources.find(function(z){return z.id===a.launchSourceId;});
          var key=JSON.stringify([x.resultUid,x.level]);
          if(x.closedTurn>=x.expiresTurn || typeof x.resultUid!=='string' || !x.resultUid || x.enterpriseUid!==null && x.resultUid!==x.enterpriseUid ||
              committed[key] || !s.siteResources || !int(x.launchClaimId,1,s.siteResources.nextId-1) || claims[x.launchClaimId] ||
              Object.keys(s.siteResources.sources).some(function(key){return s.siteResources.sources[key].reservations.some(function(c){return c.id===x.launchClaimId;});}) ||
              x.launchPeriod!==Math.floor(x.closedTurn/source.profile.periodDays))fail();
          committed[key]=true;
          claims[x.launchClaimId]=true;
          var row=s.siteResources && s.siteResources.sources[a.launchSourceId];
          if(row && row.period===x.launchPeriod) {launches[a.launchSourceId]=(launches[a.launchSourceId] || 0)+1;if(launches[a.launchSourceId]>row.consumed)fail();}
          else if(!row || row.period<x.launchPeriod)fail();
        }
      }
      out.ids.push(x.id);out.revision+=x.status==='pending'?1:2;
    });
    return out;
  };
  M.referencesCharacter = function(s,cid) {
    return !!root(s) && root(s).invoices.some(function(x){return x.identity.characterId===cid;});
  };
})();
