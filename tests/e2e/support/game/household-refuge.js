'use strict';
const path=require('path');
const {expect}=require('../fixture');
const {expectModAdmission}=require('./mod-admission');
const {openGame,prepareGameContent}=require('./navigation');
const {beginBookmarkFromTitle}=require('./bookmark-acceptance');
const examples={river:require('../../fixtures/authoring/household-refuge-river.json'),hill:require('../../fixtures/authoring/household-refuge-hill.json')};

async function start(page,info,label,input) {
  await openGame(page,info);
  await expectModAdmission(page,input || examples[label]);
  await page.evaluate(function() { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(input ? {name:'refuge.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(input))} :
    path.resolve(__dirname,'../../fixtures/authoring/household-refuge-'+label+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await page.waitForFunction(function() { return window.FB && FB.game && FB.game.bootReady; });
  await beginBookmarkFromTitle(page,label==='river'?'inventory_estuary':'shelter_hill_estuary',
    label==='river'?'inventory_estuary_household':'shelter_hill_estuary_household');
  await page.evaluate(function(label) {
    window.refugeLabel=label;
    window.refugeAt=function(turn) { const s=FB.state;s.date=FB.dateAtTurn(s,turn);s.turn=turn; };
    window.refugeRecord=function() { return FB.state.stories[refugeLabel+'_refuge']; };
    window.refugeAct=function(action,actor,terms) { const s=FB.state,R=FB.householdRefuges;
      return R.commit(s,R.review(s,refugeLabel+'_refuge',action,actor,terms)); };
    window.refugeAssets=function() { const s=FB.state;return JSON.stringify([s.chars,s.population,s.armies,s.owner,s.holder,s.player.gold,s.buildings,s.holdings]); };
    window.refugeParty=function(child) {
      const s=FB.state,P=FB.householdParties,id=refugeLabel+'_party',actor=s.player.charId,spouse=FB.spousesOf(s,s.chars[actor])[0];
      function act(op,who,person,care) { if (!P.commit(s,P.review(s,id,op,who,person,care))) throw new Error('Party setup: '+op); }
      act('invite',actor,actor);act('accept',actor,actor);act('invite',actor,spouse.id);
      FB.stories.get(id).day(s,s.stories[id]);
      const ids=[actor,spouse.id];
      if (child) {
        const c=FB.householdMembers(s).filter(function(c) { return FB.ageOf(c,s.date.year)<16; })[0];
        if (!c) throw new Error('Expected existing child');
        act('invite',actor,c.id,actor);act('accept',actor,c.id,actor);ids.push(c.id);
      }
      return ids;
    };
    window.refugeRequest=function(ids) {
      const s=FB.state;
      if (!refugeAct('request',s.player.charId,{partyId:refugeLabel+'_party',personIds:ids})) throw new Error('Request refused');
      const r=refugeRecord().requests.slice(-1)[0];
      r.members.forEach(function(m) { if (!refugeAct('consent',m.caregiverId || m.personId,{requestId:r.id,personId:m.personId})) throw new Error('Consent refused'); });
      return r.id;
    };
    window.refugeOffer=function(id) {
      const r=refugeRecord().requests.filter(function(r) { return r.id===id; })[0];
      if (!refugeAct('authorize',r.provider.rulerId,{requestId:id}) || !refugeAct('offer',r.provider.incumbentId,{requestId:id})) throw new Error('Offer refused');
    };
    window.refugeEnter=function(id,ids) { return refugeAct('enter',FB.state.player.charId,{requestId:id,personIds:ids}); };
  },label);
}

async function arrive(page) {
  await page.evaluate(function() {
    const s=FB.state,P=FB.householdParties,id='hill_party';
    if (!P.commit(s,P.review(s,id,'depart_journey',s.player.charId))) throw new Error('Departure refused');
    for (let n=0;n<16 && s.player.travel.phase!=='arrived';n++) { refugeAt(s.turn+1);s.player.travel.legDaysLeft=1;FB.travelTick(s); }
    if (s.player.travel.phase!=='arrived') throw new Error('Bounded arrival failed');
    FB.travelCapstoneDone(s);FB.stories.get(id).day(s,s.stories[id]);
  });
}

module.exports={start,arrive,examples};
