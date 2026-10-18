/* One coalition owner, composed through government dispatch and the shared
   selection review boundary. Court position belongs to authority.migrations;
   deployed people belong to ordinary hosts, never a second army ledger. */
(function () {
  'use strict';
  var M = FB.mobile = {}, G = FB.governments, S = FB.governmentSelection, Q = FB.political;
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function whole(n) { return Number.isSafeInteger(n) && n >= 0; }
  function availablePerson(s,c) {
    return !!c && !c.dead && !c.prisonerOf && !c.captive && !c.imprisoned && !c.exiled &&
      !(FB.justiceCustodyOf && FB.justiceCustodyOf(s,c.id));
  }
  function sum(pool) { return (pool || []).reduce(function (n, c) { return n + c.count; }, 0); }
  function add(pool, cohorts) {
    cohorts.forEach(function (c) {
      var found = pool.filter(function (p) { return p.culture === c.culture && p.religion === c.religion; })[0];
      if (found) found.count += c.count;
      else pool.push({ culture:c.culture, religion:c.religion, count:c.count });
    });
  }
  /* Integer withdrawal with stable ordering and exact totals. */
  function take(pool, amount) {
    var left = Math.min(sum(pool), amount), out = [];
    for (var c of pool) {
      var n = Math.min(c.count, left);
      if (n) out.push({ culture:c.culture, religion:c.religion, count:n });
      c.count -= n; left -= n;
    }
    for (var i = pool.length - 1; i >= 0; i--) if (!pool[i].count) pool.splice(i, 1);
    return out;
  }
  function takeCohorts(pools,cohorts) {
    cohorts.forEach(function (wanted) {
      var left=wanted.count;
      pools.forEach(function (pool) {
        pool.forEach(function (c) {
          if (c.culture===wanted.culture && c.religion===wanted.religion) {var n=Math.min(left,c.count);c.count-=n;left-=n;}
        });
        for (var i=pool.length-1;i>=0;i--) if (!pool[i].count) pool.splice(i,1);
      });
    });
  }
  M.row = function (s, rid) { return s && s.authority && s.authority.governments[rid] && s.authority.governments[rid].mobile || null; };
  M.active = function (s, rid) {
    var f = G.forRealm(s, rid);
    return !!(f && f.use.territory.mobileFollowing);
  };
  M.profile = function (s, rid) { var r = M.row(s, rid); return r && FBDATA.mobileProfiles[r.profileId] || null; };
  M.migration = function (s, rid) {
    var r = M.row(s, rid);
    return r && (s.authority.migrations || []).filter(function (m) { return m.id === r.migrationId; })[0] || null;
  };
  /* Independence belongs to this declared following, never a missing patron
     on an ordinary service migration. The saved marker has no resource owner. */
  M.independent = function (t) {
    return !!t && keys(t.sponsorship,['schema','kind']) && t.sponsorship.schema===1 &&
      t.sponsorship.kind==='independent' && t.patronRealmId===null;
  };
  function openingDefinition(s,rid) {
    return (FB.campaignBookmark(s).realms || []).filter(function (d) {return d.id===rid;})[0];
  }
  M.independentMigrationAllowed = function (s,spec) {
    var d=spec && openingDefinition(s,spec.realmId), t=d && d.mobile;
    var p=t && FBDATA.mobileProfiles[t.profileId], r=d && M.row(s,d.id);
    return !!p && !!r && r.migrationId===null && M.independent(t) && !!t.command && !!t.opening && M.commandValid(s,d.id) &&
      M.independent(spec) && spec.origin===t.origin && spec.target===t.target &&
      spec.hostId==='following_'+d.id && spec.settlementForm===p.settlementForm;
  };
  M.migrationSponsorshipValid = function (s,moving) {
    var d=openingDefinition(s,moving.realmId), independent=M.independent(d && d.mobile);
    if (!independent) return moving.sponsorship===undefined;
    var p=FBDATA.mobileProfiles[d.mobile.profileId];
    return !!p && M.independent(moving) && moving.origin===d.mobile.origin && moving.hostId==='following_'+moving.realmId &&
      moving.settlementForm===p.settlementForm && moving.contractId===null && moving.choice===null && moving.warId===null &&
      (!moving.session || JSON.stringify(moving.session.seats)===JSON.stringify([moving.realmId]));
  };
  M.host = function (s, rid) {
    var m = M.migration(s, rid);
    return m && (s.armies || []).filter(function (a) { return a.id === m.hostId; })[0] || null;
  };
  M.leader = function (s, rid) {
    var r = M.row(s, rid), c = r && s.chars[r.leaderId];
    return availablePerson(s,c) && (!r.command || M.commandValid && M.commandValid(s,rid)) ? c : null;
  };
  M.members = function (s, rid) {
    var r = M.row(s, rid);
    return r ? r.members.filter(function (m) {
      var c = s.chars[m.principal.id];
      return availablePerson(s,c);
    }).map(copy) : [];
  };
  function member(s, rid, id) { var r = M.row(s, rid); return r && r.members.filter(function (m) { return m.id === id; })[0]; }
  function actorRealm(s, actor) {
    if (!actor) return null;
    if (actor.kind === 'realm') return s.realms[actor.id] && s.realms[actor.id].alive ? actor.id : null;
    var c = actor.kind === 'character' && s.chars[actor.id];
    return availablePerson(s,c) ? FB.realmIdForRulerCharacter(s, c.id) : null;
  }
  function actorMember(s, rid, actor) {
    return actor && actor.kind === 'character' && M.members(s, rid).filter(function (m) { return m.principal.id === actor.id; })[0] || null;
  }
  function location(s, actor) {
    var c = actor && actor.kind === 'character' && s.chars[actor.id];
    return c && (s.player && s.player.charId === c.id ?
      s.player.travel && s.player.travel.participationId && FB.expeditionParticipants && FB.expeditionParticipants.location(s) ||
      (s.player.travel ? s.player.travel.currentId : s.player.provinceId) : c.homeProvinceId);
  }
  M.total = function (s, rid) {
    var r = M.row(s, rid);
    return r ? r.members.reduce(function (n, m) { return n + sum(m.civilians) + sum(m.reserve); }, 0) +
      (s.armies || []).filter(function (a) { return a.realm === rid && a.mobileFollowing; }).reduce(function (n, a) { return n + a.men; }, 0) : 0;
  };
  function civilians(r) { return r.members.reduce(function (n, m) { return n + sum(m.civilians); }, 0); }
  function reserve(r) { return r.members.reduce(function (n, m) { return n + sum(m.reserve); }, 0); }
  function hostRation(s,army,p) {
    return army ? army.men*p.foodPerPerson*Math.max(0.1,
      FB.armyProvisionUse(s,army)/Math.max(0.1,FBDATA.balance.supplyDrainBase || 1.2)) : 0;
  }
  function hostCapacity(army,p) {
    return army.men*p.foodPerPerson*(p.supplyPolicy ? p.supplyPolicy.carryDays : 30);
  }
  function hostLoadTarget(s,army,p) {
    var capacity=hostCapacity(army,p);
    return p.supplyPolicy ? Math.min(capacity,hostRation(s,army,p)*p.supplyPolicy.targetDays) : capacity;
  }
  function recruitmentPools(s,rid) {
    var r=M.row(s,rid), living=M.members(s,rid);
    return r.members.map(function (a) {
      var active=living.some(function (b) {return b.id===a.id && b.allegiance;}), field=deployed(s,rid,a.id);
      return {memberId:a.id,count:active ? Math.min(sum(a.reserve)+sum(a.civilians),
        Math.max(0,Math.floor((sum(a.civilians)+sum(a.reserve)+field)*a.pledge)-field)) : 0};
    });
  }
  /* A policy projects existing inventories and transactions. It has no purse,
     food ledger, pasture grant or restore-time initializer of its own. */
  M.supplySnapshot = function (s,rid) {
    var r=M.row(s,rid), p=M.profile(s,rid), moving=M.migration(s,rid), policy=p && p.supplyPolicy;
    if (!r || !moving || !policy) return null;
    var army=M.host(s,rid), local=!!army && army.at===moving.at;
    var campDaily=(civilians(r)+reserve(r))*p.foodPerPerson, fieldDaily=hostRation(s,army,p);
    var fieldCapacity=army ? hostCapacity(army,p) : 0;
    var fieldTarget=army ? hostLoadTarget(s,army,p) : 0;
    var target=campDaily*policy.targetDays+(local ? Math.max(0,fieldTarget-(army.mobileFood || 0)) : 0);
    var stock=FB.marketProvisionSnapshot(s,moving.at), unitPrice=stock && s.owner[moving.at]!==rid ? stock.price*0.1125 : 0;
    var spendable=Math.max(0,FB.treasuryAvailable(s,rid)-policy.cashReserve);
    var buy=Math.max(0,Math.min(Math.ceil(Math.max(0,target-r.food)),Math.floor(stock && stock.stock || 0),
      unitPrice>0 ? Math.floor(spendable/unitPrice) : Number.MAX_SAFE_INTEGER));
    if (!safe(s,rid,moving.at) || !stock) buy=0;
    var result={campDaily:campDaily,fieldDaily:fieldDaily,fieldLocal:local,campTarget:target,fieldTarget:fieldTarget,
      fieldCapacity:fieldCapacity,targetDays:policy.targetDays,carryDays:policy.carryDays,cashReserve:policy.cashReserve,
      purchase:{countyId:moving.at,count:buy,direction:'buy',provisioning:true},replacement:null};
    var replacement=policy.replacement;
    if (replacement && (!army || local) && !committed(s,rid) && r.food+(local ? army.mobileFood || 0 : 0)>=campDaily+fieldDaily) {
      var count=Math.min(Math.max(0,replacement.targetMen-(army ? army.men : 0)),replacement.maxPerReview,
        recruitmentPools(s,rid).reduce(function (n,a) {return n+a.count;},0),
        p.recruitCost>0 ? Math.floor(spendable/p.recruitCost) : Number.MAX_SAFE_INTEGER);
      if (count>0) replacement.unitIds.some(function (unitId) {
        var terms={count:count,unitId:unitId};
        if (!M.quote(s,{realmId:rid,action:'recruit',terms:terms,actor:{kind:'realm',id:rid}}).allowed) return false;
        terms.provisioning=true;result.replacement=terms;return true;
      });
    }
    return result;
  };
  M.supplyReview = function (s,rid,action,actor) {
    if (action!=='trade' && action!=='recruit') return null;
    var snapshot=M.supplySnapshot(s,rid), terms=snapshot && (action==='trade' ? snapshot.purchase : snapshot.replacement);
    return M.review(s,{realmId:rid,action:action,terms:terms || {provisioning:true},actor:actor || {kind:'realm',id:rid}});
  };
  function deployed(s, rid, mid) {
    return (s.armies || []).filter(function (a) { return a.realm === rid && a.mobileFollowing; })
      .reduce(function (n, a) { return n + (a.mobileRoster || []).filter(function (c) { return c.memberId === mid; }).reduce(function (v, c) { return v + c.count; }, 0); }, 0);
  }
  function eligible(s, rid, cid) {
    var p = M.profile(s, rid), c = s.chars[cid];
    return !!(p && availablePerson(s,c) && s.date.year - c.born >= p.minAge &&
      M.members(s, rid).some(function (m) { return m.principal.id === cid && m.allegiance; }));
  }
  // A lawful subordinate holder can grant local access. Foreign occupation
  // cannot: its owner is outside the holder's current superior chain.
  function accessControl(s, partner, pid) {
    var owner = s.owner[pid], realm = s.realms[partner];
    return !!(owner && s.realms[owner] && s.realms[owner].alive && realm && realm.alive &&
      s.holder[pid] === partner && FB.topRealm(s, partner) === owner);
  }
  function activeAccess(s, rid, pid) {
    var r = M.row(s, rid);
    return r && r.agreements.filter(function (a) {
      return a.kind === 'access' && a.status === 'active' && a.endTurn > s.turn &&
        a.countyIds.indexOf(pid) >= 0 && s.realms[a.partnerId] && s.realms[a.partnerId].alive &&
        accessControl(s, a.partnerId, pid) &&
        (!r.openingAccess || r.openingAccess.id !== a.id || hostedAccessCurrent(s, rid, a)) &&
        !FB.armiesHostile(s, { realm:rid }, { realm:a.partnerId });
    })[0];
  }
  M.householdSnapshot = function (s, rid) {
    var r = M.row(s, rid), m = M.migration(s, rid), p = M.profile(s, rid);
    if (!r || !m || !p) return null;
    var market = FB.marketProvisionSnapshot(s, m.at), access = activeAccess(s, rid, m.at), host = M.host(s, rid);
    var supply=p.supplyPolicy && M.supplySnapshot(s,rid);
    return { realmId:rid, active:!!(s.realms[rid] && s.realms[rid].alive && M.active(s, rid) && r.status === 'active'),
      provinceId:m.at, moving:!!(host && host.mobileCourt && (host.moveLeft > 0 || (host.path || []).length)), food:r.food,
      scarce:r.food < (supply ? supply.campTarget : M.total(s, rid) * p.foodPerPerson * 30),
      treasury:FB.treasuryAvailable(s, rid), marketFood:market ? market.stock : 0,
      access:access ? copy(access) : null };
  };
  M.passage = function (s, rid, pid, court) {
    return s.owner[pid] === rid || !!activeAccess(s, rid, pid) ||
      !!(s.owner[pid] && FB.armiesHostile(s, { realm:rid }, { realm:s.owner[pid] })) ||
      !court && M.row(s,rid).agreements.some(function (a) {return a.kind==='protection' && a.status==='active' && a.endTurn>s.turn && a.partnerId===s.owner[pid];});
  };
  function validTerms(action,t) {
    var fields = {pledge:['memberId','allegiance','pledge'],support:['candidateId'],select:['candidateId'],propose:['operation','proposal'],
      assent:['assent'],recruit:['count','unitId','provisioning'],demuster:[],move:['countyId'],offer:['kind','partnerId','countyIds','capacity','allowRecruit','price','duration','levy'],
      accept:['agreementId'],join:['countyId','count'],replace_member:['memberId','candidateId'],leave:['memberId','countyId'],settle:['countyId','count','final'],
      work:[],trade:['countyId','count','direction','provisioning'],war:['causes'],peace:['warId'],service:['agreementId','warId'],march:['countyId'],
      land:['countyId'],contract:['contractId','signature']};
    if (!fields[action] || !keys(t,fields[action]) || JSON.stringify(t).length>4096) return false;
    if (t.provisioning!==undefined && t.provisioning!==true) return false;
    if (action==='contract' && (typeof t.contractId!=='string' || typeof t.signature!=='string')) return false;
    if (['count','capacity','price','duration','levy'].some(function (k) {return t[k]!==undefined && !whole(t[k]);})) return false;
    return true;
  }
  function proposalAction(operation) {
    return {settle:'settle',agreement:'offer',war:'war',treaty:'peace',land:'land',contract:'contract'}[operation];
  }
  M.contractTerms = function (s,id) {
    var c=Q.contract(s,id);
    if (!c) return null;
    ['approvals','status','startTurn','initialPaidTurn','changedTurn','transitionReason','effective','ineffectiveReason',
      'paidThroughPeriod','serviceThroughPeriod'].forEach(function (k) {delete c[k];});
    return {contractId:id,signature:JSON.stringify(c)};
  };
  function safe(s, rid, pid) { return s.owner[pid] === rid && s.holder[pid] === rid || !!activeAccess(s, rid, pid); }
  function committed(s, rid, exception) {
    return (s.authority.contracts || []).some(function (c) { return c.id !== exception && c.federateRealmId === rid && Q.contract(s, c.id).effective; }) ||
      M.row(s, rid).agreements.some(function (a) { return a.kind !== 'access' && a.status === 'active' && a.endTurn > s.turn; });
  }
  function decision(s, rid, operation, terms) {
    if (M.row(s,rid).command) return M.commandDecision(s,rid,operation);
    var r = M.row(s, rid), d = r.decision, live = M.members(s, rid), weight = 0, yes = 0;
    if (!d || d.operation !== operation || JSON.stringify(d.terms) !== JSON.stringify(terms)) return false;
    live.forEach(function (m) {
      weight += m.weight;
      if (m.allegiance && d.approvals[m.id] === m.principal.id) yes += m.weight;
    });
    return weight > 0 && yes / weight >= M.profile(s, rid).threshold;
  }
  function capacity(s, pid) { var c = s.population && s.population.counties[pid]; return c ? Math.floor(c.count * 0.15) : 0; }
  function allocated(s, pid, exclude) {
    var n = 0;
    Object.keys(s.authority.governments).forEach(function (rid) {
      var r = M.row(s, rid);
      if (r) r.agreements.forEach(function (a) {
        if (a.id !== exclude && a.kind === 'access' && a.status === 'active' && a.endTurn > s.turn && a.countyIds.indexOf(pid) >= 0) n += a.capacity;
      });
    });
    return n;
  }
  function hostedAccessId(d) { return 'opening_access_' + d.id + '_' + d.mobile.hostedAccess.id; }
  function hostedAccessCurrent(s, rid, a) {
    var partner = a.partnerId === 'player' ? s.chars[s.player.charId] : FB.realmRulerCharacterSnapshot(s, a.partnerId);
    return !!M.leader(s, rid) && availablePerson(s, partner) &&
      FB.realmRulerGeneration(s, rid) === a.generations[0] &&
      FB.realmRulerGeneration(s, a.partnerId) === a.generations[1] &&
      !FB.armiesHostile(s, { realm:rid }, { realm:a.partnerId }) && a.countyIds.every(function (pid) {
        return accessControl(s, a.partnerId, pid) && a.capacity + allocated(s, pid, a.id) <= capacity(s, pid);
      });
  }
  /* Opening consent is a declaration of an existing relationship, not a new
     offer or a replay of its former purchase. Preflight the whole batch. */
  M.hostedAccessPlan = function (s, defs) {
    var result = { allowed:true, grants:Object.create(null) }, reserved = Object.create(null);
    defs.forEach(function (d) {
      var t = d.mobile, a = t && t.hostedAccess;
      if (a === undefined || M.row(s, d.id)) return;
      var bm = FB.campaignBookmark(s), realms = Object.create(null);
      (bm.realms || []).forEach(function (r) { realms[r.id] = r; });
      if (s.turn !== 0 || M.definitionFaults(d, G.forRealm(s,d.id).id, bm.provinces, realms, null, bm).length) {
        result.allowed = false; return;
      }
      var partnerId = FB.startRealmId(s,a.partnerRealmId), person = FB.bookmarkActor(s,a.partnerActorId);
      var current = partnerId === 'player' ? s.chars[s.player.charId] : FB.realmRulerCharacterSnapshot(s,partnerId);
      if (!s.realms[partnerId] || !s.realms[partnerId].alive || !availablePerson(s,person) || !current || person.id !== current.id ||
          FB.armiesHostile(s, {realm:d.id}, {realm:partnerId}) ||
          a.countyIds.some(function (pid) {
            return !accessControl(s,partnerId,pid) ||
              a.capacity + allocated(s,pid) + (reserved[pid] || 0) > capacity(s,pid);
          })) { result.allowed = false; return; }
      a.countyIds.forEach(function (pid) { reserved[pid] = (reserved[pid] || 0) + a.capacity; });
      result.grants[d.id] = { id:hostedAccessId(d), kind:'access', partnerId:partnerId,
        countyIds:a.countyIds.slice(), capacity:a.capacity, allowRecruit:a.allowRecruit, price:0, duration:a.duration,
        status:'active', startTurn:0, endTurn:a.duration, harvestPeriod:-1,
        generations:[0, FB.realmRulerGeneration(s,partnerId)] };
    });
    return result;
  };
  function stamp(s, rid, t, actor) {
    var r = M.row(s, rid), ids = r.members.map(function (m) { return m.principal.id; }).concat(t.candidateId || [], actor && actor.id || []);
    var chars = ids.map(function (id) { return s.chars[id] || null; });
    return JSON.stringify([s.turn, s.date.year, r, M.migration(s, rid),
      (s.armies || []).filter(function (a) { return a.realm === rid; }), chars,
      s.owner, s.holder, s.population && s.population.counties[t.countyId],
      s.realms[rid].ruler, t.partnerId && s.realms[t.partnerId],
      FB.treasuryAvailable(s, rid), t.partnerId && FB.treasuryAvailable(s, t.partnerId),
      s.authority.contracts, s.authority.governments, s.player && [s.player.charId, s.player.provinceId, s.player.gold, s.player.travel || null],
      s.market && s.market.counties && s.market.counties[t.countyId],
      r.command ? M.commandSnapshot(s,rid) : null, t.provisioning ? M.profile(s,rid).supplyPolicy : null]);
  }
  /* All requests, including AI requests, carry an actual acting principal.
     Refused and stale reviews have no side effects, UID use or RNG draws. */
  M.quote = function (s, request) {
    var rid = request.realmId, r = M.row(s, rid), p = M.profile(s, rid), t = copy(request.terms || {}), action = request.action;
    var q = { allowed:false, reason:'inactive', realmId:rid, action:action, terms:t, cost:0, signature:null };
    if (!r || !p || !M.active(s, rid) || r.status !== 'active') return q;
    if (!validTerms(action,t)) {q.reason='operation';return q;}
    if (r.columns && ['recruit','demuster','move','march','leave','replace_member','settle','war','service','land','contract'].indexOf(action)>=0) {
      q.reason='column_operation';return q;
    }
    if (r.command && !M.commandPermits(s,rid,action)) {q.reason='command';return q;}
    if (t.provisioning) {
      var supply=M.supplySnapshot(s,rid), expected=supply && (action==='trade' ? supply.purchase : supply.replacement);
      if (!expected || !expected.count || Object.keys(expected).some(function (k) {return t[k]!==expected[k];})) {
        q.reason='provisioning';return q;
      }
    }
    var ar = actorRealm(s, request.actor), am = actorMember(s, rid, request.actor), leader = ar === rid && !!M.leader(s, rid);
    q.signature = stamp(s, rid, t, request.actor);
    function no(reason) { q.reason = reason; return q; }
    var m = member(s, rid, t.memberId), moving = M.migration(s, rid), army = M.host(s, rid);
    if (action === 'pledge') {
      if (!m || !am || am.id !== m.id || typeof t.allegiance !== 'boolean' ||
          !Number.isFinite(t.pledge) || t.pledge < 0 || t.pledge > p.recruitShare) return no('principal');
    } else if (action === 'support') {
      if (!am || !am.allegiance || !r.selection || !eligible(s, rid, t.candidateId)) return no('candidate');
    } else if (action === 'select') {
      if (!r.selection || !eligible(s, rid, t.candidateId) || !(am || ar === rid)) return no('candidate');
      var all = M.members(s, rid), weight = all.reduce(function (n, a) { return n + a.weight; }, 0);
      var yes = all.reduce(function (n, a) { return n + (a.allegiance && r.selection.votes[a.id] === t.candidateId ? a.weight : 0); }, 0);
      if (!weight || yes / weight < p.threshold) return no('withheld');
    } else if (action === 'propose') {
      if (!leader || !proposalAction(t.operation) || !validTerms(proposalAction(t.operation),t.proposal)) return no('principal');
    } else if (action === 'assent') {
      if (!am || !r.decision || typeof t.assent !== 'boolean') return no('principal');
    } else if (action === 'recruit') {
      if (!leader || !moving || army && (army.at!==moving.at || army.moveLeft>0) || !whole(t.count) || !t.count || !FBDATA.unitClasses[t.unitId]) return no('commitment');
      if (FBDATA.unitClasses[t.unitId].hired || !FB.unitClassUnlocked(s, t.unitId, rid)) return no('technology');
      q.plan = []; var need = t.count;
      recruitmentPools(s,rid).forEach(function (a) {
        var n=Math.min(need,a.count);
        if (n) q.plan.push({memberId:a.memberId,count:n});need-=n;
      });
      if (need) return no('following');
      var roster = copy(army && army.mobileRoster || []);
      q.plan.forEach(function (part) {
        var a = member(s,rid,part.memberId), pools = copy(a.reserve), returning = take(pools,part.count);
        pools = copy(a.civilians);
        returning.concat(take(pools,part.count-sum(returning))).forEach(function (c) {
          if (!roster.some(function (v) {return v.memberId===a.id && v.culture===c.culture && v.religion===c.religion;}))
            roster.push(Object.assign({memberId:a.id},c));
        });
      });
      if (roster.length>64) return no('capacity');
      q.cost = t.count * p.recruitCost;
      if (FB.treasuryAvailable(s, rid) < q.cost) return no('funds');
    } else if (action === 'demuster') {
      if (!leader || !army || army.at!==moving.at || army.moveLeft > 0 || committed(s, rid) || FB.isRealmAtWar(s, rid)) return no('commitment');
    } else if (action === 'move' || action === 'march') {
      if (!leader || !army || !FB.world.byId[t.countyId]) return no('principal');
      if (action==='move' && army.at!==moving.at) return no('commitment');
      var plan = FB.armyOrderPlan(s, army, t.countyId);
      if (!plan || !plan.ok || !plan.path || plan.path.some(function (pid) { return !M.passage(s, rid, pid, action==='move'); })) return no('access');
      q.path = plan.path.slice();
    } else if (action === 'offer') {
      if (!leader || r.agreements.length >= p.maxAgreements || !s.realms[t.partnerId] || !s.realms[t.partnerId].alive ||
          t.partnerId === rid || ['access','tribute','protection'].indexOf(t.kind) < 0 ||
          !whole(t.price) || !whole(t.duration) || !t.duration || t.duration > 1440 ||
          !decision(s, rid, 'agreement', t) || FB.isRealmAtWar(s, rid)) return no('withheld');
      if (t.kind === 'access' && (!Array.isArray(t.countyIds) || !t.countyIds.length || t.countyIds.length > 16 ||
          !whole(t.capacity) || !t.capacity || typeof t.allowRecruit !== 'boolean' || t.countyIds.some(function (pid, i) {
            return t.countyIds.indexOf(pid) !== i || !accessControl(s, t.partnerId, pid) ||
              t.capacity + allocated(s, pid) > capacity(s, pid);
          }))) return no('capacity');
      if (t.kind !== 'access' && (!whole(t.levy) || t.levy > (army && army.men || 0))) return no('following');
      if (t.kind==='protection' && (!t.levy || t.levy + r.agreements.filter(function (a) {return a.kind==='protection' && a.status==='active' && a.endTurn>s.turn;})
          .reduce(function (n,a) {return n+a.levy;},0) > (army && army.men || 0))) return no('following');
    } else if (action === 'accept') {
      var a = r.agreements.filter(function (a) { return a.id === t.agreementId; })[0];
      if (!a || a.status !== 'offered' || a.endTurn <= s.turn || ar !== a.partnerId ||
          FB.realmRulerGeneration(s, rid) !== a.generations[0] || FB.realmRulerGeneration(s, a.partnerId) !== a.generations[1] ||
          FB.armiesHostile(s, { realm:rid }, { realm:a.partnerId })) return no('partner');
      var partnerTerms = Object.assign({},a,{externalRealmId:rid,
        agreementPrice:a.price,price:a.kind === 'protection' ? a.price : 0});
      // This is the reviewed treaty transaction. Civic partners must approve
      // its actual burden through their executive and constituency.
      q.partnerConsent = FB.civicGovernment && FB.civicGovernment.active(s,a.partnerId)
        ? FB.civicGovernment.decision(s,a.partnerId,'treaty',partnerTerms)
        : Q.consent(s,request.actor,'treaty',{externalRealmId:rid,kind:a.kind});
      if (!q.partnerConsent.allowed) return no('partner');
      if (a.kind === 'access' && a.countyIds.some(function (pid) {
        return !accessControl(s, a.partnerId, pid) || a.capacity + allocated(s, pid, a.id) > capacity(s, pid);
      })) return no('capacity');
      if(a.kind==='protection' && a.levy+r.agreements.filter(function (b) {return b.kind==='protection' && b.status==='active' && b.endTurn>s.turn;})
          .reduce(function (n,b) {return n+b.levy;},0)>(army && army.men || 0)) return no('following');
      var payer = a.kind === 'protection' ? a.partnerId : rid;
      if (FB.treasuryAvailable(s, payer) < a.price) return no('funds');
      q.cost = a.price; q.payer = payer;
    } else if (action === 'join') {
      var c = request.actor && s.chars[request.actor.id], access = activeAccess(s, rid, t.countyId);
      if (!availablePerson(s,c) || request.actor.kind!=='character' || FB.isReigningRealmRuler(s,c) ||
          s.date.year - c.born < p.minAge || location(s, request.actor) !== moving.at ||
          t.countyId !== moving.at || r.members.length >= p.maxMembers || r.members.some(function (a) { return a.principal.id === c.id; }) ||
          !(s.owner[t.countyId] === rid && s.holder[t.countyId] === rid || access && access.allowRecruit)) return no('principal');
      q.transfer = FB.populationPoolQuote(s, t.countyId, [], t.count, -1);
      if (!q.transfer || t.count > 1000) return no('population');
    } else if (action === 'replace_member') {
      var replacement = s.chars[t.candidateId], former = m && s.chars[m.principal.id];
      var recovery = !M.members(s,rid).length && request.actor && request.actor.kind==='character' && request.actor.id===t.candidateId;
      if (!(leader || recovery) || !m || former && !former.dead || !availablePerson(s,replacement) ||
          s.date.year - replacement.born < p.minAge || replacement.homeProvinceId !== moving.at ||
          FB.isReigningRealmRuler(s,replacement) || FB.skillSnapshot(s,replacement,'dip')<3 ||
          r.members.some(function (a) { return a.principal.id === replacement.id; })) return no('principal');
    } else if (action === 'leave') {
      if (!am || !m || am.id !== m.id || deployed(s, rid, m.id) || committed(s, rid) ||
          !safe(s, rid, t.countyId) || t.countyId !== moving.at) return no('commitment');
      var pool = copy(m.civilians); add(pool, m.reserve);
      q.transfer = sum(pool) ? FB.populationPoolQuote(s, t.countyId, pool, sum(pool), 1) : null;
      if (sum(pool) && !q.transfer) return no('population');
      if (!FB.marketProvisionSnapshot(s,t.countyId)) return no('food');
      q.foodTransfer = M.total(s,rid) ? r.food*sum(pool)/M.total(s,rid) : r.members.length===1 ? r.food : 0;
    } else if (action === 'land') {
      if (!leader || !army || !army.men || moving.sponsorship || moving.choice || army.at!==moving.at || army.moveLeft>0 || t.countyId!==moving.at ||
          s.owner[t.countyId]!==moving.patronRealmId || s.holder[t.countyId]!==moving.patronRealmId ||
          committed(s,rid) || FB.isRealmAtWar(s,rid) || !decision(s,rid,'land',t)) return no('award');
    } else if (action === 'contract') {
      q.contract=Q.contract(s,t.contractId);
      if (!leader || !q.contract || q.contract.status!=='offered' ||
          [q.contract.patronRealmId,q.contract.federateRealmId].indexOf(rid)<0 ||
          JSON.stringify(M.contractTerms(s,t.contractId))!==JSON.stringify(t) || !decision(s,rid,'contract',t) ||
          q.contract.approvals[rid]!==undefined || !Q.contractQuote(s,s.authority.contracts.filter(function (c) {return c.id===t.contractId;})[0]).allowed ||
          q.contract.succession.patron!==FB.realmRulerGeneration(s,q.contract.patronRealmId) ||
          q.contract.succession.federate!==FB.realmRulerGeneration(s,q.contract.federateRealmId)) return no('partner');
      q.cost=q.contract.patronRealmId===rid && q.contract.initialPaidTurn===undefined ? q.contract.initialPay || 0 : 0;
      if (FB.treasuryAvailable(s,rid)<q.cost) return no('funds');
    } else if (action === 'settle') {
      if (!leader || !moving || !whole(t.count) || !t.count || typeof t.final !== 'boolean' ||
          !decision(s, rid, 'settle', t) || committed(s, rid, moving.contractId && moving.choice === 'land' ? moving.contractId : null) || FB.isRealmAtWar(s, rid) ||
          t.countyId !== moving.at || army && army.moveLeft > 0) return no('withheld');
      q.award = G.strategy('territory', 'non_territorial').settlement(s, rid, { migrationId:moving.id });
      if (!(s.owner[t.countyId] === rid && s.holder[t.countyId] === rid) &&
          !(q.award && q.award.provinceId === t.countyId)) return no('award');
      if (!t.final && t.count >= civilians(r) || t.final && t.count !== M.total(s, rid)) return no('population');
      var settling = []; r.members.forEach(function (a) { add(settling, a.civilians); if (t.final) add(settling, a.reserve); });
      if (t.final && army) add(settling, army.mobileRoster);
      q.transfer = FB.populationPoolQuote(s, t.countyId, settling, t.count, 1);
      if (!q.transfer) return no('population');
      if (!FB.marketProvisionSnapshot(s,t.countyId)) return no('food');
      q.foodTransfer = t.final ? r.food + (army && army.mobileFood || 0) : r.food * t.count / M.total(s,rid);
    } else if (action === 'work') {
      var worker = request.actor && s.chars[request.actor.id];
      if (!availablePerson(s,worker) || request.actor.kind!=='character' || location(s, request.actor) !== moving.at ||
          p.regions.length && p.regions.indexOf(moving.at) < 0 ||
          s.date.year - worker.born < 16 || r.worked[worker.id] === s.turn) return no('principal');
      if (Object.keys(r.worked).length >= 64 && r.worked[worker.id] === undefined) return no('capacity');
      q.cost = 0.2;
      if (FB.treasuryAvailable(s, rid) < q.cost) return no('funds');
      if(r.food<1) return no('food');
    } else if (action === 'trade') {
      if (!leader || !safe(s, rid, t.countyId) || t.countyId !== moving.at || !whole(t.count) || !t.count ||
          ['buy','sell'].indexOf(t.direction) < 0) return no('access');
      var stock = FB.marketProvisionSnapshot(s, t.countyId);
      if (!stock || t.direction === 'buy' && t.count > stock.stock || t.direction === 'sell' && t.count > r.food) return no('food');
      q.cost = t.count * stock.price * 0.1125;
      q.payer = t.direction === 'buy' ? rid : s.owner[t.countyId];
      if (s.owner[t.countyId]===rid) q.cost=0;
      if (FB.treasuryAvailable(s, q.payer) < q.cost) return no('funds');
    } else if (action === 'war') {
      if (!leader || !army || !army.men || committed(s,rid) || !decision(s,rid,'war',t) ||
          !Array.isArray(t.causes) || t.causes.length!==1 || !keys(t.causes[0],['type','target','enemy']) || t.causes[0].type!=='aggression') return no('withheld');
      q.declaration = FB.warDeclarationPreview(s,rid,t.causes,{frontier:[moving.at]});
      if (!q.declaration.valid || q.declaration.unlawful) return no('award');
    } else if (action === 'peace') {
      q.war = copy(FB.ordinaryWarById(s,t.warId) || null);
      if (!leader || !q.war || [q.war.attacker,q.war.defender].indexOf(rid)<0 || !decision(s,rid,'treaty',t)) return no('withheld');
    } else if (action === 'service') {
      var service = r.agreements.filter(function (a) {return a.id===t.agreementId && a.kind==='protection' && a.status==='active' && a.endTurn>s.turn;})[0];
      q.war = copy(FB.ordinaryWarById(s,t.warId) || null);
      if (!leader || !service || !q.war || !army || army.men<service.levy || FB.isRealmAtWar(s,rid) ||
          [q.war.attacker,q.war.defender].indexOf(service.partnerId)<0) return no('commitment');
    } else return no('operation');
    q.allowed = true; q.reason = null; return q;
  };
  function next(r, prefix) {
    var id;
    do {r.serial++;id=prefix+r.serial;} while(r.members.concat(r.agreements).some(function (row) {return row.id===id;}));
    return id;
  }
  function install(s, rid, cid) {
    var r = M.row(s, rid), c = s.chars[cid], realm = s.realms[rid];
    r.leaderId = cid; r.selection = null; r.decision = null;
    realm.ruler = { name:c.name, sex:c.sex, born:c.born, age:s.date.year - c.born, culture:c.culture, religion:c.religion,
      mar:FB.skillSnapshot(s,c,'mar'),trait:c.traits && c.traits[0] || null,
      personality:'cautious', generation:FB.realmRulerGeneration(s, rid) + 1 };
    var migration = M.migration(s, rid);
    if (migration && migration.courtIds.indexOf(cid) < 0) migration.courtIds.push(cid);
    G.invalidate(); FB.invalidateRealmCache();
  }
  M.installLeader = install;
  function newHost(s, rid) {
    var m = M.migration(s, rid), a = { id:m.hostId, realm:rid, at:m.at, from:m.at,
      men:0, size:0, units:{}, supply:0, path:[], goal:null, moveLeft:0,
      warId:null, migrationId:m.id, mobileFollowing:true, mobileCourt:false, mobileFood:0, mobileRoster:[] };
    FB.hostUnits(a);
    s.armies.push(a); return a;
  }
  function returnHost(s, army) {
    M.row(s,army.realm).food += army.mobileFood || 0; army.mobileFood=0;
    (army.mobileRoster || []).forEach(function (c) {
      var m = member(s, army.realm, c.memberId);
      if (m) add(m.reserve, [c]);
    });
    army.mobileRoster = []; army.men = 0; army.units = {};
  }
  function depart(s, rid, m, pool, quote) {
    var r = M.row(s, rid), n = sum(pool);
    if (quote && !FB.populationPoolApply(s, pool, quote)) return false;
    r.accounting.settled += n;
    r.members.splice(r.members.indexOf(m), 1);
    if (r.leaderId === m.principal.id) {
      r.leaderId = null; r.selection = r.command ? null : { votes:{} };
      if (r.command) r.command.status='vacant';
    }
    if (r.selection) delete r.selection.votes[m.id];
    if (r.selection) r.selection.votes = {};
    var moving = M.migration(s,rid);
    if (r.members.length) moving.courtIds = moving.courtIds.filter(function (cid) {return cid !== m.principal.id;});
    if (!r.members.length) {r.status='dispersed';moving.status='failed';moving.failureReason='following_left';FB.markRealmDead(s,rid);}
    r.decision = null; return true;
  }
  M.apply = function (s, request, reviewed) {
    var q = M.quote(s, request);
    if (!q.allowed || JSON.stringify(q) !== JSON.stringify(reviewed)) return false;
    var rid = q.realmId, r = M.row(s, rid), t = q.terms, m = member(s, rid, t.memberId), moving = M.migration(s, rid), army = M.host(s, rid);
    if (q.action === 'pledge') { m.pledge = t.pledge; m.allegiance = t.allegiance; r.decision = null; if (r.selection) delete r.selection.votes[m.id]; }
    else if (q.action === 'support') r.selection.votes[actorMember(s, rid, request.actor).id] = t.candidateId;
    else if (q.action === 'select') install(s, rid, t.candidateId);
    else if (q.action === 'propose') r.decision = { operation:t.operation, terms:copy(t.proposal), approvals:{} };
    else if (q.action === 'assent') {
      var id = actorMember(s, rid, request.actor).id;
      if (t.assent) r.decision.approvals[id] = request.actor.id; else delete r.decision.approvals[id];
    } else if (q.action === 'recruit') {
      if (!FB.treasurySpend(s, rid, q.cost)) return false;
      if (!army) army = newHost(s, rid);
      q.plan.forEach(function (part) {
        var a = member(s, rid, part.memberId), returning = take(a.reserve, part.count);
        var cohorts = returning.concat(take(a.civilians, part.count - sum(returning)));
        cohorts.forEach(function (c) {
          var existing = army.mobileRoster.filter(function (v) { return v.memberId === a.id && v.culture === c.culture && v.religion === c.religion; })[0];
          if (existing) existing.count += c.count; else army.mobileRoster.push(Object.assign({ memberId:a.id }, c));
        });
      });
      army.men += t.count; army.size = Math.max(army.size, army.men); army.units[t.unitId] = (army.units[t.unitId] || 0) + t.count;
      army.supply=FB.clamp((army.mobileFood || 0)/Math.max(0.01,hostCapacity(army,M.profile(s,rid)))*100,0,100);
      delete r.defeatKey;
    } else if (q.action === 'demuster') { returnHost(s, army); army.mobileFollowing = false; FB.disbandArmy(s, army); }
    else if (q.action === 'move' || q.action === 'march') {
      /* The reviewed path checks the requested court mode, rather than the
         previous march's mode. The ordinary planner still owns the order. */
      if (!order(s, army, t.countyId)) return false;
      army.mobileCourt = q.action==='move';
    }
    else if (q.action === 'offer') {
      r.agreements.push(Object.assign(copy(t), { id:next(r, 'agreement_'), status:'offered',
        startTurn:s.turn, endTurn:s.turn + t.duration, harvestPeriod:-1,
        generations:[FB.realmRulerGeneration(s, rid), FB.realmRulerGeneration(s, t.partnerId)] }));
      r.decision = null;
    } else if (q.action === 'accept') {
      var a = r.agreements.filter(function (a) { return a.id === t.agreementId; })[0], to = q.payer === rid ? a.partnerId : rid;
      if (!FB.treasuryTransfer(s, q.payer, to, a.price)) return false;
      a.status = 'active'; a.startTurn = s.turn; a.endTurn = s.turn + a.duration;
    } else if (q.action === 'join') {
      var joined = [];
      if (!FB.populationPoolApply(s, joined, q.transfer)) return false;
      r.accounting.arrivals += t.count;
      r.members.push({ id:next(r, 'member_'), principal:copy(request.actor), scope:{kind:'realm', id:rid},
        basis:'following', continuity:'member', weight:1, pledge:0, allegiance:true, civilians:joined, reserve:[] });
      if (moving.courtIds.indexOf(request.actor.id) < 0) moving.courtIds.push(request.actor.id); r.decision = null;
    } else if (q.action === 'replace_member') {
      var formerId=m.principal.id;
      m.principal = {kind:'character', id:t.candidateId};
      moving.courtIds=moving.courtIds.filter(function (cid) {return cid!==formerId;});
      if (moving.courtIds.indexOf(t.candidateId) < 0) moving.courtIds.push(t.candidateId);
      r.decision = null; if (r.selection) r.selection.votes = {};
    } else if (q.action === 'leave') {
      var leaving = copy(m.civilians); add(leaving, m.reserve);
      if (!depart(s, rid, m, leaving, q.transfer)) return false;
      FB.marketDeliverStock(s,t.countyId,'provisions',q.foodTransfer); r.food-=q.foodTransfer;
    } else if (q.action === 'land') {
      var target=moving.target;moving.target=t.countyId;
      if (!FB.federateRequest(s,moving.id,'land')) {moving.target=target;return false;}
      r.decision=null;
    } else if (q.action === 'contract') {
      if (!FB.authorityConsentContract(s,t.contractId,rid)) return false;
      r.decision=null;
    } else if (q.action === 'settle') {
      /* Claim review is resolved before a people transfer. The shared county
         owner transaction remains the only sovereignty mutation. */
      if (!moving.session || moving.session.assets[0].id !== t.countyId) {
        var session = FB.settlement.create({kind:'federate_migration', seats:moving.sponsorship ? [rid] : [moving.patronRealmId, rid],
          assets:[{id:t.countyId, kind:'county', land:true}], claims:[{asset:t.countyId, claimant:rid,
            beneficiary:{kind:'realm', id:rid}, basis:{contribution:1,vow:1,occupation:1,right:1,support:1,office:1}}]});
        while (session.status === 'open') if (!FB.settlement.act(s, session, 'acquiesce')) return false;
        if (!session.awards.some(function (a) { return a.asset === t.countyId && a.claimant === rid; })) return false;
        moving.session = session;
      }
      if (s.owner[t.countyId] !== rid) FB.transferProvince(s, t.countyId, rid);
      s.holder[t.countyId] = rid;
      moving.target = t.countyId;
      var settling = [];
      r.members.forEach(function (a) { add(settling, a.civilians); if (t.final) add(settling, a.reserve); });
      if (t.final && army) add(settling, army.mobileRoster);
      /* Ownership changes do not alter population signatures. */
      if (!FB.populationPoolApply(s, settling, q.transfer)) return false;
      if (t.final) r.members.forEach(function (a) {a.civilians=[];a.reserve=[];});
      else takeCohorts(r.members.map(function (a) {return a.civilians;}),q.transfer.cohorts);
      r.accounting.settled += t.count; r.decision = null;
      FB.marketDeliverStock(s,t.countyId,'provisions',q.foodTransfer);
      r.food=Math.max(0,r.food-q.foodTransfer);
      if (moving.contractId && moving.choice === 'land') {
        var deal = s.authority.contracts.filter(function (c) { return c.id === moving.contractId; })[0];
        if (deal && (deal.fulfilledCountyIds || []).indexOf(t.countyId) < 0) deal.fulfilledCountyIds = (deal.fulfilledCountyIds || []).concat(t.countyId);
      }
      if (t.final) {
        if (army) { army.mobileRoster = []; army.mobileFood=0; army.men = 0; army.units = {}; army.mobileFollowing = false; FB.disbandArmy(s, army); }
        r.status = 'settled'; moving.status = 'settled'; moving.settledTurn = s.turn;
        moving.target = t.countyId;
        var leader = M.leader(s, rid);
        FB.authoritySetGovernment(s, rid, moving.settlementForm, { mobileCommit:true });
        s.realms[rid].nonTerritorial = false; s.realms[rid].capital = t.countyId;
        if (leader) FB.assignRealmRulerCharacter(s, rid, leader.id, {replaceAuthored:true});
        r.agreements.forEach(function (a) { a.status = 'ended'; });
        if (moving.contractId) FB.authorityContractTransition(s, moving.contractId, 'release', rid);
        if (leader && leader.id===s.player.charId && FB.absorbRealm(s,rid,leader)) FB.authoritySetGovernment(s,'player',moving.settlementForm);
      }
    } else if (q.action === 'work') {
      if (!FB.treasurySpend(s, rid, q.cost)) return false;
      if(request.actor.id===s.player.charId) s.player.gold += q.cost;
      else s.chars[request.actor.id].gold=(s.chars[request.actor.id].gold || 0)+q.cost;
      r.food -= 1; r.worked[request.actor.id] = s.turn;
    } else if (q.action === 'trade') {
      var countyOwner = s.owner[t.countyId], payee = q.payer === rid ? countyOwner : rid;
      if (q.payer!==payee && !FB.treasuryTransfer(s, q.payer, payee, q.cost)) return false;
      if (t.direction === 'buy') { FB.marketWithdrawProvisions(s, t.countyId, t.count); r.food += t.count; }
      else { FB.marketDeliverStock(s, t.countyId, 'provisions', t.count); r.food -= t.count; }
    } else if (q.action === 'war') {
      var cause = t.causes[0], war = FB.registerOrdinaryWar(s,rid,{enemy:cause.enemy,target:cause.target,casus:cause,objectives:t.causes,legacy:false});
      if (!war) return false;
      army.warId=war.id; army.mobileCourt=false; FB.orderArmy(s,army,cause.target); r.decision=null;
    } else if (q.action === 'peace') {
      if (!FB.settleOrdinaryWar(s,t.warId,'white_peace')) return false;
      r.decision=null;
    } else if (q.action === 'service') {
      var service = r.agreements.filter(function (a) {return a.id===t.agreementId;})[0];
      var enemy = q.war.attacker===service.partnerId ? q.war.defender : q.war.attacker;
      var war = FB.registerOrdinaryWar(s,rid,{enemy:enemy,defending:true,target:q.war.target,legacy:false,
        casus:{type:'protection',target:q.war.target},objectives:[{type:'aggression',target:q.war.target}]});
      if (!war) return false;
      army.warId=war.id;army.mobileCourt=false;
      FB.orderArmy(s,army,s.realms[service.partnerId].capital);
    }
    r.revision++; G.invalidate();
    if (['select','settle','offer','accept','join','leave'].indexOf(q.action)>=0) FB.news(s,FB.msg('news.mobile.decision',
      '{realm} records a coalition decision at {province}. Its mobile following now numbers {count}.',
      {realm:FB.realmNameParam(s,rid),province:FB.world.byId[moving.at].name,count:M.total(s,rid)}));
    return true;
  };
  S.registerSource('coalition_leadership', { quote:M.quote, apply:M.apply });
  M.review = function (s, request) { return S.reviewSource(s, 'coalition_leadership', request); };
  M.commit = function (s, reviewed) { return S.commitSource(s, reviewed); };

  /* Authored openings resolve after bookmark actors exist. Planning never
     materializes a person, spends a UID or repairs a live technology record. */
  M.openingPlan = function (s, d) {
    var t=d.mobile, p=t && FBDATA.mobileProfiles[t.profileId], o=t && t.opening;
    var plan={allowed:false,bindings:[],units:{},muster:[]}, used=Object.create(null);
    if (!p || !o || !s.realms[d.id] || !s.realms[d.id].alive || !M.active(s,d.id)) return plan;
    var bm=FB.campaignBookmark(s), realms={};
    (bm.realms || []).forEach(function (r) {realms[r.id]=r;});
    if (M.definitionFaults(d,G.forRealm(s,d.id).id,bm.provinces,realms,null,bm).length ||
        !M.independent(t) && (!s.realms[t.patronRealmId] || !s.realms[t.patronRealmId].alive) ||
        !s.owner[t.origin] || !s.owner[t.target] || FB.realmTerritory(s,d.id).length ||
        (s.armies || []).some(function (a) {return a.id==='following_'+d.id;}) ||
        (s.authority.migrations || []).some(function (m) {return m.realmId===d.id && m.status!=='settled' && m.status!=='failed';})) return plan;
    var occupied={};
    Object.keys(s.authority.governments).forEach(function (rid) {
      var row=M.row(s,rid);
      if (row && row.status==='active') row.members.forEach(function (m) {occupied[m.principal.id]=true;});
    });
    for (var binding of o.principals) {
      var ref=binding.person, c=FB.bookmarkActor(s,ref.actorId);
      var memberDef=p.members.filter(function (m) {return m.id===binding.memberId;})[0];
      if (!availablePerson(s,c) || s.date.year-c.born<p.minAge || location(s,{kind:'character',id:c.id})!==t.origin ||
          used[c.id] || occupied[c.id] ||
          ref.kind==='realm_ruler' && (FB.realmRulerGeneration(s,d.id)!==ref.generation ||
            c.name!==s.realms[d.id].ruler.name || c.born!==s.realms[d.id].ruler.born ||
            c.sex!==s.realms[d.id].ruler.sex || c.culture!==s.realms[d.id].ruler.culture || c.religion!==d.religion) ||
          FB.isReigningRealmRuler(s,c) && FB.realmIdForRulerCharacter(s,c)!==d.id) return plan;
      used[c.id]=true;
      plan.bindings.push({memberId:memberDef.id,characterId:c.id,person:copy(ref)});
    }
    var leader=plan.bindings.filter(function (b) {return b.memberId===o.leaderMemberId;})[0];
    var gates=Object.assign({},s,{realmTech:copy(s.realmTech || {}),realmTechMigration:2,realms:Object.assign({},s.realms)});
    gates.realms[d.id]=Object.assign({},s.realms[d.id],{ruler:Object.assign({},s.realms[d.id].ruler,
      {culture:s.chars[leader.characterId].culture})});
    for (var row of o.muster) {
      if (!FB.unitClassUnlocked(gates,row.unitId,d.id)) return plan;
      plan.units[row.unitId]=(plan.units[row.unitId] || 0)+row.count;
      plan.muster.push(copy(row));
    }
    plan.allowed=true;
    return plan;
  };
  M.initialize = function (s, defs) {
    var plans={}, people={}, hosted = M.hostedAccessPlan(s,defs);
    if (!hosted.allowed) throw new Error(FB.T('Invalid hosted opening access.'));
    defs.forEach(function (d) {
      if (!d.mobile || M.row(s,d.id)) return;
      if (d.mobile.opening===undefined) {
        if (d.mobile.command) throw new Error(FB.T('Invalid authored mobile command.'));
        return;
      }
      var plan=M.openingPlan(s,d);
      if (!plan.allowed || plan.bindings.some(function (b) {return people[b.characterId];}))
        throw new Error('Invalid authored mobile opening');
      plan.bindings.forEach(function (b) {people[b.characterId]=true;});
      plans[d.id]=plan;
    });
    defs.forEach(function (d) {
      if (!d.mobile || M.row(s, d.id)) return;
      var p = FBDATA.mobileProfiles[d.mobile.profileId], g = s.authority.governments[d.id] ||
        (s.authority.governments[d.id]={formId:G.forRealm(s,d.id).id,sinceTurn:s.turn});
      if (!p || !M.active(s, d.id)) throw new Error('Invalid mobile opening');
      var plan=plans[d.id];
      var r = g.mobile = {schema:plan ? 2 : 1,profileId:d.mobile.profileId,migrationId:null,status:'active',serial:0,revision:0,
        leaderId:null,selection:null,decision:null,food:d.mobile.food,lastDay:s.turn,worked:{},agreements:[],
        accounting:{initial:0,arrivals:0,dead:0,settled:0,dispersed:0},members:[]};
      if (plan) r.openingBindings=copy(plan.bindings);
      p.members.forEach(function (a) {
        var bound=plan && plan.bindings.filter(function (b) {return b.memberId===a.id;})[0];
        var c = bound ? s.chars[bound.characterId] : FB.makeCharacter(s, {sex:'m',culture:d.culture,religion:d.religion,born:s.date.year - 30,
          quality:1,station:1,traitsN:1});
        if (!bound) c.homeProvinceId = d.mobile.origin;
        r.members.push({id:a.id,principal:{kind:'character',id:c.id},scope:{kind:'realm',id:d.id},basis:'following',
          continuity:'member',weight:a.weight,pledge:a.pledge,allegiance:true,
          civilians:[{culture:d.culture,religion:d.religion,count:a.population}],reserve:[]});
        r.accounting.initial += a.population;
      });
      var leader=plan ? r.members.filter(function (m) {return m.id===d.mobile.opening.leaderMemberId;})[0] : r.members[0];
      var incumbent=plan && plan.bindings.filter(function (b) {return b.memberId===leader.id && b.person.kind==='realm_ruler';})[0];
      if (incumbent) {r.leaderId=incumbent.characterId;G.invalidate();FB.invalidateRealmCache();}
      else install(s, d.id, leader.principal.id);
      if (d.mobile.command) M.initializeCommand(s,d);
      var units=plan ? copy(plan.units) : {};if (!plan) units[FB.unitRoleClass('levy_infantry')]=d.mobile.fighters;
      var migrationSpec = {realmId:d.id,patronRealmId:d.mobile.patronRealmId,
        origin:d.mobile.origin,target:d.mobile.target,hostId:'following_' + d.id,
        settlementForm:p.settlementForm,endTurn:s.turn + 10000000,men:d.mobile.fighters,units:units};
      if (d.mobile.sponsorship!==undefined) migrationSpec.sponsorship=copy(d.mobile.sponsorship);
      var migration = FB.federateBeginMigration(s, migrationSpec);
      if (!migration) throw new Error('Invalid mobile migration');
      r.migrationId = migration.id;
      var army = M.host(s, d.id); army.mobileFollowing = true; army.mobileCourt = false; army.mobileRoster = [];
      var capacity=hostCapacity(army,p);
      army.mobileFood=Math.min(r.food,hostLoadTarget(s,army,p));r.food-=army.mobileFood;
      army.supply=capacity ? army.mobileFood/capacity*100 : 0;
      var muster=plan ? plan.muster : [{memberId:r.members[0].id,count:d.mobile.fighters}];
      muster.forEach(function (part) {
        var m=member(s,d.id,part.memberId), cohorts=take(m.civilians,part.count);
        cohorts.forEach(function (c) {
          var prior=army.mobileRoster.filter(function (v) {return v.memberId===m.id && v.culture===c.culture && v.religion===c.religion;})[0];
          if (prior) prior.count+=c.count;
          else army.mobileRoster.push(Object.assign({memberId:m.id},c));
        });
      });
      M.migration(s, d.id).courtIds = r.members.map(function (a) { return a.principal.id; });
      FB.treasuryCredit(s, d.id, d.mobile.treasury);
      var grant = hosted.grants[d.id];
      if (grant) {
        grant.generations[0] = FB.realmRulerGeneration(s,d.id);
        r.agreements.push(grant);
        r.openingAccess = {schema:1, id:grant.id, startTurn:0, generations:grant.generations.slice()};
      }
    });
  };
  FB.mobileInitialize = function (s,defs) {
    M.initialize(s,defs.filter(function (d) {return !d.mobile || d.mobile.opening===undefined;}));
  };
  FB.mobileInitializeAuthored = function (s,defs) {
    M.initialize(s,defs.filter(function (d) {return d.mobile && d.mobile.opening!==undefined;}));
  };
  function enact(s, rid, action, terms, actor) {
    var review = M.review(s, {realmId:rid,action:action,terms:terms || {},actor:actor || {kind:'realm',id:rid}});
    return review && review.review.allowed && M.commit(s, review);
  }
  function approvalAI(s, rid, operation, terms) {
    if (M.row(s,rid).command) return decision(s,rid,operation,terms);
    if (!enact(s, rid, 'propose', {operation:operation,proposal:terms})) return false;
    M.members(s, rid).forEach(function (m) {
      if (m.allegiance && m.principal.id !== s.player.charId) enact(s, rid, 'assent', {assent:true}, m.principal);
    });
    return decision(s, rid, operation, terms);
  }
  M.ai = function (s, rid) {
    var r = M.row(s, rid), p = M.profile(s, rid), moving = M.migration(s, rid);
    if (!r || !moving || !M.active(s, rid) || M.leader(s, rid) && M.leader(s, rid).id === s.player.charId) return false;
    if (r.command && !M.leader(s,rid)) return false;
    var period=Math.floor(s.turn/90);
    if(r.lastAI===period && !r.selection && M.leader(s,rid)) return false;
    r.lastAI=period;
    if (!M.leader(s, rid)) {
      if (!r.selection) { r.selection = {votes:{}}; r.revision++; }
      if(!M.members(s,rid).length) {
        var resident=Object.keys(s.chars).sort().map(function (cid) {return s.chars[cid];}).filter(function (c) {
          return availablePerson(s,c) && c.id!==s.player.charId && c.homeProvinceId===moving.at &&
            s.date.year-c.born>=p.minAge && FB.skillSnapshot(s,c,'dip')>=3 && !FB.isReigningRealmRuler(s,c);
        })[0];
        if(resident && r.members.length) enact(s,rid,'replace_member',{memberId:r.members[0].id,candidateId:resident.id},{kind:'character',id:resident.id});
      }
      var candidates = M.members(s, rid).filter(function (m) { return eligible(s, rid, m.principal.id); }).sort(function (a,b) {
        return FB.skillSnapshot(s,s.chars[b.principal.id],'dip')-FB.skillSnapshot(s,s.chars[a.principal.id],'dip') || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
      });
      if (candidates.length) {
        var cid = candidates[0].principal.id;
        M.members(s, rid).forEach(function (m) { if (m.principal.id !== s.player.charId) enact(s, rid, 'support', {candidateId:cid}, m.principal); });
        enact(s, rid, 'select', {candidateId:cid});
      }
      return true;
    }
    r.agreements.filter(function (a) { return a.status === 'offered'; }).forEach(function (a) {
      var partner = FB.realmRulerCharacterSnapshot(s, a.partnerId), form = G.forRealm(s, a.partnerId);
      if (partner && partner.id !== s.player.charId && form && form.use.ai.canNegotiate(s, a.partnerId, {}))
        enact(s, rid, 'accept', {agreementId:a.id}, {kind:'realm',id:a.partnerId});
    });
    r.agreements.filter(function (a) {return a.kind==='protection' && a.status==='active' && a.endTurn>s.turn;}).forEach(function (a) {
      var war = FB.realmWars(s,a.partnerId)[0];
      if(war) enact(s,rid,'service',{agreementId:a.id,warId:war.id});
    });
    var at = moving.at;
    r.agreements = r.agreements.filter(function (a) { return a.endTurn > s.turn; });
    if (!safe(s, rid, at) && accessControl(s, s.holder[at], at) &&
        !r.agreements.some(function (a) { return a.kind === 'access' && a.countyIds.indexOf(at) >= 0; })) {
      var terms = {kind:'access',partnerId:s.holder[at],countyIds:[at],capacity:Math.min(M.total(s,rid),capacity(s,at)),
        allowRecruit:true,price:p.accessPrice,duration:p.accessDays};
      if (approvalAI(s, rid, 'agreement', terms)) enact(s, rid, 'offer', terms);
      var offered=r.agreements.filter(function (a) {return a.status==='offered' && a.partnerId===terms.partnerId;})[0];
      var ruler=offered && FB.realmRulerCharacterSnapshot(s,offered.partnerId), government=offered && G.forRealm(s,offered.partnerId);
      if(ruler && ruler.id!==s.player.charId && government && government.use.ai.canNegotiate(s,offered.partnerId,{}))
        enact(s,rid,'accept',{agreementId:offered.id},{kind:'realm',id:offered.partnerId});
    }
    if (!p.supplyPolicy && r.food < M.total(s, rid) * p.foodPerPerson * 90)
      enact(s, rid, 'trade', {countyId:at,count:100,direction:'buy'});
    else if(!p.supplyPolicy && r.food>M.total(s,rid)*p.foodPerPerson*180)
      enact(s,rid,'trade',{countyId:at,count:100,direction:'sell'});
    if (!p.supplyPolicy && !M.host(s, rid) && !committed(s, rid)) enact(s, rid, 'recruit', {count:60,unitId:FB.unitRoleClass('levy_infantry')});
    var own = FB.realmHeldCounties(s, rid), supply=p.supplyPolicy && M.supplySnapshot(s,rid);
    var shortage=r.food<(supply ? Math.max(0,supply.campTarget-supply.campDaily) : M.total(s,rid)*p.foodPerPerson*30);
    if (own.indexOf(at) >= 0 && !committed(s, rid)) {
      var settlement = {countyId:at,count:M.total(s,rid),final:true};
      if (approvalAI(s,rid,'settle',settlement)) enact(s,rid,'settle',settlement);
    } else if (M.host(s, rid) && shortage) {
      var destination = r.agreements.filter(function (a) { return a.kind === 'access' && a.status === 'active' && a.endTurn > s.turn; })
        .reduce(function (all,a) { return all.concat(a.countyIds); }, []).filter(function (pid) { return pid !== at; }).sort()[0];
      if (destination) enact(s,rid,'move',{countyId:destination});
    }
    return true;
  };
  M.losses = function (s, army, count) {
    if (!s || !army.mobileFollowing || !M.row(s, army.realm) || !count) return;
    var left = count;
    for (var c of army.mobileRoster || []) { var n = Math.min(left,c.count); c.count -= n; left -= n; }
    army.mobileRoster = (army.mobileRoster || []).filter(function (c) { return c.count > 0; });
    army.mobileFood=(army.mobileFood || 0)*army.men/Math.max(1,army.men+count);
    M.row(s, army.realm).accounting.dead += count; M.row(s, army.realm).revision++;
  };
  FB.mobileHostLosses = M.losses;
  FB.mobileHostDisband = function (s, army) {
    if (army.mobileFollowing && M.row(s, army.realm)) {
      if (!M.row(s,army.realm).columns && army.men < (FBDATA.balance.armyMinMen || 40)) FB.mobileMigrationInterrupted(s,M.migration(s,army.realm),'host_lost');
      returnHost(s,army); M.row(s,army.realm).revision++;
    }
  };
  FB.mobileMigrationInterrupted = function (s, row, reason) {
    var r = M.row(s,row.realmId);
    if (!r || !M.active(s,row.realmId) || r.status !== 'active') return false;
    if (row.contractId) FB.authorityContractTransition(s,row.contractId,'breach',row.realmId);
    var key = row.id;
    if (r.defeatKey !== key) {
      var loss = Math.floor(civilians(r) * M.profile(s,row.realmId).defeatShare), left = loss;
      r.members.forEach(function (m) { var n = Math.min(left,sum(m.civilians)); take(m.civilians,n); left -= n; });
      r.accounting.dead += loss; r.defeatKey = key; r.revision++;
    }
    row.choice = null; row.status = 'encamped'; row.warId = null; row.contractId = null;
    return true;
  };
  M.day = function (s) {
    Object.keys(s.authority && s.authority.governments || {}).forEach(function (rid) {
      var r = M.row(s,rid), p = M.profile(s,rid);
      if (!r || !p || r.status !== 'active' || !M.active(s,rid) || r.lastDay === s.turn) return;
      r.lastDay = s.turn; r.worked = {};
      r.agreements.forEach(function (a) {
        if (r.openingAccess && r.openingAccess.id === a.id && a.status === 'active' && !hostedAccessCurrent(s,rid,a)) {
          a.status = 'ended'; r.revision++;
        }
      });
      r.agreements=r.agreements.filter(function (a) {return a.endTurn>s.turn;});
      if (!r.command && !M.leader(s,rid) && !r.selection) { r.leaderId = null; r.selection = {votes:{}}; r.decision = null; r.revision++; }
      var m = M.migration(s,rid), period = Math.floor(s.turn / 90), a = m && activeAccess(s,rid,m.at);
      if (a && a.harvestPeriod !== period) {
        if (!s.mobilePastures || s.mobilePastures.period!==period) s.mobilePastures={schema:1,period:period,used:{}};
        a.harvestPeriod = period;
        var used=s.mobilePastures.used[m.at] || 0;
        var production=Math.max(0,Math.min(a.capacity,capacity(s,m.at)-allocated(s,m.at,a.id),capacity(s,m.at)-used));
        s.mobilePastures.used[m.at]=used+production;
        r.food += production * p.pasturePerPerson;
      }
      var leader=M.leader(s,rid);
      if (p.supplyPolicy && leader && leader.id!==s.player.charId) {
        M.commit(s,M.supplyReview(s,rid,'trade'));
        M.commit(s,M.supplyReview(s,rid,'recruit'));
      }
      var need = (civilians(r) + reserve(r)) * p.foodPerPerson;
      if (r.food < need) {
        var left = Math.min(civilians(r)+reserve(r), Math.ceil((need - r.food) / p.foodPerPerson * p.starvationShare)), lost = left;
        r.members.forEach(function (member) {
          var n = Math.min(left,sum(member.civilians)); take(member.civilians,n); left -= n;
          n=Math.min(left,sum(member.reserve));take(member.reserve,n);left-=n;
        });
        r.accounting.dead += lost;
      }
      r.food = Math.max(0,r.food - need);
      var army = M.host(s,rid);
      if (army && (r.command && !M.commandPermits(s,rid,army.mobileCourt ? 'move' : 'march') ||
          (army.path || []).some(function (pid) { return !M.passage(s,rid,pid,army.mobileCourt); }))) {
        army.path = []; army.goal = null; army.moveLeft = 0;
      }
      if (r.lastAI !== period || r.selection) M.ai(s,rid);
    });
  };
  FB.mobileDay = M.day;
  M.annual = function (s,rid) {
    M.members(s,rid).forEach(function (m) {
      var c = s.chars[m.principal.id];
      if (c.id !== s.player.charId && s.date.year - c.born > 55 && FB.chance(0.07)) FB.killChar(s,c);
    });
    var leader=M.leader(s,rid);
    if(leader) s.realms[rid].ruler.age=s.date.year-leader.born;
    M.ai(s,rid);
  };
  var provision = FB.provisionArmy;
  FB.provisionArmy = function (s,army) {
    var r = army.mobileFollowing && M.row(s,army.realm), p = r && M.profile(s,army.realm);
    if (!p) return provision(s,army);
    if(army.mobileProvisionTurn===s.turn) return 0;
    army.mobileProvisionTurn=s.turn;
    var capacity=hostLoadTarget(s,army,p), court=M.migration(s,army.realm);
    if(court && court.at===army.at) {
      var refill=Math.min(r.food,Math.max(0,capacity-(army.mobileFood || 0)));
      r.food-=refill;army.mobileFood=(army.mobileFood || 0)+refill;
    }
    var use=hostRation(s,army,p);
    var paid=Math.min(army.mobileFood || 0,use);
    army.mobileFood=Math.max(0,(army.mobileFood || 0)-paid);
    var carrying=hostCapacity(army,p);
    army.supply=carrying ? FB.clamp(army.mobileFood/carrying*100,0,100) : 0;
    return paid;
  };
  var order = FB.orderArmy;
  FB.orderArmy = function (s,army,pid) {
    if (army && army.mobileFollowing) {
      if (M.row(s,army.realm).command && !M.commandPermits(s,army.realm,army.mobileCourt ? 'move' : 'march')) return false;
      var plan = FB.armyOrderPlan(s,army,pid);
      if (!plan || !plan.ok || !plan.path || plan.path.some(function (p) { return !M.passage(s,army.realm,p,army.mobileCourt); })) return false;
    }
    return order(s,army,pid);
  };
  var friendly = FB.armyFriendlyProvince;
  FB.armyFriendlyProvince = function (s,army,pid,relations) {
    if (army && army.mobileFollowing && M.row(s,army.realm).agreements.some(function (a) {
      return a.kind==='protection' && a.status==='active' && a.endTurn>s.turn && a.partnerId===s.owner[pid] &&
        !FB.armiesHostile(s,army,{realm:a.partnerId});
    })) return true;
    return friendly(s,army,pid,relations);
  };
  var registerWar = FB.registerOrdinaryWar;
  FB.registerOrdinaryWar = function (s,rid,war) {
    var attacker = war && war.defending ? war.enemy : rid;
    if (M.active(s,attacker)) {
      if (M.row(s,attacker) && M.row(s,attacker).columns) return null;
      var causes = war.objectives || [war.casus];
      if (!decision(s,attacker,'war',{causes:causes})) return null;
    }
    return registerWar(s,rid,war);
  };
  var consentContract=FB.authorityConsentContract, requestMigration=FB.federateRequest, resolveMigration=FB.federateResolveSettlement;
  FB.authorityConsentContract = function (s,id,rid) {
    if (M.active(s,rid) && (M.row(s,rid).columns || !decision(s,rid,'contract',M.contractTerms(s,id)))) return false;
    return consentContract(s,id,rid);
  };
  FB.federateRequest = function (s,id,choice,templateId,recognitionId) {
    var moving=Q.movingPolity(s,id);
    if (moving && M.active(s,moving.realmId) && (M.row(s,moving.realmId).columns || choice!=='land' || !decision(s,moving.realmId,'land',{countyId:moving.target}))) return false;
    return requestMigration(s,id,choice,templateId,recognitionId);
  };
  FB.federateResolveSettlement = function (s,id,reviewed) {
    var moving=Q.movingPolity(s,id);
    return moving && M.active(s,moving.realmId) ? false : resolveMigration(s,id,reviewed);
  };
  var controls = FB.playerControlsHost, splitStatus = FB.splitHostStatus, split = FB.splitHost, merge = FB.mergeableHost;
  FB.playerControlsHost = function (s,army) {
    return army && army.mobileFollowing ? !!(M.leader(s,army.realm) && M.leader(s,army.realm).id === s.player.charId) : controls(s,army);
  };
  FB.splitHostStatus = function (s,army) {
    return army && army.mobileFollowing ? {ok:false,reason:FB.T('This host carries one conserved coalition roster. Return its fighters before reorganizing the following.')} : splitStatus(s,army);
  };
  FB.splitHost = function (s,army) {return army && army.mobileFollowing ? null : split(s,army);};
  FB.mergeableHost = function (s,army) {return army && army.mobileFollowing ? null : merge(s,army);};
  var markDead = FB.markRealmDead;
  FB.markRealmDead = function (s,rid,opts) {
    var r = M.row(s,rid), moving = r && M.migration(s,rid);
    if (r && r.status === 'active') {
      r.accounting.dispersed += M.total(s,rid);
      r.members.forEach(function (m) {m.civilians=[];m.reserve=[];});
      (s.armies || []).filter(function (a) {return a.realm === rid && a.mobileFollowing;}).forEach(function (a) {
        a.mobileRoster=[];a.men=0;a.units={};a.mobileFollowing=false;FB.disbandArmy(s,a);
      });
      r.status='dispersed';r.selection=null;r.decision=null;
      if(moving) {moving.status='failed';moving.failureReason='court_dispersed';}
    }
    return markDead(s,rid,opts);
  };
  var snapshot = FB.realmRulerCharacterSnapshot, rulerRealm = FB.realmIdForRulerCharacter, advance = FB.advanceRealmSuccession, died = FB.royalCharDied;
  FB.realmRulerCharacterSnapshot = function (s,rid) { return M.active(s,rid) ? M.leader(s,rid) : snapshot(s,rid); };
  FB.realmIdForRulerCharacter = function (s,value) {
    var cid = typeof value === 'string' ? value : value && value.id;
    // Only a realm with a coalition record can have a leader; skip the form lookup for the rest.
    var root = s.authority && s.authority.governments || {};
    var rid = Object.keys(root).filter(function (id) { return !!(root[id] && root[id].mobile) && M.active(s,id) && M.leader(s,id) && M.leader(s,id).id === cid; })[0];
    return rid || rulerRealm(s,value);
  };
  FB.advanceRealmSuccession = function (s,rid,opts) {
    if (!M.active(s,rid)) return advance(s,rid,opts);
    var r = M.row(s,rid);
    if (!r) return null;
    r.leaderId = null; r.selection = r.command ? null : {votes:{}}; r.decision = null; r.revision++;
    if (r.command) r.command.status='vacant';
    return null;
  };
  FB.royalCharDied = function (s,c,rid) {
    rid = rid || Object.keys(s.authority && s.authority.governments || {}).filter(function (id) { return M.active(s,id) && M.row(s,id) && M.row(s,id).leaderId === c.id; })[0];
    if (rid && M.active(s,rid)) { FB.advanceRealmSuccession(s,rid,{cause:'death'}); return; }
    return died(s,c,rid);
  };
  var setGovernment = FB.authoritySetGovernment;
  FB.authoritySetGovernment = function (s,rid,id,opts) {
    if (M.row(s,rid) && M.row(s,rid).status === 'active' && !(opts && opts.mobileCommit)) return false;
    if (FBDATA.governmentForms[id] && !G.problems(id).length && G.resolve(id).use.territory.mobileFollowing && !M.row(s,rid) && !(opts && opts.mobileOpening)) return false;
    return setGovernment(s,rid,id,opts);
  };
  function compose(slot,id,patch) { return Object.assign({},G.strategy(slot,id),patch); }
  G.register('holders','coalition_holders',compose('holders','direct',{vacancy:function (s,rid) { return rid; }}));
  G.register('succession','coalition_leadership',{mobileLeadership:true,eligible:function () {return false;},order:function () {return [];},
    candidates:function (s,rid) {return M.members(s,rid).filter(function (m) {return eligible(s,rid,m.principal.id);}).map(function (m) {return m.principal.id;});},
    vacancy:function () {return {allowed:false};},accession:function (s,rid) {return M.leader(s,rid);},refresh:function () {return false;}});
  G.register('territory','coalition_court',compose('territory','non_territorial',{
    mobileFollowing:true,profile:function () {return {movingCourt:true,holdsCounties:true,allowsMixed:true};},defeat:function () {return {dissolve:false};},
    settlement:function () {return null;}
  }));
  G.register('consent','coalition_consent',{
    local:function () {return false;},decision:function (s,rid,c) {
      var leader = actorRealm(s,c.actor) === rid && !!M.leader(s,rid), members = M.members(s,rid);
      var allowed = leader && (['war','treaty','grant'].indexOf(c.operation) < 0 || decision(s,rid,c.operation,c.scope || {}));
      return {allowed:allowed,reason:allowed ? null : 'withheld',required:members.map(function (m) {return m.id;}),approvals:{}};
    },constituency:function (s,rid) {return {kind:'coalition_members',realmId:rid,members:M.members(s,rid).map(function (m) {return m.id;})};}
  });
  G.register('levy','following_levy',compose('levy','feudal_levy',{
    countyBase:function () {return 0;},settlementBase:function () {return 0;},fieldHost:function () {return 0;},
    mayCall:function () {return false;},service:function () {return 0;},subjectRate:function () {return 0;},subjectContribution:function () {return 0;},
    rebelSize:function () {return 0;}
  }));
  G.register('revenue','coalition_receipts',compose('revenue','demesne_revenue',{
    subjectContribution:function () {return 0;},remittance:function () {return 0;},loanAssignment:function () {return 0;},fiscalAssignment:function () {return 0;}
  }));
  G.register('council','member_council',{seats:function () {return [];},eligible:function () {return false;},vacancy:function () {return null;}});
  G.register('diplomacy','coalition_diplomacy',compose('diplomacy','territorial_diplomacy',{
    subjectRelation:function () {return {kind:'coalition',liegeId:null};}
  }));
  G.register('ai','coalition_decisions',compose('ai','realm_decisions',{
    goals:function () {return {warChance:0,allianceChance:0};},campaign:function () {return false;},raid:function () {return false;},
    canNegotiate:function () {return true;},consentContract:function (s,rid,c) {
      var leader=M.leader(s,rid), terms=M.contractTerms(s,c.contract.id);
      if (!leader || leader.id===s.player.charId || !terms) return false;
      return approvalAI(s,rid,'contract',terms) && enact(s,rid,'contract',terms);
    },proposeMigration:function (s,rid) {return M.ai(s,rid);},offices:function () {return false;}
  }));
  M.localRealm = function (s) {
    return Object.keys(s.authority && s.authority.governments || {}).filter(function (rid) {
      var m = M.active(s,rid) && M.migration(s,rid);
      return m && (m.at === s.player.provinceId || M.members(s,rid).some(function (a) {return a.principal.id === s.player.charId;}));
    })[0] || null;
  };
  M.referencesCharacter = function (s,cid) {
    return Object.keys(s.authority && s.authority.governments || {}).some(function (rid) {
      var r = M.row(s,rid);
      var moving=r && M.migration(s,rid);
      return r && (r.members.some(function (m) {return m.principal.id === cid;}) || moving && moving.courtIds.indexOf(cid)>=0);
    });
  };
  function plain(v) {return !!v && typeof v === 'object' && !Array.isArray(v);}
  function keys(v,allowed) {return plain(v) && Object.keys(v).every(function (k) {return allowed.indexOf(k) >= 0;});}
  function boundedNumber(n,max) {return Number.isFinite(n) && n >= 0 && n <= max;}
  M.validateProfiles = function (profiles,units) {
    var errors = []; profiles = profiles || FBDATA.mobileProfiles || {};units=units || FBDATA.unitClasses;
    Object.keys(profiles).forEach(function (id) {
      var p = profiles[id], seen = [];
      if (!keys(p,['minAge','threshold','maxMembers','maxAgreements','recruitShare','recruitCost','foodPerPerson','pasturePerPerson',
          'accessDays','accessPrice','starvationShare','defeatShare','settlementForm','regions','members','supplyPolicy']) ||
          !whole(p.minAge) || p.minAge < 16 || p.minAge > 80 || !Number.isFinite(p.threshold) || p.threshold <= 0.5 || p.threshold > 1 ||
          !whole(p.maxMembers) || !p.maxMembers || p.maxMembers > 24 || !whole(p.maxAgreements) || !p.maxAgreements || p.maxAgreements > 12 ||
          !boundedNumber(p.recruitShare,0.5) || !boundedNumber(p.recruitCost,100) || !boundedNumber(p.foodPerPerson,1) || !p.foodPerPerson ||
          !boundedNumber(p.pasturePerPerson,100) || !whole(p.accessDays) || !p.accessDays || p.accessDays > 1440 || !whole(p.accessPrice) ||
          !boundedNumber(p.starvationShare,1) || !boundedNumber(p.defeatShare,1) || !FBDATA.governmentForms[p.settlementForm] ||
          G.problems(p.settlementForm).length || G.resolve(p.settlementForm).use.territory.profile(null,null,{}).movingCourt ||
          !Array.isArray(p.regions) || p.regions.length > 64 || p.regions.some(function (pid,i) {return typeof pid !== 'string' || p.regions.indexOf(pid) !== i;}) ||
          !Array.isArray(p.members) || !p.members.length || p.members.length > p.maxMembers || p.members.some(function (m) {
            if (!keys(m,['id','weight','pledge','population']) || typeof m.id !== 'string' || !m.id || seen.indexOf(m.id) >= 0 ||
                !whole(m.weight) || !m.weight || m.weight > 100 || !boundedNumber(m.pledge,p.recruitShare) || !whole(m.population) || !m.population || m.population > 10000000) return true;
            seen.push(m.id); return false;
          }) || p.supplyPolicy!==undefined && !supplyPolicyValid(p.supplyPolicy,units)) errors.push(FB.T('Invalid mobile profile {id}.',{id:id}));
    });
    return errors;
  };
  function supplyPolicyValid(p,units) {
    if (!keys(p,['schema','targetDays','carryDays','cashReserve','replacement']) || p.schema!==1 ||
        !whole(p.targetDays) || p.targetDays<1 || p.targetDays>30 || !whole(p.carryDays) || p.carryDays<1 || p.carryDays>30 ||
        !boundedNumber(p.cashReserve,1000000000000)) return false;
    var r=p.replacement;
    return r===undefined || keys(r,['targetMen','maxPerReview','unitIds']) && whole(r.targetMen) && r.targetMen<=100000000 &&
      whole(r.maxPerReview) && r.maxPerReview>0 && r.maxPerReview<=10000 && Array.isArray(r.unitIds) &&
      r.unitIds.length>0 && r.unitIds.length<=8 && r.unitIds.every(function (id,i) {
        return typeof id==='string' && !!units[id] && !units[id].hired && r.unitIds.indexOf(id)===i;
      });
  }
  M.definitionFaults = function (d,formId,provinces,realms,profiles,bookmark) {
    profiles = profiles || FBDATA.mobileProfiles;
    var mobile = G.resolve(formId).use.territory.mobileFollowing;
    if (!mobile) return d.mobile === undefined ? [] : [FB.T('A mobile opening requires a mobile territory strategy.')];
    var t = d.mobile, p = t && profiles[t.profileId], byId = {};
    provinces.forEach(function (pr) {byId[pr.id]=pr;});
    if (!keys(t,['profileId','patronRealmId','origin','target','food','fighters','treasury','opening','command','sponsorship','hostedAccess','columns','funding']) || !p ||
        (t.sponsorship!==undefined ? !M.independent(t) || !t.command || !t.opening :
          !Object.prototype.hasOwnProperty.call(realms,t.patronRealmId) || t.patronRealmId === d.id) || !d.nonTerritorial ||
        !byId[t.origin] || byId[t.origin].wasteland || !byId[t.target] || byId[t.target].wasteland ||
        !FBDATA.cultures[d.culture] || !FBDATA.religions[d.religion] || !boundedNumber(t.food,1000000000) ||
        !boundedNumber(t.treasury,1000000) || !whole(t.fighters) || !t.fighters ||
        t.opening===undefined && (t.fighters > p.members[0].population ||
        t.fighters > Math.floor(p.members[0].population*p.members[0].pledge))) return [FB.T('Invalid mobile following declaration.')];
    if (t.opening!==undefined) {
      var o=t.opening, members=Object.create(null), people=Object.create(null), actors=Object.create(null),
        recruited=Object.create(null), total=0, pairs=Object.create(null), invalid=false;
      p.members.forEach(function (m) {members[m.id]=m;});
      if (!keys(o,['principals','leaderMemberId','muster']) || !members[o.leaderMemberId] ||
          !Array.isArray(o.principals) || !o.principals.length || o.principals.length>p.members.length ||
          !Array.isArray(o.muster) || !o.muster.length || o.muster.length>64 || !bookmark)
        return [FB.T('Invalid authored mobile opening.')];
      o.principals.forEach(function (b) {
        if (!keys(b,['memberId','person']) || !members[b.memberId] || people[b.memberId]) {invalid=true;return;}
        people[b.memberId]=true;
        var ref=b.person, actorDef, identity;
        if (!plain(ref)) {invalid=true;return;}
        if (typeof ref.actorId!=='string' || actors[ref.actorId]) {invalid=true;return;}
        actors[ref.actorId]=true;
        actorDef=bookmark.opening && bookmark.opening.actors && bookmark.opening.actors[ref.actorId];
        if (!actorDef || actorDef.ref) {invalid=true;return;}
        identity=actorDef;
        if (ref.kind==='opening_actor') {
          if (!keys(ref,['kind','actorId'])) {invalid=true;return;}
        } else if (ref.kind==='realm_ruler') {
          var ruler=d.ruler;
          if (!keys(ref,['kind','actorId','realmId','generation']) || ref.realmId!==d.id || !ruler ||
              ref.generation!==(ruler.generation!==undefined ? ruler.generation : 1) ||
              !actorDef.name || actorDef.name!==ruler.name || actorDef.born!==ruler.born || actorDef.sex!==ruler.sex ||
              actorDef.culture!==(ruler.culture || d.culture) || actorDef.religion!==d.religion) {invalid=true;return;}
        } else {invalid=true;return;}
        if (!identity || !Number.isInteger(identity.born) || bookmark.date.year-identity.born<p.minAge ||
            actorDef && !actorDef.ref && actorDef.home!==t.origin) invalid=true;
      });
      (bookmark.realms || []).forEach(function (other) {
        var otherOpening=other.mobile && other.mobile.opening;
        if (other.id!==d.id && otherOpening && Array.isArray(otherOpening.principals) &&
            otherOpening.principals.some(function (b) {return b && b.person && actors[b.person.actorId];})) invalid=true;
      });
      if (!people[o.leaderMemberId]) invalid=true;
      o.muster.forEach(function (row) {
        if (!keys(row,['memberId','unitId','count']) || !members[row.memberId] ||
            !Object.prototype.hasOwnProperty.call(FBDATA.unitClasses,row.unitId) || FBDATA.unitClasses[row.unitId].hired ||
            !whole(row.count) || !row.count) {invalid=true;return;}
        var pair=row.memberId+'|'+row.unitId;
        if (pairs[pair]) invalid=true;pairs[pair]=true;
        recruited[row.memberId]=(recruited[row.memberId] || 0)+row.count;total+=row.count;
      });
      Object.keys(recruited).forEach(function (id) {
        if (recruited[id]>Math.floor(members[id].population*members[id].pledge)) invalid=true;
      });
      if (invalid || total!==t.fighters) return [FB.T('Invalid authored mobile opening.')];
    }
    if (t.funding !== undefined && (!t.command || !FB.homeAuthority || !FB.homeAuthority.fundingPolicyValid(t.funding)))
      return [FB.T('Invalid command funding policy.')];
    if (t.hostedAccess !== undefined) {
      var a = t.hostedAccess;
      var actorDef = a && bookmark && bookmark.opening && bookmark.opening.actors &&
        Object.prototype.hasOwnProperty.call(bookmark.opening.actors,a.partnerActorId) && bookmark.opening.actors[a.partnerActorId];
      if (!t.opening || !t.command || !keys(a,['id','partnerRealmId','partnerActorId','countyIds','capacity','allowRecruit','duration']) ||
          typeof a.id !== 'string' || !/^[a-z][a-z0-9_]{0,47}$/.test(a.id) || hostedAccessId(d).length > 160 ||
          !Object.prototype.hasOwnProperty.call(realms,a.partnerRealmId) || a.partnerRealmId === d.id || realms[a.partnerRealmId].mobile ||
          !actorDef || !actorDef.ref || actorDef.ref.kind !== 'realm_ruler' || actorDef.ref.realmId !== a.partnerRealmId ||
          !Array.isArray(a.countyIds) || !a.countyIds.length || a.countyIds.length > 16 || a.countyIds.indexOf(t.origin) < 0 ||
          a.countyIds.some(function (pid,i) { return !Object.prototype.hasOwnProperty.call(byId,pid) || byId[pid].wasteland || a.countyIds.indexOf(pid) !== i; }) ||
          !whole(a.capacity) || a.capacity < p.members.reduce(function (n,m) {return n+m.population;},0) || a.capacity > 100000000 ||
          typeof a.allowRecruit !== 'boolean' || !whole(a.duration) || !a.duration || a.duration > 1440)
        return [FB.T('Invalid hosted opening access.')];
    }
    return [];
  };
  var validateGovernments = G.validate;
  G.validate = function () {return validateGovernments().concat(M.validateProfiles());};
  M.validate = function (s) {
    var allIds = {}, root = s.authority && s.authority.governments || {};
    function fault(rid,field) {throw new Error(FB.T('Invalid mobile coalition at {path}.',{path:'authority.governments.'+rid+'.mobile'+(field ? '.'+field : '')}));}
    if (s.mobilePastures!==undefined && (!keys(s.mobilePastures,['schema','period','used']) || s.mobilePastures.schema!==1 ||
        !whole(s.mobilePastures.period) || s.mobilePastures.period>Math.floor(s.turn/90) || !plain(s.mobilePastures.used) ||
        Object.keys(s.mobilePastures.used).length>512 || Object.keys(s.mobilePastures.used).some(function (pid) {return !s.owner[pid] || !whole(s.mobilePastures.used[pid]);}))) fault('pastures','production');
    function pool(rid,list,roster) {
      var seen = {};
      if (!Array.isArray(list) || list.length > 64) fault(rid,'people');
      list.forEach(function (c) {
        if (!keys(c,roster ? ['memberId','culture','religion','count'] : ['culture','religion','count']) || !whole(c.count) || !c.count || c.count > 100000000 ||
            !FBDATA.cultures[c.culture] || !(FBDATA.religions[c.religion] || s.faiths && s.faiths[c.religion])) fault(rid,'people');
        var key = (roster ? c.memberId : '')+'|'+c.culture+'|'+c.religion;
        if (seen[key]) fault(rid,'people'); seen[key]=true;
      });
    }
    Object.keys(root).forEach(function (rid) {
      var r = M.row(s,rid), strategy = FBDATA.governmentForms[root[rid].formId] && G.resolve(root[rid].formId).use.territory;
      if (!r) {if(strategy && strategy.mobileFollowing) fault(rid,'missing');return;}
      var p = M.profile(s,rid), moving = M.migration(s,rid), ids = {}, principals = {};
      if (moving && !M.migrationSponsorshipValid(s,moving)) fault(rid,'sponsorship');
      if (!keys(r,['schema','profileId','migrationId','status','serial','revision','leaderId','selection','decision','food','lastDay','lastAI',
          'worked','agreements','accounting','members','defeatKey','openingBindings','command','openingAccess','columns']) || [1,2,3].indexOf(r.schema)<0 || !p || !moving || moving.realmId !== rid ||
          !['active','settled','dispersed'].includes(r.status) || !whole(r.serial) || !whole(r.revision) || !whole(r.lastDay) || r.lastDay > s.turn ||
          r.lastAI !== undefined && (!whole(r.lastAI) || r.lastAI>Math.floor(s.turn/90)) || !boundedNumber(r.food,1000000000000) ||
          !keys(r.accounting,['initial','arrivals','dead','settled','dispersed']) || Object.keys(r.accounting).length !== 5 ||
          Object.keys(r.accounting).some(function (k) {return !whole(r.accounting[k]) || r.accounting[k]>1000000000000;}) ||
          !Array.isArray(r.members) || r.members.length > p.maxMembers || !Array.isArray(r.agreements) || r.agreements.length > p.maxAgreements ||
          !plain(r.worked) || Object.keys(r.worked).length > 64 || Object.keys(r.worked).some(function (cid) {return !s.chars[cid] || r.worked[cid] !== s.turn;}) ||
          r.defeatKey !== undefined && (typeof r.defeatKey !== 'string' || r.defeatKey.length > 512)) fault(rid);
      var declaration=(FB.campaignBookmark(s).realms || []).filter(function (d) {return d.id===rid;})[0];
      var opening=declaration && declaration.mobile && declaration.mobile.opening;
      if (r.schema===1 && (r.openingBindings!==undefined || opening) || r.schema>=2 &&
          (!opening || !Array.isArray(r.openingBindings) || r.openingBindings.length!==opening.principals.length)) fault(rid,'openingBindings');
      if (r.schema>=2) {
        var boundIds={};
        r.openingBindings.forEach(function (b,i) {
          var expected=opening.principals[i], ref=b && b.person, c=b && s.chars[b.characterId];
          if (!keys(b,['memberId','characterId','person']) || b.memberId!==expected.memberId || !c || boundIds[c.id] ||
              !ref || JSON.stringify(ref)!==JSON.stringify(expected.person)) fault(rid,'openingBindings');
          if (!FB.bookmarkActor(s,ref.actorId) || FB.bookmarkActor(s,ref.actorId).id!==c.id) fault(rid,'openingBindings');
          boundIds[c.id]=true;
        });
      }
      if (r.status === 'active' && (!strategy || !strategy.mobileFollowing || s.realms[rid].alive === false || moving.status === 'settled' || moving.status === 'failed') ||
          r.status === 'settled' && (strategy.mobileFollowing || moving.status !== 'settled' || M.total(s,rid) !== 0) ||
          r.status === 'dispersed' && (s.realms[rid].alive !== false || M.total(s,rid) !== 0)) fault(rid,'status');
      r.members.forEach(function (m) {
        if (!keys(m,['id','principal','scope','basis','continuity','weight','pledge','allegiance','civilians','reserve']) ||
            typeof m.id !== 'string' || !m.id || m.id.length>160 || ids[m.id] || !keys(m.principal,['kind','id']) || m.principal.kind !== 'character' ||
            !s.chars[m.principal.id] || principals[m.principal.id] || !keys(m.scope,['kind','id']) || m.scope.kind !== 'realm' || m.scope.id !== rid ||
            m.basis !== 'following' || m.continuity !== 'member' || !whole(m.weight) || !m.weight || m.weight > 100 ||
            !boundedNumber(m.pledge,p.recruitShare) || typeof m.allegiance !== 'boolean') fault(rid,'members');
        if(r.status==='active' && moving.courtIds.indexOf(m.principal.id)<0) fault(rid,'court');
        ids[m.id]=true; principals[m.principal.id]=true; pool(rid,m.civilians,false); pool(rid,m.reserve,false);
      });
      if (r.leaderId !== null && (!principals[r.leaderId] || !s.chars[r.leaderId])) fault(rid,'leader');
      if (r.selection !== null) {
        if (!keys(r.selection,['votes']) || !plain(r.selection.votes) || Object.keys(r.selection.votes).some(function (mid) {
          return !ids[mid] || !principals[r.selection.votes[mid]];
        })) fault(rid,'selection');
      }
      if (r.decision !== null && (!keys(r.decision,['operation','terms','approvals']) || !proposalAction(r.decision.operation) ||
          !validTerms(proposalAction(r.decision.operation),r.decision.terms) || !plain(r.decision.approvals) ||
          Object.keys(r.decision.approvals).some(function (mid) {var m = member(s,rid,mid);return !m || r.decision.approvals[mid] !== m.principal.id;}))) fault(rid,'decision');
      r.agreements.forEach(function (a) {
        var key = rid+'|'+a.id;
        if (!keys(a,['id','kind','partnerId','countyIds','capacity','allowRecruit','price','duration','levy','status','startTurn','endTurn','harvestPeriod','generations']) ||
            typeof a.id !== 'string' || !a.id || a.id.length>160 || allIds[key] || ['access','tribute','protection'].indexOf(a.kind) < 0 || !s.realms[a.partnerId] || a.partnerId === rid ||
            ['offered','active','ended'].indexOf(a.status) < 0 || !whole(a.price) || !whole(a.duration) || !a.duration || a.duration > 1440 ||
            !whole(a.startTurn) || a.startTurn>s.turn || !whole(a.endTurn) || a.endTurn <= a.startTurn || a.endTurn-a.startTurn !== a.duration ||
            !Number.isSafeInteger(a.harvestPeriod) || a.harvestPeriod < -1 || a.harvestPeriod > Math.floor(s.turn/90) || !Array.isArray(a.generations) || a.generations.length !== 2 || a.generations.some(function (n) {return !whole(n);}) ||
            a.kind === 'access' && (!Array.isArray(a.countyIds) || !a.countyIds.length || a.countyIds.length > 16 || !whole(a.capacity) || !a.capacity || typeof a.allowRecruit !== 'boolean' ||
              a.countyIds.some(function (pid,i) {return !s.owner[pid] || a.countyIds.indexOf(pid) !== i;})) ||
            a.kind !== 'access' && !whole(a.levy)) fault(rid,'agreements');
        allIds[key]=true;
      });
      var hosted = declaration && declaration.mobile && declaration.mobile.hostedAccess, marker = r.openingAccess;
      if (!hosted) { if (marker !== undefined) fault(rid,'openingAccess'); }
      else {
        if (!keys(marker,['schema','id','startTurn','generations']) || Object.keys(marker).length !== 4 || marker.schema !== 1 ||
            marker.id !== hostedAccessId(declaration) || marker.startTurn !== 0 || !Array.isArray(marker.generations) ||
            marker.generations.length !== 2 || marker.generations.some(function (n,i) {
              return !whole(n) || !n || n > FB.realmRulerGeneration(s,i ? FB.startRealmId(s,hosted.partnerRealmId) : rid);
            })) fault(rid,'openingAccess');
        var grant = r.agreements.filter(function (a) {return a.id === marker.id;})[0];
        if (!grant && s.turn < hosted.duration && r.status === 'active' || grant &&
            (grant.kind !== 'access' || grant.partnerId !== FB.startRealmId(s,hosted.partnerRealmId) || grant.price !== 0 || grant.levy !== undefined ||
              grant.duration !== hosted.duration || grant.capacity !== hosted.capacity || grant.allowRecruit !== hosted.allowRecruit ||
              grant.startTurn !== 0 || grant.status === 'offered' || JSON.stringify(grant.countyIds) !== JSON.stringify(hosted.countyIds) ||
              JSON.stringify(grant.generations) !== JSON.stringify(marker.generations))) fault(rid,'openingAccess');
      }
      (s.armies || []).filter(function (a) {return a.realm===rid && a.mobileFollowing;}).forEach(function (a) {
        pool(rid,a.mobileRoster,true);
        if ((a.id !== moving.hostId && !(M.columnHostOwned && M.columnHostOwned(s,rid,a))) || a.migrationId !== moving.id || sum(a.mobileRoster) !== a.men || a.mobileRoster.some(function (c) {return !ids[c.memberId];}) ||
            typeof a.mobileCourt !== 'boolean' || !boundedNumber(a.mobileFood,1000000000000) ||
            a.mobileProvisionTurn!==undefined && (!Number.isInteger(a.mobileProvisionTurn) || a.mobileProvisionTurn>s.turn) ||
            a.mobileCourt && moving.at !== a.at || (a.path || []).some(function (pid) {return !s.owner[pid];}) ||
            !plain(a.units) || Object.keys(a.units).some(function (id) {return !whole(a.units[id]);}) || Object.keys(a.units).reduce(function (n,id) {return n+a.units[id];},0)!==a.men) fault(rid,'host');
      });
      var host = M.host(s,rid);
      if (r.status==='active' && host && !host.mobileFollowing) fault(rid,'host');
      if (r.accounting.initial+r.accounting.arrivals-r.accounting.dead-r.accounting.settled-r.accounting.dispersed !== M.total(s,rid)) fault(rid,'conservation');
    });
    (s.armies || []).forEach(function (a) {if(a.mobileFollowing && !M.row(s,a.realm)) fault(a.realm,'orphan_host');});
    return true;
  };
})();
