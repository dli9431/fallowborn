'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,openTitle} = require('../support/game/navigation');
const {installStoredMod} = require('../support/game/stored-mod');
const {startHistoricalGame} = require('../support/game/historical-start');
const {prepareJourneyBookmark} = require('../support/game/parity');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

// Each case owns its page, imported catalogue, people and finite accounts.
test.describe.configure({mode:'parallel'});
const example = require('../fixtures/authoring/civic-assembly-event-reviews.json');
const examplePath = path.resolve(__dirname,'../fixtures/authoring/civic-assembly-event-reviews.json');
dependsOnRuntime(__filename,['data/events_civic_assembly.js','data/civic_profiles.js','data/assembly_polities.js',
  'data/industry_laws.js','data/technology.js','js/technology.js','data/economy.js','data/systems.js','data/bookmark_1204.js','data/bookmark_1204_terrain.js',
  'js/civic_transactions.js','js/government_civic.js','js/civic_validation.js','js/government_support.js',
  'js/government_collective.js','js/government_selection.js','js/government_recognition.js','js/governments.js',
  'js/industry_laws.js','js/justice.js','js/authority.js','js/treasury.js','js/events.js','js/schema.js','js/systems.js',
  'js/actions.js','js/parliament.js','js/politics.js','js/economy.js','js/market.js','js/world.js','js/model.js',
  'js/main.js','js/starts.js','js/progression.js','js/mods.js','js/save.js','js/save_v4.js','js/ui_misc.js','js/ui_modals.js','js/keys.js']);

/* Admission against the unmodded catalogue and the Mods file picker import
   have their own case, which proves the reload stores exactly the example.
   Every imported case stores that file text and boots it once, proving it
   publishes, instead of preparing the unmodded catalogue first. */
async function pickerImport(page,info) {
  await openGame(page,info);
  expect(await page.evaluate(function (m) {return FB.mods.validate(m);},example)).toEqual([]);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(examplePath);
  await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () {return !!(window.FB && FB.game && FB.game.bootReady);});
}
async function start(page,info,imported) {
  const code = 'CIVICREVIEW-1204-farmer-venezia-m-Reader';
  if (imported) {
    await openTitle(page,info);
    await installStoredMod(page,fs.readFileSync(examplePath,'utf8'));
    // Continue from the prepared modded title instead of booting its catalogue again.
    await prepareJourneyBookmark(page,{bookmark:'1204',unhide:true});
    await page.evaluate(function () {FB.startProgression.noteTier(3);});
    const fullStart = page.locator('#btn-choose-beginning');
    if (await fullStart.isVisible()) await fullStart.click();
    else await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#btn-bm-seed').click();
    const seed = page.locator('#ng-seed');
    await seed.fill(code);await expect(seed).toHaveValue(code);await seed.press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Your Story Begins',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Begin',exact:true})).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    expect(await page.evaluate(function () {return {bookmark:FB.state.start.id,seed:FB.state.seed};}))
      .toEqual({bookmark:'1204',seed:code});
    await page.evaluate(function () {
      FB.game.setPaused(true);
      Object.assign(FB.game.auto,{minor:false,major:false,war:false,all:true,style:'first',
        hosts:'manual',hostResupply:true,buySupplies:true,forceSupplies:false,
        supplyTarget:75,build:false,research:false,researchMode:'cheapest'});
      FB.game.uiPrefs.hideTips = true;FB.game.uiPrefs.hideBeginnerHints = true;
      if (FB.ui.coachmarkReset) FB.ui.coachmarkReset();
      if (FB.state.player.flags) delete FB.state.player.flags.tutorial;
    });
  } else await startHistoricalGame(page,info,{bookmark:'1204',code:code});
  await page.evaluate(function (imported) {
    const s = FB.state, p = s.player, c = s.chars[p.charId];
    FB.game.setPaused(true);FB.game.uiPrefs.hideTips = true;
    p.tier = 1;p.gold = 2000;c.born = s.date.year - 35;delete c.unfree;c.sex = 'm';
    FB.SKILLS.forEach(function (k) {c.skills[k] = 12;});FB.careerOf(s,c).experience = 10;
    window.cr = {
      imported:imported,
      copy:function (v) {return JSON.parse(JSON.stringify(v));},
      snapshot:function () {return JSON.stringify({s:FB.state,rng:FB.getRngState(),uid:FB.getUidCounter(),storage:Object.assign({},localStorage)});},
      projection:function (state) {return JSON.stringify({gold:state.player.gold,support:state.governmentSupport,
        governments:state.authority.governments,laws:state.industryLaws,justice:state.justice,
        treasuries:Object.keys(state.realms).map(function (id) {return [id,state.realms[id].treasury];}),
        enterprises:state.player.enterprises,queue:state.eventQueue,chars:Object.keys(state.chars).sort()});},
      event:function (nativeId,jsonId) {return FB.eventById(imported ? jsonId : nativeId);},
      exercise:function (ev,index) {
        const state = FB.state, option = ev.options[index || 0], before = cr.snapshot();
        const ctx = FB.eventContextFor(state,ev,{}), q = ctx && FB.eventReviews.quote(state,option,ctx);
        if (!q || !q.quote.allowed) throw new Error('Review unavailable: ' + ev.id + ' ' + JSON.stringify({ctx:ctx,q:q,trigger:FB.checkTrigger(state,ev.trigger)}));
        const repeated = [0,1,2].every(function () {return JSON.stringify(q) === JSON.stringify(FB.eventReviews.quote(state,option,ctx));});
        FB.eventReviews.details(state,q);
        [0,1,2].forEach(function () {FB.checkTrigger(state,ev.trigger,ctx);});
        const pure = before === cr.snapshot();
        const missing = !FB.resolveEventOption(state,ev,option,ctx,{});
        const altered = cr.copy(q);altered.quote.allowed = false;
        const stale = !FB.resolveEventOption(state,ev,option,ctx,{reviewed:altered});
        const wasDead = state.player.dead,hadDead = Object.prototype.hasOwnProperty.call(state.player,'dead');state.player.dead = true;
        const deniedBefore = cr.snapshot();
        const denied = !FB.resolveEventOption(state,ev,option,ctx,{reviewed:q}) && deniedBefore === cr.snapshot();
        if (hadDead) state.player.dead = wasDead;else delete state.player.dead;
        const definition = option.review.args.definitionId && FBDATA.industryLaws[option.review.args.definitionId];
        const scope = definition ? definition.provinceId : state.player.provinceId,holder = state.holder[scope];
        const occupier = Object.keys(state.realms).sort().find(function (id) {return id !== holder && state.realms[id].alive;});
        state.holder[scope] = occupier;const occupied = cr.snapshot();
        const authority = !FB.resolveEventOption(state,ev,option,ctx,{reviewed:q}) && occupied === cr.snapshot();
        state.holder[scope] = holder;
        const turn = state.turn;state.turn++;
        const advanced = cr.snapshot();
        const changed = !FB.resolveEventOption(state,ev,option,ctx,{reviewed:q}) && advanced === cr.snapshot();
        state.turn = turn;
        const raw = FBDATA.bookmarks[state.start.id], systems = raw.systems;
        const owner = option.review.type.indexOf('industry_') === 0 ? 'event_industry_laws' : 'event_governments';
        raw.systems = Object.assign({},systems);raw.systems[owner] = false;
        const disabledBefore = cr.snapshot();
        const disabled = !FB.eventReviews.quote(state,option,ctx) && disabledBefore === cr.snapshot();
        if (ev.trigger.state) {
          if (FB.eventStateReaders.test(state,ev.trigger.state,ctx)) throw new Error('Disabled reader answered');
          if (FB.eventStateReaders.test(state,ev.trigger.state.map(function (r) {return Object.assign({},r,{not:true});}),ctx)) throw new Error('Disabled negated reader answered');
        }
        raw.systems = systems;
        if (before !== cr.snapshot()) throw new Error('Rejected review changed state');
        const rng = FB.getRngState(),uid = FB.getUidCounter(),fork = cr.copy(state),auto = cr.copy(state),refused = cr.copy(state);
        const refusalBefore = cr.projection(refused);
        const refusal = FB.resolveEventOption(refused,ev,ev.options[option.review.refusalOption],ctx,{});
        const refusalPure = !!refusal && refusalBefore === cr.projection(refused) && rng === FB.getRngState() && uid === FB.getUidCounter();
        const canonical = FB.eventReviews.commit(fork,option,ctx,q);
        const forkProjection = cr.projection(fork),forkRng = FB.getRngState(),forkUid = FB.getUidCounter();
        FB.setRngState(rng);FB.setUidCounter(uid);
        const automated = FB.resolveEventOption(auto,ev,option,ctx,{automated:true});
        const parityAuto = !!automated && forkProjection === cr.projection(auto) && forkRng === FB.getRngState() && forkUid === FB.getUidCounter();
        FB.setRngState(rng);FB.setUidCounter(uid);
        const receipt = FB.resolveEventOption(state,ev,option,ctx,{reviewed:q});
        const parity = !!receipt && forkProjection === cr.projection(state) && forkRng === FB.getRngState() && forkUid === FB.getUidCounter();
        const settled = cr.snapshot(),duplicate = !FB.resolveEventOption(state,ev,option,ctx,{reviewed:q}) && settled === cr.snapshot();
        return {id:ev.id,repeated:repeated,pure:pure,missing:missing,stale:stale,changed:changed,disabled:disabled,denied:denied,authority:authority,
          refusalPure:refusalPure,canonical:!!canonical,parityAuto:parityAuto,parity:parity,duplicate:duplicate};
      },
      civic:function () {
        p.provinceId = 'venezia';p.liege = 'venice_1204';c.homeProvinceId = p.provinceId;
        s.realms.venice_1204.treasury.gold = 200;
        FB.governments.support.row(s,'venice_1204').scopes.forEach(function (id) {FB.setCountySupport(s,id,30);});
        FB.materializeRealmRuler(s,'england_1204');s.realms.england_1204.treasury.gold = 200;
        return FB.civicGovernment.row(s,'venice_1204');
      },
      seed:function (chance,success) {
        for (let i = 0;i < 256;i++) {const rng = FB.getRngState();if ((FB.rng() < chance) === success) {FB.setRngState(rng);return;}}
        throw new Error('No bounded seed');
      },
      business:function () {
        p.tier = 1;p.profession = 'merchant';p.provinceId = 'london';p.homeSettlement = 0;p.gold = 2000;
        FB.setCareer(s,c,'merchant','journeyman');
        const tech = FB.realmTechRecord(s,FB.techRealmId(s));
        ['urban_markets','annual_fairs'].forEach(function (id) {if (tech.completed.indexOf(id) < 0) tech.completed.push(id);});
        FB.localFolkArrive(s,'london');FB.fns.local_council_elected(s);FB.enterpriseList(s);FB.enterpriseLaborRecords(s);
        const judge = FB.materializeRealmRuler(s,s.holder.london || s.owner.london);judge.traits = [];
        const e = FB.buyEnterprise(s,'market_stall_business',0);
        if (!e) throw new Error('Business purchase unavailable');
        (e.workerIds || (e.workerId ? [e.workerId] : [])).slice().forEach(function (id) {FB.unassignEnterpriseWorker(s,id);});
        while (FB.enterpriseStaffAssigned(s,e) < FB.enterpriseStaffRequired(e)) {
          if (!FB.hireEnterpriseWorker(s,e.uid)) throw new Error('Labor unavailable');
        }
        return e;
      },
      enact:function (id) {
        const L = FB.industryLaws,d = FBDATA.industryLaws[id];p.localCouncil.nextMotionTurn = s.turn;
        if (d.voting) {
          const v = L.commitAssembly(s,L.quoteAssembly(s,id,'town','begin'));
          if (!v) throw new Error('Hearing unavailable');
          // Explicit current benches, not an event, settle the authored motion.
          const q = L.quoteAssembly(s,id,'town','resolve',v.id);
          q.members.filter(function (m) {return m.actorId === p.charId;}).forEach(function (m) {
            L.commitAssembly(s,L.quoteAssembly(s,id,'town','ballot',v.id,m.id,'support'));
          });
          const r = L.commitAssembly(s,L.quoteAssembly(s,id,'town','resolve',v.id));
          if (!r || r.status !== 'passed') throw new Error('Canonical hearing did not pass');
        } else {
          cr.seed(FB.localCouncilMotionChance(s),true);
          const q = L.quoteMotion(s,id),r = FB.proposeLocalCouncilMotion(s,d.motionId,q);
          if (!r || !r.passed) throw new Error('Canonical motion did not pass');
        }
        return s.industryLaws.laws[s.industryLaws.laws.length - 1];
      },
      checkpoint:function () {
        window.civicSavedFacts = {projection:cr.projection(s),rng:FB.getRngState() >>> 0,uid:FB.getUidCounter(),sig:FB.mods.sig()};
        return FB.save.serialize();
      }
    };
  },imported);
}
function expectReviews(rows) {
  expect(rows.length).toBeGreaterThan(0);
  rows.forEach(function (row) {for (const key of Object.keys(row)) if (key !== 'id') expect(row[key],row.id + ': ' + key).toBe(true);});
}
async function restoreTwice(page,text) {
  for (let i = 0;i < 2;i++) {
    await restoreBookmark(page,i ? await page.evaluate(function () {return FB.save.serialize();}) : text);
    const restored = await page.evaluate(function () {
      const c = civicSavedFacts;
      return {actual:JSON.parse(cr.projection(FB.state)),expected:JSON.parse(c.projection),
        rng:FB.getRngState() >>> 0,expectedRng:c.rng,uid:FB.getUidCounter(),expectedUid:c.uid,sig:FB.mods.sig(),expectedSig:c.sig};
    });
    expect(restored.actual).toEqual(restored.expected);
    expect(restored.rng).toBe(restored.expectedRng);expect(restored.uid).toBe(restored.expectedUid);expect(restored.sig).toBe(restored.expectedSig);
  }
}

test('the civic review example is admitted against the unmodded catalogue and imports through the Mods file picker',async function ({page},info) {
  await pickerImport(page,info);
  expect(await page.evaluate(function () {
    return {count:FB.mods.count(),stored:JSON.parse(localStorage.getItem(FB.storageKey('fb_mods')) || '[]').map(function (text) {return JSON.parse(text);})};
  })).toEqual({count:1,stored:[example]});
});

for (const imported of [false,true]) {
  const label = imported ? 'ordinary JSON' : 'native';

  test(label + ' queued admission retains the exact source and rejects changed content atomically',async function ({page},info) {
    await start(page,info,imported);
    const result = await page.evaluate(function () {
      cr.civic();FB.state.eventQueue = [];
      const ev = cr.event('civic_admission','river_civic_admit'),queued = FB.queueEvent(FB.state,ev.id,{});
      if (!queued || !FB.eventReviews.quote(FB.state,ev.options[0],queued.ctx)) throw new Error('No bound queued review');
      const before = cr.snapshot(),ctx = cr.copy(queued.ctx);
      const exact = JSON.stringify(FB.eventContextFor(FB.state,ev,ctx,true)) === JSON.stringify(ctx);
      const noRecast = !FB.eventContextFor(FB.state,ev,{participants:{}},true);
      const saved = JSON.parse(FB.save.serialize());saved.mods += '-changed';let rejected = false;
      try {FB.save.restore(saved);} catch (error) {rejected = true;}
      return {exact:exact,noRecast:noRecast,rejected:rejected,pure:before === cr.snapshot(),text:cr.checkpoint(true)};
    });
    expect(result).toMatchObject({exact:true,noRecast:true,rejected:true,pure:true});
    await restoreTwice(page,result.text);
  });

  test(label + ' civic admission, nomination, dues, borrowing and repayment use canonical accounts',async function ({page},info) {
    await start(page,info,imported);
    const result = await page.evaluate(function () {
      const s = FB.state,p = s.player,V = FB.civicGovernment,r = cr.civic(),rows = [];
      const admission = cr.event('civic_admission','river_civic_admit');
      rows.push(cr.exercise(admission));
      const o = r.offices[0];
      if (!V.officeApply(s,V.officeQuote(s,'venice_1204',o.id,'resign',{characterId:o.incumbentId}))) throw new Error('Opening resignation failed');
      const gold = p.gold;rows.push(cr.exercise(cr.event('civic_nomination','river_civic_nominate')));
      const cost = gold - p.gold;
      if (!V.officeApply(s,V.officeQuote(s,'venice_1204',o.id,'recognize',{}))) throw new Error('Canonical selection failed');
      rows.push(cr.exercise(cr.event('civic_collective_dues','river_civic_dues')));
      const total = function () {return Object.keys(s.realms).reduce(function (n,id) {return n + FB.treasuryAvailable(s,id);},0);};
      const before = total();
      const privateGold = p.gold;
      rows.push(cr.exercise(cr.event('civic_public_borrowing','river_civic_borrow')));
      const debt = r.debts[0];s.turn = debt.dueTurn;
      rows.push(cr.exercise(cr.event('civic_public_repayment','river_civic_repay')));
      const conserved = Math.abs(before - total()) < 0.000001 && p.gold === privateGold;
      const office = r.offices[0],priorEnd = office.endTurn;
      // Native Venice is a life office; its lack of a term must never become an ending-term notice.
      const ending = FB.eventById('civic_term_ending');
      const noInventedTerm = priorEnd !== null || !FB.checkTrigger(s,ending.trigger,{});
      const resign = cr.event('civic_term_ending','river_civic_resign');
      if (cr.imported) {s.turn = office.endTurn - 1;rows.push(cr.exercise(resign));}
      return {rows:rows,cost:cost,conserved:conserved,noInventedTerm:noInventedTerm,text:cr.checkpoint()};
    });
    expectReviews(result.rows);expect(result.cost).toBe(imported ? 3 : 0);
    expect(result.conserved).toBe(true);expect(result.noInventedTerm).toBe(true);
    await restoreTwice(page,result.text);
  });

  test(label + ' assembly nomination and collective assent retain the real mandate and exact restore',async function ({page},info) {
    await start(page,info,imported);
    const result = await page.evaluate(function () {
      const s = FB.state,p = s.player,C = FB.governments.support,c = s.chars[p.charId];
      const rid = Object.keys(s.governmentSupport.polities).sort().filter(function (id) {return C.isDelegated(s,id) && C.row(s,id).profileId === 'siwa_oasis_1204';})[0];
      if (!rid) throw new Error('No native finite-term constituency');
      const r = C.row(s,rid);p.provinceId = r.scopes[0];p.liege = rid;c.homeProvinceId = p.provinceId;
      p.homeSettlement = 0;FB.localFolkArrive(s,p.provinceId);
      r.scopes.forEach(function (id) {FB.setCountySupport(s,id,40);});s.realms[rid].treasury.gold = 200;
      if (!C.openVacancy(s,rid,'resign')) throw new Error('Canonical vacancy failed');
      const rows = [cr.exercise(cr.event('assembly_nomination','river_assembly_nominate'))];
      r.members.forEach(function (m) {if (!C.apply(s,C.quote(s,rid,'recognize',{memberId:m.id,candidateId:p.charId}))) throw new Error('Recognition failed');});
      if (!C.apply(s,C.quote(s,rid,'select',{}))) throw new Error('Selection failed');
      const publicGold = FB.treasuryAvailable(s,rid),privateGold = p.gold;
      rows.push(cr.exercise(cr.event('assembly_collective_assent','river_assembly_assent')));
      const approvalOnly = publicGold === FB.treasuryAvailable(s,rid) && privateGold === p.gold && r.decisions.some(function (d) {return d.status === 'approved';});
      const assent = cr.event('assembly_collective_assent','river_assembly_assent'), ctx = FB.eventContextFor(s,assent,{});
      const denied = !FB.eventReviews.quote(s,assent.options[0],ctx);
      if (r.mandate.endTurn !== null) s.turn = r.mandate.endTurn - 1;
      else if (FB.checkTrigger(s,FB.eventById('assembly_term_ending').trigger,{})) throw new Error('Invented finite mandate');
      rows.push(cr.exercise(cr.event(r.mandate.endTurn !== null ? 'assembly_term_ending' : 'assembly_representative_choice','river_assembly_resign')));
      return {rows:rows,approvalOnly:approvalOnly,denied:denied,text:cr.checkpoint()};
    });
    expectReviews(result.rows);expect(result.approvalOnly).toBe(true);expect(result.denied).toBe(true);
    await restoreTwice(page,result.text);
  });

  for (const consumer of ['town','estates']) test(label + ' ' + consumer + ' hearing and own ballot never enact or repeal a law',async function ({page},info) {
    await start(page,info,imported);
    const result = await page.evaluate(function (consumer) {
      const s = FB.state,p = s.player,L = FB.industryLaws;cr.business();
      if (consumer === 'estates') {
        p.tier = 3;p.liege = s.holder.london || s.owner.london;delete p.localCouncil;delete p.flags.councilman;
        const home = FB.world.provs.filter(function (q) {return !q.wasteland && q.id !== 'london' && s.owner[q.id] === p.liege;})[0];
        if (!home) throw new Error('No existing sworn local household');
        p.provinceId = home.id;FB.localFolkArrive(s,home.id);FB.invalidateRealmCache();
      }
      const begin = cr.event('civic_' + consumer + '_hearing','river_' + consumer + '_begin');
      const rows = [cr.exercise(begin)],id = cr.imported ? 'river_market_hearing' : 'london_market_levy';
      const vote = s.industryLaws.votes.find(function (v) {return v.definitionId === id && v.status === 'pending';});
      const annual = consumer === 'town' ? p.localCouncil.nextMotionTurn : FB.parliamentTerms(s).motionYears.industry;
      rows.push(cr.exercise(cr.event('civic_' + consumer + '_trade_ballot','river_' + consumer + '_ballot')));
      const foreign = L.assemblyMembers(s,id,consumer).filter(function (m) {return m.actorId !== p.charId;})[0];
      const before = cr.snapshot(),unauthorized = foreign && L.quoteAssembly(s,id,consumer,'ballot',vote.id,foreign.id,'support');
      const denied = !unauthorized || !unauthorized.ready && !L.commitAssembly(s,unauthorized);
      const pure = before === cr.snapshot();
      const withdraw = cr.imported ? FB.eventById('river_' + consumer + '_withdraw') : FB.eventById('civic_' + consumer + '_trade_ballot');
      rows.push(cr.exercise(withdraw,cr.imported ? 0 : 3));
      return {rows:rows,denied:!!denied,pure:pure,noLaw:s.industryLaws.laws.length === 0,
        withdrawn:vote.status === 'withdrawn',session:annual === (consumer === 'town' ? p.localCouncil.nextMotionTurn : FB.parliamentTerms(s).motionYears.industry),text:cr.checkpoint()};
    },consumer);
    expectReviews(result.rows);expect(result).toMatchObject({denied:true,pure:true,noLaw:true,withdrawn:true,session:true});
    await restoreTwice(page,result.text);
  });

  test(label + ' exact business permission, deadline and exemption reviews preserve current-content receipts',async function ({page},info) {
    await start(page,info,imported);
    const result = await page.evaluate(function () {
      const s = FB.state,p = s.player,L = FB.industryLaws,e = cr.business();
      const law = cr.enact(cr.imported ? 'river_stall_permission' : 'london_stall_license');
      s.turn = law.transitionEndTurn;p.provinceId = 'york';FB.localFolkArrive(s,'york');
      const pay = cr.event('civic_stall_permission','river_permission');
      const ctx = FB.eventContextFor(s,pay,{}),q = FB.eventReviews.quote(s,pay.options[0],ctx);
      const gold = p.gold;p.gold = 0;const before = cr.snapshot();
      const denied = !FB.resolveEventOption(s,pay,pay.options[0],ctx,{reviewed:q}) && before === cr.snapshot();
      const auto = cr.copy(s),refusal = FB.resolveEventOption(auto,pay,pay.options[0],ctx,{automated:true});
      const autoRefusal = !!refusal && refusal.optionIndex === 1 && auto.player.gold === 0 && !auto.industryLaws.permits.length;
      p.gold = gold;
      const rows = [cr.exercise(pay)];
      s.turn = s.industryLaws.permits[0].endTurn - 1;
      const deadline = FB.checkTrigger(s,cr.event('civic_license_deadline','river_deadline').trigger,{});
      if (!cr.imported) cr.seed(law.terms.relief.chance,false);
      rows.push(cr.exercise(cr.event('civic_exemption_request','river_relief')));
      const spentRequest = s.industryLaws.petitions.length === 1 && !s.industryLaws.petitions[0].granted;
      const original = FB.eventReviews.quote(s,pay.options[0],ctx),owned = p.enterprises;
      p.enterprises = [];const removed = cr.snapshot();
      const noRedirect = !FB.eventReviews.quote(s,pay.options[0],ctx) && (!original || !FB.resolveEventOption(s,pay,pay.options[0],ctx,{reviewed:original})) && removed === cr.snapshot();
      p.enterprises = owned;
      const originalLaws = s.industryLaws.laws,replacement = cr.copy(originalLaws[0]);replacement.id += '_replacement';
      s.industryLaws.laws = [replacement];const replaced = cr.snapshot();
      const noLawRedirect = !FB.eventReviews.quote(s,pay.options[0],ctx) && replaced === cr.snapshot();
      s.industryLaws.laws = originalLaws;
      return {rows:rows,denied:denied,autoRefusal:autoRefusal,deadline:deadline,spentRequest:spentRequest,noRedirect:noRedirect,noLawRedirect:noLawRedirect,text:cr.checkpoint()};
    });
    expectReviews(result.rows);expect(result).toMatchObject({denied:true,autoRefusal:true,deadline:true,spentRequest:true,noRedirect:true,noLawRedirect:true});
    await restoreTwice(page,result.text);
  });

  test(label + ' enforcement reviews consume real output complaints and never infer competing inventories',async function ({page},info) {
    await start(page,info,imported);
    const result = await page.evaluate(function () {
      const s = FB.state,p = s.player,L = FB.industryLaws,e = cr.business();
      const law = cr.enact(cr.imported ? 'river_stall_permission' : 'london_market_restriction');
      s.turn = law.transitionEndTurn;
      if (!L.commitOperation(s,L.quoteOperation(s,e,'violate',0))) throw new Error('Deliberate operation unavailable');
      const empty = cr.snapshot();
      const initial = FB.checkTrigger(s,FB.eventById('civic_trade_complaint').trigger,{});
      if (empty !== cr.snapshot()) throw new Error('Observation recorded an allegation');
      FB.marketSeason(s);
      const violation = (s.industryLaws.violations || [])[0];
      if (!violation || !violation.caseId) throw new Error('Actual productive operation did not record complaint');
      const event = cr.event('civic_trade_complaint','river_enforcement_self');
      const offenses = s.justice.offenses;s.justice.offenses = [];const missingCase = cr.snapshot();
      const noInventedCase = !FB.checkTrigger(s,event.trigger,{}) && missingCase === cr.snapshot();
      s.justice.offenses = offenses;
      const rows = [cr.exercise(event)];
      return {rows:rows,initial:initial,noInventedCase:noInventedCase,material:violation.output > 0 && violation.evidence === 'material',noJudgment:!violation.resolved && !violation.judgment,text:cr.checkpoint()};
    });
    expectReviews(result.rows);expect(result).toMatchObject({initial:false,noInventedCase:true,material:true,noJudgment:true});
    await restoreTwice(page,result.text);
  });

  test(label + ' another operator is reviewed only after actual output and living household succession',async function ({page},info) {
    await start(page,info,imported);
    const result = await page.evaluate(function () {
      const s = FB.state,p = s.player,L = FB.industryLaws,c = s.chars[p.charId];cr.business();
      const id = cr.imported ? 'river_guild_permission' : 'london_guild_license',d = FBDATA.industryLaws[id];
      FB.setPlayerTier(s,4,{attachLiege:false});p.liege = null;p.provs = ['london'];
      FB.transferProvince(s,'london','player');FB.foundPlayerRealm(s);FB.treasuryInitialize(s);
      const tech = FB.realmTechRecord(s,FB.techRealmId(s));
      ['guild_charters','horizontal_loom','olive_press'].forEach(function (key) {if (tech.completed.indexOf(key) < 0) tech.completed.push(key);});
      const sponsor = Object.keys(s.chars).map(function (key) {return s.chars[key];}).find(function (other) {
        return other.id !== c.id && !other.dead && !other.captive && !other.exiled && FB.ageOf(other,s.date.year) >= 16 && !FB.isReigningRealmRuler(s,other);
      });
      if (!sponsor) throw new Error('No existing sponsor');
      sponsor.homeProvinceId = 'london';sponsor.householdResidenceId = 'london';sponsor.wealth = 100;
      FB.setCareer(s,sponsor,d.grant.profession,'master');sponsor.career.guildRank = 'guildmaster';
      const e = d.enterpriseType === 'market_stall_business' ? p.enterprises.find(function (e) {return e.type === d.enterpriseType;}) : FB.buyEnterprise(s,d.enterpriseType,0);
      if (!e) throw new Error('No actual owned workshop');
      (e.workerIds || (e.workerId ? [e.workerId] : [])).slice().forEach(function (id) {if (id === c.id) FB.unassignEnterpriseWorker(s,id);});
      while (FB.enterpriseStaffAssigned(s,e) < FB.enterpriseStaffRequired(e)) {
        if (!FB.hireEnterpriseWorker(s,e.uid)) throw new Error('No existing paid workers');
      }
      const grant = L.quoteGrant(s,id,'outgoing',sponsor.id,[]);
      if (!grant || !grant.ready || !FB.issueGuildMonopoly(s,d.grant.profession,grant)) throw new Error('Actual grant unavailable: ' + JSON.stringify(grant));
      const law = s.industryLaws.laws[0];s.turn = law.transitionEndTurn;
      if (!L.commitOperation(s,L.quoteOperation(s,e,'violate',0))) throw new Error('Actual deliberate operation unavailable');
      FB.marketSeason(s);
      const v = (s.industryLaws.violations || []).find(function (v) {return v.enterpriseUid === e.uid;});
      if (!v || !(v.output > 0)) throw new Error('No actual output violation');
      const successor = FB.heirsOf(s).find(function (heir) {return heir.id !== sponsor.id && !heir.dead;});
      if (!successor) throw new Error('No actual household successor');
      successor.born = s.date.year - 25;successor.homeProvinceId = 'london';successor.householdResidenceId = 'london';
      if (!FB.game.succeedTo(successor.id,{livingAbdication:true})) throw new Error('Canonical living succession failed');
      s.player.provinceId = 'london';
      if (!v.caseId && !L.fileComplaint(s,v.id)) throw new Error('Actual existing-output complaint unavailable');
      const ev = cr.event('civic_competing_operator','river_enforcement_other');
      const ctx = FB.eventContextFor(s,ev,{}),q = FB.eventReviews.quote(s,ev.options[0],ctx);
      const oldHolder = s.holder.london;s.holder.london = 'england_1204';const before = cr.snapshot();
      const denied = !FB.eventReviews.quote(s,ev.options[0],ctx) && !FB.resolveEventOption(s,ev,ev.options[0],ctx,{reviewed:q}) && before === cr.snapshot();
      s.holder.london = oldHolder;
      const rows = [cr.exercise(ev)];
      return {rows:rows,denied:denied,original:v.actorId === c.id && s.player.charId !== c.id && !c.dead,
        noJudgment:!v.resolved && !v.judgment,text:cr.checkpoint()};
    });
    expectReviews(result.rows);expect(result).toMatchObject({denied:true,original:true,noJudgment:true});
    await restoreTwice(page,result.text);
  });

}

test('typed JSON review candidates reject atomically without changing live content or saved facts',async function ({page},info) {
  await start(page,info,true);
  const result = await page.evaluate(function (example) {
    const state = cr.snapshot(),data = JSON.stringify(FBDATA),input = JSON.stringify(example),sig = FB.mods.sig(),rejected = [];
    function reject(edit) {
      const m = JSON.parse(input);edit(m);const bytes = JSON.stringify(m);
      const faults = FB.mods.validate(m);let refused = false;try {FB.mods.apply(m);} catch (error) {refused = true;}
      rejected.push(!!faults.length && refused && bytes === JSON.stringify(m));
    }
    reject(function (m) {m.events[0].options[0].review.args.extra = true;});
    reject(function (m) {delete m.events[0].participants;});
    reject(function (m) {m.events[0].participantCards = [];});
    reject(function (m) {m.events[4].options[0].review.args.duration = 1;});
    reject(function (m) {m.events[5].options[0].review.args.amount = 2;});
    reject(function (m) {m.events[8].options[0].review.args.amount = -1;});
    reject(function (m) {m.events[9].options[0].review.args.definitionId = 'absent_law';});
    reject(function (m) {m.events[9].options[0].review.args.action = 'resolve';});
    reject(function (m) {m.events[10].options[0].review.args.posture = 'convict';});
    reject(function (m) {m.events[11].options[0].review.args.posture = 'support';});
    reject(function (m) {m.events[16].options[0].review.args.kind = 'repeal';});
    reject(function (m) {m.events[17].options[0].review.args.audience = 'invent';});
    return {rejected:rejected,pure:state === cr.snapshot() && data === JSON.stringify(FBDATA) && sig === FB.mods.sig() && input === JSON.stringify(example)};
  },example);
  expect(result).toEqual({rejected:Array(12).fill(true),pure:true});
});

for (const mobile of [false,true]) test((mobile ? 'compact' : 'desktop') + ' civic confirmation cancellation retains the event, portrait and focus',async function ({page},info) {
  await page.setViewportSize(mobile ? {width:390,height:700} : {width:1280,height:720});
  await start(page,info,false);
  await page.evaluate(function () {
    cr.civic();Object.assign(FB.game.auto,{all:false,major:false,minor:false});
    const ev = FB.eventById('civic_admission');FB.ui.runEvents([{id:ev.id,ctx:FB.eventContextFor(FB.state,ev,{})}]);
    window.civicCancelSnapshot = cr.snapshot();window.civicPortrait = document.querySelector('.event-participant-card');
  });
  const option = page.locator('#ev-options .evopt').first();
  for (const route of mobile ? ['cancel','escape','back','mobile-back'] : ['cancel','escape','back']) {
    await expect.poll(function () {return page.evaluate(function () {return !FB.ui.eventInputGuarded();});}).toBe(true);
    await option.click();await expect(page.locator('#event-review-cancel')).toBeVisible();
    await expect.poll(function () {return page.evaluate(function () {return !FB.ui.eventInputGuarded();});}).toBe(true);
    if (route === 'cancel') await page.locator('#event-review-cancel').click();
    else if (route === 'escape') await page.keyboard.press('Escape');
    else if (route === 'back') await page.locator('#event-nav-back').click();
    else await page.goBack();
    await expect(option).toBeVisible();
    expect(await page.evaluate(function () {return civicCancelSnapshot === cr.snapshot() && civicPortrait === document.querySelector('.event-participant-card') && document.activeElement === document.querySelector('#ev-options .evopt');})).toBe(true);
  }
});
