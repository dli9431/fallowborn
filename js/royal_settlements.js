/* Living dynastic branches and negotiated regional government. These helpers
   contain no bookmark, historical-person or calendar selectors. */
(function () {
  'use strict';
  var linkedCourts = new WeakMap();
  function clone(row) { return JSON.parse(JSON.stringify(row)); }
  function branchId(rid, source, id) { return 'royal_' + rid + '_branch_' + source + '_' + id; }
  function copyBranch(s, rid, source, parentId) {
    var links = linkedCourts.get(s);
    if (!links) { links = {}; linkedCourts.set(s, links); }
    if (!links[source]) links[source] = {};
    links[source][rid] = true;
    var family = s.realms[rid].succession, other = s.realms[source].succession;
    var opening = Object.keys(other.members).filter(function (id) {
      return other.members[id].reignGeneration === 1 ||
        other.members[id].localId === 'ruler';
    })[0] || other.rulerMemberId;
    function mapped(id) { return id ? branchId(rid, source, id) : null; }
    for (var id in other.members) {
      var original = other.members[id], row = clone(original), bid = mapped(id);
      delete row.localId;
      row.id = bid; row.branchRef = { realmId:source, memberId:id, parentId:parentId };
      // A son's consort is not the borrowing sovereign's consort.
      row.role = null;
      row.parentId = id === opening ? parentId : mapped(original.parentId);
      row.fatherId = id === opening ? parentId : mapped(original.fatherId);
      row.motherId = id === opening ? null : mapped(original.motherId);
      row.spouseMemberId = mapped(original.spouseMemberId);
      row.childIds = (original.childIds || []).map(mapped);
      row.siblingIds = (original.siblingIds || []).map(mapped);
      family.members[bid] = row;
    }
    var root = family.members[mapped(opening)], parent = family.members[parentId];
    if (parent && parent.childIds.indexOf(root.id) < 0) parent.childIds.push(root.id);
    var child = root.charId && s.chars[root.charId];
    if (child && parent && parent.charId) {
      child.fatherId = parent.charId;
      var father = s.chars[parent.charId];
      if (father && father.childrenIds.indexOf(child.id) < 0) father.childrenIds.push(child.id);
    }
    return root;
  }
  FB.linkRoyalBranch = function (s, rid, source, parentId) {
    var realm = s.realms[rid], other = s.realms[source];
    if (!realm || !other || !realm.alive || !other.alive || rid === source ||
        !realm.succession || !other.succession ||
        !realm.succession.members[parentId] || realm.succession.members[parentId].sex !== 'm' ||
        Object.keys(other.succession.members).some(function (id) { return !!other.succession.members[id].branchRef; }) ||
        FB.topRealm(s, source) !== rid) return null;
    var root = copyBranch(s, rid, source, parentId), family = realm.succession;
    family.dynasticOrder = family.dynasticOrder || family.order.slice();
    if (family.dynasticOrder.indexOf(root.id) < 0) family.dynasticOrder.push(root.id);
    FB.refreshRealmSuccession(s, rid);
    if (FB.touchFamily) FB.touchFamily();
    return root;
  };
  FB.syncRoyalBranches = function (s, rid) {
    var family = s.realms[rid] && s.realms[rid].succession, sources = {};
    if (!family) return;
    for (var id in family.members) {
      var row = family.members[id], ref = row.branchRef;
      if (ref && !sources[ref.realmId]) sources[ref.realmId] = ref.parentId;
    }
    for (var source in sources) {
      var other = s.realms[source];
      if (other && other.succession) copyBranch(s, rid, source, sources[source]);
    }
  };
  FB.syncLinkedRoyalCourts = function (s, source) {
    var links = linkedCourts.get(s), parents = links && links[source];
    if (!parents) return;
    for (var rid in parents) if (s.realms[rid] && s.realms[rid].alive)
      FB.refreshRealmSuccession(s, rid);
  };
  FB.materializeRoyalBranch = function (s, rid, memberId, opts) {
    var family = s.realms[rid] && s.realms[rid].succession;
    var row = family && family.members[memberId], ref = row && row.branchRef;
    var source = ref && s.realms[ref.realmId];
    var original = source && source.succession && source.succession.members[ref.memberId];
    if (!source || !source.alive || !original || original.branchRef) return null;
    // A compact borrowed member is filled by its own court's seeded stream.
    var person = original.role === 'consort'
      ? FB.materializeRealmConsort(s, ref.realmId, opts)
      : FB.materializeRoyalChild(s, ref.realmId, ref.memberId, opts);
    FB.syncRoyalBranches(s, rid);
    return person;
  };
  FB.linkedRoyalKinSnapshot = function (s, a, b) {
    if (!a || !b || !a.royalLine || !b.royalLine) return null;
    var al = a.royalLine, bl = b.royalLine, candidates = {}, links = linkedCourts.get(s) || {};
    if (al.realmId === bl.realmId || !links[al.realmId] && !links[bl.realmId]) return null;
    candidates[al.realmId] = true; candidates[bl.realmId] = true;
    for (var rid in links[al.realmId] || {}) candidates[rid] = true;
    for (var rid in links[bl.realmId] || {}) candidates[rid] = true;
    for (var rid in candidates) {
      var family = s.realms[rid] && s.realms[rid].succession;
      if (!family || !family.members) continue;
      var aid = al.realmId === rid ? al.memberId : branchId(rid, al.realmId, al.memberId);
      var bid = bl.realmId === rid ? bl.memberId : branchId(rid, bl.realmId, bl.memberId);
      if (family.members[aid] && family.members[bid]) return { family:family,
        a:{ royalLine:{ realmId:rid, memberId:aid } }, b:{ royalLine:{ realmId:rid, memberId:bid } } };
    }
    return null;
  };
  /* Accession consolidates the heir's own court, whether subordinate or
     independent. Characters keep identity; the retired court keeps genealogy. */
  FB.absorbRoyalBranch = function (s, rid, source) {
    var realm = s.realms[rid], other = s.realms[source];
    if (!realm || !other || !other.alive ||
        other.liege && FB.topRealm(s, source) !== rid) return false;
    var family = realm.succession;
    for (var id in family.members) {
      var row = family.members[id], ref = row.branchRef;
      if (!ref || ref.realmId !== source) continue;
      var original = other.succession.members[ref.memberId], c = row.charId && s.chars[row.charId];
      if (c) c.royalLine = { realmId:rid, memberId:id };
      row.role = original && original.role || null;
      if (row.role === 'consort' && row.consortGen === other.succession.rulerGeneration)
        row.consortGen = (family.rulerGeneration || 1) + 1;
      if (original) original.charId = null;
      delete row.branchRef;
    }
    for (var pid in s.holder) if (s.holder[pid] === source) s.holder[pid] = rid;
    for (var pid in s.owner) if (s.owner[pid] === source) s.owner[pid] = rid;
    for (var vid in s.realms) if (s.realms[vid].liege === source) s.realms[vid].liege = rid;
    if (s.player.liege === source && FB.changePlayerLiege) FB.changePlayerLiege(s, rid, 'realm:inheritance');
    if (FB.mergeRealmTech) FB.mergeRealmTech(s, rid, source);
    if (FB.remapWarRealm) FB.remapWarRealm(s, source, rid);
    FB.markRealmDead(s, source, { recipientId:rid });
    FB.invalidateRealmCache(); FB.rebuildRulerIndex(s);
    if (FB.touchFamily) FB.touchFamily();
    return true;
  };
  FB.designateRoyalHeir = function (s, rid, memberId) {
    var family = FB.refreshRealmSuccession(s, rid);
    if (!family || family.order.indexOf(memberId) < 0) return false;
    family.designatedHeirId = memberId;
    FB.refreshRealmSuccession(s, rid);
    return true;
  };
  FB.royalBranchEligible = function (s, rid, member) {
    var ref = member && member.branchRef, other = ref && s.realms[ref.realmId];
    var root = other && other.succession && other.succession.members[other.succession.rulerMemberId];
    return !ref || !other || !other.alive || !root || root.charId !== member.charId ||
      !other.liege || FB.topRealm(s, other.id) === rid;
  };
  /* A grant moves complete direct-subject territories together. A partial
     duchy or another sovereign's county cannot be silently confiscated. */
  FB.royalRegionQuote = function (s, rid, counties, peaceParties) {
    var realm = s.realms[rid], selected = {}, branches = {};
    if (!realm || !realm.alive || realm.liege || rid === 'player' ||
        !Array.isArray(counties) || !counties.length) return null;
    if (FB.isRealmAtWar(s, rid) && (!Array.isArray(peaceParties) ||
        FB.greatHolyWarCamp && FB.greatHolyWarCamp(s, rid) ||
        !FB.realmWars(s, rid).length || FB.realmWars(s, rid).some(function (war) {
          return peaceParties.indexOf(war.attacker) < 0 || peaceParties.indexOf(war.defender) < 0;
        }))) return null;
    for (var pid of counties) {
      if (selected[pid] || s.owner[pid] !== rid) return null;
      selected[pid] = true;
    }
    for (var county of counties) {
      var holder = s.holder[county] || rid;
      if (holder === rid) continue;
      var seen = {};
      while (s.realms[holder] && s.realms[holder].liege !== rid && !seen[holder]) {
        seen[holder] = true; holder = s.realms[holder].liege;
      }
      if (!holder || !s.realms[holder] || s.realms[holder].liege !== rid || holder === 'player') return null;
      branches[holder] = true;
    }
    for (var branch in branches)
      if (FB.realmTerritory(s, branch).some(function (pid) { return !selected[pid]; })) return null;
    return { counties:counties.slice(), branches:Object.keys(branches) };
  };
  FB.grantRoyalRegion = function (s, rid, recipient, counties) {
    var quote = FB.royalRegionQuote(s, rid, counties), target = s.realms[recipient];
    if (!quote || !target || !target.alive || recipient === rid ||
        target.liege && target.liege !== rid || FB.isRealmAtWar(s, recipient)) return false;
    for (var branch of quote.branches) if (branch !== recipient) s.realms[branch].liege = recipient;
    for (var pid of counties) if (s.holder[pid] === rid) s.holder[pid] = recipient;
    if (!target.liege) for (var pid of counties) s.owner[pid] = recipient;
    FB.invalidateRealmCache();
    return true;
  };
  FB.releaseRoyalRegion = function (s, rid, recipient) {
    var target = s.realms[recipient];
    if (!target || !target.alive || target.liege !== rid || rid === 'player' ||
        recipient === 'player' || FB.isRealmAtWar(s, rid) || FB.isRealmAtWar(s, recipient)) return false;
    var counties = FB.realmTerritory(s, recipient);
    if (!counties.length || counties.some(function (pid) { return s.owner[pid] !== rid; })) return false;
    target.liege = null;
    for (var pid of counties) s.owner[pid] = recipient;
    FB.invalidateRealmCache();
    if (FB.mergeRealmTech) FB.mergeRealmTech(s, recipient, rid);
    return true;
  };
})();
