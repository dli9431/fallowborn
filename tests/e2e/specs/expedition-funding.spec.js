'use strict';
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {startAuthority,examples}=require('../support/game/expedition-authority');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
dependsOnRuntime(__filename,[
  'js/story_expedition_preparation.js','index.html','data/mobile_confederations.js','data/political_institutions.js',
  'js/home_authority.js','js/treasury.js','js/authority.js','js/governments.js','js/government_continuity.js',
  'js/mobile_confederations.js','js/mobile_command.js','js/expedition_programs.js','js/mobile_columns.js','js/model.js','js/bookmark_setup.js',
  'js/starts.js','js/main.js','js/mods.js','js/save.js','js/save_v4.js','js/ui_misc.js','js/ui_mobile.js']);

for(const prefix of ['harbor','dune']) {
  test(prefix+' conserves a consenting public grant and its independent private contribution policy',async function ({page},info) {
    await startAuthority(page,info,prefix);
    const result=await page.evaluate(function (prefix) {
      const s=FB.state,H=FB.homeAuthority,bm=FB.campaignBookmark(s),rid=bm.realms.find(function (r) {return r.mobile;}).id;
      const home=prefix==='harbor'?'harbor_upland':'dune_gate',c=FB.bookmarkActor(s,prefix+'_home_ruler');
      const publicBefore=FB.treasuryAvailable(s,home),targetBefore=FB.treasuryAvailable(s,rid),privateBefore=s.player.gold;
      const inventory=JSON.stringify([FB.mobile.row(s,rid),FB.mobile.host(s,rid),s.owner,s.holder]);
      const publicReview=H.fundingQuote(s,{source:{kind:'public',realmId:home},recipientRealmId:rid,amount:2,characterId:c.id});
      const publicPaid=H.fund(s,publicReview),replay=H.fund(s,publicReview);
      const afterPublic=[FB.treasuryAvailable(s,home),FB.treasuryAvailable(s,rid),s.player.gold];
      const privateReview=H.fundingQuote(s,{source:{kind:'private',characterId:s.player.charId},recipientRealmId:rid,amount:3,characterId:s.player.charId});
      const privatePaid=H.fund(s,privateReview);
      return {publicPaid:publicPaid,replay:replay,publicBalance:afterPublic[0]===publicBefore-2,
        targetBalance:afterPublic[1]===targetBefore+2,noPrivateDebit:afterPublic[2]===privateBefore,
        privatePaid:privatePaid,privateBalance:s.player.gold===privateBefore-(privatePaid?3:0),
        finalBalance:FB.treasuryAvailable(s,rid)===targetBefore+2+(privatePaid?3:0),
        inventory:inventory===JSON.stringify([FB.mobile.row(s,rid),FB.mobile.host(s,rid),s.owner,s.holder]),
        revision:s.treasuryAccounting.fundingRevision};
    },prefix);
    expect(result).toEqual({publicPaid:true,replay:false,publicBalance:true,targetBalance:true,noPrivateDebit:true,
      privatePaid:prefix==='harbor',privateBalance:true,finalBalance:true,inventory:true,revision:prefix==='harbor'?2:1});
  });
  test(prefix+' adopted home office cannot describe private money as a public grant',async function ({page},info) {
    await startAuthority(page,info,prefix,true);
    const result=await page.evaluate(function () {
      const s=FB.state,H=FB.homeAuthority,rid=FB.campaignBookmark(s).realms.find(function (r) {return r.mobile;}).id;
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      const q=H.fundingQuote(s,{source:{kind:'public',realmId:'player'},recipientRealmId:rid,amount:1,characterId:s.player.charId});
      return {noAccount:FB.treasuryPublicAccountSnapshot(s,'player')===null,allowed:q.allowed,paid:H.fund(s,q),
        untouched:before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
    });
    expect(result).toEqual({noAccount:true,allowed:false,paid:false,untouched:true});
  });
}

test('stale deputy grants reject atomically after recall, expiry, changed generation, scope or balances',async function ({page},info) {
  await startAuthority(page,info,'harbor');
  const result=await page.evaluate(function () {
    const original=FB.state,H=FB.homeAuthority,c=FB.bookmarkActor(original,'harbor_civil_officer');
    const appointment=original.authority.appointments.find(function (a) {return a.officeId==='harbor_civil_deputy';});
    const input={source:{kind:'public',realmId:'harbor_upland'},recipientRealmId:'harbor_following',amount:1,
      characterId:c.id,appointmentId:appointment.id};
    const changes=[function (s) {s.authority.appointments.find(function (a) {return a.id===appointment.id;}).status='removed';},
      function (s) {s.turn=30;},function (s) {s.authority.appointments.find(function (a) {return a.id===appointment.id;}).appointerGeneration++;},
      function (s) {s.authority.appointments.find(function (a) {return a.id===appointment.id;}).scope={kind:'county',id:'harbor_ridge'};},
      function (s) {s.realms.harbor_upland.treasury.gold=0;},function (s) {s.realms.harbor_following.treasury.gold++;},
      function (s) {s.authority.governments.harbor_following.mobile.command.revision++;},
      function (s) {s.chars[c.id].imprisoned=true;},function (s) {s.chars[c.id].homeProvinceId='harbor_quay';}];
    return changes.map(function (change) {
      const s=JSON.parse(JSON.stringify(original)),q=H.fundingQuote(s,input);change(s);
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      return q.allowed && !H.fund(s,q) && before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual(Array(9).fill(true));
});

test('invalid requests cannot debit, overdraw, use identical accounts or fund a recalled command',async function ({page},info) {
  await startAuthority(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,H=FB.homeAuthority,c=FB.bookmarkActor(s,'harbor_home_ruler');
    const base={source:{kind:'public',realmId:'harbor_upland'},recipientRealmId:'harbor_following',amount:1,characterId:c.id};
    const changes=[function (q) {q.amount=0;},function (q) {q.amount=-1;},function (q) {q.amount=81;},
      function (q) {q.amount=Infinity;},function (q) {q.source.realmId=q.recipientRealmId;},
      function (q) {q.characterId=s.player.charId;},function (q) {q.source={kind:'private',characterId:c.id};},
      function (q) {q.recipientRealmId='missing';},function (q) {q.extra=true;}];
    const results=changes.map(function (change) {
      const input=JSON.parse(JSON.stringify(base));change(input);
      const before=JSON.stringify(s),q=H.fundingQuote(s,input);
      return !q.allowed && !H.fund(s,q) && before===JSON.stringify(s);
    });
    const t=JSON.parse(JSON.stringify(s));t.authority.governments.harbor_following.mobile.command.status='recalled';
    results.push(!H.fundingQuote(t,base).allowed);
    t.authority.governments.harbor_following.mobile.command.status='active';
    t.realms.harbor_upland.treasury.militaryAccrued=t.realms.harbor_upland.treasury.gold;
    results.push(!H.fundingQuote(t,base).allowed);
    return results;
  });
  expect(result).toEqual(Array(11).fill(true));
});

test('matching saves retain exact accounts and consumed review revision without replay or reseeding',async function ({page},info) {
  await startAuthority(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,H=FB.homeAuthority,input={source:{kind:'private',characterId:s.player.charId},
      recipientRealmId:'harbor_following',amount:2,characterId:s.player.charId};
    const q=H.fundingQuote(s,input),paid=H.fund(s,q);
    function facts(s) {return JSON.stringify([s.player.gold,s.realms.harbor_following.treasury,
      s.treasuryAccounting.fundingRevision,s.bookmarkSetup,s.authority.appointments]);}
    const before=facts(s);FB.save.restore(JSON.parse(FB.save.serialize()));
    const restored=before===facts(FB.state),replay=H.fund(FB.state,q);
    const malformed=[-1,0.5,'1',Number.MAX_SAFE_INTEGER+1,null].map(function (revision) {
      const t=JSON.parse(JSON.stringify(FB.state));t.treasuryAccounting.fundingRevision=revision;
      try {FB.save.v4.validatePlatform(t);return false;} catch(error) {return /fundingRevision/.test(error.message);}
    });
    const legacy=JSON.parse(JSON.stringify(FB.state));delete legacy.treasuryAccounting.fundingRevision;
    FB.save.v4.validatePlatform(legacy);
    return {paid:paid,restored:restored,replay:replay,malformed:malformed,legacy:!Object.prototype.hasOwnProperty.call(legacy.treasuryAccounting,'fundingRevision')};
  });
  expect(result).toEqual({paid:true,restored:true,replay:false,malformed:Array(5).fill(true),legacy:true});
});

test('ordinary import rejects malformed funding policy without touching data, campaign, RNG or uid',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function (source) {
    const changes=[function (p) {p.schema=2;},function (p) {p.maximum=0;},function (p) {p.maximum=1000001;},
      function (p) {p.privateContributions='yes';},function (p) {p.publicGrants=false;p.privateContributions=false;},function (p) {p.extra=true;}];
    return changes.map(function (change) {
      const d=JSON.parse(JSON.stringify(source));change(d.bookmarks.harbor_world.realms.find(function (r) {return r.mobile;}).mobile.funding);
      const before=JSON.stringify([FB.state,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter();
      return FB.mods.validate(d).length>0 && before===JSON.stringify([FB.state,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  },examples.harbor);
  expect(result).toEqual(Array(6).fill(true));
});

test('funding review names the private purse and retains inputs, scroll and focus after Back',async function ({page},info) {
  await startAuthority(page,info,'harbor');
  await page.evaluate(function () {FB.ui.showMobileConfederation('harbor_following');});
  await page.locator('#mobile-funding').fill('7');
  await page.locator('#mobile-funding').dispatchEvent('change');
  const button=page.getByRole('button',{name:'Contribute private funds',exact:true});
  await button.scrollIntoViewIfNeeded();
  await button.focus();
  const before=await page.evaluate(function () {return {list:document.getElementById('mobile-list').scrollTop,
    body:document.getElementById('gm-body').scrollTop};});
  expect(before.list+before.body).toBeGreaterThan(0);
  await button.click();
  await expect(page.locator('#gm-body')).toContainText('Your private purse');
  await page.keyboard.press('Escape');
  await expect(page.locator('#mobile-funding')).toHaveValue('7');
  expect(await page.evaluate(function () {return {list:document.getElementById('mobile-list').scrollTop,
    body:document.getElementById('gm-body').scrollTop};})).toEqual(before);
  await expect(button).toBeFocused();
  await button.click();
  const balances=await page.evaluate(function () {FB.state.player.gold++;return [FB.state.player.gold,FB.treasuryAvailable(FB.state,'harbor_following')];});
  await page.locator('#mobile-confirm').click();
  await expect(page.locator('#gm-body')).toContainText('Review the current terms again.');
  expect(await page.evaluate(function () {return [FB.state.player.gold,FB.treasuryAvailable(FB.state,'harbor_following')];})).toEqual(balances);
});
