'use strict';
const {test,expect}=require('../support/fixture');
const {start}=require('../support/game/household-refuge');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
dependsOnRuntime(__filename,['js/story_household_refuge.js','js/story_household_party.js','js/story_local_threat.js',
  'js/stories.js','js/home_authority.js','js/world.js','js/governments.js','js/treasury.js','js/save_v4.js']);

test('committed pressure, succession and the original deadline each stop pending funding',async function({page},info) {
  await start(page,info,'river');
  expect(await page.evaluate(function() {
    const s=FB.state,R=FB.householdRefuges,id='river_refuge',game=FB.stories.get(id);
    const [actor]=refugeParty(false),requestId=refugeRequest([actor]),terms={requestId};
    refugeOffer(requestId);
    if (!refugeEnter(requestId,[actor])) throw new Error('Expected ordinary entry');
    const r=refugeRecord().requests[0],{rulerId,incumbentId,realmId,generation}=r.provider;
    function q(t,op,who) { return R.review(t,id,'extension_'+op,who,terms); }
    function commit(t,op,who) { return R.commit(t,q(t,op,who)); }
    if (!commit(s,'request',actor) || !commit(s,'authorize',rulerId)) throw new Error('Expected valid additional term proposal');
    const original=r.endTurn;
    function clone() { return JSON.parse(JSON.stringify(s)); }
    function at(t,turn) { t.date=FB.dateAtTurn(t,turn);t.turn=turn; }
    function day(t) { game.day(t,t.stories[id]);return t.stories[id].requests[0]; }
    function assets(t) { return JSON.stringify([t.player.gold,FB.treasuryPublicAccountSnapshot(t,realmId),R.presence(t,actor)]); }
    const threat='river_attempt',danger=clone(),warned=FB.stories.apply(danger,threat,'warn',FB.stories.quote(danger,threat,'warn'));
    const afterWarning=q(danger,'fund',incumbentId);
    at(danger,1);
    const attempted=FB.stories.apply(danger,threat,'press',FB.stories.quote(danger,threat,'press'));
    const pressure=q(danger,'fund',incumbentId).reason,staleThreat=R.commit(danger,afterWarning),beforeThreat=assets(danger);
    const challenged=day(danger);
    at(danger,2);
    const resolved=FB.stories.apply(danger,threat,'finish',FB.stories.quote(danger,threat,'finish'));
    const stillChallenged=q(danger,'request',actor).reason;
    const threatResult=[warned,afterWarning.allowed,attempted,pressure,staleThreat,challenged.status,!challenged.extension,
      challenged.endTurn,resolved,stillChallenged,beforeThreat===assets(danger)];

    const turnover=clone(),stale=q(turnover,'fund',incumbentId);
    turnover.chars[rulerId].dead=true;
    FB.advanceRealmSuccession(turnover,realmId,{cause:'death'});
    const fresh=FB.realmRulerCharacterSnapshot(turnover,realmId),ownerChanged=fresh.id!==rulerId &&
      FB.realmRulerGeneration(turnover,realmId)>generation;
    const beforeTurnover=assets(turnover),successor=q(turnover,'authorize',fresh.id).reason;
    const staleRuler=R.commit(turnover,stale),provider=q(turnover,'fund',incumbentId).reason;
    const interrupted=day(turnover);
    const successorResult=[ownerChanged,successor,staleRuler,provider,interrupted.status,!interrupted.extension,
      interrupted.endTurn,beforeTurnover===assets(turnover)];

    const expired=clone(),beforeExpiry=assets(expired);
    at(expired,original);
    const late=q(expired,'fund',incumbentId),lateRequest=q(expired,'request',actor);
    const lapsed=day(expired);
    const expiryResult=[late.allowed,lateRequest.allowed,lapsed.status,!lapsed.extension,lapsed.closedTurn,beforeExpiry===assets(expired)];
    return {threatResult,successorResult,expiryResult};
  })).toEqual({threatResult:[true,true,true,'extension_threat',false,'challenged',true,5,true,'extension_term',true],
    successorResult:[true,'extension_provider',false,'extension_provider','interrupted',true,5,true],
    expiryResult:[false,false,'expired',true,5,true]});
});
