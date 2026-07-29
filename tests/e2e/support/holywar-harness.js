(function () {
  'use strict';

  window.FBTEST = window.FBTEST || {};

  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function participant(source, fallbackRealm) {
    source = source || {};
    return {
      realm:source.realm || fallbackRealm,
      sovereign:source.sovereign !== false,
      mandatory:!!source.mandatory,
      voluntary:source.voluntary !== false,
      joinedTurn:FB.state.turn,
      vowSeasons:source.vowSeasons || 4,
      desire:copy(source.desire || { kind:'neutral', id:null }),
      served:source.served === undefined ? 4 : source.served,
      mustered:source.mustered !== false,
      vowOutcome:source.vowOutcome || null
    };
  }

  function makePlayerHead(state) {
    if (!state.realms.player || !state.realms.player.alive) {
      FB.foundPlayerRealm(state);
    }
    state.religiousHeads.catholic = 'player';
  }

  FBTEST.makeGreatHolyWar = function (options) {
    options = options || {};
    var state = FB.state;
    var targetKingdom = options.targetKingdom || 'k_syria';
    var objective = (options.objectiveCounties ||
      FB.kingdomCounties(targetKingdom)).slice();
    var captured = (options.capturedCounties || objective).slice();
    var occupiedBy = options.occupiedBy || {};
    var attackerSources = options.attackers || [
      {
        realm:'west_francia',
        contribution:60,
        desire:{ kind:'crown', id:null }
      },
      {
        realm:'italy',
        contribution:40,
        desire:{ kind:'sacred', id:null }
      }
    ];
    var attackers = [];
    var contribution = {};

    for (var i = 0; i < attackerSources.length; i++) {
      var source = attackerSources[i];
      attackers.push(participant(source, i ? 'italy' : 'west_francia'));
      contribution[attackers[attackers.length - 1].realm] =
        source.contribution === undefined ? 10 : source.contribution;
    }

    if (options.includePlayer) {
      attackers.push(participant({
        realm:'player',
        sovereign:!!options.playerSovereign,
        voluntary:true,
        desire:options.playerDesire || { kind:'neutral', id:null },
        served:options.playerServed === undefined ? 4 : options.playerServed,
        mustered:options.playerMustered !== false
      }, 'player'));
      contribution.player = options.playerContribution === undefined
        ? 50 : options.playerContribution;
      state.player.greatHolyWar = {
        campaignId:options.id || 'ghw_test',
        camp:'attackers',
        mode:options.playerMode || 'host',
        vow:true,
        mandatory:false,
        withdrawn:!!options.playerWithdrawn,
        landEligible:options.playerLandEligible !== false,
        renewalRequired:!!options.renewalRequired,
        vowTerms:{
          seasons:options.playerSeasons || 4,
          desire:copy(options.playerDesire || { kind:'neutral', id:null }),
          beneficiary:options.beneficiary || null,
          served:options.playerServed === undefined ? 4 : options.playerServed,
          mustered:options.playerMustered !== false
        },
        vowOutcome:options.playerVowOutcome || null
      };
    } else {
      state.player.greatHolyWar = null;
    }

    if (options.playerSovereign) {
      state.player.provs = state.player.provs || [];
      if (!state.player.provs.length && state.player.provinceId) {
        state.player.provs.push(state.player.provinceId);
        state.owner[state.player.provinceId] = 'player';
        state.holder[state.player.provinceId] = 'player';
      }
      state.player.liege = null;
      state.player.tier = Math.max(6, state.player.tier);
      FB.foundPlayerRealm(state);
      state.realms.player.rank = Math.max(3, state.realms.player.rank || 0);
      state.realms.player.liege = null;
      for (var playerIndex = 0; playerIndex < attackers.length; playerIndex++) {
        if (attackers[playerIndex].realm === 'player') {
          attackers[playerIndex].sovereign = true;
        }
      }
    }
    if (options.playerHead) makePlayerHead(state);

    var occupations = {};
    for (var countyIndex = 0; countyIndex < objective.length; countyIndex++) {
      var pid = objective[countyIndex];
      var isCaptured = captured.indexOf(pid) >= 0;
      occupations[pid] = {
        occupied:isCaptured,
        progress:0,
        progressCamp:null,
        occupiedBy:isCaptured
          ? (occupiedBy[pid] || options.defaultOccupiedBy ||
            (options.includePlayer ? 'player' : attackers[0].realm))
          : null
      };
    }

    var campaign = {
      id:options.id || 'ghw_test',
      phase:options.phase || 'active',
      callingReligion:'catholic',
      callerRealm:options.playerHead ? 'player' : 'papacy',
      callerClaimantId:null,
      callerObedienceId:null,
      leaderRealm:options.leaderRealm || attackers[0].realm,
      targetKingdom:targetKingdom,
      holyCounties:(options.holyCounties || ['jerusalem']).slice(),
      objectiveCounties:objective,
      calledTurn:state.turn - 180,
      launchTurn:state.turn - 1,
      launchedTurn:state.turn - 1,
      deadlineTurn:state.turn + 2880,
      participants:{
        attackers:attackers,
        defenders:[{
          realm:'abbasid',
          sovereign:true,
          mandatory:true,
          voluntary:false,
          joinedTurn:state.turn
        }]
      },
      occupations:occupations,
      resolve:100,
      contribution:contribution,
      result:null,
      settlement:null
    };
    state.greatHolyWar = campaign;
    if (FB.game) {
      FB.game.observe = false;
      FB.game.setPaused(true);
    }
    FB.invalidateRealmCache();
    return campaign;
  };

  FBTEST.resolveGreatHolyWar = function (options) {
    var campaign = FBTEST.makeGreatHolyWar(options);
    var result = FB.resolveGreatHolyWar(
      FB.state,
      options && options.outcome || 'attackers',
      'test'
    );
    return {
      result:result,
      campaign:campaign,
      settlement:campaign.settlement
    };
  };

  FBTEST.setLocalHolder = function (realmId, counties, extraCounties) {
    var state = FB.state;
    var realm = state.realms[realmId];
    if (!realm) throw new Error('Unknown local realm ' + realmId);
    realm.religion = 'catholic';
    var ids = (counties || []).concat(extraCounties || []);
    for (var i = 0; i < ids.length; i++) {
      state.holder[ids[i]] = realmId;
    }
    FB.invalidateRealmCache();
    return realm;
  };
})();
