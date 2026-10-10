/* Reusable living-family settlements and bilateral diplomatic opportunities.
   Cast, regions, dates, funding, authority sources and news belong to data. */
(function () {
  'use strict';
  function plain(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function id(v) { return typeof v === 'string' && !!v; }
  function integer(v) { return Number.isInteger(v) && v >= 0; }
  function ruler(s, rid) {
    return FB.stories.ruler(s, rid);
  }
  function live(s, cid) { return !!(cid && s.chars[cid] && !s.chars[cid].dead); }
  function fresh() { return { phase:'pending', result:null, turn:null, attemptSeason:null, plan:null, approvals:{} }; }
  function finish(s, rec, result) { rec.phase = 'resolved'; rec.result = result; rec.turn = s.turn; }
  function notice(s, def, event) {
    var message = def.news[event];
    if (message) FB.news(s, FB.msg(message.key, message.text, {}));
  }
  function truce(s, a, b, days) {
    if (!days) return;
    s.truces = s.truces || {};
    var key = JSON.stringify([a,b].sort());
    s.truces[key] = Math.max(s.truces[key] || 0, s.turn + days);
  }
  function heirs(s, rid) {
    var family = s.realms[rid] && s.realms[rid].succession;
    if (!family) return [];
    return Object.keys(family.members).map(function (key) { return family.members[key]; })
      .filter(function (m) { return m.alive !== false && m.sex === 'm' &&
        (m.fatherId || m.parentId) === family.rulerMemberId && (!m.charId || live(s, m.charId)); })
      .sort(function (a, b) { return a.born - b.born || (a.id < b.id ? -1 : 1); });
  }
  function counties(s, rid, region) {
    return FB.stories.resolve(s, region.selector).filter(function (pid) { return s.owner[pid] === rid; }).sort();
  }
  function expected(s, rec, def) {
    return def.actor.castField ? rec.cast[def.actor.castField] : FB.stories.resolve(s, def.actor.character);
  }
  function definition(def) {
    var common = ['id','type','requires','requirements','name','desc','actor','firstYear','lastYear','chance','truceDays','news','registrationBefore','registrationAfter'];
    var extra = { succession_partition:['cast','branchRealmIds','shares'], designated_succession:['regions'],
      diplomatic_exchange:['source','actorGift','sourceGift','opinion'], recognition:['source','authoritySource','requireImperial','region'],
      treaty_settlement:['planRef','regions','pressure'] };
    if (!plain(def) || !extra[def.type] || Object.keys(def).some(function (key) { return common.concat(extra[def.type]).indexOf(key) < 0; }))
      throw new Error('Unknown settlement declaration field.');
    function ref(v) { return FB.stories.referenceValid(v, def); }
    function party(v) { return plain(v) && id(v.realmId) && id(v.capital) &&
      (v.character === undefined || ref(v.character)); }
    if (!plain(def) || !id(def.id) || typeof def.name !== 'string' || typeof def.desc !== 'string' ||
        !party(def.actor) || !integer(def.firstYear) || !integer(def.lastYear) || def.lastYear < def.firstYear ||
        !Number.isFinite(def.chance) || def.chance < 0 || def.chance > 1 || !integer(def.truceDays) || !plain(def.news))
      throw new Error('Invalid settlement story declaration.');
    Object.keys(def.news).forEach(function (key) {
      var m = def.news[key];
      if (!plain(m) || !/^news\.[a-z0-9_.-]+$/.test(m.key || '') || typeof m.text !== 'string')
        throw new Error('Invalid settlement news descriptor.');
    });
    if (def.type === 'succession_partition') {
      if (!plain(def.cast) || !Object.keys(def.cast).length || Object.keys(def.cast).some(function (key) { return !ref(def.cast[key]); }) ||
          !id(def.actor.castField) || !def.cast[def.actor.castField] || !Array.isArray(def.branchRealmIds) ||
          def.branchRealmIds.some(function (rid) { return !id(rid); }) || !Array.isArray(def.shares) || !def.shares.length ||
          def.shares.some(function (row) { return !plain(row) || !id(row.realmId) || !id(row.castField) || !def.cast[row.castField]; }))
        throw new Error('Invalid succession partition parties.');
    } else if (def.type === 'designated_succession' || def.type === 'treaty_settlement') {
      if (!Array.isArray(def.regions) || !def.regions.length || def.regions.length > 8 || def.regions.some(function (row, i) {
        return !plain(row) || !id(row.id) || def.regions.some(function (other, j) { return j !== i && other.id === row.id; }) ||
          !ref(row.selector) || ['region','provinces'].indexOf(row.selector.kind) < 0 ||
          def.type === 'designated_succession' && (!plain(row.grant) || !id(row.grant.id) || !id(row.grant.capital) ||
            !id(row.grant.titleId) || !integer(row.grant.rank) || row.grant.rank < 1 || row.grant.rank > 4 ||
            ['county','duchy','kingdom'].indexOf(row.grant.titleKind) < 0) ||
          def.type === 'treaty_settlement' && !id(row.titleId);
      }) || def.type === 'treaty_settlement' && (!ref(def.planRef) || def.planRef.kind !== 'story'))
        throw new Error('Invalid settlement regions or prerequisite plan.');
      if (def.pressure !== undefined && (!plain(def.pressure) || !integer(def.pressure.threshold) || def.pressure.threshold < 1 ||
          !Number.isFinite(def.pressure.chance) || def.pressure.chance < 0 || def.pressure.chance > 1))
        throw new Error('Invalid sibling pressure terms.');
    } else if (def.type === 'diplomatic_exchange') {
      if (!party(def.source) || def.actor.realmId === def.source.realmId || !Number.isFinite(def.actorGift) || def.actorGift < 0 ||
          !Number.isFinite(def.sourceGift) || def.sourceGift < 0 || !Number.isFinite(def.opinion) || def.opinion < -100 || def.opinion > 100)
        throw new Error('Invalid diplomatic exchange terms.');
    } else if (def.type === 'recognition') {
      if (!party(def.source) || def.actor.realmId === def.source.realmId || !id(def.authoritySource) ||
          !FBDATA.legitimacySources[def.authoritySource] || !ref(def.region) || ['region','provinces'].indexOf(def.region.kind) < 0 ||
          typeof def.requireImperial !== 'boolean') throw new Error('Invalid recognition terms.');
    }
  }
  function terms(s, rec, def) {
    var rid = def.actor.realmId, crown = s.realms[rid], king = ruler(s, rid);
    if (!crown || !crown.alive || crown.liege || !king || s.owner[def.actor.capital] !== rid) return { terminal:'diverted' };
    if (rec.phase !== 'pending' || s.date.year < def.firstYear || s.date.year > def.lastYear) return { allowed:false };
    var wanted = expected(s, rec, def);
    if ((def.actor.character || def.actor.castField) && king.id !== wanted) return { terminal:'interrupted' };
    if (def.type === 'succession_partition') {
      var children = heirs(s, rid);
      var shares = def.shares.filter(function (share) {
        var c = ruler(s, share.realmId), realm = s.realms[share.realmId];
        return c && realm && realm.succession && realm.liege === rid && c.id === rec.cast[share.castField];
      }).map(function (share) { return { realmId:share.realmId, charId:ruler(s, share.realmId).id,
        generation:FB.realmRulerGeneration(s, share.realmId) }; });
      return { allowed:children.length >= 2 && shares.length > 0 && !FB.isRealmAtWar(s, rid),
        plan:{ rulerId:king.id, generation:FB.realmRulerGeneration(s, rid),
          primaryId:children.length ? children[0].id : null, shares:shares } };
    }
    if (def.type === 'designated_succession') {
      var sons = heirs(s, rid), family = crown.succession;
      var grants = sons.slice(1, def.regions.length + 1).map(function (m, i) {
        var region = def.regions[i];
        return { memberId:m.id, region:region.id, counties:counties(s, rid, region) };
      });
      var valid = sons.length >= 2 && grants.every(function (grant, i) {
        var region = def.regions[i].grant, member = family.members[grant.memberId];
        var person = member.charId && s.chars[member.charId];
        return grant.counties.indexOf(region.capital) >= 0 && !s.realms[region.id] &&
          (!person || person.id !== s.player.charId && !FB.isReigningRealmRuler(s, person)) &&
          FB.royalRegionQuote(s, rid, grant.counties);
      });
      return { allowed:!!valid && !FB.isRealmAtWar(s, rid),
        plan:{ rulerId:king.id, generation:FB.realmRulerGeneration(s, rid),
          primaryId:sons.length ? sons[0].id : null, shares:grants } };
    }
    if (def.source) {
      var other = s.realms[def.source.realmId], otherKing = ruler(s, def.source.realmId);
      if (!otherKing || def.source.character && otherKing.id !== FB.stories.resolve(s, def.source.character)) return { terminal:'interrupted' };
      if (!other || !other.alive || other.liege || s.owner[def.source.capital] !== def.source.realmId) return { terminal:'diverted' };
      var peaceful = !FB.isRealmAtWar(s, rid) && !FB.isRealmAtWar(s, def.source.realmId);
      var check = { allowed:peaceful, parties:[king.id,otherKing.id],
        generations:[FB.realmRulerGeneration(s, rid),FB.realmRulerGeneration(s, def.source.realmId)] };
      if (def.type === 'diplomatic_exchange') {
        check.allowed = peaceful && FB.treasuryAvailable(s, rid) >= def.actorGift &&
          FB.treasuryAvailable(s, def.source.realmId) >= def.sourceGift;
      } else {
        var coast = FB.stories.resolve(s, def.region);
        if (def.requireImperial && !FB.realmRank.isImperial(other, s) || coast.some(function (pid) {
          return [rid,def.source.realmId].indexOf(s.owner[pid]) < 0;
        })) return { terminal:'diverted' };
        check.allowed = peaceful && (!def.requireImperial || FB.realmRank.isImperial(crown, s));
        check.coast = coast.map(function (pid) { return s.owner[pid]; });
      }
      return check;
    }
    var settlement = FB.stories.resolve(s, def.planRef);
    if (!settlement || king.id === settlement.rulerId) return { allowed:false };
    var primary = crown.succession && crown.succession.members[settlement.primaryId];
    if (!primary || primary.charId !== king.id) return { terminal:'interrupted' };
    var juniors = settlement.shares.filter(function (share) {
      var c = ruler(s, share.realmId), realm = s.realms[share.realmId];
      return c && c.id === share.charId && realm && (!realm.liege || realm.liege === rid);
    });
    if (juniors.length < def.regions.length) return { allowed:false };
    var parties = [rid].concat(juniors.map(function (share) { return share.realmId; }));
    var wars = FB.ordinaryWars(s).filter(function (war) {
      return parties.indexOf(war.attacker) >= 0 || parties.indexOf(war.defender) >= 0;
    });
    if (wars.some(function (war) { return parties.indexOf(war.attacker) < 0 || parties.indexOf(war.defender) < 0; }) ||
        parties.some(function (party) { return FB.greatHolyWarCamp && FB.greatHolyWarCamp(s, party); })) return { allowed:false };
    var partitions = juniors.slice(0, def.regions.length).map(function (share, i) {
      var region = def.regions[i], selected = counties(s, rid, region), owned = FB.realmTerritory(s, share.realmId);
      if (s.realms[share.realmId].liege === rid)
        selected = selected.filter(function (pid) { return owned.indexOf(pid) < 0; }).concat(owned).sort();
      return { realmId:share.realmId, charId:share.charId, generation:FB.realmRulerGeneration(s, share.realmId),
        region:region.id, counties:selected };
    });
    var occupied = {}, validPartition = partitions.every(function (part) {
      return part.counties.every(function (pid) {
        if (occupied[pid]) return false; occupied[pid] = true; return true;
      }) && !!FB.royalRegionQuote(s, rid, part.counties, parties);
    });
    return { allowed:validPartition, plan:{ rulerId:king.id, generation:FB.realmRulerGeneration(s, rid),
      primaryId:primary.id, shares:partitions, warIds:wars.map(function (war) { return war.id; }) } };
  }
  function parties(s, rec, def, check) {
    return [def.actor.realmId].concat(def.source ? [def.source.realmId] :
      def.type === 'treaty_settlement' && check.plan ? check.plan.shares.map(function (share) { return share.realmId; }) : []);
  }
  function controlled(s, rid) {
    var c = ruler(s, rid);
    return rid === 'player' || !!(c && c.id === s.player.charId);
  }
  function quote(s, rec, def, choice) {
    var check = terms(s, rec, def), actors = parties(s, rec, def, check);
    var facts = { check:check, turn:s.turn, year:s.date.year, record:rec, owner:s.owner, holder:s.holder,
      funds:actors.map(function (rid) { return FB.treasuryAvailable(s, rid); }),
      courts:actors.map(function (rid) { return [ruler(s, rid),FB.realmRulerGeneration(s, rid)]; }) };
    return { id:choice, allowed:['approve','decline'].indexOf(choice) >= 0 && !!check.allowed,
      consentStamp:JSON.stringify([check, actors.map(function (rid) {
        var c = ruler(s, rid); return [c && c.id,FB.realmRulerGeneration(s, rid)];
      })]),
      reason:'living_courts', facts:facts, stamp:JSON.stringify(facts) };
  }
  function commit(s, rec, def, q) {
    var rid = def.actor.realmId, plan = q.facts.check.plan;
    if (def.type === 'succession_partition') {
      if (!FB.designateRoyalHeir(s, rid, plan.primaryId)) return false;
      rec.plan = plan; rec.phase = 'planned'; rec.turn = s.turn;
    } else if (def.type === 'designated_succession') {
      for (var grant of plan.shares) {
        var person = FB.materializeRoyalMember(s, rid, grant.memberId);
        if (!person || FB.isReigningRealmRuler(s, person)) return false;
        grant.charId = person.id;
      }
      if (!FB.designateRoyalHeir(s, rid, plan.primaryId)) return false;
      for (var share of plan.shares) {
        var region = def.regions.filter(function (row) { return row.id === share.region; })[0].grant;
        var realm = FB.makeVassalRealm(s, { id:region.id, capital:region.capital, rank:region.rank,
          liege:rid, titleKind:region.titleKind, titleId:region.titleId });
        FB.assignRealmRulerCharacter(s, realm.id, share.charId);
        FB.grantRoyalRegion(s, rid, realm.id, share.counties);
        share.realmId = realm.id; share.generation = FB.realmRulerGeneration(s, realm.id); delete share.counties;
      }
      rec.plan = plan; finish(s, rec, 'agreed');
    } else if (def.type === 'diplomatic_exchange') {
      if (!FB.treasuryTransfer(s, rid, def.source.realmId, def.actorGift)) return false;
      FB.treasuryTransfer(s, def.source.realmId, rid, def.sourceGift);
      // Opinion changes are optional data terms. The shipped exchange keeps zero.
      // The existing opinion score is relative to the player. AI-to-AI courts
      // have no pairwise opinion ledger, so those exchanges only fund peace.
      if (def.opinion) for (var party of [rid,def.source.realmId]) {
        var other = party === rid ? def.source.realmId : rid, person = ruler(s, other);
        if (controlled(s, party) && person && s.chars[person.id])
          s.chars[person.id].opinion = Math.max(-100, Math.min(100, s.chars[person.id].opinion + def.opinion));
      }
      truce(s, rid, def.source.realmId, def.truceDays); finish(s, rec, 'agreed');
    } else if (def.type === 'recognition') {
      var actor = { kind:'realm', id:rid };
      var proof = FB.political.legitimacy(s, actor, actor, def.authoritySource).filter(function (row) {
        return row.issuer.kind === 'realm' && row.issuer.id === def.source.realmId;
      })[0] || FB.authorityRecognize(s, { source:def.authoritySource,
        issuer:{ kind:'realm', id:def.source.realmId }, subject:actor, scope:actor });
      if (!proof) return false;
      for (var pid of FB.stories.resolve(s, def.region)) if (s.owner[pid] === rid) FB.transferProvince(s, pid, def.source.realmId);
      rec.plan = { recognitionId:proof.id }; truce(s, rid, def.source.realmId, def.truceDays); finish(s, rec, 'agreed');
    } else {
      for (var warId of plan.warIds) FB.settleOrdinaryWar(s, warId, 'white_peace');
      for (var part of plan.shares) {
        if (!FB.grantRoyalRegion(s, rid, part.realmId, part.counties)) return false;
        var title = def.regions.filter(function (row) { return row.id === part.region; })[0].titleId;
        FB.setRealmTitle(s, s.realms[part.realmId], 'kingdom', title);
      }
      for (var part of plan.shares) FB.releaseRoyalRegion(s, rid, part.realmId);
      for (var i = 0; i < plan.shares.length; i++) {
        truce(s, rid, plan.shares[i].realmId, def.truceDays);
        for (var j = i + 1; j < plan.shares.length; j++) truce(s, plan.shares[i].realmId, plan.shares[j].realmId, def.truceDays);
      }
      rec.plan = plan; finish(s, rec, 'agreed');
    }
    notice(s, def, 'agreed'); return true;
  }
  function day(s, rec, def) {
    var rid = def.actor.realmId, king = ruler(s, rid);
    if (rec.phase === 'planned') {
      if (king && king.id === rec.plan.rulerId) {
        var family = s.realms[rid].succession, primary = family.members[rec.plan.primaryId];
        if (!primary || primary.alive === false || primary.charId && !live(s, primary.charId)) {
          var surviving = heirs(s, rid);
          if (surviving.length && FB.designateRoyalHeir(s, rid, surviving[0].id)) rec.plan.primaryId = surviving[0].id;
        }
      } else {
        if (!king || !s.realms[rid].alive || s.owner[def.actor.capital] !== rid) { finish(s, rec, 'diverted'); return; }
        if (FB.isRealmAtWar(s, rid)) return;
        for (var share of rec.plan.shares) {
          var current = ruler(s, share.realmId);
          if (current && current.id === share.charId && share.charId !== king.id) FB.releaseRoyalRegion(s, rid, share.realmId);
        }
        finish(s, rec, 'executed'); notice(s, def, 'executed');
      }
    }
    if (rec.phase !== 'pending') return;
    if (s.date.year > def.lastYear) { finish(s, rec, 'expired'); return; }
    if (s.date.year >= def.firstYear) {
      var check = terms(s, rec, def);
      if (check.terminal) finish(s, rec, check.terminal);
    }
  }
  function pressure(s, rec, def, tick) {
    if (!def.pressure || !rec.pressure) return;
    var plan = FB.stories.resolve(s, def.planRef), rid = def.actor.realmId, king = ruler(s, rid), p = rec.pressure;
    if (!plan || !king || king.id === plan.rulerId || p.season === tick || p.warId || rec.result === 'agreed') return;
    p.season = tick;
    var juniors = plan.shares.filter(function (share) {
      var c = ruler(s, share.realmId);
      return c && c.id === share.charId && s.realms[share.realmId].liege === rid;
    });
    if (!juniors.length) return;
    p.amount = Math.min(def.pressure.threshold, p.amount + 1);
    if (p.amount < def.pressure.threshold || FB.isRealmAtWar(s, rid) || !FB.chance(def.pressure.chance)) return;
    var rebel = juniors[0].realmId;
    if (FB.truceExpiry(s, rid, rebel) || !FB.releaseRoyalRegion(s, rid, rebel)) return;
    var war = FB.registerOrdinaryWar(s, rid, { enemy:rebel, legacy:false,
      casus:{ type:'independence', rebel:rebel, formerLiege:rid, rebelCharId:ruler(s, rebel).id } });
    if (!war) {
      s.realms[rebel].liege = rid;
      for (var pid of FB.realmTerritory(s, rebel)) s.owner[pid] = rid;
      FB.invalidateRealmCache(); return;
    }
    p.warId = war.id; p.rebelId = rebel; notice(s, def, 'pressure');
  }
  function validate(rec, s, def) {
    function bad(field) { throw new Error(FB.T('Invalid v4 save field at {path}.', { path:'state.stories.' + def.id + '.' + field })); }
    function turn(v) { return integer(v) && v <= s.turn; }
    if (!plain(rec) || ['pending','planned','resolved'].indexOf(rec.phase) < 0 ||
        rec.phase === 'planned' && def.type !== 'succession_partition' ||
        rec.phase === 'resolved' && ['agreed','executed','declined','expired','interrupted','diverted'].indexOf(rec.result) < 0 ||
        rec.result === 'executed' && def.type !== 'succession_partition' ||
        rec.phase !== 'resolved' && rec.result !== null || rec.phase === 'pending' && rec.turn !== null ||
        rec.phase !== 'pending' && !turn(rec.turn) || rec.attemptSeason !== null && !integer(rec.attemptSeason) ||
        !plain(rec.approvals) || Object.keys(rec.approvals).some(function (rid) {
          var approval = rec.approvals[rid];
          return !s.realms[rid] || !plain(approval) || !integer(approval.generation) || typeof approval.stamp !== 'string';
        })) bad('record');
    if (rec.phase === 'pending' && rec.plan !== null) bad('plan');
    if (def.cast && (!plain(rec.cast) || Object.keys(rec.cast).length !== Object.keys(def.cast).length ||
        Object.keys(def.cast).some(function (key) { return !id(rec.cast[key]); }))) bad('cast');
    if (def.pressure) {
      var p = rec.pressure;
      if (!plain(p) || !integer(p.amount) || p.amount > def.pressure.threshold || p.season !== null && !integer(p.season) ||
          p.warId !== null && !id(p.warId) || p.rebelId !== null && (!id(p.rebelId) || !s.realms[p.rebelId]) ||
          (p.warId === null) !== (p.rebelId === null)) bad('pressure');
    }
    if (rec.plan === null) {
      if (rec.phase === 'planned' || rec.result === 'executed' || rec.result === 'agreed' && def.type !== 'diplomatic_exchange') bad('plan');
      return;
    }
    if (!plain(rec.plan)) bad('plan');
    if (def.type === 'recognition') { if (!id(rec.plan.recognitionId)) bad('recognitionId'); return; }
    if (def.type === 'diplomatic_exchange') bad('plan');
    var plan = rec.plan;
    if (!id(plan.rulerId) || !integer(plan.generation) || !id(plan.primaryId) || !Array.isArray(plan.shares) ||
        !plan.shares.length || plan.shares.length > (def.shares || def.regions).length) bad('plan');
    if (def.type === 'treaty_settlement' && (!Array.isArray(plan.warIds) ||
        plan.warIds.some(function (warId, i) { return !id(warId) || plan.warIds.indexOf(warId) !== i; }))) bad('warIds');
    var seen = {};
    for (var share of plan.shares) {
      if (!plain(share) || !id(share.realmId) || !s.realms[share.realmId] || seen[share.realmId] || !id(share.charId) || !integer(share.generation)) bad('share');
      seen[share.realmId] = true;
      if (def.regions && !def.regions.some(function (region) { return region.id === share.region; })) bad('region');
      if (def.type === 'designated_succession' && !id(share.memberId)) bad('memberId');
      if (def.type === 'treaty_settlement' && (!Array.isArray(share.counties) || !share.counties.length || share.counties.some(function (pid, i) {
        return share.counties.indexOf(pid) !== i || !(FB.campaignBookmark(s).provinces || []).some(function (p) { return p.id === pid && !p.wasteland; });
      }))) bad('counties');
    }
  }
  function factory(def) {
    definition(def);
    Object.keys(def.news).forEach(function (key) { FB.registerMessage(def.news[key].key, { text:def.news[key].text }); });
    function effective(s) { return FB.stories.definition(s, def); }
    function labels(rec) {
      var states = { pending:FB.T('Awaiting conditions'), planned:FB.T('Awaiting succession'),
        agreed:FB.T('Agreement concluded'), executed:FB.T('Inheritance shares executed'), declined:FB.T('Declined'),
        expired:FB.T('Opportunity expired'), interrupted:FB.T('Court changed'), diverted:FB.T('Territory changed') };
      return states[rec.result || rec.phase];
    }
    return { id:def.id, kind:'world', requires:def.requires || [], fields:['plan'].concat(def.cast ? ['cast'].concat(Object.keys(def.cast).map(function (key) { return 'cast.' + key; })) : []),
      init:function (s) {
        var d = effective(s), rec = fresh();
        if (d.cast) {
          var realm = s.realms[d.actor.realmId];
          if (!realm || !realm.succession || !realm.succession.authoredCourt) return null;
          for (var rid of d.branchRealmIds) FB.linkRoyalBranch(s, d.actor.realmId, rid, realm.succession.rulerMemberId);
          rec.cast = {};
          Object.keys(d.cast).forEach(function (key) { rec.cast[key] = FB.stories.resolve(s, d.cast[key]); });
        }
        if (d.pressure) rec.pressure = { amount:0, season:null, warId:null, rebelId:null };
        return rec;
      },
      day:function (s, rec) { day(s, rec, effective(s)); },
      season:function (s, rec) {
        var d = effective(s), tick = s.date.year * 4 + s.date.season;
        day(s, rec, d);
        if (rec.phase === 'pending' && rec.attemptSeason !== tick) {
          var q = quote(s, rec, d, 'approve'), players = parties(s, rec, d, q.facts.check).filter(function (rid) { return controlled(s, rid); });
          if (q.allowed && players.every(function (rid) {
            var approval = rec.approvals[rid];
            return approval && approval.generation === FB.realmRulerGeneration(s, rid) && approval.stamp === q.consentStamp;
          })) {
            rec.attemptSeason = tick;
            if (FB.chance(d.chance)) commit(s, rec, d, quote(s, rec, d, 'approve'));
          }
        }
        pressure(s, rec, d, tick);
      },
      title:function (s) { return FB.dataText(s, null, 'storyCampaign', def.id, def, 'name', {}); },
      intro:function (s) { return FB.dataText(s, null, 'storyCampaign', def.id, def, 'desc', {}); },
      status:function (s, rec) { return { phase:rec.phase, name:labels(rec),
        lines:rec.phase === 'pending' && Object.keys(rec.approvals).length ?
          [FB.T('Your authorization is recorded. The other courts may accept at a seasonal review; changed parties or shares require another review.')] : [] }; },
      choices:function (s, rec) {
        var d = effective(s), q = quote(s, rec, d, 'approve');
        if (rec.phase !== 'pending' || s.date.year < d.firstYear || !parties(s, rec, d, q.facts.check).some(function (rid) { return controlled(s, rid); })) return [];
        return [{ id:'approve', label:FB.T('Approve the agreement'), detail:FB.T('Authorize the current terms. Living parties and current resources must still permit the settlement.') },
          { id:'decline', label:FB.T('Decline the agreement'), detail:FB.T('Close this opportunity without a payment or territorial grant.') }];
      },
      quote:function (s, rec, choice) { return quote(s, rec, effective(s), choice); },
      blocker:function () { return FB.T('The agreement requires its living rulers, declared territory, date window, peaceful courts and sufficient funds.'); },
      review:function (s, rec, choice, reviewed) {
        var d = effective(s), lines = choice === 'decline' ? [FB.T('This opportunity closes without payment, recognition or a territorial grant.')] :
          [FB.dataText(s, null, 'storyCampaign', d.id, d, 'desc', {})];
        if (choice === 'approve' && d.type === 'diplomatic_exchange') lines.push(FB.T('Your court sends {money:sent} and receives {money:received}.',
          { sent:controlled(s, d.actor.realmId) ? d.actorGift : d.sourceGift, received:controlled(s, d.actor.realmId) ? d.sourceGift : d.actorGift }));
        if (choice === 'approve' && d.truceDays) lines.push(FB.T('Peace term: {days} days.', { days:d.truceDays }));
        var plan = reviewed && reviewed.facts && reviewed.facts.check.plan;
        if (choice === 'approve' && plan) {
          var family = s.realms[d.actor.realmId].succession, heir = family.members[plan.primaryId];
          lines.push(FB.T('Senior heir: {person}.', { person:heir.name }));
          plan.shares.forEach(function (share) {
            if (d.type === 'succession_partition') lines.push(FB.T('{realm} becomes independent after succession if its present ruler survives.',
              { realm:FB.realmNameParam(s, share.realmId) }));
            else lines.push(FB.T('{person}: {counties}.', { person:share.memberId ? family.members[share.memberId].name : ruler(s, share.realmId).name,
              counties:share.counties.map(function (pid) { return FB.world.byId[pid].name; }).join(', ') }));
          });
        }
        if (choice === 'approve' && d.type === 'recognition') lines.push(FB.T('Recognition: {source}. Returned counties: {counties}.',
          { source:FB.legitimacySourceName(s, d.authoritySource), counties:FB.stories.resolve(s, d.region).filter(function (pid) {
            return s.owner[pid] === d.actor.realmId;
          }).map(function (pid) { return FB.world.byId[pid].name; }).join(', ') }));
        return lines;
      },
      apply:function (s, rec, choice, reviewed) {
        var d = effective(s), q = quote(s, rec, d, choice);
        if (!q.allowed || !reviewed || reviewed.id !== choice || reviewed.stamp !== q.stamp) return false;
        if (choice === 'decline') { finish(s, rec, 'declined'); return true; }
        var players = parties(s, rec, d, q.facts.check).filter(function (rid) { return controlled(s, rid); });
        if (players.length) {
          players.forEach(function (rid) { rec.approvals[rid] = { generation:FB.realmRulerGeneration(s, rid), stamp:q.consentStamp }; });
          return true;
        }
        return commit(s, rec, d, q);
      },
      validate:function (rec, s) { validate(rec, s, effective(s)); }
    };
  }
  ['succession_partition','designated_succession','diplomatic_exchange','recognition','treaty_settlement'].forEach(function (type) {
    FB.stories.registerType(type, factory, 'js/story_settlements.js', definition);
  });
})();
