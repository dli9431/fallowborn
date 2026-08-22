'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/map_data.js',
  'data/cultures.js',
  'data/traits.js',
  'data/intrigue.js',
  'js/model.js',
  'js/world.js',
  'js/items.js',
  'js/economy.js',
  'js/actions.js',
  'js/council.js',
  'js/intrigue.js',
  'js/mods.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test('milestone-zero registries merge through mods and drive their engine consumers',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await page.evaluate(function () {
      FB.mods.apply({
        traits:{
          e2e_tempered:{
            name:'Measured', class:'disposition', noRandom:true, dip:1
          }
        },
        rulerTraits:['e2e_tempered'],
        items:{
          e2e_authored_work:{
            name:'Test Commentary', icon:'book', rarity:'fine', value:10,
            unique:false, eventOnly:true, slot:'hand', ageMin:6,
            fx:{ lea:1 }, qualityFx:{ lea:1 },
            art:{ kind:'book' }, desc:'A work supplied by a runtime mod.'
          }
        },
        itemPools:{ authoredWorks:['e2e_authored_work'] },
        cultures:{
          e2e_raider:{
            name:'Test Raiders', tradition:'other', dyn:'of_place',
            male:['Aldo'], female:['Alba']
          }
        },
        religions:{
          e2e_raider_root:{
            name:'Test Raider Faiths', assignable:false, icon:'sun'
          },
          e2e_raider_faith:{
            name:'Test Raider Faith', group:'e2e_raider_root', icon:'sun'
          }
        },
        raidingTraditions:{
          cultures:['e2e_raider'], faiths:[], faithGroups:['e2e_raider_root']
        },
        intrigue:{
          maxAiSchemes:4, aiStartsPerYear:1, aiPlayerFacingPerYear:0,
          aiActorCooldownYears:3, leverageDays:360,
          captiveRansoms:[4, 8, 16],
          methodProfiles:{
            careful:{ progress:1.6, success:0.20, discovery:-8 },
            e2e_patient:{ progress:2, success:0.15, discovery:-3 }
          }
        },
        plots:{
          e2e_patient_scheme:{
            name:'Patient Scheme', icon:'mask', need:10,
            desc:'A method-profile integration fixture.', hostile:true,
            scope:'character_same_sovereign', target:'intrigue_character',
            outcome:'leverage', baseChance:0.20,
            methods:[
              { id:'patient', name:'Wait', profile:'e2e_patient' }
            ]
          }
        }
      });
    });
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      const state = FB.state;
      const home = FB.world.byId[state.player.provinceId];
      const target = FB.makeCharacter(state, {
        name:'Patient Target', sex:'m', culture:home.culture,
        religion:home.religion, born:state.date.year - 30,
        station:2, traitsN:0
      });
      target.traits = [];
      const targetOption = FB.intrigueTargetOptions(state,
        FBDATA.plots.e2e_patient_scheme).filter(function (option) {
          return option.characterId === target.id;
        })[0];
      const preview = FB.intriguePreview(state, 'e2e_patient_scheme',
        targetOption.context, 'patient');
      const assassinationOption = FB.intrigueTargetOptions(state,
        FBDATA.plots.assassination).filter(function (option) {
          return option.characterId === target.id;
        })[0];
      const coreProfilePreview = FB.intriguePreview(state, 'assassination',
        assassinationOption.context, 'careful');
      const granted = FB.fns.lifepath_author_work(state);
      const grantedRef = state.player.items[state.player.items.length - 1];
      const me = state.chars[state.player.charId];
      const originalCulture = me.culture;
      const originalFaith = me.religion;
      me.culture = 'e2e_raider';
      me.religion = 'catholic';
      const playerCultureRaids = FB.canRaid(state);
      me.culture = 'english';
      me.religion = 'e2e_raider_faith';
      const playerGroupFaithRaids = FB.canRaid(state);
      me.culture = originalCulture;
      me.religion = originalFaith;
      const generated = Object.keys(state.realms).map(function (id) {
        return state.realms[id];
      }).filter(function (realm) {
        return realm && realm.generated && realm.ruler;
      });
      state.player.tier = 6;
      state.realms.e2e_council_vassal = {
        id:'e2e_council_vassal', name:'Test Vassal', alive:true,
        liege:'player', rank:1, capital:state.player.provinceId,
        culture:home.culture, religion:home.religion, favor:0,
        ruler:{ name:'Test Ruler', culture:home.culture, trait:null }
      };
      if (FB.invalidateRealmCache) FB.invalidateRealmCache();
      FB.councilEnsure(state);
      return {
        rulerAlias:FB.RULER_TRAITS.slice(),
        generatedCount:generated.length,
        generatedUsePool:generated.every(function (realm) {
          return realm.ruler.trait === 'e2e_tempered';
        }),
        councilRepairTrait:
          state.realms.e2e_council_vassal.ruler.trait,
        cultureRaids:FB.hasRaidingTradition('e2e_raider', null, state),
        groupFaithRaids:FB.hasRaidingTradition(
          null, 'e2e_raider_faith', state),
        playerCultureRaids:playerCultureRaids,
        playerGroupFaithRaids:playerGroupFaithRaids,
        unrelatedRaids:FB.hasRaidingTradition('english', 'catholic', state),
        granted:granted,
        grantedDef:FB.resolveItem(state, grantedRef).defId,
        intrigueLimits:{
          max:FBDATA.intrigue.maxAiSchemes,
          starts:FBDATA.intrigue.aiStartsPerYear,
          facing:FBDATA.intrigue.aiPlayerFacingPerYear,
          cooldown:FBDATA.intrigue.aiActorCooldownYears,
          leverage:FBDATA.intrigue.leverageDays,
          ransoms:FBDATA.intrigue.captiveRansoms.slice()
        },
        method:{
          success:preview.success,
          exposure:preview.exposure,
          dailyProgress:preview.dailyProgress
        },
        coreProfile:{
          exposure:coreProfilePreview.exposure,
          dailyProgress:coreProfilePreview.dailyProgress
        }
      };
    });

    expect(result.rulerAlias).toEqual(['e2e_tempered']);
    expect(result.generatedCount).toBeGreaterThan(0);
    expect(result.generatedUsePool).toBe(true);
    expect(result.councilRepairTrait).toBe('e2e_tempered');
    expect(result.cultureRaids).toBe(true);
    expect(result.groupFaithRaids).toBe(true);
    expect(result.playerCultureRaids).toBe(true);
    expect(result.playerGroupFaithRaids).toBe(true);
    expect(result.unrelatedRaids).toBe(false);
    expect(result.granted).toBe(true);
    expect(result.grantedDef).toBe('e2e_authored_work');
    expect(result.intrigueLimits).toEqual({
      max:4, starts:1, facing:0, cooldown:3, leverage:360,
      ransoms:[4, 8, 16]
    });
    expect(result.method.success).toBeGreaterThan(0.15);
    expect(result.method.exposure).toBe(9);
    expect(result.method.dailyProgress).toBeGreaterThan(0);
    expect(result.coreProfile.exposure).toBe(4);
    expect(result.coreProfile.dailyProgress).toBeGreaterThan(0);
  });

test('milestone-zero mod validation rejects unknown data before mutation',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);

    const result = await page.evaluate(function () {
      const before = JSON.stringify({
        intrigue:FBDATA.intrigue,
        raidingTraditions:FBDATA.raidingTraditions,
        itemPools:FBDATA.itemPools,
        rulerTraits:FBDATA.rulerTraits
      });
      const cases = [
        { data:{ mysteryRegistry:{} }, includes:'not a supported top-level' },
        { data:{ intrigue:{ methodProfiles:{
          broken:{ progress:'fast' }
        } } }, includes:'must be a positive number' },
        { data:{ raidingTraditions:{
          cultures:['missing_culture']
        } }, includes:'references unknown id missing_culture' },
        { data:{ itemPools:{
          authoredWorks:['missing_item']
        } }, includes:'references unknown id missing_item' },
        { data:{ rulerTraits:['missing_trait'] },
          includes:'references unknown id missing_trait' },
        { data:{ plots:{ broken_profile:{
          methods:[{ id:'bad', profile:'missing_profile' }]
        } } }, includes:'unknown intrigue profile missing_profile' }
      ];
      const errors = cases.map(function (entry) {
        try {
          FB.mods.apply(entry.data);
          return null;
        } catch (error) {
          return {
            message:error.message,
            matched:error.message.indexOf(entry.includes) >= 0
          };
        }
      });
      return {
        errors:errors,
        unchanged:before === JSON.stringify({
          intrigue:FBDATA.intrigue,
          raidingTraditions:FBDATA.raidingTraditions,
          itemPools:FBDATA.itemPools,
          rulerTraits:FBDATA.rulerTraits
        })
      };
    });

    expect(result.errors).toHaveLength(6);
    expect(result.errors.every(function (entry) {
      return !!entry && entry.matched;
    })).toBe(true);
    expect(result.unchanged).toBe(true);
  });
