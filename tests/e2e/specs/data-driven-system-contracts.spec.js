'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/save.js','js/technology.js','js/politics.js','data/markets.js','data/cultures.js','js/intrigue.js','js/story_government_selection.js','data/policies.js','js/ecclesiastical_validation.js','js/government_ecclesiastical.js','js/religion.js','js/ambitions.js','js/federates.js','data/ambitions.js','js/agency.js','data/travel.js','js/parliament.js','data/events_common.js','data/political_institutions.js','data/religious_institutions.js',
  'data/papacy.js','js/papacy.js','data/actions.js','js/actions.js','js/ui_panels.js','data/economy.js','data/starts.js','js/abbeys.js','js/market.js','js/council.js','js/institutions.js','js/starts.js','data/tournaments.js','js/tournaments.js','data/traits.js','js/travel.js','js/events.js','js/rebellions.js','js/mods.js','js/authority.js','js/main.js','js/model.js','js/economy.js']);

test('declared chance formulas preserve arithmetic order and pure shared previews', async function ({ page }, info) {
  await openGame(page, info);
  await startDeterministicGame(page);
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player, me = s.chars[p.charId];
    p.prestige = 120; p.piety = 60;
    p.flags.crop_safe = true; p.flags.crop_risky = true; p.flags.blessed_crops = true;
    p.flags.crop_ruined = true; p.flags.rights_evidence = true; p.flags.rights_collaborator = true;
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const expected = {
      fabricate_claim:FB.clamp(.30 + FB.skillOf(me, 'int') * .03 + FB.skillOf(me, 'lea') * .01 + p.prestige / 1000, .1, .9),
      skill_dip:FB.clamp(.30 + FB.skillOf(me, 'dip') * .04, .1, .9),
      skill_int:FB.clamp(.30 + FB.skillOf(me, 'int') * .04, .1, .9),
      travel_trade:FB.clamp(.28 + FB.skillOf(me, 'ste') * .045, .1, .92),
      house_claim:FB.clamp(.3 + p.prestige / 400 + FB.skillOf(me, 'dip') * .02 + FB.skillOf(me, 'int') * .02, .1, .85),
      rights_int:FB.clamp(.24 + FB.skillOf(me, 'int') * .04 + .18 + .05, .1, .9),
      harvest:FB.clamp(.05 + (FB.world.byId[p.provinceId].terrain === 'farmland' ? .08 : 0), .05, .95)
    };
    return { expected:expected, actual:Object.keys(expected).reduce(function (out, id) { out[id] = FB.namedChance(s, id); return out; }, {}),
      pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter(),
      faults:FB.validateEventChances(FBDATA.eventChances, FBDATA.events) };
  });
  expect(result.actual).toEqual(result.expected);
  expect(result.pure).toBe(true);
  expect(result.faults).toEqual([]);
});

for (const bad of ['policy','path','clamp','skill','flag','source','scope']) {
  test('candidate authoring rejects ' + bad + ' before modifying any definitions', async function ({ page }, info) {
    await openGame(page, info);
    const result = await page.evaluate(function (bad) {
      const mod = { eventChances:{ independent_offer:{ base:.2, min:0, max:.9,
        steps:[{ kind:'skill', id:'dip', factor:.02 }] } } };
      const def = mod.eventChances.independent_offer;
      if (bad === 'policy') mod.eventChances.independent_offer = { policy:'execute_code' };
      if (bad === 'path') def.steps[0] = { kind:'resource', id:'gold', divisor:20, path:'player.gold' };
      if (bad === 'clamp') def.max = 2;
      if (bad === 'skill') def.steps[0].id = 'unknown_skill';
      if (bad === 'flag') def.steps[0] = { kind:'flag', id:'accepted', add:2 };
      if (bad === 'source') mod.legitimacySources = { independent_source:{ name:'Independent source', succession:'continues', issuerKinds:['arbitrary_actor'] } };
      if (bad === 'scope') mod.authorityOffices = { independent_office:{ name:'Independent office', powers:['ban'], scopes:['county'], succession:'continues', recognitionSources:[] } };
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter(), state = FB.state;
      const errors = FB.mods.validate(mod);
      let rejected = false; try { FB.mods.apply(mod); } catch (error) { rejected = true; }
      return { errors:errors, rejected:rejected, pure:before === JSON.stringify(FBDATA) &&
        rng === FB.getRngState() && uid === FB.getUidCounter() && state === FB.state };
    }, bad);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.rejected).toBe(true);
    expect(result.pure).toBe(true);
  });
}

test('new chance ids use same-import traits and reject missing event references', async function ({ page }, info) {
  await openGame(page, info);
  await startDeterministicGame(page);
  const result = await page.evaluate(function () {
    const trait = JSON.parse(JSON.stringify(FBDATA.traits.kind));
    trait.name = 'Measured';
    const mod = { traits:{ measured:trait }, eventChances:{ measured_offer:{ base:.25, min:0, max:.8,
      steps:[{ kind:'trait', id:'measured', add:.2 }] } }, events:[{ id:'measured_offer_event',
      title:'An offer', text:'Consider the terms.', trigger:{ never:true }, options:[{ label:'Offer', desc:'Take a chance.',
        chance:'measured_offer', success:{ text:'Accepted.', effects:{ prestige:1 } }, failure:{ text:'Declined.', effects:{} } }] }] };
    const accepted = FB.mods.validate(mod); FB.mods.apply(mod);
    const me = FB.state.chars[FB.state.player.charId];
    const first = FB.namedChance(FB.state, 'measured_offer'); me.traits.push('measured');
    const second = FB.namedChance(FB.state, 'measured_offer');
    const invalid = JSON.parse(JSON.stringify(mod)); invalid.events[0].options[0].chance = 'missing_chance';
    return { accepted:accepted, first:first, second:second, invalid:FB.mods.validate(invalid) };
  });
  expect(result.accepted).toEqual([]);
  expect(result.first).toBe(.25); expect(result.second).toBe(.45);
  expect(result.invalid.join(' ')).toContain('missing_chance');
});

for (const fault of ['hook','operation','subscriber','resolution','prize','tactic','policy_cycle','trait_channel','abbey_kind','service_cycle','enterprise_output','office_rank','council_role','quick_start','papal_tactic','papal_order','papal_policy','focus_operation','stateful_policy','confirmation_seat','election_support','demand_gate']) {
  test('typed authoring rejects invalid ' + fault + ' without publishing', async function ({ page }, info) {
    await openGame(page, info);
    const result = await page.evaluate(function (fault) {
      const mod = {};
      if (fault === 'hook') mod.eventSubscriptions = { child_born_flavor:[{ hook:'execute' }] };
      if (fault === 'operation') mod.eventSubscriptions = { child_born_flavor:[{ hook:'household_birth', require:{ setState:'gold' } }] };
      if (fault === 'subscriber') mod.eventSubscriptions = { missing_event:[{ hook:'household_birth' }] };
      if (fault === 'resolution') mod.tournamentRules = { tracks:{ joust:{ resolution:'execute', prize:'headline' } } };
      if (fault === 'prize') mod.tournamentRules = { programmes:{ martial:{ contests:['joust','melee'], priority:10 } } };
      if (fault === 'tactic') mod.tournamentRules = { defaultTactic:'assist' };
      if (fault === 'policy_cycle') mod.eventChances = { fabricate_claim:{ policy:'plot_discovery' } };
      if (fault === 'trait_channel') mod.traitMechanics = { kind:{ arbitraryFunction:1 } };
      if (fault === 'abbey_kind') mod.abbeys = { actions:{ alms:{ kind:'write_state', name:'Alms' } } };
      if (fault === 'service_cycle') mod.householdServiceRoles = { helper:Object.assign({}, FBDATA.householdServiceRoles.helper, { previous:'helper', days:1 }) };
      if (fault === 'enterprise_output') mod.enterpriseMechanics = { field_strip:{ output:{ provisions:1, wares:1 } } };
      if (fault === 'office_rank') mod.religiousOfficeRanks = { catholic_monastic:{ bishop:'unknown_rank' } };
      if (fault === 'council_role') mod.councilSeatRoles = { treasurer:['execute'] };
      if (fault === 'papal_tactic') mod.papacyRules = { tactics:{ backing:{kind:'execute',bonus:1,prestigeCost:0} } };
      if (fault === 'papal_order') mod.papacyRules = { orders:{ bishop:{minimum:99,share:.5,shortlist:true} } };
      if (fault === 'papal_policy') mod.papacyRules = { policies:{ lay:{kind:'lay',institution:'unknown_institution'} } };
      if (fault === 'confirmation_seat') { mod.privileges = { independent_confirmation:JSON.parse(JSON.stringify(FBDATA.privileges.office_confirmation)) }; mod.privileges.independent_confirmation.effect.seats = ['missing_office']; }
      if (fault === 'election_support') { mod.elections = { council_treasurer_confirmation:JSON.parse(JSON.stringify(FBDATA.elections.council_treasurer_confirmation)) }; mod.elections.council_treasurer_confirmation.tactics.canvass.support.missing_voter = .1; }
      if (fault === 'demand_gate') mod.collectiveDemands = { unsafe:{name:'Unsafe',constituency:'commons',privilege:'tax_concession',order:90,minTier:3,gate:'execute',cooldownYears:1} };
      if (fault === 'stateful_policy') mod.actionPolicies = {toil:{injuryChance:2,injuryHealth:1}};
      if (fault === 'focus_operation') mod.focusRoutines = { rest:[{kind:'execute',path:'player.gold'}] };
      if (fault === 'quick_start') mod.quickStarts = [Object.assign({}, FBDATA.quickStarts[0], { id:'unknown_beginning', scenarioId:'missing_scenario' })];
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const errors = FB.mods.validate(mod);
      return { errors:errors, pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter() };
    }, fault);
    expect(result.errors.length).toBeGreaterThan(0); expect(result.pure).toBe(true);
  });
}

for (const id of ['study','play','rest','pray','militia','work_land','market','keep_house','drill','stand_guard','copy_books','serve_church','manage_manor','serve_lord','train_arms','shepherd_diocese','craft_work','keep_records','practice_physic','scholarly_work','courtly_graces','administer_temporalities','govern','patronize']) {
  test('shared daily routine preserves the ' + id + ' resource and RNG sequence', async function ({ page }, info) {
    await openGame(page, info); await startDeterministicGame(page);
    const result = await page.evaluate(function (id) {
      const s = FB.state, c = s.chars[s.player.charId], def = FB.focuses.find(function (f) { return f.id === id; });
      c.health = 7; c.traits = []; s.player.flags.own_ox = true;
      const before = JSON.parse(FB.save.serialize()), D = 90;
      // Independent legacy sequence: assert random draws as well as resource deltas.
      function train(chance, skill, pool) {
        if (FB.chance(chance * (FBDATA.balance.focusSkillGainRate === undefined ? 1 : FBDATA.balance.focusSkillGainRate) / D)) {
          const selected = pool ? FB.pick(pool) : skill;
          FB.gainSkill(c, selected, 1);
        }
      }
      const p = s.player;
      if (id === 'study') train(.5, null, ['lea','ste','dip']);
      if (id === 'play') { c.health = FB.clamp(c.health + .012, 0, 10); train(.3, c.sex === 'f' ? 'dip' : 'mar'); }
      if (id === 'rest') c.health = FB.clamp(c.health + .014, 0, 10);
      if (id === 'pray') { p.piety += 3 / D; const priest = FB.getRole(s, 'priest', false); if (priest) FB.adjustStanding(s, { kind:'character',id:priest.id }, 2 / D, 'focus:pray'); }
      if (id === 'militia' || id === 'train_arms') train(.6, 'mar');
      if (id === 'work_land') p.gold += (FB.rf(FBDATA.balance.freeWage[0], FBDATA.balance.freeWage[1]) + 1) / D;
      if (id === 'market' || id === 'keep_house') { p.gold += (1 + FB.skillOf(c, 'ste') / 3) / D; if (id === 'market') train(.35, 'ste'); else train(.4, null, ['ste','dip']); }
      if (id === 'drill') { p.gold += 1 / D; train(.7, 'mar'); }
      if (id === 'stand_guard') { p.gold += 2 / D; const lord = FB.getRole(s, 'lord', false); if (lord) FB.adjustStanding(s, {kind:'character',id:lord.id}, 2 / D, 'focus:stand_guard'); }
      if (id === 'copy_books') { p.piety += 2 / D; train(.6, 'lea'); if (FB.chance(.6 / D)) FB.addTrait(c, 'literate'); }
      if (id === 'serve_church' || id === 'shepherd_diocese') { p.piety += 4 / D; if (id === 'serve_church') p.prestige += 2 / D; FB.setCountySupport(s, p.provinceId, FB.clamp(FB.countySupportBase(s,p.provinceId) + 2 / D,-100,100)); if (id === 'shepherd_diocese') train(.35,'lea'); }
      if (id === 'manage_manor') p.gold += (FB.rf(FBDATA.balance.manorIncome[0],FBDATA.balance.manorIncome[1]) + FB.skillOf(c,'ste') / 4) / D;
      if (id === 'serve_lord') { const lord = FB.getRole(s,'lord',true); if (lord) FB.adjustStanding(s,{kind:'character',id:lord.id},6 / D,'focus:serve_lord'); p.prestige += 2 / D; train(.3,'dip'); }
      const specialization = FB.careerSpecialization(s,c), fx = specialization && specialization.fx || {};
      if (id === 'craft_work') { p.gold += (FB.rf(2,5) + (p.flags.guild_member ? 1 : 0) + (Number(fx.focusGold) || 0)) / D; train(.3,'ste'); }
      if (id === 'keep_records') {
        p.gold += (2 + FB.skillOf(c,'ste') / 4 + FB.skillOf(c,'lea') / 8 + (Number(fx.focusGold) || 0)) / D;
        const standing = Number(fx.focusStanding) || 0;
        if (standing) {
          const rid = p.liege || s.holder && s.holder[p.provinceId] || s.owner[p.provinceId], lord = !rid || rid === 'player' ? FB.getRole(s,'lord',false) : null;
          const target = rid && rid !== 'player' ? {kind:'realm',id:rid} : lord ? {kind:'character',id:lord.id} : null;
          if (target) FB.adjustStanding(s,target,standing / D,'focus:keep_records');
        }
        train(.35,null,['ste','lea']);
      }
      if (id === 'practice_physic') { p.gold += (1 + FB.skillOf(c,'lea') / 3 + (Number(fx.focusGold) || 0)) / D; train(.45,'lea'); }
      if (id === 'scholarly_work') {
        p.gold += (.5 + FB.skillOf(c,'lea') / 10 + (Number(fx.focusGold) || 0)) / D;
        p.prestige += (Number(fx.focusPrestige) || 0) / D;
        FB.addResearch(s,(1 + Math.min(2,FB.skillOf(c,'lea') / 10) + (Number(fx.focusResearch) || 0)) / D); train(.5,'lea');
      }
      if (id === 'courtly_graces') { const lord = p.liege ? null : FB.getRole(s,'lord',true); const target = p.liege ? {kind:'realm',id:p.liege} : lord ? {kind:'character',id:lord.id} : null; if (target) FB.adjustStanding(s,target,4 / D,'focus:courtly_graces'); p.prestige += 2 / D; train(.5,'dip'); }
      if (id === 'administer_temporalities') { p.gold += FB.bishopricIncome(s) * .15 / D; if (p.liege) FB.adjustStanding(s,{kind:'realm',id:p.liege},2 / D,'focus:administer_temporalities'); train(.3,'ste'); }
      if (id === 'govern') { p.gold += FB.playerTax(s) * .15 / D; FB.setCountySupport(s,p.provinceId,FB.clamp(FB.countySupportBase(s,p.provinceId) + 3 / D,-100,100)); train(.25,'ste'); }
      if (id === 'patronize') { FB.addResearch(s,(2 + Math.min(3,FB.skillOf(c,'lea') / 10)) / D); p.gold -= 2 / D; train(.3,'lea'); }
      function facts(state) { const me = state.chars[state.player.charId]; return { gold:state.player.gold,piety:state.player.piety,prestige:state.player.prestige,health:me.health,skills:me.skills,traits:me.traits,standing:state.standing,countySupport:FB.countySupportBase(state,state.player.provinceId),research:FB.realmTechRecord(state),rng:FB.getRngState() >>> 0,uid:FB.getUidCounter() }; } // restore stores RNG bits unsigned
      const expected = JSON.stringify(facts(s)); FB.save.restore(before); def.tick(FB.state);
      return { expected:expected, actual:JSON.stringify(facts(FB.state)) };
    }, id);
    // Restore can reorder research object keys without changing any saved values.
    expect(JSON.parse(result.actual)).toEqual(JSON.parse(result.expected));
  });
}

for (const kind of ['agency','agenda','travel','research']) {
  test('invalid ' + kind + ' policy rejects without changing live data', async function ({ page }, info) {
    await openGame(page,info);
    const result = await page.evaluate(function (kind) {
      const mod = { name:'Rejected policy' };
      if (kind === 'agency') mod.agencyRules = { rebelYears:10000 };
      if (kind === 'agenda') mod.parliamentAgendas = { bad:{ event:'missing',order:1 } };
      if (kind === 'travel') mod.travelRules = { service:{ kind:'arbitrary',encounters:'service',arrivalEvent:'missing' } };
      if (kind === 'research') mod.traitMechanics = { brave:{ researchWeights:{ learning:100 } } };
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const faults = FB.mods.validate(mod);
      return { rejected:faults.length > 0,pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter() };
    },kind);
    expect(result).toEqual({ rejected:true,pure:true });
  });
}

for (const kind of ['tenure','tenure_date','freedom','foundation','contract','rank_rate','deed_write','faith_targets','service_start','migration']) {
  test('invalid ' + kind + ' catalogue preserves live data and the message registry', async function ({ page },info) {
    await openGame(page,info);
    const result = await page.evaluate(function (kind) {
      const mod = {};
      if (kind === 'faith_targets') mod.rulerFaithTargets = ['missing_faith'];
      if (kind === 'service_start') mod.federateServiceStarts = {missing_story:[]};
      if (kind === 'migration') mod.federateMigrations = {new_migration:{realmId:'unknown'}};
      if (kind === 'deed_write') mod.deedRoutines = {give_alms:{effects:{custom:'execute_arbitrary_code'}}};
      if (kind === 'tenure') mod.tenureArchetypes = [];
      if (kind === 'tenure_date') {
        const def = JSON.parse(JSON.stringify(FBDATA.tenureArchetypes.dependent_farming));
        def.duties[0].firstDue.day = 91; mod.tenureArchetypes = { dependent_farming:def };
      }
      if (kind === 'freedom') mod.freedomBargaining = {finalServiceDays:700};
      if (kind === 'foundation') mod.historicalAmbitions = [Object.assign({},FBDATA.historicalAmbitions[0],{id:'new_foundation',region:'missing_region'})];
      if (kind === 'contract') mod.federateContractTerms = {new_terms:{service:'script',durationDays:1}};
      if (kind === 'rank_rate') mod.rankPrestigeYearly = {ruling:{'4':-1}};
      const before = JSON.stringify([FBDATA,FB.englishMessages()]), rng = FB.getRngState(), uid = FB.getUidCounter();
      const errors = FB.mods.validate(mod);
      return { rejected:errors.length > 0,pure:before === JSON.stringify([FBDATA,FB.englishMessages()]) && rng === FB.getRngState() && uid === FB.getUidCounter() };
    },kind);
    expect(result).toEqual({rejected:true,pure:true});
  });
}

test('unused authoring roots retain the legacy effective-catalogue fingerprint', async function ({ page }, info) {
  await openGame(page,info);
  const result = await page.evaluate(function (legacyKeys) {
    FB.mods.apply({name:'Legacy metadata only'});
    const effective = {};
    legacyKeys.forEach(function (key) { if (Object.prototype.hasOwnProperty.call(FBDATA,key)) effective[key] = FBDATA[key]; });
    const expected = 'effective-1-' + FB.mods.fingerprint({stored:[],bundled:[],catalogue:FB.mods.fingerprint(effective)});
    const actual = FB.mods.sig();
    FB.mods.apply({name:'Authored policy',actionPolicies:{toil:{injuryChance:.2,injuryHealth:1}}});
    const changed = FB.mods.sig();
    return {actual:actual,expected:expected,changed:changed};
  }, ["name", "bookmarks", "defaultBookmark", "eras", "wardrobes", "startScenarios", "familyPresets", "focuses", "deeds", "deedSections", "countyCommunityPolicies", "provinces", "realms", "empires", "kingdoms", "duchies", "events", "eventPacks", "straits", "crossingClasses", "scripted", "cultureTraditions", "cultures", "cultureDoctrineDefaults", "doctrineCatalogs", "religions", "religiousPaths", "religiousAffiliations", "religiousInstitutionProfiles", "religiousActivities", "religiousPatronage", "traits", "ailments", "modifiers", "buildings", "forts", "techDomains", "techTraditions", "tech", "techCaps", "capabilities", "techImpactReviews", "unitClasses", "holdings", "careers", "positions", "localCouncilMotions", "feudalServiceCharters", "schooling", "enterprises", "auctionLotTypes", "householdStandards", "marketGoods", "marketEndowmentTypes", "marketEndowments", "travelPurposes", "travelSites", "tournaments", "finance", "plots", "intrigue", "legalTraditions", "justiceSentences", "governmentForms", "administrationProfiles", "aristocraticProfiles", "items", "itemPools", "rulerTraits", "raidingTraditions", "councilSeats", "constituencyProfiles", "mobileProfiles", "civicProfiles", "ecclesiasticalProfiles", "councilRules", "politicalBlocs", "policies", "elections", "privileges", "collectiveDemands", "settlementNames", "settlementSites", "settlementLayouts", "titles", "papacy", "currency", "balance", "land", "seas", "rivers", "bounds", "geographies", "seasonKinds", "climateZones", "lexicons", "architectureStyles", "faithDefaults", "defaultGeography"]);
  expect(result.actual).toBe(result.expected); expect(result.changed).not.toBe(result.actual);
});

test('remaining authoring schemas reject unknown operations and dangling references without mutation', async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function () {
    const inputs = [
      {positionRules:{tutor:{teaches:'yes'}}},
      {positionRules:{missing_position:{teaches:true}}},
      {localCouncilMotions:{bad_motion:{name:'Bad',desc:'Bad',fx:{arbitrary_state:1}}}},
      {policyGovernance:{religious_tolerance:{missing_level:{tolerance:'tolerant'}}}},
      {policyGovernance:{religious_tolerance:{persecution:{coercivePressure:2}}}},
      {policyGovernance:{religious_tolerance:{protected_worship:{protectsWorship:'yes'}}}},
      {marketRaidYields:{missing_endowment:{gold:5}}},
      {marketRaidYields:{grain:{gold:-1}}},
      {authoringDefaults:{learning:'missing_tradition'}},
      {authoringDefaults:{intrigueLaw:{default:'customary',cultures:{missing_culture:'customary'},realms:{}}}},
      {authoringDefaults:{intrigueLaw:{default:'customary',cultures:{},realms:{missing_realm:'customary'}}}},
      {authoringDefaults:{motionPostures:{redress:{traits:{missing_trait:1}}}}},
      {authoringDefaults:{motionPostures:{redress:{aidSlope:1001}}}},
      {traitMechanics:{zealous:{holyWarParticipation:1001}}},
      {traitMechanics:{zealous:{rivalryWeight:-2}}}
    ];
    const before = JSON.stringify(FBDATA), storage = localStorage.getItem('fb_mods'), rng = FB.getRngState(), uid = FB.getUidCounter();
    const rejected = inputs.map(function (input) { return FB.mods.validate(input).length > 0; });
    return {rejected:rejected,pure:before === JSON.stringify(FBDATA),storage:storage === localStorage.getItem('fb_mods'),rng:rng === FB.getRngState(),uid:uid === FB.getUidCounter()};
  });
  expect(result.rejected.every(Boolean)).toBe(true);
  expect(result).toMatchObject({pure:true,storage:true,rng:true,uid:true});
});

test('declared fallback preserves legacy omitted posture and explicit empty posture disables it', async function ({page},info) {
  await openGame(page,info); await startDeterministicGame(page);
  const result = await page.evaluate(function () {
    const s = FB.state, bloc = {archetypeId:'no_bloc',averageRulerAge:40,averageEconomicPower:10,
      members:[{id:'player',isPlayer:true,traitId:'ambitious',influence:1,martial:6}]};
    const before = FB.governmentMotionScore(s,bloc,'redress',10);
    const replacement = JSON.parse(JSON.stringify(FBDATA.policies.redress)); delete replacement.posture;
    FB.mods.apply({policies:{redress:replacement}});
    const fallback = FB.governmentMotionScore(s,bloc,'redress',10);
    replacement.posture = {}; FB.mods.apply({policies:{redress:replacement}});
    const after = FB.governmentMotionScore(s,bloc,'redress',10);
    return {fallback:fallback.reasons.some(function (row) { return row.id === 'ruler_traits'; }),before:before.reasons.some(function (row) { return row.id === 'ruler_traits'; }),
      after:after.reasons.some(function (row) { return row.id === 'ruler_traits'; })};
  });
  expect(result).toEqual({fallback:true,before:true,after:false});
});

test('mod timing is opt-in, transient and records rejected validation', async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function () {
    const timing = FB.mods.timing, initial = timing.read(), storage = localStorage.getItem('fb_mods');
    const enabled = timing.enable(true);
    FB.mods.apply({name:'Timing review'});
    let rejected = false;
    try { FB.mods.apply({unknown_authoring_root:{}}); } catch (error) { rejected = true; }
    const rows = timing.read(), copy = timing.read(); copy[0].accepted = false;
    const detached = timing.read()[0].accepted;
    timing.enable(false); FB.mods.apply({name:'Timing disabled'});
    return {initial:initial,enabled:enabled,rejected:rejected,detached:detached,
      valid:rows.every(function (row) { return row.operation === 'apply_validation' && Number.isFinite(row.elapsedMs) && row.elapsedMs >= 0; }),
      accepted:rows.map(function (row) { return row.accepted; }),disabled:timing.read(),
      storage:storage === localStorage.getItem('fb_mods')};
  });
  expect(result).toEqual({initial:[],enabled:true,rejected:true,detached:true,valid:true,accepted:[true,false],disabled:[],storage:true});
});
