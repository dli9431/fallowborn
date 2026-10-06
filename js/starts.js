/* Existing-ruler starts adopt ordinary player state once, before track init.
   Authored historical references resolve through the saved start identity. */
(function () {
  'use strict';
  FB.startRealmId = function (s, id) {
    return s && s.start && s.start.rulerRealmId === id ? 'player' : id;
  };
  var realmFields = ['realmId','patronRealmId','federateRealmId','institutionId',
    'ownerId','holderId','controllerId','applicantRealmId','targetOwnerId','owner',
    'issuerRealmId','payerRealmId','beneficiaryRealmId','nomineeRealmId',
    'liege','realm','fromRid','toRid','a','b'];
  function references(value, from) {
    if (!value || typeof value !== 'object') return;
    if ((value.kind === 'realm' || value.type === 'realm') && value.id === from) value.id = 'player';
    realmFields.forEach(function (key) {
      if (value[key] === from) value[key] = 'player';
    });
    Object.keys(value).forEach(function (key) { references(value[key], from); });
    if (value.courtAnchors) rekey(value.courtAnchors, from);
    if (value.displacedCourts) rekey(value.displacedCourts, from);
    if (value.approvals) rekey(value.approvals, from);
  }
  function rekey(table, from) {
    if (!table || !Object.prototype.hasOwnProperty.call(table, from)) return;
    table.player = table[from]; delete table[from];
  }
  FB.startRealmDefinition = function (s, definition) {
    if (!s.start || !s.start.rulerRealmId) return definition;
    var out = JSON.parse(JSON.stringify(definition)), from = s.start.rulerRealmId;
    references(out, from);
    if (out.target && out.target.ownerIds) out.target.ownerIds = out.target.ownerIds.map(function (id) {
      return FB.startRealmId(s, id);
    });
    return out;
  };
  FB.adoptStartingRealm = function (s, scenario) {
    var id = scenario.rulerRealmId, realm = s.realms[id], p = s.player;
    if (!realm || !realm.alive || s.realms.player ||
        !FB.realmRulerCharacterSnapshot(s, id) ||
        FB.realmRulerCharacterSnapshot(s, id).id !== p.charId) return false;
    var me = s.chars[p.charId];
    var government = FB.political.government(s, { kind:'realm', id:id });
    if (!government || government.formId !== scenario.governmentForm ||
        FB.station.realmRank({ tier:scenario.tier, formId:government.formId }, s) !== realm.rank) return false;
    s.start.rulerRealmId = id;
    s.start.scenarioId = scenario.id;
    s.start.onboarding = scenario.onboarding;
    p.provs = FB.realmHeldCounties(s, id).slice();
    p.liege = realm.liege || null;
    p.gold = realm.treasury ? realm.treasury.gold : scenario.gold;
    if (s.treasuryAccounting && realm.treasury) {
      s.treasuryAccounting.playerMilitary = realm.treasury.militaryAccrued || 0;
      s.treasuryAccounting.playerMilitaryLast = realm.treasury.militaryLast || 0;
    }
    delete realm.treasury;
    realm.id = 'player'; s.realms.player = realm; delete s.realms[id];
    /* Compact AI succession becomes the ordinary, fully materialized player
       family. Never leave a second succession engine aging that household. */
    delete realm.succession;
    Object.keys(s.chars).forEach(function (cid) {
      var c = s.chars[cid];
      if (c.royalLine && c.royalLine.realmId === id) delete c.royalLine;
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
    references(s.alliances, id); references(s.localInstitutions, id);
    references(s.settlementLordships, id);
    references(s.stories, id);
    references(s.bookmarkSetup, id);
    rekey(s.authority && s.authority.governments, id);
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
    if (FB.ensureAgency) FB.ensureAgency(s);
    if (FB.ensurePolitics) FB.ensurePolitics(s);
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
