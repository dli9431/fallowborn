'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename,['index.html','data/tournaments.js','js/tournaments.js','js/ui_tournaments.js',
  'js/ui_misc.js','js/ui_modals.js','js/travel.js','js/portrait.js','js/i18n.js','css/style.css']);
const { test, expect } = require('../support/fixture');
const { startGames, bookGames } = require('../support/game/tournaments');

/* A player-hosted edition in the home county: the player is present, so
   attendance actions are available once the edition is marked under way. */
async function runningEntry(page,info,track,annual){
  const ids=await startGames(page,info);
  const id=await bookGames(page,ids,false,annual ? {annual:true,ceiling:100000} : {});
  await page.evaluate(function(args){
    var s=FB.state,T=FB.tournaments,e=T.get(s,args.id);
    if(args.track){
      var q=T.entry(s,args.id,s.player.charId,args.track);
      if(!q.ok)throw new Error(q.reasons.join(' '));
      if(!T.enter(s,q))throw new Error('Entry was refused.');
    }
    e.startTurn=s.turn-1;e.closeTurn=s.turn+6;e.status='running';
  },{id:id,track:track});
  return {ids:ids,id:id};
}
async function scrollBody(page,offset){
  return page.locator('#gm-body').evaluate(function(body,offset){body.scrollTop=offset;return body.scrollTop;},offset);
}

test('entering from the activity review returns to current terms, never the pre-entry sheet',async function({page},info){
  await page.setViewportSize({width:390,height:844});
  const ids=await startGames(page,info),id=await bookGames(page,ids,false);
  await page.evaluate(function(id){FB.ui.showTournament(id);},id);
  await page.locator('#games-activities').click();
  await expect(page.locator('#games-enter-watch')).toBeEnabled();
  await page.locator('#games-enter-watch').click();
  await page.locator('#games-confirm').click();
  await expect(page.locator('#games-activity-return')).toBeVisible();
  await expect(page.locator('#games-enter-watch')).toBeDisabled();
  await page.locator('#games-activity-return').click();
  await expect(page.locator('#gm-body')).toContainText('Primary activity');
  await expect(page.locator('#games-activities')).toHaveCount(0);
  await expect(page.locator('#games-withdraw')).toBeVisible();
  await expect(page.locator('#games-back')).toBeDisabled();
});

test('withdrawal confirmation returns to a refreshed gathering',async function({page},info){
  const r=await runningEntry(page,info,'watch');
  await page.evaluate(function(id){FB.ui.showTournament(id);},r.id);
  await page.locator('#games-withdraw').click();
  await expect(page.locator('#games-confirm')).toContainText('Circuit reputation -1');
  await page.locator('#games-confirm').click();
  await expect(page.locator('#games-confirm')).toHaveCount(0);
  await expect(page.locator('#games-withdraw')).toHaveCount(0);
  expect(await page.evaluate(function(id){return FB.tournaments.participant(FB.tournaments.get(FB.state,id),FB.state.player.charId).status;},r.id)).not.toBe('active');
});

test('rest keeps the gathering scroll position and focus on the acted card',async function({page},info){
  await page.setViewportSize({width:390,height:600});
  const r=await runningEntry(page,info,'archery');
  await page.evaluate(function(id){FB.ui.showTournament(id);},r.id);
  await page.locator('#games-rest').scrollIntoViewIfNeeded();
  const before=await scrollBody(page,await page.locator('#gm-body').evaluate(body=>body.scrollTop));
  expect(before).toBeGreaterThan(0);
  await page.locator('#games-rest').click();
  await expect(page.locator('#games-rest')).toBeDisabled();
  await expect.poll(()=>page.locator('#gm-body').evaluate(body=>body.scrollTop)).toBeGreaterThan(before-3);
  expect(Math.abs(await page.locator('#gm-body').evaluate(body=>body.scrollTop)-before)).toBeLessThanOrEqual(2);
  await expect(page.locator('#games-rest').locator('xpath=ancestor::div[contains(concat(" ",normalize-space(@class)," ")," settcard ")][1]')).toBeFocused();
});

test('the gift shows its funding blocker and uses available coin',async function({page},info){
  const r=await runningEntry(page,info,'watch');
  await page.evaluate(function(id){FB.state.player.gold=4;FB.state.player.militaryAccrued=0;FB.ui.showTournament(id);},r.id);
  await expect(page.locator('#games-gift')).toBeDisabled();
  await expect(page.locator('#games-gift')).toContainText('Requires');
  await page.evaluate(function(id){FB.state.player.gold=50;FB.state.player.militaryAccrued=48;FB.ui.showTournament(id);},r.id);
  await expect(page.locator('#games-gift')).toBeDisabled();
});

test('round tactics and competition entries show injury risk on their face',async function({page},info){
  const r=await runningEntry(page,info,'wrestling');
  await page.evaluate(function(id){FB.ui.showTournament(id);},r.id);
  await expect(page.locator('#games-field-wrestling')).toContainText('possibly fatal');
  await page.locator('#games-round').click();
  const tactic=page.locator('#games-tactic-balanced');
  await expect(tactic).toBeEnabled();
  await expect(tactic).toContainText('Injury');
  await expect(tactic).toContainText('possibly fatal');
});

test('host and local guests are shown with portraits',async function({page},info){
  const ids=await startGames(page,info),id=await bookGames(page,ids,false);
  await page.evaluate(function(id){FB.ui.showTournament(id);},id);
  await expect(page.locator('#gm-body .review-person canvas.pface').first()).toBeVisible();
  const guests=await page.evaluate(function(id){return (FB.tournaments.get(FB.state,id).guests||[]).length;},id);
  expect(await page.locator('#gm-body .review-person').count()).toBe(1+guests);
});

test('contest fields use touch disclosure on compact layouts and survive Back',async function({page},info){
  await page.setViewportSize({width:390,height:844});
  const ids=await startGames(page,info),id=await bookGames(page,ids,false);
  await page.evaluate(function(id){FB.ui.showTournament(id);},id);
  const toggle=page.locator('#games-field-archery .settcard-info');
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.locator('#games-field-archery-details')).toBeVisible();
  await expect(page.locator('#games-field-archery-details')).toContainText('Eight named entrants');
  await page.locator('#games-activities').click();
  await page.locator('#games-back').click();
  await expect(page.locator('#games-field-archery-details')).toBeVisible();
  await expect(page.locator('#games-field-archery .settcard-info')).toHaveAttribute('aria-expanded','true');
});

test('contest fields use the side tooltip on roomy pointer layouts',async function({page},info){
  await page.setViewportSize({width:1280,height:800});
  const ids=await startGames(page,info),id=await bookGames(page,ids,false);
  await page.evaluate(function(id){FB.ui.showTournament(id);},id);
  await expect(page.locator('#games-field-archery .settcard-info')).toBeHidden();
  await page.locator('#games-field-archery h4').hover();
  await expect(page.locator('#tooltip')).toBeVisible();
  await expect(page.locator('#tooltip')).toContainText('Eight named entrants');
  await expect(page.locator('#games-field-archery-details')).toBeHidden();
});

test('funding replaces the hosting form with the announced edition',async function({page},info){
  await startGames(page,info);
  await page.evaluate(function(){FB.ui.showHostGames();});
  await expect(page.locator('#games-ceiling-row')).toBeHidden();
  await page.locator('#games-annual').check();
  await expect(page.locator('#games-ceiling-row')).toBeVisible();
  await page.locator('#games-annual').uncheck();
  await page.locator('#games-review').click();
  await page.locator('#games-fund').click();
  await expect(page.locator('#gm-body')).toContainText('Funding paid');
  await expect(page.locator('#games-venue')).toHaveCount(0);
  await expect(page.locator('#games-back')).toBeDisabled();
  expect(await page.evaluate(()=>FB.tournaments.active(FB.state).length)).toBe(1);
});

test('stopping annual recurrence requires confirmation and refreshes the calendar',async function({page},info){
  await runningEntry(page,info,null,true);
  await page.evaluate(function(){FB.ui.showGames('bookings');});
  await page.locator('#games-stop').click();
  expect(await page.evaluate(()=>FB.state.tournaments.annual.length)).toBe(1);
  await expect(page.locator('#games-confirm')).toContainText('announced edition');
  await page.locator('#games-confirm').click();
  await expect(page.locator('#games-filter')).toHaveValue('bookings');
  await expect(page.locator('#games-stop')).toHaveCount(0);
  expect(await page.evaluate(()=>FB.state.tournaments.annual.length)).toBe(0);
});

test('a map cluster subset survives filter changes until the full calendar is chosen',async function({page},info){
  const ids=await startGames(page,info),id=await bookGames(page,ids,false);
  await page.evaluate(function(id){FB.ui.showGames('upcoming',false,[id]);},id);
  await page.locator('#games-filter').selectOption('bookings');
  await expect(page.locator('#games-all')).toBeVisible();
  await expect(page.locator('#games-'+id)).toBeVisible();
  await page.locator('#games-all').click();
  await expect(page.locator('#games-all')).toHaveCount(0);
  await expect(page.locator('#games-filter')).toHaveValue('bookings');
});
