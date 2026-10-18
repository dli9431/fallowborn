/* Save-v4 compatibility boundary. Migration is detached and never pays or ticks. */
(function () {
  'use strict';
  var P = {};
  FB.save.v4 = P;
  function own(o, key) {
    return !!o && Object.prototype.hasOwnProperty.call(o, key);
  }
  function plain(o) {
    return !!o && typeof o === 'object' && !Array.isArray(o);
  }
  function invalid(where) {
    throw new Error(FB.T('Invalid v4 authority record at {path}.', { path:where }));
  }
  function ref(value, kinds, where) {
    if (!plain(value) || kinds.indexOf(value.kind) < 0 ||
        typeof value.id !== 'string' || !value.id) invalid(where);
  }
  function row(value, where) {
    if (!plain(value) || typeof value.id !== 'string' || !value.id ||
        own(value, 'effective') || own(value, 'quote') ||
        own(value, 'projection')) invalid(where);
  }
  function endTurn(value, where) {
    if (value.endTurn !== null && (!Number.isInteger(value.endTurn) ||
        value.endTurn < value.startTurn)) invalid(where + '.endTurn');
  }
  function rows(authority, key, seen, check) {
    if (!Array.isArray(authority[key])) invalid('authority.' + key);
    authority[key].forEach(function (value, index) {
      var where = 'authority.' + key + '[' + index + ']';
      row(value, where);
      if (own(seen, value.id)) throw new Error(FB.T(
        'Duplicate v4 authority id {id}.', { id:value.id }));
      seen[value.id] = true;
      check(value, where);
    });
  }
  /* Platform id families resolve through their registries at validation
     time. A registry that has not been loaded knows no ids, so a present id
     fails closed instead of being adopted unchecked. */
  var families = {
    era:function (id) { return own(FBDATA.eras, id); },
    geography:function (id) { return own(FBDATA.geographies, id); },
    government:function (id) { return own(FBDATA.governmentForms, id); },
    story:function (id) {
      return !!(FB.stories && typeof FB.stories.get === 'function' &&
        FB.stories.get(id));
    }
  };
  function known(family, id) {
    return typeof id === 'string' && !!id && families[family](id);
  }
  function unknown(family, id) {
    var args = { id:String(id) };
    if (family === 'era') throw new Error(FB.T('Unknown era {id} in this save.', args));
    if (family === 'geography')
      throw new Error(FB.T('Unknown geography {id} in this save.', args));
    if (family === 'government')
      throw new Error(FB.T('Unknown government form {id} in this save.', args));
    throw new Error(FB.T('Unknown story {id} in this save.', args));
  }
  function field(where) {
    throw new Error(FB.T('Invalid v4 save field at {path}.', { path:where }));
  }
  P.validateIdentity = function (data) {
    // The RNG exposes either signed or unsigned representations of 32 bits.
    if (!Number.isInteger(data.rng) || data.rng < -2147483648 ||
        data.rng > 4294967295) field('rng');
    if (!Number.isSafeInteger(data.uid) || data.uid < 0) field('uid');
  };
  function stamp(start, key, family) {
    if (!own(start, key)) return;
    if (typeof start[key] !== 'string' || !start[key]) field('state.start.' + key);
    if (!known(family, start[key])) unknown(family, start[key]);
  }
  /* Optional platform fields (state-and-saves.md, Save v4 platform schema).
     Absent fields stay valid; present ids must resolve. */
  P.validatePlatform = function (state) {
    if (state.treasuryAccounting && own(state.treasuryAccounting, 'fundingRevision') &&
        (!Number.isSafeInteger(state.treasuryAccounting.fundingRevision) || state.treasuryAccounting.fundingRevision < 0))
      field('treasuryAccounting.fundingRevision');
    // A leftover legacy record must fail even when there are no stories.
    if (state.situation476 !== undefined) field('state.situation476');
    if (state.start !== undefined && !plain(state.start)) field('state.start');
    if (FB.validateOpeningInfrastructureState) FB.validateOpeningInfrastructureState(state);
    if (FB.buildingProfiles) FB.buildingProfiles.validate(state);
    if (FB.fortProfiles) FB.fortProfiles.validate(state);
    if (FB.siteResources) FB.siteResources.validate(state);
    if (FB.buildingOperations) FB.buildingOperations.validate(state);
    if (FB.production) FB.production.validate(state);
    if (FB.siegeSupport) FB.siegeSupport.validate(state);
    if (FB.buildingSeasons) FB.buildingSeasons.validate(state);
    if (FB.validateBuildingInstitutionState) FB.validateBuildingInstitutionState(state);
    validateRoyalCourts(state);
    if (FB.validateStartingRealm) FB.validateStartingRealm(state);
    if (FB.validateColonateTenure) FB.validateColonateTenure(state);
    if (FB.validateLocalInstitutionState) FB.validateLocalInstitutionState(state);
    if (FB.validateReligiousInstitutionState) FB.validateReligiousInstitutionState(state);
    if (FB.validateReligiousActivityState) FB.validateReligiousActivityState(state);
    if (FB.validateReligionInstitutionState) FB.validateReligionInstitutionState(state);
    if (FB.validateHistoricalHolyWarState) FB.validateHistoricalHolyWarState(state);
    if (FB.validateMobileHolyWarState) FB.validateMobileHolyWarState(state);
    if (FB.governments.support) FB.governments.support.validate(state);
    if (FB.mobile) FB.mobile.validate(state);
    if (FB.ecclesiasticalGovernment) FB.ecclesiasticalGovernment.validate(state);
    if (plain(state.start)) {
      if (typeof state.start.id !== 'string' || !state.start.id) field('state.start.id');
      if (!own(FBDATA.bookmarks, state.start.id)) throw new Error(FB.T(
        'Missing bookmark {id} for title migration.', { id:state.start.id }));
      stamp(state.start, 'era', 'era');
      stamp(state.start, 'geography', 'geography');
      stamp(state.start, 'defaultGovernment', 'government');
      var worldDefinition = FB.campaignBookmark(state);
      if (state.start.revision !== undefined && typeof state.start.revision !== 'string') field('state.start.revision');
      if (worldDefinition && own(state.start, 'geography') &&
          state.start.geography !== FB.bookmarkGeography(worldDefinition))
        field('state.start.geography');
      if (worldDefinition && FB.bookmarkHasRevisions(state.start.id)) {
        var inhabited = {};
        worldDefinition.provinces.forEach(function (p) { inhabited[p.id] = true; });
        ['owner','holder'].forEach(function (key) {
          Object.keys(state[key] || {}).forEach(function (id) {
            if (state[key][id] && !own(inhabited, id)) field('state.' + key + '.' + id);
          });
        });
      }
    }
    if (FB.expeditionParticipants) FB.expeditionParticipants.validateCarriers(state);
    if (state.stories === undefined) {
      if (FB.householdParties) FB.householdParties.validateAssociations(state);
      return true;
    }
    if (!plain(state.stories)) field('state.stories');
    // Check the entire registry graph before calling validators that read peers.
    for (var id in state.stories) if (own(state.stories, id)) {
      if (!known('story', id)) unknown('story', id);
      if (!plain(state.stories[id])) field('state.stories.' + id);
      var story = FB.stories.get(id);
      (story.requires || []).forEach(function (required) {
        if (!own(state.stories, required)) throw new Error(FB.T(
          'Story {id} requires story {required} in this save.',
          { id:id, required:required }));
      });
    }
    for (var id in state.stories) if (own(state.stories, id)) {
      var story = FB.stories.get(id);
      if (typeof story.validate === 'function') story.validate(state.stories[id], state);
    }
    if (FB.householdParties) FB.householdParties.validateAssociations(state);
    return true;
  };

  /* Inspect the compact save representation, before inflateState or adoption.
     Missing derived ids/links are legitimate serializer omissions. */
  function validateRoyalCourts(state) {
    Object.keys(state.realms || {}).forEach(function (rid) {
      var realm = state.realms[rid], s = realm && realm.succession;
      if (!s || s.authoredCourt === undefined && s.policyId === undefined) return;
      var path = 'state.realms.' + rid + '.succession';
      var government = state.authority && state.authority.governments && state.authority.governments[rid];
      var civic = government && government.civic && government.civic.originFormId !== null &&
        FB.civicGovernment && FB.civicGovernment.active(state,rid);
      var ecclesiastical = government && government.ecclesiastical && government.ecclesiastical.originFormId !== null &&
        FB.ecclesiasticalGovernment && FB.ecclesiasticalGovernment.active(state,rid);
      var authoredRealmId = government && government.selection ? government.selection.originRealmId :
        government && government.aristocracy ? government.aristocracy.originRealmId : rid;
      if (s.authoredCourt !== undefined && s.authoredCourt !== true ||
          !plain(s.members) || !Array.isArray(s.order) || !own(s.members, s.rulerMemberId) ||
          !Number.isInteger(s.rulerGeneration) || s.rulerGeneration < 1 ||
          !civic && !ecclesiastical && realm.ruler && realm.ruler.generation !== undefined && realm.ruler.generation !== s.rulerGeneration) field(path);
      var policy = s.policyId === undefined ? null : FB.governments.strategy('succession', s.policyId);
      if (s.policyId !== undefined && (!policy || typeof policy.eligible !== 'function')) field(path + '.policyId');
      if (s.founderId !== undefined && !own(s.members, s.founderId) ||
          policy && policy.requiresFounder && !own(s.members, s.founderId)) field(path + '.founderId');
      function list(ids, where, excludeRuler) {
        if (!Array.isArray(ids) || ids.some(function (id, i) {
          return typeof id !== 'string' || !own(s.members, id) || ids.indexOf(id) !== i ||
            excludeRuler && id === s.rulerMemberId;
        })) field(where);
      }
      list(s.order, path + '.order', true);
      if (s.authoredCourt) list(s.dynasticOrder, path + '.dynasticOrder', true);
      if (own(s, 'heirId') && (s.heirId !== null && s.heirId !== s.order[0] ||
          s.heirId === null && s.order.length)) field(path + '.heirId');
      if (s.openingPreferredId !== undefined && (!own(s.members, s.openingPreferredId) ||
          s.openingPreferredId === s.rulerMemberId)) field(path + '.openingPreferredId');
      if (s.designatedHeirId !== undefined && (typeof s.designatedHeirId !== 'string' || !own(s.members, s.designatedHeirId) ||
          s.designatedHeirId === s.rulerMemberId)) field(path + '.designatedHeirId');
      var localIds = {}, visiting = {}, done = {};
      Object.keys(s.members).forEach(function (id) {
        var m = s.members[id], where = path + '.members.' + id;
        if (!plain(m) || m.id !== undefined && m.id !== id ||
            typeof m.name !== 'string' || !m.name || ['m','f'].indexOf(m.sex) < 0 ||
            !Number.isInteger(m.born) || m.born > state.date.year ||
            m.alive !== undefined && typeof m.alive !== 'boolean' ||
            m.died !== undefined && (!Number.isInteger(m.died) || m.died < m.born || m.died > state.date.year) ||
            m.generated !== undefined && typeof m.generated !== 'boolean' ||
            m.mar !== undefined && (typeof m.mar !== 'number' || !isFinite(m.mar) || m.mar < 0) ||
            m.trait !== undefined && !own(FBDATA.traits, m.trait) ||
            m.spouseDeclared !== undefined && typeof m.spouseDeclared !== 'boolean' ||
            m.culture !== undefined && !own(FBDATA.cultures, m.culture) ||
            m.religion !== undefined && !FB.faithExists(m.religion, state) ||
            m.homeProvinceId !== undefined && !((FB.campaignBookmark(state) || {}).provinces || []).some(function (p) { return p.id === m.homeProvinceId; })) field(where);
        if (m.localId !== undefined) {
          if (typeof m.localId !== 'string' || !/^[a-z][a-z0-9_]*$/.test(m.localId) ||
              own(localIds, m.localId) || id !== 'royal_' + authoredRealmId + '_authored_' + m.localId) field(where + '.localId');
          localIds[m.localId] = true;
        }
        ['parentId','fatherId','motherId','spouseMemberId'].forEach(function (key) {
          if (m[key] === undefined || m[key] === null) return;
          var target = s.members[m[key]];
          if (!own(s.members, m[key]) || !target || m[key] === id) field(where + '.' + key);
          if (key === 'fatherId' || key === 'motherId') {
            if (target.sex !== (key === 'fatherId' ? 'm' : 'f') || m.born - target.born < 12)
              field(where + '.' + key);
          }
          if (key === 'spouseMemberId' && target.spouseMemberId !== id) field(where + '.' + key);
        });
        if (m.siblingIds !== undefined) {
          list(m.siblingIds, where + '.siblingIds', false);
          if (m.siblingIds.some(function (siblingId) {
            var sibling = s.members[siblingId];
            return siblingId === id || !Array.isArray(sibling.siblingIds) || sibling.siblingIds.indexOf(id) < 0;
          })) field(where + '.siblingIds');
        }
        if (m.childIds !== undefined) {
          list(m.childIds, where + '.childIds', false);
          if (m.childIds.some(function (childId) {
            var child = s.members[childId];
            return child.parentId !== id && child.fatherId !== id && child.motherId !== id;
          })) field(where + '.childIds');
        }
        if (m.charId) {
          var c = state.chars && state.chars[m.charId];
          var birthRealm = m.branchRef ? m.branchRef.realmId : m.incumbentRef ? m.incumbentRef.realmId : rid;
          var birthMember = m.branchRef ? m.branchRef.memberId : m.incumbentRef ? m.incumbentRef.memberId : id;
          if (!c || !c.royalLine || c.royalLine.realmId !== birthRealm ||
              c.royalLine.memberId !== undefined && c.royalLine.memberId !== birthMember) field(where + '.charId');
        }
        if (m.incumbentRef !== undefined) {
          var incumbent = m.incumbentRef, birthCourt = plain(incumbent) && state.realms[incumbent.realmId];
          var birth = birthCourt && birthCourt.succession && birthCourt.succession.members[incumbent.memberId];
          if (!government || !government.aristocracy || !plain(incumbent) || Object.keys(incumbent).length !== 2 ||
              incumbent.realmId === rid || !birth || !m.charId || birth.charId !== m.charId || m.role !== 'incumbent' ||
              m.branchRef || m.parentId || m.fatherId || m.motherId ||
              !Array.isArray(government.aristocracy.royalRoots) || government.aristocracy.royalRoots.indexOf(id) >= 0) field(where + '.incumbentRef');
        }
        if (m.branchRef !== undefined) {
          var ref = m.branchRef, source = plain(ref) && state.realms[ref.realmId];
          var original = source && source.succession && source.succession.members[ref.memberId];
          if (!plain(ref) || ref.realmId === rid || !original || original.branchRef ||
              !own(s.members, ref.parentId) ||
              ![rid, authoredRealmId].concat(government && (government.selection || government.aristocracy) ? ['player'] : []).some(function (identity) {
                return id === 'royal_' + identity + '_branch_' + ref.realmId + '_' + ref.memberId;
              }) ||
              m.charId && m.charId !== (original.charId || FB.courtCharacterId(ref.memberId))) field(where + '.branchRef');
        }
      });
      function visit(id) {
        if (visiting[id]) field(path + '.members.' + id + '.parents');
        if (done[id]) return;
        visiting[id] = true;
        var m = s.members[id];
        [m.parentId, m.fatherId, m.motherId].forEach(function (parentId) { if (parentId) visit(parentId); });
        delete visiting[id]; done[id] = true;
      }
      Object.keys(s.members).forEach(visit);
    });
  }
  P.validateAuthority = function (authority, state) {
    if (authority === undefined) return true;
    if (!plain(authority) || authority.schema !== undefined &&
        authority.schema !== FB.save.FORMAT.authoritySchema || !Number.isSafeInteger(authority.nextId) ||
        authority.nextId < 1 || !plain(authority.governments) ||
        authority.lastCustomYear !== undefined &&
        !Number.isInteger(authority.lastCustomYear)) invalid('authority');
    var allowed = { schema:1, nextId:1, appointments:1, recognitions:1,
      contracts:1, rights:1, receipts:1, governments:1, lastCustomYear:1,
      civicActors:1, migrations:1 };
    for (var key in authority) if (own(authority, key) && !own(allowed, key))
      invalid('authority.' + key);
    var seen = Object.create(null);
    rows(authority, 'appointments', seen, function (value, where) {
      if (!own(FBDATA.authorityOffices, value.officeId) ||
          typeof value.institutionId !== 'string' ||
          !own(state.realms, value.institutionId) ||
          !['active','contested','expired','removed'].includes(value.status) ||
          !Number.isInteger(value.startTurn) ||
          !Number.isInteger(value.appointerGeneration)) invalid(where);
      ref(value.appointer, ['realm'], where + '.appointer');
      ref(value.holder, ['realm','character'], where + '.holder');
      ref(value.scope, ['realm','host','county'], where + '.scope');
      if (value.appointer.id !== value.institutionId ||
          FBDATA.authorityOffices[value.officeId].scopes.indexOf(value.scope.kind) < 0)
        invalid(where + '.scope');
      endTurn(value, where);
    });
    if (FB.validatePublicAdministrationState) {
      var publicFault = FB.validatePublicAdministrationState(state);
      if (publicFault) invalid(publicFault);
    }
    if (FB.aristocracy) {
      var aristocraticFault = FB.aristocracy.validateState(state);
      if (aristocraticFault) invalid(aristocraticFault);
    }
    rows(authority, 'recognitions', seen, function (value, where) {
      if (!own(FBDATA.legitimacySources, value.source) ||
          !['active','revoked'].includes(value.status) ||
          !Number.isInteger(value.startTurn)) invalid(where);
      ref(value.issuer, ['realm','host','county','religious-office','religious-institution','character'],
        where + '.issuer');
      ref(value.subject, ['realm','character'], where + '.subject');
      if (value.scope !== null) ref(value.scope, ['realm','host','county'],
        where + '.scope');
      endTurn(value, where);
    });
    rows(authority, 'contracts', seen, function (value, where) {
      if (typeof value.patronRealmId !== 'string' ||
          typeof value.federateRealmId !== 'string' ||
          !own(state.realms, value.patronRealmId) ||
          !own(state.realms, value.federateRealmId) ||
          !['offered','active','breached','expired'].includes(value.status) ||
          !Number.isFinite(value.payPerSeason) || value.payPerSeason < 0 ||
          !Number.isInteger(value.endTurn) ||
          (value.startTurn !== null && !Number.isInteger(value.startTurn)) ||
          !Number.isInteger(value.paidThroughPeriod) ||
          !Number.isInteger(value.serviceThroughPeriod) ||
          !plain(value.approvals) || !plain(value.succession) ||
          !Number.isInteger(value.succession.patron) ||
          !Number.isInteger(value.succession.federate) ||
          !Array.isArray(value.settlementCountyIds) ||
          !Array.isArray(value.settlementAwards)) invalid(where);
      if (value.hostId !== null &&
          (typeof value.hostId !== 'string' || !value.hostId)) invalid(where + '.hostId');
      if (value.patronRealmId === value.federateRealmId ||
          value.settlementCountyIds.some(function (id) {
            return typeof id !== 'string' || !id;
          })) invalid(where);
      for (var rid in value.approvals) if (own(value.approvals, rid) &&
          (rid !== value.patronRealmId && rid !== value.federateRealmId ||
            !Number.isInteger(value.approvals[rid]))) invalid(where + '.approvals');
      value.settlementAwards.forEach(function (award, index) {
        if (!plain(award) || typeof award.provinceId !== 'string' ||
            !Number.isInteger(award.settlement) || award.settlement < 0 ||
            typeof award.recipientId !== 'string' ||
            typeof award.fulfilled !== 'boolean' ||
            award.fulfilled && !Number.isInteger(award.fulfilledTurn))
          invalid(where + '.settlementAwards[' + index + ']');
      });
      if (value.templateId !== undefined &&
          !own(FBDATA.federateContractTerms, value.templateId)) invalid(where + '.templateId');
      if (value.initialPay !== undefined &&
          (!Number.isFinite(value.initialPay) || value.initialPay < 0) ||
          value.initialPaidTurn !== undefined && !Number.isInteger(value.initialPaidTurn) ||
          value.status === 'active' && value.initialPay &&
            value.initialPaidTurn === undefined) invalid(where + '.initialPay');
      if (value.transitionReason !== undefined &&
          ['ruler_succession','renewed','breached','unpaid','term_ended','party_lost',
            'recognition_lost','host_lost','settled','service_released'].indexOf(value.transitionReason) < 0)
        invalid(where + '.transitionReason');
      if (value.fulfilledCountyIds !== undefined &&
          (!Array.isArray(value.fulfilledCountyIds) || value.fulfilledCountyIds.some(function (id, index) {
            return typeof id !== 'string' || value.settlementCountyIds.indexOf(id) < 0 ||
              value.fulfilledCountyIds.indexOf(id) !== index;
          }))) invalid(where + '.fulfilledCountyIds');
    });
    if (authority.migrations !== undefined) {
      var movingRealms = {}, movingHosts = {};
      rows(authority, 'migrations', seen, function (value, where) {
        var independent=value.sponsorship!==undefined;
        if (independent && !FB.mobile || FB.mobile && !FB.mobile.migrationSponsorshipValid(state,value)) invalid(where + '.sponsorship');
        if (typeof value.realmId !== 'string' || (independent ? value.patronRealmId!==null :
            typeof value.patronRealmId !== 'string' || !own(state.realms, value.patronRealmId)) ||
            !own(state.realms, value.realmId) ||
            value.realmId === value.patronRealmId ||
            typeof value.hostId !== 'string' || !value.hostId ||
            !['encamped','service','marching','arrived','settled','failed'].includes(value.status) ||
            ![null,'land','service','force'].includes(value.choice) ||
            !Number.isInteger(value.startTurn) || !Number.isInteger(value.endTurn) ||
            value.endTurn <= value.startTurn ||
            !known('government', value.settlementForm) ||
            FB.governments.resolve(value.settlementForm).use.territory.profile(null, null, {}).movingCourt ||
            !Array.isArray(value.courtIds) || !value.courtIds.length ||
            value.courtIds.some(function (id, index) {
              return typeof id !== 'string' || !id || value.courtIds.indexOf(id) !== index;
            }) || [value.origin, value.at, value.target].some(function (id) {
              return typeof id !== 'string' || !own(state.owner, id) || !state.owner[id];
            }) || value.contractId !== null &&
              !authority.contracts.some(function (deal) {
                return deal.id === value.contractId && deal.federateRealmId === value.realmId &&
                  deal.patronRealmId === value.patronRealmId && deal.hostId === value.hostId;
              }) || value.warId !== null && typeof value.warId !== 'string') invalid(where);
        if (value.status === 'settled' && !Number.isInteger(value.settledTurn)) invalid(where);
        if (value.session !== null) {
          var session = value.session;
          if (!plain(session) || session.schema !== 1 || session.kind !== 'federate_migration' ||
              !Array.isArray(session.seats) || !Array.isArray(session.assets) || session.assets.length !== 1 ||
              !plain(session.assets[0]) || session.assets[0].id !== value.target ||
              session.assets[0].kind !== 'county' ||
              !Array.isArray(session.claims) || session.claims.length !== 1 ||
              !plain(session.claims[0]) || session.claims[0].asset !== value.target ||
              session.claims[0].claimant !== value.realmId ||
              !Array.isArray(session.awards) ||
              !Number.isInteger(session.step) || session.step < 0 || session.step > 1 ||
              !['open','resolved'].includes(session.status) ||
              session.status !== (session.step === 1 ? 'resolved' : 'open') ||
              value.status === 'settled' && (session.status !== 'resolved' ||
                session.awards.length !== 1 || !plain(session.awards[0]) ||
                session.awards[0].asset !== value.target ||
                session.awards[0].claimant !== value.realmId)) invalid(where + '.session');
        } else if (value.status === 'settled') invalid(where + '.session');
        if (['settled','failed'].indexOf(value.status) < 0) {
          if (movingRealms[value.realmId] || movingHosts[value.hostId]) invalid(where);
          movingRealms[value.realmId] = true; movingHosts[value.hostId] = true;
        }
      });
    }
    rows(authority, 'rights', seen, function (value, where) {
      if (!own(FBDATA.customaryBases, value.basis) ||
          ['peace','revenue','consent'].indexOf(value.power) < 0 ||
          !['active','lapsed','revoked'].includes(value.status) ||
          !Number.isFinite(value.strength) || value.strength < 0 ||
          value.strength > 100 || !Array.isArray(value.history)) invalid(where);
      ref(value.issuer, ['realm'], where + '.issuer');
      ref(value.beneficiary, ['realm','character'], where + '.beneficiary');
      ref(value.scope, ['county'], where + '.scope');
    });
    var obligations = Object.create(null);
    rows(authority, 'receipts', seen, function (value, where) {
      if (typeof value.obligationId !== 'string' || !value.obligationId ||
          !Number.isFinite(value.amount) || value.amount <= 0 ||
          !Number.isInteger(value.turn)) invalid(where);
      if (own(obligations, value.obligationId)) throw new Error(FB.T(
        'Duplicate v4 authority receipt for obligation {id}.', { id:value.obligationId }));
      obligations[value.obligationId] = true;
    });
    for (var rid in authority.governments) if (own(authority.governments, rid)) {
      var form = authority.governments[rid];
      if (FB.governmentSelection && plain(form)) FB.governmentSelection.validate(state, rid, form.selection);
      if (plain(form) && typeof form.formId === 'string' &&
          !known('government', form.formId)) unknown('government', form.formId);
      if (!own(state.realms, rid) || !plain(form) ||
          !known('government', form.formId) ||
          !Number.isInteger(form.sinceTurn) ||
          form.eliteCultureId !== undefined &&
            !own(FBDATA.cultures, form.eliteCultureId) ||
          form.eliteFaithId !== undefined &&
            !(own(FBDATA.religions, form.eliteFaithId) ||
              own(state.faiths, form.eliteFaithId)) ||
          form.legalIdentityId !== undefined &&
            !own(FBDATA.legalTraditions, form.legalIdentityId) ||
          form.tolerance !== undefined &&
            ['preference','tolerant','persecution'].indexOf(form.tolerance) < 0 ||
          form.taxation !== undefined &&
            ['equal','discriminatory'].indexOf(form.taxation) < 0 ||
          form.justicePolicy !== undefined &&
            ['personal','elite'].indexOf(form.justicePolicy) < 0)
        invalid('authority.governments.' + rid);
    }
    if (authority.civicActors !== undefined) {
      rows(authority, 'civicActors', seen, function (value, where) {
        if (typeof value.siteId !== 'string' ||
            !own(FBDATA.settlementSites, value.siteId) ||
            typeof value.countyId !== 'string') invalid(where);
      });
    }
    for (var id in seen) if (own(seen, id)) {
      var serial = /^(?:appointment|recognition|federate|custom|render|migration)-(\d+)$/.exec(id);
      if (serial && Number(serial[1]) >= authority.nextId) invalid('authority.nextId');
    }
    return true;
  };
  P.migrate = function (data) {
    var issue = FB.save.envelopeIssue(data);
    if (issue) throw new Error(FB.T('Unsupported save schema at {path}: {value}.',
      { path:issue, value:plain(data) ? String(data[issue]) : '?' }));
    if (!plain(data.state) || !plain(data.state.realms) ||
        !plain(data.state.owner) || !plain(data.state.holder) ||
        !plain(data.state.chars) || !plain(data.state.player) ||
        !plain(data.state.date) ||
        typeof data.state.player.charId !== 'string' ||
        !plain(data.state.chars[data.state.player.charId]))
      throw new Error(FB.T('Save v4 migration needs a v3 or v4 game state.'));
    P.validateIdentity(data);
    if (data.state.start !== undefined && (!plain(data.state.start) ||
        typeof data.state.start.id !== 'string' || !data.state.start.id)) field('state.start');
    var currentMods = FB.mods.sig();
    if ((FB.platform.isCrazyGames || /^crazygames-content-/.test(data.mods || '')) &&
        data.mods !== currentMods)
      throw new Error(FB.T('This save belongs to a different edition of the game.'));
    if (data.mods !== undefined ? data.mods !== currentMods : !!currentMods)
      throw new Error(FB.T('This save uses a different mod set and cannot be migrated.'));
    var bookmarkId = data.state.start ? data.state.start.id : '867';
    var bookmark = own(FBDATA.bookmarks, bookmarkId) && FB.bookmark(bookmarkId,
      data.state.start && data.state.start.revision !== undefined ? data.state.start.revision : 'baseline');
    if (!bookmark) throw new Error(FB.T(
      'Missing bookmark {id} for title migration.', { id:bookmarkId }));
    var state = FB.titleIds.migrateState(data.state, bookmark);
    // Reject malformed branch records before hooks can read them. The owning
    // story handles the valid split and leaves conflicts for validation.
    if (state.situation476 !== undefined && !plain(state.situation476)) field('state.situation476');
    if (state.stories !== undefined) {
      if (!plain(state.stories)) field('state.stories');
      /* Typed instance splits are declaration-owned and run only when their
         source exists. Reject conflicts rather than initializing or merging
         historical commitments. The owning types validate every copied row. */
      (FBDATA.storyRecordMigrations || []).forEach(function (migration) {
        if (!own(state.stories, migration.sourceId)) return;
        var source = state.stories[migration.sourceId];
        if (!plain(source) || !plain(source.opportunities) ||
            Object.keys(source.opportunities).length !== migration.opportunityFields.length ||
            migration.opportunityFields.some(function (key) { return !plain(source.opportunities[key]); }))
          field('state.stories.' + migration.sourceId);
        function read(path) {
          var value = path.split('.').reduce(function (row, key) { return row && own(row, key) ? row[key] : undefined; }, source);
          if (value === undefined) field('state.stories.' + migration.sourceId + '.' + path);
          return JSON.parse(JSON.stringify(value));
        }
        var copies = {};
        migration.targets.forEach(function (target) {
          if (own(state.stories, target.id)) field('state.stories.' + target.id);
          var row = read(target.recordField);
          if (!plain(row)) field('state.stories.' + migration.sourceId + '.' + target.recordField);
          row.approvals = {};
          Object.keys(target.fields).forEach(function (key) { row[key] = read(target.fields[key]); });
          copies[target.id] = row;
        });
        Object.keys(copies).forEach(function (id) { state.stories[id] = copies[id]; });
        delete state.stories[migration.sourceId];
      });
      for (var id in state.stories) if (own(state.stories, id)) {
        if (!known('story', id)) unknown('story', id);
        if (!plain(state.stories[id])) field('state.stories.' + id);
      }
    }
    /* A campaign keeps the era and geography it first ran under. Older saves
       take them once from their bookmark; a stamped value is never replaced.
       The default government form is stamped only at creation: deriving it
       here would change realms that older saves resolve as territorial. */
    if (state.start === undefined) state.start = {id:bookmarkId,year:867,season:0,day:1};
    if (plain(state.start) && state.start.revision === undefined) state.start.revision = 'baseline';
    if (plain(state.start)) ['era','geography'].forEach(function (key) {
      if (!own(state.start, key) && typeof bookmark[key] === 'string')
        state.start[key] = bookmark[key];
    });
    /* Registered stories move their legacy records into state.stories on
       this detached copy before validation (state-and-saves.md). */
    if (FB.stories) FB.stories.migrate(state);
    P.validateAuthority(state.authority, state);
    P.validatePlatform(state);
    if (state.authority) state.authority.schema = FB.save.FORMAT.authoritySchema;
    return Object.assign({}, data, FB.save.FORMAT, { state:state });
  };
  P.serialize = function () {
    return FB.save.serialize();
  };
  P.restore = function (data) {
    return FB.save.restore(data);
  };
})();
