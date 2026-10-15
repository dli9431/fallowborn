'use strict';
const { test, expect } = require('../support/fixture');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const { startHistoricalGame } = require('../support/game/historical-start');
const { seedLocalInstitution } = require('../fixtures/ecclesiastical-principality');

dependsOnRuntime(__filename,[
  'index.html','data/ecclesiastical_profiles.js','data/bookmark_1204.js','data/lexicons.js','data/actions.js',
  'data/cultures.js','data/papacy.js','data/technology.js','js/government_ecclesiastical.js',
  'js/ecclesiastical_strategies.js','js/ecclesiastical_validation.js','js/local_office_appointments.js',
  'js/governments.js','js/government_selection.js','js/government_support.js','js/authority.js',
  'js/model.js','js/world.js','js/main.js','js/papacy.js','js/institutions.js','js/treasury.js',
  'js/lordships.js','js/economy.js','js/progression.js','js/station.js','js/actions.js','js/mods.js','js/wars.js','js/systems.js',
  'js/save.js','js/save_v4.js','js/ui_ecclesiastical.js','js/ui_misc.js','js/ui_modals.js'
]);

async function start(page,info,crazygames) {
  await startHistoricalGame(page,info,{ bookmark:'1204',code:'ECCLESIA-1204-farmer-roma-m-Leo' },crazygames);
}

test('1204 binds the existing papal result, college and dated law with pure reads', async function ({ page },info) {
  await start(page,info);
  const result = await page.evaluate(function () {
    const s = FB.state,E = FB.ecclesiasticalGovernment,rid = 'papacy_1204',p = s.papacy;
    const before = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter(),c = E.incumbent(s,rid);
    E.stamp(s,rid); E.review(s,rid,'appoint',{ candidateId:s.player.charId });
    E.decision(s,rid,'levy'); FB.treasurySnapshot(s); FB.realmRulerCharacterSnapshot(s,rid);
    const law = FB.papalElectionLaw(s);
    return { pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter(),
      oneIncumbent:c.id === p.obediences[p.romanObedience].claimantId,
      bound:FB.realmIdForRulerCharacter(s,c.id) === rid,
      noSecondElection:!s.authority.governments[rid].selection && !FB.governments.support.row(s,rid),
      noPersonalTreasury:FB.treasuryCharacterRealm(s,c.id) === null,
      law:[law.threshold,law.enclosed],valid:E.validate(s),faults:FB.governments.validate(),
      technologies:['ecclesiastical_office_binding','ecclesiastical_vacancy','ecclesiastical_local_appointment','ecclesiastical_conversion'].map(function (id) { return FBDATA.techImpactReviews.features[id].mode; }) };
  });
  expect(result).toEqual({ pure:true,oneIncumbent:true,bound:true,noSecondElection:true,noPersonalTreasury:true,
    law:['twoThirds',false],valid:true,faults:[],technologies:Array(4).fill('none') });
});

test('papal death keeps institutional property and uses the canonical election once', async function ({ page },info) {
  await start(page,info);
  const result = await page.evaluate(function () {
    const s = FB.state,E = FB.ecclesiasticalGovernment,rid = 'papacy_1204',c = E.incumbent(s,rid);
    // travel bookkeeping fills its defaults lazily and is not household state
    function householdFacts() { const p = Object.assign({},s.player); delete p.travel; delete p.travelSettlement; delete p.travelHistory; return JSON.stringify(p); }
    const owners = JSON.stringify(s.owner),holders = JSON.stringify(s.holder),household = householdFacts();
    const treasury = s.realms[rid].treasury.gold,binding = JSON.stringify(E.row(s,rid));
    FB.killChar(s,c);
    const election = s.papacy.elections[s.papacy.romanObedience],id = election && election.id;
    const college = JSON.stringify(s.papacy.obediences[s.papacy.romanObedience].college);
    for (let i = 0; i < 10; i++) E.tick(s,rid);
    return { vacancy:E.incumbent(s,rid) === null,election:!!id,sameElection:s.papacy.elections[s.papacy.romanObedience].id === id,
      sameCollege:college === JSON.stringify(s.papacy.obediences[s.papacy.romanObedience].college),
      property:owners === JSON.stringify(s.owner) && holders === JSON.stringify(s.holder),
      funds:treasury === s.realms[rid].treasury.gold,binding:binding === JSON.stringify(E.row(s,rid)),
      household:household === householdFacts(),receipts:E.decision(s,rid,'revenue').allowed,
      offensive:!E.decision(s,rid,'war').allowed,secondElection:!E.review(s,rid,'appoint',{ candidateId:s.player.charId }).allowed };
  });
  expect(result).toEqual({ vacancy:true,election:true,sameElection:true,sameCollege:true,property:true,funds:true,binding:true,
    household:true,receipts:true,offensive:true,secondElection:true });
});

for (const fictional of [false,true]) {
  test('independent ' + (fictional ? 'fictional sanctuary' : 'episcopal') + ' profile uses local canonical appointment and separate lay recognition', async function ({ page },info) {
    await start(page,info);
    const at = await seedLocalInstitution(page,fictional);
    const result = await page.evaluate(function (at) {
      const s = FB.state,E = FB.ecclesiasticalGovernment,r = E.row(s,at.rid),p = E.profile(s,at.rid);
      const before = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter();
      E.review(s,at.rid,'recognize',{}); E.decision(s,at.rid,'war'); FB.localOfficeCandidates(s,at.institutionId);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      const first = !p.layRecognition || E.apply(s,E.review(s,at.rid,'recognize',{}));
      const owners = JSON.stringify([s.owner,s.holder]),gold = s.player.gold;
      const resigned = E.apply(s,E.review(s,at.rid,'resign',{ characterId:at.incumbent }));
      s.turn += 90;
      FB.localInstitutionSettle(s,at.chapterId,{ kind:'realm',id:at.rid },{ provision:true,protection:true,courts:true,tolerance:true,taxRelief:true });
      const quote = E.review(s,at.rid,'appoint',{ candidateId:at.replacement }),cash = s.realms[at.rid].treasury.gold;
      s.chars[at.replacement].born++;
      const stale = !E.apply(s,quote) && s.realms[at.rid].treasury.gold === cash;
      const fresh = E.review(s,at.rid,'appoint',{ candidateId:at.replacement }),applied = E.apply(s,fresh),replay = !E.apply(s,fresh);
      const separated = !p.layRecognition || !E.recognized(s,at.rid);
      return { pure:pure,first:first,resigned:resigned,stale:stale,applied:applied,replay:replay,separated:separated,
        oneHolder:s.religiousHeads[at.officeId] === at.replacement && E.incumbent(s,at.rid).id === at.replacement,
        property:owners === JSON.stringify([s.owner,s.holder]),privateGold:gold === s.player.gold,
        charged:cash - s.realms[at.rid].treasury.gold === p.appointmentCost,valid:E.validate(s),
        bounded:Object.keys(r).length === 7 && !r.offices && !r.election && !r.treasury };
    },at);
    expect(result).toEqual({ pure:true,first:true,resigned:true,stale:true,applied:true,replay:true,separated:true,oneHolder:true,
      property:true,privateGold:true,charged:true,valid:true,bounded:true });
  });
}

test('temporal refusal and occupation leave spiritual identity and households intact', async function ({ page },info) {
  await start(page,info);
  const at = await seedLocalInstitution(page,false);
  const result = await page.evaluate(function (at) {
    const s = FB.state,E = FB.ecclesiasticalGovernment,cid = s.religiousHeads[at.officeId];
    E.apply(s,E.review(s,at.rid,'recognize',{}));
    FB.authorityRecognitionTransition(s,E.row(s,at.rid).temporalRecognitionId,'revoke');
    E.tick(s,at.rid);
    const refusal = !E.recognized(s,at.rid) && s.religiousHeads[at.officeId] === cid;
    const holder = s.holder[at.pid],people = Object.keys(s.chars).length,privateGold = s.player.gold;
    s.owner[at.pid] = 'france_1204'; FB.invalidateRealmCache();
    const blocked = !E.decision(s,at.rid,'revenue').allowed && !E.decision(s,at.rid,'levy').allowed;
    E.tick(s,at.rid);
    return { refusal:refusal,blocked:blocked,spiritual:s.religiousHeads[at.officeId] === cid,
      holder:s.holder[at.pid] === holder,people:Object.keys(s.chars).length === people,privateGold:s.player.gold === privateGold };
  },at);
  expect(result).toEqual({ refusal:true,blocked:true,spiritual:true,holder:true,people:true,privateGold:true });
});

test('a viewer following a rival obedience cannot substitute its claimant for the temporal incumbent', async function ({ page },info) {
  await start(page,info);
  const result = await page.evaluate(function () {
    const s = FB.state,E = FB.ecclesiasticalGovernment,p = s.papacy,rid = 'papacy_1204';
    const canonical = E.incumbent(s,rid).id;
    const rival = Object.keys(p.cardinals).find(function (cid) { return cid !== canonical && s.chars[cid] && !s.chars[cid].dead; });
    const obedience = JSON.parse(JSON.stringify(p.obediences[p.romanObedience]));
    obedience.id = 'fixture_rival'; obedience.roman = false; obedience.claimantId = rival;
    p.obediences[obedience.id] = obedience;
    s.player.liege = 'england_1204'; p.realmObedience.england_1204 = obedience.id;
    const before = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter();
    const source = FB.governmentSelection.reviewSource(s,'religious_office_result',{ officeId:'catholic',person:true });
    return { incumbent:E.incumbent(s,rid).id === canonical,source:source.review.holder.id === canonical,
      distinct:!!rival && rival !== canonical,pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  });
  expect(result).toEqual({ incumbent:true,source:true,distinct:true,pure:true });
});

test('player papal accession preserves household property and the public account', async function ({ page },info) {
  await start(page,info);
  const result = await page.evaluate(function () {
    const s = FB.state,E = FB.ecclesiasticalGovernment,rid = 'papacy_1204',c = s.chars[s.player.charId],p = s.papacy;
    c.religion = 'catholic';
    FB.appointCardinal(s,c,p.romanObedience,p.obediences[p.romanObedience].claimantId);
    const privateState = JSON.stringify([s.player.enterprises,s.player.holdings,s.player.landPlots,s.player.provs,s.player.gold,s.player.tier]);
    const institutionalState = JSON.stringify([s.owner,s.holder,s.realms[rid].treasury]);
    FB.startPapalElection(s,p.romanObedience,'death');
    const election = p.elections[p.romanObedience]; election.phase = 'name'; election.winnerId = c.id;
    const name = FB.papalRegnalChoices(s,c.id)[0].name;
    const chosen = FB.choosePapalName(s,p.romanObedience,name);
    return { chosen:!!chosen,canonical:E.incumbent(s,rid).id === c.id,
      privateProperty:privateState === JSON.stringify([s.player.enterprises,s.player.holdings,s.player.landPlots,s.player.provs,s.player.gold,s.player.tier]),
      publicProperty:institutionalState === JSON.stringify([s.owner,s.holder,s.realms[rid].treasury]),
      noCustody:!p.custody[c.id],samePolity:s.religiousHeads.catholic === rid,
      noPurchasedOffice:!E.review(s,rid,'appoint',{ candidateId:c.id }).allowed };
  });
  expect(result).toEqual({ chosen:true,canonical:true,privateProperty:true,publicProperty:true,noCustody:true,samePolity:true,noPurchasedOffice:true });
});

test('private settlement inheritance does not inherit the institutional county or office', async function ({ page },info) {
  await start(page,info);
  const result = await page.evaluate(function () {
    const s = FB.state,E = FB.ecclesiasticalGovernment,rid = 'papacy_1204',c = E.incumbent(s,rid);
    const pid = E.row(s,rid).scope.find(function (id) { return FB.settlementVisibleCount(s,id) > 1; });
    if (!pid) throw new Error('The opening needs a second visible site for private inheritance coverage');
    const child = FB.makeCharacter(s,{ name:'Private heir',sex:'m',born:s.date.year - 25,culture:c.culture,religion:c.religion,
      fatherId:c.id,station:1,quality:1,traitsN:0 });
    c.childrenIds.push(child.id); child.homeProvinceId = pid;
    if (!FB.assignSettlementLordship(s,pid,1,c.id)) throw new Error('Private estate could not be assigned');
    const privateActor = FB.settlementActor(s,{ kind:'character',id:c.id });
    const isolated = !FB.directSettlements(s,{ kind:'realm',id:rid }).some(function (site) { return site.provinceId === pid && site.settlement === 1; });
    const personalSite = FB.directSettlements(s,privateActor).some(function (site) {
      return site.provinceId === pid && site.settlement === 1;
    });
    const publicAuthority = FB.settlementConstructionAuthority(s,pid,1,{ kind:'realm',id:rid }).direct;
    const owner = s.owner[pid],holder = s.holder[pid],account = s.realms[rid].treasury.gold;
    FB.killChar(s,c); FB.settlementLordshipsCharacterDied(s,c.id);
    return { isolated:isolated,personalSite:personalSite,publicAuthority:publicAuthority,
      personalActor:privateActor.kind === 'character' && privateActor.id === c.id,
      heir:FB.settlementHolder(s,pid,1).id === child.id,publicProperty:s.owner[pid] === owner && s.holder[pid] === holder,
      publicFunds:s.realms[rid].treasury.gold === account,notIncumbent:!E.incumbent(s,rid) || E.incumbent(s,rid).id !== child.id };
  });
  expect(result).toEqual({ isolated:true,personalSite:true,publicAuthority:false,
    personalActor:true,heir:true,publicProperty:true,publicFunds:true,notIncumbent:true });
});

test('local qualification and removal are independent of wealth and temporal recognition', async function ({ page },info) {
  await start(page,info);
  const at = await seedLocalInstitution(page,true);
  const result = await page.evaluate(function (at) {
    const s = FB.state,E = FB.ecclesiasticalGovernment,c = s.chars[at.incumbent];
    const lawful = !E.review(s,at.rid,'remove',{}).allowed;
    c.religion = 'catholic';
    const selected = E.review(s,at.rid,'remove',{}),removed = E.apply(s,selected);
    const player = s.chars[s.player.charId]; s.player.gold = 100000; s.player.prestige = 100000; s.player.tier = 7;
    const denied = !E.review(s,at.rid,'appoint',{ candidateId:player.id }).allowed;
    return { lawful:lawful,removed:removed,denied:denied,vacant:s.religiousHeads[at.officeId] === null,
      household:s.player.gold === 100000,publicHolder:s.holder[at.pid] === at.rid };
  },at);
  expect(result).toEqual({ lawful:true,removed:true,denied:true,vacant:true,household:true,publicHolder:true });
});

test('AI cannot purchase an appointment below reserve or bypass a live office', async function ({ page },info) {
  await start(page,info);
  const at = await seedLocalInstitution(page,true);
  const result = await page.evaluate(function (at) {
    const s = FB.state,E = FB.ecclesiasticalGovernment;
    E.apply(s,E.review(s,at.rid,'resign',{ characterId:at.incumbent }));
    s.turn += 90;
    FB.localInstitutionSettle(s,at.chapterId,{ kind:'realm',id:at.rid },{ provision:true,protection:true,courts:true,tolerance:true,taxRelief:true });
    s.realms[at.rid].treasury.gold = 0;
    const uid = FB.getUidCounter(),gold = s.player.gold;
    E.tick(s,at.rid);
    const broke = !E.incumbent(s,at.rid) && s.realms[at.rid].treasury.gold === 0;
    s.realms[at.rid].treasury.gold = 50; E.tick(s,at.rid);
    const current = E.incumbent(s,at.rid),cash = s.realms[at.rid].treasury.gold;
    for (let i = 0; i < 20; i++) E.tick(s,at.rid);
    return { broke:broke,appointed:!!current,once:cash === 48 && s.realms[at.rid].treasury.gold === cash,
      same:!!current && E.incumbent(s,at.rid).id === current.id,uid:uid === FB.getUidCounter(),household:gold === s.player.gold };
  },at);
  expect(result).toEqual({ broke:true,appointed:true,once:true,same:true,uid:true,household:true });
});

test('canonical local appointment cannot bypass its institutional fee and reserve', async function ({ page },info) {
  await start(page,info);
  const at = await seedLocalInstitution(page,true);
  const result = await page.evaluate(function (at) {
    const s = FB.state,E = FB.ecclesiasticalGovernment;
    E.apply(s,E.review(s,at.rid,'resign',{ characterId:at.incumbent }));
    s.turn += 90;
    FB.localInstitutionSettle(s,at.chapterId,{ kind:'realm',id:at.rid },{ provision:true,protection:true,courts:true,tolerance:true,taxRelief:true });
    s.realms[at.rid].treasury.gold = 6;
    const denied = FB.localOfficeQuote(s,at.institutionId,'appoint',{ candidateId:at.replacement });
    const bytes = JSON.stringify(s),blocked = !FB.localOfficeApply(s,denied) && bytes === JSON.stringify(s);
    s.realms[at.rid].treasury.gold = 7;
    const q = FB.localOfficeQuote(s,at.institutionId,'appoint',{ candidateId:at.replacement });
    const paid = FB.localOfficeApply(s,q),repeated = !FB.localOfficeApply(s,q);
    return { blocked:blocked,reason:denied.reason,paid:paid,repeated:repeated,gold:s.realms[at.rid].treasury.gold,
      canonical:E.incumbent(s,at.rid).id === at.replacement };
  },at);
  expect(result).toEqual({ blocked:true,reason:'funds',paid:true,repeated:true,gold:5,canonical:true });
});

test('office registry ignores viewer faith and vacant governments cannot declare through the raw war API', async function ({ page },info) {
  await start(page,info);
  const at = await seedLocalInstitution(page,true);
  const result = await page.evaluate(function (at) {
    const s = FB.state,E = FB.ecclesiasticalGovernment;
    const ids = Object.keys(FB.religiousOffices(s)).sort().join('|');
    s.chars[s.player.charId].religion = at.faith;
    const same = ids === Object.keys(FB.religiousOffices(s)).sort().join('|');
    E.apply(s,E.review(s,at.rid,'resign',{ characterId:at.incumbent }));
    const before = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter();
    const war = FB.registerOrdinaryWar(s,at.rid,{ enemy:'england_1204',target:'york',
      casus:{ type:'aggression',target:'york',enemy:'england_1204' },legacy:false });
    const alliance = FB.formAlliance(s,at.rid,'england_1204','fixture');
    return { same:same,denied:war === null && !alliance,pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  },at);
  expect(result).toEqual({ same:true,denied:true,pure:true });
});

for (const fictional of [false,true]) {
  test('local ' + (fictional ? 'fictional' : 'episcopal') + ' binding restores without creating people or changing ledgers', async function ({ page },info) {
    await start(page,info);
    const at = await seedLocalInstitution(page,fictional);
    const result = await page.evaluate(function (at) {
      const s = FB.state,E = FB.ecclesiasticalGovernment;
      if (E.profile(s,at.rid).layRecognition) E.apply(s,E.review(s,at.rid,'recognize',{}));
      function facts(state) { return JSON.parse(JSON.stringify([E.row(state,at.rid),state.religiousHeads,state.localInstitutions,
        state.authority.rights,state.authority.recognitions,state.realms[at.rid].treasury,Object.keys(state.chars).sort()])); }
      const before = facts(s),rng = FB.getRngState() >>> 0,uid = FB.getUidCounter(),source = JSON.parse(FB.save.serialize());
      FB.save.restore(source);
      const after = facts(FB.state),identity = rng === (FB.getRngState() >>> 0) && uid === FB.getUidCounter();
      const malformed = JSON.parse(JSON.stringify(source)); delete malformed.state.localInstitutions[at.chapterId];
      const live = FB.state,bytes = JSON.stringify(live); let rejected = false;
      try { FB.save.restore(malformed); } catch (error) { rejected = true; }
      return { before:before,after:after,identity:identity,rejected:rejected,
        unchanged:live === FB.state && bytes === JSON.stringify(live) && rng === (FB.getRngState() >>> 0) && uid === FB.getUidCounter() };
    },at);
    expect(result.after).toEqual(result.before);
    expect(result).toMatchObject({ identity:true,rejected:true,unchanged:true });
  });
}

test('save restore preserves exact identity and rejects malformed binding before adoption', async function ({ page },info) {
  await start(page,info);
  const result = await page.evaluate(function () {
    const E = FB.ecclesiasticalGovernment,rid = 'papacy_1204',source = JSON.parse(FB.save.serialize());
    const before = JSON.parse(JSON.stringify([E.row(FB.state,rid),FB.state.papacy])),rng = FB.getRngState() >>> 0,uid = FB.getUidCounter();
    FB.save.restore(source);
    const after = JSON.parse(JSON.stringify([E.row(FB.state,rid),FB.state.papacy]));
    const identity = rng === (FB.getRngState() >>> 0) && uid === FB.getUidCounter();
    const changes = [function (r) { r.schema = 2; },function (r) { r.profileId = 'missing'; },function (r) { r.officeId = 'missing'; },
      function (r) { r.institutionId = 'invented'; },function (r) { r.scope.push(r.scope[0]); },function (r) { r.scope = ['invented']; },
      function (r) { r.election = {}; },function (r) { r.temporalRecognitionId = 'missing'; },
      function (r,s) { delete s.authority.governments[rid].ecclesiastical; },function (r,s) { s.authority.governments[rid].formId = 'territorial'; }];
    const rejected = changes.map(function (change) {
      const input = JSON.parse(JSON.stringify(source)),live = FB.state,bytes = JSON.stringify(live);
      change(input.state.authority.governments[rid].ecclesiastical,input.state);
      const payload = JSON.stringify(input); let failed = false;
      try { FB.save.restore(input); } catch (error) { failed = true; }
      return failed && FB.state === live && bytes === JSON.stringify(live) && payload === JSON.stringify(input) && rng === (FB.getRngState() >>> 0) && uid === FB.getUidCounter();
    });
    return { before:before,after:after,identity:identity,rejected:rejected };
  });
  expect(result.after).toEqual(result.before);
  expect(result).toMatchObject({ identity:true,rejected:Array(10).fill(true) });
});

test('legacy papal form restores unchanged and explicit adoption never runs another election', async function ({ page },info) {
  await start(page,info);
  const result = await page.evaluate(function () {
    const source = JSON.parse(FB.save.serialize()),rid = 'papacy_1204';
    delete source.state.authority.governments[rid].ecclesiastical;
    source.state.authority.governments[rid].formId = 'territorial';
    FB.save.restore(source);
    const s = FB.state,E = FB.ecclesiasticalGovernment,legacy = !E.row(s,rid) && !E.active(s,rid);
    const election = JSON.stringify(s.papacy),property = JSON.stringify([s.owner,s.holder,s.player]),rng = FB.getRngState(),uid = FB.getUidCounter();
    const q = E.conversionQuote(s,rid,{ profileId:'papal_temporal_1204',officeId:'catholic',institutionId:null });
    const converted = E.convert(s,q),repeat = !E.convert(s,q);
    return { legacy:legacy,converted:converted,repeat:repeat,election:election === JSON.stringify(s.papacy),
      property:property === JSON.stringify([s.owner,s.holder,s.player]),identity:rng === FB.getRngState() && uid === FB.getUidCounter(),valid:E.validate(s) };
  });
  expect(result).toEqual({ legacy:true,converted:true,repeat:true,election:true,property:true,identity:true,valid:true });
});

for (const crazygames of [false,true]) {
  test('institution review is available in ' + (crazygames ? 'CrazyGames' : 'standard') + ' with retained mobile navigation', async function ({ page },info) {
    await start(page,info,crazygames);
    await page.setViewportSize({ width:390,height:844 });
    await page.evaluate(function () {
      const s = FB.state; s.player.liege = 'papacy_1204'; s.player.provinceId = 'roma';
      FB.ui.showEcclesiasticalGovernment('papacy_1204');
    });
    await expect(page.locator('#gm-body')).toContainText('Canonical incumbent');
    await expect(page.locator('#gm-body')).toContainText('Public treasury');
    await expect(page.locator('#gm-body')).toContainText('Household money');
    await page.locator('#ecclesiastical-person').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-ecclesiastical-list]')).toBeVisible();
    await expect(page.locator('#ecclesiastical-person')).toBeFocused();
    await page.locator('#ecclesiastical-person').click();
    await page.locator('[data-modal-nav="back"]').click();
    await expect(page.locator('[data-ecclesiastical-list]')).toBeVisible();
    await expect(page.locator('#ecclesiastical-person')).toBeFocused();
    const at = await seedLocalInstitution(page,false);
    await page.evaluate(function (at) { FB.ui.showEcclesiasticalGovernment(at.rid); },at);
    await page.getByRole('button',{ name:'Review temporal recognition',exact:true }).click();
    await expect(page.locator('#gm-body')).toContainText('Exact decision terms');
    await expect(page.locator('#gm-body')).toContainText('Opening prelate');
    await page.evaluate(function () { FB.state.turn++; });
    await page.locator('#ecclesiastical-confirm').click();
    await expect(page.locator('#gm-body')).toContainText('Nothing was spent');
    await page.locator('#ecclesiastical-continue').click();
    await expect(page.locator('[data-ecclesiastical-list]')).toBeVisible();
  });
}

test('natural days and restore do not accumulate government state', async function ({ page },info) {
  await start(page,info);
  const before = await page.evaluate(function () { return JSON.stringify(FB.ecclesiasticalGovernment.row(FB.state,'papacy_1204')); });
  const elapsed = await page.evaluate(function () {
    const turn = FB.state.turn;
    for (let i = 0; i < 4; i++) FB.game.passDay();
    return FB.state.turn - turn;
  });
  expect(elapsed).toBe(4);
  expect(await page.evaluate(function () {
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return JSON.stringify(FB.ecclesiasticalGovernment.row(FB.state,'papacy_1204'));
  })).toBe(before);
});
