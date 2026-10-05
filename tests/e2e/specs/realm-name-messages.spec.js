'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/world.js', 'js/lexicon.js', 'js/station.js', 'js/model.js',
  'js/i18n.js', 'js/messages.js', 'js/events.js', 'js/actions.js',
  'js/economy.js', 'js/ui_panels.js', 'js/ui_misc.js', 'js/authority.js', 'js/governments.js',
  'js/save.js', 'js/save_v4.js', 'js/title_ids.js',
  'data/lexicons.js', 'data/map_data.js', 'data/counties.js', 'data/eras.js',
  'data/bookmarks.js', 'data/economy.js', 'data/political_institutions.js',
  'data/lang_en.js', 'data/lang_fr.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () { FB.game.setPaused(true); });
});

async function arrangeRealms(page) {
  return page.evaluate(function () {
    const s = FB.state, p = s.player;
    p.tier = 4; p.provs = [p.provinceId]; p.liege = null;
    FB.foundPlayerRealm(s);
    const did = Object.keys(FBDATA.duchies).find(function (id) { return FB.duchyCounties(id).length; });
    const realm = FB.makeVassalRealm(s, { id:'e2e_message_realm', titleKind:'duchy', titleId:did,
      capital:FB.duchyCounties(did)[0], rank:2, liege:null, culture:'frankish', religion:'catholic' });
    FB.authoritySeedGovernments(s, { player:'territorial', e2e_message_realm:'roman_civic' });
    return { rid:realm.id, place:realm.nameStyle.place, did:did };
  });
}

test('news recorded in a translated locale keeps historical English provenance through restore',
  async function ({ page }) {
    const fixture = await arrangeRealms(page);
    const result = await page.evaluate(function (args) {
      return new Promise(function (resolve) {
        localStorage.setItem('fb_lang', 'fr');
        FB.loadSelectedLocale(function (loaded) {
          const s = FB.state, realm = s.realms[args.rid];
          const snapshot = FB.realmNameParam(s, realm).$realmName;
          FBDATA.lang.fr.entries[snapshot.term.key] = {
            text:'circonscription', hash:FB.i18nHash({ text:'province' })
          };
          FBDATA.lang.fr.entries['ui:{style} of {name}'] = {
            text:'{style} de {name}', hash:FB.i18nHash({ text:'{style} of {name}' })
          };
          FB.finalizeLocale(loaded);
          const liveFrench = realm.name;
          s.pacts = s.pacts || {}; s.pacts[realm.id] = s.turn + 720;
          const ended = FB.fns.diplomacy_end_pact(s, { realmId:realm.id });
          const entry = s.log.find(function (e) { return e.msg && e.msg.key === 'news.diplomacy.pact_ended'; });
          const captured = entry.msg.params.realm.$realmName;
          const french = FB.newsText(entry, s);
          FB.setRealmTitle(s, realm, 'county', realm.capital, 'A Different Place');
          s.authority.governments[realm.id] = { formId:'territorial' };
          FBDATA.lexicons.governments.roman_civic.terms.duchy.one = 'changed province';
          FB.lexicon.reset();
          FB.markRealmDead(s, realm.id);
          const saved = JSON.parse(FB.save.serialize());
          FB.save.restore(FB.save.v4.migrate(saved));
          const restoredEntry = FB.state.log.find(function (e) {
            return e.msg && e.msg.key === 'news.diplomacy.pact_ended';
          });
          delete FB.state.realms[args.rid];
          const restoredFrench = FB.newsText(restoredEntry, FB.state);
          localStorage.setItem('fb_lang', 'en');
          FB.loadSelectedLocale(function (englishLoaded) {
            FB.finalizeLocale(englishLoaded);
            const archiveEntry = FB.chronicleEntries(FB.state).find(function (e) {
              return e.msg && e.msg.key === 'news.diplomacy.pact_ended';
            });
            resolve({ ended:ended, liveFrench:liveFrench, french:french,
              restoredFrench:restoredFrench, english:FB.newsText(restoredEntry, FB.state),
              archiveEnglish:FB.newsText(archiveEntry, FB.state),
              captured:captured, restored:restoredEntry.msg.params.realm.$realmName,
              hasTranslationInSnapshot:JSON.stringify(captured).indexOf('circonscription') >= 0 });
          });
        });
      });
    }, fixture);
    expect(result.ended).toBe(true);
    expect(result.liveFrench).toBe('Circonscription de ' + fixture.place);
    expect(result.french).toContain(result.liveFrench);
    expect(result.restoredFrench).toBe(result.french);
    expect(result.english).toBe('🕊 The pact with Province of ' + fixture.place + ' is allowed to lapse.');
    expect(result.archiveEnglish).toBe(result.english);
    expect(result.captured.kind).toBe('duchy');
    expect(result.captured.place).toBe(fixture.place);
    expect(result.captured.term.text).toBe('province');
    expect(result.hasTranslationInSnapshot).toBe(false);
    expect(result.restored).toEqual(result.captured);
  });

test('event roles and explicit queued context capture generated realm names', async function ({ page }) {
  const fixture = await arrangeRealms(page);
  const result = await page.evaluate(function (args) {
    const s = FB.state, realm = s.realms[args.rid], p = s.player;
    p.war = { enemy:realm.id };
    p.liege = realm.id;
    const ev = { id:'e2e_realm_roles', text:'{realm} | {enemy} | {liege} | {rname}' };
    const message = FB.eventMessage(s, p.charId, ev, 'text', { realmId:realm.id });
    const queued = { realm:FB.realmNameParam(s, realm) };
    const explicit = FB.eventMessage(s, p.charId, { id:'e2e_explicit_realm', text:'{realm}' }, 'text', queued);
    const live = FB.eventText(s, p.charId, { id:'e2e_explicit_realm', text:'{realm}' }, 'text', queued);
    realm.name = 'The Renamed Court';
    return { params:message.params, explicit:explicit.params.realm,
      live:live, text:FB.renderMessage(explicit, { state:s }),
      hasObjects:FB.renderMessage(message, { state:s }).indexOf('[object Object]') >= 0 };
  }, fixture);
  expect(result.params.realm.$realmName.realmId).toBe('player');
  for (const role of ['enemy', 'liege', 'rname']) {
    expect(result.params[role].$realmName.realmId).toBe(fixture.rid);
    expect(result.params[role].$realmName.place).toBe(fixture.place);
  }
  expect(result.explicit.$realmName.realmId).toBe(fixture.rid);
  expect(result.live).toBe('Province of ' + fixture.place);
  expect(result.text).toBe(result.live);
  expect(result.hasObjects).toBe(false);
});

test('realm audience classification uses captured identity and nested authority messages', async function ({ page }) {
  const fixture = await arrangeRealms(page);
  const result = await page.evaluate(function (args) {
    const s = FB.state, realm = s.realms[args.rid];
    realm.liege = 'player';
    FB.invalidateRealmCache();
    const captured = FB.realmNameParam(s, realm);
    realm.name = 'Changed Realm Name';
    const member = FB.newsAudience(s, { msg:FB.msg('news.world.e2e_member', '{realm}', { realm:captured }) });
    const foreign = FB.newsAudience(s, { msg:FB.msg('news.world.e2e_foreign', '{realm}', {
      realm:{ $realmName:{ realmId:'absent_foreign_realm', kind:'duchy', place:args.place,
        term:{ text:'province', capital:true } } }
    }) });
    const ev = { id:'e2e_authority_names', text:'{formerAuthority} | {currentAuthority} | {authorityChange}' };
    FB.setRealmTitle(s, realm, 'duchy', args.did);
    const ctx = { transitionCauses:['county_transfer'], oldHolderRealmId:'missing_realm',
      newHolderRealmId:realm.id, newHolderGeneration:-1 };
    const message = FB.eventMessage(s, s.player.charId, ev, 'text', ctx);
    const fallback = message.params.formerAuthority.$message;
    realm.name = 'Another Later Name';
    return { member:member, foreign:foreign, current:message.params.currentAuthority,
      nested:message.params.authorityChange.$message, fallback:FB.renderMessage(fallback, { state:s }),
      text:FB.renderMessage(message, { state:s }) };
  }, fixture);
  expect(result.member & 2).toBe(2);
  expect(result.foreign).toBe(4);
  expect(result.fallback).toBe('the local authority');
  expect(result.current.$realmName.realmId).toBe(fixture.rid);
  expect(result.current.$realmName.place).toBe(fixture.place);
  expect(result.nested.key).toBe('fx.param.authority_change.holder');
  expect(result.nested.params.current).toEqual(result.current);
  expect(result.text).toContain('Province of ' + fixture.place);
  expect(result.text).not.toContain('[object Object]');
});

test('generic realm snapshots, custom proper names and legacy strings remain readable', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    const realm = FB.makeVassalRealm(s, { id:'e2e_generic_realm', capital:s.player.provinceId,
      nameStyle:{ kind:'realm', place:'Newhaven' }, rank:1, liege:null,
      culture:'frankish', religion:'catholic' });
    const generated = FB.realmNameParam(s, realm);
    realm.name = 'The Free Court';
    const custom = FB.realmNameParam(s, realm);
    const msg = FB.msg('news.world.e2e_name_compatibility', '{generated} | {custom} | {legacy}', {
      generated:generated, custom:custom, legacy:'Duchy of Oldhaven'
    });
    return { text:FB.renderMessage(JSON.parse(JSON.stringify(msg))), custom:custom,
      generic:generated.$realmName, unknown:FB.realmNameParam(s, 'unknown_realm') };
  });
  expect(result.text).toBe('Realm of Newhaven | The Free Court | Duchy of Oldhaven');
  expect(result.custom).toBe('The Free Court');
  expect(result.generic).toEqual({ realmId:'e2e_generic_realm', kind:'realm', place:'Newhaven' });
  expect(result.unknown).toBe('unknown_realm');
});

test('guild monopoly issuer snapshots survive normalization, restore and expiration', async function ({ page }) {
  const fixture = await arrangeRealms(page);
  const result = await page.evaluate(function (args) {
    const s = FB.state, realm = s.realms[args.rid];
    const name = FB.realmNameParam(s, realm);
    const received = FB.receiveGuildMonopoly(s, { profession:'craftsman', tier:3, years:1,
      scope:'province', scopeId:s.player.provinceId, grantorKind:'realm', grantorId:realm.id,
      grantorName:name, grantorRulerName:'The Granting Ruler' });
    realm.name = 'Changed after the grant';
    const normalized = FB.ensureGuildMonopolies(s).incoming.grantorName;
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const restored = FB.state.player.guildMonopolies.incoming;
    FB.ui.showTab('network', { history:false });
    const network = document.getElementById('tab-network').textContent;
    FB.state.turn = restored.endTurn;
    FB.invalidateGuildMonopolies(FB.state);
    const expired = FB.state.log.find(function (e) {
      return e.msg && e.msg.key === 'news.guild_monopoly.incoming_expired';
    });
    return { received:received, normalized:normalized, restored:restored.grantorName,
      expired:expired.msg.params.grantor, text:FB.newsText(expired, FB.state), network:network };
  }, fixture);
  expect(result.received).toBe(true);
  expect(result.normalized.$realmName.place).toBe(fixture.place);
  expect(result.restored).toEqual(result.normalized);
  expect(result.expired).toEqual(result.normalized);
  expect(result.network).toContain('Issuer: Province of ' + fixture.place);
  expect(result.network).not.toContain('[object Object]');
  expect(result.text).toContain('Province of ' + fixture.place);
  expect(result.text).not.toContain('[object Object]');
});

test('crown lapse records distinct historical names before and after restyling', async function ({ page }) {
  const fixture = await arrangeRealms(page);
  const result = await page.evaluate(function (args) {
    const s = FB.state, realm = s.realms[args.rid];
    const kid = Object.keys(FBDATA.kingdoms).find(function (id) {
      return id !== FBDATA.duchies[args.did].kingdom && FB.kingdomCounties(id).length;
    });
    FB.setRealmTitle(s, realm, 'kingdom', kid);
    realm.rank = 3;
    s.owner[realm.capital] = s.holder[realm.capital] = realm.id;
    FB.invalidateRealmCache();
    const lapsed = FB.checkCrownRecognition(s, realm.id);
    const entry = s.log.find(function (e) { return e.msg && e.msg.key === 'news.world.crown_lapsed'; });
    return { lapsed:lapsed, before:entry.msg.params.realm.$realmName,
      after:entry.msg.params.style.$realmName, text:FB.newsText(entry, s),
      kingdom:FBDATA.kingdoms[kid].name, county:FB.world.byId[realm.capital].name };
  }, fixture);
  expect(result.lapsed).toBe(true);
  expect(result.before.kind).toBe('kingdom');
  expect(result.before.place).toBe(result.kingdom);
  expect(result.before.term.text).toBe('diocese');
  expect(result.after.kind).toBe('county');
  expect(result.after.place).toBe(result.county);
  expect(result.text).toContain('Diocese of ' + result.kingdom);
  expect(result.text).toContain('County of ' + result.county);
});
