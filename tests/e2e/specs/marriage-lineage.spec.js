'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/localfolk.js', 'data/cultures.js', 'data/counties.js', 'data/bookmarks.js', 'data/map_data.js',
  'data/technology.js', 'js/model.js', 'js/events.js', 'js/actions.js',
  'js/main.js', 'js/world.js', 'js/agency.js', 'js/save.js', 'js/travel.js',
  'js/ui_modals.js', 'js/ui_misc.js', 'js/population.js', 'css/style.css'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('maternal reform and adoption require contact, and learned custom survives loss of its source', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player, head = s.chars[p.charId];
    head.culture = 'coptic'; p.prestige = 5000; p.piety = 5000;
    p.cooldowns = {}; p.war = null;
    const before = JSON.stringify(s);
    const blocked = FB.doctrineReformStatus(s, 'culture', 'marriage_lineage', 'maternal');
    const adoption = FB.conversionStatus(s, 'culture', 'nubian', 'self');
    const pure = JSON.stringify(s) === before;
    // Affinity, a campaign culture, and an old visit are not contact evidence.
    const branch = FB.createCulture(s, { name:'Remote custom', parent:'coptic',
      doctrines:{ matrilinealMarriage:true } });
    p.visitedProvinces = ['dongola']; p.encounteredCultures = { nubian:1 };
    const shortcut = FB.conversionStatus(s, 'culture', branch, 'self').ok;
    const contact = FB.makeCharacter(s, { sex:'m', culture:'nubian', religion:head.religion,
      born:s.date.year - 25, traitsN:0 });
    p.network = p.network || {}; p.network[contact.id] = 1;
    const available = FB.doctrineReformStatus(s, 'culture', 'marriage_lineage', 'maternal');
    FB.learnMaternalCustoms(s);
    delete p.network[contact.id]; contact.dead = true;
    const retained = FB.doctrineReformStatus(s, 'culture', 'marriage_lineage', 'maternal');
    return { blocked:blocked.ok, adoption:adoption.ok, pure:pure, shortcut:shortcut,
      available:available.ok, cost:available.prestigeCost, retained:retained.ok,
      knowledge:s.maternalCustomKnowledge.nubian };
  });
  expect(result).toMatchObject({ blocked:false, adoption:false, pure:true,
    shortcut:false, available:true, cost:300, retained:true });
  expect(result.knowledge).toMatchObject({ cultureId:'nubian', source:'network' });
});

test('both partners agree, contracts freeze per couple, and legacy unions remain untouched', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, head = s.chars[s.player.charId];
    head.sex = 'f'; head.culture = 'nubian'; head.dyn = 'Mother House';
    const partner = FB.makeCharacter(s, { sex:'m', culture:'coptic', religion:head.religion,
      born:s.date.year - 25, dyn:'Father House', traitsN:0 });
    const blocked = FB.sealMarriageLineage(s, head, partner, 'maternal');
    partner.culture = 'nubian';
    const preview = FB.childIdentityPreview(s, head, partner, true, 'maternal');
    FB.sealMarriageLineage(s, head, partner, 'maternal');
    head.betrothedId = partner.id; partner.betrothedId = head.id;
    head.culture = 'coptic'; partner.culture = 'german';
    const frozen = FB.marriageLineageStatus(s, head, partner, 'paternal');
    FB.doKinWedding(s, head, partner);
    const bornHouse = FB.childDynastySource(s, head, partner, true).dyn;
    const other = FB.makeCharacter(s, { sex:'m', culture:'coptic', religion:head.religion,
      born:s.date.year - 25, dyn:'Other House', traitsN:0 });
    FB.sealMarriageLineage(s, head, other, 'paternal'); other.spouseId = head.id;
    const plural = FB.childDynastySource(s, head, other, true).dyn;
    const legacy = FB.makeCharacter(s, { sex:'m', culture:'nubian', religion:head.religion,
      born:s.date.year - 25, dyn:'Legacy Father', traitsN:0 });
    legacy.spouseId = head.id;
    const before = JSON.stringify(s);
    const oldPreview = FB.childIdentityPreview(s, head, legacy, true);
    const pure = before === JSON.stringify(s);
    return { blocked:blocked, preview:preview.dynasty, bornHouse:bornHouse,
      frozen:frozen, plural:plural, legacy:oldPreview.dynasty, pure:pure };
  });
  expect(result).toMatchObject({ blocked:false, preview:'Mother House', bornHouse:'Mother House',
    frozen:{ frozen:true, lineage:'maternal', ok:true }, plural:'Other House',
    legacy:'Mother House', pure:true });
});

test('paternal conception snapshots survive remarriage, a new protagonist, and save restore', async function ({ page }) {
  const result = await page.evaluate(function () {
    let s = FB.state, head = s.chars[s.player.charId];
    head.sex = 'f'; head.born = s.date.year - 23; head.fertility = 1;
    head.dyn = 'Mother House'; head.culture = 'nubian';
    const partner = FB.makeCharacter(s, { sex:'m', culture:'nubian', religion:head.religion,
      born:s.date.year - 25, dyn:'Father House', traitsN:0 });
    partner.fertility = 1;
    s.player.courtingId = partner.id;
    FB.doMarry(s, { settleDowry:false, lineage:'paternal' });
    const preview = FB.childIdentityPreview(s, head, partner, true);
    delete s.player.flags.noChildren;
    const previous = FBDATA.balance.childChance;
    FBDATA.balance.childChance = 90000;
    FB.game.passDay({ skipFocus:true });
    FBDATA.balance.childChance = previous;
    const conception = JSON.parse(JSON.stringify(s.pregnant));
    const successor = FB.makeCharacter(s, { sex:'m', culture:'german', religion:head.religion,
      born:s.date.year - 20, dyn:'Successor House', traitsN:0 });
    // Exercise the birth resolver with the same changes succession/remarriage leave behind.
    head.spouseId = null; partner.spouseId = null; partner.dead = true;
    s.player.charId = successor.id; s.player.flags.noChildren = 1;
    const replacement = FB.makeCharacter(s, { sex:'m', culture:'coptic', religion:head.religion,
      born:s.date.year - 25, dyn:'Replacement House', traitsN:0 });
    FB.sealMarriageLineage(s, head, replacement, 'paternal');
    head.spouseId = replacement.id; replacement.spouseId = head.id;
    s.pregnant.due = s.turn + 1;
    const payload = JSON.parse(FB.save.serialize());
    FB.save.restore(payload); s = FB.state;
    FB.game.passDay({ skipFocus:true });
    const baby = Object.keys(s.chars).map(function (id) { return s.chars[id]; })
      .filter(function (c) { return c.motherId === head.id && c.fatherId === partner.id; })[0];
    return { preview:preview.dynasty, conception:conception,
      baby:baby && { dyn:baby.dyn, culture:baby.culture, motherId:baby.motherId },
      motherId:head.id, fatherId:partner.id };
  });
  expect(result.conception).toMatchObject({ dynasty:'Father House', dynastyParentId:result.fatherId });
  expect(result.preview).toBe('Father House');
  expect(result.baby).toEqual({ dyn:'Father House', culture:'nubian', motherId:result.motherId });
});

test('marriage review skips unavailable choices and preserves accepted maternal terms', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, head = s.chars[s.player.charId];
    head.sex = 'f'; head.culture = 'nubian';
    const target = FB.makeCharacter(s, { sex:'m', culture:'coptic', religion:head.religion,
      born:s.date.year - 25, traitsN:0 });
    const choices = [];
    FB.ui.showMarriageLineageReview(head.id, target.id, function (lineage) { choices.push(lineage); });
    target.culture = 'nubian';
    FB.sealMarriageLineage(s, head, target, 'maternal');
    head.betrothedId = target.id; target.betrothedId = head.id;
    target.culture = 'coptic';
    FB.ui.showMarriageLineageReview(head.id, target.id, function (lineage) { choices.push(lineage); });
    return choices;
  });
  expect(result).toEqual(['paternal', 'maternal']);
  await expect(page.locator('#marriage-lineage')).toHaveCount(0);
});

test('losing maternal eligibility cannot silently propose paternal terms', async function ({ page }) {
  await page.evaluate(function () {
    const s = FB.state, head = s.chars[s.player.charId];
    head.sex = 'f'; head.culture = 'nubian';
    const target = FB.makeCharacter(s, { sex:'m', culture:'nubian', religion:head.religion,
      born:s.date.year - 25, traitsN:0 });
    window.lineageConfirmations = [];
    FB.ui.showMarriageLineageReview(head.id, target.id, function (lineage) {
      window.lineageConfirmations.push(lineage);
    });
    document.getElementById('marriage-lineage').value = 'maternal';
    target.culture = 'coptic';
  });
  await page.locator('#marriage-lineage-confirm').click();
  expect(await page.evaluate(function () { return window.lineageConfirmations; })).toEqual([]);
});

test('maternal selection is keyboard accessible and shows the exact house on compact screens', async function ({ page }) {
  await page.setViewportSize({ width:390, height:844 });
  await page.evaluate(function () {
    const s = FB.state, head = s.chars[s.player.charId];
    head.sex = 'f'; head.culture = 'nubian'; head.dyn = 'Mother House';
    const target = FB.makeCharacter(s, { sex:'m', culture:'nubian', religion:head.religion,
      born:s.date.year - 25, dyn:'Father House', traitsN:0 });
    FB.ui.showMarriageLineageReview(head.id, target.id, function (lineage) {
      FB.sealMarriageLineage(s, head, target, lineage);
      head.betrothedId = target.id; target.betrothedId = head.id;
    });
  });
  const terms = page.getByLabel('Marriage lineage', { exact:true });
  await expect(terms).toHaveValue('paternal');
  await terms.focus();
  await page.keyboard.press('ArrowDown');
  await expect(terms).toHaveValue('maternal');
  await expect(page.locator('#marriage-lineage-preview')).toContainText('Mother House');
  await expect(page.locator('#gm-title-details')).toBeHidden();
  await page.locator('[aria-controls="gm-title-details"]').click();
  await expect(page.locator('#gm-title-details')).toBeVisible();
  await expect(page.locator('#gm-title-details')).toContainText('Title succession and blood claims are unchanged');
  await page.locator('[aria-controls="gm-title-details"]').click();
  const spacing = await page.locator('.marriage-lineage-field').evaluate(function (field) {
    return field.querySelector('select').getBoundingClientRect().top -
      field.querySelector('label').getBoundingClientRect().bottom;
  });
  expect(spacing).toBeGreaterThanOrEqual(8);
  await page.locator('#marriage-lineage-confirm').focus();
  await page.keyboard.press('Enter');
  expect(await page.evaluate(function () {
    const s = FB.state, head = s.chars[s.player.charId];
    return FB.marriageLineageContract(head, s.chars[head.betrothedId]).lineage;
  })).toBe('maternal');
});

test('household adoption prepares relatives but reforming only the head does not', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player, head = s.chars[p.charId];
    p.gold = 5000; p.prestige = 5000; p.piety = 5000; p.cooldowns = {};
    const branch = FB.createCulture(s, { name:'Household maternal custom', parent:head.culture,
      doctrines:{ matrilinealMarriage:true } });
    head.culture = branch;
    const child = FB.makeCharacter(s, { sex:'f', culture:'german', religion:head.religion,
      born:s.date.year - 18, dyn:head.dyn, traitsN:0, role:'child' });
    child.motherId = head.id; head.childrenIds.push(child.id); FB.touchFamily();
    const partner = FB.makeCharacter(s, { sex:'m', culture:'nubian', religion:head.religion,
      born:s.date.year - 20, traitsN:0 });
    const before = FB.marriageLineageStatus(s, child, partner, 'maternal').ok;
    const status = FB.conversionStatus(s, 'culture', branch, 'household');
    const applied = FB.applyConversion(s, 'culture', branch, 'household');
    return { before:before, ready:status.ok, applied:!!applied,
      childCulture:child.culture, branch:branch,
      after:FB.marriageLineageStatus(s, child, partner, 'maternal').ok,
      partnerCulture:partner.culture };
  });
  expect(result).toMatchObject({ before:false, ready:true, applied:true, after:true, partnerCulture:'nubian' });
  expect(result.childCulture).toBe(result.branch);
});

test('both bookmarks distinguish Nubian and Abyssinian communities and rulers', async function ({ page }) {
  const results = await page.evaluate(function () {
    return ['867', '1066'].map(function (id) {
      const bookmark = FBDATA.bookmarks[id];
      const identities = {};
      bookmark.provinces.forEach(function (province) {
        if (['dongola', 'soba', 'axum', 'lalibela'].indexOf(province.id) >= 0) {
          identities[province.id] = province.culture;
        }
      });
      const realm = bookmark.realms.filter(function (realm) {
        return realm.id === (id === '867' ? 'abyssinia' : 'abyssinia_1066');
      })[0];
      return { identities:identities, ruler:realm.ruler.culture,
        nubian:FB.permitsMatrilinealMarriage(FB.state, 'nubian'),
        abyssinian:FB.permitsMatrilinealMarriage(FB.state, 'abyssinian'),
        learning:FB.cultureOf('abyssinian', FB.state).doctrines.learning };
    });
  });
  for (const result of results) expect(result).toEqual({
    identities:{ dongola:'nubian', soba:'nubian', axum:'abyssinian', lalibela:'abyssinian' },
    ruler:'abyssinian', nubian:true, abyssinian:false, learning:'northeast_african'
  });
});

test('royal child records preserve the actual dynasty through materialization and accession', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    const rid = Object.keys(s.realms).filter(function (id) {
      return id !== 'player' && s.realms[id].alive && s.realms[id].generated &&
        s.realms[id].succession && !s.realms[id].succession.papalElective;
    })[0];
    const royal = FB.realmRulerCharacterSnapshot(s, rid);
    const parent = FB.makeCharacter(s, { sex:royal.sex === 'm' ? 'f' : 'm',
      culture:'nubian', religion:royal.religion, born:s.date.year - 40, traitsN:0 });
    const child = FB.makeCharacter(s, { sex:'f', culture:'nubian', religion:royal.religion,
      born:s.date.year - 18, dyn:'Actual Maternal House', traitsN:0 });
    FB.registerRoyalBirth(s, child, royal.sex === 'm' ? royal : parent,
      royal.sex === 'f' ? royal : parent);
    const memberId = child.royalLine.memberId;
    const stored = s.realms[rid].succession.members[memberId].dyn;
    delete s.chars[child.id]; s.realms[rid].succession.members[memberId].charId = null;
    FB.touchFamily();
    const materialized = FB.materializeRoyalChild(s, rid, memberId);
    const dynasty = materialized.dyn;
    materialized.culture = 'nubian';
    const pledged = FB.makeCharacter(s, { sex:'m', culture:'nubian', religion:royal.religion,
      born:s.date.year - 22, traitsN:0 });
    FB.sealMarriageLineage(s, materialized, pledged, 'maternal');
    materialized.betrothedId = pledged.id; pledged.betrothedId = materialized.id;
    const ascended = FB.assignRealmRulerCharacter(s, rid, materialized.id);
    materialized.culture = 'coptic'; pledged.culture = 'coptic';
    FB.doKinWedding(s, materialized, pledged);
    return { stored:stored, dynasty:dynasty, ascended:!!ascended,
      lineage:FB.marriageLineageContract(materialized, pledged).lineage,
      spouse:materialized.spouseId === pledged.id,
      reigning:FB.realmRulerCharacterSnapshot(s, rid).dyn };
  });
  expect(result).toEqual({ stored:'Actual Maternal House', dynasty:'Actual Maternal House',
    ascended:true, reigning:'Actual Maternal House', lineage:'maternal', spouse:true });
});

test('neighboring practitioners alone do not unlock the custom', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, head = s.chars[s.player.charId];
    head.culture = 'coptic';
    const neighboring = FB.world.provs.filter(function (province) {
      return !province.wasteland && FB.countyCultureShare(s, province.id, 'nubian') === 0 &&
        (province.adj || []).some(function (id) { return FB.countyCultureShare(s, id, 'nubian') > 0; });
    })[0];
    s.player.provinceId = neighboring.id;
    const ordinary = FB.conversionTargetPresence(s, 'culture', 'nubian');
    const strict = FB.conversionTargetPresence(s, 'culture', 'nubian', true);
    return { ordinary:!!ordinary, strict:!!strict,
      reform:FB.doctrineReformSources(s, 'culture', 'marriage_lineage', 'maternal') };
  });
  expect(result).toEqual({ ordinary:true, strict:false, reform:[] });
});

test('legacy pregnancy keeps its playable parent dynasty and fresh families carry terms', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, head = s.chars[s.player.charId];
    const parents = [s.chars[head.fatherId], s.chars[head.motherId]];
    const fresh = FB.marriageLineageContract(parents[0], parents[1]);
    const father = FB.makeCharacter(s, { sex:'m', culture:head.culture, religion:head.religion,
      born:s.date.year - 25, dyn:'Legacy Father House', traitsN:0 });
    head.dyn = 'Legacy Playable House';
    s.pregnant = { motherId:head.id, fatherId:father.id, lineParentId:head.id, due:s.turn + 1 };
    const oldChildDynasties = Object.keys(s.chars).map(function (id) { return [id, s.chars[id].dyn]; });
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const restored = FB.state;
    const missing = !Object.prototype.hasOwnProperty.call(restored.pregnant, 'dynastyParentId');
    FB.game.passDay({ skipFocus:true });
    const child = Object.keys(restored.chars).map(function (id) { return restored.chars[id]; })
      .filter(function (c) { return c.motherId === head.id && c.fatherId === father.id; })[0];
    return { fresh:fresh.lineage, missing:missing, dynasty:child && child.dyn,
      unchanged:oldChildDynasties.every(function (entry) { return restored.chars[entry[0]].dyn === entry[1]; }) };
  });
  expect(result).toEqual({ fresh:'paternal', missing:true, dynasty:'Legacy Playable House', unchanged:true });
});
