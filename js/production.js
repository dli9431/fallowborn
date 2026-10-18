/* Finite physical lots and paid batches. Declarations never select historical content. */
(function () {
  'use strict';
  var P = FB.production = {}, MAX = 1000000, LIMIT = 512;
  function own(v,k) { return !!v && Object.prototype.hasOwnProperty.call(v,k); }
  function object(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function keys(v,list) { return object(v) && Object.keys(v).every(function (k) { return list.indexOf(k) >= 0; }); }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function eq(a,b) { return JSON.stringify(a) === JSON.stringify(b); }
  function int(v,min,max) { return Number.isSafeInteger(v) && v >= min && v <= max; }
  function id(v) { return typeof v === 'string' && /^[a-z][a-z0-9_]{0,79}$/.test(v); }
  function actor(v) { return keys(v,['kind','id']) && ['realm','character'].indexOf(v.kind) >= 0 && typeof v.id === 'string' && !!v.id; }
  function text(v) { return typeof v === 'string' && v.trim() && v.length <= 1000; }
  function amountRows(rows,goods) {
    var seen = {};
    return Array.isArray(rows) && rows.length > 0 && rows.length <= 8 && rows.every(function (r) {
      if (!keys(r,['goodId','quantity']) || !own(goods,r.goodId) || seen[r.goodId] || !int(r.quantity,1,10000)) return false;
      seen[r.goodId] = true; return true;
    });
  }
  P.catalogFaults = function (data) {
    var goods = data.productionGoods, recipes = data.productionRecipes, faults = [];
    if (!object(goods) || Object.keys(goods).length > 128 || !object(recipes) || Object.keys(recipes).length > 128)
      return ['productionGoods/productionRecipes require bounded tables.'];
    Object.keys(goods).forEach(function (key) {
      var g = goods[key];
      if (!id(key) || !keys(g,['name','desc','unit','mass','provisionUnits']) || !text(g.name) || g.desc !== undefined && !text(g.desc) ||
          g.provisionUnits !== undefined && !(typeof g.provisionUnits==='number' && Number.isFinite(g.provisionUnits) && g.provisionUnits>=0.001 && g.provisionUnits<=1000) ||
          !id(g.unit) || !int(g.mass,1,1000)) faults.push('productionGoods.' + key + ': invalid unit or conservative mass.');
    });
    Object.keys(recipes).forEach(function (key) {
      var r = recipes[key], req = r && r.requiresTech;
      var t = r && data.techImpactReviews && data.techImpactReviews.features && data.techImpactReviews.features[r.impactReviewId];
      if (!id(key) || !keys(r,['name','desc','inputs','outputs','water','workDays','workPrice','requiresTech','impactReviewId','fallback','requiresSale']) ||
          r.requiresSale !== undefined && typeof r.requiresSale !== 'boolean' ||
          !text(r.name) || r.desc !== undefined && !text(r.desc) || !amountRows(r.inputs,goods) || !amountRows(r.outputs,goods) ||
          !int(r.workDays,1,30) || !int(r.workPrice,1,10000) || r.water !== undefined && !int(r.water,1,10000) ||
          !Array.isArray(req) || req.length > 8 || new Set(req).size !== req.length || req.some(function (k) { return !own(data.tech,k); }) ||
          !id(r.impactReviewId) || !t || !text(t.rationale) ||
          (req.length ? t.mode !== 'hard' || !Array.isArray(t.tech) || !eq(req.slice().sort(),t.tech.slice().sort()) || !text(r.fallback) ||
            r.fallback !== t.fallback : t.mode !== 'none' || r.fallback !== undefined)) {
        faults.push('productionRecipes.' + key + ': invalid finite recipe, work or technology review.'); return;
      }
      function mass(rows) { return rows.reduce(function (n,x) { return n + x.quantity * goods[x.goodId].mass; },0); }
      if (mass(r.outputs) > mass(r.inputs)) faults.push('productionRecipes.' + key + ': outputs exceed conservative input mass.');
      if (r.outputs.some(function (o) { return r.inputs.some(function (i) { return i.goodId === o.goodId; }); }))
        faults.push('productionRecipes.' + key + ': a batch cannot reproduce its own input kind.');
    });
    Object.keys(data.buildings || {}).forEach(function (key) {
      var b = data.buildings[key], list = b && b.productionRecipeIds;
      if (list === undefined) return;
      if (b.fort || b.operationProfile || b.institutionProfile || !Array.isArray(list) || !list.length || list.length > 16 ||
          new Set(list).size !== list.length || list.some(function (k) { return !own(recipes,k); }))
        faults.push('Building ' + key + ': invalid finite production recipe references.');
    });
    return faults;
  };
  P.compilePrepared = function (bm) {
    var errors = P.catalogFaults(FBDATA), rows = bm && bm.productionSites, out = {sites:[],errors:errors};
    if (rows === undefined || errors.length) {
      if (FB.productionEconomy) errors.push.apply(errors,FB.productionEconomy.compilePrepared(bm,[]).errors);
      if (FB.maritimeWork) errors.push.apply(errors,FB.maritimeWork.compilePrepared(bm,[]).errors);
      if (FB.relayServices) errors.push.apply(errors,FB.relayServices.compilePrepared(bm,[]).errors);
      return out;
    }
    function fault(v) { errors.push('productionSites: ' + v); }
    if (!Array.isArray(rows) || rows.length > 128) { fault('requires at most 128 sites.'); return out; }
    var seen = {}, physical = {}, resource = FB.siteResources.compilePrepared(bm);
    if (resource.errors.length) errors.push.apply(errors,resource.errors);
    rows.forEach(function (a) {
      if (!keys(a,['id','countyId','siteId','buildingId','recipeIds','sourceId','openingLots']) || !id(a.id) || seen[a.id] ||
          !id(a.countyId) || !id(a.siteId) || !own(FBDATA.buildings,a.buildingId) || FB.isFortificationBuilding(a.buildingId) ||
          !Array.isArray(a.recipeIds) || !a.recipeIds.length || a.recipeIds.length > 16 || new Set(a.recipeIds).size !== a.recipeIds.length ||
          a.recipeIds.some(function (key) { return !own(FBDATA.productionRecipes,key); }) ||
          !Array.isArray(a.openingLots) || a.openingLots.length > 8 || a.openingLots.length && !amountRows(a.openingLots,FBDATA.productionGoods)) {
        fault('invalid asset, recipe or opening lot reference.'); return;
      }
      seen[a.id] = true;
      var county = (bm.provinces || []).find(function (p) { return p.id === a.countyId && !p.wasteland; });
      var slot = county && (county.settlements || []).findIndex(function (e) { return e.site === a.siteId; });
      var occurrence = (bm.provinces || []).reduce(function (n,p) { return n + (p.settlements || []).filter(function (e) { return e.site === a.siteId; }).length; },0);
      var place = JSON.stringify([a.siteId,a.buildingId]);
      if (!county || slot < 0 || occurrence !== 1 || physical[place]) { fault(a.id + ': requires one unique inhabited physical asset.'); return; }
      physical[place] = true;
      var water = a.recipeIds.some(function (key) { return !!FBDATA.productionRecipes[key].water; });
      var source = resource.sources.find(function (r) { return r.id === a.sourceId; });
      if (water ? !source || source.profile.unit !== 'water' || source.countyId !== a.countyId || source.siteId !== a.siteId : a.sourceId !== undefined)
        fault(a.id + ': water requires an actual co-located lawful source.');
      if (a.openingLots.length) {
        var inventory = bm.openingInfrastructure;
        if (!inventory || !(inventory.placements || []).some(function (r) {
          return r.countyId === a.countyId && r.siteId === a.siteId && r.buildingId === a.buildingId && r.condition === 'standing';
        })) fault(a.id + ': explicit opening lots require an explicit standing opening asset.');
      }
      out.sites.push(Object.assign(copy(a),{slot:slot}));
    });
    if (out.sites.reduce(function (n,a) { return n+a.openingLots.length; },0) > LIMIT) fault('opening lots exceed the global bound.');
    if (FB.productionEconomy) errors.push.apply(errors,FB.productionEconomy.compilePrepared(bm,out.sites).errors);
    if (FB.maritimeWork) {
      var maritime=FB.maritimeWork.compilePrepared(bm,out.sites);
      errors.push.apply(errors,maritime.errors);out.maritime=maritime.assignments;
    }
    if (FB.relayServices) errors.push.apply(errors,FB.relayServices.compilePrepared(bm,out.sites).errors);
    if (errors.length) out.sites = [];
    return out;
  };
  var cached;
  function plan(s) {
    var bm = FB.campaignBookmark(s), stamp = FB.mods.sig();
    if (!cached || cached.bookmark !== FBDATA.bookmarks[bm.id] || cached.revision !== bm.revision || cached.mod !== stamp)
      cached = {bookmark:FBDATA.bookmarks[bm.id],revision:bm.revision,mod:stamp,value:FB.compileProduction(bm)};
    return cached.value;
  }
  function definition(p) {
    var sites = p.sites.map(function (a) { var r = copy(a); delete r.slot; return r; });
    function structural(table) { var r=copy(table);Object.keys(r).forEach(function(k){delete r[k].name;delete r[k].desc;});return r; }
    return FB.mods.fingerprint([sites,structural(FBDATA.productionGoods),structural(FBDATA.productionRecipes)]);
  }
  function blank(p) { return {version:1,definition:definition(p),revision:0,nextId:1,assets:[],lots:[],batches:[]}; }
  function freshId(r) { return r.nextId++; }
  function built(s,a) { return (s.buildings[a.countyId] || []).find(function (b) { return b.s === a.slot && b.id === a.buildingId; }); }
  function original(s,who) {
    var p = actor(who) && FB.political.actor(s,who);
    return p ? {characterId:p.characterId,generation:who.kind === 'realm' ? p.rulerGeneration : null} : null;
  }
  function alive(s,cid) {
    var c = s.chars[cid];
    return !!c && !c.dead && !c.unfree && !c.imprisoned && !c.prisonerOf && !c.captive && !c.exiled &&
      FB.ageOf(c,s.date.year) >= 16 && (cid !== s.player.charId || !s.player.dead) && !(FB.justiceCustodyOf && FB.justiceCustodyOf(s,cid)) &&
      !(FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(s,cid));
  }
  function authority(s,a,who) {
    var person = original(s,who), holder = FB.settlementHolder(s,a.countyId,a.slot), b = built(s,a);
    var direct = FB.settlementConstructionAuthority(s,a.countyId,a.slot,who);
    return person && alive(s,person.characterId) && holder && (eq(holder,who) || direct.direct) &&
      !FB.recruitmentCountyBlocked(s,s.holder[a.countyId] || s.owner[a.countyId],a.countyId) && b && !b.ruined &&
      (!b.buildingProfile || FB.buildingProfiles.operationReady(s,a.countyId,b)) &&
      (!b.institutionBinding || FB.buildingInstitutionOperating(s,a.countyId,b)) ? person : null;
  }
  function payer(s,who) {
    // An inherited household crown without a separate public account pays privately.
    return who.kind === 'realm' && who.id === 'player' && !FB.treasuryPublicAccountSnapshot(s,who.id)
      ? {kind:'character',id:s.player.charId} : who;
  }
  function money(s,who) {
    who = payer(s,who);
    // Fiscal readers may normalize technology records; keep those writes detached.
    var fiscal = Object.assign({},s,{realmTech:copy(s.realmTech || {}),player:copy(s.player)});
    if (who.kind === 'realm') {
      var account = FB.treasuryPublicAccountSnapshot(s,who.id);
      if (!account) return {available:0,reserve:0,public:false};
      return {available:account.available,reserve:(FB.treasuryConstructionReserves(fiscal) || {})[who.id] || 0,public:true};
    }
    return {available:who.id === s.player.charId ? s.player.gold : FB.baronyConstructionFunds(fiscal,who.id),reserve:0,public:false};
  }
  function spend(s,who,amount) {
    who = payer(s,who);
    if (who.kind === 'realm') return FB.treasurySpend(s,who.id,amount);
    if (who.id !== s.player.charId) return FB.spendBaronyConstruction(s,who.id,amount,0);
    if (!Number.isFinite(s.player.gold) || s.player.gold < amount) return false;
    s.player.gold -= amount; return true;
  }
  P.account = function(s,who) { return {payer:copy(payer(s,who)),funds:money(s,who)}; };
  P.spend = spend;
  P.authority = authority;
  function worker(s,a,cid) {
    var c = s.chars[cid];
    if (!alive(s,cid) || FB.characterLocation(s,c) !== a.countyId || c.war || c.armyId ||
        Object.keys(s.player.familyOffices || {}).some(function(key){return s.player.familyOffices[key]===cid;}) ||
        (s.player.enterpriseLabor || []).some(function(row){return row.charId===cid;}) ||
        (s.player.enterprises || []).some(function (e) { return FB.enterpriseWorkerIds(e).indexOf(cid) >= 0; })) return false;
    var realmId=FB.realmIdForRulerCharacter(s,c);
    if (realmId && (s.armies || []).some(function(host){return host.realm===realmId && host.men>0;})) return false;
    if (cid === s.player.charId) return s.player.provinceId === a.countyId && !s.player.travel && !s.player.war && !(s.player.flags || {}).in_prison &&
      !FB.atWarPersonally(s) && !(FB.householdServiceRecord && FB.householdServiceRecord(s)) &&
      !(s.production && s.production.batches.some(function (b) { return b.workTurns.indexOf(s.turn) >= 0 && b.workerId === cid; }));
    return !(s.production && s.production.batches.some(function (b) { return b.workTurns.indexOf(s.turn) >= 0 && b.workerId === cid; }));
  }
  function enrolled(s,a,r) {
    var b = built(s,a), stamp = b && b.productionAsset;
    return stamp && r.assets.find(function (x) { return x.id === stamp.id && x.siteId === a.id; });
  }
  function newAsset(s,a,r,who) {
    var asset = {id:freshId(r),siteId:a.id,owner:copy(who),openedTurn:s.turn};
    r.assets.push(asset); built(s,a).productionAsset = {version:1,id:asset.id}; return asset;
  }
  P.initialize = function (s) {
    var p = plan(s);
    if (p.errors.length) throw new Error('Invalid production opening.');
    if (!p.sites.length || s.production !== undefined || s.turn !== 0) return;
    var r = blank(p);
    p.sites.forEach(function (a) {
      var who = FB.settlementHolder(s,a.countyId,a.slot), b = built(s,a);
      if (!who || !b || b.ruined) {
        if (a.openingLots.length) throw new Error('Production opening requires its actual standing asset.');
        return;
      }
      var asset = newAsset(s,a,r,who);
      a.openingLots.forEach(function (lot,index) {
        r.lots.push({id:freshId(r),assetId:asset.id,owner:copy(who),goodId:lot.goodId,unit:FBDATA.productionGoods[lot.goodId].unit,
          quantity:lot.quantity,remaining:lot.quantity,origin:{kind:'opening',index:index}});
      });
    });
    s.production = r;
    if (FB.productionEconomy) FB.productionEconomy.initialize(s);
    if (FB.relayServices) FB.relayServices.initialize(s);
  };
  // Construction enrolls an empty declared site. It never replays opening stock.
  P.enrollConstruction = function (s,pid,record,who) {
    if (!FBDATA.buildings[record.id] || !FBDATA.buildings[record.id].productionRecipeIds) return false;
    var a = plan(s).sites.find(function (x) { return x.countyId === pid && x.slot === record.s && x.buildingId === record.id; });
    if (!a || !FBDATA.buildings[record.id].productionRecipeIds || !s.production || record.productionAsset ||
        a.openingLots.length || s.production.assets.some(function (x) { return x.siteId === a.id; }) || built(s,a) !== record) return false;
    who = FB.settlementHolder(s,pid,record.s);
    if (!who) return false;
    var asset = newAsset(s,a,s.production,who);
    asset.constructed = true;
    s.production.revision++;return true;
  };
  P.industrialConstructionReady = function (s,pid,slot,buildingId,who,profileId) {
    var d = FB.buildingProfiles.definition(buildingId,profileId), required = d && d.productionRecipeIds;
    if (!required) return true;
    var p = plan(s), a = p.sites.find(function (x) { return x.countyId === pid && x.slot === slot && x.buildingId === buildingId; });
    if (p.errors.length || d.operationProfile || d.institutionProfile || !a || built(s,a) || a.openingLots.length || !s.production || !s.production.economy ||
        s.production.assets.length >= 128 || s.production.nextId >= MAX - 10 || s.production.revision >= MAX - 10 ||
        s.production.assets.some(function (x) { return x.siteId === a.id; }) ||
        !a.recipeIds.every(function (key) { return required.indexOf(key) >= 0; })) return false;
    var holder = FB.settlementHolder(s,pid,slot);
    if (!holder || !eq(P.account(s,holder).payer,P.account(s,who).payer)) return false;
    // All speculative acquisition is detached and uses the ordinary exact quotes.
    return a.recipeIds.some(function (key) {
      var t = copy(s), recipe = FBDATA.productionRecipes[key], rows = t.buildings[pid] = t.buildings[pid] || [];
      var cost = FB.buildCost(t,pid,buildingId,who.kind === 'realm' ? who.id : who.id === t.player.charId ? undefined : t.holder[pid],profileId);
      var record = {s:slot,id:buildingId};FB.buildingProfiles.attach(record,profileId);rows.push(record);
      if (!P.enrollConstruction(t,pid,record,who)) return false;
      if (!P.spend(t,who,cost + (d.upkeep || 0) * (FBDATA.balance.realmReserveSeasons || 2))) return false;
      var routes = FB.productionEconomy.compilePrepared(FB.campaignBookmark(t),p.sites).routes;
      var supplied = recipe.inputs.every(function (input) {
        var left = input.quantity;
        routes.filter(function (route) { return route.toSiteId === a.id && FBDATA.productionExchangeProfiles[route.profileId].goodId === input.goodId; })
          .some(function (route) {
            var profile = FBDATA.productionExchangeProfiles[route.profileId];
            var q = FB.productionEconomy.aiQuote(t,route.id,left,profile.mode === 'owned' ? 'transfer' : 'buy');
            if (!q.allowed || !FB.productionEconomy.commit(t,q)) return false;
            left = 0;return true;
          });
        return !left;
      });
      if (!supplied || !P.aiQuote(t,a.id,'reserve',{recipeId:key,disposition:'store'}).allowed) return false;
      return P.outletReady(t,a.id,recipe.outputs);
    });
  };
  P.outletReady = function (s,siteId,outputs) {
    var r = s.production;
    if (!FB.productionEconomy || !r || !r.economy || r.economy.receipts.length >= LIMIT || r.nextId >= MAX - 4 || r.revision >= MAX ||
        r.lots.length + outputs.length + r.batches.reduce(function(n,b){return n+(b.status==='reserved'?FBDATA.productionRecipes[b.recipeId].outputs.length:0);},0) >= LIMIT) return false;
    var p = plan(s), routes = FB.productionEconomy.compilePrepared(FB.campaignBookmark(s),p.sites).routes;
    return outputs.every(function (output) {
      return routes.some(function (route) {
        var profile = FBDATA.productionExchangeProfiles[route.profileId];
        if (route.fromSiteId !== siteId || profile.goodId !== output.goodId || profile.mode !== 'market') return false;
        var q = FB.productionEconomy.aiQuote(s,route.id,output.quantity,'sell');
        var funds = q.buyer && P.account(s,q.buyer).funds;
        return !!q.signature && q.remainingDemand >= output.quantity && q.remainingBudget >= q.cost &&
          funds && funds.available >= q.cost + funds.reserve;
      });
    });
  };
  function reservationTotals(r) {
    var held=FB.maritimeWork ? FB.maritimeWork.reservations({production:r}) : {};
    if (r) r.batches.forEach(function(b){if(b.status==='reserved')b.inputs.forEach(function(x){held[x.lotId]=(held[x.lotId] || 0)+x.quantity;});});
    return held;
  }
  P.snapshot = function (s,countyId,siteId) {
    var p = plan(s), r = s.production, held=reservationTotals(r);
    return p.sites.filter(function (a) { return (!countyId || a.countyId === countyId) && (!siteId || a.siteId === siteId); }).map(function (a) {
      var asset = r && enrolled(s,a,r);
      return {site:copy(a),asset:asset ? copy(asset) : null,lots:asset ? r.lots.filter(function (x) { return x.assetId === asset.id; }).map(function (x) {
        return Object.assign(copy(x),{available:Math.max(0,FB.buildingSeasons.lotAvailable(s,x)-(held[x.id] || 0))});
      }) : [],batches:r ? r.batches.filter(function (b) { return b.siteId === a.id; }).map(copy) : []};
    });
  };
  P.quote = function (s,request) {
    var q = {allowed:false,reason:'request',request:object(request) ? copy(request) : null};
    if (!keys(request,['operation','siteId','actor','recipeId','disposition','batchId']) || !actor(request.actor) ||
        !id(request.siteId) || ['reserve','work','finish','cancel'].indexOf(request.operation) < 0) return q;
    var p = plan(s), a = p.sites.find(function (x) { return x.id === request.siteId; });
    if (p.errors.length || !a) return q;
    P.validate(s);
    FB.buildingSeasons.validate(s);
    var r = s.production, held=reservationTotals(r), batch = r && r.batches.find(function (x) { return x.id === request.batchId; });
    var who = original(s,request.actor), auth = authority(s,a,request.actor), asset = r && enrolled(s,a,r);
    q.reason = auth && !FB.buildingSeasons.ready(s,'productionSiteId',a.id,request.actor) ? 'season' : 'authority';
    if (batch && batch.payer) q.payer=copy(batch.payer);
    if (request.operation === 'cancel') {
      if (request.recipeId !== undefined || request.disposition !== undefined) return q;
      q.allowed = !!batch && batch.status === 'reserved' && batch.siteId === a.id && eq(batch.actor,request.actor) &&
        who && who.characterId === batch.workerId && who.generation === batch.generation && alive(s,who.characterId);
      if (batch && batch.waterClaimId !== null) q.water = FB.siteResources.quote(s,{operation:'release',
        sourceId:a.sourceId,actor:request.actor,reservationId:batch.waterClaimId});
    } else if (auth && FB.buildingSeasons.ready(s,'productionSiteId',a.id,request.actor)) {
      var recipe = FBDATA.productionRecipes[request.operation === 'reserve' ? request.recipeId : batch && batch.recipeId];
      if (!recipe || a.recipeIds.indexOf(request.operation === 'reserve' ? request.recipeId : batch.recipeId) < 0) return q;
      var techRealm = FB.techRealmId(s,request.actor.kind === 'realm' ? request.actor.id : s.holder[a.countyId]);
      var known = s.realmTech && s.realmTech[techRealm];
      q.missingTech = recipe.requiresTech.filter(function (key) { return !known || !Array.isArray(known.completed) || known.completed.indexOf(key) < 0; });
      q.cost = recipe.workPrice;
      if (request.operation === 'reserve') {
        if (request.batchId !== undefined || ['store','use'].indexOf(request.disposition) < 0) return q;
        q.reason = 'inputs'; q.inputs = [];
        recipe.inputs.forEach(function (input) {
          var left = input.quantity;
          (r && r.lots || []).filter(function (lot) { return asset && lot.assetId === asset.id && eq(lot.owner,request.actor) && lot.goodId === input.goodId; }).forEach(function (lot) {
            var n = Math.min(left,FB.buildingSeasons.lotAvailable(s,lot)-(held[lot.id] || 0));
            if (n > 0) { q.inputs.push({lotId:lot.id,quantity:n});left -= n; }
          });
          if (left) q.short = true;
        });
        var funds = money(s,request.actor); q.funds = funds; q.payer = copy(payer(s,request.actor));
        if (recipe.water) q.water = FB.siteResources.quote(s,{operation:'reserve',sourceId:a.sourceId,actor:request.actor,amount:recipe.water});
        q.allowed = !!r && !!asset && eq(asset.owner,request.actor) && !q.short && (!q.water || q.water.allowed) &&
          !q.missingTech.length && worker(s,a,auth.characterId) && funds.available >= recipe.workPrice + funds.reserve &&
          r.batches.length < LIMIT && r.lots.length + recipe.outputs.length + r.batches.reduce(function(n,b){return n+(b.status==='reserved'?FBDATA.productionRecipes[b.recipeId].outputs.length:0);},0) <= LIMIT && r.assets.length <= 128 &&
          !r.batches.some(function (b) { return b.status === 'reserved' && b.assetId === asset.id; });
        if (recipe.requiresSale && (request.disposition !== 'store' || !P.outletReady(s,a.id,recipe.outputs))) {
          q.allowed = false;q.reason = 'outlet';
        }
        if (q.missingTech.length) q.reason='tech';
        else if (!q.allowed && !q.short && q.reason !== 'outlet') q.reason = q.missingTech.length ? 'tech' : !worker(s,a,auth.characterId) ? 'work' : 'funds';
      } else {
        if (request.recipeId !== undefined || request.disposition !== undefined) return q;
        q.reason = 'batch';
        q.allowed = !!batch && batch.status === 'reserved' && batch.siteId === a.id && eq(batch.actor,request.actor) &&
          auth.characterId === batch.workerId && auth.generation === batch.generation && asset && asset.id === batch.assetId;
        // Already funded work retains its original recipe and technology terms.
        if (q.allowed && request.operation === 'work') q.allowed = batch.workTurns.length < recipe.workDays && worker(s,a,batch.workerId);
        if (q.allowed && request.operation === 'finish') q.allowed = batch.workTurns.length === recipe.workDays &&
          FB.characterLocation(s,s.chars[batch.workerId])===a.countyId &&
          (batch.workerId!==s.player.charId || !s.player.travel && s.player.provinceId===a.countyId);
        if (q.allowed && batch.inputs.some(function(x){var lot=r.lots.find(function(l){return l.id===x.lotId;});return FB.buildingSeasons.lotAvailable(s,lot)<x.quantity;})) q.allowed=false;
        if (batch && batch.waterClaimId !== null) {
          q.water = FB.siteResources.quote(s,{operation:'consume',sourceId:a.sourceId,actor:request.actor,reservationId:batch.waterClaimId});
          var sourceRow=FB.siteResources.snapshot(s,a.countyId,a.siteId).find(function(row){return row.id===a.sourceId;});
          var actualClaim=sourceRow && sourceRow.reservations.find(function(c){return c.id===batch.waterClaimId;});
          q.allowed = q.allowed && q.water.allowed && actualClaim && actualClaim.amount===recipe.water && sourceRow.period===batch.waterPeriod;
        }
      }
    }
    if (r && (!int(r.nextId,1,MAX-16) || !int(r.revision,0,MAX-1))) q.allowed = false;
    q.allowed = !!q.allowed;
    q.reason = q.allowed ? null : q.reason;
    q.signature = JSON.stringify([s.turn,p.sites,r || null,request,auth,who,built(s,a),q.inputs,q.water,q.funds,q.missingTech,q.allowed,
      FBDATA.productionRecipes,FBDATA.productionGoods]);
    return q;
  };
  /* Transactions stage only their owned ledgers and payment accounts. */
  function shadow(s) {
    var t = Object.assign({},s,{production:copy(s.production),player:Object.assign({},s.player),realms:{}});
    Object.keys(s.realms).forEach(function (key) { t.realms[key] = Object.assign({},s.realms[key]);
      if (s.realms[key].treasury) t.realms[key].treasury = copy(s.realms[key].treasury); });
    t.realmTech=copy(s.realmTech || {});
    if (s.siteResources !== undefined) t.siteResources = copy(s.siteResources);
    if (s.settlementLordships) t.settlementLordships = Object.assign({},s.settlementLordships,{accounts:copy(s.settlementLordships.accounts || {})});
    return t;
  }
  function transact(s,review,day) {
    if (!review || !review.allowed) return false;
    var q = P.quote(s,review.request);
    if (!q.allowed || q.signature !== review.signature) return false;
    var request = q.request, p = plan(s), a = p.sites.find(function (x) { return x.id === request.siteId; });
    var person = original(s,request.actor);
    if (request.operation === 'work' && person.characterId === s.player.charId && !day) return false;
    var t = shadow(s), r = t.production, result = true, batch = r.batches.find(function (b) { return b.id === request.batchId; });
    if (request.operation === 'reserve') {
      var recipe = FBDATA.productionRecipes[request.recipeId], claim = null;
      if (q.water) { claim = FB.siteResources.commit(t,q.water); if (!claim) return false; }
      if (!spend(t,request.actor,recipe.workPrice)) return false;
      result = freshId(r);
      r.batches.push({id:result,siteId:a.id,assetId:enrolled(t,a,r).id,recipeId:request.recipeId,actor:copy(request.actor),
        workerId:person.characterId,generation:person.generation,inputs:copy(q.inputs),outputs:[],disposition:request.disposition,
        paid:recipe.workPrice,payer:copy(payer(s,request.actor)),waterClaimId:claim,waterPeriod:claim === null ? null : FB.siteResources.snapshot(t,a.countyId,a.siteId).find(function (row) { return row.id === a.sourceId; }).period,status:'reserved',openedTurn:s.turn,closedTurn:null,workTurns:[]});
    } else if (request.operation === 'work') batch.workTurns.push(s.turn);
    else if (request.operation === 'cancel') {
      if (q.water && q.water.allowed) {
        var release = FB.siteResources.quote(t,{operation:'release',sourceId:a.sourceId,actor:request.actor,reservationId:batch.waterClaimId});
        if (release.allowed && !FB.siteResources.commit(t,release)) return false;
      }
      batch.status = 'cancelled'; batch.closedTurn = s.turn;
    } else {
      if (q.water && !FB.siteResources.commit(t,q.water)) return false;
      batch.inputs.forEach(function (x) { r.lots.find(function (lot) { return lot.id === x.lotId; }).remaining -= x.quantity; });
      FBDATA.productionRecipes[batch.recipeId].outputs.forEach(function (x) {
        var lotId = freshId(r);batch.outputs.push(lotId);
        r.lots.push({id:lotId,assetId:batch.assetId,owner:copy(batch.actor),goodId:x.goodId,unit:FBDATA.productionGoods[x.goodId].unit,
          quantity:x.quantity,remaining:batch.disposition === 'store' ? x.quantity : 0,origin:{kind:'batch',batchId:batch.id}});
      });
      batch.status = 'committed';batch.closedTurn = s.turn;
    }
    r.revision++;
    s.production = r;
    if (q.water || request.operation === 'cancel') { if (t.siteResources !== undefined) s.siteResources = t.siteResources; }
    if (request.operation === 'reserve') {
      s.player.gold = t.player.gold;
      Object.keys(s.realms).forEach(function (key) { if (t.realms[key].treasury) s.realms[key].treasury = t.realms[key].treasury; });
      if (t.settlementLordships) s.settlementLordships.accounts = t.settlementLordships.accounts;
    }
    return result;
  }
  // Trusted boundary cancellation retains paid work and property; expired inputs produce no output.
  P.expireSeasonalBatch = function(s,batchId) {
    var b=s.production && s.production.batches.find(function(x){return x.id===batchId;});
    if (!b || b.status!=='reserved' || !b.inputs.some(function(x){var l=s.production.lots.find(function(y){return y.id===x.lotId;});return FB.buildingSeasons.lotAvailable(s,l)===0 && l.remaining>0;})) return false;
    var a=plan(s).sites.find(function(x){return x.id===b.siteId;});
    if (b.waterClaimId!==null) {
      var q=FB.siteResources.quote(s,{operation:'release',sourceId:a.sourceId,actor:b.actor,reservationId:b.waterClaimId});
      if(q.allowed) FB.siteResources.commit(s,q);
    }
    b.status='cancelled';b.closedTurn=s.turn;s.production.revision++;return true;
  };
  P.aiQuote = function (s,siteId,operation,terms) {
    var a=plan(s).sites.find(function(x){return x.id===siteId;});
    return P.quote(s,Object.assign({},terms || {},{siteId:siteId,operation:operation,actor:a && FB.settlementHolder(s,a.countyId,a.slot)}));
  };
  P.commit = function (s,q) { return transact(s,q,false); };
  P.commitDay = function (s,q) {
    var who=q && q.request && original(s,q.request.actor);
    return !!who && who.characterId===s.player.charId && q.request.operation === 'work' && transact(s,q,true);
  };
  P.perform = function (s,q) {
    if (q && q.request.operation === 'work' && original(s,q.request.actor) && original(s,q.request.actor).characterId === s.player.charId) {
      var before = s.production.revision;
      FB.game.passDay({skipFocus:true,productionAction:q});
      return s.production.revision !== before;
    }
    return P.commit(s,q);
  };
  P.reason = function (q) {
    if (q.reason === 'season') return FB.T('Review the local seasonal operating term before reserving or working this batch.');
    if (q.allowed) return FB.T('Current terms are available. Processing costs are non-refundable; only completed paid work can produce the declared output.');
    if (q.reason === 'tech') return FB.T('Missing technology: {tech}.',{tech:(q.missingTech || []).map(function (key) { return FB.dataText(FB.state,FB.state.player.charId,'tech',key,FBDATA.tech[key],'name',{}); }).join(', ')});
    if (q.reason === 'inputs') return FB.T('The actual asset needs enough owned, unreserved input lots and lawful water.');
    if (q.reason === 'work') return FB.T('One available local adult must spend an ordinary action day, without enterprise, service or military work.');
    if (q.reason === 'outlet') return FB.T('Store this batch for a declared real buyer with current cash, reserves and remaining demand. Immediate use grants no sale or benefit.');
    if (q.reason === 'funds') return FB.T('The same lawful payer needs the full processing cost and ordinary reserves, with no other pending batch at this asset.');
    if (q.reason === 'batch') return FB.T('The original batch, worker, asset and authority must remain available. Complete each workday before finishing.');
    return FB.T('A living lawful asset holder, the original owner and an actual standing building are required.');
  };

  P.validate = function (s) {
    function fail() { throw new Error(FB.T('Invalid saved production inventory or batch.')); }
    var r = s.production, stamps = [];
    Object.keys(s.buildings || {}).forEach(function (pid) {
      (s.buildings[pid] || []).forEach(function (b) { if (b.productionAsset !== undefined) stamps.push({pid:pid,b:b}); });
    });
    if (r === undefined) { var bm=FB.campaignBookmark(s);if (stamps.length || bm && (bm.relayServiceAssignments || []).length) fail();return true; }
    var p = plan(s), originalAssets = FB.compileOpeningInfrastructure(FB.campaignBookmark(s)), siteTable = {}, assets = {}, lots = {}, batches = {}, seen = {}, work = {}, claims = {}, used = {}, openings = {};
    if (p.errors.length || !keys(r,['version','definition','revision','nextId','assets','lots','batches','economy','maritime','relay']) || r.version !== 1 ||
        r.definition !== definition(p) || !int(r.revision,0,MAX) || !int(r.nextId,1,MAX) ||
        !Array.isArray(r.assets) || r.assets.length > 128 || !Array.isArray(r.lots) || r.lots.length > LIMIT ||
        !Array.isArray(r.batches) || r.batches.length > LIMIT) fail();
    p.sites.forEach(function (a) { siteTable[a.id] = a; });
    function identity(who) {
      return actor(who) && (who.kind === 'character' ? own(s.chars,who.id) : own(s.realms,who.id));
    }
    function unique(key) { if (!int(key,1,r.nextId-1) || seen[key]) fail();seen[key]=true; }
    r.assets.forEach(function (a) {
      if (!keys(a,['id','siteId','owner','openedTurn','constructed']) || !siteTable[a.siteId] || !identity(a.owner) || !int(a.openedTurn,0,s.turn) || openings[a.siteId]) fail();
      var d=siteTable[a.siteId],opening=originalAssets.placements.find(function(x){return x.countyId===d.countyId && x.siteId===d.siteId && x.buildingId===d.buildingId && x.condition==='standing';});
      if (own(a,'constructed') ? a.constructed !== true || d.openingLots.length || !FBDATA.buildings[d.buildingId].productionRecipeIds ||
          !d.recipeIds.every(function (key) { return FBDATA.buildings[d.buildingId].productionRecipeIds.indexOf(key) >= 0; }) :
          a.openedTurn !== 0 || !opening || !eq(a.owner,{kind:'realm',id:FB.startRealmId(s,opening.holderId)})) fail();
      unique(a.id);assets[a.id]=a;openings[a.siteId]=a;
    });
    var stampIds = {};
    stamps.forEach(function (x) {
      var stamp=x.b.productionAsset,a=stamp && assets[stamp.id],d=a && siteTable[a.siteId];
      if (!keys(stamp,['version','id']) || stamp.version !== 1 || !a || stamp.id!==a.id || stampIds[a.id] ||
          x.pid !== d.countyId || x.b.id !== d.buildingId || x.b.s !== d.slot) fail();
      stampIds[a.id] = true;
    });
    r.lots.forEach(function (lot) {
      var asset = lot && assets[lot.assetId],good=lot && FBDATA.productionGoods[lot.goodId];
      if (!keys(lot,['id','assetId','owner','goodId','unit','quantity','remaining','origin']) || !asset ||
          lot.assetId!==asset.id || !identity(lot.owner) || !eq(lot.owner,asset.owner) || !good || lot.unit !== good.unit ||
          !int(lot.quantity,1,10000) || !int(lot.remaining,0,lot.quantity) || !object(lot.origin) || asset.id >= lot.id) fail();
      unique(lot.id);lots[lot.id]=lot;used[lot.id]=0;
      if (lot.origin.kind === 'opening') {
        var a=siteTable[asset.siteId],index=lot.origin.index,initial=a.openingLots[index];
        if (!keys(lot.origin,['kind','index']) || !int(index,0,7) || !initial || initial.goodId !== lot.goodId || initial.quantity !== lot.quantity ||
            own(openings,asset.siteId + ':' + index)) fail();
        openings[asset.siteId + ':' + index]=lot.id;
      } else if (lot.origin.kind === 'exchange' || lot.origin.kind === 'producer') {
        if (!keys(lot.origin,['kind','receiptId']) || !int(lot.origin.receiptId,1,lot.id-1) || !r.economy) fail();
      } else if (!keys(lot.origin,['kind','batchId']) || lot.origin.kind !== 'batch' || !int(lot.origin.batchId,1,lot.id-1)) fail();
    });
    p.sites.forEach(function (a) {
      a.openingLots.forEach(function (lot,index) { if (!own(openings,a.id+':'+index)) fail(); });
    });
    r.batches.forEach(function (b) {
      var asset=b && assets[b.assetId],site=asset && siteTable[asset.siteId],recipe=b && FBDATA.productionRecipes[b.recipeId];
      if (!keys(b,['id','siteId','assetId','recipeId','actor','workerId','generation','inputs','outputs','disposition','paid','payer','waterClaimId','waterPeriod','status','openedTurn','closedTurn','workTurns']) ||
          !asset || b.assetId!==asset.id || asset.siteId !== b.siteId || !recipe || site.recipeIds.indexOf(b.recipeId) < 0 ||
          !identity(b.actor) || !eq(b.actor,asset.owner) || !own(s.chars,b.workerId) || !identity(b.payer) ||
          !(eq(b.payer,b.actor) || b.actor.kind === 'realm' && b.actor.id === 'player' && b.payer.kind === 'character' && b.payer.id === b.workerId) ||
          (b.actor.kind === 'character' ? b.actor.id !== b.workerId || b.generation !== null : !int(b.generation,0,FB.realmRulerGeneration(s,b.actor.id))) ||
          ['reserved','committed','cancelled'].indexOf(b.status) < 0 || ['store','use'].indexOf(b.disposition) < 0 || b.paid !== recipe.workPrice ||
          !int(b.openedTurn,asset.openedTurn,s.turn) || (b.status === 'reserved' ? b.closedTurn !== null : !int(b.closedTurn,b.openedTurn,s.turn)) ||
          !Array.isArray(b.workTurns) || b.workTurns.length > recipe.workDays || !Array.isArray(b.inputs) || !b.inputs.length || b.inputs.length > LIMIT ||
          !Array.isArray(b.outputs) || b.outputs.length !== (b.status === 'committed' ? recipe.outputs.length : 0) ||
          b.status === 'committed' && b.workTurns.length !== recipe.workDays || asset.id >= b.id) fail();
      unique(b.id);batches[b.id]=b;
      var prior=-1;
      b.workTurns.forEach(function (turn) {
        var key=JSON.stringify([b.workerId,turn]);
        if (!int(turn,b.openedTurn,b.closedTurn === null ? s.turn : b.closedTurn) || turn <= prior || work[key]) fail();
        work[key]=true;prior=turn;
      });
      if (recipe.water) {
        var source=FB.siteResources.compile(FB.campaignBookmark(s)).sources.find(function (x) {return x.id===site.sourceId;});
        var periodDays=source && source.profile.periodDays;
        var waterKey=b.waterClaimId;
        if (!source || !s.siteResources || !int(b.waterClaimId,1,s.siteResources.nextId-1) || claims[waterKey] ||
            b.waterPeriod !== (periodDays ? Math.floor(b.openedTurn/periodDays) : null) ||
            b.status === 'committed' && periodDays && Math.floor(b.closedTurn/periodDays) !== b.waterPeriod) fail();
        var sourceState=s.siteResources.sources[site.sourceId];
        var claim=sourceState && sourceState.period===b.waterPeriod && sourceState.reservations.find(function(c){return c.id===b.waterClaimId;});
        if (claim && (b.status!=='reserved' || claim.amount!==recipe.water || !eq(claim.actor,b.actor) || claim.characterId!==b.workerId || claim.generation!==b.generation)) fail();
        claims[waterKey]=true;
      } else if (b.waterClaimId !== null || b.waterPeriod !== null) fail();
      var amounts={},inputIds={};
      b.inputs.forEach(function (x) {
        var lot=lots[x.lotId];
        if (!keys(x,['lotId','quantity']) || !lot || lot.id!==x.lotId || inputIds[x.lotId] || lot.id >= b.id || lot.assetId !== b.assetId ||
            !eq(lot.owner,b.actor) || !int(x.quantity,1,lot.quantity)) fail();
        inputIds[x.lotId]=true;
        if (b.status === 'committed' && b.closedTurn >= FB.buildingSeasons.lotExpiry(s,lot)) fail();
        amounts[lot.goodId]=(amounts[lot.goodId] || 0)+x.quantity;
        if (b.status === 'committed') used[lot.id]+=x.quantity;
      });
      if (Object.keys(amounts).length !== recipe.inputs.length || recipe.inputs.some(function (x) { return amounts[x.goodId] !== x.quantity; })) fail();
      b.outputs.forEach(function (key,index) {
        var lot=lots[key],expected=recipe.outputs[index];
        if (!lot || lot.id!==key || lot.origin.kind !== 'batch' || lot.origin.batchId !== b.id || lot.assetId !== b.assetId ||
            lot.goodId !== expected.goodId || lot.quantity !== expected.quantity || !eq(lot.owner,b.actor)) fail();
        if (b.disposition === 'use') used[key]+=lot.quantity;
      });
    });
    r.batches.forEach(function(b){b.inputs.forEach(function(x){
      var lot=lots[x.lotId],origin=lot.origin;
      if(origin.kind==='batch' && (!batches[origin.batchId] || batches[origin.batchId].closedTurn>b.openedTurn))fail();
    });});
    var economic = FB.productionEconomy ? FB.productionEconomy.validate(s) : {ids:[],used:{},revision:0};
    economic.ids.forEach(unique);
    Object.keys(economic.used).forEach(function(key){ if (!lots[key]) fail(); used[key]+=economic.used[key]; });
    if (FB.siegeSupport) FB.siegeSupport.validate(s);
    var maritime=FB.maritimeWork ? FB.maritimeWork.validate(s) : {ids:[],used:{},revision:0};
    maritime.ids.forEach(unique);
    Object.keys(maritime.used).forEach(function(key){if(!lots[key])fail();used[key]+=maritime.used[key];});
    var relay = FB.relayServices ? FB.relayServices.validate(s) : {ids:[],used:{},revision:0};
    relay.ids.forEach(unique);
    Object.keys(relay.used).forEach(function(key){ if (!lots[key]) fail(); used[key]+=relay.used[key]; });
    var held=reservationTotals(r);
    r.lots.forEach(function (lot) {
      if (lot.origin.kind === 'batch') {
        var b=batches[lot.origin.batchId];
        if (!b || b.status !== 'committed' || b.outputs.indexOf(lot.id) < 0) fail();
      }
      if (lot.quantity-lot.remaining !== used[lot.id]+FB.buildingSeasons.debited(s,lot.id)+(FB.siegeSupport ? FB.siegeSupport.debited(s,lot.id) : 0) || (held[lot.id] || 0)>lot.remaining) fail();
    });
    var delivered={};
    r.batches.forEach(function(b){
      if(b.status!=='committed' || b.waterClaimId===null)return;
      var a=siteTable[b.siteId],row=s.siteResources.sources[a.sourceId];
      if(row && row.period===b.waterPeriod && b.waterPeriod!==null) {
        delivered[a.sourceId]=(delivered[a.sourceId] || 0)+FBDATA.productionRecipes[b.recipeId].water;
        if(delivered[a.sourceId]>row.consumed)fail();
      }
    });
    var pending={};
    r.batches.forEach(function(b){if(b.status==='reserved'){if(pending[b.assetId])fail();pending[b.assetId]=true;}});
    if (Object.keys(seen).length !== r.nextId-1 || r.revision !== r.assets.filter(function(a){return a.constructed;}).length+r.batches.reduce(function(n,b){return n+1+b.workTurns.length+(b.status==='reserved'?0:1);},0)+economic.revision+maritime.revision+relay.revision) fail();
    return true;
  };
})();
