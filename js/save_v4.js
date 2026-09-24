/* Opt-in save-v4 migration prototype. The normal save/export format remains v3. */
(function () {
  'use strict';
  var P = {};
  FB.save.prototypeV4 = P;
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
  P.validateAuthority = function (authority, state) {
    if (authority === undefined) return true;
    if (!plain(authority) || authority.schema !== undefined &&
        authority.schema !== 4 || !Number.isInteger(authority.nextId) ||
        authority.nextId < 1 || !plain(authority.governments) ||
        authority.lastCustomYear !== undefined &&
        !Number.isInteger(authority.lastCustomYear)) invalid('authority');
    var allowed = { schema:1, nextId:1, appointments:1, recognitions:1,
      contracts:1, rights:1, receipts:1, governments:1, lastCustomYear:1,
      civicActors:1 };
    for (var key in authority) if (own(authority, key) && !own(allowed, key))
      invalid('authority.' + key);
    var seen = {};
    rows(authority, 'appointments', seen, function (value, where) {
      if (!FBDATA.authorityOffices[value.officeId] ||
          typeof value.institutionId !== 'string' ||
          !own(state.realms, value.institutionId) ||
          !['active','contested','expired','removed'].includes(value.status) ||
          !Number.isInteger(value.startTurn) ||
          !Number.isInteger(value.appointerGeneration)) invalid(where);
      ref(value.appointer, ['realm'], where + '.appointer');
      ref(value.holder, ['realm','character'], where + '.holder');
      ref(value.scope, ['realm','host','county'], where + '.scope');
    });
    rows(authority, 'recognitions', seen, function (value, where) {
      if (!FBDATA.legitimacySources[value.source] ||
          !['active','revoked'].includes(value.status) ||
          !Number.isInteger(value.startTurn)) invalid(where);
      ref(value.issuer, ['realm','host','county','religious-office'],
        where + '.issuer');
      ref(value.subject, ['realm','character'], where + '.subject');
      if (value.scope !== null) ref(value.scope, ['realm','host','county'],
        where + '.scope');
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
      value.settlementAwards.forEach(function (award, index) {
        if (!plain(award) || typeof award.provinceId !== 'string' ||
            !Number.isInteger(award.settlement) ||
            typeof award.recipientId !== 'string' ||
            typeof award.fulfilled !== 'boolean' ||
            award.fulfilled && !Number.isInteger(award.fulfilledTurn))
          invalid(where + '.settlementAwards[' + index + ']');
      });
    });
    rows(authority, 'rights', seen, function (value, where) {
      if (!FBDATA.customaryBases[value.basis] ||
          ['peace','revenue','consent'].indexOf(value.power) < 0 ||
          !['active','lapsed','revoked'].includes(value.status) ||
          !Number.isFinite(value.strength) || value.strength < 0 ||
          value.strength > 100 || !Array.isArray(value.history)) invalid(where);
      ref(value.issuer, ['realm'], where + '.issuer');
      ref(value.beneficiary, ['realm','character'], where + '.beneficiary');
      ref(value.scope, ['county'], where + '.scope');
    });
    var obligations = {};
    rows(authority, 'receipts', seen, function (value, where) {
      if (typeof value.obligationId !== 'string' || !value.obligationId ||
          own(obligations, value.obligationId) ||
          !Number.isFinite(value.amount) || value.amount <= 0 ||
          !Number.isInteger(value.turn)) invalid(where);
      obligations[value.obligationId] = true;
    });
    for (var rid in authority.governments) if (own(authority.governments, rid)) {
      var form = authority.governments[rid];
      if (!own(state.realms, rid) || !plain(form) ||
          !FBDATA.governmentForms[form.formId] ||
          !Number.isInteger(form.sinceTurn) ||
          form.eliteCultureId !== undefined &&
            !FBDATA.cultures[form.eliteCultureId] ||
          form.eliteFaithId !== undefined &&
            !((FBDATA.religions || {})[form.eliteFaithId] ||
              (state.faiths || {})[form.eliteFaithId]) ||
          form.legalIdentityId !== undefined &&
            (typeof form.legalIdentityId !== 'string' ||
              !/^[a-z][a-z0-9_]*$/.test(form.legalIdentityId)))
        invalid('authority.governments.' + rid);
    }
    if (authority.civicActors !== undefined) {
      rows(authority, 'civicActors', seen, function (value, where) {
        if (typeof value.siteId !== 'string' ||
            !FBDATA.settlementSites[value.siteId] ||
            typeof value.countyId !== 'string') invalid(where);
      });
    }
    return true;
  };
  P.migrate = function (data) {
    if (!plain(data) || (data.v !== 3 && data.v !== 4) ||
        data.v === 4 && data.authoritySchema !== 4 ||
        !plain(data.state) || !plain(data.state.realms) ||
        !plain(data.state.owner) || !plain(data.state.holder) ||
        !plain(data.state.chars) || !plain(data.state.player) ||
        !plain(data.state.date)) throw new Error(FB.T('Save v4 migration needs a v3 or v4 game state.'));
    var currentMods = FB.mods.sig();
    if (data.mods !== undefined ? data.mods !== currentMods : !!currentMods)
      throw new Error(FB.T('This save uses a different mod set and cannot be migrated.'));
    var bookmarkId = data.state.start && data.state.start.id || '867';
    var bookmark = FBDATA.bookmarks && FBDATA.bookmarks[bookmarkId];
    if (!bookmark) throw new Error(FB.T(
      'Missing bookmark {id} for title migration.', { id:bookmarkId }));
    var state = FB.titleIds.migrateState(data.state, bookmark);
    P.validateAuthority(state.authority, state);
    if (state.authority) state.authority.schema = 4;
    return Object.assign({}, data, { v:4, titleIds:1, authoritySchema:4,
      state:state });
  };
  P.serialize = function () {
    return JSON.stringify(P.migrate(JSON.parse(FB.save.serialize())));
  };
  P.restore = function (data) {
    var migrated = P.migrate(data);
    return FB.save.restore(Object.assign({}, migrated, { v:3 }));
  };
})();