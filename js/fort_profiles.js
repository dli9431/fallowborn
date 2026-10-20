/* Material profiles vary eligibility, never strategic fort numbers or ownership. */
(function () {
  'use strict';
  var F = FB.fortProfiles = {}, activeReview = null;
  function own(o,k) { return Object.prototype.hasOwnProperty.call(o || {},k); }
  function object(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function keys(o,list) { return object(o) && Object.keys(o).every(function (k) { return list.indexOf(k) >= 0; }); }
  function id(v) { return typeof v === 'string' && /^[a-z][a-z0-9_]{0,79}$/.test(v) && ['constructor','prototype','__proto__'].indexOf(v) < 0; }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function same(a,b) { return FB.mods.fingerprint(a) === FB.mods.fingerprint(b); }
  F.get = function (profileId,c) { return own((c || FBDATA).fortProfiles,profileId) ? (c || FBDATA).fortProfiles[profileId] : null; };
  F.catalogFaults = function (c) {
    var errors = [], table = c.fortProfiles;
    if (!object(table) || Object.keys(table).length > 256) return ['fortProfiles must be a table of at most 256 profiles.'];
    Object.keys(table).forEach(function (profileId) {
      var p = table[profileId], b = c.buildingProfiles && c.buildingProfiles[profileId];
      function fault(text) { errors.push('fortProfiles.' + profileId + ': ' + text); }
      if (!id(profileId) || !keys(p,['material','levels','techImpactReview']) || !id(p.material) ||
          !b || !Array.isArray(b.requiresTech) || !(c.buildings[b.buildingId] || {}).fort || b.siteResourceProfile ||
          !object(p.levels) || !Object.keys(p.levels).length || Object.keys(p.levels).length > 4) {
        fault('needs a canonical fort buildingProfile, material and supported level requirements; no source binding.'); return;
      }
      var technologies = (b.requiresTech || []).slice();
      Object.keys(p.levels).forEach(function (level) {
        var requirements = p.levels[level];
        if (!/^[1-4]$/.test(level) || !c.forts.levels[level] || !Array.isArray(requirements) || requirements.length > 16 ||
            requirements.some(function (tech,i) { return !id(tech) || !own(c.tech,tech) || requirements.indexOf(tech) !== i; }))
          fault('levels must map canonical 1..4 to unique known technology lists of at most 16 entries.');
        else technologies = technologies.concat(requirements);
      });
      if (technologies.length) {
        var review = c.techImpactReviews && c.techImpactReviews.features && c.techImpactReviews.features[p.techImpactReview];
        if (!id(p.techImpactReview) || !review || review.mode !== 'hard' || !review.fallback || !review.rationale ||
            technologies.some(function (tech) { return (review.tech || []).indexOf(tech) < 0; }))
          fault('optional construction needs an exact hard technology review with ordinary fortification fallback.');
      } else if (p.techImpactReview !== undefined) fault('ungated material identity does not name a technology review.');
    });
    return errors;
  };
  F.requirements = function (profileId,level) {
    var p = F.get(profileId), b = FBDATA.buildingProfiles[profileId];
    return p && own(p.levels,level) ? (b.requiresTech || []).concat(p.levels[level]).filter(function (v,i,a) { return a.indexOf(v) === i; }) : null;
  };
  F.inheritedFault = function (placement) {
    if (!F.get(placement.profileId)) return null;
    return F.requirements(placement.profileId,placement.level) ? null : 'inherited material profile does not support this canonical fort level.';
  };
  F.status = function (s,pid,slot,profileId,level,realm,repair) {
    var requirements = F.requirements(profileId,level);
    if (!requirements) return {ready:false,reason:FB.T('This material profile does not support that fort level.'),missingTech:[]};
    // An inherited or funded identity is retained; repair does not reconstruct knowledge.
    if (repair) {
      var actor = FB.political.actor(s,realm === 'player' ? {kind:'character',id:s.player.charId} : {kind:'realm',id:realm});
      var person = actor && s.chars[actor.characterId];
      var free = person && !person.dead && !person.captive && !person.unfree && !person.imprisoned && !person.prisonerOf &&
        !person.exiled && FB.ageOf(person,s.date.year) >= 16 && !FB.justiceCustodyOf(s,person.id) &&
        (person.id !== s.player.charId || !s.player.flags.in_prison);
      return {ready:!!free,reason:free ? '' : FB.T('The builder must be alive and free to authorize these works.'),missingTech:[],requirements:requirements};
    }
    var scope = FB.buildingProfiles.status(s,pid,slot,FB.fortificationBuildingId(),profileId,realm);
    var missing = requirements.filter(function (tech) { return !FB.hasTech(s,tech,realm); });
    return {ready:scope.ready && !missing.length,reason:!scope.ready ? scope.reason : missing.length ?
      FB.T('Requires {technology}.',{technology:missing.map(function (tech) {
        return FB.dataText(s,s.player.charId,'tech',tech,FBDATA.tech[tech],'name',{});
      }).join(', ')}) : '',missingTech:missing,requirements:requirements};
  };
  function validRequest(r) {
    return keys(r,['countyId','settlement','profileId','targetLevel','realmId','repair']) && id(r.countyId) && id(r.profileId) &&
      Number.isSafeInteger(r.settlement) && r.settlement >= 0 && r.settlement < 8 && Number.isSafeInteger(r.targetLevel) && r.targetLevel >= 1 && r.targetLevel <= 4 &&
      typeof r.realmId === 'string' && r.realmId.length > 0 && typeof r.repair === 'boolean';
  }
  F.quote = function (s,r) {
    var q = {allowed:false,reason:FB.T('This fort project is unavailable here.'),request:object(r) ? copy(r) : null};
    if (!s || !validRequest(r) || !F.get(r.profileId)) return q;
    var status = FB.fortProjectStatus(s,r.countyId,r.settlement,r.targetLevel,{realm:r.realmId,repair:r.repair,profileId:r.profileId});
    var def = FB.fortLevelDef(r.targetLevel), realm = s.realms[r.realmId];
    q.cost = status.cost; q.work = def.work; q.targetLevel = status.targetLevel; q.completeTurn = status.completeTurn;
    q.requirements = F.requirements(r.profileId,r.targetLevel);
    q.funds = r.realmId === 'player' ? FB.treasuryPlayerWorksFunds(s) : realm && Number(realm.fortWorks) || 0;
    q.allowed = status.ok && Number.isFinite(q.funds) && (r.realmId === 'player' || !!realm && realm.alive &&
      q.funds >= q.work && realm.fortProjectYear !== s.date.year);
    q.reason = q.allowed ? '' : status.profileStatus && status.profileStatus.reason ||
      (!status.ok ? FB.T('Current authority, capacity, funding and construction requirements must all be met.') : FB.T('The ruler needs the annual fort work budget.'));
    q.context = {turn:s.turn,date:copy(s.date),owner:s.owner[r.countyId],holder:s.holder && s.holder[r.countyId],
      actor:FB.political.actor(s,r.realmId === 'player' ? {kind:'character',id:s.player.charId} : {kind:'realm',id:r.realmId}),
      stamp:FB.buildingProfiles.stamp(FB.fortificationBuildingId(),r.profileId),
      buildings:copy(s.buildings[r.countyId] || []),mods:FB.mods.sig(),
      site:(FB.world.sitesByProv[r.countyId] && FB.world.sitesByProv[r.countyId].list[r.settlement] || {}).site || null};
    return q;
  };
  F.authorized = function (s,pid,slot,target,realm,repair) {
    var a = activeReview;
    return !!a && a.state === s && a.request.countyId === pid && a.request.settlement === slot &&
      a.request.targetLevel === target && a.request.realmId === realm && a.request.repair === repair;
  };
  F.commit = function (s,q) {
    if (activeReview || !object(q) || !q.allowed || !validRequest(q.request) || !same(q,F.quote(s,q.request))) return false;
    var r = q.request, fort;
    activeReview = {state:s,request:r};
    try {
      fort = FB.startFortProject(s,r.countyId,r.settlement,r.targetLevel,
        {realm:r.realmId,repair:r.repair,profileId:r.profileId});
    } finally { activeReview = null; }
    if (!fort) return false;
    if (r.realmId !== 'player') { s.realms[r.realmId].fortWorks -= q.work; s.realms[r.realmId].fortProjectYear = s.date.year; }
    return fort;
  };
  F.attachProject = function (s,fort,realm,repair,cost) {
    if (!fort.buildingProfile || !F.get(fort.buildingProfile.id)) return;
    fort.fortProfileProject = {v:1,profileId:fort.buildingProfile.id,fromLevel:fort.level,targetLevel:fort.targetLevel,
      startedTurn:s.turn,completeTurn:fort.completeTurn,repair:!!repair,realmId:realm,cost:cost,
      work:realm === 'player' ? 0 : FB.fortLevelDef(fort.targetLevel).work};
  };
  F.aiQuote = function (s,rid,pid) {
    var fort = FB.fortAt(s,pid,true), target = fort && fort.ruined ? fort.ruinedLevel || fort.level || 1 : fort ? fort.level + 1 : 1;
    if (fort && fort.targetLevel || target > 4) return null;
    var realm = s.realms[rid], def = FB.fortLevelDef(target);
    if (!realm || !realm.alive || realm.fortProjectYear === s.date.year || (Number(realm.fortWorks) || 0) < def.work) return null;
    var selected = fort && fort.buildingProfile && fort.buildingProfile.id;
    var ids = selected ? [selected] : fort ? [] : Object.keys(FBDATA.fortProfiles).sort();
    for (var i=0; i<ids.length; i++) {
      if (!F.status(s,pid,fort ? fort.s : 0,ids[i],target,rid,!!(fort && fort.ruined)).ready) continue;
      var q = F.quote(s,{countyId:pid,settlement:fort ? fort.s : 0,profileId:ids[i],targetLevel:target,realmId:rid,repair:!!(fort && fort.ruined)});
      if (q.allowed) return q;
    }
    return null;
  };
  F.validate = function (s) {
    var bookmark = null;
    Object.keys(s.buildings || {}).forEach(function (pid) {
      var forts = (s.buildings[pid] || []).filter(function (r) {
        if (r && own(r,'fortProfileProject') && !FB.isFortificationBuilding(r.id)) throw new Error(FB.T('Invalid saved fort material project.'));
        return r && FB.isFortificationBuilding(typeof r === 'string' ? r : r.id);
      });
      forts.forEach(function (r) {
        var selected = r.buildingProfile && F.get(r.buildingProfile.id), p = r.fortProfileProject;
        function fail() { throw new Error(FB.T('Invalid saved fort material project.')); }
        if (p !== undefined && !selected) fail();
        if (!selected) return;
        bookmark = bookmark || FB.campaignBookmark(s);
        if (!bookmark || !(bookmark.provinces || []).some(function (pr) { return pr.id === pid && !pr.wasteland; }) ||
            forts.length !== 1 || !Number.isSafeInteger(r.s) || r.s < 0 || r.s >= 8 ||
            !Number.isSafeInteger(r.level) || r.level < 0 || r.level > 4 ||
            r.level > 0 && !F.requirements(r.buildingProfile.id,r.level) ||
            r.ruinedLevel !== undefined && (!Number.isSafeInteger(r.ruinedLevel) || !F.requirements(r.buildingProfile.id,r.ruinedLevel))) fail();
        if (r.targetLevel === undefined) {
          if (p !== undefined || r.completeTurn !== undefined || r.repairing ||
              r.level === 0 && (!r.ruined || r.ruinedLevel === undefined)) fail();
          return;
        }
        if (!Number.isSafeInteger(r.targetLevel) || r.targetLevel < 1 || r.targetLevel > 4) fail();
        var def = FB.fortLevelDef(r.targetLevel);
        if (!keys(p,['v','profileId','fromLevel','targetLevel','startedTurn','completeTurn','repair','realmId','cost','work']) || Object.keys(p).length !== 10 ||
            p.v !== 1 || p.profileId !== r.buildingProfile.id || p.fromLevel !== r.level || p.targetLevel !== r.targetLevel ||
            !F.requirements(p.profileId,p.targetLevel) || !Number.isSafeInteger(p.startedTurn) || p.startedTurn < 0 || p.startedTurn > s.turn ||
            !Number.isSafeInteger(p.completeTurn) || p.completeTurn !== r.completeTurn || p.completeTurn !== p.startedTurn + def.seasons * 90 ||
            typeof p.repair !== 'boolean' || p.repair !== !!r.repairing || r.ruined ||
            (!p.repair && p.targetLevel !== p.fromLevel + 1) || p.repair && (p.fromLevel !== 0 || p.targetLevel !== r.ruinedLevel) ||
            typeof p.realmId !== 'string' || !own(s.realms,p.realmId) && p.realmId !== 'player' ||
            !Number.isFinite(p.cost) || p.cost < 0 || p.work !== (p.realmId === 'player' ? 0 : def.work)) fail();
      });
    });
    return true;
  };
})();
