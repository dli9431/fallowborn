/* Fallowborn — characters, dynasties, traits, titles */
window.FB = window.FB || {};

(function () {
  'use strict';

  const SKILLS = ['dip', 'mar', 'ste', 'int', 'lea'];
  FB.SKILLS = SKILLS;
  FB.SKILL_NAMES = { dip: 'Diplomacy', mar: 'Martial', ste: 'Stewardship', int: 'Intrigue', lea: 'Learning' };
  FB.SKILL_ICONS = { dip: '🤝', mar: '⚔', ste: '⚖', int: '🕸', lea: '📖' };
  FB.skillName = function (id) {
    return FB.T(FB.SKILL_NAMES[id] || id);
  };

  FB.cultureOf = function (id) { return FBDATA.cultures[id] || FBDATA.cultures.frankish; };
  FB.religionOf = function (id) { return FBDATA.religions[id] || FBDATA.religions.catholic; };

  /* avoid (optional): a plain object used as a set of lowercase names,
     e.g. { louis: true } — when provided, re-rolls up to 8 times to dodge
     a collision, then accepts the last roll regardless */
  FB.randomName = function (cultureId, sex, avoid) {
    const c = FB.cultureOf(cultureId);
    const pool = sex === 'f' ? c.female : c.male;
    let name = FB.pick(pool);
    if (avoid) {
      for (let tries = 0; tries < 8 && avoid[name.toLowerCase()]; tries++) {
        name = FB.pick(pool);
      }
    }
    return name;
  };

  /* lowercase name set of a dynasty's living members — feeds randomName's
     avoid so siblings and cousins stop sharing a first name */
  FB.dynastyNameSet = function (state, dyn) {
    const set = {};
    if (!state || !dyn) return set;
    for (const id in state.chars) {
      const k = state.chars[id];
      if (!k.dead && k.dyn === dyn) set[k.name.toLowerCase()] = true;
    }
    return set;
  };

  FB.dynastyName = function (cultureId, founderName, provinceName) {
    const c = FB.cultureOf(cultureId);
    switch (c.dyn) {
      case 'patronym': return founderName + (founderName.slice(-1) === 's' ? 'son' : 'sson');
      case 'mac': return 'mac ' + founderName;
      case 'ap': return 'ap ' + founderName;
      case 'ibn': return 'Banu ' + founderName.split(' ').pop();
      case 'ov': return founderName + 'ich';
      case 'plain': return c.family ? FB.pick(c.family) : ('of ' + provinceName);
      default: return 'of ' + provinceName;
    }
  };

  /* ---------- character factory ----------
     opts: {sex, culture, religion, born, dyn, role, quality (skill bonus), traitsN} */
  FB.makeCharacter = function (state, opts) {
    const sex = opts.sex || (FB.chance(0.5) ? 'm' : 'f');
    const c = {
      id: FB.uid(),
      name: opts.name || FB.randomName(opts.culture, sex,
        opts.dyn ? FB.dynastyNameSet(state, opts.dyn) : null),
      sex: sex,
      culture: opts.culture,
      religion: opts.religion,
      born: opts.born,
      dead: false,
      dyn: opts.dyn || null,
      role: opts.role || null,
      traits: opts.traits || [],
      skills: {},
      opinion: opts.opinion !== undefined ? opts.opinion : 0,
      fertility: FB.rf(0.7, 1.3),
      station: opts.station !== undefined ? opts.station : null,
      spouseId: null, fatherId: opts.fatherId || null, motherId: opts.motherId || null,
      childrenIds: []
    };
    const q = opts.quality || 0;
    for (const s of SKILLS) c.skills[s] = FB.clamp(FB.ri(0, 6) + q, 0, FBDATA.balance.skillHardCap || 40);
    if (!opts.traits) {
      const pool = Object.keys(FBDATA.traits).filter(t => !FBDATA.traits[t].noRandom &&
        ['veteran', 'literate', 'pilgrim', 'scarred', 'one_eyed', 'maimed', 'kinslayer', 'excommunicated'].indexOf(t) < 0);
      const n = opts.traitsN !== undefined ? opts.traitsN : FB.ri(1, 3);
      for (let i = 0; i < n; i++) FB.addTrait(c, FB.pick(pool));
    }
    if (state) state.chars[c.id] = c;
    return c;
  };

  FB.addTrait = function (c, traitId) {
    const t = FBDATA.traits[traitId];
    if (!t || c.traits.indexOf(traitId) >= 0) return false;
    if (t.opposite && c.traits.indexOf(t.opposite) >= 0) {
      c.traits.splice(c.traits.indexOf(t.opposite), 1);
    }
    c.traits.push(traitId);
    return true;
  };
  FB.removeTrait = function (c, traitId) {
    const i = c.traits.indexOf(traitId);
    if (i >= 0) c.traits.splice(i, 1);
  };

  /* ---------- ailments: named wounds & sicknesses (data table in traits.js) ----------
     Kept on c.ails as a short list of ids; old saves simply lack the field. */
  FB.ailmentsOf = function (c) {
    const out = [];
    if (!c.ails) return out;
    for (const id of c.ails) {
      const a = FBDATA.ailments[id];
      if (a) out.push({ id: id, def: a });
    }
    return out;
  };

  FB.hasAilmentKind = function (c, kind) {
    const list = FB.ailmentsOf(c);
    for (const a of list) if (a.def.kind === kind) return true;
    return false;
  };

  FB.addAilment = function (c, id) {
    const a = FBDATA.ailments[id];
    if (!a) return false;
    if (!c.ails) c.ails = [];
    if (c.ails.indexOf(id) >= 0) return false;
    c.ails.push(id);
    while (c.ails.length > 3) c.ails.shift(); // only so many afflictions worth naming
    return true;
  };

  /* remove ailments of a kind — the n oldest (default: all of that kind) */
  FB.cureAilments = function (c, kind, n) {
    if (!c.ails) return;
    let left = n === undefined ? Infinity : n;
    for (let i = 0; i < c.ails.length && left > 0;) {
      const a = FBDATA.ailments[c.ails[i]];
      if (a && a.kind === kind) { c.ails.splice(i, 1); left--; }
      else i++;
    }
    if (!c.ails.length) delete c.ails;
  };

  FB.randomWound = function (sev) {
    const pool = [];
    for (const id in FBDATA.ailments) {
      const a = FBDATA.ailments[id];
      if (a.kind === 'wound' && (a.sev || 1) === sev) pool.push(id);
    }
    return pool.length ? FB.pick(pool) : null;
  };

  FB.randomSickness = function () {
    const pool = [];
    for (const id in FBDATA.ailments) {
      if (FBDATA.ailments[id].kind === 'sickness') pool.push(id);
    }
    return pool.length ? FB.pick(pool) : null;
  };

  FB.traitAgg = function (c) {
    const agg = { dip: 0, mar: 0, ste: 0, int: 0, lea: 0, health: 0, fert: 1, opinion: 0 };
    for (const id of c.traits) {
      const t = FBDATA.traits[id];
      if (!t) continue;
      for (const s of SKILLS) if (t[s]) agg[s] += t[s];
      if (t.health) agg.health += t.health;
      if (t.fert) agg.fert *= t.fert;
      if (t.opinion) agg.opinion += t.opinion;
    }
    return agg;
  };

  FB.skillOf = function (c, key) {
    let v = (c.skills[key] || 0) + (FB.traitAgg(c)[key] || 0);
    // the player's carried items sharpen their skills (FB.itemBonus loads later)
    if (FB.state && FB.itemBonus && c.id === FB.state.player.charId) v += FB.itemBonus(FB.state, key);
    return FB.clamp(v, 0, FBDATA.balance.skillHardCap || 40);
  };

  /* Skill growth is a soft cap, not a wall. Below balance.skillSoftCap every
     gain lands; past it each point must beat a (softCap/current)^2 roll, so
     piling a whole life into one stat yields less and less past it.
     balance.skillHardCap is the true ceiling. Returns points actually gained. */
  FB.gainSkill = function (c, key, n) {
    const B = FBDATA.balance, soft = B.skillSoftCap || 20, hard = B.skillHardCap || 40;
    let gained = 0;
    for (let i = 0; i < (n || 1); i++) {
      const cur = c.skills[key] || 0;
      if (cur >= hard) break;
      if (cur >= soft) {
        const x = soft / cur;
        if (!FB.chance(x * x)) continue;
      }
      c.skills[key] = cur + 1;
      gained++;
    }
    return gained;
  };

  FB.ageOf = function (c, year) { return year - c.born; };

  /* Age-driven fecundity, 0–1: full through the prime years, then a gradual
     slide (women from the late 20s, sharply after 35; men gently from 40).
     Points live in balance.fertilityByAge — flat before the first point,
     linear between points, flat past the last. The hard she-is-past-45 gate
     at the conception sites stays on top of this. */
  FB.ageFert = function (sex, age) {
    const pts = (FBDATA.balance.fertilityByAge || {})[sex];
    if (!pts || !pts.length) return 1;
    if (age <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (age <= pts[i][0]) {
        const a = pts[i - 1], b = pts[i];
        return a[1] + (b[1] - a[1]) * (age - a[0]) / (b[0] - a[0]);
      }
    }
    return pts[pts.length - 1][1];
  };

  /* ---------- station (social rank, 0–4) ----------
     0 lowborn · 1 freeholder · 2 gentry/burgher · 3 noble house · 4 royalty.
     Mirrors the player's tier ladder (tier 4+ all count as royalty). Marriage
     is gated on it: kin weigh a suit by the gap between the two houses.
     Characters from older saves carry no station — infer a coarse one. */
  /* What a faith allows in marriage, by 9th-century convention:
     divorce — 'talaq' (pronounced, the mahr repaid) · 'get' (written and
     witnessed, the ketubah paid) · 'sunder' (declared before witnesses) ·
     null (Christians: annulment by the church or nothing).
     wives — how many a MAN may hold at once (balance.wivesByGroup). */
  FB.marriageDoctrine = function (religionId) {
    const g = FB.religionOf(religionId).group;
    const wives = (FBDATA.balance.wivesByGroup || {})[g] || 1;
    if (g === 'muslim') return { divorce: 'talaq', wives: wives };
    if (g === 'pagan') return { divorce: 'sunder', wives: wives };
    if (g === 'jewish') return { divorce: 'get', wives: wives };
    return { divorce: null, wives: wives };
  };

  FB.STATION_NAMES = ['Lowborn', 'Freeholder', 'Gentry', 'Noble', 'Royalty'];
  FB.stationName = function (station) {
    return FB.T(FB.STATION_NAMES[station] || '');
  };
  FB.stationOf = function (c) {
    if (c.station !== undefined && c.station !== null) return c.station;
    if (c.role === 'lord') return 3;
    if (c.role === 'notable' && c.dyn) return 3; // the lord’s house shares his name
    return 0;
  };
  FB.playerStation = function (state) { return FB.clamp(state.player.tier, 0, 4); };

  /* A character's home county. Roles (lord, priest, friend, rival) are
     generated from the player's home; notables of other provinces persist in
     state.provChars; kin, spouses, suitors, and matches live where the player
     lives. Cards use this to say whose banner a stranger marches under. */
  FB.homeOf = function (state, c) {
    if (!c) return null;
    if (state.provChars) {
      for (const pid in state.provChars) {
        if (state.provChars[pid].indexOf(c.id) >= 0) return pid;
      }
    }
    return state.player.provinceId;
  };

  FB.inheritTraits = function (father, mother) {
    const traits = [];
    const parents = [father, mother].filter(Boolean);
    for (const p of parents) {
      for (const id of p.traits) {
        const t = FBDATA.traits[id];
        if (t && t.inherit && FB.chance(t.inherit) && traits.indexOf(id) < 0) traits.push(id);
      }
    }
    if (FB.chance(0.02)) traits.push('genius');
    return traits.slice(0, 3);
  };

  FB.portrait = function (c, year) {
    const a = FB.ageOf(c, year);
    if (a < 3) return '👶';
    if (a < 13) return c.sex === 'f' ? '👧' : '👦';
    if (a < 30) return c.sex === 'f' ? '👩' : '🧑';
    if (a < 50) return c.sex === 'f' ? '👩' : '🧔';
    return c.sex === 'f' ? '👵' : '👴';
  };

  FB.fullName = function (c) {
    return c.dyn ? c.name + ' ' + c.dyn : c.name;
  };

  /* ---------- kinship ----------
     The family tree hangs off fatherId/motherId (set for every birth) and
     childrenIds (also covers adopted children). Dead chars stay in the tree —
     the Kin tab marks them with †. */
  function parentsOf(state, c) {
    const out = [];
    if (c.fatherId && state.chars[c.fatherId]) out.push(state.chars[c.fatherId]);
    if (c.motherId && state.chars[c.motherId]) out.push(state.chars[c.motherId]);
    return out;
  }
  function childrenOf(state, c) {
    const out = [], seen = {};
    for (const id of (c.childrenIds || [])) {
      const k = state.chars[id];
      if (k && !seen[id]) { seen[id] = 1; out.push(k); }
    }
    for (const id in state.chars) {
      const k = state.chars[id];
      if ((k.fatherId === c.id || k.motherId === c.id) && !seen[k.id]) {
        seen[k.id] = 1; out.push(k);
      }
    }
    return out;
  }
  function siblingsOf(state, c) {
    const out = [], seen = {};
    const ps = parentsOf(state, c);
    for (const p of ps) {
      for (const k of childrenOf(state, p)) {
        if (k.id !== c.id && !seen[k.id]) { seen[k.id] = 1; out.push(k); }
      }
    }
    if (!ps.length && c.id === state.player.charId) {
      // first-generation kin of old saves: no recorded parents, only role + house
      for (const id in state.chars) {
        const k = state.chars[id];
        if (k.id !== c.id && !seen[k.id] && k.role === 'sibling' && k.dyn && k.dyn === c.dyn) {
          seen[k.id] = 1; out.push(k);
        }
      }
    }
    return out;
  }
  /* raw blood-line walkers, for views that draw the tree itself */
  FB.parentsOf = parentsOf;
  FB.childrenOf = childrenOf;
  FB.siblingsOf = siblingsOf;

  /* The player's living and dead kin, grouped by closeness. Each group is a
     list of {c, rel}; byId maps charId → rel for news and death notices. */
  FB.kinOf = function (state) {
    const me = state.chars[state.player.charId];
    const seen = {}, byId = {};
    seen[me.id] = 1;
    function grp(list, relFn) {
      const out = [];
      for (const c of list) {
        if (!c || seen[c.id]) continue;
        seen[c.id] = 1;
        const rel = typeof relFn === 'function' ? relFn(c) : relFn;
        out.push({ c: c, rel: rel });
        byId[c.id] = rel;
      }
      return out;
    }
    function bySex(m, f) { return function (c) { return c.sex === 'f' ? f : m; }; }
    const parents = grp(parentsOf(state, me), bySex('Father', 'Mother'));
    let list = [];
    for (const p of parents) list = list.concat(parentsOf(state, p.c));
    const grandparents = grp(list, bySex('Grandfather', 'Grandmother'));
    const siblings = grp(siblingsOf(state, me), bySex('Brother', 'Sister'));
    const children = grp(childrenOf(state, me), bySex('Son', 'Daughter'));
    list = [];
    for (const k of children) list = list.concat(childrenOf(state, k.c));
    const grandchildren = grp(list, bySex('Grandson', 'Granddaughter'));
    list = [];
    for (const sib of siblings) list = list.concat(childrenOf(state, sib.c));
    const niecesNephews = grp(list, bySex('Nephew', 'Niece'));
    list = [];
    for (const pa of parents) list = list.concat(siblingsOf(state, pa.c));
    const unclesAunts = grp(list, bySex('Uncle', 'Aunt'));
    list = [];
    for (const u of unclesAunts) list = list.concat(childrenOf(state, u.c));
    const cousins = grp(list, 'Cousin');
    return { parents: parents, grandparents: grandparents, siblings: siblings,
      children: children, grandchildren: grandchildren, niecesNephews: niecesNephews,
      unclesAunts: unclesAunts, cousins: cousins, byId: byId };
  };

  /* ---------- titles ---------- */
  /* the bare rank word for any tier ("Count", "Emira"…) from the player's
     faith group and sex — without profession/clergy overrides */
  FB.titleWordFor = function (state, tier) {
    const me = state.chars[state.player.charId];
    const rel = FB.religionOf(me.religion);
    let key = rel.group === 'muslim' ? 'muslim' : rel.group === 'pagan' ? 'pagan' :
      rel.group === 'jewish' ? 'jewish' : 'christian';
    if (me.sex === 'f' && FBDATA.titles[key + '_f']) key = key + '_f';
    const arr = FBDATA.titles[key] || FBDATA.titles.christian;
    const index = FB.clamp(tier, 0, arr.length - 1);
    return FB.dataText(state, state.player.charId, 'title', key + '.' + index, arr[index], '', {});
  };
  FB.titleFor = function (state) {
    const p = state.player;
    const rel = FB.religionOf(state.chars[p.charId].religion);
    let t = FB.titleWordFor(state, p.tier);
    if (p.tier <= 1 && p.profession && p.profession !== 'farmer') {
      const g = rel.group;
      const profNames = {
        craftsman: 'Craftsman', merchant: 'Merchant', soldier: 'Soldier',
        monk: g === 'muslim' ? 'Scholar' : 'Monk',
        priest: g === 'muslim' ? 'Imam' : g === 'pagan' ? 'Godi' : 'Priest'
      };
      if (profNames[p.profession]) t = FB.T(profNames[p.profession]);
    }
    if (state.player.flags.bishop) t = FB.T('Bishop');
    else if (state.player.flags.chief_qadi) t = FB.T('Grand Qadi');
    else if (state.player.flags.abbot && p.tier === 2) t = FB.T('Abbot');
    else if (state.player.flags.qadi && p.tier === 2) t = FB.T('Qadi');
    return t;
  };

  /* the player's landed style: "Count of Anjou", "Duke of Normandy",
     "King of England" — falls back to the bare rank when unlanded */
  FB.styledTitle = function (state) {
    return FB.renderTitleSnapshot(FB.titleSnapshot(state));
  };

  FB.titleSnapshot = function (state) {
    const p = state.player;
    const me = state.chars[p.charId];
    const rel = FB.religionOf(me.religion);
    let group = rel.group === 'muslim' ? 'muslim' : rel.group === 'pagan' ? 'pagan' :
      rel.group === 'jewish' ? 'jewish' : 'christian';
    if (me.sex === 'f' && FBDATA.titles[group + '_f']) group += '_f';
    const arr = FBDATA.titles[group] || FBDATA.titles.christian;
    const snap = { group: group, tier: FB.clamp(p.tier, 0, arr.length - 1) };
    if (p.tier <= 1 && p.profession && p.profession !== 'farmer') {
      if (p.profession === 'monk') {
        snap.special = rel.group === 'muslim' ? 'scholar' : 'monk';
      } else if (p.profession === 'priest') {
        snap.special = rel.group === 'muslim' ? 'imam' :
          (rel.group === 'pagan' ? 'godi' : 'priest');
      } else if (p.profession === 'craftsman' || p.profession === 'merchant' ||
        p.profession === 'soldier') {
        snap.special = p.profession;
      }
    }
    if (p.flags.bishop) snap.special = 'bishop';
    else if (p.flags.chief_qadi) snap.special = 'grand_qadi';
    else if (p.flags.abbot && p.tier === 2) snap.special = 'abbot';
    else if (p.flags.qadi && p.tier === 2) snap.special = 'qadi';
    if (p.tier === 4 && p.provs && p.provs.length) {
      const pr = FB.world && FB.world.byId[p.provs[0]];
      if (pr) snap.place = pr.name;
    } else if (p.tier === 5 && FB.playerDuchy) {
      const did = FB.playerDuchy(state);
      if (did && FBDATA.duchies[did]) snap.place = FBDATA.duchies[did].name;
    } else if (p.tier >= 6 && state.realms.player && state.realms.player.alive) {
      const rn = state.realms.player.name;
      if (rn.indexOf('Kingdom of ') === 0) snap.place = rn.slice(11);
      else if (rn.indexOf('Empire of ') === 0) snap.place = rn.slice(10);
    }
    return snap;
  };
  FB.rankTitleSnapshot = function (state, tier, place) {
    const current = FB.titleSnapshot(state);
    const snap = { group: current.group, tier: tier };
    if (place) snap.place = place;
    return snap;
  };
  FB.renderTitleSnapshot = function (snapshot) {
    if (!snapshot) return '';
    const arr = FBDATA.titles[snapshot.group] || FBDATA.titles.christian;
    const index = FB.clamp(snapshot.tier || 0, 0, arr.length - 1);
    const specialWords = {
      craftsman: 'Craftsman', merchant: 'Merchant', soldier: 'Soldier',
      scholar: 'Scholar', monk: 'Monk', imam: 'Imam', godi: 'Godi', priest: 'Priest',
      bishop: 'Bishop', grand_qadi: 'Grand Qadi', abbot: 'Abbot', qadi: 'Qadi'
    };
    const title = snapshot.special && specialWords[snapshot.special]
      ? FB.T(specialWords[snapshot.special])
      : (snapshot.word ? FB.T(snapshot.word) :
        FB.renderKey('title.' + snapshot.group + '.' + index + '.default',
          { text: arr[index] }, {}));
    return snapshot.place ? FB.T('{title} of {place}', {
      title: title, place: snapshot.place
    }) : title;
  };

  /* an AI realm ruler's style: "Emir Yusuf", "High King Ragnarr" — rank
     titles come from the capital county's faith group (rank+3 indexes
     FBDATA.titles: count→4 … emperor→7) */
  FB.realmRankTitle = function (state, realm) {
    const pr = FB.world && FB.world.byId[realm.capital];
    const group = pr ? FB.religionOf(pr.religion).group : 'christian';
    const arr = FBDATA.titles[group] || FBDATA.titles.christian;
    const index = FB.clamp((realm.rank || 3) + 3, 4, arr.length - 1);
    return FB.dataText(state, state.player.charId, 'title', group + '.' + index, arr[index], '', {});
  };

  /* words for text templating */
  FB.holyWord = function (religionId) {
    const g = FB.religionOf(religionId).group;
    if (g === 'muslim') return FB.T('imam');
    if (g === 'pagan') return FB.T('godi');
    if (g === 'jewish') return FB.T('rabbi');
    return FB.T('priest');
  };
  FB.godWord = function (religionId) {
    const g = FB.religionOf(religionId).group;
    if (g === 'muslim') return FB.T('Allah');
    if (g === 'pagan') return FB.T('the gods');
    if (g === 'jewish') return FB.T('the Lord');
    return FB.T('God');
  };
  FB.templeWord = function (religionId) {
    const g = FB.religionOf(religionId).group;
    if (g === 'muslim') return FB.T('mosque');
    if (g === 'pagan') return FB.T('shrine');
    if (g === 'jewish') return FB.T('synagogue');
    return FB.T('church');
  };

  /* opinion label */
  FB.opClass = function (v) { return v > 15 ? 'op-good' : v < -15 ? 'op-bad' : 'op-mid'; };
})();
