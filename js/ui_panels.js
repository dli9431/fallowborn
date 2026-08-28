/* Fallowborn — UI: the retained panels: Deeds, Self, Kin, Network, Land, Chronicle; tabs and drawers (split from ui.js). Loads after
   ui_misc.js; shares internals through FB.ui._shared. */
/* Contents: the retained panels: Deeds, Self, Kin, Network, Land, Chronicle; tabs and drawers */
window.FB = window.FB || {};

(function () {
  'use strict';

  const UI = FB.ui;
  const SH = UI._shared;
  const $ = SH.$;
  const actionLabel = SH.actionLabel;
  const allianceText = SH.allianceText;
  const countyCountText = SH.countyCountText;
  const cultureName = SH.cultureName;
  const dt = SH.dt;
  const epithetText = SH.epithetText;
  const esc = SH.esc;
  const firstMissingTech = SH.firstMissingTech;
  const foreignPolicyStanceText = SH.foreignPolicyStanceText;
  const foreignPolicyStatusText = SH.foreignPolicyStatusText;
  const householdStandardsSummary = SH.householdStandardsSummary;
  const initLargeListSurface = SH.initLargeListSurface;
  const kv = SH.kv;
  const largeListRowAttrs = SH.largeListRowAttrs;
  const largeListSurfaceHtml = SH.largeListSurfaceHtml;
  const menText = SH.menText;
  const mobileNavClosed = SH.mobileNavClosed;
  const mobileNavPush = SH.mobileNavPush;
  const modifierChips = SH.modifierChips;
  const openModal = SH.openModal;
  const panelh = SH.panelh;
  const positionDesc = SH.positionDesc;
  const positionEffectText = SH.positionEffectText;
  const positionName = SH.positionName;
  const religionName = SH.religionName;
  const replacePanelMarkup = SH.replacePanelMarkup;
  const roleName = SH.roleName;
  const settlementDevelopmentText = SH.settlementDevelopmentText;
  const signedNumber = SH.signedNumber;
  const socialAttentionSummary = SH.socialAttentionSummary;
  const standingClass = SH.standingClass;
  const standingEffectRow = SH.standingEffectRow;
  const standingSpan = SH.standingSpan;
  const standingText = SH.standingText;
  const standingValue = SH.standingValue;
  const techDevelopmentScore = SH.techDevelopmentScore;
  const technologyName = SH.technologyName;
  const terrainName = SH.terrainName;

  SH.activeTab = 'actions';    // right panel: actions | prov | network | log
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
  const DEED_ITEM_KEYS = ['q', 'w', 'e', 'a', 's', 'd', 'z', 'x', 'c'];
  let activeActionSection = null;
  let activeActionState = null;
  let actionsRenderedState = null;
  let actionsRenderedLocale = '';
  let actionsVisibleSignature = '';
  let deedStatusRefreshedState = null;
  let deedStatusRefreshedTurn = 0;
  let actionsDirty = true;
  const LIVE_DEED_STATUS_DAYS = 7;
  let focusSectionOpen = true;
  function markActionsDirty() {
    actionsDirty = true;
  }
  const NETWORK_SECTIONS = [
    'household', 'connections', 'trade', 'politics', 'realm'
  ];
  let activeNetworkSection = null;
  let activeNetworkState = null;
  const ACTION_SHORTCUT_KEYS = [
    'a', 'i', 'j', 'o', 'p', 'q', 'w', 'x', 'z'
  ];

  function focusShortcutTarget(focus) {
    return focus.shortcutFamily
      ? 'focus-family:' + focus.shortcutFamily : 'focus:' + focus.id;
  }

  function shortcutFamilyLabel(id) {
    if (id === 'farmer-work') return FB.T('Farming work focus');
    return FB.T('Role-specific daily focus');
  }

  function shortcutBindings() {
    const prefs = FB.game && FB.game.uiPrefs;
    const saved = prefs && prefs.actionBindings &&
      typeof prefs.actionBindings === 'object'
      ? prefs.actionBindings : {};
    const available = {};
    for (const key of ACTION_SHORTCUT_KEYS) {
      if (saved[key]) available[key] = saved[key];
    }
    return available;
  }

  function shortcutKeyFor(target) {
    const bindings = shortcutBindings();
    for (const key of ACTION_SHORTCUT_KEYS) {
      if (bindings[key] === target) return key.toUpperCase();
    }
    return '';
  }

  function shortcutHintFor(target) {
    if (FB.isTouch) return '';
    const key = shortcutKeyFor(target);
    return key ? '<span class="keyhint action-keyhint">' + esc(key) + '</span>' : '';
  }

  function actionSectionIndex(id) {
    if (id === 'focus') return 0;
    for (let i = 0; i < ACTION_GROUPS.length; i++) {
      if (ACTION_GROUPS[i].id === id) return i + 1;
    }
    return -1;
  }

  function actionSectionHintFor(id) {
    const index = actionSectionIndex(id);
    if (FB.isTouch || index < 0) return '';
    return '<span class="keyhint deed-section-keyhint">' +
      (index + 1) + '</span>';
  }

  function deedItemHintFor(index) {
    if (FB.isTouch || index < 0) return '';
    const keyCount = DEED_ITEM_KEYS.length;
    if (index < keyCount) {
      return '<span class="keyhint deed-item-keyhint">' +
        DEED_ITEM_KEYS[index].toUpperCase() + '</span>';
    }
    if (index < keyCount * 2) {
      return '<span class="keyhint deed-item-keyhint">⇧' +
        DEED_ITEM_KEYS[index - keyCount].toUpperCase() + '</span>';
    }
    return '';
  }

  function actionSectionButtons(box, id) {
    const body = box.querySelector('[data-action-group-body="' + id + '"]');
    if (!body || body.hidden) return [];
    return id === 'focus'
      ? body.querySelectorAll('[data-focus-id]')
      : body.querySelectorAll('[data-action-id]');
  }

  function refreshDeedPanelShortcuts() {
    const box = $('tab-actions');
    if (!box) return;
    const headers = box.querySelectorAll('[data-action-section]');
    let activeFound = false;
    for (let i = 0; i < headers.length; i++) {
      const active = headers[i].getAttribute('data-action-section') ===
        activeActionSection;
      headers[i].classList.toggle('deed-section-active', active);
      if (active) {
        activeFound = true;
        headers[i].setAttribute('aria-current', 'true');
      } else {
        headers[i].removeAttribute('aria-current');
      }
    }
    if (activeActionSection && !activeFound) activeActionSection = null;
    const globalHints = box.querySelectorAll('.action-keyhint');
    for (let i = 0; i < globalHints.length; i++) {
      const conflicts = activeActionSection && DEED_ITEM_KEYS.indexOf(
        globalHints[i].textContent.toLocaleLowerCase()) >= 0;
      /* Once a section is active, its compact grid wins over overlapping
         configured bindings. Hide badges that cannot currently fire. */
      globalHints[i].classList.toggle('hidden', !!conflicts);
    }
    const oldHints = box.querySelectorAll('.deed-item-keyhint');
    for (let i = 0; i < oldHints.length; i++) {
      oldHints[i].parentNode.removeChild(oldHints[i]);
    }
    if (FB.isTouch || !activeActionSection) return;
    const buttons = actionSectionButtons(box, activeActionSection);
    for (let i = 0; i < buttons.length && i < DEED_ITEM_KEYS.length * 2; i++) {
      buttons[i].insertAdjacentHTML('afterbegin', deedItemHintFor(i));
    }
  }

  function setActiveActionSection(id) {
    /* Item hotkeys click a control in the section that is already active.
       Avoid removing and recreating all nine badges before the action's own
       ordinary UI refresh. */
    if (activeActionSection === id) return;
    activeActionSection = id;
    refreshDeedPanelShortcuts();
  }

  UI.activateDeedSection = function (index) {
    if (index < 0 || index > ACTION_GROUPS.length) return false;
    const box = $('tab-actions');
    if (!box) return true;
    const id = index === 0 ? 'focus' : ACTION_GROUPS[index - 1].id;
    const header = box.querySelector('[data-action-section="' + id + '"]');
    if (!header) return true;
    const repeatToggles = !!(FB.game && FB.game.uiPrefs &&
      FB.game.uiPrefs.repeatDeedSectionHotkeys);
    if (header.getAttribute('aria-expanded') === 'false' ||
        (repeatToggles && activeActionSection === id)) {
      header.click();
    } else {
      setActiveActionSection(id);
    }
    header.scrollIntoView({ block:'start' });
    header.focus({ preventScroll:true });
    return true;
  };

  /* Onboarding can teach a deed only if its real section is open and the
     control is on screen. Keep this routing inside the Deeds panel, which
     owns its grouping and retained disclosure state. */
  UI.revealDeedAction = function (id) {
    let action = null;
    for (const candidate of FB.instants || []) {
      if (candidate.id === id) {
        action = candidate;
        break;
      }
    }
    const group = action && action.group || 'realm';
    actionGroupsOpen[group] = true;
    activeActionSection = group;
    setTab('actions', { history:false });
    const target = document.querySelector(
      '#tab-actions [data-action-id="' + id + '"]');
    if (!target) return false;
    target.scrollIntoView({ block:'center' });
    return true;
  };

  UI.revealTutorialGuidance = function () {
    setTab('actions', { history:false });
    const target = document.querySelector('#tutorial-guidance');
    if (!target) return false;
    target.scrollIntoView({ block:'start' });
    return true;
  };

  UI.runDeedItemShortcut = function (key, run, shift) {
    if (!activeActionSection) return false;
    const normalized = String(key || '').toLocaleLowerCase();
    let index = DEED_ITEM_KEYS.indexOf(normalized);
    if (index < 0) return false;
    if (shift) index += DEED_ITEM_KEYS.length;
    const box = $('tab-actions');
    const buttons = box ? actionSectionButtons(box, activeActionSection) : [];
    if (run !== false && index < buttons.length && !buttons[index].disabled) {
      UI._gmModalKey = (shift ? 'shift+' : '') + normalized;
      const actId = buttons[index].getAttribute('data-action-id');
      if (actId) {
        UI._gmModalAction = actId;
        UI._gmModalTarget = 'action:' + actId;
      }
      buttons[index].click();
    }
    return true;
  };

  function networkSectionButtons(box, id) {
    const section = box.querySelector('[data-list-section="' + id + '"]');
    const body = section && section.querySelector('.large-list-section-body');
    if (!body || body.hidden) return [];
    const candidates = body.querySelectorAll('[data-network-action]');
    return Array.prototype.filter.call(candidates, function (button) {
      let node = button;
      while (node && node !== body) {
        if (node.hidden) return false;
        node = node.parentElement;
      }
      return true;
    });
  }

  function refreshNetworkPanelShortcuts() {
    const box = $('tab-network');
    if (!box) return;
    const headings = box.querySelectorAll('[data-list-toggle]');
    let activeFound = false;
    for (let i = 0; i < headings.length; i++) {
      const active = headings[i].getAttribute('data-list-toggle') ===
        activeNetworkSection;
      headings[i].classList.toggle('network-section-active', active);
      if (active) {
        activeFound = true;
        headings[i].setAttribute('aria-current', 'true');
      } else {
        headings[i].removeAttribute('aria-current');
      }
    }
    if (activeNetworkSection && !activeFound) activeNetworkSection = null;
    const oldHints = box.querySelectorAll('.network-item-keyhint');
    for (let i = 0; i < oldHints.length; i++) {
      oldHints[i].parentNode.removeChild(oldHints[i]);
    }
    if (FB.isTouch || !activeNetworkSection) return;
    const buttons = networkSectionButtons(box, activeNetworkSection);
    for (let i = 0; i < buttons.length && i < DEED_ITEM_KEYS.length * 2; i++) {
      buttons[i].insertAdjacentHTML('afterbegin',
        deedItemHintFor(i).replace('deed-item-keyhint',
          'deed-item-keyhint network-item-keyhint'));
    }
  }

  function setActiveNetworkSection(id) {
    activeNetworkSection = id;
    refreshNetworkPanelShortcuts();
  }

  UI.activateNetworkSection = function (index) {
    if (index < 0 || index >= NETWORK_SECTIONS.length) return false;
    const box = $('tab-network');
    if (!box) return true;
    const id = NETWORK_SECTIONS[index];
    const heading = box.querySelector('[data-list-toggle="' + id + '"]');
    if (!heading) return true;
    if (heading.getAttribute('aria-expanded') === 'false' ||
        activeNetworkSection === id) {
      heading.click();
    } else {
      setActiveNetworkSection(id);
    }
    heading.scrollIntoView({ block:'start' });
    heading.focus({ preventScroll:true });
    return true;
  };

  UI.runNetworkItemShortcut = function (key, run, shift) {
    if (!activeNetworkSection) return false;
    const normalized = String(key || '').toLocaleLowerCase();
    let index = DEED_ITEM_KEYS.indexOf(normalized);
    if (index < 0) return false;
    if (shift) index += DEED_ITEM_KEYS.length;
    const box = $('tab-network');
    const buttons = box ? networkSectionButtons(box, activeNetworkSection) : [];
    if (run !== false && index < buttons.length && !buttons[index].disabled) {
      UI._gmModalKey = (shift ? 'shift+' : '') + normalized;
      UI._gmModalAction = null;
      UI._gmModalTarget = null;
      buttons[index].click();
    }
    return true;
  };

  function shortcutTargetDefinition(target) {
    const s = FB.state;
    if (target.indexOf('action:') === 0) {
      const id = target.slice(7);
      let action = null;
      for (const candidate of FB.instants || []) {
        if (candidate.id === id && !candidate.compatibilityAlias) {
          action = candidate;
          break;
        }
      }
      if (!action) return null;
      return {
        kind:'action', id:id, definition:action,
        label:s ? actionLabel(s, id, action) : FB.T(action.label)
      };
    }
    if (target.indexOf('focus-family:') === 0) {
      const family = target.slice(13);
      return {
        kind:'focus-family', id:family,
        label:shortcutFamilyLabel(family)
      };
    }
    if (target.indexOf('focus:') === 0) {
      const id = target.slice(6);
      let focus = null;
      for (const candidate of FB.focuses || []) {
        if (candidate.id === id) { focus = candidate; break; }
      }
      if (!focus) return null;
      return {
        kind:'focus', id:id, definition:focus,
        label:s && FB.focusLabel ? FB.focusLabel(s, focus) : FB.T(focus.label)
      };
    }
    return null;
  }

  function actionShortcutStatus(target) {
    const definition = shortcutTargetDefinition(target);
    const s = FB.state;
    if (!definition) {
      return {
        available:false,
        label:FB.T('Unavailable saved action'),
        reason:FB.T('This saved action no longer exists. Edit or reset the binding in Settings.')
      };
    }
    if (!s || !s.player) {
      return {
        available:false, label:definition.label,
        reason:FB.T('Start or load a game before using this shortcut.')
      };
    }
    if (definition.kind === 'action') {
      let listed = null;
      for (const item of FB.listInstants(s)) {
        if (item.a.id === definition.id) {
          listed = item;
          break;
        }
      }
      if (!listed) {
        return {
          available:false, label:definition.label,
          reason:FB.T('This action is not available in your current role or situation.')
        };
      }
      return {
        available:!!listed.can, label:definition.label,
        reason:listed.can ? '' : FB.translateKnown(listed.reason),
        run:function () { FB.runInstant(FB.state, definition.id); }
      };
    }
    const shown = FB.listFocuses(s);
    let selected = null;
    for (const focus of shown) {
      if ((definition.kind === 'focus' && focus.id === definition.id) ||
          (definition.kind === 'focus-family' &&
            focus.shortcutFamily === definition.id)) {
        selected = focus;
        break;
      }
    }
    if (!selected) {
      return {
        available:false, label:definition.label,
        reason:FB.T('No focus in this binding is available in your current role or situation.')
      };
    }
    const label = definition.kind === 'focus-family'
      ? FB.T('{family}: {focus}', {
        family:definition.label,
        focus:FB.focusLabel ? FB.focusLabel(s, selected) :
          dt(s, 'focus', selected.id, selected, 'label')
      }) : definition.label;
    return {
      available:true, label:label, reason:'',
      run:function () { FB.setFocus(FB.state, selected.id); }
    };
  }
  UI.actionShortcutStatus = actionShortcutStatus;
  UI.actionShortcutKeys = ACTION_SHORTCUT_KEYS.slice();
  UI.runActionShortcut = function (key) {
    const normalized = String(key || '').toLocaleLowerCase();
    if (ACTION_SHORTCUT_KEYS.indexOf(normalized) < 0) return false;
    const target = shortcutBindings()[normalized];
    if (!target) return false;
    const status = actionShortcutStatus(target);
    if (!status.available || !status.run) {
      UI.toast(FB.T('{action} — {reason}', {
        action:status.label, reason:status.reason
      }));
      return true;
    }
    UI._gmModalKey = normalized;
    UI._gmModalTarget = target;
    if (target.indexOf('action:') === 0) {
      UI._gmModalAction = target.slice(7);
    }
    status.run();
    return true;
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
    const threshold = FB.socialAttentionStandingThreshold
      ? FB.socialAttentionStandingThreshold(s, target)
      : FB.relationshipOpinionThreshold();
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
        ? SH.techAutomationModeName(FB.game.auto.researchMode)
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
    if (travel.returnVenture) {
      const rGood = FBDATA.marketGoods[travel.returnVenture.goodId];
      const rGoodName = rGood
        ? dt(s, 'marketGood', travel.returnVenture.goodId, rGood, 'name')
        : travel.returnVenture.goodId;
      status += ' · ' + (travel.returnVenture.status === 'resolved'
        ? FB.T('return cargo sold: {money:payout}', {
          payout:travel.returnVenture.payout || 0
        })
        : (travel.returnVenture.status === 'cancelled'
          ? FB.T('return cargo cancelled')
          : FB.T('return cargo: {quantity} units of {good}', {
            quantity:Math.round(travel.returnVenture.quantity * 10) / 10,
            good:rGoodName
          })));
    }
    /* A frontier withdrawal shows its gateway, work milestones, residence
       progress, and whether the permanent homestead is available yet. */
    if (travel.purpose === 'frontier' && FB.frontierStatus) {
      const frontier = FB.frontierStatus(s);
      if (frontier) {
        status += ' · ' + FB.T('gateway: {gateway}', {
          gateway:frontier.gatewayName
        });
        status += ' · ' + FB.T('frontier work {done}/{needed}', {
          done:frontier.milestones, needed:frontier.milestonesRequired
        });
        if (travel.phase === 'arrived') {
          status += ' · ' + (frontier.settlementReady
            ? FB.T('the homestead can be made permanent')
            : FB.T('residence {days}/{required} days', {
              days:Math.min(frontier.stayDays, frontier.residenceRequired),
              required:frontier.residenceRequired
            }));
        }
      }
    }
    return status;
  }

  function financeCommitmentText(s) {
    const economy = FB.ensureEconomy ? FB.ensureEconomy(s) : null;
    const loans = FB.financeActiveLoans ? FB.financeActiveLoans(s, economy) : [];
    const partnerships = FB.financeActivePartnerships
      ? FB.financeActivePartnerships(s, economy) : [];
    const ventures = FB.financeActiveTradeVentures
      ? FB.financeActiveTradeVentures(s, economy) : [];
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
    /* Serfs keep almost none of these levers (no travel, no research say,
       no political attention), so the whole section stays out of their way. */
    if (s.player.tier === 0) return '';
    const focus = currentFocusDef(s);
    const travel = s.player.travel;
    const attentionTarget = FB.socialAttentionTarget(s);
    const attentionCapacity = FB.politicalAttentionCapacity(s);
    const finance = financeCommitmentText(s);
    const hostilePlot = s.player.plot && FBDATA.plots[s.player.plot.id] &&
      FBDATA.plots[s.player.plot.id].hostile ? s.player.plot : null;
    const intrigueCaptive = FB.intrigueCaptiveOf
      ? FB.intrigueCaptiveOf(s, s.player.charId) : null;
    const intrigueCaptured = FB.intrigueCaptivityOf
      ? FB.intrigueCaptivityOf(s, s.player.charId) : null;
    const intrigueLeverage = FB.intrigueLeverageOf
      ? FB.intrigueLeverageOf(s, s.player.charId) : null;
    const collapsed = !!(FB.game.uiPrefs &&
      FB.game.uiPrefs.commitmentsCollapsed);
    let h = '<section class="ongoing-commitments' +
      (collapsed ? ' collapsed' : '') +
      '" id="ongoing-commitments" ' +
      'aria-labelledby="ongoing-commitments-title"><div class="ongoing-commitments-head">' +
      '<h3 id="ongoing-commitments-title"><button type="button" ' +
      'class="ongoing-commitments-toggle" id="ongoing-commitments-toggle" ' +
      'aria-expanded="' + (collapsed ? 'false' : 'true') + '" ' +
      'aria-controls="ongoing-commitment-list"><span>' +
      esc(FB.T('Ongoing commitments')) +
      '</span><span aria-hidden="true">' + (collapsed ? '▸' : '▾') +
      '</span></button></h3>' + (collapsed
        ? '</div><div class="ongoing-commitment-list" ' +
          'id="ongoing-commitment-list" hidden></div></section>'
        :
        '<p>' + esc(FB.T(
          'These assignments keep their own capacities, rules, and consequences.')) +
        '</p></div><div class="ongoing-commitment-list" ' +
        'id="ongoing-commitment-list">');
    if (collapsed) return h;
    h += ongoingCommitmentRow({
      id:'focus',
      icon:'◉',
      label:FB.T('Daily focus'),
      status:focus
        ? (FB.focusLabel ? FB.focusLabel(s, focus) :
          dt(s, 'focus', focus.id, focus, 'label')) +
          (travel ? ' · ' + FB.T('paused while traveling') : '')
        : FB.T('No focus selected'),
      action:travel ? FB.T('Paused') : FB.T('Change…'),
      disabled:!!travel
    });
    if (hostilePlot || intrigueCaptive || intrigueCaptured || intrigueLeverage) {
      const intrigueParts = [];
      if (hostilePlot) {
        const hostileDef = FBDATA.plots[hostilePlot.id];
        intrigueParts.push(FB.T('{plot}: {power}/{needed}', {
          plot:dt(s, 'plot', hostilePlot.id, hostileDef, 'name'),
          power:Math.floor(hostilePlot.power), needed:hostileDef.need
        }));
      }
      if (intrigueCaptive) intrigueParts.push(FB.T('one captive'));
      if (intrigueCaptured) intrigueParts.push(FB.T('you are captive'));
      if (intrigueLeverage) intrigueParts.push(FB.T('one leverage record'));
      h += ongoingCommitmentRow({
        id:'intrigue', icon:'🕸', label:FB.T('Intrigue affairs'),
        status:intrigueParts.join(' · '), action:FB.T('Review…')
      });
    }
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
    if (FB.techUiRelevant(s)) {
      h += ongoingCommitmentRow({
        id:'research',
        icon:'💡',
        label:FB.T('National research'),
        status:researchCommitmentText(s),
        action:FB.techRealmId(s) === 'player' && FB.isPlayerSovereign(s)
          ? FB.T('Manage…') : FB.T('Review…')
      });
    }
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

  /* Tab nudge badges: a gold dot on the tab holding the next unfinished
     beginner lesson (Deeds until the first deed, Kin until the first
     look). Pure state reads; the CSS dot carries no meaning on its own. */
  function updateTabNudges(s) {
    const on = !!(s && FB.tutorialActive && FB.tutorialActive(s) &&
      (!FB.game.uiPrefs || !FB.game.uiPrefs.hideBeginnerHints));
    const flags = (s && s.player && s.player.flags) || {};
    const deedsTab = document.querySelector('#sidetabs .tab[data-tab="actions"]');
    if (deedsTab) deedsTab.classList.toggle('nudge', !!(on && !flags.tut_deed));
    const kinTab = document.querySelector('#lefttabs .tab[data-tab="family"]');
    if (kinTab) kinTab.classList.toggle('nudge', !!(on &&
      flags.tut_track_first_steps && !flags.tut_family_established &&
      !flags.tut_kin_tab));
  }

  function renderTab(name, reuse) {
    if (name === 'char') renderChar();
    else if (name === 'family') renderFamily();
    else if (name === 'actions') renderActions(reuse);
    else if (name === 'prov') renderProv();
    else if (name === 'network') renderNetwork();
    else renderLog();
  }

  function renderActiveTab(options) {
    /* The game chrome can be shown with no life behind it (title-screen and
       soundtrack harnesses drive it directly): every tab render dereferences
       the state, so with none there is nothing to paint. */
    if (!FB.state) return;
    const liveTick = !!(options && options.liveTick);
    if (FB.game && FB.game.observe) { // a watcher needs only the land and the chronicle
      if (!liveTick || SH.activeTab === 'log') {
        renderTab(SH.activeTab === 'prov' ? 'prov' : 'log');
      }
      return;
    }
    /* Natural days change the lightweight topbar immediately. Retain all
       calculation-heavy panel trees until an exact/player-driven refresh.
       Chronicle appends only new entries; Deeds uses a bounded status-only
       pass that leaves its catalogue and listeners mounted. */
    if (liveTick) {
      refreshLiveSelfValues();
      if (SH.activeTab === 'actions') refreshVisibleDeedStatuses();
      else if (SH.activeTab === 'log') renderLog();
      updateTabNudges(FB.state);
      return;
    }
    // on phones Self/Kin is a closed drawer most of the time (display:none →
    // offsetParent null): skip its rebuild and portrait repaints while it
    // cannot be seen — setTab renders it the moment it opens
    if ($('leftbody').offsetParent !== null) {
      renderTab(activeLeftTab);
    }
    renderTab(SH.activeTab);
    updateTabNudges(FB.state);
  }

  function renderDeedsWarCard(s) {
    const w = s.player && s.player.war;
    if (!w) return '';
    const en = s.realms[w.enemy];
    const enemyName = en ? en.name : (w.enemy || '?');
    const wins = w.wins || 0;
    const losses = w.losses || 0;
    const battleOdds = Math.round(FB.namedChance(s, 'war_battle') * 100);

    const feedback = FB.warFeedback ? FB.warFeedback(s) : null;
    const pHost = FB.playerHost ? FB.playerHost(s) : null;
    const men = pHost ? pHost.men :
      Math.round(Math.max(FBDATA.balance.armyMinMen || 40, FB.playerLevy(s)) * (w.strength || 1) +
        (w.mercCos || 0) * (FBDATA.balance.mercCompanySize || 150));
    const conditionPct = Math.round((w.strength || 1) * 100);
    const hostPlace = pHost ? (FB.world.byId[pHost.at] ? FB.world.byId[pHost.at].name : '?') : FB.T('Not yet mustered');

    const supplyInfo = (pHost && FB.hostSupplyStatus) ? FB.hostSupplyStatus(s, pHost) : null;
    const supplyStatus = supplyInfo
      ? (supplyInfo.status === 'starving' ? FB.T('Starving') : (supplyInfo.status === 'low' ? FB.T('Low') : FB.T('Good')))
      : FB.T('Good');
    const supplyPct = supplyInfo ? Math.round(supplyInfo.supply) : 100;
    const selectedHostUpkeep = FB.playerHostUpkeepParts ? FB.playerHostUpkeepParts(s) : null;
    let supplyUpkeepLine = FB.T('🥖 {status} ({pct}%)', { status: supplyStatus, pct: supplyPct });
    if (selectedHostUpkeep) {
      supplyUpkeepLine += ' · ' + FB.T('💰 {money:amount}/season', { amount: SH.financeAmount(selectedHostUpkeep.total) });
    }

    const hostLine = FB.T('~{men} ({condition}%) · 🚩 {place}', {
      men: menText(s, men), condition: conditionPct, place: hostPlace
    });

    const pinned = pHost && FB.fortPinnedStatus ? FB.fortPinnedStatus(s, pHost) : null;
    let oddsLine = FB.T('🎯 ~{odds}% chance', { odds: battleOdds });
    if (pinned) {
      oddsLine += ' · ' + FB.T('⛓ Pinned by {fort}', { fort: pinned.name });
    }

    // Build the detailed breakdown for Tooltip / Mobile Disclosure
    let detailsHtml = '';

    // 1. Host condition & unit composition
    detailsHtml += '<div class="land-section-title">' + esc(FB.T('Host & Units')) + '</div>';
    detailsHtml += '<div>' + esc(FB.T('Your host: ~{men} at {condition}% condition', {
      men: menText(s, men), condition: conditionPct
    })) + '</div>';
    if (pHost && pHost.units && FB.unitClassParts) {
      const parts = FB.unitClassParts(s, pHost.units);
      if (parts.length) {
        detailsHtml += '<div>' + esc(parts.join(' · ')) + '</div>';
      }
    }
    if (w.mercCos) {
      detailsHtml += '<div>' + esc(FB.T('{count} mercenary companies hired', { count: w.mercCos })) + '</div>';
    }

    // 2. Battle record & Campaign losses
    if (feedback) {
      detailsHtml += '<div class="land-section-title" style="margin-top:8px">' + esc(FB.T('Battle & Campaign Record')) + '</div>';
      detailsHtml += '<div>' + esc(FB.warBattleRecordText(s, feedback)) + '</div>';
      detailsHtml += '<div>' + esc(FB.warLossesText(s, feedback)) + '</div>';
      const effectText = FB.warEffectsText(s, feedback);
      if (effectText) detailsHtml += '<div>' + esc(effectText) + '</div>';
      detailsHtml += '<div style="font-size:12px;color:var(--helper-text-color);margin-top:3px">' +
        esc(FB.T('Campaign condition, leadership, and refits tilt every field battle; live troop totals change only when a loss names the host.')) + '</div>';
    }

    // 3. Logistics & Supply
    detailsHtml += '<div class="land-section-title" style="margin-top:8px">' + esc(FB.T('Logistics & Supply')) + '</div>';
    if (supplyInfo) {
      if (supplyInfo.status === 'starving') {
        detailsHtml += '<div>🥀 ' + esc(FB.T('Starving — supplies are gone and hunger thins its ranks daily.')) + '</div>';
      } else if (supplyInfo.status === 'low') {
        detailsHtml += '<div>🥖 ' + esc(FB.T('Low on supplies — forage before starvation sets in.')) + '</div>';
      } else {
        detailsHtml += '<div>🥖 ' + esc(FB.T('Supplies replenished from friendly territory.')) + '</div>';
      }
    }
    if (feedback) {
      detailsHtml += '<div>' + esc(FB.warUpkeepText(s, feedback)) + '</div>';
    } else if (selectedHostUpkeep) {
      detailsHtml += '<div>💰 ' + esc(FB.T('Total seasonal logistics: {money:amount}', {
        amount: SH.financeAmount(selectedHostUpkeep.total)
      })) + '</div>';
    }

    // 4. Intelligence & Fortifications
    if (pinned || (FB.hostOf && w.enemy)) {
      detailsHtml += '<div class="land-section-title" style="margin-top:8px">' + esc(FB.T('Intelligence & Front')) + '</div>';
      if (pinned) {
        detailsHtml += '<div>⛓ ' + esc(FB.T('Pinned by {fort} at {place}; siege, retreat by the arrival road, or move into friendly land.', {
          fort: pinned.name, place: FB.world.byId[pinned.pid] ? FB.world.byId[pinned.pid].name : '?'
        })) + '</div>';
      }
      const enemyHost = FB.hostOf ? FB.hostOf(s, w.enemy) : null;
      if (enemyHost) {
        detailsHtml += '<div>⚔ ' + esc(FB.T('Their host: ~{men} at {place}', {
          men: menText(s, enemyHost.men),
          place: FB.world.byId[enemyHost.at] ? FB.world.byId[enemyHost.at].name : '?'
        })) + '</div>';
      }
    }

    // Card markup
    const enemyLink = '<button type="button" class="linklike" data-war-enemy="' + esc(w.enemy) +
      '" title="' + esc(FB.T('Highlight {realm} on map', { realm: enemyName })) + '">' +
      esc(enemyName) + '</button>';

    let cardHtml = '<section class="land-section war-card settcard" id="deeds-war-card">' +
      '<div class="settcard-head"><b>⚔ ' + FB.T('At War with {enemy}', { enemy: enemyLink }) + '</b>' +
      '<span class="settcard-actions">' +
      '<span style="font-size:12.5px;color:#f0d888;margin-right:6px">🏆 ' + esc(FB.T('{wins}W · {losses}L', { wins: wins, losses: losses })) + '</span>' +
      '<button type="button" class="btn small settcard-info" aria-expanded="false" aria-controls="deeds-war-details" title="' +
      esc(FB.T('Details')) + '" aria-label="' + esc(FB.T('Details')) + '">?</button>' +
      '</span></div>' +
      landKv('Your Host', esc(hostLine), true) +
      landKv('Supply & Upkeep', esc(supplyUpkeepLine)) +
      landKv('Battle Odds', esc(oddsLine));

    if (pHost && (!pHost.path || !pHost.path.length) && !pHost.goal) {
      const marchHint = FB.isTouch
        ? FB.T('Tap troops, then tap a county to move.')
        : FB.T('Left-click troops, then left-click a county to move.');
      cardHtml += '<div class="hint">🚩 ' + esc(marchHint) + '</div>';
    }

    cardHtml += '<div class="settcard-details hidden" id="deeds-war-details">' + detailsHtml + '</div>';
    cardHtml += '</section>';

    return cardHtml;
  }

  function renderActions(reuse) {
    const s = FB.state, box = $('tab-actions');
    /* A player returning to Deeds without an intervening refresh can keep the
       mounted controls, listeners, and disclosure state.
       Programmatic callers and dirty state always take the exact rebuild. */
    if (reuse && !actionsDirty && actionsRenderedState === s &&
        actionsRenderedLocale === FB.locale && box.hasChildNodes()) {
      return;
    }
    /* Give desktop players a complete, stable keyboard map as soon as a life
       opens. Touch layouts keep no active keyboard section, and rerenders of
       the same life preserve whichever section the player selected. */
    if (activeActionState !== s) {
      activeActionState = s;
      activeActionSection = FB.isTouch ? null : 'focus';
      focusSectionOpen = true;
    }
    let h = '';
    if (FB.tutorialActive && FB.tutorialActive(s) &&
        (!FB.game.uiPrefs || !FB.game.uiPrefs.hideBeginnerHints)) {
      h += tutorialCardHtml(s);
    }
    h += ongoingCommitmentsHtml(s);
    if (s.player.war) {
      h += renderDeedsWarCard(s);
    }
    if (s.greatHolyWar && FB.playerGreatHolyWarCamp(s)) {
      const great = s.greatHolyWar;
      const greatReligion = FB.religionOf(great.callingReligion, s);
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
      /* Compact ledger: county rows against one shared column per building
         type standing anywhere in the demesne, so a glance shows what each
         county has and lacks. The county name opens its settlement sheet. */
      const bldByProv = {};
      const bldTypes = {};
      for (const bp of FB.demesne(s)) {
        const cells = {};
        for (const e of FB.builtIn(s, bp)) {
          if (e.ruined || !FBDATA.buildings[e.id]) continue;
          cells[e.id] = (cells[e.id] || 0) + 1;
          bldTypes[e.id] = true;
        }
        if (Object.keys(cells).length) bldByProv[bp] = cells;
      }
      const bldCols = [];
      for (const id in FBDATA.buildings) if (bldTypes[id]) bldCols.push(id);
      const bldPids = Object.keys(bldByProv);
      if (bldCols.length && bldPids.length) {
        let grid = '<span class="bldprov bldcolhead"></span>';
        for (const id of bldCols) {
          const d = FBDATA.buildings[id];
          grid += '<span class="bldcell bldcolhead" title="' +
            esc(dt(s, 'building', id, d, 'name')) + '">' + d.icon + '</span>';
        }
        for (const bp of bldPids) {
          const cells = bldByProv[bp];
          grid += '<button type="button" class="bldprov" data-bldprov="' +
            esc(bp) + '" title="' +
            esc(FB.T('See the buildings of {settlement}', {
              settlement: FB.world.byId[bp].name
            })) + '">' + esc(FB.world.byId[bp].name) + '</button>';
          for (const id of bldCols) {
            const d = FBDATA.buildings[id];
            const name = dt(s, 'building', id, d, 'name');
            const n = cells[id] || 0;
            if (n) {
              grid += '<span class="bldcell" title="' + esc(name) +
                (n > 1 ? ' ×' + n : '') + '">' + d.icon +
                (n > 1 ? '<span class="bldcnt">' + n + '</span>' : '') +
                '</span>';
            } else {
              const none = FB.T('No {building}', { building: name });
              grid += '<span class="bldcell bldmiss" title="' + esc(none) +
                '" aria-label="' + esc(none) + '">·</span>';
            }
          }
        }
        h += '<div class="progressnote bldsummary"><span class="bldhead">🏗 ' +
          esc(FB.T('Buildings')) + '</span><div class="bldgrid" style="' +
          'grid-template-columns:minmax(96px,max-content) repeat(' +
          bldCols.length + ', 24px)">' + grid + '</div></div>';
      }
    }
    if (!FB.game.uiPrefs || !FB.game.uiPrefs.hideBeginnerHints) {
      h += nextStepHint(s);
    }
    box.innerHTML = h;
    box.querySelectorAll('[data-bldprov]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const pid = btn.dataset.bldprov;
        FB.map.centerOn(pid);
        UI.showSettlement(pid, 0);
      });
    });
    if ($('tutorial-dismiss')) {
      $('tutorial-dismiss').addEventListener('click', function () {
        delete s.player.flags.tutorial; // per-save opt-out; the card never returns
        renderActions();
      });
    }
    const tutorialTenure = $('tutorial-serf-tenure');
    if (tutorialTenure) {
      tutorialTenure.addEventListener('click', function () {
        UI.showRankDetails();
      });
    }
    const focuses = FB.listFocusChoices ? FB.listFocusChoices(s)
      : FB.listFocuses(s).map(function (focus) {
        return { action:focus, can:true, reason:'', preview:null };
      });
    /* Closed accordion groups need their visible count, not every cooldown,
       technology, and eligibility explanation. Defer that deeper work until
       a group's controls are actually constructed. */
    const instants = FB.listInstants(s, { deferEligibility:true });
    const visibleSignature = instants.map(function (item) {
      return item.a.id;
    }).join('|');
    function deedFlow(action) {
      if (action && action.flow === 'choices') return 'choices';
      if (action && action.flow === 'no_day') return 'no-day';
      return 'now';
    }
    function deedFlowText(flow) {
      if (flow === 'choices') return FB.T('Opens choices…');
      if (flow === 'no-day') return FB.T('Resolves now · no day spent');
      return FB.T('Resolves now · spends one day');
    }
    function buildActionGroupBody(groupId, items) {
      const body = document.createElement('div');
      body.className = 'actiongroup-body';
      body.setAttribute('data-action-group-body', groupId);
      const ih = document.createElement('div');
      ih.className = 'actionsubhead';
      ih.textContent = FB.T('One-time deeds');
      body.appendChild(ih);
      for (const listedItem of items) {
        let item = listedItem;
        if (listedItem.statusDeferred) {
          const status = FB.instantStatus(s, listedItem.a.id);
          item = {
            a:listedItem.a,
            can:status.can,
            reason:status.reason,
            preview:status.preview
          };
        }
        const row = document.createElement('div');
        const btn = document.createElement('button');
        const flow = deedFlow(item.a);
        const detailsId = 'deed-details-' + item.a.id;
        row.className = 'deed-entry settcard';
        row.setAttribute('data-deed-flow', flow);
        btn.className = 'actionbtn deed-main-action';
        btn.setAttribute('data-action-id', item.a.id);
        btn.setAttribute('data-deed-flow', flow);
        btn.setAttribute('aria-describedby', detailsId);
        btn.disabled = !item.can;
        const label = actionLabel(s, item.a.id, item.a);
        const detailText = FB.translateKnown(
          item.can ? item.a.desc(s) : item.reason);
        btn.innerHTML = shortcutHintFor('action:' + item.a.id) + esc(label);
        (function (id) {
          btn.addEventListener('click', function () {
            UI._gmModalAction = id;
            UI._gmModalTarget = 'action:' + id;
            FB.runInstant(FB.state, id);
          });
        })(item.a.id);
        const actions = document.createElement('span');
        actions.className = 'settcard-actions';
        const detailsButton = document.createElement('button');
        detailsButton.type = 'button';
        detailsButton.className = 'btn small settcard-info deed-info';
        detailsButton.textContent = '?';
        detailsButton.title = FB.T('Details');
        detailsButton.setAttribute('aria-label', FB.T('Details'));
        detailsButton.setAttribute('aria-expanded', 'false');
        detailsButton.setAttribute('aria-controls', detailsId);
        actions.appendChild(detailsButton);
        const details = document.createElement('div');
        details.id = detailsId;
        details.className = 'settcard-details deed-details hidden';
        details.innerHTML = '<b>' + esc(deedFlowText(flow)) + '</b><br>' +
          '<span class="deed-status-text">' + esc(detailText) + '</span>';
        if (item.preview) {
          const previewSections = [
            { label:FB.T('Costs'), records:item.preview.costs || [] },
            { label:FB.T('Effects'), records:item.preview.effects || [] }
          ];
          for (const section of previewSections) {
            if (!section.records.length) continue;
            let previewHtml = '<div class="action-preview"><b>' +
              esc(section.label) + '</b><div class="event-impact-chips">';
            for (const record of section.records) {
              previewHtml += '<span class="event-impact-chip ' +
                receiptImpactClass(record) + '">' +
                esc(FB.eventImpactText(s, record, 'resolved')) + '</span>';
            }
            previewHtml += '</div></div>';
            details.innerHTML += previewHtml;
          }
        }
        row.appendChild(btn);
        row.appendChild(actions);
        row.appendChild(details);
        body.appendChild(row);
        if (FB.techUiRelevant(s) && !item.can && item.a.requiresTech &&
            !FB.techRequirementMet(s, item.a.requiresTech)) {
          const techId = firstMissingTech(s, item.a.requiresTech);
          const techButton = document.createElement('button');
          techButton.className = 'btn small contextual-help-link';
          techButton.setAttribute('data-action-tech', techId);
          techButton.textContent = FB.T('View prerequisite: {technology}', {
            technology:technologyName(s, techId)
          });
          techButton.addEventListener('click', function () {
            UI.showTechDetail(techId);
          });
          details.appendChild(techButton);
        }
      }
      if (SH.bindCardInfoToggles) SH.bindCardInfoToggles(body);
      return body;
    }
    function focusPreviewHtml(preview) {
      if (!preview) return '';
      let html = '';
      if (preview.seasonal && preview.seasonal.length) {
        html += '<div class="action-preview"><b>' +
          esc(FB.T('Seasonal effects')) +
          '</b><div class="event-impact-chips">';
        for (const record of preview.seasonal) {
          html += '<span class="event-impact-chip ' +
            receiptImpactClass(record) + '">' +
            esc(FB.eventImpactText(s, record, 'resolved')) + '</span>';
        }
        html += '</div></div>';
      }
      if (preview.daily && preview.daily.length) {
        html += '<div class="action-preview"><b>' +
          esc(FB.T('Daily effects')) +
          '</b><div class="event-impact-chips">';
        for (const record of preview.daily) {
          const rounded = Math.round(record.amount * 1000) / 1000;
          const change = (rounded > 0 ? '+' : '') + String(rounded);
          html += '<span class="event-impact-chip ' +
            receiptImpactClass(record) + '">' + esc(FB.T(
              'Health {change} per day', { change:change })) + '</span>';
        }
        html += '</div></div>';
      }
      if (preview.training && preview.training.length) {
        html += '<div class="action-preview"><b>' +
          esc(FB.T('Seasonal training chances')) +
          '</b><div class="event-impact-chips">';
        for (const training of preview.training) {
          html += '<span class="event-impact-chip gain">' + esc(FB.T(
            '{skill}: {chance}% chance per season', {
              skill:FB.skillName(training.skill),
              chance:Math.round(training.seasonChance * 1000) / 10
            })) + '</span>';
        }
        html += '</div></div>';
      }
      return html;
    }
    function appendFocus(item, container) {
      const f = item.action;
      const cur = s.player.focus === f.id;
      const row = document.createElement('div');
      const btn = document.createElement('button');
      const detailsId = 'focus-details-' + f.id;
      row.className = 'deed-entry focus-entry settcard';
      btn.className = 'actionbtn deed-main-action' +
        (cur ? ' focused' : '');
      btn.setAttribute('data-focus-id', f.id);
      btn.setAttribute('aria-describedby', detailsId);
      btn.disabled = !item.can;
      btn.innerHTML = shortcutHintFor(focusShortcutTarget(f)) +
        (cur ? '◉ ' : '○ ') + esc(FB.focusLabel
          ? FB.focusLabel(s, f) : dt(s, 'focus', f.id, f, 'label'));
      (function (id) {
        btn.addEventListener('click', function () {
          FB.setFocus(FB.state, id);
        });
      })(f.id);
      const actions = document.createElement('span');
      actions.className = 'settcard-actions';
      const detailsButton = document.createElement('button');
      detailsButton.type = 'button';
      detailsButton.className = 'btn small settcard-info deed-info';
      detailsButton.textContent = '?';
      detailsButton.title = FB.T('Details');
      detailsButton.setAttribute('aria-label', FB.T('Details'));
      detailsButton.setAttribute('aria-expanded', 'false');
      detailsButton.setAttribute('aria-controls', detailsId);
      actions.appendChild(detailsButton);
      const details = document.createElement('div');
      details.id = detailsId;
      details.className = 'settcard-details deed-details hidden';
      details.innerHTML = esc(FB.translateKnown(
        item.can && FB.focusDescription ? FB.focusDescription(s, f) :
          (item.can ? f.desc(s) : item.reason))) + focusPreviewHtml(item.preview);
      row.appendChild(btn);
      row.appendChild(actions);
      row.appendChild(details);
      container.appendChild(row);
      if (FB.techUiRelevant(s) && !item.can && f.requiresTech &&
          !FB.techRequirementMet(s, f.requiresTech)) {
        const techId = firstMissingTech(s, f.requiresTech);
        const techButton = document.createElement('button');
        techButton.className = 'btn small contextual-help-link';
        techButton.setAttribute('data-focus-tech', techId);
        techButton.textContent = FB.T('View prerequisite: {technology}', {
          technology:technologyName(s, techId)
        });
        techButton.addEventListener('click', function () {
          UI.showTechDetail(techId);
        });
        container.appendChild(techButton);
      }
    }
    if (focuses.length) {
      const fh = document.createElement('button');
      fh.className = 'actiongroup-toggle';
      fh.id = 'daily-focus-list';
      fh.setAttribute('data-action-section', 'focus');
      fh.setAttribute('aria-expanded', focusSectionOpen ? 'true' : 'false');
      fh.innerHTML = '<span>' + actionSectionHintFor('focus') +
        esc(FB.T('Daily Focus — repeats automatically whenever a day passes')) +
        '</span><span>' + esc(String(focuses.length)) + ' ' +
        (focusSectionOpen ? '▾' : '▸') + '</span>';
      const focusBody = document.createElement('div');
      focusBody.className = 'actiongroup-body';
      focusBody.setAttribute('data-action-group-body', 'focus');
      focusBody.hidden = !focusSectionOpen;
      fh.addEventListener('click', function () {
        setActiveActionSection('focus');
        focusSectionOpen = !focusSectionOpen;
        fh.setAttribute('aria-expanded', focusSectionOpen ? 'true' : 'false');
        fh.lastElementChild.textContent = String(focuses.length) + ' ' +
          (focusSectionOpen ? '▾' : '▸');
        focusBody.hidden = !focusSectionOpen;
        refreshDeedPanelShortcuts();
      });
      box.appendChild(fh);
      for (const item of focuses) appendFocus(item, focusBody);
      box.appendChild(focusBody);
    }
    for (const group of ACTION_GROUPS) {
      const ga = instants.filter(function (item) {
        return (item.a.group || 'realm') === group.id;
      });
      if (!ga.length) continue;
      const toggle = document.createElement('button');
      const open = !!actionGroupsOpen[group.id];
      toggle.className = 'actiongroup-toggle';
      toggle.setAttribute('data-action-group', group.id);
      toggle.setAttribute('data-action-section', group.id);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.innerHTML = '<span>' + actionSectionHintFor(group.id) +
        esc(FB.T(group.label)) + '</span><span>' +
        esc(String(ga.length)) + ' ' +
        (open ? '▾' : '▸') + '</span>';
      let body = null;
      if (open) {
        body = buildActionGroupBody(group.id, ga);
      }
      (function (id, items) {
        toggle.addEventListener('click', function () {
          /* The panel summaries and eligibility checks are substantially more
             expensive than the disclosure itself. Keep this group's controls
             detached for reuse and leave the rest of Deeds mounted. */
          setActiveActionSection(id);
          const opening = !actionGroupsOpen[id];
          actionGroupsOpen[id] = opening;
          toggle.setAttribute('aria-expanded', opening ? 'true' : 'false');
          toggle.lastElementChild.textContent = String(items.length) + ' ' +
            (opening ? '▾' : '▸');
          if (opening) {
            if (!body) {
              body = buildActionGroupBody(id, items);
              FB.localizeTree(body);
            }
            let next = toggle.nextElementSibling;
            while (next && !next.classList.contains('actiongroup-toggle')) {
              next = next.nextElementSibling;
            }
            box.insertBefore(body, next);
          } else if (body && body.parentNode === box) {
            box.removeChild(body);
          }
          refreshDeedPanelShortcuts();
        });
      })(group.id, ga);
      box.appendChild(toggle);
      if (body) box.appendChild(body);
    }
    refreshDeedPanelShortcuts();
    function focusActionControl(selector, fallbackGroup, scrollBlock) {
      const target = box.querySelector(selector) ||
        (fallbackGroup && box.querySelector(
          '[data-action-group="' + fallbackGroup + '"]'));
      if (!target) return;
      target.scrollIntoView({ block:scrollBlock || 'nearest' });
      target.focus({ preventScroll:true });
    }
    function revealActionControl(groupId, selector, scrollBlock) {
      if (groupId) {
        actionGroupsOpen[groupId] = true;
        activeActionSection = groupId;
      }
      renderActions();
      focusActionControl(selector, groupId, scrollBlock);
    }
    const commitmentsToggle = $('ongoing-commitments-toggle');
    if (commitmentsToggle) {
      commitmentsToggle.addEventListener('click', function () {
        FB.game.uiPrefs.commitmentsCollapsed =
          !FB.game.uiPrefs.commitmentsCollapsed;
        FB.game.saveUiPrefs();
        renderActions();
        const replacement = $('ongoing-commitments-toggle');
        if (replacement) replacement.focus({ preventScroll:true });
      });
    }
    document.querySelectorAll('#ongoing-commitments button[data-commitment]').forEach(
      function (button) {
        button.addEventListener('click', function () {
          const commitment = button.dataset.commitment;
          if (commitment === 'focus') {
            if (!focusSectionOpen) $('daily-focus-list').click();
            else setActiveActionSection('focus');
            focusActionControl('#daily-focus-list', null, 'start');
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
              '[data-action-id="travel_return_cargo"], ' +
              '[data-action-id="travel_marriage_residence"], ' +
              '[data-action-id="frontier_settle_here"], ' +
              '[data-action-id="travel_settle_here"]');
          } else if (commitment === 'finance') {
            UI.showFinance();
          } else if (commitment === 'intrigue') {
            UI.showIntrigueAssets();
          }
        });
      });
    box.querySelectorAll('[data-war-enemy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const enemyRid = btn.getAttribute('data-war-enemy');
        if (enemyRid && UI.highlightEnemyRealm) {
          UI.highlightEnemyRealm(enemyRid);
        }
      });
    });
    FB.localizeTree(box);
    if (SH.bindCardInfoToggles) SH.bindCardInfoToggles(box);
    actionsRenderedState = s;
    actionsRenderedLocale = FB.locale;
    actionsVisibleSignature = visibleSignature;
    deedStatusRefreshedState = s;
    deedStatusRefreshedTurn = s.turn;
    actionsDirty = false;
  }

  /* Flowing time changes cooldown and resource eligibility much more often
     than it changes the shape of the Deeds catalogue. Refresh only mounted
     deed rows on a bounded cadence, preserving the panel tree and listeners.
     A visibility change is rare and requires an exact rebuild so actions are
     neither stranded nor exposed after their authored show gate changes. */
  function refreshVisibleDeedStatuses(options) {
    const s = FB.state;
    const box = $('tab-actions');
    if (!s || SH.activeTab !== 'actions' || !box || !box.hasChildNodes()) return;
    const force = !!(options && options.force);
    if (!force && deedStatusRefreshedState === s &&
        s.turn - deedStatusRefreshedTurn < LIVE_DEED_STATUS_DAYS) return;
    deedStatusRefreshedState = s;
    deedStatusRefreshedTurn = s.turn;

    const visible = FB.listInstants(s, { deferEligibility:true });
    const visibleIds = {};
    const signature = visible.map(function (item) {
      visibleIds[item.a.id] = true;
      return item.a.id;
    }).join('|');
    if (signature !== actionsVisibleSignature) {
      renderActions();
      return;
    }

    const buttons = box.querySelectorAll('[data-action-id]');
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const id = btn.getAttribute('data-action-id');
      if (!visibleIds[id]) {
        renderActions();
        return;
      }
      /* listInstants already established visibility above. Status-only live
         refreshes need eligibility, not presentation previews. */
      const status = FB.instantStatus(s, id, {
        shown:true, deferPreview:true
      });
      if (!status.action) {
        renderActions();
        return;
      }
      btn.disabled = !status.can;
      const details = $('deed-details-' + id);
      const statusText = details && details.querySelector('.deed-status-text');
      if (statusText) {
        statusText.textContent = FB.translateKnown(status.can
          ? status.action.desc(s) : status.reason);
      }
    }
  }

  /* the tutorial checklist: staged tracks that teach the game to a new life.
     Track and step state live in FB.tutorialStatus (main.js); completion
     toasts fire from FB.tutorialCheck on the coalesced refresh, so this
     render stays pure. */
  function tutorialCardHtml(s) {
    const status = FB.tutorialStatus(s);
    if (!status) return ''; // every track finished; the card retires this frame
    let h = '<div class="progressnote tutorial-card" id="tutorial-guidance"' +
      ' data-tutorial-track="' + esc(status.track.id) + '"><div class="tutorial-head">' +
      '<b>' + esc(status.track.icon) + ' ' + esc(status.track.title) + '</b>' +
      '<button type="button" class="btn small" id="tutorial-dismiss">' +
      esc(FB.T('Dismiss')) + '</button></div>';
    if (status.track.note) {
      h += status.track.link === 'serf-tenure'
        ? '<button type="button" class="linklike tutorial-context" ' +
          'id="tutorial-serf-tenure">' + esc(status.track.note) + '</button>'
        : '<p class="cmeta tutorial-context">' +
          esc(status.track.note) + '</p>';
    }
    h += '<ul>';
    for (const step of status.steps) {
      h += '<li' + (step.done ? ' class="done"' : '') + '>' +
        (step.done ? '✓ ' : '○ ') + esc(step.label) + '</li>';
    }
    return h + '</ul></div>';
  }

  function nextStepHint(s) {
    if (s.player.tier === 0) {
      return '<div class="progressnote path-hint">🧭 ' + esc(FB.T(
        'Path: save {money:gold} to buy freedom outright, or reach +20 Standing with your lord and petition for exact terms.',
        { gold: FB.freedomPurchasePrice(s) })) + '</div>';
    }
    if (s.player.tier === 1) {
      const cluster = FB.largestLandCluster(s);
      return '<div class="progressnote path-hint">🧭 ' + esc(FB.T(
        'Path: assemble {needed} plots in one settlement ({cluster}/{needed}), then reach {prestige} prestige and declare a manor. Soldiering and the church offer other roads.',
        {
          cluster:cluster ? cluster.count : 0,
          needed:FBDATA.balance.manorPlotRequirement,
          prestige:FBDATA.balance.manorPrestige
        })) + '</div>';
    }
    if (s.player.tier === 2) {
      const command = FB.militaryCommandStatus && FB.militaryCommandStatus(s);
      const text = FB.gentryEstablished(s)
        ? FB.T('Path: serve your lord, win renown ({prestige}+ prestige, Standing {standing}+), and petition for a barony.',
          {
            prestige:FBDATA.balance.baronyPrestige,
            standing:FBDATA.balance.baronyOpinion
          })
        : FB.T('Path: establish your gentle house. An heir may petition for a barony. In this first life, a battle-proven favorite with Martial {martial}+ and {prestige}+ prestige may instead command a count-or-greater ruler’s field host; one real victory earns a barony. Church office remains another exceptional road.', {
          martial:command ? command.martialNeeded : 12,
          prestige:command ? command.prestigeNeeded : 120
        });
      return '<div class="progressnote path-hint">🧭 ' + esc(text) + '</div>';
    }
    const tips = {
      3: 'Path: petition your liege for a county — or declare independence and take one.',
      4: 'Path: hold the majority of a de jure duchy (petition, inherit, or conquer) to be styled duke.',
      5: 'Path: hold the majority of a de jure kingdom and win independence to be crowned king.',
      6: 'Path: hold the majority of two kingdoms of one empire to be crowned emperor.',
      7: 'You stand at the summit of the world.'
    };
    return '<div class="progressnote path-hint">🧭 ' +
      esc(FB.T(tips[s.player.tier] || '')) + '</div>';
  }

  function skillBars(c) {
    let h = '';
    const soft = FBDATA.balance.skillSoftCap || 20;
    for (const k of FB.SKILLS) {
      const v = FB.skillOf(c, k);
      const name = FB.skillName(k);
      // the bar fills to the soft cap; past it the number keeps climbing and
      // the bar turns bright to mark mastery beyond the soft cap
      h += '<div class="skillrow"><button type="button" class="skill-label linklike" ' +
        'data-guide-skill="' + esc(k) + '" title="' +
        esc(FB.T('What does {skill} affect?', { skill:name })) + '">' +
        esc(name) + '</button>' +
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

  function selfValue(panel, label) {
    const rows = panel ? panel.querySelectorAll('.kv') : [];
    const translated = FB.T(label);
    for (let i = 0; i < rows.length; i++) {
      const rowLabel = rows[i].querySelector('span');
      if (rowLabel && rowLabel.textContent === translated) {
        return rows[i].querySelector('b');
      }
    }
    return null;
  }

  function refreshLiveSelfValues() {
    const s = FB.state;
    const panel = $('tab-char');
    const me = s && s.player && s.chars[s.player.charId];
    if (!me || !panel || panel.offsetParent === null) return;
    const age = selfValue(panel, 'Age');
    const health = selfValue(panel, 'Health');
    const voice = selfValue(panel, 'Common Voice');
    if (age) age.textContent = FB.ageOf(me, s.date.year);
    if (health) health.textContent = Math.round(me.health) + ' / 10 ' + String.fromCharCode(183) + ' ' + healthWord(me.health);
    if (voice) voice.textContent = Math.round(FB.popEffective ? FB.popEffective(s) : s.player.pop);
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
    const summary = SH.itemFxText({ fx:fx });
    return '<div class="equip-bonuses"><div class="equip-bonus-heading">' +
      esc(FB.T('Equipment bonuses')) + '</div><div' +
      (summary ? '' : ' class="cmeta"') + '>' +
      esc(summary || FB.T('No equipment bonuses.')) + '</div></div>';
  }

  function equipmentSlotDetailsHtml(s, slot, ref, item, blocked) {
    let h = '<b>' + esc(itemSlotLabel(slot)) + '</b>';
    if (item) {
      const quality = item.ordinary
        ? FB.itemQualityName(item.quality) : SH.rarityName(item.def.rarity);
      const fx = SH.itemFxText(item) || FB.T('No mechanical effect');
      h += '<p><b>' + item.def.icon + ' ' + esc(FB.itemName(s, ref)) +
        '</b> · ' + esc(quality) + '</p>' +
        '<p>' + esc(dt(s, 'item', item.defId, item.def, 'desc')) + '</p>' +
        '<p><i>' + esc(fx) + '</i></p>' +
        '<p class="cmeta">' + esc(FB.T('Worth about {money:gold}.', {
          gold:item.value
        })) + '</p>' +
        (item.grip === 2 ? '<p class="cmeta">' +
          esc(FB.T('Occupies both hands.')) + '</p>' : '') +
        (FB.isProtected && FB.isProtected(s, 'equipmentItem', ref)
          ? '<p class="cmeta">' + esc(FB.T(
            'Protected from automatic equipment changes.')) + '</p>' : '');
    } else {
      h += '<p>' + esc(FB.T('Empty slot.')) + '</p>';
    }
    h += '<p class="cmeta">' + esc(blocked
      ? equipmentBlockedText(blocked)
      : FB.T('Select this slot to choose an exact object from the family armory.')) +
      '</p>';
    return h;
  }

  function equipmentSheetHtml(s, c) {
    const loadout = FB.loadoutOf(s, c.id);
    const blocked = FB.equipmentBlockedReason ? FB.equipmentBlockedReason(s) : null;
    let h = '<div class="paper-sheet"><div class="paper-figure">' +
      '<canvas class="paperdoll" data-cid="' + c.id +
      '" width="' + Math.round(192 * FB.portraitDpr) + '" height="' +
      Math.round(360 * FB.portraitDpr) + '" role="img" aria-label="' +
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
      const detailsId = 'equipment-slot-details-' + c.id + '-' + slot;
      h += '<div class="equip-slot-card settcard">' +
        '<div class="equip-slot-face">' +
        '<button type="button" class="equip-slot" data-equip-cid="' + c.id +
        '" data-equip-slot="' + slot + '" data-action-tooltip="' + detailsId +
        '" aria-describedby="' + detailsId + '" aria-label="' + esc(aria) + '"' +
        (blocked ? ' disabled' : '') + '><span>' + esc(itemSlotLabel(slot)) +
        '</span><b>' + esc(value) + '</b></button>' +
        '<span class="settcard-actions equip-slot-actions">' +
        '<button type="button" class="btn small settcard-info equip-slot-info" ' +
        'aria-expanded="false" aria-controls="' + detailsId + '" title="' +
        esc(FB.T('Details')) + '" aria-label="' + esc(FB.T('Details')) +
        '">?</button></span></div>' +
        '<div class="settcard-details equip-slot-details hidden" id="' +
        detailsId + '">' +
        equipmentSlotDetailsHtml(s, slot, ref, item, blocked) + '</div></div>';
    }
    h += '</div>' + (blocked ? '<div class="progressnote warnote">' +
      esc(equipmentBlockedText(blocked)) + '</div>' :
      '<div class="equip-note">' + esc(FB.T(
        'Choose a slot, then choose an exact object from the family armory. Changes cost no day.')) +
      '</div>') +
      '<button type="button" class="btn equip-best-action" id="equipment-best"' +
      (blocked ? ' disabled' : '') + '>' +
      esc(FB.T('Equip Best…')) + '</button>' +
      (c.id === s.player.charId
        ? '<button type="button" class="btn barber-action" id="equipment-barber"' +
          (blocked ? ' disabled' : '') + '>' + esc(FB.T('Visit Barber…')) + '</button>'
        : '') + '</div></div>';
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
      const titleName = esc(e.titleData ? FB.renderTitleSnapshot(e.titleData) : FB.L(e.t || ''));
      let targetPid = e.pid;
      if (!targetPid && e.did && FB.duchyCounties) {
        const dcs = FB.duchyCounties(e.did);
        if (dcs && dcs.length) targetPid = dcs[0];
      }
      const titleVal = targetPid
        ? '<button type="button" class="linklike" data-title-pid="' + esc(targetPid) + '">' + titleName + '</button>'
        : titleName;
      h += '<div class="kv self-title-row"><span>' + esc(FB.T(e.d)) + '</span><b>' +
        titleVal + '</b></div>';
    }
    if (t.counties.length) {
      const names = [];
      for (const pid of t.counties) {
        const pr = FB.world.byId[pid];
        const name = esc(pr ? pr.name : pid);
        names.push('<button type="button" class="linklike" data-title-pid="' + esc(pid) + '">' + name + '</button>');
      }
      h += '<div class="self-titles-counties"><span class="self-titles-counties-label">' +
        esc(FB.T('Counties ({count})', { count: t.counties.length })) +
        '</span><div class="self-titles-counties-list">' +
        names.join(' · ') +
        '</div></div>';
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
    const rel = FB.religionOf(religionId, s);
    if (!rel) return '';
    if (!rel.head) {
      const parent = rel.parent && FB.religionOf(rel.parent, s);
      if (parent && parent.head) {
        const parentTitle = FB.faithDataText(
          s, s.player.charId, rel.parent, 'head.title', {});
        return kv('Religious head', esc(FB.T('None — separate from the {title}', {
          title:parentTitle
        })));
      }
      return kv('Religious head', esc(FB.T('None — no centralized office')));
    }
    if (FB.faithHasSystem(religionId, 'papacy', s) && FB.ensurePapacy) {
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

  function faithDetailsLink(s, religionId, id) {
    const rel = FB.religionOf(religionId, s);
    if (!rel) return esc(religionId);
    return '<button type="button" class="linklike"' +
      (id ? ' id="' + esc(id) + '"' : '') +
      ' data-faith-details="' + esc(religionId) + '" aria-label="' +
      esc(FB.T('Open details for {faith}', {
        faith:religionName(s, religionId)
      })) + '">' + esc(rel.icon) + ' ' + esc(religionName(s, religionId)) +
      '</button>';
  }

  function rankDetailsLink(s) {
    const rank = FB.styledTitle(s);
    const landed = s.player.tier >= 3;
    return '<button type="button" class="linklike" id="self-rank-details" ' +
      'aria-label="' + esc(FB.T(landed
        ? 'Open realm and demesne details for {rank}'
        : 'Open station and home details for {rank}', {
        rank:rank
      })) + '">' + esc(rank) + '</button>';
  }

  function faithRelationText(status) {
    if (status === 'same') return FB.T('The same faith');
    if (status === 'in_fold') return FB.T('In communion');
    if (status === 'schismatic') return FB.T('Separate communion');
    if (status === 'hostile') return FB.T('Condemned as hostile');
    return FB.T('Unrelated faith');
  }

  function faithRelationListText(statuses) {
    return statuses.map(function (status) {
      if (status === 'same') return FB.T('Exact faith');
      if (status === 'in_fold') return FB.T('In-communion branches');
      if (status === 'schismatic') return FB.T('Separate branches');
      if (status === 'hostile') return FB.T('Hostile faiths');
      if (status === 'foreign') return FB.T('Unrelated faiths');
      return status;
    }).join(' · ');
  }

  function faithRuleSource(s, religionId, path) {
    const source = FB.faithValue(s, religionId, path).sourceId;
    return source ? religionName(s, source) : FB.T('Unknown');
  }

  function bindFaithDetails(root) {
    const buttons = root.querySelectorAll('[data-faith-details]');
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        UI.showFaithDetails(buttons[i].getAttribute('data-faith-details'));
      });
    }
  }

  function foundedFaithOriginText(s, religionId, rel, parent, founder,
      origin, founded) {
    const faith = religionName(s, religionId);
    const parentName = parent ? religionName(s, rel.parent) : FB.T('the old faith');
    const founderName = founder ? FB.fullName(founder) : null;
    const placeName = origin ? origin.name : null;
    const date = founded ? FB.T('{season} {year}', {
      season:FB.seasonName(founded.season), year:founded.year
    }) : null;
    if (founderName && placeName && date) {
      return FB.T(
        'In {date}, a new community gathered around {founder} in {place}; from {parent}, {faith} took shape.', {
          date:date, founder:founderName, place:placeName,
          parent:parentName, faith:faith
        });
    }
    if (founderName && date) {
      return FB.T(
        'In {date}, a new community gathered around {founder}; from {parent}, {faith} took shape.', {
          date:date, founder:founderName, parent:parentName, faith:faith
        });
    }
    if (placeName && date) {
      return FB.T(
        'In {date}, {faith} took root in {place} as a new branch of {parent}.', {
          date:date, faith:faith, place:placeName, parent:parentName
        });
    }
    return FB.T('{faith} arose as a new branch of {parent}.', {
      faith:faith, parent:parentName
    });
  }

  UI.showFaithDetails = function (religionId) {
    const s = FB.state;
    const rel = s && FB.faithExists(religionId, s)
      ? FB.religionOf(religionId, s) : null;
    if (!rel) return;
    const parent = rel.parent && FB.religionOf(rel.parent, s);
    const lineage = FB.faithLineage(religionId, s).map(function (id) {
      return religionName(s, id);
    });
    const campaignFounded = rel.founderId !== undefined ||
      rel.originProvinceId !== undefined;
    const founder = rel.founderId !== undefined && s.chars[rel.founderId];
    const origin = rel.originProvinceId && FB.world.byId[rel.originProvinceId];
    const founded = isFinite(rel.createdTurn)
      ? FB.dateAtTurn(s, rel.createdTurn) : null;
    const doctrine = FB.marriageDoctrine(religionId, s);
    let h = '<div class="progressnote">' + esc(campaignFounded
      ? foundedFaithOriginText(
        s, religionId, rel, parent, founder, origin, founded)
      : (parent
        ? FB.T('{faith} is an established branch of {parent}.', {
          faith:religionName(s, religionId),
          parent:religionName(s, rel.parent)
        })
        : FB.T('{faith} is an old and established tradition.', {
          faith:religionName(s, religionId)
        }))) +
      '</div>' + panelh('Identity') +
      kv('Faith', esc(rel.icon) + ' ' + esc(religionName(s, religionId))) +
      kv('Type', esc(campaignFounded ? FB.T('Founded branch') :
        (parent ? FB.T('Established branch') : FB.T('Root tradition')))) +
      (parent ? kv('Parent tradition', esc(religionName(s, rel.parent))) : '') +
      kv('Lineage', esc(lineage.join(' › ')));
    if (rel.desc) {
      h += '<p class="adesc">' + esc(FB.faithDataText(
        s, s.player.charId, religionId, 'desc', {})) + '</p>';
    }
    if (campaignFounded) {
      if (founder) h += kv('Founder', esc(FB.fullName(founder)));
      if (origin) h += kv('Place of origin', esc(origin.name));
      if (founded) {
        h += kv('Founded', esc(FB.T('{season} {year}', {
          season:FB.seasonName(founded.season), year:founded.year
        })));
      }
    }
    if (parent && parent.assignable) {
      const childView = FB.faithRelation(s, religionId, rel.parent);
      const parentView = FB.faithRelation(s, rel.parent, religionId);
      h += panelh('Relations');
      if (childView === parentView) {
        h += kv('Relationship with parent', esc(faithRelationText(childView)));
      } else {
        h += kv('View of parent', esc(faithRelationText(childView))) +
          kv('Parent’s view', esc(faithRelationText(parentView)));
      }
    }
    h += panelh('Authority');
    if (!rel.head) {
      if (parent && parent.head) {
        h += kv('Religious head', esc(FB.T(
          'None — this branch does not recognize the {title}', {
            title:FB.faithDataText(
              s, s.player.charId, rel.parent, 'head.title', {})
          })));
      } else {
        h += kv('Religious head', esc(FB.T('None — no centralized office')));
      }
    } else {
      h += religiousHeadStatusRow(s, religionId) +
        kv('Office tradition', esc(faithRuleSource(
          s, religionId, 'head.officeId')));
    }
    h += panelh('Doctrine') +
      kv('Spouse limits (men / women)', esc(
        doctrine.spouseLimit.m + ' / ' + doctrine.spouseLimit.f)) +
      kv('Marriage accepted with', esc(faithRelationListText(
        doctrine.acceptedRelations))) +
      kv('Marriage rules from', esc(faithRuleSource(
        s, religionId, 'marriage'))) +
      kv('Clergy marriage', esc(rel.clergyMarriage
        ? FB.T('Permitted') : FB.T('Forbidden'))) +
      kv('Clergy rule from', esc(faithRuleSource(
        s, religionId, 'clergyMarriage'))) +
      '<div class="gm-footer"><button class="btn" id="faith-details-close">' +
      esc(FB.T('Close')) + '</button></div>';
    openModal(rel.icon + ' ' + religionName(s, religionId), h);
    $('faith-details-close').addEventListener('click', UI.closeModal);
  };

  let rankDetailsSignature = null;
  UI.showRankDetails = function (options) {
    options = options || {};
    const s = FB.state;
    if (!s || !s.player) return;
    const landed = s.player.tier >= 3;
    const replacing = !!options.replaceView;
    const oldBody = replacing ? $('gm-body') : null;
    const oldScroll = oldBody ? oldBody.scrollTop : 0;
    const oldFocusNode = replacing && document.activeElement &&
      oldBody && oldBody.contains(document.activeElement)
      ? document.activeElement : null;
    const oldFocus = oldFocusNode ? {
      id:oldFocusNode.id || '',
      tenureHome:oldFocusNode.dataset && oldFocusNode.dataset.tenureHome || '',
      tenureCharacter:oldFocusNode.dataset &&
        oldFocusNode.dataset.tenureCharacter || ''
    } : null;
    let acknowledgeTenure = false;
    let acknowledgeFreedomRoutes = false;
    let acknowledgeOfferTerms = false;
    let h = '<div data-rank-details-surface>';

    if (landed) {
      const direct = (s.player.provs || []).slice();
      const playerRealm = s.realms.player && s.realms.player.alive
        ? s.realms.player : null;
      const realm = playerRealm ? FB.realmTerritory(s, 'player').slice() : [];
      const cap = FB.domainCap(s);
      const seatId = playerRealm && playerRealm.capital
        ? playerRealm.capital : s.player.provinceId;
      const seat = seatId && FB.world.byId[seatId];
      const countyNames = direct.map(function (pid) {
        const province = FB.world.byId[pid];
        return province ? FB.L(province.name) : pid;
      });
      const vassals = FB.playerVassals(s);

      h += kv('Rank', esc(FB.styledTitle(s))) +
        kv('Seat', esc(seat ? FB.L(seat.name) : FB.T('None'))) +
        kv('Held directly', esc(FB.T('{held} of {cap} counties', {
          held:direct.length, cap:cap
        }))) +
        kv('Realm-wide territory', esc(countyCountText(s, realm.length))) +
        kv('Direct vassals', esc(String(vassals.length))) +
        kv('Seasonal tax', esc(FB.T('about {money:gold}', {
          gold:FB.playerTax(s)
        }))) +
        kv('Available levy', esc(FB.T('about {men}', {
          men:menText(s, FB.playerLevy(s))
        }))) +
        '<div class="panelh">' + esc(FB.T('Direct demesne')) + '</div>' +
        '<p class="adesc">' + esc(countyNames.length
          ? countyNames.join(' · ')
          : FB.T('No counties are held directly.')) + '</p>';
      if (direct.length > cap) {
        h += '<div class="progressnote warnote">' + esc(FB.T(
          'Over the domain limit by {count}; direct tax and levy are reduced.', {
            count:direct.length - cap
          })) + '</div>';
      }
    } else {
      const settIdx = s.player.homeSettlement || 0;
      const settlements = FB.settlementsOf(s, s.player.provinceId);
      const homeSett = settlements[settIdx] || settlements[0];
      const settName = homeSett ? homeSett.name : FB.T('Unknown');
      const kindName = SH.settlementKindName && homeSett && homeSett.kind
        ? SH.settlementKindName(homeSett.kind) : '';
      const province = FB.world.byId[s.player.provinceId];
      const provinceName = province ? FB.L(province.name) : s.player.provinceId;
      const countyOwnerId = s.owner[s.player.provinceId];
      const countyRealm = countyOwnerId && s.realms[countyOwnerId];
      const countyRuler = countyRealm ? s.chars[countyRealm.ruler] : null;
      const rulerDesc = countyRuler
        ? FB.fullName(countyRuler) + (countyRealm ? ' (' + countyRealm.name + ')' : '')
        : (countyRealm ? countyRealm.name : FB.T('None'));

      h += kv('Station', esc(FB.styledTitle(s))) +
        kv('Settlement', esc(kindName
          ? FB.T('{settlement} ({kind})', { settlement:settName, kind:kindName })
          : settName)) +
        kv('County', esc(provinceName)) +
        kv('County ruler', esc(rulerDesc));
      if (s.player.liege && s.player.liege !== countyOwnerId) {
        const liegeRealm = s.realms[s.player.liege];
        const liegeRuler = liegeRealm ? s.chars[liegeRealm.ruler] : null;
        const liegeDesc = liegeRuler
          ? FB.fullName(liegeRuler) + (liegeRealm ? ' (' + liegeRealm.name + ')' : '')
          : (liegeRealm ? liegeRealm.name : s.player.liege);
        h += kv('Liege lord', esc(liegeDesc));
      }

      h += '<div class="panelh">' + esc(FB.T('Home')) + '</div>';
      let homeInfo = '';
      if (s.player.tier === 0) {
        homeInfo = FB.T('Your household lives in {settlement}, a {kind} in the county of {county}. As serfs, you are bound to the soil under {ruler} and owe customary dues and labor.', {
          settlement:settName,
          kind:kindName ? kindName.toLowerCase() : FB.T('village'),
          county:provinceName,
          ruler:rulerDesc
        });
      } else if (s.player.tier === 1) {
        homeInfo = FB.T('Your household resides in {settlement}, a {kind} in the county of {county}, living as free commoners under {ruler}.', {
          settlement:settName,
          kind:kindName ? kindName.toLowerCase() : FB.T('settlement'),
          county:provinceName,
          ruler:rulerDesc
        });
      } else {
        homeInfo = FB.T('Your gentle household resides in {settlement}, a {kind} in the county of {county}, holding local estate and standing under {ruler}.', {
          settlement:settName,
          kind:kindName ? kindName.toLowerCase() : FB.T('settlement'),
          county:provinceName,
          ruler:rulerDesc
        });
      }
      h += '<p class="adesc">' + esc(homeInfo) + '</p>';
      if (s.player.tier === 0) {
        if (FB.ensureSerfTenure) FB.ensureSerfTenure(s, 'legacy_repair');
        const view = FB.tenureView && FB.tenureView(s);
        if (view) {
          h += '<section class="serf-tenure" data-serf-tenure>';
          acknowledgeTenure = true;
          acknowledgeFreedomRoutes = true;
        }
        if (view) {
          h += '<div class="panelh" data-tenure-header>' + esc(FB.T('Tenure & Custom')) + '</div>';
          h += '<div class="tenure-summary-block" data-tenure-summary>' +
            '<div class="tenure-archetype-name"><strong>' + esc(view.archetypeName) + '</strong></div>' +
            '<p class="adesc">' + esc(view.archetypeSummary) + '</p>' +
            kv('Holding', '<button type="button" class="panel-inline-link" ' +
              'data-tenure-home="' + esc(view.provinceId) + '" ' +
              'data-tenure-settlement="' + esc(String(view.settlement)) + '">' +
              esc(view.settlementName + ', ' + view.countyName) + '</button>') +
            kv('Controller', esc(view.controllerName)) +
            kv('Current lord', view.lordId
              ? '<button type="button" class="panel-inline-link tenure-character-link" ' +
                'data-tenure-character="' + esc(view.lordId) + '">' +
                esc(view.lordName) + '</button>'
              : esc(view.lordName)) +
            kv('Steward', view.stewardId
              ? '<button type="button" class="panel-inline-link tenure-character-link" ' +
                'data-tenure-character="' + esc(view.stewardId) + '">' +
                esc(view.stewardName) + '</button>'
              : esc(view.stewardName)) +
            '</div>';

          if (view.nearestDue) {
            h += '<div class="tenure-next-due-block" data-tenure-next-due ' +
              'data-serf-next-duty>' +
              kv('Next due obligation', esc(view.nearestDue.name + ' — ' + view.nearestDue.dateFull)) +
              '</div>';
          }

          h += '<div class="tenure-work-block" data-tenure-work>' +
            '<div class="panelh">' + esc(FB.T('Ordinary Work')) + '</div>' +
            '<div class="tenure-work-name"><strong>' +
              esc(view.workLabel) + '</strong></div>' +
            '<p class="adesc" data-tenure-work-description>' +
              esc(view.workDescription) + '</p></div>';

          if (view.oldCustom) {
            const witnessButton =
              '<button type="button" class="panel-inline-link tenure-character-link" ' +
                'data-tenure-character="' + esc(view.oldCustom.witnessId) + '">' +
                esc(view.oldCustom.witnessName) + '</button>';
            const officerButton =
              '<button type="button" class="panel-inline-link tenure-character-link" ' +
                'data-tenure-character="' + esc(view.oldCustom.officerId) + '">' +
                esc(view.oldCustom.officerName) + '</button>';
            const storyLine = esc(FB.T(
              'Old Custom case: witness {witness}, officer {officer}', {
                witness:'__OLD_CUSTOM_WITNESS__',
                officer:'__OLD_CUSTOM_OFFICER__'
              })).replace('__OLD_CUSTOM_WITNESS__', witnessButton)
              .replace('__OLD_CUSTOM_OFFICER__', officerButton);
            h += '<p class="adesc tenure-old-custom" data-tenure-old-custom>' +
              storyLine + '</p>';
          }

          if (view.pendingConditional) {
            h += '<div class="tenure-conditional-block" data-tenure-conditional>' +
              kv('Pending obligation', esc(view.pendingConditional.name + ' (' + view.pendingConditional.dateLabel + ')')) +
              '<p class="adesc">' + esc(view.pendingConditional.desc) + '</p>' +
              '</div>';
          }

          h += '<div class="tenure-duties-section"><div class="panelh">' + esc(FB.T('Customary Duties')) + '</div>';
          for (let i = 0; i < view.duties.length; i++) {
            const d = view.duties[i];
            h += '<div class="tenure-duty-item" data-tenure-duty="' + esc(d.id) + '">' +
              '<div class="tenure-duty-header"><strong>' + esc(d.name) + '</strong> (' + esc(d.dateFull) + ')</div>' +
              '<p class="adesc">' + esc(d.desc) + '</p>' +
              '</div>';
          }
          h += '</div>';

          h += '<div class="tenure-rights-section"><div class="panelh">' + esc(FB.T('Customary Rights')) + '</div>';
          if (view.hasRights) {
            for (let r = 0; r < view.rights.length; r++) {
              const rt = view.rights[r];
              h += '<div class="tenure-right-item" data-tenure-right="' + esc(rt.id) + '">' +
                '<div class="tenure-right-name"><strong>' + esc(rt.name) + '</strong></div>' +
                '<p class="adesc">' + esc(rt.desc) + '</p>' +
                '</div>';
            }
          } else {
            h += '<p class="adesc" data-tenure-right="none">' + esc(view.emptyRightsText) + '</p>';
          }
          h += '</div>';

          h += '<div class="tenure-notes">' +
            '<p class="adesc">' + esc(view.customaryUseStatement) + '</p>' +
            '<p class="adesc">' + esc(view.lawfulFreedomStatement) + '</p>' +
            '</div>';
        }
        const petition = view && view.freedom
          ? view.freedom.petition : null;
        const offer = view && view.freedom ? view.freedom.offer : null;
        const purchase = view && view.freedom
          ? view.freedom.purchase : null;
        const freedomQuote = purchase
          ? purchase.quote : FB.freedomPurchaseQuote(s);
        const purchaseBlocked = purchase
          ? purchase.reason : FB.T('The purchase route is unavailable.');
        h += '<div class="freedom-routes" data-freedom-routes ' +
          'data-serf-freedom-routes>' +
          '<div class="panelh">' + esc(FB.T('Routes to Freedom')) + '</div>' +
          kv('Buy freedom outright', esc(FB.T('{money:price}', {
            price:freedomQuote.price
          }))) +
          '<p class="adesc" data-freedom-family-price>' +
            esc(FB.freedomPurchaseBreakdown(s, freedomQuote)) + '</p>' +
          kv('Current gold', esc(FB.T('{money:gold}', {
            gold:purchase ? purchase.gold : Math.floor(s.player.gold)
          }))) +
          kv('Affordable now', esc(purchase && purchase.affordable
            ? FB.T('Yes') : FB.T('No'))) +
          '<p class="adesc" data-freedom-purchase-reason>' +
            esc(purchaseBlocked) + '</p>' +
          (petition && petition.lord
            ? kv('Standing with current lord', esc(FB.T('{standing} (petition at +{threshold})', {
              standing:petition.standing, threshold:petition.threshold
            })))
            : kv('Petition', esc(petition ? petition.reason
              : FB.T('No current lord can receive the petition.')))) +
          kv('Petition eligibility', esc(petition && petition.ready
            ? FB.T('Available now.')
            : (petition ? petition.reason
              : FB.T('No current lord can receive the petition.'))));
        if (offer) {
          if (offer.status === 'offered') acknowledgeOfferTerms = true;
          const offerService = offer.serviceDays
            ? FB.T('{days} days', { days:offer.serviceDays })
            : FB.T('none');
          h += '<div data-freedom-offer data-serf-offer>' +
            '<div data-freedom-offer-price>' +
              kv('Saved price', esc(FB.T('{money:price}', {
                price:offer.price
              }))) + '</div>' +
            (offer.familyPricing
              ? '<p class="adesc" data-freedom-offer-family-price>' +
                esc(FB.T(
                  'Standing terms were applied to this saved family base. {breakdown}', {
                    breakdown:FB.freedomPurchaseBreakdown(
                      s, offer.familyPricing)
                  })) +
                '</p>' : '') +
            '<div data-freedom-offer-service>' +
              kv('Final service', esc(offerService)) + '</div>' +
            '<div data-freedom-offer-expiry>' +
              kv('Offer expiry', esc(offer.expiryLabel)) + '</div>' +
            kv('Issued terms', esc(FB.T('{lord}, tenure revision {revision}', {
              lord:offer.lordName, revision:offer.tenureRevision
            }))) +
            '<p class="adesc">' + esc(FB.T(
              'Expiry or a material change to the named tenure invalidates this offer.')) +
              '</p>' +
            (!offer.acceptanceReady && offer.status === 'offered'
              ? '<p class="warnote">' + esc(offer.acceptanceReason) + '</p>'
              : '') + '</div>';
          if (offer.status === 'service') {
            h += '<div class="progressnote" data-freedom-service-progress>' +
              esc(FB.T('Final service ends {date}; {days} days remain.', {
                date:offer.serviceEndLabel,
                days:offer.serviceDaysRemaining
              })) + '</div>';
          }
        }
        h += '<button type="button" class="btn" id="rank-petition-freedom"' +
          (petition && petition.ready ? '' : ' disabled') + '>' +
          esc(FB.T('Petition for terms of freedom…')) + '</button></div>';
        if (view && view.pendingTransition) {
          h += '<div class="progressnote" data-serf-authority-review>' +
            esc(FB.T(
              'A review of the household custom is pending under the current authority.')) +
            '</div>';
        } else if (view && view.recentTransition) {
          h += '<div class="hint" data-serf-recent-review>' + esc(FB.T(
            'Recent authority review: {outcome}.', {
              outcome:view.recentTransition.outcome.replace(/_/g, ' ')
            })) + '</div>';
        }
        if (view) h += '</section>';
      }
    }
    h += '</div><div class="gm-footer"><button class="btn" id="rank-details-close">' +
      esc(FB.T('Close')) + '</button></div>';
    openModal(FB.T(landed ? 'Realm & demesne' : 'Station & home'), h,
      replacing ? { replaceView:true, noFocus:true } : undefined);
    rankDetailsSignature = FB.serfTenurePresentationSignature
      ? FB.serfTenurePresentationSignature(s) : null;
    const freedomPetition = $('rank-petition-freedom');
    if (freedomPetition) freedomPetition.addEventListener('click', function () {
      if (UI.showFreedomPetition) UI.showFreedomPetition();
    });
    document.querySelectorAll('.tenure-character-link').forEach(function (button) {
      button.addEventListener('click', function () {
        UI.showCharModal(button.dataset.tenureCharacter, {
          view:'rank-details', focusCharacterId:button.dataset.tenureCharacter
        });
      });
    });
    document.querySelectorAll('[data-tenure-home]').forEach(function (button) {
      button.addEventListener('click', function () {
        UI.showSettlement(button.dataset.tenureHome,
          Number(button.dataset.tenureSettlement) || 0, {
            historyView:true, historyBack:true,
            historyBackRender:UI.showRankDetails
          });
      });
    });
    $('rank-details-close').addEventListener('click', UI.closeModal);
    /* Building a sheet stays a pure state read. Once the mounted surface has
       actually reached the user, persist only its semantic teaching flags. */
    if (UI.acknowledgeHint && (acknowledgeTenure ||
        acknowledgeFreedomRoutes || acknowledgeOfferTerms)) {
      setTimeout(function () {
        if ($('genmodal').classList.contains('hidden') ||
            !$('gm-body').querySelector('[data-rank-details-surface]')) return;
        if (acknowledgeTenure) UI.acknowledgeHint('serf_tenure');
        if (acknowledgeFreedomRoutes) {
          UI.acknowledgeHint('serf_freedom_routes');
        }
        if (acknowledgeOfferTerms) UI.acknowledgeHint('serf_offer_terms');
      }, 0);
    }
    if (!replacing) {
      /* Rank details historically opens on its Close control. Preserve that
         modal contract now that linked home and character controls precede it. */
      setTimeout(function () {
        const close = $('rank-details-close');
        if (close && !$('genmodal').classList.contains('hidden')) {
          close.focus({ preventScroll:true });
        }
      }, 0);
    }
    if (replacing) {
      $('gm-body').scrollTop = oldScroll;
      setTimeout(function () {
        let target = oldFocus && oldFocus.id ? $(oldFocus.id) : null;
        const controls = $('gm-body').querySelectorAll(
          '[data-tenure-home], [data-tenure-character]');
        for (let i = 0; !target && oldFocus && i < controls.length; i++) {
          if ((oldFocus.tenureHome &&
              controls[i].dataset.tenureHome === oldFocus.tenureHome) ||
              (oldFocus.tenureCharacter &&
              controls[i].dataset.tenureCharacter ===
                oldFocus.tenureCharacter)) target = controls[i];
        }
        if (target && $('gm-body').contains(target)) {
          target.focus({ preventScroll:true });
        } else {
          $('genmodal').focus({ preventScroll:true });
        }
      }, 0);
    }
  };

  UI.refreshSerfTenureSheet = function () {
    const modal = $('genmodal');
    if (!modal || modal.classList.contains('hidden') ||
        !$('gm-body').querySelector('[data-rank-details-surface]') ||
        !$('gm-body').querySelector('[data-serf-tenure]') ||
        !$('eventmodal').classList.contains('hidden') ||
        !FB.serfTenurePresentationSignature) return false;
    const next = FB.serfTenurePresentationSignature(FB.state);
    if (next === rankDetailsSignature) return false;
    UI.showRankDetails({ replaceView:true });
    return true;
  };

  function renderChar() {
    const s = FB.state, me = s.chars[s.player.charId];
    const rel = FB.religionOf(me.religion, s), cul = FB.cultureOf(me.culture);
    const titles = FB.playerTitles(s);
    const titleCount = titles.high.length + titles.counties.length;
    const items = FB.itemList(s);
    const standardSummary = householdStandardsSummary(s);
    const houseRow = me.dyn
      ? '<div class="kv dynasty-house-row"><span>' + esc(FB.T('House')) +
        '</span><span class="dynasty-house-value"><b>' + esc(me.dyn) +
        '</b><button type="button" class="panel-inline-icon-button" ' +
        'id="self-rename-house" aria-label="' + esc(FB.T('Rename house')) +
        '" title="' + esc(FB.T('Rename house')) + '"><span aria-hidden="true">&#x270e;</span>' +
        '</button></span></div>'
      : kv('House', esc('—'));
    let h =
      '<div class="panelh self-name">' + esc(FB.fullName(me)) + '</div>' +
      '<div class="self-overview"><div class="self-portrait-tools">' +
      '<button type="button" class="self-portrait-button" id="self-equipment-portrait" ' +
      'aria-label="' + esc(FB.T('Equip items…')) + '" title="' +
      esc(FB.T('Equip items…')) + '"><canvas id="selfportrait" class="pface" data-cid="' +
      me.id + '" width="' + Math.round(88 * FB.portraitDpr) + '" height="' +
      Math.round(100 * FB.portraitDpr) +
      '" style="width:88px;height:100px" aria-hidden="true"></canvas></button>' +
      '<button type="button" class="btn portrait-equip" id="self-equipment" ' +
      'data-action-id="self-equipment">' + esc(FB.T('Equip items…')) + '</button>' +
      '</div><div class="self-overview-skills">' + panelh('Skills') + skillBars(me) +
      '</div></div>' +
      panelh('Traits') + traitChips(s, me, true) +
      '<div class="self-details-divider" aria-hidden="true"></div>' +
      kv('Rank', rankDetailsLink(s)) +
      papalOfficeHtml(s, me) +
      kv('Age', FB.ageOf(me, s.date.year)) +
      kv('Culture', esc(cultureName(s, me.culture))) +
      kv('Faith', faithDetailsLink(s, me.religion, 'self-faith-details')) +
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
      houseRow +
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
    if (FB.ageOf(me, s.date.year) < 16) {
      h += panelh('Upbringing') + upbringingNote(s, me) +
        '<button class="actionbtn" id="self-edufocus">🎓 Choose your education focus…' +
        '<span class="adesc">Direct your formative years toward one art.</span></button>' +
        '<button class="actionbtn" id="self-tutor">🧑‍🏫 Choose schooling or a tutor…' +
        '<span class="adesc">Instruction raises your yearly learning chance; paid lessons charge each season.</span></button>';
    }
    const box = $('tab-char');
    if (!replacePanelMarkup('self', box, h)) {
      FB.paintFaces(box, s);
      return;
    }
    FB.localizeTree(box);
    FB.paintFaces(box, s);
    bindFaithDetails(box);
    const rankDetails = $('self-rank-details');
    if (rankDetails) rankDetails.addEventListener('click', UI.showRankDetails);
    const equipmentTriggers = box.querySelectorAll(
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
    const skillLinks = $('tab-char').querySelectorAll('[data-guide-skill]');
    for (let i = 0; i < skillLinks.length; i++) {
      skillLinks[i].addEventListener('click', function () {
        UI.showGuideEntry('skill-' + skillLinks[i].dataset.guideSkill, {
          closeToGame:true
        });
      });
    }
    const sef = $('self-edufocus');
    if (sef) sef.addEventListener('click', function () {
      UI.showEduFocus(me.id, { view:'self' });
    });
    const stu = $('self-tutor');
    if (stu) stu.addEventListener('click', function () {
      UI.showTutorPick(me.id, { view:'self' });
    });
    const bishopric = $('self-bishopric');
    if (bishopric) bishopric.addEventListener('click', UI.showBishopric);
    const srh = $('self-rename-house');
    if (srh) srh.addEventListener('click', UI.showRenameHouse);
    const titleLinks = box.querySelectorAll('[data-title-pid]');
    for (let i = 0; i < titleLinks.length; i++) {
      titleLinks[i].addEventListener('click', function () {
        const pid = this.getAttribute('data-title-pid');
        if (pid && FB.world && FB.world.byId[pid]) {
          if (FB.map && FB.map.centerOn) {
            FB.map.centerOn(pid, 2.0);
          }
          UI.selectProvince(pid);
        }
      });
    }
  }

  /* Self-tab Dynasty panel: rename the player's house. A validation failure
     keeps the dialog open and shows the reason; on success the news entry
     toasts itself and every surface re-renders from the rewritten dyn
     strings (crests included — they seed from the dyn). */
  UI.showRenameHouse = function () {
    const s = FB.state;
    const me = s && s.player && s.chars[s.player.charId];
    if (!me || !me.dyn) return;
    const reasons = {
      empty: FB.T('Enter a house name.'),
      unchanged: FB.T('That is already the name of your house.'),
      short: FB.T('A house name needs at least two letters.'),
      long: FB.T('A house name can be at most twenty letters long.'),
      chars: FB.T('Use only letters, spaces, hyphens, and apostrophes.')
    };
    openModal(FB.T('Rename house'),
      '<p class="adesc">' + esc(FB.T(
        'Your house name follows every member of your dynasty. Personal names and patronymics are unchanged.')) +
      '</p>' +
      '<div class="evname"><label>' + esc(FB.T('House name')) + ' ' +
      '<input id="rename-house-name" type="text" maxlength="20"></label></div>' +
      '<p class="adesc" id="rename-house-err" role="alert"></p>' +
      '<div class="gm-footer">' +
      '<button class="btn primary" data-rename-house="confirm">' +
      esc(FB.T('Rename')) + '</button>' +
      '<button class="btn" data-rename-house="cancel">' +
      esc(FB.T('Cancel')) + '</button></div>');
    const inp = $('rename-house-name');
    inp.value = me.dyn;
    function confirmRename() {
      const res = FB.renameHouse(s, inp.value);
      if (!res.ok) {
        $('rename-house-err').textContent = reasons[res.reason] || reasons.chars;
        inp.focus();
        inp.select();
        return;
      }
      UI.closeModal();
      if (UI.mapDirty) UI.mapDirty();
      UI.refresh();
    }
    const gmBody = $('gm-body');
    gmBody.querySelector('[data-rename-house="confirm"]')
      .addEventListener('click', confirmRename);
    gmBody.querySelector('[data-rename-house="cancel"]')
      .addEventListener('click', UI.closeModal);
    inp.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        confirmRename();
      }
    });
    if (!FB.isTouch) {
      inp.focus();
      inp.select();
    }
  };

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
      FB.faceTag(c, 44, 50) +
      '<span>' + mid + '</span>' +
      '<span class="cop ' + standingClass(standing) + '">' +
      esc(standingValue(standing)) + '</span></div>';
  }

  function relationText(s, c) {
    const me = s.chars[s.player.charId];
    if (c.id === me.spouseId || c.spouseId === me.id) {
      return FB.T('Your spouse');
    }
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
    if (s.roles.steward === c.id) return FB.T('The lord’s steward');
    if (s.roles.priest === c.id) {
      return FB.T('Your {cleric}', { cleric: FB.holyWord(me.religion) });
    }
    if (s.roles.friend === c.id) return FB.T('Your friend');
    if (s.roles.rival === c.id) return FB.T('Your rival');
    return null;
  }
  function maritalText(s, c) {
    return FB.T(FB.spouseSnapshot(s, c) ? 'Married' : 'Unwed');
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
    const succession = r && r.succession;
    if (!r) return '';
    let status = FB.T('in the succession');
    if (succession && succession.rulerMemberId === c.royalLine.memberId) {
      status = FB.T('reigning ruler');
    } else if (succession && succession.heirId === c.royalLine.memberId) {
      status = FB.T('designated heir');
    }
    return '<div class="ccmeta">' + esc(FB.T('👑 Royal line of {realm} · {status}', {
      realm: r.name, status: status
    })) + '</div>';
  }

  function papalOfficeHtml(s, c) {
    if (!FB.papalOfficeOf) return '';
    const office = FB.papalOfficeOf(s, c);
    if (!office) return '';
    const papacy = s.papacy;
    const obedience = papacy && papacy.obediences &&
      papacy.obediences[office.obedienceId];
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
        order:SH.papalDefinitionText(s, 'papalCardinalOrder',
          FBDATA.papacy.cardinalOrders, office.order, 'name',
          'Cardinal'),
        church:office.titleChurch || '',
        bloc:SH.papalDefinitionText(s, 'papalCardinalBloc',
          FBDATA.papacy.blocs, office.bloc, 'name',
          blocDef ? blocDef.name : office.bloc || '')
      })) + '</div>';
  }

  UI.realmCardHtml = function (s, rid) {
    const realm = rid && s.realms[rid];
    if (!realm || !realm.alive) return '';
    const standing = FB.standingOf(s, { kind:'realm', id:rid });
    const relations = [];
    if (FB.areAllied(s, 'player', rid)) relations.push(FB.T('Defensive ally'));
    if (s.pacts && s.pacts[rid] > s.turn) relations.push(FB.T('Peace pact'));
    if (!relations.length) relations.push(FB.T('No compact'));
    const stance = FB.foreignPolicyStance(s, rid);
    if (stance > 0) {
      relations.push(FB.T('Improve direction'));
    } else if (stance < 0) {
      relations.push(FB.T('Provoke direction'));
    } else if (FB.isForeignPolicyTarget(s, rid)) {
      relations.push(FB.T('Neutral direction'));
    }
    return '<div class="charcard realmcard" data-realm-context="' + esc(rid) + '">' +
      FB.crestTag(rid, 48, 56) +
      '<div><div class="ccname">' + esc(realm.ruler.name) + '</div>' +
      '<div class="ccmeta">' + esc(FB.T('{title} of {realm}', {
        title:FB.realmRankTitle(s, realm), realm:realm.name
      })) + '</div>' +
      '<div class="ccmeta"><span class="' + standingClass(standing) + '">' +
      esc(FB.T('Standing {standing}', {
        standing:standingText(standing)
      })) + '</span> · ' + esc(relations.join(' · ')) +
      '</div></div></div>';
  };

  UI.charCardHtml = function (s, c, clickable, groupedTraits, options) {
    options = options || {};
    const rel = FB.religionOf(c.religion, s), cul = FB.cultureOf(c.culture);
    const house = c.dyn ? FB.crestTag(c.dyn, 18, 21) : ''; // a house bears arms
    let sk = '';
    for (const k of FB.SKILLS) {
      const value = FB.skillSnapshot
        ? FB.skillSnapshot(s, c, k) : FB.skillOf(c, k);
      sk += FB.skillName(k) + ' ' + value + ' · ';
    }
    sk = sk.slice(0, -3);
    const tr = traitChips(s, c, !!groupedTraits);
    // treasures the player has gifted them, worn where callers can see
    let itc = '';
    if (c.items && c.items.length && c.id !== s.player.charId) {
      for (const ref of c.items) {
        const item = FB.resolveItemReadOnly(s, ref);
        if (item) {
          itc += '<span class="traitchip" data-itemview="' + esc(ref) + '">' +
            item.def.icon + ' ' + esc(FB.itemNameReadOnly(s, ref)) + '</span>';
        }
      }
    }
    // the dead are remembered, not met: dates and deeds, no dealings
    if (c.dead) {
      const life = c.died !== undefined ?
        FB.T('† {born}–{died} (aged {age})',
          { born: c.born, died: c.died, age: c.died - c.born }) :
        FB.T('† born {year}', { year: c.born });
      return '<div class="charcard">' + FB.faceTag(c, 72, 82) +
        '<div><div class="ccname">' + esc(FB.fullName(c)) + house + '</div>' +
        '<div class="ccmeta">' + (epithetText(s, c) ? esc(epithetText(s, c)) + ' · ' : '') +
        esc(FB.T(c.sex === 'f' ? 'Woman' : 'Man')) +
        (c.station !== undefined && c.station !== null ? ' · ' + esc(FB.characterStationName(s, c)) : '') +
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
    const displayName = options.namePrefix
      ? FB.T('{title} {name}', {
        title:options.namePrefix, name:FB.fullName(c)
      })
      : FB.fullName(c);
    const portrait = options.mapHome
      ? '<button type="button" class="character-card-portrait-button" ' +
        'data-character-home="' + esc(c.id) + '" aria-label="' +
        esc(FB.T('Center map on {name}’s home county', {
          name:FB.fullName(c)
        })) + '" title="' + esc(FB.T('Center map on {name}’s home county', {
          name:FB.fullName(c)
        })) + '">' + FB.faceTag(c, 72, 82) + '</button>'
      : FB.faceTag(c, 72, 82);
    const skillsGuide = options.skillsGuide
      ? '<button type="button" class="character-skills-guide" ' +
        'aria-label="' + esc(FB.T('What do these skills affect?')) +
        '" title="' + esc(FB.T('What do these skills affect?')) +
        '"><span aria-hidden="true">i</span></button>'
      : '';
    return '<div class="charcard' + (options.cardClass
      ? ' ' + esc(options.cardClass) : '') + '"' +
      (clickable ? ' data-cid="' + c.id + '" title="' +
      esc(FB.T('Open their sheet and your dealings with them')) + '"' : '') + '>' +
      portrait +
      '<div><div class="ccname">' + esc(displayName) + house + '</div>' +
      (options.realmMuster ? '<div class="ccmeta realm-ruler-muster">' +
        esc(options.realmMuster) + '</div>' : '') +
      '<div class="ccmeta">' + (epithetText(s, c) ? esc(epithetText(s, c)) + ' · ' : '') +
      esc(FB.T('{sex} of {age}', {
        sex: FB.T(c.sex === 'f' ? 'Woman' : 'Man'),
        age: FB.ageOf(c, s.date.year)
      })) +
      (c.station !== undefined && c.station !== null ? ' · ' + esc(FB.characterStationName(s, c)) : '') +
      ' · ' + esc(cultureName(s, c.culture)) + ' · ' + rel.icon + ' ' +
      esc(religionName(s, c.religion)) + '</div>' +
      homeLineHtml(s, c) +
      royalLineHtml(s, c) +
      papalOfficeHtml(s, c) +
      '<div class="ccmeta">' + (c.id === s.player.charId ? esc(FB.T('This is you')) :
        '<span class="' + standingClass(standing) + '">' +
        esc(standingSummary) + '</span>') +
        esc(fert) + '</div>' +
      '<div class="ccskills' + (skillsGuide ? ' ccskills-guide' : '') + '">' +
        '<span>' + esc(sk) + '</span>' + skillsGuide + '</div>' +
      '<div>' + (tr || '<span class="cmeta">' + esc(FB.T('No notable traits.')) + '</span>') + '</div>' +
      (itc ? '<div>' + itc + '</div>' : '') + '</div></div>';
  };

  function renderFamily() {
    const s = FB.state, me = s.chars[s.player.charId];
    const kin = FB.kinOf(s);
    let h = '<button class="btn small" id="btn-ftree" style="width:100%" ' +
      'title="' + esc(FB.T('See the whole family drawn as a tree')) + '">' +
      esc(FB.T('🌳 See the family tree')) + '</button>';
    const freedomHistory = FB.familyFreedomView
      ? FB.familyFreedomView(s) : null;
    if (freedomHistory) {
      h += '<section class="family-landmarks" data-family-freedom>' +
        panelh('Family landmarks') +
        '<p class="adesc" data-family-freedom-first>' +
          esc(freedomHistory.first.text) + '</p>' +
        (freedomHistory.firstLawful
          ? '<p class="adesc" data-family-freedom-lawful>' +
            esc(freedomHistory.firstLawful.text) + '</p>' : '') +
        '</section>';
    }
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
    if ((!FB.game.uiPrefs || !FB.game.uiPrefs.hideBeginnerHints) &&
        FB.tutorialLife && FB.tutorialLife(s) &&
        s.player.flags.tut_track_first_steps &&
        !s.player.flags.tut_family_established &&
        !sps.length && !kids.length) {
      h += '<div class="hint">' + esc(FB.T(
        '🌱 Courtship and marriage live in the Deeds tab, under Life & Family — a spouse is the first deed of a dynasty.')) + '</div>';
    }
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
    kinSection('Stepchildren', kin.stepchildren);
    kinSection('Parents', kin.parents);
    kinSection('Grandparents', kin.grandparents);
    /* Siblings carry an explicit scope line: a resident unwed sibling can be
       put to work; every other sibling stays independent, and the line says
       why. Visibility is not control. */
    if (kin.siblings.length) {
      h += '<div class="panelh">' + esc(FB.T('Siblings')) + '</div>';
      for (const e of kin.siblings) {
        let meta = FB.T(e.rel) + (e.c.dead ? ' · †' : ' · ' +
          FB.T('age {age}', { age: FB.ageOf(e.c, s.date.year) }));
        if (!e.c.dead && FB.manageableKinBlocker) {
          const blocker = FB.manageableKinBlocker(s, e.c.id);
          meta += ' · ' + (blocker === 'married'
            ? FB.T('Married — runs their own household')
            : blocker === 'reigning'
              ? FB.T('Rules a realm of their own')
              : blocker === 'landed'
                ? FB.T('Holds their own station — independent')
                : blocker === 'vowed'
                  ? FB.T('Vowed to the faith — independent')
                  : blocker === 'away'
                    ? FB.T('Lives away from the household')
                    : FB.T('Lives with the household — can be put to work'));
        }
        h += charRow(s, e.c, meta);
      }
    }
    kinSection('Nieces & nephews', kin.niecesNephews);
    kinSection('Uncles & aunts', kin.unclesAunts);
    kinSection('Cousins', kin.cousins);
    h += panelh('Notable folk');
    for (const role of ['lord', 'steward', 'priest', 'friend', 'rival']) {
      const c = FB.getRole(s, role, false);
      if (c && !c.dead) {
        h += charRow(s, c, roleName(role) +
          ' · ' + FB.T('age {age}', { age: FB.ageOf(c, s.date.year) }), true);
      }
    }
    const box = $('tab-family');
    if (!replacePanelMarkup('kin', box, h)) {
      FB.paintFaces(box, s);
      return;
    }
    FB.localizeTree(box);
    FB.paintFaces(box, s);
    $('btn-ftree').addEventListener('click', function () {
      UI.showFamilyTree();
    });
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
    if (entry.kind === 'enterprise') return FB.T('Expanded family enterprises');
    if (entry.kind === 'household_standard') return FB.T('Household guard establishment');
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
    if (entry.kind === 'fort_garrison') return FB.T('Fort garrisons retained');
    if (entry.kind === 'papal_policy') return FB.T('Investiture and Papal standing');
    if (entry.kind === 'vassal') {
      const r = s.realms[entry.rid];
      return entry.favored
        ? FB.T('{realm} — exceptional levy', { realm:r ? r.name : entry.rid })
        : FB.T('{realm} — vassal levy', { realm:r ? r.name : entry.rid });
    }
    if (entry.kind === 'barony_retinue') return FB.T('Standing barony household');
    if (entry.kind === 'castellany_retinue') return FB.T('Castellan’s household guard');
    if (entry.kind === 'episcopal_household') return FB.T('Episcopal household');
    if (entry.kind === 'local-ordinance') {
      const motion = FBDATA.localCouncilMotions[entry.positionId];
      return motion
        ? dt(s, 'localCouncilMotion', entry.positionId, motion, 'name')
        : FB.T('Local ordinance');
    }
    if (entry.kind === 'position') return positionName(s, entry.positionId);
    if (entry.kind === 'retainer') {
      const c = entry.charId && s.chars[entry.charId];
      return FB.T('{position} — {name}', {
        position:positionName(s, entry.positionId),
        name:c ? c.name : FB.T('household servant')
      });
    }
    if (entry.kind === 'unit_class') {
      const unitDef = FBDATA.unitClasses && FBDATA.unitClasses[entry.unitClassId];
      return unitDef
        ? dt(s, 'unitClass', entry.unitClassId, unitDef, 'name')
        : FB.T('Special companies');
    }
    if (entry.kind === 'unit_class_conversion') {
      const conversionDef =
        FBDATA.unitClasses && FBDATA.unitClasses[entry.unitClassId];
      return FB.T('Mustered as {unitclass}', {
        unitclass:conversionDef
          ? dt(s, 'unitClass', entry.unitClassId, conversionDef, 'name')
          : entry.unitClassId
      });
    }
    return FB.T('Muster count adjustment');
  }

  function networkUnitName(s, unit) {
    const def = FBDATA.unitClasses && FBDATA.unitClasses[unit];
    if (def) return dt(s, 'unitClass', unit, def, 'name');
    if (unit === 'arch') return FB.T('archers');
    if (unit === 'cav') return FB.T('cavalry');
    if (unit === 'ret') return FB.T('men-at-arms');
    return FB.T('levy');
  }

  function networkStatePresentation(record, detailsKey, fallbackLabel) {
    const label = record.stateLabel || fallbackLabel;
    const detailsId = 'network-state-' + String(detailsKey || record.identity ||
      'row').replace(/[^a-zA-Z0-9_-]/g, '-');
    const context = record.stateDetails || networkContextDetailsHtml(
      record.detailMeta || record.meta || []);
    return {
      cardClass:' settcard network-state-details',
      face:'',
      details:'<span class="settcard-actions network-state-actions">' +
        '<button type="button" class="btn small settcard-info" ' +
        'aria-expanded="false" aria-controls="' + esc(detailsId) +
        '" title="' + esc(FB.T('Details')) + '" aria-label="' +
        esc(FB.T('Details')) + '">?</button></span>' +
        '<div class="settcard-details hidden" id="' + esc(detailsId) + '">' +
        '<b>' + esc(label) + '</b>' + context + '</div>'
    };
  }

  function networkContextDetailsHtml(lines) {
    let html = '<div class="network-state-context">';
    for (const line of lines || []) {
      if (line) html += '<div>' + esc(line) + '</div>';
    }
    return html + '</div>';
  }

  function networkContextSectionHtml(title, lines, itemClass) {
    let html = '<div class="network-state-context-section"><div ' +
      'class="network-state-context-heading">' + esc(title) + '</div>';
    for (const line of lines || []) {
      if (!line) continue;
      html += '<div' + (itemClass ? ' class="' + esc(itemClass) + '"' : '') +
        '>' + esc(line) + '</div>';
    }
    return html + '</div>';
  }

  function networkCharacterStateDetails(s, record) {
    const c = record.character;
    const lines = [FB.T('Age {age}', { age:FB.ageOf(c, s.date.year) })];
    const home = c.homeProvinceId && FB.world.byId[c.homeProvinceId];
    if (home) {
      lines.push(FB.T('Home: {province}', { province:home.name }));
    }
    for (const item of record.detailMeta || record.meta || []) {
      lines.push(item);
    }
    lines.push(FB.T('Standing {standing}', {
      standing:standingText(FB.standingOf(s, {
        kind:'character', id:c.id
      }))
    }));
    if (c.id !== s.player.charId && SH.characterStandingContext) {
      lines.push(SH.characterStandingContext(s, c));
    }
    return networkContextDetailsHtml(lines);
  }

  function networkActionHtml(detailsKey, buttonAttrs, labelHtml, detailsHtml,
    options) {
    const opts = options || {};
    const detailsId = 'network-action-' + String(detailsKey || 'action')
      .replace(/[^a-zA-Z0-9_-]/g, '-');
    return '<div class="network-action-entry settcard' +
      (opts.wrapperClass || '') + '"' + (opts.wrapperAttrs || '') + '>' +
      '<button type="button" class="actionbtn network-main-action" ' +
      (buttonAttrs || '') + ' aria-describedby="' + esc(detailsId) + '">' +
      labelHtml + '</button><span class="settcard-actions">' +
      '<button type="button" class="btn small settcard-info" ' +
      'aria-expanded="false" aria-controls="' + esc(detailsId) +
      '" title="' + esc(FB.T('Details')) + '" aria-label="' +
      esc(FB.T('Details')) + '">?</button></span>' +
      '<div class="settcard-details network-action-details hidden" id="' +
      esc(detailsId) + '">' + detailsHtml + '</div></div>';
  }

  function networkReadablePersonRow(s, sectionId, record) {
    const c = record.character;
    const attrs = largeListRowAttrs({
      attention:record.attention,
      states:['people', record.state || 'routine'],
      identity:c.id
    });
    const standing = FB.standingOf(s, { kind:'character', id:c.id });
    const state = networkStatePresentation(record,
      sectionId + '-person-' + c.id,
      record.attention ? FB.T('Needs attention') : FB.T('Routine'));
    return '<div class="large-list-entry network-list-entry' +
      state.cardClass + '"' + attrs + '>' +
      '<button type="button" class="charrow large-list-target-button" data-cid="' +
      esc(c.id) + '" data-list-focus-key="' + esc(sectionId + '-person-' + c.id) +
      '" title="' + esc(FB.T('Open the authoritative character sheet')) + '">' +
      FB.faceTag(c, 44, 50) +
      '<span class="large-list-row-copy"><span class="cname">' +
      esc(FB.fullName(c)) + '</span><span class="cmeta">' +
      esc(record.meta.join(' · ')) + '</span></span>' +
      '<span class="cop ' + standingClass(standing) + '">' +
      esc(standingValue(standing)) + '</span>' +
      state.face + '</button>' +
      (record.actionHtml || '') + state.details + '</div>';
  }

  function networkReadableRealmRow(s, record) {
    const r = s.realms[record.rid];
    const attrs = largeListRowAttrs({
      attention:record.attention,
      states:['realms', record.state || 'routine'],
      identity:record.rid
    });
    const state = networkStatePresentation(record,
      'realm-' + record.rid,
      record.attention ? FB.T('Needs attention') : FB.T('Routine'));
    return '<div class="large-list-entry network-list-entry' +
      state.cardClass + '"' + attrs + '>' +
      '<button type="button" class="actionbtn large-list-target-button" data-liege="' +
      esc(record.rid) + '" data-list-focus-key="realm-target-' +
      esc(record.rid) + '" title="' +
      esc(FB.T('Open this ruler’s character sheet')) + '">' +
      '<span class="large-list-row-copy"><span class="large-list-row-title">' +
      esc(r ? r.name : record.rid) + '</span><span class="adesc">' +
      esc(record.meta.join(' · ')) + '</span></span>' +
      state.face + '</button>' +
      (record.actionHtml || '') + state.details + '</div>';
  }

  function networkReadableStaticRow(record) {
    const attrs = largeListRowAttrs({
      attention:record.attention,
      states:[record.kind || 'other', record.state || 'routine'],
      identity:record.identity
    });
    const state = networkStatePresentation(record,
      'static-' + record.identity,
      record.attention ? FB.T('Needs attention') : FB.T('Context'));
    return '<div class="large-list-entry network-list-entry ' +
      'large-list-static-row' + state.cardClass + '"' + attrs +
      ' tabindex="0"' +
      '><div class="large-list-row-copy">' +
      '<span class="large-list-row-title">' + esc(record.title) + '</span>' +
      (record.meta && record.meta.length
        ? '<span class="cmeta">' + esc(record.meta.join(' · ')) + '</span>'
        : '') + '</div>' +
      state.face + state.details + '</div>';
  }

  function sortReadableRows(rows) {
    rows.sort(function (a, b) {
      return (a.attention ? 0 : 1) - (b.attention ? 0 : 1) ||
        (a.priority || 0) - (b.priority || 0) ||
        (a.index || 0) - (b.index || 0) ||
        String(a.identity || '').localeCompare(String(b.identity || ''));
    });
    return rows;
  }

  /* Connections names the person immediately above the protagonist, not
     merely their realm. Unlanded households answer first to their generated
     local lord; starts without that role fall back to the ruler of the home
     county's direct holder. Landed households use their explicit feudal
     parent, while sovereigns correctly have no direct-liege connection. */
  function networkDirectLiege(s) {
    const p = s && s.player;
    if (!p) return null;
    const localLordId = s.roles && s.roles.lord;
    const localLord = localLordId && s.chars && s.chars[localLordId];
    if (p.tier < 3 && localLord && !localLord.dead) return localLord;
    let rid = p.liege || null;
    if (!rid && p.tier < 3) {
      rid = s.holder && s.holder[p.provinceId] ||
        s.owner && s.owner[p.provinceId] || null;
    }
    if (!rid || rid === 'player' || !FB.realmRulerCharacterSnapshot) {
      return null;
    }
    return FB.realmRulerCharacterSnapshot(s, rid);
  }

  function renderNetwork() {
    const s = FB.state;
    const box = $('tab-network');
    if (activeNetworkState !== s) {
      activeNetworkState = s;
      activeNetworkSection = FB.isTouch ? null : NETWORK_SECTIONS[0];
    }
    const me = s.chars[s.player.charId];
    const family = FB.householdMembers(s);
    const retainers = FB.retainerRecords(s);
    const capacity = FB.retainerCapacity(s);
    const businesses = FB.enterpriseList(s);
    const workAssignments = {};
    for (const enterprise of businesses) {
      const def = FBDATA.enterprises[enterprise.type];
      for (const workerId of FB.enterpriseWorkerIds(enterprise)) {
        if (!workAssignments[workerId]) {
          workAssignments[workerId] = [];
        }
        workAssignments[workerId].push(def
          ? dt(s, 'enterprise', enterprise.type, def, 'name')
          : enterprise.type);
      }
    }

    const householdById = {};
    let householdOrder = 0;
    function householdRecord(c) {
      if (!c || c.dead) return null;
      if (!householdById[c.id]) {
        householdById[c.id] = {
          character:c, family:false, retainer:null, index:householdOrder++
        };
      }
      return householdById[c.id];
    }
    for (const c of family) householdRecord(c).family = true;
    for (const retainer of retainers) {
      const c = s.chars[retainer.charId];
      const record = householdRecord(c);
      if (record) record.retainer = retainer;
    }
    const householdRows = [];
    for (const cid in householdById) {
      const source = householdById[cid];
      const c = source.character;
      const career = FB.careerOf(s, c);
      const def = career && FBDATA.careers[career.profession];
      const meta = [];
      if (source.family) {
        meta.push(c.id === me.id ? FB.T('You — Household head') :
          (relationText(s, c) || FB.T('Resident family')));
      }
      if (source.retainer) {
        meta.push(positionName(s, source.retainer.office));
        meta.push(FB.T('{money:pay}/season', {
          pay:source.retainer.pay || 0
        }));
        const officeEffect = positionEffectText(source.retainer.office);
        if (officeEffect) meta.push(officeEffect);
      }
      meta.push(FB.careerTitle(s, c) +
        (def && def.guild && career.guildRank !== 'none'
          ? ' · ' + FB.guildTitle(career) : ''));
      if (workAssignments[c.id] && workAssignments[c.id].length) {
        meta.push(FB.T('Staffs {work}', {
          work:workAssignments[c.id].join(', ')
        }));
      }
      const unpaid = source.retainer && source.retainer.unpaid;
      if (unpaid) {
        meta.push(FB.T('Pay missed this season'));
      }
      const model = {
        character:c,
        meta:meta,
        attention:!!unpaid,
        state:unpaid ? 'warning' : 'routine',
        stateLabel:unpaid ? FB.T('Pay warning') : FB.T('Established'),
        priority:source.retainer ? 1 : 0,
        index:source.index,
        identity:c.id
      };
      model.stateDetails = networkCharacterStateDetails(s, model);
      model.html = networkReadablePersonRow(s, 'household', model);
      householdRows.push(model);
    }
    if (capacity > retainers.length) {
      const vacancyCount = capacity - retainers.length;
      const vacancy = {
        attention:true,
        state:'vacancy',
        stateLabel:FB.T('Vacancy'),
        priority:-1,
        index:0,
        identity:'retainer-vacancy',
        html:''
      };
      const vacancyAttrs = largeListRowAttrs({
          attention:true,
          states:['people', 'vacancy'],
          identity:'retainer-vacancy'
        });
      vacancy.html = networkActionHtml('hire-retainer',
        'id="network-hire" data-network-action ' +
        'data-list-focus-key="household-retainer-vacancy"',
        esc(FB.T('Hire a retainer…')),
        '<b>' + esc(FB.T('Vacancy')) + '</b><br>' +
        esc(FB.T(
          '{count} household service slots are open. Service is paid each season.', {
          count:vacancyCount
        })), {
          wrapperClass:' network-list-entry network-list-action-row',
          wrapperAttrs:vacancyAttrs
        });
      householdRows.push(vacancy);
    }
    sortReadableRows(householdRows);
    const householdCost = FB.householdUpkeepParts(s);
    const standardSummary = householdStandardsSummary(s);
    let householdSummary = '<div class="network-household-summary">' +
      kv('Resident family', esc(String(family.length))) +
      kv('Paid retainers', esc(FB.T('{used} of {capacity}', {
        used:retainers.length, capacity:capacity
      }))) +
      kv('Paid enterprise workers', esc(String(FB.enterpriseLaborRecords
        ? FB.enterpriseLaborRecords(s).length : 0))) +
      kv('Family establishment each season',
        esc(FB.money(householdCost.total))) +
      kv('Maintained standards each season',
        esc(FB.money(FB.householdStandardsUpkeep(s)))) +
      '<div class="kv network-household-standards"><span>' +
      esc(FB.T('Active household standards')) + '</span><b>' +
      esc(standardSummary || FB.T('None')) + '</b></div>';
    if (retainers.length) {
      householdSummary += kv('Retainer contracts each season',
        esc(FB.money(FB.retainerSeasonCost(s))));
    }
    if (FB.enterpriseLaborSeasonCost && FB.enterpriseLaborSeasonCost(s)) {
      householdSummary += kv('Enterprise wages each season',
        esc(FB.money(FB.enterpriseLaborSeasonCost(s))));
    }
    householdSummary += '</div>' + networkActionHtml('household-plan',
      'id="network-household-plan" data-network-action',
      '📋 ' + esc(FB.T('Household Plan…')),
      esc(FB.T(
        'Review education, work, assignments, matches, and equipment for every managed person.')));
    if (!capacity) {
      householdSummary += '<div class="hint">' + esc(FB.T(
        'A serf household cannot yet maintain paid servants.')) + '</div>';
    } else if (capacity === retainers.length) {
      householdSummary += '<div class="hint">' + esc(FB.T(
        'The household is at its retainer capacity.')) + '</div>';
    }

    const connectionById = {};
    let connectionOrder = 0;
    function addConnection(c, label, priority, attention, attentionLabel) {
      if (!c || c.dead) return;
      let record = connectionById[c.id];
      if (!record) {
        record = connectionById[c.id] = {
          character:c, labels:[], priority:priority,
          attention:false, state:'routine', stateLabel:FB.T('Known tie'),
          index:connectionOrder++, identity:c.id
        };
      }
      if (record.labels.indexOf(label) < 0) record.labels.push(label);
      record.priority = Math.min(record.priority, priority);
      if (attention) {
        record.attention = true;
        record.state = 'commitment';
        record.stateLabel = attentionLabel || FB.T('Active commitment');
      }
    }
    const attentionTarget = FB.socialAttentionTarget(s);
    const directLiege = networkDirectLiege(s);
    addConnection(directLiege, FB.T('Direct liege'), -1, false);
    const friend = FB.getRole(s, 'friend', false);
    addConnection(friend, FB.T('Your friend'), 0,
      attentionTarget && friend && attentionTarget.id === friend.id);
    const cultivated = FB.friendConnections(s).slice().sort(function (a, b) {
      return String(a.id).localeCompare(String(b.id));
    });
    for (const c of cultivated) {
      addConnection(c, FB.T('Cultivated connection'), 1,
        attentionTarget && attentionTarget.id === c.id);
    }
    const connectionRoles = [
      { id:'rival', label:roleName('rival'), priority:2,
        attention:true, attentionLabel:FB.T('Warning') },
      { id:'suitor', label:roleName('suitor'), priority:3,
        attention:true, attentionLabel:FB.T('Opportunity') },
      { id:'priest', label:roleName('priest'), priority:4 },
      { id:'steward', label:roleName('steward'), priority:5 },
      { id:'notable', label:FB.T('Neighbor'), priority:6 },
      { id:'lord', label:roleName('lord'), priority:7 }
    ];
    for (const role of connectionRoles) {
      const c = FB.getRole(s, role.id, false);
      addConnection(c, role.label, role.priority, !!role.attention,
        role.attentionLabel);
    }
    if (attentionTarget) {
      addConnection(attentionTarget, FB.T('Personal attention'), 1, true,
        s.player.courtingId === attentionTarget.id
          ? FB.T('Courtship') : FB.T('Active commitment'));
    }
    const connectionRows = [];
    for (const cid in connectionById) {
      const record = connectionById[cid];
      record.meta = record.labels.slice();
      record.detailMeta = record.labels.slice();
      record.meta.push(FB.T('Standing {standing}', {
        standing:standingValue(FB.standingOf(s, {
          kind:'character', id:record.character.id
        }))
      }));
      record.stateDetails = networkCharacterStateDetails(s, record);
      record.html = networkReadablePersonRow(s, 'connections', record);
      connectionRows.push(record);
    }
    sortReadableRows(connectionRows);
    let connectionsSummary = '<div class="progressnote">' +
      esc(socialAttentionSummary(s)) + '</div>';
    if (!friend) {
      connectionsSummary += '<div class="hint">' + esc(FB.T(
        'No friend yet. Cultivate a contact, then name them from their sheet.')) +
        '</div>';
    }

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
    const tradeRows = [];
    let tradeIndex = 0;
    function monopolyRow(direction, monopoly) {
      const active = !!monopoly;
      const issuer = active
        ? monopoly.grantorName || monopoly.grantorRulerName : '';
      const title = direction === 'incoming'
        ? FB.T('Incoming monopoly') : FB.T('Outgoing monopoly');
      const meta = active ? [
        monopolyProfessionName(monopoly),
        FB.T('Issuer: {issuer}', { issuer:issuer }),
        direction === 'incoming'
          ? FB.T('Recipient: your household')
          : (monopoly.advocateName
            ? FB.T('Recipient: local {profession} guild, represented by {advocate}', {
              profession:monopolyProfessionName(monopoly),
              advocate:monopoly.advocateName
            })
            : FB.T('Recipient: local {profession} guild', {
              profession:monopolyProfessionName(monopoly)
            })),
        FB.T('{tier} terms', { tier:monopolyTierName(monopoly.tier) }),
        FB.T('+{enterprise}% matching enterprise profit', {
          enterprise:Math.round(monopoly.enterpriseBonus * 100)
        }),
        direction === 'incoming'
          ? FB.T('Issuer tax +{tax}%', {
            tax:Math.round(monopoly.taxBonus * 100)
          })
          : FB.T('Your tax +{tax}%', {
            tax:Math.round(monopoly.taxBonus * 100)
          }),
        FB.T('{days} days remain', {
          days:FB.guildMonopolyRemainingDays(s, monopoly)
        })
      ] : [FB.T('None')];
      if (active && monopoly.goodId && FBDATA.marketGoods[monopoly.goodId]) {
        const good = FBDATA.marketGoods[monopoly.goodId];
        meta.push(FB.T('{good} · {mode}', {
          good:(good.icon || '') + ' ' +
            dt(s, 'marketGood', monopoly.goodId, good, 'name'),
          mode:monopoly.mode === 'corridor' ? FB.T('one corridor') :
            monopoly.mode === 'craft' ? FB.T('local craft output') :
            FB.T('local exchange')
        }));
        if (monopoly.mode === 'corridor') {
          const destination = FB.world.byId[monopoly.destinationId];
          meta.push(FB.T('Corridor to {destination}', {
            destination:destination ? destination.name : monopoly.destinationId
          }));
        }
      }
      if (active && monopoly.scope === 'province') {
        const province = FB.world.byId[monopoly.scopeId];
        meta.push(FB.T('Local to {province}', {
          province:province ? province.name : monopoly.scopeId
        }));
      } else if (active && direction === 'incoming') {
        meta.push(FB.T('Bound to the direct liege relationship with {grantor}', {
          grantor:issuer
        }));
      } else if (active) {
        meta.push(FB.T('Valid while the dynasty retains landed authority.'));
      }
      const record = {
        attention:active,
        state:active ? 'commitment' : 'routine',
        stateLabel:active ? FB.T('Active commitment') : FB.T('Open slot'),
        priority:active ? 0 : 4,
        index:tradeIndex++,
        identity:'monopoly-' + direction,
        kind:'other',
        title:title,
        meta:meta
      };
      record.html = networkReadableStaticRow(record);
      tradeRows.push(record);
    }
    const incomingMonopoly = FB.guildMonopolyActive(s, 'incoming');
    const outgoingMonopoly = FB.guildMonopolyActive(s, 'outgoing');
    monopolyRow('incoming', incomingMonopoly);
    monopolyRow('outgoing', outgoingMonopoly);
    const financeCommitment = financeCommitmentText(s);
    if (financeCommitment) {
      const record = {
        attention:true,
        state:'commitment',
        stateLabel:FB.T('Active commitment'),
        priority:0,
        index:tradeIndex++,
        identity:'financial-contracts',
        kind:'other',
        title:FB.T('Financial contracts'),
        meta:[financeCommitment]
      };
      record.html = networkReadableStaticRow(record);
      tradeRows.push(record);
    }

    let guildCount = 0;
    for (const c of FB.householdWorkers(s)) {
      const career = FB.careerOf(s, c);
      const def = career && FBDATA.careers[career.profession];
      if (!def || !def.guild || career.guildRank === 'none') continue;
      guildCount++;
      const favor = FB.guildFavor(s, c);
      const mult = FB.guildIncomeMultiplier(career);
      const step = FB.guildAdvance(s, c);
      const rankOrder = {
        none:0, member:1, master:2, officer:3, guildmaster:4
      };
      const unlocked = [];
      for (const eid in FBDATA.enterprises) {
        const enterpriseDef = FBDATA.enterprises[eid];
        if (enterpriseDef.profession !== career.profession) continue;
        if (enterpriseDef.guildRank &&
            (rankOrder[career.guildRank] || 0) <
            (rankOrder[enterpriseDef.guildRank] === undefined
              ? 99 : rankOrder[enterpriseDef.guildRank])) continue;
        unlocked.push(dt(s, 'enterprise', eid, enterpriseDef, 'name'));
      }
      const requirements = [];
      if (step) {
        requirements.push(FB.T('{money:cost}', { cost:step.cost }));
        if (step.need) {
          requirements.push(FB.T('Stewardship {value}', {
            value:step.need
          }));
        }
        if (step.learning) {
          requirements.push(FB.T('Lettered'));
          requirements.push(FB.T('Learning {value}', {
            value:step.learning
          }));
        }
        if (step.prestige) {
          requirements.push(FB.T('{prestige} prestige', {
            prestige:step.prestige
          }));
        }
      }
      const meta = [
        FB.careerTitle(s, c),
        FB.guildTitle(career),
        FB.T('Guild standing {standing}', {
          standing:Math.round(career.guildStanding || 0)
        }),
        FB.T('+{gain} each active vocational year · maximum {maximum}', {
          gain:FBDATA.balance.guildStandingYearlyGain !== undefined
            ? FBDATA.balance.guildStandingYearlyGain : 5,
          maximum:FBDATA.balance.guildStandingMax !== undefined
            ? FBDATA.balance.guildStandingMax : 100
        }),
        FB.T('+{percent}% enterprise profit', {
          percent:Math.round((mult - 1) * 100)
        })
      ];
      if (step) {
        meta.push(FB.T('Next rank: {rank} — requires {requirements}.', {
          rank:FB.guildTitle({ guildRank:step.to }),
          requirements:requirements.join(', ')
        }));
      } else {
        meta.push(FB.T('Highest guild rank'));
      }
      if (unlocked.length) {
        meta.push(FB.T('Available enterprises: {enterprises}.', {
          enterprises:unlocked.join(', ')
        }));
      }
      if (c.id === me.id && career.profession === 'craftsman') {
        meta.push(FB.T(
          'Personal work perk: guild membership adds {money:amount} to each season at the bench.',
          { amount:1 }));
      }
      const favorDetails = !favor ? FB.T('No guild favor is available.')
          : !favor.cooldownReady ? FB.T('Only one guild favor may be called each year.')
          : favor.standing < favor.cost ? FB.T(
            'Requires {standing} standing; currently {current}. Active guild work restores {gain} each New Year, up to {maximum}.', {
              standing:favor.cost,
              current:Math.round(favor.standing),
              gain:FBDATA.balance.guildStandingYearlyGain !== undefined
                ? FBDATA.balance.guildStandingYearlyGain : 5,
              maximum:FBDATA.balance.guildStandingMax !== undefined
                ? FBDATA.balance.guildStandingMax : 100
            }) : FB.T(
              'Spend {standing} standing for commissions worth {money:amount}; one favor may be called each year. (spends the day)', {
                standing:favor.cost, amount:favor.amount
              });
      const actionHtml = networkActionHtml('guild-favor-' + c.id,
        'data-network-action data-guild-favor="' + esc(c.id) + '"' +
        (!favor || !favor.ready ? ' disabled' : '') +
        ' data-list-focus-key="guild-favor-' + esc(c.id) + '"',
        esc(FB.T('Call in guild commissions')), esc(favorDetails), {
          wrapperClass:' network-inline-action'
        });
      const record = {
        character:c,
        meta:meta,
        actionHtml:actionHtml,
        attention:!!(favor && favor.ready),
        state:favor && favor.ready ? 'opportunity' : 'routine',
        stateLabel:favor && favor.ready ? FB.T('Opportunity') : FB.T('Guild tie'),
        priority:1,
        index:tradeIndex++,
        identity:c.id
      };
      record.html = networkReadablePersonRow(s, 'trade', record);
      tradeRows.push(record);
    }
    for (const id of FB.playerPositionIds(s)) {
      const def = FBDATA.positions[id];
      const record = {
        attention:false,
        state:'routine',
        stateLabel:FB.T('Office'),
        priority:2,
        index:tradeIndex++,
        identity:'position-' + id,
        kind:'other',
        title:def.icon + ' ' + positionName(s, id),
        meta:[positionEffectText(id), positionDesc(s, id)]
      };
      record.html = networkReadableStaticRow(record);
      tradeRows.push(record);
    }
    if (businesses.length) {
      let businessGold = 0;
      for (const enterprise of businesses) {
        businessGold += FB.enterpriseYield(s, enterprise);
      }
      const record = {
        attention:false,
        state:'routine',
        stateLabel:FB.T('Owned'),
        priority:3,
        index:tradeIndex++,
        identity:'family-enterprises',
        kind:'other',
        title:FB.T('Family enterprises'),
        meta:[FB.T('{count} owned', { count:businesses.length }),
          FB.T('About {money:gold}/season', {
            gold:Math.round(businessGold * 10) / 10
          })]
      };
      record.html = networkReadableStaticRow(record);
      tradeRows.push(record);
    }
    sortReadableRows(tradeRows);
    let tradeSummary =
      networkActionHtml('market',
        'id="network-market" data-network-action',
        '⚖ ' + esc(FB.T('Market…')),
        esc(FB.T(
          'Inspect local prices, stocks, historical endowments, ventures, and charters.'))) +
      networkActionHtml('work',
        'id="network-work" data-network-action',
        '🧰 ' + esc(FB.T('Work & Enterprises…')),
        esc(FB.T(
          'Open the authoritative career, office, enterprise, and staffing controls.')));
    if (FB.financeUiRelevant(s)) {
      tradeSummary += networkActionHtml('finance',
        'id="network-finance" data-network-action',
        '📜 ' + esc(FB.T('Finance…')),
        esc(FB.T(
          'Review loans, trade partnerships, dispatched ventures, and coinage.')));
    }
    if (FB.privilegeSummary) {
      const privilegeCount = FB.privilegeSummary(s).length;
      const demandSummary = FB.collectiveDemandSummary
        ? FB.collectiveDemandSummary(s) : { opposition:[] };
      tradeSummary += networkActionHtml('privileges',
        'id="network-privileges" data-network-action',
        '📜 ' + esc(FB.T('Privileges & charters…')),
        esc(FB.T(
          '{count} active legal contracts · {opposition} organized constituencies. Review holders, scope, exact effects, terms, and revocation.', {
            count:privilegeCount,
            opposition:demandSummary.opposition.length
          })));
    }
    if (incomingMonopoly || outgoingMonopoly) {
      tradeSummary += '<div class="hint">' + esc(FB.T(
        'Active charters cannot be renewed, revoked, or replaced before they end. Matching incoming and outgoing enterprise bonuses add together, capped at +50%.')) +
        '</div>';
    }
    if (!guildCount) {
      tradeSummary += '<div class="hint">' + esc(FB.T(
        'No household guild members.')) + '</div>';
    }
    if (FB.tradeInvestmentStakes) {
      const stakes = FB.tradeInvestmentStakes(s);
      for (const stake of stakes) {
        tradeSummary += kv('Available trade-partnership stake',
          esc(FB.money(stake)));
      }
    }

    const composition = FB.playerCompositionBreakdown(s);
    const governance = FB.governanceSummary
      ? FB.governanceSummary(s) : null;
    const politics = governance && governance.politics;
    const politicalRows = [];
    let politicalSummary = '';
    if (politics) {
      politicalSummary =
        kv('Court influence', esc(String(politics.totalInfluence))) +
        kv('Strict majority', esc(String(politics.majority))) +
        (politics.motion
          ? '<div class="progressnote">' +
            esc(SH.politicalMotionName(politics.motion.motionId) + ' · ' +
              SH.politicalTotalsText(politics.motion)) + '</div>'
          : '<div class="hint">' + esc(politics.forecasts
            ? FB.T('No motion is pending; current allegiances and ordinary Estates forecasts are shown below.')
            : FB.T('No motion is pending; current allegiances and influence are shown below.')) +
            '</div>') + networkActionHtml('politics',
          'id="network-politics" data-network-action',
          '🏛 ' + esc(FB.T('Open political blocs in Governance…')),
          esc(FB.T(
            'Review leaders, member houses, interests, influence, and any pending vote forecast.')));
      const displayedBlocs = politics.motion
        ? politics.motion.blocs : politics.blocs;
      for (let i = 0; i < displayedBlocs.length; i++) {
        const bloc = displayedBlocs[i];
        const def = FBDATA.politicalBlocs[bloc.archetypeId] || {};
        const meta = [
          FB.T('{influence} influence', {
            influence:bloc.influence
          }),
          FB.T('{count} member houses', {
            count:bloc.members.length
          })
        ];
        if (politics.motion) {
          meta.push(SH.politicalPostureText(bloc.posture));
          if (bloc.posture === 'undecided') {
            meta.push(FB.T('{chance}% natural support', {
              chance:Math.round(bloc.naturalSupportChance * 100)
            }));
          }
        } else if (politics.forecasts) {
          let shown = 0;
          const policies = FB.policyList ? FB.policyList() : [];
          for (const entry of policies) {
            if (shown >= 2) break;
            const forecast = politics.forecasts[entry.id];
            const status = FB.parliamentMotionStatus
              ? FB.parliamentMotionStatus(s, entry.id) : null;
            if (!forecast || !status || !status.ready) continue;
            const compact = SH.politicalCompactForecast(
              SH.politicalForecastBloc(forecast, bloc.id), entry.id);
            if (compact) {
              meta.push(compact);
              shown++;
            }
          }
        }
        const attention = !!(politics.motion &&
          bloc.posture === 'undecided');
        const overviewLines = [];
        if (def.desc) {
          overviewLines.push(dt(s, 'politicalBloc', bloc.archetypeId,
            def, 'desc'));
        }
        let leader = null;
        for (const house of politics.houses || []) {
          if (house.id === bloc.leaderHouseId) {
            leader = house;
            break;
          }
        }
        if (leader) {
          overviewLines.push(FB.T('Leader: {leader}', {
            leader:leader.name
          }));
        }
        overviewLines.push(meta.join(' · '));
        let politicalDetails = networkContextSectionHtml(
          FB.T('Overview'), overviewLines);
        if (bloc.members && bloc.members.length) {
          const memberPreview = bloc.members.slice(0, 4).map(function (house) {
            return house.name;
          }).join(', ');
          politicalDetails += networkContextSectionHtml(FB.T('Members'), [
            bloc.members.length > 4
              ? FB.T('{members} (+{count} more)', {
                members:memberPreview,
                count:bloc.members.length - 4
              })
              : memberPreview
          ]);
        }
        if (bloc.interests && bloc.interests.length &&
            SH.politicalInterestReason) {
          const interestLimit = 3;
          const rankedInterests = bloc.interests.map(function (item, index) {
            return { item:item, index:index };
          }).sort(function (a, b) {
            return Math.abs(Number(b.item.value) || 0) -
              Math.abs(Number(a.item.value) || 0) || a.index - b.index;
          });
          const interestLines = rankedInterests.slice(0, interestLimit).map(
            function (item) {
              return SH.politicalInterestReason(s, politics, item.item);
            });
          politicalDetails += networkContextSectionHtml(
            FB.T('Key interests'), interestLines,
            'network-state-interest-preview');
          if (bloc.interests.length > interestLimit) {
            politicalDetails += '<div class="network-state-context-more">' +
              esc(FB.T(
                '+{count} more interests. Open Governance for the full breakdown.', {
                  count:bloc.interests.length - interestLimit
                })) + '</div>';
          }
        }
        const attrs = largeListRowAttrs({
          attention:attention,
          states:['realms', attention ? 'opportunity' : 'routine'],
          identity:'political-' + bloc.id
        });
        const row = {
          attention:attention,
          state:attention ? 'opportunity' : 'routine',
          stateLabel:politics.motion
            ? SH.politicalPostureText(bloc.posture) : FB.T('Established'),
          stateDetails:'<div class="network-state-context">' +
            politicalDetails + '</div>',
          priority:i,
          index:i,
          identity:'political-' + bloc.id,
          kind:'realms'
        };
        const blocState = networkStatePresentation(row,
          'political-' + bloc.id, FB.T('Established'));
        row.html = '<div class="large-list-entry network-list-entry' +
          blocState.cardClass + '"' +
          attrs + '><button type="button" class="actionbtn ' +
          'large-list-target-button" data-network-political-bloc="' +
          esc(bloc.id) + '" data-list-focus-key="political-' +
          esc(bloc.id) + '"><span class="large-list-row-copy">' +
          '<span class="large-list-row-title">' + (def.icon || '') + ' ' +
          esc(SH.politicalBlocName(s, politics, bloc)) + '</span>' +
          '<span class="adesc">' + esc(meta.join(' · ')) +
          '</span></span>' + blocState.face + '</button>' +
          blocState.details + '</div>';
        politicalRows.push(row);
      }
    }
    const realmSpecialRows = [];
    let realmSummary = '';
    const localCouncil = FB.localCouncilValidate &&
      FB.localCouncilValidate(s, true);
    if (localCouncil) {
      const councilProvince = FB.world.byId[localCouncil.provinceId];
      const ordinance = FB.localCouncilOrdinance(s);
      const ordinanceDef = ordinance &&
        FBDATA.localCouncilMotions[ordinance.id];
      const nextDays = Math.max(0,
        (Number(localCouncil.nextMotionTurn) || 0) - s.turn);
      realmSummary += kv('Town council locality', esc(councilProvince
        ? councilProvince.name : localCouncil.provinceId)) +
        kv('Active ordinance', esc(ordinanceDef
          ? dt(s, 'localCouncilMotion', ordinance.id, ordinanceDef, 'name')
          : FB.T('None'))) +
        (ordinance ? kv('Ordinance expiry', esc(FB.T('{days} days remain', {
          days:Math.max(0, ordinance.endTurn - s.turn)
        }))) : '') +
        kv('Next council session', esc(nextDays
          ? FB.T('{days} days remain', { days:nextDays })
          : FB.T('Available now')));
      const councilRecord = {
        attention:nextDays === 0,
        state:nextDays === 0 ? 'opportunity' : 'commitment',
        stateLabel:nextDays === 0 ? FB.T('Opportunity') : FB.T('Active commitment'),
        priority:0,
        index:0,
        identity:'local-town-council',
        kind:'other',
        title:FB.T('Town Council of {province}', {
          province:councilProvince ? councilProvince.name : localCouncil.provinceId
        }),
        meta:[ordinanceDef
          ? FB.T('{ordinance} · {days} days remain', {
            ordinance:dt(s, 'localCouncilMotion', ordinance.id,
              ordinanceDef, 'name'),
            days:Math.max(0, ordinance.endTurn - s.turn)
          })
          : FB.T('No ordinance is active')]
      };
      councilRecord.html = networkReadableStaticRow(councilRecord);
      realmSpecialRows.push(councilRecord);
    }
    if (governance) {
      realmSummary += networkActionHtml('governance',
        'id="network-governance" data-network-action',
        '🏛 ' + esc(FB.T('Governance…')),
        esc(FB.T(
          'Open the authoritative view of your political position, domain, obligations, vassals, institution, and realm actions.')));
    }
    if (FB.councilActive && FB.councilActive(s)) {
      const council = s.council;
      let officers = 0, vacancies = 0;
      if (council && council.seats) {
        for (const seat of FB.councilSeats(s)) {
          const rid = council.seats[seat.id];
          const realm = rid && s.realms[rid];
          if (realm && realm.alive && realm.liege === 'player' &&
              FB.standingOf(s, { kind:'realm', id:rid }) > -50) {
            officers++;
          } else {
            vacancies++;
          }
        }
      } else {
        vacancies = FB.councilSeats(s).length;
      }
      realmSummary += networkActionHtml('council',
        'id="network-council" data-network-action',
        '🏛 ' + esc(FB.T('Royal Council')),
        esc(council
          ? FB.T(
            '{count} officers · {vacancies} vacancies or inactive seats · crown authority {authority}/100 · open the Council to manage the great offices.', {
              count:officers, vacancies:vacancies,
              authority:Math.round(council.authority)
            })
          : FB.T(
            'The great offices have not formed yet. Open the Council to establish them.')));
      if (vacancies) {
        const vacancyRecord = {
          attention:true,
          state:'vacancy',
          stateLabel:FB.T('Vacancy'),
          priority:0,
          index:0,
          identity:'council-vacancies',
          kind:'other',
          title:FB.T('Royal Council vacancies'),
          meta:[FB.T('{count} seats are vacant or inactive', {
            count:vacancies
          })]
        };
        vacancyRecord.html = networkReadableStaticRow(vacancyRecord);
        realmSpecialRows.push(vacancyRecord);
      }
    }
    if (FB.parliamentActive && FB.parliamentActive(s)) {
      realmSummary += networkActionHtml('estates',
        'id="network-estates" data-network-action',
        '📜 ' + esc(FB.T('The Estates…')),
        esc(FB.T(
          'Open the authoritative assembly view for aid, scutage, and current terms.')));
    }
    const realmById = {};
    let realmOrder = 0;
    function realmRecord(rid, priority) {
      const r = rid && s.realms[rid];
      if (!r || !r.alive) return null;
      if (!realmById[rid]) {
        realmById[rid] = {
          rid:rid, meta:[], actionHtml:'', attention:false,
          state:'routine', stateLabel:FB.T('Realm tie'),
          priority:priority, index:realmOrder++, identity:rid
        };
      }
      realmById[rid].priority = Math.min(realmById[rid].priority, priority);
      return realmById[rid];
    }
    function addRealmMeta(record, text) {
      if (record && text && record.meta.indexOf(text) < 0) {
        record.meta.push(text);
      }
    }
    if (!governance && s.player.liege && s.realms[s.player.liege]) {
      const liegeRecord = realmRecord(s.player.liege, 0);
      addRealmMeta(liegeRecord, FB.T('Direct liege'));
      addRealmMeta(liegeRecord, FB.T('Standing {standing}', {
        standing:standingValue(FB.standingOf(s, {
          kind:'realm', id:s.player.liege
        }))
      }));
      realmSummary += kv('Land grants received this life',
        esc(String(s.player.liegeGrants || 0)));
    }
    if (!governance) {
      for (const rid of FB.playerVassals(s)) {
        const record = realmRecord(rid, 1);
        let levy = 0;
        for (const entry of composition.entries) {
          if (entry.kind === 'vassal' && entry.rid === rid) levy += entry.amount;
        }
        addRealmMeta(record, FB.T('Direct vassal'));
        addRealmMeta(record, FB.T('Standing {standing}', {
          standing:standingValue(FB.standingOf(s, {
            kind:'realm', id:rid
          }))
        }));
        addRealmMeta(record, FB.T('Levy {men}', { men:Math.round(levy) }));
        const activeFavor = FB.vassalLevyFavor(s, rid);
        const readyFavor = FB.canCallVassalLevyFavor(s, rid);
        if (readyFavor) {
          record.attention = true;
          record.state = 'opportunity';
          record.stateLabel = FB.T('Opportunity');
        } else if (activeFavor) {
          record.attention = true;
          record.state = 'commitment';
          record.stateLabel = FB.T('Active commitment');
        }
        const favorDetails = activeFavor
            ? FB.T('The exceptional levy is already promised.')
            : FB.standingOf(s, { kind:'realm', id:rid }) < 40
              ? FB.T('Requires 40 Standing; currently {standing}.', {
                standing:standingValue(FB.standingOf(s, {
                  kind:'realm', id:rid
                }))
              })
              : FB.T(
                'For one year this vassal sends an extra {percent}% of its levy; lowers Standing by 15. (spends the day)', {
                  percent:Math.round(
                    (FBDATA.balance.vassalLevyFavorRate || 0.05) * 100)
                });
        record.actionHtml = networkActionHtml('vassal-favor-' + rid,
          'data-network-action data-vassal-favor="' + esc(rid) + '"' +
          (!readyFavor ? ' disabled' : '') +
          ' data-list-focus-key="vassal-favor-' + esc(rid) + '"',
          esc(FB.T('Ask for an exceptional levy')), esc(favorDetails), {
            wrapperClass:' network-inline-action'
          });
      }
    }

    const realmContacts = {};
    const policies = s.player.foreignPolicy || {};
    const pacts = s.pacts || {};
    for (const rid in policies) realmContacts[rid] = 1;
    for (const rid in pacts) if (pacts[rid] > s.turn) realmContacts[rid] = 1;
    for (const alliance of (s.alliances || [])) {
      if (alliance.a === 'player') realmContacts[alliance.b] = 1;
      if (alliance.b === 'player') realmContacts[alliance.a] = 1;
    }
    if (s.player.war && s.player.war.enemy) {
      realmContacts[s.player.war.enemy] = 1;
    }
    const realmContactIds = Object.keys(realmContacts).sort();
    for (const rid of realmContactIds) {
      const record = realmRecord(rid, 2);
      if (!record) continue;
      addRealmMeta(record, foreignPolicyStanceText(s, rid));
      addRealmMeta(record, foreignPolicyStatusText(s, rid));
      addRealmMeta(record, FB.T('Standing {standing}', {
        standing:standingText(FB.standingOf(s, {
          kind:'realm', id:rid
        }))
      }));
      record.attention = true;
      record.state = s.player.war && s.player.war.enemy === rid
        ? 'warning' : 'commitment';
      record.stateLabel = record.state === 'warning'
        ? FB.T('Warning') : FB.T('Active commitment');
    }

    const realmRows = [];
    for (const rid in realmById) {
      const record = realmById[rid];
      record.html = networkReadableRealmRow(s, record);
      realmRows.push(record);
    }
    for (const record of realmSpecialRows) realmRows.push(record);
    let levyIndex = 0;
    for (const entry of composition.entries) {
      const displayed = Math.round(entry.amount * 10) / 10;
      if (!displayed) continue;
      const record = {
        attention:false,
        state:'routine',
        stateLabel:FB.T('Levy source'),
        priority:5,
        index:levyIndex++,
        identity:'levy-' + entry.kind + '-' +
          (entry.rid || entry.pid || entry.buildingId ||
            entry.modifierId || entry.positionId || levyIndex),
        kind:'other',
        title:networkLevyLabel(s, entry),
        meta:[
          networkUnitName(s, entry.unit),
          (displayed > 0 ? '+' : '') + displayed
        ]
      };
      record.html = networkReadableStaticRow(record);
      realmRows.push(record);
    }
    sortReadableRows(realmRows);
    const summaryParts = FB.unitClassParts
      ? FB.unitClassParts(s, composition.units) : [];
    realmSummary += '<div class="progressnote">' + esc(summaryParts.length
      ? FB.T('{total} total · {composition}', {
          total:composition.total, composition:summaryParts.join(', ')
        })
      : FB.T('{total} total', { total:composition.total })) + '</div>';
    if (!realmRows.length) {
      realmSummary += '<div class="hint">' + esc(FB.T(
        'No personal host.')) +
        '</div>';
    }

    let intro = '<div class="hint">' + esc(FB.T(
      'The people and institutions tied to this household, and what each tie currently does.')) +
      '</div>';
    if ((!FB.game.uiPrefs || !FB.game.uiPrefs.hideBeginnerHints) &&
        FB.tutorialLife && FB.tutorialLife(s) &&
        !connectionRows.length && !tradeRows.length && !realmRows.length) {
      intro += '<div class="hint">' + esc(FB.T(
        '🌱 No ties yet.')) + '</div>';
    }
    const markup = intro + largeListSurfaceHtml('network', [
      {
        id:'household',
        hotkey:1,
        title:FB.T('Household'),
        summary:householdSummary,
        rows:householdRows,
        empty:FB.T('No household members.')
      },
      {
        id:'connections',
        hotkey:2,
        headingId:'network-connections',
        title:FB.T('Connections'),
        summary:connectionsSummary,
        rows:connectionRows,
        empty:FB.T('No named connections.')
      },
      {
        id:'trade',
        hotkey:3,
        title:FB.T('Trade & Guild'),
        summary:tradeSummary,
        rows:tradeRows,
        empty:FB.T('No trade or guild ties.')
      },
      {
        id:'politics',
        hotkey:4,
        title:FB.T('Political blocs'),
        summary:politicalSummary,
        rows:politicalRows,
        empty:FB.T('No political court.')
      },
      {
        id:'realm',
        hotkey:5,
        title:FB.T('Realm'),
        summary:realmSummary,
        rows:realmRows,
        empty:FB.T('No realm ties.')
      }
    ], [], { searchable:false });
    if (!replacePanelMarkup('network', box, markup)) {
      FB.paintFaces(box, s);
      refreshNetworkPanelShortcuts();
      return;
    }
    FB.localizeTree(box);
    FB.paintFaces(box, s);
    initLargeListSurface('network', { restoreFocus:true });
    if (SH.bindCardInfoToggles) SH.bindCardInfoToggles(box);
    const sectionToggles = box.querySelectorAll('[data-list-toggle]');
    for (let i = 0; i < sectionToggles.length; i++) {
      sectionToggles[i].addEventListener('click', function () {
        setActiveNetworkSection(
          sectionToggles[i].getAttribute('data-list-toggle'));
      });
    }
    const showAllButtons = box.querySelectorAll('[data-list-show-all]');
    for (let i = 0; i < showAllButtons.length; i++) {
      showAllButtons[i].addEventListener('click', refreshNetworkPanelShortcuts);
    }
    refreshNetworkPanelShortcuts();

    const householdPlan = $('network-household-plan');
    if (householdPlan) {
      householdPlan.addEventListener('click', UI.showHouseholdPlan);
    }
    const hire = $('network-hire');
    if (hire) hire.addEventListener('click', UI.showRetainerHire);
    const workButton = $('network-work');
    if (workButton) workButton.addEventListener('click', UI.showLivelihoods);
    const financeButton = $('network-finance');
    if (financeButton) financeButton.addEventListener('click', UI.showFinance);
    const marketButton = $('network-market');
    if (marketButton) marketButton.addEventListener('click', function () {
      UI.showMarket(s.player.provinceId, FB.map.marketGood || 'provisions');
    });
    const privilegesButton = $('network-privileges');
    if (privilegesButton) {
      privilegesButton.addEventListener('click', function () {
        UI.showPrivileges();
      });
    }
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
    const governanceButton = $('network-governance');
    if (governanceButton) {
      governanceButton.addEventListener('click', UI.showGovernance);
    }
    const politicsButton = $('network-politics');
    if (politicsButton) {
      politicsButton.addEventListener('click', function () {
        UI.showGovernance('blocs');
      });
    }
    box.querySelectorAll('[data-network-political-bloc]').forEach(
      function (button) {
        button.addEventListener('click', function () {
          UI.showGovernance('blocs');
        });
      });
    const councilButton = $('network-council');
    if (councilButton) councilButton.addEventListener('click', UI.showCouncil);
    const estatesButton = $('network-estates');
    if (estatesButton) estatesButton.addEventListener('click', function () {
      UI.showParliament();
    });
  }

  /* ================= family tree =================
     The Kin tab names each relation; this modal draws the blood lines so it
     is plain who hangs from whom. Each couple shares a box (current spouses
     first, then dead or former partners their children point back to), and
     each brood hangs beneath its parents. The main tree grows from the nearest
     recorded common ancestor of the house founder and current player through
     every descendant generation. Other maternal ancestors and stepfamily can
     still sit in supplementary trees; anyone already drawn above shows dimmed
     there instead of doubling the line. */
  SH.captureFamilyTreeView = function () {
    const gm = $('genmodal');
    const body = $('gm-body');
    if (!gm || !body || !gm.classList.contains('family-tree-modal')) return null;
    const toggles = body.querySelectorAll('[data-ft-toggle]');
    const wraps = body.querySelectorAll('.ftwrap');
    const active = document.activeElement;
    const state = {
      bodyTop:body.scrollTop,
      expanded:[], wraps:[], focusCid:null
    };
    for (let i = 0; i < toggles.length; i++) {
      state.expanded.push(toggles[i].getAttribute('aria-expanded') === 'true');
    }
    for (let i = 0; i < wraps.length; i++) {
      state.wraps.push({ left:wraps[i].scrollLeft, top:wraps[i].scrollTop });
    }
    if (active && active.classList && active.classList.contains('ftchip')) {
      state.focusCid = active.getAttribute('data-cid');
    }
    return state;
  };

  function familyTreeLegendTitle(s, c) {
    const legends = s.legends || [];
    let best = null;
    for (let i = 0; i < legends.length; i++) {
      const legend = legends[i];
      if (!legend || legend.id !== c.id || !legend.titleData ||
          Number(legend.titleData.tier) < 3) continue;
      if (!best || Number(legend.titleData.tier) > Number(best.tier)) {
        best = legend.titleData;
      }
    }
    return best;
  }

  function familyTreeRankLabel(s, c, tier) {
    const snap = FB.characterRankTitleSnapshot
      ? FB.characterRankTitleSnapshot(s, c, tier, '') : null;
    return snap && FB.renderTitleSnapshot
      ? FB.renderTitleSnapshot(snap) : FB.characterStationName(s, c);
  }

  /* The tree boxes stay navigationally small. The portrait tooltip supplies
     the social context, distinguishing a living current status from the
     highest territorial dignity this person actually held. */
  UI.familyTreeStatusHtml = function (s, c) {
    if (!s || !s.player || !c) return '';
    const isPlayer = c.id === s.player.charId;
    const realmId = !isPlayer && FB.realmIdForRulerCharacter
      ? FB.realmIdForRulerCharacter(s, c) : null;
    const realm = realmId && s.realms && s.realms[realmId];
    let status = '';
    let exactTier = null;
    if (isPlayer) exactTier = s.player.tier;
    else if (realm) exactTier = FB.clamp((realm.rank || 1) + 3, 4, 7);
    else if (c.statusTier !== undefined && isFinite(Number(c.statusTier))) {
      exactTier = FB.clamp(Math.floor(Number(c.statusTier)), 0, 7);
    }

    /* A living former ruler no longer owns the rank word. Their current
       standing is Noble/Royalty, while the next line preserves the crown. */
    const formerLivingRuler = !c.dead && !isPlayer && !realm &&
      c.highestTitleData && exactTier !== null && exactTier >= 3;
    const livingPersonalStation = !c.dead && !isPlayer && !realm &&
      c.station !== undefined && c.station !== null &&
      (exactTier === null || exactTier < 3);
    if (formerLivingRuler) {
      status = FB.stationName(FB.clamp(exactTier, 0, 4));
    } else if (livingPersonalStation) {
      status = FB.characterStationName(s, c);
    } else if (exactTier !== null) {
      status = familyTreeRankLabel(s, c, exactTier);
    } else if (c.station !== undefined && c.station !== null) {
      status = FB.characterStationName(s, c);
    } else {
      status = FB.characterStationName(s, c);
    }

    let highest = c.highestTitleData || familyTreeLegendTitle(s, c);
    if (!highest && isPlayer && s.player.tier >= 3 &&
        FB.playerStatusTitleSnapshot) {
      highest = FB.playerStatusTitleSnapshot(s);
    } else if (!highest && realm && FB.realmRulerTitleSnapshot) {
      highest = FB.realmRulerTitleSnapshot(s, realm, c);
    }
    let html = '<div class="family-tree-status-block"><div ' +
      'data-family-tree-status><span>' + esc(FB.T('Status')) + ':</span> ' +
      esc(status) + '</div>';
    if (highest && Number(highest.tier) >= 3) {
      html += '<div data-family-tree-highest-title><span>' +
        esc(FB.T('Highest title achieved')) + ':</span> ' +
        esc(FB.renderTitleSnapshot(highest)) + '</div>';
    }
    return html + '</div>';
  };

  UI.showFamilyTree = function (restoreView) {
    if (!FB.state || UI.eventsBusy()) return;
    /* The Kin button used to pass its click event into this optional state
       slot. Only a view captured by captureFamilyTreeView is restorable. */
    const savedView = restoreView && Array.isArray(restoreView.expanded) &&
      Array.isArray(restoreView.wraps) ? restoreView : null;
    const s = FB.state, me = s.chars[s.player.charId];
    const byId = FB.kinOf(s).byId;
    const drawn = {};
    let branchSerial = 0;

    const heirs = FB.heirsOf ? FB.heirsOf(s) : [];
    const successor = heirs.length ? heirs[0] : null;
    const spouse = FB.spouseOf ? FB.spouseOf(s, me) : null;
    let founder = s.player.houseFounderId && s.chars[s.player.houseFounderId];
    if (!founder && s.legends && s.legends.length) {
      for (const legend of s.legends) {
        const candidate = legend && s.chars[legend.id];
        if (candidate && candidate.dyn === me.dyn) {
          founder = candidate;
          break;
        }
      }
    }
    if (!founder) founder = me;
    const playerAncestorDepth = ancestorDistances(me);
    const extendedRelationCache = {};

    function ancestorLabel(c, depth) {
      if (c.sex === 'f') {
        if (depth === 3) return FB.T('Great-grandmother');
        return FB.T('{count}× great-grandmother', { count:depth - 2 });
      }
      if (depth === 3) return FB.T('Great-grandfather');
      return FB.T('{count}× great-grandfather', { count:depth - 2 });
    }

    function descendantLabel(c, depth) {
      if (c.sex === 'f') {
        if (depth === 3) return FB.T('Great-granddaughter');
        return FB.T('{count}× great-granddaughter', { count:depth - 2 });
      }
      if (depth === 3) return FB.T('Great-grandson');
      return FB.T('{count}× great-grandson', { count:depth - 2 });
    }

    function auntUncleLabel(c, ancestorDepth) {
      if (c.sex === 'f') {
        if (ancestorDepth === 3) return FB.T('Great-aunt');
        return FB.T('{count}× great-aunt', { count:ancestorDepth - 2 });
      }
      if (ancestorDepth === 3) return FB.T('Great-uncle');
      return FB.T('{count}× great-uncle', { count:ancestorDepth - 2 });
    }

    function nieceNephewLabel(c, descendantDepth) {
      if (c.sex === 'f') {
        if (descendantDepth === 3) return FB.T('Great-niece');
        return FB.T('{count}× great-niece', { count:descendantDepth - 2 });
      }
      if (descendantDepth === 3) return FB.T('Great-nephew');
      return FB.T('{count}× great-nephew', { count:descendantDepth - 2 });
    }

    function cousinDegreeLabel(degree) {
      if (degree === 1) return FB.T('First cousin');
      if (degree === 2) return FB.T('Second cousin');
      if (degree === 3) return FB.T('Third cousin');
      if (degree === 4) return FB.T('Fourth cousin');
      if (degree === 5) return FB.T('Fifth cousin');
      return FB.T('Cousin of degree {degree}', { degree:degree });
    }

    function cousinLabel(playerDepth, relativeDepth) {
      const cousin = cousinDegreeLabel(Math.min(playerDepth, relativeDepth) - 1);
      const removed = Math.abs(playerDepth - relativeDepth);
      if (!removed) return cousin;
      if (removed === 1) return FB.T('{cousin} once removed', { cousin:cousin });
      if (removed === 2) return FB.T('{cousin} twice removed', { cousin:cousin });
      return FB.T('{cousin} {count} times removed', {
        cousin:cousin, count:removed
      });
    }

    /* Compare each person with the player through their nearest recorded
       common ancestor. The two depths distinguish direct lines, siblings of
       ancestors or descendants, and cousin degree/removal without a limit. */
    function extendedBloodLabel(c) {
      if (Object.prototype.hasOwnProperty.call(extendedRelationCache, c.id)) {
        return extendedRelationCache[c.id];
      }
      const relativeAncestorDepth = ancestorDistances(c);
      let playerDepth = Infinity;
      let relativeDepth = Infinity;
      let bestTotal = Infinity;
      let bestSpan = Infinity;
      for (const id in playerAncestorDepth) {
        if (relativeAncestorDepth[id] === undefined) continue;
        const nextPlayerDepth = playerAncestorDepth[id];
        const nextRelativeDepth = relativeAncestorDepth[id];
        const total = nextPlayerDepth + nextRelativeDepth;
        const span = Math.max(nextPlayerDepth, nextRelativeDepth);
        if (total < bestTotal || (total === bestTotal && span < bestSpan)) {
          playerDepth = nextPlayerDepth;
          relativeDepth = nextRelativeDepth;
          bestTotal = total;
          bestSpan = span;
        }
      }
      let label = '';
      if (relativeDepth === 0 && playerDepth >= 3 && playerDepth < Infinity) {
        label = ancestorLabel(c, playerDepth);
      } else if (playerDepth === 0 && relativeDepth >= 3 && relativeDepth < Infinity) {
        label = descendantLabel(c, relativeDepth);
      } else if (relativeDepth === 1 && playerDepth >= 3 && playerDepth < Infinity) {
        label = auntUncleLabel(c, playerDepth);
      } else if (playerDepth === 1 && relativeDepth >= 3 && relativeDepth < Infinity) {
        label = nieceNephewLabel(c, relativeDepth);
      } else if (playerDepth >= 2 && relativeDepth >= 2 &&
        playerDepth < Infinity && relativeDepth < Infinity) {
        label = cousinLabel(playerDepth, relativeDepth);
      }
      extendedRelationCache[c.id] = label;
      return label;
    }

    function chip(c, rel, cls) {
      const extendedLabel = extendedBloodLabel(c);
      let label = rel ? FB.T(rel) : extendedLabel;
      if (!label && byId[c.id]) label = FB.T(byId[c.id]);
      if (rel === 'House founder' && extendedLabel) {
        label = FB.T('{role} · {relation}', {
          role:FB.T('House founder'), relation:extendedLabel
        });
      }
      const meta = c.dead ? '†' : FB.T('age {age}', { age: FB.ageOf(c, s.date.year) });
      const again = cls && cls.indexOf('dup') >= 0;
      const founderClass = c.id === founder.id ? ' founder' : '';
      return '<button class="ftchip' + (cls || '') + founderClass +
        (c.dead ? ' dead' : '') +
        '" data-cid="' + c.id + '" title="' + esc(FB.fullName(c)) +
        (label ? ' — ' + esc(label) : '') + '">' + FB.faceTag(c, 50, 57) +
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

    function unit(c) {
      if (drawn[c.id]) {
        // already on an earlier branch — point back rather than fork the line
        return '<div class="ftnode"><div class="ftcouple">' + chip(c, null, ' dup') + '</div></div>';
      }
      drawn[c.id] = 1;
      let couple = c.id === me.id ? chip(c, 'You', ' me') :
        chip(c, c.id === founder.id ? 'House founder' : null);
      for (const sp of matesOf(c)) {
        couple += chip(sp, byId[sp.id] || (sp.sex === 'f' ? 'Wife' : 'Husband'),
          drawn[sp.id] ? ' dup' : '');
        drawn[sp.id] = 1;
      }
      const kids = FB.childrenOf(s, c).sort(function (a, b) { return a.born - b.born; });
      const grow = kids.length > 0;
      let h = '<div class="ftnode"><div class="ftcouple">' + couple + '</div>';
      if (grow) {
        const branchId = 'ft-branch-' + (++branchSerial);
        h += '<button type="button" class="ftbranch-toggle" data-ft-toggle="' +
          esc(c.id) + '" aria-expanded="true" aria-controls="' + branchId +
          '"><span aria-hidden="true">−</span><span>' + esc(FB.T(
            'Collapse {name}’s branch', { name:c.name })) + '</span></button>' +
          '<div class="ftstem"></div><div class="ftkids" id="' + branchId + '">';
        for (const k of kids) h += unit(k);
        h += '</div>';
      }
      return h + '</div>';
    }

    /* The deepest recorded ancestor, father’s line preferred. A bounded
       lookup still serves the supplementary maternal tree; the disconnected
       save fallback walks the complete recorded line. */
    function topOf(c, maxUp) {
      let cur = c;
      const seen = {};
      const limit = maxUp === undefined ? Object.keys(s.chars).length : maxUp;
      for (let i = 0; i < limit; i++) {
        if (seen[cur.id]) break;
        seen[cur.id] = 1;
        const nxt = (cur.fatherId ? s.chars[cur.fatherId] : null) ||
          (cur.motherId ? s.chars[cur.motherId] : null);
        if (!nxt) break;
        cur = nxt;
      }
      return cur;
    }

    /* A house can pass to a sibling, nephew, cousin, or adopted collateral.
       When the founder is not the current head's direct ancestor, root the
       blood tree at their nearest recorded common ancestor so both branches
       remain connected without pretending the founder parented the heir. */
    function ancestorDistances(c) {
      const distance = {};
      const queue = [{ c:c, depth:0 }];
      for (let i = 0; i < queue.length; i++) {
        const row = queue[i];
        if (!row.c || distance[row.c.id] !== undefined) continue;
        distance[row.c.id] = row.depth;
        if (row.c.fatherId && s.chars[row.c.fatherId]) {
          queue.push({ c:s.chars[row.c.fatherId], depth:row.depth + 1 });
        }
        if (row.c.motherId && s.chars[row.c.motherId]) {
          queue.push({ c:s.chars[row.c.motherId], depth:row.depth + 1 });
        }
      }
      return distance;
    }

    function connectingRoot(a, b) {
      const fromA = ancestorDistances(a);
      const fromB = ancestorDistances(b);
      let best = null;
      let bestTotal = Infinity;
      let bestSpan = Infinity;
      for (const id in fromA) {
        if (fromB[id] === undefined || !s.chars[id]) continue;
        const total = fromA[id] + fromB[id];
        const span = Math.max(fromA[id], fromB[id]);
        if (total < bestTotal || (total === bestTotal && span < bestSpan)) {
          best = s.chars[id];
          bestTotal = total;
          bestSpan = span;
        }
      }
      return best || a;
    }

    let h = '<div class="family-tree-toolbar"><div class="family-tree-jumps" ' +
      'role="group" aria-label="' +
      esc(FB.T('Jump through the family tree')) + '">' +
      '<button type="button" class="btn small" data-ft-jump="' + esc(me.id) + '">' +
      esc(FB.T('You')) + '</button>' +
      '<button type="button" class="btn small" data-ft-jump="' +
      esc(successor ? successor.id : '') + '"' + (successor ? '' : ' disabled') + '>' +
      esc(FB.T('Successor')) + '</button>' +
      '<button type="button" class="btn small" data-ft-jump="' +
      esc(spouse ? spouse.id : '') + '"' + (spouse ? '' : ' disabled') + '>' +
      esc(FB.T('Spouse')) + '</button>' +
      '<button type="button" class="btn small" data-ft-jump="' + esc(founder.id) + '">' +
      esc(FB.T('House founder')) + '</button></div></div>';
    /* During the founder's own life, rooting at the founder would make the
       downward-only renderer omit their already-recorded parents and
       siblings. Include the nearby starting ancestry; later generations
       still use the founder/current-head connecting root. */
    const root = founder.id === me.id
      ? topOf(me, 2) : connectingRoot(founder, me);
    h += '<div class="ftwrap family-tree-canvas family-tree-primary"><div class="fttree">';
    if (root.id === me.id && !FB.parentsOf(s, me).length && FB.siblingsOf(s, me).length) {
      // safety net: save.js backfills parents on load; a tree can still lack
      // them if a mod stripped the chars — show the brood under a ghost
      let brood = unit(me);
      for (const sb of FB.siblingsOf(s, me)) brood += unit(sb);
      h += '<div class="ftnode"><div class="ftcouple"><div class="ftchip ghost">' +
        '<span class="fname">' + esc(FB.T('Unrecorded')) + '</span><span class="frel">' +
        esc(FB.T('your parents')) + '</span></div></div>' +
        '<div class="ftstem"></div><div class="ftkids">' + brood + '</div></div>';
    } else {
      h += unit(root);
    }
    /* Corrupt mods and old migrated saves can preserve the founder record
       after severing its parent links. Keep that record and the current
       lineage in this one primary canvas rather than reviving a detached
       founder viewport. */
    if (!drawn[me.id]) {
      const currentRoot = topOf(me);
      h += drawn[currentRoot.id] ? unit(me) : unit(currentRoot);
    }
    h += '</div></div>';
    // maternal ancestors above the founder-descendant tree retain a compact supplement
    const mo = me.motherId ? s.chars[me.motherId] : null;
    if (mo && (mo.fatherId || mo.motherId)) {
      const mroot = topOf(mo, 1);
      if (mroot.id !== mo.id && !drawn[mroot.id]) {
        h += panelh('Your mother’s kin') +
          '<div class="ftwrap"><div class="fttree">' + unit(mroot) + '</div></div>';
      }
    }
    const stepchildren = FB.stepchildrenOf ? FB.stepchildrenOf(s, me) : [];
    if (stepchildren.length) {
      const stepGroups = {};
      for (const child of stepchildren) {
        const parentIds = [child.fatherId, child.motherId].filter(function (id) {
          return !!(id && id !== me.id && s.chars[id]);
        }).sort();
        const key = parentIds.join('|') || child.id;
        if (!stepGroups[key]) {
          stepGroups[key] = { parents:parentIds, children:[] };
        }
        stepGroups[key].children.push(child);
      }
      h += panelh('Stepfamily') +
        '<div class="cmeta" style="font-size:13px">' +
        esc(FB.T('These are your spouse’s children by earlier unions. Their biological parentage and succession remain unchanged.')) +
        '</div>';
      for (const key in stepGroups) {
        const group = stepGroups[key];
        let couple = '';
        for (const parentId of group.parents) {
          const parent = s.chars[parentId];
          couple += chip(parent, parent.sex === 'f'
            ? 'Biological mother' : 'Biological father',
          drawn[parent.id] ? ' dup' : '');
          drawn[parent.id] = 1;
        }
        if (!couple) {
          couple = '<div class="ftchip ghost"><span class="fname">' +
            esc(FB.T('Earlier household')) + '</span><span class="frel">' +
            esc(FB.T('biological family')) + '</span></div>';
        }
        let branch = '<div class="ftnode"><div class="ftcouple">' + couple +
          '</div><div class="ftstem"></div><div class="ftkids">';
        group.children.sort(function (a, b) { return a.born - b.born; });
        for (const child of group.children) {
          branch += '<div class="ftnode"><div class="ftcouple">' +
            chip(child, child.sex === 'f' ? 'Stepdaughter' : 'Stepson',
              drawn[child.id] ? ' dup' : '') + '</div></div>';
          drawn[child.id] = 1;
        }
        h += '<div class="ftwrap"><div class="fttree">' + branch +
          '</div></div></div></div>';
      }
    }
    h += '<button class="btn" id="gm-cancel" style="margin-top:10px">' + esc(FB.T('Close')) + '</button>';
    openModal('The Family Tree', h, { modalClass:'family-tree-modal' });
    $('gm-cancel').addEventListener('click', UI.closeModal);
    const treeHeading = $('gm-title').parentNode;
    const treeInfoButton = document.createElement('button');
    const treeInfoTip = document.createElement('span');
    const compactTreeInfo = FB.isTouch || FB.isSmallScreen();
    treeInfoButton.type = 'button';
    treeInfoButton.className = 'modal-guide-button family-tree-info';
    treeInfoButton.setAttribute('aria-label', FB.T('About the family tree'));
    treeInfoButton.setAttribute('aria-expanded', 'false');
    treeInfoButton.setAttribute('aria-describedby', 'family-tree-info-tooltip');
    treeInfoButton.textContent = 'i';
    treeInfoTip.id = 'family-tree-info-tooltip';
    treeInfoTip.className = 'family-tree-info-tooltip';
    treeInfoTip.setAttribute('role', 'tooltip');
    treeInfoTip.textContent = compactTreeInfo
      ? FB.T('Blood lines run downward — each brood hangs beneath its parents. † marks the dead. Tap a face to open their sheet.')
      : FB.T('Blood lines run downward — each brood hangs beneath its parents. † marks the dead. Click a face to open their sheet; hover it for details. Drag the open background to move around.');
    treeHeading.classList.add('has-modal-guide');
    treeHeading.appendChild(treeInfoButton);
    treeInfoButton.appendChild(treeInfoTip);
    let treeInfoPinned = false;
    function showTreeInfo(open) {
      treeInfoTip.classList.toggle('is-open', open);
      treeInfoButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    treeInfoButton.addEventListener('mouseenter', function () {
      showTreeInfo(true);
    });
    treeInfoButton.addEventListener('mouseleave', function () {
      if (!treeInfoPinned) showTreeInfo(false);
    });
    treeInfoButton.addEventListener('focus', function () {
      showTreeInfo(true);
    });
    treeInfoButton.addEventListener('blur', function () {
      treeInfoPinned = false;
      showTreeInfo(false);
    });
    treeInfoButton.addEventListener('click', function () {
      treeInfoPinned = !treeInfoPinned;
      showTreeInfo(treeInfoPinned);
    });
    FB.paintFaces($('gm-body'), s);

    /* A wide genealogy is a canvas as much as a list. Mouse users can grab
       any non-interactive part of a tree viewport and pan in either axis;
       controls and portraits retain their ordinary click behavior. */
    if (!FB.isTouch) {
      const canvases = $('gm-body').querySelectorAll('.ftwrap');
      for (let i = 0; i < canvases.length; i++) {
        const canvas = canvases[i];
        canvas.classList.add('family-tree-canvas');
        canvas.addEventListener('mousedown', function (event) {
          if (event.button !== 0 || event.target.closest(
            'button, input, select, textarea, a, [tabindex]')) return;
          const startX = event.clientX;
          const startY = event.clientY;
          const startLeft = canvas.scrollLeft;
          const startTop = canvas.scrollTop;
          canvas.classList.add('is-panning');
          event.preventDefault();

          function move(moveEvent) {
            canvas.scrollLeft = startLeft - (moveEvent.clientX - startX);
            canvas.scrollTop = startTop - (moveEvent.clientY - startY);
          }
          function finish() {
            canvas.classList.remove('is-panning');
            document.removeEventListener('mousemove', move);
            document.removeEventListener('mouseup', finish);
            window.removeEventListener('blur', finish);
          }
          document.addEventListener('mousemove', move);
          document.addEventListener('mouseup', finish);
          window.addEventListener('blur', finish);
        });
      }
    }

    function setBranch(toggle, open) {
      const stem = toggle.nextElementSibling;
      const kids = stem && stem.nextElementSibling;
      if (!kids || !kids.classList.contains('ftkids')) return;
      kids.hidden = !open;
      stem.hidden = !open;
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.children[0].textContent = open ? '−' : '+';
      const c = s.chars[toggle.getAttribute('data-ft-toggle')];
      toggle.children[1].textContent = FB.T(open
        ? 'Collapse {name}’s branch' : 'Expand {name}’s branch', {
          name:c ? c.name : FB.T('this family')
        });
    }

    function revealChip(chipNode) {
      let node = chipNode && chipNode.parentElement;
      while (node && node !== $('gm-body')) {
        if (node.classList && node.classList.contains('ftkids') && node.hidden) {
          const stem = node.previousElementSibling;
          const toggle = stem && stem.previousElementSibling;
          if (toggle && toggle.hasAttribute('data-ft-toggle')) {
            setBranch(toggle, true);
          }
        }
        node = node.parentElement;
      }
    }

    function jumpToCharacter(cid) {
      if (!cid) return;
      const body = $('gm-body');
      const chips = body.querySelectorAll('.ftchip[data-cid]');
      let target = null;
      for (let i = 0; i < chips.length; i++) {
        if (chips[i].getAttribute('data-cid') === cid) {
          target = chips[i];
          break;
        }
      }
      if (!target) return;
      revealChip(target);
      const previous = body.querySelector('.ftchip.search-hit');
      if (previous) previous.classList.remove('search-hit');
      target.classList.add('search-hit');
      target.focus({ preventScroll:true });
      /* scrollIntoView is inconsistent across nested overflow containers in
         mobile WebViews. Move the tree canvas and modal body explicitly so
         the selected person, rather than the canvas origin, opens in view. */
      const wrap = target.closest('.ftwrap');
      if (wrap) {
        const wrapRect = wrap.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        wrap.scrollLeft += targetRect.left + targetRect.width / 2 -
          (wrapRect.left + wrapRect.width / 2);
        wrap.scrollTop += targetRect.top + targetRect.height / 2 -
          (wrapRect.top + wrapRect.height / 2);
      }
      const bodyRect = body.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      body.scrollTop += targetRect.top + targetRect.height / 2 -
        (bodyRect.top + bodyRect.height / 2);
    }

    const toggles = $('gm-body').querySelectorAll('[data-ft-toggle]');
    for (let i = 0; i < toggles.length; i++) {
      toggles[i].addEventListener('click', function () {
        setBranch(toggles[i],
          toggles[i].getAttribute('aria-expanded') !== 'true');
      });
    }
    const jumps = $('gm-body').querySelectorAll('[data-ft-jump]');
    for (let i = 0; i < jumps.length; i++) {
      jumps[i].addEventListener('click', function () {
        jumpToCharacter(jumps[i].getAttribute('data-ft-jump'));
      });
    }
    if (savedView) {
      for (let i = 0; i < toggles.length && i < savedView.expanded.length; i++) {
        setBranch(toggles[i], savedView.expanded[i]);
      }
      /* openModal's normal first-control focus is queued. Restore the tree
         viewport immediately after it so Back returns to the exact working
         position instead of pulling the toolbar into view. */
      setTimeout(function () {
        if (savedView.focusCid) {
          const focusChips = $('gm-body').querySelectorAll('.ftchip[data-cid]');
          let focusChip = null;
          for (let i = 0; i < focusChips.length; i++) {
            if (focusChips[i].getAttribute('data-cid') === savedView.focusCid) {
              focusChip = focusChips[i];
              break;
            }
          }
          if (focusChip) focusChip.focus({ preventScroll:true });
        }
        const restoredWraps = $('gm-body').querySelectorAll('.ftwrap');
        for (let i = 0; i < restoredWraps.length && i < savedView.wraps.length; i++) {
          restoredWraps[i].scrollLeft = savedView.wraps[i].left;
          restoredWraps[i].scrollTop = savedView.wraps[i].top;
        }
        $('gm-body').scrollTop = savedView.bodyTop;
      }, 0);
    } else {
      /* A lineage-rooted tree can place the active life many generations
         below and far across the opening viewport. Every fresh opening begins
         at the person the player is actually controlling; Back restoration
         above deliberately keeps the user's later pan position instead. Wait
         until openModal's queued focus and the tree's first layout have both
         completed. */
      setTimeout(function () {
        window.requestAnimationFrame(function () {
          jumpToCharacter(me.id);
        });
      }, 0);
    }
  };

  /* ---------- map filters: what a selection highlights ---------- */
  let mapMode = 'realm'; // realm | mine | liege | duchy | kingdom | war | market

  /* is pid held by the player or by one of the player's vassals? */
  function inPlayerRealm(s, pid) {
    const holdId = (s.holder && s.holder[pid]) || s.owner[pid];
    if (holdId === 'player') return true; // your own lands sit inside his realm
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
    if (mapMode === 'market') return 'market:' + pid;
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
    if (mapMode === 'war') {
      const w = s.player && s.player.war;
      if (w && w.enemy) {
        if ((s.owner && s.owner[pid] === w.enemy) || (s.holder && s.holder[pid] === w.enemy)) {
          return 'war_enemy';
        }
      }
      return inPlayerRealm(s, pid) ? 'player' : null;
    }
    // realm: your own province lights YOUR realm, a foreign one its sovereign's
    return inPlayerRealm(s, pid) ? 'player' : (s.owner[pid] || null);
  }

  function mapHighlightColorOf(pid) {
    const s = FB.state;
    if (!s) return null;
    if (mapMode === 'war' && s.player && s.player.war && s.player.war.enemy) {
      if ((s.owner && s.owner[pid] === s.player.war.enemy) || (s.holder && s.holder[pid] === s.player.war.enemy)) {
        return '#c8352b';
      }
    }
    return null;
  }

  const MAPMODES = { realm: 'Realm', mine: 'Mine', liege: 'Liege', duchy: 'De jure duchies', kingdom: 'De jure kingdoms', war: 'War', market: 'Market' };

  function marketLensControls(active) {
    const controls = $('market-lens-controls');
    const button = $('btn-marketlens');
    if (controls) controls.classList.toggle('hidden', !active);
    if (button) button.classList.toggle('on', active);
    if (active && UI.setMusicOverlay) UI.setMusicOverlay(false);
    if (UI.layoutMapToasts) UI.layoutMapToasts();
    const selector = $('market-lens-good');
    if (selector && active) {
      const ids = Object.keys(FBDATA.marketGoods || {});
      ids.sort(function (a, b) {
        const ao = Number(FBDATA.marketGoods[a].order) || 0;
        const bo = Number(FBDATA.marketGoods[b].order) || 0;
        return ao - bo || (a < b ? -1 : a > b ? 1 : 0);
      });
      let options = '';
      for (let i = 0; i < ids.length; i++) {
        const def = FBDATA.marketGoods[ids[i]];
        options += '<option value="' + esc(ids[i]) + '">' +
          esc((def.icon || '') + ' ' +
            dt(FB.state, 'marketGood', ids[i], def, 'name')) + '</option>';
      }
      selector.innerHTML = options;
      if (!FB.map.marketGood || !FBDATA.marketGoods[FB.map.marketGood]) {
        FB.map.marketGood = ids[0] || null;
      }
      selector.value = FB.map.marketGood;
    }
    if (FB.map && !active) FB.map.marketGood = null;
  }

  UI.setMarketLens = function (active) {
    if (!FB.state) return;
    mapMode = active === false ? 'realm' : 'market';
    if (mapMode === 'market' && UI.setFindOverlay && UI.isFindOverlayOpen && UI.isFindOverlayOpen()) {
      UI.setFindOverlay(false);
    }
    marketLensControls(mapMode === 'market');
    const btn = $('btn-mapmode');
    if (btn) {
      btn.classList.toggle('on', mapMode !== 'realm');
      btn.title = FB.T('Map filter: {mode} (R)', { mode:FB.T(MAPMODES[mapMode]) });
      btn.setAttribute('aria-label', btn.title);
    }
    const targetPid = FB.map.selected || FB.state.player.provinceId;
    FB.map.select(targetPid, mapGroupOf, mapHighlightColorOf(targetPid));
    FB.map.request();
  };

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
    const order = ['realm', 'mine', 'liege', 'duchy', 'kingdom', 'war'];
    let next = order[(order.indexOf(mapMode) + 1) % order.length];
    if (next === 'liege' && !s.player.liege) {
      UI.toast(FB.T('🗺 You answer to no one — no liege to show.'));
      next = order[(order.indexOf(next) + 1) % order.length];
    }
    if (next === 'war' && !(s.player && s.player.war && s.player.war.enemy)) {
      UI.toast(FB.T('🗺 At peace — no active war to show.'));
      next = order[(order.indexOf(next) + 1) % order.length];
    }
    mapMode = next;
    marketLensControls(mapMode === 'market');
    const btn = $('btn-mapmode');
    if (btn) {
      btn.classList.toggle('on', mapMode !== 'realm');
      btn.title = FB.T('Map filter: {mode} (R)', { mode: FB.T(MAPMODES[mapMode]) });
      btn.setAttribute('aria-label', btn.title);
    }
    let toastText = '🗺 Map filter: {mode}';
    let toastParams = { mode: FB.T(MAPMODES[mapMode]) };
    let selectProvId = FB.map.selected || s.player.provinceId;

    if (mapMode === 'war') {
      const w = s.player && s.player.war;
      const en = w && s.realms && s.realms[w.enemy];
      const enemyName = en ? en.name : (w ? w.enemy : '?');
      toastText = '🗺 {mode} — at war with {enemy}';
      toastParams = { mode: toastParams.mode, enemy: enemyName };

      let enemyProv = en && en.capital;
      if (!enemyProv || !FB.world || !FB.world.byId || !FB.world.byId[enemyProv] || (s.owner && s.owner[enemyProv] !== w.enemy)) {
        if (FB.world && FB.world.provs) {
          for (let i = 0; i < FB.world.provs.length; i++) {
            const pid = FB.world.provs[i].id;
            if ((s.owner && s.owner[pid] === w.enemy) || (s.holder && s.holder[pid] === w.enemy)) {
              enemyProv = pid;
              break;
            }
          }
        }
      }
      if (!enemyProv && en && en.capital) enemyProv = en.capital;
      if (enemyProv) {
        selectProvId = enemyProv;
        if (FB.map && FB.map.centerOn) FB.map.centerOn(enemyProv, 2.0);
      }
    } else if ((mapMode === 'duchy' || mapMode === 'kingdom') && s.player.provs && s.player.provs.length) {
      const claim = bestDejureClaim(s, mapMode);
      if (claim) {
        toastText = '🗺 {mode} — your best claim: {name}, {held} (need {need})';
        toastParams = { mode: toastParams.mode, name: claim.name,
          held: ofCountiesText(s, claim.pr.have, claim.pr.total), need: claim.pr.need };
      }
    }
    UI.toast(toastText, toastParams);
    FB.map.select(selectProvId, mapGroupOf, mapHighlightColorOf(selectProvId));
    if (FB.map && FB.map.request) FB.map.request();
  };

  let selectedProv = null;
  UI.selectProvince = function (pid) {
    selectedProv = pid;
    FB.map.select(pid, mapGroupOf);
    setTab('prov');
  };

  UI.highlightEnemyRealm = function (rid) {
    const s = FB.state;
    if (!s) return;
    if (!rid && s.player && s.player.war) rid = s.player.war.enemy;
    if (!rid) return;
    const en = s.realms && s.realms[rid];
    let provId = en && en.capital;
    if (!provId || !FB.world || !FB.world.byId || !FB.world.byId[provId] || (s.owner && s.owner[provId] !== rid)) {
      if (FB.world && FB.world.provs) {
        for (let i = 0; i < FB.world.provs.length; i++) {
          const pid = FB.world.provs[i].id;
          if ((s.owner && s.owner[pid] === rid) || (s.holder && s.holder[pid] === rid)) {
            provId = pid;
            break;
          }
        }
      }
    }
    if (!provId && en && en.capital) provId = en.capital;
    if (provId && FB.world && FB.world.byId && FB.world.byId[provId]) {
      if (FB.map) {
        if (FB.map.centerOn) FB.map.centerOn(provId, 2.0);
        if (FB.map.select) {
          FB.map.select(provId, function (pid) {
            return (s.owner && s.owner[pid] === rid) ? rid : ((s.holder && s.holder[pid] === rid) ? rid : null);
          }, '#c8352b');
        }
        if (FB.map.request) FB.map.request();
      }
    }
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
     players with an active stake in that title (have > 0); a landless dreamer or
     uninvolved foreigner has no claim to weigh */
  function dejureNotes(s, dj) {
    const indep = FB.isPlayerSovereign(s);
    let out = '';
    function note(text) { return '<div class="progressnote">' + esc(text) + '</div>'; }
    const dp = FB.duchyProgress(s, dj.duchy), dname = FBDATA.duchies[dj.duchy].name;
    if (dp.have > 0) {
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
    }
    if (dj.kingdom) {
      const kp = FB.kingdomProgress(s, dj.kingdom), kname = FBDATA.kingdoms[dj.kingdom].name;
      if (kp.have > 0) {
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
    }
    if (dj.empire) {
      const ep = FB.empireProgress(s, dj.empire), ename = FBDATA.empires[dj.empire].name;
      if (ep.have > 0) {
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
    const c = FB.realmRulerCharacterSnapshot &&
      FB.realmRulerCharacterSnapshot(s, rid);
    return !!(r && r.alive && c);
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
      art = FB.faceTag(me, 44, 50);
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
      const ruler = FB.realmRulerCharacterSnapshot(s, rid);
      const value = FB.standingOf(s, { kind:'realm', id:rid });
      art = FB.faceTag(ruler, 44, 50);
      heading = FB.T('{title} {name}', {
        title:FB.realmRankTitle(s, r), name:ruler.name
      });
      age = FB.ageOf(ruler, s.date.year);
      martial = FB.skillSnapshot
        ? FB.skillSnapshot(s, ruler, 'mar') : FB.skillOf(ruler, 'mar');
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

  function landKv(label, value, detail) {
    return '<div class="kv land-kv' + (detail ? ' land-kv-detail' : '') +
      '"><span>' + esc(FB.T(label)) + '</span><b>' + value + '</b></div>';
  }

  function landMarketCard(s, pid) {
    let goodId = FB.map.marketGood || 'provisions';
    if (!FBDATA.marketGoods || !FBDATA.marketGoods[goodId]) goodId = 'provisions';
    const good = FBDATA.marketGoods && FBDATA.marketGoods[goodId];
    const market = good && FB.marketCounty ? FB.marketCounty(s, pid) : null;
    const row = market && market.goods && market.goods[goodId];
    if (!good || !row) return '';
    const price = Math.round((Number(row.price) || 1) * 100) / 100;
    const band = price >= 1.08 ? 'dear' : price <= 0.95 ? 'cheap' : 'steady';
    const symbol = band === 'dear' ? '▲' : band === 'cheap' ? '▼' : '●';
    const bandLabel = band === 'dear' ? FB.T('dear') :
      band === 'cheap' ? FB.T('cheap') : FB.T('steady');
    return '<button type="button" class="land-market-card" id="county-market">' +
      '<span class="land-market-card-icon" aria-hidden="true">⚖</span>' +
      '<span class="land-market-card-copy"><b>' + esc(FB.T('County market')) +
      '</b><small>' + esc((good.icon || '') + ' ' +
        dt(s, 'marketGood', goodId, good, 'name')) + ' · ' +
      '<span class="market-price-' + band + '">' + symbol + ' ' +
        esc(bandLabel) + '</span> · ' + esc(String(price)) + '×</small></span>' +
      '<span class="land-market-card-open" aria-hidden="true">›</span></button>';
  }

  function renderWarCard(s, selA, pr) {
    if (!selA) return '';
    const isPlayerHost = selA.realm === 'player';
    const playerControlsHost = isPlayerHost ||
      !!(FB.playerControlsHost && FB.playerControlsHost(s, selA));
    const hostRealm = (s.realms && s.realms[selA.realm]) ? s.realms[selA.realm].name : selA.realm;
    const cardTitle = isPlayerHost
      ? FB.T('War & Host — {men}', { men: menText(s, selA.men) })
      : FB.T('{realm} Host — {men}', { realm: hostRealm, men: menText(s, selA.men) });

    const selPr = FB.world.byId[selA.at];
    const nextPid = selA.path && selA.path.length ? selA.path[0] : null;
    const nextPr = nextPid && FB.world.byId[nextPid];
    let hostStatusText;
    if (nextPr && selA.moveLeft > 0) {
      hostStatusText = FB.waterCrossing && FB.waterCrossing(selA.at, nextPid)
        ? FB.T('⚓ Preparing the crossing to {next} — {days} days remaining', {
          next:nextPr.name, days:selA.moveLeft
        })
        : FB.T('🚩 Marching to {next} — {days}d remaining', { next: nextPr.name, days: selA.moveLeft });
    } else if (selA.holdManual) {
      hostStatusText = FB.T('🚩 Holding at {place}', { place: selPr ? selPr.name : '?' });
    } else {
      hostStatusText = playerControlsHost
        ? FB.T('🚩 Ready at {place}', { place: selPr ? selPr.name : '?' })
        : FB.T('🚩 Stationed at {place}', { place: selPr ? selPr.name : '?' });
    }

    const parts = (selA.units && FB.unitClassParts) ? FB.unitClassParts(s, selA.units) : [];
    let troopSummary = parts.length ? parts.join(' · ') : menText(s, selA.men);
    if (selA.allied && selA.allied.men) {
      const ar = s.realms[selA.allied.ally];
      troopSummary += ' · ' + FB.T('+{men} allied', { men: menText(s, selA.allied.men) });
    }

    const selectedHostUpkeep = (isPlayerHost && FB.playerHostUpkeepParts)
      ? FB.playerHostUpkeepParts(s) : null;
    const supplyInfo = FB.hostSupplyStatus ? FB.hostSupplyStatus(s, selA) : null;
    const supplyStatus = supplyInfo
      ? (supplyInfo.status === 'starving' ? FB.T('Starving') : (supplyInfo.status === 'low' ? FB.T('Low') : FB.T('Good')))
      : FB.T('Good');
    const supplyPct = supplyInfo ? Math.round(supplyInfo.supply) : 100;
    let supplyUpkeepLine = FB.T('🥖 {status} ({pct}%)', { status: supplyStatus, pct: supplyPct });
    if (selectedHostUpkeep) {
      supplyUpkeepLine += ' · ' + FB.T('💰 {money:amount}/season', { amount: SH.financeAmount(selectedHostUpkeep.total) });
    }

    const isPlayerWar = isPlayerHost && s.player.war && FB.warFeedback;
    const fieldFeedback = isPlayerWar ? FB.warFeedback(s) : null;
    let warLossSummary = '';
    if (fieldFeedback) {
      const won = fieldFeedback.battlesWon || 0;
      const lost = fieldFeedback.battlesLost || 0;
      const menLost = fieldFeedback.totalLosses || 0;
      warLossSummary = FB.T('🏆 {won}W · {lost}L · 💀 {losses} lost', {
        won: won, lost: lost, losses: menText(s, menLost)
      });
    }

    // Build the detailed breakdown for tooltips (Desktop hover & Mobile disclosure)
    let detailsHtml = '';

    // 1. Detailed Unit Class breakdown
    if (selA.units && FB.unitClassBattleStats && FB.unitClassIds) {
      detailsHtml += '<div class="land-section-title">' + esc(FB.T('Troop Composition & Battle Quality')) + '</div>';
      for (const classId of FB.unitClassIds()) {
        const classCount = Math.max(0, Math.round(Number(selA.units[classId]) || 0));
        if (!classCount) continue;
        const classDef = (FBDATA.unitClasses || {})[classId];
        if (!classDef) continue;
        const className = FB.dataText(s, null, 'unitClass', classId, classDef, 'name', {});
        const classStats = FB.unitClassBattleStats(classId);
        let classLine = FB.T(
          '{icon} {unit} ×{count} — attack {attack}, defense {defense}', {
            icon: classDef.icon || '', unit: className, count: classCount,
            attack: classStats.attack, defense: classStats.defense
          });
        if (classStats.upkeepPer100) {
          classLine += FB.T(', upkeep {upkeep} per 100', { upkeep: classStats.upkeepPer100 });
        }
        if (classStats.counters.length) {
          const counterNames = [];
          for (const counter of classStats.counters) {
            const counterDef = (FBDATA.unitClasses || {})[counter.id];
            counterNames.push(counterDef
              ? FB.dataText(s, null, 'unitClass', counter.id, counterDef, 'name', {})
              : counter.id);
          }
          classLine += FB.T('; strong against {counters}', { counters: counterNames.join(', ') });
        }
        detailsHtml += '<div>' + esc(classLine) + '</div>';
      }
    }

    // 2. Replacements & Cohort Reserves (player host only)
    if (isPlayerHost && FB.cohortStatus) {
      const cohort = FB.cohortStatus(s, 'player');
      for (const classId of FB.unitClassIds ? FB.unitClassIds() : []) {
        const cohortClass = cohort.classes[classId];
        if (!cohortClass) continue;
        const classDef = (FBDATA.unitClasses || {})[classId];
        const className = classDef
          ? FB.dataText(s, null, 'unitClass', classId, classDef, 'name', {})
          : classId;
        if (cohortClass.pending) {
          const premium = selectedHostUpkeep &&
            selectedHostUpkeep.reinforceByClass &&
            selectedHostUpkeep.reinforceByClass[classId];
          detailsHtml += '<div style="margin-top:4px">🛠 ' + esc(FB.T(
            'Replacing {count} {unit} — ready in {days} days, costing {money:amount} a season.', {
              count: cohortClass.pending, unit: className,
              days: cohortClass.daysLeft,
              amount: SH.financeAmount(premium || 0)
            })) + '</div>';
        }
        if (cohortClass.ready) {
          detailsHtml += '<div style="margin-top:4px">🛡 ' + esc(FB.T(
            '{count} drilled {unit} stand ready — they join a resting host or the next muster.', {
              count: cohortClass.ready, unit: className
            })) + '</div>';
        }
      }
    }

    // 3. Logistics & Supply details
    if (selectedHostUpkeep || supplyInfo) {
      detailsHtml += '<div class="land-section-title" style="margin-top:8px">' + esc(FB.T('Logistics & Supply')) + '</div>';
      if (supplyInfo) {
        if (supplyInfo.status === 'starving') {
          detailsHtml += '<div>🥀 ' + esc(FB.T('Starving — hunger thins the host daily.')) + '</div>';
        } else if (supplyInfo.daysToAttrition !== null) {
          detailsHtml += '<div>🥖 ' + esc(FB.T('Supply at {pct}% — about {days} days before hunger bites.', {
            pct: Math.round(supplyInfo.supply), days: supplyInfo.daysToAttrition
          })) + '</div>';
        } else {
          detailsHtml += '<div>🥖 ' + esc(FB.T('Supply at {pct}% — refilling on friendly land.', {
            pct: Math.round(supplyInfo.supply)
          })) + '</div>';
        }
      }
      if (selectedHostUpkeep) {
        detailsHtml += '<div>💰 ' + esc(FB.T('Total seasonal logistics: {money:amount}', {
          amount: SH.financeAmount(selectedHostUpkeep.total)
        })) + '</div>';
        if (selectedHostUpkeep.reinforcement) {
          detailsHtml += '<div>' + esc(FB.T('…of which replacement drilling: {money:amount}', {
            amount: SH.financeAmount(selectedHostUpkeep.reinforcement)
          })) + '</div>';
        }
        if (selectedHostUpkeep.campaignModifier) {
          detailsHtml += '<div>' + esc(FB.T('Campaign supply adjustment: {money:amount}', {
            amount: SH.financeAmount(selectedHostUpkeep.campaignModifier)
          })) + '</div>';
        }
      }
    }

    // 4. Battle & Campaign Losses details
    if (fieldFeedback) {
      detailsHtml += '<div class="land-section-title" style="margin-top:8px">' + esc(FB.T('Battle & Campaign Record')) + '</div>';
      detailsHtml += '<div>' + esc(FB.warBattleRecordText(s, fieldFeedback)) + '</div>';
      detailsHtml += '<div>' + esc(FB.warLossesText(s, fieldFeedback)) + '</div>';
      const fieldEffects = FB.warEffectsText(s, fieldFeedback);
      if (fieldEffects) {
        detailsHtml += '<div>' + esc(fieldEffects) + '</div>';
      }
    }

    // Assemble the card
    let cardHtml = '<section class="land-section war-card settcard" id="land-war-card">' +
      '<div class="settcard-head"><b>⚔ ' + esc(cardTitle) + '</b>' +
      '<span class="settcard-actions">' +
      '<button type="button" class="btn small settcard-info" aria-expanded="false" aria-controls="war-card-details" title="' +
      esc(FB.T('Details')) + '" aria-label="' + esc(FB.T('Details')) + '">?</button>' +
      '</span></div>' +
      landKv('Status', esc(hostStatusText)) +
      landKv('Troops', esc(troopSummary), true) +
      landKv('Supply & Upkeep', esc(supplyUpkeepLine));

    if (warLossSummary) {
      cardHtml += landKv('Battle & Losses', esc(warLossSummary));
    }

    if (playerControlsHost && FB.hostCutOff && FB.hostCutOff(s, selA)) {
      cardHtml += '<div class="progressnote warnote">✂ ' + esc(FB.T(
        'Cut off — no road home. If this host shatters here it is destroyed outright.')) + '</div>';
    }

    cardHtml += '<div class="settcard-details hidden" id="war-card-details">' + detailsHtml + '</div>';

    // Realm-owned host decisions remain player-host only. A patron's host
    // under personal field command exposes only the shared manual halt.
    if (isPlayerHost) {
      const splitStatus = FB.splitHostStatus ? FB.splitHostStatus(s, selA) : null;
      if (splitStatus) {
        cardHtml += '<button type="button" class="actionbtn" id="btn-host-split"' +
          (splitStatus.ok ? '' : ' disabled') + '>' +
          esc(FB.T('➗ Split the host')) +
          '<span class="adesc">' + esc(splitStatus.ok
            ? FB.T('{men} men march under a second banner; supplies divide with them.', {
              men: menText(s, splitStatus.targetMen) })
            : splitStatus.reason) + '</span></button>';
      }
      const mergePartner = FB.mergeableHost ? FB.mergeableHost(s, selA) : null;
      if (mergePartner) {
        cardHtml += '<button type="button" class="actionbtn" id="btn-host-merge">' +
          esc(FB.T('⚔ Merge with the other host here')) +
          '<span class="adesc">' + esc(FB.T(
            'Join the {men} men of the second banner into this one.', {
              men: menText(s, mergePartner.men) })) + '</span></button>';
      }
    }
    if (playerControlsHost) {
      cardHtml += '<button type="button" class="actionbtn" id="btn-host-halt">' +
        esc(FB.T('🚩 Hold here')) +
        '<span class="adesc">' + esc(FB.T(
          'Cancel the march and stand fast; the automated stances leave a held host alone.')) +
        '</span></button>';
    }

    cardHtml += '</section>';
    return cardHtml;
  }

  function renderProv() {
    const s = FB.state;
    /* Map selection is the authoritative current county. `selectedProv` is
       retained for callers that select through this UI, but map controls and
       integrations may select directly through FB.map.select(). */
    const pid = (FB.map && FB.map.selected) || selectedProv || s.player.provinceId;
    const pr = FB.world.byId[pid];
    const box = $('tab-prov');
    if (!pr) { replacePanelMarkup('land', box, ''); return; }
    const playerRealm = s.realms && s.realms.player;
    const homeLabel = pid === s.player.provinceId
      ? (playerRealm && playerRealm.alive && playerRealm.capital === pid
        ? FB.T('⚑ (capital and home)') : FB.T('⚑ (home)'))
      : '';
    let h = '<div class="panelh">' + esc(pr.name) +
      (homeLabel ? ' ' + esc(homeLabel) : '') + '</div>';
    const selectedRealmId = !pr.wasteland && s.owner[pid];
    const selectedRealm = selectedRealmId && s.realms[selectedRealmId];
    if (selectedRealm && FB.isRealmAtWar(s, selectedRealmId)) {
      h += '<div class="progressnote warnote land-current-war">' +
        '⚔ ' + FB.warStatusLinkHtml(s, selectedRealmId) + '</div>';
    }
    const selA = FB.selectedArmy ? FB.selectedArmy(s) : null;
    const hostsHere = FB.armiesAt ? FB.armiesAt(s, pid) : [];
    const playerHostHere = hostsHere.find(function (a) {
      return a.realm === 'player' ||
        (FB.playerControlsHost && FB.playerControlsHost(s, a));
    });
    const hostToShow = (selA && (selA.at === pid || !hostsHere.length)) ?
      selA : (playerHostHere || hostsHere[0] || selA);
    if (hostToShow) {
      h += renderWarCard(s, hostToShow, pr);
    }
    if (pr.wasteland) {
      h += '<div class="cmeta">' + esc(FB.T('Trackless {terrain}. No lord rules here — it feeds no duchy or crown.',
        { terrain: terrainName(pr.terrain) })) + '</div>';
    } else {
      const rid = s.owner[pid];
      const realm = s.realms[rid];
      const communities = FB.provinceCommunities(pr);
      const B = FBDATA.balance || {};
      const myRealm = rid === 'player';
      let curRealmMen;
      let maxRealmMen;
      if (myRealm && FB.playerLevy) {
        /* the player's own card shows the real host — the full composition
           (levy, archers, cavalry, retinue) that musters for wars and raids —
           so the number matches the muster preview and expedition reports.
           Maximum is the full-population baseline composition, floored at the
           current host so the overpopulation bonus never reads as a deficit */
        const rearmScale = FB.rearmScale ? FB.rearmScale(s, 'player') : 1;
        const currentHost = FB.playerLevy(s);
        curRealmMen = Math.round(currentHost * rearmScale);
        maxRealmMen = Math.max(FB.playerMaxLevy ? FB.playerMaxLevy(s) : 0, currentHost);
      } else {
        const realmProvs = (FB.realmProvinces ? FB.realmProvinces(s, rid) : []).slice();
        const provsToSum = realmProvs.length ? realmProvs : [pid];

        let curProvTotal = 0;
        let maxProvTotal = 0;
        for (let i = 0; i < provsToSum.length; i++) {
          const pId = provsToSum[i];
          const pDev = (s.dev && s.dev[pId]) || 1;
          const pPop = (FB.countyPopulationFactor ? FB.countyPopulationFactor(s, pId) : 1);
          const pMod = (FB.modBonus ? Math.max(0, 1 + FB.modBonus(s, 'levy', pId)) : 1);
          curProvTotal += pDev * pPop * (B.levyPerDev || 80) * pMod;
          /* maximum counts the overpopulation bonus (population factor above
             its baseline) so a thriving county's realm host never reads below
             its province levy; the current/max fraction appears only for
             genuine deficits — the rearm window or a fallen population */
          maxProvTotal += pDev * Math.max(pPop, 1) * (B.levyPerDev || 80) * pMod;
        }

        const rearmScale = (realm && FB.rearmScale) ? FB.rearmScale(s, rid) : 1;
        curRealmMen = Math.round(curProvTotal * rearmScale);
        maxRealmMen = Math.round(maxProvTotal);
      }

      const realmHostDisplay = (curRealmMen < maxRealmMen)
        ? ('~' + curRealmMen + '/' + maxRealmMen + ' ' + FB.T('men'))
        : ('~' + maxRealmMen + ' ' + FB.T('men'));
      // the feudal ladder: who holds this county directly, and above them whom
      const holdId = (s.holder && s.holder[pid]) || rid;
      let chain;
      if (holdId === 'player') chain = ['player'].concat(s.player.liege ? FB.liegeChain(s, s.player.liege) : []);
      else chain = FB.liegeChain(s, holdId);
      h += '<section class="land-section"><h3 class="land-section-title">' +
        esc(FB.T('Realm')) + '</h3>';
      h += landKv('County', esc(pr.name));
      for (const cid of chain) {
        if (cid === 'player') {
          h += '<div class="kv land-kv"><span>' + esc(FB.styledTitle(s)) + '</span><b>' +
            esc(FB.T('You — held in your own hand')) + '</b></div>';
          continue;
        }
        const cr = s.realms[cid];
        if (!cr) continue;
        let mark = '';
        if (cid === s.player.liege) mark = FB.T(' — your liege');
        else if (cr.liege === 'player') mark = FB.T(' — your vassal');
        h += '<div class="kv land-kv"><span>' + esc(FB.T('{title} {name}', {
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
        h += landKv('De jure (rightful liege)', esc(parts.join(' › ')), true);
        if (s.player.provs && s.player.provs.length) h += dejureNotes(s, dj);
      } else {
        // a colony settled on empty land: owned, but tied to no title
        h += landKv('De jure (rightful liege)',
          esc(FB.T('None — this land feeds no duchy or crown.')), true);
      }
      const sovereignHtml = realm
        ? '<button class="linklike" data-liege="' + esc(rid) + '" title="' +
          esc(FB.T('See this realm’s ruler')) + '">' + esc(realm.name) + '</button>'
        : '';
      h +=
        (realm ? landKv('Sovereign', sovereignHtml) : '') +
        (realm ? landKv('Realm size',
          esc(countyCountText(s, FB.realmProvinces(s, rid).length))) : '') +
        (realm ? landKv('Realm host', realmHostDisplay) : '') +
        (realm ? landKv('Defensive alliance', esc(allianceText(s, rid)), true) : '');
      if (realm && !myRealm && FB.isPlayerSovereign(s)) {
        const realmStanding = FB.standingOf(s, { kind:'realm', id:rid });
        h += landKv('Standing with this ruler', standingSpan(realmStanding));
        h += landKv('Foreign policy', esc(FB.isForeignPolicyTarget(s, rid)
          ? foreignPolicyStanceText(s, rid) : FB.T('Out of reach')), true);
      }
      let capitalOfRealm = null;
      for (const capRid in s.realms) {
        const capRealm = s.realms[capRid];
        // sovereign capitals only — matches the map's ★ marker; a vassal
        // single-county realm's capital is trivially itself
        if (capRealm.alive && !capRealm.liege && capRealm.capital === pid) {
          capitalOfRealm = capRealm;
          break;
        }
      }
      h += '</section><section class="land-section"><h3 class="land-section-title">' +
        esc(FB.T('County')) + '</h3>' +
        (capitalOfRealm ? landKv('Realm capital', esc(FB.T('★ {realm}', {
          realm: capitalOfRealm.name
        })), true) : '') +
        landKv('Culture', esc(cultureName(s, pr.culture))) +
        landKv('Faith', faithDetailsLink(s, pr.religion)) +
        (communities.length > 1 ? landKv('Communities',
          communities.map(function (community) {
            const faith = FB.religionOf(community.religion, s);
            return esc(cultureName(s, community.culture)) + ' · ' +
              esc((faith ? faith.icon + ' ' : '') +
                religionName(s, community.religion));
          }).join('<br>'), true) : '') +
        landKv('Terrain', esc(terrainName(pr.terrain)) +
          (pr.coastal ? ', ' + esc(FB.T('coastal')) : '')) +
        landKv('Province levy', '~' + esc(menText(s, Math.round(
          (s.dev[pid] || 1) * (FB.countyPopulationFactor ? FB.countyPopulationFactor(s, pid) : 1) * B.levyPerDev *
          (FB.modBonus ? Math.max(0, 1 + FB.modBonus(s, 'levy', pid)) : 1)))));
      const setts = FB.settlementsOf(s, pid);
      if (setts.length) {
        // every settlement is a button: it opens that settlement's sheet
        // (UI.showSettlement) and centers the map on its parent county
        const own = FB.demesne(s).indexOf(pid) >= 0;
        h += '<div class="settblock land-settlements"><span>' +
          esc(FB.T('Settlements')) + '</span>' +
          '<div class="settlist">' + setts.map(function (st, si) {
            const fort = FB.fortAtSettlement
              ? FB.fortAtSettlement(s, pid, si, false) : null;
            const fortLabel = fort
              ? ' ◆' + (fort.level || fort.targetLevel || 1) +
                (fort.targetLevel ? '⚒' : '') : '';
            const label = (st.kind === 'city' ? '🏙' : st.kind === 'town' ? '🏘' : '🏡') +
              ' ' + esc(st.name) + fortLabel;
            return '<button class="linklike settlink" data-sett="' + si + '" title="' +
              esc(FB.T('See the buildings of {settlement}', { settlement: st.name })) + '">' + label + '</button>';
          }).join('') + '</div></div>';
        if (own) {
          h += '<div class="hint">' + esc(FB.T('Each settlement keeps its own buildings — tap one to see them and raise more.')) + '</div>';
        }
      }
      h += '</section><section class="land-section"><h3 class="land-section-title">' +
        esc(FB.T('Development')) + '</h3>' +
        landKv('Economic development',
          (s.dev[pid] || 1) + ' / ' + FB.devCap(s, pid)) +
        landKv('Settlement growth', esc(settlementDevelopmentText(s, pid)), true) +
        (realm && FB.techUiRelevant(s) ? landKv('Technological development',
          techDevelopmentScore(s, rid) + ' / 10') : '') +
        landMarketCard(s, pid) +
        '</section>';
      const pop = FB.countyPopulation ? FB.countyPopulation(s, pid) : 0;
      const popCap = FB.countyPopulationCapacity ? FB.countyPopulationCapacity(s, pid) : 0;
      const popRec = s.population && s.population.counties && s.population.counties[pid];
      const natDelta = popRec ? (popRec.natural || 0) : 0;
      const migDelta = popRec ? (popRec.migration || 0) : 0;
      const lossDelta = popRec ? (popRec.losses || 0) : 0;
      const netDelta = natDelta + migDelta + lossDelta;
      const netText = (netDelta > 0 ? '+' : '') + netDelta.toLocaleString();
      const breakdownText = FB.T('{natural} natural, {migration} migration, {losses} losses', {
        natural: (natDelta >= 0 ? '+' : '') + natDelta.toLocaleString(),
        migration: (migDelta >= 0 ? '+' : '') + migDelta.toLocaleString(),
        losses: (lossDelta >= 0 ? '+' : '') + lossDelta.toLocaleString()
      });

      h += '<section class="land-section"><h3 class="land-section-title">' +
        esc(FB.T('Population')) + '</h3>' +
        landKv('County population', esc(pop.toLocaleString())) +
        landKv('Carrying capacity', esc(popCap.toLocaleString())) +
        landKv('Annual change', esc(netText + ' (' + breakdownText + ')'), true) +
        '</section>';
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
        const strongpoint = FB.fortSiegeStatus
          ? FB.fortSiegeStatus(s, pid, occupation, 0) : null;
        h += '<div class="progressnote warnote">' + esc(FB.T(
          '📯 Great holy-war objective · {status}', {
            status:objectiveStatus
          })) + (strongpoint && strongpoint.level
          ? '<br>' + esc(FB.T(
            '{fort} · {requirement} occupation days · {minimum} besiegers minimum · {attrition} seasonal casualties', {
              fort:strongpoint.name, requirement:requirement,
              minimum:strongpoint.minimum, attrition:strongpoint.attrition
            })) : '') + '</div>';
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
          '🛡 They can field {theirs} — you can field ~{yours}.',
          { theirs: realmHostDisplay, yours: menText(s, FB.playerLevy(s)) })) + '</div>';
      }
      const hostsHere = FB.armiesAt ? FB.armiesAt(s, pid) : [];
      if (hostsHere.length) {
        h += '<div class="progressnote warnote">' + esc(FB.T('⚔ Hosts in the field here:')) +
          ' ' + hostsHere.map(function (a) {
            const owner = a.realm === 'player' ? FB.T('Your host') :
              (FB.playerControlsHost && FB.playerControlsHost(s, a)
                ? FB.T('Host under your command')
                : (s.realms[a.realm] ? s.realms[a.realm].name : '?'));
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
          esc(FB.T('Select a ruler for their character sheet and dealings.')) +
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
    if (!replacePanelMarkup('land', box, h)) {
      FB.paintFaces(box, s);
      return;
    }
    FB.localizeTree(box);
    FB.paintFaces(box, s);
    bindFaithDetails(box);
    if (SH.bindCardInfoToggles) SH.bindCardInfoToggles(box);
    const b = $('btn-center-home');
    if (b) b.addEventListener('click', function () { FB.map.centerOn(FB.state.player.provinceId, 2.2); });
    const countyMarket = $('county-market');
    if (countyMarket) countyMarket.addEventListener('click', function () {
      UI.showMarket(pid, FB.map.marketGood || 'provisions');
    });
    const relocate = $('btn-relocate-capital');
    if (relocate) relocate.addEventListener('click', function () {
      UI.showCapitalRelocation(pid);
    });
    const hostSplit = $('btn-host-split');
    if (hostSplit && hostToShow) hostSplit.addEventListener('click', function () {
      if (FB.splitHost) FB.splitHost(s, hostToShow);
      if (FB.map) FB.map.request();
      renderProv();
    });
    const hostMerge = $('btn-host-merge');
    if (hostMerge && hostToShow) hostMerge.addEventListener('click', function () {
      const partner = FB.mergeableHost ? FB.mergeableHost(s, hostToShow) : null;
      if (partner && FB.mergeHosts) FB.mergeHosts(s, hostToShow, partner);
      if (FB.map) FB.map.request();
      renderProv();
    });
    const hostHalt = $('btn-host-halt');
    if (hostHalt && hostToShow) hostHalt.addEventListener('click', function () {
      /* the keyboard twin of tapping the selected host: halt and hold */
      hostToShow.path = []; hostToShow.goal = null; hostToShow.moveLeft = 0; hostToShow.huntPrey = null;
      hostToShow.manual = 0; hostToShow.holdManual = 1;
      FB.selectArmy(null);
      if (FB.map) FB.map.request();
      renderProv();
    });
    document.querySelectorAll('#tab-prov .settlink').forEach(function (btn) {
      btn.addEventListener('click', function () { FB.map.centerOn(pid); UI.showSettlement(pid, +btn.dataset.sett); });
    });
    document.querySelectorAll('#tab-prov [data-war-realm]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        UI.showLiegeModal(btn.dataset.warRealm);
      });
    });
  }

  SH.logRenderedTail = null; SH.logRenderedLen = -1; // skip identical rebuilds on quiet ticks
  SH.logRenderedHeader = ''; SH.logRenderedLocale = ''; // append-path validity keys
  SH.logFilter = SH.logFilter || 'all';
  SH.logRenderedFilter = '';
  let chronicleEnglishPending = false;
  let chronicleEnglishFailed = false;
  function receiptImpactClass(record) {
    if (record.lethal) return 'danger';
    if (record.amount < 0 || record.action === 'remove' || record.action === 'lose') {
      return 'cost';
    }
    if (record.amount > 0 || record.action === 'add') return 'gain';
    return 'neutral';
  }
  function choiceReceiptHtml(s, receipt) {
    if (!receipt || !receipt.title || !receipt.option) return '';
    const context = { state:s, viewer:s.player.charId };
    const title = FB.renderMessage(receipt.title, context);
    const option = FB.renderMessage(receipt.option, context);
    const outcome = receipt.outcome ? FB.renderMessage(receipt.outcome, context) : '';
    let h = '<div class="choice-receipt-title">' + esc(title) + '</div>' +
      '<div class="choice-receipt-option"><span>' + esc(FB.T('Choice')) +
      '</span> ' + esc(option) + '</div>';
    if (outcome) h += '<div class="choice-receipt-outcome">' + esc(outcome) + '</div>';
    const impacts = (receipt.impacts || []).filter(function (record) {
      return !FB.eventImpactVisible || FB.eventImpactVisible(record);
    });
    if (impacts.length) {
      h += '<div class="event-impact-chips chronicle">';
      for (let i = 0; i < impacts.length; i++) {
        h += '<span class="event-impact-chip ' + receiptImpactClass(impacts[i]) + '">' +
          esc(FB.eventImpactText(s, impacts[i], 'resolved')) + '</span>';
      }
      h += '</div>';
    }
    return h;
  }
  function logEntryHtml(s, e) {
    const logDate = e.d
      ? FB.T('{season} {day}, {year}', {
        season: FB.seasonName(e.s), day: e.d, year: e.y
      })
      : FB.T('{season}, {year}', { season: FB.seasonName(e.s), year: e.y });
    const receipt = e.kind === 'choice' && e.receipt
      ? choiceReceiptHtml(s, e.receipt) : '';
    const reportId = e.hostileReportId;
    const reportKind = e.hostileReportKind;
    const content = receipt || esc(FB.newsText(e, s, s.player.charId));
    let body = content;
    if (reportId && reportKind) {
      const label = reportKind === 'raid' ? FB.T('View raid report')
        : (reportKind === 'battle' ? FB.T('View battle report')
          : FB.T('View war report'));
      body = '<button type="button" class="chronicle-hostile-link" data-hostile-report="' +
        esc(reportId) + '">' + content +
        '<span class="chronicle-hostile-link-label">' + esc(label) + ' →</span></button>';
    }
    return '<div class="logentry' + (receipt ? ' choice-entry' : '') +
      (reportId && reportKind ? ' hostile-entry' : '') + '">' +
      '<span class="ldate">' + esc(logDate) + '</span><br>' +
      body + '</div>';
  }
  function logMatches(e, filter) {
    if (filter === 'choices') return !!(e && e.kind === 'choice');
    if (filter === 'news') return !(e && e.kind === 'choice');
    return true;
  }
  function logControlsHtml() {
    const filters = [
      { id:'all', label:FB.T('All') },
      { id:'choices', label:FB.T('Choices') },
      { id:'news', label:FB.T('News') }
    ];
    let h = '<div class="chronicle-filters" role="group" aria-label="' +
      esc(FB.T('Chronicle filter')) + '">';
    for (let i = 0; i < filters.length; i++) {
      const active = filters[i].id === SH.logFilter;
      h += '<button type="button" data-chronicle-filter="' + filters[i].id +
        '" aria-pressed="' + (active ? 'true' : 'false') + '"' +
        (active ? ' class="active"' : '') + '>' + esc(filters[i].label) + '</button>';
    }
    return h + '</div>';
  }
  function wireLogControls(box) {
    box.querySelectorAll('[data-chronicle-filter]').forEach(function (button) {
      if (button.getAttribute('data-chronicle-filter-wired')) return;
      button.setAttribute('data-chronicle-filter-wired', 'true');
      button.addEventListener('click', function () {
        UI.setChronicleFilter(button.getAttribute('data-chronicle-filter'));
      });
    });
    box.querySelectorAll('[data-hostile-report]').forEach(function (button) {
      if (button.getAttribute('data-hostile-report-wired')) return;
      button.setAttribute('data-hostile-report-wired', 'true');
      button.addEventListener('click', function () {
        if (UI.showHostileReport) {
          UI.showHostileReport(button.getAttribute('data-hostile-report'));
        }
      });
    });
  }
  function renderLog() {
    const s = FB.state;
    const tail = s.log.length ? s.log[s.log.length - 1] : null;
    const header = '<div class="panelh">' + esc(FB.game && FB.game.observe
      ? FB.T('Chronicle of the realms')
      : FB.T('Chronicle of {dynasty}', { dynasty: s.chars[s.player.charId].dyn || FB.T('your line') })) +
      '</div>';
    const box = $('tab-log');
    let missingEnglish = false;
    if (!FBDATA.lang.en && !chronicleEnglishFailed) {
      for (let i = s.log.length - 1, seen = 0; i >= 0 && seen < 80; i--) {
        if (!logMatches(s.log[i], SH.logFilter)) continue;
        seen++;
        const entry = s.log[i];
        const receipt = entry && entry.receipt;
        const messages = [entry && entry.msg, receipt && receipt.title,
          receipt && receipt.option, receipt && receipt.outcome];
        for (let j = 0; j < messages.length; j++) {
          if (messages[j] && typeof messages[j].key === 'string' &&
              !FB.englishMessage(messages[j].key)) {
            missingEnglish = true;
            break;
          }
        }
        if (missingEnglish) break;
      }
    }
    if (missingEnglish && FB.ensureEnglishCatalog) {
      if (!chronicleEnglishPending) {
        chronicleEnglishPending = true;
        FB.ensureEnglishCatalog(function (loaded) {
          chronicleEnglishPending = false;
          chronicleEnglishFailed = !loaded;
          SH.logRenderedTail = null;
          SH.logRenderedLen = -1;
          if (FB.state && SH.activeTab === 'log') renderLog();
        });
      }
      box.innerHTML = header + logControlsHtml() +
        '<div class="chronicle-entries"><div class="logentry">' +
        esc(FB.T('Loading Chronicle…')) + '</div></div>';
      wireLogControls(box);
      return;
    }
    if (tail === SH.logRenderedTail && s.log.length === SH.logRenderedLen &&
        SH.logFilter === SH.logRenderedFilter) return;
    /* The log grows by appends (truncation only bites far above the visible
       window), so fresh entries are prepended and the overflow trimmed — the
       DOM ends identical to a full rebuild without reparsing 80 nodes. Any
       other shape (a load, a dynasty rename, a locale switch, truncation
       reaching the window) falls back to the rebuild. */
    const canAppend = tail !== SH.logRenderedTail &&
      SH.logRenderedTail && s.log.length > SH.logRenderedLen &&
      header === SH.logRenderedHeader && FB.locale === SH.logRenderedLocale &&
      SH.logFilter === SH.logRenderedFilter &&
      s.log[SH.logRenderedLen - 1] === SH.logRenderedTail &&
      box.querySelector('.chronicle-entries');
    if (canAppend) {
      const from = SH.logRenderedLen, to = s.log.length;
      let add = '';
      for (let i = to - 1; i >= from; i--) {
        if (logMatches(s.log[i], SH.logFilter)) add += logEntryHtml(s, s.log[i]);
      }
      const entries = box.querySelector('.chronicle-entries');
      if (add) entries.insertAdjacentHTML('afterbegin', add);
      while (entries.querySelectorAll('.logentry').length > 80) {
        entries.removeChild(entries.lastElementChild);
      }
      SH.logRenderedTail = tail; SH.logRenderedLen = to;
      FB.localizeTree(box);
      wireLogControls(box);
      return;
    }
    SH.logRenderedTail = tail; SH.logRenderedLen = s.log.length;
    SH.logRenderedHeader = header; SH.logRenderedLocale = FB.locale;
    SH.logRenderedFilter = SH.logFilter;
    let h = header + logControlsHtml() + '<div class="chronicle-entries">';
    let rendered = 0;
    for (let i = s.log.length - 1; i >= 0 && rendered < 80; i--) {
      if (!logMatches(s.log[i], SH.logFilter)) continue;
      h += logEntryHtml(s, s.log[i]);
      rendered++;
    }
    h += '</div>';
    box.innerHTML = h;
    FB.localizeTree(box);
    wireLogControls(box);
  }

  UI.setChronicleFilter = function (filter) {
    if (filter !== 'choices' && filter !== 'news') filter = 'all';
    if (SH.logFilter === filter && SH.logRenderedFilter === filter) return;
    SH.logFilter = filter;
    SH.logRenderedTail = null;
    SH.logRenderedLen = -1;
    if (FB.state) renderLog();
  };

  function selfDrawerOpen() {
    return document.body.classList.contains('showself');
  }

  let selfDrawerResumePlay = false;
  function selfDrawerUsesOverlay() {
    return typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 820px), (max-height: 520px)').matches;
  }
  function pauseForSelfDrawer() {
    if (!selfDrawerUsesOverlay() || selfDrawerOpen() || !FB.game ||
        FB.game.observe) return;
    const wasRunning = !FB.game.paused;
    selfDrawerResumePlay = wasRunning && !FB.game.fastForwarding;
    if (wasRunning && FB.game.setPaused) FB.game.setPaused(true);
  }
  function restoreAfterSelfDrawer() {
    const resume = selfDrawerResumePlay;
    selfDrawerResumePlay = false;
    if (resume && FB.game && FB.game.setPaused) FB.game.setPaused(false);
  }

  function openSelfDrawerRaw() {
    pauseForSelfDrawer();
    document.body.classList.add('showself');
    if (FB.state && !(FB.game && FB.game.observe)) {
      renderTab(activeLeftTab);
      updateTabNudges(FB.state);
    }
  }

  function closeSelfDrawerRaw() {
    document.body.classList.remove('showself');
    restoreAfterSelfDrawer();
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
    const previousTab = SH.activeTab;
    const drawerWasOpen = selfDrawerOpen();
    if (isLeft) activeLeftTab = name; else SH.activeTab = name;
    const bar = isLeft ? '#lefttabs .tab' : '#sidetabs .tab';
    document.querySelectorAll(bar).forEach(function (t) { t.classList.toggle('active', t.dataset.tab === name); });
    const body = isLeft ? $('leftbody') : $('sidebody');
    body.querySelectorAll('.tabpane').forEach(function (p) { p.classList.remove('active'); });
    $('tab-' + name).classList.add('active');
    // on compact phone/tablet layouts Self/Kin is a drawer (body.showself);
    // the class is inert on desktop
    if (isLeft) {
      if (!drawerWasOpen) pauseForSelfDrawer();
      document.body.classList.add('showself');
    } else {
      document.body.classList.remove('showself');
      if (drawerWasOpen) restoreAfterSelfDrawer();
    }
    /* A tab switch changes only one retained panel column. Rendering the
       other column here used to make a Deeds/Land rebuild part of every
       Self/Kin switch, and repeated all Self/Kin calculations and portrait
       checks when moving among the right-hand tabs. Full UI.refresh calls
       still update both visible columns after actual game-state changes. */
    if (FB.state) {
      if (FB.game && FB.game.observe) {
        renderTab(name === 'prov' ? 'prov' : 'log');
      } else {
        renderTab(name, !!(opts && opts.reuse));
        updateTabNudges(FB.state);
      }
    }
    if (isLeft && !drawerWasOpen) {
      mobileNavPush('self-drawer', closeSelfDrawerRaw, openSelfDrawerRaw,
        selfDrawerOpen, function () { return true; });
    } else if (!isLeft && drawerWasOpen) {
      mobileNavClosed('self-drawer', false);
    }
    if (!isLeft && name !== previousTab && !(opts && opts.history === false)) {
      mobileNavPush('panel-tab',
        function () { setTab(previousTab, { history:false, reuse:true }); },
        function () { setTab(name, { history:false, reuse:true }); },
        function () { return SH.activeTab === name && !selfDrawerOpen(); },
        function () { return true; });
    }
    // Family track: the Kin tab teaches the family side — stamp its step once
    if (name === 'family' && FB.tutorialActive && FB.tutorialActive(FB.state)) {
      FB.state.player.flags.tut_kin_tab = 1;
    }
    if (UI.maybeTabTip) UI.maybeTabTip(name);
  }

  UI.cycleTab = function (dir) {
    const order = (FB.game && FB.game.observe)
      ? ['prov', 'log'] : ['actions', 'prov', 'network', 'log'];
    let i = order.indexOf(SH.activeTab) + dir;
    if (i < 0) i = order.length - 1;
    if (i >= order.length) i = 0;
    setTab(order[i], { reuse:true });
  };

  UI.showTab = function (name, opts) { setTab(name, opts); };


  /* ===== shared exports (bound by the later UI files) ===== */
  SH.ACTION_SHORTCUT_KEYS = ACTION_SHORTCUT_KEYS;
  SH.actionShortcutStatus = actionShortcutStatus;
  SH.closeSelfDrawer = closeSelfDrawer;
  SH.equipmentBlockedText = equipmentBlockedText;
  SH.equipmentSheetHtml = equipmentSheetHtml;
  SH.focusShortcutTarget = focusShortcutTarget;
  SH.itemSlotLabel = itemSlotLabel;
  SH.itemWearerText = itemWearerText;
  SH.livelihoodNote = livelihoodNote;
  SH.markActionsDirty = markActionsDirty;
  SH.mapGroupOf = mapGroupOf;
  SH.mapHighlightColorOf = mapHighlightColorOf;
  SH.relationText = relationText;
  SH.renderActions = renderActions;
  SH.renderActiveTab = renderActiveTab;
  SH.refreshVisibleDeedStatuses = refreshVisibleDeedStatuses;
  SH.setTab = setTab;
  SH.shortcutBindings = shortcutBindings;
  SH.shortcutFamilyLabel = shortcutFamilyLabel;
  SH.traitClassName = traitClassName;
  SH.wireEquipmentButtons = wireEquipmentButtons;
})();
