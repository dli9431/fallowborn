/* Fallowborn — Catholic cardinals, Papal elections, authority, and schism.
   The Catholic territorial office remains state.religiousHeads.catholic.
   Everything else is additive save-v1 state under state.papacy. */
window.FB = window.FB || {};

(function () {
  'use strict';

  function definition() {
    return FBDATA.papacy || {};
  }

  function clampAuthority(value) {
    return FB.clamp(Math.round(Number(value) || 0), 0, 100);
  }

  function playerChar(state) {
    return state && state.player && state.chars &&
      state.chars[state.player.charId] || null;
  }

  function catholicFaith(state, c) {
    return !!(c && FB.faithHasSystem &&
      FB.faithHasSystem(c.religion, 'papacy', state));
  }

  function catholicReligion(state, religionId) {
    return !!(religionId && FB.faithHasSystem &&
      FB.faithHasSystem(religionId, 'papacy', state));
  }

  function activeBookmarkId(state) {
    if (state && state.start && state.start.id) return String(state.start.id);
    return state && state.date && state.date.year >= 1000 ? '1066' : '867';
  }

  function copyObject(source) {
    var out = {};
    source = source || {};
    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) out[key] = source[key];
    }
    return out;
  }

  function romanRealmId(state) {
    var realm = FB.religiousHeadSnapshot
      ? FB.religiousHeadSnapshot(state, 'catholic') : null;
    return realm ? realm.id : null;
  }

  function realmSovereign(state, rid) {
    if (!rid) return null;
    if (rid === 'player') {
      if (FB.isPlayerSovereign && FB.isPlayerSovereign(state)) return 'player';
      return FB.playerRealmId ? FB.playerRealmId(state) : null;
    }
    return FB.topRealm ? FB.topRealm(state, rid) : rid;
  }

  function realmReligion(state, rid) {
    return FB.realmReligionId ? FB.realmReligionId(state, rid) : null;
  }

  function realmRank(state, rid) {
    if (rid === 'player') {
      return Math.max(0, (state.player && state.player.tier || 3) - 3);
    }
    return state.realms && state.realms[rid] ? state.realms[rid].rank || 0 : 0;
  }

  function livingCatholicSovereigns(state) {
    var out = [];
    for (var rid in state.realms) {
      var realm = state.realms[rid];
      if (!realm || !realm.alive || realm.liege || rid === 'player') continue;
      if (FB.faithHasSystem(realmReligion(state, rid), 'papacy', state)) out.push(rid);
    }
    if (FB.isPlayerSovereign && FB.isPlayerSovereign(state) &&
        catholicFaith(state, playerChar(state))) {
      out.push('player');
    }
    out.sort();
    return out;
  }

  function makeObedience(state, id, authority, claimantId, roman) {
    return {
      id:id,
      claimantId:claimantId || null,
      authority:clampAuthority(authority),
      college:[],
      supporters:[],
      strongestPatron:null,
      roman:!!roman,
      createdTurn:state.turn || 0,
      piety:500,
      lastConsistoryYear:null,
      pontificateAppointments:{},
      pendingPetitions:[],
      promises:[],
      status:'active'
    };
  }

  function ensureCollections(papacy) {
    if (!papacy.obediences || typeof papacy.obediences !== 'object' ||
        Array.isArray(papacy.obediences)) papacy.obediences = {};
    if (!papacy.cardinals || typeof papacy.cardinals !== 'object' ||
        Array.isArray(papacy.cardinals)) papacy.cardinals = {};
    if (!papacy.elections || typeof papacy.elections !== 'object' ||
        Array.isArray(papacy.elections)) papacy.elections = {};
    if (!papacy.realmObedience || typeof papacy.realmObedience !== 'object' ||
        Array.isArray(papacy.realmObedience)) papacy.realmObedience = {};
    if (!papacy.investiture || typeof papacy.investiture !== 'object' ||
        Array.isArray(papacy.investiture)) papacy.investiture = {};
    if (!papacy.excommunications || typeof papacy.excommunications !== 'object' ||
        Array.isArray(papacy.excommunications)) papacy.excommunications = {};
    if (!papacy.archive || !Array.isArray(papacy.archive)) papacy.archive = [];
    if (!papacy.regnalNameCounts || typeof papacy.regnalNameCounts !== 'object' ||
        Array.isArray(papacy.regnalNameCounts)) papacy.regnalNameCounts = {};
    if (!papacy.grounds || typeof papacy.grounds !== 'object' ||
        Array.isArray(papacy.grounds)) papacy.grounds = {};
    if (!papacy.relationships || typeof papacy.relationships !== 'object' ||
        Array.isArray(papacy.relationships)) papacy.relationships = {};
    if (!papacy.custody || typeof papacy.custody !== 'object' ||
        Array.isArray(papacy.custody)) papacy.custody = {};
    return papacy;
  }

  FB.papalElectionLaw = function (stateOrYear) {
    var year = typeof stateOrYear === 'number' ? stateOrYear :
      stateOrYear && stateOrYear.date ? stateOrYear.date.year : 867;
    var laws = definition().elections || [];
    for (var i = 0; i < laws.length; i++) {
      var law = laws[i];
      if ((law.from === null || law.from === undefined || year >= law.from) &&
          (law.through === null || law.through === undefined || year <= law.through)) {
        return law;
      }
    }
    return laws[0] || null;
  };

  function authorityDefault(state) {
    var starts = definition().authority && definition().authority.startByBookmark || {};
    var id = activeBookmarkId(state);
    if (starts[id] !== undefined) return starts[id];
    return state.date && state.date.year >= 1000 ? 55 : 65;
  }

  function seedRegnalNames(state, papacy) {
    if (Object.keys(papacy.regnalNameCounts).length) return;
    var seeds = definition().regnalSeeds || {};
    papacy.regnalNameCounts = copyObject(
      seeds[activeBookmarkId(state)] ||
      (state.date && state.date.year >= 1000 ? seeds['1066'] : seeds['867']) ||
      {}
    );
  }

  function syncObedienceSupporters(state, papacy, knownSovereigns) {
    var ids = Object.keys(papacy.obediences);
    var i;
    for (i = 0; i < ids.length; i++) {
      papacy.obediences[ids[i]].supporters = [];
      papacy.obediences[ids[i]].strongestPatron = null;
    }
    /* ensurePapacy already computed this list moments ago on the same
       untouched world — take it over when handed in */
    var sovereigns = knownSovereigns || livingCatholicSovereigns(state);
    for (i = 0; i < sovereigns.length; i++) {
      var rid = sovereigns[i];
      var oid = papacy.realmObedience[rid];
      if (!papacy.obediences[oid] || papacy.obediences[oid].status !== 'active') {
        oid = papacy.romanObedience;
        papacy.realmObedience[rid] = oid;
      }
      papacy.obediences[oid].supporters.push(rid);
    }
    for (i = 0; i < ids.length; i++) {
      var obedience = papacy.obediences[ids[i]];
      var best = null, bestStrength = -1;
      for (var j = 0; j < obedience.supporters.length; j++) {
        var supporter = obedience.supporters[j];
        var provinces = supporter === 'player'
          ? (state.player.provs || [])
          : (FB.realmProvinces ? FB.realmProvinces(state, supporter) : []);
        var strength = 0;
        for (var k = 0; k < provinces.length; k++) {
          strength += state.dev[provinces[k]] || 1;
        }
        if (strength > bestStrength) {
          best = supporter;
          bestStrength = strength;
        }
      }
      obedience.strongestPatron = best;
    }
  }

  function materializeIncumbent(state, rid) {
    if (rid === 'player') return playerChar(state);
    var c = FB.realmRulerCharacter && FB.realmRulerCharacter(state, rid);
    if (!c && FB.materializeRealmRuler) c = FB.materializeRealmRuler(state, rid);
    return c || null;
  }

  function papalRecord(state, charId) {
    var papacy = state && state.papacy;
    return papacy && papacy.cardinals && papacy.cardinals[charId] || null;
  }

  FB.papalOfficeOf = function (state, value) {
    var charId = typeof value === 'string' ? value : value && value.id;
    return charId ? papalRecord(state, charId) : null;
  };

  FB.papacyCelibate = function (state, value) {
    var record = FB.papalOfficeOf(state, value);
    var c = typeof value === 'string' ? state.chars[value] : value;
    return !!((FB.bishopricOf && FB.bishopricOf(state, c)) ||
      (record && (record.office === 'cardinal' || record.office === 'pope')));
  };

  FB.papacyCelibateSnapshot = function (state, value) {
    var record = FB.papalOfficeOf(state, value);
    var c = typeof value === 'string' ? state.chars[value] : value;
    return !!((FB.bishopricSnapshot && FB.bishopricSnapshot(state, c)) ||
      (c && (c.papalOffice === 'cardinal' || c.papalOffice === 'pope')) ||
      (record && (record.office === 'cardinal' || record.office === 'pope')));
  };

  FB.isCardinal = function (state, value) {
    var record = FB.papalOfficeOf(state, value);
    return !!(record && record.office === 'cardinal');
  };

  FB.isPapalClaimant = function (state, value) {
    var charId = typeof value === 'string' ? value : value && value.id;
    if (!state || !state.papacy || !charId) return false;
    for (var oid in state.papacy.obediences) {
      var obedience = state.papacy.obediences[oid];
      if (obedience && obedience.status === 'active' &&
          obedience.claimantId === charId) return true;
    }
    return false;
  };

  FB.playerCardinal = function (state) {
    return !!(state && FB.isCardinal(state, state.player.charId));
  };

  FB.playerPope = function (state) {
    return !!(state && FB.isPapalClaimant(state, state.player.charId));
  };

  FB.papalDisplayName = function (state, value) {
    var c = typeof value === 'string' ? state.chars[value] : value;
    if (!c) return '';
    var record = papalRecord(state, c.id);
    if (record && record.office === 'pope') {
      return FB.T('Pope {name}', { name:c.papalName || c.name });
    }
    if (record && record.office === 'cardinal') {
      return FB.T('Cardinal {name}', { name:FB.fullName(c) });
    }
    return FB.fullName(c);
  };

  FB.papalAuthorityBand = function (value) {
    var bands = definition().authority && definition().authority.bands || [];
    value = clampAuthority(value);
    for (var i = 0; i < bands.length; i++) {
      if (value >= bands[i].min && value <= bands[i].max) return bands[i];
    }
    return { id:'disputed', name:'Disputed', min:0, max:24 };
  };

  FB.adjustPapalAuthority = function (state, obedienceId, amount, reason) {
    var papacy = FB.ensurePapacy(state);
    var obedience = papacy && papacy.obediences[obedienceId || papacy.romanObedience];
    if (!obedience) return null;
    obedience.authority = clampAuthority(obedience.authority + (Number(amount) || 0));
    obedience.lastAuthorityReason = reason || null;
    obedience.lastAuthorityTurn = state.turn;
    return obedience.authority;
  };

  FB.adjustPapalSupporterOpinions = function (state, obedienceId, amount) {
    var papacy = FB.ensurePapacy(state);
    var obedience = papacy && papacy.obediences[
      obedienceId || papacy.romanObedience
    ];
    if (!obedience || !FB.adjustStanding) return;
    for (var i = 0; i < obedience.supporters.length; i++) {
      var rid = obedience.supporters[i];
      if (rid !== 'player') {
        FB.adjustStanding(state, { kind:'realm', id:rid }, amount,
          'papacy:supporters');
      }
    }
  };

  FB.papalObedienceForRealm = function (state, rid) {
    var papacy = savedPapacy(state) || FB.ensurePapacy(state);
    if (!papacy) return null;
    var sovereign = realmSovereign(state, rid);
    if (!sovereign || !catholicReligion(state,
        realmReligion(state, sovereign))) return null;
    var oid = papacy.realmObedience[sovereign];
    if (!papacy.obediences[oid] || papacy.obediences[oid].status !== 'active') {
      oid = papacy.romanObedience;
      papacy.realmObedience[sovereign] = oid;
    }
    return oid;
  };

  FB.papalObedienceForCharacter = function (state, value) {
    var c = typeof value === 'string' ? state.chars[value] : value;
    if (!c || !catholicFaith(state, c)) return null;
    var office = papalRecord(state, c.id);
    if (office && office.obedienceId) return office.obedienceId;
    if (c.id === state.player.charId) {
      return FB.papalObedienceForRealm(state, FB.playerRealmId(state));
    }
    var rulerRealm = FB.realmIdForRulerCharacter &&
      FB.realmIdForRulerCharacter(state, c);
    if (rulerRealm) return FB.papalObedienceForRealm(state, rulerRealm);
    var home = FB.characterResidence ? FB.characterResidence(state, c) : null;
    return FB.papalObedienceForRealm(state, home && state.owner[home]);
  };

  FB.popeRecognizedBy = function (state, viewer) {
    var papacy = FB.ensurePapacy(state);
    if (!papacy) return null;
    var oid;
    if (typeof viewer === 'string' && state.realms && state.realms[viewer]) {
      oid = FB.papalObedienceForRealm(state, viewer);
    } else {
      var c = typeof viewer === 'string' ? state.chars[viewer] : viewer;
      oid = c ? FB.papalObedienceForCharacter(state, c) : papacy.romanObedience;
    }
    var obedience = papacy.obediences[oid];
    return obedience && obedience.claimantId &&
      state.chars[obedience.claimantId] &&
      !state.chars[obedience.claimantId].dead
      ? state.chars[obedience.claimantId] : null;
  };

  FB.romanPope = function (state) {
    var papacy = FB.ensurePapacy(state);
    var obedience = papacy && papacy.obediences[papacy.romanObedience];
    return obedience && obedience.claimantId &&
      state.chars[obedience.claimantId] || null;
  };

  function papacyInSchism(papacy) {
    if (!papacy || !papacy.obediences) return false;
    var count = 0;
    for (var oid in papacy.obediences) {
      if (papacy.obediences[oid] && papacy.obediences[oid].status === 'active') count++;
    }
    return count > 1;
  }

  FB.papacyInSchism = function (state) {
    return papacyInSchism(FB.ensurePapacy(state));
  };

  function starterCardinalCharacter(state, index) {
    var pope = FB.romanPope(state);
    var seat = FB.world && FB.world.byId && FB.world.byId.roma;
    var culture = index % 3 === 0 ? 'italian' :
      pope && pope.culture || seat && seat.culture || 'italian';
    if (!FBDATA.cultures[culture]) culture = pope && pope.culture || 'frankish';
    var c = FB.makeCharacter(state, {
      sex:'m',
      culture:culture,
      religion:'catholic',
      born:state.date.year - FB.ri(40, 72),
      dyn:index % 4 === 0 ? 'of Rome' : null,
      role:'notable',
      station:4,
      quality:5 + FB.ri(0, 3),
      opinion:FB.ri(-10, 35)
    });
    c.health = 8;
    c.skills.lea = Math.max(14, c.skills.lea || 0);
    c.skills.dip = Math.max(7, c.skills.dip || 0);
    if (FB.setCareer) FB.setCareer(state, c, index % 3 === 0 ? 'monk' : 'priest', 'master');
    c.religiousRanks = c.religiousRanks || {};
    if (c.career && c.career.profession === 'monk') c.religiousRanks.catholic_monastic = 4;
    else c.religiousRanks.catholic_clerical = 5;
    c.clericalPiety = FB.ri(250, 900);
    c.clericalPrestige = FB.ri(150, 600);
    c.curialOpinion = FB.ri(15, 70);
    c.homeProvinceId = 'roma';
    return c;
  }

  function nextCardinalOrder(papacy, obedience) {
    var counts = { bishop:0, priest:0, deacon:0 };
    for (var i = 0; i < obedience.college.length; i++) {
      var record = papacy.cardinals[obedience.college[i]];
      if (record && counts[record.order] !== undefined) counts[record.order]++;
    }
    if (counts.bishop < Math.max(2, Math.floor(obedience.college.length / 4))) return 'bishop';
    return counts.priest <= counts.deacon ? 'priest' : 'deacon';
  }

  function nextRomanTitle(state, papacy, obedience) {
    var used = {};
    for (var i = 0; i < obedience.college.length; i++) {
      var record = papacy.cardinals[obedience.college[i]];
      if (record && record.titleChurch) used[record.titleChurch] = 1;
    }
    var titles = definition().romanTitles || [];
    for (i = 0; i < titles.length; i++) if (!used[titles[i]]) return titles[i];
    return titles.length ? titles[obedience.college.length % titles.length] : 'Rome';
  }

  function cardinalBloc(c) {
    if (c.career && c.career.profession === 'monk') return 'monastic';
    if (c.traits && (c.traits.indexOf('zealous') >= 0 ||
        c.traits.indexOf('honest') >= 0)) return 'reform';
    return 'curial';
  }

  function cardinalKinKey(c) {
    return c && (c.dyn || c.fatherId || c.motherId || c.id);
  }

  FB.appointCardinal = function (state, value, obedienceId, appointedBy, opts) {
    opts = opts || {};
    var papacy = FB.ensurePapacy(state);
    var c = typeof value === 'string' ? state.chars[value] : value;
    var obedience = papacy && papacy.obediences[
      obedienceId || papacy.romanObedience
    ];
    if (!c || c.dead ||
        (FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(state, c.id)) ||
        !catholicFaith(state, c) || c.sex !== 'm' ||
        !obedience || obedience.college.length >= (definition().hardCap || 18)) {
      return false;
    }
    var old = papacy.cardinals[c.id];
    if (old && old.office === 'cardinal') return old;
    var record = old || { charId:c.id };
    record.office = 'cardinal';
    record.obedienceId = obedience.id;
    record.order = opts.order || nextCardinalOrder(papacy, obedience);
    record.titleChurch = opts.titleChurch || nextRomanTitle(state, papacy, obedience);
    record.bloc = opts.bloc || cardinalBloc(c);
    record.appointedBy = appointedBy || obedience.claimantId || null;
    record.appointedTurn = state.turn;
    record.appointedYear = state.date.year;
    record.romanResident = state.date.year < 1100;
    record.familyKey = cardinalKinKey(c);
    papacy.cardinals[c.id] = record;
    if (obedience.college.indexOf(c.id) < 0) obedience.college.push(c.id);
    c.station = Math.max(4, FB.stationOf(c));
    c.papalOffice = 'cardinal';
    c.homeProvinceId = record.romanResident ? 'roma' : (c.homeProvinceId || 'roma');
    if (c.id === state.player.charId) state.player.flags.cardinal = 1;

    var pope = obedience.claimantId && state.chars[obedience.claimantId];
    if (pope && appointedBy === pope.id) {
      var key = c.dyn && pope.dyn && c.dyn === pope.dyn ? c.dyn : null;
      if (key) {
        var previous = obedience.pontificateAppointments[key] || 0;
        obedience.pontificateAppointments[key] = previous + 1;
        if (previous >= 1) {
          FB.adjustPapalAuthority(state, obedience.id,
            definition().authority.repeatedNepotism || -5, 'nepotism');
          var loss = definition().balance.consistoryOpinionLoss || 10;
          for (var i = 0; i < obedience.college.length; i++) {
            var other = state.chars[obedience.college[i]];
            if (other && !other.dead && other.dyn !== pope.dyn) {
              FB.adjustStanding(state, { kind:'character', id:other.id },
                -loss, 'papacy:nepotism');
            }
          }
        }
      }
    }
    if (!opts.silent && FB.news) {
      FB.news(state, FB.msg('news.papacy.cardinal_appointed',
        '⛪ {name} is created Cardinal of {title}.', {
          name:FB.fullName(c),
          title:record.titleChurch
        }));
    }
    return record;
  };

  function installIncumbentRecord(state, papacy, claimant, obedience) {
    if (!claimant) return;
    var record = papacy.cardinals[claimant.id] || { charId:claimant.id };
    record.office = 'pope';
    record.obedienceId = obedience.id;
    record.order = record.order || 'bishop';
    record.titleChurch = record.titleChurch || 'Ostia';
    record.bloc = record.bloc || cardinalBloc(claimant);
    record.electedTurn = record.electedTurn === undefined ? state.turn : record.electedTurn;
    papacy.cardinals[claimant.id] = record;
    claimant.papalOffice = 'pope';
    claimant.station = Math.max(4, FB.stationOf(claimant));
    claimant.papalName = claimant.papalName || claimant.name;
  }

  function generateStarterCollege(state, papacy, obedience) {
    var target = definition().targetCollege || 12;
    while (obedience.college.length < target) {
      var c = starterCardinalCharacter(state, obedience.college.length);
      FB.appointCardinal(state, c, obedience.id, obedience.claimantId, {
        silent:true
      });
    }
  }

  /* The normalized save shape: creation and load run the full repair below,
     and every Papal mutation preserves these collections. Read-only queries
     on a hot path — obedience and excommunication lookups behind every realm
     strength check — can therefore trust the saved record directly instead of
     rescanning every Catholic sovereign once per query. */
  function savedPapacy(state) {
    var saved = state && state.papacy;
    return saved && typeof saved === 'object' && !Array.isArray(saved) &&
      saved.romanObedience && saved.obediences && saved.realmObedience &&
      saved.excommunications ? saved : null;
  }

  FB.ensurePapacy = function (state) {
    if (!state || !state.date || !state.player || !state.chars || !state.realms) return null;
    if (!state.papacy || typeof state.papacy !== 'object' ||
        Array.isArray(state.papacy)) {
      state.papacy = {
        version:1,
        romanObedience:'roman',
        nextObedience:2,
        migratedTurn:state.turn || 0
      };
    }
    var papacy = ensureCollections(state.papacy);
    if (!papacy.romanObedience) papacy.romanObedience = 'roman';
    if (!papacy.nextObedience || papacy.nextObedience < 2) papacy.nextObedience = 2;
    seedRegnalNames(state, papacy);

    var rid = romanRealmId(state);
    var roman = papacy.obediences[papacy.romanObedience];
    if (!roman) {
      var incumbent = rid ? materializeIncumbent(state, rid) : null;
      roman = makeObedience(state, papacy.romanObedience,
        authorityDefault(state), incumbent && incumbent.id, true);
      papacy.obediences[roman.id] = roman;
      if (incumbent) {
        installIncumbentRecord(state, papacy, incumbent, roman);
        retireDynasticPapalCourt(state, rid, incumbent);
        syncPapalRealmRuler(state, roman, incumbent);
      }
      generateStarterCollege(state, papacy, roman);
    }
    roman.roman = true;
    if (roman.claimantId && state.chars[roman.claimantId] &&
        !state.chars[roman.claimantId].dead) {
      installIncumbentRecord(state, papacy, state.chars[roman.claimantId], roman);
    } else if (rid && !papacy.elections[roman.id]) {
      var repaired = materializeIncumbent(state, rid);
      if (repaired && !repaired.dead) {
        roman.claimantId = repaired.id;
        installIncumbentRecord(state, papacy, repaired, roman);
      }
    }
    /* The Papal States are elective from the first bookmark frame, not only
       after the first conclave. Normalize older affected saves as well: their
       incumbent survives, but an accidentally seeded wife and heirs cease to
       be the Pope's family or the realm's succession. */
    var claimant = roman.claimantId && state.chars[roman.claimantId];
    var romanRealm = rid && state.realms[rid];
    var romanSuccession = romanRealm && romanRealm.succession;
    var romanRoot = romanSuccession && romanSuccession.rulerMemberId &&
      romanSuccession.members &&
      romanSuccession.members[romanSuccession.rulerMemberId];
    if (claimant && !claimant.dead && romanRealm &&
        (!romanSuccession || !romanSuccession.papalElective ||
          !romanRoot || romanRoot.charId !== claimant.id)) {
      retireDynasticPapalCourt(state, rid, claimant);
      syncPapalRealmRuler(state, roman, claimant);
    }

    var sovereigns = livingCatholicSovereigns(state);
    for (var i = 0; i < sovereigns.length; i++) {
      if (!papacy.realmObedience[sovereigns[i]]) {
        papacy.realmObedience[sovereigns[i]] = papacy.romanObedience;
      }
    }
    syncObedienceSupporters(state, papacy, sovereigns);
    return papacy;
  };

  function hasLivingSpouse(state, c) {
    if (!c) return false;
    if (c.spouseId && state.chars[c.spouseId] && !state.chars[c.spouseId].dead) {
      return true;
    }
    for (var id in state.chars) {
      var other = state.chars[id];
      if (other && !other.dead && other.spouseId === c.id) return true;
    }
    return false;
  }

  FB.isCatholicBishop = function (state, c) {
    if (!c || c.dead || !catholicFaith(state, c)) return false;
    var office = papalRecord(state, c.id);
    if (office && (office.office === 'cardinal' || office.office === 'pope')) return true;
    return !!(FB.bishopricOf && FB.bishopricOf(state, c));
  };

  function candidatePiety(state, c) {
    if (c.id === state.player.charId ||
        (FB.isHouseholdCharacter && FB.isHouseholdCharacter(state, c.id))) {
      return state.player.piety || 0;
    }
    return c.clericalPiety === undefined ? 250 : c.clericalPiety;
  }

  function candidatePrestige(state, c) {
    if (c.id === state.player.charId ||
        (FB.isHouseholdCharacter && FB.isHouseholdCharacter(state, c.id))) {
      return state.player.prestige || 0;
    }
    return c.clericalPrestige === undefined ? 150 : c.clericalPrestige;
  }

  function papalOpinionOfCandidate(state, c, obedience) {
    var pope = obedience && obedience.claimantId &&
      state.chars[obedience.claimantId];
    if (!pope) return -100;
    if (c.id === state.player.charId ||
        (FB.isHouseholdCharacter && FB.isHouseholdCharacter(state, c.id))) {
      return FB.standingOf(state, { kind:'character', id:pope.id });
    }
    if (c.curialOpinion !== undefined) return Number(c.curialOpinion) || 0;
    var key = pope.id + ':' + c.id;
    var papacy = state.papacy;
    if (papacy.relationships[key] === undefined) {
      papacy.relationships[key] = FB.ri(-10, 50);
    }
    return papacy.relationships[key];
  }

  FB.papalOpinionOfCandidate = function (state, value, obedienceId) {
    var papacy = FB.ensurePapacy(state);
    var c = typeof value === 'string' ? state.chars[value] : value;
    var obedience = papacy && papacy.obediences[
      obedienceId || (c && FB.papalObedienceForCharacter(state, c)) ||
      papacy.romanObedience
    ];
    return c && obedience ? papalOpinionOfCandidate(state, c, obedience) : 0;
  };

  FB.adjustPapalOpinionOfCandidate = function (state, value, amount, obedienceId) {
    var papacy = FB.ensurePapacy(state);
    var c = typeof value === 'string' ? state.chars[value] : value;
    var obedience = papacy && papacy.obediences[
      obedienceId || (c && FB.papalObedienceForCharacter(state, c)) ||
      papacy.romanObedience
    ];
    var pope = obedience && obedience.claimantId &&
      state.chars[obedience.claimantId];
    if (!c || !pope) return 0;
    if (c.id === state.player.charId ||
        (FB.isHouseholdCharacter && FB.isHouseholdCharacter(state, c.id))) {
      return FB.adjustStanding(state, { kind:'character', id:pope.id },
        amount, 'papacy:candidate');
    }
    var key = pope.id + ':' + c.id;
    papacy.relationships[key] = FB.clamp(
      papalOpinionOfCandidate(state, c, obedience) + (Number(amount) || 0),
      -100, 100);
    return papacy.relationships[key];
  };

  FB.cardinalPetitionStatus = function (state, value) {
    var papacy = FB.ensurePapacy(state);
    var c = typeof value === 'string' ? state.chars[value] : value;
    var req = definition().cardinalRequirements || {};
    var obedience = papacy && papacy.obediences[papacy.romanObedience];
    var missing = [];
    if (!c || c.dead) return { visible:false, ready:false, missing:[FB.T('No living candidate.')] };
    if (FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(state, c.id)) {
      missing.push(FB.T('not held captive'));
    }
    if (!catholicFaith(state, c)) missing.push(FB.T('Catholic faith'));
    if (c.sex !== 'm') missing.push(FB.T('a man'));
    if (hasLivingSpouse(state, c)) missing.push(FB.T('unmarried or widowed'));
    if (c.betrothedId) missing.push(FB.T('not betrothed'));
    if (!FB.isCatholicBishop(state, c)) missing.push(FB.T('a Bishop'));
    if (FB.ageOf(c, state.date.year) < req.age) {
      missing.push(FB.T('age {needed} (now {current})', {
        needed:req.age, current:FB.ageOf(c, state.date.year)
      }));
    }
    if (FB.skillOf(c, 'lea') < req.learning) {
      missing.push(FB.T('Learning {needed} (now {current})', {
        needed:req.learning, current:FB.skillOf(c, 'lea')
      }));
    }
    if (candidatePiety(state, c) < req.piety) {
      missing.push(FB.T('{needed} piety (now {current})', {
        needed:req.piety, current:Math.floor(candidatePiety(state, c))
      }));
    }
    if (candidatePrestige(state, c) < req.prestige) {
      missing.push(FB.T('{needed} prestige (now {current})', {
        needed:req.prestige, current:Math.floor(candidatePrestige(state, c))
      }));
    }
    var opinion = papalOpinionOfCandidate(state, c, obedience);
    if (opinion < req.papalOpinion) {
      missing.push(FB.T('Standing with the Pope +{needed} (now {current})', {
        needed:req.papalOpinion, current:Math.round(opinion)
      }));
    }
    if (state.player.gold < req.petitionGold) {
      missing.push(FB.T('{money:needed} for the petition (now {money:current})', {
        needed:req.petitionGold, current:Math.floor(state.player.gold)
      }));
    }
    var cooldown = c.cardinalPetitionRefusedTurn;
    var days = cooldown === undefined ? 0 :
      Math.max(0, (req.refusalCooldownDays || 720) - (state.turn - cooldown));
    if (days) missing.push(FB.T('the two-year refusal cooldown ({days} days remain)', {
      days:days
    }));
    if (!obedience || !obedience.claimantId) missing.push(FB.T('a living Pope'));
    if (obedience && obedience.college.length >= (definition().hardCap || 18)) {
      missing.push(FB.T('a place below the College cap'));
    }
    if (FB.isCardinal(state, c) || FB.isPapalClaimant(state, c)) {
      missing.push(FB.T('not already a Cardinal or Pope'));
    }
    return {
      visible:catholicFaith(state, c) && FB.isCatholicBishop(state, c) &&
        !FB.isCardinal(state, c) && !FB.isPapalClaimant(state, c),
      ready:missing.length === 0,
      missing:missing,
      cost:req.petitionGold || 25,
      opinion:opinion,
      obedienceId:obedience && obedience.id || null
    };
  };

  FB.petitionForCardinal = function (state, value) {
    var c = typeof value === 'string' ? state.chars[value] : value;
    var status = FB.cardinalPetitionStatus(state, c);
    if (!c || !status.ready) return false;
    state.player.gold -= status.cost;
    var chance = FB.clamp(0.55 + (status.opinion - 25) / 160 +
      FB.skillOf(c, 'dip') / 100, 0.35, 0.92);
    if (!FB.chance(chance)) {
      c.cardinalPetitionRefusedTurn = state.turn;
      FB.news(state, FB.msg('news.papacy.cardinal_refused',
        '⛪ Rome refuses the petition for {name}; another suit may be made in two years.',
        { name:FB.fullName(c) }));
      return { accepted:false };
    }
    delete c.cardinalPetitionRefusedTurn;
    var record = FB.appointCardinal(state, c, status.obedienceId,
      state.papacy.obediences[status.obedienceId].claimantId);
    return record ? { accepted:true, record:record } : false;
  };

  FB.papacyPietyYield = function (state, c, fallback) {
    var record = papalRecord(state, c && c.id);
    if (record && (record.office === 'cardinal' || record.office === 'pope')) {
      return definition().balance.cardinalPietyYield || 3.5;
    }
    return fallback || 0;
  };

  function candidateEligibleForAppointment(state, c, obedience) {
    var req = definition().cardinalRequirements || {};
    return !!(c && !c.dead &&
      !(FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(state, c.id)) &&
      catholicFaith(state, c) && c.sex === 'm' &&
      !hasLivingSpouse(state, c) && !c.betrothedId &&
      FB.isCatholicBishop(state, c) &&
      FB.ageOf(c, state.date.year) >= req.age &&
      FB.skillOf(c, 'lea') >= req.learning &&
      candidatePiety(state, c) >= req.piety &&
      candidatePrestige(state, c) >= req.prestige &&
      papalOpinionOfCandidate(state, c, obedience) >= req.papalOpinion &&
      !FB.isCardinal(state, c) && !FB.isPapalClaimant(state, c));
  }

  FB.papalAppointmentCandidates = function (state, obedienceId, generate) {
    var papacy = FB.ensurePapacy(state);
    var obedience = papacy && papacy.obediences[
      obedienceId || papacy.romanObedience
    ];
    var out = [];
    if (!obedience) return out;
    for (var charId in state.chars) {
      var c = state.chars[charId];
      if (candidateEligibleForAppointment(state, c, obedience)) out.push(c);
    }
    if (generate && out.length < 4) {
      var needed = 4 - out.length;
      for (var i = 0; i < needed; i++) {
        var generated = starterCardinalCharacter(state,
          obedience.college.length + i);
        generated.role = 'notable';
        generated.curialOpinion = FB.ri(30, 70);
        out.push(generated);
      }
    }
    out.sort(function (a, b) {
      return (FB.skillOf(b, 'lea') - FB.skillOf(a, 'lea')) ||
        (papalOpinionOfCandidate(state, b, obedience) -
          papalOpinionOfCandidate(state, a, obedience)) ||
        (a.id < b.id ? -1 : 1);
    });
    return out;
  };

  FB.holdConsistory = function (state, obedienceId, choices) {
    var papacy = FB.ensurePapacy(state);
    var obedience = papacy && papacy.obediences[
      obedienceId || papacy.romanObedience
    ];
    if (!obedience || !obedience.claimantId ||
        obedience.college.length >= (definition().targetCollege || 12) ||
        obedience.lastConsistoryYear === state.date.year) return [];
    var maximum = Math.min(definition().annualAppointments || 2,
      (definition().targetCollege || 12) - obedience.college.length);
    var candidates = FB.papalAppointmentCandidates(state, obedience.id, true);
    var selected = [];
    var automatic = !Array.isArray(choices);
    choices = Array.isArray(choices) ? choices : [];
    for (var i = 0; i < choices.length && selected.length < maximum; i++) {
      for (var j = 0; j < candidates.length; j++) {
        if (candidates[j].id === choices[i] &&
            selected.indexOf(candidates[j]) < 0) selected.push(candidates[j]);
      }
    }
    while (automatic && selected.length < maximum && candidates.length) {
      var pick = candidates.shift();
      if (selected.indexOf(pick) < 0) selected.push(pick);
    }
    var appointed = [];
    for (i = 0; i < selected.length; i++) {
      var record = FB.appointCardinal(state, selected[i], obedience.id,
        obedience.claimantId);
      if (record) appointed.push(record);
    }
    obedience.lastConsistoryYear = state.date.year;
    return appointed;
  };

  function collegeCharacters(state, obedience) {
    var out = [];
    for (var i = 0; i < obedience.college.length; i++) {
      var c = state.chars[obedience.college[i]];
      var record = papalRecord(state, obedience.college[i]);
      if (c && !c.dead && record && record.office === 'cardinal' &&
          record.obedienceId === obedience.id) out.push(c);
    }
    return out;
  }

  function installCollegeOffices(state, obedience) {
    if (state.date.year < 1150) {
      obedience.deanId = null;
      obedience.camerlengoId = null;
      return;
    }
    var college = collegeCharacters(state, obedience);
    college.sort(function (a, b) {
      var ra = papalRecord(state, a.id), rb = papalRecord(state, b.id);
      return (ra.appointedTurn || 0) - (rb.appointedTurn || 0);
    });
    obedience.deanId = college.length ? college[0].id : null;
    college.sort(function (a, b) {
      return FB.skillOf(b, 'ste') - FB.skillOf(a, 'ste');
    });
    obedience.camerlengoId = college.length ? college[0].id : null;
  }

  function camerlengoRule(state, obedience) {
    if (!obedience.roman) return;
    var rid = romanRealmId(state);
    var realm = rid && state.realms[rid];
    var c = obedience.camerlengoId && state.chars[obedience.camerlengoId];
    if (!realm || !c) return;
    var generation = realm.ruler && realm.ruler.generation || 1;
    realm.ruler = {
      name:c.name,
      sex:c.sex,
      culture:c.culture,
      born:c.born,
      age:FB.ageOf(c, state.date.year),
      mar:FB.skillSnapshot
        ? FB.skillSnapshot(state, c, 'mar') : FB.skillOf(c, 'mar'),
      trait:c.traits && c.traits[0] || null,
      generation:generation,
      interregnum:true
    };
  }

  function electionCandidateIds(state, election, obedience) {
    var ids = [];
    for (var i = 0; i < obedience.college.length; i++) {
      var id = obedience.college[i];
      var c = state.chars[id];
      var record = papalRecord(state, id);
      if (!c || c.dead || !record || record.office !== 'cardinal' ||
          (FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(state, c.id)) ||
          election.withdrawn[id]) continue;
      if (election.law.shortlist === 'bishops' && election.round <= 1 &&
          record.order !== 'bishop') continue;
      ids.push(id);
    }
    if (!ids.length && election.law.shortlist === 'bishops') {
      for (i = 0; i < obedience.college.length; i++) {
        id = obedience.college[i];
        c = state.chars[id];
        record = papalRecord(state, id);
        if (c && !c.dead &&
            !(FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(state, c.id)) &&
            record && record.office === 'cardinal' &&
            !election.withdrawn[id]) ids.push(id);
      }
    }
    if (election.compromiseId && state.chars[election.compromiseId] &&
        !state.chars[election.compromiseId].dead &&
        !(FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(state,
          election.compromiseId))) ids.push(election.compromiseId);
    return ids;
  }

  FB.startPapalElection = function (state, obedienceId, cause) {
    var papacy = FB.ensurePapacy(state);
    var obedience = papacy && papacy.obediences[
      obedienceId || papacy.romanObedience
    ];
    if (!obedience || papacy.elections[obedience.id] &&
        papacy.elections[obedience.id].phase !== 'resolved') return false;
    installCollegeOffices(state, obedience);
    var law = FB.papalElectionLaw(state);
    var election = {
      id:'papal_election_' + obedience.id + '_' + state.turn,
      obedienceId:obedience.id,
      phase:'vacancy',
      cause:cause || 'death',
      vacancyTurn:state.turn,
      waitUntil:state.turn + (law.vacancyDays || 0),
      law:copyObject(law),
      round:0,
      ballots:[],
      lastVotes:{},
      lastCounts:{},
      lean:{},
      promises:[],
      backing:{},
      withdrawn:{},
      roundEffects:{},
      compromiseId:null,
      winnerId:null,
      createdYear:state.date.year
    };
    papacy.elections[obedience.id] = election;
    obedience.claimantId = null;
    camerlengoRule(state, obedience);
    if (obedience.roman) {
      FB.news(state, FB.msg('news.papacy.vacancy',
        '🕯 The Apostolic See is vacant. The Camerlengo keeps the Papal States while the Cardinals gather.',
        {}));
    } else {
      FB.news(state, FB.msg('news.papacy.rival_vacancy',
        '🕯 The claimant of a rival obedience is dead; its Cardinals gather to choose a successor.',
        {}));
    }
    return election;
  };

  function relationshipScore(state, elector, candidate) {
    if (elector.id === state.player.charId) {
      return FB.standingOf(state, { kind:'character', id:candidate.id });
    }
    if (candidate.id === state.player.charId) {
      return FB.standingOf(state, { kind:'character', id:elector.id });
    }
    var papacy = state.papacy;
    var key = elector.id < candidate.id
      ? elector.id + ':' + candidate.id : candidate.id + ':' + elector.id;
    if (papacy.relationships[key] === undefined) {
      var sameCulture = elector.culture === candidate.culture ? 8 : 0;
      var sameBloc = papalRecord(state, elector.id).bloc ===
        (papalRecord(state, candidate.id) || {}).bloc ? 8 : 0;
      papacy.relationships[key] = FB.ri(-20, 25) + sameCulture + sameBloc;
    }
    return papacy.relationships[key];
  }

  function candidateScore(state, election, elector, candidate, uncertain) {
    var electorRecord = papalRecord(state, elector.id);
    var candidateRecord = papalRecord(state, candidate.id);
    var score = relationshipScore(state, elector, candidate) * 0.65;
    score += FB.skillOf(candidate, 'lea') * 1.8;
    score += FB.skillOf(candidate, 'dip') * 1.1;
    score += candidatePiety(state, candidate) / 100;
    score += candidatePrestige(state, candidate) / 200;
    if (elector.culture === candidate.culture) score += 6;
    if (electorRecord && candidateRecord &&
        electorRecord.bloc === candidateRecord.bloc) score += 12;
    if (candidate.traits) {
      if (candidate.traits.indexOf('zealous') >= 0 &&
          electorRecord && electorRecord.bloc === 'reform') score += 6;
      if (candidate.traits.indexOf('ambitious') >= 0) score += 2;
      if (candidate.traits.indexOf('cruel') >= 0) score -= 4;
    }
    var promises = election.promises || [];
    for (var i = 0; i < promises.length; i++) {
      if (promises[i].fromId === candidate.id &&
          promises[i].toId === elector.id) score += 20;
    }
    score += Number(election.backing[candidate.id]) || 0;
    var endorsement = election.endorsements &&
      election.endorsements[candidate.id];
    if (endorsement) score -= 1000;

    var effects = election.roundEffects || {};
    if (candidate.id === state.player.charId) {
      if (effects.negotiateId === elector.id) score += 24;
      if (effects.doctrine && electorRecord &&
          candidateRecord && electorRecord.bloc === candidateRecord.bloc) score += 14;
    }
    if (election.endorsements) {
      for (var fromId in election.endorsements) {
        if (election.endorsements[fromId] === candidate.id) {
          var from = state.chars[fromId];
          if (from) score += Math.max(4,
            10 + relationshipScore(state, elector, from) * 0.15);
        }
      }
    }
    if (election.round > 6) {
      var leader = election.lastLeaderId;
      if (leader === candidate.id) score += (election.round - 6) * 2;
      if (candidate.id === election.compromiseId) score += (election.round - 5) * 5;
    }
    if (uncertain) score += FB.rf(-7, 7);
    return score;
  }

  FB.papalElectionLeans = function (state, obedienceId) {
    var papacy = FB.ensurePapacy(state);
    var election = papacy && papacy.elections[
      obedienceId || papacy.romanObedience
    ];
    var obedience = election && papacy.obediences[election.obedienceId];
    var out = [];
    if (!election || !obedience ||
        (election.phase !== 'vacancy' && election.phase !== 'balloting')) return out;
    var candidates = electionCandidateIds(state, election, obedience);
    var electors = collegeCharacters(state, obedience);
    for (var i = 0; i < electors.length; i++) {
      var best = null, bestScore = -Infinity;
      for (var j = 0; j < candidates.length; j++) {
        var score = candidateScore(state, election, electors[i],
          state.chars[candidates[j]], false);
        if (score > bestScore) {
          best = candidates[j];
          bestScore = score;
        }
      }
      out.push({
        electorId:electors[i].id,
        candidateId:best,
        score:Math.round(bestScore),
        opinion:best && state.chars[best]
          ? Math.round(relationshipScore(state, electors[i], state.chars[best])) : 0
      });
    }
    return out;
  };

  function makeCompromiseCandidate(state, election, obedience) {
    if (election.compromiseId) return state.chars[election.compromiseId] || null;
    var c = starterCardinalCharacter(state, obedience.college.length + 7);
    c.role = 'notable';
    c.station = 3;
    c.homeProvinceId = obedience.strongestPatron &&
      state.realms[obedience.strongestPatron]
      ? state.realms[obedience.strongestPatron].capital : 'roma';
    c.compromiseCandidate = true;
    c.curialOpinion = 35;
    election.compromiseId = c.id;
    return c;
  }

  function outsideAssent(state, election, winner) {
    if (!election.law.outsideAssent) return {
      clergy:true, people:true, imperial:true, count:3
    };
    var obedience = state.papacy.obediences[election.obedienceId];
    var base = obedience.authority / 160 + FB.skillOf(winner, 'dip') / 80;
    var assent = {
      clergy:FB.chance(FB.clamp(base + FB.skillOf(winner, 'lea') / 100, 0.2, 0.9)),
      people:FB.chance(FB.clamp(base + FB.standingOf(state, {
        kind:'character', id:winner.id
      }) / 200, 0.2, 0.9)),
      imperial:FB.chance(FB.clamp(base +
        (election.backing[winner.id] || 0) / 40, 0.15, 0.9))
    };
    assent.count = (assent.clergy ? 1 : 0) + (assent.people ? 1 : 0) +
      (assent.imperial ? 1 : 0);
    return assent;
  }

  function voteThreshold(law, electors) {
    if (law.threshold === 'twoThirds') return Math.ceil(electors * 2 / 3);
    return Math.floor(electors / 2) + 1;
  }

  function leadingCounts(counts) {
    var rows = [];
    for (var id in counts) rows.push({ id:id, votes:counts[id] });
    rows.sort(function (a, b) {
      return b.votes - a.votes || (a.id < b.id ? -1 : 1);
    });
    return rows;
  }

  function numeral(value) {
    var table = [
      [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'],
      [4, 'IV'], [1, 'I']
    ];
    var n = Math.max(1, Math.floor(value || 1)), out = '';
    for (var i = 0; i < table.length; i++) {
      while (n >= table[i][0]) {
        out += table[i][1];
        n -= table[i][0];
      }
    }
    return out;
  }

  FB.papalRegnalChoices = function (state, charId) {
    var papacy = FB.ensurePapacy(state);
    var c = state.chars[charId];
    if (!c) return [];
    var names = definition().regnalNames || [];
    var ranked = names.slice().sort(function (a, b) {
      return (papacy.regnalNameCounts[b] || 0) -
        (papacy.regnalNameCounts[a] || 0) || (a < b ? -1 : 1);
    });
    var choices = [], seen = {};
    function add(name, retained) {
      if (!name || seen[name]) return;
      seen[name] = 1;
      var next = (papacy.regnalNameCounts[name] || 0) + 1;
      choices.push({
        name:name,
        retained:!!retained,
        numeral:next > 1 ? numeral(next) : '',
        display:name + (next > 1 ? ' ' + numeral(next) : '')
      });
    }
    add(c.name, true);
    for (var i = 0; i < ranked.length && choices.length < 7; i++) add(ranked[i], false);
    return choices;
  };

  function syncPapalRealmRuler(state, obedience, c) {
    if (!obedience.roman) return;
    var rid = romanRealmId(state);
    var realm = rid && state.realms[rid];
    if (!realm || !c) return;
    var generation = (realm.ruler && realm.ruler.generation || 0) + 1;
    var rootId = 'papal_' + rid + '_' + c.id + '_' + state.turn;
    var root = {
      id:rootId,
      name:c.name,
      sex:c.sex,
      born:c.born,
      alive:true,
      parentId:null,
      childIds:[],
      charId:c.id
    };
    realm.ruler = {
      name:c.papalName || c.name,
      sex:c.sex,
      culture:c.culture,
      born:c.born,
      age:FB.ageOf(c, state.date.year),
      mar:FB.skillSnapshot
        ? FB.skillSnapshot(state, c, 'mar') : FB.skillOf(c, 'mar'),
      trait:c.traits && c.traits[0] || null,
      generation:generation,
      papal:true
    };
    realm.succession = {
      rulerGeneration:generation,
      rulerMemberId:rootId,
      members:{},
      order:[],
      heirId:null,
      papalElective:true
    };
    realm.succession.members[rootId] = root;
    realm.religion = 'catholic';
    /* This replaces the realm's succession wholesale, so the derived
       reigning-ruler index has to be told: a missing entry for a sitting Pope
       would read as "does not reign" everywhere that asks. */
    if (FB.rebuildRulerIndex) FB.rebuildRulerIndex(state);
    c.papalRealmId = rid;
    c.homeProvinceId = 'roma';
    if (!c.royalLine || c.royalLine.realmId === rid) {
      c.royalLine = { realmId:rid, memberId:rootId };
    }
  }

  /* Early eager-court builds could seed a secular household before the Papacy
     migration installed its elective marker. Preserve the ordinary records,
     but remove the invented family links and royal-line roles. A player who
     encountered one of these people therefore keeps the person, while the
     Pope and Papal States immediately recover their intended structure. */
  function retireDynasticPapalCourt(state, rid, claimant) {
    var realm = state.realms[rid];
    var succession = realm && realm.succession;
    if (!succession || succession.papalElective || !succession.members) return;
    var changed = false;
    for (var memberId in succession.members) {
      var member = succession.members[memberId];
      var c = member && member.charId && state.chars[member.charId];
      if (!c || c.id === claimant.id) continue;
      if (claimant.spouseId === c.id) {
        claimant.spouseId = null;
        changed = true;
      }
      if (c.spouseId === claimant.id) {
        c.spouseId = null;
        changed = true;
      }
      if (claimant.betrothedId === c.id) {
        claimant.betrothedId = null;
        changed = true;
      }
      if (c.betrothedId === claimant.id) {
        c.betrothedId = null;
        changed = true;
      }
      if (c.fatherId === claimant.id) {
        c.fatherId = null;
        changed = true;
      }
      if (c.motherId === claimant.id) {
        c.motherId = null;
        changed = true;
      }
      if (c.royalLine && c.royalLine.realmId === rid &&
          c.royalLine.memberId === memberId) {
        delete c.royalLine;
        changed = true;
      }
      if (claimant.childrenIds) {
        var at = claimant.childrenIds.indexOf(c.id);
        if (at >= 0) {
          claimant.childrenIds.splice(at, 1);
          changed = true;
        }
      }
    }
    if (changed && FB.touchFamily) FB.touchFamily();
  }

  function enterPlayerPapalOffice(state, obedience) {
    var p = state.player;
    var me = playerChar(state);
    if (!me || p.papalOffice) return;
    var heirs = FB.heirsOf ? FB.heirsOf(state) : [];
    var lawful = heirs.length ? heirs[0] : null;
    var custody = {
      charId:me.id,
      successorId:lawful && lawful.id || null,
      formerTier:p.tier,
      formerProvinceId:p.provinceId,
      enterprises:(p.enterprises || []).slice(),
      enterpriseLabor:(p.enterpriseLabor || []).slice(),
      holdings:(p.holdings || []).slice(),
      manor:p.manor || null,
      landPlots:(p.landPlots || []).slice(),
      obedienceId:obedience.id,
      enteredTurn:state.turn
    };
    if (p.tier >= 4 && state.realms.player && state.realms.player.alive &&
        lawful && FB.abdicatePlayerRealmToHeir) {
      var handed = FB.abdicatePlayerRealmToHeir(state, lawful);
      custody.secularRealmId = handed && handed.id || null;
      if (!handed && FB.loseAllLand) {
        FB.loseAllLand(state, { papalTransition:true });
        custody.secularEscheat = true;
      }
    } else if (p.tier >= 4 && FB.loseAllLand) {
      FB.loseAllLand(state, { papalTransition:true });
      custody.secularEscheat = true;
    } else if (p.tier >= 3 && FB.breakAlliance) {
      FB.breakAlliance(state, 'player');
    }
    p.provs = [];
    p.enterprises = [];
    p.enterpriseLabor = [];
    p.holdings = [];
    p.landPlots = [];
    p.manor = null;
    FB.changePlayerLiege(state, null, 'papacy:abdication');
    if (FB.setPlayerTier) FB.setPlayerTier(state, 2, { attachLiege:false });
    else p.tier = 2;
    p.provinceId = obedience.roman ? 'roma' :
      (obedience.strongestPatron && state.realms[obedience.strongestPatron]
        ? state.realms[obedience.strongestPatron].capital : p.provinceId);
    p.papalOffice = {
      obedienceId:obedience.id,
      enteredTurn:state.turn,
      successorId:custody.successorId
    };
    p.flags.cardinal = 1;
    p.flags.pope = 1;
    state.papacy.custody[me.id] = custody;
    if (FB.invalidateRealmCache) FB.invalidateRealmCache();
  }

  function installPope(state, election, charId, name) {
    var papacy = FB.ensurePapacy(state);
    var obedience = papacy.obediences[election.obedienceId];
    var c = state.chars[charId];
    if (!obedience || !c || c.dead) return false;
    if (FB.releaseBishopric) {
      FB.releaseBishopric(state, c, { papalTransition:true });
    }
    var chosen = name || c.name;
    var count = (papacy.regnalNameCounts[chosen] || 0) + 1;
    papacy.regnalNameCounts[chosen] = count;
    c.papalName = chosen + (count > 1 ? ' ' + numeral(count) : '');
    c.papalOffice = 'pope';
    c.station = Math.max(4, FB.stationOf(c));

    var record = papacy.cardinals[c.id] || {
      charId:c.id,
      order:'bishop',
      titleChurch:'Ostia',
      bloc:cardinalBloc(c),
      obedienceId:obedience.id
    };
    record.office = 'pope';
    record.obedienceId = obedience.id;
    record.electedTurn = state.turn;
    record.electedYear = state.date.year;
    papacy.cardinals[c.id] = record;
    var at = obedience.college.indexOf(c.id);
    if (at >= 0) obedience.college.splice(at, 1);
    obedience.claimantId = c.id;
    obedience.pontificateAppointments = {};
    obedience.lastConsistoryYear = null;
    obedience.promises = obedience.promises.concat(election.promises || []);
    for (var i = 0; i < election.promises.length; i++) {
      FB.adjustPapalAuthority(state, obedience.id,
        -(definition().balance.beneficeAuthorityCost || 2), 'benefice promise');
    }
    if (election.assent && election.assent.count < 3) {
      FB.adjustPapalAuthority(state, obedience.id,
        election.assent.count >= 2 ? -2 : -8, 'outside assent');
    }
    election.phase = 'resolved';
    election.winnerId = c.id;
    election.resolvedTurn = state.turn;
    syncPapalRealmRuler(state, obedience, c);
    if (!obedience.roman) {
      var patron = obedience.strongestPatron;
      c.homeProvinceId = patron && state.realms[patron]
        ? state.realms[patron].capital : c.homeProvinceId || 'roma';
    }
    if (c.id === state.player.charId) enterPlayerPapalOffice(state, obedience);
    FB.news(state, FB.msg('news.papacy.elected',
      '🔔 Habemus Papam: {name} is elected by the Cardinals.', {
        name:FB.papalDisplayName(state, c)
      }));
    return c;
  }

  FB.choosePapalName = function (state, obedienceId, name) {
    var papacy = FB.ensurePapacy(state);
    var election = papacy && papacy.elections[
      obedienceId || papacy.romanObedience
    ];
    if (!election || election.phase !== 'name' ||
        election.winnerId !== state.player.charId) return false;
    var choices = FB.papalRegnalChoices(state, election.winnerId);
    var valid = false;
    for (var i = 0; i < choices.length; i++) {
      if (choices[i].name === name) valid = true;
    }
    if (!valid) return false;
    return installPope(state, election, election.winnerId, name);
  };

  function applyElectionTactic(state, election, tacticId, targetId) {
    var tactic = null;
    var tactics = definition().tactics || [];
    for (var i = 0; i < tactics.length; i++) {
      if (tactics[i].id === tacticId) tactic = tactics[i];
    }
    if (!tactic || tactic.closedFrom && state.date.year >= tactic.closedFrom) return false;
    var playerId = state.player.charId;
    if (!FB.isCardinal(state, playerId)) return false;
    election.roundEffects = {};
    if (tacticId === 'negotiate') {
      if (!targetId || targetId === playerId) return false;
      election.roundEffects.negotiateId = targetId;
    } else if (tacticId === 'doctrine') {
      election.roundEffects.doctrine = true;
    } else if (tacticId === 'benefice') {
      if (!targetId || targetId === playerId) return false;
      var promise = {
        id:'benefice_' + election.id + '_' + election.round + '_' + targetId,
        fromId:playerId,
        toId:targetId,
        madeTurn:state.turn,
        fulfilled:false
      };
      election.promises.push(promise);
      election.roundEffects.beneficeId = targetId;
    } else if (tacticId === 'backing') {
      if (election.law.enclosed || state.player.prestige < 100) return false;
      state.player.prestige -= 100;
      election.backing[playerId] = (election.backing[playerId] || 0) + 18;
    } else if (tacticId === 'withdraw') {
      if (!targetId || targetId === playerId) return false;
      election.withdrawn[playerId] = true;
      election.endorsements = election.endorsements || {};
      election.endorsements[playerId] = targetId;
    }
    election.lastPlayerTactic = {
      id:tacticId, targetId:targetId || null, round:election.round + 1
    };
    return true;
  }

  function papalElectionBallot(state, papacy, obedienceId, tacticId, targetId) {
    var election = papacy && papacy.elections[
      obedienceId || papacy.romanObedience
    ];
    var obedience = election && papacy.obediences[election.obedienceId];
    if (!election || !obedience ||
        (election.phase !== 'vacancy' && election.phase !== 'balloting') ||
        state.turn < election.waitUntil) return false;
    if (tacticId && !applyElectionTactic(state, election, tacticId, targetId)) {
      return false;
    }
    election.phase = 'balloting';
    election.round++;
    if (election.round > (definition().balance.compromiseAfterBallots || 6) &&
        state.date.year >= 1059) {
      makeCompromiseCandidate(state, election, obedience);
    }
    var electors = collegeCharacters(state, obedience);
    var candidateIds = electionCandidateIds(state, election, obedience);
    if (!electors.length || !candidateIds.length) return false;
    var counts = {}, votes = [];
    for (var i = 0; i < candidateIds.length; i++) counts[candidateIds[i]] = 0;
    for (i = 0; i < electors.length; i++) {
      var bestId = null, bestScore = -Infinity;
      for (var j = 0; j < candidateIds.length; j++) {
        var candidate = state.chars[candidateIds[j]];
        var score = candidateScore(state, election, electors[i], candidate, true);
        if (score > bestScore) {
          bestId = candidate.id;
          bestScore = score;
        }
      }
      counts[bestId] = (counts[bestId] || 0) + 1;
      votes.push({
        electorId:electors[i].id,
        candidateId:bestId,
        score:Math.round(bestScore),
        opinion:Math.round(relationshipScore(state, electors[i],
          state.chars[bestId]))
      });
    }
    var leaders = leadingCounts(counts);
    var leader = leaders[0];
    election.lastVotes = {};
    for (i = 0; i < votes.length; i++) {
      election.lastVotes[votes[i].electorId] = votes[i].candidateId;
    }
    election.lastCounts = counts;
    election.lastLeaderId = leader && leader.id || null;
    var threshold = voteThreshold(election.law, electors.length);
    var ballot = {
      round:election.round,
      turn:state.turn,
      votes:votes,
      counts:copyObject(counts),
      threshold:threshold,
      winnerId:null,
      assent:null
    };
    election.ballots.push(ballot);
    election.roundEffects = {};

    var winner = leader && leader.votes >= threshold
      ? state.chars[leader.id] : null;
    if (winner && election.law.outsideAssent) {
      var assent = outsideAssent(state, election, winner);
      ballot.assent = assent;
      election.assent = assent;
      if (assent.count < 2) winner = null;
    }
    if (!winner && maybePapalSchism(state, papacy,
        election.obedienceId)) {
      return ballot;
    }
    if (!winner && election.round >= (definition().balance.forceAfterBallots || 12) &&
        !papacyInSchism(papacy)) {
      winner = state.chars[election.compromiseId || leader.id];
      ballot.forced = true;
    }
    if (winner) {
      ballot.winnerId = winner.id;
      election.winnerId = winner.id;
      if (winner.id === state.player.charId) {
        election.phase = 'name';
      } else {
        var names = FB.papalRegnalChoices(state, winner.id);
        var chosen = names.length ? names[FB.ri(0, Math.min(names.length - 1, 4))].name
          : winner.name;
        installPope(state, election, winner.id, chosen);
      }
    }
    return ballot;
  }

  FB.papalElectionBallot = function (state, obedienceId, tacticId, targetId) {
    return papalElectionBallot(state, FB.ensurePapacy(state),
      obedienceId, tacticId, targetId);
  };

  /* ---------- investiture ---------- */

  function ensureInvestitureRecord(state, sovereign) {
    var papacy = FB.ensurePapacy(state);
    if (!papacy || !sovereign) return null;
    var record = papacy.investiture[sovereign];
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      record = {
        sovereign:sovereign,
        policy:sovereign === romanRealmId(state) ? 'canonical' : 'lay',
        setTurn:state.turn,
        demandedTurn:null,
        demandObedience:null,
        refusedTurn:null
      };
      papacy.investiture[sovereign] = record;
    }
    if (!definition().investiture.policies[record.policy]) record.policy = 'lay';
    return record;
  }

  function investitureRecordSnapshot(state, sovereign) {
    if (!state || !sovereign) return null;
    var papacy = state.papacy;
    var records = papacy && papacy.investiture;
    var record = records && records[sovereign];
    if (record && typeof record === 'object' && !Array.isArray(record)) {
      if (definition().investiture.policies[record.policy]) return record;
      var repaired = copyObject(record);
      repaired.policy = 'lay';
      return repaired;
    }
    var roman = FB.religiousHeadSnapshot &&
      FB.religiousHeadSnapshot(state, 'catholic');
    return {
      sovereign:sovereign,
      policy:roman && roman.id === sovereign ? 'canonical' : 'lay',
      setTurn:state.turn,
      demandedTurn:null,
      demandObedience:null,
      refusedTurn:null
    };
  }

  FB.investiturePolicyForRealm = function (state, rid) {
    var sovereign = realmSovereign(state, rid);
    if (!sovereign || !catholicReligion(state,
        realmReligion(state, sovereign))) return null;
    return investitureRecordSnapshot(state, sovereign);
  };

  FB.investiturePolicyForPlayer = function (state) {
    return FB.investiturePolicyForRealm(state, FB.playerRealmId(state));
  };

  FB.papacyInvestitureTaxRate = function (state) {
    var me = playerChar(state);
    if (!me || !catholicFaith(state, me) || FB.playerPope(state)) return 0;
    var record = FB.investiturePolicyForPlayer(state);
    var policy = record && definition().investiture.policies[record.policy];
    return policy ? policy.tax || 0 : 0;
  };

  FB.papacyRealmStrengthMultiplier = function (state, rid) {
    var rate = 0;
    var religionId = realmReligion(state, rid);
    if (catholicReligion(state, religionId)) {
      var investiture = FB.investiturePolicyForRealm(state, rid);
      var policy = investiture &&
        definition().investiture.policies[investiture.policy];
      rate += policy ? policy.strength || 0 : 0;
    }
    var target = rid === 'player' ? playerChar(state) :
      FB.realmRulerCharacter && FB.realmRulerCharacter(state, rid);
    if (target && FB.excommunicationOf(state, target.id,
        FB.papalObedienceForRealm(state, rid))) {
      rate += definition().excommunication.realmStrength || -0.10;
    }
    return Math.max(0.5, 1 + rate);
  };

  FB.papacyInvestiturePiety = function (state) {
    var me = playerChar(state);
    if (!me || !catholicFaith(state, me) || FB.playerPope(state)) return 0;
    var record = FB.investiturePolicyForPlayer(state);
    var policy = record && definition().investiture.policies[record.policy];
    if (!policy) return 0;
    if (policy.piety < 0 && !(FB.isPlayerSovereign &&
        FB.isPlayerSovereign(state))) return 0;
    return policy.piety || 0;
  };

  FB.setInvestiturePolicy = function (state, policyId, rid, imposed) {
    var policies = definition().investiture.policies || {};
    var sovereign = realmSovereign(state, rid || 'player');
    var record = ensureInvestitureRecord(state, sovereign);
    if (!record || !policies[policyId]) return false;
    if (policyId === 'concordat' &&
        state.date.year < definition().investiture.concordatFrom) return false;
    var former = record.policy;
    record.policy = policyId;
    record.setTurn = state.turn;
    record.imposed = !!imposed;
    if (former !== policyId && imposed) {
      var obedienceId = record.demandObedience ||
        FB.papalObedienceForRealm(state, sovereign);
      FB.adjustPapalAuthority(state, obedienceId,
        definition().authority.acceptedInvestiture || 3,
        'accepted investiture');
    }
    return record;
  };

  function investitureDemandScore(state, obedience, targetRealm) {
    var pope = obedience.claimantId && state.chars[obedience.claimantId];
    var realm = targetRealm === 'player' ? state.realms.player :
      state.realms[targetRealm];
    var rank = realmRank(state, targetRealm);
    var strength = targetRealm === 'player'
      ? (FB.playerLevy ? FB.playerLevy(state) : 0)
      : (FB.realmStrength ? FB.realmStrength(state, targetRealm) : 0);
    var resistance = rank * 12 + Math.sqrt(Math.max(0, strength)) * 0.6;
    if (realm && realm.ruler && realm.ruler.trait === 'proud') resistance += 10;
    if (realm && realm.ruler && realm.ruler.trait === 'zealous') resistance -= 8;
    return obedience.authority + (pope ? FB.skillOf(pope, 'dip') * 2 +
      FB.skillOf(pope, 'lea') : 0) - resistance;
  }

  FB.papalInvestitureDemand = function (state, targetRealm, obedienceId) {
    var papacy = FB.ensurePapacy(state);
    var obedience = papacy && papacy.obediences[
      obedienceId || papacy.romanObedience
    ];
    var sovereign = realmSovereign(state, targetRealm);
    var record = ensureInvestitureRecord(state, sovereign);
    var gate = definition().authority.gates.investiture || 25;
    if (!obedience || !obedience.claimantId || obedience.authority < gate ||
        state.date.year < definition().investiture.reformFrom ||
        !record || record.policy !== 'lay' ||
        !catholicReligion(state, realmReligion(state, sovereign))) return false;
    record.demandedTurn = state.turn;
    record.demandObedience = obedience.id;
    if (sovereign === 'player') {
      papacy.pendingInvestitureDemand = {
        obedienceId:obedience.id,
        targetRealm:'player',
        madeTurn:state.turn
      };
      FB.news(state, FB.msg('news.papacy.investiture_demand_player',
        '📜 The Pope demands that your realm surrender lay investiture.', {}));
      return { pending:true };
    }
    var accepts = investitureDemandScore(state, obedience, sovereign) +
      FB.rf(-20, 20) >= 45;
    if (accepts) {
      FB.setInvestiturePolicy(state,
        state.date.year >= definition().investiture.concordatFrom &&
        FB.chance(0.35) ? 'concordat' : 'canonical', sovereign, true);
    } else {
      record.refusedTurn = state.turn;
      FB.adjustPapalAuthority(state, obedience.id,
        definition().authority.defiedCommand || -5, 'defied command');
      FB.addPapalGround(state, sovereign, 'investiture_refusal',
        obedience.id);
    }
    return { pending:false, accepted:accepts };
  };

  FB.answerInvestitureDemand = function (state, accept, policyId) {
    var papacy = FB.ensurePapacy(state);
    var pending = papacy && papacy.pendingInvestitureDemand;
    if (!pending || pending.targetRealm !== 'player') return false;
    var obedience = papacy.obediences[pending.obedienceId];
    delete papacy.pendingInvestitureDemand;
    if (accept) {
      var policy = policyId === 'concordat' &&
        state.date.year >= definition().investiture.concordatFrom
        ? 'concordat' : 'canonical';
      return FB.setInvestiturePolicy(state, policy, 'player', true);
    }
    var record = ensureInvestitureRecord(state, 'player');
    record.refusedTurn = state.turn;
    FB.adjustPapalAuthority(state, obedience.id,
      definition().authority.defiedCommand || -5, 'defied command');
    FB.addPapalGround(state, 'player', 'investiture_refusal', obedience.id);
    return { refused:true };
  };

  FB.petitionLiegeInvestiture = function (state, policyId) {
    if (!state.player.liege || !definition().investiture.policies[policyId]) return false;
    var sovereign = realmSovereign(state, state.player.liege);
    var chance = FB.clamp(0.25 + FB.skillOf(playerChar(state), 'dip') * 0.025 +
      FB.standingOf(state, {
        kind:'realm', id:state.player.liege
      }) / 180, 0.1, 0.85);
    if (!FB.chance(chance)) return { accepted:false };
    return { accepted:true, record:FB.setInvestiturePolicy(
      state, policyId, sovereign, false) };
  };

  /* ---------- excommunication and absolution ---------- */

  function rulerCharacter(state, rid, materialize) {
    if (rid === 'player') return playerChar(state);
    var c = FB.realmRulerCharacter && FB.realmRulerCharacter(state, rid);
    if (!c && materialize && FB.materializeRealmRuler) {
      c = FB.materializeRealmRuler(state, rid);
    }
    return c || null;
  }

  FB.addPapalGround = function (state, target, cause, obedienceId) {
    var papacy = FB.ensurePapacy(state);
    var charId = null, rid = null;
    if (typeof target === 'string' && state.realms[target]) {
      rid = realmSovereign(state, target);
      var ruler = rulerCharacter(state, rid, true);
      charId = ruler && ruler.id;
    } else if (typeof target === 'string' && state.chars[target]) {
      charId = target;
      rid = FB.realmIdForRulerCharacter &&
        FB.realmIdForRulerCharacter(state, target);
    } else if (target && target.id) {
      charId = target.id;
      rid = FB.realmIdForRulerCharacter &&
        FB.realmIdForRulerCharacter(state, target);
    }
    if (!charId || !cause) return false;
    papacy.grounds[charId] = papacy.grounds[charId] || [];
    var list = papacy.grounds[charId];
    for (var i = 0; i < list.length; i++) {
      if (list[i].cause === cause &&
          list[i].obedienceId === (obedienceId || papacy.romanObedience)) return list[i];
    }
    var record = {
      cause:cause,
      obedienceId:obedienceId || papacy.romanObedience,
      realmId:rid || null,
      madeTurn:state.turn,
      remedied:false
    };
    list.push(record);
    return record;
  };

  FB.excommunicationOf = function (state, charId, obedienceId) {
    var papacy = savedPapacy(state) || FB.ensurePapacy(state);
    if (!papacy || !charId) return null;
    if (obedienceId) {
      var exact = papacy.excommunications[obedienceId + ':' + charId];
      return exact && (exact.clearedTurn === null ||
        exact.clearedTurn === undefined) ? exact : null;
    }
    for (var key in papacy.excommunications) {
      var record = papacy.excommunications[key];
      if (record && record.targetId === charId &&
          (record.clearedTurn === null ||
            record.clearedTurn === undefined)) return record;
    }
    return null;
  };

  FB.playerExcommunicatedBy = function (state) {
    var me = playerChar(state);
    if (!me || !catholicFaith(state, me)) return null;
    var obedienceId = FB.papalObedienceForCharacter(state, me);
    return FB.excommunicationOf(state, me.id, obedienceId);
  };

  function syncPlayerExcommunicationTrait(state) {
    var me = playerChar(state);
    var papacy = state && state.papacy;
    if (!me || !papacy) return;
    var sovereign = realmSovereign(state, FB.playerRealmId(state));
    var obedienceId = papacy.realmObedience[sovereign] ||
      papacy.romanObedience;
    var sentence = papacy.excommunications[
      obedienceId + ':' + me.id
    ];
    var active = sentence && (sentence.clearedTurn === null ||
      sentence.clearedTurn === undefined);
    if (active) FB.addTrait(me, 'excommunicated');
    else FB.removeTrait(me, 'excommunicated');
  }

  function sanctionCause(state, charId, obedienceId) {
    var grounds = state.papacy.grounds[charId] || [];
    for (var i = 0; i < grounds.length; i++) {
      if (!grounds[i].remedied && grounds[i].obedienceId === obedienceId) {
        return grounds[i];
      }
    }
    return null;
  }

  function obediencePiety(state, obedience) {
    return obedience.claimantId === state.player.charId
      ? state.player.piety : obedience.piety || 0;
  }

  function spendObediencePiety(state, obedience, amount) {
    if (obedience.claimantId === state.player.charId) {
      state.player.piety = Math.max(0, state.player.piety - amount);
    } else {
      obedience.piety = Math.max(0, (obedience.piety || 0) - amount);
    }
  }

  FB.papalSanctionStatus = function (state, target, obedienceId, arbitrary) {
    var papacy = FB.ensurePapacy(state);
    var obedience = papacy && papacy.obediences[
      obedienceId || papacy.romanObedience
    ];
    var c = typeof target === 'string' && state.chars[target]
      ? state.chars[target]
      : typeof target === 'string' && state.realms[target]
        ? rulerCharacter(state, realmSovereign(state, target), true) : target;
    var conf = definition().excommunication;
    var cause = c && sanctionCause(state, c.id, obedience && obedience.id);
    var cost = arbitrary ? conf.arbitraryPiety : conf.justifiedPiety;
    var last = c && papacy.excommunications[
      (obedience && obedience.id) + ':' + c.id
    ];
    var cooldown = last && last.issuedTurn !== undefined
      ? Math.max(0, conf.cooldownDays - (state.turn - last.issuedTurn)) : 0;
    var reason = null;
    if (!obedience || !obedience.claimantId) reason = FB.T('This obedience has no living claimant.');
    else if (!c || c.dead || !catholicFaith(state, c)) reason = FB.T('The target is not a living Catholic ruler.');
    else if (c.id === obedience.claimantId) {
      reason = FB.T('A claimant cannot issue a sentence against himself.');
    }
    else if (FB.excommunicationOf(state, c.id, obedience.id)) {
      reason = FB.T('This obedience has already excommunicated the target.');
    }
    else if (arbitrary && obedience.authority <
        definition().authority.gates.arbitrarySanction) {
      reason = FB.T('Arbitrary sanctions require {authority} authority.', {
        authority:definition().authority.gates.arbitrarySanction
      });
    } else if (!arbitrary && !cause) {
      reason = FB.T('No recognized ground has been recorded.');
    } else if (obedience.authority < definition().authority.gates.sanctions) {
      reason = FB.T('Sanctions require {authority} authority.', {
        authority:definition().authority.gates.sanctions
      });
    } else if (obediencePiety(state, obedience) < cost) {
      reason = FB.T('The sentence requires {piety} piety.', { piety:cost });
    } else if (cooldown) {
      reason = FB.T('Another sentence may be issued in {days} days.', {
        days:cooldown
      });
    }
    return {
      ready:!reason,
      reason:reason,
      target:c,
      obedience:obedience,
      cause:cause,
      arbitrary:!!arbitrary,
      cost:cost,
      cooldown:cooldown
    };
  };

  FB.papalExcommunicate = function (state, target, obedienceId, arbitrary) {
    var status = FB.papalSanctionStatus(state, target, obedienceId, arbitrary);
    if (!status.ready) return false;
    var obedience = status.obedience, c = status.target;
    spendObediencePiety(state, obedience, status.cost);
    if (status.arbitrary) {
      FB.adjustPapalAuthority(state, obedience.id,
        definition().authority.arbitrarySanction || -12,
        'arbitrary excommunication');
    }
    var record = {
      targetId:c.id,
      targetRealmId:FB.realmIdForRulerCharacter &&
        FB.realmIdForRulerCharacter(state, c) ||
        (c.id === state.player.charId ? 'player' : null),
      obedienceId:obedience.id,
      cause:status.cause ? status.cause.cause : 'arbitrary',
      justified:!status.arbitrary,
      issuedTurn:state.turn,
      issuingClaimantId:obedience.claimantId,
      clearedTurn:null
    };
    state.papacy.excommunications[obedience.id + ':' + c.id] = record;
    FB.addTrait(c, 'excommunicated');
    if (c.id === state.player.charId) {
      FB.adjustPapalSupporterOpinions(state, obedience.id,
        definition().excommunication.catholicOpinion || -25);
    }
    if (status.arbitrary && obedience.claimantId === state.player.charId) {
      FB.adjustPapalSupporterOpinions(state, obedience.id,
        definition().excommunication.arbitraryCatholicOpinion || -20);
    }
    FB.news(state, FB.msg('news.papacy.excommunicated',
      '⛓ {target} is excommunicated by {pope}.', {
        target:FB.fullName(c),
        pope:FB.papalDisplayName(state, state.chars[obedience.claimantId])
      }));
    return record;
  };

  function absolutionRemedyMet(state, sentence) {
    if (!sentence) return false;
    if (sentence.cause === 'investiture_refusal') {
      var policy = sentence.targetRealmId &&
        FB.investiturePolicyForRealm(state, sentence.targetRealmId);
      return !!(policy && policy.policy !== 'lay');
    }
    if (sentence.cause === 'occupy_rome') {
      return state.owner && state.owner.roma !== sentence.targetRealmId;
    }
    if (sentence.cause === 'attack_pope') {
      if (sentence.targetId === state.player.charId) return !state.player.war;
      var realm = sentence.targetRealmId &&
        state.realms[sentence.targetRealmId];
      return !(realm && realm.war);
    }
    if (sentence.cause === 'reunification_defiance') {
      return !FB.isPapalClaimant(state, sentence.targetId);
    }
    /* an apostate's sentence is remedied only by returning to the fold
       (see applyConversion in js/actions.js) */
    if (sentence.cause === 'apostasy') {
      return !!catholicFaith(state, state.chars[sentence.targetId]);
    }
    return sentence.cause === 'arbitrary' || sentence.cause === 'penance';
  }

  FB.papalAbsolutionStatus = function (state, charId) {
    var c = state.chars[charId];
    var recognizesPapacy = catholicFaith(state, c);
    var obedienceId = recognizesPapacy &&
      FB.papalObedienceForCharacter(state, c);
    var sentence = recognizesPapacy &&
      FB.excommunicationOf(state, c.id, obedienceId);
    var realmId = c && (c.id === state.player.charId ? 'player' :
      FB.realmIdForRulerCharacter && FB.realmIdForRulerCharacter(state, c));
    var offering = 50 + Math.max(0, realmRank(state, realmId)) * 25;
    var atWar = realmId === 'player'
      ? !!state.player.war
      : !!(realmId && state.realms[realmId] &&
        state.realms[realmId].war);
    var reason = null;
    if (!recognizesPapacy) {
      reason = FB.T('This faith does not recognize Papal authority.');
    } else if (!sentence) reason = FB.T('No active sentence from the recognized obedience.');
    else if (atWar) reason = FB.T('The petitioner must first make peace.');
    else if (!absolutionRemedyMet(state, sentence)) {
      reason = FB.T('The recorded offense must be remedied, or a penance accepted.');
    } else if (c.id === state.player.charId && state.player.gold < offering) {
      reason = FB.T('Absolution requires an offering of {money:gold}.', {
        gold:offering
      });
    } else if (c.id === state.player.charId &&
        state.player.piety < definition().excommunication.justifiedPiety) {
      reason = FB.T('Absolution requires {piety} piety.', {
        piety:definition().excommunication.justifiedPiety
      });
    }
    return {
      ready:!reason,
      reason:reason,
      sentence:sentence,
      offering:offering,
      piety:definition().excommunication.justifiedPiety,
      obedienceId:obedienceId
    };
  };

  FB.papalAbsolve = function (state, charId) {
    var status = FB.papalAbsolutionStatus(state, charId);
    var c = state.chars[charId];
    if (!status.ready || !c) return false;
    if (c.id === state.player.charId) {
      state.player.gold -= status.offering;
      state.player.piety -= status.piety;
      FB.adjustPapalSupporterOpinions(state, status.obedienceId, 20);
    } else {
      var obedience = state.papacy.obediences[status.obedienceId];
      if (obedience && obedience.claimantId === state.player.charId) {
        state.player.gold += status.offering;
      }
    }
    status.sentence.clearedTurn = state.turn;
    var ground = sanctionCause(state, charId, status.obedienceId);
    if (ground) ground.remedied = true;
    if (status.sentence.justified) {
      FB.adjustPapalAuthority(state, status.obedienceId,
        definition().authority.obeyedSanction || 2,
        'obeyed justified sanction');
    }
    if (!FB.excommunicationOf(state, c.id)) {
      FB.removeTrait(c, 'excommunicated');
    }
    FB.news(state, FB.msg('news.papacy.absolution',
      '🕊 {pope} grants absolution to {target}; the sentence is lifted.', {
        pope:FB.papalDisplayName(state,
          FB.popeRecognizedBy(state, c)),
        target:FB.fullName(c)
      }));
    return true;
  };

  FB.papalRulerTargets = function (state) {
    var out = [], seen = {};
    for (var rid in state.realms) {
      var realm = state.realms[rid];
      if (!realm || !realm.alive || rid === 'player' ||
          !catholicReligion(state, realmReligion(state, rid))) continue;
      var c = rulerCharacter(state, rid, true);
      if (c && !seen[c.id]) {
        seen[c.id] = 1;
        out.push({ realmId:rid, realm:realm, c:c });
      }
    }
    var me = playerChar(state);
    if (me && catholicFaith(state, me) && !seen[me.id]) {
      out.push({ realmId:'player', realm:state.realms.player || null, c:me });
    }
    out.sort(function (a, b) {
      return (realmRank(state, b.realmId) - realmRank(state, a.realmId)) ||
        (a.realmId < b.realmId ? -1 : 1);
    });
    return out;
  };

  /* ---------- durable rival obediences and reunification ---------- */

  function topQuartilePatrons(state) {
    var realms = livingCatholicSovereigns(state);
    realms.sort(function (a, b) {
      var sa = a === 'player'
        ? (FB.playerLevy ? FB.playerLevy(state) : 0)
        : (FB.realmStrength ? FB.realmStrength(state, a) : 0);
      var sb = b === 'player'
        ? (FB.playerLevy ? FB.playerLevy(state) : 0)
        : (FB.realmStrength ? FB.realmStrength(state, b) : 0);
      return sb - sa || (a < b ? -1 : 1);
    });
    return realms.slice(0, Math.max(1, Math.ceil(realms.length / 4)));
  }

  function createRivalObedience(state, election, sponsor) {
    var papacy = FB.ensurePapacy(state);
    var original = papacy.obediences[election.obedienceId];
    var leaders = leadingCounts(election.lastCounts || {});
    if (!original || leaders.length < 2) return false;
    var winnerId = leaders[0].id;
    var rivalId = leaders[1].id;
    var newId = 'obedience_' + papacy.nextObedience++;
    var rival = makeObedience(state, newId,
      Math.min(30, Math.max(15, original.authority - 5)), null, false);
    papacy.obediences[newId] = rival;
    papacy.schismStartedTurn = state.turn;
    papacy.realmObedience[sponsor] = newId;

    var oldCollege = original.college.slice();
    for (var i = 0; i < oldCollege.length; i++) {
      var charId = oldCollege[i];
      if (election.lastVotes[charId] !== rivalId) continue;
      var at = original.college.indexOf(charId);
      if (at >= 0) original.college.splice(at, 1);
      rival.college.push(charId);
      var record = papalRecord(state, charId);
      if (record) record.obedienceId = newId;
    }
    if (rival.college.indexOf(rivalId) < 0) {
      var oldAt = original.college.indexOf(rivalId);
      if (oldAt >= 0) original.college.splice(oldAt, 1);
      rival.college.push(rivalId);
      if (papalRecord(state, rivalId)) papalRecord(state, rivalId).obedienceId = newId;
    }
    syncObedienceSupporters(state, papacy);
    var rivalElection = {
      id:'schism_election_' + newId + '_' + state.turn,
      obedienceId:newId,
      phase:'balloting',
      law:copyObject(election.law),
      round:election.round,
      ballots:[],
      lastCounts:{},
      lastVotes:{},
      promises:[],
      backing:{},
      withdrawn:{},
      roundEffects:{},
      winnerId:rivalId,
      assent:null
    };
    papacy.elections[newId] = rivalElection;
    var rivalNames = FB.papalRegnalChoices(state, rivalId);
    var rivalName = rivalNames.length ? rivalNames[FB.ri(0,
      Math.min(4, rivalNames.length - 1))].name : state.chars[rivalId].name;
    installPope(state, rivalElection, rivalId, rivalName);

    election.schismObedienceId = newId;
    election.schismSponsor = sponsor;
    if (winnerId === state.player.charId) {
      election.winnerId = winnerId;
      election.phase = 'name';
    } else {
      var choices = FB.papalRegnalChoices(state, winnerId);
      var chosen = choices.length ? choices[FB.ri(0,
        Math.min(4, choices.length - 1))].name : state.chars[winnerId].name;
      installPope(state, election, winnerId, chosen);
    }
    if (state.greatHolyWar && state.greatHolyWar.phase === 'preparation' &&
        FB.faithHasSystem(state.greatHolyWar.callingReligion, 'papacy', state)) {
      if (FB.cancelGreatHolyWar) FB.cancelGreatHolyWar(state, 'schism');
      else state.greatHolyWar = null;
    }
    FB.news(state, FB.msg('news.papacy.schism',
      '⚡ Christendom divides: {patron} recognizes a rival claimant, and two Colleges now claim the Church.',
      {
        patron:sponsor === 'player'
          ? FB.fullName(playerChar(state))
          : state.realms[sponsor] ? state.realms[sponsor].name : sponsor
      }));
    return rival;
  }

  function maybePapalSchism(state, papacy, obedienceId) {
    if (!papacy || papacyInSchism(papacy)) return false;
    var election = papacy.elections[obedienceId];
    var obedience = papacy.obediences[obedienceId];
    var conf = definition().schism;
    if (!election || !obedience || election.round < conf.firstBallot ||
        obedience.authority > conf.maximumAuthority) return false;
    var college = collegeCharacters(state, obedience);
    var leaders = leadingCounts(election.lastCounts || {});
    if (leaders.length < 2 || leaders[0].votes < college.length * conf.leaderShare ||
        leaders[1].votes < college.length * conf.leaderShare) return false;
    var patrons = topQuartilePatrons(state);
    if (!patrons.length) return false;
    if (patrons.indexOf('player') >= 0 &&
        FB.isPlayerSovereign && FB.isPlayerSovereign(state)) {
      papacy.pendingSchism = {
        electionObedienceId:obedienceId,
        sponsor:'player',
        leaderId:leaders[0].id,
        rivalId:leaders[1].id,
        madeTurn:state.turn
      };
      return { pending:true };
    }
    var willing = [];
    for (var i = 0; i < patrons.length; i++) {
      if (patrons[i] !== 'player') willing.push(patrons[i]);
    }
    if (!willing.length || !FB.chance(conf.aiCrisisChance)) return false;
    return createRivalObedience(state, election, FB.pick(willing));
  }

  FB.maybePapalSchism = function (state, obedienceId) {
    return maybePapalSchism(state, FB.ensurePapacy(state), obedienceId);
  };

  FB.resolvePapalSchismSponsorship = function (state, accept) {
    var papacy = FB.ensurePapacy(state);
    var pending = papacy && papacy.pendingSchism;
    if (!pending) return false;
    delete papacy.pendingSchism;
    if (!accept) return { declined:true };
    var election = papacy.elections[pending.electionObedienceId];
    return election ? createRivalObedience(state, election, 'player') : false;
  };

  FB.switchPapalObedience = function (state, obedienceId) {
    var papacy = FB.ensurePapacy(state);
    var target = papacy && papacy.obediences[obedienceId];
    var me = playerChar(state);
    var current = FB.papalObedienceForCharacter(state, me);
    var conf = definition().schism;
    if (!target || target.status !== 'active' || current === obedienceId ||
        !FB.isPlayerSovereign || !FB.isPlayerSovereign(state) ||
        !FB.papacyInSchism(state) || state.player.piety < conf.switchPiety ||
        state.player.prestige < conf.switchPrestige) return false;
    var last = state.player.lastObedienceSwitchTurn;
    if (last !== undefined &&
        state.turn - last < conf.switchCooldownDays) return false;
    var sovereign = realmSovereign(state, FB.playerRealmId(state));
    if (sovereign) papacy.realmObedience[sovereign] = obedienceId;
    if (FB.isCardinal(state, me)) {
      var record = papalRecord(state, me.id);
      var old = papacy.obediences[record.obedienceId];
      var at = old && old.college.indexOf(me.id);
      if (at >= 0) old.college.splice(at, 1);
      record.obedienceId = obedienceId;
      if (target.college.indexOf(me.id) < 0) target.college.push(me.id);
    }
    state.player.piety -= conf.switchPiety;
    state.player.prestige -= conf.switchPrestige;
    state.player.lastObedienceSwitchTurn = state.turn;
    FB.adjustPapalSupporterOpinions(state, current, -20);
    syncObedienceSupporters(state, papacy);
    syncPlayerExcommunicationTrait(state);
    FB.news(state, FB.msg('news.papacy.obedience_switched',
      '⚖ Your realm publicly changes Papal obedience; old allies call it betrayal.',
      {}));
    return true;
  };

  function chooseReunificationWinner(state, preferredId) {
    var papacy = state.papacy;
    if (preferredId && papacy.obediences[preferredId] &&
        papacy.obediences[preferredId].status === 'active') return preferredId;
    var best = null, bestScore = -Infinity;
    for (var oid in papacy.obediences) {
      var obedience = papacy.obediences[oid];
      if (!obedience || obedience.status !== 'active') continue;
      var score = obedience.supporters.length * 25 + obedience.authority;
      if (score > bestScore) {
        best = oid;
        bestScore = score;
      }
    }
    return best;
  }

  FB.reunifyPapacy = function (state, winnerId, method, deposeAll) {
    var papacy = FB.ensurePapacy(state);
    winnerId = chooseReunificationWinner(state, winnerId);
    var winner = winnerId && papacy.obediences[winnerId];
    var displacedWinnerPlayer = null;
    if (!winner || !FB.papacyInSchism(state)) return false;
    if (deposeAll) {
      if (winner.claimantId === state.player.charId) {
        displacedWinnerPlayer = {
          wasRoman:!!winner.roman,
          strongestPatron:winner.strongestPatron || null,
          supporters:winner.supporters.slice(),
          college:[]
        };
      }
      var outsider = starterCardinalCharacter(state, 23);
      outsider.compromiseCandidate = true;
      FB.appointCardinal(state, outsider, winner.id, winner.claimantId, {
        silent:true, order:'bishop', bloc:'reform'
      });
      if (winner.claimantId) {
        var oldRecord = papalRecord(state, winner.claimantId);
        if (oldRecord) oldRecord.office = 'retired';
      }
      winner.claimantId = outsider.id;
      var fake = {
        obedienceId:winner.id,
        phase:'balloting',
        promises:[],
        winnerId:outsider.id
      };
      installPope(state, fake, outsider.id,
        FB.papalRegnalChoices(state, outsider.id)[0].name);
      if (displacedWinnerPlayer) {
        var resistanceId = 'obedience_' + papacy.nextObedience++;
        var resistance = makeObedience(state, resistanceId,
          Math.max(15, winner.authority - 10), state.player.charId, false);
        resistance.status = 'collapsed';
        resistance.strongestPatron = displacedWinnerPlayer.strongestPatron;
        papacy.obediences[resistanceId] = resistance;
        var playerRecord = papalRecord(state, state.player.charId);
        if (playerRecord) {
          playerRecord.office = 'retired';
          playerRecord.obedienceId = resistanceId;
        }
        papacy.pendingDeposedPlayer = {
          obedienceId:resistanceId,
          winnerId:winnerId,
          canResist:!!(displacedWinnerPlayer.wasRoman ||
            displacedWinnerPlayer.strongestPatron),
          wasRoman:displacedWinnerPlayer.wasRoman,
          strongestPatron:displacedWinnerPlayer.strongestPatron,
          supporters:displacedWinnerPlayer.supporters,
          college:[]
        };
      }
    }
    for (var oid in papacy.obediences) {
      var obedience = papacy.obediences[oid];
      if (!obedience || oid === winnerId || obedience.status !== 'active') continue;
      var claimant = obedience.claimantId && state.chars[obedience.claimantId];
      if (claimant && claimant.id === state.player.charId) {
        papacy.pendingDeposedPlayer = {
          obedienceId:oid,
          winnerId:winnerId,
          canResist:!!(obedience.roman || obedience.strongestPatron),
          wasRoman:!!obedience.roman,
          strongestPatron:obedience.strongestPatron || null,
          supporters:obedience.supporters.slice(),
          college:obedience.college.slice()
        };
      } else if (claimant) {
        var record = papalRecord(state, claimant.id);
        if (record) record.office = 'retired';
        claimant.papalOffice = 'retired';
      }
      var college = obedience.college.slice();
      for (var i = 0; i < college.length; i++) {
        var charId = college[i];
        var cardinal = papalRecord(state, charId);
        if (cardinal) cardinal.obedienceId = winnerId;
        if (winner.college.indexOf(charId) < 0) winner.college.push(charId);
      }
      for (i = 0; i < obedience.supporters.length; i++) {
        papacy.realmObedience[obedience.supporters[i]] = winnerId;
      }
      obedience.college = [];
      obedience.supporters = [];
      obedience.roman = false;
      obedience.status = 'collapsed';
      obedience.collapsedTurn = state.turn;
      obedience.collapseMethod = method || 'submission';
    }
    papacy.romanObedience = winnerId;
    winner.roman = true;
    if (winner.claimantId && state.chars[winner.claimantId]) {
      syncPapalRealmRuler(state, winner, state.chars[winner.claimantId]);
    }
    if (!papacy.pendingDeposedPlayer) delete papacy.schismStartedTurn;
    FB.adjustPapalAuthority(state, winnerId,
      definition().authority.reunification || 5, 'reunification');
    syncObedienceSupporters(state, papacy);
    syncPlayerExcommunicationTrait(state);
    FB.news(state, FB.msg('news.papacy.reunified',
      '🕊 The rival obediences are reconciled; one College and one claimant remain.',
      {}));
    return winner;
  };

  FB.resolveDeposedPlayerClaimant = function (state, resist) {
    var papacy = FB.ensurePapacy(state);
    var pending = papacy && papacy.pendingDeposedPlayer;
    if (!pending) return false;
    var obedience = papacy.obediences[pending.obedienceId];
    var winner = papacy.obediences[pending.winnerId];
    var me = playerChar(state);
    if (resist && pending.canResist) {
      obedience.status = 'active';
      obedience.claimantId = me.id;
      obedience.college = [];
      var savedCollege = pending.college || [];
      for (var i = 0; i < savedCollege.length; i++) {
        var charId = savedCollege[i];
        var at = winner && winner.college.indexOf(charId);
        if (at >= 0) winner.college.splice(at, 1);
        if (state.chars[charId] && !state.chars[charId].dead) {
          obedience.college.push(charId);
          var cardinal = papalRecord(state, charId);
          if (cardinal) cardinal.obedienceId = obedience.id;
        }
      }
      var supporters = pending.supporters || [];
      for (i = 0; i < supporters.length; i++) {
        papacy.realmObedience[supporters[i]] = obedience.id;
      }
      obedience.strongestPatron = pending.strongestPatron || null;
      if (pending.wasRoman) {
        if (winner) winner.roman = false;
        obedience.roman = true;
        papacy.romanObedience = obedience.id;
        syncPapalRealmRuler(state, obedience, me);
      }
      var record = papalRecord(state, me.id);
      if (record) {
        record.office = 'pope';
        record.obedienceId = obedience.id;
      }
      me.papalOffice = 'pope';
      state.player.flags.pope = 1;
      state.player.flags.cardinal = 1;
      if (winner) {
        FB.addPapalGround(state, me, 'reunification_defiance', winner.id);
      }
      delete papacy.pendingDeposedPlayer;
      syncObedienceSupporters(state, papacy);
      syncPlayerExcommunicationTrait(state);
      return { resisted:true };
    }
    var record = papalRecord(state, me.id);
    if (record) record.office = 'retired';
    me.papalOffice = 'retired';
    if (obedience) {
      obedience.claimantId = null;
      obedience.college = [];
      obedience.supporters = [];
      obedience.roman = false;
      obedience.status = 'collapsed';
    }
    if (winner) {
      winner.roman = true;
      papacy.romanObedience = winner.id;
      if (winner.claimantId && state.chars[winner.claimantId]) {
        syncPapalRealmRuler(state, winner, state.chars[winner.claimantId]);
      }
    }
    delete state.player.flags.pope;
    delete state.player.flags.cardinal;
    state.player.papalOffice = null;
    var custody = papacy.custody[me.id];
    if (custody) {
      state.player.enterprises = custody.enterprises || [];
      state.player.enterpriseLabor = custody.enterpriseLabor || [];
      state.player.holdings = custody.holdings || [];
      state.player.landPlots = custody.landPlots || [];
      state.player.manor = custody.manor || null;
      delete papacy.custody[me.id];
    }
    delete papacy.pendingDeposedPlayer;
    delete papacy.schismStartedTurn;
    syncObedienceSupporters(state, papacy);
    syncPlayerExcommunicationTrait(state);
    return { submitted:true };
  };

  FB.callPapalCouncil = function (state, obedienceId, deposeAll) {
    var papacy = FB.ensurePapacy(state);
    var obedience = papacy && papacy.obediences[
      obedienceId || papacy.romanObedience
    ];
    if (!obedience || !FB.papacyInSchism(state) ||
        obedience.authority < definition().authority.gates.council ||
        !isFinite(papacy.schismStartedTurn) ||
        state.turn - papacy.schismStartedTurn <
          definition().schism.councilAfterDays) return false;
    return FB.reunifyPapacy(state, obedience.id, 'general council', !!deposeAll);
  };

  /* ---------- death, archive, continuity, and time hooks ---------- */

  function compactArchiveRecord(state, c, record) {
    return {
      id:c.id,
      name:c.name,
      sex:c.sex,
      culture:c.culture,
      dynasty:c.dyn || null,
      born:c.born,
      died:c.died || state.date.year,
      offices:record ? [{
        office:record.office,
        order:record.order || null,
        titleChurch:record.titleChurch || null,
        obedienceId:record.obedienceId || null,
        appointedYear:record.appointedYear || null,
        electedYear:record.electedYear || null
      }] : [],
      papalName:c.papalName || null
    };
  }

  function neededByPlayerGenealogy(state, c) {
    var me = playerChar(state);
    if (!me || !c) return false;
    if (c.id === me.id || c.dyn && me.dyn && c.dyn === me.dyn) return true;
    if (c.fatherId === me.id || c.motherId === me.id ||
        me.fatherId === c.id || me.motherId === c.id) return true;
    for (var id in state.chars) {
      var other = state.chars[id];
      if (!other) continue;
      if (other.fatherId === c.id || other.motherId === c.id ||
          c.fatherId === other.id && other.dyn === me.dyn ||
          c.motherId === other.id && other.dyn === me.dyn) return true;
    }
    return false;
  }

  function removeDeadCardinalSocialState(state, c) {
    if (state.provChars) {
      for (var pid in state.provChars) {
        var residents = state.provChars[pid];
        if (!Array.isArray(residents)) continue;
        var at = residents.indexOf(c.id);
        if (at >= 0) residents.splice(at, 1);
      }
    }
    if (state.player.socialGiftTurns) delete state.player.socialGiftTurns[c.id];
    if (state.player.friendContacts) delete state.player.friendContacts[c.id];
    if (state.player.rivalContacts) delete state.player.rivalContacts[c.id];
    if (state.player.rivalPeace) delete state.player.rivalPeace[c.id];
    if (state.papacy && state.papacy.relationships) {
      for (var key in state.papacy.relationships) {
        var ids = key.split(':');
        if (ids.indexOf(c.id) >= 0) delete state.papacy.relationships[key];
      }
    }
  }

  function collapseObedienceAfterDeath(state, obedience) {
    var papacy = state.papacy;
    if (obedience.roman) {
      FB.startPapalElection(state, obedience.id, 'death');
      return;
    }
    if (obedience.college.length >= definition().schism.successorCardinals &&
        obedience.supporters.length >= definition().schism.successorSupporters) {
      FB.startPapalElection(state, obedience.id, 'death');
      return;
    }
    var winnerId = chooseReunificationWinner(state, papacy.romanObedience);
    if (FB.papacyInSchism(state) && winnerId !== obedience.id) {
      FB.reunifyPapacy(state, winnerId, 'claimant line collapsed', false);
    } else {
      obedience.status = 'collapsed';
    }
  }

  FB.papacyCharacterDied = function (state, value, opts) {
    opts = opts || {};
    var papacy = FB.ensurePapacy(state);
    var c = typeof value === 'string' ? state.chars[value] : value;
    if (!papacy || !c) return false;
    var record = papalRecord(state, c.id);
    var claimantObedience = null;
    for (var oid in papacy.obediences) {
      if (papacy.obediences[oid].claimantId === c.id) {
        claimantObedience = papacy.obediences[oid];
        break;
      }
    }
    for (oid in papacy.obediences) {
      var obedience = papacy.obediences[oid];
      var at = obedience.college.indexOf(c.id);
      if (at >= 0) obedience.college.splice(at, 1);
      if (obedience.deanId === c.id) obedience.deanId = null;
      if (obedience.camerlengoId === c.id) obedience.camerlengoId = null;
    }
    for (var key in papacy.excommunications) {
      var sentence = papacy.excommunications[key];
      if (sentence.targetId === c.id) sentence.clearedTurn = state.turn;
    }
    FB.removeTrait(c, 'excommunicated');
    if (claimantObedience) {
      claimantObedience.claimantId = null;
      collapseObedienceAfterDeath(state, claimantObedience);
    }
    if (record) {
      papacy.archive.push(compactArchiveRecord(state, c, record));
      delete papacy.cardinals[c.id];
    }
    delete papacy.grounds[c.id];
    removeDeadCardinalSocialState(state, c);
    if (record && !opts.preserve && !neededByPlayerGenealogy(state, c)) {
      delete state.chars[c.id];
    }
    return !!(record || claimantObedience);
  };

  FB.papacyPlayerSuccession = function (state, formerId) {
    var papacy = FB.ensurePapacy(state);
    var custody = papacy && papacy.custody[formerId];
    if (!custody) return false;
    var p = state.player;
    p.enterprises = custody.enterprises || [];
    p.enterpriseLabor = custody.enterpriseLabor || [];
    p.holdings = custody.holdings || [];
    p.landPlots = custody.landPlots || [];
    p.manor = custody.manor || null;
    p.papalOffice = null;
    delete p.flags.pope;
    delete p.flags.cardinal;
    delete papacy.custody[formerId];
    return true;
  };

  FB.papacyClaimantForRealm = function (state, rid) {
    var papacy = FB.ensurePapacy(state);
    if (!papacy || rid !== romanRealmId(state)) return null;
    var obedience = papacy.obediences[papacy.romanObedience];
    return obedience && obedience.claimantId || null;
  };

  /* Read-only: realm sheets and court-display paths ask this while
     rendering, so it must not ensure or repair the saved office. The
     snapshot resolves the same assignment ensureReligiousHeads would;
     creation, load, and the recovery tick keep the office repaired. */
  FB.papacyTerritorialRealm = function (state, rid) {
    if (!state || !rid) return false;
    var head = FB.religiousHeadSnapshot
      ? FB.religiousHeadSnapshot(state, 'catholic') : null;
    return !!(head && head.id === rid);
  };

  FB.papacyDay = function (state) {
    /* A settled Papacy has no daily work. Creation/load performs the full
       repair; only an election whose next ballot is due needs it here. */
    var saved = state && state.papacy;
    var savedElections = saved && saved.elections;
    if (saved && savedElections && typeof savedElections === 'object') {
      var electionDue = false;
      for (var savedOid in savedElections) {
        var savedElection = savedElections[savedOid];
        if (!savedElection ||
            (savedElection.phase !== 'vacancy' &&
             savedElection.phase !== 'balloting') ||
            state.turn < savedElection.waitUntil ||
            (savedElection.nextAutoBallotTurn !== undefined &&
             state.turn < savedElection.nextAutoBallotTurn)) continue;
        electionDue = true;
        break;
      }
      if (!electionDue) return;
    }
    /* The office was normalized at creation/load and Papal mutations preserve
       its shape. A due ballot can therefore use the saved model directly;
       invoking the world-wide repair here made one AI conclave rescan every
       Catholic sovereign many times per fast-forward. */
    var papacy = saved && saved.obediences && saved.cardinals
      ? saved : FB.ensurePapacy(state);
    if (!papacy) return;
    for (var oid in papacy.elections) {
      var election = papacy.elections[oid];
      var obedience = papacy.obediences[oid];
      if (!election || !obedience ||
          (election.phase !== 'vacancy' && election.phase !== 'balloting')) continue;
      if (state.turn < election.waitUntil) continue;
      if (election.phase === 'vacancy') election.phase = 'balloting';
      var playerElector = obedience.college.indexOf(state.player.charId) >= 0 &&
        FB.isCardinal(state, state.player.charId);
      if (playerElector) continue;
      if (election.nextAutoBallotTurn !== undefined &&
          state.turn < election.nextAutoBallotTurn) continue;
      papalElectionBallot(state, papacy, oid, null, null);
      election.nextAutoBallotTurn = state.turn +
        (election.law.enclosed ? 3 : 10);
    }
  };

  FB.papacyPendingDecision = function (state) {
    /* The common path has neither a pending Papal demand nor a live
       conclave. Read that normalized save shape directly instead of scanning
       and resynchronizing every Catholic sovereign before every day. */
    var saved = state && state.papacy;
    if (saved && saved.elections && saved.obediences && saved.cardinals &&
        typeof saved.elections === 'object' &&
        typeof saved.obediences === 'object' &&
        typeof saved.cardinals === 'object') {
      if (saved.pendingInvestitureDemand || saved.pendingSchism ||
          saved.pendingDeposedPlayer) {
        /* Pending records are exceptional and may need relationship repair
           to choose the player's recognized obedience. */
      } else {
        var playerId = state.player.charId;
        var playerOffice = saved.cardinals[playerId];
        for (var savedOid in saved.elections) {
          var savedElection = saved.elections[savedOid];
          if (!savedElection) continue;
          if (savedElection.phase === 'name' &&
              savedElection.winnerId === playerId) return savedOid;
          var savedObedience = saved.obediences[savedOid];
          if ((savedElection.phase === 'vacancy' ||
               savedElection.phase === 'balloting') &&
              state.turn >= savedElection.waitUntil &&
              playerOffice && playerOffice.office === 'cardinal' &&
              savedObedience && savedObedience.college &&
              savedObedience.college.indexOf(playerId) >= 0) {
            return savedOid;
          }
        }
        return null;
      }
    }
    var papacy = FB.ensurePapacy(state);
    if (!papacy) return null;
    if (papacy.pendingInvestitureDemand || papacy.pendingSchism ||
        papacy.pendingDeposedPlayer) {
      return FB.papalObedienceForCharacter(state, playerChar(state)) ||
        papacy.romanObedience;
    }
    for (var oid in papacy.elections) {
      var election = papacy.elections[oid];
      if (election && election.phase === 'name' &&
          election.winnerId === state.player.charId) return oid;
      var obedience = papacy.obediences[oid];
      if (election && obedience &&
          (election.phase === 'vacancy' ||
            election.phase === 'balloting') &&
          state.turn >= election.waitUntil &&
          obedience.college.indexOf(state.player.charId) >= 0 &&
          FB.isCardinal(state, state.player.charId)) return oid;
    }
    return null;
  };

  FB.papacySeason = function (state) {
    var papacy = FB.ensurePapacy(state);
    if (!papacy) return;
    var investiturePiety = FB.papacyInvestiturePiety(state);
    state.player.piety = Math.max(0, state.player.piety + investiturePiety);
    if (!FB.playerPope(state)) return;
    var office = papalRecord(state, state.player.charId);
    var obedience = office && papacy.obediences[office.obedienceId];
    if (!obedience) return;
    state.player.gold += obedience.roman
      ? definition().balance.popeRomanRevenue
      : definition().schism.patronStipend;
  };

  function aiPapalPolicy(state, obedience) {
    if (!obedience.claimantId || obedience.claimantId === state.player.charId) return;
    obedience.piety = (obedience.piety || 0) + 35;
    if (obedience.authority >= definition().authority.gates.investiture &&
        state.date.year >= definition().investiture.reformFrom &&
        FB.chance(0.2)) {
      var lay = [];
      var sovereigns = livingCatholicSovereigns(state);
      for (var i = 0; i < sovereigns.length; i++) {
        var record = ensureInvestitureRecord(state, sovereigns[i]);
        if (record.policy === 'lay' &&
            FB.papalObedienceForRealm(state, sovereigns[i]) === obedience.id) {
          lay.push(sovereigns[i]);
        }
      }
      if (lay.length) FB.papalInvestitureDemand(state, FB.pick(lay), obedience.id);
    }
    if (obedience.authority >= definition().authority.gates.sanctions &&
        FB.chance(0.15)) {
      var targets = FB.papalRulerTargets(state);
      for (i = 0; i < targets.length; i++) {
        var cause = sanctionCause(state, targets[i].c.id, obedience.id);
        if (cause && FB.papalExcommunicate(
            state, targets[i].c, obedience.id, false)) break;
      }
    }
    if (FB.chance(0.2)) {
      FB.adjustPapalAuthority(state, obedience.id,
        definition().balance.popeLegationAuthority || 1, 'legation');
    }
  }

  FB.papacyYearly = function (state) {
    var papacy = FB.ensurePapacy(state);
    if (!papacy) return;
    syncObedienceSupporters(state, papacy);
    syncPlayerExcommunicationTrait(state);
    for (var oid in papacy.obediences) {
      var obedience = papacy.obediences[oid];
      if (!obedience || obedience.status !== 'active') continue;
      installCollegeOffices(state, obedience);
      if (obedience.claimantId &&
          obedience.college.length < (definition().targetCollege || 12) &&
          obedience.lastConsistoryYear !== state.date.year &&
          obedience.claimantId !== state.player.charId) {
        FB.holdConsistory(state, obedience.id, null);
      }
      aiPapalPolicy(state, obedience);
      queuePlayerPopeAbsolution(state, obedience);
    }
    if (FB.papacyInSchism(state)) {
      var total = livingCatholicSovereigns(state).length;
      for (oid in papacy.obediences) {
        obedience = papacy.obediences[oid];
        if (!obedience || obedience.status !== 'active') continue;
        if (total && obedience.supporters.length / total >=
            definition().schism.overwhelmingShare) {
          FB.reunifyPapacy(state, oid, 'overwhelming recognition', false);
          break;
        }
      }
    }
  };

  FB.papacyProvinceTransferred = function (state, pid, fromRealm, toRealm) {
    if (pid !== 'roma') return;
    var papacy = FB.ensurePapacy(state);
    var formerRoman = papacy.obediences[papacy.romanObedience];
    var canonicalRealm = FB.religiousHeadDefaultRealm &&
      FB.religiousHeadDefaultRealm(state, 'catholic');
    var lostByPapacy = fromRealm && (fromRealm === canonicalRealm ||
      state.religiousHeads && state.religiousHeads.catholic === fromRealm);
    if (formerRoman && lostByPapacy && toRealm !== canonicalRealm) {
      FB.adjustPapalAuthority(state, formerRoman.id,
        definition().authority.lostRome || -15, 'loss of Rome');
    }
    var sovereign = realmSovereign(state, toRealm);
    var receivingId = papacy.realmObedience[sovereign];
    var targetRuler = rulerCharacter(state, sovereign, true);
    if (targetRuler && lostByPapacy && toRealm !== canonicalRealm) {
      FB.addPapalGround(state, targetRuler,
        receivingId && receivingId !== papacy.romanObedience
          ? 'attack_pope' : 'occupy_rome',
        formerRoman && formerRoman.id);
    }
    if (receivingId && papacy.obediences[receivingId] &&
        receivingId !== papacy.romanObedience) {
      if (formerRoman) formerRoman.roman = false;
      var receiving = papacy.obediences[receivingId];
      receiving.roman = true;
      papacy.romanObedience = receivingId;
      var papalRealm = canonicalRealm && state.realms[canonicalRealm];
      if (papalRealm) {
        papalRealm.alive = true;
        papalRealm.war = null;
        papalRealm.liege = null;
        papalRealm.capital = 'roma';
        papalRealm.religion = 'catholic';
        state.owner.roma = canonicalRealm;
        if (state.holder) state.holder.roma = canonicalRealm;
        state.religiousHeads.catholic = canonicalRealm;
        papacy.realmObedience[canonicalRealm] = receivingId;
        /* The See's realm is alive again, and so is its ruler: the derived
           reigning-ruler index has to learn that before anything asks. */
        if (FB.rebuildRulerIndex) FB.rebuildRulerIndex(state);
        if (FB.invalidateRealmCache) FB.invalidateRealmCache();
      } else {
        state.religiousHeads.catholic = toRealm;
      }
      delete state.religiousHeadVacancies.catholic;
      if (receiving.claimantId) {
        syncPapalRealmRuler(state, receiving,
          state.chars[receiving.claimantId]);
      }
      if (sovereign === 'player' && state.player.war &&
          FB.endPlayerWar) {
        FB.endPlayerWar(state);
      } else if (state.realms[sovereign]) {
        state.realms[sovereign].war = null;
      }
      if (papalRealm) papalRealm.war = null;
      FB.news(state, FB.msg('news.papacy.rome_transferred',
        '⚔ Rome changes hands; the victorious claimant becomes the Roman Pope, but the schism endures.',
        {}));
    }
  };

  FB.papacyReligiousHeadRestored = function (state, religionId, rid) {
    if (!FB.faithHasSystem(religionId, 'papacy', state)) return false;
    var papacy = FB.ensurePapacy(state);
    var obedience = papacy && papacy.obediences[papacy.romanObedience];
    if (!obedience) return false;
    obedience.roman = true;
    state.religiousHeads.catholic = rid;
    delete state.religiousHeadVacancies.catholic;
    papacy.realmObedience[rid] = obedience.id;
    if (obedience.claimantId && state.chars[obedience.claimantId]) {
      syncPapalRealmRuler(state, obedience,
        state.chars[obedience.claimantId]);
    } else {
      FB.startPapalElection(state, obedience.id, 'restoration');
    }
    return true;
  };

  FB.papacyRealmDied = function (state, rid) {
    if (!state || !state.papacy) return;
    var papacy = FB.ensurePapacy(state);
    delete papacy.realmObedience[rid];
    syncObedienceSupporters(state, papacy);
    if (!FB.papacyInSchism(state)) return;
    for (var oid in papacy.obediences) {
      var obedience = papacy.obediences[oid];
      if (!obedience || obedience.roman || obedience.status !== 'active') continue;
      if (!obedience.supporters.length && !obedience.strongestPatron) {
        FB.reunifyPapacy(state, papacy.romanObedience,
          'last patron defeated', false);
        break;
      }
    }
  };

  FB.papacyDecisiveWarLost = function (state, rid) {
    var papacy = FB.ensurePapacy(state);
    if (!papacy) return false;
    var adjusted = false;
    for (var oid in papacy.obediences) {
      var obedience = papacy.obediences[oid];
      if (!obedience || !obedience.claimantId ||
          (obedience.status !== 'active' && obedience.status !== 'resisting')) {
        continue;
      }
      var claimantIsPlayer = rid === 'player' &&
        obedience.claimantId === state.player.charId;
      var territorial = obedience.roman &&
        rid === romanRealmId(state);
      var patronDefeated = !obedience.roman &&
        rid === obedience.strongestPatron;
      if (!claimantIsPlayer && !territorial && !patronDefeated) continue;
      FB.adjustPapalAuthority(state, oid,
        definition().authority.lostDecisiveWar || -15,
        'decisive Papal war lost');
      adjusted = true;
    }
    return adjusted;
  };

  FB.papalLegation = function (state, obedienceId) {
    var papacy = FB.ensurePapacy(state);
    var obedience = papacy && papacy.obediences[obedienceId];
    if (!obedience || obedience.claimantId !== state.player.charId ||
        state.player.gold < definition().balance.popeLegationGold ||
        obedience.lastLegationYear === state.date.year) return false;
    state.player.gold -= definition().balance.popeLegationGold;
    obedience.lastLegationYear = state.date.year;
    FB.adjustPapalAuthority(state, obedience.id,
      definition().balance.popeLegationAuthority || 1, 'legation');
    return true;
  };

  FB.papalAudience = function (state, realmId, obedienceId) {
    var papacy = FB.ensurePapacy(state);
    var obedience = papacy && papacy.obediences[obedienceId];
    var target = realmId && rulerCharacter(
      state, realmSovereign(state, realmId), true
    );
    if (!obedience || obedience.claimantId !== state.player.charId ||
        !realmId || !catholicReligion(state, realmReligion(state, realmId)) ||
        target && target.id === obedience.claimantId) return false;
    var key = obedienceId + ':' + realmId;
    papacy.audiences = papacy.audiences || {};
    if (papacy.audiences[key] === state.date.year) return false;
    papacy.audiences[key] = state.date.year;
    if (realmId !== 'player' && FB.adjustStanding) {
      FB.adjustStanding(state, { kind:'realm', id:realmId }, 10,
        'papacy:audience');
    }
    state.player.piety += 10;
    return true;
  };

  FB.papalRecognitionTargets = function (state, obedienceId) {
    var papacy = FB.ensurePapacy(state);
    var out = [];
    var sovereigns = livingCatholicSovereigns(state);
    for (var i = 0; i < sovereigns.length; i++) {
      var rid = sovereigns[i];
      if (rid === 'player' ||
          FB.papalObedienceForRealm(state, rid) === obedienceId) continue;
      var c = rulerCharacter(state, rid, true);
      if (c) out.push({ realmId:rid, realm:state.realms[rid], c:c });
    }
    return out;
  };

  FB.papalRecognitionBargain = function (state, realmId, obedienceId) {
    var papacy = FB.ensurePapacy(state);
    var obedience = papacy && papacy.obediences[obedienceId];
    var sovereign = realmSovereign(state, realmId);
    var cost = definition().balance.recognitionBargainGold || 25;
    if (!obedience || obedience.claimantId !== state.player.charId ||
        !FB.papacyInSchism(state) || !sovereign || sovereign === 'player' ||
        !catholicReligion(state, realmReligion(state, sovereign)) ||
        FB.papalObedienceForRealm(state, sovereign) === obedience.id ||
        state.player.gold < cost) return false;
    papacy.recognitionBargains = papacy.recognitionBargains || {};
    var key = obedience.id + ':' + sovereign;
    if (papacy.recognitionBargains[key] === state.date.year) return false;
    papacy.recognitionBargains[key] = state.date.year;
    state.player.gold -= cost;
    var pope = playerChar(state);
    var rank = realmRank(state, sovereign);
    var chance = FB.clamp(0.2 + obedience.authority / 180 +
      FB.skillOf(pope, 'dip') / 100 +
      (FB.standingOf
        ? FB.standingOf(state, { kind:'realm', id:sovereign }) / 300 : 0) -
      rank * 0.04, 0.1, 0.85);
    var accepted = FB.chance(chance);
    if (accepted) {
      papacy.realmObedience[sovereign] = obedience.id;
      FB.adjustPapalAuthority(state, obedience.id,
        -(definition().balance.recognitionBargainAuthorityCost || 2),
        'recognition promise');
      syncObedienceSupporters(state, papacy);
    }
    FB.news(state, FB.msg(accepted
      ? 'news.papacy.recognition_accepted'
      : 'news.papacy.recognition_refused', accepted
      ? '⚖ {realm} recognizes {pope} after a bargain over patronage.'
      : '⚖ {realm} refuses to change Papal obedience.', {
        realm:state.realms[sovereign]
          ? state.realms[sovereign].name : sovereign,
        pope:FB.papalDisplayName(state, pope)
      }));
    return { accepted:accepted };
  };

  function queuePlayerPopeAbsolution(state, obedience) {
    if (!obedience || obedience.claimantId !== state.player.charId ||
        !FB.queueEvent) return false;
    var queue = state.eventQueue || [];
    for (var q = 0; q < queue.length; q++) {
      if (queue[q].id === 'papal_absolution_petition') return false;
    }
    for (var key in state.papacy.excommunications) {
      var sentence = state.papacy.excommunications[key];
      if (!sentence ||
          (sentence.clearedTurn !== null &&
            sentence.clearedTurn !== undefined) ||
          sentence.obedienceId !== obedience.id ||
          sentence.targetId === state.player.charId ||
          sentence.lastPetitionTurn !== undefined &&
            state.turn - sentence.lastPetitionTurn < 720) continue;
      var target = state.chars[sentence.targetId];
      var status = target &&
        FB.papalAbsolutionStatus(state, target.id);
      if (!target || target.dead || !status || !status.ready ||
          !FB.chance(0.3)) continue;
      sentence.lastPetitionTurn = state.turn;
      var realm = sentence.targetRealmId &&
        state.realms[sentence.targetRealmId];
      FB.queueEvent(state, 'papal_absolution_petition', {
        targetId:target.id,
        obedienceId:obedience.id,
        target:FB.fullName(target),
        realm:realm ? realm.name : sentence.targetRealmId || FB.T('their realm')
      });
      return true;
    }
    return false;
  }

  FB.fns = FB.fns || {};
  FB.fns.papal_grant_absolution = function (state, ctx) {
    if (ctx && ctx.targetId) FB.papalAbsolve(state, ctx.targetId);
  };
  FB.fns.papal_refuse_absolution = function (state, ctx) {
    var target = ctx && ctx.targetId && state.chars[ctx.targetId];
    if (target) {
      FB.news(state, FB.msg('news.papacy.absolution_refused',
        '⛓ {pope} refuses absolution to {target}; the sentence remains.',
        {
          pope:FB.papalDisplayName(state, playerChar(state)),
          target:FB.fullName(target)
        }));
    }
  };

  /* Legacy trait-only sentences acquire a recognized-obedience record on
     migration, while an elective incumbent is never replaced mid-reign. */
  FB.ensureLegacyPapalSentence = function (state) {
    var papacy = FB.ensurePapacy(state);
    var me = playerChar(state);
    if (!papacy || !me || !me.traits ||
        me.traits.indexOf('excommunicated') < 0 ||
        FB.excommunicationOf(state, me.id)) return;
    var oid = FB.papalObedienceForCharacter(state, me) || papacy.romanObedience;
    var ground = sanctionCause(state, me.id, oid);
    papacy.excommunications[oid + ':' + me.id] = {
      targetId:me.id,
      targetRealmId:'player',
      obedienceId:oid,
      cause:ground ? ground.cause : 'penance',
      justified:true,
      issuedTurn:state.turn,
      issuingClaimantId:papacy.obediences[oid] &&
        papacy.obediences[oid].claimantId || null,
      clearedTurn:null,
      legacy:true
    };
  };

  /* Finish the lazy migration only after all public helpers exist. */
  FB.ensurePapacyState = function (state) {
    var papacy = FB.ensurePapacy(state);
    if (papacy) FB.ensureLegacyPapalSentence(state);
    return papacy;
  };
})();
