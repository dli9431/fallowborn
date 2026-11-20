'use strict';
const {test,expect}=require('../support/fixture');
const {start,arrive,examples}=require('../support/game/household-refuge');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const configuration=require('../fixtures/authoring/term-choice-hill.json');
dependsOnRuntime(__filename,['data/technology.js','js/story_household_refuge.js','js/story_household_party.js',
  'js/household_party_travel.js','js/stories.js','js/treasury.js','js/save.js','js/save_v4.js','js/mods.js']);

test('an ordinary paid import charges the original account for exactly the remaining protected group',async function({page},info) {
  await start(page,info,'hill',{...examples.hill,
    storyInstances:{...examples.hill.storyInstances,...configuration.storyInstances}});
  await page.evaluate(function() { refugeParty(true); });
  await arrive(page);
  const result=await page.evaluate(function() {
    let s=FB.state;
    const id='hill_refuge',R=FB.householdRefuges,actor=s.player.charId,game=FB.stories.get(id);
    const members=s.stories.hill_party.members,ids=members.map(m=>m.personId);
    const child=members.find(m=>m.caregiverId===actor).personId,other=ids.find(person=>person!==actor && person!==child);
    const requestId=refugeRequest(ids),terms={requestId};
    refugeOffer(requestId);
    if (!refugeEnter(requestId,ids)) throw new Error('Expected ordinary local entry');
    function q(op,who,state=s) { return R.review(state,id,'extension_'+op,who,terms); }
    function act(op,who) { return R.commit(s,q(op,who)); }
    let r=refugeRecord().requests[0];
    const {realmId,rulerId,incumbentId}=r.provider;
    const cash=()=>FB.treasuryPublicAccountSnapshot(s,realmId);
    const footprint=()=>JSON.stringify([s.chars,s.player,s.owner,s.holder,s.population,s.armies,s.buildings,s.holdings]);
    const site=R.presence(s,child);
    const original=r.endTurn,first=q('request',actor),group=first.extension.personIds;
    const untouched=JSON.stringify(r),initialCash=cash();
    const wrongRequesters=[child,rulerId,incumbentId,other].map(who=>q('request',who).allowed);
    const request=act('request',actor),premature=q('authorize',rulerId).reason,wrongConsent=q('consent',child).reason;
    const unauthorizedFund=q('fund',incumbentId).reason;
    const declined=act('decline',incumbentId),untouchedAfterDecline=untouched===JSON.stringify(r) &&
      JSON.stringify(initialCash)===JSON.stringify(cash());
    if (!act('request',actor) || !act('consent',other) || !act('authorize',rulerId))
      throw new Error('Expected fresh adult consent and civil spending authority');
    const stale=q('fund',incumbentId);
    const stableAfterDeferring=JSON.stringify(r);
    game.day(s,refugeRecord());
    const defer=stableAfterDeferring===JSON.stringify(r) && !r.extension.payment && r.endTurn===original;
    const released=refugeAct('release_group',other,terms);
    const noOldProposal=!r.extension && !R.commit(s,stale);
    if (!act('request',actor) || !act('authorize',rulerId)) throw new Error('Expected a fresh review for the remaining group');
    const beforeSave=JSON.parse(FB.save.serialize());
    const fundsBeforeSave=cash();
    FB.save.restore(beforeSave);
    s=FB.state;r=refugeRecord().requests[0];
    const pendingRestore=JSON.stringify(r)===JSON.stringify(beforeSave.state.stories[id].requests[0]) &&
      JSON.stringify(cash())===JSON.stringify(fundsBeforeSave);
    const account=s.realms[realmId].treasury,oldAccrued=account.militaryAccrued;
    const approved=q('fund',incumbentId);
    account.militaryAccrued=account.gold-3.5;
    const noFallback=q('fund',incumbentId).reason,staleFunds=R.commit(s,approved);
    account.militaryAccrued=oldAccrued;
    const wrongPayers=[actor,other,rulerId].map(who=>q('fund',who).allowed);
    const before=footprint(),priorCash=cash(),capacity=FB.stories.status(s,id).lines[0];
    const funded=act('fund',incumbentId),spent=priorCash.gold-cash().gold;
    const post=JSON.parse(FB.save.serialize());
    const sameGroup=JSON.stringify(r.extension.personIds)===JSON.stringify(group.filter(person=>person!==other));
    const exact=before===footprint() && JSON.stringify(r.members)===JSON.stringify(beforeSave.state.stories[id].requests[0].members) &&
      JSON.stringify(r.payment)===JSON.stringify(beforeSave.state.stories[id].requests[0].payment) &&
      capacity===FB.stories.status(s,id).lines[0] && JSON.stringify(R.presence(s,other))===JSON.stringify(site);
    const badSaves=[
      x=>{x.payment.realmId='player';},
      x=>{x.payment.actorId=rulerId;},
      x=>{x.payment.amount=1;},
      x=>{x.payment.turn=original;},
      x=>{x.authorization.generation++;},
      x=>{x.personIds=x.personIds.filter(person=>person!==child);},
      x=>{x.consents=[];}
    ].map(change=>{
      const invalid=JSON.parse(JSON.stringify(post));
      change(invalid.state.stories[id].requests[0].extension);
      const snapshot=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();
      try { FB.save.restore(invalid);return false; } catch(e) {
        return FB.state===s && snapshot===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
      }
    });
    FB.save.restore(post);
    s=FB.state;r=refugeRecord().requests[0];
    const paidRestore=JSON.stringify(r)===JSON.stringify(post.state.stories[id].requests[0]) && cash().gold===priorCash.gold-4;
    refugeAt(original);
    game.day(s,refugeRecord());
    const active=r.status;
    refugeAt(original+4);
    game.day(s,refugeRecord());
    return {request,wrongRequesters,premature,wrongConsent,unauthorizedFund,declined,untouchedAfterDecline,defer,released,noOldProposal,
      pendingRestore,noFallback,staleFunds,wrongPayers,funded,spent,capacity,sameGroup,exact,badSaves,paidRestore,active,
      dateWindow:[first.extension.newEndTurn-first.extension.oldEndTurn,approved.extension.newEndTurn-original],
      offered:r.payment.amount,expired:r.status,receipt:r.extension.payment.realmId===realmId};
  });
  expect(result).toEqual({request:true,wrongRequesters:[false,false,false,false],premature:'extension_consent',
    wrongConsent:'extension_role',unauthorizedFund:'extension_consent',declined:true,untouchedAfterDecline:true,defer:true,
    released:true,noOldProposal:true,pendingRestore:true,noFallback:'extension_funds',staleFunds:false,wrongPayers:[false,false,false],
    funded:true,spent:4,capacity:'Reserved protective places: 2 of 4.',sameGroup:true,exact:true,badSaves:Array(7).fill(true),
    paidRestore:true,active:'active',dateWindow:[4,4],offered:6,expired:'expired',receipt:true});
});
