'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame, prepareGameContent } = require('../support/game/navigation');
const { startPreparedParityGame } = require('../support/game/parity');
const { restoreBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const example = require('../fixtures/authoring/local-office-petition-lantern.json');

dependsOnRuntime(__filename, [
  'data/ecclesiastical_profiles.js', 'js/ecclesiastical_validation.js', 'js/government_ecclesiastical.js',
  'js/institutions.js', 'js/local_office_appointments.js', 'js/model.js', 'js/mods.js', 'js/world.js',
  'js/treasury.js', 'js/save.js', 'js/save_v4.js', 'js/ui_ecclesiastical.js', 'js/ui_modals.js',
  'js/ui_religious_institutions.js'
]);

test('an imported chapter and appointer install their qualified candidate once under the declared terms', async function ({ page }, info) {
  await openGame(page,info);
  await prepareGameContent(page);
  const candidate = await page.evaluate(function (example) {
    const sig = FB.mods.sig(), valid = FB.mods.validate(example);
    const bad = JSON.parse(JSON.stringify(example));
    bad.bookmarks.lantern_petition_world.localInstitutions.lantern_see.chapterId = 'missing_chapter';
    const invalid = FB.mods.validate(bad);
    return { sig,valid,invalid,pure:FB.mods.sig() === sig && !FBDATA.bookmarks.lantern_petition_world };
  },example);
  expect(candidate.valid).toEqual([]);
  expect(candidate.invalid.length).toBeGreaterThan(0);
  expect(candidate.pure).toBe(true);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/local-office-petition-lantern.json'));
  await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await startPreparedParityGame(page,{ bookmark:'lantern_petition_world',
    code:'PETITION-lantern_petition_world-lantern_petitioner-lantern_see_county-f-Reader' });
  const opening = await page.evaluate(function () {
    const s = FB.state, c = s.chars[s.player.charId], E = FB.ecclesiasticalGovernment;
    const id = 'lantern_see', rid = 'lantern_see_realm';
    const age = c.born, sex = c.sex;
    c.born = s.date.year - 29;
    const tooYoung = FB.localOfficePetitionQuote(s,id,'file').reason;
    c.born = age; c.sex = 'm';
    const wrongSex = FB.localOfficePetitionQuote(s,id,'file').reason;
    c.sex = sex;
    const eligible = FB.localOfficePetitionQuote(s,id,'file');
    const before = E.decision(s,rid,'war').reason;
    FB.runInstant(s,'church_dealings');
    return { sig:FB.mods.sig(),tooYoung,wrongSex,allowed:eligible.allowed,fee:eligible.appointmentCost,before };
  });
  expect(opening.sig).not.toBe(candidate.sig);
  expect(opening).toMatchObject({ tooYoung:'qualification',wrongSex:'qualification',allowed:true,fee:3,before:'vacancy' });
  const see = page.locator('[data-local-institution="lantern_see"]');
  await see.locator('[data-local-action="office-candidacy"]').click();
  await expect(page.locator('#gm-body')).toContainText('Public cost on appointment');
  await page.locator('#local-office-petition-confirm').click();
  await page.locator('#local-office-petition-continue').click();
  await expect(see).toContainText('Awaiting hearing');
  await page.locator('[data-modal-nav="close"]').click();

  const pending = await page.evaluate(function () {
    const s = FB.state, id = 'lantern_see', rid = 'lantern_see_realm', E = FB.ecclesiasticalGovernment;
    const chapter = 'lantern_chapter', subject = { kind:'realm',id:rid };
    const p = FB.localInstitutionSettle(s,chapter,subject,{ protection:true, courts:true, tolerance:true });
    if (!p || !FB.localInstitutionConsent(s,chapter,subject)) throw new Error('The declared chapter did not ratify its bargain');
    const direct = E.review(s,rid,'appoint',{ candidateId:s.player.charId });
    FB.treasuryInitialize(s);
    return { save:FB.save.serialize(),petition:s.localInstitutions[id].officePetition,blocked:direct.reason,
      gold:s.player.gold,publicGold:FB.treasuryAvailable(s,rid),rng:FB.getRngState() >>> 0,uid:FB.getUidCounter() };
  });
  expect(pending.blocked).toBe('petition_required');
  expect(pending.publicGold).toBeGreaterThanOrEqual(8);
  await restoreBookmark(page,pending.save);
  const result = await page.evaluate(function (expected) {
    const s = FB.state, id = 'lantern_see', rid = 'lantern_see_realm', oid = 'lantern_see_office', E = FB.ecclesiasticalGovernment;
    const chapter = 'lantern_chapter', cid = s.player.charId, pid = s.player.provinceId;
    const row = s.localInstitutions[id], q = FB.localOfficePetitionQuote(s,id,'withdraw');
    const same = JSON.stringify(row.officePetition) === JSON.stringify(expected.petition) && expected.gold === s.player.gold &&
      expected.publicGold === FB.treasuryAvailable(s,rid) && expected.uid === FB.getUidCounter() &&
      expected.rng === (FB.getRngState() >>> 0) && expected.sig === FB.mods.sig();
    const direct = E.review(s,rid,'appoint',{ candidateId:cid });
    const blocked = !E.apply(s,direct) && s.religiousHeads[oid] === null;
    const controls = JSON.stringify([s.owner,s.holder,s.player.gold,s.player.tier,s.player.provinceId]);
    const staleCases = [
      ['authority_changed',function (staged) { staged.realms[rid].ruler.generation += 1; }],
      ['occupied',function (staged) { staged.owner[pid] = rid; }],
      ['qualification',function (staged) { staged.player.provinceId = 'lantern_upper_county'; }],
      ['qualification',function (staged) { staged.player.charId = staged.localInstitutions[chapter].representativeId; }],
      ['chapter_changed',function (staged) { staged.chars[staged.localInstitutions[chapter].representativeId].dead = true; }],
      ['funds',function (staged) { staged.realms[rid].treasury.gold = 5; }]
    ].map(function (spec) {
      const staged = FB.save.expandedSnapshot(s);
      staged.turn = q.hearingTurn; staged.date.season = 1; staged.date.day = 1;
      spec[1](staged);
      const gold = FB.treasuryAvailable(staged,rid);
      FB.localOfficePetitionSeason(staged,id);
      const p = staged.localInstitutions[id].officePetition;
      return [p.status,p.reason,staged.religiousHeads[oid] === null,FB.treasuryAvailable(staged,rid) === gold];
    });
    s.turn = q.hearingTurn; s.date.season = 1; s.date.day = 1;
    FB.localInstitutionsSeason(s);
    const publicGold = FB.treasuryAvailable(s,rid);
    FB.localInstitutionsSeason(s);
    const snapshot = {
      petition:row.officePetition,holder:s.religiousHeads[oid],representative:row.representativeId,
      incumbent:E.incumbent(s,rid) && E.incumbent(s,rid).id,recognition:E.row(s,rid).temporalRecognitionId,
      publicGold,war:E.decision(s,rid,'war').reason
    };
    FB.treasuryInitialize(s);
    return { same,blocked,staleCases,cid,snapshot,again:FB.treasuryAvailable(s,rid) === publicGold,
      controls:controls === JSON.stringify([s.owner,s.holder,s.player.gold,s.player.tier,s.player.provinceId]),
      save:FB.save.serialize() };
  }, { petition:pending.petition,gold:pending.gold,publicGold:pending.publicGold,rng:pending.rng,uid:pending.uid,sig:opening.sig });
  expect(result.snapshot.petition.reason).toBeNull();
  expect(result.snapshot.petition.status).toBe('appointed');
  expect(result).toMatchObject({ same:true,blocked:true,again:true,controls:true,snapshot:{
    petition:{ status:'appointed',reason:null },holder:result.cid,representative:result.cid,incumbent:result.cid,
    recognition:null,publicGold:pending.publicGold - 3,war:'recognition'
  } });
  expect(result.staleCases).toEqual(['authority_changed','occupied','qualification','qualification','chapter_changed','funds'].map(function (reason) {
    return ['refused',reason,true,true];
  }));
  await restoreBookmark(page,result.save);
  const restored = await page.evaluate(function () {
    const s = FB.state, E = FB.ecclesiasticalGovernment, rid = 'lantern_see_realm', row = s.localInstitutions.lantern_see;
    return { petition:row.officePetition,holder:s.religiousHeads.lantern_see_office,representative:row.representativeId,
      incumbent:E.incumbent(s,rid).id,recognition:E.row(s,rid).temporalRecognitionId,
      publicGold:FB.treasuryAvailable(s,rid),war:E.decision(s,rid,'war').reason };
  });
  expect(restored).toEqual(result.snapshot);
});
