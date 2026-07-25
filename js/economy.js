/* Fallowborn — household livelihoods, apprenticeship, guilds, enterprises. */
window.FB = window.FB || {};

(function () {
  'use strict';

  const GUILD_ORDER = { none:0, member:1, master:2, officer:3, guildmaster:4 };
  const RELIGIOUS_PATHS = {
    catholic_lay: [
      { id:'parishioner', pietyYield:0 },
      { id:'almsgiver', age:16, piety:10, gold:5, prestigeGain:2, pietyYield:0.25 },
      { id:'pilgrim', age:16, piety:30, gold:20, prestigeGain:5, pietyYield:0.5 },
      { id:'church_patron', age:18, piety:80, prestige:25, gold:80,
        prestigeGain:10, pietyYield:1 }
    ],
    catholic_monastic: [
      { id:'novice', pietyYield:0.25 },
      { id:'professed', age:16, years:2, learning:4, piety:25,
        prestigeGain:3, pietyYield:0.5 },
      { id:'prior', age:20, years:6, learning:7, piety:60, prestige:20,
        prestigeGain:8, pietyYield:1, station:1 },
      { id:'abbot', age:24, years:10, learning:9, piety:100, prestige:40, gold:25,
        prestigeGain:15, pietyYield:1.5, station:2, tier:2, flag:'abbot' },
      { id:'bishop', age:30, years:14, learning:12, piety:160, prestige:80, gold:100,
        prestigeGain:25, pietyYield:2.5, station:3, tier:3, flag:'bishop', maleOnly:true }
    ],
    catholic_clerical: [
      { id:'clerk', pietyYield:0.25 },
      { id:'acolyte', age:16, years:1, learning:3, piety:10,
        prestigeGain:2, pietyYield:0.5 },
      { id:'deacon', age:19, years:3, learning:5, piety:30,
        prestigeGain:4, pietyYield:0.75 },
      { id:'priest', age:24, years:5, learning:7, piety:50,
        prestigeGain:7, pietyYield:1, station:1 },
      { id:'archpriest', age:28, years:9, learning:9, piety:90, prestige:30,
        prestigeGain:12, pietyYield:1.5, station:2 },
      { id:'bishop', age:30, years:14, learning:12, piety:160, prestige:80, gold:100,
        prestigeGain:25, pietyYield:2.5, station:3, tier:3, flag:'bishop' }
    ],
    muslim_lay: [
      { id:'believer', pietyYield:0 },
      { id:'almsgiver', age:16, piety:10, gold:5, prestigeGain:2, pietyYield:0.25 },
      { id:'hajji', age:18, piety:35, gold:35, prestigeGain:6, pietyYield:0.5 },
      { id:'waqf_patron', age:18, piety:80, prestige:25, gold:100,
        prestigeGain:10, pietyYield:1 }
    ],
    muslim_scholar: [
      { id:'student', pietyYield:0.25 },
      { id:'licensed_scholar', age:16, years:2, learning:5, piety:20,
        prestigeGain:4, pietyYield:0.5 },
      { id:'mudarris', age:20, years:6, learning:8, piety:50, prestige:15,
        prestigeGain:8, pietyYield:1, station:1 },
      { id:'mufti', age:24, years:9, learning:10, piety:80, prestige:30,
        prestigeGain:12, pietyYield:1.5, station:2 },
      { id:'qadi', age:26, years:12, learning:11, piety:110, prestige:50, gold:25,
        prestigeGain:18, pietyYield:2, station:2, tier:2, flag:'qadi', maleOnly:true },
      { id:'chief_qadi', age:30, years:16, learning:13, piety:170, prestige:90, gold:100,
        prestigeGain:28, pietyYield:3, station:3, tier:3, flag:'chief_qadi', maleOnly:true }
    ],
    muslim_mosque: [
      { id:'mosque_servant', pietyYield:0.25 },
      { id:'muezzin', age:16, years:1, learning:3, piety:15,
        prestigeGain:2, pietyYield:0.5 },
      { id:'imam', age:20, years:4, learning:6, piety:40,
        prestigeGain:6, pietyYield:1, station:1 },
      { id:'khatib', age:24, years:8, learning:8, piety:75, prestige:25,
        prestigeGain:10, pietyYield:1.5, station:2 },
      { id:'chief_imam', age:28, years:12, learning:10, piety:120, prestige:50, gold:50,
        prestigeGain:18, pietyYield:2, station:2 }
    ]
  };
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
    state.player.profession = state.player.tier >= 3 &&
      career.profession !== 'monk' && career.profession !== 'priest'
      ? 'noble' : career.profession;
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
    const religionGroup = FB.religionOf(c.religion).group;
    const current = FB.careerOf(state, c);
    const playerClericalOffice = c.id === state.player.charId &&
      (state.player.flags.abbot || state.player.flags.bishop ||
        state.player.flags.qadi || state.player.flags.chief_qadi);
    const out = [];
    for (const id in FBDATA.careers) {
      const def = FBDATA.careers[id];
      if (def.hiddenChoice) continue;
      if (def.tierMin !== undefined && state.player.tier < def.tierMin) continue;
      if (def.maleOnly && c.sex !== 'm') continue;
      if (def.religionGroups && def.religionGroups.indexOf(religionGroup) < 0) continue;
      if (age < 16 && age < (def.apprenticeAge || 10)) continue;
      if (playerClericalOffice && id !== current.profession) continue;
      if (!playerClericalOffice && c.id === state.player.charId &&
        state.player.tier >= 3 && id !== 'noble') continue;
      out.push({ id:id, def:def, cost:age < 16 ? (def.apprenticeCost || 0) : 0 });
    }
    return out;
  };

  function religiousPathId(state, c) {
    const career = FB.careerOf(state, c);
    if (!career) return null;
    if (c.religion === 'catholic') {
      if (career.profession === 'monk') return 'catholic_monastic';
      if (career.profession === 'priest') return 'catholic_clerical';
      return 'catholic_lay';
    }
    if (FB.religionOf(c.religion).group === 'muslim') {
      if (career.profession === 'monk') return 'muslim_scholar';
      if (career.profession === 'priest') return 'muslim_mosque';
      return 'muslim_lay';
    }
    return null;
  }

  function religiousRankIndex(state, c, pathId) {
    c.religiousRanks = c.religiousRanks || {};
    let index = c.religiousRanks[pathId] || 0;
    if (state.player && c.id === state.player.charId) {
      const flags = state.player.flags || {};
      if (pathId === 'catholic_monastic') {
        if (flags.abbot) index = Math.max(index, 3);
        if (flags.bishop) index = Math.max(index, 4);
      } else if (pathId === 'catholic_clerical' && flags.bishop) {
        index = Math.max(index, 5);
      } else if (pathId === 'muslim_scholar') {
        if (flags.qadi) index = Math.max(index, 4);
        if (flags.chief_qadi) index = Math.max(index, 5);
      }
    }
    index = FB.clamp(index, 0, RELIGIOUS_PATHS[pathId].length - 1);
    c.religiousRanks[pathId] = index;
    return index;
  }

  FB.religiousPathOf = function (state, c) {
    const pathId = religiousPathId(state, c);
    if (!pathId) return null;
    const steps = RELIGIOUS_PATHS[pathId];
    const index = religiousRankIndex(state, c, pathId);
    return {
      id:pathId, steps:steps, index:index, step:steps[index],
      next:index + 1 < steps.length ? steps[index + 1] : null
    };
  };

  FB.religiousRankTitle = function (state, c, path) {
    path = path || FB.religiousPathOf(state, c);
    if (!path || !path.step) return '';
    const id = path.step.id;
    if (id === 'parishioner') return FB.T('Parishioner');
    if (id === 'believer') return FB.T('Believer');
    if (id === 'almsgiver') return FB.T('Almsgiver');
    if (id === 'pilgrim') return FB.T('Pilgrim');
    if (id === 'church_patron') return FB.T('Church Patron');
    if (id === 'hajji') return c.sex === 'f' ? FB.T('Hajja') : FB.T('Hajji');
    if (id === 'waqf_patron') return FB.T('Waqf Patron');
    if (id === 'novice') return FB.T('Novice');
    if (id === 'professed') return c.sex === 'f' ? FB.T('Professed Sister') : FB.T('Professed Brother');
    if (id === 'prior') return c.sex === 'f' ? FB.T('Prioress') : FB.T('Prior');
    if (id === 'abbot') return c.sex === 'f' ? FB.T('Abbess') : FB.T('Abbot');
    if (id === 'clerk') return FB.T('Clerk');
    if (id === 'acolyte') return FB.T('Acolyte');
    if (id === 'deacon') return FB.T('Deacon');
    if (id === 'priest') return FB.T('Priest');
    if (id === 'archpriest') return FB.T('Archpriest');
    if (id === 'bishop') return FB.T('Bishop');
    if (id === 'student') return FB.T('Student of the Faith');
    if (id === 'licensed_scholar') return FB.T('Licensed Scholar');
    if (id === 'mudarris') return FB.T('Mudarris');
    if (id === 'mufti') return FB.T('Mufti');
    if (id === 'qadi') return FB.T('Qadi');
    if (id === 'chief_qadi') return FB.T('Chief Qadi');
    if (id === 'mosque_servant') return FB.T('Mosque Servant');
    if (id === 'muezzin') return FB.T('Muezzin');
    if (id === 'imam') return FB.T('Imam');
    if (id === 'khatib') return FB.T('Khatib');
    if (id === 'chief_imam') return FB.T('Chief Imam');
    return '';
  };

  FB.religiousAdvance = function (state, c) {
    const path = FB.religiousPathOf(state, c);
    if (!path || !path.next) return null;
    const step = path.next;
    const career = FB.careerOf(state, c);
    const age = FB.ageOf(c, state.date.year);
    const blocked = (step.maleOnly && c.sex !== 'm') ||
      age < (step.age || 0) ||
      career.experience < (step.years || 0) ||
      FB.skillOf(c, 'lea') < (step.learning || 0) ||
      state.player.piety < (step.piety || 0) ||
      state.player.prestige < (step.prestige || 0) ||
      state.player.gold < (step.gold || 0);
    return { path:path, step:step, blocked:blocked };
  };

  function promotePlayerReligiously(state, step) {
    const p = state.player;
    if (step.flag) p.flags[step.flag] = 1;
    if (!step.tier || step.tier <= p.tier) return;
    p.tier = step.tier;
    if (p.tier >= 3 && !p.liege) {
      const rid = (state.holder && state.holder[p.provinceId]) || state.owner[p.provinceId];
      if (rid && rid !== 'player') p.liege = rid;
    }
  }

  FB.takeReligiousStep = function (state, c) {
    c = c || playerChar(state);
    const advance = FB.religiousAdvance(state, c);
    if (!advance || advance.blocked) return false;
    const path = advance.path;
    const step = advance.step;
    state.player.gold -= step.gold || 0;
    state.player.prestige += step.prestigeGain || 0;
    c.religiousRanks[path.id] = path.index + 1;
    if (step.station !== undefined) {
      c.station = Math.max(FB.stationOf(c), step.station);
    }
    const career = FB.careerOf(state, c);
    if (path.id.indexOf('_lay') < 0 && path.index + 1 >= 2 &&
      career.rank === 'journeyman') career.rank = 'master';
    if (c.id === state.player.charId) promotePlayerReligiously(state, step);
    FB.news(state, FB.msg('news.religion.advanced',
      '🛐 {name} advances in religious standing.', { name:c.name }));
    return true;
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

  /* The old station-only upkeep remains the base cost. Extra resident family
     members add food, clothing, and quarters at the standard their station is
     expected to maintain. Married children have their own households. */
  FB.householdUpkeepParts = function (state) {
    const p = state.player;
    const baseScale = FBDATA.balance.householdUpkeep || [1,1,2,4,6,9,14,20];
    const memberScale = FBDATA.balance.householdMemberUpkeep || [0.1,0.25,0.5];
    const lifestyle = FBDATA.balance.householdLifestyleMult || [1,1,1,1.25,1.5,2,2.5,3];
    const base = baseScale[p.tier] === undefined ? 1 : baseScale[p.tier];
    const mult = lifestyle[p.tier] || 1;
    const me = playerChar(state);
    let family = 0, residents = 0;
    for (const c of FB.householdMembers(state)) {
      if (c.id === me.id) continue;
      const age = FB.ageOf(c, state.date.year);
      family += (age < 6 ? memberScale[0] : age < 16 ? memberScale[1] : memberScale[2]) * mult;
      residents++;
    }
    return { base:base, family:family, residents:residents, total:base + family };
  };

  FB.householdUpkeep = function (state) {
    return FB.householdUpkeepParts(state).total;
  };

  /* A minor player and each unmarried child may receive instruction. The
     focus is the subject; edu.school names a paid institution, while tutorId
     keeps the existing named household/neighbour teacher. */
  FB.educationStudents = function (state) {
    const me = playerChar(state);
    const out = [], seen = {};
    function add(c) {
      if (!c || c.dead || seen[c.id]) return;
      const age = FB.ageOf(c, state.date.year);
      if (age < 6 || age >= 16) return;
      seen[c.id] = 1;
      out.push(c);
    }
    add(me);
    for (const id of (me.childrenIds || [])) {
      const c = state.chars[id];
      if (c && (!FB.spouseOf(state, c) || c.id === me.id)) add(c);
    }
    return out;
  };

  /* Old saves with a one-off hired master have no school id. Recognize the
     generated tutor role and move them onto the recurring personal-master
     arrangement lazily. */
  FB.schoolingId = function (state, c) {
    if (!c || !c.edu) return null;
    if (c.edu.school && FBDATA.schooling[c.edu.school]) return c.edu.school;
    const tutor = c.edu.tutorId && c.edu.tutorId !== 'self' ? state.chars[c.edu.tutorId] : null;
    if (tutor && tutor.role === 'tutor') {
      c.edu.school = 'master';
      return 'master';
    }
    return null;
  };

  FB.educationTutor = function (state, c, reportLoss) {
    if (!c || !c.edu || !c.edu.tutorId) return null;
    const me = playerChar(state);
    let tutor = null;
    if (c.edu.tutorId === 'self') tutor = c.id === me.id ? null : me;
    else tutor = state.chars[c.edu.tutorId];
    if (tutor && !tutor.dead) return tutor;
    c.edu.tutorId = null;
    if (c.edu.school === 'master') c.edu.school = null;
    if (reportLoss) {
      FB.news(state, FB.msg('news.life.tutor_died', {
        forms: {
          select:'value', param:'self', cases:{
            yes:'🕯 Your tutor has died; the lessons pause.',
            other:'🕯 {name}’s tutor has died; the lessons pause.'
          }
        }
      }, { self:c.id === me.id ? 'yes' : 'other', name:c.name }));
    }
    return null;
  };

  FB.schoolingAvailable = function (state, c, id) {
    const def = FBDATA.schooling[id];
    if (!def || !c) return false;
    const age = FB.ageOf(c, state.date.year);
    if (age < 6 || age >= 16) return false;
    if (def.devMin && (state.dev[state.player.provinceId] || 1) < def.devMin) return false;
    if (def.focuses && (!c.edu || def.focuses.indexOf(c.edu.focus) < 0)) return false;
    return true;
  };

  FB.schoolingCost = function (state, c) {
    const id = FB.schoolingId(state, c);
    const def = id && FBDATA.schooling[id];
    if (id === 'master' && !FB.educationTutor(state, c, false)) return 0;
    return c && c.edu && c.edu.focus && def && FB.schoolingAvailable(state, c, id) ?
      (def.cost || 0) : 0;
  };

  /* Full-year directed-learning chance supplied by the current teacher or
     school, before household "Letters" and before partial-term accounting. */
  FB.educationInstructionChance = function (state, c) {
    const B = FBDATA.balance;
    const base = B.educationBaseChance === undefined ? 0.18 : B.educationBaseChance;
    const cap = B.educationChanceCap || 0.9;
    if (!c || !c.edu || !c.edu.focus) return base;
    const id = FB.schoolingId(state, c);
    const def = id && FBDATA.schooling[id];
    if (def && FB.schoolingAvailable(state, c, id) && def.chance !== undefined) {
      return Math.min(cap, def.chance);
    }
    const tutor = FB.educationTutor(state, c, false);
    if (!tutor) return base;
    return Math.min(cap, (B.educationTutorBase === undefined ? 0.3 : B.educationTutorBase) +
      FB.skillOf(tutor, c.edu && c.edu.focus) *
      (B.educationTutorSkillChance === undefined ? 0.04 : B.educationTutorSkillChance));
  };

  FB.schoolingSeasonCost = function (state) {
    let total = 0;
    for (const c of FB.educationStudents(state)) total += FB.schoolingCost(state, c);
    return total;
  };

  FB.schoolingCostBreakdown = function (state) {
    const out = [];
    for (const c of FB.educationStudents(state)) {
      const cost = FB.schoolingCost(state, c);
      const id = FB.schoolingId(state, c);
      if (cost && id) out.push({ c:c, id:id, cost:cost });
    }
    return out;
  };

  /* Four paid seasonal terms build one year's instruction bonus. A missed
     fee pauses only that term; earlier lessons remain useful and the school
     retries next season. Free named tutors accrue terms through the same path. */
  FB.educationSeason = function (state) {
    const B = FBDATA.balance;
    const base = B.educationBaseChance === undefined ? 0.18 : B.educationBaseChance;
    for (const c of FB.educationStudents(state)) {
      if (!c.edu || !c.edu.focus) continue;
      const id = FB.schoolingId(state, c);
      if (c.edu.tutorId && !FB.educationTutor(state, c, true)) continue;
      const chance = FB.educationInstructionChance(state, c);
      if (chance <= base) continue;
      const def = id && FBDATA.schooling[id];
      const cost = def ? (def.cost || 0) : 0;
      if (cost && state.player.gold + 0.0001 < cost) {
        if (!c.edu.schoolUnpaid) {
          c.edu.schoolUnpaid = 1;
          FB.news(state, FB.msg('news.education.fee_missed', {
            forms: {
              select:'value', param:'self', cases:{
                yes:'📕 You cannot meet the school fee; your lessons pause for the season.',
                other:'📕 The school fee for {name} cannot be met; their lessons pause for the season.'
              }
            }
          }, { self:c.id === state.player.charId ? 'yes' : 'other', name:c.name }));
        }
        continue;
      }
      if (cost) state.player.gold -= cost;
      delete c.edu.schoolUnpaid;
      c.edu.lessonBoost = (c.edu.lessonBoost || 0) + (chance - base) / 4;
    }
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
    /* A traveler cannot operate a home enterprise from the road. Other
       assigned household workers and every unconnected contract continue. */
    if (state.player.travel && worker.id === state.player.charId) return 0;
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
      if (FB.ageOf(c, state.date.year) < 16) continue;
      const religious = FB.religiousPathOf(state, c);
      if (religious && religious.step.pietyYield) amount += religious.step.pietyYield;
      if (c.id === me.id) continue;
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

  /* ================= coin, credit, and financial contracts =================
     Authored gold remains real "base gold". The price index records how many
     nominal coins buy one base gold; annual price movement revalues only the
     liquid purse and fixed nominal contracts. Everything below is plain saved
     data and is initialized lazily so old version-3 lives enter cleanly. */

  function financeSettled(status) {
    return status === 'repaid' || status === 'defaulted' ||
      status === 'settled' || status === 'resolved';
  }

  FB.ensureEconomy = function (state) {
    const e = state.economy = state.economy || {};
    if (!(e.price > 0)) e.price = 1;
    if (e.lastRate === undefined) e.lastRate = 0;
    if (e.pressure === undefined) e.pressure = 0;
    if (e.lastAdjustment === undefined) e.lastAdjustment = 0;
    if (!Array.isArray(e.shocks)) e.shocks = [];
    if (!Array.isArray(e.loans)) e.loans = [];
    if (!Array.isArray(e.investments)) e.investments = [];
    if (!(e.nextId >= 1)) e.nextId = 1;
    let highestId = 0;
    for (const loan of e.loans) if (loan.id > highestId) highestId = loan.id;
    for (const inv of e.investments) if (inv.id > highestId) highestId = inv.id;
    if (e.nextId <= highestId) e.nextId = highestId + 1;
    if (!(e.defaults >= 0)) e.defaults = 0;
    if (!(e.debasements >= 0)) e.debasements = 0;
    if (!(e.recoinages >= 0)) e.recoinages = 0;
    return e;
  };

  FB.addPricePressure = function (state, amount, years, source) {
    amount = Number(amount);
    years = Math.max(1, Math.floor(Number(years) || 1));
    if (!isFinite(amount) || !amount) return false;
    FB.ensureEconomy(state).shocks.push({
      amount:amount, years:years, source:String(source || 'event')
    });
    return true;
  };

  FB.financeDueNow = function (state, loan) {
    const price = FB.ensureEconomy(state).price;
    if (!loan || financeSettled(loan.status)) return 0;
    return loan.denomination === 'real' ? loan.face : loan.face / price;
  };

  FB.financeActiveLoans = function (state) {
    const out = [];
    for (const loan of FB.ensureEconomy(state).loans) {
      if (!financeSettled(loan.status)) out.push(loan);
    }
    out.sort(function (a, b) { return a.id - b.id; });
    return out;
  };

  FB.financeActiveInvestments = function (state) {
    const out = [];
    for (const inv of FB.ensureEconomy(state).investments) {
      if (inv.status === 'active') out.push(inv);
    }
    out.sort(function (a, b) { return a.id - b.id; });
    return out;
  };

  FB.financeHasDefault = function (state) {
    for (const loan of FB.financeActiveLoans(state)) {
      if (loan.status === 'default') return true;
    }
    return false;
  };

  function collateralKey(collateral) {
    return collateral ? collateral.kind + ':' + collateral.id : '';
  }

  function collateralPledged(state, collateral) {
    const key = collateralKey(collateral);
    if (!key) return false;
    for (const loan of FB.financeActiveLoans(state)) {
      if (collateralKey(loan.collateral) === key) return true;
    }
    return false;
  }

  FB.financeCollateralPledged = function (state, kind, id) {
    return collateralPledged(state, { kind:kind, id:id });
  };

  FB.financeCollateral = function (state) {
    const out = [];
    if (!FB.itemList || !FB.holdingList) return out;
    for (const id of FB.itemList(state)) {
      const item = FB.resolveItem ? FB.resolveItem(state, id) : null;
      const collateral = { kind:'item', id:id };
      if (item && item.value > 0 && !collateralPledged(state, collateral) &&
        (!FB.itemAssignment || !FB.itemAssignment(state, id))) {
        out.push({ collateral:collateral, value:item.value });
      }
    }
    for (const id of FB.holdingList(state)) {
      const def = FBDATA.holdings[id];
      const collateral = { kind:'holding', id:id };
      if (def && def.cost > 0 && !def.eventOnly && def.pledge !== false &&
        !collateralPledged(state, collateral)) {
        out.push({ collateral:collateral, value:def.cost });
      }
    }
    out.sort(function (a, b) {
      if (b.value !== a.value) return b.value - a.value;
      return collateralKey(a.collateral) < collateralKey(b.collateral) ? -1 : 1;
    });
    return out;
  };

  function outstandingValue(state) {
    let total = 0;
    for (const loan of FB.financeActiveLoans(state)) total += FB.financeDueNow(state, loan);
    return total;
  }

  function assignedRevenueBase(state, loan) {
    if (loan.kind === 'merchant' && FB.reliableGoldIncome) {
      return Math.max(0, FB.reliableGoldIncome(state, true));
    }
    return Math.max(0, FB.playerTax ? FB.playerTax(state) : 0);
  }

  FB.financeAssignedIncomeCost = function (state) {
    const share = FBDATA.balance.financeRevenueShare || 0.25;
    let assigned = 0;
    for (const loan of FB.financeActiveLoans(state)) {
      if (loan.status === 'default' && loan.defaultKind === 'revenue') {
        assigned += Math.min(FB.financeDueNow(state, loan),
          assignedRevenueBase(state, loan) * share);
      }
    }
    return assigned;
  };

  FB.financeCreditCapacity = function (state, collateral, secured) {
    const B = FBDATA.balance;
    const income = FB.reliableGoldIncome ? FB.reliableGoldIncome(state) : 0;
    const seasons = secured ? (B.financeSecuredSeasons || 4) :
      (B.financeUnsecuredSeasons || 2);
    let capacity = Math.max(0, income) * seasons;
    if (collateral && collateral.value) {
      capacity += collateral.value * (B.financeCollateralRatio || 0.35);
    }
    /* Reputation improves an already viable cash flow; it cannot conjure
       unsecured credit for an insolvent household. */
    if (income > 0) {
      capacity += Math.min(B.financePrestigeMax || 25,
        Math.max(0, state.player.prestige || 0) / 20);
    }
    return Math.max(0, capacity - outstandingValue(state));
  };

  function currentCareer(state) {
    const c = state.chars[state.player.charId];
    return c && FB.careerOf ? FB.careerOf(state, c) : null;
  }

  function lenderConfidencePenalty(e) {
    return (e.defaults || 0) + Math.max(0, (e.debasements || 0) - (e.recoinages || 0));
  }

  FB.financeLoanOffers = function (state) {
    const e = FB.ensureEconomy(state);
    const B = FBDATA.balance;
    const defs = FBDATA.finance || {};
    const out = [];
    const borrower = state.chars[state.player.charId];
    if (!borrower || FB.ageOf(borrower, state.date.year) < 16 ||
      FB.financeActiveLoans(state).length >= (B.financeMaxLoans || 2) ||
      FB.financeHasDefault(state) ||
      (e.creditBanUntil !== undefined && state.turn < e.creditBanUntil)) return out;

    const pledge = defs.pledge;
    if (pledge) {
      for (const asset of FB.financeCollateral(state)) {
        const cap = FB.financeCreditCapacity(state, asset, true);
        const principal = Math.floor(Math.min(pledge.maxPrincipal || 40, cap,
          asset.value * (pledge.collateralRatio || 0.6)));
        if (principal >= 5) {
          out.push({ kind:'pledge', principal:principal,
            collateral:asset.collateral, collateralValue:asset.value });
        }
      }
    }

    const career = currentCareer(state);
    const income = FB.reliableGoldIncome ? FB.reliableGoldIncome(state) : 0;
    if (defs.merchant && income > 0 && career &&
      (career.profession === 'merchant' || career.profession === 'craftsman' ||
        state.player.tier === 2)) {
      const principal = Math.floor(Math.min(defs.merchant.maxPrincipal || 100,
        FB.financeCreditCapacity(state, null, false)));
      if (principal >= 10) out.push({ kind:'merchant', principal:principal, collateral:null });
    }
    if (defs.revenue && state.player.tier >= 3 && income > 0) {
      const principal = Math.floor(Math.min(defs.revenue.maxPrincipal || 500,
        FB.financeCreditCapacity(state, null, true)));
      if (principal >= 20) out.push({ kind:'revenue', principal:principal, collateral:null });
    }

    /* Stable presentation and hotkey order: emergency pledge first, then
       merchant and landed contracts; strongest collateral first within pledge. */
    return out;
  };

  function financeTermDate(state, seasons) {
    const n = state.date.season + seasons;
    return { season:n % 4, year:state.date.year + Math.floor(n / 4) };
  }

  function financeDueTurn(state, seasons) {
    return state.turn + (90 - state.date.day + 1) + (Math.max(1, seasons) - 1) * 90;
  }

  function findOffer(state, kind, collateral) {
    const key = collateralKey(collateral);
    for (const offer of FB.financeLoanOffers(state)) {
      if (offer.kind === kind && collateralKey(offer.collateral) === key) return offer;
    }
    return null;
  }

  FB.financeLoanPreview = function (state, offer) {
    const def = offer && FBDATA.finance && FBDATA.finance[offer.kind];
    if (!offer || !def) return null;
    const e = FB.ensureEconomy(state);
    const confidence = lenderConfidencePenalty(e);
    const markup = (def.markup || 0) + Math.min(0.20,
      (e.defaults || 0) * 0.03 + Math.max(0, (e.debasements || 0) -
        (e.recoinages || 0)) * 0.04);
    const denomination = offer.kind !== 'pledge' && confidence >= 2 ? 'real' : 'nominal';
    const due = financeTermDate(state, def.termSeasons);
    const face = denomination === 'real'
      ? offer.principal * (1 + markup)
      : offer.principal * e.price * (1 + markup);
    return {
      principal:offer.principal, markup:markup, denomination:denomination,
      face:face, dueNow:denomination === 'real' ? face : face / e.price,
      dueSeason:due.season, dueYear:due.year, termSeasons:def.termSeasons,
      defaultKind:def.defaultKind, collateral:offer.collateral || null
    };
  };

  FB.takeFinanceLoan = function (state, kind, collateral) {
    const offer = findOffer(state, kind, collateral);
    const def = FBDATA.finance && FBDATA.finance[kind];
    if (!offer || !def) return null;
    /* A pledge must be unassigned before the contract exists. The exact
       reference remains in the armory but cannot be worn, sold, or gifted. */
    if (offer.collateral && offer.collateral.kind === 'item' &&
      (!FB.pledgeItem || !FB.pledgeItem(state, offer.collateral.id))) return null;
    const e = FB.ensureEconomy(state);
    const preview = FB.financeLoanPreview(state, offer);
    const loan = {
      id:e.nextId++, kind:kind, lender:def.lender,
      principal:offer.principal, issuePrice:e.price, face:preview.face,
      denomination:preview.denomination,
      dueTurn:financeDueTurn(state, def.termSeasons),
      dueSeason:preview.dueSeason, dueYear:preview.dueYear,
      collateral:offer.collateral || null,
      defaultKind:def.defaultKind, arrears:0, status:'active'
    };
    e.loans.push(loan);
    state.player.gold += offer.principal;
    FB.news(state, FB.msg('news.finance.loan_taken',
      '📜 A lender advances {money:principal} to the household; the signed obligation is worth {money:due} today.',
      { principal:offer.principal, due:Math.round(FB.financeDueNow(state, loan) * 10) / 10 }));
    return loan;
  };

  function findLoan(state, id) {
    for (const loan of FB.ensureEconomy(state).loans) if (loan.id === id) return loan;
    return null;
  }

  FB.repayFinanceLoan = function (state, id, automatic) {
    const loan = findLoan(state, id);
    const due = FB.financeDueNow(state, loan);
    if (!loan || financeSettled(loan.status) || loan.status === 'default' ||
      state.player.gold + 0.000001 < due) return false;
    state.player.gold = Math.max(0, state.player.gold - due);
    loan.status = 'repaid';
    loan.repaidTurn = state.turn;
    FB.news(state, FB.msg('news.finance.loan_repaid',
      '⚖ The household repays {money:amount} and clears its obligation.',
      { amount:Math.round(due * 10) / 10, automatic:automatic ? 'yes' : 'no' }));
    return true;
  };

  function loseCollateral(state, collateral) {
    if (!collateral) return false;
    if (collateral.kind === 'item' && FB.destroyItem) {
      return FB.destroyItem(state, collateral.id, { force:true });
    }
    let list = null;
    if (collateral.kind === 'holding' && FB.holdingList) list = FB.holdingList(state);
    if (!list) return false;
    const at = list.indexOf(collateral.id);
    if (at < 0) return false;
    list.splice(at, 1);
    return true;
  }

  function defaultLoan(state, loan) {
    const e = FB.ensureEconomy(state);
    e.defaults++;
    e.creditBanUntil = Math.max(e.creditBanUntil || 0, state.turn +
      (FBDATA.balance.financeDefaultBanSeasons || 4) * 90);
    state.player.prestige = Math.max(0, state.player.prestige -
      (FBDATA.balance.financeDefaultPrestige || 15));
    if (state.player.tier >= 6 && FB.councilAuthority) {
      FB.councilAuthority(state, -5);
      if (FB.councilMembers && FB.adjustLiegeOp) {
        for (const member of FB.councilMembers(state)) {
          FB.adjustLiegeOp(state, member.rid, -5);
        }
      }
    } else if (state.player.tier >= 3 && state.player.liege) {
      state.player.liegeOp = FB.clamp((state.player.liegeOp || 0) - 5, -100, 100);
    }
    if (loan.defaultKind === 'collateral') {
      const asset = loan.collateral && loan.collateral.kind === 'item' && FB.itemParam
        ? FB.itemParam(state, loan.collateral.id)
        : FB.dataParam(loan.collateral.kind, loan.collateral.id);
      const lost = loseCollateral(state, loan.collateral);
      loan.status = 'defaulted';
      loan.defaultTurn = state.turn;
      if (lost) {
        FB.news(state, FB.msg('news.finance.collateral_lost',
          '⚠ The household defaults; the lender takes {asset} in settlement.',
          { asset:asset }));
      } else {
        FB.news(state, FB.msg('news.finance.default_unsecured',
          '⚠ The household defaults. Its name is struck from the lenders’ good books.',
          {}));
      }
    } else {
      loan.status = 'default';
      loan.defaultTurn = state.turn;
      FB.news(state, FB.msg('news.finance.revenue_default',
        '⚠ The household defaults; one quarter of its regular revenues is assigned to the lender until the obligation is cleared.',
        {}));
    }
  }

  function processLoan(state, loan) {
    if (financeSettled(loan.status) || loan.status === 'default' ||
      state.turn < loan.dueTurn) return;
    if (FB.repayFinanceLoan(state, loan.id, true)) return;
    if (!loan.arrears) {
      loan.arrears = 1;
      loan.status = 'arrears';
      loan.face *= 1 + (FBDATA.balance.financeArrearsPenalty || 0.10);
      const seasons = FBDATA.balance.financeArrearsSeasons || 2;
      loan.dueTurn += seasons * 90;
      const due = financeTermDate(state, seasons);
      loan.dueSeason = due.season;
      loan.dueYear = due.year;
      FB.news(state, FB.msg('news.finance.arrears',
        '⌛ A payment is missed. The lender adds the signed penalty and grants two more seasons.',
        {}));
      return;
    }
    defaultLoan(state, loan);
  }

  function collectAssignedRevenue(state) {
    const share = FBDATA.balance.financeRevenueShare || 0.25;
    const loans = FB.financeActiveLoans(state);
    for (const loan of loans) {
      if (loan.status !== 'default' || loan.defaultKind !== 'revenue') continue;
      const due = FB.financeDueNow(state, loan);
      const levy = Math.min(due, state.player.gold,
        assignedRevenueBase(state, loan) * share);
      if (!(levy > 0)) continue;
      state.player.gold -= levy;
      if (loan.denomination === 'real') loan.face = Math.max(0, loan.face - levy);
      else loan.face = Math.max(0, loan.face - levy * FB.ensureEconomy(state).price);
      if (FB.financeDueNow(state, loan) < 0.01) {
        loan.status = 'settled';
        loan.face = 0;
        FB.news(state, FB.msg('news.finance.revenue_settled',
          '⚖ The last assigned revenues reach the lender; the defaulted obligation is settled.',
          {}));
      }
    }
  }

  FB.tradePartnershipName = function (state) {
    const c = state.chars[state.player.charId];
    const group = c ? FB.religionOf(c.religion).group : 'default';
    if (group === 'muslim') return FB.T('Qirad partnership');
    if (group === 'jewish') return FB.T('Trade partnership');
    return FB.T('Commenda partnership');
  };

  function hasTradeHouse(state) {
    for (const enterprise of FB.enterpriseList(state)) {
      if (enterprise.type === 'trade_house_business') return true;
    }
    return false;
  }

  FB.tradeInvestmentStakes = function (state) {
    const career = currentCareer(state);
    if (!career || (career.profession !== 'merchant' && career.profession !== 'craftsman')) return [];
    const stakes = [20];
    if (hasTradeHouse(state) || career.guildRank === 'master' ||
      career.guildRank === 'officer' || career.guildRank === 'guildmaster') stakes.push(50);
    if (hasTradeHouse(state) && (career.guildRank === 'officer' ||
      career.guildRank === 'guildmaster')) stakes.push(100);
    return stakes;
  };

  FB.canStartTradeInvestment = function (state, stake) {
    if (FB.financeActiveInvestments(state).length >=
      (FBDATA.balance.financeMaxInvestments || 3)) return false;
    if (state.player.gold < stake) return false;
    return FB.tradeInvestmentStakes(state).indexOf(stake) >= 0;
  };

  FB.startTradeInvestment = function (state, stake, source) {
    stake = Math.floor(Number(stake) || 0);
    const eventOffer = source === 'caravan_event' &&
      (stake === 20 || stake === 50) &&
      FB.financeActiveInvestments(state).length <
        (FBDATA.balance.financeMaxInvestments || 3) &&
      state.player.gold >= stake;
    if (!eventOffer && !FB.canStartTradeInvestment(state, stake)) return null;
    const e = FB.ensureEconomy(state);
    const def = FBDATA.finance.tradePartnership;
    const due = financeTermDate(state, def.termSeasons);
    const inv = {
      id:e.nextId++, kind:'trade_partnership', stake:stake,
      dueTurn:financeDueTurn(state, def.termSeasons),
      dueSeason:due.season, dueYear:due.year,
      risk:def.risk, profitShare:def.profitShare,
      source:String(source || 'finance'), status:'active'
    };
    e.investments.push(inv);
    state.player.gold -= stake;
    FB.news(state, FB.msg('news.finance.investment_started',
      '🧭 The household commits {money:stake} to a distant trade partnership.',
      { stake:stake }));
    return inv;
  };

  function matureInvestment(state, inv) {
    if (inv.status !== 'active' || state.turn < inv.dueTurn) return;
    const roll = FB.rng();
    let outcome, payout;
    if (roll < inv.risk) {
      outcome = 'loss'; payout = 0;
    } else if (roll < inv.risk + 0.15) {
      outcome = 'partial'; payout = Math.round(inv.stake * 0.5);
    } else if (roll > 0.93) {
      outcome = 'exceptional'; payout = Math.round(inv.stake * (1 + inv.profitShare * 2.5));
    } else {
      outcome = 'profit'; payout = Math.round(inv.stake * (1 + inv.profitShare));
    }
    /* Store the irreversible resolution before publishing it. Reloading or
       reopening the Finance panel can never consume another roll. */
    inv.roll = roll;
    inv.outcome = outcome;
    inv.payout = payout;
    inv.status = 'resolved';
    inv.resolvedTurn = state.turn;
    state.player.gold += payout;
    const me = state.chars[state.player.charId];
    if (me && payout > inv.stake && FB.gainSkill) FB.gainSkill(me, 'ste', 1);
    FB.news(state, FB.msg('news.finance.investment_matured', {
      forms: {
        select:'value', param:'outcome', cases:{
          loss:'🌊 The trade partnership is lost with every coin committed.',
          partial:'🧭 The trade partnership limps home; {money:payout} is salvaged.',
          profit:'🧭 The trade partnership prospers and returns {money:payout}.',
          exceptional:'✨ The trade partnership returns a remarkable {money:payout}.',
          other:'🧭 The trade partnership is resolved.'
        }
      }
    }, { outcome:outcome, payout:payout }));
  }

  FB.financeSeason = function (state) {
    FB.ensureEconomy(state);
    collectAssignedRevenue(state);
    const loans = FB.financeActiveLoans(state);
    for (const loan of loans) processLoan(state, loan);
    const investments = FB.financeActiveInvestments(state);
    for (const inv of investments) matureInvestment(state, inv);
  };

  FB.financeYear = function (state) {
    const e = FB.ensureEconomy(state);
    if (e.lastYear === state.date.year) return false;
    e.lastYear = state.date.year;
    const B = FBDATA.balance;
    let shock = 0;
    const remain = [];
    for (const item of e.shocks) {
      shock += Number(item.amount) || 0;
      item.years = Math.max(0, (Number(item.years) || 0) - 1);
      if (item.years > 0) remain.push(item);
    }
    e.shocks = remain;
    const random = FB.rf(-(B.priceRandomPressure || 0.015),
      B.priceRandomPressure || 0.015);
    const war = FB.atWarPersonally && FB.atWarPersonally(state)
      ? (B.priceWarPressure || 0.01) : 0;
    e.pressure = e.pressure * (B.pricePressurePersistence || 0.55) +
      random + war + shock;
    const raw = e.pressure + (1 - e.price) * (B.priceMeanReversion || 0.04);
    const minRate = shock ? (B.priceShockMin || -0.12) : (B.priceAnnualMin || -0.03);
    const maxRate = shock ? (B.priceShockMax || 0.15) : (B.priceAnnualMax || 0.04);
    const rate = FB.clamp(raw, minRate, maxRate);
    const oldPrice = e.price;
    const oldGold = state.player.gold;
    const newPrice = FB.clamp(oldPrice * (1 + rate),
      B.priceMin || 0.5, B.priceMax || 3);
    state.player.gold *= oldPrice / newPrice;
    e.price = newPrice;
    e.lastRate = newPrice / oldPrice - 1;
    e.lastAdjustment = state.player.gold - oldGold;
    if (Math.abs(e.lastRate) >= 0.01 || Math.abs(e.lastAdjustment) >= 1) {
      FB.news(state, FB.msg('news.finance.prices', {
        forms: {
          select:'value', param:'direction', cases:{
            inflation:'💰 Prices rise {rate}% this year; the purse loses {money:amount} of purchasing power.',
            deflation:'💰 Prices fall {rate}% this year; the purse gains {money:amount} of purchasing power.',
            inflation_empty:'💰 Prices rise {rate}% this year; circulating coin buys less.',
            deflation_empty:'💰 Prices fall {rate}% this year; circulating coin buys more.',
            other:'💰 The value of coin changes this year.'
          }
        }
      }, {
        direction:(e.lastRate >= 0 ? 'inflation' : 'deflation') +
          (Math.abs(e.lastAdjustment) < 0.05 ? '_empty' : ''),
        rate:Math.round(Math.abs(e.lastRate) * 1000) / 10,
        amount:Math.round(Math.abs(e.lastAdjustment) * 10) / 10
      }));
    }
    return true;
  };

  FB.financeCanDebase = function (state) {
    const e = FB.ensureEconomy(state);
    const cooldown = FBDATA.balance.financeDebaseCooldown || 1800;
    return state.player.tier >= 6 && !state.player.liege &&
      (e.lastDebasementTurn === undefined ||
        state.turn - e.lastDebasementTurn >= cooldown);
  };

  FB.financeDebasePreview = function (state) {
    const e = FB.ensureEconomy(state);
    return {
      gold:Math.max(50, Math.round((FB.playerTax ? FB.playerTax(state) : 20) * 3)),
      pressure:(FBDATA.balance.financeDebasePressure || 0.06) +
        Math.min(0.04, (e.debasements || 0) * 0.01),
      years:FBDATA.balance.financeDebaseYears || 4
    };
  };

  FB.debaseCoinage = function (state) {
    if (!FB.financeCanDebase(state)) return false;
    const e = FB.ensureEconomy(state);
    const preview = FB.financeDebasePreview(state);
    e.debasements++;
    e.lastDebasementTurn = state.turn;
    state.player.gold += preview.gold;
    state.player.prestige = Math.max(0, state.player.prestige - 35 - e.debasements * 5);
    state.player.pop = FB.clamp((state.player.pop || 0) - 10 - e.debasements * 2, -100, 100);
    FB.addPricePressure(state, preview.pressure, preview.years, 'debasement');
    if (FB.councilAuthority) FB.councilAuthority(state, 5);
    if (FB.councilMembers && FB.adjustLiegeOp) {
      for (const member of FB.councilMembers(state)) FB.adjustLiegeOp(state, member.rid, -8);
    }
    FB.news(state, FB.msg('news.finance.debasement',
      '💰 The crown debases the coinage and takes {money:gold} in seigniorage. Prices and confidence suffer.',
      { gold:preview.gold }));
    return true;
  };

  FB.financeCanRecoin = function (state) {
    const e = FB.ensureEconomy(state);
    const cost = Math.max(30, Math.round((FB.playerTax ? FB.playerTax(state) : 15) * 2));
    return state.player.tier >= 6 && !state.player.liege && e.debasements > e.recoinages &&
      e.price > 1.02 && state.player.gold >= cost &&
      (e.lastRecoinTurn === undefined || state.turn - e.lastRecoinTurn >= 1800);
  };

  FB.financeRecoinPreview = function (state) {
    return {
      cost:Math.max(30, Math.round((FB.playerTax ? FB.playerTax(state) : 15) * 2)),
      pressure:-0.05, years:3
    };
  };

  FB.recoinCurrency = function (state) {
    if (!FB.financeCanRecoin(state)) return false;
    const e = FB.ensureEconomy(state);
    const preview = FB.financeRecoinPreview(state);
    state.player.gold -= preview.cost;
    state.player.prestige += 15;
    e.recoinages++;
    e.lastRecoinTurn = state.turn;
    FB.addPricePressure(state, preview.pressure, preview.years, 'recoinage');
    if (FB.councilAuthority) FB.councilAuthority(state, -3);
    FB.news(state, FB.msg('news.finance.recoinage',
      '⚖ The crown calls in the light coin and restores its weight at a cost of {money:cost}.',
      { cost:preview.cost }));
    return true;
  };

  FB.financeSuccession = function (state) {
    const loans = FB.financeActiveLoans(state);
    for (const loan of loans) processLoan(state, loan);
    const inherited = FB.financeActiveLoans(state);
    if (!inherited.length) return;
    let total = 0;
    for (const loan of inherited) total += FB.financeDueNow(state, loan);
    FB.news(state, FB.msg('news.finance.inherited', {
      forms: {
        select:'plural', param:'count', cases:{
          one:'📜 The successor inherits one active obligation, now worth {money:amount}.',
          other:'📜 The successor inherits {count} active obligations, now worth {money:amount}.'
        }
      }
    }, { count:inherited.length, amount:Math.round(total * 10) / 10 }));
  };

  /* Existing caravan content enters the same timed, once-resolved investment
     system as the Finance panel. The registry exists before events.js loads. */
  FB.fns = FB.fns || {};
  FB.fns.finance_can_invest = function (state) {
    return FB.financeActiveInvestments(state).length <
      (FBDATA.balance.financeMaxInvestments || 3);
  };
  FB.fns.finance_trade_20 = function (state) {
    FB.startTradeInvestment(state, 20, 'caravan_event');
  };
  FB.fns.finance_trade_50 = function (state) {
    FB.startTradeInvestment(state, 50, 'caravan_event');
  };
})();
