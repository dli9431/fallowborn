/* Optional memberships share local institutions, canonical offices and authority. */
(function () {
  'use strict';
  var MAX_MEMBERS = 64, MAX_AFFILIATIONS = 8, MAX_DECISIONS = 16;
  var ACTIONS = ['admit','affiliate','appoint','recognize','dispute','withdraw','mediate','vacate','assent'];
  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function plain(o) { return !!o && Object.prototype.toString.call(o) === '[object Object]'; }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  function id(v) { return typeof v === 'string' && v.length <= 80 && /^[a-z][a-z0-9_]*$/.test(v); }
  function keys(o, allowed) { return plain(o) && Object.keys(o).every(function (k) { return allowed.indexOf(k) >= 0; }); }
  function ids(a, max, check) {
    return Array.isArray(a) && a.length <= max && a.every(function (v, i) {
      return typeof v === 'string' && a.indexOf(v) === i && check(v);
    });
  }
  function period(d, year) { return d.yearMin <= year && (d.yearMax === null || year <= d.yearMax); }
  function periodValid(d) {
    return keys(d, ['yearMin','yearMax']) && Number.isInteger(d.yearMin) &&
      (d.yearMax === null || Number.isInteger(d.yearMax) && d.yearMax >= d.yearMin);
  }
  function catalogs() { return { affiliations:FBDATA.religiousAffiliations || {}, profiles:FBDATA.religiousInstitutionProfiles || {} }; }
  function at(s, institutionId) {
    var d = FB.localInstitutionDefinitions(s)[institutionId], r = s.localInstitutions && s.localInstitutions[institutionId];
    var p = d && catalogs().profiles[d.profileId];
    return d && p && r ? { def:d, profile:p, row:r } : null;
  }
  function character(s, cid) { var c = s.chars && s.chars[cid]; return c && !c.dead ? c : null; }
  function home(s, c) { return FB.characterResidence(s, c); }
  function free(s, c) {
    return !!(c && !c.captive && !c.exiled &&
      !(c.id === s.player.charId && s.player.flags && s.player.flags.in_prison) &&
      !(FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(s, c.id)) &&
      !(FB.justiceCustodyOf && FB.justiceCustodyOf(s, c.id)) &&
      !(s.justice && s.justice.exiles && s.justice.exiles[c.id] && s.justice.exiles[c.id].endTurn > s.turn));
  }
  function patron(s, a) {
    return a.def.provinceId ? FB.settlementCountyHolder(s, a.def.provinceId) : a.def.patronRealmId || null;
  }
  function control(s, a) {
    var rid = patron(s, a), pid = a.def.provinceId;
    return JSON.stringify([rid, rid && FB.realmRulerGeneration(s, rid), pid && s.owner[pid],
      a.def.officeId && s.religiousHeadVacancies && s.religiousHeadVacancies[a.def.officeId] || null]);
  }
  function available(s, a) {
    if (a.row.status !== 'active' || !period(a.profile.period, s.date.year) || !FB.faithAssignable(a.def.religion, s) ||
        a.profile.system && !FB.systemEnabled(s, a.profile.system, { faith:a.def.religion, realm:null })) return false;
    if (!a.def.provinceId) return true;
    var sites = FB.world.sitesByProv && FB.world.sitesByProv[a.def.provinceId], rid = patron(s, a);
    return !!(sites && sites.list.some(function (v) { return v.site === a.def.site; }) && rid &&
      s.realms[rid] && s.realms[rid].alive && s.owner[a.def.provinceId] === FB.topRealm(s, rid));
  }
  function member(a, cid) { var m = a.row.members && a.row.members[cid]; return m && m.status === 'active' ? m : null; }
  function affiliation(s, cid, aid, institutionId) {
    return (s.chars[cid].religiousAffiliations || []).some(function (v) {
      return v.id === aid && (institutionId === undefined || v.institutionId === institutionId);
    });
  }
  function qualified(s, a, cid, roleId) {
    var c = character(s, cid), role = a.profile.roles[roleId];
    return !!(role && free(s, c) && c.religion === a.def.religion &&
      (!a.def.provinceId || home(s, c) === a.def.provinceId) &&
      FB.ageOf(c, s.date.year) >= role.minAge && (!role.sexes.length || role.sexes.indexOf(c.sex) >= 0) &&
      (!role.unmarried || (FB.spousesSnapshot ? !FB.spousesSnapshot(s, c).length : !c.spouseId || !character(s, c.spouseId))) && (!role.professions.length ||
        role.professions.indexOf(c.role) >= 0 || c.career && role.professions.indexOf(c.career.profession) >= 0) &&
      Object.keys(role.skills).every(function (skill) { return (c.skills && c.skills[skill] || 0) >= role.skills[skill]; }) &&
      (!role.affiliationId || affiliation(s, cid, role.affiliationId)));
  }
  function constituency(s, a, cid, roles) {
    var m = member(a, cid);
    return !!(m && roles.indexOf(m.roleId) >= 0 && qualified(s, a, cid, m.roleId));
  }
  function leader(s, a) {
    if (!available(s, a)) return null;
    var cid = a.def.officeId ? s.religiousHeads && s.religiousHeads[a.def.officeId] : null;
    var selection = a.profile.selection, m = cid && member(a, cid);
    return cid && selection && m && m.roleId === selection.roleId && qualified(s, a, cid, m.roleId) ? cid : null;
  }
  function decisionKey(decision, target) { return decision + ':' + target.kind + ':' + target.id; }
  function assents(s, a, decision, target, roles) {
    var votes = a.row.assents && a.row.assents[decisionKey(decision, target)] || {};
    return Object.keys(votes).sort().filter(function (cid) {
      return votes[cid].control === control(s, a) && constituency(s, a, cid, roles);
    });
  }
  function property(s, a) {
    if (!a.def.abbeyId) return null;
    return (s.abbeys && s.abbeys.houses || []).filter(function (h) { return h.id === a.def.abbeyId; })[0] || null;
  }
  function subjectValid(s, subject) {
    return keys(subject, ['kind','id']) && typeof subject.id === 'string' && !!subject.id &&
      ['character','realm'].indexOf(subject.kind) >= 0 && !!FB.political.actor(s, subject);
  }
  function recognizeScope(a, provinceId) {
    return a.def.jurisdictionIds.indexOf(provinceId) >= 0 ? { kind:'county', id:provinceId } : null;
  }
  function recognitionRows(s, institutionId) {
    return (s.authority && s.authority.recognitions || []).filter(function (r) {
      return r.issuer.kind === 'religious-institution' && r.issuer.id === institutionId;
    });
  }
  function recognitionGeneration(s, a) {
    var roles = a.profile.recognition.roles;
    var voters = Object.keys(a.row.members || {}).sort().filter(function (cid) { return constituency(s, a, cid, roles); });
    return JSON.stringify([control(s, a), leader(s, a), voters, a.def, a.profile]);
  }
  FB.religiousInstitutionIssuerValid = function (s, institutionId, source) {
    var a = at(s, institutionId), def = FBDATA.legitimacySources[source];
    return !!(a && available(s, a) && def && def.institutional === true &&
      (a.profile.actions.indexOf('recognize') >= 0 || a.profile.actions.indexOf('mediate') >= 0) &&
      a.profile.recognition.sources.indexOf(source) >= 0 &&
      Object.keys(a.row.members || {}).some(function (cid) { return constituency(s, a, cid, a.profile.recognition.roles); }) &&
      (!a.profile.recognition.requiresLeader || leader(s, a)));
  };
  FB.religiousInstitutionIssuerGeneration = function (s, institutionId) {
    var a = at(s, institutionId); return a ? recognitionGeneration(s, a) : null;
  };
  FB.religiousInstitutionRecognitionValid = function (s, recognition) {
    var a = at(s, recognition.issuer.id), place = recognition.scope;
    return !!(a && place && place.kind === 'county' && a.def.jurisdictionIds.indexOf(place.id) >= 0 &&
      (!a.profile.recognition.protectedWorship || FB.political.worshipProtected(s, place.id)));
  };
  FB.religiousInstitutionEnabled = function (s, def) {
    var p = def && catalogs().profiles[def.profileId];
    return !!(p && period(p.period, s.date.year) && FB.faithAssignable(def.religion, s) &&
      (!p.system || FB.systemEnabled(s, p.system, { faith:def.religion, realm:null })));
  };
  FB.religiousInstitutionOffice = function (s, institutionId, def) {
    var p = catalogs().profiles[def.profileId];
    return p && p.selection && FB.religiousInstitutionEnabled(s, def) ? {
      id:def.officeId, religionId:def.religion, institutionId:institutionId,
      head:{ holderKind:'character', holderSex:null, holderRole:null,
        minAge:p.roles[p.selection.roleId].minAge, succession:p.selection.strategy, local:true }
    } : null;
  };
  FB.religiousInstitutionOfficeEligible = function (s, institutionId, cid) {
    var a = at(s, institutionId), m = a && member(a, cid);
    return !!(a && available(s, a) && a.profile.selection && m && m.roleId === a.profile.selection.roleId && qualified(s, a, cid, m.roleId));
  };
  FB.religiousInstitutionOpeningRow = function (institutionId, def) {
    return { id:institutionId, site:def.site, status:'active', representativeId:null, standing:{}, demands:[],
      consentRights:[], petitions:{}, history:[], rightIds:[], members:{}, assents:{} };
  };
  FB.religiousInstitutionSnapshot = function (s, institutionId) {
    var a = at(s, institutionId); if (!a) return null;
    return { id:institutionId, definition:copy(a.def), profile:copy(a.profile), available:available(s, a),
      members:copy(a.row.members || {}), holderId:leader(s, a), vacant:!!a.def.officeId && !leader(s, a),
      recognitions:copy(recognitionRows(s, institutionId)), property:copy(property(s, a)) };
  };
  FB.religiousInstitutionRoleEligibility = function (s, institutionId, cid, roleId) {
    var a = at(s, institutionId); return !!(a && available(s, a) && qualified(s, a, cid, roleId));
  };

  /* Membership is optional. These projections never admit or repair a person. */
  function characterRoles(s, c, effective) {
    if (!c) return [];
    return Object.keys(s.localInstitutions || {}).sort().reduce(function (out, iid) {
      var a = at(s, iid), m = a && member(a, c.id), r = m && a.profile.roles[m.roleId];
      if (r && (!effective || available(s, a) && qualified(s, a, c.id, m.roleId)))
        out.push({ institutionId:iid, profileId:a.def.profileId, roleId:m.roleId, role:r });
      return out;
    }, []);
  }
  FB.religiousInstitutionCharacterPaths = function (s, c) {
    var out = [];
    characterRoles(s, c, true).forEach(function (r) {
      if (r.role.pathId && out.indexOf(r.role.pathId) < 0) out.push(r.role.pathId);
    });
    return out;
  };
  FB.religiousCareerReview = function (s, c, profession, fresh) {
    var grants = characterRoles(s, c, true).filter(function (r) {
      return (r.role.careerIds || []).indexOf(profession) >= 0;
    });
    var religious = FB.professionHasRole(profession, ['cloister','clergy']);
    var faith = c && FB.religionOf(c.religion, s);
    var retained = !fresh && c && (s.player && c.id === s.player.charId ? s.player.profession :
      c.career ? c.career.profession : c.role) === profession;
    return { allowed:!!c && (!!grants.length || !religious || !faith || faith.religiousPaths !== null || retained),
      explicit:!!grants.length, roles:grants.map(function (r) {
        return { institutionId:r.institutionId, roleId:r.roleId };
      }) };
  };
  FB.religiousHouseholdRule = function (s, c, profession) {
    var roles = characterRoles(s, c, false);
    return { unmarried:roles.some(function (r) { return r.role.unmarried; }),
      explicit:roles.some(function (r) { return (r.role.careerIds || []).concat(r.role.professions).indexOf(profession) >= 0; }) };
  };
  /* Active membership in an unmarried role is a promise that blocks every
     marriage path. Released vows keep their own courtship-only gate. */
  FB.religiousMembershipUnmarried = function (s, c) {
    return !!c && FB.religiousHouseholdRule(s, c, null).unmarried;
  };
  FB.religiousCelibate = function (s, c) {
    if (!c) return false;
    var profession = c.id === s.player.charId ? s.player.profession : c.career && c.career.profession || c.role;
    var rule = FB.religiousHouseholdRule(s, c, profession);
    if (rule.unmarried) return true;
    if (rule.explicit) return false;
    return FB.professionHasRole(profession, ['cloister','clergy']) && !FB.religionOf(c.religion, s).clergyMarriage;
  };
  FB.religiousInstitutionCareerSource = function (s, c, profession) {
    var roles = characterRoles(s, c, true), result = null;
    roles.some(function (r) {
      if ((r.role.careerIds || []).concat(r.role.professions).indexOf(profession) < 0) return false;
      result = { profileId:r.profileId, roleId:r.roleId, word:r.role.name };
      return true;
    });
    return result;
  };
  FB.religiousInstitutionCareerTitle = function (s, c, profession) {
    var r = FB.religiousInstitutionCareerSource(s, c, profession);
    return r ? FB.dataText(s, c.id, 'religiousInstitutionProfile', r.profileId,
      catalogs().profiles[r.profileId], 'roles.' + r.roleId + '.name', {}) : '';
  };
  FB.playerReligiousInstitutions = function (s, cid) {
    if (!Object.keys(catalogs().profiles).length) return [];
    if (!cid) {
      var union = [];
      Object.keys(s.chars).forEach(function (id) {
        var c = s.chars[id];
        if (c.dead || FB.isExternalHouseholdAuthority && FB.isExternalHouseholdAuthority(s, c) ||
            id !== s.player.charId && !(FB.isHouseholdCharacter && FB.isHouseholdCharacter(s, id)) &&
            !(FB.manageableKinKind && FB.manageableKinKind(s, id))) return;
        FB.playerReligiousInstitutions(s, id).forEach(function (iid) { if (union.indexOf(iid) < 0) union.push(iid); });
      });
      return union.sort();
    }
    var c = s.chars[cid || s.player.charId];
    if (!c) return [];
    return Object.keys(s.localInstitutions || {}).sort().filter(function (iid) {
      var a = at(s, iid);
      return !!(a && (member(a, c.id) || a.def.religion === c.religion &&
        (!a.def.provinceId || a.def.provinceId === home(s, c)) || patron(s, a) === 'player'));
    });
  };

  /* Explicit AI policy, bounded proposals, and the same atomic transaction. */
  FB.religiousInstitutionAI = function (s) {
    var periodId = Math.floor(s.turn / 90), applied = 0;
    var iids = Object.keys(s.localInstitutions || {}).sort().filter(function (iid) {
      var a = at(s, iid); return !!(a && a.profile.ai && available(s, a));
    });
    if (!iids.length || periodId < 1) return 0;
    var offset = periodId * 16 % iids.length;
    for (var n = 0; n < Math.min(16, iids.length); n++) {
      var iid = iids[(offset + n) % iids.length], a = at(s, iid), policy = a.profile.ai;
      if (a.row.aiPeriod === periodId) continue;
      a.row.aiPeriod = periodId;
      var used = 0, attempts = 0, rid = patron(s, a);
      function act(actor, action, terms) {
        if (used >= policy.maxActions || attempts++ >= 64) return false;
        var q = FB.religiousInstitutionQuote(s, iid, actor, action, terms);
        if (!q || !q.allowed || q.cost && (q.payer === 'player' || !q.payer ||
            FB.treasuryAvailable(s, q.payer) - q.cost < policy.reserve)) return false;
        if (!FB.religiousInstitutionApply(s, q)) return false;
        used++; applied++; a = at(s, iid); return true;
      }
      var people = Object.keys(s.chars).sort().filter(function (cid) {
        var c = character(s, cid);
        return c && c.id !== s.player.charId &&
          !(FB.isHouseholdCharacter && FB.isHouseholdCharacter(s, cid)) &&
          !(FB.manageableKinKind && FB.manageableKinKind(s, cid)) &&
          c.religion === a.def.religion && (!a.def.provinceId || home(s, c) === a.def.provinceId) &&
          (member(a, cid) || policy.roles.some(function (roleId) { return qualified(s, a, cid, roleId); }));
      }).slice(0, 64);
      people.forEach(function (cid) {
        if (used >= policy.maxActions) return;
        var actor = { kind:'character', id:cid }, m = member(a, cid);
        if (!m) policy.roles.some(function (roleId) {
          return qualified(s, a, cid, roleId) && act(actor, 'admit', { roleId:roleId });
        });
        if (member(a, cid)) policy.affiliations.forEach(function (aid) {
          act(actor, 'affiliate', { affiliationId:aid });
        });
      });
      var sel = a.profile.selection, current = a.def.officeId && s.religiousHeads[a.def.officeId];
      if (sel && !current) {
        var candidate = Object.keys(a.row.members).sort().filter(function (cid) {
          return people.indexOf(cid) >= 0 && FB.religiousInstitutionOfficeEligible(s, iid, cid);
        })[0];
        if (candidate) {
          var target = { kind:'character', id:candidate };
          if (sel.quorum) people.forEach(function (cid) {
            if (constituency(s, a, cid, sel.consentRoles))
              act({ kind:'character', id:cid }, 'assent', { decision:'appoint', subject:target });
          });
          var chooser = sel.policy === 'patron' ? rid && rid !== 'player' && { kind:'realm', id:rid } :
            people.filter(function (cid) { return constituency(s, a, cid, sel.consentRoles); })[0];
          if (typeof chooser === 'string') chooser = { kind:'character', id:chooser };
          if (chooser) act(chooser, 'appoint', { candidateId:candidate });
        }
      } else if (sel && current && rid && rid !== 'player' && !FB.religiousInstitutionOfficeEligible(s, iid, current)) {
        act({ kind:'realm', id:rid }, 'vacate', {});
      }
      if (policy.recognize && rid && rid !== 'player') {
        var rec = a.profile.recognition, subject = { kind:'realm', id:rid };
        var issuer = rec.requiresLeader ? leader(s, a) : people.filter(function (cid) {
          return constituency(s, a, cid, rec.roles);
        })[0];
        if (issuer && people.indexOf(issuer) >= 0 && rec.sources.length && a.def.jurisdictionIds.length) {
          if (rec.quorum > 1) people.forEach(function (cid) {
            if (cid !== issuer && constituency(s, a, cid, rec.roles))
              act({ kind:'character', id:cid }, 'assent', { decision:'recognize', subject:subject });
          });
          act({ kind:'character', id:issuer }, 'recognize', {
            subject:subject, provinceId:a.def.jurisdictionIds[0], source:rec.sources[0] });
        }
      }
    }
    return applied;
  };

  /* Validation is detached and rejects unknown fields, references and bounds. */
  FB.religiousInstitutionCatalogFaults = function (data) {
    data = data || FBDATA;
    var errors = [], affs = data.religiousAffiliations, profiles = data.religiousInstitutionProfiles;
    function fault(path) { errors.push(path + ': invalid religious institution declaration.'); }
    function faith(fid) { return own(data.religions, fid); }
    function descends(fid, ancestor) {
      var seen = {};
      while (fid && !seen[fid]) {
        if (fid === ancestor) return true;
        seen[fid] = true;
        var r = data.religions[fid]; fid = r && (r.parent || r.group);
      }
      return false;
    }
    if (!plain(affs) || !plain(profiles)) return ['Religious institution catalogues must be objects keyed by id.'];
    Object.keys(affs).forEach(function (aid) {
      var d = affs[aid], path = 'religiousAffiliations.' + aid;
      if (!id(aid) || !keys(d, ['name','faithIds','period','exclusiveWith']) || typeof d.name !== 'string' || !d.name.trim() || d.name.length > 160 ||
          !ids(d.faithIds, 32, faith) || !d.faithIds.length || !periodValid(d.period) ||
          !ids(d.exclusiveWith, MAX_AFFILIATIONS, function (v) { return v !== aid && own(affs, v); })) fault(path);
    });
    Object.keys(profiles).forEach(function (pid) {
      var p = profiles[pid], path = 'religiousInstitutionProfiles.' + pid;
      if (!id(pid) || !keys(p, ['name','faithIds','period','system','roles','selection','recognition','actions','fees','affiliationIds','ai']) ||
          typeof p.name !== 'string' || !p.name.trim() || p.name.length > 160 || !ids(p.faithIds, 32, faith) || !p.faithIds.length ||
          !periodValid(p.period) || p.system !== null && !own(data.systems, p.system) ||
          !plain(p.roles) || !Object.keys(p.roles).length || Object.keys(p.roles).length > 16 ||
          !ids(p.actions, ACTIONS.length, function (v) { return ACTIONS.indexOf(v) >= 0; }) ||
          !ids(p.affiliationIds, MAX_AFFILIATIONS, function (v) { return own(affs, v); }) ||
          !keys(p.fees, p.actions) || Object.keys(p.fees).some(function (k) { return !Number.isFinite(p.fees[k]) || p.fees[k] < 0; })) {
        fault(path); return;
      }
      Object.keys(p.roles).forEach(function (rid) {
        var r = p.roles[rid];
        if (!id(rid) || !keys(r, ['name','minAge','sexes','unmarried','professions','skills','affiliationId','careerIds','pathId']) ||
            typeof r.name !== 'string' || !r.name.trim() || r.name.length > 80 || !Number.isInteger(r.minAge) || r.minAge < 0 || r.minAge > 80 ||
            !ids(r.sexes, 2, function (v) { return ['m','f'].indexOf(v) >= 0; }) || typeof r.unmarried !== 'boolean' ||
            !ids(r.professions, 16, function (v) { return own(data.careers, v); }) || !plain(r.skills) ||
            Object.keys(r.skills).some(function (k) { return FB.SKILLS.indexOf(k) < 0 || !Number.isFinite(r.skills[k]) || r.skills[k] < 0; }) ||
            r.affiliationId !== null && (!own(affs, r.affiliationId) || p.affiliationIds.indexOf(r.affiliationId) < 0) ||
            r.careerIds !== undefined && !ids(r.careerIds, 16, function (v) { return own(data.careers, v); }) ||
            r.pathId !== undefined && (typeof r.pathId !== 'string' || !own(data.religiousPaths, r.pathId))) {
          fault(path + '.roles.' + rid); return;
        }
        var route = r.pathId && data.religiousPaths && data.religiousPaths[r.pathId];
        if (route && (Array.isArray(route.faiths) && !p.faithIds.every(function (fid) {
          return route.faiths.some(function (ancestor) { return descends(fid, ancestor); });
        }) || Array.isArray(route.professions) && !(r.careerIds || []).concat(r.professions || []).some(function (career) {
          return route.professions.indexOf(career) >= 0;
        }))) fault(path + '.roles.' + rid + '.pathId');
      });
      var ai = p.ai;
      if (ai !== undefined && (!keys(ai, ['roles','affiliations','reserve','maxActions','recognize']) ||
          !ids(ai.roles, 16, function (v) { return own(p.roles, v); }) ||
          !ids(ai.affiliations, MAX_AFFILIATIONS, function (v) { return p.affiliationIds.indexOf(v) >= 0; }) ||
          !Number.isFinite(ai.reserve) || ai.reserve < 0 || !Number.isInteger(ai.maxActions) || ai.maxActions < 1 || ai.maxActions > 8 ||
          typeof ai.recognize !== 'boolean')) fault(path + '.ai');
      var sel = p.selection;
      if (sel !== null && (!keys(sel, ['strategy','policy','roleId','consentRoles','quorum']) || sel.strategy !== 'appointment' ||
          !FB.religiousHeads.strategy(sel.strategy) || ['patron','members'].indexOf(sel.policy) < 0 || !own(p.roles, sel.roleId) ||
          !ids(sel.consentRoles, 16, function (v) { return own(p.roles, v); }) ||
          !Number.isInteger(sel.quorum) || sel.quorum < 0 || sel.quorum > MAX_MEMBERS ||
          sel.policy === 'members' && !sel.quorum || sel.quorum > 0 && !sel.consentRoles.length)) fault(path + '.selection');
      var rec = p.recognition;
      if (!keys(rec, ['sources','roles','quorum','requiresLeader','protectedWorship']) ||
          !ids(rec.sources, 8, function (v) { return own(data.legitimacySources, v) && data.legitimacySources[v].institutional === true && data.legitimacySources[v].succession === 'reaffirm'; }) ||
          !ids(rec.roles, 16, function (v) { return own(p.roles, v); }) || !Number.isInteger(rec.quorum) || rec.quorum < 1 || rec.quorum > MAX_MEMBERS ||
          typeof rec.requiresLeader !== 'boolean' || typeof rec.protectedWorship !== 'boolean' || rec.requiresLeader && !sel) fault(path + '.recognition');
      if (!sel && p.actions.some(function (v) { return ['appoint','vacate'].indexOf(v) >= 0; })) fault(path + '.actions');
      if (p.actions.some(function (v) { return ['recognize','dispute','mediate'].indexOf(v) >= 0; }) &&
          (!rec || !Array.isArray(rec.sources) || !rec.sources.length || !Array.isArray(rec.roles) || !rec.roles.length)) fault(path + '.recognition');
    });
    return errors;
  };
  FB.religiousInstitutionDefinitionFaults = function (idValue, d, definition, data) {
    var errors = [], p = (data.religiousInstitutionProfiles || {})[d.profileId];
    function fault(detail) { errors.push('localInstitutions.' + idValue + ': ' + detail); }
    var provinces = (definition.provinces || []).map(function (v) { return v.id; });
    if (!p) { fault('unknown institution profile.'); return errors; }
    if (!keys(d, ['city','kind','profileId','provinceId','site','religion','culture','officeId','freshOnly','vacant',
        'offMap','patronRealmId','jurisdictionIds','abbeyId']) || typeof d.city !== 'string' || d.city.length > 160 ||
        d.offMap !== undefined && d.offMap !== true) fault('unknown field or invalid scope.');
    if (p.faithIds.indexOf(d.religion) < 0 || !period(p.period, definition.date.year)) fault('profile does not permit this faith or date.');
    if (!ids(d.jurisdictionIds, 16, function (v) { return provinces.indexOf(v) >= 0; })) fault('invalid local jurisdiction.');
    if (d.provinceId !== null && d.jurisdictionIds.indexOf(d.provinceId) < 0) fault('jurisdiction must include the seat.');
    if (d.provinceId === null && (!d.offMap || d.site !== null) || d.provinceId !== null && d.offMap !== undefined) fault('off-map scope must be explicit.');
    if (d.patronRealmId !== undefined && (d.provinceId !== null || !(definition.realms || []).some(function (r) { return r.id === d.patronRealmId; }))) fault('invalid off-map patron.');
    if (d.provinceId === null && p.selection && p.selection.policy === 'patron' && !d.patronRealmId) fault('patron selection needs an explicit off-map patron.');
    if (p.selection ? !id(d.officeId) : d.officeId !== undefined) fault('office must agree with the selection profile.');
    if (d.officeProfile !== undefined || d.chapterId !== undefined || d.historicalName !== undefined || d.representative !== undefined || d.vacant !== true) fault('profile institutions open vacant; no implicit representative or legacy office profile.');
    if (d.abbeyId !== undefined && (typeof d.abbeyId !== 'string' || !d.abbeyId)) fault('invalid abbey property reference.');
    return errors;
  };

  function quoteFacts(s, a, actor, t) {
    var people = {}, memberships = a.row.members || {}, idsToRead = Object.keys(memberships);
    [actor.kind === 'character' && actor.id, t.candidateId, t.subject && t.subject.kind === 'character' && t.subject.id,
      a.def.officeId && s.religiousHeads && s.religiousHeads[a.def.officeId]].forEach(function (cid) { if (cid) idsToRead.push(cid); });
    idsToRead.forEach(function (cid) { if (s.chars[cid]) people[cid] = s.chars[cid]; });
    var rid = patron(s, a), payer = actor.kind === 'realm' ? actor.id : FB.treasuryCharacterRealm(s, actor.id);
    return copy({ turn:s.turn, year:s.date.year, definition:a.def, profile:a.profile, affiliations:catalogs().affiliations,
      faith:FB.religionOf(a.def.religion, s), row:a.row, people:people, control:control(s, a),
      patron:rid && s.realms[rid] || null, actorRealm:actor.kind === 'realm' && s.realms[actor.id] || null,
      subject:subjectValid(s, t.subject) ? FB.political.actor(s, t.subject) : null,
      head:a.def.officeId && s.religiousHeads && s.religiousHeads[a.def.officeId] || null,
      vacancy:a.def.officeId && s.religiousHeadVacancies && s.religiousHeadVacancies[a.def.officeId] || null,
      property:property(s, a), authority:s.authority || null, payer:payer,
      funds:payer ? FB.treasuryAvailable(s, payer) : null, treasuryMode:s.treasuryAccounting && s.treasuryAccounting.mode || null,
      payerAccount:payer && s.realms[payer] && s.realms[payer].treasury || null,
      justice:s.justice || null, captivity:s.intrigue && s.intrigue.captives || null,
      communities:a.def.jurisdictionIds.map(function (pid) { return FB.political.communityGovernance(s, pid); }),
      sources:FBDATA.legitimacySources });
  }
  FB.religiousInstitutionQuote = function (s, institutionId, actor, action, terms) {
    var a = at(s, institutionId); if (!a || !subjectValid(s, actor)) return null;
    var t = plain(terms) ? copy(terms) : {}, c = actor.kind === 'character' && character(s, actor.id);
    var reason = null, required = 0, consenting = [], target = null;
    var current = a.def.officeId && s.religiousHeads && s.religiousHeads[a.def.officeId] || null;
    var m = c && member(a, c.id), sel = a.profile.selection, rec = a.profile.recognition;
    function block(code) { reason = reason || code; }
    if (!subjectValid(s, actor) || a.profile.actions.indexOf(action) < 0) block('rights');
    if (terms !== undefined && !plain(terms)) block('terms');
    if (!available(s, a) && ['withdraw','vacate','dispute'].indexOf(action) < 0) block('unavailable');
    /* Unfunded optional property cannot require land for lay membership.
       Foundation and funded service retain their separate property checks. */
    if (action === 'admit') {
      if (!keys(t, ['roleId']) || !c || !qualified(s, a, c.id, t.roleId)) block('qualification');
      if (m && m.roleId === t.roleId || Object.keys(a.row.members || {}).length >= MAX_MEMBERS && !own(a.row.members, actor.id)) block('membership');
    } else if (action === 'affiliate') {
      var ad = catalogs().affiliations[t.affiliationId], existing = c && c.religiousAffiliations || [];
      if (!keys(t, ['affiliationId']) || !m || !c || !free(s, c) || !ad ||
          a.profile.affiliationIds.indexOf(t.affiliationId) < 0 || ad.faithIds.indexOf(c.religion) < 0 || !period(ad.period, s.date.year)) block('qualification');
      if (existing.length >= MAX_AFFILIATIONS || existing.some(function (v) {
        var other = catalogs().affiliations[v.id];
        return v.id === t.affiliationId || ad && ad.exclusiveWith.indexOf(v.id) >= 0 || other && other.exclusiveWith.indexOf(t.affiliationId) >= 0;
      })) block('affiliation');
    } else if (action === 'withdraw') {
      if (!keys(t, ['affiliationId']) || own(t, 'affiliationId') && (typeof t.affiliationId !== 'string' || !t.affiliationId) || !c || (t.affiliationId ?
          !affiliation(s, actor.id, t.affiliationId, institutionId) : !m)) block('membership');
    } else if (action === 'appoint') {
      target = { kind:'character', id:t.candidateId };
      if (!keys(t, ['candidateId']) || !sel || !a.def.officeId || !FB.religiousInstitutionOfficeEligible(s, institutionId, t.candidateId)) block('qualification');
      if (current) block('occupied_office');
      if (sel) {
        if (sel.policy === 'patron' ? actor.kind !== 'realm' || actor.id !== patron(s, a) : !c || !constituency(s, a, c.id, sel.consentRoles)) block('rights');
        required = sel.quorum; consenting = assents(s, a, 'appoint', target, sel.consentRoles);
        if (consenting.length < required) block('consent');
      }
    } else if (action === 'vacate') {
      if (Object.keys(t).length || !current || !(c && c.id === current || actor.kind === 'realm' &&
          actor.id === patron(s, a) && !FB.religiousInstitutionOfficeEligible(s, institutionId, current))) block('rights');
    } else if (action === 'assent') {
      if (!keys(t, ['decision','subject']) || ['appoint','recognize','dispute'].indexOf(t.decision) < 0 || !subjectValid(s, t.subject) ||
          a.profile.actions.indexOf(t.decision) < 0) block('terms');
      var roles = t.decision === 'appoint' && sel ? sel.consentRoles : rec.roles;
      if (!c || !constituency(s, a, c.id, roles)) block('qualification');
      if (t.decision === 'appoint' && (!subjectValid(s, t.subject) || !sel || t.subject.kind !== 'character' || current || !FB.religiousInstitutionOfficeEligible(s, institutionId, t.subject.id))) block('qualification');
      if (!own(a.row.assents, decisionKey(t.decision, t.subject || {})) && Object.keys(a.row.assents || {}).length >= MAX_DECISIONS) block('consent_bound');
    } else if (['recognize','mediate','dispute'].indexOf(action) >= 0) {
      if (!keys(t, ['subject','provinceId','source','recognitionId']) || !subjectValid(s, t.subject) ||
          rec.sources.indexOf(t.source) < 0 || !recognizeScope(a, t.provinceId)) block('scope');
      if (!c || !constituency(s, a, c.id, rec.roles) || rec.requiresLeader && c.id !== leader(s, a)) block('rights');
      if (action !== 'dispute' && (rec.protectedWorship || action === 'mediate') && !FB.political.worshipProtected(s, t.provinceId)) block('protection');
      target = t.subject;
      if (target && subjectValid(s, target)) {
        consenting = assents(s, a, action === 'dispute' ? 'dispute' : 'recognize', target, rec.roles);
        if (c && constituency(s, a, c.id, rec.roles) && consenting.indexOf(c.id) < 0) consenting.push(c.id);
      }
      required = rec.quorum;
      if (consenting.length < required) block('consent');
      var old = recognitionRows(s, institutionId).filter(function (r) {
        return r.status === 'active' && r.source === t.source && r.scope && r.scope.kind === 'county' && r.scope.id === t.provinceId &&
          t.subject && r.subject.kind === t.subject.kind && r.subject.id === t.subject.id;
      })[0];
      if (action === 'dispute' ? !old || old.id !== t.recognitionId : t.recognitionId !== undefined ||
          old && old.issuerGeneration === recognitionGeneration(s, a) && (old.endTurn === null || old.endTurn > s.turn)) block('recognition');
      if (action !== 'dispute' && !FB.religiousInstitutionIssuerValid(s, institutionId, t.source)) block('rights');
    } else block('unsupported');
    var cost = a.profile.fees[action] || 0, payer = actor.kind === 'realm' ? actor.id : c && FB.treasuryCharacterRealm(s, c.id);
    if (cost && (!payer || FB.treasuryAvailable(s, payer) < cost || payer !== 'player' &&
        (!s.treasuryAccounting || s.treasuryAccounting.mode !== 'active'))) block('funds');
    return { institutionId:institutionId, actor:copy(actor), action:action, terms:t, allowed:!reason, reason:reason,
      cost:cost, payer:payer || null, vacancy:!!a.def.officeId && !leader(s, a),
      consent:{ required:required, characterIds:consenting.sort() },
      consequences:{ membership:action === 'admit' ? t.roleId : action === 'withdraw' && !t.affiliationId ? 'withdrawn' : null,
        officeId:['appoint','vacate'].indexOf(action) >= 0 || action === 'withdraw' && actor.id === current ? a.def.officeId || null : null,
        recognition:['recognize','mediate','dispute'].indexOf(action) >= 0 ? { subject:t.subject, scope:recognizeScope(a, t.provinceId), source:t.source } : null },
      facts:quoteFacts(s, a, actor, t) };
  };
  function vacant(s, a) {
    var oid = a.def.officeId; if (!oid) return;
    s.religiousHeadVacancies = s.religiousHeadVacancies || {};
    s.religiousHeadVacancies[oid] = { turn:s.turn, formerHolder:s.religiousHeads[oid] || null };
    s.religiousHeads[oid] = null; a.row.representativeId = null; a.row.assents = {};
  }
  FB.religiousInstitutionApply = function (s, reviewed) {
    var q = reviewed && FB.religiousInstitutionQuote(s, reviewed.institutionId, reviewed.actor, reviewed.action, reviewed.terms);
    if (!q || !q.allowed || JSON.stringify(q) !== JSON.stringify(reviewed)) return false;
    /* All fallible canonical operations run on a detached state. Only the
       affected ledgers are adopted after payment can succeed. */
    var staged = copy(s), a = at(staged, q.institutionId), t = q.terms, cid = q.actor.id;
    var c = q.actor.kind === 'character' && staged.chars[cid], authorityChanged = false;
    if (q.action === 'admit') {
      a.row.members = a.row.members || {};
      var former = a.row.members[cid];
      a.row.members[cid] = { roleId:t.roleId, status:'active', joinedTurn:former ? former.joinedTurn : staged.turn, changedTurn:staged.turn };
      if (a.def.officeId && staged.religiousHeads && staged.religiousHeads[a.def.officeId] === cid && !FB.religiousInstitutionOfficeEligible(staged, q.institutionId, cid)) vacant(staged, a);
    } else if (q.action === 'affiliate') {
      c.religiousAffiliations = c.religiousAffiliations || [];
      c.religiousAffiliations.push({ id:t.affiliationId, institutionId:q.institutionId });
    } else if (q.action === 'withdraw') {
      if (c.religiousAffiliations) c.religiousAffiliations = c.religiousAffiliations.filter(function (v) {
        return v.institutionId !== q.institutionId || t.affiliationId && v.id !== t.affiliationId;
      });
      if (!t.affiliationId) {
        a.row.members[cid].status = 'withdrawn'; a.row.members[cid].changedTurn = staged.turn;
        Object.keys(a.row.assents || {}).forEach(function (k) {
          delete a.row.assents[k][cid];
          if (!Object.keys(a.row.assents[k]).length) delete a.row.assents[k];
        });
      }
      if (a.def.officeId && staged.religiousHeads && staged.religiousHeads[a.def.officeId] === cid && !FB.religiousInstitutionOfficeEligible(staged, q.institutionId, cid)) vacant(staged, a);
    } else if (q.action === 'appoint') {
      staged.religiousHeads = staged.religiousHeads || {};
      staged.religiousHeads[a.def.officeId] = t.candidateId; a.row.representativeId = t.candidateId;
      if (staged.religiousHeadVacancies) delete staged.religiousHeadVacancies[a.def.officeId];
      a.row.assents = {};
    } else if (q.action === 'vacate') vacant(staged, a);
    else if (q.action === 'assent') {
      a.row.assents = a.row.assents || {};
      var k = decisionKey(t.decision, t.subject);
      a.row.assents[k] = a.row.assents[k] || {};
      a.row.assents[k][cid] = { turn:staged.turn, control:control(staged, a) };
    } else {
      var old = recognitionRows(staged, q.institutionId).filter(function (r) {
        return r.status === 'active' && r.source === t.source && r.subject.kind === t.subject.kind && r.subject.id === t.subject.id &&
          r.scope && r.scope.kind === 'county' && r.scope.id === t.provinceId;
      })[0];
      if (q.action === 'dispute') {
        if (!FB.authorityRecognitionTransition(staged, old.id, 'revoke')) return false;
      } else {
        if (old && !FB.authorityRecognitionTransition(staged, old.id, 'revoke')) return false;
        if (!FB.authorityRecognize(staged, { source:t.source, issuer:{ kind:'religious-institution', id:q.institutionId },
            subject:t.subject, scope:{ kind:'county', id:t.provinceId } })) return false;
      }
      delete a.row.assents[decisionKey('recognize', t.subject)];
      delete a.row.assents[decisionKey('dispute', t.subject)];
      authorityChanged = true;
    }
    if (q.cost && !FB.treasuryTransfer(s, q.payer, null, q.cost)) return false;
    s.localInstitutions[q.institutionId] = a.row;
    if (c && c.religiousAffiliations !== undefined) s.chars[cid].religiousAffiliations = c.religiousAffiliations;
    if (a.def.officeId) {
      s.religiousHeads = s.religiousHeads || {};
      s.religiousHeads[a.def.officeId] = staged.religiousHeads && staged.religiousHeads[a.def.officeId] || null;
      if (staged.religiousHeadVacancies && staged.religiousHeadVacancies[a.def.officeId]) {
        s.religiousHeadVacancies = s.religiousHeadVacancies || {};
        s.religiousHeadVacancies[a.def.officeId] = staged.religiousHeadVacancies[a.def.officeId];
      } else if (s.religiousHeadVacancies) delete s.religiousHeadVacancies[a.def.officeId];
    }
    if (authorityChanged) s.authority = staged.authority;
    return true;
  };

  FB.validateReligiousInstitutionState = function (s) {
    function fail(path) { throw new Error(FB.T('Invalid v4 save field at {path}.', { path:path })); }
    Object.keys(s.chars || {}).forEach(function (cid) {
      var a = s.chars[cid].religiousAffiliations; if (a === undefined) return;
      if (!Array.isArray(a) || a.length > MAX_AFFILIATIONS) fail('state.chars.' + cid + '.religiousAffiliations');
      var seen = {};
      a.forEach(function (v) {
        if (!keys(v, ['id','institutionId']) || !own(catalogs().affiliations, v.id) || own(seen, v.id) ||
            v.institutionId !== null && (!s.localInstitutions || !own(s.localInstitutions, v.institutionId) ||
            !FB.localInstitutionDefinitions(s)[v.institutionId].profileId)) fail('state.chars.' + cid + '.religiousAffiliations');
        seen[v.id] = true;
      });
    });
    Object.keys(s.localInstitutions || {}).forEach(function (institutionId) {
      var a = at(s, institutionId), r = s.localInstitutions[institutionId], path = 'state.localInstitutions.' + institutionId;
      if (!a) { if (r.members !== undefined || r.assents !== undefined) fail(path); return; }
      if (['active','suspended','closed'].indexOf(r.status) < 0 || !plain(r.members) || Object.keys(r.members).length > MAX_MEMBERS ||
          !plain(r.assents) || Object.keys(r.assents).length > MAX_DECISIONS) fail(path);
      if (r.aiPeriod !== undefined && (!Number.isInteger(r.aiPeriod) || r.aiPeriod < 0 || r.aiPeriod > Math.floor(s.turn / 90))) fail(path + '.aiPeriod');
      Object.keys(r.members).forEach(function (cid) {
        var m = r.members[cid];
        if (!own(s.chars, cid) || !keys(m, ['roleId','status','joinedTurn','changedTurn']) || !own(a.profile.roles, m.roleId) ||
            ['active','withdrawn'].indexOf(m.status) < 0 || !Number.isInteger(m.joinedTurn) || m.joinedTurn < 0 ||
            !Number.isInteger(m.changedTurn) || m.changedTurn < m.joinedTurn || m.changedTurn > s.turn) fail(path + '.members');
      });
      Object.keys(r.assents).forEach(function (k) {
        var parts = k.split(':'), votes = r.assents[k];
        if (parts.length !== 3 || ['appoint','recognize','dispute'].indexOf(parts[0]) < 0 ||
            ['character','realm'].indexOf(parts[1]) < 0 || !own(parts[1] === 'character' ? s.chars : s.realms, parts[2]) ||
            !plain(votes) || Object.keys(votes).length > MAX_MEMBERS) fail(path + '.assents');
        Object.keys(votes).forEach(function (cid) {
          var v = votes[cid];
          if (!own(r.members, cid) || !keys(v, ['turn','control']) || !Number.isInteger(v.turn) || v.turn < 0 || v.turn > s.turn ||
              typeof v.control !== 'string' || v.control.length > 2048) fail(path + '.assents');
        });
      });
    });
    (s.authority && s.authority.recognitions || []).forEach(function (r) {
      if (r.issuer.kind !== 'religious-institution') return;
      var a = at(s, r.issuer.id);
      if (!a || a.profile.recognition.sources.indexOf(r.source) < 0 || !r.scope || r.scope.kind !== 'county' ||
          a.def.jurisdictionIds.indexOf(r.scope.id) < 0 || typeof r.issuerGeneration !== 'string' || r.issuerGeneration.length > 32768) fail('authority.recognitions');
    });
    return true;
  };
})();
