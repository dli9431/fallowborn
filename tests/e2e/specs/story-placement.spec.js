'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {beginBookmark,beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');
const {storySection,revealStoryCard,openStoryAffairs} = require('../support/game/story-placement');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/actions.js','js/actions.js','js/stories.js','js/story_opening_goals.js',
  'js/story_household.js','js/ui_panels.js','js/ui_misc.js','js/mods.js','css/style.css',
  'data/bookmark_634.js','data/starts_634_damascus.js','data/story_households_634_damascus.js',
  'data/bookmark_1096.js','data/bookmark_1096_mainz.js','data/bookmark_1096_western_expeditions.js',
  'tests/e2e/support/game/story-placement.js',
  'tests/e2e/fixtures/authoring/story-placement-family.json',
  'tests/e2e/fixtures/authoring/story-placement-ledger.json'
]);

const TRACK = 'damascus_household_track_634', GOALS = 'opening_damascus_634';

async function beginDamascus(page,info) {
  await beginBookmark(page,info,'634','damascus_household_634');
  await page.locator('#sidetabs [data-tab="actions"]').click();
}

test('the shipped placement table validates, covers every story type and retires the old renderer',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const table = FBDATA.storyPlacements, sections = FBDATA.deedSections;
    const bad = [
      {affairs:table.affairs,types:{household_track:{section:'focus'}}},
      {affairs:table.affairs,types:{household_track:{section:'work',actionTypeSection:'work'}}},
      {affairs:table.affairs,types:{no_such_type:{section:'work'}}},
      {affairs:Object.assign({followStoryline:true},table.affairs),types:{}},
      {affairs:table.affairs,types:{household_track:{section:'work',run:'code'}}},
      {affairs:table.affairs,types:{household_track:{section:'work',fallback:['work']}}},
      {affairs:table.affairs,types:{},stories:{'Bad-Id':{section:'work'}}}
    ];
    return {
      errors:FB.stories.validatePlacements(table,sections),
      missing:Object.keys(FB.stories.typeFiles()).filter(function (type) { return !table.types[type]; }),
      retired:FB.validateDeedSections(sections.concat([{id:'old_stories',type:'stories',order:5,layout:'both'}])).length > 0,
      shipped:sections.some(function (section) { return section.type === 'stories'; }),
      rejected:bad.map(function (row) { return FB.stories.validatePlacements(row,sections).length > 0; })
    };
  })).toEqual({errors:[],missing:[],retired:true,shipped:false,rejected:[true,true,true,true,true,true,true]});
});

test('Damascus entries lead Work & Wealth with goals beside the storyline and the item keys',async function ({page},info) {
  await beginDamascus(page,info);
  await expect(page.locator('#tab-actions > [data-story-card]')).toHaveCount(0);
  const work = page.locator('#tab-actions [data-action-group-body="work"]');
  await expect(work.locator('[data-story-card]')).toHaveCount(2);
  const facts = await work.evaluate(function (body) {
    const cards = body.querySelectorAll('[data-story-card]'), subhead = body.querySelector('.actionsubhead');
    const header = document.querySelector('#tab-actions [data-action-group="work"]');
    return {order:Array.prototype.map.call(cards,function (card) { return card.getAttribute('data-story-card'); }),
      leading:!subhead || !!(cards[1].compareDocumentPosition(subhead) & Node.DOCUMENT_POSITION_FOLLOWING),
      counted:Number(header.lastElementChild.textContent.match(/\d+/)[0]) ===
        body.querySelectorAll('[data-action-id]').length + cards.length,
      waiting:header.getAttribute('data-story-waiting'),marker:!!header.querySelector('.deed-story-marker')};
  });
  expect(facts).toEqual({order:[TRACK,GOALS],leading:true,counted:true,waiting:'true',marker:true});
  const track = work.locator('[data-story-card="'+TRACK+'"]'), goals = work.locator('[data-story-card="'+GOALS+'"]');
  // The face keeps only the action name; state and description live in Details.
  await expect(track).toContainText('📖 A living in Damascus…');
  await expect(goals).toContainText('🎯 The Household’s First Goals…');
  await expect(work.locator('[data-story-card] .adesc')).toHaveCount(0);
  await expect(page.locator('#story-details-'+TRACK+' .deed-status-text')).toHaveText('Household and stores');
  await expect(page.locator('#story-details-'+GOALS+' .deed-status-text')).toHaveText('0 of 3 goals met');
  await expect(page.locator('#story-details-'+TRACK)).toContainText('A craft household weighs its work');
  // The story takes the section's first item key and opens the shared sheet.
  const sectionKey = await page.locator('#tab-actions [data-action-group="work"] .deed-section-keyhint').textContent();
  await page.keyboard.press('Digit' + sectionKey.trim());
  await expect(track.locator('.deed-item-keyhint')).toHaveText('Q');
  await page.keyboard.press('q');
  await expect(page.locator('#gm-title')).toHaveText('A living in Damascus');
  await page.keyboard.press('Escape');
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  await expect(track).toBeFocused();
});

test('a collapsed story section stays closed until another stage waits',async function ({page},info) {
  await beginDamascus(page,info);
  const header = page.locator('#tab-actions [data-action-group="work"]');
  await expect(header).toHaveAttribute('aria-expanded','true');
  await header.click();
  await expect(header).toHaveAttribute('aria-expanded','false');
  await page.evaluate(function () { FB.ui.refresh(); });
  await expect(header).toHaveAttribute('aria-expanded','false');
  await expect(header.locator('.deed-story-marker')).toHaveCount(1);
  expect(await page.evaluate(function (id) {
    const s = FB.state, applied = FB.stories.apply(s,id,'take_stock',FB.stories.quote(s,id,'take_stock'));
    FB.ui.refresh();
    return applied && s.stories[id].phase;
  },TRACK)).toBe('crafting');
  await expect(header).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('#story-details-'+TRACK+' .deed-status-text')).toHaveText('Work in the district');
});

test('read-only world stories gather behind Affairs of the world with list and entry returns',async function ({page},info) {
  await beginBookmark(page,info,'1096','mainz_jewish_household_1096');
  const plan = await page.evaluate(function () {
    return {affairs:FB.stories.affairs(FB.state).map(function (entry) { return entry.id; }),
      placed:FB.stories.cards(FB.state).filter(function (card) {
        return FB.stories.affairs(FB.state).every(function (entry) { return entry.id !== card.id; });
      }).map(function (card) { return card.id; })};
  });
  expect(plan.affairs).toContain('eastern_undertaking_1096');
  expect(plan.placed).not.toContain('eastern_undertaking_1096');
  expect(await storySection(page,'mainz_party_1096')).toBe('life');
  await expect(page.locator('#tab-actions > [data-story-card]')).toHaveCount(0);
  const entry = await openStoryAffairs(page);
  await expect(page.locator('#story-details-affairs .deed-status-text')).toHaveText(String(plan.affairs.length) + ' unfolding elsewhere');
  await expect(page.locator('#gm-body [data-story-card]')).toHaveCount(plan.affairs.length);
  await page.locator('#gm-body [data-story-card="eastern_undertaking_1096"]').click();
  await expect(page.locator('#gm-title')).toHaveText('The Eastern Undertaking');
  await expect(page.locator('[data-story-choice]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#gm-title')).toHaveText('Affairs of the world');
  await expect(page.locator('#gm-body [data-story-card="eastern_undertaking_1096"]')).toBeVisible();
  await page.locator('[data-modal-nav="close"]').click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  await expect(entry).toBeFocused();
});

test('action-type grouping places the storyline and goals in personal decisions',async function ({page},info) {
  await beginDamascus(page,info);
  await page.evaluate(function () { FB.game.uiPrefs.groupDeedsByActionType = true; FB.ui.refresh(); });
  expect([await storySection(page,TRACK),await storySection(page,GOALS)]).toEqual(['personal','personal']);
  const card = await revealStoryCard(page,TRACK);
  await expect(page.locator('#tab-actions [data-action-group-body="personal"] [data-story-card="'+GOALS+'"]')).toBeVisible();
  await card.click();
  await expect(page.locator('#gm-title')).toHaveText('A living in Damascus');
  await page.keyboard.press('Escape');
  await expect(card).toBeFocused();
  await page.evaluate(function () { FB.game.uiPrefs.groupDeedsByActionType = false; });
});

for (const config of [
  {file:'story-placement-family.json',track:'life',goals:'life',icon:'🏠'},
  {file:'story-placement-ledger.json',track:'realm',goals:'faith',icon:'📒'}]) {
  test(config.file+' moves story entries through ordinary JSON import and rejects malformed placement',async function ({page},info) {
    await openGame(page,info);
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring',config.file));
    await Promise.all([page.waitForEvent('load'),page.locator('#mod-apply').click()]);
    await prepareGameContent(page);
    await beginBookmarkFromTitle(page,'634','damascus_household_634');
    expect([await storySection(page,TRACK),await storySection(page,GOALS)]).toEqual([config.track,config.goals]);
    const card = await revealStoryCard(page,TRACK);
    await expect(card).toContainText(config.icon + ' A living in Damascus');
    expect(await page.evaluate(function () {
      const before = JSON.stringify(FBDATA.storyPlacements), signature = FB.mods.sig();
      const bad = {storyPlacements:{types:{household_track:{section:'focus'}}}};
      const faults = FB.mods.validate(bad);
      let refused = false;
      try { FB.mods.apply(bad); } catch (error) { refused = true; }
      return {faults:faults.length > 0,refused:refused,
        unchanged:before === JSON.stringify(FBDATA.storyPlacements) && signature === FB.mods.sig()};
    })).toEqual({faults:true,refused:true,unchanged:true});
  });
}
