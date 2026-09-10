/* Fallowborn — temporary county and player-participation campaign modifiers.
   Records are small JSON-safe {id,endTurn?,sourceEventId?} values. County
   records stay with their province; campaign records live on the active
   holy war. */
window.FB = window.FB || {};

(function () {
  'use strict';

  let tickState = null;
  let tickStorage = null;
  let tickCounty = null;
  let tickCampaign = null;
  let tickCampaignModifiers = null;
  let tickNextExpiry = -Infinity;
  let modifierRevision = 0;

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
    /* fast path: a list whose records are all already valid, dedup-free and
       normalized (only the canonical keys, a usable sourceEventId) survives
       untouched — the daily repair passes then validate instead of
       reallocating every record */
    const seenIds = Object.create(null);
    let canonical = true;
    for (let i = 0; i < list.length; i++) {
      const raw = list[i];
      if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
          typeof raw.id !== 'string' || !definition(raw.id, scope) ||
          !validEnd(raw) || seenIds[raw.id]) { canonical = false; break; }
      if (own(raw, 'supportStacks') && (!Number.isSafeInteger(raw.supportStacks) || raw.supportStacks < 0)) { canonical = false; break; }
      if ((own(raw, 'supportDebt') && (typeof raw.supportDebt !== 'number' || !isFinite(raw.supportDebt) || raw.supportDebt < 0)) ||
          (own(raw, 'supportSince') && (typeof raw.supportSince !== 'number' || !isFinite(raw.supportSince)))) { canonical = false; break; }
      seenIds[raw.id] = true;
      for (const key in raw) {
        if (key !== 'id' && key !== 'endTurn' && key !== 'sourceEventId' && key !== 'supportStacks' && key !== 'supportDebt' && key !== 'supportSince') {
          canonical = false;
          break;
        }
      }
      if (!canonical) break;
      if (own(raw, 'sourceEventId') &&
          (typeof raw.sourceEventId !== 'string' || !raw.sourceEventId)) {
        canonical = false;
        break;
      }
    }
    if (canonical) return list;
    const byId = Object.create(null), order = [];
    for (let i = 0; i < list.length; i++) {
      const raw = list[i];
      if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
          typeof raw.id !== 'string' || !definition(raw.id, scope) ||
          !validEnd(raw)) continue;
      const next = { id:raw.id };
      if (Number.isSafeInteger(raw.supportStacks) && raw.supportStacks >= 0) next.supportStacks = raw.supportStacks;
      if (typeof raw.supportDebt === 'number' && isFinite(raw.supportDebt) && raw.supportDebt >= 0) next.supportDebt = raw.supportDebt;
      if (typeof raw.supportSince === 'number' && isFinite(raw.supportSince)) next.supportSince = raw.supportSince;
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
      if (next.supportStacks !== undefined) byId[raw.id].supportStacks = Math.max(byId[raw.id].supportStacks || 0, next.supportStacks);
      if (next.supportDebt !== undefined) byId[raw.id].supportDebt = Math.max(byId[raw.id].supportDebt || 0, next.supportDebt);
      if (next.supportSince !== undefined) byId[raw.id].supportSince = Math.max(byId[raw.id].supportSince === undefined ? -Infinity : byId[raw.id].supportSince, next.supportSince);
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

  function invalidateTickCache() {
    tickState = null;
    tickStorage = null;
    tickCounty = null;
    tickCampaign = null;
    tickCampaignModifiers = null;
    tickNextExpiry = -Infinity;
  }

  function noteModifierMutation() {
    modifierRevision++;
    invalidateTickCache();
  }

  /* Politics and institutions can retain their expensive derived views until
     a county/campaign modifier actually changes. The counter is transient:
     state identity handles loads, while every supported mutation advances it. */
  FB.modifierStateRevision = function () { return modifierRevision; };

  function rememberTickState(state) {
    tickState = state;
    tickStorage = state.modifiers;
    tickCounty = state.modifiers.county;
    tickCampaign = state.greatHolyWar || null;
    tickCampaignModifiers = tickCampaign && tickCampaign.modifiers || null;
    tickNextExpiry = Infinity;
    for (const pid in tickCounty) {
      if (!own(tickCounty, pid)) continue;
      const list = tickCounty[pid];
      for (let i = 0; i < list.length; i++) {
        if (own(list[i], 'endTurn') && list[i].endTurn < tickNextExpiry) {
          tickNextExpiry = list[i].endTurn;
        }
        const def = definition(list[i].id);
        if (def && def.recoverSupport && own(list[i], 'endTurn') && state.turn < list[i].endTurn) {
          const since = list[i].supportSince === undefined ? list[i].endTurn - def.days : list[i].supportSince;
          const nextYear = since + (Math.max(0, Math.floor((state.turn - since) / 360)) + 1) * 360;
          tickNextExpiry = Math.min(tickNextExpiry, nextYear);
        }
      }
    }
    const campaign = tickCampaignModifiers || [];
    for (let i = 0; i < campaign.length; i++) {
      if (own(campaign[i], 'endTurn') &&
          campaign[i].endTurn < tickNextExpiry) {
        tickNextExpiry = campaign[i].endTurn;
      }
    }
  }

  function tickCacheCurrent(state) {
    const campaign = state.greatHolyWar || null;
    return tickState === state && tickStorage === state.modifiers &&
      tickCounty === (state.modifiers && state.modifiers.county) &&
      tickCampaign === campaign &&
      tickCampaignModifiers === (campaign && campaign.modifiers || null);
  }

  function listFor(state, scope, pid, create) {
    // Full-store repair belongs to load/tick boundaries. A local query must
    // never walk unrelated counties, even when another county is malformed.
    if (!state.modifiers || typeof state.modifiers !== 'object' || Array.isArray(state.modifiers)) state.modifiers = {};
    if (!state.modifiers.county || typeof state.modifiers.county !== 'object' || Array.isArray(state.modifiers.county)) state.modifiers.county = {};
    if (scope === 'county') {
      if (!pid || !FB.world.byId[pid]) return null;
      const county = state.modifiers.county;
      if (!own(county, pid) && !create) return [];
      county[pid] = repairList(county[pid], 'county');
      return county[pid];
    }
    if (scope === 'campaign') {
      const campaign = state.greatHolyWar;
      if (!campaign || (campaign.phase !== 'preparation' &&
          campaign.phase !== 'active' && campaign.phase !== 'settlement')) return null;
      campaign.modifiers = repairList(campaign.modifiers, 'campaign');
      return campaign.modifiers;
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
    const tenure = id === 'custom_confirmed' && FB.activeSerfTenure &&
      FB.activeSerfTenure(state);
    const authorityBefore = tenure && def.scope === 'county' &&
      tenure.provinceId === pid && FB.serfHomeAuthority
      ? FB.serfHomeAuthority(state) : null;
    const list = listFor(state, def.scope, pid, true);
    if (!list) return false;
    let record = null;
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) { record = list[i]; break; }
    }
    const recordWasActive = record && active(record, state);
    const endTurn = def.days === undefined ? null :
      state.turn + Math.max(0, Math.floor(Number(def.days) || 0));
    if (record) {
      if (options && Number.isSafeInteger(options.supportStacks) && options.supportStacks >= 0) record.supportStacks = options.supportStacks;
      if (options && typeof options.supportDebt === 'number' && isFinite(options.supportDebt) && options.supportDebt >= 0) { record.supportDebt = options.supportDebt; record.supportSince = state.turn; }
      if (endTurn === null) delete record.endTurn;
      else record.endTurn = endTurn;
      if (options && typeof options.sourceEventId === 'string' &&
          options.sourceEventId) {
        record.sourceEventId = options.sourceEventId;
      }
      if (def.scope === 'county' && FB.recordModifierPrivilege) {
        FB.recordModifierPrivilege(state, id, pid, options || {});
      }
      noteModifierMutation();
      if (!recordWasActive && authorityBefore && FB.noteSerfHomeTransition) {
        FB.noteSerfHomeTransition(state, 'custom_confirmed', authorityBefore,
          FB.serfHomeAuthority(state));
      }
      return true;
    }
    record = { id:id };
    if (options && typeof options.supportDebt === 'number' && isFinite(options.supportDebt) && options.supportDebt >= 0) { record.supportDebt = options.supportDebt; record.supportSince = state.turn; }
    if (options && Number.isSafeInteger(options.supportStacks) && options.supportStacks >= 0) record.supportStacks = options.supportStacks;
    if (endTurn !== null) record.endTurn = endTurn;
    if (options && typeof options.sourceEventId === 'string' &&
        options.sourceEventId) {
      record.sourceEventId = options.sourceEventId;
    }
    list.push(record);
    if (def.scope === 'county' && FB.recordModifierPrivilege) {
      FB.recordModifierPrivilege(state, id, pid, options || {});
    }
    if (!(options && options.silent)) notice(state, id, def.scope, pid, true);
    noteModifierMutation();
    if (authorityBefore && FB.noteSerfHomeTransition) {
      FB.noteSerfHomeTransition(state, 'custom_confirmed', authorityBefore,
        FB.serfHomeAuthority(state));
    }
    return true;
  };

  FB.removeModifier = function (state, id, pid, options) {
    const def = definition(id);
    if (!state || !def) return false;
    const tenure = id === 'custom_confirmed' && FB.activeSerfTenure &&
      FB.activeSerfTenure(state);
    const authorityBefore = tenure && def.scope === 'county' &&
      tenure.provinceId === pid && FB.serfHomeAuthority
      ? FB.serfHomeAuthority(state) : null;
    const list = listFor(state, def.scope, pid, false);
    if (!list) return false;
    let removed = false;
    let removedActive = false;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].id !== id) continue;
      if (active(list[i], state)) removedActive = true;
      list.splice(i, 1);
      removed = true;
    }
    if (def.scope === 'county' && !list.length) delete state.modifiers.county[pid];
    if (removed && def.scope === 'county' && FB.removePrivilegeForModifier) {
      FB.removePrivilegeForModifier(state, id, pid);
    }
    if (removed && options && options.notice) notice(state, id, def.scope, pid, false);
    if (removed) noteModifierMutation();
    if (removedActive && authorityBefore && FB.noteSerfHomeTransition) {
      FB.noteSerfHomeTransition(state, 'custom_unconfirmed', authorityBefore,
        FB.serfHomeAuthority(state));
    }
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

  /* Live support scales local resistance without adding saved state. */
  FB.commonsUprisingReduction = function (state, pid, support) {
    if (support === undefined) support = FB.countyPopularSupport(state, pid || state.player.provinceId);
    const balance = FBDATA.balance;
    const minimum = FB.clamp(balance.commonsUprisingMinReduction, 0, 1);
    const start = balance.commonsUprisingSupportThreshold;
    const full = balance.commonsUprisingFullReductionSupport;
    return minimum + (1 - minimum) * FB.clamp((start - support) / Math.max(1, start - full), 0, 1);
  };

  FB.modifierEffects = function (state, id, record, pid) {
    const def = definition(id);
    if (def && def.recoverSupport) {
      let support = (def.fx.commonVoice || 0) + (def.supportPerStack || 0) * (record && record.supportStacks || 0);
      if (record && record.supportDebt !== undefined) support = -record.supportDebt;
      if (record && record.endTurn !== undefined) {
        const since = record.supportSince === undefined ? record.endTurn - def.days : record.supportSince;
        const years = Math.max(0, Math.floor((state.turn - since) / 360));
        support *= Math.max(0, 1 - years * 360 / Math.max(1, def.days));
      }
      return Object.assign({}, def.fx, { commonVoice:support });
    }
    if (def && def.supportPerStack && record && record.supportStacks) {
      return Object.assign({}, def.fx, { commonVoice:(def.fx.commonVoice || 0) + def.supportPerStack * record.supportStacks });
    }
    if (id !== 'commons_uprising') return def && def.fx || {};
    const reduction = FB.commonsUprisingReduction(state, pid);
    return Object.assign({}, def && def.fx || {}, { tax:-reduction, levy:-reduction });
  };

  FB.modBonus = function (state, key, pid, support, records) {
    let sum = 0, uprising = false;
    const list = records || FB.countyModifierRecords(state, pid);
    for (let i = 0; i < list.length; i++) {
      const def = definition(list[i].id, 'county');
      if (list[i].id === 'commons_uprising' && (key === 'tax' || key === 'levy')) {
        uprising = true;
        continue;
      }
      if (key === 'commonVoice' && def && def.fx && (def.fx.commonVoice || def.supportPerStack || def.recoverSupport)) sum += Number(FB.modifierEffects(state, list[i].id, list[i]).commonVoice) || 0;
      else if (def && def.fx && typeof def.fx[key] === 'number') sum += def.fx[key];
    }
    if (FB.settlementCommunityProjectModifierBonus) {
      sum += FB.settlementCommunityProjectModifierBonus(state, pid, key);
    }
    if (FB.historicalAmbitionBonus) sum += FB.historicalAmbitionBonus(state, pid, key);
    if (key === 'tax' || key === 'levy') {
      if (support === undefined) support = FB.countyPopularSupport(state, pid);
      sum = Math.max(0, 1 + sum) * FB.clamp(1 + support / 100, 0, 2) - 1;
    }
    // Apply resistance after ordinary county bonuses so complete refusal
    // cannot be offset by another positive modifier.
    return uprising ? Math.max(0, 1 + sum) * (1 - FB.commonsUprisingReduction(state, pid, support)) - 1 : sum;
  };

  FB.countySupportFactor = function (state, pid) {
    return FB.clamp(1 + FB.countyPopularSupport(state, pid) / 100, 0, 2);
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

  /* ---------- whose counties a county modifier acts on ----------
     One explicit rule, because six consumers used to decide it separately and
     disagreed. A landed ruler experiences the modifiers on the counties they
     hold directly. A baron holds none: their seat is the liege's county. But
     the estates that grant these modifiers sit from tier 3, and the agenda
     that grants them is chosen by reading that seat, so the seat is where
     they act. Upkeep, Popular support, tax, levy, and the Governance projection
     all read this, so a player cannot pay for a record that gives them
     nothing and does not appear anywhere they can look. */
  FB.modifierCounties = function (state) {
    const p = state && state.player;
    if (!p) return [];
    if (p.provs && p.provs.length) return p.provs.slice();
    return p.provinceId ? [p.provinceId] : [];
  };

  /* The substituted seat, and null for a ruler who holds counties of their
     own. Callers that already sum over held counties use this to add the
     seat's effect without granting rent or levy from land they do not hold. */
  FB.modifierSeat = function (state) {
    const p = state && state.player;
    if (!p || (p.provs && p.provs.length)) return null;
    return p.provinceId || null;
  };

  FB.modifierUpkeepEntries = function (state, key) {
    key = key || 'gold';
    const out = [];
    const demesne = FB.modifierCounties(state);
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

  FB.countySupportBase = function (state, pid) {
    const value = state.countySupport && state.countySupport[pid];
    return typeof value === 'number' && isFinite(value) ? value : 0;
  };
  FB.setCountySupport = function (state, pid, value) {
    if (!pid || !FB.world.byId[pid] || !isFinite(Number(value))) return false;
    if (!state.countySupport) state.countySupport = {};
    const next = FB.clamp(Number(value), -100, 100);
    if (state.countySupport[pid] === next) return true;
    state.countySupport[pid] = next;
    noteModifierMutation();
    return true;
  };
  FB.adjustCountySupport = function (state, pid, amount) {
    return FB.setCountySupport(state, pid, FB.countySupportBase(state, pid) + amount);
  };
  FB.countyPopularSupport = function (state, pid, records) {
    pid = pid || state.player.provinceId;
    return FB.countySupportBase(state, pid) + FB.modBonus(state, 'commonVoice', pid, undefined, records);
  };
  // Opt in only canonical readers; replacement mod hooks fall back to live reads.
  FB.countyPopularSupport.militaryCacheSafe = true;
  FB.modBonus.militaryCacheSafe = true;
  // Compatibility query for older mods; there is no personal support record.
  FB.popEffective = function (state) { return FB.countyPopularSupport(state, state.player.provinceId); };
  FB.ensureCountySupport = function (state) {
    if (!state.countySupport || typeof state.countySupport !== 'object' || Array.isArray(state.countySupport)) state.countySupport = {};
    for (const pid in state.countySupport) {
      const value = state.countySupport[pid];
      if (!FB.world.byId[pid] || typeof value !== 'number' || !isFinite(value)) delete state.countySupport[pid];
      else state.countySupport[pid] = FB.clamp(value, -100, 100);
    }
    if (Object.prototype.hasOwnProperty.call(state.player, 'pop')) {
      const legacy = Number(state.player.pop) || 0;
      for (const pid of FB.modifierCounties(state)) {
        if (state.countySupport[pid] === undefined && legacy) state.countySupport[pid] = FB.clamp(legacy, -100, 100);
      }
      delete state.player.pop;
    }
  };
  FB.countySupportYear = function (state) {
    FB.ensureCountySupport(state);
    for (const pid in state.countySupport) state.countySupport[pid] = Math.sign(state.countySupport[pid]) * Math.floor(Math.abs(state.countySupport[pid]) * 0.85);
    noteModifierMutation();
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

  FB.syncGreatHolyWarModifiers = function (state, options, storageReady) {
    if (!state) return;
    if (!storageReady) repairStorage(state);
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
    FB.ensureCountySupport(state);
    const storage = repairStorage(state);
    FB.syncGreatHolyWarModifiers(state, null, true);
    rememberTickState(state);
    return storage;
  };

  FB.modifierTick = function (state) {
    if (tickCacheCurrent(state) && state.turn < tickNextExpiry) return;
    const recoveryDue = tickCacheCurrent(state) && state.turn >= tickNextExpiry;
    FB.ensureModifiers(state);
    const county = state.modifiers.county;
    let changed = recoveryDue;
    for (const pid in county) {
      if (!own(county, pid)) continue;
      const list = county[pid];
      for (let i = list.length - 1; i >= 0; i--) {
        if (!active(list[i], state)) {
          const id = list[i].id;
          list.splice(i, 1);
          changed = true;
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
          changed = true;
          notice(state, id, 'campaign', null, false);
        }
      }
    }
    if (changed) noteModifierMutation();
    rememberTickState(state);
  };
})();
