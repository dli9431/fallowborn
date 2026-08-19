'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/actions.js',
  'js/model.js',
  'js/world.js',
  'js/modifiers.js',
  'js/papacy.js',
  'js/economy.js',
  'js/keys.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'js/ui_panels.js',
  'css/style.css',
  'data/modifiers.js',
  'data/events_noble.js',
  'data/map_data.js',
  'data/cultures.js',
  'data/technology.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('offers both conversion deeds to adults', async function ({ page }) {
  const result = await page.evaluate(function () {
    const state = FB.state;
    const me = state.chars[state.player.charId];
    me.born = state.date.year - 35;
    return {
      faith:FB.instantStatus(state, 'convert_faith').shown,
      culture:FB.instantStatus(state, 'adopt_culture').shown
    };
  });
  expect(result.faith).toBe(true);
  expect(result.culture).toBe(true);
});

test('gates self faith conversion on piety and scales cost by faith distance',
  async function ({ page }) {
  const result = await page.evaluate(function () {
    const state = FB.state;
    const player = state.player;
    const me = state.chars[player.charId];
    me.religion = 'catholic';
    me.born = state.date.year - 35;

    player.piety = 0;
    const poor = FB.conversionStatus(state, 'faith', 'norse_pagan', 'self');

    player.piety = 1000;
    player.prestige = 1000;
    // a foreign faith pays the full base cost
    const foreign = FB.conversionStatus(state, 'faith', 'norse_pagan', 'self');
    // a campaign-founded in-fold child of catholic pays the reduced rate
    const sect = FB.createFaith(state, {
      name:'Test Sect', adjective:'Test', collective:'Testers',
      desc:'A test sect.', icon:'✝',
      group:'catholic', relationToParent:'in_fold'
    });
    const inFold = FB.conversionStatus(state, 'faith', sect, 'self');
    return {
      poorOk:poor.ok,
      poorReason:poor.reason,
      foreignOk:foreign.ok,
      foreignCost:foreign.pietyCost,
      foreignRelation:foreign.relation,
      inFoldOk:inFold.ok,
      inFoldCost:inFold.pietyCost,
      inFoldRelation:inFold.relation
    };
  });
  expect(result.poorOk).toBe(false);
  expect(result.poorReason).toContain('piety');
  expect(result.foreignOk).toBe(true);
  expect(result.foreignRelation).toBe('foreign');
  expect(result.foreignCost).toBe(100);
  expect(result.inFoldOk).toBe(true);
  expect(result.inFoldRelation).toBe('in_fold');
  expect(result.inFoldCost).toBe(60);
});

test('applies a self faith conversion with cost, opinion hit, and cooldown',
  async function ({ page }) {
  const result = await page.evaluate(function () {
    const state = FB.state;
    const player = state.player;
    const me = state.chars[player.charId];
    me.religion = 'catholic';
    me.born = state.date.year - 35;
    player.piety = 500;
    player.prestige = 100;
    player.pop = 20;
    const before = { piety:player.piety, pop:player.pop };
    const ok = FB.applyConversion(state, 'faith', 'orthodox', 'self');
    const again = FB.conversionStatus(state, 'faith', 'sunni', 'self');
    return {
      ok:ok,
      religion:me.religion,
      pietySpent:before.piety - player.piety,
      popDelta:player.pop - before.pop,
      cooldown:player.cooldowns['convert_faith:self'],
      againOk:again.ok,
      againReason:again.reason,
      newsKey:state.log.length && state.log[state.log.length - 1].msg
        ? state.log[state.log.length - 1].msg.key : null
    };
  });
  expect(result.ok).toBe(true);
  expect(result.religion).toBe('orthodox');
  expect(result.pietySpent).toBe(80); // 100 base × 0.8 schismatic
  expect(result.popDelta).toBe(-10);
  expect(typeof result.cooldown).toBe('number');
  expect(result.againOk).toBe(false);
  expect(result.againReason).toContain('Ready in');
  expect(result.newsKey).toBe('news.action.convert_faith');
});

test('converts the household and stirs zealot unrest at home',
  async function ({ page }) {
  const result = await page.evaluate(function () {
    const state = FB.state;
    const player = state.player;
    const me = state.chars[player.charId];
    me.religion = 'catholic';
    me.born = state.date.year - 35;
    player.piety = 1000;
    player.prestige = 1000;
    player.pop = 0;
    const household = FB.householdMembers(state);
    const ids = household.map(function (c) { return c.id; });
    const before = { piety:player.piety, prestige:player.prestige };
    const ok = FB.applyConversion(state, 'faith', 'orthodox', 'household');
    const home = player.provinceId;
    const modifiers = (state.modifiers.county[home] || [])
      .map(function (m) { return m.id; });
    const deedStatus = FB.instantStatus(state, 'convert_faith');
    const selfStatusAfter = FB.conversionStatus(state, 'faith', 'sunni', 'self');
    return {
      ok:ok,
      ids:ids,
      religions:ids.map(function (id) { return state.chars[id].religion; }),
      pietySpent:before.piety - player.piety,
      prestigeSpent:before.prestige - player.prestige,
      pop:player.pop,
      modifiers:modifiers,
      deedCan:deedStatus.can,
      deedReason:deedStatus.reason,
      selfReason:selfStatusAfter.reason
    };
  });
  expect(result.ok).toBe(true);
  expect(result.ids.length).toBeGreaterThan(0);
  for (const religion of result.religions) expect(religion).toBe('orthodox');
  expect(result.pietySpent).toBe(200); // 250 base × 0.8 schismatic
  expect(result.prestigeSpent).toBe(120); // 150 base × 0.8 schismatic
  expect(result.pop).toBe(-30);
  expect(result.modifiers).toContain('zealot_unrest');
  expect(result.deedCan).toBe(false);
  expect(result.deedReason).toContain('Ready in');
  expect(result.selfReason).toContain('Ready in');
});

test('gates realm conversion to landed rulers and makes it once per ruler',
  async function ({ page }) {
  const result = await page.evaluate(function () {
    const state = FB.state;
    const player = state.player;
    const me = state.chars[player.charId];
    me.religion = 'catholic';
    me.born = state.date.year - 35;
    player.piety = 5000;
    player.prestige = 5000;
    player.tier = 0;
    delete state.realms.player;
    const commoner = FB.conversionStatus(state, 'faith', 'sunni', 'realm');

    player.tier = 3;
    player.provs = ['london'];
    state.realms.player = {
      name:'Testdom', alive:true, rank:1, capital:'london', religion:null
    };
    state.realms.vassal_test = { name:'Vassal', alive:true, liege:'player' };
    state.realms.fold_test = {
      name:'Old Fold', alive:true, capital:'roma', religion:'catholic'
    };
    const vassalBefore = FB.standingOf(state, { kind:'realm', id:'vassal_test' });
    const foldBefore = FB.standingOf(state, { kind:'realm', id:'fold_test' });
    const ok = FB.applyConversion(state, 'faith', 'sunni', 'realm');
    const vassalAfter = FB.standingOf(state, { kind:'realm', id:'vassal_test' });
    const foldAfter = FB.standingOf(state, { kind:'realm', id:'fold_test' });
    const second = FB.conversionStatus(state, 'faith', 'orthodox', 'realm');
    const modifiers = (state.modifiers.county.london || [])
      .map(function (m) { return m.id; });
    return {
      commonerOk:commoner.ok,
      ok:ok,
      realmReligion:state.realms.player.religion,
      religion:me.religion,
      marker:player.realmFaithConversion,
      vassalDelta:vassalAfter - vassalBefore,
      foldDelta:foldAfter - foldBefore,
      secondOk:second.ok,
      secondReason:second.reason,
      modifiers:modifiers
    };
  });
  expect(result.commonerOk).toBe(false);
  expect(result.ok).toBe(true);
  expect(result.realmReligion).toBe('sunni');
  expect(result.religion).toBe('sunni');
  expect(result.marker && result.marker.to).toBe('sunni');
  expect(result.vassalDelta).toBe(-35);
  // −25 explicit hit plus the faith-baseline re-base from same (+15) to
  // hostile/foreign (catholic vs sunni is authored hostile: −25)
  expect(result.foldDelta).toBeLessThanOrEqual(-25);
  expect(result.secondOk).toBe(false);
  expect(result.secondReason).toContain('already led the realm');
  expect(result.modifiers).toContain('zealot_unrest');
});

test('excommunicates an apostate from the papal faith while a Pope reigns',
  async function ({ page }) {
  const result = await page.evaluate(function () {
    const state = FB.state;
    const player = state.player;
    const me = state.chars[player.charId];
    me.religion = 'catholic';
    me.born = state.date.year - 35;
    me.traits = (me.traits || []).filter(function (id) {
      return id !== 'excommunicated';
    });
    player.piety = 1000;
    player.prestige = 1000;
    const pope = FB.religiousHeadOf(state, 'catholic');
    const ensurePapacy = FB.ensurePapacy;
    let previewRepairs = 0;
    FB.ensurePapacy = function () {
      previewRepairs++;
      return ensurePapacy.apply(this, arguments);
    };
    const status = FB.conversionStatus(state, 'faith', 'orthodox', 'self');
    FB.ensurePapacy = ensurePapacy;
    const ok = FB.applyConversion(state, 'faith', 'orthodox', 'self');
    const papacy = FB.ensurePapacy(state);
    const obedience = papacy.obediences[papacy.romanObedience];
    const record = papacy.excommunications[obedience.id + ':' + me.id];
    return {
      pope:!!pope,
      excommunicates:status.excommunicates,
      previewRepairs:previewRepairs,
      ok:ok,
      trait:me.traits.indexOf('excommunicated') >= 0,
      cause:record ? record.cause : null,
      justified:record ? record.justified : null
    };
  });
  expect(result.pope).toBe(true);
  expect(result.excommunicates).toBe(true);
  expect(result.previewRepairs).toBe(0);
  expect(result.ok).toBe(true);
  expect(result.trait).toBe(true);
  expect(result.cause).toBe('apostasy');
  expect(result.justified).toBe(true);
});

test('gates culture adoption on prestige/piety, scales by culture distance, and applies cultural unrest and standing fallout',
  async function ({ page }) {
  const result = await page.evaluate(function () {
    const state = FB.state;
    const player = state.player;
    const me = state.chars[player.charId];
    me.culture = 'frankish';
    me.born = state.date.year - 35;

    // Self: same group vs foreign group scaling
    const sameGroupStatus = FB.conversionStatus(state, 'culture', 'german', 'self');
    const foreignGroupStatus = FB.conversionStatus(state, 'culture', 'greek', 'self');

    // Landed ruler setup with a vassal realm and an old-culture realm
    player.tier = 4;
    player.provs = [player.provinceId];
    state.realms = state.realms || {};
    state.realms.player = {
      name:'Player Realm', alive:true, rank:2, capital:player.provinceId, culture:'frankish'
    };
    state.realms.vassal_test = {
      name:'Sworn Vassal', alive:true, liege:'player', culture:'frankish'
    };
    state.realms.old_culture_realm = {
      name:'German Realm', alive:true, culture:'german'
    };
    state.realms.byzantium = {
      name:'Byzantium', alive:true, culture:'greek'
    };
    state.player.tradePartners = ['byzantium'];

    player.prestige = 2000;
    player.piety = 2000;

    const vassalBefore = FB.standingOf(state, { kind:'realm', id:'vassal_test' });
    const oldRealmBefore = FB.standingOf(state, { kind:'realm', id:'old_culture_realm' });

    const selfBefore = player.prestige;
    const selfOk = FB.applyConversion(state, 'culture', 'german', 'self');
    const selfCulture = me.culture;
    const selfSpent = selfBefore - player.prestige;

    const blockedAfterSelf = FB.conversionStatus(state, 'culture', 'greek', 'household');
    const deedStatusAfterSelf = FB.instantStatus(state, 'adopt_culture');

    // Reset cooldowns to test household scope conversion in the same environment
    delete state.player.cooldowns.adopt_culture;
    delete state.player.cooldowns['adopt_culture:self'];

    const household = FB.householdMembers(state);
    const ids = household.map(function (c) { return c.id; });
    const holdStatus = FB.conversionStatus(state, 'culture', 'greek', 'household');
    const holdBefore = { prestige:player.prestige, piety:player.piety };
    const holdOk = FB.applyConversion(state, 'culture', 'greek', 'household');
    const deedStatusAfterHold = FB.instantStatus(state, 'adopt_culture');

    const vassalAfter = FB.standingOf(state, { kind:'realm', id:'vassal_test' });
    const oldRealmAfter = FB.standingOf(state, { kind:'realm', id:'old_culture_realm' });

    const home = player.provinceId;
    const modifiers = (state.modifiers.county[home] || []).map(function (m) { return m.id; });

    // Check cultural_backlash noble event trigger condition
    const eventDef = FBDATA.events.find(function (e) { return e.id === 'cultural_backlash'; });

    return {
      sameRelation:sameGroupStatus.relation,
      sameCost:sameGroupStatus.prestigeCost,
      foreignRelation:foreignGroupStatus.relation,
      foreignCost:foreignGroupStatus.prestigeCost,
      selfOk:selfOk,
      selfCulture:selfCulture,
      selfSpent:selfSpent,
      blockedAfterSelfOk:blockedAfterSelf.ok,
      blockedAfterSelfReason:blockedAfterSelf.reason,
      deedAfterSelfCan:deedStatusAfterSelf.can,
      deedAfterSelfReason:deedStatusAfterSelf.reason,
      holdStatusOk:holdStatus.ok,
      holdCosts:{ piety:holdStatus.pietyCost, prestige:holdStatus.prestigeCost },
      holdOk:holdOk,
      holdSpent:{
        prestige:holdBefore.prestige - player.prestige,
        piety:holdBefore.piety - player.piety
      },
      deedAfterHoldCan:deedStatusAfterHold.can,
      deedAfterHoldReason:deedStatusAfterHold.reason,
      cultures:ids.map(function (id) { return state.chars[id].culture; }),
      vassalDelta:vassalAfter - vassalBefore,
      oldRealmDelta:oldRealmAfter - oldRealmBefore,
      modifiers:modifiers,
      hasBacklashEvent:!!eventDef,
      newsKey:state.log.length && state.log[state.log.length - 1].msg
        ? state.log[state.log.length - 1].msg.key : null
    };
  });
  expect(result.sameRelation).toBe('same_group');
  expect(result.sameCost).toBe(120); // 150 base × 0.8 same_group
  expect(result.foreignRelation).toBe('foreign');
  expect(result.foreignCost).toBe(188); // 150 base × 1.25 foreign
  expect(result.selfOk).toBe(true);
  expect(result.selfCulture).toBe('german');
  expect(result.selfSpent).toBe(120);
  expect(result.blockedAfterSelfOk).toBe(false);
  expect(result.blockedAfterSelfReason).toContain('Ready in');
  expect(result.deedAfterSelfCan).toBe(false);
  expect(result.deedAfterSelfReason).toContain('Ready in');
  expect(result.holdStatusOk).toBe(true);
  expect(result.holdCosts).toEqual({ piety:188, prestige:563 }); // 450/150 × 1.25 foreign
  expect(result.holdOk).toBe(true);
  expect(result.holdSpent).toEqual({ prestige:563, piety:188 });
  expect(result.deedAfterHoldCan).toBe(false);
  expect(result.deedAfterHoldReason).toContain('Ready in');
  for (const culture of result.cultures) expect(culture).toBe('greek');
  expect(result.vassalDelta).toBe(-25);
  expect(result.oldRealmDelta).toBe(-15);
  expect(result.modifiers).toContain('cultural_unrest');
  expect(result.hasBacklashEvent).toBe(true);
  expect(result.newsKey).toBe('news.action.adopt_culture');
});

test('soft gates conversion to encountered traditions and unlocks via gameplay interactions',
  async function ({ page }) {
  const result = await page.evaluate(function () {
    const state = FB.state;
    const player = state.player;
    const me = state.chars[player.charId];
    me.culture = 'frankish';
    me.religion = 'catholic';
    player.piety = 1000;
    player.prestige = 1000;

    // Distant unencountered culture and faith without contact are not encountered
    const nubianBeforeEncountered = FB.conversionTargetEncountered(state, 'culture', 'nubian');
    const zoroastrianBeforeEncountered = FB.conversionTargetEncountered(state, 'faith', 'zoroastrian');

    // Establishing an active trade partner realm soft-unlocks Nubian culture
    state.realms = state.realms || {};
    state.realms.nubia = { name:'Makuria', alive:true, culture:'nubian' };
    player.tradePartners = player.tradePartners || [];
    player.tradePartners.push('nubia');
    const nubianAfterEncountered = FB.conversionTargetEncountered(state, 'culture', 'nubian');
    const nubianPresence = FB.conversionTargetPresence(state, 'culture', 'nubian');

    // Marrying a Zoroastrian spouse soft-unlocks Zoroastrian faith
    const spouseId = 'test_zoroastrian_spouse';
    state.chars[spouseId] = {
      id:spouseId, name:'Shirin', religion:'zoroastrian', culture:'persian', alive:true
    };
    me.spouseId = spouseId;
    const zoroastrianAfterEncountered = FB.conversionTargetEncountered(state, 'faith', 'zoroastrian');
    const zoroastrianPresence = FB.conversionTargetPresence(state, 'faith', 'zoroastrian');

    return {
      nubianBefore:nubianBeforeEncountered,
      nubianAfter:nubianAfterEncountered,
      nubianPresenceKind:nubianPresence ? nubianPresence.kind : null,
      nubianPresenceLabel:nubianPresence ? nubianPresence.label : null,
      zoroastrianBefore:zoroastrianBeforeEncountered,
      zoroastrianAfter:zoroastrianAfterEncountered,
      zoroastrianPresenceKind:zoroastrianPresence ? zoroastrianPresence.kind : null,
      zoroastrianPresenceLabel:zoroastrianPresence ? zoroastrianPresence.label : null
    };
  });
  expect(result.nubianBefore).toBe(false);
  expect(result.nubianAfter).toBe(true);
  expect(result.nubianPresenceKind).toBe('trade');
  expect(result.nubianPresenceLabel).toBe('Trade');
  expect(result.zoroastrianBefore).toBe(false);
  expect(result.zoroastrianAfter).toBe(true);
  expect(result.zoroastrianPresenceKind).toBe('spouse');
  expect(result.zoroastrianPresenceLabel).toBe('Spouse');
});

test('records conversion in the technology impact ledger', async function ({ page }) {
  const result = await page.evaluate(function () {
    const features = FBDATA.techImpactReviews.features;
    const errors = FB.validateTechnologyData ? FB.validateTechnologyData() : [];
    return {
      faith:features.faith_conversion,
      culture:features.culture_adoption,
      errors:errors
    };
  });
  expect(result.faith.mode).toBe('none');
  expect(result.culture.mode).toBe('none');
  expect(result.faith.rationale.length).toBeGreaterThan(0);
  expect(result.culture.rationale.length).toBeGreaterThan(0);
  expect(result.errors).toEqual([]);
});

test('faith conversion modal renders grouped traditions, segmented scope controls, clean cards, and interactive doctrine tooltips',
  async function ({ page }) {
  await page.evaluate(function () {
    const state = FB.state;
    state.player.piety = 500;
    state.player.prestige = 500;
    state.chars[state.player.charId].religion = 'catholic';
    state.realms = state.realms || {};
    state.realms.danelaw = { name:'Danelaw', alive:true, religion:'norse_pagan' };
    state.realms.cordoba = { name:'Cordoba', alive:true, religion:'sunni' };
    state.player.tradePartners = ['danelaw', 'cordoba'];
    FB.ui.showConversionPicker('faith');
  });

  // Modal heading & scope bar
  await expect(page.locator('#gm-title')).toHaveText('Convert faith');
  const scopeTabs = page.locator('.conversion-scope-tab');
  await expect(scopeTabs).toHaveCount(3);
  await expect(page.locator('[data-conv-scope="self"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#conv-scope-desc')).toContainText('Personal adoption');

  // Tradition sections & cards
  const sections = page.locator('.conversion-section');
  await expect(sections).toHaveCount(await sections.count());
  expect(await sections.count()).toBeGreaterThanOrEqual(3);
  await expect(page.locator('.conversion-section-title', { hasText:'Christian Traditions' })).toBeVisible();
  await expect(page.locator('.conversion-section-title', { hasText:'Islamic Traditions' })).toBeVisible();
  await expect(page.locator('.conversion-section-title', { hasText:'Pagan Traditions' })).toBeVisible();

  // Cards display icon, name, relation badge, highlighted cost without multiplier parentheses
  const orthodoxCard = page.locator('.conversion-card[data-conv-target="orthodox"]');
  await expect(orthodoxCard).toBeVisible();
  await expect(orthodoxCard.locator('.conversion-badge.schismatic')).toBeVisible();
  await expect(orthodoxCard.locator('.conversion-card-cost')).toContainText('80 piety');
  await expect(orthodoxCard.locator('.cost-highlight')).toHaveText('80 piety');
  await expect(orthodoxCard.locator('.conversion-card-cost')).not.toContainText('(×');
  await expect(page.locator('.conversion-card .keyhint')).toHaveCount(0);

  // Desktop hides the ? disclosure; hovering the card reveals the doctrine
  // details (Authority, Marriage, Clergy) in the side tooltip
  await expect(orthodoxCard.locator('.settcard-info')).toBeHidden();
  const details = orthodoxCard.locator('.settcard-details');
  await expect(details).toBeHidden();
  await orthodoxCard.hover();
  const tip = page.locator('#tooltip');
  await expect(tip).toBeVisible();
  await expect(tip).toContainText('Authority');
  await expect(tip).toContainText('Marriage');
  await expect(tip).toContainText('Clergy');

  // Switching scope updates costs and description
  await page.locator('[data-conv-scope="household"]').click();
  await expect(page.locator('[data-conv-scope="household"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#conv-scope-desc')).toContainText('family and household');
  await expect(page.locator('.conversion-card[data-conv-target="orthodox"] .conversion-card-cost'))
    .toContainText('200 piety + 120 prestige');
  await expect(page.locator('.conversion-card[data-conv-target="orthodox"] .cost-highlight'))
    .toHaveText('200 piety + 120 prestige');
  await expect(page.locator('.conversion-card[data-conv-target="orthodox"] .conversion-card-cost'))
    .not.toContainText('(×');

  // Digit keys do not activate conversion choices (hotkeys disabled)
  await page.keyboard.press('1');
  await expect(page.locator('#gm-title')).toHaveText('Convert faith');

  // Live search filters cards
  const searchInput = page.locator('#conv-search');
  await searchInput.fill('Norse');
  await expect(page.locator('.conversion-card[data-conv-target="norse_pagan"]')).toBeVisible();
  await expect(page.locator('.conversion-card[data-conv-target="orthodox"]')).toHaveCount(0);

  // Clicking a card opens confirmation modal with highlighted cost (without hotkey hints)
  await page.locator('.conversion-card[data-conv-target="norse_pagan"]').click();
  await expect(page.locator('#gm-title')).toContainText('Norse Paganism');
  await expect(page.locator('.conversion-confirm-cost .cost-highlight')).toBeVisible();
  await expect(page.locator('#conv-confirm')).toBeVisible();
  await expect(page.locator('#conv-cancel')).toBeVisible();
  await expect(page.locator('#genmodal .keyhint')).toHaveCount(0);

  // Cancel returns to the grouped picker
  await page.locator('#conv-cancel').click();
  await expect(page.locator('#gm-title')).toHaveText('Convert faith');

  // Anchored close button dismisses the modal
  const closeBtn = page.locator('#conv-close');
  await expect(closeBtn).toBeVisible();
  await closeBtn.click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
});

test('culture conversion modal renders grouped regional traditions, scope controls, and naming pattern tooltips without hotkeys',
  async function ({ page }) {
  await page.evaluate(function () {
    const state = FB.state;
    state.player.prestige = 500;
    state.chars[state.player.charId].culture = 'frankish';
    FB.ui.showConversionPicker('culture');
  });

  await expect(page.locator('#gm-title')).toHaveText('Adopt a new culture');
  const scopeTabs = page.locator('.conversion-scope-tab');
  await expect(scopeTabs).toHaveCount(2);

  // Grouped culture sections
  await expect(page.locator('.conversion-section-title', { hasText:'Western & Northern Europe' })).toBeVisible();
  await expect(page.locator('.conversion-card .keyhint')).toHaveCount(0);

  // Desktop hover discloses dynasty style in the side tooltip; the ? button
  // stays hidden on this layout
  const norseCard = page.locator('.conversion-card[data-conv-target="norse"]');
  await expect(norseCard).toBeVisible();
  await expect(norseCard.locator('.conversion-badge.in-fold')).toBeVisible();
  await expect(norseCard.locator('.conversion-card-cost')).toContainText('120 prestige');
  await expect(norseCard.locator('.cost-highlight')).toHaveText('120 prestige');
  await expect(norseCard.locator('.conversion-card-cost')).not.toContainText('(×');
  await expect(norseCard.locator('.settcard-info')).toBeHidden();
  await norseCard.hover();
  await expect(page.locator('#tooltip')).toContainText('Dynasty style');
  await expect(page.locator('#tooltip')).toContainText('Patronymic');

  // Digit keys do not select culture cards
  await page.keyboard.press('1');
  await expect(page.locator('#gm-title')).toHaveText('Adopt a new culture');

  // Anchored close button dismisses the culture modal
  const closeBtn = page.locator('#conv-close');
  await expect(closeBtn).toBeVisible();
  await closeBtn.click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
});
