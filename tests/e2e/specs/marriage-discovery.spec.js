'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['data/cultures.js', 'js/agency.js', 'js/model.js', 'js/events.js',
  'js/world.js', 'js/travel.js', 'js/items.js', 'js/economy.js', 'js/actions.js',
  'js/ui_modals.js', 'js/ui_misc.js', 'js/population.js', 'js/ui_panels.js', 'js/portrait.js', 'css/style.css']);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    const child = FB.makeCharacter(s, { name:'Discovery Child', sex:me.sex,
      born:s.date.year - 18, culture:me.culture, religion:me.religion, station:1 });
    child.fatherId = me.id;
    me.childrenIds = (me.childrenIds || []).concat(child.id);
    child.homeProvinceId = s.player.provinceId;
    FB.touchFamily();
    window.discoveryChildId = child.id;
  });
});

test('both subjects browse scopes and filters without writing state or consuming RNG', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    s.chars[s.player.charId].spouseId = 'missing-legacy-spouse';
    const before = JSON.stringify(s), rng = FB.getRngState();
    const subjects = FB.marriageDiscoverySubjects(s).map(function (c) { return c.id; });
    const all = FB.marriageCandidateQuery(s, { scope:'all', availability:'all' });
    const nearby = FB.marriageCandidateQuery(s, { availability:'all' });
    const child = FB.marriageCandidateQuery(s, { subjectId:window.discoveryChildId, scope:'all' });
    const sample = all[0];
    const filtered = sample ? FB.marriageCandidateQuery(s, { scope:'all', availability:'all',
      search:sample.name, minAge:sample.age, maxAge:sample.age, faith:sample.faith,
      rank:String(sample.rank), heirs:sample.heir }) : [];
    return { same:JSON.stringify(s) === before, rngSame:FB.getRngState() === rng,
      subjects:subjects, childId:window.discoveryChildId, count:all.length,
      unique:new Set(all.map(function (r) { return r.key; })).size,
      nearbyValid:nearby.every(function (r) {
        const home = FB.playerRealmId(s), court = FB.topRealm(s, r.realmId);
        return (home === court || FB.realmsAdjacent(s, home, court)) &&
          all.some(function (a) { return a.key === r.key; });
      }),
      filtersValid:filtered.length > 0 && filtered.every(function (r) {
        return r.age === sample.age && r.faith === sample.faith && r.rank === sample.rank && (!sample.heir || r.heir);
      }), blockedExplain:child.every(function (r) { return r.status.ready || !!r.status.reason; }) };
  });
  expect(result.same).toBe(true);
  expect(result.rngSame).toBe(true);
  expect(result.subjects).toContain(result.childId);
  expect(result.count).toBeGreaterThan(0);
  expect(result.unique).toBe(result.count);
  expect(result.nearbyValid).toBe(true);
  expect(result.filtersValid).toBe(true);
  expect(result.blockedExplain).toBe(true);
});

test('fresh dynastic searches and clearing a court default to nearby courts', async function ({ page }) {
  await page.evaluate(function () { FB.ui.showMarriageFinder(); });
  await expect(page.locator('#finder-scope')).toHaveValue('near');
  await page.locator('#finder-filters > summary').click();
  await page.locator('#finder-scope').selectOption('all');
  await page.evaluate(function () { FB.ui.closeModal(); FB.ui.showMarriageFinder(null, null); });
  await expect(page.locator('#finder-scope')).toHaveValue('near');
  const court = await page.evaluate(function () {
    const s = FB.state, home = FB.playerRealmId(s);
    return FB.marriageCandidateQuery(s, { scope:'all', availability:'all' }).find(function (row) {
      const sovereign = FB.topRealm(s, row.realmId);
      return sovereign !== home && !FB.realmsAdjacent(s, home, sovereign);
    }).realmId;
  });
  await page.evaluate(function (rid) { FB.ui.closeModal(); FB.ui.showMarriageFinder(null, rid); }, court);
  await expect(page.locator('#finder-scope')).toHaveValue('all');
  await expect(page.locator('[data-finder-court="' + court + '"]').first()).toBeVisible();
  await page.locator('#finder-filters > summary').click();
  await page.locator('#finder-clear-court').click();
  await expect(page.locator('#finder-scope')).toHaveValue('near');
  await expect(page.locator('#finder-clear-court')).toBeHidden();
  await expect(page.locator('[data-finder-court="' + court + '"]')).toHaveCount(0);
});

test('compact court review restores filters, scroll and keyboard focus', async function ({ page }) {
  await page.evaluate(function () { FB.ui.showMarriageFinder(); });
  await page.locator('#finder-filters > summary').click();
  await page.locator('#finder-scope').selectOption('all');
  await page.locator('#finder-availability').selectOption('all');
  const button = page.locator('[data-finder-court]').nth(8);
  await expect(button).toBeVisible();
  await button.scrollIntoViewIfNeeded();
  await button.focus();
  const saved = await page.evaluate(function () {
    const body = document.getElementById('gm-body');
    return { scroll:body.scrollTop, court:document.activeElement.dataset.finderCourt };
  });
  expect(saved.scroll).toBeGreaterThan(0);
  await button.press('Enter');
  await page.locator('#cm-close').click();
  await expect(page.locator('#finder-scope')).toHaveValue('all');
  await expect(page.locator('#finder-availability')).toHaveValue('all');
  await expect(page.locator('[data-finder-court="' + saved.court + '"]').first()).toBeFocused();
  expect(await page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; })).toBe(saved.scroll);
});

test('descendant review retains the selected pair and stale clicks cannot propose', async function ({ page }) {
  const ids = await page.evaluate(function () {
    const s = FB.state;
    const row = FB.marriageCandidateQuery(s, { subjectId:window.discoveryChildId, scope:'all' })[0];
    FB.ensureRealmCourtForDisplay(s, row.realmId);
    const member = FB.realmFamilySnapshot(s, row.realmId)[0];
    const partner = FB.materializeRoyalChild(s, row.realmId, member.id);
    partner.sex = s.chars[window.discoveryChildId].sex === 'm' ? 'f' : 'm';
    member.sex = partner.sex;
    FB.ui.showMarriageFinder(window.discoveryChildId, row.realmId);
    return { child:window.discoveryChildId, partner:partner.id };
  });
  await page.locator('#finder-filters > summary').click();
  await page.locator('#finder-scope').selectOption('all');
  await page.locator('#finder-availability').selectOption('all');
  await page.locator('[data-finder-review="' + ids.partner + '"]').click();
  await expect(page.locator('[data-royal-kin-match]')).toHaveCount(1);
  await expect(page.locator('[data-royal-kin-match]')).toHaveAttribute('data-royal-kin-match', ids.child);
  await page.locator('#gm-cancel').click();
  const before = await page.evaluate(function (id) {
    FB.state.chars[id].dead = true;
    FB.touchFamily();
    return { turn:FB.state.turn, gold:FB.state.player.gold, rng:FB.getRngState() };
  }, ids.partner);
  await page.locator('[data-finder-review="' + ids.partner + '"]').click();
  await expect(page.locator('[data-finder-review="' + ids.partner + '"]')).toHaveCount(0);
  expect(await page.evaluate(function () {
    return { turn:FB.state.turn, gold:FB.state.player.gold, rng:FB.getRngState() };
  })).toEqual(before);
});

test('finder controls fit a mobile viewport and retain native keyboard input', async function ({ page }) {
  await page.setViewportSize({ width:390, height:844 });
  await page.evaluate(function () { FB.ui.showMarriageFinder(window.discoveryChildId); });
  await expect(page.locator('#finder-subject')).toBeVisible();
  await expect(page.locator('#finder-search')).toBeHidden();
  await expect(page.locator('#genmodal')).toBeFocused();
  await page.locator('#finder-filters > summary').click();
  await page.locator('#finder-search').fill('No such dynasty');
  await expect(page.locator('#finder-results')).toContainText('No matches');
  const layout = await page.locator('.marriage-finder').evaluate(function (root) {
    return Array.from(root.querySelectorAll('select, input:not([type="checkbox"]), button')).every(function (el) {
      if (el.hidden) return true;
      const box = el.getBoundingClientRect();
      return box.width <= 390 && box.height >= 44;
    });
  });
  expect(layout).toBe(true);
});

test('Kin omits the standalone finder while descendant sheets retain their shortcut', async function ({ page }) {
  await page.evaluate(function () { FB.ui.showTab('family'); });
  await expect(page.locator('#btn-ftree')).toBeVisible();
  await expect(page.locator('#kin-marriage-finder')).toHaveCount(0);
  await page.evaluate(function () { FB.ui.showCharModal(window.discoveryChildId); });
  await page.getByRole('button', { name:'Find a marriage', exact:false }).click();
  const childId = await page.evaluate(function () { return window.discoveryChildId; });
  await expect(page.locator('#finder-subject')).toHaveValue(childId);
});

test('selected royal match reviews lineage and retains its subject after an unresolved proposal', async function ({ page }) {
  const setup = await page.evaluate(function () {
    const s = FB.state, child = s.chars[window.discoveryChildId];
    child.culture = 'nubian';
    const partner = FB.makeCharacter(s, { sex:child.sex === 'm' ? 'f' : 'm',
      born:s.date.year - 20, culture:'nubian', religion:child.religion });
    partner.royalLine = { realmId:s.player.liege, memberId:'review-partner' };
    // Fix candidate availability to isolate the selected-subject navigation contract.
    FB.royalKinMatchCandidates = function () {
      return [child, s.chars[s.player.charId]].map(function (c) {
        return { character:c, status:{ ready:true, chance:0.5, descendantKind:'child' } };
      });
    };
    FB.proposeRoyalKinMatch = function (state, childId, partnerId, lineage) {
      window.reviewedRoyalPair = { child:childId, partner:partnerId, lineage:lineage };
      return { resolved:false };
    };
    const before = { state:JSON.stringify(s), rng:FB.getRngState() };
    FB.ui.showRoyalKinMatchPicker(partner.id, null, false, child.id);
    return { child:child.id, partner:partner.id, before:before };
  });
  await page.locator('[data-royal-kin-match]').click();
  await expect(page.locator('#marriage-lineage')).toHaveValue('paternal');
  await page.locator('#gm-cancel').click();
  await expect(page.locator('[data-royal-kin-match]')).toHaveCount(1);
  await expect(page.locator('[data-royal-kin-match]')).toHaveAttribute('data-royal-kin-match', setup.child);
  await page.locator('[data-royal-kin-match]').click();
  await page.locator('#marriage-lineage').selectOption('maternal');
  await page.locator('#marriage-lineage-confirm').click();
  await expect(page.locator('[data-royal-kin-match]')).toHaveCount(1);
  await expect(page.locator('[data-royal-kin-match]')).toHaveAttribute('data-royal-kin-match', setup.child);
  expect(await page.evaluate(function () { return window.reviewedRoyalPair; })).toEqual({
    child:setup.child, partner:setup.partner, lineage:'maternal'
  });
  expect(await page.evaluate(function () {
    return { state:JSON.stringify(FB.state), rng:FB.getRngState() };
  })).toEqual(setup.before);
  for (const invitation of [false, true]) {
    await page.evaluate(function (args) {
      FB.ui.closeModal();
      if (args.invitation) FB.ui.showMarriageCultureInvitation(args.partner, args.child);
      else FB.ui.showMarriageLineageReview(args.child, args.partner, function () {});
    }, { child:setup.child, partner:setup.partner, invitation:invitation });
    await page.locator('#gm-cancel').click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  }
});


test('descendant sheets link to the preselected finder without changing the game', async function ({ page }) {
  await page.evaluate(function () { FB.ui.showCharModal(window.discoveryChildId); });
  await page.getByRole('button', { name:'Find a marriage', exact:false }).click();
  const childId = await page.evaluate(function () { return window.discoveryChildId; });
  await expect(page.locator('#finder-subject')).toHaveValue(childId);
  const before = await page.evaluate(function () { return { state:JSON.stringify(FB.state), rng:FB.getRngState() }; });
  await page.locator('#finder-filters > summary').click();
  await page.locator('#finder-scope').selectOption('all');
  await page.locator('#finder-heirs').check();
  await page.locator('#finder-minAge').fill('16');
  await page.locator('#finder-maxAge').fill('40');
  expect(await page.evaluate(function () { return { state:JSON.stringify(FB.state), rng:FB.getRngState() }; })).toEqual(before);
});


test('seek a match chooses a route before generating prospects', async function ({ page }) {
  const before = await page.evaluate(function () {
    const s = FB.state;
    if (s.player.cooldowns) delete s.player.cooldowns.seek_match;
    const before = { state:JSON.stringify(s), rng:FB.getRngState() };
    FB.runInstant(s, 'seek_match');
    return before;
  });
  await expect(page.locator('#match-local')).toBeVisible();
  await expect(page.locator('#match-dynastic')).toBeVisible();
  expect(await page.evaluate(function () {
    return { state:JSON.stringify(FB.state), rng:FB.getRngState() };
  })).toEqual(before);
  await page.locator('#match-dynastic').click();
  await expect(page.locator('#finder-subject')).toBeVisible();
  await page.locator('#gm-cancel').click();
  await page.locator('#match-local').click();
  const count = await page.locator('[data-suitor-card]').count();
  expect(count).toBeGreaterThanOrEqual(3);
  expect(count).toBeLessThanOrEqual(4);
});

test('all court candidates have portraits without materializing characters', async function ({ page }) {
  const before = await page.evaluate(function () {
    const before = { state:JSON.stringify(FB.state), rng:FB.getRngState() };
    FB.ui.showMarriageFinder();
    return before;
  });
  await page.locator('#finder-filters > summary').click();
  await page.locator('#finder-scope').selectOption('all');
  const cards = page.locator('#finder-results .settcard');
  expect(await cards.count()).toBeGreaterThan(0);
  expect(await page.locator('#finder-results canvas.pface').count()).toBe(await cards.count());
  expect(await page.evaluate(function () {
    return { state:JSON.stringify(FB.state), rng:FB.getRngState() };
  })).toEqual(before);
});


for (const width of [320, 390]) {
  test('match actions fit and character Back retains position at ' + width, async function ({ page }) {
    await page.setViewportSize({ width:width, height:844 });
    await page.evaluate(function () { FB.ui.showMarriageFinder(); });
    await page.locator('#finder-filters > summary').click();
    await page.locator('#finder-scope').selectOption('all');
    await page.locator('#finder-availability').selectOption('all');
    await expect(page.locator('#finder-results')).not.toContainText('Review courtship and travel requirements.');
    const button = page.locator('[data-finder-character]').nth(8);
    await button.scrollIntoViewIfNeeded();
    await button.focus();
    const saved = await page.locator('#gm-body').evaluate(function (body) { return body.scrollTop; });
    expect(saved).toBeGreaterThan(0);
    await button.press('Enter');
    if (width === 320) await page.goBack();
    else await page.locator('#cm-close').click();
    await expect(button).toBeFocused();
    expect(await page.locator('#gm-body').evaluate(function (body) { return body.scrollTop; })).toBe(saved);
    await expect(page.locator('#finder-filters')).toHaveAttribute('open', '');
    expect(await page.locator('.finder-card-actions').evaluateAll(function (groups) {
      return groups.every(function (group) {
        const outer = group.getBoundingClientRect();
        return Array.from(group.querySelectorAll('button')).every(function (button) {
          const box = button.getBoundingClientRect();
          return box.left >= outer.left - 1 && box.right <= outer.right + 1 && box.height >= 44;
        });
      });
    })).toBe(true);
  });
}

test('travel review keeps decision terms visible and calculations in Details', async function ({ page }) {
  await page.setViewportSize({ width:390, height:844 });
  await page.evaluate(function () {
    // Fixed preview isolates presentation from distance and social-rate balance.
    const s = FB.state;
    const original = FB.socialVisitPreview;
    FB.socialVisitPreview = function () {
      return { eligible:true, destinationId:s.player.provinceId, dailyRate:0.2,
        standingThreshold:40, daysToThreshold:195, daysFromDeparture:204,
        days:9, minimumStay:90, cost:3 };
    };
    try { FB.ui.showSocialVisit(window.discoveryChildId, { courtship:true }); }
    finally { FB.socialVisitPreview = original; }
  });
  const summary = page.locator('.social-visit-summary');
  await expect(summary).toContainText('Cost: 3 gold upfront');
  await expect(summary).toContainText('9 travel days each way; minimum stay 90 days');
  await expect(summary).toContainText('204 days from departure');
  await expect(summary).toContainText('Marriage is not guaranteed');
  await expect(page.locator('#gm-title-details')).toBeHidden();
  await page.locator('.modal-title-info').click();
  await expect(page.locator('#gm-title-details')).toBeVisible();
  await expect(page.locator('#gm-title-details')).toContainText('Standing improves only while together');
  await expect(page.locator('#social-visit-depart')).toHaveText(/^(?:1\s*)?Depart$/);
});


for (const width of [390, 1280]) {
test('finder exposes terms and current/max realm levies and preserves review return position at ' + width, async function ({ page }) {
  await page.setViewportSize({ width:width, height:844 });
  await page.evaluate(function () {
    const s = FB.state;
    const row = FB.marriageCandidateQuery(s, { scope:'all', availability:'all' }).find(function (entry) {
      return !!entry.characterId;
    });
    // Fixed terms isolate the card and review navigation from marriage eligibility.
    row.status = { ready:true };
    row.threshold = 40;
    row.terms = { amount:12, playerPays:true };
    row.travel = { eligible:true, destinationId:s.player.provinceId, cost:3,
      days:9, minimumStay:90, dailyRate:0.2, standingThreshold:40,
      daysToThreshold:195, daysFromDeparture:204 };
    FB.marriageCandidateQuery = function () {
      return Array.from({ length:12 }, function (_, i) {
        return Object.assign({}, row, { key:'review-position-' + i });
      });
    };
    FB.socialVisitPreview = function () { return row.travel; };
    FB.ui.showMarriageFinder(s.player.charId);
  });
  const terms = page.locator('.finder-match-terms').nth(8);
  await expect(terms).toBeVisible();
  await expect(terms).toContainText('Requires +40');
  await expect(terms).toContainText('Travel: 9 days');
  await expect(terms).toContainText('Your house provides 12 gold');
  const details = page.locator('#finder-results .settcard-details').nth(8);
  const info = page.locator('#finder-results .settcard-info').nth(8);
  const usesDisclosure = await page.evaluate(function () {
    return window.matchMedia('(pointer: coarse), (max-width: 1100px), (max-height: 520px)').matches;
  });
  await expect(details).toBeHidden();
  if (usesDisclosure) {
    await info.click();
  } else {
    await expect(info).toBeHidden();
    await page.locator('#finder-results .settcard').nth(8).hover();
  }
  const visibleDetails = usesDisclosure ? details : page.locator('#tooltip');
  await expect(visibleDetails).toBeVisible();
  await expect(visibleDetails).toContainText('Capital:');
  await expect(visibleDetails.locator('.finder-realm-stats')).toHaveText(/^Realm levies: [0-9]+\/[0-9]+ men$/);
  await expect(visibleDetails).not.toContainText('Pop ');
  await expect(visibleDetails).not.toContainText('Econ ');
  await expect(visibleDetails.locator('p')).toHaveCount(2);
  await expect(visibleDetails).not.toContainText('alliance');
  await expect(visibleDetails).not.toContainText('Requires +40');
  const review = page.locator('[data-finder-review]').nth(8);
  await review.scrollIntoViewIfNeeded();
  await review.focus();
  const scroll = await page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; });
  expect(scroll).toBeGreaterThan(0);
  await review.click();
  await expect(page.locator('#social-visit-depart')).toBeVisible();
  await page.locator('#social-visit-cancel').click();
  await expect(terms).toBeVisible();
  await expect(details).toBeVisible({ visible:usesDisclosure });
  await expect(review).toBeFocused();
  expect(await page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; })).toBe(scroll);
  // Exercise the same saved position when the native modal history is absent.
  await review.click();
  await page.evaluate(function () {
    FB.ui.closeModal();
    FB.ui.showSocialVisit(window.discoveryChildId, { courtship:true, returnContext:{ view:'marriage-finder' } });
  });
  await page.locator('#social-visit-cancel').click();
  await expect(review).toBeFocused();
  await expect(details).toBeVisible({ visible:usesDisclosure });
  expect(await page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; })).toBe(scroll);
  await expect(page.locator('#cm-close')).toHaveCount(0);
});
}

test('finder-origin travel cancellation fallback opens finder instead of character sheet', async function ({ page }) {
  await page.evaluate(function () {
    const s = FB.state;
    FB.socialVisitPreview = function () {
      return { eligible:true, destinationId:s.player.provinceId, cost:3,
        days:9, minimumStay:90, dailyRate:0.2, standingThreshold:40,
        daysToThreshold:195, daysFromDeparture:204 };
    };
    FB.ui.showSocialVisit(window.discoveryChildId, {
      courtship:true, returnContext:{ view:'marriage-finder' }
    });
  });
  await page.locator('#social-visit-cancel').click();
  await expect(page.locator('#finder-subject')).toBeVisible();
  await expect(page.locator('#cm-close')).toHaveCount(0);
});


test('realm levy tooltip always shows both current and maximum men', async function ({ page }) {
  await page.evaluate(function () {
    FB.realmHostAvailability = function () { return { current:750, maximum:1200 }; };
    FB.ui.showMarriageFinder();
  });
  await expect(page.locator('.finder-realm-stats').first()).toHaveText('Realm levies: 750/1200 men');
  await page.evaluate(function () {
    FB.realmHostAvailability = function () { return { current:1200, maximum:1200 }; };
    FB.ui.showMarriageFinder();
  });
  await expect(page.locator('.finder-realm-stats').first()).toHaveText('Realm levies: 1200/1200 men');
});

test('dynastic sorting weighs multiple titles and current realm levies without mutations', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    const template = s.realms[Object.keys(s.realms).find(function (id) { return s.realms[id].alive && id !== 'player'; })];
    const people = {};
    ['Many', 'High', 'Low', 'None'].forEach(function (name) {
      people[name] = FB.makeCharacter(s, { name:'Sortfixture ' + name,
        sex:me.sex === 'm' ? 'f' : 'm', born:s.date.year - 20,
        culture:me.culture, religion:me.religion });
    });
    function court(id, rank, names, order, elective) {
      const members = {};
      names.forEach(function (name) {
        const c = people[name];
        members[name] = { id:name, charId:c.id, name:c.name, sex:c.sex,
          born:c.born, alive:true, parentId:null };
      });
      s.realms[id] = Object.assign({}, template, { id:id, rank:rank, liege:null,
        succession:{ members:members, order:order, heirId:order[0],
          rulerMemberId:null, papalElective:!!elective } });
    }
    court('sort-a', 2, ['Many'], ['Many', 'Many']);
    court('sort-b', 2, ['Many'], ['Many']);
    court('sort-c', 3, ['High'], ['High']);
    court('sort-d', 1, ['Low'], ['Low']);
    court('sort-e', 4, ['None'], ['None'], true);
    FB.courtshipStatus = function () { return { ready:false, reason:'Fixture' }; };
    const originalLevies = FB.realmHostAvailability;
    FB.realmHostAvailability = function (state, rid) {
      const values = { 'sort-a':100, 'sort-b':100, 'sort-c':300, 'sort-d':200, 'sort-e':0 };
      return values[rid] === undefined ? originalLevies(state, rid)
        : { current:values[rid], maximum:1000 - values[rid] };
    };
    const before = JSON.stringify(s), rng = FB.getRngState();
    function query(sort) {
      return FB.marriageCandidateQuery(s, { scope:'all', availability:'all', search:'Sortfixture', sort:sort })
        .map(function (row) { return row.characterId; });
    }
    const claims = query('claims'), alliance = query('alliance');
    return { claims:claims, alliance:alliance,
      expectedClaims:['Many', 'High', 'Low', 'None'].map(function (name) { return people[name].id; }),
      expectedAlliance:['High', 'Low', 'Many', 'None'].map(function (name) { return people[name].id; }),
      unchanged:before === JSON.stringify(s), rngSame:rng === FB.getRngState() };
  });
  expect(result.claims).toEqual(result.expectedClaims);
  expect(result.alliance).toEqual(result.expectedAlliance);
  expect(result.unchanged).toBe(true);
  expect(result.rngSame).toBe(true);
});

for (const sort of ['claims', 'alliance']) {
  test('dynastic ' + sort + ' sort follows the query and survives court review', async function ({ page }) {
    await page.evaluate(function () { FB.ui.showMarriageFinder(); });
    await page.locator('#finder-filters > summary').click();
    await page.locator('#finder-scope').selectOption('all');
    await page.locator('#finder-sort').selectOption(sort);
    const expected = await page.evaluate(function (sort) {
      return FB.marriageCandidateQuery(FB.state, { scope:'all', sort:sort }).map(function (row) { return row.key; });
    }, sort);
    expect(await page.locator('[data-finder-review]').evaluateAll(function (buttons) {
      return buttons.map(function (button) { return button.dataset.finderReview; });
    })).toEqual(expected);
    const button = page.locator('[data-finder-court]').nth(8);
    await button.scrollIntoViewIfNeeded();
    await button.focus();
    const scroll = await page.locator('#gm-body').evaluate(function (body) { return body.scrollTop; });
    await button.press('Enter');
    await page.locator('#cm-close').click();
    await expect(page.locator('#finder-sort')).toHaveValue(sort);
    await expect(button).toBeFocused();
    expect(await page.locator('#gm-body').evaluate(function (body) { return body.scrollTop; })).toBe(scroll);
  });
}
