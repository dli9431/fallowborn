/* Optional bounded opening partitions. Armies own deployed people, units,
   position and food; the column set owns only identity and command scope. */
(function () {
  'use strict';
  var M=FB.mobile;
  function copy(v) {return JSON.parse(JSON.stringify(v));}
  function own(v,k) {return !!v && Object.prototype.hasOwnProperty.call(v,k);}
  function keys(v,list) {return !!v && typeof v==='object' && !Array.isArray(v) &&
    Object.keys(v).length===list.length && Object.keys(v).every(function (k) {return list.indexOf(k)>=0;});}
  function whole(n) {return Number.isSafeInteger(n) && n>=0;}
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
    if (!t.command || !t.opening || p.supplyPolicy!==undefined || !keys(set,['schema','entries']) || set.schema!==1 ||
        !Array.isArray(set.entries) || set.entries.length<2 || set.entries.length>4) return fail();
    var ids=Object.create(null), commanders=Object.create(null), allocations=Object.create(null), food=0, bad=false;
    t.opening.muster.forEach(function (v) {allocations[v.memberId+'|'+v.unitId]=v.count;});
    set.entries.forEach(function (c,index) {
      if (!keys(c,['id','commanderMemberId','muster','food']) || typeof c.id!=='string' ||
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
      if (men<(FBDATA.balance.armyMinMen || 40) || c.food>men*p.foodPerPerson*30) bad=true;
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
    })) plan.allowed=false;
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
      var r=M.row(s,d.id), original=M.host(s,d.id), p=M.profile(s,d.id);
      /* The existing initializer already withdrew the complete muster once.
         Repartition it; never recruit, seed another cohort or credit stock. */
      r.food+=original.mobileFood;
      r.columns={schema:1,entries:[]};
      d.mobile.columns.entries.forEach(function (c,index) {
        var army=index ? copy(original) : original, roster=[];
        army.id=hostId(d.id,c.id,index);army.units={};army.men=0;army.mobileFood=c.food;
        c.muster.forEach(function (v) {
          army.units[v.unitId]=(army.units[v.unitId] || 0)+v.count;army.men+=v.count;
          var prior=roster.filter(function (v2) {return v2.memberId===v.memberId;})[0];
          if (prior) prior.count+=v.count;
          else roster.push({memberId:v.memberId,culture:d.culture,religion:d.religion,count:v.count});
        });
        army.size=army.men;army.mobileRoster=roster;FB.hostUnits(army);
        army.supply=army.mobileFood/(army.men*p.foodPerPerson*30)*100;
        r.food-=c.food;
        if (index) s.armies.push(army);
        var binding=r.openingBindings.filter(function (b) {return b.memberId===c.commanderMemberId;})[0];
        r.columns.entries.push({id:c.id,hostId:army.id,commanderId:binding.characterId,status:'active'});
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
      if (r.schema!==3 || !moving || !keys(set,['schema','entries']) || set.schema!==1 ||
          !Array.isArray(set.entries) || set.entries.length!==spec.entries.length || set.entries.length>4 ||
          !Array.isArray(r.openingBindings)) fail();
      var hosts=Object.create(null);
      set.entries.forEach(function (c,i) {
        var expected=spec.entries[i], binding=r.openingBindings.filter(function (b) {return b && b.memberId===expected.commanderMemberId;})[0];
        if (!keys(c,['id','hostId','commanderId','status']) || c.id!==expected.id || c.hostId!==hostId(rid,expected.id,i) ||
            !binding || c.commanderId!==binding.characterId || !s.chars[c.commanderId] ||
            ['active','retired'].indexOf(c.status)<0 || hosts[c.hostId]) fail();
        hosts[c.hostId]=true;
        var matches=(s.armies || []).filter(function (a) {return a.id===c.hostId;});
        if (matches.length!==(c.status==='active' ? 1 : 0) || r.status!=='active' && c.status==='active') fail();
        if (c.status==='active') {
          var a=matches[0], p=M.profile(s,rid);
          if (!p || a.realm!==rid || !a.mobileFollowing || a.migrationId!==moving.id || a.mobileCourt!==false ||
              !whole(a.men) || a.men<=0 || !Number.isFinite(a.mobileFood) || a.mobileFood<0 ||
              a.mobileFood>a.men*p.foodPerPerson*30 || !s.owner[a.at] ||
              (s.authority.migrations || []).some(function (m) {return m.id!==moving.id && m.hostId===a.id;})) fail();
          if (Object.keys(a.units || {}).some(function (id) {return !own(FBDATA.unitClasses,id);})) fail();
        }
      });
      if (moving.hostId!==set.entries[0].hostId ||
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
    if (r && r.columns && army.mobileFollowing) r.columns.entries.forEach(function (c) {
      if (c.hostId===army.id) c.status='retired';
    });
    return disband(s,army);
  };
  var markDead=FB.markRealmDead;
  FB.markRealmDead = function (s,rid,options) {
    var result=markDead(s,rid,options), r=M.row(s,rid);
    if (r && r.columns && r.status==='dispersed') r.columns.entries.forEach(function (c) {c.status='retired';});
    return result;
  };
})();
