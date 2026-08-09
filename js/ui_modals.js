/* Fallowborn — UI: event modal, autoresolve, and every dialog sheet (split from ui.js). Loads after
   ui_misc.js; shares internals through FB.ui._shared. */
/* Contents: autoresolve · event modal · overland travel picker · war target picker · settlement picker · plot picker · envoy picker · political attention picker · liege-chain pickers · coin & credit · household standards & permanent holdings · freehold land market · consolidated household plan · household livelihoods & enterprises · national technology · character sheet & trait dialogs · death & succession · menu · settings */
window.FB = window.FB || {};

(function () {
  'use strict';

  const UI = FB.ui;
  const SH = UI._shared;
  const $ = SH.$;
  const ACTION_SHORTCUT_KEYS = SH.ACTION_SHORTCUT_KEYS;
  const actionShortcutStatus = SH.actionShortcutStatus;
  const allianceText = SH.allianceText;
  const automationAccess = SH.automationAccess;
  const assetEffectSummary = SH.assetEffectSummary;
  const assetMoneyCost = SH.assetMoneyCost;
  const assetSeasonalMoneyCost = SH.assetSeasonalMoneyCost;
  const assetSummaryValue = SH.assetSummaryValue;
  const bookmarkDevelopmentText = SH.bookmarkDevelopmentText;
  const characterStandingContext = SH.characterStandingContext;
  const childIdentityPreviewText = SH.childIdentityPreviewText;
  const closeEquipmentPickerRaw = SH.closeEquipmentPickerRaw;
  const councilSeatDesc = SH.councilSeatDesc;
  const councilSeatName = SH.councilSeatName;
  const countyCountText = SH.countyCountText;
  const dt = SH.dt;
  const epithetText = SH.epithetText;
  const equipmentBlockedText = SH.equipmentBlockedText;
  const equipmentSheetHtml = SH.equipmentSheetHtml;
  const esc = SH.esc;
  const eventModifierPreview = SH.eventModifierPreview;
  const firstMissingTech = SH.firstMissingTech;
  const fmtAmt = SH.fmtAmt;
  const focusShortcutTarget = SH.focusShortcutTarget;
  const foreignPolicyStanceText = SH.foreignPolicyStanceText;
  const foreignPolicyStatusText = SH.foreignPolicyStatusText;
  const heirEligibilityText = SH.heirEligibilityText;
  const hintFor = SH.hintFor;
  const householdStandardLevelDesc = SH.householdStandardLevelDesc;
  const householdStandardLevelName = SH.householdStandardLevelName;
  const householdStandardName = SH.householdStandardName;
  const initLargeListSurface = SH.initLargeListSurface;
  const interactionCardHtml = SH.interactionCardHtml;
  const itemSlotLabel = SH.itemSlotLabel;
  const itemWearerText = SH.itemWearerText;
  const kv = SH.kv;
  const largeListRowAttrs = SH.largeListRowAttrs;
  const largeListStateLabel = SH.largeListStateLabel;
  const largeListSurfaceHtml = SH.largeListSurfaceHtml;
  const largeListViews = SH.largeListViews;
  const livelihoodNote = SH.livelihoodNote;
  const menText = SH.menText;
  const mobileLayoutNow = SH.mobileLayoutNow;
  const mobileNavClosed = SH.mobileNavClosed;
  const mobileNavClosedAll = SH.mobileNavClosedAll;
  const mobileNavPush = SH.mobileNavPush;
  const mobileNavRequestBack = SH.mobileNavRequestBack;
  const modalHistoryBack = SH.modalHistoryBack;
  const modifierChips = SH.modifierChips;
  const modifierDurationText = SH.modifierDurationText;
  const modifierEffectText = SH.modifierEffectText;
  const modifierRecord = SH.modifierRecord;
  const modifierSourceText = SH.modifierSourceText;
  const normalizeModalFooter = SH.normalizeModalFooter;
  const openModal = SH.openModal;
  const panelh = SH.panelh;
  const personAssignmentCard = SH.personAssignmentCard;
  const positionDesc = SH.positionDesc;
  const positionEffectText = SH.positionEffectText;
  const positionName = SH.positionName;
  const rarityName = SH.rarityName;
  const realmStandingContext = SH.realmStandingContext;
  const refreshLargeListKeyhints = SH.refreshLargeListKeyhints;
  const relationText = SH.relationText;
  const religionName = SH.religionName;
  const renderActions = SH.renderActions;
  const researchNumber = SH.researchNumber;
  const resetPanelMarkup = SH.resetPanelMarkup;
  const rivalryHeatName = SH.rivalryHeatName;
  const settlementDevelopmentText = SH.settlementDevelopmentText;
  const settlementKindName = SH.settlementKindName;
  const shortcutBindings = SH.shortcutBindings;
  const shortcutFamilyLabel = SH.shortcutFamilyLabel;
  const signedNumber = SH.signedNumber;
  const standingBand = SH.standingBand;
  const standingClass = SH.standingClass;
  const standingSpan = SH.standingSpan;
  const standingText = SH.standingText;
  const standingValue = SH.standingValue;
  const statBreakdownHtml = SH.statBreakdownHtml;
  const techCostEstimateText = SH.techCostEstimateText;
  const techEstimatedSeasons = SH.techEstimatedSeasons;
  const techRequirementText = SH.techRequirementText;
  const technologyName = SH.technologyName;
  const terrainName = SH.terrainName;
  const traitClassName = SH.traitClassName;
  const traitGroupedEffects = SH.traitGroupedEffects;
  const wireEquipmentButtons = SH.wireEquipmentButtons;
  const wireInteractionCard = SH.wireInteractionCard;

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
    war_supply:5, war_thin:-5, war_discipline:4, war_disorder:-5,
    war_discipline_deserters:4, war_pay_deserters:7, war_desert:-12,
    war_allied_withdrawal:-12, war_negotiated_withdrawal:-3,
    /* the way down (docs/designs/descent.md): every ruinous choice scores
       deep below the safe ones, so automation endures, pays, or resists —
       it never sells the family down the ladder */
    hc_defy:6, war_submit:-15, war_submission_tribute:-3,
    attainder_pay:4, attainder_yield:-25, attainder_resist:-10,
    prison_pay:6, prison_cede_land:-10,
    distraint_settle:4, distraint_yield_one:2, distraint_seize:-6,
    bondage_submit:-20, bondage_flee:-8,
    devastation_lose_holding:-8, devastation_commend:-15,
    ghw_recruit_volunteers:8, ghw_recruit_mercenaries:22,
    ghw_recruit_knights:20, ghw_recruit_adventurers:21,
    academy_introduction:3, academy_student_focus:1.5,
    academy_student_dip:1.5, academy_student_ste:1.5,
    academy_student_int:1.5, academy_student_lea:1.5,
    academy_withdraw:-1
  };
  function modifierFxScore(raw) {
    const spec = typeof raw === 'string' ? { id:raw } : raw;
    const def = spec && FBDATA.modifiers && FBDATA.modifiers[spec.id];
    if (!def) return 0;
    const fx = def.fx || {};
    let value = 0;
    value += (Number(fx.tax) || 0) * 40;
    value += (Number(fx.levy) || 0) * 25;
    value -= (Number(fx.buildingCost) || 0) * 30;
    value += (Number(fx.commonVoice) || 0) * 0.3;
    value -= (Number(fx.famine) || 0) * 12;
    value -= (Number(fx.unrest) || 0) * 12;
    value -= (Number(def.upkeep && def.upkeep.gold) || 0) * 0.5;
    value -= (Number(fx.supplyUse) || 0) * 20;
    value += (Number(fx.contribution) || 0) * 20;
    value += (Number(fx.marchSpeed) || 0) * 15;
    value += (Number(fx.battleOdds) || 0) * 20;
    value -= (Number(fx.desertion) || 0) * 20;
    return value;
  }
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
    if (fx.standingRealm) v += fx.standingRealm * 0.1;
    if (fx.opinion && fx.opinion.amt) v += fx.opinion.amt * 0.1;
    if (fx.skills) for (const k in fx.skills) v += fx.skills[k] * 1.5;
    if (fx.tierSet !== undefined || fx.tierUp) v += 25;
    if (fx.marry) v += 10;
    if (fx.killChild || fx.killRole) v -= 10;
    if (fx.setFlag === 'ill') v -= 4;
    if (fx.addTrait === 'scarred' || fx.addTrait === 'craven') v -= 3;
    if (fx.addModifier) v += modifierFxScore(fx.addModifier);
    if (fx.removeModifier) v -= modifierFxScore(fx.removeModifier);
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
    const access = automationAccess(s);
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
    if (access.hosts) {
      h += '<div class="gm-body-text" style="margin-top:8px"><p>' + esc(FB.T(
        'Command your host in war (it marches only while standing idle — a route you tap by hand always plays out, and a halted host holds):')) + '</p></div>';
      h += hr('manual', 'Manually — you march the host yourself');
      h += hr('def', 'Defensive — throw back invaders, then refit at home');
      h += hr('off', 'Offensive — hunt their host when stronger, then besiege the prize');
    }
    if (access.build) {
      h += '<div class="gm-body-text" style="margin-top:8px"><p>' +
        esc(FB.T('Realm stewardship (once a season):')) + '</p></div>';
      h += cb('ar-build', a.build, 'Raise buildings automatically', 'The cheapest available building, when the treasury can spare it.');
    }
    if (access.research) {
      h += cb('ar-research', a.research,
        esc(FB.T('Fill research slots automatically')),
        esc(FB.T('Open slots are filled immediately and whenever a project completes.')));
      h += '<label class="autorow auto-select"><span>' +
        esc(FB.T('Research priority')) + '</span><select id="ar-research-mode">' +
        techAutomationOptions(a.researchMode) + '</select><span class="adesc">' +
        esc(FB.T('A preferred domain is chosen first; if none is eligible, automation uses the cheapest eligible technology from another domain.')) +
        '</span></label>';
    } else if (access.technology) {
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
      const build = $('ar-build');
      if (build) a.build = build.checked;
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
      if (FB.eventContextStillValid &&
          !FB.eventContextStillValid(s, ev, item.ctx || {})) continue;
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
    const cardedRealms = {};
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
    if (raw.indexOf('{partner}') >= 0 && ctx && ctx.partnerId) {
      const partner = s.chars[ctx.partnerId];
      if (partner && !partner.dead && !carded[partner.id]) {
        carded[partner.id] = 1;
        h += UI.charCardHtml(s, partner);
      }
    }
    if ((raw.indexOf('{rname}') >= 0 || raw.indexOf('{rulername}') >= 0) &&
        ctx && ctx.realmId) {
      h += UI.realmCardHtml(s, ctx.realmId);
      cardedRealms[ctx.realmId] = 1;
    }
    if (ev.id === 'plot_discovered' && ctx && ctx.plotId) {
      if (ctx.characterId && s.chars[ctx.characterId] &&
          !carded[ctx.characterId]) {
        carded[ctx.characterId] = 1;
        h += UI.charCardHtml(s, s.chars[ctx.characterId]);
      } else if (ctx.realmId && !cardedRealms[ctx.realmId]) {
        h += UI.realmCardHtml(s, ctx.realmId);
        cardedRealms[ctx.realmId] = 1;
      }
      const plotDef = FBDATA.plots[ctx.plotId];
      const targetLabel = plotDef && FB.plotContextLabel
        ? FB.plotContextLabel(s, plotDef, ctx) : '';
      if (targetLabel) {
        h += '<div class="hint plot-context-summary">' + esc(FB.T(
          'Endangered target: {target}', { target:targetLabel }
        )) + '</div>';
      }
    }
    return h;
  }

  function financeDistraintPreview(s, ev) {
    if (!ev || (ev.id !== 'distraint_writ' && ev.id !== 'distraint_seizure')) return '';
    const holdings = FB.holdingList(s);
    const holdingNames = [];
    for (const id of holdings) {
      const def = FBDATA.holdings && FBDATA.holdings[id];
      holdingNames.push(def ? dt(s, 'holding', id, def, 'name') : id);
    }
    const plots = FB.landPlots(s).length;
    let consequence;
    if (s.player.tier === 2) {
      consequence = FB.T('The manor is forfeited and the house falls to Freeholder.');
    } else if (s.player.tier === 1) {
      consequence = FB.T('The debt is extinguished and the household becomes Serf.');
    } else {
      consequence = FB.T('Extraordinary labor clears the debt; station does not change.');
    }
    return '<div class="progressnote warnote"><b>' +
      esc(FB.T('What distraint means')) + '</b><p class="hint">' +
      esc(FB.T('Distraint is a court order allowing bailiffs to seize household property for an unpaid debt.')) +
      '</p>' +
      kv('Outstanding default', esc(FB.T('{money:amount}', {
        amount:FB.financeDefaultDue(s)
      }))) +
      kv('Household holdings at risk', esc(holdingNames.length
        ? holdingNames.join(', ') : FB.T('None'))) +
      kv('Land plots at risk', esc(String(plots))) +
      kv('If property is exhausted', esc(consequence)) + '</div>';
  }

  function showEvent(ev, ctx) {
    const s = FB.state;
    eventOpen = true;
    FB.markFired(s, ev);
    $('eventmodal').classList.remove('hidden');
    if (FB.prepareEvent) FB.prepareEvent(s, ev, ctx);
    $('ev-title').textContent = FB.eventText(s, s.player.charId, ev, 'title', ctx);
    let bodyHtml = esc(FB.eventText(s, s.player.charId, ev, 'text', ctx));
    if (ev.id === 'proposal_made' && s.player.courtingId) {
      const suitor = s.chars[s.player.courtingId];
      const terms = suitor && FB.courtshipTerms
        ? FB.courtshipTerms(s, suitor, false) : null;
      const termsText = !terms || !terms.amount
        ? FB.T('Marriage terms: no dowry will change hands.')
        : (terms.playerPays
          ? FB.T(
            'Marriage terms: your house will provide {money:gold} to the house of {name}.', {
              gold:terms.amount,
              name:FB.fullName(suitor)
            })
          : FB.T(
            'Marriage terms: the house of {name} will provide {money:gold} to your house.', {
              gold:terms.amount,
              name:FB.fullName(suitor)
            }));
      bodyHtml += '<p class="adesc"><b>' + esc(termsText) + '</b></p>';
    }
    if (ev.warStatus && FB.warStateText) {
      bodyHtml += '<p class="adesc">' + esc(FB.warStateText(s, s.player.charId)) + '</p>';
    }
    bodyHtml += financeDistraintPreview(s, ev);
    const carded = {};
    if (ev.charCard) {
      const cc = FB.getRole(s, ev.charCard, false);
      if (cc) { bodyHtml += UI.charCardHtml(s, cc); carded[cc.id] = 1; }
    }
    bodyHtml += eventCharCards(s, ev, ctx, carded);
    if (UI.hintDue && UI.hintDue('event-pauses')) {
      bodyHtml = '<p class="hint">' + esc(FB.T(
        'Events pause the days until you choose an answer.')) + '</p>' + bodyHtml;
    }
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
      const modifierPreview = eventModifierPreview(s, o, ctx);
      btn.innerHTML = hintFor(i) +
        esc(oi >= 0 ? FB.eventText(s, s.player.charId, ev, 'options.' + oi + '.label', ctx) : FB.fmt(s, o.label, ctx)) +
        (o.desc ? '<span class="odesc">' + esc(oi >= 0 ? FB.eventText(s, s.player.charId, ev, 'options.' + oi + '.desc', ctx) : FB.fmt(s, o.desc, ctx)) + '</span>' : '') +
        (modifierPreview ? '<span class="odesc modifier-choice-preview">' +
          esc(modifierPreview) + '</span>' : '');
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
    if (!s.player.flags) s.player.flags = {};
    s.player.flags.tut_event = 1; // First-steps checklist: answered an event
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

  /* ================= overland travel picker ================= */
  SH.travelPicker = null;

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
    h += '</div><div class="gm-footer"><button class="btn" id="travel-guide">' +
      esc(FB.T('Guide: travel')) +
      '</button><button class="btn" id="travel-purpose-cancel">' +
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
    $('travel-guide').addEventListener('click', function () {
      UI.showGuideEntry('travel');
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
    SH.travelPicker = {
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
    return !!SH.travelPicker && !$('travel-picker').classList.contains('hidden');
  };

  UI.travelPickProvince = function (pid, center) {
    if (!SH.travelPicker) return false;
    let item = null;
    for (let i = 0; i < SH.travelPicker.choices.length; i++) {
      if (SH.travelPicker.choices[i].destinationId === pid) {
        item = SH.travelPicker.choices[i];
        break;
      }
    }
    if (!item) {
      UI.toast(FB.T('That county does not qualify for this journey.'));
      return false;
    }
    SH.travelPicker.selected = item;
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
    const preview = SH.travelPicker.kind === 'trade_venture'
      ? FB.tradeVenturePreview(FB.state, SH.travelPicker.stake, pid) : null;
    const cost = SH.travelPicker.kind === 'trade_venture'
      ? (preview ? preview.totalCost : Infinity) : item.cost;
    const affordable = cost <= FB.state.player.gold;
    if (SH.travelPicker.kind === 'trade_venture') {
      $('travel-picker-summary').textContent = affordable
        ? FB.T('{destination}: {money:stake} stake + {money:overhead} route overhead; {days} days each way.', {
            destination:pr.name, stake:SH.travelPicker.stake,
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
    if (!SH.travelPicker || !SH.travelPicker.selected) return;
    const item = SH.travelPicker.selected;
    const s = FB.state;
    const preview = FB.tradeVenturePreview(
      s, SH.travelPicker.stake, item.destinationId);
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
          'cautious', SH.travelPicker.source)) return;
      UI.cancelTravelPicker(true);
      UI.closeModal();
      UI.refresh();
    });
    $('venture-dispatch-bold').addEventListener('click', function () {
      if (!FB.startTradeVenture(s, preview.stake, preview.destinationId,
          'bold', SH.travelPicker.source)) return;
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
    if (!SH.travelPicker || !SH.travelPicker.selected) return;
    if (SH.travelPicker.kind === 'trade_venture') {
      reviewTradeVentureChoice();
      return;
    }
    const item = SH.travelPicker.selected;
    const s = FB.state;
    const def = FBDATA.travelPurposes[SH.travelPicker.purpose];
    const pr = FB.world.byId[item.destinationId];
    let h = '<div class="gm-body-text">' +
      '<p><b>' + esc((def.icon || '🧭') + ' ' +
        travelPurposeText(s, SH.travelPicker.purpose, 'name')) + '</b></p>' +
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
      if (FB.travelStart(s, SH.travelPicker.purpose, item.destinationId, item.destinationRealm)) {
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
        if (options.returnRealmId) {
          UI.showLiegeModal(options.returnRealmId, options.returnContext);
        } else {
          UI.showCharModal(c.id, options.returnContext);
        }
      });
    });
  };

  function closeTravelPicker(restorePause) {
    const closed = SH.travelPicker;
    const wasPaused = SH.travelPicker ? SH.travelPicker.wasPaused : true;
    SH.travelPicker = null;
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

  function enterpriseRelocationWarningHtml(s, destinationId, heading) {
    const impact = FB.enterpriseRelocationImpact
      ? FB.enterpriseRelocationImpact(s, destinationId) : null;
    if (!impact || !impact.rows.length) return '';
    let h = '<div class="warnote"><b>' + esc(heading || FB.T(
      'The following remote enterprises will lose their workers and become idle:')) +
      '</b><ul>';
    for (const row of impact.rows) {
      const def = FBDATA.enterprises[row.enterprise.type];
      h += '<li>' + esc(FB.T('{enterprise} — {worker} will be unassigned.', {
        enterprise:def
          ? dt(s, 'enterprise', row.enterprise.type, def, 'name') +
            ' · ' + enterprisePlace(s, row.enterprise)
          : row.enterprise.type,
        worker:FB.fullName(row.worker)
      })) + '</li>';
    }
    return h + '</ul></div>';
  }

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
      })) + '</p>' +
      enterpriseRelocationWarningHtml(s, t.destinationId) +
      '<p class="warnote"><b>' + esc(FB.T(
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
    const selfEnterpriseImpact = enterpriseRelocationWarningHtml(
      s, residence.destinationId, FB.T(
        'If {name} moves the household, these enterprises will lose their workers:', {
          name:FB.fullName(protagonist)
        }));
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
      })) + '</p><p><b>' + esc(currentHeir) + '</b></p>' +
      selfEnterpriseImpact + '</div><div class="gm-list">' +
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
    const meta = FB.religionOf(religionId, s).head;
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
    const religion = campaign && FB.religionOf(campaign.callingReligion, s);
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
    const religionIds = FB.religionIds(s, false);
    for (let religionIndex = 0; religionIndex < religionIds.length; religionIndex++) {
      const religionId = religionIds[religionIndex];
      const religion = FB.religionOf(religionId, s);
      const source = FB.faithValue(s, religionId, 'head.greatHolyWar').sourceId;
      if (source && source !== religionId) continue;
      const head = religion && religion.head && religion.head.greatHolyWar &&
        FB.religiousHeadOf(s, religionId);
      const playerCatholicPope = FB.faithHasSystem(religionId, 'papacy', s) &&
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
  function standingChangeRange(entries) {
    const values = [];
    for (let i = 0; i < entries.length; i++) {
      const value = entries[i].change;
      if (values.indexOf(value) < 0) values.push(value);
    }
    values.sort(function (a, b) { return a - b; });
    if (!values.length) return signedNumber(0);
    if (values.length === 1) return signedNumber(values[0]);
    return signedNumber(values[0]) + '…' +
      signedNumber(values[values.length - 1]);
  }

  function warCausePickerConsequenceText(s, preview) {
    if (!preview) return '';
    if (preview.aggression) {
      const consequence = preview.aggression;
      return FB.T(
        'Immediate: {prestige} prestige, {voice} Common Voice, direct-vassal Standing {vassal}, and foreign-sovereign Standing {foreign}. These ranges include normal Standing bounds. The war itself grants no declaration or victory prestige and burdens the county with Conquered Without Right.', {
          prestige:signedNumber(consequence.prestigeChange),
          voice:signedNumber(consequence.commonVoiceChange),
          vassal:standingChangeRange(consequence.vassals),
          foreign:standingChangeRange(consequence.foreign)
        });
    }
    return FB.T(
      'Recognized cause: {declaration} prestige on declaration and {victory} prestige on victory; no unjust-conquest modifier.', {
        declaration:signedNumber(preview.declarationPrestige),
        victory:signedNumber(preview.victoryPrestige)
      });
  }

  function aggressionOppositionText(s, preview) {
    const parts = [];
    for (const item of preview.opposition) {
      if (item.kind === 'commons') {
        parts.push(FB.T(
          'The commons in your demesne ({change} Common Voice)', {
            change:signedNumber(item.projectedChange)
          }));
      } else if (item.kind === 'bloc') {
        parts.push(FB.T(
          '{bloc} ({influence} influence; affected members project to Standing {standing})', {
            bloc:politicalBlocName(s, {
              houses:item.bloc.members
            }, item.bloc),
            influence:item.bloc.influence,
            standing:signedNumber(item.projectedStanding)
          }));
      } else if (item.kind === 'vassals') {
        parts.push(FB.T('{count} direct vassal courts', {
          count:item.count
        }));
      } else if (item.kind === 'foreign') {
        parts.push(FB.T('{count} foreign sovereign courts', {
          count:item.count
        }));
      }
    }
    return parts.join(' · ') || FB.T(
      'No organized opposition group is currently visible, but the listed political costs still apply.');
  }

  const warTargetView = {
    stateRef:null, search:'', basis:'all', adjacency:'all', rank:'all',
    diplomacy:'all', sort:'recommended'
  };

  function warCauseIsAdjacent(s, cause) {
    const lands = s.realms.player && s.realms.player.alive
      ? FB.realmTerritory(s, 'player') : (s.player.provs || []);
    for (const pid of lands) {
      if (FB.world.adj[pid] && Object.prototype.hasOwnProperty.call(
        FB.world.adj[pid], cause.target)) return true;
    }
    return false;
  }

  function warCauseBasis(cause) {
    if (cause.type === 'dejure') return 'dejure';
    if (cause.type === 'aggression') return 'aggression';
    return 'claim';
  }

  function warTargetToolbarHtml() {
    function option(value, label, current) {
      return '<option value="' + value + '"' +
        (current === value ? ' selected' : '') + '>' + esc(label) + '</option>';
    }
    return '<div class="war-target-toolbar" id="war-target-toolbar">' +
      '<label class="war-target-search"><span>' + esc(FB.T(
        'Search realm, ruler, or territory')) + '</span><input type="search" ' +
      'id="war-target-search" value="' + esc(warTargetView.search) +
      '" autocomplete="off" spellcheck="false"></label>' +
      '<label><span>' + esc(FB.T('Cause')) + '</span><select id="war-target-basis">' +
      option('all', FB.T('All causes'), warTargetView.basis) +
      option('dejure', FB.T('De jure rights'), warTargetView.basis) +
      option('claim', FB.T('Claims and restorations'), warTargetView.basis) +
      option('aggression', FB.T('War of Aggression'), warTargetView.basis) +
      '</select></label><label><span>' + esc(FB.T('Adjacency')) +
      '</span><select id="war-target-adjacency">' +
      option('all', FB.T('Any distance'), warTargetView.adjacency) +
      option('adjacent', FB.T('Border targets'), warTargetView.adjacency) +
      option('distant', FB.T('Distant rights'), warTargetView.adjacency) +
      '</select></label><label><span>' + esc(FB.T('Enemy rank')) +
      '</span><select id="war-target-rank">' +
      option('all', FB.T('Any rank'), warTargetView.rank) +
      option('lower', FB.T('Lower rank'), warTargetView.rank) +
      option('peer', FB.T('Same rank'), warTargetView.rank) +
      option('higher', FB.T('Higher rank'), warTargetView.rank) +
      '</select></label><label><span>' + esc(FB.T('Diplomacy')) +
      '</span><select id="war-target-diplomacy">' +
      option('all', FB.T('Available and blocked'), warTargetView.diplomacy) +
      option('available', FB.T('Available now'), warTargetView.diplomacy) +
      option('blocked', FB.T('Blocked now'), warTargetView.diplomacy) +
      '</select></label><label><span>' + esc(FB.T('Sort')) +
      '</span><select id="war-target-sort">' +
      option('recommended', FB.T('Recommended: available rights first'), warTargetView.sort) +
      option('realm', FB.T('Realm name'), warTargetView.sort) +
      option('territory', FB.T('Territory name'), warTargetView.sort) +
      option('rank', FB.T('Enemy rank'), warTargetView.sort) +
      option('defense', FB.T('Defense strength'), warTargetView.sort) +
      '</select></label></div>';
  }

  UI.showWarTargets = function (focusRealmId, returnContext) {
    const s = FB.state;
    if (warTargetView.stateRef !== s) {
      warTargetView.stateRef = s;
      warTargetView.search = '';
      warTargetView.basis = 'all';
      warTargetView.adjacency = 'all';
      warTargetView.rank = 'all';
      warTargetView.diplomacy = 'all';
      warTargetView.sort = 'recommended';
    }
    const causes = focusRealmId && FB.realmWarCauses
      ? FB.realmWarCauses(s, focusRealmId, true)
      : FB.warCauses(s, true, true);
    const musterUpkeep = FB.playerMusterUpkeepParts
      ? FB.playerMusterUpkeepParts(s) : { total:0 };
    const playerRank = s.realms.player && s.realms.player.alive
      ? s.realms.player.rank : s.player.tier;
    const models = [];
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Compare every available cause before choosing. A recognized right avoids the political penalties of a War of Aggression. Land is taken only by siege: march your host onto the named prize and press the siege at three war councils. Field victories bring the enemy to the table, nothing more.')) +
      '</p><p class="hint">' + esc(FB.T(
        'Your normal muster would cost about {money:amount} in logistics each season. Great levies, mercenaries, allied reinforcements, and casualties change the live bill.', {
          amount:financeAmount(musterUpkeep.total)
        })) + '</p></div>' + warTargetToolbarHtml() + '<div class="gm-list war-target-list" ' +
      'id="war-target-list">';
    for (let ci = 0; ci < causes.length; ci++) {
      const cause = causes[ci];
      const pid = cause.target;
      const pr = FB.world.byId[pid];
      const rid = cause.enemy || s.owner[pid];
      const realm = s.realms[rid];
      const enMen = FB.realmDefensiveStrength(s, rid);
      const causeText = warCauseName(s, cause);
      const preview = FB.warCausePreview
        ? FB.warCausePreview(s, cause) : null;
      const support = FB.alliedReinforcement(s, rid);
      const ruler = FB.realmRulerCharacterSnapshot
        ? FB.realmRulerCharacterSnapshot(s, rid) : null;
      const rulerName = ruler ? FB.fullName(ruler) :
        (realm && realm.ruler && realm.ruler.name
          ? realm.ruler.name : FB.T('unknown ruler'));
      const territory = FB.realmProvinces(s, rid).map(function (id) {
        return FB.world.byId[id] ? FB.world.byId[id].name : id;
      });
      const adjacent = warCauseIsAdjacent(s, cause);
      const rank = realm ? realm.rank || 0 : 0;
      const blockedReason = FB.warCauseBlockedReason(cause);
      const search = [pr.name, realm ? realm.name : '', rulerName]
        .concat(territory).join(' ').toLocaleLowerCase();
      models.push({
        index:ci, cause:cause, realmName:realm ? realm.name : '',
        territoryName:pr.name, rank:rank, defense:enMen,
        basis:warCauseBasis(cause), adjacent:adjacent,
        blocked:!!cause.blocked, search:search
      });
      h += '<button class="actionbtn war-target-row" data-war-cause="' + ci +
        '" data-war-cause-type="' + esc(cause.type) +
        '" data-war-cause-target="' + esc(cause.target) + '"' +
        (cause.blocked ? ' disabled' : '') + '>⚔ ' + esc(pr.name) +
        '<span class="adesc">' + esc(FB.T(
          '{cause} · {rank} {realm}, ruled by {ruler} ({counties}) · defense ~{theirs} against your ~{yours}{support}', {
            cause: causeText,
            realm: realm ? realm.name : '?',
            rank:realm ? FB.realmRankTitle(s, realm) : FB.T('Realm'),
            ruler:rulerName,
            counties: countyCountText(s, FB.realmProvinces(s, rid).length),
            theirs: menText(s, enMen),
            yours: menText(s, FB.playerLevy(s)),
            support: support.men && s.realms[support.ally]
              ? FB.T(' (including ~{men} from {ally})', {
                men: menText(s, support.men), ally: s.realms[support.ally].name
              }) : ''
          })) + '</span><span class="adesc' +
          (cause.type === 'aggression' ? ' warnote' : '') + '">' +
          esc(warCausePickerConsequenceText(s, preview)) +
          '</span><span class="adesc ' + (cause.blocked ? 'warnote' : 'op-good') + '">' +
          esc(cause.blocked ? blockedReason : FB.T(
            'Available now · {distance}', {
              distance:adjacent ? FB.T('border target') : FB.T('distant right')
            })) + '</span>' + (cause.sacrilegious
            ? '<span class="adesc warnote">' + esc(FB.T(
              '⛓ Sacrilege — attacking the active Papacy brings excommunication, forfeits all piety, and turns every Catholic ruler against you.')) + '</span>'
            : '') + '</button>';
    }
    h += '</div><div class="hint large-list-no-results" id="war-target-empty" hidden>' +
      esc(FB.T('No war target matches the current search and filters.')) +
      '</div><div class="gm-footer"><button class="btn" id="war-guide">' +
      esc(FB.T('Guide: war')) +
      '</button><button class="btn" id="gm-cancel">' +
      esc(returnContext ? FB.T('Back') : FB.T('Think better of it')) +
      '</button></div>';
    openModal(FB.T('Choose Your Conquest'), h, {
      historyView:!!returnContext,
      historyBackRender:function () {
        interactionReturn(returnContext);
      }
    });
    const list = $('war-target-list');
    function compareWarTargets(a, b) {
      let result = 0;
      if (warTargetView.sort === 'recommended') {
        result = Number(a.blocked) - Number(b.blocked) ||
          (a.basis === 'aggression' ? 1 : 0) -
            (b.basis === 'aggression' ? 1 : 0) ||
          Number(!a.adjacent) - Number(!b.adjacent) ||
          a.defense - b.defense;
      } else if (warTargetView.sort === 'realm') {
        result = a.realmName.localeCompare(b.realmName);
      } else if (warTargetView.sort === 'territory') {
        result = a.territoryName.localeCompare(b.territoryName);
      } else if (warTargetView.sort === 'rank') {
        result = a.rank - b.rank;
      } else if (warTargetView.sort === 'defense') {
        result = a.defense - b.defense;
      }
      return result || a.realmName.localeCompare(b.realmName) ||
        a.territoryName.localeCompare(b.territoryName) ||
        a.cause.type.localeCompare(b.cause.type) || a.index - b.index;
    }
    function applyWarTargetView() {
      warTargetView.search = $('war-target-search').value.trim();
      warTargetView.basis = $('war-target-basis').value;
      warTargetView.adjacency = $('war-target-adjacency').value;
      warTargetView.rank = $('war-target-rank').value;
      warTargetView.diplomacy = $('war-target-diplomacy').value;
      warTargetView.sort = $('war-target-sort').value;
      const query = warTargetView.search.toLocaleLowerCase();
      const ordered = models.slice().sort(compareWarTargets);
      let visible = 0;
      for (const model of ordered) {
        const row = list.querySelector('[data-war-cause="' + model.index + '"]');
        list.appendChild(row);
        const rankMatch = warTargetView.rank === 'all' ||
          (warTargetView.rank === 'lower' && model.rank < playerRank) ||
          (warTargetView.rank === 'peer' && model.rank === playerRank) ||
          (warTargetView.rank === 'higher' && model.rank > playerRank);
        const show = (!query || model.search.indexOf(query) >= 0) &&
          (warTargetView.basis === 'all' || model.basis === warTargetView.basis) &&
          (warTargetView.adjacency === 'all' ||
            (warTargetView.adjacency === 'adjacent') === model.adjacent) &&
          rankMatch &&
          (warTargetView.diplomacy === 'all' ||
            (warTargetView.diplomacy === 'blocked') === model.blocked);
        row.hidden = !show;
        if (show) visible++;
      }
      $('war-target-empty').hidden = visible > 0;
      refreshLargeListKeyhints($('war-target-toolbar'));
    }
    const controls = $('war-target-toolbar').querySelectorAll('input, select');
    for (let i = 0; i < controls.length; i++) {
      controls[i].addEventListener(controls[i].tagName === 'INPUT'
        ? 'input' : 'change', applyWarTargetView);
    }
    applyWarTargetView();
    document.querySelectorAll('[data-war-cause]').forEach(function (b) {
      b.addEventListener('click', function () {
        const cause = causes[Number(b.dataset.warCause)];
        if (cause.type === 'aggression') {
          UI.showAggressiveWarConfirmation(cause, {
            focusRealmId:focusRealmId,
            returnContext:returnContext
          });
        } else if (cause.sacrilegious) {
          UI.showSacrilegiousWarConfirmation(cause, {
            focusRealmId:focusRealmId,
            returnContext:returnContext
          });
        } else {
          if (!FB.startPlayerWar(FB.state, cause)) return;
          UI.refresh();
          if (returnContext) interactionReturn(returnContext);
          else UI.closeModal();
          mobileNavClosedAll('modal-view', true);
        }
      });
    });
    $('war-guide').addEventListener('click', function () {
      UI.showGuideEntry('war');
    });
    $('gm-cancel').addEventListener('click', function () {
      if (returnContext) {
        modalHistoryBack(function () {
          interactionReturn(returnContext);
        });
      } else {
        UI.closeModal();
      }
    });
  };

  /* Aggression is never inferred from a generic county click. This second
     sheet repeats every immediate and continuing consequence from the same
     preview object the declaration writer applies, then revalidates all
     cause and diplomacy gates on the final button. */
  UI.showAggressiveWarConfirmation = function (cause, returnContext) {
    const s = FB.state;
    const preview = cause && FB.warCausePreview
      ? FB.warCausePreview(s, cause) : null;
    const consequence = preview && preview.aggression;
    const realm = cause && s.realms[cause.enemy];
    const province = cause && FB.world.byId[cause.target];
    if (!consequence || !realm || !province) return;
    const modifier = consequence.modifier;
    const modifierDef = modifier && FBDATA.modifiers[modifier.id];
    const modifierName = modifierDef
      ? dt(s, 'modifier', modifier.id, modifierDef, 'name')
      : FB.T('Conquered Without Right');
    const modifierEffects = modifier
      ? modifierEffectText(s, modifier.id) : '';
    const sacrilegeStanding = Math.abs(
      FBDATA.balance.religiousHeadWarOpinion !== undefined
        ? FBDATA.balance.religiousHeadWarOpinion : -40);
    const vassalText = consequence.vassals.length
      ? FB.T(
        'Direct-vassal Standing changes {standing} across {count} affected courts; this includes normal Standing bounds.', {
          standing:standingChangeRange(consequence.vassals),
          count:consequence.vassals.length
        })
      : FB.T('You have no direct vassals, so no direct-vassal Standing changes now.');
    const foreignText = consequence.foreign.length
      ? FB.T(
        'Foreign-sovereign Standing changes {standing} across {count} affected courts; this includes normal Standing bounds.', {
          standing:standingChangeRange(consequence.foreign),
          count:consequence.foreign.length
        })
      : FB.T('No living foreign sovereign is currently affected.');
    const recentText = consequence.recentCount
      ? FB.T(
        '{count} aggressive wars by this ruler remain recent, so this declaration’s political costs are multiplied by ×{multiplier}.', {
          count:consequence.recentCount,
          multiplier:Math.round(
            consequence.escalationMultiplier * 100) / 100
        })
      : FB.T(
        'This is the ruler’s first recent aggressive war; later declarations escalate every political cost.');
    let h = '<div class="gm-body-text"><p class="warnote"><b>' +
      esc(FB.T('This war has no recognized right.')) + '</b></p><p>' +
      esc(FB.T(
        'Target {realm}; conquer {province} by holding it and completing three war-council siege steps.', {
          realm:realm.name,
          province:province.name
        })) + '</p><h4>' + esc(FB.T('Immediate consequences')) +
      '</h4><ul><li>' + esc(FB.T('{prestige} prestige.', {
        prestige:signedNumber(consequence.prestigeChange)
      })) + '</li><li>' + esc(FB.T('{voice} Common Voice.', {
        voice:signedNumber(consequence.commonVoiceChange)
      })) + '</li><li>' + esc(vassalText) + '</li><li>' +
      esc(foreignText) + '</li></ul><p>' + esc(recentText) +
      '</p><h4>' + esc(FB.T('Continuing consequences')) +
      '</h4><p>' + esc(FB.T(
        'While this declaration remains recent, player-realm vassal breakaway pressure is ×{multiplier}; poor Standing raises it further.', {
          multiplier:Math.round(
            consequence.breakawayMultiplier * 100) / 100
        })) + '</p><p>' + esc(modifier
          ? FB.T(
            'The war itself grants no declaration or victory prestige; separate title promotions still apply. {province} receives {modifier} for {days} days: {effects}. The modifier remains with the county if ownership changes.', {
              province:province.name,
              modifier:modifierName,
              days:modifier.days,
              effects:modifierEffects
            })
          : FB.T(
            'The war itself grants no declaration or victory prestige and applies the unjust-conquest county burden.')) +
      '</p><h4>' + esc(FB.T('Most likely opposition')) +
      '</h4><p>' + esc(aggressionOppositionText(s, consequence)) +
      '</p>' + (cause.sacrilegious
        ? '<p class="warnote">' + esc(FB.T(
          'This target is also the active Papacy. Declaring forfeits all piety, gives −{standing} Standing with every Catholic ruler, and excommunicates the current ruler.', {
            standing:sacrilegeStanding
          })) + '</p>'
        : '') + '</div><div class="gm-list">' +
      '<button type="button" class="actionbtn" id="aggression-confirm">⚔ ' +
      esc(FB.T('Accept the consequences and declare war')) + '</button>' +
      '<button type="button" class="actionbtn" id="aggression-cancel">' +
      esc(FB.T('Think better of it')) + '</button></div>';
    openModal(FB.T('Declare a War of Aggression?'), h, {
      historyView:!!returnContext,
      historyBackRender:function () {
        UI.showWarTargets(returnContext.focusRealmId,
          returnContext.returnContext);
      }
    });
    $('aggression-confirm').addEventListener('click', function () {
      if (!FB.startPlayerWar(s, cause, {
          confirmAggression:true,
          confirmSacrilege:!!cause.sacrilegious
      })) {
        UI.toast(FB.T(
          'The War of Aggression can no longer be declared.'));
        UI.showWarTargets(returnContext.focusRealmId,
          returnContext.returnContext);
        return;
      }
      UI.refresh();
      if (returnContext.returnContext) {
        interactionReturn(returnContext.returnContext);
      } else {
        UI.closeModal();
      }
      mobileNavClosedAll('modal-view', true);
    });
    $('aggression-cancel').addEventListener('click', function () {
      if (returnContext) {
        modalHistoryBack(function () {
          UI.showWarTargets(returnContext.focusRealmId,
            returnContext.returnContext);
        });
      } else {
        UI.closeModal();
      }
    });
  };

  /* Same cause, second confirmation: no state changes until the player
     explicitly accepts the religious penalties here. */
  UI.showSacrilegiousWarConfirmation = function (cause, returnContext) {
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
    openModal(FB.T('Attack the Papacy?'), h, {
      historyView:!!returnContext,
      historyBackRender:function () {
        UI.showWarTargets(returnContext.focusRealmId,
          returnContext.returnContext);
      }
    });
    $('sacrilege-confirm').addEventListener('click', function () {
      if (!FB.startPlayerWar(s, cause, { confirmSacrilege:true })) {
        UI.toast(FB.T('This sacrilegious war can no longer be declared.'));
        UI.showWarTargets(returnContext.focusRealmId,
          returnContext.returnContext);
        return;
      }
      UI.refresh();
      if (returnContext.returnContext) {
        interactionReturn(returnContext.returnContext);
      } else {
        UI.closeModal();
      }
      mobileNavClosedAll('modal-view', true);
    });
    $('sacrilege-cancel').addEventListener('click', function () {
      if (returnContext) {
        modalHistoryBack(function () {
          UI.showWarTargets(returnContext.focusRealmId,
            returnContext.returnContext);
        });
      } else {
        UI.closeModal();
      }
    });
  };

  /* Renounce the liege and fight for it: confirmed here, then handled by
     FB.doIndependence (a baron seizes his home county in the bargain). */
  UI.showIndependence = function (returnContext) {
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
      '<button class="btn primary" id="gm-indep">' +
      esc(FB.T('Raise my banner')) + '</button> ' +
      '<button class="btn" id="gm-cancel">' +
      esc(returnContext ? FB.T('Back') : FB.T('Stay sworn')) + '</button>';
    openModal(FB.T('Declare Independence'), h,
      managementModalOptions(returnContext));
    $('gm-indep').addEventListener('click', function () {
      FB.doIndependence(FB.state);
      managementFinish(returnContext, UI.closeModal);
    });
    $('gm-cancel').addEventListener('click', function () {
      managementBack(returnContext, UI.closeModal);
    });
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
    if (d.requiresTech && !FB.techRequirementMet(s, d.requiresTech)) {
      return techRequirementText(s, d.requiresTech);
    }
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
        })) + (FB.isProtected(s, 'autoBuildCounty', id)
          ? ' · ' + esc(FB.T('no autobuild')) : '') + '</option>';
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
        '<label class="autorow building-auto-protection"><input type="checkbox" ' +
        'id="building-auto-protection"' +
        (FB.isProtected(s, 'autoBuildCounty', pid) ? ' checked' : '') + '> ' +
        esc(FB.T('Keep automatic building out of this county')) +
        '<span class="adesc">' + esc(FB.T(
          'Manual construction remains available here.')) + '</span></label>' +
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
      $('building-auto-protection').addEventListener('change', function () {
        FB.setProtected(s, 'autoBuildCounty', pid,
          $('building-auto-protection').checked);
        UI.refresh();
      });
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
     One sheet for every settled county, reached from the Land tab or a map
     marker. It shows what stands THERE: buildings are per-settlement
     ({ s: idx, id } entries), so the list filters to this settlement, and
     any household property in the exact slot — plots, a manor, enterprises —
     is listed with it. Authorization lives INSIDE the sheet, so a foreign or
     non-demesne settlement is read-only: demolition buttons render only for
     a county the player holds, and the raise button keeps the existing
     demesne/tier/buildable gates. */
  UI.showSettlement = function (pid, idx) {
    const s = FB.state;
    const pr = FB.world.byId[pid];
    if (!s || !pr) return;
    const st = FB.settlementsOf(s, pid)[idx];
    if (!st) return;
    const own = FB.demesne(s).indexOf(pid) >= 0;
    const holdId = (s.holder && s.holder[pid]) || s.owner[pid];
    const holderText = holdId === 'player'
      ? FB.T('your household')
      : (s.realms[holdId] ? s.realms[holdId].name : FB.T('no one'));
    let h = '<div class="gm-body-text settlement-context"><p>' +
      esc(FB.T('{kind} in {county} county · held by {holder}', {
        kind:settlementKindName(st.kind), county:FB.L(pr.name), holder:holderText
      })) + '</p></div>';
    const done = [];
    for (const e of FB.builtIn(s, pid)) if (e.s === idx) done.push(e);
    h += '<div class="gm-body-text settlement-development-summary">' +
      '<p><b>' + esc(FB.T('County development: {current} / {cap}', {
        current:(s.dev[pid] || 1), cap:FB.devCap(s, pid)
      })) + '</b></p><p>' + esc(settlementDevelopmentText(s, pid)) +
      '</p><p class="hint">' + esc(bookmarkDevelopmentText(s, pid)) +
      '</p></div>';
    /* household property in the exact slot — read directly so opening a
       sheet never migrates or rewrites saved property */
    const property = [];
    let plotCount = 0;
    for (const plot of (s.player.landPlots || [])) {
      if (plot.provinceId === pid && plot.settlement === idx) plotCount++;
    }
    if (plotCount) {
      property.push(esc(FB.T('🌾 Your household farms {count} plots here.', {
        count:plotCount
      })));
    }
    if (s.player.manor && s.player.manor.provinceId === pid &&
        s.player.manor.settlement === idx) {
      property.push(esc(FB.T('🏡 Your manor stands here.')));
    }
    for (const enterprise of (s.player.enterprises || [])) {
      if (enterprise.provinceId !== pid || enterprise.settlement !== idx) continue;
      const enterpriseDef = FBDATA.enterprises[enterprise.type];
      property.push(esc(FB.T('{icon} Your {name} operates here.', {
        icon:enterpriseDef ? enterpriseDef.icon : '🛠',
        name:enterpriseDef
          ? dt(s, 'enterprise', enterprise.type, enterpriseDef, 'name')
          : enterprise.type
      })));
    }
    if (property.length) {
      h += '<div class="gm-body-text settlement-property"><p>' +
        property.join('<br>') + '</p></div>';
    }
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
            (own
              ? '<button class="btn sett-demolish" data-demolish="' + esc(id) + '">' +
                esc(FB.T('Demolish…')) + '</button>'
              : '');
        }
      }
    } else {
      h += '<p class="hint">' + esc(FB.T('No buildings stand in {settlement} yet.',
        { settlement: st.name })) + '</p>';
    }
    const canRaise = own && s.player.tier >= 3 &&
      FB.buildable(s, pid, idx).length > 0;
    if (canRaise) {
      h += '<div class="gm-list"><button class="actionbtn" id="gm-raise">' +
        esc(FB.T('🏗 Raise a building…')) + '</button></div>';
    }
    h += '<div class="gm-footer"><button class="btn" id="settlement-guide">' +
      esc(FB.T('Guide: settlements and development')) +
      '</button><button class="btn" id="gm-cancel">' +
      esc(FB.T('Done')) + '</button></div>';
    openModal(SETT_ICON[st.kind] + ' ' + st.name, h);
    if (canRaise) {
      $('gm-raise').addEventListener('click', function () { UI.showBuildings(pid, idx); });
    }
    $('settlement-guide').addEventListener('click', function () {
      UI.showGuideEntry('settlements-development');
    });
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
    const targets = FB.plotTargetOptions(s, def);
    let h = '<p class="hint">' + esc(FB.T(
      'Choose the person, realm, contract, or institution this plot concerns. Stable ids keep that exact target attached through discovery and resolution.')) +
      '</p><div class="gm-list">';
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      if (target.characterId && s.chars[target.characterId]) {
        h += UI.charCardHtml(s, s.chars[target.characterId], false);
      } else if (target.realmId) {
        h += UI.realmCardHtml(s, target.realmId);
      }
      h += '<button class="actionbtn" data-plot-target="' + i + '">' +
        target.icon + ' ' + esc(target.label) +
        (target.desc ? '<span class="adesc">' + esc(target.desc) + '</span>' : '') +
        '</button>';
    }
    h += '</div><button class="btn" id="gm-back">' + esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Choose the Target'), h);
    document.querySelectorAll('[data-plot-target]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const target = targets[Number(btn.dataset.plotTarget)];
        if (target) FB.beginPlot(FB.state, plotId, target.context);
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-back').addEventListener('click', UI.showPlots);
  };

  /* ================= envoy picker ================= */
  UI.showEnvoys = function (focusRealmId, returnContext) {
    const s = FB.state;
    let h = '<p class="hint">' + esc(FB.T(
      'A peace envoy carries {money:10} in gifts. Kings and emperors may instead offer one defensive alliance at Standing 60+, carrying {money:25}; either offer uses the same envoy odds.')) +
      '</p><div class="gm-list">';
    const focusedEnvoy = focusRealmId && FB.envoyStatus
      ? FB.envoyStatus(s, focusRealmId) : null;
    const focusedAlliance = focusRealmId && FB.allianceOfferStatus
      ? FB.allianceOfferStatus(s, focusRealmId) : null;
    const pactTargets = focusRealmId
      ? (focusedEnvoy && focusedEnvoy.relevant ? [focusRealmId] : [])
      : FB.envoyTargets(s);
    const allianceTargets = focusRealmId
      ? (focusedAlliance && focusedAlliance.relevant ? [focusRealmId] : [])
      : FB.allianceOfferTargets(s);
    const targetMap = {}, targets = [];
    for (const rid of pactTargets.concat(allianceTargets)) {
      if (!targetMap[rid]) { targetMap[rid] = 1; targets.push(rid); }
    }
    for (const rid of targets) {
      if (focusRealmId && rid !== focusRealmId) continue;
      const r = s.realms[rid];
      const men = FB.aiBaseHost(s, rid);
      const standing = FB.standingOf(s, { kind:'realm', id:rid });
      if (pactTargets.indexOf(rid) >= 0) {
        const pactBlocked = focusedEnvoy && !focusedEnvoy.ready;
        h += '<button class="actionbtn" data-envoy="' + esc(rid) + '"' +
          (pactBlocked || s.player.gold < 10 ? ' disabled' : '') + '>🕊 ' +
          esc(FB.T('Peace pact with {realm}', { realm: r.name })) +
          '<span class="adesc">' + esc(FB.T('{ruler} · {counties} · fields ~{men} · Standing {standing} · chance ~{chance}%', {
            ruler: r.ruler.name,
            counties: countyCountText(s, FB.realmProvinces(s, rid).length),
            men: menText(s, men),
            standing: standingText(standing),
            chance: Math.round(FB.envoyChance(s, rid) * 100)
          }) + (pactBlocked
            ? ' · ' + FB.T('Unavailable: {reason}', {
              reason:focusedEnvoy.reason
            }) : '')) + '</span></button>';
      }
      if (allianceTargets.indexOf(rid) >= 0) {
        const allianceBlocked = focusedAlliance && !focusedAlliance.ready;
        h += '<button class="actionbtn" data-alliance-offer="' + esc(rid) + '"' +
          (allianceBlocked || s.player.gold < 25 ? ' disabled' : '') + '>🤝 ' +
          esc(FB.T('Defensive alliance with {realm}', { realm: r.name })) +
          '<span class="adesc">' + esc(FB.T('{ruler} · Standing {standing} · chance ~{chance}% · their aid would add up to ~{men} defenders', {
            ruler: r.ruler.name,
            standing: standingText(standing),
            chance: Math.round(FB.envoyChance(s, rid) * 100),
            men: menText(s, Math.round(Math.min(
              men * 0.25, FB.playerLevy(s) * 0.5)))
          }) + (allianceBlocked
            ? ' · ' + FB.T('Unavailable: {reason}', {
              reason:focusedAlliance.reason
            }) : '')) + '</span></button>';
      }
    }
    h += '</div><button class="btn" id="gm-cancel">' +
      esc(FB.T('Not now')) + '</button>';
    openModal(FB.T('Send an Envoy'), h, {
      historyView:!!returnContext,
      historyBackRender:function () {
        interactionReturn(returnContext);
      }
    });
    document.querySelectorAll('[data-envoy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!FB.sendEnvoy(FB.state, btn.dataset.envoy)) return;
        UI.closeModal(); UI.refresh();
      });
    });
    document.querySelectorAll('[data-alliance-offer]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!FB.offerAlliance(FB.state, btn.dataset.allianceOffer)) return;
        UI.closeModal(); UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      if (returnContext) {
        modalHistoryBack(function () {
          interactionReturn(returnContext);
        });
      } else {
        UI.closeModal();
      }
    });
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

  UI.showForeignPolicyStance = function (rid, returnContext) {
    const s = FB.state;
    const r = s.realms[rid];
    if (!r || !FB.isForeignPolicyTarget(s, rid)) {
      if (returnContext) interactionReturn(returnContext);
      else UI.showForeignPolicy();
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
    openModal(FB.T('Policy toward {realm}', { realm: r.name }), h, {
      historyView:!!returnContext,
      historyBackRender:function () {
        interactionReturn(returnContext);
      }
    });
    document.querySelectorAll('[data-policy-stance]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (FB.setForeignPolicy(FB.state, rid, Number(btn.dataset.policyStance))) {
          if (returnContext) interactionReturn(returnContext);
          else UI.showForeignPolicy();
          UI.refresh();
        }
      });
    });
    $('gm-back').addEventListener('click', function () {
      if (returnContext) {
        modalHistoryBack(function () {
          interactionReturn(returnContext);
        });
      } else {
        UI.showForeignPolicy();
      }
    });
  };

  /* ================= liege-chain pickers ================= */

  /* bend the knee anywhere along your own chain */
  UI.showHomage = function (returnContext) {
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
    h += '</div><button class="btn" id="gm-cancel">' +
      esc(returnContext ? FB.T('Back') : FB.T('Not now')) + '</button>';
    openModal(FB.T('Pay Homage'), h, managementModalOptions(returnContext));
    document.querySelectorAll('[data-rid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.payHomage(FB.state, btn.dataset.rid);
        managementFinish(returnContext, UI.closeModal);
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      delete FB.state.player.cooldowns.pay_homage; // no journey, no cooldown
      managementBack(returnContext, function () {
        UI.closeModal(); UI.refresh();
      });
    });
  };

  /* appeal to a lord ABOVE your direct liege */
  UI.showAppeal = function (returnContext) {
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
    h += '</div><button class="btn" id="gm-cancel">' +
      esc(returnContext ? FB.T('Back') : FB.T('Not now')) + '</button>';
    openModal(FB.T('Appeal to a Higher Lord'), h,
      managementModalOptions(returnContext));
    document.querySelectorAll('[data-rid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const rid = btn.dataset.rid;
        FB.state.player.appealRid = rid;
        FB.queueEvent(FB.state, 'liege_appeal', { rid:rid });
        managementFinish(returnContext, UI.closeModal);
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      delete FB.state.player.cooldowns.appeal_lord; // no suit carried, no cooldown
      managementBack(returnContext, function () {
        UI.closeModal(); UI.refresh();
      });
    });
  };

  /* sue the liege for a disgraced neighbor's fief */
  UI.showPetitionCounty = function (returnContext) {
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
    h += '</div><button class="btn" id="gm-cancel">' +
      esc(returnContext ? FB.T('Back') : FB.T('Not now')) + '</button>';
    openModal(FB.T('Petition for a Fief'), h,
      managementModalOptions(returnContext));
    document.querySelectorAll('[data-pid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        s.player.petitionPid = btn.dataset.pid;
        FB.queueEvent(s, 'county_petition', { pid:btn.dataset.pid });
        managementFinish(returnContext, UI.closeModal);
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      delete FB.state.player.cooldowns.petition_county; // no suit pressed, no cooldown
      managementBack(returnContext, function () {
        UI.closeModal(); UI.refresh();
      });
    });
  };

  /* a struggling neighbor sells his birthright */
  UI.showBuyCounty = function (returnContext) {
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
    h += '</div><button class="btn" id="gm-cancel">' +
      esc(returnContext ? FB.T('Back') : FB.T('Not now')) + '</button>';
    openModal(FB.T('Buy Out a Neighbor'), h,
      managementModalOptions(returnContext));
    document.querySelectorAll('[data-pid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!FB.buyCounty(FB.state, btn.dataset.pid)) { UI.toast('Not enough money.'); return; }
        managementFinish(returnContext, UI.closeModal);
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      delete FB.state.player.cooldowns.buy_county; // no bargain, no cooldown
      managementBack(returnContext, function () {
        UI.closeModal(); UI.refresh();
      });
    });
  };

  /* found a holding on empty land */
  UI.showSettleWaste = function (returnContext) {
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
    h += '</div><button class="btn" id="gm-cancel">' +
      esc(returnContext ? FB.T('Back') : FB.T('Not now')) + '</button>';
    openModal(FB.T('Settle the Wasteland'), h,
      managementModalOptions(returnContext));
    document.querySelectorAll('[data-pid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.settleWaste(FB.state, btn.dataset.pid);
        managementFinish(returnContext, UI.closeModal);
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      delete FB.state.player.cooldowns.settle_waste; // no ground broken, no cooldown
      managementBack(returnContext, function () {
        UI.closeModal(); UI.refresh();
      });
    });
  };

  /* offer your lands to a neighboring sovereign */
  UI.showFealty = function (returnContext) {
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
    h += '</div><button class="btn" id="gm-cancel">' +
      esc(returnContext ? FB.T('Back') : FB.T('Not now')) + '</button>';
    openModal(FB.T('Swear Fealty'), h, managementModalOptions(returnContext));
    document.querySelectorAll('[data-rid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.swearFealty(FB.state, btn.dataset.rid);
        managementFinish(returnContext, UI.closeModal);
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      managementBack(returnContext, UI.closeModal);
    });
  };

  function giftArmoryRefs(s) {
    return FB.itemList(s).slice().sort(function (a, b) {
      return FB.itemName(s, a).localeCompare(FB.itemName(s, b));
    });
  }

  function interactionGiftArmoryRefs(s) {
    if (!s || !s.player || !Array.isArray(s.player.items)) return [];
    return s.player.items.slice().sort(function (a, b) {
      return FB.itemNameReadOnly(s, a).localeCompare(
        FB.itemNameReadOnly(s, b));
    });
  }

  function giftDeliveryText(s, kind, id) {
    if (!FB.giftDeliveryPreview) return '';
    const preview = FB.giftDeliveryPreview(s, kind, id, {
      readOnly:true
    });
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

  function giftItemUnavailableText(s, ref, kind, id) {
    const status = FB.itemGiftStatus(s, ref, kind, id);
    return status.ready ? '' : status.reason;
  }

  UI.showCharacterGiftModal = function (cid, returnContext) {
    const s = FB.state;
    const c = s && s.chars[cid];
    if (!s || !c || c.dead || c.id === s.player.charId) return;
    const rulerId = FB.realmIdForRulerCharacter &&
      FB.realmIdForRulerCharacter(s, c);
    if (rulerId) {
      UI.showRulerGiftModal(rulerId, {
        kind:'character-card',
        characterId:c.id,
        returnContext:returnContext || null
      });
      return;
    }
    const household = FB.isHouseholdCharacter && FB.isHouseholdCharacter(s, cid);
    const cashStatus = FB.characterGiftStatus(s, cid);
    const days = cashStatus.daysRemaining;
    const deliveryPreview = cashStatus.delivery;
    const deliveryText = giftDeliveryText(s, 'character', cid);
    const deliveryUnavailable = deliveryPreview && deliveryPreview.foreign &&
      !deliveryPreview.eligible ? deliveryPreview.reason : '';
    const cashCost = cashStatus.cost;
    const cashBoost = cashStatus.standing;
    const cashBlocked = !cashStatus.ready;
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
        const blocked = giftItemUnavailableText(
          s, ref, 'character', cid);
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
      historyBackRender:function () {
        UI.showCharModal(cid, returnContext);
      }
    });
    const cash = $('gift-character-cash');
    if (cash) cash.addEventListener('click', function () {
      if (!FB.giveSocialCashGift(s, cid)) return;
      FB.game.passDay({ skipFocus:true });
      UI.showCharModal(cid, returnContext);
      mobileNavClosedAll('modal-view', true);
      UI.refresh();
    });
    document.querySelectorAll('[data-character-gift-item]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (!FB.giveItem(s, button.dataset.characterGiftItem, cid)) return;
        FB.game.passDay({ skipFocus:true });
        UI.showCharModal(cid, returnContext);
        mobileNavClosedAll('modal-view', true);
        UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      modalHistoryBack(function () {
        UI.showCharModal(cid, returnContext);
      });
    });
  };

  UI.showRulerGiftModal = function (rid, returnView) {
    const s = FB.state;
    const r = s && rid && s.realms[rid];
    if (!s || !r || !r.alive || !r.ruler || rid === 'player') return;
    function returnToRulerGiftSource() {
      if (returnView && typeof returnView === 'object' &&
          returnView.kind === 'realm-card') {
        UI.showLiegeModal(rid, returnView.returnContext, true);
      }
      else if (returnView && typeof returnView === 'object' &&
          returnView.kind === 'council') {
        UI.showCouncil(returnView.returnView, returnView.returnContext, true);
      }
      else if (returnView && typeof returnView === 'object' &&
          returnView.kind === 'character-card') {
        UI.showCharModal(returnView.characterId, returnView.returnContext);
      }
      else if (returnView === 'governance') UI.showGovernance('vassals');
      else if (returnView === 'council:governance') UI.showCouncil('governance');
      else if (returnView === 'council') UI.showCouncil();
      else if (returnView && returnView.indexOf('realm:governance:') === 0) {
        UI.showLiegeModal(rid, {
          view:'governance',
          section:returnView.slice('realm:governance:'.length) || 'position'
        }, true);
      }
      else if (returnView && returnView.indexOf('character:') === 0) {
        UI.showCharModal(returnView.slice('character:'.length));
      }
      else UI.showLiegeModal(rid);
    }
    const cashStatus = FB.rulerGiftStatus(s, rid);
    const days = cashStatus.daysRemaining;
    const deliveryPreview = cashStatus.delivery;
    const deliveryText = giftDeliveryText(s, 'ruler', rid);
    const deliveryUnavailable = deliveryPreview && deliveryPreview.foreign &&
      !deliveryPreview.eligible ? deliveryPreview.reason : '';
    const cashCost = cashStatus.cost;
    const cashBoost = cashStatus.standing;
    const standing = FB.T('Standing');
    const cashBlocked = !cashStatus.ready;
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
      const blocked = giftItemUnavailableText(s, ref, 'ruler', rid);
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
      FB.game.passDay({ skipFocus:true });
      returnToRulerGiftSource();
      mobileNavClosedAll('modal-view', true);
      UI.refresh();
    });
    document.querySelectorAll('[data-ruler-gift-item]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (!FB.giveRulerItemGift(s, button.dataset.rulerGiftItem, rid)) return;
        FB.game.passDay({ skipFocus:true });
        returnToRulerGiftSource();
        mobileNavClosedAll('modal-view', true);
        UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      modalHistoryBack(returnToRulerGiftSource);
    });
  };

  function addInteractionAction(model, action) {
    if (!action || !action.id || !action.group || !action.label) return;
    model.actions.push(action);
  }

  function interactionAttentionTarget(s) {
    const attention = s && s.player && s.player.socialAttention;
    if (!attention || typeof attention !== 'object' ||
        Array.isArray(attention)) return null;
    const courtId = s.player.courtingId;
    if (courtId && attention[courtId] && s.chars[courtId] &&
        !s.chars[courtId].dead) return s.chars[courtId];
    const ids = Object.keys(attention).sort();
    for (let i = 0; i < ids.length; i++) {
      const c = s.chars[ids[i]];
      if (c && !c.dead && c.id !== s.player.charId) return c;
    }
    return null;
  }

  function interactionRetainerRecord(s, cid) {
    const retainers = s && s.player && s.player.retainers;
    if (!Array.isArray(retainers)) return null;
    for (let i = 0; i < retainers.length; i++) {
      if (retainers[i] && retainers[i].charId === cid) {
        return retainers[i];
      }
    }
    return null;
  }

  function interactionCareerTitle(s, c) {
    let career = c && c.career;
    if (!career) {
      let profession = 'farmer';
      const isPlayer = c && c.id === s.player.charId;
      if (isPlayer) {
        profession = s.player.professionBack ||
          s.player.profession || 'farmer';
      } else if (FB.stationOf(c) >= 2 ||
          (s.player.tier >= 2 && FB.isHouseholdCharacter(s, c.id))) {
        profession = 'noble';
      }
      career = {
        profession:profession,
        rank:FB.ageOf(c, s.date.year) < 16
          ? (isPlayer ? 'apprentice' : 'unassigned')
          : 'journeyman'
      };
    }
    const def = FBDATA.careers[career.profession];
    if (!def) return FB.T('No occupation');
    const rank = career.rank || 'journeyman';
    if (rank === 'unassigned') return FB.T('No apprenticeship chosen');
    return FB.dataText(s, s.player.charId, 'career', career.profession, def,
      def.ranks && def.ranks[rank] ? 'ranks.' + rank : 'name', {});
  }

  function interactionRoyalCompact(s) {
    const compact = s && s.player && s.player.royalCompact;
    if (!compact) return null;
    const me = s.chars[s.player.charId];
    const spouse = s.chars[compact.charId];
    return me && spouse && !spouse.dead &&
      (me.spouseId === spouse.id || spouse.spouseId === me.id)
      ? compact : null;
  }

  function interactionRealmRulerCharacter(s, rid) {
    return FB.realmRulerCharacterSnapshot
      ? FB.realmRulerCharacterSnapshot(s, rid) : null;
  }

  function interactionRivalHeat(s) {
    const rivalId = s.roles && s.roles.rival;
    const rival = rivalId && s.chars[rivalId];
    const feud = rival && !rival.dead && s.player.rivalry;
    if (feud) return feud.heat || 0;
    if (rival && !rival.dead) {
      const value = FBDATA.balance.rivalHeatOldSave;
      return value === undefined ? 35 : value;
    }
    return 0;
  }

  function instantInteractionAction(s, id, group) {
    const status = FB.instantStatus(s, id);
    if (!status.shown || !status.action) return null;
    return {
      id:'instant:' + id,
      group:group,
      label:dt(s, 'action', id, status.action, 'label'),
      detail:FB.translateKnown(status.action.desc(s)),
      enabled:status.can,
      blockedReason:status.reason || null,
      consequence:status.action.noConsume
        ? FB.T('Opens the existing review or confirmation; opening it costs no day.')
        : FB.T('The existing deed revalidates its gates and spends the day.'),
      route:'instant',
      actionId:id
    };
  }

  function realmFamilySnapshot(s, rid) {
    return FB.realmFamilySnapshot ? FB.realmFamilySnapshot(s, rid) : [];
  }

  function realmCultivationPreview(s, rid, rulerCharacter) {
    const realm = s.realms[rid];
    const destinationId = realm && realm.capital;
    const travel = s.player.travel;
    const locationId = travel
      ? (travel.phase === 'arrived' ? travel.currentId : null)
      : s.player.provinceId;
    const out = {
      eligible:false,
      active:!!destinationId && locationId === destinationId,
      destinationId:destinationId,
      days:0,
      cost:0,
      minimumStay:FBDATA.balance.travelMinStayDays || 90,
      rate:FB.socialAttentionDailyOpinion(),
      reason:''
    };
    if (out.active) {
      out.eligible = true;
      return out;
    }
    if (rulerCharacter && FB.socialVisitPreview) {
      const preview = FB.socialVisitPreview(s, rulerCharacter, {
        readOnly:true
      });
      for (const key in preview) out[key] = preview[key];
      out.active = false;
      out.rate = preview.dailyRate;
      return out;
    }
    const eligible = FB.travelEligible
      ? FB.travelEligible(s, 'relationship', { readOnly:true }) : false;
    if (eligible !== true) {
      out.reason = eligible || FB.T('A targeted visit is unavailable.');
      return out;
    }
    const route = destinationId && FB.travelRoute(
      s.player.provinceId, destinationId);
    if (!route || !route.length) {
      out.reason = FB.T('No settled overland route reaches the ruler’s capital.');
      return out;
    }
    out.eligible = true;
    out.route = route;
    out.days = route.length * FB.travelLegDaysSnapshot(s);
    out.cost = FB.travelCostSnapshot('relationship', route, s);
    if (out.cost > s.player.gold) {
      out.eligible = false;
      out.reason = FB.T(
        'The journey costs {money:cost}; you have {money:current}.', {
          cost:out.cost,
          current:Math.floor(s.player.gold)
        });
    }
    return out;
  }

  function realmRelationshipText(s, rid) {
    const p = s.player;
    const upward = p.liege ? FB.liegeChain(s, p.liege) : [];
    if (rid === p.liege) return FB.T('Direct liege');
    if (upward.indexOf(rid) >= 0) return FB.T('Higher liege');
    if (FB.playerVassals(s).indexOf(rid) >= 0) return FB.T('Direct vassal');
    if (p.war && p.war.enemy === rid) return FB.T('War enemy');
    if (FB.areAlliedSnapshot(s, 'player', rid)) {
      return FB.T('Defensive ally');
    }
    if (s.pacts && s.pacts[rid] > s.turn) return FB.T('Peace-pact partner');
    if (FB.isPlayerSovereign(s) && s.realms.player &&
        FB.realmsAdjacent(s, 'player', rid)) {
      return s.realms[rid].liege
        ? FB.T('Neighboring vassal realm')
        : FB.T('Neighboring sovereign');
    }
    return s.realms[rid].liege
      ? FB.T('Ruler within another realm')
      : FB.T('Foreign sovereign');
  }

  function warCauseName(s, cause) {
    if (cause.type === 'aggression') return FB.T('War of Aggression');
    if (cause.type === 'fabricated') return FB.T('Fabricated county claim');
    if (cause.type === 'restoration') {
      return FB.T('Restore the crown of {title}', {
        title:cause.titleName || FB.T('the lost realm')
      });
    }
    if (cause.type === 'caliphate') {
      return FB.T('Succession claim to {title}', {
        title:FB.religiousHeadTitle(s, 'sunni')
      });
    }
    const def = cause.titleKind === 'duchy'
      ? FBDATA.duchies[cause.titleId]
      : (cause.titleKind === 'kingdom'
        ? FBDATA.kingdoms[cause.titleId]
        : FBDATA.empires[cause.titleId]);
    return FB.T('De jure right through {title}', {
      title:def ? def.name : cause.titleId
    });
  }

  function buildRealmInteractionCard(s, rid) {
    const realm = s && s.realms[rid];
    if (!realm || !realm.alive || !realm.ruler) return null;
    const cap = realm.capital && FB.world.byId[realm.capital];
    const faithId = FB.realmReligionId
      ? FB.realmReligionId(s, rid)
      : (cap && cap.religion);
    const standing = FB.standingOf(s, { kind:'realm', id:rid });
    const rulerCharacter = interactionRealmRulerCharacter(s, rid);
    const succession = realm.succession;
    const family = realmFamilySnapshot(s, rid);
    const successionText = family.map(function (member) {
      return succession && succession.heirId === member.id
        ? FB.T('{name} (heir)', { name:member.name })
        : member.name;
    }).join(', ');
    const model = {
      target:{ kind:'realm', id:rid },
      context:[
        { label:FB.T('Realm'), value:FB.L(realm.name) },
        { label:FB.T('Political relationship'),
          value:realmRelationshipText(s, rid) },
        { label:FB.T('Rank'), value:FB.realmRankTitle(s, realm) },
        { label:FB.T('Ruler'), value:realm.ruler.name },
        { label:FB.T('Ruler’s ambition'), value:FB.rulerAimLabel
          ? FB.rulerAimLabel(s, rid) : FB.T('Unknown') },
        { label:FB.T('Diplomatic reach'), value:FB.rulerPlayerRelevanceText
          ? FB.rulerPlayerRelevanceText(s, rid) : FB.T('Unknown') },
        { label:FB.T('Faith'), value:faithId
          ? religionName(s, faithId) : FB.T('Unknown') },
        { label:FB.T('Capital'), value:cap ? cap.name : FB.T('Unknown') },
        { label:FB.T('Overlord'), value:realm.liege && s.realms[realm.liege]
          ? FB.L(s.realms[realm.liege].name) : FB.T('Sovereign') },
        { label:FB.T('Succession'), value:successionText ||
          FB.T('No visible royal child') }
      ],
      standing:{
        value:standing,
        band:standingBand(standing),
        explanation:realmStandingContext(s, rid)
      },
      commitments:[],
      actions:[]
    };
    const p = s.player;
    const policy = FB.foreignPolicyTargetStatus
      ? FB.foreignPolicyTargetStatus(s, rid) : null;
    const gift = FB.rulerGiftStatus
      ? FB.rulerGiftStatus(s, rid) : null;
    if (policy && policy.stance) {
      model.commitments.push({
        id:'foreign-policy',
        label:FB.T('Foreign-policy direction'),
        detail:FB.T('{stance} · {used}/{capacity} political attention assigned', {
          stance:foreignPolicyStanceText(s, rid),
          used:policy.used,
          capacity:policy.capacity
        })
      });
    }
    if (s.pacts && s.pacts[rid] > s.turn) {
      model.commitments.push({
        id:'peace-pact',
        label:FB.T('Peace pact'),
        detail:FB.T('{days} days remain', {
          days:s.pacts[rid] - s.turn
        })
      });
    }
    if (FB.areAlliedSnapshot(s, 'player', rid)) {
      model.commitments.push({
        id:'alliance',
        label:FB.T('Defensive alliance'),
        detail:allianceText(s, rid, true)
      });
    }
    if (p.war && p.war.enemy === rid) {
      model.commitments.push({
        id:'war',
        label:FB.T('Active war'),
        detail:FB.T('This realm is your current war enemy.'),
        urgent:true
      });
    } else if (FB.isRealmAtWar(s, rid)) {
      model.commitments.push({
        id:'foreign-war',
        label:FB.T('Current war'),
        detail:FB.T('This ruler is at war with another realm.'),
        urgent:true
      });
    }
    if (gift && (gift.daysRemaining ||
        (gift.delivery && gift.delivery.pending))) {
      model.commitments.push({
        id:'ruler-gift',
        label:FB.T('Ruler gift'),
        detail:gift.delivery && gift.delivery.pending
          ? giftDeliveryText(s, 'ruler', rid)
          : FB.T('Recipient cooldown: {days} days remain.', {
            days:gift.daysRemaining
          })
      });
    }
    const compact = interactionRoyalCompact(s);
    if (compact && compact.realmId === rid) {
      model.commitments.push({
        id:'royal-compact',
        label:FB.T('Royal marriage compact'),
        detail:FB.T('This court is joined to your dynasty through marriage.')
      });
    }

    const attentionTarget = interactionAttentionTarget(s);
    const cultivated = rulerCharacter && attentionTarget &&
      attentionTarget.id === rulerCharacter.id;
    const cultivation = realmCultivationPreview(s, rid, rulerCharacter);
    const attentionBlocked = !!(p.courtingId &&
      (!rulerCharacter || p.courtingId !== rulerCharacter.id));
    const cultivationEnabled = !attentionBlocked && cultivation.eligible;
    let cultivationDetail;
    if (attentionBlocked) {
      cultivationDetail = FB.T(
        'End the current courtship before assigning personal attention elsewhere.');
    } else if (cultivation.active) {
      cultivationDetail = FB.T(
        'Assign personal attention for +{rate} Standing each ordinary day. This costs no day.', {
          rate:cultivation.rate
        });
    } else if (cultivation.eligible) {
      cultivationDetail = FB.T(
        'Visit the capital: {days} travel days, {money:cost}, at least {stay} days in residence, then +{rate} Standing each ordinary day.', {
          days:cultivation.days,
          cost:cultivation.cost,
          stay:cultivation.minimumStay,
          rate:cultivation.rate
        });
    } else {
      cultivationDetail = cultivation.reason;
    }
    addInteractionAction(model, {
      id:'relationship.cultivate',
      group:cultivation.active ? 'relationship' : 'travel',
      label:cultivated
        ? FB.T('Continue cultivating this ruler')
        : (cultivation.active
          ? FB.T('Cultivate relationship')
          : FB.T('Travel to cultivate this ruler…')),
      detail:cultivationDetail,
      enabled:cultivationEnabled,
      blockedReason:cultivationEnabled ? null : cultivationDetail,
      consequence:cultivated
        ? FB.T('Keeps the current personal-attention assignment.')
        : (attentionTarget
          ? FB.T('Replaces personal attention to {name}.', {
            name:FB.fullName(attentionTarget)
          })
          : FB.T('Uses the one personal-attention assignment.')),
      route:'cultivate-ruler',
      domId:'rm-cultivate'
    });

    if (gift) {
      const itemPossible = interactionGiftArmoryRefs(s).some(function (ref) {
        return !giftItemUnavailableText(s, ref, 'ruler', rid);
      });
      const giftEnabled = gift.ready || itemPossible;
      addInteractionAction(model, {
        id:'gift.ruler',
        group:'gift',
        label:FB.T('Offer a gift…'),
        detail:FB.T(
          'Cash costs {money:cost} for +{standing} Standing; eligible armory items grant their quality value. The recipient cooldown is {days} days and accepting a gift spends the day.', {
            cost:gift.cost,
            standing:gift.standing,
            days:gift.cooldownDays
          }),
        enabled:giftEnabled,
        blockedReason:giftEnabled ? null : gift.reason,
        consequence:gift.delivery && gift.delivery.foreign
          ? FB.T('Standing and cooldown begin only when the courier arrives.')
          : FB.T('Uses this ruler generation’s one recipient cooldown.'),
        route:'ruler-gift',
        domId:'rm-gift'
      });
    }

    if (policy && policy.relevant) {
      addInteractionAction(model, {
        id:'diplomacy.policy',
        group:'diplomacy',
        label:FB.T('Set foreign-policy direction…'),
        detail:FB.T(
          '{used}/{capacity} assignments used; each active direction changes Standing by about {amount} each season and costs no day.', {
            used:policy.used,
            capacity:policy.capacity,
            amount:Math.round(policy.amount * 10) / 10
          }),
        enabled:policy.ready,
        blockedReason:policy.reason || null,
        consequence:policy.stance
          ? FB.T('May keep, reverse, or withdraw the current direction.')
          : FB.T('Uses one political-attention assignment until set to Neutral.'),
        route:'foreign-policy',
        domId:'gm-policy'
      });
    }

    const envoy = FB.envoyStatus ? FB.envoyStatus(s, rid) : null;
    if (envoy && envoy.relevant) {
      addInteractionAction(model, {
        id:'diplomacy.envoy',
        group:'diplomacy',
        label:FB.T('Offer a peace pact…'),
        detail:FB.T(
          'Costs {money:cost}; chance about {chance}%; success creates {days} days of non-aggression.', {
            cost:envoy.cost,
            chance:Math.round(envoy.chance * 100),
            days:envoy.durationDays
          }),
        enabled:envoy.ready,
        blockedReason:envoy.reason || null,
        consequence:FB.T('Uses the existing envoy resolution and spends no travel time.'),
        route:'envoy'
      });
    }
    const alliance = FB.allianceOfferStatus
      ? FB.allianceOfferStatus(s, rid) : null;
    if (alliance && alliance.relevant) {
      addInteractionAction(model, {
        id:'diplomacy.alliance',
        group:'diplomacy',
        label:FB.T('Offer a defensive alliance…'),
        detail:FB.T(
          'Requires {standing} Standing, costs {money:cost}, and succeeds at about {chance}%.', {
            standing:alliance.standingRequired,
            cost:alliance.cost,
            chance:Math.round(alliance.chance * 100)
          }),
        enabled:alliance.ready,
        blockedReason:alliance.reason || null,
        consequence:FB.T(
          'Each realm may have one ally; the compact ends when either ruler changes.'),
        route:'envoy-alliance'
      });
    }

    const upward = p.liege ? FB.liegeChain(s, p.liege) : [];
    const directVassal = FB.playerVassals(s).indexOf(rid) >= 0;
    if (upward.indexOf(rid) >= 0) {
      for (const id of ['pay_homage', 'appeal_lord']) {
        const action = instantInteractionAction(s, id, 'feudal');
        if (action) addInteractionAction(model, action);
      }
    }
    if (rid === p.liege) {
      for (const id of ['petition_liege', 'petition_county',
        'declare_independence']) {
        const action = instantInteractionAction(s, id,
          id === 'declare_independence' ? 'war' : 'feudal');
        if (action) addInteractionAction(model, action);
      }
    }
    if (directVassal) {
      for (const id of ['demand_taxes', 'revoke_county']) {
        const action = instantInteractionAction(s, id, 'feudal');
        if (action) addInteractionAction(model, action);
      }
      const favor = FB.vassalLevyFavorStatus(s, rid);
      addInteractionAction(model, {
        id:'feudal.exceptional-levy',
        group:'feudal',
        label:FB.T('Ask for an exceptional levy'),
        detail:FB.T(
          'Adds {percent}% of this vassal’s levy for one year, lowers Standing by 15, and spends the day.', {
            percent:Math.round(
              (FBDATA.balance.vassalLevyFavorRate || 0.05) * 100)
          }),
        enabled:favor.ready,
        blockedReason:favor.ready ? null : favor.reason,
        consequence:FB.T('Creates this vassal’s existing one-year levy promise.'),
        route:'vassal-levy'
      });
      const council = FB.councilSummary ? FB.councilSummary(s) : null;
      if (council) {
        const seatId = council.seated[rid] || null;
        addInteractionAction(model, {
          id:'feudal.council',
          group:'feudal',
          label:seatId
            ? FB.T('Manage this ruler’s Council office…')
            : FB.T('Review this ruler for the Royal Council…'),
          detail:seatId
            ? FB.T('{office} · {benefit}', {
              office:councilSeatName(seatId),
              benefit:councilSeatDesc(seatId)
            })
            : FB.T(
              'This direct vassal holds no great office. Open the Council to review vacancies and appointments.'),
          enabled:true,
          blockedReason:null,
          consequence:FB.T(
            'Appointments, replacements, gifts, and dismissals keep their existing Standing and crown-authority effects.'),
          route:'council'
        });
      }
    }

    const causes = FB.realmWarCauses
      ? FB.realmWarCauses(s, rid, true) : [];
    for (const cause of causes) {
      const province = FB.world.byId[cause.target];
      addInteractionAction(model, {
        id:'war.' + cause.type + '.' + cause.target,
        group:'war',
        label:FB.T('Press {cause}…', { cause:warCauseName(s, cause) }),
        detail:FB.T(
          'Target: {province}. Opens the existing cause review and muster preview.', {
            province:province ? province.name : cause.target
          }),
        enabled:!cause.blocked,
        blockedReason:FB.warCauseBlockedReason
          ? FB.warCauseBlockedReason(cause) : null,
        consequence:cause.sacrilegious
          ? FB.T(
            'A separate condemnation confirmation appears before war can begin.')
          : FB.T('War begins only after the existing cause selection is confirmed.'),
        route:'war',
        causeTarget:cause.target
      });
    }

    if ((upward.indexOf(rid) >= 0 || directVassal) &&
        FB.governanceEligible && FB.governanceEligible(s)) {
      addInteractionAction(model, {
        id:'management.governance',
        group:'management',
        label:FB.T('Open Governance…'),
        detail:FB.T(
          'Review your own domain, obligations, institution, and political position.'),
        enabled:true,
        blockedReason:null,
        consequence:FB.T('Leaves this one-counterpart card for the authoritative overview.'),
        route:'governance',
        domId:'rm-governance'
      });
    }
    if (rulerCharacter) {
      addInteractionAction(model, {
        id:'management.personal-character',
        group:'management',
        label:FB.T('Personal character…'),
        detail:FB.T(
          'Open personal traits, family, courtship, rivalry, and household dealings.'),
        enabled:true,
        blockedReason:null,
        consequence:FB.T('Political gifts remain on this ruler path.'),
        route:'personal-character',
        domId:'rm-character'
      });
    }

    const me = s.chars[p.charId];
    const chain = p.liege ? FB.liegeChain(s, p.liege) : [];
    const royalNeighbor = FB.isPlayerSovereign(s) && s.realms.player &&
      s.realms.player.rank >= 3 && !realm.liege && realm.rank >= 3 &&
      FB.realmsAdjacent(s, 'player', rid);
    const mayApproach = chain.indexOf(rid) >= 0 || royalNeighbor;
    for (const child of family) {
      const age = Math.max(0, s.date.year - child.born);
      const station = realm.rank <= 2 ? 3 : 4;
      const canTry = mayApproach && age >= 16 && child.sex !== me.sex &&
        !compact && FB.canWedSnapshot(s) &&
        !(FB.closeMarriageKinSnapshot &&
          FB.closeMarriageKinSnapshot(s, me, {
          royalLine:{ realmId:rid, memberId:child.id }
        })) &&
        station - FB.playerStation(s) < 3;
      if (!canTry) continue;
      addInteractionAction(model, {
        id:'relationship.royal-courtship.' + child.id,
        group:'relationship',
        label:FB.T('Approach {name} for courtship…', {
          name:child.name
        }),
        detail:succession && succession.heirId === child.id
          ? FB.T('The designated heir can transmit the crown to your shared branch.')
          : FB.T(
            'This creates a dynastic tie, but this child does not currently transmit the crown.'),
        enabled:true,
        blockedReason:null,
        consequence:FB.T(
          'Materializes this royal child only after you choose the action.'),
        route:'royal-courtship',
        memberId:child.id
      });
    }
    return model;
  }
  UI.realmInteractionCard = buildRealmInteractionCard;

  function interactionReturn(returnContext) {
    if (!returnContext) {
      UI.closeModal();
      return;
    }
    if (returnContext.view === 'governance') {
      UI.showGovernance(returnContext.section || 'position');
    } else if (returnContext.view === 'council') {
      UI.showCouncil(returnContext.returnView,
        returnContext.returnContext);
    } else if (returnContext.view === 'estates') {
      UI.showParliament(returnContext.returnView);
    } else if (returnContext.view === 'realm') {
      UI.showLiegeModal(returnContext.realmId, returnContext.returnContext);
    } else if (returnContext.view === 'character') {
      UI.showCharModal(returnContext.characterId, returnContext.returnContext);
    } else if (returnContext.view === 'retainer') {
      UI.showRetainerManage(returnContext.characterId,
        returnContext.returnContext);
    } else {
      UI.closeModal();
    }
  }

  function managementModalOptions(returnContext, modalClass) {
    if (!returnContext && !modalClass) return undefined;
    const options = {};
    if (modalClass) options.modalClass = modalClass;
    if (returnContext) {
      options.historyView = true;
      options.historyBackRender = function () {
        interactionReturn(returnContext);
      };
    }
    return options;
  }

  function managementBack(returnContext, fallback) {
    if (!returnContext) {
      fallback();
      return;
    }
    modalHistoryBack(function () {
      interactionReturn(returnContext);
    });
  }

  function managementFinish(returnContext, fallback) {
    UI.refresh();
    if (!returnContext) {
      fallback();
      return;
    }
    interactionReturn(returnContext);
    mobileNavClosedAll('modal-view', true);
  }

  function realmGiftReturnView(rid, returnContext) {
    if (returnContext && returnContext.view === 'governance') {
      return 'realm:governance:' + (returnContext.section || 'position');
    }
    return {
      kind:'realm-card',
      returnContext:returnContext || null
    };
  }

  /* The living court beside the ruler: the consort and whichever heirs carry
     a record. Faces are painted through FB.faceTag and the one FB.paintFaces
     pass this modal already runs, and the list is bounded by the same
     six-member cap the succession snapshot uses. */
  function realmCourtStripHtml(s, rid) {
    const rows = [];
    const consort = FB.realmConsortCharacter && FB.realmConsortCharacter(s, rid);
    if (consort) rows.push({ c:consort, rel:FB.T('Consort') });
    const succession = s.realms[rid] && s.realms[rid].succession;
    for (const member of realmFamilySnapshot(s, rid)) {
      const c = member.charId && s.chars[member.charId];
      if (!c || c.dead) continue;
      rows.push({
        c:c,
        rel:succession && succession.heirId === member.id
          ? FB.T('Heir') : FB.T(c.sex === 'f' ? 'Daughter' : 'Son')
      });
    }
    if (!rows.length) return '';
    let h = '<div class="court-strip" role="list" aria-label="' +
      esc(FB.T('The court')) + '">';
    for (const row of rows) {
      h += '<button type="button" class="ftchip" role="listitem" data-cid="' +
        esc(row.c.id) + '" title="' + esc(FB.fullName(row.c)) + '">' +
        FB.faceTag(row.c, 50, 57) +
        '<span class="fname">' + esc(row.c.name) + '</span>' +
        '<span class="frel">' + esc(FB.T('{relation} · age {age}', {
          relation:row.rel, age:FB.ageOf(row.c, s.date.year)
        })) + '</span></button>';
    }
    return h + '</div>';
  }

  function showRealmInteractionSheet(rid, returnContext, replaceView) {
    const s = FB.state;
    const realm = s && rid && s.realms[rid];
    if (!s || !realm) return;
    /* If startup eagerness is tuned to rulers only, the first realm open is
       the explicit boundary that fills its same bounded court on demand. */
    if (FB.ensureRealmCourtForDisplay) {
      FB.ensureRealmCourtForDisplay(s, rid);
    }
    const model = buildRealmInteractionCard(s, rid);
    if (!model) return;
    const rulerCharacter = interactionRealmRulerCharacter(s, rid);
    /* A living realm's ruler is a real record, so the sheet opens on the same
       character card every other view uses. The crest header remains for the
       cases that genuinely have no person behind them. */
    const header = rulerCharacter
      ? UI.charCardHtml(s, rulerCharacter)
      : '<div class="charcard">' +
        '<canvas id="liegecrest" class="pface" width="56" height="64"></canvas>' +
        '<div><div class="ccname">' + esc(FB.T('{title} {name}', {
          title:FB.realmRankTitle(s, realm),
          name:realm.ruler.name
        })) + '</div><div class="ccmeta">' + esc(FB.L(realm.name)) +
        '</div></div></div>';
    let h = header + realmCourtStripHtml(s, rid) + interactionCardHtml(model) +
      '<div class="gm-footer"><button type="button" class="btn" id="gm-cancel">' +
      esc(returnContext ? FB.T('Back') : FB.T('Close')) +
      '</button></div>';
    openModal(rid === s.player.liege
      ? FB.T('Your Liege') : FB.T('Realm Ruler'), h, {
        modalClass:'fullsheet-modal interaction-modal realm-interaction-modal',
        historyView:!!returnContext,
        replaceView:!!replaceView,
        historyBackRender:function () {
          interactionReturn(returnContext);
        }
      });
    if ($('liegecrest')) FB.drawCrest($('liegecrest'), rid);
    FB.paintFaces($('gm-body'), s);
    wireInteractionCard(model, function (action) {
      if (action.route === 'ruler-gift') {
        UI.showRulerGiftModal(rid, realmGiftReturnView(rid, returnContext));
      } else if (action.route === 'cultivate-ruler') {
        const c = rulerCharacter || FB.materializeRealmRuler(s, rid);
        if (!c) return;
        const presence = FB.socialAttentionPresence(s, c);
        if (presence.status === 'active') {
          if (!FB.socialAttentionAssign(s, c)) return;
          UI.showLiegeModal(rid, returnContext, true);
          UI.refresh();
        } else {
          UI.showSocialVisit(c.id, {
            returnRealmId:rid,
            returnContext:returnContext
          });
        }
      } else if (action.route === 'personal-character') {
        if (!rulerCharacter) return;
        UI.showCharModal(rulerCharacter.id, {
          view:'realm',
          realmId:rid,
          returnContext:returnContext
        });
      } else if (action.route === 'foreign-policy') {
        UI.showForeignPolicyStance(rid, {
          view:'realm',
          realmId:rid,
          returnContext:returnContext
        });
      } else if (action.route === 'envoy' ||
          action.route === 'envoy-alliance') {
        UI.showEnvoys(rid, {
          view:'realm',
          realmId:rid,
          returnContext:returnContext
        });
      } else if (action.route === 'instant') {
        const status = FB.instantStatus(s, action.actionId);
        FB.runInstant(s, action.actionId, {
          returnContext:{
            view:'realm',
            realmId:rid,
            returnContext:returnContext
          }
        });
        if (status.action && !status.action.noConsume && !UI.eventsBusy()) {
          UI.showLiegeModal(rid, returnContext, true);
        }
      } else if (action.route === 'vassal-levy') {
        if (!FB.callVassalLevyFavor(s, rid)) return;
        FB.game.passDay({ skipFocus:true });
        UI.showLiegeModal(rid, returnContext, true);
        mobileNavClosedAll('modal-view', true);
        UI.refresh();
      } else if (action.route === 'council') {
        UI.showCouncil(null, {
          view:'realm',
          realmId:rid,
          returnContext:returnContext
        });
      } else if (action.route === 'war') {
        UI.showWarTargets(rid, {
          view:'realm',
          realmId:rid,
          returnContext:returnContext
        });
      } else if (action.route === 'governance') {
        UI.showGovernance('position');
      } else if (action.route === 'royal-courtship') {
        const c = FB.materializeRoyalChild(s, rid, action.memberId);
        if (!c || !FB.canCourt(s, c)) return;
        const presence = FB.socialAttentionPresence(s, c);
        if (presence.status !== 'active') {
          UI.showSocialVisit(c.id, {
            courtship:true,
            returnRealmId:rid,
            returnContext:returnContext
          });
          return;
        }
        UI.closeModal();
        if (!FB.beginCourtship(s, c)) return;
        FB.news(s, FB.msg('news.social.royal_courting_begins',
          '🌷 You begin courting {name} of {realm}.', {
            name:FB.fullName(c), realm:realm.name
          }));
        FB.game.passDay({ skipFocus:true });
      }
    });
    $('gm-cancel').addEventListener('click', function () {
      if (returnContext) {
        modalHistoryBack(function () {
          interactionReturn(returnContext);
        });
      } else {
        UI.closeModal();
      }
    });
  }

  /* The realm sheet remains the primary view for an AI ruler. Cultivation
     can materialize that ruler into an ordinary character sheet as needed. */
  UI.showLiegeModal = function (rid, returnContext, replaceView) {
    return showRealmInteractionSheet(rid, returnContext, replaceView);
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

  function grantProtectionButton(pid) {
    const reserved = FB.isProtected(FB.state, 'grantCounty', pid);
    return '<button type="button" class="btn small protection-toggle" ' +
      'data-grant-protection="' + esc(pid) + '" aria-pressed="' +
      (reserved ? 'true' : 'false') + '">' +
      (reserved ? '🔒 ' + esc(FB.T('Reserved')) :
        '🔓 ' + esc(FB.T('Reserve'))) + '</button>';
  }

  /* Give a demesne county — or a whole duchy — to a sworn man. Grant
     protections are visible here and are hard stops for this picker until
     deliberately removed; other land-transfer mechanics remain independent. */
  UI.showGrantLand = function (returnContext, replaceView) {
    const s = FB.state;
    let h = '<p class="hint">' + esc(FB.T('A vassal holds the land in your name, pays taxes each season, sends part of its levy to your host, and remembers the grant in their Standing. Your dignity still counts land held through vassals.')) + '</p>';
    const cap = FB.domainCap(s), held = (s.player.provs || []).length;
    h += '<p class="hint">' + esc(FB.T('Held directly: {held} of {cap}.', { held: held, cap: cap })) +
      (held > cap ? ' ⚠ ' + esc(FB.T('Over your limit — your own income and levy are cut until you grant land away.')) : '') + '</p>';
    if (held > cap) {
      h += '<button type="button" class="actionbtn" id="grant-cleanup">⚖ ' +
        esc(FB.T('Review domain cleanup…')) + '<span class="adesc">' +
        esc(FB.T('Build a complete proposal that skips reserved counties and keeps your capital and home county.')) +
        '</span></button>';
    }
    const duchies = FB.grantableDuchies(s);
    if (duchies.length) {
      h += '<div class="panelh">' + esc(FB.T('Raise a duke over a duchy you hold in full')) + '</div><div class="gm-list">';
      for (const d of duchies) {
        const reserved = d.counties.filter(function (pid) {
          return FB.isProtected(s, 'grantCounty', pid);
        });
        h += '<button class="actionbtn" data-did="' + esc(d.did) + '"' +
          (reserved.length ? ' disabled' : '') + '>👑 ' + esc(d.name) +
          '<span class="adesc">' + esc(reserved.length
            ? FB.T('{count} counties · blocked by {reserved} reserved', {
              count:d.counties.length, reserved:reserved.length
            })
            : FB.T('{count} counties', { count:d.counties.length })) +
          '</span></button>';
      }
      h += '</div>';
    }
    h += '<div class="panelh">' + esc(FB.T('Grant a single county')) + '</div><div class="gm-list">';
    for (const pid of s.player.provs) {
      const pr = FB.world.byId[pid];
      const reserved = FB.isProtected(s, 'grantCounty', pid);
      h += '<div class="protected-choice"><button class="actionbtn" data-pid="' +
        esc(pid) + '"' + (reserved ? ' disabled' : '') + '>🏰 ' + esc(pr.name) +
        '<span class="adesc">' + esc(FB.T('dev {development} · {terrain}', {
          development:s.dev[pid] || 1, terrain:terrainName(pr.terrain)
        })) + (reserved ? ' · ' + esc(FB.T('reserved from grants')) : '') +
        '</span></button>' + grantProtectionButton(pid) + '</div>';
    }
    h += '</div><button class="btn" id="gm-cancel">' +
      esc(returnContext ? FB.T('Back') : FB.T('Not now')) + '</button>';
    const options = managementModalOptions(returnContext) || {};
    options.replaceView = !!replaceView;
    openModal(FB.T('Grant Land'), h, options);
    document.querySelectorAll('[data-did]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!FB.grantDuchy(FB.state, btn.dataset.did)) return;
        managementFinish(returnContext, UI.closeModal);
      });
    });
    document.querySelectorAll('[data-pid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!FB.grantCounty(FB.state, btn.dataset.pid)) return;
        managementFinish(returnContext, UI.closeModal);
      });
    });
    document.querySelectorAll('[data-grant-protection]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const pid = btn.dataset.grantProtection;
        FB.setProtected(s, 'grantCounty', pid,
          !FB.isProtected(s, 'grantCounty', pid));
        UI.showGrantLand(returnContext, true);
      });
    });
    const cleanup = $('grant-cleanup');
    if (cleanup) cleanup.addEventListener('click', function () {
      UI.showDomainCleanup(returnContext, true);
    });
    $('gm-cancel').addEventListener('click', function () {
      managementBack(returnContext, UI.closeModal);
    });
  };

  UI.showDomainCleanup = function (returnContext, fromGrantLand, notice) {
    const s = FB.state;
    const plan = FB.domainCleanupPlan(s);
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Review a deterministic grant proposal. It never selects reserved counties, your capital, or your home county, and nothing changes until you apply it.')) +
      '</p><p>' + esc(FB.T(
        'Tax and levy comparisons cover base land contributions; personal and realm-wide modifiers remain outside the estimate.')) +
      '</p></div>';
    if (notice) h += '<div class="progressnote warnote">' + esc(notice) + '</div>';
    if (!plan.excess) {
      h += '<p class="hint">' + esc(FB.T('Your directly held domain is already within its limit.')) + '</p>';
    } else if (!plan.grants.length) {
      h += '<p class="progressnote warnote">' + esc(FB.T(
        'No safe proposal is available. Unreserve enough non-seat counties or grant land manually.')) + '</p>';
    } else {
      h += '<div class="gm-list">';
      for (const grant of plan.grants) {
        const label = grant.kind === 'duchy'
          ? ((FBDATA.duchies[grant.id] || {}).name || grant.id)
          : ((FB.world.byId[grant.id] || {}).name || grant.id);
        h += '<div class="actionbtn domain-cleanup-row">' +
          (grant.kind === 'duchy' ? '👑 ' : '🏰 ') + esc(label) +
          '<span class="adesc">' + esc(grant.kind === 'duchy'
            ? FB.T('Grant as a complete duchy · {count} counties', {
              count:grant.countyIds.length
            })
            : FB.T('Grant as a county vassal · development {development}', {
              development:s.dev[grant.id] || 1
            })) + '</span></div>';
      }
      h += '</div>' + kv('Land tax estimate', esc(FB.T('{before} before → {after} after', {
        before:Math.round(plan.projection.beforeTax * 10) / 10,
        after:Math.round(plan.projection.afterTax * 10) / 10
      }))) + kv('Land levy estimate', esc(FB.T('{before} before → {after} after', {
        before:Math.round(plan.projection.beforeLevy),
        after:Math.round(plan.projection.afterLevy)
      })));
      if (plan.unresolved) {
        h += '<div class="progressnote warnote">' + esc(FB.T(
          '{count} excess counties remain because the other candidates are reserved or are your seats.', {
            count:plan.unresolved
          })) + '</div>';
      }
    }
    h += '<div class="gm-footer">' +
      '<button type="button" class="btn primary" id="domain-cleanup-apply"' +
      (!plan.excess || !plan.grants.length || plan.unresolved ? ' disabled' : '') + '>' +
      esc(FB.T('Apply reviewed grants')) + '</button>' +
      '<button type="button" class="btn" id="domain-cleanup-back">' +
      esc(FB.T('Back')) + '</button></div>';
    openModal(FB.T('Domain Cleanup'), h, {
      historyView:true,
      replaceView:!!notice,
      modalClass:'fullsheet-modal domain-cleanup-modal',
      historyBackRender:function () {
        if (fromGrantLand) UI.showGrantLand(returnContext);
        else interactionReturn(returnContext || { view:'governance', section:'domain' });
      }
    });
    $('domain-cleanup-apply').addEventListener('click', function () {
      const result = FB.applyDomainCleanupPlan(s, plan);
      if (!result.ok) {
        UI.showDomainCleanup(returnContext, fromGrantLand,
          result.code === 'stale'
            ? FB.T('The domain changed after this review. A fresh proposal is shown.')
            : FB.T('The current protections do not permit a complete cleanup proposal.'));
        return;
      }
      UI.refresh();
      if (returnContext) interactionReturn(returnContext);
      else UI.closeModal();
      mobileNavClosedAll('modal-view', true);
      UI.toast(FB.T('The reviewed domain grants have been applied.'));
    });
    $('domain-cleanup-back').addEventListener('click', function () {
      modalHistoryBack(function () {
        if (fromGrantLand) UI.showGrantLand(returnContext);
        else interactionReturn(returnContext || { view:'governance', section:'domain' });
      });
    });
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

  UI.showGovernanceCounty = function (pid, section, replaceView) {
    const s = FB.state;
    const province = s && FB.world.byId[pid];
    if (!province) return UI.showGovernance(section || 'domain');
    const holderId = s.holder[pid];
    const holder = holderId && s.realms[holderId];
    const settlements = FB.settlementsOf(s, pid);
    const built = FB.builtIn(s, pid).filter(function (item) {
      return !item.ruined;
    });
    let h = kv('Development', esc(String(s.dev[pid] || 1))) +
      kv('Terrain', esc(terrainName(province.terrain))) +
      kv('Holder', esc(holder
        ? (holder.ruler ? holder.ruler.name : holder.name)
        : FB.T('No settled holder'))) +
      kv('Settlements', esc(settlements.map(function (settlement) {
        return SETT_ICON[settlement.kind] + ' ' + settlement.name;
      }).join(' · '))) +
      kv('Standing buildings', esc(FB.T('{count}', { count:built.length })));
    if ((s.player.provs || []).indexOf(pid) >= 0) {
      h += '<div class="panelh">' + esc(FB.T('Automation protections')) +
        '</div><div class="governance-county-protections">' +
        grantProtectionButton(pid) +
        '<button type="button" class="btn small protection-toggle" ' +
        'data-autobuild-protection="' + esc(pid) + '" aria-pressed="' +
        (FB.isProtected(s, 'autoBuildCounty', pid) ? 'true' : 'false') + '">' +
        (FB.isProtected(s, 'autoBuildCounty', pid)
          ? '🔒 ' + esc(FB.T('No autobuild'))
          : '⚙ ' + esc(FB.T('Allow autobuild'))) + '</button></div>';
    }
    h += '<div class="gm-footer"><button type="button" class="btn" ' +
      'id="governance-county-land">' + esc(FB.T('Open in Land')) +
      '</button><button type="button" class="btn" ' +
      'id="governance-county-back">' + esc(FB.T('Back')) + '</button></div>';
    openModal(FB.T('County of {province}', { province:province.name }), h, {
      historyView:true,
      replaceView:!!replaceView,
      historyBackRender:function () { UI.showGovernance(section || 'domain'); }
    });
    document.querySelectorAll('[data-grant-protection]').forEach(function (button) {
      button.addEventListener('click', function () {
        FB.setProtected(s, 'grantCounty', pid,
          !FB.isProtected(s, 'grantCounty', pid));
        UI.showGovernanceCounty(pid, section, true);
      });
    });
    document.querySelectorAll('[data-autobuild-protection]').forEach(
      function (button) {
        button.addEventListener('click', function () {
          FB.setProtected(s, 'autoBuildCounty', pid,
            !FB.isProtected(s, 'autoBuildCounty', pid));
          UI.showGovernanceCounty(pid, section, true);
        });
      });
    $('governance-county-land').addEventListener('click', function () {
      UI.closeModal();
      UI.selectProvince(pid);
    });
    $('governance-county-back').addEventListener('click', function () {
      modalHistoryBack(function () { UI.showGovernance(section || 'domain'); });
    });
  };

  function politicalBlocDefinitionText(s, archetypeId, field) {
    const def = FBDATA.politicalBlocs &&
      FBDATA.politicalBlocs[archetypeId];
    if (!def) return archetypeId;
    return FB.dataText(s, s.player.charId, 'politicalBloc',
      archetypeId, def, field, {});
  }

  function politicalHouseById(politics, houseId) {
    for (const house of politics ? politics.houses : []) {
      if (house.id === houseId) return house;
    }
    return null;
  }

  function politicalForecastBloc(forecast, blocId) {
    for (const bloc of forecast ? forecast.blocs : []) {
      if (bloc.id === blocId) return bloc;
    }
    return null;
  }

  function politicalBlocName(s, politics, bloc) {
    const base = politicalBlocDefinitionText(
      s, bloc.archetypeId, 'name');
    const leader = politicalHouseById(politics, bloc.leaderHouseId);
    if (bloc.archetypeId === 'magnate' && leader) {
      return FB.T('{house} — {bloc}', {
        house:leader.name,
        bloc:base
      });
    }
    if (bloc.archetypeId === 'independent' && leader) {
      return FB.T('{house} — {bloc}', {
        house:leader.name,
        bloc:base
      });
    }
    return base;
  }

  function politicalPostureText(posture) {
    if (posture === 'support') return FB.T('Support');
    if (posture === 'oppose') return FB.T('Opposition');
    return FB.T('Undecided');
  }

  function politicalMotionName(motionId) {
    const s = FB.state;
    const def = FB.policyDef ? FB.policyDef(motionId) : null;
    if (def && def.name) {
      return FB.dataText(s, s.player.charId, 'policy',
        motionId, def, 'name', {});
    }
    if (motionId === 'scutage') return FB.T('Scutage');
    if (motionId === 'redress') return FB.T('Redress');
    return String(motionId);
  }

  function politicalPolicyDesc(motionId) {
    const s = FB.state;
    const def = FB.policyDef ? FB.policyDef(motionId) : null;
    if (def && def.desc) {
      return FB.dataText(s, s.player.charId, 'policy',
        motionId, def, 'desc', {});
    }
    return '';
  }

  function politicalPolicyCost(def) {
    return isFinite(Number(def && def.cost)) ? Number(def.cost) :
      (FBDATA.balance.parliamentMotionCost || 15);
  }

  function politicalSigned(value) {
    value = Math.round(Number(value) || 0);
    return (value > 0 ? '+' : '') + value;
  }

  function politicalInterestReason(s, politics, item) {
    const house = politicalHouseById(politics, item.houseId);
    const leader = politicalHouseById(
      politics, item.leaderHouseId);
    const houseName = house ? house.name : item.houseId;
    let text;
    if (item.id === 'ruler_house') {
      text = FB.T('{house} is the ruler’s house.', {
        house:houseName
      });
    } else if (item.id === 'standing') {
      text = FB.T('{house}: court Standing {standing}.', {
        house:houseName,
        standing:Math.round(item.standing || 0)
      });
    } else if (item.id === 'council_office') {
      text = FB.T('{house}: Council office — {office}.', {
        house:houseName,
        office:councilSeatName(item.councilSeatId)
      });
    } else if (item.id === 'shared_faith') {
      text = leader
        ? FB.T('{house} shares the faith of {leader}.', {
          house:houseName, leader:leader.name
        })
        : FB.T('{house} shares the ruler’s faith.', {
          house:houseName
        });
    } else if (item.id === 'temperament') {
      const trait = FBDATA.traits[item.traitId];
      text = FB.T('{house}: {trait} temperament.', {
        house:houseName,
        trait:trait
          ? dt(s, 'trait', item.traitId, trait, 'name')
          : item.traitId
      });
    } else if (item.id === 'guild_membership') {
      text = FB.T('{house}: active guild allegiance.', {
        house:houseName
      });
    } else if (item.id === 'monopolies') {
      text = FB.T('{house}: {count} monopoly charters.', {
        house:houseName, count:item.count
      });
    } else if (item.id === 'enterprises') {
      text = FB.T('{house}: {count} family enterprises.', {
        house:houseName, count:item.count
      });
    } else if (item.id === 'trade_contracts') {
      text = FB.T('{house}: {count} active trade contracts.', {
        house:houseName, count:item.count
      });
    } else if (item.id === 'commercial_counties') {
      text = FB.T('{house}: commercial interests in {count} counties.', {
        house:houseName, count:item.count
      });
    } else if (item.id === 'magnate_leader') {
      text = FB.T('{house} leads this landed affinity.', {
        house:houseName
      });
    } else if (item.id === 'shared_culture') {
      text = FB.T('{house} shares {leader}’s culture.', {
        house:houseName, leader:leader ? leader.name : ''
      });
    } else if (item.id === 'adjacent_lands') {
      text = FB.T('{house} holds land beside {leader}.', {
        house:houseName, leader:leader ? leader.name : ''
      });
    } else if (item.id === 'leader_rank') {
      text = FB.T('{leader}’s rank attracts {house}.', {
        leader:leader ? leader.name : '',
        house:houseName
      });
    } else if (item.id === 'ruler_relationship') {
      text = FB.T('{house}’s relationship with {leader}: {regard}.', {
        house:houseName, leader:leader ? leader.name : '',
        regard:Math.round(item.regard || 0)
      });
    } else {
      text = FB.T('{house} keeps its own counsel.', {
        house:houseName
      });
    }
    return text + ' (' + politicalSigned(item.value) + ')';
  }

  function politicalMotionReason(s, item) {
    if (item.id === 'bloc_posture') {
      return FB.T('{bloc} starting posture', {
        bloc:politicalBlocDefinitionText(
          s, item.archetypeId, 'name')
      }) + ' (' + politicalSigned(item.value) + ')';
    }
    if (item.id === 'current_aid') {
      return FB.T('Current aid: {percent}%', {
        percent:Math.round(item.aid * 100)
      }) + ' (' + politicalSigned(item.value) + ')';
    }
    if (item.id === 'ruler_traits') {
      return FB.T('Member ruler traits') +
        ' (' + politicalSigned(item.value) + ')';
    }
    if (item.id === 'player_relationship') {
      return FB.T('Members’ relationships with your house') +
        ' (' + politicalSigned(item.value) + ')';
    }
    if (item.id === 'ruler_ambitions') {
      return FB.T('Members’ current ambitions') +
        ' (' + politicalSigned(item.value) + ')';
    }
    return FB.T('Martial inclination: {martial}', {
      martial:item.martial
    }) + ' (' + politicalSigned(item.value) + ')';
  }

  function politicalHouseLink(s, house, section) {
    if (!house) return '';
    if (house.isPlayer && house.rulerCharacterId) {
      return '<button type="button" class="linklike" ' +
        'data-political-character="' + esc(house.rulerCharacterId) +
        '">' + esc(house.rulerName || house.name) + '</button>';
    }
    if (house.isPlayer) return esc(house.rulerName || house.name);
    return governanceRealmLink(
      s, house.id, house.rulerName || house.name, section || 'blocs');
  }

  function politicalTotalsText(forecast) {
    if (!forecast) {
      return FB.T('No valid political court is available.');
    }
    return FB.T(
      '{support} support · {opposition} opposition · {uncertain} uncertain · {majority} needed', {
        support:forecast.supportInfluence,
        opposition:forecast.oppositionInfluence,
        uncertain:forecast.uncertainInfluence,
        majority:forecast.majority
      });
  }

  function politicalCompactForecast(bloc, motionId) {
    if (!bloc) return '';
    const params = {
      motion:politicalMotionName(motionId),
      posture:politicalPostureText(bloc.posture),
      chance:Math.round(bloc.naturalSupportChance * 100)
    };
    return bloc.posture === 'undecided'
      ? FB.T('{motion}: {posture} ({chance}%)', params)
      : FB.T('{motion}: {posture}', params);
  }

  function governanceBlocMotionHtml(s, bloc, motionId, pending) {
    if (!bloc) return '';
    let h = '<div class="political-reasons"><b>' +
      esc(pending
        ? FB.T('Motion posture')
        : FB.T('{motion} posture', {
          motion:politicalMotionName(motionId)
        })) + '</b><ul>';
    for (const motionReason of bloc.motionReasons) {
      h += '<li>' + esc(politicalMotionReason(
        s, motionReason)) + '</li>';
    }
    const postureDetail = bloc.posture === 'undecided'
      ? FB.T('{chance}% natural support chance.', {
        chance:Math.round(bloc.naturalSupportChance * 100)
      })
      : (bloc.pledged
        ? FB.T('Support or opposition is pledged for this vote.')
        : FB.T('The interest score locks this bloc’s vote.'));
    h += '</ul><div class="cmeta">' +
      esc(politicalPostureText(bloc.posture)) + ' · ' +
      esc(postureDetail) +
      '</div></div>';
    return h;
  }

  function governancePoliticalBlocsHtml(s, politics) {
    if (!politics || !politics.blocs.length) {
      return '<div class="hint">' + esc(FB.T(
        'No political court applies to the current position.')) + '</div>';
    }
    const forecast = politics.motion;
    const policies = FB.policyList ? FB.policyList() : [];
    const readyForecasts = [];
    if (!forecast && politics.forecasts) {
      for (const entry of policies) {
        const policyForecast = politics.forecasts[entry.id];
        const status = FB.parliamentMotionStatus
          ? FB.parliamentMotionStatus(s, entry.id) : null;
        if (policyForecast && status && status.ready) {
          readyForecasts.push({ id:entry.id, forecast:policyForecast });
        }
      }
    }
    let h = kv('Court influence', esc(String(
      politics.totalInfluence))) +
      kv('Strict majority', esc(String(politics.majority)));
    if (forecast) {
      h += kv('Pending motion', esc(politicalMotionName(
        forecast.motionId))) +
        '<div class="progressnote">' +
        esc(politicalTotalsText(forecast)) + '</div>';
    } else if (politics.forecasts) {
      for (const item of readyForecasts) {
        h += kv(FB.T('{motion} forecast', {
          motion:politicalMotionName(item.id)
        }), esc(politicalTotalsText(item.forecast)));
      }
      h += '<div class="hint">' + esc(FB.T(
        'No motion is pending. Allegiances persist, while influence and interests follow the current court.')) +
        '</div>';
    } else {
      h += '<div class="hint">' + esc(FB.T(
        'These crown-side blocs are authoritative, but no Estates motion applies to this court.')) +
        '</div>';
    }
    const displayed = forecast ? forecast.blocs : politics.blocs;
    for (const bloc of displayed) {
      const def = FBDATA.politicalBlocs[bloc.archetypeId] || {};
      const leader = politicalHouseById(
        politics, bloc.leaderHouseId);
      h += '<article class="political-bloc-card" data-political-bloc="' +
        esc(bloc.id) + '"><div class="political-bloc-head"><h5>' +
        (def.icon || '') + ' ' +
        esc(politicalBlocName(s, politics, bloc)) + '</h5>' +
        (forecast
          ? '<span class="political-posture political-posture-' +
            esc(bloc.posture) + '">' +
            esc(politicalPostureText(bloc.posture)) + '</span>'
          : '') + '</div>' +
        kv('Leader', politicalHouseLink(s, leader, 'blocs')) +
        kv('Influence', esc(FB.T('{influence} of {total}', {
          influence:bloc.influence,
          total:politics.totalInfluence
        }))) +
        '<div class="political-members"><b>' +
        esc(FB.T('Member houses')) + '</b><div>';
      for (const member of bloc.members) {
        h += politicalHouseLink(s, member, 'blocs') +
          ' <span class="cmeta">(' + member.influence + ')</span> ';
      }
      h += '</div></div><div class="political-reasons"><b>' +
        esc(FB.T('Interests')) + '</b><ul>';
      for (const item of bloc.interests) {
        h += '<li>' + esc(politicalInterestReason(
          s, politics, item)) + '</li>';
      }
      h += '</ul></div>';
      if (forecast) {
        h += governanceBlocMotionHtml(
          s, bloc, forecast.motionId, true);
      } else {
        for (const item of readyForecasts) {
          h += governanceBlocMotionHtml(s, politicalForecastBloc(
            item.forecast, bloc.id), item.id, false);
        }
      }
      h += '</article>';
    }
    return h;
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
        })) + '</div><button type="button" class="actionbtn" ' +
        'data-governance-cleanup="1">⚖ ' +
        esc(FB.T('Review domain cleanup…')) + '<span class="adesc">' +
        esc(FB.T('Recommend enough unreserved, non-seat grants to return to your limit.')) +
        '</span></button>';
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
        })) + '</span><span class="governance-county-protections">' +
        grantProtectionButton(pid) +
        '<button type="button" class="btn small protection-toggle" ' +
        'data-autobuild-protection="' + esc(pid) + '" aria-pressed="' +
        (FB.isProtected(s, 'autoBuildCounty', pid) ? 'true' : 'false') + '">' +
        (FB.isProtected(s, 'autoBuildCounty', pid)
          ? '🔒 ' + esc(FB.T('No autobuild'))
          : '⚙ ' + esc(FB.T('Allow autobuild'))) + '</button></span></div>';
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
        '</div><div class="governance-vassal-actions">' +
        '<div class="governance-inline-actions">' +
        '<button type="button" class="btn small" data-governance-gift="' +
        esc(item.realmId) + '">' + esc(FB.T('Offer a gift…')) + '</button>' +
        '<button type="button" class="btn small" data-governance-vassal-levy="' +
        esc(item.realmId) + '"' + (favor.ready ? '' : ' disabled') + '>' +
        esc(FB.T('Ask for exceptional levy')) + '</button>' +
        (summary.council
          ? '<button type="button" class="btn small" ' +
            'data-governance-council-protection="' + esc(item.realmId) +
            '" aria-pressed="' +
            (FB.isProtected(s, 'councilRealm', item.realmId)
              ? 'true' : 'false') + '">' +
            esc(FB.isProtected(s, 'councilRealm', item.realmId)
              ? FB.T('Allow automatic Council appointment')
              : FB.T('Reserve from automatic Council appointment')) + '</button>'
          : '') + '</div>' +
        '<div class="cmeta">' + esc(favor.ready
          ? FB.T('Adds {percent}% levy for one year and lowers Standing by 15. (spends the day)', {
            percent:Math.round(
              (FBDATA.balance.vassalLevyFavorRate || 0.05) * 100)
          })
          : favor.reason) + '</div></div></div>';
    }
    return h;
  }

  function governanceModifierConsequencesHtml(s, summary) {
    const counties = summary.modifierCounties || [];
    if (!counties.length) return '';
    let h = '<div class="governance-subhead">' +
      esc(FB.T('Active local consequences')) + '</div>';
    for (const item of counties) {
      const province = FB.world.byId[item.provinceId];
      h += '<div class="governance-modifier-county">' +
        governanceCountyLink(item.provinceId,
          province ? province.name : item.provinceId,
          FB.T('{count} active', { count:item.records.length })) +
        '<div class="modifier-list">' +
        modifierChips(s, item.records, 'county', item.provinceId) +
        '</div></div>';
    }
    h += '<div class="hint">' + esc(FB.T(
      'These are the same county records shown in Land. County effects survive transfer; Common Voice, upkeep, tax and levy count for you while you hold the county directly, or, if you hold none, while it remains your seat.')) +
      '</div>';
    return h;
  }

  function governanceInstitutionHtml(s, summary) {
    const modifierConsequences = governanceModifierConsequencesHtml(s, summary);
    const privilegeButton = '<button type="button" class="actionbtn" ' +
      'data-governance-privileges="1">📜 ' +
      esc(FB.T('Privileges, charters & collective demands…')) +
      '<span class="adesc">' + esc(FB.T(
        'Review every holder, scope, effect, protected duration, revocation rule, and organized opposition.')) +
      '</span></button>';
    if (summary.institution === 'estates' && summary.estates) {
      const estates = summary.estates;
      const activeForecast = estates.motionForecast;
      const forecasts = summary.politics && summary.politics.forecasts
        ? summary.politics.forecasts : {};
      const policies = FB.policyList ? FB.policyList() : [];
      let h = kv('The liege’s aid', esc(FB.T('{percent}%', {
        percent:Math.round(estates.aid * 100)
      }))) +
        kv('Scutage', esc(estates.scutage ? FB.T('In force') : FB.T('Not granted'))) +
        kv('Session status', esc(estates.pendingEventIds.length
          ? FB.T('A session or motion is pending')
          : FB.T('{chance}% yearly chance; no sitting is currently pending', {
            chance:Math.round(estates.sessionChance * 100)
          }))) +
        kv('Lobbying strength', esc(FB.T('{chance}%', {
          chance:Math.round(estates.vote.total * 100)
        })));
      if (activeForecast) {
        h += kv('Pending motion', esc(politicalMotionName(
          activeForecast.motionId))) +
          '<div class="progressnote">' +
          esc(politicalTotalsText(activeForecast)) + '</div>';
      } else {
        const blocked = [];
        for (const entry of policies) {
          const status = FB.parliamentMotionStatus(s, entry.id);
          const forecast = forecasts[entry.id];
          if (status.ready && forecast) {
            h += kv(politicalMotionName(entry.id),
              esc(politicalTotalsText(forecast)));
          } else if (!status.ready) {
            blocked.push(politicalMotionName(entry.id));
          }
        }
        if (blocked.length) {
          h += '<div class="hint">' + esc(FB.T(
            'Not currently available: {list}.', {
              list:blocked.join(' · ')
            })) + '</div>';
        }
      }
      h += '<button type="button" class="actionbtn" ' +
        'data-governance-institution="estates">🏛 ' +
        esc(FB.T('Open Estates management…')) +
        '<span class="adesc">' + esc(FB.T(
          'Review the terms and put an eligible motion to the hall.')) +
        '</span></button>';
      return h + modifierConsequences + privilegeButton;
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
      return h + modifierConsequences + privilegeButton;
    }
    return '<div class="progressnote">' + esc(FB.T(
      'No simulated institution applies. Independent counts and dukes govern their own domain without the liege’s Estates or a Royal Council.')) +
      '</div>' + privilegeButton;
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
    let h = '<nav class="governance-nav" role="tablist" aria-label="' +
      esc(FB.T('Governance sections')) + '">';
    const sections = [
      ['position', FB.T('Position')],
      ['domain', FB.T('Domain')],
      ['obligations', summary.liegeId
        ? FB.T('Liege & obligations') : FB.T('Independence')],
      ['vassals', FB.T('Vassals')],
      ['blocs', FB.T('Political blocs')],
      ['institution', FB.T('Institution')],
      ['actions', FB.T('Political actions')]
    ];
    const sectionIds = sections.map(function (item) { return item[0]; });
    const selectedSection = sectionIds.indexOf(sectionId) >= 0
      ? sectionId : 'position';
    for (const item of sections) {
      const selected = item[0] === selectedSection;
      h += '<button type="button" class="btn small" role="tab" ' +
        'id="governance-tab-' + item[0] + '" data-governance-section="' +
        item[0] + '" aria-controls="governance-' + item[0] +
        '" aria-selected="' + selected + '" tabindex="' +
        (selected ? '0' : '-1') + '">' + esc(item[1]) + '</button>';
    }
    h += '</nav><div class="governance-sections">' +
      '<section class="governance-card" id="governance-position" ' +
      'role="tabpanel" aria-labelledby="governance-tab-position" tabindex="-1"' +
      (selectedSection === 'position' ? '' : ' hidden') + '>' +
      '<h4>' + esc(FB.T('Political position')) + '</h4>' +
      governancePositionHtml(s, summary) + '</section>' +
      '<section class="governance-card" id="governance-domain" ' +
      'role="tabpanel" aria-labelledby="governance-tab-domain" tabindex="-1"' +
      (selectedSection === 'domain' ? '' : ' hidden') + '>' +
      '<h4>' + esc(FB.T('Domain')) + '</h4>' +
      governanceDomainHtml(s, summary) + '</section>' +
      '<section class="governance-card" id="governance-obligations" ' +
      'role="tabpanel" aria-labelledby="governance-tab-obligations" ' +
      'tabindex="-1"' +
      (selectedSection === 'obligations' ? '' : ' hidden') + '>' +
      '<h4>' + esc(summary.liegeId
        ? FB.T('Liege & obligations')
        : FB.T('Independence & foreign contact')) + '</h4>' +
      governanceObligationsHtml(s, summary) + '</section>' +
      '<section class="governance-card" id="governance-vassals" ' +
      'role="tabpanel" aria-labelledby="governance-tab-vassals" tabindex="-1"' +
      (selectedSection === 'vassals' ? '' : ' hidden') + '><h4>' +
      esc(FB.T('Direct vassals')) + '</h4>' +
      governanceVassalsHtml(s, summary) + '</section>' +
      '<section class="governance-card" id="governance-blocs" ' +
      'role="tabpanel" aria-labelledby="governance-tab-blocs" tabindex="-1"' +
      (selectedSection === 'blocs' ? '' : ' hidden') + '><h4>' +
      esc(FB.T('Political blocs')) + '</h4>' +
      governancePoliticalBlocsHtml(s, summary.politics) + '</section>' +
      '<section class="governance-card" id="governance-institution" ' +
      'role="tabpanel" aria-labelledby="governance-tab-institution" ' +
      'tabindex="-1"' +
      (selectedSection === 'institution' ? '' : ' hidden') + '>' +
      '<h4>' + esc(summary.institution === 'estates'
        ? FB.T('The Estates') : (summary.institution === 'council'
          ? FB.T('The Royal Council') : FB.T('Institution'))) + '</h4>' +
      governanceInstitutionHtml(s, summary) + '</section>' +
      '<section class="governance-card" id="governance-actions" ' +
      'role="tabpanel" aria-labelledby="governance-tab-actions" tabindex="-1"' +
      (selectedSection === 'actions' ? '' : ' hidden') + '>' +
      '<h4>' + esc(FB.T('Political actions')) + '</h4>' +
      governanceActionGroups(s, summary) + '</section></div>' +
      '<div class="gm-footer"><button type="button" class="btn" ' +
      'id="governance-guide">' + esc(FB.T('Guide: government')) +
      '</button><button type="button" class="btn" ' +
      'id="governance-close">' + esc(FB.T('Close')) + '</button></div>';
    openModal(FB.T('🏛 Governance'), h, {
      modalClass:'fullsheet-modal governance-modal'
    });
    const sectionButtons = document.querySelectorAll(
      '[data-governance-section]');
    function refreshGovernanceActionHints(activeId) {
      const actionButtons = document.querySelectorAll(
        '.governance-card .actionbtn');
      for (let i = 0; i < actionButtons.length; i++) {
        const children = actionButtons[i].children;
        for (let j = children.length - 1; j >= 0; j--) {
          if (children[j].classList.contains('keyhint')) {
            actionButtons[i].removeChild(children[j]);
          }
        }
      }
      if (FB.isTouch) return;
      const active = $('governance-' + activeId);
      if (!active) return;
      const visibleButtons = active.querySelectorAll('.actionbtn');
      for (let i = 0; i < visibleButtons.length && i < 18; i++) {
        visibleButtons[i].insertAdjacentHTML('afterbegin', hintFor(i));
      }
    }
    function selectGovernanceSection(nextId, focusPanel) {
      if (sectionIds.indexOf(nextId) < 0) return;
      for (let i = 0; i < sectionButtons.length; i++) {
        const tab = sectionButtons[i];
        const selected = tab.dataset.governanceSection === nextId;
        tab.setAttribute('aria-selected', selected ? 'true' : 'false');
        tab.tabIndex = selected ? 0 : -1;
        const panel = $('governance-' + tab.dataset.governanceSection);
        if (panel) panel.hidden = !selected;
      }
      const scroller = document.querySelector('.governance-sections');
      if (scroller) scroller.scrollTop = 0;
      refreshGovernanceActionHints(nextId);
      if (focusPanel) {
        const panel = $('governance-' + nextId);
        if (panel) panel.focus({ preventScroll:true });
      }
    }
    sectionButtons.forEach(function (button, index) {
      button.addEventListener('click', function () {
        selectGovernanceSection(button.dataset.governanceSection, true);
      });
      button.addEventListener('keydown', function (event) {
        let next = index;
        if (event.key === 'ArrowRight') next = (index + 1) % sections.length;
        else if (event.key === 'ArrowLeft') {
          next = (index + sections.length - 1) % sections.length;
        } else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = sections.length - 1;
        else return;
        event.preventDefault();
        selectGovernanceSection(sectionIds[next], false);
        sectionButtons[next].focus();
      });
    });
    refreshGovernanceActionHints(selectedSection);
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
          let panel = button;
          while (panel && (!panel.classList ||
              !panel.classList.contains('governance-card'))) {
            panel = panel.parentNode;
          }
          const returnSection = panel && panel.id.indexOf('governance-') === 0
            ? panel.id.slice('governance-'.length) : selectedSection;
          UI.showGovernanceCounty(pid, returnSection);
        });
      });
    document.querySelectorAll('[data-political-character]').forEach(
      function (button) {
        button.addEventListener('click', function () {
          UI.showCharModal(button.dataset.politicalCharacter, {
            view:'governance',
            section:'blocs'
          });
        });
      });
    document.querySelectorAll('[data-governance-action]').forEach(
      function (button) {
        button.addEventListener('click', function () {
          let panel = button;
          while (panel && (!panel.classList ||
              !panel.classList.contains('governance-card'))) {
            panel = panel.parentNode;
          }
          const activeSection = panel && panel.id.indexOf('governance-') === 0
            ? panel.id.slice('governance-'.length) : 'actions';
          const actionId = button.dataset.governanceAction;
          const status = FB.instantStatus(FB.state, actionId);
          FB.runInstant(FB.state, actionId, {
            returnContext:{ view:'governance', section:activeSection }
          });
          if (status.action && !status.action.noConsume && !UI.eventsBusy()) {
            UI.showGovernance(activeSection);
          }
        });
      });
    document.querySelectorAll('[data-grant-protection]').forEach(
      function (button) {
        button.addEventListener('click', function () {
          const pid = button.dataset.grantProtection;
          FB.setProtected(s, 'grantCounty', pid,
            !FB.isProtected(s, 'grantCounty', pid));
          UI.showGovernance('domain');
        });
      });
    document.querySelectorAll('[data-autobuild-protection]').forEach(
      function (button) {
        button.addEventListener('click', function () {
          const pid = button.dataset.autobuildProtection;
          FB.setProtected(s, 'autoBuildCounty', pid,
            !FB.isProtected(s, 'autoBuildCounty', pid));
          UI.showGovernance('domain');
        });
      });
    document.querySelectorAll('[data-governance-council-protection]').forEach(
      function (button) {
        button.addEventListener('click', function () {
          const rid = button.dataset.governanceCouncilProtection;
          FB.setProtected(s, 'councilRealm', rid,
            !FB.isProtected(s, 'councilRealm', rid));
          UI.showGovernance('vassals');
        });
      });
    document.querySelectorAll('[data-governance-cleanup]').forEach(
      function (button) {
        button.addEventListener('click', function () {
          UI.showDomainCleanup({ view:'governance', section:'domain' }, false);
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
          FB.game.passDay({ skipFocus:true });
          UI.showGovernance('vassals');
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
    document.querySelectorAll('[data-governance-privileges]').forEach(
      function (button) {
        button.addEventListener('click', function () {
          UI.showPrivileges('governance');
        });
      });
    $('governance-guide').addEventListener('click', function () {
      UI.showGuideEntry('government');
    });
    $('governance-close').addEventListener('click', UI.closeModal);
    if (sectionId) {
      setTimeout(function () {
        selectGovernanceSection(selectedSection, true);
      }, 0);
    }
  };

  function electionReturn(context) {
    context = context || {};
    if (context.view === 'career') {
      UI.showCareerPicker(context.cid, context.returnContext);
    } else if (context.view === 'council') {
      UI.showCouncil(context.returnView, context.returnContext);
    } else if (context.view === 'governance') {
      UI.showGovernance(context.section || 'institution');
    } else {
      UI.closeModal();
      UI.refresh();
    }
  }

  function electionDefinitionText(s, definitionId, def, path) {
    return dt(s, 'election', definitionId, def, path);
  }

  function electionRivalName(s, active, candidate) {
    const def = FBDATA.elections[active.definitionId] || {};
    if (candidate.kind !== 'abstract') {
      return candidate.id === (active.candidateId || active.nomineeRealmId)
        ? FB.electionForecast(s, active).candidate.name : candidate.id;
    }
    const rival = (def.rivals || [])[candidate.definitionIndex];
    return rival
      ? electionDefinitionText(s, active.definitionId, def,
        'rivals.' + candidate.definitionIndex + '.name')
      : FB.T('Organized opposition');
  }

  UI.showElection = function (returnContext, replaceView) {
    const s = FB.state;
    const active = FB.activeElection && FB.activeElection(s);
    const forecast = active && FB.electionForecast(s, active);
    const def = active && FBDATA.elections[active.definitionId];
    if (!active || !forecast || !def) {
      electionReturn(returnContext);
      return;
    }
    let h = '<p class="hint">' + esc(electionDefinitionText(
      s, active.definitionId, def, 'desc')) + '</p>' +
      kv('Office', esc(electionDefinitionText(
        s, active.definitionId, def, 'name'))) +
      kv('Electorate', esc(FB.T('{count} constituencies · {weight} weighted votes', {
        count:forecast.electorates.length, weight:forecast.totalWeight
      }))) +
      kv('Term', esc(FB.T('{days} fixed days', { days:forecast.termDays }))) +
      kv('Campaign closes', esc(FB.T('In {days} days', {
        days:Math.max(0, Math.ceil(active.expiresTurn - s.turn))
      }))) +
      kv('Result', esc(FB.T('Pending a recorded vote'))) +
      '<div class="panelh">' + esc(FB.T('Candidates & expected support')) + '</div>';
    for (const candidate of forecast.candidates) {
      h += '<div class="kv"><span>' + esc(electionRivalName(
        s, active, candidate)) + '</span><b>' +
        esc(FB.T('{percent}%', {
          percent:Math.round(candidate.support * 100)
        })) + '</b></div>';
    }
    h += '<div class="panelh">' + esc(FB.T('Electorate')) + '</div>';
    for (const electorate of forecast.electorates) {
      h += '<div class="kv"><span>' + esc(electionDefinitionText(
        s, active.definitionId, def,
        'electorates.' + electorate.index + '.name')) + '</span><b>' +
        esc(FB.T('{weight} votes · {percent}% expected support', {
          weight:electorate.weight,
          percent:Math.round(electorate.supportChance * 100)
        })) + '</b></div>';
    }
    h += '<div class="panelh">' + esc(FB.T('One campaign approach')) + '</div>' +
      '<div class="gm-list">';
    for (const tacticId in (def.tactics || {})) {
      const tactic = def.tactics[tacticId];
      const status = FB.electionTacticStatus(s, tacticId);
      const selected = active.tacticId === tacticId;
      h += '<button type="button" class="actionbtn" data-election-tactic="' +
        esc(tacticId) + '"' + (status.ready ? '' : ' disabled') + '>' +
        (tactic.icon || '🗳') + ' ' + esc(electionDefinitionText(
          s, active.definitionId, def, 'tactics.' + tacticId + '.name')) +
        '<span class="adesc">' + esc(selected ? FB.T('Selected.') :
          (status.ready
            ? electionDefinitionText(s, active.definitionId, def,
              'tactics.' + tacticId + '.desc')
            : FB.T('Unmet: {requirements}', {
              requirements:status.missing.join('; ')
            }))) + '</span></button>';
    }
    h += '</div><div class="gm-footer"><button type="button" class="btn" ' +
      'id="election-back">' + esc(FB.T('Back')) + '</button>' +
      '<button type="button" class="btn" id="election-withdraw">' +
      esc(FB.T('Withdraw')) + '</button>' +
      '<button type="button" class="btn primary" id="election-resolve"' +
      (active.tacticId ? '' : ' disabled') + '>' +
      esc(FB.T('Hold the election')) + '</button></div>';
    openModal((def.icon || '🗳') + ' ' + electionDefinitionText(
      s, active.definitionId, def, 'name'), h, {
      historyView:true,
      replaceView:!!replaceView,
      noFocus:true,
      historyBackRender:function () { electionReturn(returnContext); }
    });
    document.querySelectorAll('[data-election-tactic]').forEach(
      function (button) {
        button.addEventListener('click', function () {
          if (!FB.chooseElectionTactic(s, button.dataset.electionTactic)) return;
          UI.showElection(returnContext, true);
        });
      });
    $('election-resolve').addEventListener('click', function () {
      const result = FB.resolveElection(s);
      if (result) UI.showElectionResult(result, returnContext);
    });
    $('election-withdraw').addEventListener('click', function () {
      if (!FB.withdrawElection(s)) return;
      modalHistoryBack(function () { electionReturn(returnContext); });
    });
    $('election-back').addEventListener('click', function () {
      modalHistoryBack(function () { electionReturn(returnContext); });
    });
  };

  UI.showElectionResult = function (result, returnContext) {
    const s = FB.state;
    const def = FBDATA.elections[result.definitionId] || {};
    const electorates = Array.isArray(def.electorates) ? def.electorates : [];
    let candidateName = result.kind === 'guild' && s.chars[result.candidateId]
      ? FB.fullName(s.chars[result.candidateId]) :
      (result.kind === 'council' && s.realms[result.nomineeRealmId]
        ? s.realms[result.nomineeRealmId].ruler.name : FB.T('The nominee'));
    let winnerName = candidateName;
    if (!result.passed) {
      winnerName = FB.T('The organized opposition');
      for (let rivalIndex = 0; rivalIndex < (def.rivals || []).length;
          rivalIndex++) {
        if (def.rivals[rivalIndex].id === result.winnerId) {
          winnerName = electionDefinitionText(s, result.definitionId, def,
            'rivals.' + rivalIndex + '.name');
        }
      }
    }
    let h = '<div class="progressnote' + (result.passed ? '' : ' warnote') + '">' +
      esc(result.passed
        ? FB.T('Won — the candidate begins the recorded fixed term.')
        : FB.T('Lost — the successful rival or vacancy holds until the next opening.')) +
      '</div>' + kv('Candidate', esc(candidateName)) +
      kv('Winner', esc(winnerName)) +
      kv('Term', esc(FB.T('{days} fixed days', {
        days:def.termDays || 0
      }))) +
      kv('Result', esc(result.passed ? FB.T('Elected') : FB.T('Defeated'))) +
      kv('Tally', esc(FB.T('{support} of {total} weighted votes; {majority} required', {
        support:result.supportWeight, total:result.totalWeight,
        majority:result.majority
      }))) + '<div class="panelh">' + esc(FB.T('Recorded electorate result')) + '</div>';
    for (let i = 0; i < electorates.length; i++) {
      const electorate = electorates[i];
      h += '<div class="kv"><span>' + esc(electionDefinitionText(
        s, result.definitionId, def, 'electorates.' + i + '.name')) +
        '</span><b>' + esc(result.outcomes[electorate.id] === 'support'
          ? FB.T('Supported the candidate') : FB.T('Opposed the candidate')) +
        '</b></div>';
    }
    h += '<div class="gm-footer"><button type="button" class="btn primary" ' +
      'id="election-result-close">' + esc(FB.T('Continue')) +
      '</button></div>';
    openModal((def.icon || '🗳') + ' ' + FB.T('Election result'), h, {
      historyView:true,
      replaceView:true,
      historyBackRender:function () { electionReturn(returnContext); }
    });
    $('election-result-close').addEventListener('click', function () {
      modalHistoryBack(function () { electionReturn(returnContext); });
    });
    UI.refresh();
  };

  function privilegePartyName(s, type, id) {
    if (type === 'character' && s.chars[id]) return FB.fullName(s.chars[id]);
    if (type === 'realm') {
      if (id === 'player') return FB.T('The player crown');
      if (s.realms[id]) return s.realms[id].name;
    }
    if (type === 'county' && FB.world.byId[id]) return FB.world.byId[id].name;
    if (type === 'house' && s.chars[id]) return FB.fullName(s.chars[id]);
    if (type === 'faith') return religionName(s, id);
    if (type === 'guild') return FB.T('The chartered guild');
    if (type === 'institution') {
      return id && id.indexOf('council:') === 0
        ? FB.T('The Royal Council') : FB.T('The Estates');
    }
    if (type === 'local') return FB.T('Local authority');
    return id || FB.T('Unrecorded party');
  }

  function privilegeEffectDescription(s, record, def) {
    if (record.effectKind === 'modifier') {
      return modifierEffectText(s, record.effectId) ||
        dt(s, 'privilege', record.defId, def, 'desc');
    }
    if (record.effectKind === 'guild_monopoly') {
      const careerDef = FBDATA.careers[record.profession];
      return FB.T('Exclusive {profession} practice; +{enterprise}% matching enterprise profit and +{tax}% issuer tax under the surviving contract.', {
        profession:careerDef
          ? dt(s, 'career', record.profession, careerDef, 'name')
          : record.profession || FB.T('guild'),
        enterprise:Math.round(record.enterpriseBonus * 100),
        tax:Math.round(record.taxBonus * 100)
      });
    }
    if (record.effectKind === 'obligation') {
      return FB.T('New extraordinary aids require the Estates’ consent.');
    }
    if (record.effectKind === 'council_confirmation') {
      return FB.T('Treasurer and Constable nominees require a vote and receive protected fixed terms.');
    }
    return dt(s, 'privilege', record.defId, def, 'desc');
  }

  function privilegeTermsList(s, defId, def, label, path, rows) {
    if (!Array.isArray(rows) || !rows.length) return '';
    let h = '<div class="ccmeta"><b>' + esc(label) + ':</b><ul>';
    for (let i = 0; i < rows.length; i++) {
      h += '<li>' + esc(dt(s, 'privilege', defId, def,
        path + '.' + i)) + '</li>';
    }
    return h + '</ul></div>';
  }

  function privilegeDisplayName(s, defId) {
    const def = FBDATA.privileges[defId];
    return def ? dt(s, 'privilege', defId, def, 'name') : defId;
  }

  UI.showPrivileges = function (returnView, replaceView) {
    const s = FB.state;
    const records = FB.privilegeSummary ? FB.privilegeSummary(s) : [];
    const demands = FB.collectiveDemandSummary
      ? FB.collectiveDemandSummary(s) : { pending:null, opposition:[] };
    let h = '<p class="hint">' + esc(FB.T(
      'Privileges are durable legal contracts. Mechanical effects remain in their ordinary modifier, monopoly, obligation, or Council ledger; this roll records who holds them and on what terms.')) + '</p>';
    if (!records.length) {
      h += '<div class="progressnote">' + esc(FB.T(
        'No active privilege is recorded.')) + '</div>';
    }
    for (const record of records) {
      const def = FBDATA.privileges[record.defId] || {};
      const revoke = FB.privilegeRevocationStatus(s, record.id);
      h += '<div class="charcard"><div><div class="ccname">' +
        (def.icon || '📜') + ' ' + esc(dt(s, 'privilege', record.defId,
          def, 'name')) + '</div>' +
        kv('Holder', esc(FB.T('{type}: {name}', {
          type:record.holderType,
          name:privilegePartyName(s, record.holderType, record.holderId)
        }))) +
        kv('Scope', esc(FB.T('{type}: {name}', {
          type:record.scopeType,
          name:privilegePartyName(s, record.scopeType, record.scopeId)
        }))) +
        kv('Grantor', esc(FB.T('{type}: {name}', {
          type:record.grantorType,
          name:privilegePartyName(s, record.grantorType, record.grantorId)
        }))) +
        kv('Exact effect', esc(privilegeEffectDescription(s, record, def))) +
        kv('Duration', esc(record.remainingDays === null
          ? FB.T('Indefinite while its legal source survives')
          : FB.T('{days} protected days remain', {
            days:record.remainingDays
          }))) +
        kv('Revocation', esc(FB.T('{rule}: {reason}', {
          rule:record.revocationRule,
          reason:revoke.reason || FB.T('No unilateral revocation path')
        }))) +
        privilegeTermsList(s, record.defId, def, FB.T('Rights'),
          'rights', def.rights) +
        privilegeTermsList(s, record.defId, def, FB.T('Exemptions'),
          'exemptions', def.exemptions) +
        privilegeTermsList(s, record.defId, def, FB.T('Obligations'),
          'obligations', def.obligations) +
        (revoke.ready
          ? '<button type="button" class="btn" data-revoke-privilege="' +
            esc(record.id) + '">' + esc(FB.T('Begin unlawful revocation…')) +
            '</button>' : '') + '</div></div>';
    }
    h += '<div class="panelh">' + esc(FB.T('Collective opposition')) + '</div>';
    if (demands.pending) {
      h += '<div class="progressnote warnote">' + esc(FB.T(
        '{constituency} currently demands {privilege}.', {
          constituency:demands.pending.constituency,
          privilege:privilegeDisplayName(s, demands.pending.privilegeId)
        })) + '</div>';
    }
    if (!demands.opposition.length) {
      h += '<div class="hint">' + esc(FB.T(
        'No constituency is presently organized around a refused demand.')) + '</div>';
    }
    for (const opposition of demands.opposition) {
      h += kv(opposition.constituency, esc(FB.T(
        'Organization level {level}/5 · cause: {privilege}', {
          level:opposition.level,
          privilege:opposition.privilegeId
            ? privilegeDisplayName(s, opposition.privilegeId)
            : FB.T('unrecorded grievance')
        })));
    }
    h += '<div class="gm-footer"><button type="button" class="btn" ' +
      'id="privileges-back">' +
      esc(returnView === 'governance' ? FB.T('Back') : FB.T('Close')) +
      '</button></div>';
    openModal(FB.T('📜 Privileges & collective demands'), h, {
      modalClass:'fullsheet-modal', historyView:returnView === 'governance',
      replaceView:!!replaceView,
      historyBackRender:function () { UI.showGovernance('institution'); }
    });
    document.querySelectorAll('[data-revoke-privilege]').forEach(
      function (button) {
        button.addEventListener('click', function () {
          UI.showPrivilegeRevocation(button.dataset.revokePrivilege,
            returnView);
        });
      });
    $('privileges-back').addEventListener('click', function () {
      if (returnView === 'governance') {
        modalHistoryBack(function () { UI.showGovernance('institution'); });
      } else UI.closeModal();
    });
  };

  UI.showPrivilegeRevocation = function (recordId, returnView) {
    const s = FB.state;
    const status = FB.privilegeRevocationStatus(s, recordId);
    if (!status.ready) return UI.showPrivileges(returnView, true);
    const def = FBDATA.privileges[status.record.defId] || {};
    const remainingDays = isFinite(Number(status.record.endTurn))
      ? Math.max(0, Math.ceil(status.record.endTurn - s.turn)) : 0;
    const h = '<div class="progressnote warnote">' + esc(FB.T(
      'This revocation breaks the protected term. Common Voice falls, mistreatment is recorded, and the affected constituency organizes opposition.')) +
      '</div>' + kv('Privilege', esc(dt(s, 'privilege', status.record.defId,
        def, 'name'))) + kv('Protected duration', esc(FB.T(
        '{days} days remain', { days:remainingDays }))) +
      '<div class="gm-list"><button type="button" class="actionbtn op-bad" ' +
      'id="privilege-revoke-confirm">' + esc(FB.T('Revoke unlawfully')) +
      '</button></div><div class="gm-footer"><button type="button" ' +
      'class="btn" id="privilege-revoke-back">' +
      esc(FB.T('Keep the privilege')) + '</button></div>';
    openModal(FB.T('Revoke a protected privilege?'), h, {
      historyView:true, replaceView:true, noFocus:true,
      historyBackRender:function () { UI.showPrivileges(returnView); }
    });
    $('privilege-revoke-back').addEventListener('click', function () {
      modalHistoryBack(function () { UI.showPrivileges(returnView); });
    });
    $('privilege-revoke-confirm').addEventListener('click', function () {
      if (!FB.revokePrivilege(s, recordId)) return;
      UI.showPrivileges(returnView, true);
      UI.refresh();
    });
  };

  function councilAssignmentCard(s, seat, rid, oldRid, selected, data,
      recommended) {
    const realm = rid && s.realms[rid];
    if (!realm) return '';
    const oldRealm = oldRid && s.realms[oldRid];
    const appointment = !selected && FB.councilAppointmentStatus
      ? FB.councilAppointmentStatus(s, seat.id, rid) : null;
    let consequence = FB.T('Gains +10 Standing; no one is displaced from this vacant seat.');
    if (selected) consequence = FB.T('Keeps the current office.');
    else if (oldRealm) {
      consequence = FB.T(
        'Replaces {name}; the former officer loses 8 Standing and the appointee gains 10 Standing.',
        { name:oldRealm.ruler.name });
    }
    if (appointment && appointment.requiresConfirmation) {
      consequence = appointment.ready
        ? FB.T('Begins a visible confirmation election. Appointment and its protected fixed term occur only if the nominee wins.')
        : FB.T('Cannot be nominated: {requirements}', {
          requirements:appointment.missing.join('; ')
        });
    }
    return personAssignmentCard({
      name:realm.ruler.name,
      art:FB.crestTag(rid, 34, 40),
      selected:selected,
      disabled:selected || !!(appointment && !appointment.ready),
      eligibility:selected ? FB.T('Current officer') :
        (appointment && appointment.requiresConfirmation
          ? (appointment.ready ? FB.T('Eligible for confirmation')
            : FB.T('Nomination blocked')) :
        (recommended ? FB.T('Recommended unseated vassal') :
          (FB.isProtected(s, 'councilRealm', rid)
            ? FB.T('Reserved from automatic appointment; manual choice remains available')
            : FB.T('Eligible unseated vassal')))),
      data:data || {},
      rows:[
        { label:'Expected benefit', value:councilSeatDesc(seat.id) },
        { label:'Cost / pay', value:selected
          ? FB.T('No household wage')
          : (appointment && appointment.requiresConfirmation
            ? FB.T('No wage; choose one campaign approach before the confirmation vote.')
            : FB.T('No household wage; appointment lowers crown authority by 2.')) },
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
  UI.showCouncil = function (returnView, returnContext, replaceView) {
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
    const activeElection = FB.activeCouncilElection &&
      FB.activeCouncilElection(s);
    if (activeElection) {
      const electionDef = FBDATA.elections[activeElection.definitionId] || {};
      h += '<button type="button" class="actionbtn" id="council-election">🗳 ' +
        esc(FB.T('Manage active confirmation — {office}', {
          office:dt(s, 'election', activeElection.definitionId,
            electionDef, 'name')
        })) + '<span class="adesc">' + esc(FB.T(
          'Review candidates, constituencies, term, support, and record the vote.')) +
        '</span></button>';
    }
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
    h += '<div class="panelh">' + esc(FB.T('Automatic appointment reservations')) +
      '</div><div class="cmeta">' + esc(FB.T(
        'Reserved vassals are skipped when vacancies fill automatically and are not recommended first. You may still appoint them manually.')) +
      '</div><div class="council-protection-list">';
    for (const vid of FB.playerVassals(s)) {
      const realm = s.realms[vid];
      if (!realm) continue;
      h += '<button type="button" class="btn small" data-council-protection="' +
        esc(vid) + '" aria-pressed="' +
        (FB.isProtected(s, 'councilRealm', vid) ? 'true' : 'false') + '">' +
        (FB.isProtected(s, 'councilRealm', vid) ? '🔒 ' : '🔓 ') +
        esc(realm.ruler ? realm.ruler.name : realm.name) + ' · ' +
        esc(FB.isProtected(s, 'councilRealm', vid)
          ? FB.T('Reserved') : FB.T('Automatic allowed')) + '</button>';
    }
    h += '</div>';
    for (const seat of FB.councilSeats()) {
      const rid = seats[seat.id];
      const r = rid ? s.realms[rid] : null;
      h += '<div class="panelh">' + seat.icon + ' ' + esc(councilSeatName(seat.id)) + '</div>';
      h += '<div class="cmeta">' + esc(councilSeatDesc(seat.id)) + '</div>';
      if (r) {
        const op = FB.standingOf(s, { kind:'realm', id:rid });
        const trait = r.ruler.trait && FBDATA.traits[r.ruler.trait]
          ? dt(s, 'trait', r.ruler.trait, FBDATA.traits[r.ruler.trait], 'name') : '';
        const electionStore = s.elections && s.elections.councilTerms;
        const term = electionStore && electionStore[seat.id];
        const dismissal = FB.councilDismissalStatus
          ? FB.councilDismissalStatus(s, seat.id) : { ready:true };
        h += '<div class="charcard"><canvas class="pface" width="56" height="64" id="crest_' + esc(seat.id) + '"></canvas>' +
          '<div><div class="ccname">' + esc(r.ruler.name) + '</div>' +
          '<div class="ccmeta">' + esc(r.name) + (trait ? ' · ' + esc(trait) : '') + '</div>' +
          '<div class="ccmeta ' + standingClass(op) + '">' +
          esc(FB.T('Standing {standing}', {
            standing:standingText(op)
          })) + '</div>' +
          (term && term.holderId === rid
            ? '<div class="ccmeta">' + esc(FB.T(
              'Confirmed fixed term · {days} days remain', {
                days:Math.max(0, Math.ceil(term.endTurn - s.turn))
              })) + '</div>' : '') +
          '<div style="margin-top:6px">' +
          '<button class="btn" data-council-realm="' + esc(rid) + '">' +
          esc(FB.T('Ruler card…')) + '</button> ' +
          '<button class="btn" data-council-gift="' + esc(rid) + '">🎁 ' +
          esc(FB.T('Offer a gift…')) + '</button> ' +
          (unseated.length
            ? '<button class="btn" data-council-assign="' + esc(seat.id) + '">🏛 ' +
              esc(FB.T('Choose another officer…')) + '</button> '
            : '') +
          '<button class="btn" data-dismiss="' + esc(seat.id) + '"' +
          (dismissal.ready ? '' : ' disabled') + '>' +
          esc(FB.T('Dismiss')) + '</button>' +
          (dismissal.ready ? '' : '<div class="ccmeta">' +
            esc(dismissal.reason) + '</div>') +
          '</div></div></div>';
      } else {
        h += '<div class="cmeta">' + esc(FB.T('Vacant.')) + '</div>';
        if (unseated.length) {
          const recommended = FB.councilRecommendation(s, seat.id);
          const ordered = unseated.slice().sort(function (a, b) {
            if (a === recommended) return -1;
            if (b === recommended) return 1;
            return a < b ? -1 : a > b ? 1 : 0;
          });
          for (const vid of ordered) {
            h += councilAssignmentCard(s, seat, vid, null, false, {
              appoint:seat.id + '|' + vid
            }, vid === recommended);
          }
        } else {
          h += '<div class="cmeta">' + esc(FB.T('No unseated vassal remains to raise — grant land to loyal men, and offices will follow.')) + '</div>';
        }
      }
    }
    h += '<button class="btn" id="gm-cancel">' +
      esc(returnView === 'governance' || returnContext
        ? FB.T('Back') : FB.T('Close')) +
      '</button>';
    const councilOptions = returnView === 'governance' || returnContext ? {
        historyView:true,
        historyBackRender:function () {
          if (returnView === 'governance') UI.showGovernance('institution');
          else interactionReturn(returnContext);
        }
      } : {};
    councilOptions.replaceView = !!replaceView;
    openModal(FB.T('The Royal Council'), h, councilOptions);
    for (const seat of FB.councilSeats()) {
      const cv = $('crest_' + seat.id);
      if (cv && seats[seat.id]) FB.drawCrest(cv, seats[seat.id]);
    }
    FB.paintCrests($('gm-body'));
    const electionButton = $('council-election');
    if (electionButton) electionButton.addEventListener('click', function () {
      UI.showElection({
        view:'council', returnView:returnView, returnContext:returnContext
      });
    });
    document.querySelectorAll('[data-council-realm]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        UI.showLiegeModal(btn.dataset.councilRealm, {
          view:'council',
          returnView:returnView,
          returnContext:returnContext
        });
      });
    });
    document.querySelectorAll('[data-council-gift]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        UI.showRulerGiftModal(btn.dataset.councilGift,
          {
            kind:'council',
            returnView:returnView,
            returnContext:returnContext
          });
      });
    });
    document.querySelectorAll('[data-council-assign]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        UI.showCouncilCandidates(btn.dataset.councilAssign, returnView,
          returnContext);
      });
    });
    document.querySelectorAll('[data-council-protection]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const rid = btn.dataset.councilProtection;
        FB.setProtected(s, 'councilRealm', rid,
          !FB.isProtected(s, 'councilRealm', rid));
        UI.showCouncil(returnView, returnContext, true);
      });
    });
    document.querySelectorAll('[data-dismiss]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        FB.councilDismiss(FB.state, btn.dataset.dismiss);
        UI.showCouncil(returnView, returnContext, true);
      });
    });
    document.querySelectorAll('[data-appoint]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const parts = btn.dataset.appoint.split('|');
        const result = FB.councilAppoint(FB.state, parts[0], parts[1]);
        if (result && result.pending) {
          UI.showElection({
            view:'council', returnView:returnView,
            returnContext:returnContext
          });
          return;
        }
        UI.showCouncil(returnView, returnContext, true);
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      if (returnView === 'governance') {
        modalHistoryBack(function () { UI.showGovernance('institution'); });
      } else if (returnContext) {
        modalHistoryBack(function () {
          interactionReturn(returnContext);
        });
      } else {
        UI.closeModal();
        UI.refresh();
      }
    });
  };

  UI.showCouncilCandidates = function (seatId, returnView, returnContext) {
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
    const recommended = FB.councilRecommendation(s, seat.id);
    candidates.sort(function (a, b) {
      if (a === recommended) return -1;
      if (b === recommended) return 1;
      return a < b ? -1 : a > b ? 1 : 0;
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
      }, rid === recommended);
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
      historyBackRender:function () {
        UI.showCouncil(returnView, returnContext);
      }
    });
    FB.paintCrests($('gm-body'));
    document.querySelectorAll('[data-council-candidate]').forEach(function (button) {
      button.addEventListener('click', function () {
        const rid = button.dataset.councilCandidate;
        const result = FB.councilAppoint(s, seat.id, rid);
        if (result && result.pending) {
          UI.showElection({
            view:'council', returnView:returnView,
            returnContext:returnContext
          });
          return;
        }
        if (!s.council || s.council.seats[seat.id] !== rid) return;
        modalHistoryBack(function () {
          UI.showCouncil(returnView, returnContext);
        });
        UI.refresh();
      });
    });
    $('council-candidates-back').addEventListener('click', function () {
      modalHistoryBack(function () {
        UI.showCouncil(returnView, returnContext);
      });
    });
  };

  /* the estates of the realm (vassal tiers 3-5): the terms of the player's
     service, and the motions they can buy between sittings — see
     js/parliament.js for the machinery and FB.parliamentYearly for sessions */
  UI.showParliament = function (returnView, replaceView) {
    if (returnView !== 'governance') returnView = null;
    const s = FB.state;
    const projection = FB.parliamentSummary(s);
    if (!projection) return;
    const liege = s.realms[s.player.liege];
    const cost = projection.motionCost;
    const pending = projection.pendingMotion;
    const activeForecast = projection.motionForecast;
    const politics = FB.politicalSummary(s);
    const policies = FB.policyList ? FB.policyList() : [];
    const forecasts = politics && politics.forecasts ? politics.forecasts : {};
    let h = '<p class="hint">' + esc(FB.T(
      'When {liege} summons the Estates, each political bloc votes with one voice. Influence decides the tally; uncertain blocs resolve from their visible interests.',
      { liege: liege.name })) + '</p>';
    h += kv('The liege’s aid', esc(FB.T(
      '{pct}% of your noble revenue', {
        pct:Math.round(projection.aid * 100)
      }))) +
      kv('Banner service', esc(projection.scutage
        ? FB.T('Scutage — silver answers the summons')
        : FB.T('Spears — you must ride, or pay dearly'))) +
      kv('Lobbying strength', esc(FB.T('{chance}%', {
        chance:Math.round((activeForecast
          ? activeForecast.playerVoteChance
          : projection.vote.total) * 100)
      })));
    if (!pending) {
      for (const entry of policies) {
        if (!entry.def.redressEvidence) continue;
        const evidenceForecast = forecasts[entry.id];
        if (evidenceForecast &&
            evidenceForecast.playerVoteChance !== projection.vote.total) {
          h += kv('Lobbying strength with redress evidence',
            esc(FB.T('{chance}%', {
              chance:Math.round(
                evidenceForecast.playerVoteChance * 100)
            })));
        }
      }
    }
    h += '<p class="hint">' + esc(FB.T(
      'Beginning a motion costs {money:cost} in gifts and promises, spends the year’s hearing for its family of business, and opens a 90-day campaign. One targeted lobbying attempt is included.',
      { cost: cost })) + '</p>';
    h += '<div class="gm-list">';
    h += '<button class="actionbtn" id="estates-liege-card">' +
      esc(FB.T('Open {liege}’s ruler card…', {
        liege:liege.ruler.name
      })) + '<span class="adesc">' + esc(FB.T(
        'Review Standing, gifts, cultivation, feudal actions, and the realm relationship.')) +
      '</span></button>';
    if (!pending) {
      for (const policy of policies) {
        const status = FB.parliamentMotionStatus(s, policy.id);
        const forecast = forecasts[policy.id] || null;
        h += '<button class="actionbtn" data-motion="' + esc(policy.id) + '"' +
          (status.ready ? '' : ' disabled') + '>' +
          (policy.def.icon ? esc(policy.def.icon) + ' ' : '') +
          esc(FB.T('Propose: {policy} ({money:cost})', {
            policy:politicalMotionName(policy.id),
            cost:politicalPolicyCost(policy.def)
          })) + '<span class="adesc">' +
          esc(status.reason || (politicalTotalsText(forecast) +
            '. ' + politicalPolicyDesc(policy.id))) +
          '</span></button>';
      }
    } else if (activeForecast) {
      h += '<div class="progressnote">' + esc(FB.T(
        '{motion} campaign · {days} days remain.', {
          motion:politicalMotionName(pending.motionId),
          days:Math.max(0, pending.expiresTurn - s.turn)
        })) + '<br>' + esc(politicalTotalsText(activeForecast)) +
        '</div>';
      if (pending.lobby && pending.lobby.used) {
        h += '<div class="progressnote">' + esc(
          pending.lobby.success
            ? FB.T('Lobbying succeeded; the targeted bloc pledged support.')
            : FB.T('Lobbying failed; the targeted bloc remains undecided.')) +
          '</div>';
      }
      for (const bloc of activeForecast.blocs) {
        const status = FB.parliamentLobbyStatus(s, bloc.id);
        h += '<div class="political-motion-row" data-estates-bloc="' +
          esc(bloc.id) + '"><div><b>' +
          esc(politicalBlocName(
            s, politics, bloc)) + '</b>' +
          '<span class="cmeta">' + esc(FB.T(
            '{influence} influence · {posture}', {
              influence:bloc.influence,
              posture:politicalPostureText(bloc.posture)
            })) +
          (bloc.posture === 'undecided'
            ? ' · ' + esc(FB.T('{chance}% natural support', {
              chance:Math.round(bloc.naturalSupportChance * 100)
            }))
            : '') + '</span></div>';
        if (status.ready) {
          h += '<button type="button" class="btn small" data-lobby-bloc="' +
            esc(bloc.id) + '">' + esc(FB.T('Lobby ({chance}%)', {
              chance:Math.round(status.chance * 100)
            })) + '</button>';
        }
        h += '</div>';
      }
      if (!pending.result) {
        h += '<button class="actionbtn" id="estates-call-vote">🗳 ' +
          esc(FB.T('Call the vote')) + '<span class="adesc">' +
          esc(FB.T(
            'Every undecided bloc resolves once, in stable order. There is no final global roll.')) +
          '</span></button>' +
          '<button class="actionbtn" id="estates-withdraw">↩ ' +
          esc(FB.T('Withdraw the motion')) + '<span class="adesc">' +
          esc(FB.T(
            'The gold and yearly motion remain spent; unused redress evidence is preserved.')) +
          '</span></button>';
      }
    }
    h += '</div>';
    h += '<button class="btn" id="gm-cancel">' +
      esc(returnView === 'governance' ? FB.T('Back') : FB.T('Close')) +
      '</button>';
    const modalOptions = returnView === 'governance' ? {
      historyView:true,
      historyBackRender:function () { UI.showGovernance('institution'); }
    } : {};
    if (replaceView) modalOptions.replaceView = true;
    openModal(FB.T('The Estates'), h, modalOptions);
    $('estates-liege-card').addEventListener('click', function () {
      UI.showLiegeModal(s.player.liege, {
        view:'estates',
        returnView:returnView
      });
    });
    document.querySelectorAll('[data-motion]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!FB.parliamentBeginMotion(s, btn.dataset.motion)) return;
        UI.showParliament(returnView, true);
      });
    });
    document.querySelectorAll('[data-lobby-bloc]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const result = FB.parliamentLobbyMotion(
          s, btn.dataset.lobbyBloc);
        if (!result) return;
        UI.toast(result.success
          ? FB.T('The bloc pledges its support.')
          : FB.T('The bloc remains undecided.'));
        UI.showParliament(returnView, true);
      });
    });
    const callVote = $('estates-call-vote');
    if (callVote) {
      callVote.addEventListener('click', function () {
        if (!FB.parliamentCallVote(s)) return;
        UI.closeModal();
        UI.refresh();
      });
    }
    const withdraw = $('estates-withdraw');
    if (withdraw) {
      withdraw.addEventListener('click', function () {
        if (!FB.parliamentWithdrawMotion(s)) return;
        UI.showParliament(returnView, true);
      });
    }
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
  UI.showRevoke = function (returnContext) {
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
    h += '</div><button class="btn" id="gm-cancel">' +
      esc(returnContext ? FB.T('Back') : FB.T('Not now')) + '</button>';
    openModal(FB.T('Revoke a County'), h, managementModalOptions(returnContext));
    document.querySelectorAll('[data-rid]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const rid = btn.dataset.rid;
        FB.state.player.revokeRid = rid;
        FB.queueEvent(FB.state, 'vassal_revoke', { rid:rid });
        managementFinish(returnContext, UI.closeModal);
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      managementBack(returnContext, UI.closeModal);
    });
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
    if (s.player.tier <= 2) {
      return FB.T('One quarter of regular revenues is assigned until the debt is cleared. If the default remains after {days} days, the lord’s court may seize household holdings and land; a destitute household can lose station. Prestige falls, and lenders refuse the household for four seasons.', {
        days:FBDATA.balance.distraintGraceDays || 90
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

  function financeLoanCard(s, loan, showDefaultSettlement) {
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
      if (s.player.tier <= 2 && FB.financeDistraintDaysRemaining) {
        const days = FB.financeDistraintDaysRemaining(s);
        if (days !== null) {
          h += '<br><span class="op-bad">' + esc(days > 0
            ? FB.T('{days}-day grace remaining before a creditor may seek a writ, a court order to seize property.', {
              days:days
            })
            : FB.T('The grace period has ended — a creditor may now seek a writ, a court order to seize property.')) +
            '</span>';
        }
      }
      if (showDefaultSettlement) {
        const defaultDue = financeAmount(FB.financeDefaultDue(s));
        h += '<button class="btn" data-finance-default-settle="1"' +
          (FB.financeCanSettleDefault(s) ? '' : ' disabled') +
          ' style="margin-top:8px">' +
          esc(FB.T('Settle default balance ({money:amount})', {
            amount:defaultDue
          })) + '</button>';
      }
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
      let defaultSettlementShown = false;
      for (const loan of loans) {
        const showDefaultSettlement = loan.status === 'default' && !defaultSettlementShown;
        h += financeLoanCard(s, loan, showDefaultSettlement);
        if (showDefaultSettlement) defaultSettlementShown = true;
      }
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
    const settleDefault = document.querySelector('[data-finance-default-settle]');
    if (settleDefault) settleDefault.addEventListener('click', UI.showFinanceDefaultRepay);
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

  UI.showFinanceDefaultRepay = function () {
    const s = FB.state;
    const due = financeAmount(FB.financeDefaultDue(s));
    if (!(due > 0)) { UI.showFinance(); return; }
    const canSettle = FB.financeCanSettleDefault(s);
    const h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Pay {money:amount} now to clear every defaulted obligation. Assigned revenues stop, any pending writ is withdrawn, and no household property is seized.', {
        amount:due
      })) + '</p></div><div class="gm-list">' +
      '<button class="actionbtn" id="finance-default-pay"' +
      (canSettle ? '' : ' disabled') + '>⚖ ' +
      esc(FB.T('Settle defaults for {money:amount}', { amount:due })) +
      '</button></div><div class="gm-footer"><button class="btn" ' +
      'id="finance-cancel">' + esc(FB.T('Back')) + '</button></div>';
    openModal(FB.T('Settle the default'), h, { noFocus:true });
    const pay = $('finance-default-pay');
    if (pay) pay.addEventListener('click', function () {
      if (FB.settleFinanceDefault(s)) UI.showFinance();
      else UI.showFinanceDefaultRepay();
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

  UI.showDebasement = function (returnContext) {
    const s = FB.state;
    if (!FB.financeCanDebase(s)) {
      if (returnContext) interactionReturn(returnContext);
      else UI.showFinance();
      return;
    }
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
    openModal(FB.T('Debase the coinage?'), h,
      managementModalOptions(returnContext));
    $('finance-debase-confirm').addEventListener('click', function () {
      FB.debaseCoinage(s);
      managementFinish(returnContext, UI.showFinance);
    });
    $('finance-cancel').addEventListener('click', function () {
      managementBack(returnContext, UI.showFinance);
    });
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

  function householdStandardRules(s, def) {
    return '<div class="household-standard-rules" role="note">' +
      '<b>' + esc(householdStandardScope(s, def)) + '</b><span>' +
      esc(FB.T(
        'Passes to the next household head; cannot be sold or pledged. It may lapse when upkeep cannot be paid.')) +
      '</span></div>';
  }

  function householdStandardCurrent(s, id, level, current, active) {
    const levelText = level
      ? FB.T('Level {level}: {name}', {
        level:level, name:householdStandardLevelName(s, id, level)
      })
      : FB.T('Baseline');
    const upkeep = level && active && current
      ? FB.T('{money:amount}/season', { amount:Number(current.upkeep) || 0 })
      : level ? FB.T('None while dormant') : FB.T('No upkeep');
    const effect = level && active
      ? householdStandardLevelDesc(s, id, level)
      : level ? FB.T('Dormant — no current benefit') :
        FB.T('No maintained improvement');
    return '<section class="household-standard-current" ' +
      'aria-labelledby="household-standard-current-title">' +
      '<span class="household-standard-eyebrow" ' +
      'id="household-standard-current-title">' + esc(FB.T('Current level')) +
      '</span><div class="household-standard-current-line"><b>' +
      esc(levelText) + '</b><span>' + esc(upkeep) + '</span></div>' +
      '<p>' + esc(effect) + '</p></section>';
  }

  function householdStandardUpgradeChoice(s, id, level, next, availability) {
    const setup = assetSummaryValue(assetMoneyCost(next.cost,
      s.player.gold >= (Number(next.cost) || 0)), '');
    return '<button class="actionbtn household-standard-choice" ' +
      'id="household-standard-upgrade"' +
      (availability === true ? '' : ' disabled') + '>' +
      '<span class="household-standard-choice-head"><b>' +
      esc(FB.T('Improve to level {level}: {name}', {
        level:level + 1,
        name:householdStandardLevelName(s, id, level + 1)
      })) + '</b><span aria-hidden="true">›</span></span>' +
      '<span class="household-standard-choice-effect">' +
      esc(householdStandardLevelDesc(s, id, level + 1)) + '</span>' +
      '<span class="household-standard-choice-terms">' +
      '<span><small>' + esc(FB.T('Setup cost')) + '</small><b' +
      (setup.tone ? ' class="' + esc(setup.tone) + '"' : '') + '>' +
      esc(setup.text) + '</b></span><span><small>' +
      esc(FB.T('Recurring cost')) + '</small><b>' +
      esc(FB.T('{money:amount}/season', {
        amount:Number(next.upkeep) || 0
      })) + '</b></span></span>' +
      (availability === true ? '' :
        '<span class="adesc household-standard-choice-blocked">' +
        esc(availability) + '</span>') + '</button>';
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

  function householdCatalogueEntry(options) {
    const opts = options || {};
    return '<span class="household-entry-layout">' +
      '<span class="household-entry-icon" aria-hidden="true">' +
      esc(opts.icon || '🏠') + '</span>' +
      '<span class="household-entry-copy"><b>' + esc(opts.name || '') + '</b>' +
      (opts.status ? '<small class="household-entry-status">' +
        esc(opts.status) + '</small>' : '') +
      (opts.effect ? '<small class="household-entry-effect">' +
        esc(opts.effect) + '</small>' : '') + '</span>' +
      '<span class="household-entry-cost' +
      (opts.unaffordable ? ' unaffordable' : '') + '"><b>' +
      esc(opts.cost || '') + '</b><small>' +
      esc(opts.costLabel || '') + '</small><small>' +
      esc(opts.recurring || '') + '</small></span></span>';
  }

  function householdStandardRow(s, id) {
    const def = FBDATA.householdStandards[id];
    const level = FB.householdStandardLevel(s, id);
    const current = level && def.levels[level - 1];
    const active = FB.householdStandardActive(s, id);
    const next = level < def.levels.length ? def.levels[level] : null;
    const status = level
      ? FB.T('Level {level}: {name}', {
        level:level, name:householdStandardLevelName(s, id, level)
      })
      : FB.T('Baseline');
    const effect = level
      ? (active
        ? householdStandardLevelDesc(s, id, level)
        : FB.T('Dormant — no current benefit'))
      : (next
        ? FB.T('Next level: {name} — {effect}', {
          name:householdStandardLevelName(s, id, level + 1),
          effect:householdStandardLevelDesc(s, id, level + 1)
        })
        : FB.T('No maintained improvement'));
    const short = next && s.player.gold < (Number(next.cost) || 0);
    return '<button class="actionbtn household-entry household-standard' +
      (level && active ? ' household-entry-active' : '') +
      (level && !active ? ' household-entry-dormant' : '') +
      '" data-household-standard="' + esc(id) + '">' +
      householdCatalogueEntry({
        icon:def.icon || '🏠',
        name:householdStandardName(s, id),
        status:status,
        effect:effect,
        cost:next ? FB.money(Number(next.cost) || 0) : FB.T('Completed'),
        costLabel:next
          ? (short ? FB.T('not enough money') : FB.T('Next setup'))
          : FB.T('Highest level reached'),
        recurring:active && current
          ? FB.T('{money:amount}/season', {
            amount:Number(current.upkeep) || 0
          })
          : level ? FB.T('Dormant') : FB.T('No upkeep'),
        unaffordable:short
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
    let h = '<section class="household-catalogue-section" id="household-property" ' +
      'aria-labelledby="household-property-title"><h4 id="household-property-title">' +
      esc(FB.T('Permanent household property')) +
      '</h4><p class="household-section-hint">' + esc(FB.T(
        'Property is bought once and passes to heirs; eligible holdings may be sold or pledged. Maintained transport and work outfits above are expenses, not property.')) +
      '</p><div class="household-catalogue-list">';
    const available = FB.holdingAvailable(s);
    for (const t of available) {
      const short = s.player.gold < t.def.cost;
      h += '<button class="actionbtn household-entry household-property-entry" ' +
        'data-holding="' + esc(t.id) + '"' +
        (short ? ' disabled' : '') + '>' +
        householdCatalogueEntry({
          icon:t.def.icon,
          name:dt(s, 'holding', t.id, t.def, 'name'),
          status:dt(s, 'holding', t.id, t.def, 'desc'),
          effect:holdingEffectText(t.def) +
            (t.def.pledge === false ? ' · ' + holdingTransferRule(t.def) : ''),
          cost:FB.money(t.def.cost),
          costLabel:short ? FB.T('not enough money') : FB.T('Setup cost'),
          recurring:FB.T('No upkeep'),
          unaffordable:short
        }) + '</button>';
    }
    if (!available.length) {
      h += '<div class="household-empty">' + esc(FB.T(
        'No further permanent holding is available for this station and profession.')) +
        '</div>';
    }
    h += '</div>';
    const done = FB.holdingList(s);
    if (done.length) {
      h += '<h5>' + esc(FB.T('Owned property')) +
        '</h5><div class="household-catalogue-list household-owned-list">';
      for (const id of done) {
        const def = FBDATA.holdings[id];
        if (!def) continue;
        h += '<div class="household-entry household-property-entry ' +
          'household-entry-owned">' + householdCatalogueEntry({
            icon:def.icon,
            name:dt(s, 'holding', id, def, 'name'),
            status:holdingTransferRule(def),
            effect:holdingEffectText(def),
            cost:FB.T('Owned'),
            costLabel:FB.T('Permanent property'),
            recurring:FB.T('No upkeep')
          }) + '</div>';
      }
      h += '</div>';
    }
    return h + '</section>';
  }

  UI.showHousehold = function () {
    const s = FB.state;
    FB.ensureHouseholdStandards(s);
    const upkeep = FB.householdStandardsUpkeep(s);
    const net = FB.reliableGoldIncome(s);
    const projected = s.player.gold + net;
    let h = '<div class="household-summary">' +
      kv('Standards upkeep each season', esc(FB.money(upkeep))) +
      kv('Reliable seasonal net', '<span class="' +
        (net < 0 ? 'op-bad' : net > 0 ? 'op-good' : '') + '">' +
        esc(fmtAmt(net, true)) + '</span>') +
      kv('Projected purse after one season', '<span class="' +
        (projected < 0 ? 'op-bad' : '') + '">' + esc(FB.money(projected)) + '</span>') +
      '</div><p class="household-intro">' + esc(FB.T(
        'Each improvement replaces the previous level’s upkeep. Open a row for its full ownership, effect, succession, and lapse details.')) +
      '</p>' + (projected < 0 ? '<p class="household-warning op-bad">' + esc(FB.T(
        'The projected purse is negative. Spending is still allowed, but unaffordable standards will lapse at the season boundary without debt or further penalty.')) +
        '</p>' : '');

    h += '<section class="household-catalogue-section" id="household-living" ' +
      'aria-labelledby="household-living-title"><h4 id="household-living-title">' +
      esc(FB.T('Living standards')) +
      '</h4><p class="household-section-hint">' + esc(FB.T(
        'Living standards benefit the whole resident household — the head, resident family, and hired retainers — not any one person.')) +
      '</p><div class="household-catalogue-list">';
    for (const id of FB.householdStandardIds()) {
      const def = FBDATA.householdStandards[id];
      if (def.kind === 'work') continue;
      h += householdStandardRow(s, id);
    }
    h += '</div></section><section class="household-catalogue-section" ' +
      'id="household-outfits" aria-labelledby="household-outfits-title">' +
      '<h4 id="household-outfits-title">' + esc(FB.T('Work outfits')) +
      '</h4><p class="household-section-hint">' + esc(FB.T(
        'Profession outfits improve matching focus work, household earnings, religious yield, and staffed enterprises. They go dormant without an eligible worker; soldier outfits do not affect combat.')) +
      '</p><div class="household-catalogue-list">';
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
      h += '<div class="household-empty">' + esc(FB.T(
        'No practiced household profession currently has a relevant outfit.')) + '</div>';
    }
    h += '</div></section>' + permanentHoldingsHtml(s) +
      '<div class="gm-footer"><button class="btn" id="gm-cancel">' +
      esc(FB.T('Done')) + '</button></div>';
    openModal(FB.T('🏠 Household standards & property'), h, {
      modalClass:'fullsheet-modal household-modal'
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
    let h = '<div class="gm-body-text household-standard-detail">' +
      '<p class="household-standard-description">' +
      esc(dt(s, 'householdStandard', id, def, 'desc')) + '</p>' +
      householdStandardCurrent(s, id, level, current, active) +
      householdStandardRules(s, def) + '</div>' +
      '<div class="gm-list household-standard-options">';
    if (next) {
      h += householdStandardUpgradeChoice(s, id, level, next, availability);
    }
    if (level) {
      h += '<button class="actionbtn danger" id="household-standard-reduce">' +
        esc(FB.T('Reduce this standard by one level…')) +
        '<span class="adesc">' + esc(FB.T(
          'No refund. The lost level and its setup investment must be purchased again.')) +
        '</span></button>';
    }
    h += '</div><div class="gm-footer"><button class="btn" ' +
      'id="household-standard-back">' +
      esc(FB.T('Back to household')) + '</button></div>';
    openModal((def.icon || '🏠') + ' ' + householdStandardName(s, id), h, {
      historyView:true,
      modalClass:'fullsheet-modal household-standard-modal',
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

  function returnsToInteractionManagement(returnContext) {
    return !!(returnContext && typeof returnContext === 'object' &&
      (returnContext.view === 'character' ||
        returnContext.view === 'retainer'));
  }

  function finishManagementReturn(returnContext, fallback) {
    if (returnsToInteractionManagement(returnContext)) {
      modalHistoryBack(function () {
        interactionReturn(returnContext);
      });
      return;
    }
    finishHouseholdPlanReturn(returnContext, fallback);
  }

  /* A day-spending choice may queue an event, but the generic management
     sheet can still be rebuilt underneath that event. When the event clears,
     the player returns to the exact plan or person they were managing. */
  function resumeManagementAfterDay(returnContext, fallback) {
    if (returnsToHouseholdPlan(returnContext)) {
      UI.showHouseholdPlan();
      mobileNavClosedAll('modal-view', true);
      return;
    }
    if (returnsToInteractionManagement(returnContext)) {
      interactionReturn(returnContext);
      mobileNavClosedAll('modal-view', true);
      return;
    }
    if (fallback) fallback();
  }

  function householdPlanHistoryOptions(returnContext) {
    if (!returnsToHouseholdPlan(returnContext)) return null;
    return {
      historyView:true,
      historyBackRender:function () { UI.showHouseholdPlan(); }
    };
  }

  function livelihoodsHistoryOptions(returnContext) {
    return householdPlanHistoryOptions(returnContext) || {
      historyView:true,
      historyBackRender:function () {
        UI.showLivelihoods(returnContext);
      }
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

  function finishLivelihoodsReturn(returnContext) {
    if (returnsToHouseholdPlan(returnContext)) {
      finishHouseholdPlanReturn(returnContext, UI.showLivelihoods);
      return;
    }
    modalHistoryBack(function () {
      UI.showLivelihoods(returnContext);
    });
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
    else if (kind === 'kin') {
      relationship = FB.T('Your sibling · lives with the household');
    } else if (kind === 'retainer') {
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
    return '<div class="household-plan-person">' + FB.faceTag(c, 36, 42) +
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
    const familyOffice = FB.familyOfficeRecord &&
      FB.familyOfficeRecord(s, c.id);
    if (familyOffice) offices.push(positionName(s, familyOffice.office));
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
          FB.T('Matches are arranged for the descent line only')),
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

  UI.showHouseholdPlan = function (replaceView) {
    if (replaceView && typeof replaceView.preventDefault === 'function') {
      replaceView = false;
    }
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
    /* Manageable kin (resident unwed siblings) get work, assignment, and
       equipment cells like household members; education, instruction, and
       match cells stay disabled with their existing explanations — those
       are managed for the descent line only. */
    if (FB.manageableKinKind) {
      for (const id in s.chars) {
        const c = s.chars[id];
        if (c && FB.manageableKinKind(s, c.id)) add(c, 'kin');
      }
    }
    for (const record of FB.retainerRecords(s)) {
      add(s.chars[record.charId], 'retainer', record);
    }

    const enterprises = sortedEnterpriseRecords(s, FB.enterpriseList(s).slice());
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
      'Every living person managed by the household is shown here — including unwed siblings living under your roof, who take work and equipment but keep their own education and matches. Select an available cell to open its existing detailed controls.')) +
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
      (enterprises.length ? enterpriseViewControlsHtml('household', false) : '') +
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
      modalClass:'fullsheet-modal household-plan-modal',
      replaceView:!!replaceView
    });
    FB.paintFaces($('gm-body'), s);
    wireEnterpriseViewControls('household', function () {
      UI.showHouseholdPlan(true);
    });
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

  function enterpriseCategoryName(profession) {
    if (profession === 'farmer') return FB.T('Farming');
    if (profession === 'craftsman') return FB.T('Craft');
    if (profession === 'merchant') return FB.T('Trade');
    return FB.T('Other enterprises');
  }

  function enterpriseProblemState(s, enterprise) {
    const worker = enterprise.workerId && s.chars[enterprise.workerId];
    const eligible = FB.enterpriseWorkersFor(s, enterprise);
    let valid = false;
    for (const candidate of eligible) {
      if (worker && !worker.dead && candidate.id === worker.id) valid = true;
    }
    if (valid) return 'staffed';
    return eligible.length ? 'idle' : 'blocked';
  }

  function sortedEnterpriseRecords(s, source) {
    const view = largeListViews.work;
    if (view.stateRef !== s) {
      view.stateRef = s;
      view.search = '';
      view.filter = 'all';
      view.sections = {};
      view.scrollTop = 0;
      view.focusKey = null;
      view.enterpriseGroup = 'none';
      view.enterpriseSort = 'attention';
    }
    const rows = source.map(function (enterprise, index) {
      const def = FBDATA.enterprises[enterprise.type] || {};
      return {
        enterprise:enterprise,
        index:index,
        name:def.name ? dt(s, 'enterprise', enterprise.type, def, 'name') : enterprise.type,
        place:enterprisePlace(s, enterprise),
        value:Number(def.cost) || 0,
        yield:FB.enterpriseYield(s, enterprise),
        staffing:enterpriseProblemState(s, enterprise)
      };
    });
    const staffingOrder = { staffed:0, idle:1, blocked:2 };
    const attentionOrder = { idle:0, blocked:1, staffed:2 };
    rows.sort(function (a, b) {
      let result = 0;
      if (view.enterpriseSort === 'name') {
        result = a.name.localeCompare(b.name);
      } else if (view.enterpriseSort === 'acquisition') {
        result = a.index - b.index;
      } else if (view.enterpriseSort === 'value') {
        result = b.value - a.value;
      } else if (view.enterpriseSort === 'yield') {
        result = b.yield - a.yield;
      } else if (view.enterpriseSort === 'settlement') {
        result = a.place.localeCompare(b.place);
      } else if (view.enterpriseSort === 'staffing') {
        result = staffingOrder[a.staffing] - staffingOrder[b.staffing];
      } else {
        result = attentionOrder[a.staffing] - attentionOrder[b.staffing];
      }
      return result || a.name.localeCompare(b.name) || a.index - b.index ||
        String(a.enterprise.uid).localeCompare(String(b.enterprise.uid));
    });
    return rows.map(function (row) { return row.enterprise; });
  }

  function enterpriseSortOptions(selected) {
    const options = [
      ['attention', FB.T('Problems first')],
      ['name', FB.T('Name')],
      ['acquisition', FB.T('Acquisition order')],
      ['value', FB.T('Value, highest first')],
      ['yield', FB.T('Yield, highest first')],
      ['settlement', FB.T('Settlement')],
      ['staffing', FB.T('Staffing state')]
    ];
    let h = '';
    for (const option of options) {
      h += '<option value="' + option[0] + '"' +
        (selected === option[0] ? ' selected' : '') + '>' +
        esc(option[1]) + '</option>';
    }
    return h;
  }

  function enterpriseViewControlsHtml(prefix, includeGroup) {
    const view = largeListViews.work;
    let h = '<div class="enterprise-view-controls" data-enterprise-view-controls="' +
      esc(prefix) + '">';
    if (includeGroup) {
      h += '<label><span>' + esc(FB.T('Group enterprises')) + '</span><select ' +
        'data-enterprise-group><option value="none"' +
        (view.enterpriseGroup === 'none' ? ' selected' : '') + '>' +
        esc(FB.T('No grouping')) + '</option><option value="category"' +
        (view.enterpriseGroup === 'category' ? ' selected' : '') + '>' +
        esc(FB.T('Farming, Craft, and Trade')) +
        '</option><option value="settlement"' +
        (view.enterpriseGroup === 'settlement' ? ' selected' : '') + '>' +
        esc(FB.T('Settlement')) + '</option></select></label>';
    }
    h += '<label><span>' + esc(FB.T('Enterprise order')) + '</span><select ' +
      'data-enterprise-sort>' + enterpriseSortOptions(view.enterpriseSort) +
      '</select></label></div>';
    return h;
  }

  function wireEnterpriseViewControls(prefix, onChange) {
    const root = $('gm-body').querySelector(
      '[data-enterprise-view-controls="' + prefix + '"]');
    if (!root) return;
    const group = root.querySelector('[data-enterprise-group]');
    const sort = root.querySelector('[data-enterprise-sort]');
    if (group) group.addEventListener('change', function () {
      largeListViews.work.enterpriseGroup = group.value;
      onChange();
    });
    if (sort) sort.addEventListener('change', function () {
      largeListViews.work.enterpriseSort = sort.value;
      onChange();
    });
  }

  function enterpriseTransferRule() {
    return FB.T('Passes to heirs as family property; does not follow conquest');
  }

  UI.showFamilyAmbition = function (cid, returnContext, replaceView) {
    const s = FB.state;
    const c = s && s.chars[cid];
    const ambition = c && FB.familyAmbitionSnapshot
      ? FB.familyAmbitionSnapshot(s, cid) : null;
    if (!c || !ambition) return;
    const progress = Math.max(0, Number(ambition.progress) || 0);
    let h = UI.charCardHtml(s, c) +
      kv('Personal ambition', esc(FB.familyAmbitionLabel(s, cid))) +
      kv('Your guidance', esc(FB.familyAmbitionGuidanceLabel(
        ambition.guidance))) +
      kv('Encouraged progress', esc(FB.T('{progress} of 3', {
        progress:progress
      }))) +
      '<p class="hint">' + esc(FB.T(
        'Encouragement gives this family member a yearly chance to gain the skill tied to the goal. Steering them away replaces the goal immediately; leaving it alone preserves their own agency.')) +
      '</p><div class="gm-list">' +
      '<button class="actionbtn" data-family-guidance="encouraged">' +
      esc(FB.T('Encourage this ambition')) +
      '<span class="adesc">' + esc(FB.T(
        'Back this road with the family’s attention.')) + '</span></button>' +
      '<button class="actionbtn" data-family-guidance="neutral">' +
      esc(FB.T('Leave the choice to them')) +
      '<span class="adesc">' + esc(FB.T(
        'Offer no continuing direction.')) + '</span></button>' +
      '<button class="actionbtn" data-family-guidance="discouraged">' +
      esc(FB.T('Steer them toward another road')) +
      '<span class="adesc">' + esc(FB.T(
        'Replace this ambition without choosing the replacement yourself.')) +
      '</span></button></div><div class="gm-footer"><button class="btn" ' +
      'id="gm-cancel">' + esc(FB.T('Back')) + '</button></div>';
    openModal(FB.T('Ambition of {name}', { name:c.name }), h, {
      historyView:!replaceView,
      replaceView:!!replaceView,
      noFocus:true,
      historyBackRender:function () {
        UI.showCharModal(cid, returnContext && returnContext.returnContext);
      }
    });
    FB.paintFaces($('gm-body'), s);
    document.querySelectorAll('[data-family-guidance]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (!FB.setFamilyAmbitionGuidance(
            s, cid, button.dataset.familyGuidance)) return;
        UI.showFamilyAmbition(cid, returnContext, true);
        UI.refresh();
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      modalHistoryBack(function () {
        UI.showCharModal(cid, returnContext && returnContext.returnContext);
      });
    });
  };

  UI.showFamilyOffice = function (cid, returnContext) {
    const s = FB.state;
    const c = s && s.chars[cid];
    if (!c || !FB.isAgencyFamilyMember ||
        !FB.isAgencyFamilyMember(s, cid)) return;
    const current = FB.familyOfficeRecord(s, cid);
    let h = UI.charCardHtml(s, c) + '<p class="hint">' + esc(FB.T(
      'Family offices are unpaid duties. The holder keeps their occupation, but leaves enterprise work while serving. One person and one holder per office.')) +
      '</p><div class="gm-list">';
    for (const office in FBDATA.positions) {
      const def = FBDATA.positions[office];
      if (!def || def.kind !== 'retainer') continue;
      const retainer = FB.retainerOfficeRecord(s, office);
      const familyHolder = FB.familyOfficeHolder(s, office);
      const occupied = retainer
        ? s.chars[retainer.charId] : familyHolder;
      const already = current && current.office === office;
      const eligible = already || FB.canAppointFamilyOffice(s, office, cid);
      let reason = '';
      if (already) reason = FB.T('This is their current household office.');
      else if (current) reason = FB.T(
        'Relieve them of {office} before assigning another office.', {
          office:positionName(s, current.office)
        });
      else if (occupied) reason = FB.T('Already held by {name}.', {
        name:occupied.name
      });
      else if (s.player.tier < (def.minTier || 0)) {
        reason = FB.T('Requires station {station}.', {
          station:FB.stationName(def.minTier || 0)
        });
      } else if (def.maleOnly && c.sex !== 'm') {
        reason = FB.T('This office is restricted by the realm’s custom.');
      } else {
        reason = FB.T('Requires the {career} occupation.', {
          career:FBDATA.careers[def.profession]
            ? dt(s, 'career', def.profession,
              FBDATA.careers[def.profession], 'name') : def.profession
        });
      }
      h += '<button class="actionbtn" data-family-office="' + esc(office) + '"' +
        (!eligible || already ? ' disabled' : '') + '>' +
        esc(def.icon + ' ' + positionName(s, office)) +
        '<span class="adesc">' + esc(positionDesc(s, office)) + ' ' +
        esc(eligible && !already
          ? (positionEffectText(office) || FB.T('Provides its listed household benefit.'))
          : reason) + '</span></button>';
    }
    if (current) {
      h += '<button class="actionbtn danger" id="family-office-remove">' +
        esc(FB.T('Relieve them of {office}', {
          office:positionName(s, current.office)
        })) + '<span class="adesc">' + esc(FB.T(
          'The office becomes vacant. This spends the day.')) +
        '</span></button>';
    }
    h += '</div><div class="gm-footer"><button class="btn" id="gm-cancel">' +
      esc(FB.T('Back')) + '</button></div>';
    openModal(FB.T('Household office for {name}', { name:c.name }), h, {
      historyView:true,
      noFocus:true,
      historyBackRender:function () {
        UI.showCharModal(cid, returnContext && returnContext.returnContext);
      }
    });
    FB.paintFaces($('gm-body'), s);
    document.querySelectorAll('[data-family-office]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (!FB.appointFamilyOffice(s, button.dataset.familyOffice, cid)) return;
        UI.closeModal();
        FB.game.passDay({ skipFocus:true });
        resumeManagementAfterDay(returnContext);
      });
    });
    const remove = $('family-office-remove');
    if (remove) remove.addEventListener('click', function () {
      if (!FB.removeFamilyOffice(s, cid)) return;
      UI.closeModal();
      FB.game.passDay({ skipFocus:true });
      resumeManagementAfterDay(returnContext);
    });
    $('gm-cancel').addEventListener('click', function () {
      modalHistoryBack(function () {
        UI.showCharModal(cid, returnContext && returnContext.returnContext);
      });
    });
  };

  UI.showRetainerHire = function (returnContext) {
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
      const occupied = FB.retainerOfficeRecord(s, id) ||
        (FB.familyOfficeHolder && FB.familyOfficeHolder(s, id));
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
    openModal(FB.T('🗝 Hire a Retainer'), h,
      returnsToInteractionManagement(returnContext) ? {
        historyView:true,
        historyBackRender:function () {
          interactionReturn(returnContext);
        }
      } : undefined);
    document.querySelectorAll('[data-retainer-office]').forEach(function (button) {
      button.addEventListener('click', function () {
        UI.showRetainerCandidates(button.dataset.retainerOffice,
          returnContext);
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      if (returnsToInteractionManagement(returnContext)) {
        modalHistoryBack(function () {
          interactionReturn(returnContext);
        });
      } else {
        UI.closeModal();
      }
    });
  };

  UI.showRetainerCandidates = function (office, returnContext) {
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
      if (FB.retainerOfficeRecord(s, office) ||
          (FB.familyOfficeHolder && FB.familyOfficeHolder(s, office))) {
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
        resumeManagementAfterDay(returnContext);
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      UI.showRetainerHire(returnContext);
    });
  };

  UI.showRetainerManage = function (cid, returnContext) {
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
      '<label class="automation-protection"><input type="checkbox" ' +
      'id="staffing-worker-protection"' +
      (FB.isProtected(s, 'staffingWorker', cid) ? ' checked' : '') + '> <span>' +
      esc(FB.T('Reserve this person from the staffing assistant')) + '</span>' +
      '<span class="adesc">' + esc(FB.T(
        'Their current enterprise assignment will be preserved, or they will remain available only for manual assignment.')) +
      '</span></label><div class="gm-list"><button class="actionbtn" id="retainer-career">🧰 ' +
      esc(FB.T('Change occupation or training…')) + '<span class="adesc">' +
      esc(FB.T('The household office remains an additive appointment.')) +
      '</span></button><button class="actionbtn danger" id="retainer-dismiss">' +
      esc(FB.T('Dismiss from household service…')) + '<span class="adesc">' +
      esc(FB.T('The retainer leaves immediately and remembers the slight.')) +
      '</span></button></div><button class="btn" id="gm-cancel">' +
      esc(FB.T('Back')) + '</button>';
    openModal(FB.T('Service of {name}', { name:c.name }), h,
      returnsToInteractionManagement(returnContext) ? {
        historyView:true,
        historyBackRender:function () {
          interactionReturn(returnContext);
        }
      } : undefined);
    FB.paintFaces($('gm-body'), s);
    $('staffing-worker-protection').addEventListener('change', function (event) {
      FB.setProtected(s, 'staffingWorker', cid, event.target.checked);
    });
    $('retainer-career').addEventListener('click', function () {
      UI.showCareerPicker(cid, {
        view:'retainer',
        characterId:cid,
        returnContext:returnContext
      });
    });
    $('retainer-dismiss').addEventListener('click', function () {
      UI.showRetainerDismiss(cid, returnContext);
    });
    $('gm-cancel').addEventListener('click', function () {
      if (returnsToInteractionManagement(returnContext)) {
        modalHistoryBack(function () {
          interactionReturn(returnContext);
        });
      } else {
        UI.closeModal();
      }
    });
  };

  UI.showRetainerDismiss = function (cid, returnContext) {
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
    $('gm-cancel').addEventListener('click', function () {
      UI.showRetainerManage(cid, returnContext);
    });
  };

  UI.showLivelihoods = function (returnContext, replaceView) {
    if (returnContext && typeof returnContext.preventDefault === 'function') {
      returnContext = null;
    }
    const s = FB.state;
    const me = s.chars[s.player.charId];
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      s.player.tier >= 3
        ? 'Your former calling remains part of your story, but the household now performs the daily work. Apprentices learn until sixteen; staffed enterprises pay each season.'
        : 'The household’s work feeds the purse. Apprentices learn until sixteen; staffed enterprises pay each season.')) +
      '</p><p class="hint">' + esc(FB.T(
        'This list covers the playable head, resident spouses and descendants, unwed siblings living with the household, and hired household retainers. Visible relatives living outside the managed household cannot be assigned here. Each unavailable row names the age, station, faith, or household rule that blocks it.')) +
      '</p></div>';
    const enterprises = sortedEnterpriseRecords(s, FB.enterpriseList(s).slice());
    const assignments = {};
    for (const enterprise of enterprises) {
      if (!enterprise.workerId) continue;
      const def = FBDATA.enterprises[enterprise.type];
      if (!assignments[enterprise.workerId]) assignments[enterprise.workerId] = [];
      assignments[enterprise.workerId].push(def
        ? dt(s, 'enterprise', enterprise.type, def, 'name')
        : enterprise.type);
    }

    const workModels = [];
    let workIndex = 0, workAttention = 0, workAssigned = 0, workUnavailable = 0;
    for (const c of FB.householdWorkers(s)) {
      const age = FB.ageOf(c, s.date.year);
      if (age < 10) continue;
      const career = FB.careerOf(s, c);
      const def = career && FBDATA.careers[career.profession];
      const retainer = FB.retainerRecord(s, c.id);
      const familyOffice = FB.familyOfficeRecord &&
        FB.familyOfficeRecord(s, c.id);
      const landedSelf = c.id === me.id && s.player.tier >= 3;
      const choices = FB.careerChoices(s, c);
      const missingChoice = !career || !def || career.rank === 'unassigned';
      const attention = missingChoice && choices.length > 0 && !landedSelf;
      const unavailable = landedSelf || (missingChoice && !choices.length);
      let state = 'assigned';
      let stateLabel = FB.T('Assigned');
      let detail = '';
      if (attention) {
        state = 'available';
        stateLabel = age < 16
          ? FB.T('Apprenticeship needed') : FB.T('Work choice needed');
        detail = FB.T('Choose an available calling.');
        workAttention++;
      } else if (unavailable) {
        state = 'unavailable';
        stateLabel = landedSelf ? FB.T('Former calling') : FB.T('Unavailable');
        detail = landedSelf
          ? FB.T('A landed ruler keeps this calling as life history.')
          : FB.T('No career choice is currently available under the existing age, station, faith, and household rules.');
        workUnavailable++;
      } else {
        workAssigned++;
      }
      const roles = [];
      if (c.id === me.id) {
        roles.push(FB.T('Household head'));
      } else {
        const relationship = relationText(s, c);
        if (relationship) roles.push(relationship);
        else if (!retainer) roles.push(FB.T('Resident family'));
      }
      if (retainer) roles.push(positionName(s, retainer.office));
      if (familyOffice) roles.push(positionName(s, familyOffice.office));
      if (c.id === me.id) {
        for (const positionId of FB.playerPositionIds(s)) {
          roles.push(positionName(s, positionId));
        }
      }
      const religious = FB.religiousRankTitleReadOnly &&
        FB.religiousRankTitleReadOnly(s, c);
      if (religious) roles.push(religious);
      const workNames = assignments[c.id] || [];
      const metadata = [
        FB.careerTitle(s, c) +
          (def && def.guild && career.guildRank !== 'none'
            ? ' · ' + FB.guildTitle(career) : ''),
        roles.join(' · ')
      ];
      if (def && def.guild && career.guildRank !== 'none') {
        metadata.push(FB.T(
          'Guild Standing {standing} · +{gain} per active vocational year · maximum {maximum}', {
            standing:Math.round(career.guildStanding || 0),
            gain:FBDATA.balance.guildStandingYearlyGain !== undefined
              ? FBDATA.balance.guildStandingYearlyGain : 5,
            maximum:FBDATA.balance.guildStandingMax !== undefined
              ? FBDATA.balance.guildStandingMax : 100
          }));
      }
      if (workNames.length) {
        metadata.push(FB.T('Enterprise: {enterprise}', {
          enterprise:workNames.join(', ')
        }));
      }
      if (detail) metadata.push(detail);
      const attrs = largeListRowAttrs({
        attention:attention,
        states:[state, 'person'],
        identity:c.id,
        focusKey:'work-person-' + c.id
      });
      const html = '<button type="button" class="actionbtn large-list-row ' +
        'large-list-person-row" data-career="' + esc(c.id) + '"' + attrs + '>' +
        '<span class="large-list-row-main">' + FB.faceTag(c, 34, 40) +
        '<span class="large-list-row-copy"><span class="large-list-row-title">' +
        esc(c.id === me.id ? FB.T('{name} (you)', { name:c.name }) : c.name) +
        '</span><span class="adesc">' + esc(metadata.join(' · ')) +
        '</span></span></span>' + largeListStateLabel(stateLabel, attention) +
        '</button>';
      workModels.push({
        html:html, attention:attention, priority:attention ? 0 :
          (unavailable ? 2 : 1), index:workIndex++, identity:c.id
      });
    }
    workModels.sort(function (a, b) {
      return a.priority - b.priority || a.index - b.index ||
        String(a.identity).localeCompare(String(b.identity));
    });
    const workSummary = kv('Can work or train',
      esc(String(workAssigned + workAttention))) +
      kv('Need a choice', esc(String(workAttention))) +
      kv('Settled careers or offices', esc(String(workAssigned))) +
      kv('Currently unavailable', esc(String(workUnavailable)));

    const enterpriseModels = [];
    let enterpriseIndex = 0, staffedEnterprises = 0, idleEnterprises = 0;
    let blockedEnterprises = 0, enterpriseGold = 0;
    for (const e of enterprises) {
      const def = FBDATA.enterprises[e.type];
      if (!def) continue;
      const worker = e.workerId && s.chars[e.workerId] && !s.chars[e.workerId].dead ?
        s.chars[e.workerId] : null;
      const eligible = FB.enterpriseWorkersFor(s, e);
      const remote = e.provinceId !== s.player.provinceId;
      let validWorker = false;
      for (const candidate of eligible) {
        if (worker && candidate.id === worker.id) validWorker = true;
      }
      const unresolved = !worker || !validWorker;
      const blocked = unresolved && !eligible.length;
      const attention = unresolved;
      let state = 'staffed';
      let stateLabel = FB.T('Staffed');
      let workerText;
      if (!unresolved) {
        staffedEnterprises++;
        workerText = FB.T('Worked by {name}{lock}', {
          name:worker.name,
          lock:e.workerLocked ? FB.T(' · 🔒 locked') : ''
        });
      } else if (blocked) {
        state = 'unavailable';
        stateLabel = FB.T('Blocked');
        blockedEnterprises++;
        idleEnterprises++;
        workerText = remote
          ? FB.T('No resident worker in {place}; it remains owned but idle.', {
            place:enterprisePlace(s, e)
          })
          : (worker
            ? FB.T('{name} is no longer eligible; no replacement is available.', {
              name:worker.name
            })
            : FB.T('No eligible worker is available.'));
      } else {
        state = 'idle';
        stateLabel = FB.T('Idle');
        idleEnterprises++;
        workerText = worker
          ? FB.T('{name} is no longer eligible; choose a replacement.', {
            name:worker.name
          })
          : FB.T('Idle — eligible workers are available.');
      }
      const liveYield = FB.enterpriseYield(s, e);
      enterpriseGold += liveYield;
      const attrs = largeListRowAttrs({
        attention:attention,
        states:[state, 'enterprise'],
        identity:e.uid,
        focusKey:'work-enterprise-' + e.uid
      });
      const html = '<button type="button" class="actionbtn large-list-row ' +
        'large-list-enterprise-row" data-enterprise="' + esc(e.uid) + '"' +
        attrs + '><span class="large-list-row-main">' +
        '<span class="large-list-enterprise-icon" aria-hidden="true">' +
        esc(def.icon) + '</span><span class="large-list-row-copy">' +
        '<span class="large-list-row-title">' +
        esc(dt(s, 'enterprise', e.type, def, 'name')) +
        '</span><span class="adesc">' + esc(FB.T(
          '{worker} · {place} · base value {money:value} · about {money:amount}/season{lock}', {
            worker:workerText,
            place:enterprisePlace(s, e),
            value:def.cost,
            amount:Math.round(liveYield * 10) / 10,
            lock:e.workerLocked && unresolved ? FB.T(' · 🔒 lock recorded') : ''
          })) + '</span></span></span>' +
        largeListStateLabel(stateLabel, attention) + '</button>';
      enterpriseModels.push({
        html:html, attention:attention,
        priority:state === 'idle' ? 0 : (state === 'unavailable' ? 1 : 2),
        index:enterpriseIndex++, identity:e.uid,
        groupKey:def.profession || 'other',
        groupLabel:enterpriseCategoryName(def.profession),
        settlementKey:e.provinceId + '-' + e.settlement,
        settlementLabel:enterprisePlace(s, e)
      });
    }

    const enterpriseSummary =
      kv('Owned enterprises', esc(String(enterpriseModels.length))) +
      kv('Staffed', esc(String(staffedEnterprises))) +
      kv('Idle', esc(String(idleEnterprises))) +
      kv('Blocked from staffing', esc(String(blockedEnterprises))) +
      kv('Approximate current seasonal yield',
        esc(FB.money(Math.round(enterpriseGold * 10) / 10)));
    let enterpriseFooter = '';
    if (idleEnterprises) {
      enterpriseFooter += '<button class="actionbtn" id="enterprise-staffing-preview">⚙ ' +
        esc(FB.T('Staff all idle enterprises…')) +
        '<span class="adesc">' + esc(FB.T(
          'Review a maximum-yield assignment across every unlocked enterprise. Applying it spends no day or money.')) +
        '</span></button>';
    } else if (enterprises.length) {
      enterpriseFooter += '<div class="hint enterprise-staffing-hint">' +
        esc(FB.T('All family enterprises are staffed.')) + '</div>';
    }
    const settlements = FB.settlementsOf(s, s.player.provinceId);
    for (let i = 0; i < settlements.length; i++) {
      if (!FB.enterpriseAvailable(s, i, true).length) continue;
      enterpriseFooter += '<button class="actionbtn" data-enterprise-settlement="' + i + '">🏪 ' +
        esc(FB.T('Open an enterprise in {settlement}…', { settlement:settlements[i].name })) +
        '<span class="adesc">' + esc(FB.T('Buy productive property; further copies of one kind cost more.')) +
        '</span></button>';
    }
    const enterpriseSections = [];
    const groupMode = largeListViews.work.enterpriseGroup;
    if (groupMode === 'none' || !enterpriseModels.length) {
      enterpriseSections.push({
        id:'family-enterprises', title:FB.T('Family enterprises'),
        rows:enterpriseModels, footer:enterpriseFooter,
        empty:FB.T('No enterprise yet. Open one in a settlement below.')
      });
    } else {
      const groups = {}, groupOrder = [];
      for (const model of enterpriseModels) {
        const key = groupMode === 'category' ? model.groupKey : model.settlementKey;
        if (!groups[key]) {
          groups[key] = {
            id:'family-enterprises-' + groupMode + '-' + key,
            title:groupMode === 'category' ? model.groupLabel : model.settlementLabel,
            rows:[]
          };
          groupOrder.push(key);
        }
        groups[key].rows.push(model);
      }
      for (const key of groupOrder) enterpriseSections.push(groups[key]);
      enterpriseSections[enterpriseSections.length - 1].footer = enterpriseFooter;
    }
    const workSections = [{
      id:'household-work',
      title:FB.T('Household work'),
      summary:workSummary,
      rows:workModels,
      empty:FB.T('No household member is currently old enough to work or train.')
    }].concat(enterpriseSections);
    h += '<div class="enterprise-list-summary">' + enterpriseSummary + '</div>' +
      enterpriseViewControlsHtml('work', true) +
      largeListSurfaceHtml('work', workSections, [
      { id:'all', label:FB.T('All') },
      { id:'attention', label:FB.T('Needs attention') },
      { id:'assigned', label:FB.T('Assigned') },
      { id:'staffed', label:FB.T('Staffed') },
      { id:'idle', label:FB.T('Idle') },
      { id:'unavailable', label:FB.T('Unavailable') }
    ]);
    h += '<div class="gm-footer"><button class="btn" id="work-guide">' +
      esc(FB.T('Guide: work and family scope')) +
      '</button><button class="btn" id="gm-cancel">' +
      esc(FB.T('Close')) + '</button></div>';
    const modalOptions = householdPlanHistoryOptions(returnContext) || {};
    modalOptions.modalClass = 'large-list-modal work-list-modal';
    modalOptions.replaceView = !!replaceView;
    openModal(FB.T('🧰 Work & Enterprises'), h, modalOptions);
    FB.paintFaces($('gm-body'), s);
    initLargeListSurface('work', { restoreFocus:true });
    wireEnterpriseViewControls('work', function () {
      UI.showLivelihoods(returnContext, true);
    });
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
    $('work-guide').addEventListener('click', function () {
      UI.showGuideEntry('family-scopes');
    });
    $('gm-cancel').addEventListener('click', function () {
      finishHouseholdPlanReturn(returnContext, UI.closeModal);
    });
  };

  UI.showCareerPicker = function (cid, returnContext) {
    const s = FB.state;
    const c = s.chars[cid];
    if (!c || c.dead || FB.ageOf(c, s.date.year) < 10) return;
    if (!FB.isHouseholdCharacter(s, cid) &&
        !(FB.manageableKinKind && FB.manageableKinKind(s, cid))) return;
    const age = FB.ageOf(c, s.date.year);
    const career = FB.careerOf(s, c);
    const activeCareerDef = career && FBDATA.careers[career.profession];
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
      const resumeDetail = item.resuming
        ? FB.T('Resume {rank}; guild rank {guild}; Guild Standing {standing}. No new apprenticeship fee.', {
          rank:item.restoredSpecialization && item.def.specializations &&
            item.def.specializations[item.restoredSpecialization]
            ? dt(s, 'career', item.id, item.def,
              'specializations.' + item.restoredSpecialization + '.name')
            : item.def.ranks && item.def.ranks[item.restoredRank]
            ? dt(s, 'career', item.id, item.def,
              'ranks.' + item.restoredRank)
            : item.restoredRank,
          guild:FB.guildTitle({ guildRank:item.restoredGuildRank }),
          standing:item.restoredStanding
        })
        : '';
      h += '<button class="actionbtn" data-career-choice="' + item.id + '"' +
        (same || short ? ' disabled' : '') + '>' +
        esc(item.def.icon + ' ' + dt(s, 'career', item.id, item.def, 'name') +
          (item.cost ? FB.T(' — {money:gold}', { gold:item.cost }) : '')) +
        '<span class="adesc">' + esc(dt(s, 'career', item.id, item.def, 'desc')) +
        (resumeDetail ? ' ' + esc(resumeDetail) : '') +
        (same ? ' ' + esc(FB.T('(current)')) : short ? ' ' + esc(FB.T('(not enough money)')) : '') +
        '</span></button>';
    }
    if (activeCareerDef && activeCareerDef.learned && activeCareerDef.license) {
      const license = activeCareerDef.license;
      const licenseSkills = [];
      for (const skill in (license.skills || {})) {
        licenseSkills.push(FB.T('{skill} {value}', {
          skill:FB.skillName(skill), value:license.skills[skill]
        }));
      }
      if (activeCareerDef.requiresTech) {
        licenseSkills.push(techRequirementText(s,
          activeCareerDef.requiresTech));
      }
      h += '</div><div class="panelh">' + esc(FB.T('Learned career path')) +
        '</div><div class="gm-body-text"><p>' + esc(FB.T(
          'Trainee → {license} from age {age}, after {years} vocational years, Lettered, and {requirements}.', {
            license:dt(s, 'career', career.profession, activeCareerDef,
              'license.name'),
            age:Math.max(16, Number(license.age) || 0),
            years:license.years,
            requirements:licenseSkills.join(', ')
          })) + '</p><ul>';
      for (const specializationId in (activeCareerDef.specializations || {})) {
        const specialization = activeCareerDef.specializations[specializationId];
        const requirements = [];
        for (const skill in (specialization.skills || {})) {
          requirements.push(FB.T('{skill} {value}', {
            skill:FB.skillName(skill), value:specialization.skills[skill]
          }));
        }
        if (specialization.requiresTech) {
          requirements.push(techRequirementText(s, specialization.requiresTech));
        }
        h += '<li>' + esc(FB.T(
          '{specialization}: {years} vocational years, {requirements}.', {
            specialization:dt(s, 'career', career.profession, activeCareerDef,
              'specializations.' + specializationId + '.name'),
            years:specialization.years,
            requirements:requirements.join(', ')
          })) + '</li>';
      }
      h += '</ul></div><div class="gm-list">';
    }
    const careerExams = FB.careerExamOptions ?
      FB.careerExamOptions(s, c) : [];
    for (const exam of careerExams) {
      const label = exam.specialization
        ? FB.T('Qualify as {rank}', { rank:exam.name })
        : FB.T('Attempt {examination}', { examination:exam.name });
      h += '<button class="actionbtn" data-career-exam="' +
        esc(exam.id) + '"' + (exam.ready ? '' : ' disabled') + '>📚 ' +
        esc(FB.T('{examination} — {chance}% ({money:gold})', {
          examination:label, chance:Math.round(exam.chance * 100),
          gold:exam.cost
        })) + '<span class="adesc">' + esc(exam.ready
          ? FB.T('The fee is spent on the attempt. Failure requires waiting {days} days before another professional examination.', {
            days:FBDATA.balance.careerExamCooldownDays || 360
          })
          : FB.T('Unmet: {requirements}', {
            requirements:exam.missing.join('; ')
          })) + '</span></button>';
    }
    const step = FB.guildAdvance(s, c);
    const activeGuildElection = FB.activeElectionForCharacter &&
      FB.activeElectionForCharacter(s, c.id);
    if (activeGuildElection) {
      const electionDef = FBDATA.elections[activeGuildElection.definitionId] || {};
      h += '<button class="actionbtn" id="career-election">🗳 ' +
        esc(FB.T('Manage active election — {office}', {
          office:dt(s, 'election', activeGuildElection.definitionId,
            electionDef, 'name')
        })) + '<span class="adesc">' + esc(FB.T(
          'Review the electorate, candidates, term, support, and campaign approach.')) +
        '</span></button>';
    } else if (step) {
      const blocked = step.blocked || s.player.gold < step.cost;
      const guildRequirements = [
        FB.T('Stewardship {value}', { value:step.need })
      ];
      if (step.prestige) guildRequirements.push(FB.T('{prestige} prestige', {
        prestige:step.prestige
      }));
      if (step.learning) {
        guildRequirements.push(FB.T('Lettered'));
        guildRequirements.push(FB.T('Learning {value}', {
          value:step.learning
        }));
      }
      const guildMissing = step.missing && step.missing.length
        ? step.missing.slice() : guildRequirements.slice();
      if (s.player.gold < step.cost) {
        guildMissing.push(FB.T('Requires {money:gold}; you have {money:current}.', {
          gold:step.cost, current:Math.floor(s.player.gold)
        }));
      }
      h += '<button class="actionbtn" id="career-guild"' + (blocked ? ' disabled' : '') + '>🏅 ' +
        esc(step.election
          ? FB.T('Stand for election as {rank} ({money:gold})', {
            rank:FB.guildTitle({ guildRank:step.to }), gold:step.cost
          })
          : FB.T('Seek the next guild rank — {rank} ({money:gold})', {
          rank:FB.guildTitle({ guildRank:step.to }), gold:step.cost
        })) + '<span class="adesc">' +
        esc(blocked
          ? FB.T('Unmet: {requirements}', {
            requirements:guildMissing.join('; ')
          })
          : (step.election
            ? FB.T('A vacancy, visible constituencies, one campaign approach, a recorded result, and a protected fixed term replace automatic promotion.')
            : FB.T('Guild standing brings commissions, enterprise access, and better profits.'))) +
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
    const historyOptions = livelihoodsHistoryOptions(returnContext);
    if (returnsToHouseholdPlan(returnContext)) {
      historyOptions.historyBackRender = function () { UI.showHouseholdPlan(); };
    } else if (returnsToInteractionManagement(returnContext)) {
      historyOptions.historyBackRender = function () {
        interactionReturn(returnContext);
      };
    }
    openModal(landedSelf
      ? FB.T('Former calling of {name}', { name:c.name })
      : FB.T('Work of {name}', { name:c.name }), h, historyOptions);
    document.querySelectorAll('[data-career-choice]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!FB.beginCareer(s, c, b.dataset.careerChoice)) return;
        UI.closeModal();
        FB.game.passDay({ skipFocus:true });
        resumeManagementAfterDay(returnContext, function () {
          UI.showLivelihoods();
        });
      });
    });
    document.querySelectorAll('[data-career-exam]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!FB.takeCareerExam(s, c, b.dataset.careerExam)) return;
        UI.closeModal();
        FB.game.passDay({ skipFocus:true });
        resumeManagementAfterDay(returnContext, function () {
          UI.showCareerPicker(cid, returnContext);
        });
      });
    });
    const guild = $('career-guild');
    if (guild) guild.addEventListener('click', function () {
      const result = FB.takeGuildStep(s, c);
      if (!result) return;
      UI.closeModal();
      FB.game.passDay({ skipFocus:true });
      resumeManagementAfterDay(returnContext, function () {
        if (result && result.kind === 'guild') {
          UI.showElection({
            view:'career', cid:cid, returnContext:returnContext
          });
        } else UI.showCareerPicker(cid, returnContext);
      });
    });
    const election = $('career-election');
    if (election) election.addEventListener('click', function () {
      UI.showElection({
        view:'career', cid:cid, returnContext:returnContext
      });
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
      resumeManagementAfterDay(returnContext, function () {
        UI.showCareerPicker(cid, returnContext);
      });
    });
    const cardinal = $('career-cardinal');
    if (cardinal) cardinal.addEventListener('click', function () {
      UI.showCardinalPetition(c.id, returnContext);
    });
    $('gm-cancel').addEventListener('click', function () {
      finishManagementReturn(returnContext, function () {
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
      resumeManagementAfterDay(returnContext, function () {
        UI.showCareerPicker(cid, returnContext);
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      finishHouseholdPlanReturn(returnContext, function () {
        UI.showCareerPicker(cid, returnContext);
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
      resumeManagementAfterDay(returnContext, function () {
        UI.showCareerPicker(cid, returnContext);
      });
    }
    const merit = $('bishop-merit');
    if (merit) merit.addEventListener('click', function () { petition(false); });
    const endow = $('bishop-endow');
    if (endow) endow.addEventListener('click', function () { petition(true); });
    $('gm-cancel').addEventListener('click', function () {
      finishHouseholdPlanReturn(returnContext, function () {
        UI.showCareerPicker(cid, returnContext);
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
        UI.showCareerPicker(cid, returnContext);
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
    for (const item of FB.enterpriseAvailable(s, settlement, true)) {
      const short = s.player.gold < item.cost;
      const preview = {
        provinceId:s.player.provinceId,
        settlement:settlement
      };
      if (item.techLocked) {
        const techId = firstMissingTech(s, item.def.requiresTech);
        const canReviewTechnology = FB.techUiRelevant(s);
        h += '<button class="actionbtn tech-locked-link"' +
          (canReviewTechnology
            ? ' data-enterprise-tech="' + esc(techId) + '"'
            : ' disabled') + '>' +
          esc(FB.T('{icon} {name}', {
            icon:item.def.icon, name:dt(s, 'enterprise', item.id, item.def, 'name')
          })) + '<span class="adesc">' +
          esc(dt(s, 'enterprise', item.id, item.def, 'desc')) + ' ' +
          esc(techRequirementText(s, item.def.requiresTech)) +
          (canReviewTechnology
            ? ' ' + esc(FB.T('Open the technology entry.')) : '') +
          '</span></button>';
        continue;
      }
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
      livelihoodsHistoryOptions(returnContext));
    document.querySelectorAll('[data-enterprise-buy]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!FB.buyEnterprise(s, b.dataset.enterpriseBuy, settlement)) return;
        UI.closeModal();
        FB.game.passDay({ skipFocus:true });
        resumeManagementAfterDay(returnContext, function () {
          UI.showLivelihoods(returnContext);
        });
      });
    });
    document.querySelectorAll('[data-enterprise-tech]').forEach(function (b) {
      b.addEventListener('click', function () {
        UI.showTechDetail(b.dataset.enterpriseTech);
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      finishLivelihoodsReturn(returnContext);
    });
  };

  UI.showEnterpriseManage = function (uid, returnContext, replaceView) {
    const s = FB.state;
    largeListViews.work.focusKey = 'work-enterprise-' + uid;
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
    for (const c of FB.enterpriseWorkersFor(s, e)) {
      const current = workerAssignment(c.id);
      const preview = {
        type:e.type, provinceId:e.provinceId, settlement:e.settlement,
        workerId:c.id
      };
      h += personAssignmentCard({
        person:c,
        selected:e.workerId === c.id,
        eligibility:e.workerId === c.id
          ? (FB.isProtected(s, 'staffingWorker', c.id)
            ? FB.T('Currently assigned and reserved from the staffing assistant')
            : FB.T('Currently assigned'))
          : (FB.isProtected(s, 'staffingWorker', c.id)
            ? FB.T('Reserved from the staffing assistant; manual choice remains available')
            : FB.T('Eligible worker')),
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
      h += '<button type="button" class="btn small staffing-worker-protection" ' +
        'data-staffing-worker-protection="' + esc(c.id) +
        '" aria-pressed="' +
        (FB.isProtected(s, 'staffingWorker', c.id) ? 'true' : 'false') + '">' +
        esc(FB.isProtected(s, 'staffingWorker', c.id)
          ? FB.T('Allow staffing assistant')
          : FB.T('Reserve from staffing assistant')) + '</button>';
    }
    h += '<button class="actionbtn" data-enterprise-worker="">' +
      (e.workerId ? '○ ' : '◉ ') + esc(FB.T('Leave it idle')) +
      '<span class="adesc">' + esc(FB.T('An idle enterprise produces no seasonal income.')) +
      '</span></button></div><button class="btn" id="gm-cancel">' + esc(FB.T('Back')) + '</button>';
    const managementOptions = livelihoodsHistoryOptions(returnContext);
    managementOptions.replaceView = !!replaceView;
    openModal(def.icon + ' ' + dt(s, 'enterprise', e.type, def, 'name'), h,
      managementOptions);
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
    document.querySelectorAll('[data-staffing-worker-protection]').forEach(
      function (button) {
        button.addEventListener('click', function () {
          const cid = button.dataset.staffingWorkerProtection;
          FB.setProtected(s, 'staffingWorker', cid,
            !FB.isProtected(s, 'staffingWorker', cid));
          UI.showEnterpriseManage(uid, returnContext, true);
        });
      });
    document.querySelectorAll('[data-enterprise-worker]').forEach(function (b) {
      b.addEventListener('click', function () {
        FB.assignEnterprise(s, uid, b.dataset.enterpriseWorker || null);
        UI.refresh();
        finishLivelihoodsReturn(returnContext);
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      finishLivelihoodsReturn(returnContext);
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
      reserved:'🔒 ' + FB.T('Reserved'),
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
    if (row.status === 'reserved') {
      return FB.T('Reserved worker; the assistant will preserve this assignment.');
    }
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
      'Review the complete result before applying it. Locked pairings and reserved workers stay fixed; every other enterprise and eligible household worker may be rebalanced. Applying it spends no day or money.')) +
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
          (row.status === 'locked' || row.status === 'reserved'
            ? 'locked' : '')) + '">' +
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
    const options = livelihoodsHistoryOptions(returnContext);
    options.modalClass = 'enterprise-staffing-modal';
    options.replaceView = !!notice;
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
      finishLivelihoodsReturn(returnContext);
    });
    $('enterprise-staffing-back').addEventListener('click', function () {
      finishLivelihoodsReturn(returnContext);
    });
  };

  /* ================= national technology ================= */
  const techCatalogueView = { domain:'all', status:'all', query:'' };

  function techDomainName(id) {
    const def = FBDATA.techDomains && FBDATA.techDomains[id];
    return def && FB.state
      ? FB.dataText(FB.state, FB.state.player.charId, 'techDomain', id, def, 'name', {})
      : id;
  }

  function techDomainIds() {
    return Object.keys(FBDATA.techDomains || {}).sort(function (a, b) {
      const ad = FBDATA.techDomains[a] || {};
      const bd = FBDATA.techDomains[b] || {};
      const ao = isFinite(Number(ad.order)) ? Number(ad.order) : Number.MAX_VALUE;
      const bo = isFinite(Number(bd.order)) ? Number(bd.order) : Number.MAX_VALUE;
      return ao - bo || (a < b ? -1 : a > b ? 1 : 0);
    });
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
    for (const domain of techDomainIds()) {
      h += '<option value="' + esc(domain) + '"' +
        (selected === domain ? ' selected' : '') + '>' +
        esc(FB.T('{domain} first', { domain:techDomainName(domain) })) + '</option>';
    }
    return h;
  }

  function techTraditionName(id) {
    const def = FBDATA.techTraditions && FBDATA.techTraditions[id];
    return def && FB.state
      ? FB.dataText(FB.state, FB.state.player.charId, 'techTradition', id, def, 'name', {})
      : id;
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
      movement:FB.T('overland army movement speed'),
      seaMovement:FB.T('sea-crossing speed'),
      education:FB.T('education success chance'),
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
    if (fx.devCap) out.push(FB.T(
      '+{amount} to every county’s development ceiling in the nation, above the base of 10', {
        amount:fx.devCap
      }));
    if (fx.research) out.push(FB.T('+{amount} research each season', {
      amount:researchNumber(fx.research)
    }));
    if (fx.domain) out.push(FB.T('+{amount} domain capacity', { amount:fx.domain }));
    if (fx.seaTransport) out.push(FB.T(
      'Sea transport capacity: up to {capacity} per crossing cycle.', {
        capacity:menText(FB.state, fx.seaTransport)
      }));
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

    for (const careerId in (FBDATA.careers || {})) {
      const career = FBDATA.careers[careerId];
      for (const specializationId in (career.specializations || {})) {
        const specialization = career.specializations[specializationId];
        if (!techRequiresId(specialization.requiresTech, id)) continue;
        const careerName = dt(s, 'career', careerId, career, 'name');
        const specializationName = dt(s, 'career', careerId, career,
          'specializations.' + specializationId + '.name');
        add('career-specialization:' + careerId + ':' + specializationId,
          FB.T('Makes the {specialization} examination available in {career}.', {
            specialization:specializationName, career:careerName
          }));
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
    for (const action of (FB.instants || [])) {
      if (!action || !techRequiresId(action.requiresTech, id)) continue;
      add('action:' + action.id, FB.T('Makes the deed {content} available.', {
        content:dt(s, 'action', action.id, action, 'label')
      }));
    }
    return out;
  }

  function techPrerequisiteSummary(s, def) {
    const parts = [];
    const req = Array.isArray(def.req) ? def.req : [];
    const reqAny = Array.isArray(def.reqAny) ? def.reqAny : [];
    if (req.length) {
      parts.push(FB.T('Requires all: {technologies}.', {
        technologies:req.map(function (id) {
          return technologyName(s, id);
        }).join(', ')
      }));
    }
    if (reqAny.length) {
      parts.push(FB.T('Requires any one: {technologies}.', {
        technologies:reqAny.map(function (id) {
          return technologyName(s, id);
        }).join(', ')
      }));
    }
    return parts.join(' ');
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
    if (!FB.techUiRelevant(s)) return false;
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
        esc(techCatalogueView.query) + '" placeholder="' +
        esc(FB.T('Name, effect, or unlock')) + '"></label>' +
      '<label><span>' + esc(FB.T('Domain')) + '</span><select id="tech-domain">' +
        '<option value="all">' + esc(FB.T('All domains')) + '</option>';
    for (const domain of techDomainIds()) {
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
      const effects = techScalarEffects(item.def);
      const unlocks = techGameplayUnlocks(s, item.id, item.def);
      const prerequisites = techPrerequisiteSummary(s, item.def);
      const discovery = unlocks.concat(effects).concat(
        prerequisites ? [prerequisites] : []).join(' · ');
      const search = (name + ' ' + desc + ' ' + techDomainName(item.domain) +
        ' ' + discovery).toLowerCase();
      h += '<button class="tech-entry tech-' +
        esc(techItemStatus(item).replace(/ /g, ' tech-')) +
        '" data-tech-open="' + esc(item.id) + '" data-domain="' + esc(item.domain) +
        '" data-status="' + esc(techItemStatus(item)) + '" data-search="' + esc(search) + '">' +
        '<span class="tech-entry-icon">' + esc(item.def.icon) + '</span>' +
        '<span class="tech-entry-copy"><b>' + esc(name) + '</b><small>' +
        esc(techStatusText(item) +
          (canControlResearch && !item.completed && !item.active &&
            FB.isProtected(s, 'researchTech', item.id)
            ? ' · ' + FB.T('reserved from automatic research') : '')) + '</small>' +
        (discovery ? '<small class="tech-entry-discovery">' +
          esc(discovery) + '</small>' : '') +
        '</span><span class="tech-entry-cost">' +
        (item.completed ? '✓' : item.active ? '◉' : esc(researchNumber(item.cost))) +
        '</span></button>';
    }
    if (lastDomain !== null) h += '</section>';
    h += '</div><div class="tech-empty hidden" id="tech-empty">' +
      esc(FB.T('No technologies match these filters.')) +
      '</div><div class="gm-footer"><button class="btn" id="tech-guide">' +
      esc(FB.T('Guide: technology')) +
      '</button><button class="btn" id="gm-cancel">' +
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
    $('tech-guide').addEventListener('click', function () {
      UI.showGuideEntry('technology');
    });
    $('gm-cancel').addEventListener('click', UI.closeModal);
    applyFilters();
  };

  UI.showTechAutomation = function () {
    const s = FB.state;
    if (!s || !FB.techUiRelevant(s) || !FB.isPlayerSovereign(s)) return false;
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
    for (const domain of techDomainIds()) {
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
    if (!FB.techUiRelevant(s)) return false;
    if (!def) return UI.showTech();
    const rid = FB.techRealmId(s);
    const realm = s.realms[rid];
    const record = FB.realmTechRecord(s, rid);
    const item = FB.techCandidate(s, id, rid);
    if (!item) return UI.showTech();
    const canChoose = rid === 'player' && FB.isPlayerSovereign(s);
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
    if (canChoose && !item.completed && !item.active) {
      h += '<label class="automation-protection"><input type="checkbox" ' +
        'id="tech-auto-protection"' +
        (FB.isProtected(s, 'researchTech', id) ? ' checked' : '') +
        '> <span>' + esc(FB.T('Reserve from automatic research')) + '</span>' +
        '<span class="adesc">' + esc(FB.T(
          'Automation will skip this technology. You may still begin it manually.')) +
        '</span></label>';
    }
    h += '<div class="gm-footer">';
    if (canChoose && item.available &&
        record.active.length < FB.techSlotCount(s, rid)) {
      h += '<button class="btn primary" id="tech-start">' +
        esc(FB.T('Begin research')) + '</button>';
    }
    if (FB.canAdvocateTech(s, id)) {
      h += '<button class="btn primary" id="tech-advocate">' +
        esc(FB.T('Advocate · {money:20} · Standing −15')) + '</button>';
    }
    h += '<button class="btn" id="tech-detail-guide">' +
      esc(FB.T('Guide: technology')) +
      '</button><button class="btn" id="tech-back">' + esc(FB.T('Back')) +
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
    const protection = $('tech-auto-protection');
    if (protection) protection.addEventListener('change', function () {
      FB.setProtected(s, 'researchTech', id, this.checked);
      UI.showTechDetail(id);
    });
    const advocate = $('tech-advocate');
    if (advocate) advocate.addEventListener('click', function () {
      if (FB.advocateTech(s, id)) {
        UI.refresh();
        UI.showTechDetail(id);
      }
    });
    $('tech-detail-guide').addEventListener('click', function () {
      UI.showGuideEntry('technology');
    });
    $('tech-back').addEventListener('click', UI.showTech);
  };

  /* ================= character sheet & trait dialogs ================= */
  UI.showFriendConfirm = function (cid, returnContext) {
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
    openModal(FB.T('Name a Friend'), h, {
      historyView:true,
      historyBackRender:function () {
        UI.showCharModal(cid, returnContext);
      }
    });
    $('friend-confirm').addEventListener('click', function () {
      if (!FB.nameFriend(s, c)) return;
      UI.closeModal();
      FB.game.passDay({ skipFocus:true });
    });
    $('gm-cancel').addEventListener('click', function () {
      modalHistoryBack(function () {
        UI.showCharModal(cid, returnContext);
      });
    });
  };

  UI.showSiblingCourtshipConfirm = function (cid, returnContext) {
    const s = FB.state;
    const c = s && s.chars[cid];
    const status = c && FB.siblingCourtshipStatus(s, c);
    if (!status || !status.ready) return;
    const route = status.route === 'xwedodah'
      ? FB.T('Your shared faith recognizes xwēdōdah, so discovery does not create the illicit-courtship exposure risk.')
      : FB.T('Your faith does not recognize this union. While the courtship continues, it may be exposed once each season.');
    function modifiers(items, percent) {
      const out = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const def = FBDATA.traits[item.id];
        const value = percent ? Math.round(item.value * 100) : item.value;
        out.push(dt(s, 'trait', item.id, def, 'name') + ' ' +
          (value > 0 ? '+' : '') + value + (percent ? '%' : ''));
      }
      return out.length ? out.join(' · ') : FB.T('No trait modifier');
    }
    const h = '<p>' + esc(FB.T(
      'Make the one approach to {name}? Refusal is permanent.', {
        name:FB.fullName(c)
      })) + '</p>' +
      '<div class="decision-cost"><b>' + esc(FB.T('Your trait score')) +
      ':</b> ' + esc(status.traitScore) + ' / ' +
      esc(status.requiredTraitScore) + '<br><b>' +
      esc(FB.T('Your modifiers')) + ':</b> ' +
      esc(modifiers(status.playerModifiers, false)) + '<br><b>' +
      esc(FB.T('Their response chance')) + ':</b> ' +
      esc(Math.round(status.acceptance.chance * 100)) + '%<br><b>' +
      esc(FB.T('Their modifiers')) + ':</b> ' +
      esc(modifiers(status.targetModifiers, true)) + '<br><b>' +
      esc(FB.T('Standing contribution')) + ':</b> +' +
      esc(Math.round(status.acceptance.standingBonus * 100)) + '%</div>' +
      '<p class="muted">' + esc(route) + '</p><div class="gm-list">' +
      '<button class="actionbtn" id="sibling-approach-confirm">' +
      esc(FB.T('Make the approach')) + '</button></div>' +
      '<div class="gm-footer"><button class="btn" id="gm-cancel">' +
      esc(FB.T('Not now')) + '</button></div>';
    openModal(FB.T('An Exceptional Courtship'), h, {
      historyView:true, noFocus:true,
      historyBackRender:function () {
        UI.showCharModal(cid, returnContext);
      }
    });
    $('sibling-approach-confirm').addEventListener('click', function () {
      if (!FB.siblingCourtshipStatus(s, c).ready) return;
      UI.closeModal();
      FB.queueEvent(s, 'sibling_courtship_approach', {
        siblingTargetId:c.id,
        siblingRoute:status.route,
        siblingResponseChance:status.acceptance.chance
      });
      FB.game.passDay({ skipFocus:true });
    });
    $('gm-cancel').addEventListener('click', function () {
      modalHistoryBack(function () {
        UI.showCharModal(cid, returnContext);
      });
    });
  };

  UI.showSiblingProposalConfirm = function (cid, returnContext) {
    const s = FB.state;
    const c = s && s.chars[cid];
    const status = c && FB.siblingProposalStatus(s, c);
    if (!status || !status.ready) return;
    const consequence = status.route === 'xwedodah'
      ? FB.T('A recognized xwēdōdah wedding costs {piety} piety and {money:gold}. It creates no dowry, royal compact, or alliance.', {
        piety:status.piety, gold:status.gold
      })
      : FB.T('An irregular wedding costs {piety} piety and {prestige} prestige, lowers Common Voice by {voice} and liege Standing by {standing}, and gives both spouses Scandalous Union. It creates no dowry, royal compact, or alliance.', {
        piety:status.piety,
        prestige:status.prestige,
        voice:status.commonVoice,
        standing:status.liegeStanding
      });
    const authority = status.route === 'xwedodah' ? '' :
      (FB.faithHasSystem(s.chars[s.player.charId].religion, 'papacy', s)
        ? FB.T('You also lose 20 Papal Standing, the recognized obedience loses 8 authority, and it gains grounds to excommunicate you.')
        : FB.T('Rulers of your faith also lose 8 Standing.'));
    const h = '<p>' + esc(FB.T('Propose marriage to {name}?', {
      name:FB.fullName(c)
    })) + '</p><div class="decision-cost"><b>' +
      esc(FB.T('Acceptance chance')) + ':</b> ' +
      esc(Math.round(FB.siblingProposalChance(s, c) * 100)) + '%</div>' +
      '<p>' + esc(consequence) + '</p>' +
      (authority ? '<p>' + esc(authority) + '</p>' : '') +
      '<p class="muted">' + esc(FB.T(
        'Children of full siblings have a 20% close-kin health-risk roll; children of half siblings have 10%. Recorded close-kin ancestry raises later risk, to a 35% cap.')) +
      '</p><div class="gm-list"><button class="actionbtn" ' +
      'id="sibling-proposal-confirm">' + esc(FB.T('Ask for the vows')) +
      '</button></div><div class="gm-footer"><button class="btn" ' +
      'id="gm-cancel">' + esc(FB.T('Not now')) + '</button></div>';
    openModal(FB.T('An Exceptional Marriage'), h, {
      historyView:true, noFocus:true,
      historyBackRender:function () {
        UI.showCharModal(cid, returnContext);
      }
    });
    $('sibling-proposal-confirm').addEventListener('click', function () {
      if (!FB.siblingProposalStatus(s, c).ready) return;
      UI.closeModal();
      FB.queueEvent(s, 'sibling_proposal_made', {
        siblingTargetId:c.id
      });
      FB.game.passDay({ skipFocus:true });
    });
    $('gm-cancel').addEventListener('click', function () {
      modalHistoryBack(function () {
        UI.showCharModal(cid, returnContext);
      });
    });
  };

  function characterGiftAction(s, c, household) {
    const gift = FB.characterGiftStatus(s, c.id);
    const deliveryReason = gift.delivery && gift.delivery.pending
      ? giftDeliveryText(s, 'character', c.id)
      : (gift.delivery && gift.delivery.foreign && !gift.delivery.eligible
        ? gift.delivery.reason : '');
    let itemPossible = false;
    if (!household) {
      itemPossible = interactionGiftArmoryRefs(s).some(function (ref) {
        return !giftItemUnavailableText(
          s, ref, 'character', c.id);
      });
    }
    const enabled = gift.ready || itemPossible;
    return {
      id:'gift.character',
      group:'gift',
      label:FB.T('Offer a gift…'),
      detail:household
        ? FB.T(
          'Cash costs {money:cost} for +{standing} Standing. Household equipment remains in the shared armory. The recipient cooldown is {days} days.', {
            cost:gift.cost,
            standing:gift.standing,
            days:gift.cooldownDays
          })
        : FB.T(
          'Cash costs {money:cost} for +{standing} Standing; an eligible armory item grants its quality value. The recipient cooldown is {days} days.', {
            cost:gift.cost,
            standing:gift.standing,
            days:gift.cooldownDays
          }),
      enabled:enabled,
      blockedReason:enabled ? null : (gift.reason || deliveryReason),
      consequence:gift.delivery && gift.delivery.foreign
        ? FB.T('Standing and the cooldown begin only when the courier arrives.')
        : FB.T('Accepting one cash or item gift spends the day.'),
      route:'character-gift'
    };
  }

  function buildCharacterInteractionCard(s, cid) {
    const c = s && s.chars[cid];
    if (!c) return null;
    const me = s.chars[s.player.charId];
    const standing = FB.standingOf(s, {
      kind:'character', id:c.id
    });
    const residenceId = FB.characterResidence
      ? FB.characterResidence(s, c) : FB.homeOf(s, c);
    const residence = residenceId && FB.world.byId[residenceId];
    const reigningRealmId = FB.realmIdForRulerCharacter &&
      FB.realmIdForRulerCharacter(s, c);
    const descendantKind = FB.playerDescendantKind(s, c.id);
    const household = !c.dead && FB.isHouseholdCharacter &&
      FB.isHouseholdCharacter(s, c.id);
    const retainer = !c.dead
      ? interactionRetainerRecord(s, c.id) : null;
    const agencyFamily = !c.dead && FB.isAgencyFamilyMember &&
      FB.isAgencyFamilyMember(s, c.id);
    const familyOffice = agencyFamily && FB.familyOfficeRecord
      ? FB.familyOfficeRecord(s, c.id) : null;
    const ambition = agencyFamily && FB.familyAmbitionSnapshot
      ? FB.familyAmbitionSnapshot(s, c.id) : null;
    const relation = relationText(s, c) || (household
      ? FB.T('Your household') : FB.T('Known character'));
    const model = {
      target:{ kind:'character', id:c.id },
      context:[
        { label:FB.T('Relationship'), value:relation },
        { label:FB.T('Residence'), value:residence
          ? residence.name : FB.T('Unknown') },
        { label:FB.T('Occupation'), value:interactionCareerTitle(s, c) },
        { label:FB.T('Faith'), value:religionName(s, c.religion) },
        { label:FB.T('Station'), value:FB.stationName(FB.stationOf(c)) }
      ],
      standing:c.id === me.id ? null : {
        value:standing,
        band:standingBand(standing),
        explanation:characterStandingContext(s, c)
      },
      commitments:[],
      actions:[]
    };
    if (c.dead || c.id === me.id) return model;

    const attentionTarget = interactionAttentionTarget(s);
    const attention = FB.socialAttentionStatus(s, c);
    const assigned = attentionTarget && attentionTarget.id === c.id;
    const presence = FB.socialAttentionPresence(s, c);
    const together = presence.status === 'active';
    const visit = !together && FB.socialVisitPreview
      ? FB.socialVisitPreview(s, c, { readOnly:true }) : null;
    if (assigned) {
      model.commitments.push({
        id:'personal-attention',
        label:FB.T('Personal attention'),
        detail:together
          ? FB.T('+{rate} Standing each ordinary day together.', {
            rate:attention.rate
          })
          : FB.T('Assigned, but paused until you are together.')
      });
    }
    if (s.player.courtingId === c.id) {
      model.commitments.push({
        id:'courtship',
        label:FB.T('Active courtship'),
        detail:FB.T(
          'A proposal becomes available at +{threshold} Standing.', {
            threshold:FB.courtshipStandingThreshold(s, c)
          })
      });
    }
    if (s.roles.friend === c.id) {
      model.commitments.push({
        id:'friendship',
        label:FB.T('Named friend'),
        detail:FB.T('Events and oaths use this exact person.')
      });
    }
    if (s.roles.rival === c.id) {
      const heat = interactionRivalHeat(s);
      model.commitments.push({
        id:'rivalry',
        label:FB.T('Active rivalry'),
        detail:FB.T('{state} ({heat}/100)', {
          state:rivalryHeatName(heat),
          heat:heat
        }),
        urgent:true
      });
    }
    if (c.betrothedId && s.chars[c.betrothedId] &&
        !s.chars[c.betrothedId].dead) {
      model.commitments.push({
        id:'betrothal',
        label:FB.T('Betrothal'),
        detail:FB.T('Pledged to {name}.', {
          name:FB.fullName(s.chars[c.betrothedId])
        })
      });
    }
    if (retainer) {
      model.commitments.push({
        id:'retainer',
        label:FB.T('Household service'),
        detail:FB.T('{position} · {money:pay} each season', {
          position:positionName(s, retainer.office),
          pay:retainer.pay || 0
        })
      });
    }
    if (ambition) {
      model.commitments.push({
        id:'family-ambition',
        label:FB.T('Personal ambition'),
        detail:FB.T('{ambition} · {guidance}', {
          ambition:FB.familyAmbitionLabel(s, c.id),
          guidance:FB.familyAmbitionGuidanceLabel(ambition.guidance)
        })
      });
    }
    if (familyOffice) {
      model.commitments.push({
        id:'family-office',
        label:FB.T('Household office'),
        detail:positionName(s, familyOffice.office)
      });
    }
    const pupils = [];
    for (const studentId in s.chars) {
      const student = s.chars[studentId];
      if (student && !student.dead && student.edu &&
          String(student.edu.tutorId) === String(c.id)) {
        pupils.push(student.name);
      }
    }
    if (pupils.length) {
      model.commitments.push({
        id:'tutoring',
        label:FB.T('Tutoring assignment'),
        detail:FB.T('Teaching {students}.', {
          students:pupils.join(', ')
        })
      });
    }
    if (c.edu && (c.edu.tutorId || c.edu.school)) {
      const school = c.edu.school && FBDATA.schooling[c.edu.school];
      let instruction = school
        ? dt(s, 'schooling', c.edu.school, school, 'name')
        : FB.T('Home instruction');
      if (c.edu.tutorId === 'self') {
        instruction = FB.T('taught by you');
      } else if (c.edu.tutorId && s.chars[c.edu.tutorId]) {
        instruction = FB.T('taught by {name}', {
          name:s.chars[c.edu.tutorId].name
        });
      }
      model.commitments.push({
        id:'education',
        label:FB.T('Education'),
        detail:instruction
      });
    }
    if (s.player.travel && s.player.travel.targetCharId === c.id) {
      model.commitments.push({
        id:'travel',
        label:FB.T('Relationship journey'),
        detail:FB.T('This person is the target of your current journey.'),
        urgent:true
      });
    }

    if (assigned) {
      addInteractionAction(model, {
        id:'relationship.attention.stop',
        group:'relationship',
        label:FB.T('Stop cultivating'),
        detail:s.player.courtingId === c.id
          ? FB.T('End the courtship before releasing this assignment.')
          : FB.T('Withdraw personal attention. This costs no day.'),
        enabled:s.player.courtingId !== c.id,
        blockedReason:s.player.courtingId === c.id
          ? FB.T('The active courtship holds this assignment.') : null,
        consequence:FB.T('Frees the one personal-attention assignment.'),
        route:'attention-stop'
      });
    } else if (together) {
      addInteractionAction(model, {
        id:'relationship.attention.assign',
        group:'relationship',
        label:FB.T('Cultivate relationship'),
        detail:FB.T(
          'Assign personal attention for +{rate} Standing each ordinary day together. This costs no day.', {
            rate:attention.rate
          }),
        enabled:attention.ready,
        blockedReason:attention.reason || null,
        consequence:attentionTarget
          ? FB.T('Replaces personal attention to {name}.', {
            name:FB.fullName(attentionTarget)
          })
          : FB.T('Uses the one personal-attention assignment.'),
        route:'attention-assign'
      });
    }
    if (!together) {
      const visitReady = attention.ready && visit && visit.eligible &&
        visit.cost <= s.player.gold;
      let visitReason = attention.reason;
      if (!visitReason && visit && !visit.eligible) visitReason = visit.reason;
      if (!visitReason && visit && visit.cost > s.player.gold) {
        visitReason = FB.T(
          'Requires {money:cost}; you have {money:current}.', {
            cost:visit.cost,
            current:Math.floor(s.player.gold)
          });
      }
      addInteractionAction(model, {
        id:assigned
          ? 'travel.attention.continue' : 'travel.attention.begin',
        group:'travel',
        label:assigned
          ? FB.T('Travel to continue cultivating…')
          : FB.T('Travel to cultivate…'),
        detail:visit && visit.eligible
          ? FB.T(
            '{days} outbound travel days, {money:cost}, and at least {stay} days in residence; Standing advances only while together.', {
              days:visit.days,
              cost:visit.cost,
              stay:visit.minimumStay
            })
          : (visitReason || FB.T('A targeted visit is unavailable.')),
        enabled:visitReady,
        blockedReason:visitReady ? null : visitReason,
        consequence:assigned
          ? FB.T('Keeps the current personal-attention assignment.')
          : (attentionTarget
            ? FB.T('Departure replaces personal attention to {name}.', {
              name:FB.fullName(attentionTarget)
            })
            : FB.T('Departure uses the one personal-attention assignment.')),
        route:'attention-visit'
      });
    }

    const friendship = FB.friendshipStatus(s, c);
    if (friendship.relevant && s.roles.friend !== c.id) {
      addInteractionAction(model, {
        id:'relationship.friend.name',
        group:'relationship',
        label:friendship.currentId
          ? FB.T('Name {name} as your friend…', { name:c.name })
          : FB.T('Call {name} your friend', { name:c.name }),
        detail:FB.T(
          'Requires +{threshold} Standing and a remembered personal contact; naming a friend spends the day.', {
            threshold:friendship.threshold
          }),
        enabled:friendship.ready,
        blockedReason:friendship.reason || null,
        consequence:friendship.currentId && s.chars[friendship.currentId]
          ? FB.T('Replaces {name} as your named friend.', {
            name:FB.fullName(s.chars[friendship.currentId])
          })
          : FB.T('Events and oaths will use this exact person.'),
        route:'friend'
      });
    }

    if (!reigningRealmId) {
      addInteractionAction(model, characterGiftAction(s, c, household));
    }

    const isSpouse = c.spouseId === me.id || me.spouseId === c.id;
    const siblingApproach = !isSpouse && s.player.courtingId !== c.id &&
      FB.siblingCourtshipStatus ? FB.siblingCourtshipStatus(s, c) : null;
    if (siblingApproach && siblingApproach.relevant &&
        siblingApproach.code !== 'accepted') {
      addInteractionAction(model, {
        id:'relationship.sibling-courtship.approach',
        group:'relationship',
        label:FB.T('Make an exceptional approach…'),
        detail:FB.T(
          'Requires +40 Standing and a net player trait score of +1. Current score: {score}. Their response chance is {chance}%.', {
            score:siblingApproach.traitScore,
            chance:Math.round(siblingApproach.acceptance.chance * 100)
          }),
        enabled:siblingApproach.ready,
        blockedReason:siblingApproach.reason || null,
        consequence:FB.T('Refusal is permanent; acceptance begins a courtship and spends the day.'),
        route:'sibling-approach'
      });
    }
    if (!isSpouse && s.player.courtingId !== c.id) {
      const courtship = FB.courtshipStatus(s, c, false);
      if (courtship.relevant) {
        const courtVisitReady = together || (visit && visit.eligible &&
          visit.cost <= s.player.gold);
        const ready = courtship.ready && courtVisitReady;
        let reason = courtship.reason;
        if (!reason && !courtVisitReady) {
          reason = visit && visit.eligible
            ? FB.T('Requires {money:cost}; you have {money:current}.', {
              cost:visit.cost,
              current:Math.floor(s.player.gold)
            })
            : (visit && visit.reason) ||
              FB.T('A targeted visit is unavailable.');
        }
        addInteractionAction(model, {
          id:together
            ? 'relationship.courtship.begin'
            : 'travel.courtship.begin',
          group:together ? 'relationship' : 'travel',
          label:together
            ? FB.T('Begin courtship')
            : FB.T('Travel to begin courtship…'),
          detail:together
            ? FB.T(
              'Beginning spends the day and assigns personal attention; a proposal requires +{threshold} Standing.', {
                threshold:FB.courtshipStandingThreshold(s, c)
              })
            : (visit && visit.eligible
              ? FB.T(
                '{days} outbound travel days, {money:cost}, and at least {stay} days in residence; departure begins courtship and assigns personal attention.', {
                  days:visit.days,
                  cost:visit.cost,
                  stay:visit.minimumStay
                })
              : (reason || FB.T('A targeted courtship visit is unavailable.'))),
          enabled:ready,
          blockedReason:ready ? null : reason,
          consequence:s.player.courtingId
            ? FB.T('Abandons the current suit and applies its Standing penalty.')
            : FB.T('Uses the one personal-attention assignment.'),
          route:together ? 'courtship-begin' : 'courtship-visit'
        });
      }
    } else if (s.player.courtingId === c.id) {
      const siblingRecord = FB.siblingCourtshipRecord &&
        FB.siblingCourtshipRecord(s, me, c);
      const siblingSuit = siblingRecord && siblingRecord.status === 'accepted';
      const proposal = siblingSuit
        ? FB.siblingProposalStatus(s, c) : FB.proposalStatus(s, c);
      const proposalDowry = proposal.terms && proposal.terms.amount
        ? (proposal.terms.playerPays
          ? FB.T('Your house will provide {money:gold}.', {
            gold:proposal.terms.amount
          })
          : FB.T('Their house will provide {money:gold}.', {
            gold:proposal.terms.amount
          }))
        : FB.T('No dowry will change hands.');
      addInteractionAction(model, {
        id:'relationship.proposal',
        group:'relationship',
        label:FB.T('Propose marriage'),
        detail:FB.T(
          'Requires +{threshold} Standing; currently {standing}. {dowry} Asking spends the day.', {
            threshold:proposal.threshold,
            standing:Math.round(proposal.standing * 10) / 10,
            dowry:proposalDowry
          }),
        enabled:proposal.ready,
        blockedReason:proposal.reason || null,
        consequence:siblingSuit
          ? (proposal.route === 'xwedodah'
            ? FB.T('A recognized rite costs 75 piety and {money:gold}; no dowry, compact, or alliance follows.', {
              gold:proposal.gold
            })
            : FB.T('An irregular union costs 75 piety and 25 prestige, and brings public and political penalties.'))
          : FB.T('The existing proposal event decides the answer.'),
        route:siblingSuit ? 'sibling-proposal' : 'proposal'
      });
      addInteractionAction(model, {
        id:'relationship.courtship.end',
        group:'relationship',
        label:FB.T('Break off the courtship'),
        detail:FB.T('Part ways without a wedding. This costs no day.'),
        enabled:true,
        blockedReason:null,
        consequence:FB.T('Releases personal attention and lowers Standing by 20.'),
        route:'courtship-end'
      });
    }

    if (isSpouse) {
      const marriageEnd = FB.marriageEndStatus(s, c);
      if (marriageEnd.direct) {
        addInteractionAction(model, {
          id:'relationship.marriage.divorce',
          group:'relationship',
          label:marriageEnd.kind === 'talaq'
            ? FB.T('Pronounce the divorce')
            : (marriageEnd.kind === 'get'
              ? FB.T('Grant a get')
              : FB.T('Declare the marriage sundered')),
          detail:marriageEnd.prestige && marriageEnd.piety
            ? FB.T('Costs {piety} piety and {prestige} prestige, and spends the day.', {
              piety:marriageEnd.piety,
              prestige:marriageEnd.prestige
            })
            : (marriageEnd.prestige
              ? FB.T('Costs {prestige} prestige and spends the day.', {
                prestige:marriageEnd.prestige
              })
              : (marriageEnd.piety
                ? FB.T('Costs {piety} piety and spends the day.', {
                  piety:marriageEnd.piety
                })
                : (marriageEnd.cost
                  ? FB.T('Pays {money:cost} and spends the day.', {
                    cost:marriageEnd.cost
                  })
                  : FB.T('Spends the day.')))),
          enabled:marriageEnd.ready,
          blockedReason:marriageEnd.reason || null,
          consequence:FB.T(
            'Ends the marriage, preserves children and claims, and lowers Standing by 50.'),
          route:'divorce'
        });
      } else {
        addInteractionAction(model, {
          id:'relationship.marriage.annul',
          group:'relationship',
          label:FB.T('Petition to annul the marriage'),
          detail:FB.T(
            'Costs {money:gold} and {piety} piety; the church decides after you spend the day.', {
              gold:marriageEnd.cost, piety:marriageEnd.piety
            }),
          enabled:marriageEnd.ready,
          blockedReason:marriageEnd.reason || null,
          consequence:FB.T('Queues the existing annulment plea.'),
          route:'annul'
        });
      }
      addInteractionAction(model, {
        id:'management.children.toggle',
        group:'management',
        label:s.player.flags.noChildren
          ? FB.T('Try for children')
          : FB.T('No more children'),
        detail:s.player.flags.noChildren
          ? FB.T('Open your house to new life once more.')
          : FB.T(
            'Stops new conceptions; a child already on the way will still be born.'),
        enabled:true,
        blockedReason:null,
        consequence:FB.T('Changes the household conception preference immediately.'),
        route:'children-toggle'
      });
    }

    const family = isSpouse || !!descendantKind ||
      (c.role === 'sibling' && c.dyn === me.dyn);
    if (!family && !retainer) {
      addInteractionAction(model, {
        id:'relationship.hostility.insult',
        group:'war',
        label:FB.T('Insult them publicly'),
        detail:FB.T('Lowers Standing by 12 and spends the day.'),
        enabled:true,
        blockedReason:null,
        consequence:FB.T('May begin or intensify a remembered rivalry.'),
        route:'insult'
      });
      addInteractionAction(model, {
        id:'relationship.hostility.undermine',
        group:'war',
        label:FB.T('Undermine them quietly'),
        detail:FB.T(
          'Intrigue decides the outcome; success lowers Standing by 8, discovery by 20. Spends the day.'),
        enabled:true,
        blockedReason:null,
        consequence:FB.T('May begin or intensify a remembered rivalry.'),
        route:'undermine'
      });
      if (s.roles.rival === c.id) {
        addInteractionAction(model, {
          id:'relationship.rival.settle',
          group:'relationship',
          label:FB.T('Seek a settlement…'),
          detail:FB.T('Ask a mediator to bind a peace. Spends the day.'),
          enabled:true,
          blockedReason:null,
          consequence:FB.T('Uses the existing rivalry-mediation event.'),
          route:'rival-settle'
        });
      } else if (standing <= -40 &&
          (!s.roles.rival || !s.chars[s.roles.rival] ||
            s.chars[s.roles.rival].dead)) {
        addInteractionAction(model, {
          id:'relationship.rival.declare',
          group:'war',
          label:FB.T('Declare rival'),
          detail:FB.T('Name {name} your enemy. Spends the day.', {
            name:c.name
          }),
          enabled:true,
          blockedReason:null,
          consequence:FB.T('Creates the one canonical active rivalry.'),
          route:'rival-declare'
        });
      }
    }

    if (reigningRealmId) {
      addInteractionAction(model, {
        id:'management.realm-court',
        group:'management',
        label:FB.T('Realm and court…'),
        detail:FB.T(
          'Open political office, capital, diplomacy, war, succession, and ruler gifts.'),
        enabled:true,
        blockedReason:null,
        consequence:FB.T('Personal Standing is shared with that ruler card.'),
        route:'realm'
      });
    }
    if (household) {
      addInteractionAction(model, {
        id:'management.equipment',
        group:'management',
        label:FB.T('Equip items…'),
        detail:FB.T('Choose equipment from the shared family armory.'),
        enabled:true,
        blockedReason:null,
        consequence:FB.T('Opens the focused equipment sheet.'),
        route:'equipment'
      });
      if (FB.ageOf(c, s.date.year) >= 10) {
        addInteractionAction(model, {
          id:'management.career',
          group:'management',
          label:FB.T('Choose work or training…'),
          detail:FB.T(
            'Arrange an apprenticeship, change occupation, or seek guild rank.'),
          enabled:true,
          blockedReason:null,
          consequence:FB.T('Opens the focused work and training sheet.'),
          route:'career'
        });
      }
    }
    if (agencyFamily) {
      addInteractionAction(model, {
        id:'management.family.ambition',
        group:'management',
        label:FB.T('Guide their ambition…'),
        detail:FB.T('Encourage this goal, leave it alone, or steer them toward another road.'),
        enabled:true,
        blockedReason:null,
        consequence:FB.T('Guidance changes their yearly personal progress and family requests.'),
        route:'family-ambition'
      });
      if (FB.ageOf(c, s.date.year) >= 16) {
        addInteractionAction(model, {
          id:'management.family.office',
          group:'management',
          label:FB.T('Assign a household office…'),
          detail:familyOffice
            ? FB.T('Currently serving as {office}.', {
              office:positionName(s, familyOffice.office)
            })
            : FB.T('Match their occupation to an available household office.'),
          enabled:true,
          blockedReason:null,
          consequence:FB.T('An office replaces enterprise work and spends the day.'),
          route:'family-office'
        });
      }
    }
    if (retainer) {
      addInteractionAction(model, {
        id:'management.retainer',
        group:'management',
        label:FB.T('Manage household service…'),
        detail:FB.T('{position} · {money:pay} each season', {
          position:positionName(s, retainer.office),
          pay:retainer.pay || 0
        }),
        enabled:true,
        blockedReason:null,
        consequence:FB.T('Office changes and dismissal use their existing confirmations.'),
        route:'retainer'
      });
    } else if (!household && FB.ageOf(c, s.date.year) >= 16) {
      addInteractionAction(model, {
        id:'management.retainer.consider',
        group:'management',
        label:FB.T('Consider for household service…'),
        detail:FB.T(
          'Open the office ledger to compare this person with other eligible retainers.'),
        enabled:true,
        blockedReason:null,
        consequence:FB.T(
          'Hiring still uses an office’s authoritative eligibility, entry pay, and confirmation.'),
        route:'retainer-hire'
      });
    }
    const managedMinor = (descendantKind || c.id === me.id) &&
      household && FB.ageOf(c, s.date.year) < 16;
    if (managedMinor) {
      addInteractionAction(model, {
        id:'management.education.focus',
        group:'management',
        label:FB.T('Choose education focus…'),
        detail:FB.T('Direct their formative years toward one art.'),
        enabled:true,
        blockedReason:null,
        consequence:FB.T('Opens the focused education sheet.'),
        route:'education'
      });
      addInteractionAction(model, {
        id:'management.education.tutor',
        group:'management',
        label:FB.T('Arrange schooling or a tutor…'),
        detail:FB.T(
          'Instruction raises yearly learning chances; paid lessons charge each season.'),
        enabled:true,
        blockedReason:null,
        consequence:FB.T('Replaces any current schooling or tutor assignment.'),
        route:'tutor'
      });
    }
    if (descendantKind && household && !FB.spouseSnapshot(s, c) &&
        FB.ageOf(c, s.date.year) >= 12 && !c.betrothedId) {
      addInteractionAction(model, {
        id:'management.arranged-match',
        group:'management',
        label:FB.T('Arrange a match…'),
        detail:FB.T(
          'Sound out families for a binding pledge; sealing one spends the day.'),
        enabled:true,
        blockedReason:null,
        consequence:FB.T('The wedding follows once both partners are of age.'),
        route:'match'
      });
    }
    return model;
  }
  UI.characterInteractionCard = buildCharacterInteractionCard;

  function showCharacterInteractionSheet(cid, returnContext) {
    const s = FB.state;
    const c = s && s.chars[cid];
    const model = s && buildCharacterInteractionCard(s, cid);
    if (!s || !c || !model) return;
    let h = UI.charCardHtml(s, c, false, true) +
      '<button type="button" class="btn small character-skills-guide" ' +
      'id="character-skills-guide">' +
      esc(FB.T('What do these skills affect?')) + '</button>';
    if (!c.dead) h += interactionCardHtml(model);
    h += '<div class="gm-footer"><button type="button" class="btn" id="cm-close">' +
      esc(returnContext ? FB.T('Back') : FB.T('Close')) +
      '</button></div>';
    openModal(FB.fullName(c), h, {
      modalClass:'fullsheet-modal interaction-modal character-interaction-modal',
      historyView:!!returnContext,
      historyBackRender:function () {
        interactionReturn(returnContext);
      }
    });
    FB.paintFaces($('gm-body'), s);
    $('character-skills-guide').addEventListener('click', function () {
      UI.showGuide({ category:'skills' });
    });
    if (!c.dead) {
      const me = s.chars[s.player.charId];
      function actThen(fn) {
        UI.closeModal();
        fn();
        FB.game.passDay({ skipFocus:true });
      }
      wireInteractionCard(model, function (action) {
        if (action.route === 'attention-assign') {
          if (!FB.socialAttentionAssign(s, c)) return;
          UI.showCharModal(c.id, returnContext);
          UI.refresh();
        } else if (action.route === 'attention-stop') {
          if (!FB.socialAttentionWithdraw(s, c.id)) return;
          UI.showCharModal(c.id, returnContext);
          UI.refresh();
        } else if (action.route === 'attention-visit') {
          UI.showSocialVisit(c.id, { returnContext:returnContext });
        } else if (action.route === 'friend') {
          UI.showFriendConfirm(c.id, returnContext);
        } else if (action.route === 'sibling-approach') {
          UI.showSiblingCourtshipConfirm(c.id, returnContext);
        } else if (action.route === 'character-gift') {
          UI.showCharacterGiftModal(c.id, returnContext);
        } else if (action.route === 'courtship-begin') {
          UI.closeModal();
          if (!FB.beginCourtship(s, c)) return;
          FB.news(s, FB.msg('news.social.courting_begins',
            '🌷 You begin courting {name}.', { name:FB.fullName(c) }));
          FB.game.passDay({ skipFocus:true });
        } else if (action.route === 'courtship-visit') {
          UI.showSocialVisit(c.id, {
            courtship:true,
            returnContext:returnContext
          });
        } else if (action.route === 'proposal') {
          if (!FB.proposalStatus(s, c).ready) return;
          UI.closeModal();
          FB.queueEvent(s, 'proposal_made', {});
          FB.game.passDay({ skipFocus:true });
        } else if (action.route === 'sibling-proposal') {
          UI.showSiblingProposalConfirm(c.id, returnContext);
        } else if (action.route === 'courtship-end') {
          UI.closeModal();
          FB.clearCourtship(s, { penalty:true, news:true });
          FB.validateFocus(s);
          UI.refresh();
        } else if (action.route === 'divorce') {
          const status = FB.marriageEndStatus(s, c);
          if (!status.ready || !status.direct) return;
          actThen(function () {
            const cost = status.cost;
            const gap = FB.stationOf(c) - FB.playerStation(s);
            if (cost) s.player.gold = Math.max(0, s.player.gold - cost);
            if (status.piety) s.player.piety = Math.max(0,
              s.player.piety - status.piety);
            if (status.prestige) s.player.prestige = Math.max(0,
              s.player.prestige - status.prestige);
            if (status.cooldown) {
              s.player.cooldowns = s.player.cooldowns || {};
              s.player.cooldowns.annul = s.turn;
            }
            if (gap > 0) {
              s.player.prestige = Math.max(0,
                s.player.prestige - gap * 5);
            }
            FB.doDivorce(s, c.id);
            FB.news(s, FB.msg('news.social.divorce', {
              forms:{
                select:'value',
                param:'kind',
                cases:{
                  talaq:'🕊 You pronounce the divorce from {name}; the mahr of {money:cost} is paid.',
                  get:'📜 A get is written and witnessed; {name} departs with the ketubah of {money:cost}.',
                  other:'💔 Before witnesses, the marriage to {name} is declared sundered.'
                }
              }
            }, {
              kind:status.kind,
              name:c.name,
              cost:cost
            }));
            if (gap > 0) {
              FB.news(s, FB.msg('news.social.divorce_house_offended',
                '🗣 The house of {name} does not forgive the slight.', {
                  name:c.name
                }));
            }
            FB.validateFocus(s);
          });
        } else if (action.route === 'annul') {
          const status = FB.marriageEndStatus(s, c);
          if (!status.ready || status.direct) return;
          UI.closeModal();
          s.player.cooldowns = s.player.cooldowns || {};
          s.player.cooldowns.annul = s.turn;
          const doctrine = FB.marriageDoctrine(
            s.chars[s.player.charId].religion, s);
          const ending = doctrine.end || {};
          FB.queueEvent(s, 'annulment_plea', {
            marriageEndInitiated:true,
            marriageGold:status.cost,
            marriagePiety:status.piety,
            marriageFailurePiety:Math.max(0,
              Number(ending.failurePiety) || status.piety),
            marriagePrestige:status.prestige
          });
          FB.game.passDay({ skipFocus:true });
        } else if (action.route === 'children-toggle') {
          if (s.player.flags.noChildren) {
            delete s.player.flags.noChildren;
          } else {
            s.player.flags.noChildren = 1;
          }
          UI.showCharModal(c.id, returnContext);
          UI.refresh();
        } else if (action.route === 'insult') {
          actThen(function () {
            FB.adjustStanding(s, { kind:'character', id:c.id }, -12,
              'social:public_insult');
            FB.noteRivalContact(s, c, 1, 'insult');
            if (FB.chance(0.5 + FB.skillOf(me, 'dip') * 0.015)) {
              s.player.prestige += 4;
              FB.news(s, FB.msg('news.social.insult_success',
                'Your barb lands perfectly. {name} fumes; the crowd laughs.',
                { name:c.name }));
            } else {
              s.player.prestige = Math.max(0, s.player.prestige - 5);
              FB.news(s, FB.msg('news.social.insult_failure',
                'The insult falls flat. {name} answers better, and the laughter is theirs.',
                { name:c.name }));
            }
          });
        } else if (action.route === 'undermine') {
          actThen(function () {
            if (FB.chance(0.35 + FB.skillOf(me, 'int') * 0.03)) {
              FB.adjustStanding(s, { kind:'character', id:c.id }, -8,
                'social:undermined');
              FB.noteRivalContact(s, c, 1, 'undermined');
              s.player.prestige += 3;
              if (FB.chance(0.5)) FB.gainSkill(me, 'int', 1);
              FB.news(s, FB.msg('news.social.undermine_success',
                'Your quiet work costs {name} dearly, and no one can prove a thing.',
                { name:c.name }));
            } else {
              FB.adjustStanding(s, { kind:'character', id:c.id }, -20,
                'social:caught_scheme');
              FB.noteRivalContact(s, c, 2, 'caught_scheme');
              s.player.prestige = Math.max(0, s.player.prestige - 6);
              FB.news(s, FB.msg('news.social.undermine_failure',
                'The scheme unravels — and {name} knows exactly whose hand was in it.',
                { name:c.name }));
            }
          });
        } else if (action.route === 'rival-declare') {
          actThen(function () {
            FB.startRivalry(s, c, 'player', 'declared', null);
            FB.news(s, FB.msg('news.social.rival',
              '⚡ {name} now counts you an enemy.', { name:c.name }));
          });
        } else if (action.route === 'rival-settle') {
          actThen(function () {
            FB.queueEvent(s, 'rival_mediation', {});
          });
        } else if (action.route === 'realm') {
          const rid = FB.realmIdForRulerCharacter(s, c);
          if (rid) {
            UI.showLiegeModal(rid, {
              view:'character',
              characterId:c.id,
              returnContext:returnContext
            });
          }
        } else if (action.route === 'equipment') {
          UI.showEquipmentModal(c.id, 'character', returnContext);
        } else if (action.route === 'career') {
          UI.showCareerPicker(c.id, {
            view:'character',
            characterId:c.id,
            returnContext:returnContext
          });
        } else if (action.route === 'family-ambition') {
          UI.showFamilyAmbition(c.id, {
            view:'character',
            characterId:c.id,
            returnContext:returnContext
          });
        } else if (action.route === 'family-office') {
          UI.showFamilyOffice(c.id, {
            view:'character',
            characterId:c.id,
            returnContext:returnContext
          });
        } else if (action.route === 'retainer') {
          UI.showRetainerManage(c.id, {
            view:'character',
            characterId:c.id,
            returnContext:returnContext
          });
        } else if (action.route === 'retainer-hire') {
          UI.showRetainerHire({
            view:'character',
            characterId:c.id,
            returnContext:returnContext
          });
        } else if (action.route === 'education') {
          UI.showEduFocus(c.id, {
            view:'character',
            characterId:c.id,
            returnContext:returnContext
          });
        } else if (action.route === 'tutor') {
          UI.showTutorPick(c.id, {
            view:'character',
            characterId:c.id,
            returnContext:returnContext
          });
        } else if (action.route === 'match') {
          UI.showMatchPicker(c.id, {
            view:'character',
            characterId:c.id,
            returnContext:returnContext
          });
        }
      });
    }
    $('cm-close').addEventListener('click', function () {
      if (returnContext) {
        modalHistoryBack(function () {
          interactionReturn(returnContext);
        });
      } else {
        UI.closeModal();
      }
    });
  }

  UI.showCharModal = function (cid, returnContext) {
    return showCharacterInteractionSheet(cid, returnContext);
  };

  UI.showEquipmentModal = function (cid, exitMode, returnContext) {
    const s = FB.state;
    const c = s && s.chars[cid];
    if (!s || !c || c.dead) return;
    /* The armory is shared with household members and manageable kin;
       FB.clearLoadout strips a managed sibling's gear when they wed. */
    if (!FB.isHouseholdCharacter(s, cid) &&
        !(FB.manageableKinKind && FB.manageableKinKind(s, cid))) return;
    exitMode = exitMode === 'character' ? 'character' : 'close';
    const householdPlan = returnsToHouseholdPlan(returnContext);
    const returnMode = {
      kind:'equipment',
      exitMode:householdPlan ? HOUSEHOLD_PLAN_RETURN : exitMode,
      returnContext:returnContext
    };
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
          else UI.showCharModal(cid, returnContext);
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
        modalHistoryBack(function () {
          UI.showCharModal(cid, returnContext);
        });
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
    const matchProtected = FB.isProtected(s, 'matchCharacter', c.id);
    cands = cands.map(function (candidate, order) {
      return { candidate:candidate, order:order };
    }).sort(function (a, b) {
      if (a.candidate.id === recommendedId) return -1;
      if (b.candidate.id === recommendedId) return 1;
      return a.order - b.order;
    }).map(function (entry) { return entry.candidate; });
    const ps = FB.playerStation(s);
    let h = '<label class="automation-protection"><input type="checkbox" ' +
      'id="match-policy-protection"' + (matchProtected ? ' checked' : '') +
      '> <span>' + esc(FB.T('Manage this descendant’s matches manually')) +
      '</span><span class="adesc">' + esc(FB.T(
        'The match assistant will omit this person from future recommendations. Manual matching remains available.')) +
      '</span></label><div class="gm-body-text"><p>' + esc(FB.T(
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
      details.push(childIdentityPreviewText(s, c, m, false));
      h += '<button class="actionbtn' +
        (m.id === recommendedId ? ' match-policy-recommended' : '') +
        '" data-match="' + m.id + '"' + (ok ? '' : ' disabled') +
        '>💍 ' + esc((epithetText(s, m) ? epithetText(s, m) + ' — ' : '') + m.name) +
        '<span class="adesc">' + esc(details.join(' · ')) + '</span></button>';
    }
    h += '</div><button class="btn" id="gm-cancel">' +
      esc(returnContext ? FB.T('Back') : FB.T('Decide nothing today')) +
      '</button>';
    const historyOptions = { historyView:true };
    if (returnsToHouseholdPlan(returnContext)) {
      historyOptions.historyBackRender = function () { UI.showHouseholdPlan(); };
    } else if (returnsToInteractionManagement(returnContext)) {
      historyOptions.historyBackRender = function () {
        interactionReturn(returnContext);
      };
    }
    openModal(FB.T('A Match for {name}', { name: c.name }), h, historyOptions);
    $('match-policy-protection').addEventListener('change', function () {
      FB.setProtected(s, 'matchCharacter', c.id, this.checked);
      if (this.checked) delete c.matchRecommendation;
      else if (matchPolicy.enabled) {
        FB.recommendDescendantMatches(s, { notify:false });
      }
    });
    document.querySelectorAll('[data-match]').forEach(function (b) {
      b.addEventListener('click', function () {
        const m = s.chars[b.dataset.match];
        if (!m) return;
        if (!FB.sealKinMatch(s, c, m)) return;
        UI.closeModal();
        FB.game.passDay({ skipFocus: true });
        resumeManagementAfterDay(returnContext);
      });
    });
    $('gm-cancel').addEventListener('click', function () {
      finishManagementReturn(returnContext, function () {
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
      const marriage = FB.marriageTerms(s,
        s.chars[s.player.charId], m);
      if (marriage.amount) {
        details.push(marriage.playerPays
          ? FB.T('your house would provide exactly {money:gold}', {
            gold:marriage.amount
          })
          : FB.T('their house would provide exactly {money:gold}', {
            gold:marriage.amount
          }));
      }
      details.push((m.sex === 'f' && age > 45) ? FB.T('🌱 past childbearing')
        : FB.T('🌱 fertility {percent}%', {
          percent: Math.round((m.fertility || 1) * FB.traitAgg(m).fert *
            FB.ageFert(m.sex, age) * 100)
        }));
      if (gap > 0) details.push(FB.T('a step up — a harder suit'));
      else if (gap < 0) details.push(FB.T('a step down — folk will mark it'));
      details.push(childIdentityPreviewText(
        s, s.chars[s.player.charId], m, true));
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
    if (owned) {
      const protectedItem = FB.isProtected(s, 'equipmentItem', id);
      h += '<label class="autorow item-auto-protection"><input type="checkbox" ' +
        'id="item-auto-protection"' + (protectedItem ? ' checked' : '') + '> ' +
        esc(FB.T('Protect from automatic equipment changes')) +
        '<span class="adesc">' + esc(assigned
          ? FB.T('Equip Best and succession preserve this assignment when possible; otherwise the item stays in the armory. Manual changes remain available.')
          : FB.T('Equip Best and succession will keep it in the family armory. Manual changes remain available.')) +
        '</span></label>';
    }
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
    const protection = $('item-auto-protection');
    if (protection) protection.addEventListener('change', function () {
      FB.setProtected(s, 'equipmentItem', id, protection.checked);
      UI.refresh();
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
    for (const g of ['children', 'stepchildren', 'parents', 'siblings', 'grandchildren',
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
    if (returnMode && typeof returnMode === 'object' &&
        returnMode.kind === 'equipment') return returnMode.exitMode;
    const prefix = 'equipment:';
    return typeof returnMode === 'string' &&
      returnMode.indexOf(prefix) === 0
      ? returnMode.slice(prefix.length) : null;
  }

  function equipmentReturnContext(returnMode) {
    return returnMode && typeof returnMode === 'object' &&
      returnMode.kind === 'equipment' ? returnMode.returnContext : null;
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
    } else if (exitMode !== null) {
      UI.showEquipmentModal(cid, exitMode,
        equipmentReturnContext(returnMode));
    }
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
      else if (equipmentExit !== null) {
        UI.showEquipmentModal(cid, equipmentExit,
          equipmentReturnContext(returnMode));
      }
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
  function educationProtectionHtml(s, c) {
    return '<label class="automation-protection"><input type="checkbox" ' +
      'id="education-policy-protection"' +
      (FB.isProtected(s, 'educationCharacter', c.id) ? ' checked' : '') +
      '> <span>' + esc(FB.T('Manage this education manually')) + '</span>' +
      '<span class="adesc">' + esc(FB.T(
        'Household education policy will not fill or refill this person’s choices. Manual choices remain available.')) +
      '</span></label>';
  }

  function bindEducationProtection(s, c) {
    $('education-policy-protection').addEventListener('change', function () {
      FB.setProtected(s, 'educationCharacter', c.id, this.checked);
    });
  }

  UI.showEduFocus = function (cid, returnContext) {
    const s = FB.state;
    const c = s.chars[cid];
    if (!c || c.dead || !FB.isHouseholdCharacter(s, cid) ||
        (c.id !== s.player.charId && !FB.playerDescendantKind(s, cid)) ||
        FB.ageOf(c, s.date.year) >= 16) return;
    const self = c.id === s.player.charId;
    const policy = FB.ensureEducationPolicy(s);
    const provenance = FB.educationPolicyProvenance(s, c, 'focus');
    let h = educationProtectionHtml(s, c) + '<div class="gm-list">';
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
          else if (returnsToInteractionManagement(returnContext)) {
            interactionReturn(returnContext);
          } else UI.showCharModal(cid);
        }
      });
    bindEducationProtection(s, c);
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
        finishManagementReturn(returnContext, function () {
          modalHistoryBack(function () { UI.showCharModal(cid); });
        });
      });
    });
    $('edu-follow-policy').addEventListener('click', function () {
      FB.followEducationPolicy(s, c, 'focus');
      finishManagementReturn(returnContext, function () {
        modalHistoryBack(function () { UI.showCharModal(cid); });
      });
    });
    $('edu-back').addEventListener('click', function () {
      finishManagementReturn(returnContext, function () {
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
    let h = educationProtectionHtml(s, c) + '<div class="gm-list">';
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
          else if (returnsToInteractionManagement(returnContext)) {
            interactionReturn(returnContext);
          } else UI.showCharModal(cid);
        }
      });
    bindEducationProtection(s, c);
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
        finishManagementReturn(returnContext, function () {
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
        finishManagementReturn(returnContext, function () {
          modalHistoryBack(function () { UI.showCharModal(cid); });
        });
      });
    });
    $('tut-follow-policy').addEventListener('click', function () {
      FB.followEducationPolicy(s, c, 'instruction');
      finishManagementReturn(returnContext, function () {
        modalHistoryBack(function () { UI.showCharModal(cid); });
      });
    });
    $('tut-back').addEventListener('click', function () {
      finishManagementReturn(returnContext, function () {
        modalHistoryBack(function () { UI.showCharModal(cid); });
      });
    });
  };

  /* ---------- name an heir ---------- */
  UI.showHeirPick = function () {
    const s = FB.state;
    if (!s) return;
    const review = FB.heirReview(s);
    const eligibleRows = review.filter(function (row) {
      return row.eligible;
    }).slice(0, 6);
    const heirs = eligibleRows.map(function (row) { return row.character; });
    if (!heirs.length) {
      let empty = '<div class="gm-body-text"><p>' + esc(FB.T(
        'You have no eligible living kin to name. A successor must belong to the current playable line or an eligible same-house branch.')) +
        '</p></div>';
      for (const row of review.slice(0, 8)) {
        empty += '<div class="succession-review-row"><b>' +
          esc(FB.fullName(row.character)) + '</b><span>' +
          esc(heirEligibilityText(s, row)) + '</span></div>';
      }
      empty += '<div class="gm-footer"><button class="btn" id="heir-guide">' +
        esc(FB.T('Guide: inheritance')) +
        '</button><button class="btn" id="hp-close">' +
        esc(FB.T('Close')) + '</button></div>';
      openModal(FB.T('📜 Name Your Heir'), empty);
      $('heir-guide').addEventListener('click', function () {
        UI.showGuideEntry('inheritance');
      });
      $('hp-close').addEventListener('click', UI.closeModal);
      return;
    }
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Who shall carry the name when you are gone? Naming changes priority among eligible successors; it does not make an ineligible relative eligible.')) +
      '</p></div><div class="gm-list">';
    for (let i = 0; i < heirs.length; i++) {
      const c = heirs[i];
      const row = eligibleRows[i];
      const details = FB.T('Age {age} · {mar} {marValue} · {ste} {steValue} · {dip} {dipValue}', {
        age: FB.ageOf(c, s.date.year),
        mar: FB.skillName('mar'), marValue: FB.skillOf(c, 'mar'),
        ste: FB.skillName('ste'), steValue: FB.skillOf(c, 'ste'),
        dip: FB.skillName('dip'), dipValue: FB.skillOf(c, 'dip')
      });
      h += '<button class="actionbtn" data-namedheir="' + c.id + '">' + FB.faceTag(c, 36, 42) + ' ' +
        (s.player.namedHeirId === c.id ? '★ ' : '') + esc(FB.fullName(c)) +
        '<span class="adesc">' + esc(details + ' · ' +
          heirEligibilityText(s, row)) + '</span></button>';
    }
    const ineligible = review.filter(function (row) {
      return !row.eligible;
    }).slice(0, 8);
    if (ineligible.length) {
      h += '</div><div class="panelh">' + esc(FB.T('Not eligible now')) +
        '</div><div class="succession-review">';
      for (const row of ineligible) {
        h += '<div class="succession-review-row"><b>' +
          esc(FB.fullName(row.character)) + '</b><span>' +
          esc(heirEligibilityText(s, row)) + '</span></div>';
      }
    }
    h += '</div><div class="gm-footer"><button class="btn" id="heir-guide">' +
      esc(FB.T('Guide: inheritance')) +
      '</button><button class="btn" id="hp-close">' +
      esc(FB.T('Decide later')) + '</button></div>';
    openModal(FB.T('📜 Name Your Heir'), h);
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
    $('heir-guide').addEventListener('click', function () {
      UI.showGuideEntry('inheritance');
    });
    $('hp-close').addEventListener('click', UI.closeModal);
  };

  /* ---------- voluntary retirement ---------- */
  UI.showRetirement = function () {
    const s = FB.state;
    if (!s || !FB.game || !FB.game.retirePreview) return false;
    const me = s.chars[s.player.charId];
    const preview = FB.game.retirePreview();
    const footer = '<div class="gm-footer"><button class="btn" id="retire-guide">' +
      esc(FB.T('Guide: inheritance')) +
      '</button><button class="btn" id="retire-close">' +
      esc(FB.T('Decide later')) + '</button></div>';

    if (!preview.eligible) {
      let blocked = '<div class="gm-body-text"><p>' + esc(FB.T(
        'Handing the house over while you live is not yet possible:')) + '</p>';
      for (const reason of preview.blockers) {
        blocked += '<p>• ' + esc(reason) + '</p>';
      }
      blocked += '</div>';
      openModal(FB.T('👴 Hand over the house'), blocked + footer);
      $('retire-guide').addEventListener('click', function () {
        UI.showGuideEntry('inheritance');
      });
      $('retire-close').addEventListener('click', UI.closeModal);
      return true;
    }

    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      '{name} is old enough to lay down the headship. Choose the adult successor who continues the family’s story.', {
        name: FB.fullName(me)
      })) + '</p><p>' + esc(FB.T(
      'The new head receives the family’s money in full (no death dues), land, realm, house property, enterprises, and the family armory.')) +
      '</p><p>' + esc(FB.T(
      'Personal prestige, piety, and Common Voice are reduced by the ordinary succession rule. Personal offices such as a bishopric return to the Church, guild monopolies lapse, and courtship, plots, and personal standings end.')) +
      '</p><p>' + esc(FB.T(
      '{name} remains in your family at home as a retired elder — still visible in Kin, but no longer under your control.', {
        name: FB.fullName(me)
      })) + '</p></div><div class="gm-list">';
    const reviewById = {};
    for (const row of preview.review) reviewById[row.character.id] = row;
    for (const c of preview.heirs) {
      const details = FB.T('Age {age} · {mar} {marValue} · {ste} {steValue} · {dip} {dipValue}', {
        age: FB.ageOf(c, s.date.year),
        mar: FB.skillName('mar'), marValue: FB.skillOf(c, 'mar'),
        ste: FB.skillName('ste'), steValue: FB.skillOf(c, 'ste'),
        dip: FB.skillName('dip'), dipValue: FB.skillOf(c, 'dip')
      });
      h += '<button type="button" class="actionbtn" data-retire-heir="' + c.id + '">' +
        FB.faceTag(c, 32, 38) + ' ' +
        (s.player.namedHeirId === c.id ? '★ ' : '') + esc(FB.T(
          'Retire and continue as {name}', { name: FB.fullName(c) })) +
        '<span class="adesc">' + esc(details + ' · ' +
          heirEligibilityText(s, reviewById[c.id])) + '</span></button>';
    }
    h += '</div>';
    openModal(FB.T('👴 Hand over the house'), h + footer);
    FB.paintFaces($('gm-body'), s);
    document.querySelectorAll('[data-retire-heir]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (FB.game.retireTo(b.getAttribute('data-retire-heir'))) {
          UI.closeModal();
        } else {
          UI.toast(FB.T('Retirement is no longer possible.'));
          UI.showRetirement();
        }
      });
    });
    $('retire-guide').addEventListener('click', function () {
      UI.showGuideEntry('inheritance');
    });
    $('retire-close').addEventListener('click', UI.closeModal);
    return true;
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
    const source = modifierSourceText(s, record, scope);
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
      kv('Source', esc(source)) +
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
      FB.religionOf(me.religion, s).icon + ' ' + FB.T('Piety each season');
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
      'width="' + Math.round(192 * FB.portraitDpr) + '" height="' +
      Math.round(360 * FB.portraitDpr) + '" role="img" aria-label="' +
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
        const reviewRow = FB.heirReview(s).filter(function (row) {
          return row.character.id === c.id;
        })[0];
        const details = FB.T('Age {age} · {mar} {marValue} · {ste} {steValue} · {dip} {dipValue}', {
          age: FB.ageOf(c, s.date.year),
          mar: FB.skillName('mar'), marValue: FB.skillOf(c, 'mar'),
          ste: FB.skillName('ste'), steValue: FB.skillOf(c, 'ste'),
          dip: FB.skillName('dip'), dipValue: FB.skillOf(c, 'dip')
        });
        h += '<button class="actionbtn" data-heir="' + c.id + '">' + FB.faceTag(c, 36, 42) + ' ' +
          esc(FB.fullName(c)) + '<span class="adesc">' +
          esc(details + ' · ' + heirEligibilityText(s, reviewRow)) +
          '</span></button>';
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
          (lc ? FB.faceTag(lc, 36, 42) : '') +
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

  function shortcutTargetOptions(selected) {
    const s = FB.state;
    const seen = {};
    let focusOptions = '';
    for (const focus of FB.focuses || []) {
      const target = focusShortcutTarget(focus);
      if (seen[target]) continue;
      seen[target] = 1;
      const label = focus.shortcutFamily
        ? shortcutFamilyLabel(focus.shortcutFamily)
        : (s ? dt(s, 'focus', focus.id, focus, 'label') : FB.T(focus.label));
      focusOptions += '<option value="' + esc(target) + '"' +
        (selected === target ? ' selected' : '') + '>' + esc(label) +
        '</option>';
    }
    const actions = [];
    for (const action of FB.instants || []) {
      if (action.compatibilityAlias) continue;
      actions.push({
        target:'action:' + action.id,
        label:s ? dt(s, 'action', action.id, action, 'label') : FB.T(action.label)
      });
    }
    actions.sort(function (a, b) {
      return a.label.localeCompare(b.label) || a.target.localeCompare(b.target);
    });
    let actionOptions = '';
    for (const action of actions) {
      actionOptions += '<option value="' + esc(action.target) + '"' +
        (selected === action.target ? ' selected' : '') + '>' +
        esc(action.label) + '</option>';
    }
    let unknown = '';
    if (selected && !seen[selected] &&
        !actions.some(function (action) { return action.target === selected; })) {
      unknown = '<option value="' + esc(selected) + '" selected>' +
        esc(FB.T('Unavailable saved action: {id}', { id:selected })) +
        '</option>';
    }
    return '<option value="">' + esc(FB.T('Choose an action')) +
      '</option>' + unknown + '<optgroup label="' +
      esc(FB.T('Daily focuses')) + '">' + focusOptions +
      '</optgroup><optgroup label="' + esc(FB.T('Deeds')) + '">' +
      actionOptions + '</optgroup>';
  }

  function shortcutKeyOptions(selected) {
    let h = '<option value="">' + esc(FB.T('Key')) + '</option>';
    for (const key of ACTION_SHORTCUT_KEYS) {
      h += '<option value="' + key + '"' +
        (selected === key ? ' selected' : '') + '>' +
        key.toUpperCase() + '</option>';
    }
    return h;
  }

  function shortcutRowHtml(index, key, target) {
    return '<div class="shortcut-binding-row" data-shortcut-row="' + index + '">' +
      '<label><span>' + esc(FB.T('Key')) + '</span><select data-shortcut-key>' +
      shortcutKeyOptions(key) + '</select></label>' +
      '<label class="shortcut-action-select"><span>' + esc(FB.T('Action')) +
      '</span><select data-shortcut-target>' + shortcutTargetOptions(target) +
      '</select></label><button type="button" class="btn small" ' +
      'data-shortcut-remove aria-label="' + esc(FB.T('Remove shortcut')) + '">' +
      esc(FB.T('Remove')) + '</button><span class="shortcut-binding-status" ' +
      'data-shortcut-status></span></div>';
  }

  function showShortcutSettings(replaceView) {
    const bindings = shortcutBindings();
    const rows = [];
    for (const key of ACTION_SHORTCUT_KEYS) {
      if (bindings[key]) rows.push({ key:key, target:bindings[key] });
    }
    if (!rows.length) rows.push({ key:'', target:'' });
    let body = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Global shortcuts follow named deeds and focus families, not their changing position in a list. Number keys remain reserved for the visible choices in dialogs and Deeds.')) +
      '</p><p class="hint">' + esc(FB.T(
        'The Farming work focus follows the family from Toil in the lord’s fields to Work your land after promotion. Unavailable actions keep their key and explain the current block.')) +
      '</p></div><div class="shortcut-bindings" id="shortcut-bindings">';
    for (let i = 0; i < rows.length; i++) {
      body += shortcutRowHtml(i, rows[i].key, rows[i].target);
    }
    body += '</div><button type="button" class="btn" id="shortcut-add">' +
      esc(FB.T('Add shortcut')) + '</button><div class="progressnote warnote" ' +
      'id="shortcut-conflict" role="alert" hidden></div><div class="gm-footer">' +
      '<button type="button" class="btn primary" id="shortcut-save">' +
      esc(FB.T('Save shortcuts')) + '</button>' +
      '<button type="button" class="btn" id="shortcut-reset">' +
      esc(FB.T('Reset to Defaults')) + '</button>' +
      '<button type="button" class="btn" id="shortcut-back">' +
      esc(FB.T('Back to Settings')) + '</button></div>';
    openModal(FB.T('Keyboard shortcuts'), body, {
      historyView:!replaceView,
      replaceView:!!replaceView,
      modalClass:'fullsheet-modal shortcut-settings-modal',
      historyBackRender:function () { UI.showSettings(); }
    });
    let nextRow = rows.length;
    const root = $('shortcut-bindings');

    function validateShortcutDraft() {
      const used = {};
      let error = '';
      const draftRows = root.querySelectorAll('[data-shortcut-row]');
      for (let i = 0; i < draftRows.length; i++) {
        const key = draftRows[i].querySelector('[data-shortcut-key]').value;
        const target = draftRows[i].querySelector('[data-shortcut-target]').value;
        const statusNode = draftRows[i].querySelector('[data-shortcut-status]');
        if ((key && !target) || (!key && target)) {
          if (!error) error = FB.T('Choose both a key and an action for every shortcut.');
          statusNode.textContent = FB.T('Incomplete binding');
        } else if (key && used[key]) {
          if (!error) error = FB.T('{key} is assigned more than once.', {
            key:key.toUpperCase()
          });
          statusNode.textContent = FB.T('Conflicts with another binding');
        } else if (key && target) {
          used[key] = 1;
          const status = actionShortcutStatus(target);
          statusNode.textContent = status.available
            ? FB.T('Available now: {action}', { action:status.label })
            : FB.T('Reserved but unavailable: {reason}', { reason:status.reason });
        } else {
          statusNode.textContent = '';
        }
      }
      $('shortcut-conflict').hidden = !error;
      $('shortcut-conflict').textContent = error;
      $('shortcut-save').disabled = !!error;
      $('shortcut-add').disabled = draftRows.length >= ACTION_SHORTCUT_KEYS.length;
      return !error;
    }

    function wireShortcutRow(row) {
      row.querySelector('[data-shortcut-key]').addEventListener(
        'change', validateShortcutDraft);
      row.querySelector('[data-shortcut-target]').addEventListener(
        'change', validateShortcutDraft);
      row.querySelector('[data-shortcut-remove]').addEventListener('click', function () {
        row.parentNode.removeChild(row);
        if (!root.querySelector('[data-shortcut-row]')) {
          root.insertAdjacentHTML('beforeend', shortcutRowHtml(nextRow++, '', ''));
          wireShortcutRow(root.lastElementChild);
        }
        validateShortcutDraft();
      });
    }
    const initialRows = root.querySelectorAll('[data-shortcut-row]');
    for (let i = 0; i < initialRows.length; i++) wireShortcutRow(initialRows[i]);
    validateShortcutDraft();
    $('shortcut-add').addEventListener('click', function () {
      root.insertAdjacentHTML('beforeend', shortcutRowHtml(nextRow++, '', ''));
      wireShortcutRow(root.lastElementChild);
      validateShortcutDraft();
      root.lastElementChild.querySelector('[data-shortcut-key]').focus();
    });
    $('shortcut-save').addEventListener('click', function () {
      if (!validateShortcutDraft()) return;
      const saved = {};
      const draftRows = root.querySelectorAll('[data-shortcut-row]');
      for (let i = 0; i < draftRows.length; i++) {
        const key = draftRows[i].querySelector('[data-shortcut-key]').value;
        const target = draftRows[i].querySelector('[data-shortcut-target]').value;
        if (key && target) saved[key] = target;
      }
      FB.game.uiPrefs.actionBindings = saved;
      FB.game.saveUiPrefs();
      if (FB.state) UI.refresh();
      modalHistoryBack(function () { UI.showSettings(); });
    });
    $('shortcut-reset').addEventListener('click', function () {
      const defaults = FB.game.ACTION_SHORTCUT_DEFAULTS || {
        q:'action:livelihoods'
      };
      FB.game.uiPrefs.actionBindings = {};
      for (const key in defaults) {
        FB.game.uiPrefs.actionBindings[key] = defaults[key];
      }
      FB.game.saveUiPrefs();
      if (FB.state) UI.refresh();
      showShortcutSettings(true);
    });
    $('shortcut-back').addEventListener('click', function () {
      modalHistoryBack(function () { UI.showSettings(); });
    });
  }
  UI.showShortcutSettings = function () { showShortcutSettings(false); };

  /* ================= music ================= */
  UI.showMusicTrack = function (replaceView) {
    const music = FB.music;
    const track = music && music.current();
    if (!music || !track || track.kind === 'intro') {
      UI.toast('No soundtrack song is playing.');
      return;
    }
    const bank = music.currentBank() || (music.banks().filter(function (candidate) {
      return candidate.id === track.bankId;
    })[0] || null);
    const preferred = music.isPreferred(track.id);
    const rating = music.rating(track.id);
    const paused = music.isPaused();
    let h = '<div class="gm-body-text"><p><b>' + esc(track.title) + '</b></p>' +
      '<p>' + esc(music.bankLabel(bank)) + '</p></div>' +
      '<div class="kv"><span>' + esc(FB.T('Length')) + '</span><b>' +
      esc(music.formatDuration(track.duration)) + '</b></div>' +
      '<div class="kv"><span>' + esc(FB.T('Download size')) + '</span><b>' +
      esc(music.formatBytes(track.bytes)) + '</b></div>' +
      '<div class="kv"><span>' + esc(FB.T('Average bitrate')) + '</span><b>' +
      esc(Math.round((track.bitrate || 0) / 1000) + ' kbps Opus') + '</b></div>' +
      '<div class="kv"><span>' + esc(FB.T('Offline copy')) + '</span><b id="music-cache-status">' +
      esc(FB.T('Checking…')) + '</b></div>' +
      '<div class="music-track-actions">' +
      '<div class="music-track-navigation">' +
      '<button class="btn" id="music-previous"' +
      (music.canPrevious() ? '' : ' disabled') + '>' + esc(FB.T('⏮ Previous')) + '</button>' +
      '<button class="btn" id="music-playback" aria-pressed="' + (!paused ? 'true' : 'false') + '">' +
      esc(FB.T(paused ? '▶ Play' : '⏸ Pause')) + '</button>' +
      '<button class="btn" id="music-next">' + esc(FB.T('Next ⏭')) + '</button>' +
      '</div>' +
      '<button class="btn' + (preferred ? ' primary' : '') + '" id="music-prefer">' +
      esc(FB.T(preferred ? '✓ Hear this more' : 'Hear this more')) + '</button>' +
      '<button class="btn' + (music.isRepeating() ? ' primary' : '') + '" id="music-repeat">' +
      esc(FB.T(music.isRepeating() ? '✓ Repeating' : 'Repeat this track')) + '</button>';
    if (FB.platform.isPlay) {
      h += '<button class="btn' + (rating === 1 ? ' primary' : '') + '" id="music-up">' +
        esc(FB.T('👍 Like')) + '</button>' +
        '<button class="btn' + (rating === -1 ? ' primary' : '') + '" id="music-down">' +
        esc(FB.T('👎 Dislike')) + '</button>';
    }
    h += '</div><div class="gm-footer"><button class="btn" id="music-close">' +
      esc(FB.T('Close')) + '</button></div>';
    openModal('Music', h, {
      historyView:!replaceView,
      replaceView:!!replaceView,
      modalClass:'music-track-modal'
    });
    music.isTrackCached(track, function (cached) {
      const status = $('music-cache-status');
      if (status && music.current() && music.current().id === track.id) {
        status.textContent = FB.T(cached ? 'Cached' : 'Not cached');
      }
    });
    $('music-previous').addEventListener('click', function () {
      if (music.previous()) UI.showMusicTrack(true);
    });
    $('music-playback').addEventListener('click', function () {
      if (music.togglePlayback()) UI.showMusicTrack(true);
    });
    $('music-next').addEventListener('click', function () {
      if (music.next()) UI.showMusicTrack(true);
    });
    $('music-prefer').addEventListener('click', function () {
      music.togglePreferred(track.id);
      UI.showMusicTrack(true);
    });
    $('music-repeat').addEventListener('click', function () {
      music.setRepeat(!music.isRepeating());
      UI.showMusicTrack(true);
    });
    if ($('music-up')) {
      $('music-up').addEventListener('click', function () {
        music.rate(track.id, 1);
        UI.showMusicTrack(true);
      });
      $('music-down').addEventListener('click', function () {
        music.rate(track.id, -1);
        UI.showMusicTrack(true);
      });
    }
    $('music-close').addEventListener('click', UI.closeModal);
  };

  UI.showMusicDownloads = function (replaceView) {
    const music = FB.music;
    if (!music || !FB.platform.isPlay) return;
    const banks = music.banks();
    const catalog = music.catalog();
    let h = '<div class="gm-body-text"><p>' + esc(FB.T(
      'Download complete banks before going offline. Browser storage can still be cleared by the browser or by clearing site data.')) +
      '</p><p id="music-storage-summary" class="hint">' + esc(FB.T('Checking browser storage…')) +
      '</p></div><div id="music-download-progress" class="music-download-progress hidden"></div>';
    for (let i = 0; i < banks.length; i++) {
      const bank = banks[i];
      const downloaded = music.isBankDownloaded(bank.id);
      const selected = FB.game.uiPrefs.musicOfflineFallback === bank.id;
      h += '<div class="music-bank-row"><b>' + esc(music.bankLabel(bank)) + '</b>' +
        '<span class="adesc">' + esc(FB.T('{count} songs · {duration} · {size}', {
          count:bank.trackIds.length,
          duration:music.formatDuration(bank.duration),
          size:music.formatBytes(bank.bytes)
        })) + '</span><div class="music-bank-actions">' +
        (downloaded
          ? '<button class="btn small" data-music-use="' + esc(bank.id) + '"' +
            (selected ? ' disabled' : '') + '>' + esc(FB.T(selected ? 'Offline fallback' : 'Use if unmatched')) + '</button>' +
            '<button class="btn small danger" data-music-remove="' + esc(bank.id) + '">' +
            esc(FB.T('Remove')) + '</button>'
          : '<button class="btn small" data-music-download="' + esc(bank.id) + '">' +
            esc(FB.T('Download bank')) + '</button>') +
        '</div></div>';
    }
    h += '<div class="music-bank-row"><b>' + esc(FB.T('Complete soundtrack')) + '</b>' +
      '<span class="adesc">' + esc(FB.T('{count} songs · {duration} · {size}', {
        count:catalog.tracks.length,
        duration:music.formatDuration(catalog.totalDuration),
        size:music.formatBytes(catalog.totalBytes)
      })) + '</span><div class="music-bank-actions">' +
      '<button class="btn small primary" id="music-download-all">' +
      esc(FB.T(FB.game.uiPrefs.musicOfflineAll ? 'Downloaded' : 'Download all')) + '</button>' +
      '<button class="btn small danger" id="music-remove-all">' + esc(FB.T('Remove all music')) + '</button>' +
      '<button class="btn small hidden" id="music-cancel-download">' + esc(FB.T('Cancel download')) + '</button>' +
      '</div></div><div class="gm-footer"><button class="btn" id="music-download-back">' +
      esc(FB.T('Back to Settings')) + '</button></div>';
    openModal('Music for offline play', h, {
      historyView:!replaceView,
      replaceView:!!replaceView,
      modalClass:'fullsheet-modal music-download-modal',
      historyBackRender:function () { UI.showSettings(); }
    });

    music.storageSummary(function (storage) {
      const note = $('music-storage-summary');
      if (!note) return;
      note.textContent = storage && storage.quota
        ? FB.T('{used} used of approximately {quota} available to this browser.', {
          used:music.formatBytes(storage.usage), quota:music.formatBytes(storage.quota)
        })
        : FB.T('The browser did not report its available storage.');
    });

    function progress(done, total, bytes, totalBytes) {
      const note = $('music-download-progress');
      if (!note) return;
      note.classList.remove('hidden');
      note.textContent = FB.T('Downloading {done}/{total} · {bytes}/{size}', {
        done:done, total:total,
        bytes:music.formatBytes(bytes), size:music.formatBytes(totalBytes)
      });
      $('music-cancel-download').classList.remove('hidden');
    }
    function finished(error) {
      if (error && error.message !== 'Download cancelled') UI.toast('Music download failed.');
      else if (!error) UI.toast('Music is ready for offline play.');
      UI.showMusicDownloads(true);
    }
    document.querySelectorAll('[data-music-download]').forEach(function (button) {
      button.addEventListener('click', function () {
        const id = button.getAttribute('data-music-download');
        const bank = banks.filter(function (candidate) { return candidate.id === id; })[0];
        if (!bank || !window.confirm(FB.T('Download {size} for offline music?', {
          size:music.formatBytes(bank.bytes)
        }))) return;
        music.requestPersistentStorage();
        music.downloadBank(id, progress, finished);
      });
    });
    document.querySelectorAll('[data-music-use]').forEach(function (button) {
      button.addEventListener('click', function () {
        music.useOfflineBank(button.getAttribute('data-music-use'));
        UI.showMusicDownloads(true);
      });
    });
    document.querySelectorAll('[data-music-remove]').forEach(function (button) {
      button.addEventListener('click', function () {
        music.removeBank(button.getAttribute('data-music-remove'), function () {
          UI.showMusicDownloads(true);
        });
      });
    });
    $('music-download-all').disabled = !!FB.game.uiPrefs.musicOfflineAll;
    $('music-download-all').addEventListener('click', function () {
      if (!window.confirm(FB.T('Download the complete {size} soundtrack for offline play?', {
        size:music.formatBytes(catalog.totalBytes)
      }))) return;
      music.requestPersistentStorage();
      music.downloadAll(progress, finished);
    });
    $('music-remove-all').addEventListener('click', function () {
      music.removeAll(function () { UI.showMusicDownloads(true); });
    });
    $('music-cancel-download').addEventListener('click', function () {
      music.cancelDownload();
    });
    $('music-download-back').addEventListener('click', function () {
      modalHistoryBack(function () { UI.showSettings(); });
    });
  };

  /* ================= settings ================= */
  UI.showSettings = function () {
    const G = FB.game;
    const WORDS = ['slowest', 'slow', 'the default', 'fast', 'fastest'];
    const desktopKeyboard = !FB.isTouch && !FB.isSmallScreen();
    const realmHighlightColor = FB.map.focusColor();
    const realmHighlightOpacity = Math.round((FB.map.focusOpacity
      ? FB.map.focusOpacity() : 1) * 100);
    let h = '<div class="gm-body-text"><p>' + (desktopKeyboard
      ? esc(FB.T('How quickly the days flow while time runs — on a keyboard, −/+ change it at any time.'))
      : esc(FB.T('How quickly the days flow while time runs.'))) +
      '</p></div>';
    h += '<div class="speedrow"><input type="range" id="set-speed" min="0" max="' +
      (G.SPEEDS.length - 1) + '" step="1" value="' + G.speedIdx + '" aria-label="' +
      esc(FB.T('Speed of days')) + '">' +
      '<div class="adesc" id="set-speed-label">' + speedLabel(G.speedIdx) + '</div></div>';
    h += '<div class="gm-body-text" style="margin-top:8px"><p>' +
      esc(FB.T('Map')) + '</p></div>' +
      '<div class="realm-highlight-summary"><span id="set-realm-highlight-swatch" ' +
      'class="realm-highlight-swatch" style="background-color:' +
      esc(realmHighlightColor) + '" aria-hidden="true"></span><p class="adesc">' +
      esc(FB.T(
        'Choose the focus outline and, when you are independent, your realm’s map color.')) +
      '</p></div><div class="realm-highlight-opacity">' +
      '<label class="realm-highlight-opacity-label" for="set-realm-highlight-opacity">' +
      '<span>' + esc(FB.T('Realm fill opacity')) + '</span>' +
      '<output id="set-realm-highlight-opacity-value" for="set-realm-highlight-opacity">' +
      esc(FB.T('{percent}%', { percent:realmHighlightOpacity })) + '</output></label>' +
      '<input id="set-realm-highlight-opacity" type="range" min="0" max="100" ' +
      'step="5" value="' + realmHighlightOpacity +
      '" aria-describedby="set-realm-highlight-opacity-help">' +
      '<p class="adesc" id="set-realm-highlight-opacity-help">' + esc(FB.T(
        'Lower opacity lets the terrain show through while the focus outline stays clear.')) +
      '</p></div><div class="modal-actions realm-highlight-actions">' +
      '<label class="btn realm-highlight-change" id="set-realm-highlight-change">' +
      '<span>' + esc(FB.T('Change realm highlight color…')) + '</span>' +
      '<input id="set-realm-highlight-color" class="realm-highlight-input" ' +
      'type="color" aria-label="' + esc(FB.T('Realm highlight color')) +
      '" value="' + esc(realmHighlightColor) + '"></label>' +
      '<button type="button" class="btn" id="set-realm-highlight-reset">' +
      esc(FB.T('Use default ivory')) + '</button></div>';
    h += '<div class="gm-body-text" style="margin-top:8px"><p>' +
      esc(FB.T('Music')) + '</p></div>';
    if (!FB.music || !FB.music.hasCatalog()) {
      h += '<div class="hint">' + esc(FB.T('No soundtrack files are installed in this build.')) + '</div>';
    } else if (!FB.music.supported()) {
      h += '<div class="hint">' + esc(FB.T('This browser cannot play the Opus soundtrack.')) + '</div>';
    } else {
      h += '<label class="autorow"><input type="checkbox" id="set-music-enabled"' +
        (FB.music.enabled() ? ' checked' : '') + '> <b>' + esc(FB.T('Play music')) +
        '</b><span class="adesc">' + esc(FB.music.bandwidthText()) + '</span></label>' +
        '<div class="speedrow"><input type="range" id="set-music-volume" min="0" max="100" step="1" value="' +
        Math.round(G.uiPrefs.musicVolume * 100) + '" aria-label="' + esc(FB.T('Music volume')) + '">' +
        '<div class="adesc" id="set-music-volume-label">' +
        esc(FB.T('Volume {percent}%', { percent:Math.round(G.uiPrefs.musicVolume * 100) })) + '</div></div>' +
        (FB.platform.isPlay
          ? '<button type="button" class="btn shortcut-settings-entry" id="set-music-offline">' +
            '<span class="shortcut-settings-title">' + esc(FB.T('Music for offline play…')) +
            '</span><span class="adesc">' +
            esc(FB.T('Download a bank or the complete soundtrack before going offline.')) + '</span></button>'
          : '');
    }
    h += '<div class="gm-body-text" style="margin-top:8px"><p>' +
      esc(FB.T('Deeds panel')) + '</p></div>' +
      '<label class="autorow"><input type="checkbox" id="set-hide-beginner-hints"' +
      (G.uiPrefs.hideBeginnerHints ? ' checked' : '') + '> <b>' +
      esc(FB.T('Hide beginner hints')) + '</b><span class="adesc">' +
      esc(FB.T('Hide path guidance in the Deeds panel. Future beginner guidance will use this preference too.')) +
      '</span></label>';
    if (desktopKeyboard) {
      const bindingCount = Object.keys(shortcutBindings()).length;
      h += '<div class="gm-body-text" style="margin-top:8px"><p>' +
        esc(FB.T('Keyboard')) + '</p></div>' +
        '<button type="button" class="btn shortcut-settings-entry" ' +
        'id="set-shortcuts"><span class="shortcut-settings-title">' +
        esc(FB.T('Keyboard shortcuts…')) + '</span><span class="adesc">' + esc(FB.T(
          '{count} semantic bindings saved. Number keys remain positional in dialogs.', {
            count:bindingCount
          })) + '</span></button>';
    }
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
    const realmColorInput = $('set-realm-highlight-color');
    const realmColorSwatch = $('set-realm-highlight-swatch');
    const realmOpacityInput = $('set-realm-highlight-opacity');
    const realmOpacityOutput = $('set-realm-highlight-opacity-value');
    function repaintRealmMap() {
      if (UI.mapDirty) UI.mapDirty();
      else FB.map.request();
    }
    function setRealmColor(color) {
      if (!/^#[0-9a-fA-F]{6}$/.test(color)) return;
      color = color.toLowerCase();
      G.uiPrefs.realmHighlightColor = color;
      G.saveUiPrefs();
      realmColorInput.value = color;
      realmColorSwatch.style.backgroundColor = color;
      repaintRealmMap();
    }
    function realmOpacityPercent(value) {
      return Math.round(FB.clamp(Number(value) || 0, 0, 100));
    }
    function showRealmOpacity(value) {
      const percent = realmOpacityPercent(value);
      realmOpacityInput.value = percent;
      realmOpacityOutput.textContent = FB.T('{percent}%', { percent:percent });
      return percent;
    }
    function setRealmOpacity(value) {
      const percent = showRealmOpacity(value);
      G.uiPrefs.realmHighlightOpacity = percent / 100;
      G.saveUiPrefs();
      repaintRealmMap();
    }
    realmColorInput.addEventListener('input', function () {
      setRealmColor(realmColorInput.value);
    });
    realmColorInput.addEventListener('change', function () {
      setRealmColor(realmColorInput.value);
    });
    realmOpacityInput.addEventListener('input', function () {
      showRealmOpacity(realmOpacityInput.value);
    });
    realmOpacityInput.addEventListener('change', function () {
      setRealmOpacity(realmOpacityInput.value);
    });
    $('set-realm-highlight-reset').addEventListener('click', function () {
      setRealmColor('#e8dec4');
    });
    if ($('set-music-enabled')) {
      $('set-music-enabled').addEventListener('change', function () {
        FB.music.setEnabled($('set-music-enabled').checked);
      });
      const musicVolume = $('set-music-volume');
      musicVolume.addEventListener('input', function () {
        const value = parseInt(musicVolume.value, 10);
        $('set-music-volume-label').textContent = FB.T('Volume {percent}%', { percent:value });
        FB.music.setVolume(value / 100);
      });
      if ($('set-music-offline')) {
        $('set-music-offline').addEventListener('click', function () {
          UI.showMusicDownloads(false);
        });
      }
    }
    $('set-hide-beginner-hints').addEventListener('change', function () {
      G.uiPrefs.hideBeginnerHints = $('set-hide-beginner-hints').checked;
      G.saveUiPrefs();
      if (FB.state && !G.observe) renderActions();
    });
    if ($('set-shortcuts')) {
      $('set-shortcuts').addEventListener('click', UI.showShortcutSettings);
    }
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
        resetPanelMarkup();
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
      '<textarea id="sl-itext" class="savetext" rows="6" placeholder="FBS2.…"></textarea>' +
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
     life as save text (the same FBS2. blob Import wakes). There is no server to
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

  function guideBody(paragraphs, bullets) {
    let h = '<div class="guide-entry-body">';
    for (const paragraph of (paragraphs || [])) {
      h += '<p>' + esc(paragraph) + '</p>';
    }
    if (bullets && bullets.length) {
      h += '<ul>';
      for (const bullet of bullets) h += '<li>' + esc(bullet) + '</li>';
      h += '</ul>';
    }
    return h + '</div>';
  }

  function roleOrientationBody(def) {
    let h = '<div class="role-orientation">' +
      kv('New resources', esc(def.resources)) +
      kv('Recurring duties', esc(def.duties)) +
      '<div class="panelh">' + esc(FB.T('Good first actions')) +
      '</div><ol>';
    for (const action of def.actions) h += '<li>' + esc(action) + '</li>';
    return h + '</ol></div>';
  }

  function skillGuideDefinition(id) {
    const defs = {
      dip:{
        purpose:FB.T('Diplomacy wins trust and makes other people easier to persuade.'),
        consumers:FB.T('It shapes Standing, courtship and marriage, diplomacy, councils, and many social event checks.'),
        aliases:'charisma persuasion standing courtship marriage relations'
      },
      mar:{
        purpose:FB.T('Martial measures command, drill, and judgment in dangerous contests.'),
        consumers:FB.T('It shapes levies, army command, battle and war choices, and physical or military event checks.'),
        aliases:'war warfare battle army levy command combat'
      },
      ste:{
        purpose:FB.T('Stewardship turns land, labor, and property into reliable value.'),
        consumers:FB.T('It shapes livelihood income, enterprises, construction, trade, and many economic event checks.'),
        aliases:'economy income work enterprise trade building money'
      },
      int:{
        purpose:FB.T('Intrigue finds secrets, hides intentions, and anticipates hostile schemes.'),
        consumers:FB.T('It shapes plots, rivalries, covert diplomacy, counter-schemes, and many deceptive event checks.'),
        aliases:'plots schemes secrets rivalry spy deception'
      },
      lea:{
        purpose:FB.T('Learning joins literacy, law, medicine, doctrine, and accumulated knowledge.'),
        consumers:FB.T('It shapes national research, education and tutoring, learned career examinations and rewards, advanced Trade guild leadership, religious advancement, Papal systems, and knowledge-oriented checks.'),
        aliases:'research education tutoring careers examinations trade guild religion papal medicine knowledge literacy'
      }
    };
    return defs[id];
  }

  function roleOrientationDefinitions(s) {
    const social = [
      {
        title:FB.T('Serf'),
        summary:FB.T('Your household survives under another lord’s authority.'),
        resources:FB.T('Money, Common Voice, and Standing with your lord measure your immediate room to act.'),
        duties:FB.T('Seasonal subsistence and obligations leave little margin; a livelihood keeps the household viable.'),
        actions:[FB.T('Choose a daily focus.'), FB.T('Review Work & Enterprises.'), FB.T('Use Deeds to build money, reputation, and a route to freedom.')]
      },
      {
        title:FB.T('Freeholder'),
        summary:FB.T('Your household is personally free and can accumulate durable property and local influence.'),
        resources:FB.T('Money, land plots, guild Standing, and local relationships open longer plans.'),
        duties:FB.T('Keep the household working and turn scattered assets into a stable holding.'),
        actions:[FB.T('Review Work & Enterprises.'), FB.T('Build a connected holding.'), FB.T('Use local service, guilds, or faith to establish the family.')]
      },
      {
        title:FB.T('Gentry'),
        summary:FB.T('Your house has social standing but no territorial title.'),
        resources:FB.T('Prestige, liege Standing, household offices, and an established house support noble advancement.'),
        duties:FB.T('Maintain the house across generations; landed status usually belongs to an heir of an established line.'),
        actions:[FB.T('Review Household Plan.'), FB.T('Serve a lord or church office.'), FB.T('Prepare an eligible heir and the prestige for a barony.')]
      },
      {
        title:FB.T('Baron'),
        summary:FB.T('You now hold territorial land and its county-level obligations.'),
        resources:FB.T('County tax, levy, development, domain capacity, and liege Standing become central.'),
        duties:FB.T('Develop and defend the holding while meeting feudal and institutional obligations.'),
        actions:[FB.T('Open Governance.'), FB.T('Inspect county development and buildings.'), FB.T('Pursue a county through right, petition, or war.')]
      },
      {
        title:FB.T('Count'),
        summary:FB.T('A county and its settlements now anchor your territorial house.'),
        resources:FB.T('Domain tax, levy, vassal relations, development, and de jure rights drive expansion.'),
        duties:FB.T('Balance direct land, vassals, liege demands, and succession.'),
        actions:[FB.T('Review Governance.'), FB.T('Develop the demesne.'), FB.T('Consolidate the rightful duchy.')]
      },
      {
        title:FB.T('Duke'),
        summary:FB.T('Several counties now form a regional principality under your rule.'),
        resources:FB.T('Vassals, domain capacity, de jure duchy rights, councils, and national technology matter together.'),
        duties:FB.T('Keep regional lords useful and contain overextension or factional pressure.'),
        actions:[FB.T('Review vassals and institutions.'), FB.T('Set political and research priorities.'), FB.T('Consolidate a kingdom and independence.')]
      },
      {
        title:FB.T('King'),
        summary:FB.T('You are sovereign over a kingdom and its national institutions.'),
        resources:FB.T('Crown authority, council support, national research, diplomacy, and the full realm host become strategic resources.'),
        duties:FB.T('Govern institutions, manage great vassals, defend the crown, and secure succession.'),
        actions:[FB.T('Review Governance and Council.'), FB.T('Direct national research.'), FB.T('Build alliances and imperial rights.')]
      },
      {
        title:FB.T('Emperor'),
        summary:FB.T('Several kingdoms answer to an imperial crown.'),
        resources:FB.T('Imperial vassals, national institutions, diplomacy, and succession determine whether the realm endures.'),
        duties:FB.T('Hold the summit: contain powerful subjects, preserve legitimacy, and keep the dynasty playable.'),
        actions:[FB.T('Review every Governance section.'), FB.T('Protect the successor and crown.'), FB.T('Choose long-range diplomatic and research priorities.')]
      }
    ];
    const out = {};
    for (let tier = 0; tier < social.length; tier++) {
      const def = social[tier];
      out['role-tier-' + tier] = {
        id:'role-tier-' + tier,
        title:def.title,
        summary:def.summary,
        resources:def.resources,
        duties:def.duties,
        actions:def.actions,
        guideId:'role-tier-' + tier
      };
    }
    const vocations = {
      monk:{
        title:FB.T('Letters & Faith'),
        summary:FB.T('A learned religious vocation advances through study, service, and the rules of the current faith.'),
        resources:FB.T('Learning, piety, religious Standing, and vocation experience support advancement.'),
        duties:FB.T('Continue the vocation’s yearly work and meet the faith-specific rank requirements.'),
        actions:[FB.T('Review Work & Enterprises.'), FB.T('Inspect religious advancement.'), FB.T('Use study, pilgrimage, teaching, or patronage when available.')]
      },
      priest:{
        title:FB.T('Clerical Service'),
        summary:FB.T('A public religious vocation combines worship, teaching, law, and care of souls.'),
        resources:FB.T('Learning, piety, religious Standing, and vocation experience support advancement.'),
        duties:FB.T('Continue clerical service and meet the current faith’s office requirements.'),
        actions:[FB.T('Review Work & Enterprises.'), FB.T('Inspect religious advancement.'), FB.T('Build piety and relationships with religious authorities.')]
      },
      bishop:{
        title:FB.T('Bishop'),
        summary:FB.T('A bishop governs a non-hereditary church see beside the playable dynasty.'),
        resources:FB.T('See income, retinue, piety, church Standing, and appointment authority matter.'),
        duties:FB.T('Govern the see without confusing it with hereditary family land.'),
        actions:[FB.T('Open the Bishopric.'), FB.T('Review investiture and episcopal powers.'), FB.T('Prepare for Cardinal eligibility when available.')]
      },
      cardinal:{
        title:FB.T('Cardinal'),
        summary:FB.T('A Cardinal belongs to the Papal college and can shape or contest an election.'),
        resources:FB.T('Curial Standing, order, bloc, piety, and relationships within the college matter.'),
        duties:FB.T('Navigate the college while maintaining the character’s household and other offices.'),
        actions:[FB.T('Open Papacy.'), FB.T('Review the college and current obedience.'), FB.T('Build support before an election.')]
      },
      pope:{
        title:FB.T('Pope'),
        summary:FB.T('The Pope directs an obedience while remaining the playable member of the dynasty.'),
        resources:FB.T('Papal authority, Curial opinion, investiture law, piety, and international Standing matter.'),
        duties:FB.T('Govern the church, appointments, sanctions, and any rival obedience.'),
        actions:[FB.T('Open Papacy.'), FB.T('Review authority and investiture.'), FB.T('Use appointments and diplomacy before coercive powers.')]
      }
    };
    for (const id in vocations) {
      const def = vocations[id];
      out['role-' + id] = {
        id:'role-' + id,
        title:def.title,
        summary:def.summary,
        resources:def.resources,
        duties:def.duties,
        actions:def.actions,
        guideId:'role-' + id
      };
    }
    return out;
  }

  function currentOrientationIds(s) {
    if (!s || !s.player || !s.chars[s.player.charId]) return [];
    const me = s.chars[s.player.charId];
    const ids = ['role-tier-' + s.player.tier];
    const career = FB.careerOf && FB.careerOf(s, me);
    if (career && (career.profession === 'monk' ||
        career.profession === 'priest')) {
      ids.push('role-' + career.profession);
    }
    if (FB.hasBishopric && FB.hasBishopric(s, me)) ids.push('role-bishop');
    const papal = FB.papalOfficeOf && FB.papalOfficeOf(s, me);
    if (papal && papal.office === 'cardinal') ids.push('role-cardinal');
    if (papal && papal.office === 'pope') ids.push('role-pope');
    return ids;
  }

  /* A role orientation is a small focused sheet — new resources, duties, and
     first actions for the role just entered — never the whole Guide. The
     Guide stays one tap away for the player who wants the full manual. */
  UI.showRoleOrientation = function (id) {
    const s = FB.state;
    const def = roleOrientationDefinitions(s)[id];
    if (!s || !def) return false;
    if (!s.player.roleOrientationsSeen) s.player.roleOrientationsSeen = {};
    s.player.roleOrientationsSeen[id] = 1;
    openModal(def.title,
      '<div class="gm-body-text"><p>' + esc(def.summary) + '</p></div>' +
      roleOrientationBody(def) +
      '<div class="gm-footer">' +
      '<button class="btn primary" id="orientation-continue">' +
      esc(FB.T('Continue')) + '</button>' +
      '<button class="btn" id="orientation-guide">' +
      esc(FB.T('Read more in the Guide')) + '</button></div>',
      { historyView:true });
    $('orientation-continue').addEventListener('click', function () {
      modalHistoryBack(function () { UI.closeModal(); });
    });
    $('orientation-guide').addEventListener('click', function () {
      UI.showGuideEntry(def.guideId);
    });
    return true;
  };

  UI.maybeShowRoleOrientation = function () {
    const s = FB.state;
    if (!s || !s.player || s.player.dead || FB.game.observe ||
        !$('eventmodal').classList.contains('hidden') ||
        !$('genmodal').classList.contains('hidden') ||
        $('game').classList.contains('hidden')) return false;
    if (!s.player.roleOrientationsSeen) s.player.roleOrientationsSeen = {};
    const ids = currentOrientationIds(s);
    for (const id of ids) {
      if (!s.player.roleOrientationsSeen[id]) {
        return UI.showRoleOrientation(id);
      }
    }
    return false;
  };

  /* First-open panel intros: one small focused sheet the first time a
     tutorial life opens a major panel — a summary, a few things worth
     knowing, and a Guide deep-link, never the whole Guide. Per-save records
     live in player.panelIntrosSeen; the layer defers to Hide beginner hints. */
  function panelIntroDefinitions() {
    return {
      prov:{ title:FB.T('The Land tab'), guideId:'settlements-development',
        summary:FB.T('Every county of the known world, up close: its settlement, its holder, and its development.'),
        hints:[
          FB.T('Tap a province on the map to inspect it here.'),
          FB.T('Land is bought plot by plot within a settlement — a cluster of plots makes a manor.'),
          FB.T('Once you hold land, your own counties are managed from this tab.')
        ] },
      network:{ title:FB.T('The Network tab'), guideId:'family-scopes',
        summary:FB.T('The people and institutions tied to your household — family, retainers, connections, guilds, and courts — and what each tie currently does.'),
        hints:[
          FB.T('Connections form through deeds, work, guilds, and your lord’s court.'),
          FB.T('Personal attention improves one chosen relationship a little each day.'),
          FB.T('Retainers serve the household for seasonal pay once you can keep them.')
        ] },
      family:{ title:FB.T('The Kin tab'), guideId:'family-scopes',
        summary:FB.T('Your household and wider family — spouse, children, and kin: the people who continue the chronicle when this life ends.'),
        hints:[
          FB.T('Courtship and marriage deeds live in the Deeds tab, under Life & Family.'),
          FB.T('Tap a child to set their education focus and schooling.'),
          FB.T('Without an heir, the story ends with this life.')
        ] }
    };
  }

  UI.showPanelIntro = function (id) {
    const s = FB.state;
    const def = s && panelIntroDefinitions()[id];
    if (!def) return false;
    if (!s.player.panelIntrosSeen) s.player.panelIntrosSeen = {};
    s.player.panelIntrosSeen[id] = 1; // marked only when actually shown
    let hints = '';
    for (const hint of def.hints) hints += '<li>' + esc(hint) + '</li>';
    openModal(def.title,
      '<div class="gm-body-text"><p>' + esc(def.summary) + '</p></div>' +
      '<div class="role-orientation"><div class="panelh">' + esc(FB.T('Good to know')) +
      '</div><ol>' + hints + '</ol></div>' +
      '<div class="gm-footer">' +
      '<button class="btn primary" id="panel-intro-continue">' +
      esc(FB.T('Continue')) + '</button>' +
      '<button class="btn" id="panel-intro-guide">' +
      esc(FB.T('Read more in the Guide')) + '</button></div>',
      { historyView:true });
    $('panel-intro-continue').addEventListener('click', function () {
      modalHistoryBack(function () { UI.closeModal(); });
    });
    $('panel-intro-guide').addEventListener('click', function () {
      UI.showGuideEntry(def.guideId);
    });
    return true;
  };

  UI.maybeShowPanelIntro = function (tabId) {
    const s = FB.state;
    if (!s || !s.player || s.player.dead || FB.game.observe ||
        !$('eventmodal').classList.contains('hidden') ||
        !$('genmodal').classList.contains('hidden') ||
        $('game').classList.contains('hidden')) return false;
    if (!FB.tutorialLife || !FB.tutorialLife(s)) return false;
    if (FB.game.uiPrefs && FB.game.uiPrefs.hideBeginnerHints) return false;
    if (!s.player.panelIntrosSeen) s.player.panelIntrosSeen = {};
    if (s.player.panelIntrosSeen[tabId]) return false;
    return UI.showPanelIntro(tabId);
  };

  function guideEntries(s) {
    const entries = [];
    function add(id, category, title, summary, body, aliases, route) {
      entries.push({
        id:id, category:category, title:title, summary:summary,
        body:body, aliases:aliases || '', route:route || null
      });
    }
    add('day-to-day', 'basics', FB.T('Day by day'),
      FB.T('Focuses continue; deeds happen once; time stops for choices.'),
      guideBody([
        FB.T('A focus repeats each day until changed. A deed is a one-shot act and normally spends the day. Events pause time until you choose.'),
        FB.T('Space plays or pauses time; F skips to the next happening. On touch screens the same controls are in the top bar.')
      ]), 'focus deed actions pause skip time keyboard mobile');

    for (const id of FB.SKILLS) {
      const def = skillGuideDefinition(id);
      add('skill-' + id, 'skills', FB.skillName(id),
        def.purpose,
        guideBody([def.purpose, def.consumers,
          FB.T('The displayed value is current even when one of these systems is unavailable to this character. Individual events may use the skill in additional checks.')]),
        def.aliases + ' ' + def.consumers + ' ' + id);
    }

    add('resources', 'resources', FB.T('Resources and reputation'),
      FB.T('Money pays; prestige legitimizes; piety supports faith; Standing belongs to a relationship.'),
      guideBody([
        FB.T('Money belongs to the playable household and pays costs, upkeep, wages, gifts, and contracts. Prestige supports social and political advancement. Piety supports religious acts and offices.'),
        FB.T('Standing is scoped: a person, realm, lord, Pope, guild, or institution can each hold a different opinion. Common Voice is popular support. Guild Standing belongs to an active vocational guild record.'),
        s ? FB.T('Current household: {money:gold}; prestige {prestige}; piety {piety}; Common Voice {voice}.', {
          gold:Math.floor(s.player.gold),
          prestige:Math.floor(s.player.prestige),
          piety:Math.floor(s.player.piety),
          voice:Math.round(FB.popEffective ? FB.popEffective(s) : s.player.pop)
        }) : FB.T('Start a life to see current resource values here.')
      ]), 'gold wealth coin prestige piety standing opinion common voice guild research');

    add('roles', 'roles', FB.T('Social and religious roles'),
      FB.T('Rank changes authority and duties; vocations and offices can sit beside it.'),
      guideBody([
        FB.T('The social ladder runs Serf, Freeholder, Gentry, Baron, Count, Duke, King, and Emperor. Rank controls authority and access; it does not erase a livelihood or religious vocation.'),
        FB.T('Religious ranks and offices can coexist with the dynasty’s social station. Select a role entry below to see its orientation.')
      ]), 'rank station promotion vocation office noble church');
    const orientations = roleOrientationDefinitions(s);
    for (const id in orientations) {
      const def = orientations[id];
      add(id, 'roles', def.title, def.summary,
        roleOrientationBody(def),
        'orientation onboarding promotion duties resources first actions');
    }

    add('careers', 'careers', FB.T('Careers, training, and work'),
      FB.T('A career record keeps rank and experience even while inactive.'),
      guideBody([
        FB.T('Work & Enterprises lists only assignable members of the managed household. A visible relative elsewhere is family, but is not household labor.'),
        FB.T('Changing careers preserves the inactive record’s rank, experience, specialization, examination cooldown, guild rank, Standing, and start year. Ordinary apprentices train until sixteen; landed rulers keep their former calling as biography.'),
        FB.T('Administration, Medicine, and Scholarship teach letters during their trainee stage. Licensed practice and permanent specializations require Lettered, Learning, vocational years, technology, fees, and a professional examination whose chance rises with skill.')
      ]), 'work livelihood apprenticeship occupation inactive household');
    if (s) {
      for (const id in (FBDATA.careers || {})) {
        const def = FBDATA.careers[id];
        const name = dt(s, 'career', id, def, 'name');
        const requirements = [];
        if (def.tierMin) requirements.push(FB.T('{station} or higher', {
          station:FB.stationName(def.tierMin)
        }));
        if (def.apprenticeAge) requirements.push(FB.T('training from age {age}', {
          age:def.apprenticeAge
        }));
        if (def.requiresTech) requirements.push(techRequirementText(s, def.requiresTech));
        const careerParagraphs = [
          dt(s, 'career', id, def, 'desc'),
          FB.T('Primary skill: {skill}. {requirements}', {
            skill:FB.skillName(def.skill),
            requirements:requirements.join(' · ') || FB.T('No special prerequisite.')
          })
        ];
        if (def.learned) {
          careerParagraphs.push(FB.T(
            '{years} trainee years grant Lettered. Licensing and permanent master specializations are shown with their exact experience, skill, technology, fee, chance, and retry requirements in Work & Enterprises.', {
              years:Math.max(1, Number(def.literacyYears) || 2)
            }));
        }
        add('career-' + id, 'careers', name,
          dt(s, 'career', id, def, 'desc'),
          guideBody(careerParagraphs), id + ' ' + FB.skillName(def.skill) + ' ' +
          requirements.join(' '));
      }
    }

    add('family-scopes', 'family', FB.T('Family, house, and household scope'),
      FB.T('Visible kin, a dynasty, the managed household, and the playable line are different sets.'),
      guideBody([], [
        FB.T('Playable line: the current protagonist and the eligible successor you can continue as. The chronicle, family property, enterprises, contracts, role-orientation history, and most money survive; prestige, piety, and Common Voice are reduced. Personal Standing, courtship, plots, attention, cooldowns, and the named-heir choice reset for the new life.'),
        FB.T('House or dynasty: characters sharing the house identity. Same-house membership matters for wider succession, but does not by itself make someone controllable or resident.'),
        FB.T('Managed household: the playable head, resident spouses and descendants, and hired retainers that Work & Enterprises can assign when age, station, faith, and career rules allow. Unwed, unlanded, unvowed siblings living at the household home can also be put to work, though they never join the household itself; marriage, land, vows, or moving away ends that.'),
        FB.T('Visible family: the broader family tree, including dead kin and relatives living elsewhere. Visibility is not control.'),
        FB.T('Royal branch: the designated crown successor’s branch. A marriage tie alone does not redirect a crown into the playable line.')
      ]), 'dynasty house kin relatives resident controllable assignable work royal branch');
    add('inheritance', 'family', FB.T('Succession and inheritance'),
      FB.T('Living children lead; without them the succession walks outward through same-house branches.'),
      guideBody([
        FB.T('A named heir moves an already eligible candidate to the front. It cannot make a spouse, dead relative, different-house relative, or blocked branch eligible.'),
        FB.T('Living sons then daughters are eligible first. With no living child, the order continues through same-house grandchildren, siblings, nieces and nephews, uncles and aunts, then cousins.'),
        FB.T('The successor picker shows the current reason beside every reviewed candidate. Territorial, office, debt, item, and household transfers then follow their own succession rules.'),
        FB.T('A head aged {age} or older may instead retire through the Hand over the house deed: an adult successor takes over without death dues, and the retired elder remains visible family at home, no longer under your control.', {
          age: FBDATA.balance.retirementAge !== undefined ?
            FBDATA.balance.retirementAge : 50
        })
      ]), 'heir successor named heir children grandchildren siblings house death retirement abdication');
    add('child-identity', 'family', FB.T('Child culture, faith, and house'),
      FB.T('Marriage previews show which parent supplies each identity.'),
      guideBody([
        FB.T('Children in the protagonist line take culture, faith, and house from the recorded playable-line parent, preserving the line across succession.'),
        FB.T('Collateral births take culture and faith from the managed family parent. Their house follows the father: a son keeps his house, while a daughter’s child normally belongs to her spouse’s house.'),
        FB.T('These identity rules do not change the child’s recorded mother and father.')
      ]), 'birth culture religion faith dynasty house father mother collateral protagonist marriage');
    add('exceptional-sibling-courtship', 'family',
      FB.T('Exceptional sibling courtship'),
      FB.T('A rare player-only route uses traits, one irreversible approach, and severe social or religious costs.'),
      guideBody([
        FB.T('Ordinary courtship, arranged matches, AI marriages, and royal offers still forbid siblings and every closer lineal or avuncular relation. Only the current player may approach an adult opposite-sex full or half sibling who is free to marry, in the same county, at +40 Standing, and only while no other courtship is active.'),
        FB.T('The player needs a net trait score of +1: Lustful +2; Cynical or Deceitful +1; Chaste −2; Honest −1; Ambitious +1 only when succession or title interests make the match dynastically relevant; Zealous +1 under an authorizing rite but −2 otherwise; Lettered +1 under that rite.'),
        FB.T('The sibling then makes an independent response roll. Their Standing contributes up to +30 percentage points. Lustful, Ambitious, Cynical, Deceitful, Zealous, Chaste, Content, and Honest alter consent according to the route and dynastic stakes. Without any receptive target trait, an illicit response chance cannot exceed 10%. A refusal is permanent.'),
        FB.T('An accepted suit uses ordinary personal attention and needs +80 Standing before proposal. A rejected proposal is permanent; breaking off an accepted suit prevents renewal for five years. No sibling match ever creates a dowry, royal compact, or alliance.'),
        FB.T('A couple sharing a faith with the xwēdōdah doctrine may use its recognized rite for 75 piety and {money:25}. Otherwise an illicit courtship risks exposure each season, and an irregular wedding costs 75 piety and 25 prestige, lowers Common Voice and liege Standing, and gives both spouses Scandalous Union.'),
        FB.T('Children of full siblings receive a 20% close-kin health-risk roll; children of half siblings receive 10%. Each parent already born of close kin adds five percentage points, to a maximum of 35%. The roll may add Frail, add Sickly, or reduce health by one.')
      ]), 'sibling brother sister courtship incest forbidden xwedodah scandal traits consent exposure child health');

    const provinceId = s && s.player && s.player.provinceId;
    add('settlements-development', 'settlements',
      FB.T('Settlements and development'),
      FB.T('Historical places and growth derived from county development.'),
      guideBody([
        FB.T('Settlements are not founded manually. Significant counties show researched historical places — every realm capital, faith seat, and great city of the start date — while generated local names fill the remaining slots. The same place keeps one identity in both start dates, with a name and standing appropriate to the year.'),
        FB.T('The county’s current development derives how many places appear and whether the leading ones are villages, towns, or a city, never below a historical place’s authored standing.'),
        provinceId ? settlementDevelopmentText(s, provinceId) :
          FB.T('Start a life to see the next threshold for the current county.'),
        provinceId ? bookmarkDevelopmentText(s, provinceId) :
          FB.T('The county screen separates its authored bookmark start from later growth.'),
        FB.T('Zoom in on the map to reveal settlement markers: county heads and great cities first, every place at the closest zoom. Tap a marker for its sheet — buildings, and any household property in that exact place. Sheets abroad are read-only; construction and demolition appear only in your own demesne.'),
        FB.T('Buildings that grant development identify the immediate amount when raised. National technologies can raise every county’s development ceiling in that nation above its base of 10.')
      ]), 'county village town city threshold growth bookmark historical buildings development ceiling map markers');

    if (s && FB.techUiRelevant(s)) {
      add('technology', 'technology', FB.T('Technology and research'),
        FB.T('Technology belongs to the sovereign nation and unlocks authored content.'),
        guideBody([
          FB.T('National research fills sovereign research slots. Knowledge follows sovereign allegiance, not the player’s dynasty or ownership of one county.'),
          FB.T('Catalogue search includes technology names, descriptions, effects, prerequisite labels, and every authored unlock. Details distinguish prerequisites that require all listed technologies from those that accept any one.'),
          FB.T('Locked enterprises and deeds link back to their prerequisite technology.')
        ]), 'research national tech unlock prerequisite all any press house lever oil');
      for (const id in (FBDATA.tech || {})) {
        const def = FBDATA.tech[id];
        const unlocks = techGameplayUnlocks(s, id, def);
        const effects = techScalarEffects(def);
        const prerequisite = techPrerequisiteSummary(s, def);
        const discovery = unlocks.concat(effects);
        if (prerequisite) discovery.push(prerequisite);
        add('tech-' + id, 'technology',
          def.icon + ' ' + dt(s, 'tech', id, def, 'name'),
          dt(s, 'tech', id, def, 'desc'),
          guideBody([dt(s, 'tech', id, def, 'desc')],
            discovery.length ? discovery : [FB.T('No separate gameplay unlock is authored.')]),
          id + ' ' + discovery.join(' '), { kind:'tech', id:id });
      }
    }

    add('travel', 'travel', FB.T('Travel and journeys'),
      FB.T('Choose a purpose first; valid destinations and the route are then derived.'),
      guideBody([
        FB.T('Travel uses settled county adjacency and authored straits. Purpose, destination, route length, cost, and current eligibility are shown before departure.'),
        FB.T('A journey has outbound, stay, and return phases. The Deeds commitment row shows its current state, and some purposes add decisions while away.')
      ]), 'journey road destination purpose pilgrimage trade court marriage route');
    add('war', 'war', FB.T('War, claims, and conquest'),
      FB.T('Recognized rights avoid aggression penalties; land changes hands only through siege.'),
      guideBody([
        FB.T('Barons and higher rulers compare available conquests through Declare war. A bordering de jure right, a fabricated claim, or a crown-restoration right is recognized; pacts and defensive alliances can still block the declaration.'),
        FB.T('When no recognized right applies to a bordering county, the picker offers a War of Aggression. Its confirmation shows the exact immediate prestige, Common Voice, direct-vassal Standing, and foreign-sovereign Standing changes before anything is committed.'),
        FB.T('Recent aggressive declarations by the same ruler multiply those political costs and increase breakaway pressure. A conquered county receives Conquered Without Right, reducing tax and levy while increasing unrest for its listed duration.'),
        FB.T('A declaration must still be won on the map. March the host to the named prize and complete three siege steps at war councils. Field victories can produce peace offers but do not transfer the target by themselves.')
      ]), 'war warfare aggression aggressive casus belli claim fabricated de jure conquest siege host peace breakaway conquered without right');
    add('government', 'government', FB.T('Government systems'),
      FB.T('Territorial rank opens Governance; institutions vary by relationship to the crown.'),
      guideBody([
        FB.T('Governance appears for territorial landed rulers. It brings together position, vassals, institutions, political blocs, and available realm actions.'),
        FB.T('Vassal-tier estates negotiate aid and scutage. Sovereign kings and emperors instead govern through the royal council, crown authority, national research, diplomacy, and other crown systems.'),
        FB.T('Unavailable sections state the rank, relationship, office, or current-state reason that keeps them inactive.')
      ]), 'governance realm council parliament estates crown authority vassal king emperor');
    return entries;
  }

  const guideView = { query:'', category:'all', entry:'' };
  const GUIDE_CATEGORIES = [
    'all', 'basics', 'skills', 'resources', 'roles', 'careers',
    'family', 'settlements', 'technology', 'travel', 'war', 'government'
  ];
  function guideCategoryName(id) {
    const names = {
      all:FB.T('All topics'),
      basics:FB.T('Basics'),
      skills:FB.T('Skills'),
      resources:FB.T('Resources'),
      roles:FB.T('Roles'),
      careers:FB.T('Careers'),
      family:FB.T('Family'),
      settlements:FB.T('Settlements'),
      technology:FB.T('Technology'),
      travel:FB.T('Travel'),
      war:FB.T('War'),
      government:FB.T('Government')
    };
    return names[id] || id;
  }

  UI.showGuide = function (options) {
    if (options && typeof options.preventDefault === 'function') options = null;
    options = options || {};
    const s = FB.state;
    if (options.category) guideView.category = options.category;
    if (options.query !== undefined) guideView.query = options.query;
    const entries = guideEntries(s);
    const guideCategories = GUIDE_CATEGORIES.filter(function (category) {
      return category !== 'technology' || (s && FB.techUiRelevant(s));
    });
    let activeCategory = guideView.category;
    if (guideCategories.indexOf(activeCategory) < 0) activeCategory = 'all';
    let activeQuery = guideView.query;
    guideView.entry = '';
    if (options.entry) {
      const requested = entries.filter(function (entry) {
        return entry.id === options.entry;
      })[0];
      if (requested) {
        guideView.entry = requested.id;
        activeCategory = requested.category;
        activeQuery = '';
      }
    }
    let h = '<div class="guide-controls" id="guide-controls">' +
      '<label><span>' + esc(FB.T('Search guide')) +
      '</span><input id="guide-search" type="search" value="' +
      esc(activeQuery) + '" placeholder="' +
      esc(FB.T('Topic, alias, unlock, or term')) + '"></label>' +
      '<label><span>' + esc(FB.T('Category')) +
      '</span><select id="guide-category">';
    for (const category of guideCategories) {
      h += '<option value="' + esc(category) + '"' +
        (activeCategory === category ? ' selected' : '') + '>' +
        esc(guideCategoryName(category)) + '</option>';
    }
    h += '</select></label></div><div class="guide-results" id="guide-results">';
    for (const entry of entries) {
      const search = (entry.title + ' ' + entry.summary + ' ' +
        entry.aliases + ' ' + entry.category).toLowerCase();
      const detailId = 'guide-entry-detail-' + entry.id;
      h += '<div class="guide-card"><button type="button" class="guide-result" data-guide-entry="' +
        esc(entry.id) + '" data-guide-category="' + esc(entry.category) +
        '" data-search="' + esc(search) + '" aria-expanded="false" ' +
        'aria-controls="' + esc(detailId) + '"><b>' + esc(entry.title) +
        '</b><span>' + esc(entry.summary) + '</span></button>' +
        '<div class="guide-entry-detail hidden" id="' + esc(detailId) + '">' +
        entry.body;
      if (entry.route && entry.route.kind === 'tech') {
        h += '<div class="guide-entry-actions"><button class="btn" ' +
          'data-guide-tech="' + esc(entry.route.id) + '">' +
          esc(FB.T('Open technology detail')) + '</button></div>';
      }
      h += '</div></div>';
    }
    h += '</div><div class="tech-empty hidden" id="guide-empty">' +
      esc(FB.T('No guide entries match this search.')) +
      '</div><div class="gm-footer"><button class="btn" id="guide-close">' +
      esc(FB.T('Close')) + '</button></div>';
    openModal(FB.T('Guide'), h, {
      modalClass:'fullsheet-modal guide-modal', historyView:true
    });
    $('guide-category').value = activeCategory;
    function applyGuideFilters(saveView) {
      const queryValue = $('guide-search').value.trim();
      const categoryValue = $('guide-category').value;
      if (saveView !== false) {
        guideView.query = queryValue;
        guideView.category = categoryValue;
      }
      const query = queryValue.toLowerCase();
      let visible = 0;
      document.querySelectorAll('[data-guide-entry]').forEach(function (button) {
        const categoryMatch = categoryValue === 'all' ||
          button.dataset.guideCategory === categoryValue;
        const queryMatch = !query || button.dataset.search.indexOf(query) >= 0;
        button.parentNode.classList.toggle(
          'hidden', !(categoryMatch && queryMatch));
        if (categoryMatch && queryMatch) visible++;
      });
      $('guide-empty').classList.toggle('hidden', visible > 0);
    }
    function expandGuideEntry(id) {
      document.querySelectorAll('[data-guide-entry]').forEach(function (button) {
        const expanded = button.dataset.guideEntry === id;
        button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        button.parentNode.classList.toggle('expanded', expanded);
        $(button.getAttribute('aria-controls')).classList.toggle(
          'hidden', !expanded);
      });
      guideView.entry = id;
    }
    $('guide-search').addEventListener('input', applyGuideFilters);
    $('guide-category').addEventListener('change', applyGuideFilters);
    document.querySelectorAll('[data-guide-entry]').forEach(function (button) {
      button.addEventListener('click', function () {
        expandGuideEntry(button.getAttribute('aria-expanded') === 'true'
          ? '' : button.dataset.guideEntry);
      });
    });
    document.querySelectorAll('[data-guide-tech]').forEach(function (button) {
      button.addEventListener('click', function () {
        UI.showTechDetail(button.dataset.guideTech);
      });
    });
    $('guide-close').addEventListener('click', function () {
      if (options.closeToGame) {
        UI.closeModal();
        return;
      }
      modalHistoryBack(function () {
        if (FB.state) UI.showMenu(); else UI.closeModal();
      });
    });
    applyGuideFilters(!guideView.entry);
    if (guideView.entry) {
      const selected = document.querySelector(
        '[data-guide-entry="' + guideView.entry + '"]');
      expandGuideEntry(guideView.entry);
      setTimeout(function () {
        if (!selected || !document.documentElement.contains(selected)) return;
        selected.focus({ preventScroll:true });
        $('gm-body').scrollTop = Math.max(0, selected.parentNode.offsetTop -
          $('guide-controls').offsetHeight - 8);
      }, 0);
    }
  };

  UI.showGuideEntry = function (id) {
    const entry = guideEntries(FB.state).filter(function (candidate) {
      return candidate.id === id;
    })[0];
    if (!entry) return UI.showGuide();
    UI.showGuide({ entry:entry.id });
  };

  UI.showLegacyHelp = function () {
    openModal('How to Play', '<div class="gm-body-text">' +
      '<p><b>Fallowborn</b> is a life-and-dynasty game. You begin in an authored medieval world — most likely poor — and try to raise your family through the ranks of society before old age claims each generation.</p>' +
      '<h4>Day by day</h4><ul>' +
      '<li>Set a <b>focus</b> in the Deeds tab — it is pursued every day until you change it (work the land, drill, haggle, pray, court…).</li>' +
      '<li><b>Deeds</b> are one-shot acts (poach, scheme, propose, petitions…) — each spends the day, and some need time before they can be repeated.</li>' +
      '<li>Press <b>Space</b> (or the Play/Pause button) to set time flowing — days pass on their own — and press it again to pause. <b>F</b> (or ▶▶) skips straight to the next happening. Events halt the days while they await your choice.</li></ul>' +
      '<h4>Climbing the ladder</h4>' +
      '<p>Serf → Freeholder → Gentry → Baron → Count → Duke → King → Emperor. The Deeds tab shows a hint for your next step by default; Settings can hide beginner hints. Wealth, prestige, Standing with your lord, marriage, war-glory, or the church can all raise you.</p>' +
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
      '<p>From baron upward the Deeds tab always shows <b>⚔ Declare war</b>, with the exact reason when it is locked. A county war prefers a bordering <b>de jure right</b> through a duchy, kingdom, or empire you hold, or your one <b>fabricated claim</b> (made through a plot). ' +
      esc(FB.T('Where neither right applies, the picker plainly offers a War of Aggression and requires you to review its escalating political costs and the conquered county’s burden before confirming.')) +
      ' A rare crown-restoration right reaches the usurper’s capital without a shared border. Pacts and defensive alliances forbid attacks. Your host musters when war begins — tap it, then a province to march (or let ⚙ automation command it). You may de-muster a raised host from the Deeds tab: the men preserved for your next muster depend on where it stands — all on your own land, half elsewhere in your realm, none abroad — and re-mustering waits out the same rearm window as a shattering. <b>Land is taken only by siege:</b> stand on the prize and press the siege at three war councils. Allies send abstract defenders only when you are attacked; they never become separate war participants. Field victories make the enemy sue for peace. Attacked yourself? Keep their host out of your lands — three seasons unchecked and a province falls. Past eight seasons, exhaustion ends the war with nothing gained.</p>' +
      '<p>' + esc(FB.T('Water links use local boats at low throughput. A host larger than the available transport needs repeated crossing cycles; national seafaring and naval-organization technologies raise capacity and crossing speed. No separate fleet must be raised.')) + '</p>' +
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

  UI.showHelp = function () {
    UI.showGuide();
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
      '<p>Mods are JSON files merged over the game data (events, provinces, realms, cultures, traits, technology, currency, balance). See <b>docs/MODDING.md</b> in the game folder for the format. You can also edit the files in <b>data/</b> directly.</p>' +
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


  /* ===== shared exports (bound by the later UI files) ===== */
  SH.closeTravelPicker = closeTravelPicker;
  SH.financeAmount = financeAmount;
  SH.interactionRetainerRecord = interactionRetainerRecord;
  SH.itemFxText = itemFxText;
  SH.papalDefinitionText = papalDefinitionText;
  SH.politicalBlocName = politicalBlocName;
  SH.politicalCompactForecast = politicalCompactForecast;
  SH.politicalForecastBloc = politicalForecastBloc;
  SH.politicalMotionName = politicalMotionName;
  SH.politicalPostureText = politicalPostureText;
  SH.politicalTotalsText = politicalTotalsText;
  SH.reviewTravelChoice = reviewTravelChoice;
  SH.techAutomationModeName = techAutomationModeName;
})();
