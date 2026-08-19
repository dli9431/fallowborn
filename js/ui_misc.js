/* Fallowborn — UI: shared helpers, screens, toasts, modal engine, boot wiring */
/* Split from the former ui.js — shared infrastructure. Load order:
   ui_misc.js → ui_panels.js → ui_topbar.js → ui_modals.js. Cross-file
   internals travel on UI._shared (SH); see docs/designs/ui.md. */
/* Contents: name/format helpers · standing text · large-list surfaces ·
   interaction cards · mobile back navigation · screens · toasts (tap one to
   dismiss it) · map politics hookup · generic modal engine · boot-time wiring */
window.FB = window.FB || {};

(function () {
  'use strict';

  const UI = {};
  FB.ui = UI;
  /* Cross-file internals of the split UI. Each later file binds what it
     needs at load; mutable shared view state lives here as properties. */
  const SH = UI._shared = {};
  let panelMarkup = Object.create(null);

  function resetPanelMarkup() {
    panelMarkup = Object.create(null);
  }
  function replacePanelMarkup(key, box, html) {
    const previous = panelMarkup[key];
    if (previous && previous.state === FB.state &&
        previous.locale === FB.locale && previous.html === html) return false;
    panelMarkup[key] = { state:FB.state, locale:FB.locale, html:html };
    box.innerHTML = html;
    return true;
  }

  function $(id) { return document.getElementById(id); }
  function esc(s) { return FB.esc(s); }
  /* Event stakes use an explicit disclosure on touch and tablet-width layouts. */
  function eventChoiceUsesDisclosure() {
    return FB.isTouch || (typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 1100px), (max-height: 520px)').matches);
  }
  function dt(s, kind, id, def, path, ctx) {
    return FB.dataText(s, s.player.charId, kind, id, def, path, ctx || {});
  }
  function cultureName(s, id) {
    const def = FB.cultureOf(id);
    return dt(s, 'culture', id, def, 'name');
  }
  function religionName(s, id) {
    return FB.faithDataText(s, s && s.player ? s.player.charId : null,
      id, 'name', {});
  }
  function positionName(s, id) {
    const def = FBDATA.positions && FBDATA.positions[id];
    return def ? dt(s, 'position', id, def, 'name') : id;
  }
  function positionDesc(s, id) {
    const def = FBDATA.positions && FBDATA.positions[id];
    return def ? dt(s, 'position', id, def, 'desc') : '';
  }
  function techRequirementIds(requirement) {
    if (!requirement) return [];
    return Array.isArray(requirement) ? requirement.slice() : [requirement];
  }
  function firstMissingTech(s, requirement) {
    const ids = techRequirementIds(requirement);
    for (const id of ids) if (!FB.hasTech(s, id)) return id;
    return ids[0] || null;
  }
  function technologyName(s, id) {
    const def = FBDATA.tech && FBDATA.tech[id];
    return def ? dt(s, 'tech', id, def, 'name') : id;
  }
  function techRequirementText(s, requirement) {
    const ids = techRequirementIds(requirement);
    const names = ids.map(function (id) { return technologyName(s, id); });
    if (!names.length) return '';
    if (names.length === 1) {
      return FB.T('Requires {technology}.', { technology:names[0] });
    }
    return FB.T('Requires every listed technology: {technologies}.', {
      technologies:names.join(', ')
    });
  }
  function automationAccess(s) {
    const player = s && s.player;
    const landed = !!(player && player.tier >= 3);
    const activeHost = !!(s && FB.playerHost && FB.playerHost(s));
    const greatHost = !!(s && FB.playerGreatHolyWarHostActive &&
      FB.playerGreatHolyWarHostActive(s));
    const technology = !!(s && (FB.techUiRelevant
      ? FB.techUiRelevant(s) : landed));
    return {
      hosts:!!(player && (landed || player.war || activeHost || greatHost)),
      build:landed,
      technology:technology,
      research:technology && FB.isPlayerSovereign(s)
    };
  }
  function settlementChangeName(change) {
    const changes = {
      head_town:FB.T('the first village becomes a town'),
      new_village:FB.T('an additional village appears'),
      second_town:FB.T('the second settlement becomes a town'),
      head_city:FB.T('the first settlement becomes a city')
    };
    return changes[change] || change;
  }
  function settlementDevelopmentText(s, pid) {
    const status = FB.settlementDevelopment(s, pid);
    if (!status) return '';
    if (status.next === null) {
      return FB.T(
        'Started at development {start}. The settlements have grown as far as the land allows.', {
          start:status.bookmark,
          development:status.development
        });
    }
    return FB.T('Started at development {start}. Next at {threshold}: {change}.', {
      start:status.bookmark,
      threshold:status.next,
      change:settlementChangeName(status.change)
    });
  }
  function bookmarkDevelopmentText(s, pid) {
    const status = FB.settlementDevelopment(s, pid);
    if (!status) return '';
    if (status.development === status.bookmark) {
      return FB.T('The county stood at development {development} when the chronicle began, and stands there still.', {
        development:status.bookmark
      });
    }
    return status.development > status.bookmark
      ? FB.T('The county stood at development {start} when the chronicle began; it has flourished since, reaching {development}.', {
        start:status.bookmark,
        development:status.development
      })
      : FB.T('The county stood at development {start} when the chronicle began; hard times have since brought it to {development}.', {
        start:status.bookmark,
        development:status.development
      });
  }
  function childIdentityPreviewText(s, familyParent, spouse, playableLine) {
    const preview = FB.childIdentityPreview(s, familyParent, spouse, playableLine);
    const cultureSource = s.chars[preview.cultureParentId];
    const religionSource = s.chars[preview.religionParentId];
    const dynastySource = s.chars[preview.dynastyParentId];
    return FB.T(
      'Child identity preview — culture: {culture} from {cultureParent}; faith: {faith} from {faithParent}; house: {dynasty} from {dynastyParent}.', {
        culture:cultureName(s, preview.culture),
        cultureParent:cultureSource ? cultureSource.name : FB.T('the family line'),
        faith:religionName(s, preview.religion),
        faithParent:religionSource ? religionSource.name : FB.T('the family line'),
        dynasty:preview.dynasty || FB.T('no house'),
        dynastyParent:dynastySource ? dynastySource.name : FB.T('no parent’s house')
      });
  }
  function heirEligibilityText(s, row) {
    if (!row) return '';
    if (row.eligible) {
      const eligible = {
        child:FB.T('Eligible: living child of the current playable head.'),
        grandchildren:FB.T('Eligible: same-house grandchild; no living child is ahead of this branch.'),
        siblings:FB.T('Eligible: same-house sibling; no living child or grandchild is ahead.'),
        nieces_nephews:FB.T('Eligible: same-house niece or nephew; closer branches have no living candidate.'),
        uncles_aunts:FB.T('Eligible: same-house uncle or aunt; closer branches have no living candidate.'),
        cousins:FB.T('Eligible: same-house cousin; closer branches have no living candidate.')
      };
      return eligible[row.code] || FB.T('Eligible under the current house succession order.');
    }
    const blocked = {
      dead:FB.T('Not eligible: this relative has died.'),
      spouse:FB.T('Not eligible: marriage joins the household but does not make a spouse a blood successor.'),
      different_house:FB.T('Not eligible: this relative belongs to a different house.'),
      closer_children:FB.T('Not eligible now: a living child of the playable head takes precedence.')
    };
    return blocked[row.code] || FB.T('Not eligible under the current house succession order.');
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
    if (fx.marketFlow) parts.push(FB.T('{amount}% trade through local markets', {
      amount:signedPercent(fx.marketFlow)
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
  function modifierSourceText(s, record, scope) {
    const sourceId = record && record.sourceEventId;
    const ev = sourceId && FB.eventById ? FB.eventById(sourceId) : null;
    if (ev) {
      return FB.T('Event: {event}', {
        event:FB.eventText(s, s.player.charId, ev, 'title', {})
      });
    }
    if (scope === 'campaign') return FB.T('Current campaign vow');
    return FB.T('Direct system grant or an older save');
  }
  function eventModifierEffectPreview(s, fx, ctx) {
    if (!fx) return '';
    const parts = [];
    function specOf(raw) {
      return typeof raw === 'string' ? { id:raw } : raw;
    }
    if (fx.addModifier) {
      const spec = specOf(fx.addModifier);
      const def = spec && FBDATA.modifiers && FBDATA.modifiers[spec.id];
      if (def) {
        const name = dt(s, 'modifier', spec.id, def, 'name');
        const effect = modifierEffectText(s, spec.id);
        const upkeep = def.upkeep && def.upkeep.gold
          ? assetSeasonalMoneyCost(def.upkeep.gold) : FB.T('no seasonal upkeep');
        const duration = def.days === undefined
          ? (def.scope === 'campaign'
            ? FB.T('until the campaign ends') : FB.T('with no fixed end'))
          : FB.T('for {days} days', { days:def.days });
        if (def.scope === 'county') {
          const pid = spec.pid || (ctx && ctx.locationId) ||
            s.player.provinceId;
          const province = FB.world.byId[pid];
          parts.push(FB.T(
            'Adds or refreshes {modifier} in {province} {duration}: {effects}; {upkeep}. It stays with the county after transfer.', {
              modifier:name,
              province:province ? province.name : pid,
              duration:duration,
              effects:effect || FB.T('no mechanical effect'),
              upkeep:upkeep
            }));
        } else {
          parts.push(FB.T(
            'Adds or refreshes {modifier} {duration}: {effects}; {upkeep}. It applies only to this great holy war.', {
              modifier:name,
              duration:duration,
              effects:effect || FB.T('no mechanical effect'),
              upkeep:upkeep
            }));
        }
      }
    }
    if (fx.removeModifier) {
      const spec = specOf(fx.removeModifier);
      const def = spec && FBDATA.modifiers && FBDATA.modifiers[spec.id];
      if (def) {
        const name = dt(s, 'modifier', spec.id, def, 'name');
        if (def.scope === 'county') {
          const pid = spec.pid || (ctx && ctx.locationId) ||
            s.player.provinceId;
          const province = FB.world.byId[pid];
          parts.push(FB.T(
            'Ends {modifier} in {province}; its effects and upkeep stop.', {
              modifier:name,
              province:province ? province.name : pid
            }));
        } else {
          parts.push(FB.T(
            'Ends {modifier} for this great holy war.', {
              modifier:name
            }));
        }
      }
    }
    return parts.join(' ');
  }
  function eventModifierPreview(s, option, ctx) {
    const parts = [];
    const direct = eventModifierEffectPreview(s, option.effects, ctx);
    const success = eventModifierEffectPreview(
      s, option.success && option.success.effects, ctx);
    const failure = eventModifierEffectPreview(
      s, option.failure && option.failure.effects, ctx);
    if (direct) parts.push(direct);
    if (success) parts.push(FB.T('On success: {result}', { result:success }));
    if (failure) parts.push(FB.T('On failure: {result}', { result:failure }));
    return parts.join(' ');
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
    const source = id === 'legendary' ? 'legendary' :
      (id === 'famed' ? 'famed' : (id === 'fine' ? 'fine' : 'common'));
    return FB.renderKey('rarity.' + source + '.default', { text: source }, {});
  }
  const ROLE_NAMES = {
    lord: 'Lord', steward: 'Lord’s steward', priest: 'Priest', friend: 'Friend', rival: 'Rival',
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
    }, { count: Math.round(Number(count) || 0) }), { state: s, viewer: s.player.charId });
  }
  function menText(s, count) {
    const rounded = Math.round(Number(count) || 0);
    return FB.renderMessage(FB.msg('fx.ui.men', {
      forms: {
        select: 'plural', param: 'count', cases: {
          one: '{count} man',
          other: '{count} men'
        }
      }
    }, { count: rounded }), { state: s, viewer: s.player.charId });
  }
  function signedNumber(value) {
    const rounded = Math.round(Number(value) || 0);
    return (rounded > 0 ? '+' : '') + rounded;
  }
  function standingValue(value) {
    return signedNumber(FB.clamp(Math.round(Number(value) || 0), -100, 100));
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
    if (SH.interactionRetainerRecord(s, c.id)) {
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
  function allianceText(s, rid, readOnly) {
    const a = FB.allianceSnapshot
      ? FB.allianceSnapshot(s, rid) : FB.allianceOf(s, rid);
    if (!a) return FB.T('None');
    const partner = a.a === rid ? a.b : a.a;
    const r = s.realms[partner];
    if (readOnly) {
      return FB.T('{realm} · {source} · until either ruler changes', {
        realm:r ? r.name : partner,
        source:allianceSourceText(a.source)
      });
    }
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
  FB.warOpponentNames = function (s, rid) {
    const ids = FB.warOpponents ? FB.warOpponents(s, rid) : [];
    return ids.map(function (id) {
      const realm = s.realms[id];
      return realm ? realm.name : id;
    }).join(', ');
  };
  function warStatusRealmId(s, rid) {
    return rid === 'player' && (!s.realms.player || !s.realms.player.alive)
      ? FB.playerRealmId(s) : FB.topRealm(s, rid);
  }
  FB.warStatusText = function (s, rid) {
    const realmId = warStatusRealmId(s, rid);
    const realm = realmId && s.realms[realmId];
    const name = realm ? realm.name : realmId || FB.T('This realm');
    const opponents = FB.warOpponentNames(s, rid);
    return opponents
      ? FB.T('{realm} is at war with {opponents}.', {
        realm:name, opponents:opponents
      })
      : FB.T('{realm} is at war with an unrecorded opponent.', { realm:name });
  };
  FB.warStatusLinkHtml = function (s, rid) {
    const realmId = warStatusRealmId(s, rid);
    const realm = realmId && s.realms[realmId];
    const opponents = FB.warOpponents ? FB.warOpponents(s, rid) : [];
    if (!realm) return esc(FB.warStatusText(s, rid));
    const tokens = [];
    function tokenFor(id) {
      const token = '[[war-realm-' + tokens.length + ']]';
      tokens.push({ id:id, token:token });
      return token;
    }
    const realmToken = tokenFor(realmId);
    const opponentTokens = opponents.map(tokenFor);
    const text = opponentTokens.length
      ? FB.T('{realm} is at war with {opponents}.', {
        realm:realmToken, opponents:opponentTokens.join(', ')
      })
      : FB.T('{realm} is at war with an unrecorded opponent.', {
        realm:realmToken
      });
    let html = esc(text);
    for (const entry of tokens) {
      const linkedRealm = s.realms[entry.id];
      if (!linkedRealm) continue;
      const link = '<button type="button" class="linklike war-realm-link" ' +
        'data-war-realm="' + esc(entry.id) + '" title="' +
        esc(FB.T('See the ruler of {realm}', { realm:linkedRealm.name })) +
        '">' + esc(linkedRealm.name) + '</button>';
      html = html.split(entry.token).join(link);
    }
    return html;
  };
  function foreignPolicyStatusText(s, rid) {
    if (s.player.war && s.player.war.enemy === rid) {
      const realm = s.realms[rid];
      return FB.T('At war with {realm} — policy is suspended', {
        realm:realm ? realm.name : rid
      });
    }
    if (FB.areAllied(s, 'player', rid)) {
      return FB.T('Defensive allies - neither realm may attack the other');
    }
    if (s.pacts && s.pacts[rid] > s.turn) {
      const year = FB.dateAtTurn(s, s.pacts[rid]).year;
      return FB.isRealmAtWar(s, rid)
        ? FB.T('Peace pact until {year} AD · {war}', {
          year:year, war:FB.warStatusText(s, rid)
        })
        : FB.T('Peace pact until {year} AD', { year: year });
    }
    if (FB.isRealmAtWar(s, rid)) return FB.warStatusText(s, rid);
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

  /* Work and Network use one render-only grammar once their rosters become
     large. Nothing here is written to the save: filters, disclosure, focus and
     scroll are session UI state over live authoritative records. */
  const LARGE_LIST_THRESHOLD = 12;
  const LARGE_LIST_ROUTINE_BUDGET = 5;
  const largeListViews = {
    work:{
      search:'', filter:'all', sections:{}, scrollTop:0, focusKey:null,
      enterpriseGroup:'none', enterpriseSort:'attention'
    },
    network:{ search:'', filter:'all', sections:{}, scrollTop:0, focusKey:null }
  };
  UI.largeListDefaults = {
    threshold:LARGE_LIST_THRESHOLD,
    routineBudget:LARGE_LIST_ROUTINE_BUDGET
  };

  function largeListSectionState(surface, sectionId) {
    const view = largeListViews[surface];
    if (!view.sections[sectionId]) {
      const defaultCollapsed = sectionId === 'filters'
        ? (FB.game && FB.game.uiPrefs && FB.game.uiPrefs.workFiltersCollapsed !== undefined
            ? !!FB.game.uiPrefs.workFiltersCollapsed
            : true)
        : false;
      view.sections[sectionId] = { collapsed:defaultCollapsed, showAll:false };
    }
    return view.sections[sectionId];
  }

  function largeListRowAttrs(options) {
    const opts = options || {};
    const states = opts.states || [opts.state || 'routine'];
    return ' data-large-list-row="true"' +
      ' data-list-state="' + esc(states.join(' ')) + '"' +
      ' data-list-attention="' + (opts.attention ? 'true' : 'false') + '"' +
      ' data-list-identity="' + esc(opts.identity || '') + '"' +
      (opts.focusKey ? ' data-list-focus-key="' + esc(opts.focusKey) + '"' : '');
  }

  function largeListStateLabel(label, attention) {
    return '<span class="large-list-state' +
      (attention ? ' needs-attention' : '') + '">' + esc(label) + '</span>';
  }

  function largeListSectionHtml(surface, section) {
    const rows = section.rows || [];
    let attention = 0;
    for (const row of rows) if (row.attention) attention++;
    const state = largeListSectionState(surface, section.id);
    const headingId = section.headingId ||
      surface + '-list-heading-' + section.id;
    const bodyId = surface + '-list-body-' + section.id;
    const countText = FB.T('{count} total', { count:rows.length });
    const attentionText = FB.T('{count} need attention', { count:attention });
    const ariaLabel = FB.T(
      '{section}: {total}; {attention}. {action} section.', {
        section:section.title,
        total:countText,
        attention:attentionText,
        action:state.collapsed ? FB.T('Expand') : FB.T('Collapse')
      });
    let h = '<section class="large-list-section" data-list-section="' +
      esc(section.id) + '"><h4 id="' + headingId + '" tabindex="-1" ' +
      'data-list-focus-key="heading-' + esc(section.id) + '">' +
      '<button type="button" class="large-list-section-toggle" ' +
      'data-list-toggle="' + esc(section.id) + '" data-list-focus-key="toggle-' +
      esc(section.id) + '" aria-expanded="' + (!state.collapsed) +
      '" aria-controls="' + bodyId + '" aria-label="' + esc(ariaLabel) + '">' +
      '<span class="large-list-section-title">' + esc(section.title) + '</span>' +
      '<span class="large-list-section-count">' + esc(countText) + '</span>' +
      '<span class="large-list-attention-count' +
      (attention ? '' : ' none') + '">' + esc(attentionText) + '</span>' +
      '<span class="large-list-section-caret" aria-hidden="true">' +
      (state.collapsed ? '▸' : '▾') + '</span></button></h4>' +
      '<div class="large-list-section-body" id="' + bodyId + '"' +
      (state.collapsed ? ' hidden' : '') + ' aria-labelledby="' + headingId + '">';
    if (section.summary) {
      h += '<div class="large-list-section-summary">' + section.summary + '</div>';
    }
    h += '<div class="large-list-rows">';
    for (const row of rows) h += row.html;
    h += '</div>' +
      (section.footer
        ? '<div class="large-list-section-footer">' + section.footer + '</div>'
        : '') +
      '<div class="hint large-list-empty"' +
      (rows.length ? ' hidden' : '') + '>' +
      esc(section.empty || FB.T('Nothing is recorded in this section.')) +
      '</div><div class="hint large-list-no-results" hidden>' +
      esc(FB.T('No entries match the current search and filter.')) +
      '</div><button type="button" class="btn large-list-show-all" hidden ' +
      'data-list-show-all="' + esc(section.id) +
      '" data-list-focus-key="show-all-' + esc(section.id) + '">' +
      esc(FB.T('Show all {count}', { count:rows.length })) +
      '</button></div></section>';
    return h;
  }

  function largeListSurfaceHtml(surface, sections, filters, options) {
    let total = 0;
    for (const section of sections) total += (section.rows || []).length;
    const view = largeListViews[surface];
    if (view.stateRef !== FB.state) {
      view.stateRef = FB.state;
      view.search = '';
      view.filter = 'all';
      view.sections = {};
      view.scrollTop = 0;
      view.focusKey = null;
      if (surface === 'work') {
        view.enterpriseGroup = 'none';
        view.enterpriseSort = 'attention';
      }
    }
    const large = total > LARGE_LIST_THRESHOLD;
    const opts = options || {};
    const controlsHtml = opts.controlsHtml || '';
    const collapsibleFilters = opts.collapsibleFilters !== undefined
      ? !!opts.collapsibleFilters
      : (surface === 'work');

    let toolbarHtml = '';
    if (large) {
      const searchId = surface + '-list-search';
      toolbarHtml += '<div class="large-list-search"><label for="' + searchId + '">' +
        esc(FB.T('Search this list')) + '</label><div>' +
        '<input type="search" id="' + searchId + '" value="' +
        esc(view.search) + '" autocomplete="off" spellcheck="false" ' +
        'data-list-search data-list-focus-key="search" placeholder="' +
        esc(FB.T('Name, role, work, office, or realm')) + '">' +
        '<button type="button" class="btn small" data-list-clear ' +
        'data-list-focus-key="clear-search"' +
        (view.search ? '' : ' hidden') + ' aria-label="' +
        esc(FB.T('Clear list search')) + '">' + esc(FB.T('Clear')) +
        '</button></div></div>';
    }
    if (filters && filters.length) {
      toolbarHtml += '<div class="large-list-filters" role="group" aria-label="' +
        esc(FB.T('Filter list')) + '">';
      for (const filter of filters) {
        toolbarHtml += '<button type="button" class="btn small" data-list-filter="' +
          esc(filter.id) + '" data-list-focus-key="filter-' + esc(filter.id) +
          '" aria-pressed="' + (view.filter === filter.id) + '">' +
          esc(filter.label) + '</button>';
      }
      toolbarHtml += '</div>';
    }

    let h = '<div class="large-list-surface" data-large-list-surface="' +
      esc(surface) + '" data-large-list="' + (large ? 'true' : 'false') + '">';

    if (collapsibleFilters) {
      const state = largeListSectionState(surface, 'filters');
      const isCollapsed = !!state.collapsed;
      const headingId = surface + '-list-heading-filters';
      const bodyId = surface + '-list-body-filters';
      const filtersTitle = FB.T('Filters & sorting');
      const ariaLabel = FB.T('{section}: {action} section.', {
        section:filtersTitle,
        action:isCollapsed ? FB.T('Expand') : FB.T('Collapse')
      });
      h += '<section class="large-list-section large-list-filters-section" data-list-section="filters">' +
        '<h4 id="' + headingId + '" tabindex="-1" data-list-focus-key="heading-filters">' +
        '<button type="button" class="large-list-section-toggle large-list-filters-toggle" ' +
        'data-list-toggle="filters" data-list-focus-key="toggle-filters" ' +
        'aria-expanded="' + (!isCollapsed) + '" aria-controls="' + bodyId + '" ' +
        'aria-label="' + esc(ariaLabel) + '">' +
        '<span class="large-list-section-title">⚙ ' + esc(filtersTitle) + '</span>' +
        '<span class="large-list-section-caret" aria-hidden="true">' + (isCollapsed ? '▸' : '▾') + '</span>' +
        '</button></h4>' +
        '<div class="large-list-section-body large-list-filters-body" id="' + bodyId + '"' +
        (isCollapsed ? ' hidden' : '') + ' aria-labelledby="' + headingId + '">' +
        (controlsHtml || '') +
        (toolbarHtml ? '<div class="large-list-toolbar">' + toolbarHtml + '</div>' : '') +
        '</div></section>';
    } else {
      if (controlsHtml) h += controlsHtml;
      if (toolbarHtml) h += '<div class="large-list-toolbar">' + toolbarHtml + '</div>';
    }

    for (const section of sections) h += largeListSectionHtml(surface, section);
    return h + '</div>';
  }

  function visibleLargeListAction(button) {
    if (!button || button.hidden) return false;
    let node = button;
    while (node) {
      if (node.hidden) return false;
      node = node.parentElement;
    }
    return button.getClientRects().length > 0;
  }

  function largeListSearchText(row) {
    if (row._largeListSearchText !== undefined) {
      return row._largeListSearchText;
    }
    const copy = row.cloneNode(true);
    const hints = copy.querySelectorAll('.keyhint');
    for (let i = hints.length - 1; i >= 0; i--) {
      hints[i].parentNode.removeChild(hints[i]);
    }
    row._largeListSearchText = copy.textContent.toLocaleLowerCase();
    return row._largeListSearchText;
  }

  function refreshLargeListKeyhints(root) {
    if (FB.isTouch || !root || !$('genmodal').contains(root)) return;
    const buttons = $('gm-body').querySelectorAll('.actionbtn');
    for (let i = 0; i < buttons.length; i++) {
      const children = buttons[i].children;
      for (let j = children.length - 1; j >= 0; j--) {
        if (children[j].classList.contains('keyhint')) {
          buttons[i].removeChild(children[j]);
        }
      }
    }
    let visibleIndex = 0;
    for (let i = 0; i < buttons.length; i++) {
      if (!visibleLargeListAction(buttons[i])) continue;
      buttons[i].insertAdjacentHTML('afterbegin', hintFor(visibleIndex));
      visibleIndex++;
    }
  }

  function applyLargeListView(root) {
    if (!root) return;
    const surface = root.getAttribute('data-large-list-surface');
    const view = largeListViews[surface];
    if (!view) return;
    const query = (view.search || '').trim().toLocaleLowerCase();
    const large = root.getAttribute('data-large-list') === 'true';
    const filters = root.querySelectorAll('[data-list-filter]');
    for (let i = 0; i < filters.length; i++) {
      filters[i].setAttribute('aria-pressed',
        filters[i].getAttribute('data-list-filter') === view.filter
          ? 'true' : 'false');
    }
    const clear = root.querySelector('[data-list-clear]');
    if (clear) clear.hidden = !view.search;

    const sections = root.querySelectorAll('[data-list-section]');
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const sectionId = section.getAttribute('data-list-section');
      const state = largeListSectionState(surface, sectionId);
      const toggle = section.querySelector('[data-list-toggle]');
      const body = section.querySelector('.large-list-section-body');
      const caret = section.querySelector('.large-list-section-caret');
      body.hidden = !!state.collapsed;
      toggle.setAttribute('aria-expanded', state.collapsed ? 'false' : 'true');
      const sectionTitle = section.querySelector('.large-list-section-title');
      const sectionCount = section.querySelector('.large-list-section-count');
      const attentionCount = section.querySelector(
        '.large-list-attention-count');
      toggle.setAttribute('aria-label', FB.T(
        '{section}: {total}; {attention}. {action} section.', {
          section:sectionTitle ? sectionTitle.textContent : sectionId,
          total:sectionCount ? sectionCount.textContent : '',
          attention:attentionCount ? attentionCount.textContent :
            FB.T('{count} need attention', { count:0 }),
          action:state.collapsed ? FB.T('Expand') : FB.T('Collapse')
        }));
      if (caret) caret.textContent = state.collapsed ? '▸' : '▾';

      const rows = section.querySelectorAll('[data-large-list-row]');
      let matched = 0, routineShown = 0, truncated = 0;
      for (let j = 0; j < rows.length; j++) {
        const row = rows[j];
        const attention = row.getAttribute('data-list-attention') === 'true';
        const states = (' ' + row.getAttribute('data-list-state') + ' ');
        const filterMatch = view.filter === 'all' ||
          (view.filter === 'attention' && attention) ||
          states.indexOf(' ' + view.filter + ' ') >= 0;
        const searchMatch = !query ||
          largeListSearchText(row).indexOf(query) >= 0;
        let show = filterMatch && searchMatch;
        if (show) {
          matched++;
          if (large && view.filter === 'all' && !query && !attention &&
              !state.showAll) {
            if (routineShown >= LARGE_LIST_ROUTINE_BUDGET) {
              show = false;
              truncated++;
            } else {
              routineShown++;
            }
          }
        }
        row.hidden = !show;
      }
      const empty = section.querySelector('.large-list-empty');
      const noResults = section.querySelector('.large-list-no-results');
      const showAll = section.querySelector('[data-list-show-all]');
      if (empty) empty.hidden = rows.length !== 0;
      if (noResults) noResults.hidden = rows.length === 0 || matched !== 0;
      if (showAll) showAll.hidden = !truncated || state.collapsed;
    }
    refreshLargeListKeyhints(root);
  }

  function largeListScrollContainer(surface) {
    return surface === 'network' ? $('sidebody') : $('gm-body');
  }

  function saveLargeListScroll(surface) {
    const container = largeListScrollContainer(surface);
    if (container && largeListViews[surface]) {
      largeListViews[surface].scrollTop = container.scrollTop;
    }
  }

  function initLargeListSurface(surface, options) {
    const opts = options || {};
    const root = document.querySelector(
      '[data-large-list-surface="' + surface + '"]');
    const view = largeListViews[surface];
    if (!root || !view) return;
    /* openModal's deferred first-control focus can fire before this deferred
       restoration and update view.focusKey through focusin. Keep the semantic
       return target from this render so generic autofocus cannot replace it. */
    const restoreFocusKey = opts.restoreFocus ? view.focusKey : null;
    const search = root.querySelector('[data-list-search]');
    if (search) {
      search.addEventListener('input', function () {
        view.search = search.value;
        applyLargeListView(root);
      });
    } else {
      view.search = '';
    }
    const clear = root.querySelector('[data-list-clear]');
    if (clear) {
      clear.addEventListener('click', function () {
        view.search = '';
        search.value = '';
        applyLargeListView(root);
        search.focus();
      });
    }
    const filters = root.querySelectorAll('[data-list-filter]');
    for (let i = 0; i < filters.length; i++) {
      filters[i].addEventListener('click', function () {
        view.filter = filters[i].getAttribute('data-list-filter');
        applyLargeListView(root);
      });
    }
    const toggles = root.querySelectorAll('[data-list-toggle]');
    for (let i = 0; i < toggles.length; i++) {
      toggles[i].addEventListener('click', function () {
        const sectionId = toggles[i].getAttribute('data-list-toggle');
        const state = largeListSectionState(surface, sectionId);
        state.collapsed = !state.collapsed;
        if (sectionId === 'filters' && FB.game && FB.game.uiPrefs) {
          FB.game.uiPrefs.workFiltersCollapsed = state.collapsed;
          try { localStorage.setItem('fb_ui', JSON.stringify(FB.game.uiPrefs)); } catch (e) {}
        }
        applyLargeListView(root);
      });
    }
    const showAll = root.querySelectorAll('[data-list-show-all]');
    for (let i = 0; i < showAll.length; i++) {
      showAll[i].addEventListener('click', function () {
        const sectionId = showAll[i].getAttribute('data-list-show-all');
        largeListSectionState(surface, sectionId).showAll = true;
        applyLargeListView(root);
        const toggle = root.querySelector(
          '[data-list-toggle="' + sectionId + '"]');
        if (toggle) toggle.focus({ preventScroll:true });
      });
    }
    root.addEventListener('focusin', function (event) {
      const target = event.target.closest &&
        event.target.closest('[data-list-focus-key]');
      if (target) view.focusKey = target.getAttribute('data-list-focus-key');
    });
    /* Pointer activation is not guaranteed to focus a button in every
       browser. Remember the semantic target before its click handler replaces
       this surface with a nested sheet, so Back can still restore it. */
    root.addEventListener('click', function (event) {
      const target = event.target.closest &&
        event.target.closest('[data-list-focus-key]');
      if (target) view.focusKey = target.getAttribute('data-list-focus-key');
    }, true);
    const container = largeListScrollContainer(surface);
    if (container) {
      container._largeListScrollSurface = surface;
      if (!container._largeListScrollBound) {
        container._largeListScrollBound = true;
        container.addEventListener('scroll', function () {
          const activeSurface = container._largeListScrollSurface;
          if (!activeSurface ||
              (activeSurface === 'network' && SH.activeTab !== 'network')) return;
          largeListViews[activeSurface].scrollTop = container.scrollTop;
        });
      }
    }
    applyLargeListView(root);
    setTimeout(function () {
      if (container) container.scrollTop = view.scrollTop || 0;
      if (!restoreFocusKey) return;
      const focusTargets = root.querySelectorAll('[data-list-focus-key]');
      let focus = null;
      for (let i = 0; i < focusTargets.length; i++) {
        if (focusTargets[i].getAttribute('data-list-focus-key') ===
            restoreFocusKey) {
          focus = focusTargets[i];
          break;
        }
      }
      if (focus && !focus.hidden && focus.getClientRects().length) {
        focus.focus({ preventScroll:true });
        return;
      }
      const fallback = search ||
        root.querySelector('[data-list-filter][aria-pressed="true"]') ||
        root.querySelector('[data-list-toggle]');
      if (fallback) fallback.focus({ preventScroll:true });
    }, 0);
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

  /* Compact asset card: icon, name, one-line effect, optional meta line; the
     full audit table and description sit behind the ? button (inline toggle,
     plus a hover/focus tooltip on desktop). Callers compose the action
     buttons (raise, demolish) rendered inside the card head. */
  function assetCard(detId, icon, name, fxLine, metaLine, detailsHtml, actionsHtml) {
    const metaText = typeof metaLine === 'object' && metaLine ? metaLine.text : metaLine;
    const metaTone = typeof metaLine === 'object' && metaLine && metaLine.tone
      ? ' ' + esc(metaLine.tone) : '';
    return '<div class="asset-owned-row settcard">' +
      '<div class="settcard-head"><b>' + icon + ' ' + esc(name) + '</b>' +
      '<span class="settcard-actions">' +
      '<button type="button" class="btn small settcard-info"' +
      ' aria-expanded="false" aria-controls="' + detId + '" title="' +
      esc(FB.T('Details')) + '" aria-label="' + esc(FB.T('Details')) +
      '">?</button>' + (actionsHtml || '') +
      '</span></div>' +
      (metaText
        ? '<div class="settcard-meta' + metaTone + '">' + esc(metaText) + '</div>' : '') +
      (fxLine
        ? '<div class="adesc settcard-fx">' + esc(fxLine) + '</div>' : '') +
      '<div class="settcard-details hidden" id="' + detId + '">' +
      detailsHtml + '</div></div>';
  }

  function bindCardInfoToggles(root) {
    root.querySelectorAll('.settcard-info').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const det = $(btn.getAttribute('aria-controls'));
        if (!det) return;
        const opening = det.classList.contains('hidden');
        det.classList.toggle('hidden', !opening);
        btn.setAttribute('aria-expanded', opening ? 'true' : 'false');
        const label = opening ? FB.T('Hide details') : FB.T('Details');
        btn.title = label;
        btn.setAttribute('aria-label', label);
      });
    });
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
    if (!art && person) art = FB.faceTag(person, 40, 46);
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

  const INTERACTION_GROUP_ORDER = [
    'relationship', 'gift', 'travel', 'diplomacy',
    'feudal', 'war', 'management'
  ];
  const INTERACTION_GROUP_LABELS = {
    relationship:'Relationship & attention',
    gift:'Gifts & material support',
    travel:'Travel & personal contact',
    diplomacy:'Diplomacy & commitments',
    feudal:'Feudal & governance',
    war:'Hostility & war',
    management:'Focused management'
  };

  function interactionActionRow(action) {
    const enabled = action.enabled !== false;
    const detail = action.detail || '';
    const blocked = !enabled && action.blockedReason
      ? action.blockedReason : '';
    const consequence = action.consequence || '';
    /* A blocking reason replaces the normal cost/effect copy. Showing all
       three makes unavailable rows harder to scan and repeats the same gate. */
    const visibleDetail = blocked ? '' : detail;
    const visibleConsequence = blocked ? '' : consequence;
    const accessibleParts = [action.label, visibleDetail, blocked,
      visibleConsequence]
      .filter(function (part, index, parts) {
        return !!part && parts.indexOf(part) === index;
      });
    const accessible = accessibleParts.join('. ');
    return '<button type="button" class="actionbtn interaction-action" ' +
      'data-interaction-action="' + esc(action.id) + '"' +
      (action.domId ? ' id="' + esc(action.domId) + '"' : '') +
      (enabled ? '' : ' disabled') +
      ' aria-label="' + esc(accessible) + '">' +
      '<span class="interaction-action-label">' + esc(action.label) +
      '</span>' +
      (visibleDetail ? '<span class="adesc interaction-action-detail">' +
        esc(visibleDetail) + '</span>' : '') +
      (blocked ? '<span class="adesc interaction-blocked">' +
        esc(FB.T('Unavailable: {reason}', { reason:blocked })) +
        '</span>' : '') +
      (visibleConsequence ? '<span class="adesc interaction-consequence">' +
        esc(visibleConsequence) + '</span>' : '') +
      '</button>';
  }
  UI.interactionActionRow = interactionActionRow;

  function interactionCardHtml(model) {
    if (!model) return '';
    let h = '<section class="interaction-card" data-interaction-kind="' +
      esc(model.target.kind) + '" data-interaction-target="' +
      esc(model.target.id) + '">';
    if (model.showContext !== false && model.context && model.context.length) {
      h += '<div class="interaction-context" role="list" aria-label="' +
        esc(FB.T('Identity and context')) + '">';
      for (const row of model.context) {
        if (!row || row.value === undefined || row.value === null ||
            row.value === '') continue;
        h += '<div class="interaction-context-row" role="listitem">' +
          '<span>' + esc(row.label) + '</span><b>' +
          esc(row.value) + '</b></div>';
      }
      h += '</div>';
    }
    if (model.standing) {
      h += '<div class="interaction-standing">' +
        '<div><span>' + esc(FB.T('Standing')) + '</span>' +
        standingSpan(model.standing.value) + '</div>' +
        '<p>' + esc(model.standing.explanation || '') + '</p></div>';
    }
    if (model.commitments && model.commitments.length) {
      h += '<div class="interaction-commitments" role="list" aria-label="' +
        esc(FB.T('Current commitments and urgent state')) + '">';
      for (const commitment of model.commitments) {
        const detail = commitment.detailHtml === undefined
          ? esc(commitment.detail) : commitment.detailHtml;
        h += '<div class="interaction-commitment' +
          (commitment.urgent ? ' urgent' : '') +
          '" role="listitem" data-interaction-commitment="' +
          esc(commitment.id) + '"><b>' + esc(commitment.label) +
          '</b><span>' + detail + '</span></div>';
      }
      h += '</div>';
    }
    const actions = model.actions || [];
    for (const group of INTERACTION_GROUP_ORDER) {
      const grouped = actions.filter(function (action) {
        return action.group === group;
      });
      if (!grouped.length) continue;
      h += '<section class="interaction-action-group" data-interaction-group="' +
        group + '"><h4>' +
        esc(FB.T(INTERACTION_GROUP_LABELS[group])) + '</h4>';
      for (const action of grouped) h += interactionActionRow(action);
      h += '</section>';
    }
    return h + '</section>';
  }
  UI.interactionCardHtml = interactionCardHtml;

  function wireInteractionCard(model, handler) {
    const buttons = document.querySelectorAll(
      '[data-interaction-kind="' + model.target.kind + '"] ' +
      '[data-interaction-action]');
    const byId = {};
    for (const action of model.actions || []) byId[action.id] = action;
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        const action = byId[buttons[i].dataset.interactionAction];
        if (action && action.enabled !== false) handler(action);
      });
    }
  }

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
    UI.coachmarkReset(); // a screen switch retires any lesson in flight
    if (id !== null && SH.travelPicker) {
      SH.closeTravelPicker(false);
      mobileNavClosed('travel-picker', true);
    }
    for (const sid of ['loading', 'title', 'bookmarks', 'newgame', 'pickprov', 'chargen']) {
      const el = $(sid);
      el.classList.toggle('hidden', sid !== id);
      el.classList.remove('asbar');
    }
    $('game').classList.toggle('hidden', id !== null);
    /* the birthplace and character screens put their Back button in the
       bottom-left corner the title music controls occupy — CSS hides the
       controls there on phone-sized screens */
    document.body.classList.toggle('ng-back-corner',
      id === 'pickprov' || id === 'chargen');
    if (FB.music && FB.music.refreshTitleToggle) FB.music.refreshTitleToggle();
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
    if (SH.travelPicker) {
      SH.closeTravelPicker(false);
      mobileNavClosed('travel-picker', true);
    }
    UI.showScreen(null);
    document.body.classList.remove('showself');
    mobileNavStart();
    SH.portraitKey = ''; // a new life or loaded save must never keep the old face
    resetPanelMarkup();
    if (FB.clearPortraitCache) FB.clearPortraitCache();
    SH.logRenderedTail = null; SH.logRenderedLen = -1;
    SH.logRenderedHeader = ''; SH.logRenderedLocale = '';
    SH.logRenderedFilter = '';
    FB.map.resize();
    FB.map.request();
  };

  /* ================= toasts (tap one to dismiss it) ================= */
  UI.toast = function (text, params) {
    if (UI.suppressEventEffectToasts) return;
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
    if (UI.suppressEventEffectToasts) return;
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

  let fastForwardReceipt = null;
  UI.eventReceiptToast = function (receipt) {
    /* Each autoresolved receipt is already durable in the Chronicle, and the
       toast replaces its predecessor. During a frame-sliced skip retain only
       that eventual final toast instead of rebuilding DOM between days. */
    if (FB.game && FB.game.fastForwarding) {
      fastForwardReceipt = receipt;
      return;
    }
    const box = $('toasts');
    if (!box || !receipt) return;
    const older = box.querySelector('.event-receipt-toast');
    if (older && older.parentNode) older.parentNode.removeChild(older);
    const context = {
      state:FB.state,
      viewer:FB.state && FB.state.player ? FB.state.player.charId : null
    };
    const title = FB.renderMessage(receipt.title, context);
    const option = FB.renderMessage(receipt.option, context);
    const outcome = receipt.outcome ? FB.renderMessage(receipt.outcome, context) : '';
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'toast event-receipt-toast';
    el.title = FB.T('Open Choices in the Chronicle');
    let h = '<span class="event-receipt-headline">' + esc(outcome
      ? FB.T('{event} — {outcome}', { event:title, outcome:outcome })
      : FB.T('{event} — {choice}', { event:title, choice:option })) + '</span>';
    const impacts = (receipt.impacts || []).filter(function (record) {
      return !FB.eventImpactVisible || FB.eventImpactVisible(record);
    });
    const shown = Math.min(3, impacts.length);
    if (shown) {
      h += '<span class="event-impact-chips receipt">';
      for (let i = 0; i < shown; i++) {
        const record = impacts[i];
        let tone = 'neutral';
        if (record.lethal) tone = 'danger';
        else if (record.amount < 0 || record.action === 'remove' ||
            record.action === 'lose') tone = 'cost';
        else if (record.amount > 0 || record.action === 'add') tone = 'gain';
        h += '<span class="event-impact-chip ' + tone + '">' +
          esc(FB.eventImpactText(FB.state, record, 'resolved')) + '</span>';
      }
      if (impacts.length > shown) h += '<span class="event-impact-more">' +
        esc(FB.T('+{count} more', { count:impacts.length - shown })) + '</span>';
      h += '</span>';
    }
    el.innerHTML = h;
    el.addEventListener('click', function () {
      if (UI.eventsBusy && UI.eventsBusy()) return;
      if (UI.showTab) UI.showTab('log');
      if (UI.setChronicleFilter) UI.setChronicleFilter('choices');
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    box.appendChild(el);
    while (box.children.length > 5) box.removeChild(box.firstChild);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 6000);
  };

  /* ================= coachmarks (lessons that point) =================
     A beginner lesson shows as a coachmark: a tooltip anchored to the button
     or area it teaches, with that target lit up, staying open until the
     player dismisses it — the corner toasts faded before a lesson could sink
     in. Next pages to the following orientation lesson and Back rewinds,
     without waiting for the day — but Next stays shut until the lit control
     has had its touch (lessons marked freeNext, like the pace of days, skip
     the touch: unpausing could pop an event and break the tour; a lesson can
     also widen its touch — touchAlso counts using an already-open pane like
     Deeds or Self, touchHover counts hovering the lit control, like the top
     bar whose breakdowns show on hover). The menu
     lessons (controls, guide, save) re-present above the open menu
     sheet at their own spot in it, since the sheet covers the whole screen
     on small layouts. While an event or dialog holds the screen the lesson
     waits its turn (pumped by UI.refresh and the modal close path), and one
     coachmark shows at a time; later ones queue behind it. */
  let coachQueue = [];
  let coachEl = null;
  let coachLit = null;
  let coachNext = null;    // the Next button while its lesson is up
  let coachTouch = null;   // the lit control still awaiting its touch
  let coachTouchAlso = null; // a second control whose use also counts (touchAlso)
  let coachItem = null;    // the lesson on screen, with its flags
  let coachDripIdx = null; // its place in DRIP_TIPS, when it is one
  let coachFirstItem = null;    // the map lesson — the tour's first stop (-1)
  let coachLastTourIdx = null;  // the tour position most recently shown

  function coachmarkBlocked(item) {
    const game = $('game');
    if (!game || game.classList.contains('hidden')) return true;
    if (UI.eventsBusy && UI.eventsBusy()) return true; // an event trumps all
    const ev = $('eventmodal');
    if (ev && !ev.classList.contains('hidden')) return true;
    const gm = $('genmodal');
    const gmOpen = gm && !gm.classList.contains('hidden');
    if (item && item.overModal) {
      // an over-sheet lesson only has a stage while the menu sheet is open
      return !(gmOpen && $('m-save'));
    }
    return gmOpen;
  }

  UI.coachmark = function (text, target, opts) {
    const item = { text:text, target:target };
    if (opts) for (const k in opts) item[k] = opts[k];
    coachQueue.push(item);
    UI.maybeShowCoachmark();
  };
  UI.coachmarkOpen = function () { return !!coachEl; };
  UI.maybeShowCoachmark = function () {
    // an over-sheet lesson whose menu sheet went away re-anchors to ☰
    if (coachEl && coachItem && coachItem.overModal && !$('m-save')) {
      const stray = coachItem;
      dismissCoachmark();
      coachQueue.unshift(baseCoachItem(stray));
    }
    // a menu lesson waiting behind the open menu sheet goes straight above
    // it (the sheet covers the whole screen on small layouts)
    const gm = $('genmodal');
    if (!coachEl && coachQueue.length && $('m-save') && gm &&
        !gm.classList.contains('hidden')) {
      const head = coachQueue[0];
      if (head.overTarget && !head.overModal) {
        coachQueue.shift();
        coachQueue.unshift(overCoachItem(head));
      }
    }
    if (coachEl || !coachQueue.length) return false;
    if (coachmarkBlocked(coachQueue[0])) return false;
    // a lesson stills the days while it is read, so a running game cannot
    // bury it under a fresh event modal
    if (FB.game && !FB.game.paused && !FB.game.observe && FB.game.setPaused) {
      FB.game.setPaused(true);
    }
    showCoachmark(coachQueue.shift());
    return true;
  };

  /* the over-sheet presentation of a menu lesson: anchored at its own spot
     in the sheet with its over-sheet text, Next free (the touch already
     happened), closing the sheet behind it on small layouts when the tour
     walks on. baseText/baseTarget remember the ☰ presentation. */
  function overCoachItem(item) {
    return { text:(item.overText || item.text), target:item.overTarget,
      dripIdx:item.dripIdx, overTarget:item.overTarget,
      overText:item.overText || null, overModal:true, freeNext:true,
      closeMenuOnNext:true, baseText:item.text, baseTarget:item.target };
  }
  function baseCoachItem(item) { // back from the over-sheet presentation
    return { text:(item.baseText || item.text),
      target:(item.baseTarget || item.target), dripIdx:item.dripIdx,
      overTarget:item.overTarget, overText:item.overText || null };
  }
  UI.coachmarkReset = function () {
    coachQueue = [];
    coachFirstItem = null;
    coachLastTourIdx = null;
    dismissCoachmark();
  };

  function showCoachmark(item) {
    coachItem = item;
    coachDripIdx = (typeof item.dripIdx === 'number') ? item.dripIdx : null;
    if (coachDripIdx === -1) coachFirstItem = item; // the map lesson itself
    if (coachDripIdx !== null) coachLastTourIdx = coachDripIdx;
    coachEl = document.createElement('div');
    coachEl.className = 'coachmark' + (item.overModal ? ' overmodal' : '');
    coachEl.setAttribute('role', 'status');
    const arrow = document.createElement('div');
    arrow.className = 'coachmark-arrow';
    const textEl = document.createElement('div');
    textEl.className = 'coachmark-text';
    textEl.textContent = FB.T(item.text);
    const actions = document.createElement('div');
    actions.className = 'coachmark-actions';
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'btn small coachmark-dismiss';
    dismiss.textContent = FB.T('Got it');
    dismiss.addEventListener('click', dismissCoachmark);
    const hasNext = hasNextLesson();
    if (hasNext) actions.appendChild(dismiss); // bottom-left while paging
    // Back rewinds one tour stop — every lesson that has one shows it
    if (coachTourItem(coachBackIdx())) {
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'btn small coachmark-back';
      back.textContent = FB.T('Back');
      back.addEventListener('click', rewindCoachmark);
      actions.appendChild(back);
    }
    // paging: the next orientation lesson, without waiting for its day
    if (hasNext) {
      coachNext = document.createElement('button');
      coachNext.type = 'button';
      coachNext.className = 'btn small coachmark-next';
      coachNext.textContent = FB.T('Next');
      coachNext.addEventListener('click', advanceCoachmark);
      actions.appendChild(coachNext); // bottom-right
    } else {
      actions.appendChild(dismiss); // the final lesson's one right-side Got it
    }
    coachEl.appendChild(arrow);
    coachEl.appendChild(textEl);
    coachEl.appendChild(actions);
    document.body.appendChild(coachEl);
    positionCoachmark(item.target);
    // Next stays shut until the lit control has been touched — unless the
    // lesson is marked freeNext (nothing safe to touch, e.g. the pace of
    // days) or points at a zero-size corner with nothing to touch. A menu
    // lesson listens for its ☰ touch either way: the touch opens the sheet
    // the lesson re-presents above.
    const wantsTouch = (coachNext && !item.freeNext) ||
      (item.overTarget && !item.overModal);
    if (coachLit && wantsTouch) {
      const r = coachLit.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        if (coachNext && !item.freeNext) {
          coachNext.disabled = true;
          coachNext.title = FB.T('Try the highlighted control first');
        }
        coachTouch = coachLit;
        coachTouch.addEventListener('pointerdown', coachTouched, true);
        coachTouch.addEventListener('click', coachTouched, true);
        // a hover lesson (the top bar) counts the pointer moving over the
        // lit control as its touch — the breakdown it teaches shows on hover
        if (item.touchHover) {
          coachTouch.addEventListener('pointerenter', coachTouched, true);
        }
        // a lesson can name a second control whose use also counts: the
        // Deeds pane is already open, so scrolling (wheel) or tapping it is
        // the touch — the tab itself need not be tapped
        const also = item.touchAlso && document.querySelector(item.touchAlso);
        if (also) {
          coachTouchAlso = also;
          coachTouchAlso.addEventListener('pointerdown', coachTouched, true);
          coachTouchAlso.addEventListener('click', coachTouched, true);
          coachTouchAlso.addEventListener('wheel', coachTouched, true);
        }
      }
    }
  }

  function hasNextLesson() {
    if (tipsSilenced()) return false; // no paging into a silenced tour
    if (coachDripIdx !== null) return coachDripIdx + 1 < DRIP_TIPS.length;
    return !!nextLessonTip();
  }

  /* the tour position this lesson goes Back to: the previous drip lesson, or
     the tour's current stop for a lesson outside the sequence (a contextual
     tip borrows the position). The map lesson (-1) has none. */
  function coachBackIdx() {
    if (coachDripIdx !== null) return coachDripIdx - 1;
    return coachLastTourIdx;
  }
  function coachTourItem(idx) {
    if (idx === null || idx < -1) return null;
    if (idx === -1) return coachFirstItem; // only if the map lesson showed
    if (idx >= DRIP_TIPS.length) return null;
    const tip = DRIP_TIPS[idx];
    return { text:tip.text, target:tip.target, dripIdx:idx,
      freeNext:tip.freeNext, overTarget:tip.overTarget,
      overText:tip.overText || null, touchAlso:tip.touchAlso || null,
      touchHover:tip.touchHover || null };
  }

  /* the lit control saw real use (capture, so taps on anything inside it
     count, and keyboard activation arrives via click): Next opens up. The
     listeners stay until the lesson closes — a menu lesson's follow-up needs
     the click after the pointerdown. */
  function coachTouched() {
    if (coachNext) {
      coachNext.disabled = false;
      coachNext.removeAttribute('title');
    }
    // a menu lesson's touch opens the menu: re-present it above the sheet at
    // its own spot there (checked after the click handlers ran)
    if (coachItem && coachItem.overTarget && !coachItem.overModal) {
      const item = coachItem;
      setTimeout(function () {
        if (coachItem !== item || !$('m-save')) return;
        dismissCoachmark();
        UI.coachmark(item.text, '#btn-menu', {
          dripIdx:item.dripIdx, overTarget:item.overTarget,
          overText:item.overText || null
        }); // the queue converts it to its over-sheet presentation
      }, 0);
    }
  }
  function clearCoachTouch() {
    if (coachTouch) {
      coachTouch.removeEventListener('pointerdown', coachTouched, true);
      coachTouch.removeEventListener('click', coachTouched, true);
      coachTouch.removeEventListener('pointerenter', coachTouched, true);
      coachTouch = null;
    }
    if (coachTouchAlso) {
      coachTouchAlso.removeEventListener('pointerdown', coachTouched, true);
      coachTouchAlso.removeEventListener('click', coachTouched, true);
      coachTouchAlso.removeEventListener('wheel', coachTouched, true);
      coachTouchAlso = null;
    }
  }

  /* Next: close this lesson and open the following one on the spot — the next
     in line after a drip lesson, else the first unlearned one. A paged lesson
     goes through the usual maybeTip path, so the daily drip never re-teaches
     it. */
  function advanceCoachmark() {
    let tip = null, idx = null;
    if (coachDripIdx !== null && coachDripIdx + 1 < DRIP_TIPS.length) {
      idx = coachDripIdx + 1;
      tip = DRIP_TIPS[idx];
    } else {
      tip = nextLessonTip();
      idx = tip ? DRIP_TIPS.indexOf(tip) : null;
    }
    const item = coachItem;
    dismissCoachmark();
    // the Self/Kin drawer covers the whole screen on small layouts — but keep
    // it open when the next lesson lives inside it (Self → Kin), so the lit
    // tab there is exposed
    const nextInDrawer = !!(tip && tip.target &&
      tip.target.indexOf('#lefttabs') === 0);
    if (!nextInDrawer && SH.closeSelfDrawer) SH.closeSelfDrawer();
    // an over-sheet lesson closes the menu sheet behind it when the next
    // lesson lives outside it (an open sheet would just block that lesson);
    // menu lessons chain above the open sheet
    if (item && item.closeMenuOnNext && !(tip && tip.overTarget) &&
        UI.closeModal) {
      UI.closeModal();
    }
    if (tip) showDripTip(tip, idx);
  }

  /* Back: rewind one tour stop. A review showing — already recorded, so it
     goes straight up, untouched and unrecorded. Rewinding to a menu lesson
     reopens the sheet so the stop shows above it. */
  function rewindCoachmark() {
    const target = coachTourItem(coachBackIdx());
    if (!target) return;
    const item = coachItem;
    dismissCoachmark();
    const backInDrawer = target.target &&
      target.target.indexOf('#lefttabs') === 0;
    if (!backInDrawer && SH.closeSelfDrawer) SH.closeSelfDrawer();
    if (target.overTarget) {
      // a menu lesson's stage is the open sheet: bring it back up — closing
      // the sheet only hides it, so a stale m-save cannot speak for it
      const gm = $('genmodal');
      const sheetUp = !!(gm && !gm.classList.contains('hidden') && $('m-save'));
      if (!sheetUp && UI.showMenu) UI.showMenu();
    } else if (item && item.overModal && UI.closeModal) {
      UI.closeModal(); // rewinding out of the sheet to a lesson it would block
    }
    UI.coachmark(target.text, target.target, {
      dripIdx:target.dripIdx, freeNext:target.freeNext,
      overTarget:target.overTarget, overText:target.overText || null,
      touchAlso:target.touchAlso || null,
      touchHover:target.touchHover || null
    });
  }

  function showDripTip(tip, idx) {
    if (UI.maybeTip(tip.id, tip.text, tip.target)) return; // records it
    // already taught → a review showing; silenced layers show nothing
    if (tipsSilenced()) return;
    UI.coachmark(tip.text, tip.target, {
      dripIdx:idx, freeNext:tip.freeNext, overTarget:tip.overTarget,
      overText:tip.overText || null, touchAlso:tip.touchAlso || null,
      touchHover:tip.touchHover || null
    });
  }

  /* Anchored under the target when it sits high on the screen, over it when
     it sits low; a huge area (the map) is pointed at near its top edge, and
     a missing or hidden target drops the arrow and rests by the toast
     corner instead. */
  function positionCoachmark(targetSel) {
    const target = coachTargetEl(targetSel);
    const rect = target ? target.getBoundingClientRect() : null;
    const vw = window.innerWidth, vh = window.innerHeight;
    if (!rect) {
      coachEl.classList.add('noarrow');
      return;
    }
    coachLit = target;
    target.classList.add('coachmark-lit');
    const w = coachEl.offsetWidth, h = coachEl.offsetHeight;
    // only a truly tall area (the map) is pointed at near its top edge; a
    // full-width but short bar (the mobile time controls) gets the ordinary
    // treatment, so the lesson sits above it pointing down, never over it
    const huge = rect.height > vh * 0.45;
    const ax = rect.left + rect.width / 2;
    const below = huge || rect.top + rect.height / 2 < vh * 0.45;
    const ay = huge ? rect.top + 56 : (below ? rect.bottom : rect.top);
    const left = Math.max(8, Math.min(Math.round(ax - w / 2), vw - w - 8));
    const top = Math.max(8,
      Math.min(Math.round(below ? ay + 12 : ay - h - 12), vh - h - 8));
    coachEl.style.left = left + 'px';
    coachEl.style.top = top + 'px';
    coachEl.classList.add(below ? 'arrow-top' : 'arrow-bottom');
    const arrow = coachEl.querySelector('.coachmark-arrow');
    arrow.style.left = Math.max(14, Math.min(Math.round(ax - left), w - 14)) + 'px';
  }

  /* On small layouts the Self/Kin tabs sit in a drawer that a portrait tap
     exposes; when a lesson's target is off the screen that way, point at the
     control that reveals it instead. */
  const COACH_ALT_TARGETS = {
    '#lefttabs .tab[data-tab="char"]':'#tb-portrait',
    '#lefttabs .tab[data-tab="family"]':'#tb-portrait'
  };
  function coachTargetEl(targetSel) {
    if (typeof targetSel !== 'string') return null;
    const el = document.querySelector(targetSel);
    if (coachTargetOnScreen(el)) return el;
    const alt = COACH_ALT_TARGETS[targetSel];
    const altEl = alt ? document.querySelector(alt) : null;
    return coachTargetOnScreen(altEl) ? altEl : null;
  }
  function coachTargetOnScreen(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0 && r.top === 0 && r.left === 0) {
      return false; // display:none (e.g. the closed Self/Kin drawer)
    }
    return r.bottom >= 0 && r.top <= window.innerHeight &&
      r.right >= 0 && r.left <= window.innerWidth;
  }

  function dismissCoachmark() {
    clearCoachTouch();
    coachNext = null;
    coachItem = null;
    coachDripIdx = null;
    if (coachEl && coachEl.parentNode) coachEl.parentNode.removeChild(coachEl);
    coachEl = null;
    if (coachLit) {
      coachLit.classList.remove('coachmark-lit');
      coachLit = null;
    }
    // a queued lesson follows once the screen settles
    if (coachQueue.length) {
      setTimeout(function () { UI.maybeShowCoachmark(); }, 250);
    }
  }

  /* ================= beginner hints (each fires once per save) =================
     One-line, just-in-time lessons delivered at the moment they first matter.
     The whole layer goes quiet when Settings hides beginner hints, and every
     hint is a per-save flag so a life teaches each lesson exactly once. */
  UI.hintDue = function (id) {
    const s = FB.state;
    if (!s || !s.player || FB.game.observe) return false;
    if (FB.game.uiPrefs && FB.game.uiPrefs.hideBeginnerHints) return false;
    if (!s.player.flags) s.player.flags = {};
    if (s.player.flags['hint_' + id]) return false;
    s.player.flags['hint_' + id] = 1;
    return true;
  };
  UI.maybeHint = function (id, text, target) {
    if (!UI.hintDue(id)) return false;
    UI.coachmark(text, target);
    return true;
  };

  /* ================= first-time player tips =================
     Short, useful lessons for a brand-new player, told once ever per install:
     a day-by-day drip of UI orientation on the first natural days (fired from
     the day ticker), plus contextual one-liners fired from engine choke points
     the first time a situation occurs. Each lesson shows as a coachmark
     pointing at the control or area it teaches (the target selectors below),
     open until dismissed. Fired tips are recorded in the
     browser-local uiPrefs.tipsSeen, so no save ever re-teaches them. The layer
     falls silent under its own Settings switch (hideTips), under the wider
     guide-hints switch (hideBeginnerHints), or when the install was
     grandfathered in with an existing save (tipsGrandfathered). */
  const DRIP_TIPS = [
    { id:'drip-controls', target:'#btn-menu', overTarget:'#m-settings',
      text:'💡 The game controls live in the Settings. The menu (Esc or ☰) opens the way to them.',
      overText:'💡 Settings holds the game controls. The speed of the days is set here (on desktop, − and + change it at any time).' },
    { id:'drip-guide', target:'#btn-menu', overTarget:'#m-help', text:'💡 ❓ How to play in the menu opens the Guide, every system explained in depth.' },
    { id:'drip-speed', target:'#timebtns', freeNext:true, text:'💡 ▶ Play runs the game one day at a time, while ▶▶ fast forward leaps a full season. Slow or quicken the flow with − and + (or Settings).' },
    { id:'drip-deeds', target:'#sidetabs .tab[data-tab="actions"]', touchAlso:'#tab-actions', text:'💡 The Deeds tab (D) is where things get done: a daily focus that repeats, and one-shot deeds that spend the day.' },
    { id:'drip-self', target:'#lefttabs .tab[data-tab="char"]', touchAlso:'#tab-char', text:'💡 The Self tab (S) is your character: skills, traits, and belongings.' },
    { id:'drip-kin', target:'#lefttabs .tab[data-tab="family"]', text:'💡 The Kin tab (K) is your family: spouse, children, and kin. Tap a child to guide their education.' },
    { id:'drip-land', target:'#sidetabs .tab[data-tab="prov"]', text:'💡 The Land tab (L) looks at any county up close: buy plots, and manage what you hold.' },
    { id:'drip-network', target:'#sidetabs .tab[data-tab="network"]', text:'💡 The Network tab (N) lists the ties around your household: connections, retainers, guilds, and courts, and what each tie currently does.' },
    { id:'drip-chronicle', target:'#sidetabs .tab[data-tab="log"]', text:'💡 The Chronicle tab (C) remembers the story: every piece of news and every choice you make.' },
    { id:'drip-topbar', target:'#tb-stats', touchHover:true, text:'💡 The top bar keeps the date, the flow of days, and your stats. Hover or tap gold, prestige, piety, or voice for a breakdown.' },
    { id:'drip-toasts', target:'#toasts', text:'💡 These corner notes fade on their own. Tap one to dismiss it sooner.' }
  ];

  /* the gates under which any first-time tip may fire at all */
  function tipsSilenced() {
    const s = FB.state;
    if (!s || !s.player || FB.game.observe) return true;
    const prefs = FB.game.uiPrefs;
    if (!prefs || prefs.hideTips || prefs.hideBeginnerHints ||
        prefs.tipsGrandfathered) return true;
    return false;
  }
  /* the next unlearned orientation lesson, looked up without consuming it */
  function nextLessonTip() {
    if (tipsSilenced()) return null;
    const seen = FB.game.uiPrefs.tipsSeen || {};
    for (const tip of DRIP_TIPS) {
      if (!seen[tip.id]) return tip;
    }
    return null;
  }
  UI.tipDue = function (id) {
    if (tipsSilenced()) return false;
    const prefs = FB.game.uiPrefs;
    if (!prefs.tipsSeen) prefs.tipsSeen = {};
    if (prefs.tipsSeen[id]) return false;
    prefs.tipsSeen[id] = 1;
    if (FB.game.saveUiPrefs) FB.game.saveUiPrefs();
    return true;
  };
  function dripEntryById(id) {
    for (let i = 0; i < DRIP_TIPS.length; i++) {
      if (DRIP_TIPS[i].id === id) return { tip:DRIP_TIPS[i], idx:i };
    }
    return null;
  }
  UI.maybeTip = function (id, text, target) {
    if (!UI.tipDue(id)) return false;
    const entry = dripEntryById(id);
    UI.coachmark(text, target, entry ? {
      dripIdx:entry.idx, freeNext:entry.tip.freeNext,
      overTarget:entry.tip.overTarget, overText:entry.tip.overText || null,
      touchAlso:entry.tip.touchAlso || null,
      touchHover:entry.tip.touchHover || null
    } : null);
    return true;
  };
  UI.dailyTip = function () {
    for (const tip of DRIP_TIPS) {
      if (UI.maybeTip(tip.id, tip.text, tip.target)) return true;
    }
    return false;
  };

  /* ================= map politics hookup ================= */
  /* Rebuilding the map base image is the priciest paint in the game, and one
     world tick can transfer several provinces — coalesce to a single rebuild
     on the next frame (before the render: rAF callbacks run in queue order). */
  let mapDirtyQueued = false;
  let mapDirtyDeferredForFastForward = false;
  UI.mapDirty = function () {
    if (FB.game && FB.game.fastForwarding) {
      mapDirtyDeferredForFastForward = true;
      return;
    }
    if (mapDirtyQueued) return;
    mapDirtyQueued = true;
    requestAnimationFrame(function () {
      mapDirtyQueued = false;
      if (FB.game && FB.game.fastForwarding) {
        mapDirtyDeferredForFastForward = true;
        return;
      }
      mapDirtyNow();
    });
  };
  UI.fastForwardFinished = function () {
    if (mapDirtyDeferredForFastForward) {
      mapDirtyDeferredForFastForward = false;
      UI.mapDirty();
    }
    if (UI.flushFastForwardRefresh) UI.flushFastForwardRefresh();
    else if (UI.refresh) UI.refresh();
    if (FB.map && FB.map.flushFastForwardRender) {
      FB.map.flushFastForwardRender();
    } else if (FB.map && FB.map.request) FB.map.request();
    if (fastForwardReceipt) {
      const receipt = fastForwardReceipt;
      fastForwardReceipt = null;
      UI.eventReceiptToast(receipt);
    }
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
      function (rid) {
        if (rid === 'player' && FB.map.focusColor) return FB.map.focusColor();
        return s.realms[rid] ? s.realms[rid].color : '#777777';
      },
      caps,
      function (pid) { return s.holder ? s.holder[pid] : s.owner[pid]; },
      function (rid) {
        return rid === 'player' && FB.map.focusOpacity
          ? FB.map.focusOpacity() : 1;
      }
    );
    FB.map.buildBase();
    FB.map.select(FB.map.selected, SH.mapGroupOf); // realm highlight tracks conquests
    FB.map.request();
  }


  /* hotkey badge for the Nth list item: 1-9, then ⇧1-⇧9 */
  function hintFor(n) {
    if (FB.isTouch) return '';
    if (n < 9) return '<span class="keyhint">' + (n + 1) + '</span>';
    if (n < 18) return '<span class="keyhint">⇧' + (n - 8) + '</span>';
    return '';
  }
  UI.hintFor = hintFor;

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

  function modalGuideConfig(guide) {
    if (!guide || !guide.entry) return null;
    return {
      id:guide.id || '', entry:String(guide.entry),
      label:guide.label || FB.T('Guide')
    };
  }

  function setModalGuide(guide) {
    const heading = $('gm-title').parentNode;
    const existing = heading.querySelector('.modal-guide-button');
    if (existing) heading.removeChild(existing);
    heading.classList.remove('has-modal-guide');
    if (!guide) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'modal-guide-button';
    if (guide.id) button.id = guide.id;
    button.setAttribute('aria-label', guide.label);
    button.title = guide.label;
    button.dataset.modalGuide = guide.entry;
    button.textContent = 'i';
    button.addEventListener('click', function () {
      if (UI.showGuideEntry) UI.showGuideEntry(guide.entry);
    });
    heading.classList.add('has-modal-guide');
    heading.appendChild(button);
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
    view.guide = modalGuideConfig(genericNavSnapshot && genericNavSnapshot.guide);
    view.focus = document.activeElement && $('genmodal').contains(document.activeElement)
      ? document.activeElement : null;
    while (body.firstChild) view.body.appendChild(body.firstChild);
  }

  function restoreModalView(view) {
    const gm = $('genmodal');
    const body = $('gm-body');
    while (body.firstChild) body.removeChild(body.firstChild);
    $('gm-title').textContent = view.title;
    setModalGuide(view.guide);
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
      token:view.token,
      guide:modalGuideConfig(view.guide)
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
    UI._gmNoHotkeys = genericNavSnapshot.noHotkeys;
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
    UI._gmNoHotkeys = false;
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
    const modalBody = $('gm-body');
    const previousLargeList = modalBody &&
      modalBody.querySelector('[data-large-list-surface]');
    if (previousLargeList) {
      saveLargeListScroll(
        previousLargeList.getAttribute('data-large-list-surface'));
    }
    if (modalBody) modalBody._largeListScrollSurface = null;
    const wasHidden = gm.classList.contains('hidden');
    const replacingView = !wasHidden && opts && opts.replaceView;
    const retainedNavigation = replacingView && genericNavSnapshot
      ? genericNavSnapshot : null;
    let previousView = null;
    if (!wasHidden && !replacingView && opts && opts.historyView &&
      !mobileNavApplying &&
      mobileNavEnsure()) {
      previousView = {};
      captureModalView(previousView);
    }
    UI._gmDismiss = !(opts && opts.dismissable === false);
    UI._gmNoHotkeys = !!(opts && opts.noHotkeys);
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
    const guide = modalGuideConfig(opts && opts.guide);
    setModalGuide(guide);
    $('gm-body').innerHTML = bodyHtml;
    normalizeModalFooter($('gm-body'));
    FB.localizeTree($('gm-body'));
    $('gm-body').scrollTop = 0; // a reused body keeps the last dialog's scroll
    if (!FB.isTouch && !UI._gmNoHotkeys) {
      const btns = $('gm-body').querySelectorAll('.actionbtn, .settcard-raise');
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
    const currentViewToken = retainedNavigation
      ? retainedNavigation.token : ++genericViewSerial;
    genericNavSnapshot = {
      dismiss:retainedNavigation
        ? retainedNavigation.dismiss : UI._gmDismiss,
      noHotkeys:retainedNavigation
        ? retainedNavigation.noHotkeys : UI._gmNoHotkeys,
      historyBack:retainedNavigation
        ? retainedNavigation.historyBack : !!(opts && opts.historyBack),
      returnFocus:retainedNavigation
        ? retainedNavigation.returnFocus : UI._gmReturnFocus,
      returnAction:retainedNavigation
        ? retainedNavigation.returnAction : UI._gmReturnAction,
      modalClass:UI._gmModalClass,
      noFocus:!!(opts && opts.noFocus),
      token:currentViewToken,
      guide:guide
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
    setTimeout(function () {
      if (UI.maybeShowCoachmark) UI.maybeShowCoachmark();
    }, 0);
  };

  /* ================= boot-time wiring ================= */
  UI.wire = function () {
    FB.fx.on(function (intent) {
      if (intent.kind !== 'toast') return;
      if (FB.game.observe && FB.game.obsQuiet) return;
      UI.toastMessage(intent.message, intent.legacyText);
    });
    document.querySelectorAll('#sidetabs .tab[data-tab], #lefttabs .tab[data-tab]').forEach(function (t) {
      t.addEventListener('click', function () { SH.setTab(t.dataset.tab); });
    });
    // the topbar portrait opens your own sheet (a drawer on phones)
    $('tb-portrait').addEventListener('click', function () {
      if (FB.state) UI.showTab('char');
    });
    // index.html's 30x34 attributes are the no-JS layout fallback
    FB.sizeFaceCanvas($('tb-portrait'), 30, 34);
    $('btn-closeself').addEventListener('click', SH.closeSelfDrawer);
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
      if (!UI.eventsBusy() && !FB.game.fastForwarding) {
        FB.game.setPaused(true);
        FB.game.skipAhead();
      }
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
    const btnMusic = $('btn-music');
    if (btnMusic) {
      btnMusic.addEventListener('click', function () {
        if (UI.toggleMusicOverlay) UI.toggleMusicOverlay();
      });
    }
    $('btn-marketlens').addEventListener('click', function () {
      UI.setMarketLens(!FB.map.marketGood);
    });
    const btnFind = $('btn-find');
    if (btnFind) {
      btnFind.addEventListener('click', function () {
        if (UI.toggleFindOverlay) UI.toggleFindOverlay();
      });
    }
    if (UI.initFindOverlayEvents) UI.initFindOverlayEvents();
    const marketGood = $('market-lens-good');
    if (marketGood) {
      let marketOptions = '';
      for (const id in FBDATA.marketGoods) {
        const def = FBDATA.marketGoods[id];
        marketOptions += '<option value="' + id + '">' +
          esc((def.icon || '') + ' ' + FB.T(def.name)) + '</option>';
      }
      marketGood.innerHTML = marketOptions;
      marketGood.value = 'provisions';
      marketGood.addEventListener('change', function () {
        FB.map.marketGood = marketGood.value;
        FB.map.request();
      });
    }
    $('market-lens-details').addEventListener('click', function () {
      if (FB.ui.showMarket && FB.state) {
        FB.ui.showMarket(FB.map.selected || FB.state.player.provinceId,
          FB.map.marketGood || 'provisions');
      }
    });
    $('travel-picker-cancel').addEventListener('click', function () {
      UI.cancelTravelPicker(false);
    });
    $('travel-picker-continue').addEventListener('click', SH.reviewTravelChoice);

    const raidCancel = $('raid-picker-cancel');
    if (raidCancel) {
      raidCancel.addEventListener('click', function () {
        if (UI.closeRaidMapPicker) UI.closeRaidMapPicker(false);
      });
    }
    const raidList = $('raid-picker-list');
    if (raidList) {
      raidList.addEventListener('click', function () {
        if (UI.returnToRaidList) UI.returnToRaidList();
      });
    }
    const raidStrat = $('raid-picker-strategy');
    if (raidStrat) {
      raidStrat.addEventListener('change', function () {
        if (UI.raidStrategyChanged) UI.raidStrategyChanged(raidStrat.value);
      });
    }
    const raidLaunch = $('raid-picker-launch');
    if (raidLaunch) {
      raidLaunch.addEventListener('click', function () {
        if (UI.executeRaidFromMap) UI.executeRaidFromMap();
      });
    }

    /* Map tap precedence. A settlement marker hit carries its parent county
       into every targeting mode, so a marker never blocks the county beneath
       it; only ordinary browsing additionally opens the settlement sheet. The
       birthplace picker's settlement stage is the one exception — it consumes
       the marker itself. */
    FB.map.onTap = function (pr, wx, wy, site) {
      // a marker hit resolves to its parent county for every targeting mode
      if (site && FB.world && FB.world.byId) {
        const parent = FB.world.byId[site.pid];
        if (parent) pr = parent;
      }
      if (FB.game.pickMode) {
        /* settlement stage: a marker in the chosen county is the birthplace
           (the collapse above rewrites only pr, never site) */
        if (site && FB.game.pickSettlement && FB.game.pickSettlement(site)) return;
        FB.game.pickProvince(pr);
        return;
      }
      if (UI.travelPickerOpen()) {
        if (pr) UI.travelPickProvince(pr.id, false);
        return;
      }
      if (UI.raidPickerOpen && UI.raidPickerOpen()) {
        if (pr) UI.raidPickProvince(pr.id, false);
        return;
      }
      const s = FB.state;
      // armies first: select your host, or march the selected host somewhere
      if (s && FB.armyTap && FB.armyTap(s, pr, wx, wy)) return;
      if (pr) UI.selectProvince(pr.id);
      // ordinary browsing: the parent county is selected above, so the map
      // highlight and sheet context agree — open the exact settlement
      if (site && pr && s && s.player && !FB.game.observe && !UI.eventsBusy()) {
        UI.showSettlement(site.pid, site.index);
      }
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
      let hideTipTimer = null;
      function cancelHideTip() {
        if (hideTipTimer) {
          clearTimeout(hideTipTimer);
          hideTipTimer = null;
        }
      }
      function scheduleHideTip() {
        if (hideTipTimer) return;
        hideTipTimer = setTimeout(function () {
          hideTipTimer = null;
          tip.classList.add('hidden');
          resetTipSize();
        }, 160);
      }
      function hideTipImmediately() {
        cancelHideTip();
        tip.classList.add('hidden');
        resetTipSize();
      }
      tip.addEventListener('mouseenter', cancelHideTip);
      tip.addEventListener('mouseleave', scheduleHideTip);
      function resetTipSize() {
        tip.style.width = '';
        tip.style.maxWidth = '';
        tip.style.maxHeight = '';
        tip.style.overflowY = '';
        tip.style.boxSizing = '';
      }
      function showSideTip(anchorEl, detailsHtml) {
        if (!detailsHtml) return false;
        cancelHideTip();
        const edge = 8;
        const gap = 10;
        const width = Math.min(320, Math.max(180,
          window.innerWidth - edge * 2));
        tip.style.boxSizing = 'border-box';
        tip.style.width = width + 'px';
        tip.style.maxWidth = width + 'px';
        const maxH = Math.max(120, window.innerHeight - edge * 2);
        tip.style.maxHeight = maxH + 'px';
        tip.style.overflowY = 'auto';
        tip.innerHTML = detailsHtml;
        tip.classList.remove('hidden');
        const r = anchorEl.getBoundingClientRect();
        const tr = tip.getBoundingClientRect();
        let left = r.right + gap;
        if (left + tr.width > window.innerWidth - edge) {
          left = r.left - gap - tr.width;
        }
        left = Math.max(edge, Math.min(
          window.innerWidth - edge - tr.width, left));
        let top = Math.max(edge, Math.min(r.top,
          window.innerHeight - edge - tr.height));
        if (tr.height + edge * 2 >= window.innerHeight) {
          top = edge;
        }
        tip.style.left = left + 'px';
        tip.style.top = top + 'px';
        return true;
      }
      function showEventChoiceTip(control) {
        if (eventChoiceUsesDisclosure()) return false;
        const row = control && control.closest
          ? control.closest('.event-choice') : null;
        const details = row && row.querySelector('.event-choice-details');
        if (!details) return false;
        return showSideTip(control, details.innerHTML);
      }
      function showBuildingActionTip(control) {
        const btn = control && control.closest
          ? control.closest('.actionbtn') : null;
        const details = btn && btn.querySelector('.event-choice-details');
        if (!details) return false;
        return showSideTip(btn, details.innerHTML);
      }
      function showSettCardTip(infoBtn) {
        const btn = infoBtn.classList && infoBtn.classList.contains('settcard-info')
          ? infoBtn : (infoBtn.querySelector ? infoBtn.querySelector('.settcard-info') : null);
        const detId = btn ? btn.getAttribute('aria-controls') : infoBtn.getAttribute('aria-controls');
        const details = detId && $(detId);
        if (!details) { scheduleHideTip(); return false; }
        const card = (btn && btn.closest('.settcard')) || (infoBtn.closest && infoBtn.closest('.settcard')) || infoBtn;
        return showSideTip(card, details.innerHTML);
      }
      document.addEventListener('mouseover', function (e) {
        if (!e.target || !e.target.closest) { scheduleHideTip(); return; }
        if (e.target.closest('#tooltip')) {
          cancelHideTip();
          return;
        }
        const eventChoice = e.target.closest('.event-choice .evopt');
        if (eventChoice) {
          if (showEventChoiceTip(eventChoice)) return;
          scheduleHideTip();
          return;
        }
        const bldBtn = e.target.closest('#gm-body .actionbtn[data-build], #gm-body .actionbtn[data-bquick]');
        if (bldBtn) {
          if (showBuildingActionTip(bldBtn)) return;
          scheduleHideTip();
          return;
        }
        const settCard = e.target.closest('.settcard');
        if (settCard) {
          if (showSettCardTip(settCard)) return;
          scheduleHideTip();
          return;
        }
        // hovering a topbar resource shows what feeds it, season by season
        const statEl = e.target.closest('#tb-stats .stat[data-stat]');
        if (statEl && FB.state && !FB.game.observe) {
          cancelHideTip();
          resetTipSize();
          tip.innerHTML = SH.statBreakdownHtml(statEl.getAttribute('data-stat'));
          tip.classList.remove('hidden');
          const sr = statEl.getBoundingClientRect();
          tip.style.left = Math.max(4, Math.min(window.innerWidth - 250, sr.left)) + 'px';
          tip.style.top = Math.min(window.innerHeight - 110, sr.bottom + 6) + 'px';
          return;
        }
        const chip = e.target.closest('.traitchip[data-trait], .traitchip[data-ailment], .traitchip[data-item], .traitchip[data-itemview], .modifierchip[data-modifier]');
        if (!chip) { scheduleHideTip(); return; }
        cancelHideTip();
        if (chip.hasAttribute('data-modifier')) {
          const id = chip.getAttribute('data-modifier');
          const scope = chip.getAttribute('data-modifier-scope') === 'county'
            ? 'county' : 'campaign';
          const pid = chip.getAttribute('data-modifier-pid');
          const def = FBDATA.modifiers && FBDATA.modifiers[id];
          const record = FB.state && modifierRecord(FB.state, id, scope, pid);
          if (!def || !record) { scheduleHideTip(); return; }
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
          if (!t) { scheduleHideTip(); return; }
          const fx = traitFxText(t);
          const tid = chip.getAttribute('data-trait');
          tip.innerHTML = '<b>' + t.icon + ' ' + esc(dt(FB.state, 'trait', tid, t, 'name')) +
            '</b><br>' + esc(FB.T('Class: {className}', {
              className:SH.traitClassName(t)
            })) + '<br>' + esc(dt(FB.state, 'trait', tid, t, 'desc')) +
            (t.earned ? '<br><i>' + esc(FB.T('Earned: {guidance}', {
              guidance:dt(FB.state, 'trait', tid, t, 'earned')
            })) + '</i>' : '') +
            (fx ? '<br><i>' + esc(fx) + '</i>' : '');
        } else {
          const iid = chip.getAttribute('data-item') || chip.getAttribute('data-itemview');
          const item = FB.state && FB.resolveItem(FB.state, iid);
          if (!item) { scheduleHideTip(); return; }
          const ifx = SH.itemFxText(item);
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
      document.addEventListener('click', function (e) {
        if (!e.target || !e.target.closest) return;
        const fortTech = e.target.closest('[data-fort-tech]');
        if (fortTech && fortTech.dataset.fortTech) {
          hideTipImmediately();
          const bpid = fortTech.dataset.fortPid || (FB.state && FB.state.player && FB.state.player.provinceId);
          const bidx = fortTech.dataset.fortIdx !== undefined ? Number(fortTech.dataset.fortIdx) : 0;
          UI.showTechDetail(fortTech.dataset.fortTech, function () {
            UI.showSettlement(bpid, bidx);
          });
          return;
        }
        const fortStart = e.target.closest('[data-fort-start]');
        if (fortStart && fortStart.dataset.fortStart) {
          const pid = fortStart.dataset.fortPid || (FB.state && FB.state.player && FB.state.player.provinceId);
          const idx = fortStart.dataset.fortIdx !== undefined ? Number(fortStart.dataset.fortIdx) : 0;
          const targetLevel = Number(fortStart.dataset.fortStart);
          hideTipImmediately();
          UI.showFortProject(pid, idx, targetLevel);
          return;
        }
      });
      document.addEventListener('focusin', function (e) {
        if (!e.target || !e.target.closest) return;
        if (e.target.closest('#tooltip')) {
          cancelHideTip();
          return;
        }
        const bldBtnFocus = e.target.closest('#gm-body .actionbtn[data-build], #gm-body .actionbtn[data-bquick]');
        if (bldBtnFocus) {
          if (showBuildingActionTip(bldBtnFocus)) return;
          scheduleHideTip();
          return;
        }
        const settCardFocus = e.target.closest('.settcard');
        if (settCardFocus) {
          if (showSettCardTip(settCardFocus)) return;
          scheduleHideTip();
          return;
        }
        const eventChoice = e.target.closest('.event-choice .evopt');
        if (eventChoice && !showEventChoiceTip(eventChoice)) {
          scheduleHideTip();
        }
      });
      document.addEventListener('focusout', function (e) {
        if (!e.target || !e.target.closest) { scheduleHideTip(); return; }
        if (e.relatedTarget && e.relatedTarget.closest &&
            (e.relatedTarget.closest('#tooltip') ||
             e.relatedTarget.closest('.settcard') ||
             e.relatedTarget.closest('.event-choice .evopt') ||
             e.relatedTarget.closest('#gm-body .actionbtn[data-build], #gm-body .actionbtn[data-bquick]'))) {
          return;
        }
        scheduleHideTip();
      });
    }
  };

  function signedTraitEffect(value) {
    const rounded = Math.round(value * 1000) / 1000;
    return (rounded > 0 ? '+' : '') + rounded;
  }

  function siblingCourtshipTraitEffect(key, value) {
    const labels = {
      siblingInitiate:FB.T('Exceptional sibling approach'),
      siblingDynasticInitiate:FB.T('Dynastic sibling approach'),
      siblingRiteInitiate:FB.T('Recognized-rite sibling approach'),
      siblingTabooInitiate:FB.T('Illicit sibling approach'),
      siblingAccept:FB.T('Response to a sibling approach'),
      siblingRiteAccept:FB.T('Response under a recognized rite'),
      siblingIllicitAccept:FB.T('Response to an illicit approach'),
      siblingTabooAccept:FB.T('Response where the union is taboo'),
      siblingDynasticAccept:FB.T('Response to a dynastically relevant approach'),
      siblingProposal:FB.T('Sibling marriage proposal'),
      siblingRiteProposal:FB.T('Proposal under a recognized rite'),
      siblingTabooProposal:FB.T('Proposal where the union is taboo'),
      siblingDynasticProposal:FB.T('Dynastically relevant proposal'),
      siblingExposure:FB.T('Illicit sibling-courtship exposure')
    };
    if (!Object.prototype.hasOwnProperty.call(labels, key)) return null;
    const initiation = /Initiate$/.test(key);
    return {
      label:labels[key],
      value:value === 0 ? FB.T('No effect') : (value > 0
        ? (initiation ? FB.T('Encourages') : FB.T('More likely'))
        : (initiation ? FB.T('Discourages') : FB.T('Less likely')))
    };
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
        const siblingCourtship = group === 'courtship'
          ? siblingCourtshipTraitEffect(key, value) : null;
        if (siblingCourtship) {
          label = siblingCourtship.label;
          shown = siblingCourtship.value;
        } else if (id === 'assembly.voteChance') {
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

  /* ===== shared exports (bound by the later UI files) ===== */
  SH.$ = $;
  SH.allianceText = allianceText;
  SH.automationAccess = automationAccess;
  SH.assetEffectSummary = assetEffectSummary;
  SH.assetCard = assetCard;
  SH.assetMoneyCost = assetMoneyCost;
  SH.assetSeasonalMoneyCost = assetSeasonalMoneyCost;
  SH.assetSummaryValue = assetSummaryValue;
  SH.bindCardInfoToggles = bindCardInfoToggles;
  SH.bookmarkDevelopmentText = bookmarkDevelopmentText;
  SH.characterStandingContext = characterStandingContext;
  SH.childIdentityPreviewText = childIdentityPreviewText;
  SH.closeEquipmentPickerRaw = closeEquipmentPickerRaw;
  SH.councilSeatDesc = councilSeatDesc;
  SH.councilSeatName = councilSeatName;
  SH.countyCountText = countyCountText;
  SH.cultureName = cultureName;
  SH.dt = dt;
  SH.epithetText = epithetText;
  SH.esc = esc;
  SH.eventChoiceUsesDisclosure = eventChoiceUsesDisclosure;
  SH.eventModifierPreview = eventModifierPreview;
  SH.firstMissingTech = firstMissingTech;
  SH.foreignPolicyStanceText = foreignPolicyStanceText;
  SH.foreignPolicyStatusText = foreignPolicyStatusText;
  SH.heirEligibilityText = heirEligibilityText;
  SH.hintFor = hintFor;
  SH.captureModalView = captureModalView;
  SH.householdStandardLevelDesc = householdStandardLevelDesc;
  SH.householdStandardLevelName = householdStandardLevelName;
  SH.householdStandardName = householdStandardName;
  SH.householdStandardsSummary = householdStandardsSummary;
  SH.initLargeListSurface = initLargeListSurface;
  SH.interactionCardHtml = interactionCardHtml;
  SH.kv = kv;
  SH.largeListRowAttrs = largeListRowAttrs;
  SH.largeListStateLabel = largeListStateLabel;
  SH.largeListSurfaceHtml = largeListSurfaceHtml;
  SH.largeListViews = largeListViews;
  SH.menText = menText;
  SH.mobileLayoutNow = mobileLayoutNow;
  SH.mobileNavClosed = mobileNavClosed;
  SH.mobileNavClosedAll = mobileNavClosedAll;
  SH.mobileNavEnsure = mobileNavEnsure;
  SH.mobileNavPush = mobileNavPush;
  SH.mobileNavRequestBack = mobileNavRequestBack;
  SH.modalHistoryBack = modalHistoryBack;
  SH.modifierChips = modifierChips;
  SH.modifierDurationText = modifierDurationText;
  SH.modifierEffectText = modifierEffectText;
  SH.modifierRecord = modifierRecord;
  SH.modifierSourceText = modifierSourceText;
  SH.normalizeModalFooter = normalizeModalFooter;
  SH.openModal = openModal;
  SH.panelh = panelh;
  SH.personAssignmentCard = personAssignmentCard;
  SH.positionDesc = positionDesc;
  SH.positionEffectText = positionEffectText;
  SH.positionName = positionName;
  SH.rarityName = rarityName;
  SH.realmStandingContext = realmStandingContext;
  SH.refreshLargeListKeyhints = refreshLargeListKeyhints;
  SH.religionName = religionName;
  SH.replacePanelMarkup = replacePanelMarkup;
  SH.researchNumber = researchNumber;
  SH.resetPanelMarkup = resetPanelMarkup;
  SH.restoreModalView = restoreModalView;
  SH.rivalryHeatName = rivalryHeatName;
  SH.roleName = roleName;
  SH.settlementDevelopmentText = settlementDevelopmentText;
  SH.settlementChangeName = settlementChangeName;
  SH.settlementKindName = settlementKindName;
  SH.signedNumber = signedNumber;
  SH.socialAttentionSummary = socialAttentionSummary;
  SH.standingBand = standingBand;
  SH.standingClass = standingClass;
  SH.standingEffectRow = standingEffectRow;
  SH.standingSpan = standingSpan;
  SH.standingText = standingText;
  SH.standingValue = standingValue;
  SH.techCostEstimateText = techCostEstimateText;
  SH.techDevelopmentScore = techDevelopmentScore;
  SH.techEstimatedSeasons = techEstimatedSeasons;
  SH.techRequirementText = techRequirementText;
  SH.technologyName = technologyName;
  SH.terrainName = terrainName;
  SH.traitGroupedEffects = traitGroupedEffects;
  SH.wireInteractionCard = wireInteractionCard;
})();
