/* Actual reached-stop provisions. Production owns stock, armies own journeys and food. */
(function () {
  'use strict';
  var R=FB.relayServices={}, P=FB.production, LIMIT=512;
  function own(v,k) { return !!v && Object.prototype.hasOwnProperty.call(v,k); }
  function obj(v) { return !!v && typeof v==='object' && !Array.isArray(v); }
  function keys(v,list) { return obj(v) && Object.keys(v).length===list.length && Object.keys(v).every(function(k){return list.indexOf(k)>=0;}); }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function eq(a,b) { return JSON.stringify(a)===JSON.stringify(b); }
  function int(v,a,b) { return Number.isSafeInteger(v) && v>=a && v<=b; }
  function num(v,a,b) { return typeof v==='number' && Number.isFinite(v) && v>=a && v<=b; }
  function id(v) { return typeof v==='string' && /^[a-z][a-z0-9_]{0,79}$/.test(v); }
  R.catalogFaults=function(d) {
    var out=[], table=d.relayServiceProfiles;
    if(!obj(table) || Object.keys(table).length>128)return ['relayServiceProfiles: requires a bounded table.'];
    Object.keys(table).forEach(function(k){var p=table[k],good=p && d.productionGoods[p.goodId];
      if(!id(k) || !keys(p,['goodId','marketUnits','mode','basePrice','maxQuantity','duration']) || !good ||
        !num(p.marketUnits,0.001,1000) || good.provisionUnits!==p.marketUnits || ['owned','market'].indexOf(p.mode)<0 ||
        !int(p.basePrice,1,10000) || !int(p.maxQuantity,1,10000) || !int(p.duration,1,90))
        out.push('relayServiceProfiles.'+k+': requires an exact provision unit, finite price, capacity and term.');
    });return out;
  };
  R.compilePrepared=function(bm,sites) {
    var out={assignments:[],errors:R.catalogFaults(FBDATA)}, list=bm && bm.relayServiceAssignments,seen={},physical={};
    if(list===undefined)return out;
    if(!Array.isArray(list) || list.length>128){out.errors.push('relayServiceAssignments: requires a bounded list.');return out;}
    list.forEach(function(a){var site=a && sites.find(function(x){return x.id===a.sourceSiteId;});
      var from=a && (bm.provinces || []).find(function(p){return p.id===a.fromCountyId && !p.wasteland;});
      var target=a && (bm.realms || []).find(function(r){return r.id===a.recipientRealmId;});
      if(!keys(a,['id','profileId','sourceSiteId','fromCountyId','recipientRealmId','routeMode']) || !id(a.id) || seen[a.id] ||
        !own(FBDATA.relayServiceProfiles,a.profileId) || !site || !from || site.countyId===from.id || !target ||
        ['land','water'].indexOf(a.routeMode)<0)out.errors.push('relayServiceAssignments: requires unique real directed stops, stock and recipient.');
      else {
        var crossing=(bm.straits || []).some(function(pair){return pair.indexOf(from.id)>=0 && pair.indexOf(site.countyId)>=0;});
        if(crossing!==(a.routeMode==='water'))out.errors.push('relayServiceAssignments: route mode must match the declared crossing.');
        var token=JSON.stringify([a.sourceSiteId,a.fromCountyId,a.recipientRealmId]);
        if(physical[token])out.errors.push('relayServiceAssignments: duplicate service alias.');
        physical[token]=true;seen[a.id]=true;out.assignments.push(copy(a));
      }
    });return out;
  };
  var cached;
  function plan(s) {
    var bm=FB.campaignBookmark(s),stamp=FB.mods.sig(),base=FBDATA.bookmarks[bm.id];
    if(cached && cached.base===base && cached.revision===bm.revision && cached.stamp===stamp)return cached.value;
    var p=FB.compileProduction(bm),out=R.compilePrepared(bm,p.sites);
    out.errors=out.errors.concat(p.errors);cached={base:base,revision:bm.revision,stamp:stamp,value:out};return out;
  }
  function definition(s) { return FB.mods.fingerprint([FB.campaignBookmark(s).relayServiceAssignments || [],FBDATA.relayServiceProfiles]); }
  function ledger(s) { return s.production && s.production.relay; }
  function room(s) {var r=ledger(s),p=s.production;return r && r.arrivals.length+r.consents.length+r.receipts.length<LIMIT && p.nextId<999990 && p.revision<1000000;}
  R.initialize=function(s) {
    var p=plan(s);
    if(p.errors.length)throw new Error('Invalid relay provisions declarations.');
    if(p.assignments.length && s.turn===0 && s.production && !ledger(s))
      s.production.relay={version:1,definition:definition(s),arrivals:[],consents:[],receipts:[]};
  };
  function host(s,key) { return (s.armies || []).find(function(a){return a.id===key && a.men>0 && !a.rebellionId;}); }
  function source(s,a) { return P.snapshot(s).find(function(row){return row.site.id===a.sourceSiteId;}); }
  function person(s,who) {
    if(who && who.kind==='realm' && (!s.realms[who.id] || !s.realms[who.id].alive))return null;
    var actor=who && FB.political.actor(s,who),c=actor && s.chars[actor.characterId];
    return c && !c.dead && !c.unfree && !c.imprisoned && !c.prisonerOf && !c.captive && !c.exiled &&
      (c.id!==s.player.charId || !s.player.dead) &&
      !(FB.justiceCustodyOf && FB.justiceCustodyOf(s,c.id)) && !(FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(s,c.id)) &&
      FB.ageOf(c,s.date.year)>=16 ? {characterId:c.id,generation:who.kind==='realm'?actor.rulerGeneration:null} : null;
  }
  function recipient(s,a) { return {kind:'realm',id:FB.startRealmId(s,a.recipientRealmId)}; }
  function usableHost(s,a,h) {
    var row=h && h.mobileFollowing && FB.mobile.row(s,h.realm);
    return !!h && h.realm===recipient(s,a).id && !!person(s,recipient(s,a)) &&
      (!h.mobileFollowing || row && row.status==='active' && (row.command?FB.mobile.commandValid(s,h.realm):FB.mobile.active(s,h.realm) && !!FB.mobile.leader(s,h.realm)));
  }
  function safe(s,h,pid) {
    return !FB.recruitmentCountyBlocked(s,s.holder[pid] || s.owner[pid],pid) &&
      !(FB.fortBlocksArmy && FB.fortBlocksArmy(s,pid,h)) &&
      !(s.armies || []).some(function(other){return other.at===pid && other.men>0 && FB.armiesHostile(s,h,other);}) &&
      !(s.holder[pid] && FB.armiesHostile(s,h,{realm:s.holder[pid]}));
  }
  function edge(s,h,a,row) {
    var to=row.site.countyId, adj=FB.world && FB.world.adj;
    if(!adj || !adj[a.fromCountyId] || !adj[a.fromCountyId][to] || !safe(s,h,to) || !safe(s,h,a.fromCountyId))return null;
    if(h.mobileFollowing && (!FB.mobile.passage(s,h.realm,to,h.mobileCourt) || !FB.mobile.passage(s,h.realm,a.fromCountyId,h.mobileCourt)))return null;
    var q=FB.armyLegQuote(copy(s),h,a.fromCountyId,to);
    return q && Number.isFinite(q.totalDays) && q.totalDays>0 && !!q.water===(a.routeMode==='water') ? q : null;
  }
  // Called only after the ordinary march commits a real county transition.
  R.arrive=function(s,h,from,to) {
    var r=ledger(s);if(!r || !room(s) || !h || host(s,h.id)!==h)return false;
    var changed=false,p=plan(s);if(p.errors.length)return false;
    p.assignments.forEach(function(a){
      var row=source(s,a);
      if(!room(s) || !row || a.fromCountyId!==from || row.site.countyId!==to || h.at!==to || h.from!==from || !usableHost(s,a,h) || !edge(s,h,a,row))return;
      if(r.arrivals.some(function(x){return x.serviceId===a.id && x.hostId===h.id && x.turn===s.turn;}))return;
      r.arrivals.push({id:s.production.nextId++,serviceId:a.id,hostId:h.id,realmId:h.realm,person:person(s,recipient(s,a)),turn:s.turn});
      s.production.revision++;changed=true;
    });return changed;
  };
  function credit(s,who,amount) {
    if(who.kind==='realm')return FB.treasuryCredit(s,who.id,amount);
    if(who.id===s.player.charId){s.player.gold+=amount;return true;}
    return FB.creditBaronyAccount(s,who.id,amount);
  }
  function consents(s) { return ledger(s) ? ledger(s).consents : []; }
  R.quote=function(s,request) {
    var q={relay:true,allowed:false,reason:'request',request:obj(request)?copy(request):null};
    if(!obj(request) || ['consent','collect','revoke'].indexOf(request.operation)<0 ||
      !keys(request,request.operation==='consent'?['operation','serviceId','hostId','actor']:request.operation==='collect'?
        ['operation','serviceId','hostId','actor','quantity']:['operation','serviceId','consentId','actor']))return q;
    P.validate(s);FB.buildingSeasons.validate(s);
    var p=plan(s),a=p.assignments.find(function(x){return x.id===request.serviceId;}),r=ledger(s);
    if(p.errors.length || !a || !r || !room(s) && request.operation!=='revoke' || s.production.nextId>=999990 || s.production.revision>=1000000)return q;
    var row=source(s,a),profile=FBDATA.relayServiceProfiles[a.profileId],who=row && row.asset && row.asset.owner;
    q.reason='authority';q.provider=who;q.providerPerson=who && P.authority(s,row.site,who);q.beneficiary=recipient(s,a);
    q.recipientPerson=person(s,q.beneficiary);q.goodId=profile.goodId;
    if(!who || !q.providerPerson || !q.recipientPerson || !eq(who,FB.settlementHolder(s,row.site.countyId,row.site.slot)))return q;
    var h=host(s,request.hostId),consent;
    if(request.operation==='revoke') {
      consent=r.consents.find(function(c){return c.id===request.consentId && c.serviceId===a.id && c.revokedTurn===null;});
      if(!consent || !eq(request.actor,who) || !eq(consent.providerPerson,q.providerPerson) || !eq(consent.provider,who))return q;
      q.consentId=consent.id;
    } else {
      if(!usableHost(s,a,h))return q;
      q.reason='consent';
      if(request.operation==='consent') {
        if(!eq(request.actor,who) || profile.mode==='owned' && !eq(who,q.beneficiary))return q;
        // A host has one finite agreement per declared service, including after expiry/revocation.
        if(consents(s).some(function(c){return c.serviceId===a.id && c.hostId===h.id;}))return q;
        q.untilTurn=s.turn+profile.duration;
      } else {
        if(!eq(request.actor,q.beneficiary) || !int(request.quantity,1,profile.maxQuantity))return q;
        consent=r.consents.find(function(c){return c.serviceId===a.id && c.hostId===h.id;});
        if(!consent || consent.revokedTurn!==null || s.turn>=consent.untilTurn ||
          !eq(consent.providerPerson,q.providerPerson) || !eq(consent.recipientPerson,q.recipientPerson) || !eq(consent.provider,who))return q;
        q.consentId=consent.id;q.untilTurn=consent.untilTurn;
        q.reason='location';
        var arrivals=r.arrivals.filter(function(x){return x.serviceId===a.id && x.hostId===h.id && x.id>consent.id && x.turn>=consent.turn &&
          x.turn<=s.turn && eq(x.person,q.recipientPerson);});
        var arrival=arrivals.length && arrivals[arrivals.length-1];
        q.route=edge(s,h,a,row);
        if(!arrival || r.receipts.some(function(x){return x.arrivalId===arrival.id;}) || h.at!==row.site.countyId ||
          h.from!==a.fromCountyId || h.moveLeft>0 || (h.path || []).length || !q.route)return q;
        q.arrivalId=arrival.id;q.reason='stock';q.inputs=[];
        var left=request.quantity;
        row.lots.forEach(function(l){var n=l.goodId===profile.goodId?Math.min(left,l.available):0;
          if(n>0){q.inputs.push({lotId:l.id,quantity:n});left-=n;}
        });
        var used=r.receipts.filter(function(x){return x.consentId===consent.id;}).reduce(function(n,x){return n+x.quantity;},0);
        if(left || used+request.quantity>profile.maxQuantity)return q;
        q.reason='capacity';q.load=FB.armyProvisionLoadQuote(s,h.id,request.quantity*profile.marketUnits);
        if(!q.load.allowed)return q;
        q.unitPrice=FB.marketPrice(copy(s),row.site.countyId,'provisions');
        q.cost=profile.mode==='owned'?0:Math.ceil(request.quantity*profile.basePrice*q.unitPrice);
        q.payer=P.account(s,q.beneficiary).payer;q.payee=P.account(s,who).payer;
        q.reason='funds';var account=P.account(s,q.beneficiary);
        if(profile.mode==='owned' ? !eq(who,q.beneficiary) : eq(q.payer,q.payee))return q;
        if(!num(q.unitPrice,0.01,10000) || account.funds.available<q.cost+account.funds.reserve)return q;
        if(q.payee.kind==='character' && q.payee.id!==s.player.charId &&
          !(s.settlementLordships && s.settlementLordships.accounts && s.settlementLordships.accounts[q.payee.id]))return q;
      }
    }
    q.allowed=true;q.reason=null;
    q.signature=JSON.stringify([s.turn,request,s.production,s.buildings,s.realms,s.chars,s.player,s.armies,s.holder,s.owner,
      s.settlementLordships,s.authority,s.market,q]);return q;
  };
  R.aiQuote=function(s,serviceId,hostId,operation,quantity) {
    var a=plan(s).assignments.find(function(x){return x.id===serviceId;}),row=a && source(s,a);
    var request={operation:operation,serviceId:serviceId,hostId:hostId,actor:operation==='consent' ? row && row.asset && row.asset.owner : a && recipient(s,a)};
    if(operation==='collect')request.quantity=quantity;
    return R.quote(s,request);
  };
  R.commit=function(s,review) {
    if(!review || !review.allowed)return false;
    var q=R.quote(s,review.request);if(!q.allowed || q.signature!==review.signature)return false;
    var t=copy(s),r=ledger(t),a=plan(t).assignments.find(function(x){return x.id===q.request.serviceId;}),row=source(t,a),key=t.production.nextId++;
    if(q.request.operation==='consent')r.consents.push({id:key,serviceId:a.id,hostId:q.request.hostId,realmId:q.beneficiary.id,
      provider:copy(q.provider),providerPerson:copy(q.providerPerson),recipientPerson:copy(q.recipientPerson),turn:t.turn,untilTurn:q.untilTurn,revokedTurn:null,revocationId:null});
    else if(q.request.operation==='revoke') {
      var c=r.consents.find(function(x){return x.id===q.consentId;});c.revokedTurn=t.turn;c.revocationId=key;
    } else {
      if(q.cost && (!P.spend(t,q.beneficiary,q.cost) || !credit(t,q.payee,q.cost)))return false;
      if(!FB.armyProvisionLoad(t,FB.armyProvisionLoadQuote(t,q.request.hostId,q.load.units)))return false;
      q.inputs.forEach(function(i){t.production.lots.find(function(l){return l.id===i.lotId;}).remaining-=i.quantity;});
      r.receipts.push({id:key,serviceId:a.id,consentId:q.consentId,arrivalId:q.arrivalId,hostId:q.request.hostId,
        assetId:row.asset.id,turn:t.turn,quantity:q.request.quantity,units:q.load.units,load:copy(q.load),
        inputs:copy(q.inputs),unitPrice:q.unitPrice,paid:q.cost,payer:copy(q.payer),payee:copy(q.payee)});
    }
    t.production.revision++;P.validate(t);FB.buildingSeasons.validate(t);
    s.production=t.production;s.player.gold=t.player.gold;
    if(q.request.operation==='collect') {
      var current=host(s,q.request.hostId),loaded=host(t,q.request.hostId);
      current.supply=loaded.supply;if(loaded.mobileFollowing)current.mobileFood=loaded.mobileFood;
    }
    Object.keys(s.realms).forEach(function(k){if(t.realms[k].treasury)s.realms[k].treasury=t.realms[k].treasury;});
    if(s.settlementLordships)s.settlementLordships.accounts=t.settlementLordships.accounts;
    return key;
  };
  R.snapshot=function(s,countyId,siteId) {return plan(s).assignments.filter(function(a){var row=source(s,a);return row && row.site.countyId===countyId && row.site.siteId===siteId;});};
  R.referencesCharacter=function(s,cid) {var r=ledger(s);return !!r && (r.arrivals.some(function(a){return a.person.characterId===cid;}) ||
    r.consents.some(function(c){return c.providerPerson.characterId===cid || c.recipientPerson.characterId===cid;}));};
  R.reason=function(q) {
    if(q.allowed && q.request.operation==='consent')return FB.T('Authorize only this host for the displayed finite quantity and term. No provisions or passage are granted now.');
    if(q.allowed && q.request.operation==='revoke')return FB.T('End this supplier consent. Already collected provisions remain with their host.');
    if(q.allowed)return FB.T('Use finite supplies once at the reached stop. This grants no movement or replacement troops.');
    if(q.reason==='authority')return FB.T('The original supplier, recipient or current host command is unavailable.');
    if(q.reason==='consent')return FB.T('A current finite supplier consent for this exact host is required.');
    if(q.reason==='location')return FB.T('Halt at this stop after the declared real route. A fresh unused arrival is required.');
    if(q.reason==='stock')return FB.T('The exact unreserved provisions or agreed quantity are unavailable.');
    if(q.reason==='capacity')return FB.T('The host cannot carry the complete quantity.');
    if(q.reason==='funds')return FB.T('The current payer must cover the price and retain its reserves.');
    return FB.T('The relay declaration or bounded journal is unavailable.');
  };
  R.validate=function(s) {
    var r=ledger(s),out={ids:[],used:{},revision:0};
    function fail(){throw new Error(FB.T('Invalid saved relay provisions or arrival.'));}
    var p=plan(s);
    if(r===undefined){if(s.production && p.assignments.length)fail();return out;}
    if(!keys(r,['version','definition','arrivals','consents','receipts']) || r.version!==1 || r.definition!==definition(s) || p.errors.length ||
      !Array.isArray(r.arrivals) || !Array.isArray(r.consents) || !Array.isArray(r.receipts) || r.arrivals.length+r.consents.length+r.receipts.length>LIMIT)fail();
    var arrivals={},arrivalKeys={},consentTable={},usedArrivals={},totals={},production=s.production;
    function unique(v){if(!int(v,1,production.nextId-1) || out.ids.indexOf(v)>=0)fail();out.ids.push(v);}
    function assignment(key){return p.assignments.find(function(a){return a.id===key;});}
    function identity(w){return keys(w,['kind','id']) && ['realm','character'].indexOf(w.kind)>=0 && own(w.kind==='realm'?s.realms:s.chars,w.id);}
    function personRef(v,who) {return keys(v,['characterId','generation']) && own(s.chars,v.characterId) &&
      (who.kind==='realm'?int(v.generation,0,FB.realmRulerGeneration(s,who.id)):v.characterId===who.id && v.generation===null);}
    function hostKey(v) {return typeof v==='string' && !!v && v.length<=200;}
    function historicalSource(a) {
      var row=source(s,a);
      if(row && !row.asset)row.asset=production.assets.find(function(asset){return asset.siteId===a.sourceSiteId;});
      return row;
    }
    r.arrivals.forEach(function(x){var a=x && assignment(x.serviceId);
      if(!keys(x,['id','serviceId','hostId','realmId','person','turn']) || !a || x.realmId!==recipient(s,a).id || !hostKey(x.hostId) ||
        !int(x.turn,0,s.turn) || !personRef(x.person,recipient(s,a)))fail();
      var key=JSON.stringify([x.serviceId,x.hostId,x.turn]);if(arrivalKeys[key])fail();arrivalKeys[key]=true;
      unique(x.id);arrivals[x.id]=x;
    });
    r.consents.forEach(function(c){var a=c && assignment(c.serviceId),row=a && historicalSource(a),profile=a && FBDATA.relayServiceProfiles[a.profileId];
      if(!keys(c,['id','serviceId','hostId','realmId','provider','providerPerson','recipientPerson','turn','untilTurn','revokedTurn','revocationId']) ||
        !a || !row || !row.asset || !eq(c.provider,row.asset.owner) || !identity(c.provider) || c.realmId!==recipient(s,a).id ||
        !hostKey(c.hostId) || !personRef(c.providerPerson,c.provider) || !personRef(c.recipientPerson,recipient(s,a)) ||
        !int(c.turn,0,s.turn) || c.untilTurn!==c.turn+profile.duration || profile.mode==='owned' && !eq(c.provider,recipient(s,a)) ||
        (c.revokedTurn===null ? c.revocationId!==null : !int(c.revokedTurn,c.turn,s.turn)))fail();
      if(r.consents.some(function(other){return other!==c && other.serviceId===c.serviceId && other.hostId===c.hostId;}))fail();
      unique(c.id);if(c.revokedTurn!==null){unique(c.revocationId);if(c.revocationId<=c.id)fail();}
      consentTable[c.id]=c;
    });
    r.receipts.forEach(function(x){var a=x && assignment(x.serviceId),profile=a && FBDATA.relayServiceProfiles[a.profileId],
      c=x && consentTable[x.consentId],arrival=x && arrivals[x.arrivalId],row=a && historicalSource(a);
      if(!keys(x,['id','serviceId','consentId','arrivalId','hostId','assetId','turn','quantity','units','load','inputs','unitPrice','paid','payer','payee']) ||
        !a || !c || !arrival || !row.asset || x.assetId!==row.asset.id || c.serviceId!==a.id || arrival.serviceId!==a.id ||
        x.hostId!==c.hostId || x.hostId!==arrival.hostId || !eq(arrival.person,c.recipientPerson) || usedArrivals[arrival.id] ||
        x.id<=c.id || x.id<=arrival.id || arrival.id<=c.id || !int(x.turn,Math.max(c.turn,arrival.turn),s.turn) || arrival.turn<c.turn || x.turn>=c.untilTurn ||
        c.revokedTurn!==null && (x.turn>c.revokedTurn || x.id>=c.revocationId) || !int(x.quantity,1,profile.maxQuantity) ||
        x.units!==x.quantity*profile.marketUnits || !FB.armyProvisionLoadRecordValid(x.load,x.hostId,c.realmId,x.units) ||
        !num(x.unitPrice,0.01,10000) || x.paid!==(profile.mode==='owned'?0:Math.ceil(x.quantity*profile.basePrice*x.unitPrice)) ||
        !identity(x.payer) || !identity(x.payee) ||
        !(eq(x.payer,recipient(s,a)) || c.realmId==='player' && eq(x.payer,{kind:'character',id:c.recipientPerson.characterId})) ||
        !(eq(x.payee,c.provider) || c.provider.kind==='realm' && c.provider.id==='player' && eq(x.payee,{kind:'character',id:c.providerPerson.characterId})) ||
        profile.mode==='market' && eq(x.payer,x.payee) || !Array.isArray(x.inputs) || !x.inputs.length || x.inputs.length>LIMIT)fail();
      unique(x.id);usedArrivals[arrival.id]=true;var sum=0,seen={};
      x.inputs.forEach(function(i){var lot=i && production.lots.find(function(l){return l.id===i.lotId;});
        if(!keys(i,['lotId','quantity']) || !lot || seen[i.lotId] || lot.assetId!==row.asset.id || lot.goodId!==profile.goodId ||
          lot.id>=x.id || !int(i.quantity,1,lot.quantity) || x.turn>=FB.buildingSeasons.lotExpiry(s,lot))fail();
        var born=lot.origin.kind==='opening'?0:lot.origin.kind==='batch'?
          (production.batches.find(function(b){return b.id===lot.origin.batchId;}) || {}).closedTurn:
          (production.economy && production.economy.receipts.find(function(e){return e.id===lot.origin.receiptId;}) || {}).turn;
        if(!int(born,0,x.turn))fail();
        seen[i.lotId]=true;sum+=i.quantity;out.used[i.lotId]=(out.used[i.lotId] || 0)+i.quantity;
      });
      totals[c.id]=(totals[c.id] || 0)+sum;if(sum!==x.quantity || totals[c.id]>profile.maxQuantity)fail();
    });
    out.revision=out.ids.length;return out;
  };
})();
