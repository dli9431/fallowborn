'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {advanceTo} = require('../support/game/parity');
const {advanceBookmark} = require('../support/game/bookmark-acceptance');
const {injectBrowserHarness} = require('../support/game/browser-harness');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
dependsOnRuntime(__filename,[
  'index.html','data/aristocratic_courts.js','data/starts.js','data/bookmark_476.js','data/bookmark_476_outer.js',
  'data/bookmark_476_italy.js','data/political_institutions.js','data/eras.js','data/lexicons.js','data/technology.js',
  'data/actions.js','data/systems.js','data/cultures.js','data/story_courts_476.js',
  'js/government_aristocracy.js','js/government_recognition.js','js/government_administration.js','js/government_lineage.js',
  'js/government_selection.js','js/government_levy.js','js/government_revenue.js','js/government_continuity.js',
  'js/government_council.js','js/government_diplomacy.js','js/government_ai.js','js/governments.js',
  'js/world.js','js/authority.js','js/treasury.js','js/fiscal.js','js/lordships.js','js/bookmark_setup.js','js/starts.js',
  'js/main.js','js/model.js','js/station.js','js/progression.js','js/actions.js','js/justice.js','js/religion.js',
  'js/save.js','js/save_v4.js','js/mods.js','js/stories.js','js/messages.js','js/i18n.js','js/ui_misc.js','js/ui_modals.js',
  'css/style.css','js/crazygames.js','data/distribution_crazygames.js'
]);

async function start(page,testInfo,options) {
  options = options || {};
  if (options.crazygames) {
    await mockCrazyGames(page);
    await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
    await openCrazyGame(page,testInfo);
  } else await openGame(page,testInfo);
  if (options.fictional) {
    await page.addScriptTag({path:path.resolve(__dirname,'../fixtures/aristocratic-monarchy.js')});
    await page.evaluate(function () { FB_ARISTOCRATIC_FIXTURE.install(); });
  }
  if (options.ruler) await page.evaluate(function () {
    // Owner acceptance context, isolated from production visibility.
    FBDATA.startScenarios.find(function (r) { return r.id === 'peroz_476'; }).hidden = false;
  });
  await page.evaluate(function () { FB.startProgression.noteTier(3); });
  const beginning = page.locator('#btn-choose-beginning');
  if (await beginning.isVisible()) await beginning.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  const code = options.ruler ? 'ROYALREVIEW-476-peroz_476-baghdad-m-Peroz-standard-0-persian.zoroastrian' :
    options.fictional ? 'ROYALREVIEW-476-farmer_476-london-m-Review-established-0-brittonic.nicene' :
      'ROYALREVIEW-476-farmer_476-rayy-m-Review-established-0-persian.zoroastrian';
  await page.locator('#ng-seed').fill(code); await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function (options) {
    FB.game.setPaused(true); FB.game.auto.all = true; FB.game.auto.style = 'first';
    FB.game.uiPrefs.hideTips = true; FB.game.uiPrefs.hideBeginnerHints = true;
    FB.ui.coachmarkReset(); delete FB.state.player.flags.tutorial;
    const s = FB.state, rid = options.ruler ? 'player' : options.fictional ? FB_ARISTOCRATIC_FIXTURE.realmId : 'sasanian_476';
    const actor = {kind:'realm',id:rid};
    FB.realmHeldCounties(s,rid).forEach(function (pid) { FB.setCountySupport(s,pid,40); });
    if (rid === 'player') s.player.gold = 1000; else s.realms[rid].treasury.gold = 1000;
    window.ARISTO = {rid:rid,actor:actor,
      row:function () { return s.authority.governments[rid]; },
      data:function () { return FB.aristocracy.state(s,rid); },
      voices:function () { return FB.aristocracy.constituency(s,rid); },
      candidate:function () { return FB.governmentRecognition.candidates(s,rid)[0]; },
      back:function (id) {
        const R = FB.governmentRecognition;
        R.members(s,rid).forEach(function (m) {
          const q = R.supportQuote(s,m.principal,rid,m.id,id,FB.aristocracy.profile(s,rid).defaultTerms);
          if (!R.applySupport(s,q)) throw new Error(q.reason);
        });
      }};
  },options);
}

for (const fictional of [false,true]) {
  test((fictional ? 'fictional chartered court' : '476 Sasanian court') + ' separates royal descent, local rights, public office and private estates', async function ({page},testInfo) {
    await start(page,testInfo,{fictional:fictional});
    const result = await page.evaluate(function (fictional) {
      const s = FB.state, a = ARISTO, A = FB.aristocracy, R = FB.governmentRecognition;
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const voices = a.voices(), candidates = R.candidates(s,a.rid);
      const eligibility = voices.map(function (m) { return A.royalEligibility(s,a.rid,m.principal.id).allowed; });
      const q = R.accessionQuote(s,a.rid,'abdication');
      const inheritance = A.inheritanceQuote(s,a.actor,a.rid,voices[0].id);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      return {pure:pure,form:FB.governments.forRealm(s,a.rid).id,eligible:eligibility,
        live:voices.every(function (m) { return m.active && m.rightIds.length === 2 && m.terms.levy === 0.7; }),
        royal:candidates.length > 0,minor:fictional && candidates.some(function (c) { return c.minor; }),
        vacancy:!q.allowed,inheritance:!inheritance.allowed,profiles:FB.governments.validate(),
        direct:FB.realmHeldCounties(s,a.rid).every(function (pid) { return s.holder[pid] === a.rid; }),
        distinct:voices.every(function (m) { return s.bookmarkSetup.estates.some(function (e) { return e.holderId === m.principal.id && e.provinceId === m.scope.id; }); }),
        vocabulary:FB.station.promotion({tier:3,realmId:a.rid},s) === null,
        offices:FB.publicOfficeRows(s,a.rid).filter(function (row) { return !A.assignment(s,row); }).length};
    },fictional);
    expect(result).toEqual({pure:true,form:'aristocratic_monarchy',eligible:[false,false],live:true,royal:true,
      minor:fictional,vacancy:true,inheritance:true,profiles:[],direct:true,distinct:true,vocabulary:true,offices:fictional ? 0 : 1});
  });

  test((fictional ? 'fictional' : 'Sasanian') + ' accepted recognition commits once and refusal remains a real vacancy', async function ({page},testInfo) {
    await start(page,testInfo,{fictional:fictional});
    const result = await page.evaluate(function () {
      const s = FB.state, a = ARISTO, R = FB.governmentRecognition;
      const first = a.voices()[0], candidate = a.candidate();
      a.back(candidate.id);
      const noFalseDeath = !R.accessionQuote(s,a.rid,'death').allowed;
      const withdrawn = R.applySupport(s,R.supportQuote(s,first.principal,a.rid,first.id,null));
      // Court plus one small interest is insufficient in each declaration.
      const blocked = !R.accessionQuote(s,a.rid,'abdication').allowed;
      const old = s.realms[a.rid].succession.members[s.realms[a.rid].succession.rulerMemberId];
      old.alive = false; if (old.charId) s.chars[old.charId].dead = true;
      const empty = FB.advanceRealmSuccession(s,a.rid,{cause:'death'}) === null;
      const vacancy = JSON.stringify(a.row().publicVacancy);
      FB.advanceRealmSuccession(s,a.rid,{cause:'death'});
      const bounded = vacancy === JSON.stringify(a.row().publicVacancy);
      a.back(candidate.id);
      const q = FB.publicAccessionQuote(s,a.actor,a.rid,'death'), generation = FB.realmRulerGeneration(s,a.rid);
      const property = JSON.stringify([s.owner,s.holder,s.bookmarkSetup.estates]);
      const accepted = !!FB.publicAccede(s,q), after = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const once = !FB.publicAccede(s,q) && after === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      return {noFalseDeath:noFalseDeath,withdrawn:withdrawn,blocked:blocked,empty:empty,bounded:bounded,accepted:accepted,once:once,
        generation:FB.realmRulerGeneration(s,a.rid) === generation + 1,
        property:property === JSON.stringify([s.owner,s.holder,s.bookmarkSetup.estates]),
        clear:!a.row().publicVacancy && Object.keys(a.row().recognition).length === 0};
    });
    expect(result).toEqual({noFalseDeath:true,withdrawn:true,blocked:true,empty:true,bounded:true,accepted:true,once:true,generation:true,property:true,clear:true});
  });
}

test('paid support reviews bind ancestry, participants, jurisdiction, generation, terms and actual payer', async function ({page},testInfo) {
  await start(page,testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, a = ARISTO, R = FB.governmentRecognition, m = a.voices()[0], candidate = a.candidate();
    const q = function () { return R.supportQuote(s,a.actor,a.rid,m.id,candidate.id,{revenue:0.65,levy:0.6}); };
    const changes = [
      function () { s.realms[a.rid].treasury.gold--; },
      function () { s.chars[m.principal.id].dead = true; },
      function () { s.realms[a.rid].ruler.generation++; },
      function () { const right=s.authority.rights.find(function (r) { return r.id === m.rightIds[0]; }); right.strength--; },
      function () { const live=s.realms[a.rid].succession.members[candidate.id];live.alive=false;if(live.charId)s.chars[live.charId].dead=true; },
      function () { const live=s.realms[a.rid].succession.members[candidate.id];live.fatherId=null;live.parentId=null;if(live.charId)s.chars[live.charId].fatherId=null; }
    ];
    const original = JSON.parse(FB.save.serialize());
    const rejected = changes.map(function (change) {
      const proposal=q(); change(); const before=JSON.stringify(s), gold=s.realms[a.rid].treasury.gold;
      const rejected=!R.applySupport(s,proposal) && before === JSON.stringify(s) && gold === s.realms[a.rid].treasury.gold;
      // Keep the same fixture object and restore just the reviewed facts.
      s.realms[a.rid] = JSON.parse(JSON.stringify(original.state.realms[a.rid]));
      s.authority = JSON.parse(JSON.stringify(original.state.authority));
      Object.keys(original.state.chars).forEach(function (id) { s.chars[id] = JSON.parse(JSON.stringify(original.state.chars[id])); });
      FB.rebuildRulerIndex(s); FB.governments.invalidate();
      return rejected;
    });
    const costly = q(), payer = s.realms[a.rid].treasury.gold, playerGold = s.player.gold;
    const paid = R.applySupport(s,costly), fee = payer - s.realms[a.rid].treasury.gold;
    s.realms[a.rid].treasury.gold = 0;
    const unaffordable = !q().allowed;
    const excessive = !R.supportQuote(s,m.principal,a.rid,m.id,candidate.id,{revenue:0.9,levy:0.9}).allowed;
    return {rejected:rejected,paid:paid,fee:fee,player:playerGold === s.player.gold,unaffordable:unaffordable,excessive:excessive};
  });
  expect(result).toEqual({rejected:[true,true,true,true,true,true],paid:true,fee:8,player:true,unaffordable:true,excessive:true});
});

test('provincial refusal reduces existing revenue and levy; enforcement needs real jurisdiction and exact review', async function ({page},testInfo) {
  await start(page,testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, a = ARISTO, A = FB.aristocracy, G = FB.governments, m = a.voices()[0], pid = m.scope.id;
    const input = {provinceId:pid,share:1,population:1,modifier:1,buildings:0,support:1};
    const capacity = function () { return G.call(s,a.rid,'levy','settlementBase',input); };
    const normal = capacity(), income = FB.publicCountyIncome(s,a.rid,pid), property = JSON.stringify([s.owner,s.holder,s.bookmarkSetup.estates]);
    const refused = A.apply(s,A.provincialQuote(s,m.principal,a.rid,m.id,'withhold'));
    const reduced = capacity() < normal && FB.publicCountyIncome(s,a.rid,pid) < income;
    const q = A.provincialQuote(s,a.actor,a.rid,m.id,'enforce');
    FB.setCountySupport(s,pid,39); const before=JSON.stringify(s);
    const stale = !A.apply(s,q) && before === JSON.stringify(s);
    const quote=A.provincialQuote(s,a.actor,a.rid,m.id,'enforce'), support=FB.countySupportBase(s,pid);
    const enforced = A.apply(s,quote);
    const cost = support - FB.countySupportBase(s,pid);
    A.apply(s,A.provincialQuote(s,m.principal,a.rid,m.id,'withhold'));
    s.holder[pid] = 'italy';
    const lost = !A.provincialQuote(s,a.actor,a.rid,m.id,'enforce').allowed;
    s.holder[pid] = a.rid;
    const offered=A.provincialQuote(s,a.actor,a.rid,m.id,'negotiate',{revenue:0.65,levy:0.6});
    const gold=s.realms[a.rid].treasury.gold, bargain=A.apply(s,offered);
    return {refused:refused,reduced:reduced,stale:stale,enforced:enforced,cost:cost,lost:lost,bargain:bargain,fee:gold-s.realms[a.rid].treasury.gold,
      terms:a.voices()[0].terms,property:property === JSON.stringify([s.owner,s.holder,s.bookmarkSetup.estates])};
  });
  expect(result).toEqual({refused:true,reduced:true,stale:true,enforced:true,cost:8,lost:true,bargain:true,fee:8,
    terms:{revenue:0.65,levy:0.6,status:'assent'},property:true});
});

test('magnate probate and governor replacement retain private estates and family trees independently', async function ({page},testInfo) {
  await start(page,testInfo);
  const result = await page.evaluate(function () {
    const s=FB.state,a=ARISTO,A=FB.aristocracy,m=a.voices()[0];
    const input={institutionId:a.rid,officeId:FB.administrationProfile(s,a.rid).governor,
      holderId:s.player.charId,provinceId:m.scope.id,scope:m.scope};
    const c=s.chars[s.player.charId]; c.unfree=false; s.player.prestige=500; c.skills.ste=20;
    const office=FB.publicAppoint(s,FB.publicAppointmentQuote(s,a.actor,input));
    if (!office) throw new Error('Governor appointment failed');
    const estates=JSON.stringify(s.bookmarkSetup.estates),family=JSON.stringify([s.chars[m.principal.id].fatherId,s.chars[m.principal.id].childrenIds]);
    s.chars[m.principal.id].dead=true;
    const quote=A.inheritanceQuote(s,a.actor,a.rid,m.id), applied=A.inherit(s,quote), once=!A.inherit(s,quote);
    const privateUntouched=estates === JSON.stringify(s.bookmarkSetup.estates);
    const governor=s.authority.appointments.find(function (r) { return r.id === office.id; });
    const principalChanged=a.voices()[0].principal.id === quote.heirId;
    const familyUnchanged=family === JSON.stringify([s.chars[m.principal.id].fatherId,s.chars[m.principal.id].childrenIds]);
    const dismissal=FB.publicOfficeApply(s,FB.publicOfficeQuote(s,a.actor,governor.id,'remove'));
    const aliveRights=a.voices()[0].active;
    // Ordinary estate probate is owned by the existing opening ledger.
    FB.stories.day(s);
    const estate=s.bookmarkSetup.estates.find(function (e) { return e.provinceId === m.scope.id && e.dynasty === m.dynasty; });
    return {applied:applied,once:once,privateUntouched:privateUntouched,principalChanged:principalChanged,
      family:familyUnchanged,governor:governor.holder.id === c.id,dismissal:dismissal,aliveRights:aliveRights,
      estate:estate.holderId === quote.heirId,nonroyal:!A.royalEligibility(s,a.rid,quote.heirId).allowed};
  });
  expect(result).toEqual({applied:true,once:true,privateUntouched:true,principalChanged:true,family:true,governor:true,dismissal:true,aliveRights:true,estate:true,nonroyal:true});
});

test('minor royal accession needs living stewardship and keeps administration during a real vacancy', async function ({page},testInfo) {
  await start(page,testInfo,{fictional:true});
  const result = await page.evaluate(function () {
    const s=FB.state,a=ARISTO,A=FB.aristocracy,R=FB.governmentRecognition;
    const minor=R.candidates(s,a.rid).find(function (c) { return c.minor; }); a.back(minor.id);
    const quote=FB.publicAccessionQuote(s,a.actor,a.rid,'abdication');
    const approved=!!FB.publicAccede(s,quote),regency=a.data().regency;
    const principal=s.chars[regency.stewardId]; principal.dead=true;
    const impaired=!FB.political.consent(s,a.actor,'war',{}).allowed;
    const serialized=JSON.parse(FB.save.serialize()); FB.save.restore(serialized);
    const restored=JSON.stringify(regency) === JSON.stringify(A.state(FB.state,a.rid).regency);
    return {minor:quote.minor,approved:approved,steward:!!regency.stewardId,
      generation:regency.generation === FB.realmRulerGeneration(FB.state,a.rid),impaired:impaired,restored:restored};
  });
  expect(result).toEqual({minor:true,approved:true,steward:true,generation:true,impaired:true,restored:true});
});

test('public assignments conserve the existing purse and reuse source receipts once per season', async function ({page},testInfo) {
  await start(page,testInfo);
  const result = await page.evaluate(function () {
    const s=FB.state,a=ARISTO,recipients=a.voices().map(function (m) { return s.chars[m.principal.id]; });
    const all=s.authority.appointments.filter(function (r) { return r.institutionId === a.rid && r.publicTerms; });
    all.forEach(function (r) { const c=s.chars[r.holder.id]; if (!recipients.includes(c)) recipients.push(c); });
    const total=function () { return s.realms[a.rid].treasury.gold + recipients.reduce(function (n,c) { return n+(c.gold || 0); },0); };
    const before=total(); s.turn+=90; FB.publicOfficeSettle(s,null,1,false);
    const conserved=Math.abs(total()-before)<0.000001;
    const first=JSON.stringify([s.realms[a.rid].treasury,recipients.map(function (c) { return c.gold; }),all]);
    FB.publicOfficeSettle(s,null,1,false);
    return {conserved:conserved,once:first === JSON.stringify([s.realms[a.rid].treasury,recipients.map(function (c) { return c.gold; }),all]),
      paid:all.every(function (r) { return r.publicTerms.last && r.publicTerms.last.paid > 0 && r.publicTerms.last.due <= r.publicTerms.last.gross; })};
  });
  expect(result).toEqual({conserved:true,once:true,paid:true});
});

test('conversion and conquest preserve surviving local rights, households and minority communities', async function ({page},testInfo) {
  await start(page,testInfo);
  const result = await page.evaluate(function () {
    const s=FB.state,a=ARISTO,A=FB.aristocracy,m=a.voices()[0];
    const facts=JSON.stringify([a.data().interests,s.bookmarkSetup.estates,s.population.counties[m.scope.id],s.chars[m.principal.id]]);
    const quote=A.conversionQuote(s,a.actor,a.rid,'regnum');
    A.apply(s,A.provincialQuote(s,m.principal,a.rid,m.id,'withhold'));
    const stale=!A.convert(s,quote),blocked=!A.conversionQuote(s,a.actor,a.rid,'regnum').allowed;
    A.apply(s,A.provincialQuote(s,m.principal,a.rid,m.id,'assent'));
    const changed=A.convert(s,A.conversionQuote(s,a.actor,a.rid,'regnum'));
    const oldForm=FB.governments.forRealm(s,a.rid).id;
    const returning=A.convert(s,A.conversionQuote(s,a.actor,a.rid,'aristocratic_monarchy'));
    const preserved=facts === JSON.stringify([a.data().interests,s.bookmarkSetup.estates,s.population.counties[m.scope.id],s.chars[m.principal.id]]);
    const right=s.authority.rights.find(function (r) { return r.id === m.rightIds[0]; });
    FB.transferProvince(s,m.scope.id,'byzantium');
    return {stale:stale,blocked:blocked,changed:changed,oldForm:oldForm,returning:returning,preserved:preserved,
      conquest:s.holder[m.scope.id] === 'byzantium',rights:right.status === 'active' && right.beneficiary.id === m.principal.id,
      inactive:!a.voices()[0].active,estate:s.bookmarkSetup.estates.some(function (e) { return e.holderId === m.principal.id; })};
  });
  expect(result).toEqual({stale:true,blocked:true,changed:true,oldForm:'regnum',returning:true,preserved:true,conquest:true,rights:true,inactive:true,estate:true});
});

test('alliances protect distinct courts while a funded tribute transfers cash without appointment or religious conversion', async function ({page},testInfo) {
  await start(page,testInfo,{ruler:true});
  const result = await page.evaluate(function () {
    const s=FB.state, rid='player', partner='byzantium';
    FB.breakAlliance(s,rid); FB.breakAlliance(s,partner);
    const facts=JSON.stringify([s.owner,s.holder,s.population.counties.baghdad,s.realms[partner].religion,s.realms[partner].liege,s.authority.appointments]);
    const alliance=FB.formAlliance(s,rid,partner,'diplomacy');
    const protectedCourt=FB.areAlliedSnapshot(s,rid,partner),independent=!s.realms[partner].liege;
    FB.breakAlliance(s,rid,partner);
    s.player.war={enemy:partner,target:s.realms[partner].capital,wins:3,losses:2,seasons:4,strength:1,defending:false,casus:{type:'border'}};
    const quote=FB.warPeaceTerms(s,'war_accept_tribute'),cash=s.player.gold;
    const combined=s.player.gold+s.realms[partner].treasury.gold;
    FB.fns.war_accept_tribute(s);FB.fns.war_accept_tribute(s);
    const transferred=!s.player.war && s.player.gold-cash === quote.gold && quote.gold > 0;
    const conserved=Math.abs(combined-s.player.gold-s.realms[partner].treasury.gold)<0.000001;
    return {alliance:alliance,protectedCourt:protectedCourt,independent:independent,transferred:transferred,conserved:conserved,
      separate:!FB.areAlliedSnapshot(s,rid,partner),facts:facts === JSON.stringify([s.owner,s.holder,s.population.counties.baghdad,s.realms[partner].religion,s.realms[partner].liege,s.authority.appointments])};
  });
  expect(result).toEqual({alliance:true,protectedCourt:true,independent:true,transferred:true,conserved:true,separate:true,facts:true});
});

test('AI honors a principal refusal, provincial support and an unfunded court without drawing on player wealth', async function ({page},testInfo) {
  await start(page,testInfo);
  const result = await page.evaluate(function () {
    const s=FB.state,a=ARISTO,A=FB.aristocracy,R=FB.governmentRecognition,m=a.voices()[0],candidate=a.candidate();
    R.applySupport(s,R.supportQuote(s,m.principal,a.rid,m.id,null));
    FB.setCountySupport(s,m.scope.id,-40); s.realms[a.rid].treasury.gold=0;
    const cash=s.player.gold,uid=FB.getUidCounter(),count=s.authority.appointments.length;
    A.ai(s,a.rid); const first=JSON.stringify([a.row(),s.authority.appointments]); A.ai(s,a.rid);
    const noGrowth=count === s.authority.appointments.length && uid === FB.getUidCounter();
    const refusal=a.row().recognition[m.id].candidateId === null && a.voices()[0].terms.status === 'withheld';
    const same=first === JSON.stringify([a.row(),s.authority.appointments]);
    return {refusal:refusal,same:same,noGrowth:noGrowth,player:cash === s.player.gold,
      paid:!R.supportQuote(s,a.actor,a.rid,m.id,candidate.id,{revenue:0.65,levy:0.6}).allowed};
  });
  expect(result).toEqual({refusal:true,same:true,noGrowth:true,player:true,paid:true});
});

test('detached v4 validation rejects forged ancestry, duplicate scope, invalid commitments and dangling principals before adoption', async function ({page},testInfo) {
  await start(page,testInfo);
  const result = await page.evaluate(function () {
    const s=FB.state,a=ARISTO; a.back(a.candidate().id);
    const envelope=JSON.parse(FB.save.serialize()),ledger=JSON.stringify(envelope.state.authority);
    FB.save.restore(envelope); const adopted=FB.state;
    const exact=ledger === JSON.stringify(adopted.authority) && (envelope.rng>>>0) === (FB.getRngState()>>>0) && envelope.uid === FB.getUidCounter();
    const edits=[
      function (s,d) { delete s.authority.governments[a.rid].aristocracy; },
      function (s,d) { s.authority.governments[a.rid].administrationProfileId='chartered_provinces'; },
      function (s,d) { d.royalRoots=['unknown_root']; },
      function (s,d) { d.royalRoots=[s.realms[a.rid].succession.rulerMemberId]; },
      function (s,d) { d.interests[1].scope=d.interests[0].scope; },
      function (s,d) { d.interests[0].rightIds[1]=d.interests[0].rightIds[0]; },
      function (s,d) { delete s.chars[s.authority.appointments.find(function (r) { return r.id === d.interests[0].appointmentId; }).holder.id]; },
      function (s,d) { s.authority.appointments.find(function (r) { return r.id === d.interests[0].appointmentId; }).provincialTerms.levy=2; },
      function (s,d) { s.authority.governments[a.rid].recognition[d.interests[0].id].terms.revenue=0.1; },
      function (s,d) { s.authority.governments[a.rid].recognition[d.interests[0].id].candidateId=s.authority.appointments.find(function (r) { return r.id === d.interests[0].appointmentId; }).holder.id; },
      function (s,d) { s.authority.governments[a.rid].recognition[d.interests[0].id].principal={kind:'realm',id:a.rid}; },
      function (s,d) { d.regency={generation:FB.realmRulerGeneration(s,a.rid),stewardId:s.player.charId,sinceTurn:s.turn}; }
    ];
    const rejected=edits.map(function (edit) {
      const bad=JSON.parse(JSON.stringify(envelope));edit(bad.state,bad.state.authority.governments[a.rid].aristocracy);
      const rng=FB.getRngState(),uid=FB.getUidCounter();let threw=false;
      try { FB.save.restore(bad); } catch (error) { threw=true; }
      return threw && FB.state === adopted && rng === FB.getRngState() && uid === FB.getUidCounter();
    });
    return {exact:exact,rejected:rejected,v:envelope.v};
  });
  expect(result).toEqual({exact:true,rejected:[true,true,true,true,true,true,true,true,true,true,true,true],v:4});
});

test('an earlier wider save keeps regnum and the original opening without seeding new people or offices', async function ({page},testInfo) {
  await start(page,testInfo);
  const result = await page.evaluate(function () {
    const envelope=JSON.parse(FB.save.serialize()),s=envelope.state,rid=ARISTO.rid,row=s.authority.governments[rid];
    const appointmentIds=row.aristocracy.interests.map(function (m) { return m.appointmentId; });
    const rightIds=row.aristocracy.interests.reduce(function (list,m) { return list.concat(m.rightIds); },[]);
    s.authority.appointments=s.authority.appointments.filter(function (r) { return r.institutionId !== rid; });
    s.authority.rights=s.authority.rights.filter(function (r) { return !rightIds.includes(r.id); });
    s.authority.governments[rid]={formId:'regnum',sinceTurn:0};
    ['mihran_elder','mihran_heir','karen_elder','karen_heir','ctesiphon_governor'].forEach(function (id) {
      delete s.chars[s.bookmarkSetup.actors[id]]; delete s.bookmarkSetup.actors[id];
    });
    s.bookmarkSetup.estates=s.bookmarkSetup.estates.filter(function (e) { return !['mihran_estate_476','karen_estate_476'].includes(e.id); });
    delete s.bookmarkSetup.revision;
    const source=JSON.stringify(s.bookmarkSetup),count=Object.keys(s.chars).length;
    FB.save.restore(envelope);
    return {form:FB.governments.forRealm(FB.state,rid).id,opening:source === JSON.stringify(FB.state.bookmarkSetup),
      count:count === Object.keys(FB.state.chars).length,absent:!FB.aristocracy.state(FB.state,rid),
      office:!FB.state.authority.appointments.some(function (r) { return appointmentIds.includes(r.id); }),
      rng:(envelope.rng>>>0) === (FB.getRngState()>>>0),uid:envelope.uid === FB.getUidCounter()};
  });
  expect(result).toEqual({form:'regnum',opening:true,count:true,absent:true,office:true,rng:true,uid:true});
});

test('the accepted ruler candidate adopts one royal tree and a household heir never obtains an unrecognized crown', async function ({page},testInfo) {
  await start(page,testInfo,{ruler:true});
  const result = await page.evaluate(function () {
    const s=FB.state,a=ARISTO,A=FB.aristocracy,old=s.chars[s.player.charId];
    const tree=s.realms.player.succession,original=Object.keys(tree.members).length;
    const heir=FB.makeCharacter(s,{id:'aristocratic_private_heir',name:'Private heir',sex:'m',culture:old.culture,religion:old.religion,born:s.date.year-18,station:1});
    heir.fatherId=old.id;heir.dyn=old.dyn;s.chars[heir.id]=heir;old.childrenIds=(old.childrenIds || []).concat([heir.id]);
    s.player.namedHeirId=heir.id; const property=JSON.stringify(FB.holdingList(s));old.dead=true;
    const applied=FB.game.succeedTo(heir.id);
    const rid=Object.keys(s.authority.governments).find(function (id) { return s.authority.governments[id].publicVacancy; });
    if (!rid) throw new Error('Vacant court was not separated from household');
    const source=JSON.parse(FB.save.serialize());FB.save.restore(source);
    return {applied:applied,person:FB.state.player.charId === heir.id,private:property === JSON.stringify(FB.holdingList(FB.state)),
      noCrown:!FB.state.realms.player || !FB.state.realms.player.alive,
      canonical:Object.keys(FB.state.realms[rid].succession.members).length >= original,
      origin:A.state(FB.state,rid).originRealmId === 'sasanian_476',
      valid:A.validateState(FB.state) === null,rng:(source.rng>>>0) === (FB.getRngState()>>>0),uid:source.uid === FB.getUidCounter()};
  });
  expect(result).toEqual({applied:true,person:true,private:true,noCrown:true,canonical:true,origin:true,valid:true,rng:true,uid:true});
});

test('a recognized royal household heir continues one player crown and the same provincial grants', async function ({page},testInfo) {
  await start(page,testInfo,{ruler:true});
  const result=await page.evaluate(function () {
    const s=FB.state,a=ARISTO,old=s.chars[s.player.charId];
    const heir=FB.makeCharacter(s,{id:'recognized_royal_heir',name:'Recognized heir',sex:'m',culture:old.culture,
      religion:old.religion,born:s.date.year-18,station:1});
    heir.dyn=old.dyn;heir.fatherId=old.id;s.chars[heir.id]=heir;old.childrenIds=(old.childrenIds || []).concat([heir.id]);
    FB.registerRoyalBirth(s,heir,old,null);s.player.namedHeirId=heir.id;a.back(heir.id);
    const generation=FB.realmRulerGeneration(s,'player'),grants=JSON.stringify(a.data().interests);
    const applied=FB.game.succeedTo(heir.id,{livingAbdication:true});
    const envelope=JSON.parse(FB.save.serialize());FB.save.restore(envelope);
    const tree=FB.state.realms.player.succession;
    return {applied:applied,person:FB.state.player.charId === heir.id,once:FB.realmRulerGeneration(FB.state,'player') === generation+1,
      single:tree.members[tree.rulerMemberId].charId === heir.id,grants:grants === JSON.stringify(FB.aristocracy.state(FB.state,'player').interests),
      valid:FB.aristocracy.validateState(FB.state),origin:FB.aristocracy.state(FB.state,'player').originRealmId};
  });
  expect(result).toEqual({applied:true,person:true,once:true,single:true,grants:true,valid:null,origin:'sasanian_476'});
});

test('minority stewardship can recover through a reviewed living principal and ends at adulthood', async function ({page},testInfo) {
  await start(page,testInfo,{fictional:true});
  const result=await page.evaluate(function () {
    const s=FB.state,a=ARISTO,A=FB.aristocracy;
    const minor=FB.governmentRecognition.candidates(s,a.rid).find(function (c) { return c.minor; });a.back(minor.id);
    FB.publicAccede(s,FB.publicAccessionQuote(s,a.actor,a.rid,'abdication'));
    const regency=a.data().regency;s.chars[regency.stewardId].dead=true;
    const q=A.stewardQuote(s,a.actor,a.rid),before=JSON.stringify(s);
    const pure=q.allowed && before === JSON.stringify(s),replaced=A.steward(s,q),once=!A.steward(s,q);
    const governing=FB.political.consent(s,a.actor,'war',{}).allowed;
    const ruler=FB.realmRulerCharacterSnapshot(s,a.rid);ruler.born=s.date.year-18;
    s.realms[a.rid].succession.members[s.realms[a.rid].succession.rulerMemberId].born=ruler.born;
    A.ai(s,a.rid);
    return {pure:pure,replaced:replaced,once:once,governing:governing,adult:a.data().regency === null};
  });
  expect(result).toEqual({pure:true,replaced:true,once:true,governing:true,adult:true});
});

test('profile mods validate detached policy and fresh openings without historical engine selectors', async function ({page},testInfo) {
  await openGame(page,testInfo);
  const result=await page.evaluate(function () {
    const copy=JSON.parse(JSON.stringify(FBDATA.aristocraticProfiles.chartered_court));
    copy.name='Another fictional court';
    const good=FB.mods.validate({aristocraticProfiles:{another_court:copy}});
    const saved=JSON.stringify(FBDATA.aristocraticProfiles),rng=FB.getRngState(),uid=FB.getUidCounter();
    copy.interests[1].provinceId=copy.interests[0].provinceId;
    const bad=FB.mods.validate({aristocraticProfiles:{another_court:copy}});
    const opening=JSON.parse(JSON.stringify(FB.bookmark('476')));
    delete opening.opening.actors.mihran_elder;
    return {good:good,bad:bad.length > 0,opening:FB.validateBookmark(opening).length > 0,
      detached:saved === JSON.stringify(FBDATA.aristocraticProfiles) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result).toEqual({good:[],bad:true,opening:true,detached:true});
});

test('a living steward who loses provincial jurisdiction must yield to a reviewed capable principal', async function ({page},testInfo) {
  await start(page,testInfo,{fictional:true});
  const result=await page.evaluate(function () {
    const s=FB.state,a=ARISTO,A=FB.aristocracy,R=FB.governmentRecognition;
    const minor=R.candidates(s,a.rid).find(function (c) { return c.minor; });a.back(minor.id);
    FB.publicAccede(s,FB.publicAccessionQuote(s,a.actor,a.rid,'abdication'));
    const old=a.data().regency.stewardId,m=a.voices().find(function (v) { return v.principal.id === old; });
    s.authority.rights.find(function (r) { return r.id === m.rightIds[0]; }).status='contested';
    const denied=!FB.political.consent(s,a.actor,'war',{}).allowed;
    const quote=A.stewardQuote(s,a.actor,a.rid),pure=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const unchanged=pure === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    return {alive:!s.chars[old].dead,denied:denied,unchanged:unchanged,review:quote.allowed,
      changed:quote.stewardId !== old && A.steward(s,quote),governing:FB.political.consent(s,a.actor,'war',{}).allowed};
  });
  expect(result).toEqual({alive:true,denied:true,unchanged:true,review:true,changed:true,governing:true});
});

for (const crazygames of [false,true]) {
  test('mobile provincial review preserves terms, disclosure, position and keyboard return with distribution flag ' + crazygames, async function ({page},testInfo) {
    await page.setViewportSize({width:390,height:844});
    await start(page,testInfo,{ruler:true,crazygames:crazygames});
    await page.evaluate(function () { FB.ui.showAdministration({court:'player'}); });
    await page.locator('#public-revenue').selectOption('0.65'); await page.locator('#public-levy').selectOption('0.6');
    const review=page.locator('[data-public-review="province-mihran-negotiate"]');
    await expect(review).toBeEnabled();
    await page.locator('[aria-controls="public-details-province-mihran-negotiate"]').click();
    const before=await page.evaluate(function () { return {state:JSON.stringify(FB.state),rng:FB.getRngState(),uid:FB.getUidCounter()}; });
    await review.focus();await page.keyboard.press('Enter');await expect(page.locator('#gm-title')).toContainText('Review public decision');
    await expect(page.locator('#gm-body')).toContainText('65%');await page.keyboard.press('Escape');
    await expect(page.locator('#public-revenue')).toHaveValue('0.65');await expect(page.locator('#public-levy')).toHaveValue('0.6');
    await expect(page.locator('[aria-controls="public-details-province-mihran-negotiate"]')).toHaveAttribute('aria-expanded','true');
    await expect(review).toBeFocused();
    const unchanged=await page.evaluate(function (before) { return before.state === JSON.stringify(FB.state) && before.rng === FB.getRngState() && before.uid === FB.getUidCounter(); },before);
    expect(unchanged).toBe(true);
  });
}

test('a ruler can review a return from dynastic government without bypassing provincial assent', async function ({page},testInfo) {
  await start(page,testInfo,{ruler:true});
  const converted=await page.evaluate(function () {
    const s=FB.state,A=FB.aristocracy;
    const protectedForm=!FB.authoritySetGovernment(s,'player','regnum');
    const applied=A.convert(s,A.conversionQuote(s,{kind:'realm',id:'player'},'player','regnum'));
    FB.ui.showProvincialContinuity();return protectedForm && applied;
  });
  expect(converted).toBe(true);
  const review=page.locator('#provincial-return');await expect(review).toBeEnabled();
  await page.locator('[aria-controls="provincial-return-details"]').click();
  await review.focus();await page.keyboard.press('Enter');await page.keyboard.press('Escape');
  await expect(review).toBeFocused();
  await expect(page.locator('[aria-controls="provincial-return-details"]')).toHaveAttribute('aria-expanded','true');
  await review.click();await page.locator('#provincial-return-confirm').click();
  await expect(page.locator('#gm-title')).toHaveText('Public administration');
  expect(await page.evaluate(function () { return FB.governments.forRealm(FB.state,'player').id; })).toBe('aristocratic_monarchy');
});

test('a real seasonal continuation replays exactly and keeps recognition and hereditary ledgers bounded', async function ({page},testInfo) {
  test.setTimeout(180000);await start(page,testInfo);
  const source=await page.evaluate(function () { return JSON.parse(FB.save.serialize()); });
  await advanceTo(page,'season',100);
  const first=await page.evaluate(function () { const d=JSON.parse(FB.save.serialize());return {state:d.state,rng:d.rng>>>0,uid:d.uid}; });
  await page.evaluate(function (d) { FB.save.restore(d); },source);
  await advanceTo(page,'season',100);
  const second=await page.evaluate(function () { const d=JSON.parse(FB.save.serialize());return {state:d.state,rng:d.rng>>>0,uid:d.uid}; });
  expect(second).toEqual(first);
  await injectBrowserHarness(page);await advanceBookmark(page,720);
  const bounded=await page.evaluate(function () {
    const s=FB.state,d=FB.aristocracy.state(s,'sasanian_476'),row=s.authority.governments.sasanian_476;
    return {interests:d.interests.length,recognition:Object.keys(row.recognition || {}).length,
      provincial:s.authority.appointments.filter(function (r) { return r.provincialTerms; }).length,
      valid:FB.aristocracy.validateState(s),mode:FB.governments.forRealm(s,'sasanian_476').id};
  });
  expect(bounded).toMatchObject({interests:2,provincial:2,valid:null,mode:'aristocratic_monarchy'});
  expect(bounded.recognition).toBeLessThanOrEqual(3);
});

test('surviving local rights can be probated under dynastic government before a reviewed return', async function ({page},testInfo) {
  await start(page,testInfo,{ruler:true});
  const evidence=await page.evaluate(function () {
    const s=FB.state,a=ARISTO,A=FB.aristocracy,m=a.voices()[0];
    A.convert(s,A.conversionQuote(s,a.actor,a.rid,'regnum'));s.chars[m.principal.id].dead=true;
    const q=A.inheritanceQuote(s,a.actor,a.rid,m.id);
    const estate=JSON.stringify(s.bookmarkSetup.estates),records=JSON.stringify(a.data().interests);
    FB.ui.showProvincialContinuity();return {heir:q.heirId,estate:estate,records:records};
  });
  await expect(page.locator('#provincial-return')).toBeDisabled();
  await page.locator('#provincial-probate-mihran').click();
  await expect(page.locator('#provincial-return-confirm')).toHaveText('Confirm inherited rights');
  await page.locator('#provincial-return-confirm').click();
  await expect(page.locator('#provincial-return')).toBeEnabled();
  const probate=await page.evaluate(function (e) {
    const s=FB.state,A=FB.aristocracy,d=A.state(s,'player'),m=d.interests[0];
    return {same:e.records === JSON.stringify(d.interests),estate:e.estate === JSON.stringify(s.bookmarkSetup.estates),
      heir:s.authority.appointments.find(function (r) { return r.id === m.appointmentId; }).holder.id === e.heir,
      form:FB.governments.forRealm(s,'player').id};
  },evidence);
  expect(probate).toEqual({same:true,estate:true,heir:true,form:'regnum'});
  await page.locator('#provincial-return').click();await page.locator('#provincial-return-confirm').click();
  expect(await page.evaluate(function () { return FB.aristocracy.validateState(FB.state); })).toBeNull();
});

test('an AI dynastic court continues existing hereditary rights without reseeding or spending player funds', async function ({page},testInfo) {
  await start(page,testInfo);
  const result=await page.evaluate(function () {
    const s=FB.state,a=ARISTO,A=FB.aristocracy,m=a.voices()[0];
    A.convert(s,A.conversionQuote(s,a.actor,a.rid,'regnum'));s.chars[m.principal.id].dead=true;
    const q=A.inheritanceQuote(s,a.actor,a.rid,m.id),records=JSON.stringify(a.data().interests);
    const uid=FB.getUidCounter(),cash=s.player.gold;s.turn+=90;FB.publicOfficeSettle(s,null,1,false);
    const row=s.authority.appointments.find(function (r) { return r.id === m.appointmentId; });
    return {heir:row.holder.id === q.heirId,records:records === JSON.stringify(a.data().interests),
      uid:uid === FB.getUidCounter(),cash:cash === s.player.gold,valid:A.validateState(s)};
  });
  expect(result).toEqual({heir:true,records:true,uid:true,cash:true,valid:null});
});

test('a twenty-year frontier campaign retains one royal court, bounded family facts and a restorable continuation', async function ({page},testInfo) {
  test.setTimeout(600000);await start(page,testInfo);await injectBrowserHarness(page);
  const opening=await page.evaluate(function () {
    const s=FB.state,r=s.realms.sasanian_476;
    return {founder:r.succession.founderId,generation:FB.realmRulerGeneration(s,'sasanian_476'),
      interests:FB.aristocracy.state(s,'sasanian_476').interests.map(function (m) { return m.id; })};
  });
  await advanceBookmark(page,7200);
  const envelope=await page.evaluate(function () { return JSON.parse(FB.save.serialize()); });
  const before=await page.evaluate(function () {
    const s=FB.state,d=FB.aristocracy.state(s,'sasanian_476'),r=s.realms.sasanian_476;
    return {founder:r.succession.founderId,interests:d.interests.map(function (m) { return m.id; }),
      principalRecords:d.interests.length,grants:s.authority.appointments.filter(function (row) { return row.provincialTerms; }).length,
      recognition:Object.keys(s.authority.governments.sasanian_476.recognition || {}).length,valid:FB.aristocracy.validateState(s),
      generation:FB.realmRulerGeneration(s,'sasanian_476'),vacancy:s.authority.governments.sasanian_476.publicVacancy || null,
      principals:FB.aristocracy.constituency(s,'sasanian_476').map(function (m) { return {id:m.id,principal:m.principal,active:m.active}; }),
      frontier:{romanAlive:s.realms.byzantium.alive,persianAlive:r.alive,royalMember:r.succession.rulerMemberId,year:s.date.year}};
  });
  expect(before).toMatchObject({founder:opening.founder,interests:opening.interests,principalRecords:2,grants:2,valid:null});
  expect(before.recognition).toBeLessThanOrEqual(3);
  expect(before.generation).toBeGreaterThanOrEqual(opening.generation);
  await testInfo.attach('aristocratic-frontier-twenty-years',{body:Buffer.from(JSON.stringify({opening:opening,after:before},null,2)),contentType:'application/json'});
  await advanceBookmark(page,90);
  const first=await page.evaluate(function () { const d=JSON.parse(FB.save.serialize());return {state:d.state,rng:d.rng>>>0,uid:d.uid}; });
  await page.evaluate(function (d) { FB.save.restore(d); },envelope);
  await advanceBookmark(page,90);
  const replay=await page.evaluate(function () { const d=JSON.parse(FB.save.serialize());return {state:d.state,rng:d.rng>>>0,uid:d.uid}; });
  expect(replay).toEqual(first);
});
