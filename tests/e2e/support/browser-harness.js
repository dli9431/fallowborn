(function () {
  'use strict';

  function own(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function finiteStateErrors(state) {
    const errors = [];
    const seen = [];

    function walk(value, path) {
      if (errors.length >= 50 || value === null || value === undefined) return;
      if (typeof value === 'number') {
        if (!Number.isFinite(value)) errors.push(path + ' is not finite');
        return;
      }
      if (typeof value !== 'object') return;
      if (seen.indexOf(value) >= 0) {
        errors.push(path + ' contains a cycle');
        return;
      }
      seen.push(value);
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) walk(value[i], path + '[' + i + ']');
      } else {
        for (const key in value) {
          if (own(value, key)) walk(value[key], path + '.' + key);
        }
      }
      seen.pop();
    }

    walk(state, 'state');
    return errors;
  }

  function checkInvariants() {
    const errors = [];
    const state = window.FB && FB.state;
    if (!state) return ['FB.state is missing'];

    function requireObject(value, label) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        errors.push(label + ' must be an object');
      }
    }
    function requireArray(value, label) {
      if (!Array.isArray(value)) errors.push(label + ' must be an array');
    }

    requireObject(state.date, 'state.date');
    requireObject(state.player, 'state.player');
    requireObject(state.chars, 'state.chars');
    requireObject(state.roles, 'state.roles');
    requireObject(state.realms, 'state.realms');
    requireObject(state.owner, 'state.owner');
    requireObject(state.holder, 'state.holder');
    requireArray(state.eventQueue, 'state.eventQueue');
    requireArray(state.log, 'state.log');
    requireArray(state.legends, 'state.legends');
    requireArray(state.armies, 'state.armies');
    errors.push.apply(errors, finiteStateErrors(state));

    if (!state.player || !state.chars) return errors;
    const playerCharacter = state.chars[state.player.charId];
    if (!playerCharacter) {
      errors.push('state.player.charId does not reference a character');
    }
    if (!FB.world || !FB.world.byId || !FB.world.byId[state.player.provinceId]) {
      errors.push('state.player.provinceId does not reference a province');
    }

    for (const id in state.chars) {
      if (!own(state.chars, id)) continue;
      const character = state.chars[id];
      if (!character || character.id !== id) {
        errors.push('state.chars.' + id + ' has a mismatched id');
        continue;
      }
      for (const field of ['fatherId', 'motherId', 'spouseId']) {
        if (character[field] && !state.chars[character[field]]) {
          errors.push('character ' + id + ' has missing ' + field + ' ' + character[field]);
        }
      }
      if (character.childrenIds) {
        if (!Array.isArray(character.childrenIds)) {
          errors.push('character ' + id + ' childrenIds must be an array');
        } else {
          for (const childId of character.childrenIds) {
            if (!state.chars[childId]) {
              errors.push('character ' + id + ' has missing child ' + childId);
            }
          }
        }
      }
      if (character.stepParentIds !== undefined) {
        if (!Array.isArray(character.stepParentIds)) {
          errors.push('character ' + id + ' stepParentIds must be an array');
        } else {
          const seenStepParents = {};
          for (const parentId of character.stepParentIds) {
            if (!state.chars[parentId]) {
              errors.push('character ' + id +
                ' has missing step-parent ' + parentId);
            } else if (parentId === character.fatherId ||
                parentId === character.motherId) {
              errors.push('character ' + id +
                ' records a biological parent as a step-parent');
            } else if (seenStepParents[parentId]) {
              errors.push('character ' + id +
                ' repeats step-parent ' + parentId);
            }
            seenStepParents[parentId] = true;
          }
        }
      }
      if (character.careerHistory !== undefined) {
        if (!character.careerHistory ||
            typeof character.careerHistory !== 'object' ||
            Array.isArray(character.careerHistory)) {
          errors.push('character ' + id + ' careerHistory must be an object');
        } else {
          for (const profession in character.careerHistory) {
            if (!own(character.careerHistory, profession)) continue;
            const record = character.careerHistory[profession];
            if (!record || typeof record !== 'object' ||
                Array.isArray(record) || record.profession !== profession) {
              errors.push('character ' + id +
                ' has invalid archived career ' + profession);
            }
          }
        }
      }
    }

    const courtshipTerms = state.player.courtshipTerms;
    if (courtshipTerms && (!state.chars[courtshipTerms.suitorId] ||
        !Number.isFinite(courtshipTerms.amount) ||
        typeof courtshipTerms.playerPays !== 'boolean')) {
      errors.push('state.player.courtshipTerms is invalid');
    }

    for (const role in state.roles) {
      if (!own(state.roles, role)) continue;
      const characterId = state.roles[role];
      if (typeof characterId === 'string' && !state.chars[characterId]) {
        errors.push('role ' + role + ' references missing character ' + characterId);
      }
    }

    for (const provinceId in state.owner) {
      if (!own(state.owner, provinceId)) continue;
      if (!FB.world.byId[provinceId]) {
        errors.push('owner references missing province ' + provinceId);
      }
      const realmId = state.owner[provinceId];
      if (realmId && !state.realms[realmId]) {
        errors.push('province ' + provinceId + ' has missing owner realm ' + realmId);
      }
    }
    for (const provinceId in state.holder) {
      if (!own(state.holder, provinceId)) continue;
      if (!FB.world.byId[provinceId]) {
        errors.push('holder references missing province ' + provinceId);
      }
      const realmId = state.holder[provinceId];
      if (realmId && !state.realms[realmId]) {
        errors.push('province ' + provinceId + ' has missing holder realm ' + realmId);
      }
    }

    for (const realmId in state.realms) {
      if (!own(state.realms, realmId)) continue;
      const realm = state.realms[realmId];
      if (!realm) {
        errors.push('realm ' + realmId + ' is missing');
        continue;
      }
      if (realm.liege && !state.realms[realm.liege]) {
        errors.push('realm ' + realmId + ' has missing liege ' + realm.liege);
      }
      let current = realmId;
      const visited = {};
      for (let depth = 0; current && depth <= 12; depth++) {
        if (visited[current]) {
          errors.push('realm liege cycle includes ' + realmId);
          break;
        }
        visited[current] = true;
        current = state.realms[current] && state.realms[current].liege;
        if (depth === 12 && current) errors.push('realm liege chain is too deep for ' + realmId);
      }
    }

    return errors.slice(0, 50);
  }

  function assertInvariants() {
    const errors = checkInvariants();
    if (errors.length) {
      throw new Error('Game invariant failure:\n- ' + errors.join('\n- '));
    }
    return true;
  }

  function countFired(state) {
    const fired = state && state.player && state.player.fired;
    return fired && typeof fired === 'object' ? Object.keys(fired).length : 0;
  }

  function interruptionDescription() {
    if (FB.ui && FB.ui.eventsBusy && FB.ui.eventsBusy()) return 'event modal';
    if (document.querySelector('#genmodal:not(.hidden)')) {
      const title = document.getElementById('gm-title');
      return 'generic modal' + (title && title.textContent ? ': ' + title.textContent : '');
    }
    if (FB.papacyPendingDecision && FB.papacyPendingDecision(FB.state)) {
      return 'papacy decision';
    }
    if (FB.greatHolyWarSettlementNeedsPlayer &&
        FB.greatHolyWarSettlementNeedsPlayer(FB.state)) {
      return 'great holy war settlement';
    }
    return 'unknown interruption';
  }

  function advanceDays(options) {
    const settings = Object.assign({
      days: 30,
      maxDays: 360,
      maxEvents: 100,
      maxInterruptions: 0,
      checkEvery: 15,
      style: 'first'
    }, options || {});
    if (!Number.isInteger(settings.days) || settings.days < 0 ||
        settings.days > settings.maxDays) {
      throw new Error('Requested day count exceeds the bounded maximum');
    }

    FB.game.setPaused(true);
    FB.game.auto.all = true;
    FB.game.auto.style = settings.style;
    const startTurn = FB.state.turn;
    const startFired = countFired(FB.state);
    let advanced = 0;
    let interruptions = 0;

    assertInvariants();
    while (advanced < settings.days) {
      const beforeTurn = FB.state.turn;
      FB.game.passDay();
      const delta = FB.state.turn - beforeTurn;
      if (delta !== 1) {
        interruptions++;
        if (interruptions > settings.maxInterruptions) {
          throw new Error('Simulation stalled at turn ' + FB.state.turn + ' on ' +
            interruptionDescription());
        }
        continue;
      }
      advanced++;
      const eventCount = countFired(FB.state) - startFired;
      if (eventCount > settings.maxEvents) {
        throw new Error('Simulation exceeded event bound at turn ' + FB.state.turn);
      }
      if (FB.state.player.dead) {
        throw new Error('Player died during bounded smoke run at turn ' + FB.state.turn);
      }
      if (advanced % settings.checkEvery === 0 || advanced === settings.days) {
        assertInvariants();
      }
    }

    return {
      startTurn: startTurn,
      endTurn: FB.state.turn,
      advanced: advanced,
      events: countFired(FB.state) - startFired,
      interruptions: interruptions,
      serialized: FB.save.serialize()
    };
  }

  window.FBTEST = {
    advanceDays: advanceDays,
    assertInvariants: assertInvariants,
    checkInvariants: checkInvariants
  };
})();
