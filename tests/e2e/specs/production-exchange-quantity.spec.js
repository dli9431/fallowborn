'use strict';

const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

test.describe.configure({mode:'parallel'});
dependsOnRuntime(__filename,[
  'data/production_early_industry.js','data/technology.js','js/production.js','js/production_economy.js',
  'js/ui_misc.js','js/ui_modals.js','css/style.css','js/market.js','js/treasury.js','js/mods.js','js/main.js',
  'js/maritime_work.js','js/save.js','js/save_v4.js'
]);

async function begin(page,info,fixture,seed,revision) {
  await openGame(page,info);
  await page.evaluate(function(){FB.ui.showMods();});
  const file = path.resolve(__dirname,'../fixtures/authoring',fixture+'.json');
  if (revision) {
    const mod = JSON.parse(JSON.stringify(require(file)));
    mod.bookmarks.maritime_river.revision=revision;
    await page.locator('#modfile').setInputFiles({name:fixture+'.json',mimeType:'application/json',
      buffer:Buffer.from(JSON.stringify(mod))});
  } else await page.locator('#modfile').setInputFiles(file);
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  const title=page.locator('#btn-choose-beginning');
  if (await title.isVisible()) await title.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(seed);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function(){
    FB.game.setPaused(true);
    FB.game.auto.all=true;
    FB.game.auto.style='first';
    FB.game.uiPrefs.hideTips=true;
    FB.game.uiPrefs.hideBeginnerHints=true;
  });
}

async function productionSheet(page,countyId) {
  await page.evaluate(function(pid){FB.ui.closeModal();FB.ui.showSettlement(pid,0);},countyId);
  await page.locator('#settlement-production').click();
}

function fact(card,label) {
  return card.locator('.kv').filter({hasText:new RegExp('^'+label)}).locator('b');
}

test('native owned delivery compares quantities and keeps the production view on return',async function({page},info){
  await page.setViewportSize({width:390,height:844});
  await begin(page,info,'early-industry-paper',
    'FINITEINDUSTRY-early_industry_paper-early_industry_paper_ruler-baghdad-m-Ivo_Reed-standard');
  await productionSheet(page,'baghdad');
  const disposition=page.locator('#production-disposition-workshop_papermaking');
  await disposition.selectOption('use');
  const action=page.locator('#production-exchange-fiber_delivery'),body=page.locator('#gm-body');
  await action.scrollIntoViewIfNeeded();
  const scroll=await body.evaluate(function(el){return el.scrollTop;});
  await action.click();
  const quantity=page.getByRole('spinbutton',{name:'Quantity to exchange'});
  const confirm=page.getByRole('button',{name:'Confirm exchange',exact:true});
  await expect(quantity).toHaveValue('1');
  await expect(quantity).toHaveAttribute('max','6');
  const one=page.locator('#production-exchange-one'),chosen=page.locator('#production-exchange-chosen');
  const keep=page.locator('#production-exchange-keep');
  await expect(fact(one,'Supplier stock remaining')).toHaveText('5 (fiber_units)');
  await expect(fact(keep,'Supplier stock remaining')).toHaveText('6 (fiber_units)');
  await quantity.fill('7');
  await expect(confirm).toBeDisabled();
  await expect(page.getByRole('status').filter({hasText:'unreserved lots'})).toBeVisible();
  await quantity.fill('1.5');
  await expect(confirm).toBeDisabled();
  await quantity.fill('');
  await expect(confirm).toBeDisabled();
  await quantity.fill('3');
  await expect(fact(chosen,'Supplier stock remaining')).toHaveText('3 (fiber_units)');
  await expect(fact(chosen,'Destination stock after exchange')).toHaveText('3 (fiber_units)');
  await expect(fact(body,'Payment recipient')).toHaveText('None');
  await page.getByRole('button',{name:'Keep stock',exact:true}).click();
  await expect(action).toBeFocused();
  await expect(disposition).toHaveValue('use');
  expect(await body.evaluate(function(el){return el.scrollTop;})).toBe(scroll);
  expect(await page.evaluate(function(){return FB.state.production.economy.receipts.length;})).toBe(0);

  await action.click();
  await expect(quantity).toHaveValue('3');
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await expect(action).toBeFocused();
  await action.click();
  await page.keyboard.press('Escape');
  await expect(action).toBeFocused();
  await action.click();
  await expect(quantity).toHaveValue('3');
  const balances=await page.evaluate(function(){
    const q=FB.productionEconomy.aiQuote(FB.state,'fiber_delivery',3,'transfer');
    return {cash:FB.production.account(FB.state,q.buyer).funds.available,private:FB.state.player.gold};
  });
  await confirm.click();
  await expect(action).toBeFocused();
  expect(await body.evaluate(function(el){return el.scrollWidth>el.clientWidth+1;})).toBe(false);
  const exchange=await page.evaluate(function(){
    const s=FB.state;
    FB.production.validate(s);
    const rows=s.production.economy.receipts;
    const receipt=rows[0],lot=s.production.lots.find(function(l){return l.id===receipt.lotId;});
    const source=s.production.lots.find(function(l){return l.id===receipt.inputs[0].lotId;});
    return {count:rows.length,quantity:receipt.quantity,inputs:receipt.inputs.map(function(x){return x.quantity;}),
      remainder:source.remaining,delivered:lot.remaining,origin:lot.origin.receiptId===receipt.id,paid:receipt.paid,
      cash:FB.production.account(s,receipt.buyer).funds.available,private:s.player.gold,enterprises:s.player.enterprises.length};
  });
  expect(exchange).toEqual({count:1,quantity:3,inputs:[3],remainder:3,delivered:3,origin:true,paid:0,
    cash:balances.cash,private:balances.private,enterprises:0});
});

test('ordinary JSON sale is bounded by real reserves and rejects a competing reservation before a fresh sale',async function({page},info){
  await begin(page,info,'production-suppliers-harbor',
    'EXCHANGE-production_suppliers_harbor-production_suppliers_harbor_ruler-resource_quay-m-Ivo_Reed-standard');
  const prices=await page.evaluate(function(){
    const s=FB.state,P=FB.production,E=FB.productionEconomy,treasury=s.realms.supplier_bank_court.treasury;
    const row=s.market.counties.resource_quay[1],index=s.market.goods.indexOf('provisions');
    treasury.gold=10000;
    row[index]=3;
    const budget=E.aiQuote(s,'fish_market',4,'sell');
    row[index]=1.24;
    const four=E.aiQuote(s,'fish_market',4,'sell'),two=E.aiQuote(s,'fish_market',2,'sell');
    const funds=P.account(s,two.buyer).funds;
    treasury.gold=funds.reserve+two.cost+treasury.militaryAccrued+0.25;
    const ready=E.aiQuote(s,'fish_market',2,'sell'),tooMuch=E.aiQuote(s,'fish_market',3,'sell');
    function name(who) {
      return (who.kind==='realm'?s.realms[who.id].name+' (public treasury)':s.chars[who.id].name+' (private account)');
    }
    return {one:FB.money(ready.oneCost),chosen:FB.money(ready.cost),oneCost:ready.oneCost,paid:ready.cost,
      rounded:Math.ceil(2*FBDATA.productionExchangeProfiles.sell_fish.basePrice*ready.unitPrice),
      budget:[budget.reason,budget.maxQuantity],demand:four.maxQuantity,bound:ready.maxQuantity,
      funds:[tooMuch.reason,tooMuch.allowed],payer:name(ready.payer),recipient:name(ready.recipient)};
  });
  expect(prices).toMatchObject({budget:['budget',3],demand:4,bound:2,funds:['funds',false]});
  expect(prices.paid).toBe(prices.rounded);
  expect(prices.paid).toBeLessThan(2*prices.oneCost);
  await productionSheet(page,'resource_quay');
  const action=page.locator('#production-exchange-fish_market');
  await action.click();
  const input=page.getByRole('spinbutton',{name:'Quantity to exchange'});
  await expect(input).toHaveAttribute('max','2');
  await input.fill('2');
  await expect(fact(page.locator('#production-exchange-one'),'Current price')).toHaveText(prices.one);
  await expect(fact(page.locator('#production-exchange-chosen'),'Total payment')).toHaveText(prices.chosen);
  await expect(fact(page.locator('#production-exchange-parties'),'Payer')).toHaveText(prices.payer);
  await expect(fact(page.locator('#production-exchange-parties'),'Payment recipient')).toHaveText(prices.recipient);

  const before=await page.evaluate(function(){
    const s=FB.state,P=FB.production,E=FB.productionEconomy;
    const reviewed=E.aiQuote(s,'fish_market',2,'sell');
    const batch=P.commit(s,P.aiQuote(s,'fish_source','reserve',{recipeId:'dry_fish',disposition:'store'}));
    const fresh=E.aiQuote(s,'fish_market',2,'sell');
    const live=JSON.stringify(s);
    const refusal=E.commit(s,reviewed);
    return {batch:!!batch,stillAllowed:fresh.allowed,available:fresh.sourceAvailable,remaining:fresh.sourceRemaining,
      refused:refusal===false,pure:live===JSON.stringify(s),ledger:JSON.stringify(s.production),
      seller:P.account(s,fresh.seller).funds.available,buyer:P.account(s,fresh.buyer).funds.available};
  });
  expect(before).toMatchObject({batch:true,stillAllowed:true,available:4,remaining:6,refused:true,pure:true});
  await page.getByRole('button',{name:'Confirm exchange',exact:true}).click();
  await expect(action).toBeFocused();
  expect(await page.evaluate(function(){return JSON.stringify(FB.state.production);})).toBe(before.ledger);

  await action.click();
  await expect(input).toHaveValue('2');
  await expect(fact(page.locator('#production-exchange-chosen'),'Unreserved supplier stock remaining')).toHaveText('2 (fish_units)');
  await page.getByRole('button',{name:'Confirm exchange',exact:true}).click();
  await expect(action).toBeDisabled();
  await expect(page.locator('#production-exchange-fish_market-route')).toBeFocused();
  const result=await page.evaluate(function(){
    const s=FB.state,P=FB.production,E=FB.productionEconomy,receipt=s.production.economy.receipts[0];
    const landed=s.production.lots.find(function(l){return l.id===receipt.lotId;});
    function accounts(t) {
      return [P.account(t,receipt.seller).funds.available,P.account(t,receipt.buyer).funds.available];
    }
    function facts(t) {
      return FB.contentValues.canonical([t.production,accounts(t),t.player.enterprises,FB.getRngState()>>>0,FB.getUidCounter()]);
    }
    const ledger=facts(s),cash=accounts(s),short=E.aiQuote(s,'fish_market',1,'sell');
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const restored=facts(FB.state);
    P.validate(FB.state);
    return {receipts:s.production.economy.receipts.length,quantity:receipt.quantity,paid:receipt.paid,
      landed:landed.remaining,inputs:receipt.inputs.map(function(x){return x.quantity;}),cash:cash,
      restored:ledger===restored,demand:short.remainingDemand,enterprises:s.player.enterprises.length,
      matchedAccounts:JSON.stringify(receipt.payer)===JSON.stringify(short.payer)&&JSON.stringify(receipt.recipient)===JSON.stringify(short.recipient)};
  });
  expect(result).toMatchObject({receipts:1,quantity:2,paid:prices.paid,landed:2,inputs:[2],restored:true,
    demand:2,enterprises:0,matchedAccounts:true});
  expect(result.cash[0]-before.seller).toBeCloseTo(prices.paid,8);
  expect(before.buyer-result.cash[1]).toBeCloseTo(prices.paid,8);
});

test('a chosen delivery into a paid workshop retains exact trade and invoice records on restore',async function({page},info){
  await begin(page,info,'maritime-work-river','MARITIMECONSTRUCTION-maritime_river-maritime_river_ruler-resource_quay-m-Ivo_Reed-standard','new_works');
  const built=await page.evaluate(function(){
    const s=FB.state;
    s.player.gold=2000;
    const record=FB.realmTechRecord(s,FB.techRealmId(s));
    ['coastal_piloting','harbor_works','knarrs','sternpost_rudder'].forEach(function(id){
      if(record.completed.indexOf(id)<0)record.completed.push(id);
    });
    FB.invalidateTechBonuses();
    const blocked=FB.productionEconomy.aiQuote(s,'timber_delivery',2,'transfer');
    const built=FB.build(s,'resource_quay',0,'boat_workshop');
    const plant=FB.production.snapshot(s).find(function(r){return r.site.id==='boat_plant';});
    return {blocked:blocked.reason,built:built,constructed:plant.asset.constructed,empty:plant.lots.length===0,enterprises:s.player.enterprises.length};
  });
  expect(built).toEqual({blocked:'authority',built:true,constructed:true,empty:true,enterprises:0});
  await productionSheet(page,'resource_quay');
  await page.locator('#production-exchange-timber_delivery').click();
  await page.getByRole('spinbutton',{name:'Quantity to exchange'}).fill('2');
  await page.getByRole('button',{name:'Confirm exchange',exact:true}).click();
  const result=await page.evaluate(function(){
    const s=FB.state,E=FB.productionEconomy,P=FB.production,M=FB.maritimeWork;
    FB.ui.closeModalStack();
    const timber=s.production.economy.receipts[0],recipe=FBDATA.productionRecipes.prepare_boat_work;
    if(!timber || !E.commit(s,E.aiQuote(s,'cordage_delivery',1,'transfer')))throw new Error('Expected both exact owned deliveries.');
    const batch=P.commit(s,P.aiQuote(s,'boat_plant','reserve',{recipeId:'prepare_boat_work',disposition:'store'}));
    if(!batch)throw new Error('Expected a funded production batch.');
    for(let i=0;i<recipe.workDays;i++){
      if(!P.perform(s,P.aiQuote(s,'boat_plant','work',{batchId:batch})))throw new Error('Expected a real action day.');
    }
    if(!P.commit(s,P.aiQuote(s,'boat_plant','finish',{batchId:batch})))throw new Error('Expected the worked batch to finish.');
    const invoice=M.commit(s,M.aiQuote(s,'licensed_work','prepare',{enterpriseUid:null}));
    if(!invoice)throw new Error('Expected a real reserved invoice.');
    function facts() {
      const t=FB.save.expandedSnapshot(FB.state);
      return FB.contentValues.canonical([t.production,t.siteResources,t.player.gold,t.player.enterprises,FB.getRngState()>>>0,FB.getUidCounter()]);
    }
    const before=facts();
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const restored=before===facts(),t=FB.state,enterpriseBefore=t.player.enterprises.length,cash=t.player.gold;
    const due=M.aiQuote(t,'licensed_work','complete',{invoiceId:invoice});
    const completed=M.commit(t,due),spent=cash-t.player.gold;
    const final=facts();
    FB.save.restore(JSON.parse(FB.save.serialize()));
    P.validate(FB.state);
    const lot=FB.state.production.lots.find(function(l){return l.id===timber.lotId;});
    return {restored:restored,completed:completed,spent:spent,due:due.due,final:final===facts(),
      repeated:M.commit(FB.state,due),enterpriseBefore:enterpriseBefore,enterpriseAfter:FB.state.player.enterprises.length,
      delivery:timber.quantity,remaining:lot.remaining,invoice:FB.state.production.maritime.invoices[0].status};
  });
  expect(result).toMatchObject({restored:true,completed:true,final:true,repeated:false,enterpriseBefore:0,
    enterpriseAfter:1,delivery:2,remaining:1,invoice:'committed'});
  expect(result.spent).toBeCloseTo(result.due,8);
});
