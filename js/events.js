/* Fallowborn — event engine: triggers, weights, effects, templating */
window.FB = window.FB || {};

(function () {
  'use strict';

  /* ---------- supporting cast (roles) ---------- */
  FB.getRole = function (state, role, create) {
    if (role === 'spouse') {
      return FB.spouseOf(state, state.chars[state.player.charId]);
    }
    if (role === 'suitor') {
      return state.player.courtingId ? state.chars[state.player.courtingId] : null;
    }
    const id = state.roles[role];
    if (id && state.chars[id] && !state.chars[id].dead) return state.chars[id];
    if (!create) return null;
    const pr = FB.world.byId[state.player.provinceId];
    const me = state.chars[state.player.charId];
    let opts = { culture: pr.culture, religion: pr.religion, born: state.date.year - FB.ri(25, 55), role: role };
    if (role === 'lord') { opts.quality = 4; opts.sex = 'm'; opts.dyn = 'of ' + pr.name; opts.station = 3; }
    else if (role === 'priest') { opts.quality = 2; opts.sex = 'm'; opts.born = state.date.year - FB.ri(30, 60); opts.station = 1; }
    else if (role === 'friend' || role === 'rival') {
      opts.born = state.date.year - FB.clamp(FB.ageOf(me, state.date.year) + FB.ri(-8, 8), 16, 70);
      opts.opinion = role === 'friend' ? 30 : -25;
      opts.station = Math.min(FB.playerStation(state), 3); // friends and rivals are peers
    }
    const c = FB.makeCharacter(state, opts);
    state.roles[role] = c.id;
    return c;
  };

  /* Living spouse of a character — self-healing: a link to a dead or missing
     character is stale (older bugs could leave one) and gets cleared here.
     Under polygamy this is the FIRST wife; FB.spousesOf lists them all. */
  FB.spouseOf = function (state, c) {
    if (!c || !c.spouseId) return null;
    const sp = state.chars[c.spouseId];
    if (!sp || sp.dead) { c.spouseId = null; return null; }
    return sp;
  };

  /* All living spouses. Every wife's spouseId points at the husband; his own
     spouseId holds only the first, so the rest are found by scanning. */
  FB.spousesOf = function (state, c) {
    const out = [];
    if (!c) return out;
    const first = FB.spouseOf(state, c);
    if (first) out.push(first);
    for (const id in state.chars) {
      const o = state.chars[id];
      if (!o.dead && o.spouseId === c.id && (!first || o.id !== first.id)) out.push(o);
    }
    return out;
  };

  /* May the player take a(nother) spouse? Polygyny only — a man of a faith
     that permits it may hold several wives; everyone else weds one at a time. */
  FB.canWed = function (state) {
    const me = state.chars[state.player.charId];
    const n = FB.spousesOf(state, me).length;
    if (n === 0) return true;
    if (me.sex !== 'm') return false;
    return n < FB.marriageDoctrine(me.religion).wives;
  };

  /* The first wife has died or been set aside — the next steps up. */
  FB.promoteSpouse = function (state) {
    const me = state.chars[state.player.charId];
    if (me.spouseId && state.chars[me.spouseId] && !state.chars[me.spouseId].dead) return;
    me.spouseId = null;
    for (const id in state.chars) {
      const o = state.chars[id];
      if (!o.dead && o.spouseId === me.id) { me.spouseId = o.id; state.roles.spouse = o.id; return; }
    }
    delete state.roles.spouse;
  };

  /* Dissolve a marriage (divorce or annulment — the caller pays the costs
     and tells the story). Children and their claims are untouched. */
  FB.doDivorce = function (state, spId) {
    const me = state.chars[state.player.charId];
    const sp = state.chars[spId];
    if (!sp) return;
    if (me.spouseId === sp.id) me.spouseId = null;
    if (sp.spouseId === me.id) sp.spouseId = null;
    if (state.roles.spouse === sp.id) delete state.roles.spouse;
    if (sp.role === 'spouse') sp.role = null;
    sp.opinion = FB.clamp(sp.opinion - 50, -100, 100);
    FB.promoteSpouse(state);
  };

  /* The one true way to kill a character: severs marriage links and roles.
     A death also unmakes any betrothal, and a dowry settled at the pledge
     but not yet wed for returns to the player's coffers. */
  FB.killChar = function (state, c) {
    if (!c || c.dead) return;
    c.dead = true;
    if (c.betrothedId && c.dowryAsk) {
      state.player.gold += c.dowryAsk;
      delete c.dowryAsk;
    }
    c.betrothedId = null;
    for (const id in state.chars) {
      if (state.chars[id].spouseId === c.id) state.chars[id].spouseId = null;
      if (state.chars[id].betrothedId === c.id) {
        const o = state.chars[id];
        o.betrothedId = null;
        if (o.dowryAsk) { state.player.gold += o.dowryAsk; delete o.dowryAsk; }
      }
    }
    FB.discardMatches(state, c, null);
    for (const r in state.roles) {
      if (state.roles[r] === c.id) delete state.roles[r];
    }
    if (state.player.courtingId === c.id) {
      state.player.courtingId = null;
      delete state.player.flags.courting;
    }
  };

  /* Can the player begin courting this character? */
  FB.canCourt = function (state, c) {
    const me = state.chars[state.player.charId];
    if (!c || c.dead || c.id === me.id) return false;
    const y = state.date.year;
    if (FB.ageOf(me, y) < 16 || FB.ageOf(c, y) < 16) return false;
    if (c.sex === me.sex) return false;
    if (!FB.canWed(state) || FB.spouseOf(state, c)) return false;
    if (c.betrothedId) return false; // pledged to another
    // actual kin only (dynasty names like "of Ribe" are shared by strangers)
    if (me.childrenIds.indexOf(c.id) >= 0) return false;
    if (c.childrenIds && c.childrenIds.indexOf(me.id) >= 0) return false;
    if (me.fatherId && me.fatherId === c.fatherId) return false;
    if (me.motherId && me.motherId === c.motherId) return false;
    if (c.role === 'sibling' && c.dyn === me.dyn) return false;
    // close blood — grandparents, aunts/uncles, nieces/nephews — is out; cousins are fair game
    const krel = FB.kinOf(state).byId[c.id];
    if (krel && krel !== 'Cousin') return false;
    if (state.player.profession === 'monk' && FB.religionOf(me.religion).group !== 'muslim') return false;
    if (state.player.courtingId === c.id) return false;
    // the great families do not entertain suits from far beneath them
    if (FB.stationOf(c) - FB.playerStation(state) >= 3) return false;
    return true;
  };

  /* Notable folk of a province — the local cast for the player's home,
     lazily-generated worthies elsewhere (persisted in state.provChars). */
  function lordWord(pr) {
    const g = FB.religionOf(pr.religion).group;
    return g === 'muslim' ? 'Emir' : g === 'pagan' ? 'Chief' : 'Lord';
  }
  FB.provNotables = function (state, pid) {
    const pr = FB.world.byId[pid];
    if (!pr || pr.wasteland) return [];
    if (pid === state.player.provinceId) {
      FB.getRole(state, 'lord', true);
      FB.getRole(state, 'priest', true);
      const out = [];
      for (const r of ['lord', 'priest', 'friend', 'rival']) {
        const c = FB.getRole(state, r, false);
        if (c && !c.dead) out.push(c);
      }
      return out;
    }
    state.provChars = state.provChars || {};
    let alive = (state.provChars[pid] || []).map(function (id) { return state.chars[id]; })
      .filter(function (c) { return c && !c.dead; });
    if (!alive.length) {
      const y = state.date.year;
      const ids = [];
      function mk(opts, epithet) {
        const c = FB.makeCharacter(state, opts);
        c.epithet = epithet;
        ids.push(c.id);
        return c;
      }
      const lw = lordWord(pr);
      const lord = mk({ culture: pr.culture, religion: pr.religion, sex: 'm', born: y - FB.ri(28, 55), quality: 4, role: 'notable', station: 3 },
        lw + ' of ' + pr.name);
      lord.dyn = 'of ' + pr.name;
      const hw = FB.holyWord(pr.religion);
      mk({ culture: pr.culture, religion: pr.religion, sex: 'm', born: y - FB.ri(30, 60), quality: 2, role: 'notable', station: 1 },
        hw.charAt(0).toUpperCase() + hw.slice(1));
      const mkt = (state.dev[pid] || 1) >= 5;
      mk({ culture: pr.culture, religion: pr.religion, born: y - FB.ri(38, 62), quality: 2, role: 'notable', station: mkt ? 2 : 1 },
        mkt ? 'Master of the market' : 'Village elder');
      for (let i = 0; i < 2; i++) {
        const kin = mk({ culture: pr.culture, religion: pr.religion, born: y - FB.ri(16, 26), quality: FB.ri(0, 2), role: 'notable', station: 3 }, null);
        kin.dyn = lord.dyn;
        kin.epithet = (kin.sex === 'f' ? 'Daughter' : 'Son') + ' of the ' + lw.toLowerCase() + '’s house';
      }
      state.provChars[pid] = ids;
      alive = ids.map(function (id) { return state.chars[id]; });
    }
    return alive;
  };

  /* Matchmaking finds folk from the player's own walk of life — mostly equals,
     sometimes a step down, rarely a step up. Whom the player pursues on their
     own (character sheets) is gated separately in FB.canCourt. */
  const SUITOR_EPITHETS = [
    { m: ['Plowman’s son', 'Shepherd', 'Woodcutter’s son', 'Hired hand at the manor'],
      f: ['Plowman’s daughter', 'Goose girl', 'Woodcutter’s daughter', 'Dairymaid'] },
    { m: ['Free farmer’s son', 'Miller’s son', 'Smith’s son', 'Fisherman with his own boat'],
      f: ['Free farmer’s daughter', 'Miller’s daughter', 'Weaver', 'Alewife’s daughter'] },
    { m: ['Merchant’s son', 'Guildmaster’s son', 'Steward of a manor', 'Rich yeoman’s son'],
      f: ['Merchant’s daughter', 'Guildmaster’s daughter', 'Goldsmith’s daughter', 'Rich yeoman’s daughter'] },
    { m: ['Knight’s son', 'Castellan’s son', 'Of an old noble house'],
      f: ['Knight’s daughter', 'Castellan’s daughter', 'Of an old noble house'] }
  ];
  FB.spawnSuitor = function (state) {
    const me = state.chars[state.player.charId];
    const pr = FB.world.byId[state.player.provinceId];
    const myAge = FB.ageOf(me, state.date.year);
    const ps = FB.playerStation(state);
    const r = FB.rng();
    const st = FB.clamp(ps + (r < 0.2 ? -1 : r < 0.85 ? 0 : 1), 0, 3);
    const c = FB.makeCharacter(state, {
      sex: me.sex === 'm' ? 'f' : 'm',
      culture: pr.culture, religion: me.religion,
      born: state.date.year - FB.clamp(myAge + FB.ri(-6, 4), 16, 45),
      role: 'suitor', opinion: FB.ri(-10, 25),
      station: st, quality: st + FB.ri(0, 1)
    });
    c.epithet = FB.pick(SUITOR_EPITHETS[st][c.sex]);
    state.player.courtingId = c.id;
    return c;
  };

  /* ---------- arranged matches for the player's children ----------
     A parent sounds out three families (stations around the player's own,
     stored on the child as matchIds so the same three wait until a pledge is
     sealed or the child weds elsewhere). Sealing betroths the pair; the
     yearly kin tick weds them once both are sixteen. Dowries follow the
     custom of the age: a daughter's family settles hers when the pledge is
     sealed (returned by killChar if death unmakes it), a son's bride brings
     hers to the wedding. */
  FB.spawnMatchCandidates = function (state, child) {
    if (child.matchIds) {
      const kept = [];
      for (const id of child.matchIds) {
        const m = state.chars[id];
        if (m && !m.dead && !m.spouseId && !m.betrothedId) kept.push(m);
      }
      if (kept.length) return kept;
    }
    const ps = FB.playerStation(state);
    const y = state.date.year;
    const cAge = FB.ageOf(child, y);
    const out = [];
    child.matchIds = [];
    for (const step of [-1, 0, 1]) {
      const st = FB.clamp(ps + step, 0, 3);
      const m = FB.makeCharacter(state, {
        sex: child.sex === 'm' ? 'f' : 'm',
        culture: child.culture, religion: child.religion,
        born: y - FB.clamp(cAge + FB.ri(-2, 5), 12, 40),
        role: 'match', station: st, quality: st + FB.ri(0, 1)
      });
      m.epithet = FB.pick(SUITOR_EPITHETS[st][m.sex]);
      const sum = Math.round((FBDATA.balance.dowryByStation[st] || 0) * FB.rf(0.7, 1.3));
      if (child.sex === 'f') m.dowryAsk = sum; else m.dowryDue = sum;
      out.push(m);
      child.matchIds.push(m.id);
    }
    return out;
  };

  /* the families not chosen are told no and forgotten */
  FB.discardMatches = function (state, child, keptId) {
    if (!child.matchIds) return;
    for (const id of child.matchIds) {
      const m = state.chars[id];
      if (m && id !== keptId && m.role === 'match' && state.player.courtingId !== id) {
        delete state.chars[id];
      }
    }
    child.matchIds = null;
  };

  FB.sealKinMatch = function (state, child, cand) {
    const p = state.player;
    FB.discardMatches(state, child, cand.id);
    child.betrothedId = cand.id;
    cand.betrothedId = child.id;
    cand.role = 'kinspouse';
    if (cand.dowryAsk) {
      p.gold = Math.max(0, p.gold - cand.dowryAsk);
      FB.news(state, '💰 You settle a dowry of ' + cand.dowryAsk + ' gold on the match.');
    }
    FB.news(state, '🤝 ' + child.name + ' is betrothed to ' + cand.name + '.');
    const y = state.date.year;
    if (FB.ageOf(child, y) >= 16 && FB.ageOf(cand, y) >= 16) {
      FB.doKinWedding(state, child, cand);
    }
  };

  /* the pledged wedding of a player's child, fired from sealKinMatch or the
     yearly kin tick; settles the bride's dowry and the standing of the match */
  FB.doKinWedding = function (state, k, sp) {
    const B = FBDATA.balance, p = state.player;
    k.betrothedId = null; sp.betrothedId = null;
    k.spouseId = sp.id; sp.spouseId = k.id;
    sp.role = 'kinspouse';
    FB.news(state, '💒 Your ' + (k.sex === 'f' ? 'daughter' : 'son') + ' ' + k.name +
      ' weds ' + sp.name + ', as was pledged.');
    if (sp.dowryDue) {
      p.gold += sp.dowryDue;
      FB.news(state, '💰 The bride brings a dowry of ' + sp.dowryDue + ' gold to the house.');
      delete sp.dowryDue;
    }
    delete sp.dowryAsk; // settled at the pledge; nothing owed back once wed
    if (sp.station != null) {
      const gap = sp.station - FB.playerStation(state);
      if (gap > 0) {
        p.prestige += Math.round(gap * B.marryUpPrestige / 2);
        FB.news(state, '👑 The match ties your house to a greater one — your name rises.');
      } else if (gap < 0) {
        p.prestige = Math.max(0, p.prestige + Math.round(gap * B.marryDownPrestigeLoss / 2));
        FB.news(state, '🗣 The child of your house weds beneath it, and folk mark it.');
      }
    }
  };

  /* ---------- text templating ----------
     A text field may be a plain string or an object keyed by religion group
     ({default:'…', muslim:'…'}) — resolved against the player's faith, for
     flavor the {god}/{holy}/{temple} tokens cannot carry (drink, pork, bells). */
  FB.fmt = function (state, str, ctx) {
    if (!str) return '';
    const me = state.chars[state.player.charId];
    if (typeof str === 'object') {
      str = str[FB.religionOf(me.religion).group] || str.default;
      if (!str) return '';
    }
    const pr = FB.world.byId[state.player.provinceId];
    const realmId = state.owner[state.player.provinceId];
    const realm = state.realms[realmId];
    function roleName(r) {
      const c = FB.getRole(state, r, true);
      return c ? c.name : 'someone';
    }
    return str.replace(/\{(\w+)\}/g, function (m, k) {
      switch (k) {
        case 'name': return me.name;
        case 'dyn': return me.dyn || '';
        case 'title': return FB.titleFor(state);
        case 'province': return pr ? pr.name : 'this land';
        case 'realm': return realm ? realm.name : 'the realm';
        case 'year': return String(state.date.year);
        case 'settlement': return (ctx && ctx.settlement) || 'the town';
        case 'item': {
          const io = state.player.itemOffer;
          const idef = io && FBDATA.items[io.id];
          return idef ? idef.icon + ' ' + FB.fmt(state, idef.name, {}) : 'a curiosity';
        }
        case 'itemprice': {
          const io2 = state.player.itemOffer;
          return io2 ? String(io2.price) : '?';
        }
        case 'enemy': {
          const w = state.player.war;
          const en = w ? state.realms[w.enemy] : null;
          return en ? en.name : 'the enemy';
        }
        case 'target': {
          const w2 = state.player.war;
          const tp = w2 && w2.target ? FB.world.byId[w2.target] : null;
          return tp ? tp.name : 'their lands';
        }
        case 'warstate': {
          const w3 = state.player.war;
          if (!w3) return '';
          const men = Math.round(Math.max(40, FB.playerLevy(state)) * (w3.strength || 1) + (w3.mercCos || 0) * 150);
          let t = 'Your host: ~' + men + ' men at ' + Math.round((w3.strength || 1) * 100) + '% condition' +
            ((w3.mercCos || 0) ? ', ' + w3.mercCos + ' mercenary compan' + (w3.mercCos > 1 ? 'ies' : 'y') : '');
          if (!w3.defending && w3.target && FB.world.byId[w3.target]) {
            t += ' · siege of ' + FB.world.byId[w3.target].name + ' at ' + (w3.siege || 0) + '/3';
          }
          if (w3.defending) t += ' · the enemy advance stands at ' + (w3.enemySiege || 0) + '/3';
          return t;
        }
        case 'liege': {
          const lr = state.player.liege ? state.realms[state.player.liege] : null;
          return lr ? lr.name : 'your liege';
        }
        case 'rname': {
          const rr = ctx && ctx.rid ? state.realms[ctx.rid] : null;
          return rr ? rr.name : 'the realm';
        }
        case 'rulername': {
          const rr2 = ctx && ctx.rid ? state.realms[ctx.rid] : null;
          return rr2 ? rr2.ruler.name : 'the lord';
        }
        case 'cname': {
          const cp = ctx && ctx.pid ? FB.world.byId[ctx.pid] : null;
          return cp ? cp.name : 'the county';
        }
        case 'god': return FB.godWord(me.religion);
        case 'holy': return FB.holyWord(me.religion);
        case 'temple': return FB.templeWord(me.religion);
        case 'spouse': { const s = FB.getRole(state, 'spouse'); return s ? s.name : 'your spouse'; }
        case 'suitor': { const s = FB.getRole(state, 'suitor'); return s ? s.name + (s.dyn ? ' ' + s.dyn : '') : 'a stranger'; }
        case 'childname': {
          const c = ctx && ctx.childId ? state.chars[ctx.childId] : null;
          return c ? c.name : 'your child';
        }
        case 'late': return (ctx && ctx.lateName) || 'your late spouse';
        case 'lord': case 'priest': case 'friend': case 'rival': return roleName(k);
        default: return m;
      }
    });
  };

  /* ---------- named chance formulas ---------- */
  FB.namedChance = function (state, key) {
    const p = state.player;
    const me = state.chars[p.charId];
    const f = p.flags;
    switch (key) {
      case 'harvest': {
        let c = 0.55 + FB.skillOf(me, 'ste') * 0.018;
        if (f.crop_safe) c += 0.15;
        if (f.crop_risky) c -= 0.08;
        if (f.blessed_crops) c += 0.12;
        if (f.crop_ruined) c = 0.05;
        const pr = FB.world.byId[p.provinceId];
        if (pr && pr.terrain === 'farmland') c += 0.08;
        return FB.clamp(c, 0.05, 0.95);
      }
      case 'battle': {
        let c = 0.40 + FB.skillOf(me, 'mar') * 0.028;
        if (me.traits.indexOf('brave') >= 0) c += 0.05;
        if (me.traits.indexOf('craven') >= 0) c -= 0.1;
        c += FB.holdingBonus(state, 'battle') + FB.itemBonus(state, 'battle');
        if (f.blessed_war) c += 0.06;
        return FB.clamp(c, 0.1, 0.92);
      }
      case 'proposal': {
        const s = FB.getRole(state, 'suitor');
        let c = 0.3 + (s ? s.opinion : 0) / 180 + p.prestige / 600 + p.tier * 0.05;
        const gap = s ? FB.stationOf(s) - FB.playerStation(state) : 0;
        if (gap > 0) c -= gap * FBDATA.balance.proposalStationPenalty; // marrying up is hard
        else c += Math.min(0.1, -gap * 0.05); // marrying down is easy
        if (me.traits.indexOf('comely') >= 0) c += 0.08;
        if (me.traits.indexOf('homely') >= 0) c -= 0.08;
        return FB.clamp(c, 0.05, 0.95);
      }
      case 'house_claim': {
        // pressing a child's claim on the late spouse's house: standing and
        // cunning against their lawyers and pride
        let c = 0.3 + p.prestige / 400 + FB.skillOf(me, 'dip') * 0.02 + FB.skillOf(me, 'int') * 0.02;
        return FB.clamp(c, 0.1, 0.85);
      }
      case 'annulment': {
        // the church weighs a plea to unmake a marriage: piety, learning,
        // and high office speak loudest
        let c = 0.35 + p.piety / 300 + FB.skillOf(me, 'lea') * 0.018;
        if (f.bishop) c += 0.2;
        return FB.clamp(c, 0.1, 0.9);
      }
      case 'skill_ste': return FB.clamp(0.30 + FB.skillOf(me, 'ste') * 0.04, 0.1, 0.9);
      case 'war_battle': {
        const w = p.war;
        if (!w) return 0.5;
        const enemy = state.realms[w.enemy];
        // real men: levy worn by the host's condition, plus mercenary companies
        const myMen = Math.max(40, FB.playerLevy(state)) * (w.strength || 1) + (w.mercCos || 0) * 150;
        const myStr = myMen * (1 + FB.skillOf(me, 'mar') / 14);
        const enStr = FB.realmStrength(state, w.enemy) * FBDATA.balance.levyPerDev * 0.3 *
          (1 + (enemy ? enemy.ruler.mar : 5) / 22);
        let c = myStr / (myStr + enStr);
        c += Math.min(90, w.led || 0) / 90 * 0.1;              // a season spent leading the host
        c += 0.08 * (w.harried || 0) + (w.rested ? 0.05 : 0);  // council preparations
        c += (w.mass ? 0.05 : 0);                              // the great levy
        if (w.defending && FB.hasBuilding(state, 'walls')) c += 0.08;
        c += FB.techBonus(state, 'battle') + FB.holdingBonus(state, 'battle') + FB.itemBonus(state, 'battle');
        if (f.blessed_war) c += 0.06;
        return FB.clamp(c, 0.1, 0.9);
      }
      case 'liege_grant': {
        // no land adjoining the player's to give → the suit fails outright
        if (p.tier >= 4 && !FB.liegeGrantCandidates(state).length) return 0;
        return FB.clamp(0.05 + (p.liegeOp || 0) / 300 + p.prestige / 1200, 0.02, 0.45);
      }
      case 'appeal_outcome': {
        // a suit carried over the liege's head: charm, cunning, and how the
        // high lord already feels about you (p.appealRid set by the picker)
        const rid = p.appealRid;
        let c = FBDATA.balance.appealBase + FB.skillOf(me, 'dip') * 0.025 + FB.skillOf(me, 'int') * 0.025;
        if (rid) c += FB.liegeOpOf(state, rid) / 200;
        return FB.clamp(c, 0.05, 0.9);
      }
      case 'vassal_comply': {
        // a vassal asked to surrender his fief (p.revokeRid set by the picker)
        const rid2 = p.revokeRid;
        let c2 = 0.35 + FB.skillOf(me, 'dip') * 0.025 + p.prestige / 800;
        if (rid2) c2 += FB.liegeOpOf(state, rid2) / 150;
        return FB.clamp(c2, 0.05, 0.95);
      }
      case 'plot': {
        return FB.clamp(0.30 + FB.skillOf(me, 'int') * 0.04, 0.15, 0.9);
      }
      default: return 0.5;
    }
  };

  /* ---------- trigger evaluation ---------- */
  FB.checkTrigger = function (state, tg) {
    if (!tg) return true;
    if (tg.never) return false;
    const p = state.player;
    const me = state.chars[p.charId];
    const age = FB.ageOf(me, state.date.year);
    const pr = FB.world.byId[p.provinceId];

    if (tg.tierMin !== undefined && p.tier < tg.tierMin) return false;
    if (tg.tierMax !== undefined && p.tier > tg.tierMax) return false;
    if (tg.professions && tg.professions.indexOf(p.profession) < 0) return false;
    if (tg.minAge !== undefined && age < tg.minAge) return false;
    if (tg.maxAge !== undefined && age > tg.maxAge) return false;
    if (tg.sex && me.sex !== tg.sex) return false;
    if (tg.seasons && tg.seasons.indexOf(state.date.season) < 0) return false;
    if (tg.yearMin !== undefined && state.date.year < tg.yearMin) return false;
    if (tg.yearMax !== undefined && state.date.year > tg.yearMax) return false;
    if (tg.married !== undefined) {
      const married = !!FB.spouseOf(state, me);
      if (married !== tg.married) return false;
    }
    if (tg.maxSeasonsSinceMarriage !== undefined) {
      // state.turn counts days; data values are in seasons of 90 days
      if (p.marriedAt === undefined || state.turn - p.marriedAt > tg.maxSeasonsSinceMarriage * 90) return false;
    }
    if (tg.hasChildren !== undefined) {
      if ((me.childrenIds.length > 0) !== tg.hasChildren) return false;
    }
    if (tg.hasYoungChild) {
      let ok = false;
      for (const cid of me.childrenIds) {
        const c = state.chars[cid];
        if (c && !c.dead && FB.ageOf(c, state.date.year) < 13) { ok = true; break; }
      }
      if (!ok) return false;
    }
    if (tg.goldMin !== undefined && p.gold < tg.goldMin) return false;
    if (tg.goldMax !== undefined && p.gold > tg.goldMax) return false;
    if (tg.healthMax !== undefined && (me.health === undefined || me.health > tg.healthMax)) return false;
    if (tg.prestigeMin !== undefined && p.prestige < tg.prestigeMin) return false;
    if (tg.pietyMin !== undefined && p.piety < tg.pietyMin) return false;
    if (tg.leaMin !== undefined && FB.skillOf(me, 'lea') < tg.leaMin) return false;
    if (tg.flags) for (const fl of tg.flags) if (!p.flags[fl]) return false;
    if (tg.notFlags) for (const fl of tg.notFlags) if (p.flags[fl]) return false;
    if (tg.buildings) for (const b of tg.buildings) if (!FB.hasBuilding(state, b)) return false;
    if (tg.notBuildings) for (const b of tg.notBuildings) if (FB.hasBuilding(state, b)) return false;
    if (tg.techs) for (const t of tg.techs) if (FB.techList(state).indexOf(t) < 0) return false;
    if (tg.notTechs) for (const t of tg.notTechs) if (FB.techList(state).indexOf(t) >= 0) return false;
    if (tg.holdings) for (const hd of tg.holdings) if (FB.holdingList(state).indexOf(hd) < 0) return false;
    if (tg.notHoldings) for (const hd of tg.notHoldings) if (FB.holdingList(state).indexOf(hd) >= 0) return false;
    if (tg.religionGroup && FB.religionOf(me.religion).group !== tg.religionGroup) return false;
    if (tg.religionGroups && tg.religionGroups.indexOf(FB.religionOf(me.religion).group) < 0) return false;
    if (tg.provinceReligionGroup && (!pr || FB.religionOf(pr.religion).group !== tg.provinceReligionGroup)) return false;
    if (tg.cultures && tg.cultures.indexOf(me.culture) < 0) return false;
    if (tg.provinceCultures && (!pr || tg.provinceCultures.indexOf(pr.culture) < 0)) return false;
    if (tg.terrains && (!pr || tg.terrains.indexOf(pr.terrain) < 0)) return false;
    if (tg.coastal && (!pr || !pr.coastal)) return false;
    if (tg.atWar !== undefined && (!!p.war) !== tg.atWar) return false;
    if (tg.realmAtWar !== undefined) {
      const rid = state.owner[p.provinceId];
      const at = rid ? FB.isRealmAtWar(state, rid) : false;
      if (at !== tg.realmAtWar) return false;
    }
    if (tg.isVassal !== undefined && (!!p.liege) !== tg.isVassal) return false;
    if (tg.isLiege !== undefined && (FB.playerVassals(state).length > 0) !== tg.isLiege) return false;
    if (tg.liegeAtWar !== undefined) {
      const at = p.liege ? FB.isRealmAtWar(state, p.liege) : false;
      if (at !== tg.liegeAtWar) return false;
    }
    if (tg.hasRole && !FB.getRole(state, tg.hasRole, false)) return false;
    if (tg.noRole && FB.getRole(state, tg.noRole, false)) return false;
    if (tg.roleOpinionAbove) {
      const c = FB.getRole(state, tg.roleOpinionAbove.role, false);
      if (!c || c.opinion < tg.roleOpinionAbove.value) return false;
    }
    if (tg.roleOpinionBelow) {
      const c = FB.getRole(state, tg.roleOpinionBelow.role, false);
      if (!c || c.opinion > tg.roleOpinionBelow.value) return false;
    }
    if (tg.popularOpinionBelow !== undefined && p.pop > tg.popularOpinionBelow) return false;
    if (tg.custom && FB.fns[tg.custom] && !FB.fns[tg.custom](state)) return false;
    return true;
  };
  FB.fns = FB.fns || {}; // registry for custom trigger/effect functions (world.js war handlers register earlier; mods may add)

  /* ---------- daily event selection ----------
     Queued events fire at once. Random events land on 1-2 pre-rolled "slot
     days" per season (scheduled in main.js), keeping the old seasonal pacing
     while days tick by. Event cooldowns in data are in seasons (90 days). */
  FB.pickDailyEvents = function (state) {
    const out = [];
    while (state.eventQueue.length && out.length < 3) out.push(state.eventQueue.shift());

    const slots = state.slotDays || [];
    const isSlot = slots.indexOf(state.date.day) >= 0;
    if (isSlot) {
      state.slotDays = slots.filter(function (d) { return d !== state.date.day; });
    }
    if (!isSlot || out.length >= 2) return out;

    // personally at war: only wartime-tagged events fire; the rest of life waits
    const wartime = FB.atWarPersonally(state);
    // a child leads a child's life: only childhood-tagged events fire before 16
    const child = FB.ageOf(state.chars[state.player.charId], state.date.year) < 16;
    const eligible = [];
    for (const ev of FBDATA.events) {
      if (!ev.trigger || ev.trigger.never) continue;
      if (wartime && !ev.wartime) continue;
      if (child && !ev.childhood) continue;
      if (ev.once && state.player.fired[ev.id]) continue;
      if (ev.cooldown && state.player.cooldowns[ev.id] !== undefined &&
        state.turn - state.player.cooldowns[ev.id] < ev.cooldown * 90) continue;
      if (!FB.checkTrigger(state, ev.trigger)) continue;
      if (ev.trigger.chance !== undefined && !FB.chance(ev.trigger.chance)) continue;
      eligible.push(ev);
    }
    if (eligible.length) {
      let total = 0;
      for (const ev of eligible) total += (ev.weight || 5);
      let roll = FB.rng() * total;
      let chosen = eligible[0];
      for (let i = 0; i < eligible.length; i++) {
        roll -= (eligible[i].weight || 5);
        if (roll <= 0) { chosen = eligible[i]; break; }
      }
      out.push({ id: chosen.id, ctx: {}, rnd: true }); // rnd marks an everyday (slot-day) event for autoresolve
    }
    return out;
  };

  /* id → event index, built on first use — mods merge into FBDATA.events at
     boot (storing one reloads the page), before any event resolves */
  let eventIndex = null;
  FB.eventById = function (id) {
    if (!eventIndex) {
      eventIndex = {};
      for (const ev of FBDATA.events) eventIndex[ev.id] = ev;
    }
    return eventIndex[id] || null;
  };

  FB.markFired = function (state, ev) {
    if (ev.once) state.player.fired[ev.id] = 1;
    if (ev.cooldown) state.player.cooldowns[ev.id] = state.turn;
  };

  /* ---------- effects ---------- */
  FB.applyEffects = function (state, fx, ctx) {
    if (!fx) return;
    const p = state.player;
    const me = state.chars[p.charId];
    ctx = ctx || {};

    if (fx.gold !== undefined) {
      let g = fx.gold;
      if (g === 'harvest_good') {
        g = FB.ri(4, 8) + Math.floor(FB.skillOf(me, 'ste') / 3);
        if (p.flags.crop_risky) g += 6;
        if (p.flags.own_ox) g += 2;
        if (p.flags.has_farm) g = Math.round(g * 1.6);
      }
      p.gold = Math.max(0, p.gold + g);
    }
    if (fx.prestige) p.prestige = Math.max(0, p.prestige + fx.prestige);
    if (fx.piety) p.piety = Math.max(0, p.piety + fx.piety);
    if (fx.health) me.health = FB.clamp((me.health === undefined ? 8 : me.health) + fx.health, 0, 10);
    if (fx.skills) {
      for (const k in fx.skills) {
        if (fx.skills[k] > 0) FB.gainSkill(me, k, fx.skills[k]);
        else me.skills[k] = Math.max(0, (me.skills[k] || 0) + fx.skills[k]);
      }
    }
    if (fx.addTrait) FB.addTrait(me, fx.addTrait);
    if (fx.addTraitOnce) FB.addTrait(me, fx.addTraitOnce);
    if (fx.removeTrait) FB.removeTrait(me, fx.removeTrait);
    if (fx.setFlag) p.flags[fx.setFlag] = 1;
    if (fx.setFlag2) p.flags[fx.setFlag2] = 1;
    if (fx.clearFlag) delete p.flags[fx.clearFlag];
    if (fx.clearFlag2) delete p.flags[fx.clearFlag2];
    if (fx.clearHarvestFlags) {
      delete p.flags.crop_safe; delete p.flags.crop_risky; delete p.flags.crop_ruined;
      delete p.flags.blessed_crops; // the blessing is spent with the harvest
    }
    if (fx.opinion) {
      const c = FB.getRole(state, fx.opinion.role, true);
      if (c) c.opinion = FB.clamp(c.opinion + fx.opinion.amt, -100, 100);
    }
    if (fx.opinionLiege) p.liegeOp = FB.clamp((p.liegeOp || 0) + fx.opinionLiege, -100, 100);
    if (fx.popularOpinion) p.pop = FB.clamp(p.pop + fx.popularOpinion, -100, 100);
    if (fx.profession) {
      if (!p.professionBack && p.profession !== 'soldier') p.professionBack = p.profession;
      p.profession = fx.profession;
    }
    if (fx.focusSet) p.focus = fx.focusSet;
    if (fx.restoreProfession) {
      p.profession = p.professionBack || 'farmer';
      p.professionBack = null;
    }
    if (fx.tierSet !== undefined && fx.tierSet > p.tier) {
      p.tier = fx.tierSet;
      if (p.tier >= 3 && !p.liege) {
        const rid = (state.holder && state.holder[p.provinceId]) || state.owner[p.provinceId];
        if (rid && rid !== 'player') p.liege = rid;
      }
      if (p.tier >= 2 && p.profession !== 'monk' && p.profession !== 'priest') p.profession = 'noble';
    }
    if (fx.tierUp) {
      FB.grantByLiege(state);
    }
    if (fx.devUp) {
      const pid = (p.provs && p.provs[0]) || p.provinceId;
      state.dev[pid] = FB.clamp((state.dev[pid] || 1) + fx.devUp, 1, FB.devCap(state, pid));
    }
    if (fx.research) p.research = (p.research || 0) + fx.research;
    if (fx.holding) {
      const hl = FB.holdingList(state);
      if (hl.indexOf(fx.holding) < 0) hl.push(fx.holding);
    }
    if (fx.loseHolding) {
      const hl = FB.holdingList(state);
      const hi = hl.indexOf(fx.loseHolding);
      if (hi >= 0) hl.splice(hi, 1);
    }
    if (fx.marry) FB.doMarry(state);
    if (fx.clearSuitor) {
      p.courtingId = null;
      delete p.flags.courting;
    }
    if (fx.adoptChild) {
      const baby = FB.makeCharacter(state, {
        culture: me.culture, religion: me.religion, born: state.date.year,
        traitsN: 0, fatherId: null, motherId: null
      });
      baby.dyn = me.dyn;
      me.childrenIds.push(baby.id);
    }
    if (fx.killChild) {
      let victim = ctx.childId ? state.chars[ctx.childId] : null;
      if (!victim) {
        const young = me.childrenIds.map(function (id) { return state.chars[id]; })
          .filter(function (c) { return c && !c.dead && FB.ageOf(c, state.date.year) < 13; });
        victim = young.length ? FB.pick(young) : null;
      }
      if (victim) {
        FB.killChar(state, victim);
        FB.news(state, '🕯 ' + victim.name + ' has died, aged ' + FB.ageOf(victim, state.date.year) + '.');
      }
    }
    if (fx.killRole) {
      const c = FB.getRole(state, fx.killRole, false);
      if (c) {
        FB.killChar(state, c);
        if (fx.killRole === 'spouse') { FB.spouseDied(state, c); FB.promoteSpouse(state); }
      }
    }
    if (fx.educateChild && ctx.childId) {
      const c = state.chars[ctx.childId];
      if (c) {
        FB.gainSkill(c, fx.educateChild, 3);
        FB.gainSkill(c, FB.pick(FB.SKILLS), 1);
      }
    }
    if (fx.moveRandom) FB.movePlayerRandom(state);
    if (fx.convertToProvince) {
      const pr = FB.world.byId[p.provinceId];
      if (pr) me.religion = pr.religion;
    }
    if (fx.declareIndependence) FB.doIndependence(state);
    if (fx.pickHeir && FB.ui && FB.ui.showHeirPick) FB.ui.showHeirPick();
    if (fx.queue) state.eventQueue.push({ id: fx.queue, ctx: ctx });
    if (fx.worldNews) FB.randomWorldNews(state);
    if (fx.log) FB.news(state, FB.fmt(state, fx.log, ctx));
    if (fx.custom && FB.fns[fx.custom]) FB.fns[fx.custom](state, ctx);

    if (FB.ui && FB.ui.refresh) FB.ui.refresh();
  };

  FB.doMarry = function (state) {
    const p = state.player;
    const me = state.chars[p.charId];
    const s = state.chars[p.courtingId];
    if (!s) return;
    const others = FB.spousesOf(state, me); // wives already in the household
    // wedding another sets aside any pledge made for the player in childhood
    if (me.betrothedId) {
      const jb = state.chars[me.betrothedId];
      if (jb && jb.id !== s.id) {
        jb.betrothedId = null;
        delete jb.dowryAsk; delete jb.dowryDue;
        FB.news(state, '💔 The old pledge to ' + jb.name + ' is quietly set aside.');
      } else if (jb) jb.betrothedId = null;
      me.betrothedId = null;
    }
    s.spouseId = me.id;
    if (!others.length) { me.spouseId = s.id; state.roles.spouse = s.id; }
    else {
      const words = ['second', 'third', 'fourth', 'fifth'];
      FB.news(state, '💍 ' + s.name + ' enters your household as your ' +
        (words[others.length - 1] || 'newest') + ' wife.');
    }
    s.role = 'spouse';
    // a spouse cannot stay your lord, priest, friend, or rival — those seats
    // empty and are lazily refilled where the game next needs them
    for (const r in state.roles) {
      if (r !== 'spouse' && state.roles[r] === s.id) delete state.roles[r];
    }
    s.opinion = FB.clamp(s.opinion + 30, -100, 100);
    p.courtingId = null;
    delete p.flags.courting;
    p.marriedAt = state.turn;
    // the match settles a dowry, and rank rubs off both ways
    const B = FBDATA.balance;
    const gap = FB.stationOf(s) - FB.playerStation(state);
    const dowry = Math.round((B.dowryByStation[FB.stationOf(s)] || 0) * FB.rf(0.7, 1.3));
    if (dowry > 0) {
      p.gold += dowry;
      FB.news(state, '💰 The kin of ' + s.name + ' settle a dowry of ' + dowry + ' gold on the match.');
    }
    if (gap > 0) {
      p.prestige += gap * B.marryUpPrestige;
      FB.news(state, '👑 You have wed above your station — your name rises with the match.');
    } else if (gap < 0) {
      p.prestige = Math.max(0, p.prestige + gap * B.marryDownPrestigeLoss);
      FB.news(state, '🗣 You have wed beneath your station, and folk mark it.');
    }
    // a spouse leaves their province's roster of notables
    if (state.provChars) {
      for (const pid in state.provChars) {
        const i = state.provChars[pid].indexOf(s.id);
        if (i >= 0) state.provChars[pid].splice(i, 1);
      }
    }
  };

  /* custom trigger fns for the station-marriage events (events_common.js).
     The wed_* pair only fires for spouses that carry an explicit station —
     spouses from older saves stay silent rather than guessing. */
  FB.fns = FB.fns || {};
  FB.fns.suitor_above_station = function (state) {
    const su = FB.getRole(state, 'suitor');
    return !!su && FB.stationOf(su) > FB.playerStation(state);
  };
  FB.fns.wed_above_station = function (state) {
    const sp = FB.spouseOf(state, state.chars[state.player.charId]);
    return !!sp && sp.station != null && sp.station > FB.playerStation(state);
  };
  FB.fns.wed_below_station = function (state) {
    const sp = FB.spouseOf(state, state.chars[state.player.charId]);
    return !!sp && sp.station != null && sp.station < FB.playerStation(state);
  };
  /* the church grants the annulment plea (annulment_plea event) */
  FB.fns.annul_granted = function (state) {
    const me = state.chars[state.player.charId];
    const sp = FB.spouseOf(state, me);
    if (!sp) return;
    FB.doDivorce(state, sp.id);
    FB.news(state, '⛪ The marriage to ' + sp.name + ' is declared void — before ' +
      FB.godWord(me.religion) + ', it never was.');
  };

  /* ---------- widowhood & the house claim ----------
     Called (after FB.killChar) when the player's spouse dies. A spouse who
     stood above the player's station leaves a reckoning with their house:
     a settlement for the widow(er) — or, if the marriage left a living
     child of that blood, a claim to press (events in events_common.js).
     Spouses without an explicit station (older saves) pass in silence. */
  FB.spouseDied = function (state, sp) {
    if (sp.station === undefined || sp.station === null) return;
    if (sp.station - FB.playerStation(state) <= 0) return;
    const me = state.chars[state.player.charId];
    let heir = null;
    for (const id of me.childrenIds) {
      const k = state.chars[id];
      if (k && !k.dead && (k.fatherId === sp.id || k.motherId === sp.id)) { heir = k; break; }
    }
    const ctx = { lateName: sp.name + (sp.dyn ? ' ' + sp.dyn : ''), lateStation: sp.station };
    if (heir) ctx.childId = heir.id;
    state.eventQueue.push({ id: heir ? 'house_claim' : 'widow_settlement', ctx: ctx });
  };

  /* payout fns for the widowhood events — all scale off the dowry the late
     spouse's station commands, so one balance knob tunes the whole chain */
  function lateDowry(ctx, mult) {
    const st = ctx && ctx.lateStation !== undefined ? ctx.lateStation : 1;
    return Math.max(1, Math.round((FBDATA.balance.dowryByStation[st] || 0) * mult * FB.rf(0.85, 1.15)));
  }
  function lateName(ctx) { return (ctx && ctx.lateName) || 'your late spouse'; }
  FB.fns.dower_take = function (state, ctx) {
    const g = lateDowry(ctx, 0.6);
    state.player.gold += g;
    FB.news(state, '💰 The house of ' + lateName(ctx) + ' settles ' + g + ' gold on you.');
  };
  FB.fns.dower_take_full = function (state, ctx) {
    const g = lateDowry(ctx, 1.1);
    state.player.gold += g;
    FB.news(state, '💰 The house of ' + lateName(ctx) + ' pays the full portion: ' + g + ' gold.');
  };
  FB.fns.claim_won = function (state, ctx) {
    const p = state.player;
    const g = lateDowry(ctx, 1.5);
    p.gold += g;
    FB.news(state, '💰 The inheritance settles ' + g + ' gold under your stewardship.');
    // a noble house's estate lifts a common steward into the gentry
    if (p.tier < 2 && ctx && ctx.lateStation >= 3) {
      p.tier = 2;
      if (p.profession !== 'monk' && p.profession !== 'priest') p.profession = 'noble';
      FB.news(state, '🏛 Stewarding a noble inheritance raises you into the gentry.');
    }
  };
  FB.fns.claim_lost = function (state, ctx) {
    const g = lateDowry(ctx, 0.3);
    state.player.gold += g;
    FB.news(state, '💰 A grudging purse of ' + g + ' gold — and nothing more.');
  };
  FB.fns.claim_sold = function (state, ctx) {
    const g = lateDowry(ctx, 1.0);
    state.player.gold += g;
    FB.news(state, '💰 The house of ' + lateName(ctx) + ' buys back the claim for ' + g + ' gold.');
  };

  FB.movePlayerRandom = function (state) {
    const p = state.player;
    const adj = Object.keys(FB.world.adj[p.provinceId] || {})
      .filter(function (id) { return !FB.world.byId[id].wasteland; });
    const dest = adj.length ? FB.pick(adj) : null;
    if (dest) {
      p.provinceId = dest;
      // local cast stays behind
      for (const r of ['lord', 'priest', 'friend', 'rival']) delete state.roles[r];
      p.liege = p.tier >= 3 ? ((state.holder && state.holder[dest]) || state.owner[dest]) : null;
      FB.news(state, '🧭 You now dwell in ' + FB.world.byId[dest].name + '.');
      if (FB.map) { FB.map.playerProv = dest; FB.map.request(); }
    }
  };

  FB.doIndependence = function (state) {
    const p = state.player;
    const oldLiege = p.liege ? FB.topRealm(state, p.liege) : state.owner[p.provinceId];
    if (!p.provs || !p.provs.length) {
      p.provs = [p.provinceId];
      if (p.tier < 4) p.tier = 4;
    }
    FB.foundPlayerRealm(state);
    if (oldLiege && state.realms[oldLiege] && state.realms[oldLiege].alive) {
      p.war = { enemy: oldLiege, target: null, wins: 0, losses: 0, seasons: 0, defending: true };
      FB.news(state, '⚔ ' + state.realms[oldLiege].name + ' will not let you go without a fight!');
    }
    FB.checkTierPromotions(state);
  };

  /* counties the liege could hand the player: adjacent to the player's lands,
     held directly by the liege, not already the player's */
  FB.liegeGrantCandidates = function (state) {
    const p = state.player, cands = [];
    if (!p.liege || !p.provs) return cands;
    for (const pid of p.provs) {
      for (const nb in (FB.world.adj[pid] || {})) {
        if (state.holder[nb] === p.liege && p.provs.indexOf(nb) < 0 && !FB.world.byId[nb].wasteland) cands.push(nb);
      }
    }
    return cands;
  };

  FB.grantByLiege = function (state) {
    const p = state.player;
    if (p.tier === 3) {
      // granted the home county
      p.provs = p.provs || [];
      if (p.provs.indexOf(p.provinceId) < 0) p.provs.push(p.provinceId);
      if (state.holder) state.holder[p.provinceId] = 'player';
      p.tier = 4;
    } else if (p.tier >= 4 && p.liege) {
      const cands = FB.liegeGrantCandidates(state);
      if (cands.length) {
        const got = FB.pick(cands);
        p.provs.push(got);
        state.holder[got] = 'player';
        FB.invalidateRealmCache();
        FB.news(state, '🏰 The liege grants you ' + FB.world.byId[got].name + '.');
      }
      FB.checkTierPromotions(state);
    }
  };

  /* ---- liege-chain & vassalage handlers (fired from events_noble.js) ---- */

  /* an appeal over the direct liege's head succeeds: the appealed lord
     takes the player as his own direct man; the old liege seethes */
  FB.fns.appeal_win = function (state, ctx) {
    const p = state.player;
    const rid = p.appealRid || (ctx && ctx.rid);
    p.appealRid = null;
    const r = state.realms[rid];
    if (!r || !r.alive || !p.liege || rid === p.liege) return;
    const old = p.liege;
    p.liege = rid;
    FB.adjustLiegeOp(state, rid, 15);
    FB.adjustLiegeOp(state, old, -25);
    p.prestige += 8;
    FB.news(state, '⚖ ' + r.name + ' takes you as his direct man — ' +
      (state.realms[old] ? state.realms[old].name : 'your old lord') + ' is passed over.');
  };
  FB.fns.appeal_lose = function (state, ctx) {
    const p = state.player;
    const rid = p.appealRid || (ctx && ctx.rid);
    p.appealRid = null;
    if (rid) FB.adjustLiegeOp(state, rid, -5);
    if (p.liege) FB.adjustLiegeOp(state, p.liege, -15);
  };

  /* vassal breaks free unopposed */
  FB.fns.vassal_release = function (state, ctx) {
    const rid = ctx && ctx.rid;
    const r = state.realms[rid];
    if (!r || !r.alive) return;
    r.liege = null;
    for (const pid of FB.realmTerritory(state, rid)) state.owner[pid] = rid;
    FB.invalidateRealmCache();
    FB.news(state, '🕊 ' + r.name + ' goes its own way, released from your fealty.');
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
  };
  /* answer a revolt (or a refused revocation) with war — the rebel stands
     alone as a tiny sovereign realm until crushed */
  FB.fns.vassal_crush = function (state, ctx) {
    const p = state.player;
    const rid = ctx && ctx.rid;
    const r = state.realms[rid];
    if (!r || !r.alive || p.war) return;
    r.liege = null;
    for (const pid of FB.realmTerritory(state, rid)) state.owner[pid] = rid;
    FB.invalidateRealmCache();
    const held = FB.realmHeldCounties(state, rid);
    p.war = { enemy: rid, target: held[0] || null, wins: 0, losses: 0, seasons: 0, defending: false };
    FB.warFooting(state);
    state.eventQueue.push({ id: 'war_muster', ctx: {} });
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
  };
  /* a vassal yields his fief peacefully */
  FB.fns.vassal_reclaim = function (state, ctx) {
    const p = state.player;
    const rid = p.revokeRid || (ctx && ctx.rid);
    p.revokeRid = null;
    const r = state.realms[rid];
    if (!r || !r.alive) return;
    for (const pid of FB.realmHeldCounties(state, rid)) {
      state.holder[pid] = 'player';
      if (p.provs.indexOf(pid) < 0) p.provs.push(pid);
    }
    r.alive = false;
    FB.invalidateRealmCache();
    FB.news(state, '📜 The fief returns to your demesne. ' + r.name + ' is no more.');
    FB.checkTierPromotions(state);
  };
  FB.fns.vassal_refuse = function (state, ctx) {
    const p = state.player;
    const rid = p.revokeRid || (ctx && ctx.rid);
    p.revokeRid = null;
    FB.adjustLiegeOp(state, rid, -20);
    FB.fns.vassal_crush(state, { rid: rid });
  };
  /* small vassal-opinion nudges for the flavor events */
  FB.fns.vassal_favor = function (state) {
    const vs = FB.playerVassals(state);
    if (vs.length) FB.adjustLiegeOp(state, FB.pick(vs), 20);
  };
  FB.fns.vassal_snub = function (state) {
    const vs = FB.playerVassals(state);
    if (vs.length) FB.adjustLiegeOp(state, FB.pick(vs), -10);
  };
  /* insist on the refused taxes: the surliest vassal pays up and hates it */
  FB.fns.vassal_insist = function (state) {
    const vs = FB.playerVassals(state);
    if (!vs.length) return;
    let worst = vs[0];
    for (const v of vs) if (FB.liegeOpOf(state, v) < FB.liegeOpOf(state, worst)) worst = v;
    let g = 0;
    for (const pid of FB.realmHeldCounties(state, worst)) g += Math.ceil((state.dev[pid] || 1) * FBDATA.balance.vassalTaxRate * 2);
    state.player.gold += g;
    FB.adjustLiegeOp(state, worst, -20);
    FB.news(state, '💰 ' + state.realms[worst].name + ' pays ' + g + ' gold under protest.');
    if (FB.liegeOpOf(state, worst) <= -50) state.eventQueue.push({ id: 'vassal_revolt', ctx: { rid: worst } });
  };

  FB.randomWorldNews = function (state) {    // report a random ongoing war or strong realm
    const wars = [];
    for (const id in state.realms) {
      const r = state.realms[id];
      if (r.alive && r.war && state.realms[r.war.enemy] && state.realms[r.war.enemy].alive) {
        wars.push('⚔ ' + r.name + ' wars against ' + state.realms[r.war.enemy].name + '.');
      }
    }
    if (wars.length) FB.news(state, FB.pick(wars));
    else {
      let big = null, bs = 0;
      for (const id in state.realms) {
        if (!state.realms[id].alive) continue;
        const s = FB.realmStrength(state, id);
        if (s > bs) { bs = s; big = state.realms[id]; }
      }
      if (big) FB.news(state, '👑 They say ' + big.name + ' is the mightiest power of the age.');
    }
  };
})();
