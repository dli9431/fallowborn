/* Fallowborn — household livelihoods, apprenticeship, guilds, enterprises. */
window.FB = window.FB || {};

(function () {
  'use strict';

  const GUILD_ORDER = { none:0, member:1, master:2, officer:3, guildmaster:4 };
  const CAREER_RANK_ORDER = {
    unassigned:0, apprentice:1, journeyman:2, master:3
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
      FB.playerDescendantKind(state, c.id)));
  }
  function managedCareerCharacter(state, c) {
    if (!state || !c || c.dead) return false;
    if (FB.isExternalHouseholdAuthority &&
        FB.isExternalHouseholdAuthority(state, c)) return false;
    if (FB.isHouseholdCharacter && FB.isHouseholdCharacter(state, c.id)) {
      return true;
    }
    /* Resident unwed siblings accept career direction without joining the
       household (see FB.manageableKinKind for the exact rule). */
    return !!(FB.manageableKinKind && FB.manageableKinKind(state, c.id));
  }
  function enterpriseAssignedIds(enterprise) {
    const out = [], seen = {};
    function add(id) {
      if (!id || seen[id]) return;
      seen[id] = 1;
      out.push(id);
    }
    add(enterprise && enterprise.workerId);
    if (enterprise && Array.isArray(enterprise.workerIds)) {
      for (const id of enterprise.workerIds) add(id);
    }
    return out;
  }
  function syncEnterpriseAssignedIds(enterprise, ids) {
    const out = [], seen = {};
    for (const id of (ids || [])) {
      if (!id || seen[id]) continue;
      seen[id] = 1;
      out.push(id);
    }
    enterprise.workerId = out.length ? out[0] : null;
    if (out.length > 1) enterprise.workerIds = out;
    else if (enterprise.workerIds !== undefined) delete enterprise.workerIds;
    if (!out.length) unlockEnterprise(enterprise);
    return out;
  }
  function removeEnterpriseAssignedId(enterprise, cid) {
    return syncEnterpriseAssignedIds(enterprise,
      enterpriseAssignedIds(enterprise).filter(function (id) { return id !== cid; }));
  }
  function workerBusy(state, cid, exceptUid) {
    const list = state.player.enterprises || [];
    for (const e of list) {
      if (exceptUid && e.uid === exceptUid) continue;
      if (enterpriseAssignedIds(e).indexOf(cid) >= 0) return true;
    }
    return false;
  }
  function unlockEnterprise(enterprise) {
    if (enterprise && enterprise.workerLocked !== undefined) {
      delete enterprise.workerLocked;
    }
  }
  function clearEnterpriseAssignment(enterprise) {
    if (!enterprise) return;
    syncEnterpriseAssignedIds(enterprise, []);
    unlockEnterprise(enterprise);
  }

  function careerSnapshot(career) {
    const snapshot = {
      profession:career.profession,
      rank:career.rank,
      experience:Math.max(0, Number(career.experience) || 0),
      startedYear:career.startedYear === undefined ? null : career.startedYear,
      guildRank:career.guildRank || 'none',
      guildStanding:Math.max(0, Number(career.guildStanding) || 0),
      chosen:career.chosen !== false
    };
    if (career.specialization) snapshot.specialization = career.specialization;
    if (career.examLastTurn !== undefined) snapshot.examLastTurn = career.examLastTurn;
    if (career.authoredWorkRef) snapshot.authoredWorkRef = career.authoredWorkRef;
    return snapshot;
  }

  function careerHistory(c) {
    if (!c.careerHistory || typeof c.careerHistory !== 'object' ||
        Array.isArray(c.careerHistory)) c.careerHistory = {};
    for (const profession in c.careerHistory) {
      const record = c.careerHistory[profession];
      if (!record || typeof record !== 'object' || Array.isArray(record)) {
        delete c.careerHistory[profession];
        continue;
      }
      record.profession = profession;
      if (!record.rank) record.rank = 'journeyman';
      if (!record.guildRank) record.guildRank = 'none';
      record.experience = Math.max(0, Number(record.experience) || 0);
      record.guildStanding = Math.max(0, Number(record.guildStanding) || 0);
      if (record.chosen === undefined) record.chosen = true;
      if (record.specialization !== undefined &&
          typeof record.specialization !== 'string') delete record.specialization;
      if (record.examLastTurn !== undefined &&
          !isFinite(Number(record.examLastTurn))) delete record.examLastTurn;
      if (record.authoredWorkRef !== undefined &&
          typeof record.authoredWorkRef !== 'string') delete record.authoredWorkRef;
      if (profession === 'administration' && record.rank === 'master' &&
          !record.specialization) record.specialization = 'bailiff';
    }
    return c.careerHistory;
  }

  FB.careerOf = function (state, c) {
    if (!c) return null;
    careerHistory(c);
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
    if (c.career.specialization !== undefined &&
        typeof c.career.specialization !== 'string') delete c.career.specialization;
    if (c.career.examLastTurn !== undefined &&
        !isFinite(Number(c.career.examLastTurn))) delete c.career.examLastTurn;
    if (c.career.authoredWorkRef !== undefined &&
        typeof c.career.authoredWorkRef !== 'string') delete c.career.authoredWorkRef;
    /* Administration formerly ended at the Bailiff rank. Preserve that exact
       accomplishment when the learned tree grows branches around it. */
    if (c.career.profession === 'administration' &&
        c.career.rank === 'master' && !c.career.specialization) {
      c.career.specialization = 'bailiff';
    }
    if (state.player && c.id === state.player.charId && state.player.flags.guild_member) {
      const careerDef = FBDATA.careers[c.career.profession];
      if (careerDef && careerDef.guild && c.career.guildRank === 'none') {
        c.career.guildRank = 'member';
        c.career.guildStanding = Math.max(20, c.career.guildStanding || 0);
      }
    }
    return c.career;
  };

  FB.syncPlayerCareer = function (state) {
    const c = playerChar(state);
    const career = FB.careerOf(state, c);
    if (!career) return;
    if (state.player.professionBack) return; // temporary levy service keeps the civilian career
    /* Station and occupation are independent. Acquiring land changes title,
       not the career that built this character's skills and connections. */
    state.player.profession = career.profession;
    if (career.guildRank !== 'none') state.player.flags.guild_member = 1;
    else delete state.player.flags.guild_member;
  };

  FB.setCareer = function (state, c, profession, rank) {
    const def = FBDATA.careers[profession];
    if (!c || !def) return false;
    if (def.requiresTech && FB.techRequirementMet &&
        !FB.techRequirementMet(state, def.requiresTech)) return false;
    if (def.maleOnly && c.sex !== 'm') return false;
    const defaultRank = FB.ageOf(c, state.date.year) < 16 || def.learned
      ? 'apprentice' : 'journeyman';
    let career = FB.careerOf(state, c);
    const changedProfession = career.profession !== profession;
    if (!changedProfession) {
      if (!career.chosen || career.rank === 'unassigned') {
        career.rank = rank || defaultRank;
        career.startedYear = state.date.year;
      } else if (rank && (CAREER_RANK_ORDER[career.rank] || 0) <
          (CAREER_RANK_ORDER[rank] || 0)) {
        career.rank = rank;
      }
      career.chosen = true;
    } else {
      const history = careerHistory(c);
      if (career.chosen && career.profession) {
        history[career.profession] = careerSnapshot(career);
      }
      const restored = history[profession];
      if (restored) {
        career = careerSnapshot(restored);
        delete history[profession];
        const requested = rank || defaultRank;
        if ((CAREER_RANK_ORDER[career.rank] || 0) <
            (CAREER_RANK_ORDER[requested] || 0)) career.rank = requested;
        if (FB.ageOf(c, state.date.year) >= 16 &&
            career.rank === 'apprentice' && !def.learned) {
          career.rank = 'journeyman';
        }
        career.chosen = true;
        c.career = career;
      } else {
        c.career = career = {
          profession:profession,
          rank:rank || defaultRank,
          experience:0,
          startedYear:state.date.year,
          guildRank:'none',
          guildStanding:0,
          chosen:true
        };
      }
      if (c.id === state.player.charId) {
        delete state.player.flags.guild_member;
      }
    }
    if (c.id === state.player.charId) FB.syncPlayerCareer(state);
    if (FB.enterpriseList && workerBusy(state, c.id)) FB.enterpriseList(state);
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
    const specialization = career.specialization && def.specializations &&
      def.specializations[career.specialization];
    if (specialization) {
      return FB.dataText(state, state.player.charId, 'career', career.profession,
        def, 'specializations.' + career.specialization + '.name', {});
    }
    return FB.dataText(state, state.player.charId, 'career', career.profession, def,
      def.ranks && def.ranks[career.rank] ? 'ranks.' + career.rank : 'name', {});
  };

  FB.guildTitle = function (career) {
    const names = {
      none:'Outside the guild', member:'Guild member', master:'Master',
      officer:'Guild officer', guildmaster:'Guildmaster'
    };
    return FB.T(names[(career && career.guildRank) || 'none']);
  };

  FB.careerSpecialization = function (state, c) {
    const career = FB.careerOf(state, c);
    const def = career && FBDATA.careers[career.profession];
    return career && career.specialization && def && def.specializations
      ? def.specializations[career.specialization] || null : null;
  };

  function hasTrait(c, id) {
    return !!(c && c.traits && c.traits.indexOf(id) >= 0);
  }

  function careerExamModel(state, c, examId, definition, specializationId) {
    const career = FB.careerOf(state, c);
    const def = career && FBDATA.careers[career.profession];
    if (!career || !def || !definition) return null;
    const missing = [];
    const age = FB.ageOf(c, state.date.year);
    const years = Math.max(0, Number(definition.years) || 0);
    const requiredAge = Math.max(16, Number(definition.age) || 0);
    const skillRequirements = definition.skills || {};
    if (age < requiredAge) missing.push(FB.T('age {needed} (now {current})', {
      needed:requiredAge, current:age
    }));
    if (career.experience < years) {
      missing.push(FB.T('{needed} vocational years (now {current})', {
        needed:years, current:career.experience
      }));
    }
    if (!hasTrait(c, 'literate')) missing.push(FB.T('Lettered'));
    for (const skill in skillRequirements) {
      const needed = Math.max(0, Number(skillRequirements[skill]) || 0);
      const current = FB.skillOf(c, skill);
      if (current < needed) {
        missing.push(FB.T('{skill} {needed} (now {current})', {
          skill:FB.T(FB.SKILL_NAMES[skill] || skill),
          needed:needed, current:current
        }));
      }
    }
    const requiredTechs = [];
    if (def.requiresTech) requiredTechs.push(def.requiresTech);
    if (definition.requiresTech &&
        requiredTechs.indexOf(definition.requiresTech) < 0) {
      requiredTechs.push(definition.requiresTech);
    }
    for (const techId of requiredTechs) {
      if (FB.techRequirementMet(state, techId)) continue;
      const tech = FBDATA.tech && FBDATA.tech[techId];
      missing.push(tech ? FB.dataText(state, state.player.charId, 'tech',
        techId, tech, 'name', {}) : techId);
    }
    const rawCost = Math.max(0, Number(definition.cost) || 0);
    const cost = Math.round(rawCost * FB.techCostFactor(state, 'training'));
    if (state.player.gold < cost) missing.push(FB.T('{money:gold}', { gold:cost }));
    const cooldown = Math.max(0,
      Number(FBDATA.balance.careerExamCooldownDays) || 360);
    const elapsed = career.examLastTurn === undefined ? Infinity :
      state.turn - Number(career.examLastTurn);
    const cooldownRemaining = Math.max(0, cooldown - elapsed);
    if (cooldownRemaining) {
      missing.push(FB.T('examination cooldown ({days} days remain)', {
        days:cooldownRemaining
      }));
    }
    let chance = Number(FBDATA.balance.careerExamBaseChance);
    if (!isFinite(chance)) chance = 0.55;
    const learningBonus = Number(FBDATA.balance.careerExamLearningBonus);
    const otherBonus = Number(FBDATA.balance.careerExamSkillBonus);
    for (const skill in skillRequirements) {
      const extra = Math.max(0,
        FB.skillOf(c, skill) - (Number(skillRequirements[skill]) || 0));
      chance += extra * (skill === 'lea'
        ? (isFinite(learningBonus) ? learningBonus : 0.04)
        : (isFinite(otherBonus) ? otherBonus : 0.02));
    }
    const maxChance = Number(FBDATA.balance.careerExamMaxChance);
    chance = FB.clamp(chance, 0,
      isFinite(maxChance) ? maxChance : 0.90);
    const namePath = specializationId
      ? 'specializations.' + specializationId + '.name' : 'license.name';
    return {
      id:examId,
      specialization:specializationId || null,
      definition:definition,
      name:FB.dataText(state, state.player.charId, 'career', career.profession,
        def, namePath, {}),
      cost:cost,
      chance:chance,
      cooldownRemaining:cooldownRemaining,
      missing:missing,
      ready:missing.length === 0
    };
  }

  FB.careerExamOptions = function (state, c) {
    if (!managedCareerCharacter(state, c)) return [];
    if (c.id === state.player.charId && state.player.tier >= 3) return [];
    const career = FB.careerOf(state, c);
    const def = career && FBDATA.careers[career.profession];
    if (!def || !def.learned || career.rank === 'unassigned' ||
        career.rank === 'master') return [];
    if (career.rank === 'apprentice') {
      const license = careerExamModel(state, c, 'license', def.license, null);
      return license ? [license] : [];
    }
    const out = [];
    for (const id in (def.specializations || {})) {
      const model = careerExamModel(state, c, 'specialization:' + id,
        def.specializations[id], id);
      if (model) out.push(model);
    }
    return out;
  };

  /* Permanent specialties use one read-only surface whether they are earned
     by a learned examination or deliberately adopted by an established
     guildmaster. The older examination API remains the compatibility door
     for learned careers; guild paths never borrow its chance or cooldown. */
  function guildSpecializationModel(state, c, id, definition) {
    const career = FB.careerOf(state, c);
    const def = career && FBDATA.careers[career.profession];
    if (!career || !def || !definition) return null;
    const missing = [];
    const requirements = [];
    const guildRank = definition.guildRankMin || 'guildmaster';
    const guildStanding = definition.guildStandingMin === undefined
      ? 35 : Math.max(0, Number(definition.guildStandingMin) || 0);
    const skills = definition.skills || { ste:9 };
    const rankName = FB.guildTitle({ guildRank:guildRank });
    requirements.push(FB.T('{rank} rank', { rank:rankName }));
    if ((GUILD_ORDER[career.guildRank] || 0) < (GUILD_ORDER[guildRank] || 0)) {
      missing.push(FB.T('{rank} rank', { rank:rankName }));
    }
    requirements.push(FB.T('Guild Standing {needed}', { needed:guildStanding }));
    if ((Number(career.guildStanding) || 0) < guildStanding) {
      missing.push(FB.T('Guild Standing {needed} (now {current})', {
        needed:guildStanding, current:Math.round(career.guildStanding || 0)
      }));
    }
    for (const skill in skills) {
      const needed = Math.max(0, Number(skills[skill]) || 0);
      const current = FB.skillOf(c, skill);
      requirements.push(FB.T('{skill} {needed}', {
        skill:FB.T(FB.SKILL_NAMES[skill] || skill), needed:needed
      }));
      if (current < needed) {
        missing.push(FB.T('{skill} {needed} (now {current})', {
          skill:FB.T(FB.SKILL_NAMES[skill] || skill),
          needed:needed, current:current
        }));
      }
    }
    const requiredTechs = [];
    function addTechnologies(value) {
      const list = Array.isArray(value) ? value : (value ? [value] : []);
      for (let i = 0; i < list.length; i++) {
        if (requiredTechs.indexOf(list[i]) < 0) requiredTechs.push(list[i]);
      }
    }
    addTechnologies(def.requiresTech);
    addTechnologies(definition.requiresTech);
    const technology = FB.techRequirementStatus(state, requiredTechs);
    if (requiredTechs.length) {
      const technologyRequirement = FB.techRequirementReason(state, requiredTechs);
      requirements.push(technologyRequirement);
      if (!technology.ready) missing.push(technologyRequirement);
    }
    const cost = Math.max(0, Math.round(Number(definition.cost) || 0));
    if (state.player.gold < cost) {
      missing.push(FB.T('{money:gold}', { gold:cost }));
    }
    return {
      id:'specialization:' + id,
      specialization:id,
      definition:definition,
      name:FB.dataText(state, state.player.charId, 'career', career.profession,
        def, 'specializations.' + id + '.name', {}),
      cost:cost,
      chance:null,
      method:'induction',
      requirements:requirements,
      missing:missing,
      ready:missing.length === 0
    };
  }

  FB.careerSpecializationOptions = function (state, c) {
    if (!managedCareerCharacter(state, c)) return [];
    if (c.id === state.player.charId && state.player.tier >= 3) return [];
    const career = FB.careerOf(state, c);
    const def = career && FBDATA.careers[career.profession];
    if (!career || !def || career.specialization ||
        career.rank === 'unassigned' || career.rank === 'apprentice') return [];
    const out = [];
    for (const id in (def.specializations || {})) {
      const specialization = def.specializations[id];
      if (def.learned) {
        if (career.rank !== 'journeyman') continue;
        const exam = careerExamModel(state, c, 'specialization:' + id,
          specialization, id);
        if (exam) {
          exam.method = 'exam';
          out.push(exam);
        }
      } else if (def.guild) {
        const model = guildSpecializationModel(state, c, id, specialization);
        if (model) out.push(model);
      }
    }
    return out;
  };

  FB.chooseCareerSpecialization = function (state, c, specializationId) {
    c = c || playerChar(state);
    let status = null;
    for (const option of FB.careerSpecializationOptions(state, c)) {
      if (option.specialization === specializationId) status = option;
    }
    if (!status || !status.ready) return false;
    /* Learned careers still use their established examination resolution
       (chance, cooldown, authored work). Keeping that mutation door makes
       the canonical option surface safe for both kinds of specialty without
       changing the older examination API. */
    if (status.method === 'exam') return FB.takeCareerExam(state, c, status.id);
    if (status.method !== 'induction') return false;
    const career = FB.careerOf(state, c);
    state.player.gold -= status.cost;
    career.specialization = specializationId;
    if (c.id === state.player.charId) {
      FB.syncPlayerCareer(state);
      if (FB.validateFocus) FB.validateFocus(state);
    }
    FB.news(state, FB.msg('news.career.specialization_inducted',
      '🏅 {name} is received by the guild as {specialization}.', {
        name:c.name,
        specialization:FB.dataParam('career', career.profession,
          'specializations.' + specializationId + '.name')
      }));
    return { cost:status.cost, specialization:specializationId };
  };

  FB.takeCareerExam = function (state, c, examId) {
    c = c || playerChar(state);
    let status = null;
    for (const option of FB.careerExamOptions(state, c)) {
      if (option.id === examId) status = option;
    }
    if (!status || !status.ready) return false;
    const career = FB.careerOf(state, c);
    state.player.gold -= status.cost;
    if (!FB.chance(status.chance)) {
      career.examLastTurn = state.turn;
      FB.news(state, FB.msg('news.career.exam_failed',
        '📚 {name} does not satisfy the examiners and must wait before trying again.', {
          name:c.name
        }));
      return { passed:false, chance:status.chance, cost:status.cost };
    }
    delete career.examLastTurn;
    if (status.specialization) {
      career.rank = 'master';
      career.specialization = status.specialization;
      state.player.prestige += 15;
      if (status.definition.authoredWork && !career.authoredWorkRef &&
          FB.grantItem) {
        const ref = FB.grantItem(state,
          FB.pick(FBDATA.itemPools.authoredWorks));
        if (ref) {
          career.authoredWorkRef = ref;
          FB.news(state, FB.msg('news.career.work_authored',
            '📖 {name} completes {item}, a work for the family to preserve.', {
              name:c.name,
              item:FB.itemParam ? FB.itemParam(state, ref, true) : ref
            }));
        }
      }
    } else {
      career.rank = status.definition.toRank || 'journeyman';
      state.player.prestige += 5;
    }
    if (c.id === state.player.charId) {
      FB.syncPlayerCareer(state);
      if (FB.validateFocus) FB.validateFocus(state);
    }
    const rankPath = career.specialization
      ? 'specializations.' + career.specialization + '.name'
      : 'ranks.' + career.rank;
    FB.news(state, FB.msg('news.career.exam_passed',
      '📚 {name} passes the examination and is recognized as {rank}.', {
        name:c.name,
        rank:FB.dataParam('career', career.profession, rankPath)
      }));
    return { passed:true, chance:status.chance, cost:status.cost };
  };

  FB.positionDef = function (id) {
    return (FBDATA.positions && FBDATA.positions[id]) || null;
  };

  /* Life-path hooks shared with data/events_lifepaths.js. A commissioned
     Author completes another randomized family treatise through the same
     grant path as the qualification reward; the saved career keeps only the
     original authoredWorkRef, and each later work is an ordinary armory
     instance. */
  FB.fns = FB.fns || {};
  FB.fns.lifepath_author_work = function (state) {
    const c = playerChar(state);
    if (!c || !FB.grantItem) return false;
    const ref = FB.grantItem(state,
      FB.pick(FBDATA.itemPools.authoredWorks));
    if (!ref) return false;
    FB.news(state, FB.msg('news.career.work_completed',
      '📖 {name} completes {item}, another work for the family to preserve.', {
        name:c.name,
        item:FB.itemParam ? FB.itemParam(state, ref, true) : ref
      }));
    return true;
  };
  FB.fns.lifepath_realm_at_peace = function (state) {
    const p = state.player;
    if (p.war) return false;
    const rid = state.owner && state.owner[p.provinceId];
    return !(rid && FB.isRealmAtWar(state, rid));
  };

  FB.playerPositionIds = function (state) {
    const out = [];
    const flags = state.player.flags || {};
    for (const id in FBDATA.positions) {
      const def = FBDATA.positions[id];
      if (def.kind !== 'earned' || !flags[id]) continue;
      if (id === 'councilman' && FB.localCouncilValidate &&
          !FB.localCouncilValidate(state, true)) continue;
      out.push(id);
    }
    return out;
  };

  /* Position effects are always computed from the earned flags and current
     paid roster. No derived total is stored in the save. */
  FB.positionContributions = function (state, key) {
    const out = [];
    for (const id of FB.playerPositionIds(state)) {
      const def = FB.positionDef(id);
      if (def && def.fx && def.fx[key]) {
        out.push({ kind:'position', id:id, amount:def.fx[key] });
      }
    }
    const ordinance = FB.localCouncilOrdinance &&
      FB.localCouncilOrdinance(state);
    const ordinanceDef = ordinance &&
      FBDATA.localCouncilMotions[ordinance.id];
    if (ordinanceDef && ordinanceDef.fx && ordinanceDef.fx[key]) {
      out.push({
        kind:'local-ordinance', id:ordinance.id,
        amount:ordinanceDef.fx[key]
      });
    }
    if (FB.retainerRecords) {
      for (const record of FB.retainerRecords(state)) {
        const c = state.chars[record.charId];
        if (!c || FB.standingOf(state, {
          kind:'character', id:c.id
        }) <= -40) continue;
        const def = FB.positionDef(record.office);
        if (def && def.fx && def.fx[key]) {
          out.push({
            kind:'retainer', id:record.office, charId:record.charId,
            amount:def.fx[key]
          });
        }
      }
    }
    if (FB.familyOfficeRecords) {
      for (const record of FB.familyOfficeRecords(state)) {
        const c = state.chars[record.charId];
        if (!c || FB.standingOf(state, {
          kind:'character', id:c.id
        }) <= -40) continue;
        const def = FB.positionDef(record.office);
        if (def && def.fx && def.fx[key]) {
          out.push({
            kind:'family-office', id:record.office,
            charId:record.charId, amount:def.fx[key]
          });
        }
      }
    }
    return out;
  };

  FB.positionBonus = function (state, key) {
    let total = 0;
    for (const source of FB.positionContributions(state, key)) total += source.amount;
    return total;
  };

  FB.guildIncomeMultiplier = function (career) {
    if (!career) return 1;
    if (career.guildRank === 'master') return 1.1;
    if (career.guildRank === 'officer') return 1.15;
    if (career.guildRank === 'guildmaster') return 1.25;
    return 1;
  };

  FB.careerChoices = function (state, c) {
    if (!managedCareerCharacter(state, c)) return [];
    if (c.id === state.player.charId && state.player.tier >= 3) return [];
    const age = FB.ageOf(c, state.date.year);
    const current = FB.careerOf(state, c);
    const playerClericalOffice = (c.id === state.player.charId &&
      (state.player.flags.abbot || state.player.flags.bishop ||
        state.player.flags.qadi || state.player.flags.chief_qadi)) ||
      !!(FB.bishopricOf && FB.bishopricOf(state, c));
    const out = [];
    for (const id in FBDATA.careers) {
      const def = FBDATA.careers[id];
      if (def.hiddenChoice) continue;
      if (def.tierMin !== undefined && state.player.tier < def.tierMin) continue;
      if (def.requiresTech && !FB.techRequirementMet(state, def.requiresTech)) continue;
      if (def.maleOnly && c.sex !== 'm') continue;
      if (def.religionGroups && !def.religionGroups.some(function (id) {
        return FB.faithIsA(c.religion, id, state);
      })) continue;
      if (age < 16 && age < (def.apprenticeAge || 10)) continue;
      if (playerClericalOffice && id !== current.profession) continue;
      const archived = c.careerHistory && c.careerHistory[id];
      const resuming = !!(archived && id !== current.profession);
      const restoredRank = resuming && age >= 16 &&
        archived.rank === 'apprentice' && !def.learned ? 'journeyman' :
        (resuming ? archived.rank : null);
      out.push({
        id:id, def:def,
        cost:age < 16 && !resuming
          ? Math.round((def.apprenticeCost || 0) *
            FB.techCostFactor(state, 'training')) : 0,
        resuming:resuming,
        restoredRank:restoredRank,
        restoredGuildRank:resuming ? archived.guildRank : null,
        restoredSpecialization:resuming ? archived.specialization || null : null,
        restoredStanding:resuming
          ? Math.max(0, Number(archived.guildStanding) || 0) : 0
      });
    }
    return out;
  };

  function religiousPathAllowed(state, c, pathId) {
    const def = FBDATA.religiousPaths && FBDATA.religiousPaths[pathId];
    if (!def || !Array.isArray(def.ranks) || !def.ranks.length) return false;
    if (Array.isArray(def.faiths) && !def.faiths.some(function (faithId) {
      return FB.faithIsA(c.religion, faithId, state);
    })) return false;
    if (Array.isArray(def.systems) && !def.systems.every(function (systemId) {
      return FB.faithHasSystem(c.religion, systemId, state);
    })) return false;
    const career = FB.careerOf(state, c);
    return !Array.isArray(def.professions) || !!(career &&
      def.professions.indexOf(career.profession) >= 0);
  }

  function religiousRoutes(state, c) {
    const religion = c && FB.religionOf(c.religion, state);
    const routes = religion && religion.religiousPaths;
    return routes && typeof routes === 'object' ? routes : null;
  }

  function religiousLayPathId(state, c) {
    const routes = religiousRoutes(state, c);
    const pathId = routes && routes.lay;
    return pathId && religiousPathAllowed(state, c, pathId) ? pathId : null;
  }

  function religiousPathId(state, c) {
    const career = c && FB.careerOf(state, c);
    const routes = religiousRoutes(state, c);
    if (!career || !routes) return null;
    const byProfession = routes.professions;
    const pathId = byProfession && byProfession[career.profession] || routes.lay;
    return pathId && religiousPathAllowed(state, c, pathId) ? pathId : null;
  }

  function religiousRankIndex(state, c, pathId) {
    const ranks = c.religiousRanks || {};
    let index = ranks[pathId] || 0;
    const def = FBDATA.religiousPaths && FBDATA.religiousPaths[pathId];
    const steps = def && def.ranks;
    if (!steps || !steps.length) return 0;
    if (state.player && c.id === state.player.charId) {
      const flags = state.player.flags || {};
      for (let i = 0; i < steps.length; i++) {
        if (steps[i].flag && flags[steps[i].flag]) index = Math.max(index, i);
      }
    }
    return Math.floor(FB.clamp(Number(index) || 0, 0, steps.length - 1));
  }

  function religiousPathRecord(state, c, pathId) {
    const def = FBDATA.religiousPaths && FBDATA.religiousPaths[pathId];
    const steps = def && def.ranks;
    if (!steps || !steps.length) return null;
    const index = religiousRankIndex(state, c, pathId);
    return {
      id:pathId, kind:def.kind, def:def, steps:steps,
      index:index, step:steps[index],
      next:index + 1 < steps.length ? steps[index + 1] : null
    };
  }

  FB.religiousPathOf = function (state, c) {
    const pathId = religiousPathId(state, c);
    return pathId ? religiousPathRecord(state, c, pathId) : null;
  };

  FB.religiousRankTitleReadOnly = function (state, c) {
    if (FB.isPapalClaimant && FB.isPapalClaimant(state, c)) {
      return FB.T('Pope');
    }
    if (FB.isCardinal && FB.isCardinal(state, c)) return FB.T('Cardinal');
    const pathId = religiousPathId(state, c);
    const path = pathId ? religiousPathRecord(state, c, pathId) : null;
    return path ? FB.religiousRankTitle(state, c, path) : '';
  };

  /* Lay devotion is a permanent background standing. Entering a vocation
     changes the active ladder but never erases the lay life that preceded it. */
  FB.religiousStandings = function (state, c) {
    if (!c) return [];
    const activeId = religiousPathId(state, c);
    if (!activeId) return [];
    const layId = religiousLayPathId(state, c);
    const out = [];
    if (layId) out.push({ kind:'lay', path:religiousPathRecord(state, c, layId) });
    if (activeId !== layId) {
      out.push({ kind:'vocation', path:religiousPathRecord(state, c, activeId) });
    }
    return out;
  };

  FB.religiousRankTitle = function (state, c, path) {
    if (FB.isPapalClaimant && FB.isPapalClaimant(state, c)) return FB.T('Pope');
    if (FB.isCardinal && FB.isCardinal(state, c)) return FB.T('Cardinal');
    path = path || FB.religiousPathOf(state, c);
    if (!path || !path.step) return '';
    const field = c.sex === 'f' && path.step.name_f ? 'name_f' : 'name';
    return FB.dataText(state, c.id, 'religiousPath',
      path.id + '.ranks.' + path.step.id, path.step, field, {});
  };

  FB.religiousAdvance = function (state, c) {
    if (!managedCareerCharacter(state, c)) return null;
    const path = FB.religiousPathOf(state, c);
    if (!path || !path.next) return null;
    const step = path.next;
    const career = FB.careerOf(state, c);
    const age = FB.ageOf(c, state.date.year);
    const goldCost = step.gold || 0;
    const blocked = (step.maleOnly && c.sex !== 'm') ||
      age < (step.age || 0) ||
      career.experience < (step.years || 0) ||
      FB.skillOf(c, 'lea') < (step.learning || 0) ||
      state.player.piety < (step.piety || 0) ||
      state.player.prestige < (step.prestige || 0) ||
      (goldCost > 0 && state.player.gold < goldCost);
    return { path:path, step:step, blocked:blocked };
  };

  function livingSpouse(state, c) {
    if (!c) return null;
    if (c.spouseId && state.chars[c.spouseId] && !state.chars[c.spouseId].dead) {
      return state.chars[c.spouseId];
    }
    for (const id in state.chars) {
      const other = state.chars[id];
      if (other && !other.dead && other.spouseId === c.id) return other;
    }
    return null;
  }

  function layStandingIndex(state, c) {
    const pathId = religiousLayPathId(state, c);
    return pathId ? religiousRankIndex(state, c, pathId) : 0;
  }

  function catholicOfficeBalance(key) {
    return FBDATA.papacy && FBDATA.papacy[key] || {};
  }

  function bishopricSeeProvinceId(state, c, status) {
    return status && status.seeProvinceId ||
      (c.id === state.player.charId
        ? state.player.provinceId : (c.homeProvinceId || state.player.provinceId));
  }

  function bishopricSeeReserved(state, provinceId) {
    const catholic = FB.religionOf('catholic', state);
    const head = catholic && catholic.head;
    return !!(provinceId && head && head.seat === provinceId);
  }

  /* A see is personal church office, not dynasty land. Old Bishop flags and
     terminal Catholic ranks acquire a home-county record lazily. A vacated
     marker prevents that compatibility path from recreating a returned see. */
  FB.bishopricOf = function (state, c) {
    if (!state || !c || !FB.faithHasSystem(c.religion, 'papacy', state)) return null;
    if (c.papalOffice === 'pope' ||
        (c.id === state.player.charId && state.player.flags &&
          state.player.flags.pope)) {
      if (c.bishopric) delete c.bishopric;
      if (c.id === state.player.charId && state.player.flags) {
        delete state.player.flags.bishop;
      }
      if (c.bishopricVacatedTurn === undefined) {
        c.bishopricVacatedTurn = state.turn || 0;
      }
      return null;
    }
    if (c.bishopric && typeof c.bishopric === 'object' &&
        !Array.isArray(c.bishopric)) return c.bishopric;
    if (c.bishopricVacatedTurn !== undefined) return null;
    const ranks = c.religiousRanks || {};
    const legacyRank = (ranks.catholic_monastic || 0) >= 4 ||
      (ranks.catholic_clerical || 0) >= 5;
    const legacyFlag = c.id === state.player.charId && state.player.flags &&
      state.player.flags.bishop;
    if (!legacyRank && !legacyFlag) return null;
    c.bishopric = {
      seeProvinceId:c.id === state.player.charId
        ? state.player.provinceId : (c.homeProvinceId || state.player.provinceId),
      appointedTurn:state.turn || 0,
      previousTier:2,
      appointerKind:'legacy',
      appointerId:null,
      investiturePolicy:'canonical'
    };
    return c.bishopric;
  };

  FB.bishopricSnapshot = function (state, c) {
    if (!state || !c || !FB.faithHasSystem(c.religion, 'papacy', state)) return null;
    if (c.papalOffice === 'pope' ||
        (c.id === state.player.charId && state.player.flags &&
          state.player.flags.pope)) return null;
    if (c.bishopric && typeof c.bishopric === 'object' &&
        !Array.isArray(c.bishopric)) return c.bishopric;
    if (c.bishopricVacatedTurn !== undefined) return null;
    const ranks = c.religiousRanks || {};
    const legacyRank = (ranks.catholic_monastic || 0) >= 4 ||
      (ranks.catholic_clerical || 0) >= 5;
    const legacyFlag = c.id === state.player.charId && state.player.flags &&
      state.player.flags.bishop;
    return legacyRank || legacyFlag ? { legacy:true } : null;
  };

  FB.hasBishopric = function (state, c) {
    return !!FB.bishopricOf(state, c || playerChar(state));
  };

  FB.playerBishopricOnly = function (state) {
    if (state.player.provs && state.player.provs.length) return false;
    const c = playerChar(state);
    return !!FB.bishopricSnapshot(state, c);
  };

  FB.bishopricIncome = function (state, c) {
    c = c || playerChar(state);
    return FB.bishopricOf(state, c)
      ? (catholicOfficeBalance('bishopric').income || 6) : 0;
  };

  FB.bishopricRetinue = function (state, c) {
    c = c || playerChar(state);
    return FB.bishopricOf(state, c)
      ? (catholicOfficeBalance('bishopric').retinue || 120) : 0;
  };

  function setBishopRank(state, c) {
    const activeId = religiousPathId(state, c);
    const pathId = activeId === 'catholic_monastic'
      ? activeId : 'catholic_clerical';
    const def = FBDATA.religiousPaths[pathId];
    let bishopIndex = def.ranks.length - 1;
    for (let i = 0; i < def.ranks.length; i++) {
      if (def.ranks[i].id === 'bishop') bishopIndex = i;
    }
    c.religiousRanks = c.religiousRanks || {};
    c.religiousRanks[pathId] = bishopIndex;
  }

  FB.installBishopric = function (state, c, status, opts) {
    opts = opts || {};
    c = c || playerChar(state);
    if (!c || c.dead || !FB.faithHasSystem(c.religion, 'papacy', state)) return false;
    status = status || {};
    const seeProvinceId = bishopricSeeProvinceId(state, c, status);
    if (bishopricSeeReserved(state, seeProvinceId)) return false;
    delete c.bishopricVacatedTurn;
    c.bishopric = {
      seeProvinceId:seeProvinceId,
      appointedTurn:state.turn,
      previousTier:2,
      appointerKind:status.appointerKind || 'canonical',
      appointerId:status.appointerId || null,
      investiturePolicy:status.policyId || 'canonical'
    };
    setBishopRank(state, c);
    c.station = Math.max(3, FB.stationOf(c));
    if (c.id === state.player.charId) {
      state.player.flags.bishop = 1;
      if (state.player.tier < 3) {
        FB.setPlayerTier(state, 3, { stationFarewell:false });
      }
      if (!opts.noReward) state.player.prestige += 25;
      if (FB.validateFocus) FB.validateFocus(state);
    }
    return c.bishopric;
  };

  FB.releaseBishopric = function (state, c, opts) {
    opts = opts || {};
    c = c || playerChar(state);
    const record = c && FB.bishopricOf(state, c);
    if (!record) return false;
    const playerOffice = c.id === state.player.charId;
    const bishopricOnly = playerOffice && !(state.player.provs &&
      state.player.provs.length);
    delete c.bishopric;
    c.bishopricVacatedTurn = state.turn;
    if (playerOffice) {
      delete state.player.flags.bishop;
      if (bishopricOnly && state.player.tier === 3) {
        FB.setPlayerTier(state, Math.max(2, record.previousTier || 2), {
          attachLiege:false
        });
      }
      if (FB.validateFocus) FB.validateFocus(state);
    }
    return record;
  };

  FB.activateBishopricForPlayer = function (state, c) {
    c = c || playerChar(state);
    const record = c && FB.bishopricOf(state, c);
    if (!record || c.id !== state.player.charId) return false;
    state.player.flags.bishop = 1;
    if (!(state.player.provs && state.player.provs.length) &&
        state.player.tier < 3) {
      FB.setPlayerTier(state, 3, { stationFarewell:false });
    }
    return true;
  };

  FB.abbotAppointmentStatus = function (state, c) {
    c = c || playerChar(state);
    const path = c && FB.religiousPathOf(state, c);
    const step = path && path.next;
    const visible = !!(path && path.id === 'catholic_monastic' &&
      step && step.id === 'abbot');
    if (!visible) return { visible:false, ready:false, missing:[] };
    const cfg = catholicOfficeBalance('abbotAppointment');
    const advance = FB.religiousAdvance(state, c);
    const missing = [];
    const age = FB.ageOf(c, state.date.year);
    const career = FB.careerOf(state, c);
    if (age < step.age) missing.push(FB.T('age {needed} (now {current})', {
      needed:step.age, current:age
    }));
    if (career.experience < step.years) {
      missing.push(FB.T('{needed} vocational years (now {current})', {
        needed:step.years, current:career.experience
      }));
    }
    if (FB.skillOf(c, 'lea') < step.learning) {
      missing.push(FB.T('Learning {needed} (now {current})', {
        needed:step.learning, current:FB.skillOf(c, 'lea')
      }));
    }
    if (state.player.piety < step.piety) {
      missing.push(FB.T('{needed} piety (now {current})', {
        needed:step.piety, current:Math.floor(state.player.piety)
      }));
    }
    if (state.player.prestige < step.prestige) {
      missing.push(FB.T('{needed} prestige (now {current})', {
        needed:step.prestige, current:Math.floor(state.player.prestige)
      }));
    }
    const elapsed = c.abbotPetitionRefusedTurn === undefined ? Infinity :
      state.turn - c.abbotPetitionRefusedTurn;
    const remaining = Math.max(0, (cfg.refusalCooldownDays || 360) - elapsed);
    if (remaining) missing.push(FB.T('election cooldown ({days} days remain)', {
      days:remaining
    }));
    const learningBonus = Math.min(cfg.learningBonusMax || 0.15,
      Math.max(0, FB.skillOf(c, 'lea') - step.learning) *
      (cfg.learningBonusPerPoint || 0.025));
    const chance = FB.clamp((cfg.baseChance || 0.55) + learningBonus +
      layStandingIndex(state, c) * (cfg.layStandingBonus || 0.03),
    cfg.chanceMin || 0.25, cfg.chanceMax || 0.85);
    return {
      visible:true, ready:!!advance && !advance.blocked && !missing.length,
      missing:missing, chance:chance, path:path, step:step
    };
  };

  FB.seekAbbotAppointment = function (state, c) {
    c = c || playerChar(state);
    const status = FB.abbotAppointmentStatus(state, c);
    if (!status.ready) return false;
    if (!FB.chance(status.chance)) {
      c.abbotPetitionRefusedTurn = state.turn;
      state.player.piety += 3;
      return { accepted:false, chance:status.chance };
    }
    delete c.abbotPetitionRefusedTurn;
    c.religiousRanks = c.religiousRanks || {};
    c.religiousRanks[status.path.id] = status.path.index + 1;
    c.station = Math.max(2, FB.stationOf(c));
    if (c.id === state.player.charId) {
      state.player.flags.abbot = 1;
      if (state.player.tier < 2) {
        FB.setPlayerTier(state, 2, { stationFarewell:false });
      }
    }
    state.player.prestige += status.step.prestigeGain || 15;
    FB.news(state, FB.msg('news.religion.abbot_elected',
      '⛪ {name} is elected to govern the religious house.',
      { name:FB.fullName(c) }));
    return { accepted:true, chance:status.chance };
  };

  function bishopCandidateExcommunicated(state, c, obedienceId) {
    if (c.traits && c.traits.indexOf('excommunicated') >= 0) return true;
    return !!(FB.excommunicationOf &&
      FB.excommunicationOf(state, c.id, obedienceId));
  }

  function localAppointmentSupport(state) {
    if (state.player.liege) {
      return {
        opinion:FB.standingOf(state, {
          kind:'realm', id:state.player.liege
        }),
        id:state.player.liege
      };
    }
    const lord = FB.getRole(state, 'lord', true);
    return {
      opinion:lord ? FB.standingOf(state, {
        kind:'character', id:lord.id
      }) : 0,
      id:lord && lord.id || null
    };
  }

  FB.bishopAppointmentStatus = function (state, c) {
    c = c || playerChar(state);
    const path = c && FB.religiousPathOf(state, c);
    const step = path && path.next;
    const corePath = path && (path.id === 'catholic_monastic' ||
      path.id === 'catholic_clerical');
    const visible = !!(c && corePath &&
      FB.faithHasSystem(c.religion, 'papacy', state) && step &&
      step.id === 'bishop');
    if (!visible) return { visible:false, ready:false, missing:[] };
    const cfg = catholicOfficeBalance('bishopric');
    const missing = [];
    const age = FB.ageOf(c, state.date.year);
    const career = FB.careerOf(state, c);
    const seeProvinceId = bishopricSeeProvinceId(state, c);
    const papacy = FB.ensurePapacy ? FB.ensurePapacy(state) : null;
    const obedienceId = FB.papalObedienceForCharacter
      ? FB.papalObedienceForCharacter(state, c)
      : papacy && papacy.romanObedience;
    const obedience = papacy && papacy.obediences[obedienceId];
    const pope = obedience && obedience.claimantId &&
      state.chars[obedience.claimantId];
    const papalOpinion = pope && FB.papalOpinionOfCandidate
      ? FB.papalOpinionOfCandidate(state, c, obedienceId) : 0;
    const local = localAppointmentSupport(state);
    const investiture = FB.investiturePolicyForPlayer
      ? FB.investiturePolicyForPlayer(state) : null;
    const policyId = investiture && investiture.policy || 'canonical';
    let support = papalOpinion;
    let appointerKind = 'canonical';
    let appointerId = pope && pope.id || null;
    if (policyId === 'lay') {
      support = local.opinion;
      appointerKind = 'lay';
      appointerId = local.id;
    } else if (policyId === 'concordat') {
      support = (papalOpinion + local.opinion) / 2;
      appointerKind = 'concordat';
      appointerId = pope && pope.id || local.id;
    } else if (!pope) {
      support = 0;
      appointerKind = 'chapter';
      appointerId = null;
    }
    if (c.sex !== 'm') missing.push(FB.T('a man'));
    if (FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(state, c.id)) {
      missing.push(FB.T('not held captive'));
    }
    if (livingSpouse(state, c)) missing.push(FB.T('unmarried or widowed'));
    if (c.betrothedId) missing.push(FB.T('not betrothed'));
    if (age < step.age) missing.push(FB.T('age {needed} (now {current})', {
      needed:step.age, current:age
    }));
    if (career.experience < step.years) {
      missing.push(FB.T('{needed} vocational years (now {current})', {
        needed:step.years, current:career.experience
      }));
    }
    if (FB.skillOf(c, 'lea') < step.learning) {
      missing.push(FB.T('Learning {needed} (now {current})', {
        needed:step.learning, current:FB.skillOf(c, 'lea')
      }));
    }
    if (state.player.piety < step.piety) {
      missing.push(FB.T('{needed} piety (now {current})', {
        needed:step.piety, current:Math.floor(state.player.piety)
      }));
    }
    if (state.player.prestige < step.prestige) {
      missing.push(FB.T('{needed} prestige (now {current})', {
        needed:step.prestige, current:Math.floor(state.player.prestige)
      }));
    }
    if (bishopCandidateExcommunicated(state, c, obedienceId)) {
      missing.push(FB.T('not excommunicated'));
    }
    if (bishopricSeeReserved(state, seeProvinceId)) {
      const reservedSee = FB.world && FB.world.byId[seeProvinceId];
      missing.push(FB.T('a bishopric outside the Pope’s diocese of {province}', {
        province:reservedSee ? reservedSee.name : seeProvinceId
      }));
    }
    if (c.id === state.player.charId && (state.player.tier > 2 ||
        (state.player.provs && state.player.provs.length))) {
      missing.push(FB.T('not already holding secular land or baronial rank'));
    } else if (c.id !== state.player.charId && FB.stationOf(c) > 2) {
      missing.push(FB.T('not already of noble or royal station'));
    }
    const elapsed = c.bishopPetitionRefusedTurn === undefined ? Infinity :
      state.turn - c.bishopPetitionRefusedTurn;
    const remaining = Math.max(0, (cfg.refusalCooldownDays || 720) - elapsed);
    if (remaining) {
      missing.push(FB.T('appointment cooldown ({days} days remain)', {
        days:remaining
      }));
    }
    const learningBonus = Math.min(cfg.learningBonusMax || 0.15,
      Math.max(0, FB.skillOf(c, 'lea') - step.learning) *
      (cfg.learningBonusPerPoint || 0.025));
    const supportBonus = FB.clamp(
      (support - (cfg.supportBaseline || 25)) / (cfg.supportDivisor || 200),
      -(cfg.supportBonusMax || 0.20), cfg.supportBonusMax || 0.20);
    const chance = FB.clamp((cfg.baseChance || 0.45) + learningBonus +
      layStandingIndex(state, c) * (cfg.layStandingBonus || 0.04) +
      supportBonus, cfg.chanceMin || 0.20, cfg.chanceMax || 0.90);
    return {
      visible:true, ready:!missing.length, missing:missing,
      chance:chance,
      endowedChance:FB.clamp(chance + (cfg.endowmentBonus || 0.15),
        cfg.chanceMin || 0.20, cfg.endowedChanceMax || 0.95),
      endowmentGold:cfg.endowmentGold || 50,
      canEndow:state.player.gold >= (cfg.endowmentGold || 50),
      support:support, localOpinion:local.opinion, papalOpinion:papalOpinion,
      policyId:policyId, appointerKind:appointerKind, appointerId:appointerId,
      obedienceId:obedienceId, path:path, step:step,
      seeProvinceId:seeProvinceId
    };
  };

  FB.seekBishopAppointment = function (state, c, endowed) {
    c = c || playerChar(state);
    const status = FB.bishopAppointmentStatus(state, c);
    if (!status.ready || (endowed && !status.canEndow)) return false;
    if (endowed) state.player.gold -= status.endowmentGold;
    const chance = endowed ? status.endowedChance : status.chance;
    if (!FB.chance(chance)) {
      c.bishopPetitionRefusedTurn = state.turn;
      const simony = FB.chance(
        catholicOfficeBalance('bishopric').simonyOfferChance || 0.15);
      if (simony) {
        c.bishopSimonyOfferTurn = state.turn;
        FB.queueEvent(state, 'bishops_mitre', { candidateId:c.id });
      }
      FB.news(state, FB.msg('news.religion.bishop_refused',
        '⛪ The appointment of {name} is refused; another petition may be made in two years.',
        { name:FB.fullName(c) }));
      return { accepted:false, chance:chance, simony:simony };
    }
    delete c.bishopPetitionRefusedTurn;
    delete c.bishopSimonyOfferTurn;
    FB.installBishopric(state, c, status);
    FB.news(state, FB.msg('news.religion.bishop_appointed',
      '⛪ {name} is invested as Bishop of {province}.', {
        name:FB.fullName(c),
        province:FB.world.byId[status.seeProvinceId]
          ? FB.world.byId[status.seeProvinceId].name : status.seeProvinceId
      }));
    return { accepted:true, chance:chance };
  };

  function promotePlayerReligiously(state, step) {
    const p = state.player;
    if (step.flag) p.flags[step.flag] = 1;
    if (!step.tier || step.tier <= p.tier) return;
    FB.setPlayerTier(state, step.tier);
  }

  FB.takeReligiousStep = function (state, c) {
    c = c || playerChar(state);
    if (!managedCareerCharacter(state, c)) return false;
    const advance = FB.religiousAdvance(state, c);
    if (!advance || advance.blocked) return false;
    const path = advance.path;
    const step = advance.step;
    const coreBishop = (path.id === 'catholic_monastic' ||
      path.id === 'catholic_clerical') && step.id === 'bishop';
    if ((path.id === 'catholic_monastic' && step.id === 'abbot') ||
        coreBishop) return false; // core contested offices use appointment flows
    state.player.gold -= step.gold || 0;
    state.player.prestige += step.prestigeGain || 0;
    c.religiousRanks = c.religiousRanks || {};
    c.religiousRanks[path.id] = path.index + 1;
    if (step.station !== undefined) {
      c.station = Math.max(FB.stationOf(c), step.station);
    }
    const career = FB.careerOf(state, c);
    if (path.kind !== 'lay' && path.index + 1 >= 2 &&
      career.rank === 'journeyman') career.rank = 'master';
    if (c.id === state.player.charId) promotePlayerReligiously(state, step);
    FB.news(state, FB.msg('news.religion.advanced',
      '🛐 {name} advances in religious standing.', { name:c.name }));
    return true;
  };

  FB.beginCareer = function (state, c, profession) {
    const def = FBDATA.careers[profession];
    if (!managedCareerCharacter(state, c) || !def) return false;
    if (c.id === state.player.charId && state.player.tier >= 3) return false;
    if (def.requiresTech && !FB.techRequirementMet(state, def.requiresTech)) return false;
    const age = FB.ageOf(c, state.date.year);
    const choices = FB.careerChoices(state, c);
    let choice = null;
    for (const item of choices) if (item.id === profession) choice = item;
    if (!choice) return false;
    const apprentice = !choice.resuming && (age < 16 || def.learned);
    const cost = choice.cost;
    if (state.player.gold < cost) return false;
    const targetRank = choice.resuming
      ? (choice.restoredRank || (age < 16 ? 'apprentice' : 'journeyman'))
      : (apprentice ? 'apprentice' : 'journeyman');
    if (!FB.setCareer(state, c, profession, targetRank)) return false;
    state.player.gold -= cost;
    if (c.id === state.player.charId && FB.validateFocus) FB.validateFocus(state);
    FB.news(state, choice.resuming
      ? FB.msg('news.career.resumes',
        '🧰 {name} returns to their former standing in {career}.', {
          name:c.name,
          career:FB.dataParam('career', profession)
        })
      : FB.msg('news.career.begins', {
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
    const out = [], seen = {}, married = {};
    function add(c) {
      if (!c || c.dead || seen[c.id]) return;
      if (c.id !== me.id && FB.isExternalHouseholdAuthority &&
          FB.isExternalHouseholdAuthority(state, c)) return;
      seen[c.id] = 1;
      out.push(c);
    }
    for (const id in state.chars) {
      const c = state.chars[id];
      const sp = c && c.spouseId && state.chars[c.spouseId];
      if (!c || c.dead || !sp || sp.dead) continue;
      married[c.id] = 1;
      married[sp.id] = 1;
    }
    add(me);
    for (const sp of FB.spousesOf(state, me)) add(sp);
    for (const child of FB.childrenOf(state, me)) {
      if (FB.playerDescendantKind(state, child.id) && !married[child.id]) add(child);
      for (const grandchild of FB.childrenOf(state, child)) {
        if (FB.playerDescendantKind(state, grandchild.id) === 'grandchild' &&
            !married[grandchild.id]) add(grandchild);
      }
    }
    return out;
  };

  /* Maintained household living standards are additive save-format-3 state.
     Definitions carry the whole benefit/upkeep of each current level; earlier
     levels are not summed. Work outfits sleep unless somebody can use them. */
  FB.ensureHouseholdStandards = function (state) {
    const p = state.player;
    if (!p.householdStandards || typeof p.householdStandards !== 'object' ||
        Array.isArray(p.householdStandards)) p.householdStandards = {};
    const table = FBDATA.householdStandards || {};
    for (const id in table) {
      const levels = Array.isArray(table[id].levels) ? table[id].levels : [];
      let level = Number(p.householdStandards[id]);
      if (!isFinite(level)) level = 0;
      level = FB.clamp(Math.floor(level), 0, levels.length);
      if (level) p.householdStandards[id] = level;
      else if (p.householdStandards[id] !== undefined) delete p.householdStandards[id];
    }
    return p.householdStandards;
  };

  FB.householdStandardIds = function () {
    const out = [];
    for (const id in (FBDATA.householdStandards || {})) out.push(id);
    return out;
  };

  FB.householdStandardLevel = function (state, id) {
    return FB.ensureHouseholdStandards(state)[id] || 0;
  };

  FB.householdStandardLevelDef = function (state, id) {
    const def = FBDATA.householdStandards && FBDATA.householdStandards[id];
    const level = FB.householdStandardLevel(state, id);
    return def && level && def.levels ? def.levels[level - 1] || null : null;
  };

  FB.householdStandardWorkerEligible = function (state, id) {
    const def = FBDATA.householdStandards && FBDATA.householdStandards[id];
    if (!def || def.kind !== 'work' || !def.profession) return true;
    for (const c of FB.householdMembers(state)) {
      if (FB.ageOf(c, state.date.year) < 16) continue;
      const career = FB.careerOf(state, c);
      if (!career || !career.chosen || career.rank === 'unassigned' ||
          career.rank === 'apprentice') continue;
      if (career.profession === def.profession) return true;
    }
    /* Contracted workers can use the maintained outfit while staffing a
       matching family enterprise. Their pay remains on its own ledger. */
    const enterprises = state.player.enterprises || [];
    for (const e of enterprises) {
      const enterprise = FBDATA.enterprises && FBDATA.enterprises[e.type];
      if (!enterprise || enterprise.profession !== def.profession) continue;
      for (const workerId of enterpriseAssignedIds(e)) {
        const worker = state.chars[workerId];
        if (!worker || worker.dead) continue;
        if (FB.retainerRecord(state, worker.id) ||
            (FB.enterpriseLaborRecord && FB.enterpriseLaborRecord(state, worker.id))) {
          return true;
        }
      }
    }
    return false;
  };

  FB.householdStandardActive = function (state, id) {
    const def = FBDATA.householdStandards && FBDATA.householdStandards[id];
    if (!def || !FB.householdStandardLevel(state, id)) return false;
    if (def.kind === 'ruler' && state.player.tier < 3) return false;
    const current = FB.householdStandardLevelDef(state, id);
    if (current && current.requiresTech && !current.grandfatherTech &&
        !FB.techRequirementMet(state, current.requiresTech)) return false;
    return def.kind !== 'work' || FB.householdStandardWorkerEligible(state, id);
  };

  FB.householdStandardEffects = function (state) {
    const out = {
      mortality:0, education:0, retainers:0, prestige:0,
      research:0, domain:0, levy:0, retinue:0, battle:0,
      travelCost:1, travelLegDays:null, work:{}
    };
    const standards = FB.ensureHouseholdStandards(state);
    /* When nothing is maintained, the per-id active checks (each re-ensuring
       the table, and the work scan walking the whole household) are pure
       waste, so the daily focus tick takes this cheap exit. */
    let any = false;
    for (const id in standards) { any = true; break; }
    if (!any) return out;
    const table = FBDATA.householdStandards || {};
    for (const id in table) {
      if (!FB.householdStandardActive(state, id)) continue;
      const def = table[id];
      const level = FB.householdStandardLevelDef(state, id);
      const fx = level && level.fx ? level.fx : {};
      if (fx.mortality) out.mortality += fx.mortality;
      if (fx.education) out.education += fx.education;
      if (fx.retainers) out.retainers += fx.retainers;
      if (fx.prestige) out.prestige += fx.prestige;
      if (fx.research) out.research += fx.research;
      if (fx.domain) out.domain += fx.domain;
      if (fx.levy) out.levy += fx.levy;
      if (fx.retinue) out.retinue += fx.retinue;
      if (fx.battle) out.battle += fx.battle;
      if (fx.travelCost !== undefined) out.travelCost *= fx.travelCost;
      if (fx.travelLegDays !== undefined) {
        out.travelLegDays = out.travelLegDays === null ? fx.travelLegDays :
          Math.min(out.travelLegDays, fx.travelLegDays);
      }
      if (fx.work && def.profession) {
        out.work[def.profession] = (out.work[def.profession] || 0) + fx.work;
      }
    }
    return out;
  };

  FB.householdStandardEffect = function (state, key) {
    const effects = FB.householdStandardEffects(state);
    return effects[key] === undefined ? 0 : effects[key];
  };

  FB.householdWorkMultiplier = function (state, profession) {
    const work = FB.householdStandardEffects(state).work;
    return 1 + (work[profession] || 0);
  };

  FB.householdStandardsUpkeepParts = function (state) {
    const lines = [];
    let total = 0;
    const table = FBDATA.householdStandards || {};
    for (const id in table) {
      if (!FB.householdStandardActive(state, id)) continue;
      const level = FB.householdStandardLevel(state, id);
      const current = table[id].levels && table[id].levels[level - 1];
      const raw = current ? Number(current.upkeep) || 0 : 0;
      const amount = raw && FB.marketCostQuote ? FB.marketCostQuote(state, raw,
        current.marketBasket || table[id].marketBasket,
        state.player.provinceId) : raw;
      if (!amount) continue;
      lines.push({ id:id, def:table[id], level:level, levelDef:current, amount:amount });
      total += amount;
    }
    return { lines:lines, total:total };
  };

  FB.householdStandardsUpkeep = function (state) {
    return FB.householdStandardsUpkeepParts(state).total;
  };

  FB.householdStandardUpgradeAvailable = function (state, id) {
    const def = FBDATA.householdStandards && FBDATA.householdStandards[id];
    if (!def || !Array.isArray(def.levels)) return FB.T('That household standard is unavailable.');
    const protagonist = state.chars && state.chars[state.player.charId];
    if (protagonist && FB.ageOf(protagonist, state.date.year) < 16) {
      return FB.T('You may reduce inherited standards during childhood, but new purchases unlock at age 16.');
    }
    const level = FB.householdStandardLevel(state, id);
    if (level >= def.levels.length) return FB.T('This standard is already at its highest level.');
    const next = def.levels[level];
    const tierMin = next.tierMin === undefined ? level : next.tierMin;
    if (next.requiresTech && !FB.techRequirementMet(state, next.requiresTech)) {
      return FB.T('Requires the national technology {technology}.', {
        technology:FBDATA.tech[next.requiresTech]
          ? FB.dataText(state, state.player.charId, 'tech', next.requiresTech,
            FBDATA.tech[next.requiresTech], 'name', {})
          : next.requiresTech
      });
    }
    if (state.player.tier < tierMin) {
      return FB.T('Requires {rank} rank.', {
        rank:FB.titleWordFor(state, tierMin)
      });
    }
    if (def.kind === 'work' && !FB.householdStandardWorkerEligible(state, id)) {
      return FB.T('No eligible household worker currently practices this profession.');
    }
    const cost = FB.householdStandardUpgradeCost(state, id);
    if (cost > 0 && state.player.gold + 0.0001 < cost) {
      return FB.T('Not enough money: requires {money:cost}.', { cost:cost });
    }
    return true;
  };

  FB.householdStandardUpgradeCost = function (state, id) {
    const def = FBDATA.householdStandards && FBDATA.householdStandards[id];
    if (!def || !Array.isArray(def.levels)) return 0;
    const next = def.levels[FB.householdStandardLevel(state, id)];
    const raw = next ? Number(next.cost) || 0 : 0;
    return raw && FB.marketCostQuote ? FB.marketCostQuote(state, raw,
      next.marketBasket || def.marketBasket, state.player.provinceId, 'up') : raw;
  };

  FB.buyHouseholdStandard = function (state, id) {
    if (FB.householdStandardUpgradeAvailable(state, id) !== true) return false;
    const def = FBDATA.householdStandards[id];
    const oldLevel = FB.householdStandardLevel(state, id);
    const next = def.levels[oldLevel];
    state.player.gold -= FB.householdStandardUpgradeCost(state, id);
    FB.ensureHouseholdStandards(state)[id] = oldLevel + 1;
    FB.news(state, FB.msg('news.household_standard.bought',
      '🏠 The household establishes {level} for {standard}.', {
        level:FB.dataParam('householdStandard', id, 'levels.' + oldLevel + '.name'),
        standard:FB.dataParam('householdStandard', id)
      }));
    return true;
  };

  /* Landed households may shed trade tools and ruler establishments, but
     general living standards cannot fall below the dignity of the current
     title. Successive title tiers raise that floor through the authored list. */
  FB.householdStandardMinimumLevel = function (state, id) {
    const def = FBDATA.householdStandards && FBDATA.householdStandards[id];
    if (!def || !Array.isArray(def.levels) || def.kind === 'work' ||
        def.kind === 'ruler' ||
        def.titleFloor === false ||
        state.player.tier < 3) return 0;
    return Math.min(def.levels.length, Math.max(1, state.player.tier - 2));
  };

  FB.householdStandardReductionAvailable = function (state, id) {
    const def = FBDATA.householdStandards && FBDATA.householdStandards[id];
    const level = FB.householdStandardLevel(state, id);
    if (!def || !level) return FB.T('Already at baseline.');
    const minimum = FB.householdStandardMinimumLevel(state, id);
    if (level <= minimum) {
      return FB.T('{rank} households may not reduce this standard below level {level}.', {
        rank:FB.titleWordFor(state, state.player.tier),
        level:minimum
      });
    }
    return true;
  };

  function reduceStandard(state, id, automatic) {
    const def = FBDATA.householdStandards && FBDATA.householdStandards[id];
    const level = FB.householdStandardLevel(state, id);
    if (!def || !level ||
        FB.householdStandardReductionAvailable(state, id) !== true) return false;
    const map = FB.ensureHouseholdStandards(state);
    if (level > 1) map[id] = level - 1;
    else delete map[id];
    FB.news(state, FB.msg('news.household_standard.reduced', {
      forms: {
        select:'value', param:'automatic', cases:{
          yes:'🏠 Coin runs short; the household lets {level} lapse from {standard}.',
          no:'🏠 The household gives up {level} in {standard}; its setup investment is lost.',
          other:'🏠 The household gives up {level} in {standard}.'
        }
      }
    }, {
      automatic:automatic ? 'yes' : 'no',
      level:FB.dataParam('householdStandard', id, 'levels.' + (level - 1) + '.name'),
      standard:FB.dataParam('householdStandard', id)
    }));
    return true;
  }

  FB.reduceHouseholdStandard = function (state, id) {
    return reduceStandard(state, id, false);
  };

  function standardToLapse(state) {
    const table = FBDATA.householdStandards || {};
    const priority = ['luxuries', 'wares', 'transport', 'quarters', 'board'];
    for (let i = 0; i < priority.length; i++) {
      if (FB.householdStandardActive(state, priority[i]) &&
          FB.householdStandardReductionAvailable(state, priority[i]) === true) {
        return priority[i];
      }
    }
    /* A mod-added general standard follows the core discretionary categories
       in stable definition order, before tools needed for current work. */
    for (const id in table) {
      if (priority.indexOf(id) >= 0 || table[id].kind === 'work') continue;
      if (FB.householdStandardActive(state, id) &&
          FB.householdStandardReductionAvailable(state, id) === true) return id;
    }
    let best = null, bestLevel = -1;
    for (const id in table) {
      if (table[id].kind !== 'work' || !FB.householdStandardActive(state, id) ||
          FB.householdStandardReductionAvailable(state, id) !== true) continue;
      const level = FB.householdStandardLevel(state, id);
      if (level > bestLevel) {
        best = id;
        bestLevel = level;
      }
    }
    return best;
  }

  /* Called after ordinary livelihood income and before service, schooling,
     and finance settlements. Discretionary levels lapse rather than create
     debt. A landed title floor is compulsory and may leave a cash shortfall. */
  FB.householdStandardsSeason = function (state) {
    const reduced = [];
    let upkeep = FB.householdStandardsUpkeep(state);
    let available = Math.max(0, state.player.gold);
    while (upkeep > available + 0.0001) {
      const id = standardToLapse(state);
      if (!id || !reduceStandard(state, id, true)) break;
      reduced.push(id);
      upkeep = FB.householdStandardsUpkeep(state);
    }
    available = Math.max(0, state.player.gold);
    const paid = state.player.tier >= 3 ? upkeep : Math.min(available, upkeep);
    state.player.gold -= paid;
    state.player.prestige += FB.householdStandardEffect(state, 'prestige');
    return { paid:paid, reduced:reduced };
  };

  FB.retainerCapacity = function (state) {
    const scale = FBDATA.balance.retainerCapacity || [0,1,2,2,3,3,4,5];
    const tier = FB.clamp(state.player.tier || 0, 0, scale.length - 1);
    return Math.max(0, (scale[tier] || 0) +
      FB.householdStandardEffect(state, 'retainers') +
      (FB.enterpriseUpgradeEffect
        ? FB.enterpriseUpgradeEffect(state, 'retainers') : 0));
  };

  function releaseAuthorityRetainer(state, c) {
    if (!c) return;
    if (state.roles && state.roles.lord === c.id) c.role = 'lord';
    if (FB.unassignEnterpriseWorker) {
      FB.unassignEnterpriseWorker(state, c.id);
    }
    for (const sid in state.chars) {
      const student = state.chars[sid];
      if (student && student.edu && student.edu.tutorId === c.id &&
          student.edu.school === 'master') {
        student.edu.tutorId = null;
        student.edu.school = null;
      }
    }
    if (FB.clearLoadout) FB.clearLoadout(state, c.id);
  }

  /* Retainers are inherited household contracts, not family members. Records
     stay compact and point at normal characters for every human quality.
     Normalization also repairs saves made while a political household head
     could incorrectly enter the player's service. */
  FB.retainerRecords = function (state) {
    const p = state.player;
    if (!Array.isArray(p.retainers)) p.retainers = [];
    const out = [], seen = {}, seenOffice = {};
    for (const record of p.retainers) {
      const c = record && state.chars[record.charId];
      const def = record && FB.positionDef(record.office);
      const authority = c && FB.isExternalHouseholdAuthority &&
        FB.isExternalHouseholdAuthority(state, c);
      if (!record || !c || c.dead || !def || def.kind !== 'retainer' ||
          authority || seen[record.charId] || seenOffice[record.office]) {
        if (authority) releaseAuthorityRetainer(state, c);
        continue;
      }
      seen[record.charId] = 1;
      seenOffice[record.office] = 1;
      if (!isFinite(Number(record.pay)) || Number(record.pay) < 0) record.pay = def.pay || 0;
      else record.pay = Number(record.pay);
      if (!isFinite(Number(record.startedTurn))) record.startedTurn = state.turn;
      else record.startedTurn = Number(record.startedTurn);
      if (!isFinite(Number(record.unpaid)) || Number(record.unpaid) < 0) record.unpaid = 0;
      else record.unpaid = Math.floor(Number(record.unpaid));
      out.push(record);
    }
    if (out.length !== p.retainers.length) p.retainers = out;
    return p.retainers;
  };

  FB.retainerRecord = function (state, cid) {
    for (const record of FB.retainerRecords(state)) {
      if (record.charId === cid) return record;
    }
    return null;
  };

  FB.retainerOfficeRecord = function (state, office) {
    for (const record of FB.retainerRecords(state)) {
      if (record.office === office) return record;
    }
    return null;
  };

  FB.retainerCharacters = function (state) {
    const out = [];
    for (const record of FB.retainerRecords(state)) {
      const c = state.chars[record.charId];
      if (c && !c.dead) out.push(c);
    }
    return out;
  };

  FB.householdWorkers = function (state) {
    const out = [], seen = {};
    function add(c) {
      if (!c || c.dead || seen[c.id]) return;
      seen[c.id] = 1;
      out.push(c);
    }
    for (const c of FB.householdMembers(state)) add(c);
    for (const c of FB.retainerCharacters(state)) add(c);
    /* Manageable kin work alongside the household without becoming members:
       no upkeep, no household semantics — labor only. Age and profession
       filters stay at the call sites. */
    if (FB.manageableKinKind) {
      for (const id in state.chars) {
        const c = state.chars[id];
        if (c && FB.manageableKinKind(state, c.id)) add(c);
      }
    }
    return out;
  };

  FB.retainerSeasonCost = function (state) {
    let total = 0;
    for (const record of FB.retainerRecords(state)) total += record.pay || 0;
    return total;
  };

  function retainerCandidateIds(state) {
    const ids = [], seen = {};
    function add(id) {
      const c = id && state.chars[id];
      if (!c || c.dead || c.id === state.player.charId || seen[id] ||
          (FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(state, c.id)) ||
          (FB.isExternalHouseholdAuthority &&
            FB.isExternalHouseholdAuthority(state, c)) ||
          FB.retainerRecord(state, id)) return;
      seen[id] = 1;
      ids.push(id);
    }
    const contacts = state.player.friendContacts || {};
    for (const id in contacts) add(id);
    for (const role of ['friend', 'priest', 'notable']) add(state.roles[role]);
    return ids;
  }

  FB.retainerCandidates = function (state, office) {
    const def = FB.positionDef(office);
    const out = [];
    if (!def || def.kind !== 'retainer') return out;
    const family = {};
    for (const c of FB.householdMembers(state)) family[c.id] = 1;
    for (const id of retainerCandidateIds(state)) {
      const c = state.chars[id];
      if ((FB.isExternalHouseholdAuthority &&
          FB.isExternalHouseholdAuthority(state, c)) || family[id] ||
          (FB.isAgencyFamilyMember &&
          FB.isAgencyFamilyMember(state, id)) ||
          FB.ageOf(c, state.date.year) < 16 ||
          FB.standingOf(state, { kind:'character', id:c.id }) <= -40 ||
          (def.maleOnly && c.sex !== 'm')) continue;
      const career = FB.careerOf(state, c);
      if (career && career.profession === def.profession) out.push(c);
    }
    out.sort(function (a, b) {
      return FB.standingOf(state, { kind:'character', id:b.id }) -
        FB.standingOf(state, { kind:'character', id:a.id }) ||
        FB.skillOf(b, 'ste') - FB.skillOf(a, 'ste');
    });
    return out;
  };

  FB.canHireRetainer = function (state, office, cid) {
    const def = FB.positionDef(office);
    if (!def || def.kind !== 'retainer' || state.player.tier < (def.minTier || 0)) return false;
    const candidate = cid && state.chars[cid];
    if (candidate && FB.isExternalHouseholdAuthority &&
        FB.isExternalHouseholdAuthority(state, candidate)) return false;
    if (FB.retainerRecords(state).length >= FB.retainerCapacity(state)) return false;
    if (FB.retainerOfficeRecord(state, office) ||
        (FB.familyOfficeHolder && FB.familyOfficeHolder(state, office))) return false;
    if ((def.pay || 0) > 0 && state.player.gold < (def.pay || 0)) return false;
    if (!cid) return true;
    for (const c of FB.retainerCandidates(state, office)) if (c.id === cid) return true;
    return false;
  };

  FB.hireRetainer = function (state, office, cid) {
    const def = FB.positionDef(office);
    if (!FB.canHireRetainer(state, office, cid)) return false;
    let c = cid ? state.chars[cid] : null;
    if (!c) {
      const pr = FB.world.byId[state.player.provinceId];
      c = FB.makeCharacter(state, {
        culture:pr.culture, religion:pr.religion,
        born:state.date.year - FB.ri(22, 48),
        sex:def.maleOnly ? 'm' : undefined,
        role:'retainer', station:Math.min(2, state.player.tier),
        quality:def.quality || 2
      });
      FB.setCareer(state, c, def.profession, (def.quality || 0) >= 3 ? 'master' : 'journeyman');
    } else if (c.role !== 'friend' && c.role !== 'priest' && c.role !== 'notable') {
      c.role = 'retainer';
    }
    state.player.gold -= def.pay || 0; // the first season is paid on entry
    FB.retainerRecords(state).push({
      charId:c.id, office:office, pay:def.pay || 0,
      startedTurn:state.turn, unpaid:0
    });
    FB.adjustStanding(state, { kind:'character', id:c.id }, 10,
      'retainer:hired');
    FB.news(state, FB.msg('news.retainer.hired',
      '🗝 {name} enters the household as {office}; the first season’s pay is settled.',
      { name:c.name, office:FB.dataParam('position', office) }));
    return true;
  };

  FB.removeRetainer = function (state, cid, reason) {
    const records = FB.retainerRecords(state);
    let record = null;
    for (let i = records.length - 1; i >= 0; i--) {
      if (records[i].charId === cid) {
        record = records[i];
        records.splice(i, 1);
      }
    }
    if (!record) return false;
    if (FB.unassignEnterpriseWorker) FB.unassignEnterpriseWorker(state, cid);
    for (const sid in state.chars) {
      const student = state.chars[sid];
      if (student.edu && student.edu.tutorId === cid) {
        student.edu.tutorId = null;
        if (student.edu.school === 'master') student.edu.school = null;
      }
    }
    if (FB.clearLoadout) FB.clearLoadout(state, cid);
    const c = state.chars[cid];
    if (c && c.role === 'retainer') c.role = null;
    if (reason === 'dismissed' && c) {
      FB.adjustStanding(state, { kind:'character', id:c.id }, -15,
        'retainer:dismissed');
      FB.news(state, FB.msg('news.retainer.dismissed',
        '🗝 {name} is dismissed from household service.', { name:c.name }));
    } else if (reason === 'unpaid' && c) {
      FB.adjustStanding(state, { kind:'character', id:c.id }, -20,
        'retainer:unpaid_departure');
      FB.news(state, FB.msg('news.retainer.left_unpaid',
        '🪙 Two seasons without pay drive {name} from the household.', { name:c.name }));
    } else if (reason === 'disloyal' && c) {
      FB.news(state, FB.msg('news.retainer.left_disloyal',
        '🗝 {name} no longer bears the household enough goodwill to remain in service.',
        { name:c.name }));
    } else if (reason === 'death' && c) {
      FB.news(state, FB.msg('news.retainer.died',
        '🕯 {name}, long in household service, has died.', { name:c.name }));
    } else if (reason === 'capacity' && c) {
      FB.news(state, FB.msg('news.retainer.capacity_lost',
        '🗝 The diminished household can no longer maintain {name} in service.',
        { name:c.name }));
    }
    return true;
  };

  FB.retainerSeason = function (state) {
    const active = FB.retainerRecords(state);
    while (active.length > FB.retainerCapacity(state)) {
      FB.removeRetainer(state, active[active.length - 1].charId, 'capacity');
    }
    const records = FB.retainerRecords(state).slice();
    for (const record of records) {
      const c = state.chars[record.charId];
      if (c && FB.standingOf(state, {
          kind:'character', id:c.id
        }) <= -40) {
        FB.removeRetainer(state, record.charId, 'disloyal');
        continue;
      }
      const pay = record.pay || 0;
      if (state.player.gold + 0.0001 >= pay) {
        state.player.gold -= pay;
        record.unpaid = 0;
        continue;
      }
      record.unpaid = (record.unpaid || 0) + 1;
      if (c) {
        FB.adjustStanding(state, { kind:'character', id:c.id }, -10,
          'retainer:missed_pay');
      }
      if (record.unpaid >= 2) {
        FB.removeRetainer(state, record.charId, 'unpaid');
      } else if (c) {
        FB.news(state, FB.msg('news.retainer.pay_missed',
          '🪙 The household cannot pay {name}; another missed season will end the service.',
          { name:c.name }));
      }
    }
  };

  FB.retainerSuccession = function (state) {
    const records = FB.retainerRecords(state);
    if (!records.length) return;
    for (const record of records) {
      const c = state.chars[record.charId];
      if (c) {
        FB.adjustStanding(state, { kind:'character', id:c.id }, -15,
          'retainer:succession');
      }
    }
    FB.news(state, FB.msg('news.retainer.succession',
      '🗝 The inherited household servants renew their service to the new head.',
      {}));
  };

  /* The old station-only upkeep remains the base cost. Extra resident family
     members add food, clothing, and quarters at the standard their station is
     expected to maintain. Local commodity scarcity quotes these tangible
     necessities; contracts such as schooling and retainer pay stay in real
     gold. Married descendants have their own households. */
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
    const raw = base + family;
    const total = FB.marketCostQuote ? FB.marketCostQuote(state, raw, {
      provisions:0.65, wares:0.2, materials:0.1, luxuries:0.05
    }, p.provinceId) : raw;
    const provisionsDue = FB.marketCostQuote ? FB.marketCostQuote(state,
      raw * 0.65, { provisions:1 }, p.provinceId) : raw * 0.65;
    return {
      base:base, family:family, wartime:0, residents:residents,
      provisionsDue:provisionsDue, marketAdjustment:total - raw, total:total
    };
  };

  FB.householdUpkeep = function (state) {
    return FB.householdUpkeepParts(state).total;
  };

  FB.educationStudentEligible = function (state, c) {
    if (!c || c.dead) return false;
    const age = FB.ageOf(c, state.date.year);
    if (age < 6 || age >= 16) return false;
    if (c.id === state.player.charId) return true;
    return !!(FB.playerDescendantKind(state, c.id) &&
      !FB.spousesOf(state, c).length);
  };

  /* A minor player and each resident unmarried child or grandchild may
     receive instruction. The focus is the subject; edu.school names a paid
     institution, while tutorId keeps the existing named teacher. */
  FB.educationStudents = function (state) {
    const out = [];
    for (const c of FB.householdMembers(state)) {
      if (FB.educationStudentEligible(state, c)) out.push(c);
    }
    return out;
  };

  function educationPolicyDefaults(value) {
    const policy = value && typeof value === 'object' && !Array.isArray(value) ?
      value : {};
    return {
      focus:FB.SKILLS.indexOf(policy.focus) >= 0 ? policy.focus : null,
      instructionMode:policy.instructionMode === 'best' ? 'best' : 'manual',
      feeCap:Math.max(0, isFinite(Number(policy.feeCap)) ? Number(policy.feeCap) : 0)
    };
  }

  function educationChoiceKey(c) {
    if (c && c.edu && c.edu.tutorId) return 'tutor:' + c.edu.tutorId;
    if (c && c.edu && c.edu.school) return 'school:' + c.edu.school;
    return 'home';
  }

  function educationPolicyRecord(c, create) {
    if (!c) return null;
    if (!c.edu) {
      if (!create) return null;
      c.edu = {};
    }
    let record = c.edu.policy;
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      if (!create) return null;
      record = {};
      c.edu.policy = record;
    }
    if (record.focus !== 'manual' && record.focus !== 'policy') {
      delete record.focus;
    }
    if (record.instruction !== 'manual' && record.instruction !== 'policy' &&
        record.instruction !== 'waiting') {
      delete record.instruction;
    }
    if (typeof record.instructionChoice !== 'string') {
      delete record.instructionChoice;
    }
    return record;
  }

  function normalizeEducationCharacter(c) {
    if (!c || !c.edu) return null;
    const existing = educationPolicyRecord(c, false);
    const needsFocus = !!c.edu.focus && (!existing || !existing.focus);
    const needsInstruction = !!(c.edu.school || c.edu.tutorId) &&
      (!existing || !existing.instruction);
    if (!needsFocus && !needsInstruction) return existing;
    const record = educationPolicyRecord(c, true);
    if (needsFocus) record.focus = 'manual';
    if (needsInstruction) {
      record.instruction = 'manual';
      record.instructionChoice = educationChoiceKey(c);
    }
    return record;
  }

  /* Household education policy is additive save state. Existing non-empty
     education choices in old saves become explicit manual choices the first
     time the subsystem sees them; an implicit home fallback remains an empty
     slot which a newly enabled policy may fill. */
  FB.ensureEducationPolicy = function (state, scanCharacters) {
    if (!state || !state.player) return educationPolicyDefaults(null);
    state.player.educationPolicy =
      educationPolicyDefaults(state.player.educationPolicy);
    if (scanCharacters) {
      for (const id in state.chars) normalizeEducationCharacter(state.chars[id]);
    }
    return state.player.educationPolicy;
  };

  FB.educationPolicyProvenance = function (state, c, dimension) {
    FB.ensureEducationPolicy(state);
    const record = normalizeEducationCharacter(c);
    return record && record[dimension] || null;
  };

  FB.markEducationManual = function (state, c, dimension, choice) {
    FB.ensureEducationPolicy(state);
    normalizeEducationCharacter(c);
    const record = educationPolicyRecord(c, true);
    record[dimension] = 'manual';
    if (dimension === 'instruction') {
      record.instructionChoice = choice || educationChoiceKey(c);
    }
    return record;
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

  /* The shared availability result feeds both the detailed picker and policy
     selection. `focus` may be a preview value not yet written to the child. */
  FB.educationArrangementAvailability = function (state, c, id, focus) {
    const def = FBDATA.schooling[id];
    const age = c ? FB.ageOf(c, state.date.year) : -1;
    if (!def || !c || c.dead) return { available:false, reason:'student' };
    if (!focus) return { available:false, reason:'focus' };
    if (age < 6) return { available:false, reason:'young' };
    if (age >= 16) return { available:false, reason:'old' };
    if (!FB.educationStudentEligible(state, c)) {
      return { available:false, reason:'student' };
    }
    if (def.tierMin !== undefined && state.player.tier < def.tierMin) {
      return { available:false, reason:'tier' };
    }
    if (def.requiresTech && !FB.techRequirementMet(state, def.requiresTech)) {
      return { available:false, reason:'tech' };
    }
    if (def.devMin && (state.dev[state.player.provinceId] || 1) < def.devMin) {
      return { available:false, reason:'development' };
    }
    if (def.focuses && def.focuses.indexOf(focus) < 0) {
      return { available:false, reason:'unsupported' };
    }
    return { available:true, reason:null };
  };

  FB.schoolingAvailable = function (state, c, id) {
    return FB.educationArrangementAvailability(
      state, c, id, c && c.edu && c.edu.focus).available;
  };

  function schoolingFee(state, id) {
    const def = id && FBDATA.schooling[id];
    return def ? (Number(def.cost) || 0) *
      FB.techCostFactor(state, 'training') : 0;
  }

  function educationKnownTutors(state, c) {
    const out = [], seen = {};
    const me = state.chars[state.player.charId];
    function add(id, source, first) {
      const tutor = id === 'self' ? me : state.chars[id];
      if (!id || !tutor || tutor.dead || seen[id]) return;
      seen[id] = 1;
      const entry = { id:id, tutor:tutor, source:source };
      if (first) out.unshift(entry);
      else out.push(entry);
    }
    const currentId = c && c.edu && c.edu.tutorId;
    let current = null;
    if (currentId === 'self') current = c.id === me.id ? null : me;
    else if (currentId) current = state.chars[currentId];
    if (current && current.dead) current = null;
    if (current && (c.edu.school === 'master' || current.role === 'tutor')) {
      add(current.id, 'personal_master', true);
    }
    if (c && c.id === state.player.charId) {
      add(me.fatherId, 'father');
      add(me.motherId, 'mother');
    } else {
      add('self', 'self');
      for (const spouse of FB.spousesOf(state, me)) add(spouse.id, 'spouse');
    }
    for (const role of ['priest', 'friend', 'lord']) {
      if (role === 'lord' && FB.playerStation(state) < 2) continue;
      const tutor = FB.getRole(state, role, false);
      if (tutor && (role !== 'lord' || FB.standingOf(state, {
        kind:'character', id:tutor.id
      }) >= 0)) {
        add(tutor.id, role);
      }
    }
    for (const record of (FB.retainerRecords ? FB.retainerRecords(state) : [])) {
      if (record.office === 'tutor') add(record.charId, 'household_tutor');
    }
    if (current) {
      add(currentId === 'self' ? 'self' : current.id, 'current_tutor');
    }
    return out;
  }

  function educationBaseAvailability(state, c, focus, requireFocus) {
    const age = c ? FB.ageOf(c, state.date.year) : -1;
    if (!c || c.dead) return { available:false, reason:'student' };
    if (requireFocus && !focus) return { available:false, reason:'focus' };
    if (age < 6) return { available:false, reason:'young' };
    if (age >= 16) return { available:false, reason:'old' };
    if (!FB.educationStudentEligible(state, c)) {
      return { available:false, reason:'student' };
    }
    return { available:true, reason:null };
  }

  function educationCoreChance(state, c, option, focus) {
    const B = FBDATA.balance;
    const cap = B.educationChanceCap || 0.9;
    const tech = FB.techBonus ? FB.techBonus(state, 'education') : 0;
    let chance = B.educationBaseChance === undefined ? 0.18 : B.educationBaseChance;
    if (option && option.kind === 'school' && option.def &&
        option.def.chance !== undefined) {
      chance = Number(option.def.chance) || 0;
    } else if (option && option.kind === 'tutor' && option.tutor) {
      chance = (B.educationTutorBase === undefined ? 0.3 : B.educationTutorBase) +
        FB.skillOf(option.tutor, focus) *
        (B.educationTutorSkillChance === undefined ? 0.04 :
          B.educationTutorSkillChance);
    }
    return Math.min(cap, chance + tech);
  }

  FB.educationProjectedChance = function (state, c, option, focus) {
    const cap = FBDATA.balance.educationChanceCap || 0.9;
    return Math.min(cap, educationCoreChance(state, c, option, focus) +
      FB.holdingBonus(state, 'edu') +
      (FB.householdStandardEffect ?
        FB.householdStandardEffect(state, 'education') : 0));
  };

  /* Discover every deterministic instruction choice. Schools keep their data
     order, followed by already-known tutors in the existing relationship
     order, then home. Hiring a generated personal master is intentionally not
     represented here and remains a manual-only picker action. */
  FB.educationOptions = function (state, c, focus) {
    const chosenFocus = focus === undefined ? c && c.edu && c.edu.focus : focus;
    const out = [];
    let order = 0;
    for (const id in FBDATA.schooling) {
      if (id === 'master') continue;
      const def = FBDATA.schooling[id];
      const availability =
        FB.educationArrangementAvailability(state, c, id, chosenFocus);
      const option = {
        kind:'school', id:'school:' + id, schoolId:id, def:def,
        fee:schoolingFee(state, id), available:availability.available,
        reason:availability.reason, order:order++,
        annualMortality:Math.min(1,
          Math.max(0, Number(def.annualMortality) || 0))
      };
      option.chance = FB.educationProjectedChance(
        state, c, option, chosenFocus);
      out.push(option);
    }
    for (const entry of educationKnownTutors(state, c)) {
      const paidMaster = entry.tutor.role === 'tutor';
      const availability = paidMaster ?
        FB.educationArrangementAvailability(state, c, 'master', chosenFocus) :
        educationBaseAvailability(state, c, chosenFocus, true);
      const option = {
        kind:'tutor', id:'tutor:' + entry.id, tutorId:entry.id,
        tutor:entry.tutor, tutorSource:entry.source,
        schoolId:paidMaster ? 'master' : null,
        fee:paidMaster ? schoolingFee(state, 'master') : 0,
        available:availability.available, reason:availability.reason,
        order:order++, annualMortality:0
      };
      option.chance = FB.educationProjectedChance(
        state, c, option, chosenFocus);
      out.push(option);
    }
    const homeAvailability =
      educationBaseAvailability(state, c, chosenFocus, true);
    const home = {
      kind:'home', id:'home', schoolId:null, tutorId:null, fee:0,
      available:homeAvailability.available, reason:homeAvailability.reason,
      order:order, annualMortality:0
    };
    home.chance = FB.educationProjectedChance(state, c, home, chosenFocus);
    out.push(home);
    return out;
  };

  FB.educationBestOption = function (state, c, focus, feeCap) {
    const cap = Math.max(0, isFinite(Number(feeCap)) ? Number(feeCap) : 0);
    let best = null;
    for (const option of FB.educationOptions(state, c, focus)) {
      if (!option.available || option.fee > cap + 0.0001) continue;
      if (!best || option.chance > best.chance + 0.0000001 ||
          (Math.abs(option.chance - best.chance) <= 0.0000001 &&
            (option.fee < best.fee - 0.0001 ||
              (Math.abs(option.fee - best.fee) <= 0.0001 &&
                option.order < best.order)))) {
        best = option;
      }
    }
    return best;
  };

  FB.educationCurrentOption = function (state, c, focus) {
    const options = FB.educationOptions(state, c, focus);
    const key = educationChoiceKey(c);
    for (const option of options) if (option.id === key) return option;
    for (const option of options) if (option.kind === 'home') return option;
    return null;
  };

  FB.schoolingCost = function (state, c) {
    const focus = c && c.edu && c.edu.focus;
    const option = FB.educationCurrentOption(state, c, focus);
    return focus && option && option.available ? option.fee : 0;
  };

  /* Full-year directed-learning chance supplied by the current teacher or
     school, before household "Letters" and before partial-term accounting. */
  FB.educationInstructionChance = function (state, c) {
    const focus = c && c.edu && c.edu.focus;
    const option = FB.educationCurrentOption(state, c, focus);
    if (!option || !option.available) {
      return educationCoreChance(state, c, { kind:'home' }, focus);
    }
    return educationCoreChance(state, c, option, focus);
  };

  function policyFocusNotice(state, c, focus) {
    FB.news(state, FB.msg('news.education.policy_focus', {
      forms:{
        select:'value', param:'subject', cases:{
          self:{
            select:'value', param:'focus', cases:{
              dip:'🎓 Your household policy assigns diplomacy as your education focus.',
              mar:'🎓 Your household policy assigns martial skill as your education focus.',
              ste:'🎓 Your household policy assigns stewardship as your education focus.',
              int:'🎓 Your household policy assigns intrigue as your education focus.',
              lea:'🎓 Your household policy assigns learning as your education focus.',
              other:'🎓 Your household policy assigns an education focus.'
            }
          },
          other:{
            select:'value', param:'focus', cases:{
              dip:'🎓 Household policy assigns diplomacy as {name}’s education focus.',
              mar:'🎓 Household policy assigns martial skill as {name}’s education focus.',
              ste:'🎓 Household policy assigns stewardship as {name}’s education focus.',
              int:'🎓 Household policy assigns intrigue as {name}’s education focus.',
              lea:'🎓 Household policy assigns learning as {name}’s education focus.',
              other:'🎓 Household policy assigns {name} an education focus.'
            }
          }
        }
      }
    }, {
      subject:c.id === state.player.charId ? 'self' : 'other',
      focus:focus, name:c.name
    }));
  }

  function policyInstructionNotice(state, c, option) {
    const params = {
      subject:c.id === state.player.charId ? 'self' : 'other',
      kind:option.kind, name:c.name
    };
    if (option.kind === 'school') {
      params.school = FB.dataParam('schooling', option.schoolId);
    } else if (option.kind === 'tutor') {
      params.tutor = option.tutor ? option.tutor.name : '';
    }
    FB.news(state, FB.msg('news.education.policy_instruction', {
      forms:{
        select:'value', param:'subject', cases:{
          self:{
            select:'value', param:'kind', cases:{
              school:'🎓 Your household policy arranges lessons at {school}.',
              tutor:'🎓 Your household policy assigns {tutor} to your lessons.',
              home:'🎓 Your household policy assigns instruction at home.',
              other:'🎓 Your household policy arranges your instruction.'
            }
          },
          other:{
            select:'value', param:'kind', cases:{
              school:'🎓 Household policy arranges {name}’s lessons at {school}.',
              tutor:'🎓 Household policy assigns {tutor} to {name}’s lessons.',
              home:'🎓 Household policy assigns {name} instruction at home.',
              other:'🎓 Household policy arranges {name}’s instruction.'
            }
          }
        }
      }
    }, params));
  }

  function policyWaitingNotice(state, c) {
    FB.news(state, FB.msg('news.education.policy_waiting_focus', {
      forms:{
        select:'value', param:'subject', cases:{
          self:'🎓 Household policy cannot arrange your instruction until an education focus is chosen.',
          other:'🎓 Household policy cannot arrange {name}’s instruction until an education focus is chosen.'
        }
      }
    }, {
      subject:c.id === state.player.charId ? 'self' : 'other', name:c.name
    }));
  }

  function applyEducationOption(c, option) {
    c.edu = c.edu || {};
    c.edu.school = option.schoolId || null;
    c.edu.tutorId = option.tutorId || null;
    delete c.edu.schoolUnpaid;
  }

  /* Preview only dimensions which are still empty (or waiting for a focus).
     Earlier policy choices and explicit overrides remain exactly where they
     are when the household policy is edited. */
  FB.educationPolicyPreview = function (state, draft) {
    FB.ensureEducationPolicy(state);
    const policy = educationPolicyDefaults(draft);
    const out = [];
    for (const c of FB.educationStudents(state)) {
      if (FB.isProtected(state, 'educationCharacter', c.id)) continue;
      const record = normalizeEducationCharacter(c) || {};
      let focus = c.edu && c.edu.focus || null;
      const focusAffected = !record.focus && !focus && !!policy.focus;
      if (focusAffected) focus = policy.focus;
      const instructionAffected = policy.instructionMode === 'best' &&
        (!record.instruction || record.instruction === 'waiting');
      if (!focusAffected && !instructionAffected) continue;
      const option = instructionAffected && focus ?
        FB.educationBestOption(state, c, focus, policy.feeCap) :
        FB.educationCurrentOption(state, c, focus);
      let effective = option;
      if (option && !option.available && focus) {
        const choices = FB.educationOptions(state, c, focus);
        for (const choice of choices) {
          if (choice.kind === 'home') {
            effective = choice;
            break;
          }
        }
      }
      out.push({
        c:c, focus:focus, option:option,
        focusAffected:focusAffected,
        instructionAffected:instructionAffected,
        waitingFocus:instructionAffected && !focus,
        instructionUnavailable:!!(option && !option.available),
        projectedChance:effective && effective.available ? effective.chance : null,
        seasonalFee:option && option.available ? option.fee : 0,
        riskOption:option && option.available ? option : null
      });
    }
    return out;
  };

  /* Apply only empty dimensions. A policy-selected tutor which disappeared
     is the sole refill case: explicit tutor loss stays an explicit empty
     override, while a prior policy school/home choice is never upgraded just
     because policy terms or available options later change. */
  FB.applyEducationPolicy = function (state, options) {
    const policy = FB.ensureEducationPolicy(state);
    const opts = options || {};
    const dimensions = opts.dimensions || { focus:true, instruction:true };
    const ids = opts.ids || null;
    const changed = [];
    for (const c of FB.educationStudents(state)) {
      if (ids && !ids[c.id]) continue;
      if (FB.isProtected(state, 'educationCharacter', c.id)) continue;
      normalizeEducationCharacter(c);
      const record = educationPolicyRecord(c, true);
      if (dimensions.instruction && record.instruction === 'policy' &&
          record.instructionChoice &&
          record.instructionChoice.indexOf('tutor:') === 0) {
        const expected = record.instructionChoice.slice(6);
        const actual = c.edu && c.edu.tutorId;
        if (actual && !FB.educationTutor(state, c, true)) {
          delete record.instruction;
          delete record.instructionChoice;
        } else if (!actual && expected) {
          delete record.instruction;
          delete record.instructionChoice;
        } else if (actual && String(actual) !== expected) {
          record.instruction = 'manual';
          record.instructionChoice = educationChoiceKey(c);
        }
      }
      if (dimensions.focus && !record.focus && !c.edu.focus && policy.focus) {
        c.edu.focus = policy.focus;
        record.focus = 'policy';
        changed.push({ c:c, dimension:'focus', focus:policy.focus });
        policyFocusNotice(state, c, policy.focus);
      }
      if (!dimensions.instruction || policy.instructionMode !== 'best' ||
          (record.instruction && record.instruction !== 'waiting')) continue;
      if (!c.edu.focus) {
        if (record.instruction !== 'waiting') {
          record.instruction = 'waiting';
          record.instructionChoice = 'waiting-focus';
          changed.push({ c:c, dimension:'instruction', waitingFocus:true });
          policyWaitingNotice(state, c);
        }
        continue;
      }
      const selected =
        FB.educationBestOption(state, c, c.edu.focus, policy.feeCap);
      if (!selected) continue;
      applyEducationOption(c, selected);
      record.instruction = 'policy';
      record.instructionChoice = selected.id;
      changed.push({ c:c, dimension:'instruction', option:selected });
      policyInstructionNotice(state, c, selected);
    }
    return changed;
  };

  FB.setEducationPolicy = function (state, value) {
    state.player.educationPolicy = educationPolicyDefaults(value);
    const policy = FB.ensureEducationPolicy(state);
    if (policy.instructionMode !== 'best') {
      for (const id in state.chars) {
        const record = educationPolicyRecord(state.chars[id], false);
        if (record && record.instruction === 'waiting') {
          delete record.instruction;
          delete record.instructionChoice;
        }
      }
    }
    FB.applyEducationPolicy(state);
    return policy;
  };

  FB.followEducationPolicy = function (state, c, dimension) {
    if (!c || (dimension !== 'focus' && dimension !== 'instruction')) return false;
    FB.setProtected(state, 'educationCharacter', c.id, false);
    FB.ensureEducationPolicy(state);
    const record = educationPolicyRecord(c, true);
    if (dimension === 'focus') {
      c.edu.focus = null;
      delete record.focus;
    } else {
      c.edu.school = null;
      c.edu.tutorId = null;
      delete c.edu.schoolUnpaid;
      delete record.instruction;
      delete record.instructionChoice;
    }
    const ids = {};
    ids[c.id] = 1;
    const dimensions = { focus:false, instruction:false };
    dimensions[dimension] = true;
    FB.applyEducationPolicy(state, { ids:ids, dimensions:dimensions });
    return true;
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
     retries next season. Institutions also keep a per-school term ledger for
     annual risks and stories; switching arrangements never erases it. */
  FB.educationSeason = function (state) {
    const B = FBDATA.balance;
    const base = B.educationBaseChance === undefined ? 0.18 : B.educationBaseChance;
    FB.applyEducationPolicy(state);
    for (const c of FB.educationStudents(state)) {
      if (!c.edu || !c.edu.focus) continue;
      const id = FB.schoolingId(state, c);
      if (c.edu.tutorId && !FB.educationTutor(state, c, true)) continue;
      const activeSchool = id && FB.schoolingAvailable(state, c, id);
      const chance = FB.educationInstructionChance(state, c);
      const cost = FB.schoolingCost(state, c);
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
      if (chance > base) {
        c.edu.lessonBoost = (c.edu.lessonBoost || 0) + (chance - base) / 4;
      }
      if (activeSchool) {
        if (!c.edu.schoolTerms || typeof c.edu.schoolTerms !== 'object' ||
            Array.isArray(c.edu.schoolTerms)) c.edu.schoolTerms = {};
        c.edu.schoolTerms[id] = Math.min(4, Math.max(0,
          Math.floor(Number(c.edu.schoolTerms[id]) || 0)) + 1);
      }
    }
  };

  function schoolAnnualEventList(def) {
    if (!def || !def.annualEvents) return [];
    const events = Array.isArray(def.annualEvents) ?
      def.annualEvents.slice() : [def.annualEvents];
    return events.filter(function (id) {
      return typeof id === 'string' && !!id;
    });
  }

  function weightedSchoolStory(entries, total) {
    let roll = FB.rng() * total;
    for (let i = 0; i < entries.length; i++) {
      roll -= entries[i].terms;
      if (roll < 0) return entries[i];
    }
    return entries[entries.length - 1] || null;
  }

  /* Consume completed institutional terms before ordinary yearly education
     and coming-of-age rewards. annualMortality is the full four-term risk;
     annualEvents supplies queued event ids. Missing ledgers in old saves are
     empty, and consumed ledgers reset without a migration. */
  FB.schoolingYear = function (state) {
    const snapshots = [];
    const playerId = state.player.charId;
    for (const id in state.chars) {
      const c = state.chars[id];
      if (!c || !c.edu || !c.edu.schoolTerms ||
          typeof c.edu.schoolTerms !== 'object' || Array.isArray(c.edu.schoolTerms)) continue;
      const schools = [];
      for (const schoolId in c.edu.schoolTerms) {
        const terms = Math.min(4, Math.max(0,
          Math.floor(Number(c.edu.schoolTerms[schoolId]) || 0)));
        if (terms && FBDATA.schooling[schoolId]) {
          schools.push({ id:schoolId, terms:terms, def:FBDATA.schooling[schoolId] });
        }
      }
      c.edu.schoolTerms = {};
      if (schools.length && !c.dead) snapshots.push({ c:c, schools:schools });
    }
    snapshots.sort(function (a, b) {
      if (a.c.id === playerId) return -1;
      if (b.c.id === playerId) return 1;
      return String(a.c.id).localeCompare(String(b.c.id));
    });

    const storyEntries = [];
    for (let i = 0; i < snapshots.length; i++) {
      const entry = snapshots[i];
      let died = false;
      for (let j = 0; j < entry.schools.length; j++) {
        const school = entry.schools[j];
        const annualMortality = Math.min(1,
          Math.max(0, Number(school.def.annualMortality) || 0));
        if (annualMortality &&
            FB.chance(Math.min(1, annualMortality * school.terms / 4))) {
          const age = FB.ageOf(entry.c, state.date.year);
          if (entry.c.id === playerId) {
            FB.game.die(FB.msg('legend.death.academy',
              '{name} dies in {year} AD, aged {age} — the rigors of {school} prove fatal.',
              {
                name:entry.c.name, year:state.date.year, age:age,
                school:FB.dataParam('schooling', school.id)
              }));
            return false;
          }
          FB.killChar(state, entry.c);
          FB.news(state, FB.msg('news.education.academy_death',
            '🕯 {name} dies after the rigors of {school}, aged {age}.', {
              name:entry.c.name, age:age,
              school:FB.dataParam('schooling', school.id)
            }));
          died = true;
          break;
        }
      }
      if (died) continue;
      for (let j = 0; j < entry.schools.length; j++) {
        const school = entry.schools[j];
        const events = schoolAnnualEventList(school.def);
        if (!events.length) continue;
        storyEntries.push({
          c:entry.c, schoolId:school.id, terms:school.terms, events:events
        });
      }
    }

    return { entries:storyEntries, queueIndex:(state.eventQueue || []).length };
  };

  /* Queue the story only after the rest of yearly mortality has run, so an
     ordinary death cannot leave a decision pointing at a dead student. */
  FB.schoolingYearEvents = function (state, annual) {
    if (!annual || !annual.entries) return false;
    const survivors = annual.entries.filter(function (entry) {
      return entry.c && !entry.c.dead;
    });
    let storyTerms = 0;
    for (let i = 0; i < survivors.length; i++) storyTerms += survivors[i].terms;
    if (storyTerms && FB.chance(Math.min(1, storyTerms / 4))) {
      const selected = weightedSchoolStory(survivors, storyTerms);
      if (selected) {
        const events = selected.events.filter(function (id) {
          return id && id !== state.schoolingLastEvent;
        });
        if (events.length) {
          const eventId = FB.pick(events);
          const item = FB.queueEvent(state, eventId, {
            studentId:selected.c.id,
            studentFocus:selected.c.edu && selected.c.edu.focus,
            schoolId:selected.schoolId
          });
          /* Preserve events already waiting before New Year, but put this
             term-ending story before coming-of-age notices queued later in
             the same annual pass. */
          const last = state.eventQueue.length - 1;
          const at = Math.max(0, Math.min(last, Number(annual.queueIndex) || 0));
          if (at < last) {
            state.eventQueue.pop();
            state.eventQueue.splice(at, 0, item);
          }
          state.schoolingLastEvent = eventId;
          return true;
        }
      }
    }
    return false;
  };

  FB.enterpriseWorkerIds = function (enterprise) {
    return enterpriseAssignedIds(enterprise);
  };

  FB.enterpriseUpgradeLevel = function (enterprise) {
    const level = Number(enterprise && enterprise.level);
    if (!isFinite(level)) return 0;
    const def = enterprise && FBDATA.enterprises[enterprise.type];
    const maximum = def && Array.isArray(def.upgrades) ? def.upgrades.length : 0;
    return Math.min(maximum, Math.max(0, Math.floor(level)));
  };

  FB.enterpriseStaffRequired = function (enterprise) {
    const def = enterprise && FBDATA.enterprises[enterprise.type];
    const upgrades = def && Array.isArray(def.upgrades) ? def.upgrades : [];
    const level = Math.min(FB.enterpriseUpgradeLevel(enterprise), upgrades.length);
    const current = level ? upgrades[level - 1] : null;
    return Math.max(1, Math.floor(Number(current && current.staff) || 1));
  };

  FB.enterpriseOperationalWorkerIds = function (state, enterprise) {
    const eligible = {};
    for (const c of FB.enterpriseWorkersFor(state, enterprise)) eligible[c.id] = 1;
    const out = [];
    for (const id of enterpriseAssignedIds(enterprise)) {
      if (!eligible[id]) continue;
      if (state.player.travel && id === state.player.charId) continue;
      out.push(id);
    }
    return out;
  };

  FB.enterpriseFullyStaffed = function (state, enterprise) {
    if (!enterprise) return false;
    return FB.enterpriseOperationalWorkerIds(state, enterprise).length >=
      FB.enterpriseStaffRequired(enterprise);
  };

  /* Enterprise laborers are named local contracts tied to one business. They
     do not consume household-office capacity and cannot be reassigned to a
     different enterprise without ending the contract. */
  FB.enterpriseLaborRecords = function (state) {
    const p = state.player;
    if (!Array.isArray(p.enterpriseLabor)) p.enterpriseLabor = [];
    const out = [], seen = {}, staffCounts = {};
    const enterprises = {};
    for (const enterprise of (p.enterprises || [])) {
      if (enterprise && enterprise.uid) enterprises[enterprise.uid] = enterprise;
    }
    for (const record of p.enterpriseLabor) {
      const c = record && state.chars[record.charId];
      const enterprise = record && enterprises[record.enterpriseUid];
      const overstaffed = enterprise &&
        (staffCounts[record.enterpriseUid] || 0) >=
          FB.enterpriseStaffRequired(enterprise);
      if (!record || !c || c.dead || !enterprise || seen[record.charId] || overstaffed) {
        if (enterprise && record && record.charId) {
          removeEnterpriseAssignedId(enterprise, record.charId);
        }
        if (c && !c.dead && !seen[record.charId] && c.role === 'laborer') {
          c.role = null;
        }
        continue;
      }
      seen[record.charId] = 1;
      staffCounts[record.enterpriseUid] = (staffCounts[record.enterpriseUid] || 0) + 1;
      record.pay = Math.max(0, Number(record.pay) || 0);
      record.unpaid = Math.max(0, Math.floor(Number(record.unpaid) || 0));
      if (!isFinite(Number(record.startedTurn))) record.startedTurn = state.turn;
      c.homeProvinceId = enterprise.provinceId;
      out.push(record);
    }
    if (out.length !== p.enterpriseLabor.length) p.enterpriseLabor = out;
    return p.enterpriseLabor;
  };

  FB.enterpriseLaborRecord = function (state, cid) {
    for (const record of FB.enterpriseLaborRecords(state)) {
      if (record.charId === cid) return record;
    }
    return null;
  };

  FB.enterpriseLaborCharacters = function (state, uid) {
    const out = [];
    for (const record of FB.enterpriseLaborRecords(state)) {
      if (uid && record.enterpriseUid !== uid) continue;
      const c = state.chars[record.charId];
      if (c && !c.dead) out.push(c);
    }
    return out;
  };

  FB.enterpriseLaborSeasonCost = function (state) {
    let total = 0;
    for (const record of FB.enterpriseLaborRecords(state)) total += record.pay || 0;
    return total;
  };

  /* Save format 3 predates enterprise instances, upgrades, and multi-worker
     staffing. Keep the load boundary fail-soft when an old or interrupted
     write leaves a non-array collection, an empty record, duplicate ids, or
     a removed definition behind. Known property survives with a canonical
     id and location; records that cannot name any enterprise are discarded. */
  function normalizeEnterpriseCollection(state) {
    const p = state.player;
    if (!Array.isArray(p.enterprises)) p.enterprises = [];
    const out = [], seen = {};
    for (const enterprise of p.enterprises) {
      if (!enterprise || typeof enterprise !== 'object' ||
          Array.isArray(enterprise) || typeof enterprise.type !== 'string' ||
          !FBDATA.enterprises[enterprise.type]) continue;
      let uid = typeof enterprise.uid === 'string' && enterprise.uid
        ? enterprise.uid : 'enterprise_' + FB.uid();
      while (seen[uid]) uid = 'enterprise_' + FB.uid();
      seen[uid] = 1;
      enterprise.uid = uid;
      if (!enterprise.provinceId || !FB.world ||
          !FB.world.byId[enterprise.provinceId]) {
        enterprise.provinceId = p.provinceId;
      }
      const settlement = Number(enterprise.settlement);
      enterprise.settlement = isFinite(settlement)
        ? Math.max(0, Math.floor(settlement)) : 0;
      const sites = FB.settlementsOf
        ? FB.settlementsOf(state, enterprise.provinceId) : [];
      if (!sites.length || enterprise.settlement >= sites.length) {
        enterprise.settlement = 0;
      }
      if (enterprise.workerIds !== undefined &&
          !Array.isArray(enterprise.workerIds)) delete enterprise.workerIds;
      out.push(enterprise);
    }
    p.enterprises = out;
    return out;
  }

  FB.enterpriseList = function (state) {
    const p = state.player;
    normalizeEnterpriseCollection(state);
    if (!p.enterpriseMigration) {
      p.enterpriseMigration = 1;
      const firstMigrated = p.enterprises.length;
      if (!Array.isArray(p.holdings)) p.holdings = [];
      const holdings = p.holdings;
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
        const workers = FB.enterpriseWorkersFor(state, p.enterprises[i]);
        for (const worker of workers) {
          if (!workerBusy(state, worker.id)) {
            FB.assignEnterprise(state, p.enterprises[i].uid, worker.id);
            break;
          }
        }
      }
    }
    FB.enterpriseLaborRecords(state);
    for (const enterprise of p.enterprises) {
      const required = FB.enterpriseStaffRequired(enterprise);
      const eligible = {};
      for (const worker of FB.enterpriseWorkersFor(state, enterprise)) {
        eligible[worker.id] = 1;
      }
      const valid = [], contracted = [], contractedIds = {};
      for (const record of p.enterpriseLabor) {
        if (record.enterpriseUid !== enterprise.uid || !eligible[record.charId]) continue;
        contracted.push(record.charId);
        contractedIds[record.charId] = 1;
      }
      for (const id of enterpriseAssignedIds(enterprise)) {
        if (eligible[id] && valid.indexOf(id) < 0 && valid.length < required) valid.push(id);
      }
      for (const id of contracted) {
        if (valid.indexOf(id) >= 0) continue;
        if (valid.length >= required) {
          for (let i = valid.length - 1; i >= 0; i--) {
            if (contractedIds[valid[i]]) continue;
            valid.splice(i, 1);
            break;
          }
        }
        if (valid.length < required) valid.push(id);
      }
      syncEnterpriseAssignedIds(enterprise, valid);
      if (!valid.length) {
        unlockEnterprise(enterprise);
        continue;
      }
      if (enterprise.workerLocked !== true) unlockEnterprise(enterprise);
    }
    const claimed = {};
    for (const enterprise of p.enterprises) {
      if (!enterprise.workerLocked) continue;
      const keep = [];
      for (const id of enterpriseAssignedIds(enterprise)) {
        if (claimed[id]) continue;
        claimed[id] = 1;
        keep.push(id);
      }
      syncEnterpriseAssignedIds(enterprise, keep);
    }
    for (const enterprise of p.enterprises) {
      if (enterprise.workerLocked) continue;
      const keep = [];
      for (const id of enterpriseAssignedIds(enterprise)) {
        if (claimed[id]) continue;
        claimed[id] = 1;
        keep.push(id);
      }
      syncEnterpriseAssignedIds(enterprise, keep);
    }
    return p.enterprises;
  };

  FB.unassignEnterpriseWorker = function (state, cid) {
    let changed = false;
    for (const enterprise of ((state.player && state.player.enterprises) || [])) {
      if (enterpriseAssignedIds(enterprise).indexOf(cid) < 0) continue;
      removeEnterpriseAssignedId(enterprise, cid);
      unlockEnterprise(enterprise);
      changed = true;
    }
    return changed;
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

  FB.enterpriseCost = function (state, type, provinceId) {
    const def = FBDATA.enterprises[type];
    let copies = 0;
    const player = state.player || {};
    for (const e of (player.enterprises || [])) if (e.type === type) copies++;
    /* Count an unmigrated legacy holding without mutating it; enterpriseList
       will canonicalize the record when a write path next needs the list. */
    for (const holding of (player.holdings || [])) {
      if (LEGACY_ENTERPRISES[holding] === type) copies++;
    }
    const raw = def.cost * Math.pow(FBDATA.balance.enterpriseRepeatCostGrowth || 1.35, copies) *
      FB.techCostFactor(state, 'enterprise');
    return FB.marketCostQuote ? FB.marketCostQuote(state, raw, def.marketBasket,
      provinceId || state.player.provinceId, 'up') : Math.round(raw);
  };

  FB.enterpriseUpgradeDef = function (enterprise, level) {
    const def = enterprise && FBDATA.enterprises[enterprise.type];
    const upgrades = def && Array.isArray(def.upgrades) ? def.upgrades : [];
    const target = level === undefined
      ? FB.enterpriseUpgradeLevel(enterprise) + 1 : Math.max(1, Math.floor(level));
    return upgrades[target - 1] || null;
  };

  FB.enterpriseUpgradeCost = function (state, enterprise) {
    const next = FB.enterpriseUpgradeDef(enterprise);
    if (!next) return 0;
    const raw = Math.max(0, Number(next.cost) || 0) *
      FB.techCostFactor(state, 'enterprise');
    const def = FBDATA.enterprises[enterprise.type];
    return FB.marketCostQuote ? FB.marketCostQuote(state, raw,
      next.marketBasket || def.marketBasket, enterprise.provinceId, 'up') :
      Math.round(raw);
  };

  FB.enterpriseUpgradeStatus = function (state, enterprise) {
    const next = FB.enterpriseUpgradeDef(enterprise);
    const level = FB.enterpriseUpgradeLevel(enterprise);
    if (!enterprise || !FBDATA.enterprises[enterprise.type]) {
      return { ready:false, code:'unknown', reason:FB.T('This enterprise is not recognized.') };
    }
    if (!next) {
      return { ready:false, code:'complete', level:level,
        reason:FB.T('This enterprise is already fully upgraded.') };
    }
    const tech = next.requiresTech
      ? FB.techRequirementStatus(state, next.requiresTech)
      : { ready:true, missing:[] };
    const cost = FB.enterpriseUpgradeCost(state, enterprise);
    if (!tech.ready) {
      return { ready:false, code:'technology', level:level, next:next, cost:cost,
        missingTech:tech.missing.slice(),
        reason:FB.techRequirementReason(state, next.requiresTech) };
    }
    if (state.player.gold + 0.0001 < cost) {
      return { ready:false, code:'funds', level:level, next:next, cost:cost,
        reason:FB.T('Not enough money: requires {money:cost}.', { cost:cost }) };
    }
    return { ready:true, code:'ready', level:level, next:next, cost:cost,
      missingTech:[] };
  };

  FB.upgradeEnterprise = function (state, uid) {
    let enterprise = null;
    for (const item of FB.enterpriseList(state)) if (item.uid === uid) enterprise = item;
    const status = enterprise && FB.enterpriseUpgradeStatus(state, enterprise);
    if (!enterprise || !status || !status.ready) return false;
    state.player.gold -= status.cost;
    enterprise.level = FB.enterpriseUpgradeLevel(enterprise) + 1;
    FB.news(state, FB.msg('news.enterprise.upgraded',
      '🏗 {enterprise} expands to {upgrade}; it now requires {staff} workers.', {
        enterprise:FB.dataParam('enterprise', enterprise.type),
        upgrade:FB.dataParam('enterprise', enterprise.type,
          'upgrades.' + (enterprise.level - 1) + '.name'),
        staff:FB.enterpriseStaffRequired(enterprise)
      }));
    return true;
  };

  FB.enterpriseUpgradeEffects = function (state, provinceId) {
    const out = {
      populationCapacity:0, famineProtection:0,
      populationCrisisProtection:0, migrationAttraction:0,
      levy:0, retinue:0, retainers:0, prestige:0
    };
    for (const enterprise of FB.enterpriseList(state)) {
      if (provinceId && enterprise.provinceId !== provinceId) continue;
      if (!FB.enterpriseFullyStaffed(state, enterprise)) continue;
      const level = FB.enterpriseUpgradeLevel(enterprise);
      for (let i = 1; i <= level; i++) {
        const upgrade = FB.enterpriseUpgradeDef(enterprise, i);
        const fx = upgrade && upgrade.fx || {};
        for (const key in out) out[key] += Number(fx[key]) || 0;
      }
    }
    return out;
  };

  FB.enterpriseUpgradeEffect = function (state, key, provinceId) {
    const effects = FB.enterpriseUpgradeEffects(state, provinceId);
    return effects[key] === undefined ? 0 : effects[key];
  };

  FB.enterpriseLaborPay = function (state, enterprise) {
    const def = enterprise && FBDATA.enterprises[enterprise.type];
    return Math.max(0, Number(def && def.laborPay) || 1);
  };

  FB.canHireEnterpriseWorker = function (state, uid) {
    let enterprise = null;
    for (const item of FB.enterpriseList(state)) if (item.uid === uid) enterprise = item;
    if (!enterprise) return FB.T('This enterprise is not recognized.');
    if (!FB.world.byId[enterprise.provinceId]) {
      return FB.T('This enterprise no longer has a valid local labor market.');
    }
    if (enterpriseAssignedIds(enterprise).length >=
        FB.enterpriseStaffRequired(enterprise)) {
      return FB.T('Every staffing position is already filled.');
    }
    const pay = FB.enterpriseLaborPay(state, enterprise);
    if (state.player.gold + 0.0001 < pay) {
      return FB.T('The first seasonal wage requires {money:pay}.', { pay:pay });
    }
    return true;
  };

  FB.hireEnterpriseWorker = function (state, uid) {
    if (FB.canHireEnterpriseWorker(state, uid) !== true) return false;
    let enterprise = null;
    for (const item of FB.enterpriseList(state)) if (item.uid === uid) enterprise = item;
    if (!enterprise) return false;
    const def = FBDATA.enterprises[enterprise.type];
    const province = FB.world.byId[enterprise.provinceId];
    const c = FB.makeCharacter(state, {
      culture:province.culture, religion:province.religion,
      born:state.date.year - FB.ri(20, 44), role:'laborer',
      station:Math.min(2, state.player.tier), quality:1,
      homeProvinceId:enterprise.provinceId
    });
    FB.setCareer(state, c, def.profession, 'journeyman');
    const career = FB.careerOf(state, c);
    if (def.guildRank && career) career.guildRank = def.guildRank;
    c.homeProvinceId = enterprise.provinceId;
    const pay = FB.enterpriseLaborPay(state, enterprise);
    state.player.gold -= pay;
    FB.enterpriseLaborRecords(state).push({
      charId:c.id, enterpriseUid:uid, pay:pay,
      startedTurn:state.turn, unpaid:0
    });
    if (!FB.setEnterpriseWorker(state, uid, c.id, true)) {
      FB.enterpriseLaborRecords(state).pop();
      state.player.gold += pay;
      return false;
    }
    FB.news(state, FB.msg('news.enterprise.worker_hired',
      '🧑‍🌾 {name} joins {enterprise}; the first seasonal wage is paid.', {
        name:c.name, enterprise:FB.dataParam('enterprise', enterprise.type)
      }));
    return c;
  };

  FB.removeEnterpriseWorker = function (state, cid, reason) {
    const records = FB.enterpriseLaborRecords(state);
    let record = null;
    for (let i = records.length - 1; i >= 0; i--) {
      if (records[i].charId !== cid) continue;
      record = records[i];
      records.splice(i, 1);
    }
    if (!record) return false;
    FB.unassignEnterpriseWorker(state, cid);
    const c = state.chars[cid];
    if (c && c.role === 'laborer') c.role = null;
    if (reason === 'dismissed' && c) {
      FB.news(state, FB.msg('news.enterprise.worker_dismissed',
        '🧑‍🌾 {name} leaves the enterprise payroll.', { name:c.name }));
    } else if (reason === 'unpaid' && c) {
      FB.news(state, FB.msg('news.enterprise.worker_unpaid',
        '🪙 Two unpaid seasons drive {name} from the enterprise.', { name:c.name }));
    }
    return true;
  };

  FB.enterpriseLaborSeason = function (state) {
    const records = FB.enterpriseLaborRecords(state).slice();
    for (const record of records) {
      const pay = record.pay || 0;
      if (state.player.gold + 0.0001 >= pay) {
        state.player.gold -= pay;
        record.unpaid = 0;
      } else {
        record.unpaid = (record.unpaid || 0) + 1;
        if (record.unpaid >= 2) FB.removeEnterpriseWorker(state, record.charId, 'unpaid');
      }
    }
  };

  FB.enterpriseUpgradeSeason = function (state) {
    let prestige = 0;
    for (const enterprise of FB.enterpriseList(state)) {
      if (!FB.enterpriseFullyStaffed(state, enterprise)) continue;
      const level = FB.enterpriseUpgradeLevel(enterprise);
      let applied = Math.max(0, Math.floor(Number(enterprise.devAppliedLevel) || 0));
      while (applied < level) {
        const upgrade = FB.enterpriseUpgradeDef(enterprise, applied + 1);
        const dev = Math.max(0, Number(upgrade && upgrade.dev) || 0);
        if (dev && FB.changeCountyDevelopment) {
          FB.changeCountyDevelopment(state, enterprise.provinceId, dev,
            'enterprise_upgrade');
        }
        applied++;
      }
      if (applied) enterprise.devAppliedLevel = applied;
    }
    prestige = FB.enterpriseUpgradeEffect(state, 'prestige');
    state.player.prestige += prestige;
    return { prestige:prestige };
  };

  FB.enterpriseWorkers = function (state, type) {
    const def = FBDATA.enterprises[type];
    const out = [], seen = {};
    if (!def) return out;
    const candidates = FB.householdWorkers(state).concat(
      FB.enterpriseLaborCharacters(state));
    for (const c of candidates) {
      if (!c || seen[c.id]) continue;
      seen[c.id] = 1;
      if (c.id === state.player.charId && state.player.tier >= 3) continue;
      if (FB.familyOfficeRecord && FB.familyOfficeRecord(state, c.id)) continue;
      const age = FB.ageOf(c, state.date.year);
      const career = FB.careerOf(state, c);
      if (age < 16 || !career || career.profession !== def.profession) continue;
      if (def.guildRank && (GUILD_ORDER[career.guildRank] || 0) <
        (GUILD_ORDER[def.guildRank] || 0)) continue;
      out.push(c);
    }
    return out;
  };

  FB.enterpriseWorkersFor = function (state, enterprise) {
    if (!enterprise) return [];
    return FB.enterpriseWorkers(state, enterprise.type).filter(function (c) {
      const labor = FB.enterpriseLaborRecord(state, c.id);
      return (!labor || labor.enterpriseUid === enterprise.uid) &&
        FB.characterResidence(state, c) === enterprise.provinceId;
    });
  };

  function enterpriseDefinitionName(state, type, def) {
    return def ? FB.dataText(state, state.player.charId, 'enterprise', type,
      def, 'name', {}) : type;
  }

  function enterpriseCareerName(state, profession) {
    const def = FBDATA.careers[profession];
    return def ? FB.dataText(state, state.player.charId, 'career', profession,
      def, 'name', {}) : profession;
  }

  function enterpriseTerrainName(id) {
    return FB.terrainName ? FB.terrainName(id) : String(id || '');
  }

  function enterpriseStaffingBlock(state, enterprise, def) {
    const province = FB.world.byId[enterprise.provinceId];
    const home = FB.world.byId[state.player.provinceId];
    if (enterprise.provinceId !== state.player.provinceId) {
      return {
        code:'remote',
        reason:FB.T('No eligible household worker lives in {province}.', {
          province:province ? province.name : FB.T('this county')
        }),
        guidance:FB.T(
          'Only a resident household worker can operate it. Move the household back to this county or leave the enterprise idle.')
      };
    }
    const residents = [];
    for (const c of FB.householdWorkers(state)) {
      if (c.id === state.player.charId && state.player.tier >= 3) continue;
      if (FB.familyOfficeRecord && FB.familyOfficeRecord(state, c.id)) continue;
      if (FB.ageOf(c, state.date.year) < 16 ||
          FB.characterResidence(state, c) !== enterprise.provinceId) continue;
      const career = FB.careerOf(state, c);
      if (career && career.profession === def.profession) residents.push(c);
    }
    const profession = enterpriseCareerName(state, def.profession);
    if (def.guildRank && residents.length) {
      const rank = FB.guildTitle({ guildRank:def.guildRank });
      return {
        code:'guild_rank',
        reason:FB.T('A resident {profession} must hold {rank} rank.', {
          profession:profession, rank:rank
        }),
        guidance:FB.T(
          'Advance an eligible household worker through the guild, then assign that worker here.')
      };
    }
    if (home && province && home.id === province.id) {
      return {
        code:'profession',
        reason:FB.T(
          'No adult resident household member is eligible for {profession} work.', {
          profession:profession
        }),
        guidance:FB.T(
          'Assign or train an eligible household member in this occupation, then return to choose that worker.')
      };
    }
    return {
      code:'no_resident_worker',
      reason:FB.T('No eligible household worker resides in this county.'),
      guidance:FB.T(
        'Only an adult resident with the required occupation and guild rank can operate this enterprise.')
    };
  }

  /* One authoritative, read-only explanation for an owned enterprise. UI
     surfaces may differ, but they must not independently guess why the
     property is staffed, idle, or blocked. */
  FB.enterpriseStaffingStatus = function (state, enterprise) {
    const def = enterprise && FBDATA.enterprises[enterprise.type];
    if (!state || !state.player || !enterprise || !def) {
      return {
        state:'blocked', staffed:false, blocked:true, eligibleWorkers:[],
        currentWorker:null, code:'unknown',
        reason:FB.T('This enterprise is not recognized.'),
        guidance:FB.T('Leave it idle until its definition is available again.')
      };
    }
    const eligible = FB.enterpriseWorkersFor(state, enterprise);
    const eligibleIds = {};
    for (const candidate of eligible) eligibleIds[candidate.id] = 1;
    const currentWorkers = [];
    for (const id of enterpriseAssignedIds(enterprise)) {
      const c = state.chars[id];
      if (c && !c.dead && eligibleIds[id]) currentWorkers.push(c);
    }
    const required = FB.enterpriseStaffRequired(enterprise);
    if (currentWorkers.length >= required) {
      return {
        state:'staffed', staffed:true, blocked:false,
        eligibleWorkers:eligible, currentWorker:currentWorkers[0] || null,
        currentWorkers:currentWorkers, assignedCount:currentWorkers.length,
        requiredCount:required, code:'staffed',
        reason:required === 1
          ? FB.T('Worked by {name}.', { name:currentWorkers[0].name })
          : FB.T('Fully staffed by {count} workers.', { count:currentWorkers.length }),
        guidance:''
      };
    }
    if (currentWorkers.length) {
      return {
        state:'idle', staffed:false, blocked:false,
        eligibleWorkers:eligible, currentWorker:currentWorkers[0] || null,
        currentWorkers:currentWorkers, assignedCount:currentWorkers.length,
        requiredCount:required, code:'partial_staffing',
        reason:FB.T('{assigned} of {required} staffing positions are filled.', {
          assigned:currentWorkers.length, required:required
        }),
        guidance:FB.T(
          'Assign or hire enough qualified workers to activate this enterprise and its upgrades.')
      };
    }
    if (eligible.length) {
      let unassigned = false;
      for (const candidate of eligible) {
        if (!workerBusy(state, candidate.id, enterprise.uid)) {
          unassigned = true;
          break;
        }
      }
      return {
        state:'idle', staffed:false, blocked:false,
        eligibleWorkers:eligible, currentWorker:null, currentWorkers:[],
        assignedCount:0, requiredCount:required,
        code:unassigned ? 'worker_available' : 'worker_reassignment',
        reason:unassigned
            ? FB.T('Eligible resident workers are available.')
            : FB.T(
              'Eligible workers exist, but each currently works another enterprise.'),
        guidance:unassigned
          ? FB.T('Choose workers below or hire local labor to fill every staffing position.')
          : FB.T(
            'Reassign workers below or hire local labor to fill every staffing position.')
      };
    }
    const block = enterpriseStaffingBlock(state, enterprise, def);
    return {
      state:'idle', staffed:false, blocked:false,
      eligibleWorkers:eligible, currentWorker:null, currentWorkers:[],
      assignedCount:0, requiredCount:required, code:block.code,
      reason:block.reason,
      guidance:block.guidance + ' ' + FB.T(
        'You may instead hire qualified local labor from this enterprise manager.')
    };
  };

  /* Purchase status deliberately reports every simultaneous blocker. The
     first entry is the compact reason; the complete list belongs in the
     requirements sheet. opts.ignoreTech is reserved for a grandfathered
     auction lot and opts.checkFunds=false for compatibility catalogues. */
  FB.enterprisePurchaseStatus = function (state, type, provinceId, settlement, opts) {
    opts = opts || {};
    const def = FBDATA.enterprises[type];
    const blockers = [];
    const warnings = [];
    const p = state && state.player;
    const pr = p && FB.world.byId[provinceId];
    settlement = Math.max(0, Math.floor(Number(settlement) || 0));
    const site = pr && FB.settlementsOf(state, provinceId)[settlement];
    if (!def) {
      blockers.push({
        code:'unknown', reason:FB.T('This enterprise is not recognized.')
      });
    }
    if (!p || !pr || !site) {
      blockers.push({
        code:'invalid_site', reason:FB.T('This settlement is not available.')
      });
    }
    const cost = def
      ? (opts.price === undefined
        ? FB.enterpriseCost(state, type, provinceId)
        : Math.max(0, Number(opts.price) || 0))
      : 0;
    let occupied = false;
    if (def && p) {
      for (const enterprise of (p.enterprises || [])) {
        if (enterprise.type === type && enterprise.provinceId === provinceId &&
            enterprise.settlement === settlement) {
          occupied = true;
          break;
        }
      }
      if (occupied) {
        blockers.push({
          code:'occupied',
          reason:FB.T('One {enterprise} already stands in this settlement.', {
            enterprise:enterpriseDefinitionName(state, type, def)
          })
        });
      }
    }
    if (def && p && pr) {
      const currentDevelopment = state.dev[provinceId] || 1;
      if (def.devMin && currentDevelopment < def.devMin) {
        blockers.push({
          code:'development', current:currentDevelopment, required:def.devMin,
          reason:FB.T(
            'Needs county development {required}; currently {current}.', {
              required:def.devMin, current:currentDevelopment
            })
        });
      }
      if (def.coastal && !pr.coastal) {
        blockers.push({
          code:'coastal',
          reason:FB.T('Only a coastal county can support this enterprise.')
        });
      }
      if (def.terrains && def.terrains.indexOf(pr.terrain) < 0) {
        const allowed = def.terrains.map(function (id) {
          return enterpriseTerrainName(id);
        });
        blockers.push({
          code:'terrain', current:pr.terrain, allowed:def.terrains.slice(),
          reason:FB.T('Requires {terrains}; this county is {terrain}.', {
            terrains:allowed.join(', '), terrain:enterpriseTerrainName(pr.terrain)
          })
        });
      }
    }
    const tech = def && def.requiresTech
      ? FB.techRequirementStatus(state, def.requiresTech)
      : { ready:true, requirements:[], missing:[] };
    if (def && !tech.ready && !opts.ignoreTech) {
      blockers.push({
        code:'technology', techIds:tech.missing.slice(),
        reason:FB.techRequirementReason(state, def.requiresTech)
      });
    }
    const funds = p ? Number(p.gold) || 0 : 0;
    const shortfall = Math.max(0, cost - funds);
    if (def && p && opts.checkFunds !== false && shortfall > 0.000001) {
      blockers.push({
        code:'funds', cost:cost, current:funds, shortfall:shortfall,
        reason:FB.T(
          'Costs {money:cost}; you have {money:current} ({money:shortfall} short).', {
            cost:cost, current:funds, shortfall:shortfall
          })
      });
    }
    const workers = def && p && pr && site ? FB.enterpriseWorkersFor(state, {
      type:type, provinceId:provinceId, settlement:settlement
    }) : [];
    if (def && pr && site && !workers.length) {
      const staffing = FB.enterpriseStaffingStatus(state, {
        type:type, provinceId:provinceId, settlement:settlement,
        workerId:null
      });
      warnings.push({
        code:'no_worker',
        reason:FB.T(
          '{reason} You can still buy it, but it will stand idle.', {
            reason:staffing.reason
          }),
        guidance:staffing.guidance
      });
    }
    return {
      id:type, def:def || null, provinceId:provinceId, settlement:settlement,
      site:site || null, cost:cost, funds:funds, shortfall:shortfall,
      workers:workers, techLocked:!tech.ready, missingTech:tech.missing.slice(),
      occupied:occupied, blockers:blockers, warnings:warnings,
      primary:blockers[0] || null, ready:blockers.length === 0
    };
  };

  FB.enterpriseCatalogue = function (state, provinceId, settlement) {
    const rows = [];
    let index = 0;
    for (const id in FBDATA.enterprises) {
      const status = FB.enterprisePurchaseStatus(
        state, id, provinceId, settlement);
      status.index = index++;
      rows.push(status);
    }
    rows.sort(function (a, b) {
      return Number(b.ready) - Number(a.ready) || a.index - b.index;
    });
    return rows;
  };

  FB.enterpriseRelocationImpact = function (state, destinationId) {
    const rows = [];
    if (!state || !state.player || !destinationId) {
      return { destinationId:destinationId || null, rows:rows, count:0 };
    }
    for (const enterprise of (state.player.enterprises || [])) {
      if (enterprise.provinceId === destinationId) continue;
      for (const id of enterpriseAssignedIds(enterprise)) {
        const worker = state.chars[id];
        if (!worker || worker.dead || FB.enterpriseLaborRecord(state, worker.id) ||
            FB.characterResidence(state, worker) !== enterprise.provinceId) {
          continue;
        }
        let eligible = false;
        for (const candidate of FB.enterpriseWorkers(state, enterprise.type)) {
          if (candidate.id === worker.id) {
            eligible = true;
            break;
          }
        }
        if (eligible) rows.push({ enterprise:enterprise, worker:worker });
      }
    }
    return { destinationId:destinationId, rows:rows, count:rows.length };
  };

  /* Province is explicit for remote acquisitions such as an auctioned
     business. Keep the old (state, settlement, includeTechLocked) signature
     for existing screens and mods. */
  FB.enterpriseAvailable = function (state, provinceId, settlement, includeTechLocked) {
    const p = state.player;
    if (typeof provinceId !== 'string') {
      includeTechLocked = settlement;
      settlement = provinceId;
      provinceId = p.provinceId;
    }
    settlement = Math.max(0, Math.floor(Number(settlement) || 0));
    const pr = FB.world.byId[provinceId];
    if (!pr || !FB.settlementsOf(state, provinceId)[settlement]) return [];
    const out = [];
    for (const id in FBDATA.enterprises) {
      const status = FB.enterprisePurchaseStatus(state, id, provinceId,
        settlement, {
          ignoreTech:!!includeTechLocked,
          checkFunds:false
        });
      if (!status.ready) continue;
      out.push({
        id:id, def:status.def, cost:status.cost,
        workers:status.workers, techLocked:status.techLocked
      });
    }
    return out;
  };

  FB.acquireEnterprise = function (state, type, provinceId, settlement, opts) {
    opts = opts || {};
    if (typeof provinceId !== 'string') {
      opts = settlement || {};
      settlement = provinceId;
      provinceId = state.player.provinceId;
    }
    const auction = opts.auction;
    const auctionLot = auction && auction.lot;
    const grandfatheredAuction = !!(auction &&
      state.player.auction === auction && auction.status === 'open' &&
      auctionLot && auctionLot.kind === 'enterprise' &&
      auctionLot.type === type && auctionLot.provinceId === provinceId &&
      auctionLot.settlement === settlement);
    const status = FB.enterprisePurchaseStatus(state, type, provinceId,
      settlement, {
        ignoreTech:grandfatheredAuction,
        price:opts.price
      });
    const price = status.cost;
    if (!status.ready) return false;
    state.player.gold -= price;
    const e = {
      uid:'enterprise_' + FB.uid(), type:type, provinceId:provinceId,
      settlement:settlement, workerId:null
    };
    FB.enterpriseList(state).push(e);
    for (const worker of status.workers) {
      if (!workerBusy(state, worker.id)) {
        FB.assignEnterprise(state, e.uid, worker.id);
        break;
      }
    }
    if (opts.notice !== false) {
      FB.news(state, FB.msg('news.enterprise.bought',
        '🏪 The household acquires {enterprise}.', {
          enterprise:FB.dataParam('enterprise', type)
        }));
    }
    return e;
  };

  FB.buyEnterprise = function (state, type, settlement) {
    return FB.acquireEnterprise(state, type, state.player.provinceId, settlement);
  };

  /* ---------- bounded market auctions ----------
     An auction is one household record, not a market simulation. Its lot and
     rival ceiling are fixed at opening, so reloads never reroll a bidder or
     create a second object. The UI may reopen the record until it resolves. */
  function auctionNumber(key, fallback) {
    const value = Number(FBDATA.balance && FBDATA.balance[key]);
    return isFinite(value) ? value : fallback;
  }

  function auctionMaxRounds() {
    return Math.max(1, Math.floor(auctionNumber('auctionMaxBidRounds', 3)));
  }

  function auctionCooldownDays() {
    return Math.max(0, Math.floor(auctionNumber('auctionCooldownDays', 360)));
  }

  FB.auctionCooldownRemaining = function (state) {
    const cooldowns = state && state.player && state.player.cooldowns || {};
    const last = cooldowns.attend_auction;
    if (last === undefined) return 0;
    return Math.max(0, auctionCooldownDays() - (state.turn - last));
  };

  FB.auctionLotTypeStatus = function (state, id) {
    const def = FBDATA.auctionLotTypes && FBDATA.auctionLotTypes[id];
    if (!def) return { ready:false, requirements:[], missing:[] };
    return FB.techRequirementStatus(state, def.requiresTech);
  };

  function auctionVenue(state, pid, settlement) {
    const provinceId = pid || state.player.provinceId;
    const index = Math.max(0, Math.floor(Number(settlement) || 0));
    const site = FB.settlementsOf(state, provinceId)[index];
    if (!site || (site.kind !== 'town' && site.kind !== 'city')) return null;
    return { provinceId:provinceId, settlement:index, name:site.name, kind:site.kind };
  }

  FB.auctionVenues = function (state) {
    const out = [];
    if (!state || !state.player) return out;
    const sites = FB.settlementsOf(state, state.player.provinceId);
    for (let i = 0; i < sites.length; i++) {
      if (sites[i].kind !== 'town' && sites[i].kind !== 'city') continue;
      out.push({
        provinceId:state.player.provinceId,
        settlement:i,
        name:sites[i].name,
        kind:sites[i].kind
      });
    }
    return out;
  };

  function auctionItemCandidates(state) {
    const out = [];
    if (!FB.auctionLotTypeStatus(state, 'item').ready) return out;
    if (!FBDATA.items || !FB.itemDefinition || !FB.itemOwner) return out;
    for (const id in FBDATA.items) {
      const info = FB.itemDefinition(id);
      if (!info || (info.def.rarity !== 'fine' && info.def.rarity !== 'famed')) {
        continue;
      }
      /* Event-only curios remain tied to the story that introduces them;
         ordinary Fine/Famed definitions still create a temporary auction
         instance when a mod supplies one. */
      if (info.def.eventOnly) continue;
      if (info.unique && FB.itemOwner(state, id)) continue;
      out.push({ id:id, ordinary:info.ordinary });
    }
    return out;
  }

  function auctionEnterpriseCandidates(state, venue) {
    if (!FB.auctionLotTypeStatus(state, 'enterprise').ready) return [];
    const available = FB.enterpriseAvailable(state, venue.provinceId,
      venue.settlement, false);
    return available.filter(function (entry) { return !entry.techLocked; });
  }

  function auctionClaimCandidates(state) {
    if (!FB.auctionLotTypeStatus(state, 'claim').ready) return [];
    if (FB.fabricatedClaimOf && FB.fabricatedClaimOf(state)) return [];
    return FB.claimCandidates ? FB.claimCandidates(state) : [];
  }

  function auctionWeightedLotType(state, venue) {
    const types = [];
    const items = auctionItemCandidates(state);
    const enterprises = auctionEnterpriseCandidates(state, venue);
    const claims = auctionClaimCandidates(state);
    const definitions = FBDATA.auctionLotTypes || {};
    function add(id, entries) {
      const definition = definitions[id] || {};
      const weight = Math.max(0, Number(definition.weight) || 0);
      if (entries.length && weight) types.push({ id:id, entries:entries, weight:weight });
    }
    add('item', items);
    add('enterprise', enterprises);
    add('claim', claims);
    if (!types.length) return null;
    let total = 0;
    for (let i = 0; i < types.length; i++) total += types[i].weight;
    let roll = FB.rng() * total;
    for (let i = 0; i < types.length; i++) {
      roll -= types[i].weight;
      if (roll <= 0) return types[i];
    }
    return types[types.length - 1];
  }

  function makeAuctionLot(state, venue) {
    const picked = auctionWeightedLotType(state, venue);
    if (!picked) return null;
    const entry = FB.pick(picked.entries);
    if (picked.id === 'item') {
      let ref = entry.id;
      let temporary = false;
      if (entry.ordinary) {
        ref = FB.createItemInstance(state, entry.id, { quality:'well' });
        temporary = !!ref;
      }
      const item = ref && FB.resolveItemReadOnly(state, ref);
      if (!item) return null;
      return {
        kind:'item', ref:ref, defId:item.defId, temporary:temporary,
        value:Math.max(1, Number(item.value) || 1)
      };
    }
    if (picked.id === 'enterprise') {
      return {
        kind:'enterprise', type:entry.id, provinceId:venue.provinceId,
        settlement:venue.settlement, value:Math.max(1, Number(entry.cost) || 1)
      };
    }
    return {
      kind:'claim', pid:entry,
      value:Math.max(1, auctionNumber('auctionCountyClaimValue', 100))
    };
  }

  function discardAuction(state, auction) {
    const lot = auction && auction.lot;
    if (lot && lot.kind === 'item' && lot.temporary && lot.ref &&
        state.itemInstances && !FB.itemOwner(state, lot.ref)) {
      delete state.itemInstances[lot.ref];
    }
    if (state.player) state.player.auction = null;
  }

  function auctionLotValid(state, auction) {
    if (!auction || !auction.lot || !auctionVenue(state,
        auction.venue && auction.venue.provinceId,
        auction.venue && auction.venue.settlement)) return false;
    const lot = auction.lot;
    if (lot.kind === 'item') {
      const item = lot.ref && FB.resolveItemReadOnly &&
        FB.resolveItemReadOnly(state, lot.ref);
      return !!(item && !FB.itemOwner(state, lot.ref));
    }
    if (lot.kind === 'enterprise') {
      if (lot.provinceId !== auction.venue.provinceId ||
          lot.settlement !== auction.venue.settlement) return false;
      const available = FB.enterpriseAvailable(state, lot.provinceId,
        lot.settlement, true);
      for (let i = 0; i < available.length; i++) {
        if (available[i].id === lot.type) return true;
      }
      return false;
    }
    if (lot.kind === 'claim') {
      return !FB.fabricatedClaimOf(state) && FB.claimCandidates &&
        FB.claimCandidates(state).indexOf(lot.pid) >= 0;
    }
    return false;
  }

  FB.ensureAuction = function (state) {
    const p = state && state.player;
    const auction = p && p.auction;
    if (!auction) return null;
    const opening = Math.max(1, Math.floor(Number(auction.openingBid) || 0));
    const increment = Math.max(1, Math.floor(Number(auction.bidIncrement) || 0));
    const rivalMaximum = Math.max(opening, Math.floor(Number(auction.rivalMaximum) || 0));
    if (auction.status !== 'open' || !auctionLotValid(state, auction)) {
      discardAuction(state, auction);
      return null;
    }
    auction.openingBid = opening;
    auction.bidIncrement = increment;
    auction.rivalMaximum = rivalMaximum;
    auction.bidCount = FB.clamp(Math.floor(Number(auction.bidCount) || 0), 0,
      auctionMaxRounds());
    auction.currentBid = Math.max(opening,
      Math.floor(Number(auction.currentBid) || opening));
    auction.venue = auctionVenue(state, auction.venue.provinceId,
      auction.venue.settlement);
    return auction;
  };

  FB.auctionOf = function (state) {
    return FB.ensureAuction(state);
  };

  FB.auctionLotLabel = function (state, auction) {
    const lot = auction && auction.lot;
    if (!lot) return FB.T('Unknown lot');
    if (lot.kind === 'item') {
      return FB.itemName ? FB.itemName(state, lot.ref, state.player.charId) : lot.defId;
    }
    if (lot.kind === 'enterprise') {
      const def = FBDATA.enterprises && FBDATA.enterprises[lot.type];
      return def ? FB.dataText(state, state.player.charId, 'enterprise', lot.type,
        def, 'name', {}) : lot.type;
    }
    const province = FB.world.byId[lot.pid];
    return province ? FB.T('County title right: {province}', {
      province:province.name
    }) : FB.T('County title right');
  };

  FB.auctionStatus = function (state) {
    const active = FB.ensureAuction(state);
    if (active) return { ready:false, active:active,
      reason:FB.T('Resolve the current auction first.') };
    const character = state && state.player && state.chars &&
      state.chars[state.player.charId];
    if (!character || FB.ageOf(character, state.date.year) < 16) {
      return { ready:false, active:null,
        reason:FB.T('Only an adult may attend an auction.') };
    }
    if (state.player.flags && state.player.flags.in_prison) {
      return { ready:false, active:null,
        reason:FB.T('You cannot attend an auction while imprisoned.') };
    }
    const remaining = FB.auctionCooldownRemaining(state);
    if (remaining) return { ready:false, active:null,
      cooldownRemaining:remaining,
      reason:FB.T('Ready in {days} days.', { days:remaining }) };
    const venueCandidates = FB.auctionVenues(state);
    const venues = [];
    if (!venueCandidates.length) return { ready:false, active:null,
      reason:FB.T('A town or city market is required.') };
    const items = auctionItemCandidates(state);
    const claims = auctionClaimCandidates(state);
    for (let i = 0; i < venueCandidates.length; i++) {
      const venue = venueCandidates[i];
      if (items.length ||
          auctionEnterpriseCandidates(state, venue).length || claims.length) {
        venues.push(venue);
      }
    }
    return venues.length ? { ready:true, active:null, venues:venues } : {
      ready:false, active:null,
      reason:FB.T('No valid lot is available at this market.')
    };
  };

  FB.beginAuction = function (state, venueSpec) {
    const status = FB.auctionStatus(state);
    if (!status.ready) return null;
    const venue = auctionVenue(state,
      venueSpec && venueSpec.provinceId,
      venueSpec && venueSpec.settlement);
    if (!venue) return null;
    let allowedVenue = false;
    for (let i = 0; i < status.venues.length; i++) {
      if (status.venues[i].provinceId === venue.provinceId &&
          status.venues[i].settlement === venue.settlement) {
        allowedVenue = true;
        break;
      }
    }
    if (!allowedVenue) return null;
    const lot = makeAuctionLot(state, venue);
    if (!lot) return null;
    const value = Math.max(1, Number(lot.value) || 1);
    const opening = Math.max(1, Math.ceil(value * Math.max(0.01,
      auctionNumber('auctionOpeningBidRatio', 0.60))));
    const increment = Math.max(1, Math.ceil(value * Math.max(0.01,
      auctionNumber('auctionBidIncrementRatio', 0.10))));
    const ratios = FBDATA.balance && FBDATA.balance.auctionRivalMaxRatio;
    const low = Array.isArray(ratios) ? Number(ratios[0]) : 1.10;
    const high = Array.isArray(ratios) ? Number(ratios[1]) : 1.90;
    const rivalRatio = FB.rf(isFinite(low) ? low : 1.10,
      isFinite(high) ? high : 1.90);
    const auction = {
      schema:1, status:'open', startedTurn:state.turn,
      venue:{ provinceId:venue.provinceId, settlement:venue.settlement },
      lot:lot, openingBid:opening, bidIncrement:increment,
      rivalMaximum:Math.max(opening, Math.ceil(value * Math.max(1, rivalRatio))),
      currentBid:opening, bidCount:0
    };
    state.player.cooldowns = state.player.cooldowns || {};
    state.player.cooldowns.attend_auction = state.turn;
    state.player.auction = auction;
    return auction;
  };

  FB.auctionBidOptions = function (state) {
    const auction = FB.ensureAuction(state);
    if (!auction || auction.bidCount >= auctionMaxRounds()) return [];
    const out = [];
    for (let i = 1; i <= 3; i++) {
      const amount = auction.currentBid + auction.bidIncrement * i;
      out.push({ increments:i, amount:amount,
        affordable:state.player.gold + 0.000001 >= amount });
    }
    return out;
  };

  function awardAuctionLot(state, auction, price) {
    const lot = auction.lot;
    if (state.player.gold + 0.000001 < price) return null;
    let awarded = null;
    if (lot.kind === 'item') {
      if (!FB.transferItem || !FB.transferItem(state, lot.ref, 'armory', { force:true })) {
        return null;
      }
      awarded = { kind:'item', ref:lot.ref };
    } else if (lot.kind === 'claim') {
      if (FB.fabricatedClaimOf(state) || !FB.claimCandidates ||
          FB.claimCandidates(state).indexOf(lot.pid) < 0) return null;
      state.player.fabricatedClaim = {
        pid:lot.pid, source:'auction', madeTurn:state.turn
      };
      awarded = { kind:'claim', pid:lot.pid };
    } else if (lot.kind === 'enterprise') {
      const enterprise = FB.acquireEnterprise(state, lot.type, lot.provinceId,
        lot.settlement, { price:price, notice:false, auction:auction });
      if (!enterprise) return null;
      awarded = { kind:'enterprise', uid:enterprise.uid };
      /* acquireEnterprise already charged the winning price. */
      return awarded;
    }
    state.player.gold -= price;
    return awarded;
  }

  function auctionWonMessage(state, auction, price) {
    const lot = auction.lot;
    if (lot.kind === 'item') {
      return FB.msg('news.auction.won_item',
        '⚖ You win the auction for {item} at {money:price}.', {
          item:FB.itemParam ? FB.itemParam(state, lot.ref, true) : lot.ref,
          price:price
        });
    }
    if (lot.kind === 'enterprise') {
      return FB.msg('news.auction.won_enterprise',
        '⚖ You win the auction for {enterprise} at {money:price}.', {
          enterprise:FB.dataParam('enterprise', lot.type), price:price
        });
    }
    const province = FB.world.byId[lot.pid];
    return FB.msg('news.auction.won_claim',
      '⚖ You win the county title right to {province} at {money:price}.', {
        province:province ? province.name : lot.pid, price:price
      });
  }

  FB.placeAuctionBid = function (state, increments) {
    const auction = FB.ensureAuction(state);
    increments = Math.floor(Number(increments) || 0);
    if (!auction || increments < 1 || increments > 3 ||
        auction.bidCount >= auctionMaxRounds()) return false;
    const amount = auction.currentBid + auction.bidIncrement * increments;
    if (state.player.gold + 0.000001 < amount) return false;
    auction.bidCount++;
    auction.currentBid = amount;
    if (amount >= auction.rivalMaximum) {
      const awarded = awardAuctionLot(state, auction, amount);
      if (!awarded) {
        discardAuction(state, auction);
        return { status:'cancelled' };
      }
      state.player.auction = null;
      FB.news(state, auctionWonMessage(state, auction, amount));
      return { status:'won', amount:amount, awarded:awarded };
    }
    auction.currentBid = Math.min(auction.rivalMaximum,
      amount + auction.bidIncrement);
    if (auction.bidCount >= auctionMaxRounds()) {
      const finalBid = auction.currentBid;
      discardAuction(state, auction);
      FB.news(state, FB.msg('news.auction.lost',
        '⚖ A rival carries the lot at {money:price}; your purse stays closed.', {
          price:finalBid
        }));
      return { status:'lost', amount:finalBid };
    }
    return { status:'countered', amount:auction.currentBid,
      bidCount:auction.bidCount };
  };

  FB.cancelAuction = function (state) {
    const auction = FB.ensureAuction(state);
    if (!auction) return false;
    discardAuction(state, auction);
    FB.news(state, FB.msg('news.auction.withdrawn',
      '⚖ You leave the auction before the hammer falls; your purse stays closed.', {}));
    return true;
  };

  FB.fns = FB.fns || {};
  FB.fns.auction_invitation_available = function (state) {
    const status = FB.auctionStatus(state);
    return !!(status && status.ready);
  };
  FB.fns.auction_invitation_open = function (state) {
    const status = FB.auctionStatus(state);
    if (!status || !status.ready || !status.venues || !status.venues.length) return false;
    const auction = FB.beginAuction(state, status.venues[0]);
    if (auction && FB.ui && FB.ui.deferAuctionOpen) FB.ui.deferAuctionOpen();
    else if (auction && FB.ui && FB.ui.showAuction) FB.ui.showAuction();
    return !!auction;
  };

  FB.setEnterpriseWorker = function (state, uid, cid, assigned) {
    let target = null;
    const list = FB.enterpriseList(state);
    for (const e of list) if (e.uid === uid) { target = e; break; }
    if (!target) return false;
    if (!cid && assigned !== false) {
      const preserve = enterpriseAssignedIds(target).filter(function (id) {
        const record = FB.enterpriseLaborRecord(state, id);
        return !!(record && record.enterpriseUid === uid);
      });
      syncEnterpriseAssignedIds(target, preserve);
      unlockEnterprise(target);
      return true;
    }
    if (!cid) return false;
    const labor = FB.enterpriseLaborRecord(state, cid);
    if (labor && labor.enterpriseUid !== uid) return false;
    if (assigned === false) {
      if (labor && labor.enterpriseUid === uid) return false;
      if (enterpriseAssignedIds(target).indexOf(cid) < 0) return true;
      removeEnterpriseAssignedId(target, cid);
      unlockEnterprise(target);
      return true;
    }
    let eligible = false;
    for (const c of FB.enterpriseWorkersFor(state, target)) {
      if (c.id === cid) eligible = true;
    }
    if (!eligible) return false;
    for (const e of list) {
      if (e.uid === uid || enterpriseAssignedIds(e).indexOf(cid) < 0) continue;
      removeEnterpriseAssignedId(e, cid);
      unlockEnterprise(e);
    }
    const ids = enterpriseAssignedIds(target);
    if (ids.indexOf(cid) >= 0) return true;
    const required = FB.enterpriseStaffRequired(target);
    if (ids.length >= required) {
      if (required !== 1) return false;
      const displaced = ids[0];
      if (FB.enterpriseLaborRecord(state, displaced)) return false;
      ids.length = 0;
    }
    ids.push(cid);
    syncEnterpriseAssignedIds(target, ids);
    unlockEnterprise(target);
    return true;
  };

  FB.assignEnterprise = function (state, uid, cid) {
    if (!cid) return FB.setEnterpriseWorker(state, uid, null, true);
    return FB.setEnterpriseWorker(state, uid, cid, true);
  };

  FB.setEnterpriseWorkerLock = function (state, uid, locked) {
    let target = null;
    for (const enterprise of FB.enterpriseList(state)) {
      if (enterprise.uid === uid) {
        target = enterprise;
        break;
      }
    }
    const assigned = enterpriseAssignedIds(target);
    if (!target || !assigned.length) return false;
    const eligible = {};
    for (const worker of FB.enterpriseWorkersFor(state, target)) eligible[worker.id] = 1;
    for (const id of assigned) if (!eligible[id]) {
      clearEnterpriseAssignment(target);
      return false;
    }
    if (locked) target.workerLocked = true;
    else unlockEnterprise(target);
    return true;
  };

  FB.enterpriseYield = function (state, e, chainSeen) {
    const def = FBDATA.enterprises[e.type];
    if (!def) return 0;
    const operational = FB.enterpriseOperationalWorkerIds(state, e);
    if (operational.length < FB.enterpriseStaffRequired(e)) return 0;
    const worker = state.chars[operational[0]];
    if (!worker || worker.dead) return 0;
    const career = FB.careerOf(state, worker);
    if (!career || career.profession !== def.profession) return 0;
    const careerDef = FBDATA.careers[career.profession];
    const skill = careerDef && careerDef.skill ? careerDef.skill : 'ste';
    let amount = def.yield * (0.75 + FB.skillOf(worker, skill) / 20);
    const dev = state.dev[e.provinceId] || 1;
    amount *= 0.9 + Math.min(10, dev) * 0.02;
    amount *= FB.guildIncomeMultiplier(career);
    amount *= 1 + FB.positionBonus(state, 'enterprise');
    amount *= FB.householdWorkMultiplier(state, career.profession);
    amount *= 1 + FB.guildMonopolyEnterpriseBonus(state, career.profession, e);
    const specialization = FB.careerSpecialization(state, worker);
    const enterpriseFx = specialization && specialization.fx &&
      specialization.fx.enterprise;
    if (enterpriseFx) {
      const tags = Array.isArray(enterpriseFx.tags) ? enterpriseFx.tags : [];
      const enterpriseTags = Array.isArray(def.tags) ? def.tags : [];
      let matches = false;
      for (let i = 0; i < tags.length && !matches; i++) {
        if (enterpriseTags.indexOf(tags[i]) >= 0) matches = true;
      }
      if (matches) amount *= 1 + Math.max(0, Number(enterpriseFx.bonus) || 0);
    }
    if (career.profession === 'merchant' || career.profession === 'craftsman') {
      amount *= 1 + (FB.techBonus ? FB.techBonus(state, 'trade') : 0);
    }
    amount *= 1 + enterpriseChainFactor(state, e, chainSeen || {});
    return amount;
  };

  /* A chain consumer (def.chainFrom) earns balance.enterpriseChainBonus more
     while at least one household enterprise of the input type is producing in
     the same province. The seen map breaks modded chain cycles. */
  function enterpriseChainFactor(state, e, seen) {
    const def = FBDATA.enterprises[e.type];
    if (!def || !def.chainFrom) return 0;
    const bonus = (FBDATA.balance && FBDATA.balance.enterpriseChainBonus) || 0;
    if (!bonus) return 0;
    const key = e.uid || (e.type + '@' + e.provinceId);
    if (seen[key]) return 0;
    seen[key] = true;
    for (const other of FB.enterpriseList(state)) {
      if (other === e || (e.uid && other.uid === e.uid)) continue;
      if (other.type !== def.chainFrom) continue;
      if (other.provinceId !== e.provinceId) continue;
      if (FB.enterpriseYield(state, other, seen) > 0) return bonus;
    }
    return 0;
  }

  function staffingIdCompare(a, b) {
    const aa = String(a === undefined || a === null ? '' : a);
    const bb = String(b === undefined || b === null ? '' : b);
    return aa < bb ? -1 : aa > bb ? 1 : 0;
  }

  function staffingObjectiveZero(length) {
    const out = [];
    for (let i = 0; i < length; i++) out.push(0);
    return out;
  }

  function staffingObjectiveAdd(a, b) {
    const out = [];
    for (let i = 0; i < a.length; i++) out.push(a[i] + b[i]);
    return out;
  }

  function staffingObjectiveNegate(value) {
    const out = [];
    for (let i = 0; i < value.length; i++) out.push(-value[i]);
    return out;
  }

  function staffingObjectiveCompare(a, b) {
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
    }
    return 0;
  }

  function staffingFlowEdge(graph, from, to, objective) {
    const forward = {
      to:to, reverse:graph[to].length, capacity:1, objective:objective
    };
    const backward = {
      to:from, reverse:graph[from].length, capacity:0,
      objective:staffingObjectiveNegate(objective)
    };
    graph[from].push(forward);
    graph[to].push(backward);
    return forward;
  }

  /* Successive maximum-cost augmenting paths over lexicographic objective
     vectors. The first component is thousandth-rounded yield, the second
     preserves current pairings, and one later component per sorted
     enterprise makes character-id choices stable without unsafe scalar
     weighting or RNG. */
  function enterpriseStaffingMatching(rows, workerIds, enterpriseCount) {
    const objectiveLength = 2 + enterpriseCount;
    const source = 0;
    const enterpriseStart = 1;
    const workerStart = enterpriseStart + rows.length;
    const sink = workerStart + workerIds.length;
    const graph = [];
    for (let i = 0; i <= sink; i++) graph.push([]);
    const workerNodes = {};
    for (let i = 0; i < workerIds.length; i++) {
      workerNodes[String(workerIds[i])] = workerStart + i;
      staffingFlowEdge(graph, workerStart + i, sink,
        staffingObjectiveZero(objectiveLength));
    }
    for (let i = 0; i < rows.length; i++) {
      const node = enterpriseStart + i;
      staffingFlowEdge(graph, source, node,
        staffingObjectiveZero(objectiveLength));
      rows[i].flowEdges = [];
      for (let j = 0; j < rows[i].eligible.length; j++) {
        const candidate = rows[i].eligible[j];
        const objective = staffingObjectiveZero(objectiveLength);
        objective[0] = candidate.yield;
        objective[1] = candidate.id === rows[i].currentWorkerId ? 1 : 0;
        objective[2 + rows[i].stableIndex] = workerIds.length -
          workerIds.indexOf(candidate.id);
        const edge = staffingFlowEdge(graph, node,
          workerNodes[String(candidate.id)], objective);
        rows[i].flowEdges.push({ id:candidate.id, edge:edge });
      }
      staffingFlowEdge(graph, node, sink,
        staffingObjectiveZero(objectiveLength));
    }

    for (let flow = 0; flow < rows.length; flow++) {
      const distance = [];
      const previousNode = [];
      const previousEdge = [];
      for (let i = 0; i <= sink; i++) distance.push(null);
      distance[source] = staffingObjectiveZero(objectiveLength);
      for (let pass = 0; pass < sink; pass++) {
        let changed = false;
        for (let from = 0; from <= sink; from++) {
          if (!distance[from]) continue;
          for (let edgeIndex = 0; edgeIndex < graph[from].length; edgeIndex++) {
            const edge = graph[from][edgeIndex];
            if (edge.capacity <= 0) continue;
            const next = staffingObjectiveAdd(distance[from], edge.objective);
            if (!distance[edge.to] ||
                staffingObjectiveCompare(next, distance[edge.to]) > 0) {
              distance[edge.to] = next;
              previousNode[edge.to] = from;
              previousEdge[edge.to] = edgeIndex;
              changed = true;
            }
          }
        }
        if (!changed) break;
      }
      if (!distance[sink]) break;
      let node = sink;
      while (node !== source) {
        const from = previousNode[node];
        const edge = graph[from][previousEdge[node]];
        edge.capacity -= 1;
        graph[node][edge.reverse].capacity += 1;
        node = from;
      }
    }

    const result = {};
    for (let i = 0; i < rows.length; i++) {
      result[rows[i].uid] = null;
      for (let j = 0; j < rows[i].flowEdges.length; j++) {
        if (rows[i].flowEdges[j].edge.capacity === 0) {
          result[rows[i].uid] = rows[i].flowEdges[j].id;
          break;
        }
      }
      delete rows[i].flowEdges;
    }
    return result;
  }

  function staffingCandidateYield(state, enterprise, workerId) {
    if (!workerId) return 0;
    return Math.round(FB.enterpriseYield(state, {
      type:enterprise.type,
      provinceId:enterprise.provinceId,
      settlement:enterprise.settlement,
      /* Upgrades never raise gold yield. Score the candidate as the lead
         worker on the one-position base enterprise. */
      level:0,
      workerId:workerId
    }) * 1000);
  }

  function staffingYield(state, enterprise, workerIds) {
    const ids = Array.isArray(workerIds) ? workerIds.filter(Boolean) : [];
    if (!ids.length) return 0;
    return Math.round(FB.enterpriseYield(state, {
      type:enterprise.type,
      provinceId:enterprise.provinceId,
      settlement:enterprise.settlement,
      level:FB.enterpriseUpgradeLevel(enterprise),
      workerId:ids[0],
      workerIds:ids.slice()
    }) * 1000);
  }

  function staffingIdsEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  FB.enterpriseStaffingPlan = function (state) {
    const enterprises = FB.enterpriseList(state).slice();
    enterprises.sort(function (a, b) {
      return staffingIdCompare(a.uid, b.uid);
    });
    const lockedWorkers = {};
    const protectedWorkers = {};
    const currentEnterprise = {};
    for (const enterprise of enterprises) {
      for (const id of enterpriseAssignedIds(enterprise)) {
        currentEnterprise[id] = enterprise.uid;
        if (FB.isProtected(state, 'staffingWorker', id)) {
          protectedWorkers[id] = enterprise.uid;
        }
        if (enterprise.workerLocked || protectedWorkers[id] ||
            FB.enterpriseLaborRecord(state, id)) {
          lockedWorkers[id] = enterprise.uid;
        }
      }
    }

    const matchingRows = [];
    const workerSet = {};
    const signatureRows = [];
    const eligibility = {};
    const fixedByUid = {};
    let stableSlot = 0;
    for (const enterprise of enterprises) {
      const eligible = FB.enterpriseWorkersFor(state, enterprise).slice();
      eligible.sort(function (a, b) { return staffingIdCompare(a.id, b.id); });
      const currentIds = enterpriseAssignedIds(enterprise);
      const fixed = [];
      for (const id of currentIds) if (lockedWorkers[id]) fixed.push(id);
      fixedByUid[enterprise.uid] = fixed;
      eligibility[enterprise.uid] = [];
      const signatureEligible = [];
      for (const worker of eligible) {
        const amount = staffingCandidateYield(state, enterprise, worker.id);
        eligibility[enterprise.uid].push(worker.id);
        signatureEligible.push([worker.id, amount]);
        if (!lockedWorkers[worker.id] &&
            !FB.isProtected(state, 'staffingWorker', worker.id)) {
          workerSet[worker.id] = worker.id;
        }
      }
      const required = FB.enterpriseStaffRequired(enterprise);
      signatureRows.push([
        enterprise.uid, enterprise.type, enterprise.provinceId,
        enterprise.settlement, FB.enterpriseUpgradeLevel(enterprise), required,
        currentIds, enterprise.workerLocked ? 1 : 0,
        fixed.slice(), signatureEligible
      ]);
      const movableCurrent = currentIds.filter(function (id) {
        return fixed.indexOf(id) < 0;
      });
      const openSlots = Math.max(0, required - fixed.length);
      for (let slot = 0; slot < openSlots; slot++) {
        const row = {
          uid:enterprise.uid + '#' + slot,
          enterpriseUid:enterprise.uid,
          stableIndex:stableSlot++,
          currentWorkerId:movableCurrent[slot] || null,
          eligible:[]
        };
        for (const candidate of signatureEligible) {
          if (lockedWorkers[candidate[0]] ||
              FB.isProtected(state, 'staffingWorker', candidate[0])) continue;
          row.eligible.push({ id:candidate[0], yield:candidate[1] });
        }
        matchingRows.push(row);
      }
    }
    const workerIds = [];
    for (const workerId in workerSet) workerIds.push(workerSet[workerId]);
    workerIds.sort(staffingIdCompare);
    const matching = enterpriseStaffingMatching(
      matchingRows, workerIds, matchingRows.length);
    const proposedByUid = {};
    for (const enterprise of enterprises) {
      proposedByUid[enterprise.uid] = (fixedByUid[enterprise.uid] || []).slice();
    }
    for (const row of matchingRows) {
      const matched = matching[row.uid];
      if (matched) proposedByUid[row.enterpriseUid].push(matched);
    }

    /* Slot matching preserves the exact one-worker optimizer for baseline
       enterprises. For expanded enterprises, a scattered partial staff has
       no yield or upgrade effect. Release movable workers from partial crews,
       then deterministically complete the strongest fillable crews. */
    const allocated = {};
    for (const enterprise of enterprises) {
      const proposed = proposedByUid[enterprise.uid] || [];
      if (proposed.length >= FB.enterpriseStaffRequired(enterprise)) {
        for (const id of proposed) allocated[id] = 1;
      } else {
        proposedByUid[enterprise.uid] = (fixedByUid[enterprise.uid] || []).slice();
      }
    }
    const availableWorkers = {};
    for (const id of workerIds) if (!allocated[id]) availableWorkers[id] = 1;
    while (true) {
      let best = null;
      for (const enterprise of enterprises) {
        const proposed = proposedByUid[enterprise.uid] || [];
        const required = FB.enterpriseStaffRequired(enterprise);
        const deficit = required - proposed.length;
        if (deficit <= 0) continue;
        const candidates = (eligibility[enterprise.uid] || []).filter(function (id) {
          return !!availableWorkers[id];
        });
        candidates.sort(function (a, b) {
          const ay = staffingCandidateYield(state, enterprise, a);
          const by = staffingCandidateYield(state, enterprise, b);
          const ac = currentEnterprise[a] === enterprise.uid ? 1 : 0;
          const bc = currentEnterprise[b] === enterprise.uid ? 1 : 0;
          return by - ay || bc - ac || staffingIdCompare(a, b);
        });
        if (candidates.length < deficit) continue;
        const chosen = candidates.slice(0, deficit);
        const completed = proposed.concat(chosen);
        const score = staffingYield(state, enterprise, completed);
        let kept = 0;
        for (const id of completed) {
          if (currentEnterprise[id] === enterprise.uid) kept++;
        }
        const candidate = {
          enterprise:enterprise, ids:completed, chosen:chosen,
          score:score, kept:kept
        };
        if (!best || candidate.score > best.score ||
            (candidate.score === best.score && candidate.kept > best.kept) ||
            (candidate.score === best.score && candidate.kept === best.kept &&
              staffingIdCompare(candidate.enterprise.uid, best.enterprise.uid) < 0)) {
          best = candidate;
        }
      }
      if (!best) break;
      proposedByUid[best.enterprise.uid] = best.ids;
      for (const id of best.chosen) delete availableWorkers[id];
    }

    let currentTotal = 0;
    let proposedTotal = 0;
    let changedCount = 0;
    let idleCount = 0;
    let lockedCount = 0;
    let unresolvedCount = 0;
    const rows = [];
    for (const enterprise of enterprises) {
      const currentIds = enterpriseAssignedIds(enterprise);
      const proposedIds = proposedByUid[enterprise.uid] || [];
      const required = FB.enterpriseStaffRequired(enterprise);
      const protected = currentIds.filter(function (id) {
        return !!protectedWorkers[id];
      });
      const currentYield = staffingYield(state, enterprise, currentIds);
      const proposedYield = staffingYield(state, enterprise, proposedIds);
      let proposedFromUid = null;
      for (const id of proposedIds) {
        if (currentEnterprise[id] && currentEnterprise[id] !== enterprise.uid) {
          proposedFromUid = currentEnterprise[id];
          break;
        }
      }
      let status = 'unchanged';
      let unresolvedReason = null;
      if (proposedIds.length < required) {
        status = 'unresolved';
        unresolvedCount++;
        const eligibleIds = eligibility[enterprise.uid] || [];
        if (!eligibleIds.length) unresolvedReason = 'no_eligible_worker';
        else {
          let available = false;
          for (const id of eligibleIds) {
            if (!lockedWorkers[id] && !FB.isProtected(state, 'staffingWorker', id)) {
              available = true;
              break;
            }
          }
          unresolvedReason = available
            ? 'allocated_higher_yield' : 'eligible_workers_locked';
        }
      } else if (!staffingIdsEqual(currentIds, proposedIds)) {
        status = currentIds.length ? 'replaced' :
          (proposedFromUid ? 'moved' : 'assigned');
      } else if (enterprise.workerLocked) {
        status = 'locked';
        lockedCount++;
      } else if (protected.length) {
        status = 'reserved';
        lockedCount++;
      }
      if (currentIds.length < required) idleCount++;
      if (!staffingIdsEqual(currentIds, proposedIds)) changedCount++;
      currentTotal += currentYield;
      proposedTotal += proposedYield;
      rows.push({
        uid:enterprise.uid,
        type:enterprise.type,
        provinceId:enterprise.provinceId,
        settlement:enterprise.settlement,
        level:FB.enterpriseUpgradeLevel(enterprise),
        requiredCount:required,
        currentWorkerIds:currentIds,
        proposedWorkerIds:proposedIds,
        currentWorkerId:currentIds[0] || null,
        proposedWorkerId:proposedIds[0] || null,
        proposedFromUid:proposedFromUid,
        currentYield:currentYield / 1000,
        proposedYield:proposedYield / 1000,
        workerLocked:!!enterprise.workerLocked,
        workerProtected:protected.length > 0,
        status:status,
        unresolvedReason:unresolvedReason
      });
    }
    return {
      signature:JSON.stringify([
        state.turn,
        FB.protectionIds(state, 'staffingWorker').slice().sort(),
        signatureRows
      ]),
      currentTotal:currentTotal / 1000,
      proposedTotal:proposedTotal / 1000,
      idleCount:idleCount,
      lockedCount:lockedCount,
      unresolvedCount:unresolvedCount,
      changedCount:changedCount,
      changed:changedCount > 0,
      rows:rows
    };
  };

  function staffingPlansMatch(a, b) {
    if (!a || !b || a.signature !== b.signature ||
        !Array.isArray(a.rows) || a.rows.length !== b.rows.length) return false;
    for (let i = 0; i < a.rows.length; i++) {
      if (a.rows[i].uid !== b.rows[i].uid ||
          !staffingIdsEqual(a.rows[i].proposedWorkerIds || [],
            b.rows[i].proposedWorkerIds || []) ||
          !!a.rows[i].workerLocked !== !!b.rows[i].workerLocked ||
          !!a.rows[i].workerProtected !== !!b.rows[i].workerProtected) return false;
    }
    return true;
  }

  FB.applyEnterpriseStaffingPlan = function (state, plan) {
    const fresh = FB.enterpriseStaffingPlan(state);
    if (!staffingPlansMatch(plan, fresh)) {
      return { ok:false, reason:'stale', plan:fresh };
    }
    if (!fresh.changed) {
      return { ok:false, reason:'unchanged', plan:fresh };
    }
    const enterprises = FB.enterpriseList(state);
    const snapshot = [];
    for (const enterprise of enterprises) {
      snapshot.push({
        enterprise:enterprise,
        workerIds:enterpriseAssignedIds(enterprise),
        workerLocked:!!enterprise.workerLocked
      });
      if (!enterprise.workerLocked) {
        const preserve = enterpriseAssignedIds(enterprise).filter(function (id) {
          return FB.isProtected(state, 'staffingWorker', id) ||
            FB.enterpriseLaborRecord(state, id);
        });
        syncEnterpriseAssignedIds(enterprise, preserve);
      }
    }
    for (const row of fresh.rows) {
      let failed = false;
      for (const id of (row.proposedWorkerIds || [])) {
        if (enterpriseAssignedIds(enterprises.filter(function (e) {
          return e.uid === row.uid;
        })[0] || {}).indexOf(id) >= 0) continue;
        if (!FB.setEnterpriseWorker(state, row.uid, id, true)) {
          failed = true;
          break;
        }
      }
      if (failed) {
        for (const saved of snapshot) {
          syncEnterpriseAssignedIds(saved.enterprise, saved.workerIds);
          if (saved.workerLocked) saved.enterprise.workerLocked = true;
          else unlockEnterprise(saved.enterprise);
        }
        return {
          ok:false, reason:'stale',
          plan:FB.enterpriseStaffingPlan(state)
        };
      }
    }
    return { ok:true, reason:'applied', plan:FB.enterpriseStaffingPlan(state) };
  };

  FB.livelihoodBreakdown = function (state) {
    const assigned = {};
    const lines = [];
    for (const e of FB.enterpriseList(state)) {
      for (const id of enterpriseAssignedIds(e)) assigned[id] = 1;
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
      if (amount > 0) amount *= FB.householdWorkMultiplier(state, career.profession);
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
      const career = FB.careerOf(state, c);
      const profession = career && career.profession;
      const workMult = profession === 'monk' || profession === 'priest'
        ? FB.householdWorkMultiplier(state, profession) : 1;
      let bestYield = 0;
      for (const standing of FB.religiousStandings(state, c)) {
        const raw = standing.path && standing.path.step.pietyYield || 0;
        const yieldAmount = standing.kind === 'vocation' ? raw * workMult : raw;
        bestYield = Math.max(bestYield, yieldAmount);
      }
      const officeYield = FB.papacyPietyYield
        ? FB.papacyPietyYield(state, c, bestYield) : bestYield;
      if (officeYield) amount += officeYield;
      if (c.id === me.id) continue;
      const def = career && FBDATA.careers[career.profession];
      if (def && def.piety) amount += def.piety * workMult;
    }
    return amount;
  };

  /* A learned medical worker protects the people actually living at the
     household home. Several practitioners do not stack: use the strongest
     current qualification so a large dynasty cannot erase mortality. */
  FB.householdMedicalProtection = function (state) {
    let best = 0;
    for (const c of FB.householdWorkers(state)) {
      if (!c || c.dead || FB.ageOf(c, state.date.year) < 16) continue;
      if (c.id === state.player.charId &&
          (state.player.tier >= 3 || state.player.travel)) continue;
      if (FB.characterResidence(state, c) !== state.player.provinceId) continue;
      const career = FB.careerOf(state, c);
      if (!career || !career.chosen || career.profession !== 'physician' ||
          career.rank === 'apprentice' || career.rank === 'unassigned') continue;
      const specialization = FB.careerSpecialization(state, c);
      let protection = specialization && specialization.fx &&
        specialization.fx.mortality !== undefined
        ? Number(specialization.fx.mortality) : NaN;
      if (!isFinite(protection) || protection < 0) {
        protection = Number(FBDATA.balance.learnedPractitionerMortality);
      }
      if (!isFinite(protection) || protection < 0) protection = 0.002;
      best = Math.max(best, protection);
    }
    return best;
  };

  FB.livelihoodSeason = function (state) {
    let gold = 0;
    for (const line of FB.livelihoodBreakdown(state)) gold += line.amount;
    state.player.gold += gold;
    if (gold > 0 && FB.ui && FB.ui.maybeTip) {
      FB.ui.maybeTip('first-coin',
        '💡 The season’s work has paid. Gold funds land, gifts, loans, and the household table.',
        '#tb-gold');
    }
    state.player.piety += FB.livelihoodPiety(state);
  };

  FB.livelihoodYearly = function (state) {
    for (const c of FB.householdWorkers(state)) {
      const career = FB.careerOf(state, c);
      const def = career && FBDATA.careers[career.profession];
      if (!def) continue;
      const age = FB.ageOf(c, state.date.year);
      if (c.id === state.player.charId && state.player.tier >= 3) {
        /* Office-holding clergy still accumulate the years required for
           religious standing; every secular hands-on career freezes. */
        if (age >= 16 && (career.profession === 'monk' ||
          career.profession === 'priest')) career.experience++;
        continue;
      }
      if (age >= 16 && career.chosen &&
          career.rank !== 'apprentice' && career.rank !== 'unassigned' &&
          def.guild && career.guildRank !== 'none') {
        const rawStandingGain =
          Number(FBDATA.balance.guildStandingYearlyGain);
        const rawStandingMax = Number(FBDATA.balance.guildStandingMax);
        const standingGain = Math.max(0,
          isFinite(rawStandingGain) ? rawStandingGain : 5);
        const standingMax = Math.max(0,
          isFinite(rawStandingMax) ? rawStandingMax : 100);
        const currentStanding =
          Math.max(0, Number(career.guildStanding) || 0);
        if (currentStanding < standingMax) {
          career.guildStanding = Math.min(standingMax,
            currentStanding + standingGain);
        }
      }
      if (!career.chosen && age >= 16) {
        career.chosen = true;
        career.rank = 'journeyman';
        career.profession = state.player.tier >= 2 && dependentOfPlayer(state, c) ?
          'noble' : 'farmer';
      } else if (career.chosen && career.rank === 'apprentice' && age >= (def.apprenticeAge || 10)) {
        career.experience++;
        if (FB.chance(0.65)) FB.gainSkill(c, def.skill, 1);
        if (def.learned) {
          const literacyYears = Math.max(1, Number(def.literacyYears) || 2);
          if (career.experience >= literacyYears && !hasTrait(c, 'literate')) {
            FB.addTrait(c, 'literate');
            FB.news(state, FB.msg('news.career.lettered',
              '📜 {name} learns to read and write through sustained training.', {
                name:c.name
              }));
          }
        } else if (age >= 16) {
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
          !def.learned &&
          FB.skillOf(c, def.skill) >= 8 && !def.guild) {
          career.rank = 'master';
        }
      }
    }
    FB.syncPlayerCareer(state);
  };

  FB.guildAdvance = function (state, c) {
    if (!managedCareerCharacter(state, c)) return null;
    if (c && c.id === state.player.charId && state.player.tier >= 3) return null;
    const career = FB.careerOf(state, c);
    const def = career && FBDATA.careers[career.profession];
    if (!def || !def.guild || career.rank === 'apprentice' || career.rank === 'unassigned') return null;
    const ste = FB.skillOf(c, 'ste');
    if (career.guildRank === 'none') return { to:'member', cost:15, prestige:0, need:0 };
    if (career.guildRank === 'member') {
      return { to:'master', cost:40, prestige:0, need:8, blocked:ste < 8 };
    }
    if (career.guildRank === 'master') {
      const merchantLearning = career.profession === 'merchant' ? 6 : 0;
      const lettered = !merchantLearning || hasTrait(c, 'literate');
      const learning = FB.skillOf(c, 'lea');
      const step = { to:'officer', cost:25, prestige:60, need:10,
        learning:merchantLearning, lettered:lettered,
        blocked:ste < 10 || state.player.prestige < 60 ||
          !lettered || learning < merchantLearning };
      return FB.guildElectionStep ? FB.guildElectionStep(state, c, step) : step;
    }
    if (career.guildRank === 'officer') {
      const merchantLearning = career.profession === 'merchant' ? 8 : 0;
      const lettered = !merchantLearning || hasTrait(c, 'literate');
      const learning = FB.skillOf(c, 'lea');
      const step = { to:'guildmaster', cost:50, prestige:120, need:12,
        learning:merchantLearning, lettered:lettered,
        blocked:ste < 12 || state.player.prestige < 120 ||
          !lettered || learning < merchantLearning };
      return FB.guildElectionStep ? FB.guildElectionStep(state, c, step) : step;
    }
    return null;
  };

  FB.takeGuildStep = function (state, c) {
    c = c || playerChar(state);
    if (!managedCareerCharacter(state, c)) return false;
    if (c.id === state.player.charId && state.player.tier >= 3) return false;
    const career = FB.careerOf(state, c);
    const step = FB.guildAdvance(state, c);
    if (!step || step.blocked || state.player.gold < step.cost) return false;
    if (step.election && FB.beginGuildElection) {
      return FB.beginGuildElection(state, c, step.to);
    }
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
          master:'🏅 {name} is admitted among the masters.',
          officer:'🏅 {name} takes a seat as a guild officer.',
          guildmaster:'🏅 {name} is raised as guildmaster.',
          other:'🏅 {name} rises at the guild bench.'
        }
      }
    }, { name:c.name, rank:step.to }));
    return true;
  };

  FB.guildFavor = function (state, c) {
    c = c || playerChar(state);
    const career = FB.careerOf(state, c);
    const def = career && FBDATA.careers[career.profession];
    if (!def || !def.guild || career.guildRank === 'none') return null;
    const p = state.player;
    const favorTurns = p.guildFavorTurns &&
      typeof p.guildFavorTurns === 'object' &&
      !Array.isArray(p.guildFavorTurns) ? p.guildFavorTurns : {};
    const key = c.id;
    const cost = FBDATA.balance.guildFavorStandingCost || 20;
    const cooldown = FBDATA.balance.guildFavorCooldown || 360;
    const ready = !favorTurns[key] ||
      state.turn - favorTurns[key] >= cooldown;
    const rankValue = GUILD_ORDER[career.guildRank] || 1;
    return {
      cost:cost,
      amount:4 + rankValue * 2,
      ready:ready && career.guildStanding >= cost,
      cooldownReady:ready,
      standing:career.guildStanding
    };
  };

  FB.callGuildFavor = function (state, cid) {
    const c = state.chars[cid];
    const favor = c && FB.guildFavor(state, c);
    if (!favor || !favor.ready) return false;
    const career = FB.careerOf(state, c);
    career.guildStanding -= favor.cost;
    if (!state.player.guildFavorTurns ||
        typeof state.player.guildFavorTurns !== 'object' ||
        Array.isArray(state.player.guildFavorTurns)) {
      state.player.guildFavorTurns = {};
    }
    state.player.guildFavorTurns[c.id] = state.turn;
    state.player.gold += favor.amount;
    FB.news(state, FB.msg('news.guild.favor_called',
      '🏅 {name} calls in guild commissions worth {money:amount}.',
      { name:c.name, amount:favor.amount }));
    return true;
  };

  /* ================= guild monopoly charters =================
     The household may hold one incoming privilege and, while landed, issue
     one outgoing privilege. Records copy their numeric terms at creation:
     an active charter never changes because balance data changes later. */

  function monopolyProfession(profession) {
    return profession === 'craftsman' || profession === 'merchant'
      ? profession : null;
  }

  function finiteNumber(value, fallback) {
    const number = Number(value);
    return isFinite(number) ? number : fallback;
  }

  function monopolyTypedSpec(state, profession, source) {
    if (!source || !source.mode) return null;
    const mode = source.mode;
    const goodId = source.goodId;
    if (!FBDATA.marketGoods || !FBDATA.marketGoods[goodId]) return false;
    if ((profession === 'craftsman' && mode !== 'craft') ||
        (profession === 'merchant' && mode !== 'local' && mode !== 'corridor')) {
      return false;
    }
    if (mode === 'craft' && ['wares','materials','transport'].indexOf(goodId) < 0) {
      return false;
    }
    const originId = source.originId || state.player.provinceId;
    if (!FB.world.byId[originId] || FB.world.byId[originId].wasteland) return false;
    if (mode !== 'corridor') return {
      mode:mode, goodId:goodId, originId:originId,
      destinationId:null, route:null
    };
    const destinationId = source.destinationId;
    const route = Array.isArray(source.route) ? source.route.slice() : null;
    if (!destinationId || !FB.world.byId[destinationId] ||
        FB.world.byId[destinationId].wasteland || !route || !route.length ||
        route[route.length - 1] !== destinationId) return false;
    for (let i = 0; i < route.length; i++) {
      if (!FB.world.byId[route[i]] || FB.world.byId[route[i]].wasteland) return false;
      const prior = i ? route[i - 1] : originId;
      if (!FB.world.adj[prior] || !FB.world.adj[prior][route[i]]) return false;
    }
    return {
      mode:mode, goodId:goodId, originId:originId,
      destinationId:destinationId, route:route
    };
  }

  FB.guildMonopolyTerms = function (tier) {
    tier = Math.floor(finiteNumber(tier, 0));
    const table = FBDATA.balance.guildMonopolyTerms || {};
    const raw = table[tier];
    if (!raw) return null;
    const years = Math.max(1, Math.round(finiteNumber(raw.years, 0)));
    return {
      tier:tier,
      years:years,
      durationDays:years * 360,
      enterpriseBonus:FB.clamp(finiteNumber(raw.enterpriseBonus, 0), 0, 0.5),
      rulerFee:Math.max(0, finiteNumber(raw.rulerFee, 0)),
      taxBonus:FB.clamp(finiteNumber(raw.taxBonus, 0), 0, 0.5),
      popularOpinion:FB.clamp(finiteNumber(raw.popularOpinion, 0), -100, 100)
    };
  };

  function normalizeMonopolyRecord(record, slot, state) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return null;
    const profession = monopolyProfession(record.profession);
    const startTurn = Math.round(finiteNumber(record.startTurn, -1));
    const endTurn = Math.round(finiteNumber(record.endTurn, -1));
    const tier = FB.clamp(Math.round(finiteNumber(record.tier, 3)), 3, 7);
    if (!profession || startTurn < 0 || endTurn <= startTurn) return null;
    const scope = slot === 'incoming'
      ? (record.scope === 'province' ? 'province' :
        record.scope === 'liege' ? 'liege' : null)
      : 'landed';
    if (!scope) return null;
    const typed = record.mode ? monopolyTypedSpec(state, profession, record) : null;
    const mode = typed && typed.mode || null;
    const goodId = typed && typed.goodId || null;
    const originId = typed && typed.originId || null;
    const destinationId = typed && typed.destinationId || null;
    const route = typed && typed.route || null;
    return {
      contractId:String(record.contractId ||
        ('guild_monopoly:' + slot + ':' + startTurn + ':' + profession)),
      profession:profession,
      grantorKind:slot === 'incoming'
        ? (record.grantorKind === 'realm' ? 'realm' : 'local')
        : 'player',
      grantorId:record.grantorId || (slot === 'outgoing' ? 'player' : null),
      grantorName:String(record.grantorName || ''),
      grantorRulerName:String(record.grantorRulerName || ''),
      recipientKind:slot === 'outgoing' ? 'local_guild' : 'household',
      advocateId:record.advocateId || null,
      advocateName:String(record.advocateName || ''),
      scope:scope,
      scopeId:record.scopeId || (slot === 'outgoing' ? 'player' : null),
      tier:tier,
      years:Math.max(1, Math.round(finiteNumber(record.years,
        Math.max(1, Math.round((endTurn - startTurn) / 360))))),
      durationDays:endTurn - startTurn,
      startTurn:startTurn,
      endTurn:endTurn,
      enterpriseBonus:FB.clamp(finiteNumber(record.enterpriseBonus, 0), 0, 0.5),
      rulerFee:Math.max(0, finiteNumber(record.rulerFee, 0)),
      taxBonus:FB.clamp(finiteNumber(record.taxBonus, 0), 0, 0.5),
      popularOpinion:FB.clamp(finiteNumber(record.popularOpinion, 0), -100, 100),
      mode:mode,
      goodId:goodId,
      originId:originId,
      destinationId:destinationId,
      route:route
    };
  }

  FB.ensureGuildMonopolies = function (state) {
    const p = state.player;
    let slots = p.guildMonopolies;
    if (!slots || typeof slots !== 'object' || Array.isArray(slots)) slots = {};
    slots.incoming = normalizeMonopolyRecord(slots.incoming, 'incoming', state);
    slots.outgoing = normalizeMonopolyRecord(slots.outgoing, 'outgoing', state);
    p.guildMonopolies = slots;
    return slots;
  };

  function monopolyInvalidReason(state, slot, record) {
    if (!record) return null;
    if (state.turn >= record.endTurn) return 'expired';
    if (slot === 'incoming' && record.scope === 'province' &&
        state.player.provinceId !== record.scopeId) return 'relocation';
    if (slot === 'incoming' && record.scope === 'liege' &&
        state.player.liege !== record.scopeId) return 'liege';
    if (slot === 'outgoing' && state.player.tier < 3) return 'authority';
    return null;
  }

  FB.guildMonopolyActive = function (state, slot) {
    const record = FB.ensureGuildMonopolies(state)[slot];
    return record && !monopolyInvalidReason(state, slot, record) ? record : null;
  };

  FB.guildMonopolyRemainingDays = function (state, record) {
    return record ? Math.max(0, record.endTurn - state.turn) : 0;
  };

  function monopolyEndNotice(state, slot, record, reason) {
    const profession = FB.dataParam('career', record.profession, 'name', 'lower');
    if (reason === 'expired' && slot === 'incoming') {
      FB.news(state, FB.msg('news.guild_monopoly.incoming_expired',
        '📜 The {profession} monopoly granted by {grantor} expires; its exclusive privilege ends.',
        { profession:profession, grantor:record.grantorName || record.grantorRulerName }));
    } else if (reason === 'expired') {
      FB.news(state, FB.msg('news.guild_monopoly.outgoing_expired',
        '📜 The local {profession} guild’s monopoly expires; its toll privilege returns to the ordinary law.',
        { profession:profession }));
    } else if (reason === 'relocation') {
      const province = FB.world.byId[record.scopeId];
      FB.news(state, FB.msg('news.guild_monopoly.relocation_ended',
        '📜 The household’s {profession} monopoly ends when it leaves {province}.',
        { profession:profession, province:province ? province.name : record.scopeId }));
    } else if (reason === 'liege') {
      FB.news(state, FB.msg('news.guild_monopoly.liege_ended',
        '📜 The household’s {profession} monopoly ends with its direct bond to {grantor}.',
        { profession:profession, grantor:record.grantorName || record.grantorRulerName }));
    } else if (reason === 'authority') {
      FB.news(state, FB.msg('news.guild_monopoly.authority_ended',
        '📜 The local {profession} guild’s monopoly ends with the dynasty’s landed authority.',
        { profession:profession }));
    } else if (reason === 'exposed') {
      FB.news(state, FB.msg('news.guild_monopoly.exposed',
        '📜 Evidence of abuse ends the {profession} monopoly before its term.',
        { profession:profession }));
    }
  }

  FB.invalidateGuildMonopolies = function (state) {
    const slots = FB.ensureGuildMonopolies(state);
    for (const slot of ['incoming', 'outgoing']) {
      const record = slots[slot];
      const reason = monopolyInvalidReason(state, slot, record);
      if (!reason) continue;
      slots[slot] = null;
      monopolyEndNotice(state, slot, record, reason);
    }
    return slots;
  };
  FB.guildMonopolyTick = FB.invalidateGuildMonopolies;

  FB.guildMonopolyByContract = function (state, contractId) {
    FB.ensureGuildMonopolies(state);
    for (const slot of ['incoming', 'outgoing']) {
      const record = FB.guildMonopolyActive(state, slot);
      if (record && record.contractId === contractId) {
        return { slot:slot, record:record };
      }
    }
    return null;
  };

  FB.guildMonopolyPlotTargets = function (state) {
    const out = [];
    for (const slot of ['incoming', 'outgoing']) {
      const record = FB.guildMonopolyActive(state, slot);
      if (!record) continue;
      const def = FBDATA.careers && FBDATA.careers[record.profession];
      const profession = def && FB.dataText
        ? FB.dataText(state, state.player.charId, 'career',
          record.profession, def, 'name', {})
        : record.profession;
      out.push({
        contractId:record.contractId,
        realmId:record.grantorKind === 'realm' ? record.grantorId : null,
        label:slot === 'incoming'
          ? FB.T('Household {profession} monopoly', { profession:profession })
          : FB.T('Local {profession} monopoly', { profession:profession }),
        desc:FB.T('{kind} charter · {days} days remain', {
          kind:slot === 'incoming' ? FB.T('incoming') : FB.T('outgoing'),
          days:FB.guildMonopolyRemainingDays(state, record)
        })
      });
    }
    return out;
  };

  FB.endGuildMonopoly = function (state, contractId, reason) {
    const target = FB.guildMonopolyByContract(state, contractId);
    if (!target) return false;
    FB.ensureGuildMonopolies(state)[target.slot] = null;
    monopolyEndNotice(state, target.slot, target.record, reason || 'exposed');
    return true;
  };

  FB.guildMonopolyCareer = function (state) {
    const c = playerChar(state);
    const career = FB.careerOf(state, c);
    const profession = career && monopolyProfession(career.profession);
    return profession && career.guildRank === 'guildmaster'
      ? { character:c, career:career, profession:profession } : null;
  };

  /* Low-station guildmasters address the local lord and receive baron terms.
     Landed vassals address their exact direct liege and use that realm's tier. */
  FB.guildMonopolyGrantor = function (state, createLocal) {
    const p = state.player;
    if (p.tier <= 2) {
      const lord = FB.getRole ? FB.getRole(state, 'lord', !!createLocal) : null;
      if (!lord || lord.dead) return null;
      return {
        kind:'local',
        id:lord.id,
        name:FB.fullName ? FB.fullName(lord) : lord.name,
        rulerName:lord.name,
        tier:3,
        scope:'province',
        scopeId:p.provinceId,
        standing:FB.standingOf(state, { kind:'character', id:lord.id })
      };
    }
    if (!p.liege) return null;
    const realm = state.realms[p.liege];
    if (!realm || !realm.alive) return null;
    return {
      kind:'realm',
      id:realm.id,
      name:realm.name,
      rulerName:realm.ruler ? realm.ruler.name : realm.name,
      tier:FB.clamp((realm.rank || 1) + 3, 3, 7),
      scope:'liege',
      scopeId:realm.id,
      standing:FB.standingOf(state, { kind:'realm', id:realm.id })
    };
  };

  FB.guildMonopolyPetitionStatus = function (state, createLocal) {
    const career = FB.guildMonopolyCareer(state);
    if (!career) return {
      ready:false,
      reason:FB.T('Only a guildmaster of the Craft or Trade profession may petition.')
    };
    const slots = FB.ensureGuildMonopolies(state);
    if (slots.incoming) return {
      ready:false,
      reason:FB.T('The household already holds an incoming guild monopoly.')
    };
    if (!FB.hasTech || !FB.hasTech(state, 'guild_charters')) return {
      ready:false,
      reason:FB.T('Your sovereign nation has not completed Guild Charters.')
    };
    if ((career.career.guildStanding || 0) < 60) return {
      ready:false,
      reason:FB.T('A petition requires 60 guild standing; currently {standing}.', {
        standing:Math.round(career.career.guildStanding || 0)
      })
    };
    const grantor = FB.guildMonopolyGrantor(state, createLocal);
    if (!grantor) return {
      ready:false,
      reason:state.player.tier >= 3 && !state.player.liege
        ? FB.T('An independent landed ruler has no superior to petition.')
        : FB.T('No valid local grantor can hear this petition.')
    };
    if (grantor.standing < 40) return {
      ready:false,
      reason:FB.T('{grantor} must hold at least 40 Standing toward you; currently {standing}.', {
        grantor:grantor.rulerName,
        standing:Math.round(grantor.standing)
      })
    };
    const terms = FB.guildMonopolyTerms(grantor.tier);
    if (!terms) return {
      ready:false,
      reason:FB.T('No monopoly terms are defined for this grantor’s tier.')
    };
    return {
      ready:true,
      career:career,
      grantor:grantor,
      terms:terms
    };
  };

  FB.guildMonopolyPetitionContext = function (state, spec) {
    const status = FB.guildMonopolyPetitionStatus(state, true);
    if (!status.ready) return null;
    const grantor = status.grantor, terms = status.terms;
    const typed = monopolyTypedSpec(state, status.career.profession, spec);
    if (typed === false) return null;
    const context = {
      profession:status.career.profession,
      grantorKind:grantor.kind,
      grantorId:grantor.id,
      grantor:grantor.rulerName,
      grantorName:grantor.name,
      grantorRulerName:grantor.rulerName,
      rid:grantor.kind === 'realm' ? grantor.id : null,
      scope:grantor.scope,
      scopeId:grantor.scopeId,
      tier:terms.tier,
      years:terms.years,
      durationDays:terms.durationDays,
      enterpriseBonus:terms.enterpriseBonus,
      enterprisePercent:Math.round(terms.enterpriseBonus * 100),
      persuasionPercent:Math.round(FB.namedChance(state, 'skill_dip') * 100),
      rulerFee:terms.rulerFee,
      taxBonus:terms.taxBonus,
      taxPercent:Math.round(terms.taxBonus * 100),
      popularOpinion:terms.popularOpinion
    };
    if (typed) {
      context.mode = typed.mode;
      context.goodId = typed.goodId;
      context.originId = typed.originId;
      context.destinationId = typed.destinationId;
      context.route = typed.route;
    }
    return context;
  };

  function monopolyTermsFromContext(ctx) {
    const tier = FB.clamp(Math.round(finiteNumber(ctx && ctx.tier, 3)), 3, 7);
    const fallback = FB.guildMonopolyTerms(tier);
    if (!fallback) return null;
    const years = Math.max(1, Math.round(finiteNumber(ctx.years, fallback.years)));
    const durationDays = Math.max(1, Math.round(finiteNumber(
      ctx.durationDays, years * 360)));
    return {
      tier:tier,
      years:years,
      durationDays:durationDays,
      enterpriseBonus:FB.clamp(finiteNumber(
        ctx.enterpriseBonus, fallback.enterpriseBonus), 0, 0.5),
      rulerFee:Math.max(0, finiteNumber(ctx.rulerFee, fallback.rulerFee)),
      taxBonus:FB.clamp(finiteNumber(ctx.taxBonus, fallback.taxBonus), 0, 0.5),
      popularOpinion:FB.clamp(finiteNumber(
        ctx.popularOpinion, fallback.popularOpinion), -100, 100)
    };
  }

  function monopolyRecord(state, profession, terms, identity) {
    const slot = identity.recipientKind === 'household' ? 'incoming' : 'outgoing';
    return {
      contractId:'guild_monopoly:' + slot + ':' + state.turn + ':' + profession,
      profession:profession,
      grantorKind:identity.grantorKind,
      grantorId:identity.grantorId,
      grantorName:identity.grantorName || '',
      grantorRulerName:identity.grantorRulerName || '',
      recipientKind:identity.recipientKind,
      advocateId:identity.advocateId || null,
      advocateName:identity.advocateName || '',
      scope:identity.scope,
      scopeId:identity.scopeId,
      tier:terms.tier,
      years:terms.years,
      durationDays:terms.durationDays,
      startTurn:state.turn,
      endTurn:state.turn + terms.durationDays,
      enterpriseBonus:terms.enterpriseBonus,
      rulerFee:terms.rulerFee,
      taxBonus:terms.taxBonus,
      popularOpinion:terms.popularOpinion,
      mode:identity.mode || null,
      goodId:identity.goodId || null,
      originId:identity.originId || null,
      destinationId:identity.destinationId || null,
      route:Array.isArray(identity.route) ? identity.route.slice() : null
    };
  }

  FB.receiveGuildMonopoly = function (state, ctx) {
    const slots = FB.ensureGuildMonopolies(state);
    const profession = monopolyProfession(ctx && ctx.profession);
    const terms = monopolyTermsFromContext(ctx || {});
    if (slots.incoming || !profession || !terms) return false;
    const typed = monopolyTypedSpec(state, profession, ctx);
    if (typed === false) return false;
    slots.incoming = monopolyRecord(state, profession, terms, {
      grantorKind:ctx.grantorKind === 'realm' ? 'realm' : 'local',
      grantorId:ctx.grantorId || null,
      grantorName:String(ctx.grantorName || ctx.grantor || ''),
      grantorRulerName:String(ctx.grantorRulerName || ctx.grantor || ''),
      recipientKind:'household',
      scope:ctx.scope === 'liege' ? 'liege' : 'province',
      scopeId:ctx.scopeId || (ctx.scope === 'liege'
        ? state.player.liege : state.player.provinceId),
      mode:typed && typed.mode,
      goodId:typed && typed.goodId,
      originId:typed && typed.originId,
      destinationId:typed && typed.destinationId,
      route:typed && typed.route
    });
    FB.news(state, FB.msg('news.guild_monopoly.incoming_granted',
      '📜 {grantor} grants the household a {profession} monopoly for {years} years.',
      {
        grantor:slots.incoming.grantorRulerName || slots.incoming.grantorName,
        profession:FB.dataParam('career', profession, 'name', 'lower'),
        years:terms.years
      }));
    return true;
  };

  function monopolyAdvocate(state, profession) {
    for (const c of FB.householdWorkers(state)) {
      if (c.id === state.player.charId || c.dead) continue;
      const career = FB.careerOf(state, c);
      if (career && career.profession === profession &&
          career.guildRank === 'guildmaster') return c;
    }
    return null;
  }

  FB.guildMonopolyIssueStatus = function (state) {
    if (state.player.tier < 3) return {
      ready:false,
      reason:FB.T('Only a baron or higher ruler may grant a monopoly.')
    };
    const slots = FB.ensureGuildMonopolies(state);
    if (slots.outgoing) return {
      ready:false,
      reason:FB.T('Your realm has already granted a local guild monopoly.')
    };
    if (!FB.hasTech || !FB.hasTech(state, 'guild_charters')) return {
      ready:false,
      reason:FB.T('Your sovereign nation has not completed Guild Charters.')
    };
    const terms = FB.guildMonopolyTerms(state.player.tier);
    if (!terms) return {
      ready:false,
      reason:FB.T('No monopoly terms are defined for your current tier.')
    };
    return { ready:true, terms:terms };
  };

  FB.issueGuildMonopoly = function (state, profession, options) {
    profession = monopolyProfession(profession);
    const status = FB.guildMonopolyIssueStatus(state);
    if (!profession || !status.ready) return false;
    const typed = monopolyTypedSpec(state, profession, options);
    if (typed === false) return false;
    const slots = FB.ensureGuildMonopolies(state);
    const advocate = monopolyAdvocate(state, profession);
    slots.outgoing = monopolyRecord(state, profession, status.terms, {
      grantorKind:'player',
      grantorId:'player',
      grantorName:FB.fullName(playerChar(state)),
      grantorRulerName:playerChar(state).name,
      recipientKind:'local_guild',
      advocateId:advocate ? advocate.id : null,
      advocateName:advocate ? FB.fullName(advocate) : '',
      scope:'landed',
      scopeId:'player',
      mode:typed && typed.mode,
      goodId:typed && typed.goodId,
      originId:typed && typed.originId,
      destinationId:typed && typed.destinationId,
      route:typed && typed.route
    });
    state.player.gold += status.terms.rulerFee;
    state.player.pop = FB.clamp((state.player.pop || 0) +
      status.terms.popularOpinion, -100, 100);
    FB.news(state, FB.msg('news.guild_monopoly.outgoing_granted',
      '📜 You grant the local {profession} guild a {years}-year monopoly; its fee adds {money:fee} to the treasury.',
      {
        profession:FB.dataParam('career', profession, 'name', 'lower'),
        years:status.terms.years,
        fee:status.terms.rulerFee
      }));
    return slots.outgoing;
  };

  FB.guildMonopolyEnterpriseBonus = function (state, profession, enterprise) {
    profession = monopolyProfession(profession);
    if (!profession) return 0;
    let total = 0;
    for (const slot of ['incoming', 'outgoing']) {
      const record = FB.guildMonopolyActive(state, slot);
      if (!record || record.profession !== profession) continue;
      if (!record.mode) {
        total += record.enterpriseBonus;
        continue;
      }
      if (!enterprise) continue;
      if (record.mode === 'craft') {
        if (enterprise.type !== 'workshop_business') continue;
        const workerId = enterpriseAssignedIds(enterprise)[0];
        const worker = workerId && state.chars[workerId];
        const career = worker && FB.careerOf(state, worker);
        const produced = career && career.specialization === 'smith' ? 'materials' :
          career && career.specialization === 'cooper' ? 'transport' : 'wares';
        if (produced === record.goodId) total += record.enterpriseBonus;
      } else if (record.mode === 'local') {
        if ((enterprise.type === 'market_stall_business' ||
            enterprise.type === 'trade_house_business') &&
            enterprise.provinceId === (record.originId || state.player.provinceId)) {
          total += record.enterpriseBonus;
        }
      } else if (record.mode === 'corridor' &&
          (enterprise.type === 'market_stall_business' ||
           enterprise.type === 'trade_house_business') &&
          (enterprise.provinceId === record.originId ||
           enterprise.provinceId === record.destinationId)) {
        total += record.enterpriseBonus;
      }
    }
    return Math.min(0.5, total);
  };

  FB.guildMonopolyTaxBonus = function (state) {
    const record = FB.guildMonopolyActive(state, 'outgoing');
    return record ? record.taxBonus : 0;
  };

  function adjustPetitionGrantorStanding(state, ctx, amount) {
    if (ctx && ctx.grantorKind === 'realm' && ctx.grantorId) {
      FB.adjustStanding(state, { kind:'realm', id:ctx.grantorId }, amount,
        'guild_monopoly:petition');
      return;
    }
    let lord = ctx && ctx.grantorId ? state.chars[ctx.grantorId] : null;
    if (!lord && !(ctx && ctx.grantorId)) {
      lord = FB.getRole ? FB.getRole(state, 'lord', true) : null;
    }
    if (lord && !lord.dead) {
      FB.adjustStanding(state, { kind:'character', id:lord.id }, amount,
        'guild_monopoly:petition');
    }
  }

  FB.fns = FB.fns || {};
  FB.fns.guild_monopoly_paid = function (state, ctx) {
    return FB.receiveGuildMonopoly(state, ctx);
  };
  FB.fns.guild_monopoly_persuade_success = function (state, ctx) {
    if (!FB.receiveGuildMonopoly(state, ctx)) return false;
    state.player.prestige += 5;
    return true;
  };
  FB.fns.guild_monopoly_persuade_failure = function (state, ctx) {
    state.player.prestige = Math.max(0, state.player.prestige - 5);
    adjustPetitionGrantorStanding(state, ctx, -8);
    return true;
  };

  FB.fns.plot_has_guild_monopoly = function (state) {
    return !!(FB.guildMonopolyActive(state, 'incoming') ||
      FB.guildMonopolyActive(state, 'outgoing'));
  };

  function guildPlotTarget(state, ctx) {
    if (!FB.activePlotContext ||
        !FB.activePlotContext(state, 'guild_monopoly', ctx)) return null;
    return FB.guildMonopolyByContract(state, ctx && ctx.contractId);
  }

  function guildPlotGrantorStanding(state, target, amount, source) {
    const record = target && target.record;
    if (!record || target.slot !== 'incoming') return false;
    if (record.grantorKind === 'realm' && record.grantorId) {
      FB.adjustStanding(state, { kind:'realm', id:record.grantorId }, amount,
        'plot:guild_' + source);
      return true;
    }
    const grantor = record.grantorId && state.chars[record.grantorId];
    if (grantor && !grantor.dead) {
      FB.adjustStanding(state, { kind:'character', id:grantor.id }, amount,
        'plot:guild_' + source);
      return true;
    }
    return false;
  }

  FB.fns.plot_guild_expose = function (state, ctx) {
    const target = guildPlotTarget(state, ctx);
    if (!target) {
      if (state.player.plot && state.player.plot.id === 'guild_monopoly') {
        FB.fns.plot_end(state);
      }
      return false;
    }
    FB.endGuildMonopoly(state, target.record.contractId, 'exposed');
    state.player.prestige += 6;
    state.player.pop = FB.clamp((state.player.pop || 0) + 10, -100, 100);
    FB.fns.plot_end(state);
    return true;
  };

  FB.fns.plot_guild_compensation = function (state, ctx) {
    const target = guildPlotTarget(state, ctx);
    if (!target) {
      if (state.player.plot && state.player.plot.id === 'guild_monopoly') {
        FB.fns.plot_end(state);
      }
      return false;
    }
    state.player.gold += target.slot === 'incoming' ? 16 : 12;
    state.player.pop = FB.clamp((state.player.pop || 0) - 6, -100, 100);
    guildPlotGrantorStanding(state, target, -6, 'compensation');
    FB.fns.plot_end(state);
    return true;
  };

  FB.fns.plot_guild_defend = function (state, ctx) {
    const target = guildPlotTarget(state, ctx);
    if (!target) {
      if (state.player.plot && state.player.plot.id === 'guild_monopoly') {
        FB.fns.plot_end(state);
      }
      return false;
    }
    const career = FB.careerOf(state, playerChar(state));
    if (career && career.profession === target.record.profession) {
      career.guildStanding = FB.clamp((career.guildStanding || 0) + 10, 0, 100);
    }
    state.player.prestige += 4;
    state.player.pop = FB.clamp((state.player.pop || 0) - 8, -100, 100);
    guildPlotGrantorStanding(state, target, 5, 'defended');
    FB.fns.plot_end(state);
    return true;
  };

  FB.fns.plot_guild_failure = function (state, ctx) {
    const target = guildPlotTarget(state, ctx);
    if (target) {
      if (!guildPlotGrantorStanding(state, target, -8, 'failure')) {
        state.player.pop = FB.clamp((state.player.pop || 0) - 10, -100, 100);
      }
    }
    FB.fns.plot_end(state);
    return !!target;
  };

  FB.fns.plot_guild_discovery = function (state, ctx) {
    const target = guildPlotTarget(state, ctx);
    if (target) {
      if (!guildPlotGrantorStanding(state, target, -5, 'discovery')) {
        state.player.pop = FB.clamp((state.player.pop || 0) - 6, -100, 100);
      }
    }
    FB.fns.plot_end(state);
    return !!target;
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
    source = String(source || 'event');
    if (FB.addMarketShock && (source === 'lean_harvest' ||
        source === 'pestilence' || source === 'plague_recovery')) {
      const recovery = source === 'plague_recovery';
      return FB.addMarketShock(state, {
        id:source + ':' + state.player.provinceId + ':' + state.turn,
        source:source,
        provinceId:state.player.provinceId,
        goodId:source === 'lean_harvest' ? 'provisions' : null,
        production:recovery ? 0.10 : source === 'lean_harvest' ? -0.30 : -0.18,
        demand:source === 'pestilence' ? -0.10 : 0,
        flow:recovery ? 0.15 : source === 'pestilence' ? -0.30 : -0.12,
        severe:!recovery,
        remaining:years * 4
      });
    }
    FB.ensureEconomy(state).shocks.push({
      amount:amount, years:years, source:source
    });
    return true;
  };

  FB.financeDueNow = function (state, loan, economy) {
    const price = (economy || FB.ensureEconomy(state)).price;
    if (!loan || financeSettled(loan.status)) return 0;
    return loan.denomination === 'real' ? loan.face : loan.face / price;
  };

  function activeLoans(economy) {
    const out = [];
    for (const loan of economy.loans) {
      if (!financeSettled(loan.status)) out.push(loan);
    }
    out.sort(function (a, b) { return a.id - b.id; });
    return out;
  }

  FB.financeActiveLoans = function (state, economy) {
    return activeLoans(economy || FB.ensureEconomy(state));
  };

  function activeInvestments(economy) {
    const out = [];
    for (const inv of economy.investments) {
      if (inv.status === 'active') out.push(inv);
    }
    out.sort(function (a, b) { return a.id - b.id; });
    return out;
  }

  FB.financeActiveInvestments = function (state, economy) {
    return activeInvestments(economy || FB.ensureEconomy(state));
  };

  function activePartnerships(economy) {
    return activeInvestments(economy).filter(function (inv) {
      return !inv.kind || inv.kind === 'trade_partnership';
    });
  }

  FB.financeActivePartnerships = function (state, economy) {
    return activePartnerships(economy || FB.ensureEconomy(state));
  };

  FB.financeActiveTradeVentures = function (state, economy) {
    return activeInvestments(economy || FB.ensureEconomy(state)).filter(function (inv) {
      return inv.kind === 'trade_venture';
    });
  };

  function hasDefault(loans) {
    for (const loan of loans) {
      if (loan.status === 'default') return true;
    }
    return false;
  }

  FB.financeHasDefault = function (state, economy) {
    return hasDefault(activeLoans(economy || FB.ensureEconomy(state)));
  };

  function collateralKey(collateral) {
    return collateral ? collateral.kind + ':' + collateral.id : '';
  }

  function collateralPledged(state, collateral, economy) {
    const key = collateralKey(collateral);
    if (!key) return false;
    for (const loan of activeLoans(economy || FB.ensureEconomy(state))) {
      if (collateralKey(loan.collateral) === key) return true;
    }
    return false;
  }

  FB.financeCollateralPledged = function (state, kind, id) {
    return collateralPledged(state, { kind:kind, id:id });
  };

  FB.financeCollateral = function (state, economy) {
    const e = economy || FB.ensureEconomy(state);
    const out = [];
    if (!FB.itemList || !FB.holdingList) return out;
    for (const id of FB.itemList(state)) {
      const item = FB.resolveItem ? FB.resolveItem(state, id) : null;
      const collateral = { kind:'item', id:id };
      if (item && item.value > 0 && !collateralPledged(state, collateral, e) &&
        (!FB.itemAssignment || !FB.itemAssignment(state, id))) {
        out.push({ collateral:collateral, value:item.value });
      }
    }
    for (const id of FB.holdingList(state)) {
      const def = FBDATA.holdings[id];
      const collateral = { kind:'holding', id:id };
      if (def && def.cost > 0 && !def.eventOnly && def.pledge !== false &&
          !collateralPledged(state, collateral, e)) {
        out.push({ collateral:collateral, value:def.cost });
      }
    }
    out.sort(function (a, b) {
      if (b.value !== a.value) return b.value - a.value;
      return collateralKey(a.collateral) < collateralKey(b.collateral) ? -1 : 1;
    });
    return out;
  };

  function outstandingValue(state, economy) {
    let total = 0;
    for (const loan of activeLoans(economy)) {
      total += FB.financeDueNow(state, loan, economy);
    }
    return total;
  }

  function assignedRevenueBase(state, loan, economy) {
    if (loan.kind === 'merchant' && FB.reliableGoldIncome) {
      return Math.max(0, FB.reliableGoldIncome(state, true, economy));
    }
    return Math.max(0, FB.playerTax ? FB.playerTax(state) : 0);
  }

  FB.financeAssignedIncomeCost = function (state, economy) {
    const e = economy || FB.ensureEconomy(state);
    const share = FBDATA.balance.financeRevenueShare || 0.25;
    let assigned = 0;
    for (const loan of activeLoans(e)) {
      if (loan.status === 'default' && loan.defaultKind === 'revenue') {
        assigned += Math.min(FB.financeDueNow(state, loan, e),
          assignedRevenueBase(state, loan, e) * share);
      }
    }
    return assigned;
  };

  FB.financeCreditCapacity = function (state, collateral, secured, economy) {
    const e = economy || FB.ensureEconomy(state);
    const B = FBDATA.balance;
    const income = FB.reliableGoldIncome
      ? FB.reliableGoldIncome(state, false, e) : 0;
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
    capacity *= 1 + (FB.techBonus ? FB.techBonus(state, 'finance') : 0);
    return Math.max(0, capacity - outstandingValue(state, e));
  };

  function currentCareer(state) {
    const c = state.chars[state.player.charId];
    return c && FB.careerOf ? FB.careerOf(state, c) : null;
  }

  function lenderConfidencePenalty(e) {
    return (e.defaults || 0) + Math.max(0, (e.debasements || 0) - (e.recoinages || 0));
  }

  FB.financeLoanOffers = function (state, economy) {
    const e = economy || FB.ensureEconomy(state);
    const B = FBDATA.balance;
    const defs = FBDATA.finance || {};
    const out = [];
    const borrower = state.chars[state.player.charId];
    const loans = activeLoans(e);
    if (!borrower || FB.ageOf(borrower, state.date.year) < 16 ||
      loans.length >= (B.financeMaxLoans || 2) ||
      hasDefault(loans) ||
      (e.creditBanUntil !== undefined && state.turn < e.creditBanUntil)) return out;

    const pledge = defs.pledge;
    if (pledge && (!pledge.requiresTech ||
        FB.techRequirementMet(state, pledge.requiresTech))) {
      for (const asset of FB.financeCollateral(state, e)) {
        const cap = FB.financeCreditCapacity(state, asset, true, e);
        const principal = Math.floor(Math.min(pledge.maxPrincipal || 40, cap,
          asset.value * (pledge.collateralRatio || 0.6)));
        if (principal >= 5) {
          out.push({ kind:'pledge', principal:principal,
            collateral:asset.collateral, collateralValue:asset.value });
        }
      }
    }

    const career = currentCareer(state);
    const income = FB.reliableGoldIncome
      ? FB.reliableGoldIncome(state, false, e) : 0;
    if (defs.merchant && (!defs.merchant.requiresTech ||
      FB.techRequirementMet(state, defs.merchant.requiresTech)) &&
      state.player.tier <= 2 && income > 0 && career &&
      (career.profession === 'merchant' || career.profession === 'craftsman' ||
        state.player.tier === 2)) {
      const principal = Math.floor(Math.min(defs.merchant.maxPrincipal || 100,
        FB.financeCreditCapacity(state, null, false, e)));
      if (principal >= 10) out.push({ kind:'merchant', principal:principal, collateral:null });
    }
    if (defs.revenue && (!defs.revenue.requiresTech ||
      FB.techRequirementMet(state, defs.revenue.requiresTech)) &&
      state.player.tier >= 3 && income > 0) {
      const principal = Math.floor(Math.min(defs.revenue.maxPrincipal || 500,
        FB.financeCreditCapacity(state, null, true, e)));
      if (principal >= 20) out.push({ kind:'revenue', principal:principal, collateral:null });
    }

    /* Stable presentation and hotkey order: emergency pledge first, then
       merchant and landed contracts; strongest collateral first within pledge. */
    return out;
  };

  /* Whether the Coin & Credit sheet holds anything material for the player.
     Free stations always have a reason to look (credit, ventures, prices); a
     serf can neither borrow on income nor trade — the sheet matters only once
     shortfall, booked obligation, or eligible pledge offer makes it relevant. */
  FB.financeUiRelevant = function (state) {
    if (state.player.tier >= 1) return true;
    const e = FB.ensureEconomy(state);
    return state.player.gold < -0.0001 || activeLoans(e).length > 0 ||
      FB.financeLoanOffers(state, e).length > 0;
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

  function findLoan(state, id, economy) {
    const e = economy || FB.ensureEconomy(state);
    for (const loan of e.loans) if (loan.id === id) return loan;
    return null;
  }

  FB.repayFinanceLoan = function (state, id, automatic, economy) {
    const e = economy || FB.ensureEconomy(state);
    const loan = findLoan(state, id, e);
    const due = FB.financeDueNow(state, loan, e);
    if (!loan || financeSettled(loan.status) || loan.status === 'default' ||
      state.player.gold + 0.000001 < due) return false;
    state.player.gold -= due;
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

  function defaultLoan(state, loan, economy) {
    const e = economy || FB.ensureEconomy(state);
    e.defaults++;
    e.creditBanUntil = Math.max(e.creditBanUntil || 0, state.turn +
      (FBDATA.balance.financeDefaultBanSeasons || 4) * 90);
    state.player.prestige = Math.max(0, state.player.prestige -
      (FBDATA.balance.financeDefaultPrestige || 15));
    if (state.player.tier >= 6 && FB.councilAuthority) {
      FB.councilAuthority(state, -5);
      if (FB.councilMembers) {
        for (const member of FB.councilMembers(state)) {
          FB.adjustStanding(state, { kind:'realm', id:member.rid }, -5,
            'finance:default');
        }
      }
    } else if (state.player.tier >= 3 && state.player.liege) {
      FB.adjustStanding(state, {
        kind:'realm', id:state.player.liege
      }, -5, 'finance:default');
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

  function processLoan(state, loan, economy) {
    if (financeSettled(loan.status) || loan.status === 'default' ||
      state.turn < loan.dueTurn) return;
    if (FB.repayFinanceLoan(state, loan.id, true, economy)) return;
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
    defaultLoan(state, loan, economy);
  }

  function collectAssignedRevenue(state, economy) {
    const share = FBDATA.balance.financeRevenueShare || 0.25;
    const loans = activeLoans(economy);
    for (const loan of loans) {
      if (loan.status !== 'default' || loan.defaultKind !== 'revenue') continue;
      const due = FB.financeDueNow(state, loan, economy);
      const levy = Math.min(due, state.player.gold,
        assignedRevenueBase(state, loan) * share);
      if (!(levy > 0)) continue;
      state.player.gold -= levy;
      if (loan.denomination === 'real') loan.face = Math.max(0, loan.face - levy);
      else loan.face = Math.max(0, loan.face - levy * economy.price);
      if (FB.financeDueNow(state, loan, economy) < 0.01) {
        loan.status = 'settled';
        loan.face = 0;
        FB.news(state, FB.msg('news.finance.revenue_settled',
          '⚖ The last assigned revenues reach the lender; the defaulted obligation is settled.',
          {}));
      }
    }
  }

  /* ---- distraint & debt bondage (docs/designs/descent.md) -----------------
     A defaulted loan that outlives its grace becomes a writ of distraint:
     the lord's bailiffs take holdings and land plots at cost value until
     the book-debt is covered; a family with nothing left is bound to the
     land — the historical slide from freeholder into serfdom. Items are
     never distrained: personal treasures stay sacred, as in loseAllLand. */
  FB.fns = FB.fns || {};
  function defaultedLoans(state) {
    const out = [];
    const loans = FB.financeActiveLoans ? FB.financeActiveLoans(state) : [];
    for (const loan of loans) {
      if (loan.status === 'default') out.push(loan);
    }
    return out;
  }
  function totalDefaultDue(state) {
    let due = 0;
    for (const loan of defaultedLoans(state)) due += FB.financeDueNow(state, loan);
    return due;
  }
  FB.financeDefaultDue = function (state) {
    return totalDefaultDue(state);
  };
  FB.financeDistraintDaysRemaining = function (state) {
    const grace = FBDATA.balance.distraintGraceDays || 90;
    let remaining = null;
    for (const loan of defaultedLoans(state)) {
      if (loan.defaultTurn === undefined) continue;
      const days = Math.max(0, loan.defaultTurn + grace - state.turn);
      if (remaining === null || days < remaining) remaining = days;
    }
    return remaining;
  };
  FB.financeCanSettleDefault = function (state) {
    const due = totalDefaultDue(state);
    return due > 0.01 && state.player.gold + 0.000001 >= due;
  };
  FB.settleFinanceDefault = function (state) {
    if (!FB.financeCanSettleDefault(state)) return false;
    const p = state.player;
    p.gold -= totalDefaultDue(state);
    for (const loan of defaultedLoans(state)) { loan.status = 'settled'; loan.face = 0; }
    delete p.flags.debt_distraint;
    FB.news(state, FB.msg('news.finance.distraint_settled',
      '⚖ The debt is paid to the last penny; the writ is burned.', {}));
    return true;
  };
  function reduceLoanFace(state, loan, goldValue) {
    if (loan.denomination === 'real') loan.face = Math.max(0, loan.face - goldValue);
    else loan.face = Math.max(0, loan.face - goldValue * FB.ensureEconomy(state).price);
    if (FB.financeDueNow(state, loan) < 0.01) {
      loan.status = 'settled';
      loan.face = 0;
    }
  }
  /* take one asset — the cheapest holding, else one land plot — against the
     open defaults; returns the gold value applied, 0 when nothing is left */
  function seizeOneAsset(state) {
    const holdings = FB.holdingList(state);
    const plots = FB.landPlots(state);
    let value = 0;
    if (holdings.length) {
      let bestId = null, bestCost = Infinity;
      for (const id of holdings) {
        const def = FBDATA.holdings[id];
        const cost = def && def.cost ? def.cost : 20;
        if (cost < bestCost) { bestCost = cost; bestId = id; }
      }
      holdings.splice(holdings.indexOf(bestId), 1);
      value = bestCost;
      FB.news(state, FB.msg('news.finance.distraint_holding',
        '⚖ The bailiffs take {asset} against the debt.',
        { asset: FB.dataParam('holding', bestId) }));
    } else if (plots.length) {
      plots.splice(0, 1);
      value = FB.landPlotCost ? FB.landPlotCost() : 120;
      FB.news(state, FB.msg('news.finance.distraint_plot',
        '⚖ The bailiffs mark off a family plot against the debt.', {}));
    } else {
      return 0;
    }
    let remaining = value;
    for (const loan of defaultedLoans(state)) {
      if (remaining <= 0) break;
      const applied = Math.min(remaining, FB.financeDueNow(state, loan));
      reduceLoanFace(state, loan, applied);
      remaining -= applied;
    }
    return value;
  }
  FB.fns.finance_in_default = function (state) {
    const p = state.player;
    if (p.tier > 2) return false;
    const grace = FBDATA.balance.distraintGraceDays || 90;
    for (const loan of defaultedLoans(state)) {
      if (loan.defaultTurn !== undefined && state.turn - loan.defaultTurn >= grace) return true;
    }
    return false;
  };
  FB.fns.distraint_can_settle = function (state) {
    return FB.fns.finance_in_default(state) && FB.financeCanSettleDefault(state);
  };
  FB.fns.distraint_settle = function (state) {
    return FB.settleFinanceDefault(state);
  };
  FB.fns.distraint_can_yield = function (state) {
    return FB.holdingList(state).length > 0 || FB.landPlots(state).length > 0;
  };
  /* the voluntary version: one asset handed over quietly, no writ served */
  FB.fns.distraint_yield_one = function (state) {
    if (!FB.fns.distraint_can_yield(state)) return;
    seizeOneAsset(state);
    if (totalDefaultDue(state) <= 0.01) {
      FB.news(state, FB.msg('news.finance.distraint_cleared',
        '⚖ The distraint is satisfied; what is left is yours again.', {}));
    }
  };
  /* the sentence served: bailiffs take what they find until the book-debt is
     covered — and if nothing is left to take, the bondage court sits next */
  FB.fns.distraint_seize = function (state) {
    const p = state.player;
    delete p.flags.debt_distraint;
    let guard = 0;
    while (totalDefaultDue(state) > 0.01 && guard++ < 50) {
      if (!seizeOneAsset(state)) break;
    }
    if (totalDefaultDue(state) <= 0.01) {
      FB.news(state, FB.msg('news.finance.distraint_cleared',
        '⚖ The distraint is satisfied; what is left is yours again.', {}));
    } else {
      const eventId = p.tier === 2 ? 'manor_forfeit' :
        (p.tier === 1 ? 'bondage_sentence' : 'debt_labor_sentence');
      FB.queueEvent(state, eventId, {});
    }
  };
  /* One settlement handler, three station-specific scenes: manor forfeiture,
     enserfment, or extraordinary labor at the serf floor. */
  FB.fns.bondage_submit = function (state) {
    const p = state.player;
    for (const loan of defaultedLoans(state)) { loan.status = 'settled'; loan.face = 0; }
    delete p.flags.debt_distraint;
    if (p.tier === 2) {
      p.manor = null;
      FB.setPlayerTier(state, 1);
      FB.news(state, FB.msg('news.economy.bondage_gentry',
        '⛓ The manor passes to the creditor. The debt is extinguished, and the family falls to freeholder.', {}));
    } else if (p.tier === 1) {
      FB.setPlayerTier(state, 0, { tenureFormationReason: 'debt_bondage' });
      FB.news(state, FB.msg('news.economy.bondage',
        '⛓ The court binds your family to the land for the debt. You are the lord’s now, body and plow.', {}));
    } else {
      p.prestige = Math.max(0, p.prestige - 5);
      FB.news(state, FB.msg('news.economy.bondage_serf',
        '⛓ Extraordinary labor in the lord’s fields clears the debt without changing the family’s station.', {}));
    }
  };
  /* flight preserves freedom and tier — but the debt and the default travel
     with the family, and the lenders have long memories */
  FB.fns.bondage_flee = function (state) {
    const p = state.player;
    delete p.flags.debt_distraint;
    p.prestige = Math.max(0, p.prestige - 5);
    FB.movePlayerRandom(state);
  };

  FB.tradePartnershipName = function (state) {
    const c = state.chars[state.player.charId];
    return c ? FB.faithDataText(state, c.id, c.religion,
      'words.partnership', {}) : FB.T('Trade partnership');
  };

  function hasTradeHouse(state) {
    for (const enterprise of FB.enterpriseList(state)) {
      if (enterprise.type === 'trade_house_business') return true;
    }
    return false;
  }

  function tradeVentureDef() {
    return FBDATA.finance && FBDATA.finance.tradeVenture;
  }

  function tradeVentureNumber(value, fallback) {
    const number = Number(value);
    return value !== undefined && isFinite(number) ? number : fallback;
  }

  function tradeVentureLimit() {
    const def = tradeVentureDef();
    return Math.max(0, Math.floor(tradeVentureNumber(
      def && def.activeLimit, 1)));
  }

  FB.tradeVentureStakes = function () {
    const def = tradeVentureDef();
    const source = def && Array.isArray(def.stakes) ? def.stakes : [10,20,50];
    const out = [];
    for (let i = 0; i < source.length; i++) {
      const stake = Math.floor(Number(source[i]) || 0);
      if (stake > 0 && out.indexOf(stake) < 0) out.push(stake);
    }
    out.sort(function (a, b) { return a - b; });
    return out;
  };

  FB.tradeVentureGoods = function (state, stake) {
    const out = [];
    const goods = FBDATA.marketGoods || {};
    const county = FB.marketCounty ? FB.marketCounty(state,
      state.player.provinceId) : null;
    for (const id in goods) {
      const price = FB.marketPrice ? FB.marketPrice(state,
        state.player.provinceId, id) : 1;
      const quantity = Math.max(0, Number(stake) || 0) / price;
      const stock = county && county.goods[id] ? county.goods[id].stock : Infinity;
      out.push({
        id:id, def:goods[id], price:price, quantity:quantity,
        stock:stock, available:stock + 0.0001 >= quantity
      });
    }
    out.sort(function (a, b) {
      return (Number(a.def.order) || 0) - (Number(b.def.order) || 0) ||
        (a.id < b.id ? -1 : 1);
    });
    return out;
  };

  FB.activeTradeVentures = function (state) {
    const out = FB.financeActiveTradeVentures(state).slice();
    const travel = state && state.player && state.player.travel;
    if (travel) {
      if (travel.venture && travel.venture.kind === 'trade_venture' &&
          travel.venture.status === 'active') {
        out.push(travel.venture);
      }
      if (travel.returnVenture &&
          travel.returnVenture.kind === 'trade_venture_return' &&
          travel.returnVenture.status === 'active') {
        out.push(travel.returnVenture);
      }
    }
    return out;
  };

  FB.tradeVentureActive = function (state) {
    const active = FB.activeTradeVentures(state);
    return active.length ? active[0] : null;
  };

  FB.tradeVentureEligible = function (state, mode) {
    if (!state || !state.player) return FB.T('No household is ready to trade.');
    const p = state.player;
    const c = state.chars[p.charId];
    if (!c || FB.ageOf(c, state.date.year) < 16) {
      return FB.T('Only an adult can form a trade venture.');
    }
    if (p.tier < 1 || p.tier > 2) {
      return FB.T('Only freeholders and gentry can form a trade venture.');
    }
    if (p.travel) return FB.T('A traveler cannot organize another venture.');
    if (p.flags && p.flags.in_prison) {
      return FB.T('A prisoner cannot organize a trade venture.');
    }
    if (FB.atWarPersonally(state)) {
      return FB.T('You cannot form a trade venture while personally at war.');
    }
    if (FB.activeTradeVentures(state).length >= tradeVentureLimit()) {
      return FB.T('The household already has an active self-founded venture.');
    }
    if (mode === 'accompany' && FB.travelEligible) {
      const travelEligible = FB.travelEligible(state);
      if (travelEligible !== true) return travelEligible;
    }
    return true;
  };

  FB.tradeVentureMarkets = function (state, destinationId) {
    const def = tradeVentureDef() || {};
    if (!FB.developedMarketDestinations) return [];
    return FB.developedMarketDestinations(state,
      tradeVentureNumber(def.minDevelopment, 4), {
      purpose:'trade',
      ignoreHistory:true,
      overheadOnly:true,
      destinationId:destinationId
    });
  };

  function tradeVentureMarket(state, destinationId) {
    const markets = FB.tradeVentureMarkets(state, destinationId);
    for (let i = 0; i < markets.length; i++) {
      if (markets[i].destinationId === destinationId) return markets[i];
    }
    return null;
  }

  function tradeVentureBands(def, strategy) {
    const fallback = {
      cautious:[
        { below:0.10, outcome:'loss', multiplier:0 },
        { below:0.30, outcome:'partial', multiplier:0.75 },
        { below:0.95, outcome:'profit', multiplier:1.25 },
        { outcome:'exceptional', multiplier:1.60 }
      ],
      bold:[
        { below:0.25, outcome:'loss', multiplier:0 },
        { below:0.40, outcome:'partial', multiplier:0.50 },
        { below:0.93, outcome:'profit', multiplier:1.70 },
        { outcome:'exceptional', multiplier:2.75 }
      ]
    };
    const source = def && def.outcomes && Array.isArray(def.outcomes[strategy])
      ? def.outcomes[strategy] : fallback[strategy];
    const out = [];
    for (let i = 0; i < source.length; i++) {
      const item = source[i] || {};
      const band = {
        outcome:String(item.outcome || (i === 0 ? 'loss' : 'profit')),
        multiplier:Math.max(0, Number(item.multiplier) || 0)
      };
      if (item.below !== undefined && isFinite(Number(item.below))) {
        band.below = FB.clamp(Number(item.below), 0, 1);
      }
      out.push(band);
    }
    return out.length ? out : fallback[strategy];
  }

  function tradeVentureStrategyPreview(def, strategy, modifier) {
    const bands = tradeVentureBands(def, strategy);
    const probabilities = [];
    let previous = 0;
    let lossChance = 0;
    for (let i = 0; i < bands.length; i++) {
      const band = bands[i];
      const limit = band.below === undefined
        ? 1 : FB.clamp(band.below - modifier, 0, 1);
      const probability = Math.max(0, limit - previous);
      probabilities.push(probability);
      if (band.multiplier === 0) lossChance += probability;
      previous = Math.max(previous, limit);
    }
    return {
      strategy:strategy,
      bands:bands,
      probabilities:probabilities,
      lossChance:FB.clamp(lossChance, 0, 1)
    };
  }

  FB.tradeVenturePreview = function (state, stake, destinationId, goodId) {
    const def = tradeVentureDef();
    stake = Math.floor(Number(stake) || 0);
    if (!def || FB.tradeVentureStakes().indexOf(stake) < 0) return null;
    const market = tradeVentureMarket(state, destinationId);
    if (!market) return null;
    const commodity = goodId && FBDATA.marketGoods && FBDATA.marketGoods[goodId];
    const originId = state.player.provinceId;
    const originPrice = commodity && FB.marketPrice ?
      FB.marketPrice(state, originId, goodId) : 1;
    const destinationPrice = commodity && FB.marketPrice ?
      FB.marketPrice(state, destinationId, goodId) : 1;
    const quantity = commodity ? stake / originPrice : null;
    const originMarket = commodity && FB.marketCounty ?
      FB.marketCounty(state, originId) : null;
    const originStock = originMarket && originMarket.goods[goodId] ?
      originMarket.goods[goodId].stock : Infinity;
    const mods = def.modifiers || {};
    const c = state.chars[state.player.charId];
    const career = currentCareer(state);
    const stewardship = FB.skillOf(c, 'ste') /
      Math.max(1, tradeVentureNumber(mods.stewardshipDivisor, 200));
    let guild = 0;
    if (career && (career.profession === 'merchant' ||
        career.profession === 'craftsman')) {
      guild = (FB.guildIncomeMultiplier(career) - 1) /
        Math.max(1, tradeVentureNumber(mods.guildDivisor, 2));
    }
    const tradeHouse = hasTradeHouse(state)
      ? tradeVentureNumber(mods.tradeHouse, 0.03) : 0;
    const specialization = FB.careerSpecialization(state, c);
    const specializationTrade = specialization && specialization.fx
      ? tradeVentureNumber(specialization.fx.tradeVenture, 0) : 0;
    const nationalTrade = Math.max(0,
      FB.techBonus ? FB.techBonus(state, 'trade') : 0);
    const householdRaw = stewardship + guild + tradeHouse + specializationTrade +
      nationalTrade;
    const household = Math.min(
      Math.max(0, tradeVentureNumber(mods.householdBonusCap, 0.20)),
      householdRaw);
    const destinationDevelopment = Number(market.development) || 1;
    const destination = Math.min(
      Math.max(0, tradeVentureNumber(mods.destinationDevelopmentCap, 0.08)),
      destinationDevelopment /
        Math.max(1, tradeVentureNumber(
          mods.destinationDevelopmentDivisor, 100)));
    const routeRisk = Math.min(
      Math.max(0, tradeVentureNumber(mods.routeRiskCap, 0.12)),
      market.legs * Math.max(0,
        tradeVentureNumber(mods.routeRiskPerLeg, 0.006)));
    const modifier = household + destination - routeRisk;
    const timing = def.timing || {};
    const durationDays = Math.max(
      Math.max(1, tradeVentureNumber(timing.minimumDays, 90)),
      Math.max(0, tradeVentureNumber(timing.preparationDays, 30)) +
        market.days * 2);
    const dueTurn = state.turn + Math.ceil(durationDays);
    return {
      stake:stake,
      goodId:commodity ? goodId : null,
      originId:originId,
      originPrice:originPrice,
      destinationPrice:destinationPrice,
      quantity:quantity,
      originStock:originStock,
      stockAvailable:!commodity || originStock + 0.0001 >= quantity,
      destinationId:market.destinationId,
      destinationRealm:market.destinationRealm || null,
      route:market.route.slice(),
      legs:market.legs,
      oneWayDays:market.days,
      roundTripDays:market.days * 2,
      legDays:market.legDays,
      overhead:market.cost,
      totalCost:stake + market.cost,
      durationDays:Math.ceil(durationDays),
      dueTurn:dueTurn,
      dueDate:FB.dateAtTurn(state, dueTurn),
      development:destinationDevelopment,
      modifiers:{
        stewardship:stewardship,
        guild:guild,
        tradeHouse:tradeHouse,
        specialization:specializationTrade,
        nationalTrade:nationalTrade,
        householdRaw:householdRaw,
        household:household,
        destination:destination,
        routeRisk:routeRisk,
        total:modifier
      },
      strategies:{
        cautious:tradeVentureStrategyPreview(def, 'cautious', modifier),
        bold:tradeVentureStrategyPreview(def, 'bold', modifier)
      }
    };
  };

  FB.tradeVentureCanStart = function (state, mode, stake, destinationId, goodId) {
    const eligible = FB.tradeVentureEligible(state, mode);
    if (eligible !== true) return eligible;
    const preview = FB.tradeVenturePreview(state, stake, destinationId, goodId);
    if (!preview) return FB.T('That stake or market is not available.');
    if (state.player.gold + 0.000001 < preview.totalCost) {
      return FB.T('The stake and route overhead cost {money:cost}; you have {money:gold}.', {
        cost:preview.totalCost, gold:Math.floor(state.player.gold)
      });
    }
    if (goodId && !preview.goodId) return FB.T('That commodity is not available.');
    if (!preview.stockAvailable) {
      return FB.T('The origin market cannot supply that quantity of {good}.', {
        good:FB.dataText ? FB.dataText(state, state.player.charId,
          'marketGood', goodId, FBDATA.marketGoods[goodId], 'name', {}) :
          FBDATA.marketGoods[goodId].name
      });
    }
    if (mode === 'accompany') {
      const choices = FB.travelDestinations ? FB.travelDestinations(state, 'trade') : [];
      let found = false;
      for (let i = 0; i < choices.length; i++) {
        if (choices[i].destinationId === destinationId) { found = true; break; }
      }
      if (!found) {
        return FB.T('This character has already completed a trade journey to that market.');
      }
    }
    return true;
  };

  FB.startTradeVenture = function (state, stake, destinationId, strategy, source, goodId) {
    if (strategy !== 'cautious' && strategy !== 'bold') return null;
    if (FB.tradeVentureCanStart(state, 'dispatch', stake, destinationId, goodId) !== true) {
      return null;
    }
    const preview = FB.tradeVenturePreview(state, stake, destinationId, goodId);
    const selected = preview.strategies[strategy];
    const e = FB.ensureEconomy(state);
    const inv = {
      id:e.nextId++,
      kind:'trade_venture',
      goodId:preview.goodId,
      originId:preview.originId,
      originPrice:preview.originPrice,
      quantity:preview.quantity,
      destinationId:preview.destinationId,
      destinationRealm:preview.destinationRealm,
      route:preview.route.slice(),
      legs:preview.legs,
      legDays:preview.legDays,
      destinationDevelopment:preview.development,
      strategy:strategy,
      stake:preview.stake,
      overhead:preview.overhead,
      durationDays:preview.durationDays,
      dueTurn:preview.dueTurn,
      dueDate:preview.dueDate,
      modifiers:preview.modifiers,
      bands:selected.bands,
      lossChance:selected.lossChance,
      source:String(source || 'finance'),
      status:'active'
    };
    if (preview.goodId && !FB.marketTakeStock(state, preview.originId,
        preview.goodId, preview.quantity)) return null;
    e.investments.push(inv);
    state.player.gold -= preview.totalCost;
    const destination = FB.world.byId[preview.destinationId];
    FB.news(state, FB.msg('news.finance.trade_venture_started',
      '🧭 The household dispatches {money:stake} to {destination}; {money:overhead} pays the road.', {
        stake:preview.stake,
        overhead:preview.overhead,
        destination:destination ? destination.name : preview.destinationId
      }));
    return inv;
  };

  FB.tradeVentureReturnEligible = function (state) {
    if (!state || !state.player) return FB.T('No traveler is ready to trade.');
    const p = state.player;
    const t = p.travel;
    if (!t || t.phase !== 'arrived' || t.purpose !== 'trade') {
      return FB.T('You must reach a trade venture market first.');
    }
    if (t.returnVenture) {
      return FB.T('You have already loaded return cargo for the journey home.');
    }
    if (p.flags && p.flags.in_prison) {
      return FB.T('A prisoner cannot organize return cargo.');
    }
    if (FB.atWarPersonally(state)) {
      return FB.T('You cannot purchase return cargo while personally at war.');
    }
    return true;
  };

  FB.tradeVentureReturnGoods = function (state, stake) {
    const out = [];
    const t = state && state.player && state.player.travel;
    if (!t) return out;
    const goods = FBDATA.marketGoods || {};
    const destId = t.destinationId || t.currentId;
    const homeId = t.homeId;
    const destCounty = FB.marketCounty ? FB.marketCounty(state, destId) : null;
    for (const id in goods) {
      const destPrice = FB.marketPrice ? FB.marketPrice(state, destId, id) : 1;
      const homePrice = FB.marketPrice ? FB.marketPrice(state, homeId, id) : 1;
      const quantity = Math.max(0, Number(stake) || 0) / destPrice;
      const stock = destCounty && destCounty.goods[id] ? destCounty.goods[id].stock : Infinity;
      out.push({
        id:id,
        def:goods[id],
        destPrice:destPrice,
        homePrice:homePrice,
        priceRatio:destPrice > 0 ? homePrice / destPrice : 1,
        quantity:quantity,
        stock:stock,
        available:stock + 0.0001 >= quantity
      });
    }
    out.sort(function (a, b) {
      return (Number(a.def.order) || 0) - (Number(b.def.order) || 0) ||
        (a.id < b.id ? -1 : 1);
    });
    return out;
  };

  FB.tradeVentureReturnPreview = function (state, stake, goodId) {
    const def = tradeVentureDef();
    stake = Math.floor(Number(stake) || 0);
    if (!def || FB.tradeVentureStakes().indexOf(stake) < 0) return null;
    const t = state && state.player && state.player.travel;
    if (!t || t.phase !== 'arrived' || t.purpose !== 'trade') return null;
    const destId = t.destinationId || t.currentId;
    const homeId = t.homeId;
    const commodity = goodId && FBDATA.marketGoods && FBDATA.marketGoods[goodId];
    if (!commodity) return null;
    const destPrice = FB.marketPrice ? FB.marketPrice(state, destId, goodId) : 1;
    const homePrice = FB.marketPrice ? FB.marketPrice(state, homeId, goodId) : 1;
    const quantity = stake / destPrice;
    const destCounty = FB.marketCounty ? FB.marketCounty(state, destId) : null;
    const destStock = destCounty && destCounty.goods[goodId] ? destCounty.goods[goodId].stock : Infinity;
    const retDef = def.returnCargo || {};
    const ladingRate = tradeVentureNumber(retDef.ladingFeeRate, 0.10);
    const ladingFee = Math.round(stake * ladingRate * 100) / 100;
    const totalCost = stake + ladingFee;
    const cautiousMult = tradeVentureNumber(retDef.cautiousMultiplier, 1.20);
    const boldSuccessMult = tradeVentureNumber(retDef.boldSuccessMultiplier, 2.25);
    const boldFailureMult = tradeVentureNumber(retDef.boldFailureMultiplier, 0.35);
    const boldChance = FB.namedChance ? FB.namedChance(state, 'travel_trade') : 0.60;
    const charterBonus = FB.marketCharterReturnBonus ? FB.marketCharterReturnBonus(
      state, goodId, destId, homeId, t.outboundRoute) : 0;
    const baseUnitReturnCautious = homePrice * cautiousMult * (1 + charterBonus);
    const baseUnitReturnBoldSuccess = homePrice * boldSuccessMult * (1 + charterBonus);
    const baseUnitReturnBoldFailure = homePrice * boldFailureMult * (1 + charterBonus);

    return {
      stake:stake,
      goodId:goodId,
      destId:destId,
      homeId:homeId,
      destPrice:destPrice,
      homePrice:homePrice,
      priceRatio:destPrice > 0 ? homePrice / destPrice : 1,
      quantity:quantity,
      destStock:destStock,
      stockAvailable:destStock + 0.0001 >= quantity,
      ladingFee:ladingFee,
      totalCost:totalCost,
      charterBonus:charterBonus,
      cautiousMultiplier:cautiousMult,
      boldSuccessMultiplier:boldSuccessMult,
      boldFailureMultiplier:boldFailureMult,
      boldChance:boldChance,
      estimatedPayoutCautious:Math.round(quantity * baseUnitReturnCautious * 100) / 100,
      estimatedPayoutBoldSuccess:Math.round(quantity * baseUnitReturnBoldSuccess * 100) / 100,
      estimatedPayoutBoldFailure:Math.round(quantity * baseUnitReturnBoldFailure * 100) / 100
    };
  };

  FB.tradeVentureCanLoadReturn = function (state, stake, goodId) {
    const eligible = FB.tradeVentureReturnEligible(state);
    if (eligible !== true) return eligible;
    const preview = FB.tradeVentureReturnPreview(state, stake, goodId);
    if (!preview) return FB.T('That return cargo is not available.');
    if (state.player.gold + 0.000001 < preview.totalCost) {
      return FB.T('The return stake and lading fee cost {money:cost}; you have {money:gold}.', {
        cost:preview.totalCost, gold:Math.floor(state.player.gold)
      });
    }
    if (!preview.stockAvailable) {
      return FB.T('The market cannot supply that quantity of {good}.', {
        good:FB.dataText ? FB.dataText(state, state.player.charId,
          'marketGood', goodId, FBDATA.marketGoods[goodId], 'name', {}) :
          FBDATA.marketGoods[goodId].name
      });
    }
    return true;
  };

  FB.loadTradeVentureReturn = function (state, stake, goodId, strategy) {
    if (strategy !== 'cautious' && strategy !== 'bold') return null;
    if (FB.tradeVentureCanLoadReturn(state, stake, goodId) !== true) return null;
    const preview = FB.tradeVentureReturnPreview(state, stake, goodId);
    if (!preview) return null;
    const t = state.player.travel;
    if (!t) return null;
    if (!FB.marketTakeStock(state, preview.destId, preview.goodId, preview.quantity)) {
      return null;
    }
    state.player.gold -= preview.totalCost;
    const ret = {
      kind:'trade_venture_return',
      goodId:preview.goodId,
      originId:preview.destId,
      destinationId:preview.homeId,
      destPrice:preview.destPrice,
      homePrice:preview.homePrice,
      quantity:preview.quantity,
      stake:preview.stake,
      ladingFee:preview.ladingFee,
      totalCost:preview.totalCost,
      strategy:strategy,
      charterBonus:preview.charterBonus,
      loadedTurn:state.turn,
      status:'active'
    };
    t.returnVenture = ret;
    const dest = FB.world.byId[preview.destId];
    const goodDef = FBDATA.marketGoods[preview.goodId];
    const goodName = goodDef ? (FB.dataText ? FB.dataText(state, state.player.charId, 'marketGood', preview.goodId, goodDef, 'name', {}) : goodDef.name) : preview.goodId;
    FB.news(state, FB.msg('news.travel.trade_return_cargo_loaded',
      '🧭 Loaded {quantity} units of {good} in {destination} for the return journey ({money:stake} stake, {money:fee} lading fee).', {
        quantity:Math.round(preview.quantity * 10) / 10,
        good:goodName,
        destination:dest ? dest.name : preview.destId,
        stake:preview.stake,
        fee:preview.ladingFee
      }));
    return ret;
  };

  FB.resolveReturnTradeVenture = function (state, travel) {
    if (!travel || !travel.returnVenture || travel.returnVenture.status !== 'active') {
      return false;
    }
    const ret = travel.returnVenture;
    const def = tradeVentureDef();
    const retDef = (def && def.returnCargo) || {};
    const cautiousMult = tradeVentureNumber(retDef.cautiousMultiplier, 1.20);
    const boldSuccessMult = tradeVentureNumber(retDef.boldSuccessMultiplier, 2.25);
    const boldFailureMult = tradeVentureNumber(retDef.boldFailureMultiplier, 0.35);

    let outcome, multiplier;
    if (ret.strategy === 'cautious') {
      outcome = 'cautious';
      multiplier = cautiousMult;
    } else {
      const boldChance = FB.namedChance ? FB.namedChance(state, 'travel_trade') : 0.60;
      const roll = FB.rng();
      ret.roll = roll;
      if (roll < boldChance) {
        outcome = 'bold_success';
        multiplier = boldSuccessMult;
      } else {
        outcome = 'bold_failure';
        multiplier = boldFailureMult;
      }
    }

    const homeId = travel.homeId;
    const liveHomePrice = FB.marketPrice ? FB.marketPrice(state, homeId, ret.goodId) : 1;
    const charter = FB.marketCharterReturnBonus ? FB.marketCharterReturnBonus(
      state, ret.goodId, ret.originId, homeId, travel.outboundRoute) : 0;
    const payout = Math.round(ret.quantity * liveHomePrice * multiplier *
      (1 + charter) * 100) / 100;
    const deliveredQuantity = ret.quantity * Math.min(1, Math.max(0, multiplier));

    ret.arrivalPrice = liveHomePrice;
    ret.charterBonus = charter;
    ret.deliveredQuantity = deliveredQuantity;
    ret.outcome = outcome;
    ret.multiplier = multiplier;
    ret.payout = payout;
    ret.status = 'resolved';
    ret.resolvedTurn = state.turn;

    if (FB.marketDeliverStock) {
      FB.marketDeliverStock(state, homeId, ret.goodId, deliveredQuantity);
    }
    state.player.gold += payout;

    const me = state.chars[state.player.charId];
    if (me && payout > ret.totalCost && FB.gainSkill) {
      FB.gainSkill(me, 'ste', 1);
    }

    const home = FB.world.byId[homeId];
    const goodDef = FBDATA.marketGoods[ret.goodId];
    const goodName = goodDef ? (FB.dataText ? FB.dataText(state, state.player.charId, 'marketGood', ret.goodId, goodDef, 'name', {}) : goodDef.name) : ret.goodId;

    FB.news(state, FB.msg('news.travel.trade_return_cargo_settled', {
      forms: {
        select:'value', param:'outcome', cases:{
          bold_failure:'🌊 The return cargo of {good} suffered spoilage and loss on the road home; {money:payout} is salvaged at {home}.',
          cautious:'🧭 Returned safely to {home} and sold the return cargo of {good} for {money:payout}.',
          bold_success:'✨ The return cargo of {good} found a hungry market in {home}, returning {money:payout}.',
          other:'🧭 The return cargo of {good} is sold at {home} for {money:payout}.'
        }
      }
    }, {
      outcome:outcome,
      payout:payout,
      good:goodName,
      home:home ? home.name : homeId
    }));
    return payout;
  };

  FB.tradeInvestmentStakes = function (state) {
    const partnership = FBDATA.finance && FBDATA.finance.tradePartnership;
    if (partnership && partnership.requiresTech &&
        !FB.techRequirementMet(state, partnership.requiresTech)) return [];
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
    if (FB.financeActivePartnerships(state).length >=
      (FBDATA.balance.financeMaxInvestments || 3)) return false;
    if (state.player.gold < stake) return false;
    return FB.tradeInvestmentStakes(state).indexOf(stake) >= 0;
  };

  FB.startTradeInvestment = function (state, stake, source) {
    stake = Math.floor(Number(stake) || 0);
    const eventOffer = source === 'caravan_event' &&
      (stake === 20 || stake === 50) &&
      FB.financeActivePartnerships(state).length <
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

  function maturePartnership(state, inv) {
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

  FB.resolveTradeVenture = function (state, inv) {
    if (!inv || inv.kind !== 'trade_venture' || inv.status !== 'active' ||
        state.turn < inv.dueTurn) return false;
    const roll = FB.rng();
    const modifier = inv.modifiers && isFinite(Number(inv.modifiers.total))
      ? Number(inv.modifiers.total) : 0;
    const adjustedRoll = roll + modifier;
    const bands = Array.isArray(inv.bands) && inv.bands.length
      ? inv.bands : tradeVentureBands(tradeVentureDef(), inv.strategy);
    let selected = bands[bands.length - 1];
    for (let i = 0; i < bands.length; i++) {
      if (bands[i].below === undefined || adjustedRoll < bands[i].below) {
        selected = bands[i];
        break;
      }
    }
    const outcomeMultiplier = Math.max(0, Number(selected.multiplier) || 0);
    let payout;
    if (inv.goodId && isFinite(Number(inv.quantity)) && FB.marketPrice) {
      const livePrice = FB.marketPrice(state, inv.destinationId, inv.goodId);
      const charter = FB.marketCharterReturnBonus ? FB.marketCharterReturnBonus(
        state, inv.goodId, inv.originId, inv.destinationId, inv.route) : 0;
      payout = Math.round(inv.quantity * livePrice * outcomeMultiplier *
        (1 + charter) * 100) / 100;
      inv.arrivalPrice = livePrice;
      inv.charterBonus = charter;
      inv.deliveredQuantity = inv.quantity * Math.min(1, outcomeMultiplier);
      if (FB.marketDeliverStock) FB.marketDeliverStock(state, inv.destinationId,
        inv.goodId, inv.deliveredQuantity);
    } else {
      payout = Math.round(inv.stake * outcomeMultiplier * 100) / 100;
    }
    const outcome = String(selected.outcome || 'profit');
    /* Commit the sole seeded roll and its result before touching the purse or
       publishing the Chronicle entry. Reloads cannot reroll or double-pay. */
    inv.roll = roll;
    inv.adjustedRoll = adjustedRoll;
    inv.outcome = outcome;
    inv.multiplier = outcomeMultiplier;
    inv.payout = payout;
    inv.status = 'resolved';
    inv.resolvedTurn = state.turn;
    state.player.gold += payout;
    const destination = FB.world.byId[inv.destinationId];
    FB.news(state, FB.msg('news.finance.trade_venture_matured', {
      forms: {
        select:'value', param:'outcome', cases:{
          loss:'🌊 The household’s venture to {destination} is lost with every coin invested.',
          partial:'🧭 The venture to {destination} limps home with {money:payout}.',
          profit:'🧭 The venture to {destination} returns {money:payout}.',
          exceptional:'✨ The venture to {destination} returns a remarkable {money:payout}.',
          other:'🧭 The household’s venture to {destination} is resolved.'
        }
      }
    }, {
      outcome:outcome,
      payout:payout,
      destination:destination ? destination.name : inv.destinationId
    }));
    return true;
  };

  FB.financeDay = function (state) {
    /* New games and restored saves already carry a normalized economy. The
       overwhelmingly common no-investment day has no finance work to do, so
       do not rescan loan and investment ids ninety times per skipped season. */
    if (state.economy && Array.isArray(state.economy.investments)) {
      let due = false;
      for (let i = 0; i < state.economy.investments.length; i++) {
        const saved = state.economy.investments[i];
        if (saved && saved.status === 'active' &&
            saved.kind === 'trade_venture' && saved.dueTurn <= state.turn) {
          due = true;
          break;
        }
      }
      if (!due) return;
    }
    const e = FB.ensureEconomy(state);
    if (!e.investments.length) return; // nothing to build, nothing falls due
    const ventures = [];
    for (let i = 0; i < e.investments.length; i++) {
      const investment = e.investments[i];
      if (investment.status === 'active' &&
          investment.kind === 'trade_venture') ventures.push(investment);
    }
    ventures.sort(function (a, b) { return a.id - b.id; });
    for (let i = 0; i < ventures.length; i++) {
      if (ventures[i].dueTurn <= state.turn) FB.resolveTradeVenture(state, ventures[i]);
    }
  };

  FB.financeSeason = function (state) {
    /* This boundary owns one normalization pass. Its helpers operate on the
       returned record so a new year cannot rescan the same loan and
       investment collections several times in one fast-forwarded day. */
    const e = FB.ensureEconomy(state);
    collectAssignedRevenue(state, e);
    const loans = activeLoans(e);
    for (const loan of loans) processLoan(state, loan, e);
    const investments = activePartnerships(e);
    for (const inv of investments) maturePartnership(state, inv);
    return e;
  };

  FB.financeYear = function (state, economy) {
    const e = economy || FB.ensureEconomy(state);
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
    e.pressure = e.pressure * (B.pricePressurePersistence || 0.55) +
      random + shock;
    const raw = e.pressure + (1 - e.price) * (B.priceMeanReversion || 0.04);
    const minRate = shock ? (B.priceShockMin || -0.12) : (B.priceAnnualMin || -0.03);
    const maxRate = shock ? (B.priceShockMax || 0.15) : (B.priceAnnualMax || 0.04);
    const rate = FB.clamp(raw, minRate, maxRate);
    const oldPrice = e.price;
    const oldGold = state.player.gold;
    const newPrice = FB.clamp(oldPrice * (1 + rate),
      B.priceMin || 0.5, B.priceMax || 3);
    /* Only coin in hand is revalued. A negative balance is a real household
       shortfall rather than nominal cash or a signed debt contract. */
    if (state.player.gold > 0) state.player.gold *= oldPrice / newPrice;
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
    return FB.techRequirementMet(state, 'mint_assay') &&
      state.player.tier >= 6 && !state.player.liege &&
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
    if (FB.councilMembers) {
      for (const member of FB.councilMembers(state)) {
        FB.adjustStanding(state, { kind:'realm', id:member.rid }, -8,
          'finance:debasement');
      }
    }
    FB.news(state, FB.msg('news.finance.debasement',
      '💰 The crown debases the coinage and takes {money:gold} in seigniorage. Prices and confidence suffer.',
      { gold:preview.gold }));
    return true;
  };

  FB.financeCanRecoin = function (state) {
    const e = FB.ensureEconomy(state);
    const cost = Math.max(30, Math.round((FB.playerTax ? FB.playerTax(state) : 15) * 2));
    return FB.techRequirementMet(state, 'mint_assay') &&
      state.player.tier >= 6 && !state.player.liege && e.debasements > e.recoinages &&
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
    return FB.financeActivePartnerships(state).length <
      (FBDATA.balance.financeMaxInvestments || 3);
  };
  FB.fns.finance_trade_20 = function (state) {
    FB.startTradeInvestment(state, 20, 'caravan_event');
  };
  FB.fns.finance_trade_50 = function (state) {
    FB.startTradeInvestment(state, 50, 'caravan_event');
  };
})();
