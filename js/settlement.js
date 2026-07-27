/* Fallowborn — reusable claims-and-settlement sessions.
   Consumers discover assets, compute claim bases, and apply the finished
   awards. This engine only weighs claims, records council moves, and advances
   a fully serializable case. */
window.FB = window.FB || {};

(function () {
  'use strict';

  function number(value, fallback) {
    return typeof value === 'number' && isFinite(value) ? value : fallback;
  }

  function copyObject(source) {
    var out = {};
    if (!source || typeof source !== 'object' || Array.isArray(source)) return out;
    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) out[key] = source[key];
    }
    return out;
  }

  function basisWeight(basis) {
    basis = basis || {};
    var balance = FBDATA.balance || {};
    return number(basis.contribution, 0) *
        number(balance.settlementContributionWeight, 0.25) +
      number(basis.vow, 0) *
        number(balance.settlementVowWeight, 0.20) +
      number(basis.occupation, 0) *
        number(balance.settlementOccupationWeight, 0.20) +
      number(basis.right, 0) *
        number(balance.settlementRightWeight, 0.15) +
      number(basis.support, 0) *
        number(balance.settlementSupportWeight, 0.10) +
      number(basis.office, 0) *
        number(balance.settlementOfficeWeight, 0.10);
  }

  function assetOf(settlementCase, assetId) {
    var assets = settlementCase.assets || [];
    for (var i = 0; i < assets.length; i++) {
      if (assets[i].id === assetId) return assets[i];
    }
    return null;
  }

  function isLand(asset) {
    return !!asset && (asset.land === true || asset.kind === 'crown' ||
      asset.kind === 'duchy' || asset.kind === 'county');
  }

  function hasLandAward(settlementCase, claimant) {
    var awards = settlementCase.awards || [];
    for (var i = 0; i < awards.length; i++) {
      if (awards[i].claimant === claimant &&
          isLand(assetOf(settlementCase, awards[i].asset))) return true;
    }
    return false;
  }

  function claimsFor(settlementCase, asset) {
    var rows = [], claims = settlementCase.claims || [];
    var boostAvailable = number(settlementCase.nextClaimBoost, 0) > 0;
    for (var i = 0; i < claims.length; i++) {
      var claim = claims[i];
      if (!claim || claim.asset !== asset.id || !claim.claimant) continue;
      if (isLand(asset) && hasLandAward(settlementCase, claim.claimant)) continue;
      var row = copyObject(claim);
      row.basis = copyObject(claim.basis);
      row.weight = number(claim.weight, basisWeight(row.basis));
      row.effectiveWeight = row.weight + number(claim.blessing, 0);
      if (boostAvailable && claim.claimant === 'player') {
        row.effectiveWeight += settlementCase.nextClaimBoost;
        row.nextClaimBoost = settlementCase.nextClaimBoost;
      }
      rows.push(row);
    }
    rows.sort(function (a, b) {
      return (b.effectiveWeight - a.effectiveWeight) ||
        (a.claimant < b.claimant ? -1 : a.claimant > b.claimant ? 1 : 0);
    });
    return rows;
  }

  function diplomacy(settlementCase) {
    return Math.max(0, number(settlementCase.playerDiplomacy, 0));
  }

  function current(settlementCase) {
    if (!settlementCase || settlementCase.status !== 'open') return null;
    var asset = settlementCase.assets[settlementCase.step];
    if (!asset) return null;
    var claims = claimsFor(settlementCase, asset);
    var leader = claims[0] || null, runnerUp = claims[1] || null;
    var playerClaim = null;
    for (var i = 0; i < claims.length; i++) {
      if (claims[i].claimant === 'player') {
        playerClaim = claims[i];
        break;
      }
    }
    var leaderWeight = leader ? leader.effectiveWeight : 0;
    var playerWeight = playerClaim ? playerClaim.effectiveWeight : 0;
    var runnerWeight = runnerUp ? runnerUp.effectiveWeight : 0;
    var terms = null;
    if (playerClaim && leader && leader.claimant !== 'player' &&
        leaderWeight - playerWeight <= 0.15 + 0.000001) {
      var leaderRank = number(leader.realmRank, 0);
      var assetRank = number(asset.rank, 0);
      var playerRank = number(playerClaim.realmRank, 0);
      terms = leaderRank > Math.max(assetRank, playerRank) && leader.realmId
        ? { kind:'vassal', liege:leader.realmId, cost:0 }
        : { kind:'payment', gold:50, cost:50 };
    }
    return {
      asset:asset,
      claims:claims,
      leader:leader,
      runnerUp:runnerUp,
      playerClaim:playerClaim,
      playerRelevant:!!(settlementCase.seats.indexOf('player') >= 0 ||
        playerClaim || settlementCase.playerHead),
      pressChance:playerClaim && leader && leader.claimant !== 'player'
        ? FB.clamp(0.35 + diplomacy(settlementCase) * 0.02 +
          (playerWeight - leaderWeight) * 0.75, 0.10, 0.85) : null,
      objectChance:leader && leader.claimant !== 'player' && runnerUp
        ? FB.clamp(0.30 + diplomacy(settlementCase) * 0.015 -
          (leaderWeight - runnerWeight) * 0.75, 0.10, 0.75) : null,
      terms:terms
    };
  }

  function create(spec) {
    spec = spec || {};
    var assets = Array.isArray(spec.assets) ? spec.assets.slice() : [];
    var rawClaims = Array.isArray(spec.claims) ? spec.claims : [];
    var claims = [];
    for (var i = 0; i < rawClaims.length; i++) {
      if (!rawClaims[i] || !rawClaims[i].claimant || !rawClaims[i].asset) continue;
      var claim = copyObject(rawClaims[i]);
      claim.basis = copyObject(rawClaims[i].basis);
      claim.weight = basisWeight(claim.basis);
      claims.push(claim);
    }
    return {
      schema:1,
      kind:spec.kind || 'generic',
      seats:Array.isArray(spec.seats) ? spec.seats.slice() : [],
      assets:assets,
      claims:claims,
      awards:[],
      step:0,
      status:assets.length ? 'open' : 'resolved',
      standing:2,
      nextClaimBoost:0,
      blessingUsed:false,
      blessed:null,
      objections:0,
      contested:false,
      playerHead:!!spec.playerHead,
      playerDiplomacy:Math.max(0, number(spec.playerDiplomacy, 0))
    };
  }

  function findStoredClaim(settlementCase, assetId, claimant) {
    for (var i = 0; i < settlementCase.claims.length; i++) {
      var claim = settlementCase.claims[i];
      if (claim.asset === assetId && claim.claimant === claimant) return claim;
    }
    return null;
  }

  function opinionRealm(claim) {
    if (!claim) return null;
    return claim.opinionRealm || claim.realmId ||
      (claim.claimant !== 'player' && claim.claimant.indexOf('local:') !== 0
        ? claim.claimant : null);
  }

  function awardCurrent(settlementCase, view, winner, moveKind, terms) {
    if (winner) {
      settlementCase.awards.push({
        asset:view.asset.id,
        claimant:winner.claimant,
        form:view.asset.kind,
        terms:terms || null,
        beneficiary:winner.beneficiary || null,
        runnerUp:view.runnerUp ? view.runnerUp.claimant : null,
        move:moveKind,
        confirmation:!!winner.confirmation,
        localCadet:!!winner.localCadet,
        sourceRealm:winner.sourceRealm || null
      });
    }
    if (number(settlementCase.nextClaimBoost, 0) > 0 && view.playerClaim &&
        number(view.playerClaim.nextClaimBoost, 0) > 0) {
      settlementCase.nextClaimBoost = 0;
    }
    settlementCase.step++;
    if (settlementCase.step >= settlementCase.assets.length) {
      settlementCase.status = 'resolved';
    }
  }

  function act(state, settlementCase, move) {
    if (!state || !settlementCase || settlementCase.status !== 'open') return false;
    if (typeof move === 'string') move = { kind:move };
    move = move || {};
    var view = current(settlementCase);
    if (!view) return false;
    var kind = move.kind;
    var winner = null, success = null, terms = null;

    if (kind === 'bless') {
      if (!settlementCase.playerHead || settlementCase.blessingUsed ||
          !move.claimant || move.claimant === 'player') return false;
      var blessed = findStoredClaim(settlementCase, view.asset.id, move.claimant);
      if (!blessed) return false;
      blessed.blessing = number(blessed.blessing, 0) + 0.10;
      settlementCase.blessingUsed = true;
      settlementCase.blessed = {
        asset:view.asset.id,
        claimant:move.claimant,
        amount:0.10
      };
      return { resolved:false, blessed:true };
    }

    if (kind === 'acquiesce') {
      winner = view.leader;
    } else if (kind === 'press') {
      if (!view.playerClaim || !view.leader ||
          view.leader.claimant === 'player') return false;
      success = FB.chance(view.pressChance);
      winner = success ? view.playerClaim : view.leader;
      settlementCase.contested = true;
    } else if (kind === 'endorse') {
      if (!move.claimant || move.claimant === 'player') return false;
      for (var e = 0; e < view.claims.length; e++) {
        if (view.claims[e].claimant === move.claimant) winner = view.claims[e];
      }
      if (!winner) return false;
      var endorsedRealm = opinionRealm(winner);
      if (endorsedRealm && FB.adjustRealmOpinion) {
        FB.adjustRealmOpinion(state, endorsedRealm, 15);
      }
      settlementCase.contested = true;
    } else if (kind === 'terms') {
      if (!view.playerClaim || !view.terms) return false;
      terms = copyObject(view.terms);
      if (terms.kind === 'payment') {
        if (state.player.gold < terms.gold) return false;
        state.player.gold -= terms.gold;
      }
      winner = view.playerClaim;
      settlementCase.contested = true;
    } else if (kind === 'object') {
      if (!view.leader || view.leader.claimant === 'player' || !view.runnerUp ||
          settlementCase.standing <= 0) return false;
      settlementCase.standing--;
      settlementCase.objections++;
      settlementCase.contested = true;
      var challengedRealm = opinionRealm(view.leader);
      if (challengedRealm && FB.adjustRealmOpinion) {
        FB.adjustRealmOpinion(state, challengedRealm, -10);
      }
      success = FB.chance(view.objectChance);
      winner = success ? view.runnerUp : view.leader;
    } else {
      return false;
    }

    awardCurrent(settlementCase, view, winner, kind, terms);
    if (kind === 'endorse') settlementCase.nextClaimBoost = 0.10;
    return {
      resolved:true,
      success:success,
      winner:winner ? winner.claimant : null,
      complete:settlementCase.status === 'resolved'
    };
  }

  function repair(settlementCase, spec) {
    var valid = settlementCase && settlementCase.schema === 1 &&
      typeof settlementCase.kind === 'string' &&
      Array.isArray(settlementCase.seats) &&
      Array.isArray(settlementCase.assets) &&
      Array.isArray(settlementCase.claims) &&
      Array.isArray(settlementCase.awards) &&
      isFinite(settlementCase.step);
    if (!valid) return create(spec);
    var assetIds = {};
    for (var assetIndex = 0;
         assetIndex < settlementCase.assets.length; assetIndex++) {
      var asset = settlementCase.assets[assetIndex];
      if (!asset || typeof asset.id !== 'string' || !asset.id ||
          assetIds[asset.id] || typeof asset.kind !== 'string') return create(spec);
      assetIds[asset.id] = 1;
    }
    for (var seatIndex = 0; seatIndex < settlementCase.seats.length; seatIndex++) {
      if (typeof settlementCase.seats[seatIndex] !== 'string') return create(spec);
    }
    settlementCase.step = FB.clamp(Math.floor(settlementCase.step), 0,
      settlementCase.assets.length);
    settlementCase.status = settlementCase.step >= settlementCase.assets.length
      ? 'resolved' : 'open';
    settlementCase.standing = FB.clamp(
      Math.floor(number(settlementCase.standing, 2)), 0, 2);
    settlementCase.nextClaimBoost = FB.clamp(
      number(settlementCase.nextClaimBoost, 0), 0, 0.10);
    settlementCase.blessingUsed = !!settlementCase.blessingUsed;
    settlementCase.objections = Math.max(0,
      Math.floor(number(settlementCase.objections, 0)));
    settlementCase.contested = !!settlementCase.contested;
    settlementCase.playerHead = !!settlementCase.playerHead;
    settlementCase.playerDiplomacy = Math.max(0,
      number(settlementCase.playerDiplomacy,
        spec && spec.playerDiplomacy !== undefined ? spec.playerDiplomacy : 0));
    for (var i = 0; i < settlementCase.claims.length; i++) {
      var claim = settlementCase.claims[i];
      if (!claim || typeof claim.claimant !== 'string' ||
          !assetIds[claim.asset]) return create(spec);
      claim.basis = copyObject(claim.basis);
      claim.weight = number(claim.weight, basisWeight(claim.basis));
      claim.blessing = FB.clamp(number(claim.blessing, 0), 0, 0.10);
    }
    for (var awardIndex = 0;
         awardIndex < settlementCase.awards.length; awardIndex++) {
      var award = settlementCase.awards[awardIndex];
      if (!award || !assetIds[award.asset] ||
          typeof award.claimant !== 'string') return create(spec);
    }
    return settlementCase;
  }

  FB.settlement = {
    create:create,
    current:current,
    act:act,
    repair:repair
  };
})();
