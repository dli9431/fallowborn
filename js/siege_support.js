/* Finite paid equipment, carried by one real host for one ordinary siege. */
(function () {
  'use strict';
  var S = FB.siegeSupport = {}, LIMIT = 128;
  function own(v,k) { return !!v && Object.prototype.hasOwnProperty.call(v,k); }
  function obj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function keys(v,list) { return obj(v) && Object.keys(v).every(function(k){return list.indexOf(k)>=0;}); }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function eq(a,b) { return JSON.stringify(a)===JSON.stringify(b); }
  function int(v,a,b) { return Number.isSafeInteger(v) && v>=a && v<=b; }
  function id(v) { return typeof v==='string' && /^[a-z][a-z0-9_]{0,79}$/.test(v); }
  function text(v) { return typeof v==='string' && !!v.trim() && v.length<=1000; }
  S.catalogFaults = function(d) {
    var table=d.siegeSupportProfiles, errors=[];
    if(!obj(table) || Object.keys(table).length>64)return ['siegeSupportProfiles: requires a bounded table.'];
    Object.keys(table).forEach(function(key){
      var p=table[key], recipe=p && d.productionRecipes[p.recipeId], good=p && d.productionGoods[p.goodId];
      var review=p && d.techImpactReviews.features[p.impactReviewId];
      if(!id(key) || !keys(p,['name','desc','recipeId','goodId','quantityPerPulse','pulses','progress','termDays','requiresTech','impactReviewId','fallback']) ||
        !text(p.name) || !text(p.desc) || !recipe || !Array.isArray(recipe.outputs) || !good || !int(p.quantityPerPulse,1,1000) || !int(p.pulses,1,8) ||
        !int(p.termDays,1,360) || typeof p.progress!=='number' || !Number.isFinite(p.progress) || p.progress<0.25 || p.progress>1 ||
        !recipe.outputs.some(function(x){return x.goodId===p.goodId && x.quantity>=p.quantityPerPulse;}) ||
        !Array.isArray(p.requiresTech) || p.requiresTech.length>8 || new Set(p.requiresTech).size!==p.requiresTech.length ||
        p.requiresTech.some(function(k){return !own(d.tech,k);}) || !id(p.impactReviewId) || !review || !text(review.rationale) ||
        (p.requiresTech.length ? review.mode!=='hard' || !Array.isArray(review.tech) ||
          !eq(p.requiresTech.slice().sort(),review.tech.slice().sort()) || !text(p.fallback) || p.fallback!==review.fallback :
          review.mode!=='none' || p.fallback!==undefined)) errors.push('siegeSupportProfiles.'+key+': invalid equipment, paid recipe, bounds or technology review.');
    });
    return errors;
  };
  function definition() {
    var rows=copy(FBDATA.siegeSupportProfiles);
    Object.keys(rows).forEach(function(k){delete rows[k].name;delete rows[k].desc;});
    return FB.mods.fingerprint(rows);
  }
  function rows(s) { return s.siegeSupport ? s.siegeSupport.records : []; }
  function host(s,key) { return (s.armies || []).find(function(a){return a.id===key;}); }
  function identity(s,rid) {
    var a=FB.political.actor(s,{kind:'realm',id:rid}),c=a && s.chars[a.characterId];
    if(!s.realms[rid] || !s.realms[rid].alive || !c || c.dead || c.imprisoned || c.prisonerOf || c.captive || c.unfree || c.exiled ||
      c.id===s.player.charId && (s.player.dead || s.player.flags.in_prison) ||
      FB.justiceCustodyOf(s,c.id) || FB.intrigueCaptivityOf(s,c.id))return null;
    return {characterId:a.characterId,generation:a.rulerGeneration};
  }
  function permitted(s,rid) {
    var m=FB.mobile && FB.mobile.row(s,rid);
    return !m || (FB.mobile.commandSnapshot(s,rid) ? FB.mobile.commandDecision(s,rid,'war') : false);
  }
  function siege(s,warId,pid,rid) {
    var w=FB.ordinaryWarById(s,warId),o=w && w.occupations && w.occupations[pid];
    if(!w || w.legacy || !Array.isArray(w.objectives) || !FB.world.byId[pid] ||
      !w.objectives.some(function(x){return x.target===pid;}) && !(o && o.homeRealm))return null;
    var home=o && o.homeRealm || w.defender,occupied=!!(o && o.occupied);
    var besieger=occupied ? home : home===w.defender ? w.attacker : w.defender;
    return besieger===rid && FB.warCountyHeldBy(s,pid,home) ? {record:o || null,homeRealm:home,occupied:occupied} : null;
  }
  function current(s,r) {
    var a=host(s,r.hostId),p=identity(s,r.realmId),target=siege(s,r.warId,r.countyId,r.realmId);
    if(!a || a.men<=0 || a.realm!==r.realmId || a.warId!==r.warId || !p ||
      p.characterId!==r.characterId || p.generation!==r.generation || !permitted(s,r.realmId) ||
      !target || target.homeRealm!==r.homeRealm || target.occupied!==r.occupied || s.turn>=r.endTurn)return false;
    if(r.uses.length && (a.at!==r.countyId || a.moveLeft || (a.path || []).length))return false;
    return true;
  }
  function atSiege(s,r) {
    var a=host(s,r.hostId);
    return current(s,r) && a.at===r.countyId && !a.moveLeft && !(a.path || []).length;
  }
  S.quote = function(s,request) {
    var q={allowed:false,reason:'request',request:obj(request)?copy(request):null};
    if(!keys(request,['profileId','siteId','hostId','warId','countyId']) || !id(request.profileId))return q;
    var p=FBDATA.siegeSupportProfiles[request.profileId],a=host(s,request.hostId);
    if(!p || !a || !a.men || S.catalogFaults(FBDATA).length)return q;
    FB.production.validate(s);S.validate(s);
    var who={kind:'realm',id:a.realm},person=identity(s,a.realm),target=siege(s,request.warId,request.countyId,a.realm);
    var source=FB.production.snapshot(s).find(function(x){return x.site.id===request.siteId;});
    q.reason='authority';
    var known=s.realmTech && s.realmTech[FB.techRealmId(s,a.realm)];
    q.missingTech=p.requiresTech.filter(function(k){return !known || (known.completed || []).indexOf(k)<0;});
    if(!id(request.siteId))return q;
    if(!source || !source.asset || !eq(source.asset.owner,who) || !person || !permitted(s,a.realm) ||
      !FB.production.authority(s,source.site,who) || a.at!==source.site.countyId || a.moveLeft || (a.path || []).length ||
      a.warId!==request.warId || !target || rows(s).some(function(r){return r.hostId===a.id &&
        (r.loadedTurn===s.turn || r.status==='carried' && current(s,r));}))return q;
    q.reason=q.missingTech.length?'tech':'stock';q.inputs=[];
    var left=p.quantityPerPulse*p.pulses;
    source.lots.forEach(function(l){
      var b=l.origin.kind==='batch' && s.production.batches.find(function(x){return x.id===l.origin.batchId;});
      if(l.goodId!==p.goodId || !b || b.status!=='committed' || b.disposition!=='store' || b.recipeId!==p.recipeId ||
        !eq(l.owner,who))return;
      var n=Math.min(left,l.available);
      if(n>0){q.inputs.push({lotId:l.id,quantity:n});left-=n;}
    });
    q.person=person;q.realmId=a.realm;q.assetId=source.asset.id;q.sourceCountyId=source.site.countyId;
    q.homeRealm=target.homeRealm;q.occupied=target.occupied;
    q.endTurn=q.inputs.reduce(function(end,x){return Math.min(end,FB.buildingSeasons.lotExpiry(s,s.production.lots.find(function(l){return l.id===x.lotId;})));},s.turn+p.termDays);
    q.termDays=q.endTurn-s.turn;q.recordLimit=rows(s).length>=LIMIT;
    q.allowed=!left && !q.missingTech.length && q.termDays>0 && !q.recordLimit;
    q.reason=q.allowed?null:q.reason;
    q.signature=JSON.stringify([s.turn,definition(),s.production,s.siegeSupport || null,request,a,person,target,q.inputs,known,p]);
    return q;
  };
  S.commit = function(s,review) {
    if(!review || !review.allowed)return false;
    var q=S.quote(s,review.request);
    if(!q.allowed || q.signature!==review.signature)return false;
    var request=q.request,p=FBDATA.siegeSupportProfiles[request.profileId];
    if(!s.siegeSupport)s.siegeSupport={version:1,definition:definition(),records:[]};
    S.tick(s);
    var list=rows(s),rid=list.length+1;
    q.inputs.forEach(function(x){s.production.lots.find(function(l){return l.id===x.lotId;}).remaining-=x.quantity;});
    list.push({id:rid,profileId:request.profileId,hostId:request.hostId,warId:request.warId,countyId:request.countyId,
      realmId:q.realmId,characterId:q.person.characterId,generation:q.person.generation,assetId:q.assetId,
      siteId:request.siteId,sourceCountyId:q.sourceCountyId,homeRealm:q.homeRealm,occupied:q.occupied,
      loadedTurn:s.turn,endTurn:q.endTurn,inputs:copy(q.inputs),uses:[],status:'carried',closedTurn:null});
    return rid;
  };
  S.tick = function(s) {
    rows(s).forEach(function(r){if(r.status==='carried' && !current(s,r)){r.status='interrupted';r.closedTurn=s.turn;}});
  };
  S.pulse = function(s,pid,record,hosts) {
    if(!s.siegeSupport)return 0;
    S.tick(s);
    if(!FB.fortSiegeStatus(s,pid,record,hosts).canProgress || (s.armies || []).some(function(a){
      return a.at===pid && hosts.some(function(b){return FB.armiesHostile(s,a,b);});}))return 0;
    var candidates=rows(s).filter(function(r){var target=siege(s,r.warId,pid,r.realmId);
      return r.status==='carried' && r.countyId===pid && target && target.record===record && atSiege(s,r) &&
        hosts.some(function(a){return a.id===r.hostId;});});
    // One finite contribution per siege and turn, including the yearly four-pulse path.
    if(rows(s).some(function(r){return r.countyId===pid && candidates.some(function(c){return c.warId===r.warId;}) &&
      r.uses.some(function(u){return u.turn===s.turn;});}))return 0;
    var r=candidates[0];
    if(!r)return 0;
    var p=FBDATA.siegeSupportProfiles[r.profileId];
    r.uses.push({turn:s.turn});
    if(r.uses.length===p.pulses){r.status='spent';r.closedTurn=s.turn;}
    return p.progress;
  };
  S.aiQuote = function(s,request) { return S.quote(s,request); };
  S.runAI = function(s,hosts) {
    if(!Object.keys(FBDATA.siegeSupportProfiles).length || !s.production || rows(s).length>=LIMIT)return;
    var inventory=FB.production.snapshot(s),profiles=Object.keys(FBDATA.siegeSupportProfiles).sort();
    (hosts || []).filter(function(a){return a.realm!=='player';}).slice(0,LIMIT).forEach(function(a){
      var w=FB.ordinaryWarById(s,a.warId);
      if(!w || !w.occupations || rows(s).some(function(r){return r.hostId===a.id && r.status==='carried' && current(s,r);}))return;
      var sources=inventory.filter(function(row){return row.site.countyId===a.at;});
      var targets=w.objectives.map(function(o){return o.target;});
      if(targets.indexOf(a.at)<0 && w.occupations[a.at])targets.unshift(a.at);
      for(var i=0;i<profiles.length;i++)for(var j=0;j<sources.length;j++){
        var profile=FBDATA.siegeSupportProfiles[profiles[i]];
        if(!eq(sources[j].asset && sources[j].asset.owner,{kind:'realm',id:a.realm}) ||
          sources[j].site.recipeIds.indexOf(profile.recipeId)<0 ||
          !sources[j].lots.some(function(lot){return lot.goodId===profile.goodId && lot.available>0;}))continue;
        var target=targets.find(function(pid){return !!siege(s,w.id,pid,a.realm);});
        var q=S.aiQuote(s,{profileId:profiles[i],siteId:sources[j].site.id,hostId:a.id,warId:w.id,countyId:target});
        if(q.allowed){S.commit(s,q);return;}
      }
    });
  };
  S.debited = function(s,lotId) {
    return rows(s).reduce(function(n,r){return n+r.inputs.reduce(function(m,x){return m+(x.lotId===lotId?x.quantity:0);},0);},0);
  };
  S.referencesCharacter = function(s,cid) { return rows(s).some(function(r){return r.characterId===cid;}); };
  S.snapshot = function(s,hostId) {
    return rows(s).filter(function(r){return r.hostId===hostId;}).map(function(r){
      var out=copy(r),p=FBDATA.siegeSupportProfiles[r.profileId];
      out.effectiveStatus=r.status==='carried' && !current(s,r) ? 'interrupted' : r.status;
      out.remaining=out.effectiveStatus==='carried' ? p.pulses-r.uses.length : 0;
      return out;
    });
  };
  S.validate = function(s) {
    function fail(){throw new Error(FB.T('Invalid saved siege equipment.'));}
    var root=s.siegeSupport;
    if(root===undefined)return true;
    if(!keys(root,['version','definition','records']) || root.version!==1 || root.definition!==definition() ||
      !Array.isArray(root.records) || root.records.length>LIMIT || !s.production || S.catalogFaults(FBDATA).length)fail();
    var bm=FB.campaignBookmark(s),sites=FB.compileProduction(bm).sites,counties={};
    (bm.provinces || []).forEach(function(p){if(!p.wasteland)counties[p.id]=true;});
    root.records.forEach(function(r,index){
      var p=r && FBDATA.siegeSupportProfiles[r.profileId],asset=r && s.production.assets.find(function(a){return a.id===r.assetId;});
      if(!p || !keys(r,['id','profileId','hostId','warId','countyId','realmId','characterId','generation','assetId','siteId','sourceCountyId',
        'homeRealm','occupied','loadedTurn','endTurn','inputs','uses','status','closedTurn']) || r.id!==index+1 ||
        !(typeof r.hostId==='string' && r.hostId.length>0 && r.hostId.length<=120 || int(r.hostId,1,Number.MAX_SAFE_INTEGER)) ||
        typeof r.warId!=='string' || !r.warId || r.warId.length>120 ||
        !own(s.realms,r.realmId) || !own(s.chars,r.characterId) || !own(s.realms,r.homeRealm) || !counties[r.countyId] ||
        !int(r.generation,0,FB.realmRulerGeneration(s,r.realmId)) || typeof r.occupied!=='boolean' ||
        !int(r.loadedTurn,0,s.turn) || !int(r.endTurn,r.loadedTurn+1,r.loadedTurn+p.termDays) || !asset || asset.siteId!==r.siteId ||
        !eq(asset.owner,{kind:'realm',id:r.realmId}) || !counties[r.sourceCountyId] ||
        !Array.isArray(r.inputs) || !r.inputs.length || r.inputs.length>512 || !Array.isArray(r.uses) || r.uses.length>p.pulses ||
        ['carried','spent','interrupted'].indexOf(r.status)<0 || (r.status==='carried'?r.closedTurn!==null:
          !int(r.closedTurn,r.loadedTurn,s.turn)) || (r.status==='spent')!==(r.uses.length===p.pulses))fail();
      var source=sites.find(function(a){return a.id===r.siteId;});
      if(!source || source.countyId!==r.sourceCountyId)fail();
      var seen={},total=0,previous=-1,end=r.loadedTurn+p.termDays;
      r.inputs.forEach(function(x){
        var lot=x && s.production.lots.find(function(l){return l.id===x.lotId;});
        var batch=lot && lot.origin.kind==='batch' && s.production.batches.find(function(b){return b.id===lot.origin.batchId;});
        if(!keys(x,['lotId','quantity']) || seen[x.lotId] || !lot || lot.assetId!==r.assetId || lot.goodId!==p.goodId ||
          !batch || batch.recipeId!==p.recipeId || batch.status!=='committed' || batch.disposition!=='store' ||
          batch.closedTurn>r.loadedTurn || !int(x.quantity,1,lot.quantity) || r.loadedTurn>=FB.buildingSeasons.lotExpiry(s,lot))fail();
        seen[x.lotId]=true;total+=x.quantity;
        end=Math.min(end,FB.buildingSeasons.lotExpiry(s,lot));
      });
      if(total!==p.quantityPerPulse*p.pulses || r.endTurn!==end)fail();
      r.uses.forEach(function(u){if(!keys(u,['turn']) || !int(u.turn,r.loadedTurn,Math.min(s.turn,r.endTurn-1)) ||
        u.turn<=previous || r.closedTurn!==null && u.turn>r.closedTurn || root.records.slice(0,index).some(function(old){return old.warId===r.warId &&
          old.countyId===r.countyId && old.uses.some(function(v){return v.turn===u.turn;});}))fail();previous=u.turn;});
      if(r.status==='spent' && r.closedTurn!==previous || root.records.slice(0,index).some(function(old){return old.hostId===r.hostId &&
        (old.loadedTurn>=r.loadedTurn || old.closedTurn===null || old.closedTurn>r.loadedTurn);}))fail();
    });
    return true;
  };
  S.name = function(key) { var p=FBDATA.siegeSupportProfiles[key];return FB.T(p.name); };
  S.reason = function(q) {
    if(q.allowed)return FB.T('Load {quantity} equipment units for up to {days} days. One host carries them for this siege; each active pulse consumes one finite charge. Ordinary siege progress remains available.',
      {quantity:FBDATA.siegeSupportProfiles[q.request.profileId].quantityPerPulse*FBDATA.siegeSupportProfiles[q.request.profileId].pulses,days:q.termDays});
    if(q.recordLimit)return FB.T('The equipment receipt limit has been reached. Ordinary siege remains available.');
    if(q.missingTech && q.missingTech.length)return FB.T('Requires: {technologies}. Ordinary siege remains available.',{technologies:q.missingTech.map(function(k){return FB.dataText(FB.state,null,'tech',k,FBDATA.tech[k],'name',{});}).join(', ')});
    if(q.reason==='stock')return FB.T('Requires unreserved equipment from the declared completed paid batch at this host’s actual location.');
    return FB.T('Requires the current commander, an assigned living host, a lawful local workshop and one current ordinary siege.');
  };
})();
