/* Royal recognition composes the common transaction; hereditary jurisdiction,
   public remuneration and private estates keep their canonical records. */
(function () {
  'use strict';
  var A = FB.aristocracy = {}, G = FB.governments, R = FB.governmentRecognition, Q = FB.political;
  function own(o,k) { return !!o && Object.prototype.hasOwnProperty.call(o,k); }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function plain(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function keys(v,list) { return plain(v) && Object.keys(v).every(function (k) { return list.indexOf(k) >= 0; }); }
  function rate(v) { return Number.isFinite(v) && v >= 0 && v <= 1; }
  function same(a,b) { return !!a && !!b && a.kind === b.kind && a.id === b.id; }
  function government(s,rid) { return s.authority && s.authority.governments && s.authority.governments[rid]; }
  function appointments(s) { return s.authority && s.authority.appointments || []; }
  function rights(s) { return s.authority && s.authority.rights || []; }
  function live(s,c) { return !!c && !c.dead && !c.unfree && !c.exiled && !c.captive && !c.imprisoned && !FB.justiceCustodyOf(s,c.id); }
  function current(s,rid) { return rid === 'player' ? s.chars[s.player.charId] : FB.realmRulerCharacterSnapshot(s,rid); }
  function court(s,rid,actor) {
    var c = current(s,rid);
    return !!Q.actor(s,actor) && (actor.kind === 'realm' && actor.id === rid || actor.kind === 'character' && c && c.id === actor.id);
  }
  A.state = function (s,rid) { var row = government(s,rid); return row && row.aristocracy || null; };
  A.adopt = function (s,origin) {
    var data = A.state(s,'player'), row = government(s,'player'), t = s.realms.player.succession;
    if (!data || !t) return;
    data.royalRealmId = 'player'; data.originRealmId = origin;
    t.playerDynasty = true; t.heirCharId = null;
    row.recognition = {}; delete t.designatedHeirId;
  };
  A.profile = function (s,rid) {
    var row = government(s,rid), form = G.forRealm(s,rid), def = form && FBDATA.governmentForms[form.id];
    var id = def && def.aristocraticProfileId && (row && row.aristocracy && row.aristocracy.profileId || def.aristocraticProfileId);
    return id && FBDATA.aristocraticProfiles[id] || null;
  };
  function tree(s,rid) { var r = s.realms[rid]; return r && r.succession; }
  function sourceTree(s,rid) { var data = A.state(s,rid); return data && tree(s,data.royalRealmId); }
  function descendant(m,members,roots,seen) {
    if (!m) return false;
    var id = m.id || Object.keys(members).filter(function (key) { return members[key] === m; })[0];
    if (!id || seen[id]) return false;
    if (roots.indexOf(id) >= 0) return true;
    seen[id] = true;
    return descendant(members[m.fatherId || m.parentId],members,roots,seen) ||
      descendant(members[m.motherId],members,roots,seen);
  }
  function royalCharacter(s,rid,c,seen) {
    var data = A.state(s,rid), source = sourceTree(s,rid);
    if (!c || !data || !source || seen[c.id]) return false;
    seen[c.id] = true;
    var id = c.royalLine && c.royalLine.realmId === data.royalRealmId && c.royalLine.memberId;
    if (id && descendant(source.members[id],source.members,data.royalRoots,{})) return true;
    return royalCharacter(s,rid,s.chars[c.fatherId],seen) || royalCharacter(s,rid,s.chars[c.motherId],seen);
  }
  A.royalEligibility = function (s,rid,cid) {
    var p = A.profile(s,rid), c = s.chars[cid];
    var allowed = !!p && live(s,c) && royalCharacter(s,rid,c,{}) && (p.allowMinor || s.date.year - c.born >= p.minimumAge);
    return { allowed:!!allowed, reason:allowed ? null : FB.T('Royal descent, freedom and a living eligible person are required. Wealth or provincial service alone gives no royal claim.') };
  };
  A.candidates = function (s,rid) {
    var p = A.profile(s,rid), data = A.state(s,rid), t = tree(s,rid), source = sourceTree(s,rid);
    if (!p || !data || !t || !source) return [];
    var ids = rid === 'player' ? Object.keys(s.chars).filter(function (id) {
      return id !== s.player.charId && A.royalEligibility(s,rid,id).allowed;
    }) : Object.keys(t.members).filter(function (id) {
      var m = t.members[id], c = m.charId && s.chars[m.charId];
      return id !== t.rulerMemberId && m.alive !== false && m.role !== 'consort' &&
        (!m.charId || live(s,c)) && (p.allowMinor || s.date.year - m.born >= p.minimumAge) &&
        (royalCharacter(s,rid,c,{}) || !m.charId && descendant(m,source.members,data.royalRoots,{})) &&
        (!m.branchRef || FB.royalBranchEligible(s,rid,m));
    });
    ids.sort(function (a,b) {
      var ma = R.candidateMember(s,rid,a), mb = R.candidateMember(s,rid,b);
      return ma.born - mb.born || (a < b ? -1 : a > b ? 1 : 0);
    });
    return ids.slice(0,64).map(function (id) {
      var m = R.candidateMember(s,rid,id), c = rid === 'player' ? m : m.charId && s.chars[m.charId];
      return { id:id, charId:c && c.id || null, born:m.born, minor:s.date.year - m.born < p.minimumAge,
        civil:c ? FB.skillSnapshot(s,c,'ste') : 0, military:c ? FB.skillSnapshot(s,c,'mar') : m.mar || 0,
        ancestry:copy([data.royalRoots,m.fatherId || m.parentId || null,m.motherId || null,
          c && [c.fatherId,c.motherId,c.royalLine,c.unfree,c.dead]]) };
    });
  };
  A.assignment = function (s,row) {
    var data = row && A.state(s,row.institutionId);
    return !!(data && data.interests.some(function (m) { return m.appointmentId === row.id; }));
  };
  function assignment(s,m) { return appointments(s).filter(function (row) { return row.id === m.appointmentId; })[0]; }
  function jurisdiction(s,m) { return rights(s).filter(function (row) { return m.rightIds.indexOf(row.id) >= 0; }); }
  function interest(s,rid,id) { var data = A.state(s,rid); return data && data.interests.filter(function (m) { return m.id === id; })[0]; }
  function rule(s,rid,id) { var p = A.profile(s,rid); return p && p.interests.filter(function (m) { return m.id === id; })[0]; }
  A.constituency = function (s,rid) {
    var data = A.state(s,rid), p = A.profile(s,rid);
    return data && p ? data.interests.map(function (m) {
      var row = assignment(s,m), c = row && s.chars[row.holder.id], local = jurisdiction(s,m);
      var active = live(s,c) && c.dyn === m.dynasty && s.date.year - c.born >= p.minimumAge &&
        (s.holder[m.scope.id] || s.owner[m.scope.id]) === rid && local.length === 2 && local.every(function (r) {
          return r.status === 'active' && r.strength >= 50 && same(r.beneficiary,row.holder);
        });
      return Object.assign(copy(m), { principal:row ? copy(row.holder) : null, active:!!active,
        weight:rule(s,rid,m.id).weight, terms:row && row.provincialTerms ? {
          revenue:1 - row.publicTerms.share, levy:row.provincialTerms.levy, status:row.provincialTerms.status
        } : null });
    }) : [];
  };
  function members(s,rid) {
    var data = A.state(s,rid);
    if (!data) return [];
    return [{ id:'court', principal:{kind:'realm',id:rid}, scope:{kind:'realm',id:rid}, basis:'designation',weight:1,active:true }]
      .concat(A.constituency(s,rid).map(function (m) {
        return { id:m.id, principal:m.principal, scope:copy(m.scope), basis:'hereditary_interest',
          weight:m.weight, active:m.active };
      }));
  }
  function validTerms(s,rid,t) {
    var p = A.profile(s,rid);
    return !!p && keys(t,['revenue','levy']) && Object.keys(t).length === 2 && rate(t.revenue) && rate(t.levy) &&
      t.revenue >= p.minimumRevenue && t.levy >= p.minimumLevy;
  }
  function facts(s,rid) {
    var data = A.state(s,rid), source = sourceTree(s,rid);
    return [data,source, A.constituency(s,rid), data && data.interests.map(function (m) {
      return [assignment(s,m),jurisdiction(s,m),FB.countyPopularSupport(s,m.scope.id),s.holder[m.scope.id],s.owner[m.scope.id]];
    })];
  }
  function response(s,rid,member,candidate,t) {
    var p = A.profile(s,rid), r = rule(s,rid,member.id);
    if (!member.active || !candidate || !validTerms(s,rid,t)) return false;
    if (!r) return member.id === 'court';
    var row = assignment(s,interest(s,rid,member.id));
    var otherShares = appointments(s).filter(function (a) { return a.id !== row.id && a.publicTerms && a.institutionId === rid &&
      a.publicTerms.source.provinceId === row.scope.id && ['active','contested'].indexOf(a.status) >= 0 &&
      (a.endTurn === null || a.endTurn > s.turn); }).reduce(function (n,a) { return n + a.publicTerms.share; },0);
    return candidate.military >= r.minimumMartial && t.revenue <= r.maximumRevenue && t.levy <= r.maximumLevy &&
      FB.countyPopularSupport(s,member.scope.id) >= p.refusalSupport && 1 - t.revenue + otherShares <= 1 + 0.000001 &&
      row.provincialTerms.status === 'assent';
  }
  var policy = {
    members:members, candidates:A.candidates,
    designate:function (s,rid,id) {
      return rid === 'player' ? Object.keys(tree(s,rid).members).filter(function (key) {
        return tree(s,rid).members[key].charId === id;
      })[0] : id;
    },
    designated:function (s,rid,t) {
      return rid === 'player' ? t.members[t.designatedHeirId] && t.members[t.designatedHeirId].charId : t.designatedHeirId;
    },
    support:function (s,rid,q,member,candidate,terms) {
      var p = A.profile(s,rid), negotiated = !!member && !same(q.actor,member.principal) &&
        member.id !== 'court' && court(s,rid,q.actor) && terms !== undefined;
      q.terms = q.candidateId === null ? null : copy(terms || p && p.defaultTerms || null);
      q.negotiated = negotiated;
      q.cost = negotiated ? p.negotiationCost : 0;
      q.allowed = !!member && (q.allowed || negotiated) && (q.candidateId === null ? member.id !== 'court' && !negotiated :
        response(s,rid,member,candidate,q.terms)) && (!q.cost || FB.treasuryAvailable(s,rid) >= q.cost);
      q.reason = q.allowed ? null : FB.T('The living interest must accept this royal candidate and these provincial burdens. Refusal, missing jurisdiction or insufficient treasury prevents recognition.');
      q.stamp = JSON.stringify([q.stamp, facts(s,rid),p,q.terms,q.negotiated,FB.treasuryAvailable(s,rid)]);
    },
    pay:function (s,q) { return !q.cost || FB.treasuryTransfer(s,q.realmId,null,q.cost); },
    voteValid:function (s,rid,member,vote,choice) {
      if (!member.active) return false;
      if (member.id === 'court') return !!choice;
      return !!vote && vote.generation === FB.realmRulerGeneration(s,rid) && same(vote.principal,member.principal) &&
        vote.candidateId === choice && response(s,rid,member,A.candidates(s,rid).filter(function (c) { return c.id === choice; })[0],vote.terms);
    },
    accession:function (s,rid,q) {
      var p = A.profile(s,rid), data = A.state(s,rid), t = tree(s,rid), sitting = current(s,rid);
      var incumbent = rid === 'player' ? s.chars[s.player.charId] : t && t.members[t.rulerMemberId];
      var stewardship = A.constituency(s,rid).filter(function (m) { return m.active; }).sort(function (a,b) {
        return b.weight - a.weight || a.id.localeCompare(b.id);
      })[0];
      var lawful = q.cause === 'abdication' || q.cause === 'death' && incumbent &&
        (rid === 'player' ? incumbent.dead : incumbent.alive === false || incumbent.charId && s.chars[incumbent.charId].dead) ||
        q.cause === 'lawful_removal' && sitting && FB.justiceCustodyOf(s,sitting.id) &&
        FB.justiceCustodyOf(s,sitting.id).source === 'judicial';
      q.stewardId = q.minor && stewardship ? stewardship.principal.id : null;
      q.commitments = A.constituency(s,rid).map(function (m) {
        var vote = government(s,rid).recognition && government(s,rid).recognition[m.id];
        return { id:m.id, terms:vote && vote.candidateId === q.memberId && policy.voteValid(s,rid,
          members(s,rid).filter(function (row) { return row.id === m.id; })[0],vote,q.memberId) ? copy(vote.terms) : null };
      });
      q.allowed = !!q.allowed && !!p && !!data && !!lawful && (!q.minor || !!q.stewardId);
      if (!lawful) q.reason = FB.T('Accession requires a deceased ruler, voluntary abdication or current lawful judicial displacement.');
      else if (q.minor && !q.stewardId) q.reason = FB.T('A minor royal candidate requires a living adult interest to steward the public court.');
      q.stamp = JSON.stringify([q.stamp,facts(s,rid),p,q.stewardId,q.commitments,sitting && FB.justiceCustodyOf(s,sitting.id)]);
    },
    resolved:function (s,rid,q) {
      var data = A.state(s,rid);
      if (!data) return;
      q.commitments.forEach(function (pledge) {
        var m = interest(s,rid,pledge.id), row = m && assignment(s,m);
        if (!row || !pledge.terms) return;
        row.publicTerms.share = 1 - pledge.terms.revenue;
        row.provincialTerms.levy = pledge.terms.levy;
        row.provincialTerms.changedTurn = s.turn;
      });
      data.regency = q.minor ? { generation:q.rulerGeneration + 1, stewardId:q.stewardId, sinceTurn:s.turn } : null;
      FB.news(s,FB.msg('news.aristocratic.accession','The royal court of {court} recognizes {person}. Provincial commitments and household estates retain their separate owners.',
        {court:FB.realmNameParam(s,rid),person:R.candidateMember(s,rid,q.memberId).name}));
    }
  };
  A.inheritanceQuote = function (s,actor,rid,id) {
    var data = A.state(s,rid), p = A.profile(s,rid) || data && FBDATA.aristocraticProfiles[data.profileId];
    var m = interest(s,rid,id), row = m && assignment(s,m);
    var old = row && s.chars[row.holder.id], heirs = !m || !p ? [] : Object.keys(s.chars).map(function (cid) { return s.chars[cid]; })
      .filter(function (c) { return live(s,c) && c.dyn === m.dynasty && s.date.year - c.born >= p.minimumAge; })
      .sort(function (a,b) { return a.born - b.born || a.id.localeCompare(b.id); });
    var heir = heirs[0], allowed = !!data && !!row && !!old && old.dead && !!heir &&
      (court(s,rid,actor) || actor && actor.kind === 'character' && actor.id === heir.id) &&
      jurisdiction(s,m).every(function (right) { return right.status === 'active' && same(right.beneficiary,row.holder); });
    return {operation:'provincial_inheritance',realmId:rid,interestId:id,actor:copy(actor || null),
      heirId:heir && heir.id || null,allowed:!!allowed,cost:0,
      reason:allowed ? null : FB.T('A deceased principal and a living adult of the same house are required. No new family or governor is created.'),
      stamp:JSON.stringify([data,row,m && jurisdiction(s,m),old && [old.id,old.dead],heirs.map(function (c) {
        return [c.id,c.dyn,c.born,c.fatherId,c.motherId];
      }),FB.realmRulerGeneration(s,rid)])};
  };
  A.inherit = function (s,reviewed) {
    if (!reviewed) return false;
    var q = A.inheritanceQuote(s,reviewed.actor,reviewed.realmId,reviewed.interestId);
    if (!q.allowed || JSON.stringify(q) !== JSON.stringify(reviewed)) return false;
    var m = interest(s,q.realmId,q.interestId), row = assignment(s,m);
    row.holder = {kind:'character',id:q.heirId};
    if (row.status === 'expired' && row.endTurn === null) row.status = 'active';
    row.provincialTerms.changedTurn = s.turn;
    jurisdiction(s,m).forEach(function (right) { right.beneficiary = copy(row.holder); });
    var gov = government(s,q.realmId);
    if (gov.recognition) delete gov.recognition[m.id];
    FB.news(s,FB.msg('news.aristocratic.inheritance','{person} continues the local rights of {house}. Private estate inheritance and appointed provincial offices remain separate.',
      {person:s.chars[q.heirId].name,house:m.dynasty}));
    return true;
  };
  A.provincialQuote = function (s,actor,rid,id,action,terms) {
    var m = interest(s,rid,id), p = A.profile(s,rid), r = rule(s,rid,id), row = m && assignment(s,m);
    var voice = A.constituency(s,rid).filter(function (v) { return v.id === id; })[0];
    var patron = court(s,rid,actor), principal = voice && same(actor,voice.principal) && live(s,s.chars[actor.id]);
    var t = row && row.provincialTerms, permitted = !!p && !!voice && voice.active && !!t;
    var allowed = permitted && (action === 'withhold' ? principal && t.status === 'assent' :
      action === 'assent' ? principal && t.status === 'withheld' :
      action === 'enforce' ? patron && t.status === 'withheld' && Q.power(s,actor,'peace',{provinceId:m.scope.id}).allowed :
      action === 'negotiate' ? (patron || principal) && validTerms(s,rid,terms) &&
        terms.revenue <= r.maximumRevenue && terms.levy <= r.maximumLevy &&
        FB.countyPopularSupport(s,m.scope.id) >= p.refusalSupport : false);
    var cost = action === 'negotiate' && patron ? p.negotiationCost : 0;
    if (allowed && action === 'negotiate') {
      var shares = appointments(s).filter(function (a) { return a.id !== row.id && a.publicTerms && a.institutionId === rid &&
        a.publicTerms.source.provinceId === m.scope.id && ['active','contested'].indexOf(a.status) >= 0 &&
        (a.endTurn === null || a.endTurn > s.turn); }).reduce(function (n,a) { return n + a.publicTerms.share; },0);
      allowed = shares + 1 - terms.revenue <= 1 + 0.000001;
    }
    allowed = allowed && (!cost || FB.treasuryAvailable(s,rid) >= cost);
    return {operation:'provincial',realmId:rid,interestId:id,actor:copy(actor || null),action:action,
      terms:terms ? copy(terms) : null,allowed:!!allowed,cost:cost,
      supportCost:action === 'enforce' && p ? p.enforcementSupportCost : 0,
      reason:allowed ? null : FB.T('The current principal, local jurisdiction, accepted burdens and available treasury must permit this provincial decision.'),
      stamp:JSON.stringify([facts(s,rid),p,FB.realmRulerGeneration(s,rid),FB.treasuryAvailable(s,rid),actor,action,terms || null])};
  };
  A.apply = function (s,reviewed) {
    if (!reviewed) return false;
    var q = A.provincialQuote(s,reviewed.actor,reviewed.realmId,reviewed.interestId,reviewed.action,reviewed.terms);
    if (!q.allowed || JSON.stringify(q) !== JSON.stringify(reviewed) || q.cost && !FB.treasuryTransfer(s,q.realmId,null,q.cost)) return false;
    var m = interest(s,q.realmId,q.interestId), row = assignment(s,m), t = row.provincialTerms;
    if (q.action === 'negotiate') { row.publicTerms.share = 1 - q.terms.revenue; t.levy = q.terms.levy; }
    t.status = q.action === 'withhold' ? 'withheld' : 'assent'; t.changedTurn = s.turn;
    if (q.supportCost) FB.setCountySupport(s,m.scope.id,FB.countySupportBase(s,m.scope.id) - q.supportCost);
    var gov = government(s,q.realmId);
    if (gov.recognition) delete gov.recognition[m.id];
    FB.news(s,FB.msg('news.aristocratic.provincial','Provincial obligations in {place} are reviewed by {person}; public jurisdiction and private estates remain separate.',
      {place:FB.world.byId[m.scope.id].name,person:s.chars[row.holder.id].name}));
    return true;
  };
  A.conversionQuote = function (s,actor,rid,formId) {
    var data = A.state(s,rid), row = government(s,rid), p = data && FBDATA.aristocraticProfiles[data.profileId];
    var target = FBDATA.governmentForms[formId], returning = !!target && !!target.aristocraticProfileId, sitting = current(s,rid);
    var allowed = !!data && !!p && !!target && !!row && row.formId !== formId && court(s,rid,actor) &&
      !G.problems(formId).length && !row.publicVacancy && !data.regency &&
      live(s,sitting) && s.date.year - sitting.born >= p.minimumAge &&
      // Reuse surviving facts. A conversion cannot conjure an opening household.
      (returning ? target.succession === 'royal_recognition' && royalCharacter(s,rid,current(s,rid),{}) : target.succession === 'dynastic') &&
      data.interests.every(function (m) {
        var a = assignment(s,m), c = a && s.chars[a.holder.id];
        return live(s,c) && a.provincialTerms.status === 'assent' && jurisdiction(s,m).every(function (r) {
          return r.status === 'active' && same(r.beneficiary,a.holder);
        });
      });
    return {operation:'aristocratic_conversion',realmId:rid,actor:copy(actor || null),formId:formId,cost:0,allowed:!!allowed,
      reason:allowed ? null : FB.T('The current court and every surviving hereditary interest must assent. A vacant court or minority stewardship cannot change government.'),
      stamp:JSON.stringify([row,facts(s,rid),target,FB.realmRulerGeneration(s,rid),current(s,rid),actor])};
  };
  A.continuityRealm = function (s) {
    return ['player',s.player.liege,s.holder[s.player.provinceId],s.owner[s.player.provinceId]].filter(function (rid) {
      return rid && s.realms[rid] && s.realms[rid].alive && A.state(s,rid) && !A.profile(s,rid);
    })[0] || null;
  };
  A.convert = function (s,reviewed) {
    if (!reviewed) return false;
    var q = A.conversionQuote(s,reviewed.actor,reviewed.realmId,reviewed.formId);
    if (!q.allowed || JSON.stringify(q) !== JSON.stringify(reviewed) ||
        !FB.authoritySetGovernment(s,q.realmId,q.formId,{aristocraticCommit:true})) return false;
    var row = government(s,q.realmId);
    row.recognition = {}; delete row.lastAccession; delete row.publicVacancy;
    FB.refreshRealmSuccession(s,q.realmId); G.invalidate();
    FB.news(s,FB.msg('news.aristocratic.conversion','{court} changes its declared government. Surviving provincial rights and household estates retain their holders.',
      {court:FB.realmNameParam(s,q.realmId)}));
    return true;
  };
  var setGovernment = FB.authoritySetGovernment;
  FB.authoritySetGovernment = function (s,rid,id,options) {
    var target = FBDATA.governmentForms[id];
    if ((A.state(s,rid) || target && target.aristocraticProfileId) && !(options && options.aristocraticCommit)) return false;
    return setGovernment(s,rid,id,options);
  };
  A.stewardQuote = function (s,actor,rid) {
    var data = A.state(s,rid), p = A.profile(s,rid), sitting = current(s,rid);
    var prior = data && data.regency, old = prior && s.chars[prior.stewardId];
    var active = A.constituency(s,rid).filter(function (m) { return m.active; });
    var capable = live(s,old) && active.some(function (m) { return m.principal.id === old.id; });
    var next = active.sort(function (a,b) {
      return b.weight - a.weight || a.id.localeCompare(b.id);
    })[0];
    var allowed = !!p && !!prior && !!sitting && s.date.year - sitting.born < p.minimumAge && !capable &&
      !!next && (court(s,rid,actor) || same(actor,next.principal));
    return {operation:'aristocratic_steward',realmId:rid,actor:copy(actor || null),stewardId:next && next.principal.id || null,
      allowed:!!allowed,cost:0,reason:allowed ? null : FB.T('A minor court with an incapable steward needs a living adult hereditary principal. Existing royal ancestry and provincial rights remain unchanged.'),
      stamp:JSON.stringify([facts(s,rid),sitting,prior,next,actor,FB.realmRulerGeneration(s,rid)])};
  };
  A.steward = function (s,reviewed) {
    if (!reviewed) return false;
    var q = A.stewardQuote(s,reviewed.actor,reviewed.realmId);
    if (!q.allowed || JSON.stringify(q) !== JSON.stringify(reviewed)) return false;
    A.state(s,q.realmId).regency = {generation:FB.realmRulerGeneration(s,q.realmId),stewardId:q.stewardId,sinceTurn:s.turn};
    FB.news(s,FB.msg('news.aristocratic.steward','{person} stewards the public court of {court} during the ruler’s minority.',
      {person:s.chars[q.stewardId].name,court:FB.realmNameParam(s,q.realmId)}));
    return true;
  };
  function maintainRegency(s,rid) {
    var data = A.state(s,rid), p = A.profile(s,rid), reigning = p && current(s,rid);
    if (!data || !data.regency || !p || !reigning) return;
    if (s.date.year - reigning.born >= p.minimumAge) data.regency = null;
    else A.steward(s,A.stewardQuote(s,{kind:'realm',id:rid},rid));
  }
  var settle = FB.publicOfficeSettle;
  FB.publicOfficeSettle = function (s,snapshot,period,playerOnly) {
    Object.keys(s.authority && s.authority.governments || {}).forEach(function (rid) {
      if ((rid === 'player') !== !!playerOnly) return;
      var data = A.state(s,rid);
      if (rid !== 'player' && data && !A.profile(s,rid) && s.realms[rid] && s.realms[rid].alive) data.interests.forEach(function (m) {
        A.inherit(s,A.inheritanceQuote(s,{kind:'realm',id:rid},rid,m.id));
      });
      maintainRegency(s,rid);
    });
    return settle(s,snapshot,period,playerOnly);
  };
  A.seed = function (s) {
    var bm = FB.bookmark(s.start.id);
    (bm.realms || []).forEach(function (def) {
      var rid = FB.startRealmId(s,def.id), row = government(s,rid), form = row && FBDATA.governmentForms[row.formId];
      if (!form || !form.aristocraticProfileId || row.aristocracy) return;
      var id = def.aristocraticProfileId || form.aristocraticProfileId, p = FBDATA.aristocraticProfiles[id], t = tree(s,rid);
      if (!p || !t || !t.members || !t.founderId) throw new Error('Missing declared royal constituency');
      row.administrationProfileId = p.administrationProfileId;
      row.aristocracy = { schema:1,profileId:id,originRealmId:rid,royalRealmId:rid,royalRoots:[t.founderId],interests:[],regency:null };
      p.interests.forEach(function (interest) {
        var cid = s.bookmarkSetup && s.bookmarkSetup.actors[interest.actorId], c = s.chars[cid];
        if (!live(s,c) || c.dyn !== interest.dynasty) throw new Error('Missing declared hereditary household');
        var at = {kind:'county',id:interest.provinceId};
        var grant = FB.authorityAppoint(s,{officeId:interest.officeId,institutionId:rid,
          appointer:{kind:'realm',id:rid},holder:{kind:'character',id:cid},scope:at});
        if (!grant) throw new Error('Invalid hereditary jurisdiction');
        var office = appointments(s).filter(function (a) { return a.id === grant.id; })[0];
        office.publicTerms = {schema:1,kind:'revenue_service',source:{kind:'county_tax',provinceId:at.id},
          share:1 - p.defaultTerms.revenue,salary:0,serviceShare:0,confirmation:'continues',remittance:1,
          arrears:0,unpaid:0,lastPeriod:Math.floor(s.turn / 90),last:null};
        office.provincialTerms = {schema:1,interestId:interest.id,levy:p.defaultTerms.levy,status:'assent',changedTurn:s.turn};
        var ids = ['peace','consent'].map(function (power) {
          var right = FB.authorityEstablishRight(s,{issuer:{kind:'realm',id:rid},beneficiary:copy(office.holder),scope:at,
            power:power,basis:'tenure',basisRef:'hereditary:' + id + ':' + interest.id});
          if (!right) throw new Error('Invalid hereditary right');
          return right.id;
        });
        row.aristocracy.interests.push({id:interest.id,dynasty:c.dyn,scope:at,appointmentId:office.id,rightIds:ids});
      });
      FB.refreshRealmSuccession(s,rid);
      if (p.openingGovernor) {
        var input = {institutionId:rid,officeId:FB.administrationProfile(s,rid).governor,
          holderId:s.bookmarkSetup.actors[p.openingGovernor.actorId],provinceId:p.openingGovernor.provinceId,
          scope:{kind:'county',id:p.openingGovernor.provinceId}};
        var q = FB.publicAppointmentQuote(s,{kind:'realm',id:rid},input);
        if (!q.allowed || !FB.publicAppoint(s,q)) throw new Error('Invalid declared provincial governor');
      }
    });
  };
  var recognitionAI = FB.publicRecognitionAI;
  FB.publicRecognitionAI = function (s,rid) {
    var p = A.profile(s,rid);
    if (!p) return recognitionAI(s,rid);
    var candidates = A.candidates(s,rid), row = government(s,rid);
    members(s,rid).forEach(function (m) {
      if (!m.active || !candidates.length) return;
      var prior = row.recognition && row.recognition[m.id];
      // An explicit withdrawal stays a refusal for this principal/generation.
      if (prior && prior.generation === FB.realmRulerGeneration(s,rid) && same(prior.principal,m.principal) &&
          (prior.candidateId === null || candidates.some(function (c) { return c.id === prior.candidateId; }))) return;
      var ordered = candidates.slice().sort(function (a,b) { return b.military - a.military || a.born - b.born || a.id.localeCompare(b.id); });
      var candidate = m.id === 'court' ? candidates[0] : ordered[0];
      var q = R.supportQuote(s,m.principal,rid,m.id,candidate.id,p.defaultTerms);
      if (q.allowed) R.applySupport(s,q);
    });
  };
  var officeAI = FB.publicAdministrationAI;
  A.ai = function (s,rid) {
    var data = A.state(s,rid), p = A.profile(s,rid);
    if (!data || !p) return;
    maintainRegency(s,rid);
    if (rid === 'player') return;
    var period = Math.floor(s.turn / 90);
    if (data.lastPeriod === period) return;
    data.lastPeriod = period;
    data.interests.forEach(function (m) {
      var heir = A.inheritanceQuote(s,{kind:'realm',id:rid},rid,m.id);
      if (heir.allowed) A.inherit(s,heir);
      var voice = A.constituency(s,rid).filter(function (v) { return v.id === m.id; })[0];
      if (voice && voice.active && FB.countyPopularSupport(s,m.scope.id) < p.refusalSupport && voice.terms.status === 'assent') {
        A.apply(s,A.provincialQuote(s,voice.principal,rid,m.id,'withhold'));
      } else if (voice && voice.active && voice.terms.status === 'withheld') {
        var q = A.provincialQuote(s,{kind:'realm',id:rid},rid,m.id,'negotiate',
          {revenue:Math.max(p.minimumRevenue,p.defaultTerms.revenue - 0.1),levy:Math.max(p.minimumLevy,p.defaultTerms.levy - 0.1)});
        if (q.allowed) A.apply(s,q);
      }
    });
    officeAI(s,rid);
    var vacant = government(s,rid).publicVacancy;
    if (vacant) FB.advanceRealmSuccession(s,rid,{cause:vacant.cause});
  };
  var succession = Object.assign({},G.strategy('succession','public_accession'));
  succession.selectionManaged = true;
  succession.recognitionPolicy = policy;
  succession.candidates = function (s,rid,c) {
    if (!A.state(s,rid)) return c.frontier.slice();
    return A.candidates(s,rid).map(function (m) {
      return rid === 'player' ? Object.keys(c.succession.members).filter(function (id) {
        return c.succession.members[id].charId === m.id;
      })[0] : m.id;
    }).filter(function (id) { return !!id; });
  };
  succession.refresh = function () { return true; };
  G.register('succession','royal_recognition',succession);
  G.register('holders','mixed_provincial',Object.assign({},G.strategy('holders','public_offices')));
  var levy = Object.assign({},G.strategy('levy','public_service')), baseLevy = levy.settlementBase;
  levy.settlementBase = function (s,rid,c) {
    var m = A.constituency(s,rid).filter(function (v) { return v.scope.id === c.provinceId; })[0];
    return baseLevy(s,rid,c) * (m ? m.active && m.terms.status === 'assent' ? m.terms.levy : 0.35 : 1);
  };
  G.register('levy','provincial_obligations',levy);
  var revenue = Object.assign({},G.strategy('revenue','public_receipts'));
  var countyBase = revenue.countyBase, settlementBase = revenue.settlementBase;
  function revenueFactor(s,rid,pid) {
    var m = A.constituency(s,rid).filter(function (v) { return v.scope.id === pid; })[0];
    return m && (!m.active || m.terms.status === 'withheld') ? 0.5 : 1;
  }
  revenue.countyBase = function (s,rid,c) { return countyBase(s,rid,c) * revenueFactor(s,rid,c.provinceId); };
  revenue.settlementBase = function (s,rid,c) { return settlementBase(s,rid,c) * revenueFactor(s,rid,c.provinceId); };
  G.register('revenue','provincial_receipts',revenue);
  G.register('consent','provincial_assent',{
    local:function (s,rid,c) {
      var rows = A.constituency(s,rid).filter(function (m) { return m.scope.id === c.provinceId; });
      return !rows.length && !(government(s,rid) && government(s,rid).publicVacancy);
    },
    decision:function (s,rid,c) {
      var p = A.profile(s,rid), data = A.state(s,rid), scope = c.scope || {};
      if (!p || !data) return {allowed:false,reason:'missing_constituency',required:[],approvals:{}};
      var rows = A.constituency(s,rid).filter(function (m) { return !scope.provinceId || m.scope.id === scope.provinceId; }), approvals = {};
      rows.forEach(function (m) { approvals[m.id] = m.active && m.terms.status === 'assent'; });
      var reserved = ['extraordinary_tax','grant'].indexOf(c.operation) >= 0;
      var vacancy = government(s,rid).publicVacancy;
      var regency = data.regency, steward = regency && s.chars[regency.stewardId];
      var capable = !regency || live(s,steward) && A.constituency(s,rid).some(function (m) {
        return m.active && m.principal.id === steward.id;
      });
      var valid = court(s,rid,c.actor) && !vacancy && capable;
      if (['levy','war','treaty','grant','extraordinary_tax'].indexOf(c.operation) < 0)
        return G.strategy('consent','delegated').decision(s,rid,c);
      var allowed = valid && (!reserved || rows.every(function (m) { return approvals[m.id]; }));
      return {allowed:!!allowed,reason:allowed ? null : 'provincial_assent_required',
        required:reserved ? rows.map(function (m) { return m.id; }) : [],approvals:approvals};
    },
    constituency:function (s,rid,c) { return {kind:'hereditary_interests',realmId:rid,operation:c.operation,members:c.decision.required.slice()}; }
  });
  G.register('council','magnate_council',{
    seats:function (s,rid) { return A.constituency(s,rid).map(function (m) { return {id:m.id,holder:m.principal,scope:m.scope,weight:m.weight}; }); },
    eligible:function (s,rid,c) { return A.constituency(s,rid).some(function (m) { return m.active && m.principal.id === c.candidateId; }); },
    vacancy:function () { return null; }
  });
  G.register('ai','aristocratic_court',Object.assign({},G.strategy('ai','public_administration'),{offices:A.ai}));
  G.register('ladder','aristocratic_careers',FBDATA.stationLadders.aristocratic_careers);
  var rekey = FB.publicAdministrationRekey;
  FB.publicAdministrationRekey = function (s,from,to) {
    var data = A.state(s,from);
    if (!rekey(s,from,to)) return false;
    if (data) data.interests.forEach(function (m) { jurisdiction(s,m).forEach(function (r) { if (r.issuer.id === from) r.issuer.id = to; }); });
    return true;
  };
  function moveRoyalTree(s,from,to,t,incumbent) {
    var data = A.state(s,to);
    if (!data || !t || !t.members) return;
    if (data.royalRealmId === from) data.royalRealmId = to;
    s.realms[to].succession = t;
    if (from !== to && s.realms[from]) delete s.realms[from].succession;
    Object.keys(s.chars).forEach(function (id) {
      var c = s.chars[id];
      if (c.royalLine && c.royalLine.realmId === from) c.royalLine.realmId = to;
    });
    var member = Object.keys(t.members).filter(function (id) { return t.members[id].charId === incumbent.id; })[0];
    if (!member) {
      member = 'royal_' + to + '_incumbent_' + incumbent.id;
      t.members[member] = {id:member,name:incumbent.name,sex:incumbent.sex,born:incumbent.born,
        alive:!incumbent.dead,charId:incumbent.id,parentId:null,childIds:[],role:null};
      // Membership as incumbent carries no connection to the declared roots.
      // A foreign incumbent retains its birth court without gaining ancestry.
      if (incumbent.royalLine) {
        t.members[member].role = 'incumbent';
        t.members[member].incumbentRef = copy(incumbent.royalLine);
      }
      else incumbent.royalLine = {realmId:to,memberId:member};
    }
    t.rulerMemberId = member;
    t.rulerGeneration = FB.realmRulerGeneration(s,to);
    t.order = t.order.filter(function (id) { return id !== member; });
    if (t.dynasticOrder) t.dynasticOrder = t.dynasticOrder.filter(function (id) { return id !== member; });
    t.heirId = t.order[0] || null;
    delete t.designatedHeirId;
    delete t.openingPreferredId;
      if (to === 'player') { t.playerDynasty = true; t.heirCharId = null; }
    else { delete t.playerDynasty; delete t.heirCharId; }
    var row = government(s,to);
    if (row.lastAccession) row.lastAccession.memberId = to === 'player' ? incumbent.id : member;
    FB.rebuildRulerIndex(s); G.invalidate();
    FB.refreshRealmSuccession(s,to);
  }
  var absorb = FB.absorbRealm;
  FB.absorbRealm = function (s,rid,c) {
    var data = A.state(s,rid), t = data && tree(s,rid);
    var result = absorb(s,rid,c);
    if (result && data) moveRoyalTree(s,rid,'player',t,c || s.chars[s.player.charId]);
    return result;
  };
  var abdicate = FB.abdicatePlayerRealmToHeir;
  FB.abdicatePlayerRealmToHeir = function (s,heir,opts) {
    var data = A.state(s,'player'), t = data && tree(s,'player');
    var quote = data && R.accessionQuote(s,'player',opts && opts.cause || 'abdication');
    var result = abdicate(s,heir,opts);
    if (result && data) {
      moveRoyalTree(s,'player',result.id,t,heir);
      if (!(opts && opts.publicVacancy)) {
        var next = Object.assign({},quote,{memberId:t.rulerMemberId});
        policy.resolved(s,result.id,next);
      }
    }
    return result;
  };
  var householdSuccession = FB.publicPlayerHouseholdSuccession;
  FB.publicPlayerHouseholdSuccession = function (s,heir,cause) {
    var data = A.state(s,'player');
    if (!data) return householdSuccession(s,heir,cause);
    if (!A.profile(s,'player')) {
      moveRoyalTree(s,'player','player',tree(s,'player'),heir);
      return householdSuccession(s,heir,cause);
    }
    var q = R.accessionQuote(s,'player',cause), t = tree(s,'player');
    if (q.allowed && q.memberId === heir.id) {
      var id = Object.keys(t.members).filter(function (id) { return t.members[id].charId === heir.id; })[0];
      if (!id) return false;
      var row = government(s,'player');
      row.recognition = {}; delete row.publicVacancy; delete t.designatedHeirId;
      row.lastAccession = {generation:q.rulerGeneration,memberId:heir.id,cause:cause,turn:s.turn,minor:q.minor};
      t.rulerMemberId = id; t.rulerGeneration = q.rulerGeneration + 1;
      s.realms.player.ruler.generation = t.rulerGeneration;
      policy.resolved(s,'player',q);
      return;
    }
    return householdSuccession(s,heir,cause);
  };
  var renameHouse = FB.renameHouse;
  FB.renameHouse = function (s,name) {
    var result = renameHouse(s,name);
    if (result.ok && result.old) Object.keys(s.authority && s.authority.governments || {}).forEach(function (rid) {
      var data = A.state(s,rid);
      if (data) data.interests.forEach(function (m) {
        if (m.dynasty !== result.old) return;
        m.dynasty = result.name;
        (s.bookmarkSetup && s.bookmarkSetup.estates || []).forEach(function (e) {
          if (e.provinceId === m.scope.id && e.dynasty === result.old) e.dynasty = result.name;
        });
      });
    });
    return result;
  };
  var retained = FB.publicAdministrationReferencesCharacter;
  FB.publicAdministrationReferencesCharacter = function (s,cid) {
    var c = s.chars[cid];
    return retained(s,cid) || Object.keys(s.authority && s.authority.governments || {}).some(function (rid) {
      var data = A.state(s,rid);
      return !!data && (data.interests.some(function (m) { return c && !c.dead && c.dyn === m.dynasty ||
        assignment(s,m) && assignment(s,m).holder.id === cid; }) || c && !c.dead && royalCharacter(s,rid,c,{}));
    });
  };
  A.estateDynastyValid = function (s,def,estate) {
    return Object.keys(s.authority && s.authority.governments || {}).some(function (rid) {
      var data = A.state(s,rid), p = data && FBDATA.aristocraticProfiles[data.profileId];
      return !!p && data.interests.some(function (m) {
        return m.scope.id === estate.provinceId && m.dynasty === estate.dynasty && p.interests.some(function (r) {
          return r.id === m.id && r.actorId === def.actorId;
        });
      });
    });
  };
  A.validateProfiles = function () {
    var errors = [];
    Object.keys(FBDATA.aristocraticProfiles || {}).forEach(function (id) {
      var p = FBDATA.aristocraticProfiles[id], administration = p && FBDATA.administrationProfiles[p.administrationProfileId];
      if (!plain(p) || typeof p.name !== 'string' || !own(FBDATA.administrationProfiles,p.administrationProfileId) ||
          !administration || !administration.accession || administration.accession.mode !== 'recognition' || administration.accession.officeCandidates ||
          administration.accession.minimumAge !== p.minimumAge || administration.accession.allowMinor !== p.allowMinor ||
          administration.accession.threshold !== p.threshold ||
          !Number.isInteger(p.minimumAge) || p.minimumAge < 16 || p.minimumAge > 30 || typeof p.allowMinor !== 'boolean' ||
          !rate(p.threshold) || p.threshold < 0.5 || p.threshold >= 1 || !Number.isFinite(p.negotiationCost) || p.negotiationCost < 0 ||
          !rate(p.minimumRevenue) || p.minimumRevenue < 0.5 || !rate(p.minimumLevy) || !keys(p.defaultTerms,['levy','revenue']) ||
          !rate(p.defaultTerms.levy) || !rate(p.defaultTerms.revenue) || p.defaultTerms.revenue >= 1 || p.defaultTerms.revenue < p.minimumRevenue ||
          p.defaultTerms.levy < p.minimumLevy || !Number.isFinite(p.refusalSupport) || !Number.isFinite(p.enforcementSupportCost) ||
          p.enforcementSupportCost < 0 || p.openingGovernor !== undefined &&
            (!keys(p.openingGovernor,['actorId','provinceId']) || Object.keys(p.openingGovernor).length !== 2 ||
              typeof p.openingGovernor.actorId !== 'string' || !p.openingGovernor.actorId ||
              typeof p.openingGovernor.provinceId !== 'string' || !p.openingGovernor.provinceId) ||
          !Array.isArray(p.interests) || !p.interests.length || p.interests.length > 16 ||
          p.interests.some(function (m,i) { var office = m && FBDATA.authorityOffices[m.officeId]; return !m ||
            typeof m.id !== 'string' || m.id === 'court' || !/^[a-z][a-z0-9_]*$/.test(m.id) ||
            p.interests.slice(0,i).some(function (prior) { return prior.id === m.id || prior.provinceId === m.provinceId; }) ||
            typeof m.name !== 'string' || typeof m.dynasty !== 'string' || !m.dynasty || typeof m.actorId !== 'string' ||
            typeof m.provinceId !== 'string' || !office || office.publicRole !== 'fiscal' || office.scopes.indexOf('county') < 0 ||
            !Number.isFinite(m.weight) || m.weight <= 0 || m.weight > 10 || !Number.isFinite(m.minimumMartial) || m.minimumMartial < 0 ||
            !rate(m.maximumRevenue) || m.maximumRevenue >= 1 || m.maximumRevenue < p.minimumRevenue ||
            p.defaultTerms.revenue > m.maximumRevenue || !rate(m.maximumLevy) || m.maximumLevy < p.minimumLevy || p.defaultTerms.levy > m.maximumLevy;
          })) errors.push(FB.T('Invalid aristocratic court profile {id}.',{id:id}));
    });
    return errors;
  };
  A.openingFaults = function (bm) {
    var errors = [], opening = bm && bm.opening, actors = opening && opening.actors;
    (bm && bm.realms || []).forEach(function (realm) {
      var era = FBDATA.eras[FB.bookmarkEra(bm)];
      var form = FBDATA.governmentForms[realm.government || era && era.defaultGovernment];
      if (!form || !form.aristocraticProfileId) return;
      var p = FBDATA.aristocraticProfiles[realm.aristocraticProfileId || form.aristocraticProfileId];
      var required = p && p.interests || [];
      if (!p || !realm.royalCourt || !actors ||
          realm.administrationProfileId && realm.administrationProfileId !== p.administrationProfileId ||
          required.some(function (m) {
            var c = actors && actors[m.actorId], county = (bm.provinces || []).filter(function (v) { return v.id === m.provinceId; })[0];
            return !c || c.ref || c.dyn !== m.dynasty || !county || county.realm !== realm.id ||
              !Number.isInteger(c.born) || bm.date.year - c.born < p.minimumAge;
          }) || p.openingGovernor && (!actors[p.openingGovernor.actorId] || !(bm.provinces || []).some(function (v) {
            return v.id === p.openingGovernor.provinceId && v.realm === realm.id;
          }))) errors.push(FB.T('Court {id} requires a declared royal tree and existing adult provincial households within its opening jurisdiction.',{id:realm.id}));
    });
    return errors;
  };
  var validateBookmark = FB.validateBookmark;
  FB.validateBookmark = function (bm) { return validateBookmark(bm).concat(A.openingFaults(bm)); };
  A.validateState = function (s) {
    var fault = null, referenced = {};
    Object.keys(s.authority && s.authority.governments || {}).forEach(function (rid) {
      var row = government(s,rid), data = row && row.aristocracy;
      var form = row && FBDATA.governmentForms[row.formId];
      if (data === undefined) {
        if (form && form.aristocraticProfileId) fault = 'authority.governments.' + rid + '.aristocracy';
        return;
      }
      var path = 'authority.governments.' + rid + '.aristocracy', p = data && FBDATA.aristocraticProfiles[data.profileId];
      var source = data && tree(s,data.royalRealmId);
      if (!keys(data,['schema','profileId','originRealmId','royalRealmId','royalRoots','interests','regency','lastPeriod']) || data.schema !== 1 ||
          typeof data.originRealmId !== 'string' || !own(s.realms,data.originRealmId) && !(FB.bookmark(s.start.id).realms || []).some(function (r) { return r.id === data.originRealmId; }) ||
          !p || form && form.aristocraticProfileId && row.administrationProfileId !== p.administrationProfileId ||
          data.royalRealmId !== rid || !source || !source.members || !Array.isArray(data.royalRoots) || data.royalRoots.length !== 1 ||
          data.royalRoots[0] !== source.founderId ||
          data.royalRoots.some(function (id,i) { return !own(source.members,id) || data.royalRoots.indexOf(id) !== i; }) ||
          !Array.isArray(data.interests) || data.interests.length !== p.interests.length || data.interests.length > 16 ||
          data.lastPeriod !== undefined && (!Number.isInteger(data.lastPeriod) || data.lastPeriod < 0 || data.lastPeriod > Math.floor(s.turn / 90))) {
        fault = path; return;
      }
      data.interests.forEach(function (m,i) {
        var def = p.interests[i], office = m && assignment(s,m), legal = m && jurisdiction(s,m);
        if (!keys(m,['id','dynasty','scope','appointmentId','rightIds']) || m.id !== def.id || typeof m.dynasty !== 'string' || !m.dynasty ||
            !keys(m.scope,['kind','id']) || m.scope.kind !== 'county' || m.scope.id !== def.provinceId || !own(s.owner,m.scope.id) ||
            !office || office.institutionId !== rid || office.officeId !== def.officeId || office.endTurn !== null || !same(office.scope,m.scope) ||
            office.holder.kind !== 'character' || !s.chars[office.holder.id] || s.chars[office.holder.id].dyn !== m.dynasty ||
            referenced[m.appointmentId] || !Array.isArray(m.rightIds) || m.rightIds.length !== 2 || m.rightIds[0] === m.rightIds[1] ||
            legal.length !== 2 || legal.some(function (r) { return referenced[r.id] || r.issuer.id !== rid ||
              !same(r.scope,m.scope) || !same(r.beneficiary,office.holder) || ['peace','consent'].indexOf(r.power) < 0; }) ||
            legal[0].power === legal[1].power || !office.publicTerms) { fault = path + '.interests'; return; }
        referenced[m.appointmentId] = true;
        m.rightIds.forEach(function (id) { referenced[id] = true; });
        var t = office.provincialTerms;
        if (!keys(t,['schema','interestId','levy','status','changedTurn']) || Object.keys(t).length !== 5 || t.schema !== 1 ||
            t.interestId !== m.id || !rate(t.levy) || t.levy < p.minimumLevy ||
            t.levy > def.maximumLevy || 1 - office.publicTerms.share > def.maximumRevenue ||
            ['assent','withheld'].indexOf(t.status) < 0 || !Number.isInteger(t.changedTurn) || t.changedTurn < 0 || t.changedTurn > s.turn ||
            office.publicTerms.share > 1 - p.minimumRevenue + 0.000001) fault = path + '.provincialTerms';
      });
      Object.keys(row.recognition || {}).forEach(function (id) {
        var vote = row.recognition[id], m = data.interests.filter(function (entry) { return entry.id === id; })[0];
        var principal = id === 'court' ? {kind:'realm',id:rid} : m && assignment(s,m) && assignment(s,m).holder;
        var limits = p.interests.filter(function (entry) { return entry.id === id; })[0];
        if (id !== 'court' && !data.interests.some(function (m) { return m.id === id; }) ||
            !vote || !same(vote.principal,principal) || !own(vote,'terms') || vote.generation > FB.realmRulerGeneration(s,rid) ||
            vote.candidateId !== null && !(rid === 'player' ? royalCharacter(s,rid,s.chars[vote.candidateId],{}) :
              descendant(source.members[vote.candidateId],source.members,data.royalRoots,{})) ||
            (vote.candidateId === null ? vote.terms !== null :
              !keys(vote.terms,['revenue','levy']) || Object.keys(vote.terms).length !== 2 || !rate(vote.terms.revenue) ||
              !rate(vote.terms.levy) || vote.terms.revenue < p.minimumRevenue || vote.terms.levy < p.minimumLevy ||
              limits && (vote.terms.revenue > limits.maximumRevenue || vote.terms.levy > limits.maximumLevy))) fault = path + '.recognition';
      });
      if (data.regency !== null && (!keys(data.regency,['generation','stewardId','sinceTurn']) || Object.keys(data.regency).length !== 3 ||
          !Number.isInteger(data.regency.generation) || data.regency.generation < 1 ||
          data.regency.generation > FB.realmRulerGeneration(s,rid) || !own(s.chars,data.regency.stewardId) ||
          !data.interests.some(function (m) { return m.dynasty === s.chars[data.regency.stewardId].dyn; }) ||
          s.date.year - s.chars[data.regency.stewardId].born < p.minimumAge ||
          !Number.isInteger(data.regency.sinceTurn) || data.regency.sinceTurn < 0 || data.regency.sinceTurn > s.turn)) fault = path + '.regency';
    });
    appointments(s).forEach(function (row) { if (row.provincialTerms !== undefined && !referenced[row.id]) fault = 'authority.appointments.provincialTerms'; });
    return fault;
  };
})();
