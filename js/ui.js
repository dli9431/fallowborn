/* Fallowborn — UI: screens, panels, modals, event display */
window.FB = window.FB || {};

(function () {
  'use strict';

  const UI = {};
  FB.ui = UI;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return FB.esc(s); }
  function dt(s, kind, id, def, path, ctx) {
    return FB.dataText(s, s.player.charId, kind, id, def, path, ctx || {});
  }
  function cultureName(s, id) {
    const def = FB.cultureOf(id);
    return dt(s, 'culture', id, def, 'name');
  }
  function religionName(s, id) {
    const def = FB.religionOf(id);
    return dt(s, 'religion', id, def, 'name');
  }
  function positionName(s, id) {
    const def = FBDATA.positions && FBDATA.positions[id];
    return def ? dt(s, 'position', id, def, 'name') : id;
  }
  function positionDesc(s, id) {
    const def = FBDATA.positions && FBDATA.positions[id];
    return def ? dt(s, 'position', id, def, 'desc') : '';
  }
  function signedPercent(value) {
    const percent = Math.round((Number(value) || 0) * 100);
    return (percent > 0 ? '+' : '') + percent;
  }
  function modifierEffectText(s, id) {
    const def = FBDATA.modifiers && FBDATA.modifiers[id];
    if (!def) return '';
    const fx = def.fx || {}, parts = [];
    if (fx.tax) parts.push(FB.T('{amount}% county tax', {
      amount:signedPercent(fx.tax)
    }));
    if (fx.levy) parts.push(FB.T('{amount}% county levy', {
      amount:signedPercent(fx.levy)
    }));
    if (fx.buildingCost) parts.push(FB.T('{amount}% construction cost', {
      amount:signedPercent(fx.buildingCost)
    }));
    if (fx.commonVoice) parts.push(FB.T('{amount} Common Voice', {
      amount:(fx.commonVoice > 0 ? '+' : '') + fx.commonVoice
    }));
    if (fx.famine) parts.push(FB.T('{amount}% famine harm', {
      amount:signedPercent(fx.famine)
    }));
    if (fx.unrest) parts.push(FB.T('{amount}% unrest harm', {
      amount:signedPercent(fx.unrest)
    }));
    if (fx.supplyUse) parts.push(FB.T('{amount}% campaign supply use', {
      amount:signedPercent(fx.supplyUse)
    }));
    if (fx.contribution) parts.push(FB.T('{amount}% campaign contribution', {
      amount:signedPercent(fx.contribution)
    }));
    if (fx.withdrawalPenalty) parts.push(FB.T('{amount}% withdrawal penalties', {
      amount:signedPercent(fx.withdrawalPenalty)
    }));
    if (fx.marchSpeed) parts.push(FB.T('{amount}% march speed', {
      amount:signedPercent(fx.marchSpeed)
    }));
    if (fx.battleOdds) parts.push(FB.T('{amount}% battle power', {
      amount:signedPercent(fx.battleOdds)
    }));
    if (fx.desertion) parts.push(FB.T('{amount}% desertion per season', {
      amount:Math.round(fx.desertion * 100)
    }));
    return parts.join(' · ');
  }
  function modifierDurationText(s, record, scope) {
    const days = FB.modifierRemainingDays
      ? FB.modifierRemainingDays(s, record) : null;
    if (days !== null) return FB.T('{days} days remaining', { days:days });
    return scope === 'campaign'
      ? FB.T('Until the campaign ends') : FB.T('No fixed end');
  }
  function modifierChips(s, records, scope, pid) {
    let h = '';
    for (const record of records) {
      const def = FBDATA.modifiers && FBDATA.modifiers[record.id];
      if (!def) continue;
      const name = dt(s, 'modifier', record.id, def, 'name');
      const duration = modifierDurationText(s, record, scope);
      const label = FB.T('{modifier} — {duration}', {
        modifier:name, duration:duration
      });
      h += '<button type="button" class="traitchip modifierchip" data-modifier="' +
        esc(record.id) + '" data-modifier-scope="' + esc(scope) + '"' +
        (pid ? ' data-modifier-pid="' + esc(pid) + '"' : '') +
        ' aria-label="' + esc(label) + '">' + def.icon + ' ' + esc(name) +
        ' <span class="modifier-duration">· ' + esc(duration) + '</span></button>';
    }
    return h;
  }
  function modifierRecord(s, id, scope, pid) {
    const records = scope === 'county'
      ? (FB.countyModifierRecords ? FB.countyModifierRecords(s, pid) : [])
      : (FB.campaignModifierRecords ? FB.campaignModifierRecords(s) : []);
    for (const record of records) if (record.id === id) return record;
    return null;
  }
  function householdStandardName(s, id) {
    const def = FBDATA.householdStandards && FBDATA.householdStandards[id];
    return def ? dt(s, 'householdStandard', id, def, 'name') : id;
  }
  function householdStandardLevelName(s, id, level) {
    const def = FBDATA.householdStandards && FBDATA.householdStandards[id];
    return def && level && def.levels && def.levels[level - 1]
      ? dt(s, 'householdStandard', id, def, 'levels.' + (level - 1) + '.name')
      : FB.T('Baseline');
  }
  function householdStandardLevelDesc(s, id, level) {
    const def = FBDATA.householdStandards && FBDATA.householdStandards[id];
    return def && level && def.levels && def.levels[level - 1]
      ? dt(s, 'householdStandard', id, def, 'levels.' + (level - 1) + '.desc')
      : FB.T('No maintained improvement.');
  }
  function householdStandardsSummary(s) {
    const parts = [];
    for (const id of FB.householdStandardIds()) {
      const level = FB.householdStandardLevel(s, id);
      const def = FBDATA.householdStandards[id];
      if (!level || !def || !FB.householdStandardActive(s, id)) continue;
      parts.push(FB.T('{icon} level {level}', {
        icon:def.icon || '🏠', level:level
      }));
    }
    return parts.join(' · ');
  }
  function positionEffectText(id) {
    const def = FBDATA.positions && FBDATA.positions[id];
    const fx = (def && def.fx) || {};
    const effects = [];
    if (fx.gold) effects.push(FB.T('{money:amount}/season', { amount:fx.gold }));
    if (fx.enterprise) effects.push(FB.T('+{percent}% enterprise profit', {
      percent:Math.round(fx.enterprise * 100)
    }));
    if (fx.retinue) effects.push(FB.T('+{men} men-at-arms', { men:fx.retinue }));
    if (fx.tax) effects.push(FB.T('+{percent}% personal tax', {
      percent:Math.round(fx.tax * 100)
    }));
    return effects.join(' · ');
  }
  function techLevelsText(s, realmId) {
    const record = FB.realmTechRecord(s, realmId);
    return FB.T('{completed} completed · {exposed} exposed', {
      completed:record.completed.length,
      exposed:record.exposed.filter(function (id) {
        return record.completed.indexOf(id) < 0;
      }).length
    });
  }
  function techDevelopmentScore(s, realmId) {
    const completed = FB.realmTechRecord(s, FB.techRealmId(s, realmId)).completed;
    let known = 0, total = 0;
    for (const id in (FBDATA.tech || {})) {
      if (!Object.prototype.hasOwnProperty.call(FBDATA.tech, id)) continue;
      total++;
      if (completed.indexOf(id) >= 0) known++;
    }
    return total ? Math.round(FB.clamp(known / total, 0, 1) * 10) : 0;
  }
  function researchNumber(value) {
    return Math.round((Number(value) || 0) * 10) / 10;
  }
  function techEstimatedSeasons(s, rid, record, item, cost) {
    if (item.completed || (!item.active && !item.available)) return null;
    const slots = FB.techSlotCount(s, rid);
    const sharing = item.active
      ? Math.max(1, record.active.length)
      : Math.max(1, Math.min(slots, record.active.length + 1));
    const rate = FB.techResearchRate(s, rid);
    if (rate <= 0) return null;
    const remaining = Math.max(0, cost.total - (record.progress[item.id] || 0));
    const mayUseReserve = item.active || record.active.length < slots;
    const firstShare = (rate + (mayUseReserve ? record.reserve : 0)) / sharing;
    if (remaining <= firstShare + 0.0001) return 1;
    return 1 + Math.ceil((remaining - firstShare) / (rate / sharing));
  }
  function techCostEstimateText(s, cost, seasons) {
    return FB.renderMessage(FB.msg('fx.ui.tech_cost_estimate', {
      forms: {
        select:'plural', param:'seasons', cases:{
          one:'{cost} research · about {seasons} season',
          other:'{cost} research · about {seasons} seasons'
        }
      }
    }, { cost:researchNumber(cost), seasons:seasons }), {
      state:s, viewer:s.player.charId
    });
  }
  function councilSeatName(id) {
    return id === 'seneschal' ? FB.T('Seneschal')
      : id === 'constable' ? FB.T('Constable')
      : id === 'treasurer' ? FB.T('Treasurer')
      : id === 'almoner' ? FB.T('Almoner')
      : FB.T('Chamberlain');
  }
  function councilSeatDesc(id) {
    return id === 'seneschal' ? FB.T('+10% taxes while he serves')
      : id === 'constable' ? FB.T('+10% levy while he serves')
      : id === 'treasurer' ? FB.T('Buildings cost 15% less while he serves')
      : id === 'almoner' ? FB.T('+1 piety a season while he serves')
      : FB.T('Watches for schemes against you; your own plots weave faster');
  }
  const TERRAIN_NAMES = {
    farmland: 'farmland', forest: 'forest', hills: 'hills', mountains: 'mountains',
    desert: 'desert', steppe: 'steppe', marsh: 'marsh', tundra: 'tundra'
  };
  function terrainName(id) {
    const source = TERRAIN_NAMES[id] || id;
    return FB.renderKey('terrain.' + id + '.default', { text: source }, {});
  }
  FB.terrainName = terrainName;
  function settlementKindName(id) {
    const source = id === 'city' ? 'city' : (id === 'town' ? 'town' : 'village');
    return FB.renderKey('settlement.' + source + '.default', { text: source }, {});
  }
  function rarityName(id) {
    const source = id === 'famed' ? 'famed' : (id === 'fine' ? 'fine' : 'common');
    return FB.renderKey('rarity.' + source + '.default', { text: source }, {});
  }
  const ROLE_NAMES = {
    lord: 'Lord', priest: 'Priest', friend: 'Friend', rival: 'Rival',
    notable: 'Notable', suitor: 'Suitor', match: 'Match', kinspouse: 'Kin by marriage',
    spouse: 'Spouse', tutor: 'Tutor', parent: 'Parent', sibling: 'Sibling'
  };
  function roleName(role) {
    return FB.T(ROLE_NAMES[role] || role);
  }
  function rivalryHeatName(heat) {
    if (heat >= 70) return FB.T('blood feud');
    if (heat >= 40) return FB.T('open feud');
    if (heat >= 20) return FB.T('simmering');
    return FB.T('cooling');
  }
  function epithetText(s, c) {
    if (c.epithetMsg) {
      return FB.renderMessage(c.epithetMsg, {
        state: s, viewer: s.player.charId
      });
    }
    return c.epithet ? FB.L(c.epithet) : '';
  }
  function countyCountText(s, count) {
    return FB.renderMessage(FB.msg('fx.ui.counties', {
      forms: {
        select: 'plural', param: 'count', cases: {
          one: '{count} county',
          other: '{count} counties'
        }
      }
    }, { count: count }), { state: s, viewer: s.player.charId });
  }
  function menText(s, count) {
    return FB.renderMessage(FB.msg('fx.ui.men', {
      forms: {
        select: 'plural', param: 'count', cases: {
          one: '{count} man',
          other: '{count} men'
        }
      }
    }, { count: count }), { state: s, viewer: s.player.charId });
  }
  function signedNumber(value) {
    const rounded = Math.round((Number(value) || 0) * 10) / 10;
    return (rounded > 0 ? '+' : '') + rounded;
  }
  function standingValue(value) {
    return signedNumber(FB.clamp(Number(value) || 0, -100, 100));
  }
  function standingBand(value) {
    value = FB.clamp(Number(value) || 0, -100, 100);
    if (value >= 60) return FB.T('Warm');
    if (value >= 20) return FB.T('Favorable');
    if (value <= -60) return FB.T('Hostile');
    if (value <= -20) return FB.T('Guarded');
    return FB.T('Neutral');
  }
  function standingClass(value) {
    return FB.opClass(value);
  }
  function standingText(value) {
    return FB.T('{value} ({band})', {
      value:standingValue(value),
      band:standingBand(value)
    });
  }
  function standingSpan(value) {
    return '<span class="' + standingClass(value) + '">' +
      esc(standingText(value)) + '</span>';
  }
  function standingEffectRow(label, amount) {
    const effectClass = amount > 0 ? 'op-good' :
      amount < 0 ? 'op-bad' : 'op-mid';
    return '<div class="bd-row"><span>' + esc(label) +
      '</span><span class="bd-amt ' + effectClass + '">' +
      esc(standingValue(amount)) + '</span></div>';
  }
  function realmStandingContext(s, rid) {
    const upward = s.player.liege
      ? FB.liegeChain(s, s.player.liege) : [];
    if (upward.indexOf(rid) >= 0) {
      return FB.T(
        'Standing with your liege affects petitions, grants, service, and your voice in the Estates.');
    }
    if (FB.playerVassals && FB.playerVassals(s).indexOf(rid) >= 0) {
      return FB.T(
        'Standing with this vassal affects council service, taxation, exceptional levies, and resistance to revocation.');
    }
    const realm = s.realms[rid];
    return realm && !realm.liege
      ? FB.T(
        'Standing with this ruler affects envoys, pacts, aid, hostility, and the chance of war.')
      : FB.T(
        'Standing with this ruler affects gifts, personal dealings, and political hostility.');
  }
  function characterStandingContext(s, c) {
    const rid = FB.realmIdForRulerCharacter &&
      FB.realmIdForRulerCharacter(s, c);
    if (rid) return realmStandingContext(s, rid);
    if (s.player.courtingId === c.id) {
      return FB.T(
        'Standing with this person affects whether a marriage proposal succeeds.');
    }
    if (FB.retainerRecord && FB.retainerRecord(s, c.id)) {
      return FB.T(
        'Standing with this retainer affects loyalty and whether household service continues.');
    }
    if (s.roles.rival === c.id ||
        (s.player.rivalContacts && s.player.rivalContacts[c.id])) {
      return FB.T(
        'Standing with this person affects rivalry, reconciliation, and the chance of peace.');
    }
    return FB.T(
      'Standing with this person affects friendship, courtship, marriage, and household service.');
  }
  FB.standingValueText = standingValue;
  FB.standingBandText = standingBand;
  FB.standingClassName = standingClass;
  FB.standingPresentationText = standingText;
  FB.standingEffectRow = standingEffectRow;
  function socialAttentionSummary(s) {
    const target = FB.socialAttentionTarget(s);
    const capacity = FB.socialAttentionCapacity();
    const rate = FB.socialAttentionDailyOpinion();
    const threshold = FB.relationshipOpinionThreshold();
    if (!target) {
      return FB.T('🤝 Personal attention 0/{capacity} · no assignment · +{rate} Standing/day when assigned', {
        capacity:capacity, rate:rate
      });
    }
    const days = FB.socialAttentionDaysToThreshold(s, target);
    const progress = days === null
      ? FB.T('not advancing toward +{threshold}', { threshold:threshold })
      : (days
        ? FB.T('{days} days to +{threshold}', { days:days, threshold:threshold })
        : FB.T('ready at +{threshold}', { threshold:threshold }));
    const params = {
      capacity:capacity,
      name:FB.fullName(target),
      standing:standingValue(FB.standingOf(s, {
        kind:'character', id:target.id
      })),
      rate:rate,
      progress:progress
    };
    const presence = FB.socialAttentionPresence(s, target);
    if (presence.status === 'on-road') {
      return FB.T('🤝 Personal attention 1/{capacity} · {name} · Standing {standing} · +{rate}/day · {progress} · paused while on the road', params);
    }
    if (presence.status === 'remote') {
      const residence = presence.residenceId && FB.world.byId[presence.residenceId];
      params.province = residence ? residence.name : FB.T('another county');
      return FB.T('🤝 Personal attention 1/{capacity} · {name} · Standing {standing} · +{rate}/day · {progress} · paused—target is in {province}', params);
    }
    return FB.T('🤝 Personal attention 1/{capacity} · {name} · Standing {standing} · +{rate}/day · {progress}', params);
  }
  function allianceSourceText(source) {
    if (source === 'royal_marriage') return FB.T('royal marriage');
    if (source === 'envoy') return FB.T('envoy compact');
    return FB.T('dynastic compact');
  }
  function allianceText(s, rid) {
    const a = FB.allianceOf(s, rid);
    if (!a) return FB.T('None');
    const partner = a.a === rid ? a.b : a.a;
    const r = s.realms[partner];
    const support = FB.alliedReinforcement(s, rid);
    return FB.T('{realm} · {source} · until either ruler changes · defensive support ~{men}', {
      realm: r ? r.name : partner,
      source: allianceSourceText(a.source),
      men: menText(s, support.men)
    });
  }
  function foreignPolicyStanceText(s, rid) {
    const stance = FB.foreignPolicyStance(s, rid);
    const text = stance > 0 ? FB.T('Improve relations')
      : (stance < 0 ? FB.T('Provoke') : FB.T('Neutral'));
    if (stance && s.player.war && s.player.war.enemy === rid) {
      return FB.T('{stance} — suspended during war', { stance: text });
    }
    return text;
  }
  function foreignPolicyStatusText(s, rid) {
    if (s.player.war && s.player.war.enemy === rid) {
      return FB.T('At war — policy is suspended');
    }
    if (FB.areAllied(s, 'player', rid)) {
      return FB.T('Defensive allies - neither realm may attack the other');
    }
    if (s.pacts && s.pacts[rid] > s.turn) {
      const year = FB.dateAtTurn(s, s.pacts[rid]).year;
      return FB.isRealmAtWar(s, rid)
        ? FB.T('Peace pact until {year} AD · at war elsewhere', { year: year })
        : FB.T('Peace pact until {year} AD', { year: year });
    }
    if (FB.isRealmAtWar(s, rid)) return FB.T('At war with another realm');
    return FB.T('No pact or war');
  }

  /* localization chokepoints: a labeled stat row and a panel header. Each wraps
     its (translatable) label through FB.T once, so every row/header is covered at
     a single site rather than per literal. The value is caller-controlled HTML
     and is passed through untouched. */
  function kv(label, value) {
    return '<div class="kv"><span>' + esc(FB.T(label)) + '</span><b>' + value + '</b></div>';
  }
  function panelh(title, id) {
    return '<div class="panelh"' +
      (id ? ' id="' + esc(id) + '" tabindex="-1"' : '') + '>' +
      esc(FB.T(title)) + '</div>';
  }

  /* Shared presentation for assets and persistent effects. The owning system
     supplies every value; this renderer only keeps the audit's comparison
     order, localization, affordability cue, and responsive markup common. */
  function assetSummaryValue(value, fallback) {
    const supplied = value !== undefined && value !== null && value !== '';
    const source = supplied ? value : fallback;
    if (source && typeof source === 'object') {
      return {
        text:source.text === undefined || source.text === null ? '' : String(source.text),
        tone:source.tone || ''
      };
    }
    return { text:String(source), tone:'' };
  }

  function assetEffectSummary(options) {
    const opts = options || {};
    const fields = [
      { key:'owner', label:FB.T('Owner'), fallback:FB.T('Not applicable') },
      { key:'scope', label:FB.T('Scope'), fallback:FB.T('Not applicable') },
      { key:'setupCost', label:FB.T('Setup cost'), fallback:FB.T('None') },
      { key:'recurringCost', label:FB.T('Recurring cost'), fallback:FB.T('None') },
      { key:'effect', label:FB.T('Effect'), fallback:FB.T('No mechanical effect') },
      { key:'transferRule', label:FB.T('Transfer rule'),
        fallback:FB.T('Cannot be transferred') },
      { key:'expiry', label:FB.T('Expiry'), fallback:FB.T('No fixed end') }
    ];
    let h = '<span class="asset-effect-summary' +
      (opts.compact ? ' compact' : '') + '" role="group" aria-label="' +
      esc(FB.T('Asset and effect summary')) + '">';
    for (const field of fields) {
      const value = assetSummaryValue(opts[field.key], field.fallback);
      const fieldClass = field.key.replace(/([A-Z])/g, '-$1').toLowerCase();
      h += '<span class="asset-effect-cell asset-effect-' + fieldClass +
        (value.tone ? ' ' + esc(value.tone) : '') + '">' +
        '<span class="asset-effect-label">' + esc(field.label) + '</span>' +
        '<span class="asset-effect-value">' + esc(value.text) + '</span></span>';
    }
    return h + '</span>';
  }
  UI.assetEffectSummary = assetEffectSummary;

  function assetMoneyCost(amount, affordable) {
    const cost = FB.T('{money:amount}', { amount:Number(amount) || 0 });
    return affordable === false
      ? {
        text:FB.T('{cost} · not affordable', { cost:cost }),
        tone:'unaffordable'
      }
      : cost;
  }

  function assetSeasonalMoneyCost(amount) {
    amount = Number(amount) || 0;
    return amount
      ? FB.T('{money:amount} each season · shown in Money each season', {
        amount:amount
      })
      : FB.T('None');
  }

  /* Shared presentation for choosing a person for a role. Callers supply the
     mechanic-specific eligibility and preview rows; the card owns only safe
     markup, selection state, and the common keyboard/mobile button shape. */
  function personAssignmentCard(options) {
    const opts = options || {};
    const eligible = opts.eligible !== false;
    const disabled = !!opts.disabled || !eligible;
    const selected = !!opts.selected;
    const person = opts.person || null;
    const name = opts.name || (person ? person.name : FB.T('Unknown candidate'));
    const eligibility = opts.eligibility ||
      (selected ? FB.T('Currently assigned') :
        (eligible ? FB.T('Eligible') : FB.T('Unavailable')));
    const data = opts.data || {};
    const rows = opts.rows || [];
    let attrs = '';
    for (const key in data) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
      const attr = String(key).replace(/([A-Z])/g, '-$1').toLowerCase();
      attrs += ' data-' + attr + '="' + esc(data[key]) + '"';
    }
    if (opts.id) attrs += ' id="' + esc(opts.id) + '"';
    let art = opts.art || '';
    if (!art && person) art = FB.faceTag(person, 34, 40);
    if (!art && opts.icon) {
      art = '<span class="person-assignment-icon" aria-hidden="true">' +
        esc(opts.icon) + '</span>';
    }
    let h = '<button type="button" class="actionbtn person-assignment-card' +
      (selected ? ' selected' : '') + (!eligible ? ' unavailable' : '') +
      '"' + attrs + (disabled ? ' disabled' : '') +
      ' aria-pressed="' + (selected ? 'true' : 'false') + '">' +
      '<span class="person-assignment-head">' +
      '<span class="person-assignment-choice" aria-hidden="true">' +
      (selected ? '◉' : '○') + '</span>' + art +
      '<span class="person-assignment-name">' + esc(name) + '</span>' +
      '<span class="person-assignment-eligibility">' + esc(eligibility) + '</span>' +
      '</span>';
    if (rows.length) {
      h += '<span class="person-assignment-rows">';
      for (const row of rows) {
        if (!row || row.value === undefined || row.value === null || row.value === '') continue;
        h += '<span class="person-assignment-row' +
          (row.kind === 'consequence' ? ' consequence' : '') + '">' +
          '<span class="person-assignment-label">' + esc(FB.T(row.label)) + '</span>' +
          '<span class="person-assignment-value">' + esc(row.value) + '</span></span>';
      }
      h += '</span>';
    }
    return h + '</button>';
  }
  UI.personAssignmentCard = personAssignmentCard;

  let eventOpen = false;
  let pendingEvents = [];

  /* Touch mis-tap guard. On mobile the event modal is a bottom sheet that can
     appear just as the player's thumb is already coming down toward the time
     bar, so an in-flight tap lands on a freshly drawn option and chooses an
     outcome by accident. Briefly drop input after each set of action buttons
     renders: long enough to catch an instant follow-up tap, but short enough
     that deliberately moving through events stays responsive. Autoresolved
     events render no buttons and never arm this guard. Desktop mouse users act
     on a centered modal with no button under the pointer, so the guard is
     limited to touch. */
  const EVENT_INPUT_GUARD_MS = 350;
  let eventGuardUntil = 0;
  function armEventGuard() { eventGuardUntil = Date.now() + EVENT_INPUT_GUARD_MS; }
  function eventInputGuarded() { return FB.isTouch && Date.now() < eventGuardUntil; }

  /* Mobile browser history mirrors panel changes and temporary UI layers, never
     simulation actions. The entries keep the current URL unchanged so the same
     code works from file://, the standalone site, and itch's iframe. A layer
     owns a raw close/reopen pair; Back traversals invoke those directly, while
     visible Close buttons dismiss first and then consume their owned entry. */
  const MOBILE_NAV_QUERY = '(max-width: 820px), (max-height: 520px)';
  const mobileNavEmbedded = window.self !== window.top;
  let mobileNavSession = '';
  let mobileNavSerial = 0;
  let mobileNavReady = false;
  let mobileNavDepth = 0;
  let mobileNavLayers = [];
  let mobileNavQueued = [];
  let mobileNavPendingBack = false;
  let mobileNavApplying = false;
  let mobileNavNeedsReset = false;

  function mobileLayoutNow() {
    if (window.matchMedia) return window.matchMedia(MOBILE_NAV_QUERY).matches;
    return window.innerWidth <= 820 || window.innerHeight <= 520;
  }

  function mobileNavState(depth) {
    return {
      fallowbornNav:1,
      session:mobileNavSession,
      depth:depth
    };
  }

  function mobileNavOwns(state) {
    return !!state && state.fallowbornNav === 1 &&
      state.session === mobileNavSession;
  }

  function mobileNavCanBack(layer) {
    if (!layer || !layer.visible || !layer.canBack) return false;
    try {
      return !!layer.canBack();
    } catch (err) {
      return false;
    }
  }

  /* Android consumes the physical Back button to leave itch's browser-owned
     iframe fullscreen before history traversal. Embedded mobile equipment
     pickers therefore expose the same history action as an in-game control. */
  function mobileNavSyncBackControls() {
    const layer = mobileNavLayers[mobileNavDepth];
    const eventModal = $('eventmodal');
    const eventBlocking = eventModal && !eventModal.classList.contains('hidden');
    const canUse = mobileNavEmbedded && mobileLayoutNow() && mobileNavReady &&
      mobileNavDepth > 0 && !mobileNavPendingBack && !eventBlocking &&
      mobileNavCanBack(layer);
    const equipment = $('equip-picker-history-back');
    const overlay = $('equip-picker-overlay');
    const showEquipment = !!canUse && !!overlay && layer.kind === 'equipment-picker';
    if (equipment) equipment.classList.toggle('hidden', !showEquipment);
    if (overlay) overlay.classList.toggle('embedded-history-back', showEquipment);
  }

  function mobileNavStartNow() {
    mobileNavReady = false;
    mobileNavDepth = 0;
    mobileNavLayers = [];
    mobileNavQueued = [];
    mobileNavPendingBack = false;
    mobileNavNeedsReset = false;
    mobileNavSyncBackControls();
    if (!mobileLayoutNow() || !window.history ||
      typeof window.history.pushState !== 'function' ||
      typeof window.history.replaceState !== 'function') return false;
    mobileNavSession = 'fb-' + Date.now().toString(36) + '-' + (++mobileNavSerial);
    try {
      window.history.replaceState(mobileNavState(0), '');
      mobileNavReady = true;
    } catch (err) {
      mobileNavReady = false; // buttons remain the complete fallback path
    }
    mobileNavSyncBackControls();
    return mobileNavReady;
  }

  function mobileNavStart() {
    if (mobileNavPendingBack || (mobileNavReady && mobileNavDepth > 0)) {
      mobileNavNeedsReset = true;
      if (!mobileNavPendingBack && mobileNavDepth > 0) {
        mobileNavPendingBack = true;
        mobileNavSyncBackControls();
        try {
          window.history.go(-mobileNavDepth);
        } catch (err) {
          mobileNavPendingBack = false;
          mobileNavStartNow();
        }
      }
      return;
    }
    mobileNavStartNow();
  }

  function mobileNavEnsure() {
    if (mobileNavReady) return true;
    if (!FB.state || $('game').classList.contains('hidden') || !mobileLayoutNow()) return false;
    return mobileNavStartNow();
  }

  function mobileNavCommitLayer(layer) {
    const depth = mobileNavDepth + 1;
    try {
      window.history.pushState(mobileNavState(depth), '');
    } catch (err) {
      mobileNavReady = false;
      mobileNavQueued = [];
      mobileNavSyncBackControls();
      return false;
    }
    mobileNavLayers.length = depth + 1; // a new branch discards old Forward layers
    mobileNavLayers[depth] = layer;
    mobileNavDepth = depth;
    mobileNavSyncBackControls();
    return true;
  }

  function mobileNavPush(kind, close, reopen, isOpen, canBack) {
    if (mobileNavApplying || !mobileNavEnsure()) return false;
    const layer = {
      kind:kind,
      close:close,
      reopen:reopen,
      isOpen:isOpen,
      canBack:canBack,
      visible:true
    };
    if (mobileNavPendingBack) {
      mobileNavQueued.push(layer);
      return true;
    }
    return mobileNavCommitLayer(layer);
  }

  function mobileNavRequestBack() {
    if (!mobileNavReady || mobileNavDepth <= 0 || mobileNavPendingBack) return;
    mobileNavPendingBack = true;
    mobileNavSyncBackControls();
    try {
      window.history.back();
    } catch (err) {
      mobileNavPendingBack = false;
      mobileNavReady = false;
      mobileNavSyncBackControls();
    }
  }

  /* Mark any matching visible layer closed, even when another layer is above
     it (departing from a travel picker closes both picker and review modal).
     Once the top entry pops, invisible entries are skipped automatically. */
  function mobileNavClosed(kind, discard) {
    if (mobileNavApplying || !mobileNavReady) return false;
    for (let depth = mobileNavDepth; depth > 0; depth--) {
      const layer = mobileNavLayers[depth];
      if (!layer || layer.kind !== kind || !layer.visible) continue;
      layer.visible = false;
      if (discard) layer.reopen = null;
      if (depth === mobileNavDepth) mobileNavRequestBack();
      return true;
    }
    return false;
  }

  function mobileNavClosedAll(kind, discard) {
    if (mobileNavApplying || !mobileNavReady) return false;
    let found = false;
    for (let depth = mobileNavDepth; depth > 0; depth--) {
      const layer = mobileNavLayers[depth];
      if (!layer || layer.kind !== kind || !layer.visible) continue;
      layer.visible = false;
      if (discard) layer.reopen = null;
      found = true;
    }
    if (found) mobileNavSkipClosedTop();
    mobileNavSyncBackControls();
    return found;
  }

  function mobileNavFlushQueued() {
    if (!mobileNavReady || mobileNavPendingBack || mobileNavNeedsReset) return;
    const queued = mobileNavQueued;
    mobileNavQueued = [];
    for (let i = 0; i < queued.length; i++) {
      const layer = queued[i];
      if (layer.isOpen && !layer.isOpen()) continue;
      if (!mobileNavCommitLayer(layer)) break;
    }
  }

  function mobileNavSkipClosedTop() {
    const layer = mobileNavLayers[mobileNavDepth];
    if (mobileNavDepth > 0 && layer && !layer.visible) {
      mobileNavRequestBack();
      return true;
    }
    return false;
  }

  function mobileNavPop(event) {
    if (!mobileNavReady) return;
    const state = event.state;
    if (!mobileNavOwns(state)) {
      mobileNavReady = false;
      mobileNavQueued = [];
      mobileNavPendingBack = false;
      mobileNavSyncBackControls();
      return;
    }
    const target = Math.max(0, Math.min(state.depth || 0, mobileNavLayers.length - 1));
    const wasPending = mobileNavPendingBack;
    mobileNavPendingBack = false;

    /* A non-dismissible sheet may have a deliberate in-game choice instead of
       a generic Back path. Restore its entry rather than bypassing the choice. */
    if (!wasPending && target < mobileNavDepth) {
      for (let depth = mobileNavDepth; depth > target; depth--) {
        const layer = mobileNavLayers[depth];
        if (layer && layer.visible && layer.canBack && !layer.canBack()) {
          try { window.history.go(mobileNavDepth - target); } catch (err) { /* fallback buttons remain */ }
          return;
        }
      }
    }

    mobileNavApplying = true;
    if (target < mobileNavDepth) {
      for (let depth = mobileNavDepth; depth > target; depth--) {
        const layer = mobileNavLayers[depth];
        if (layer && layer.visible) {
          layer.close();
          layer.visible = false;
        }
      }
    } else if (target > mobileNavDepth) {
      for (let depth = mobileNavDepth + 1; depth <= target; depth++) {
        const layer = mobileNavLayers[depth];
        if (layer && !layer.visible && layer.reopen) {
          layer.reopen();
          layer.visible = true;
        }
      }
    }
    mobileNavApplying = false;
    mobileNavDepth = target;

    if (mobileNavNeedsReset && mobileNavDepth === 0) {
      mobileNavStartNow();
      return;
    }
    if (mobileNavNeedsReset && mobileNavDepth > 0) {
      mobileNavPendingBack = true;
      mobileNavSyncBackControls();
      try {
        window.history.go(-mobileNavDepth);
      } catch (err) {
        mobileNavPendingBack = false;
        mobileNavStartNow();
      }
      return;
    }
    if (mobileNavSkipClosedTop()) return;
    mobileNavFlushQueued();
    mobileNavSyncBackControls();
  }

  /* ================= screens ================= */
  UI.showScreen = function (id) {
    if (id !== null && travelPicker) {
      closeTravelPicker(false);
      mobileNavClosed('travel-picker', true);
    }
    for (const sid of ['loading', 'title', 'bookmarks', 'newgame', 'pickprov', 'chargen']) {
      const el = $(sid);
      el.classList.toggle('hidden', sid !== id);
      el.classList.remove('asbar');
    }
    $('game').classList.toggle('hidden', id !== null);
    if (id && id !== 'loading') {
      setTimeout(function () {
        const scr = $(id);
        if (scr.classList.contains('hidden')) return;
        const b = scr.querySelector('input[type=text], button:not(:disabled):not(.hidden)');
        if (b) b.focus();
      }, 0);
    }
  };

  UI.showGame = function () {
    if (travelPicker) {
      closeTravelPicker(false);
      mobileNavClosed('travel-picker', true);
    }
    UI.showScreen(null);
    document.body.classList.remove('showself');
    mobileNavStart();
    portraitKey = ''; // a new life or loaded save must never keep the old face
    logRenderedTail = null; logRenderedLen = -1;
    FB.map.resize();
    FB.map.request();
  };

  /* ================= toasts (tap one to dismiss it) ================= */
  UI.toast = function (text, params) {
    const box = $('toasts');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = FB.T(text, params);
    el.title = FB.T('Dismiss');
    el.addEventListener('click', function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    box.appendChild(el);
    while (box.children.length > 5) box.removeChild(box.firstChild);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 6000);
  };
  UI.toastMessage = function (message, legacyText) {
    const box = $('toasts');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message ? FB.renderMessage(message, {
      state: FB.state,
      viewer: FB.state && FB.state.player ? FB.state.player.charId : null
    }) : (legacyText || '');
    el.title = FB.T('Dismiss');
    el.addEventListener('click', function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    box.appendChild(el);
    while (box.children.length > 5) box.removeChild(box.firstChild);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 6000);
  };

  /* ================= map politics hookup ================= */
  /* Rebuilding the map base image is the priciest paint in the game, and one
     world tick can transfer several provinces — coalesce to a single rebuild
     on the next frame (before the render: rAF callbacks run in queue order). */
  let mapDirtyQueued = false;
  UI.mapDirty = function () {
    if (mapDirtyQueued) return;
    mapDirtyQueued = true;
    requestAnimationFrame(function () {
      mapDirtyQueued = false;
      mapDirtyNow();
    });
  };
  function mapDirtyNow() {
    const s = FB.state;
    if (!s || !FB.map.base) return;
    const caps = [];
    for (const id in s.realms) {
      const r = s.realms[id];
      if (r.alive && !r.liege) caps.push(r.capital); // sovereign capitals only
    }
    FB.map.setOwnerFns(
      function (pid) { return s.owner[pid]; },
      function (rid) { return s.realms[rid] ? s.realms[rid].color : '#777777'; },
      caps,
      function (pid) { return s.holder ? s.holder[pid] : s.owner[pid]; }
    );
    FB.map.buildBase();
    FB.map.select(FB.map.selected, mapGroupOf); // realm highlight tracks conquests
    FB.map.request();
  }

  /* ================= top bar & panels ================= */
  /* Refresh requests coalesce: a burst of calls in one JS turn (a day tick,
     an autoresolve chain, a whole fast-forward) repaints the panels once,
     on the next animation frame. */
  let refreshQueued = false;
  UI.refresh = function () {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(function () {
      refreshQueued = false;
      refreshNow();
    });
  };

  /* last season's measured net change, as a small ± beside a topbar stat;
     tiny drifts keep one decimal so a slow trickle does not read as +0 */
  function netBadge(v, money) {
    if (v === undefined || v === null) return '';
    const r = Math.abs(v) < 10 ? Math.round(v * 10) / 10 : Math.round(v);
    if (!r) return '';
    const value = money ? FB.money(r, { omitPrimarySymbol:true }) : String(r);
    return ' <span class="net ' + (r > 0 ? 'op-good' : 'op-bad') + '">' +
      (r > 0 ? '+' : '') + esc(value) + '</span>';
  }

  /* a source amount in the breakdown: same rounding as the net badge */
  function fmtAmt(v, money) {
    const r = Math.abs(v) < 10 ? Math.round(v * 10) / 10 : Math.round(v);
    return (r > 0 ? '+' : '') + (money ? FB.money(r) : r);
  }

  /* the topbar stat breakdown (hover on desktop, tap for the modal): what
     gold/prestige/piety the player's station brings in each season, source
     by source — focus, rents, dues, buildings, household, treasures, upkeep */
  function statBreakdownHtml(stat) {
    const bd = FB.incomeBreakdown(FB.state)[stat];
    let h = '';
    for (const ln of bd.lines) {
      h += '<div class="bd-row"><span>' + esc(ln.label) + '</span>' +
        '<span class="bd-amt ' + (ln.amount > 0 ? 'op-good' : 'op-bad') + '">' +
        esc(fmtAmt(ln.amount, stat === 'gold')) + '</span></div>';
    }
    if (!bd.lines.length) {
      h += '<div class="bd-note">' +
        esc(FB.T('No steady sources yet — deeds and events still move it.')) + '</div>';
    } else {
      h += '<div class="bd-row bd-total"><span>' + esc(FB.T('Each season')) + '</span>' +
        '<span class="bd-amt ' + (bd.total > 0 ? 'op-good' : bd.total < 0 ? 'op-bad' : '') + '">' +
        esc(fmtAmt(bd.total, stat === 'gold')) + '</span></div>';
    }
    if (stat === 'gold' && bd.coinAdjustment !== undefined) {
      h += '<div class="bd-row"><span>' + esc(FB.T('Coin and prices this year')) + '</span>' +
        '<span class="bd-amt ' + (bd.coinAdjustment > 0 ? 'op-good' :
          bd.coinAdjustment < 0 ? 'op-bad' : '') + '">' +
        esc(fmtAmt(bd.coinAdjustment, true)) + '</span></div>';
    }
    h += '<div class="bd-note">' + esc(FB.T(
      'The ± beside the stat is last season’s real change — events and deeds included.')) + '</div>';
    return h;
  }

  let portraitKey = '';
  function refreshNow() {
    const s = FB.state;
    if (!s || s.player.dead) return;
    // the fast-forward button's F hotkey badge (desktop only) — rendered every
    // refresh so it holds in both observe and normal modes and in every locale
    $('btn-skip').innerHTML = (FB.isTouch ? '' : '<span class="keyhint">F</span> ') + '▶▶';
    const dd = (s.date.day < 10 ? '\u00A0' : '') + s.date.day; // fixed 2-char day (nbsp — a plain space collapses in HTML)
    /* observe mode: no face, no purse — a nameless watcher and the date */
    if (FB.game.observe) {
      $('tb-name').textContent = FB.T('👁 Observing');
      $('tb-title').textContent = FB.T('the realms play out on their own');
      $('tb-date').innerHTML = '<span class="mono">' + esc(FB.T('{season} {day} · {year} AD', {
        season: FB.seasonName(s.date.season), day: dd, year: s.date.year
      })) + '</span>';
      $('btn-endturn').innerHTML = (FB.isTouch ? '' : '<span class="keyhint">Space</span> ') +
        '<span class="pp">' + esc(FB.T(FB.game.paused ? '▶ Play' : '❚❚ Pause')) + '</span>';
      renderActiveTab();
      return;
    }
    const me = s.chars[s.player.charId];
    $('tb-name').textContent = FB.playerPope && FB.playerPope(s)
      ? me.papalName || me.name : FB.fullName(me);
    // the topbar portrait and crest change rarely; repaint only when
    // something they draw from has moved
    const pk = me.id + '|' + (me.dyn || me.name) + '|' + s.date.year + '|' +
      s.player.profession + '|' + s.player.tier + '|' + me.health + '|' +
      me.traits.join(',') + '|' +
      (me.ailments || []).map(function (ail) {
        return typeof ail === 'string' ? ail : (ail && (ail.id || ail.kind) || '');
      }).join(',') + '|' +
      (FB.loadoutVisualKey ? FB.loadoutVisualKey(s, me.id) : '');
    if (pk !== portraitKey) {
      portraitKey = pk;
      FB.paintPortrait($('tb-portrait'), me, s.date.year, {
        state:s, profession:s.player.profession, tier:s.player.tier
      });
      FB.drawCrest($('crest'), me.dyn || me.name);
    }
    const pr = FB.world.byId[s.player.provinceId];
    $('tb-title').textContent = FB.styledTitle(s) + ' · ' + (pr ? FB.L(pr.name) : '?');
    const dateStr = FB.T('{season} {day} · {year} AD', {
      season: FB.seasonName(s.date.season), day: dd, year: s.date.year
    });
    const net = s.seasonNet || {};
    const coinIcon = FB.money(0, { style:'icon' });
    $('tb-gold').innerHTML = esc(coinIcon) + (coinIcon === '💰' ? ' ' : '') + '<span class="mono">' +
      esc(FB.money(s.player.gold, { omitPrimarySymbol:true })) + '</span>' +
      netBadge(net.gold, true);
    $('tb-gold').setAttribute('aria-label', FB.T('{label}: {amount}', {
      label:FB.currencyLabel(), amount:FB.money(s.player.gold, { style:'long' })
    }));
    $('tb-prestige').innerHTML = '⭐ <span class="mono">' + Math.floor(s.player.prestige) + '</span>' + netBadge(net.prestige);
    $('tb-piety').innerHTML = FB.religionOf(me.religion).icon + ' <span class="mono">' + Math.floor(s.player.piety) + '</span>' + netBadge(net.piety);
    $('tb-health').innerHTML = '❤️ <span class="mono">' + Math.round(me.health) + '</span>';
    $('tb-date').innerHTML = '<span class="mono">' + dateStr + '</span>';
    const kh = FB.isTouch ? '' : '<span class="keyhint">Space</span> ';
    $('btn-endturn').innerHTML = kh + '<span class="pp">' +
      esc(FB.T(FB.game.paused ? '▶ Play' : '❚❚ Pause')) + '</span>';
    $('btn-auto').innerHTML = (FB.isTouch ? '' : '<span class="keyhint">Z</span> ') + '⚙' +
      (FB.game.auto && (FB.game.auto.minor || FB.game.auto.major || FB.game.auto.war || FB.game.auto.all ||
        (FB.game.auto.hosts && FB.game.auto.hosts !== 'manual')) ? '✓' : '');
    renderActiveTab();
  }

  /* hotkey badge for the Nth list item: 1-9, then ⇧1-⇧9 */
  function hintFor(n) {
    if (FB.isTouch) return '';
    if (n < 9) return '<span class="keyhint">' + (n + 1) + '</span>';
    if (n < 18) return '<span class="keyhint">⇧' + (n - 8) + '</span>';
    return '';
  }
  UI.hintFor = hintFor;

  let activeTab = 'actions';    // right panel: actions | prov | network | log
  let activeLeftTab = 'char';   // left panel: char | family (Self open by default)
  const LEFT_TABS = ['char', 'family'];
  const actionGroupsOpen = { work:true, life:false, faith:false, realm:false, war:false };
  const selfSectionsOpen = { titles:false, possessions:false };
  const ACTION_GROUPS = [
    { id:'work', label:'🧰 Work & Wealth' },
    { id:'life', label:'🌿 Life & Family' },
    { id:'faith', label:'🕯 Faith & Community' },
    { id:'realm', label:'👑 Rank & Realm' },
    { id:'war', label:'⚔ War & Diplomacy' }
  ];
  const FOCUS_GROUP = {
    study:'life', play:'life', rest:'life', pray:'faith',
    toil:'work', work_land:'work', market:'work', keep_house:'work',
    craft_work:'work', trade_run:'work', copy_books:'faith', serve_church:'faith',
    militia:'war', drill:'war', stand_guard:'war', train_arms:'war', lead_host:'war',
    manage_manor:'realm', serve_lord:'realm', courtly_graces:'realm',
    scheming:'realm', govern:'realm', patronize:'realm',
    shepherd_diocese:'faith', administer_temporalities:'faith'
  };
  const DEED_GROUP = {
    poach:'work', go_to_town:'work', better_household:'work', livelihoods:'work',
    petition_monopoly:'work',
    buy_freedom:'realm', buy_land:'realm', declare_manor:'realm',
    build:'realm', adopt_tech:'realm',
    squeeze_taxes:'realm', hold_court:'realm', petition_barony:'realm',
    grant_monopoly:'realm',
    petition_liege:'realm', petition_county:'realm', buy_county:'realm',
    settle_waste:'realm', grant_land:'realm', demand_taxes:'realm',
    revoke_county:'realm', governance:'realm', royal_council:'realm',
    coin_credit:'work',
    debase_coinage:'realm',
    seek_match:'life', propose:'life', mediate:'life', swear_friend:'life',
    scheme_rival:'life', begin_plot:'life', take_road:'life', travel_turn_back:'life',
    travel_marriage_residence:'life', travel_settle_here:'life',
    seek_blessing:'faith', seek_absolution:'faith', papacy:'faith',
    bishopric:'faith', visit_diocese:'faith', ecclesiastical_court:'faith',
    convene_synod:'faith', extraordinary_tithe:'faith',
    restore_papacy:'faith',
    claim_caliphate:'faith', call_great_holy_war:'faith',
    join_great_holy_war:'faith', renew_great_holy_war_vow:'faith',
    withdraw_great_holy_war:'faith', give_alms:'faith', hold_feast:'faith',
    great_holy_war_status:'war', great_holy_war_settlement:'war',
    send_envoy:'war', foreign_policy:'war', muster_host:'war', hire_mercs:'war', declare_war:'war',
    declare_independence:'war', pay_homage:'war', appeal_lord:'war',
    swear_fealty:'war'
  };

  function currentFocusDef(s) {
    for (const focus of FB.focuses) {
      if (focus.id === s.player.focus) return focus;
    }
    return null;
  }

  function personalAttentionCommitmentText(s) {
    const target = FB.socialAttentionTarget(s);
    const capacity = FB.socialAttentionCapacity();
    const rate = FB.socialAttentionDailyOpinion();
    if (!target) {
      return FB.T('0/{capacity} assigned · +{rate} Standing/day when assigned', {
        capacity:capacity, rate:rate
      });
    }
    const days = FB.socialAttentionDaysToThreshold(s, target);
    const threshold = FB.relationshipOpinionThreshold();
    const progress = days === null
      ? FB.T('not advancing toward +{threshold}', { threshold:threshold })
      : (days
        ? FB.T('{days} days to +{threshold}', {
          days:days, threshold:threshold
        })
        : FB.T('ready at +{threshold}', { threshold:threshold }));
    const params = {
      name:FB.fullName(target),
      standing:standingValue(FB.standingOf(s, {
        kind:'character', id:target.id
      })),
      progress:progress
    };
    const presence = FB.socialAttentionPresence(s, target);
    if (presence.status === 'on-road') {
      return FB.T('{name} · Standing {standing} · {progress} · paused while on the road',
        params);
    }
    if (presence.status === 'remote') {
      const residence = presence.residenceId && FB.world.byId[presence.residenceId];
      params.province = residence ? residence.name : FB.T('another county');
      return FB.T(
        '{name} · Standing {standing} · {progress} · paused—target is in {province}',
        params);
    }
    return FB.T('{name} · Standing {standing} · {progress}', params);
  }

  function politicalAttentionCommitmentText(s, capacity) {
    const assigned = FB.foreignPolicyAssignments(s);
    const assignments = assigned.map(function (rid) {
      const r = s.realms[rid];
      return FB.T('{realm} {direction}', {
        realm:r ? r.name : rid,
        direction:FB.foreignPolicyStance(s, rid) > 0 ? '↑' : '↓'
      });
    }).join(' · ');
    return assignments
      ? FB.T('{used}/{capacity} assigned · {assignments}', {
        used:assigned.length, capacity:capacity, assignments:assignments
      })
      : FB.T('0/{capacity} assigned · no active directions', {
        capacity:capacity
      });
  }

  function researchCommitmentText(s) {
    const rid = FB.techRealmId(s);
    const realm = s.realms[rid];
    const record = FB.realmTechRecord(s, rid);
    const slots = FB.techSlotCount(s, rid);
    const projects = record.active.map(function (id) {
      const def = FBDATA.tech[id];
      return def ? dt(s, 'tech', id, def, 'name') : id;
    }).join(', ');
    let policy;
    if (rid === 'player' && FB.isPlayerSovereign(s)) {
      policy = FB.game.auto && FB.game.auto.research
        ? techAutomationModeName(FB.game.auto.researchMode)
        : FB.T('Manual selection');
    } else {
      policy = FB.T('Directed by {realm}', {
        realm:realm ? realm.name : FB.T('the sovereign')
      });
    }
    return projects
      ? FB.T('{used}/{slots} slots · {projects} · policy: {policy}', {
        used:record.active.length, slots:slots, projects:projects, policy:policy
      })
      : FB.T('0/{slots} slots occupied · policy: {policy}', {
        slots:slots, policy:policy
      });
  }

  function travelCommitmentText(s, travel) {
    const here = FB.world.byId[travel.currentId];
    const destination = FB.world.byId[travel.destinationId];
    const def = FBDATA.travelPurposes[travel.purpose];
    const purposeName = def
      ? dt(s, 'travelPurpose', travel.purpose, def, 'name') : travel.purpose;
    const phase = travel.phase === 'outbound' ? FB.T('outbound')
      : (travel.phase === 'return' ? FB.T('returning home')
        : FB.T('at the destination'));
    const days = travel.remainingRoute && travel.remainingRoute.length
      ? travel.legDaysLeft +
        Math.max(0, travel.remainingRoute.length - 1) * travel.legDays
      : 0;
    let status = FB.T('{purpose} · {phase} · {location} → {destination}', {
      purpose:purposeName,
      phase:phase,
      location:here ? here.name : '?',
      destination:destination ? destination.name : '?'
    });
    if (days) {
      status += ' · ' + FB.T('{days} travel days remain', { days:days });
    } else if (travel.phase === 'arrived' && FB.travelStayDays) {
      const stayed = FB.travelStayDays(s);
      status += ' · ' + (travel.purpose === 'relationship'
        ? FB.T('{days} days into the visit', { days:stayed })
        : (s.player.tier >= 3
          ? FB.T('{days} days in guest residence', { days:stayed })
          : FB.T('{days} days living and working here', { days:stayed })));
    }
    if (travel.venture) {
      status += ' · ' + (travel.venture.status === 'resolved'
        ? FB.T('venture settled: {money:payout} returned', {
          payout:travel.venture.payout || 0
        })
        : (travel.venture.status === 'cancelled'
          ? FB.T('accompanied venture cancelled')
          : FB.T('{money:stake} accompanied venture at risk', {
            stake:travel.venture.stake
          })));
    }
    return status;
  }

  function financeCommitmentText(s) {
    const loans = FB.financeActiveLoans ? FB.financeActiveLoans(s) : [];
    const partnerships = FB.financeActivePartnerships
      ? FB.financeActivePartnerships(s) : [];
    const ventures = FB.financeActiveTradeVentures
      ? FB.financeActiveTradeVentures(s) : [];
    const parts = [];
    if (loans.length) {
      parts.push(FB.T('Loans: {count}', { count:loans.length }));
    }
    if (partnerships.length) {
      parts.push(FB.T('Backed ventures: {count}', {
        count:partnerships.length
      }));
    }
    if (ventures.length) {
      parts.push(FB.T('Dispatched ventures: {count}', { count:ventures.length }));
    }
    return parts.join(' · ');
  }

  function ongoingCommitmentRow(options) {
    const opts = options || {};
    const tag = opts.disabled ? 'div' : 'button';
    return '<' + tag +
      (opts.disabled ? '' : ' type="button"') +
      ' class="ongoing-commitment-row' +
      (opts.disabled ? ' disabled' : '') + '" data-commitment="' +
      esc(opts.id) + '"' +
      (opts.disabled ? ' aria-disabled="true"' : '') + '>' +
      '<span class="ongoing-commitment-icon" aria-hidden="true">' +
      esc(opts.icon) + '</span><span class="ongoing-commitment-copy"><b>' +
      esc(opts.label) + '</b><small>' + esc(opts.status) + '</small></span>' +
      '<span class="ongoing-commitment-edit">' + esc(opts.action) +
      '</span></' + tag + '>';
  }

  function ongoingCommitmentsHtml(s) {
    const focus = currentFocusDef(s);
    const travel = s.player.travel;
    const attentionTarget = FB.socialAttentionTarget(s);
    const attentionCapacity = FB.politicalAttentionCapacity(s);
    const finance = financeCommitmentText(s);
    let h = '<section class="ongoing-commitments" id="ongoing-commitments" ' +
      'aria-labelledby="ongoing-commitments-title"><div class="ongoing-commitments-head">' +
      '<h3 id="ongoing-commitments-title">' + esc(FB.T('Ongoing commitments')) +
      '</h3><p>' + esc(FB.T(
        'These assignments keep their own capacities, rules, and consequences.')) +
      '</p></div><div class="ongoing-commitment-list">';
    h += ongoingCommitmentRow({
      id:'focus',
      icon:'◉',
      label:FB.T('Daily focus'),
      status:focus
        ? dt(s, 'focus', focus.id, focus, 'label') +
          (travel ? ' · ' + FB.T('paused while traveling') : '')
        : FB.T('No focus selected'),
      action:travel ? FB.T('Paused') : FB.T('Change…'),
      disabled:!!travel
    });
    h += ongoingCommitmentRow({
      id:'personal-attention',
      icon:'🤝',
      label:FB.T('Personal attention'),
      status:personalAttentionCommitmentText(s),
      action:attentionTarget ? FB.T('Review…') : FB.T('Choose…')
    });
    if (attentionCapacity) {
      h += ongoingCommitmentRow({
        id:'political-attention',
        icon:'🕊',
        label:FB.T('Political attention'),
        status:politicalAttentionCommitmentText(s, attentionCapacity),
        action:FB.T('Manage…')
      });
    }
    h += ongoingCommitmentRow({
      id:'research',
      icon:'💡',
      label:FB.T('National research'),
      status:researchCommitmentText(s),
      action:FB.techRealmId(s) === 'player' && FB.isPlayerSovereign(s)
        ? FB.T('Manage…') : FB.T('Review…')
    });
    if (travel) {
      h += ongoingCommitmentRow({
        id:'travel',
        icon:'🧭',
        label:FB.T('Travel'),
        status:travelCommitmentText(s, travel),
        action:travel.phase === 'return' ? FB.T('In progress') : FB.T('Options…'),
        disabled:travel.phase === 'return'
      });
    }
    if (finance) {
      h += ongoingCommitmentRow({
        id:'finance',
        icon:'📜',
        label:FB.T('Financial contracts'),
        status:finance,
        action:FB.T('Review…')
      });
    }
    return h + '</div></section>';
  }
  UI.ongoingCommitmentsHtml = ongoingCommitmentsHtml;

  function renderActiveTab() {
    if (FB.game && FB.game.observe) { // a watcher needs only the land and the chronicle
      if (activeTab === 'prov') renderProv(); else renderLog();
      return;
    }
    // on phones Self/Kin is a closed drawer most of the time (display:none →
    // offsetParent null): skip its rebuild and portrait repaints while it
    // cannot be seen — setTab renders it the moment it opens
    if ($('leftbody').offsetParent !== null) {
      if (activeLeftTab === 'char') renderChar(); else renderFamily();
    }
    if (activeTab === 'actions') renderActions();
    else if (activeTab === 'prov') renderProv();
    else if (activeTab === 'network') renderNetwork();
    else renderLog();
  }

  function renderActions() {
    const s = FB.state, box = $('tab-actions');
    let h = FB.game.uiPrefs && FB.game.uiPrefs.hideOngoingCommitments
      ? '' : ongoingCommitmentsHtml(s);
    if (s.player.war) {
      const w = s.player.war;
      const en = s.realms[w.enemy];
      const warSummary = FB.T('⚔ At war with {enemy} — victories: {wins}; defeats: {losses} · {status} · battle odds ~{odds}%', {
        enemy: en ? en.name : '?',
        wins: w.wins,
        losses: w.losses,
        status: FB.warStateText(s, s.player.charId),
        odds: Math.round(FB.namedChance(s, 'war_battle') * 100)
      });
      h += '<div class="progressnote warnote">' + esc(warSummary) + '</div>';
      const pHost = FB.playerHost ? FB.playerHost(s) : null;
      if (pHost && (!pHost.path || !pHost.path.length) && !pHost.goal) {
        h += '<div class="hint">' + esc(FB.T('Tap the 🚩 on the map to give march orders.')) + '</div>';
      }
    }
    if (s.greatHolyWar) {
      const great = s.greatHolyWar;
      const greatReligion = FBDATA.religions[great.callingReligion];
      const greatName = greatReligion
        ? dt(s, 'religion', great.callingReligion, greatReligion,
          'head.greatHolyWar.name') : FB.T('great holy war');
      const greatKingdom = FBDATA.kingdoms[great.targetKingdom];
      let greatStatus;
      if (great.phase === 'preparation') {
        greatStatus = FB.T('{days} gathering days remain', {
          days:Math.max(0, great.launchTurn - s.turn)
        });
      } else if (great.phase === 'active') {
        greatStatus = FB.T('resolve {resolve} · {days} days before the deadline', {
          resolve:great.resolve,
          days:Math.max(0, great.deadlineTurn - s.turn)
        });
      } else {
        greatStatus = FB.T('settlement council awaits');
      }
      h += '<div class="progressnote warnote">' + esc(FB.T(
        '📯 {campaign} for {kingdom} · {status}', {
          campaign:greatName,
          kingdom:greatKingdom ? greatKingdom.name : great.targetKingdom,
          status:greatStatus
        })) + '</div>';
    }
    const hl = FB.holdingList(s);
    if (hl.length) {
      const hg = FB.holdingBonus(s, 'gold');
      h += '<div class="progressnote">🏠 ' + hl.map(function (id) {
        const d = FBDATA.holdings[id];
        return d ? d.icon : '?';
      }).join('') + (hg ? ' · ' + esc(FB.T('+{money:amount}/season',
        { amount: Math.round(hg * 10) / 10 })) : '') + '</div>';
    }
    const land = FB.landPlots(s);
    if (land.length) {
      const cluster = FB.largestLandCluster(s);
      h += '<div class="progressnote">' + esc(FB.T(
        '🌾 {plots} land plots · largest holding {cluster}/{needed} at {settlement} · +{money:gold}/season',
        {
          plots:land.length,
          cluster:cluster ? cluster.count : 0,
          needed:FBDATA.balance.manorPlotRequirement,
          settlement:cluster ? cluster.settlementName : '?',
          gold:Math.round(FB.landYield(s) * 10) / 10
        })) + '</div>';
    }
    if (s.player.tier >= 3) {
      const lg = s.player.liege && s.player.liege !== 'player' && s.realms[s.player.liege];
      h += '<div class="progressnote">' + esc(FB.T('💰 Seasonal revenue ~{money:gold} · 🛡 levy ~{men} men', {
        gold: FB.playerTax(s), men: FB.playerLevy(s)
      })) + (lg ? ' · ' + esc(FB.T('vassal of')) +
        ' <span class="linklike" data-liege="' + esc(s.player.liege) +
        '" title="' + esc(FB.T('See your liege’s sheet')) + '">' + esc(lg.name) + '</span>' :
        ' · ' + esc(FB.T('independent'))) + '</div>';
      if (s.player.provs && s.player.provs.length) {
        const dcap = FB.domainCap(s), dheld = s.player.provs.length, dover = dheld > dcap;
        h += '<div class="progressnote' + (dover ? ' warnote' : '') + '">' +
          esc(FB.T('🏰 Domain {held}/{cap} held directly', { held: dheld, cap: dcap })) +
          (dover ? ' · ' + esc(FB.T('overextended — your income & levy cut {pct}%', {
            pct: Math.round((1 - FB.domainPenalty(s)) * 100)
          })) : '') + '</div>';
      }
      const parts = [];
      for (const bp of FB.demesne(s)) {
        const blt = FB.builtIn(s, bp).filter(function (e) { return !e.ruined; });
        if (blt.length) {
          parts.push(esc(FB.world.byId[bp].name) + ' ' + blt.map(function (e) {
            const d = FBDATA.buildings[e.id];
            return d ? d.icon : '?';
          }).join(''));
        }
      }
      if (parts.length) h += '<div class="progressnote">🏗 ' + parts.join(' · ') + '</div>';
    }
    h += nextStepHint(s);
    box.innerHTML = h;
    let n = 0; // hotkey numbering covers only actions visible in open groups
    const focuses = FB.listFocuses(s);
    const instants = FB.listInstants(s);
    const combinedFocuses = !!(FB.game.uiPrefs && FB.game.uiPrefs.combinedFocuses);
    function appendFocus(f) {
      const cur = s.player.focus === f.id;
      const btn = document.createElement('button');
      btn.className = 'actionbtn' + (cur ? ' focused' : '');
      btn.setAttribute('data-focus-id', f.id);
      btn.innerHTML = hintFor(n) +
        (cur ? '◉ ' : '○ ') + esc(dt(s, 'focus', f.id, f, 'label')) +
        '<span class="adesc">' + esc(FB.translateKnown(f.desc(s))) + '</span>';
      (function (id) {
        btn.addEventListener('click', function () { FB.setFocus(FB.state, id); });
      })(f.id);
      box.appendChild(btn);
      n++;
    }
    if (combinedFocuses && focuses.length) {
      const fh = document.createElement('div');
      fh.className = 'actionsubhead';
      fh.textContent = FB.T('Daily focus — continues until changed');
      box.appendChild(fh);
      for (const f of focuses) appendFocus(f);
    }
    for (const group of ACTION_GROUPS) {
      const gf = combinedFocuses ? [] : focuses.filter(function (f) {
        return (FOCUS_GROUP[f.id] || 'realm') === group.id;
      });
      const ga = instants.filter(function (item) { return (DEED_GROUP[item.a.id] || 'realm') === group.id; });
      if (!gf.length && !ga.length) continue;
      const toggle = document.createElement('button');
      const open = !!actionGroupsOpen[group.id];
      toggle.className = 'actiongroup-toggle';
      toggle.setAttribute('data-action-group', group.id);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.innerHTML = '<span>' + esc(FB.T(group.label)) + '</span><span>' +
        esc(String(gf.length + ga.length)) + ' ' +
        (open ? '▾' : '▸') + '</span>';
      (function (id) {
        toggle.addEventListener('click', function () {
          actionGroupsOpen[id] = !actionGroupsOpen[id];
          renderActions();
        });
      })(group.id);
      box.appendChild(toggle);
      if (!open) continue;
      if (gf.length) {
        const fh = document.createElement('div');
        fh.className = 'actionsubhead';
        fh.textContent = FB.T('Daily focus — continues until changed');
        box.appendChild(fh);
      }
      for (const f of gf) appendFocus(f);
      if (ga.length) {
        const ih = document.createElement('div');
        ih.className = 'actionsubhead';
        ih.textContent = FB.T('Deeds — done at once unless noted');
        box.appendChild(ih);
      }
      for (const item of ga) {
        const btn = document.createElement('button');
        btn.className = 'actionbtn';
        btn.setAttribute('data-action-id', item.a.id);
        btn.disabled = !item.can;
        const label = dt(s, 'action', item.a.id, item.a, 'label');
        btn.innerHTML = hintFor(n) +
          esc(label) + '<span class="adesc">' +
          esc(FB.translateKnown(item.can ? item.a.desc(s) : item.reason)) + '</span>';
        (function (id) {
          btn.addEventListener('click', function () { FB.runInstant(FB.state, id); });
        })(item.a.id);
        box.appendChild(btn);
        n++;
      }
    }
    function focusActionControl(selector, fallbackGroup, scrollBlock) {
      const target = box.querySelector(selector) ||
        (fallbackGroup && box.querySelector(
          '[data-action-group="' + fallbackGroup + '"]'));
      if (!target) return;
      target.scrollIntoView({ block:scrollBlock || 'nearest' });
      target.focus({ preventScroll:true });
    }
    function revealActionControl(groupId, selector, scrollBlock) {
      if (groupId) actionGroupsOpen[groupId] = true;
      renderActions();
      focusActionControl(selector, groupId, scrollBlock);
    }
    document.querySelectorAll('#ongoing-commitments button[data-commitment]').forEach(
      function (button) {
        button.addEventListener('click', function () {
          const commitment = button.dataset.commitment;
          if (commitment === 'focus') {
            const focus = currentFocusDef(s);
            const group = focus ? (FOCUS_GROUP[focus.id] || 'realm') : 'work';
            revealActionControl(group, focus
              ? '[data-focus-id="' + focus.id + '"]'
              : '[data-action-group="' + group + '"]', 'start');
          } else if (commitment === 'personal-attention') {
            const target = FB.socialAttentionTarget(s);
            if (target) {
              UI.showCharModal(target.id);
            } else {
              setTab('network');
              const heading = $('network-connections');
              if (heading) {
                heading.scrollIntoView({ block:'start' });
                heading.focus({ preventScroll:true });
              }
            }
          } else if (commitment === 'political-attention') {
            UI.showForeignPolicy();
          } else if (commitment === 'research') {
            UI.showTech();
          } else if (commitment === 'travel') {
            revealActionControl('life',
              '[data-action-id="travel_turn_back"], ' +
              '[data-action-id="travel_marriage_residence"], ' +
              '[data-action-id="travel_settle_here"]');
          } else if (commitment === 'finance') {
            UI.showFinance();
          }
        });
      });
    FB.localizeTree(box);
  }

  function nextStepHint(s) {
    if (s.player.tier === 0) {
      return '<div class="progressnote">🧭 ' + esc(FB.T(
        'Path: save {money:gold} (or build Standing with your lord) to buy freedom.',
        { gold: FBDATA.balance.freedomCost })) + '</div>';
    }
    if (s.player.tier === 1) {
      const cluster = FB.largestLandCluster(s);
      return '<div class="progressnote">🧭 ' + esc(FB.T(
        'Path: assemble {needed} plots in one settlement ({cluster}/{needed}), then reach {prestige} prestige and declare a manor. Soldiering and the church offer other roads.',
        {
          cluster:cluster ? cluster.count : 0,
          needed:FBDATA.balance.manorPlotRequirement,
          prestige:FBDATA.balance.manorPrestige
        })) + '</div>';
    }
    if (s.player.tier === 2) {
      const text = FB.gentryEstablished(s)
        ? FB.T('Path: serve your lord, win renown ({prestige}+ prestige, Standing {standing}+), and petition for a barony.',
          {
            prestige:FBDATA.balance.baronyPrestige,
            standing:FBDATA.balance.baronyOpinion
          })
        : FB.T('Path: establish your gentle house. An heir who inherits its standing may petition for a barony; battlefield and church elevations remain exceptional roads.');
      return '<div class="progressnote">🧭 ' + esc(text) + '</div>';
    }
    const tips = {
      3: 'Path: petition your liege for a county — or declare independence and take one.',
      4: 'Path: hold the majority of a de jure duchy (petition, inherit, or conquer) to be styled duke.',
      5: 'Path: hold the majority of a de jure kingdom and win independence to be crowned king.',
      6: 'Path: hold the majority of two kingdoms of one empire to be crowned emperor.',
      7: 'You stand at the summit of the world.'
    };
    return '<div class="progressnote">🧭 ' + esc(FB.T(tips[s.player.tier] || '')) + '</div>';
  }

  function skillBars(c) {
    let h = '';
    const soft = FBDATA.balance.skillSoftCap || 20;
    for (const k of FB.SKILLS) {
      const v = FB.skillOf(c, k);
      const name = FB.skillName(k);
      // the bar fills to the soft cap; past it the number keeps climbing and
      // the bar turns bright to mark mastery beyond the soft cap
      h += '<div class="skillrow"><span class="skill-label" title="' + esc(name) + '">' +
        esc(name) + '</span>' +
        '<span class="bar"><i' + (v > soft ? ' class="over"' : '') + ' style="width:' +
        Math.min(100, v / soft * 100) + '%"></i></span><span class="num">' + v + '</span></div>';
    }
    return h;
  }
  const TRAIT_CLASS_ORDER = ['disposition', 'formation', 'reputation', 'condition', 'other'];
  const TRAIT_CLASS_NAMES = {
    disposition:'Disposition', formation:'Formation', reputation:'Reputation',
    condition:'Condition', other:'Other'
  };
  function traitClassId(trait) {
    const id = trait && trait['class'];
    return TRAIT_CLASS_ORDER.indexOf(id) >= 0 ? id : 'other';
  }
  function traitClassName(trait) {
    return FB.T(TRAIT_CLASS_NAMES[traitClassId(trait)]);
  }
  function traitChip(s, id, trait) {
    const name = dt(s, 'trait', id, trait, 'name');
    return '<button type="button" class="traitchip" data-trait="' + esc(id) +
      '" aria-label="' + esc(FB.T('{trait}, {className}', {
        trait:name, className:traitClassName(trait)
      })) + '">' + esc(trait.icon || '') + (trait.icon ? ' ' : '') +
      esc(name) + '</button>';
  }
  function traitChips(s, c, grouped) {
    if (!c.traits || !c.traits.length) {
      return '<span class="cmeta">' + esc(FB.T('No notable traits.')) + '</span>';
    }
    if (!grouped) {
      let flat = '';
      for (const id of c.traits) {
        const trait = FBDATA.traits[id];
        if (trait) flat += traitChip(s, id, trait);
      }
      return flat || '<span class="cmeta">' + esc(FB.T('No notable traits.')) + '</span>';
    }
    const groups = {
      disposition:[], formation:[], reputation:[], condition:[], other:[]
    };
    for (const id of c.traits) {
      const trait = FBDATA.traits[id];
      if (trait) groups[traitClassId(trait)].push({ id:id, trait:trait });
    }
    let h = '<div class="traitgroups">';
    for (const classId of TRAIT_CLASS_ORDER) {
      const group = groups[classId];
      if (!group.length) continue;
      h += '<div class="traitgroup"><div class="traitgroup-label">' +
        esc(FB.T(TRAIT_CLASS_NAMES[classId])) + '</div><div class="traitgroup-chips">';
      for (const item of group) h += traitChip(s, item.id, item.trait);
      h += '</div></div>';
    }
    return h + '</div>';
  }

  function healthWord(hp) {
    return FB.T(hp >= 9 ? 'Hale' : hp >= 7 ? 'Worn' : hp >= 5 ? 'Wounded' :
      hp >= 3 ? 'Grievously wounded' : 'At death’s door');
  }

  /* the named wounds & sicknesses the player carries (see FBDATA.ailments) */
  function ailmentChips(s, me) {
    const ails = FB.ailmentsOf(me);
    if (!ails.length && !s.player.flags.ill) return '';
    let h = '';
    for (const a of ails) {
      h += '<span class="traitchip" data-ailment="' + a.id + '">' + a.def.icon + ' ' +
        esc(dt(s, 'ailment', a.id, a.def, 'name')) + '</span>';
    }
    // saves from before named ailments know only the bare flag
    if (s.player.flags.ill && !FB.hasAilmentKind(me, 'sickness')) {
      h += '<span class="traitchip" data-ailment="ill">🤒 ' + esc(FB.T('Ill')) + '</span>';
    }
    return '<div class="kv"><span>' + esc(FB.T('Ailments')) + '</span></div>' + h;
  }

  /* the 🎓 upbringing summary line, shared by the Self tab and character sheets */
  function upbringingNote(s, c) {
    const focusName = (c.edu && c.edu.focus) ? FB.skillName(c.edu.focus) : FB.T('none chosen');
    const schoolId = FB.schoolingId(s, c);
    let instruction = FB.T('home instruction');
    if (schoolId && FBDATA.schooling[schoolId]) {
      instruction = dt(s, 'schooling', schoolId, FBDATA.schooling[schoolId], 'name');
    } else if (c.edu && c.edu.tutorId === 'self') instruction = FB.T('you yourself');
    else if (c.edu && c.edu.tutorId && s.chars[c.edu.tutorId] && !s.chars[c.edu.tutorId].dead) {
      instruction = s.chars[c.edu.tutorId].name;
    }
    const chance = Math.round(Math.min(FBDATA.balance.educationChanceCap || 0.9,
      FB.educationInstructionChance(s, c) + FB.holdingBonus(s, 'edu') +
      (FB.householdStandardEffect ? FB.householdStandardEffect(s, 'education') : 0)) * 100);
    const fee = FB.schoolingCost(s, c);
    let note = FB.T('🎓 Upbringing — focus: {focus} · instruction: {instruction} · {chance}% yearly', {
      focus:focusName, instruction:instruction, chance:chance
    });
    if (fee) note = FB.T('{summary} · {money:amount} each season', {
      summary:note, amount:fee
    });
    if (c.edu && c.edu.schoolUnpaid) {
      note = FB.T('{summary} · fee unpaid; this term is paused', { summary:note });
    }
    let h = '<div class="progressnote">' + esc(note) +
      (FB.ageOf(c, s.date.year) < 6 ? ' <span class="cmeta">' +
      esc(FB.T('(lessons begin at age 6)')) + '</span>' : '') + '</div>';
    const terms = c.edu && c.edu.schoolTerms && typeof c.edu.schoolTerms === 'object' &&
      !Array.isArray(c.edu.schoolTerms) ? c.edu.schoolTerms : {};
    const warned = {};
    for (const id in terms) {
      const def = FBDATA.schooling[id];
      const count = Math.min(4, Math.max(0, Math.floor(Number(terms[id]) || 0)));
      const annualMortality = def ? Math.min(1,
        Math.max(0, Number(def.annualMortality) || 0)) : 0;
      if (!annualMortality || !count) continue;
      warned[id] = 1;
      const risk = Math.round(annualMortality * count / 4 * 1000) / 10;
      h += '<div class="progressnote">' + esc(FB.T(
        '⚠ {school}: {terms}/4 completed terms · {risk}% extra fatality risk at New Year', {
          school:dt(s, 'schooling', id, def, 'name'), terms:count, risk:risk
        })) + '</div>';
    }
    const activeDef = schoolId && FBDATA.schooling[schoolId];
    const activeMortality = activeDef ? Math.min(1,
      Math.max(0, Number(activeDef.annualMortality) || 0)) : 0;
    if (activeMortality && !warned[schoolId]) {
      const termRisk = Math.round(activeMortality / 4 * 1000) / 10;
      const annualRisk = Math.round(activeMortality * 1000) / 10;
      h += '<div class="progressnote">' + esc(FB.T(
        '⚠ Each completed term at {school} adds {termRisk}% extra fatality risk at New Year ({annualRisk}% after four terms).', {
          school:dt(s, 'schooling', schoolId, activeDef, 'name'),
          termRisk:termRisk, annualRisk:annualRisk
        })) + '</div>';
    }
    return h;
  }

  function livelihoodNote(s, c) {
    const career = FB.careerOf(s, c);
    const def = career && FBDATA.careers[career.profession];
    if (!def) return '';
    let detail = FB.careerTitle(s, c);
    if (def.guild) detail += ' · ' + FB.guildTitle(career);
    const former = c.id === s.player.charId && s.player.tier >= 3;
    let h = '<div class="progressnote">' + esc(former
      ? FB.T('🧰 Former calling — {career}', { career:detail })
      : FB.T('🧰 Work — {career}', { career:detail })) + '</div>';
    const standings = FB.religiousStandings ? FB.religiousStandings(s, c) : [];
    for (let i = 0; i < standings.length; i++) {
      const standing = standings[i];
      h += '<div class="progressnote">' + esc(FB.T(
        standing.kind === 'lay'
          ? '🕯 Lay standing — {rank}' : '🛐 Vocation — {rank}', {
          rank:FB.religiousRankTitle(s, c, standing.path)
        })) + '</div>';
    }
    const bishopric = FB.bishopricOf && FB.bishopricOf(s, c);
    if (bishopric) {
      const see = FB.world.byId[bishopric.seeProvinceId];
      h += '<div class="progressnote">' + esc(FB.T(
        '⛪ Episcopal office — Bishop of {see}', {
          see:see ? see.name : bishopric.seeProvinceId
        })) + '</div>';
    }
    return h;
  }

  function itemSlotLabel(slot) {
    if (slot === 'head') return FB.T('Head');
    if (slot === 'neck') return FB.T('Neck');
    if (slot === 'body') return FB.T('Body');
    if (slot === 'waist') return FB.T('Waist');
    if (slot === 'feet') return FB.T('Feet');
    if (slot === 'leftHand') return FB.T('Left hand');
    if (slot === 'rightHand') return FB.T('Right hand');
    if (slot === 'ring') return FB.T('Ring');
    return slot;
  }
  function itemWearerText(s, ref) {
    const at = FB.itemAssignment && FB.itemAssignment(s, ref);
    if (!at) return FB.T('In the armory');
    const c = s.chars[at.cid];
    return c ? FB.T('Worn by {name}', { name:FB.fullName(c) }) : FB.T('Equipped');
  }
  function equipmentBlockedText(reason) {
    if (reason === 'travel') {
      return FB.T('Equipment cannot be changed while the household is traveling.');
    }
    if (reason === 'event') {
      return FB.T('Resolve the current event before changing equipment.');
    }
    return '';
  }
  function equipmentBonusHtml(s, c) {
    const fx = {};
    const keys = FB.SKILLS.concat(['battle', 'prestige', 'piety', 'gold', 'health']);
    for (let i = 0; i < keys.length; i++) {
      const value = FB.itemBonus(s, keys[i], c.id);
      if (value) fx[keys[i]] = value;
    }
    const summary = itemFxText({ fx:fx });
    return '<div class="equip-bonuses"><div class="equip-bonus-heading">' +
      esc(FB.T('Equipment bonuses')) + '</div><div' +
      (summary ? '' : ' class="cmeta"') + '>' +
      esc(summary || FB.T('No equipment bonuses.')) + '</div></div>';
  }
  function equipmentSheetHtml(s, c) {
    const loadout = FB.loadoutOf(s, c.id);
    const blocked = FB.equipmentBlockedReason ? FB.equipmentBlockedReason(s) : null;
    let h = '<div class="paper-sheet"><div class="paper-figure">' +
      '<canvas class="paperdoll" data-cid="' + c.id +
      '" width="240" height="450" role="img" aria-label="' +
      esc(FB.T('Full figure of {name}', { name:FB.fullName(c) })) + '"></canvas>' +
      equipmentBonusHtml(s, c) + '</div>' +
      '<div class="equip-panel"><div class="equip-heading">' + esc(FB.T('Equipment')) +
      '</div><div class="equip-grid">';
    for (const slot of FB.ITEM_SLOTS) {
      const ref = loadout[slot];
      const item = ref && FB.resolveItem(s, ref);
      let value = item ? item.def.icon + ' ' + FB.itemName(s, ref) : FB.T('Empty');
      if (item && item.grip === 2) value += ' - ' + FB.T('two-handed');
      const aria = FB.T('{slot}: {item}', {
        slot:itemSlotLabel(slot),
        item:item ? FB.itemName(s, ref) : FB.T('Empty')
      });
      h += '<button type="button" class="equip-slot" data-equip-cid="' + c.id +
        '" data-equip-slot="' + slot + '" aria-label="' + esc(aria) + '"' +
        (blocked ? ' disabled' : '') + '><span>' + esc(itemSlotLabel(slot)) +
        '</span><b>' + esc(value) + '</b></button>';
    }
    h += '</div>' + (blocked ? '<div class="progressnote warnote">' +
      esc(equipmentBlockedText(blocked)) + '</div>' :
      '<div class="equip-note">' + esc(FB.T(
        'Choose a slot, then choose an exact object from the family armory. Changes cost no day.')) +
      '</div>') +
      '<button type="button" class="btn equip-best-action" id="equipment-best"' +
      (blocked ? ' disabled' : '') + '>' +
      esc(FB.T('Equip Best…')) + '</button></div></div>';
    return h;
  }
  function wireEquipmentButtons(root, returnMode) {
    if (!root) return;
    const buttons = root.querySelectorAll('[data-equip-cid][data-equip-slot]');
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        UI.showEquipSlot(buttons[i].getAttribute('data-equip-cid'),
          buttons[i].getAttribute('data-equip-slot'), returnMode);
      });
    }
  }

  function itemChips(s, ids) {
    ids = ids || FB.itemList(s);
    if (!ids.length) return '<span class="cmeta">' + esc(FB.T('Nothing of note.')) + '</span>';
    let h = '';
    for (const ref of ids) {
      const item = FB.resolveItem(s, ref);
      if (item) {
        const pledged = FB.financeCollateralPledged &&
          FB.financeCollateralPledged(s, 'item', ref);
        h += '<span class="traitchip" data-item="' + esc(ref) + '" title="' +
          esc(pledged ? FB.T('Pledged to a lender') : itemWearerText(s, ref)) + '">' +
          item.def.icon + ' ' + esc(FB.itemName(s, ref)) +
          (pledged ? ' - ' + esc(FB.T('pledged')) : '') + '</span>';
      }
    }
    return h + '<div class="cmeta" style="font-size:12px;margin-top:2px">' +
      esc(FB.T('The armory is shared. Only equipped objects grant their powers.')) + '</div>';
  }

  /* the player's held titles (tier 3+): high dignities as rows, counties compact */
  function titleRows(s, t) {
    t = t || FB.playerTitles(s);
    if (!t.high.length && !t.counties.length) return '';
    let h = '';
    for (const e of t.high) {
      h += '<div class="kv"><span>' + esc(FB.T(e.d)) + '</span><b>' +
        esc(e.titleData ? FB.renderTitleSnapshot(e.titleData) : FB.L(e.t || '')) +
        '</b></div>';
    }
    if (t.counties.length) {
      const names = [];
      for (const pid of t.counties) {
        const pr = FB.world.byId[pid];
        if (pr) names.push(pr.name);
      }
      h += '<div class="kv"><span>' + esc(FB.T('Counties ({count})',
        { count: t.counties.length })) + '</span><b>' + esc(names.join(' · ')) + '</b></div>';
    }
    return h;
  }

  function selfSectionHtml(id, label, count, body) {
    const open = !!selfSectionsOpen[id];
    const bodyId = 'self-section-' + id;
    return '<button type="button" class="actiongroup-toggle self-section-toggle" ' +
      'data-self-section="' + id + '" aria-expanded="' + (open ? 'true' : 'false') +
      '" aria-controls="' + bodyId + '"><span>' + esc(FB.T(label)) + '</span><span>' +
      esc(String(count)) + ' ' + (open ? '▾' : '▸') + '</span></button>' +
      '<div id="' + bodyId + '" class="self-section-body' + (open ? '' : ' hidden') +
      '">' + body + '</div>';
  }

  function dynasticStatusRows(s, me) {
    let h = '';
    const claim = FB.fabricatedClaimOf(s);
    if (claim) {
      const pr = FB.world.byId[claim.pid];
      h += kv('Fabricated claim', esc(pr ? pr.name : claim.pid));
    }
    if (me.restorationRight) {
      const rr = me.restorationRight;
      h += kv('Crown-restoration right', esc(rr.titleName || FB.T('Disputed crown')));
    }
    const compact = FB.royalCompactOf(s);
    if (compact) {
      const realm = s.realms[compact.realmId];
      h += kv('Royal marriage compact', esc(realm ? realm.name : compact.realmId));
    }
    if (FB.allianceOf(s, 'player')) {
      h += kv('Defensive alliance', esc(allianceText(s, 'player')));
    }
    return h;
  }

  function religiousHeadStatusRow(s, religionId) {
    const rel = FBDATA.religions[religionId];
    if (!rel || !rel.head) return '';
    if (religionId === 'catholic' && FB.ensurePapacy) {
      const papacy = FB.ensurePapacy(s);
      const me = s.chars[s.player.charId];
      const obedienceId = FB.papalObedienceForCharacter(s, me) ||
        papacy.romanObedience;
      const obedience = papacy.obediences[obedienceId];
      const pope = obedience && obedience.claimantId &&
        s.chars[obedience.claimantId];
      const election = obedience && papacy.elections[obedience.id];
      const authorityBand = obedience &&
        FB.papalAuthorityBand(obedience.authority);
      const standing = obedience
        ? FB.T('{authority} authority · {band}', {
          authority:Math.round(obedience.authority),
          band:dt(s, 'papalAuthorityBand', authorityBand.id,
            authorityBand, 'name')
        })
        : '';
      const office = pope
        ? FB.T('{pope} · {standing}', {
          pope:FB.papalDisplayName(s, pope), standing:standing
        })
        : FB.T('Vacant · {standing}{ballot}', {
          standing:standing,
          ballot:election && election.phase !== 'resolved'
            ? FB.T(' · ballot {round}', { round:election.round || 0 }) : ''
        });
      return kv('Religious head', esc(office));
    }
    const title = FB.religiousHeadTitle(s, religionId);
    const head = FB.religiousHeadOf(s, religionId);
    if (head) {
      return kv('Religious head', esc(FB.T('{title} · {realm}', {
        title:title, realm:head.name
      })));
    }
    const vacancy = FB.religiousHeadVacancy(s, religionId);
    const days = vacancy ? Math.max(0, s.turn - vacancy.turn) : 0;
    return kv('Religious head', esc(FB.T('{title} — vacant for {days} days', {
      title:title, days:days
    })));
  }

  function renderChar() {
    const s = FB.state, me = s.chars[s.player.charId];
    const rel = FB.religionOf(me.religion), cul = FB.cultureOf(me.culture);
    const titles = FB.playerTitles(s);
    const titleCount = titles.high.length + titles.counties.length;
    const items = FB.itemList(s);
    const standardSummary = householdStandardsSummary(s);
    let h =
      '<div class="panelh self-name">' + esc(FB.fullName(me)) + '</div>' +
      '<div class="self-overview"><div class="self-portrait-tools">' +
      '<button type="button" class="self-portrait-button" id="self-equipment-portrait" ' +
      'aria-label="' + esc(FB.T('Equip items…')) + '" title="' +
      esc(FB.T('Equip items…')) + '"><canvas id="selfportrait" class="pface" data-cid="' +
      me.id + '" width="72" height="82" aria-hidden="true"></canvas></button>' +
      '<button type="button" class="btn portrait-equip" id="self-equipment" ' +
      'data-action-id="self-equipment">' + esc(FB.T('Equip items…')) + '</button>' +
      '</div><div class="self-overview-skills">' + panelh('Skills') + skillBars(me) +
      '</div></div>' +
      panelh('Traits') + traitChips(s, me, true) +
      '<div class="self-details-divider" aria-hidden="true"></div>' +
      kv('Rank', esc(FB.styledTitle(s))) +
      papalOfficeHtml(s, me) +
      kv('Age', FB.ageOf(me, s.date.year)) +
      kv('Culture', esc(cultureName(s, me.culture))) +
      kv('Faith', rel.icon + ' ' + esc(religionName(s, me.religion))) +
      religiousHeadStatusRow(s, me.religion) +
      (FB.playerExcommunicated && FB.playerExcommunicated(s)
        ? kv('Church standing', esc(FB.T('Excommunicated'))) : '') +
      kv('Health', Math.round(me.health) + ' / 10 · ' + healthWord(me.health)) +
      ailmentChips(s, me) +
      kv('Common Voice', Math.round(FB.popEffective ? FB.popEffective(s) : s.player.pop)) +
      (s.player.liege ? kv('Standing with your liege',
        standingSpan(FB.standingOf(s, {
          kind:'realm', id:s.player.liege
        }))) : '') +
      (titleCount ? selfSectionHtml('titles', 'Titles', titleCount, titleRows(s, titles)) : '') +
      dynasticStatusRows(s, me) +
      selfSectionHtml('possessions', 'Possessions', items.length, itemChips(s, items)) +
      panelh('Dynasty') +
      kv('House', esc(me.dyn || '—')) +
      kv('Generation', (s.generation || 1));
    h += panelh('Livelihood') + livelihoodNote(s, me);
    if (FB.hasBishopric && FB.hasBishopric(s, me)) {
      h += '<button class="actionbtn" id="self-bishopric">⛪ ' +
        esc(FB.T('Open the Bishopric')) +
        '<span class="adesc">' + esc(FB.T(
          'Review the see, temporalities, episcopal powers, investiture, and Cardinal requirements.')) +
        '</span></button>';
    }
    if (standardSummary) {
      h += kv('Active household standards', esc(standardSummary));
    }
    if (FB.ageOf(me, s.date.year) >= 10) {
      const landed = s.player.tier >= 3;
      h += '<button class="actionbtn" id="self-work">' +
        esc(FB.T(landed ? '🧰 Household work & enterprises…' : '🧰 Work, training & enterprises…')) +
        '<span class="adesc">' + esc(FB.T(landed
          ? 'Your calling is now biography; manage the occupations and productive property of your household.'
          : 'Manage the occupations and productive property of your household.')) +
        '</span></button>';
    } else {
      h += '<div class="hint">' + esc(FB.T('Too young for an apprenticeship yet.')) + '</div>';
    }
    if (FB.ageOf(me, s.date.year) < 16) {
      h += panelh('Upbringing') + upbringingNote(s, me) +
        '<button class="actionbtn" id="self-edufocus">🎓 Choose your education focus…' +
        '<span class="adesc">Direct your formative years toward one art.</span></button>' +
        '<button class="actionbtn" id="self-tutor">🧑‍🏫 Choose schooling or a tutor…' +
        '<span class="adesc">Instruction raises your yearly learning chance; paid lessons charge each season.</span></button>';
    }
    $('tab-char').innerHTML = h;
    FB.localizeTree($('tab-char'));
    FB.paintFaces($('tab-char'), s);
    const equipmentTriggers = $('tab-char').querySelectorAll(
      '#self-equipment-portrait, #self-equipment');
    for (let i = 0; i < equipmentTriggers.length; i++) {
      equipmentTriggers[i].addEventListener('click', function () {
        UI.showEquipmentModal(me.id, 'close');
      });
    }
    const sectionToggles = $('tab-char').querySelectorAll('[data-self-section]');
    for (let i = 0; i < sectionToggles.length; i++) {
      sectionToggles[i].addEventListener('click', function () {
        const id = sectionToggles[i].getAttribute('data-self-section');
        selfSectionsOpen[id] = !selfSectionsOpen[id];
        renderChar();
        const next = $('tab-char').querySelector('[data-self-section="' + id + '"]');
        if (next) next.focus({ preventScroll:true });
      });
    }
    const sef = $('self-edufocus');
    if (sef) sef.addEventListener('click', function () { UI.showEduFocus(me.id); });
    const stu = $('self-tutor');
    if (stu) stu.addEventListener('click', function () { UI.showTutorPick(me.id); });
    const sw = $('self-work');
    if (sw) sw.addEventListener('click', UI.showLivelihoods);
    const bishopric = $('self-bishopric');
    if (bishopric) bishopric.addEventListener('click', UI.showBishopric);
  }

  function charRow(s, c, meta, stats) {
    const standing = FB.standingOf(s, { kind:'character', id:c.id });
    let mid = '<span class="cname">' + esc(FB.fullName(c)) + '</span><br><span class="cmeta">' + esc(meta) + '</span>';
    if (stats) {
      let sk = '';
      for (const k of FB.SKILLS) {
        sk += '<span title="' + esc(FB.skillName(k)) + '">' +
          FB.SKILL_ICONS[k] + FB.skillOf(c, k) + '</span> ';
      }
      mid += '<br><span class="cmeta">' + sk.trim() + '</span>';
    }
    return '<div class="charrow" data-cid="' + c.id + '" title="' +
      esc(FB.T('See their sheet and your dealings with them')) + '">' +
      FB.faceTag(c, 36, 42) +
      '<span>' + mid + '</span>' +
      '<span class="cop ' + standingClass(standing) + '">' +
      esc(standingValue(standing)) + '</span></div>';
  }

  function relationText(s, c) {
    const me = s.chars[s.player.charId];
    if (c.id === me.spouseId) return FB.T('Your spouse');
    if (me.fatherId === c.id) return FB.T('Your father');
    if (me.motherId === c.id) return FB.T('Your mother');
    const descendantKind = FB.playerDescendantKind(s, c.id);
    if (descendantKind === 'child') return FB.T('Your child');
    if (descendantKind === 'grandchild') {
      return FB.T(c.sex === 'f' ? 'Your granddaughter' : 'Your grandson');
    }
    if ((c.role === 'sibling' && c.dyn === me.dyn) ||
      (me.fatherId && me.fatherId === c.fatherId) ||
      (me.motherId && me.motherId === c.motherId)) return FB.T('Your sibling');
    if (s.player.courtingId === c.id) return FB.T('Courting');
    if (s.roles.lord === c.id) return FB.T('Your lord');
    if (s.roles.priest === c.id) {
      return FB.T('Your {cleric}', { cleric: FB.holyWord(me.religion) });
    }
    if (s.roles.friend === c.id) return FB.T('Your friend');
    if (s.roles.rival === c.id) return FB.T('Your rival');
    return null;
  }
  function maritalText(s, c) {
    return FB.T(FB.spouseOf(s, c) ? 'Married' : 'Unwed');
  }

  /* why the marriage path is closed for this character (null = no note needed) */
  function courtBlockReason(s, c) {
    const me = s.chars[s.player.charId];
    const y = s.date.year;
    if (FB.papacyCelibate &&
        (FB.papacyCelibate(s, me) || FB.papacyCelibate(s, c))) {
      return FB.T('the vows of a Bishop, Cardinal, or Pope forbid marriage.');
    }
    if (c.id === me.spouseId || c.spouseId === me.id) {
      return FB.T(c.sex === 'f'
        ? 'they are already your wedded wife.'
        : 'they are already your wedded husband.');
    }
    if (FB.playerDescendantKind(s, c.id) ||
      (c.childrenIds && c.childrenIds.indexOf(me.id) >= 0) ||
      (me.fatherId && me.fatherId === c.fatherId) || (me.motherId && me.motherId === c.motherId) ||
      (c.role === 'sibling' && c.dyn === me.dyn)) return FB.T('they are too close in blood.');
    const krel = FB.kinOf(s).byId[c.id];
    if (krel && krel !== 'Cousin') return FB.T('they are too close in blood.');
    if (c.sex === me.sex) return null;
    if (FB.ageOf(c, y) < 16) return FB.T('they are not yet of age.');
    if (FB.ageOf(me, y) < 16) return FB.T('you are not yet of age.');
    const mySp = FB.spouseOf(s, me);
    if (mySp && !FB.canWed(s)) {
      return me.sex === 'm' && FB.marriageDoctrine(me.religion).wives > 1 ?
        FB.T('your faith permits no more wives.') :
        FB.T('you are already wed to {name}.', { name: mySp.name });
    }
    if (FB.spouseOf(s, c)) return FB.T('they are wed to another.');
    if (c.betrothedId) return FB.T('they are pledged to another.');
    if (FB.stationOf(c) - FB.playerStation(s) >= 3) {
      return FB.T('they stand far above your station.');
    }
    if (s.player.profession === 'monk' && FB.religionOf(me.religion).group !== 'muslim') {
      return FB.T('your vows forbid it.');
    }
    return null;
  }

  /* whose banner a character marches under: home county, the realm holding
     it, and that realm's coat of arms (the same seed the liege sheet uses) */
  function homeLineHtml(s, c) {
    const pid = FB.homeOf(s, c);
    const pr = pid && FB.world.byId[pid];
    if (!pr) return '';
    const hid = (s.holder && s.holder[pid]) || s.owner[pid];
    let crest = '';
    const parts = [FB.T('of {province}', { province: pr.name })];
    if (hid === 'player') {
      const me = s.chars[s.player.charId];
      crest = FB.crestTag(me.dyn || me.name, 14, 16);
      parts.push((s.realms.player && s.realms.player.alive)
        ? s.realms.player.name : FB.T('your lands'));
      const lr = s.player.liege && s.realms[s.player.liege];
      if (lr) parts.push(FB.T('sworn to {realm}', { realm: lr.name }));
    } else if (hid && s.realms[hid] && s.realms[hid].alive) {
      const r = s.realms[hid];
      crest = FB.crestTag(hid, 14, 16);
      parts.push(r.name);
      if (r.liege === 'player') parts.push(FB.T('sworn to you'));
      else if (r.liege && s.realms[r.liege]) {
        parts.push(FB.T('sworn to {realm}', { realm: s.realms[r.liege].name }));
      }
    }
    return '<div class="ccmeta">' + crest + esc(parts.join(' · ')) + '</div>';
  }
  function royalLineHtml(s, c) {
    if (!c.royalLine) return '';
    const r = s.realms[c.royalLine.realmId];
    const succession = r && FB.ensureRealmSuccession(s, c.royalLine.realmId);
    if (!r || !succession) return '';
    let status = FB.T('in the succession');
    if (succession.rulerMemberId === c.royalLine.memberId) status = FB.T('reigning ruler');
    else if (succession.heirId === c.royalLine.memberId) status = FB.T('designated heir');
    return '<div class="ccmeta">' + esc(FB.T('👑 Royal line of {realm} · {status}', {
      realm: r.name, status: status
    })) + '</div>';
  }

  function papalOfficeHtml(s, c) {
    if (!FB.papalOfficeOf) return '';
    const office = FB.papalOfficeOf(s, c);
    if (!office) return '';
    const papacy = FB.ensurePapacy(s);
    const obedience = papacy.obediences[office.obedienceId];
    if (office.office === 'pope') {
      return '<div class="ccmeta">' + esc(FB.T(
        '⛪ {pope} · {obedience} obedience', {
          pope:FB.papalDisplayName(s, c),
          obedience:obedience && obedience.roman
            ? FB.T('Roman') : FB.T('rival')
        })) + '</div>';
    }
    const blocDef = (FBDATA.papacy.blocs || []).filter(function (row) {
      return row.id === office.bloc;
    })[0];
    return '<div class="ccmeta">' + esc(FB.T(
      '⛪ {order} of {church} · {bloc} bloc', {
        order:papalDefinitionText(s, 'papalCardinalOrder',
          FBDATA.papacy.cardinalOrders, office.order, 'name',
          'Cardinal'),
        church:office.titleChurch || '',
        bloc:papalDefinitionText(s, 'papalCardinalBloc',
          FBDATA.papacy.blocs, office.bloc, 'name',
          blocDef ? blocDef.name : office.bloc || '')
      })) + '</div>';
  }

  UI.charCardHtml = function (s, c, clickable, groupedTraits) {
    const rel = FB.religionOf(c.religion), cul = FB.cultureOf(c.culture);
    const house = c.dyn ? FB.crestTag(c.dyn, 18, 21) : ''; // a house bears arms
    let sk = '';
    for (const k of FB.SKILLS) sk += FB.skillName(k) + ' ' + FB.skillOf(c, k) + ' · ';
    sk = sk.slice(0, -3);
    const tr = traitChips(s, c, !!groupedTraits);
    // treasures the player has gifted them, worn where callers can see
    let itc = '';
    if (c.items && c.items.length && c.id !== s.player.charId) {
      for (const ref of c.items) {
        const item = FB.resolveItem(s, ref);
        if (item) {
          itc += '<span class="traitchip" data-itemview="' + esc(ref) + '">' +
            item.def.icon + ' ' + esc(FB.itemName(s, ref)) + '</span>';
        }
      }
    }
    // the dead are remembered, not met: dates and deeds, no dealings
    if (c.dead) {
      const life = c.died !== undefined ?
        FB.T('† {born}–{died} (aged {age})',
          { born: c.born, died: c.died, age: c.died - c.born }) :
        FB.T('† born {year}', { year: c.born });
      return '<div class="charcard">' + FB.faceTag(c, 56, 64) +
        '<div><div class="ccname">' + esc(FB.fullName(c)) + house + '</div>' +
        '<div class="ccmeta">' + (epithetText(s, c) ? esc(epithetText(s, c)) + ' · ' : '') +
        esc(FB.T(c.sex === 'f' ? 'Woman' : 'Man')) +
        (c.station !== undefined && c.station !== null ? ' · ' + esc(FB.stationName(FB.stationOf(c))) : '') +
        ' · ' + esc(cultureName(s, c.culture)) + ' · ' + rel.icon + ' ' +
        esc(religionName(s, c.religion)) + '</div>' +
        homeLineHtml(s, c) +
        royalLineHtml(s, c) +
        papalOfficeHtml(s, c) +
        '<div class="ccmeta">' + (relationText(s, c) ? esc(relationText(s, c)) + ' · ' : '') + life + '</div>' +
        '<div class="ccskills">' + esc(sk) + '</div>' +
        '<div>' + (tr || '<span class="cmeta">' + esc(FB.T('No notable traits.')) + '</span>') + '</div>' +
        (itc ? '<div>' + itc + '</div>' : '') + '</div></div>';
    }
    const standing = FB.standingOf(s, { kind:'character', id:c.id });
    // fertility as the conception roll sees it: the character's own hidden
    // roll times trait leanings (lustful, comely, strong up; chaste, sickly
    // down) times the slow slide of age (FB.ageFert) — 100% is the human
    // norm in one's prime; women past 45 cannot conceive
    let fert = '';
    const cage = FB.ageOf(c, s.date.year);
    if (cage >= 16) {
      fert = ' · ' + ((c.sex === 'f' && cage > 45) ? FB.T('🌱 past childbearing')
        : FB.T('🌱 fertility {percent}%', {
          percent: Math.round((c.fertility || 1) * FB.traitAgg(c).fert *
            FB.ageFert(c.sex, cage) * 100)
        }));
    }
    const relationship = relationText(s, c);
    const standingSummary = relationship
      ? FB.T('{relation} · {marital} · Standing {standing}', {
        relation: relationship,
        marital: maritalText(s, c),
        standing: standingText(standing)
      })
      : FB.T('{marital} · Standing {standing}', {
        marital: maritalText(s, c),
        standing: standingText(standing)
      });
    return '<div class="charcard"' + (clickable ? ' data-cid="' + c.id + '" title="' +
      esc(FB.T('Open their sheet and your dealings with them')) + '"' : '') + '>' +
      FB.faceTag(c, 56, 64) +
      '<div><div class="ccname">' + esc(FB.fullName(c)) + house + '</div>' +
      '<div class="ccmeta">' + (epithetText(s, c) ? esc(epithetText(s, c)) + ' · ' : '') +
      esc(FB.T('{sex} of {age}', {
        sex: FB.T(c.sex === 'f' ? 'Woman' : 'Man'),
        age: FB.ageOf(c, s.date.year)
      })) +
      (c.station !== undefined && c.station !== null ? ' · ' + esc(FB.stationName(FB.stationOf(c))) : '') +
      ' · ' + esc(cultureName(s, c.culture)) + ' · ' + rel.icon + ' ' +
      esc(religionName(s, c.religion)) + '</div>' +
      homeLineHtml(s, c) +
      royalLineHtml(s, c) +
      papalOfficeHtml(s, c) +
      '<div class="ccmeta">' + (c.id === s.player.charId ? esc(FB.T('This is you')) :
        '<span class="' + standingClass(standing) + '">' +
        esc(standingSummary) + '</span>') +
        esc(fert) + '</div>' +
      '<div class="ccskills">' + esc(sk) + '</div>' +
      '<div>' + (tr || '<span class="cmeta">' + esc(FB.T('No notable traits.')) + '</span>') + '</div>' +
      (itc ? '<div>' + itc + '</div>' : '') + '</div></div>';
  };

  function renderFamily() {
    const s = FB.state, me = s.chars[s.player.charId];
    const kin = FB.kinOf(s);
    let h = '<button class="btn small" id="btn-ftree" style="width:100%" ' +
      'title="' + esc(FB.T('See the whole family drawn as a tree')) + '">' +
      esc(FB.T('🌳 See the family tree')) + '</button>';
    const sps = FB.spousesOf(s, me);
    h += panelh(sps.length > 1 ? 'Wives' : 'Spouse');
    if (sps.length) {
      for (const sp of sps) {
        h += charRow(s, sp, FB.T('Age {age}', { age: FB.ageOf(sp, s.date.year) }));
      }
      if (s.player.flags.noChildren) {
        h += '<div class="hint" style="margin:2px 0 0">' + esc(FB.T(
          '🛑 No more children — open your spouse’s sheet to change this.')) + '</div>';
      }
    } else h += '<div class="cmeta" style="font-size:13px">Unwed. A dynasty needs heirs — seek a match.</div>';
    const su = s.player.courtingId ? s.chars[s.player.courtingId] : null;
    if (su) {
      h += panelh('Courting') + UI.charCardHtml(s, su, true);
      h += '<div class="hint" style="margin:2px 0 0">Tap them to court, propose, or break it off.</div>';
    }
    h += panelh('Children');
    const kids = me.childrenIds.map(function (id) { return s.chars[id]; })
      .filter(function (c) { return c && !c.dead; });
    if (kids.length) {
      for (const k of kids) {
        const a = FB.ageOf(k, s.date.year);
        const meta = [
          FB.T(k.sex === 'm' ? 'Son' : 'Daughter'),
          FB.T('age {age}', { age: a })
        ];
        if (a < 16 && k.edu && k.edu.focus) meta.push('🎓 ' + FB.skillName(k.edu.focus));
        if (k.betrothedId && s.chars[k.betrothedId] && !s.chars[k.betrothedId].dead) {
          meta.push(FB.T('🤝 betrothed'));
        }
        h += charRow(s, k, meta.join(' · '));
      }
      h += '<div class="hint" style="margin:2px 0 0">Tap a child to set their education focus and schooling.</div>';
    } else h += '<div class="cmeta" style="font-size:13px">No living children. Without an heir, your story ends with you.</div>';
    // the wider family tree — dead kin are shown with †
    function kinSection(title, entries) {
      if (!entries.length) return;
      h += '<div class="panelh">' + esc(FB.T(title)) + '</div>';
      for (const e of entries) {
        h += charRow(s, e.c, FB.T(e.rel) +
          (e.c.dead ? ' · †' : ' · ' + FB.T('age {age}', {
            age: FB.ageOf(e.c, s.date.year)
          })));
      }
    }
    kinSection('Grandchildren', kin.grandchildren);
    kinSection('Parents', kin.parents);
    kinSection('Grandparents', kin.grandparents);
    kinSection('Siblings', kin.siblings);
    kinSection('Nieces & nephews', kin.niecesNephews);
    kinSection('Uncles & aunts', kin.unclesAunts);
    kinSection('Cousins', kin.cousins);
    h += panelh('Notable folk');
    for (const role of ['lord', 'priest', 'friend', 'rival']) {
      const c = FB.getRole(s, role, false);
      if (c && !c.dead) {
        h += charRow(s, c, roleName(role) +
          ' · ' + FB.T('age {age}', { age: FB.ageOf(c, s.date.year) }), true);
      }
    }
    $('tab-family').innerHTML = h;
    FB.localizeTree($('tab-family'));
    FB.paintFaces($('tab-family'), s);
    $('btn-ftree').addEventListener('click', UI.showFamilyTree);
  }

  function networkLevyLabel(s, entry) {
    if (entry.kind === 'county') {
      const pr = FB.world.byId[entry.pid];
      return FB.T('County levy — {county}', { county:pr ? pr.name : entry.pid });
    }
    if (entry.kind === 'building') {
      const def = FBDATA.buildings[entry.buildingId];
      const name = def ? dt(s, 'building', entry.buildingId, def, 'name') : entry.buildingId;
      return entry.count > 1 ? FB.T('{building} ×{count}', {
        building:name, count:entry.count
      }) : name;
    }
    if (entry.kind === 'modifier') {
      const def = FBDATA.modifiers && FBDATA.modifiers[entry.modifierId];
      const pr = FB.world.byId[entry.pid];
      return FB.T('{modifier} — {county}', {
        modifier:def ? dt(s, 'modifier', entry.modifierId, def, 'name') : entry.modifierId,
        county:pr ? pr.name : entry.pid
      });
    }
    if (entry.kind === 'technology_flat' || entry.kind === 'technology_rate') {
      return FB.T('National military technology');
    }
    if (entry.kind === 'council_rate') return FB.T('Royal Constable');
    if (entry.kind === 'trait_rate') {
      const trait = FBDATA.traits[entry.traitId];
      const name = trait
        ? dt(s, 'trait', entry.traitId, trait, 'name') : entry.traitId;
      return FB.T('{trait} — direct levy', { trait:name });
    }
    if (entry.kind === 'martial_rate') return FB.T('Ruler’s Martial');
    if (entry.kind === 'domain_penalty') return FB.T('Over-domain penalty');
    if (entry.kind === 'papal_policy') return FB.T('Investiture and Papal standing');
    if (entry.kind === 'vassal') {
      const r = s.realms[entry.rid];
      return entry.favored
        ? FB.T('{realm} — exceptional levy', { realm:r ? r.name : entry.rid })
        : FB.T('{realm} — vassal levy', { realm:r ? r.name : entry.rid });
    }
    if (entry.kind === 'barony_retinue') return FB.T('Standing barony household');
    if (entry.kind === 'episcopal_household') return FB.T('Episcopal household');
    if (entry.kind === 'position') return positionName(s, entry.positionId);
    if (entry.kind === 'retainer') {
      const c = entry.charId && s.chars[entry.charId];
      return FB.T('{position} — {name}', {
        position:positionName(s, entry.positionId),
        name:c ? c.name : FB.T('household servant')
      });
    }
    return FB.T('Muster count adjustment');
  }

  function networkUnitName(unit) {
    if (unit === 'arch') return FB.T('archers');
    if (unit === 'cav') return FB.T('cavalry');
    if (unit === 'ret') return FB.T('men-at-arms');
    return FB.T('levy');
  }

  function renderNetwork() {
    const s = FB.state;
    const box = $('tab-network');
    const me = s.chars[s.player.charId];
    const family = FB.householdMembers(s);
    const retainers = FB.retainerRecords(s);
    const capacity = FB.retainerCapacity(s);
    const businesses = FB.enterpriseList(s);
    function workAssignment(c) {
      const assigned = [];
      for (const e of businesses) {
        if (e.workerId !== c.id) continue;
        const def = FBDATA.enterprises[e.type];
        if (def) assigned.push(dt(s, 'enterprise', e.type, def, 'name'));
      }
      if (!assigned.length) return '';
      return FB.T(' · staffs {work}', { work:assigned.join(', ') });
    }
    let h = '<div class="hint">' + esc(FB.T(
      'The people and institutions tied to this household, and what each tie currently does.')) +
      '</div>';

    /* Household: family remains distinct from paid service even though both
       can work and appear on managed character sheets. */
    h += panelh('Household');
    h += kv('Resident family', esc(String(family.length)));
    h += kv('Paid retainers', esc(FB.T('{used} of {capacity}', {
      used:retainers.length, capacity:capacity
    })));
    const householdCost = FB.householdUpkeepParts(s);
    h += kv('Family establishment each season', esc(FB.money(householdCost.total)));
    const standardSummary = householdStandardsSummary(s);
    h += kv('Maintained standards each season',
      esc(FB.money(FB.householdStandardsUpkeep(s))));
    h += kv('Active household standards',
      esc(standardSummary || FB.T('None')));
    if (retainers.length) {
      h += kv('Retainer contracts each season', esc(FB.money(FB.retainerSeasonCost(s))));
    }
    h += '<button class="actionbtn" id="network-household-plan">📋 ' +
      esc(FB.T('Household Plan…')) + '<span class="adesc">' +
      esc(FB.T(
        'Review education, work, assignments, matches, and equipment for every managed person.')) +
      '</span></button>';
    for (const c of family) {
      const career = FB.careerOf(s, c);
      const def = career && FBDATA.careers[career.profession];
      h += charRow(s, c, FB.T('{career}{guild}', {
        career:FB.careerTitle(s, c),
        guild:def && def.guild && career.guildRank !== 'none'
          ? FB.T(' · {rank}', { rank:FB.guildTitle(career) }) : ''
      }) + workAssignment(c));
    }
    for (const record of retainers) {
      const c = s.chars[record.charId];
      const warning = record.unpaid
        ? FB.T(' · pay missed this season') : '';
      const effect = positionEffectText(record.office);
      h += charRow(s, c, FB.T('{position} · {money:pay}/season{warning}', {
        position:positionName(s, record.office),
        pay:record.pay || 0,
        warning:warning
      }) + (effect ? ' · ' + effect : '') + workAssignment(c));
      h += '<button class="actionbtn" data-retainer-manage="' + esc(c.id) + '">' +
        esc(FB.T('Manage {name}…', { name:c.name })) +
        '<span class="adesc">' + esc(positionDesc(s, record.office)) + '</span></button>';
    }
    if (capacity > retainers.length) {
      h += '<button class="actionbtn" id="network-hire">🗝 ' +
        esc(FB.T('Hire a retainer…')) + '<span class="adesc">' +
        esc(FB.T('Household service is paid each season and limited by station.')) +
        '</span></button>';
    } else if (!capacity) {
      h += '<div class="hint">' + esc(FB.T(
        'A serf household cannot yet maintain paid servants.')) + '</div>';
    } else {
      h += '<div class="hint">' + esc(FB.T(
        'The household is at its retainer capacity.')) + '</div>';
    }

    /* Standing is shown separately from the one canonical friend
       so warmth can no longer masquerade as the event relationship. */
    h += panelh('Connections', 'network-connections');
    h += '<div class="progressnote">' + esc(socialAttentionSummary(s)) + '</div>';
    const friend = FB.getRole(s, 'friend', false);
    if (friend) {
      h += charRow(s, friend, FB.T('Your friend · Standing {standing}', {
        standing:standingValue(FB.standingOf(s, {
          kind:'character', id:friend.id
        }))
      }));
    } else {
      h += '<div class="hint">' + esc(FB.T(
        'No one is yet named as your friend. Cultivate a contact’s Standing, then call them friend from their sheet.')) +
        '</div>';
    }
    const connectionIds = {};
    if (friend) connectionIds[friend.id] = 1;
    for (const c of FB.friendConnections(s)) {
      if (friend && c.id === friend.id) continue;
      connectionIds[c.id] = 1;
      h += charRow(s, c, FB.T('Cultivated connection · Standing {standing}', {
        standing:standingValue(FB.standingOf(s, {
          kind:'character', id:c.id
        }))
      }));
    }
    for (const role of ['rival', 'suitor', 'priest', 'lord']) {
      const c = FB.getRole(s, role, false);
      if (!c || c.dead || connectionIds[c.id]) continue;
      h += charRow(s, c, FB.T('{relationship} · Standing {standing}', {
        relationship:roleName(role),
        standing:standingValue(FB.standingOf(s, {
          kind:'character', id:c.id
        }))
      }));
    }

    /* Trade & Guild: show the already-live multipliers, gates and standings
       before offering the bounded commission favor. */
    h += panelh('Trade & Guild');
    function monopolyTierName(tier) {
      if (tier === 4) return FB.T('Count');
      if (tier === 5) return FB.T('Duke');
      if (tier === 6) return FB.T('King');
      if (tier === 7) return FB.T('Emperor');
      return FB.T('Baron');
    }
    function monopolyProfessionName(record) {
      const def = record && FBDATA.careers[record.profession];
      return def ? dt(s, 'career', record.profession, def, 'name') :
        FB.T('Unknown profession');
    }
    const incomingMonopoly = FB.guildMonopolyActive(s, 'incoming');
    if (incomingMonopoly) {
      const incomingProvince = incomingMonopoly.scope === 'province' &&
        FB.world.byId[incomingMonopoly.scopeId];
      const incomingScope = incomingMonopoly.scope === 'province'
        ? FB.T('Local to {province}', {
          province:incomingProvince ? incomingProvince.name : incomingMonopoly.scopeId
        })
        : FB.T('Bound to the direct liege relationship with {grantor}', {
          grantor:incomingMonopoly.grantorName ||
            incomingMonopoly.grantorRulerName
        });
      h += '<div class="progressnote"><b>' +
        esc(FB.T('Incoming monopoly — {profession}', {
          profession:monopolyProfessionName(incomingMonopoly)
        })) + '</b><br>' +
        esc(FB.T(
          'Issuer: {issuer} · Recipient: your household · {tier} terms · +{enterprise}% matching enterprise profit · issuer tax +{tax}% · {days} days remain',
          {
            issuer:incomingMonopoly.grantorName ||
              incomingMonopoly.grantorRulerName,
            tier:monopolyTierName(incomingMonopoly.tier),
            enterprise:Math.round(incomingMonopoly.enterpriseBonus * 100),
            tax:Math.round(incomingMonopoly.taxBonus * 100),
            days:FB.guildMonopolyRemainingDays(s, incomingMonopoly)
          })) + '<br><span class="cmeta">' + esc(incomingScope) +
        '</span></div>';
    } else {
      h += kv('Incoming monopoly', esc(FB.T('None')));
    }
    const outgoingMonopoly = FB.guildMonopolyActive(s, 'outgoing');
    if (outgoingMonopoly) {
      const recipient = outgoingMonopoly.advocateName
        ? FB.T('Local {profession} guild, represented by {advocate}', {
          profession:monopolyProfessionName(outgoingMonopoly),
          advocate:outgoingMonopoly.advocateName
        })
        : FB.T('Local {profession} guild', {
          profession:monopolyProfessionName(outgoingMonopoly)
        });
      h += '<div class="progressnote"><b>' +
        esc(FB.T('Outgoing monopoly — {profession}', {
          profession:monopolyProfessionName(outgoingMonopoly)
        })) + '</b><br>' +
        esc(FB.T(
          'Issuer: {issuer} · Recipient: {recipient} · {tier} terms · +{enterprise}% matching enterprise profit · your tax +{tax}% · {days} days remain',
          {
            issuer:outgoingMonopoly.grantorName ||
              outgoingMonopoly.grantorRulerName,
            recipient:recipient,
            tier:monopolyTierName(outgoingMonopoly.tier),
            enterprise:Math.round(outgoingMonopoly.enterpriseBonus * 100),
            tax:Math.round(outgoingMonopoly.taxBonus * 100),
            days:FB.guildMonopolyRemainingDays(s, outgoingMonopoly)
          })) + '<br><span class="cmeta">' + esc(FB.T(
            'Valid while the dynasty retains landed authority.')) +
          '</span></div>';
    } else {
      h += kv('Outgoing monopoly', esc(FB.T('None')));
    }
    if (incomingMonopoly || outgoingMonopoly) {
      h += '<div class="hint">' + esc(FB.T(
        'Active charters cannot be renewed, revoked, or replaced before they end. Matching incoming and outgoing enterprise bonuses add together, capped at +50%.')) +
        '</div>';
    }
    let anyGuild = false;
    for (const c of FB.householdWorkers(s)) {
      const career = FB.careerOf(s, c);
      const def = career && FBDATA.careers[career.profession];
      if (!def || !def.guild || career.guildRank === 'none') continue;
      anyGuild = true;
      const mult = FB.guildIncomeMultiplier(career);
      const step = FB.guildAdvance(s, c);
      const rankOrder = { none:0, member:1, master:2, officer:3, guildmaster:4 };
      const unlocked = [];
      for (const eid in FBDATA.enterprises) {
        const enterprise = FBDATA.enterprises[eid];
        if (enterprise.profession !== career.profession) continue;
        if (enterprise.guildRank &&
          (rankOrder[career.guildRank] || 0) <
          (rankOrder[enterprise.guildRank] === undefined ? 99 :
            rankOrder[enterprise.guildRank])) continue;
        unlocked.push(dt(s, 'enterprise', eid, enterprise, 'name'));
      }
      const requirements = [];
      if (step) {
        requirements.push(FB.T('{money:cost}', { cost:step.cost }));
        if (step.need) requirements.push(FB.T('Stewardship {value}', { value:step.need }));
        if (step.prestige) requirements.push(FB.T('{prestige} prestige', {
          prestige:step.prestige
        }));
      }
      h += charRow(s, c, FB.T('{career} · {rank} · standing {standing}', {
        career:FB.careerTitle(s, c),
        rank:FB.guildTitle(career),
        standing:Math.round(career.guildStanding || 0)
      }));
      h += '<div class="hint">' + esc(mult > 1
        ? FB.T('Current privilege: +{percent}% enterprise profit; guild-gated property and partnerships are available by rank.', {
          percent:Math.round((mult - 1) * 100)
        })
        : FB.T('Current privilege: guild-gated property and commissions are available.')) +
        (unlocked.length ? ' ' + esc(FB.T('Available enterprises: {enterprises}.', {
          enterprises:unlocked.join(', ')
        })) : '') +
        (step ? ' ' + esc(FB.T('Next rank: {rank} — requires {requirements}.', {
          rank:FB.guildTitle({ guildRank:step.to }),
          requirements:requirements.join(', ')
        })) : ' ' + esc(FB.T('This is the highest guild rank.'))) + '</div>';
      if (c.id === me.id && career.profession === 'craftsman') {
        h += '<div class="hint">' + esc(FB.T(
          'Personal work perk: guild membership adds {money:amount} to each season at the bench.',
          { amount:1 })) + '</div>';
      }
      if (c.id === me.id && FB.tradeInvestmentStakes) {
        const stakes = FB.tradeInvestmentStakes(s);
        for (const stake of stakes) {
          h += kv('Available trade-partnership stake', esc(FB.money(stake)));
        }
      }
      const favor = FB.guildFavor(s, c);
      h += '<button class="actionbtn" data-guild-favor="' + esc(c.id) + '"' +
        (!favor || !favor.ready ? ' disabled' : '') + '>🏅 ' +
        esc(FB.T('Call in guild commissions')) + '<span class="adesc">' +
        esc(!favor ? FB.T('No guild favor is available.')
          : !favor.cooldownReady ? FB.T('Only one guild favor may be called each year.')
          : favor.standing < favor.cost ? FB.T('Requires {standing} standing; currently {current}.', {
            standing:favor.cost, current:Math.round(favor.standing)
          }) : FB.T('Spend {standing} standing for commissions worth {money:amount}; one favor may be called each year. (spends the day)', {
            standing:favor.cost, amount:favor.amount
          })) + '</span></button>';
    }
    if (!anyGuild) {
      h += '<div class="hint">' + esc(FB.T(
        'No managed household worker currently belongs to a guild.')) + '</div>';
    }
    for (const id of FB.playerPositionIds(s)) {
      const def = FBDATA.positions[id];
      h += '<div class="charrow"><span>' + esc(def.icon + ' ' + positionName(s, id)) +
        '</span><span class="cmeta">' + esc(positionEffectText(id)) + '</span></div>' +
        '<div class="hint">' + esc(positionDesc(s, id)) + '</div>';
    }
    if (businesses.length) {
      let businessGold = 0;
      for (const e of businesses) businessGold += FB.enterpriseYield(s, e);
      h += kv('Family enterprises', esc(FB.T('{count} · about {money:gold}/season', {
        count:businesses.length, gold:Math.round(businessGold * 10) / 10
      })));
    }

    /* Realm relationships and the exact host ledger share a section because
       vassal goodwill and offices can now be seen beside their contribution. */
    h += panelh('Realm');
    const governance = FB.governanceSummary
      ? FB.governanceSummary(s) : null;
    if (governance) {
      h += '<button class="actionbtn" id="network-governance">🏛 ' +
        esc(FB.T('Governance…')) + '<span class="adesc">' +
        esc(FB.T(
          'Open the authoritative view of your political position, domain, obligations, vassals, institution, and realm actions.')) +
        '</span></button>';
    }
    const composition = FB.playerCompositionBreakdown(s);
    if (!governance) {
      if (s.player.liege && s.realms[s.player.liege]) {
        const liege = s.realms[s.player.liege];
        h += '<button class="actionbtn" data-liege="' + esc(s.player.liege) + '">' +
          esc(FB.T('Liege: {realm}', { realm:liege.name })) +
          '<span class="adesc">' + esc(FB.T('Standing {standing}', {
            standing:standingValue(FB.standingOf(s, {
              kind:'realm', id:s.player.liege
            }))
          })) + '</span></button>';
        h += kv('Land grants received this life',
          esc(String(s.player.liegeGrants || 0)));
      }
      for (const rid of FB.playerVassals(s)) {
        const r = s.realms[rid];
        let levy = 0;
        for (const entry of composition.entries) {
          if (entry.kind === 'vassal' && entry.rid === rid) {
            levy += entry.amount;
          }
        }
        h += '<button class="actionbtn" data-liege="' + esc(rid) + '">' +
          esc(r.name) + '<span class="adesc">' + esc(FB.T(
            'Standing {standing} · levy {men}', {
              standing:standingValue(FB.standingOf(s, {
                kind:'realm', id:rid
              })),
              men:Math.round(levy)
            })) + '</span></button>';
        const activeFavor = FB.vassalLevyFavor(s, rid);
        h += '<button class="actionbtn" data-vassal-favor="' + esc(rid) + '"' +
          (!FB.canCallVassalLevyFavor(s, rid) ? ' disabled' : '') + '>🛡 ' +
          esc(FB.T('Ask for an exceptional levy')) + '<span class="adesc">' +
          esc(activeFavor
            ? FB.T('The exceptional levy is already promised.')
            : FB.standingOf(s, { kind:'realm', id:rid }) < 40
              ? FB.T('Requires 40 Standing; currently {standing}.', {
                standing:standingValue(FB.standingOf(s, {
                  kind:'realm', id:rid
                }))
              })
              : FB.T('For one year this vassal sends an extra {percent}% of its levy; lowers Standing by 15. (spends the day)', {
                percent:Math.round(
                  (FBDATA.balance.vassalLevyFavorRate || 0.05) * 100)
              })) + '</span></button>';
      }
      if (FB.councilActive && FB.councilActive(s)) {
        const council = s.council;
        let officers = 0, vacancies = 0;
        if (council && council.seats) {
          for (const seat of FB.councilSeats()) {
            const rid = council.seats[seat.id];
            const realm = rid && s.realms[rid];
            const active = realm && realm.alive && realm.liege === 'player' &&
              FB.standingOf(s, { kind:'realm', id:rid }) > -50;
            if (active) {
              officers++;
              h += '<div class="progressnote"><b>' + esc(
                seat.icon + ' ' + councilSeatName(seat.id)) + '</b> · ' +
                esc((realm.ruler ? realm.ruler.name : realm.name) +
                  ', ' + realm.name) +
                '<br><span class="cmeta">' +
                esc(councilSeatDesc(seat.id)) + '</span></div>';
            } else {
              vacancies++;
              h += '<div class="progressnote op-bad"><b>' +
                esc(seat.icon + ' ' + councilSeatName(seat.id)) + '</b> · ' +
                esc(FB.T(rid
                  ? 'Inactive — the holder no longer serves effectively.'
                  : 'Vacant.')) + '</div>';
            }
          }
        } else {
          vacancies = FB.councilSeats().length;
        }
        h += '<button class="actionbtn" id="network-council">🏛 ' +
          esc(FB.T('Royal Council')) + '<span class="adesc">' +
          esc(council
            ? FB.T('{count} officers · {vacancies} vacancies or inactive seats · crown authority {authority}/100 · open the Council to manage the great offices.', {
              count:officers, vacancies:vacancies,
              authority:Math.round(council.authority)
            })
            : FB.T(
              'The great offices have not formed yet. Open the Council to establish them.')) +
          '</span></button>';
      }
    }
    const realmContacts = {}, policies = s.player.foreignPolicy || {}, pacts = s.pacts || {};
    for (const rid in policies) realmContacts[rid] = 1;
    for (const rid in pacts) if (pacts[rid] > s.turn) realmContacts[rid] = 1;
    for (const alliance of (s.alliances || [])) {
      if (alliance.a === 'player') realmContacts[alliance.b] = 1;
      if (alliance.b === 'player') realmContacts[alliance.a] = 1;
    }
    for (const rid in realmContacts) {
      const r = s.realms[rid];
      if (!r || !r.alive) continue;
      h += '<button class="actionbtn" data-liege="' + esc(rid) + '">' +
        esc(r.name) + '<span class="adesc">' +
        esc(FB.T('{standing} · {policy} · {status}', {
          standing:FB.T('Standing {standing}', {
            standing:standingText(FB.standingOf(s, {
              kind:'realm', id:rid
            }))
          }),
          policy:foreignPolicyStanceText(s, rid),
          status:foreignPolicyStatusText(s, rid)
        })) + '</span></button>';
    }

    h += '<div class="panelh">' + esc(FB.T('Levy ledger')) + '</div>';
    h += '<div class="progressnote">' + esc(FB.T(
      '{total} total · {levy} levy · {archers} archers · {cavalry} cavalry · {retinue} men-at-arms', {
        total:composition.total, levy:composition.units.levy,
        archers:composition.units.arch, cavalry:composition.units.cav,
        retinue:composition.units.ret
      })) + '</div>';
    let shownEntries = 0;
    for (const entry of composition.entries) {
      const displayed = Math.round(entry.amount * 10) / 10;
      if (!displayed) continue;
      shownEntries++;
      h += '<div class="bd-row"><span>' + esc(networkLevyLabel(s, entry)) +
        ' <span class="cmeta">(' + esc(networkUnitName(entry.unit)) + ')</span></span>' +
        '<span class="bd-amt ' + (entry.amount > 0 ? 'op-good' : 'op-bad') + '">' +
        (displayed > 0 ? '+' : '') + displayed + '</span></div>';
    }
    if (!shownEntries) {
      h += '<div class="hint">' + esc(FB.T(
        'No personal host yet. Land, military positions, and sworn service will appear here.')) +
        '</div>';
    }

    box.innerHTML = h;
    FB.localizeTree(box);
    FB.paintFaces(box, s);
    const householdPlan = $('network-household-plan');
    if (householdPlan) householdPlan.addEventListener('click', UI.showHouseholdPlan);
    const hire = $('network-hire');
    if (hire) hire.addEventListener('click', UI.showRetainerHire);
    box.querySelectorAll('[data-retainer-manage]').forEach(function (button) {
      button.addEventListener('click', function () {
        UI.showRetainerManage(button.dataset.retainerManage);
      });
    });
    box.querySelectorAll('[data-guild-favor]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (!FB.callGuildFavor(s, button.dataset.guildFavor)) return;
        FB.game.passDay({ skipFocus:true });
      });
    });
    box.querySelectorAll('[data-vassal-favor]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (!FB.callVassalLevyFavor(s, button.dataset.vassalFavor)) return;
        FB.game.passDay({ skipFocus:true });
      });
    });
    const councilButton = $('network-council');
    if (councilButton) councilButton.addEventListener('click', UI.showCouncil);
    const governanceButton = $('network-governance');
    if (governanceButton) {
      governanceButton.addEventListener('click', UI.showGovernance);
    }
  }

  /* ================= family tree =================
     The Kin tab names each relation; this modal draws the blood lines so it
     is plain who hangs from whom. Each couple shares a box (current spouses
     first, then dead or former partners their children point back to), and
     each brood hangs beneath its parents. The main tree grows from the
     deepest recorded ancestor — grandparents at most, so it stays bounded —
     and the mother’s parents get a second tree of their own; anyone already
     drawn above shows dimmed there instead of doubling the line. */
  UI.showFamilyTree = function () {
    if (!FB.state || UI.eventsBusy()) return;
    const s = FB.state, me = s.chars[s.player.charId];
    const byId = FB.kinOf(s).byId;
    const drawn = {};
    const MAXDEPTH = 4; // root couple → their great-great-grandchildren

    function chip(c, rel, cls) {
      const sourceLabel = rel || byId[c.id] || '';
      const label = sourceLabel ? FB.T(sourceLabel) : '';
      const meta = c.dead ? '†' : FB.T('age {age}', { age: FB.ageOf(c, s.date.year) });
      const again = cls && cls.indexOf('dup') >= 0;
      return '<button class="ftchip' + (cls || '') + (c.dead ? ' dead' : '') +
        '" data-cid="' + c.id + '" title="' + esc(FB.fullName(c)) +
        (label ? ' — ' + esc(label) : '') + '">' + FB.faceTag(c, 40, 46) +
        '<span class="fname">' + esc(c.name) + '</span>' +
        '<span class="frel">' + esc(label ? label + ' · ' + meta : meta) + '</span>' +
        (again ? '<span class="frel">' + esc(FB.T('also above')) + '</span>' : '') + '</button>';
    }

    /* everyone who parented a child with c, current spouses first — dead
       or divorced partners still belong beside their children */
    function matesOf(c) {
      const out = [], seen = {};
      seen[c.id] = 1;
      const sps = c.id === me.id ? FB.spousesOf(s, me) :
        (c.spouseId && s.chars[c.spouseId] ? [s.chars[c.spouseId]] : []);
      for (const sp of sps) {
        if (!seen[sp.id]) { seen[sp.id] = 1; out.push(sp); }
      }
      for (const k of FB.childrenOf(s, c)) {
        const oid = k.fatherId === c.id ? k.motherId : k.fatherId;
        const o = oid ? s.chars[oid] : null;
        if (o && !seen[o.id]) { seen[o.id] = 1; out.push(o); }
      }
      return out;
    }

    function unit(c, depth) {
      if (drawn[c.id]) {
        // already on an earlier branch — point back rather than fork the line
        return '<div class="ftnode"><div class="ftcouple">' + chip(c, null, ' dup') + '</div></div>';
      }
      drawn[c.id] = 1;
      let couple = c.id === me.id ? chip(c, 'You', ' me') : chip(c);
      for (const sp of matesOf(c)) {
        couple += chip(sp, byId[sp.id] || (sp.sex === 'f' ? 'Wife' : 'Husband'),
          drawn[sp.id] ? ' dup' : '');
        drawn[sp.id] = 1;
      }
      const kids = FB.childrenOf(s, c).sort(function (a, b) { return a.born - b.born; });
      const grow = kids.length > 0 && depth < MAXDEPTH;
      let h = '<div class="ftnode"><div class="ftcouple">' + couple + '</div>';
      if (grow) {
        h += '<div class="ftstem"></div><div class="ftkids">';
        for (const k of kids) h += unit(k, depth + 1);
        h += '</div>';
      }
      return h + '</div>';
    }

    /* the deepest recorded ancestor, father’s line preferred */
    function topOf(c, maxUp) {
      let cur = c;
      for (let i = 0; i < maxUp; i++) {
        const nxt = (cur.fatherId ? s.chars[cur.fatherId] : null) ||
          (cur.motherId ? s.chars[cur.motherId] : null);
        if (!nxt) break;
        cur = nxt;
      }
      return cur;
    }

    let h = '<div class="cmeta" style="font-size:13px">' + esc(FB.isTouch
      ? FB.T('Blood lines run downward — each brood hangs beneath its parents. † marks the dead. Tap a face to open their sheet.')
      : FB.T('Blood lines run downward — each brood hangs beneath its parents. † marks the dead. Click a face to open their sheet.')) +
      '</div>';
    const root = topOf(me, 2);
    h += '<div class="ftwrap"><div class="fttree">';
    if (root.id === me.id && !FB.parentsOf(s, me).length && FB.siblingsOf(s, me).length) {
      // safety net: save.js backfills parents on load; a tree can still lack
      // them if a mod stripped the chars — show the brood under a ghost
      let brood = unit(me, 1);
      for (const sb of FB.siblingsOf(s, me)) brood += unit(sb, 1);
      h += '<div class="ftnode"><div class="ftcouple"><div class="ftchip ghost">' +
        '<span class="fname">' + esc(FB.T('Unrecorded')) + '</span><span class="frel">' +
        esc(FB.T('your parents')) + '</span></div></div>' +
        '<div class="ftstem"></div><div class="ftkids">' + brood + '</div></div>';
    } else {
      h += unit(root, 0);
    }
    h += '</div></div>';
    // the mother’s parents sit outside the father-line tree — give them their own
    const mo = me.motherId ? s.chars[me.motherId] : null;
    if (mo && (mo.fatherId || mo.motherId)) {
      const mroot = topOf(mo, 1);
      if (mroot.id !== mo.id && !drawn[mroot.id]) {
        h += panelh('Your mother’s kin') +
          '<div class="ftwrap"><div class="fttree">' + unit(mroot, 0) + '</div></div>';
      }
    }
    h += '<button class="btn" id="gm-cancel" style="margin-top:10px">Close</button>';
    openModal('The Family Tree', h);
    $('gm-cancel').addEventListener('click', UI.closeModal);
    FB.paintFaces($('gm-body'), s);
  };

  /* ---------- map filters: what a selection highlights ---------- */
  let mapMode = 'realm'; // 'realm' | 'mine' | 'liege' | 'duchy' | 'kingdom'

  /* is pid held by the player or by one of the player's vassals? */
  function inPlayerRealm(s, pid) {
    const holdId = (s.holder && s.holder[pid]) || s.owner[pid];
    if (holdId === 'player') return true;
    const chain = FB.liegeChain(s, holdId);
    for (const cid of chain) if (s.realms[cid] && s.realms[cid].liege === 'player') return true;
    return false;
  }

  /* is pid part of the player's liege's sub-realm (his lands + his vassals')? */
  function inLiegeRealm(s, pid) {
    if (!s.player.liege) return false;
    const holdId = (s.holder && s.holder[pid]) || s.owner[pid];
    if (holdId === 'player') return true; // your own lands sit inside his realm
    return FB.liegeChain(s, holdId).indexOf(s.player.liege) >= 0;
  }

  /* highlight group key for the current filter; null = no group */
  function mapGroupOf(pid) {
    const s = FB.state;
    if (!s) return null;
    if (mapMode === 'mine') return inPlayerRealm(s, pid) ? 'player' : null;
    if (mapMode === 'liege') return inLiegeRealm(s, pid) ? 'liege' : null;
    // de jure modes: the whole duchy/kingdom lights up, wherever it lies;
    // wastelands and settled colonies have no duchy, so they stay dark
    if (mapMode === 'duchy') {
      const pr = FB.world.byId[pid];
      return pr && pr.duchy ? 'duchy:' + pr.duchy : null;
    }
    if (mapMode === 'kingdom') {
      const k = FB.dejureOf(pid).kingdom;
      return k ? 'kingdom:' + k : null;
    }
    // realm: your own province lights YOUR realm, a foreign one its sovereign's
    return inPlayerRealm(s, pid) ? 'player' : (s.owner[pid] || null);
  }

  const MAPMODES = { realm: 'Realm', mine: 'Mine', liege: 'Liege', duchy: 'De jure duchies', kingdom: 'De jure kingdoms' };

  /* the player's strongest claim among the de jure titles of one level
     (most counties held, ties to the smallest title) — for the filter toast */
  function bestDejureClaim(s, mode) {
    let best = null;
    function offer(name, pr) {
      if (!pr.have) return;
      if (!best || pr.have > best.pr.have ||
          (pr.have === best.pr.have && pr.total < best.pr.total)) best = { name: name, pr: pr };
    }
    if (mode === 'duchy') {
      for (const did in FBDATA.duchies) {
        const pr = FB.duchyProgress(s, did);
        if (pr.titled) offer(FBDATA.duchies[did].name, pr);
      }
    } else {
      for (const kid in FBDATA.kingdoms) offer(FBDATA.kingdoms[kid].name, FB.kingdomProgress(s, kid));
    }
    return best;
  }

  UI.cycleMapMode = function () {
    const s = FB.state;
    if (!s) return;
    const order = ['realm', 'mine', 'liege', 'duchy', 'kingdom'];
    let next = order[(order.indexOf(mapMode) + 1) % order.length];
    if (next === 'liege' && !s.player.liege) {
      UI.toast('🗺 You answer to no one — no liege to show.');
      next = order[(order.indexOf(next) + 1) % order.length];
    }
    mapMode = next;
    const btn = $('btn-mapmode');
    if (btn) {
      btn.classList.toggle('on', mapMode !== 'realm');
      btn.title = FB.T('Map filter: {mode} (R)', { mode: FB.T(MAPMODES[mapMode]) });
      btn.setAttribute('aria-label', btn.title);
    }
    let toastText = '🗺 Map filter: {mode}';
    let toastParams = { mode: FB.T(MAPMODES[mapMode]) };
    if ((mapMode === 'duchy' || mapMode === 'kingdom') && s.player.provs && s.player.provs.length) {
      const claim = bestDejureClaim(s, mapMode);
      if (claim) {
        toastText = '🗺 {mode} — your best claim: {name}, {held} (need {need})';
        toastParams = { mode: toastParams.mode, name: claim.name,
          held: ofCountiesText(s, claim.pr.have, claim.pr.total), need: claim.pr.need };
      }
    }
    UI.toast(toastText, toastParams);
    FB.map.select(FB.map.selected || s.player.provinceId, mapGroupOf);
  };

  let selectedProv = null;
  UI.selectProvince = function (pid) {
    selectedProv = pid;
    FB.map.select(pid, mapGroupOf);
    setTab('prov');
  };

  /* "{have} of {total} counties/kingdoms" fragments — the noun agrees with the
     whole through a complete-phrase plural selector, never a spliced suffix
     (docs/designs/i18n.md); modelled on countyCountText above */
  function ofCountiesText(s, have, total) {
    return FB.renderMessage(FB.msg('fx.ui.of_total_counties', {
      forms: {
        select: 'plural', param: 'total', cases: {
          one: '{have} of {total} county',
          other: '{have} of {total} counties'
        }
      }
    }, { have: have, total: total }), { state: s, viewer: s.player.charId });
  }
  function ofKingdomsText(s, have, total) {
    return FB.renderMessage(FB.msg('fx.ui.of_total_kingdoms', {
      forms: {
        select: 'plural', param: 'total', cases: {
          one: '{have} of {total} kingdom',
          other: '{have} of {total} kingdoms'
        }
      }
    }, { have: have, total: total }), { state: s, viewer: s.player.charId });
  }

  /* what the tapped county feeds: have/need toward its duke, king, emperor —
     the same rules checkTierPromotions promotes by. Shown only to landed
     players; a landless dreamer has no claim to weigh */
  function dejureNotes(s, dj) {
    const indep = FB.isPlayerSovereign(s);
    let out = '';
    function note(text) { return '<div class="progressnote">' + esc(text) + '</div>'; }
    const dp = FB.duchyProgress(s, dj.duchy), dname = FBDATA.duchies[dj.duchy].name;
    if (!dp.titled) {
      out += note(FB.T('⚜ {name} is one county alone — no duke’s title to claim.',
        { name: dname }));
    } else if (dp.have >= dp.need) {
      out += note(FB.T('⚜ {name}: you hold the majority, {held}.',
        { name: dname, held: ofCountiesText(s, dp.have, dp.total) }));
    } else {
      out += note(FB.T('⚜ {name}: you hold {held} — {need} make the duke.',
        { name: dname, held: ofCountiesText(s, dp.have, dp.total), need: dp.need }));
    }
    if (dj.kingdom) {
      const kp = FB.kingdomProgress(s, dj.kingdom), kname = FBDATA.kingdoms[dj.kingdom].name;
      if (kp.have >= kp.need) {
        out += note(indep
          ? FB.T('👑 {name}: you hold the majority, {held}.',
            { name: kname, held: ofCountiesText(s, kp.have, kp.total) })
          : FB.T('👑 {name}: you hold the majority, {held} — independence would make you its king.',
            { name: kname, held: ofCountiesText(s, kp.have, kp.total) }));
      } else {
        out += note(FB.T('👑 {name}: you hold {held} — {need} and independence make the king.',
          { name: kname, held: ofCountiesText(s, kp.have, kp.total), need: kp.need }));
      }
    }
    if (dj.empire) {
      const ep = FB.empireProgress(s, dj.empire), ename = FBDATA.empires[dj.empire].name;
      if (ep.have >= ep.need) {
        out += note(indep
          ? FB.T('🦅 {name}: you rule {share} — the imperial majority.',
            { name: ename, share: ofKingdomsText(s, ep.have, ep.total) })
          : FB.T('🦅 {name}: you rule {share} — independence would make you its emperor.',
            { name: ename, share: ofKingdomsText(s, ep.have, ep.total) }));
      } else {
        out += note(FB.T('🦅 {name}: you rule {share} — {need} and independence make the emperor.',
          { name: ename, share: ofKingdomsText(s, ep.have, ep.total), need: ep.need }));
      }
    }
    return out;
  }

  /* Political notables for the Land panel are resolved from the live realm
     tree. This stays presentation-only: no roster is saved, and ordinary map
     browsing never asks provNotables to generate local characters. */
  function landRulerRealm(s, rid) {
    return s.realms && s.realms[rid];
  }
  function landRulerValid(s, rid) {
    if (rid === 'player') {
      const me = s.player && s.chars && s.chars[s.player.charId];
      return !!(me && !me.dead);
    }
    const r = landRulerRealm(s, rid);
    return !!(r && r.alive && r.ruler && r.ruler.name);
  }
  function landRulerLiege(s, rid) {
    if (rid === 'player') {
      const playerRealm = landRulerRealm(s, 'player');
      return (playerRealm && playerRealm.alive && playerRealm.liege) ||
        (s.player && s.player.liege) || null;
    }
    const r = landRulerRealm(s, rid);
    return r && r.alive ? (r.liege || null) : null;
  }
  function landRulerRealmName(s, rid) {
    const r = landRulerRealm(s, rid);
    if (r && r.name) return r.name;
    return rid === 'player' ? FB.T('Your realm') : rid;
  }
  function landRulerRank(s, rid) {
    const r = landRulerRealm(s, rid);
    return r && r.rank ? r.rank : (rid === 'player'
      ? Math.max(1, (s.player.tier || 4) - 3) : 0);
  }
  function landRulers(s, pid) {
    const out = [], seen = {};
    const holder = (s.holder && s.holder[pid]) ||
      (s.owner && s.owner[pid]);
    if (!holder) return out;
    function add(rid, kind, subject) {
      if (!rid || seen[rid] || !landRulerValid(s, rid)) return false;
      seen[rid] = 1;
      out.push({ id:rid, kind:kind, subject:subject || null });
      return true;
    }

    add(holder, 'holder', null);

    /* Every realm sworn exactly to the holder belongs here. Rank and names
       make the order stable even when object insertion order differs. */
    const vassals = [];
    for (const rid in (s.realms || {})) {
      if (!Object.prototype.hasOwnProperty.call(s.realms, rid)) continue;
      const r = s.realms[rid];
      if (rid !== holder && r && r.alive && r.liege === holder &&
          landRulerValid(s, rid)) vassals.push(rid);
    }
    vassals.sort(function (a, b) {
      const rankDiff = landRulerRank(s, b) - landRulerRank(s, a);
      if (rankDiff) return rankDiff;
      const an = String(landRulerRealmName(s, a)).toLowerCase();
      const bn = String(landRulerRealmName(s, b)).toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return a < b ? -1 : (a > b ? 1 : 0);
    });
    for (const rid of vassals) add(rid, 'vassal', holder);

    /* Walk separately from the vassal list so its breadth stays between the
       holder and the upward chain. seen also contains malformed cycles. */
    let subject = holder, liege = landRulerLiege(s, holder), guard = 0;
    while (liege && guard++ < 20) {
      if (!add(liege, 'liege', subject)) break;
      subject = liege;
      liege = landRulerLiege(s, liege);
    }
    return out;
  }
  function landRulerRelationship(s, entry) {
    const subject = landRulerRealmName(s, entry.subject);
    if (entry.kind === 'holder') {
      return landRulerLiege(s, entry.id)
        ? FB.T('Holds this county')
        : FB.T('Holds this county · sovereign');
    }
    if (entry.kind === 'vassal') {
      return FB.T('Direct vassal of {realm}', { realm:subject });
    }
    return landRulerLiege(s, entry.id)
      ? FB.T('Liege of {realm}', { realm:subject })
      : FB.T('Sovereign over {realm}', { realm:subject });
  }
  function landRulerRow(s, entry) {
    const rid = entry.id;
    const relationship = landRulerRelationship(s, entry);
    const realmName = landRulerRealmName(s, rid);
    let art, heading, age, martial, action, standing;
    if (rid === 'player') {
      const me = s.chars[s.player.charId];
      art = FB.faceTag(me, 36, 42);
      heading = FB.T('{title} · {name}', {
        title:FB.styledTitle(s), name:FB.fullName(me)
      });
      age = FB.ageOf(me, s.date.year);
      martial = FB.skillOf(me, 'mar');
      action = ' data-cid="' + esc(me.id) + '" title="' +
        esc(FB.T('Open your character sheet')) + '"';
      standing = '<span class="cop op-mid">' + esc(FB.T('You')) + '</span>';
    } else {
      const r = landRulerRealm(s, rid);
      const value = FB.standingOf(s, { kind:'realm', id:rid });
      art = FB.crestTag(rid, 36, 42);
      heading = FB.T('{title} {name}', {
        title:FB.realmRankTitle(s, r), name:r.ruler.name
      });
      age = r.ruler.age;
      martial = r.ruler.mar;
      action = ' data-liege="' + esc(rid) + '" title="' +
        esc(FB.T('Open this realm ruler’s sheet')) + '"';
      standing = '<span class="cop ' + standingClass(value) + '">' +
        esc(FB.T('Standing {standing}', {
          standing:standingText(value)
        })) + '</span>';
    }
    return '<button type="button" class="charrow actionbtn"' + action + '>' +
      art + '<span><span class="cname">' + esc(heading) + '</span><br>' +
      '<span class="cmeta">' + esc(FB.T('{realm} · {relationship}', {
        realm:realmName, relationship:relationship
      })) + '</span><br><span class="cmeta">' +
      esc(FB.T('age {age} · ⚔ martial {martial}', {
        age:age, martial:martial
      })) + '</span></span>' + standing + '</button>';
  }

  function capitalRelocationTerms(status) {
    return FB.T(
      '{prestige} prestige · {opinion} popular opinion · {standing} Standing for every direct vassal',
      {
        prestige:status.prestigeCost,
        opinion:signedNumber(status.popularOpinion),
        standing:standingValue(status.vassalFavor)
      });
  }

  function capitalRelocationMonopolyName(s, record) {
    const def = record && FBDATA.careers[record.profession];
    return def ? dt(s, 'career', record.profession, def, 'name') :
      FB.T('Unknown profession');
  }

  UI.showCapitalRelocation = function (destinationId) {
    const s = FB.state;
    const status = FB.capitalRelocationStatus(s, destinationId);
    if (!status.ok) {
      UI.toast(status.reason);
      UI.refresh();
      return;
    }
    const from = FB.world.byId[status.fromId];
    const destination = FB.world.byId[destinationId];
    const vassalNames = status.vassals.map(function (vassal) {
      return vassal.name;
    });
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Move the capital and permanent household home from {from} to {destination}?',
      {
        from:from.name,
        destination:destination.name
      })) + '</p><p>' + esc(FB.T(
      'This immediately costs {prestige} prestige. Popular opinion changes by {opinion}, and every direct vassal’s Standing changes by {standing}.',
      {
        prestige:status.prestigeCost,
        opinion:signedNumber(status.popularOpinion),
        standing:standingValue(status.vassalFavor)
      })) + '</p>';
    if (vassalNames.length) {
      h += standingEffectRow(FB.T('Standing with every direct vassal'),
        status.vassalFavor);
      h += '<p>' + esc(FB.T(
        'Affected direct vassals ({count}): {vassals}.', {
          count:vassalNames.length,
          vassals:vassalNames.join(', ')
        })) + '</p>';
    } else {
      h += '<p>' + esc(FB.T(
        'You have no direct vassals, so no vassal Standing will change.')) + '</p>';
    }
    if (status.incomingMonopoly) {
      h += '<p class="op-bad">' + esc(FB.T(
        'Your incoming {profession} monopoly is tied to {province} and will end immediately when the household leaves.',
        {
          profession:capitalRelocationMonopolyName(
            s, status.incomingMonopoly),
          province:from.name
        })) + '</p>';
    }
    h += '<p class="hint">' + esc(FB.T(
      'This is this ruler’s only voluntary capital move. Succession gives the next ruler one new choice. County ownership, titles, buildings, and property do not move with the household.')) +
      '</p></div><div class="gm-list">' +
      '<button type="button" class="actionbtn" id="capital-relocation-confirm">' +
      esc(FB.T('Move the capital to {destination}', {
        destination:destination.name
      })) + '</button>' +
      '<button type="button" class="actionbtn" id="capital-relocation-cancel">' +
      esc(FB.T('Keep the capital in {from}', { from:from.name })) +
      '</button></div>';
    openModal(FB.T('Move capital to {destination}?', {
      destination:destination.name
    }), h);
    $('capital-relocation-confirm').addEventListener('click', function () {
      const live = FB.capitalRelocationStatus(FB.state, destinationId);
      if (!live.ok || !FB.relocatePlayerCapital(FB.state, destinationId)) {
        UI.closeModal();
        UI.toast(live.reason || FB.T('The capital can no longer be moved.'));
        UI.refresh();
        return;
      }
      UI.closeModal();
    });
    $('capital-relocation-cancel').addEventListener('click', UI.closeModal);
  };

  function renderProv() {
    const s = FB.state;
    const pid = selectedProv || s.player.provinceId;
    const pr = FB.world.byId[pid];
    if (!pr) { $('tab-prov').innerHTML = ''; return; }
    const playerRealm = s.realms && s.realms.player;
    const homeLabel = pid === s.player.provinceId
      ? (playerRealm && playerRealm.alive && playerRealm.capital === pid
        ? FB.T('⚑ (capital and home)') : FB.T('⚑ (home)'))
      : '';
    let h = '<div class="panelh">' + esc(pr.name) +
      (homeLabel ? ' ' + esc(homeLabel) : '') + '</div>';
    const selA = FB.selectedArmy ? FB.selectedArmy(s) : null;
    if (selA) {
      const selPr = FB.world.byId[selA.at];
      const marching = selA.goal && selA.goal !== selA.at && FB.world.byId[selA.goal];
      const hostText = marching
        ? FB.T('🚩 Your host — {men} at {place}, marching on {goal}. Tap a province on the map to march; tap the host again to halt.', {
          men: menText(s, selA.men), place: selPr ? selPr.name : '?',
          goal: FB.world.byId[selA.goal].name
        })
        : FB.T('🚩 Your host — {men} at {place}. Tap a province on the map to march; tap the host again to halt.', {
          men: menText(s, selA.men), place: selPr ? selPr.name : '?'
        });
      h += '<div class="progressnote">' + esc(hostText) + '</div>';
      // what the host is made of (the same breakdown the war status shows)
      const selectedHostUpkeep = FB.playerHostUpkeepParts
        ? FB.playerHostUpkeepParts(s) : null;
      if (selA.units) {
        const u = selA.units;
        const compKeys = [
          ['levy', 'fx.warstate.comp_levy', { one: '{count} levyman', other: '{count} levy' }],
          ['arch', 'fx.warstate.comp_archers', { one: '{count} archer', other: '{count} archers' }],
          ['cav', 'fx.warstate.comp_cavalry', { one: '{count} cavalryman', other: '{count} cavalry' }],
          ['ret', 'fx.warstate.comp_retinue', { one: '{count} man-at-arms', other: '{count} men-at-arms' }],
          ['mercs', 'fx.warstate.comp_mercs', { one: '{count} mercenary', other: '{count} mercenaries' }]
        ];
        const parts = [];
        for (const ck of compKeys) {
          if (!u[ck[0]]) continue;
          parts.push(FB.renderKey(ck[1], {
            forms: { select: 'plural', param: 'count', cases: ck[2] }
          }, { count: u[ck[0]] }));
        }
        if (parts.length) h += '<div class="cmeta">' + esc(parts.join(', ')) + '</div>';
        if (selA.allied && selA.allied.men) {
          const ar = s.realms[selA.allied.ally];
          h += '<div class="cmeta">' + esc(FB.T(
            '🤝 {men} allied defenders from {realm}', {
              men: menText(s, selA.allied.men),
              realm: ar ? ar.name : selA.allied.ally
            })) + '</div>';
        }
      }
      if (selectedHostUpkeep) {
        h += '<div class="cmeta">' + esc(FB.T(
          'Seasonal host logistics: {money:amount}', {
            amount:financeAmount(selectedHostUpkeep.total)
          })) + '</div>';
        if (selectedHostUpkeep.campaignModifier) {
          h += '<div class="cmeta">' + esc(FB.T(
            'Campaign supply adjustment: {money:amount}', {
              amount:financeAmount(selectedHostUpkeep.campaignModifier)
            })) + '</div>';
        }
      }
    }
    if (pr.wasteland) {
      h += '<div class="cmeta">' + esc(FB.T('Trackless {terrain}. No lord rules here — it feeds no duchy or crown.',
        { terrain: terrainName(pr.terrain) })) + '</div>';
    } else {
      const rid = s.owner[pid];
      const realm = s.realms[rid];
      const rel = FB.religionOf(pr.religion), cul = FB.cultureOf(pr.culture);
      const B = FBDATA.balance;
      const myRealm = rid === 'player';
      const realmMen = realm ? (myRealm ? FB.realmDefensiveStrength(s, 'player') :
        FB.realmDefensiveStrength(s, rid)) : 0;
      // the feudal ladder: who holds this county directly, and above them whom
      const holdId = (s.holder && s.holder[pid]) || rid;
      let chain;
      if (holdId === 'player') chain = ['player'].concat(s.player.liege ? FB.liegeChain(s, s.player.liege) : []);
      else chain = FB.liegeChain(s, holdId);
      h += kv('County', esc(pr.name));
      for (const cid of chain) {
        if (cid === 'player') {
          h += '<div class="kv"><span>' + esc(FB.styledTitle(s)) + '</span><b>' +
            esc(FB.T('You — held in your own hand')) + '</b></div>';
          continue;
        }
        const cr = s.realms[cid];
        if (!cr) continue;
        let mark = '';
        if (cid === s.player.liege) mark = FB.T(' — your liege');
        else if (cr.liege === 'player') mark = FB.T(' — your vassal');
        h += '<div class="kv"><span>' + esc(FB.T('{title} {name}', {
          title: FB.realmRankTitle(s, cr), name: cr.ruler.name
        })) +
          '</span><b><button class="linklike" data-liege="' + esc(cid) + '">' +
          esc(cr.name) + '</button>' + esc(mark) + '</b></div>';
      }
      const dj = FB.dejureOf(pid);
      if (dj.duchy) {
        const parts = [FBDATA.duchies[dj.duchy].name];
        if (dj.kingdom) parts.push(FBDATA.kingdoms[dj.kingdom].name);
        if (dj.empire) parts.push(FBDATA.empires[dj.empire].name);
        h += kv('De jure (rightful liege)', esc(parts.join(' › ')));
        if (s.player.provs && s.player.provs.length) h += dejureNotes(s, dj);
      } else {
        // a colony settled on empty land: owned, but tied to no title
        h += kv('De jure (rightful liege)', esc(FB.T('None — this land feeds no duchy or crown.')));
      }
      const sovereignHtml = realm
        ? '<button class="linklike" data-liege="' + esc(rid) + '" title="' +
          esc(FB.T('See this realm’s ruler')) + '">' + esc(realm.name) + '</button>'
        : '';
      h +=
        (realm ? kv('Sovereign', sovereignHtml) : '') +
        (realm ? kv('Realm size', esc(countyCountText(s, FB.realmProvinces(s, rid).length))) : '') +
        (realm ? kv('Realm host', '~' + esc(menText(s, realmMen))) : '') +
        (realm ? kv('Defensive alliance', esc(allianceText(s, rid))) : '') +
        kv('Culture', esc(cultureName(s, pr.culture))) +
        kv('Faith', rel.icon + ' ' + esc(religionName(s, pr.religion))) +
        kv('Terrain', esc(terrainName(pr.terrain)) + (pr.coastal ? ', ' + esc(FB.T('coastal')) : '')) +
        kv('Economic development', (s.dev[pid] || 1) + ' / ' + FB.devCap(s, pid)) +
        (realm ? kv('Technological development',
          techDevelopmentScore(s, rid) + ' / 10') : '') +
        kv('Province levy', '~' + esc(menText(s,
          (s.dev[pid] || 1) * B.levyPerDev *
          (FB.modBonus ? Math.max(0, 1 + FB.modBonus(s, 'levy', pid)) : 1))));
      const countyModifiers = FB.countyModifierRecords
        ? FB.countyModifierRecords(s, pid) : [];
      if (countyModifiers.length) {
        h += panelh('County modifiers') +
          '<div class="modifier-list">' +
          modifierChips(s, countyModifiers, 'county', pid) + '</div>';
      }
      const great = s.greatHolyWar;
      if (great && great.objectiveCounties &&
          great.objectiveCounties.indexOf(pid) >= 0) {
        const occupation = great.occupations && great.occupations[pid] || {};
        const requirement = FB.greatHolyWarSiegeRequirement
          ? FB.greatHolyWarSiegeRequirement(s, pid) : 1;
        const progress = Math.round(FB.clamp((occupation.progress || 0) /
          Math.max(1, requirement), 0, 1) * 100);
        const objectiveStatus = occupation.occupied
          ? FB.T('occupied by the attacking camp')
          : (occupation.progress
            ? FB.T('{percent}% siege progress for the {camp} camp', {
              percent:progress,
              camp:occupation.progressCamp === 'defenders'
                ? FB.T('defending') : FB.T('attacking')
            })
            : FB.T('not occupied'));
        h += '<div class="progressnote warnote">' + esc(FB.T(
          '📯 Great holy-war objective · {status}', {
            status:objectiveStatus
          })) + '</div>';
      }
      if (realm && !myRealm && FB.isPlayerSovereign(s)) {
        const realmStanding = FB.standingOf(s, { kind:'realm', id:rid });
        h += kv('Standing with this ruler', standingSpan(realmStanding));
        h += kv('Foreign policy', esc(FB.isForeignPolicyTarget(s, rid)
          ? foreignPolicyStanceText(s, rid) : FB.T('Out of reach')));
      }
      const setts = FB.settlementsOf(s, pid);
      if (setts.length) {
        // in your own demesne a settlement is a button: it opens the buildings
        // standing in THAT settlement and what each provides (UI.showSettlement)
        const own = FB.demesne(s).indexOf(pid) >= 0;
        h += '<div class="settblock"><span>' + esc(FB.T('Settlements')) + '</span>' +
          '<div class="settlist">' + setts.map(function (st, si) {
            const label = (st.kind === 'city' ? '🏙' : st.kind === 'town' ? '🏘' : '🏡') + ' ' + esc(st.name);
            return own
              ? '<button class="linklike settlink" data-sett="' + si + '" title="' +
                esc(FB.T('See the buildings of {settlement}', { settlement: st.name })) + '">' + label + '</button>'
              : '<span>' + label + '</span>';
          }).join('') + '</div></div>';
        if (own) {
          h += '<div class="hint">' + esc(FB.T('Each settlement keeps its own buildings — tap one to see them and raise more.')) + '</div>';
        }
      }
      if (s.player.provs && s.player.provs.indexOf(pid) >= 0) {
        h += '<div class="progressnote">' + esc(FB.T('🏰 You hold this province.')) + '</div>';
      }
      const capitalCandidate = playerRealm && playerRealm.alive &&
        pid !== s.player.provinceId && holdId === 'player' &&
        s.player.provs && s.player.provs.indexOf(pid) >= 0;
      if (capitalCandidate) {
        const capitalStatus = FB.capitalRelocationStatus(s, pid);
        h += '<button type="button" class="actionbtn" id="btn-relocate-capital"' +
          (capitalStatus.ok ? '' : ' disabled') + '>' +
          esc(FB.T('🏰 Move capital here…')) +
          '<span class="adesc">' + esc(capitalStatus.ok
            ? capitalRelocationTerms(capitalStatus) : capitalStatus.reason) +
          '</span></button>';
      }
      if (realm && !myRealm && s.player.tier >= 3) {
        h += '<div class="progressnote">' + esc(FB.T(
          '🛡 They can field ~{theirs} — you can field ~{yours}.',
          { theirs: menText(s, realmMen), yours: menText(s, FB.playerLevy(s)) })) + '</div>';
      }
      if (realm && FB.isRealmAtWar(s, rid)) {
        h += '<div class="progressnote warnote">' +
          esc(FB.T('⚔ This realm is at war.')) + '</div>';
      }
      const hostsHere = FB.armiesAt ? FB.armiesAt(s, pid) : [];
      if (hostsHere.length) {
        h += '<div class="progressnote warnote">' + esc(FB.T('⚔ Hosts in the field here:')) +
          ' ' + hostsHere.map(function (a) {
            const owner = a.realm === 'player' ? FB.T('Your host') :
              (s.realms[a.realm] ? s.realms[a.realm].name : '?');
            return esc(FB.T('{owner} (~{men})',
              { owner: owner, men: menText(s, a.men) }));
          }).join(' · ') + '</div>';
      }
      if (realm && s.pacts && s.pacts[rid] > s.turn) {
        h += '<div class="progressnote">' + esc(FB.T(
          '🕊 A pact of peace holds until {year} AD.',
          { year: FB.dateAtTurn(s, s.pacts[rid]).year })) + '</div>';
      }
      h += panelh('Notable folk');
      const rulers = landRulers(s, pid);
      if (rulers.length) {
        for (const ruler of rulers) h += landRulerRow(s, ruler);
        h += '<div class="hint" style="margin:4px 0 0">' +
          esc(FB.T('Select a ruler for their realm sheet; select yourself for your character sheet.')) +
          '</div>';
      } else {
        /* Defensive fallback for malformed saves or exceptional settled
           counties whose political ruler cannot be resolved. */
        const nb = FB.provNotables(s, pid);
        if (nb.length) {
          for (const c of nb) {
            let meta = epithetText(s, c) ||
              (c.role ? roleName(c.role) : '');
            meta = (meta ? meta + ' · ' : '') +
              FB.T('age {age}', { age: FB.ageOf(c, s.date.year) });
            h += charRow(s, c, meta, true);
          }
          h += '<div class="hint" style="margin:4px 0 0">' +
            esc(FB.T('Tap a person for their sheet — and your dealings with them.')) +
            '</div>';
        } else {
          h += '<div class="cmeta" style="font-size:13px">' +
            esc(FB.T('No one of note.')) + '</div>';
        }
      }
    }
    h += '<div style="margin-top:10px"><button class="btn small" id="btn-center-home">⌂ Center on home</button></div>';
    $('tab-prov').innerHTML = h;
    FB.localizeTree($('tab-prov'));
    FB.paintFaces($('tab-prov'), s);
    const b = $('btn-center-home');
    if (b) b.addEventListener('click', function () { FB.map.centerOn(FB.state.player.provinceId, 2.2); });
    const relocate = $('btn-relocate-capital');
    if (relocate) relocate.addEventListener('click', function () {
      UI.showCapitalRelocation(pid);
    });
    document.querySelectorAll('#tab-prov .settlink').forEach(function (btn) {
      btn.addEventListener('click', function () { UI.showSettlement(pid, +btn.dataset.sett); });
    });
  }

  let logRenderedTail = null, logRenderedLen = -1; // skip identical rebuilds on quiet ticks
  function renderLog() {
    const s = FB.state;
    const tail = s.log.length ? s.log[s.log.length - 1] : null;
    if (tail === logRenderedTail && s.log.length === logRenderedLen) return;
    logRenderedTail = tail; logRenderedLen = s.log.length;
    let h = '<div class="panelh">' + esc(FB.game && FB.game.observe
      ? FB.T('Chronicle of the realms')
      : FB.T('Chronicle of {dynasty}', { dynasty: s.chars[s.player.charId].dyn || FB.T('your line') })) +
      '</div>';
    for (let i = s.log.length - 1; i >= 0 && i >= s.log.length - 80; i--) {
      const e = s.log[i];
      const logDate = e.d
        ? FB.T('{season} {day}, {year}', {
          season: FB.seasonName(e.s), day: e.d, year: e.y
        })
        : FB.T('{season}, {year}', { season: FB.seasonName(e.s), year: e.y });
      h += '<div class="logentry"><span class="ldate">' + esc(logDate) + '</span><br>' +
        esc(FB.newsText(e, s, s.player.charId)) + '</div>';
    }
    $('tab-log').innerHTML = h;
    FB.localizeTree($('tab-log'));
  }

  function selfDrawerOpen() {
    return document.body.classList.contains('showself');
  }

  function openSelfDrawerRaw() {
    document.body.classList.add('showself');
    renderActiveTab();
  }

  function closeSelfDrawerRaw() {
    document.body.classList.remove('showself');
    if ($('tb-portrait').offsetParent !== null) $('tb-portrait').focus();
  }

  function closeSelfDrawer() {
    if (!selfDrawerOpen()) return;
    closeSelfDrawerRaw();
    mobileNavClosed('self-drawer', false);
  }

  function setTab(name, opts) {
    if (FB.game && FB.game.observe && (name === 'actions' || name === 'network')) return;
    const isLeft = LEFT_TABS.indexOf(name) >= 0;
    const previousTab = activeTab;
    const drawerWasOpen = selfDrawerOpen();
    if (isLeft) activeLeftTab = name; else activeTab = name;
    const bar = isLeft ? '#lefttabs .tab' : '#sidetabs .tab';
    document.querySelectorAll(bar).forEach(function (t) { t.classList.toggle('active', t.dataset.tab === name); });
    const body = isLeft ? $('leftbody') : $('sidebody');
    body.querySelectorAll('.tabpane').forEach(function (p) { p.classList.remove('active'); });
    $('tab-' + name).classList.add('active');
    // on phones Self/Kin is a drawer (body.showself); the class is inert on desktop
    if (isLeft) document.body.classList.add('showself');
    else document.body.classList.remove('showself');
    renderActiveTab();
    if (isLeft && !drawerWasOpen) {
      mobileNavPush('self-drawer', closeSelfDrawerRaw, openSelfDrawerRaw,
        selfDrawerOpen, function () { return true; });
    } else if (!isLeft && drawerWasOpen) {
      mobileNavClosed('self-drawer', false);
    }
    if (!isLeft && name !== previousTab && !(opts && opts.history === false)) {
      mobileNavPush('panel-tab',
        function () { setTab(previousTab, { history:false }); },
        function () { setTab(name, { history:false }); },
        function () { return activeTab === name && !selfDrawerOpen(); },
        function () { return true; });
    }
  }

  UI.cycleTab = function (dir) {
    const order = (FB.game && FB.game.observe)
      ? ['prov', 'log'] : ['actions', 'prov', 'network', 'log'];
    let i = order.indexOf(activeTab) + dir;
    if (i < 0) i = order.length - 1;
    if (i >= order.length) i = 0;
    setTab(order[i]);
  };

  UI.showTab = function (name, opts) { setTab(name, opts); };

  /* ================= autoresolve ================= */
  /* Which category does an event fall into for the autoresolve settings? */
  function autoCategory(ev, item) {
    if (ev.travel && (ev.travel.kind === 'road' || ev.travel.kind === 'culture')) {
      return 'everyday';
    }
    if (ev.trigger && ev.trigger.never) return ev.wartime ? 'war' : 'major'; // queued decisions
    if (ev.once) return 'major';
    return item.rnd ? 'everyday' : 'major';
  }

  /* The worst wound an event could deal across every option and chance
     branch — death is never delegated to the autoresolver. */
  function worstWound(ev) {
    let worst = 0;
    function scan(fx) {
      if (fx && typeof fx.health === 'number' && fx.health < worst) worst = fx.health;
    }
    for (const o of (ev.options || [])) {
      scan(o.effects);
      if (o.success) scan(o.success.effects);
      if (o.failure) scan(o.failure.effects);
    }
    return worst;
  }

  /* Does any branch of this event ask for the naming of an heir? */
  function hasHeirPick(ev) {
    function has(fx) { return !!(fx && fx.pickHeir); }
    for (const o of (ev.options || [])) {
      if (has(o.effects) || has(o.success && o.success.effects) ||
        has(o.failure && o.failure.effects)) return true;
    }
    return false;
  }

  /* Titles and independence change the player's whole mode of play. Ordinary
     category automation may handle the surrounding story, but only the
     explicit "everything" setting may make this irreversible choice. */
  function hasTitleChoice(ev) {
    function has(fx) {
      return !!(fx && (fx.tierSet >= 3 || fx.tierUp || fx.declareIndependence ||
        fx.travelSettle));
    }
    for (const o of (ev.options || [])) {
      if (has(o.effects) || has(o.success && o.success.effects) ||
        has(o.failure && o.failure.effects)) return true;
    }
    return false;
  }

  function autoWants(ev, item) {
    const a = FB.game.auto;
    if (!a) return false;
    /* resolve everything: no event interrupts the days — only death itself
       (never an event) and the succession screen stop the flow */
    if (a.all) return true;
    /* the naming of an heir is a human choice, however automation is set */
    if (hasHeirPick(ev)) return false;
    /* accepting a title or declaring independence is likewise shown */
    if (hasTitleChoice(ev)) return false;
    /* an event that could drop the player to 0 health is always shown,
       however the automation is set — the killing blow is never silent */
    const s = FB.state;
    if (s && s.player && !s.player.dead) {
      const me = s.chars[s.player.charId];
      const hp = me && me.health !== undefined ? me.health : 8;
      if (hp + worstWound(ev) <= 0) return false;
    }
    const cat = autoCategory(ev, item);
    if (cat === 'everyday') return !!a.minor;
    if (cat === 'war') return !!a.war;
    return !!a.major;
  }

  /* Rough worth of an option for the auto-picker. Options needing a human
     (naming an heir) score far below anything else. */
  /* the war-council customs carry no numbers for fxScore to read — without
     these, "Fall back and refit" (health +1) outscored "Press the siege"
     every season and an automated war could never take land */
  const CUSTOM_FX_SCORE = {
    war_siege:12, war_win:8, war_hunt:6, war_loss:-8,
    ghw_recruit_volunteers:8, ghw_recruit_mercenaries:22,
    ghw_recruit_knights:20, ghw_recruit_adventurers:21,
    academy_introduction:3, academy_student_focus:1.5,
    academy_student_dip:1.5, academy_student_ste:1.5,
    academy_student_int:1.5, academy_student_lea:1.5,
    academy_withdraw:-1
  };
  function fxScore(fx) {
    if (!fx) return 0;
    let v = 0;
    if (fx.custom && CUSTOM_FX_SCORE[fx.custom]) v += CUSTOM_FX_SCORE[fx.custom];
    if (typeof fx.gold === 'number') v += fx.gold * 0.5;
    if (fx.prestige) v += fx.prestige * 0.4;
    if (fx.piety) v += fx.piety * 0.3;
    if (fx.health) v += fx.health * 4;
    if (fx.popularOpinion) v += fx.popularOpinion * 0.15;
    if (fx.opinionLiege) v += fx.opinionLiege * 0.1;
    if (fx.opinion && fx.opinion.amt) v += fx.opinion.amt * 0.1;
    if (fx.skills) for (const k in fx.skills) v += fx.skills[k] * 1.5;
    if (fx.tierSet !== undefined || fx.tierUp) v += 25;
    if (fx.marry) v += 10;
    if (fx.killChild || fx.killRole) v -= 10;
    if (fx.setFlag === 'ill') v -= 4;
    if (fx.addTrait === 'scarred' || fx.addTrait === 'craven') v -= 3;
    if (fx.pickHeir) v -= 100;
    return v;
  }

  function optionScore(s, o, style) {
    if (o.chance !== undefined) {
      const p = typeof o.chance === 'string' ? FB.namedChance(s, o.chance) : o.chance;
      const sv = fxScore(o.effects) + fxScore(o.success && o.success.effects);
      const fv = fxScore(o.effects) + fxScore(o.failure && o.failure.effects);
      if (style === 'bold') return sv * (0.4 + p * 0.6) + fv * (1 - p) * 0.5;
      return sv * p + fv * (1 - p) - 1; // prudent: a touch risk-averse
    }
    return fxScore(o.effects);
  }

  /* Resolve an event without opening the modal; the chronicle records it. */
  function autoResolve(ev, item) {
    const s = FB.state;
    const ctx = item.ctx || {};
    /* while the machine resolves, a pickHeir effect names the first in line
       silently (see applyEffects) instead of opening the heir modal */
    UI.autoResolving = true;
    FB.markFired(s, ev);
    let opts = (ev.options || []).filter(function (o) {
      return !o.require || FB.checkTrigger(s, o.require, ctx);
    });
    if (!opts.length) opts = [{ label: 'So it goes.', effects: {} }];
    let pick = opts[0];
    const style = FB.game.auto.style;
    if (style !== 'first') {
      let best = -1e9;
      for (const o of opts) {
        const v = optionScore(s, o, style);
        if (v > best) { best = v; pick = o; }
      }
    }
    const authoredIndex = ev.options ? ev.options.indexOf(pick) : -1;
    let outcomeMsg = null;
    let outcomePath = null;
    if (pick.chance !== undefined) {
      const p = typeof pick.chance === 'string' ? FB.namedChance(s, pick.chance) : pick.chance;
      const ok = FB.chance(p);
      if (pick.chance === 'battle' || pick.chance === 'war_battle') delete s.player.flags.blessed_war;
      if (pick.effects) FB.applyEffects(s, pick.effects, ctx, ev);
      const branch = ok ? pick.success : pick.failure;
      if (branch) {
        if (branch.effects) FB.applyEffects(s, branch.effects, ctx, ev);
        if (branch.text && authoredIndex >= 0) {
          outcomePath = 'options.' + authoredIndex + '.' +
            (ok ? 'success' : 'failure') + '.text';
        } else {
          outcomeMsg = ok
            ? FB.msg('fx.event.autoresolve.success', 'It goes well.', {})
            : FB.msg('fx.event.autoresolve.failure', 'It goes poorly.', {});
        }
      }
    } else if (pick.effects) {
      FB.applyEffects(s, pick.effects, ctx, ev);
    }
    /* Match the old simulation order while keeping rendering pure: effects
       resolve first, then any outcome roles, title roles, and choice roles. */
    if (outcomePath) {
      FB.prepareEventPath(s, ev, outcomePath, ctx);
      outcomeMsg = FB.eventMessage(s, s.player.charId, ev, outcomePath, ctx);
    }
    FB.prepareEventPath(s, ev, 'title', ctx);
    const titleMsg = FB.eventMessage(s, s.player.charId, ev, 'title', ctx);
    let choiceMsg;
    if (authoredIndex >= 0) {
      const choicePath = 'options.' + authoredIndex + '.label';
      FB.prepareEventPath(s, ev, choicePath, ctx);
      choiceMsg = FB.eventMessage(s, s.player.charId, ev, choicePath, ctx);
    } else {
      choiceMsg = FB.msg('fx.event.autoresolve.default_choice', 'So it goes.', {});
    }
    FB.news(s, FB.msg('news.event.autoresolved', {
      forms: {
        select: 'value', param: 'result', cases: {
          outcome: '⚙ {title}: {choice} — {outcome}',
          other: '⚙ {title}: {choice}'
        }
      }
    }, {
      result: outcomeMsg ? 'outcome' : 'other',
      title: FB.messageParam(titleMsg),
      choice: FB.messageParam(choiceMsg),
      outcome: outcomeMsg ? FB.messageParam(outcomeMsg) : ''
    }));
    UI.autoResolving = false;
  }

  UI.showAutoResolve = function () {
    const a = FB.game.auto;
    const s = FB.state;
    function cb(id, checked, label, desc) {
      return '<label class="autorow"><input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + '> ' +
        label + (desc ? '<span class="adesc">' + desc + '</span>' : '') + '</label>';
    }
    function rb(val, label) {
      return '<label class="autorow"><input type="radio" name="ar-style" value="' + val + '"' +
        (a.style === val ? ' checked' : '') + '> ' + label + '</label>';
    }
    function hr(val, label) {
      return '<label class="autorow"><input type="radio" name="ar-hosts" value="' + val + '"' +
        ((a.hosts || 'manual') === val ? ' checked' : '') + '> ' + label + '</label>';
    }
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'While the days flow (or fast-forward), the chosen kinds of events resolve themselves. Every outcome is written to the Chronicle.')) +
      '</p></div>';
    h += cb('ar-minor', a.minor, '<b>Autoresolve minor events</b>', 'Everyday happenings — the small incidents of daily life.');
    h += cb('ar-major', a.major, '<b>Autoresolve major events</b>', 'Once-in-a-life moments and story events — but never one that could cost you your life, name an heir, accept a title, or declare independence. Those are always shown.');
    h += cb('ar-war', a.war, '<b>Autoresolve war events</b>', 'Musters, war councils, tribute envoys, and battle reports. Your hosts still raise, march, and fight on the map by their own rules — this chooses your orders each season.');
    h += cb('ar-all', a.all, '<b>Autoresolve everything</b>', 'No event ever interrupts the days — even mortal danger and the naming of an heir resolve on their own. Only your death and the choice of a successor stop the flow.');
    h += '<div class="gm-body-text" style="margin-top:8px"><p>How to choose between options:</p></div>';
    h += rb('safe', 'Prudent — avoid risk, prefer sure gains');
    h += rb('bold', 'Bold — chase the bigger prize');
    h += rb('first', 'First option — take the default');
    h += '<div class="gm-body-text" style="margin-top:8px"><p>' + esc(FB.T(
      'Command your host in war (it marches only while standing idle — a route you tap by hand always plays out, and a halted host holds):')) + '</p></div>';
    h += hr('manual', 'Manually — you march the host yourself');
    h += hr('def', 'Defensive — throw back invaders, then refit at home');
    h += hr('off', 'Offensive — hunt their host when stronger, then besiege the prize');
    h += '<div class="gm-body-text" style="margin-top:8px"><p>Stewardship (tier 3+, once a season):</p></div>';
    h += cb('ar-build', a.build, 'Raise buildings automatically', 'The cheapest available building, when the treasury can spare it.');
    if (s && FB.isPlayerSovereign(s)) {
      h += cb('ar-research', a.research,
        esc(FB.T('Fill research slots automatically')),
        esc(FB.T('Open slots are filled immediately and whenever a project completes.')));
      h += '<label class="autorow auto-select"><span>' +
        esc(FB.T('Research priority')) + '</span><select id="ar-research-mode">' +
        techAutomationOptions(a.researchMode) + '</select><span class="adesc">' +
        esc(FB.T('A preferred domain is chosen first; if none is eligible, automation uses the cheapest eligible technology from another domain.')) +
        '</span></label>';
    } else if (s) {
      h += '<div class="hint">' + esc(FB.T(
        'Only a sovereign player chooses national technology; your sovereign selects the project.')) +
        '</div>';
    }
    h += '<div class="gm-footer"><button class="btn primary" id="ar-done">Done</button></div>';
    openModal('⚙ Automation', h, { modalClass: 'fullsheet-modal' });
    function sync() {
      a.minor = $('ar-minor').checked;
      a.major = $('ar-major').checked;
      a.war = $('ar-war').checked;
      a.all = $('ar-all').checked;
      a.build = $('ar-build').checked;
      const research = $('ar-research');
      if (research) a.research = research.checked;
      const researchMode = $('ar-research-mode');
      if (researchMode) a.researchMode = techAutomationMode(researchMode.value);
      const r = document.querySelector('input[name=ar-style]:checked');
      if (r) a.style = r.value;
      const hsel = document.querySelector('input[name=ar-hosts]:checked');
      if (hsel) a.hosts = hsel.value;
      FB.game.saveAuto();
      if (research && a.research && FB.state && FB.autoResearch) {
        FB.autoResearch(FB.state, a.researchMode);
      }
      if (FB.state) UI.refresh();
    }
    ['ar-minor', 'ar-major', 'ar-war', 'ar-all', 'ar-build',
      'ar-research', 'ar-research-mode'].forEach(function (id) {
      const control = $(id);
      if (control) control.addEventListener('change', sync);
    });
    document.querySelectorAll('input[name=ar-style]').forEach(function (r) { r.addEventListener('change', sync); });
    document.querySelectorAll('input[name=ar-hosts]').forEach(function (r) { r.addEventListener('change', sync); });
    $('ar-done').addEventListener('click', function () { sync(); UI.closeModal(); });
  };

  /* ================= event modal ================= */
  /* Returns true if a modal actually opened (so fast-forward stops);
     autoresolved events pass through silently. */
  UI.runEvents = function (list) {
    pendingEvents = pendingEvents.concat(list);
    if (!eventOpen) return nextEvent();
    return true;
  };
  UI.cancelTravelEvents = function () {
    pendingEvents = pendingEvents.filter(function (item) { return !item.travel; });
  };

  function nextEvent() {
    const s = FB.state;
    while (pendingEvents.length) {
      const item = pendingEvents.shift();
      const ev = FB.eventById(item.id);
      if (!ev) continue;
      if (autoWants(ev, item)) { autoResolve(ev, item); continue; }
      showEvent(ev, item.ctx || {});
      return true;
    }
    eventOpen = false;
    $('eventmodal').classList.add('hidden');
    UI.refresh();
    if (FB.state && !$('game').classList.contains('hidden') &&
      $('genmodal').classList.contains('hidden')) $('btn-endturn').focus();
    if (FB.game && FB.game.afterEvents) FB.game.afterEvents();
    return false;
  }

  /* every soul an event names gets a card — face, house arms, home, and
     allegiance — so "Reginbald insulted me" never arrives as a bare name.
     Scans the raw strings (title, text variants, option labels, branch
     texts) for {role} tokens and the queued {student}; prepareEvent creates
     roles before any localized rendering begins. */
  function eventCharCards(s, ev, ctx, carded) {
    let raw = ' ';
    function add(x) {
      if (!x) return;
      if (typeof x === 'string') raw += x + ' ';
      else if (typeof x === 'object') { for (const k in x) add(x[k]); }
    }
    add(ev.title); add(ev.text);
    for (const o of (ev.options || [])) {
      add(o.label); add(o.desc);
      if (o.success) add(o.success.text);
      if (o.failure) add(o.failure.text);
    }
    let h = '';
    for (const role of ['lord', 'priest', 'friend', 'rival', 'spouse', 'suitor']) {
      if (raw.indexOf('{' + role + '}') < 0) continue;
      const c = FB.getRole(s, role, false);
      if (c && !carded[c.id]) { carded[c.id] = 1; h += UI.charCardHtml(s, c); }
    }
    if (raw.indexOf('{student}') >= 0 && ctx && ctx.studentId) {
      const student = s.chars[ctx.studentId];
      if (student && !student.dead && !carded[student.id]) {
        carded[student.id] = 1;
        h += UI.charCardHtml(s, student);
      }
    }
    return h;
  }

  function showEvent(ev, ctx) {
    const s = FB.state;
    eventOpen = true;
    FB.markFired(s, ev);
    $('eventmodal').classList.remove('hidden');
    if (FB.prepareEvent) FB.prepareEvent(s, ev, ctx);
    $('ev-title').textContent = FB.eventText(s, s.player.charId, ev, 'title', ctx);
    let bodyHtml = esc(FB.eventText(s, s.player.charId, ev, 'text', ctx));
    if (ev.warStatus && FB.warStateText) {
      bodyHtml += '<p class="adesc">' + esc(FB.warStateText(s, s.player.charId)) + '</p>';
    }
    const carded = {};
    if (ev.charCard) {
      const cc = FB.getRole(s, ev.charCard, false);
      if (cc) { bodyHtml += UI.charCardHtml(s, cc); carded[cc.id] = 1; }
    }
    bodyHtml += eventCharCards(s, ev, ctx, carded);
    $('ev-text').innerHTML = bodyHtml;
    FB.paintFaces($('ev-text'), s);
    const box = $('ev-options');
    box.innerHTML = '';
    /* a nameChild event (births) opens with a name field: the generated name,
       editable, with a dice to reroll from the child's culture */
    if (ev.nameChild && ctx.childId) {
      const nc = s.chars[ctx.childId];
      if (nc && !nc.dead) {
        const row = document.createElement('div');
        row.className = 'evname';
        row.innerHTML = '<label>Name the child <input id="ev-name" type="text" maxlength="20"></label>' +
          '<button id="ev-name-dice" class="btn small" title="' +
          esc(FB.T('Random name')) + '">&#127922;</button>';
        box.appendChild(row);
        const inp = $('ev-name');
        inp.value = nc.name;
        $('ev-name-dice').addEventListener('click', function () {
          inp.value = FB.randomName(nc.culture, nc.sex);
          inp.focus();
          inp.select();
        });
      }
    }
    let opts = (ev.options || []).filter(function (o) {
      return !o.require || FB.checkTrigger(s, o.require, ctx);
    });
    if (!opts.length) opts = [{ label: 'So it goes.', effects: {} }];
    for (let i = 0; i < opts.length; i++) {
      const o = opts[i];
      /* original index (not the filtered position) keys the overlay stably */
      const oi = ev.options ? ev.options.indexOf(o) : -1;
      const btn = document.createElement('button');
      btn.className = 'evopt';
      btn.innerHTML = hintFor(i) +
        esc(oi >= 0 ? FB.eventText(s, s.player.charId, ev, 'options.' + oi + '.label', ctx) : FB.fmt(s, o.label, ctx)) +
        (o.desc ? '<span class="odesc">' + esc(oi >= 0 ? FB.eventText(s, s.player.charId, ev, 'options.' + oi + '.desc', ctx) : FB.fmt(s, o.desc, ctx)) + '</span>' : '');
      (function (opt) {
        btn.addEventListener('click', function () { if (eventInputGuarded()) return; chooseOption(ev, opt, ctx); });
      })(o);
      box.appendChild(btn);
    }
    FB.localizeTree(box);
    armEventGuard();
    setTimeout(function () {
      const inp = $('ev-name');
      if (inp && !FB.isTouch) { inp.focus(); inp.select(); return; }
      const b = box.querySelector('.evopt');
      if (b) b.focus();
    }, 0);
  }

  function chooseOption(ev, opt, ctx) {
    const s = FB.state;
    if (ev.nameChild && ctx.childId) {
      const nc = s.chars[ctx.childId];
      const inp = $('ev-name');
      if (nc && inp) {
        const nm = (inp.value || '').trim();
        if (nm) nc.name = nm;
      }
    }
    if (opt.chance !== undefined) {
      const p = typeof opt.chance === 'string' ? FB.namedChance(s, opt.chance) : opt.chance;
      const ok = FB.chance(p);
      // a blessed sword is spent on the battle it blesses, won or lost
      if (opt.chance === 'battle' || opt.chance === 'war_battle') delete s.player.flags.blessed_war;
      const branch = ok ? opt.success : opt.failure;
      if (opt.effects) FB.applyEffects(s, opt.effects, ctx, ev);
      if (branch) {
        if (branch.effects) FB.applyEffects(s, branch.effects, ctx, ev);
        const oi = ev.options ? ev.options.indexOf(opt) : -1;
        const outcomePath = oi >= 0
          ? 'options.' + oi + '.' + (ok ? 'success' : 'failure') + '.text'
          : '';
        if (branch.text && outcomePath) FB.prepareEventPath(s, ev, outcomePath, ctx);
        const btext = branch.text
          ? (oi >= 0 ? FB.eventText(s, s.player.charId, ev, outcomePath, ctx) : FB.fmt(s, branch.text, ctx))
          : (ok ? FB.T('It goes well.') : FB.T('It goes poorly.'));
        showOutcome(btext);
        return;
      }
    } else if (opt.effects) {
      FB.applyEffects(s, opt.effects, ctx, ev);
    }
    nextEvent();
  }

  function showOutcome(text) {
    $('ev-text').innerHTML = '<i>' + esc(text) + '</i>';
    const box = $('ev-options');
    box.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'evopt';
    btn.textContent = FB.T('Continue');
    btn.addEventListener('click', function () { if (eventInputGuarded()) return; nextEvent(); });
    box.appendChild(btn);
    armEventGuard();
    btn.focus();
  }

  UI.eventsBusy = function () { return eventOpen; };

  /* ================= generic modal ================= */
  let genericNavSnapshot = null;
  let genericViewSerial = 0;
  let modalOpenTrigger = null;

  function eventControl(target) {
    let node = target;
    while (node && node !== document) {
      if (node.tagName === 'BUTTON' || node.tagName === 'A' ||
          node.tagName === 'INPUT' || node.tagName === 'SELECT' ||
          node.tagName === 'TEXTAREA' || node.hasAttribute('tabindex')) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  document.addEventListener('click', function (event) {
    if (!$('genmodal').classList.contains('hidden')) return;
    const control = eventControl(event.target);
    if (!control) return;
    modalOpenTrigger = control;
    setTimeout(function () {
      if (modalOpenTrigger === control) modalOpenTrigger = null;
    }, 0);
  }, true);

  function setModalClasses(gm, value) {
    const previous = String(UI._gmModalClass || '').match(/\S+/g) || [];
    for (const token of previous) gm.classList.remove(token);
    const next = String(value || '').match(/\S+/g) || [];
    UI._gmModalClass = next.join(' ');
    for (const token of next) gm.classList.add(token);
  }

  function captureModalView(view) {
    const body = $('gm-body');
    view.title = $('gm-title').textContent;
    view.body = document.createDocumentFragment();
    view.scrollTop = body.scrollTop;
    view.dismiss = UI._gmDismiss;
    view.historyBack = !!(genericNavSnapshot && genericNavSnapshot.historyBack);
    view.returnFocus = UI._gmReturnFocus;
    view.returnAction = UI._gmReturnAction;
    view.modalClass = UI._gmModalClass || '';
    view.noFocus = !!(genericNavSnapshot && genericNavSnapshot.noFocus);
    view.token = genericNavSnapshot && genericNavSnapshot.token;
    view.focus = document.activeElement && $('genmodal').contains(document.activeElement)
      ? document.activeElement : null;
    while (body.firstChild) view.body.appendChild(body.firstChild);
  }

  function restoreModalView(view) {
    const gm = $('genmodal');
    const body = $('gm-body');
    while (body.firstChild) body.removeChild(body.firstChild);
    $('gm-title').textContent = view.title;
    body.appendChild(view.body);
    body.scrollTop = view.scrollTop || 0;
    setModalClasses(gm, view.modalClass);
    UI._gmDismiss = view.dismiss;
    UI._gmReturnFocus = view.returnFocus;
    UI._gmReturnAction = view.returnAction;
    genericNavSnapshot = {
      dismiss:view.dismiss,
      historyBack:view.historyBack,
      returnFocus:view.returnFocus,
      returnAction:view.returnAction,
      modalClass:view.modalClass,
      noFocus:view.noFocus,
      token:view.token
    };
    gm.classList.remove('hidden');
    setTimeout(function () {
      if (view.focus && document.documentElement.contains(view.focus)) {
        view.focus.focus({ preventScroll:true });
      } else if (!view.noFocus) {
        focusFirstModalControl();
      } else {
        focusModalContainer();
      }
    }, 0);
  }

  function modalHistoryBack(fallback) {
    const layer = mobileNavLayers[mobileNavDepth];
    if (mobileNavReady && !mobileNavPendingBack && layer &&
      layer.kind === 'modal-view' && layer.visible) {
      mobileNavRequestBack();
      return;
    }
    fallback();
  }

  /* Dialog builders historically put exit controls in several places:
     loose after the body, inside an action list, or in a real footer. Gather
     Close/Done/Cancel/Back-style controls into one footer without making
     substantive choices (confirm, buy, appoint, etc.) look like exits. */
  function normalizeModalFooter(root) {
    if (!root) return;
    const legacy = root.querySelectorAll('button.gm-footer');
    for (let i = 0; i < legacy.length; i++) {
      const button = legacy[i];
      const wrapper = document.createElement('div');
      wrapper.className = 'gm-footer';
      button.classList.remove('gm-footer');
      button.parentNode.insertBefore(wrapper, button);
      wrapper.appendChild(button);
    }

    const buttons = root.querySelectorAll(
      'button[id$="-cancel"], button[id$="-close"], button[id$="-back"], ' +
      'button[id$="-done"], button[id^="gm-ok"]');
    if (!buttons.length) return;

    let footer = null;
    for (let i = 0; i < root.children.length; i++) {
      if (root.children[i].classList.contains('gm-footer')) {
        footer = root.children[i];
        break;
      }
    }
    if (!footer) {
      footer = document.createElement('div');
      footer.className = 'gm-footer';
      root.appendChild(footer);
    }

    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const oldParent = button.parentNode;
      button.classList.remove('actionbtn');
      button.classList.remove('gm-footer');
      button.classList.add('btn');
      if (oldParent !== footer) footer.appendChild(button);
      if (oldParent !== root && oldParent !== footer &&
        !oldParent.children.length && !oldParent.textContent.trim()) {
        oldParent.parentNode.removeChild(oldParent);
      }
    }
  }

  function focusFirstModalControl() {
    setTimeout(function () {
      if ($('genmodal').classList.contains('hidden')) return;
      const b = $('gm-body').querySelector(
        'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]');
      if (b) b.focus({ preventScroll:true });
    }, 0);
  }

  function focusModalContainer() {
    setTimeout(function () {
      const gm = $('genmodal');
      if (gm.classList.contains('hidden')) return;
      gm.setAttribute('tabindex', '-1');
      gm.focus({ preventScroll:true });
    }, 0);
  }

  function reopenGenericModalRaw() {
    if (!genericNavSnapshot) return;
    UI._gmDismiss = genericNavSnapshot.dismiss;
    UI._gmReturnFocus = genericNavSnapshot.returnFocus;
    UI._gmReturnAction = genericNavSnapshot.returnAction;
    const gm = $('genmodal');
    setModalClasses(gm, genericNavSnapshot.modalClass);
    gm.classList.remove('hidden');
    if (!genericNavSnapshot.noFocus) focusFirstModalControl();
    else focusModalContainer();
  }

  function closeEquipmentPickerRaw(equipmentPicker, restoreFocus) {
    if (!equipmentPicker) return;
    if (equipmentPicker.parentNode) equipmentPicker.parentNode.removeChild(equipmentPicker);
    const pickerBack = UI._equipPickerReturnFocus;
    UI._equipPickerReturnFocus = null;
    if (restoreFocus !== false && pickerBack &&
      document.documentElement.contains(pickerBack)) pickerBack.focus();
  }

  function closeGenericModalRaw() {
    $('genmodal').classList.add('hidden');
    UI._gmDismiss = true;
    const back = UI._gmReturnFocus;
    const actionId = UI._gmReturnAction;
    UI._gmReturnFocus = null;
    UI._gmReturnAction = null;
    if (back && document.documentElement.contains(back)) {
      back.focus();
      return;
    }
    if (actionId) {
      const actions = document.querySelectorAll('[data-action-id]');
      for (const action of actions) {
        if (action.dataset.actionId === actionId) {
          action.focus();
          return;
        }
      }
    }
    if (FB.state && !$('game').classList.contains('hidden') &&
      $('eventmodal').classList.contains('hidden')) $('btn-endturn').focus();
  }

  function openModal(title, bodyHtml, opts) {
    const gm = $('genmodal');
    const wasHidden = gm.classList.contains('hidden');
    let previousView = null;
    if (!wasHidden && opts && opts.historyView && !mobileNavApplying &&
      mobileNavEnsure()) {
      previousView = {};
      captureModalView(previousView);
    }
    UI._gmDismiss = !(opts && opts.dismissable === false);
    if (wasHidden) {
      UI._gmReturnFocus = modalOpenTrigger &&
        document.documentElement.contains(modalOpenTrigger)
        ? modalOpenTrigger : document.activeElement;
      UI._gmReturnAction = UI._gmReturnFocus && UI._gmReturnFocus.dataset
        ? UI._gmReturnFocus.dataset.actionId : null;
      modalOpenTrigger = null;
    }
    gm.classList.remove('hidden');
    /* per-dialog modifier class (e.g. the changelog's even-margin sheet) —
       drop the previous one before applying this dialog's */
    setModalClasses(gm, opts && opts.modalClass);
    $('gm-title').textContent = FB.translateKnown(title);
    FB.localizeTree($('gm-title'));
    $('gm-body').innerHTML = bodyHtml;
    normalizeModalFooter($('gm-body'));
    FB.localizeTree($('gm-body'));
    $('gm-body').scrollTop = 0; // a reused body keeps the last dialog's scroll
    if (!FB.isTouch) {
      const btns = $('gm-body').querySelectorAll('.actionbtn');
      for (let i = 0; i < btns.length && i < 18; i++) {
        btns[i].insertAdjacentHTML('afterbegin', hintFor(i));
      }
    }
    /* opts.noFocus: focus the dialog rather than a choice, so a stray
       Space/Enter cannot activate the first button (used where the choice
       must be deliberate) */
    if (!(opts && opts.noFocus)) {
      // preventScroll: focusing a long dialog's lone Close button must not
      // drag the view to the bottom (Changelog, How to Play)
      focusFirstModalControl();
    } else focusModalContainer();
    const currentViewToken = ++genericViewSerial;
    genericNavSnapshot = {
      dismiss:UI._gmDismiss,
      historyBack:!!(opts && opts.historyBack),
      returnFocus:UI._gmReturnFocus,
      returnAction:UI._gmReturnAction,
      modalClass:UI._gmModalClass,
      noFocus:!!(opts && opts.noFocus),
      token:currentViewToken
    };
    if (previousView) {
      const currentView = {};
      const historyBackRender = opts.historyBackRender;
      mobileNavPush('modal-view',
        function () {
          captureModalView(currentView);
          if (historyBackRender) historyBackRender();
          else restoreModalView(previousView);
        },
        function () {
          captureModalView(previousView);
          restoreModalView(currentView);
        },
        function () {
          return !$('genmodal').classList.contains('hidden') &&
            genericNavSnapshot && genericNavSnapshot.token === currentViewToken;
        },
        function () { return true; });
    } else if (wasHidden) {
      mobileNavPush('generic-modal', closeGenericModalRaw, reopenGenericModalRaw,
        function () { return !$('genmodal').classList.contains('hidden'); },
        function () {
          return UI._gmDismiss ||
            (genericNavSnapshot && genericNavSnapshot.historyBack);
        });
    }
    mobileNavSyncBackControls();
  }
  UI.openModal = openModal;
  UI._gmDismiss = true;
  UI.closeModal = function () {
    const equipmentPicker = $('equip-picker-overlay');
    if (equipmentPicker) {
      closeEquipmentPickerRaw(equipmentPicker, true);
      mobileNavClosed('equipment-picker', false);
      return;
    }
    closeGenericModalRaw();
    mobileNavClosedAll('modal-view', true);
    mobileNavClosed('generic-modal', false);
  };

  /* ================= overland travel picker ================= */
  let travelPicker = null;

  function travelPurposeText(s, id, path) {
    const def = FBDATA.travelPurposes[id];
    return def ? FB.dataText(s, s.player.charId, 'travelPurpose', id, def, path, {}) : id;
  }

  UI.showTravelPurposes = function () {
    const s = FB.state;
    const eligible = FB.travelAnyPurposeEligible(s);
    if (eligible !== true) { UI.toast(eligible); return; }
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Choose why you are leaving. The next screen marks every valid county and keeps an accessible destination list beside the map.')) +
      '</p></div><div class="gm-list">';
    for (const id in FBDATA.travelPurposes) {
      const def = FBDATA.travelPurposes[id];
      if (def.targeted || FB.travelEligible(s, id) !== true) continue;
      const destinations = id === 'trade'
        ? FB.tradeVentureMarkets(s) : FB.travelDestinations(s, id);
      const stakes = id === 'trade' ? FB.tradeVentureStakes() : [];
      const affordable = destinations.some(function (item) {
        if (id !== 'trade') return item.cost <= s.player.gold;
        if (FB.tradeVentureEligible(s, 'dispatch') !== true) return false;
        return stakes.some(function (stake) {
          const preview = FB.tradeVenturePreview(s, stake, item.destinationId);
          return preview && preview.totalCost <= s.player.gold;
        });
      });
      h += '<button class="actionbtn" data-travel-purpose="' + esc(id) + '"' +
        (destinations.length && affordable ? '' : ' disabled') + '>' +
        esc((def.icon || '🧭') + ' ' + travelPurposeText(s, id, 'name')) +
        '<span class="adesc">' + esc(travelPurposeText(s, id, 'desc')) + ' ' +
        esc(destinations.length
          ? FB.T('{count} destinations in reach.', {count:destinations.length})
          : FB.T('No qualifying destination can be reached.')) + '</span></button>';
    }
    h += '</div><div class="gm-footer"><button class="btn" id="travel-purpose-cancel">' +
      esc(FB.T('Cancel')) + '</button></div>';
    openModal('🧭 Take to the road…', h);
    document.querySelectorAll('[data-travel-purpose]').forEach(function (button) {
      button.addEventListener('click', function () {
        const purposeId = button.getAttribute('data-travel-purpose');
        if (purposeId === 'trade') {
          UI.showTradeVentureSetup('travel');
          return;
        }
        UI.closeModal();
        UI.showTravelDestinations(purposeId);
      });
    });
    $('travel-purpose-cancel').addEventListener('click', UI.closeModal);
  };

  function showDestinationPicker(opts) {
    const s = FB.state;
    const choices = opts.choices || [];
    if (!choices.length) {
      UI.toast(FB.T('No qualifying destination can be reached.'));
      return;
    }
    const wasPaused = FB.game.paused;
    FB.game.setPaused(true);
    travelPicker = {
      kind:opts.kind || 'travel',
      purpose:opts.purpose || null,
      stake:opts.stake || 0,
      source:opts.source || null,
      choices:choices,
      selected:null,
      wasPaused:wasPaused,
      cancelAction:opts.cancelAction || null
    };
    document.body.classList.add('travel-picking');
    $('travel-picker').classList.remove('hidden');
    $('travel-picker-title').textContent = opts.title;
    $('travel-picker-continue').textContent = opts.kind === 'trade_venture'
      ? FB.T('Review venture') : FB.T('Review journey');
    const list = $('travel-destination-list');
    let h = '';
    for (let i = 0; i < choices.length; i++) {
      const item = choices[i];
      const pr = FB.world.byId[item.destinationId];
      const preview = opts.kind === 'trade_venture'
        ? FB.tradeVenturePreview(s, opts.stake, item.destinationId) : null;
      const cost = opts.kind === 'trade_venture'
        ? (preview ? preview.totalCost : Infinity) : item.cost;
      const short = cost > s.player.gold;
      h += '<button class="travel-destination" data-travel-destination="' +
        esc(item.destinationId) + '" data-choice-index="' + i + '">' +
        esc(pr ? pr.name : item.destinationId) +
        '<span class="adesc">' + esc(opts.kind === 'trade_venture'
          ? FB.T('{legs} county legs · {days} days each way · {money:stake} stake + {money:overhead} overhead', {
            legs:item.legs, days:item.days, stake:opts.stake, overhead:item.cost
          })
          : FB.T('{legs} county legs · {days} days each way · {money:cost}', {
            legs:item.legs, days:item.days, cost:item.cost
          })) + (short ? ' · ' + esc(FB.T('not enough money')) : '') +
        '</span></button>';
    }
    list.innerHTML = h;
    FB.map.travelTargets = choices.map(function (item) { return item.destinationId; });
    FB.map.travelSelected = null;
    FB.map.travelPreview = null;
    FB.map.select(null);
    FB.map.request();
    $('travel-picker-summary').textContent = opts.kind === 'trade_venture'
      ? FB.T('Choose a developed market on the map or from the list. The stake and route overhead are charged separately.')
      : FB.T('Tap a marked county or choose it from the list. Routes use settled counties and authored straits.');
    $('travel-picker-continue').disabled = true;
    document.querySelectorAll('[data-travel-destination]').forEach(function (button) {
      button.addEventListener('click', function () {
        UI.travelPickProvince(button.getAttribute('data-travel-destination'), true);
      });
    });
    setTimeout(function () {
      const first = list.querySelector('button');
      if (first) first.focus();
    }, 0);
    const reopen = opts.kind === 'trade_venture'
      ? function () { UI.showTradeVentureMarkets(opts.stake, opts.source); }
      : function () { UI.showTravelDestinations(opts.purpose); };
    mobileNavPush('travel-picker',
      function () { closeTravelPicker(true); },
      reopen,
      function () { return UI.travelPickerOpen(); },
      function () { return true; });
  }

  UI.showTravelDestinations = function (purposeId) {
    const s = FB.state;
    showDestinationPicker({
      kind:'travel',
      purpose:purposeId,
      choices:FB.travelDestinations(s, purposeId),
      title:FB.T('Choose a destination for {purpose}', {
        purpose:travelPurposeText(s, purposeId, 'name')
      }),
      cancelAction:UI.showTravelPurposes
    });
  };

  UI.showTradeVentureSetup = function (source) {
    const s = FB.state;
    const eligible = FB.tradeVentureEligible(s, 'dispatch');
    if (eligible !== true) { UI.toast(eligible); return; }
    const markets = FB.tradeVentureMarkets(s);
    if (!markets.length) {
      UI.toast(FB.T('No developed market can be reached.'));
      return;
    }
    const stakes = FB.tradeVentureStakes();
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Choose the capital to commit. You will select a developed market next, then decide whether to dispatch the venture or accompany it personally.')) +
      '</p><p class="hint">' + esc(FB.T(
        'Dispatching remains available during the travel cooldown. Accompanying requires ordinary travel eligibility.')) +
      '</p></div><div class="gm-list">';
    for (let i = 0; i < stakes.length; i++) {
      const stake = stakes[i];
      const affordable = markets.some(function (market) {
        const preview = FB.tradeVenturePreview(s, stake, market.destinationId);
        return preview && preview.totalCost <= s.player.gold;
      });
      h += '<button class="actionbtn" data-venture-stake="' + stake + '"' +
        (affordable ? '' : ' disabled') + '>⚖ ' +
        esc(FB.T('Invest {money:stake}…', { stake:stake })) +
        '<span class="adesc">' + esc(affordable
          ? FB.T('Choose from {count} reachable developed markets.', { count:markets.length })
          : FB.T('The purse cannot cover this stake and any reachable route.')) +
        '</span></button>';
    }
    h += '</div><div class="gm-footer"><button class="btn" id="venture-setup-back">' +
      esc(FB.T('Back')) + '</button></div>';
    openModal(FB.T('Form your own venture'), h);
    document.querySelectorAll('[data-venture-stake]').forEach(function (button) {
      button.addEventListener('click', function () {
        const stake = parseInt(button.dataset.ventureStake, 10);
        UI.closeModal();
        UI.showTradeVentureMarkets(stake, source);
      });
    });
    $('venture-setup-back').addEventListener('click',
      source === 'finance' ? UI.showFinance : UI.showTravelPurposes);
  };

  UI.showTradeVentureMarkets = function (stake, source) {
    const s = FB.state;
    const eligible = FB.tradeVentureEligible(s, 'dispatch');
    if (eligible !== true) { UI.toast(eligible); return; }
    if (FB.tradeVentureStakes().indexOf(Number(stake)) < 0) {
      UI.toast(FB.T('That stake is not available.'));
      return;
    }
    showDestinationPicker({
      kind:'trade_venture',
      purpose:'trade',
      stake:stake,
      source:source,
      choices:FB.tradeVentureMarkets(s),
      title:FB.T('Choose a market for your venture'),
      cancelAction:function () { UI.showTradeVentureSetup(source); }
    });
  };

  UI.travelPickerOpen = function () {
    return !!travelPicker && !$('travel-picker').classList.contains('hidden');
  };

  UI.travelPickProvince = function (pid, center) {
    if (!travelPicker) return false;
    let item = null;
    for (let i = 0; i < travelPicker.choices.length; i++) {
      if (travelPicker.choices[i].destinationId === pid) {
        item = travelPicker.choices[i];
        break;
      }
    }
    if (!item) {
      UI.toast(FB.T('That county does not qualify for this journey.'));
      return false;
    }
    travelPicker.selected = item;
    FB.map.travelSelected = pid;
    FB.map.travelPreview = [FB.state.player.provinceId].concat(item.route);
    FB.map.select(pid, function (id) { return id; });
    if (center) FB.map.centerOn(pid, FB.map.zoom);
    let selectedButton = null;
    document.querySelectorAll('[data-travel-destination]').forEach(function (button) {
      const selected = button.getAttribute('data-travel-destination') === pid;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
      if (selected) selectedButton = button;
    });
    if (selectedButton && !center) selectedButton.scrollIntoView({block:'nearest'});
    const pr = FB.world.byId[pid];
    const preview = travelPicker.kind === 'trade_venture'
      ? FB.tradeVenturePreview(FB.state, travelPicker.stake, pid) : null;
    const cost = travelPicker.kind === 'trade_venture'
      ? (preview ? preview.totalCost : Infinity) : item.cost;
    const affordable = cost <= FB.state.player.gold;
    if (travelPicker.kind === 'trade_venture') {
      $('travel-picker-summary').textContent = affordable
        ? FB.T('{destination}: {money:stake} stake + {money:overhead} route overhead; {days} days each way.', {
            destination:pr.name, stake:travelPicker.stake,
            overhead:item.cost, days:item.days
          })
        : FB.T('{destination} needs {money:cost} for stake and road; you have {money:gold}.', {
            destination:pr.name, cost:cost, gold:Math.floor(FB.state.player.gold)
          });
    } else {
      $('travel-picker-summary').textContent = affordable
        ? FB.T('{destination}: {legs} legs, {days} days each way, {money:cost}.', {
            destination:pr.name, legs:item.legs, days:item.days, cost:item.cost
          })
        : FB.T('{destination} costs {money:cost}; you have {money:gold}.', {
            destination:pr.name, cost:item.cost, gold:Math.floor(FB.state.player.gold)
          });
    }
    $('travel-picker-continue').disabled = !affordable;
    FB.map.request();
    return true;
  };

  function ventureReturnsText(strategy) {
    const values = [];
    for (let i = 0; i < strategy.bands.length; i++) {
      const value = strategy.bands[i].multiplier;
      if (values.indexOf(value) < 0) values.push(value);
    }
    return FB.T('Possible stake returns: {returns}.', {
      returns:values.map(function (value) {
        return FB.T('{amount}×', { amount:value });
      }).join(' · ')
    });
  }

  function reviewTradeVentureChoice() {
    if (!travelPicker || !travelPicker.selected) return;
    const item = travelPicker.selected;
    const s = FB.state;
    const preview = FB.tradeVenturePreview(
      s, travelPicker.stake, item.destinationId);
    if (!preview) {
      UI.toast(FB.T('That venture is no longer available.'));
      return;
    }
    const pr = FB.world.byId[item.destinationId];
    const cautiousRisk = Math.round(preview.strategies.cautious.lossChance * 100);
    const boldRisk = Math.round(preview.strategies.bold.lossChance * 100);
    const modifier = Math.round(preview.modifiers.total * 1000) / 10;
    const accompany = FB.tradeVentureCanStart(
      s, 'accompany', preview.stake, preview.destinationId);
    const personalDays = preview.roundTripDays +
      (FBDATA.balance.travelMinStayDays || 90);
    const currentBoldChance = Math.round(FB.namedChance(s, 'travel_trade') * 100);
    let h = '<div class="gm-body-text">' +
      '<p><b>' + esc(FB.T('Your venture to {destination}', {
        destination:pr.name
      })) + '</b></p>' +
      kv('Stake', esc(FB.T('{money:amount}', { amount:preview.stake }))) +
      kv('Route overhead', esc(FB.T('{money:amount}', { amount:preview.overhead }))) +
      kv('Total paid now', esc(FB.T('{money:amount}', { amount:preview.totalCost }))) +
      kv('Road', esc(FB.T('{legs} county legs · {days} days each way', {
        legs:preview.legs, days:preview.oneWayDays
      }))) +
      kv('Dispatch resolves', esc(FB.T('{date} · {days} days', {
        date:financeFullDate(preview.dueDate), days:preview.durationDays
      }))) +
      kv('Captured roll adjustment', esc(FB.T('{amount}%', {
        amount:(modifier > 0 ? '+' : '') + modifier
      }))) +
      '<p class="hint">' + esc(FB.T(
        'The adjustment captures Stewardship, guild standing, a Trading House, national trade knowledge, destination development, and route risk now. Later changes do not alter a dispatched venture.')) +
      '</p></div><div class="gm-list">' +
      '<button class="actionbtn" id="venture-dispatch-cautious">🧭 ' +
      esc(FB.T('Dispatch cautiously')) +
      '<span class="adesc">' + esc(FB.T(
        '{risk}% risk of total loss. You remain home and continue normal work.', {
          risk:cautiousRisk
        }) + ' ' + ventureReturnsText(preview.strategies.cautious)) +
      '</span></button>' +
      '<button class="actionbtn" id="venture-dispatch-bold">⚖ ' +
      esc(FB.T('Dispatch boldly')) +
      '<span class="adesc">' + esc(FB.T(
        '{risk}% risk of total loss, with larger gains and harsher losses. You remain home.', {
          risk:boldRisk
        }) + ' ' + ventureReturnsText(preview.strategies.bold)) +
      '</span></button>' +
      '<button class="actionbtn" id="venture-accompany"' +
      (accompany === true ? '' : ' disabled') + '>🧭 ' +
      esc(FB.T('Accompany personally')) +
      '<span class="adesc">' + esc(accompany === true
        ? FB.T('At least {days} days away. Personal work pauses; at the market you choose a guaranteed cautious return or a bold bargain (currently {chance}% success).', {
          days:personalDays, chance:currentBoldChance
        }) + ' ' + FB.T(
          'Cautious returns 1.2×; bold returns 2.5× on success or 0.3× on failure.')
        : accompany) + '</span></button>' +
      '<button class="actionbtn" id="venture-review-back">' +
      esc(FB.T('Back to markets')) + '</button></div>';
    openModal(FB.T('Review your venture'), h,
      {dismissable:false, historyBack:true});
    $('venture-dispatch-cautious').addEventListener('click', function () {
      if (!FB.startTradeVenture(s, preview.stake, preview.destinationId,
          'cautious', travelPicker.source)) return;
      UI.cancelTravelPicker(true);
      UI.closeModal();
      UI.refresh();
    });
    $('venture-dispatch-bold').addEventListener('click', function () {
      if (!FB.startTradeVenture(s, preview.stake, preview.destinationId,
          'bold', travelPicker.source)) return;
      UI.cancelTravelPicker(true);
      UI.closeModal();
      UI.refresh();
    });
    if (accompany === true) {
      $('venture-accompany').addEventListener('click', function () {
        if (!FB.travelStart(s, 'trade', preview.destinationId,
            preview.destinationRealm, {
              kind:'trade_venture', stake:preview.stake
            })) return;
        UI.cancelTravelPicker(true);
        UI.closeModal();
      });
    }
    $('venture-review-back').addEventListener('click', function () {
      UI.closeModal();
      const selected = document.querySelector('.travel-destination.selected');
      if (selected) selected.focus();
    });
  }

  function reviewTravelChoice() {
    if (!travelPicker || !travelPicker.selected) return;
    if (travelPicker.kind === 'trade_venture') {
      reviewTradeVentureChoice();
      return;
    }
    const item = travelPicker.selected;
    const s = FB.state;
    const def = FBDATA.travelPurposes[travelPicker.purpose];
    const pr = FB.world.byId[item.destinationId];
    let h = '<div class="gm-body-text">' +
      '<p><b>' + esc((def.icon || '🧭') + ' ' +
        travelPurposeText(s, travelPicker.purpose, 'name')) + '</b></p>' +
      '<p>' + esc(FB.T(
        '{destination} lies {legs} county legs away. The outbound road takes {outbound} days and the return takes {returnDays} days before encounters or decisions.', {
          destination:pr.name,
          legs:item.legs,
          outbound:item.days,
          returnDays:item.days
        })) + '</p>' +
      '<p>' + esc(s.player.tier >= 3
        ? FB.T('At the destination you must remain in guest residence for at least {days} days before returning home.', {
          days:FBDATA.balance.travelMinStayDays || 90
        })
        : FB.T('At the destination you must stay and find local work for at least {days} days before returning home.', {
          days:FBDATA.balance.travelMinStayDays || 90
        })) + '</p>' +
      (s.player.tier >= 3
        ? '<p>' + esc(FB.T('This is a temporary ruler’s journey; it cannot relocate your court or household.')) + '</p>'
        : '<p>' + esc(s.player.travelSettlement
          ? FB.T('This character has already made their one permanent move; this journey cannot relocate the household again.')
          : FB.T('After a year of local life, permanent settlement may become available. Each character can relocate the household only once in their lifetime.')) + '</p>') +
      '<p><b>' + esc(FB.T('Exact upfront cost: {money:cost}.', {cost:item.cost})) +
      '</b> ' + esc(FB.T('Turning back refunds nothing.')) + '</p></div>' +
      '<div class="gm-list"><button class="actionbtn" id="travel-depart">🧭 ' +
      esc(FB.T('Depart for {destination}', {destination:pr.name})) +
      '</button><button class="actionbtn" id="travel-review-back">' +
      esc(FB.T('Back to destinations')) + '</button></div>';
    openModal('Review journey', h, {dismissable:false, historyBack:true});
    $('travel-depart').addEventListener('click', function () {
      if (FB.travelStart(s, travelPicker.purpose, item.destinationId, item.destinationRealm)) {
        UI.cancelTravelPicker(true);
        UI.closeModal();
      }
    });
    $('travel-review-back').addEventListener('click', function () {
      UI.closeModal();
      const selected = document.querySelector('.travel-destination.selected');
      if (selected) selected.focus();
    });
  }

  UI.showSocialVisit = function (cid, options) {
    options = options || {};
    const s = FB.state;
    const c = s && s.chars[cid];
    if (!s || !c || c.dead || !FB.socialVisitPreview) return;
    const preview = FB.socialVisitPreview(s, c);
    if (!preview.eligible) {
      UI.toast(preview.reason || FB.T('That visit cannot begin.'));
      return;
    }
    const destination = FB.world.byId[preview.destinationId];
    if (!destination) return;
    const cultivated = FB.socialAttentionTarget(s);
    const continuing = !!(cultivated && cultivated.id === c.id);
    let estimate;
    if (preview.daysToThreshold === null) {
      estimate = FB.T('At the current daily rate, Standing is not advancing toward +{threshold}.', {
        threshold:FB.relationshipOpinionThreshold()
      });
    } else if (!preview.daysToThreshold) {
      estimate = FB.T('{name} is already at the +{threshold} Standing threshold.', {
        name:c.name, threshold:FB.relationshipOpinionThreshold()
      });
    } else {
      estimate = FB.T(
        'At +{rate} Standing per day together, reaching +{threshold} is estimated to take {activeDays} days in one another’s company—about {totalDays} days from departure.', {
          rate:preview.dailyRate,
          threshold:FB.relationshipOpinionThreshold(),
          activeDays:preview.daysToThreshold,
          totalDays:preview.daysFromDeparture
        });
    }
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      '{name} resides in {destination}. The route is {legs} county legs and {days} travel days each way.', {
        name:FB.fullName(c),
        destination:destination.name,
        legs:preview.legs,
        days:preview.days
      })) + '</p><p>' + esc(FB.T(
      'After arrival you must stay at least {days} days, but you may remain longer. Outbound and return travel do not advance Standing.', {
        days:preview.minimumStay
      })) + '</p><p>' + esc(estimate) + '</p>' +
      (options.courtship
        ? '<p>' + esc(FB.T(
          'Departure begins the courtship and assigns your personal attention to {name}.', {
            name:c.name
          })) + '</p>'
        : '<p>' + esc(continuing
          ? FB.T(
            'Departure keeps your personal attention on {name}; progress resumes only once you arrive.',
            { name:c.name })
           : FB.T(
             'Departure assigns your personal attention to {name}; progress begins only once you arrive.',
             { name:c.name })) + '</p>') +
      (options.courtship && s.player.tier >= 3
        ? '<p>' + esc(FB.T(
          'If the visit ends in marriage, a baron or greater ruler may then choose whether to abdicate and stay here, continue as the lawful heir, or decide later.')) + '</p>'
        : '') +
      '<p><b>' + esc(FB.T('Exact upfront cost: {money:cost}.', {
        cost:preview.cost
      })) + '</b>' + (preview.cost > s.player.gold
        ? ' ' + esc(FB.T('You have only {money:gold}.', {
          gold:Math.floor(s.player.gold)
        }))
        : '') + '</p></div><div class="gm-list">' +
      '<button class="actionbtn" id="social-visit-depart"' +
      (preview.cost > s.player.gold ? ' disabled' : '') + '>🧭 ' +
      esc(options.courtship
        ? FB.T('Depart to court {name}', { name:c.name })
        : (continuing
          ? FB.T('Depart to continue cultivating {name}', { name:c.name })
          : FB.T('Depart to cultivate {name}', { name:c.name }))) +
      '</button><button class="actionbtn" id="social-visit-cancel">' +
      esc(FB.T('Not now')) + '</button></div>';
    openModal(options.courtship
      ? FB.T('Travel to court {name}', { name:c.name })
      : FB.T('Travel to cultivate {name}', { name:c.name }), h, {
        historyView:true,
        historyBack:true
      });
    const depart = $('social-visit-depart');
    if (depart) depart.addEventListener('click', function () {
      if (!FB.socialVisitStart(s, c, { courtship:!!options.courtship })) {
        UI.toast(FB.T('Circumstances changed before the visit could begin.'));
        return;
      }
      UI.closeModal();
      UI.refresh();
    });
    $('social-visit-cancel').addEventListener('click', function () {
      modalHistoryBack(function () {
        if (options.returnRealmId) UI.showLiegeModal(options.returnRealmId);
        else UI.showCharModal(c.id);
      });
    });
  };

  function closeTravelPicker(restorePause) {
    const closed = travelPicker;
    const wasPaused = travelPicker ? travelPicker.wasPaused : true;
    travelPicker = null;
    document.body.classList.remove('travel-picking');
    $('travel-picker').classList.add('hidden');
    FB.map.travelTargets = null;
    FB.map.travelSelected = null;
    FB.map.travelPreview = null;
    FB.map.select(null);
    FB.map.request();
    if (restorePause && !wasPaused) FB.game.setPaused(false);
    return closed;
  }

  UI.cancelTravelPicker = function (discard) {
    const closed = closeTravelPicker(true);
    mobileNavClosed('travel-picker', !!discard);
    if (!discard && closed && closed.cancelAction) closed.cancelAction();
  };

  UI.showTravelSettlement = function () {
    const s = FB.state;
    const t = s && s.player.travel;
    const eligible = s && FB.travelSettlementEligible
      ? FB.travelSettlementEligible(s) : false;
    if (!s || !t || eligible !== true) {
      if (eligible) UI.toast(eligible);
      return;
    }
    const c = s.chars[s.player.charId];
    const destination = FB.world.byId[t.destinationId];
    if (!c || !destination) return;
    const h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Move the household home to {destination}. Existing land, enterprises, culture, and faith will not move or change.', {
        destination:destination.name
      })) + '</p><p class="warnote"><b>' + esc(FB.T(
      'This is {name}’s only permanent move for this lifetime. No later journey can resettle the household again.', {
        name:FB.fullName(c)
      })) + '</b></p></div><div class="gm-list">' +
      '<button type="button" class="actionbtn" id="travel-settle-confirm">🏠 ' +
      esc(FB.T('Make {destination} our permanent home', {
        destination:destination.name
      })) + '</button><button type="button" class="actionbtn" id="travel-settle-cancel">' +
      esc(FB.T('Keep staying for now')) + '</button></div>';
    openModal(FB.T('Settle permanently in {destination}?', {
      destination:destination.name
    }), h);
    $('travel-settle-confirm').addEventListener('click', function () {
      UI.closeModal();
      FB.travelSettle(s);
    });
    $('travel-settle-cancel').addEventListener('click', UI.closeModal);
  };

  UI.showMarriageResidence = function () {
    const s = FB.state;
    const t = s && s.player.travel;
    const residence = t && t.marriageResidence;
    const protagonist = s && s.chars[s.player.charId];
    const spouse = residence && s.chars[residence.spouseId];
    const destination = residence && FB.world.byId[residence.destinationId];
    if (!s || !t || !residence || !protagonist || !spouse || !destination ||
        t.purpose !== 'relationship' ||
        t.phase !== 'arrived' ||
        t.currentId !== residence.destinationId ||
        t.destinationId !== residence.destinationId) {
      UI.toast(FB.T('No post-marriage residence decision is pending.'));
      return false;
    }

    /* This is only a snapshot for the prose. Each path is checked again by
       travelMarriageResidence immediately before it changes state. */
    const heirs = FB.heirsOf ? FB.heirsOf(s) : [];
    const heir = heirs.length ? heirs[0] : null;
    const selfEligible = FB.travelMarriageResidenceEligible
      ? FB.travelMarriageResidenceEligible(s, 'self') : false;
    const heirEligible = FB.travelMarriageResidenceEligible
      ? FB.travelMarriageResidenceEligible(s, 'heir') : false;
    const realm = s.realms && s.realms.player;
    const heirName = heir ? FB.fullName(heir) : '';
    const currentHeir = heir
      ? FB.T('Your current lawful heir is {heir}.', { heir:heirName })
      : FB.T('No lawful heir is living.');
    const selfDetail = s.player.tier >= 4
      ? (heir
        ? FB.T('{heir} receives {realm}; {name} keeps the marriage and household possessions, but becomes landless gentry in {destination}.', {
            heir:heirName,
            realm:realm ? realm.name : FB.T('the realm'),
            name:FB.fullName(protagonist),
            destination:destination.name
          })
        : FB.T('{name} can remain playable only if a living lawful heir can receive the realm.', {
            name:FB.fullName(protagonist)
          }))
      : FB.T('{name} relinquishes the barony to the local count and becomes landless gentry in {destination}.', {
          name:FB.fullName(protagonist),
          destination:destination.name
        });
    const heirDetail = heir
      ? (s.player.tier >= 4
        ? FB.T('{heir} keeps the family’s existing realm and home. {former} and {spouse} remain married and live in {destination}.', {
            heir:heirName,
            former:FB.fullName(protagonist),
            spouse:FB.fullName(spouse),
            destination:destination.name
          })
        : FB.T('{heir} keeps the barony and family home. {former} and {spouse} remain married and live in {destination}.', {
            heir:heirName,
            former:FB.fullName(protagonist),
            spouse:FB.fullName(spouse),
            destination:destination.name
          }))
      : FB.T('A living lawful heir is required to continue the story.');

    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'The wedding is complete, but the household has not yet left {destination}. Choose whether this marriage changes who rules and where the family lives.', {
        destination:destination.name
      })) + '</p><p><b>' + esc(currentHeir) + '</b></p></div><div class="gm-list">' +
      '<button type="button" class="actionbtn" id="marriage-residence-self"' +
      (selfEligible === true ? '' : ' disabled') + '>👤 ' +
      esc(FB.T('Abdicate and continue as {name}', {
        name:FB.fullName(protagonist)
      })) + '<span class="adesc">' + esc(selfEligible === true
        ? selfDetail : selfEligible || selfDetail) + '</span></button>' +
      '<button type="button" class="actionbtn" id="marriage-residence-heir"' +
      (heirEligible === true ? '' : ' disabled') + '>👑 ' +
      esc(heir
        ? FB.T('Abdicate and continue as {heir}', { heir:heirName })
        : FB.T('Abdicate and continue as the heir')) +
      '<span class="adesc">' + esc(heirEligible === true
        ? heirDetail : heirEligible || heirDetail) + '</span></button>' +
      '<button type="button" class="actionbtn" id="marriage-residence-defer">🧭 ' +
      esc(FB.T('Decide later')) + '<span class="adesc">' + esc(FB.T(
        'Keep the ordinary stay and return journey. The Stay after marriage deed remains available until this journey ends.')) +
      '</span></button></div>';

    openModal(FB.T('Stay in {destination} after the wedding?', {
      destination:destination.name
    }), h, { dismissable:false });
    const selfButton = $('marriage-residence-self');
    if (selfButton) selfButton.addEventListener('click', function () {
      const eligible = FB.travelMarriageResidenceEligible(s, 'self');
      if (eligible !== true) {
        UI.toast(eligible);
        UI.showMarriageResidence();
        return;
      }
      if (FB.travelMarriageResidence(s, 'self')) UI.closeModal();
    });
    const heirButton = $('marriage-residence-heir');
    if (heirButton) heirButton.addEventListener('click', function () {
      const eligible = FB.travelMarriageResidenceEligible(s, 'heir');
      if (eligible !== true) {
        UI.toast(eligible);
        UI.showMarriageResidence();
        return;
      }
      if (FB.travelMarriageResidence(s, 'heir')) UI.closeModal();
    });
    $('marriage-residence-defer').addEventListener('click', function () {
      FB.travelMarriageResidence(s, 'defer');
      UI.closeModal();
      UI.refresh();
    });
    return true;
  };

  UI.showPendingMarriageResidence = function () {
    const s = FB.state;
    const t = s && s.player.travel;
    const residence = t && t.marriageResidence;
    if (!residence || !residence.promptPending ||
        !$('eventmodal').classList.contains('hidden') ||
        !$('genmodal').classList.contains('hidden')) return false;
    return UI.showMarriageResidence();
  };

  UI.showAbsolution = function () {
    const s = FB.state;
    if (!s || !FB.canSeekAbsolution(s)) return;
    const h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'The Pope will receive you after peace. Pay {money:gold} and offer {piety} piety to lift excommunication and restore {standing} Standing with every Catholic realm.', {
        gold:FB.religiousHeadBalance('religiousHeadAbsolutionGold', 100),
        piety:FB.religiousHeadBalance('religiousHeadAbsolutionPiety', 100),
        standing:FB.religiousHeadBalance('religiousHeadAbsolutionOpinion', 20)
      })) + '</p></div><div class="gm-list">' +
      '<button type="button" class="actionbtn" id="absolution-confirm">🕊 ' +
      esc(FB.T('Accept the Pope’s absolution')) + '</button>' +
      '<button type="button" class="actionbtn" id="absolution-cancel">' +
      esc(FB.T('Not yet')) + '</button></div>';
    openModal(FB.T('Seek absolution?'), h);
    $('absolution-confirm').addEventListener('click', function () {
      FB.seekAbsolution(s);
      UI.closeModal();
      UI.refresh();
    });
    $('absolution-cancel').addEventListener('click', UI.closeModal);
  };

  UI.showReligiousHeadRestoration = function (religionId) {
    const s = FB.state;
    if (!s || !FB.canRestoreReligiousHead(s, religionId, 'player')) return;
    const meta = FBDATA.religions[religionId].head;
    const seat = FB.world.byId[meta.seat];
    const title = FB.religiousHeadTitle(s, religionId);
    const h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Grant {seat} away permanently as an independent realm of rank {rank}. A new {title} and succession will be established there.', {
        seat:seat.name, rank:meta.restoredRank || 3, title:title
      })) + '</p><p>' + esc(FB.T(
      'You gain {piety} piety and {prestige} prestige, recover {standing} Standing with Catholic rulers, and any excommunication is cleared.', {
        piety:FB.religiousHeadBalance('religiousHeadRestorePiety', 200),
        prestige:FB.religiousHeadBalance('religiousHeadRestorePrestige', 150),
        standing:FB.religiousHeadBalance('religiousHeadRestoreOpinion', 15)
      })) + '</p></div><div class="gm-list">' +
      '<button type="button" class="actionbtn" id="head-restore-confirm">✝ ' +
      esc(FB.T('Grant {seat} and restore the Papacy', { seat:seat.name })) +
      '</button><button type="button" class="actionbtn" id="head-restore-cancel">' +
      esc(FB.T('Keep {seat}', { seat:seat.name })) + '</button></div>';
    openModal(FB.T('Restore the Papacy?'), h);
    $('head-restore-confirm').addEventListener('click', function () {
      FB.restoreReligiousHead(s, religionId, 'player');
      UI.closeModal();
      UI.refresh();
    });
    $('head-restore-cancel').addEventListener('click', UI.closeModal);
  };

  UI.showReligiousHeadClaim = function (religionId) {
    const s = FB.state;
    if (!s || !FB.canClaimReligiousHead(s, religionId, 'player')) return;
    const title = FB.religiousHeadTitle(s, religionId);
    const h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Spend {piety} piety to claim the vacant office of {title}. The office attaches to your existing realm; no county changes hands and your {prestige} prestige is not spent. Your demesne must hold at least {counties} counties.', {
        piety:FB.religiousHeadBalance('religiousHeadClaimPiety', 300),
        title:title,
        prestige:FB.religiousHeadBalance('religiousHeadClaimPrestige', 500),
        counties:FB.religiousHeadBalance('religiousHeadClaimMinRealm', 6)
      })) + '</p></div><div class="gm-list">' +
      '<button type="button" class="actionbtn" id="head-claim-confirm">☪ ' +
      esc(FB.T('Claim the Caliphate')) + '</button>' +
      '<button type="button" class="actionbtn" id="head-claim-cancel">' +
      esc(FB.T('Not yet')) + '</button></div>';
    openModal(FB.T('Claim the Caliphate?'), h);
    $('head-claim-confirm').addEventListener('click', function () {
      FB.claimReligiousHead(s, religionId, 'player');
      UI.closeModal();
      UI.refresh();
    });
    $('head-claim-cancel').addEventListener('click', UI.closeModal);
  };

  /* The occupied-office half of the claim_caliphate deed: declare the
     succession war instead of spending piety on a vacancy. */
  UI.showCaliphateWarConfirmation = function () {
    const s = FB.state;
    const cause = s && FB.caliphateWarCause(s);
    if (!cause) return;
    const enemy = s.realms[cause.enemy];
    const capital = FB.world.byId[cause.target];
    const h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Declare war on {realm} for the office of {title}. The prize is their capital, {capital}: breach it at three war councils and the Caliphate passes to your realm. No land changes hands — the loser keeps their kingdom, but not the office.', {
        realm:enemy ? enemy.name : '',
        title:FB.religiousHeadTitle(s, 'sunni'),
        capital:capital ? capital.name : ''
      })) + '</p></div><div class="gm-list">' +
      '<button type="button" class="actionbtn" id="caliph-war-confirm">⚔ ' +
      esc(FB.T('Declare the succession war')) + '</button>' +
      '<button type="button" class="actionbtn" id="caliph-war-cancel">' +
      esc(FB.T('Not yet')) + '</button></div>';
    openModal(FB.T('Contest the Caliphate?'), h);
    $('caliph-war-confirm').addEventListener('click', function () {
      const liveCause = FB.caliphateWarCause(s);
      if (!liveCause || !FB.startPlayerWar(s, liveCause)) {
        UI.toast(FB.T('The succession war can no longer be declared.'));
        UI.closeModal();
        UI.refresh();
        return;
      }
      UI.closeModal();
      UI.refresh();
    });
    $('caliph-war-cancel').addEventListener('click', UI.closeModal);
  };

  function greatHolyWarRealmName(s, rid) {
    if (!rid) return FB.T('Not chosen');
    if (rid === 'player') {
      return s.realms.player && s.realms.player.name
        ? s.realms.player.name : FB.fullName(s.chars[s.player.charId]);
    }
    return s.realms[rid] ? s.realms[rid].name : rid;
  }

  function greatHolyWarName(s, campaign) {
    const religion = campaign && FBDATA.religions[campaign.callingReligion];
    return religion
      ? dt(s, 'religion', campaign.callingReligion, religion,
        'head.greatHolyWar.name')
      : FB.T('Great holy war');
  }

  function greatHolyWarParticipantNames(s, campaign, camp) {
    const list = campaign.participants[camp] || [];
    return list.map(function (participant) {
      const name = participant.realm === 'player'
        ? FB.T('You') : greatHolyWarRealmName(s, participant.realm);
      return participant.mandatory
        ? FB.T('{realm} (bound to defend)', { realm:name }) : name;
    }).join(' · ') || FB.T('None');
  }

  function greatHolyWarRewardName(band) {
    if (band === 'kingdom') return FB.T('kingdom crown');
    if (band === 'duchy') return FB.T('complete duchy');
    if (band === 'county') return FB.T('county');
    if (band === 'sacred') return FB.T('sacred-site custody');
    if (band === 'honor') return FB.T('piety and prestige');
    return FB.T('no territorial claim');
  }

  function greatHolyWarDesireName(s, campaign, desire) {
    if (!desire || desire.kind === 'neutral') return FB.T('no particular prize');
    if (desire.kind === 'crown') return FB.T('the target crown');
    if (desire.kind === 'sacred') return FB.T('custody of the sacred places');
    if (desire.kind === 'honor') return FB.T('honor rather than land');
    if (desire.kind === 'duchy') {
      const duchy = FBDATA.duchies[desire.id];
      return FB.T('the Duchy of {name}', {
        name:duchy ? duchy.name : desire.id
      });
    }
    if (desire.kind === 'county') {
      const province = FB.world.byId[desire.id];
      return FB.T('the County of {name}', {
        name:province ? province.name : desire.id
      });
    }
    return desire.kind;
  }

  function greatHolyWarOccupationEvidence(s, campaign, desire) {
    if (!desire || desire.kind === 'neutral' || desire.kind === 'honor') {
      return FB.T('Your vow seeks no territorial evidence.');
    }
    let ids = [];
    if (desire.kind === 'county') ids = [desire.id];
    else if (desire.kind === 'duchy') {
      ids = FB.duchyCounties(desire.id).filter(function (pid) {
        return campaign.objectiveCounties.indexOf(pid) >= 0;
      });
    } else if (desire.kind === 'sacred') {
      ids = campaign.holyCounties.slice();
    } else {
      ids = campaign.objectiveCounties.slice();
    }
    let occupied = 0, personally = 0;
    for (const pid of ids) {
      const row = campaign.occupations[pid];
      if (row && row.occupied) occupied++;
      if (row && row.occupiedBy === 'player') personally++;
    }
    return FB.T('{occupied}/{total} relevant counties occupied; your host occupied {personal} of them.', {
      occupied:occupied, total:ids.length, personal:personally
    });
  }

  UI.showGreatHolyWarTargets = function () {
    const s = FB.state;
    if (!s || s.greatHolyWar) return;
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'The target freezes when the call is made. The banners gather for 180 days; a vacant religious head or an invalid target collapses the call.')) +
      '</p></div><div class="gm-list">';
    let count = 0;
    for (const religionId in FBDATA.religions) {
      const religion = FBDATA.religions[religionId];
      const head = religion && religion.head && religion.head.greatHolyWar &&
        FB.religiousHeadOf(s, religionId);
      const playerCatholicPope = religionId === 'catholic' &&
        FB.playerPope && FB.playerPope(s);
      if (((!head || head.id !== 'player') && !playerCatholicPope) ||
          !FB.canCallGreatHolyWar(s, religionId, null, 'player')) continue;
      const targets = FB.greatHolyWarTargets(s, religionId);
      const campaignName = dt(s, 'religion', religionId, religion,
        'head.greatHolyWar.name');
      for (const target of targets) {
        const kingdom = FBDATA.kingdoms[target.kingdomId];
        const holyNames = target.holyCounties.map(function (pid) {
          return FB.world.byId[pid] ? FB.world.byId[pid].name : pid;
        });
        h += '<button class="actionbtn" data-ghw-religion="' + esc(religionId) +
          '" data-ghw-kingdom="' + esc(target.kingdomId) + '">📯 ' +
          esc(FB.T('{campaign} for {kingdom}', {
            campaign:campaignName,
            kingdom:kingdom ? kingdom.name : target.kingdomId
          })) + '<span class="adesc">' + esc(FB.T(
            '{counties} objective counties{holy}', {
              counties:target.objectiveCounties.length,
              holy:holyNames.length
                ? FB.T(' · mandatory holy places: {places}', {
                  places:holyNames.join(', ')
                }) : ''
            })) + '</span></button>';
        count++;
      }
    }
    if (!count) h += '<div class="progressnote">' +
      esc(FB.T('No lost kingdom is currently eligible.')) + '</div>';
    h += '</div><button class="btn" id="gm-cancel">' +
      esc(FB.T('Not now')) + '</button>';
    openModal(FB.T('Call great holy war'), h);
    document.querySelectorAll('[data-ghw-kingdom]').forEach(function (button) {
      button.addEventListener('click', function () {
        FB.callGreatHolyWar(FB.state, button.dataset.ghwReligion,
          button.dataset.ghwKingdom, 'player');
        UI.closeModal();
        UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  UI.showGreatHolyWarJoin = function () {
    const s = FB.state, campaign = s && s.greatHolyWar;
    const camp = campaign && FB.playerGreatHolyWarJoinCamp(s);
    if (!campaign || campaign.phase !== 'preparation' || !camp) return;
    const sovereign = FB.isPlayerSovereign(s);
    const service = sovereign
      ? FB.T('You will command your realm’s host.')
      : FB.T('You will serve through your liege’s army or a personal expedition.');
    const side = camp === 'attackers' ? FB.T('attacking') : FB.T('defending');
    const draft = {
      seasons:4,
      desire:{ kind:camp === 'attackers' ? 'crown' : 'honor', id:null },
      beneficiary:null
    };

    function title() {
      return FB.T('Answer the {campaign}', {
        campaign:greatHolyWarName(s, campaign)
      });
    }

    function showService() {
      let h = '<div class="gm-body-text"><p>' + esc(FB.T(
        'Take a vow for the {side} camp of the {campaign}. {service}', {
          side:side, campaign:greatHolyWarName(s, campaign), service:service
        })) + '</p><p>' + esc(FB.T(
        'Promise one, two, or three years of seasonal service. If the campaign ends earlier, remaining continuously enrolled through its resolution keeps the vow.')) +
        '</p></div><div class="gm-list">';
      const terms = [
        { seasons:4, label:FB.T('One year · 4 seasons') },
        { seasons:8, label:FB.T('Two years · 8 seasons') },
        { seasons:12, label:FB.T('Three years · 12 seasons') }
      ];
      for (const term of terms) {
        h += '<button class="actionbtn" data-ghw-seasons="' + term.seasons +
          '">📯 ' + esc(term.label) + '</button>';
      }
      h += '<button class="actionbtn" id="ghw-join-cancel">' +
        esc(FB.T('Not now')) + '</button></div>';
      openModal(title(), h);
      document.querySelectorAll('[data-ghw-seasons]').forEach(function (button) {
        button.addEventListener('click', function () {
          draft.seasons = parseInt(button.dataset.ghwSeasons, 10);
          showDesire();
        });
      });
      $('ghw-join-cancel').addEventListener('click', UI.closeModal);
    }

    function showDesire() {
      let h = '<div class="gm-body-text"><p>' + esc(FB.T(
        'Name what this service is meant to secure. A precise vow strengthens that claim and weakens unrelated claims.')) +
        '</p></div><div class="gm-list">';
      const desires = camp === 'attackers' ? [
        { kind:'crown', label:FB.T('The target crown') },
        { kind:'sacred', label:FB.T('Custody of the sacred places') },
        { kind:'duchy', label:FB.T('An exact objective duchy…') },
        { kind:'county', label:FB.T('An exact objective county…') },
        { kind:'honor', label:FB.T('Honor rather than land') }
      ] : [
        { kind:'honor', label:FB.T('Defend the faith for honor') }
      ];
      for (const desire of desires) {
        h += '<button class="actionbtn" data-ghw-desire="' +
          esc(desire.kind) + '">' + esc(desire.label) + '</button>';
      }
      h += '<button class="actionbtn" id="ghw-join-back">' +
        esc(FB.T('Back')) + '</button></div>';
      openModal(title(), h);
      document.querySelectorAll('[data-ghw-desire]').forEach(function (button) {
        button.addEventListener('click', function () {
          draft.desire = { kind:button.dataset.ghwDesire, id:null };
          draft.beneficiary = null;
          if (draft.desire.kind === 'duchy' ||
              draft.desire.kind === 'county') showLandTarget();
          else showReview();
        });
      });
      $('ghw-join-back').addEventListener('click', showService);
    }

    function showLandTarget() {
      const targets = FB.greatHolyWarDesireTargets(s, draft.desire.kind);
      let h = '<div class="gm-body-text"><p>' + esc(FB.T(
        'Choose the exact land named in the vow.')) +
        '</p></div><div class="gm-list">';
      for (const target of targets) {
        h += '<button class="actionbtn" data-ghw-vow-target="' +
          esc(target.id) + '">' + esc(target.name) + '</button>';
      }
      h += '<button class="actionbtn" id="ghw-target-back">' +
        esc(FB.T('Back')) + '</button></div>';
      openModal(title(), h);
      document.querySelectorAll('[data-ghw-vow-target]').forEach(function (button) {
        button.addEventListener('click', function () {
          draft.desire.id = button.dataset.ghwVowTarget;
          showBeneficiary();
        });
      });
      $('ghw-target-back').addEventListener('click', showDesire);
    }

    function showBeneficiary() {
      const candidates = FB.greatHolyWarVowBeneficiaries(s);
      let h = '<div class="gm-body-text"><p>' + esc(FB.T(
        'You may name one living adult close relative to rule a won duchy or county. If they die or take another throne before settlement, the grant returns to you.')) +
        '</p></div><div class="gm-list">' +
        '<button class="actionbtn" data-ghw-beneficiary="">' +
        esc(FB.T('Claim it for yourself')) + '</button>';
      for (const row of candidates) {
        h += '<button class="actionbtn" data-ghw-beneficiary="' +
          esc(row.c.id) + '">' + esc(FB.T('{name} · {relation}', {
            name:FB.fullName(row.c), relation:FB.T(row.rel)
          })) + '</button>';
      }
      h += '<button class="actionbtn" id="ghw-beneficiary-back">' +
        esc(FB.T('Back')) + '</button></div>';
      openModal(title(), h);
      document.querySelectorAll('[data-ghw-beneficiary]').forEach(function (button) {
        button.addEventListener('click', function () {
          draft.beneficiary = button.dataset.ghwBeneficiary || null;
          showReview();
        });
      });
      $('ghw-beneficiary-back').addEventListener('click', showLandTarget);
    }

    function showReview() {
      const beneficiary = draft.beneficiary && s.chars[draft.beneficiary];
      const vowSummary = beneficiary
        ? FB.T(
          'You promise {seasons} seasons of service and seek {desire}. If land is won, {name} will receive it.', {
            seasons:draft.seasons,
            desire:greatHolyWarDesireName(s, campaign, draft.desire),
            name:FB.fullName(beneficiary)
          })
        : FB.T('You promise {seasons} seasons of service and seek {desire}.', {
          seasons:draft.seasons,
          desire:greatHolyWarDesireName(s, campaign, draft.desire)
        });
      let h = '<div class="gm-body-text"><p>' + esc(vowSummary) +
        '</p><p>' + esc(FB.T(
        'Withdrawal costs piety and prestige. Breaking an unfinished vow increases the cost, and active campaign effects determine the final amount.')) +
        '</p></div><div class="gm-list">' +
        '<button class="actionbtn" id="ghw-join-confirm">📯 ' +
        esc(FB.T('Take this vow')) + '</button>' +
        '<button class="actionbtn" id="ghw-review-back">' +
        esc(FB.T('Back')) + '</button></div>';
      openModal(title(), h);
      $('ghw-join-confirm').addEventListener('click', function () {
        FB.joinGreatHolyWar(s, camp, 'player', draft);
        UI.closeModal();
        UI.refresh();
      });
      $('ghw-review-back').addEventListener('click', function () {
        if (draft.desire.kind === 'duchy' || draft.desire.kind === 'county') {
          showBeneficiary();
        } else {
          showDesire();
        }
      });
    }

    showService();
  };

  UI.showGreatHolyWarPanel = function () {
    const s = FB.state, campaign = s && s.greatHolyWar;
    if (!campaign) return;
    const kingdom = FBDATA.kingdoms[campaign.targetKingdom];
    const pledge = s.player.greatHolyWar &&
      s.player.greatHolyWar.campaignId === campaign.id
      ? s.player.greatHolyWar : null;
    let timing;
    if (campaign.phase === 'preparation') {
      const launch = FB.dateAtTurn(s, campaign.launchTurn);
      timing = FB.T('{days} days remain · launches {season} {day}, {year}', {
        days:Math.max(0, campaign.launchTurn - s.turn),
        season:FB.seasonName(launch.season), day:launch.day, year:launch.year
      });
    } else if (campaign.phase === 'active') {
      const deadline = FB.dateAtTurn(s, campaign.deadlineTurn);
      timing = FB.T('{days} days remain · deadline {season} {day}, {year}', {
        days:Math.max(0, campaign.deadlineTurn - s.turn),
        season:FB.seasonName(deadline.season), day:deadline.day, year:deadline.year
      });
    } else {
      timing = FB.T('The settlement council awaits a decision.');
    }
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      '{campaign} for {kingdom} · {phase}', {
        campaign:greatHolyWarName(s, campaign),
        kingdom:kingdom ? kingdom.name : campaign.targetKingdom,
        phase:campaign.phase === 'preparation' ? FB.T('preparation')
          : campaign.phase === 'active' ? FB.T('active campaign') : FB.T('settlement')
      })) + '</p></div>';
    h += kv('Caller', esc(greatHolyWarRealmName(s, campaign.callerRealm)));
    h += kv('Military leader', esc(greatHolyWarRealmName(s, campaign.leaderRealm)));
    h += kv('Schedule', esc(timing));
    h += kv('Coalition resolve', esc(String(campaign.resolve)));
    h += kv('Attacking strength', '~' +
      esc(menText(s, FB.greatHolyWarStrength(s, 'attackers'))));
    h += kv('Defending strength', '~' +
      esc(menText(s, FB.greatHolyWarStrength(s, 'defenders'))));
    h += '<div class="cmeta"><b>' + esc(FB.T('Attackers')) + ':</b> ' +
      esc(greatHolyWarParticipantNames(s, campaign, 'attackers')) + '</div>';
    h += '<div class="cmeta"><b>' + esc(FB.T('Defenders')) + ':</b> ' +
      esc(greatHolyWarParticipantNames(s, campaign, 'defenders')) + '</div>';
    h += panelh('Objectives');
    let occupied = 0, occupiedDev = 0, totalDev = 0;
    for (const pid of campaign.objectiveCounties) {
      const province = FB.world.byId[pid];
      const occupation = campaign.occupations[pid] || {};
      const requirement = FB.greatHolyWarSiegeRequirement(s, pid);
      const percent = Math.round(FB.clamp((occupation.progress || 0) /
        Math.max(1, requirement), 0, 1) * 100);
      const holy = campaign.holyCounties.indexOf(pid) >= 0;
      const dev = s.dev[pid] || 1;
      totalDev += dev;
      if (occupation.occupied) { occupied++; occupiedDev += dev; }
      h += '<div class="kv"><span>' + (holy ? '✦ ' : '') +
        esc(province ? province.name : pid) + '</span><b>' +
        esc(occupation.occupied ? FB.T('occupied')
          : occupation.progress
            ? FB.T('{percent}% {camp} siege', {
              percent:percent,
              camp:occupation.progressCamp === 'defenders'
                ? FB.T('defender') : FB.T('attacker')
            })
            : FB.T('open')) + '</b></div>';
    }
    h += '<div class="progressnote">' + esc(FB.T(
      '{occupied}/{total} counties occupied · {development}/{totalDevelopment} objective development · attackers need every lost holy county, half the counties, and 60% of development.', {
        occupied:occupied, total:campaign.objectiveCounties.length,
        development:occupiedDev, totalDevelopment:totalDev
      })) + '</div>';
    if (pledge) {
      h += panelh('Your service');
      h += kv('Camp', esc(pledge.camp === 'attackers'
        ? FB.T('Attackers') : FB.T('Defenders')));
      const vow = pledge.vowTerms;
      if (vow) {
        h += kv('Promised service', esc(vow.mustered
          ? FB.T('{served}/{seasons} seasons · mustered', {
            served:vow.served || 0, seasons:vow.seasons
          })
          : FB.T('{served}/{seasons} seasons · not yet mustered', {
            served:vow.served || 0, seasons:vow.seasons
          })));
        h += kv('Desire',
          esc(greatHolyWarDesireName(s, campaign, vow.desire)));
        h += kv('Occupation evidence',
          esc(greatHolyWarOccupationEvidence(s, campaign, vow.desire)));
      }
      h += kv('Contribution', esc(String(Math.round(
        (campaign.contribution.player || 0) * 10) / 10)));
      h += kv('Share', esc(String(Math.round(
        FB.greatHolyWarPlayerShare(s) * 1000) / 10)) + '%');
      const projection = FB.greatHolyWarPlayerClaimProjection(s);
      h += kv('Projected claim standing', projection
        ? esc(FB.T('{award} · {weight} weighted claim', {
          award:greatHolyWarRewardName(projection.kind === 'crown'
            ? (projection.rank >= 3 ? 'kingdom' :
              projection.rank === 2 ? 'duchy' : 'county')
            : projection.kind),
          weight:(Math.round(projection.weight * 1000) / 1000).toFixed(3)
        }))
        : esc(FB.T('No current territorial claim')));
      const campaignModifiers = FB.campaignModifierRecords
        ? FB.campaignModifierRecords(s) : [];
      if (campaignModifiers.length) {
        h += '<div class="modifier-list">' +
          modifierChips(s, campaignModifiers, 'campaign', null) + '</div>';
      }
      if (pledge.renewalRequired) {
        h += '<div class="progressnote warnote">' +
          esc(FB.T('Your inherited vow must be renewed before service and land eligibility resume.')) +
          '</div>';
      }
    }
    h += '<div class="gm-footer"><button class="btn primary" id="ghw-panel-close">' +
      esc(FB.T('Close')) + '</button></div>';
    openModal(greatHolyWarName(s, campaign), h, { modalClass:'fullsheet-modal' });
    $('ghw-panel-close').addEventListener('click', UI.closeModal);
  };

  UI.showGreatHolyWarWithdraw = function () {
    const s = FB.state, campaign = s && s.greatHolyWar;
    const pledge = s && s.player.greatHolyWar;
    if (!campaign || !pledge || pledge.withdrawn) return;
    const cost = FB.greatHolyWarWithdrawalCost
      ? FB.greatHolyWarWithdrawalCost(s)
      : { piety:100, prestige:50, inherited:!!pledge.renewalRequired, broken:false };
    const h = '<div class="gm-body-text"><p>' + esc(cost.inherited
      ? FB.T('Decline the inherited vow without a personal piety or prestige penalty. The dynasty’s contribution remains in the record, but it cannot claim land.')
      : cost.broken
        ? FB.T('Your promised term is not fulfilled. Withdrawal costs {piety} piety and {prestige} prestige and records a broken vow.', {
          piety:cost.piety, prestige:cost.prestige
        })
        : FB.T('Your promised term is fulfilled. Withdrawal costs {piety} piety and {prestige} prestige without recording a broken vow.', {
          piety:cost.piety, prestige:cost.prestige
        })) +
      '</p></div><div class="gm-list">' +
      '<button class="actionbtn danger" id="ghw-withdraw-confirm">🏳 ' +
      esc(FB.T('Withdraw from the campaign')) + '</button>' +
      '<button class="actionbtn" id="ghw-withdraw-cancel">' +
      esc(FB.T('Keep the vow')) + '</button></div>';
    openModal(FB.T('Withdraw from the {campaign}?', {
      campaign:greatHolyWarName(s, campaign)
    }), h, { noFocus:true });
    $('ghw-withdraw-confirm').addEventListener('click', function () {
      FB.withdrawGreatHolyWar(s);
      UI.closeModal();
      UI.refresh();
    });
    $('ghw-withdraw-cancel').addEventListener('click', UI.closeModal);
  };

  UI.showGreatHolyWarRenewal = function () {
    const s = FB.state, campaign = s && s.greatHolyWar;
    const pledge = s && s.player.greatHolyWar;
    if (!campaign || !pledge || !pledge.renewalRequired) return;
    const h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Your predecessor’s vow and contribution pass to you. Renew it to remain eligible for land, or decline it without the ordinary withdrawal penalty.')) +
      '</p></div><div class="gm-list">' +
      '<button class="actionbtn" id="ghw-renew-confirm">📯 ' +
      esc(FB.T('Renew the vow')) + '</button>' +
      '<button class="actionbtn" id="ghw-renew-decline">🏳 ' +
      esc(FB.T('Decline the inherited vow')) + '</button></div>';
    openModal(FB.T('An inherited campaign vow'), h, { noFocus:true });
    $('ghw-renew-confirm').addEventListener('click', function () {
      FB.renewGreatHolyWarVow(s);
      UI.closeModal();
      UI.refresh();
    });
    $('ghw-renew-decline').addEventListener('click', function () {
      FB.withdrawGreatHolyWar(s);
      UI.closeModal();
      UI.refresh();
    });
  };

  function greatHolyWarCouncilAssetName(s, asset) {
    if (!asset) return FB.T('Unknown award');
    if (asset.kind === 'crown') {
      return asset.rank >= 3 ? FB.T('Sovereign crown')
        : asset.rank === 2 ? FB.T('Sovereign duchy')
          : FB.T('Sovereign county');
    }
    if (asset.kind === 'sacred') {
      const sites = (asset.siteIds || asset.ids || []).map(function (pid) {
        return FB.world.byId[pid] ? FB.world.byId[pid].name : pid;
      });
      return FB.T('Sacred custody · {sites}', { sites:sites.join(', ') });
    }
    if (asset.kind === 'duchy') {
      const duchy = FBDATA.duchies[asset.titleId];
      return FB.T('Duchy of {name}', {
        name:duchy ? duchy.name : asset.titleId
      });
    }
    const province = FB.world.byId[asset.titleId || asset.ids[0]];
    return FB.T('County of {name}', {
      name:province ? province.name : (asset.titleId || asset.ids[0])
    });
  }

  function greatHolyWarCouncilClaimantName(s, settlementCase, claimant) {
    if (claimant === 'player') return FB.T('You');
    if (claimant && claimant.indexOf('local:') === 0) {
      for (const claim of settlementCase.claims) {
        if (claim.claimant === claimant && claim.sourceRealm) {
          return FB.T('A local cadet of {realm}', {
            realm:greatHolyWarRealmName(s, claim.sourceRealm)
          });
        }
      }
      return FB.T('A local cadet');
    }
    return greatHolyWarRealmName(s, claimant);
  }

  function greatHolyWarBasisText(basis) {
    basis = basis || {};
    function score(value) {
      return String(Math.round((value || 0) * 100)) + '%';
    }
    return FB.T(
      'Contribution {contribution} · vow {vow} · occupation {occupation} · right {right} · support {support} · office {office}', {
        contribution:score(basis.contribution),
        vow:score(basis.vow),
        occupation:score(basis.occupation),
        right:score(basis.right),
        support:score(basis.support),
        office:score(basis.office)
      });
  }

  function greatHolyWarAwardList(s, settlementCase) {
    if (!settlementCase.awards.length) {
      return '<div class="progressnote">' +
        esc(FB.T('No awards have yet been settled.')) + '</div>';
    }
    let h = '';
    for (const award of settlementCase.awards) {
      let asset = null;
      for (const candidate of settlementCase.assets) {
        if (candidate.id === award.asset) {
          asset = candidate;
          break;
        }
      }
      const claimant = greatHolyWarCouncilClaimantName(
        s, settlementCase, award.claimant);
      const beneficiary = award.beneficiary && s.chars[award.beneficiary]
        ? FB.fullName(s.chars[award.beneficiary]) : null;
      let awardText = beneficiary
        ? FB.T('{beneficiary} · sponsored by {claimant}', {
          claimant:claimant, beneficiary:beneficiary
        })
        : claimant;
      if (award.terms && award.terms.kind === 'vassal') {
        const realm = greatHolyWarRealmName(s, award.terms.liege);
        awardText = beneficiary
          ? FB.T('{beneficiary} · sponsored by {claimant} · as vassal of {realm}', {
            claimant:claimant, beneficiary:beneficiary, realm:realm
          })
          : FB.T('{claimant} · as vassal of {realm}', {
            claimant:claimant, realm:realm
          });
      } else if (award.terms && award.terms.kind === 'payment') {
        awardText = beneficiary
          ? FB.T('{beneficiary} · sponsored by {claimant} · with a {money:gold} settlement payment', {
            claimant:claimant,
            beneficiary:beneficiary,
            gold:award.terms.gold
          })
          : FB.T('{claimant} · with a {money:gold} settlement payment', {
            claimant:claimant, gold:award.terms.gold
          });
      }
      h += '<div class="kv"><span>' +
        esc(greatHolyWarCouncilAssetName(s, asset)) + '</span><b>' +
        esc(awardText) +
        '</b></div>';
    }
    return h;
  }

  UI.showGreatHolyWarSettlementSummary = function (settlementCase) {
    if (!settlementCase) return;
    const s = FB.state;
    const h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'The council has concluded and every award now takes effect.')) +
      '</p></div>' + panelh('Final settlement') +
      greatHolyWarAwardList(s, settlementCase) +
      '<div class="gm-footer"><button class="btn primary" id="ghw-summary-close">' +
      esc(FB.T('Close')) + '</button></div>';
    openModal(FB.T('The settlement concluded'), h, {
      modalClass:'fullsheet-modal'
    });
    $('ghw-summary-close').addEventListener('click', UI.closeModal);
  };

  function showGreatHolyWarCouncil(s, campaign, settlement) {
    const settlementCase = settlement.case;
    const pending = settlement.pendingPlayer;
    if (settlementCase.status === 'resolved' && pending) {
      const counties = pending.counties.map(function (pid) {
        return FB.world.byId[pid] ? FB.world.byId[pid].name : pid;
      });
      let consequence;
      if (pending.sovereign && pending.rank >= 3) {
        consequence = FB.T(
          'Accepting makes you sovereign of the new kingdom and unites it with your existing lands.');
      } else if (FB.isPlayerSovereign(s)) {
        consequence = FB.T(
          'Accepting attaches this foreign grant to your existing sovereign realm.');
      } else if (s.player.provs && s.player.provs.length) {
        consequence = FB.T(
          'Accepting returns your old demesne and title to its liege, then relocates your playable household to the new grant.');
      } else {
        consequence = FB.T(
          'Accepting founds a new playable landed realm for your household.');
      }
      const h = '<div class="gm-body-text"><p>' + esc(FB.T(
        'The council offers you a {award}: {counties}. {consequence}', {
          award:greatHolyWarRewardName(pending.kind),
          counties:counties.join(', '),
          consequence:consequence
        })) + '</p><p>' + esc(FB.T(
        'Declining grants the land to a generated cadet ruler and converts your service into piety and prestige.')) +
        '</p></div>' + panelh('Final settlement') +
        greatHolyWarAwardList(s, settlementCase) +
        '<div class="gm-list">' +
        '<button class="actionbtn" id="ghw-settlement-accept">👑 ' +
        esc(FB.T('Accept the territorial grant')) + '</button>' +
        '<button class="actionbtn" id="ghw-settlement-decline">🕊 ' +
        esc(FB.T('Decline for honor')) + '</button></div>';
      openModal(FB.T('The council’s final settlement'), h, {
        dismissable:false, noFocus:true, modalClass:'fullsheet-modal'
      });
      $('ghw-settlement-accept').addEventListener('click', function () {
        FB.greatHolyWarSettlementChoice(s, true);
        UI.showGreatHolyWarSettlementSummary(settlementCase);
        UI.refresh();
      });
      $('ghw-settlement-decline').addEventListener('click', function () {
        FB.greatHolyWarSettlementChoice(s, false);
        UI.showGreatHolyWarSettlementSummary(settlementCase);
        UI.refresh();
      });
      return;
    }

    const view = FB.settlement.current(settlementCase);
    if (!view) return;
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Resolve each asset in order. Claims combine service, vows, occupation, rights, local support, and religious standing. Land winners may receive only one territorial award.')) +
      '</p></div>';
    h += kv('Current asset',
      esc(greatHolyWarCouncilAssetName(s, view.asset)));
    h += kv('Council standing',
      esc(FB.T('{points}/2 points', { points:settlementCase.standing })));
    const currentHead = FB.religiousHeadOf(
      s, campaign.callingReligion);
    h += kv('Blessing', esc(settlementCase.blessed
      ? FB.T('Used for {claimant}', {
        claimant:greatHolyWarCouncilClaimantName(
          s, settlementCase, settlementCase.blessed.claimant)
      }) : !currentHead
        ? FB.T('Vacant office') : settlementCase.playerHead
          ? FB.T('Available') : FB.T('Not yours to grant')));
    h += kv('Next-claim boost', esc(settlementCase.nextClaimBoost
      ? FB.T('+{amount} waiting for your next eligible claim', {
        amount:settlementCase.nextClaimBoost.toFixed(2)
      }) : FB.T('None')));
    h += panelh('Ordered claims');
    if (!view.claims.length) {
      h += '<div class="progressnote">' +
        esc(FB.T('No eligible claimant remains for this asset.')) + '</div>';
    }
    for (let i = 0; i < view.claims.length; i++) {
      const claim = view.claims[i];
      const tags = [];
      if (i === 0) tags.push(FB.T('leader'));
      if (claim.confirmation) tags.push(FB.T('local confirmation'));
      if (claim.localCadet) tags.push(FB.T('local cadet'));
      if (claim.blessing) tags.push(FB.T('blessed +0.10'));
      if (claim.nextClaimBoost) tags.push(FB.T('endorsement +0.10'));
      h += '<div class="settblock council-claim"><span>' +
        esc(greatHolyWarCouncilClaimantName(
          s, settlementCase, claim.claimant)) + '</span><b>' +
        esc(claim.effectiveWeight.toFixed(3) +
          (tags.length ? ' · ' + tags.join(', ') : '')) +
        '</b><small>' + esc(greatHolyWarBasisText(claim.basis)) +
        '</small></div>';
    }
    h += panelh('Your moves') + '<div class="gm-list">';
    h += '<button class="actionbtn" data-ghw-council-move="acquiesce">' +
      esc(view.leader ? FB.T('Acquiesce · award {claimant}', {
        claimant:greatHolyWarCouncilClaimantName(
          s, settlementCase, view.leader.claimant)
      }) : FB.T('Acquiesce · leave this asset unawarded')) + '</button>';
    if (view.playerClaim && view.leader && view.leader.claimant !== 'player') {
      h += '<button class="actionbtn" data-ghw-council-move="press">' +
        esc(FB.T('Press your claim · {odds}% chance', {
          odds:Math.round(view.pressChance * 100)
        })) + '</button>';
    }
    for (const rival of view.claims) {
      if (rival.claimant === 'player') continue;
      h += '<button class="actionbtn" data-ghw-council-move="endorse" ' +
        'data-ghw-council-claimant="' + esc(rival.claimant) + '">' +
        esc(FB.T('Endorse {claimant} · +15 Standing, +0.10 next claim', {
          claimant:greatHolyWarCouncilClaimantName(
            s, settlementCase, rival.claimant)
        })) + '</button>';
    }
    if (view.terms) {
      const disabled = view.terms.kind === 'payment' &&
        s.player.gold < view.terms.gold;
      const termsText = view.terms.kind === 'vassal'
        ? FB.T('Offer terms · take it as vassal of {realm}', {
          realm:greatHolyWarRealmName(s, view.terms.liege)
        })
        : FB.T('Offer terms · guarantee it for {money:gold}', {
          gold:view.terms.gold
        });
      h += '<button class="actionbtn" data-ghw-council-move="terms"' +
        (disabled ? ' disabled' : '') + '>' + esc(termsText) + '</button>';
    }
    if (view.objectChance !== null && settlementCase.standing > 0) {
      h += '<button class="actionbtn" data-ghw-council-move="object">' +
        esc(FB.T('Object · spend 1 settlement standing · {odds}% chance for the runner-up · {leader} loses 10 Standing', {
          odds:Math.round(view.objectChance * 100),
          leader:greatHolyWarCouncilClaimantName(
            s, settlementCase, view.leader.claimant)
        })) + '</button>';
    }
    if (settlementCase.playerHead && !settlementCase.blessingUsed) {
      for (const blessClaim of view.claims) {
        if (blessClaim.claimant === 'player') continue;
        h += '<button class="actionbtn" data-ghw-council-move="bless" ' +
          'data-ghw-council-claimant="' + esc(blessClaim.claimant) + '">' +
          esc(FB.T('Bless {claimant} · +0.10 to this claim', {
            claimant:greatHolyWarCouncilClaimantName(
              s, settlementCase, blessClaim.claimant)
          })) + '</button>';
      }
    }
    h += '</div>' + panelh('Prior awards') +
      greatHolyWarAwardList(s, settlementCase);
    openModal(FB.T('Settlement council · {asset}', {
      asset:greatHolyWarCouncilAssetName(s, view.asset)
    }), h, { dismissable:false, noFocus:true, modalClass:'fullsheet-modal' });
    document.querySelectorAll('[data-ghw-council-move]').forEach(function (button) {
      button.addEventListener('click', function () {
        const move = {
          kind:button.dataset.ghwCouncilMove,
          claimant:button.dataset.ghwCouncilClaimant || null
        };
        FB.greatHolyWarSettlementMove(s, move);
        if (s.greatHolyWar) UI.showGreatHolyWarSettlement();
        else UI.showGreatHolyWarSettlementSummary(settlementCase);
        UI.refresh();
      });
    });
  }

  UI.showGreatHolyWarSettlement = function () {
    const s = FB.state, campaign = s && s.greatHolyWar;
    const settlement = campaign && campaign.settlement;
    const award = settlement && settlement.pendingPlayer;
    if (!campaign || campaign.phase !== 'settlement' || !settlement) return;
    if (settlement.case) {
      showGreatHolyWarCouncil(s, campaign, settlement);
      return;
    }
    if (!award) return;
    const counties = award.counties.map(function (pid) {
      return FB.world.byId[pid] ? FB.world.byId[pid].name : pid;
    });
    let consequence;
    if (award.sovereign && award.rank >= 3) {
      consequence = FB.T(
        'Accepting makes you sovereign of the new kingdom and unites it with your existing lands.');
    } else if (FB.isPlayerSovereign(s)) {
      consequence = FB.T(
        'Accepting attaches this foreign grant to your existing sovereign realm.');
    } else if (s.player.provs && s.player.provs.length) {
      consequence = FB.T(
        'Accepting returns your old demesne and title to its liege, then relocates your playable household to the new grant.');
    } else {
      consequence = FB.T(
        'Accepting founds a new playable landed realm for your household.');
    }
    const h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Your contribution earns a {award}: {counties}. {consequence}', {
        award:greatHolyWarRewardName(award.kind),
        counties:counties.join(', '),
        consequence:consequence
      })) + '</p><p>' + esc(FB.T(
      'Declining grants the land to a generated cadet ruler and converts your share into piety and prestige.')) +
      '</p></div><div class="gm-list">' +
      '<button class="actionbtn" id="ghw-settlement-accept">👑 ' +
      esc(FB.T('Accept the territorial grant')) + '</button>' +
      '<button class="actionbtn" id="ghw-settlement-decline">🕊 ' +
      esc(FB.T('Decline for honor')) + '</button></div>';
    openModal(FB.T('The campaign’s partition'), h, {
      dismissable:false, noFocus:true
    });
    $('ghw-settlement-accept').addEventListener('click', function () {
      FB.greatHolyWarSettlementChoice(s, true);
      UI.closeModal();
      UI.refresh();
    });
    $('ghw-settlement-decline').addEventListener('click', function () {
      FB.greatHolyWarSettlementChoice(s, false);
      UI.closeModal();
      UI.refresh();
    });
  };

  /* ================= war target picker ================= */
  UI.showWarTargets = function () {
    const s = FB.state;
    const causes = FB.warCauses(s);
    const musterUpkeep = FB.playerMusterUpkeepParts
      ? FB.playerMusterUpkeepParts(s) : { total:0 };
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'A war needs a lawful cause. Land is taken only by siege: march your host onto the named prize and press the siege at three war councils. Field victories bring the enemy to the table, nothing more.')) +
      '</p><p class="hint">' + esc(FB.T(
        'Your normal muster would cost about {money:amount} in logistics each season. Great levies, mercenaries, allied reinforcements, and casualties change the live bill.', {
          amount:financeAmount(musterUpkeep.total)
        })) + '</p></div><div class="gm-list">';
    for (let ci = 0; ci < causes.length; ci++) {
      const cause = causes[ci];
      const pid = cause.target;
      const pr = FB.world.byId[pid];
      const rid = cause.enemy || s.owner[pid];
      const realm = s.realms[rid];
      const enMen = FB.realmDefensiveStrength(s, rid);
      let causeText = '';
      if (cause.type === 'fabricated') causeText = FB.T('Fabricated county claim');
      else if (cause.type === 'restoration') {
        causeText = FB.T('Restore the crown of {title}', { title: cause.titleName || (realm ? realm.name : '') });
      } else if (cause.type === 'caliphate') {
        causeText = FB.T('Succession war for the office of {title}', {
          title: FB.religiousHeadTitle(s, 'sunni')
        });
      } else {
        const def = cause.titleKind === 'duchy' ? FBDATA.duchies[cause.titleId]
          : cause.titleKind === 'kingdom' ? FBDATA.kingdoms[cause.titleId]
          : FBDATA.empires[cause.titleId];
        causeText = FB.T('De jure right through {title}', { title: def ? def.name : cause.titleId });
      }
      const support = FB.alliedReinforcement(s, rid);
      h += '<button class="actionbtn" data-war-cause="' + ci + '">⚔ ' + esc(pr.name) +
        '<span class="adesc">' + esc(FB.T(
          '{cause} · held by {realm} ({counties}) · defense ~{theirs} against your ~{yours}{support}', {
            cause: causeText,
            realm: realm ? realm.name : '?',
            counties: countyCountText(s, FB.realmProvinces(s, rid).length),
            theirs: menText(s, enMen),
            yours: menText(s, FB.playerLevy(s)),
            support: support.men && s.realms[support.ally]
              ? FB.T(' (including ~{men} from {ally})', {
                men: menText(s, support.men), ally: s.realms[support.ally].name
              }) : ''
          })) + '</span>' + (cause.sacrilegious
            ? '<span class="adesc warnote">' + esc(FB.T(
              '⛓ Sacrilege — attacking the active Papacy brings excommunication, forfeits all piety, and turns every Catholic ruler against you.')) + '</span>'
            : '') + '</button>';
    }
    h += '</div><button class="btn" id="gm-cancel">Think better of it</button>';
    openModal('Choose Your Conquest', h);
    document.querySelectorAll('[data-war-cause]').forEach(function (b) {
      b.addEventListener('click', function () {
        const cause = causes[Number(b.dataset.warCause)];
        if (cause.sacrilegious) {
          UI.showSacrilegiousWarConfirmation(cause);
        } else {
          FB.startPlayerWar(FB.state, cause);
          UI.closeModal();
          UI.refresh();
        }
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  /* Same cause, second confirmation: no state changes until the player
     explicitly accepts the religious penalties here. */
  UI.showSacrilegiousWarConfirmation = function (cause) {
    const s = FB.state;
    const B = FBDATA.balance;
    const realm = cause && s.realms[cause.enemy];
    if (!cause || !cause.sacrilegious || !realm) return;
    const opinion = Math.abs(B.religiousHeadWarOpinion !== undefined
      ? B.religiousHeadWarOpinion : -40);
    const h = '<div class="gm-body-text"><p class="warnote"><b>' + esc(FB.T(
      'This conquest is sacrilege.')) + '</b></p><p>' + esc(FB.T(
      'Declaring war on {realm} reduces your piety to zero, gives you −{standing} Standing with every living Catholic ruler, and excommunicates the current ruler.', {
        realm:realm.name, standing:opinion
      })) + '</p><p>' + esc(FB.T(
      'Canceling here changes nothing. After peace, an active Pope may grant costly absolution.')) +
      '</p></div><div class="gm-list">' +
      '<button type="button" class="actionbtn" id="sacrilege-confirm">⚔ ' +
      esc(FB.T('Accept condemnation and declare war')) + '</button>' +
      '<button type="button" class="actionbtn" id="sacrilege-cancel">' +
      esc(FB.T('Think better of it')) + '</button></div>';
    openModal(FB.T('Attack the Papacy?'), h);
    $('sacrilege-confirm').addEventListener('click', function () {
      FB.startPlayerWar(s, cause, { confirmSacrilege:true });
      UI.closeModal();
      UI.refresh();
    });
    $('sacrilege-cancel').addEventListener('click', UI.closeModal);
  };

  /* Renounce the liege and fight for it: confirmed here, then handled by
     FB.doIndependence (a baron seizes his home county in the bargain). */
  UI.showIndependence = function () {
    const s = FB.state;
    const lg = s.realms[s.player.liege];
    const top = FB.topRealm(s, s.player.liege);
    const enMen = FB.aiBaseHost(s, top);
    const sovereign = s.realms[top] ? s.realms[top].name : FB.T('Your sovereign');
    const independenceText = s.player.tier === 3 && FB.world.byId[s.player.provinceId]
      ? FB.T('You renounce {liege} and raise your own banner over {province}, seized as your own county. {sovereign} will march to bring you to heel — they can field ~{theirs} against your ~{yours}.', {
        liege: lg ? lg.name : FB.T('your liege'),
        province: FB.world.byId[s.player.provinceId].name,
        sovereign: sovereign,
        theirs: menText(s, enMen), yours: menText(s, FB.playerLevy(s))
      })
      : FB.T('You renounce {liege} and raise your own banner over your lands. {sovereign} will march to bring you to heel — they can field ~{theirs} against your ~{yours}.', {
        liege: lg ? lg.name : FB.T('your liege'),
        sovereign: sovereign,
        theirs: menText(s, enMen), yours: menText(s, FB.playerLevy(s))
      });
    const h = '<div class="gm-body-text"><p>' + esc(independenceText) + '</p></div>' +
      '<button class="btn primary" id="gm-indep">Raise my banner</button> ' +
      '<button class="btn" id="gm-cancel">Stay sworn</button>';
    openModal('Declare Independence', h);
    $('gm-indep').addEventListener('click', function () {
      FB.doIndependence(FB.state);
      UI.closeModal(); UI.refresh();
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  /* ================= building picker =================
     The deed is a fast county ledger: choose a province when necessary, then
     Raise Next repeatedly without leaving the dialog. The Land-tab settlement
     path still passes idx for exact placement. */
  function buildingEffects(d, id) {
    const fx = [];
    if (d.tax) fx.push(FB.T(
      '+{money:amount} each season · shown in Money each season', {
        amount:d.tax
      }));
    if (d.piety) fx.push(FB.T('+{amount} piety each season', { amount: d.piety }));
    if (d.research) fx.push(FB.T('+{amount} national research each season', { amount: d.research }));
    if (d.levy) fx.push(FB.T('+{men} men to the levy', { men: d.levy }));
    if (d.retinue) fx.push(FB.T('+{men} men-at-arms', { men:d.retinue }));
    if (d.archers) fx.push(FB.T('+{men} archers', { men:d.archers }));
    if (d.dev) fx.push(FB.T('+{amount} development when raised', { amount: d.dev }));
    if (d.pop) fx.push(FB.T('+{amount} popular opinion when raised', { amount: d.pop }));
    if (d.prestige) fx.push(FB.T('+{amount} prestige when raised', { amount: d.prestige }));
    if (id === 'walls') fx.push(FB.T('+8% battle odds when defending the home county'));
    if (id === 'granary') fx.push(FB.T('Unlocks granary choices during famine'));
    return fx;
  }

  function buildingScope(s, pid, idx, id) {
    const settlements = FB.settlementsOf(s, pid);
    const province = FB.world.byId[pid];
    const place = settlements[idx] ? settlements[idx].name :
      (province ? province.name : pid);
    if (id === 'walls') {
      return FB.T('{place}; defense applies in the home county', {
        place:place
      });
    }
    return FB.T('{place}; standing benefits count across the demesne', {
      place:place
    });
  }

  function buildingTransferRule() {
    return FB.T('Belongs to the county and follows it through conquest');
  }

  function buildingExpiryRule() {
    return FB.T('Until demolished; permanent ruins keep the site occupied');
  }

  function buildingUnavailableText(s, pid, id, d) {
    const pr = FB.world.byId[pid];
    if (d.homeOnly && FB.homeProv(s) !== pid) return FB.T('Only your home county can raise this.');
    if (d.maxDemesne && FB.buildingCount(s, id, false) >= d.maxDemesne) {
      return FB.T('Only {count} may stand across your demesne.', { count: d.maxDemesne });
    }
    if (d.maxCounty && FB.buildingCountIn(s, pid, id, false) >= d.maxCounty) {
      return FB.T('Only {count} may stand in one county.', { count: d.maxCounty });
    }
    if (d.devMin && (s.dev[pid] || 1) < d.devMin) {
      return FB.T('Requires development {development}.', { development: d.devMin });
    }
    if (d.coastal && (!pr || !pr.coastal)) return FB.T('Requires a coastal county.');
    if (d.terrains && (!pr || d.terrains.indexOf(pr.terrain) < 0)) {
      return FB.T('The terrain is unsuitable.');
    }
    return FB.T('No open settlement remains.');
  }

  function buildingOpenCount(s, pid) {
    let open = 0;
    const sts = FB.settlementsOf(s, pid);
    for (let idx = 0; idx < sts.length; idx++) {
      open += FB.buildable(s, pid, idx).length;
    }
    return open;
  }

  /* Keep county choice in reach while the long building ledger scrolls.
     Native selects use the platform's dependable full-screen picker on
     phones and remain keyboard-accessible on desktop. */
  function buildingCountyPicker(s, provs, pid) {
    if (provs.length < 2) return '';
    let h = '<label class="building-county-picker"><span>' +
      esc(FB.T('County')) + '</span><select id="gm-building-county">';
    for (const id of provs) {
      const pr = FB.world.byId[id];
      const open = buildingOpenCount(s, id);
      h += '<option value="' + esc(id) + '"' +
        (id === pid ? ' selected' : '') +
        (open || id === pid ? '' : ' disabled') + '>' +
        esc(FB.T('{province} ({count} possible)', {
          province:pr.name, count:open
        })) + '</option>';
    }
    return h + '</select></label>';
  }

  UI.showBuildings = function (pid, idx, keep) {
    const s = FB.state;
    const provs = FB.demesne(s);
    if (!pid && provs.length > 1) {
      let h = '<div class="gm-list">';
      for (const id of provs) {
        const pr = FB.world.byId[id];
        const open = buildingOpenCount(s, id);
        h += '<button class="actionbtn" data-bprov="' + esc(id) + '"' + (open ? '' : ' disabled') + '>🏘 ' + esc(pr.name) +
          '<span class="adesc">' + esc(FB.T(
            'development {development} · {built} built · {remaining}', {
              development: s.dev[id] || 1,
              built: FB.builtIn(s, id).filter(function (e) { return !e.ruined; }).length,
              remaining: open
                ? FB.T('{count} possible', { count: open })
                : FB.T('nothing more to raise')
            })) + '</span></button>';
      }
      h += '</div><button class="btn" id="gm-cancel">Not now</button>';
      openModal('Build Where?', h);
      document.querySelectorAll('[data-bprov]').forEach(function (btn) {
        btn.addEventListener('click', function () { UI.showBuildings(btn.dataset.bprov); });
      });
      $('gm-cancel').addEventListener('click', UI.closeModal);
      return;
    }
    pid = pid || provs[0];
    const pr = FB.world.byId[pid];
    const sts = FB.settlementsOf(s, pid);
    if (idx === undefined || idx === null) {
      const growth = Math.round(((FBDATA.balance.buildingRepeatCostGrowth || 1.5) - 1) * 100);
      let h = buildingCountyPicker(s, provs, pid) +
        '<div class="gm-body-text"><p>' + esc(FB.T(
        'Use Raise Next to build in the next open settlement; this ledger stays open so you can keep building.')) +
        '</p><p><b>' + esc(FB.T(
          'Repeat-price warning: every further copy of the same building in this county costs {percent}% more. Each button always shows the exact next price.',
          { percent: growth })) + '</b></p></div><div class="gm-list">';
      for (const id in FBDATA.buildings) {
        const d = FBDATA.buildings[id];
        const slots = FB.buildingSlots(s, pid, id);
        const standing = FB.buildingCountIn(s, pid, id, false);
        const copies = FB.buildingCountIn(s, pid, id, true);
        const cost = FB.buildCost(s, pid, id);
        const effects = buildingEffects(d, id).join(' · ');
        const short = s.player.gold < cost;
        if (slots.length) {
          const repeat = copies
            ? FB.T('Repeat copy {number}: its price has risen to {money:cost}.',
              { number: copies + 1, cost: cost })
            : FB.T('First copy in this county: {money:cost}.', { cost: cost });
          h += '<button class="actionbtn" data-bquick="' + esc(id) + '"' + (short ? ' disabled' : '') + '>' +
            esc(FB.T('{icon} {name} — Raise Next', {
              icon: d.icon, name: dt(s, 'building', id, d, 'name')
            })) + '<span class="adesc">' +
            esc(FB.T('{standing} standing · next in {settlement}.', {
              standing: standing, settlement: sts[slots[0]].name
            })) + ' ' + esc(repeat) + '</span>' + assetEffectSummary({
              compact:true,
              owner:FB.T('{province} county', { province:pr.name }),
              scope:buildingScope(s, pid, slots[0], id),
              setupCost:assetMoneyCost(cost, !short),
              recurringCost:assetSeasonalMoneyCost(d.upkeep),
              effect:effects,
              transferRule:buildingTransferRule(),
              expiry:buildingExpiryRule()
            }) + '</button>';
        } else {
          h += '<button class="actionbtn" disabled>' + d.icon + ' ' +
            esc(dt(s, 'building', id, d, 'name')) + '<span class="adesc">' +
            esc(buildingUnavailableText(s, pid, id, d)) +
            '</span>' + assetEffectSummary({
              compact:true,
              owner:FB.T('{province} county', { province:pr.name }),
              scope:FB.T('No eligible settlement'),
              setupCost:assetMoneyCost(cost, !short),
              recurringCost:assetSeasonalMoneyCost(d.upkeep),
              effect:effects,
              transferRule:buildingTransferRule(),
              expiry:buildingExpiryRule()
            }) + '</button>';
        }
      }
      h += '</div><button class="btn" id="gm-cancel">' +
        esc(FB.T(provs.length > 1 ? 'Back' : 'Not now')) + '</button>';
      openModal(FB.T('Building Works in {province}', { province: pr.name }), h);
      document.querySelectorAll('[data-bquick]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const scrollTop = $('gm-body').scrollTop;
          const focusId = btn.dataset.bquick;
          const slots = FB.buildingSlots(FB.state, pid, btn.dataset.bquick);
          if (slots.length && FB.build(FB.state, pid, slots[0], btn.dataset.bquick)) {
            UI.refresh();
          }
          UI.showBuildings(pid, null, { scrollTop: scrollTop, focusId: focusId });
        });
      });
      const countyPicker = $('gm-building-county');
      if (countyPicker) {
        countyPicker.addEventListener('change', function () {
          UI.showBuildings(countyPicker.value);
        });
      }
      if (keep) {
        $('gm-body').scrollTop = keep.scrollTop || 0;
        setTimeout(function () {
          let found = false;
          document.querySelectorAll('[data-bquick]').forEach(function (same) {
            if (same.dataset.bquick === keep.focusId) {
              found = true;
              same.focus();
            }
          });
          if (!found) $('gm-body').scrollTop = keep.scrollTop || 0;
        }, 0);
      }
      $('gm-cancel').addEventListener('click', provs.length > 1
        ? function () { UI.showBuildings(); } : UI.closeModal);
      return;
    }
    const st = sts[idx];
    if (!st) return;
    const done = [];
    for (const e of FB.builtIn(s, pid)) if (e.s === idx) done.push(e);
    let h = '<div class="gm-list">';
    for (const b of FB.buildable(s, pid, idx)) {
      const short = s.player.gold < b.cost;
      const copies = FB.buildingCountIn(s, pid, b.id, true);
      const repeat = copies
        ? FB.T('Repeat copy {number}: its price has risen to {money:cost}.',
          { number: copies + 1, cost: b.cost })
        : FB.T('First copy in this county: {money:cost}.', { cost: b.cost });
      h += '<button class="actionbtn" data-build="' + esc(b.id) + '"' + (short ? ' disabled' : '') + '>' +
        esc(FB.T('{icon} {name}', {
          icon: b.def.icon, name: dt(s, 'building', b.id, b.def, 'name')
        })) + '<span class="adesc">' + esc(dt(s, 'building', b.id, b.def, 'desc')) +
        ' ' + esc(repeat) + '</span>' + assetEffectSummary({
          compact:true,
          owner:FB.T('{province} county', { province:pr.name }),
          scope:buildingScope(s, pid, idx, b.id),
          setupCost:assetMoneyCost(b.cost, !short),
          recurringCost:assetSeasonalMoneyCost(b.def.upkeep),
          effect:buildingEffects(b.def, b.id).join(' · '),
          transferRule:buildingTransferRule(),
          expiry:buildingExpiryRule()
        }) + '</button>';
    }
    h += '</div>';
    if (done.length) {
      h += '<p class="hint">' + esc(FB.T('Already occupying {settlement}:',
        { settlement: st.name })) + ' ' + done.map(function (e) {
        const d = FBDATA.buildings[e.id];
        if (!d) return esc(e.id);
        const name = dt(s, 'building', e.id, d, 'name');
        return d.icon + ' ' + esc(e.ruined ? FB.T('Ruins of {building}', { building: name }) : name);
      }).join(' · ') + '</p>';
    }
    h += '<button class="btn" id="gm-cancel">' + esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Raise a Building in {settlement}', { settlement: st.name }), h);
    document.querySelectorAll('[data-build]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const focusId = btn.dataset.build;
        if (FB.build(FB.state, pid, idx, btn.dataset.build)) UI.refresh();
        UI.showBuildings(pid, idx, { focusId: focusId });
      });
    });
    if (keep && keep.focusId) {
      setTimeout(function () {
        document.querySelectorAll('[data-build]').forEach(function (same) {
          if (same.dataset.build === keep.focusId) same.focus();
        });
      }, 0);
    }
    $('gm-cancel').addEventListener('click', function () { UI.showBuildings(pid); });
  };

  /* ================= settlement picker ================= */
  const SETT_ICON = { village: '🏡', town: '🏘', city: '🏙' };
  UI.showSettlements = function () {
    const s = FB.state;
    const list = FB.settlementsOf(s, s.player.provinceId);
    let h = '<div class="gm-list">';
    for (const st of list) {
      h += '<button class="actionbtn" data-visit="' + esc(st.name) + '" data-kind="' + st.kind + '">' +
        SETT_ICON[st.kind] + ' ' + esc(st.name) +
        '<span class="adesc">' + esc(FB.T('{kind} · a day’s outing',
          { kind: settlementKindName(st.kind) })) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">Stay home</button>';
    openModal('Where To?', h);
    document.querySelectorAll('[data-visit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.queueEvent(FB.state, 'visit_' + btn.dataset.kind,
          { settlement:btn.dataset.visit });
        UI.closeModal();
        FB.game.passDay({ skipFocus: true }); // the outing spends the day
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      delete FB.state.player.cooldowns.go_to_town; // no visit, no cooldown
      UI.closeModal(); UI.refresh();
    });
  };

  /* ================= settlement view =================
     Tapping a settlement in your own demesne (Land tab) opens what stands
     THERE: buildings are per-settlement ({ s: idx, id } entries), so the
     list filters to this settlement, and the "raise" button opens the
     building picker straight at this settlement's list. */
  UI.showSettlement = function (pid, idx) {
    const s = FB.state;
    const pr = FB.world.byId[pid];
    if (!s || !pr) return;
    const st = FB.settlementsOf(s, pid)[idx];
    if (!st) return;
    const done = [];
    for (const e of FB.builtIn(s, pid)) if (e.s === idx) done.push(e);
    let h = '';
    if (done.length) {
      for (const e of done) {
        const id = e.id;
        const d = FBDATA.buildings[id];
        if (!d) continue;
        if (e.ruined) {
          h += '<div class="asset-owned-row"><b>' + d.icon + ' ' +
            esc(FB.T('Ruins of {building}', {
              building:dt(s, 'building', id, d, 'name')
            })) + '</b>' + assetEffectSummary({
              compact:true,
              owner:FB.T('{province} county', { province:pr.name }),
              scope:buildingScope(s, pid, idx, id),
              setupCost:FB.T('Already spent'),
              recurringCost:FB.T('None'),
              effect:FB.T('No current benefit'),
              transferRule:buildingTransferRule(),
              expiry:FB.T('Permanent ruins; the site remains occupied')
            }) + '</div>';
        } else {
          h += '<div class="asset-owned-row"><b>' + d.icon + ' ' +
            esc(dt(s, 'building', id, d, 'name')) + '</b>' +
            assetEffectSummary({
              compact:true,
              owner:FB.T('{province} county', { province:pr.name }),
              scope:buildingScope(s, pid, idx, id),
              setupCost:FB.T('Paid when raised'),
              recurringCost:assetSeasonalMoneyCost(d.upkeep),
              effect:buildingEffects(d, id).join(' · '),
              transferRule:buildingTransferRule(),
              expiry:buildingExpiryRule()
            }) + '</div>' +
            '<div class="hint settdesc">' + esc(dt(s, 'building', id, d, 'desc')) + '</div>' +
            '<button class="btn sett-demolish" data-demolish="' + esc(id) + '">' +
            esc(FB.T('Demolish…')) + '</button>';
        }
      }
    } else {
      h += '<p class="hint">' + esc(FB.T('No buildings stand in {settlement} yet.',
        { settlement: st.name })) + '</p>';
    }
    const canRaise = FB.demesne(s).indexOf(pid) >= 0 && s.player.tier >= 3 &&
      FB.buildable(s, pid, idx).length > 0;
    if (canRaise) {
      h += '<div class="gm-list"><button class="actionbtn" id="gm-raise">' +
        esc(FB.T('🏗 Raise a building…')) + '</button></div>';
    }
    h += '<button class="btn" id="gm-cancel">' + esc(FB.T('Done')) + '</button>';
    openModal(SETT_ICON[st.kind] + ' ' + st.name, h);
    if (canRaise) {
      $('gm-raise').addEventListener('click', function () { UI.showBuildings(pid, idx); });
    }
    document.querySelectorAll('[data-demolish]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.dataset.demolish;
        const d = FBDATA.buildings[id];
        const name = dt(FB.state, 'building', id, d, 'name');
        let body = '<div class="gm-body-text"><p>' + esc(FB.T(
          'Demolishing {building} is permanent and gives no refund. Its ongoing benefits and upkeep will end, and ruins will occupy this settlement.',
          { building: name })) + '</p></div><div class="gm-list">' +
          '<button class="actionbtn op-bad" id="gm-demolish-confirm">' +
          esc(FB.T('Demolish {building}', { building: name })) + '</button></div>' +
          '<button class="btn" id="gm-demolish-back">' + esc(FB.T('Keep it')) + '</button>';
        openModal(FB.T('Demolish {building}?', { building: name }), body);
        $('gm-demolish-confirm').addEventListener('click', function () {
          if (FB.demolishBuilding(FB.state, pid, idx, id)) {
            UI.toast('🏚 {building} was demolished.', { building: name });
            UI.refresh();
          }
          UI.showSettlement(pid, idx);
        });
        $('gm-demolish-back').addEventListener('click', function () { UI.showSettlement(pid, idx); });
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  /* ================= plot picker ================= */
  UI.showPlots = function () {
    const s = FB.state;
    let h = '<p class="hint">' + esc(FB.T(
      'A plot claims your daily focus until it is ready to spring — and every day of weaving risks discovery.')) +
      '</p><div class="gm-list">';
    for (const t of FB.plotAvailable(s)) {
      h += '<button class="actionbtn" data-plot="' + esc(t.id) + '">' +
        t.def.icon + ' ' + esc(dt(s, 'plot', t.id, t.def, 'name')) +
        '<span class="adesc">' + esc(dt(s, 'plot', t.id, t.def, 'desc')) + ' ' +
        esc(FB.T('({days} days’ weaving, roughly)', { days: t.def.need })) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">Not now</button>';
    openModal('Begin a Plot', h);
    document.querySelectorAll('[data-plot]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const def = FBDATA.plots[btn.dataset.plot];
        if (def && def.target) UI.showPlotTargets(btn.dataset.plot);
        else {
          FB.beginPlot(FB.state, btn.dataset.plot);
          UI.closeModal(); UI.refresh();
        }
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  UI.showPlotTargets = function (plotId) {
    const s = FB.state, def = FBDATA.plots[plotId];
    if (!def) return;
    const targets = FB.plotTargets(s, def);
    let h = '<p class="hint">' + esc(FB.T(
      'Choose the county this plot concerns. Its identity remains attached to the plot through discovery and resolution.')) +
      '</p><div class="gm-list">';
    for (const pid of targets) {
      const pr = FB.world.byId[pid], r = s.realms[s.owner[pid]];
      h += '<button class="actionbtn" data-plot-target="' + esc(pid) + '">📜 ' + esc(pr.name) +
        '<span class="adesc">' + esc(FB.T('Held by {realm}', {
          realm: r ? r.name : FB.T('another realm')
        })) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-back">' + esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Choose the Target'), h);
    document.querySelectorAll('[data-plot-target]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.beginPlot(FB.state, plotId, { pid: btn.dataset.plotTarget });
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-back').addEventListener('click', UI.showPlots);
  };

  /* ================= envoy picker ================= */
  UI.showEnvoys = function () {
    const s = FB.state;
    let h = '<p class="hint">' + esc(FB.T(
      'A peace envoy carries {money:10} in gifts. Kings and emperors may instead offer one defensive alliance at Standing 60+, carrying {money:25}; either offer uses the same envoy odds.')) +
      '</p><div class="gm-list">';
    const pactTargets = FB.envoyTargets(s);
    const allianceTargets = FB.allianceOfferTargets(s);
    const targetMap = {}, targets = [];
    for (const rid of pactTargets.concat(allianceTargets)) {
      if (!targetMap[rid]) { targetMap[rid] = 1; targets.push(rid); }
    }
    for (const rid of targets) {
      const r = s.realms[rid];
      const men = FB.aiBaseHost(s, rid);
      const standing = FB.standingOf(s, { kind:'realm', id:rid });
      if (pactTargets.indexOf(rid) >= 0) {
        h += '<button class="actionbtn" data-envoy="' + esc(rid) + '"' +
          (s.player.gold < 10 ? ' disabled' : '') + '>🕊 ' + esc(FB.T('Peace pact with {realm}', { realm: r.name })) +
          '<span class="adesc">' + esc(FB.T('{ruler} · {counties} · fields ~{men} · Standing {standing} · chance ~{chance}%', {
            ruler: r.ruler.name,
            counties: countyCountText(s, FB.realmProvinces(s, rid).length),
            men: menText(s, men),
            standing: standingText(standing),
            chance: Math.round(FB.envoyChance(s, rid) * 100)
          })) + '</span></button>';
      }
      if (allianceTargets.indexOf(rid) >= 0) {
        h += '<button class="actionbtn" data-alliance-offer="' + esc(rid) + '"' +
          (s.player.gold < 25 ? ' disabled' : '') + '>🤝 ' + esc(FB.T('Defensive alliance with {realm}', { realm: r.name })) +
          '<span class="adesc">' + esc(FB.T('{ruler} · Standing {standing} · chance ~{chance}% · their aid would add up to ~{men} defenders', {
          ruler: r.ruler.name,
          standing: standingText(standing),
          chance: Math.round(FB.envoyChance(s, rid) * 100),
          men: menText(s, Math.round(Math.min(men * 0.25, FB.playerLevy(s) * 0.5)))
        })) + '</span></button>';
      }
    }
    h += '</div><button class="btn" id="gm-cancel">Not now</button>';
    openModal('Send an Envoy', h);
    document.querySelectorAll('[data-envoy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.sendEnvoy(FB.state, btn.dataset.envoy);
        UI.closeModal(); UI.refresh();
      });
    });
    document.querySelectorAll('[data-alliance-offer]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.offerAlliance(FB.state, btn.dataset.allianceOffer);
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  /* ================= political attention picker ================= */
  UI.showForeignPolicy = function () {
    const s = FB.state;
    const capacity = FB.politicalAttentionCapacity(s);
    if (!capacity) return;
    const targets = FB.foreignPolicyTargets(s);
    const used = FB.foreignPolicyUsed(s);
    let h = '<p class="hint">' + esc(FB.T(
      'Political attention is assigned, not spent. Each active direction changes Standing with that court every season and remains in force until you change it.')) +
      '</p><div class="progressnote">' + esc(FB.T(
        'Political attention: {used} of {capacity} assigned.', {
          used: used, capacity: capacity
        })) + '</div><div class="gm-list">';
    for (const rid of targets) {
      const r = s.realms[rid];
      const standing = FB.standingOf(s, { kind:'realm', id:rid });
      const men = FB.aiBaseHost(s, rid);
      h += '<button class="actionbtn" data-policy-target="' + esc(rid) + '">🕊 ' + esc(r.name) +
        '<span class="adesc">' + esc(FB.T(
          '{title} {ruler} · Standing {standing} · fields ~{men} · {stance} · {status}', {
            title: FB.realmRankTitle(s, r),
            ruler: r.ruler.name,
            standing: standingText(standing),
            men: menText(s, men),
            stance: foreignPolicyStanceText(s, rid),
            status: foreignPolicyStatusText(s, rid)
          })) + '</span></button>';
    }
    h += '</div><button class="btn gm-footer" id="gm-cancel">' + esc(FB.T('Done')) + '</button>';
    openModal(FB.T('Foreign Policy'), h);
    document.querySelectorAll('[data-policy-target]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        UI.showForeignPolicyStance(btn.dataset.policyTarget);
      });
    });
    $('gm-cancel').addEventListener('click', function () { UI.closeModal(); UI.refresh(); });
  };

  UI.showForeignPolicyStance = function (rid) {
    const s = FB.state;
    const r = s.realms[rid];
    if (!r || !FB.isForeignPolicyTarget(s, rid)) {
      UI.showForeignPolicy();
      return;
    }
    const capacity = FB.politicalAttentionCapacity(s);
    const used = FB.foreignPolicyUsed(s);
    const current = FB.foreignPolicyStance(s, rid);
    const full = !current && used >= capacity;
    const amount = Math.round(FB.foreignPolicyAmount(s) * 10) / 10;
    const standing = FB.standingOf(s, { kind:'realm', id:rid });
    let h = '<p class="hint">' + esc(FB.T(
      'Standing with {realm} is {standing}. Your diplomacy changes it by about {amount} each season.', {
        realm: r.name,
        standing: standingText(standing),
        amount: amount
      })) + '</p>';
    h += '<div class="progressnote">' + esc(FB.T(
      'Political attention: {used} of {capacity} assigned · current direction: {stance}.', {
        used: used, capacity: capacity, stance: foreignPolicyStanceText(s, rid)
      })) + '</div><div class="gm-list">';
    h += '<button class="actionbtn" data-policy-stance="1"' + (full ? ' disabled' : '') + '>↑ ' +
      esc(FB.T('Improve relations')) + '<span class="adesc">' +
      esc(FB.T('Build goodwill at this court every season.')) + '</span></button>';
    h += '<button class="actionbtn" data-policy-stance="0">• ' +
      esc(FB.T('Neutral')) + '<span class="adesc">' +
      esc(FB.T('Withdraw your court’s attention and free this assignment.')) + '</span></button>';
    h += '<button class="actionbtn" data-policy-stance="-1"' + (full ? ' disabled' : '') + '>↓ ' +
      esc(FB.T('Provoke')) + '<span class="adesc">' +
      esc(FB.T('Cultivate hostility at this court every season, inviting greater danger.')) + '</span></button>';
    if (full) {
      h += '<p class="hint">' + esc(FB.T(
        'All political attention is assigned. Set another court to Neutral before choosing a new direction here.')) + '</p>';
    }
    if (s.player.war && s.player.war.enemy === rid) {
      h += '<p class="hint">⚔ ' + esc(FB.T(
        'Any direction chosen here remains assigned but is suspended until the war ends.')) + '</p>';
    }
    h += '</div><button class="btn gm-footer" id="gm-back">' + esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Policy toward {realm}', { realm: r.name }), h);
    document.querySelectorAll('[data-policy-stance]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (FB.setForeignPolicy(FB.state, rid, Number(btn.dataset.policyStance))) {
          UI.showForeignPolicy();
          UI.refresh();
        }
      });
    });
    $('gm-back').addEventListener('click', UI.showForeignPolicy);
  };

  /* ================= liege-chain pickers ================= */

  /* bend the knee anywhere along your own chain */
  UI.showHomage = function () {
    const s = FB.state;
    const chain = FB.liegeChain(s, s.player.liege);
    let h = '<p class="hint">A journey, a gift of words, a knee on the floor. Standing grows — more for silver tongues.</p><div class="gm-list">';
    for (const rid of chain) {
      const r = s.realms[rid];
      h += '<button class="actionbtn" data-rid="' + esc(rid) + '">🙇 ' +
        esc(FB.T('{title} {name}', {
          title: FB.realmRankTitle(s, r), name: r.ruler.name
        })) +
        '<span class="adesc">' + esc(FB.T('{realm} · Standing {standing}',
          {
            realm:r.name,
            standing:standingText(FB.standingOf(s, {
              kind:'realm', id:rid
            }))
          })) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">Not now</button>';
    openModal('Pay Homage', h);
    document.querySelectorAll('[data-rid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.payHomage(FB.state, btn.dataset.rid);
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      delete FB.state.player.cooldowns.pay_homage; // no journey, no cooldown
      UI.closeModal(); UI.refresh();
    });
  };

  /* appeal to a lord ABOVE your direct liege */
  UI.showAppeal = function () {
    const s = FB.state;
    const chain = FB.liegeChain(s, s.player.liege).slice(1);
    let h = '<p class="hint">Carry your suit past your own lord to a greater one. Success makes you HIS direct man — and an enemy of the man you passed over.</p><div class="gm-list">';
    for (const rid of chain) {
      const r = s.realms[rid];
      h += '<button class="actionbtn" data-rid="' + esc(rid) + '">⚖ ' +
        esc(FB.T('{title} {name}', {
          title: FB.realmRankTitle(s, r), name: r.ruler.name
        })) +
        '<span class="adesc">' + esc(FB.T('{realm} · Standing {standing}',
          {
            realm:r.name,
            standing:standingText(FB.standingOf(s, {
              kind:'realm', id:rid
            }))
          })) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">Not now</button>';
    openModal('Appeal to a Higher Lord', h);
    document.querySelectorAll('[data-rid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const rid = btn.dataset.rid;
        FB.state.player.appealRid = rid;
        FB.queueEvent(FB.state, 'liege_appeal', { rid:rid });
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      delete FB.state.player.cooldowns.appeal_lord; // no suit carried, no cooldown
      UI.closeModal(); UI.refresh();
    });
  };

  /* sue the liege for a disgraced neighbor's fief */
  UI.showPetitionCounty = function () {
    const s = FB.state;
    const cands = FB.petitionCandidates(s);
    let h = '<p class="hint">' + esc(FB.T(
      'The liege strips only a man he already despises — and only for a vassal he loves. Your service in his wars: {service}.',
      { service: s.player.warService || 0 })) + '</p><div class="gm-list">';
    for (const c of cands) {
      const pr = FB.world.byId[c.pid];
      const hr = s.realms[c.holder];
      s.player.petitionPid = c.pid; // lets the named formula price this exact suit
      const odds = Math.round(FB.namedChance(s, 'county_petition') * 100);
      h += '<button class="actionbtn" data-pid="' + esc(c.pid) + '">🏰 ' + esc(pr.name) +
        '<span class="adesc">' + esc(FB.T(
          '{realm} · {ruler} · the liege’s favor {favor} · dev {development} · your suit ~{odds}%', {
            realm:hr.name, ruler:hr.ruler.name, favor:Math.round(c.favor),
            development: s.dev[c.pid] || 1, odds: odds
          })) + '</span></button>';
    }
    delete s.player.petitionPid;
    if (!cands.length) {
      h += '<p class="hint">' + esc(FB.T(
        'No neighboring lord stands low enough in your liege’s favor ({favor} or less). Time brings disgrace — wait for it.',
        { favor:FBDATA.balance.petitionFavorMax })) + '</p>';
    }
    h += '</div><button class="btn" id="gm-cancel">Not now</button>';
    openModal('Petition for a Fief', h);
    document.querySelectorAll('[data-pid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        s.player.petitionPid = btn.dataset.pid;
        FB.queueEvent(s, 'county_petition', { pid:btn.dataset.pid });
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      delete FB.state.player.cooldowns.petition_county; // no suit pressed, no cooldown
      UI.closeModal(); UI.refresh();
    });
  };

  /* a struggling neighbor sells his birthright */
  UI.showBuyCounty = function () {
    const s = FB.state;
    const cands = FB.buyCountyCandidates(s);
    let h = '<p class="hint">A small lord with empty coffers will sell his birthright. The liege tolerates it — barely.</p><div class="gm-list">';
    for (const c of cands) {
      const pr = FB.world.byId[c.pid];
      const hr = s.realms[c.holder];
      h += '<button class="actionbtn" data-pid="' + esc(c.pid) + '">💰 ' + esc(pr.name) +
        '<span class="adesc">' + esc(FB.T(
          '{ruler} · dev {development} · {money:price}', {
            ruler: hr.ruler.name, development: s.dev[c.pid] || 1, price: c.price
          })) + '</span></button>';
    }
    if (!cands.length) h += '<p class="hint">No weak neighbor holds land beside yours.</p>';
    h += '</div><button class="btn" id="gm-cancel">Not now</button>';
    openModal('Buy Out a Neighbor', h);
    document.querySelectorAll('[data-pid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!FB.buyCounty(FB.state, btn.dataset.pid)) { UI.toast('Not enough money.'); return; }
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      delete FB.state.player.cooldowns.buy_county; // no bargain, no cooldown
      UI.closeModal(); UI.refresh();
    });
  };

  /* found a holding on empty land */
  UI.showSettleWaste = function () {
    const s = FB.state;
    const B = FBDATA.balance;
    let h = '<p class="hint">' + esc(FB.T(
      '{money:gold} and {prestige} prestige to plant a settlement on empty land. The new county answers to you — and belongs to no de jure duchy.',
      { gold: B.settleGold, prestige: B.settlePrestige })) + '</p><div class="gm-list">';
    for (const pid of FB.wastelandCandidates(s)) {
      const pr = FB.world.byId[pid];
      h += '<button class="actionbtn" data-pid="' + esc(pid) + '">🌱 ' + esc(pr.name) +
        '<span class="adesc">' + esc(FB.T('empty {terrain}',
          { terrain: terrainName(pr.terrain) })) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">Not now</button>';
    openModal('Settle the Wasteland', h);
    document.querySelectorAll('[data-pid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.settleWaste(FB.state, btn.dataset.pid);
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      delete FB.state.player.cooldowns.settle_waste; // no ground broken, no cooldown
      UI.closeModal(); UI.refresh();
    });
  };

  /* offer your lands to a neighboring sovereign */
  UI.showFealty = function () {
    const s = FB.state;
    let h = '<p class="hint">Kneel to a neighboring sovereign: your lands join his realm and he becomes your liege. If you already serve another, he may call it treason.</p><div class="gm-list">';
    for (const rid of FB.fealtyTargets(s)) {
      const r = s.realms[rid];
      const men = FB.aiBaseHost(s, rid);
      h += '<button class="actionbtn" data-rid="' + esc(rid) + '">🤝 ' + esc(r.name) +
        '<span class="adesc">' + esc(FB.T('{title} {ruler} · fields ~{men}', {
          title: FB.realmRankTitle(s, r), ruler: r.ruler.name, men: menText(s, men)
        })) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">Not now</button>';
    openModal('Swear Fealty', h);
    document.querySelectorAll('[data-rid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.swearFealty(FB.state, btn.dataset.rid);
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  function giftArmoryRefs(s) {
    return FB.itemList(s).slice().sort(function (a, b) {
      return FB.itemName(s, a).localeCompare(FB.itemName(s, b));
    });
  }

  function giftDeliveryText(s, kind, id) {
    if (!FB.giftDeliveryPreview) return '';
    const preview = FB.giftDeliveryPreview(s, kind, id);
    const pending = preview && preview.pending;
    if (!pending) return '';
    const destination = FB.world.byId[preview.destinationId];
    if (pending.phase === 'return') {
      return FB.T('Courier returning to {destination} · {days} days remain.', {
        destination:destination ? destination.name : FB.T('your permanent home'),
        days:preview.eta
      });
    }
    return FB.T('Gift courier bound for {destination} · {days} days remain.', {
      destination:destination ? destination.name : FB.T('the recipient'),
      days:preview.eta
    });
  }

  function giftItemUnavailableText(s, ref, days, deliveryText) {
    const assigned = FB.itemAssignment(s, ref);
    if (assigned) {
      return FB.T('{wearer}. Return it to the armory before gifting it.', {
        wearer:itemWearerText(s, ref)
      });
    }
    if (FB.financeCollateralPledged &&
      FB.financeCollateralPledged(s, 'item', ref)) {
      return FB.T('Pledged to a lender; clear the loan before gifting it.');
    }
    if (deliveryText) return deliveryText;
    if (days) {
      return FB.T('Cash and item gifts share this recipient’s cooldown. Ready in {days} days.', {
        days:days
      });
    }
    return '';
  }

  UI.showCharacterGiftModal = function (cid) {
    const s = FB.state;
    const c = s && s.chars[cid];
    if (!s || !c || c.dead || c.id === s.player.charId) return;
    const rulerId = FB.realmIdForRulerCharacter &&
      FB.realmIdForRulerCharacter(s, c);
    if (rulerId) {
      UI.showRulerGiftModal(rulerId, 'character:' + c.id);
      return;
    }
    const household = FB.isHouseholdCharacter && FB.isHouseholdCharacter(s, cid);
    const days = FB.socialGiftDaysRemaining(s, cid);
    const deliveryPreview = FB.giftDeliveryPreview
      ? FB.giftDeliveryPreview(s, 'character', cid) : null;
    const deliveryText = giftDeliveryText(s, 'character', cid);
    const deliveryUnavailable = deliveryPreview && deliveryPreview.foreign &&
      !deliveryPreview.eligible ? deliveryPreview.reason : '';
    const cashCost = 5;
    const cashBoost = FBDATA.balance.socialCashGiftOpinion === undefined
      ? 4 : FBDATA.balance.socialCashGiftOpinion;
    const cashBlocked = days || deliveryText || deliveryUnavailable ||
      s.player.gold < cashCost;
    let cashDetail;
    if (deliveryText || deliveryUnavailable) {
      cashDetail = deliveryText || deliveryUnavailable;
    } else if (days) {
      cashDetail = FB.T(
        '+{standing} Standing. Cash and item gifts share this recipient’s cooldown; ready in {days} days.', {
          standing:cashBoost, days:days
        });
    } else if (s.player.gold < cashCost) {
      cashDetail = FB.T('Requires {money:cost}; you have {money:current}. It grants +{standing} Standing.', {
        cost:cashCost, current:s.player.gold, standing:cashBoost
      });
    } else {
      cashDetail = deliveryPreview && deliveryPreview.foreign
        ? FB.T(
          '+{standing} Standing on arrival after {travelDays} courier days; the {cooldown}-day cooldown begins then. (spends the day)', {
            standing:cashBoost,
            travelDays:deliveryPreview.days,
            cooldown:FB.socialGiftCooldownDays()
          })
        : FB.T(
          '+{standing} Standing. Cash and item gifts share a {days}-day cooldown. (spends the day)', {
            standing:cashBoost, days:FB.socialGiftCooldownDays()
          });
    }
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Choose what to offer {name}. Only one cash or item gift may be given to this person every {days} days.', {
        name:c.name, days:FB.socialGiftCooldownDays()
      })) + '</p>' + (deliveryText
        ? '<p>' + esc(deliveryText) + '</p>' : '') +
      '</div><div class="gm-list">' +
      '<button class="actionbtn" id="gift-character-cash"' +
      (cashBlocked ? ' disabled' : '') + '>💰 ' +
      esc(FB.T('Offer {money:gold} in cash', { gold:cashCost })) +
      '<span class="adesc">' + esc(cashDetail) + '</span></button>';
    if (household) {
      h += '<div class="progressnote">' + esc(FB.T(
        'Their clothing and treasures remain managed through the shared family armory, so only cash can be given personally.')) +
        '</div>';
    } else {
      const refs = giftArmoryRefs(s);
      h += '<div class="panelh">' + esc(FB.T('Items from the family armory')) + '</div>';
      if (!refs.length) {
        h += '<div class="progressnote">' + esc(FB.T(
          'The family armory holds no item to offer.')) + '</div>';
      }
      for (const ref of refs) {
        const item = FB.resolveItem(s, ref);
        if (!item) continue;
        const blocked = giftItemUnavailableText(s, ref, days,
          deliveryText || deliveryUnavailable);
        const boost = FB.giftOpinion(item);
        const detail = blocked
          ? FB.T('+{standing} Standing · unavailable: {reason}', {
            standing:boost, reason:blocked
          })
          : (deliveryPreview && deliveryPreview.foreign
            ? FB.T(
              '+{standing} Standing on arrival after {days} courier days. This exact object remains in transit until delivery. (spends the day)', {
                standing:boost, days:deliveryPreview.days
              })
            : FB.T(
              '+{standing} Standing. This exact object leaves family ownership. (spends the day)', {
                standing:boost
              }));
        h += '<button class="actionbtn" data-character-gift-item="' + esc(ref) + '"' +
          (blocked ? ' disabled' : '') + '>' + item.def.icon + ' ' +
          esc(FB.itemName(s, ref)) +
          '<span class="adesc">' + esc(detail) + '</span></button>';
      }
    }
    h += '</div><button class="btn" id="gm-cancel">' + esc(FB.T('Keep your gifts')) + '</button>';
    openModal(FB.T('Offer a gift to {name}', { name:FB.fullName(c) }), h, {
      historyView:true,
      historyBackRender:function () { UI.showCharModal(cid); }
    });
    const cash = $('gift-character-cash');
    if (cash) cash.addEventListener('click', function () {
      if (!FB.giveSocialCashGift(s, cid)) return;
      UI.closeModal();
      FB.game.passDay({ skipFocus:true });
    });
    document.querySelectorAll('[data-character-gift-item]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (!FB.giveItem(s, button.dataset.characterGiftItem, cid)) return;
        UI.closeModal();
        FB.game.passDay({ skipFocus:true });
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      modalHistoryBack(function () { UI.showCharModal(cid); });
    });
  };

  UI.showRulerGiftModal = function (rid, returnView) {
    const s = FB.state;
    const r = s && rid && s.realms[rid];
    if (!s || !r || !r.alive || !r.ruler || rid === 'player') return;
    function returnToRulerGiftSource() {
      if (returnView === 'governance') UI.showGovernance('vassals');
      else if (returnView === 'council:governance') UI.showCouncil('governance');
      else if (returnView === 'council') UI.showCouncil();
      else if (returnView && returnView.indexOf('realm:governance:') === 0) {
        UI.showLiegeModal(rid, {
          view:'governance',
          section:returnView.slice('realm:governance:'.length) || 'position'
        });
      }
      else if (returnView && returnView.indexOf('character:') === 0) {
        UI.showCharModal(returnView.slice('character:'.length));
      }
      else UI.showLiegeModal(rid);
    }
    const days = FB.rulerGiftDaysRemaining(s, rid);
    const deliveryPreview = FB.giftDeliveryPreview
      ? FB.giftDeliveryPreview(s, 'ruler', rid) : null;
    const deliveryText = giftDeliveryText(s, 'ruler', rid);
    const deliveryUnavailable = deliveryPreview && deliveryPreview.foreign &&
      !deliveryPreview.eligible ? deliveryPreview.reason : '';
    const cashCost = FB.rulerCashGiftCost(s, rid);
    const cashBoost = FB.rulerCashGiftOpinion();
    const standing = FB.T('Standing');
    const cashBlocked = days || deliveryText || deliveryUnavailable ||
      s.player.gold < cashCost;
    let cashDetail;
    if (deliveryText || deliveryUnavailable) {
      cashDetail = deliveryText || deliveryUnavailable;
    } else if (days) {
      cashDetail = FB.T(
        '+{amount} {standing}. Cash and item gifts share this ruler’s cooldown; ready in {days} days.', {
          amount:cashBoost, standing:standing, days:days
        });
    } else if (s.player.gold < cashCost) {
      cashDetail = FB.T(
        'Rank price: {money:cost}; you have {money:current}. It grants +{amount} {standing}.', {
          cost:cashCost, current:s.player.gold, amount:cashBoost, standing:standing
        });
    } else {
      cashDetail = deliveryPreview && deliveryPreview.foreign
        ? FB.T(
          'Rank price: {money:cost} for +{amount} {standing} on arrival after {travelDays} courier days; the {cooldown}-day cooldown begins then. (spends the day)', {
            cost:cashCost, amount:cashBoost, standing:standing,
            travelDays:deliveryPreview.days,
            cooldown:FB.socialGiftCooldownDays()
          })
        : FB.T(
          'Rank price: {money:cost} for +{amount} {standing}. Cash and items share a {days}-day cooldown. (spends the day)', {
            cost:cashCost, amount:cashBoost, standing:standing,
            days:FB.socialGiftCooldownDays()
          });
    }
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Choose what to offer {title} {ruler} of {realm}.', {
        title:FB.realmRankTitle(s, r), ruler:r.ruler.name, realm:r.name
      })) + '</p>' + (deliveryText
        ? '<p>' + esc(deliveryText) + '</p>' : '') +
      '</div><div class="gm-list">' +
      '<button class="actionbtn" id="gift-ruler-cash"' +
      (cashBlocked ? ' disabled' : '') + '>💰 ' +
      esc(FB.T('Offer {money:gold} in cash', { gold:cashCost })) +
      '<span class="adesc">' + esc(cashDetail) + '</span></button>' +
      '<div class="panelh">' + esc(FB.T('Items from the family armory')) + '</div>';
    const refs = giftArmoryRefs(s);
    if (!refs.length) {
      h += '<div class="progressnote">' + esc(FB.T(
        'The family armory holds no item to offer.')) + '</div>';
    }
    for (const ref of refs) {
      const item = FB.resolveItem(s, ref);
      if (!item) continue;
      const blocked = giftItemUnavailableText(s, ref, days,
        deliveryText || deliveryUnavailable);
      const boost = FB.giftOpinion(item);
      const detail = blocked
        ? FB.T('+{amount} {standing} · unavailable: {reason}', {
          amount:boost, standing:standing, reason:blocked
        })
        : (deliveryPreview && deliveryPreview.foreign
          ? FB.T(
            '+{amount} {standing} on arrival after {days} courier days. This exact object remains in transit until delivery. (spends the day)', {
              amount:boost, standing:standing, days:deliveryPreview.days
            })
          : FB.T(
            '+{amount} {standing}. This exact object permanently leaves the family armory. (spends the day)', {
              amount:boost, standing:standing
            }));
      h += '<button class="actionbtn" data-ruler-gift-item="' + esc(ref) + '"' +
        (blocked ? ' disabled' : '') + '>' + item.def.icon + ' ' +
        esc(FB.itemName(s, ref)) +
        '<span class="adesc">' + esc(detail) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">' + esc(FB.T('Keep your gifts')) + '</button>';
    openModal(FB.T('Offer a gift to {ruler}', { ruler:r.ruler.name }), h, {
      historyView:true,
      historyBackRender:returnToRulerGiftSource
    });
    const cash = $('gift-ruler-cash');
    if (cash) cash.addEventListener('click', function () {
      if (!FB.giveRulerCashGift(s, rid)) return;
      UI.closeModal();
      FB.game.passDay({ skipFocus:true });
    });
    document.querySelectorAll('[data-ruler-gift-item]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (!FB.giveRulerItemGift(s, button.dataset.rulerGiftItem, rid)) return;
        UI.closeModal();
        FB.game.passDay({ skipFocus:true });
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      modalHistoryBack(returnToRulerGiftSource);
    });
  };

  /* The realm sheet remains the primary view for an AI ruler. Cultivation
     can materialize that ruler into an ordinary character sheet as needed. */
  UI.showLiegeModal = function (rid, returnContext) {
    const s = FB.state;
    const r = rid && s.realms[rid];
    if (!r || !r.alive || !r.ruler) return;
    const cap = FB.world.byId[r.capital];
    const rel = cap ? FB.religionOf(cap.religion) : null;
    const men = FB.aiBaseHost(s, rid);
    const standing = FB.standingOf(s, { kind:'realm', id:rid });
    const liege = r.liege && s.realms[r.liege];
    const foreignSovereign = rid !== 'player' && !r.liege && FB.isPlayerSovereign(s);
    const rulerCharacter = FB.realmRulerCharacter
      ? FB.realmRulerCharacter(s, rid) : null;
    const succession = FB.ensureRealmSuccession(s, rid);
    const family = FB.realmFamily(s, rid);
    const techRid = FB.techRealmId(s, rid);
    const techRecord = FB.realmTechRecord(s, techRid);
    const techActiveParts = (techRecord.active || []).map(function (techActiveId) {
      const techDef = FBDATA.tech[techActiveId];
      return techDef ? FB.T('{technology} — {progress}/{cost}', {
        technology:dt(s, 'tech', techActiveId, techDef, 'name'),
        progress:researchNumber(techRecord.progress[techActiveId] || 0),
        cost:FB.techCost(s, techActiveId, techRid)
      }) : techActiveId;
    });
    const chain = s.player.liege ? FB.liegeChain(s, s.player.liege) : [];
    const royalNeighbor = FB.isPlayerSovereign(s) && s.realms.player.rank >= 3 &&
      !r.liege && r.rank >= 3 && FB.realmsAdjacent(s, 'player', rid);
    const mayApproach = chain.indexOf(rid) >= 0 || royalNeighbor;
    let h = '<div class="charcard"' + (rulerCharacter
      ? ' data-cid="' + esc(rulerCharacter.id) + '" title="' +
        esc(FB.T('Open their sheet and your dealings with them')) + '"'
      : '') +
      '><canvas id="liegecrest" class="pface" width="56" height="64"></canvas>' +
      '<div><div class="ccname">' + esc(FB.T('{title} {name}', {
        title: FB.realmRankTitle(s, r), name: r.ruler.name
      })) + '</div>' +
      '<div class="ccmeta">' + esc(FB.T('{sex} of {age}', {
        sex: FB.T(r.ruler.sex === 'f' ? 'Woman' : 'Man'), age: r.ruler.age
      })) +
      ' · ' + esc(cultureName(s, r.ruler.culture)) +
      (rel ? ' · ' + rel.icon + ' ' + esc(religionName(s, cap.religion)) : '') + '</div>' +
      '<div class="ccmeta">' + esc(liege
        ? FB.T('Himself a vassal of {liege}', { liege: liege.name })
        : FB.T('Sovereign — kneels to no one')) + '</div>' +
      '<div class="ccmeta ' + standingClass(standing) + '">' +
      esc(FB.T('⚔ martial {martial} · Standing {standing}', {
        martial:r.ruler.mar,
        standing:standingText(standing)
      })) + '</div>' +
      (r.ruler.trait && FBDATA.traits[r.ruler.trait]
        ? '<div class="ccmeta">' + esc(dt(s, 'trait', r.ruler.trait, FBDATA.traits[r.ruler.trait], 'name')) +
          ' — ' + esc(dt(s, 'trait', r.ruler.trait, FBDATA.traits[r.ruler.trait], 'desc')) + '</div>'
        : '') +
      '</div></div>' +
      '<div style="margin-top:10px">' +
      kv('Realm', esc(FB.L(r.name))) +
      kv('Standing with this ruler', standingSpan(standing)) +
      kv('Counties', FB.realmProvinces(s, rid).length) +
      kv('Realm host', '~' + esc(menText(s, men))) +
      kv('Technology', esc(techLevelsText(s, techRid))) +
      kv('Current research', esc(techActiveParts.length
        ? techActiveParts.join(' · ')
        : FB.T('No active project'))) +
      kv('Defensive alliance', esc(allianceText(s, rid))) +
      (liege ? kv('Overlord',
        '<button class="linklike" data-liege="' + esc(liege.id) + '">' +
        esc(FB.L(liege.name)) + '</button>') : '') +
      (cap ? kv('Capital', esc(FB.L(cap.name))) : '') +
      '</div>';
    if (rid !== 'player') {
      h += '<div class="progressnote">' +
        esc(realmStandingContext(s, rid)) + '</div>';
    }
    if (rid !== 'player') {
      const giftDays = FB.rulerGiftDaysRemaining(s, rid);
      const deliveryText = giftDeliveryText(s, 'ruler', rid);
      const giftStanding = FB.T('Standing');
      h += '<button class="actionbtn" id="rm-gift">🎁 ' +
        esc(FB.T('Offer a gift…')) +
        '<span class="adesc">' + esc(deliveryText || (giftDays
          ? FB.T('Cash and item gifts share this ruler’s cooldown. Ready in {days} days.', {
            days:giftDays
          })
          : FB.T(
            'Cash costs {money:cost} at this rank for +{amount} {standing}; armory items grant their quality value. (spends the day)', {
              cost:FB.rulerCashGiftCost(s, rid),
              amount:FB.rulerCashGiftOpinion(),
              standing:giftStanding
            }))) + '</span></button>' +
        '<button class="actionbtn" id="rm-cultivate">🤝 ' +
        esc(FB.T('Cultivate relationship…')) +
        '<span class="adesc">' + esc(FB.T(
          'Visit {name} at the capital and remain at least {days} days; Standing advances only while you are there.', {
            name:r.ruler.name,
            days:FBDATA.balance.travelMinStayDays || 90
          })) + '</span></button>';
      if (rulerCharacter) {
        h += '<button class="actionbtn" id="rm-character">' +
          esc(FB.T('Open full character sheet')) +
          '<span class="adesc">' + esc(FB.T(
            'View personal relationships, courtship, marriage, and other applicable dealings.')) +
          '</span></button>';
      }
    }
    if (family.length) {
      h += '<div class="panelh">' + esc(FB.T('Ruler’s family and succession')) + '</div>';
      for (const child of family) {
        const age = Math.max(0, s.date.year - child.born);
        const isHeir = succession && succession.heirId === child.id;
        const directChild = succession &&
          (child.parentId || null) === (succession.rulerMemberId || null);
        h += '<div class="progressnote">' + esc(FB.T('{name} · {relation}, age {age}{heir}', {
          name: child.name,
          relation: directChild
            ? (child.sex === 'm' ? FB.T('son') : FB.T('daughter'))
            : (child.sex === 'm' ? FB.T('kinsman') : FB.T('kinswoman')),
          age: age,
          heir: isHeir ? FB.T(' · designated heir') : ''
        })) + '</div>';
        const me = s.chars[s.player.charId];
        const station = r.rank <= 2 ? 3 : 4;
        const canTry = mayApproach && age >= 16 && child.sex !== me.sex &&
          !FB.royalCompactOf(s) && FB.canWed(s) &&
          !(FB.royalCloseKin && FB.royalCloseKin(s, me, {
            royalLine: { realmId: rid, memberId: child.id }
          })) &&
          station - FB.playerStation(s) < 3;
        if (canTry) {
          const royalTogether = s.player.travel
            ? s.player.travel.phase === 'arrived' &&
              s.player.travel.currentId === r.capital
            : s.player.provinceId === r.capital;
          h += '<button class="actionbtn" data-royal-child="' + esc(child.id) + '">' +
            esc(royalTogether
              ? FB.T('🌷 Approach {name} for courtship', { name:child.name })
              : FB.T('🧭 Travel to approach {name} for courtship…', {
                name:child.name
              })) +
            '<span class="adesc">' + esc(isHeir
              ? FB.T('The designated heir can transmit the crown to your shared branch.')
              : FB.T('This creates a dynastic tie, but this child does not currently transmit the crown.')) +
            '</span></button>';
        }
      }
    }
    if (foreignSovereign) {
      h += kv('Foreign policy', esc(FB.isForeignPolicyTarget(s, rid)
        ? foreignPolicyStanceText(s, rid) : FB.T('Out of reach')));
      if (FB.isForeignPolicyTarget(s, rid)) {
        h += '<button class="btn" id="gm-policy">' + esc(FB.T('Set foreign policy')) + '</button>';
      }
    }
    const returnsToGovernance = returnContext &&
      returnContext.view === 'governance';
    h += '<button class="btn" id="gm-cancel">' +
      esc(returnsToGovernance ? FB.T('Back') : FB.T('Close')) + '</button>';
    openModal(rid === s.player.liege
      ? FB.T('Your Liege') : FB.T('Realm Ruler'), h,
      returnsToGovernance ? {
        historyView:true,
        historyBackRender:function () {
          UI.showGovernance(returnContext.section || 'position');
        }
      } : undefined);
    FB.drawCrest($('liegecrest'), rid);
    if ($('gm-policy')) $('gm-policy').addEventListener('click', function () {
      UI.showForeignPolicyStance(rid);
    });
    if ($('rm-gift')) $('rm-gift').addEventListener('click', function () {
      UI.showRulerGiftModal(rid, returnsToGovernance
        ? 'realm:governance:' + (returnContext.section || 'position')
        : 'ruler');
    });
    if ($('rm-cultivate')) $('rm-cultivate').addEventListener('click', function () {
      const c = FB.materializeRealmRuler(s, rid);
      if (!c) return;
      const presence = FB.socialAttentionPresence(s, c);
      if (presence.status === 'active') UI.showCharModal(c.id);
      else UI.showSocialVisit(c.id, { returnRealmId:rid });
    });
    if ($('rm-character')) $('rm-character').addEventListener('click', function () {
      const c = FB.realmRulerCharacter(s, rid);
      if (c) UI.showCharModal(c.id);
    });
    document.querySelectorAll('[data-royal-child]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const c = FB.materializeRoyalChild(s, rid, btn.dataset.royalChild);
        if (!c || !FB.canCourt(s, c)) return;
        const presence = FB.socialAttentionPresence(s, c);
        if (presence.status !== 'active') {
          UI.showSocialVisit(c.id, { courtship:true, returnRealmId:rid });
          return;
        }
        UI.closeModal();
        if (!FB.beginCourtship(s, c)) return;
        FB.news(s, FB.msg('news.social.royal_courting_begins',
          '🌷 You begin courting {name} of {realm}.', { name: FB.fullName(c), realm: r.name }));
        FB.game.passDay({ skipFocus: true });
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      if (returnsToGovernance) {
        modalHistoryBack(function () {
          UI.showGovernance(returnContext.section || 'position');
        });
      } else {
        UI.closeModal();
      }
    });
  };

  /* Grant one abstract local Craft or Trade guild a monopoly. The first
     sheet is the profession picker; the second repeats every frozen term
     before the deed spends its day. Generic action buttons keep number-key
     selection and the narrow mobile sheet behavior. */
  UI.showGuildMonopolyGrant = function (profession) {
    const s = FB.state;
    const status = FB.guildMonopolyIssueStatus(s);
    if (!status.ready) {
      UI.toast(status.reason);
      return;
    }
    function professionName(id) {
      const def = FBDATA.careers[id];
      return dt(s, 'career', id, def, 'name');
    }
    function termsSummary() {
      return FB.T(
        '{years} years · receive {money:fee} now · +{tax}% tax · +{enterprise}% matching enterprise profit · {opinion} popular opinion',
        {
          years:status.terms.years,
          fee:status.terms.rulerFee,
          tax:Math.round(status.terms.taxBonus * 100),
          enterprise:Math.round(status.terms.enterpriseBonus * 100),
          opinion:status.terms.popularOpinion
        });
    }
    if (profession !== 'craftsman' && profession !== 'merchant') {
      let h = '<div class="gm-body-text"><p>' + esc(FB.T(
        'Choose the profession that receives exclusive local privilege. One outgoing charter may exist at a time, alongside any incoming charter held by the household.')) +
        '</p></div><div class="gm-list">';
      for (const id of ['craftsman', 'merchant']) {
        const def = FBDATA.careers[id];
        h += '<button class="actionbtn" data-monopoly-profession="' + id + '">' +
          esc(def.icon + ' ' + professionName(id)) +
          '<span class="adesc">' + esc(termsSummary()) + '</span></button>';
      }
      h += '</div><button class="btn" id="gm-cancel">' +
        esc(FB.T('Not now')) + '</button>';
      openModal(FB.T('Grant a Guild Monopoly'), h);
      document.querySelectorAll('[data-monopoly-profession]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          UI.showGuildMonopolyGrant(btn.dataset.monopolyProfession);
        });
      });
      $('gm-cancel').addEventListener('click', UI.closeModal);
      return;
    }

    const advocate = FB.householdWorkers(s).filter(function (c) {
      if (c.id === s.player.charId || c.dead) return false;
      const career = FB.careerOf(s, c);
      return career && career.profession === profession &&
        career.guildRank === 'guildmaster';
    })[0];
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Grant the local {profession} guild exclusive privilege?', {
        profession:professionName(profession)
      })) + '</p>' +
      (advocate ? '<p>' + esc(FB.T(
        '{advocate}, a household guildmaster, will present the guild’s case; the charter belongs to the local guild, not to that person.', {
          advocate:FB.fullName(advocate)
        })) + '</p>' : '') +
      '<p>' + esc(FB.T(
        'The treasury receives {money:fee} immediately. For {years} years, your tax income rises by {tax}% and matching staffed family enterprises gain {enterprise}% profit. Popular opinion changes by {opinion}.',
        {
          fee:status.terms.rulerFee,
          years:status.terms.years,
          tax:Math.round(status.terms.taxBonus * 100),
          enterprise:Math.round(status.terms.enterpriseBonus * 100),
          opinion:status.terms.popularOpinion > 0
            ? '+' + status.terms.popularOpinion : status.terms.popularOpinion
        })) + '</p><p class="hint">' + esc(FB.T(
          'The charter spends the day and cannot be renewed, revoked, or replaced before it ends. It ends early only if the dynasty loses landed authority.')) +
      '</p></div><button class="btn primary" id="gm-confirm-monopoly">' +
      esc(FB.T('Grant the {profession} monopoly', {
        profession:professionName(profession)
      })) + '</button> <button class="btn" id="gm-back">' +
      esc(FB.T('Back')) + '</button>';
    openModal(FB.T('{profession} Monopoly', {
      profession:professionName(profession)
    }), h, {
      historyView:true,
      historyBackRender:function () { UI.showGuildMonopolyGrant(); }
    });
    $('gm-confirm-monopoly').addEventListener('click', function () {
      if (!FB.issueGuildMonopoly(FB.state, profession)) return;
      UI.closeModal();
      if (FB.game && FB.game.passDay) FB.game.passDay({ skipFocus:true });
    });
    $('gm-back').addEventListener('click', function () {
      modalHistoryBack(function () { UI.showGuildMonopolyGrant(); });
    });
  };

  /* give a demesne county — or a whole duchy — to a sworn man */
  UI.showGrantLand = function () {
    const s = FB.state;
    let h = '<p class="hint">' + esc(FB.T('A vassal holds the land in your name, pays taxes each season, sends part of its levy to your host, and remembers the grant in their Standing. Your dignity still counts land held through vassals.')) + '</p>';
    const cap = FB.domainCap(s), held = (s.player.provs || []).length;
    h += '<p class="hint">' + esc(FB.T('Held directly: {held} of {cap}.', { held: held, cap: cap })) +
      (held > cap ? ' ⚠ ' + esc(FB.T('Over your limit — your own income and levy are cut until you grant land away.')) : '') + '</p>';
    const duchies = FB.grantableDuchies(s);
    if (duchies.length) {
      h += '<div class="panelh">' + esc(FB.T('Raise a duke over a duchy you hold in full')) + '</div><div class="gm-list">';
      for (const d of duchies) {
        h += '<button class="actionbtn" data-did="' + esc(d.did) + '">👑 ' + esc(d.name) +
          '<span class="adesc">' + esc(FB.T('{count} counties', { count: d.counties.length })) + '</span></button>';
      }
      h += '</div>';
    }
    h += '<div class="panelh">' + esc(FB.T('Grant a single county')) + '</div><div class="gm-list">';
    for (const pid of s.player.provs) {
      const pr = FB.world.byId[pid];
      h += '<button class="actionbtn" data-pid="' + esc(pid) + '">🏰 ' + esc(pr.name) +
        '<span class="adesc">' + esc(FB.T('dev {development} · {terrain}', {
          development: s.dev[pid] || 1, terrain: terrainName(pr.terrain)
        })) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">' + esc(FB.T('Not now')) + '</button>';
    openModal(FB.T('Grant Land'), h);
    document.querySelectorAll('[data-did]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.grantDuchy(FB.state, btn.dataset.did);
        UI.closeModal(); UI.refresh();
      });
    });
    document.querySelectorAll('[data-pid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.grantCounty(FB.state, btn.dataset.pid);
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  function governanceRealmLink(s, rid, label, section) {
    const realm = rid && s.realms[rid];
    if (!realm) return esc(label || rid || FB.T('None'));
    return '<button type="button" class="linklike" data-governance-realm="' +
      esc(rid) + '" data-governance-return="' +
      esc(section || 'position') + '">' +
      esc(label || realm.name) + '</button>';
  }

  function governanceCountyLink(pid, label, markers) {
    return '<button type="button" class="linklike" data-governance-county="' +
      esc(pid) + '">' + esc(label) + '</button>' +
      (markers ? ' <span class="governance-markers">' +
        esc(markers) + '</span>' : '');
  }

  function governancePromotionName(progress) {
    if (!progress) return '';
    if (progress.kind === 'duchy') {
      return (FBDATA.duchies[progress.id] || {}).name || progress.id;
    }
    if (progress.kind === 'kingdom') {
      return (FBDATA.kingdoms[progress.id] || {}).name || progress.id;
    }
    return (FBDATA.empires[progress.id] || {}).name || progress.id;
  }

  function governanceActionGroups(s, summary) {
    const groups = [
      {
        title:FB.T('Relationship & legitimacy'),
        ids:['petition_liege', 'petition_county', 'pay_homage',
          'appeal_lord', 'swear_fealty']
      },
      {
        title:FB.T('Domain & grants'),
        ids:['buy_county', 'settle_waste', 'grant_land']
      },
      {
        title:FB.T('Taxation & obligations'),
        ids:['demand_taxes', 'revoke_county', 'debase_coinage']
      },
      {
        title:FB.T('War & independence'),
        ids:['declare_war', 'declare_independence']
      }
    ];
    let h = '';
    for (const group of groups) {
      let rows = '';
      for (const id of group.ids) {
        const status = FB.instantStatus(s, id);
        if (!status.shown || !status.action) continue;
        const action = status.action;
        const detail = status.can
          ? FB.translateKnown(action.desc(s))
          : FB.translateKnown(status.reason);
        rows += '<button type="button" class="actionbtn" ' +
          'data-governance-action="' + esc(id) + '"' +
          (status.can ? '' : ' disabled') + '>' +
          esc(dt(s, 'action', id, action, 'label')) +
          '<span class="adesc">' + esc(detail) + '</span></button>';
      }
      if (rows) {
        h += '<div class="governance-action-group"><h5>' +
          esc(group.title) + '</h5>' + rows + '</div>';
      }
    }
    if (summary.institution === 'estates' ||
        summary.institution === 'council') {
      const institution = summary.institution;
      const actionId = institution === 'estates'
        ? 'the_estates' : 'royal_council';
      const status = FB.instantStatus(s, actionId);
      if (status.shown && status.action) {
        h += '<div class="governance-action-group"><h5>' +
          esc(FB.T('Institution management')) + '</h5>' +
          '<button type="button" class="actionbtn" ' +
          'data-governance-institution="' + institution + '">' +
          esc(dt(s, 'action', actionId, status.action, 'label')) +
          '<span class="adesc">' +
          esc(FB.translateKnown(status.action.desc(s))) +
          '</span></button></div>';
      }
    }
    return h || '<div class="hint">' + esc(FB.T(
      'No political deed applies to the current position.')) + '</div>';
  }

  function governancePositionHtml(s, summary) {
    const home = summary.homeCountyId && FB.world.byId[summary.homeCountyId];
    const capital = summary.capitalCountyId &&
      FB.world.byId[summary.capitalCountyId];
    const playerRealm = summary.playerRealmId &&
      s.realms[summary.playerRealmId];
    const role = summary.role === 'vassal'
      ? FB.T('Sworn subject')
      : (summary.role === 'crowned'
        ? FB.T('Crowned ruler')
        : FB.T('Independent ruler'));
    let constraint = FB.T('No active war or banner service.');
    if (s.player.war) {
      const enemy = s.realms[s.player.war.enemy];
      constraint = FB.T('Personally at war with {realm}.', {
        realm:enemy ? enemy.name : s.player.war.enemy
      });
    } else if (summary.servingLiegeWar) {
      constraint = FB.T('Serving in the direct liege’s host.');
    } else if (FB.playerRealmAtWar(s)) {
      constraint = FB.T('The realm is at war; you are not personally serving.');
    }
    let h = kv('Current title', esc(FB.styledTitle(s))) +
      kv('Player realm', esc(playerRealm
        ? playerRealm.name
        : FB.T('Barony at {county}', {
          county:home ? home.name : summary.homeCountyId
        }))) +
      kv('Political role', esc(role));
    if (summary.liegeId) {
      h += kv('Direct liege', governanceRealmLink(
        s, summary.liegeId, null, 'obligations'));
    }
    if (summary.sovereignId === 'player') {
      h += kv('Top sovereign', esc(playerRealm
        ? playerRealm.name : FB.T('Your realm')));
    } else if (summary.sovereignId) {
      h += kv('Top sovereign', governanceRealmLink(
        s, summary.sovereignId, null, 'position'));
    }
    if (capital) {
      h += kv('Capital', governanceCountyLink(
        capital.id, capital.name,
        capital.id === summary.homeCountyId ? FB.T('home') : ''));
    }
    if (home && (!capital || capital.id !== home.id)) {
      h += kv('Household home', governanceCountyLink(
        home.id, home.name,
        summary.directCounties.indexOf(home.id) >= 0
          ? FB.T('held directly') : FB.T('not held directly')));
    }
    h += '<div class="progressnote' +
      (summary.warnings.length ? ' warnote' : '') + '">' +
      esc(constraint) + '</div>';
    return h;
  }

  function governanceDomainHtml(s, summary) {
    const percent = Math.round(summary.domainMultiplier * 1000) / 10;
    const multiplier = Math.round(summary.domainMultiplier * 10000) / 10000;
    let h = kv('Held directly', esc(FB.T('{held} of {cap} counties', {
      held:summary.directCounties.length,
      cap:summary.domainCap
    }))) +
      kv('Realm-wide territory', esc(countyCountText(
        s, summary.realmCounties.length))) +
      kv('Direct tax & levy multiplier', esc(FB.T(
        '×{multiplier} ({percent}% of normal)', {
          multiplier:multiplier,
          percent:percent
        })));
    if (summary.domainExcess) {
      h += '<div class="progressnote warnote">' + esc(FB.T(
        'Counties over the limit: {count}. The multiplier applies to your own demesne tax and levy, not vassal contributions.', {
          count:summary.domainExcess
        })) + '</div>';
    }
    if (!summary.directCounties.length) {
      h += '<div class="hint">' + esc(FB.T(
        'This barony is a territorial office inside the home county; no county is held directly in your hand.')) + '</div>';
    }
    for (const pid of summary.directCounties) {
      const province = FB.world.byId[pid];
      if (!province) continue;
      const markers = [];
      if (pid === summary.capitalCountyId) markers.push(FB.T('capital'));
      if (pid === summary.homeCountyId) markers.push(FB.T('home'));
      h += '<div class="governance-county-row">' +
        governanceCountyLink(pid, province.name, markers.join(' · ')) +
        '<span>' + esc(FB.T('development {development}', {
          development:s.dev[pid] || 1
        })) + '</span></div>';
    }
    const grantStatus = FB.instantStatus(s, 'grant_land');
    if (grantStatus.shown) {
      h += '<div class="governance-subhead">' +
        esc(FB.T('Grantable holdings')) + '</div>';
      for (const item of summary.grantableDuchies) {
        const duchy = FBDATA.duchies[item.id];
        h += '<button type="button" class="actionbtn" ' +
          'data-governance-action="grant_land"' +
          (grantStatus.can ? '' : ' disabled') + '>👑 ' +
          esc(FB.T('Grant the complete Duchy of {duchy}…', {
            duchy:duchy ? duchy.name : item.id
          })) + '<span class="adesc">' +
          esc(countyCountText(s, item.countyIds.length)) +
          '</span></button>';
      }
      if (summary.directCounties.length >= 2) {
        h += '<button type="button" class="actionbtn" ' +
          'data-governance-action="grant_land"' +
          (grantStatus.can ? '' : ' disabled') + '>🏰 ' +
          esc(FB.T('Grant a directly held county…')) +
          '<span class="adesc">' + esc(grantStatus.can
            ? FB.T('Open the existing grant flow and keep at least one county in your own hand.')
            : grantStatus.reason) + '</span></button>';
      }
    }
    if (summary.promotion) {
      const progress = summary.promotion;
      const kind = progress.kind === 'duchy'
        ? FB.T('ducal title')
        : (progress.kind === 'kingdom'
          ? FB.T('royal title') : FB.T('imperial title'));
      h += '<div class="progressnote">' + esc(FB.T(
        'Best current progress toward a {kind}: {name}, {have} of {total}; {need} required.', {
          kind:kind,
          name:governancePromotionName(progress),
          have:progress.have,
          total:progress.total,
          need:progress.need
        })) + '</div>';
    }
    return h;
  }

  function governanceObligationsHtml(s, summary) {
    if (!summary.liegeId) {
      const targets = FB.foreignPolicyTargets
        ? FB.foreignPolicyTargets(s).length : 0;
      return '<div class="progressnote">' + esc(FB.T(
        'Independent: no liege receives an aid or may summon your banner. Neighboring sovereign courts currently in foreign-policy reach: {count}.', {
          count:targets
        })) + '</div>' +
        kv('Lifetime service under a liege', esc(String(summary.warService)));
    }
    const liege = s.realms[summary.liegeId];
    const sovereign = summary.sovereignId &&
      s.realms[summary.sovereignId];
    const terms = summary.obligations || {
      aid:FBDATA.balance.parliamentAidBase || 0.25,
      scutage:false
    };
    let service = FB.T('Not currently serving');
    if (summary.servingLiegeWar) service = FB.T('Riding with the liege’s host');
    else if ((s.eventQueue || []).some(function (item) {
      return item && item.id === 'liege_summons';
    })) service = FB.T('A banner summons is pending');
    let h = kv('Direct liege', governanceRealmLink(
      s, summary.liegeId, liege && liege.name, 'obligations')) +
      (summary.sovereignId && summary.sovereignId !== summary.liegeId
        ? kv('Top sovereign', governanceRealmLink(
          s, summary.sovereignId, sovereign && sovereign.name, 'obligations'))
        : '') +
      kv('Standing with liege', standingSpan(FB.standingOf(s, {
        kind:'realm', id:summary.liegeId
      }))) +
      kv('The liege’s aid', esc(FB.T('{percent}% of noble revenue', {
        percent:Math.round(terms.aid * 100)
      }))) +
      kv('Banner obligation', esc(terms.scutage
        ? FB.T('Scutage — silver may answer the summons')
        : FB.T('Personal service or the ordinary buy-out'))) +
      kv('Lifetime war service', esc(String(summary.warService))) +
      kv('Current summons', esc(service));
    return h;
  }

  function governanceVassalsHtml(s, summary) {
    if (!summary.directVassals.length) {
      return '<div class="hint">' + esc(FB.T(
        'No realm is sworn directly to you. Counties held in your own hand appear under Domain.')) + '</div>';
    }
    let h = '';
    for (const item of summary.directVassals) {
      const realm = s.realms[item.realmId];
      if (!realm) continue;
      const favor = FB.vassalLevyFavorStatus(s, item.realmId);
      const office = item.councilSeatId
        ? councilSeatName(item.councilSeatId) : FB.T('No Council office');
      const promise = item.exceptionalLevyUntil
        ? FB.T('Days remaining: {days}', {
          days:item.exceptionalLevyUntil - s.turn
        }) : FB.T('None');
      h += '<div class="governance-vassal">' +
        '<div class="governance-vassal-head"><div>' +
        governanceRealmLink(s, item.realmId, realm.name, 'vassals') +
        '<span>' + esc(FB.T('{title} {ruler}', {
          title:FB.realmRankTitle(s, realm),
          ruler:realm.ruler ? realm.ruler.name : realm.name
        })) + '</span></div>' +
        standingSpan(item.standing) + '</div>' +
        '<div class="governance-vassal-stats">' +
        kv('Territory', esc(countyCountText(s, item.countyIds.length))) +
        kv('Seasonal tax contribution', esc(FB.money(
          Math.round(item.taxContribution * 10) / 10))) +
        kv('Host levy contribution', esc(menText(
          s, Math.round(item.levyContribution * 10) / 10))) +
        kv('Council office', esc(office)) +
        kv('Exceptional levy', esc(promise)) +
        '</div><div class="governance-inline-actions">' +
        '<button type="button" class="btn small" data-governance-gift="' +
        esc(item.realmId) + '">' + esc(FB.T('Offer a gift…')) + '</button>' +
        '<button type="button" class="btn small" data-governance-vassal-levy="' +
        esc(item.realmId) + '"' + (favor.ready ? '' : ' disabled') + '>' +
        esc(FB.T('Ask for exceptional levy')) + '</button></div>' +
        '<div class="cmeta">' + esc(favor.ready
          ? FB.T('Adds {percent}% levy for one year and lowers Standing by 15. (spends the day)', {
            percent:Math.round(
              (FBDATA.balance.vassalLevyFavorRate || 0.05) * 100)
          })
          : favor.reason) + '</div></div>';
    }
    return h;
  }

  function governanceInstitutionHtml(s, summary) {
    if (summary.institution === 'estates' && summary.estates) {
      const estates = summary.estates;
      const redress = FB.parliamentMotionStatus(s, 'redress');
      const scutage = FB.parliamentMotionStatus(s, 'scutage');
      let h = kv('The liege’s aid', esc(FB.T('{percent}%', {
        percent:Math.round(estates.aid * 100)
      }))) +
        kv('Scutage', esc(estates.scutage ? FB.T('In force') : FB.T('Not granted'))) +
        kv('Session status', esc(estates.pendingEventIds.length
          ? FB.T('A session or motion is pending')
          : FB.T('{chance}% yearly chance; no sitting is currently pending', {
            chance:Math.round(estates.sessionChance * 100)
          }))) +
        kv('Motion this year', esc(estates.motionUsed
          ? FB.T('Already used') : FB.T('Available'))) +
        kv('Vote chance', esc(FB.T('{chance}%', {
          chance:Math.round(estates.vote.total * 100)
        }))) +
        '<div class="governance-vote-factors">' +
        standingEffectRow(FB.T('Base'), estates.vote.base * 100) +
        standingEffectRow(FB.T('Rank'), estates.vote.rank * 100) +
        standingEffectRow(FB.T('Diplomacy'), estates.vote.diplomacy * 100) +
        standingEffectRow(FB.T('Prestige'), estates.vote.prestige * 100) +
        standingEffectRow(FB.T('Standing'), estates.vote.standing * 100) +
        standingEffectRow(FB.T('Traits'), estates.vote.traits * 100) +
        '</div><div class="hint">' + esc(FB.T(
          'Available motions: redress — {redress}; scutage — {scutage}.', {
            redress:redress.ready ? FB.T('ready') : redress.reason,
            scutage:scutage.ready ? FB.T('ready') : scutage.reason
          })) + '</div>' +
        '<button type="button" class="actionbtn" ' +
        'data-governance-institution="estates">🏛 ' +
        esc(FB.T('Open Estates management…')) +
        '<span class="adesc">' + esc(FB.T(
          'Review the terms and put an eligible yearly motion to the hall.')) +
        '</span></button>';
      return h;
    }
    if (summary.institution === 'council' && summary.council) {
      const council = summary.council;
      let h = kv('Crown Authority', esc(FB.T('{authority}/100', {
        authority:Math.round(council.authority)
      }))) +
        kv('Consent threshold', esc(FB.T('Below {threshold}', {
          threshold:council.consentBelow
        }))) +
        kv('Charter threshold', esc(FB.T(
          '{threshold}+ with a sour Council', {
            threshold:council.charterAbove
          }))) +
        kv('Average direct-vassal Standing', standingSpan(
          council.averageVassalStanding));
      if (!council.formed) {
        h += '<div class="progressnote">' + esc(FB.T(
          'The great offices have not formed yet; the next simulation boundary will establish them.')) + '</div>';
      }
      if (council.needsConsent) {
        h += '<div class="progressnote warnote">' + esc(FB.T(
          'Weak authority blocks extraordinary taxes and revocation.')) + '</div>';
      }
      if (council.schemerIds.length) {
        h += '<div class="progressnote warnote">' + esc(FB.T(
          'Schemer warning — affected Council seats: {count}.', {
            count:council.schemerIds.length
          })) + '</div>';
      }
      if (council.sycophantIds.length) {
        h += '<div class="progressnote">' + esc(FB.T(
          'Sycophant tendency — affected Council seats: {count}.', {
            count:council.sycophantIds.length
          })) + '</div>';
      }
      for (const seat of council.seats) {
        const def = FB.councilSeat(seat.id);
        const realm = seat.holderId && s.realms[seat.holderId];
        h += '<div class="governance-seat' +
          (!realm || !seat.effective ? ' governance-seat-warning' : '') +
          '"><b>' + (def ? def.icon + ' ' : '') +
          esc(councilSeatName(seat.id)) + '</b><span>' +
          (realm
            ? governanceRealmLink(s, seat.holderId,
              realm.ruler ? realm.ruler.name : realm.name, 'institution') +
              ' · ' + standingSpan(seat.standing)
            : esc(FB.T('Vacant'))) +
          '</span><small>' + esc(councilSeatDesc(seat.id)) +
          (realm && !seat.effective
            ? ' · ' + esc(FB.T('inactive at hostile Standing')) : '') +
          '</small></div>';
      }
      h += '<button type="button" class="actionbtn" ' +
        'data-governance-institution="council">🏛 ' +
        esc(FB.T('Open Royal Council management…')) +
        '<span class="adesc">' + esc(FB.T(
          'Appoint officers, replace holders, dismiss councillors, and offer gifts.')) +
        '</span></button>';
      return h;
    }
    return '<div class="progressnote">' + esc(FB.T(
      'No simulated institution applies. Independent counts and dukes govern their own domain without the liege’s Estates or a Royal Council.')) +
      '</div>';
  }

  /* One authoritative political sheet. Its summary is derived and opening
     or navigating it never heals or writes simulation state. */
  UI.showGovernance = function (sectionId) {
    if (typeof sectionId !== 'string') sectionId = null;
    const s = FB.state;
    const summary = FB.governanceSummary && FB.governanceSummary(s);
    if (!summary) {
      UI.toast(FB.T('Governance is available only to a territorial landed ruler.'));
      return;
    }
    let h = '<nav class="governance-nav" aria-label="' +
      esc(FB.T('Governance sections')) + '">';
    const sections = [
      ['position', FB.T('Position')],
      ['domain', FB.T('Domain')],
      ['obligations', summary.liegeId
        ? FB.T('Liege & obligations') : FB.T('Independence')],
      ['vassals', FB.T('Vassals')],
      ['institution', FB.T('Institution')],
      ['actions', FB.T('Political actions')]
    ];
    for (const item of sections) {
      h += '<button type="button" class="btn small" data-governance-section="' +
        item[0] + '">' + esc(item[1]) + '</button>';
    }
    h += '</nav><div class="governance-sections">' +
      '<section class="governance-card" id="governance-position" tabindex="-1">' +
      '<h4>' + esc(FB.T('Political position')) + '</h4>' +
      governancePositionHtml(s, summary) + '</section>' +
      '<section class="governance-card" id="governance-domain" tabindex="-1">' +
      '<h4>' + esc(FB.T('Domain')) + '</h4>' +
      governanceDomainHtml(s, summary) + '</section>' +
      '<section class="governance-card" id="governance-obligations" tabindex="-1">' +
      '<h4>' + esc(summary.liegeId
        ? FB.T('Liege & obligations')
        : FB.T('Independence & foreign contact')) + '</h4>' +
      governanceObligationsHtml(s, summary) + '</section>' +
      '<section class="governance-card governance-wide" ' +
      'id="governance-vassals" tabindex="-1"><h4>' +
      esc(FB.T('Direct vassals')) + '</h4>' +
      governanceVassalsHtml(s, summary) + '</section>' +
      '<section class="governance-card" id="governance-institution" tabindex="-1">' +
      '<h4>' + esc(summary.institution === 'estates'
        ? FB.T('The Estates') : (summary.institution === 'council'
          ? FB.T('The Royal Council') : FB.T('Institution'))) + '</h4>' +
      governanceInstitutionHtml(s, summary) + '</section>' +
      '<section class="governance-card" id="governance-actions" tabindex="-1">' +
      '<h4>' + esc(FB.T('Political actions')) + '</h4>' +
      governanceActionGroups(s, summary) + '</section></div>' +
      '<div class="gm-footer"><button type="button" class="btn" ' +
      'id="governance-close">' + esc(FB.T('Close')) + '</button></div>';
    openModal(FB.T('🏛 Governance'), h, {
      modalClass:'fullsheet-modal governance-modal'
    });
    document.querySelectorAll('[data-governance-section]').forEach(
      function (button) {
        button.addEventListener('click', function () {
          const section = $('governance-' + button.dataset.governanceSection);
          if (!section) return;
          section.scrollIntoView({ block:'start' });
          section.focus({ preventScroll:true });
        });
      });
    document.querySelectorAll('[data-governance-realm]').forEach(
      function (button) {
        button.addEventListener('click', function (event) {
          event.stopPropagation();
          UI.showLiegeModal(button.dataset.governanceRealm, {
            view:'governance',
            section:button.dataset.governanceReturn || 'position'
          });
        });
      });
    document.querySelectorAll('[data-governance-county]').forEach(
      function (button) {
        button.addEventListener('click', function () {
          const pid = button.dataset.governanceCounty;
          UI.closeModal();
          UI.selectProvince(pid);
        });
      });
    document.querySelectorAll('[data-governance-action]').forEach(
      function (button) {
        button.addEventListener('click', function () {
          FB.runInstant(FB.state, button.dataset.governanceAction);
        });
      });
    document.querySelectorAll('[data-governance-gift]').forEach(
      function (button) {
        button.addEventListener('click', function () {
          UI.showRulerGiftModal(button.dataset.governanceGift, 'governance');
        });
      });
    document.querySelectorAll('[data-governance-vassal-levy]').forEach(
      function (button) {
        button.addEventListener('click', function () {
          if (!FB.callVassalLevyFavor(
              s, button.dataset.governanceVassalLevy)) return;
          UI.closeModal();
          FB.game.passDay({ skipFocus:true });
        });
      });
    document.querySelectorAll('[data-governance-institution]').forEach(
      function (button) {
        button.addEventListener('click', function () {
          if (button.dataset.governanceInstitution === 'estates') {
            UI.showParliament('governance');
          } else {
            UI.showCouncil('governance');
          }
        });
      });
    $('governance-close').addEventListener('click', UI.closeModal);
    if (sectionId) {
      setTimeout(function () {
        const section = $('governance-' + sectionId);
        if (!section) return;
        section.scrollIntoView({ block:'start' });
        section.focus({ preventScroll:true });
      }, 0);
    }
  };

  function councilAssignmentCard(s, seat, rid, oldRid, selected, data) {
    const realm = rid && s.realms[rid];
    if (!realm) return '';
    const oldRealm = oldRid && s.realms[oldRid];
    let consequence = FB.T('Gains +10 Standing; no one is displaced from this vacant seat.');
    if (selected) consequence = FB.T('Keeps the current office.');
    else if (oldRealm) {
      consequence = FB.T(
        'Replaces {name}; the former officer loses 8 Standing and the appointee gains 10 Standing.',
        { name:oldRealm.ruler.name });
    }
    return personAssignmentCard({
      name:realm.ruler.name,
      art:FB.crestTag(rid, 34, 40),
      selected:selected,
      disabled:selected,
      eligibility:selected ? FB.T('Current officer') : FB.T('Eligible unseated vassal'),
      data:data || {},
      rows:[
        { label:'Expected benefit', value:councilSeatDesc(seat.id) },
        { label:'Cost / pay', value:selected
          ? FB.T('No household wage')
          : FB.T('No household wage; appointment lowers crown authority by 2.') },
        { label:'Current position', value:FB.T('Ruler of {realm}', { realm:realm.name }) },
        { label:'Standing', value:standingText(FB.standingOf(s, {
          kind:'realm', id:rid
        })) },
        { label:'Current assignment', value:selected
          ? councilSeatName(seat.id) : FB.T('No council office') },
        { label:'Consequence', kind:'consequence', value:consequence }
      ]
    });
  }

  /* the Royal Council (tier 6+): the great officers of the crown — seats,
     holders, tempers, and crown authority. Gifts and dismissals act at once;
     appointment cards preview vacant seats and deliberate replacements. */
  UI.showCouncil = function (returnView) {
    if (returnView !== 'governance') returnView = null;
    const s = FB.state;
    const projection = FB.councilSummary(s);
    if (!projection) return;
    const seats = {};
    for (const projectedSeat of projection.seats) {
      seats[projectedSeat.id] = projectedSeat.holderId;
    }
    const B = FBDATA.balance;
    let h = '<p class="hint">' + esc(FB.T(
      'The great officers of the crown lend their strength to yours — but magnates have tempers, and the council weighs every act of the crown.')) + '</p>';
    h += '<div class="kv"><span>' + esc(FB.T('Crown authority')) + '</span><b>' +
      Math.round(projection.authority) + '/100</b></div>';
    if (!projection.formed) {
      h += '<p class="hint">' + esc(FB.T(
        'The council has not yet assembled. Appointing an officer will convene it.')) + '</p>';
    }
    if (projection.needsConsent) {
      h += '<p class="hint">⚠ ' + esc(FB.T(
        'The council now outweighs the crown: extraordinary taxes and revocations are beyond you until authority mends (below {limit}).',
        { limit: B.councilConsentBelow || 35 })) + '</p>';
    } else {
      h += '<p class="hint">' + esc(FB.T(
        'High-handed acts raise authority but sour the magnates; pressed too far, they will demand a charter of liberties. Weak authority ties the crown’s hands.')) + '</p>';
    }
    const seated = {};
    for (const seat of FB.councilSeats()) {
      if (seats[seat.id]) seated[seats[seat.id]] = 1;
    }
    const unseated = FB.playerVassals(s).filter(function (vid) { return !seated[vid]; });
    for (const seat of FB.councilSeats()) {
      const rid = seats[seat.id];
      const r = rid ? s.realms[rid] : null;
      h += '<div class="panelh">' + seat.icon + ' ' + esc(councilSeatName(seat.id)) + '</div>';
      h += '<div class="cmeta">' + esc(councilSeatDesc(seat.id)) + '</div>';
      if (r) {
        const op = FB.standingOf(s, { kind:'realm', id:rid });
        const trait = r.ruler.trait && FBDATA.traits[r.ruler.trait]
          ? dt(s, 'trait', r.ruler.trait, FBDATA.traits[r.ruler.trait], 'name') : '';
        h += '<div class="charcard"><canvas class="pface" width="56" height="64" id="crest_' + esc(seat.id) + '"></canvas>' +
          '<div><div class="ccname">' + esc(r.ruler.name) + '</div>' +
          '<div class="ccmeta">' + esc(r.name) + (trait ? ' · ' + esc(trait) : '') + '</div>' +
          '<div class="ccmeta ' + standingClass(op) + '">' +
          esc(FB.T('Standing {standing}', {
            standing:standingText(op)
          })) + '</div>' +
          '<div style="margin-top:6px">' +
          '<button class="btn" data-council-gift="' + esc(rid) + '">🎁 ' +
          esc(FB.T('Offer a gift…')) + '</button> ' +
          (unseated.length
            ? '<button class="btn" data-council-assign="' + esc(seat.id) + '">🏛 ' +
              esc(FB.T('Choose another officer…')) + '</button> '
            : '') +
          '<button class="btn" data-dismiss="' + esc(seat.id) + '">' + esc(FB.T('Dismiss')) + '</button>' +
          '</div></div></div>';
      } else {
        h += '<div class="cmeta">' + esc(FB.T('Vacant.')) + '</div>';
        if (unseated.length) {
          for (const vid of unseated) {
            h += councilAssignmentCard(s, seat, vid, null, false, {
              appoint:seat.id + '|' + vid
            });
          }
        } else {
          h += '<div class="cmeta">' + esc(FB.T('No unseated vassal remains to raise — grant land to loyal men, and offices will follow.')) + '</div>';
        }
      }
    }
    h += '<button class="btn" id="gm-cancel">' +
      esc(returnView === 'governance' ? FB.T('Back') : FB.T('Close')) +
      '</button>';
    openModal(FB.T('The Royal Council'), h, returnView === 'governance' ? {
      historyView:true,
      historyBackRender:function () { UI.showGovernance('institution'); }
    } : undefined);
    for (const seat of FB.councilSeats()) {
      const cv = $('crest_' + seat.id);
      if (cv && seats[seat.id]) FB.drawCrest(cv, seats[seat.id]);
    }
    FB.paintCrests($('gm-body'));
    document.querySelectorAll('[data-council-gift]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        UI.showRulerGiftModal(btn.dataset.councilGift,
          returnView === 'governance' ? 'council:governance' : 'council');
      });
    });
    document.querySelectorAll('[data-council-assign]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        UI.showCouncilCandidates(btn.dataset.councilAssign, returnView);
      });
    });
    document.querySelectorAll('[data-dismiss]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.councilDismiss(FB.state, btn.dataset.dismiss);
        UI.showCouncil(returnView);
      });
    });
    document.querySelectorAll('[data-appoint]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const parts = btn.dataset.appoint.split('|');
        FB.councilAppoint(FB.state, parts[0], parts[1]);
        UI.showCouncil(returnView);
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      if (returnView === 'governance') {
        modalHistoryBack(function () { UI.showGovernance('institution'); });
      } else {
        UI.closeModal();
        UI.refresh();
      }
    });
  };

  UI.showCouncilCandidates = function (seatId, returnView) {
    const s = FB.state;
    const projection = FB.councilSummary(s);
    const seat = FB.councilSeat(seatId);
    if (!projection || !seat) return;
    const seats = {};
    for (const projectedSeat of projection.seats) {
      seats[projectedSeat.id] = projectedSeat.holderId;
    }
    const oldRid = seats[seatId] || null;
    const seated = {};
    for (const item of FB.councilSeats()) {
      if (seats[item.id]) seated[seats[item.id]] = 1;
    }
    const candidates = FB.playerVassals(s).filter(function (rid) {
      return !seated[rid];
    });
    let h = '<p class="hint">' + esc(FB.T(
      'Choose an unseated vassal for this office. Appointment changes Standing and crown authority immediately; it does not create a household pay contract.')) +
      '</p><div class="gm-list">';
    if (oldRid && s.realms[oldRid]) {
      h += councilAssignmentCard(s, seat, oldRid, oldRid, true, {});
    }
    for (const rid of candidates) {
      h += councilAssignmentCard(s, seat, rid, oldRid, false, {
        councilCandidate:rid
      });
    }
    if (!candidates.length) {
      h += '<div class="hint">' + esc(FB.T(
        'No unseated vassal is available for this office.')) + '</div>';
    }
    h += '</div><button class="btn" id="council-candidates-back">' +
      esc(FB.T('Back')) + '</button>';
    openModal(seat.icon + ' ' + FB.T('Appoint {office}', {
      office:councilSeatName(seat.id)
    }), h, {
      historyView:true,
      historyBackRender:function () { UI.showCouncil(returnView); }
    });
    FB.paintCrests($('gm-body'));
    document.querySelectorAll('[data-council-candidate]').forEach(function (button) {
      button.addEventListener('click', function () {
        const rid = button.dataset.councilCandidate;
        FB.councilAppoint(s, seat.id, rid);
        if (!s.council || s.council.seats[seat.id] !== rid) return;
        modalHistoryBack(function () { UI.showCouncil(returnView); });
        UI.refresh();
      });
    });
    $('council-candidates-back').addEventListener('click', function () {
      modalHistoryBack(function () { UI.showCouncil(returnView); });
    });
  };

  /* the estates of the realm (vassal tiers 3-5): the terms of the player's
     service, and the motions they can buy between sittings — see
     js/parliament.js for the machinery and FB.parliamentYearly for sessions */
  UI.showParliament = function (returnView) {
    if (returnView !== 'governance') returnView = null;
    const s = FB.state;
    const projection = FB.parliamentSummary(s);
    if (!projection) return;
    const liege = s.realms[s.player.liege];
    const cost = projection.motionCost;
    let h = '<p class="hint">' + esc(FB.T(
      'When {liege} summons the estates, the lords of the realm haggle over the terms of service — and your voice in the hall grows with your rank, your diplomacy, your name, and your Standing with the liege.',
      { liege: liege.name })) + '</p>';
    h += '<div class="kv"><span>' + esc(FB.T('The liege’s aid')) + '</span><b>' +
      esc(FB.T('{pct}% of your noble revenue', {
        pct:Math.round(projection.aid * 100)
      })) + '</b></div>';
    h += '<div class="kv"><span>' + esc(FB.T('Banner service')) + '</span><b>' +
      (projection.scutage
        ? esc(FB.T('Scutage — silver answers the summons'))
        : esc(FB.T('Spears — you must ride, or pay dearly'))) + '</b></div>';
    h += '<div class="kv"><span>' + esc(FB.T('Your voice in the hall')) + '</span><b>' +
      Math.round(projection.vote.total * 100) + '%</b></div>';
    h += '<p class="hint">' + esc(FB.T(
      'Between sittings you can put a motion of your own before the estates — it costs {money:cost} in gifts and promises, and the lords will hear but one motion a year.',
      { cost: cost })) + '</p>';
    if (projection.motionUsed) {
      h += '<p class="hint">' + esc(FB.T('The estates have heard your motion this year; they will take another come the new year.')) + '</p>';
    }
    const redress = FB.parliamentMotionStatus(s, 'redress');
    const scutage = FB.parliamentMotionStatus(s, 'scutage');
    h += '<div class="gm-list">';
    h += '<button class="actionbtn" data-motion="redress"' +
      (redress.ready ? '' : ' disabled') + '>⚖ ' +
      esc(FB.T('Move for redress of grievances ({money:cost})', { cost: cost })) +
      '<span class="adesc">' + esc(redress.reason || FB.T(
        'Put it to a vote: the liege’s aid down one step, if the hall backs you.')) +
      '</span></button>';
    h += '<button class="actionbtn" data-motion="scutage"' +
      (scutage.ready ? '' : ' disabled') + '>🛡 ' +
      esc(FB.T('Move for scutage ({money:cost})', { cost: cost })) +
      '<span class="adesc">' + esc(scutage.reason || FB.T(
        'Put it to a vote: silver for banner service — the aid creeps up in exchange.')) +
      '</span></button>';
    h += '</div>';
    h += '<button class="btn" id="gm-cancel">' +
      esc(returnView === 'governance' ? FB.T('Back') : FB.T('Close')) +
      '</button>';
    openModal(FB.T('The Estates'), h, returnView === 'governance' ? {
      historyView:true,
      historyBackRender:function () { UI.showGovernance('institution'); }
    } : undefined);
    document.querySelectorAll('[data-motion]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!FB.parliamentMove(s, btn.dataset.motion)) return;
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      if (returnView === 'governance') {
        modalHistoryBack(function () { UI.showGovernance('institution'); });
      } else {
        UI.closeModal();
        UI.refresh();
      }
    });
  };

  /* demand a fief back from a vassal */
  UI.showRevoke = function () {
    const s = FB.state;
    let h = '<p class="hint">Demand a fief back into your own hand. A contented vassal yields; a bitter one answers with spears.</p><div class="gm-list">';
    for (const vid of FB.playerVassals(s)) {
      const r = s.realms[vid];
      h += '<button class="actionbtn" data-rid="' + esc(vid) + '">📜 ' + esc(r.name) +
        '<span class="adesc">' + esc(FB.T('{ruler} · Standing {standing}', {
          ruler:r.ruler.name,
          standing:standingText(FB.standingOf(s, { kind:'realm', id:vid }))
        })) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">Not now</button>';
    openModal('Revoke a County', h);
    document.querySelectorAll('[data-rid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const rid = btn.dataset.rid;
        FB.state.player.revokeRid = rid;
        FB.queueEvent(FB.state, 'vassal_revoke', { rid:rid });
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  /* ================= coin & credit ================= */

  function financeAmount(value) {
    return Math.round(value * 10) / 10;
  }

  function financeDate(season, year) {
    return FB.T('{season} {year}', { season:FB.seasonName(season), year:year });
  }

  function financeFullDate(date) {
    return FB.T('{season} day {day}, {year}', {
      season:FB.seasonName(date.season),
      day:date.day,
      year:date.year
    });
  }

  function financeDateAfter(s, seasons) {
    const n = s.date.season + seasons;
    return { season:n % 4, year:s.date.year + Math.floor(n / 4) };
  }

  function financeKindName(kind) {
    if (kind === 'pledge') return FB.T('Pledged loan');
    if (kind === 'merchant') return FB.T('Merchant advance');
    if (kind === 'revenue') return FB.T('Loan against revenues');
    return FB.T('Financial contract');
  }

  function financeAssetName(s, collateral) {
    if (!collateral) return FB.T('None');
    if (collateral.kind === 'item' && FB.resolveItem) {
      const item = FB.resolveItem(s, collateral.id);
      return item ? item.def.icon + ' ' + FB.itemName(s, collateral.id) : collateral.id;
    }
    const table = collateral.kind === 'item' ? FBDATA.items : FBDATA.holdings;
    const def = table && table[collateral.id];
    if (!def) return collateral.id;
    return (def.icon || '') + (def.icon ? ' ' : '') +
      dt(s, collateral.kind, collateral.id, def, 'name');
  }

  function financeDefaultText(s, contract) {
    if (contract.defaultKind === 'collateral' && contract.collateral) {
      return FB.T('{asset} is taken, prestige falls, and lenders refuse the household for four seasons.', {
        asset:financeAssetName(s, contract.collateral)
      });
    }
    return FB.T('One quarter of regular revenues is assigned until the debt is cleared; prestige and political standing fall, and lenders refuse the household for four seasons.');
  }

  function financeOfferCountText(s, count) {
    return FB.renderMessage(FB.msg('fx.ui.finance_offer_count', {
      forms: {
        select:'plural', param:'count', cases:{
          one:'One exact offer is available.',
          other:'{count} exact offers are available.'
        }
      }
    }, { count:count }), { state:s, viewer:s.player.charId });
  }

  function financeDebtCountText(s, count, amount) {
    return FB.renderMessage(FB.msg('fx.ui.finance_debt_count', {
      forms: {
        select:'plural', param:'count', cases:{
          one:'One obligation worth {money:amount} passes with the household.',
          other:'{count} obligations worth {money:amount} pass with the household.'
        }
      }
    }, { count:count, amount:amount }), { state:s, viewer:s.player.charId });
  }

  function financeLoanCard(s, loan) {
    const due = financeAmount(FB.financeDueNow(s, loan));
    const nominal = loan.denomination !== 'real';
    const canRepay = loan.status !== 'default' && s.player.gold + 0.000001 >= due;
    let h = '<div class="progressnote' +
      (loan.status === 'arrears' || loan.status === 'default' ? ' warnote' : '') + '">' +
      '<b>' + esc(financeKindName(loan.kind)) + '</b> · ' +
      esc(FB.T('{money:amount} due {date}', {
        amount:due, date:financeDate(loan.dueSeason, loan.dueYear)
      })) +
      '<br><span class="hint">' +
      esc(nominal
        ? FB.T('Face value {money:face} in nominal coin; its purchasing value moves with prices.', {
          face:financeAmount(loan.face)
        })
        : FB.T('Weight-denominated contract; price movement does not change the amount due.')) +
      '</span>';
    if (loan.collateral) {
      h += '<br><span class="hint">' + esc(FB.T('Pledged: {asset}', {
        asset:financeAssetName(s, loan.collateral)
      })) + '</span>';
    }
    h += '<br><span class="hint">' + esc(FB.T(
      'First miss: 10% face penalty and two more seasons. Default: {consequence}', {
        consequence:financeDefaultText(s, loan)
      })) + '</span>';
    if (loan.status === 'arrears') {
      h += '<br><span class="op-bad">' + esc(FB.T('In arrears — the next missed deadline defaults.')) + '</span>';
    } else if (loan.status === 'default') {
      h += '<br><span class="op-bad">' + esc(FB.T('In default — assigned revenues are paying this down.')) + '</span>';
    }
    if (loan.status !== 'default') {
      h += '<button class="btn" data-finance-repay="' + loan.id + '"' +
        (canRepay ? '' : ' disabled') + ' style="margin-top:8px">' +
        esc(FB.T('Repay now ({money:amount})', { amount:due })) + '</button>';
    }
    return h + '</div>';
  }

  UI.showFinance = function () {
    const s = FB.state;
    const e = FB.ensureEconomy(s);
    const loans = FB.financeActiveLoans(s).slice().sort(function (a, b) {
      return a.dueTurn - b.dueTurn || a.id - b.id;
    });
    const partnerships = FB.financeActivePartnerships(s);
    const ventures = FB.financeActiveTradeVentures(s);
    const offers = FB.financeLoanOffers(s);
    const stakes = FB.tradeInvestmentStakes(s);
    const ventureEligible = FB.tradeVentureEligible(s, 'dispatch');
    let h = '';

    /* Obligations lead the sheet so a narrow phone shows the urgent date
       before background metrics or optional transactions. */
    if (loans.length) {
      h += panelh('Urgent obligations');
      for (const loan of loans) h += financeLoanCard(s, loan);
    }

    h += panelh('Coin and household means') +
      '<div class="gm-body-text">' +
      kv('Purse', esc(FB.T('{money:amount}', { amount:financeAmount(s.player.gold) }))) +
      kv('Price index', esc(financeAmount(e.price))) +
      kv('Last annual movement', esc(FB.T('{rate}%', {
        rate:(e.lastRate > 0 ? '+' : '') + financeAmount(e.lastRate * 100)
      }))) +
      kv('Coin and prices this year', '<span class="' +
        (e.lastAdjustment > 0 ? 'op-good' : e.lastAdjustment < 0 ? 'op-bad' : '') + '">' +
        esc(FB.T('{money:amount}', { amount:financeAmount(e.lastAdjustment) })) + '</span>') +
      kv('Reliable seasonal net', '<span class="' +
        (FB.reliableGoldIncome(s) > 0 ? 'op-good' : 'op-bad') + '">' +
        esc(FB.T('{money:amount}', { amount:financeAmount(FB.reliableGoldIncome(s)) })) +
        '</span>') +
      kv('Unsecured credit capacity', esc(FB.T('{money:amount}', {
        amount:financeAmount(FB.financeCreditCapacity(s, null, false))
      }))) +
      kv('Defaults remembered', esc(e.defaults)) +
      '<p class="hint">' + esc(FB.T(
        'Capacity comes from reliable income, eligible collateral, and a capped allowance for standing, less current obligations. Windfalls and new loans do not count.')) +
      '</p></div>';

    h += panelh('Loans');
    if (!loans.length) {
      h += '<div class="progressnote">' + esc(FB.T('No active household obligations.')) + '</div>';
    }
    h += '<div class="gm-list"><button class="actionbtn" id="finance-borrow"' +
      (offers.length ? '' : ' disabled') + '>📜 ' + esc(FB.T('Seek a loan…')) +
      '<span class="adesc">' + esc(offers.length
        ? financeOfferCountText(s, offers.length)
        : (FB.financeHasDefault(s)
          ? FB.T('No lender will advance more while revenues are in default.')
          : FB.T('No offer fits the household’s income, collateral, or current obligations.'))) +
      '</span></button></div>';

    h += panelh('Your trade venture');
    if (ventures.length) {
      for (const inv of ventures) {
        const destination = FB.world.byId[inv.destinationId];
        const dueDate = inv.dueDate || FB.dateAtTurn(s, inv.dueTurn);
        h += '<div class="progressnote"><b>' +
          esc(inv.strategy === 'bold'
            ? FB.T('Bold venture to {destination}', {
              destination:destination ? destination.name : inv.destinationId
            })
            : FB.T('Cautious venture to {destination}', {
              destination:destination ? destination.name : inv.destinationId
            })) + '</b> · ' +
          esc(FB.T('{money:stake} invested · resolves {date}', {
            stake:inv.stake, date:financeFullDate(dueDate)
          })) + '<br><span class="hint">' +
          esc(FB.T('{money:overhead} route overhead was paid separately.', {
            overhead:inv.overhead || 0
          })) + '</span></div>';
      }
    } else {
      h += '<div class="progressnote">' +
        esc(FB.T('No self-founded venture is active.')) + '</div>';
    }
    h += '<div class="gm-list"><button class="actionbtn" id="finance-own-venture"' +
      (ventureEligible === true ? '' : ' disabled') + '>⚖ ' +
      esc(FB.T('Form your own venture…')) +
      '<span class="adesc">' + esc(ventureEligible === true
        ? FB.T('Choose a stake and developed market, then dispatch it or travel with it.')
        : ventureEligible) +
      '</span></button></div>';

    h += panelh('Back another merchant’s venture');
    if (partnerships.length) {
      for (const inv of partnerships) {
        h += '<div class="progressnote"><b>' + esc(FB.tradePartnershipName(s)) + '</b> · ' +
          esc(FB.T('{money:stake} at risk · matures {date}', {
            stake:inv.stake, date:financeDate(inv.dueSeason, inv.dueYear)
          })) + '</div>';
      }
    } else {
      h += '<div class="progressnote">' +
        esc(FB.T('No coin is backing another merchant’s venture.')) + '</div>';
    }
    if (stakes.length) {
      h += '<div class="gm-list">';
      for (const stake of stakes) {
        const can = FB.canStartTradeInvestment(s, stake);
        h += '<button class="actionbtn" data-finance-invest="' + stake + '"' +
          (can ? '' : ' disabled') + '>🧭 ' +
          esc(FB.T('Back with {money:stake}…', { stake:stake })) +
          '<span class="adesc">' + esc(FB.T(
            'Back another merchant’s four-season venture for a share of its profit or loss.')) +
          '</span></button>';
      }
      h += '</div>';
    }

    if (s.player.tier >= 6 && !s.player.liege) {
      h += panelh('The crown’s coinage') + '<div class="gm-list">' +
        '<button class="actionbtn" id="finance-debase"' +
        (FB.financeCanDebase(s) ? '' : ' disabled') + '>💰 ' +
        esc(FB.T('Debase the coinage…')) +
        '<span class="adesc">' + esc(FB.T(
          'Take seigniorage now; harm prices, prestige, popular trust, and future credit.')) +
        '</span></button>' +
        (FB.financeCanRecoin(s)
          ? '<button class="actionbtn" id="finance-recoin">⚖ ' +
            esc(FB.T('Restore the coinage…')) +
            '<span class="adesc">' + esc(FB.T(
              'Pay to call in light coin, restore weight, and press prices back toward stability.')) +
            '</span></button>'
          : '') + '</div>';
    }

    h += '<div class="gm-footer"><button class="btn" id="finance-close">' +
      esc(FB.T('Close')) + '</button></div>';
    openModal(FB.T('💰 Coin & Credit'), h, { modalClass:'fullsheet-modal' });
    $('finance-close').addEventListener('click', UI.closeModal);
    const borrow = $('finance-borrow');
    if (borrow) borrow.addEventListener('click', UI.showFinanceBorrow);
    const ownVenture = $('finance-own-venture');
    if (ownVenture) ownVenture.addEventListener('click', function () {
      UI.showTradeVentureSetup('finance');
    });
    document.querySelectorAll('[data-finance-repay]').forEach(function (button) {
      button.addEventListener('click', function () {
        UI.showFinanceRepay(parseInt(button.dataset.financeRepay, 10));
      });
    });
    document.querySelectorAll('[data-finance-invest]').forEach(function (button) {
      button.addEventListener('click', function () {
        UI.showFinanceInvestment(parseInt(button.dataset.financeInvest, 10));
      });
    });
    const debase = $('finance-debase');
    if (debase) debase.addEventListener('click', UI.showDebasement);
    const recoin = $('finance-recoin');
    if (recoin) recoin.addEventListener('click', UI.showRecoinage);
  };

  UI.showFinanceBorrow = function () {
    const s = FB.state;
    const offers = FB.financeLoanOffers(s);
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Every offer fixes its face value and deadline when signed. Review collateral and default terms before accepting.')) +
      '</p></div><div class="gm-list">';
    for (let i = 0; i < offers.length; i++) {
      const offer = offers[i];
      const preview = FB.financeLoanPreview(s, offer);
      const details = offer.collateral
        ? FB.T('Receive {money:principal} · {money:due} due {date} · pledge {asset}', {
          principal:offer.principal, due:financeAmount(preview.dueNow),
          date:financeDate(preview.dueSeason, preview.dueYear),
          asset:financeAssetName(s, offer.collateral)
        })
        : FB.T('Receive {money:principal} · {money:due} due {date}', {
          principal:offer.principal, due:financeAmount(preview.dueNow),
          date:financeDate(preview.dueSeason, preview.dueYear)
        });
      h += '<button class="actionbtn" data-finance-offer="' + i + '">📜 ' +
        esc(financeKindName(offer.kind)) +
        '<span class="adesc">' + esc(details) + '</span></button>';
    }
    h += '</div><button class="btn" id="finance-back">' + esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Seek a loan'), h);
    document.querySelectorAll('[data-finance-offer]').forEach(function (button) {
      button.addEventListener('click', function () {
        const offer = offers[parseInt(button.dataset.financeOffer, 10)];
        if (offer) UI.showFinanceLoanConfirm(offer.kind, offer.collateral);
      });
    });
    $('finance-back').addEventListener('click', UI.showFinance);
  };

  UI.showFinanceLoanConfirm = function (kind, collateral) {
    const s = FB.state;
    let offer = null;
    for (const item of FB.financeLoanOffers(s)) {
      const a = item.collateral, b = collateral;
      if (item.kind === kind && ((!a && !b) ||
        (a && b && a.kind === b.kind && a.id === b.id))) { offer = item; break; }
    }
    if (!offer) { UI.showFinance(); return; }
    const preview = FB.financeLoanPreview(s, offer);
    let h = '<div class="gm-body-text">' +
      '<p><b>' + esc(financeKindName(kind)) + '</b></p>' +
      kv('Receive now', esc(FB.T('{money:amount}', { amount:offer.principal }))) +
      kv('Current value due', esc(FB.T('{money:amount}', {
        amount:financeAmount(preview.dueNow)
      }))) +
      kv('Due', esc(financeDate(preview.dueSeason, preview.dueYear))) +
      kv('Pledged collateral', esc(financeAssetName(s, offer.collateral))) +
      '<p>' + esc(preview.denomination === 'real'
        ? FB.T('This contract is reckoned by weight: price changes do not change the amount due.')
        : FB.T('Face value: {money:face} in nominal coin. What that face value can buy may rise or fall with prices.', {
          face:financeAmount(preview.face)
        })) + '</p>' +
      '<p><b>' + esc(FB.T('First missed payment:')) + '</b> ' +
      esc(FB.T('10% is added to the signed face and the deadline moves two seasons.')) + '</p>' +
      '<p><b>' + esc(FB.T('Second missed payment:')) + '</b> ' +
      esc(financeDefaultText(s, preview)) + '</p></div>' +
      '<div class="gm-list"><button class="actionbtn" id="finance-sign">📜 ' +
      esc(FB.T('Sign and receive {money:amount}', { amount:offer.principal })) +
      '</button></div><button class="btn" id="finance-cancel">' + esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Confirm the contract'), h);
    $('finance-sign').addEventListener('click', function () {
      if (FB.takeFinanceLoan(s, kind, collateral)) UI.showFinance();
      else UI.showFinanceBorrow();
    });
    $('finance-cancel').addEventListener('click', UI.showFinanceBorrow);
  };

  UI.showFinanceRepay = function (id) {
    const s = FB.state;
    let loan = null;
    for (const item of FB.financeActiveLoans(s)) if (item.id === id) loan = item;
    if (!loan || loan.status === 'default') { UI.showFinance(); return; }
    const due = financeAmount(FB.financeDueNow(s, loan));
    const h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Pay {money:amount} now and clear this obligation. There is no early-payment penalty.', {
        amount:due
      })) + '</p></div><div class="gm-list">' +
      '<button class="actionbtn" id="finance-pay">⚖ ' +
      esc(FB.T('Repay {money:amount}', { amount:due })) +
      '</button></div><button class="btn" id="finance-cancel">' + esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Repay early?'), h);
    $('finance-pay').addEventListener('click', function () {
      FB.repayFinanceLoan(s, id, false);
      UI.showFinance();
    });
    $('finance-cancel').addEventListener('click', UI.showFinance);
  };

  UI.showFinanceInvestment = function (stake) {
    const s = FB.state;
    if (!FB.canStartTradeInvestment(s, stake)) { UI.showFinance(); return; }
    const def = FBDATA.finance.tradePartnership;
    const due = financeDateAfter(s, def.termSeasons);
    const h = '<div class="gm-body-text">' +
      kv('Backing arrangement', esc(FB.tradePartnershipName(s))) +
      kv('Stake now', esc(FB.T('{money:amount}', { amount:stake }))) +
      kv('Maturity', esc(financeDate(due.season, due.year))) +
      kv('Risk of total loss', esc(FB.T('{amount}%', {
        amount:Math.round(def.risk * 100)
      }))) +
      '<p>' + esc(FB.T(
        'You are backing another merchant, not leading this venture. This is profit-and-loss sharing, not a fixed loan. The stake leaves now; at maturity it may be lost, partly recovered, or returned with profit. The outcome is resolved once.')) +
      '</p></div><div class="gm-list"><button class="actionbtn" id="finance-invest-confirm">🧭 ' +
      esc(FB.T('Back with {money:amount}', { amount:stake })) +
      '</button></div><button class="btn" id="finance-cancel">' + esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Back another merchant’s venture'), h);
    $('finance-invest-confirm').addEventListener('click', function () {
      FB.startTradeInvestment(s, stake, 'finance');
      UI.showFinance();
    });
    $('finance-cancel').addEventListener('click', UI.showFinance);
  };

  UI.showDebasement = function () {
    const s = FB.state;
    if (!FB.financeCanDebase(s)) { UI.showFinance(); return; }
    const preview = FB.financeDebasePreview(s);
    const h = '<div class="gm-body-text">' +
      kv('Immediate seigniorage', esc(FB.T('{money:amount}', { amount:preview.gold }))) +
      kv('Price pressure', esc(FB.T('+{amount}% for {years} years', {
        amount:financeAmount(preview.pressure * 100), years:preview.years
      }))) +
      '<p class="op-bad">' + esc(FB.T(
        'Prestige and popular trust will fall. Repeated debasement worsens loan terms, and sophisticated lenders may demand repayment by weight. Existing nominal debts become easier in real terms by design.')) +
      '</p></div><div class="gm-list"><button class="actionbtn op-bad" id="finance-debase-confirm">💰 ' +
      esc(FB.T('Debase the coinage')) +
      '</button></div><button class="btn" id="finance-cancel">' + esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Debase the coinage?'), h);
    $('finance-debase-confirm').addEventListener('click', function () {
      FB.debaseCoinage(s);
      UI.showFinance();
    });
    $('finance-cancel').addEventListener('click', UI.showFinance);
  };

  UI.showRecoinage = function () {
    const s = FB.state;
    if (!FB.financeCanRecoin(s)) { UI.showFinance(); return; }
    const preview = FB.financeRecoinPreview(s);
    const h = '<div class="gm-body-text">' +
      kv('Cost now', esc(FB.T('{money:amount}', { amount:preview.cost }))) +
      kv('Price pressure', esc(FB.T('{amount}% for {years} years', {
        amount:financeAmount(preview.pressure * 100), years:preview.years
      }))) +
      '<p>' + esc(FB.T(
        'Calling in the light coin restores weight and confidence over time. Active contracts keep the denomination they were signed under.')) +
      '</p></div><div class="gm-list"><button class="actionbtn" id="finance-recoin-confirm">⚖ ' +
      esc(FB.T('Spend {money:amount} and restore the coin', { amount:preview.cost })) +
      '</button></div><button class="btn" id="finance-cancel">' + esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Restore the coinage?'), h);
    $('finance-recoin-confirm').addEventListener('click', function () {
      FB.recoinCurrency(s);
      UI.showFinance();
    });
    $('finance-cancel').addEventListener('click', UI.showFinance);
  };

  /* ================= household standards & permanent holdings ================= */
  function householdStandardScope(s, def) {
    if (def.kind !== 'work') return FB.T('Commoner household');
    const career = FBDATA.careers && FBDATA.careers[def.profession];
    return career
      ? FB.T('{profession} work and enterprises', {
        profession:dt(s, 'career', def.profession, career, 'name')
      })
      : FB.T('Matching household work and enterprises');
  }

  function householdStandardTransferRule() {
    return FB.T('Passes to the next household head; cannot be sold or pledged');
  }

  function holdingEffectText(def) {
    const fx = (def && def.fx) || {};
    const parts = [];
    if (fx.gold) parts.push(FB.T(
      '{money:amount} each season · shown in Money each season', {
        amount:fx.gold
      }));
    if (fx.prestige) parts.push(FB.T('{amount} prestige each season', {
      amount:fx.prestige
    }));
    if (fx.piety) parts.push(FB.T('{amount} piety each season', {
      amount:fx.piety
    }));
    if (fx.battle) parts.push(FB.T('+{amount}% battle odds', {
      amount:Math.round(fx.battle * 100)
    }));
    if (fx.edu) parts.push(FB.T('+{amount}% education success chance', {
      amount:Math.round(fx.edu * 1000) / 10
    }));
    if (fx.health) parts.push(FB.T(
      '−{amount} percentage points yearly household mortality', {
        amount:Math.round(fx.health * 10000) / 100
      }));
    return parts.join(' · ');
  }

  function holdingTransferRule(def) {
    return def && (def.pledge === false || def.eventOnly)
      ? FB.T('Passes to heirs; cannot secure credit')
      : FB.T('Passes to heirs; may secure credit when eligible');
  }

  function householdStandardRow(s, id) {
    const def = FBDATA.householdStandards[id];
    const level = FB.householdStandardLevel(s, id);
    const current = level && def.levels[level - 1];
    const active = FB.householdStandardActive(s, id);
    const next = level < def.levels.length ? def.levels[level] : null;
    const detail = level
      ? FB.T('Level {level}: {name}', {
        level:level, name:householdStandardLevelName(s, id, level)
      })
      : FB.T('Baseline — no maintained improvement');
    return '<button class="actionbtn household-standard" data-household-standard="' +
      esc(id) + '">' + esc((def.icon || '🏠') + ' ' + householdStandardName(s, id)) +
      '<span class="adesc">' + esc(detail) + '</span>' +
      assetEffectSummary({
        compact:true,
        owner:FB.T('Household dynasty'),
        scope:householdStandardScope(s, def),
        setupCost:next
          ? assetMoneyCost(next.cost, s.player.gold >= (Number(next.cost) || 0))
          : FB.T('Highest level reached'),
        recurringCost:active && current
          ? assetSeasonalMoneyCost(current.upkeep) : FB.T('None while dormant'),
        effect:level && active
          ? householdStandardLevelDesc(s, id, level)
          : level ? FB.T('Dormant — no current benefit') : FB.T('No maintained improvement'),
        transferRule:householdStandardTransferRule(),
        expiry:FB.T('No fixed end; may lapse when upkeep cannot be paid')
      }) + '</button>';
  }

  function householdStandardPreview(s, id, level) {
    const map = FB.ensureHouseholdStandards(s);
    const hadLevel = Object.prototype.hasOwnProperty.call(map, id);
    const previous = map[id];
    let preview;
    try {
      if (level) map[id] = level;
      else delete map[id];
      preview = {
        upkeep:FB.householdStandardsUpkeep(s),
        net:FB.reliableGoldIncome(s)
      };
    } finally {
      if (hadLevel) map[id] = previous;
      else delete map[id];
    }
    return preview;
  }

  function permanentHoldingsHtml(s) {
    let h = '<div class="panelh">' + esc(FB.T('Permanent household property')) +
      '</div><div class="hint">' + esc(FB.T(
        'Holdings are bought once, pass to heirs, and may be productive, saleable, pledgeable, or useful in combat. Pack Mules, Fine Tools, Good Mail, and Warhorses remain property; maintained transport and work outfits above are living expenses.')) +
      '</div><div class="gm-list">';
    const available = FB.holdingAvailable(s);
    for (const t of available) {
      const short = s.player.gold < t.def.cost;
      h += '<button class="actionbtn" data-holding="' + esc(t.id) + '"' +
        (short ? ' disabled' : '') + '>' +
        esc(FB.T('{icon} {name}', {
          icon:t.def.icon, name:dt(s, 'holding', t.id, t.def, 'name')
        })) + '<span class="adesc">' + esc(dt(s, 'holding', t.id, t.def, 'desc')) +
        '</span>' + assetEffectSummary({
          compact:true,
          owner:FB.T('Household dynasty'),
          scope:FB.T('Permanent family property'),
          setupCost:assetMoneyCost(t.def.cost, !short),
          recurringCost:FB.T('None'),
          effect:holdingEffectText(t.def),
          transferRule:holdingTransferRule(t.def),
          expiry:FB.T('No fixed end; may be lost through events or default')
        }) + '</button>';
    }
    if (!available.length) {
      h += '<div class="hint">' + esc(FB.T(
        'No further permanent holding is available for this station and profession.')) +
        '</div>';
    }
    h += '</div>';
    const done = FB.holdingList(s);
    if (done.length) {
      h += '<div class="panelh">' + esc(FB.T('Owned property')) + '</div>' +
        '<div class="asset-owned-list">';
      for (const id of done) {
        const def = FBDATA.holdings[id];
        if (!def) continue;
        h += '<div class="asset-owned-row"><b>' + def.icon + ' ' +
          esc(dt(s, 'holding', id, def, 'name')) + '</b>' +
          assetEffectSummary({
            compact:true,
            owner:FB.T('Household dynasty'),
            scope:FB.T('Permanent family property'),
            setupCost:FB.T('Already owned'),
            recurringCost:FB.T('None'),
            effect:holdingEffectText(def),
            transferRule:holdingTransferRule(def),
            expiry:FB.T('No fixed end; may be lost through events or default')
          }) + '</div>';
      }
      h += '</div>';
    }
    return h;
  }

  UI.showHousehold = function () {
    const s = FB.state;
    FB.ensureHouseholdStandards(s);
    const upkeep = FB.householdStandardsUpkeep(s);
    const net = FB.reliableGoldIncome(s);
    const projected = s.player.gold + net;
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'These standards sit above basic food and shelter. Each improvement has a setup cost and replaces the previous level’s seasonal upkeep. Benefits are deliberately smaller than their cost: prosperity is something the family may visibly spend.')) +
      '</p>' + kv('Standards upkeep each season', esc(FB.money(upkeep))) +
      kv('Reliable seasonal net', '<span class="' +
        (net < 0 ? 'op-bad' : net > 0 ? 'op-good' : '') + '">' +
        esc(fmtAmt(net, true)) + '</span>') +
      kv('Projected purse after one season', '<span class="' +
        (projected < 0 ? 'op-bad' : '') + '">' + esc(FB.money(projected)) + '</span>') +
      (projected < 0 ? '<p class="op-bad">' + esc(FB.T(
        'The projected purse is negative. Spending is still allowed, but unaffordable standards will lapse at the season boundary without debt or further penalty.')) +
        '</p>' : '') + '</div>';

    h += '<div class="panelh">' + esc(FB.T('Living standards')) + '</div>' +
      '<div class="gm-list">';
    for (const id of FB.householdStandardIds()) {
      const def = FBDATA.householdStandards[id];
      if (def.kind === 'work') continue;
      h += householdStandardRow(s, id);
    }
    h += '</div><div class="panelh">' + esc(FB.T('Work outfits')) + '</div>' +
      '<div class="hint">' + esc(FB.T(
        'An outfit improves paid focus work, resident-family wages or religious yield, and staffed enterprises for its profession. It sleeps without an eligible worker. Soldier outfits never improve combat.')) +
      '</div><div class="gm-list">';
    let outfits = 0;
    for (const id of FB.householdStandardIds()) {
      const def = FBDATA.householdStandards[id];
      if (def.kind !== 'work') continue;
      if (!FB.householdStandardLevel(s, id) &&
          !FB.householdStandardWorkerEligible(s, id)) continue;
      h += householdStandardRow(s, id);
      outfits++;
    }
    if (!outfits) {
      h += '<div class="hint">' + esc(FB.T(
        'No practiced household profession currently has a relevant outfit.')) + '</div>';
    }
    h += '</div>' + permanentHoldingsHtml(s) +
      '<div class="gm-footer"><button class="btn" id="gm-cancel">' +
      esc(FB.T('Done')) + '</button></div>';
    openModal(FB.T('🏠 Household standards & property'), h, {
      modalClass:'fullsheet-modal'
    });
    document.querySelectorAll('[data-household-standard]').forEach(function (button) {
      button.addEventListener('click', function () {
        UI.showHouseholdStandard(button.getAttribute('data-household-standard'));
      });
    });
    document.querySelectorAll('[data-holding]').forEach(function (button) {
      button.addEventListener('click', function () {
        FB.buyHolding(s, button.getAttribute('data-holding'));
        UI.refresh();
        UI.showHousehold();
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  /* Compatibility for older deeds and third-party UI calls. */
  UI.showHoldings = UI.showHousehold;

  UI.showHouseholdStandard = function (id) {
    const s = FB.state;
    const def = FBDATA.householdStandards && FBDATA.householdStandards[id];
    if (!def) { UI.showHousehold(); return; }
    const level = FB.householdStandardLevel(s, id);
    const current = level && def.levels[level - 1];
    const active = FB.householdStandardActive(s, id);
    const availability = FB.householdStandardUpgradeAvailable(s, id);
    const next = level < def.levels.length ? def.levels[level] : null;
    let h = '<div class="gm-body-text"><p>' +
      esc(dt(s, 'householdStandard', id, def, 'desc')) + '</p>' +
      kv('Current level', esc(level
        ? FB.T('{level} — {name}', {
          level:level, name:householdStandardLevelName(s, id, level)
        }) : FB.T('Baseline'))) + assetEffectSummary({
        owner:FB.T('Household dynasty'),
        scope:householdStandardScope(s, def),
        setupCost:level ? FB.T('Paid when each level was established') : FB.T('None'),
        recurringCost:active && current
          ? assetSeasonalMoneyCost(current.upkeep) : FB.T('None while dormant'),
        effect:level && active
          ? householdStandardLevelDesc(s, id, level)
          : level ? FB.T('Dormant — no current benefit') : FB.T('No maintained improvement'),
        transferRule:householdStandardTransferRule(),
        expiry:FB.T('No fixed end; may lapse when upkeep cannot be paid')
      }) + '</div><div class="gm-list">';
    if (next) {
      h += '<button class="actionbtn" id="household-standard-upgrade"' +
        (availability === true ? '' : ' disabled') + '>' +
        esc(FB.T('Improve to level {level}: {name}', {
          level:level + 1,
          name:householdStandardLevelName(s, id, level + 1)
        })) + (availability === true ? '' : '<span class="adesc">' +
          esc(availability) + '</span>') + assetEffectSummary({
          compact:true,
          owner:FB.T('Household dynasty'),
          scope:householdStandardScope(s, def),
          setupCost:assetMoneyCost(next.cost,
            s.player.gold >= (Number(next.cost) || 0)),
          recurringCost:assetSeasonalMoneyCost(next.upkeep),
          effect:householdStandardLevelDesc(s, id, level + 1),
          transferRule:householdStandardTransferRule(),
          expiry:FB.T('No fixed end; may lapse when upkeep cannot be paid')
        }) + '</button>';
    }
    if (level) {
      h += '<button class="actionbtn danger" id="household-standard-reduce">' +
        esc(FB.T('Reduce this standard by one level…')) +
        '<span class="adesc">' + esc(FB.T(
          'No refund. The lost level and its setup investment must be purchased again.')) +
        '</span></button>';
    }
    h += '<button class="actionbtn" id="household-standard-back">' +
      esc(FB.T('Back to household')) + '</button></div>';
    openModal((def.icon || '🏠') + ' ' + householdStandardName(s, id), h, {
      historyView:true,
      modalClass:'fullsheet-modal',
      historyBackRender:function () { UI.showHousehold(); }
    });
    const upgrade = $('household-standard-upgrade');
    if (upgrade) upgrade.addEventListener('click', function () {
      UI.showHouseholdStandardUpgrade(id);
    });
    const reduce = $('household-standard-reduce');
    if (reduce) reduce.addEventListener('click', function () {
      UI.showHouseholdStandardReduction(id);
    });
    $('household-standard-back').addEventListener('click', function () {
      modalHistoryBack(function () { UI.showHousehold(); });
    });
  };

  UI.showHouseholdStandardUpgrade = function (id) {
    const s = FB.state;
    const def = FBDATA.householdStandards && FBDATA.householdStandards[id];
    const level = def ? FB.householdStandardLevel(s, id) : 0;
    const next = def && def.levels[level];
    if (!def || !next || FB.householdStandardUpgradeAvailable(s, id) !== true) {
      UI.showHouseholdStandard(id);
      return;
    }
    const preview = householdStandardPreview(s, id, level + 1);
    const netAfter = preview.net;
    const projected = s.player.gold - (Number(next.cost) || 0) + netAfter;
    let h = '<div class="gm-body-text">' +
      assetEffectSummary({
        owner:FB.T('Household dynasty'),
        scope:householdStandardScope(s, def),
        setupCost:assetMoneyCost(next.cost, true),
        recurringCost:assetSeasonalMoneyCost(next.upkeep),
        effect:householdStandardLevelDesc(s, id, level + 1),
        transferRule:householdStandardTransferRule(),
        expiry:FB.T('No fixed end; may lapse when upkeep cannot be paid')
      }) +
      kv('Projected seasonal net', '<span class="' +
        (netAfter < 0 ? 'op-bad' : netAfter > 0 ? 'op-good' : '') + '">' +
        esc(fmtAmt(netAfter, true)) + '</span>') +
      kv('Projected purse after next season', '<span class="' +
        (projected < 0 ? 'op-bad' : '') + '">' + esc(FB.money(projected)) + '</span>') +
      (projected < 0 ? '<p class="op-bad">' + esc(FB.T(
        'Warning: this projection is negative. The purchase is allowed, but standards will be reduced automatically if the purse cannot meet their upkeep.')) +
        '</p>' : '') + '</div><div class="gm-list">' +
      '<button class="actionbtn" id="household-standard-confirm">' +
      esc(FB.T('Pay {money:cost} and establish {name}', {
        cost:Number(next.cost) || 0,
        name:householdStandardLevelName(s, id, level + 1)
      })) + '</button><button class="actionbtn" id="household-standard-cancel">' +
      esc(FB.T('Back')) + '</button></div>';
    openModal(FB.T('Improve {standard}?', {
      standard:householdStandardName(s, id)
    }), h, {
      historyView:true,
      modalClass:'fullsheet-modal',
      historyBackRender:function () { UI.showHouseholdStandard(id); }
    });
    $('household-standard-confirm').addEventListener('click', function () {
      if (!FB.buyHouseholdStandard(s, id)) return;
      UI.refresh();
      UI.showHousehold();
    });
    $('household-standard-cancel').addEventListener('click', function () {
      modalHistoryBack(function () { UI.showHouseholdStandard(id); });
    });
  };

  UI.showHouseholdStandardReduction = function (id) {
    const s = FB.state;
    const def = FBDATA.householdStandards && FBDATA.householdStandards[id];
    const level = def ? FB.householdStandardLevel(s, id) : 0;
    if (!def || !level) { UI.showHouseholdStandard(id); return; }
    const previous = level > 1 ? def.levels[level - 2] : null;
    const active = FB.householdStandardActive(s, id);
    const preview = householdStandardPreview(s, id, level - 1);
    const netAfter = preview.net;
    const projected = s.player.gold + netAfter;
    const resultName = level > 1
      ? householdStandardLevelName(s, id, level - 1) : FB.T('Baseline');
    const h = '<div class="gm-body-text"><p class="op-bad">' + esc(FB.T(
      'The household will lose {name}. Its setup cost is not refunded, and restoring it later requires paying that full cost again.', {
        name:householdStandardLevelName(s, id, level)
      })) + '</p>' +
      kv('New level', esc(resultName)) +
      assetEffectSummary({
        owner:FB.T('Household dynasty'),
        scope:householdStandardScope(s, def),
        setupCost:FB.T('No refund; repurchase later at full setup cost'),
        recurringCost:active && previous
          ? assetSeasonalMoneyCost(previous.upkeep) : FB.T('None'),
        effect:previous
          ? householdStandardLevelDesc(s, id, level - 1)
          : FB.T('No maintained improvement'),
        transferRule:householdStandardTransferRule(),
        expiry:FB.T('No fixed end; may lapse when upkeep cannot be paid')
      }) +
      kv('Projected seasonal net', '<span class="' +
        (netAfter < 0 ? 'op-bad' : netAfter > 0 ? 'op-good' : '') + '">' +
        esc(fmtAmt(netAfter, true)) + '</span>') +
      kv('Projected purse after next season', '<span class="' +
        (projected < 0 ? 'op-bad' : '') + '">' + esc(FB.money(projected)) + '</span>') +
      '</div><div class="gm-list"><button class="actionbtn danger" ' +
      'id="household-standard-reduce-confirm">' +
      esc(FB.T('Give up this level with no refund')) +
      '</button><button class="actionbtn" id="household-standard-reduce-cancel">' +
      esc(FB.T('Keep it')) + '</button></div>';
    openModal(FB.T('Reduce {standard}?', {
      standard:householdStandardName(s, id)
    }), h, {
      historyView:true,
      modalClass:'fullsheet-modal',
      historyBackRender:function () { UI.showHouseholdStandard(id); }
    });
    $('household-standard-reduce-confirm').addEventListener('click', function () {
      if (!FB.reduceHouseholdStandard(s, id)) return;
      UI.refresh();
      UI.showHousehold();
    });
    $('household-standard-reduce-cancel').addEventListener('click', function () {
      modalHistoryBack(function () { UI.showHouseholdStandard(id); });
    });
  };

  /* ================= freehold land market ================= */
  UI.showLandMarket = function () {
    const s = FB.state;
    const p = s.player;
    const cost = FB.landPlotCost();
    const max = FBDATA.balance.landPlotMaxSettlement ||
      FBDATA.balance.manorPlotRequirement;
    const settlements = FB.settlementsOf(s, p.provinceId);
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Plots pass to your heirs and earn produce each season. Each additional plot in the same settlement makes the whole holding {bonus}% more productive; gather {needed} together to declare a manor.',
      {
        bonus:Math.round((FBDATA.balance.landConsolidationBonus || 0.10) * 100),
        needed:FBDATA.balance.manorPlotRequirement
      })) +
      '</p></div><div class="gm-list">';
    for (let i = 0; i < settlements.length; i++) {
      const count = FB.landCountAt(s, p.provinceId, i);
      const full = count >= max;
      const short = p.gold < cost;
      const batch = FB.manorPlotPurchasePlan(s, i);
      const before = Math.round(FB.landGroupYield(count) * 10) / 10;
      const after = Math.round(FB.landGroupYield(count + 1) * 10) / 10;
      const place = FB.T('{settlement}, {province}', {
        settlement:settlements[i].name,
        province:FB.world.byId[p.provinceId].name
      });
      h += '<button class="actionbtn" data-land-settlement="' + i + '"' +
        (full || short ? ' disabled' : '') + '>🌾 ' +
        esc(FB.T('{settlement} — {count}/{max} plots', {
          settlement:settlements[i].name, count:count, max:max
        })) + (full ? '<span class="adesc">' +
          esc(FB.T('A manor-sized holding is assembled here.')) + '</span>' : '') +
        assetEffectSummary({
          compact:true,
          owner:FB.T('Household dynasty'),
          scope:place,
          setupCost:full ? FB.T('Holding complete') : assetMoneyCost(cost, !short),
          recurringCost:FB.T('None'),
          effect:full
            ? FB.T(
              '{money:amount} seasonal yield from this holding; shown in Money each season', {
                amount:before
              })
            : FB.T(
              '{money:before} → {money:after} seasonal yield here; shown in Money each season', {
              before:before, after:after
            }),
          transferRule:FB.T('Passes to heirs as family land in this settlement'),
          expiry:FB.T('No fixed end')
        }) + '</button>';
      if (batch) {
        h += '<button type="button" class="actionbtn" data-land-batch="' + i + '">' +
          esc(FB.T('Buy remaining plots here…')) +
          '<span class="adesc">' + esc(FB.T(
            '{plots} plots for {money:cost}. Review the complete purchase before paying.', {
              plots:batch.plots, cost:batch.totalCost
            })) + '</span></button>';
      }
    }
    h += '</div><button class="btn" id="gm-cancel">' + esc(FB.T('Not now')) + '</button>';
    openModal(FB.T('🌾 Buy Freehold Land'), h);
    document.querySelectorAll('[data-land-settlement]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (!FB.buyLandPlot(FB.state, parseInt(button.dataset.landSettlement, 10))) return;
        UI.refresh();
        UI.showLandMarket();
      });
    });
    document.querySelectorAll('[data-land-batch]').forEach(function (button) {
      button.addEventListener('click', function () {
        UI.showManorPlotBatchPreview(parseInt(button.dataset.landBatch, 10));
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  UI.showManorPlotBatchPreview = function (settlement) {
    const s = FB.state;
    const plan = FB.manorPlotPurchasePlan(s, settlement);
    if (!plan) {
      UI.showLandMarket();
      return;
    }
    const resultingYield = Math.round(plan.resultingYield * 10) / 10;
    const progress = FB.T(
      '{count}/{needed} plots — ready to declare a manor once the household has enough standing', {
        count:plan.resultingCount, needed:plan.manorRequirement
      });
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'This purchases every plot still needed at {settlement} in one transaction. Review the complete result before confirming.', {
        settlement:plan.settlementName
      })) + '</p>' +
      kv('Plots in this purchase', esc(FB.T('{count} plots', {
        count:plan.plots
      }))) +
      kv('Total price', '<span class="' +
        (plan.affordable ? '' : 'op-bad') + '">' +
        esc(FB.T('{money:amount}', { amount:plan.totalCost })) + '</span>') +
      kv('Resulting seasonal yield', esc(FB.T('{money:amount} each season', {
        amount:resultingYield
      }))) +
      kv('Resulting cluster and manor progress', esc(progress)) +
      kv('Money remaining after purchase', '<span class="' +
        (plan.moneyAfter < 0 ? 'op-bad' : '') + '">' +
        esc(FB.T('{money:amount}', { amount:plan.moneyAfter })) + '</span>') +
      (!plan.affordable ? '<p class="op-bad">' + esc(FB.T(
        'The household cannot afford the complete batch. No plots will be purchased unless the full price is available.')) +
        '</p>' : '') + '</div><div class="gm-footer">' +
      '<button type="button" class="btn" id="manor-plot-batch-confirm"' +
      (plan.affordable ? '' : ' disabled') + '>' +
      esc(FB.T('Buy {plots} plots for {money:cost}', {
        plots:plan.plots, cost:plan.totalCost
      })) + '</button>' +
      '<button type="button" class="btn" id="manor-plot-batch-back">' +
      esc(FB.T('Back')) + '</button></div>';
    openModal(FB.T('🌾 Complete the holding at {settlement}?', {
      settlement:plan.settlementName
    }), h, {
      historyView:true,
      historyBackRender:function () { UI.showLandMarket(); }
    });
    $('manor-plot-batch-confirm').addEventListener('click', function () {
      if (!FB.buyRemainingManorPlots(s, settlement, plan.currentCount)) {
        UI.showManorPlotBatchPreview(settlement);
        return;
      }
      UI.refresh();
      UI.showLandMarket();
    });
    $('manor-plot-batch-back').addEventListener('click', function () {
      modalHistoryBack(function () { UI.showLandMarket(); });
    });
  };

  /* ================= consolidated household plan ================= */
  const HOUSEHOLD_PLAN_RETURN = 'household-plan';

  function returnsToHouseholdPlan(returnContext) {
    return returnContext === HOUSEHOLD_PLAN_RETURN;
  }

  function householdPlanHistoryOptions(returnContext) {
    if (!returnsToHouseholdPlan(returnContext)) return null;
    return {
      historyView:true,
      historyBackRender:function () { UI.showHouseholdPlan(); }
    };
  }

  /* No-day changes made from the plan re-render it from authoritative state.
     Discard any intermediate modal views as their browser-history entries
     unwind, leaving the refreshed plan as the visible generic modal. */
  function finishHouseholdPlanReturn(returnContext, fallback) {
    if (!returnsToHouseholdPlan(returnContext)) {
      fallback();
      return;
    }
    UI.showHouseholdPlan();
    mobileNavClosedAll('modal-view', true);
  }

  function householdPlanLines(primary, secondary, tertiary, warning) {
    return '<span class="household-plan-primary">' + esc(primary) + '</span>' +
      (secondary ? '<span class="household-plan-secondary">' +
        esc(secondary) + '</span>' : '') +
      (tertiary ? '<span class="household-plan-tertiary">' +
        esc(tertiary) + '</span>' : '') +
      (warning ? '<span class="household-plan-warning">' +
        esc(warning) + '</span>' : '');
  }

  function householdPlanCell(label, content, action, cid, target) {
    let h = '<td data-label="' + esc(label) + '">';
    if (action) {
      h += '<button type="button" class="actionbtn household-plan-action" ' +
        'data-household-plan-action="' + esc(action) + '" data-household-plan-cid="' +
        esc(cid) + '"' + (target ? ' data-household-plan-target="' +
          esc(target) + '"' : '') + '>' + content + '</button>';
    } else {
      h += '<div class="household-plan-static">' + content + '</div>';
    }
    return h + '</td>';
  }

  function householdPlanPerson(s, c, kind, retainer) {
    let relationship = FB.T('Resident family');
    if (kind === 'head') relationship = FB.T('Household head');
    else if (kind === 'retainer') {
      relationship = FB.T('Paid retainer · {office}', {
        office:positionName(s, retainer.office)
      });
    } else {
      const head = s.chars[s.player.charId];
      const isSpouse = FB.spousesOf(s, head).some(function (spouse) {
        return spouse.id === c.id;
      });
      relationship = isSpouse ? FB.T('Your spouse') :
        (relationText(s, c) || relationship);
    }
    return '<div class="household-plan-person">' + FB.faceTag(c, 32, 38) +
      '<span>' + householdPlanLines(FB.fullName(c), relationship,
        FB.T('Age {age}', { age:FB.ageOf(c, s.date.year) })) + '</span></div>';
  }

  function educationPolicyAnnotation(s, c, dimension) {
    const provenance = FB.educationPolicyProvenance ?
      FB.educationPolicyProvenance(s, c, dimension) : null;
    if (provenance === 'policy') return FB.T('Selected by household policy');
    if (provenance === 'manual') return FB.T('Manual override');
    if (provenance === 'waiting') return FB.T('Waiting for an education focus');
    return FB.T('No choice recorded');
  }

  function educationTutorOptionName(s, c, option) {
    const tutor = option && option.tutor;
    if (!tutor) return FB.T('Unknown tutor');
    if (option.tutorSource === 'self') return FB.T('Teach them yourself');
    if (option.tutorSource === 'father') {
      return FB.T('{name} (your father)', { name:tutor.name });
    }
    if (option.tutorSource === 'mother') {
      return FB.T('{name} (your mother)', { name:tutor.name });
    }
    if (option.tutorSource === 'spouse') {
      return FB.T(tutor.sex === 'f' ? '{name} (your wife)' :
        '{name} (your husband)', { name:tutor.name });
    }
    if (option.tutorSource === 'priest') {
      const me = s.chars[s.player.charId];
      return FB.T('{name} ({role})', {
        name:tutor.name, role:FB.holyWord(me.religion)
      });
    }
    if (option.tutorSource === 'friend' || option.tutorSource === 'lord') {
      return FB.T('{name} ({role})', {
        name:tutor.name,
        role:option.tutorSource === 'friend' ? FB.T('friend') : FB.T('lord')
      });
    }
    if (option.tutorSource === 'household_tutor') {
      return FB.T('{name} (household tutor)', { name:tutor.name });
    }
    if (option.tutorSource === 'personal_master') {
      return FB.T('{name} (personal master)', { name:tutor.name });
    }
    return tutor.name;
  }

  function educationOptionName(s, c, option) {
    if (!option) return FB.T('Waiting for a focus');
    if (option.kind === 'home') return FB.T('Home instruction');
    if (option.kind === 'tutor') return educationTutorOptionName(s, c, option);
    const def = option.schoolId && FBDATA.schooling[option.schoolId];
    return def ? dt(s, 'schooling', option.schoolId, def, 'name') :
      FB.T('Unknown school');
  }

  function educationRiskWarning(option) {
    const annualMortality = option ?
      Math.min(1, Math.max(0, Number(option.annualMortality) || 0)) : 0;
    if (!annualMortality) return '';
    return FB.T(
      '⚠ Each completed term adds {termRisk}% extra fatality risk at New Year ({annualRisk}% after four terms).', {
        termRisk:Math.round(annualMortality / 4 * 1000) / 10,
        annualRisk:Math.round(annualMortality * 1000) / 10
      });
  }

  function householdPlanEducation(s, c) {
    const age = FB.ageOf(c, s.date.year);
    const focus = c.edu && c.edu.focus ? FB.skillName(c.edu.focus) : '';
    if (age >= 16) {
      return {
        content:householdPlanLines(FB.T('Completed'),
          focus ? FB.T('Focus: {focus}', { focus:focus }) :
            FB.T('No directed study')),
        action:null
      };
    }
    if (c.id !== s.player.charId && !FB.playerDescendantKind(s, c.id)) {
      return {
        content:householdPlanLines(FB.T('Not applicable'),
          FB.T('Education is managed for the household head and descendants')),
        action:null
      };
    }
    return {
      content:householdPlanLines(
        focus || FB.T('No focus chosen'),
        focus ? FB.T('Directed study') : FB.T('Choose a subject'),
        educationPolicyAnnotation(s, c, 'focus')),
      action:'education'
    };
  }

  function householdPlanInstruction(s, c) {
    const age = FB.ageOf(c, s.date.year);
    if (age >= 16) {
      return {
        content:householdPlanLines(FB.T('Completed'),
          FB.T('Instruction ended at age 16')),
        action:null
      };
    }
    if (c.id !== s.player.charId && !FB.playerDescendantKind(s, c.id)) {
      return {
        content:householdPlanLines(FB.T('Not applicable'),
          FB.T('Instruction is managed for the household head and descendants')),
        action:null
      };
    }
    const schoolId = FB.schoolingId(s, c);
    const school = schoolId && FBDATA.schooling[schoolId];
    const tutor = FB.educationTutor(s, c, false);
    const provenance = FB.educationPolicyProvenance ?
      FB.educationPolicyProvenance(s, c, 'instruction') : null;
    let instruction = FB.T('Home instruction');
    if (school) {
      const schoolName = dt(s, 'schooling', schoolId, school, 'name');
      instruction = schoolId === 'master' && tutor
        ? FB.T('{school} · {tutor}', { school:schoolName, tutor:tutor.name })
        : schoolName;
    } else if (tutor) {
      instruction = FB.T('Tutor: {name}', { name:tutor.name });
    }
    const chance = Math.round(Math.min(FBDATA.balance.educationChanceCap || 0.9,
      FB.educationInstructionChance(s, c) + FB.holdingBonus(s, 'edu') +
      (FB.householdStandardEffect ? FB.householdStandardEffect(s, 'education') : 0)) * 100);
    const fee = FB.schoolingCost(s, c);
    const details = fee
      ? FB.T('{chance}% yearly · {money:amount} each season', {
        chance:chance, amount:fee
      })
      : FB.T('{chance}% yearly · free', { chance:chance });
    let warning = '';
    if (c.edu && c.edu.schoolUnpaid) {
      warning = FB.T('Fee unpaid · term paused');
    } else if (age < 6) {
      warning = FB.T('Lessons begin at age 6');
    }
    if (provenance === 'waiting') {
      instruction = FB.T('Waiting for a focus');
    }
    return {
      content:householdPlanLines(instruction,
        provenance === 'waiting'
          ? FB.T('Policy will choose instruction after a focus is set')
          : details,
        educationPolicyAnnotation(s, c, 'instruction'), warning),
      action:'instruction'
    };
  }

  function householdPlanWork(s, c) {
    const age = FB.ageOf(c, s.date.year);
    if (age < 10) {
      return {
        content:householdPlanLines(FB.T('Too young for work or training'),
          FB.T('No apprenticeship yet')),
        action:null
      };
    }
    const career = FB.careerOf(s, c);
    const def = career && FBDATA.careers[career.profession];
    const guild = def && def.guild
      ? FB.T('Guild: {rank}', { rank:FB.guildTitle(career) })
      : FB.T('Guild: not applicable');
    const religious = FB.religiousPathOf(s, c);
    const faith = religious
      ? FB.T('Religious standing: {rank}', {
        rank:FB.religiousRankTitle(s, c, religious)
      })
      : FB.T('Religious standing: not applicable');
    return {
      content:householdPlanLines(FB.careerTitle(s, c), guild, faith),
      action:'work'
    };
  }

  function householdPlanAssignment(s, c, enterprises, retainer) {
    const age = FB.ageOf(c, s.date.year);
    const staffed = [];
    const staffedIds = [];
    for (const enterprise of enterprises) {
      if (enterprise.workerId !== c.id) continue;
      const def = FBDATA.enterprises[enterprise.type];
      if (!def) continue;
      const name = dt(s, 'enterprise', enterprise.type, def, 'name');
      staffed.push(enterprise.workerLocked
        ? FB.T('{enterprise} · 🔒 locked', { enterprise:name }) : name);
      staffedIds.push(enterprise.uid);
    }
    const offices = [];
    if (retainer) offices.push(positionName(s, retainer.office));
    if (c.id === s.player.charId) {
      for (const id of FB.playerPositionIds(s)) offices.push(positionName(s, id));
    }
    let primary = staffed.length
      ? FB.T('Enterprise: {assignments}', { assignments:staffed.join(', ') })
      : FB.T('No enterprise assignment');
    let secondary = offices.length
      ? FB.T('Office: {offices}', { offices:offices.join(', ') })
      : FB.T('No household or earned office');
    if (!staffed.length && !offices.length) {
      primary = FB.T('No assignment');
      secondary = FB.T('No enterprise or office');
    }
    return {
      content:householdPlanLines(primary, secondary),
      action:age >= 10 ? 'assignment' : null,
      target:staffedIds.length === 1 ? staffedIds[0] : null
    };
  }

  function householdPlanMatch(s, c) {
    const spouse = FB.spouseOf(s, c);
    if (spouse) {
      return {
        content:householdPlanLines(FB.T('Married'),
          FB.T('Spouse: {name}', { name:spouse.name })),
        action:null
      };
    }
    if (c.betrothedId) {
      const betrothed = s.chars[c.betrothedId];
      return {
        content:householdPlanLines(FB.T('Betrothed'),
          betrothed && !betrothed.dead
            ? FB.T('Promised to {name}', { name:betrothed.name })
            : FB.T('A pledge is recorded')),
        action:null
      };
    }
    if (!FB.playerDescendantKind(s, c.id)) {
      return {
        content:householdPlanLines(FB.T('Not applicable'),
          FB.T('Descendant matching only')),
        action:null
      };
    }
    const age = FB.ageOf(c, s.date.year);
    if (age < 12) {
      return {
        content:householdPlanLines(FB.T('Underage'),
          FB.T('Eligible from age 12')),
        action:null
      };
    }
    const recommendation = FB.matchRecommendationOf ?
      FB.matchRecommendationOf(s, c) : null;
    if (recommendation) {
      const m = recommendation.candidate;
      const terms = recommendation.terms;
      const expense = terms.dowry
        ? FB.T('Dowry {money:amount}', { amount:terms.dowry })
        : (m.dowryDue
            ? FB.T('Bride brings {money:amount}', { amount:m.dowryDue })
            : FB.T('No gold spent'));
      const prestige = terms.prestigeNeed
        ? FB.T('Needs {prestige} prestige', {
            prestige:terms.prestigeNeed
          })
        : FB.T('No prestige requirement');
      return {
        content:householdPlanLines(
          FB.T('Recommended: {name}', { name:m.name }),
          FB.T('{station} · age {age}', {
            station:FB.stationName(terms.station),
            age:FB.ageOf(m, s.date.year)
          }),
          FB.T('{expense} · {prestige}', {
            expense:expense, prestige:prestige
          }),
          FB.T('Review only · no pledge has been made')),
        action:'match'
      };
    }
    const policy = FB.ensureMatchPolicy ? FB.ensureMatchPolicy(s) : null;
    return {
      content:householdPlanLines(
        policy && policy.enabled
          ? FB.T('No recommendation')
          : FB.T('Eligible'),
        policy && policy.enabled
          ? FB.T('No sounded-out family meets the assistant limits')
          : FB.T('No match arranged')),
      action:'match'
    };
  }

  function householdPlanEquipment(s, c) {
    const loadout = FB.loadoutOf(s, c.id);
    let occupied = 0;
    for (const slot of FB.ITEM_SLOTS) if (loadout[slot]) occupied++;
    return {
      content:householdPlanLines(
        FB.T('Unique items: {count}', {
          count:FB.equippedItemRefs(s, c.id).length
        }),
        FB.T('Occupied slots: {used} of {total}', {
          used:occupied, total:FB.ITEM_SLOTS.length
        })),
      action:'equipment'
    };
  }

  UI.showHouseholdPlan = function () {
    const s = FB.state;
    if (!s || UI.eventsBusy()) return;
    const head = s.chars[s.player.charId];
    if (!head || head.dead) return;
    const matchPolicy = FB.ensureMatchPolicy(s);
    if (matchPolicy.enabled && FB.recommendDescendantMatches) {
      FB.recommendDescendantMatches(s, { notify:false });
    }
    const rows = [];
    const seen = {};
    function add(c, kind, retainer) {
      if (!c || c.dead || seen[c.id]) return;
      seen[c.id] = 1;
      rows.push({ c:c, kind:kind, retainer:retainer || null });
    }
    add(head, 'head');
    for (const c of FB.householdMembers(s)) {
      if (c.id !== head.id) add(c, 'family');
    }
    for (const record of FB.retainerRecords(s)) {
      add(s.chars[record.charId], 'retainer', record);
    }

    const enterprises = FB.enterpriseList(s);
    const labels = {
      person:FB.T('Person'),
      education:FB.T('Education'),
      instruction:FB.T('Instruction'),
      work:FB.T('Work & standing'),
      assignment:FB.T('Assignment'),
      match:FB.T('Match'),
      equipment:FB.T('Equipment')
    };
    const headers = [
      labels.person, labels.education, labels.instruction, labels.work,
      labels.assignment, labels.match, labels.equipment
    ];
    const educationPolicy = FB.ensureEducationPolicy(s);
    const educationFocusSummary = educationPolicy.focus
      ? FB.T('Default focus: {focus}', {
          focus:FB.skillName(educationPolicy.focus)
        })
      : FB.T('Focus chosen manually for each child');
    const educationInstructionSummary =
      educationPolicy.instructionMode === 'best'
        ? FB.T('Best instruction up to {money:amount} per child each season', {
            amount:educationPolicy.feeCap
          })
        : FB.T('Instruction chosen manually for each child');
    let recommendationCount = 0;
    for (const row of rows) {
      if (FB.matchRecommendationOf(s, row.c)) recommendationCount++;
    }
    const matchPolicyState = matchPolicy.enabled
      ? FB.T('Assistant on · current recommendations: {count}', {
          count:recommendationCount
        })
      : FB.T('Assistant off · descendant matches remain manual');
    const matchPolicyStation = FB.T('Minimum station: {station}', {
      station:FB.stationName(matchPolicy.minStation)
    });
    const matchDowrySummary = matchPolicy.maxDowry === null
      ? FB.T('Dowry cap: none')
      : FB.T('Dowry cap: {money:amount}', {
          amount:matchPolicy.maxDowry
        });
    const matchGoldSummary = matchPolicy.maxGold === null
      ? FB.T('Gold-spend cap: none')
      : FB.T('Gold-spend cap: {money:amount}', {
          amount:matchPolicy.maxGold
        });
    const matchPrestigeSummary = matchPolicy.maxPrestige === null
      ? FB.T('Prestige requirement cap: none')
      : FB.T('Prestige requirement cap: {amount}', {
          amount:matchPolicy.maxPrestige
        });
    const matchPolicyExpenses = [
      matchDowrySummary, matchGoldSummary, matchPrestigeSummary
    ].join(' · ');
    let h = '<div class="gm-body-text household-plan-intro"><p>' + esc(FB.T(
      'Every living person managed by the household is shown here. Select an available cell to open its existing detailed controls.')) +
      '</p></div><div class="household-policy-summary education-policy-summary"><div><strong>' +
      esc(FB.T('Education Policy')) + '</strong><span>' +
      esc(educationFocusSummary) + '</span><span>' +
      esc(educationInstructionSummary) + '</span></div>' +
      '<button type="button" class="btn" id="household-education-policy" aria-label="' +
      esc(FB.T('Manage household education policy')) + '">' +
      esc(FB.T('Manage policy…')) + '</button></div>' +
      '<div class="household-policy-summary match-policy-summary"><div><strong>' +
      esc(FB.T('Descendant Match Assistant')) + '</strong><span>' +
      esc(matchPolicyState) + '</span><span>' +
      esc(matchPolicyStation) + '</span><span>' +
      esc(matchPolicyExpenses) + '</span></div>' +
      '<button type="button" class="btn" id="household-match-policy" aria-label="' +
      esc(FB.T('Manage descendant match assistant')) + '">' +
      esc(FB.T('Manage assistant…')) + '</button></div>' +
      '<div class="household-plan-wrap"><table class="household-plan-table">' +
      '<thead><tr>';
    for (const header of headers) h += '<th scope="col">' + esc(header) + '</th>';
    h += '</tr></thead><tbody>';
    for (const row of rows) {
      const c = row.c;
      const education = householdPlanEducation(s, c);
      const instruction = householdPlanInstruction(s, c);
      const work = householdPlanWork(s, c);
      const assignment = householdPlanAssignment(s, c, enterprises, row.retainer);
      const match = householdPlanMatch(s, c);
      const equipment = householdPlanEquipment(s, c);
      h += '<tr class="household-plan-' + row.kind + '">' +
        householdPlanCell(labels.person, householdPlanPerson(s, c, row.kind, row.retainer),
          null, c.id) +
        householdPlanCell(labels.education, education.content, education.action, c.id) +
        householdPlanCell(labels.instruction, instruction.content, instruction.action, c.id) +
        householdPlanCell(labels.work, work.content, work.action, c.id) +
        householdPlanCell(labels.assignment, assignment.content, assignment.action, c.id,
          assignment.target) +
        householdPlanCell(labels.match, match.content, match.action, c.id) +
        householdPlanCell(labels.equipment, equipment.content, equipment.action, c.id) +
        '</tr>';
    }
    let idleEnterprises = 0;
    for (const enterprise of enterprises) if (!enterprise.workerId) idleEnterprises++;
    h += '</tbody></table></div>' +
      (!idleEnterprises && enterprises.length
        ? '<div class="hint enterprise-staffing-hint">' +
          esc(FB.T('All family enterprises are staffed.')) + '</div>'
        : '') +
      '<div class="gm-footer">' +
      (idleEnterprises
        ? '<button type="button" class="btn" id="household-plan-staff-enterprises">' +
          esc(FB.T('Staff all idle enterprises…')) + '</button>'
        : '') +
      '<button type="button" class="btn" id="household-plan-close">' +
      esc(FB.T('Close')) + '</button></div>';
    openModal(FB.T('📋 Household Plan'), h, {
      modalClass:'fullsheet-modal household-plan-modal'
    });
    FB.paintFaces($('gm-body'), s);
    $('household-education-policy').addEventListener('click', function () {
      UI.showEducationPolicy();
    });
    $('household-match-policy').addEventListener('click', function () {
      UI.showMatchPolicy();
    });
    const actions = $('gm-body').querySelectorAll('[data-household-plan-action]');
    for (let i = 0; i < actions.length; i++) {
      actions[i].addEventListener('click', function () {
        const action = actions[i].getAttribute('data-household-plan-action');
        const cid = actions[i].getAttribute('data-household-plan-cid');
        const target = actions[i].getAttribute('data-household-plan-target');
        if (action === 'education') UI.showEduFocus(cid, HOUSEHOLD_PLAN_RETURN);
        else if (action === 'instruction') UI.showTutorPick(cid, HOUSEHOLD_PLAN_RETURN);
        else if (action === 'work') UI.showCareerPicker(cid, HOUSEHOLD_PLAN_RETURN);
        else if (action === 'assignment' && target) {
          UI.showEnterpriseManage(target, HOUSEHOLD_PLAN_RETURN);
        } else if (action === 'assignment') {
          UI.showLivelihoods(HOUSEHOLD_PLAN_RETURN);
        } else if (action === 'match') {
          UI.showMatchPicker(cid, HOUSEHOLD_PLAN_RETURN);
        } else if (action === 'equipment') {
          UI.showEquipmentModal(cid, 'close', HOUSEHOLD_PLAN_RETURN);
        }
      });
    }
    if ($('household-plan-staff-enterprises')) {
      $('household-plan-staff-enterprises').addEventListener('click', function () {
        UI.showEnterpriseStaffingPreview(HOUSEHOLD_PLAN_RETURN);
      });
    }
    $('household-plan-close').addEventListener('click', UI.closeModal);
  };

  function educationPolicyDraft(value) {
    const policy = value || FB.ensureEducationPolicy(FB.state);
    return {
      focus:FB.SKILLS.indexOf(policy.focus) >= 0 ? policy.focus : null,
      instructionMode:policy.instructionMode === 'best' ? 'best' : 'manual',
      feeCap:Math.max(0, isFinite(Number(policy.feeCap)) ?
        Number(policy.feeCap) : 0)
    };
  }

  function educationPolicyFocusOptions(selected) {
    let h = '<option value=""' + (!selected ? ' selected' : '') + '>' +
      esc(FB.T('Manual for each child')) + '</option>';
    for (const focus of FB.SKILLS) {
      h += '<option value="' + esc(focus) + '"' +
        (selected === focus ? ' selected' : '') + '>' +
        esc(FB.skillName(focus)) + '</option>';
    }
    return h;
  }

  function readEducationPolicyDraft() {
    const focus = $('education-policy-focus');
    const instruction = $('education-policy-instruction');
    const cap = $('education-policy-cap');
    const amount = cap ? Number(cap.value) : 0;
    return educationPolicyDraft({
      focus:focus && focus.value || null,
      instructionMode:instruction && instruction.checked ? 'best' : 'manual',
      feeCap:isFinite(amount) ? Math.max(0, amount) : 0
    });
  }

  function showEducationPolicyConfig(value) {
    const draft = educationPolicyDraft(value);
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Set defaults for empty education choices. Existing manual and policy-selected choices stay unchanged.')) +
      '</p></div><div class="education-policy-form">' +
      '<label class="education-policy-field" for="education-policy-focus"><span>' +
      esc(FB.T('Default education focus')) + '</span><select id="education-policy-focus">' +
      educationPolicyFocusOptions(draft.focus) + '</select><small>' +
      esc(FB.T('Choose a subject for each empty eligible slot, or leave every child for manual selection.')) +
      '</small></label><label class="autorow education-policy-check">' +
      '<input type="checkbox" id="education-policy-instruction"' +
      (draft.instructionMode === 'best' ? ' checked' : '') + '> ' +
      esc(FB.T('Choose the strongest available instruction automatically')) +
      '<span class="adesc">' + esc(FB.T(
        'Schools, the Noble Academy, home lessons, and already-known tutors are considered. A personal master is never hired automatically.')) +
      '</span></label><label class="education-policy-field" for="education-policy-cap"><span>' +
      esc(FB.T('Seasonal fee cap per child')) +
      '</span><input type="number" id="education-policy-cap" min="0" step="0.25" inputmode="decimal" value="' +
      esc(draft.feeCap) + '"><small>' + esc(FB.T(
        'The cap limits a new arrangement only. It does not reserve money or cancel an existing arrangement if its fee later rises.')) +
      '</small></label></div><div class="gm-footer">' +
      '<button type="button" class="btn primary" id="education-policy-preview">' +
      esc(FB.T('Preview policy')) + '</button>' +
      '<button type="button" class="btn" id="education-policy-back">' +
      esc(FB.T('Back to Household Plan')) + '</button></div>';
    openModal(FB.T('🎓 Household Education Policy'), h, {
      historyView:true,
      modalClass:'fullsheet-modal education-policy-modal',
      historyBackRender:function () { UI.showHouseholdPlan(); }
    });
    function syncCap() {
      const enabled = $('education-policy-instruction').checked;
      $('education-policy-cap').disabled = !enabled;
    }
    $('education-policy-instruction').addEventListener('change', syncCap);
    syncCap();
    $('education-policy-preview').addEventListener('click', function () {
      showEducationPolicyPreview(readEducationPolicyDraft());
    });
    $('education-policy-back').addEventListener('click', function () {
      modalHistoryBack(function () { UI.showHouseholdPlan(); });
    });
  }
  UI.showEducationPolicy = function () {
    showEducationPolicyConfig(FB.ensureEducationPolicy(FB.state));
  };

  function educationPolicyPreviewCard(s, entry) {
    const focus = entry.focus ? FB.skillName(entry.focus) :
      FB.T('Manual focus still required');
    const instruction = entry.waitingFocus ? FB.T('Waiting for a focus') :
      educationOptionName(s, entry.c, entry.option);
    const chance = entry.projectedChance !== null && !entry.waitingFocus
      ? FB.T('{chance}% yearly', {
          chance:Math.round(entry.projectedChance * 100)
        })
      : FB.T('No instruction chance until a focus is chosen');
    const fee = entry.option && !entry.waitingFocus
      ? (entry.seasonalFee
          ? FB.T('{money:amount} each season', { amount:entry.seasonalFee })
          : FB.T('Free'))
      : FB.T('No fee');
    const warning = educationRiskWarning(entry.riskOption);
    return '<article class="education-policy-preview-card"><strong>' +
      esc(FB.fullName(entry.c)) + '</strong><dl><div><dt>' +
      esc(FB.T('Focus')) + '</dt><dd>' + esc(focus) +
      (entry.focusAffected ? ' <small>' + esc(FB.T('New policy choice')) +
        '</small>' : '') + '</dd></div><div><dt>' +
      esc(FB.T('Instruction')) + '</dt><dd>' + esc(instruction) +
      (entry.instructionAffected ? ' <small>' +
        esc(FB.T('New policy choice')) + '</small>' :
        (entry.instructionUnavailable ? ' <small>' +
          esc(FB.T('Existing choice remains, but it is unavailable for this focus')) +
          '</small>' : '')) +
      '</dd></div><div><dt>' + esc(FB.T('Projected learning')) +
      '</dt><dd>' + esc(chance) + '</dd></div><div><dt>' +
      esc(FB.T('Seasonal fee')) + '</dt><dd>' + esc(fee) +
      '</dd></div></dl>' + (warning ? '<p class="household-plan-warning">' +
        esc(warning) + '</p>' : '') + '</article>';
  }

  function showEducationPolicyPreview(value) {
    const s = FB.state;
    const draft = educationPolicyDraft(value);
    const preview = FB.educationPolicyPreview(s, draft);
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Review the children whose empty choices would be filled now. Existing manual and policy-selected choices remain unchanged.')) +
      '</p><p class="hint">' + esc(FB.T(
        'The fee cap applies separately to each child when an arrangement is selected. It does not reserve household funds; unaffordable seasonal fees still pause lessons and retry later.')) +
      '</p></div><div class="education-policy-preview-list">';
    if (preview.length) {
      for (const entry of preview) h += educationPolicyPreviewCard(s, entry);
    } else {
      h += '<p class="hint education-policy-empty">' + esc(FB.T(
        'No currently eligible child has an empty choice affected by this policy. The policy will still apply when another child becomes eligible.')) +
        '</p>';
    }
    h += '</div><div class="gm-footer">' +
      '<button type="button" class="btn primary" id="education-policy-save">' +
      esc(FB.T('Save and apply policy')) + '</button>' +
      '<button type="button" class="btn" id="education-policy-edit">' +
      esc(FB.T('Edit policy')) + '</button></div>';
    openModal(FB.T('🎓 Preview Education Policy'), h, {
      historyView:true,
      modalClass:'fullsheet-modal education-policy-modal',
      historyBackRender:function () { showEducationPolicyConfig(draft); }
    });
    $('education-policy-save').addEventListener('click', function () {
      FB.setEducationPolicy(s, draft);
      FB.save.autosave();
      UI.refresh();
      UI.showHouseholdPlan();
      mobileNavClosedAll('modal-view', true);
    });
    $('education-policy-edit').addEventListener('click', function () {
      modalHistoryBack(function () { showEducationPolicyConfig(draft); });
    });
  }

  /* ================= descendant match assistant =================
     A saved household policy ranks the ordinary three sounded-out families.
     Previewing and saving never pledge a match, spend resources, or pass a
     day; the existing arranged-match picker remains the decision surface. */
  function matchPolicyDraft(value) {
    const policy = value || FB.ensureMatchPolicy(FB.state);
    function limit(v) {
      if (v === null || v === undefined || v === '') return null;
      const n = Number(v);
      return isFinite(n) ? Math.max(0, n) : null;
    }
    const station = Number(policy.minStation);
    return {
      enabled:!!policy.enabled,
      minStation:FB.clamp(isFinite(station) ? Math.floor(station) : 0, 0, 3),
      maxDowry:limit(policy.maxDowry),
      maxGold:limit(policy.maxGold),
      maxPrestige:limit(policy.maxPrestige)
    };
  }

  function matchPolicyStationOptions(selected) {
    let h = '';
    for (let station = 0; station <= 3; station++) {
      h += '<option value="' + station + '"' +
        (station === selected ? ' selected' : '') + '>' +
        esc(FB.stationName(station)) + '</option>';
    }
    return h;
  }

  function matchPolicyInputValue(value) {
    return value === null ? '' : String(value);
  }

  function readMatchPolicyDraft() {
    function value(id) {
      const input = $(id);
      return input && input.value !== '' ? Number(input.value) : null;
    }
    return matchPolicyDraft({
      enabled:$('match-policy-enabled').checked,
      minStation:Number($('match-policy-station').value),
      maxDowry:value('match-policy-dowry'),
      maxGold:value('match-policy-gold'),
      maxPrestige:value('match-policy-prestige')
    });
  }

  function showMatchPolicyConfig(value) {
    const draft = matchPolicyDraft(value);
    const noLimit = FB.T('No limit');
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Ask the household to recommend one of the same three families available in manual descendant matching.')) +
      '</p><p class="hint">' + esc(FB.T(
        'The assistant ranks qualifying families by station, then lower immediate expense. It never pledges a match, spends resources, or advances the day.')) +
      '</p></div><div class="education-policy-form match-policy-form">' +
      '<label class="autorow education-policy-check match-policy-check">' +
      '<input type="checkbox" id="match-policy-enabled"' +
      (draft.enabled ? ' checked' : '') + '> ' +
      esc(FB.T('Recommend descendant matches')) +
      '<span class="adesc">' + esc(FB.T(
        'Eligible resident children and grandchildren are reviewed now and each New Year.')) +
      '</span></label><label class="education-policy-field" for="match-policy-station"><span>' +
      esc(FB.T('Minimum acceptable station')) +
      '</span><select id="match-policy-station">' +
      matchPolicyStationOptions(draft.minStation) + '</select><small>' +
      esc(FB.T('Lower-station families remain available in the manual picker.')) +
      '</small></label><label class="education-policy-field" for="match-policy-dowry"><span>' +
      esc(FB.T('Maximum dowry')) +
      '</span><input type="number" id="match-policy-dowry" min="0" step="1" inputmode="decimal" placeholder="' +
      esc(noLimit) + '" value="' + esc(matchPolicyInputValue(draft.maxDowry)) +
      '"><small>' + esc(FB.T(
        'Limits the dowry written into a recommended pledge. Leave blank for no limit.')) +
      '</small></label><label class="education-policy-field" for="match-policy-gold"><span>' +
      esc(FB.T('Maximum immediate gold expenditure')) +
      '</span><input type="number" id="match-policy-gold" min="0" step="1" inputmode="decimal" placeholder="' +
      esc(noLimit) + '" value="' + esc(matchPolicyInputValue(draft.maxGold)) +
      '"><small>' + esc(FB.T(
        'At present a daughter’s or granddaughter’s dowry is the only immediate gold expense, so the tighter gold or dowry cap applies.')) +
      '</small></label><label class="education-policy-field" for="match-policy-prestige"><span>' +
      esc(FB.T('Maximum prestige requirement')) +
      '</span><input type="number" id="match-policy-prestige" min="0" step="1" inputmode="decimal" placeholder="' +
      esc(noLimit) + '" value="' + esc(matchPolicyInputValue(draft.maxPrestige)) +
      '"><small>' + esc(FB.T(
        'Prestige gates a match above your station but is not spent by the pledge. Leave blank for no limit.')) +
      '</small></label></div><div class="gm-footer">' +
      '<button type="button" class="btn primary" id="match-policy-preview">' +
      esc(FB.T('Preview recommendations')) + '</button>' +
      '<button type="button" class="btn" id="match-policy-back">' +
      esc(FB.T('Back to Household Plan')) + '</button></div>';
    openModal(FB.T('💍 Descendant Match Assistant'), h, {
      historyView:true,
      modalClass:'fullsheet-modal match-policy-modal',
      historyBackRender:function () { UI.showHouseholdPlan(); }
    });
    function syncFields() {
      const enabled = $('match-policy-enabled').checked;
      for (const id of [
        'match-policy-station', 'match-policy-dowry',
        'match-policy-gold', 'match-policy-prestige'
      ]) $(id).disabled = !enabled;
    }
    $('match-policy-enabled').addEventListener('change', syncFields);
    syncFields();
    $('match-policy-preview').addEventListener('click', function () {
      showMatchPolicyPreview(readMatchPolicyDraft());
    });
    $('match-policy-back').addEventListener('click', function () {
      modalHistoryBack(function () { UI.showHouseholdPlan(); });
    });
  }

  UI.showMatchPolicy = function () {
    showMatchPolicyConfig(FB.ensureMatchPolicy(FB.state));
  };

  function matchPolicyRejectionText(entry) {
    const seen = {};
    const reasons = [];
    for (const rejected of (entry.rejections || [])) {
      const reason = rejected.reason;
      if (!reason || seen[reason]) continue;
      seen[reason] = 1;
      if (reason === 'minimum-station') {
        reasons.push(FB.T('At least one family is below the minimum station.'));
      } else if (reason === 'maximum-dowry') {
        reasons.push(FB.T('At least one family is above the dowry cap.'));
      } else if (reason === 'maximum-gold') {
        reasons.push(FB.T('At least one family is above the immediate gold cap.'));
      } else if (reason === 'maximum-prestige') {
        reasons.push(FB.T(
          'At least one family is above the prestige requirement cap.'));
      } else if (reason === 'gold') {
        reasons.push(FB.T('At least one match is not currently affordable in gold.'));
      } else if (reason === 'prestige') {
        reasons.push(FB.T(
          'At least one match is not currently supported by your prestige.'));
      } else if (reason === 'faith') {
        reasons.push(FB.T('At least one match is blocked by faith.'));
      } else if (reason === 'kinship') {
        reasons.push(FB.T('At least one match is blocked by close kinship.'));
      } else if (reason === 'compact') {
        reasons.push(FB.T('At least one match is blocked by royal-compact rules.'));
      } else if (reason === 'doctrine') {
        reasons.push(FB.T('At least one match is blocked by marriage doctrine.'));
      } else if (reason === 'age') {
        reasons.push(FB.T('At least one candidate is not yet old enough.'));
      } else {
        reasons.push(FB.T('At least one family is no longer eligible.'));
      }
    }
    return reasons.length ? reasons.join(' ') : FB.T(
      'None of the three sounded-out families fits every limit and current resource gate.');
  }

  function matchPolicyPreviewCard(s, entry) {
    let match = FB.T('No qualifying family');
    let station = FB.T('Not applicable');
    let age = FB.T('Not applicable');
    let dowry = FB.T('No gold spent');
    let gold = FB.T('No immediate gold expense');
    let prestige = FB.T('No prestige requirement');
    let note = matchPolicyRejectionText(entry);
    if (entry.candidate) {
      const candidate = entry.candidate;
      const terms = entry.terms;
      match = (epithetText(s, candidate)
        ? epithetText(s, candidate) + ' — ' : '') + candidate.name;
      station = FB.stationName(terms.station);
      age = String(FB.ageOf(candidate, s.date.year));
      dowry = terms.dowry
        ? FB.T('{money:amount} paid at the pledge', {
            amount:terms.dowry
          })
        : (candidate.dowryDue
            ? FB.T('{money:amount} received at the wedding', {
                amount:candidate.dowryDue
              })
            : FB.T('None'));
      gold = terms.goldCost
        ? FB.T('{money:amount}', { amount:terms.goldCost })
        : FB.T('None');
      prestige = terms.prestigeNeed
        ? String(terms.prestigeNeed)
        : FB.T('None');
      note = FB.T('Recommendation only · no pledge has been made');
    } else if (entry.reason === 'disabled') {
      note = FB.T(
        'The assistant is off. Existing and future descendant matches remain manual.');
    }
    return '<article class="education-policy-preview-card match-policy-preview-card">' +
      '<strong>' + esc(FB.fullName(entry.child)) + '</strong><dl><div><dt>' +
      esc(FB.T('Recommended match')) + '</dt><dd>' + esc(match) +
      '</dd></div><div><dt>' + esc(FB.T('Station')) + '</dt><dd>' +
      esc(station) + '</dd></div><div><dt>' + esc(FB.T('Age')) +
      '</dt><dd>' + esc(age) + '</dd></div><div><dt>' +
      esc(FB.T('Dowry')) + '</dt><dd>' + esc(dowry) +
      '</dd></div><div><dt>' + esc(FB.T('Gold spent now')) +
      '</dt><dd>' + esc(gold) + '</dd></div><div><dt>' +
      esc(FB.T('Prestige required')) + '</dt><dd>' + esc(prestige) +
      '</dd></div></dl><p class="' +
      (entry.candidate ? 'hint' : 'household-plan-warning') + '">' +
      esc(note) + '</p></article>';
  }

  function showMatchPolicyPreview(value) {
    const s = FB.state;
    const draft = matchPolicyDraft(value);
    const preview = FB.matchPolicyPreview(s, draft);
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Review every currently eligible descendant before saving these limits.')) +
      '</p><p class="hint">' + esc(FB.T(
        'Only a recommendation marker and Chronicle notice will be created. Open the ordinary match picker to make any pledge.')) +
      '</p></div><div class="education-policy-preview-list match-policy-preview-list">';
    if (preview.length) {
      for (const entry of preview) h += matchPolicyPreviewCard(s, entry);
    } else {
      h += '<p class="hint education-policy-empty">' + esc(FB.T(
        'No resident child or grandchild is currently eligible. If enabled, the assistant will review each descendant from age 12.')) +
        '</p>';
    }
    h += '</div><div class="gm-footer">' +
      '<button type="button" class="btn primary" id="match-policy-save">' +
      esc(FB.T('Save assistant limits')) + '</button>' +
      '<button type="button" class="btn" id="match-policy-edit">' +
      esc(FB.T('Edit limits')) + '</button></div>';
    openModal(FB.T('💍 Preview Match Recommendations'), h, {
      historyView:true,
      modalClass:'fullsheet-modal match-policy-modal',
      historyBackRender:function () { showMatchPolicyConfig(draft); }
    });
    $('match-policy-save').addEventListener('click', function () {
      FB.setMatchPolicy(s, draft);
      FB.save.autosave();
      UI.refresh();
      UI.showHouseholdPlan();
      mobileNavClosedAll('modal-view', true);
    });
    $('match-policy-edit').addEventListener('click', function () {
      modalHistoryBack(function () { showMatchPolicyConfig(draft); });
    });
  }

  /* ================= household livelihoods & enterprises ================= */
  function enterprisePlace(s, enterprise) {
    const pr = enterprise && FB.world.byId[enterprise.provinceId];
    const settlements = pr ? FB.settlementsOf(s, enterprise.provinceId) : [];
    return settlements[enterprise && enterprise.settlement]
      ? FB.T('{settlement}, {province}', {
        settlement:settlements[enterprise.settlement].name,
        province:pr.name
      })
      : (pr ? pr.name : FB.T('Unknown place'));
  }

  function enterpriseEffectText(s, enterprise, def, purchasePreview) {
    if (purchasePreview) {
      return FB.T(
        'Base {money:amount} seasonal yield while staffed; the exact result appears in Money each season', {
          amount:def.yield || 0
        });
    }
    const worker = enterprise.workerId && s.chars[enterprise.workerId];
    if (!worker || worker.dead) {
      return FB.T('No income while idle; assign an eligible household worker');
    }
    return FB.T(
      'About {money:amount} each season while worked by {name}; shown in Money each season', {
      amount:Math.round(FB.enterpriseYield(s, enterprise) * 10) / 10,
      name:worker.name
    });
  }

  function enterpriseRecurringCost() {
    return FB.T('No property upkeep; worker contracts remain separate');
  }

  function enterpriseTransferRule() {
    return FB.T('Passes to heirs as family property; does not follow conquest');
  }

  UI.showRetainerHire = function () {
    const s = FB.state;
    const used = FB.retainerRecords(s).length;
    const capacity = FB.retainerCapacity(s);
    let h = '<p class="hint">' + esc(FB.T(
      'Retainers are named, paid servants. Their office is separate from their occupation; two unpaid seasons or deeply hostile Standing ends service.')) +
      '</p>' + kv('Household capacity', esc(FB.T('{used} of {capacity}', {
        used:used, capacity:capacity
      }))) + '<div class="gm-list">';
    for (const id in FBDATA.positions) {
      const def = FBDATA.positions[id];
      if (def.kind !== 'retainer') continue;
      const blockedTier = s.player.tier < (def.minTier || 0);
      const blockedGold = s.player.gold < (def.pay || 0);
      const occupied = FB.retainerOfficeRecord(s, id);
      h += '<button class="actionbtn" data-retainer-office="' + esc(id) + '"' +
        (blockedTier || blockedGold || occupied || used >= capacity ? ' disabled' : '') + '>' +
        esc(def.icon + ' ' + positionName(s, id)) +
        '<span class="adesc">' + esc(positionDesc(s, id)) + ' ' +
        esc(occupied
          ? FB.T('This household office is already filled.')
          : blockedTier
          ? FB.T('Requires station {station}.', {
            station:FB.stationName(def.minTier || 0)
          })
          : blockedGold
            ? FB.T('Requires the first seasonal pay of {money:pay}.', { pay:def.pay || 0 })
            : FB.T('{money:pay} each season; the first season is paid on entry.', {
              pay:def.pay || 0
            })) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">' + esc(FB.T('Close')) + '</button>';
    openModal(FB.T('🗝 Hire a Retainer'), h);
    document.querySelectorAll('[data-retainer-office]').forEach(function (button) {
      button.addEventListener('click', function () {
        UI.showRetainerCandidates(button.dataset.retainerOffice);
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  UI.showRetainerCandidates = function (office) {
    const s = FB.state;
    const def = FBDATA.positions[office];
    if (!def || def.kind !== 'retainer') return;
    const candidates = FB.retainerCandidates(s, office);
    const benefit = positionEffectText(office) || positionDesc(s, office);
    const pay = FB.T('{money:pay} on entry and {money:pay} each season', {
      pay:def.pay || 0
    });
    function hireBlockReason(cid) {
      if (s.player.tier < (def.minTier || 0)) {
        return FB.T('Requires station {station}.', {
          station:FB.stationName(def.minTier || 0)
        });
      }
      if (FB.retainerRecords(s).length >= FB.retainerCapacity(s)) {
        return FB.T('Household retainer capacity is full.');
      }
      if (FB.retainerOfficeRecord(s, office)) {
        return FB.T('This household office is already filled.');
      }
      if (s.player.gold < (def.pay || 0)) {
        return FB.T('Requires the first seasonal pay of {money:pay}.', {
          pay:def.pay || 0
        });
      }
      if (cid && !FB.canHireRetainer(s, office, cid)) {
        return FB.T('This person is no longer eligible.');
      }
      return '';
    }
    let h = '<p class="hint">' + esc(positionDesc(s, office)) + ' ' +
      esc(FB.T('Hiring settles the first seasonal pay of {money:pay} and spends the day.', {
        pay:def.pay || 0
      })) + '</p><div class="gm-list">';
    for (const c of candidates) {
      const blocked = hireBlockReason(c.id);
      h += personAssignmentCard({
        person:c,
        eligible:!blocked,
        eligibility:blocked || FB.T('Eligible contact'),
        data:{ retainerCandidate:c.id },
        rows:[
          { label:'Expected benefit', value:benefit },
          { label:'Cost / pay', value:pay },
          { label:'Occupation', value:FB.careerTitle(s, c) },
          { label:'Standing', value:standingText(FB.standingOf(s, {
            kind:'character', id:c.id
          })) },
          { label:'Current assignment', value:FB.T('No household office') },
          { label:'Consequence', kind:'consequence',
            value:FB.T('Adds this office; the current occupation remains unchanged.') }
        ]
      });
    }
    const localBlocked = hireBlockReason(null);
    const profession = FBDATA.careers[def.profession];
    h += personAssignmentCard({
      name:FB.T('Hire a qualified local'),
      icon:'➕',
      eligible:!localBlocked,
      eligibility:localBlocked || FB.T('Eligible local hire'),
      data:{ retainerCandidate:'' },
      rows:[
        { label:'Expected benefit', value:benefit },
        { label:'Cost / pay', value:pay },
        { label:'Occupation', value:profession
          ? dt(s, 'career', def.profession, profession, 'name') : def.profession },
        { label:'Standing', value:FB.T('Unknown until hired') },
        { label:'Current assignment', value:FB.T('New to the household') },
        { label:'Consequence', kind:'consequence',
          value:FB.T('A new named character enters the chronicle in this office.') }
      ]
    });
    h += '</div><button class="btn" id="gm-cancel">' +
      esc(FB.T('Back')) + '</button>';
    openModal(def.icon + ' ' + positionName(s, office), h);
    FB.paintFaces($('gm-body'), s);
    document.querySelectorAll('[data-retainer-candidate]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (!FB.hireRetainer(s, office, button.dataset.retainerCandidate || null)) return;
        UI.closeModal();
        FB.game.passDay({ skipFocus:true });
      });
    });
    $('gm-cancel').addEventListener('click', UI.showRetainerHire);
  };

  UI.showRetainerManage = function (cid) {
    const s = FB.state;
    const record = FB.retainerRecord(s, cid);
    const c = record && s.chars[cid];
    if (!record || !c) return;
    let h = UI.charCardHtml(s, c) +
      '<div class="gm-body-text"><p>' + esc(positionDesc(s, record.office)) + '</p></div>' +
      kv('Household office', esc(positionName(s, record.office))) +
      kv('Seasonal pay', esc(FB.money(record.pay || 0))) +
      kv('Occupation', esc(FB.careerTitle(s, c))) +
      (positionEffectText(record.office)
        ? kv('Office effects', esc(positionEffectText(record.office))) : '') +
      '<div class="gm-list"><button class="actionbtn" id="retainer-career">🧰 ' +
      esc(FB.T('Change occupation or training…')) + '<span class="adesc">' +
      esc(FB.T('The household office remains an additive appointment.')) +
      '</span></button><button class="actionbtn danger" id="retainer-dismiss">' +
      esc(FB.T('Dismiss from household service…')) + '<span class="adesc">' +
      esc(FB.T('The retainer leaves immediately and remembers the slight.')) +
      '</span></button></div><button class="btn" id="gm-cancel">' +
      esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Service of {name}', { name:c.name }), h);
    FB.paintFaces($('gm-body'), s);
    $('retainer-career').addEventListener('click', function () { UI.showCareerPicker(cid); });
    $('retainer-dismiss').addEventListener('click', function () {
      UI.showRetainerDismiss(cid);
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  UI.showRetainerDismiss = function (cid) {
    const s = FB.state;
    const record = FB.retainerRecord(s, cid);
    const c = record && s.chars[cid];
    if (!record || !c) return;
    const h = '<p>' + esc(FB.T(
      'Dismiss {name} as {position}? Enterprise work, tutoring, and household equipment assignments will end.',
      { name:c.name, position:positionName(s, record.office) })) +
      '</p><button class="btn danger" id="retainer-dismiss-confirm">' +
      esc(FB.T('Dismiss {name}', { name:c.name })) +
      '</button> <button class="btn" id="gm-cancel">' + esc(FB.T('Keep in service')) +
      '</button>';
    openModal(FB.T('Dismiss Retainer'), h);
    $('retainer-dismiss-confirm').addEventListener('click', function () {
      if (!FB.removeRetainer(s, cid, 'dismissed')) return;
      UI.closeModal();
      UI.refresh();
    });
    $('gm-cancel').addEventListener('click', function () { UI.showRetainerManage(cid); });
  };

  UI.showLivelihoods = function (returnContext) {
    const s = FB.state;
    const me = s.chars[s.player.charId];
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      s.player.tier >= 3
        ? 'Your former calling remains part of your story, but the household now performs the daily work. Apprentices learn until sixteen; staffed enterprises pay each season.'
        : 'The household’s work feeds the purse. Apprentices learn until sixteen; staffed enterprises pay each season.')) +
      '</p></div><div class="panelh">' + esc(FB.T('Household work')) + '</div><div class="gm-list">';
    for (const c of FB.householdWorkers(s)) {
      const age = FB.ageOf(c, s.date.year);
      if (age < 10) continue;
      const career = FB.careerOf(s, c);
      const def = FBDATA.careers[career.profession];
      const retainer = FB.retainerRecord(s, c.id);
      const landedSelf = c.id === me.id && s.player.tier >= 3;
      h += '<button class="actionbtn" data-career="' + c.id + '">' +
        FB.faceTag(c, 30, 36) + ' ' + esc(c.id === me.id ? FB.T('{name} (you)', { name:c.name }) : c.name) +
        '<span class="adesc">' + esc(FB.careerTitle(s, c) +
          (def && def.guild ? ' · ' + FB.guildTitle(career) : '') +
          (retainer ? ' · ' + positionName(s, retainer.office) : '') +
          (landedSelf ? ' · ' + FB.T('former calling') : '')) + '</span></button>';
    }
    h += '</div><div class="panelh">' + esc(FB.T('Family enterprises')) + '</div><div class="gm-list">';
    const enterprises = FB.enterpriseList(s);
    if (!enterprises.length) {
      h += '<div class="hint">' + esc(FB.T('No enterprise yet. Open one in a settlement below.')) + '</div>';
    }
    for (const e of enterprises) {
      const def = FBDATA.enterprises[e.type];
      if (!def) continue;
      const worker = e.workerId && s.chars[e.workerId] && !s.chars[e.workerId].dead ?
        s.chars[e.workerId] : null;
      h += '<button class="actionbtn" data-enterprise="' + esc(e.uid) + '">' +
        esc(def.icon + ' ' + dt(s, 'enterprise', e.type, def, 'name')) +
        '<span class="adesc">' + esc(worker
          ? FB.T('Worked by {name}{lock}', {
            name:worker.name,
            lock:e.workerLocked ? FB.T(' · 🔒 locked') : ''
          })
          : FB.T('Idle — no worker')) + '</span>' +
        assetEffectSummary({
          compact:true,
          owner:FB.T('Household dynasty'),
          scope:enterprisePlace(s, e),
          setupCost:FB.T('Paid on purchase'),
          recurringCost:enterpriseRecurringCost(),
          effect:enterpriseEffectText(s, e, def, false),
          transferRule:enterpriseTransferRule(),
          expiry:FB.T('No fixed end')
        }) + '</button>';
    }
    let idleEnterprises = 0;
    for (const enterprise of enterprises) if (!enterprise.workerId) idleEnterprises++;
    if (idleEnterprises) {
      h += '<button class="actionbtn" id="enterprise-staffing-preview">⚙ ' +
        esc(FB.T('Staff all idle enterprises…')) +
        '<span class="adesc">' + esc(FB.T(
          'Review a maximum-yield assignment across every unlocked enterprise. Applying it spends no day or money.')) +
        '</span></button>';
    } else if (enterprises.length) {
      h += '<div class="hint enterprise-staffing-hint">' +
        esc(FB.T('All family enterprises are staffed.')) + '</div>';
    }
    const settlements = FB.settlementsOf(s, s.player.provinceId);
    for (let i = 0; i < settlements.length; i++) {
      if (!FB.enterpriseAvailable(s, i).length) continue;
      h += '<button class="actionbtn" data-enterprise-settlement="' + i + '">🏪 ' +
        esc(FB.T('Open an enterprise in {settlement}…', { settlement:settlements[i].name })) +
        '<span class="adesc">' + esc(FB.T('Buy productive property; further copies of one kind cost more.')) +
        '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">' + esc(FB.T('Close')) + '</button>';
    openModal(FB.T('🧰 Work & Enterprises'), h,
      householdPlanHistoryOptions(returnContext));
    FB.paintFaces($('gm-body'), s);
    document.querySelectorAll('[data-career]').forEach(function (b) {
      b.addEventListener('click', function () {
        UI.showCareerPicker(b.dataset.career, returnContext);
      });
    });
    document.querySelectorAll('[data-enterprise]').forEach(function (b) {
      b.addEventListener('click', function () {
        UI.showEnterpriseManage(b.dataset.enterprise, returnContext);
      });
    });
    document.querySelectorAll('[data-enterprise-settlement]').forEach(function (b) {
      b.addEventListener('click', function () {
        UI.showEnterpriseMarket(parseInt(b.dataset.enterpriseSettlement, 10),
          returnContext);
      });
    });
    if ($('enterprise-staffing-preview')) {
      $('enterprise-staffing-preview').addEventListener('click', function () {
        UI.showEnterpriseStaffingPreview(returnContext);
      });
    }
    $('gm-cancel').addEventListener('click', function () {
      finishHouseholdPlanReturn(returnContext, UI.closeModal);
    });
  };

  UI.showCareerPicker = function (cid, returnContext) {
    const s = FB.state;
    const c = s.chars[cid];
    if (!c || c.dead || !FB.isHouseholdCharacter(s, cid) ||
        FB.ageOf(c, s.date.year) < 10) return;
    const age = FB.ageOf(c, s.date.year);
    const career = FB.careerOf(s, c);
    const landedSelf = c.id === s.player.charId && s.player.tier >= 3;
    let h = livelihoodNote(s, c) + '<div class="gm-body-text"><p>' + esc(FB.T(
      landedSelf
        ? 'This calling is part of your life history. A landed ruler may patronize former peers, but does not change occupation or work the trade personally.'
        : (age < 16
          ? 'Choose an apprenticeship. It teaches a trade until age sixteen and may cost an entry fee.'
          : 'Choose their occupation. Changing work spends the day; experience in the old trade is set aside.'))) +
      '</p></div><div class="gm-list">';
    for (const item of FB.careerChoices(s, c)) {
      const same = career.chosen && career.profession === item.id;
      const short = s.player.gold < item.cost;
      h += '<button class="actionbtn" data-career-choice="' + item.id + '"' +
        (same || short ? ' disabled' : '') + '>' +
        esc(item.def.icon + ' ' + dt(s, 'career', item.id, item.def, 'name') +
          (item.cost ? FB.T(' — {money:gold}', { gold:item.cost }) : '')) +
        '<span class="adesc">' + esc(dt(s, 'career', item.id, item.def, 'desc')) +
        (same ? ' ' + esc(FB.T('(current)')) : short ? ' ' + esc(FB.T('(not enough money)')) : '') +
        '</span></button>';
    }
    const step = FB.guildAdvance(s, c);
    if (step) {
      const blocked = step.blocked || s.player.gold < step.cost;
      h += '<button class="actionbtn" id="career-guild"' + (blocked ? ' disabled' : '') + '>🏅 ' +
        esc(FB.T('Seek the next guild rank — {rank} ({money:gold})', {
          rank:FB.guildTitle({ guildRank:step.to }), gold:step.cost
        })) + '<span class="adesc">' +
        esc(step.blocked
          ? (step.prestige
            ? FB.T('Requires {skill} Stewardship and {prestige} prestige.', {
              skill:step.need, prestige:step.prestige
            })
            : FB.T('Requires {skill} Stewardship.', { skill:step.need }))
          : FB.T('Guild standing brings commissions, enterprise access, and better profits.')) +
        '</span></button>';
    }
    const religiousAdvance = FB.religiousAdvance(s, c);
    if (religiousAdvance) {
      const faithStep = religiousAdvance.step;
      if (faithStep.maleOnly && c.sex !== 'm') {
        h += '<div class="hint">' + esc(FB.T(
          'This is the highest religious office open to {name} on this path.', { name:c.name })) +
          '</div>';
      } else {
        const faithTitle = FB.religiousRankTitle(s, c, {
          id:religiousAdvance.path.id, step:faithStep
        });
        const abbotStatus = faithStep.id === 'abbot' &&
          FB.abbotAppointmentStatus ? FB.abbotAppointmentStatus(s, c) : null;
        const bishopStatus = faithStep.id === 'bishop' &&
          FB.bishopAppointmentStatus ? FB.bishopAppointmentStatus(s, c) : null;
        const officeStatus = bishopStatus || abbotStatus;
        /* Appointment rows remain inspectable when ineligible so the modal
           can explain every gate and modifier; only its confirm buttons lock. */
        const blocked = officeStatus ? false : religiousAdvance.blocked;
        let buttonLabel;
        if (bishopStatus) {
          buttonLabel = FB.T('Seek appointment to a bishopric — {chance}% chance', {
            chance:Math.round(bishopStatus.chance * 100)
          });
        } else if (abbotStatus) {
          buttonLabel = FB.T('Stand for election as {rank} — {chance}% chance', {
            rank:faithTitle, chance:Math.round(abbotStatus.chance * 100)
          });
        } else {
          buttonLabel = faithStep.gold
            ? FB.T('Seek the next religious rank — {rank} ({money:gold})', {
              rank:faithTitle, gold:faithStep.gold
            })
            : FB.T('Seek the next religious rank — {rank}', { rank:faithTitle });
        }
        h += '<button class="actionbtn" id="career-religious"' +
          (blocked ? ' disabled' : '') + '>🛐 ' + esc(buttonLabel) +
          '<span class="adesc">' +
          esc(officeStatus
            ? (officeStatus.ready
              ? (bishopStatus
                ? FB.T('A free merit petition weighs Learning, permanent lay standing, investiture policy, and the appointing authority’s support.')
                : FB.T('The community elects its superior; Learning and permanent lay standing improve the vote.'))
              : FB.T('Unmet: {requirements}', {
                requirements:officeStatus.missing.join('; ')
              }))
            : religiousAdvance.path.id.indexOf('_lay') >= 0
            ? FB.T('Requires age {age}, {piety} piety, {prestige} prestige, and {money:gold} from the household.', {
              age:faithStep.age || 0, piety:faithStep.piety || 0,
              prestige:faithStep.prestige || 0, gold:faithStep.gold || 0
            })
            : FB.T('Requires age {age}, Learning {learning}, {years} years in this vocation, {piety} piety, {prestige} prestige, and {money:gold} from the household.', {
              age:faithStep.age || 0, learning:faithStep.learning || 0,
              years:faithStep.years || 0, piety:faithStep.piety || 0,
              prestige:faithStep.prestige || 0, gold:faithStep.gold || 0
            })) + (officeStatus ? '' : ' ' +
          esc(faithStep.station !== undefined || faithStep.tier
            ? FB.T('Recognition adds {piety} piety each season and raises social station.', {
              piety:faithStep.pietyYield || 0
            })
            : FB.T('Recognition adds {piety} piety each season.', {
              piety:faithStep.pietyYield || 0
            }))) +
          '</span></button>';
      }
    }
    const cardinalPetition = FB.cardinalPetitionStatus &&
      FB.cardinalPetitionStatus(s, c);
    if (cardinalPetition && cardinalPetition.visible) {
      h += '<button class="actionbtn" id="career-cardinal"' +
        (cardinalPetition.ready ? '' : ' disabled') + '>⛪ ' +
        esc(FB.T('Petition for the red hat · {money:gold}', {
          gold:cardinalPetition.cost
        })) + '<span class="adesc">' +
        esc(cardinalPetition.ready
          ? FB.T('Ask the Pope to appoint {name} to the College of Cardinals.', {
            name:c.name
          })
          : FB.T('Unmet: {requirements}', {
            requirements:cardinalPetition.missing.join('; ')
          })) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">' + esc(FB.T('Back')) + '</button>';
    const historyOptions = { historyView:true };
    if (returnsToHouseholdPlan(returnContext)) {
      historyOptions.historyBackRender = function () { UI.showHouseholdPlan(); };
    }
    openModal(landedSelf
      ? FB.T('Former calling of {name}', { name:c.name })
      : FB.T('Work of {name}', { name:c.name }), h, historyOptions);
    document.querySelectorAll('[data-career-choice]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!FB.beginCareer(s, c, b.dataset.careerChoice)) return;
        UI.closeModal();
        FB.game.passDay({ skipFocus:true });
      });
    });
    const guild = $('career-guild');
    if (guild) guild.addEventListener('click', function () {
      if (!FB.takeGuildStep(s, c)) return;
      UI.closeModal();
      FB.game.passDay({ skipFocus:true });
    });
    const religious = $('career-religious');
    if (religious) religious.addEventListener('click', function () {
      const advance = FB.religiousAdvance(s, c);
      if (advance && advance.step.id === 'abbot') {
        UI.showAbbotElection(c.id, returnContext);
        return;
      }
      if (advance && advance.step.id === 'bishop') {
        UI.showBishopAppointment(c.id, returnContext);
        return;
      }
      if (!FB.takeReligiousStep(s, c)) return;
      UI.closeModal();
      FB.game.passDay({ skipFocus:true });
    });
    const cardinal = $('career-cardinal');
    if (cardinal) cardinal.addEventListener('click', function () {
      UI.showCardinalPetition(c.id, returnContext);
    });
    $('gm-cancel').addEventListener('click', function () {
      finishHouseholdPlanReturn(returnContext, function () {
        modalHistoryBack(UI.showLivelihoods);
      });
    });
  };

  UI.showAbbotElection = function (cid, returnContext) {
    const s = FB.state;
    const c = s && s.chars[cid];
    const status = c && FB.abbotAppointmentStatus &&
      FB.abbotAppointmentStatus(s, c);
    if (!status || !status.visible) return;
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'The religious community elects its superior. The vote costs no gold; Learning and permanent lay standing improve the chance. A refusal closes the election for one year.')) +
      '</p></div>' +
      kv('Election chance', esc(FB.T('{chance}%', {
        chance:Math.round(status.chance * 100)
      })));
    if (status.missing.length) {
      h += '<div class="progressnote">' + esc(FB.T('Unmet: {requirements}', {
        requirements:status.missing.join('; ')
      })) + '</div>';
    }
    h += '<div class="modal-actions"><button class="btn primary" id="abbot-election"' +
      (status.ready ? '' : ' disabled') + '>' +
      esc(FB.T('Stand for election')) +
      '</button><button class="btn" id="gm-cancel">' +
      esc(FB.T('Back')) + '</button></div>';
    const historyOptions = { historyView:true };
    if (returnsToHouseholdPlan(returnContext)) {
      historyOptions.historyBackRender = function () { UI.showHouseholdPlan(); };
    }
    openModal(FB.T('Election of the religious superior'), h, historyOptions);
    const election = $('abbot-election');
    if (election) election.addEventListener('click', function () {
      const result = FB.seekAbbotAppointment(s, c);
      UI.closeModal();
      UI.toast(result && result.accepted
        ? FB.T('{name} is elected to lead the religious house.', {
          name:c.name
        })
        : FB.T('The community elects another candidate.'));
      FB.game.passDay({ skipFocus:true });
    });
    $('gm-cancel').addEventListener('click', function () {
      finishHouseholdPlanReturn(returnContext, function () {
        UI.showCareerPicker(cid);
      });
    });
  };

  UI.showBishopAppointment = function (cid, returnContext) {
    const s = FB.state;
    const c = s && s.chars[cid];
    const status = c && FB.bishopAppointmentStatus &&
      FB.bishopAppointmentStatus(s, c);
    if (!status || !status.visible) return;
    const policy = FBDATA.papacy.investiture.policies[status.policyId];
    const authorityNames = {
      lay:'Temporal sovereign',
      canonical:'Recognized Pope',
      concordat:'Pope and temporal sovereign',
      chapter:'Cathedral chapter'
    };
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'A bishopric is a non-hereditary church office. A merit petition is free; a disclosed cathedral endowment improves the lawful appointment chance but is spent whether the petition succeeds or fails.')) +
      '</p></div>' +
      kv('Investiture policy', esc(policy
        ? dt(s, 'papalInvestiturePolicy', status.policyId, policy, 'name')
        : status.policyId)) +
      kv('Appointing authority', esc(FB.T(
        authorityNames[status.appointerKind] || 'Church authority'))) +
      kv('Authority support', esc(String(Math.round(status.support)))) +
      kv('Learning and lay-standing result', esc(FB.T(
        '{chance}% merit chance', {
          chance:Math.round(status.chance * 100)
        }))) +
      kv('Cathedral endowment', esc(FB.T(
        '{money:gold} · raises chance to {chance}%', {
          gold:status.endowmentGold,
          chance:Math.round(status.endowedChance * 100)
        })));
    if (status.missing.length) {
      h += '<div class="progressnote">' + esc(FB.T('Unmet: {requirements}', {
        requirements:status.missing.join('; ')
      })) + '</div>';
    }
    h += '<div class="modal-actions">' +
      '<button class="btn primary" id="bishop-merit"' +
      (status.ready ? '' : ' disabled') + '>' +
      esc(FB.T('Petition on merit — {chance}%', {
        chance:Math.round(status.chance * 100)
      })) + '</button>' +
      '<button class="btn" id="bishop-endow"' +
      (status.ready && status.canEndow ? '' : ' disabled') + '>' +
      esc(FB.T('Endow the cathedral ({money:gold}) — {chance}%', {
        gold:status.endowmentGold,
        chance:Math.round(status.endowedChance * 100)
      })) + '</button>' +
      '<button class="btn" id="gm-cancel">' + esc(FB.T('Back')) +
      '</button></div>';
    const historyOptions = { historyView:true };
    if (returnsToHouseholdPlan(returnContext)) {
      historyOptions.historyBackRender = function () { UI.showHouseholdPlan(); };
    }
    openModal(FB.T('Appointment to a bishopric'), h, historyOptions);
    function petition(endowed) {
      const result = FB.seekBishopAppointment(s, c, endowed);
      UI.closeModal();
      UI.toast(result && result.accepted
        ? FB.T('{name} is invested as a Bishop.', { name:c.name })
        : FB.T('The appointment is refused; another petition may be made in two years.'));
      FB.game.passDay({ skipFocus:true });
    }
    const merit = $('bishop-merit');
    if (merit) merit.addEventListener('click', function () { petition(false); });
    const endow = $('bishop-endow');
    if (endow) endow.addEventListener('click', function () { petition(true); });
    $('gm-cancel').addEventListener('click', function () {
      finishHouseholdPlanReturn(returnContext, function () {
        UI.showCareerPicker(cid);
      });
    });
  };

  UI.showBishopric = function () {
    const s = FB.state;
    const me = s && s.chars[s.player.charId];
    const record = me && FB.bishopricOf && FB.bishopricOf(s, me);
    if (!record) return;
    const see = FB.world.byId[record.seeProvinceId];
    const investiture = FB.investiturePolicyForPlayer &&
      FB.investiturePolicyForPlayer(s);
    const policyId = investiture && investiture.policy ||
      record.investiturePolicy || 'canonical';
    const policy = FBDATA.papacy.investiture.policies[policyId];
    const papacy = FB.ensurePapacy(s);
    const obedienceId = FB.papalObedienceForCharacter(s, me) ||
      papacy.romanObedience;
    const obedience = papacy.obediences[obedienceId];
    const pope = obedience && obedience.claimantId &&
      s.chars[obedience.claimantId];
    const currentFocus = FB.focuses.filter(function (focus) {
      return focus.id === s.player.focus;
    })[0];
    const religious = FB.religiousPathOf(s, me);
    const officePiety = religious && religious.step
      ? (FB.papacyPietyYield
        ? FB.papacyPietyYield(s, me, religious.step.pietyYield || 0)
        : religious.step.pietyYield || 0) : 0;
    const authorityNames = {
      lay:'Temporal sovereign',
      canonical:'Recognized Pope',
      concordat:'Pope and temporal sovereign',
      chapter:'Cathedral chapter',
      legacy:'Historical appointment'
    };
    const heldDays = Math.max(0, s.turn - (record.appointedTurn || 0));
    let h = '<div class="papacy-summary"><section class="papacy-card">' +
      panelh('The see') +
      kv('Office', esc(FB.T('Bishop of {see}', {
        see:see ? see.name : record.seeProvinceId
      }))) +
      kv('Tenure', esc(FB.T('{days} days', { days:heldDays }))) +
      kv('Appointed by', esc(FB.T(
        authorityNames[record.appointerKind] || 'Church authority'))) +
      kv('Current investiture', esc(policy
        ? dt(s, 'papalInvestiturePolicy', policyId, policy, 'name')
        : policyId)) +
      '</section><section class="papacy-card">' + panelh('Church standing') +
      kv('Recognized Pope', esc(pope
        ? FB.papalDisplayName(s, pope) : FB.T('The Apostolic See is vacant'))) +
      kv('Standing with the Pope', standingSpan(pope && FB.papalOpinionOfCandidate
        ? FB.papalOpinionOfCandidate(s, me, obedienceId) : 0)) +
      kv('Current focus', esc(currentFocus
        ? dt(s, 'focus', currentFocus.id, currentFocus, 'label')
        : FB.T('None'))) +
      '</section><section class="papacy-card">' + panelh('Temporalities') +
      kv('Seasonal revenue', esc(FB.T('{money:gold}', {
        gold:FB.bishopricIncome(s)
      }))) +
      kv('Seasonal office piety', esc(String(officePiety))) +
      kv('Episcopal household', esc(FB.T('{men} men-at-arms', {
        men:FB.bishopricRetinue(s)
      }))) +
      kv('Succession', esc(FB.T(
        'The see returns to the Church; private property and separate secular titles follow dynasty law.'))) +
      '</section></div>';

    const powerIds = [
      'visit_diocese', 'ecclesiastical_court',
      'convene_synod', 'extraordinary_tithe'
    ];
    const available = {};
    for (const item of FB.listInstants(s)) available[item.a.id] = item;
    h += panelh('Episcopal powers') + '<div class="gm-list">';
    for (let i = 0; i < powerIds.length; i++) {
      const item = available[powerIds[i]];
      if (!item) continue;
      h += '<button class="actionbtn" data-bishop-power="' + item.a.id + '"' +
        (item.can ? '' : ' disabled') + '>' +
        esc(dt(s, 'action', item.a.id, item.a, 'label')) +
        '<span class="adesc">' + esc(item.can
          ? FB.T('{description} · {days}-day cooldown', {
            description:FB.translateKnown(item.a.desc(s)),
            days:item.a.cd
          }) : item.reason) +
        '</span></button>';
    }
    h += '</div>';

    const cardinal = FB.cardinalPetitionStatus &&
      FB.cardinalPetitionStatus(s, me);
    if (cardinal && cardinal.visible) {
      h += panelh('College of Cardinals') +
        '<button class="actionbtn" id="bishop-cardinal"' +
        (cardinal.ready ? '' : ' disabled') + '>⛪ ' +
        esc(FB.T('Petition for the red hat · {money:gold}', {
          gold:cardinal.cost
        })) + '<span class="adesc">' + esc(cardinal.ready
          ? FB.T('All appointment requirements are met.')
          : FB.T('Unmet: {requirements}', {
            requirements:cardinal.missing.join('; ')
          })) + '</span></button>';
    }
    h += '<button class="btn" id="gm-cancel">' + esc(FB.T('Close')) +
      '</button>';
    openModal(FB.T('The Bishopric'), h, {
      modalClass:'fullsheet-modal papacy-modal'
    });
    document.querySelectorAll('[data-bishop-power]').forEach(function (button) {
      button.addEventListener('click', function () {
        const id = button.dataset.bishopPower;
        UI.closeModal();
        FB.runInstant(s, id);
      });
    });
    const cardinalButton = $('bishop-cardinal');
    if (cardinalButton) cardinalButton.addEventListener('click', function () {
      UI.showCardinalPetition(me.id, 'bishopric');
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  UI.showCardinalPetition = function (cid, returnContext) {
    const s = FB.state;
    const c = s && s.chars[cid];
    const status = c && FB.cardinalPetitionStatus &&
      FB.cardinalPetitionStatus(s, c);
    if (!status || !status.visible) return;
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'A petition asks the reigning Pope for a personal appointment. The office grants station 4 and 3.5 piety each season, but no county or secular promotion.')) +
      '</p></div>';
    if (status.missing.length) {
      h += '<div class="progressnote">' + esc(FB.T('Unmet: {requirements}', {
        requirements:status.missing.join('; ')
      })) + '</div>';
    }
    h += '<div class="modal-actions"><button class="btn primary" id="papal-petition"' +
      (status.ready ? '' : ' disabled') + '>' +
      esc(FB.T('Petition for {money:gold}', { gold:status.cost })) +
      '</button><button class="btn" id="gm-cancel">' +
      esc(FB.T('Back')) + '</button></div>';
    const historyOptions = { historyView:true };
    if (returnsToHouseholdPlan(returnContext)) {
      historyOptions.historyBackRender = function () { UI.showHouseholdPlan(); };
    }
    openModal(FB.T('Petition for the red hat'), h, historyOptions);
    const petition = $('papal-petition');
    if (petition) petition.addEventListener('click', function () {
      const result = FB.petitionForCardinal(s, c);
      if (returnsToHouseholdPlan(returnContext)) {
        UI.refresh();
        finishHouseholdPlanReturn(returnContext, UI.closeModal);
      } else {
        UI.closeModal();
        UI.refresh();
      }
      UI.toast(result && result.accepted
        ? FB.T('{name} is appointed to the College of Cardinals.', {
          name:c.name
        })
        : FB.T('Rome refuses the petition.'));
    });
    $('gm-cancel').addEventListener('click', function () {
      if (returnContext === 'bishopric') UI.showBishopric();
      else finishHouseholdPlanReturn(returnContext, function () {
        UI.showCareerPicker(cid);
      });
    });
  };

  function papalDefinitionText(s, kind, rows, id, field, fallback) {
    rows = rows || [];
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].id === id) {
        return dt(s, kind, id, rows[i], field || 'name');
      }
    }
    return FB.T(fallback || id || '');
  }

  function papalRealmLabel(s, rid) {
    if (rid === 'player') return FB.T('Your realm');
    return s.realms[rid] ? s.realms[rid].name : rid || FB.T('None');
  }

  function papalActionResult(result, success, failure, obedienceId) {
    UI.showPapacy(obedienceId);
    UI.toast(result ? FB.T(success) : FB.T(failure));
  }

  UI.showPapacy = function (obedienceId) {
    const s = FB.state;
    if (!s || !FB.ensurePapacy) return;
    const papacy = FB.ensurePapacy(s);
    const me = s.chars[s.player.charId];
    const recognizedId = FB.papalObedienceForCharacter(s, me) ||
      papacy.romanObedience;
    const chosen = papacy.obediences[obedienceId] &&
      papacy.obediences[obedienceId].status !== 'collapsed'
      ? obedienceId : recognizedId;
    const obedience = papacy.obediences[chosen];
    if (!obedience) return;
    const pope = obedience.claimantId && s.chars[obedience.claimantId];
    const election = papacy.elections[obedience.id];
    const law = election && election.law || FB.papalElectionLaw(s);
    const authorityBand = FB.papalAuthorityBand(obedience.authority);
    const investiture = FB.investiturePolicyForPlayer(s);
    const policy = investiture &&
      FBDATA.papacy.investiture.policies[investiture.policy];
    const isPlayerPope = obedience.claimantId === s.player.charId;
    const isPlayerElector = obedience.college.indexOf(s.player.charId) >= 0 &&
      FB.isCardinal(s, me);
    let h = '<div class="papacy-summary">' +
      '<section class="papacy-card">' + panelh('Obedience') +
      kv('Recognition', esc(chosen === recognizedId
        ? FB.T('Recognized by you') : FB.T('Not recognized by you'))) +
      kv('Claimant', esc(pope ? FB.papalDisplayName(s, pope) :
        FB.T('The Apostolic See is vacant'))) +
      kv('Authority', esc(FB.T('{authority}/100 · {band}', {
        authority:Math.round(obedience.authority),
        band:dt(s, 'papalAuthorityBand', authorityBand.id,
          authorityBand, 'name')
      }))) +
      kv('Supporters', esc(FB.T('{count} sovereign realms', {
        count:obedience.supporters.length
      }))) +
      kv('Strongest patron', esc(papalRealmLabel(s, obedience.strongestPatron))) +
      '</section><section class="papacy-card">' + panelh('Law and governance') +
      kv('Election law', esc(dt(s, 'papalElectionLaw', law.id,
        law, 'name'))) +
      kv('Ballot rule', esc(law.threshold === 'twoThirds'
        ? FB.T('Two-thirds of all electors')
        : FB.T('Simple majority'))) +
      kv('Outside assent', esc(law.outsideAssent
        ? FB.T('Required for legitimacy') : FB.T('Cannot override the Cardinals'))) +
      kv('Enclosure', esc(law.enclosed
        ? FB.T('Ten-day vacancy, then conclave') : FB.T('Open election'))) +
      kv('Investiture', esc(policy ? dt(s, 'papalInvestiturePolicy',
        investiture.policy, policy, 'name') : FB.T('Not applicable'))) +
      '</section></div>';

    const activeObediences = [];
    for (const oid in papacy.obediences) {
      const item = papacy.obediences[oid];
      if (item && (item.status === 'active' || item.status === 'resisting')) {
        activeObediences.push(item);
      }
    }
    if (activeObediences.length > 1) {
      h += panelh('Rival obediences') + '<div class="papacy-tabs">';
      for (const item of activeObediences) {
        const claimant = item.claimantId && s.chars[item.claimantId];
        h += '<button class="btn small' + (item.id === chosen ? ' primary' : '') +
          '" data-papacy-obedience="' + esc(item.id) + '">' +
          esc(claimant ? FB.papalDisplayName(s, claimant) :
            FB.T('Vacant obedience')) + ' · ' +
          esc(FB.T('{authority} authority', {
            authority:Math.round(item.authority)
          })) + '</button>';
      }
      h += '</div>';
    }

    if (papacy.pendingInvestitureDemand) {
      h += '<section class="papacy-alert" role="status">' +
        panelh('Papal investiture demand') +
        '<p>' + esc(FB.T(
          'The Pope demands canonical investiture. Acceptance strengthens Papal authority; refusal creates grounds for excommunication.')) +
        '</p><div class="modal-actions"><button class="btn primary" ' +
        'data-investiture-answer="canonical">' +
        esc(FB.T('Accept canonical investiture')) + '</button>' +
        (s.date.year >= FBDATA.papacy.investiture.concordatFrom
          ? '<button class="btn" data-investiture-answer="concordat">' +
            esc(FB.T('Offer a concordat')) + '</button>' : '') +
        '<button class="btn danger" data-investiture-answer="refuse">' +
        esc(FB.T('Refuse the command')) + '</button></div></section>';
    }
    if (papacy.pendingSchism) {
      const rival = s.chars[papacy.pendingSchism.rivalId];
      h += '<section class="papacy-alert" role="status">' +
        panelh('A rival claimant seeks your backing') +
        '<p>' + esc(FB.T(
          '{name} asks your realm to sponsor a rival obedience. This will divide the Church and cancel any gathering Catholic great holy war.', {
            name:rival ? FB.fullName(rival) : FB.T('The runner-up')
          })) + '</p><div class="modal-actions">' +
        '<button class="btn danger" data-schism-sponsor="yes">' +
        esc(FB.T('Sponsor the rival')) + '</button>' +
        '<button class="btn" data-schism-sponsor="no">' +
        esc(FB.T('Refuse')) + '</button></div></section>';
    }
    if (papacy.pendingDeposedPlayer) {
      h += '<section class="papacy-alert" role="status">' +
        panelh('Your claim has been deposed') +
        '<p>' + esc(FB.T(
          'You may submit and continue as a retired former Cardinal, or resist while Rome or a sovereign patron sustains your claim.')) +
        '</p><div class="modal-actions">' +
        '<button class="btn primary" data-deposed-choice="submit">' +
        esc(FB.T('Submit')) + '</button>' +
        '<button class="btn danger" data-deposed-choice="resist"' +
        (papacy.pendingDeposedPlayer.canResist ? '' : ' disabled') + '>' +
        esc(FB.T('Resist')) + '</button></div></section>';
    }

    if (election && election.phase !== 'resolved') {
      h += panelh(law.enclosed ? 'Conclave' : 'Papal election');
      h += '<section class="papacy-card">' +
        kv('Phase', esc(election.phase === 'name'
          ? FB.T('Regnal name') : election.phase === 'vacancy'
            ? FB.T('Vacancy') : FB.T('Balloting'))) +
        kv('Ballot', String(election.round || 0)) +
        kv('Compromise candidate', esc(election.compromiseId &&
          s.chars[election.compromiseId]
          ? FB.fullName(s.chars[election.compromiseId]) : FB.T('None'))) +
        kv('Promises saved', String((election.promises || []).length)) +
        '</section>';
      if (election.phase === 'name' &&
          election.winnerId === s.player.charId) {
        h += '<div class="gm-list">';
        for (const choice of FB.papalRegnalChoices(s, s.player.charId)) {
          h += '<button class="actionbtn" data-papal-name="' +
            esc(choice.name) + '">🔔 ' + esc(choice.display) +
            '<span class="adesc">' + esc(choice.retained
              ? FB.T('Retain your own name.')
              : FB.T('Take a historic Papal regnal name.')) +
            '</span></button>';
        }
        h += '</div>';
      } else {
        const wait = Math.max(0, election.waitUntil - s.turn);
        if (wait) {
          h += '<div class="progressnote">' + esc(FB.T(
            'The enclosed conclave opens in {days} days.', { days:wait })) +
            '</div>';
        } else if (isPlayerElector) {
          h += '<div class="gm-body-text"><p>' + esc(FB.T(
            'Choose one tactic for this ballot. Every elector’s current lean is shown below; the saved ballot may still vary.')) +
            '</p></div><div class="papacy-tactics">';
          for (const tactic of FBDATA.papacy.tactics) {
            if (tactic.closedFrom && s.date.year >= tactic.closedFrom) continue;
            const disabled = tactic.id === 'backing' && s.player.prestige < 100;
            const tacticName = dt(s, 'papalElectionTactic', tactic.id,
              tactic, 'name');
            const tacticDesc = dt(s, 'papalElectionTactic', tactic.id,
              tactic, 'desc');
            h += '<button class="btn small" data-papal-tactic="' +
              esc(tactic.id) + '" title="' + esc(tacticDesc) + '"' +
              (disabled ? ' disabled' : '') + '>' +
              esc(tacticName) + '</button>';
          }
          h += '</div>';
        } else {
          h += '<div class="progressnote">' + esc(FB.T(
            'The Cardinals will conduct the next ballot as the calendar advances.')) +
            '</div>';
        }
      }
    }

    const leans = election ? FB.papalElectionLeans(s, obedience.id) : [];
    const leanByElector = {};
    for (const lean of leans) leanByElector[lean.electorId] = lean;
    h += panelh(s.date.year >= 1150 ? 'College of Cardinals' : 'Cardinal electors') +
      '<div class="papacy-college">';
    for (const cardinalId of obedience.college) {
      const c = s.chars[cardinalId];
      const record = papacy.cardinals[cardinalId];
      if (!c || c.dead || !record) continue;
      const lean = leanByElector[c.id];
      const votedId = election && election.lastVotes &&
        election.lastVotes[c.id];
      const leaning = lean && lean.candidateId && s.chars[lean.candidateId];
      const voted = votedId && s.chars[votedId];
      const offices = [];
      if (obedience.deanId === c.id) offices.push(FB.T('Dean'));
      if (obedience.camerlengoId === c.id) offices.push(FB.T('Camerlengo'));
      h += '<button class="papacy-elector" ' +
        'data-papal-character="' + esc(c.id) + '">' +
        '<span><b>' + esc(FB.fullName(c)) + '</b><small>' +
        esc(papalDefinitionText(s, 'papalCardinalOrder',
          FBDATA.papacy.cardinalOrders, record.order, 'name',
          'Cardinal')) + ' · ' + esc(record.titleChurch) +
        ' · ' + esc(papalDefinitionText(s, 'papalCardinalBloc',
          FBDATA.papacy.blocs, record.bloc, 'name', record.bloc)) +
        (offices.length ? ' · ' + esc(offices.join(', ')) : '') +
        '</small></span><span class="papacy-vote">' +
        esc(voted ? FB.T('Voted: {name}', { name:FB.papalDisplayName(s, voted) })
          : leaning ? FB.T('Leans: {name}', {
            name:FB.papalDisplayName(s, leaning)
          }) : FB.T('No declared lean')) +
        (lean ? '<small>' + esc(FB.T('relevant opinion {opinion}', {
          opinion:(lean.opinion > 0 ? '+' : '') + lean.opinion
        })) + '</small>' : '') +
        '</span></button>';
    }
    h += '</div>';

    if (election && election.lastCounts &&
        Object.keys(election.lastCounts).length) {
      const countText = [];
      for (const candidateId in election.lastCounts) {
        const candidate = s.chars[candidateId];
        if (candidate) countText.push(FB.T('{name}: {votes}', {
          name:FB.papalDisplayName(s, candidate),
          votes:election.lastCounts[candidateId]
        }));
      }
      h += '<div class="progressnote">' +
        esc(FB.T('Last ballot · {count}', {
          count:countText.join(' · ')
        })) + '</div>';
    }

    h += panelh('Investiture') + '<section class="papacy-card">' +
      '<p>' + esc(policy ? dt(s, 'papalInvestiturePolicy',
        investiture.policy, policy, 'desc') :
        FB.T('Your non-Catholic realm has no Catholic investiture policy.')) +
      '</p>';
    if (policy) {
      h += '<p class="hint">' + esc(FB.T(
        'Tax {tax}% · realm strength {strength}% · seasonal piety {piety}', {
          tax:Math.round(policy.tax * 100),
          strength:Math.round(policy.strength * 100),
          piety:(policy.piety > 0 ? '+' : '') + policy.piety
        })) + '</p>';
      const policyAction = FB.isPlayerSovereign(s)
        ? 'data-set-investiture' : s.player.liege
          ? 'data-petition-investiture' : null;
      if (policyAction && !isPlayerPope) {
        h += '<div class="papacy-tactics">';
        for (const policyId in FBDATA.papacy.investiture.policies) {
          if (policyId === 'concordat' &&
              s.date.year < FBDATA.papacy.investiture.concordatFrom) continue;
          const item = FBDATA.papacy.investiture.policies[policyId];
          h += '<button class="btn small" ' + policyAction + '="' +
            esc(policyId) + '"' +
            (investiture.policy === policyId ? ' disabled' : '') + '>' +
            esc(dt(s, 'papalInvestiturePolicy', policyId,
              item, 'name')) + '</button>';
        }
        h += '</div>';
      }
    }
    h += '</section>';

    const activeSentences = [];
    for (const key in papacy.excommunications) {
      const sentence = papacy.excommunications[key];
      if (sentence &&
          (sentence.clearedTurn === null ||
            sentence.clearedTurn === undefined) &&
          sentence.obedienceId === obedience.id) activeSentences.push(sentence);
    }
    if (activeSentences.length) {
      h += panelh('Sanctions') + '<section class="papacy-card">';
      for (const sentence of activeSentences) {
        const target = s.chars[sentence.targetId];
        h += kv(target ? FB.fullName(target) : sentence.targetId,
          esc(FB.T('{cause} · {kind}', {
            cause:sentence.cause,
            kind:sentence.justified ? FB.T('justified') : FB.T('arbitrary')
          })));
      }
      h += '</section>';
    }

    if (isPlayerPope) {
      h += panelh('Papal governance') + '<div class="gm-list">';
      h += '<button class="actionbtn" id="papal-consistory"' +
        (obedience.college.length >= FBDATA.papacy.targetCollege ||
          obedience.lastConsistoryYear === s.date.year ? ' disabled' : '') +
        '>⛪ ' + esc(FB.T('Hold a consistory')) +
        '<span class="adesc">' + esc(FB.T(
          'Appoint up to two Cardinals while the College is below twelve.')) +
        '</span></button>';
      h += '<button class="actionbtn" id="papal-legation"' +
        (obedience.lastLegationYear === s.date.year ||
          s.player.gold < FBDATA.papacy.balance.popeLegationGold
          ? ' disabled' : '') + '>📜 ' + esc(FB.T('Send a legation')) +
        '<span class="adesc">' + esc(FB.T(
          'Spend {money:gold} once this year to build one authority.', {
            gold:FBDATA.papacy.balance.popeLegationGold
          })) + '</span></button>';
      h += '<button class="actionbtn" id="papal-audience">🤝 ' +
        esc(FB.T('Receive a ruler in audience')) + '</button>';
      if (FB.papacyInSchism(s)) {
        h += '<button class="actionbtn" id="papal-recognition">⚖ ' +
          esc(FB.T('Bargain for recognition')) +
          '<span class="adesc">' + esc(FB.T(
            'Offer patronage to a sovereign that recognizes a rival claimant.')) +
          '</span></button>';
      }
      h += '<button class="actionbtn" id="papal-investiture-demands"' +
        (s.date.year < FBDATA.papacy.investiture.reformFrom ||
          obedience.authority <
            FBDATA.papacy.authority.gates.investiture ? ' disabled' : '') +
        '>📜 ' + esc(FB.T('Demand canonical investiture')) + '</button>';
      h += '<button class="actionbtn" id="papal-sanctions"' +
        (obedience.authority <
          FBDATA.papacy.authority.gates.sanctions ? ' disabled' : '') +
        '>⛓ ' + esc(FB.T('Issue an excommunication')) + '</button>';
      h += '<button class="actionbtn" id="papal-great-holy-war"' +
        (FB.canCallGreatHolyWar(s, 'catholic', null, 'player')
          ? '' : ' disabled') + '>📯 ' +
        esc(FB.T('Call a Catholic great holy war')) + '</button>';
      if (FB.papacyInSchism(s)) {
        h += '<button class="actionbtn" id="papal-council"' +
          (obedience.authority < FBDATA.papacy.authority.gates.council ||
            !isFinite(papacy.schismStartedTurn) ||
            s.turn - papacy.schismStartedTurn <
              FBDATA.papacy.schism.councilAfterDays ? ' disabled' : '') +
          '>🕊 ' + esc(FB.T('Call a general council')) + '</button>';
        h += '<button class="actionbtn" id="papal-submit-claim">🕊 ' +
          esc(FB.T('Submit your claim voluntarily')) +
          '<span class="adesc">' + esc(FB.T(
            'End your obedience and continue as a retired former Cardinal.')) +
          '</span></button>';
      }
      h += '</div>';
    }

    if (FB.papacyInSchism(s) && chosen !== recognizedId) {
      const days = s.player.lastObedienceSwitchTurn === undefined ? 0 :
        Math.max(0, FBDATA.papacy.schism.switchCooldownDays -
          (s.turn - s.player.lastObedienceSwitchTurn));
      const cannotSwitch = s.player.piety < FBDATA.papacy.schism.switchPiety ||
        s.player.prestige < FBDATA.papacy.schism.switchPrestige || days ||
        !FB.isPlayerSovereign(s);
      h += '<button class="actionbtn" id="papal-switch-obedience"' +
        (cannotSwitch ? ' disabled' : '') + '>⚖ ' +
        esc(FB.T('Recognize this claimant')) +
        '<span class="adesc">' + esc(FB.T(
          FB.isPlayerSovereign(s)
            ? 'Costs {piety} piety and {prestige} prestige; the next change is barred for five years.{cooldown}'
            : 'Your sovereign determines the obedience recognized by every vassal in the realm.', {
            piety:FBDATA.papacy.schism.switchPiety,
            prestige:FBDATA.papacy.schism.switchPrestige,
            cooldown:days ? FB.T(' {days} days remain.', { days:days }) : ''
          })) + '</span></button>';
    }

    h += '<div class="modal-actions"><button class="btn" id="gm-cancel">' +
      esc(FB.T('Close')) + '</button></div>';
    openModal(FB.T('Papacy and College'), h, {
      modalClass:'fullsheet-modal papacy-modal'
    });

    document.querySelectorAll('[data-papacy-obedience]').forEach(function (b) {
      b.addEventListener('click', function () {
        UI.showPapacy(b.dataset.papacyObedience);
      });
    });
    document.querySelectorAll('[data-papal-character]').forEach(function (b) {
      b.addEventListener('click', function () {
        UI.showCharModal(b.dataset.papalCharacter);
      });
    });
    document.querySelectorAll('[data-papal-tactic]').forEach(function (b) {
      b.addEventListener('click', function () {
        const tactic = FBDATA.papacy.tactics.filter(function (item) {
          return item.id === b.dataset.papalTactic;
        })[0];
        if (tactic && tactic.target !== 'none') {
          UI.showPapalTacticTargets(obedience.id, tactic.id);
        } else {
          FB.papalElectionBallot(s, obedience.id,
            b.dataset.papalTactic, null);
          UI.showPapacy(obedience.id);
        }
      });
    });
    document.querySelectorAll('[data-papal-name]').forEach(function (b) {
      b.addEventListener('click', function () {
        FB.choosePapalName(s, obedience.id, b.dataset.papalName);
        UI.showPapacy(obedience.id);
      });
    });
    document.querySelectorAll('[data-investiture-answer]').forEach(function (b) {
      b.addEventListener('click', function () {
        const choice = b.dataset.investitureAnswer;
        FB.answerInvestitureDemand(s, choice !== 'refuse', choice);
        UI.showPapacy(obedience.id);
      });
    });
    document.querySelectorAll('[data-schism-sponsor]').forEach(function (b) {
      b.addEventListener('click', function () {
        FB.resolvePapalSchismSponsorship(s,
          b.dataset.schismSponsor === 'yes');
        UI.showPapacy();
      });
    });
    document.querySelectorAll('[data-deposed-choice]').forEach(function (b) {
      b.addEventListener('click', function () {
        FB.resolveDeposedPlayerClaimant(s,
          b.dataset.deposedChoice === 'resist');
        UI.showPapacy();
      });
    });
    document.querySelectorAll('[data-set-investiture]').forEach(function (b) {
      b.addEventListener('click', function () {
        FB.setInvestiturePolicy(s, b.dataset.setInvestiture, 'player', false);
        UI.showPapacy(obedience.id);
      });
    });
    document.querySelectorAll('[data-petition-investiture]').forEach(function (b) {
      b.addEventListener('click', function () {
        const result = FB.petitionLiegeInvestiture(
          s, b.dataset.petitionInvestiture);
        papalActionResult(result && result.accepted,
          'Your liege accepts the petition.',
          'Your liege refuses the petition.', obedience.id);
      });
    });
    const switcher = $('papal-switch-obedience');
    if (switcher) switcher.addEventListener('click', function () {
      papalActionResult(FB.switchPapalObedience(s, obedience.id),
        'Your realm changes obedience.',
        'Your realm cannot change obedience now.', obedience.id);
    });
    const consistory = $('papal-consistory');
    if (consistory) consistory.addEventListener('click', function () {
      UI.showPapalConsistory(obedience.id);
    });
    const legation = $('papal-legation');
    if (legation) legation.addEventListener('click', function () {
      papalActionResult(FB.papalLegation(s, obedience.id),
        'The legation strengthens Papal authority.',
        'No legation can be sent now.', obedience.id);
    });
    const audience = $('papal-audience');
    if (audience) audience.addEventListener('click', function () {
      UI.showPapalAudienceTargets(obedience.id);
    });
    const recognition = $('papal-recognition');
    if (recognition) recognition.addEventListener('click', function () {
      UI.showPapalRecognitionTargets(obedience.id);
    });
    const demands = $('papal-investiture-demands');
    if (demands) demands.addEventListener('click', function () {
      UI.showPapalInvestitureTargets(obedience.id);
    });
    const sanctions = $('papal-sanctions');
    if (sanctions) sanctions.addEventListener('click', function () {
      UI.showPapalSanctionTargets(obedience.id);
    });
    const holyWar = $('papal-great-holy-war');
    if (holyWar) holyWar.addEventListener('click', function () {
      UI.showGreatHolyWarTargets();
    });
    const council = $('papal-council');
    if (council) council.addEventListener('click', function () {
      UI.showPapalCouncil(obedience.id);
    });
    const submitClaim = $('papal-submit-claim');
    if (submitClaim) submitClaim.addEventListener('click', function () {
      let strongest = null;
      for (const oid in papacy.obediences) {
        const rival = papacy.obediences[oid];
        if (!rival || oid === obedience.id || rival.status !== 'active') continue;
        if (!strongest || rival.supporters.length > strongest.supporters.length) {
          strongest = rival;
        }
      }
      if (!strongest) return;
      FB.reunifyPapacy(s, strongest.id, 'voluntary submission', false);
      FB.resolveDeposedPlayerClaimant(s, false);
      UI.showPapacy();
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  UI.showPapalTacticTargets = function (obedienceId, tacticId) {
    const s = FB.state;
    const papacy = FB.ensurePapacy(s);
    const obedience = papacy.obediences[obedienceId];
    const election = papacy.elections[obedienceId];
    if (!obedience || !election) return;
    let ids = obedience.college.slice();
    if (tacticId === 'withdraw' && election.compromiseId) {
      ids.push(election.compromiseId);
    }
    ids = ids.filter(function (id, index, all) {
      return id !== s.player.charId && all.indexOf(id) === index &&
        s.chars[id] && !s.chars[id].dead;
    });
    let h = '<div class="gm-list">';
    for (const id of ids) {
      const c = s.chars[id];
      h += '<button class="actionbtn" data-papal-tactic-target="' +
        esc(c.id) + '">' + esc(FB.fullName(c)) +
        '<span class="adesc">' + esc(FB.T(
          'Standing {standing} · Learning {learning} · Diplomacy {diplomacy}', {
            standing:standingText(FB.standingOf(s, {
              kind:'character', id:c.id
            })),
            learning:FB.skillOf(c, 'lea'),
            diplomacy:FB.skillOf(c, 'dip')
          })) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">' +
      esc(FB.T('Back')) + '</button>';
    const tactic = FBDATA.papacy.tactics.filter(function (item) {
      return item.id === tacticId;
    })[0];
    openModal(tactic ? dt(s, 'papalElectionTactic', tactic.id,
      tactic, 'name') : FB.T('Choose a target'), h,
      { historyView:true });
    document.querySelectorAll('[data-papal-tactic-target]').forEach(function (b) {
      b.addEventListener('click', function () {
        FB.papalElectionBallot(s, obedienceId, tacticId,
          b.dataset.papalTacticTarget);
        UI.showPapacy(obedienceId);
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      UI.showPapacy(obedienceId);
    });
  };

  UI.showPapalConsistory = function (obedienceId) {
    const s = FB.state;
    const candidates = FB.papalAppointmentCandidates(s, obedienceId, true);
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Choose up to two qualified bishops. One family appointment per pontificate is tolerated; later relatives cost authority and Curial opinion.')) +
      '</p></div><div class="gm-list">';
    for (const c of candidates) {
      h += '<label class="papacy-choice"><input type="checkbox" ' +
        'data-consistory-choice="' + esc(c.id) + '"> <span><b>' +
        esc(FB.fullName(c)) + '</b><small>' + esc(FB.T(
          'Age {age} · Learning {learning} · Curial opinion {opinion}', {
            age:FB.ageOf(c, s.date.year),
            learning:FB.skillOf(c, 'lea'),
            opinion:(c.curialOpinion > 0 ? '+' : '') +
              Math.round(c.curialOpinion || 0)
          })) + '</small></span></label>';
    }
    h += '</div><div class="modal-actions"><button class="btn primary" ' +
      'id="papal-appoint-cardinals">' + esc(FB.T('Make appointments')) +
      '</button><button class="btn" id="gm-cancel">' +
      esc(FB.T('Back')) + '</button></div>';
    openModal(FB.T('Hold a consistory'), h, { historyView:true });
    const checks = document.querySelectorAll('[data-consistory-choice]');
    for (const check of checks) {
      check.addEventListener('change', function () {
        const selected = document.querySelectorAll(
          '[data-consistory-choice]:checked');
        if (selected.length > FBDATA.papacy.annualAppointments) {
          check.checked = false;
        }
      });
    }
    $('papal-appoint-cardinals').addEventListener('click', function () {
      const choices = [];
      document.querySelectorAll('[data-consistory-choice]:checked')
        .forEach(function (check) {
          choices.push(check.dataset.consistoryChoice);
        });
      if (!choices.length) return;
      FB.holdConsistory(s, obedienceId, choices);
      UI.showPapacy(obedienceId);
    });
    $('gm-cancel').addEventListener('click', function () {
      UI.showPapacy(obedienceId);
    });
  };

  UI.showPapalAudienceTargets = function (obedienceId) {
    const s = FB.state;
    const papacy = FB.ensurePapacy(s);
    const obedience = papacy.obediences[obedienceId];
    let h = '<div class="gm-list">';
    for (const target of FB.papalRulerTargets(s)) {
      if (obedience && target.c.id === obedience.claimantId) continue;
      const key = obedienceId + ':' + target.realmId;
      const used = papacy.audiences && papacy.audiences[key] === s.date.year;
      h += '<button class="actionbtn" data-papal-audience="' +
        esc(target.realmId) + '"' + (used ? ' disabled' : '') + '>' +
        esc(FB.fullName(target.c)) + '<span class="adesc">' +
        esc(papalRealmLabel(s, target.realmId)) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">' +
      esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Ruler audiences'), h, { historyView:true });
    document.querySelectorAll('[data-papal-audience]').forEach(function (b) {
      b.addEventListener('click', function () {
        FB.papalAudience(s, b.dataset.papalAudience, obedienceId);
        UI.showPapacy(obedienceId);
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      UI.showPapacy(obedienceId);
    });
  };

  UI.showPapalRecognitionTargets = function (obedienceId) {
    const s = FB.state;
    const papacy = FB.ensurePapacy(s);
    const cost = FBDATA.papacy.balance.recognitionBargainGold;
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'A bargain costs {money:gold}. Success moves the realm publicly into your obedience and creates a patronage promise that costs authority.', {
        gold:cost
      })) + '</p></div><div class="gm-list">';
    for (const target of FB.papalRecognitionTargets(s, obedienceId)) {
      const key = obedienceId + ':' + target.realmId;
      const used = papacy.recognitionBargains &&
        papacy.recognitionBargains[key] === s.date.year;
      h += '<button class="actionbtn" data-papal-recognition="' +
        esc(target.realmId) + '"' +
        (used || s.player.gold < cost ? ' disabled' : '') + '>' +
        esc(papalRealmLabel(s, target.realmId)) +
        '<span class="adesc">' + esc(FB.T(
          '{ruler} · Standing {standing}', {
            ruler:FB.fullName(target.c),
            standing:standingText(FB.standingOf(s, {
              kind:'realm', id:target.realmId
            }))
          })) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">' +
      esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Recognition bargaining'), h, { historyView:true });
    document.querySelectorAll('[data-papal-recognition]').forEach(function (b) {
      b.addEventListener('click', function () {
        const result = FB.papalRecognitionBargain(
          s, b.dataset.papalRecognition, obedienceId);
        papalActionResult(result && result.accepted,
          'The sovereign recognizes your claim.',
          'The sovereign refuses to change obedience.', obedienceId);
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      UI.showPapacy(obedienceId);
    });
  };

  UI.showPapalInvestitureTargets = function (obedienceId) {
    const s = FB.state;
    let h = '<div class="gm-list">';
    for (const target of FB.papalRulerTargets(s)) {
      const policy = FB.investiturePolicyForRealm(s, target.realmId);
      if (!policy || policy.policy !== 'lay') continue;
      h += '<button class="actionbtn" data-papal-investiture-target="' +
        esc(target.realmId) + '">' + esc(papalRealmLabel(s, target.realmId)) +
        '<span class="adesc">' + esc(FB.T(
          '{ruler} retains lay investiture.', {
            ruler:FB.fullName(target.c)
          })) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">' +
      esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Demand canonical investiture'), h, { historyView:true });
    document.querySelectorAll('[data-papal-investiture-target]')
      .forEach(function (b) {
        b.addEventListener('click', function () {
          FB.papalInvestitureDemand(
            s, b.dataset.papalInvestitureTarget, obedienceId);
          UI.showPapacy(obedienceId);
        });
      });
    $('gm-cancel').addEventListener('click', function () {
      UI.showPapacy(obedienceId);
    });
  };

  UI.showPapalSanctionTargets = function (obedienceId) {
    const s = FB.state;
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'A justified sentence needs a recorded ground. An arbitrary sentence needs 50 authority, costs 300 piety, and damages authority and Standing with Catholic rulers.')) +
      '</p></div><div class="gm-list">';
    for (const target of FB.papalRulerTargets(s)) {
      if (FB.excommunicationOf(s, target.c.id, obedienceId)) continue;
      const justified = FB.papalSanctionStatus(
        s, target.c, obedienceId, false);
      const arbitrary = FB.papalSanctionStatus(
        s, target.c, obedienceId, true);
      h += '<div class="papacy-sanction-row"><b>' +
        esc(FB.fullName(target.c)) + '</b><small>' +
        esc(papalRealmLabel(s, target.realmId)) + '</small>' +
        '<div><button class="btn small" data-papal-sanction="' +
        esc(target.c.id) + '" data-arbitrary="no"' +
        (justified.ready ? '' : ' disabled title="' +
          esc(justified.reason) + '"') + '>' +
        esc(FB.T('Justified · {piety} piety', {
          piety:justified.cost
        })) + '</button><button class="btn small danger" ' +
        'data-papal-sanction="' + esc(target.c.id) +
        '" data-arbitrary="yes"' +
        (arbitrary.ready ? '' : ' disabled title="' +
          esc(arbitrary.reason) + '"') + '>' +
        esc(FB.T('Arbitrary · {piety} piety', {
          piety:arbitrary.cost
        })) + '</button></div></div>';
    }
    h += '</div><button class="btn" id="gm-cancel">' +
      esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Excommunication'), h, { historyView:true });
    document.querySelectorAll('[data-papal-sanction]').forEach(function (b) {
      b.addEventListener('click', function () {
        FB.papalExcommunicate(s, b.dataset.papalSanction,
          obedienceId, b.dataset.arbitrary === 'yes');
        UI.showPapacy(obedienceId);
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      UI.showPapacy(obedienceId);
    });
  };

  UI.showPapalCouncil = function (obedienceId) {
    const h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'A general council may recognize your claimant, or depose every claimant and elect a compromise outsider.')) +
      '</p></div><div class="gm-list">' +
      '<button class="actionbtn" data-papal-council="recognize">' +
      esc(FB.T('Recognize this claimant')) + '</button>' +
      '<button class="actionbtn danger" data-papal-council="depose">' +
      esc(FB.T('Depose all and elect a compromise Pope')) +
      '</button></div><button class="btn" id="gm-cancel">' +
      esc(FB.T('Back')) + '</button>';
    openModal(FB.T('General council'), h, {
      historyView:true, noFocus:true
    });
    document.querySelectorAll('[data-papal-council]').forEach(function (b) {
      b.addEventListener('click', function () {
        FB.callPapalCouncil(FB.state, obedienceId,
          b.dataset.papalCouncil === 'depose');
        UI.showPapacy(obedienceId);
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      UI.showPapacy(obedienceId);
    });
  };

  UI.showEnterpriseMarket = function (settlement, returnContext) {
    const s = FB.state;
    const sts = FB.settlementsOf(s, s.player.provinceId);
    const place = sts[settlement] ? sts[settlement].name : '?';
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'One enterprise of each kind may stand in a settlement. It earns only while an eligible household member works there.')) +
      '</p></div><div class="gm-list">';
    for (const item of FB.enterpriseAvailable(s, settlement)) {
      const short = s.player.gold < item.cost;
      const preview = {
        provinceId:s.player.provinceId,
        settlement:settlement
      };
      h += '<button class="actionbtn" data-enterprise-buy="' + item.id + '"' +
        (short ? ' disabled' : '') + '>' +
        esc(FB.T('{icon} {name}', {
          icon:item.def.icon, name:dt(s, 'enterprise', item.id, item.def, 'name')
        })) + '<span class="adesc">' + esc(dt(s, 'enterprise', item.id, item.def, 'desc')) +
        ' ' + esc(item.workers.length
          ? FB.T('{count} eligible household workers.', { count:item.workers.length })
          : FB.T('No eligible worker yet — it would stand idle.')) +
        '</span>' + assetEffectSummary({
          compact:true,
          owner:FB.T('Household dynasty'),
          scope:enterprisePlace(s, preview),
          setupCost:assetMoneyCost(item.cost, !short),
          recurringCost:enterpriseRecurringCost(),
          effect:enterpriseEffectText(s, preview, item.def, true),
          transferRule:enterpriseTransferRule(),
          expiry:FB.T('No fixed end')
        }) + '</button>';
    }
    h += '</div><button class="btn" id="gm-cancel">' + esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Enterprise in {settlement}', { settlement:place }), h,
      householdPlanHistoryOptions(returnContext));
    document.querySelectorAll('[data-enterprise-buy]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!FB.buyEnterprise(s, b.dataset.enterpriseBuy, settlement)) return;
        UI.closeModal();
        FB.game.passDay({ skipFocus:true });
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      finishHouseholdPlanReturn(returnContext, UI.showLivelihoods);
    });
  };

  UI.showEnterpriseManage = function (uid, returnContext) {
    const s = FB.state;
    let e = null;
    for (const item of FB.enterpriseList(s)) if (item.uid === uid) e = item;
    if (!e || !FBDATA.enterprises[e.type]) return;
    const def = FBDATA.enterprises[e.type];
    function enterpriseLabel(item) {
      const itemDef = item && FBDATA.enterprises[item.type];
      if (!itemDef) return FB.T('Unknown enterprise');
      const pr = FB.world.byId[item.provinceId];
      const settlements = pr ? FB.settlementsOf(s, item.provinceId) : [];
      const place = settlements[item.settlement]
        ? settlements[item.settlement].name : (pr ? pr.name : FB.T('unknown place'));
      return FB.T('{enterprise} in {place}', {
        enterprise:dt(s, 'enterprise', item.type, itemDef, 'name'),
        place:place
      });
    }
    function workerAssignment(cid) {
      for (const item of FB.enterpriseList(s)) {
        if (item.workerId === cid) return item;
      }
      return null;
    }
    function assignmentConsequence(worker, current) {
      if (current && current.uid === e.uid) return FB.T('Keeps the current assignment.');
      const parts = [];
      const displaced = e.workerId && s.chars[e.workerId];
      if (displaced && displaced.id !== worker.id) {
        parts.push(FB.T(
          'Replaces {name}, who returns to ordinary household work.',
          { name:displaced.name }));
        if (e.workerLocked) {
          parts.push(FB.T('This enterprise’s staffing lock will be cleared.'));
        }
      }
      if (current && current.uid !== e.uid) {
        parts.push(FB.T('{enterprise} becomes idle.', {
          enterprise:enterpriseLabel(current)
        }));
        if (current.workerLocked) {
          parts.push(FB.T('That enterprise’s staffing lock will be cleared.'));
        }
      }
      return parts.length ? parts.join(' ') : FB.T('No one is displaced.');
    }
    let h = '<div class="gm-body-text"><p>' + esc(dt(s, 'enterprise', e.type, def, 'desc')) +
      '</p>' + assetEffectSummary({
        owner:FB.T('Household dynasty'),
        scope:enterprisePlace(s, e),
        setupCost:FB.T('Paid on purchase'),
        recurringCost:enterpriseRecurringCost(),
        effect:enterpriseEffectText(s, e, def, false),
        transferRule:enterpriseTransferRule(),
        expiry:FB.T('No fixed end')
      }) + '</div><label class="enterprise-worker-lock' +
      (!e.workerId ? ' disabled' : '') + '"><input type="checkbox" ' +
      'id="enterprise-worker-lock"' + (e.workerLocked ? ' checked' : '') +
      (!e.workerId ? ' disabled' : '') + '> <span>' +
      esc(FB.T('Lock this worker to this enterprise')) + '</span>' +
      '<span class="adesc">' + esc(e.workerId
        ? FB.T('The staffing assistant will preserve this pairing. Manual changes may still replace it.')
        : FB.T('Assign a worker before locking this enterprise.')) +
      '</span></label><div class="gm-list">';
    for (const c of FB.enterpriseWorkers(s, e.type)) {
      const current = workerAssignment(c.id);
      const preview = {
        type:e.type, provinceId:e.provinceId, settlement:e.settlement,
        workerId:c.id
      };
      h += personAssignmentCard({
        person:c,
        selected:e.workerId === c.id,
        eligibility:e.workerId === c.id
          ? FB.T('Currently assigned') : FB.T('Eligible worker'),
        data:{ enterpriseWorker:c.id },
        rows:[
          { label:'Expected yield', value:FB.T('About {money:amount} each season', {
            amount:Math.round(FB.enterpriseYield(s, preview) * 10) / 10
          }) },
          { label:'Cost / pay', value:FB.T('No assignment fee') },
          { label:'Occupation', value:FB.careerTitle(s, c) },
          { label:'Standing', value:standingText(FB.standingOf(s, {
            kind:'character', id:c.id
          })) },
          { label:'Current assignment', value:current
            ? (current.uid === e.uid ? FB.T('This enterprise') : enterpriseLabel(current))
            : FB.T('No enterprise assignment') },
          { label:'Consequence', kind:'consequence',
            value:assignmentConsequence(c, current) }
        ]
      });
    }
    h += '<button class="actionbtn" data-enterprise-worker="">' +
      (e.workerId ? '○ ' : '◉ ') + esc(FB.T('Leave it idle')) +
      '<span class="adesc">' + esc(FB.T('An idle enterprise produces no seasonal income.')) +
      '</span></button></div><button class="btn" id="gm-cancel">' + esc(FB.T('Back')) + '</button>';
    openModal(def.icon + ' ' + dt(s, 'enterprise', e.type, def, 'name'), h,
      householdPlanHistoryOptions(returnContext));
    FB.paintFaces($('gm-body'), s);
    if ($('enterprise-worker-lock')) {
      $('enterprise-worker-lock').addEventListener('change', function () {
        if (!FB.setEnterpriseWorkerLock(s, uid, this.checked)) {
          this.checked = false;
          this.disabled = true;
        }
        UI.refresh();
      });
    }
    document.querySelectorAll('[data-enterprise-worker]').forEach(function (b) {
      b.addEventListener('click', function () {
        FB.assignEnterprise(s, uid, b.dataset.enterpriseWorker || null);
        if (returnsToHouseholdPlan(returnContext)) {
          UI.refresh();
          finishHouseholdPlanReturn(returnContext, UI.showLivelihoods);
        } else {
          UI.showLivelihoods();
          UI.refresh();
        }
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      finishHouseholdPlanReturn(returnContext, UI.showLivelihoods);
    });
  };

  function enterpriseStaffingLabel(s, row) {
    const def = row && FBDATA.enterprises[row.type];
    const province = FB.world.byId[row.provinceId];
    const settlements = province ? FB.settlementsOf(s, row.provinceId) : [];
    const place = settlements[row.settlement]
      ? settlements[row.settlement].name
      : (province ? province.name : FB.T('unknown place'));
    if (!def) {
      return { name:FB.T('Unknown enterprise'), icon:'?', place:place };
    }
    return {
      name:dt(s, 'enterprise', row.type, def, 'name'),
      icon:def.icon,
      place:place
    };
  }

  function enterpriseStaffingStatus(row) {
    const labels = {
      locked:'🔒 ' + FB.T('Locked'),
      unchanged:FB.T('Unchanged'),
      assigned:FB.T('Assigned'),
      moved:FB.T('Moved'),
      replaced:FB.T('Replaced'),
      unresolved:FB.T('Unresolved')
    };
    return labels[row.status] || labels.unchanged;
  }

  function enterpriseStaffingReason(row) {
    if (row.unresolvedReason === 'no_eligible_worker') {
      return FB.T(
        'No household worker meets this enterprise’s career and guild requirements.');
    }
    if (row.unresolvedReason === 'eligible_workers_locked') {
      return FB.T('Every eligible worker is locked to another enterprise.');
    }
    if (row.unresolvedReason === 'allocated_higher_yield') {
      return FB.T(
        'Eligible workers produce more total yield in the assignments shown elsewhere.');
    }
    return '';
  }

  function enterpriseStaffingChange(s, row, rowByUid) {
    const current = row.currentWorkerId && s.chars[row.currentWorkerId];
    const proposed = row.proposedWorkerId && s.chars[row.proposedWorkerId];
    if (row.status === 'locked') {
      return FB.T('Locked assignment; the assistant will not move this worker.');
    }
    if (row.status === 'unchanged') return FB.T('Kept in place.');
    if (row.status === 'assigned') {
      return FB.T('{name} is assigned from ordinary household work.', {
        name:proposed ? proposed.name : FB.T('This worker')
      });
    }
    if (row.status === 'moved') {
      const source = rowByUid[row.proposedFromUid];
      const label = source ? enterpriseStaffingLabel(s, source).name :
        FB.T('another enterprise');
      return FB.T('{name} moves here from {enterprise}.', {
        name:proposed ? proposed.name : FB.T('This worker'),
        enterprise:label
      });
    }
    if (row.status === 'replaced') {
      if (row.proposedFromUid) {
        const source = rowByUid[row.proposedFromUid];
        const label = source ? enterpriseStaffingLabel(s, source).name :
          FB.T('another enterprise');
        return FB.T('{incoming} moves here from {enterprise}, replacing {outgoing}.', {
          incoming:proposed ? proposed.name : FB.T('The new worker'),
          enterprise:label,
          outgoing:current ? current.name : FB.T('the current worker')
        });
      }
      return FB.T('{incoming} replaces {outgoing}.', {
        incoming:proposed ? proposed.name : FB.T('The new worker'),
        outgoing:current ? current.name : FB.T('the current worker')
      });
    }
    if (current) {
      return FB.T('{name} moves to another assignment, leaving this enterprise unresolved.', {
        name:current.name
      });
    }
    return enterpriseStaffingReason(row);
  }

  UI.showEnterpriseStaffingPreview = function (returnContext, notice) {
    const s = FB.state;
    const plan = FB.enterpriseStaffingPlan(s);
    const rowByUid = {};
    for (const row of plan.rows) rowByUid[row.uid] = row;
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Review the complete result before applying it. Locked pairings stay fixed; every other enterprise and eligible household worker may be rebalanced. Applying it spends no day or money.')) +
      '</p></div>' +
      (notice ? '<div class="hint enterprise-staffing-notice">' +
        esc(notice) + '</div>' : '') +
      '<div class="enterprise-staffing-totals">' +
      '<div><span>' + esc(FB.T('Current total')) + '</span><b>' +
      esc(FB.T('{money:amount} each season', { amount:plan.currentTotal })) +
      '</b></div><div class="enterprise-staffing-arrow" aria-hidden="true">→</div>' +
      '<div><span>' + esc(FB.T('Proposed total')) + '</span><b>' +
      esc(FB.T('{money:amount} each season', { amount:plan.proposedTotal })) +
      '</b></div></div>';
    if (!plan.changed) {
      h += '<div class="hint">' + esc(FB.T(
        'The current assignments already produce the best available total yield.')) +
        '</div>';
    }
    h += '<div class="enterprise-staffing-rows">';
    for (const row of plan.rows) {
      const label = enterpriseStaffingLabel(s, row);
      const current = row.currentWorkerId && s.chars[row.currentWorkerId];
      const proposed = row.proposedWorkerId && s.chars[row.proposedWorkerId];
      const reason = row.status === 'unresolved'
        ? enterpriseStaffingReason(row) : '';
      const change = enterpriseStaffingChange(s, row, rowByUid);
      h += '<div class="enterprise-staffing-row ' +
        (row.status === 'unresolved' ? 'unresolved' :
          (row.status === 'locked' ? 'locked' : '')) + '">' +
        '<div class="enterprise-staffing-head"><span class="enterprise-staffing-name">' +
        esc(label.icon + ' ' + label.name) + '</span><span class="enterprise-staffing-status">' +
        esc(enterpriseStaffingStatus(row)) + '</span></div>' +
        '<div class="enterprise-staffing-place">' + esc(label.place) + '</div>' +
        '<div class="enterprise-staffing-comparison"><div><span>' +
        esc(FB.T('Current')) + '</span><b>' +
        esc(current ? current.name : FB.T('Idle')) + '</b><small>' +
        esc(FB.T('{money:amount} each season', { amount:row.currentYield })) +
        '</small></div><div><span>' + esc(FB.T('Proposed')) + '</span><b>' +
        esc(proposed ? proposed.name : FB.T('Unresolved')) + '</b><small>' +
        esc(FB.T('{money:amount} each season', { amount:row.proposedYield })) +
        '</small></div></div>' +
        '<div class="enterprise-staffing-change">' +
        esc(change) + '</div>' +
        (reason && reason !== change
          ? '<div class="enterprise-staffing-reason">' + esc(reason) + '</div>'
          : '') +
        '</div>';
    }
    h += '</div><div class="gm-footer">' +
      '<button type="button" class="btn" id="enterprise-staffing-apply"' +
      (!plan.changed ? ' disabled' : '') + '>' +
      esc(FB.T('Apply staffing plan')) + '</button>' +
      '<button type="button" class="btn" id="enterprise-staffing-back">' +
      esc(FB.T('Back')) + '</button></div>';
    const options = householdPlanHistoryOptions(returnContext) || {};
    options.modalClass = 'enterprise-staffing-modal';
    openModal(FB.T('⚙ Enterprise staffing preview'), h, options);
    $('enterprise-staffing-apply').addEventListener('click', function () {
      const result = FB.applyEnterpriseStaffingPlan(s, plan);
      if (!result.ok) {
        UI.showEnterpriseStaffingPreview(returnContext, result.reason === 'stale'
          ? FB.T('Household staffing changed after this review. A fresh plan is shown; review it before applying.')
          : FB.T('There are no staffing changes to apply.'));
        return;
      }
      UI.refresh();
      finishHouseholdPlanReturn(returnContext, UI.showLivelihoods);
    });
    $('enterprise-staffing-back').addEventListener('click', function () {
      finishHouseholdPlanReturn(returnContext, UI.showLivelihoods);
    });
  };

  /* ================= national technology ================= */
  const techCatalogueView = { domain:'all', status:'all', query:'' };

  function techDomainName(id) {
    const names = {
      agriculture:FB.T('Agriculture and animal power'),
      crafts:FB.T('Crafts, materials, and industry'),
      commerce:FB.T('Commerce, transport, and infrastructure'),
      learning:FB.T('Learning, medicine, and natural knowledge'),
      governance:FB.T('Governance, law, and institutions'),
      warfare:FB.T('Warfare and fortification'),
      seafaring:FB.T('Seafaring and navigation')
    };
    return names[id] || id;
  }

  function techAutomationMode(mode) {
    return FB.techAutomationMode ? FB.techAutomationMode(mode) :
      (mode && FBDATA.techDomains[mode] ? mode : 'cheapest');
  }

  function techAutomationModeName(mode) {
    mode = techAutomationMode(mode);
    return mode === 'cheapest'
      ? FB.T('Cheapest available first')
      : FB.T('{domain} first', { domain:techDomainName(mode) });
  }

  function techAutomationOptions(selected) {
    selected = techAutomationMode(selected);
    let h = '<option value="cheapest"' +
      (selected === 'cheapest' ? ' selected' : '') + '>' +
      esc(FB.T('Cheapest available first')) + '</option>';
    for (const domain in (FBDATA.techDomains || {})) {
      if (!Object.prototype.hasOwnProperty.call(FBDATA.techDomains, domain)) continue;
      h += '<option value="' + esc(domain) + '"' +
        (selected === domain ? ' selected' : '') + '>' +
        esc(FB.T('{domain} first', { domain:techDomainName(domain) })) + '</option>';
    }
    return h;
  }

  function techTraditionName(id) {
    const names = {
      latin:FB.T('Latin West'),
      byzantine:FB.T('Byzantine'),
      islamic:FB.T('Islamic Mediterranean'),
      persianate:FB.T('Persianate'),
      slavic:FB.T('Slavic'),
      nordic:FB.T('Nordic'),
      steppe:FB.T('Steppe'),
      baltic_finnic:FB.T('Baltic-Finnic'),
      caucasian:FB.T('Caucasian'),
      northeast_african:FB.T('Northeast African')
    };
    return names[id] || id;
  }

  function techYear(year) {
    return year < 0
      ? FB.T('{year} BC', { year:Math.abs(year) })
      : FB.T('{year} AD', { year:year });
  }

  function techItemStatus(item) {
    if (item.completed) return 'completed';
    if (item.active) return 'active';
    if (item.exposed) return item.available ? 'exposed available' : 'exposed';
    if (item.available) return 'available';
    return 'locked';
  }

  function techStatusText(item) {
    if (item.completed) return FB.T('Completed');
    if (item.active) return FB.T('Active');
    if (item.reqLocked || item.cultureLocked) {
      return item.exposed ? FB.T('Exposed · prerequisites needed') : FB.T('Prerequisites needed');
    }
    if (item.exposed) return FB.T('Exposed · 35% cost discount');
    return FB.T('Available');
  }

  function techScalarEffects(def) {
    const fx = def.fx || {}, out = [];
    const percentKeys = {
      tax:FB.T('tax income'), levy:FB.T('levy size'), battle:FB.T('battle odds'),
      health:FB.T('yearly health'), siege:FB.T('siege progress'),
      movement:FB.T('army movement speed'), education:FB.T('education success chance'),
      finance:FB.T('credit capacity'), trade:FB.T('merchant and craft income')
    };
    for (const key in percentKeys) {
      if (!fx[key]) continue;
      out.push(FB.T('{sign}{percent}% {effect}', {
        sign:fx[key] > 0 ? '+' : '−',
        percent:Math.round(Math.abs(fx[key]) * 1000) / 10,
        effect:percentKeys[key]
      }));
    }
    if (fx.devCap) out.push(FB.T('+{amount} development ceiling', { amount:fx.devCap }));
    if (fx.research) out.push(FB.T('+{amount} research each season', {
      amount:researchNumber(fx.research)
    }));
    if (fx.domain) out.push(FB.T('+{amount} domain capacity', { amount:fx.domain }));
    if (fx.costs) for (const category in fx.costs) {
      if (!fx.costs[category]) continue;
      const categoryNames = {
        build:FB.T('building'),
        enterprise:FB.T('enterprise'),
        training:FB.T('training')
      };
      out.push(fx.costs[category] < 0
        ? FB.T('{percent}% lower {category} cost', {
          percent:Math.round(Math.abs(fx.costs[category]) * 100),
          category:categoryNames[category] || category
        })
        : FB.T('{percent}% higher {category} cost', {
        percent:Math.round(Math.abs(fx.costs[category]) * 100),
        category:categoryNames[category] || category
      }));
    }
    if (fx.units) for (const unit in fx.units) {
      if (!fx.units[unit]) continue;
      const unitName = unit === 'arch' ? FB.T('archers') :
        unit === 'cav' ? FB.T('cavalry') :
        unit === 'ret' ? FB.T('men-at-arms') : FB.T('levy');
      out.push(FB.T('+{men} {unit}', { men:fx.units[unit], unit:unitName }));
    }
    return out;
  }

  function techUnlockText(s, kind, target) {
    const table = kind === 'building' ? FBDATA.buildings :
      kind === 'career' ? FBDATA.careers :
      kind === 'enterprise' ? FBDATA.enterprises :
      kind === 'schooling' ? FBDATA.schooling :
      kind === 'householdStandard' ? FBDATA.householdStandards : null;
    const dataKind = kind === 'building' ? 'building' :
      kind === 'career' ? 'career' :
      kind === 'enterprise' ? 'enterprise' :
      kind === 'schooling' ? 'schooling' : 'householdStandard';
    if (table && table[target]) {
      const content = dt(s, dataKind, target, table[target], 'name');
      if (kind === 'building') {
        return FB.T('Allows construction of {content}.', { content:content });
      }
      if (kind === 'career') {
        return FB.T('Makes training and work in {content} available.', { content:content });
      }
      if (kind === 'enterprise') {
        return FB.T('Allows households to establish {content}.', { content:content });
      }
      if (kind === 'schooling') {
        return FB.T('Makes {content} available for children.', { content:content });
      }
      return FB.T('Makes the {content} household standard available.', { content:content });
    }
    if (kind === 'research_slot') {
      return FB.T('Adds national research slot {slot}.', { slot:target });
    }
    return '';
  }

  function techRequiresId(requirement, id) {
    if (Array.isArray(requirement)) return requirement.indexOf(id) >= 0;
    return requirement === id;
  }

  function techGameplayUnlocks(s, id, def) {
    const out = [], seen = {};
    function add(key, text) {
      if (!text || seen[key]) return;
      seen[key] = true;
      out.push(text);
    }
    function addContent(kind, target) {
      add(kind + ':' + target, techUnlockText(s, kind, target));
    }

    for (const unlock of (def.unlocks || [])) {
      const split = typeof unlock === 'string' ? unlock.indexOf(':') : -1;
      if (split < 1) continue;
      addContent(unlock.slice(0, split), unlock.slice(split + 1));
    }

    const tables = [
      { kind:'building', data:FBDATA.buildings },
      { kind:'career', data:FBDATA.careers },
      { kind:'enterprise', data:FBDATA.enterprises },
      { kind:'schooling', data:FBDATA.schooling }
    ];
    for (const entry of tables) {
      for (const target in (entry.data || {})) {
        if (!Object.prototype.hasOwnProperty.call(entry.data, target) ||
            !entry.data[target]) continue;
        if (techRequiresId(entry.data[target].requiresTech, id)) {
          addContent(entry.kind, target);
        }
      }
    }

    for (const standardId in (FBDATA.householdStandards || {})) {
      if (!Object.prototype.hasOwnProperty.call(FBDATA.householdStandards, standardId)) continue;
      const standard = FBDATA.householdStandards[standardId];
      if (!standard) continue;
      if (techRequiresId(standard.requiresTech, id)) {
        addContent('householdStandard', standardId);
      }
      for (let level = 0; level < (standard.levels || []).length; level++) {
        if (!techRequiresId(standard.levels[level].requiresTech, id)) continue;
        add('householdStandard:' + standardId + ':level:' + level,
          FB.T('Makes {standard}: {level} available.', {
            standard:dt(s, 'householdStandard', standardId, standard, 'name'),
            level:dt(s, 'householdStandard', standardId, standard,
              'levels.' + level + '.name')
          }));
      }
    }

    for (const financeId in (FBDATA.finance || {})) {
      if (!Object.prototype.hasOwnProperty.call(FBDATA.finance, financeId) ||
          !FBDATA.finance[financeId]) continue;
      if (!techRequiresId(FBDATA.finance[financeId].requiresTech, id)) continue;
      const financeName = financeId === 'tradePartnership'
        ? FB.tradePartnershipName(s) : financeKindName(financeId);
      add('finance:' + financeId,
        FB.T('Makes {content} available.', { content:financeName }));
    }
    return out;
  }

  function techPrerequisiteButtons(s, def) {
    let h = '';
    const req = Array.isArray(def.req) ? def.req : [];
    const reqAny = Array.isArray(def.reqAny) ? def.reqAny : [];
    function chip(id) {
      const target = FBDATA.tech[id];
      return '<button class="tech-chip' + (FB.hasTech(s, id) ? ' complete' : '') +
        '" data-tech-jump="' + esc(id) + '">' +
        esc(target ? target.icon + ' ' + dt(s, 'tech', id, target, 'name') : id) +
        '</button>';
    }
    if (req.length) {
      h += '<div class="tech-prereq-line"><span>' + esc(FB.T('Requires all')) +
        '</span><div class="tech-chips">' + req.map(chip).join('') + '</div></div>';
    }
    if (reqAny.length) {
      h += '<div class="tech-prereq-line"><span>' + esc(FB.T('Requires any one')) +
        '</span><div class="tech-chips">' + reqAny.map(chip).join('') + '</div></div>';
    }
    return h || '<div class="hint">' + esc(FB.T('No prerequisites.')) + '</div>';
  }

  UI.showTech = function () {
    const s = FB.state;
    const rid = FB.techRealmId(s);
    const realm = s.realms[rid];
    const record = FB.realmTechRecord(s, rid);
    const traditions = FB.techTraditionsForRealm(s, rid).map(techTraditionName);
    const projects = FB.techCandidates(s, rid);
    const canControlResearch = rid === 'player' && FB.isPlayerSovereign(s);
    const researchAuto = FB.game.auto || {};
    let h = '<div class="tech-summary">' +
      kv('Sovereign nation', esc(realm ? realm.name : rid)) +
      kv('Traditions', esc(traditions.join(' · '))) +
      kv('Research each season', esc(researchNumber(FB.techResearchRate(s, rid)))) +
      kv('Reserve', esc(researchNumber(record.reserve))) +
      kv('Research slots', esc(FB.T('{used}/{slots} occupied', {
        used:record.active.length, slots:FB.techSlotCount(s, rid)
      }))) + '</div>';
    if (canControlResearch) {
      const autoLabel = researchAuto.research
        ? techAutomationModeName(researchAuto.researchMode) : FB.T('Off');
      h += '<div class="tech-auto-bar"><button class="btn" id="tech-auto">' +
        esc(FB.T('Automatic research: {mode}', { mode:autoLabel })) +
        '</button></div>';
    }
    if (record.active.length) {
      h += '<div class="tech-active-strip">';
      for (const activeId of record.active) {
        const activeDef = FBDATA.tech[activeId];
        if (!activeDef) continue;
        h += '<button class="tech-active-project" data-tech-open="' + esc(activeId) + '">' +
          esc(activeDef.icon + ' ' + dt(s, 'tech', activeId, activeDef, 'name')) +
          '<span>' + esc(FB.T('{progress}/{cost} research', {
            progress:researchNumber(record.progress[activeId] || 0),
            cost:FB.techCost(s, activeId, rid)
          })) + '</span></button>';
      }
      h += '</div>';
    }
    h += '<div class="tech-controls">' +
      '<label><span>' + esc(FB.T('Search')) + '</span><input id="tech-search" type="search" value="' +
        esc(techCatalogueView.query) + '" placeholder="' + esc(FB.T('Name or description')) + '"></label>' +
      '<label><span>' + esc(FB.T('Domain')) + '</span><select id="tech-domain">' +
        '<option value="all">' + esc(FB.T('All domains')) + '</option>';
    for (const domain in FBDATA.techDomains) {
      h += '<option value="' + esc(domain) + '"' +
        (techCatalogueView.domain === domain ? ' selected' : '') + '>' +
        esc(techDomainName(domain)) + '</option>';
    }
    h += '</select></label><label><span>' + esc(FB.T('Status')) +
      '</span><select id="tech-status">' +
      '<option value="all">' + esc(FB.T('All')) + '</option>' +
      '<option value="active">' + esc(FB.T('Active')) + '</option>' +
      '<option value="available">' + esc(FB.T('Available')) + '</option>' +
      '<option value="exposed">' + esc(FB.T('Exposed')) + '</option>' +
      '<option value="completed">' + esc(FB.T('Completed')) + '</option>' +
      '</select></label></div><div id="tech-catalogue">';
    let lastDomain = null;
    for (const item of projects) {
      if (item.domain !== lastDomain) {
        if (lastDomain !== null) h += '</section>';
        lastDomain = item.domain;
        h += '<section class="tech-domain-group" data-tech-domain-group="' +
          esc(item.domain) + '"><h4>' + esc(techDomainName(item.domain)) + '</h4>';
      }
      const name = dt(s, 'tech', item.id, item.def, 'name');
      const desc = dt(s, 'tech', item.id, item.def, 'desc');
      const search = (name + ' ' + desc + ' ' + techDomainName(item.domain)).toLowerCase();
      h += '<button class="tech-entry tech-' +
        esc(techItemStatus(item).replace(/ /g, ' tech-')) +
        '" data-tech-open="' + esc(item.id) + '" data-domain="' + esc(item.domain) +
        '" data-status="' + esc(techItemStatus(item)) + '" data-search="' + esc(search) + '">' +
        '<span class="tech-entry-icon">' + esc(item.def.icon) + '</span>' +
        '<span class="tech-entry-copy"><b>' + esc(name) + '</b><small>' +
        esc(techStatusText(item)) +
        '</small></span><span class="tech-entry-cost">' +
        (item.completed ? '✓' : item.active ? '◉' : esc(researchNumber(item.cost))) +
        '</span></button>';
    }
    if (lastDomain !== null) h += '</section>';
    h += '</div><div class="tech-empty hidden" id="tech-empty">' +
      esc(FB.T('No technologies match these filters.')) +
      '</div><div class="gm-footer"><button class="btn" id="gm-cancel">' +
      esc(FB.T('Close')) + '</button></div>';
    openModal(FB.T('Technology'), h, { modalClass:'fullsheet-modal technology-modal' });
    $('tech-status').value = techCatalogueView.status;

    function applyFilters() {
      techCatalogueView.domain = $('tech-domain').value;
      techCatalogueView.status = $('tech-status').value;
      techCatalogueView.query = $('tech-search').value.trim();
      const query = techCatalogueView.query.toLowerCase();
      let visible = 0;
      document.querySelectorAll('.tech-entry').forEach(function (entry) {
        const domainMatch = techCatalogueView.domain === 'all' ||
          entry.dataset.domain === techCatalogueView.domain;
        const statusMatch = techCatalogueView.status === 'all' ||
          entry.dataset.status.split(' ').indexOf(techCatalogueView.status) >= 0;
        const queryMatch = !query || entry.dataset.search.indexOf(query) >= 0;
        entry.classList.toggle('hidden', !(domainMatch && statusMatch && queryMatch));
        if (domainMatch && statusMatch && queryMatch) visible++;
      });
      document.querySelectorAll('.tech-domain-group').forEach(function (section) {
        section.classList.toggle('hidden', !section.querySelector('.tech-entry:not(.hidden)'));
      });
      $('tech-empty').classList.toggle('hidden', visible > 0);
    }
    $('tech-search').addEventListener('input', applyFilters);
    $('tech-domain').addEventListener('change', applyFilters);
    $('tech-status').addEventListener('change', applyFilters);
    document.querySelectorAll('[data-tech-open]').forEach(function (button) {
      button.addEventListener('click', function () {
        UI.showTechDetail(button.dataset.techOpen);
      });
    });
    const autoButton = $('tech-auto');
    if (autoButton) autoButton.addEventListener('click', UI.showTechAutomation);
    $('gm-cancel').addEventListener('click', UI.closeModal);
    applyFilters();
  };

  UI.showTechAutomation = function () {
    const s = FB.state;
    if (!s || !FB.isPlayerSovereign(s)) return UI.showTech();
    const auto = FB.game.auto;
    const current = auto.research ? techAutomationMode(auto.researchMode) : 'off';
    function choice(mode, label, desc) {
      return '<button class="actionbtn" data-tech-auto-mode="' + esc(mode) + '">' +
        (current === mode ? '&#9673; ' : '&#9675; ') + esc(label) +
        '<span class="adesc">' + esc(desc) + '</span></button>';
    }
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Automatic research fills every open national slot now and whenever a project completes. Existing projects are never cancelled.')) +
      '</p></div><div class="gm-list">';
    h += choice('off', FB.T('Manual research'),
      FB.T('Keep current projects, but leave future slots for you to choose.'));
    h += choice('cheapest', FB.T('Cheapest available first'),
      FB.T('Fill slots with the eligible technologies that currently cost the least research.'));
    for (const domain in (FBDATA.techDomains || {})) {
      if (!Object.prototype.hasOwnProperty.call(FBDATA.techDomains, domain)) continue;
      h += choice(domain,
        FB.T('{domain} first', { domain:techDomainName(domain) }),
        FB.T('Choose eligible {domain} technologies first, then fill remaining slots with the cheapest eligible technologies from other domains.', {
          domain:techDomainName(domain)
        }));
    }
    h += '</div><div class="gm-footer"><button class="btn" id="tech-auto-back">' +
      esc(FB.T('Back')) + '</button></div>';
    openModal(FB.T('Automatic research'), h,
      { modalClass:'fullsheet-modal technology-modal' });
    document.querySelectorAll('[data-tech-auto-mode]').forEach(function (button) {
      button.addEventListener('click', function () {
        const mode = button.dataset.techAutoMode;
        auto.research = mode !== 'off';
        if (auto.research) {
          auto.researchMode = techAutomationMode(mode);
          FB.autoResearch(s, auto.researchMode);
        }
        FB.game.saveAuto();
        UI.refresh();
        UI.showTech();
      });
    });
    $('tech-auto-back').addEventListener('click', UI.showTech);
  };

  UI.showTechDetail = function (id) {
    const s = FB.state, def = FBDATA.tech[id];
    if (!def) return UI.showTech();
    const rid = FB.techRealmId(s);
    const realm = s.realms[rid];
    const record = FB.realmTechRecord(s, rid);
    const item = FB.techCandidate(s, id, rid);
    if (!item) return UI.showTech();
    const cost = item.breakdown || FB.techCostBreakdown(s, id, rid);
    const tradition = techTraditionName(cost.tradition);
    const exposureDiscount = Math.round((1 - cost.exposureMultiplier) * 100);
    const estimatedSeasons = techEstimatedSeasons(s, rid, record, item, cost);
    const researchCostText = estimatedSeasons
      ? techCostEstimateText(s, cost.total, estimatedSeasons)
      : FB.T('{amount} research', { amount:researchNumber(cost.total) });
    const effects = techScalarEffects(def);
    const unlocks = techGameplayUnlocks(s, id, def);
    const gameplayEffects = effects.concat(unlocks).join(' · ');
    let h = '<div class="tech-detail-meta">' +
      esc(techDomainName(def.domain)) + ' · ' + esc(techStatusText(item)) +
      '</div><div class="gm-body-text"><p>' +
      esc(dt(s, 'tech', id, def, 'desc')) + '</p>' +
      assetEffectSummary({
        owner:realm ? realm.name : rid,
        scope:FB.T('Sovereign nation and every realm using its knowledge'),
        setupCost:researchCostText,
        recurringCost:item.completed
          ? FB.T('None')
          : FB.T('Occupies one national research slot while active'),
        effect:gameplayEffects,
        transferRule:FB.T('Follows sovereign allegiance, not dynasty or county ownership'),
        expiry:FB.T('Permanent national knowledge once completed')
      }) + '</div>' +
      kv('First attested', esc(FB.T('{from}–{to}', {
        from:techYear(cost.attested[0]), to:techYear(cost.attested[1])
      }))) +
      kv('Regional adoption', esc(FB.T('{tradition}: {from}–{to}', {
        tradition:tradition, from:techYear(cost.emergence), to:techYear(cost.widespread)
      }))) +
      kv('Exposure', esc(FB.T('{percent}% discount', {
        percent:exposureDiscount
      }))) +
      (record.progress[id] ? kv('Progress', esc(FB.T('{progress}/{cost}', {
        progress:researchNumber(record.progress[id]), cost:researchNumber(cost.total)
      }))) : '') +
      '<div class="panelh">' + esc(FB.T('Prerequisites')) + '</div>' +
      techPrerequisiteButtons(s, def);
    h += '<div class="gm-footer">';
    const canChoose = rid === 'player' && FB.isPlayerSovereign(s);
    if (canChoose && item.available &&
        record.active.length < FB.techSlotCount(s, rid)) {
      h += '<button class="btn primary" id="tech-start">' +
        esc(FB.T('Begin research')) + '</button>';
    }
    if (FB.canAdvocateTech(s, id)) {
      h += '<button class="btn primary" id="tech-advocate">' +
        esc(FB.T('Advocate · {money:20} · Standing −15')) + '</button>';
    }
    h += '<button class="btn" id="tech-back">' + esc(FB.T('Back')) +
      '</button></div>';
    openModal(def.icon + ' ' + dt(s, 'tech', id, def, 'name'), h,
      { modalClass:'fullsheet-modal technology-modal' });
    document.querySelectorAll('[data-tech-jump]').forEach(function (button) {
      button.addEventListener('click', function () {
        UI.showTechDetail(button.dataset.techJump);
      });
    });
    const start = $('tech-start');
    if (start) start.addEventListener('click', function () {
      if (FB.selectTechProject(s, id)) {
        if (FB.game.auto && FB.game.auto.research) {
          FB.autoResearch(s, FB.game.auto.researchMode);
        }
        UI.refresh();
        UI.showTech();
      }
    });
    const advocate = $('tech-advocate');
    if (advocate) advocate.addEventListener('click', function () {
      if (FB.advocateTech(s, id)) {
        UI.refresh();
        UI.showTechDetail(id);
      }
    });
    $('tech-back').addEventListener('click', UI.showTech);
  };

  /* ================= character sheet & trait dialogs ================= */
  UI.showFriendConfirm = function (cid) {
    const s = FB.state;
    const c = s && s.chars[cid];
    if (!c || !FB.canNameFriend(s, c)) return;
    const former = FB.getRole(s, 'friend', false);
    const prompt = former && former.id !== c.id
      ? FB.T('Name {name} as your friend instead of {former}? Any sworn brotherhood with the former friend will end.', {
        name:c.name, former:former.name
      })
      : FB.T('Name {name} as your friend? Events and oaths that call on your friend will now use this exact person.', {
        name:c.name
      });
    const h = '<p>' + esc(prompt) + '</p><button class="btn primary" id="friend-confirm">' +
      esc(FB.T('Call {name} friend', { name:c.name })) +
      '</button> <button class="btn" id="gm-cancel">' + esc(FB.T('Not now')) + '</button>';
    openModal(FB.T('Name a Friend'), h);
    $('friend-confirm').addEventListener('click', function () {
      if (!FB.nameFriend(s, c)) return;
      UI.closeModal();
      FB.game.passDay({ skipFocus:true });
    });
    $('gm-cancel').addEventListener('click', function () { UI.showCharModal(cid); });
  };

  UI.showCharModal = function (cid) {
    const s = FB.state;
    if (!s) return;
    const c = s.chars[cid];
    if (!c) return;
    const me = s.chars[s.player.charId];
    const reigningRealmId = FB.realmIdForRulerCharacter &&
      FB.realmIdForRulerCharacter(s, c);
    if (reigningRealmId && FB.syncRealmRulerStanding) {
      FB.syncRealmRulerStanding(s, reigningRealmId);
    }
    const descendantKind = FB.playerDescendantKind(s, c.id);
    const isHousehold = !c.dead && FB.isHouseholdCharacter &&
      FB.isHouseholdCharacter(s, c.id);
    const retainer = !c.dead && FB.retainerRecord ? FB.retainerRecord(s, c.id) : null;
    let h = UI.charCardHtml(s, c, false, true);
    if (!c.dead && c.id !== me.id) {
      h += '<div class="progressnote">' +
        esc(characterStandingContext(s, c)) + '</div>';
    }
    const attentionTarget = FB.socialAttentionTarget(s);
    if (!c.dead && attentionTarget && attentionTarget.id === c.id) {
      h += '<div class="progressnote">' + esc(socialAttentionSummary(s)) + '</div>';
    }
    // the dead get a sheet for remembrance — their dates, skills, traits — but no dealings
    if (c.dead) {
      h += '<button class="btn" id="cm-close" style="margin-top:10px">Close</button>';
      openModal(FB.fullName(c), h);
      FB.paintFaces($('gm-body'), s);
      $('cm-close').addEventListener('click', UI.closeModal);
      return;
    }
    h += '<div class="gm-list" style="margin-top:10px">';
    const isFamily = FB.spousesOf(s, me).some(function (sp) { return sp.id === c.id; }) ||
      !!descendantKind ||
      (c.role === 'sibling' && c.dyn === me.dyn);
    if (isHousehold) {
      h += '<button class="actionbtn" id="cm-equipment">' +
        esc(FB.T('Equip items…')) + '<span class="adesc">' +
        esc(FB.T('Open the full figure and choose equipment from the family armory.')) +
        '</span></button>';
    }
    if (isHousehold && FB.ageOf(c, s.date.year) >= 10) {
      h += livelihoodNote(s, c);
      h += '<button class="actionbtn" id="cm-career">🧰 Choose work or training…' +
        '<span class="adesc">Arrange an apprenticeship, change occupation, or seek guild rank.</span></button>';
    }
    if (c.id !== me.id) {
      const cultivated = !!(attentionTarget && attentionTarget.id === c.id);
      const attentionPresence = FB.socialAttentionPresence(s, c);
      const together = attentionPresence.status === 'active';
      const visitPreview = !together && FB.socialVisitPreview
        ? FB.socialVisitPreview(s, c) : null;
      const courtAttentionBlocked = !!(s.player.courtingId &&
        s.player.courtingId !== c.id);
      const courtAttentionHeld = s.player.courtingId === c.id && cultivated;
      const attentionRate = FB.socialAttentionDailyOpinion();
      if (cultivated) {
        h += '<button class="actionbtn" id="cm-attention-stop"' +
          (courtAttentionHeld ? ' disabled' : '') + '>' +
          esc(FB.T('🤝 Stop cultivating')) +
          '<span class="adesc">' + esc(courtAttentionHeld
            ? FB.T('End the courtship to release this personal-attention assignment.')
            : FB.T('Withdraw personal attention. This costs no day.')) +
          '</span></button>';
        if (!together) {
          const visitReady = visitPreview && visitPreview.eligible &&
            visitPreview.cost <= s.player.gold;
          h += '<button class="actionbtn" id="cm-attention-visit"' +
            (visitReady ? '' : ' disabled') + '>' +
            esc(FB.T('🧭 Travel to continue cultivating…')) +
            '<span class="adesc">' + esc(visitReady
              ? FB.T('Visit {name} in {province}; Standing resumes changing after {days} travel days.', {
                name:c.name,
                province:FB.world.byId[visitPreview.destinationId].name,
                days:visitPreview.days
              })
              : (visitPreview && visitPreview.eligible
                ? FB.T('Requires {money:cost}; you have {money:gold}.', {
                  cost:visitPreview.cost,
                  gold:Math.floor(s.player.gold)
                })
                : (visitPreview ? visitPreview.reason :
                  FB.T('A targeted visit is unavailable.')))) +
            '</span></button>';
        }
      } else if (together) {
        h += '<button class="actionbtn" id="cm-attention"' +
          (courtAttentionBlocked ? ' disabled' : '') + '>' +
          esc(FB.T('🤝 Cultivate relationship')) +
          '<span class="adesc">' + esc(courtAttentionBlocked
            ? FB.T('End your current courtship before cultivating someone else.')
            : FB.T('Assign personal attention for +{rate} Standing each ordinary day. This costs no day.', {
              rate:attentionRate
            })) + '</span></button>';
      } else {
        const visitReady = !courtAttentionBlocked && visitPreview &&
          visitPreview.eligible && visitPreview.cost <= s.player.gold;
        h += '<button class="actionbtn" id="cm-attention-visit"' +
          (visitReady ? '' : ' disabled') + '>' +
          esc(FB.T('🧭 Travel to cultivate…')) +
          '<span class="adesc">' + esc(courtAttentionBlocked
            ? FB.T('End your current courtship before cultivating someone else.')
            : (visitPreview && visitPreview.eligible
              ? (visitPreview.cost <= s.player.gold
                ? FB.T('Visit {name} in {province}; the assignment begins at departure and Standing advances after arrival.', {
                  name:c.name,
                  province:FB.world.byId[visitPreview.destinationId].name
                })
                : FB.T('Requires {money:cost}; you have {money:gold}.', {
                  cost:visitPreview.cost,
                  gold:Math.floor(s.player.gold)
                }))
              : (visitPreview ? visitPreview.reason :
                FB.T('A targeted visit is unavailable.')))) +
          '</span></button>';
      }
      if (FB.friendContactEligible && FB.friendContactEligible(s, c) &&
        s.roles.friend !== c.id) {
        const canNameFriend = FB.canNameFriend && FB.canNameFriend(s, c);
        const currentFriend = FB.getRole(s, 'friend', false);
        const threshold = FB.relationshipOpinionThreshold();
        const knownContact = !!FB.friendContacts(s)[c.id];
        h += '<button class="actionbtn" id="cm-namefriend"' +
          (canNameFriend ? '' : ' disabled') + '>🤝 ' +
          esc(currentFriend
            ? FB.T('Name {name} as your friend…', { name:c.name })
            : FB.T('Call {name} your friend', { name:c.name })) +
          '<span class="adesc">' + esc(canNameFriend
            ? FB.T('Bind the canonical friendship used by events and oaths to this character. (spends the day)')
            : (knownContact
              ? FB.T('Requires +{threshold} Standing; currently {standing}.', {
                threshold:threshold,
                standing:standingValue(FB.standingOf(s, {
                  kind:'character', id:c.id
                }))
              })
              : FB.T('Cultivate this relationship, then reach +{threshold} Standing.', {
                threshold:threshold
              }))) +
          '</span></button>';
      }
      const giftDays = reigningRealmId
        ? FB.rulerGiftDaysRemaining(s, reigningRealmId)
        : FB.socialGiftDaysRemaining(s, c.id);
      const deliveryText = giftDeliveryText(s,
        reigningRealmId ? 'ruler' : 'character',
        reigningRealmId || c.id);
      let giftDetail = deliveryText;
      if (!giftDetail && giftDays) {
        giftDetail = FB.T(
          'Cash and item gifts share a recipient cooldown. Ready in {days} days.', {
            days:giftDays
          });
      } else if (!giftDetail && reigningRealmId) {
        giftDetail = FB.T(
          'Uses this ruler’s rank price, realm standing, and ruler-generation cooldown.');
      } else if (!giftDetail && isHousehold) {
        giftDetail = FB.T(
          'Choose a cash gift. Household equipment remains in the shared family armory.');
      } else if (!giftDetail) {
        giftDetail = FB.T(
          'Choose cash or an unequipped, unpledged item from the family armory.');
      }
      h += '<button class="actionbtn" id="cm-gift">' +
        esc(FB.T('🎁 Offer a gift…')) +
        '<span class="adesc">' + esc(giftDetail) +
        '</span></button>';
      const isMySpouse = c.spouseId === me.id || c.id === me.spouseId;
      if (isMySpouse) {
        const doc = FB.marriageDoctrine(me.religion);
        if (doc.divorce) {
          const divCost = doc.divorce === 'sunder' ? 0 : (FBDATA.balance.dowryByStation[FB.stationOf(c)] || 0);
          if (doc.divorce === 'talaq') {
            h += '<button class="actionbtn" id="cm-divorce"' + (s.player.gold < divCost ? ' disabled' : '') +
              '>' + esc(FB.T('🕊 Pronounce the divorce ({money:gold})', { gold: divCost })) +
              '<span class="adesc">' + esc(FB.T(
                'Spoken before witnesses — and the mahr owed to {name} is paid out. (spends the day)',
                { name: c.name })) + '</span></button>';
          } else if (doc.divorce === 'get') {
            h += '<button class="actionbtn" id="cm-divorce"' + (s.player.gold < divCost ? ' disabled' : '') +
              '>' + esc(FB.T('📜 Grant a get ({money:gold})', { gold: divCost })) +
              '<span class="adesc">' + esc(FB.T(
                'A writ written and witnessed; the ketubah owed to {name} is paid out. (spends the day)',
                { name: c.name })) + '</span></button>';
          } else {
            h += '<button class="actionbtn" id="cm-divorce">💔 Declare the marriage sundered' +
              '<span class="adesc">Witnesses at the door, their goods on the cart. Folk will talk. (−5 prestige, spends the day)</span></button>';
          }
        } else {
          const cdAn = s.player.cooldowns.annul !== undefined && s.turn - s.player.cooldowns.annul < 360;
          const canAn = s.player.gold >= 15 && s.player.piety >= 20 && !cdAn;
          h += '<button class="actionbtn" id="cm-annul"' + (canAn ? '' : ' disabled') + '>' +
            esc(FB.T('⛪ Petition to annul the marriage ({money:15}, 20 piety)')) +
            '<span class="adesc">' + (cdAn ? 'The church will not hear the plea again so soon.' :
              'Some flaw in the vows, some closeness of blood — the church may be persuaded the marriage never was.') + '</span></button>';
        }
        h += '<button class="actionbtn" id="cm-nochildren">' +
          esc(FB.T(s.player.flags.noChildren ? '🌱 Try for children' : '🛑 No more children')) +
          '<span class="adesc">' + esc(FB.T(s.player.flags.noChildren
            ? 'Open your house to new life once more.'
            : 'Your house is full enough — no new conceptions. A child already on the way will still be born.')) +
          '</span></button>';
      }
      if (FB.canCourt(s, c)) {
        const switching = s.player.courtingId && s.player.courtingId !== c.id;
        const courtVisitReady = together || (visitPreview && visitPreview.eligible &&
          visitPreview.cost <= s.player.gold);
        h += '<button class="actionbtn" id="' +
          (together ? 'cm-court' : 'cm-court-visit') + '"' +
          (courtVisitReady ? '' : ' disabled') + '>' +
          esc(together
            ? FB.T(switching
              ? '🌷 Begin courtship (abandon your current suit)'
              : '🌷 Begin courtship')
            : (switching
              ? FB.T('🧭 Travel to begin courtship (abandon your current suit)…')
              : FB.T('🧭 Travel to begin courtship…'))) +
          '<span class="adesc">' + esc(together
            ? FB.T(
              'Pursue marriage with {name}: assign your personal attention, then propose at +{threshold} Standing.',
              { name:c.name, threshold:FB.relationshipOpinionThreshold() })
            : (visitPreview && visitPreview.eligible
              ? (visitPreview.cost <= s.player.gold
                ? FB.T(
                  'Travel to {province}; courtship and personal attention begin together when you depart.',
                  { province:FB.world.byId[visitPreview.destinationId].name })
                : FB.T('Requires {money:cost}; you have {money:gold}.', {
                  cost:visitPreview.cost,
                  gold:Math.floor(s.player.gold)
                }))
              : (visitPreview ? visitPreview.reason :
                FB.T('A targeted visit is unavailable.')))) + '</span></button>';
        if (FB.stationOf(c) - FB.playerStation(s) > 0) {
          h += '<div class="progressnote">' + esc(FB.T(
            '⚖ {name} stands above your station — the family will expect high Standing and renown before they bless such a match.',
            { name: c.name })) + '</div>';
        }
      } else if (s.player.courtingId === c.id) {
        const proposalThreshold = FB.relationshipOpinionThreshold();
        if (FB.canPropose(s)) {
          h += '<button class="actionbtn" id="cm-propose">💒 Propose marriage' +
            '<span class="adesc">Ask for their hand. Standing and wealth decide.</span></button>';
        } else {
          h += '<button class="actionbtn" id="cm-propose" disabled>💒 Propose marriage' +
            '<span class="adesc">' + esc(FB.T(
              'Locked until +{threshold} Standing; currently {standing}.', {
                threshold:proposalThreshold,
                standing:standingValue(FB.standingOf(s, {
                  kind:'character', id:c.id
                }))
              })) + '</span></button>';
          h += '<div class="progressnote">' + esc(FB.T(
            '🌷 You are courting {name}. A proposal requires +{threshold} Standing; personal attention works day by day.',
            { name:c.name, threshold:proposalThreshold })) + '</div>';
        }
        h += '<button class="actionbtn" id="cm-breakoff">💔 Break off the courtship' +
          '<span class="adesc">Part ways without a wedding.</span></button>';
      } else {
        const why = courtBlockReason(s, c);
        if (why) h += '<div class="progressnote">' +
          esc(FB.T('💒 No marriage possible: {reason}', { reason: why })) + '</div>';
      }
      if (!isFamily && !retainer) {
        if (s.roles.rival === c.id) {
          const heat = FB.rivalHeat(s);
          h += '<div class="progressnote">' + esc(FB.T(
            '⚡ Rivalry: {state} ({heat}/100). Standing shapes the chance of peace; heat shapes how far the feud may go.',
            { state: rivalryHeatName(heat), heat: heat })) + '</div>';
        } else if (s.player.rivalContacts && s.player.rivalContacts[c.id]) {
          h += '<div class="progressnote">' + esc(FB.T(
            '⚠ A hostile encounter is remembered. If Standing falls low enough, they may declare a feud of their own.')) +
            '</div>';
        }
        h += '<button class="actionbtn" id="cm-insult">😤 Insult them publicly' +
          '<span class="adesc">Salt for their pride, sport for the onlookers. (spends the day)</span></button>';
        h += '<button class="actionbtn" id="cm-undermine">🕸 Undermine them quietly' +
          '<span class="adesc">Rumors, debts, misplaced letters — intrigue decides. (spends the day)</span></button>';
        if (s.roles.rival === c.id) {
          h += '<button class="actionbtn" id="cm-settle">' + esc(FB.T('🕊 Seek a settlement…')) +
            '<span class="adesc">' + esc(FB.T(
              'Ask witnesses or a mediator to make a peace that binds you both. (spends the day)')) +
            '</span></button>';
        } else if (FB.standingOf(s, { kind:'character', id:c.id }) <= -40) {
          const rivalNow = FB.getRole(s, 'rival', false);
          if (!rivalNow || rivalNow.dead) {
            h += '<button class="actionbtn" id="cm-rival">⚡ Declare rival' +
              '<span class="adesc">' + esc(FB.T('Name {name} your enemy. (spends the day)',
                { name: c.name })) + '</span></button>';
          }
        }
      }
    }
    if (retainer) {
      h += '<button class="actionbtn" id="cm-retainer">🗝 ' +
        esc(FB.T('Manage household service…')) + '<span class="adesc">' +
        esc(FB.T('{position} · {money:pay} each season', {
          position:positionName(s, retainer.office), pay:retainer.pay || 0
        })) + '</span></button>';
    }
    const isManagedMinor = (descendantKind || c.id === me.id) && isHousehold &&
      FB.ageOf(c, s.date.year) < 16;
    if (isManagedMinor) {
      const self = c.id === me.id;
      h += upbringingNote(s, c);
      h += '<button class="actionbtn" id="cm-edufocus">' +
        esc(FB.T(self ? '🎓 Choose your education focus…' : '🎓 Choose their education focus…')) +
        '<span class="adesc">' +
        esc(FB.T(self
          ? 'Direct your formative years toward one art.'
          : 'Direct their formative years toward one art.')) + '</span></button>';
      h += '<button class="actionbtn" id="cm-tutor">' +
        esc(FB.T(self ? '🧑‍🏫 Choose schooling or a tutor…' : '🧑‍🏫 Arrange schooling or a tutor…')) +
        '<span class="adesc">' +
        esc(FB.T(self
          ? 'Instruction raises your yearly learning chance; paid lessons charge each season.'
          : 'Instruction raises their yearly learning chance; paid lessons charge each season.')) +
        '</span></button>';
    }
    // the household head may pledge a resident descendant's hand from age twelve
    if (descendantKind && isHousehold && !FB.spouseOf(s, c)) {
      const bt = c.betrothedId ? s.chars[c.betrothedId] : null;
      if (bt && !bt.dead) {
        h += '<div class="progressnote">' + esc(FB.T(
          '🤝 Betrothed to {name} — the wedding follows once both are of age.',
          { name: bt.name })) + '</div>';
      } else if (FB.ageOf(c, s.date.year) >= 12) {
        h += '<button class="actionbtn" id="cm-match">💍 Arrange a match…' +
          '<span class="adesc">' + esc(FB.T(c.sex === 'f'
            ? 'Sound out families for her hand. A pledge binds; the wedding follows at sixteen. (sealing one spends the day)'
            : 'Sound out families for his hand. A pledge binds; the wedding follows at sixteen. (sealing one spends the day)')) +
          '</span></button>';
      }
    }
    h += '</div><button class="btn" id="cm-close">Close</button>';
    openModal(FB.fullName(c), h);
    FB.paintFaces($('gm-body'), s);
    function actThen(fn) {
      UI.closeModal();
      fn();
      FB.game.passDay({ skipFocus: true });
    }
    const cultivate = $('cm-attention');
    if (cultivate) cultivate.addEventListener('click', function () {
      if (!FB.socialAttentionAssign(s, c)) return;
      UI.showCharModal(c.id);
      UI.refresh();
    });
    const visitCultivate = $('cm-attention-visit');
    if (visitCultivate) visitCultivate.addEventListener('click', function () {
      UI.showSocialVisit(c.id);
    });
    const stopCultivating = $('cm-attention-stop');
    if (stopCultivating) stopCultivating.addEventListener('click', function () {
      if (!FB.socialAttentionWithdraw(s, c.id)) return;
      UI.showCharModal(c.id);
      UI.refresh();
    });
    const nameFriend = $('cm-namefriend');
    if (nameFriend) nameFriend.addEventListener('click', function () {
      UI.showFriendConfirm(c.id);
    });
    const retainerButton = $('cm-retainer');
    if (retainerButton) retainerButton.addEventListener('click', function () {
      UI.showRetainerManage(c.id);
    });
    const gf = $('cm-gift');
    if (gf) gf.addEventListener('click', function () {
      if (reigningRealmId) {
        UI.showRulerGiftModal(reigningRealmId, 'character:' + c.id);
      } else UI.showCharacterGiftModal(c.id);
    });
    const ct = $('cm-court');
    if (ct) ct.addEventListener('click', function () {
      UI.closeModal();
      if (!FB.beginCourtship(s, c)) return;
      FB.news(s, FB.msg('news.social.courting_begins',
        '🌷 You begin courting {name}.', { name:FB.fullName(c) }));
      FB.game.passDay({ skipFocus:true });
    });
    const courtVisit = $('cm-court-visit');
    if (courtVisit) courtVisit.addEventListener('click', function () {
      UI.showSocialVisit(c.id, { courtship:true });
    });
    const pp = $('cm-propose');
    if (pp) pp.addEventListener('click', function () {
      if (!FB.canPropose(s)) return;
      UI.closeModal();
      FB.queueEvent(s, 'proposal_made', {});
      FB.game.passDay({ skipFocus: true });
    });
    const dv = $('cm-divorce');
    if (dv) dv.addEventListener('click', function () {
      actThen(function () {
        const doc = FB.marriageDoctrine(me.religion);
        const cost = doc.divorce === 'sunder' ? 0 : (FBDATA.balance.dowryByStation[FB.stationOf(c)] || 0);
        const gap = FB.stationOf(c) - FB.playerStation(s);
        if (cost) s.player.gold = Math.max(0, s.player.gold - cost);
        if (doc.divorce === 'sunder') s.player.prestige = Math.max(0, s.player.prestige - 5);
        if (gap > 0) s.player.prestige = Math.max(0, s.player.prestige - gap * 5);
        FB.doDivorce(s, c.id);
        FB.news(s, FB.msg('news.social.divorce', {
          forms: {
            select: 'value', param: 'kind', cases: {
              talaq: '🕊 You pronounce the divorce from {name}; the mahr of {money:cost} is paid.',
              get: '📜 A get is written and witnessed; {name} departs with the ketubah of {money:cost}.',
              other: '💔 Before witnesses, the marriage to {name} is declared sundered.'
            }
          }
        }, { kind: doc.divorce, name: c.name, cost: cost }));
        if (gap > 0) FB.news(s, FB.msg('news.social.divorce_house_offended',
          '🗣 The house of {name} does not forgive the slight.', { name: c.name }));
        FB.validateFocus(s);
      });
    });
    const an = $('cm-annul');
    if (an) an.addEventListener('click', function () {
      UI.closeModal();
      s.player.cooldowns.annul = s.turn; // the church hears one plea a year
      FB.queueEvent(s, 'annulment_plea', {});
      FB.game.passDay({ skipFocus: true });
    });
    const bo = $('cm-breakoff');
    if (bo) bo.addEventListener('click', function () {
      UI.closeModal();
      FB.clearCourtship(s, { penalty:true, news:true });
      FB.validateFocus(s);
      UI.refresh();
    });
    const ins = $('cm-insult');
    if (ins) ins.addEventListener('click', function () {
      actThen(function () {
        FB.adjustStanding(s, { kind:'character', id:c.id }, -12,
          'social:public_insult');
        FB.noteRivalContact(s, c, 1, 'insult');
        if (FB.chance(0.5 + FB.skillOf(me, 'dip') * 0.015)) {
          s.player.prestige += 4;
          FB.news(s, FB.msg('news.social.insult_success',
            'Your barb lands perfectly. {name} fumes; the crowd laughs.', { name: c.name }));
        } else {
          s.player.prestige = Math.max(0, s.player.prestige - 5);
          FB.news(s, FB.msg('news.social.insult_failure',
            'The insult falls flat. {name} answers better, and the laughter is theirs.',
            { name: c.name }));
        }
      });
    });
    const und = $('cm-undermine');
    if (und) und.addEventListener('click', function () {
      actThen(function () {
        if (FB.chance(0.35 + FB.skillOf(me, 'int') * 0.03)) {
          FB.adjustStanding(s, { kind:'character', id:c.id }, -8,
            'social:undermined');
          FB.noteRivalContact(s, c, 1, 'undermined');
          s.player.prestige += 3;
          if (FB.chance(0.5)) FB.gainSkill(me, 'int', 1);
          FB.news(s, FB.msg('news.social.undermine_success',
            'Your quiet work costs {name} dearly, and no one can prove a thing.',
            { name: c.name }));
        } else {
          FB.adjustStanding(s, { kind:'character', id:c.id }, -20,
            'social:caught_scheme');
          FB.noteRivalContact(s, c, 2, 'caught_scheme');
          s.player.prestige = Math.max(0, s.player.prestige - 6);
          FB.news(s, FB.msg('news.social.undermine_failure',
            'The scheme unravels — and {name} knows exactly whose hand was in it.',
            { name: c.name }));
        }
      });
    });
    const rv = $('cm-rival');
    if (rv) rv.addEventListener('click', function () {
      actThen(function () {
        FB.startRivalry(s, c, 'player', 'declared', null);
        FB.news(s, FB.msg('news.social.rival',
          '⚡ {name} now counts you an enemy.', { name: c.name }));
      });
    });
    const settle = $('cm-settle');
    if (settle) settle.addEventListener('click', function () {
      actThen(function () {
        FB.queueEvent(s, 'rival_mediation', {});
      });
    });
    const nc = $('cm-nochildren');
    if (nc) nc.addEventListener('click', function () {
      if (s.player.flags.noChildren) {
        delete s.player.flags.noChildren;
        UI.toast('🌱 You will try for children again.');
      } else {
        s.player.flags.noChildren = 1;
        UI.toast('🛑 No more children — a pregnancy already begun will still come to term.');
      }
      UI.closeModal();
      UI.showCharModal(c.id);
      UI.refresh();
    });
    const ef = $('cm-edufocus');
    if (ef) ef.addEventListener('click', function () { UI.showEduFocus(c.id); });
    const tu = $('cm-tutor');
    if (tu) tu.addEventListener('click', function () { UI.showTutorPick(c.id); });
    const cr = $('cm-career');
    if (cr) cr.addEventListener('click', function () { UI.showCareerPicker(c.id); });
    const ceq = $('cm-equipment');
    if (ceq) ceq.addEventListener('click', function () {
      UI.showEquipmentModal(c.id, 'character');
    });
    const mt = $('cm-match');
    if (mt) mt.addEventListener('click', function () { UI.showMatchPicker(c.id); });
    $('cm-close').addEventListener('click', UI.closeModal);
  };

  UI.showEquipmentModal = function (cid, exitMode, returnContext) {
    const s = FB.state;
    const c = s && s.chars[cid];
    if (!s || !c || c.dead || !FB.isHouseholdCharacter(s, cid)) return;
    exitMode = exitMode === 'character' ? 'character' : 'close';
    const householdPlan = returnsToHouseholdPlan(returnContext);
    const returnMode = 'equipment:' +
      (householdPlan ? HOUSEHOLD_PLAN_RETURN : exitMode);
    const closeLabel = householdPlan ? FB.T('Back to Household Plan')
      : (exitMode === 'character' ? FB.T('Back to character') : FB.T('Close'));
    const fullName = FB.fullName(c);
    const modalClass = ['fullsheet-modal', 'equipment-modal'].join(' ');
    const h = equipmentSheetHtml(s, c) +
      '<div class="gm-footer"><button type="button" class="btn" id="equipment-close">' +
      esc(closeLabel) + '</button></div>';
    openModal(FB.T('Equipment for {name}', { name:fullName }), h,
      {
        modalClass:modalClass,
        historyView:exitMode === 'character' || householdPlan,
        historyBackRender:function () {
          if (householdPlan) UI.showHouseholdPlan();
          else UI.showCharModal(cid);
        }
      });
    if (mobileLayoutNow()) {
      $('gm-title').textContent = fullName + '\n' + FB.T('Equipment');
    }
    FB.paintFaces($('gm-body'), s);
    wireEquipmentButtons($('gm-body'), returnMode);
    $('equipment-best').addEventListener('click', function () {
      UI.showEquipBestPreview(cid, exitMode, returnContext);
    });
    $('equipment-close').addEventListener('click', function () {
      if (householdPlan) {
        finishHouseholdPlanReturn(returnContext, function () {});
      } else if (exitMode === 'character') {
        modalHistoryBack(function () { UI.showCharModal(cid); });
      }
      else UI.closeModal();
    });
  };

  function equipmentSlotsText(slots) {
    if (!slots || !slots.length) return FB.T('Family armory');
    if (slots.indexOf('leftHand') >= 0 && slots.indexOf('rightHand') >= 0) {
      return FB.T('Both hands');
    }
    return itemSlotLabel(slots[0]);
  }

  function equipBestMovementText(s, target, movement) {
    const item = FB.resolveItem(s, movement.ref);
    const itemName = item ? FB.itemName(s, movement.ref) : movement.ref;
    const source = movement.fromCid && s.chars[movement.fromCid];
    if (!movement.toCid) {
      return FB.T('{item} returns from {source} to the family armory.', {
        item:itemName,
        source:source ? FB.fullName(source) : FB.T('its current wearer')
      });
    }
    const slots = equipmentSlotsText(movement.toSlots);
    if (!movement.fromCid) {
      return FB.T('{item} moves from the family armory to {name} ({slots}).', {
        item:itemName,
        name:FB.fullName(target),
        slots:slots
      });
    }
    if (movement.fromCid === target.id) {
      return FB.T('{item} moves from {from} to {to}.', {
        item:itemName,
        from:equipmentSlotsText(movement.fromSlots),
        to:slots
      });
    }
    return FB.T('{item} moves from {source} to {name} ({slots}).', {
      item:itemName,
      source:source ? FB.fullName(source) : FB.T('its current wearer'),
      name:FB.fullName(target),
      slots:slots
    });
  }

  function equipBestProposedSource(s, target, entry) {
    if (!entry.fromCid) return FB.T('From the family armory');
    const source = s.chars[entry.fromCid];
    if (entry.fromCid === target.id) {
      return FB.T('Already worn by {name}', { name:FB.fullName(target) });
    }
    return FB.T('Currently worn by {name}', {
      name:source ? FB.fullName(source) : FB.T('another household member')
    });
  }

  UI.showEquipBestPreview = function (cid, exitMode, returnContext, notice) {
    const s = FB.state;
    const c = s && s.chars[cid];
    if (!s || !c || c.dead || !FB.isHouseholdCharacter(s, cid)) return;
    const plan = FB.equipBestPreview(s, cid);
    if (!plan.ok) {
      UI.toast(equipmentBlockedText(plan.code) || FB.T(
        'Equipment cannot be optimized right now.'));
      return;
    }
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Review the strongest age-valid, unpledged equipment for {name}. Mechanical effects outrank value, and applying this plan costs no day.', {
        name:FB.fullName(c)
      })) + '</p></div>' +
      (notice ? '<div class="hint equip-best-notice">' + esc(notice) + '</div>' : '') +
      '<div class="equip-best-section"><h4>' + esc(FB.T('Proposed outfit')) +
      '</h4><div class="equip-best-list">';
    if (plan.proposed.length) {
      for (let i = 0; i < plan.proposed.length; i++) {
        const entry = plan.proposed[i];
        const item = FB.resolveItem(s, entry.ref);
        h += '<article class="equip-best-row"><strong>' +
          esc((item ? item.def.icon + ' ' : '') + FB.itemName(s, entry.ref)) +
          '</strong><span>' + esc(equipmentSlotsText(entry.slots)) +
          '</span><small>' + esc(equipBestProposedSource(s, c, entry)) +
          '</small></article>';
      }
    } else {
      h += '<p class="hint">' + esc(FB.T(
        'No age-valid, unpledged equipment is available for this character.')) +
        '</p>';
    }
    h += '</div></div><div class="equip-best-section"><h4>' +
      esc(FB.T('Items that will move')) + '</h4><div class="equip-best-movements">';
    if (plan.movements.length) {
      for (let i = 0; i < plan.movements.length; i++) {
        h += '<div class="equip-best-movement">' +
          esc(equipBestMovementText(s, c, plan.movements[i])) + '</div>';
      }
    } else {
      h += '<p class="hint">' + esc(FB.T(
        'Nothing will move. This character already wears the best available outfit.')) +
        '</p>';
    }
    h += '</div></div><div class="gm-footer">' +
      '<button type="button" class="btn primary" id="equip-best-apply"' +
      (!plan.changed ? ' disabled' : '') + '>' +
      esc(FB.T('Apply Equip Best')) + '</button>' +
      '<button type="button" class="btn" id="equip-best-back">' +
      esc(FB.T('Back to equipment')) + '</button></div>';
    openModal(FB.T('Equip Best for {name}', { name:FB.fullName(c) }), h, {
      historyView:true,
      modalClass:'fullsheet-modal equip-best-modal',
      historyBackRender:function () {
        UI.showEquipmentModal(cid, exitMode, returnContext);
      }
    });
    $('equip-best-apply').addEventListener('click', function () {
      const result = FB.applyEquipBest(s, plan);
      if (!result.ok) {
        UI.showEquipBestPreview(cid, exitMode, returnContext,
          result.code === 'stale'
            ? FB.T('Equipment assignments changed after this review. A fresh plan is shown; review it before applying.')
            : FB.T('The equipment plan can no longer be applied.'));
        return;
      }
      UI.refresh();
      UI.showEquipmentModal(cid, exitMode, returnContext);
      mobileNavClosedAll('modal-view', true);
      UI.toast(FB.T('Best available equipment applied to {name}.', {
        name:FB.fullName(c)
      }));
    });
    $('equip-best-back').addEventListener('click', function () {
      modalHistoryBack(function () {
        UI.showEquipmentModal(cid, exitMode, returnContext);
      });
    });
  };

  /* ================= arranged match picker =================
     Three families sounded out for a managed descendant's hand — the same
     three wait until a pledge is sealed or the descendant weds elsewhere.
     A daughter's or granddaughter's dowry is paid at the pledge; a son's or
     grandson's bride brings hers to the wedding. */
  UI.showMatchPicker = function (cid, returnContext) {
    const s = FB.state;
    if (!s || UI.eventsBusy()) return;
    const c = s.chars[cid];
    if (!c || c.dead || !FB.playerDescendantKind(s, cid) ||
        !FB.isHouseholdCharacter(s, cid) || FB.ageOf(c, s.date.year) < 12 ||
        FB.spouseOf(s, c) || c.betrothedId) return;
    let cands = FB.spawnMatchCandidates(s, c);
    const matchPolicy = FB.ensureMatchPolicy(s);
    if (matchPolicy.enabled) {
      FB.recommendDescendantMatches(s, { notify:false });
    }
    const recommendation = FB.matchRecommendationOf(s, c);
    const recommendedId = recommendation && recommendation.candidate.id;
    cands = cands.map(function (candidate, order) {
      return { candidate:candidate, order:order };
    }).sort(function (a, b) {
      if (a.candidate.id === recommendedId) return -1;
      if (b.candidate.id === recommendedId) return 1;
      return a.order - b.order;
    }).map(function (entry) { return entry.candidate; });
    const ps = FB.playerStation(s);
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Families willing to hear an offer for {name}’s hand:', { name: c.name })) +
      '</p>' + (recommendedId ? '<p class="hint">' + esc(FB.T(
        'The assistant’s recommendation is listed first. Every family remains your decision.')) +
        '</p>' : '') +
      '</div><div class="gm-list">';
    for (const m of cands) {
      if (s.player.courtingId === m.id) continue; // no pledging your own paramour
      const gap = FB.stationOf(m) - ps;
      const terms = FB.kinMatchTerms(s, c, m);
      const need = terms.prestigeNeed;
      const ask = terms.dowry;
      const ok = terms.ok;
      const details = [
        FB.stationName(FB.stationOf(m)),
        FB.T('age {age}', { age: FB.ageOf(m, s.date.year) })
      ];
      if (m.id === recommendedId) {
        details.unshift(FB.T('Recommended by your assistant limits'));
      }
      if (ask) details.push(FB.T('their kin ask a dowry of {money:gold}', { gold: ask }));
      if (m.dowryDue) {
        details.push(FB.T('she would bring a dowry of {money:gold}', { gold: m.dowryDue }));
      }
      if (need) {
        details.push(s.player.prestige >= need
          ? FB.T('needs {prestige} prestige', { prestige: need })
          : FB.T('needs {prestige} prestige (you have {current})',
            { prestige: need, current: Math.floor(s.player.prestige) }));
      } else if (gap < 0) details.push(FB.T('a step down — folk will mark it'));
      if (!ok && terms.reason !== 'gold' && terms.reason !== 'prestige') {
        const blocked = terms.reason === 'faith'
          ? FB.T('blocked by faith')
          : terms.reason === 'kinship'
            ? FB.T('blocked by close kinship')
            : terms.reason === 'compact'
              ? FB.T('royal compacts are reserved for the household head')
              : terms.reason === 'doctrine'
                ? FB.T('blocked by marriage doctrine')
                : FB.T('no longer eligible');
        details.push(blocked);
      }
      h += '<button class="actionbtn' +
        (m.id === recommendedId ? ' match-policy-recommended' : '') +
        '" data-match="' + m.id + '"' + (ok ? '' : ' disabled') +
        '>💍 ' + esc((epithetText(s, m) ? epithetText(s, m) + ' — ' : '') + m.name) +
        '<span class="adesc">' + esc(details.join(' · ')) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">' +
      esc(FB.T('Decide nothing today')) + '</button>';
    const historyOptions = { historyView:true };
    if (returnsToHouseholdPlan(returnContext)) {
      historyOptions.historyBackRender = function () { UI.showHouseholdPlan(); };
    }
    openModal(FB.T('A Match for {name}', { name: c.name }), h, historyOptions);
    document.querySelectorAll('[data-match]').forEach(function (b) {
      b.addEventListener('click', function () {
        const m = s.chars[b.dataset.match];
        if (!m) return;
        if (!FB.sealKinMatch(s, c, m)) return;
        UI.closeModal();
        FB.game.passDay({ skipFocus: true });
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      finishHouseholdPlanReturn(returnContext, function () {
        modalHistoryBack(function () { UI.showCharModal(cid); });
      });
    });
  };

  /* ================= suitor picker =================
     Seeking a match sounds out three families at once — an established house,
     a peer, and a young one (FB.spawnSuitor) — so age never decides the match
     by itself. The same three wait until one is chosen; the usual
     meet-and-court flow follows from there. */
  UI.showSuitorPicker = function () {
    const s = FB.state;
    if (!s || UI.eventsBusy()) return;
    const cands = FB.spawnSuitor(s).slice().sort(function (a, b) {
      return (a.suitorProfile || 0) - (b.suitorProfile || 0);
    });
    if (!cands.length) return;
    const ps = FB.playerStation(s);
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Kin and gossips name three who would hear your suit:')) +
      '</p></div><div class="gm-list">';
    for (const m of cands) {
      const st = FB.stationOf(m);
      const gap = st - ps;
      const age = FB.ageOf(m, s.date.year);
      const details = [
        FB.stationName(st),
        FB.T('age {age}', { age: age })
      ];
      const dowry = Math.round(FBDATA.balance.dowryByStation[st] || 0);
      if (dowry) {
        details.push(FB.T('would bring a dowry of about {money:gold}', { gold: dowry }));
      }
      details.push((m.sex === 'f' && age > 45) ? FB.T('🌱 past childbearing')
        : FB.T('🌱 fertility {percent}%', {
          percent: Math.round((m.fertility || 1) * FB.traitAgg(m).fert *
            FB.ageFert(m.sex, age) * 100)
        }));
      if (gap > 0) details.push(FB.T('a step up — a harder suit'));
      else if (gap < 0) details.push(FB.T('a step down — folk will mark it'));
      h += '<button class="actionbtn" data-suitor="' + m.id + '">💍 ' +
        esc((epithetText(s, m) ? epithetText(s, m) + ' — ' : '') + m.name) +
        '<span class="adesc">' + esc(details.join(' · ')) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">' + esc(FB.T('Decide nothing today')) + '</button>';
    openModal(FB.T('Seeking a Match'), h);
    document.querySelectorAll('[data-suitor]').forEach(function (b) {
      b.addEventListener('click', function () {
        const m = s.chars[b.dataset.suitor];
        if (!m) return;
        UI.closeModal();
        FB.pickSuitor(s, m.id);
        FB.queueEvent(s, 'meet_suitor', {});
        FB.game.passDay({ skipFocus: true });
      });
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  /* ================= item card =================
     Every treasure chip opens this card: its story, its powers in plain
     words, and — for the player's own — the ways to part with it. viewOnly
     covers items worn by other characters (gifts already given). */
  function itemFxText(d) {
    const fx = d.fx || {};
    const parts = [];
    for (const k of FB.SKILLS) {
      if (fx[k]) parts.push(FB.T('{amount} {skill}', {
        amount: (fx[k] > 0 ? '+' : '') + fx[k], skill: FB.skillName(k)
      }));
    }
    if (fx.battle) parts.push(FB.T('{amount}% battle odds',
      { amount: (fx.battle > 0 ? '+' : '') + Math.round(fx.battle * 100) }));
    if (fx.prestige) parts.push(FB.T('{amount} prestige a season',
      { amount: (fx.prestige > 0 ? '+' : '') + fx.prestige }));
    if (fx.piety) parts.push(FB.T('{amount} piety a season',
      { amount: (fx.piety > 0 ? '+' : '') + fx.piety }));
    if (fx.gold) parts.push(FB.T('{money:amount} a season · shown in Money each season',
      { amount:fx.gold }));
    if (fx.health) parts.push(FB.T('{amount}% health protection', {
      amount:(fx.health > 0 ? '+' : '') + Math.round(fx.health * 10000) / 100
    }));
    return parts.join(' · ');
  }

  function itemOwnerText(s, ref, owned) {
    if (owned) return FB.T('Household armory');
    const owner = FB.itemOwner ? FB.itemOwner(s, ref) : null;
    if (!owner) return FB.T('Outside the household');
    if (owner.kind === 'character' && s.chars[owner.id]) {
      return FB.fullName(s.chars[owner.id]);
    }
    if (owner.kind === 'delivery') return FB.T('Courier delivery');
    return FB.T('Household armory');
  }

  function itemTransferRule(owned, assigned, pledged) {
    if (!owned) return FB.T('Controlled by its current owner');
    if (pledged) return FB.T('Pledged; cannot be equipped, sold, or gifted');
    if (assigned) return FB.T('Unequip before selling, gifting, or pledging');
    return FB.T('May be equipped, sold, gifted, or pledged');
  }

  UI.showItemModal = function (id, viewOnly) {
    const s = FB.state;
    const item = s && FB.resolveItem(s, id);
    if (!s || !item) return;
    const def = item.def;
    const name = FB.itemName(s, id);
    const owned = !viewOnly && FB.itemList(s).indexOf(id) >= 0;
    const pledged = owned && FB.financeCollateralPledged &&
      FB.financeCollateralPledged(s, 'item', id);
    const assigned = owned && FB.itemAssignment(s, id);
    const blocked = owned && FB.equipmentBlockedReason(s);
    const fx = itemFxText(item);
    const sell = Math.round(item.value * (FBDATA.balance.itemSellRatio || 0.5));
    const quality = item.ordinary ? FB.itemQualityName(item.quality) : rarityName(def.rarity);
    const slot = item.grip === 2 ? FB.T('Both hands') :
      (item.slot === 'hand' ? FB.T('Either hand') : itemSlotLabel(item.slot));
    const equipLabel = assigned ? FB.T('Change equipment…') : FB.T('Equip…');
    let h = '<div class="item-card"><canvas class="itemart" data-item="' + esc(id) +
      '" width="144" height="144" role="img" aria-label="' + esc(name) + '"></canvas>' +
      '<div class="gm-body-text item-card-copy">' +
      '<p style="font-size:16px"><b>' + def.icon + ' ' + esc(name) +
      '</b> - <span class="cmeta">' + esc(quality) + '</span></p>' +
      '<p><i>' + esc(dt(s, 'item', item.defId, def, 'desc')) + '</i></p>' +
      '<p class="cmeta">' + esc(FB.T('Worth about {money:gold}.', {
        gold:item.value
      })) + '</p>' + assetEffectSummary({
        owner:itemOwnerText(s, id, owned),
        scope:assigned
          ? FB.T('{wearer} · {slot}', { wearer:itemWearerText(s, id), slot:slot })
          : FB.T('{slot} equipment', { slot:slot }),
        setupCost:FB.T('Varies by acquisition'),
        recurringCost:FB.T('None'),
        effect:fx,
        transferRule:itemTransferRule(owned, assigned, pledged),
        expiry:FB.T('No fixed end; leaves through sale, gift, loss, or destruction')
      }) +
      (fx ? '<p class="cmeta">' + esc(FB.T(
        'Powers apply only while equipped. Skills and health affect the wearer; battle and seasonal resources count only on the head of the family.')) +
        '</p>' : '') +
      '</div></div>';
    if (owned && !pledged) {
      h += '<div class="gm-list">' +
        '<button class="actionbtn" id="im-equip"' + (blocked ? ' disabled' : '') + '>🧍 ' +
        esc(equipLabel) +
        '<span class="adesc">' + esc(FB.T(
          'Choose a household wearer and compatible slot. This costs no day.')) +
        '</span></button>' +
        (assigned ? '<button class="actionbtn" id="im-unequip"' + (blocked ? ' disabled' : '') + '>' +
          esc(FB.T('Return it to the armory')) +
          '<span class="adesc">' + esc(FB.T(
            'Unequip it before selling, gifting, or pledging it.')) + '</span></button>' : '') +
        (assigned ? '' :
        '<button class="actionbtn" id="im-give">🎁 Give it as a gift…' +
        '<span class="adesc">' + esc(FB.T(
          '+{standing} Standing. Each recipient can receive one cash or item gift every {days} days. (spends the day)', {
            standing:FB.giftOpinion(item), days:FB.socialGiftCooldownDays()
          })) + '</span></button>' +
        '<button class="actionbtn" id="im-sell">' +
        esc(FB.T('💰 Sell it ({money:gold})', { gold: sell })) +
        '<span class="adesc">Sold is sold — there is no buying it back. (spends the day)</span></button>') +
        '</div>';
      if (blocked) {
        h += '<div class="progressnote warnote">' + esc(equipmentBlockedText(blocked)) + '</div>';
      }
    } else if (pledged) {
      h += '<div class="progressnote warnote">' +
        esc(FB.T('This treasure is pledged to a lender. It cannot be sold or given away until the loan is cleared.')) +
        '</div>';
    }
    h += '<button class="btn" id="gm-cancel" style="margin-top:10px">Close</button>';
    openModal(name, h);
    FB.paintFaces($('gm-body'), s);
    const eq = $('im-equip');
    if (eq) eq.addEventListener('click', function () { UI.showItemEquip(id); });
    const un = $('im-unequip');
    if (un) un.addEventListener('click', function () {
      const at = FB.itemAssignment(s, id);
      if (at) FB.unequipItem(s, at.cid, at.slots[0]);
      UI.refresh();
      UI.showItemModal(id);
    });
    const gv = $('im-give');
    if (gv) gv.addEventListener('click', function () { UI.showItemGive(id); });
    const sl = $('im-sell');
    if (sl) sl.addEventListener('click', function () {
      if (FB.sellItem(s, id)) {
        UI.closeModal();
        FB.game.passDay({ skipFocus: true });
      }
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
  };

  /* who to honor with it — everyone the player knows by name */
  UI.showItemGive = function (id) {
    const s = FB.state;
    const item = s && FB.resolveItem(s, id);
    if (!s || !item || FB.itemList(s).indexOf(id) < 0 ||
      FB.itemAssignment(s, id) ||
      (FB.financeCollateralPledged && FB.financeCollateralPledged(s, 'item', id))) return;
    const def = item.def;
    const me = s.chars[s.player.charId];
    const seen = {}, folk = [];
    function add(c, rel) {
      if (!c || c.dead || c.id === me.id || seen[c.id] ||
        (FB.isHouseholdCharacter && FB.isHouseholdCharacter(s, c.id))) return;
      seen[c.id] = 1;
      folk.push({ c: c, rel: rel });
    }
    if (s.player.courtingId) add(s.chars[s.player.courtingId], FB.T('courting'));
    const kin = FB.kinOf(s);
    for (const g of ['children', 'parents', 'siblings', 'grandchildren',
      'niecesNephews', 'unclesAunts', 'cousins', 'grandparents']) {
      for (const e of kin[g]) add(e.c, FB.T(e.rel));
    }
    for (const contact of FB.friendConnections(s)) {
      add(contact, FB.T('cultivated connection'));
    }
    for (const role of ['lord', 'priest', 'friend', 'rival']) {
      const relation = role === 'lord' ? FB.T('your lord') :
        (role === 'priest' ? FB.T('your priest') :
          (role === 'friend' ? FB.T('your friend') : FB.T('your rival')));
      add(FB.getRole(s, role, false), relation);
    }
    if (!folk.length) {
      UI.toast('You know no one to honor with it.');
      return;
    }
    const boost = FB.giftOpinion(item);
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Whom to honor with {icon} {item}? Such largesse is worth +{standing} Standing.', {
        icon:def.icon, item:FB.itemName(s, id), standing:boost
      })) + '</p></div><div class="gm-list">';
    for (const e of folk) {
      const op = FB.standingOf(s, { kind:'character', id:e.c.id });
      const giftDays = FB.socialGiftDaysRemaining(s, e.c.id);
      const detailParams = {
        relation:e.rel, standing:standingText(op), days:giftDays
      };
      const details = giftDays
        ? FB.T('{relation} · Standing {standing} · gift ready in {days} days', detailParams)
        : FB.T('{relation} · Standing {standing} · gift ready now', detailParams);
      h += '<button class="actionbtn" data-give="' + e.c.id + '"' +
        (giftDays ? ' disabled' : '') + '>🎁 ' + esc(FB.fullName(e.c)) +
        '<span class="adesc ' + standingClass(op) + '">' + esc(details) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">Keep it</button>';
    openModal('A Gift Worth Giving', h, { historyView:true });
    document.querySelectorAll('[data-give]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (FB.giveItem(s, id, b.dataset.give)) {
          UI.closeModal();
          FB.game.passDay({ skipFocus: true });
        }
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      modalHistoryBack(function () { UI.showItemModal(id); });
    });
  };

  function equipCheckText(check) {
    if (!check || check.ok) return '';
    if (check.code === 'age') {
      return FB.T('Minimum age {age}', { age:check.ageMin });
    }
    if (check.code === 'pledged') return FB.T('Pledged to a lender');
    if (check.code === 'travel') return FB.T('Unavailable while traveling');
    if (check.code === 'event') return FB.T('Unavailable during an unresolved event');
    if (check.code === 'household') return FB.T('Not in the household');
    return FB.T('Cannot use this slot');
  }

  function equipmentExitMode(returnMode) {
    const prefix = 'equipment:';
    return returnMode && returnMode.indexOf(prefix) === 0
      ? returnMode.slice(prefix.length) : null;
  }

  function finishEquipment(cid, ref, returnMode) {
    const nestedPicker = $('equip-picker-overlay');
    if (nestedPicker) {
      closeEquipmentPickerRaw(nestedPicker, false);
      mobileNavClosed('equipment-picker', true);
    } else {
      UI._equipPickerReturnFocus = null;
    }
    UI.refresh();
    const exitMode = equipmentExitMode(returnMode);
    if (exitMode === HOUSEHOLD_PLAN_RETURN) {
      finishHouseholdPlanReturn(HOUSEHOLD_PLAN_RETURN, function () {});
    } else if (exitMode !== null) UI.showEquipmentModal(cid, exitMode);
    else if (returnMode === 'character') {
      modalHistoryBack(function () { UI.showCharModal(cid); });
    } else if (returnMode === 'item') {
      modalHistoryBack(function () { UI.showItemModal(ref); });
    }
    else UI.closeModal();
  }

  function applyEquip(cid, slot, ref, returnMode) {
    const s = FB.state;
    const result = FB.equipItem(s, cid, slot, ref);
    if (!result.ok) {
      UI.toast(equipCheckText(result));
      return;
    }
    finishEquipment(cid, ref, returnMode);
  }

  UI.showEquipSlot = function (cid, slot, returnMode) {
    const s = FB.state;
    const c = s && s.chars[cid];
    if (!s || !c || !FB.isHouseholdCharacter(s, cid)) return;
    if (!returnMode) {
      returnMode = $('genmodal').classList.contains('hidden') ? 'close' : 'character';
    }
    const blocked = FB.equipmentBlockedReason(s);
    const loadout = FB.loadoutOf(s, cid);
    const current = loadout[slot];
    const refs = FB.itemList(s).filter(function (ref) {
      return FB.itemFitsSlot(s, ref, slot);
    }).sort(function (a, b) {
      return FB.itemName(s, a).localeCompare(FB.itemName(s, b));
    });
    if (!current && !refs.length) {
      UI.toast(FB.T('There is no compatible object in the armory.'));
      return;
    }
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Choose {name}’s {slot} equipment from the shared family armory.', {
        name:c.name, slot:itemSlotLabel(slot)
      })) + '</p></div>';
    if (blocked) {
      h += '<div class="progressnote warnote">' + esc(equipmentBlockedText(blocked)) + '</div>';
    }
    h += '<div class="gm-list equip-pick-list">';
    if (current) {
      const cur = FB.resolveItem(s, current);
      h += '<button class="actionbtn" id="equip-empty"' + (blocked ? ' disabled' : '') + '>' +
        esc(FB.T('Leave this slot empty')) + '<span class="adesc">' +
        esc(FB.T('{item} returns to the armory.', {
          item:cur ? FB.itemName(s, current) : current
        })) + '</span></button>';
    }
    for (const ref of refs) {
      const item = FB.resolveItem(s, ref);
      const check = FB.canEquipItem(s, cid, slot, ref);
      const at = FB.itemAssignment(s, ref);
      const here = current === ref;
      const detail = [
        itemFxText(item) || FB.T('No mechanical effect'),
        at ? itemWearerText(s, ref) : FB.T('In the armory'),
        check.ok ? '' : equipCheckText(check)
      ].filter(function (value) { return !!value; }).join(' - ');
      h += '<button class="actionbtn equip-choice" data-equip-ref="' + esc(ref) + '"' +
        (!check.ok || here ? ' disabled' : '') + '>' +
        '<canvas class="itemart" data-item="' + esc(ref) + '" width="54" height="54"></canvas>' +
        '<span><b>' + item.def.icon + ' ' + esc(FB.itemName(s, ref)) + '</b>' +
        '<span class="adesc">' + esc(here ? FB.T('Worn here') : detail) +
        '</span></span></button>';
    }
    if (!refs.length) {
      h += '<div class="progressnote">' + esc(FB.T(
        'There is no compatible object in the armory.')) + '</div>';
    }
    const equipmentExit = equipmentExitMode(returnMode);
    const cancelLabel = equipmentExit === HOUSEHOLD_PLAN_RETURN
      ? FB.T('Back to Household Plan')
      : (equipmentExit !== null ? FB.T('Back to equipment') : FB.T('Close'));
    h += '</div><button class="btn" id="gm-cancel">' +
      esc(cancelLabel) + '</button>';
    const pickerTitle = FB.T('{slot} Equipment', { slot:itemSlotLabel(slot) });
    let pickerRoot = $('gm-body');
    let nested = false;
    if (equipmentExit !== null && !$('genmodal').classList.contains('hidden')) {
      const overlay = document.createElement('div');
      overlay.id = 'equip-picker-overlay';
      overlay.className = 'equip-picker-overlay';
      overlay.innerHTML = '<div class="equip-picker-card" role="dialog" aria-modal="true" ' +
        'aria-labelledby="equip-picker-title"><div class="equip-picker-heading">' +
        '<button type="button" id="equip-picker-history-back" ' +
        'class="btn equip-picker-history-back hidden" aria-label="' +
        esc(FB.T('Back')) + '">&#8592; <span>' + esc(FB.T('Back')) + '</span></button>' +
        '<h3 id="equip-picker-title">' + esc(pickerTitle) +
        '</h3></div><div class="equip-picker-body">' + h + '</div></div>';
      normalizeModalFooter(overlay.querySelector('.equip-picker-body'));
      UI._equipPickerReturnFocus = document.activeElement;
      pickerRoot.appendChild(overlay);
      overlay.querySelector('#equip-picker-history-back')
        .addEventListener('click', mobileNavRequestBack);
      const pickerReturnFocus = UI._equipPickerReturnFocus;
      mobileNavPush('equipment-picker',
        function () { closeEquipmentPickerRaw(overlay, true); },
        function () {
          UI._equipPickerReturnFocus = pickerReturnFocus;
          if (!overlay.parentNode) $('gm-body').appendChild(overlay);
          setTimeout(function () {
            const first = overlay.querySelector('.equip-picker-body button:not(:disabled)');
            if (first) first.focus({ preventScroll:true });
          }, 0);
        },
        function () { return document.documentElement.contains(overlay); },
        function () { return true; });
      FB.localizeTree(overlay);
      if (!FB.isTouch) {
        const numbered = overlay.querySelectorAll('.actionbtn');
        for (let n = 0; n < numbered.length && n < 18; n++) {
          numbered[n].insertAdjacentHTML('afterbegin', hintFor(n));
        }
      }
      overlay.addEventListener('click', function (event) {
        if (event.target === overlay) UI.closeModal();
      });
      nested = true;
      pickerRoot = overlay;
      setTimeout(function () {
        const first = overlay.querySelector('.equip-picker-body button:not(:disabled)');
        if (first) first.focus({ preventScroll:true });
      }, 0);
    } else {
      openModal(pickerTitle, h);
      pickerRoot = $('gm-body');
    }
    FB.paintFaces(pickerRoot, s);
    const empty = pickerRoot.querySelector('#equip-empty');
    if (empty) empty.addEventListener('click', function () {
      FB.unequipItem(s, cid, slot);
      finishEquipment(cid, current, returnMode);
    });
    const choices = pickerRoot.querySelectorAll('[data-equip-ref]');
    for (let i = 0; i < choices.length; i++) {
      choices[i].addEventListener('click', function () {
        applyEquip(cid, slot, choices[i].getAttribute('data-equip-ref'), returnMode);
      });
    }
    pickerRoot.querySelector('#gm-cancel').addEventListener('click', function () {
      if (equipmentExit === HOUSEHOLD_PLAN_RETURN) {
        if (nested) {
          closeEquipmentPickerRaw($('equip-picker-overlay'), true);
          mobileNavClosed('equipment-picker', true);
        }
        finishHouseholdPlanReturn(HOUSEHOLD_PLAN_RETURN, function () {});
      }
      else if (nested) UI.closeModal();
      else if (equipmentExit !== null) UI.showEquipmentModal(cid, equipmentExit);
      else if (returnMode === 'character') {
        modalHistoryBack(function () { UI.showCharModal(cid); });
      }
      else UI.closeModal();
    });
  };

  UI.showItemEquip = function (ref) {
    const s = FB.state;
    const item = s && FB.resolveItem(s, ref);
    if (!s || !item || FB.itemList(s).indexOf(ref) < 0) return;
    const blocked = FB.equipmentBlockedReason(s);
    const slots = item.slot === 'hand' ? ['rightHand', 'leftHand'] : [item.slot];
    const current = FB.itemAssignment(s, ref);
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Choose who should wear {item}. Selecting an assigned object moves it from its previous wearer.', {
        item:FB.itemName(s, ref)
      })) + '</p></div>';
    if (blocked) {
      h += '<div class="progressnote warnote">' + esc(equipmentBlockedText(blocked)) + '</div>';
    }
    h += '<div class="gm-list">';
    if (current) {
      h += '<button class="actionbtn" id="item-unequip"' + (blocked ? ' disabled' : '') + '>' +
        esc(FB.T('Return it to the armory')) + '<span class="adesc">' +
        esc(itemWearerText(s, ref)) + '</span></button>';
    }
    for (const cid of FB.householdCharacterIds(s)) {
      const c = s.chars[cid];
      for (const slot of slots) {
        const check = FB.canEquipItem(s, cid, slot, ref);
        const here = current && current.cid === cid && current.slots.indexOf(slot) >= 0;
        h += '<button class="actionbtn" data-item-equip-cid="' + cid +
          '" data-item-equip-slot="' + slot + '"' +
          (!check.ok || here ? ' disabled' : '') + '>' +
          esc(FB.T('{name} - {slot}', { name:FB.fullName(c), slot:itemSlotLabel(slot) })) +
          '<span class="adesc">' + esc(here ? FB.T('Worn here') :
            (check.ok ? FB.T('Available') : equipCheckText(check))) + '</span></button>';
      }
    }
    h += '</div><button class="btn" id="gm-cancel">' + esc(FB.T('Back to item')) + '</button>';
    openModal(FB.T('Equip {item}', { item:FB.itemName(s, ref) }), h,
      {
        historyView:true,
        historyBackRender:function () { UI.showItemModal(ref); }
      });
    const un = $('item-unequip');
    if (un) un.addEventListener('click', function () {
      const at = FB.itemAssignment(s, ref);
      if (at) FB.unequipItem(s, at.cid, at.slots[0]);
      finishEquipment(at ? at.cid : s.player.charId, ref, 'item');
    });
    const choices = $('gm-body').querySelectorAll('[data-item-equip-cid]');
    for (let i = 0; i < choices.length; i++) {
      choices[i].addEventListener('click', function () {
        applyEquip(choices[i].getAttribute('data-item-equip-cid'),
          choices[i].getAttribute('data-item-equip-slot'), ref, 'item');
      });
    }
    $('gm-cancel').addEventListener('click', function () {
      modalHistoryBack(function () { UI.showItemModal(ref); });
    });
  };

  /* ---------- education: focus picker ---------- */
  const EDU_DESC = {
    dip: 'Words, charm, and the ways of court.',
    mar: 'Spear, shield, and command.',
    ste: 'Coin, crops, and the running of estates.',
    int: 'Secrets, shadows, and leverage.',
    lea: 'Letters, law, and lore. (grants literacy at 16)'
  };
  UI.showEduFocus = function (cid, returnContext) {
    const s = FB.state;
    const c = s.chars[cid];
    if (!c || c.dead || !FB.isHouseholdCharacter(s, cid) ||
        (c.id !== s.player.charId && !FB.playerDescendantKind(s, cid)) ||
        FB.ageOf(c, s.date.year) >= 16) return;
    const self = c.id === s.player.charId;
    const policy = FB.ensureEducationPolicy(s);
    const provenance = FB.educationPolicyProvenance(s, c, 'focus');
    let h = '<div class="gm-list">';
    for (const k of FB.SKILLS) {
      const cur = c.edu && c.edu.focus === k;
      h += '<button class="actionbtn" data-edufocus="' + k + '">' + (cur ? '◉ ' : '○ ') +
        esc(FB.skillName(k)) + '<span class="adesc">' + esc(FB.L(EDU_DESC[k])) + '</span></button>';
    }
    h += '<button class="actionbtn" data-edufocus="">' +
      (provenance === 'manual' && (!c.edu || !c.edu.focus) ? '◉ ' : '○ ') +
      esc(FB.T('No directed study')) + '<span class="adesc">' +
      esc(FB.T(self ? 'Find your own way.' : 'Let the child find their own way.')) +
      '</span></button>';
    h += '<button class="actionbtn" id="edu-follow-policy">' +
      '↻ ' +
      esc(FB.T('Follow household policy')) + '<span class="adesc">' +
      esc(policy.focus
        ? FB.T('Use the household default: {focus}.', {
            focus:FB.skillName(policy.focus)
          })
        : FB.T('The household currently leaves each child’s focus for manual choice.')) +
      '</span></button>';
    h += '</div><button class="btn" id="edu-back">' + esc(FB.T('Back')) + '</button>';
    openModal(self ? FB.T('🎓 Your education') :
      FB.T('🎓 Education of {name}', { name: c.name }), h, {
        historyView:true,
        historyBackRender:function () {
          if (returnsToHouseholdPlan(returnContext)) UI.showHouseholdPlan();
          else UI.showCharModal(cid);
        }
      });
    document.querySelectorAll('[data-edufocus]').forEach(function (b) {
      b.addEventListener('click', function () {
        const k = b.getAttribute('data-edufocus');
        c.edu = c.edu || {};
        c.edu.focus = k || null;
        FB.markEducationManual(s, c, 'focus', k || 'none');
        FB.news(s, FB.msg('news.education.focus', {
          forms: {
            select: 'value', param: 'subject', cases: {
              self: {
                select: 'value', param: 'focus', cases: {
                  dip: '🎓 You will be schooled in diplomacy.',
                  mar: '🎓 You will be schooled in martial skill.',
                  ste: '🎓 You will be schooled in stewardship.',
                  int: '🎓 You will be schooled in intrigue.',
                  lea: '🎓 You will be schooled in learning.',
                  other: '🎓 You are left to your own devices.'
                }
              },
              other: {
                select: 'value', param: 'focus', cases: {
                  dip: '🎓 {name} will be schooled in diplomacy.',
                  mar: '🎓 {name} will be schooled in martial skill.',
                  ste: '🎓 {name} will be schooled in stewardship.',
                  int: '🎓 {name} will be schooled in intrigue.',
                  lea: '🎓 {name} will be schooled in learning.',
                  other: '🎓 {name} is left to their own devices.'
                }
              }
            }
          }
        }, { subject: self ? 'self' : 'other', focus: k || 'other', name: c.name }));
        if (k && FB.educationPolicyProvenance(s, c, 'instruction') === 'waiting') {
          const ids = {};
          ids[c.id] = 1;
          FB.applyEducationPolicy(s, {
            ids:ids, dimensions:{ focus:false, instruction:true }
          });
        }
        finishHouseholdPlanReturn(returnContext, function () {
          modalHistoryBack(function () { UI.showCharModal(cid); });
        });
      });
    });
    $('edu-follow-policy').addEventListener('click', function () {
      FB.followEducationPolicy(s, c, 'focus');
      finishHouseholdPlanReturn(returnContext, function () {
        modalHistoryBack(function () { UI.showCharModal(cid); });
      });
    });
    $('edu-back').addEventListener('click', function () {
      finishHouseholdPlanReturn(returnContext, function () {
        modalHistoryBack(function () { UI.showCharModal(cid); });
      });
    });
  };

  /* ---------- education: tutor picker ---------- */
  UI.showTutorPick = function (cid, returnContext) {
    const s = FB.state;
    const c = s.chars[cid];
    if (!c || c.dead || !FB.isHouseholdCharacter(s, cid) ||
        (c.id !== s.player.charId && !FB.playerDescendantKind(s, cid)) ||
        FB.ageOf(c, s.date.year) >= 16) return;
    const me = s.chars[s.player.charId];
    const self = c.id === me.id;
    const focus = c.edu && c.edu.focus;
    const currentSchool = FB.schoolingId(s, c);
    const policy = FB.ensureEducationPolicy(s);
    const educationOptions = FB.educationOptions(s, c, focus);
    const schoolOptions = educationOptions.filter(function (option) {
      return option.kind === 'school';
    });
    const tutorOptions = educationOptions.filter(function (option) {
      return option.kind === 'tutor';
    });
    const homeOption = educationOptions.filter(function (option) {
      return option.kind === 'home';
    })[0];
    function schoolTechNames(def) {
      const reqs = Array.isArray(def.requiresTech) ? def.requiresTech : [def.requiresTech];
      return reqs.filter(function (id) {
        return id && !FB.hasTech(s, id);
      }).map(function (id) {
        const tech = FBDATA.tech[id];
        return tech ? dt(s, 'tech', id, tech, 'name') : id;
      });
    }
    function optionLockReason(option) {
      const def = option && option.schoolId &&
        FBDATA.schooling[option.schoolId];
      if (!option || option.available) return '';
      if (option.reason === 'focus') return FB.T('Choose an education focus first.');
      if (option.reason === 'young') return FB.T('Lessons begin at age 6.');
      if (option.reason === 'old') return FB.T('Lessons end at age 16.');
      if (option.reason === 'tier' && def) {
        return FB.T('Requires {rank} rank or higher.', {
          rank:FB.titleWordFor(s, def.tierMin)
        });
      }
      if (option.reason === 'tech' && def) {
        const names = schoolTechNames(def);
        return names.length === 1
          ? FB.T('Requires the national technology {technology}.', { technology:names[0] })
          : FB.T('Requires the national technologies {technologies}.', {
              technologies:names.join(', ')
            });
      }
      if (option.reason === 'development') {
        return FB.T('Requires a town or city in your home county.');
      }
      if (option.reason === 'unsupported') {
        return FB.T('This school does not teach the chosen focus.');
      }
      return FB.T('This instruction is not available to this child.');
    }
    function skillNote(option) {
      const t = option.tutor;
      if (focus) return FB.T('{skill} {value} · {chance}% yearly', {
        skill:FB.skillName(focus), value:FB.skillOf(t, focus),
        chance:Math.round(option.chance * 100)
      });
      let best = 'dip';
      for (const k of FB.SKILLS) if (FB.skillOf(t, k) > FB.skillOf(t, best)) best = k;
      return FB.T('best: {skill} {value}',
        { skill: FB.skillName(best), value: FB.skillOf(t, best) });
    }
    const existingTutor = FB.educationTutor(s, c, false);
    function masterDescription() {
      if (!focus) return FB.T('A stranger of real accomplishment.');
      return FB.renderMessage(FB.msg('fx.ui.hired_master_focus', {
        forms: {
          select: 'value', param: 'focus', cases: {
            dip: 'A stranger of real accomplishment in diplomacy.',
            mar: 'A stranger of real accomplishment in martial matters.',
            ste: 'A stranger of real accomplishment in stewardship.',
            int: 'A stranger of real accomplishment in intrigue.',
            lea: 'A stranger of real accomplishment in learning.',
            other: 'A stranger of real accomplishment.'
          }
        }
      }, { focus: focus }), { state: s, viewer: s.player.charId });
    }
    function instructionName() {
      if (currentSchool === 'master' && existingTutor) return existingTutor.name;
      if (currentSchool && FBDATA.schooling[currentSchool]) {
        return dt(s, 'schooling', currentSchool, FBDATA.schooling[currentSchool], 'name');
      }
      if (c.edu && c.edu.tutorId === 'self') return FB.T('your own instruction');
      if (c.edu && c.edu.tutorId && s.chars[c.edu.tutorId]) {
        return s.chars[c.edu.tutorId].name;
      }
      return FB.T('home instruction');
    }
    function teachingAssignment(tutorId) {
      const students = [];
      for (const studentId in s.chars) {
        const student = s.chars[studentId];
        if (!student || student.dead || !student.edu ||
            student.edu.tutorId !== tutorId ||
            FB.ageOf(student, s.date.year) >= 16 ||
            !FB.isHouseholdCharacter(s, student.id)) continue;
        students.push(student.name);
      }
      return students.length
        ? FB.T('Teaching {students}', { students:students.join(', ') })
        : FB.T('No current teaching assignment');
    }
    let h = '<div class="gm-list">';
    for (const option of schoolOptions) {
      const id = option.schoolId;
      const def = option.def;
      const cur = currentSchool === id && !(c.edu && c.edu.tutorId);
      let reason = FB.T('{chance}% yearly · {money:amount} each season', {
        chance:Math.round(option.chance * 100), amount:option.fee
      });
      const locked = optionLockReason(option);
      if (locked) reason = locked;
      const warning = educationRiskWarning(option);
      h += '<button class="actionbtn" data-school="' + id + '"' +
        (!option.available ? ' disabled' : '') + '>' + (cur ? '◉ ' : '○ ') +
        def.icon + ' ' + esc(dt(s, 'schooling', id, def, 'name')) +
        '<span class="adesc">' + esc(reason) +
        (warning ? '<br>' + esc(warning) : '') + '</span></button>';
    }
    const masterDef = FBDATA.schooling.master;
    const masterFee = (Number(masterDef && masterDef.cost) || 0) *
      FB.techCostFactor(s, 'training');
    const masterAvailability =
      FB.educationArrangementAvailability(s, c, 'master', focus);
    const masterOption = {
      available:masterAvailability.available,
      reason:masterAvailability.reason, schoolId:'master'
    };
    const masterAvailable = masterAvailability.available;
    for (const option of tutorOptions) {
      const cur = c.edu && String(c.edu.tutorId) === String(option.tutorId);
      h += personAssignmentCard({
        person:option.tutor,
        name:educationTutorOptionName(s, c, option),
        selected:cur,
        eligible:option.available || cur,
        eligibility:cur ? FB.T('Currently assigned') :
          (option.available ? FB.T('Eligible teacher') : optionLockReason(option)),
        data:{ tutor:option.tutorId },
        rows:[
          { label:'Expected learning', value:skillNote(option) },
          { label:'Cost / pay', value:option.fee
            ? FB.T('{money:amount} each season', { amount:option.fee })
            : FB.T('Free') },
          { label:'Occupation', value:FB.careerTitle(s, option.tutor) },
          { label:'Standing', value:standingText(FB.standingOf(s, {
            kind:'character', id:option.tutor.id
          })) },
          { label:'Current assignment', value:teachingAssignment(option.tutorId) },
          { label:'Consequence', kind:'consequence', value:cur
            ? FB.T('Keeps the current instruction.')
            : FB.T('Replaces {instruction} for {student}.', {
                instruction:instructionName(), student:c.name
              }) }
        ]
      });
    }
    if (currentSchool !== 'master') {
      const masterLock = optionLockReason(masterOption);
      h += '<button class="actionbtn" data-tutor="~hire"' +
        (!masterAvailable || s.player.gold < masterFee ? ' disabled' : '') +
        '>' + esc(FB.T('🎓 Hire a personal learned master ({money:amount} each season)', {
          amount:masterFee
        })) + '<span class="adesc">' +
        esc(masterLock || masterDescription()) + '</span></button>';
    }
    const homeSelected = !currentSchool && !(c.edu && c.edu.tutorId) &&
      c.edu && c.edu.policy && c.edu.policy.instructionChoice === 'home';
    const homeReason = optionLockReason(homeOption) ||
      FB.T('{chance}% yearly directed-learning chance.', {
        chance:Math.round(homeOption.chance * 100)
      });
    h += '<button class="actionbtn" data-tutor="~none"' +
      (!homeOption.available ? ' disabled' : '') + '>' +
      (homeSelected ? '◉ ' : '○ ') +
      esc(FB.T('Home instruction (free)')) + '<span class="adesc">' +
      esc(homeReason) + '</span></button>';
    h += '<button class="actionbtn" id="tut-follow-policy">' +
      '↻ ' +
      esc(FB.T('Follow household policy')) + '<span class="adesc">' +
      esc(policy.instructionMode === 'best'
        ? FB.T('Choose the strongest available instruction costing no more than {money:amount} each season.', {
            amount:policy.feeCap
          })
        : FB.T('The household currently leaves instruction for manual choice.')) +
      '</span></button>';
    h += '</div><button class="btn" id="tut-back">' + esc(FB.T('Back')) + '</button>';
    openModal(self ? FB.T('🧑‍🏫 Your schooling') :
      FB.T('🧑‍🏫 Instruction for {name}', { name: c.name }), h, {
        historyView:true,
        historyBackRender:function () {
          if (returnsToHouseholdPlan(returnContext)) UI.showHouseholdPlan();
          else UI.showCharModal(cid);
        }
      });
    FB.paintFaces($('gm-body'), s);
    document.querySelectorAll('[data-school]').forEach(function (b) {
      b.addEventListener('click', function () {
        const id = b.getAttribute('data-school');
        const selected = schoolOptions.filter(function (option) {
          return option.schoolId === id;
        })[0];
        if (!selected || !selected.available) return;
        c.edu = c.edu || {};
        c.edu.school = id;
        c.edu.tutorId = null;
        delete c.edu.schoolUnpaid;
        FB.markEducationManual(s, c, 'instruction', selected.id);
        FB.news(s, FB.msg('news.education.school_chosen', {
          forms: {
            select:'value', param:'subject', cases:{
              self:'🎓 You begin lessons at {school}.',
              other:'🎓 {name} begins lessons at {school}.'
            }
          }
        }, {
          subject:self ? 'self' : 'other', name:c.name,
          school:FB.dataParam('schooling', id)
        }));
        finishHouseholdPlanReturn(returnContext, function () {
          modalHistoryBack(function () { UI.showCharModal(cid); });
        });
      });
    });
    document.querySelectorAll('[data-tutor]').forEach(function (b) {
      b.addEventListener('click', function () {
        const v = b.getAttribute('data-tutor');
        c.edu = c.edu || {};
        if (v === '~none') {
          if (!homeOption.available) return;
          c.edu.tutorId = null;
          c.edu.school = null;
          delete c.edu.schoolUnpaid;
          FB.markEducationManual(s, c, 'instruction', 'home');
          FB.news(s, FB.msg('news.education.home_instruction', {
            forms: {
              select: 'value', param: 'subject', cases: {
                self: '🎓 You return to instruction at home.',
                other: '🎓 {name} returns to instruction at home.'
              }
            }
          }, { subject: self ? 'self' : 'other', name: c.name }));
        } else if (v === '~hire') {
          if (!masterAvailable || s.player.gold < masterFee) return;
          const pr = FB.world.byId[s.player.provinceId];
          const master = FB.makeCharacter(s, {
            culture: pr.culture, religion: pr.religion,
            born: s.date.year - FB.ri(35, 60), quality: 3, role: 'tutor'
          });
          master.epithetMsg = FB.msg('fx.epithet.hired_master', 'Hired master', {});
          if (focus) master.skills[focus] = Math.max(0, FB.ri(15, 18));
          else master.skills.lea = Math.max(0, FB.ri(11, 16));
          c.edu.tutorId = master.id;
          c.edu.school = 'master';
          delete c.edu.schoolUnpaid;
          FB.markEducationManual(s, c, 'instruction', 'tutor:' + master.id);
          FB.news(s, FB.msg('news.education.master_hired', {
            forms: {
              select: 'value', param: 'subject', cases: {
                self: '🎓 {tutor}, a learned master, takes charge of your education for a seasonal fee.',
                other:'🎓 {tutor}, a learned master, takes charge of {name}’s education for a seasonal fee.'
              }
            }
          }, { subject: self ? 'self' : 'other', tutor: master.name, name: c.name }));
        } else {
          const selected = tutorOptions.filter(function (option) {
            return String(option.tutorId) === String(v);
          })[0];
          if (!selected || !selected.available) return;
          c.edu.tutorId = v;
          c.edu.school = selected.schoolId || null;
          delete c.edu.schoolUnpaid;
          FB.markEducationManual(s, c, 'instruction', selected.id);
          FB.news(s, FB.msg('news.education.tutor_chosen', {
            forms: {
              select: 'value', param: 'case', cases: {
                player_self: '🎓 You take charge of {name}’s lessons.',
                named_self: '🎓 {tutor} takes charge of your lessons.',
                named_other: '🎓 {tutor} takes charge of {name}’s lessons.',
                other: '🎓 A tutor takes charge of {name}’s lessons.'
              }
            }
          }, {
            case: v === 'self' ? 'player_self' :
              (s.chars[v] ? (self ? 'named_self' : 'named_other') : 'other'),
            tutor: s.chars[v] ? s.chars[v].name : '',
            name: c.name
          }));
        }
        finishHouseholdPlanReturn(returnContext, function () {
          modalHistoryBack(function () { UI.showCharModal(cid); });
        });
      });
    });
    $('tut-follow-policy').addEventListener('click', function () {
      FB.followEducationPolicy(s, c, 'instruction');
      finishHouseholdPlanReturn(returnContext, function () {
        modalHistoryBack(function () { UI.showCharModal(cid); });
      });
    });
    $('tut-back').addEventListener('click', function () {
      finishHouseholdPlanReturn(returnContext, function () {
        modalHistoryBack(function () { UI.showCharModal(cid); });
      });
    });
  };

  /* ---------- name an heir ---------- */
  UI.showHeirPick = function () {
    const s = FB.state;
    if (!s) return;
    const heirs = FB.heirsOf(s).slice(0, 6);
    if (!heirs.length) {
      openModal('📜 Name Your Heir',
        '<div class="gm-body-text"><p>You have no living kin to name. Before a succession can be settled, an heir must exist.</p></div>' +
        '<button class="btn" id="hp-close">Close</button>');
      $('hp-close').addEventListener('click', UI.closeModal);
      return;
    }
    let h = '<div class="gm-body-text"><p>Who shall carry the name when you are gone? The choice, once witnessed, steadies the realm — and the family.</p></div><div class="gm-list">';
    for (const c of heirs) {
      const details = FB.T('Age {age} · {mar} {marValue} · {ste} {steValue} · {dip} {dipValue}', {
        age: FB.ageOf(c, s.date.year),
        mar: FB.skillName('mar'), marValue: FB.skillOf(c, 'mar'),
        ste: FB.skillName('ste'), steValue: FB.skillOf(c, 'ste'),
        dip: FB.skillName('dip'), dipValue: FB.skillOf(c, 'dip')
      });
      h += '<button class="actionbtn" data-namedheir="' + c.id + '">' + FB.faceTag(c, 32, 38) + ' ' +
        (s.player.namedHeirId === c.id ? '★ ' : '') + esc(FB.fullName(c)) +
        '<span class="adesc">' + esc(details) + '</span></button>';
    }
    h += '</div><button class="btn" id="hp-close">Decide later</button>';
    openModal('📜 Name Your Heir', h);
    FB.paintFaces($('gm-body'), s);
    document.querySelectorAll('[data-namedheir]').forEach(function (b) {
      b.addEventListener('click', function () {
        const c = s.chars[b.getAttribute('data-namedheir')];
        if (!c) return;
        s.player.namedHeirId = c.id;
        FB.applyEffects(s, { prestige: 8 });
        FB.news(s, FB.msg('news.life.heir_named',
          '📜 {name} is named heir before witnesses.', { name: FB.fullName(c) }));
        UI.closeModal();
      });
    });
    $('hp-close').addEventListener('click', UI.closeModal);
  };

  UI.showTraitModal = function (tid) {
    const t = FBDATA.traits[tid];
    if (!t) return;
    const s = FB.state;
    const traitName = dt(s, 'trait', tid, t, 'name');
    const traitDesc = dt(s, 'trait', tid, t, 'desc');
    let meta = kv('Class', esc(traitClassName(t)));
    if (t.earned) {
      meta += kv('Earned', esc(dt(s, 'trait', tid, t, 'earned')));
    }
    let fx = '';
    for (const k of FB.SKILLS) {
      if (t[k]) fx += '<div class="kv"><span>' + esc(FB.skillName(k)) + '</span><b>' +
        (t[k] > 0 ? '+' : '') + t[k] + '</b></div>';
    }
    if (t.health) fx += kv('Constitution', esc(FB.T(t.health > 0 ? 'hardier' : 'frailer')));
    if (t.fert && t.fert !== 1) {
      fx += kv('Fertility', esc(FB.T(t.fert > 1 ? 'higher' : 'lower')));
    }
    if (t.opinion) fx += kv('Others’ Standing', standingValue(t.opinion));
    if (t.opposite && FBDATA.traits[t.opposite]) {
      fx += kv('Opposite of', esc(dt(s, 'trait', t.opposite, FBDATA.traits[t.opposite], 'name')));
    }
    const grouped = traitGroupedEffects(t);
    for (const effect of grouped) fx += kv(effect.label, esc(effect.value));
    openModal(t.icon + ' ' + traitName,
      '<div class="gm-body-text"><p><i>' + esc(traitDesc) + '</i></p>' + meta +
      (fx || '<p class="hint">No lasting effects — only a story people tell about you.</p>') +
      '</div><button class="btn" id="tm-close">Close</button>');
    $('tm-close').addEventListener('click', UI.closeModal);
  };

  UI.showModifierModal = function (id, scope, pid) {
    const s = FB.state;
    const def = FBDATA.modifiers && FBDATA.modifiers[id];
    if (!s || !def) return;
    scope = scope === 'county' ? 'county' : 'campaign';
    const record = modifierRecord(s, id, scope, pid);
    if (!record) return;
    const name = dt(s, 'modifier', id, def, 'name');
    const desc = dt(s, 'modifier', id, def, 'desc');
    const effects = modifierEffectText(s, id);
    const duration = modifierDurationText(s, record, scope);
    let owner, effectScope, transfer;
    if (scope === 'county') {
      const province = FB.world.byId[pid];
      owner = province ? province.name : pid;
      effectScope = FB.T('County economy, levies, and local events');
      transfer = FB.T('Stays with the county when political control changes');
    } else {
      owner = FB.T('Your campaign service');
      effectScope = FB.T('Your participation in this great holy war');
      transfer = FB.T('Does not transfer to another campaign');
    }
    const h = '<div class="gm-body-text"><p><i>' + esc(desc) + '</i></p>' +
      assetEffectSummary({
        owner:owner,
        scope:effectScope,
        setupCost:FB.T('Granted by events or campaign state'),
        recurringCost:assetSeasonalMoneyCost(def.upkeep && def.upkeep.gold),
        effect:effects,
        transferRule:transfer,
        expiry:duration
      }) + '</div><button class="btn" id="mm-close">' +
      esc(FB.T('Close')) + '</button>';
    openModal(def.icon + ' ' + name, h);
    $('mm-close').addEventListener('click', UI.closeModal);
  };

  UI.showAilmentModal = function (aid) {
    const a = FBDATA.ailments[aid];
    const s = FB.state;
    const icon = a ? a.icon : '🤒';
    const name = a ? dt(s, 'ailment', aid, a, 'name') : FB.T('Ill');
    openModal(icon + ' ' + name,
      '<div class="gm-body-text"><p><i>' +
      esc(a ? dt(s, 'ailment', aid, a, 'desc') : FB.T('Sickness has taken hold.')) + '</i></p>' +
      '<p class="hint">' + esc(FB.T(!a || a.kind === 'sickness' ?
        'A sickness — it must run its course; rest and time are the only physic.' :
        'A wound — it knits as your strength returns, a year or so at most.')) +
      '</p></div><button class="btn" id="tm-close">Close</button>');
    $('tm-close').addEventListener('click', UI.closeModal);
  };

  /* tapped a topbar resource (the mobile path — desktop hovers): the same
     per-season source breakdown, as a small dismissable sheet */
  UI.showStatModal = function (stat) {
    const s = FB.state;
    if (!s || !s.player || s.player.dead) return;
    const me = s.chars[s.player.charId];
    const title = stat === 'gold' ? FB.T('💰 Money each season') :
      stat === 'prestige' ? FB.T('⭐ Prestige each season') :
      FB.religionOf(me.religion).icon + ' ' + FB.T('Piety each season');
    openModal(title, statBreakdownHtml(stat) +
      '<button class="btn" id="stat-close">Close</button>');
    $('stat-close').addEventListener('click', UI.closeModal);
  };

  /* ================= death & succession ================= */
  function legendQuipText(legend, state) {
    if (!legend) return '';
    if (legend.quipMsg) {
      return FB.renderMessage(legend.quipMsg, {
        state: state, viewer: state.player.charId
      });
    }
    return legend.quip || '';
  }

  function legendTitleText(legend) {
    if (!legend) return '';
    if (legend.titleData) return FB.renderTitleSnapshot(legend.titleData);
    return legend.title ? FB.L(legend.title) : '';
  }

  function deathProvenanceText(s, legend) {
    const prov = legend && legend.deathProvenance;
    if (!prov) return '';
    const province = prov.provinceId && FB.world.byId[prov.provinceId];
    const enemy = prov.enemyId && s.realms[prov.enemyId];
    if (prov.kind === 'battle' && province && enemy) {
      return FB.T('Fell in battle at {province} against {enemy}.', {
        province:province.name, enemy:enemy.name
      });
    }
    if (prov.kind === 'battle' && province) {
      return FB.T('Fell in battle at {province}.', { province:province.name });
    }
    if (prov.kind === 'battle' && enemy) {
      return FB.T('Fell in battle against {enemy}.', { enemy:enemy.name });
    }
    return province ? FB.T('The fatal event unfolded at {province}.', {
      province:province.name
    }) : '';
  }

  function wornAtDeathHtml(s, legend) {
    const loadout = legend && legend.loadout || {};
    const seen = {};
    let list = '';
    for (const slot of FB.ITEM_SLOTS) {
      const snap = loadout[slot];
      if (!snap || seen[snap.ref || snap.defId]) continue;
      seen[snap.ref || snap.defId] = 1;
      const item = FB.resolveItemSnapshot(snap);
      if (!item) continue;
      const slots = item.grip === 2 ? FB.T('Both hands') : itemSlotLabel(slot);
      list += '<div class="death-worn-row"><span>' + esc(slots) + '</span><b>' +
        item.def.icon + ' ' + esc(FB.itemNameFromSnapshot(s, s.player.charId, snap)) +
        '</b></div>';
    }
    if (!list) list = '<div class="cmeta">' + esc(FB.T('Nothing was worn.')) + '</div>';
    return '<div class="death-paper"><canvas id="death-paperdoll" class="paperdoll" ' +
      'width="240" height="450" role="img" aria-label="' +
      esc(FB.T('Final equipment worn by the deceased')) + '"></canvas>' +
      '<div class="death-worn"><h4>' + esc(FB.T('Worn at death')) + '</h4>' + list +
      '<p class="cmeta">' + esc(FB.T(
        'No object is lost. The outfit returns to the family armory at succession.')) +
      '</p></div></div>';
  }

  UI.showDeath = function (heirs, causeText) {
    const s = FB.state;
    const me = s.chars[s.player.charId];
    // G.die records the legend (and its parting quip) before opening this
    let h = '<div class="gm-body-text"><p>' + esc(causeText) + '</p>';
    const lg = s.legends && s.legends[s.legends.length - 1];
    const quip = lg && lg.id === me.id ? legendQuipText(lg, s) : '';
    if (quip) h += '<p><i>' + esc(quip) + '</i></p>';
    const provenance = lg && lg.id === me.id ? deathProvenanceText(s, lg) : '';
    if (provenance) h += '<p class="cmeta">' + esc(provenance) + '</p>';
    if (lg && lg.id === me.id) h += wornAtDeathHtml(s, lg);
    const debt = FB.financeActiveLoans ? FB.financeActiveLoans(s) : [];
    if (debt.length) {
      let due = 0;
      for (const loan of debt) due += FB.financeDueNow(s, loan);
      h += '<p class="op-bad"><b>' + esc(FB.T('Inherited debt:')) + '</b> ' +
        esc(financeDebtCountText(s, debt.length, financeAmount(due))) + '</p>';
    }
    /* noFocus: the choice of an heir must be deliberate — a Space/Enter meant
       for the pause key must not sign the succession for the first heir */
    if (heirs.length) {
      h += '<p>' + esc(FB.T('But a house is more than one life. Who carries the name onward?')) +
        '</p></div><div class="gm-list">';
      for (const c of heirs) {
        const details = FB.T('Age {age} · {mar} {marValue} · {ste} {steValue} · {dip} {dipValue}', {
          age: FB.ageOf(c, s.date.year),
          mar: FB.skillName('mar'), marValue: FB.skillOf(c, 'mar'),
          ste: FB.skillName('ste'), steValue: FB.skillOf(c, 'ste'),
          dip: FB.skillName('dip'), dipValue: FB.skillOf(c, 'dip')
        });
        h += '<button class="actionbtn" data-heir="' + c.id + '">' + FB.faceTag(c, 32, 38) + ' ' +
          esc(FB.fullName(c)) + '<span class="adesc">' + esc(details) + '</span></button>';
      }
      h += '</div>';
      openModal(FB.T('☠ {name} is Dead', { name: me.name }), h,
        { dismissable: false, noFocus: true });
      FB.paintFaces($('gm-body'), s);
      const deathDoll = $('death-paperdoll');
      if (deathDoll && lg && lg.loadout) {
        FB.paintPaperDoll(deathDoll, me, s, { loadout:lg.loadout });
      }
      document.querySelectorAll('[data-heir]').forEach(function (b) {
        b.addEventListener('click', function () {
          UI.closeModal();
          FB.game.succeedTo(b.dataset.heir);
        });
      });
    } else {
      h += '<p><b>' + esc(FB.T('There is no heir.')) + '</b> ' +
        esc(FB.T('The house of {dynasty} passes out of memory, as all things must.',
          { dynasty: me.dyn || me.name })) + '</p></div>';
      openModal('☠ The Line is Ended', h + '<button class="btn primary" id="gm-gameover">' +
        esc(FB.T('See the chronicle')) + '</button>', { dismissable: false, noFocus: true });
      const deathDoll = $('death-paperdoll');
      if (deathDoll && lg && lg.loadout) {
        FB.paintPaperDoll(deathDoll, me, s, { loadout:lg.loadout });
      }
      $('gm-gameover').addEventListener('click', function () {
        UI.closeModal(); UI.gameOver();
      });
    }
  };

  UI.gameOver = function () {
    const s = FB.state;
    const years = FB.campaignYears(s);
    const summary = FB.renderMessage(FB.msg('fx.gameover.summary', {
      forms: {
        select: 'plural', param: 'generations', cases: {
          one: 'Your saga spanned {years} years and {generations} generation.',
          other: 'Your saga spanned {years} years and {generations} generations.'
        }
      }
    }, { years: years, generations: s.generation || 1 }), {
      state: s, viewer: s.player.charId
    });
    const peakTitle = s.peakTitleData ? FB.renderTitleSnapshot(s.peakTitleData) :
      (s.peakTitle ? FB.L(s.peakTitle) : FB.stationName(s.peakTier || 0));
    let h = '<div class="gm-body-text">' +
      '<p>' + esc(summary) + '</p>' +
      kv('Highest rank attained', esc(peakTitle)) +
      kv('Final wealth', esc(FB.T('{money:amount}', { amount: s.player.gold }))) +
      kv('Prestige', Math.floor(s.player.prestige)) +
      kv('Piety', Math.floor(s.player.piety));
    if (s.legends && s.legends.length) {
      h += '<h4>' + esc(FB.T('Those who carried the name')) + '</h4>';
      for (const lg of s.legends) {
        const lc = s.chars[lg.id];
        const title = legendTitleText(lg);
        const legendQuip = legendQuipText(lg, s);
        h += '<div class="row gap" style="align-items:center;margin:6px 0">' +
          (lc ? FB.faceTag(lc, 32, 38) : '') +
          '<div style="flex:1"><b>' + esc(lg.name) + '</b> <span class="hint">' + esc(title) +
          ' · ' + lg.born + '–' + lg.died + '</span><br>' +
          '<span class="hint"><i>' + esc(legendQuip) + '</i></span></div></div>';
      }
    }
    h += '<h4>' + esc(FB.T('Last lines of the chronicle')) + '</h4>';
    for (let i = Math.max(0, s.log.length - 6); i < s.log.length; i++) {
      h += '<p>· ' + esc(FB.newsText(s.log[i], s, s.player.charId)) + '</p>';
    }
    h += '</div><div class="gm-footer"><button class="btn primary" id="gm-title-btn">' +
      esc(FB.T('Return to title')) + '</button></div>';
    openModal('The Chronicle Closes', h, { dismissable: false, modalClass: 'fullsheet-modal' });
    FB.paintFaces($('gm-body'), s);
    $('gm-title-btn').addEventListener('click', function () {
      UI.closeModal();
      FB.game.toTitle();
    });
  };

  /* ================= menu ================= */
  UI.showMenu = function () {
    const obs = FB.game.observe; // a watcher has no life to save, load, or mod
    let h = '<div class="gm-list">' +
      '<button class="actionbtn" id="m-resume">▶ Resume</button>' +
      (obs ? '' : '<button class="actionbtn" id="m-save">💾 Save game</button>') +
      (obs ? '' : '<button class="actionbtn" id="m-load">📂 Load game</button>') +
      '<button class="actionbtn" id="m-settings">⚙ Settings</button>' +
      '<button class="actionbtn" id="m-help">❓ How to play</button>' +
      (obs ? '' : '<button class="actionbtn" id="m-mods">🧩 Mods</button>') +
      '<button class="actionbtn" id="m-changes">📜 Changelog</button>' +
      '<button class="actionbtn" id="m-report">🐞 Report a bug</button>' +
      '<button class="actionbtn" id="m-quit">' +
      esc(FB.T(obs ? '🏳 Stop observing' : '🏳 Abandon to title')) + '</button>' +
      '</div>' +
      (FB.state && FB.state.seed ?
        '<div class="seedrow"><label for="m-seed">🔑 Start seed — tap to copy &amp; share</label>' +
        '<input id="m-seed" type="text" readonly value="' + esc(FB.state.seed) + '"></div>' : '') +
      '<div class="hint" style="text-align:center;margin:10px auto 0">v' + esc(FB.VERSION) + '</div>' +
      '<div class="gm-footer"><button class="btn primary" id="m-close">✕ Close</button></div>';
    openModal('Menu', h, { modalClass: 'fullsheet-modal' });
    $('m-resume').addEventListener('click', UI.closeModal);
    $('m-close').addEventListener('click', UI.closeModal);
    if (FB.state && FB.state.seed) {
      const inp = $('m-seed');
      inp.addEventListener('click', function () {
        inp.select();
        inp.setSelectionRange(0, 99999); // iOS ignores select() without this
        const done = function () { UI.toast('🔑 Seed copied — share it with a friend.'); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(inp.value).then(done, function () {
            document.execCommand('copy'); done(); // file:// and older browsers
          });
        } else { document.execCommand('copy'); done(); }
      });
    }
    if (!obs) {
      $('m-save').addEventListener('click', function () { UI.showSaveLoad(true); });
      $('m-load').addEventListener('click', function () { UI.showSaveLoad(false); });
      $('m-mods').addEventListener('click', function () { UI.showMods(); });
    }
    $('m-settings').addEventListener('click', function () { UI.showSettings(); });
    $('m-help').addEventListener('click', function () { UI.showHelp(); });
    $('m-changes').addEventListener('click', function () { UI.showChangelog(); });
    $('m-report').addEventListener('click', function () { UI.showReport(); });
    $('m-quit').addEventListener('click', function () {
      UI.closeModal(); FB.game.toTitle();
    });
  };

  function langSelector() {
    const locs = FB.availableLocales();
    let opts = '';
    for (const loc of locs) {
      const status = loc.status === 'preview' ? ' — ' + FB.T('Preview') : '';
      opts += '<option value="' + esc(loc.code) + '"' + (loc.code === FB.locale ? ' selected' : '') + '>' +
        esc(loc.name + status) + '</option>';
    }
    return '<div class="gm-body-text" style="margin-top:8px"><p>' + esc(FB.T('Language')) + '</p></div>' +
      '<select id="set-lang" class="setlang">' + opts + '</select>' +
      '<p class="hint">' +
      esc(FB.T('French, German, Italian, and Spanish are AI-generated Preview translations and may contain errors.')) +
      '</p>';
  }

  /* ================= settings ================= */
  UI.showSettings = function () {
    const G = FB.game;
    const WORDS = ['slowest', 'slow', 'the default', 'fast', 'fastest'];
    let h = '<div class="gm-body-text"><p>' + (FB.isTouch
      ? esc(FB.T('How quickly the days flow while time runs.'))
      : esc(FB.T('How quickly the days flow while time runs — on a keyboard, −/+ change it at any time.'))) +
      '</p></div>';
    h += '<div class="speedrow"><input type="range" id="set-speed" min="0" max="' +
      (G.SPEEDS.length - 1) + '" step="1" value="' + G.speedIdx + '" aria-label="' +
      esc(FB.T('Speed of days')) + '">' +
      '<div class="adesc" id="set-speed-label">' + speedLabel(G.speedIdx) + '</div></div>';
    h += '<div class="gm-body-text" style="margin-top:8px"><p>' +
      esc(FB.T('Deeds panel')) + '</p></div>' +
      '<label class="autorow"><input type="checkbox" id="set-combined-focuses"' +
      (G.uiPrefs.combinedFocuses ? ' checked' : '') + '> <b>' +
      esc(FB.T('Keep daily focuses together')) + '</b><span class="adesc">' +
      esc(FB.T('Show all daily focuses before the category groups; deeds remain grouped.')) +
      '</span></label>' +
      '<label class="autorow"><input type="checkbox" id="set-hide-commitments"' +
      (G.uiPrefs.hideOngoingCommitments ? ' checked' : '') + '> <b>' +
      esc(FB.T('Hide ongoing commitments')) + '</b><span class="adesc">' +
      esc(FB.T('Remove the ongoing commitments ledger from the Deeds panel.')) +
      '</span></label>';
    if (G.observe) { // watcher comforts: quiet toasts, or no panel at all
      h += '<div class="gm-body-text" style="margin-top:8px"><p>While observing:</p></div>' +
        '<label class="autorow"><input type="checkbox" id="set-obsquiet"' + (G.obsQuiet ? ' checked' : '') + '> ' +
        '<b>Silence the news toasts</b><span class="adesc">Happenings still fill the chronicle; the popups stay off the map.</span></label>' +
        '<label class="autorow"><input type="checkbox" id="set-obsbare"' + (G.obsBare ? ' checked' : '') + '> ' +
        '<b>Hide the Land & Chronicle panel</b><span class="adesc">Only the map and the flow of days remain.</span></label>';
    }
    h += langSelector();
    h += '<button class="btn" id="gm-back">Back</button>';
    openModal('Settings', h, { historyView:true });
    function speedLabel(i) {
      return FB.T('Speed {current} / {total} — {description}', {
        current: i + 1,
        total: G.SPEEDS.length,
        description: WORDS[i] ? FB.T(WORDS[i]) : ''
      });
    }
    const slider = $('set-speed');
    slider.addEventListener('input', function () { // live label while dragging
      $('set-speed-label').textContent = speedLabel(parseInt(slider.value, 10));
    });
    slider.addEventListener('change', function () { // commit once, on release
      G.setSpeed(parseInt(slider.value, 10) - G.speedIdx);
    });
    $('set-combined-focuses').addEventListener('change', function () {
      G.uiPrefs.combinedFocuses = $('set-combined-focuses').checked;
      G.saveUiPrefs();
      if (FB.state && !G.observe) renderActions();
    });
    $('set-hide-commitments').addEventListener('change', function () {
      G.uiPrefs.hideOngoingCommitments = $('set-hide-commitments').checked;
      G.saveUiPrefs();
      if (FB.state && !G.observe) renderActions();
    });
    if (G.observe) {
      $('set-obsquiet').addEventListener('change', function () { G.obsQuiet = $('set-obsquiet').checked; });
      $('set-obsbare').addEventListener('change', function () {
        G.obsBare = $('set-obsbare').checked;
        document.body.classList.toggle('obshidepanel', G.obsBare);
        FB.map.resize(); // the freed space belongs to the map
      });
    }
    const langSel = $('set-lang');
    if (langSel) {
      langSel.addEventListener('change', function () {
        FB.setLocale(langSel.value);
      });
    }
    $('gm-back').addEventListener('click', function () {
      modalHistoryBack(function () { if (FB.state) UI.showMenu(); else UI.closeModal(); });
    });
  };

  UI.showSaveLoad = function (saving) {
    let h = '<div class="gm-list">';
    for (let i = 1; i <= 3; i++) {
      const d = FB.save.read(i); // one parse per slot: late saves are large
      const meta = FB.save.metaOf(d);
      const other = !saving && meta && FB.save.otherWorld(d);
      const description = other
        ? FB.T('{save} · 🧩 another world — its mods are not the ones active now',
          { save: meta })
        : (meta || FB.T('Empty'));
      h += '<button class="actionbtn" data-slot="' + i + '">' +
        esc(FB.T(saving ? '💾 Save to slot {slot}' : '📂 Load slot {slot}', { slot: i })) +
        '<span class="adesc">' + esc(description) + '</span></button>';
    }
    // a life as text outlives a browser that forgets its storage
    h += saving ?
      '<button class="actionbtn" id="sl-export">📤 Export this life' +
      '<span class="adesc">copy it as text — safe if this browser wipes its saves, or to move devices</span></button>' :
      '<button class="actionbtn" id="sl-import">📥 Import a life' +
      '<span class="adesc">paste back an exported save text</span></button>';
    h += '</div>';
    if (!FB.save.available) {
      h += '<div class="hint" style="text-align:center;margin:8px auto 0">⚠ This browser is blocking save storage — slots may vanish. Export keeps a life as text.</div>';
    }
    h += '<button class="btn" id="gm-back">Back</button>';
    openModal(saving ? 'Save Game' : 'Load Game', h, { historyView:true });
    document.querySelectorAll('[data-slot]').forEach(function (b) {
      b.addEventListener('click', function () {
        const n = parseInt(b.dataset.slot, 10);
        if (saving) {
          if (FB.save.toSlot(n)) { UI.toast('Saved to slot {slot}.', { slot: n }); UI.closeModal(); }
        }
        else {
          if (FB.save.slotMeta(n)) { UI.closeModal(); FB.game.loadSlot(n); }
        }
      });
    });
    if (saving) $('sl-export').addEventListener('click', UI.showExport);
    else $('sl-import').addEventListener('click', UI.showImport);
    $('gm-back').addEventListener('click', function () {
      modalHistoryBack(function () { if (FB.state) UI.showMenu(); else UI.closeModal(); });
    });
  };

  /* a life as copyable text — the escape hatch for browsers that wipe
     localStorage (iPhone in-app webviews, iframe-blocked storage) and the
     way to move a life between devices */
  UI.showExport = function () {
    openModal('Export Save',
      '<div class="gm-body-text"><p>This text <b>is</b> your current life. Copy it somewhere safe — a note, an email to yourself — then paste it back with 📥 Import on any device or browser. It is long; that is normal.</p></div>' +
      '<textarea id="sl-xtext" class="savetext" readonly rows="6"></textarea>' +
      '<div class="gm-list"><button class="actionbtn" id="sl-xcopy">📋 Copy to clipboard</button></div>' +
      '<button class="btn" id="gm-back">Back</button>', { historyView:true });
    const ta = $('sl-xtext');
    ta.value = FB.save.exportState();
    $('sl-xcopy').addEventListener('click', function () {
      ta.select();
      ta.setSelectionRange(0, 9999999); // iOS ignores select() without this
      const done = function () { UI.toast('📋 Save text copied — keep it somewhere safe.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ta.value).then(done, function () {
          document.execCommand('copy'); done(); // file:// and older browsers
        });
      } else { document.execCommand('copy'); done(); }
    });
    $('gm-back').addEventListener('click', function () {
      modalHistoryBack(function () { UI.showSaveLoad(true); });
    });
  };

  UI.showImport = function () {
    openModal('Import Save',
      '<div class="gm-body-text"><p>Paste an exported save text below, then load it. The life wakes where it left off — and lands in the autosave slot too.</p></div>' +
      '<textarea id="sl-itext" class="savetext" rows="6" placeholder="FBS1.…"></textarea>' +
      '<div class="gm-list"><button class="actionbtn" id="sl-iload">📥 Load this life</button></div>' +
      '<button class="btn" id="gm-back">Back</button>', { historyView:true });
    $('sl-iload').addEventListener('click', function () {
      const data = FB.save.parseExport($('sl-itext').value);
      if (!data) { UI.toast('That text is not a Fallowborn save.'); return; }
      if (FB.game.loadData(data, function () {
        FB.save.autosave(); // plant the imported life after its world has activated
      })) {
        UI.closeModal();
      }
    });
    $('gm-back').addEventListener('click', function () {
      modalHistoryBack(function () { UI.showSaveLoad(false); });
    });
  };

  /* a bug or idea as copyable text — the player’s words bundled with everything
     needed to reproduce it: game version, start seed, mod set, and the current
     life as save text (the same FBS1. blob Import wakes). There is no server to
     send it to; the player pastes it on Discord, in an email, or as a GitHub
     issue. A watcher has no life to attach, so observe mode skips the save. */
  UI.showReport = function () {
    const withLife = FB.state && !FB.game.observe;
    const h = '<div class="gm-body-text"><p>' +
      'Describe the bug or your idea, then <b>📋 Copy report</b> — it bundles your words with the game version' +
      (withLife ? ', your start seed, and your current life as save text, so the exact moment can be reopened' : '') +
      '.</p></div>' +
      '<select id="rp-type" class="setlang">' +
      '<option value="Bug">🐞 Bug — something went wrong</option>' +
      '<option value="Suggestion">💡 Suggestion — an idea for the game</option>' +
      '</select>' +
      '<textarea id="rp-text" class="savetext" rows="5" placeholder="What happened? What did you expect to happen?"></textarea>' +
      '<div class="gm-list" style="margin-top:8px">' +
      '<button class="actionbtn" id="rp-copy">📋 Copy report' +
      '<span class="adesc">' +
      (withLife ? 'your message + game version, start seed &amp; your current life as save text' :
        'your message + game version') +
      '</span></button>' +
      '</div>' +
      '<div class="gm-body-text"><p>Then paste it in any of these places:</p></div>' +
      '<div class="gm-list">' +
      '<a class="actionbtn" href="https://discord.gg/G8E67hY2pj" target="_blank" rel="noopener">💬 Discord' +
      '<span class="adesc">discord.gg/G8E67hY2pj — the quickest answer</span></a>' +
      '<a class="actionbtn" href="mailto:hello@fallowborn.com">✉ Email' +
      '<span class="adesc">hello@fallowborn.com</span></a>' +
      '<a class="actionbtn" href="https://github.com/dli9431/fallowborn/issues" target="_blank" rel="noopener">🐙 GitHub Issues' +
      '<span class="adesc">watch it get fixed</span></a>' +
      '</div>' +
      '<button class="btn" id="gm-back">Back</button>';
    openModal('Report a Bug', h, { historyView:true });
    $('rp-copy').addEventListener('click', function () {
      const msg = $('rp-text').value.trim();
      if (!msg) { UI.toast('Write a line about the bug or idea first.'); $('rp-text').focus(); return; }
      let report = $('rp-type').value + ' — Fallowborn v' + FB.VERSION + '\n\n' + msg + '\n\n---\n';
      if (FB.state && FB.state.seed) report += 'Start seed: ' + FB.state.seed + '\n';
      report += 'Mods: ' + (FB.mods.sig() || 'none (vanilla)') + '\n';
      if (withLife) {
        report += 'Save (Menu → Load game → 📥 Import wakes this exact moment):\n' +
          FB.save.exportState() + '\n';
      }
      const done = function () { UI.toast('📋 Report copied — paste it on Discord, in an email, or a GitHub issue.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(report).then(done, function () {
          legacyCopy(report); done(); // file:// and older browsers
        });
      } else { legacyCopy(report); done(); }
    });
    /* execCommand fallback needs a selectable element — the report lives in no
       visible textarea, so lend it a temporary one */
    function legacyCopy(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, 99999999); // iOS ignores select() without this
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    $('gm-back').addEventListener('click', function () {
      modalHistoryBack(function () { if (FB.state) UI.showMenu(); else UI.closeModal(); });
    });
  };

  UI.showHelp = function () {
    openModal('How to Play', '<div class="gm-body-text">' +
      '<p><b>Fallowborn</b> is a life-and-dynasty game. You begin in an authored medieval world — most likely poor — and try to raise your family through the ranks of society before old age claims each generation.</p>' +
      '<h4>Day by day</h4><ul>' +
      '<li>Set a <b>focus</b> in the Deeds tab — it is pursued every day until you change it (work the land, drill, haggle, pray, court…).</li>' +
      '<li><b>Deeds</b> are one-shot acts (poach, scheme, propose, petitions…) — each spends the day, and some need time before they can be repeated.</li>' +
      '<li>Press <b>Space</b> (or the Play/Pause button) to set time flowing — days pass on their own — and press it again to pause. <b>F</b> (or ▶▶) skips straight to the next happening. Events halt the days while they await your choice.</li></ul>' +
      '<h4>Climbing the ladder</h4>' +
      '<p>Serf → Freeholder → Gentry → Baron → Count → Duke → King → Emperor. The Deeds tab always shows a hint for your next step. Wealth, prestige, Standing with your lord, marriage, war-glory, or the church can all raise you.</p>' +
      '<h4>Dynasty</h4>' +
      '<p>Marry and raise children. When you die, you continue as your heir. No heir — no story. Ruler sheets show royal families and their designated successor. Courting a ruler’s child creates a dynastic tie; the crown passes only through the designated heir’s branch. A royal spouse may reign before your shared child becomes the protagonist, and only then do the realms join.</p>' +
      '<p>Open a child’s sheet (Kin tab) to choose an <b>education focus</b>, then arrange home lessons, school, or a tutor. Every option shows its yearly learning chance; schools and personal masters charge each season, while a named tutor’s own skill and habits shape the child. Gentry households with Scholarly Networks can use the costly Noble Academy: it teaches every focus and opens noble connections, but each completed term adds fatality risk at New Year. A Learning education grants literacy at 16.</p>' +
      '<p>Resident spouses and unmarried children add provisions and quarters to seasonal household upkeep. Working family members can offset that cost with wages or enterprise income.</p>' +
      '<h4>Guild monopoly charters</h4>' +
      '<p>Once the sovereign nation completes <b>Guild Charters</b>, a Craft or Trade guildmaster with 60 guild standing and 40 Standing with the grantor may petition the local lord—or a landed vassal’s direct liege—for a profession-wide monopoly. Baron and greater rulers may instead grant one local Craft or Trade monopoly from <b>Rank &amp; Realm</b>. Incoming and outgoing charters can coexist; matching enterprise bonuses add together up to +50%. See their exact terms and remaining days in <b>Network → Trade &amp; Guild</b>. Charters cannot be renewed or revoked early.</p>' +
      '<h4>Rivalries</h4>' +
      '<p>Named characters remember hostile encounters. If their Standing falls far enough, they may declare you a rival. Feud heat rises through insults and schemes, opening the way to claims and knives; restraint, common cause, compensation, mediation, witnessed oaths, or a duel can cool or end it. An heir chooses whether to inherit an old quarrel.</p>' +
      '<h4>De jure</h4>' +
      '<p>Every county belongs by ancient right to a duchy, a kingdom, and an empire — its <b>de jure</b> titles. Hold the majority of a title’s counties and you can claim that title for yourself. See the <b>De jure</b> row on any province, and the 🗺 map filters (<b>R</b>).</p>' +
      '<h4>The map</h4>' +
      '<p>Drag to pan; scroll, pinch, or <b>PgUp</b>/<b>PgDn</b> to zoom; tap a province for details. County names appear as you zoom in. Realms wage their own wars; borders shift with the decades.</p>' +
      '<h4>Mobile navigation</h4>' +
      '<p>On a phone, the browser or device Back control steps out of equipment choices, dialogs, and the Self/Kin drawer. It never undoes a decision that changed the game.</p>' +
      '<h4>Map filters</h4>' +
      '<p>The 🗺 button (or <b>R</b>) cycles five ways to color the map: <b>realm</b>, <b>mine</b>, <b>liege</b>, <b>de jure duchies</b>, and <b>de jure kingdoms</b>.</p>' +
      '<h4>War</h4>' +
      '<p>From baron upward the Deeds tab always shows <b>⚔ Declare war</b>, with the exact reason when it is locked. A county war requires a bordering <b>de jure right</b> through a duchy, kingdom, or empire you hold, or your one <b>fabricated claim</b> (made through a plot). A rare crown-restoration right reaches the usurper’s capital without a shared border. Pacts and defensive alliances forbid attacks. Your host musters when war begins — tap it, then a province to march (or let ⚙ automation command it). You may de-muster a raised host from the Deeds tab: the men preserved for your next muster depend on where it stands — all on your own land, half elsewhere in your realm, none abroad — and re-mustering waits out the same rearm window as a shattering. <b>Land is taken only by siege:</b> stand on the prize and press the siege at three war councils. Allies send abstract defenders only when you are attacked; they never become separate war participants. Field victories make the enemy sue for peace. Attacked yourself? Keep their host out of your lands — three seasons unchecked and a province falls. Past eight seasons, exhaustion ends the war with nothing gained.</p>' +
      '<p><b>Great holy wars</b> are global two-camp campaigns called by an active Pope or Caliph after their historical unlock. Freeholders and greater ranks may answer during the 180-day gathering, promise one to three years of service, and name a hoped-for crown, sacred custody, exact duchy or county, beneficiary, or honor. Sovereigns field their own host, while vassals and unlanded volunteers serve through expedition events. Attackers must occupy the sacred places, at least half the target counties, and 60% of its development before the eight-year deadline. After an attacker victory, a settlement council weighs contribution beside the vow, occupation, rights, local support, and religious standing before any land changes hands.</p>' +
      '<h4>Keyboard (desktop)</h4>' +
      '<p><b>Arrows</b> pan the map · <b>Shift+arrows</b> hop between neighboring provinces · <b>PgUp/PgDn</b> zoom · <b>H</b> center home · <b>Enter</b> select the province at screen center.</p>' +
      '<p><b>Space</b> plays / pauses the flow of days · <b>−</b>/<b>+</b> slow and quicken the days (also in menu → Settings) · <b>F</b> skips to the next happening (and pauses) · <b>D S K L C</b> open the Deeds / Self / Kin / Land / Chronicle panels · <b>1–9</b> choose focuses, deeds, event options, and dialog items · <b>[</b> and <b>]</b> cycle panels · <b>Esc</b> menu / back / close · <b>Tab</b> moves between buttons.</p>' +
      '<h4>Saving</h4><p>The game autosaves each spring. Manual slots live in the menu, beside 📤 Export / 📥 Import — a life kept as text survives browsers that wipe their storage, and travels to other devices.</p>' +
      '</div><button class="btn primary" id="gm-ok">Close</button>',
      { historyView:true });
    $('gm-ok').addEventListener('click', function () {
      modalHistoryBack(function () { if (FB.state) UI.showMenu(); else UI.closeModal(); });
    });
  };

  UI.showChangelog = function () {
    let h = '<div class="gm-body-text" data-i18n-ignore>';
    for (const rel of FB.CHANGELOG) {
      h += '<h4>v' + esc(rel.v) + (rel.date ? ' &mdash; ' + esc(rel.date) : '') + '</h4><ul>';
      for (const c of rel.changes) h += '<li>' + esc(c) + '</li>';
      h += '</ul>';
    }
    h += '</div><div class="gm-footer"><button class="btn primary" id="gm-ok">Close</button></div>';
    openModal('Changelog', h, {
      modalClass:'changelog-modal',
      historyView:true
    });
    $('gm-ok').addEventListener('click', function () {
      modalHistoryBack(function () { if (FB.state) UI.showMenu(); else UI.closeModal(); });
    });
  };

  UI.showMods = function () {
    const bundled = FB.mods.bundled();
    const mods = FB.mods.list();
    let h = '';
    if (bundled.length) {
      h += '<div class="gm-body-text"><p><b>Bundled mods</b> — enabling or disabling reloads the game; start a new life afterwards.</p></div>';
      bundled.forEach(function (mod, i) {
        const on = FB.mods.isEnabled(mod.id);
        h += '<div class="row gap" style="align-items:center;margin:6px 0">' +
          '<div style="flex:1" data-i18n-ignore><b>' + esc(mod.name) + '</b>' +
          (mod.desc ? '<br><span class="hint">' + esc(mod.desc) + '</span>' : '') +
          '</div>' +
          '<button class="btn ' + (on ? '' : 'primary') + '" id="mod-bundled-' + i + '">' + (on ? 'Disable' : 'Enable') + '</button></div>';
      });
    }
    h += '<div class="gm-body-text">' +
      '<p>Mods are JSON files merged over the game data (events, provinces, realms, cultures, traits, currency, balance). See <b>docs/MODDING.md</b> in the game folder for the format. You can also edit the files in <b>data/</b> directly.</p>' +
      '<p>Mods stay on until removed, and saves remember their world — a life begun with a mod continues only while that mod is active.</p></div>' +
      (FB.mods.currencyInvalid && FB.mods.currencyInvalid()
        ? '<div class="progressnote warnote">' +
          esc(FB.T('An active mod has an invalid currency definition. The default currency is being used.')) +
          '</div>'
        : '') +
      panelh('Active mods');
    if (mods.length) {
      for (let i = 0; i < mods.length; i++) {
        h += '<div class="modrow"><span data-i18n-ignore>🧩 ' + esc(mods[i].name) + '</span>' +
          ' <span class="cmeta">(' + mods[i].kb + ' kB)</span>' +
          '<button class="btn small danger" data-unmod="' + i + '">Remove</button></div>';
      }
    } else {
      h += '<p class="cmeta" style="font-size:13px;margin:4px 0">None — no JSON mods applied.</p>';
    }
    h += panelh('Add a mod') +
      '<p style="margin:8px 0"><input type="file" id="modfile" accept=".json"></p>' +
      '<textarea class="modjson" id="modpaste" placeholder="' +
      esc(FB.T('Or paste mod JSON here, e.g. {example}',
        { example: '{"events":[...]}' })) + '"></textarea>' +
      '<div class="row gap wrap" style="margin-top:8px">' +
      '<button class="btn primary" id="mod-apply">Apply &amp; reload</button>' +
      (mods.length || bundled.some(function (m) { return FB.mods.isEnabled(m.id); }) ? '<button class="btn danger" id="mod-clear">Remove all mods</button>' : '') +
      '<button class="btn" id="gm-ok2">Close</button></div>' +
      '<p class="hint" style="margin-top:8px">Re-applying a mod of the same name replaces it. Adding or removing reloads the page.</p>';
    openModal('Mods', h, { historyView:true });
    bundled.forEach(function (mod, i) {
      $('mod-bundled-' + i).addEventListener('click', function () { FB.mods.toggle(mod.id); });
    });
    document.querySelectorAll('[data-unmod]').forEach(function (b) {
      b.addEventListener('click', function () { FB.mods.removeAt(parseInt(b.dataset.unmod, 10)); });
    });
    $('mod-apply').addEventListener('click', function () {
      const f = $('modfile').files[0];
      const pasted = $('modpaste').value.trim();
      if (f) {
        const rd = new FileReader();
        rd.onload = function () { FB.mods.store(rd.result); };
        rd.readAsText(f);
      } else if (pasted) {
        FB.mods.store(pasted);
      } else UI.toast('Choose a file or paste JSON first.');
    });
    const mc = $('mod-clear');
    if (mc) mc.addEventListener('click', function () { FB.mods.clear(); });
    $('gm-ok2').addEventListener('click', function () {
      modalHistoryBack(function () { if (FB.state) UI.showMenu(); else UI.closeModal(); });
    });
  };

  /* ================= boot-time wiring ================= */
  UI.wire = function () {
    FB.fx.on(function (intent) {
      if (intent.kind !== 'toast') return;
      if (FB.game.observe && FB.game.obsQuiet) return;
      UI.toastMessage(intent.message, intent.legacyText);
    });
    document.querySelectorAll('#sidetabs .tab[data-tab], #lefttabs .tab[data-tab]').forEach(function (t) {
      t.addEventListener('click', function () { setTab(t.dataset.tab); });
    });
    // the topbar portrait opens your own sheet (a drawer on phones)
    $('tb-portrait').addEventListener('click', function () {
      if (FB.state) UI.showTab('char');
    });
    $('btn-closeself').addEventListener('click', closeSelfDrawer);
    window.addEventListener('popstate', mobileNavPop);
    if (!FB.isTouch) {
      const hot = {
        actions: { key: 'D', label: 'Deeds' },
        char: { key: 'S', label: 'Self' },
        family: { key: 'K', label: 'Kin' },
        prov: { key: 'L', label: 'Land' },
        network: { key: 'N', label: 'Network' },
        log: { key: 'C', label: 'Chronicle' }
      };
      document.querySelectorAll('#sidetabs .tab, #lefttabs .tab').forEach(function (t) {
        const item = hot[t.dataset.tab];
        if (item) {
          const label = FB.T(item.label);
          const keyAt = label.toUpperCase().indexOf(item.key);
          const before = keyAt >= 0 ? label.slice(0, keyAt) : '';
          const after = keyAt >= 0 ? label.slice(keyAt + 1) : label;
          t.setAttribute('aria-label', label);
          t.innerHTML = '<span class="tabfulllabel">' + esc(label) + '</span>' +
            '<span class="tabhotkeylabel" aria-hidden="true">' + esc(before) +
            '<span class="keyhint tabkeyhint">' + item.key + '</span>' +
            esc(after) + '</span>';
        }
      });
    }
    $('btn-endturn').addEventListener('click', function () {
      if (!UI.eventsBusy()) FB.game.togglePause();
    });
    $('btn-skip').addEventListener('click', function () {
      if (!UI.eventsBusy()) { FB.game.setPaused(true); FB.game.skipAhead(); }
    });
    $('btn-auto').addEventListener('click', function () {
      if (!UI.eventsBusy()) UI.showAutoResolve();
    });
    $('btn-menu').addEventListener('click', UI.showMenu);
    $('btn-zoomin').addEventListener('click', function () { FB.map.zoomIn(); });
    $('btn-zoomout').addEventListener('click', function () { FB.map.zoomOut(); });
    $('btn-home').addEventListener('click', function () {
      if (!FB.state) return;
      if (FB.game.observe) FB.map.fitView(); // no home — show the whole board
      else FB.map.centerOn(FB.state.player.provinceId, 2.2);
    });
    $('btn-mapmode').addEventListener('click', UI.cycleMapMode);
    $('travel-picker-cancel').addEventListener('click', function () {
      UI.cancelTravelPicker(false);
    });
    $('travel-picker-continue').addEventListener('click', reviewTravelChoice);
    FB.map.onTap = function (pr, wx, wy) {
      if (FB.game.pickMode) { FB.game.pickProvince(pr); return; }
      if (UI.travelPickerOpen()) {
        if (pr) UI.travelPickProvince(pr.id, false);
        return;
      }
      const s = FB.state;
      // armies first: select your host, or march the selected host somewhere
      if (s && FB.armyTap && FB.armyTap(s, pr, wx, wy)) return;
      if (pr) UI.selectProvince(pr.id);
    };
    // click any character row → their sheet; any trait chip → its meaning;
    // item chips open the item card (a toast while an event holds the stage);
    // a liege link opens the liege's sheet
    document.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;
      // a topbar resource opens its per-season source breakdown (tap path;
      // desktop also gets it on click, and keyboard Enter/Space clicks natively)
      const statBtn = e.target.closest('#tb-stats .stat[data-stat]');
      if (statBtn && FB.state && !FB.game.observe && !UI.eventsBusy()) {
        UI.showStatModal(statBtn.getAttribute('data-stat'));
        return;
      }
      const lnk = e.target.closest('[data-liege]');
      if (lnk && FB.state && !UI.eventsBusy()) { UI.showLiegeModal(lnk.getAttribute('data-liege')); return; }
      const modifierChip = e.target.closest('.modifierchip[data-modifier]');
      if (modifierChip && FB.state) {
        UI.showModifierModal(
          modifierChip.getAttribute('data-modifier'),
          modifierChip.getAttribute('data-modifier-scope'),
          modifierChip.getAttribute('data-modifier-pid')
        );
        return;
      }
      const chip = e.target.closest('.traitchip[data-trait], .traitchip[data-ailment]');
      if (chip) {
        if (chip.hasAttribute('data-ailment')) UI.showAilmentModal(chip.getAttribute('data-ailment'));
        else UI.showTraitModal(chip.getAttribute('data-trait'));
        return;
      }
      const ichip = e.target.closest('.traitchip[data-item], .traitchip[data-itemview]');
      if (ichip && FB.state) {
        const iid = ichip.getAttribute('data-item') || ichip.getAttribute('data-itemview');
        const item = FB.resolveItem(FB.state, iid);
        if (item && UI.eventsBusy()) {
          UI.toastMessage(null, item.def.icon + ' ' + FB.itemName(FB.state, iid) + ' — ' +
            dt(FB.state, 'item', item.defId, item.def, 'desc'));
        } else if (item) {
          UI.showItemModal(iid, !ichip.hasAttribute('data-item'));
        }
        return;
      }
      const row = e.target.closest('.charrow[data-cid], .charcard[data-cid], .ftchip[data-cid]');
      if (row && FB.state && !UI.eventsBusy()) UI.showCharModal(row.getAttribute('data-cid'));
    });
    // clicking the dark backdrop closes a dismissable dialog
    $('genmodal').addEventListener('click', function (e) {
      if (e.target === this && UI._gmDismiss) UI.closeModal();
    });
    // instant hover tooltip for the topbar resources and trait/item chips (desktop)
    if (!FB.isTouch) {
      const tip = document.createElement('div');
      tip.id = 'tooltip';
      tip.className = 'hidden';
      document.body.appendChild(tip);
      document.addEventListener('mouseover', function (e) {
        if (!e.target || !e.target.closest) { tip.classList.add('hidden'); return; }
        // hovering a topbar resource shows what feeds it, season by season
        const statEl = e.target.closest('#tb-stats .stat[data-stat]');
        if (statEl && FB.state && !FB.game.observe) {
          tip.innerHTML = statBreakdownHtml(statEl.getAttribute('data-stat'));
          tip.classList.remove('hidden');
          const sr = statEl.getBoundingClientRect();
          tip.style.left = Math.max(4, Math.min(window.innerWidth - 250, sr.left)) + 'px';
          tip.style.top = Math.min(window.innerHeight - 110, sr.bottom + 6) + 'px';
          return;
        }
        const chip = e.target.closest('.traitchip[data-trait], .traitchip[data-ailment], .traitchip[data-item], .traitchip[data-itemview], .modifierchip[data-modifier]');
        if (!chip) { tip.classList.add('hidden'); return; }
        if (chip.hasAttribute('data-modifier')) {
          const id = chip.getAttribute('data-modifier');
          const scope = chip.getAttribute('data-modifier-scope') === 'county'
            ? 'county' : 'campaign';
          const pid = chip.getAttribute('data-modifier-pid');
          const def = FBDATA.modifiers && FBDATA.modifiers[id];
          const record = FB.state && modifierRecord(FB.state, id, scope, pid);
          if (!def || !record) { tip.classList.add('hidden'); return; }
          const effects = modifierEffectText(FB.state, id);
          const upkeep = def.upkeep && def.upkeep.gold
            ? assetSeasonalMoneyCost(def.upkeep.gold) : '';
          tip.innerHTML = '<b>' + def.icon + ' ' +
            esc(dt(FB.state, 'modifier', id, def, 'name')) + '</b><br>' +
            esc(dt(FB.state, 'modifier', id, def, 'desc')) +
            (effects || upkeep ? '<br><i>' +
              esc([effects, upkeep].filter(function (part) {
                return !!part;
              }).join(' · ')) + '</i>' : '') +
            '<br><i>' + esc(modifierDurationText(FB.state, record, scope)) + '</i>';
        } else if (chip.hasAttribute('data-ailment')) {
          const a = FBDATA.ailments[chip.getAttribute('data-ailment')];
          const aid = chip.getAttribute('data-ailment');
          tip.innerHTML = a ? '<b>' + a.icon + ' ' + esc(dt(FB.state, 'ailment', aid, a, 'name')) +
            '</b><br>' + esc(dt(FB.state, 'ailment', aid, a, 'desc')) :
            '<b>🤒 ' + esc(FB.T('Ill')) + '</b><br>' + esc(FB.T('Sickness has taken hold.'));
        } else if (chip.hasAttribute('data-trait')) {
          const t = FBDATA.traits[chip.getAttribute('data-trait')];
          if (!t) return;
          const fx = traitFxText(t);
          const tid = chip.getAttribute('data-trait');
          tip.innerHTML = '<b>' + t.icon + ' ' + esc(dt(FB.state, 'trait', tid, t, 'name')) +
            '</b><br>' + esc(FB.T('Class: {className}', {
              className:traitClassName(t)
            })) + '<br>' + esc(dt(FB.state, 'trait', tid, t, 'desc')) +
            (t.earned ? '<br><i>' + esc(FB.T('Earned: {guidance}', {
              guidance:dt(FB.state, 'trait', tid, t, 'earned')
            })) + '</i>' : '') +
            (fx ? '<br><i>' + esc(fx) + '</i>' : '');
        } else {
          const iid = chip.getAttribute('data-item') || chip.getAttribute('data-itemview');
          const item = FB.state && FB.resolveItem(FB.state, iid);
          if (!item) return;
          const ifx = itemFxText(item);
          const quality = item.ordinary ? FB.itemQualityName(item.quality) : rarityName(item.def.rarity);
          tip.innerHTML = '<b>' + item.def.icon + ' ' + esc(FB.itemName(FB.state, iid)) + '</b> · ' +
            esc(quality) + '<br>' + esc(dt(FB.state, 'item', item.defId, item.def, 'desc')) +
            (ifx ? '<br><i>' + esc(ifx) + '</i>' : '') +
            '<br><i>' + esc(FB.T('worth ~{money:gold}', { gold: item.value })) + '</i>';
        }
        tip.classList.remove('hidden');
        const r = chip.getBoundingClientRect();
        tip.style.left = Math.max(4, Math.min(window.innerWidth - 250, r.left)) + 'px';
        tip.style.top = Math.min(window.innerHeight - 110, r.bottom + 6) + 'px';
      });
    }
  };

  function signedTraitEffect(value) {
    const rounded = Math.round(value * 1000) / 1000;
    return (rounded > 0 ? '+' : '') + rounded;
  }

  function traitGroupedEffects(t) {
    const out = [];
    for (const group in t) {
      if (!Object.prototype.hasOwnProperty.call(t, group) ||
          group === 'earn' || group === 'name' || group === 'desc' ||
          group === 'earned') continue;
      const values = t[group];
      if (!values || typeof values !== 'object' || Array.isArray(values)) continue;
      for (const key in values) {
        if (!Object.prototype.hasOwnProperty.call(values, key)) continue;
        const value = Number(values[key]);
        if (!isFinite(value)) continue;
        const id = group + '.' + key;
        let label = id;
        let shown = signedTraitEffect(value);
        if (id === 'assembly.voteChance') {
          label = 'Assembly vote chance';
          shown = FB.T('{amount} percentage points', {
            amount:signedTraitEffect(value * 100)
          });
        } else if (id === 'assembly.popularOpinion') {
          label = 'Positive Common Voice gains';
          shown = FB.T('{amount}%', { amount:signedTraitEffect(value * 100) });
        } else if (id === 'travel.legDays') {
          label = 'Days per county leg';
        } else if (id === 'travel.roadIncident') {
          label = 'Ordinary road incidents';
          shown = FB.T('{amount}%', { amount:signedTraitEffect(value * 100) });
        } else if (id === 'war.levy') {
          label = 'Direct levy base';
          shown = FB.T('{amount}%', { amount:signedTraitEffect(value * 100) });
        } else if (id === 'estate.rent') {
          label = 'Direct demesne rent';
          shown = FB.T('{amount}%', { amount:signedTraitEffect(value * 100) });
        } else if (id === 'household.regard') {
          label = 'Positive spouse and blood-kin Standing';
          shown = FB.T('{amount}%', { amount:signedTraitEffect(value * 100) });
        }
        out.push({ label:label, value:shown });
      }
    }
    return out;
  }

  function traitFxText(t) {
    const parts = [];
    for (const k of FB.SKILLS) if (t[k]) parts.push(FB.T('{amount} {skill}', {
      amount: (t[k] > 0 ? '+' : '') + t[k], skill: FB.skillName(k)
    }));
    if (t.opinion) parts.push(FB.T('Standing {amount}',
      { amount: (t.opinion > 0 ? '+' : '') + t.opinion }));
    if (t.health) parts.push(FB.T(t.health > 0 ? 'hardier' : 'frailer'));
    if (t.fert && t.fert !== 1) {
      parts.push(FB.T(t.fert > 1 ? 'more fertile' : 'less fertile'));
    }
    for (const effect of traitGroupedEffects(t)) {
      parts.push(FB.T('{effect}: {value}', {
        effect:FB.T(effect.label), value:effect.value
      }));
    }
    return parts.join(' · ');
  }
})();
