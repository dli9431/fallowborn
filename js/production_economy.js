/* Conserved exchanges and actual seasonal enterprise output share production's ledger. */
(function () {
  'use strict';
  var E = FB.productionEconomy = {}, P = FB.production, LIMIT = 512;
  function own(v,k) { return !!v && Object.prototype.hasOwnProperty.call(v,k); }
  function obj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function keys(v,list) { return obj(v) && Object.keys(v).every(function(k){return list.indexOf(k)>=0;}); }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function eq(a,b) { return JSON.stringify(a)===JSON.stringify(b); }
  function int(v,a,b) { return Number.isSafeInteger(v) && v>=a && v<=b; }
  function num(v,a,b) { return typeof v==='number' && Number.isFinite(v) && v>=a && v<=b; }
  function id(v) { return typeof v==='string' && /^[a-z][a-z0-9_]{0,79}$/.test(v); }
  function period(s) { return Math.floor(s.turn/90); }
  E.catalogFaults = function(d) {
    var errors=[];
    ['productionExchangeProfiles','productionProducerProfiles'].forEach(function(root){
      var table=d[root];
      if(!obj(table) || Object.keys(table).length>128) { errors.push(root+': requires a bounded table.');return; }
      Object.keys(table).forEach(function(k){
        var r=table[k], producer=root==='productionProducerProfiles';
        if(!id(k) || !keys(r,producer ? ['enterpriseType','goodId','marketGoodId','marketUnits','share','maxQuantity'] :
          ['goodId','marketGoodId','basePrice','mode','quantityLimit','budget']) || !own(d.productionGoods,r.goodId) ||
          !own(d.marketGoods,r.marketGoodId)) { errors.push(root+'.'+k+': invalid typed good or fields.');return; }
        if(producer ? !own(d.enterprises,r.enterpriseType) || !num(r.marketUnits,1,10000) || !num(r.share,0.001,1) || !int(r.maxQuantity,1,10000) :
          ['market','owned'].indexOf(r.mode)<0 || !int(r.basePrice,1,10000) || !int(r.quantityLimit,1,10000) || !int(r.budget,1,1000000))
          errors.push(root+'.'+k+': invalid finite price, demand or physical allocation.');
      });
    });
    Object.keys(d.enterpriseMechanics || {}).forEach(function(type){
      var table=d.enterpriseMechanics[type].typedProduction;
      if(table===undefined)return;
      if(!own(d.enterprises,type) || !obj(table) || Object.keys(table).length>8){errors.push('typedProduction: invalid enterprise table.');return;}
      Object.keys(table).forEach(function(goodId){var x=table[goodId];
        if(!own(d.productionGoods,goodId) || !keys(x,['marketGoodId','marketUnits']) || !own(d.marketGoods,x.marketGoodId) || !num(x.marketUnits,1,10000))
          errors.push('typedProduction: requires an exact good, market share and conservative unit mapping.');
      });
    });
    Object.keys(d.productionProducerProfiles || {}).forEach(function(key){
      var r=d.productionProducerProfiles[key],typed=r && d.enterpriseMechanics[r.enterpriseType] && d.enterpriseMechanics[r.enterpriseType].typedProduction;
      var source=typed && typed[r.goodId];
      if(!source || source.marketGoodId!==r.marketGoodId || source.marketUnits!==r.marketUnits)
        errors.push('productionProducerProfiles.'+key+': the enterprise needs its own matching typed output declaration.');
    });
    return errors;
  };
  E.compilePrepared = function(bm,sites) {
    var out={routes:[],producers:[],errors:E.catalogFaults(FBDATA)},seen={},types={},routes={};
    function site(key){return sites.find(function(a){return a.id===key;});}
    function rows(field,fn) {
      var list=bm && bm[field]; if(list===undefined)return;
      if(!Array.isArray(list) || list.length>128){out.errors.push(field+': requires a bounded list.');return;}
      list.forEach(fn);
    }
    rows('productionExchangeAssignments',function(a){
      var p=a && FBDATA.productionExchangeProfiles[a.profileId],from=a && site(a.fromSiteId),to=a && site(a.toSiteId);
      if(!keys(a,['id','profileId','fromSiteId','toSiteId']) || !id(a.id) || seen[a.id] || !p || !from || !to || from===to)
        out.errors.push('productionExchangeAssignments: requires unique physical counterparties.');
      else {
        var key=JSON.stringify([a.fromSiteId,a.toSiteId,p.goodId]);
        if(routes[key])out.errors.push('productionExchangeAssignments: duplicate supplier demand alias.');
        routes[key]=true;seen[a.id]=true;out.routes.push(copy(a));
      }
    });
    rows('productionProducerAssignments',function(a){
      var p=a && FBDATA.productionProducerProfiles[a.profileId],target=a && site(a.siteId);
      if(!keys(a,['id','profileId','siteId']) || !id(a.id) || seen[a.id] || !p || !target || types[p.enterpriseType])
        out.errors.push('productionProducerAssignments: requires one physical allocation per enterprise type.');
      else {seen[a.id]=true;types[p.enterpriseType]=true;out.producers.push(copy(a));}
    });
    return out;
  };
  function plan(s) {
    var bm=FB.campaignBookmark(s),compiled=FB.compileProduction(bm);
    var result=E.compilePrepared(bm,compiled.sites);
    result.errors=result.errors.concat(compiled.errors);return result;
  }
  function definition(s) {
    var bm=FB.campaignBookmark(s);
    return FB.mods.fingerprint([bm.productionExchangeAssignments || [],bm.productionProducerAssignments || [],
      FBDATA.productionExchangeProfiles,FBDATA.productionProducerProfiles,Object.keys(FBDATA.enterpriseMechanics).sort().map(function(k){return [k,FBDATA.enterpriseMechanics[k].typedProduction || null];})]);
  }
  E.initialize = function(s) {
    var p=plan(s);
    if(p.errors.length)throw new Error('Invalid production economy declarations.');
    if(s.production && !s.production.economy && s.turn===0 && (p.routes.length || p.producers.length))
      s.production.economy={version:1,definition:definition(s),receipts:[]};
  };
  function receipts(s) { return s.production && s.production.economy ? s.production.economy.receipts : []; }
  function site(s,key) { return P.snapshot(s).find(function(r){return r.site.id===key;}); }
  function available(s,row,who) {
    return row && row.asset && eq(row.asset.owner,who) && P.authority(s,row.site,who);
  }
  function actor(s,row) { return row && FB.settlementHolder(s,row.site.countyId,row.site.slot); }
  function identity(s,who) { return keys(who,['kind','id']) && ['realm','character'].indexOf(who.kind)>=0 &&
    typeof who.id==='string' && own(who.kind==='realm'?s.realms:s.chars,who.id); }
  function credit(s,who,amount) {
    if(who.kind==='realm')return FB.treasuryCredit(s,who.id,amount);
    if(who.id===s.player.charId){s.player.gold+=amount;return true;}
    return FB.creditBaronyAccount(s,who.id,amount);
  }
  function room(s) {
    var r=s.production;
    return r && r.economy && r.economy.receipts.length<LIMIT && r.nextId<999990 && r.revision<1000000 &&
      r.lots.length+r.batches.reduce(function(n,b){return n+(b.status==='reserved'?FBDATA.productionRecipes[b.recipeId].outputs.length:0);},0)<LIMIT;
  }
  E.quote = function(s,request) {
    var q={exchange:true,allowed:false,reason:'request',request:obj(request)?copy(request):null};
    if(!keys(request,['operation','routeId','actor','quantity']) || ['buy','sell','transfer'].indexOf(request.operation)<0 ||
      !identity(s,request.actor) || !int(request.quantity,1,10000))return q;
    P.validate(s);
    var p=plan(s),route=p.routes.find(function(a){return a.id===request.routeId;});
    if(p.errors.length || !route)return q;
    var profile=FBDATA.productionExchangeProfiles[route.profileId],from=site(s,route.fromSiteId),to=site(s,route.toSiteId);
    var seller=actor(s,from),buyer=actor(s,to),source=from && from.asset,target=to && to.asset;
    q.reason='authority';q.goodId=profile.goodId;q.seller=seller;q.buyer=buyer;
    q.sellerIdentity=from && seller && P.authority(s,from.site,seller);
    q.buyerIdentity=to && buyer && P.authority(s,to.site,buyer);
    if (!from || !to || from.site.countyId!==to.site.countyId && !FB.productionMarketLink(copy(s),from.site.countyId,to.site.countyId,profile.marketGoodId)) return q;
    var account=buyer && P.account(s,buyer),recipient=seller && P.account(s,seller);
    q.payer=account && account.payer;q.recipient=recipient && recipient.payer;
    if(!available(s,from,seller) || !available(s,to,buyer) || !eq(request.actor,request.operation==='sell'?seller:buyer) ||
      profile.mode==='owned' && (!eq(buyer,seller) || request.operation!=='transfer') ||
      profile.mode==='market' && (eq(buyer,seller) || request.operation==='transfer' || eq(q.payer,q.recipient)))return q;
    if (profile.mode==='market' && q.recipient.kind==='character' && q.recipient.id!==s.player.charId &&
      !(s.settlementLordships && s.settlementLordships.accounts && s.settlementLordships.accounts[q.recipient.id])) return q;
    q.reason='stock';q.inputs=[];
    var left=request.quantity;
    from.lots.forEach(function(lot){
      var n=lot.goodId===profile.goodId?Math.min(left,lot.available):0;
      if(n>0){q.inputs.push({lotId:lot.id,quantity:n});left-=n;}
    });
    // Market/fiscal readers may normalize legacy fields. Quotes only read detached state.
    var t=copy(s),price=FB.marketPrice(t,from.site.countyId,profile.marketGoodId);
    q.unitPrice=price;q.cost=profile.mode==='market'?Math.ceil(request.quantity*profile.basePrice*price):0;
    var prior=receipts(s).filter(function(x){return x.kind==='exchange' && x.routeId===route.id && x.period===period(s);});
    q.remainingDemand=profile.quantityLimit-prior.reduce(function(n,x){return n+x.quantity;},0);
    q.remainingBudget=profile.budget-prior.reduce(function(n,x){return n+x.paid;},0);
    q.allowed=!left && num(price,0.01,10000) && room(s) && request.quantity<=q.remainingDemand && q.cost<=q.remainingBudget &&
      account.funds.available>=q.cost+account.funds.reserve;
    if(!left && !q.allowed)q.reason='funds';
    q.allowed=!!q.allowed;q.reason=q.allowed?null:q.reason;
    q.signature=JSON.stringify([s.turn,s.production,request,route,profile,source,target,seller,buyer,account,recipient,
      q.inputs,q.cost,q.unitPrice,q.allowed,s.realms,s.settlementLordships,s.chars,s.buildings,s.player]);
    return q;
  };
  E.aiQuote = function(s,routeId,quantity,operation) {
    var a=plan(s).routes.find(function(x){return x.id===routeId;});
    var row=a && site(s,operation==='sell'?a.fromSiteId:a.toSiteId);
    return E.quote(s,{operation:operation || 'buy',routeId:routeId,quantity:quantity,actor:actor(s,row)});
  };
  E.commit = function(s,review) {
    if(!review || !review.allowed)return false;
    var q=E.quote(s,review.request);
    if(!q.allowed || q.signature!==review.signature)return false;
    var t=copy(s),r=t.production,route=plan(s).routes.find(function(a){return a.id===q.request.routeId;});
    var profile=FBDATA.productionExchangeProfiles[route.profileId],from=site(s,route.fromSiteId),to=site(s,route.toSiteId);
    if(q.cost && (!P.spend(t,q.buyer,q.cost) || !credit(t,q.recipient,q.cost)))return false;
    var key=r.nextId++,lotId=r.nextId++;
    q.inputs.forEach(function(x){r.lots.find(function(l){return l.id===x.lotId;}).remaining-=x.quantity;});
    r.lots.push({id:lotId,assetId:to.asset.id,owner:copy(to.asset.owner),goodId:profile.goodId,unit:FBDATA.productionGoods[profile.goodId].unit,
      quantity:q.request.quantity,remaining:q.request.quantity,origin:{kind:'exchange',receiptId:key}});
    r.economy.receipts.push({id:key,kind:'exchange',routeId:route.id,turn:s.turn,period:period(s),fromAssetId:from.asset.id,
      assetId:to.asset.id,seller:copy(q.seller),buyer:copy(q.buyer),sellerIdentity:copy(q.sellerIdentity),buyerIdentity:copy(q.buyerIdentity),payer:copy(q.payer),recipient:copy(q.recipient),
      inputs:copy(q.inputs),lotId:lotId,quantity:q.request.quantity,unitPrice:q.unitPrice,paid:q.cost});
    r.revision++;
    P.validate(t);
    s.production=r;s.player.gold=t.player.gold;
    Object.keys(s.realms).forEach(function(k){if(t.realms[k].treasury)s.realms[k].treasury=t.realms[k].treasury;});
    if(s.settlementLordships)s.settlementLordships.accounts=t.settlementLordships.accounts;
    return key;
  };
  E.snapshot = function(s,countyId,siteId) {
    return plan(s).routes.filter(function(a){var row=site(s,a.fromSiteId),to=site(s,a.toSiteId);
      return row && to && (row.site.countyId===countyId && row.site.siteId===siteId || to.site.countyId===countyId && to.site.siteId===siteId);
    }).map(function(a){return copy(a);});
  };
  function diversionRows(s,e) {
    return receipts(s).filter(function(x){return x.kind==='producer' && x.enterpriseUid===e.uid && x.turn===s.turn;});
  }
  E.referencesCharacter = function(s,cid) {
    return receipts(s).some(function(x){return x.kind==='producer' ? x.workerIds.indexOf(cid)>=0 :
      x.sellerIdentity.characterId===cid || x.buyerIdentity.characterId===cid || x.payer.id===cid || x.recipient.id===cid;});
  };
  E.incomeDiverted = function(s,e) { return diversionRows(s,e).reduce(function(n,x){return n+x.income;},0); };
  E.subtractOutput = function(s,e,out) {
    diversionRows(s,e).forEach(function(x){out[x.marketGoodId]=Math.max(0,(out[x.marketGoodId] || 0)-x.marketQuantity);});
  };
  E.harvest = function(s) {
    if(!s.production || !s.production.economy || !s.turn || s.turn%90 || s.market && s.market.lastTurn===s.turn)return false;
    P.validate(s);
    var p=plan(s),changed=false;
    if(p.errors.length)return false;
    p.producers.forEach(function(a){
      var profile=FBDATA.productionProducerProfiles[a.profileId],target=site(s,a.siteId),who=actor(s,target);
      // Existing household enterprises have a private owner. Never divert them to a crown's separate account.
      if(!available(s,target,who) || !eq(P.account(s,who).payer,{kind:'character',id:s.player.charId}))return;
      (s.player.enterprises || []).slice().sort(function(a,b){return String(a.uid).localeCompare(String(b.uid));}).forEach(function(e){
        if(e.type!==profile.enterpriseType || e.provinceId!==target.site.countyId || e.settlement!==target.site.slot || !e.uid || !room(s) ||
          receipts(s).some(function(x){return x.kind==='producer' && x.enterpriseUid===e.uid && x.period===period(s);}))return;
        var t=copy(s),raw=FB.enterprisePhysicalYield(t,e),workers=FB.enterpriseOperationalWorkerIds(t,e);
        var primary=t.chars[workers[0]],career=primary && FB.careerOf(t,primary);
        var shares=FB.enterpriseOutputShares(e.type,career && career.specialization),share=shares[profile.marketGoodId] || 0;
        var scale=FBDATA.balance.marketStockScale || 12;
        var quantity=Math.min(profile.maxQuantity,Math.floor(raw*scale*share*profile.share/profile.marketUnits));
        if(!int(quantity,1,10000) || !workers.length || workers.some(function(cid){return s.production.batches.some(function(b){return b.workerId===cid && b.workTurns.indexOf(s.turn)>=0;});}))return;
        var r=s.production,key=r.nextId++,lotId=r.nextId++,marketQuantity=quantity*profile.marketUnits;
        r.economy.receipts.push({id:key,kind:'producer',assignmentId:a.id,enterpriseUid:e.uid,enterpriseType:e.type,
          turn:s.turn,period:period(s),assetId:target.asset.id,owner:copy(target.asset.owner),workerIds:workers.slice(),
          rawYield:raw,outputShare:share,scale:scale,marketGoodId:profile.marketGoodId,marketQuantity:marketQuantity,
          income:marketQuantity/scale,quantity:quantity,lotId:lotId});
        r.lots.push({id:lotId,assetId:target.asset.id,owner:copy(target.asset.owner),goodId:profile.goodId,unit:FBDATA.productionGoods[profile.goodId].unit,
          quantity:quantity,remaining:quantity,origin:{kind:'producer',receiptId:key}});
        r.revision++;changed=true;
      });
    });
    return changed;
  };
  E.reason = function(q) {
    if(q.allowed)return FB.T('Move only the reviewed owned lots. Payment goes to the original supplier account; transferred goods have no simultaneous sale or use.');
    if(q.reason==='stock')return FB.T('The supplier needs enough actual, unreserved lots of this exact material. A market basket cannot replace typed stock.');
    if(q.reason==='funds')return FB.T('The buyer needs current cash, ordinary reserves, remaining declared demand and budget, and inventory room.');
    return FB.T('Both original asset owners need current lawful access to standing works with an accessible local market link.');
  };
  E.validate = function(s) {
    var r=s.production,economy=r && r.economy,out={ids:[],used:{},revision:0};
    function fail(){throw new Error(FB.T('Invalid saved production exchange or producer receipt.'));}
    if(economy===undefined)return out;
    var p=plan(s),seen={},produced={},demand={},costs={},linked={};
    if(!keys(economy,['version','definition','receipts']) || economy.version!==1 || economy.definition!==definition(s) ||
      p.errors.length || !Array.isArray(economy.receipts) || economy.receipts.length>LIMIT)fail();
    function asset(key){return r.assets.find(function(a){return a.id===key;});}
    function lot(key){return r.lots.find(function(a){return a.id===key;});}
    function person(who,owner) {
      return keys(who,['characterId','generation']) && own(s.chars,who.characterId) &&
        (owner.kind==='character' ? who.characterId===owner.id && who.generation===null : int(who.generation,0,FB.realmRulerGeneration(s,owner.id)));
    }
    economy.receipts.forEach(function(x){
      var a=x && asset(x.assetId),l=x && lot(x.lotId),profile,good;
      if(!x || !int(x.id,1,r.nextId-1) || seen[x.id] || !a || !l || l.assetId!==a.id || !eq(l.owner,a.owner) ||
        l.id<=x.id || a.id>=x.id || !int(x.turn,0,s.turn) || x.period!==Math.floor(x.turn/90) ||
        !int(x.quantity,1,10000) || l.quantity!==x.quantity || !eq(l.origin,{kind:x.kind,receiptId:x.id}) || linked[l.id])fail();
      seen[x.id]=true;linked[l.id]=true;out.ids.push(x.id);
      if(x.kind==='exchange') {
        var route=p.routes.find(function(z){return z.id===x.routeId;}),source=asset(x.fromAssetId);
        profile=route && FBDATA.productionExchangeProfiles[route.profileId];
        if(!keys(x,['id','kind','routeId','turn','period','fromAssetId','assetId','seller','buyer','sellerIdentity','buyerIdentity','payer','recipient','inputs','lotId','quantity','unitPrice','paid']) ||
          !profile || !source || source.siteId!==route.fromSiteId || a.siteId!==route.toSiteId || !eq(x.seller,source.owner) || !eq(x.buyer,a.owner) ||
          !identity(s,x.payer) || !identity(s,x.recipient) || !person(x.sellerIdentity,x.seller) || !person(x.buyerIdentity,x.buyer) ||
          !(eq(x.payer,x.buyer) || x.buyer.kind==='realm' && x.buyer.id==='player' && x.payer.kind==='character' && x.payer.id===x.buyerIdentity.characterId) ||
          !(eq(x.recipient,x.seller) || x.seller.kind==='realm' && x.seller.id==='player' && x.recipient.kind==='character' && x.recipient.id===x.sellerIdentity.characterId) ||
          !num(x.unitPrice,0.01,10000) || x.paid!==(profile.mode==='owned'?0:Math.ceil(x.quantity*profile.basePrice*x.unitPrice)) ||
          (profile.mode==='owned' ? !eq(x.seller,x.buyer) : eq(x.seller,x.buyer) || eq(x.payer,x.recipient)) ||
          !Array.isArray(x.inputs) || !x.inputs.length || x.inputs.length>LIMIT)fail();
        var n=0,inputs={};
        x.inputs.forEach(function(i){var input=lot(i.lotId);
          if(!keys(i,['lotId','quantity']) || !input || input.id>=x.id || inputs[i.lotId] || input.assetId!==source.id ||
            input.goodId!==profile.goodId || !int(i.quantity,1,input.quantity))fail();
          inputs[i.lotId]=true;n+=i.quantity;out.used[i.lotId]=(out.used[i.lotId] || 0)+i.quantity;
        });
        if(n!==x.quantity)fail();
        var d=JSON.stringify([route.id,x.period]);demand[d]=(demand[d] || 0)+n;costs[d]=(costs[d] || 0)+x.paid;
        if(demand[d]>profile.quantityLimit || costs[d]>profile.budget)fail();
      } else if(x.kind==='producer') {
        var assignment=p.producers.find(function(z){return z.id===x.assignmentId;});
        profile=assignment && FBDATA.productionProducerProfiles[assignment.profileId];
        var k=JSON.stringify([x.enterpriseUid,x.period]);
        if(!keys(x,['id','kind','assignmentId','enterpriseUid','enterpriseType','turn','period','assetId','owner','workerIds','rawYield','outputShare','scale','marketGoodId','marketQuantity','income','quantity','lotId']) ||
          !profile || a.siteId!==assignment.siteId || !eq(x.owner,a.owner) || !x.turn || x.turn%90 ||
          !identity(s,x.owner) ||
          (typeof x.enterpriseUid!=='string' && !int(x.enterpriseUid,1,1000000)) || !x.enterpriseUid || String(x.enterpriseUid).length>200 || produced[k] ||
          x.enterpriseType!==profile.enterpriseType || x.marketGoodId!==profile.marketGoodId || !num(x.rawYield,0.000001,1000000) ||
          !num(x.outputShare,0.000001,1) || !num(x.scale,0.001,10000) || x.marketQuantity!==x.quantity*profile.marketUnits ||
          x.quantity!==Math.min(profile.maxQuantity,Math.floor(x.rawYield*x.scale*x.outputShare*profile.share/profile.marketUnits)) ||
          x.income!==x.marketQuantity/x.scale || !Array.isArray(x.workerIds) || !x.workerIds.length || x.workerIds.length>64 ||
          new Set(x.workerIds).size!==x.workerIds.length || x.workerIds.some(function(cid){return !own(s.chars,cid);}))fail();
        produced[k]=true;
      } else fail();
      good=FBDATA.productionGoods[profile.goodId];
      if(l.goodId!==profile.goodId || !good || l.unit!==good.unit)fail();
    });
    r.lots.forEach(function(l){if((l.origin.kind==='exchange' || l.origin.kind==='producer') && !linked[l.id])fail();});
    r.batches.forEach(function(b){b.inputs.forEach(function(i){var input=lot(i.lotId);
      if(input && (input.origin.kind==='exchange' || input.origin.kind==='producer')) {
        var source=economy.receipts.find(function(x){return x.id===input.origin.receiptId;});
        if(!source || source.turn>b.openedTurn)fail();
      }
    });});
    economy.receipts.forEach(function(x){if(x.kind==='exchange')x.inputs.forEach(function(i){
      var input=lot(i.lotId),origin=input.origin;
      var created=origin.kind==='opening'?0:origin.kind==='batch' ? (r.batches.find(function(b){return b.id===origin.batchId;}) || {}).closedTurn :
        (economy.receipts.find(function(receipt){return receipt.id===origin.receiptId;}) || {}).turn;
      if(!int(created,0,x.turn))fail();
    });});
    out.revision=economy.receipts.length;return out;
  };
})();
