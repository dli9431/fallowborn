'use strict';
const {prepareGameContent} = require('../support/game/navigation');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const journeys={harbor:require('../fixtures/authoring/household-journey-harbor.json'),upland:require('../fixtures/authoring/household-journey-upland.json')};
const camps={harbor:require('../fixtures/authoring/household-camp-harbor.json'),upland:require('../fixtures/authoring/household-camp-upland.json')};
dependsOnRuntime(__filename,['index.html','data/technology.js','data/starts.js','data/mobile_confederations.js','data/travel.js','js/story_household_party.js','js/stories.js',
  'js/story_household.js','js/household_party_travel.js','js/household_party_camp.js','js/story_expedition_participation.js','js/mobile_confederations.js','js/mobile_command.js',
  'js/mods.js','js/world.js','js/starts.js','js/bookmark_setup.js','js/economy.js','js/model.js','js/items.js',
  'data/actions.js','js/actions.js','js/agency.js','js/justice.js','js/intrigue.js','js/travel.js','js/save.js','js/save_v4.js','js/ui_misc.js','js/main.js']);

async function start(page,info,label,modified) {
  const prefix=label==='upland'?'dune':'harbor';
  await openGame(page,info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({name:'household-party-'+label+'.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(modified))});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await page.waitForFunction(function (prefix) { return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world']; },prefix);
  await beginBookmark(page,info,prefix+'_world',prefix+'_household');
}

function options(label,ordinary) {
  const input=JSON.parse(JSON.stringify(camps[label])),pid=label+'_participation',alt=label+'_alternative';
  input.storyInstances[alt]=Object.assign({},input.storyInstances[pid],{id:alt,termDays:7,capacity:1});
  input.startScenarios[0].tracks.push(alt);
  input.startScenarios[0].trackLocations[alt]=input.startScenarios[0].trackLocations[pid].slice();
  if(ordinary){
    input.storyInstances[label+'_party']=journeys[label].storyInstances[label+'_party'];
    ['travelSites','travelPurposes','travelRules'].forEach(function(key){input[key]=journeys[label][key];});
  }
  return input;
}

for(const label of ['harbor','upland']) {
  for(const kind of ['ordinary','expiry','following loss']) {
    test(label+' retains an untouched alternative through '+kind+' and a real paid road',async function({page},info){
      await start(page,info,label,options(label,kind==='ordinary'));
      const result=await page.evaluate(function(input){
        const label=input.label,kind=input.kind,P=FB.householdParties,E=FB.expeditionParticipants;
        const id=label+'_party',pid=label+'_participation',alt=label+'_alternative';
        let s=FB.state;
        const actor=s.player.charId,spouse=FB.spousesOf(s,s.chars[actor])[0].id,home=s.player.provinceId;
        const untouched=JSON.stringify(s.stories[alt]),primary=JSON.stringify(s.stories[pid]),checks={};
        function require(value,message){if(!value)throw new Error(message);}
        function act(action,who,person,care){return P.commit(s,P.review(s,id,action,who,person,care));}
        function restore(){
          const raw=JSON.parse(FB.save.serialize()),bytes=JSON.stringify(raw),facts=JSON.stringify([s.stories,s.player.travel,s.player.gold]),rng=FB.getRngState(),uid=FB.getUidCounter();
          FB.save.restore(raw);FB.save.restore(JSON.parse(JSON.stringify(raw)));s=FB.state;
          const after=JSON.stringify([s.stories,s.player.travel,s.player.gold]);
          require(bytes===JSON.stringify(raw),'Restore mutated input');
          require(facts===after,'Restore facts: '+JSON.stringify({before:JSON.parse(facts),after:JSON.parse(after)}));
          // Restore canonicalizes the same RNG bits to unsigned form.
          require((rng>>>0)===(FB.getRngState()>>>0),'Restore changed RNG bits');
          require(uid===FB.getUidCounter(),'Restore UID: '+uid+' -> '+FB.getUidCounter());
          return true;
        }
        function reject(state,action){
          const before=JSON.stringify(state),rng=FB.getRngState(),uid=FB.getUidCounter(),q=P.review(state,id,action,actor);
          return !q.allowed&&!P.commit(state,q)&&before===JSON.stringify(state)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
        }
        require(act('invite',actor,actor)&&act('accept',actor,actor)&&act('invite',actor,spouse),'Invitations');
        checks.noProxyConsent=!act('accept',actor,spouse);
        FB.stories.get(id).day(s,s.stories[id]);
        if(label==='upland'){
          const child=FB.householdMembers(s).filter(function(c){return FB.ageOf(c,s.date.year)<16;})[0];
          require(act('invite',actor,child.id,actor)&&act('accept',actor,child.id,actor),'Parent consent');
        }
        checks.association=P.snapshot(s,id).accepted.length===2;
        checks.freshAlternative=s.stories[alt].status==='pending'&&s.stories[alt].roleId===null&&!s.stories[alt].locationHeld;
        if(kind==='ordinary'){
          // Real request and acceptance establish each conflicting admission; clones keep the positive offers untouched.
          const pending=JSON.parse(JSON.stringify(s));
          require(E.commit(pending,E.review(pending,pid,'request',actor,'guest')),'Pending request');
          checks.pending=reject(pending,'depart_journey');
          FB.stories.get(pid).day(pending,pending.stories[pid]);
          require(pending.stories[pid].status==='active','Active admission');
          checks.active=reject(pending,'depart_journey');
          pending.stories[pid].status='suspended';checks.suspended=reject(pending,'depart_journey');
          pending.stories[pid].status='active';
          FB.mobile.migration(pending,FB.stories.get(pid).declaration.host.realmId).at=label==='harbor'?'harbor_gardens':'dune_pass';
          FB.stories.get(pid).day(pending,pending.stories[pid]);
          require(E.commit(pending,E.review(pending,pid,'leave',actor)),'Leave');
          checks.held=pending.stories[pid].locationHeld&&reject(pending,'depart_journey');
          const captive=JSON.parse(JSON.stringify(s));captive.chars[actor].captive=true;
          checks.care=reject(captive,'depart_journey');
          checks.before=restore();
          const before=JSON.stringify(s),q=P.review(s,id,'depart_journey',actor),gold=s.player.gold;
          checks.pure=q.allowed&&before===JSON.stringify(s);
          require(P.commit(s,q),'Departure');checks.departurePaid=gold-s.player.gold===q.cost&&q.cost>0&&!P.commit(s,q);
          // Reach a real neighboring county, then interrupt and separately price recovery.
          s.turn++;s.player.travel.legDaysLeft=1;FB.travelTick(s);
          require(FB.travelCancel(s),'Cancel ordinary journey');
        }else{
          require(E.commit(s,E.review(s,pid,'request',actor,'guest')),'Personal request');
          FB.stories.get(pid).day(s,s.stories[pid]);require(act('request_camp',actor),'Camp request');
          FB.stories.get(id).day(s,s.stories[id]);
          const t=s.stories[id],b=t.journey.carrier;
          require(t.journey.status==='active','Camp acceptance');
          FB.mobile.migration(s,b.realmId).at=label==='harbor'?'harbor_ridge':'dune_pass';
          FB.stories.get(id).day(s,t);
          if(kind==='expiry'){
            s.turn=Math.max(b.endTurn,s.stories[pid].endTurn);
          }else{
            FB.markRealmDead(s,b.realmId);
            checks.dispersed=FB.mobile.row(s,b.realmId).status==='dispersed'&&FB.mobile.migration(s,b.realmId).status==='failed';
          }
          FB.stories.get(pid).day(s,s.stories[pid]);FB.stories.get(id).day(s,t);
          checks.ended=['expired','interrupted'].includes(s.stories[pid].status)&&t.journey.status==='interrupted';
          checks.before=restore();
        }
        const original=JSON.stringify(s.stories[id].journey.carrier),action=kind==='ordinary'?'party_return':'camp_return';
        const q=P.review(s,id,action,actor),gold=s.player.gold;
        require(q.allowed,'Recovery quote');
        checks.people=q.people.length===2&&(label!=='upland'||q.excluded.includes(spouse));
        const captive=JSON.parse(JSON.stringify(s));captive.chars[actor].captive=true;
        checks.rejected=reject(captive,action);
        require(P.commit(s,q),'Recovery');checks.paid=q.cost>0&&gold-s.player.gold===q.cost&&!P.commit(s,q);
        checks.during=restore();
        const paidGold=s.player.gold;
        checks.away=q.people.every(function(person){return !FB.householdWorkers(s).some(function(c){return c.id===person;});});
        for(let i=0;i<16&&s.player.travel;i++){s.turn++;s.player.travel.legDaysLeft=1;FB.travelTick(s);FB.stories.get(alt).day(s,s.stories[alt]);}
        checks.arrived=!s.player.travel&&s.stories[id].journey.status==='returned'&&q.people.every(function(person){
          return FB.characterLocation(s,s.chars[person])===home&&FB.characterResidence(s,s.chars[person])===home;
        });
        checks.work=q.people.every(function(person){return FB.householdWorkers(s).some(function(c){return c.id===person;});});
        checks.original=kind==='ordinary' ? s.stories[id].journey.carrier.destinationId===home : original===JSON.stringify(s.stories[id].journey.carrier);
        checks.noRepayment=s.player.gold===paidGold&&reject(s,action);
        checks.after=restore();
        checks.workChoice=FB.focusStatus(s,'work_land').can;FB.setFocus(s,'work_land');
        const earnings=s.player.gold;FB.tickFocus(s);checks.earned=s.player.focus==='work_land'&&s.player.gold>earnings;
        checks.untouched=untouched===JSON.stringify(s.stories[alt]);
        if(kind==='ordinary')checks.primaryUntouched=primary===JSON.stringify(s.stories[pid]);
        return checks;
      },{label:label,kind:kind});
      for(const key of Object.keys(result))expect(result[key],key).toBe(true);
    });
  }
}
