/* Conditional succession settlements and diplomatic agreements. Dates open
   negotiations; living family and current government determine their terms. */
(function () {
  'use strict';
  var ID = 'carolingian_settlements_800', CROWN = 'carolingian_800';
  var KEYS = ['divisio','ordinatio','gifts','recognition','verdun'];
  function plain(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function live(s, cid) { return !!(cid && s.chars[cid] && !s.chars[cid].dead); }
  function ruler(s, rid) { return FB.realmRulerCharacterSnapshot(s, rid); }
  function item() { return { phase:'pending', result:null, turn:null, attemptSeason:null, plan:null }; }
  function finish(s, row, result) { row.phase = 'resolved'; row.result = result; row.turn = s.turn; }
  function init(s) {
    var empire = s.realms[CROWN];
    if (!empire || !empire.succession || !empire.succession.authoredCourt) return null;
    var father = empire.succession.rulerMemberId;
    FB.linkRoyalBranch(s, CROWN, 'italy', father);
    FB.linkRoyalBranch(s, CROWN, 'aquitaine', father);
    var rec = { cast:{ charlemagne:ruler(s, CROWN).id, louis:ruler(s, 'aquitaine').id,
      pippin:ruler(s, 'italy').id, harun:ruler(s, 'abbasid').id },
      pressure:{ amount:0, season:null, warId:null, rebelId:null }, opportunities:{} };
    for (var key of KEYS) rec.opportunities[key] = item();
    return rec;
  }
  function heirs(s, parentId) {
    var family = s.realms[CROWN] && s.realms[CROWN].succession;
    if (!family) return [];
    return Object.keys(family.members).map(function (id) { return family.members[id]; })
      .filter(function (m) { return m.alive !== false && m.sex === 'm' &&
        (m.fatherId || m.parentId) === parentId && (!m.charId || live(s, m.charId)); })
      .sort(function (a, b) { return a.born - b.born || (a.id < b.id ? -1 : 1); });
  }
  function regionCounties(s, name) {
    var region = FBDATA.carolingianSettlements800.regions[name];
    return FB.world.provs.filter(function (p) {
      return !p.wasteland && s.owner[p.id] === CROWN && region.duchies.indexOf(p.duchy) >= 0;
    }).map(function (p) { return p.id; }).sort();
  }
  function familyPerson(s, id) {
    var family = s.realms[CROWN] && s.realms[CROWN].succession;
    var member = family && family.members[id];
    return member && member.charId && s.chars[member.charId] || null;
  }
  function terms(s, rec, key) {
    var def = FBDATA.carolingianSettlements800[key], crown = s.realms[CROWN];
    var king = ruler(s, CROWN), row = rec.opportunities[key];
    if (!crown || !crown.alive || crown.liege || !king || s.owner.aachen !== CROWN)
      return { terminal:'diverted' };
    if (row.phase !== 'pending' || s.date.year < def.firstYear || s.date.year > def.lastYear)
      return { allowed:false };
    if (key === 'divisio') {
      if (king.id !== rec.cast.charlemagne) return { terminal:'interrupted' };
      var children = heirs(s, crown.succession.rulerMemberId);
      var shares = ['aquitaine','italy'].filter(function (rid) {
        var c = ruler(s, rid), root = s.realms[rid] && s.realms[rid].succession;
        return c && root && s.realms[rid].liege === CROWN &&
          c.id === rec.cast[rid === 'aquitaine' ? 'louis' : 'pippin'];
      }).map(function (rid) { return { realmId:rid, charId:ruler(s, rid).id,
        generation:FB.realmRulerGeneration(s, rid) }; });
      return { allowed:children.length >= 2 && shares.length > 0 && !FB.isRealmAtWar(s, CROWN),
        plan:{ rulerId:king.id, generation:FB.realmRulerGeneration(s, CROWN),
          primaryId:children.length ? children[0].id : null, shares:shares } };
    }
    if (key === 'ordinatio') {
      if (king.id !== rec.cast.louis) return { terminal:'interrupted' };
      var sons = heirs(s, crown.succession.rulerMemberId);
      var grants = sons.slice(1, 3).map(function (m, index) {
        var name = index === 0 ? 'aquitaine' : 'bavaria';
        return { memberId:m.id, region:name, counties:regionCounties(s, name) };
      });
      var valid = sons.length >= 2 && grants.every(function (grant) {
        var region = FBDATA.carolingianSettlements800.regions[grant.region];
        var person = familyPerson(s, grant.memberId);
        return grant.counties.indexOf(region.capital) >= 0 && !s.realms[region.realmId] &&
          (!person || person.id !== s.player.charId && !FB.isReigningRealmRuler(s, person)) &&
          FB.royalRegionQuote(s, CROWN, grant.counties);
      });
      return { allowed:!!valid && !FB.isRealmAtWar(s, CROWN),
        plan:{ rulerId:king.id, generation:FB.realmRulerGeneration(s, CROWN),
          primaryId:sons.length ? sons[0].id : null, shares:grants } };
    }
    if (key === 'gifts') {
      var caliph = ruler(s, 'abbasid');
      if (king.id !== rec.cast.charlemagne || !caliph || caliph.id !== rec.cast.harun)
        return { terminal:'interrupted' };
      if (s.owner.baghdad !== 'abbasid' || s.realms.abbasid.liege) return { terminal:'diverted' };
      return { allowed:!FB.isRealmAtWar(s, CROWN) && !FB.isRealmAtWar(s, 'abbasid') &&
        FB.treasuryAvailable(s, CROWN) >= def.westernGift &&
        FB.treasuryAvailable(s, 'abbasid') >= def.easternGift,
        parties:[king.id, caliph.id], generations:[FB.realmRulerGeneration(s, CROWN), FB.realmRulerGeneration(s, 'abbasid')] };
    }
    if (key === 'recognition') {
      var east = ruler(s, 'byzantium');
      if (king.id !== rec.cast.charlemagne || !east) return { terminal:'interrupted' };
      if (s.owner.constantinople !== 'byzantium' || s.realms.byzantium.liege ||
          !FB.realmRank.isImperial(s.realms.byzantium, s) ||
          def.coastalCounties.some(function (pid) { return [CROWN,'byzantium'].indexOf(s.owner[pid]) < 0; }))
        return { terminal:'diverted' };
      return { allowed:!FB.isRealmAtWar(s, CROWN) && !FB.isRealmAtWar(s, 'byzantium') &&
        FB.realmRank.isImperial(crown, s),
        parties:[king.id, east.id], generations:[FB.realmRulerGeneration(s, CROWN), FB.realmRulerGeneration(s, 'byzantium')],
        coast:def.coastalCounties.map(function (pid) { return s.owner[pid]; }) };
    }
    var settlement = rec.opportunities.ordinatio.plan;
    if (!settlement || king.id === settlement.rulerId) return { allowed:false };
    var family = crown.succession, primary = family.members[settlement.primaryId];
    if (!primary || primary.charId !== king.id) return { terminal:'interrupted' };
    var juniors = settlement.shares.filter(function (share) {
      var c = ruler(s, share.realmId);
      return c && c.id === share.charId &&
        (!s.realms[share.realmId].liege || s.realms[share.realmId].liege === CROWN);
    });
    if (juniors.length < 2) return { allowed:false };
    var parties = [CROWN].concat(juniors.map(function (share) { return share.realmId; }));
    var wars = FB.ordinaryWars(s).filter(function (war) {
      return parties.indexOf(war.attacker) >= 0 || parties.indexOf(war.defender) >= 0;
    });
    if (wars.some(function (war) { return parties.indexOf(war.attacker) < 0 || parties.indexOf(war.defender) < 0; }) ||
        parties.some(function (rid) { return FB.greatHolyWarCamp && FB.greatHolyWarCamp(s, rid); })) return { allowed:false };
    var partitions = juniors.map(function (share, index) {
      var name = index === 0 ? 'west' : 'east', counties = regionCounties(s, name);
      // Existing subordinate shares must also be whole in the negotiated region.
      var owned = FB.realmTerritory(s, share.realmId);
      if (s.realms[share.realmId].liege === CROWN)
        counties = counties.filter(function (pid) { return owned.indexOf(pid) < 0; }).concat(owned).sort();
      return { realmId:share.realmId, charId:share.charId, generation:FB.realmRulerGeneration(s, share.realmId),
        region:name, counties:counties };
    });
    var occupied = {}, validPartition = partitions.every(function (part) {
      return part.counties.every(function (pid) {
        if (occupied[pid]) return false; occupied[pid] = true; return true;
      }) && !!FB.royalRegionQuote(s, CROWN, part.counties, parties);
    });
    return { allowed:validPartition,
      plan:{ rulerId:king.id, generation:FB.realmRulerGeneration(s, CROWN), primaryId:primary.id,
        shares:partitions, warIds:wars.map(function (war) { return war.id; }) } };
  }
  function quote(s, rec, key) {
    if (KEYS.indexOf(key) < 0) return { id:key, allowed:false, stamp:'null' };
    var check = terms(s, rec, key);
    var facts = { check:check, turn:s.turn, year:s.date.year,
      phase:rec.opportunities[key].phase, owner:s.owner, holder:s.holder,
      funds:[FB.treasuryAvailable(s, CROWN), FB.treasuryAvailable(s, 'abbasid')] };
    return { id:key, allowed:!!check.allowed, reason:'living_courts', facts:facts, stamp:JSON.stringify(facts) };
  }
  function notice(s, key) {
    if (key === 'divisio') FB.news(s, FB.msg('news.800.divisio',
      '📜 The Carolingian court settles its inheritance shares. Regional crowns remain subordinate until the present ruler’s succession.', {}));
    if (key === 'ordinatio') FB.news(s, FB.msg('news.800.ordinatio',
      '📜 The Carolingian court designates a senior successor and grants regional government to younger sons. The imperial realm remains united.', {}));
    if (key === 'gifts') FB.news(s, FB.msg('news.800.gifts',
      '🎁 The Frankish and Abbasid courts exchange funded gifts and agree to a limited peace.', {}));
    if (key === 'recognition') FB.news(s, FB.msg('news.800.recognition',
      '📜 The eastern court recognizes the western imperial title in an Adriatic peace agreement.', {}));
    if (key === 'verdun') FB.news(s, FB.msg('news.800.verdun',
      '📜 The surviving Carolingian brothers agree to a western, middle and eastern division. Their existing subjects retain their local government.', {}));
  }
  function truce(s, a, b) {
    s.truces = s.truces || {};
    var key = JSON.stringify([a,b].sort());
    s.truces[key] = Math.max(s.truces[key] || 0, s.turn + 720);
  }
  function apply(s, rec, key, reviewed) {
    var q = quote(s, rec, key), row = rec.opportunities[key];
    if (!q.allowed || !reviewed || reviewed.id !== key || reviewed.stamp !== q.stamp) return false;
    var check = q.facts.check, plan = check.plan;
    if (key === 'divisio') {
      if (!FB.designateRoyalHeir(s, CROWN, plan.primaryId)) return false;
      row.plan = plan; row.phase = 'planned'; row.turn = s.turn;
    } else if (key === 'ordinatio') {
      var family = s.realms[CROWN].succession;
      // Materialize every real heir before any territorial change.
      for (var grant of plan.shares) {
        var person = FB.materializeRoyalMember(s, CROWN, grant.memberId);
        if (!person || FB.isReigningRealmRuler(s, person)) return false;
        grant.charId = person.id;
      }
      if (!FB.designateRoyalHeir(s, CROWN, plan.primaryId)) return false;
      for (var share of plan.shares) {
        var region = FBDATA.carolingianSettlements800.regions[share.region];
        var realm = FB.makeVassalRealm(s, { id:region.realmId, capital:region.capital,
          rank:3, liege:CROWN, titleKind:'kingdom', titleId:region.titleId });
        FB.assignRealmRulerCharacter(s, realm.id, share.charId);
        FB.grantRoyalRegion(s, CROWN, realm.id, share.counties);
        share.realmId = realm.id; share.generation = FB.realmRulerGeneration(s, realm.id);
        delete share.counties;
      }
      row.plan = plan; finish(s, row, 'agreed');
    } else if (key === 'gifts') {
      var gifts = FBDATA.carolingianSettlements800.gifts;
      if (!FB.treasuryTransfer(s, CROWN, 'abbasid', gifts.westernGift)) return false;
      FB.treasuryTransfer(s, 'abbasid', CROWN, gifts.easternGift);
      truce(s, CROWN, 'abbasid'); finish(s, row, 'agreed');
    } else if (key === 'recognition') {
      var actor = { kind:'realm', id:CROWN };
      var proof = FB.political.legitimacy(s, actor, actor, 'imperial_commission')
        .filter(function (row) { return row.issuer.kind === 'realm' && row.issuer.id === 'byzantium'; })[0] ||
        FB.authorityRecognize(s, { source:'imperial_commission',
          issuer:{ kind:'realm', id:'byzantium' }, subject:actor, scope:actor });
      if (!proof) return false;
      for (var pid of FBDATA.carolingianSettlements800.recognition.coastalCounties)
        if (s.owner[pid] === CROWN) FB.transferProvince(s, pid, 'byzantium');
      row.plan = { recognitionId:proof.id }; truce(s, CROWN, 'byzantium'); finish(s, row, 'agreed');
    } else {
      for (var warId of plan.warIds) FB.settleOrdinaryWar(s, warId, 'white_peace');
      for (var part of plan.shares) {
        if (!FB.grantRoyalRegion(s, CROWN, part.realmId, part.counties)) return false;
        FB.setRealmTitle(s, s.realms[part.realmId], 'kingdom',
          FBDATA.carolingianSettlements800.regions[part.region].titleId);
      }
      for (var part of plan.shares) FB.releaseRoyalRegion(s, CROWN, part.realmId);
      truce(s, plan.shares[0].realmId, plan.shares[1].realmId);
      for (var part of plan.shares) truce(s, CROWN, part.realmId);
      row.plan = plan; finish(s, row, 'agreed');
    }
    notice(s, key); return true;
  }
  function day(s, rec) {
    var row = rec.opportunities.divisio, king = ruler(s, CROWN);
    if (row.phase === 'planned' && king && king.id === row.plan.rulerId) {
      var family = s.realms[CROWN].succession, primary = family.members[row.plan.primaryId];
      if (!primary || primary.alive === false || primary.charId && !live(s, primary.charId)) {
        var surviving = heirs(s, family.rulerMemberId);
        if (surviving.length && FB.designateRoyalHeir(s, CROWN, surviving[0].id))
          row.plan.primaryId = surviving[0].id;
      }
    }
    if (row.phase === 'planned' && (!king || king.id !== row.plan.rulerId)) {
      if (!king || !s.realms[CROWN].alive || s.owner.aachen !== CROWN) { finish(s, row, 'diverted'); return; }
      // War delays execution. Dead or replaced beneficiaries receive no award.
      if (FB.isRealmAtWar(s, CROWN)) return;
      for (var share of row.plan.shares) {
        var current = ruler(s, share.realmId);
        if (current && current.id === share.charId && share.charId !== king.id)
          FB.releaseRoyalRegion(s, CROWN, share.realmId);
      }
      finish(s, row, 'executed');
      FB.news(s, FB.msg('news.800.partition_accession', '📜 The surviving regional shares of the Carolingian inheritance become independent after succession.', {}));
    }
    for (var key of KEYS) {
      var opportunity = rec.opportunities[key];
      if (opportunity.phase !== 'pending') continue;
      if (s.date.year > FBDATA.carolingianSettlements800[key].lastYear) {
        finish(s, opportunity, 'expired'); continue;
      }
      if (s.date.year >= FBDATA.carolingianSettlements800[key].firstYear) {
        var check = terms(s, rec, key);
        if (check.terminal) finish(s, opportunity, check.terminal);
      }
    }
  }
  function season(s, rec) {
    day(s, rec);
    var tick = s.date.year * 4 + s.date.season;
    for (var key of KEYS) {
      var row = rec.opportunities[key];
      if (row.phase !== 'pending' || row.attemptSeason === tick) continue;
      var q = quote(s, rec, key);
      if (!q.allowed) continue;
      row.attemptSeason = tick;
      // Autonomous courts may decline. No agreement is guaranteed by its date.
      if (FB.chance(0.65)) apply(s, rec, key, quote(s, rec, key));
    }
    var ord = rec.opportunities.ordinatio.plan, king = ruler(s, CROWN), pressure = rec.pressure;
    if (!ord || !king || king.id === ord.rulerId || pressure.season === tick || pressure.warId ||
        rec.opportunities.verdun.result === 'agreed') return;
    pressure.season = tick;
    var juniors = ord.shares.filter(function (share) {
      var c = ruler(s, share.realmId);
      return c && c.id === share.charId && s.realms[share.realmId].liege === CROWN;
    });
    if (!juniors.length) return;
    pressure.amount = Math.min(4, pressure.amount + 1);
    if (pressure.amount < 4 || FB.isRealmAtWar(s, CROWN) || !FB.chance(0.35)) return;
    var rebel = juniors[0].realmId;
    if (FB.truceExpiry(s, CROWN, rebel) || !FB.releaseRoyalRegion(s, CROWN, rebel)) return;
    var war = FB.registerOrdinaryWar(s, CROWN, { enemy:rebel, legacy:false,
      casus:{ type:'independence', rebel:rebel, formerLiege:CROWN, rebelCharId:ruler(s, rebel).id } });
    if (!war) {
      s.realms[rebel].liege = CROWN;
      for (var pid of FB.realmTerritory(s, rebel)) s.owner[pid] = CROWN;
      FB.invalidateRealmCache(); return;
    }
    pressure.warId = war.id; pressure.rebelId = rebel;
    FB.news(s, FB.msg('news.800.sibling_pressure', '⚔ A regional Carolingian court contests the senior ruler’s authority. Ordinary armies and peace decide the dispute.', {}));
  }
  function validate(rec, s) {
    function bad(field) { throw new Error(FB.T('Invalid v4 save field at {path}.', { path:'state.stories.' + ID + '.' + field })); }
    function integer(x) { return Number.isInteger(x) && x >= 0; }
    function id(x) { return typeof x === 'string' && !!x; }
    if (!plain(rec) || !plain(rec.cast) || !plain(rec.opportunities) || !plain(rec.pressure)) bad('record');
    for (var key of ['charlemagne','louis','pippin','harun']) if (!id(rec.cast[key])) bad('cast');
    if (!integer(rec.pressure.amount) || rec.pressure.amount > 4 ||
        rec.pressure.season !== null && !integer(rec.pressure.season) ||
        rec.pressure.warId !== null && !id(rec.pressure.warId) ||
        rec.pressure.rebelId !== null && !id(rec.pressure.rebelId)) bad('pressure');
    if (Object.keys(rec.opportunities).length !== KEYS.length) bad('opportunities');
    for (var key of KEYS) {
      var row = rec.opportunities[key];
      if (!plain(row) || ['pending','planned','resolved'].indexOf(row.phase) < 0 ||
          row.phase === 'planned' && key !== 'divisio' ||
          row.phase === 'resolved' && ['agreed','executed','declined','expired','interrupted','diverted'].indexOf(row.result) < 0 ||
          row.phase !== 'resolved' && row.result !== null ||
          row.phase === 'pending' && row.turn !== null ||
          row.phase !== 'pending' && !integer(row.turn) ||
          row.attemptSeason !== null && !integer(row.attemptSeason)) bad(key);
      if (row.plan === null) {
        if (row.phase === 'planned' || row.result === 'agreed' && ['ordinatio','recognition','verdun'].indexOf(key) >= 0) bad(key + '.plan');
        continue;
      }
      if (!plain(row.plan)) bad(key + '.plan');
      if (key === 'recognition') { if (!id(row.plan.recognitionId)) bad(key + '.recognitionId'); continue; }
      var plan = row.plan;
      if (!id(plan.rulerId) || !integer(plan.generation) || !id(plan.primaryId) ||
          !Array.isArray(plan.shares) || !plan.shares.length || plan.shares.length > 2) bad(key + '.plan');
      if (key === 'verdun' && (!Array.isArray(plan.warIds) ||
          plan.warIds.some(function (warId) { return !id(warId); }))) bad(key + '.warIds');
      for (var share of plan.shares) {
        if (!plain(share) || !id(share.realmId) || !s.realms[share.realmId] ||
            !id(share.charId) || !integer(share.generation)) bad(key + '.share');
        if (key !== 'divisio' && ['aquitaine','bavaria','west','east'].indexOf(share.region) < 0) bad(key + '.region');
        if (key === 'verdun' && (!Array.isArray(share.counties) || !share.counties.length ||
            share.counties.some(function (pid) { return !(FB.bookmark(s.start.id).provinces || []).some(function (p) { return p.id === pid; }); }))) bad(key + '.counties');
      }
    }
  }
  FB.stories.register({ id:ID, kind:'world', init:init, day:day, season:season, validate:validate,
    title:function () { return FB.T('Carolingian Inheritance and Embassies'); },
    intro:function () { return FB.T('Living heirs, regional government and surviving courts govern these opportunities. Succession plans preserve current borders until accession; agreements require peaceful parties and current terms.'); },
    status:function (s, rec) {
      var labels = { divisio:FB.T('806 inheritance settlement'), ordinatio:FB.T('817 imperial arrangement'),
        gifts:FB.T('Frankish-Abbasid gifts'), recognition:FB.T('Eastern imperial recognition'), verdun:FB.T('843 partition negotiations') };
      var states = { pending:FB.T('Awaiting conditions'), planned:FB.T('Awaiting succession'),
        agreed:FB.T('Agreement concluded'), executed:FB.T('Inheritance shares executed'), declined:FB.T('Declined'),
        expired:FB.T('Opportunity expired'), interrupted:FB.T('Court changed'), diverted:FB.T('Territory changed') };
      return { phase:'active', name:FB.T('Dynastic settlements and diplomatic opportunities'),
        lines:KEYS.map(function (key) { var row = rec.opportunities[key];
          return FB.T('{opportunity}: {status}', { opportunity:labels[key], status:states[row.result || row.phase] }); }) };
    }
  });
  // Exposed mutation boundaries are also used by bounded browser journeys.
  FB.carolingian800 = { quote:quote, apply:apply };
})();
