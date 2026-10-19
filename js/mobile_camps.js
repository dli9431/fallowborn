/* Civilian partitions own their actual pools and local provisions. The public
   treasury, military rosters and named people retain their canonical owners. */
(function () {
  'use strict';
  var M=FB.mobile, G=FB.governments, S=FB.governmentSelection;
  function copy(v) {return JSON.parse(JSON.stringify(v));}
  function own(v,k) {return !!v && Object.prototype.hasOwnProperty.call(v,k);}
  function keys(v,list) {return !!v && typeof v==='object' && !Array.isArray(v) &&
    Object.keys(v).length===list.length && Object.keys(v).every(function (k) {return list.indexOf(k)>=0;});}
  function whole(n) {return Number.isSafeInteger(n) && n>=0 && n<=1000000000000;}
  function finite(n) {return Number.isFinite(n) && n>=0 && n<=1000000000000;}
  function sum(pool) {return pool.reduce(function (n,c) {return n+c.count;},0);}
  function count(c) {return c.members.reduce(function (n,m) {return n+sum(m.civilians)+sum(m.reserve);},0);}
  function add(pool,cohorts) {
    cohorts.forEach(function (c) {
      var prior=pool.filter(function (v) {return v.culture===c.culture && v.religion===c.religion;})[0];
      if (prior) prior.count+=c.count;else pool.push({culture:c.culture,religion:c.religion,count:c.count});
    });
  }
  function take(pool,n) {
    var out=[];
    pool.forEach(function (c) {var amount=Math.min(n,c.count);if (amount) out.push({culture:c.culture,religion:c.religion,count:amount});c.count-=amount;n-=amount;});
    for (var i=pool.length-1;i>=0;i--) if (!pool[i].count) pool.splice(i,1);
    return out;
  }
  function declaration(s,rid) {
    return (FB.campaignBookmark(s).realms || []).filter(function (d) {return d.id===rid;})[0];
  }
  function camp(s,rid,id) {var r=M.row(s,rid);return r && r.camps && r.camps.entries.filter(function (c) {return c.id===id;})[0];}
  function live(s,c) {return !!c && !c.dead && !c.captive && !c.prisonerOf && !c.imprisoned && !c.exiled &&
    !(FB.justiceCustodyOf && FB.justiceCustodyOf(s,c.id));}
  function position(s,c) {
    if (c.id!==s.player.charId) return c.homeProvinceId;
    if (s.player.travel) return null;
    return s.player.provinceId;
  }
  function stock(s,c) {return FB.marketProvisionSnapshot(s,c.countyId);}
  function committed(s,rid) {
    var r=M.row(s,rid);
    return FB.isRealmAtWar(s,rid) || (s.authority.contracts || []).some(function (c) {
      return c.federateRealmId===rid && FB.political.contract(s,c.id).effective;
    }) || r.agreements.some(function (a) {return a.kind!=='access' && a.status==='active' && a.endTurn>s.turn;});
  }
  M.campPopulation = function (s,rid) {return M.row(s,rid).camps.entries.reduce(function (n,c) {return n+count(c);},0);};
  M.campSnapshot = function (s,rid) {
    var r=M.row(s,rid),p=M.profile(s,rid);
    if (!r || !r.camps) return null;
    return r.camps.entries.map(function (c) {
      var local=stock(s,c);
      return {id:c.id,countyId:c.countyId,siteId:c.siteId,civilians:c.members.reduce(function (n,m) {return n+sum(m.civilians);},0),
        reserve:c.members.reduce(function (n,m) {return n+sum(m.reserve);},0),food:c.food,daily:count(c)*p.foodPerPerson,
        access:!!M.accessAt(s,rid,c.countyId),marketFood:local ? local.stock : 0};
    });
  };
  var faults=M.definitionFaults;
  M.definitionFaults = function (d,formId,provinces,realms,profiles,bookmark) {
    var errors=faults(d,formId,provinces,realms,profiles,bookmark),t=d.mobile,set=t && t.civilianCamps;
    if (errors.length || set===undefined) return errors;
    function fail() {return errors.concat(FB.T('Invalid dispersed civilian camps.'));}
    if (!t.opening || !t.command || !t.hostedAccess || t.preparationId!==undefined || t.expeditionProgram!==undefined ||
        !keys(set,['schema','fieldFood','entries']) || set.schema!==1 || !finite(set.fieldFood) ||
        !Array.isArray(set.entries) || set.entries.length<2 || set.entries.length>4) return fail();
    var p=(profiles || FBDATA.mobileProfiles)[t.profileId],remaining=Object.create(null),ids=Object.create(null),places=Object.create(null),food=set.fieldFood,bad=false;
    p.members.forEach(function (m) {remaining[m.id]=m.population;});
    t.opening.muster.forEach(function (m) {remaining[m.memberId]-=m.count;});
    set.entries.forEach(function (c,index) {
      if (!keys(c,['id','countyId','food','members'].concat(own(c,'siteId') ? ['siteId'] : [])) ||
          typeof c.id!=='string' || !/^[a-z][a-z0-9_]{0,47}$/.test(c.id) || ids[c.id] || !finite(c.food) ||
          !provinces.some(function (pr) {return pr.id===c.countyId && !pr.wasteland;}) ||
          t.hostedAccess.countyIds.indexOf(c.countyId)<0 || index===0 && c.countyId!==t.origin ||
          own(c,'siteId') && !FB.householdStories.localityValid({provinceId:c.countyId,siteId:c.siteId},bookmark) ||
          !Array.isArray(c.members) || !c.members.length || c.members.length>p.members.length) {bad=true;return;}
      var place=c.countyId+'|'+(c.siteId || ''),seen=Object.create(null),people=0;
      if (places[place]) bad=true;places[place]=true;ids[c.id]=true;
      c.members.forEach(function (m) {
        if (!keys(m,['memberId','civilians','reserve']) || !own(remaining,m.memberId) || seen[m.memberId] ||
            !whole(m.civilians) || !whole(m.reserve) || !(m.civilians+m.reserve)) {bad=true;return;}
        seen[m.memberId]=true;remaining[m.memberId]-=m.civilians+m.reserve;people+=m.civilians+m.reserve;
      });
      if (!people) bad=true;
      food+=c.food;
    });
    var field=t.columns ? t.columns.entries.reduce(function (n,c) {return n+c.food;},0) : set.fieldFood;
    if (field!==set.fieldFood || !t.columns && set.fieldFood>t.fighters*p.foodPerPerson*(p.supplyPolicy ? p.supplyPolicy.carryDays : 30)) bad=true;
    return bad || Math.abs(food-t.food)>0.000001 || Object.keys(remaining).some(function (id) {return remaining[id]!==0;}) ? fail() : errors;
  };
  /* Complete-batch preflight precedes even the ordinary constructor. The
     existing hosted owner reserves every county's concession atomically. */
  var initialize=M.initialize;
  M.initialize = function (s,defs) {
    var fresh=defs.filter(function (d) {return d.mobile && d.mobile.civilianCamps!==undefined && !M.row(s,d.id);});
    if (!fresh.length) return initialize(s,defs);
    var hosted=M.hostedAccessPlan(s,defs);
    fresh.forEach(function (d) {
      var original=declaration(s,d.id),t=d.mobile;
      if (s.turn!==0 || !original || d.culture!==original.culture || d.religion!==original.religion || JSON.stringify(t)!==JSON.stringify(original.mobile) ||
          !M.openingPlan(s,d).allowed || !hosted.allowed || !hosted.grants[d.id] ||
          t.civilianCamps.entries.some(function (c) {
            var info=FB.world.sitesByProv[c.countyId];
            return !s.owner[c.countyId] || own(c,'siteId') && (!info || !info.list.some(function (v) {return v.site===c.siteId;}));
          })) throw new Error(FB.T('Invalid dispersed civilian camps.'));
    });
    initialize(s,defs);
    fresh.forEach(function (d) {
      var r=M.row(s,d.id),set=d.mobile.civilianCamps,hosts=(s.armies || []).filter(function (a) {return a.realm===d.id && a.mobileFollowing;});
      if (!r.columns) {hosts[0].mobileFood=set.fieldFood;hosts[0].supply=set.fieldFood/M.hostSupplySnapshot(s,hosts[0]).capacity*100;}
      r.camps={schema:1,entries:set.entries.map(function (c) {
        var saved={id:c.id,countyId:c.countyId,food:c.food,harvestPeriod:-1,
          accounting:{initial:0,returned:0,dead:0,settled:0,dispersed:0},members:c.members.map(function (part) {
            var member=r.members.filter(function (m) {return m.id===part.memberId;})[0];
            return {memberId:part.memberId,civilians:take(member.civilians,part.civilians),reserve:take(member.civilians,part.reserve)};
          })};
        if (own(c,'siteId')) saved.siteId=c.siteId;
        saved.accounting.initial=count(saved);return saved;
      })};
      r.food=0;
    });
  };
  /* A dispersed following cannot be projected as one co-located household. */
  var household=M.householdSnapshot,supply=M.supplySnapshot,ai=M.ai;
  M.householdSnapshot = function (s,rid) {var r=M.row(s,rid);return r && r.camps ? null : household(s,rid);};
  M.supplySnapshot = function (s,rid) {var r=M.row(s,rid);return r && r.camps ? null : supply(s,rid);};
  M.ai = function (s,rid) {var r=M.row(s,rid);return r && r.camps ? false : ai(s,rid);};
  function quote(s,request) {
    var rid=request && request.realmId,t=request && request.terms,action=request && request.action,actor=request && request.actor;
    var r=M.row(s,rid),c=t && camp(s,rid,t.campId),p=M.profile(s,rid);
    var q={allowed:false,reason:'camp_operation',realmId:rid,action:action,terms:copy(t || {}),cost:0,signature:null};
    var fields={trade:['campId','count','direction'],work:['campId'],settle:['campId','count']};
    if (!keys(request,['realmId','action','terms','actor']) || !r || !c || r.status!=='active' || !M.active(s,rid) ||
        !own(fields,action) || !keys(t,fields[action]) || !keys(actor,['kind','id']) || actor.kind!=='character') return q;
    function no(reason) {q.reason=reason;return q;}
    var person=s.chars[actor.id],leader=M.leader(s,rid),market=stock(s,c);
    if (!live(s,person) || !M.commandPermits(s,rid,action) || action!=='work' && (!leader || actor.id!==leader.id)) return no('command');
    q.terms.countyId=c.countyId;
    if (own(c,'siteId')) q.terms.siteId=c.siteId;
    q.signature=JSON.stringify([s.turn,s.date,r,s.armies,s.owner,s.holder,s.population && s.population.counties[c.countyId],
      M.commandSnapshot(s,rid),s.authority.contracts,s.player,person,market,FB.treasuryAvailable(s,rid),
      FB.treasuryAvailable(s,s.owner[c.countyId]),p]);
    if (action==='trade') {
      if (!M.provisioningAccess(s,rid,c.countyId)) return no('access');
      if (!whole(t.count) || !t.count || ['buy','sell'].indexOf(t.direction)<0 || !market || !Number.isFinite(market.price) || market.price<=0 ||
          t.direction==='buy' && t.count>market.stock || t.direction==='sell' && t.count>c.food) return no('food');
      q.cost=s.owner[c.countyId]===rid ? 0 : t.count*market.price*0.1125;
      q.payer=t.direction==='buy' ? rid : s.owner[c.countyId];
      var reserve=t.direction==='buy' && p.supplyPolicy ? p.supplyPolicy.cashReserve : 0;
      if (FB.treasuryAvailable(s,q.payer)-reserve<q.cost) return no('funds');
    } else if (action==='work') {
      if (own(c,'siteId')) return no('camp_operation');
      if (!count(c) || position(s,person)!==c.countyId || s.date.year-person.born<16 ||
          p.regions.length && p.regions.indexOf(c.countyId)<0 || r.worked[person.id]===s.turn ||
          !M.provisioningAccess(s,rid,c.countyId)) return no('principal');
      if (Object.keys(r.worked).length>=64) return no('capacity');
      if (c.food<1) return no('food');
      q.cost=0.2;if (FB.treasuryAvailable(s,rid)<q.cost) return no('funds');
    } else {
      if (own(c,'siteId')) return no('camp_operation');
      if (!M.commandDecision(s,rid,'settle') || committed(s,rid)) return no('commitment');
      if (s.owner[c.countyId]!==rid || s.holder[c.countyId]!==rid) return no('award');
      var pool=[];c.members.forEach(function (m) {add(pool,m.civilians);});
      if (!whole(t.count) || !t.count || t.count>sum(pool) || !market) return no('population');
      q.transfer=FB.populationPoolQuote(s,c.countyId,pool,t.count,1);
      if (!q.transfer) return no('population');
      q.food=count(c) ? c.food*t.count/count(c) : 0;
    }
    q.allowed=true;q.reason=null;return q;
  }
  function apply(s,request,reviewed) {
    var q=quote(s,request);if (!q.allowed || JSON.stringify(q)!==JSON.stringify(reviewed)) return false;
    var r=M.row(s,q.realmId),c=camp(s,q.realmId,q.terms.campId),t=q.terms;
    if (q.action==='trade') {
      var other=q.payer===q.realmId ? s.owner[c.countyId] : q.realmId;
      if (q.payer!==other && !FB.treasuryTransfer(s,q.payer,other,q.cost)) return false;
      if (t.direction==='buy') {FB.marketWithdrawProvisions(s,c.countyId,t.count);c.food+=t.count;}
      else {FB.marketDeliverStock(s,c.countyId,'provisions',t.count);c.food-=t.count;}
    } else if (q.action==='work') {
      if (!FB.treasurySpend(s,q.realmId,q.cost)) return false;
      if (request.actor.id===s.player.charId) s.player.gold+=q.cost;
      else s.chars[request.actor.id].gold=(s.chars[request.actor.id].gold || 0)+q.cost;
      c.food--;r.worked[request.actor.id]=s.turn;
    } else {
      var pool=[];c.members.forEach(function (m) {add(pool,m.civilians);});
      if (!FB.populationPoolApply(s,pool,q.transfer)) return false;
      q.transfer.cohorts.forEach(function (wanted) {
        var left=wanted.count;
        c.members.forEach(function (m) {
          m.civilians.forEach(function (cohort) {if (cohort.culture===wanted.culture && cohort.religion===wanted.religion) {
            var n=Math.min(left,cohort.count);cohort.count-=n;left-=n;
          }});
          m.civilians=m.civilians.filter(function (v) {return v.count>0;});
        });
      });
      c.accounting.settled+=t.count;r.accounting.settled+=t.count;
      FB.marketDeliverStock(s,c.countyId,'provisions',q.food);c.food-=q.food;
    }
    r.revision++;G.invalidate();return true;
  }
  S.registerSource('mobile_camps',{quote:quote,apply:apply});
  M.reviewCamp = function (s,request) {return S.reviewSource(s,'mobile_camps',request);};
  M.campDay = function (s,rid) {
    var r=M.row(s,rid),p=M.profile(s,rid),period=Math.floor(s.turn/90),leader=M.leader(s,rid);
    r.camps.entries.forEach(function (c) {
      var access=M.accessAt(s,rid,c.countyId);
      if (access && c.harvestPeriod!==period) {
        if (!s.mobilePastures || s.mobilePastures.period!==period) s.mobilePastures={schema:1,period:period,used:{}};
        c.harvestPeriod=period;
        var used=s.mobilePastures.used[c.countyId] || 0,local=s.population.counties[c.countyId];
        var produced=Math.max(0,Math.min(count(c),access.capacity,Math.floor(local.count*0.15)-used));
        s.mobilePastures.used[c.countyId]=used+produced;c.food+=produced*p.pasturePerPerson;
      }
      if (leader && leader.id!==s.player.charId) {
        var market=stock(s,c),cash=Math.max(0,FB.treasuryAvailable(s,rid)-(p.supplyPolicy ? p.supplyPolicy.cashReserve : 0));
        var price=market && market.price*0.1125,need=count(c)*p.foodPerPerson*(p.supplyPolicy ? p.supplyPolicy.targetDays : 30);
        var amount=market && price>0 ? Math.min(Math.ceil(Math.max(0,need-c.food)),Math.floor(market.stock),
          s.owner[c.countyId]===rid ? Number.MAX_SAFE_INTEGER : Math.floor(cash/price)) : 0;
        if (amount) M.commit(s,M.reviewCamp(s,{realmId:rid,action:'trade',terms:{campId:c.id,count:amount,direction:'buy'},actor:{kind:'character',id:leader.id}}));
      }
      var ration=count(c)*p.foodPerPerson,left=Math.min(count(c),Math.ceil(Math.max(0,ration-c.food)/p.foodPerPerson*p.starvationShare)),lost=left;
      c.members.forEach(function (m) {var n=Math.min(left,sum(m.civilians));take(m.civilians,n);left-=n;
        n=Math.min(left,sum(m.reserve));take(m.reserve,n);left-=n;});
      c.accounting.dead+=lost;r.accounting.dead+=lost;c.food=Math.max(0,c.food-ration);
    });
    (s.armies || []).filter(function (a) {return a.realm===rid && a.mobileFollowing;}).forEach(function (a) {
      if (!M.commandPermits(s,rid,'march') || (a.path || []).some(function (pid) {return !M.passage(s,rid,pid,false);})) {
        a.path=[];a.goal=null;a.moveLeft=0;
      }
    });
    r.revision++;
  };
  M.campReturnHost = function (s,army) {
    var r=M.row(s,army.realm),c=r.camps.entries.filter(function (v) {return v.countyId===army.at && !own(v,'siteId');})[0];
    if (c) {
      var returned=0;
      army.mobileRoster.forEach(function (v) {
        var member=c.members.filter(function (m) {return m.memberId===v.memberId;})[0];
        if (member) {add(member.reserve,[v]);returned+=v.count;}
      });
      c.accounting.returned+=returned;r.accounting.dispersed+=army.men-returned;
      c.food+=army.men ? (army.mobileFood || 0)*returned/army.men : 0;
    } else r.accounting.dispersed+=army.men;
    army.mobileRoster=[];army.mobileFood=0;army.men=0;army.units={};
  };
  M.campDisperse = function (s,rid) {
    M.row(s,rid).camps.entries.forEach(function (c) {c.accounting.dispersed+=count(c);c.members.forEach(function (m) {m.civilians=[];m.reserve=[];});});
  };
  var validate=M.validate;
  M.validate = function (s) {
    Object.keys(s.authority && s.authority.governments || {}).forEach(function (rid) {
      var r=M.row(s,rid),d=declaration(s,rid),set=d && d.mobile && d.mobile.civilianCamps;
      function fail() {throw new Error(FB.T('Invalid dispersed camps at {realm}.',{realm:rid}));}
      if (!r) return;
      if (!set) {if (r.camps!==undefined) fail();return;}
      if (!keys(r.camps,['schema','entries']) || r.camps.schema!==1 || !Array.isArray(r.camps.entries) ||
          r.camps.entries.length!==set.entries.length || r.food!==0 ||
          r.members.some(function (m) {return m.civilians.length || m.reserve.length;}) ||
          (s.armies || []).some(function (a) {return a.realm===rid && a.mobileFollowing && a.mobileCourt;})) fail();
      r.camps.entries.forEach(function (c,index) {
        var expected=set.entries[index];
        if (!keys(c,['id','countyId','food','harvestPeriod','accounting','members'].concat(own(expected,'siteId') ? ['siteId'] : [])) ||
            c.id!==expected.id || c.countyId!==expected.countyId || c.siteId!==expected.siteId || !finite(c.food) ||
            !Number.isInteger(c.harvestPeriod) || c.harvestPeriod< -1 || c.harvestPeriod>Math.floor(s.turn/90) ||
            !keys(c.accounting,['initial','returned','dead','settled','dispersed']) ||
            Object.keys(c.accounting).some(function (k) {return !whole(c.accounting[k]);}) ||
            c.accounting.initial!==expected.members.reduce(function (n,m) {return n+m.civilians+m.reserve;},0) ||
            !Array.isArray(c.members) || c.members.length!==expected.members.length) fail();
        c.members.forEach(function (m,i) {
          if (!keys(m,['memberId','civilians','reserve']) || m.memberId!==expected.members[i].memberId ||
              !r.members.some(function (v) {return v.id===m.memberId;})) fail();
          [m.civilians,m.reserve].forEach(function (pool) {
            var seen=Object.create(null);
            if (!Array.isArray(pool) || pool.length>64) fail();
            pool.forEach(function (v) {
              var key=v && v.culture+'|'+v.religion;
              if (!keys(v,['culture','religion','count']) || v.culture!==d.culture || v.religion!==d.religion ||
                  !whole(v.count) || !v.count || seen[key]) fail();seen[key]=true;
            });
          });
        });
        if (c.accounting.initial+c.accounting.returned-c.accounting.dead-c.accounting.settled-c.accounting.dispersed!==count(c)) fail();
      });
      var totals={returned:0,dead:0,settled:0,dispersed:0};
      r.camps.entries.forEach(function (c) {Object.keys(totals).forEach(function (k) {totals[k]+=c.accounting[k];});});
      if (totals.returned>d.mobile.fighters || totals.dead>r.accounting.dead || totals.settled!==r.accounting.settled ||
          totals.dispersed>r.accounting.dispersed) fail();
    });
    return validate(s);
  };
})();
