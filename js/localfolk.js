/* Fallowborn - bounded, persistent settlement households. */
window.FB = window.FB || {};

(function () {
  'use strict';

  const HOUSEHOLD_TARGET = 3;
  const ACTIVITY_COOLDOWN = 30;
  const VENUES = ['commons', 'work', 'worship', 'hospitality'];

  function own(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function safeId(value) {
    return String(value || 'county').replace(/[^A-Za-z0-9_-]/g, '_');
  }

  function worldKey(state) {
    const code = String(state && state.seed || 'world');
    const bookmark = state && state.start && state.start.id || '867';
    return code.split('-')[0] + '|' + bookmark;
  }

  function currentLocationId(state) {
    if (!state || !state.player) return null;
    const travel = state.player.travel;
    if (!travel) return state.player.provinceId || null;
    return travel.phase === 'arrived' ? travel.currentId || null : null;
  }
  FB.localFolkCurrentLocationId = currentLocationId;

  function readCounty(state, pid) {
    const table = state && state.localFolk;
    const county = table && typeof table === 'object' && !Array.isArray(table)
      ? table[pid] : null;
    return county && typeof county === 'object' &&
      !Array.isArray(county) && Array.isArray(county.households)
      ? county : null;
  }

  function householdMembers(state, household) {
    const out = [];
    const ids = household && Array.isArray(household.memberIds)
      ? household.memberIds : [];
    for (let i = 0; i < ids.length; i++) {
      const c = state.chars && state.chars[ids[i]];
      if (c) out.push(c);
    }
    return out;
  }

  FB.localFolkAt = function (state, pid, settlement) {
    const county = readCounty(state, pid);
    if (!county) return [];
    const out = [];
    for (let i = 0; i < county.households.length; i++) {
      const household = county.households[i];
      if (!household || (settlement !== undefined && settlement !== null &&
          Number(household.settlement) !== Number(settlement))) continue;
      const members = householdMembers(state, household);
      for (let j = 0; j < members.length; j++) {
        if (!members[j].dead) out.push(members[j]);
      }
    }
    return out;
  };

  FB.localFolkCurrent = function (state) {
    const pid = currentLocationId(state);
    return pid ? FB.localFolkAt(state, pid) : [];
  };

  FB.localFolkRecord = function (state, cid) {
    const c = state && state.chars && state.chars[cid];
    if (!c || !c.localFolk || typeof c.localFolk !== 'object') return null;
    const county = readCounty(state, c.localFolk.provinceId);
    if (!county) return null;
    for (let i = 0; i < county.households.length; i++) {
      const household = county.households[i];
      if (household && household.id === c.localFolk.householdId &&
          Array.isArray(household.memberIds) &&
          household.memberIds.indexOf(c.id) >= 0) {
        return {
          character:c,
          provinceId:c.localFolk.provinceId,
          settlement:Number(household.settlement) || 0,
          household:household,
          role:c.localFolk.role || 'resident'
        };
      }
    }
    return null;
  };

  FB.localFolkHouseholdOf = function (state, cid) {
    const record = FB.localFolkRecord(state, cid);
    if (!record) return null;
    return {
      id:record.household.id,
      provinceId:record.provinceId,
      settlement:record.settlement,
      members:householdMembers(state, record.household),
      role:record.role
    };
  };

  FB.detachLocalFolk = function (state, cid) {
    const record = FB.localFolkRecord(state, cid);
    if (!record) return false;
    const members = record.household.memberIds;
    const at = members.indexOf(cid);
    if (at >= 0) members.splice(at, 1);
    if (!members.length) {
      const county = readCounty(state, record.provinceId);
      const householdAt = county && county.households.indexOf(record.household);
      if (householdAt >= 0) county.households.splice(householdAt, 1);
    }
    delete record.character.localFolk;
    delete record.character.homeProvinceId;
    if (state.player.localActivityTurns) {
      delete state.player.localActivityTurns[cid];
    }
    if (FB.touchFamily) FB.touchFamily();
    if (record.provinceId === currentLocationId(state) ||
        record.provinceId === state.player.provinceId) {
      FB.localFolkEnsure(state, record.provinceId);
    }
    return true;
  };

  FB.localFolkKnown = function (state, cid) {
    if (!state || !state.player || !cid) return false;
    const p = state.player;
    const contacts = p.friendContacts;
    if (contacts && typeof contacts === 'object' && !Array.isArray(contacts) &&
        contacts[cid]) return true;
    if (p.courtingId === cid) return true;
    if (p.socialAttention && p.socialAttention[cid]) return true;
    if (p.rivalContacts && p.rivalContacts[cid]) return true;
    return !!(state.roles &&
      (state.roles.friend === cid || state.roles.rival === cid));
  };

  function professionFor(kind, generation, householdIndex, memberIndex) {
    const pools = {
      village:['farmer', 'farmer', 'craftsman'],
      town:['craftsman', 'merchant', 'farmer'],
      city:['merchant', 'craftsman', 'administration']
    };
    const pool = pools[kind] || pools.village;
    return pool[(generation + householdIndex + memberIndex) % pool.length];
  }

  function stationFor(profession, kind) {
    if (profession === 'farmer') return FB.chance(0.6) ? 0 : 1;
    if (profession === 'merchant' && kind === 'city' && FB.chance(0.25)) {
      return 2;
    }
    return 1;
  }

  function installCareer(state, c, profession, adult) {
    c.career = {
      profession:profession,
      rank:adult ? 'journeyman' : 'unassigned',
      experience:0,
      startedYear:state.date.year,
      guildRank:'none',
      guildStanding:0,
      chosen:!!adult
    };
  }

  function newPerson(state, spec, household, role, index) {
    const id = 'lf_' + safeId(household.provinceId) + '_' +
      household.generation + '_' + index;
    const c = FB.makeCharacter(state, {
      id:id,
      sex:spec.sex,
      culture:spec.culture,
      religion:spec.religion,
      born:spec.born,
      dyn:spec.dyn || null,
      fatherId:spec.fatherId || null,
      motherId:spec.motherId || null,
      station:spec.station,
      unfree:spec.unfree,
      role:'local_folk'
    });
    c.health = spec.health === undefined ? 8 : spec.health;
    c.homeProvinceId = household.provinceId;
    c.localFolk = {
      provinceId:household.provinceId,
      householdId:household.id,
      settlement:household.settlement,
      role:role
    };
    installCareer(state, c, spec.profession || 'farmer',
      FB.ageOf(c, state.date.year) >= 16);
    household.memberIds.push(c.id);
    return c;
  }

  function createHousehold(state, pid, generation, householdIndex) {
    const pr = FB.world && FB.world.byId && FB.world.byId[pid];
    const settlements = FB.settlementsOf(state, pid);
    const settlementIndex = householdIndex % Math.max(1,
      Math.min(3, settlements.length));
    const settlement = settlements[settlementIndex] || settlements[0];
    const me = state.chars[state.player.charId];
    const culture = pr && pr.culture || me && me.culture;
    const religion = pr && pr.religion || me && me.religion;
    const household = {
      id:'lfh_' + safeId(pid) + '_' + generation,
      provinceId:pid,
      generation:generation,
      settlement:settlementIndex,
      memberIds:[]
    };
    const scope = 'local-folk|' + worldKey(state) + '|' + pid + '|' + generation;
    return FB.withSeed(scope, function () {
      const kind = settlement && settlement.kind || 'village';
      if (householdIndex < 2) {
        const fatherAge = FB.ri(24, 50);
        const motherAge = FB.clamp(fatherAge + FB.ri(-6, 5), 20, 48);
        const fatherProfession = professionFor(kind, generation,
          householdIndex, 0);
        const fatherStation = stationFor(fatherProfession, kind);
        const father = newPerson(state, {
          sex:'m', culture:culture, religion:religion,
          born:state.date.year - fatherAge,
          station:fatherStation, unfree:fatherStation === 0,
          profession:fatherProfession
        }, household, 'adult', 0);
        father.dyn = FB.dynastyName(culture, father.name,
          pr ? pr.name : pid, father.sex);
        const motherProfession = professionFor(kind, generation,
          householdIndex, 1);
        const motherStation = stationFor(motherProfession, kind);
        const mother = newPerson(state, {
          sex:'f', culture:culture, religion:religion,
          born:state.date.year - motherAge,
          dyn:father.dyn,
          station:motherStation, unfree:motherStation === 0,
          profession:motherProfession
        }, household, 'adult', 1);
        father.spouseId = mother.id;
        mother.spouseId = father.id;
        const childCount = FB.ri(1, 2);
        const oldest = Math.max(0, Math.min(15,
          Math.min(fatherAge, motherAge) - 17));
        for (let childIndex = 0; childIndex < childCount; childIndex++) {
          const age = oldest ? FB.ri(0, oldest) : 0;
          const child = newPerson(state, {
            culture:culture, religion:religion,
            born:state.date.year - age,
            dyn:father.dyn,
            fatherId:father.id, motherId:mother.id,
            station:Math.max(fatherStation, motherStation),
            unfree:fatherStation === 0 && motherStation === 0,
            profession:'farmer', health:7
          }, household, 'child', childIndex + 2);
          father.childrenIds.push(child.id);
          mother.childrenIds.push(child.id);
        }
      } else {
        const adultCount = FB.ri(1, 2);
        let dynasty = null;
        for (let adultIndex = 0; adultIndex < adultCount; adultIndex++) {
          const profession = professionFor(kind, generation,
            householdIndex, adultIndex);
          const station = stationFor(profession, kind);
          const adult = newPerson(state, {
            culture:culture, religion:religion,
            born:state.date.year - FB.ri(18, 48),
            dyn:dynasty,
            station:station, unfree:station === 0,
            profession:profession
          }, household, adultCount > 1 ? 'sibling' : 'adult', adultIndex);
          if (!dynasty) {
            dynasty = FB.dynastyName(culture, adult.name,
              pr ? pr.name : pid, adult.sex);
            adult.dyn = dynasty;
          }
        }
      }
      return household;
    });
  }

  function ensureTable(state) {
    if (!state.localFolk || typeof state.localFolk !== 'object' ||
        Array.isArray(state.localFolk)) state.localFolk = {};
    return state.localFolk;
  }

  FB.localFolkEnsure = function (state, pid) {
    if (!state || !state.player || !state.chars || !pid ||
        !FB.world.byId[pid] || FB.world.byId[pid].wasteland) return null;
    const table = ensureTable(state);
    let county = readCounty(state, pid);
    if (!county) {
      county = table[pid] = { nextGeneration:0, households:[] };
    }
    county.nextGeneration = Math.max(0,
      Math.floor(Number(county.nextGeneration) || 0));
    county.households = county.households.filter(function (household) {
      return household && Array.isArray(household.memberIds);
    });
    for (let householdIndex = 0;
         householdIndex < county.households.length; householdIndex++) {
      const generation = Math.floor(Number(
        county.households[householdIndex].generation));
      if (isFinite(generation) && generation >= county.nextGeneration) {
        county.nextGeneration = generation + 1;
      }
    }
    while (county.households.length < HOUSEHOLD_TARGET) {
      const generation = county.nextGeneration++;
      county.households.push(createHousehold(state, pid, generation,
        county.households.length));
    }
    return county;
  };

  function queueReferences(state, cid) {
    const queue = state.eventQueue || [];
    for (let i = 0; i < queue.length; i++) {
      const participants = queue[i] && queue[i].ctx && queue[i].ctx.participants;
      if (!participants) continue;
      for (const slot in participants) if (own(participants, slot) &&
          participants[slot] === cid) return true;
    }
    return false;
  }

  function connected(state, c) {
    if (!c) return false;
    const p = state.player;
    if (FB.localFolkKnown(state, c.id) || queueReferences(state, c.id)) return true;
    if (p.plot && (p.plot.targetId === c.id || p.plot.charId === c.id)) return true;
    const retainers = p.retainers || [];
    for (let i = 0; i < retainers.length; i++) {
      if (retainers[i] && retainers[i].charId === c.id) return true;
    }
    if (FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(state, c.id)) return true;
    if (c.spouseId && c.spouseId !== p.charId) {
      const spouse = state.chars[c.spouseId];
      if (spouse && !spouse.localFolk) return true;
    }
    if (c.spouseId === p.charId || c.betrothedId === p.charId) return true;
    return false;
  }

  function removeHousehold(state, household) {
    const ids = household && household.memberIds || [];
    for (let i = 0; i < ids.length; i++) {
      const c = state.chars[ids[i]];
      if (c && c.localFolk && !connected(state, c)) delete state.chars[ids[i]];
    }
  }

  FB.localFolkPrune = function (state) {
    if (!state || !state.player || !state.localFolk ||
        typeof state.localFolk !== 'object') {
      return;
    }
    const homeId = state.player.provinceId;
    const currentId = currentLocationId(state);
    let changed = false;
    const activityTurns = state.player.localActivityTurns;
    if (activityTurns && typeof activityTurns === 'object' &&
        !Array.isArray(activityTurns)) {
      for (const cid in activityTurns) if (own(activityTurns, cid)) {
        const activityCharacter = state.chars[cid];
        if (!activityCharacter || activityCharacter.dead ||
            !activityCharacter.localFolk) delete activityTurns[cid];
      }
    }
    for (const pid in state.localFolk) if (own(state.localFolk, pid)) {
      const county = readCounty(state, pid);
      if (!county) {
        delete state.localFolk[pid];
        changed = true;
        continue;
      }
      const active = pid === homeId || pid === currentId;
      const kept = [];
      for (let i = 0; i < county.households.length; i++) {
        const household = county.households[i];
        const members = householdMembers(state, household);
        const memberIds = [];
        for (let memberIndex = 0; memberIndex < members.length; memberIndex++) {
          const member = members[memberIndex];
          if (member.dead && !connected(state, member)) {
            delete state.chars[member.id];
            changed = true;
          } else {
            memberIds.push(member.id);
          }
        }
        household.memberIds = memberIds;
        const retainedMembers = householdMembers(state, household);
        const live = retainedMembers.filter(function (c) { return !c.dead; });
        const keep = live.length && (active || retainedMembers.some(function (c) {
          return connected(state, c);
        }));
        if (keep) kept.push(household);
        else {
          removeHousehold(state, household);
          changed = true;
        }
      }
      county.households = kept;
      if (!active && !kept.length) delete state.localFolk[pid];
    }
    if (changed && FB.touchFamily) FB.touchFamily();
  };

  FB.localFolkArrive = function (state, pid) {
    if (state && state.player && (!state.player.localActivityTurns ||
        typeof state.player.localActivityTurns !== 'object' ||
        Array.isArray(state.player.localActivityTurns))) {
      state.player.localActivityTurns = {};
    }
    FB.localFolkPrune(state);
    return FB.localFolkEnsure(state, pid);
  };

  FB.localFolkYear = function (state) {
    if (!state || !state.player) return;
    FB.localFolkPrune(state);
    FB.localFolkEnsure(state, state.player.provinceId);
    const currentId = currentLocationId(state);
    if (currentId && currentId !== state.player.provinceId) {
      FB.localFolkEnsure(state, currentId);
    }
    for (const pid in state.localFolk) if (own(state.localFolk, pid)) {
      const county = readCounty(state, pid);
      if (!county) continue;
      for (let householdIndex = 0;
           householdIndex < county.households.length; householdIndex++) {
        const members = householdMembers(state, county.households[householdIndex]);
        for (let memberIndex = 0; memberIndex < members.length; memberIndex++) {
          const c = members[memberIndex];
          if (c.dead || !c.localFolk || c.localFolk.role !== 'child' ||
              FB.ageOf(c, state.date.year) < 16) continue;
          c.localFolk.role = 'adult';
          if (c.career) {
            c.career.rank = 'journeyman';
            c.career.chosen = true;
            c.career.startedYear = state.date.year;
          }
        }
      }
    }
  };

  FB.localFolkVenue = function (state, cid, venue) {
    const record = FB.localFolkRecord(state, cid);
    const c = record && record.character;
    const settlements = record ? FB.settlementsOf(state, record.provinceId) : [];
    const settlement = record && settlements[record.settlement];
    const labels = {
      commons:FB.T('The commons'),
      work:FB.T('Shared work'),
      worship:FB.T('The {temple}', {
        temple:c && FB.templeWord
          ? FB.templeWord(c.religion, state) : FB.T('worship place')
      }),
      hospitality:settlement && (settlement.kind === 'town' ||
        settlement.kind === 'city' || record.settlement === 0)
        ? FB.T('Market and hospitality') : FB.T('Hearth and hospitality')
    };
    return VENUES.indexOf(venue) >= 0 ? {
      id:venue, label:labels[venue],
      eventId:'local_folk_' + venue
    } : null;
  };

  FB.localFolkActivityStatus = function (state, cid, venue) {
    const record = FB.localFolkRecord(state, cid);
    const c = record && record.character;
    const venueRecord = FB.localFolkVenue(state, cid, venue);
    const p = state && state.player;
    const me = p && state.chars[p.charId];
    const turns = p && p.localActivityTurns;
    const lastTurn = turns && typeof turns === 'object' &&
      !Array.isArray(turns) && isFinite(Number(turns[cid]))
      ? Number(turns[cid]) : null;
    const remaining = lastTurn === null ? 0 : Math.max(0,
      ACTIVITY_COOLDOWN - (state.turn - lastTurn));
    const status = {
      ready:false, relevant:!!record, known:FB.localFolkKnown(state, cid),
      remaining:remaining, cooldown:ACTIVITY_COOLDOWN,
      venue:venueRecord, reason:'', character:c
    };
    if (!record || !c || c.dead || !venueRecord) {
      status.reason = FB.T('That local meeting is no longer available.');
    } else if (!me || me.dead || FB.ageOf(me, state.date.year) < 16) {
      status.reason = FB.T('You must be at least 16 to join local activities.');
    } else if (FB.ageOf(c, state.date.year) < 16) {
      status.reason = FB.T('Children are shown with their household but cannot be activity partners.');
    } else if ((p.flags && p.flags.in_prison) ||
        (FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(state, me.id))) {
      status.reason = FB.T('A captive cannot join local activities.');
    } else if (currentLocationId(state) !== record.provinceId) {
      status.reason = state.player.travel && state.player.travel.phase !== 'arrived'
        ? FB.T('Reach a destination before meeting local people.')
        : FB.T('You must be in their county to meet them.');
    } else if (remaining) {
      status.reason = FB.T('Available again in {days} days.', {
        days:remaining
      });
    } else {
      status.ready = true;
    }
    return status;
  };

  FB.beginLocalFolkActivity = function (state, cid, venue) {
    const status = FB.localFolkActivityStatus(state, cid, venue);
    if (!status.ready || !FB.queueEvent) return false;
    const record = FB.localFolkRecord(state, cid);
    const settlements = FB.settlementsOf(state, record.provinceId);
    const settlement = settlements[record.settlement];
    const item = FB.queueEvent(state, status.venue.eventId, {
      localFolkId:cid,
      localFolkVenue:venue,
      localFolkProvinceId:record.provinceId,
      localFolkSettlement:record.settlement,
      settlement:settlement ? settlement.name : record.provinceId,
      participants:{ resident:cid },
      participantKinds:{ resident:'contact' }
    });
    return !!item;
  };

  FB.localFolkActivityContextValid = function (state, ctx) {
    const cid = ctx && ctx.localFolkId;
    const status = cid && FB.localFolkActivityStatus(
      state, cid, ctx.localFolkVenue);
    const record = status && status.ready
      ? FB.localFolkRecord(state, cid) : null;
    return !!(record && ctx.participants &&
      ctx.participants.resident === cid &&
      ctx.localFolkProvinceId === record.provinceId &&
      Number(ctx.localFolkSettlement) === record.settlement);
  };

  FB.resolveLocalFolkActivity = function (state, ctx) {
    const cid = ctx && ctx.localFolkId;
    const c = cid && state.chars[cid];
    if (!c || c.dead || !FB.localFolkRecord(state, cid)) return false;
    if (!state.player.localActivityTurns ||
        typeof state.player.localActivityTurns !== 'object' ||
        Array.isArray(state.player.localActivityTurns)) {
      state.player.localActivityTurns = {};
    }
    state.player.localActivityTurns[cid] = state.turn;
    if (FB.noteFriendContact) {
      FB.noteFriendContact(state, c, {
        source:'local_folk', cultivated:false
      });
    }
    return true;
  };
})();
