'use strict';
const {test,expect}=require('../support/fixture');
const {start,arrive}=require('../support/game/household-refuge');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
dependsOnRuntime(__filename,['data/technology.js','js/story_household_refuge.js','js/story_household_party.js',
  'js/household_party_travel.js','js/story_household.js','js/stories.js','js/travel.js','js/treasury.js',
  'js/save.js','js/save_v4.js','js/mods.js','js/ui_misc.js','js/i18n.js']);

test('a paid mixed household releases exactly the caregiver and child and keeps its site through matching restore',async function({page},info) {
  await start(page,info,'hill');
  await page.evaluate(function() { refugeParty(true); });
  await arrive(page);
  const admission=await page.evaluate(function() {
    const s=FB.state,party=s.stories.hill_party,actor=s.player.charId;
    const ids=party.members.map(function(m) { return m.personId; }),id=refugeRequest(ids);
    refugeOffer(id);
    if (!refugeEnter(id,ids)) throw new Error('Expected local entry');
    const legacy=JSON.parse(FB.save.serialize());
    const ledger=legacy.state.stories.hill_refuge;
    const oldShape=ledger.requests[0].members.every(function(m) { return !Object.hasOwn(m,'releasedTurn'); });
    FB.save.restore(legacy);
    const oldRestored=JSON.stringify(ledger)===JSON.stringify(refugeRecord());
    const capacity=FB.stories.status(FB.state,'hill_refuge').lines[0];
    const q=FB.stories.quote(FB.state,'hill_refuge','release_group/'+id);
    const child=party.members.find(function(m) { return m.caregiverId===actor; }).personId;
    const other=ids.find(function(p) { return p!==actor && p!==child; });
    window.careExit={id,actor,child,other,q,legacy};
    FB.ui.closeModal();FB.ui.showStorySheet('hill_refuge');
    return {oldShape,oldRestored,capacity,ready:q.allowed,exact:q.release.affected.slice().sort().join(',')===[actor,child].sort().join(','),
      remaining:q.release.remaining,other,prepaid:q.release.prepaid};
  });
  expect(admission).toMatchObject({oldShape:true,oldRestored:true,capacity:'Reserved protective places: 3 of 4.',
    ready:true,exact:true,remaining:[admission.other],prepaid:4.5});

  const sheet=page.locator('#genmodal');
  const choice=sheet.locator('[data-story-choice="release_group/r1"]');
  await choice.focus();
  await choice.click();
  await expect(sheet.locator('.review-person').filter({hasText:'Releases a protective place'})).toHaveCount(2);
  await expect(sheet.locator('.review-person').filter({hasText:'Keeps a protective place'})).toHaveCount(1);
  await expect(sheet).toContainText('Protective places freed: 2.');
  await expect(sheet).toContainText('Original public prepayment:');
  await expect(sheet).toContainText('4.5');
  await expect(sheet).toContainText('There is no refund, new charge or action day.');
  await expect(sheet).toContainText('Residence is unchanged. Use ordinary travel to depart.');
  await page.keyboard.press('Escape');
  await expect(choice).toBeFocused();

  await choice.click();
  await page.evaluate(function() { refugeAt(FB.state.turn+1); });
  await sheet.locator('#gm-story-confirm').click();
  await expect(sheet).toContainText('Terms changed');
  await sheet.getByRole('button',{name:'Back',exact:true}).click();
  await expect(choice).toBeFocused();
  await expect(choice).toHaveAttribute('aria-disabled','false');
  await page.evaluate(function() {
    window.careExit.before=JSON.parse(FB.save.serialize()).state;
  });
  await choice.click();
  await sheet.locator('#gm-story-confirm').click();
  await expect(sheet).toContainText('Decision recorded');
  await sheet.locator('#gm-story-continue').click();
  await expect(sheet).toBeHidden();

  expect(await page.evaluate(function() {
    const {id,actor,child,other,q,before,legacy}=careExit;
    let s=FB.state;
    const R=FB.householdRefuges,game=FB.stories.get('hill_refuge');
    const old=before.stories.hill_refuge.requests[0],r=refugeRecord().requests[0];
    const releaseTurn=s.turn;
    const expected=JSON.parse(JSON.stringify(old));
    expected.members.filter(function(m) { return m.personId!==other; }).forEach(function(m) { m.releasedTurn=releaseTurn; });
    const onlyGroup=JSON.stringify(expected)===JSON.stringify(r);
    const once=JSON.stringify(refugeRecord());
    const after=JSON.parse(FB.save.serialize()).state;
    const conserved=['chars','population','armies','owner','holder','buildings','holdings','treasuryAccounting','justice'].every(function(field) {
      return JSON.stringify(after[field])===JSON.stringify(before[field]);
    }) && JSON.stringify(after.player.travel)===JSON.stringify(before.player.travel) &&
      after.player.gold===before.player.gold && after.player.homeSettlement===before.player.homeSettlement &&
      JSON.stringify(after.stories.hill_party)===JSON.stringify(before.stories.hill_party);
    const site={provinceId:'shelter_hill_marsh',siteId:'shelter_hill_marsh_town'};
    function locations() { return [actor,child,other].every(function(p) {
      const current=R.presence(s,p);
      return current && current.provinceId===site.provinceId && current.siteId===site.siteId;
    }); }
    const atSite=locations() && FB.householdStories.atLocality(s,site);
    const duplicate=!R.commit(s,q) && !refugeAct('release_group',actor,{requestId:id});
    game.day(s,refugeRecord());
    const onceOnly=duplicate && once===JSON.stringify(refugeRecord());
    const capacity=FB.stories.status(s,'hill_refuge').lines[0];

    const mixed=JSON.parse(FB.save.serialize()),rng=FB.getRngState(),uid=FB.getUidCounter();
    const invalid=[function(row) { delete row.members.find(function(m) { return m.personId===child; }).releasedTurn; },
      function(row) { row.members.filter(function(m) { return m.personId!==other; }).forEach(function(m) { m.releasedTurn=row.endTurn; }); },
      function(row) { row.members.find(function(m) { return m.personId===other; }).releasedTurn=releaseTurn; }];
    const malformed=invalid.map(function(change) {
      const bad=JSON.parse(JSON.stringify(mixed));change(bad.state.stories.hill_refuge.requests[0]);
      try { FB.save.restore(bad);return false; } catch(e) { return FB.state===s && once===JSON.stringify(refugeRecord()); }
    });
    FB.save.restore(mixed);s=FB.state;
    const restored=JSON.parse(FB.save.serialize());
    const matched=legacy.v===mixed.v && mixed.v===restored.v && legacy.mods===restored.mods &&
      JSON.stringify(mixed.state.stories)===JSON.stringify(restored.state.stories) &&
      JSON.stringify(mixed.state.treasuryAccounting)===JSON.stringify(restored.state.treasuryAccounting) &&
      JSON.stringify(mixed.state.player.travel)===JSON.stringify(restored.state.player.travel) &&
      locations() && FB.householdStories.atLocality(s,site) && (rng>>>0)===(FB.getRngState()>>>0) && uid===FB.getUidCounter();

    const P=FB.householdParties;
    const premature=P.review(s,'hill_party','party_return',actor).allowed;
    refugeAt(r.endTurn);game.day(s,refugeRecord());
    const expired=refugeRecord().requests[0].status;
    const stayed=locations();
    refugeAt(s.player.travel.stayStartTurn+90);
    const road=P.commit(s,P.review(s,'hill_party','party_return',actor));
    const cleared=[actor,child,other].every(function(p) { return R.presence(s,p)===null; });
    game.day(s,refugeRecord());
    return {onlyGroup,conserved,atSite,onceOnly,capacity,malformed,matched,premature,expired,stayed,road,cleared,
      archived:refugeRecord().requests[0].members.every(function(m) { return m.leftTurn===s.turn; }),carrier:s.player.travel.householdPartyId,
      tech:FBDATA.techImpactReviews.features.household_temporary_refuge.mode};
  })).toEqual({onlyGroup:true,conserved:true,atSite:true,onceOnly:true,capacity:'Reserved protective places: 1 of 4.',
    malformed:[true,true,true],matched:true,premature:false,expired:'expired',stayed:true,road:true,cleared:true,
    archived:true,carrier:'hill_party',tech:'none'});
});

test('release rechecks original consent, care, admission, life, term and authority before it frees places',async function({page},info) {
  await start(page,info,'hill');
  await page.evaluate(function() { refugeParty(true); });
  await arrive(page);
  expect(await page.evaluate(function() {
    const s=FB.state,pt=s.stories.hill_party,actor=s.player.charId;
    const ids=pt.members.map(function(m) { return m.personId; }),id=refugeRequest(ids),terms={requestId:id};
    const child=pt.members.find(function(m) { return m.caregiverId===actor; }).personId;
    const R=FB.householdRefuges,r=refugeRecord().requests[0];
    refugeOffer(id);refugeEnter(id,ids);
    const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    function review(t,who,input) { return R.review(t,'hill_refuge','release_group',who,input || terms); }
    const q=review(s,actor);
    const pure=before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    const unauthorized=[review(s,child),review(s,r.provider.incumbentId),review(s,r.provider.rulerId),
      review(s,actor,{requestId:id,personIds:[actor]}),review(s,actor,{requestId:id,personIds:ids})];
    const changes=[function(t,row) { row.members.find(function(m) { return m.personId===child; }).consentBy=null; },
      function(t,row) { row.members.find(function(m) { return m.personId===child; }).admittedTurn=null; },
      function(t) { t.stories.hill_party.members.find(function(m) { return m.personId===child; }).status='withdrawn'; },
      function(t) { t.chars[child].captive=true; },function(t) { t.chars[actor].health=0; },
      function(t,row) { t.chars[row.provider.incumbentId].dead=true; },function(t,row) { row.status='offered'; },
      function(t,row) { t.turn=row.endTurn;t.date=FB.dateAtTurn(t,t.turn); }];
    return {allowed:q.allowed,pure,unauthorized:unauthorized.every(function(v) { return !v.allowed && !R.commit(s,v); }),
      rejected:changes.map(function(change) {
        const t=JSON.parse(before);change(t,t.stories.hill_refuge.requests[0]);
        const snapshot=JSON.stringify(t),fresh=review(t,actor);
        return !fresh.allowed && !R.commit(t,q) && !R.commit(t,fresh) && snapshot===JSON.stringify(t);
      })};
  })).toEqual({allowed:true,pure:true,unauthorized:true,rejected:Array(8).fill(true)});
});
