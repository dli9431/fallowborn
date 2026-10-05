'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/map_data.js', 'data/counties.js', 'data/bookmarks.js',
  'data/cultures.js', 'data/ambitions.js', 'data/political_institutions.js',
  'js/title_ids.js', 'js/world.js', 'js/mods.js', 'js/save.js',
  'js/save_v4.js', 'js/authority.js', 'js/holywar.js', 'js/main.js',
  'js/model.js', 'js/i18n.js', 'js/ambitions.js', 'js/items.js',
  'js/agency.js', 'js/politics.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');

async function start(page, testInfo, bookmark) {
  await openGame(page, testInfo);
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('TITLEMIGRATION-' + bookmark + '-serf-london-f-Ada');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await expect(page.getByRole('button', { name:'Begin', exact:true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  expect(await page.evaluate(function () { return FB.state.start.id; })).toBe(bookmark);
}

test('rank-scoped hierarchy accepts old aliases and rejects missing or duplicate links',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      const definition = FB.bookmark('867');
      const parent = definition.duchies.essex.kingdom;
      const grandparent = definition.kingdoms[parent].empire;
      const valid = ['867','1066'].map(function (id) {
        const book = FB.bookmark(id);
        return {
          errors:FB.validateBookmark(book),
          counties:book.provinces.filter(function (p) { return !p.wasteland; })
            .every(function (p) { return !!book.duchies[p.duchy]; }),
          parents:Object.keys(book.duchies).every(function (did) {
            return !!book.kingdoms[book.duchies[did].kingdom];
          }) && Object.keys(book.kingdoms).every(function (kid) {
            return !!book.empires[book.kingdoms[kid].empire];
          })
        };
      });
      const old = JSON.parse(JSON.stringify(definition));
      old.duchies.d_essex = old.duchies.essex;
      delete old.duchies.essex;
      old.duchies.d_essex.kingdom = 'k_' + parent;
      old.kingdoms['k_' + parent] = old.kingdoms[parent];
      delete old.kingdoms[parent];
      old.kingdoms['k_' + parent].empire = 'e_' + grandparent;
      old.empires['e_' + grandparent] = old.empires[grandparent];
      delete old.empires[grandparent];
      const normalized = FB.titleIds.normalizeBookmark(old);
      const duplicate = JSON.parse(JSON.stringify(definition));
      duplicate.duchies.d_essex = duplicate.duchies.essex;
      const missing = JSON.parse(JSON.stringify(definition));
      missing.duchies.essex.kingdom = 'k_missing_title';
      const missingCounty = JSON.parse(JSON.stringify(definition));
      missingCounty.provinces.filter(function (p) { return p.duchy === 'essex'; })[0]
        .duchy = 'd_missing_title';
      const error = function (value) {
        try { FB.titleIds.normalizeBookmark(value); return ''; }
        catch (e) { return e.message; }
      };
      return {
        valid:valid,
        alias:FB.titleIds.resolve('duchy', 'd_essex', definition.duchies),
        normalized:normalized.duchies.essex.kingdom === parent &&
          normalized.kingdoms[parent].empire === grandparent &&
          !!normalized.empires[grandparent],
        duplicate:error(duplicate),
        missing:error(missing),
        missingCounty:error(missingCounty),
        ambiguousSlug:!!definition.duchies.sicily && !!definition.kingdoms.sicily
      };
    });
    for (const world of result.valid) {
      expect(world.errors).toEqual([]);
      expect(world.counties).toBe(true);
      expect(world.parents).toBe(true);
    }
    expect(result.alias).toBe('essex');
    expect(result.normalized).toBe(true);
    expect(result.duplicate).toContain('Ambiguous duchy title aliases');
    expect(result.missing).toContain('Missing kingdom title k_missing_title');
    expect(result.missingCounty).toContain('Missing duchy title d_missing_title');
    expect(result.ambiguousSlug).toBe(true);
  });

test('legacy mod title aliases normalize without changing realm identifiers',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      const old = { duchies:{
        d_essex:Object.assign({}, FBDATA.duchies.essex, { kingdom:'k_england' })
      }, marketEndowments:{ duchies:{ d_essex:['grain'] } },
      items:{ oldRelic:{ artifact:{ kingdoms:['k_syria'] } } },
      religions:{ oldFaith:{ properties:{ head:{ greatHolyWar:{
        firstTarget:'k_syria', crisisKingdoms:['k_armenia'],
        sacredTargets:[{ kingdom:'k_syria', counties:['jerusalem'] }]
      } } } } },
      scripted:[{ id:'d_essex', realm:'d_essex', titleKind:'duchy',
        titleId:'d_essex' }] };
      const copy = JSON.stringify(old);
      const normalized = FB.titleIds.normalizeMod(old);
      let ambiguous = '';
      try {
        FB.titleIds.normalizeMod({ duchies:{
          essex:FBDATA.duchies.essex, d_essex:FBDATA.duchies.essex
        } });
      } catch (e) { ambiguous = e.message; }
      return {
        original:JSON.stringify(old) === copy,
        duchy:normalized.duchies.essex.kingdom,
        endowment:normalized.marketEndowments.duchies.essex,
        artifact:normalized.items.oldRelic.artifact.kingdoms,
        war:normalized.religions.oldFaith.properties.head.greatHolyWar,
        script:normalized.scripted[0],
        ambiguous:ambiguous
      };
    });
    expect(result.original).toBe(true);
    expect(result.duchy).toBe('england');
    expect(result.endowment).toEqual(['grain']);
    expect(result.artifact).toEqual(['syria']);
    expect(result.war.firstTarget).toBe('syria');
    expect(result.war.crisisKingdoms).toEqual(['armenia']);
    expect(result.war.sacredTargets[0].kingdom).toBe('syria');
    expect(result.script).toEqual({
      id:'d_essex', realm:'d_essex', titleKind:'duchy', titleId:'essex'
    });
    expect(result.ambiguous).toContain('Ambiguous duchy title aliases');
  });

for (const bookmark of ['867','1066']) {
  test(bookmark + ' migrates old v3 titles and preserves campaign facts',
    async function ({ page }, testInfo) {
      await start(page, testInfo, bookmark);
      const result = await page.evaluate(function () {
        // Complete additive load repairs before capturing a canonical title
        // migration baseline, rather than selecting only three repair stages.
        FB.save.restore(JSON.parse(FB.save.serialize()));
        FB.ensureDynasticState(FB.state);
        FB.ensureAgency(FB.state);
        FB.repairPolitics(FB.state);
        const old = JSON.parse(FB.save.serialize());
        old.v = 3;
        delete old.authoritySchema;
        delete old.titleIds;
        const titleRealmId = Object.keys(old.state.realms)[0];
        old.state.realms[titleRealmId].ambitionTitleRegion = 'd_essex';
        old.state.titleMigrationFixture = {
          assets:[{ id:'duchy:d_essex', kind:'duchy', titleId:'d_essex' }],
          claims:[{ asset:'duchy:d_essex', claimant:'d_essex' }],
          selection:{ kind:'duchy', id:'d_essex' }
        };
        old.state.greatHolyWarHistory = {
          sequence:1, firstCall:{}, firstLaunched:{}, campaigns:[
            { id:'ghw_1', target:'k_syria', outcome:'collapsed', turn:old.state.turn }
          ]
        };
        const before = JSON.stringify({
          owner:old.state.owner, holder:old.state.holder,
          charId:old.state.player.charId, family:(function () { const c = old.state.chars[old.state.player.charId];
            return [c.born,c.culture,c.religion,c.fatherId,c.motherId]; })(),
          population:old.state.population, gold:old.state.player.gold,
          provs:old.state.player.provs, treasury:old.state.treasuryAccounting
        });
        const input = JSON.stringify(old);
        const migrationRng = FB.getRngState();
        const v4 = FB.save.v4.migrate(old);
        const twice = FB.save.v4.migrate(v4);
        const migrationRngUnchanged = FB.getRngState() === migrationRng;
        const rng = FB.getRngState();
        FB.save.restore(old);
        return {
          inputUnchanged:JSON.stringify(old) === input,
          migrationRngUnchanged:migrationRngUnchanged,
          idempotent:JSON.stringify(v4) === JSON.stringify(twice),
          header:[v4.v,v4.titleIds,v4.authoritySchema],
          region:FB.state.realms[titleRealmId].ambitionTitleRegion,
          history:FB.state.greatHolyWarHistory.campaigns[0].target,
          settlement:FB.state.titleMigrationFixture,
          facts:{ before:JSON.parse(before), after:{
            owner:FB.state.owner, holder:FB.state.holder,
            charId:FB.state.player.charId, family:(function () { const c = FB.state.chars[FB.state.player.charId];
              return [c.born,c.culture,c.religion,c.fatherId,c.motherId]; })(),
            population:FB.state.population, gold:FB.state.player.gold,
            provs:FB.state.player.provs, treasury:FB.state.treasuryAccounting
          } },
          rng:FB.getRngState() === rng,
          ordinaryVersion:JSON.parse(FB.save.serialize()).v
        };
      });
      expect(result.inputUnchanged).toBe(true);
      expect(result.migrationRngUnchanged).toBe(true);
      expect(result.idempotent).toBe(true);
      expect(result.header).toEqual([4,1,4]);
      expect(result.region).toBe('essex');
      expect(result.history).toBe('syria');
      expect(result.settlement).toEqual({
        assets:[{ id:'duchy:d_essex', kind:'duchy', titleId:'essex' }],
        claims:[{ asset:'duchy:d_essex', claimant:'d_essex' }],
        selection:{ kind:'duchy', id:'essex' }
      });
      expect(result.facts.after).toEqual(result.facts.before);
      expect(result.rng).toBe(true);
      expect(result.ordinaryVersion).toBe(4);
    });
}

test('normal v4 restore preserves durable records and rejects incompatible input before restore',
  async function ({ page }, testInfo) {
    await start(page, testInfo, '867');
    const result = await page.evaluate(function () {
      const source = JSON.parse(FB.save.serialize());
      const rids = Object.keys(source.state.realms).filter(function (id) {
        return id !== 'player';
      });
      const rid = rids[0], otherRid = rids[1];
      source.state.authority = {
        nextId:4, appointments:[],
        recognitions:[{ id:'recognition-1', source:'dynastic_succession',
          issuer:{ kind:'realm', id:rid }, subject:{ kind:'realm', id:rid },
          scope:null, startTurn:source.state.turn, endTurn:null, status:'active' }],
        contracts:[{ id:'federate-3', patronRealmId:rid,
          federateRealmId:otherRid, hostId:null, recognitionId:null,
          payPerSeason:5, endTurn:source.state.turn + 360,
          settlementCountyIds:['london'],
          settlementAwards:[{ provinceId:'london', settlement:1,
            recipientId:rid, fulfilled:true, fulfilledTurn:source.state.turn }],
          approvals:{}, status:'offered', startTurn:null,
          paidThroughPeriod:Math.floor(source.state.turn / 90),
          serviceThroughPeriod:Math.floor(source.state.turn / 90),
          succession:{ patron:1, federate:1 } }], rights:[],
        receipts:[{ id:'render-2', obligationId:'render:' + rid + ':0',
          payerRealmId:rid, beneficiaryRealmId:otherRid,
          provinceId:'london', amount:1, turn:source.state.turn }],
        governments:{}
      };
      const ruler = source.state.chars[source.state.player.charId];
      source.state.authority.governments[rid] = {
        formId:'territorial', sinceTurn:source.state.turn,
        eliteCultureId:ruler.culture, eliteFaithId:ruler.religion,
        legalIdentityId:'customary'
      };
      const migrated = FB.save.v4.migrate(source);
      const originalRecords = JSON.stringify(migrated.state.authority);
      FB.save.v4.restore(migrated);
      const first = JSON.stringify(FB.state.authority);
      FB.save.v4.restore(migrated);
      const second = JSON.stringify(FB.state.authority);
      function failure(change) {
        const data = JSON.parse(JSON.stringify(source));
        change(data);
        const live = FB.state, rng = FB.getRngState();
        try { FB.save.v4.restore(data); return ''; }
        catch (error) {
          if (FB.state !== live || FB.getRngState() !== rng)
            return 'MUTATED: ' + error.message;
          return error.message;
        }
      }
      return {
        records:originalRecords === first && first === second,
        schema:FB.state.authority.schema,
        duplicateId:failure(function (d) {
          d.state.authority.recognitions.push(Object.assign({},
            d.state.authority.recognitions[0]));
        }),
        duplicate:failure(function (d) {
          d.state.authority.receipts.push(Object.assign({},
            d.state.authority.receipts[0], { id:'render-3' }));
        }),
        unknownTitle:failure(function (d) {
          d.state.realms[rid].ambitionTitleRegion = 'd_missing_title';
        }),
        unknownCanonicalTitle:failure(function (d) {
          d.state.selectedTitle = { kind:'kingdom', id:'missing_title' };
        }),
        wrongMod:failure(function (d) { d.mods = 'different-mod-set'; }),
        missingHolder:failure(function (d) { delete d.state.holder; }),
        wrongIdentity:failure(function (d) {
          d.state.authority.governments[rid].eliteCultureId = 'missing_culture';
        }),
        directV4:(function () {
          try { FB.save.restore(migrated); return ''; }
          catch (e) { return e.message; }
        })()
      };
    });
    expect(result.records).toBe(true);
    expect(result.schema).toBe(4);
    expect(result.duplicateId).toContain('Duplicate v4 authority id');
    expect(result.duplicate).toContain('Invalid v4 authority record');
    expect(result.unknownTitle).toContain('Missing duchy title d_missing_title');
    expect(result.unknownCanonicalTitle).toContain('Missing kingdom title missing_title');
    expect(result.wrongMod).toContain('different mod set');
    expect(result.missingHolder).toContain('v3 or v4 game state');
    expect(result.wrongIdentity).toContain('authority.governments');
    expect(result.directV4).toBe('');
  });
