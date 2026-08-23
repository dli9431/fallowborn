'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/map_data.js',
  'data/starts.js',
  'data/cultures.js',
  'data/economy.js',
  'data/traits.js',
  'data/intrigue.js',
  'js/model.js',
  'js/i18n.js',
  'js/world.js',
  'js/items.js',
  'js/economy.js',
  'js/actions.js',
  'js/council.js',
  'js/intrigue.js',
  'js/save.js',
  'js/mods.js',
  'js/ui_modals.js',
  'js/main.js'
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
    expect(result.errors[5].message).toContain(
      'unknown intrigue profile missing_profile');
    expect(result.unchanged).toBe(true);
  });

test('milestone-one mod starts materialize bounded scenario and family data',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await page.evaluate(function () {
      FB.mods.apply({
        itemPools:{ e2e_start_books:['book_of_remedies'] },
        startScenarios:[{
          id:'e2e_scribe', name:'Village Scribe',
          desc:'A data-driven campaign beginning.',
          tier:0, profession:'farmer', gold:37, prestige:11, piety:9,
          sex:'f',
          intro:'You are {name}, keeper of the village record in {province}.',
          startEffects:{
            landPlots:2, holdings:['letters'], careerRank:'master',
            careerExperience:6, flags:{ e2e_origin:'scribe' },
            warService:3, skills:{ lea:4, ste:2 }, focus:'study',
            items:[
              { item:'ash_spear', quality:'well', equip:'rightHand' },
              { pool:'e2e_start_books', quality:'plain' }
            ]
          }
        }],
        familyPresets:[{
          id:'e2e_household', name:'Young Household',
          diff:'age 32 · a settled beginning',
          desc:'Married, with one child.',
          age:32, spouseAge:[-2, 2], children:[1, 1], eldestMin:4
        }]
      });
    });

    const code = 'ORIGIN-867-e2e_scribe-london-f-Ada-e2e_household';
    await page.getByRole('button', { name:'New Game', exact:true }).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill(code);
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await expect(page.locator(
      'input[name=cg-family][value="e2e_household"]')).toBeChecked();
    await page.getByRole('button', {
      name:'Begin Your Story', exact:true
    }).click();
    await expect(page.getByRole('heading', {
      name:'Your Story Begins', exact:true
    })).toBeVisible();

    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const spouse = s.chars[me.spouseId];
      return {
        aliases:FB.game.SCENARIOS === FBDATA.startScenarios &&
          FB.game.FAMILY_PRESETS === FBDATA.familyPresets,
        seed:s.seed,
        player:{
          tier:s.player.tier, profession:s.player.profession,
          gold:s.player.gold, prestige:s.player.prestige, piety:s.player.piety,
          warService:s.player.warService, focus:s.player.focus,
          origin:s.player.flags.e2e_origin,
          holdings:s.player.holdings.slice(),
          plots:s.player.landPlots.map(function (plot) {
            return [plot.provinceId, plot.settlement];
          })
        },
        career:{
          rank:me.career.rank, experience:me.career.experience
        },
        skills:{ lea:me.skills.lea, ste:me.skills.ste },
        items:s.player.items.map(function (ref) {
          const item = FB.resolveItem(s, ref);
          return { id:item.defId, quality:item.quality || null };
        }),
        rightHand:FB.resolveItem(s,
          FB.loadoutOf(s, me.id).rightHand).defId,
        age:s.date.year - me.born,
        spouse:!!spouse && spouse.spouseId === me.id,
        children:me.childrenIds.length
      };
    });

    expect(result.aliases).toBe(true);
    expect(result.seed).toBe(code);
    expect(result.player).toEqual({
      tier:0, profession:'farmer', gold:37, prestige:11, piety:9,
      warService:3, focus:'study', origin:'scribe', holdings:['letters'],
      plots:[['london', 0], ['london', 0]]
    });
    expect(result.career).toEqual({ rank:'master', experience:6 });
    expect(result.skills.lea).toBeGreaterThanOrEqual(4);
    expect(result.skills.ste).toBeGreaterThanOrEqual(2);
    expect(result.items).toEqual([
      { id:'ash_spear', quality:'well' },
      { id:'book_of_remedies', quality:'plain' }
    ]);
    expect(result.rightHand).toBe('ash_spear');
    expect(result.age).toBe(32);
    expect(result.spouse).toBe(true);
    expect(result.children).toBe(1);
  });

test('milestone-one validation protects baseline starts and rejects bad references',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);

    const result = await page.evaluate(function () {
      function copy(value) { return JSON.parse(JSON.stringify(value)); }
      function scenario(id) {
        const out = copy(FBDATA.startScenarios[0]);
        out.id = id;
        out.name = 'Validation fixture';
        out.desc = 'Rejected before application.';
        out.intro = 'A validation fixture for {name} in {province}.';
        return out;
      }
      const farmer = copy(FBDATA.startScenarios.filter(function (entry) {
        return entry.id === 'farmer';
      })[0]);
      farmer.tier = 2;
      const badProfession = scenario('e2e_bad_profession');
      badProfession.profession = 'missing_profession';
      const badFocus = scenario('e2e_bad_focus');
      badFocus.startEffects = { focus:'missing_focus' };
      const badItem = scenario('e2e_bad_item');
      badItem.startEffects = { items:[{ item:'missing_item' }] };
      const badHolding = scenario('e2e_bad_holding');
      badHolding.startEffects = { holdings:['missing_holding'] };
      const badRange = copy(FBDATA.familyPresets.filter(function (entry) {
        return entry.id === 'established';
      })[0]);
      badRange.id = 'e2e_bad_range';
      badRange.children = [3, 1];
      const badStandard = copy(FBDATA.familyPresets.filter(function (entry) {
        return entry.id === 'standard';
      })[0]);
      badStandard.age = 18;
      const before = JSON.stringify({
        scenarios:FBDATA.startScenarios,
        presets:FBDATA.familyPresets
      });
      const cases = [
        { data:{ startScenarios:[farmer] }, includes:'must remain 1' },
        { data:{ startScenarios:[badProfession] }, includes:'unknown profession' },
        { data:{ startScenarios:[badFocus] }, includes:'unknown focus' },
        { data:{ startScenarios:[badItem] }, includes:'unknown item' },
        { data:{ startScenarios:[badHolding] }, includes:'unknown id missing_holding' },
        { data:{ familyPresets:[badRange] }, includes:'minimum to maximum' },
        { data:{ familyPresets:[badStandard] }, includes:'historical age' }
      ];
      const errors = cases.map(function (entry) {
        try {
          FB.mods.apply(entry.data);
          return null;
        } catch (error) {
          return error.message.indexOf(entry.includes) >= 0;
        }
      });
      return {
        errors:errors,
        unchanged:before === JSON.stringify({
          scenarios:FBDATA.startScenarios,
          presets:FBDATA.familyPresets
        })
      };
    });

    expect(result.errors).toEqual([true, true, true, true, true, true, true]);
    expect(result.unchanged).toBe(true);
  });

test('milestone-two religious paths route, advance, localize, and restore by index',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      FB.mods.apply({
        religiousPaths:{
          e2e_devotion:{
            kind:'lay', faiths:['e2e_way'],
            ranks:[
              { id:'hearer', name:'Hearer', pietyYield:0 },
              { id:'patron', name:'Way Patron', name_f:'Way Patroness',
                age:16, piety:5, gold:2, prestigeGain:1, pietyYield:0.25 }
            ]
          },
          e2e_vocation:{
            kind:'vocation', faiths:['e2e_way'], professions:['monk'],
            ranks:[
              { id:'listener', name:'Listener', pietyYield:0.25 },
              { id:'keeper', name:'Keeper', age:16, years:2, learning:5,
                piety:7, prestige:3, gold:4, prestigeGain:6,
                pietyYield:0.75, station:1, flag:'e2e_keeper' }
            ]
          }
        },
        religions:{
          e2e_way:{
            name:'The Recorded Way', icon:'◇',
            properties:{
              religiousPaths:{
                lay:'e2e_devotion', professions:{ monk:'e2e_vocation' }
              }
            }
          }
        }
      });
      const s = FB.state;
      let me = s.chars[s.player.charId];
      me.religion = 'e2e_way';
      me.sex = 'f';
      me.religiousRanks = { e2e_devotion:0, removed_mod_path:4 };
      me.career.profession = 'farmer';
      const lay = FB.religiousPathOf(s, me);
      const layTitle = FB.religiousRankTitle(s, me, {
        id:lay.id, step:lay.next
      });
      FB.ui.showCareerPicker(me.id);
      const layButton = document.getElementById('career-religious');
      const layHelp = layButton ? layButton.textContent : '';
      FB.ui.closeModal();
      me.career.profession = 'monk';
      me.career.rank = 'journeyman';
      me.career.experience = 2;
      me.skills.lea = Math.max(Number(me.skills.lea) || 0, 5);
      s.player.gold = 20;
      s.player.prestige = 3;
      s.player.piety = 7;
      const before = FB.religiousAdvance(s, me);
      const advanced = FB.takeReligiousStep(s, me);
      const vocation = FB.religiousPathOf(s, me);
      const progressed = {
        gold:s.player.gold, prestige:s.player.prestige,
        flag:s.player.flags.e2e_keeper, station:FB.stationOf(me),
        title:FB.religiousRankTitle(s, me, vocation)
      };
      const payload = JSON.parse(FB.save.serialize());
      FB.save.restore(payload);
      const restored = FB.state;
      me = restored.chars[restored.player.charId];
      const restoredPath = FB.religiousPathOf(restored, me);
      const restoredTitle = FB.religiousRankTitle(restored, me, restoredPath);
      const savedIndex = me.religiousRanks.e2e_vocation;
      me.religion = 'orthodox';
      const inactive = FB.religiousPathOf(restored, me);
      return {
        lay:{ id:lay.id, kind:lay.kind, title:layTitle,
          row:!!layButton,
          requirements:layHelp.indexOf('Requires age 16, 5 piety') >= 0 &&
            layHelp.indexOf('Learning') < 0 },
        before:{ id:before.path.id, rank:before.step.id, blocked:before.blocked },
        advanced:advanced,
        vocation:{ id:vocation.id, rank:vocation.step.id,
          title:progressed.title },
        resources:progressed,
        restore:{ version:payload.v, index:savedIndex, title:restoredTitle },
        missingPath:{ inactive:inactive === null,
          progress:me.religiousRanks.removed_mod_path }
      };
    });

    expect(result.lay).toEqual({
      id:'e2e_devotion', kind:'lay', title:'Way Patroness', row:true,
      requirements:true
    });
    expect(result.before).toEqual({
      id:'e2e_vocation', rank:'keeper', blocked:false
    });
    expect(result.advanced).toBe(true);
    expect(result.vocation).toEqual({
      id:'e2e_vocation', rank:'keeper', title:'Keeper'
    });
    expect(result.resources).toEqual({
      gold:16, prestige:9, flag:1, station:1, title:'Keeper'
    });
    expect(result.restore).toEqual({ version:3, index:1, title:'Keeper' });
    expect(result.missingPath).toEqual({ inactive:true, progress:4 });
  });

test('milestone-two validation preserves rank indexes and rejects bad routes',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);

    const result = await page.evaluate(function () {
      function copy(value) { return JSON.parse(JSON.stringify(value)); }
      function path(id) {
        const out = {};
        out[id] = {
          kind:'lay', ranks:[{ id:'first', name:'First', pietyYield:0 }]
        };
        return out;
      }
      const reordered = copy(FBDATA.religiousPaths.catholic_lay);
      const swap = reordered.ranks[0];
      reordered.ranks[0] = reordered.ranks[1];
      reordered.ranks[1] = swap;
      const unknownFaith = path('e2e_unknown_faith');
      unknownFaith.e2e_unknown_faith.faiths = ['missing_faith'];
      const unknownProfession = path('e2e_unknown_profession');
      unknownProfession.e2e_unknown_profession.kind = 'vocation';
      unknownProfession.e2e_unknown_profession.professions = ['missing_job'];
      const badCost = path('e2e_bad_cost');
      badCost.e2e_bad_cost.ranks[0].gold = -1;
      const wrongProfession = copy(FBDATA.religiousPaths.catholic_monastic);
      const before = JSON.stringify({
        paths:FBDATA.religiousPaths, religions:FBDATA.religions
      });
      const cases = [
        { data:{ religiousPaths:{ catholic_lay:reordered } },
          includes:'must remain parishioner' },
        { data:{ religiousPaths:unknownFaith },
          includes:'unknown id missing_faith' },
        { data:{ religiousPaths:unknownProfession },
          includes:'unknown id missing_job' },
        { data:{ religiousPaths:badCost },
          includes:'number from 0 to 100000' },
        { data:{ religions:{ e2e_bad_route:{ name:'Bad route', properties:{
          religiousPaths:{ lay:'missing_path', professions:{} }
        } } } }, includes:'unknown religious path missing_path' },
        { data:{ religions:{ e2e_bad_kind:{ name:'Bad kind', properties:{
          religiousPaths:{ lay:'catholic_monastic', professions:{} }
        } } } }, includes:'must reference a lay path' },
        { data:{ religiousPaths:{ e2e_wrong_profession:wrongProfession },
          religions:{ e2e_bad_profession:{ name:'Bad profession', properties:{
            religiousPaths:{ lay:'catholic_lay',
              professions:{ priest:'e2e_wrong_profession' } }
          } } } }, includes:'path that allows profession priest' }
      ];
      const errors = cases.map(function (entry) {
        try {
          FB.mods.apply(entry.data);
          return null;
        } catch (error) {
          return error.message.indexOf(entry.includes) >= 0;
        }
      });
      return {
        errors:errors,
        unchanged:before === JSON.stringify({
          paths:FBDATA.religiousPaths, religions:FBDATA.religions
        })
      };
    });

    expect(result.errors).toEqual([true, true, true, true, true, true, true]);
    expect(result.unchanged).toBe(true);
  });
