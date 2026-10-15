'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark, advanceBookmark, restoreBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['index.html','js/mods.js','js/world.js','js/stories.js','js/story_campaign.js',
  'js/story_government_selection.js','js/model.js','js/main.js','js/save.js','js/save_v4.js',
  'js/government_civic.js','js/civic_validation.js','js/civic_transactions.js','js/ui_civic.js',
  'js/government_support.js','js/mobile_confederations.js','js/treasury.js','js/governments.js',
  'data/cultures.js','data/eras.js','data/civic_profiles.js','data/mobile_confederations.js','data/starts.js']);

async function beginExample(page, info, prefix) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/' + prefix + '-mod.json'));
  await page.locator('#mod-apply').click();
  await page.waitForFunction(function (prefix) {
    return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix + '_world'];
  }, prefix);
  await beginBookmark(page, info, prefix + '_world', prefix + '_household');
  const identities = await page.evaluate(function () {
    const s = FB.state, c = s.chars[s.player.charId];
    return { counties:FB.world.provs.length, home:s.player.provinceId, culture:c.culture, faith:c.religion };
  });
  expect(identities).toEqual({ counties:3, home:prefix === 'harbor' ? 'harbor_quay' : 'dune_well',
    culture:prefix + '_folk', faith:prefix + '_belief' });
}

async function save(page) { return page.evaluate(function () { return FB.save.serialize(); }); }
async function civicFacts(page) {
  return page.evaluate(function () {
    const s = FB.state;
    return JSON.stringify({ civic:FB.civicGovernment.row(s,'harbor_commune'),
      property:[s.owner,s.holder,s.settlementLordships,s.player.provs], gold:s.player.gold, uid:FB.getUidCounter() });
  });
}

test('Lark Harbor imports, nominates, restores a pending election, serves and resigns', async function ({ page }, info) {
  await beginExample(page, info, 'harbor');
  // The incumbent resigns through the same reviewed transaction as an AI actor.
  // No campaign field, skill, date or office is assigned by this journey.
  const retired = await page.evaluate(function () {
    const s = FB.state, V = FB.civicGovernment, o = V.row(s,'harbor_commune').offices[0];
    const result = V.officeApply(s,V.officeQuote(s,'harbor_commune',o.id,'resign',{characterId:o.incumbentId}));
    FB.ui.showCivicGovernment('harbor_commune'); return !!result;
  });
  expect(retired).toBe(true);
  await page.evaluate(function () { FB.ui.showStorySheet('harbor_candidacy'); });
  await page.locator('[data-story-choice="harbor_stand"]').click();
  await page.locator('#gm-story-confirm').click(); await page.locator('#gm-story-continue').click();
  const pending = await save(page), before = await civicFacts(page);
  await restoreBookmark(page,pending);
  expect(await civicFacts(page)).toBe(before);
  await page.evaluate(function () { FB.ui.showCivicGovernment('harbor_commune'); });
  await page.getByRole('button',{name:/Review selection: Quay magistrate/}).click();
  await page.locator('#civic-confirm').click(); await page.locator('#civic-continue').click();
  expect(await page.evaluate(function () {
    return FB.civicGovernment.row(FB.state,'harbor_commune').offices[0].incumbentId === FB.state.player.charId;
  })).toBe(true);
  await advanceBookmark(page,3);
  const serving = await save(page), held = await civicFacts(page);
  await restoreBookmark(page,serving); expect(await civicFacts(page)).toBe(held);
  await page.evaluate(function () { FB.ui.showCivicGovernment('harbor_commune'); });
  await page.getByRole('button',{name:/Resign: Quay magistrate/}).click();
  await page.locator('#civic-confirm').click();
  const finished = await save(page), ended = await civicFacts(page);
  await restoreBookmark(page,finished); expect(await civicFacts(page)).toBe(ended);
  expect(await page.evaluate(function () {
    return { incumbent:FB.civicGovernment.row(FB.state,'harbor_commune').offices[0].incumbentId,
      privateLand:FB.state.player.provs.length, owner:FB.state.owner.harbor_quay };
  })).toEqual({incumbent:null,privateLand:0,owner:'harbor_commune'});
});

test('Glass Road negotiates paid access and resolves its campaign through natural days', async function ({ page }, info) {
  await beginExample(page,info,'dune');
  const pending = await save(page);
  await page.evaluate(function () { FB.ui.showStorySheet('dune_candidacy'); });
  await page.locator('[data-story-choice="dune_decline"]').click();
  await page.locator('#gm-story-confirm').click(); await page.locator('#gm-story-continue').click();
  const declined = await save(page); await restoreBookmark(page,declined);
  expect(await page.evaluate(function () { return FB.state.stories.dune_candidacy.result; })).toBe('declined');
  const offered = await page.evaluate(function () {
    const s = FB.state, M = FB.mobile, rid = 'dune_coalition', profile = M.profile(s,rid);
    function act(action,terms,actor) { return M.commit(s,M.review(s,{realmId:rid,action:action,terms:terms,actor:actor || {kind:'realm',id:rid}})); }
    const terms = {kind:'access',partnerId:'dune_oasis',countyIds:['dune_well'],capacity:100,allowRecruit:true,price:profile.accessPrice,duration:profile.accessDays};
    if (!act('propose',{operation:'agreement',proposal:terms})) return false;
    if (!M.members(s,rid).every(function (m) { return !!act('assent',{assent:true},m.principal); })) return false;
    return !!act('offer',terms);
  });
  expect(offered).toBe(true);
  const negotiated = await save(page);
  await restoreBookmark(page,negotiated);
  expect(await page.evaluate(function () {
    const s = FB.state, M = FB.mobile, rid = 'dune_coalition', id = M.row(s,rid).agreements[0].id;
    const total = FB.treasuryAvailable(s,rid) + FB.treasuryAvailable(s,'dune_oasis');
    const review = M.review(s,{realmId:rid,action:'accept',terms:{agreementId:id},actor:{kind:'realm',id:'dune_oasis'}});
    const chief = FB.civicGovernment.chief(s,'dune_oasis'), diplomacy = chief.skills.dip;
    chief.skills.dip++;
    const stale = !M.commit(s,review);
    chief.skills.dip = diplomacy;
    const support = FB.countySupportBase(s,'dune_well');
    FB.setCountySupport(s,'dune_well',-100);
    const denied = M.review(s,{realmId:rid,action:'accept',terms:{agreementId:id},actor:{kind:'realm',id:'dune_oasis'}});
    const before = JSON.stringify(s), refused = !denied.review.allowed && !M.commit(s,denied) && before === JSON.stringify(s);
    FB.setCountySupport(s,'dune_well',support);
    const fresh = M.review(s,{realmId:rid,action:'accept',terms:{agreementId:id},actor:{kind:'realm',id:'dune_oasis'}});
    return {stale:stale,refused:refused,accepted:!!M.commit(s,fresh),repeated:!!M.commit(s,fresh),
      conserved:total === FB.treasuryAvailable(s,rid) + FB.treasuryAvailable(s,'dune_oasis')};
  })).toEqual({stale:true,refused:true,accepted:true,repeated:false,conserved:true});
  await advanceBookmark(page,1);
  const intermediate = await save(page);
  async function outcome() {
    return page.evaluate(function () {
      const s = FB.state;
      return {story:s.stories.dune_settlement,mobile:FB.mobile.row(s,'dune_coalition'),date:s.date,turn:s.turn,owner:s.owner,
        rng:FB.getRngState() >>> 0,uid:FB.getUidCounter()};
    });
  }
  await advanceBookmark(page,16); const first = await outcome();
  expect(first.story.phase).toBe('resolved');
  expect(['failed','diverted','interrupted']).toContain(first.story.result);
  expect(first.story.settlementApplied).toBe(false);
  await restoreBookmark(page,intermediate); await advanceBookmark(page,16);
  expect(await outcome()).toEqual(first);
  const finished = await save(page); await restoreBookmark(page,finished);
  expect(await outcome()).toEqual(first);
  // Restoring the opening also restores the pending opportunity, without replaying its later agreement.
  await restoreBookmark(page,pending);
  expect(await page.evaluate(function () { return FB.state.stories.dune_settlement.phase; })).toBe('pending');
});

for (const prefix of ['harbor','dune']) {
  test(prefix + ' candidacy rejects stale terms, repeats and malformed definitions', async function ({page},info) {
    await beginExample(page,info,prefix);
    const result = await page.evaluate(function (prefix) {
      const s = FB.state, id = prefix + '_candidacy', definition = FBDATA.storyInstances[id];
      const V = FB.civicGovernment, o = V.row(s,definition.realmId).offices[0];
      V.officeApply(s,V.officeQuote(s,definition.realmId,o.id,'resign',{characterId:o.incumbentId}));
      const quote = FB.stories.quote(s,id,prefix + '_stand');
      FB.treasuryTransfer(s,'player',null,1);
      const before = JSON.stringify(s);
      const stale = FB.stories.apply(s,id,prefix + '_stand',quote);
      const pure = before === JSON.stringify(s), gold = s.player.gold;
      const fresh = FB.stories.quote(s,id,prefix + '_stand');
      const accepted = FB.stories.apply(s,id,prefix + '_stand',fresh);
      const repeated = FB.stories.apply(s,id,prefix + '_stand',fresh);
      const malformed = JSON.parse(JSON.stringify(definition)); malformed.officeId = 'missing_office';
      const wrongOffice = FB.mods.validate({storyInstances:{[id]:malformed}}).length > 0;
      malformed.officeId = definition.officeId; malformed.choices.stand.operation = 'write_state';
      const operation = FB.mods.validate({storyInstances:{[id]:malformed}}).length > 0;
      const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
      return {stale:stale,pure:pure,accepted:accepted,repeated:repeated,paid:gold - s.player.gold,
        cost:fresh.review.cost,wrongOffice:wrongOffice,operation:operation,
        restored:JSON.stringify(FB.state.stories[id]) === JSON.stringify(saved.state.stories[id])};
    },prefix);
    expect(result).toMatchObject({stale:false,pure:true,accepted:true,repeated:false,wrongOffice:true,operation:true,restored:true});
    expect(result.paid).toBe(result.cost);
    expect(result.cost).toBe(prefix === 'harbor' ? 1 : 3);
  });
}
