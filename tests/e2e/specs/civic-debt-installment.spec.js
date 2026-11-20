'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const { openGame, prepareGameContent } = require('../support/game/navigation');
const { startHistoricalGame } = require('../support/game/historical-start');
const { startPreparedParityGame } = require('../support/game/parity');
const harbor = require('../fixtures/authoring/civic-debt-installment-harbor.json');

test.describe.configure({ mode:'parallel' });
dependsOnRuntime(__filename,[
  'data/civic_profiles.js','data/bookmark_1204.js','data/events_civic_assembly.js','data/actions.js',
  'js/government_civic.js','js/civic_transactions.js','js/civic_validation.js','js/government_support.js',
  'js/civic_strategies.js','js/treasury.js','js/actions.js','js/events.js','js/mods.js','js/save.js',
  'js/save_v4.js','js/ui_civic.js','js/ui_misc.js','css/style.css'
]);

const journey = { bookmark:'1204',unhide:true,code:'DEBTPLEDGE-1204-farmer-venezia-m-Leo' };

async function openPledge(page, elect, second = false) {
  return page.evaluate(function (input) {
    const s = FB.state, V = FB.civicGovernment, rid = 'venice_1204', lender = 'latin_1204';
    const city = s.realms[rid].treasury, creditor = s.realms[lender].treasury;
    const electorate = FB.governments.support.row(s,rid);
    electorate.scopes.forEach(function (pid) { FB.setCountySupport(s,pid,0); });
    s.player.provinceId = electorate.scopes[0]; s.player.liege = rid;
    city.gold = 19; city.militaryAccrued = 4; creditor.gold = 100; creditor.militaryAccrued = 0;
    const r = V.row(s,rid), pledge = { lenderRealmId:lender,amount:20,interest:0.1,duration:360 };
    if (!V.proposalApply(s,V.proposalQuote(s,rid,'pledge',pledge))) throw new Error('Opening pledge refused');
    if (input.second) {
      const second = Object.assign({},pledge,{ amount:8,duration:720 });
      if (!V.proposalApply(s,V.proposalQuote(s,rid,'pledge',second))) throw new Error('Second pledge refused');
      city.gold = 39; creditor.gold = 80;
    }
    if (input.elect) {
      const c = s.chars[s.player.charId], o = r.offices[0];
      s.player.tier = 1; c.born = s.date.year - 30; delete c.unfree;
      c.homeProvinceId = s.player.provinceId;
      FB.SKILLS.forEach(function (k) { c.skills[k] = 10; });
      const quote = function (operation,terms) { return V.officeQuote(s,rid,o.id,operation,terms); };
      if (!V.officeApply(s,quote('resign',{ characterId:o.incumbentId })) ||
          !V.officeApply(s,quote('nominate',{ candidateId:c.id })) || !V.officeApply(s,quote('recognize',{})))
        throw new Error('Canonical election refused');
    }
    return r.debts[0].id;
  },{ elect,second });
}

test('an institutional installment survives restore and the existing event pays only the remaining debt',async function ({ page },info) {
  await startHistoricalGame(page,info,journey);
  const id = await openPledge(page,false,true);
  const result = await page.evaluate(function (id) {
    let s = FB.state;
    const V = FB.civicGovernment, rid = 'venice_1204', lender = 'latin_1204';
    const row = function () { return V.row(s,rid); };
    const debt = function () { return row().debts[0]; };
    const quote = function (amount) { return V.proposalQuote(s,rid,'repay',amount === undefined ? { debtId:id } : { debtId:id,amount:amount }); };
    const snapshot = function () { return JSON.stringify([row(),s.realms[rid].treasury,s.realms[lender].treasury,s.player.gold,FB.getRngState(),FB.getUidCounter()]); };
    const balances = function () { return [s.realms[rid].treasury.gold,s.realms[lender].treasury.gold,s.player.gold]; };
    const original = JSON.parse(JSON.stringify(debt())), untouched = JSON.stringify(row().debts[1]);
    const household = s.player.gold, savedBefore = JSON.parse(FB.save.serialize());
    FB.save.restore(savedBefore); s = FB.state;
    const legacy = JSON.stringify(original) === JSON.stringify(debt());
    const before = snapshot(), reviewed = quote(15), full = quote(), invalid = [0,-1,0.001,22,Infinity,'5',undefined].map(function (amount) {
      const denied = V.proposalQuote(s,rid,'repay',{ debtId:id,amount:amount });
      return denied.reason === 'installment_amount' && !V.proposalApply(s,denied);
    });
    const pure = before === snapshot() && JSON.stringify(reviewed) === JSON.stringify(quote(15));
    const city = s.realms[rid].treasury;
    city.gold--;
    const poor = snapshot(), refusedFunds = !V.proposalApply(s,reviewed) && quote(15).reason === 'reserve' && poor === snapshot();
    city.gold++;
    const county = FB.governments.support.row(s,rid).scopes[0], owner = s.owner[county];
    s.owner[county] = lender;
    const occupied = snapshot(), refusedControl = !V.proposalApply(s,reviewed) && quote(15).reason === 'occupied' && occupied === snapshot();
    s.owner[county] = owner;
    const office = row().offices[0], incumbent = s.chars[office.incumbentId];
    incumbent.exiled = true;
    const withoutOffice = snapshot(), refusedAssent = !V.proposalApply(s,reviewed) && quote(15).reason === 'no_mandate' && withoutOffice === snapshot();
    delete incumbent.exiled;
    const aiOwner = V.chief(s,rid).id !== s.player.charId;
    const applied = V.proposalApply(s,reviewed), afterPart = balances(), terms = JSON.stringify(debt()) ===
      JSON.stringify(Object.assign({},original,{ remaining:7 }));
    const afterPayment = snapshot(), replay = !V.proposalApply(s,reviewed) && afterPayment === snapshot();
    const save = JSON.parse(FB.save.serialize());
    const malformed = [{remaining:0},{remaining:23},{remaining:-1},{status:'paid'}].map(function (patch) {
      const bad = JSON.parse(JSON.stringify(save)), live = FB.state;
      Object.assign(bad.state.authority.governments[rid].civic.debts[0],patch);
      try { FB.save.restore(bad); } catch (error) { return FB.state === live && snapshot() === afterPayment; }
      return false;
    });
    FB.save.restore(save); s = FB.state;
    const restored = snapshot() === afterPayment;
    const c = s.chars[s.player.charId], o = row().offices[0];
    s.player.tier = 1; c.born = s.date.year - 30; delete c.unfree;
    c.homeProvinceId = s.player.provinceId;
    FB.SKILLS.forEach(function (k) { c.skills[k] = 10; });
    const officeQuote = function (operation,terms) { return V.officeQuote(s,rid,o.id,operation,terms); };
    if (!V.officeApply(s,officeQuote('resign',{characterId:o.incumbentId})) ||
        !V.officeApply(s,officeQuote('nominate',{candidateId:c.id})) || !V.officeApply(s,officeQuote('recognize',{})))
      throw new Error('Election for the repayment event refused');
    s.turn = debt().dueTurn;
    s.realms[rid].treasury.gold += 7;
    const event = FB.eventById('civic_public_repayment'), option = event.options[0];
    const ctx = FB.eventContextFor(s,event,{}), eventReview = FB.eventReviews.quote(s,option,ctx);
    const atDue = snapshot(), noAcknowledgment = !FB.resolveEventOption(s,event,option,ctx,{}) && atDue === snapshot();
    const eventApplied = !!FB.resolveEventOption(s,event,option,ctx,{reviewed:eventReview});
    return { aiOwner,legacy,pure,refusedFunds,refusedControl,refusedAssent,applied,terms,replay,malformed,restored,
      invalid,oldRequest:[full.charge,full.allowed,full.reason],offer:[reviewed.paymentAvailable,reviewed.charge,reviewed.remainingAfter],
      afterPart,afterFinal:balances(),household,nonTarget:JSON.stringify(row().debts[1]) === untouched,
      noAcknowledgment,eventApplied,eventCharge:eventReview.quote.charge,closed:debt().status === 'paid' && debt().remaining === 0,
      technology:FBDATA.techImpactReviews.features.civic_public_debt.mode,validGovernment:FB.governments.validate().length === 0 };
  },id);
  expect(result).toEqual({ aiOwner:true,legacy:true,pure:true,refusedFunds:true,refusedControl:true,refusedAssent:true,applied:true,terms:true,
    replay:true,malformed:Array(4).fill(true),restored:true,invalid:Array(7).fill(true),oldRequest:[22,false,'reserve'],offer:[15,15,7],
    afterPart:[24,95,result.household],afterFinal:[24,102,result.household],household:result.household,nonTarget:true,
    noAcknowledgment:true,eventApplied:true,eventCharge:7,closed:true,technology:'none',validGovernment:true });
});

test('the civic deed reviews, defers and confirms with current public authority on a phone',async function ({ page },info) {
  await page.setViewportSize({ width:390,height:720 });
  await startHistoricalGame(page,info,journey,true);
  await openPledge(page,true);
  const read = function () { return page.evaluate(function () {
    const s = FB.state, d = FB.civicGovernment.row(s,'venice_1204').debts[0];
    return [d.remaining,d.status,s.realms.venice_1204.treasury.gold,s.realms.latin_1204.treasury.gold,s.player.gold,s.turn];
  }); };
  const initial = await read();
  await page.evaluate(function () { FB.runInstant(FB.state,'civic_government'); });
  const installment = page.getByRole('button',{ name:/^Review installment/ });
  const full = page.getByRole('button',{ name:/^Review full repayment/ });
  const confirm = page.locator('#civic-confirm');
  const partner = page.locator('#civic-partner');
  const body = page.locator('#gm-body');
  await partner.selectOption('hungary_1204');
  await expect(full).toBeDisabled();
  const disclose = installment.locator('xpath=../..').getByRole('button',{ name:'Details' });
  await disclose.evaluate(function (button) { button.click(); });
  await installment.scrollIntoViewIfNeeded(); await installment.focus();
  const scroll = await page.evaluate(function () {
    return [document.getElementById('gm-body').scrollTop,document.querySelector('[data-civic-list]').scrollTop];
  });
  await installment.press('Enter');
  const display = await page.evaluate(function () {
    const s = FB.state;
    return { lender:s.realms.latin_1204.name,amounts:[15,11,11].map(function (n) { return FB.money(n,{state:s,exact:true}); }) };
  });
  await expect(body).toContainText(display.lender);
  for (const [index,label] of ['Available above the public reserve','Payment now','Remaining liability'].entries()) {
    await expect(body.locator('.kv').filter({ hasText:label })).toContainText(display.amounts[index]);
  }
  await page.keyboard.press('Escape');
  await expect(installment).toBeFocused(); await expect(partner).toHaveValue('hungary_1204');
  await expect(disclose).toHaveAttribute('aria-expanded','true');
  expect(await page.evaluate(function () {
    return [document.getElementById('gm-body').scrollTop,document.querySelector('[data-civic-list]').scrollTop];
  })).toEqual(scroll);
  expect(await read()).toEqual(initial);
  await installment.click();
  await expect(confirm).toBeVisible();
  // The executive and quote still stand when the protagonist loses access to this local deed.
  const publicDecision = await page.evaluate(function () {
    const s = FB.state, V = FB.civicGovernment;
    s.player.liege = 'hungary_1204';
    return V.decision(s,'venice_1204','repay').allowed;
  });
  expect(publicDecision).toBe(true);
  await confirm.click(); await expect(page.locator('#gm-title')).toHaveText('Terms changed');
  expect(await read()).toEqual(initial);
  await page.evaluate(function () { FB.state.player.liege = 'venice_1204'; });
  await page.locator('#civic-continue').click();
  await expect(installment).toBeFocused();
  await installment.click(); await confirm.click(); await page.locator('#civic-continue').click();
  expect(await read()).toEqual([11,'active',28,91,initial[4],initial[5]]);
  await expect(full).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.evaluate(function () {
    FB.state.realms.venice_1204.treasury.gold += 7;
    FB.runInstant(FB.state,'civic_government');
  });
  await full.click(); await confirm.click(); await page.locator('#civic-continue').click();
  expect(await read()).toEqual([0,'paid',24,102,initial[4],initial[5]]);
  await expect(page.locator('#civic-debts')).toBeFocused();
  const minimum = await page.evaluate(function () {
    const s = FB.state, V = FB.civicGovernment;
    const q = V.proposalQuote(s,'venice_1204','pledge',{ lenderRealmId:'latin_1204',amount:0.005,interest:0,duration:90 });
    if (!V.proposalApply(s,q)) throw new Error('Small pledge refused');
    FB.runInstant(s,'civic_government');
    return FB.money(V.minimumInstallment,{state:s,exact:true});
  });
  await expect(installment).toBeDisabled();
  await expect(installment).toContainText(minimum);
  await expect(full).toBeEnabled();
});

test('ordinary JSON constituency reserves limit installments and the matching save restores',async function ({ page },info) {
  await openGame(page,info);
  await prepareGameContent(page);
  const signature = await page.evaluate(function () { return FB.mods.sig(); });
  const checked = await page.evaluate(function (mod) {
    const before = JSON.stringify(FBDATA.constituencyProfiles.venetian_councils), sig = FB.mods.sig();
    const good = FB.mods.validate(mod);
    mod.constituencyProfiles.venetian_councils.obligations.reserve = -1;
    const bad = FB.mods.validate(mod);
    return { good, bad:bad.length > 0, pure:before === JSON.stringify(FBDATA.constituencyProfiles.venetian_councils) && sig === FB.mods.sig() };
  },harbor);
  expect(checked).toEqual({ good:[],bad:true,pure:true });
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/civic-debt-installment-harbor.json'));
  await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await startPreparedParityGame(page,journey);
  const id = await openPledge(page,true);
  const evidence = await page.evaluate(function (id) {
    let s = FB.state;
    const V = FB.civicGovernment, rid = 'venice_1204', lender = 'latin_1204';
    const quote = function (amount) { return V.proposalQuote(s,rid,'repay',{ debtId:id,amount:amount }); };
    const full = V.proposalQuote(s,rid,'repay',{ debtId:id }), denied = quote(7), good = quote(6);
    const declined = !V.proposalApply(s,denied), applied = V.proposalApply(s,good);
    const save = JSON.parse(FB.save.serialize());
    FB.save.restore(save); s = FB.state;
    const debt = V.row(s,rid).debts[0];
    return { caps:[full.paymentAvailable,full.reason,denied.reason,good.charge],declined,applied,
      signature:FB.mods.sig(),storedSignature:save.mods,paid:[s.realms[rid].treasury.gold,s.realms[lender].treasury.gold,debt.remaining,debt.status] };
  },id);
  expect(evidence).toMatchObject({ caps:[6,'reserve','reserve',6],declined:true,applied:true,paid:[33,86,16,'active'] });
  expect(evidence.signature).not.toBe(signature);
  expect(evidence.signature).toBe(evidence.storedSignature);
});
