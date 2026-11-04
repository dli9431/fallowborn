'use strict';

const { expect } = require('../fixture');

/* Story cards live inside the deeds section named by FBDATA.storyPlacements,
   and read-only world stories sit behind Affairs of the world. These helpers
   ask the engine for the owning section, open it like a player would and
   return the entry. Pass null as the story id for the Affairs entry. */
async function storySection(page, storyId) {
  return page.evaluate(function (id) {
    const style = FB.game.uiPrefs && FB.game.uiPrefs.groupDeedsByActionType ? 'action-type' : 'theme';
    const ids = FB.deeds.sections(FB.state, style).filter(function (row) {
      return row.type === 'deeds';
    }).map(function (row) { return row.id; });
    const plan = FB.stories.placements(FB.state, style, ids);
    if (id === null) return plan.affairsSection;
    for (const section of Object.keys(plan.sections)) {
      if (plan.sections[section].some(function (entry) { return entry.id === id; })) return section;
    }
    return null;
  }, storyId);
}

async function openDeedSection(page, section) {
  const toggle = page.locator('#tab-actions [data-action-group="' + section + '"]');
  await expect(toggle).toHaveCount(1);
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
}

async function revealStoryCard(page, storyId) {
  await page.locator('#sidetabs [data-tab="actions"]').click();
  const section = await storySection(page, storyId);
  expect(section).toBeTruthy();
  await openDeedSection(page, section);
  const card = page.locator('#tab-actions [data-story-card="' + storyId + '"]');
  await expect(card).toBeVisible();
  return card;
}

async function openStoryAffairs(page) {
  await page.locator('#sidetabs [data-tab="actions"]').click();
  const section = await storySection(page, null);
  expect(section).toBeTruthy();
  await openDeedSection(page, section);
  const entry = page.locator('#tab-actions [data-story-affairs]');
  await entry.click();
  await expect(page.locator('#gm-title')).toHaveText('Affairs of the world');
  return entry;
}

module.exports = {
  storySection:storySection,
  revealStoryCard:revealStoryCard,
  openStoryAffairs:openStoryAffairs
};
