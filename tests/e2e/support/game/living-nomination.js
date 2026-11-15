'use strict';
const path = require('path');
const {expect} = require('../fixture');
const {openGame, prepareGameContent} = require('./navigation');
const {beginBookmarkFromTitle} = require('./bookmark-acceptance');
const consultation = require('../../fixtures/living-nomination/consultation.json');
const river = require('../../fixtures/living-nomination/river-consultation.json');

async function start(page, info, kind, livingOption) {
  await openGame(page, info);
  const mod = JSON.parse(JSON.stringify(kind === 'consultation' ? consultation : river));
  if (livingOption !== undefined) {
    const procedure=mod.governmentForms.river_consultation_demo.selectionProfile.procedure;
    if (livingOption === 'omit') delete procedure.livingNomination;
    else procedure.livingNomination=livingOption;
  }
  expect(await page.evaluate(function (mod) { return FB.mods.validate(mod); }, mod)).toEqual([]);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(livingOption !== undefined ?
    {name:'river-control.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mod))} :
    path.resolve(__dirname,'../../fixtures/living-nomination/' + (kind === 'consultation' ? 'consultation.json' : 'river-consultation.json')));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}), page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await beginBookmarkFromTitle(page, kind === 'consultation' ? 'consultation_world' : 'river_consultation_world',
    kind === 'consultation' ? 'consultation_farmer' : 'river_farmer_demo');
  await page.evaluate(function (kind) {
    const s = FB.state, S = FB.governmentSelection;
    const rid = kind === 'consultation' ? 'consultation_court' : 'river_court_demo';
    const home = s.realms[rid].capital;
    FB.realmHeldCounties(s,rid).forEach(function (pid) { FB.setCountySupport(s,pid,40); });
    let c;
    if (kind === 'river') c = s.chars[s.localInstitutions.river_council_demo.representativeId];
    else {
      c = FB.makeCharacter(s,{name:'Nadir',dyn:'Independent House',sex:'m',born:s.date.year-30,
        culture:'arabic',religion:'consultation_faith_demo',station:2,role:'notable',quality:1,traitsN:0});
      c.homeProvinceId = home; c.gold = 29;
    }
    window.livingTest = {
      rid:rid, cid:c.id,
      request:function (cid, memberId) {
        const m = S.constituency(FB.state,rid).find(function (row) { return !memberId || row.id === memberId; });
        return {action:'nominate',memberId:m.id,characterId:cid || this.cid,
          actor:m.currentPrincipal && m.currentPrincipal.kind === 'character' ?
            {kind:'character',id:m.currentPrincipal.id} : {kind:'constituency',realmId:rid,id:m.id}};
      },
      snapshot:function () {
        return {state:FB.state,data:FBDATA,world:FB.world,active:FB.activeBookmark,
          bytes:JSON.stringify([FB.state,FBDATA,FB.englishMessages(),FB.stories.list(),
            FB.world && [FB.world.provs,FB.world.sites,FB.world.sitesByProv,FB.world.sitesRender],
            FB.mods.sig(),localStorage,FB.getRngState() >>> 0,FB.getUidCounter()])};
      },
      same:function (before) {
        const after = this.snapshot();
        return before.state === after.state && before.data === after.data && before.world === after.world &&
          before.active === after.active && before.bytes === after.bytes;
      },
      protectedFacts:function () {
        const s = FB.state;
        return JSON.stringify([s.owner,s.holder,s.player.gold,s.player.holdings,s.settlementLordships,
          s.realms[rid].treasury,s.religiousHeads,s.authority.appointments,s.authority.rights,s.authority.contracts]);
      },
      admit:function () { return S.apply(FB.state,S.quote(FB.state,rid,this.request())); },
      id:function () { return FB.state.chars[this.cid].royalLine.memberId; },
      roundTrip:function () {
        const before = JSON.parse(FB.save.serialize()), live = FB.state;
        const selection = JSON.stringify(S.state(live,rid));
        FB.save.restore(before);
        const after = JSON.parse(FB.save.serialize());
        return {selection:selection === JSON.stringify(S.state(FB.state,rid)),
          tree:JSON.stringify(before.state.realms[rid].succession) === JSON.stringify(after.state.realms[rid].succession),
          person:JSON.stringify(before.state.chars[this.cid]) === JSON.stringify(after.state.chars[this.cid]),
          uid:before.uid === after.uid,rng:(before.rng >>> 0) === (after.rng >>> 0),
          signature:before.mods === after.mods && !FB.save.otherWorld(before)};
      }
    };
  },kind);
}

module.exports = {start, river};
