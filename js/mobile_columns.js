/* Optional bounded opening partitions. Armies own deployed people, units,
   position and food; the column set owns identity, opening provenance and command scope. */
(function () {
  'use strict';
  var M=FB.mobile;
  function copy(v) {return JSON.parse(JSON.stringify(v));}
  function own(v,k) {return !!v && Object.prototype.hasOwnProperty.call(v,k);}
  function keys(v,list) {return !!v && typeof v==='object' && !Array.isArray(v) &&
    Object.keys(v).length===list.length && Object.keys(v).every(function (k) {return list.indexOf(k)>=0;});}
  function whole(n) {return Number.isSafeInteger(n) && n>=0;}
  function openingLocationValid(v,bookmark) {
    if (!v || !keys(v,own(v,'siteId') ? ['countyId','siteId'] : ['countyId'])) return false;
    var county=(bookmark.provinces || []).filter(function (p) {return p.id===v.countyId;})[0];
    return !!county && !county.wasteland && (!own(v,'siteId') ||
      FB.householdStories.localityValid({provinceId:v.countyId,siteId:v.siteId},bookmark));
  }
  /* Connectivity is a fresh-position preflight, never a completed journey.
     The camp origin retains its legacy entry rules. Every remote county on
     the connected footprint needs actual access or existing hostility. */
  function openingLocationsAllowed(s,d) {
    var t=d.mobile, explicit=t.columns.entries.filter(function (c) {return own(c,'openingLocation');});
    if (!explicit.length) return true;
    var hosted=M.hostedAccessPlan(s,[d]);
    if (!hosted.allowed) return false;
    var grant=hosted.grants[d.id], seen=Object.create(null), queue=[t.origin], world=FB.world;
    seen[t.origin]=true;
    for (var i=0;i<queue.length;i++) {
      Object.keys(world.adj[queue[i]] || {}).forEach(function (pid) {
        if (seen[pid] || !world.byId[pid] || world.byId[pid].wasteland || !s.owner[pid]) return;
        if (s.owner[pid]!==d.id && !(grant && grant.countyIds.indexOf(pid)>=0) &&
            !FB.armiesHostile(s,{realm:d.id},{realm:s.owner[pid]})) return;
        seen[pid]=true;queue.push(pid);
      });
    }
    return explicit.every(function (c) {
      var location=c.openingLocation, info=world.sitesByProv[location.countyId];
      return !!seen[location.countyId] && (!own(location,'siteId') || !!info &&
        info.list.some(function (site) {return site.site===location.siteId;}));
    });
  }
  function definition(s,rid) {
    var d=(FB.campaignBookmark(s).realms || []).filter(function (v) {return v.id===rid;})[0];
    return d && d.mobile && d.mobile.columns;
  }
  function hostId(rid,id,index) {return index ? 'column_'+rid+'_'+id : 'following_'+rid;}
  function live(s,c) {return !!c && !c.dead && !c.prisonerOf && !c.captive && !c.imprisoned && !c.exiled &&
    !(FB.justiceCustodyOf && FB.justiceCustodyOf(s,c.id));}
  M.columnHostOwned = function (s,rid,army) {
    var r=M.row(s,rid), set=r && r.columns;
    return !!(army && set && Array.isArray(set.entries) && set.entries.some(function (c) {
      return c && c.status==='active' && c.hostId===army.id && army.realm===rid;
    }));
  };
  M.columnSnapshot = function (s,rid) {
    var r=M.row(s,rid), moving=M.migration(s,rid);
    if (!r || !r.columns || !moving) return null;
    return {realmId:rid,campProvinceId:moving.at,campFood:r.food,entries:r.columns.entries.map(function (c) {
      var host=(s.armies || []).filter(function (a) {return a.id===c.hostId && a.realm===rid && a.mobileFollowing;})[0];
      return {id:c.id,hostId:c.hostId,commanderId:c.commanderId,status:c.status,
        effective:!!host && c.status==='active' && M.commandValid(s,rid) && live(s,s.chars[c.commanderId]) &&
          r.members.some(function (m) {return m.allegiance && m.principal.id===c.commanderId;}),
        host:host ? copy(host) : null};
    })};
  };
  /* Scope alone is not a movement/reorganization transaction. Both ordinary
     AI and player callers can inspect exactly the same current authority. */
  M.columnAuthority = function (s,rid,columnId,actor) {
    var snap=M.columnSnapshot(s,rid), c=snap && snap.entries.filter(function (v) {return v.id===columnId;})[0];
    var leader=M.leader(s,rid);
    return !!(c && c.effective && keys(actor,['kind','id']) && actor.kind==='character' &&
      (actor.id===c.commanderId || leader && actor.id===leader.id));
  };
  var faults=M.definitionFaults;
  M.definitionFaults = function (d,formId,provinces,realms,profiles,bookmark) {
    var errors=faults(d,formId,provinces,realms,profiles,bookmark), t=d.mobile, set=t && t.columns;
    if (errors.length || set===undefined) return errors;
    function fail() {return errors.concat(FB.T('Invalid mobile column declaration.'));}
    var p=(profiles || FBDATA.mobileProfiles)[t.profileId];
    if (!t.command || !t.opening || !keys(set,['schema','entries']) || set.schema!==1 ||
        !Array.isArray(set.entries) || set.entries.length<2 || set.entries.length>4) return fail();
    var ids=Object.create(null), commanders=Object.create(null), allocations=Object.create(null), food=0, bad=false;
    t.opening.muster.forEach(function (v) {allocations[v.memberId+'|'+v.unitId]=v.count;});
    set.entries.forEach(function (c,index) {
      if (!keys(c,['id','commanderMemberId','muster','food'].concat(own(c,'openingLocation') ? ['openingLocation'] : [])) ||
          own(c,'openingLocation') && !openingLocationValid(c.openingLocation,bookmark) || typeof c.id!=='string' ||
          !/^[a-z][a-z0-9_]{0,47}$/.test(c.id) || ids[c.id] || hostId(d.id,c.id,index).length>160 ||
          typeof c.commanderMemberId!=='string' || commanders[c.commanderMemberId] ||
          !t.opening.principals.some(function (b) {return b.memberId===c.commanderMemberId;}) ||
          !Array.isArray(c.muster) || !c.muster.length || c.muster.length>64 ||
          !Number.isFinite(c.food) || c.food<0) {bad=true;return;}
      ids[c.id]=true;commanders[c.commanderMemberId]=true;
      var pairs=Object.create(null), men=0;
      c.muster.forEach(function (v) {
        if (!keys(v,['memberId','unitId','count']) || !whole(v.count) || !v.count ||
            typeof v.memberId!=='string' || typeof v.unitId!=='string') {bad=true;return;}
        var pair=v.memberId+'|'+v.unitId;
        if (pairs[pair] || !own(allocations,pair) || v.count>allocations[pair]) {bad=true;return;}
        pairs[pair]=true;allocations[pair]-=v.count;men+=v.count;
      });
      if (men<(FBDATA.balance.armyMinMen || 40) || c.food>men*p.foodPerPerson*(p.supplyPolicy ? p.supplyPolicy.carryDays : 30)) bad=true;
      food+=c.food;
    });
    var allHosts=Object.create(null);
    (bookmark.realms || []).forEach(function (other) {
      var columns=other.mobile && other.mobile.columns;
      var names=columns && Array.isArray(columns.entries) ? columns.entries.map(function (c,i) {
        return c && typeof c.id==='string' ? hostId(other.id,c.id,i) : null;
      }) : other.mobile ? ['following_'+other.id] : [];
      names.forEach(function (id) {if (id && allHosts[id]) bad=true;if (id) allHosts[id]=true;});
    });
    return bad || food>t.food || Object.keys(allocations).some(function (k) {return allocations[k]!==0;}) ? fail() : errors;
  };
  var openingPlan=M.openingPlan;
  M.openingPlan = function (s,d) {
    var plan=openingPlan(s,d), set=d.mobile && d.mobile.columns;
    if (!plan.allowed || set===undefined) return plan;
    if (s.turn!==0 || set.entries.some(function (c,i) {
      var id=hostId(d.id,c.id,i);
      return (s.armies || []).some(function (a) {return a.id===id;}) ||
        (s.authority.migrations || []).some(function (m) {return m.hostId===id;});
    }) || !openingLocationsAllowed(s,d)) plan.allowed=false;
    return plan;
  };
  var initialize=M.initialize;
  M.initialize = function (s,defs) {
    var fresh=defs.filter(function (d) {return d.mobile && d.mobile.columns!==undefined && !M.row(s,d.id);});
    fresh.forEach(function (d) {
      var declared=(FB.campaignBookmark(s).realms || []).filter(function (v) {return v.id===d.id;})[0];
      if (!declared || d.culture!==declared.culture || d.religion!==declared.religion ||
          JSON.stringify(d.mobile)!==JSON.stringify(declared.mobile) || !M.openingPlan(s,d).allowed)
        throw new Error(FB.T('Invalid mobile column declaration.'));
    });
    initialize(s,defs);
    fresh.forEach(function (d) {
      var r=M.row(s,d.id), original=M.host(s,d.id);
      /* The existing initializer already withdrew the complete muster once.
         Repartition it; never recruit, seed another cohort or credit stock. */
      r.food+=original.mobileFood;
      r.columns={schema:1,entries:[]};
      d.mobile.columns.entries.forEach(function (c,index) {
        var army=index ? copy(original) : original, roster=[];
        army.id=hostId(d.id,c.id,index);army.units={};army.men=0;army.mobileFood=c.food;
        army.at=c.openingLocation ? c.openingLocation.countyId : d.mobile.origin;
        army.from=army.at;
        c.muster.forEach(function (v) {
          army.units[v.unitId]=(army.units[v.unitId] || 0)+v.count;army.men+=v.count;
          var prior=roster.filter(function (v2) {return v2.memberId===v.memberId;})[0];
          if (prior) prior.count+=v.count;
          else roster.push({memberId:v.memberId,culture:d.culture,religion:d.religion,count:v.count});
        });
        army.size=army.men;army.mobileRoster=roster;FB.hostUnits(army);
        army.supply=army.mobileFood/M.hostSupplySnapshot(s,army).capacity*100;
        r.food-=c.food;
        if (index) s.armies.push(army);
        var binding=r.openingBindings.filter(function (b) {return b.memberId===c.commanderMemberId;})[0];
        var entry={id:c.id,hostId:army.id,commanderId:binding.characterId,status:'active'};
        if (own(c,'openingLocation')) entry.openingLocation=copy(c.openingLocation);
        r.columns.entries.push(entry);
      });
    });
  };
  var validate=M.validate;
  M.validate = function (s) {
    Object.keys(s.authority && s.authority.governments || {}).forEach(function (rid) {
      var r=M.row(s,rid), spec=definition(s,rid);
      if (!r) return;
      function fail() {throw new Error(FB.T('Invalid saved mobile columns.'));}
      if (spec===undefined) {if (r.columns!==undefined) fail();return;}
      var set=r.columns, moving=M.migration(s,rid);
      if (r.schema!==3 || !moving || !keys(set,['schema','entries']) || [1,2].indexOf(set.schema)<0 ||
          !Array.isArray(set.entries) || set.entries.length!==spec.entries.length || set.entries.length>4 ||
          !Array.isArray(r.openingBindings)) fail();
      var hosts=Object.create(null);
      set.entries.forEach(function (c,i) {
        var expected=spec.entries[i], binding=r.openingBindings.filter(function (b) {return b && b.memberId===expected.commanderMemberId;})[0];
        var located=own(expected,'openingLocation');
        if (!keys(c,['id','hostId','commanderId','status'].concat(located ? ['openingLocation'] : [])) ||
            located && (!openingLocationValid(c.openingLocation,FB.campaignBookmark(s)) ||
              c.openingLocation.countyId!==expected.openingLocation.countyId ||
              own(c.openingLocation,'siteId')!==own(expected.openingLocation,'siteId') ||
              c.openingLocation.siteId!==expected.openingLocation.siteId) ||
            c.id!==expected.id || c.hostId!==hostId(rid,expected.id,i) ||
            !binding || !s.chars[c.commanderId] ||
            (set.schema===1 ? c.commanderId!==binding.characterId : !r.openingBindings.some(function (b) {
              return b.characterId===c.commanderId && r.members.some(function (m) {return m.principal.id===c.commanderId;});
            })) ||
            ['active','retired'].indexOf(c.status)<0 || hosts[c.hostId]) fail();
        hosts[c.hostId]=true;
        var matches=(s.armies || []).filter(function (a) {return a.id===c.hostId;});
        if (matches.length!==(c.status==='active' ? 1 : 0) || r.status!=='active' && c.status==='active') fail();
        if (c.status==='active') {
          var a=matches[0], p=M.profile(s,rid);
          if (!p || a.realm!==rid || !a.mobileFollowing || a.migrationId!==moving.id || typeof a.mobileCourt!=='boolean' ||
              !whole(a.men) || a.men<=0 || !Number.isFinite(a.mobileFood) || a.mobileFood<0 ||
              a.mobileFood>a.men*p.foodPerPerson*30 || !s.owner[a.at] ||
              (s.authority.migrations || []).some(function (m) {return m.id!==moving.id && m.hostId===a.id;})) fail();
          if (Object.keys(a.units || {}).some(function (id) {return !own(FBDATA.unitClasses,id);})) fail();
        }
      });
      if (moving.hostId!==set.entries[0].hostId ||
          (s.armies || []).filter(function (a) {return a.realm===rid && a.mobileFollowing && a.mobileCourt;}).length>1 ||
          (s.armies || []).some(function (a) {return a.realm===rid && a.mobileFollowing && !hosts[a.id];})) fail();
    });
    return validate(s);
  };
  /* Until a column operation explicitly supplies its own review, none of the
     one-host shortcuts may carry the camp or reorganize only one partition. */
  var order=FB.orderArmy, controls=FB.playerControlsHost;
  FB.orderArmy = function (s,army,pid) {
    return army && M.row(s,army.realm) && M.row(s,army.realm).columns ? false : order(s,army,pid);
  };
  FB.playerControlsHost = function (s,army) {
    return army && M.row(s,army.realm) && M.row(s,army.realm).columns ? false : controls(s,army);
  };
  var mergeHosts=FB.mergeHosts;
  FB.mergeHosts=function (s,a,b) {
    return a && a.mobileFollowing || b && b.mobileFollowing ? null : mergeHosts(s,a,b);
  };
  var standing=FB.federateHostStanding, travelling=FB.federateHostTravelling;
  FB.federateHostStanding = function (s,army) {
    var moving=army && M.migration(s,army.realm), r=army && M.row(s,army.realm);
    return r && r.columns ? !!(r.status==='active' && M.columnHostOwned(s,army.realm,army) && moving &&
      moving.endTurn>s.turn && moving.status!=='settled' && moving.status!=='failed') : standing(s,army);
  };
  FB.federateHostTravelling = function (s,army) {
    var r=army && M.row(s,army.realm);
    return r && r.columns ? FB.federateHostStanding(s,army) : travelling(s,army);
  };
  var disband=FB.mobileHostDisband;
  FB.mobileHostDisband = function (s,army) {
    var r=M.row(s,army.realm);
    if (r && r.columns && army.mobileFollowing) {
      r.columns.entries.forEach(function (c) {if (c.hostId===army.id) c.status='retired';});
      if (army.at!==M.migration(s,army.realm).at) {
        r.accounting.dispersed+=army.men;
        army.mobileRoster=[];army.units={};army.men=0;army.mobileFood=0;
      }
    }
    return disband(s,army);
  };
  var markDead=FB.markRealmDead;
  FB.markRealmDead = function (s,rid,options) {
    var result=markDead(s,rid,options), r=M.row(s,rid);
    if (r && r.columns && r.status==='dispersed') r.columns.entries.forEach(function (c) {c.status='retired';});
    return result;
  };

  function column(s,rid,id) {
    var r=M.row(s,rid);
    return r && r.columns && r.columns.entries.filter(function (c) {return c.id===id;})[0];
  }
  function armyFor(s,c) {return c && (s.armies || []).filter(function (a) {return a.id===c.hostId;})[0] || null;}
  function halted(a) {return !!a && !a.moveLeft && !(a.path || []).length && a.broken===undefined;}
  function stop(a) {a.path=[];a.goal=null;a.moveLeft=0;}
  M.columnStopAll=function (s,rid) {
    var r=M.row(s,rid);if (!r || !r.columns) return;
    r.columns.entries.forEach(function (c) {var a=armyFor(s,c);if (a) stop(a);});
  };
  function sum(pool) {return pool.reduce(function (n,c) {return n+c.count;},0);}
  function add(pool,cohorts,roster) {
    cohorts.forEach(function (c) {
      var old=pool.filter(function (v) {return v.culture===c.culture && v.religion===c.religion && (!roster || v.memberId===c.memberId);})[0];
      if (old) old.count+=c.count;
      else {var row={culture:c.culture,religion:c.religion,count:c.count};if (roster) row.memberId=c.memberId;pool.push(row);}
    });
  }
  function take(pool,count) {
    var out=[],left=count;
    pool.forEach(function (c) {var n=Math.min(left,c.count);if (n) {var v=copy(c);v.count=n;out.push(v);c.count-=n;left-=n;}});
    for (var i=pool.length-1;i>=0;i--) if (!pool[i].count) pool.splice(i,1);
    return out;
  }
  function commander(s,rid,cid) {
    var r=M.row(s,rid),p=M.profile(s,rid),c=s.chars[cid];
    return live(s,c) && s.date.year-c.born>=p.minAge && r.openingBindings.some(function (b) {return b.characterId===cid;}) &&
      r.members.some(function (m) {return m.principal.id===cid && m.allegiance;});
  }
  function committed(s,rid) {
    return M.row(s,rid).agreements.some(function (a) {return a.kind!=='access' && a.status==='active' && a.endTurn>s.turn;}) ||
      (s.authority.contracts || []).some(function (c) {return c.federateRealmId===rid && FB.political.contract(s,c.id).effective;});
  }
  M.columnCampHost = function (s,rid) {
    var r=M.row(s,rid);
    return r && r.columns && r.columns.entries.map(function (c) {return armyFor(s,c);})
      .filter(function (a) {return a && a.mobileCourt;})[0] || null;
  };
  /* Each projection reads the actual canonical inventories. No remote draw,
     new supply account or saved replenishment cursor belongs to a policy. */
  function marketRequest(s,rid,at,need) {
    var stock=FB.marketProvisionSnapshot(s,at),policy=M.profile(s,rid).supplyPolicy;
    var price=stock && stock.price,spendable=Math.max(0,FB.treasuryAvailable(s,rid)-policy.cashReserve);
    var valid=stock && Number.isFinite(price) && price>0 && M.provisioningAccess(s,rid,at);
    var unitPrice=s.owner[at]===rid ? 0 : price*0.1125;
    return valid ? Math.max(0,Math.min(Math.floor(Math.max(0,need)),Math.floor(stock.stock),
      unitPrice>0 ? Math.floor(spendable/unitPrice) : Number.MAX_SAFE_INTEGER)) : 0;
  }
  M.columnSupplyPlan = function (s,rid) {
    var r=M.row(s,rid),p=M.profile(s,rid),moving=M.migration(s,rid),policy=p && p.supplyPolicy;
    if (!r || !r.columns || !moving || !policy) return null;
    var campDaily=r.members.reduce(function (n,m) {return n+sum(m.civilians)+sum(m.reserve);},0)*p.foodPerPerson;
    var entries=r.columns.entries.map(function (c) {
      var a=armyFor(s,c),facts=a && M.hostSupplySnapshot(s,a),local=!!a && a.at===moving.at;
      var target=facts ? facts.target : 0,need=a ? Math.max(0,target-a.mobileFood) : 0;
      var load=local && halted(a) ? Math.min(Math.max(0,r.food-campDaily),need) : 0;
      return {columnId:c.id,countyId:a ? a.at : moving.at,local:local,daily:facts ? facts.daily : 0,
        target:target,capacity:facts ? facts.capacity : 0,
        trade:{columnId:c.id,count:a && !local && halted(a) ? marketRequest(s,rid,a.at,need) : 0,provisioning:true},
        load:{columnId:c.id,count:load,provisioning:true},
        unload:{columnId:c.id,count:local && halted(a) ? a.mobileFood : 0,provisioning:true}};
    });
    var fieldDaily=entries.reduce(function (n,e) {return n+e.daily;},0);
    var campTarget=campDaily*policy.targetDays+entries.reduce(function (n,e) {
      var a=armyFor(s,column(s,rid,e.columnId));
      return n+(e.local && halted(a) ? Math.max(0,e.target-a.mobileFood) : 0);
    },0);
    var result={campDaily:campDaily,fieldDaily:fieldDaily,fieldLocal:entries.some(function (e) {return e.local;}),
      campTarget:campTarget,fieldTarget:entries.reduce(function (n,e) {return n+e.target;},0),
      fieldCapacity:entries.reduce(function (n,e) {return n+e.capacity;},0),targetDays:policy.targetDays,
      carryDays:policy.carryDays,cashReserve:policy.cashReserve,entries:entries,replacement:null,
      purchase:{countyId:moving.at,count:marketRequest(s,rid,moving.at,Math.ceil(Math.max(0,campTarget-r.food))),direction:'buy',provisioning:true}};
    var replacement=policy.replacement,field=(s.armies || []).filter(function (a) {return a.realm===rid && a.mobileFollowing;});
    var totalMen=field.reduce(function (n,a) {return n+a.men;},0);
    var localDaily=entries.reduce(function (n,e) {return n+(e.local ? e.daily : 0);},0);
    if (!replacement || committed(s,rid) || r.food<campDaily+localDaily) return result;
    var pools=r.members.reduce(function (n,m) {
      if (!live(s,s.chars[m.principal.id]) || !m.allegiance) return n;
      var deployed=field.reduce(function (v,a) {return v+a.mobileRoster.filter(function (v2) {return v2.memberId===m.id;})
        .reduce(function (v2,c) {return v2+c.count;},0);},0),available=sum(m.reserve)+sum(m.civilians);
      return n+Math.min(available,Math.max(0,Math.floor((available+deployed)*m.pledge)-deployed));
    },0);
    var count=Math.min(Math.max(0,replacement.targetMen-totalMen),replacement.maxPerReview,pools,
      p.recruitCost>0 ? Math.floor(Math.max(0,FB.treasuryAvailable(s,rid)-policy.cashReserve)/p.recruitCost) : Number.MAX_SAFE_INTEGER);
    if (count<=0) return result;
    r.columns.entries.some(function (c) {
      var a=armyFor(s,c);
      if (a && (!halted(a) || a.at!==moving.at) || !a && count<(FBDATA.balance.armyMinMen || 40)) return false;
      return replacement.unitIds.some(function (unitId) {
        var terms={columnId:c.id,unitId:unitId,count:count};
        if (!quote(s,{realmId:rid,action:'recruit',terms:terms,actor:{kind:'character',id:r.leaderId}}).allowed) return false;
        terms.provisioning=true;result.replacement=terms;return true;
      });
    });
    return result;
  };
  M.columnSupplyReview = function (s,rid,columnId,action,actor) {
    var plan=M.columnSupplyPlan(s,rid),entry=plan && plan.entries.filter(function (e) {return e.columnId===columnId;})[0];
    var terms=action==='recruit' ? plan && plan.replacement : entry && entry[action],r=M.row(s,rid);
    if (!terms || terms.columnId!==columnId) terms={columnId:columnId,count:0,provisioning:true};
    return M.reviewColumns(s,{realmId:rid,action:action,terms:terms,
      actor:actor || {kind:'character',id:r && r.leaderId}});
  };
  M.columnSupplyDay = function (s,rid) {
    var r=M.row(s,rid);
    r.columns.entries.forEach(function (c) {
      var a=armyFor(s,c);if (!a) return;
      M.commit(s,M.columnSupplyReview(s,rid,c.id,a.at===M.migration(s,rid).at ? 'load' : 'trade'));
    });
    /* One command-wide batch, even when several slots need recovery. */
    if (M.profile(s,rid).supplyPolicy.replacement) M.commit(s,M.supplyReview(s,rid,'recruit'));
  };
  function signature(s,rid,provisioning) {
    var r=M.row(s,rid);
    return JSON.stringify([s.turn,s.date,r,M.migration(s,rid),s.armies,
      r.members.map(function (m) {return s.chars[m.principal.id];}),M.commandSnapshot(s,rid),
      s.owner,s.holder,s.wars,s.authority.contracts,s.authority.appointments,
      FB.treasuryAvailable(s,rid),M.profile(s,rid),definition(s,rid),
      provisioning ? r.columns.entries.map(function (c) {var a=armyFor(s,c);return a && FB.marketProvisionSnapshot(s,a.at);}) : null]);
  }
  function quote(s,request) {
    var rid=request.realmId,r=M.row(s,rid),t=request.terms,action=request.action,actor=request.actor;
    var q={allowed:false,reason:'column_operation',realmId:rid,action:action,terms:copy(t || {}),cost:0,signature:null};
    var fields={march:['columnId','countyId'],move:['columnId','countyId'],stop:['columnId'],
      split:['columnId','otherColumnId','unitId','count'],merge:['columnId','otherColumnId'],
      recruit:['columnId','unitId','count'],demuster:['columnId'],assign:['columnId','candidateId'],war:['columnId','causes'],
      trade:['columnId','count','provisioning'],load:['columnId','count','provisioning'],unload:['columnId','count','provisioning']};
    var allowedFields=own(fields,action) ? fields[action].slice() : null;
    if (action==='recruit' && t && t.provisioning===true) allowedFields.push('provisioning');
    if (!keys(request,['realmId','action','terms','actor']) || !r || !r.columns || r.status!=='active' ||
        !allowedFields || !keys(t,allowedFields) || !keys(actor,['kind','id']) || actor.kind!=='character') return q;
    var c=column(s,rid,t.columnId),a=armyFor(s,c),other=column(s,rid,t.otherColumnId),b=armyFor(s,other);
    var leader=M.leader(s,rid),overall=!!leader && leader.id===actor.id,p=M.profile(s,rid),moving=M.migration(s,rid);
    var permission=action==='load' || action==='unload' ? 'trade' : action==='assign' || action==='stop' ? 'march' : action==='merge' ? 'demuster' : action==='split' ? 'recruit' : action;
    function no(reason) {q.reason=reason;return q;}
    if (!c || !moving || moving.endTurn<=s.turn || !M.commandPermits(s,rid,permission) ||
        (['march','stop','trade','load','unload'].indexOf(action)>=0 ? !M.columnAuthority(s,rid,c.id,actor) : !overall)) return no('command');
    if (action!=='assign' && !commander(s,rid,c.commanderId)) return no('principal');
    if (t.provisioning) {
      var supply=M.columnSupplyPlan(s,rid),entry=supply && supply.entries.filter(function (e) {return e.columnId===c.id;})[0];
      var expected=action==='recruit' ? supply && supply.replacement : entry && entry[action];
      if (!expected || !expected.count || !keys(t,Object.keys(expected)) || Object.keys(expected).some(function (k) {return t[k]!==expected[k];})) return no('provisioning');
    }
    q.signature=signature(s,rid,!!t.provisioning);
    if (action==='assign') {
      if (!commander(s,rid,t.candidateId) || t.candidateId===c.commanderId) return no('principal');
    } else if (action==='march' || action==='move') {
      if (!a || c.status!=='active' || !s.owner[t.countyId] || a.broken!==undefined) return no('commitment');
      var escort=M.columnCampHost(s,rid);
      if (action==='move' && (a.at!==moving.at || escort && escort!==a && !halted(escort))) return no('commitment');
      var plan=FB.armyOrderPlan(s,a,t.countyId);
      if (!plan || !plan.ok || !plan.path || plan.path.some(function (pid) {return !M.passage(s,rid,pid,action==='move');})) return no('access');
      q.path=plan.path.slice();q.stop=plan.stop;q.days=plan.totalDays || 0;
    } else if (action==='stop') {
      if (!a || halted(a)) return no('commitment');
    } else if (action==='split') {
      if (!a || !halted(a) || !other || other===c || other.status!=='retired' || b || !commander(s,rid,other.commanderId) ||
          (s.authority.migrations || []).some(function (m) {return m.id!==moving.id && m.hostId===other.hostId;}) ||
          !whole(t.count) || t.count<(FBDATA.balance.armyMinMen || 40) || a.men-t.count<(FBDATA.balance.armyMinMen || 40) ||
          typeof t.unitId!=='string' || !own(FBDATA.unitClasses,t.unitId) || (a.units[t.unitId] || 0)<t.count ||
          committed(s,rid) || !M.commandPermits(s,rid,'demuster')) return no('commitment');
      q.food=a.mobileFood*t.count/a.men;
    } else if (action==='merge') {
      if (!a || !b || other===c || !halted(a) || !halted(b) || a.at!==b.at || a.warId!==b.warId ||
          a.mobileProvisionTurn!==b.mobileProvisionTurn || committed(s,rid)) return no('commitment');
      var merged=copy(a.mobileRoster);add(merged,b.mobileRoster,true);
      if (merged.length>64) return no('capacity');
    } else if (action==='demuster') {
      if (!a || !halted(a) || a.at!==moving.at || committed(s,rid) || FB.isRealmAtWar(s,rid)) return no('commitment');
    } else if (action==='trade' || action==='load' || action==='unload') {
      if (!p.supplyPolicy || t.provisioning!==true || !a || !halted(a) || !Number.isFinite(t.count) || t.count<=0) return no('provisioning');
      q.terms.countyId=a.at;
      if (action==='trade') {
        var stock=FB.marketProvisionSnapshot(s,a.at);
        if (!whole(t.count) || !M.provisioningAccess(s,rid,a.at) || !stock || t.count>stock.stock || !Number.isFinite(stock.price) || stock.price<=0) return no('access');
        q.cost=s.owner[a.at]===rid ? 0 : t.count*stock.price*0.1125;
        if (q.cost>Math.max(0,FB.treasuryAvailable(s,rid)-p.supplyPolicy.cashReserve)) return no('funds');
      } else if (a.at!==moving.at || action==='load' && t.count>r.food || action==='unload' && t.count>a.mobileFood) return no('food');
    } else if (action==='recruit') {
      if (a && (!halted(a) || a.at!==moving.at) || !a && c.status!=='retired' ||
          !a && (s.authority.migrations || []).some(function (m) {return m.id!==moving.id && m.hostId===c.hostId;}) ||
          !whole(t.count) || !t.count || t.count>100000000 || !a && t.count<(FBDATA.balance.armyMinMen || 40) ||
          M.columnCampHost(s,rid) && !halted(M.columnCampHost(s,rid))) return no('commitment');
      if (typeof t.unitId!=='string' || !own(FBDATA.unitClasses,t.unitId) || FBDATA.unitClasses[t.unitId].hired || !FB.unitClassUnlocked(s,t.unitId,rid)) return no('technology');
      var left=t.count;q.plan=[];
      r.members.forEach(function (m) {
        if (!live(s,s.chars[m.principal.id]) || !m.allegiance) return;
        var field=(s.armies || []).filter(function (v) {return v.realm===rid && v.mobileFollowing;})
          .reduce(function (n,v) {return n+v.mobileRoster.filter(function (v2) {return v2.memberId===m.id;})
            .reduce(function (n2,v2) {return n2+v2.count;},0);},0);
        var available=sum(m.reserve)+sum(m.civilians),n=Math.min(left,available,Math.max(0,Math.floor((available+field)*m.pledge)-field));
        if (n) q.plan.push({memberId:m.id,count:n});left-=n;
      });
      if (left) return no('following');
      var roster=copy(a ? a.mobileRoster : []);
      q.plan.forEach(function (part) {
        var m=r.members.filter(function (v) {return v.id===part.memberId;})[0],rest=copy(m.reserve),civ=copy(m.civilians);
        var cohorts=take(rest,part.count);cohorts=cohorts.concat(take(civ,part.count-sum(cohorts)));
        add(roster,cohorts.map(function (v) {return Object.assign({memberId:m.id},v);}),true);
      });
      if (roster.length>64) return no('capacity');
      q.cost=t.count*p.recruitCost;if (FB.treasuryAvailable(s,rid)<q.cost) return no('funds');
    } else if (action==='war') {
      if (!a || !halted(a) || a.mobileCourt || a.warId && FB.ordinaryWarById(s,a.warId) || committed(s,rid) ||
          !Array.isArray(t.causes) || t.causes.length!==1 || !keys(t.causes[0],['type','enemy','target']) ||
          t.causes[0].type!=='aggression' || typeof t.causes[0].enemy!=='string' || typeof t.causes[0].target!=='string') return no('commitment');
      q.declaration=FB.warDeclarationPreview(s,rid,t.causes,{frontier:[a.at]});
      if (!q.declaration.valid || q.declaration.unlawful) return no('award');
    }
    q.allowed=true;q.reason=null;return q;
  }
  function refresh(s,a) {
    FB.hostUnits(a);a.supply=FB.clamp(a.mobileFood/Math.max(0.01,M.hostSupplySnapshot(s,a).capacity)*100,0,100);
  }
  function emptyHost(s,rid,c,at) {
    return {id:c.hostId,realm:rid,at:at,from:at,men:0,size:0,units:{},supply:0,path:[],goal:null,moveLeft:0,
      warId:null,migrationId:M.migration(s,rid).id,mobileFollowing:true,mobileCourt:false,mobileFood:0,mobileRoster:[]};
  }
  var warPermit=null;
  M.columnWarAllowed=function (s,rid,war) {return !!warPermit && warPermit.state===s && warPermit.realmId===rid && warPermit.war===war;};
  FB.governmentSelection.registerSource('mobile_columns',{
    quote:quote,
    apply:function (s,request,reviewed) {
      var q=quote(s,request);if (!q.allowed || JSON.stringify(q)!==JSON.stringify(reviewed)) return false;
      var rid=request.realmId,r=M.row(s,rid),t=q.terms,c=column(s,rid,t.columnId),a=armyFor(s,c);
      var other=column(s,rid,t.otherColumnId),b=armyFor(s,other),moving=M.migration(s,rid);
      if (q.action==='assign') {c.commanderId=t.candidateId;r.columns.schema=2;if (a) stop(a);}
      else if (q.action==='march' || q.action==='move') {
        var oldMode=a.mobileCourt;a.mobileCourt=q.action==='move';
        if (!order(s,a,t.countyId)) {a.mobileCourt=oldMode;return false;}
        if (a.mobileCourt) r.columns.entries.forEach(function (v) {var host=armyFor(s,v);if (host && host!==a) host.mobileCourt=false;});
      } else if (q.action==='stop') {stop(a);a.mobileCourt=false;}
      else if (q.action==='split') {
        b=emptyHost(s,rid,other,a.at);b.warId=a.warId;b.men=t.count;b.size=t.count;b.units[t.unitId]=t.count;
        if (a.mobileProvisionTurn!==undefined) b.mobileProvisionTurn=a.mobileProvisionTurn;
        b.mobileRoster=take(a.mobileRoster,t.count);b.mobileFood=q.food;
        a.units[t.unitId]-=t.count;a.men-=t.count;a.size=Math.max(a.men,a.size-t.count);a.mobileFood-=q.food;
        other.status='active';s.armies.push(b);refresh(s,a);refresh(s,b);
      } else if (q.action==='merge') {
        Object.keys(b.units).forEach(function (id) {a.units[id]=(a.units[id] || 0)+b.units[id];});
        add(a.mobileRoster,b.mobileRoster,true);a.men+=b.men;a.size+=b.size;a.mobileFood+=b.mobileFood;
        if (b.mobileCourt) a.mobileCourt=true;
        b.mobileRoster=[];b.mobileFood=0;b.men=0;b.units={};FB.disbandArmy(s,b);refresh(s,a);
      } else if (q.action==='trade') {
        if (q.cost && !FB.treasuryTransfer(s,rid,s.owner[a.at],q.cost)) return false;
        FB.marketWithdrawProvisions(s,a.at,t.count);a.mobileFood+=t.count;refresh(s,a);
      } else if (q.action==='load' || q.action==='unload') {
        var amount=q.action==='load' ? t.count : -t.count;
        r.food-=amount;a.mobileFood+=amount;refresh(s,a);
      } else if (q.action==='demuster') FB.disbandArmy(s,a);
      else if (q.action==='recruit') {
        if (!FB.treasurySpend(s,rid,q.cost)) return false;
        if (!a) {a=emptyHost(s,rid,c,moving.at);c.status='active';s.armies.push(a);}
        q.plan.forEach(function (part) {
          var m=r.members.filter(function (v) {return v.id===part.memberId;})[0],cohorts=take(m.reserve,part.count);
          cohorts=cohorts.concat(take(m.civilians,part.count-sum(cohorts)));
          add(a.mobileRoster,cohorts.map(function (v) {return Object.assign({memberId:m.id},v);}),true);
        });
        a.men+=t.count;a.size=Math.max(a.size,a.men);a.units[t.unitId]=(a.units[t.unitId] || 0)+t.count;refresh(s,a);
      } else if (q.action==='war') {
        var cause=t.causes[0],war={enemy:cause.enemy,target:cause.target,casus:copy(cause),objectives:copy(t.causes),legacy:false},created;
        warPermit={state:s,realmId:rid,war:war};
        try {created=FB.registerOrdinaryWar(s,rid,war);} finally {warPermit=null;}
        if (!created) return false;a.warId=created.id;
      }
      r.revision++;FB.governments.invalidate();if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();return true;
    }
  });
  M.reviewColumns=function (s,request) {return FB.governmentSelection.reviewSource(s,'mobile_columns',request);};
  /* Reconcile every column before ordinary movement; a cached route never
     outlives its exact commander, overall mandate or current passage. */
  var day=M.day;
  M.day=function (s) {
    Object.keys(s.authority && s.authority.governments || {}).forEach(function (rid) {
      var r=M.row(s,rid),moving=r && M.migration(s,rid);
      if (!r || !r.columns || r.status!=='active') return;
      r.columns.entries.forEach(function (c) {
        var a=armyFor(s,c);if (!a) return;
        if (!commander(s,rid,c.commanderId) || !moving || moving.endTurn<=s.turn ||
            !M.commandPermits(s,rid,a.mobileCourt ? 'move' : 'march') ||
            (a.path || []).some(function (pid) {return !M.passage(s,rid,pid,a.mobileCourt);})) stop(a);
      });
    });
    return day(s);
  };
  FB.mobileDay=M.day;
})();
