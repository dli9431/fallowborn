'use strict';

const { test, expect } = require('../support/fixture');
const { openGame, startDeterministicGame } = require('../support/game');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('learned trainees become Lettered but remain trainees until examined',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const me = state.chars[state.player.charId];
      state.player.tier = 1;
      state.player.profession = 'administration';
      me.born = state.date.year - 20;
      me.traits = me.traits.filter(function (id) { return id !== 'literate'; });
      me.career = {
        profession:'administration', rank:'apprentice', experience:0,
        startedYear:state.date.year, guildRank:'none', guildStanding:0,
        chosen:true
      };
      const record = FB.realmTechRecord(state, FB.techRealmId(state));
      if (record.completed.indexOf('bureaucratic_offices') < 0) {
        record.completed.push('bureaucratic_offices');
      }
      const originalChance = FB.chance;
      FB.chance = function () { return false; };
      FB.livelihoodYearly(state);
      const afterOne = {
        experience:me.career.experience,
        rank:me.career.rank,
        lettered:me.traits.indexOf('literate') >= 0
      };
      FB.livelihoodYearly(state);
      FB.chance = originalChance;
      const afterTwo = {
        experience:me.career.experience,
        rank:me.career.rank,
        lettered:me.traits.indexOf('literate') >= 0
      };
      FB.ui.showCareerPicker(me.id);
      const sheet = document.getElementById('gm-body').textContent;
      const examCount = document.querySelectorAll('[data-career-exam]').length;
      me.career = {
        profession:'administration', rank:'master', experience:12,
        startedYear:state.date.year - 12, guildRank:'none', guildStanding:0,
        chosen:true
      };
      const legacyTitle = FB.careerTitle(state, me);
      if (record.completed.indexOf('herbals') < 0) {
        record.completed.push('herbals');
      }
      FB.setCareer(state, me, 'physician');
      return {
        afterOne:afterOne,
        afterTwo:afterTwo,
        examCount:examCount,
        sheet:sheet,
        legacyTitle:legacyTitle,
        legacySpecialization:me.careerHistory.administration.specialization,
        directLearnedRank:me.career.rank
      };
    });

    expect(result.afterOne).toEqual({
      experience:1, rank:'apprentice', lettered:false
    });
    expect(result.afterTwo).toEqual({
      experience:2, rank:'apprentice', lettered:true
    });
    expect(result.examCount).toBe(1);
    expect(result.sheet).toContain('Learned career path');
    expect(result.sheet).toContain('Clerk');
    expect(result.sheet).toContain('Notary');
    expect(result.sheet).toContain('Bailiff');
    expect(result.legacyTitle).toBe('Bailiff');
    expect(result.legacySpecialization).toBe('bailiff');
    expect(result.directLearnedRank).toBe('apprentice');
  });

test('career exams enforce technology, skill-scaled odds, fees, and cooldowns',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const me = state.chars[state.player.charId];
      state.player.tier = 1;
      state.player.profession = 'administration';
      state.player.gold = 100;
      me.born = state.date.year - 20;
      me.traits = ['literate'];
      me.skills = { dip:0, mar:0, ste:4, int:0, lea:4 };
      me.career = {
        profession:'administration', rank:'apprentice', experience:2,
        startedYear:state.date.year - 2, guildRank:'none', guildStanding:0,
        chosen:true
      };
      const record = FB.realmTechRecord(state, FB.techRealmId(state));
      record.completed = record.completed.filter(function (id) {
        return id !== 'bureaucratic_offices';
      });
      const techLocked = FB.careerExamOptions(state, me)[0];
      record.completed.push('bureaucratic_offices');
      const ready = FB.careerExamOptions(state, me)[0];
      const goldBefore = state.player.gold;
      const originalChance = FB.chance;
      FB.chance = function () { return false; };
      const failed = FB.takeCareerExam(state, me, 'license');
      const goldAfter = state.player.gold;
      const immediate = FB.careerExamOptions(state, me)[0];
      const blockedGold = state.player.gold;
      const blockedAttempt = FB.takeCareerExam(state, me, 'license');
      state.turn += FBDATA.balance.careerExamCooldownDays - 1;
      const oneDay = FB.careerExamOptions(state, me)[0];
      state.turn++;
      const cooled = FB.careerExamOptions(state, me)[0];
      me.skills.ste = 100;
      me.skills.lea = 100;
      const capped = FB.careerExamOptions(state, me)[0];
      FB.chance = originalChance;
      return {
        techReady:techLocked.ready,
        techMissing:techLocked.missing.join(' '),
        ready:ready.ready,
        baseChance:ready.chance,
        cost:ready.cost,
        failed:failed,
        goldSpent:goldBefore - goldAfter,
        blockedAttempt:blockedAttempt,
        blockedGoldChanged:state.player.gold !== blockedGold,
        immediate:immediate.cooldownRemaining,
        oneDay:oneDay.cooldownRemaining,
        cooledReady:cooled.ready,
        cappedChance:capped.chance,
        rank:me.career.rank
      };
    });

    expect(result.techReady).toBe(false);
    expect(result.techMissing).toContain('Bureaucratic Offices');
    expect(result.ready).toBe(true);
    expect(result.baseChance).toBeCloseTo(0.55, 8);
    expect(result.failed).toMatchObject({ passed:false });
    expect(result.goldSpent).toBe(result.cost);
    expect(result.blockedAttempt).toBe(false);
    expect(result.blockedGoldChanged).toBe(false);
    expect(result.immediate).toBe(360);
    expect(result.oneDay).toBe(1);
    expect(result.cooledReady).toBe(true);
    expect(result.cappedChance).toBeCloseTo(0.90, 8);
    expect(result.rank).toBe('apprentice');
  });

test('Author qualification creates one preserved event-only family treatise',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      let state = FB.state;
      let me = state.chars[state.player.charId];
      state.player.tier = 1;
      state.player.profession = 'scholar';
      state.player.gold = 200;
      me.born = state.date.year - 24;
      me.traits = ['literate'];
      me.skills = { dip:0, mar:0, ste:0, int:0, lea:8 };
      me.career = {
        profession:'scholar', rank:'journeyman', experience:8,
        startedYear:state.date.year - 8, guildRank:'none', guildStanding:0,
        chosen:true
      };
      const record = FB.realmTechRecord(state, FB.techRealmId(state));
      ['manuscript_codex', 'scriptoria'].forEach(function (id) {
        if (record.completed.indexOf(id) < 0) record.completed.push(id);
      });
      state.player.tier = 3;
      FB.ui.showTechDetail('scriptoria');
      const technologySheet = document.getElementById('gm-body').textContent;
      state.player.tier = 1;
      const originalChance = FB.chance;
      const originalPick = FB.pick;
      FB.chance = function () { return true; };
      FB.pick = function (list) {
        return list.indexOf('book_of_laws') >= 0
          ? 'book_of_laws' : originalPick(list);
      };
      const passed = FB.takeCareerExam(state, me, 'specialization:author');
      FB.chance = originalChance;
      FB.pick = originalPick;
      const ref = me.career.authoredWorkRef;
      const item = FB.resolveItem(state, ref);
      const secondAttempt = FB.takeCareerExam(
        state, me, 'specialization:author');
      const title = FB.careerTitle(state, me);
      FB.setCareer(state, me, 'farmer', 'journeyman');
      const archived = JSON.parse(JSON.stringify(me.careerHistory.scholar));
      const save = JSON.parse(FB.save.serialize());
      FB.save.restore(save);
      state = FB.state;
      me = state.chars[state.player.charId];
      const choice = FB.careerChoices(state, me).filter(function (entry) {
        return entry.id === 'scholar';
      })[0];
      const resumed = FB.beginCareer(state, me, 'scholar');
      const restoredItem = FB.resolveItem(state, me.career.authoredWorkRef);

      const originalItems = FBDATA.items;
      let randomDef = null;
      try {
        FBDATA.items = {
          authored_test:originalItems.book_of_laws,
          ordinary_test:{
            name:'Ordinary test book', icon:'book', rarity:'fine', value:1,
            unique:false, slot:'hand', fx:{}, art:{ kind:'book' }, desc:'Test.'
          }
        };
        const randomRef = FB.lootItem(state, 'fine', 'spoils');
        randomDef = randomRef && state.itemInstances[randomRef].defId;
      } finally {
        FBDATA.items = originalItems;
      }
      return {
        passed:passed,
        secondAttempt:secondAttempt,
        title:title,
        ref:ref,
        itemDef:item.defId,
        eventOnly:item.eventOnly,
        learning:item.fx.lea,
        archived:archived,
        restoredChoice:choice && {
          resuming:choice.resuming,
          specialization:choice.restoredSpecialization,
          cost:choice.cost
        },
        resumed:resumed,
        active:JSON.parse(JSON.stringify(me.career)),
        restoredItemDef:restoredItem && restoredItem.defId,
        randomDef:randomDef,
        technologySheet:technologySheet
      };
    });

    expect(result.passed).toMatchObject({ passed:true });
    expect(result.secondAttempt).toBe(false);
    expect(result.title).toBe('Author');
    expect(result.itemDef).toBe('book_of_laws');
    expect(result.eventOnly).toBe(true);
    expect(result.learning).toBeGreaterThanOrEqual(1);
    expect(result.learning).toBeLessThanOrEqual(3);
    expect(result.archived).toMatchObject({
      profession:'scholar', rank:'master', specialization:'author',
      authoredWorkRef:result.ref
    });
    expect(result.restoredChoice).toEqual({
      resuming:true, specialization:'author', cost:0
    });
    expect(result.resumed).toBe(true);
    expect(result.active).toMatchObject({
      profession:'scholar', rank:'master', specialization:'author',
      authoredWorkRef:result.ref
    });
    expect(result.restoredItemDef).toBe('book_of_laws');
    expect(result.randomDef).toBe('ordinary_test');
    expect(result.technologySheet).toContain('Author');
    expect(result.technologySheet).toContain('Scholarship');
  });

test('household medicine uses only the strongest locally working provider',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const me = state.chars[state.player.charId];
      state.player.tier = 1;
      state.player.profession = 'physician';
      me.born = state.date.year - 25;
      me.career = {
        profession:'physician', rank:'journeyman', experience:4,
        startedYear:state.date.year - 4, guildRank:'none', guildStanding:0,
        chosen:true
      };
      const spouse = FB.makeCharacter(state, {
        name:'Medical spouse', sex:'m', culture:me.culture,
        religion:me.religion, born:state.date.year - 27,
        dyn:me.dyn, role:'spouse', traits:['literate']
      });
      me.spouseId = spouse.id;
      spouse.spouseId = me.id;
      spouse.career = {
        profession:'physician', rank:'master', specialization:'physician',
        experience:10, startedYear:state.date.year - 10,
        guildRank:'none', guildStanding:0, chosen:true
      };
      const retainer = FB.makeCharacter(state, {
        name:'Medical retainer', sex:'f', culture:me.culture,
        religion:me.religion, born:state.date.year - 30,
        dyn:null, role:'retainer', traits:['literate']
      });
      retainer.career = {
        profession:'physician', rank:'master', specialization:'apothecary',
        experience:10, startedYear:state.date.year - 10,
        guildRank:'none', guildStanding:0, chosen:true
      };
      state.player.retainers = [{
        charId:retainer.id, office:'tutor', pay:3,
        startedTurn:state.turn, unpaid:0
      }];
      const strongest = FB.householdMedicalProtection(state);
      spouse.dead = true;
      const afterPhysician = FB.householdMedicalProtection(state);
      state.player.retainers = [];
      const practitioner = FB.householdMedicalProtection(state);
      state.player.travel = { phase:'outbound' };
      const traveling = FB.householdMedicalProtection(state);
      state.player.travel = null;
      state.player.tier = 3;
      const landed = FB.householdMedicalProtection(state);
      return {
        strongest:strongest,
        afterPhysician:afterPhysician,
        practitioner:practitioner,
        traveling:traveling,
        landed:landed
      };
    });

    expect(result.strongest).toBeCloseTo(0.006, 8);
    expect(result.afterPhysician).toBeCloseTo(0.003, 8);
    expect(result.practitioner).toBeCloseTo(0.002, 8);
    expect(result.traveling).toBe(0);
    expect(result.landed).toBe(0);
  });

test('learned specialties pay their formulas and Trade leadership needs literacy',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = FB.state;
      const me = state.chars[state.player.charId];
      state.player.tier = 1;
      state.player.prestige = 200;
      state.player.gold = 500;
      me.born = state.date.year - 28;
      me.traits = ['literate'];
      me.skills = { dip:0, mar:0, ste:9, int:0, lea:8 };
      me.career = {
        profession:'administration', rank:'master', specialization:'notary',
        experience:10, startedYear:state.date.year - 10,
        guildRank:'none', guildStanding:0, chosen:true
      };
      state.player.profession = 'administration';
      const administrationFocus = FB.focuses.filter(function (focus) {
        return focus.id === 'keep_records';
      })[0];
      const administration = administrationFocus.gain(state);
      me.career.specialization = 'bailiff';
      const localRealm = state.player.liege ||
        (state.holder && state.holder[state.player.provinceId]) ||
        (state.owner && state.owner[state.player.provinceId]);
      const localLord = !localRealm || localRealm === 'player'
        ? FB.getRole(state, 'lord', false) : null;
      const liegeTarget = localRealm && localRealm !== 'player'
        ? { kind:'realm', id:localRealm }
        : localLord ? { kind:'character', id:localLord.id } : null;
      const liegeBefore = liegeTarget ? FB.standingOf(state, liegeTarget) : 0;
      const originalChance = FB.chance;
      FB.chance = function () { return false; };
      administrationFocus.tick(state);
      const bailiffStanding = liegeTarget
        ? FB.standingOf(state, liegeTarget) - liegeBefore : null;
      me.career = {
        profession:'physician', rank:'master', specialization:'apothecary',
        experience:10, startedYear:state.date.year - 10,
        guildRank:'none', guildStanding:0, chosen:true
      };
      state.player.profession = 'physician';
      const medicine = FB.focuses.filter(function (focus) {
        return focus.id === 'practice_physic';
      })[0].gain(state);
      me.career = {
        profession:'scholar', rank:'master', specialization:'author',
        experience:10, startedYear:state.date.year - 10,
        guildRank:'none', guildStanding:0, chosen:true
      };
      state.player.profession = 'scholar';
      const scholarlyFocus = FB.focuses.filter(function (focus) {
        return focus.id === 'scholarly_work';
      })[0];
      const scholarship = scholarlyFocus.gain(state);
      const tech = FB.realmTechRecord(state, FB.techRealmId(state));
      tech.active = [];
      tech.reserve = 0;
      scholarlyFocus.tick(state);
      const authorResearch = tech.reserve;
      me.career.specialization = 'astronomer';
      tech.reserve = 0;
      scholarlyFocus.tick(state);
      const astronomerResearch = tech.reserve;
      FB.chance = originalChance;

      me.traits = [];
      me.skills = { dip:0, mar:0, ste:10, int:0, lea:6 };
      me.career = {
        profession:'merchant', rank:'master', experience:12,
        startedYear:state.date.year - 12, guildRank:'master',
        guildStanding:100, chosen:true
      };
      state.player.profession = 'merchant';
      const unletteredOfficer = FB.guildAdvance(state, me);
      me.traits = ['literate'];
      me.skills.lea = 4;
      const letteredOfficer = FB.guildAdvance(state, me);
      me.career.guildRank = 'officer';
      me.skills.ste = 11;
      me.skills.lea = 6;
      FB.ensureInstitutions(state, { silent:true });
      const merchantScope = 'merchant@' + state.player.provinceId;
      state.elections.guildScopes[merchantScope] = {
        profession:'merchant',
        provinceId:state.player.provinceId,
        offices:{
          officer:{
            holderKind:'character', holderId:me.id,
            startTurn:state.turn - 360, endTurn:state.turn + 1080,
            electionId:'test_officer_term'
          }
        }
      };
      const letteredGuildmaster = FB.guildAdvance(state, me);
      me.traits = [];
      me.skills.ste = 10;
      me.career = {
        profession:'craftsman', rank:'master', experience:12,
        startedYear:state.date.year - 12, guildRank:'master',
        guildStanding:100, chosen:true
      };
      state.player.profession = 'craftsman';
      const craftOfficer = FB.guildAdvance(state, me);
      return {
        administration:administration,
        bailiffTarget:liegeTarget,
        bailiffStanding:bailiffStanding,
        medicine:medicine,
        scholarship:scholarship,
        authorResearch:authorResearch,
        astronomerResearch:astronomerResearch,
        unletteredOfficer:unletteredOfficer,
        letteredOfficer:letteredOfficer,
        letteredGuildmaster:letteredGuildmaster,
        craftOfficer:craftOfficer
      };
    });

    expect(result.administration.gold).toBeCloseTo(6.75, 8);
    expect(result.bailiffTarget).toMatchObject({ kind:'realm' });
    expect(result.bailiffStanding).toBeCloseTo(2 / 90, 8);
    expect(result.medicine.gold).toBeCloseTo(19 / 3, 8);
    expect(result.scholarship).toEqual({ gold:3.5, prestige:1 });
    expect(result.authorResearch).toBeCloseTo(2 / 90, 8);
    expect(result.astronomerResearch).toBeCloseTo(3 / 90, 8);
    expect(result.unletteredOfficer).toMatchObject({
      to:'officer', lettered:false, learning:6, blocked:true
    });
    expect(result.letteredOfficer).toMatchObject({
      to:'officer', lettered:true, learning:6, blocked:false
    });
    expect(result.letteredGuildmaster).toMatchObject({
      to:'guildmaster', lettered:true, learning:8, blocked:false
    });
    expect(result.craftOfficer).toMatchObject({
      to:'officer', lettered:true, learning:0, blocked:false
    });
  });

test('guild paths require induction, restore with their career, and gate tagged work',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      let state = FB.state;
      let me = state.chars[state.player.charId];
      const record = FB.realmTechRecord(state, FB.techRealmId(state));
      const addTech = function (id) {
        if (record.completed.indexOf(id) < 0) record.completed.push(id);
      };
      state.player.tier = 1;
      state.player.gold = 50;
      me.born = state.date.year - 30;
      me.skills = { dip:0, mar:0, ste:9, int:0, lea:0 };
      me.career = {
        profession:'craftsman', rank:'master', experience:12,
        startedYear:state.date.year - 12, guildRank:'guildmaster',
        guildStanding:35, chosen:true
      };
      FB.syncPlayerCareer(state);

      record.completed = record.completed.filter(function (id) {
        return id !== 'bloomery_iron';
      });
      const locked = FB.careerSpecializationOptions(state, me).filter(function (option) {
        return option.specialization === 'smith';
      })[0];
      addTech('bloomery_iron');
      const ready = FB.careerSpecializationOptions(state, me).filter(function (option) {
        return option.specialization === 'smith';
      })[0];
      const work = FB.focuses.filter(function (focus) {
        return focus.id === 'craft_work';
      })[0];
      const plainFocusGold = work.gain(state).gold;
      const selected = FB.chooseCareerSpecialization(state, me, 'smith');
      const focusGold = work.gain(state).gold;
      const enterprise = {
        uid:'guild_path_workshop_fixture', type:'workshop_business',
        provinceId:state.player.provinceId, settlement:0, workerId:me.id
      };
      const taggedYield = FB.enterpriseYield(state, enterprise);
      delete me.career.specialization;
      const plainYield = FB.enterpriseYield(state, enterprise);
      me.career.specialization = 'smith';
      const storyGate = {
        career:{ profession:'craftsman', specialization:'smith',
          guildRankMin:'guildmaster', guildStandingMin:35 }
      };
      const activeStory = FB.checkTrigger(state, storyGate);
      state.player.tier = 3;
      const landedStory = FB.checkTrigger(state, storyGate);
      state.player.tier = 1;

      FB.setCareer(state, me, 'farmer', 'journeyman');
      const archived = JSON.parse(JSON.stringify(me.careerHistory.craftsman));
      const resumed = FB.setCareer(state, me, 'craftsman');
      const save = JSON.parse(FB.save.serialize());
      FB.save.restore(save);
      state = FB.state;
      me = state.chars[state.player.charId];
      return {
        lockedReady:locked.ready,
        lockedMissing:locked.missing.length,
        ready:ready.ready,
        selected:selected,
        title:FB.careerTitle(state, me),
        gold:state.player.gold,
        focusGoldBonus:focusGold - plainFocusGold,
        taggedMultiplier:taggedYield / plainYield,
        activeStory:activeStory,
        landedStory:landedStory,
        archived:archived,
        resumed:resumed,
        restored:me.career.specialization
      };
    });

    expect(result.lockedReady).toBe(false);
    expect(result.lockedMissing).toBeGreaterThan(0);
    expect(result.ready).toBe(true);
    expect(result.selected).toEqual({ cost:20, specialization:'smith' });
    expect(result.title).toBe('Smith');
    expect(result.gold).toBe(30);
    expect(result.focusGoldBonus).toBeCloseTo(1.5, 8);
    expect(result.taggedMultiplier).toBeCloseTo(1.15, 8);
    expect(result.activeStory).toBe(true);
    expect(result.landedStory).toBe(false);
    expect(result.archived).toMatchObject({
      profession:'craftsman', specialization:'smith', guildRank:'guildmaster',
      guildStanding:35
    });
    expect(result.resumed).toBe(true);
    expect(result.restored).toBe('smith');
  });
