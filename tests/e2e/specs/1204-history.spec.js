'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'data/bookmark_1204.js', 'data/bookmark_1204_campaigns.js',
  'data/bookmark_476.js', 'js/title_ids.js',
  'data/technology.js', 'data/systems.js', 'data/eras.js', 'data/starts.js',
  'js/stories.js', 'js/story_history.js', 'js/story_campaign.js', 'js/story_476_rails.js',
  'js/starts.js', 'js/main.js', 'js/world.js', 'js/model.js', 'js/authority.js',
  'js/holywar.js', 'js/papacy.js', 'js/treasury.js', 'js/save.js', 'js/save_v4.js',
  'data/distribution_crazygames.js', 'js/crazygames.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { openCrazyGame } = require('../support/game/crazygames-title');

async function begin(page, testInfo, distribution) {
  if (distribution) await page.addInitScript(function () {
    window.FB_DISTRIBUTION = 'crazygames';
    window.FB_CRAZYGAMES_STORAGE = 'localstorage';
  });
  if (distribution) await openCrazyGame(page, testInfo);
  else await openGame(page, testInfo);
  await page.evaluate(function () { FB.startProgression.noteTier(3); });
  const fullStart = page.locator('#btn-choose-beginning');
  if (await fullStart.isVisible()) await fullStart.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('HISTORY1204-1204-farmer-london-m-Leo');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await page.evaluate(function () {
    FB.game.setPaused(true);
    FB.game.uiPrefs.hideTips = true; FB.game.uiPrefs.hideBeginnerHints = true;
    delete FB.state.player.flags.tutorial;
    window.FBTEST1204 = {
      date:function (year, season, day) {
        const s = FB.state;
        s.date = { year:year, season:season || 0, day:day || 1 };
        s.turn = year * 360 + s.date.season * 90 + s.date.day -
          (s.start.year * 360 + s.start.season * 90 + s.start.day);
      },
      day:function (id) { FB.stories.get(id).day(FB.state, FB.state.stories[id]); },
      win:function (id) {
        const s = FB.state, rec = s.stories[id];
        FB.stories.get(id).day(s, rec);
        if (rec.phase !== 'started' || !rec.warId) throw new Error('Expected a real campaign: ' + id);
        FB.transferProvince(s, FBDATA.storyCampaigns[id].target.provinceId, 'latin_1204');
        FB.settleOrdinaryWar(s, rec.warId, 'victory');
        FB.stories.get(id).day(s, rec);
      },
      gold:function () {
        const s = FB.state;
        return Object.keys(s.realms).reduce(function (total, id) {
          return total + (id === 'player' ? 0 : FB.treasuryAvailable(s, id));
        }, s.player.gold);
      },
      adopt:function (id) {
        const s = FB.state, c = FB.realmRulerCharacterSnapshot(s, id);
        s.player.charId = c.id; s.player.tier = 7;
        s.player.provinceId = s.realms[id].capital;
        return FB.adoptStartingRealm(s, { id:'history_test_ruler', rulerRealmId:id,
          governmentForm:'territorial', tier:7, gold:0, onboarding:'ruler' });
      }
    };
  });
}

for (const distribution of [false, true]) {
  test('1204 starts with landless named claimants and bounded prior crusades: ' + distribution,
    async function ({ page }, testInfo) {
      await begin(page, testInfo, distribution);
      const result = await page.evaluate(function () {
        const s = FB.state, before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
        const names = ['thessalonica_partition_1204','athens_partition_1204','achaia_partition_1204']
          .map(function (id) {
            const r = s.stories[id], c = s.chars[r.beneficiaryId];
            FB.stories.choices(s, id); FB.stories.quote(s, id, 'accept_grantor');
            return [c.name, !!c.dead, FB.realmIdForRulerCharacter(s, c), r.realmId];
          });
        FB.stories.choices(s, 'fifth_crusade_call_1204');
        FB.stories.quote(s, 'fifth_crusade_call_1204', 'call');
        const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
        const history = JSON.parse(JSON.stringify(s.greatHolyWarHistory));
        const parties = names.map(function (_, i) {
          return s.stories[['thessalonica_partition_1204','athens_partition_1204','achaia_partition_1204'][i]].beneficiaryId;
        });
        FB.save.restore(JSON.parse(FB.save.serialize()));
        const restored = FB.state;
        return { names:names, pure:pure, history:history, restored:restored.greatHolyWarHistory,
          samePeople:parties.every(function (id) { return !!restored.chars[id]; }),
          owners:[restored.owner.thessaloniki,restored.owner.athens,restored.owner.sparta],
          active:restored.greatHolyWar, archive:history.campaigns.map(function (row) {
            return [row.id,row.outcome,row.historical,row.turn < 0];
          }), review:[FBDATA.techImpactReviews.features.negotiated_historical_partition.mode,
            FBDATA.techImpactReviews.features.dated_holy_war_calls.mode] };
      });
      expect(result.names).toEqual([['Boniface of Montferrat',false,null,null],
        ['Othon de la Roche',false,null,null],['William of Champlitte',false,null,null]]);
      expect(result.pure && result.samePeople).toBe(true);
      expect(result.owners).toEqual(['thessalonica_1204','sgouros_1204','morea_1204']);
      expect(result.active).toBeNull();
      expect(result.archive).toEqual([['crusade_first_1099','attackers',true,true],
        ['crusade_second_1149','defenders',true,true],['crusade_third_1192','partial',true,true],
        ['crusade_fourth_1204','diverted',true,true]]);
      expect(result.restored).toEqual(result.history);
      expect(result.review).toEqual(['none','none']);
    });
}

test('three real conquests allow a conserved named hierarchy, once across restore', async function ({ page }, testInfo) {
  await begin(page, testInfo);
  const result = await page.evaluate(function () {
    FBTEST1204.date(1205, 0, 1);
    const s = FB.state, ids = ['thessalonica_partition_1204','athens_partition_1204','achaia_partition_1204'];
    ids.forEach(FBTEST1204.day);
    const premature = ids.every(function (id) { return !s.stories[id].realmId; });
    FBTEST1204.win('latin_thessalonica_1204');
    FBTEST1204.win('latin_athens_1204');
    FBTEST1204.win('latin_achaia_1204');
    const counties = ['thessaloniki','athens','sparta'];
    const before = JSON.stringify([s.owner,s.population,s.dev,s.settlementLordships,s.player.holdings]);
    const gold = FBTEST1204.gold();
    ids.forEach(FBTEST1204.day);
    const conserved = before === JSON.stringify([s.owner,s.population,s.dev,s.settlementLordships,s.player.holdings]);
    const delta = FBTEST1204.gold() - gold;
    const rulers = ids.map(function (id) {
      const r = s.stories[id], c = FB.realmRulerCharacterSnapshot(s, r.realmId);
      return [r.result,c.name,c.id === r.beneficiaryId,s.realms[r.realmId].liege];
    });
    const snapshot = JSON.stringify(ids.map(function (id) { return s.stories[id]; }));
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const restored = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter(), repeatGold = FBTEST1204.gold();
    ids.forEach(FBTEST1204.day); FB.stories.restore(restored);
    return { premature:premature, conserved:conserved, delta:delta, rulers:rulers,
      holders:counties.map(function (pid) { return restored.holder[pid]; }),
      owners:counties.map(function (pid) { return restored.owner[pid]; }),
      excluded:[restored.owner.korinth,restored.owner.candia],
      once:snapshot === JSON.stringify(ids.map(function (id) { return restored.stories[id]; })) &&
        rng === FB.getRngState() && uid === FB.getUidCounter() && repeatGold === FBTEST1204.gold() };
  });
  expect(result.premature && result.conserved && result.once).toBe(true);
  expect(result.delta).toBeCloseTo(0, 7);
  expect(result.rulers).toEqual([['granted','Boniface of Montferrat',true,'latin_1204'],
    ['granted','Othon de la Roche',true,'thessalonica_latin_1204'],
    ['granted','William of Champlitte',true,'thessalonica_latin_1204']]);
  expect(result.holders).toEqual(['thessalonica_latin_1204','athens_latin_1204','achaia_latin_1204']);
  expect(result.owners).toEqual(['latin_1204','latin_1204','latin_1204']);
  expect(result.excluded).toEqual(['sgouros_1204','crete_1204']);
});

for (const cause of ['capital','succession','death','third_party','expired']) {
  test('partition can diverge without a promised holding: ' + cause, async function ({ page }, testInfo) {
    await begin(page, testInfo);
    const result = await page.evaluate(function (cause) {
      const s = FB.state, id = 'thessalonica_partition_1204', rec = s.stories[id];
      FBTEST1204.date(1205, 0, 1);
      if (cause === 'capital') FB.transferProvince(s, 'constantinople', 'nicaea_1204');
      if (cause === 'succession') s.realms.latin_1204.ruler.generation++;
      if (cause === 'death') s.chars[rec.beneficiaryId].dead = true;
      if (cause === 'third_party') FB.transferProvince(s, 'thessaloniki', 'bulgaria_1204');
      if (cause === 'expired') FBTEST1204.date(1207, 0, 1);
      const owner = s.owner.thessaloniki, holder = s.holder.thessaloniki;
      FBTEST1204.day(id);
      return { phase:rec.phase, result:rec.result, created:!!s.realms.thessalonica_latin_1204,
        conserved:owner === s.owner.thessaloniki && holder === s.holder.thessaloniki };
    }, cause);
    expect(result.conserved).toBe(true); expect(result.created).toBe(false);
    expect(result.phase).toBe(cause === 'third_party' ? 'pending' : 'resolved');
    expect(result.result).toBe(cause === 'third_party' ? null : cause === 'expired' ? 'diverted' : 'interrupted');
  });
}

for (const decision of ['accept_grantor','decline_grantor']) {
  test('a controlled grantor reviews current terms and rejects stale acceptance: ' + decision,
    async function ({ page }, testInfo) {
      await begin(page, testInfo);
      const result = await page.evaluate(function (decision) {
        const s = FB.state, id = 'thessalonica_partition_1204';
        FBTEST1204.date(1205, 0, 1); FBTEST1204.win('latin_thessalonica_1204');
        const adopted = FBTEST1204.adopt('latin_1204');
        FBTEST1204.day(id);
        const waiting = !s.stories[id].realmId;
        const q = FB.stories.quote(s, id, 'accept_grantor');
        const beforeRead = JSON.stringify(s), rng = FB.getRngState();
        FB.stories.choices(s, id); FB.stories.quote(s, id, decision);
        const pure = beforeRead === JSON.stringify(s) && rng === FB.getRngState();
        s.holder.thessaloniki = 'venice_1204'; FB.invalidateRealmCache();
        const changed = JSON.stringify(s);
        const stale = FB.stories.apply(s, id, 'accept_grantor', q);
        const untouched = changed === JSON.stringify(s);
        s.holder.thessaloniki = 'player'; FB.invalidateRealmCache();
        const reviewed = FB.stories.quote(s, id, decision);
        const applied = FB.stories.apply(s, id, decision, reviewed);
        return { adopted:adopted, waiting:waiting, allowed:q.allowed, pure:pure,
          stale:stale, untouched:untouched, applied:applied, result:s.stories[id].result,
          holder:s.holder.thessaloniki, owner:s.owner.thessaloniki,
          retained:s.player.provs.indexOf('thessaloniki') >= 0 };
      }, decision);
      expect(result.adopted && result.waiting && result.allowed && result.pure && result.untouched && result.applied).toBe(true);
      expect(result.stale).toBe(false); expect(result.owner).toBe('player');
      expect(result.result).toBe(decision === 'accept_grantor' ? 'granted' : 'declined');
      expect(result.holder).toBe(decision === 'accept_grantor' ? 'thessalonica_latin_1204' : 'player');
      expect(result.retained).toBe(decision !== 'accept_grantor');
    });
}

for (const cause of ['early','authority','cooldown','vacant','restored_target','expired','eligible']) {
  test('the dated crusade respects current religious eligibility: ' + cause, async function ({ page }, testInfo) {
    await begin(page, testInfo);
    const result = await page.evaluate(function (cause) {
      const s = FB.state, id = 'fifth_crusade_call_1204', rec = s.stories[id];
      FBTEST1204.date(cause === 'early' ? 1212 : cause === 'expired' ? 1216 : 1213, 0, 1);
      FB.adjustPapalAuthority(s, null, 100, 'history_test');
      if (cause === 'authority') FB.adjustPapalAuthority(s, null, -100, 'history_test');
      if (cause === 'cooldown') s.greatHolyWarHistory.cooldownUntil.catholic = s.turn + 360;
      if (cause === 'vacant') s.religiousHeads[FB.religionOf('catholic', s).head.officeId] = null;
      if (cause === 'restored_target') FB.greatHolyWarTargets(s, 'catholic', true)
        .filter(function (target) { return target.kingdomId === 'syria'; })
        .forEach(function (target) { target.objectiveCounties.forEach(function (pid) {
          FB.transferProvince(s, pid, 'jerusalem_1204');
        }); });
      const before = JSON.stringify(s.owner);
      FBTEST1204.day(id);
      const campaign = s.greatHolyWar;
      const called = !!campaign;
      const caller = campaign && campaign.callerClaimantId;
      const current = FB.romanPope(s, 'catholic');
      const snapshot = JSON.parse(JSON.stringify(rec));
      FB.save.restore(JSON.parse(FB.save.serialize()));
      FBTEST1204.day(id);
      return { called:called, phase:rec.phase, result:rec.result, ownerUnchanged:before === JSON.stringify(s.owner),
        correctCaller:!called || caller === current.id,
        target:campaign && campaign.targetKingdom,
        once:JSON.stringify(snapshot) === JSON.stringify(FB.state.stories[id]),
        campaign:campaign && campaign.id, restored:FB.state.greatHolyWar && FB.state.greatHolyWar.id };
    }, cause);
    expect(result.ownerUnchanged && result.correctCaller && result.once).toBe(true);
    expect(result.called).toBe(cause === 'eligible');
    expect(result.phase).toBe(cause === 'eligible' ? 'started' : ['expired','restored_target'].includes(cause) ? 'resolved' : 'pending');
    if (cause === 'eligible') {
      expect(result.target).toBe('syria'); expect(result.restored).toBe(result.campaign);
    }
  });
}

test('the dated story records the real religious campaign failure only once', async function ({ page }, testInfo) {
  await begin(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'fifth_crusade_call_1204';
    FBTEST1204.date(1213, 0, 1); FB.adjustPapalAuthority(s, null, 100, 'history_test');
    FBTEST1204.day(id);
    const campaignId = s.greatHolyWar.id, owner = JSON.stringify(s.owner);
    FB.resolveGreatHolyWar(s, 'defenders', 'history_test');
    FBTEST1204.day(id);
    const completed = JSON.parse(JSON.stringify(s.stories[id]));
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const restored = FB.state, before = JSON.stringify(restored.stories[id]);
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    FBTEST1204.day(id); FBTEST1204.day(id);
    return { completed:completed, row:restored.greatHolyWarHistory.campaigns.filter(function (row) {
      return row.id === campaignId;
    }), ownerUnchanged:owner === JSON.stringify(restored.owner),
      once:before === JSON.stringify(restored.stories[id]) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  });
  expect(result.completed).toMatchObject({ phase:'resolved', result:'failed', reason:'campaign_ended' });
  expect(result.row).toHaveLength(1); expect(result.row[0].outcome).toBe('defenders');
  expect(result.ownerUnchanged && result.once).toBe(true);
});

for (const choice of ['call','decline']) {
  test('the current player pope can review the dated appeal: ' + choice, async function ({ page }, testInfo) {
    await begin(page, testInfo);
    const result = await page.evaluate(function (choice) {
      const s = FB.state, id = 'fifth_crusade_call_1204';
      FBTEST1204.date(1213, 0, 1); FB.adjustPapalAuthority(s, null, 100, 'history_test');
      s.player.charId = FB.romanPope(s, 'catholic').id;
      FBTEST1204.day(id);
      const waiting = s.stories[id].phase === 'pending' && !s.greatHolyWar;
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const choices = FB.stories.choices(s, id).map(function (row) { return row.id; });
      const staleQuote = FB.stories.quote(s, id, 'call');
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      FB.adjustPapalAuthority(s, null, -100, 'history_test');
      const changed = JSON.stringify(s);
      const stale = FB.stories.apply(s, id, 'call', staleQuote);
      const unchanged = changed === JSON.stringify(s);
      FB.adjustPapalAuthority(s, null, 100, 'history_test');
      const reviewed = FB.stories.quote(s, id, choice);
      const applied = FB.stories.apply(s, id, choice, reviewed);
      return { waiting:waiting, choices:choices, pure:pure, stale:stale, unchanged:unchanged,
        applied:applied, phase:s.stories[id].phase, result:s.stories[id].result,
        called:!!s.greatHolyWar };
    }, choice);
    expect(result.waiting && result.pure && result.unchanged && result.applied).toBe(true);
    expect(result.choices).toEqual(['call','decline']); expect(result.stale).toBe(false);
    expect(result.phase).toBe(choice === 'call' ? 'started' : 'resolved');
    expect(result.result).toBe(choice === 'call' ? null : 'declined');
    expect(result.called).toBe(choice === 'call');
  });
}

test('old campaigns receive no new history or people and malformed historical saves are rejected',
  async function ({ page }, testInfo) {
    await begin(page, testInfo);
    const result = await page.evaluate(function () {
      const source = JSON.parse(FB.save.serialize());
      const activeKingdoms = FBDATA.kingdoms;
      let crossBookmark = false;
      try {
        FBDATA.kingdoms = FBDATA.bookmarks['476'].kingdoms;
        FB.save.v4.validatePlatform(source.state);
        crossBookmark = true;
      } finally { FBDATA.kingdoms = activeKingdoms; }
      const faults = [];
      const badDate = JSON.parse(JSON.stringify(source));
      badDate.state.greatHolyWarHistory.campaigns[0].date.year = 1205;
      const badGrant = JSON.parse(JSON.stringify(source));
      badGrant.state.stories.thessalonica_partition_1204.grantedCounties = ['thessaloniki'];
      const badDependency = JSON.parse(JSON.stringify(source));
      delete badDependency.state.stories.thessalonica_partition_1204;
      [badDate,badGrant,badDependency].forEach(function (data) {
        const before = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
        let error = '';
        try { FB.save.restore(data); } catch (e) { error = e.message; }
        faults.push(!!error && before === FB.state && rng === FB.getRngState() && uid === FB.getUidCounter());
      });
      const old = JSON.parse(JSON.stringify(source));
      const people = ['thessalonica_partition_1204','athens_partition_1204','achaia_partition_1204']
        .map(function (id) { return old.state.stories[id].beneficiaryId; });
      people.forEach(function (id) { delete old.state.chars[id]; });
      ['thessalonica_partition_1204','athens_partition_1204','achaia_partition_1204','latin_bithynia_1204','latin_athens_1204','latin_achaia_1204','fifth_crusade_call_1204']
        .forEach(function (id) { delete old.state.stories[id]; });
      old.state.greatHolyWarHistory.campaigns = [];
      FB.save.restore(old);
      FB.stories.restore(FB.state);
      return { faults:faults, crossBookmark:crossBookmark, history:FB.state.greatHolyWarHistory.campaigns,
        attached:Object.keys(FB.state.stories).length, created:!!FB.state.realms.thessalonica_latin_1204,
        peopleAdded:people.some(function (id) { return !!FB.state.chars[id]; }) };
    });
    expect(result.faults).toEqual([true,true,true]); expect(result.history).toEqual([]);
    expect(result.crossBookmark).toBe(true);
    expect(result.attached).toBe(8); expect(result.created).toBe(false);
    expect(result.peopleAdded).toBe(false);
  });
