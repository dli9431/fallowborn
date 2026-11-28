'use strict';
const fs = require('fs');
const path = require('path');
const {applyLaterContributions} = require('../support/game/bookmark-sources-legacy');
const {installRestoreFacts} = require('../support/game/restore-facts');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark, restoreBookmark } = require('../support/game/bookmark-acceptance');
const { startHistoricalGame } = require('../support/game/historical-start');
const { useReleasedStartRules } = require('../support/game/released-starts');
const { revealStoryCard } = require('../support/game/story-placement');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/bookmark_composition.js','index.html', 'data/starts_laskaris_1204.js', 'data/starts.js',
  'data/actions.js', 'js/actions.js', 'js/i18n.js', 'js/messages.js',
  'data/bookmark_1204.js', 'data/bookmark_1204_terrain.js', 'data/bookmark_1204_campaigns.js',
  'data/story_instances.js', 'data/communal_revisions.js', 'data/government_rollout.js',
  'data/story_households_1204.js', 'data/story_ruler_agendas.js', 'data/start_ambitions.js',
  'data/eras.js', 'data/political_institutions.js', 'js/starts.js', 'js/main.js', 'js/mods.js', 'js/world.js', 'js/model.js',
  'js/governments.js', 'js/station.js', 'js/armies.js',
  'js/stories.js', 'js/story_campaign.js', 'js/story_household.js', 'js/story_ruler_agenda.js',
  'js/wars.js', 'js/treasury.js', 'js/save.js', 'js/save_v4.js',
  'js/ui_misc.js', 'js/ui_panels.js', 'js/ui_modals.js']);

// Keep activation outside the synchronous restore guard, then resume the proof.
async function evaluateAcrossBookmark(page, compute, argument) {
  await installRestoreFacts(page);
  await page.evaluate(compute, argument);
  const checkpoint = await page.evaluate(function () { return window.__startRestoreSave; });
  await restoreBookmark(page, checkpoint);
  expect(await page.evaluate(function () {
    return [FB.getRngState() >>> 0, FB.getUidCounter()];
  })).toEqual(await page.evaluate(function () { return window.__startRestoreSequence; }));
  return page.evaluate(function () { return window.__afterStartRestore(); });
}

async function beginLaskaris(page, info, revision, throughCard) {
  await useReleasedStartRules(page);
  await openGame(page, info);
  await page.evaluate(function (revision) {
    if (revision) FBDATA.bookmarks['1204'].revision = revision;
    const adopt = FB.adoptStartingRealm;
    FB.adoptStartingRealm = function (s, sc) {
      try {
        const me = s.chars[s.player.charId], realm = s.realms[sc.rulerRealmId];
        window.__laskarisCourt = JSON.parse(JSON.stringify({
          id:me.id, name:me.name, born:me.born, dyn:me.dyn, skills:me.skills,
          spouse:me.spouseId, children:me.childrenIds,
          treasury:realm.treasury.gold, rank:realm.rank, liege:realm.liege || null,
          owned:Object.keys(s.owner).filter(function (id) { return s.owner[id] === sc.rulerRealmId; }).sort(),
          held:Object.keys(s.holder).filter(function (id) { return s.holder[id] === sc.rulerRealmId; }).sort()
        }));
        return adopt(s, sc);
      } finally { FB.adoptStartingRealm = adopt; }
    };
  }, revision || null);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#bookmarklist [data-bookmark="1204"]').click();
  const card = page.locator('[data-scenario="laskaris_1204"]');
  await expect(card).toBeVisible();
  await expect(page.locator('#scenariolist .scen-group').first()).toHaveText('Historical starts');
  if (throughCard) await card.click();
  else {
    await page.locator('#btn-ng-back').click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('LASKARIS-1204-laskaris_1204-nicaea-m-Theodore_Laskaris');
    await page.locator('#ng-seed').press('Enter');
  }
  await expect(page.locator('#cg-name')).toHaveValue('Theodore Laskaris');
  await expect(page.locator('#cg-name')).toHaveAttribute('readonly', '');
  await expect(page.locator('#cg-community')).toHaveClass(/hidden/);
  await expect(page.locator('input[name=cg-family]')).toHaveCount(1);
  await expect(page.locator('input[name=cg-family][value=standard]')).toBeChecked();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

// Baldwin adopts the Latin court, the attacker of the Bithynian Partition Claim.
async function beginBaldwin(page, info) {
  await useReleasedStartRules(page);
  await openGame(page, info);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#bookmarklist [data-bookmark="1204"]').click();
  await page.locator('#btn-ng-back').click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('LEADER-1204-baldwin_1204-constantinople-m-Baldwin_of_Flanders');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#cg-name')).toHaveValue('Baldwin of Flanders');
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

for (const opening of [{ revision:'baseline', card:true }, { revision:'inhabited_v2', card:false }]) {
  test(opening.revision + ' adopts the seeded court and restores its existing family and resources', async function ({ page }, info) {
    await beginLaskaris(page, info, opening.revision, opening.card);
    expect(await evaluateAcrossBookmark(page, function () {
      const s = FB.state, me = s.chars[s.player.charId], before = window.__laskarisCourt;
      const identity = { id:me.id, name:me.name, born:me.born, dyn:me.dyn, skills:me.skills,
        spouse:me.spouseId, children:me.childrenIds };
      const previous = { id:before.id, name:before.name, born:before.born, dyn:before.dyn, skills:before.skills,
        spouse:before.spouse, children:before.children };
      const facts = { identity:JSON.stringify(identity) === JSON.stringify(previous),
        name:me.name, age:FB.ageOf(me,s.date.year), culture:me.culture, religion:me.religion,
        tier:s.player.tier, rank:s.realms.player.rank, form:FB.governments.forRealm(s,'player').id,
        home:s.player.provinceId, settlement:s.player.homeSettlement,
        site:FB.world.byId.nicaea.settlements[s.player.homeSettlement].site,
        original:s.start.rulerRealmId, scenario:s.start.scenarioId, revision:s.start.revision,
        single:Object.values(s.chars).filter(function (c) { return c.name === 'Theodore Laskaris' && !c.dead; }).length === 1,
        sourceRemoved:!s.realms.nicaea_1204, treasury:s.player.gold === before.treasury,
        liege:(s.player.liege || null) === before.liege,
        owned:JSON.stringify(Object.keys(s.owner).filter(function (id) { return s.owner[id] === 'player'; }).sort()) === JSON.stringify(before.owned),
        held:JSON.stringify(Object.keys(s.holder).filter(function (id) { return s.holder[id] === 'player'; }).sort()) === JSON.stringify(before.held),
        noHouseholdTrack:!s.stories.constantinople_household_track_1204,
        campaigns:['latin_bithynia_1204','nicaean_return_1204'].every(function (id) { return s.stories[id].phase === 'pending'; }) };
      const saved = JSON.parse(FB.save.serialize());
      function snapshot(state) {
        const c = state.chars[state.player.charId];
        return [state.start,state.owner,state.holder,state.player.gold,state.player.liege,
          c.id,c.dyn,c.skills,c.spouseId,c.childrenIds,Object.keys(state.chars).sort(),state.stories];
      }
      const checkpoint = window.restoreFacts(FB.state,snapshot);
      window.__startRestoreSave = JSON.stringify(saved);
      window.__startRestoreSequence = [FB.getRngState() >>> 0, FB.getUidCounter()];
      FB.activateBookmark('867');
      window.__afterStartRestore = function () {
        facts.restored = checkpoint === window.restoreFacts(FB.state,snapshot);
        return facts;
      };
    })).toMatchObject({ identity:true, name:'Theodore Laskaris', age:29, culture:'greek', religion:'orthodox',
      tier:6, rank:3, form:'territorial', home:'nicaea', settlement:0, site:'nicaea_head', original:'nicaea_1204',
      scenario:'laskaris_1204', revision:opening.revision, single:true, sourceRemoved:true, treasury:true,
      liege:true, owned:true, held:true, noHouseholdTrack:true, campaigns:true, restored:true });
  });
}

test('all offering revisions validate, while a mismatched court is rejected without mutation', async function ({ page }, info) {
  await openGame(page, info);
  const result = await page.evaluate(function () {
    const sc = FBDATA.startScenarios_laskaris_1204[0], before = JSON.stringify(FBDATA);
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    const revisions = FB.bookmarkRevisions('1204',FBDATA.bookmarks['1204']).map(function (bm) {
      return { id:bm.revision, errors:FB.validateBookmark(bm) };
    });
    const valid = FB.mods.validate({ name:'Nicaean opening', startScenarios:[JSON.parse(JSON.stringify(sc))] });
    const mismatches = { characterName:'Another ruler', startCulture:'latin', startReligion:'catholic',
      sex:'f', governmentForm:'regnum', tier:5, rulerRealmId:'latin_1204' };
    const rejected = Object.keys(mismatches).map(function (field) {
      const copy = JSON.parse(JSON.stringify(sc)); copy[field] = mismatches[field];
      return FB.mods.validate({ name:'Mismatched court', startScenarios:[copy] }).length > 0;
    });
    const changed = JSON.parse(JSON.stringify(FB.bookmark('1204')));
    changed.realms.find(function (r) { return r.id === 'nicaea_1204'; }).ruler.name = 'Another ruler';
    return { revisions, valid, rejected, changed:FB.validateBookmark(changed).length > 0,
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  });
  expect(result.revisions.length).toBeGreaterThan(1);
  for (const row of result.revisions) expect(row.errors, row.id).toEqual([]);
  expect(result).toMatchObject({ valid:[], rejected:[true,true,true,true,true,true,true], changed:true, pure:true });
});

for (const bad of [{ date:'1066', county:'nicaea' }, { date:'1204', county:'constantinople' }]) {
  test('start code and direct creation reject ' + bad.date + '/' + bad.county, async function ({ page }, info) {
    await useReleasedStartRules(page);
    await openGame(page, info);
    const full = page.locator('#btn-choose-beginning');
    if (await full.isVisible()) await full.click();
    else await page.getByRole('button', { name:'New Game', exact:true }).click();
    await page.locator('#bookmarklist [data-bookmark="1066"]').click();
    await expect(page.locator('[data-scenario="laskaris_1204"]')).toHaveCount(0);
    await page.locator('#btn-ng-back').click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('LASKARIS-' + bad.date + '-laskaris_1204-' + bad.county + '-m-Theodore_Laskaris');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toHaveCount(0);
    expect(await page.evaluate(function (bad) {
      FB.activateBookmark(bad.date);
      const before = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
      FB.game.pending = { scenario:FBDATA.startScenarios_laskaris_1204[0], seed:'LASKARIS',
        bookmarkId:bad.date, provinceId:bad.county };
      return { rejected:FB.game.start() === false,
        pure:before === FB.state && rng === FB.getRngState() && uid === FB.getUidCounter() };
    }, bad)).toEqual({ rejected:true, pure:true });
  });
}

test('latin_bithynia_1204 informs the Nicaean defender and keeps an earlier defender decision', async function ({ page }, info) {
  await beginLaskaris(page, info);
  expect(await page.evaluate(function () {
    const id = 'latin_bithynia_1204', s = FB.state, story = FB.stories.get(id), rec = s.stories[id];
    const authored = FBDATA.bookmarkContent['1204'].campaigns[id], def = FB.stories.definition(s,authored);
    const mapping = def.target.ownerIds[0] === 'player' && def.actor.realmId !== 'player';
    // Stage the campaign's own opening boundary; no daily simulation or historical victory.
    s.date.year = authored.firstYear;
    s.turn = (authored.firstYear-1204)*360;
    const choices = FB.stories.choices(s,id).length, face = FB.stories.quote(s,id,'face_campaign').allowed;
    const pending = JSON.parse(FB.save.serialize());
    story.day(s,rec);
    const war = FB.ordinaryWarById(s,rec.warId);
    const started = rec.phase === 'started' && rec.playerDecision === null && !!war &&
      war.attacker === def.actor.realmId && war.defender === 'player' && war.defenseAnnounced === true;
    // A save written before defenders became informational may hold their decline.
    const old = pending.state.stories[id];
    Object.assign(old, { phase:'resolved', result:'diverted', reason:'player_declined', outcomeTurn:s.turn,
      playerDecision:'declined', playerDecisionGeneration:FB.realmRulerGeneration(s,'player') });
    const wire = JSON.stringify(old);
    FB.save.restore(pending);
    const restored = wire === JSON.stringify(FB.state.stories[id]);
    FB.stories.get(id).day(FB.state,FB.state.stories[id]);
    return { mapping, choices, face, started, restored, kept:wire === JSON.stringify(FB.state.stories[id]),
      noWar:!FB.ordinaryWarBetween(FB.state,def.actor.realmId,'player') };
  })).toEqual({ mapping:true, choices:0, face:false, started:true, restored:true, kept:true, noWar:true });
});

test('the Bithynian claim tells the Nicaean defender who may attack and when', async function ({ page }, info) {
  await beginLaskaris(page, info);
  const result = await page.evaluate(function () {
    const id = 'latin_bithynia_1204', s = FB.state, rec = s.stories[id];
    const pending = FB.stories.status(s,id);
    FB.stories.get(id).day(s,rec);
    const started = FB.stories.status(s,id);
    return { latin:s.realms.latin_1204.name, court:s.realms.player.name, choices:FB.stories.choices(s,id).length,
      phase:rec.phase, pending:pending.facts, started:started.facts, stage:started.stage };
  });
  expect(result.choices).toBe(0);
  expect(result.pending.slice(0,3)).toEqual([['Your role','Defender'],['Objective','Nicaea, held by ' + result.court],
    ['Window','1204 to 1208, at most 4 years of war once it starts']]);
  expect(result.pending[3]).toEqual(['Now', result.latin + ' may declare war on you over Nicaea until 1208; the attack is theirs to decide.']);
  expect(result.phase).toBe('started');
  expect(result.stage).toBe('War for Nicaea · Underway');
  expect(result.started[0]).toEqual(['Your role','Defender']);
  expect(result.started[3][1]).toMatch(new RegExp('^War underway since \\w+ 1204: ' + result.latin + ' against ' + result.court + '\\.$'));
  // The same third-person introduction serves the defender.
  expect(await page.evaluate(function () { return FB.stories.get('latin_bithynia_1204').intro(FB.state); }))
    .toBe('The crusaders’ partition gave Bithynia to the Latin crown, but Theodore Laskaris holds Nicaea and rallies the Greeks there.');
});

test('1204 campaign, partition, crusade, start and office text says who wants what', async function ({ page }, info) {
  await openGame(page, info);
  const result = await page.evaluate(function () {
    const disclaimers = /grants? no |creates? no |Record (a |an )?(costless )?(priority|intention|preference)|Record attention|\bordinary\b|\bactual(ly)?\b|\bexisting\b|\boriginal\b|\bauthored\b|historical opportunity|political opportunity/i;
    const lostApostrophe = /[A-Za-z]\?[A-Za-z]/;
    const faults = [];
    let checked = 0;
    // These declarations carry no choice labels of their own; the engine writes them.
    function prose(where, value) {
      checked++;
      if (!value || disclaimers.test(value) || lostApostrophe.test(value) || /—|\bgold\b/i.test(value))
        faults.push(where + ': ' + value);
    }
    function sentences(value) { return value.split(/[.!?](?:\s|$)/).filter(Boolean).length; }
    const campaigns = FBDATA.bookmarkContent['1204'].campaigns;
    Object.keys(campaigns).forEach(function (id) {
      const d = campaigns[id];
      prose(id + ' desc', d.desc);
      // Attacker, defender and observer read the same card, in at most two sentences.
      if (sentences(d.desc) > 2 || /\byou(r)?\b/i.test(d.desc)) faults.push(id + ' voice: ' + d.desc);
    });
    ['laskaris_1204','baldwin_1204','muhammad_1204','siwa_delegate_1204'].forEach(function (id) {
      const sc = FBDATA.startScenarios.find(function (row) { return row.id === id; });
      prose(id + ' desc', sc.desc);
      prose(id + ' intro', sc.intro);
      prose(id + ' family', sc.familyPresets.standard.desc);
      if (sentences(sc.desc) > 2 || sentences(sc.intro) > 4 || !/^You /.test(sc.intro)) faults.push(id + ' shape');
    });
    prose('venetian_offices_1204 desc', FBDATA.storyCivicSelections.venetian_offices_1204.desc);
    return { faults:faults, checked:checked, campaigns:Object.keys(campaigns).length,
      bithynia:campaigns.latin_bithynia_1204.desc };
  });
  expect(result.faults).toEqual([]);
  expect(result.campaigns).toBe(15);
  expect(result.checked).toBe(28);
  for (const name of ['partition', 'Bithynia', 'Theodore Laskaris', 'Nicaea']) expect(result.bithynia).toContain(name);
  // The facts block owns the window and the outcome rule.
  expect(result.bithynia).not.toMatch(/\d{4}|possession|years? of war|window/i);
});

test('the 1204 text changes stay exact against the frozen predecessor sources', async function () {
  const root = path.resolve(__dirname, '../../..');
  const frozen = path.resolve(__dirname, '../fixtures/bookmark-composition/native-before-shared');
  for (const name of ['bookmark_1204.js', 'bookmark_1204_campaigns.js', 'bookmark_1204_terrain.js',
    'starts_laskaris_1204.js']) {
    const former = fs.readFileSync(path.join(frozen, name), 'utf8');
    // Each recorded span must occur exactly once on both sides.
    const applied = applyLaterContributions('data/' + name, former);
    expect(applied, name).not.toBe(former);
    if (name !== 'starts_laskaris_1204.js') continue;
    const current = fs.readFileSync(path.join(root, 'data', name), 'utf8');
    const declarations = /FBDATA\.startScenarios_laskaris_1204 = \[[\s\S]*?\n\];\n/;
    expect(applied.match(declarations)[0]).toBe(current.match(declarations)[0]);
  }
});

test('the Siwa delegate begins without a spouse or children, as the start card says', async function ({ page }, info) {
  await startHistoricalGame(page, info, { bookmark:'1204',
    code:'SIWATEXT-1204-siwa_delegate_1204-siwa_oasis-m-Review' });
  expect(await page.evaluate(function () {
    const me = FB.state.chars[FB.state.player.charId];
    return { scenario:FB.state.start.scenarioId, spouse:me.spouseId || null, children:(me.childrenIds || []).length };
  })).toEqual({ scenario:'siwa_delegate_1204', spouse:null, children:0 });
});

test('Baldwin sees the Bithynian claim stage, facts, action labels and specific blockers', async function ({ page }, info) {
  await beginBaldwin(page, info);
  const result = await page.evaluate(function () {
    const id = 'latin_bithynia_1204', s = FB.state, story = FB.stories.get(id);
    function blocked(t) {
      const q = FB.stories.quote(t,id,'face_campaign');
      return q.allowed ? null : story.blocker(t,t.stories[id],q.reason);
    }
    const checkpoint = JSON.parse(FB.save.serialize());
    const status = FB.stories.status(s,id), card = FB.stories.cards(s).filter(function (c) { return c.id === id; })[0];
    const ready = FB.stories.quote(s,id,'face_campaign');
    const facts = { realm:s.realms.player.name, enemy:s.realms.nicaea_1204.name, status:status.facts, name:status.name, lines:status.lines,
      card:card.stage, allowed:ready.allowed, stable:ready.stamp === FB.stories.quote(s,id,'face_campaign').stamp,
      choices:FB.stories.choices(s,id).map(function (c) { return [c.id,c.label,c.detail]; }) };
    // Stage each window boundary directly on the date; nothing else changes.
    s.date.year = 1209; facts.late = blocked(s);
    s.date.year = 1203; facts.early = blocked(s);
    s.date.year = 1204;
    // A declaration rule: one ordinary war per opposing pair, staged directly.
    FB.registerOrdinaryWar(s,'player',{ enemy:'nicaea_1204', target:'nicaea', legacy:false,
      casus:{ type:'border', target:'nicaea' }, objectives:[{ target:'nicaea', type:'border' }] });
    facts.pair = blocked(s); facts.pairNow = FB.stories.status(s,id).facts[3][1];
    FB.save.restore(checkpoint);
    // The required county is lost; conditions read possession only.
    const t = FB.state;
    t.owner.constantinople = 'epirus_1204';
    facts.lost = blocked(t); facts.lostNow = FB.stories.status(t,id).facts[3][1];
    FB.save.restore(checkpoint);
    return facts;
  });
  expect(result.enemy).toBe('Laskarid Court of Nicaea');
  expect(result.status).toEqual([['Your role','Attacker'],['Objective','Nicaea, held by Laskarid Court of Nicaea'],
    ['Window','1204 to 1208, at most 4 years of war once it starts'],['Now','Ready once you approve.']]);
  expect(result).toMatchObject({ name:'War for Nicaea · Ready', card:'War for Nicaea · Ready', lines:[], allowed:true, stable:true });
  expect(result.choices).toEqual([
    ['face_campaign','Approve the war for Nicaea','War is declared on Laskarid Court of Nicaea as soon as the conditions hold. Winning Nicaea depends on your armies.'],
    ['leave_campaign','Drop the claim to Nicaea','No war. The opportunity closes for good.']]);
  expect(result.late).toBe('The window closed at the end of 1208.');
  expect(result.early).toBe('Opens in 1204.');
  expect(result.pair).toBe(result.realm + ' is already at war with ' + result.enemy + '. This opens again once that war ends.');
  expect(result.pairNow).toBe('Waiting: ' + result.pair);
  expect(result.lost).toBe('The opportunity has closed: ' + result.realm + ' lost Constantinople, which this campaign required.');
  expect(result.lostNow).toBe('Closed: ' + result.realm + ' lost Constantinople, which this campaign required.');
});

for (const view of [{ name:'phone', size:{ width:390, height:844 } }, { name:'desktop', size:null }]) {
  test('Baldwin ' + view.name + ' card shows the claim stage under Ruler decisions and every return restores it', async function ({ page }, info) {
    if (view.size) await page.setViewportSize(view.size);
    await beginBaldwin(page, info);
    const id = 'latin_bithynia_1204';
    await page.evaluate(function () { FB.game.uiPrefs.groupDeedsByActionType = true; FB.ui.refresh(); });
    const card = await revealStoryCard(page, id);
    await expect(card.locator('.story-stage')).toHaveText('War for Nicaea · Ready');
    await expect(card).toContainText('The Bithynian Partition Claim…');
    expect(await card.evaluate(function (node) {
      const body = node.closest('[data-action-group-body]'), subhead = body.querySelector('.actionsubhead');
      return { group:body.getAttribute('data-action-group-body'), subhead:subhead && subhead.textContent,
        above:!!subhead && !!(subhead.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) };
    })).toEqual({ group:'ruler', subhead:'Ruler decisions', above:true });
    await card.scrollIntoViewIfNeeded();
    const scroll = await page.evaluate(function () { return document.getElementById('sidebody').scrollTop; });
    async function backAtCard() {
      await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
      await expect(card).toBeFocused();
      expect(await page.evaluate(function () { return document.getElementById('sidebody').scrollTop; })).toBe(scroll);
    }
    // Sheet: a labeled facts list, no pending-decision heading, declaration-based choices.
    await card.click();
    await expect(page.locator('#gm-title')).toHaveText('The Bithynian Partition Claim');
    const facts = page.locator('#gm-body [data-story-facts="' + id + '"]');
    await expect(facts.locator('.kv')).toHaveCount(4);
    await expect(facts.locator('.kv').first()).toHaveText(/Your role\s*Attacker/);
    await expect(facts).toContainText('Ready once you approve.');
    await expect(page.locator('#gm-body')).toContainText(
      'The crusaders’ partition gave Bithynia to the Latin crown, but Theodore Laskaris holds Nicaea and rallies the Greeks there.');
    // The partition introduction renders its political term in this campaign.
    expect(await page.evaluate(function () { return FB.stories.get('thessalonica_partition_1204').intro(FB.state); }))
      .toContain('wants Thessalonica as his own kingdom under the Latin emperor.');
    await expect(page.locator('#gm-body h3')).toHaveCount(0);
    await expect(page.locator('#gm-body')).not.toContainText('Awaiting your decision');
    await expect(page.locator('[data-story-choice="face_campaign"] b')).toHaveText('Approve the war for Nicaea');
    await expect(page.locator('[data-story-choice="leave_campaign"] b')).toHaveText('Drop the claim to Nicaea');
    await page.keyboard.press('Escape');
    await backAtCard();
    // Review: titled by the action; the story's review() lines still print.
    // A local review line stands in for declaration costs, which this
    // border campaign does not have; the costs themselves are unchanged.
    await page.evaluate(function (id) {
      const story = FB.stories.get(id), review = story.review;
      story.review = function () { return review.apply(this, arguments).concat(['Proof cost line.']); };
    }, id);
    await card.click();
    await page.locator('[data-story-choice="face_campaign"]').click();
    await expect(page.locator('#gm-title')).toHaveText('Approve the war for Nicaea');
    await expect(page.locator('#gm-body')).toContainText('Proof cost line.');
    await expect(page.locator('#gm-story-confirm')).toBeVisible();
    await page.locator('[data-modal-nav="back"]').click();
    await expect(page.locator('#gm-title')).toHaveText('The Bithynian Partition Claim');
    await expect(page.locator('[data-story-choice="face_campaign"]')).toBeVisible();
    await page.locator('[data-modal-nav="close"]').click();
    await backAtCard();
    // Escape from the review returns to the sheet, and Escape again to the card.
    await card.click();
    await page.locator('[data-story-choice="leave_campaign"]').click();
    await expect(page.locator('#gm-title')).toHaveText('Drop the claim to Nicaea');
    await page.keyboard.press('Escape');
    await expect(page.locator('#gm-title')).toHaveText('The Bithynian Partition Claim');
    await page.keyboard.press('Escape');
    await backAtCard();
    expect(await page.evaluate(function (id) { return FB.state.stories[id].phase; }, id)).toBe('pending');
  });
}

for (const id of ['nicaean_return_1204']) {
  test(id + ' follows the adopted court and waits for its reviewed decision', async function ({ page }, info) {
    await beginLaskaris(page, info);
    expect(await page.evaluate(function (id) {
      const s = FB.state, story = FB.stories.get(id), rec = s.stories[id];
      const authored = FBDATA.bookmarkContent['1204'].campaigns[id];
      const def = FB.stories.definition(s,authored);
      const mapping = id === 'latin_bithynia_1204' ? def.target.ownerIds[0] === 'player'
        : def.actor.realmId === 'player' && def.conditions[0].realmId === 'player';
      const early = id !== 'nicaean_return_1204' || FB.stories.choices(s,id).length === 0;
      // Stage the campaign's own opening boundary; no daily simulation or historical victory.
      s.date.year = authored.firstYear;
      s.turn = (authored.firstYear-1204)*360;
      const unchanged = JSON.stringify([s.owner,s.holder,s.wars,s.player.gold]);
      story.day(s,rec);
      const waits = rec.phase === 'pending' && unchanged === JSON.stringify([s.owner,s.holder,s.wars,s.player.gold]);
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const choices = FB.stories.choices(s,id).map(function (c) { return c.id; });
      const q = FB.stories.quote(s,id,'face_campaign');
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      s.player.gold++;
      const staleState = JSON.stringify(s), stale = FB.stories.apply(s,id,'face_campaign',q);
      const stalePure = staleState === JSON.stringify(s);
      const checkpoint = JSON.parse(FB.save.serialize());
      const accepted = FB.stories.apply(s,id,'face_campaign',FB.stories.quote(s,id,'face_campaign'));
      const war = FB.ordinaryWarById(s,rec.warId);
      const retainedOwner = s.owner[def.target.provinceId] === q.facts.owner;
      const repeated = FB.stories.apply(s,id,'face_campaign',FB.stories.quote(s,id,'face_campaign'));
      // Stage the canonical war-settlement boundary to test the campaign observer.
      FB.transferProvince(s,def.target.provinceId,def.actor.realmId);
      FB.settleOrdinaryWar(s,rec.warId,def.actor.realmId === 'player' ? 'victory' : 'defeat'); story.day(s,rec);
      const won = rec.phase === 'resolved' && rec.result === 'won';
      const finished = JSON.parse(FB.save.serialize());
      FB.save.restore(finished);
      const resumed = JSON.stringify(FB.state.stories[id]) === JSON.stringify(finished.state.stories[id]);
      FB.save.restore(checkpoint);
      const restored = FB.state, baseline = JSON.stringify([restored.owner,restored.holder,restored.wars,restored.player.gold]);
      const declined = FB.stories.apply(restored,id,'leave_campaign',FB.stories.quote(restored,id,'leave_campaign'));
      return { mapping, early, waits, choices, allowed:q.allowed, pure, stale, stalePure, accepted,
        war:!!war, retainedOwner, repeated, won, resumed, declined,
        declineResult:restored.stories[id].reason,
        declinePure:baseline === JSON.stringify([restored.owner,restored.holder,restored.wars,restored.player.gold]),
        unique:FB.stories.attached(restored).filter(function (candidate) { return candidate === id; }).length };
    }, id)).toEqual({ mapping:true, early:true, waits:true, choices:['face_campaign','leave_campaign'],
      allowed:true, pure:true, stale:false, stalePure:true, accepted:true, war:true, retainedOwner:true,
      repeated:false, won:true, resumed:true, declined:true, declineResult:'player_declined', declinePure:true, unique:1 });
  });
}

test('the Constantinople household keeps the Nicaean court independent and its own storyline', async function ({ page }, info) {
  await beginBookmark(page, info, '1204', 'constantinople_household_1204');
  expect(await page.evaluate(function () {
    const s = FB.state;
    const def = FB.stories.definition(s,FBDATA.bookmarkContent['1204'].campaigns.nicaean_return_1204);
    return { noAdoption:!s.start.rulerRealmId, court:!!s.realms.nicaea_1204,
      actor:def.actor.realmId, home:s.player.provinceId,
      track:!!s.stories.constantinople_household_track_1204,
      noNicaeanChoices:FB.stories.choices(s,'nicaean_return_1204').length === 0 };
  })).toEqual({ noAdoption:true, court:true, actor:'nicaea_1204', home:'constantinople', track:true, noNicaeanChoices:true });
});

for (const court of [
  { id:'muhammad_1204', realm:'khwarazm_1204', place:'gurganj_district', name:'Muhammad_II', identity:'persian.sunni', form:'regnum', tier:6 },
  { id:'siwa_delegate_1204', realm:'siwa_households_1204', place:'siwa_oasis', name:'Delegate', form:'assembly_polity', tier:1 }
]) {
  test(court.id + ' retains its separate authority and the original Nicaean campaign references', async function ({ page }, info) {
    await useReleasedStartRules(page);
    await startHistoricalGame(page, info, { bookmark:'1204',
      code:'OTHERCOURT-1204-' + court.id + '-' + court.place + '-m-' + court.name + (court.identity ? '-standard-0-' + court.identity : '') });
    expect(await page.evaluate(function (court) {
      const s = FB.state, rid = court.form === 'assembly_polity' ? court.realm : 'player';
      const def = FB.stories.definition(s,FBDATA.bookmarkContent['1204'].campaigns.nicaean_return_1204);
      return { scenario:s.start.scenarioId, source:s.start.rulerRealmId, home:s.player.provinceId,
        tier:s.player.tier, form:FB.governments.forRealm(s,rid).id,
        nicaea:!!s.realms.nicaea_1204, actor:def.actor.realmId,
        noChoice:FB.stories.choices(s,'latin_bithynia_1204').length === 0 };
    }, court)).toEqual({ scenario:court.id, source:court.realm, home:court.place, tier:court.tier,
      form:court.form, nicaea:true, actor:'nicaea_1204', noChoice:true });
  });
}
