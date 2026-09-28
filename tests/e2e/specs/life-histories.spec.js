'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/model.js', 'js/messages.js', 'js/events.js', 'js/main.js', 'js/save.js',
  'js/world.js', 'js/wars.js', 'js/armies.js', 'js/ambitions.js',
  'js/intrigue.js', 'js/justice.js', 'js/i18n.js', 'js/portrait.js',
  'js/ui_misc.js', 'js/ui_panels.js', 'js/ui_modals.js', 'css/style.css',
  'data/map_data.js', 'data/units.js', 'data/ambitions.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { startWarSafety } = require('../support/game/war-safety');

test.describe('character life archives', function () {
  test.beforeEach(async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    await page.evaluate(function () { FB.game.setPaused(true); });
  });

  test('branching generations share one family budget and preserve played and chosen lives', async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state, founder = s.chars[s.player.charId];
      let firstCollateral = null, preserved = null;
      const played = [founder.id];
      for (let generation = 0; generation < 20; generation++) {
        const parent = s.chars[s.player.charId];
        let heir = null;
        for (let n = 0; n < 10; n++) {
          const c = FB.makeCharacter(s, { name:'Branch ' + generation + '-' + n,
            sex:'m', born:s.date.year - 20, culture:parent.culture,
            religion:parent.religion, dyn:parent.dyn, traitsN:0 });
          parent.childrenIds.push(c.id);
          c[parent.sex === 'f' ? 'motherId' : 'fatherId'] = parent.id;
          FB.touchFamily();
          FB.noteLifeEvent(s, c.id, 'rank', {
            title:{ $title:FB.characterRankTitleSnapshot(s, c, 4, 'Branch seat') }
          });
          for (let battle = 0; battle < 12; battle++) {
            s.turn++;
            FB.noteLifeEvent(s, c.id, 'battle', { men:100 + battle, enemyMen:200, place:'Field' });
          }
          if (!generation && n === 1) firstCollateral = c.id;
          if (!generation && n === 2) { preserved = c.id; FB.preserveLifeHistory(s, c.id, true); }
          if (!n) heir = c;
          else FB.killChar(s, c);
        }
        parent.dead = true; parent.died = s.date.year;
        FB.noteLifeDeath(s, parent);
        s.player.charId = heir.id; s.generation++;
        FB.lifeHistoryPlayed(s, heir); played.push(heir.id);
        s.date.year += 25; s.turn += 9000;
        FB.touchFamily();
      }
      const all = Object.keys(s.lifeHistories.people).map(function (id) { return s.lifeHistories.people[id]; });
      const family = all.filter(function (r) { return !r.played && !r.preserved; });
      return { family:family.length, entries:family.reduce(function (n, r) { return n + r.entries.length; }, 0),
        bounded:family.every(function (r) { return r.entries.length <= 8; }),
        played:played.every(function (id) { return FB.lifeHistory(s, id).played; }),
        oldestGone:!FB.lifeHistory(s, firstCollateral), oldPersonKept:!!s.chars[firstCollateral],
        preserved:FB.lifeHistory(s, preserved).preserved,
        milestones:FB.lifeHistory(s, preserved).entries.map(function (e) { return e.msg.key; }) };
    });
    expect(result.family).toBeLessThanOrEqual(128);
    expect(result.entries).toBeLessThanOrEqual(1024);
    expect(result.bounded).toBe(true);
    expect(result.played).toBe(true);
    expect(result.oldestGone).toBe(true);
    expect(result.oldPersonKept).toBe(true);
    expect(result.preserved).toBe(true);
    expect(result.milestones).toContain('news.biography.rank');
    expect(result.milestones).toContain('news.biography.death');
  });

  test('dead and paused lives still count toward preservation capacity', async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId], people = [];
      for (let i = 0; i < 51; i++) people.push(FB.makeCharacter(s, {
        name:'Preserved ' + i, sex:'m', born:s.date.year - 35,
        culture:me.culture, religion:me.religion, dyn:'Other house', traitsN:0
      }));
      const rng = FB.getRngState(), uid = FB.getUidCounter();
      people.slice(0, 50).forEach(function (c) { FB.followLifeHistory(s, c.id, true); });
      const id = people[0].id;
      FB.noteLifeEvent(s, id, 'conquest', { place:'First county' });
      FB.followLifeHistory(s, id, false);
      FB.noteLifeEvent(s, id, 'conquest', { place:'Unrecorded county' });
      const paused = FB.lifeHistory(s, id).entries.length;
      people[0].dead = true; people[0].died = s.date.year;
      FB.noteLifeDeath(s, people[0]);
      const full = !FB.preserveLifeHistory(s, people[50].id, true);
      const count = FB.preservedLifeCount(s);
      FB.preserveLifeHistory(s, id, false);
      const released = !FB.lifeHistory(s, id) && !!s.chars[id];
      const admitted = FB.preserveLifeHistory(s, people[50].id, true);
      return { paused:paused, full:full, count:count, released:released, admitted:admitted,
        finalCount:FB.preservedLifeCount(s), unchangedRng:rng === FB.getRngState(),
        unchangedUid:uid === FB.getUidCounter() };
    });
    expect(result).toEqual({ paused:1, full:true, count:50, released:true, admitted:true,
      finalCount:50, unchangedRng:true, unchangedUid:true });
  });

  test('court compaction and save restore preserve a detached readable identity', async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      let chosen = null;
      for (const rid of Object.keys(s.realms)) {
        const court = s.realms[rid].succession;
        if (!court || !court.members || rid === 'player') continue;
        for (const mid of Object.keys(court.members)) {
          const member = court.members[mid], c = s.chars[member.charId];
          if (c && !c.dead && mid !== court.rulerMemberId && !FB.courtRecordRetained(s, c)) {
            chosen = { member:member, c:c }; break;
          }
        }
        if (chosen) break;
      }
      if (!chosen) throw new Error('No unrelated court member in fixture');
      const id = chosen.c.id, name = FB.fullName(chosen.c);
      FB.followLifeHistory(s, id, true);
      FB.noteLifeEvent(s, id, 'conquest', { place:'Historic York' });
      FB.courtMemberDied(s, chosen.member, chosen.c);
      const before = JSON.stringify(FB.lifeHistory(s, id).entries);
      const payload = JSON.parse(FB.save.serialize());
      const snapshotId = payload.state.lifeHistories.people[id].identity.id;
      FB.save.restore(payload);
      const restored = FB.lifeHistory(FB.state, id);
      FB.ui.showLifeHistoryCollection();
      window.lifeHistoryArchivedId = id;
      return { id:id, name:name, gone:!FB.state.chars[id], snapshotId:snapshotId,
        dead:restored.identity.dead, same:JSON.stringify(restored.entries) === before,
        text:restored.entries.map(function (e) { return FB.renderMessage(e.msg, { state:FB.state }); }).join(' ') };
    });
    expect(result.gone).toBe(true);
    expect(result.dead).toBe(true);
    expect(result.snapshotId).toBe(result.id);
    expect(result.same).toBe(true);
    expect(result.text).toContain('Historic York');
    await page.locator('[data-life-open="' + result.id + '"]').click();
    await expect(page.locator('#gm-body')).toContainText(result.name);
    await expect(page.locator('[data-life-entry]')).toHaveCount(2);
    await expect(page.locator('#gm-body')).toContainText('Conquered Historic York.');
    await page.locator('#life-release').click();
    await page.locator('#life-release-keep').click();
    expect(await page.evaluate(function () { return FB.lifeHistory(FB.state, window.lifeHistoryArchivedId).preserved; })).toBe(true);
    await page.locator('#life-release').click();
    await page.locator('#life-release-confirm').click();
    await page.locator('#life-back').click();
    await expect(page.locator('[data-life-open="' + result.id + '"]')).toHaveCount(0);
  });

  test('old saves start recording without fabricating dated achievements', async function ({ page }) {
    const result = await page.evaluate(function () {
      const payload = JSON.parse(FB.save.serialize());
      delete payload.state.lifeHistories;
      const rng = payload.rng, uid = payload.uid;
      FB.save.restore(payload);
      const s = FB.state, id = s.player.charId;
      const empty = FB.lifeHistory(s, id).entries.length;
      const repairedRng = FB.getRngState(), repairedUid = FB.getUidCounter();
      FB.setPlayerTier(s, 2);
      const first = FB.lifeHistory(s, id).entries.filter(function (entry) { return entry.msg.key === 'news.biography.rank'; });
      FB.notePlayerStatus(s);
      FB.notePlayerStatus(s);
      const stable = FB.lifeHistory(s, id).entries.length;
      const saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      return { empty:empty, first:first.length, year:first[0].year, current:s.date.year,
        stable:stable, restored:FB.lifeHistory(FB.state, id).entries.length,
        rng:rng === repairedRng, uid:uid === repairedUid };
    });
    expect(result.empty).toBe(0);
    expect(result.first).toBe(1);
    expect(result.year).toBe(result.current);
    expect(result.restored).toBe(result.stable);
    expect(result.rng).toBe(true);
    expect(result.uid).toBe(true);
  });

  test('retirement promotes the heir history and keeps the old played life across restore', async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId];
      me.born = s.date.year - 55;
      const child = FB.makeCharacter(s, { name:'Heir of the record', sex:'m', born:s.date.year - 20,
        dyn:me.dyn, culture:me.culture, religion:me.religion, traitsN:0 });
      child.motherId = me.id; me.childrenIds.push(child.id); FB.touchFamily();
      FB.followLifeHistory(s, child.id, true);
      FB.noteLifeEvent(s, child.id, 'conquest', { place:'Earlier achievement' });
      const retired = FB.game.retireTo(child.id);
      const payload = JSON.parse(FB.save.serialize());
      FB.save.restore(payload);
      const old = FB.lifeHistory(FB.state, me.id), heir = FB.lifeHistory(FB.state, child.id);
      return { retired:retired, current:FB.state.player.charId === child.id,
        preserved:FB.preservedLifeCount(FB.state), oldPlayed:old.played, heirPlayed:heir.played,
        oldAlive:!old.identity.dead, retirement:old.entries.some(function (e) { return e.msg.key === 'news.biography.retirement'; }),
        inherited:heir.entries.some(function (e) { return e.msg.params.place === 'Earlier achievement'; }),
        noTransfer:!heir.entries.some(function (e) { return e.msg.key === 'news.biography.retirement'; }) };
    });
    expect(result).toEqual({ retired:true, current:true, preserved:0, oldPlayed:true, heirPlayed:true,
      oldAlive:true, retirement:true, inherited:true, noTransfer:true });
  });

  test('per-life selection keeps defining events and large battles without baking prose', async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId];
      FB.setPlayerTier(s, 2);
      for (let i = 0; i < 55; i++) {
        s.turn++;
        FB.noteLifeEvent(s, me.id, 'battle', { men:100 + i, enemyMen:200, place:'Record field' });
      }
      const row = FB.lifeHistory(s, me.id);
      const serialized = JSON.stringify(row);
      const savedEnglish = FBDATA.lang.en;
      delete FBDATA.lang.en;
      let text;
      try { text = FB.renderMessage(row.entries[row.entries.length - 1].msg, { state:s }); }
      finally { if (savedEnglish) FBDATA.lang.en = savedEnglish; }
      return { count:row.entries.length, condensed:row.condensed,
        rank:row.entries.some(function (e) { return e.msg.key === 'news.biography.rank'; }),
        largest:row.entries.some(function (e) { return e.msg.params.men === 154; }),
        smallest:row.entries.some(function (e) { return e.msg.params.men === 100; }),
        proseSaved:serialized.indexOf('soldiers won') >= 0, text:text };
    });
    expect(result).toMatchObject({ count:40, condensed:true, rank:true, largest:true, smallest:false, proseSaved:false });
    expect(result.text).toContain('154');
    expect(result.text).toContain('Record field');
  });

  test('untracked foreign deeds do not traverse the family graph or allocate biographies', async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId];
      const stranger = FB.makeCharacter(s, { name:'Unwatched stranger', sex:'m', born:s.date.year - 30,
        culture:me.culture, religion:me.religion, dyn:'Unrelated test house', traitsN:0 });
      const kin = FB.kinOf, rng = FB.getRngState(), uid = FB.getUidCounter();
      const before = JSON.stringify(s.lifeHistories);
      FB.kinOf = function () { throw new Error('Unrelated deed walked family'); };
      try {
        FB.noteLifeEvent(s, stranger.id, 'battle', { men:30000, enemyMen:20000, place:'Distant field' });
        FB.noteLifeDeath(s, stranger);
        return { unchanged:before === JSON.stringify(s.lifeHistories), rng:rng === FB.getRngState(), uid:uid === FB.getUidCounter() };
      } finally { FB.kinOf = kin; }
    });
    expect(result).toEqual({ unchanged:true, rng:true, uid:true });
  });

  test('watched succession records the new ruler without crediting the predecessor', async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const rid = Object.keys(s.realms).find(function (id) {
        const r = s.realms[id], court = r.succession;
        return id !== 'player' && r.alive && court && !court.papalElective &&
          court.order && court.order.some(function (mid) {
            const c = s.chars[court.members[mid].charId]; return c && !c.dead;
          });
      });
      const r = s.realms[rid], court = r.succession;
      const oldId = court.members[court.rulerMemberId].charId;
      court.order.forEach(function (mid) {
        const id = court.members[mid].charId;
        if (id && s.chars[id]) FB.preserveLifeHistory(s, id, true);
      });
      FB.preserveLifeHistory(s, oldId, true);
      const heir = FB.advanceRealmSuccession(s, rid);
      const nextId = heir.charId;
      return { before:FB.lifeHistory(s, oldId).entries.length,
        accession:FB.lifeHistory(s, nextId).entries.filter(function (e) {
          return e.msg.key === 'news.biography.accession';
        }).length, same:oldId === nextId };
    });
    expect(result).toEqual({ before:0, accession:1, same:false });
  });

  test('a family heir taking a living abdication receives their own accession', async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId];
      FB.setPlayerTier(s, 6);
      s.player.provs = [s.player.provinceId];
      FB.foundPlayerRealm(s);
      s.realms.player.name = 'Kingdom of Remembered lands';
      const heir = FB.makeCharacter(s, { name:'Crown heir', sex:'f', born:s.date.year - 20,
        dyn:me.dyn, culture:me.culture, religion:me.religion, traitsN:0 });
      heir[me.sex === 'f' ? 'motherId' : 'fatherId'] = me.id;
      me.childrenIds.push(heir.id); FB.touchFamily();
      const former = JSON.stringify(FB.lifeHistory(s, me.id).entries);
      const realm = FB.abdicatePlayerRealmToHeir(s, heir);
      const row = FB.lifeHistory(s, heir.id);
      return { handed:!!realm, family:row && !row.played && !row.preserved,
        accession:row && row.entries.filter(function (e) { return e.msg.key === 'news.biography.accession'; }),
        formerUnchanged:former === JSON.stringify(FB.lifeHistory(s, me.id).entries) };
    });
    expect(result.handed).toBe(true);
    expect(result.family).toBe(true);
    expect(result.formerUnchanged).toBe(true);
    expect(result.accession).toHaveLength(1);
    expect(result.accession[0].msg.params.title.$title).toMatchObject({ tier:6, place:'Remembered lands' });
  });

  test('remembered lives retain page, scroll and focus after following controls and Back', async function ({ page }) {
    await page.setViewportSize({ width:390, height:700 });
    await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId];
      for (let i = 0; i < 45; i++) {
        const c = FB.makeCharacter(s, { name:'Collection person ' + i, sex:'m', born:s.date.year - 20 - i,
          dyn:'Other house', culture:me.culture, religion:me.religion, traitsN:0 });
        FB.followLifeHistory(s, c.id, true);
      }
      FB.ui.showLifeHistoryCollection();
    });
    await page.locator('#life-list-next').click();
    await expect(page.locator('#gm-body')).toContainText('Page 2 of 3');
    const target = page.locator('[data-life-open]').nth(15);
    await target.scrollIntoViewIfNeeded();
    const remembered = await target.evaluate(function (button) {
      return { id:button.getAttribute('data-life-open'), scroll:document.getElementById('gm-body').scrollTop };
    });
    expect(remembered.scroll).toBeGreaterThan(0);
    await target.click();
    await page.locator('#life-follow').click();
    await expect(page.locator('#life-follow')).toHaveText('Resume following');
    await page.locator('#life-follow').click();
    await expect(page.locator('#life-follow')).toHaveText('Stop following');
    await page.locator('#life-back').click();
    await expect(page.locator('#gm-body')).toContainText('Page 2 of 3');
    await expect(page.locator('[data-life-open="' + remembered.id + '"]')).toBeFocused();
    expect(await page.locator('#gm-body').evaluate(function (body) { return body.scrollTop; })).toBe(remembered.scroll);
  });

  for (const width of [390, 1280]) {
    test('deceased tree history preserves navigation and read-only state at ' + width, async function ({ page }) {
      await page.setViewportSize({ width:width, height:844 });
      const target = await page.evaluate(function () {
        const s = FB.state, me = s.chars[s.player.charId];
        let last = null;
        for (let i = 0; i < 18; i++) {
          const c = FB.makeCharacter(s, { name:'Remembered child ' + i, sex:'m', born:s.date.year - 5,
            culture:me.culture, religion:me.religion, dyn:me.dyn, traitsN:0 });
          me.childrenIds.push(c.id); c.motherId = me.id; FB.touchFamily();
          if (i === 17) {
            FB.noteLifeEvent(s, c.id, 'conquest', { place:'Remembered county' });
            FB.killChar(s, c); last = c;
          }
        }
        FB.ui.showFamilyTree();
        window.lifeBeforeRead = JSON.stringify(s);
        window.lifeRngBeforeRead = FB.getRngState();
        return last.id;
      });
      const chip = page.locator('.family-tree-primary .ftchip[data-cid="' + target + '"]').first();
      await chip.scrollIntoViewIfNeeded();
      await chip.focus();
      const scroll = await page.locator('.family-tree-primary').evaluate(function (wrap) { return wrap.scrollLeft; });
      expect(scroll).toBeGreaterThan(0);
      await page.keyboard.press('Enter');
      await page.locator('#cm-life-history').click();
      await expect(page.locator('#gm-title')).toHaveText('Life history');
      await expect(page.locator('#gm-body')).toContainText('Conquered Remembered county.');
      await expect(page.locator('#life-preserve')).toHaveText('Preserve this life');
      await page.locator('#life-back').click();
      await expect(page.locator('#cm-life-history')).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(chip).toBeFocused();
      expect(await page.locator('.family-tree-primary').evaluate(function (wrap) { return wrap.scrollLeft; })).toBe(scroll);
      expect(await page.evaluate(function () {
        return window.lifeBeforeRead === JSON.stringify(FB.state) &&
          window.lifeRngBeforeRead === FB.getRngState();
      })).toBe(true);
    });
  }
});

test('real field combat records pre-casualty forces without changing the simulation', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, playerId = s.player.charId;
    const enemyId = FB.lifeHistoryRulerId(s, ids.enemy);
    FB.followLifeHistory(s, enemyId, true);
    s.player.focus = 'lead_host';
    function host(id, realm, men) {
      return { id:id, realm:realm, warId:s.player.war.id, at:ids.home, from:ids.home,
        men:men, size:men, units:{ levy:men }, supply:100, path:[], moveLeft:0, holdManual:1 };
    }
    s.armies = [host('life-player', 'player', 30000), host('life-enemy', ids.enemy, 100)];
    for (const rid in s.realms) { s.armyDown[rid] = s.turn; s.armyDetachmentDown[rid] = s.turn; }
    FB.ensureWars(s); FB.assignCampaignHosts(s);
    const initial = JSON.stringify(s), seed = FB.getRngState(), uid = FB.getUidCounter();
    const note = FB.noteLifeEvent;
    function run(record) {
      FB.state = JSON.parse(initial); FB.invalidateRealmCache();
      FB.setRngState(seed); FB.setUidCounter(uid);
      FB.noteLifeEvent = record ? note : function () { return null; };
      FB.armyTick(FB.state);
      const state = JSON.parse(JSON.stringify(FB.state));
      const histories = state.lifeHistories; delete state.lifeHistories;
      return { state:JSON.stringify(state), histories:histories,
        rng:FB.getRngState(), uid:FB.getUidCounter() };
    }
    try {
      const withHistory = run(true), withoutHistory = run(false);
      return { same:withHistory.state === withoutHistory.state && withHistory.rng === withoutHistory.rng &&
          withHistory.uid === withoutHistory.uid,
        player:withHistory.histories.people[playerId].entries.filter(function (e) { return /command$/.test(e.msg.key); }),
        enemy:withHistory.histories.people[enemyId].entries.filter(function (e) { return /defeat$/.test(e.msg.key); }) };
    } finally { FB.noteLifeEvent = note; }
  }, ids);
  expect(result.same).toBe(true);
  expect(result.player).toHaveLength(1);
  expect(result.player[0].msg.params.men).toBe(30000);
  expect(result.player[0].msg.params.enemyMen).toBe(100);
  expect(result.enemy).toHaveLength(1);
  expect(result.enemy[0].msg.params.men).toBe(100);
});
