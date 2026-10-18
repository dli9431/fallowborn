/* Existing-ruler starts adopt ordinary player state once, before track init.
   Authored historical references resolve through the saved start identity. */
(function () {
  'use strict';
  // Existing delegates are resolved from their constituency declaration.
  // This is a pure identity read; generated names remain campaign facts.
  FB.startCommandActorId = function (bookmark, realm, formId) {
    if (!bookmark || !realm || FB.governments.problems(formId).length ||
        !FB.governments.resolve(formId).use.succession.commandLeadership) return null;
    var opening = realm.mobile && realm.mobile.command && realm.mobile.opening;
    var binding = opening && Array.isArray(opening.principals) && opening.principals.filter(function (row) {
      return row && row.memberId === opening.leaderMemberId;
    })[0];
    var id = binding && binding.person && binding.person.actorId;
    var actors = bookmark.opening && bookmark.opening.actors;
    var actor = typeof id === 'string' && actors && Object.prototype.hasOwnProperty.call(actors, id) && actors[id];
    return actor && !actor.ref && typeof actor.name === 'string' && actor.name ? id : null;
  };
  FB.startRulerProfile = function (bookmark, realm, formId) {
    if (!bookmark || !realm || FB.governments.problems(formId).length) return null;
    var form = FB.governments.resolve(formId);
    if (form.use.succession.commandLeadership) {
      var actorId = FB.startCommandActorId(bookmark, realm, formId);
      return actorId ? bookmark.opening.actors[actorId] : null;
    }
    if (!form.use.succession.delegatedLeadership) return realm.ruler || null;
    var province = (bookmark.provinces || []).find(function (p) { return p.id === realm.capital; });
    var seed = realm.representative;
    return realm.constituency && seed && province ? {
      name:seed.name,sex:seed.sex || 'm',culture:province.culture
    } : null;
  };
  FB.startRulerFaith = function (bookmark, realm) {
    if (!bookmark || !realm) return null;
    var actorId = FB.startCommandActorId(bookmark, realm, realm.government);
    if (actorId) return bookmark.opening.actors[actorId].religion;
    var capital = (bookmark.provinces || []).find(function (p) { return p.id === realm.capital; });
    return realm.religion || (capital ? capital.religion : null);
  };
  /* Birthplace eligibility is pure and declaration-scoped, before a world or
     household exists. All new-campaign entry points share this gate. */
  /* A start's birthplaces rule names where it may begin as a union of typed
     selectors, resolved against the world revision being played:
       institutions   local institution kinds; their declared counties
       capitalsOf     government form ids; capitals of realms with that form
       realms         realm ids; counties those realms hold at the opening
       counties       county ids
       storyCounties  true: the start's own trackLocations counties
     The same rule therefore follows each revision's own declarations. */
  FB.startBirthplaces = function (scenario, bookmark) {
    var rule = scenario && scenario.birthplaces;
    if (!rule || !bookmark) return null;
    var places = Object.create(null);
    var kinds = rule.institutions || [], forms = rule.capitalsOf || [], realms = rule.realms || [];
    var institutions = bookmark.localInstitutions || {};
    Object.keys(institutions).forEach(function (id) {
      var d = institutions[id];
      if (d && d.provinceId && kinds.indexOf(d.kind) >= 0) places[d.provinceId] = true;
    });
    (bookmark.realms || []).forEach(function (r) {
      if (r && r.capital && forms.indexOf(r.government) >= 0) places[r.capital] = true;
    });
    if (realms.length) (bookmark.provinces || []).forEach(function (p) {
      if (realms.indexOf(p.realm) >= 0) places[p.id] = true;
    });
    (rule.counties || []).forEach(function (id) { places[id] = true; });
    if (rule.storyCounties === true) Object.keys(scenario.trackLocations || {}).forEach(function (track) {
      (scenario.trackLocations[track] || []).forEach(function (id) { places[id] = true; });
    });
    return places;
  };
  FB.startProvinceAllowed = function (scenario, bookmark, provinceId) {
    if (!scenario || !bookmark || scenario.fixedProvinceId && scenario.fixedProvinceId !== provinceId) return false;
    var province = (bookmark.provinces || []).find(function (p) { return p.id === provinceId; });
    if (!province || province.wasteland) return false;
    if (scenario.rulerRealmId && !FB.governments.problems(scenario.governmentForm).length &&
        FB.governments.resolve(scenario.governmentForm).use.succession.commandLeadership) {
      var commandRealm = (bookmark.realms || []).find(function (r) { return r.id === scenario.rulerRealmId; });
      if (!FB.startCommandActorId(bookmark, commandRealm, scenario.governmentForm) ||
          commandRealm.mobile.origin !== provinceId) return false;
    }
    var locations = bookmark.startLocations && bookmark.startLocations[scenario.id];
    if (locations !== undefined && (!Array.isArray(locations) || locations.indexOf(provinceId) < 0)) return false;
    var birthplaces = FB.startBirthplaces(scenario, bookmark);
    if (birthplaces && !birthplaces[provinceId]) return false;
    var realm = (bookmark.realms || []).find(function (r) { return r.id === province.realm; });
    var required = (scenario.systems || []).concat(scenario.system ? [scenario.system] : []);
    return required.every(function (id) {
      return FB.systems.enabledForBookmark(bookmark, id, province.religion, realm && realm.government);
    });
  };
  /* A track may name the counties where its story takes place. The same
     beginning elsewhere is an ordinary household without that track. */
  FB.startTracks = function (scenario, provinceId) {
    var places = scenario && scenario.trackLocations || {};
    return (scenario && Array.isArray(scenario.tracks) ? scenario.tracks : []).filter(function (id) {
      return !Object.prototype.hasOwnProperty.call(places, id) ||
        Array.isArray(places[id]) && places[id].indexOf(provinceId) >= 0;
    });
  };
  /* Optional companion tracks still attach, but cannot supply a storyline.
     Import validation uses its detached candidate registry. */
  FB.startStoryTracks = function (scenario, provinceId, stories) {
    return FB.startTracks(scenario, provinceId).filter(function (id) {
      return (stories || FB.stories).isStoryline(id);
    });
  };
  function delegatedStart(s) {
    var scenario = s && s.start && FBDATA.startScenarios.find(function (row) { return row.id === s.start.scenarioId; });
    return !!(scenario && scenario.rulerRealmId && !FB.governments.problems(scenario.governmentForm).length &&
      (FB.governments.resolve(scenario.governmentForm).use.succession.delegatedLeadership ||
       FB.governments.resolve(scenario.governmentForm).use.succession.commandLeadership));
  }
  FB.startRealmId = function (s, id) {
    return s && s.start && s.start.rulerRealmId === id && !delegatedStart(s) ? 'player' : id;
  };
  var realmFields = ['realmId','patronRealmId','federateRealmId','institutionId',
    'ownerId','holderId','controllerId','applicantRealmId','targetOwnerId','owner',
    'issuerRealmId','payerRealmId','beneficiaryRealmId','nomineeRealmId','scopeRealmId',
    'liege','realm','fromRid','toRid','a','b'];
  function references(value, from) {
    if (!value || typeof value !== 'object') return;
    if ((value.kind === 'realm' || value.type === 'realm') && value.id === from) value.id = 'player';
    realmFields.forEach(function (key) {
      if (value[key] === from) value[key] = 'player';
    });
    // Opening provenance retains declaration ids. Live institutions, carrier
    // references and accounts below still use the ordinary player alias.
    Object.keys(value).forEach(function (key) { if (key !== 'openingBindings') references(value[key], from); });
    ['ownerIds','remnantRealmIds','revoltRealmIds','branchRealmIds'].forEach(function (key) {
      if (Array.isArray(value[key])) value[key] = value[key].map(function (id) { return id === from ? 'player' : id; });
    });
    if (value.courtAnchors) rekey(value.courtAnchors, from);
    if (value.displacedCourts) rekey(value.displacedCourts, from);
    if (value.approvals) rekey(value.approvals, from);
  }
  function rekey(table, from) {
    if (!table || !Object.prototype.hasOwnProperty.call(table, from)) return;
    table.player = table[from]; delete table[from];
  }
  FB.startRealmDefinition = function (s, definition) {
    if (!s.start || !s.start.rulerRealmId || delegatedStart(s)) return definition;
    var out = JSON.parse(JSON.stringify(definition)), from = s.start.rulerRealmId;
    references(out, from);
    if (out.target && out.target.ownerIds) out.target.ownerIds = out.target.ownerIds.map(function (id) {
      return FB.startRealmId(s, id);
    });
    return out;
  };
  FB.adoptStartingRealm = function (s, scenario, options) {
    options = options || {};
    var id = scenario.rulerRealmId, realm = s.realms[id], p = s.player;
    if (!realm || !realm.alive || s.realms.player ||
        !FB.realmRulerCharacterSnapshot(s, id) ||
        FB.realmRulerCharacterSnapshot(s, id).id !== p.charId) return false;
    var me = s.chars[p.charId];
    var government = FB.political.government(s, { kind:'realm', id:id });
    if (!government || government.formId !== scenario.governmentForm ||
        !FB.governments.forRealm(s,id).use.succession.commandLeadership &&
        FB.realmRank.tier({ rank:realm.rank, formId:government.formId }, s) !== scenario.tier) return false;
    s.start.rulerRealmId = id;
    s.start.scenarioId = scenario.id;
    s.start.onboarding = scenario.onboarding;
    if (FB.governments.forRealm(s,id).use.succession.commandLeadership ||
        FB.governments.support && FB.governments.support.isDelegated(s, id)) {
      // Public jurisdiction, serial ids and treasury stay with the institution.
      // The already selected delegate begins an ordinary private household.
      p.provs = []; p.liege = id; p.gold = scenario.gold; me.role = null;
      s.politics = null;
      if (FB.invalidatePoliticsState) FB.invalidatePoliticsState();
      FB.rebuildRulerIndex(s); FB.invalidateRealmCache();
      if (!options.deferSetup && FB.ensureAgency) FB.ensureAgency(s);
      if (!options.deferSetup && FB.ensurePolitics) FB.ensurePolitics(s);
      return true;
    }
    p.provs = FB.realmHeldCounties(s, id).slice();
    p.liege = realm.liege || null;
    var publicCrown = FB.electiveCrown && FB.electiveCrown(s, id);
    p.gold = publicCrown ? scenario.gold : realm.treasury ? realm.treasury.gold : scenario.gold;
    if (s.treasuryAccounting && realm.treasury) {
      s.treasuryAccounting.playerMilitary = realm.treasury.militaryAccrued || 0;
      s.treasuryAccounting.playerMilitaryLast = realm.treasury.militaryLast || 0;
    }
    if (!publicCrown) delete realm.treasury;
    realm.id = 'player'; s.realms.player = realm; delete s.realms[id];
    /* Compact AI succession becomes the ordinary, fully materialized player
       family. Never leave a second succession engine aging that household. */
    var retainedSelection = (government.rules.selectionProfile || government.rules.aristocraticProfileId) && realm.succession;
    if (!retainedSelection) delete realm.succession;
    Object.keys(s.chars).forEach(function (cid) {
      var c = s.chars[cid];
      if (!retainedSelection && c.royalLine && c.royalLine.realmId === id) delete c.royalLine;
      if (c.realmStanding) rekey(c.realmStanding, id);
    });
    Object.keys(s.owner).forEach(function (pid) {
      if (s.owner[pid] === id) s.owner[pid] = 'player';
      if (s.holder[pid] === id) s.holder[pid] = 'player';
    });
    Object.keys(s.realms).forEach(function (rid) {
      if (s.realms[rid].liege === id) s.realms[rid].liege = 'player';
    });
    references(s.chars, id); references(s.agency, id);
    references(s.authority, id); references(s.armies, id);
    // Agreement counterparties are realm ids; preserve them when the host
    // court is adopted without rewriting unrelated partner fields.
    Object.keys(s.authority && s.authority.governments || {}).forEach(function (rid) {
      var mobile = s.authority.governments[rid].mobile;
      (mobile && mobile.agreements || []).forEach(function (agreement) {
        if (agreement.partnerId === id) agreement.partnerId = 'player';
      });
    });
    references(s.alliances, id); references(s.localInstitutions, id);
    references(s.settlementLordships, id);
    references(s.stories, id);
    references(s.bookmarkSetup, id);
    references(s.governmentSupport, id);
    rekey(s.authority && s.authority.governments, id);
    if (retainedSelection && government.rules.aristocraticProfileId) FB.aristocracy.adopt(s,id);
    rekey(s.armyLogistics && s.armyLogistics.purses, id);
    ['realmTech','armyDown','armyDownSurvival','armyDetachmentDown','armyCohorts'].forEach(function (key) {
      rekey(s[key], id);
    });
    Object.keys(s.localInstitutions || {}).forEach(function (key) {
      var institution = s.localInstitutions[key];
      ['standing','petitions'].forEach(function (field) {
        var table = institution[field], old = 'realm:' + id;
        if (table && Object.prototype.hasOwnProperty.call(table, old)) {
          table['realm:player'] = table[old]; delete table[old];
        }
      });
    });
    if (FB.remapWarRealm) FB.remapWarRealm(s, id, 'player');
    me.role = null;
    if (me.spouseId) s.roles.spouse = me.spouseId;
    if (me.spouseId || me.childrenIds.length) p.flags.tut_family_established = 1;
    s.politics = null;
    if (FB.invalidatePoliticsState) FB.invalidatePoliticsState();
    FB.rebuildRulerIndex(s); FB.invalidateRealmCache();
    if (FB.invalidateSettlementLordships) FB.invalidateSettlementLordships(s);
    if (!options.deferSetup && FB.ensureAgency) FB.ensureAgency(s);
    if (!options.deferSetup && FB.ensurePolitics) FB.ensurePolitics(s);
    return true;
  };
  FB.validateStartingRealm = function (s) {
    if (!s.start || s.start.rulerRealmId === undefined) return;
    var scenario = FBDATA.startScenarios.filter(function (row) {
      return row.id === s.start.scenarioId;
    })[0];
    if (!scenario || scenario.rulerRealmId !== s.start.rulerRealmId ||
        !scenario.bookmarkIds || scenario.bookmarkIds.indexOf(s.start.id) < 0 ||
        s.start.onboarding !== scenario.onboarding || (scenario.tracks || []).some(function (id) {
          return !s.stories || !s.stories[id];
        }))
      throw new Error(FB.T('Invalid v4 save field at {path}.', { path:'state.start.rulerRealmId' }));
  };
})();
