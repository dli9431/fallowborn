'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/armies.js',
  'js/events.js',
  'js/world.js',
  'data/events_war.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

async function startGame(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
}

test('the extraordinary raid selector is pure and cultures every non-ruler profile',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    var result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      p.tier = 1;
      var cases = [
        { religion:'catholic', culture:'english', profile:'northmen', word:'Northmen' },
        { religion:'sunni', culture:'andalusi', profile:'cross_banners', word:'Cross-bannered' },
        { religion:'norse_pagan', culture:'norse', profile:'saxon_host', word:'Mail-shirted' },
        { religion:'slavic_pagan', culture:'slavic', profile:'steppe_riders', word:'Mounted raiders' },
        { religion:'tengri', culture:'turkic', profile:'rus_raiders', word:'river-boats' },
        { religion:'zoroastrian', culture:'persian', profile:'steppe_riders', word:'Mounted raiders' },
        { religion:'jewish', culture:'turkic', profile:'rus_raiders', word:'river-boats' },
        { religion:'jewish', culture:'english', profile:'rival_raiders', word:'enemy war-band' }
      ];
      var opener = FB.eventById('historic_raid');
      var profiles = cases.map(function (entry) {
        me.religion = entry.religion;
        me.culture = entry.culture;
        var before = FB.save.serialize();
        var rngBefore = FB.getRngState();
        var options = FB.eventContextOptions(s, 'historic_raider');
        var after = FB.save.serialize();
        var first = options[0];
        var target = first && FB.world.byId[first.destinationId];
        var context = first ? FB.eventContext(s, first) : {};
        var matched = !target ? false :
          (entry.profile === 'northmen'
            ? target.culture === 'norse' ||
              FB.faithIsA(target.religion, 'norse_pagan', s)
            : entry.profile === 'cross_banners'
              ? FB.faithIsA(target.religion, 'christian', s)
              : entry.profile === 'saxon_host'
                ? ['german','frankish','english'].indexOf(target.culture) >= 0 ||
                  FB.faithIsA(target.religion, 'christian', s)
                : entry.profile === 'steppe_riders'
                  ? ['turkic','magyar'].indexOf(target.culture) >= 0 ||
                    FB.faithIsA(target.religion, 'tengri', s)
                  : entry.profile === 'rus_raiders'
                    ? ['slavic','norse'].indexOf(target.culture) >= 0 ||
                      FB.faithIsA(target.religion, 'slavic_pagan', s) ||
                      FB.faithIsA(target.religion, 'orthodox', s)
                    : target.culture !== entry.culture ||
                      target.religion !== entry.religion);
        return {
          expected:entry.profile,
          count:options.length,
          profile:first && first.raidProfile,
          destination:first && first.destinationId,
          targetCulture:target && target.culture,
          targetReligion:target && target.religion,
          body:FB.eventText(s, me.id, opener, 'text', context),
          word:entry.word,
          matched:matched,
          pure:before === after && rngBefore === FB.getRngState()
        };
      });
      var pursuit = FB.eventById('historic_raid_pursuit');
      var captive = FB.eventById('historic_raid_captive');
      p.tier = 3;
      return {
        opener:{
          once:opener.once,
          childhood:opener.childhood,
          tierMax:opener.trigger.tierMax,
          chance:opener.trigger.chance,
          weight:opener.weight,
          selector:opener.contextSelector
        },
        profiles:profiles,
        rulerContexts:FB.eventContextOptions(s, 'historic_raider').length,
        pursuitValidator:pursuit.contextValidator,
        captiveValidator:captive.contextValidator,
        captureCustom:captive.options[0].effects.custom,
        lethal:captive.options[1].failure.effects.health,
        lethalKind:captive.options[1].failure.effects.deathProvenance.kind,
        escapeChance:captive.options[1].chance
      };
    });

    expect(result.opener).toEqual({
      once:true,
      childhood:true,
      tierMax:2,
      chance:0.035,
      weight:2,
      selector:'historic_raider'
    });
    expect(result.rulerContexts).toBe(0);
    result.profiles.forEach(function (profile) {
      expect(profile.count).toBeGreaterThan(0);
      expect(profile.count).toBeLessThanOrEqual(6);
      expect(profile.profile).toBe(profile.expected);
      expect(profile.destination).toBeTruthy();
      expect(profile.body).toContain(profile.word);
      expect(profile.matched).toBe(true);
      expect(profile.pure).toBe(true);
    });
    expect(result).toMatchObject({
      pursuitValidator:'historic_raid_context_valid',
      captiveValidator:'historic_raid_context_valid',
      captureCustom:'raid_enslave',
      lethal:-10,
      lethalKind:'raid',
      escapeChance:0.25
    });
  });

test('raid plunder takes represented wealth and capture relocates the dispossessed household',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    var result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];

      function emptyPortableWealth() {
        var refs = FB.itemList(s).slice();
        refs.forEach(function (ref) {
          FB.destroyItem(s, ref, { force:true });
        });
        p.holdings = [];
        p.householdStandards = {};
        p.landPlots = [];
        p.landPlotMigration = 1;
        p.gold = 0;
      }

      var plunder = {};
      emptyPortableWealth();
      var itemRef = FB.grantItem(s, 'keen_seax');
      FB.fns.raid_plunder(s, {});
      plunder.item = FB.itemList(s).indexOf(itemRef) < 0;

      emptyPortableWealth();
      p.holdings = ['orchard'];
      FB.fns.raid_plunder(s, {});
      plunder.holding = p.holdings.length;

      emptyPortableWealth();
      p.householdStandards = { wares:2 };
      FB.fns.raid_plunder(s, {});
      plunder.standard = p.householdStandards.wares;

      emptyPortableWealth();
      p.landPlots = [{ provinceId:p.provinceId, settlement:0 }];
      FB.fns.raid_plunder(s, {});
      plunder.plot = p.landPlots.length;

      emptyPortableWealth();
      p.gold = 100;
      FB.fns.raid_plunder(s, {});
      plunder.gold = p.gold;

      me.religion = 'catholic';
      me.culture = 'english';
      FB.setPlayerTier(s, 2);
      var selected = FB.eventContextOptions(s, 'historic_raider')[0];
      var ctx = FB.eventContext(s, selected);
      var oldHome = p.provinceId;
      p.gold = 75;
      p.holdings = ['orchard'];
      p.enterprises = [{ id:'raid-test-enterprise', type:'farmstead' }];
      p.householdStandards = { wares:1 };
      p.landPlots = [
        { provinceId:oldHome, settlement:0 },
        { provinceId:oldHome, settlement:0 }
      ];
      p.manor = { provinceId:oldHome, settlement:0 };
      var validBefore = FB.fns.historic_raid_context_valid(s, ctx);
      var applied = FB.fns.raid_enslave(s, ctx);
      var validAfter = FB.fns.historic_raid_context_valid(s, ctx);
      var captive = FB.eventById('historic_raid_captive');
      var preview = FB.previewEventOption(s, captive, captive.options[0], ctx);
      return {
        plunder:plunder,
        capture:{
          validBefore:validBefore,
          applied:applied,
          validAfter:validAfter,
          oldHome:oldHome,
          destination:ctx.destinationId,
          home:p.provinceId,
          tier:p.tier,
          gold:p.gold,
          holdings:p.holdings.length,
          enterprises:p.enterprises.length,
          standards:Object.keys(p.householdStandards).length,
          plots:p.landPlots.length,
          manor:p.manor,
          liege:p.liege,
          profession:p.profession,
          culture:me.culture,
          religion:me.religion,
          previewTypes:preview.compact.map(function (record) {
            return record.type + ':' + (record.action || record.system || '');
          })
        }
      };
    });

    expect(result.plunder).toEqual({
      item:true,
      holding:0,
      standard:1,
      plot:0,
      gold:80
    });
    expect(result.capture).toMatchObject({
      validBefore:true,
      applied:true,
      validAfter:false,
      tier:0,
      gold:0,
      holdings:0,
      enterprises:0,
      standards:0,
      plots:0,
      manor:null,
      liege:null,
      profession:'farmer',
      culture:'english',
      religion:'catholic'
    });
    expect(result.capture.home).toBe(result.capture.destination);
    expect(result.capture.home).not.toBe(result.capture.oldHome);
    expect(result.capture.previewTypes).toContain('rank:serfdom');
    expect(result.capture.previewTypes).toContain('home:changed');
    expect(result.capture.previewTypes).toContain('system:enslavement');
  });
