'use strict';

const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

test.describe.configure({mode:'parallel'});
dependsOnRuntime(__filename,['js/production.js','js/production_economy.js','js/building_seasons.js',
  'js/site_resources.js','js/market.js','js/treasury.js','js/main.js','js/save.js','js/save_v4.js','js/mods.js',
  'js/ui_modals.js','js/ui_misc.js','css/style.css','data/production_early_industry.js','data/technology.js']);

async function begin(page,info,fixture,seed,recipes) {
  await openGame(page,info);
  await page.evaluate(function () { FB.ui.showMods(); });
  const file=path.resolve(__dirname,'../fixtures/authoring',fixture+'.json');
  const mod=recipes && Object.assign({},require(file),{productionRecipes:Object.assign({},require(file).productionRecipes,recipes)});
  await page.locator('#modfile').setInputFiles(mod ? {name:'output-choice-fiber.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(mod))} : file);
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  if (seed) {
    const title=page.locator('#btn-choose-beginning');
    if(await title.isVisible()) await title.click();
    else await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill(seed);
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
    await page.getByRole('button',{name:'Begin',exact:true}).click();
  } else await beginBookmarkFromTitle(page,'production_fiber','production_fiber_household');
  await page.evaluate(function () {
    FB.game.setPaused(true);
    FB.game.auto.all=true;
    FB.game.auto.style='first';
  });
}

test('original operator can store a funded use batch, with exact work, stale refusal and matching restores',async function ({page},info) {
  await begin(page,info,'production-fiber');
  const result=await page.evaluate(function () {
    const P=FB.production,R=FB.siteResources,site='fiber_plant';
    let s=FB.state;
    s.realms.production_fiber_court.treasury.gold=10000;
    function quote(operation,terms,t=s) { return P.aiQuote(t,site,operation,terms); }
    function snapshot(t) { return JSON.stringify([t.production,t.siteResources,FB.treasuryAvailable(t,'production_fiber_court'),FB.getRngState(),FB.getUidCounter()]); }
    function blocked(t,q) { const before=snapshot(t);return P.commit(t,q)===false && before===snapshot(t); }
    function copy(t) { return JSON.parse(JSON.stringify(t)); }
    const id=P.commit(s,quote('reserve',{recipeId:'rag_paper',disposition:'use'}));
    if (typeof id!=='number') throw new Error('Expected a paid use batch');
    const batchId={batchId:id},store={batchId:id,disposition:'store'};
    const original=snapshot(s);
    FB.save.restore(JSON.parse(FB.save.serialize()));s=FB.state;
    const oldSave=snapshot(s)===original;
    const oldReview=quote('amend',store);
    if (!oldReview.allowed || !P.commit(s,quote('work',batchId))) throw new Error('Expected a reviewed amendment and first shift');
    const staleAfterWork=blocked(s,oldReview);
    s.turn++;s.date.day++;
    const before=snapshot(s), review=quote('amend',store), pure=before===snapshot(s);
    const interrupted=[function(t){t.buildings.resource_quay.find(function(b){return b.productionAsset;}).ruined=true;},
      function(t){t.chars[t.production.batches[0].workerId].imprisoned=true;},
      function(t){t.realms.production_fiber_court.ruler.generation=FB.realmRulerGeneration(t,'production_fiber_court')+1;},
      function(t){t.turn=7;t.date.day=8;},
      function(t){if (!P.commit(t,quote('cancel',batchId,t))) throw new Error('Expected cancellation');}];
    const refusals=interrupted.map(function(change){
      const t=copy(s);change(t);const fresh=quote('amend',store,t);
      return !fresh.allowed && blocked(t,review) ? fresh.reason : null;
    });
    const wrongActor=P.quote(s,Object.assign({},review.request,{actor:{kind:'character',id:s.player.charId}}));
    const alternative=copy(s);
    const amended=P.commit(s,review), after=copy(s);
    after.production.batches[0].disposition='use';
    const choiceOnly=before===snapshot(after);
    const repeatAmend=blocked(s,review);
    const expected=snapshot(s);
    FB.save.restore(JSON.parse(FB.save.serialize()));s=FB.state;
    const restored=expected===snapshot(s);
    if (!P.commit(s,quote('work',batchId)) || !P.commit(alternative,quote('work',batchId,alternative))) throw new Error('Expected final shifts');
    const useFinish=quote('finish',batchId,alternative),storeFinish=quote('finish',batchId);
    const late=copy(alternative), lateReview=quote('amend',store,late);
    const lateAmend=lateReview.workDone===2 && P.commit(late,lateReview) && blocked(late,useFinish);
    const staleFinish=blocked(s,useFinish), finished=P.commit(s,storeFinish), control=P.commit(alternative,useFinish);
    P.validate(s);P.validate(alternative);R.validate(s);
    const settled=snapshot(s);
    FB.save.restore(JSON.parse(FB.save.serialize()));s=FB.state;
    const remaining=function(t){return t.production.lots.find(function(x){return x.origin.kind==='batch';}).remaining;};
    const settledRestore=snapshot(s)===settled, repeat=blocked(s,storeFinish);
    for (const t of [s,alternative]) { t.turn++;t.date.day++; }
    return {oldSave,pure,staleAfterWork,refusals,wrongActor:wrongActor.allowed,amended,choiceOnly,repeatAmend,restored,lateAmend,staleFinish,finished,control,
      settled:settledRestore,repeat,work:s.production.batches[0].workTurns,
      outputs:[remaining(s),remaining(alternative)],input:s.production.lots[0].remaining,water:R.snapshot(s)[0].consumed,
      preview:review.output,usePreview:useFinish.output,room:[P.outputRoom(after,0,{lots:511}),P.outputRoom(after,1,{lots:511})],
      followOn:[s,alternative].map(function(t){return quote('reserve',{recipeId:'bind_paper',disposition:'store'},t).allowed;})};
  });
  expect(result).toEqual({oldSave:true,pure:true,staleAfterWork:true,
    refusals:['authority','authority','amendBatch','reservedWater','amendBatch'],wrongActor:false,
    amended:true,choiceOnly:true,repeatAmend:true,restored:true,lateAmend:true,staleFinish:true,finished:true,control:true,settled:true,repeat:true,work:[0,1],
    outputs:[1,0],input:4,water:1,preview:[{goodId:'paper_lot',quantity:1,available:1,consumed:0}],
    usePreview:[{goodId:'paper_lot',quantity:1,available:0,consumed:1}],room:[true,false],followOn:[true,false]});
});

test('phone review previews and confirms immediate consumption of both imported recipe outputs',async function ({page},info) {
  await page.setViewportSize({width:390,height:844});
  await begin(page,info,'production-fiber','BATCHACCOUNTS-production_fiber-production_fiber_ruler-resource_quay-m-Ivo_Reed-standard',
    require('../fixtures/authoring/output-choice-fiber.json'));
  const id=await page.evaluate(function () {
    const s=FB.state,P=FB.production;
    const id=P.commit(s,P.aiQuote(s,'fiber_plant','reserve',{recipeId:'rag_paper',disposition:'store'}));
    if (typeof id!=='number') throw new Error('Expected a paid store batch');
    FB.ui.closeModal();FB.ui.showSettlement('resource_quay',0);
    return id;
  });
  await page.locator('#settlement-production').click();
  const action=page.locator('#production-amend-'+id), body=page.locator('#gm-body');
  const batch=page.locator('#production-batch-'+id), choice=page.locator('#production-disposition-rag_paper');
  await choice.selectOption('use');
  await action.scrollIntoViewIfNeeded();
  const scroll=await body.evaluate(function(el){return el.scrollTop;});
  await action.click();
  await expect(page.locator('#gm-title')).toHaveText('Review batch output');
  await expect(body.getByText('Keep as owned lots',{exact:true})).toBeVisible();
  await expect(body.getByText('Consume the output, with no bonus',{exact:true})).toBeVisible();
  for (const [good,unit] of [['Paper lot','paper_units'],['Bound paper packet','packet_units']]) {
    const facts=body.locator('section').filter({has:page.getByRole('heading',{name:good,exact:true})});
    await expect(facts.locator('.kv').filter({hasText:'Consumed at completion'}).locator('b')).toHaveText('1 ('+unit+')');
    await expect(facts.locator('.kv').filter({hasText:'Available inventory after completion'}).locator('b')).toHaveText('0 ('+unit+')');
  }
  await page.keyboard.press('Escape');
  await expect(action).toBeFocused();
  await expect(batch).toContainText('Keep as owned lots');
  await action.click();
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await expect(action).toBeFocused();
  expect(await body.evaluate(function(el){return el.scrollTop;})).toBe(scroll);
  await action.click();
  await page.getByRole('button',{name:'Confirm output change',exact:true}).click();
  await expect(action).toBeFocused();
  await expect(batch).toContainText('Current output choice');
  await expect(batch.locator('.kv').filter({hasText:'Current output choice'})).toContainText('Consume the output, with no bonus');
  await expect(choice).toHaveValue('use');
  expect(await body.evaluate(function(el){return el.scrollWidth>el.clientWidth+1;})).toBe(false);
  const result=await page.evaluate(function (id) {
    const s=FB.state,P=FB.production;
    const pending=s.production.batches[0], before={paid:pending.paid,work:pending.workTurns.slice(),water:FB.siteResources.snapshot(s)[0].reserved};
    const quote=function(operation){return P.aiQuote(s,'fiber_plant',operation,{batchId:id});};
    const worked=[P.perform(s,quote('work')),P.perform(s,quote('work'))];
    const finished=P.commit(s,quote('finish'));
    P.validate(s);
    return {before,worked,finished,remaining:s.production.lots.filter(function(l){return l.origin.kind==='batch';})
      .map(function(l){return [l.goodId,l.remaining];})};
  },id);
  expect(result).toEqual({before:{paid:3,work:[],water:1},worked:[true,true],finished:true,remaining:[['paper_lot',0],['bound_paper',0]]});
});

test('sale-bound imported paper needs a lawful funded outlet at booking and keeps its funded store commitment',async function ({page},info) {
  await begin(page,info,'early-industry-paper','FINITEINDUSTRY-early_industry_paper-early_industry_paper_ruler-baghdad-m-Ivo_Reed-standard');
  const result=await page.evaluate(function () {
    const s=FB.state,P=FB.production,E=FB.productionEconomy,site='paper_plant',recipeId='workshop_papermaking';
    s.player.gold=10000;
    function buyerGold(gold) { s.realms.supplier_bank_court.treasury.gold=gold; }
    buyerGold(10000);
    if (!E.commit(s,E.aiQuote(s,'fiber_delivery',2,'transfer'))) throw new Error('Expected a real fiber delivery');
    const destination=E.aiQuote(s,'paper_sale',1,'sell').toSite;
    const building=s.buildings[destination.countyId].find(function(b){return b.s===destination.slot && b.id===destination.buildingId;});
    const store=function(){return P.aiQuote(s,site,'reserve',{recipeId,disposition:'store'});};
    buyerGold(0);const noFunds=store();buyerGold(10000);
    building.ruined=true;const noAuthority=store();delete building.ruined;
    const outlet=E.aiQuote(s,'paper_sale',1,'sell'),tooMuch=E.aiQuote(s,'paper_sale',10000,'sell'),id=P.commit(s,store());
    if (typeof id!=='number') throw new Error('Expected a funded sale-bound reservation');
    const amend=function(disposition){return P.aiQuote(s,site,'amend',{batchId:id,disposition});};
    const before=JSON.stringify(s), use=amend('use'), same=amend('store');
    const refused=!P.commit(s,use) && !P.commit(s,same) && before===JSON.stringify(s);
    const forged=JSON.parse(JSON.stringify(s));forged.production.batches[0].disposition='use';
    let forgedRejected=false;
    try {P.validate(forged);} catch (error) {forgedRejected=/Invalid saved production/.test(error.message);}
    const quote=function(operation){return P.aiQuote(s,site,operation,{batchId:id});};
    const shifts=[P.perform(s,quote('work')),P.perform(s,quote('work'))];
    buyerGold(0);
    const finish=P.commit(s,quote('finish'));
    P.validate(s);
    const lot=s.production.lots.find(function(l){return l.origin.kind==='batch';});
    return {noFunds:[noFunds.allowed,noFunds.reason],noAuthority:[noAuthority.allowed,noAuthority.reason],
      outlet:[outlet.allowed,outlet.reason,outlet.outletReady,tooMuch.outletReady],use:use.reason,same:same.reason,refused,forgedRejected,
      shifts,finish,stored:lot.remaining,sale:E.aiQuote(s,'paper_sale',1,'sell').allowed};
  });
  expect(result).toEqual({noFunds:[false,'outlet'],noAuthority:[false,'outlet'],outlet:[false,'stock',true,false],
    use:'disposition',same:'sameDisposition',refused:true,forgedRejected:true,shifts:[true,true],finish:true,stored:1,sale:false});
});
