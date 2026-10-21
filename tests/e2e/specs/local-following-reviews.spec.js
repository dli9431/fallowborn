'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');

dependsOnRuntime(__filename,['index.html','css/style.css','data/actions.js','data/mobile_confederations.js',
  'js/actions.js','js/ui_mobile.js','js/ui_misc.js','js/ui_panels.js','js/ui_modals.js','js/keys.js',
  'js/mobile_confederations.js','js/mobile_command.js','js/mobile_columns.js','js/mobile_camps.js',
  'js/home_authority.js','js/treasury.js','js/authority.js','js/governments.js','js/government_continuity.js',
  'js/government_selection.js','js/government_civic.js','js/civic_transactions.js','js/population.js',
  'js/market.js','js/armies.js','js/mods.js','js/world.js','js/bookmark_setup.js','js/starts.js','js/main.js']);

function firstId(prefix) {return prefix==='harbor' ? 'harbor_following' : 'dune_coalition';}
function secondId(prefix) {return prefix+'_second_following';}
function choice(page,rid) {return page.locator('[data-mobile-following="'+rid+'"]');}
function action(page,label) {return page.locator('#mobile-list').getByRole('button',{name:label});}
function back(page) {return page.locator('.gm-footer').getByRole('button',{name:'Back',exact:true}).click();}
function close(page) {return page.locator('.gm-footer').getByRole('button',{name:'Close',exact:true}).click();}
async function deed(page) {
  await page.evaluate(function () {FB.ui._shared.markActionsDirty();FB.ui._shared.renderActions();});
  await page.locator('[data-action-id="mobile_coalition"]').click();
}
async function start(page,info,prefix,home) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/local-following-reviews-'+prefix+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (prefix) {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];},prefix);
  if (!home) {await beginBookmark(page,info,prefix+'_world',prefix+'_household');return;}
  const code=await page.evaluate(function (prefix) {
    const sc=FBDATA.startScenarios.find(function (sc) {return sc.id===prefix+'_home_start';});
    return 'FOLLOWINGREVIEW-'+prefix+'_world-'+sc.id+'-'+sc.fixedProvinceId+'-'+sc.sex+'-'+sc.characterName.replace(/ /g,'_')+'-standard';
  },prefix);
  const full=page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(code);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () {FB.game.setPaused(true);FB.game.uiPrefs.hideTips=true;});
}
async function accounts(page,prefix) {
  return page.evaluate(function (prefix) {
    const s=FB.state;
    return [s.player.gold,FB.treasuryAvailable(s,'player'),FB.treasuryAvailable(s,prefix==='harbor'?'harbor_following':'dune_coalition'),
      FB.treasuryAvailable(s,prefix+'_second_following')];
  },prefix);
}
async function localAtHome(page,prefix) {
  await page.evaluate(function (prefix) {
    const s=FB.state;
    [prefix==='harbor'?'harbor_following':'dune_coalition',prefix+'_second_following'].forEach(function (rid) {
      const m=FB.mobile.migration(s,rid),host=FB.mobile.host(s,rid);
      m.at=s.player.provinceId;host.at=m.at;host.from=m.at;host.path=[];host.goal=null;host.moveLeft=0;
    });
  },prefix);
}

for (const prefix of ['harbor','dune']) {
  test(prefix+' actual deed selects both imported commands without authority or side effects',async function ({page},info) {
    await start(page,info,prefix);
    const before=await page.evaluate(function () {return [JSON.stringify(FB.state),FB.getRngState(),FB.getUidCounter()];});
    await deed(page);
    await expect(choice(page,firstId(prefix))).toBeVisible();
    await expect(choice(page,secondId(prefix))).toBeVisible();
    for (const rid of [firstId(prefix),secondId(prefix)]) {
      if (prefix==='dune') await choice(page,rid).press('Enter');
      else await choice(page,rid).click();
      const name=await page.evaluate(function (rid) {return FB.state.realms[rid].name;},rid);
      await expect(page.locator('#mobile-list')).toContainText(name);
      await expect(action(page,'Recruit fighters')).toBeDisabled();
      await expect(action(page,'Accept as the outside court')).toHaveCount(0);
      await back(page);
    }
    expect(await page.evaluate(function () {return [JSON.stringify(FB.state),FB.getRngState(),FB.getUidCounter()];})).toEqual(before);
    await close(page);
    await expect(page.locator('[data-action-id="mobile_coalition"]')).toBeFocused();
  });

  test(prefix+' private funding confirms the chosen recipient and preserves exact conservation',async function ({page},info) {
    await start(page,info,prefix);
    await deed(page);
    await choice(page,secondId(prefix)).click();
    await page.locator('#mobile-funding').fill('7');
    await page.locator('#mobile-funding').dispatchEvent('change');
    const before=await accounts(page,prefix);
    await action(page,'Contribute private funds').click();
    await expect(page.locator('#gm-body')).toContainText(prefix==='harbor'?'Willow Company':'Copper Caravan');
    await expect(page.locator('#gm-body')).toContainText('Your private purse');
    // Reordering live definitions must never change the captured recipient.
    await page.evaluate(function () {
      const table=FB.state.authority.governments,keys=Object.keys(table).reverse(),next={};
      keys.forEach(function (id) {next[id]=table[id];});FB.state.authority.governments=next;
    });
    await page.locator('#mobile-confirm').click();
    await expect(page.locator('#gm-title')).toHaveText('Decision recorded');
    const after=await accounts(page,prefix);
    expect(after).toEqual([before[0]-7,before[1],before[2],before[3]+7]);
    await page.locator('#mobile-continue').click();
    await expect(page.locator('#mobile-funding')).toHaveValue('7');
    await expect(action(page,'Contribute private funds')).toBeFocused();
    await back(page);
    await choice(page,firstId(prefix)).click();
    await expect(action(page,'Contribute private funds')).toHaveCount(prefix==='harbor'?1:0);
  });

  test(prefix+' public grants use the selected command and lawful separate home account',async function ({page},info) {
    await start(page,info,prefix,true);
    await localAtHome(page,prefix);
    await deed(page);
    await choice(page,secondId(prefix)).click();
    await page.locator('#mobile-public-source').selectOption('player');
    await page.locator('#mobile-funding').fill('3');
    await page.locator('#mobile-funding').dispatchEvent('change');
    const before=await accounts(page,prefix);
    await action(page,'Grant public funds').click();
    await expect(page.locator('#gm-body')).toContainText('Public treasury of');
    await page.locator('#mobile-confirm').click();
    await expect(page.locator('#gm-title')).toHaveText('Decision recorded');
    const after=await accounts(page,prefix);
    expect(after).toEqual([before[0],before[1]-3,before[2],before[3]+3]);
  });

  test(prefix+' outside ruler selects the second offer and consents only to its exact payment',async function ({page},info) {
    await start(page,info,prefix,true);
    await localAtHome(page,prefix);
    const offers=await page.evaluate(function (prefix) {
      const s=FB.state,M=FB.mobile;
      return [prefix==='harbor'?'harbor_following':'dune_coalition',prefix+'_second_following'].map(function (rid) {
        const actor={kind:'character',id:M.leader(s,rid).id};
        return M.commit(s,M.review(s,{realmId:rid,action:'offer',actor:actor,
          terms:{kind:'access',partnerId:'player',countyIds:[s.player.provinceId],capacity:40,allowRecruit:false,price:2,duration:20}}));
      });
    },prefix);
    expect(offers).toEqual([true,true]);
    const before=await accounts(page,prefix);
    await deed(page);
    await choice(page,secondId(prefix)).click();
    await action(page,'Accept as the outside court').click();
    await page.locator('#mobile-confirm').click();
    await expect(page.locator('#gm-title')).toHaveText('Decision recorded');
    expect(await accounts(page,prefix)).toEqual([before[0],before[1]+2,before[2],before[3]-2]);
    expect(await page.evaluate(function (prefix) {
      const s=FB.state,M=FB.mobile;
      return [prefix==='harbor'?'harbor_following':'dune_coalition',prefix+'_second_following'].map(function (rid) {
        return M.row(s,rid).agreements.slice(-1)[0].status;
      });
    },prefix)).toEqual(['offered','active']);
  });
}

for (const change of ['moved','removed','replaced','ended']) {
  test('a '+change+' reviewed target cannot receive a gift or silently switch to another following',async function ({page},info) {
    await start(page,info,'harbor');
    await deed(page);
    await choice(page,secondId('harbor')).click();
    await action(page,'Contribute private funds').click();
    await page.evaluate(function (change) {
      const s=FB.state,rid='harbor_second_following',table=s.authority.governments;
      if (change==='moved') FB.mobile.migration(s,rid).at='harbor_ridge';
      if (change==='removed') delete table[rid];
      if (change==='replaced') table[rid]=JSON.parse(JSON.stringify(table[rid]));
      if (change==='ended') s.realms[rid].alive=false;
    },change);
    const before=await page.evaluate(function () {return JSON.stringify(FB.state);});
    await page.locator('#mobile-confirm').click();
    await expect(page.locator('#gm-title')).toHaveText('Terms changed');
    expect(await page.evaluate(function () {return JSON.stringify(FB.state);})).toBe(before);
    await page.locator('#mobile-continue').click();
    if (change!=='replaced') await expect(page.locator('#gm-title')).toHaveText('Following unavailable');
    await back(page);
    await expect(page.locator('#gm-title')).toHaveText('Local followings');
  });
}

test('a moved list target is rejected before opening and the remaining single following opens directly',async function ({page},info) {
  await start(page,info,'harbor');
  await deed(page);
  await page.evaluate(function () {FB.mobile.migration(FB.state,'harbor_second_following').at='harbor_ridge';});
  await choice(page,secondId('harbor')).click();
  await expect(page.locator('#gm-title')).toHaveText('Following unavailable');
  await back(page);
  await close(page);
  await deed(page);
  await expect(page.locator('#mobile-list')).toContainText('Reed Following');
  await expect(page.locator('#mobile-followings')).toHaveCount(0);
  await expect(page.locator('.gm-footer').getByRole('button',{name:'Back',exact:true})).toBeDisabled();
});

test('the locality query preserves unrelated-household and member-principal eligibility without mutation',async function ({page},info) {
  await start(page,info,'dune');
  expect(await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,home=s.player.provinceId,cid=s.player.charId;
    const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const local=M.localRealms(s),first=M.localRealm(s);
    const pure=before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    s.player.provinceId='dune_pass';const away=M.localRealms(s);
    s.player.charId=M.members(s,'dune_second_following')[0].principal.id;
    const principal=M.localRealms(s);s.player.charId=cid;s.player.provinceId=home;
    return {local:local,first:first,pure:pure,away:away,principal:principal};
  })).toEqual({local:['dune_coalition','dune_second_following'],first:'dune_coalition',pure:true,away:[],principal:['dune_second_following']});
});

for (const route of ['Back','Escape','phone Back','phone Escape','phone footer Back']) {
  test(route+' retains selector disclosure, scroll, exact target controls and originating focus',async function ({page},info) {
    await page.setViewportSize(route.indexOf('phone')===0?{width:390,height:600}:{width:1100,height:600});
    await start(page,info,'harbor');
    await deed(page);
    // Bound the content viewport so both real imported rows exercise nonzero
    // scroll at every browser size without adding fake people or actions.
    await page.locator('#mobile-followings').evaluate(function (list) {list.style.maxHeight='90px';list.style.overflowY='auto';});
    const details=page.locator('#mobile-followings .settcard-info').first();
    await details.dispatchEvent('click');
    await choice(page,secondId('harbor')).focus();
    const scroll=await page.locator('#mobile-followings').evaluate(function (list) {list.scrollTop=70;return list.scrollTop;});
    expect(scroll).toBeGreaterThan(0);
    await choice(page,secondId('harbor')).dispatchEvent('click');
    await page.locator('#mobile-funding').fill('6');
    await page.locator('#mobile-funding').dispatchEvent('change');
    const funding=action(page,'Contribute private funds');
    const fundingDetails=funding.locator('..').locator('.settcard-info');
    await fundingDetails.dispatchEvent('click');
    await funding.focus();
    const bodyScroll=await page.locator('#gm-body').evaluate(function (body) {return body.scrollTop;});
    const listScroll=await page.locator('#mobile-list').evaluate(function (list) {return list.scrollTop;});
    await funding.dispatchEvent('click');
    if (route.indexOf('Escape')>=0) await page.keyboard.press('Escape');
    else if (route==='phone Back') await page.evaluate(function () {history.back();});
    else await back(page);
    await expect(page.locator('#mobile-funding')).toHaveValue('6');
    await expect(funding).toBeFocused();
    await expect(fundingDetails).toHaveAttribute('aria-expanded','true');
    expect(await page.locator('#gm-body').evaluate(function (body) {return body.scrollTop;})).toBe(bodyScroll);
    expect(await page.locator('#mobile-list').evaluate(function (list) {return list.scrollTop;})).toBe(listScroll);
    if (route.indexOf('Escape')>=0) await page.keyboard.press('Escape');
    else if (route==='phone Back') await page.evaluate(function () {history.back();});
    else await back(page);
    await expect(page.locator('#gm-title')).toHaveText('Local followings');
    await expect(choice(page,secondId('harbor'))).toBeFocused();
    await expect(page.locator('#mobile-followings .settcard-info').first()).toHaveAttribute('aria-expanded','true');
    await expect.poll(function () {return page.locator('#mobile-followings').evaluate(function (list) {return list.scrollTop;});}).toBe(scroll);
    await choice(page,secondId('harbor')).dispatchEvent('click');
    await action(page,'Contribute private funds').click();
    const before=await accounts(page,'harbor');
    await close(page);
    await expect(page.locator('[data-action-id="mobile_coalition"]')).toBeFocused();
    expect(await accounts(page,'harbor')).toEqual(before);
  });
}

test('a single following stays a root after a recorded gift and rejects its old confirmation',async function ({page},info) {
  await start(page,info,'harbor');
  await page.evaluate(function () {FB.mobile.migration(FB.state,'harbor_second_following').at='harbor_ridge';});
  await deed(page);
  await action(page,'Contribute private funds').click();
  await page.evaluate(function () {window.__followingConfirm=document.getElementById('mobile-confirm').onclick;});
  await page.locator('#mobile-confirm').click();
  const after=await accounts(page,'harbor');
  await page.locator('#mobile-continue').click();
  await expect(page.locator('.gm-footer').getByRole('button',{name:'Back',exact:true})).toBeDisabled();
  await page.evaluate(function () {window.__followingConfirm();});
  await expect(page.locator('#gm-title')).toHaveText('Terms changed');
  expect(await accounts(page,'harbor')).toEqual(after);
});

test('a changed outside offer cannot be accepted through the selected stale confirmation',async function ({page},info) {
  await start(page,info,'harbor',true);
  await localAtHome(page,'harbor');
  expect(await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='harbor_second_following';
    return M.commit(s,M.review(s,{realmId:rid,action:'offer',actor:{kind:'character',id:M.leader(s,rid).id},
      terms:{kind:'access',partnerId:'player',countyIds:[s.player.provinceId],capacity:20,allowRecruit:false,price:2,duration:20}}));
  })).toBe(true);
  await deed(page);
  await choice(page,secondId('harbor')).click();
  await action(page,'Accept as the outside court').click();
  await page.evaluate(function () {FB.mobile.row(FB.state,'harbor_second_following').agreements.slice(-1)[0].price=5;});
  const before=await page.evaluate(function () {return JSON.stringify(FB.state);});
  await page.locator('#mobile-confirm').click();
  await expect(page.locator('#gm-title')).toHaveText('Terms changed');
  expect(await page.evaluate(function () {return JSON.stringify(FB.state);})).toBe(before);
});
