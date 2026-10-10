'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/main.js', 'js/util.js', 'js/world.js', 'js/model.js', 'js/events.js', 'js/save.js',
  'js/ui_modals.js', 'js/ui_misc.js', 'js/portrait.js', 'data/bookmarks.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

// A bounded court matching the reported Caen ages, isolated from shared setup.
async function installCourt(page, options) {
  return page.evaluate(function (opts) {
    const s = FB.state, rid = 'sibling_bug', year = s.date.year;
    const realm = Object.assign({}, s.realms.c_caen, {
      id:rid, name:'County of Kinship', alive:true, war:null,
      ruler:{ name:'Ingelram', sex:'m', culture:'frankish', born:year - 13,
        age:13, mar:4, trait:null, generation:4 },
      succession:null
    });
    s.realms[rid] = realm;
    if (opts.mode === 'founder') return { rid:rid };
    const members = {};
    function person(key, name, sex, age, parent) {
      const id = 'royal_' + rid + '_' + key;
      const c = FB.makeCharacter(s, {
        id:FB.courtCharacterId(id), name:name, sex:sex, born:year - age,
        culture:'frankish', religion:'catholic', dyn:'of County of Kinship',
        station:4, traitsN:0, fatherId:parent && parent.charId
      });
      c.royalLine = { realmId:rid, memberId:id };
      const m = { id:id, name:name, sex:sex, born:c.born, alive:true,
        parentId:parent ? parent.id : null, childIds:[], charId:c.id, role:null };
      members[id] = m;
      if (parent) {
        parent.childIds.push(id);
        s.chars[parent.charId].childrenIds.push(c.id);
      }
      return m;
    }
    const father = person('g1_ruler', 'Boso', 'm', 35, null);
    const successor = person('g3_heir0', 'Ingelram', 'm', 13, father);
    const order = [];
    let sibling = null, extra = null;
    if (opts.mode === 'accession') {
      sibling = person('g1_child1', opts.sex === 'm' ? 'Himilbert' : 'Himiltrude',
        opts.sex, 3, father);
      extra = person('g1_child2', 'Rigunth', 'f', 1, father);
      order.push(successor.id, sibling.id, extra.id);
      realm.ruler = { name:'Boso', sex:'m', culture:'frankish', born:father.born,
        age:35, mar:4, trait:null, generation:3 };
    } else {
      father.alive = false;
      s.chars[father.charId].dead = true;
      s.chars[father.charId].died = year;
      if (opts.parentless) {
        successor.parentId = null;
        s.chars[successor.charId].fatherId = null;
        father.childIds = [];
        s.chars[father.charId].childrenIds = [];
      }
      if (opts.mode === 'damaged') {
        sibling = person('g4_heir0', 'Himiltrude', 'f', 3, successor);
        order.push(sibling.id);
      }
    }
    realm.succession = {
      rulerGeneration:realm.ruler.generation,
      rulerMemberId:opts.mode === 'accession' ? father.id : successor.id,
      members:members, order:order, heirId:order[0] || null
    };
    FB.touchFamily();
    FB.rebuildRulerIndex(s);
    return { rid:rid, father:father.charId, successor:successor.charId,
      sibling:sibling && sibling.charId, extra:extra && extra.charId,
      fatherMember:father.id, successorMember:successor.id,
      siblingMember:sibling && sibling.id };
  }, options);
}

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () { FB.game.setPaused(true); });
});

for (const layout of [{ width:390, sex:'m' }, { width:1280, sex:'f' }]) {
  test('court chips identify the ruler’s consort without implying a sibling marriage at ' + layout.width,
    async function ({ page }) {
      await page.setViewportSize({ width:layout.width, height:844 });
      const ids = await installCourt(page, { mode:'accession', sex:'f' });
      const court = await page.evaluate(function (setup) {
        const s = FB.state, ids = setup.ids, su = s.realms[ids.rid].succession;
        function age(cid, mid, years) {
          s.chars[cid].born = s.date.year - years;
          su.members[mid].born = s.chars[cid].born;
        }
        age(ids.father, ids.fatherMember, 65);
        age(ids.successor, ids.successorMember, 18);
        age(ids.sibling, ids.siblingMember, 7);
        const ruler = s.chars[ids.successor];
        ruler.sex = setup.sex;
        ruler.name = setup.sex === 'm' ? 'Ingelram' : 'Ingeltrude';
        su.members[ids.successorMember].sex = ruler.sex;
        su.members[ids.successorMember].name = ruler.name;
        s.realms[ids.rid].ruler.born = s.chars[ids.father].born;
        s.realms[ids.rid].ruler.age = 65;
        FB.killChar(s, s.chars[ids.father]);
        const consort = FB.realmConsortCharacter(s, ids.rid);
        return { consort:consort.id, consortAge:FB.ageOf(consort, s.date.year) };
      }, { ids:ids, sex:layout.sex });
      const rulerName = layout.sex === 'm' ? 'Count Ingelram' : 'Countess Ingeltrude';
      const before = await page.evaluate(function (ids) {
        return { save:FB.save.serialize(), rng:FB.getRngState(),
          siblingSpouses:FB.spousesSnapshot(FB.state, FB.state.chars[ids.sibling]).length };
      }, ids);
      expect(before.siblingSpouses).toBe(0);
      await page.evaluate(function (rid) { FB.ui.showLiegeModal(rid); }, ids.rid);
      const link = function (cid) {
        return page.locator('[data-realm-family-cid="' + cid + '"]');
      };
      await expect(link(court.consort).locator('.frel')).toHaveText(
        (layout.sex === 'm' ? 'Wife' : 'Husband') + ' · age ' + court.consortAge);
      await expect(link(ids.sibling).locator('.frel')).toHaveText('Sister · Heir · age 7');
      await link(ids.sibling).click();
      await expect(link(court.consort).locator('.frel')).toHaveText(
        'Consort of ' + rulerName + ' · age ' + court.consortAge);
      await expect(link(ids.successor).locator('.frel')).toHaveText(
        (layout.sex === 'm' ? 'Brother' : 'Sister') + ' · age 18');
      await link(court.consort).click();
      await expect(link(ids.successor).locator('.frel')).toHaveText(
        (layout.sex === 'm' ? 'Husband' : 'Wife') + ' · age 18');
      await expect(link(ids.sibling).locator('.frel')).toHaveText(
        'Sister of ' + rulerName + ' · Heir · age 7');
      await link(ids.successor).click();
      await expect(link(court.consort).locator('.frel')).toHaveText(
        (layout.sex === 'm' ? 'Wife' : 'Husband') + ' · age ' + court.consortAge);
      expect(await page.evaluate(function (ids) {
        return { save:FB.save.serialize(), rng:FB.getRngState(),
          siblingSpouses:FB.spousesSnapshot(FB.state, FB.state.chars[ids.sibling]).length };
      }, ids)).toEqual(before);
    });
}

for (const width of [390, 1280]) {
  test('pledged and direct royal profiles retain court family and return navigation at ' + width,
    async function ({ page }) {
      await page.setViewportSize({ width:width, height:600 });
      const ids = await installCourt(page, { mode:'accession', sex:'m' });
      const pledgeId = await page.evaluate(function (ids) {
        const s = FB.state;
        FB.killChar(s, s.chars[ids.father]);
        const me = s.chars[s.player.charId];
        const pledged = FB.makeCharacter(s, {
          name:'Pledged Contact', sex:'f', born:s.date.year - 24, station:1,
          culture:me.culture, religion:me.religion, traitsN:0
        });
        pledged.betrothedId = ids.sibling;
        s.chars[ids.sibling].betrothedId = pledged.id;
        FB.touchFamily();
        return pledged.id;
      }, ids);
      const before = await page.evaluate(function () {
        return { save:FB.save.serialize(), rng:FB.getRngState() };
      });
      await page.evaluate(function (id) { FB.ui.showCharModal(id); }, pledgeId);
      const pledge = page.locator('[data-interaction-commitment="betrothal"] ' +
        '[data-interaction-character="' + ids.sibling + '"]');
      await pledge.focus();
      const originScroll = await page.locator('#gm-body').evaluate(function (body) {
        body.scrollTop += 50;
        return body.scrollTop;
      });
      expect(originScroll).toBeGreaterThan(0);
      await page.keyboard.press('Enter');
      const link = function (id) {
        return page.locator('[data-realm-family-cid="' + id + '"]');
      };
      await expect(link(ids.successor).locator('.frel')).toHaveText('Brother · age 13');
      await expect(link(ids.extra).locator('.frel')).toHaveText('Sister · age 1');
      await expect(page.locator('[data-social-access-route]')).toBeVisible();
      const title = await page.locator('#gm-title').innerText();
      const family = await page.locator('.court-strip').innerText();
      await expect(page.locator('#cm-close')).toHaveText('Back');
      await page.locator('#cm-close').click();
      await expect(pledge).toBeFocused();
      expect(await page.locator('#gm-body').evaluate(function (body) {
        return body.scrollTop;
      })).toBeCloseTo(originScroll, 0);

      await page.locator('#cm-close').click();
      await page.evaluate(function (id) { FB.ui.showCharModal(id); }, ids.sibling);
      await expect(page.locator('#gm-title')).toHaveText(title);
      await expect(page.locator('.court-strip')).toHaveText(family);
      await link(ids.extra).focus();
      const familyScroll = await page.locator('#gm-body').evaluate(function (body) {
        return body.scrollTop;
      });
      await page.keyboard.press('Enter');
      await expect(link(ids.sibling).locator('.frel')).toContainText('Brother');
      await page.locator('#cm-close').click();
      await expect(link(ids.extra)).toBeFocused();
      expect(await page.locator('#gm-body').evaluate(function (body) {
        return body.scrollTop;
      })).toBeCloseTo(familyScroll, 0);

      await page.locator('#cm-close').click();
      await page.evaluate(function (rid) { FB.ui.showLiegeModal(rid); }, ids.rid);
      await link(ids.sibling).click();
      await expect(page.locator('#gm-title')).toHaveText(title);
      await expect(page.locator('.court-strip')).toHaveText(family);
      expect(await page.evaluate(function () {
        return { save:FB.save.serialize(), rng:FB.getRngState() };
      })).toEqual(before);
    });
}

for (const sex of ['m', 'f']) {
  test('a ' + (sex === 'm' ? 'brother' : 'sister') +
    ' remains a sibling heir after the father dies', async function ({ page }) {
    await page.setViewportSize({ width:sex === 'f' ? 390 : 1280, height:844 });
    const ids = await installCourt(page, { mode:'accession', sex:sex });
    expect(await page.evaluate(function (ids) {
      const s = FB.state;
      FB.killChar(s, s.chars[ids.father]);
      const su = s.realms[ids.rid].succession;
      return { ruler:FB.realmRulerCharacterSnapshot(s, ids.rid).id,
        heir:su.members[su.heirId].charId,
        siblingFather:s.chars[ids.sibling].fatherId,
        siblingParent:su.members[ids.siblingMember].parentId,
        rulerChildren:FB.childrenOf(s, s.chars[ids.successor]).map(function (c) {
          return c.id;
        }) };
    }, ids)).toEqual({ ruler:ids.successor, heir:ids.sibling,
      siblingFather:ids.father, siblingParent:ids.fatherMember, rulerChildren:[] });

    const before = await page.evaluate(function () { return FB.save.serialize(); });
    await page.evaluate(function (ids) { FB.ui.showLiegeModal(ids.rid); }, ids);
    const strip = page.locator('.character-interaction-modal .court-strip');
    const sibling = strip.locator('[data-realm-family-cid="' + ids.sibling + '"]');
    await expect(sibling.locator('.frel')).toHaveText(
      (sex === 'm' ? 'Brother' : 'Sister') + ' · Heir · age 3');
    await expect(strip.locator('[data-realm-family-cid="' + ids.extra + '"] .frel'))
      .toHaveText('Sister · age 1');
    await sibling.click();
    await expect(strip.locator('[data-realm-family-cid="' + ids.successor + '"] .frel'))
      .toHaveText('Brother · age 13');
    await expect(strip).not.toContainText('Father');
    await expect(strip).not.toContainText('Daughter');
    await strip.locator('[data-realm-family-cid="' + ids.successor + '"]').click();
    await expect(sibling.locator('.frel')).toContainText('Heir');
    expect(await page.evaluate(function () { return FB.save.serialize(); })).toBe(before);
  });
}

for (const parentless of [false, true]) {
  test('an heirless minor gets a ' + (parentless ? 'parentless collateral' : 'sibling') +
    ' rather than a child', async function ({ page }) {
    const ids = await installCourt(page, { mode:'empty', parentless:parentless });
    const result = await page.evaluate(function (ids) {
      const s = FB.state, rng = FB.getRngState();
      FB.ensureRealmCourt(s, ids.rid);
      const su = s.realms[ids.rid].succession, m = su.members[su.heirId];
      const c = s.chars[m.charId], ruler = s.chars[ids.successor];
      return { parent:m.parentId, father:c.fatherId, mother:c.motherId,
        children:FB.childrenOf(s, ruler).map(function (child) { return child.id; }),
        degree:FB.kinshipDegreeSnapshot(s, ruler, c),
        age:FB.ageOf(c, s.date.year), rngUnchanged:FB.getRngState() === rng };
    }, ids);
    expect(result).toMatchObject({
      parent:parentless ? null : ids.fatherMember,
      father:parentless ? null : ids.father, mother:null, children:[],
      degree:parentless ? 'unrelated' : 'half_sibling', rngUnchanged:true
    });
    expect(result.age).toBeGreaterThanOrEqual(0);
    expect(result.age).toBeLessThanOrEqual(8);
  });
}

test('a newly seeded minor ruler has no invented children', async function ({ page }) {
  const ids = await installCourt(page, { mode:'founder' });
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    FB.ensureRealmCourt(s, ids.rid);
    const ruler = FB.realmRulerCharacterSnapshot(s, ids.rid);
    return { age:FB.ageOf(ruler, s.date.year), children:FB.childrenOf(s, ruler).length,
      heirs:FB.realmFamilySnapshot(s, ids.rid).length,
      allParentless:FB.realmFamilySnapshot(s, ids.rid).every(function (m) {
        return m.parentId === null;
      }) };
  }, ids);
  expect(result).toMatchObject({ age:13, children:0, allParentless:true });
  expect(result.heirs).toBeGreaterThanOrEqual(2);
  expect(result.heirs).toBeLessThanOrEqual(4);
});

test('a fallback sibling is not born after their recorded parent died',
  async function ({ page }) {
    const ids = await installCourt(page, { mode:'empty' });
    const result = await page.evaluate(function (ids) {
      const s = FB.state, su = s.realms[ids.rid].succession;
      su.members[ids.fatherMember].died = s.date.year - 12;
      s.chars[ids.father].died = s.date.year - 12;
      FB.ensureRealmCourt(s, ids.rid);
      const m = su.members[su.heirId];
      return { parent:m.parentId, born:m.born, died:su.members[ids.fatherMember].died,
        rulerChildren:FB.childrenOf(s, s.chars[ids.successor]).length };
    }, ids);
    expect(result.parent).toBe(ids.fatherMember);
    expect(result.born).toBeLessThanOrEqual(result.died);
    expect(result.rulerChildren).toBe(0);
  });

test('mixed court branches keep parents, children, nieces and cousins distinct',
  async function ({ page }) {
    const ids = await installCourt(page, { mode:'accession', sex:'f' });
    const relatives = await page.evaluate(function (ids) {
      const s = FB.state, su = s.realms[ids.rid].succession;
      function age(cid, memberId, years) {
        s.chars[cid].born = s.date.year - years;
        su.members[memberId].born = s.chars[cid].born;
      }
      age(ids.father, ids.fatherMember, 65);
      age(ids.successor, ids.successorMember, 32);
      age(ids.sibling, ids.siblingMember, 30);
      s.realms[ids.rid].ruler.born = s.chars[ids.father].born;
      s.realms[ids.rid].ruler.age = 65;
      FB.killChar(s, s.chars[ids.father]);
      const ruler = s.chars[ids.successor], sibling = s.chars[ids.sibling];
      const consort = FB.realmConsortCharacter(s, ids.rid);
      const child = FB.makeCharacter(s, { name:'Child fixture', sex:'f',
        born:s.date.year - 2, fatherId:ruler.id, motherId:consort.id,
        culture:ruler.culture, religion:ruler.religion, traitsN:0 });
      ruler.childrenIds.push(child.id); consort.childrenIds.push(child.id);
      FB.registerRoyalBirth(s, child, ruler, consort);
      const niece = FB.makeCharacter(s, { name:'Niece fixture', sex:'f',
        born:s.date.year - 5, motherId:sibling.id,
        culture:ruler.culture, religion:ruler.religion, traitsN:0 });
      sibling.childrenIds.push(niece.id);
      FB.registerRoyalBirth(s, niece, null, sibling);
      // Keep the niece visible beside her living mother in the bounded court.
      su.order.push(niece.royalLine.memberId);
      FB.refreshRealmSuccession(s, ids.rid);
      FB.touchFamily();
      FB.ui.showLiegeModal(ids.rid);
      return { child:child.id, niece:niece.id, consort:consort.id };
    }, ids);
    const link = function (cid) {
      return page.locator('.court-strip [data-realm-family-cid="' + cid + '"]');
    };
    await expect(link(relatives.child).locator('.frel')).toHaveText('Daughter · Heir · age 2');
    await expect(link(relatives.niece).locator('.frel')).toHaveText('Niece · age 5');
    await link(relatives.child).click();
    await expect(link(ids.successor).locator('.frel')).toHaveText('Father · age 32');
    await expect(link(relatives.consort).locator('.frel')).toContainText('Mother');
    await expect(link(ids.sibling).locator('.frel')).toHaveText('Aunt · age 30');
    await expect(link(relatives.niece).locator('.frel')).toHaveText('Cousin · age 5');
    await link(relatives.niece).click();
    await expect(link(ids.successor).locator('.frel')).toHaveText('Uncle · age 32');
    await expect(link(ids.sibling).locator('.frel')).toHaveText('Mother · age 30');
    await expect(link(relatives.child).locator('.frel')).toHaveText('Cousin · Heir · age 2');
  });

test('restore repairs the generated minor-parent link without replacing the heir',
  async function ({ page }) {
    const ids = await installCourt(page, { mode:'damaged' });
    const result = await page.evaluate(function (ids) {
      const s = FB.state, ruler = s.chars[ids.successor];
      const adopted = FB.makeCharacter(s, { name:'Adopted fixture', sex:'m',
        born:s.date.year, culture:ruler.culture, religion:ruler.religion, traitsN:0 });
      ruler.childrenIds.push(adopted.id);
      const biological = FB.makeCharacter(s, { name:'Recorded birth fixture', sex:'f',
        born:s.date.year - 1, fatherId:ruler.id, culture:ruler.culture,
        religion:ruler.religion, traitsN:0 });
      ruler.childrenIds.push(biological.id);
      FB.registerRoyalBirth(s, biological, ruler, null);
      // Leave the generated heir first to reproduce the attached save.
      s.realms[ids.rid].succession.order = [ids.siblingMember, biological.royalLine.memberId];
      s.realms[ids.rid].succession.heirId = ids.siblingMember;
      FB.touchFamily();
      const heirBefore = Object.assign({}, s.chars[ids.sibling]);
      const data = JSON.parse(FB.save.serialize());
      const restored = FB.save.restore(data);
      const after = FB.state, su = after.realms[ids.rid].succession;
      const restoreRngUnchanged = FB.getRngState() === data.rng;
      const restoreUidUnchanged = FB.getUidCounter() === data.uid;
      const heir = after.chars[ids.sibling];
      const first = FB.save.serialize(), rng = FB.getRngState(), uid = FB.getUidCounter();
      FB.ensureDynasticState(after);
      return { restored:restored === after, heir:su.members[su.heirId].charId,
        parent:su.members[ids.siblingMember].parentId, father:heir.fatherId,
        name:heir.name, born:heir.born, sameIdentity:heir.name === heirBefore.name &&
          heir.born === heirBefore.born && JSON.stringify(heir.skills) === JSON.stringify(heirBefore.skills),
        rulerListsHeir:after.chars[ids.successor].childrenIds.indexOf(heir.id) >= 0,
        fatherListsHeir:after.chars[ids.father].childrenIds.indexOf(heir.id) >= 0,
        adoptionPreserved:after.chars[ids.successor].childrenIds.indexOf(adopted.id) >= 0 &&
          !after.chars[adopted.id].fatherId && !after.chars[adopted.id].motherId,
        birthPreserved:after.chars[biological.id].fatherId === ruler.id &&
          su.members[biological.royalLine.memberId].parentId === ids.successorMember,
        restoreRngUnchanged:restoreRngUnchanged, restoreUidUnchanged:restoreUidUnchanged,
        idempotent:FB.save.serialize() === first,
        rngUnchanged:FB.getRngState() === rng, uidUnchanged:FB.getUidCounter() === uid };
    }, ids);
    expect(result).toMatchObject({ restored:true, heir:ids.sibling,
      parent:ids.fatherMember, father:ids.father, sameIdentity:true,
      rulerListsHeir:false, fatherListsHeir:true, adoptionPreserved:true,
      birthPreserved:true, restoreRngUnchanged:true, restoreUidUnchanged:true,
      idempotent:true, rngUnchanged:true, uidUnchanged:true });
  });

test('repair and sibling labels survive a compacted dead parent', async function ({ page }) {
  const ids = await installCourt(page, { mode:'damaged' });
  expect(await page.evaluate(function (ids) {
    const s = FB.state, su = s.realms[ids.rid].succession;
    delete s.chars[ids.father];
    su.members[ids.fatherMember].charId = null;
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.touchFamily();
    FB.ensureDynasticState(s);
    const c = s.chars[ids.sibling];
    FB.ui.showLiegeModal(ids.rid);
    return { parent:su.members[ids.siblingMember].parentId,
      father:c.fatherId, mother:c.motherId,
      children:FB.childrenOf(s, s.chars[ids.successor]).length,
      ancestorStillCompacted:!s.chars[ids.father],
      rngUnchanged:FB.getRngState() === rng, uidUnchanged:FB.getUidCounter() === uid };
  }, ids)).toEqual({ parent:ids.fatherMember, father:null, mother:null,
    children:0, ancestorStillCompacted:true, rngUnchanged:true, uidUnchanged:true });
  const link = function (cid) {
    return page.locator('.court-strip [data-realm-family-cid="' + cid + '"]');
  };
  await expect(link(ids.sibling).locator('.frel')).toHaveText('Sister · Heir · age 3');
  await link(ids.sibling).click();
  await expect(link(ids.successor).locator('.frel')).toHaveText('Brother · age 13');
});

test('a stale compact child backlink cannot turn a sibling into a child',
  async function ({ page }) {
    const ids = await installCourt(page, { mode:'accession', sex:'f' });
    expect(await page.evaluate(function (ids) {
      const s = FB.state;
      FB.killChar(s, s.chars[ids.father]);
      const su = s.realms[ids.rid].succession;
      su.members[ids.successorMember].childIds.push(ids.siblingMember);
      FB.materializeRealmRuler(s, ids.rid);
      return { parent:su.members[ids.siblingMember].parentId,
        father:s.chars[ids.sibling].fatherId,
        children:FB.childrenOf(s, s.chars[ids.successor]).length };
    }, ids)).toEqual({ parent:ids.fatherMember, father:ids.father, children:0 });
  });

// The spouse is already a real person before the sibling takes the county.
async function installPlayerMarriageAccession(page, options) {
  const ids = await installCourt(page, { mode:'accession', sex:options.sex });
  return page.evaluate(function (setup) {
    const ids = setup.ids, opts = setup.options, s = FB.state;
    const realm = s.realms[ids.rid], su = realm.succession;
    const me = s.chars[s.player.charId], spouse = s.chars[ids.sibling];
    me.sex = opts.sex === 'f' ? 'm' : 'f';
    me.born = s.date.year - 28;
    me.dyn = 'Player House';
    for (const record of [[ids.father, ids.fatherMember, 65],
        [ids.successor, ids.successorMember, 32],
        [ids.sibling, ids.siblingMember, 26]]) {
      s.chars[record[0]].born = s.date.year - record[2];
      su.members[record[1]].born = s.chars[record[0]].born;
    }
    realm.ruler.born = s.chars[ids.father].born;
    realm.ruler.age = 65;
    s.chars[ids.extra].dead = true;
    su.members[s.chars[ids.extra].royalLine.memberId].alive = false;
    su.order = [ids.successorMember, ids.siblingMember];
    FB.touchFamily();
    FB.killChar(s, s.chars[ids.father]);
    me.spouseId = spouse.id;
    spouse.spouseId = me.id;
    s.roles.spouse = spouse.id;
    FB.touchFamily();
    let child = null;
    if (opts.childBefore) {
      child = FB.makeCharacter(s, { name:'Richar', sex:'m', born:s.date.year - 1,
        fatherId:me.sex === 'm' ? me.id : spouse.id,
        motherId:me.sex === 'f' ? me.id : spouse.id,
        dyn:me.dyn, culture:me.culture, religion:me.religion, traitsN:0 });
      me.childrenIds.push(child.id);
      spouse.childrenIds.push(child.id);
      FB.registerRoyalBirth(s, child, s.chars[child.fatherId], s.chars[child.motherId]);
      FB.touchFamily();
    }
    FB.killChar(s, s.chars[ids.successor]);
    FB.ensureRealmCourt(s, ids.rid);
    return Object.assign(ids, { player:me.id, spouse:spouse.id,
      child:child && child.id, heir:su.members[su.heirId].charId });
  }, { ids:ids, options:options });
}

for (const sex of ['f', 'm']) {
  test('a married ' + sex + ' successor gets no invented child and real births take priority',
    async function ({ page }) {
      const ids = await installPlayerMarriageAccession(page, { sex:sex });
      const result = await page.evaluate(function (ids) {
        const s = FB.state, me = s.chars[ids.player], spouse = s.chars[ids.spouse];
        const su = s.realms[ids.rid].succession, fallback = su.members[su.heirId];
        const initial = {
          ruler:FB.realmRulerCharacterSnapshot(s, ids.rid).id,
          consort:FB.realmConsortCharacter(s, ids.rid).id,
          compactConsort:FB.realmConsortMember(s, ids.rid),
          parent:fallback.parentId,
          father:s.chars[ids.heir].fatherId, mother:s.chars[ids.heir].motherId,
          spouseChildren:FB.childrenOf(s, spouse).length,
          playerChildren:FB.childrenOf(s, me).length
        };
        const before = FB.save.serialize(), rng = FB.getRngState(), uid = FB.getUidCounter();
        FB.refreshRealmSuccession(s, ids.rid);
        const unchanged = before === FB.save.serialize() &&
          rng === FB.getRngState() && uid === FB.getUidCounter();
        const child = FB.makeCharacter(s, { name:'Recorded daughter', sex:'f',
          born:s.date.year, fatherId:me.sex === 'm' ? me.id : spouse.id,
          motherId:me.sex === 'f' ? me.id : spouse.id, dyn:me.dyn,
          culture:me.culture, religion:me.religion, traitsN:0 });
        me.childrenIds.push(child.id); spouse.childrenIds.push(child.id);
        FB.registerRoyalBirth(s, child, s.chars[child.fatherId], s.chars[child.motherId]);
        FB.touchFamily();
        const actualHeir = su.members[su.heirId].charId;
        const data = JSON.parse(FB.save.serialize());
        FB.save.restore(data);
        const after = FB.state, restored = after.realms[ids.rid].succession;
        return { initial:initial, unchanged:unchanged, child:child.id,
          actualHeir:actualHeir, restoredHeir:restored.members[restored.heirId].charId,
          parents:[after.chars[child.id].fatherId, after.chars[child.id].motherId],
          expectedParents:[child.fatherId, child.motherId],
          restoredConsort:FB.realmConsortCharacter(after, ids.rid).id,
          fallbackParent:restored.members[fallback.id].parentId };
      }, ids);
      expect(result.initial).toEqual({ ruler:ids.spouse, consort:ids.player,
        compactConsort:null, parent:null, father:null, mother:null,
        spouseChildren:0, playerChildren:0 });
      expect(result.unchanged).toBe(true);
      expect(result.actualHeir).toBe(result.child);
      expect(result.restoredHeir).toBe(result.child);
      expect(result.parents).toEqual(result.expectedParents);
      expect(result.restoredConsort).toBe(ids.player);
      expect(result.fallbackParent).toBeNull();
    });
}

for (const width of [390, 1280]) {
  test('an existing player consort appears as spouse and parent with retained Back at ' + width,
    async function ({ page }) {
      await page.setViewportSize({ width:width, height:600 });
      const ids = await installPlayerMarriageAccession(page, { sex:'f', childBefore:true });
      expect(ids.heir).toBe(ids.child);
      const before = await page.evaluate(function () {
        return { save:FB.save.serialize(), rng:FB.getRngState(), uid:FB.getUidCounter() };
      });
      const link = function (cid) {
        return page.locator('.court-strip [data-realm-family-cid="' + cid + '"]');
      };
      await page.evaluate(function (rid) { FB.ui.showLiegeModal(rid); }, ids.rid);
      await expect(link(ids.player)).toHaveCount(1);
      await expect(link(ids.player).locator('.frel')).toHaveText('Husband · age 28');
      await expect(link(ids.child).locator('.frel')).toHaveText('Son · Heir · age 1');
      await link(ids.child).click();
      await expect(link(ids.player).locator('.frel')).toHaveText('Father · age 28');
      await expect(link(ids.spouse).locator('.frel')).toHaveText('Mother · age 26');
      // Direct profiles retain their own Back chain; the realm navigator
      // intentionally replaces its currently selected court member.
      await page.evaluate(function (cid) {
        FB.ui.closeModal(); FB.ui.showCharModal(cid);
      }, ids.child);
      await link(ids.player).focus();
      const scroll = await page.locator('#gm-body').evaluate(function (body) {
        return body.scrollTop;
      });
      await page.keyboard.press('Enter');
      await expect(page.locator('#gm-title')).toContainText('Player House');
      await page.locator('#cm-close').click();
      await expect(link(ids.player)).toBeFocused();
      expect(await page.locator('#gm-body').evaluate(function (body) {
        return body.scrollTop;
      })).toBeCloseTo(scroll, 0);
      expect(await page.evaluate(function () {
        return { save:FB.save.serialize(), rng:FB.getRngState(), uid:FB.getUidCounter() };
      })).toEqual(before);
    });
}

test('consort snapshots follow an existing marriage, not a stale generated reservation',
  async function ({ page }) {
    const ids = await installCourt(page, { mode:'accession', sex:'f' });
    const result = await page.evaluate(function (ids) {
      const s = FB.state;
      s.chars[ids.successor].born = s.date.year - 25;
      s.realms[ids.rid].succession.members[ids.successorMember].born =
        s.chars[ids.successor].born;
      FB.killChar(s, s.chars[ids.father]);
      const ruler = s.chars[ids.successor], old = FB.realmConsortCharacter(s, ids.rid);
      const me = s.chars[s.player.charId];
      ruler.spouseId = me.id; me.spouseId = ruler.id;
      FB.touchFamily();
      const before = FB.save.serialize();
      const current = FB.realmConsortCharacter(s, ids.rid);
      const pure = before === FB.save.serialize();
      me.dead = true;
      const afterDeath = FB.realmConsortCharacter(s, ids.rid);
      me.dead = false; ruler.spouseId = null; me.spouseId = null;
      const afterDivorce = FB.realmConsortCharacter(s, ids.rid);
      return { hasOld:!!old, current:current.id, expected:me.id,
        pure:pure, afterDeath:afterDeath, afterDivorce:afterDivorce };
    }, ids);
    expect(result).toEqual({ hasOld:true, current:result.expected, expected:result.expected,
      pure:true, afterDeath:null, afterDivorce:null });
  });

for (const connection of ['child', 'child-spouse', 'pledge', 'unrelated']) {
  test('empty-line repair respects a ruler’s ' + connection + ' connection to the player',
    async function ({ page }) {
      const ids = await installCourt(page, { mode:'empty', parentless:true });
      const result = await page.evaluate(function (setup) {
        const s = FB.state, ids = setup.ids, su = s.realms[ids.rid].succession;
        const ruler = s.chars[ids.successor], me = s.chars[s.player.charId];
        me.sex = 'm'; me.born = s.date.year - 60;
        ruler.born = s.date.year - 26;
        su.members[ids.successorMember].born = ruler.born;
        s.realms[ids.rid].ruler.born = ruler.born;
        s.realms[ids.rid].ruler.age = 26;
        if (setup.connection === 'child') {
          ruler.fatherId = me.id; me.childrenIds.push(ruler.id);
        } else if (setup.connection === 'child-spouse') {
          const child = FB.makeCharacter(s, { name:'Married daughter', sex:'f',
            born:s.date.year - 26, fatherId:me.id, culture:me.culture,
            religion:me.religion, traitsN:0 });
          me.childrenIds.push(child.id);
          ruler.spouseId = child.id; child.spouseId = ruler.id;
        } else if (setup.connection === 'pledge') {
          ruler.betrothedId = me.id; me.betrothedId = ruler.id;
        }
        FB.touchFamily();
        FB.ensureRealmCourt(s, ids.rid);
        const heir = su.members[su.heirId];
        return { parent:heir.parentId, children:FB.childrenOf(s, ruler).length };
      }, { ids:ids, connection:connection });
      expect(result).toEqual(connection === 'unrelated'
        ? { parent:ids.successorMember, children:1 }
        : { parent:null, children:0 });
    });
}

test('a childless player spouse’s court fallback can still inherit', async function ({ page }) {
  const ids = await installPlayerMarriageAccession(page, { sex:'f' });
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    FB.killChar(s, s.chars[ids.spouse]);
    const ruler = FB.realmRulerCharacterSnapshot(s, ids.rid);
    return { ruler:ruler && ruler.id, alive:ruler && !ruler.dead,
      father:s.chars[ids.heir].fatherId, mother:s.chars[ids.heir].motherId };
  }, ids);
  expect(result).toEqual({ ruler:ids.heir, alive:true, father:null, mother:null });
});

test('restore preserves an old generated child without inventing a second biological parent',
  async function ({ page }) {
    const ids = await installPlayerMarriageAccession(page, { sex:'f' });
    const result = await page.evaluate(function (ids) {
      const s = FB.state, su = s.realms[ids.rid].succession;
      const m = su.members[su.heirId], c = s.chars[ids.heir];
      const mother = s.chars[ids.spouse];
      // Reproduce the reported pre-fix save, preserving its existing person.
      m.parentId = su.rulerMemberId;
      su.members[su.rulerMemberId].childIds.push(m.id);
      c.motherId = mother.id; mother.childrenIds.push(c.id);
      FB.touchFamily();
      const identity = { name:c.name, born:c.born, dyn:c.dyn };
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const after = FB.state, restored = after.chars[ids.heir];
      const line = after.realms[ids.rid].succession;
      return { identity:{ name:restored.name, born:restored.born, dyn:restored.dyn },
        expectedIdentity:identity, father:restored.fatherId, mother:restored.motherId,
        heir:line.members[line.heirId].charId,
        consort:FB.realmConsortCharacter(after, ids.rid).id };
    }, ids);
    expect(result.identity).toEqual(result.expectedIdentity);
    expect(result).toMatchObject({ father:null, mother:ids.spouse,
      heir:ids.heir, consort:ids.player });
  });
