'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename,['index.html','data/actions.js','data/tournaments.js','js/tournaments.js','js/ui_tournaments.js',
  'js/ui_misc.js','js/ui_modals.js','js/ui_panels.js','js/actions.js','js/mapview.js','js/i18n.js',
  'js/world.js','js/lordships.js','js/save.js']);
const { test, expect } = require('../support/fixture');
const { startGames, bookGames } = require('../support/game/tournaments');

for (const distribution of ['standard','crazygames']) {
  test('a Baron\'s renamed venue survives loading throughout hosting in '+distribution, async function ({page},info) {
    if (distribution === 'crazygames') await page.addInitScript(function () {
      window.FB_DISTRIBUTION = 'crazygames'; window.FB_CRAZYGAMES_STORAGE = 'localstorage';
    });
    await page.setViewportSize({width:390,height:844});
    const ids = await startGames(page,info);
    await page.evaluate(function (ids) {
      var s = FB.state, p = s.player;
      p.tier = 3; p.provs = []; p.homeSettlement = 1; p.liege = ids.hostRealm;
      s.chars[p.charId].station = 3;
      s.realms.player.alive = false;
      s.owner[ids.home] = ids.hostRealm; s.holder[ids.home] = ids.hostRealm;
      FB.invalidateRealmCache();
      if (!FB.assignSettlementLordship(s,ids.home,1,p.charId)) throw new Error('Barony was not assigned.');
      FB.ui.showSettlement(ids.home,1);
    },ids);
    await page.locator('#settlement-rename').click();
    await page.locator('#settlement-name').fill('Houlgate');
    await page.locator('#settlement-name').press('Enter');
    await expect(page.locator('#gm-title')).toContainText('Houlgate');
    await page.evaluate(function (ids) {
      FB.save.restore(JSON.parse(FB.save.serialize()));
      FB.game.setPaused(true); FB.ui.showSettlement(ids.home,1);
    },ids);
    await page.locator('#settlement-host-games').click();
    await expect(page.locator('#games-venue option:checked')).toHaveText('Houlgate');
    await page.locator('#games-review').click();
    await expect(page.locator('#gm-body')).toContainText('Houlgate');
    await page.locator('#games-fund').click();
    await expect(page.locator('#gm-title')).toHaveText('Houlgate');
    const booked = await page.evaluate(function () {
      var s = FB.state, e = FB.tournaments.active(s)[0];
      var announcement = s.log.filter(function (entry) {
        return entry.msg && entry.msg.key === 'news.tournament.announced';
      }).pop();
      var preparation = s.eventQueue.filter(function (entry) {
        return entry.id === 'scheduled_games_preparation' && entry.ctx.tournamentId === e.id;
      })[0];
      return {id:e.id,venue:announcement.msg.params.venue,contextVenue:preparation.ctx.venue,slot:e.settlement};
    });
    expect(booked).toMatchObject({venue:'Houlgate',contextVenue:'Houlgate',slot:1});
    await page.evaluate(function () { FB.ui.showGames('bookings'); });
    await expect(page.locator('#games-'+booked.id)).toContainText('Houlgate');
    await page.locator('#games-'+booked.id).click();
    await expect(page.locator('#gm-title')).toHaveText('Houlgate');
    await page.evaluate(function (ids) {
      if (!FB.renameSettlement(FB.state,ids.home,1,'New Haven').ok) throw new Error('Second rename was refused.');
      FB.ui.showGames('bookings');
    },ids);
    await expect(page.locator('#games-'+booked.id)).toContainText('New Haven');
    await page.locator('#games-'+booked.id).click();
    await expect(page.locator('#gm-title')).toHaveText('New Haven');
    const cancelled = await page.evaluate(function (id) {
      var s = FB.state, ok = FB.tournaments.cancel(s,id,s.player.charId);
      var notice = s.log.filter(function (entry) {
        return entry.msg && entry.msg.key === 'news.tournament.cancelled';
      }).pop();
      return {ok:ok,venue:notice.msg.params.venue};
    },booked.id);
    expect(cancelled).toEqual({ok:true,venue:'New Haven'});
  });
}

for(const viewport of [{width:1280,height:800},{width:390,height:844}]){
  test('calendar retains filter, focus and scroll at '+viewport.width+' pixels',async function({page},info){
    await page.setViewportSize(viewport);
    const ids=await startGames(page,info),id=await bookGames(page,ids,false);
    await page.evaluate(function(){FB.ui.showGames('bookings');});
    await expect(page.locator('#games-filter')).toHaveValue('bookings');
    await page.locator('#games-'+id).focus();
    const scroll=await page.locator('#gm-body').evaluate(function(body){body.scrollTop=30;return body.scrollTop;});
    await page.locator('#games-'+id).press('Enter');
    await expect(page.locator('#gm-body')).toContainText('Funding paid');
    await page.locator('#games-back').click();
    await expect(page.locator('#games-filter')).toHaveValue('bookings');
    await expect(page.locator('#games-'+id)).toBeFocused();
    expect(await page.locator('#gm-body').evaluate(body=>body.scrollTop)).toBe(scroll);
    expect(await page.locator('#gm-body').evaluate(body=>body.scrollWidth<=body.clientWidth+1)).toBe(true);
  });
}

test('hosting reviews give allocations and reject a stale treasury without payment',async function({page},info){
  await startGames(page,info);
  await page.evaluate(function(){FB.ui.showHostGames();});
  await expect(page.getByLabel('Venue',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Scale',{exact:true})).toBeVisible();
  await page.locator('#games-review').click();
  await expect(page.locator('#gm-body')).toContainText('Reference income');
  await expect(page.locator('#gm-body')).toContainText('Preparation and hospitality');
  await expect(page.locator('#gm-body')).toContainText('Treasury remaining');
  const gold=await page.evaluate(function(){FB.state.player.gold++;return FB.state.player.gold;});
  await page.locator('#games-fund').click();
  expect(await page.evaluate(()=>FB.tournaments.active(FB.state).length)).toBe(0);
  expect(await page.evaluate(()=>FB.state.player.gold)).toBe(gold);
  await page.locator('#games-back').click();
  await expect(page.getByLabel('Venue',{exact:true})).toBeVisible();
});

test('Events is an independent keyboard-accessible overlay with exact settlement anchors',async function({page},info){
  const ids=await startGames(page,info),id=await bookGames(page,ids,false);
  const before=await page.evaluate(function(id){
    var M=FB.map,e=FB.tournaments.get(FB.state,id),site=FB.world.sitesByProv[e.provinceId].list[e.settlement];
    M.zoom=12;M.viewX=site.x-M.canvas.width/24;M.viewY=site.y-M.canvas.height/24;
    M.marketGood=Object.keys(FBDATA.marketGoods)[0];M.dejureBorderMode='kingdom';M.request();
    return {market:M.marketGood,border:M.dejureBorderMode};
  },id);
  await page.locator('#btn-events').focus();await page.locator('#btn-events').press('Enter');
  await expect(page.locator('#btn-events')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#btn-events')).toHaveClass(/(^|\s)on(\s|$)/);
  await page.waitForFunction(()=>FB.map.visibleEvents.length>0);
  const after=await page.evaluate(function(id){
    var M=FB.map,e=FB.tournaments.get(FB.state,id),site=FB.world.sitesByProv[e.provinceId].list[e.settlement],marker=M.visibleEvents.filter(v=>v.ids.indexOf(id)>=0)[0];
    return {market:M.marketGood,border:M.dejureBorderMode,dx:marker.x-(site.x-M.viewX)*M.zoom,dy:marker.y-(site.y-M.viewY)*M.zoom};
  },id);
  expect(after.market).toBe(before.market);expect(after.border).toBe(before.border);expect(after.dx).toBeCloseTo(0);expect(after.dy).toBeCloseTo(0);
});

for(const distribution of ['standard','crazygames']){
  test('scheduled scripts and English fallback are available in '+distribution,async function({page},info){
    if(distribution==='crazygames')await page.addInitScript(function(){window.FB_DISTRIBUTION='crazygames';window.FB_CRAZYGAMES_STORAGE='localstorage';});
    await startGames(page,info);
    const r=await page.evaluate(function(){
      return {data:!!FBDATA.tournaments,engine:!!FB.tournaments,ui:typeof FB.ui.showGames,
        label:FB.dataText(FB.state,FB.state.player.charId,'tournament_tracks','archery',FBDATA.tournaments.tracks.archery,'name',{}),
        scripts:Array.from(document.scripts).filter(s=>/tournaments\.js/.test(s.src)).map(s=>new URL(s.src).pathname.split('/').pop()),
        module:Array.from(document.scripts).some(s=>/tournaments\.js/.test(s.src)&&s.type==='module')};
    });
    expect(r.data).toBe(true);expect(r.engine).toBe(true);expect(r.ui).toBe('function');expect(r.label).toBe('Open archery');
    expect(r.scripts).toEqual(['tournaments.js','tournaments.js','ui_tournaments.js']);expect(r.module).toBe(false);
  });
}


test('distant overlapping event markers cluster and open the matching calendar subset',async function({page},info){
  const ids=await startGames(page,info),id=await bookGames(page,ids,false);
  await page.evaluate(function(id){
    var s=FB.state,M=FB.map,e=FB.tournaments.get(s,id),site=FB.world.sitesByProv[e.provinceId].list[e.settlement];
    // Deliberately overlapping presentation records isolate marker clustering from booking limits.
    var overlap=JSON.parse(JSON.stringify(e));overlap.id='overlapping_marker';s.tournaments.events.push(overlap);
    M.zoom=1;M.viewX=site.x-M.canvas.width/2;M.viewY=site.y-M.canvas.height/2;M.eventsOverlay=true;M.request();
  },id);
  await page.waitForFunction(()=>FB.map.visibleEvents.some(marker=>marker.ids.length===2));
  const grouped=await page.evaluate(function(){var marker=FB.map.visibleEvents.filter(row=>row.ids.length===2)[0];FB.ui.showGames('upcoming',false,marker.ids);return marker.ids;});
  expect(grouped).toContain(id);expect(grouped).toContain('overlapping_marker');
  await expect(page.locator('#games-'+id)).toBeVisible();await expect(page.locator('#games-overlapping_marker')).toBeVisible();
});
