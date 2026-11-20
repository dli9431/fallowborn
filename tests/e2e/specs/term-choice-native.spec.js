'use strict';
const {test,expect}=require('../support/fixture');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
dependsOnRuntime(__filename,['data/starts_mainz_1096.js','data/story_households_rhineland_1096.js',
  'data/bookmark_1096_mainz.js','data/technology.js','js/story_household_refuge.js','js/story_household_party.js',
  'js/stories.js','js/treasury.js','js/save.js','js/save_v4.js','js/ui_misc.js','js/i18n.js']);

test('Mainz renews once through the shelter review and voluntary provider decisions',async function({page},info) {
  await beginBookmark(page,info,'1096','mainz_jewish_household_1096');
  const opening=await page.evaluate(function() {
    const s=FB.state,P=FB.householdParties,R=FB.householdRefuges;
    const id='mainz_refuge_1096',party='mainz_party_1096',actor=s.player.charId;
    function partyAct(op) { return P.commit(s,P.review(s,party,op,actor,actor)); }
    function act(op,who,terms) { return R.commit(s,R.review(s,id,op,who,terms)); }
    if (!partyAct('invite') || !partyAct('accept') || !act('request',actor,{partyId:party,personIds:[actor]}))
      throw new Error('Expected the native household to request shelter');
    const r=s.stories[id].requests[0],terms={requestId:r.id};
    if (!act('consent',actor,{...terms,personId:actor}) || !act('authorize',r.provider.rulerId,terms) ||
        !act('offer',r.provider.incumbentId,terms) || !act('enter',actor,{...terms,personIds:[actor]}))
      throw new Error('Expected the native household to be admitted');
    const legacy=JSON.parse(FB.save.serialize());
    FB.save.restore(legacy);
    const active=FB.state,ledger=active.stories[id];
    FB.stories.get(id).day(active,ledger);
    const treasury=FB.treasuryPublicAccountSnapshot(active,r.provider.realmId);
    window.termOpening={id,actor,terms,legacy,treasury};
    FB.ui.closeModal();
    FB.ui.showStorySheet(id);
    return {legacy:JSON.stringify(ledger)===JSON.stringify(legacy.state.stories[id]),
      account:!!treasury,end:r.endTurn,rate:r.payment.amount,unrequested:!ledger.requests[0].extension};
  });
  expect(opening).toEqual({legacy:true,account:true,end:30,rate:0,unrequested:true});
  const sheet=page.locator('#genmodal');
  const request=sheet.locator('[data-story-choice="extension_request/r1"]');
  await request.focus();
  await request.click();
  await expect(sheet.locator('.review-fact-card')).toContainText('Current expiry');
  await expect(sheet.locator('.review-fact-card')).toContainText('Proposed expiry');
  await expect(sheet.locator('.review-fact-card')).toContainText('Public cost of the additional term');
  await expect(sheet.locator('.review-person')).toHaveCount(3);
  await page.keyboard.press('Escape');
  await expect(request).toBeFocused();
  expect(await page.evaluate(function() { return !!FB.state.stories[termOpening.id].requests[0].extension; })).toBe(false);
  await request.click();
  await page.evaluate(function() {
    const s=FB.state;
    s.date=FB.dateAtTurn(s,s.turn+1);
    s.turn++;
  });
  await sheet.locator('#gm-story-confirm').click();
  await expect(sheet).toContainText('Terms changed');
  await sheet.getByRole('button',{name:'Back',exact:true}).click();
  await expect(request).toBeFocused();
  expect(await page.evaluate(function() { return !!FB.state.stories[termOpening.id].requests[0].extension; })).toBe(false);
  await request.click();
  await sheet.locator('#gm-story-confirm').click();
  await expect(sheet).toContainText('Decision recorded');
  await sheet.locator('#gm-story-continue').click();
  await expect(sheet).toBeHidden();

  expect(await page.evaluate(function() {
    const {id,actor,terms,legacy,treasury}=termOpening;
    const s=FB.state,ledger=s.stories[id],r=ledger.requests[0],R=FB.householdRefuges;
    const original=legacy.state.stories[id].requests[0],game=FB.stories.get(id);
    const requestOnly=!!r.extension && r.extension.authorization===null && r.extension.payment===null;
    const before=JSON.stringify([s.chars,s.player,s.owner,s.holder,s.population,s.armies,s.buildings]);
    function at(turn) { s.date=FB.dateAtTurn(s,turn);s.turn=turn;game.day(s,ledger); }
    at(original.endTurn-1);
    const x=r.extension,receipt=x.payment;
    const dates=FB.stories.status(s,id).lines.at(-1);
    const renewed=receipt.amount===0 && receipt.actorId===original.provider.incumbentId &&
      receipt.realmId===original.payment.realmId && x.authorization.actorId===original.provider.rulerId &&
      x.authorization.turn===29 && receipt.turn===29 && x.requestedTurn===1;
    const onlyExtension=Object.keys(original).every(function(key) {
      return JSON.stringify(r[key])===JSON.stringify(original[key]);
    });
    const duplicate=R.commit(s,R.review(s,id,'extension_request',actor,terms));
    at(original.endTurn);
    const continuous=r.status==='active' && FB.stories.status(s,id).lines[0]==='Reserved protective places: 1 of 8.';
    at(original.endTurn+29);
    const lastDay=r.status;
    at(original.endTurn+30);
    return {requestOnly,renewed,onlyExtension,duplicate,continuous,lastDay,dates,
      expired:r.status,closedTurn:r.closedTurn,site:R.presence(s,actor).siteId,
      uncharged:JSON.stringify(FB.treasuryPublicAccountSnapshot(s,r.provider.realmId))===JSON.stringify(treasury),
      conserved:before===JSON.stringify([s.chars,s.player,s.owner,s.holder,s.population,s.armies,s.buildings])};
  })).toMatchObject({requestOnly:true,renewed:true,onlyExtension:true,duplicate:false,continuous:true,lastDay:'active',
    dates:expect.stringMatching(/Original expiry .* Extended expiry/),expired:'expired',closedTurn:60,site:'mainz_refuge_1096',
    uncharged:true,conserved:true});
});
