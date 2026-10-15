'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/story_courts_476.js',
  'index.html', 'data/actions.js', 'data/systems.js', 'data/bookmarks.js',
  'data/bookmark_476.js',
  'data/bookmark_476_italy.js', 'data/bookmark_476_dalmatia_east.js',
  'data/bookmark_476_gaul_iberia.js', 'data/bookmark_476_africa.js', 'data/eras.js', 'js/actions.js', 'js/mods.js',
  'js/systems.js', 'js/i18n.js', 'js/stories.js', 'js/story_campaign.js',
  'data/story_instances.js', 'data/story_campaigns.js', 'js/story_courts.js',
  'js/story_track.js', 'js/ui_panels.js', 'js/ui_modals.js',
  'js/ui_misc.js', 'js/keys.js', 'js/main.js', 'css/style.css'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { startParityGame } = require('../support/game/parity');
const { waitForUiRefresh } = require('../support/game/ui');

const COMMON_SECTIONS = [
  'tutorial', 'stories', 'commitments', 'campaigns', 'holy_campaign',
  'household_summary', 'next_steps', 'focus'
];
// Ungated government sections are available everywhere; empty ones render no heading.
const THEME_GROUPS = ['work', 'life', 'faith', 'elective_crown', 'local_kingship', 'realm', 'war'];
const TYPE_GROUPS = ['deeds', 'personal', 'ruler', 'elective_crown', 'local_kingship'];

async function startRegistryGame(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () { FB.game.setPaused(true); });
  await page.locator('[data-tab="actions"]').click();
}

async function addModSection(page) {
  await page.evaluate(function () {
    FB.mods.apply({
      deedSections:[{ id:'e2e_civic', type:'deeds', layout:'both', order:85,
        label:'Civic affairs', subhead:'Household petitions', open:true,
        statusLine:'The civic desk is open.', system:'royal_council' }],
      deeds:[{
        id:'e2e_petition', handler:'declarative_deed', label:'Choose a petition',
        desc:'Consider the terms before choosing.', order:FBDATA.deeds.length,
        section:'e2e_civic', spendsDay:false, cooldownDays:0, capability:'resource_choice',
        choices:[{ id:'accept', label:'Accept the terms', effects:{ piety:1 } }]
      }]
    });
    FB.ui.refresh();
  });
  await waitForUiRefresh(page);
}

for (const bookmark of ['867', '1066']) {
  for (const scenario of ['farmer', 'baron']) {
    test(bookmark + ' ' + scenario + ' keeps section order and deed placement in both layouts',
      async function ({ page }, testInfo) {
        await startParityGame(page, testInfo, { bookmark:bookmark,
          code:'DEEDS-' + bookmark + '-' + scenario + '-london-f-Ada' });
        await page.locator('[data-tab="actions"]').click();
        for (const actionType of [false, true]) {
          const snapshot = await page.evaluate(function (actionType) {
            FB.game.uiPrefs.groupDeedsByActionType = actionType;
            FB.ui.refresh();
            const s = FB.state, before = JSON.stringify(s), rng = FB.getRngState();
            const layout = actionType ? 'action-type' : 'theme';
            const sections = FB.deeds.sections(s, layout);
            const listed = FB.listInstants(s, { deferEligibility:true });
            const populated = sections.filter(function (section) {
              return section.type === 'focus' || (section.type === 'deeds' &&
                FB.deeds.items(s, section, layout, listed).length);
            }).map(function (section) { return section.id; });
            const legacyPlacement = listed.every(function (item) {
              return FB.deeds.sectionForAction(item.a, layout) === (actionType
                ? (item.a.layoutGroup || (item.a.flow === 'choices' ? 'personal' : 'deeds'))
                : item.a.group);
            });
            return { sections:sections.map(function (section) { return section.id; }),
              populated:populated, legacyPlacement:legacyPlacement,
              pure:before === JSON.stringify(s) && rng === FB.getRngState(),
              errors:FB.validateActionData() };
          }, actionType);
          expect(snapshot.sections).toEqual(COMMON_SECTIONS.concat(actionType ? TYPE_GROUPS : THEME_GROUPS));
          expect(snapshot.legacyPlacement).toBe(true);
          expect(snapshot.pure).toBe(true);
          expect(snapshot.errors).toEqual([]);
          await waitForUiRefresh(page);
          expect(await page.locator('#tab-actions [data-action-section]').evaluateAll(function (nodes) {
            return nodes.map(function (node) { return node.getAttribute('data-action-section'); });
          })).toEqual(snapshot.populated);
        }
      });
  }
}

test('a mod section appears in order, keeps lazy controls, and works in either layout',
  async function ({ page }, testInfo) {
    await startRegistryGame(page, testInfo);
    await addModSection(page);
    const section = page.locator('[data-action-section="e2e_civic"]');
    const petition = page.locator('[data-action-id="e2e_petition"]');
    await expect(section).toContainText('Civic affairs');
    await expect(page.locator('[data-action-group-body="e2e_civic"]')).toContainText('The civic desk is open.');
    await expect(petition).toBeEnabled();
    await petition.evaluate(function (node) { node.dataset.retained = 'yes'; });
    await section.click();
    await expect(petition).toHaveCount(0);
    await section.click();
    await expect(petition).toHaveAttribute('data-retained', 'yes');
    for (const actionType of [false, true]) {
      const result = await page.evaluate(function (actionType) {
        FB.game.uiPrefs.groupDeedsByActionType = actionType;
        FB.ui.refresh();
        const layout = actionType ? 'action-type' : 'theme';
        const sections = FB.deeds.sections(FB.state, layout);
        const civicIndex = sections.findIndex(function (row) { return row.id === 'e2e_civic'; });
        const shortcuts = sections.filter(function (row) { return row.type === 'focus' || row.type === 'deeds'; });
        const shortcutIndex = shortcuts.findIndex(function (row) { return row.id === 'e2e_civic'; });
        FB.ui.activateDeedSection(shortcutIndex);
        return { neighbors:[sections[civicIndex - 1].id, sections[civicIndex + 1].id],
          selected:document.activeElement.getAttribute('data-action-section') };
      }, actionType);
      expect(result).toEqual({ neighbors:actionType ? ['deeds', 'personal'] : ['work', 'life'], selected:'e2e_civic' });
      await expect(petition).toBeEnabled();
    }
  });

test('disabled systems and section availability hide content and reject deed execution',
  async function ({ page }, testInfo) {
    await startRegistryGame(page, testInfo);
    await addModSection(page);
    const result = await page.evaluate(function () {
      const s = FB.state, bookmark = FB.bookmark(s.start.id);
      const originalSystems = bookmark.systems;
      bookmark.systems = { disable:['royal_council'] };
      const before = JSON.stringify(s), rng = FB.getRngState();
      const disabled = FB.instantStatus(s, 'e2e_petition');
      FB.runInstant(s, 'e2e_petition', { choiceId:'accept' });
      const direct = disabled.action.run(s, { choiceId:'accept' });
      const cachedCan = FB.instantStatus(s, 'e2e_petition', { shown:true }).can;
      FB.ui.refresh();
      const disabledResult = {
        shown:disabled.shown, can:disabled.can, direct:direct, cachedCan:cachedCan,
        listed:FB.listInstants(s).some(function (row) { return row.a.id === 'e2e_petition'; }),
        section:FB.deeds.sections(s, 'theme').some(function (row) { return row.id === 'e2e_civic'; }),
        pure:before === JSON.stringify(s) && rng === FB.getRngState()
      };
      bookmark.systems = originalSystems;
      FB.mods.apply({ deedSections:[{ id:'e2e_civic', availability:{ flagsAll:['e2e_assent'] } }] });
      const unavailable = FB.instantStatus(s, 'e2e_petition').shown;
      s.player.flags.e2e_assent = 1;
      const available = FB.instantStatus(s, 'e2e_petition').shown;
      delete s.player.flags.e2e_assent;
      FB.ui.refresh();
      return { disabled:disabledResult, unavailable:unavailable, available:available };
    });
    expect(result).toEqual({ disabled:{ shown:false, can:false, direct:false, cachedCan:false,
      listed:false, section:false, pure:true },
      unavailable:false, available:true });
    await waitForUiRefresh(page);
    await expect(page.locator('[data-action-section="e2e_civic"]')).toHaveCount(0);
    await expect(page.locator('[data-action-id="e2e_petition"]')).toHaveCount(0);
  });

test('invalid section mods leave both registries and projections intact',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const results = await page.evaluate(function () {
      const cases = [
        { deedSections:[{ id:'e2e_bad', type:'unknown', order:85, layout:'both' }] },
        { deedSections:[{ id:'e2e_bad', type:'deeds', order:85, layout:'both', label:'Bad', system:'missing_system' }] },
        { deedSections:[{ id:'work', order:Infinity }] },
        { deedSections:[{ id:'work', availability:{ run:'arbitrary' } }] },
        { deedSections:[{ id:'work', type:'stories' }] },
        { deedSections:[{ id:'work' }, { id:'work' }] },
        { deeds:[{ id:'give_alms', section:'missing_section' }] },
        { deeds:[{ id:'give_alms', actionTypeSection:'work' }] }
      ];
      return cases.map(function (mod) {
        const original = JSON.stringify({ sections:FBDATA.deedSections, deeds:FBDATA.deeds });
        const instants = FB.instants, focuses = FB.focuses, revision = FB.actionCatalogRevision;
        let rejected = false;
        try { FB.mods.apply(mod); } catch (error) { rejected = true; }
        return { rejected:rejected, unchanged:original === JSON.stringify({
          sections:FBDATA.deedSections, deeds:FBDATA.deeds }) && instants === FB.instants &&
          focuses === FB.focuses && revision === FB.actionCatalogRevision };
      });
    });
    expect(results).toEqual(Array.from({ length:8 }, function () { return { rejected:true, unchanged:true }; }));
  });

test('travelling presentation retains the existing allowlist as deed metadata',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const travel = await page.evaluate(function () {
      return FBDATA.deeds.filter(function (deed) { return deed.availableWhileTraveling; })
        .map(function (deed) { return deed.id; }).sort();
    });
    expect(travel).toEqual([
      'games_calendar', 'host_games', 'travel_turn_back', 'travel_return_cargo',
      'travel_marriage_residence', 'travel_settle_here', 'frontier_settle_here',
      'review_serf_tenure', 'review_colonate', 'seek_station', 'declare_manor', 'petition_barony',
      'found_settlement', 'petition_liege', 'claim_higher_title'
    ].sort());
  });

test('trusted registration and story cards use the same ordered section catalogue',
  async function ({ page }, testInfo) {
    await startParityGame(page, testInfo, { bookmark:'476',
      code:'DEEDS-476-federate_476-ravenna-m-Marcus-standard-0-gothic.homoian' });
    await page.evaluate(function () {
      FB.deeds.registerSection({ id:'e2e_notice', type:'deeds', layout:'both', order:15,
        label:'Public notice', statusLine:'The audience has assembled.', open:true });
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);
    // The attached story count follows the opening's data; this checks order and focus.
    const cards = page.locator('#tab-actions [data-story-card]');
    await expect(cards.first()).toBeVisible();
    const ordered = await page.evaluate(function () {
      const card = document.querySelector('[data-story-card]');
      const notice = document.querySelector('[data-action-section="e2e_notice"]');
      const focus = document.getElementById('daily-focus-list');
      return !!(card.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING) &&
        !!(notice.compareDocumentPosition(focus) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(ordered).toBe(true);
    await cards.first().click();
    await expect(page.locator('#genmodal')).not.toHaveClass(/hidden/);
    await page.locator('[data-modal-nav="close"]').click();
    await expect(cards.first()).toBeFocused();
  });

for (const compact of [false, true]) {
  test('a relocated built-in deed keeps nested Back and root Close navigation, compact ' + compact,
    async function ({ page }, testInfo) {
      if (compact) await page.setViewportSize({ width:800, height:700 });
      await startRegistryGame(page, testInfo);
      await addModSection(page);
      await page.evaluate(function () {
        FB.mods.apply({ deeds:[{ id:'livelihoods', section:'e2e_civic' }] });
        FB.ui.refresh();
      });
      await waitForUiRefresh(page);
      const entry = page.locator('[data-action-id="livelihoods"]');
      await entry.scrollIntoViewIfNeeded();
      const sideScroll = await page.locator('#sidebody').evaluate(function (node) { return node.scrollTop; });
      await entry.click();
      const title = await page.locator('#gm-title').textContent();
      const worker = page.locator('#gm-body [data-career]').first();
      await worker.scrollIntoViewIfNeeded();
      const listScroll = await page.locator('#gm-body').evaluate(function (node) { return node.scrollTop; });
      const workerId = await worker.getAttribute('data-career');
      await worker.click();
      await expect(page.locator('[data-modal-nav="back"]')).toBeEnabled();
      await page.locator('[data-modal-nav="back"]').click();
      await expect(page.locator('#gm-title')).toHaveText(title);
      await expect(page.locator('#gm-body [data-career="' + workerId + '"]')).toBeFocused();
      await expect.poll(function () {
        return page.locator('#gm-body').evaluate(function (node) { return node.scrollTop; });
      }).toBe(listScroll);
      await page.locator('[data-modal-nav="close"]').click();
      await expect(entry).toBeFocused();
      await expect.poll(function () {
        return page.locator('#sidebody').evaluate(function (node) { return node.scrollTop; });
      }).toBe(sideScroll);
    });

  test('registered section retains scroll and Details on modal dismissal and redraw, compact ' + compact,
    async function ({ page }, testInfo) {
      if (compact) await page.setViewportSize({ width:800, height:700 });
      await startRegistryGame(page, testInfo);
      await addModSection(page);
      const petition = page.locator('[data-action-id="e2e_petition"]');
      const details = page.locator('[aria-controls="deed-details-e2e_petition"]');
      // The compact disclosure is also a native control on desktop.
      await details.evaluate(function (button) { button.click(); });
      await petition.scrollIntoViewIfNeeded();
      const scroll = await page.locator('#sidebody').evaluate(function (node) { return node.scrollTop; });
      for (const dismissal of ['close', 'escape']) {
        await petition.click();
        await expect(page.locator('[data-declarative-choice="accept"]')).toBeVisible();
        if (dismissal === 'close') await page.locator('[data-modal-nav="close"]').click();
        else await page.keyboard.press('Escape');
        await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
        await expect(petition).toBeFocused();
        await expect(details).toHaveAttribute('aria-expanded', 'true');
        await expect.poll(function () {
          return page.locator('#sidebody').evaluate(function (node) { return node.scrollTop; });
        }).toBe(scroll);
      }
      await page.evaluate(function () { FB.ui.refresh(); });
      await waitForUiRefresh(page);
      await expect(details).toHaveAttribute('aria-expanded', 'true');
      await expect(petition).toBeFocused();
      expect(await page.locator('#sidebody').evaluate(function (node) { return node.scrollTop; })).toBe(scroll);
    });
}
