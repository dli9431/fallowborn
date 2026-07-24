/* Fallowborn — household livelihoods, apprenticeship, guilds, enterprises. */
window.FB = window.FB || {};

(function () {
  'use strict';

  const GUILD_ORDER = { none:0, member:1, master:2, officer:3, guildmaster:4 };
  const LEGACY_ENTERPRISES = {
    orchard:'orchard_business',
    press:'press_business',
    workshop:'workshop_business',
    stall:'market_stall_business',
    trade_house:'trade_house_business'
  };

  function playerChar(state) { return state.chars[state.player.charId]; }
  function dependentOfPlayer(state, c) {
    const me = playerChar(state);
    return !!(me && c && (c.spouseId === me.id || me.spouseId === c.id ||
      (me.childrenIds || []).indexOf(c.id) >= 0));
  }
  function workerBusy(state, cid) {
    const list = state.player.enterprises || [];
    for (const e of list) if (e.workerId === cid) return true;
    return false;
  }

  FB.careerOf = function (state, c) {
    if (!c) return null;
    if (!c.career) {
      let profession = 'farmer';
      const isPlayer = state.player && c.id === state.player.charId;
      const age = FB.ageOf(c, state.date.year);
      if (isPlayer) profession = state.player.professionBack || state.player.profession || 'farmer';
      else if (FB.stationOf(c) >= 2 || (state.player.tier >= 2 && dependentOfPlayer(state, c))) {
        profession = 'noble';
      }
      c.career = {
        profession: profession,
        rank: age < 16 ? (isPlayer ? 'apprentice' : 'unassigned') : 'journeyman',
        experience: 0,
        startedYear: state.date.year,
        guildRank: 'none',
        guildStanding: 0,
        chosen: isPlayer || age >= 16
      };
      if (state.player && c.id === state.player.charId && state.player.flags.guild_member) {
        c.career.guildRank = 'member';
        c.career.guildStanding = 20;
      }
    }
    if (!c.career.rank) c.career.rank = 'journeyman';
    if (!c.career.guildRank) c.career.guildRank = 'none';
    if (c.career.experience === undefined) c.career.experience = 0;
    if (c.career.guildStanding === undefined) c.career.guildStanding = 0;
    if (c.career.chosen === undefined) c.career.chosen = c.career.rank !== 'unassigned';
    return c.career;
  };

  FB.syncPlayerCareer = function (state) {
    const c = playerChar(state);
    const career = FB.careerOf(state, c);
    if (!career) return;
    if (state.player.professionBack) return; // temporary levy service keeps the civilian career
    state.player.profession = state.player.tier >= 3 ? 'noble' : career.profession;
    if (career.guildRank !== 'none') state.player.flags.guild_member = 1;
    else delete state.player.flags.guild_member;
  };

  FB.setCareer = function (state, c, profession, rank) {
    const def = FBDATA.careers[profession];
    if (!c || !def) return false;
    if (def.maleOnly && c.sex !== 'm') return false;
    const career = FB.careerOf(state, c);
    const changedProfession = career.profession !== profession;
    career.profession = profession;
    career.rank = rank || (FB.ageOf(c, state.date.year) < 16 ? 'apprentice' : 'journeyman');
    career.experience = 0;
    career.startedYear = state.date.year;
    career.chosen = true;
    if (!def.guild || changedProfession) {
      career.guildRank = 'none';
      career.guildStanding = 0;
    }
    if (c.id === state.player.charId) FB.syncPlayerCareer(state);
    return true;
  };

  FB.careerDef = function (state, c) {
    const career = FB.careerOf(state, c);
    return career ? FBDATA.careers[career.profession] : null;
  };

  FB.careerTitle = function (state, c) {
    const career = FB.careerOf(state, c);
    const def = career && FBDATA.careers[career.profession];
    if (!def) return FB.T('No occupation');
    if (career.rank === 'unassigned') return FB.T('No apprenticeship chosen');
    return FB.dataText(state, state.player.charId, 'career', career.profession, def,
      def.ranks && def.ranks[career.rank] ? 'ranks.' + career.rank : 'name', {});
  };

  FB.guildTitle = function (career) {
    const names = {
      none:'Outside the guild', member:'Guild member', master:'Guild master',
      officer:'Guild officer', guildmaster:'Guildmaster'
    };
    return FB.T(names[(career && career.guildRank) || 'none']);
  };

  FB.careerChoices = function (state, c) {
    const age = FB.ageOf(c, state.date.year);
    const out = [];
    for (const id in FBDATA.careers) {
      const def = FBDATA.careers[id];
      if (def.hiddenChoice) continue;
      if (def.tierMin !== undefined && state.player.tier < def.tierMin) continue;
      if (def.maleOnly && c.sex !== 'm') continue;
      if (age < 16 && age < (def.apprenticeAge || 10)) continue;
      if (c.id === state.player.charId && state.player.tier >= 3 && id !== 'noble') continue;
      out.push({ id:id, def:def, cost:age < 16 ? (def.apprenticeCost || 0) : 0 });
    }
    return out;
  };

  FB.beginCareer = function (state, c, profession) {
    const def = FBDATA.careers[profession];
    if (!c || !def) return false;
    const age = FB.ageOf(c, state.date.year);
    const apprentice = age < 16;
    const cost = apprentice ? (def.apprenticeCost || 0) : 0;
    if (state.player.gold < cost) return false;
    if (!FB.setCareer(state, c, profession, apprentice ? 'apprentice' : 'journeyman')) return false;
    state.player.gold -= cost;
    if (c.id === state.player.charId && FB.validateFocus) FB.validateFocus(state);
    FB.news(state, FB.msg('news.career.begins', {
      forms: {
        select:'value', param:'apprentice', cases:{
          yes:'🧑‍🏫 {name} begins an apprenticeship in {career}.',
          no:'🧰 {name} takes up work in {career}.',
          other:'🧰 {name} begins work in {career}.'
        }
      }
    }, {
      apprentice:apprentice ? 'yes' : 'no', name:c.name,
      career:FB.dataParam('career', profession)
    }));
    return true;
  };

  FB.householdMembers = function (state) {
    const me = playerChar(state);
    const out = [], seen = {};
    function add(c) {
      if (!c || c.dead || seen[c.id]) return;
      seen[c.id] = 1;
      out.push(c);
    }
    add(me);
    for (const sp of FB.spousesOf(state, me)) add(sp);
    for (const id of (me.childrenIds || [])) {
      const c = state.chars[id];
      if (c && !c.dead && (!FB.spouseOf(state, c) || c.id === state.player.charId)) add(c);
    }
    return out;
  };

  FB.enterpriseList = function (state) {
    const p = state.player;
    p.enterprises = p.enterprises || [];
    if (!p.enterpriseMigration) {
      p.enterpriseMigration = 1;
      const firstMigrated = p.enterprises.length;
      const holdings = p.holdings || [];
      for (let i = holdings.length - 1; i >= 0; i--) {
        const type = LEGACY_ENTERPRISES[holdings[i]];
        if (!type) continue;
        p.enterprises.push({
          uid:'enterprise_' + FB.uid(), type:type, provinceId:p.provinceId,
          settlement:0, workerId:null, inherited:true
        });
        holdings.splice(i, 1);
      }
      for (let i = firstMigrated; i < p.enterprises.length; i++) {
        const workers = FB.enterpriseWorkers(state, p.enterprises[i].type);
        for (const worker of workers) {
          if (!workerBusy(state, worker.id)) {
            FB.assignEnterprise(state, p.enterprises[i].uid, worker.id);
            break;
          }
        }
      }
    }
    return p.enterprises;
  };

  /* Old event requirements named productive holdings. Keep those authored
     ids meaningful after their one-off holdings become enterprise instances. */
  FB.hasHouseholdAsset = function (state, id) {
    if (FB.holdingList(state).indexOf(id) >= 0) return true;
    const type = LEGACY_ENTERPRISES[id];
    if (!type) return false;
    for (const e of FB.enterpriseList(state)) if (e.type === type) return true;
    return false;
  };

  FB.enterpriseCost = function (state, type) {
    const def = FBDATA.enterprises[type];
    let copies = 0;
    for (const e of FB.enterpriseList(state)) if (e.type === type) copies++;
    return Math.round(def.cost * Math.pow(FBDATA.balance.enterpriseRepeatCostGrowth || 1.35, copies));
  };

  FB.enterpriseWorkers = function (state, type) {
    const def = FBDATA.enterprises[type];
    const out = [];
    if (!def) return out;
    for (const c of FB.householdMembers(state)) {
      const age = FB.ageOf(c, state.date.year);
      const career = FB.careerOf(state, c);
      if (age < 16 || !career || career.profession !== def.profession) continue;
      if (def.guildRank && (GUILD_ORDER[career.guildRank] || 0) <
        (GUILD_ORDER[def.guildRank] || 0)) continue;
      out.push(c);
    }
    return out;
  };

  FB.enterpriseAvailable = function (state, settlement) {
    const p = state.player;
    const pr = FB.world.byId[p.provinceId];
    const out = [];
    const standing = FB.enterpriseList(state);
    for (const id in FBDATA.enterprises) {
      const def = FBDATA.enterprises[id];
      if (def.devMin && (state.dev[p.provinceId] || 1) < def.devMin) continue;
      if (def.coastal && (!pr || !pr.coastal)) continue;
      if (def.terrains && (!pr || def.terrains.indexOf(pr.terrain) < 0)) continue;
      let occupied = false;
      for (const e of standing) {
        if (e.type === id && e.provinceId === p.provinceId && e.settlement === settlement) {
          occupied = true; break;
        }
      }
      if (occupied) continue; // one of a kind per settlement; copies may stand elsewhere
      const workers = FB.enterpriseWorkers(state, id);
      out.push({ id:id, def:def, cost:FB.enterpriseCost(state, id), workers:workers });
    }
    return out;
  };

  FB.buyEnterprise = function (state, type, settlement) {
    const avail = FB.enterpriseAvailable(state, settlement);
    let item = null;
    for (const a of avail) if (a.id === type) { item = a; break; }
    if (!item || state.player.gold < item.cost) return false;
    state.player.gold -= item.cost;
    const e = {
      uid:'enterprise_' + FB.uid(), type:type, provinceId:state.player.provinceId,
      settlement:settlement, workerId:null
    };
    FB.enterpriseList(state).push(e);
    for (const worker of item.workers) {
      if (!workerBusy(state, worker.id)) {
        FB.assignEnterprise(state, e.uid, worker.id);
        break;
      }
    }
    FB.news(state, FB.msg('news.enterprise.bought',
      '🏪 The household acquires {enterprise}.', {
        enterprise:FB.dataParam('enterprise', type)
      }));
    return true;
  };

  FB.assignEnterprise = function (state, uid, cid) {
    let target = null;
    const list = FB.enterpriseList(state);
    for (const e of list) if (e.uid === uid) { target = e; break; }
    if (!target) return false;
    if (!cid) { target.workerId = null; return true; }
    let eligible = false;
    for (const c of FB.enterpriseWorkers(state, target.type)) if (c.id === cid) eligible = true;
    if (!eligible) return false;
    for (const e of list) if (e.workerId === cid) e.workerId = null;
    target.workerId = cid;
    return true;
  };

  FB.enterpriseYield = function (state, e) {
    const def = FBDATA.enterprises[e.type];
    const worker = e.workerId && state.chars[e.workerId];
    if (!def || !worker || worker.dead) return 0;
    let eligible = false;
    for (const c of FB.enterpriseWorkers(state, e.type)) if (c.id === worker.id) eligible = true;
    if (!eligible) return 0;
    const career = FB.careerOf(state, worker);
    if (!career || career.profession !== def.profession) return 0;
    const careerDef = FBDATA.careers[career.profession];
    const skill = careerDef && careerDef.skill ? careerDef.skill : 'ste';
    let amount = def.yield * (0.75 + FB.skillOf(worker, skill) / 20);
    const dev = state.dev[e.provinceId] || 1;
    amount *= 0.9 + Math.min(10, dev) * 0.02;
    if (career.guildRank === 'master') amount *= 1.1;
    else if (career.guildRank === 'officer') amount *= 1.15;
    else if (career.guildRank === 'guildmaster') amount *= 1.25;
    return amount;
  };

  FB.livelihoodBreakdown = function (state) {
    const assigned = {};
    const lines = [];
    for (const e of FB.enterpriseList(state)) {
      if (e.workerId) assigned[e.workerId] = 1;
      const amount = FB.enterpriseYield(state, e);
      const def = FBDATA.enterprises[e.type];
      if (amount && def) {
        lines.push({
          label:def.icon + ' ' + FB.dataText(state, state.player.charId, 'enterprise',
            e.type, def, 'name', {}), amount:amount
        });
      }
    }
    const me = playerChar(state);
    for (const c of FB.householdMembers(state)) {
      if (c.id === me.id || assigned[c.id]) continue; // the player's own work is their daily focus
      const age = FB.ageOf(c, state.date.year);
      const career = FB.careerOf(state, c);
      const def = career && FBDATA.careers[career.profession];
      if (!def || age < (def.apprenticeAge || 10)) continue;
      let amount = 0;
      if (!career.chosen) continue;
      if (age < 16 || career.rank === 'apprentice') amount = -0.25;
      else amount = career.rank === 'master' ? def.masterWage : def.wage;
      if (amount) lines.push({
        label:def.icon + ' ' + c.name + ' — ' + FB.careerTitle(state, c), amount:amount
      });
    }
    return lines;
  };

  FB.livelihoodPiety = function (state) {
    let amount = 0;
    const me = playerChar(state);
    for (const c of FB.householdMembers(state)) {
      if (c.id === me.id || FB.ageOf(c, state.date.year) < 16) continue;
      const career = FB.careerOf(state, c);
      const def = career && FBDATA.careers[career.profession];
      if (def && def.piety) amount += def.piety;
    }
    return amount;
  };

  FB.livelihoodSeason = function (state) {
    let gold = 0;
    for (const line of FB.livelihoodBreakdown(state)) gold += line.amount;
    state.player.gold = Math.max(0, state.player.gold + gold);
    state.player.piety += FB.livelihoodPiety(state);
  };

  FB.livelihoodYearly = function (state) {
    for (const c of FB.householdMembers(state)) {
      const career = FB.careerOf(state, c);
      const def = career && FBDATA.careers[career.profession];
      if (!def) continue;
      const age = FB.ageOf(c, state.date.year);
      if (!career.chosen && age >= 16) {
        career.chosen = true;
        career.rank = 'journeyman';
        career.profession = state.player.tier >= 2 && dependentOfPlayer(state, c) ?
          'noble' : 'farmer';
      } else if (career.chosen && career.rank === 'apprentice' && age >= (def.apprenticeAge || 10)) {
        career.experience++;
        if (FB.chance(0.65)) FB.gainSkill(c, def.skill, 1);
        if (age >= 16) {
          career.rank = 'journeyman';
          FB.news(state, FB.msg('news.career.comes_of_age',
            '🧰 {name} completes their apprenticeship and becomes {rank}.', {
              name:c.name,
              rank:FB.dataParam('career', career.profession, 'ranks.' + career.rank)
            }));
        }
      } else if (age >= 16) {
        career.experience++;
        if (FB.chance(0.18)) FB.gainSkill(c, def.skill, 1);
        if (career.rank === 'journeyman' && career.experience >= 8 &&
          FB.skillOf(c, def.skill) >= 8 && !def.guild) {
          career.rank = 'master';
        }
      }
    }
    FB.syncPlayerCareer(state);
  };

  FB.guildAdvance = function (state, c) {
    const career = FB.careerOf(state, c);
    const def = career && FBDATA.careers[career.profession];
    if (!def || !def.guild || career.rank === 'apprentice' || career.rank === 'unassigned') return null;
    const ste = FB.skillOf(c, 'ste');
    if (career.guildRank === 'none') return { to:'member', cost:15, prestige:0, need:0 };
    if (career.guildRank === 'member') {
      return { to:'master', cost:40, prestige:0, need:8, blocked:ste < 8 };
    }
    if (career.guildRank === 'master') {
      return { to:'officer', cost:25, prestige:60, need:10,
        blocked:ste < 10 || state.player.prestige < 60 };
    }
    if (career.guildRank === 'officer') {
      return { to:'guildmaster', cost:50, prestige:120, need:12,
        blocked:ste < 12 || state.player.prestige < 120 };
    }
    return null;
  };

  FB.takeGuildStep = function (state, c) {
    c = c || playerChar(state);
    const career = FB.careerOf(state, c);
    const step = FB.guildAdvance(state, c);
    if (!step || step.blocked || state.player.gold < step.cost) return false;
    state.player.gold -= step.cost;
    career.guildRank = step.to;
    career.guildStanding += step.to === 'member' ? 20 : 25;
    if (step.to === 'master') career.rank = 'master';
    if (c.id === state.player.charId) state.player.flags.guild_member = 1;
    state.player.prestige += step.to === 'guildmaster' ? 20 : 8;
    FB.news(state, FB.msg('news.guild.advanced', {
      forms: {
        select:'value', param:'rank', cases:{
          member:'🏅 {name} is admitted as a guild member.',
          master:'🏅 {name} is recognized as a guild master.',
          officer:'🏅 {name} takes a seat as a guild officer.',
          guildmaster:'🏅 {name} is raised as guildmaster.',
          other:'🏅 {name} rises at the guild bench.'
        }
      }
    }, { name:c.name, rank:step.to }));
    return true;
  };

  FB.applyMarriageBackground = function (c, station, epithet) {
    if (!c || !epithet || !epithet.key) return;
    const m = /\.([0-9]+)$/.exec(epithet.key);
    const n = m ? parseInt(m[1], 10) : 0;
    let profession = station >= 3 ? 'noble' : 'farmer';
    const background = {};
    if (station === 1 && (n === 1 || n === 2)) profession = 'craftsman';
    if (station === 2) {
      profession = (n === 0) ? 'merchant' : (n === 1 || n === 2) ? 'craftsman' : 'noble';
      if (n === 1) background.guildmasterFamily = true;
    }
    c.career = {
      profession:profession, rank:station >= 2 ? 'master' : 'journeyman',
      experience:station * 3, startedYear:null,
      guildRank:background.guildmasterFamily ? 'member' : 'none',
      guildStanding:background.guildmasterFamily ? 30 : 0, chosen:true
    };
    c.background = background;
  };

  FB.receiveMarriageLivelihood = function (state, c) {
    if (!c || !c.background || c.backgroundApplied) return;
    c.backgroundApplied = true;
    if (!c.background.guildmasterFamily) return;
    const me = playerChar(state);
    const career = FB.careerOf(state, me);
    if (career && FBDATA.careers[career.profession] && FBDATA.careers[career.profession].guild &&
      career.guildRank === 'none') {
      career.guildRank = 'member';
      career.guildStanding = 20;
      state.player.flags.guild_member = 1;
      FB.news(state, FB.msg('news.guild.marriage_sponsor',
        '🏅 {name}’s guild family sponsors you at the masters’ bench.', { name:c.name }));
    } else {
      state.player.gold += 10;
      FB.news(state, FB.msg('news.guild.marriage_connection',
        '🤝 {name}’s guild family opens its purse and its contacts to your household.',
        { name:c.name }));
    }
  };
})();
