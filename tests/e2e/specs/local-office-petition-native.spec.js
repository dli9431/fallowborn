'use strict';
const { test, expect } = require('../support/fixture');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const { startHistoricalGame } = require('../support/game/historical-start');
const { restoreBookmark } = require('../support/game/bookmark-acceptance');
const { waitForUiRefresh } = require('../support/game/ui');

dependsOnRuntime(__filename, [
  'data/bookmark_476.js', 'data/bookmark_476_africa.js', 'data/ecclesiastical_profiles.js', 'data/actions.js',
  'js/actions.js', 'js/institutions.js', 'js/local_office_appointments.js', 'js/model.js',
  'js/save.js', 'js/save_v4.js', 'js/ui_misc.js', 'js/ui_modals.js', 'js/ui_religious_institutions.js', 'css/style.css'
]);

test('Carthage receives a resident’s candidacy, preserves withdrawal and records the chapter’s refusal', async function ({ page }, info) {
  await page.setViewportSize({ width:390, height:844 });
  await startHistoricalGame(page, info, { bookmark:'476',
    code:'PETITION-476-cleric_476-tunis-m-Reader-established' });
  const gates = await page.evaluate(function () {
    const s = FB.state, c = s.chars[s.player.charId], iid = 'carthage_see', oid = 'carthage_bishop';
    const q = function () { return FB.localOfficePetitionQuote(s,iid,'file'); };
    const monastic = q().reason;
    if (!FB.setCareer(s,c,'priest','novice')) throw new Error('Could not stage an ordained protagonist');
    const home = s.player.provinceId;
    s.player.provinceId = 'tlemcen';
    const away = q();
    s.player.provinceId = home;
    const source = JSON.parse(FB.save.serialize());
    delete source.state.localInstitutions.carthage_nicene_chapter;
    const legacy = FB.save.expandedSnapshot(source.state);
    FB.validateLocalInstitutionState(legacy);
    const absence = FB.localOfficePetitionQuote(legacy,iid,'file');
    const before = JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]);
    const ready = q().allowed;
    const direct = FB.localOfficeQuote(s,iid,'appoint',{ candidateId:c.id });
    const blocked = direct.reason === 'petition_required' && !FB.localOfficeApply(s,direct);
    const pure = before === JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]);
    FB.ui.refresh();
    FB.ui.revealDeedAction('church_dealings');
    return { monastic,away,absence,ready,blocked,pure,holder:s.religiousHeads[oid],
      tech:FBDATA.techImpactReviews.features.local_office_candidacy.mode, faults:FB.validateTechnologyData() };
  });
  expect(gates).toEqual({ monastic:'qualification',away:null,absence:null,ready:true,blocked:true,pure:true,
    holder:null,tech:'none',faults:[] });
  await waitForUiRefresh(page);
  const deed = page.locator('#tab-actions [data-action-id="church_dealings"]');
  await deed.click();
  const see = page.locator('[data-local-institution="carthage_see"]');
  const entry = see.locator('[data-local-action="office-candidacy"]');
  const detail = see.locator('[aria-controls="candidacy-carthage_see"]');
  const confirm = page.locator('#local-office-petition-confirm');
  const defer = page.locator('#local-office-petition-defer');
  const proceed = page.locator('#local-office-petition-continue');

  await detail.click();
  await entry.focus();
  const bodyScroll = await page.locator('#gm-body').evaluate(function (node) { return node.scrollTop; });
  await entry.press('Enter');
  await expect(page.locator('#gm-body')).toContainText('Vandal Kingdom');
  await defer.click();
  await expect(entry).toBeFocused();
  await expect(detail).toHaveAttribute('aria-expanded','true');
  expect(Math.abs(await page.locator('#gm-body').evaluate(function (node) { return node.scrollTop; }) - bodyScroll)).toBeLessThan(3);

  await entry.click();
  await confirm.click();
  await expect(page.locator('#gm-body')).toContainText('The office is still vacant');
  await proceed.click();
  await expect(see).toContainText('Awaiting hearing');
  await entry.click();
  const obsolete = await page.evaluate(function () {
    return FB.localOfficePetitionQuote(FB.state,'carthage_see','withdraw');
  });
  await expect(defer).toHaveText('Not now');
  await defer.click();
  await expect(see).toContainText('Awaiting hearing');
  await entry.click();
  await confirm.click();
  await proceed.click();
  await expect(see).toContainText('Withdrawn');
  await entry.click();
  await confirm.click();
  await proceed.click();
  await page.locator('[data-modal-nav="close"]').click();

  const pending = await page.evaluate(function (obsolete) {
    const s = FB.state, row = s.localInstitutions.carthage_see;
    const personal = s.chars[s.player.charId], chapter = s.localInstitutions.carthage_nicene_chapter;
    return { save:FB.save.serialize(), record:row.officePetition, gold:s.player.gold, uid:FB.getUidCounter(),
      stale:!FB.localOfficePetitionApply(s,obsolete),
      rng:FB.getRngState() >>> 0, empty:row.representativeId === null && s.religiousHeads.carthage_bishop === null,
      separate:chapter.representativeId !== personal.id && !Object.keys(chapter.petitions).length };
  },obsolete);
  expect(pending).toMatchObject({ record:{ serial:2,status:'pending',officeId:'carthage_bishop' },stale:true,empty:true,separate:true });
  await restoreBookmark(page,pending.save);
  const result = await page.evaluate(function (expected) {
    const s = FB.state, iid = 'carthage_see', oid = 'carthage_bishop', chapter = 'carthage_nicene_chapter';
    const record = s.localInstitutions[iid].officePetition;
    const matches = JSON.stringify(record) === JSON.stringify(expected.record) && s.player.gold === expected.gold &&
      FB.getUidCounter() === expected.uid && (FB.getRngState() >>> 0) === expected.rng;
    const forged = JSON.parse(FB.save.serialize());
    forged.state.localInstitutions[iid].officePetition.chapterRepresentativeId = s.player.charId;
    let rejected = false;
    try { FB.save.restore(forged); } catch (error) { rejected = error.message.includes('officePetition'); }
    const unchanged = FB.state === s && record.status === 'pending';
    const due = FB.localOfficePetitionQuote(s,iid,'withdraw').hearingTurn;
    FB.localOfficePetitionSeason(s,iid);
    const early = record.status === 'pending';
    const subject = { kind:'realm', id:record.realmId };
    s.turn += 1;
    s.date.day += 1;
    const petition = FB.localInstitutionApply(s,FB.localInstitutionQuote(s,chapter,subject,'petition'));
    const refusal = petition && FB.localInstitutionApply(s,FB.localInstitutionQuote(s,chapter,subject,'refuse'));
    s.turn = due; s.date.season = 1; s.date.day = 1;
    FB.localInstitutionsSeason(s);
    return { matches,rejected,unchanged,early,chapter:refusal && refusal.stage,record:record.status,
      reason:record.reason,holder:s.religiousHeads[oid],gold:s.player.gold };
  }, { record:pending.record,gold:pending.gold,uid:pending.uid,rng:pending.rng });
  expect(result).toEqual({ matches:true,rejected:true,unchanged:true,early:true,chapter:'refused',
    record:'refused',reason:'chapter',holder:null,gold:pending.gold });
  await page.evaluate(function () { FB.runInstant(FB.state,'church_dealings'); });
  await expect(see).toContainText('The chapter withheld current assent.');
});
