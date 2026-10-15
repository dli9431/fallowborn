'use strict';
const { test, expect } = require('../support/fixture');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const { startParityGame, advanceTo } = require('../support/game/parity');
const { startHistoricalGame } = require('../support/game/historical-start');

dependsOnRuntime(__filename, [
  'index.html', 'data/civic_profiles.js', 'data/bookmark_1204.js', 'data/actions.js',
  'data/lexicons.js', 'data/technology.js', 'data/economy.js', 'data/eras.js', 'data/political_institutions.js',
  'data/story_instances.js', 'js/story_government_selection.js', 'js/modifiers.js',
  'js/governments.js', 'js/government_civic.js', 'js/civic_transactions.js',
  'js/civic_strategies.js', 'js/civic_conversion.js', 'js/civic_validation.js', 'js/government_support.js',
  'js/government_collective.js', 'js/government_assembly.js', 'js/government_selection.js',
  'js/authority.js', 'js/world.js', 'js/model.js', 'js/station.js', 'js/lexicon.js', 'js/treasury.js',
  'js/settlement.js', 'js/fiscal.js', 'js/technology.js', 'js/papacy.js', 'data/papacy.js',
  'js/lordships.js', 'js/wars.js', 'js/armies.js', 'js/events.js', 'js/actions.js',
  'js/progression.js', 'js/economy.js', 'js/mods.js', 'js/save.js', 'js/save_v4.js',
  'js/main.js', 'js/ui_civic.js', 'js/ui_misc.js', 'js/ui_modals.js'
]);

async function start(page, testInfo, profile, crazygames) {
  const journey = { bookmark:'1204',code:'CIVIC-1204-farmer-venezia-m-Leo' };
  if (crazygames) await startHistoricalGame(page,testInfo,journey,true);
  else await startParityGame(page,testInfo,journey);
  return page.evaluate(function (profile) {
    const s = FB.state, V = FB.civicGovernment;
    let rid = 'venice_1204';
    if (profile) {
      // Independently researched consular policy and fictional reuse are
      // isolated fixtures, not assignments of historical Genoa in 1204.
      const p = FBDATA.civicProfiles[profile];
      rid = 'fixture_civic';
      const d = { id:rid,name:'Independent civic fixture',capital:'genoa',rank:1,
        government:'city_republic',civicProfileId:profile,constituency:p.constituency,
        religion:'catholic',ruler:{ name:'Fixture magistrate',born:s.date.year - 35,sex:'m' } };
      s.realms[rid] = { id:rid,name:d.name,capital:d.capital,color:'#658b95',rank:1,
        alive:true,liege:null,religion:d.religion,aggression:0,op:0,war:null,
        ruler:{ name:d.ruler.name,born:d.ruler.born,age:35,sex:'m',generation:1,mar:3 } };
      s.owner[d.capital] = rid; s.holder[d.capital] = rid;
      s.authority.governments[rid] = { formId:d.government,sinceTurn:s.turn };
      FB.governments.invalidate(); FB.invalidateRealmCache();
      V.initialize(s,[d]); FB.treasuryInitialize(s);
    }
    s.realms[rid].treasury.gold = 200;
    FB.governments.support.row(s,rid).scopes.forEach(function (pid) { FB.setCountySupport(s,pid,0); });
    s.player.provinceId = FB.governments.support.row(s,rid).scopes[0]; s.player.liege = rid;
    return rid;
  }, profile || null);
}

async function qualify(page,rid,officeIndex) {
  await page.evaluate(function (input) {
    const s = FB.state, V = FB.civicGovernment, c = s.chars[s.player.charId];
    s.player.tier = 1; s.player.gold = 100; c.born = s.date.year - 30; delete c.unfree;
    c.homeProvinceId = s.player.provinceId; c.sex = 'm';
    FB.SKILLS.forEach(function (k) { c.skills[k] = 10; }); FB.careerOf(s,c).experience = 5;
    const o = V.row(s,input.rid).offices[input.officeIndex || 0];
    if (V.profile(s,input.rid).eligibility.membership)
      if (!V.officeApply(s,V.officeQuote(s,input.rid,o.id,'admit',{ candidateId:c.id }))) throw new Error('Admission failed');
  }, { rid:rid,officeIndex:officeIndex });
}

test('shared institutional property keeps a magistrate private estate outside the city estate', async function ({ page },testInfo) {
  const rid = await start(page,testInfo);
  const result = await page.evaluate(function (rid) {
    const s = FB.state,c = FB.civicGovernment.chief(s,rid);
    const pid = FB.governments.support.row(s,rid).scopes.find(function (id) { return FB.settlementVisibleCount(s,id) > 1; });
    if (!pid || !FB.assignSettlementLordship(s,pid,1,c.id)) throw new Error('Private civic estate fixture unavailable');
    const actor = FB.settlementActor(s,{ kind:'character',id:c.id });
    return { personal:actor.kind === 'character' && actor.id === c.id,
      excluded:!FB.directSettlements(s,{ kind:'realm',id:rid }).some(function (site) { return site.provinceId === pid && site.settlement === 1; }),
      retained:FB.settlementHolder(s,pid,1).id === c.id,institution:FB.governments.institutionalProperty(s,rid) };
  },rid);
  expect(result).toEqual({ personal:true,excluded:true,retained:true,institution:true });
});

async function electPlayer(page,rid,officeIndex) {
  await qualify(page,rid,officeIndex);
  await page.evaluate(function (input) {
    const s = FB.state, V = FB.civicGovernment, o = V.row(s,input.rid).offices[input.officeIndex || 0];
    const prior = o.incumbentId;
    if (!V.officeApply(s,V.officeQuote(s,input.rid,o.id,'resign',{ characterId:prior }))) throw new Error('Resignation failed');
    if (!V.officeApply(s,V.officeQuote(s,input.rid,o.id,'nominate',{ candidateId:s.player.charId }))) throw new Error('Nomination failed');
    if (!V.officeApply(s,V.officeQuote(s,input.rid,o.id,'recognize',{}))) throw new Error('Selection failed');
  }, { rid:rid,officeIndex:officeIndex });
}

for (const profile of [null,'genoese_consular','civic_service_city']) {
  test('civic profile ' + (profile || 'Venice 1204') + ' has canonical ownership and pure reads', async function ({ page },testInfo) {
    const rid = await start(page,testInfo,profile);
    const result = await page.evaluate(function (rid) {
      const s = FB.state,V = FB.civicGovernment,C = FB.governments.support,r = V.row(s,rid),p = V.profile(s,rid);
      const before = JSON.stringify(s),rng = (FB.getRngState() >>> 0),uid = FB.getUidCounter();
      const mutations = [];
      function read(label,fn) {
        const bytes = JSON.stringify(s),random = FB.getRngState(),identity = FB.getUidCounter();
        fn();
        if (bytes !== JSON.stringify(s) || random !== FB.getRngState() || identity !== FB.getUidCounter()) mutations.push(label);
      }
      r.offices.forEach(function (o) {
        read(o.id + ': candidates',function () { V.candidates(s,rid,o.id); });
        read(o.id + ': nomination',function () { V.officeQuote(s,rid,o.id,'nominate',{ candidateId:s.player.charId }); });
        read(o.id + ': incumbent',function () { V.incumbent(s,rid,o.id); });
      });
      read('extraordinary dues',function () { V.proposalQuote(s,rid,'extraordinary_tax',{ amount:2,duration:90 }); });
      read('treasury',function () { FB.treasurySnapshot(s); });
      read('field host',function () { FB.aiBaseHost(s,rid); });
      read('treaty',function () { V.decision(s,rid,'treaty'); });
      const detached = C.members(s,rid); detached[0].weight = 10;
      return { pure:before === JSON.stringify(s) && rng === (FB.getRngState() >>> 0) && uid === FB.getUidCounter(),
        mutations:mutations,
        faults:FB.governments.validate(),technology:FB.validateTechnologyData(true),valid:C.validate(s),
        reviewModes:['civic_magistracies','civic_public_dues','civic_public_debt','civic_public_campaigns','civic_public_grants','civic_form_adoption','institutional_foreign_rights','civic_household_careers'].map(function (id) { return FBDATA.techImpactReviews.features[id].mode; }),
        offices:r.offices.length,tenures:p.offices.map(function (o) { return o.termDays; }),
        noDynasty:!s.realms[rid].succession && r.offices.every(function (o) { return !s.chars[o.incumbentId].royalLine; }),
        publicHolder:C.row(s,rid).scopes.every(function (pid) { return s.holder[pid] === rid; }),
        household:!FB.station.rulesRealm(s.player,s) && !FB.station.maySeekCounty(s.player,s),
        publicTreasury:FB.treasuryAvailable(s,rid),deed:FB.instantStatus(s,'civic_government').shown,
        original:FBDATA.bookmarks['1066'].realms.find(function (d) { return d.capital === 'venezia'; }).government || 'territorial' };
    },rid);
    expect(result).toMatchObject({ pure:true,mutations:[],faults:[],technology:[],valid:true,noDynasty:true,publicHolder:true,
      household:true,publicTreasury:200,deed:true,original:'territorial',reviewModes:Array(8).fill('none'),offices:profile === 'genoese_consular' ? 2 : profile ? 3 : 1,
      tenures:profile === 'genoese_consular' ? [360,360] : profile ? [180,360,720] : [null] });
  });
}

for (const crazygames of [false,true]) {
  test((crazygames ? 'CrazyGames' : 'standard') + ' civic military projections preserve ruler metadata and missing papal allegiance', async function ({ page },testInfo) {
    const rid = await start(page,testInfo,'civic_service_city',crazygames);
    const result = await page.evaluate(function (rid) {
      const s = FB.state,papacy = FB.ensurePapacy(s),oid = papacy.romanObedience;
      const chief = FB.civicGovernment.chief(s,rid),mutations = [];
      function strength(label) {
        const before = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter();
        const value = FB.papacyRealmStrengthMultiplier(s,rid);
        if (before !== JSON.stringify(s) || rng !== FB.getRngState() || uid !== FB.getUidCounter()) mutations.push(label);
        return value;
      }
      const baseline = strength('saved allegiance');
      delete papacy.realmObedience[rid];
      const missing = strength('missing allegiance');
      papacy.realmObedience[rid] = 'inactive_civic_fixture';
      papacy.obediences.inactive_civic_fixture = { status:'ended' };
      const inactive = strength('inactive allegiance');
      // The fallback must still apply an existing active sentence from Rome.
      papacy.excommunications[oid + ':' + chief.id] = { targetId:chief.id,clearedTurn:null };
      const sanctioned = strength('active sentence');
      papacy.excommunications[oid + ':' + chief.id].clearedTurn = s.turn;
      const cleared = strength('cleared sentence');
      delete s.papacy;
      const absent = strength('absent papal model');
      return { mutations:mutations,baseline:baseline,missing:missing,inactive:inactive,cleared:cleared,absent:absent,
        sanctioned:sanctioned,expectedSanction:Math.max(0.5,baseline + (FBDATA.papacy.excommunication.realmStrength || -0.10)) };
    },rid);
    expect(result.mutations).toEqual([]);
    for (const key of ['missing','inactive','cleared','absent']) expect(result[key]).toBe(result.baseline);
    expect(result.sanctioned).toBe(result.expectedSanction);
  });
}

test('a compatible settled electorate retains its members and only one current executive', async function ({ page },testInfo) {
  await start(page,testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state,C = FB.governments.support,V = FB.civicGovernment,rid = 'fixture_shared_civic';
    const d = { id:rid,name:'Shared electorate fixture',capital:'genoa',rank:1,
      government:'assembly_polity',constituency:'venetian_councils',
      representative:{ name:'Former delegate',born:1169,sex:'m' } };
    s.realms[rid] = { id:rid,name:d.name,capital:d.capital,color:'#658b95',rank:1,
      alive:true,liege:null,religion:'catholic',aggression:0,op:0,war:null,
      ruler:{ name:d.representative.name,born:1169,age:35,sex:'m',generation:1,mar:3 } };
    s.owner[d.capital] = rid; s.holder[d.capital] = rid;
    s.authority.governments[rid] = { formId:d.government,sinceTurn:s.turn };
    FB.governments.invalidate(); FB.invalidateRealmCache(); C.initialize(s,[d]);
    const electorate = C.row(s,rid),members = electorate.members,delegate = C.delegate(s,rid);
    const recorded = JSON.stringify(members),oldSelection = electorate.selection.id,oldMandate = electorate.mandate.id;
    electorate.selection.status = 'open';
    s.authority.governments[rid].formId = 'city_republic'; FB.governments.invalidate();
    d.government = 'city_republic'; d.civicProfileId = 'venice_1204'; d.ruler = { name:'New doge',born:1169,sex:'m' };
    let refused = false; try { V.initialize(s,[d]); } catch (error) { refused = true; }
    const pendingUntouched = !V.row(s,rid) && electorate.mandate.status === 'active';
    electorate.selection.status = 'resolved'; V.initialize(s,[d]); FB.treasuryInitialize(s);
    const civic = V.row(s,rid),office = civic.offices[0];
    return { refused:refused,pendingUntouched:pendingUntouched,
      sameElectorate:C.row(s,rid) === electorate && electorate.members === members && JSON.stringify(members) === recorded,
      ended:electorate.mandate.status === 'ended',single:C.delegate(s,rid).id === office.incumbentId && office.incumbentId !== delegate.id,
      unique:office.vacancy.id !== oldSelection && office.mandateId !== oldMandate,valid:C.validate(s) };
  });
  expect(result).toEqual({ refused:true,pendingUntouched:true,sameElectorate:true,ended:true,single:true,unique:true,valid:true });
});

test('nomination, membership, selection and fees reject stale facts without awarding family land', async function ({ page },testInfo) {
  const rid = await start(page,testInfo,'civic_service_city');
  await qualify(page,rid);
  const result = await page.evaluate(function (rid) {
    const s = FB.state,V = FB.civicGovernment,C = FB.governments.support,r = V.row(s,rid),o = r.offices[0],c = s.chars[s.player.charId];
    const family = JSON.stringify({ dynasty:c.dyn,children:c.childrenIds,plots:s.player.landPlots,enterprises:s.player.enterprises });
    V.officeApply(s,V.officeQuote(s,rid,o.id,'resign',{ characterId:o.incumbentId }));
    const first = V.officeQuote(s,rid,o.id,'nominate',{ candidateId:c.id }); s.player.gold++;
    const staleMoney = !V.officeApply(s,first),gold = s.player.gold;
    const second = V.officeQuote(s,rid,o.id,'nominate',{ candidateId:c.id }); c.born = s.date.year - 10;
    const staleAge = !V.officeApply(s,second); c.born = s.date.year - 30;
    const third = V.officeQuote(s,rid,o.id,'nominate',{ candidateId:c.id });
    const paid = V.officeApply(s,third),replay = !V.officeApply(s,third),fee = gold - s.player.gold;
    const review = FB.governmentSelection.reviewSource(s,'civic_magistracy',{ realmId:rid,officeId:o.id,action:'recognize',terms:{} });
    C.row(s,rid).members[0].weight++;
    const staleMembers = !FB.governmentSelection.commitSource(s,review);
    const current = FB.governmentSelection.reviewSource(s,'civic_magistracy',{ realmId:rid,officeId:o.id,action:'recognize',terms:{} });
    const selected = FB.governmentSelection.commitSource(s,current),duplicate = !FB.governmentSelection.commitSource(s,current);
    return { staleMoney:staleMoney,staleAge:staleAge,paid:paid,replay:replay,fee:fee,staleMembers:staleMembers,
      selected:selected,duplicate:duplicate,incumbent:o.incumbentId === c.id,tier:s.player.tier,
      family:family === JSON.stringify({ dynasty:c.dyn,children:c.childrenIds,plots:s.player.landPlots,enterprises:s.player.enterprises }),
      county:s.holder[s.player.provinceId] === rid,noAbsorption:!FB.absorbRealm(s,rid,c),valid:C.validate(s) };
  },rid);
  expect(result).toEqual({ staleMoney:true,staleAge:true,paid:true,replay:true,fee:2,staleMembers:true,
    selected:true,duplicate:true,incumbent:true,tier:1,family:true,county:true,noAbsorption:true,valid:true });
});

test('sworn civic membership is distinct from wealth and office', async function ({ page },testInfo) {
  const rid = await start(page,testInfo,'genoese_consular');
  const result = await page.evaluate(function (rid) {
    const s = FB.state,V = FB.civicGovernment,r = V.row(s,rid),c = s.chars[s.player.charId],o = r.offices[0];
    s.player.tier = 1; s.player.gold = 10000; c.born = s.date.year - 30; c.skills.dip = 10; delete c.unfree;
    const blocked = V.eligible(s,rid,c.id,o.id).reason === 'membership';
    const q = V.officeQuote(s,rid,o.id,'admit',{ candidateId:c.id }),before = s.player.gold;
    const admitted = V.officeApply(s,q);
    return { blocked:blocked,admitted:admitted,eligible:V.eligible(s,rid,c.id,o.id).allowed,
      stillPrivate:o.incumbentId !== c.id && s.player.gold === before && s.holder[s.player.provinceId] === rid };
  },rid);
  expect(result).toEqual({ blocked:true,admitted:true,eligible:true,stillPrivate:true });
});

test('life tenure survives elapsed terms; stale support and dead nominees cannot create mandates', async function ({ page },testInfo) {
  const rid = await start(page,testInfo);
  const result = await page.evaluate(function (rid) {
    const s = FB.state,V = FB.civicGovernment,r = V.row(s,rid),o = r.offices[0],incumbent = o.incumbentId,mandate = o.mandateId;
    s.turn = 720; FB.governments.support.day(s);
    const life = o.incumbentId === incumbent && o.mandateId === mandate && o.endTurn === null;
    V.officeApply(s,V.officeQuote(s,rid,o.id,'resign',{ characterId:incumbent }));
    const candidate = V.candidates(s,rid,o.id).find(function (cid) { return cid !== s.player.charId; });
    V.officeApply(s,V.officeQuote(s,rid,o.id,'nominate',{ candidateId:candidate }));
    const q = V.officeQuote(s,rid,o.id,'recognize',{}),before = s.realms[rid].treasury.gold;
    FB.setCountySupport(s,'venezia',-100);
    const stale = !V.officeApply(s,q);
    FB.setCountySupport(s,'venezia',0);
    const alive = V.officeQuote(s,rid,o.id,'recognize',{});
    FB.killChar(s,s.chars[candidate]);
    const dead = !V.officeApply(s,alive) && !V.officeQuote(s,rid,o.id,'recognize',{}).allowed;
    return { life:life,stale:stale,dead:dead,uncharged:s.realms[rid].treasury.gold === before,
      publicRights:r.rights.length === 1,publicHolder:s.holder.venezia === rid,valid:V.validate(s) };
  },rid);
  expect(result).toEqual({ life:true,stale:true,dead:true,uncharged:true,publicRights:true,publicHolder:true,valid:true });
});

test('fictional majority permits two magistrates and accepts qualified female candidates', async function ({ page },testInfo) {
  const rid = await start(page,testInfo,'civic_service_city'); await qualify(page,rid);
  const result = await page.evaluate(function (rid) {
    const s = FB.state,V = FB.civicGovernment,r = V.row(s,rid),c = s.chars[s.player.charId]; c.sex = 'f';
    const female = V.eligible(s,rid,c.id,r.offices[0].id).allowed;
    V.officeApply(s,V.officeQuote(s,rid,r.offices[2].id,'resign',{ characterId:r.offices[2].incumbentId }));
    const majority = V.decision(s,rid,'treaty').allowed;
    V.officeApply(s,V.officeQuote(s,rid,r.offices[1].id,'resign',{ characterId:r.offices[1].incumbentId }));
    return { female:female,majority:majority,minority:!V.decision(s,rid,'treaty').allowed,
      defence:V.decision(s,rid,'defence').allowed,publicReceipts:FB.treasurySnapshot(s).rows[rid].income > 0 };
  },rid);
  expect(result).toEqual({ female:true,majority:true,minority:true,defence:true,publicReceipts:true });
});

test('reviewed campaigns, peace and county grants reject territorial bypasses', async function ({ page },testInfo) {
  const rid = await start(page,testInfo);
  const result = await page.evaluate(function (rid) {
    const s = FB.state,V = FB.civicGovernment,enemy = 'hungary_1204';
    const target = Object.keys(FB.world.adj.zadar).find(function (pid) { return FB.warTargetDefender(s,rid,pid) && FB.warTargetDefender(s,rid,pid) !== rid; });
    const defender = FB.warTargetDefender(s,rid,target),cause = { type:'aggression',enemy:defender,target:target };
    const raw = !FB.registerOrdinaryWar(s,rid,{ enemy:defender,target:target,casus:cause,objectives:[cause],legacy:false });
    const q = V.warQuote(s,rid,{ causes:[cause] }),before = JSON.stringify(s),random = (FB.getRngState() >>> 0),identity = FB.getUidCounter();
    V.warQuote(s,rid,{ causes:[cause] });
    const pure = before === JSON.stringify(s) && random === (FB.getRngState() >>> 0) && identity === FB.getUidCounter();
    const declared = V.launchWar(s,q),duplicate = !V.launchWar(s,q),war = FB.ordinaryWarBetween(s,rid,defender);
    if (!war) throw new Error('Civic campaign did not open');
    war.seasons = 4;
    const bypass = !FB.settleOrdinaryWar(s,war.id,'white_peace'),peace = V.makePeace(s,V.peaceQuote(s,rid,{ warId:war.id }));
    const noFormBypass = !FB.authoritySetGovernment(s,rid,'territorial');
    const privateBytes = JSON.stringify({ enterprises:s.player.enterprises,plots:s.player.landPlots,gold:s.player.gold });
    const grant = V.proposalApply(s,V.proposalQuote(s,rid,'grant',{ provinceId:'zadar',recipientId:enemy }));
    return { raw:raw,pure:pure,declared:declared,duplicate:duplicate,bypass:bypass,peace:peace,noFormBypass:noFormBypass,
      grant:grant,holder:s.holder.zadar === enemy,removedScope:FB.governments.support.row(s,rid).scopes.indexOf('zadar') < 0,
      private:privateBytes === JSON.stringify({ enterprises:s.player.enterprises,plots:s.player.landPlots,gold:s.player.gold }),valid:V.validate(s) };
  },rid);
  expect(result).toEqual({ raw:true,pure:true,declared:true,duplicate:true,bypass:true,peace:true,noFormBypass:true,
    grant:true,holder:true,removedScope:true,private:true,valid:true });
});

test('explicit conversion reviews existing people and preserves old family, public rights and private debts', async function ({ page },testInfo) {
  const rid = await start(page,testInfo); await qualify(page,rid);
  const result = await page.evaluate(function () {
    const s = FB.state,V = FB.civicGovernment,oldId = 'fixture_old_court',cap = 'genoa';
    s.realms[oldId] = { id:oldId,name:'Existing local court',color:'#658b95',capital:cap,rank:1,alive:true,liege:null,
      religion:'catholic',aggression:0,op:0,war:null,ruler:{ name:'Existing ruler',sex:'m',born:1164,age:40,mar:4,generation:3 } };
    s.authority.governments[oldId] = { formId:'territorial',sinceTurn:0 }; s.owner[cap] = oldId; s.holder[cap] = oldId;
    FB.governments.invalidate(); FB.invalidateRealmCache(); FB.ensureRealmSuccession(s,oldId); FB.materializeRealmRuler(s,oldId); FB.treasuryInitialize(s);
    s.realms[oldId].treasury.gold = 90;
    s.player.provinceId = cap; s.player.liege = oldId;
    const founders = [s.player.charId];
    while (founders.length < 3) {
      const c = FB.makeCharacter(s,{ name:'Existing resident ' + founders.length,sex:'f',born:1174,culture:FB.world.byId[cap].culture,religion:'catholic',station:1,quality:1,traitsN:1 });
      c.homeProvinceId = cap; c.skills.dip = 10; FB.careerOf(s,c).experience = 5; founders.push(c.id);
    }
    // This pre-existing obligation exercises preservation rather than the
    // unrelated eligibility and research rules for issuing a new loan.
    const economy = FB.ensureEconomy(s),loan = { id:economy.nextId++,kind:'merchant',lender:'merchant_house',
      principal:30,issuePrice:economy.price,face:35.4 * economy.price,denomination:'nominal',
      dueTurn:s.turn + 360,dueSeason:s.date.season,dueYear:s.date.year + 1,
      collateral:null,defaultKind:'revenue',arrears:0,status:'active' };
    economy.loans.push(loan); s.player.gold += loan.principal;
    s.player.landPlots = [{ provinceId:cap,settlement:0 }]; s.player.landPlotMigration = 1;
    const retained = FB.authorityEstablishRight(s,{ issuer:{ kind:'realm',id:oldId },beneficiary:{ kind:'realm',id:oldId },
      scope:{ kind:'county',id:cap },power:'revenue',basis:'possession' });
    if (!retained) throw new Error('Existing public right fixture unavailable');
    const rightsBytes = JSON.stringify(s.authority.rights),propertyBytes = JSON.stringify({ plots:s.player.landPlots,enterprises:s.player.enterprises });
    const debtBytes = JSON.stringify(s.economy.loans);
    const family = JSON.stringify(s.realms[oldId].succession),wallet = s.player.gold,oldRuler = FB.realmRulerCharacterSnapshot(s,oldId).id;
    const terms = { profileId:'civic_service_city',incumbents:founders },before = JSON.stringify(s),rng = (FB.getRngState() >>> 0),uid = FB.getUidCounter();
    const q = V.conversionQuote(s,oldId,terms),pure = before === JSON.stringify(s) && rng === (FB.getRngState() >>> 0) && uid === FB.getUidCounter();
    FB.ui.showCivicConstitution(oldId,{ profileId:terms.profileId,nominees:founders });
    document.getElementById('civic-conversion-review').click();
    const review = document.getElementById('gm-body').textContent;
    const visible = review.indexOf('Household obligation ' + loan.id) >= 0 && review.indexOf('Public rights retained') >= 0 &&
      review.indexOf('Household land plots retained') >= 0 && review.indexOf('Public counties retained') >= 0;
    FB.ui.closeModal();
    const face = loan.face; loan.face++;
    const stalePrivateDebt = !V.convert(s,q); loan.face = face;
    s.realms[oldId].treasury.gold++;
    const stale = !V.convert(s,q),fresh = V.conversionQuote(s,oldId,terms);
    const adopted = V.convert(s,fresh),duplicate = !V.convert(s,fresh),r = V.row(s,oldId);
    const sameFamily = family === JSON.stringify(s.realms[oldId].succession);
    const dormant = FB.realmIdForRulerCharacter(s,oldRuler) === null && FB.governments.successionForRealm(s,oldId).civicLeadership;
    const serialized = JSON.parse(FB.save.serialize()),identity = [(FB.getRngState() >>> 0),FB.getUidCounter()]; FB.save.restore(serialized);
    return { pure:pure,visible:visible,stalePrivateDebt:stalePrivateDebt,stale:stale,adopted:adopted,duplicate:duplicate,sameFamily:sameFamily,dormant:!!dormant,
      publicFunds:FB.treasuryAvailable(FB.state,oldId),wallet:FB.state.player.gold === wallet,privateDebt:debtBytes === JSON.stringify(FB.state.economy.loans),rights:r.rights.length,
      publicRights:rightsBytes === JSON.stringify(FB.state.authority.rights),privateProperty:propertyBytes === JSON.stringify({ plots:FB.state.player.landPlots,enterprises:FB.state.player.enterprises }),
      restored:JSON.stringify(V.row(FB.state,oldId)) === JSON.stringify(r) && identity[0] === (FB.getRngState() >>> 0) && identity[1] === FB.getUidCounter(),
      valid:V.validate(FB.state) };
  });
  expect(result).toEqual({ pure:true,visible:true,stalePrivateDebt:true,stale:true,adopted:true,duplicate:true,sameFamily:true,dormant:true,
    publicFunds:91,wallet:true,privateDebt:true,publicRights:true,privateProperty:true,rights:0,restored:true,valid:true });
});

test('life tenure, separate consul vacancies, recall and term expiry preserve institution and rights', async function ({ page },testInfo) {
  const rid = await start(page,testInfo,'genoese_consular');
  const result = await page.evaluate(function (rid) {
    const s = FB.state,V = FB.civicGovernment,C = FB.governments.support,r = V.row(s,rid),first = r.offices[0],second = r.offices[1];
    const institution = r.institutionId,holder = s.holder[s.player.provinceId],other = second.incumbentId,former = first.incumbentId;
    s.chars[former].gold = 17;
    FB.killChar(s,s.chars[former]);
    const vacant = first.incumbentId === null && second.incumbentId === other && !V.decision(s,rid,'treaty').allowed;
    V.tick(s,rid);
    const replaced = first.incumbentId && first.incumbentId !== former && second.incumbentId === other;
    const unjustified = !V.officeQuote(s,rid,first.id,'remove',{ reason:'overreach' }).allowed;
    r.overreach = true;
    const removed = V.officeApply(s,V.officeQuote(s,rid,first.id,'remove',{ reason:'overreach' }));
    const interim = FB.treasurySnapshot(s).rows[rid].income >= 0;
    V.tick(s,rid); const mandate = first.mandateId;
    s.turn = first.endTurn; s.date.year++;
    C.day(s); const expired = !first.incumbentId && first.vacancy.cause === 'term_end'; V.tick(s,rid);
    return { vacant:vacant,replaced:!!replaced,unjustified:unjustified,removed:removed,interim:interim,
      expired:expired,renewed:!!first.incumbentId && first.mandateId !== mandate,identity:r.institutionId === institution,
      holder:s.holder[s.player.provinceId] === holder,privateMoney:s.chars[former].gold,valid:C.validate(s) };
  },rid);
  expect(result).toEqual({ vacant:true,replaced:true,unjustified:true,removed:true,interim:true,expired:true,renewed:true,
    identity:true,holder:true,privateMoney:17,valid:true });
});

test('foreign jurisdiction and conserved revenue shares never transfer the host county', async function ({ page },testInfo) {
  const rid = await start(page,testInfo);
  const result = await page.evaluate(function (rid) {
    const s = FB.state,V = FB.civicGovernment,r = V.row(s,rid),host = 'latin_1204',pid = 'constantinople';
    const owner = s.owner[pid],holder = s.holder[pid],household = s.player.gold;
    s.realms[host].treasury.gold = 100;
    const source = { kind:'revenue_share',grantorRealmId:host,provinceId:pid,settlement:0,share:0.2,duration:360,price:5 };
    const before = FB.treasurySnapshot(s),total = s.realms[rid].treasury.gold + s.realms[host].treasury.gold;
    const q = V.proposalQuote(s,rid,'treaty',source),funds = s.realms[rid].treasury.gold;
    s.realms[host].ruler.generation++;
    const stale = !V.proposalApply(s,q) && s.realms[rid].treasury.gold === funds;
    const paid = V.proposalApply(s,V.proposalQuote(s,rid,'treaty',source)),after = FB.treasurySnapshot(s);
    const incoming = after.rows[rid].duesIn - before.rows[rid].duesIn,outgoing = after.rows[host].duesOut - before.rows[host].duesOut;
    const overassigned = !V.proposalQuote(s,rid,'treaty',Object.assign({},source,{ share:0.9 })).allowed;
    const jurisdiction = Object.assign({},source,{ kind:'jurisdiction',share:0,price:0 });
    const granted = V.proposalApply(s,V.proposalQuote(s,rid,'treaty',jurisdiction));
    const local = FB.political;
    const peace = local.power(s,{ kind:'realm',id:rid },'peace',{ provinceId:pid,settlement:0 }).allowed;
    const broad = local.power(s,{ kind:'realm',id:rid },'peace',{ provinceId:pid }).allowed;
    const receipts = r.rights.find(function (right) { return right.kind === 'revenue_share'; });
    s.owner[pid] = 'nicaea_1204';
    V.refreshRights(s,rid); const lost = !V.rightEffective(s,rid,receipts) && receipts.status === 'suspended';
    const suspended = FB.treasurySnapshot(s).rows[rid].duesIn === before.rows[rid].duesIn;
    s.owner[pid] = owner;
    const renewed = V.proposalApply(s,V.proposalQuote(s,rid,'renew',{ rightId:receipts.id }));
    const revoked = V.proposalApply(s,V.proposalQuote(s,rid,'revoke',{ rightId:receipts.id }));
    return { stale:stale,paid:paid,total:total === s.realms[rid].treasury.gold + s.realms[host].treasury.gold,
      positive:incoming > 0,conserved:Math.abs(incoming - outgoing) < 1e-8,overassigned:overassigned,granted:granted,
      peace:peace,broad:broad,lost:lost,suspended:suspended,renewed:renewed,revoked:revoked,
      sovereignty:s.owner[pid] === owner && s.holder[pid] === holder,household:s.player.gold === household };
  },rid);
  expect(result).toEqual({ stale:true,paid:true,total:true,positive:true,conserved:true,overassigned:true,granted:true,
    peace:true,broad:false,lost:true,suspended:true,renewed:true,revoked:true,sovereignty:true,household:true });
});

test('public loans, salaries, refusal and AI use actual accounts', async function ({ page },testInfo) {
  const rid = await start(page,testInfo);
  await electPlayer(page,rid);
  const result = await page.evaluate(function (rid) {
    const s = FB.state,V = FB.civicGovernment,r = V.row(s,rid),lender = 'latin_1204';
    s.realms[lender].treasury.gold = 100;
    const terms = { lenderRealmId:lender,amount:20,interest:0.1,duration:360 },household = s.player.gold;
    const total = s.realms[lender].treasury.gold + s.realms[rid].treasury.gold;
    const lent = V.proposalApply(s,V.proposalQuote(s,rid,'pledge',terms));
    const debt = r.debts[0],due = debt.remaining;
    const conserved = total === s.realms[lender].treasury.gold + s.realms[rid].treasury.gold && household === s.player.gold;
    const q = V.proposalQuote(s,rid,'repay',{ debtId:debt.id });
    const repaid = V.proposalApply(s,q),replay = !V.proposalApply(s,q);
    const current = r.offices[0],opening = s.player.gold;
    s.turn = 90; s.realms[rid].treasury.gold = 200;
    FB.treasurySeason(s);
    const salary = s.player.gold - opening; const once = s.player.gold;
    FB.treasurySeason(s);
    const single = s.player.gold === once;
    V.officeApply(s,V.officeQuote(s,rid,current.id,'resign',{ characterId:s.player.charId })); V.tick(s,rid);
    FB.governments.support.row(s,rid).scopes.forEach(function (pid) { FB.setCountySupport(s,pid,-100); });
    const denied = V.proposalQuote(s,rid,'extraordinary_tax',{ amount:5,duration:90 });
    const old = JSON.stringify(r),cash = s.realms[rid].treasury.gold;
    V.tick(s,rid);
    return { lent:lent,conserved:conserved,due:due,repaid:repaid,replay:replay,salary:salary,single:single,
      refused:!denied.allowed,uncharged:cash === s.realms[rid].treasury.gold,unchanged:old === JSON.stringify(r) };
  },rid);
  expect(result).toEqual({ lent:true,conserved:true,due:22,repaid:true,replay:true,salary:2,single:true,refused:true,uncharged:true,unchanged:true });
});

test('detached civic saves reject malformed offices, terms, source shares and duplicate owners', async function ({ page },testInfo) {
  const rid = await start(page,testInfo);
  const result = await page.evaluate(function (rid) {
    const V = FB.civicGovernment,s = FB.state,source = JSON.parse(FB.save.serialize());
    const saved = JSON.stringify(V.row(s,rid)),members = JSON.stringify(FB.governments.support.row(s,rid));
    const rng = (FB.getRngState() >>> 0),uid = FB.getUidCounter(); FB.save.restore(source);
    const exact = saved === JSON.stringify(V.row(FB.state,rid)) && members === JSON.stringify(FB.governments.support.row(FB.state,rid)) && rng === (FB.getRngState() >>> 0) && uid === FB.getUidCounter();
    const mutations = [
      function (r) { r.schema = 2; },function (r) { r.profileId = 'missing_profile'; },
      function (r) { r.institutionId = 'another_polity'; },function (r) { r.offices[0].incumbentId = 'missing_person'; },
      function (r) { r.offices[0].generation++; },function (r) { r.offices[0].endTurn = 120; },
      function (r) { r.offices[0].vacancy.resolvedId = r.offices[0].vacancy.id; },
      function (r) { r.offices[0].vacancy.votes.extra = r.offices[0].incumbentId; },
      function (r) { r.rights[0].share = 0.5; },function (r) { r.rights[0].settlement = 1000; },
      function (r) { r.rights.push(r.rights[0]); },function (r) { r.citizens.push(r.citizens[0]); },
      function (r,state) { state.authority.governments[rid].formId = 'territorial'; }
    ];
    const rejected = mutations.map(function (change) {
      const input = JSON.parse(JSON.stringify(source)); change(input.state.authority.governments[rid].civic,input.state);
      const bytes = JSON.stringify(input),live = FB.state,random = (FB.getRngState() >>> 0),identity = FB.getUidCounter();
      let failed = false; try { FB.save.restore(input); } catch (error) { failed = true; }
      return failed && FB.state === live && bytes === JSON.stringify(input) && random === (FB.getRngState() >>> 0) && identity === FB.getUidCounter();
    });
    return { exact:exact,rejected:rejected };
  },rid);
  expect(result).toEqual({ exact:true,rejected:Array(13).fill(true) });
});

test('civic profile mods validate effective tables atomically', async function ({ page },testInfo) {
  await start(page,testInfo);
  const result = await page.evaluate(function () {
    const profiles = JSON.stringify(FBDATA.civicProfiles),forms = JSON.stringify(FBDATA.governmentForms),cp = JSON.stringify(FBDATA.constituencyProfiles);
    const invalid = JSON.parse(JSON.stringify(FBDATA.civicProfiles.civic_service_city)); invalid.executive = 'family_heir';
    let rejected = false; try { FB.mods.apply({ civicProfiles:{ fixture_bad:invalid } }); } catch (error) { rejected = true; }
    const atomic = profiles === JSON.stringify(FBDATA.civicProfiles) && forms === JSON.stringify(FBDATA.governmentForms) && cp === JSON.stringify(FBDATA.constituencyProfiles);
    const custom = JSON.parse(JSON.stringify(FBDATA.civicProfiles.civic_service_city)); custom.name = 'Independent mod constitution'; custom.offices[0].termDays = 270;
    FB.mods.apply({ civicProfiles:{ fixture_custom:custom },governmentForms:{ fixture_custom_civic:Object.assign({},FBDATA.governmentForms.city_republic,{ civicProfileId:'fixture_custom' }) } });
    return { rejected:rejected,atomic:atomic,custom:FBDATA.civicProfiles.fixture_custom.offices[0].termDays,faults:FB.governments.validate() };
  });
  expect(result).toEqual({ rejected:true,atomic:true,custom:270,faults:[] });
});

test('legacy territorial Venice remains territorial and acquires no new civic opening', async function ({ page },testInfo) {
  const journey = { bookmark:'1204',code:'OLDCIVIC-1204-farmer-venezia-m-Leo' };
  // Recreate the previous declaration before world creation; no production
  // source or existing save corpus is rewritten for this compatibility case.
  const { openGame } = require('../support/game/navigation');
  await openGame(page,testInfo);
  await page.evaluate(function () {
    // Revision layers may copy realm records, so edit Venice in every layer.
    const b = FBDATA.bookmarks['1204'];
    [b].concat(Object.values(b.revisions || {})).forEach(function (layer) {
      if (layer.stories) layer.stories = layer.stories.filter(function (id) { return id !== 'venetian_offices_1204'; });
      (layer.realms || []).filter(function (r) { return r.id === 'venice_1204'; }).forEach(function (d) {
        d.government = 'territorial'; delete d.civicProfileId; delete d.constituency; delete d.civicRights;
      });
    });
  });
  // startParityGame opens the existing game URL again, so use the owner-facing
  // seed controls directly while the isolated legacy declaration is active.
  await page.evaluate(function () { FB.startProgression.noteTier(3); });
  const fullStart = page.locator('#btn-choose-beginning');
  if (await fullStart.isVisible()) await fullStart.click(); else await page.getByRole('button',{ name:'New Game',exact:true }).click();
  await page.locator('#btn-bm-seed').click(); await page.locator('#ng-seed').fill(journey.code); await page.locator('#ng-seed').press('Enter');
  await page.getByRole('button',{ name:'Begin Your Story',exact:true }).click(); await page.getByRole('button',{ name:'Begin',exact:true }).press('Enter');
  const result = await page.evaluate(function () {
    const source = JSON.parse(FB.save.serialize()),b = FBDATA.bookmarks['1204'];
    [b].concat(Object.values(b.revisions || {})).forEach(function (layer) {
      (layer.realms || []).filter(function (r) { return r.id === 'venice_1204'; }).forEach(function (d) {
        d.government = 'city_republic'; d.civicProfileId = 'venice_1204'; d.constituency = 'venetian_councils';
      });
    });
    const before = JSON.stringify(source.state.realms.venice_1204.ruler),rng = (FB.getRngState() >>> 0),uid = FB.getUidCounter();
    FB.save.restore(source); const s = FB.state;
    return { government:FB.governments.forRealm(s,'venice_1204').id,noOpening:!FB.civicGovernment.row(s,'venice_1204'),
      ruler:JSON.stringify(s.realms.venice_1204.ruler) === before,identity:rng === (FB.getRngState() >>> 0) && uid === FB.getUidCounter() };
  });
  expect(result).toEqual({ government:'territorial',noOpening:true,ruler:true,identity:true });
});

test('bounded office turnover preserves existing people and compact history', async function ({ page },testInfo) {
  const rid = await start(page,testInfo,'civic_service_city');
  const bounded = await page.evaluate(function (rid) {
    const s = FB.state,V = FB.civicGovernment,r = V.row(s,rid),people = Object.keys(s.chars).length;
    for (let i = 0; i < 20; i++) { s.turn += 180; s.date.year = 1204 + Math.floor(s.turn / 360); FB.governments.support.day(s); V.tick(s,rid); }
    return { people:Object.keys(s.chars).length === people,history:r.history.length,bytes:JSON.stringify(r).length,valid:V.validate(s) };
  },rid);
  expect(bounded).toMatchObject({ people:true,valid:true }); expect(bounded.history).toBeLessThanOrEqual(12); expect(bounded.bytes).toBeLessThan(24000);
});

test('ordinary civic household replays one natural season', async function ({ page },testInfo) {
  const rid = await start(page,testInfo),source = await page.evaluate(function () { return JSON.parse(FB.save.serialize()); });
  async function snapshot() { return page.evaluate(function (rid) { return { civic:FB.civicGovernment.row(FB.state,rid),
    electorate:FB.governments.support.row(FB.state,rid),holder:FB.state.holder,owner:FB.state.owner,
    household:FB.state.player,rng:(FB.getRngState() >>> 0),uid:FB.getUidCounter(),date:FB.state.date }; },rid); }
  expect((await advanceTo(page,'season',100)).stop).toBeNull(); const first = await snapshot();
  await page.evaluate(function (source) { FB.save.restore(source); },source);
  expect((await advanceTo(page,'season',100)).stop).toBeNull(); expect(await snapshot()).toEqual(first);
});

for (const crazygames of [false,true]) {
  test('phone civic review retains navigation and rejects changed confirmation, distribution ' + crazygames, async function ({ page },testInfo) {
    await page.setViewportSize({ width:390,height:720 });
    const rid = await start(page,testInfo,null,crazygames); await electPlayer(page,rid);
    await page.evaluate(function (rid) { FB.ui.showCivicGovernment(rid); },rid);
    const dues = page.getByRole('button',{ name:/^Review extraordinary dues Immediate cost:/ }); await expect(dues).toBeEnabled();
    await dues.click(); await expect(page.locator('#civic-confirm')).toBeVisible();
    await page.keyboard.press('Escape'); await expect(page.locator('#civic-partner')).toBeVisible();
    await dues.click();
    await page.evaluate(function (rid) { FB.civicGovernment.row(FB.state,rid).revision++; },rid);
    await page.locator('#civic-confirm').click(); await expect(page.locator('#gm-title')).toHaveText('Terms changed');
    await page.locator('#civic-continue').click(); await expect(page.locator('#civic-partner')).toBeVisible();
    expect(await page.evaluate(function (rid) { return FB.civicGovernment.row(FB.state,rid).dues; },rid)).toBeNull();
    expect(await page.evaluate(function () { const body = document.getElementById('gm-body'); return body.scrollWidth <= body.clientWidth + 1; })).toBe(true);
  });
}
