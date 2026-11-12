// Unchanged detached decoder and expansion from js/save.js at
// 1d5b1591bc55db1c1287a49a27fd07d16898e807. Development-only oracle.
(function () {
  'use strict';
  function own(row, key) { return Object.prototype.hasOwnProperty.call(row, key); }
  function inflateState(state) {
    if (!state) return state;
    const chars = state.chars || {};
    for (const id in chars) {
      const c = chars[id];
      if (!c) continue;
      if (!own(c, 'id')) c.id = id;
      if (!own(c, 'dead')) c.dead = false;
      if (!own(c, 'role')) c.role = null;
      if (!own(c, 'dyn')) c.dyn = null;
      if (!own(c, 'station')) c.station = null;
      if (!own(c, 'opinion')) c.opinion = 0;
      if (!own(c, 'fertility')) c.fertility = 1;
      if (!own(c, 'health')) c.health = 8;
      if (!own(c, 'faithStandingBase')) c.faithStandingBase = 0;
      if (!own(c, 'fatherId')) c.fatherId = null;
      if (!own(c, 'motherId')) c.motherId = null;
      if (!own(c, 'spouseId')) c.spouseId = null;
      if (c.royalLine && !own(c.royalLine, 'memberId') &&
          id.indexOf('ro_') === 0) {
        c.royalLine.memberId = 'royal_' + id.slice(3);
      }
      if (!Array.isArray(c.traits)) c.traits = [];
      if (!Array.isArray(c.childrenIds)) c.childrenIds = [];
    }
    const realmTech = state.realmTech || {};
    for (const rid in realmTech) {
      const record = realmTech[rid];
      if (!record) continue;
      if (!Array.isArray(record.completed)) record.completed = [];
      if (!Array.isArray(record.exposed)) record.exposed = [];
      if (!Array.isArray(record.active)) record.active = [];
      if (!own(record, 'reserve')) record.reserve = 0;
      if (!record.progress || typeof record.progress !== 'object') record.progress = {};
      if (!record.priorities || typeof record.priorities !== 'object') {
        record.priorities = {};
      }
      for (const id of record.completed) {
        if (record.exposed.indexOf(id) < 0) record.exposed.push(id);
      }
    }
    const realms = state.realms || {};
    for (const rid in realms) {
      const realm = realms[rid];
      if (!realm) continue;
      if (!own(realm, 'id')) realm.id = rid;
      if (!own(realm, 'alive')) realm.alive = true;
      if (!own(realm, 'liege')) realm.liege = null;
      if (!own(realm, 'aggression')) realm.aggression = 0;
      if (!own(realm, 'war')) realm.war = null;
      if (!own(realm, 'op')) realm.op = 0;
      const succession = realm.succession;
      const members = succession && succession.members;
      if (!members) continue;
      if (!own(succession, 'heirId')) {
        succession.heirId = succession.order && succession.order.length
          ? succession.order[0] : null;
      }
      const omittedCharIds = {};
      for (const id in members) {
        const member = members[id];
        if (!member) continue;
        if (!own(member, 'id')) member.id = id;
        if (!own(member, 'alive')) member.alive = !own(member, 'died');
        if (!own(member, 'role')) member.role = null;
        if (!own(member, 'parentId')) member.parentId = null;
        if (!own(member, 'charId')) {
          member.charId = null;
          omittedCharIds[id] = true;
        }
        if (!Array.isArray(member.childIds)) member.childIds = [];
      }
      for (const id in members) {
        const member = members[id];
        if (!member) continue;
        const parentIds = succession.authoredCourt
          ? [member.fatherId, member.motherId] : [member.parentId];
        for (const parentId of parentIds) {
          const parent = parentId && members[parentId];
          if (parent && parent.childIds.indexOf(id) < 0) parent.childIds.push(id);
        }
        if (!member || !omittedCharIds[id] || id.indexOf('royal_') !== 0) continue;
        const charId = 'ro_' + id.slice('royal_'.length);
        const c = chars[charId];
        if (c && c.royalLine && c.royalLine.realmId === rid &&
            c.royalLine.memberId === id) member.charId = charId;
      }
    }
    const buildings = state.buildings || {};
    for (const pid in buildings) {
      const list = buildings[pid];
      if (!Array.isArray(list)) continue;
      for (let i = 0; i < list.length; i++) {
        const record = list[i];
        if (record && typeof record === 'object' && !own(record, 's')) {
          record.s = 0;
        }
      }
    }
    return state;
  }

  // Semantic validators that resolve current people need the same explicit
  // codec fields as live readers. Expand a detached copy without adopting it
  // or running any load repair, story initialization, RNG or identity hook.
  window.snapshotReference = function (state) {
    return inflateState(JSON.parse(JSON.stringify(state)));
  };

})();
