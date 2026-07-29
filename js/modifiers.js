/* Fallowborn — temporary county and player-participation campaign modifiers.
   Records are small JSON-safe {id,endTurn?,sourceEventId?} values. County
   records stay with their province; campaign records live on the active
   great holy war. */
window.FB = window.FB || {};

(function () {
  'use strict';

  function own(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function definition(id, scope) {
    const def = FBDATA.modifiers && FBDATA.modifiers[id];
    if (!def || (def.scope !== 'county' && def.scope !== 'campaign')) return null;
    return scope && def.scope !== scope ? null : def;
  }

  function validEnd(record) {
    return !own(record, 'endTurn') ||
      (typeof record.endTurn === 'number' && isFinite(record.endTurn));
  }

  function repairList(list, scope) {
    if (!Array.isArray(list)) return [];
    const byId = Object.create(null), order = [];
    for (let i = 0; i < list.length; i++) {
      const raw = list[i];
      if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
          typeof raw.id !== 'string' || !definition(raw.id, scope) ||
          !validEnd(raw)) continue;
      const next = { id:raw.id };
      if (own(raw, 'endTurn')) next.endTurn = raw.endTurn;
      if (typeof raw.sourceEventId === 'string' && raw.sourceEventId) {
        next.sourceEventId = raw.sourceEventId;
      }
      if (!byId[raw.id]) {
        byId[raw.id] = next;
        order.push(raw.id);
      } else if (!own(byId[raw.id], 'endTurn') || !own(next, 'endTurn')) {
        delete byId[raw.id].endTurn;
      } else if (next.endTurn > byId[raw.id].endTurn) {
        byId[raw.id].endTurn = next.endTurn;
      }
      if (next.sourceEventId) {
        byId[raw.id].sourceEventId = next.sourceEventId;
      }
    }
    const out = [];
    for (let j = 0; j < order.length; j++) out.push(byId[order[j]]);
    return out;
  }

  function repairStorage(state) {
    if (!state.modifiers || typeof state.modifiers !== 'object' ||
        Array.isArray(state.modifiers)) state.modifiers = {};
    if (!state.modifiers.county || typeof state.modifiers.county !== 'object' ||
        Array.isArray(state.modifiers.county)) state.modifiers.county = {};
    const county = state.modifiers.county;
    for (const pid in county) {
      if (!own(county, pid)) continue;
      if (!FB.world || !FB.world.byId || !FB.world.byId[pid]) {
        delete county[pid];
        continue;
      }
      county[pid] = repairList(county[pid], 'county');
      if (!county[pid].length) delete county[pid];
    }
    const campaign = state.greatHolyWar;
    if (campaign && typeof campaign === 'object') {
      campaign.modifiers = repairList(campaign.modifiers, 'campaign');
    }
    return state.modifiers;
  }

  function listFor(state, scope, pid, create) {
    repairStorage(state);
    if (scope === 'county') {
      if (!pid || !FB.world.byId[pid]) return null;
      if (!state.modifiers.county[pid] && create) state.modifiers.county[pid] = [];
      return state.modifiers.county[pid] || [];
    }
    if (scope === 'campaign') {
      const campaign = state.greatHolyWar;
      if (!campaign || (campaign.phase !== 'preparation' &&
          campaign.phase !== 'active' && campaign.phase !== 'settlement')) return null;
      if (!Array.isArray(campaign.modifiers) && create) campaign.modifiers = [];
      return campaign.modifiers || [];
    }
    return null;
  }

  function active(record, state) {
    return !!record && (!own(record, 'endTurn') || state.turn < record.endTurn);
  }

  function notice(state, id, scope, pid, gained) {
    const params = {
      modifier:FB.dataParam('modifier', id, 'name')
    };
    if (scope === 'county') {
      const province = FB.world.byId[pid];
      params.province = province ? province.name : pid;
      if (gained) {
        FB.news(state, FB.msg('news.modifier.county_gained',
          '◈ {modifier} takes hold in {province}.', params));
      } else {
        FB.news(state, FB.msg('news.modifier.county_expired',
          '◇ {modifier} ends in {province}.', params));
      }
    } else {
      if (gained) {
        FB.news(state, FB.msg('news.modifier.campaign_gained',
          '◈ {modifier} now shapes your part in the campaign.', params));
      } else {
        FB.news(state, FB.msg('news.modifier.campaign_expired',
          '◇ {modifier} no longer shapes your part in the campaign.', params));
      }
    }
  }

  FB.countyModifierRecords = function (state, pid) {
    const list = listFor(state, 'county', pid, false) || [];
    return list.filter(function (record) { return active(record, state); });
  };
  /* Read-only projection for overview surfaces whose open/navigation contract
     must not repair or create save state. Simulation and Land retain the
     authoritative repairing reader above. */
  FB.countyModifierSnapshot = function (state, pid) {
    if (!state || !pid || !FB.world || !FB.world.byId ||
        !FB.world.byId[pid]) return [];
    const county = state.modifiers && state.modifiers.county;
    const list = county && county[pid];
    return repairList(list, 'county').filter(function (record) {
      return active(record, state);
    });
  };
  FB.campaignModifierRecords = function (state) {
    const list = listFor(state, 'campaign', null, false) || [];
    return list.filter(function (record) { return active(record, state); });
  };
  FB.activeCountyModifiers = FB.countyModifierRecords;
  FB.activeCampaignModifiers = FB.campaignModifierRecords;

  FB.addModifier = function (state, id, pid, options) {
    const def = definition(id);
    if (!state || !def) return false;
    const list = listFor(state, def.scope, pid, true);
    if (!list) return false;
    let record = null;
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) { record = list[i]; break; }
    }
    const endTurn = def.days === undefined ? null :
      state.turn + Math.max(0, Math.floor(Number(def.days) || 0));
    if (record) {
      if (endTurn === null) delete record.endTurn;
      else record.endTurn = endTurn;
      if (options && typeof options.sourceEventId === 'string' &&
          options.sourceEventId) {
        record.sourceEventId = options.sourceEventId;
      }
      return true;
    }
    record = { id:id };
    if (endTurn !== null) record.endTurn = endTurn;
    if (options && typeof options.sourceEventId === 'string' &&
        options.sourceEventId) {
      record.sourceEventId = options.sourceEventId;
    }
    list.push(record);
    if (!(options && options.silent)) notice(state, id, def.scope, pid, true);
    return true;
  };

  FB.removeModifier = function (state, id, pid, options) {
    const def = definition(id);
    if (!state || !def) return false;
    const list = listFor(state, def.scope, pid, false);
    if (!list) return false;
    let removed = false;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].id !== id) continue;
      list.splice(i, 1);
      removed = true;
    }
    if (def.scope === 'county' && !list.length) delete state.modifiers.county[pid];
    if (removed && options && options.notice) notice(state, id, def.scope, pid, false);
    return removed;
  };

  FB.hasModifier = function (state, id, pid) {
    const def = definition(id);
    if (!state || !def) return false;
    const list = def.scope === 'county'
      ? FB.countyModifierRecords(state, pid)
      : FB.campaignModifierRecords(state);
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return true;
    return false;
  };

  FB.modBonus = function (state, key, pid) {
    let sum = 0;
    const list = FB.countyModifierRecords(state, pid);
    for (let i = 0; i < list.length; i++) {
      const def = definition(list[i].id, 'county');
      if (def && def.fx && typeof def.fx[key] === 'number') sum += def.fx[key];
    }
    return sum;
  };

  FB.campaignModifierApplies = function (state) {
    const campaign = state && state.greatHolyWar;
    const pledge = state && state.player && state.player.greatHolyWar;
    return !!(campaign && (campaign.phase === 'preparation' || campaign.phase === 'active') &&
      pledge && pledge.campaignId === campaign.id && pledge.vow &&
      !pledge.withdrawn && !pledge.renewalRequired);
  };

  FB.campaignModBonus = function (state, key) {
    if (!FB.campaignModifierApplies(state)) return 0;
    let sum = 0;
    const list = FB.campaignModifierRecords(state);
    for (let i = 0; i < list.length; i++) {
      const def = definition(list[i].id, 'campaign');
      if (def && def.fx && typeof def.fx[key] === 'number') sum += def.fx[key];
    }
    return sum;
  };

  FB.campaignHostModBonus = function (state, key) {
    if (!FB.playerGreatHolyWarHostActive ||
        !FB.playerGreatHolyWarHostActive(state)) return 0;
    return FB.campaignModBonus(state, key);
  };

  FB.modifierUpkeepEntries = function (state, key) {
    key = key || 'gold';
    const out = [];
    const demesne = FB.demesne ? FB.demesne(state) : (state.player.provs || []);
    for (let p = 0; p < demesne.length; p++) {
      const pid = demesne[p], list = FB.countyModifierRecords(state, pid);
      for (let i = 0; i < list.length; i++) {
        const def = definition(list[i].id, 'county');
        const amount = def && def.upkeep && Number(def.upkeep[key]);
        if (amount) out.push({
          id:list[i].id, pid:pid, amount:amount, record:list[i]
        });
      }
    }
    return out;
  };

  FB.modifierUpkeep = function (state, key) {
    let sum = 0;
    const entries = FB.modifierUpkeepEntries(state, key);
    for (let i = 0; i < entries.length; i++) sum += entries[i].amount;
    return sum;
  };

  FB.modifierRemainingDays = function (state, record) {
    if (!record || !own(record, 'endTurn')) return null;
    return Math.max(0, Math.ceil(record.endTurn - state.turn));
  };

  FB.popEffective = function (state) {
    let value = Number(state.player.pop) || 0;
    const demesne = FB.demesne ? FB.demesne(state) : (state.player.provs || []);
    for (let i = 0; i < demesne.length; i++) {
      value += FB.modBonus(state, 'commonVoice', demesne[i]);
    }
    return value;
  };

  FB.eventTagBonus = function (state, tag, pid) {
    let sum = FB.modBonus(state, tag, pid);
    const player = state && state.player && state.chars[state.player.charId];
    if (player && FB.traitBonus) sum += Number(FB.traitBonus(player, 'estate', tag)) || 0;
    return sum;
  };

  FB.scaleEventEffects = function (state, source, ctx, ev) {
    if (!source || !ev || !Array.isArray(ev.tags) || !ev.tags.length) return source;
    ctx = ctx || {};
    const pid = ctx.pid || ctx.locationId || state.player.provinceId;
    let bonus = 0;
    for (let i = 0; i < ev.tags.length; i++) {
      bonus += FB.eventTagBonus(state, ev.tags[i], pid);
    }
    const factor = Math.max(0, 1 + bonus);
    if (factor === 1) return source;
    const out = {};
    for (const key in source) if (own(source, key)) out[key] = source[key];
    const signed = [
      'gold','prestige','piety','health','warService','research',
      'popularOpinion','opinionLiege'
    ];
    for (let j = 0; j < signed.length; j++) {
      const key = signed[j];
      if (typeof source[key] === 'number' && source[key] < 0) {
        out[key] = source[key] * factor;
      }
    }
    if (source.skills && typeof source.skills === 'object') {
      out.skills = {};
      for (const skill in source.skills) if (own(source.skills, skill)) {
        out.skills[skill] = typeof source.skills[skill] === 'number' &&
          source.skills[skill] < 0 ? source.skills[skill] * factor : source.skills[skill];
      }
    }
    if (source.opinion && typeof source.opinion === 'object') {
      out.opinion = {};
      for (const child in source.opinion) if (own(source.opinion, child)) {
        out.opinion[child] = child === 'amt' && typeof source.opinion[child] === 'number' &&
          source.opinion[child] < 0
          ? source.opinion[child] * factor : source.opinion[child];
      }
    }
    return out;
  };

  FB.syncGreatHolyWarModifiers = function (state, options) {
    if (!state) return;
    repairStorage(state);
    const campaign = state.greatHolyWar;
    if (!campaign) return;
    const validVow = FB.campaignModifierApplies(state);
    if (validVow) {
      FB.addModifier(state, 'oathbound_host', null, options);
    } else {
      FB.removeModifier(state, 'oathbound_host', null);
    }
  };

  FB.ensureModifiers = function (state) {
    if (!state) return null;
    const storage = repairStorage(state);
    FB.syncGreatHolyWarModifiers(state);
    return storage;
  };

  FB.modifierTick = function (state) {
    FB.ensureModifiers(state);
    const county = state.modifiers.county;
    for (const pid in county) {
      if (!own(county, pid)) continue;
      const list = county[pid];
      for (let i = list.length - 1; i >= 0; i--) {
        if (!active(list[i], state)) {
          const id = list[i].id;
          list.splice(i, 1);
          notice(state, id, 'county', pid, false);
        }
      }
      if (!list.length) delete county[pid];
    }
    const campaign = state.greatHolyWar;
    if (campaign && Array.isArray(campaign.modifiers)) {
      for (let j = campaign.modifiers.length - 1; j >= 0; j--) {
        if (!active(campaign.modifiers[j], state)) {
          const id = campaign.modifiers[j].id;
          campaign.modifiers.splice(j, 1);
          notice(state, id, 'campaign', null, false);
        }
      }
    }
  };
})();
