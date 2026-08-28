'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/map_data.js',
  'data/starts.js',
  'data/cultures.js',
  'data/economy.js',
  'data/political_institutions.js',
  'data/traits.js',
  'data/intrigue.js',
  'data/technology.js',
  'js/model.js',
  'js/i18n.js',
  'js/world.js',
  'js/items.js',
  'js/economy.js',
  'js/events.js',
  'js/technology.js',
  'data/actions.js',
  'js/actions.js',
  'js/council.js',
  'js/intrigue.js',
  'js/save.js',
  'js/mods.js',
  'js/ui_misc.js',
  'js/ui_panels.js',
  'js/ui_modals.js',
  'js/main.js',
  'css/style.css'
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
      state.player.tier = 3;
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

test('serfFreedom exposes only bounded story routes and rejects rank conflicts',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      function accepted(fx) {
        try {
          FB.validateSerfFreedomEffect(fx);
          return true;
        } catch (error) { return false; }
      }
      const eventCount = FBDATA.events.length;
      let modRejected = false;
      try {
        FB.mods.apply({ events:[{
          id:'e2e_invalid_serf_freedom', title:'Invalid freedom',
          text:'This event must never be installed.', trigger:{ never:true },
          options:[{ label:'Reject it',
            effects:{ serfFreedom:{ route:'purchase' } } }]
        }] });
      } catch (error) {
        modRejected = error.message.indexOf('old_custom or flight') >= 0;
      }
      return {
        oldCustom:accepted({ serfFreedom:{ route:'old_custom' } }),
        flight:accepted({ serfFreedom:{ route:'flight' } }),
        purchase:accepted({ serfFreedom:{ route:'purchase' } }),
        manumission:accepted({ serfFreedom:{ route:'manumission' } }),
        malformed:accepted({ serfFreedom:{ route:'flight', price:0 } }),
        missingObject:accepted({ serfFreedom:null }),
        tierSet:accepted({ serfFreedom:{ route:'flight' }, tierSet:1 }),
        tierUp:accepted({ serfFreedom:{ route:'flight' }, tierUp:true }),
        modRejected:modRejected,
        modUnchanged:FBDATA.events.length === eventCount &&
          !FBDATA.events.some(function (event) {
            return event.id === 'e2e_invalid_serf_freedom';
          })
      };
    });

    expect(result).toEqual({
      oldCustom:true,
      flight:true,
      purchase:false,
      manumission:false,
      malformed:false,
      missingObject:false,
      tierSet:false,
      tierUp:false,
      modRejected:true,
      modUnchanged:true
    });
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

test('milestone-three council seats activate, appoint, localize, and restore by id',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await page.evaluate(function () {
      FB.mods.apply({
        traits:{
          e2e_watchful:{
            name:'Watchful', class:'disposition', noRandom:true, int:1
          }
        },
        councilSeats:{
          e2e_justiciar:{
            name:'Justiciar', icon:'§',
            desc:'+2.5 judgment while this officer serves',
            bonusKey:'judgment', bonusAmount:2.5,
            tierMin:7, holderEligibility:'direct_vassal'
          }
        },
        councilRules:{ schemerTraits:['e2e_watchful'] }
      });
    });
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      const s = FB.state;
      const home = FB.world.byId[s.player.provinceId];
      s.player.tier = 6;
      for (let i = 0; i < 6; i++) {
        const id = 'e2e_council_' + i;
        s.realms[id] = {
          id:id, name:'Test March ' + i, alive:true, liege:'player', rank:1,
          capital:s.player.provinceId, color:'#705435', aggression:0,
          culture:home.culture, religion:home.religion, favor:0,
          ruler:{
            name:'Officer ' + i, sex:'m', culture:home.culture,
            age:35 + i, mar:5, trait:'e2e_watchful', generation:1
          }
        };
        FB.setRealmRulerStanding(s, id, 0);
      }
      if (FB.invalidateRealmCache) FB.invalidateRealmCache();
      s.council = { authority:60, seats:{ e2e_justiciar:null } };
      FB.councilEnsure(s);
      const kingSeats = FB.councilSeats(s).map(function (seat) {
        return seat.id;
      });
      const kingSavedValue = s.council.seats.e2e_justiciar;
      s.player.tier = 7;
      FB.councilEnsure(s);
      const holderId = s.council.seats.e2e_justiciar;
      s.realms[holderId].ruler.trait = 'e2e_watchful';
      FB.setRealmRulerStanding(s, holderId, -10);
      const summary = FB.councilSummary(s);
      FB.ui.showCouncil();
      const sheet = document.getElementById('gm-body').textContent;
      FB.ui.closeModal();
      const seatResult = {
        bonus:FB.councilBonus(s, 'judgment'),
        name:FB.councilSeatName(s, 'e2e_justiciar'),
        desc:FB.councilSeatDescription(s, 'e2e_justiciar'),
        schemer:summary.schemerIds.indexOf(holderId) >= 0,
        ui:sheet.indexOf('Justiciar') >= 0 &&
          sheet.indexOf('+2.5 judgment while this officer serves') >= 0
      };
      const payload = JSON.parse(FB.save.serialize());
      FB.save.restore(payload);
      const restored = FB.state;
      const restoredSummary = FB.councilSummary(restored);
      const restoredHolder = restored.council.seats.e2e_justiciar;
      delete FBDATA.councilSeats.e2e_justiciar;
      const withoutDefinition = FB.councilSummary(restored);
      return {
        activation:{
          kingHas:kingSeats.indexOf('e2e_justiciar') >= 0,
          kingSavedValue:kingSavedValue,
          emperorHas:summary.seats.some(function (seat) {
            return seat.id === 'e2e_justiciar';
          })
        },
        seat:{
          holder:holderId,
          bonus:seatResult.bonus,
          name:seatResult.name,
          desc:seatResult.desc,
          schemer:seatResult.schemer,
          ui:seatResult.ui
        },
        restore:{
          version:payload.v,
          holder:restoredHolder,
          visible:restoredSummary.seats.some(function (seat) {
            return seat.id === 'e2e_justiciar' &&
              seat.holderId === restoredHolder;
          })
        },
        removed:{
          saved:restored.council.seats.e2e_justiciar,
          visible:withoutDefinition.seats.some(function (seat) {
            return seat.id === 'e2e_justiciar';
          })
        }
      };
    });

    expect(result.activation).toEqual({
      kingHas:false, kingSavedValue:null, emperorHas:true
    });
    expect(result.seat.holder).toMatch(/^e2e_council_/);
    expect(result.seat).toEqual({
      holder:result.seat.holder,
      bonus:2.5,
      name:'Justiciar',
      desc:'+2.5 judgment while this officer serves',
      schemer:true,
      ui:true
    });
    expect(result.restore).toEqual({
      version:3, holder:result.seat.holder, visible:true
    });
    expect(result.removed).toEqual({
      saved:result.seat.holder, visible:false
    });
  });

test('milestone-three council validation rejects malformed definitions before mutation',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);

    const result = await page.evaluate(function () {
      function seat() {
        return {
          name:'Test Office', icon:'§', desc:'A test office.',
          bonusKey:'test', bonusAmount:1,
          tierMin:6, holderEligibility:'direct_vassal'
        };
      }
      const before = JSON.stringify({
        seats:FBDATA.councilSeats, rules:FBDATA.councilRules
      });
      const cases = [
        { data:{ councilSeats:{ BadSeat:seat() } },
          includes:'invalid seat id' },
        { data:{ councilSeats:{ e2e_missing_name:Object.assign(seat(), {
          name:''
        }) } }, includes:'must be a non-empty string' },
        { data:{ councilSeats:{ e2e_bad_bonus:Object.assign(seat(), {
          bonusAmount:-1
        }) } }, includes:'number from 0 to 100' },
        { data:{ councilSeats:{ e2e_bad_tier:Object.assign(seat(), {
          tierMin:8
        }) } }, includes:'integer from 0 to 7' },
        { data:{ councilSeats:{ e2e_bad_holder:Object.assign(seat(), {
          holderEligibility:'courtier'
        }) } }, includes:'must be direct_vassal' },
        { data:{ councilRules:{ schemerTraits:['missing_trait'] } },
          includes:'unknown id missing_trait' },
        { data:{ councilRules:{ schemerTraits:[], extra:true } },
          includes:'extra is not recognized' }
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
          seats:FBDATA.councilSeats, rules:FBDATA.councilRules
        })
      };
    });

    expect(result.errors).toEqual([true, true, true, true, true, true, true]);
    expect(result.unchanged).toBe(true);
  });

test('milestone-four phase A projects protected baseline action catalogues and rebuilds indexes',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      function sameValue(left, right) {
        return JSON.stringify(left) === JSON.stringify(right);
      }
      function hasFunction(value) {
        if (typeof value === 'function') return true;
        if (!value || typeof value !== 'object') return false;
        for (const key in value) {
          if (Object.prototype.hasOwnProperty.call(value, key) &&
              hasFunction(value[key])) return true;
        }
        return false;
      }
      const protectedFields = [
        'show', 'tick', 'gain', 'can', 'run', 'noConsume',
        'deferCooldown', 'opensChoices', 'compatibilityAlias'
      ];
      const focusMetadata = FBDATA.focuses.every(function (def, index) {
        const projected = FB.focuses[index];
        return def.order === index && projected.id === def.id &&
          projected.label === def.label &&
          sameValue(projected.vocational, def.vocational) &&
          projected.shortcutFamily === def.shortcutFamily &&
          typeof projected.show === 'function' &&
          typeof projected.tick === 'function' &&
          typeof projected.desc === 'function';
      });
      const deedMetadata = FBDATA.deeds.every(function (def, index) {
        const projected = FB.instants[index];
        return def.order === index && projected.id === def.id &&
          projected.label === def.label && projected.group === def.group &&
          projected.flow === def.flow &&
          (def.cooldownDays === undefined ||
            projected.cd === def.cooldownDays) &&
          sameValue(projected.requiresTech, def.requiresTech) &&
          typeof projected.show === 'function' &&
          typeof projected.run === 'function' &&
          typeof projected.desc === 'function' &&
          def.flow === (projected.opensChoices ? 'choices'
            : (projected.noConsume ? 'no_day' : 'immediate'));
      });
      const recordsAreMetadataOnly = !hasFunction(FBDATA.focuses) &&
        !hasFunction(FBDATA.deeds) &&
        FBDATA.focuses.concat(FBDATA.deeds).every(function (def) {
          return protectedFields.every(function (field) {
            return !Object.prototype.hasOwnProperty.call(def, field);
          });
        });

      const focusIndex = 2;
      const deedIndex = 0;
      const originalFocusDef = FBDATA.focuses[focusIndex];
      const originalDeedDef = FBDATA.deeds[deedIndex];
      const originalFocus = FB.focuses[focusIndex];
      const originalDeed = FB.instants[deedIndex];
      const originalFocusShow = originalFocus.show;
      const originalPlayerFocus = FB.state.player.focus;
      const revision = FB.actionCatalogRevision;
      let rebuilt;
      try {
        originalFocus.show = function () { return false; };
        FBDATA.focuses[focusIndex] = Object.assign({}, originalFocusDef, {
          label:'Indexed Rest', desc:'A rebuilt focus description.'
        });
        FBDATA.deeds[deedIndex] = Object.assign({}, originalDeedDef, {
          label:'Indexed Poach', desc:'A rebuilt deed description.'
        });
        FB.rebuildActionCatalogs();
        const projectedFocus = FB.focuses[focusIndex];
        const projectedDeed = FB.instants[deedIndex];
        const rebuiltFocuses = FB.focuses;
        FB.state.player.focus = 'rest';
        FB.focuses = FB.focuses.filter(function (focus) {
          return focus.id !== 'rest';
        });
        FB.validateFocus(FB.state);
        const focusIndexFresh = FB.state.player.focus === 'rest';
        FB.focuses = rebuiltFocuses;
        rebuilt = {
          revision:FB.actionCatalogRevision === revision + 1,
          focusLabel:projectedFocus.label,
          focusDesc:projectedFocus.desc(FB.state),
          deedLabel:projectedDeed.label,
          deedDesc:projectedDeed.desc(FB.state),
          focusIndexFresh:focusIndexFresh,
          deedIndexFresh:FB.instantStatus(FB.state, 'poach').action === projectedDeed,
          focusHandlerStable:projectedFocus.show === originalFocusShow &&
            projectedFocus.tick === originalFocus.tick,
          deedHandlerStable:projectedDeed.show === originalDeed.show &&
            projectedDeed.run === originalDeed.run
        };
      } finally {
        FBDATA.focuses[focusIndex] = originalFocusDef;
        FBDATA.deeds[deedIndex] = originalDeedDef;
        FB.rebuildActionCatalogs();
        FB.state.player.focus = originalPlayerFocus;
      }
      return {
        counts:[FBDATA.focuses.length, FBDATA.deeds.length],
        validation:FB.validateActionData(),
        focusMetadata:focusMetadata,
        deedMetadata:deedMetadata,
        recordsAreMetadataOnly:recordsAreMetadataOnly,
        rebuilt:rebuilt,
        restored:[FB.focuses[focusIndex].label, FB.instants[deedIndex].label]
      };
    });

    expect(result.counts).toEqual([28, 80]);
    expect(result.validation).toEqual([]);
    expect(result.focusMetadata).toBe(true);
    expect(result.deedMetadata).toBe(true);
    expect(result.recordsAreMetadataOnly).toBe(true);
    expect(result.rebuilt).toEqual({
      revision:true,
      focusLabel:'Indexed Rest',
      focusDesc:'A rebuilt focus description.',
      deedLabel:'Indexed Poach',
      deedDesc:'A rebuilt deed description.',
      focusIndexFresh:true,
      deedIndexFresh:true,
      focusHandlerStable:true,
      deedHandlerStable:true
    });
    expect(result.restored).toEqual(['🛌 Rest and mend', '🏹 Poach the lord’s game']);
  });

test('milestone-four phase A rejects malformed internal action data without mutation',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);

    const result = await page.evaluate(function () {
      function validatePatch(kind, index, patch) {
        const records = kind === 'focus' ? FBDATA.focuses : FBDATA.deeds;
        const original = records[index];
        records[index] = Object.assign({}, original, patch);
        const message = FB.validateActionData().join(' ');
        records[index] = original;
        return message;
      }
      const cases = [
        validatePatch('focus', 0, { order:99 }),
        validatePatch('focus', 0, { handler:'rest' }),
        validatePatch('focus', 0, { extra:true }),
        validatePatch('deed', 0, { flow:'choices' }),
        validatePatch('deed', 0, { requiresTech:'missing_technology' }),
        validatePatch('deed', 0, { cooldownDays:-1 }),
        validatePatch('focus', 0, { order:1 }),
        validatePatch('focus', 4, { vocational:'missing_vocation' })
      ];
      const beforeFocuses = FB.focuses;
      const beforeInstants = FB.instants;
      const beforeRevision = FB.actionCatalogRevision;
      const original = FBDATA.deeds[0];
      let rebuildError = '';
      FBDATA.deeds[0] = Object.assign({}, original, { extra:true });
      try {
        FB.rebuildActionCatalogs();
      } catch (error) {
        rebuildError = error.message;
      }
      FBDATA.deeds[0] = original;
      const rebuildAtomic = FB.focuses === beforeFocuses &&
        FB.instants === beforeInstants &&
        FB.actionCatalogRevision === beforeRevision;
      const beforeData = JSON.stringify({
        focuses:FBDATA.focuses, deeds:FBDATA.deeds
      });
      return {
        cases:cases,
        rebuildError:rebuildError,
        rebuildAtomic:rebuildAtomic,
        dataUnchanged:beforeData === JSON.stringify({
          focuses:FBDATA.focuses, deeds:FBDATA.deeds
        }),
        validAfter:FB.validateActionData()
      };
    });

    expect(result.cases[0]).toContain('order must be an integer from 0 to 27');
    expect(result.cases[1]).toContain('must retain its baseline handler');
    expect(result.cases[2]).toContain('extra is not recognized');
    expect(result.cases[3]).toContain('flow must match its baseline handler');
    expect(result.cases[4]).toContain('unknown technology missing_technology');
    expect(result.cases[5]).toContain('cooldownDays must be an integer from 0 to 36000');
    expect(result.cases[6]).toContain('must not repeat order 1');
    expect(result.cases[7]).toContain('unknown vocation missing_vocation');
    expect(result.rebuildError).toContain('Invalid action catalogue');
    expect(result.rebuildAtomic).toBe(true);
    expect(result.dataUnchanged).toBe(true);
    expect(result.validAfter).toEqual([]);
  });

test('milestone-four phase B composes bounded overrides with protected action handlers',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const character = s.chars[p.charId];
      const originalBorn = character.born;
      const originalProfession = p.profession;
      const originalFocus = FB.focuses.filter(function (focus) {
        return focus.id === 'rest';
      })[0];
      const originalDeed = FB.instants.filter(function (deed) {
        return deed.id === 'give_alms';
      })[0];
      p.flags.e2e_action_ready = 1;
      delete p.flags.e2e_action_blocked;
      character.traits.push('e2e_action_ready_trait');
      const eligibility = {
        reason:'The action charter is not satisfied.',
        ageMin:0, ageMax:100, tierMin:0, tierMax:7,
        sex:character.sex, professions:[originalProfession],
        traitsAll:['e2e_action_ready_trait'],
        traitsAny:['e2e_action_ready_trait'],
        traitsNone:['e2e_action_blocked_trait'], faiths:[character.religion],
        cultures:[character.culture], flagsAll:['e2e_action_ready'],
        flagsAny:['e2e_action_ready'], flagsNone:['e2e_action_blocked'],
        atWar:false, independent:!p.liege, traveling:false
      };
      FB.mods.apply({
        traits:{
          e2e_action_ready_trait:{
            name:'Action Ready', desc:'A same-mod action eligibility trait.',
            class:'condition', noRandom:true
          },
          e2e_action_blocked_trait:{
            name:'Action Blocked', desc:'A same-mod exclusion trait.',
            class:'condition', noRandom:true
          }
        },
        focuses:[
          { id:'rest', order:3, label:'🛌 Chartered rest',
            desc:'Rest under the action charter.', eligibility:eligibility },
          { id:'pray', order:2 }
        ],
        deeds:[
          { id:'give_alms', order:27, label:'🕯 Chartered alms',
            desc:'Give alms under the action charter.', group:'work',
            layoutGroup:'personal',
            cooldownDays:7, requiresTech:[], eligibility:eligibility },
          { id:'begin_plot', order:26 },
          { id:'seek_match', label:'💍 Chartered match',
            desc:'Use the chartered marriage search.' }
        ]
      });
      const rest = FB.focuses.filter(function (focus) {
        return focus.id === 'rest';
      })[0];
      const alms = FB.instants.filter(function (deed) {
        return deed.id === 'give_alms';
      })[0];
      const match = FB.instants.filter(function (deed) {
        return deed.id === 'seek_match';
      })[0];
      p.gold = 100;
      const ready = FB.instantStatus(s, 'give_alms');
      const projected = {
        focusOrder:FB.focuses.map(function (focus) { return focus.id; })
          .slice(0, 4),
        deedOrder:FB.instants.map(function (deed) { return deed.id; })
          .slice(25, 28),
        focusLabel:FB.dataText(s, p.charId, 'focus', 'rest', rest, 'label'),
        focusDesc:rest.desc(s),
        deedLabel:FB.dataText(s, p.charId, 'action', 'give_alms', alms, 'label'),
        deedDesc:alms.desc(s),
        group:alms.group,
        layoutGroup:alms.layoutGroup,
        cooldown:alms.cd,
        requirements:alms.requiresTech,
        focusVisible:FB.listFocuses(s).some(function (focus) {
          return focus.id === 'rest';
        }),
        deedReady:ready.shown && ready.can,
        sameModTrait:!!FBDATA.traits.e2e_action_ready_trait,
        focusHandlerStable:rest.tick === originalFocus.tick,
        deedHandlerStable:alms.run === originalDeed.run,
        dynamicPresentationOverridden:match.uiLabel === undefined &&
          match.label === '💍 Chartered match' &&
          match.desc(s) === 'Use the chartered marriage search.'
      };

      p.gold = 0;
      const handlerBlocked = FB.instantStatus(s, 'give_alms').reason;
      p.gold = 100;
      delete p.flags.e2e_action_ready;
      const dataBlocked = FB.instantStatus(s, 'give_alms');
      const focusBlocked = !FB.listFocuses(s).some(function (focus) {
        return focus.id === 'rest';
      });
      p.flags.e2e_action_ready = 1;
      character.born = s.date.year - 10;
      const protectedFocusGuard = !FB.listFocuses(s).some(function (focus) {
        return focus.id === 'rest';
      });
      character.born = originalBorn;

      p.focus = 'rest';
      const beforeTurn = s.turn;
      const beforeGold = p.gold;
      FB.runInstant(s, 'give_alms');
      const execution = {
        turn:s.turn - beforeTurn,
        gold:p.gold - beforeGold,
        cooldown:p.cooldowns.give_alms,
        expectedCooldown:beforeTurn
      };
      const payload = JSON.parse(FB.save.serialize());
      FB.save.restore(payload);
      return {
        projected:projected,
        handlerBlocked:handlerBlocked,
        dataBlocked:{ can:dataBlocked.can, reason:dataBlocked.reason },
        focusBlocked:focusBlocked,
        protectedFocusGuard:protectedFocusGuard,
        execution:execution,
        restored:{
          version:payload.v,
          focus:FB.state.player.focus,
          cooldown:FB.state.player.cooldowns.give_alms,
          label:FB.instants.filter(function (deed) {
            return deed.id === 'give_alms';
          })[0].label
        }
      };
    });

    expect(result.projected).toEqual({
      focusOrder:['study', 'play', 'pray', 'rest'],
      deedOrder:['great_holy_war_settlement', 'begin_plot', 'give_alms'],
      focusLabel:'🛌 Chartered rest',
      focusDesc:'Rest under the action charter.',
      deedLabel:'🕯 Chartered alms',
      deedDesc:'Give alms under the action charter.',
      group:'work', layoutGroup:'personal', cooldown:7, requirements:[],
      focusVisible:true, deedReady:true, sameModTrait:true,
      focusHandlerStable:true, deedHandlerStable:true,
      dynamicPresentationOverridden:true
    });
    expect(result.handlerBlocked).toBe('Nothing to spare.');
    expect(result.dataBlocked).toEqual({
      can:false, reason:'The action charter is not satisfied.'
    });
    expect(result.focusBlocked).toBe(true);
    expect(result.protectedFocusGuard).toBe(true);
    expect(result.execution).toEqual({
      turn:1, gold:-10,
      cooldown:result.execution.expectedCooldown,
      expectedCooldown:result.execution.expectedCooldown
    });
    expect(result.restored).toEqual({
      version:3,
      focus:'rest',
      cooldown:result.execution.expectedCooldown,
      label:'🕯 Chartered alms'
    });
  });

test('milestone-four phase B rejects unsafe overrides before any catalogue mutation',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);

    const result = await page.evaluate(function () {
      function attempt(data, expected) {
        const before = JSON.stringify({
          focuses:FBDATA.focuses, deeds:FBDATA.deeds
        });
        const focusProjection = FB.focuses;
        const deedProjection = FB.instants;
        const revision = FB.actionCatalogRevision;
        let message = '';
        try {
          FB.mods.apply(data);
        } catch (error) {
          message = error.message;
        }
        return {
          rejected:message.indexOf(expected) >= 0,
          unchanged:before === JSON.stringify({
            focuses:FBDATA.focuses, deeds:FBDATA.deeds
          }) && focusProjection === FB.focuses &&
            deedProjection === FB.instants &&
            revision === FB.actionCatalogRevision
        };
      }
      return [
        attempt({ focuses:[{ id:'e2e_new_focus', label:'Unsafe' }] },
          'cannot add unknown baseline id'),
        attempt({ focuses:[{ id:'constructor', label:'Unsafe' }] },
          'cannot add unknown baseline id constructor'),
        attempt({ deeds:[{ id:'poach', handler:'poach' }] },
          'handler is not recognized'),
        attempt({ deeds:[{ id:'poach', constructor:true }] },
          'constructor is not recognized'),
        attempt({ deeds:[{ id:'poach', flow:'no_day' }] },
          'flow is not recognized'),
        attempt({ focuses:[{ id:'study', order:1 }] },
          'must not repeat order 1'),
        attempt({ deeds:[{ id:'poach', cooldownDays:36001 }] },
          'cooldownDays must be an integer from 0 to 36000'),
        attempt({ deeds:[{ id:'seek_match', cooldownDays:10 }] },
          'uses a protected dynamic cooldown'),
        attempt({ deeds:[{ id:'poach', group:'unknown' }] },
          'has an invalid group'),
        attempt({ deeds:[{ id:'poach', group:'constructor' }] },
          'has an invalid group'),
        attempt({ deeds:[{ id:'poach', layoutGroup:'unknown' }] },
          'has an invalid layout group'),
        attempt({ deeds:[{ id:'poach', requiresTech:'missing_technology' }] },
          'unknown technology missing_technology'),
        attempt({ deeds:[{ id:'poach', requiresTech:['crop_rotation', 'crop_rotation'] }] },
          'must not repeat crop_rotation'),
        attempt({ focuses:[{ id:'rest', eligibility:{
          reason:'Blocked.', professions:['missing_career']
        } }] }, 'unknown id missing_career'),
        attempt({ focuses:[{ id:'rest', eligibility:{
          reason:'Blocked.', traitsAll:['missing_trait']
        } }] }, 'unknown id missing_trait'),
        attempt({ focuses:[{ id:'rest', eligibility:{
          reason:'Blocked.', faiths:['missing_faith']
        } }] }, 'unknown id missing_faith'),
        attempt({ focuses:[{ id:'rest', eligibility:{
          reason:'Blocked.', cultures:['missing_culture']
        } }] }, 'unknown id missing_culture'),
        attempt({ focuses:[{ id:'rest', eligibility:{
          reason:'Blocked.', flagsAll:['BadFlag']
        } }] }, 'has an invalid id'),
        attempt({ focuses:[{ id:'rest', eligibility:{ ageMin:18 } }] },
          'reason must be a non-empty string')
      ];
    });

    expect(result.every(function (entry) {
      return entry.rejected && entry.unchanged;
    })).toBe(true);
  });

test('milestone-four phase C adds previewable declarative deeds with atomic execution',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const setup = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const rngBefore = JSON.stringify(FB.getRngState());
      const eventWasAbsent = FB.eventById('e2e_declarative_followup') === null;
      FB.mods.apply({
        events:[{
          id:'e2e_declarative_followup',
          title:'A promised audience',
          text:'The promised audience is ready.',
          trigger:{ never:true },
          options:[{ label:'Attend', effects:{} }]
        }],
        deeds:[
          {
            id:'e2e_declarative_exchange', handler:'declarative_deed',
            label:'Make the chartered exchange',
            desc:'Trade coin and standing for a pious endowment.',
            order:80, group:'life', cooldownDays:12, spendsDay:false,
            layoutGroup:'personal',
            requiresTech:'crop_rotation',
            visibility:{ flagsAll:['e2e_deed_visible'] },
            eligibility:{
              reason:'The charter has not yet been signed.',
              flagsAll:['e2e_deed_eligible']
            },
            costs:{ gold:10, prestige:2 },
            effects:{ gold:3, piety:4 }
          },
          {
            id:'e2e_declarative_day', handler:'declarative_deed',
            label:'Spend a day on the charter',
            desc:'Complete one bounded day-spending deed.',
            order:81, group:'life', cooldownDays:0, spendsDay:true,
            effects:{ prestige:1 }
          },
          {
            id:'e2e_declarative_story', handler:'declarative_deed',
            label:'Request the promised audience',
            desc:'Pay for one authored follow-up event.',
            order:82, group:'life', cooldownDays:5, spendsDay:false,
            costs:{ piety:1 }, queueEvent:'e2e_declarative_followup'
          }
        ]
      });

      const hidden = FB.instantStatus(s, 'e2e_declarative_exchange');
      p.flags.e2e_deed_visible = 1;
      const tech = FB.realmTechRecord(s);
      const completedIndex = tech.completed.indexOf('crop_rotation');
      if (completedIndex >= 0) tech.completed.splice(completedIndex, 1);
      const techBlocked = FB.instantStatus(s, 'e2e_declarative_exchange');
      tech.completed.push('crop_rotation');
      const eligibilityBlocked = FB.instantStatus(
        s, 'e2e_declarative_exchange');
      p.flags.e2e_deed_eligible = 1;
      p.gold = 5;
      p.prestige = 1;
      const costBlocked = FB.instantStatus(s, 'e2e_declarative_exchange');
      p.gold = 30;
      p.prestige = 10;
      p.piety = 5;
      const ready = FB.instantStatus(s, 'e2e_declarative_exchange');
      const storyReady = FB.instantStatus(s, 'e2e_declarative_story');
      const revision = FB.actionCatalogRevision;
      let partialReplacementRejected = false;
      try {
        FB.mods.apply({ deeds:[{
          id:'e2e_declarative_day', label:'Incomplete replacement'
        }] });
      } catch (error) {
        partialReplacementRejected =
          error.message.indexOf('handler must be declarative_deed') >= 0 &&
          FB.actionCatalogRevision === revision;
      }
      FB.ui.refresh();
      return {
        eventWasAbsent:eventWasAbsent,
        sameModEvent:FB.eventById('e2e_declarative_followup').title,
        count:FBDATA.deeds.length,
        hidden:{ shown:hidden.shown, preview:hidden.preview || null },
        techBlocked:{ can:techBlocked.can, reason:techBlocked.reason },
        eligibilityBlocked:{
          shown:eligibilityBlocked.shown,
          can:eligibilityBlocked.can,
          reason:eligibilityBlocked.reason
        },
        costBlocked:{ can:costBlocked.can, reason:costBlocked.reason },
        ready:{
          shown:ready.shown, can:ready.can,
          flow:ready.action.flow, noConsume:ready.action.noConsume,
          layoutGroup:ready.action.layoutGroup,
          manualOnly:ready.action.manualOnly,
          declarative:ready.action.declarative,
          preview:ready.preview
        },
        storyPreview:storyReady.preview,
        partialReplacementRejected:partialReplacementRejected,
        rngUnchanged:rngBefore === JSON.stringify(FB.getRngState())
      };
    });

    expect(setup.eventWasAbsent).toBe(true);
    expect(setup.sameModEvent).toBe('A promised audience');
    expect(setup.count).toBe(83);
    expect(setup.hidden).toEqual({ shown:false, preview:null });
    expect(setup.techBlocked).toEqual({
      can:false,
      reason:'A required national technology has not been completed.'
    });
    expect(setup.eligibilityBlocked).toEqual({
      shown:true, can:false, reason:'The charter has not yet been signed.'
    });
    expect(setup.costBlocked.can).toBe(false);
    expect(setup.costBlocked.reason).toContain('Requires');
    expect(setup.ready).toEqual({
      shown:true, can:true, flow:'no_day', noConsume:true,
      layoutGroup:'personal',
      manualOnly:true, declarative:true,
      preview:{
        costs:[
          { type:'gold', amount:-10, cost:true },
          { type:'prestige', amount:-2, cost:true }
        ],
        effects:[
          { type:'gold', amount:3, reward:true },
          { type:'piety', amount:4, reward:true }
        ],
        queueEvent:null, spendsDay:false
      }
    });
    expect(setup.rngUnchanged).toBe(true);
    expect(setup.partialReplacementRejected).toBe(true);
    expect(setup.storyPreview).toEqual({
      costs:[{ type:'piety', amount:-1, cost:true }],
      effects:[{ type:'queue', eventId:'e2e_declarative_followup' }],
      queueEvent:'e2e_declarative_followup', spendsDay:false
    });

    await page.locator('#sidetabs [data-tab="actions"]').click();
    await page.locator('[data-action-group="life"]').click();
    const exchangeRow = page.locator(
      '[data-action-id="e2e_declarative_exchange"]').locator('xpath=..');
    await expect(exchangeRow).toHaveAttribute('data-deed-flow', 'no-day');
    await expect(exchangeRow.locator('.deed-details')).toContainText('Costs');
    await expect(exchangeRow.locator('.deed-details')).toContainText('Effects');
    await expect(exchangeRow.locator('.deed-details')).toContainText('Money');
    await expect(exchangeRow.locator('.deed-details')).toContainText('Prestige');
    await expect(exchangeRow.locator('.deed-details')).toContainText('Piety +4');
    const storyRow = page.locator(
      '[data-action-id="e2e_declarative_story"]').locator('xpath=..');
    await expect(storyRow.locator('.deed-details')).toContainText(
      'Queues event: A promised audience');

    const execution = await page.evaluate(function () {
      let s = FB.state;
      let p = s.player;
      p.flags.tutorial = 1;
      delete p.flags.tutorial_done;
      delete p.flags.tut_deed;
      const beforeExchange = {
        turn:s.turn, gold:p.gold, prestige:p.prestige, piety:p.piety,
        rng:JSON.stringify(FB.getRngState())
      };
      FB.runInstant(s, 'e2e_declarative_exchange');
      const exchange = {
        turn:s.turn - beforeExchange.turn,
        gold:p.gold - beforeExchange.gold,
        prestige:p.prestige - beforeExchange.prestige,
        piety:p.piety - beforeExchange.piety,
        cooldown:p.cooldowns.e2e_declarative_exchange,
        tutorial:p.flags.tut_deed,
        rngUnchanged:beforeExchange.rng === JSON.stringify(FB.getRngState())
      };

      const queueBefore = s.eventQueue.length;
      const storyTurn = s.turn;
      const storyPiety = p.piety;
      FB.runInstant(s, 'e2e_declarative_story');
      const story = {
        turn:s.turn - storyTurn,
        piety:p.piety - storyPiety,
        queued:s.eventQueue.length - queueBefore,
        eventId:s.eventQueue[s.eventQueue.length - 1].id,
        cooldown:p.cooldowns.e2e_declarative_story
      };

      delete p.flags.tut_deed;
      const dayTurn = s.turn;
      const dayPrestige = p.prestige;
      const originalPassDay = FB.game.passDay;
      let observed = null;
      FB.game.passDay = function (options) {
        observed = {
          skipFocus:!!(options && options.skipFocus),
          prestige:p.prestige,
          cooldown:p.cooldowns.e2e_declarative_day,
          tutorial:p.flags.tut_deed
        };
        s.turn++;
      };
      try {
        FB.runInstant(s, 'e2e_declarative_day');
      } finally {
        FB.game.passDay = originalPassDay;
      }
      const day = {
        turn:s.turn - dayTurn,
        prestige:p.prestige - dayPrestige,
        observed:observed
      };

      const payload = JSON.parse(FB.save.serialize());
      FB.save.restore(payload);
      s = FB.state;
      p = s.player;
      const restored = {
        version:payload.v,
        exchange:p.cooldowns.e2e_declarative_exchange,
        story:p.cooldowns.e2e_declarative_story,
        day:p.cooldowns.e2e_declarative_day
      };
      FB.installActionData(FBDATA.focuses, FBDATA.deeds.filter(function (def) {
        return def.handler !== 'declarative_deed';
      }));
      const missing = FB.instantStatus(s, 'e2e_declarative_exchange');
      return {
        beforeTurn:beforeExchange.turn,
        exchange:exchange,
        story:story,
        storyTurn:storyTurn,
        dayTurn:dayTurn,
        day:day,
        restored:restored,
        disappearance:{
          action:missing.action, shown:missing.shown, can:missing.can,
          cooldowns:[
            p.cooldowns.e2e_declarative_exchange,
            p.cooldowns.e2e_declarative_story,
            p.cooldowns.e2e_declarative_day
          ]
        }
      };
    });

    expect(execution.exchange).toEqual({
      turn:0, gold:-7, prestige:-2, piety:4,
      cooldown:execution.beforeTurn, tutorial:1, rngUnchanged:true
    });
    expect(execution.story).toEqual({
      turn:0, piety:-1, queued:1,
      eventId:'e2e_declarative_followup', cooldown:execution.storyTurn
    });
    expect(execution.day).toEqual({
      turn:1, prestige:1,
      observed:{
        skipFocus:true, prestige:9,
        cooldown:execution.dayTurn, tutorial:1
      }
    });
    expect(execution.restored).toEqual({
      version:3,
      exchange:execution.beforeTurn,
      story:execution.storyTurn,
      day:execution.dayTurn
    });
    expect(execution.disappearance).toEqual({
      action:null, shown:false, can:false,
      cooldowns:[execution.beforeTurn, execution.storyTurn, execution.dayTurn]
    });
  });

test('milestone-four phase C rejects unsafe declarative deeds without mutation',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);

    const result = await page.evaluate(function () {
      function deed(patch) {
        return Object.assign({
          id:'e2e_unsafe_deed', handler:'declarative_deed',
          label:'Unsafe deed', desc:'A rejected declarative deed.',
          order:80, group:'life', cooldownDays:1, spendsDay:false,
          effects:{ piety:1 }
        }, patch || {});
      }
      function without(field) {
        const value = deed();
        delete value[field];
        return value;
      }
      function attempt(data, expected) {
        const before = JSON.stringify({
          focuses:FBDATA.focuses, deeds:FBDATA.deeds, events:FBDATA.events
        });
        const focusProjection = FB.focuses;
        const deedProjection = FB.instants;
        const revision = FB.actionCatalogRevision;
        let message = '';
        try {
          FB.mods.apply(data);
        } catch (error) {
          message = error.message;
        }
        return {
          rejected:message.indexOf(expected) >= 0,
          message:message,
          unchanged:before === JSON.stringify({
            focuses:FBDATA.focuses, deeds:FBDATA.deeds, events:FBDATA.events
          }) && focusProjection === FB.focuses &&
            deedProjection === FB.instants &&
            revision === FB.actionCatalogRevision
        };
      }
      const both = deed({ queueEvent:'birth' });
      const neither = without('effects');
      return [
        attempt({ focuses:[{ id:'e2e_unsafe_focus', label:'Unsafe' }] },
          'cannot add unknown baseline id'),
        attempt({ deeds:[{ id:'e2e_unsafe_deed', label:'Unsafe' }] },
          'cannot add unknown baseline id'),
        attempt({ deeds:[deed({ handler:'poach' })] },
          'handler is not recognized'),
        attempt({ deeds:[deed({ id:'constructor' })] },
          'must have one unique lowercase id'),
        attempt({ deeds:[deed({ flow:'choices' })] },
          'flow is not recognized'),
        attempt({ deeds:[deed({ run:'custom' })] },
          'run is not recognized'),
        attempt({ deeds:[deed({ manualOnly:false })] },
          'manualOnly is not recognized'),
        attempt({ deeds:[without('desc')] },
          'must have a description source'),
        attempt({ deeds:[deed({ spendsDay:'yes' })] },
          'spendsDay must be boolean'),
        attempt({ deeds:[deed({ order:77 })] },
          'must not repeat order 77'),
        attempt({ deeds:[deed({ visibility:{
          reason:'Hidden.', flagsAll:['e2e_hidden']
        } })] }, 'visibility.reason is not recognized'),
        attempt({ deeds:[deed({ eligibility:{ flagsAll:['e2e_ready'] } })] },
          'reason must be a non-empty string'),
        attempt({ deeds:[deed({ costs:{ gold:-1 } })] },
          'costs.gold must be a number from 0'),
        attempt({ deeds:[deed({ effects:{ influence:1 } })] },
          'effects.influence is not recognized'),
        attempt({ deeds:[deed({ effects:{ piety:0 } })] },
          'must contain at least one non-zero resource'),
        attempt({ deeds:[both] },
          'must declare exactly one of effects or queueEvent'),
        attempt({ deeds:[neither] },
          'must declare exactly one of effects or queueEvent'),
        attempt({ deeds:[deed({ effects:undefined,
          queueEvent:'e2e_missing_event' })] },
          'references unknown event e2e_missing_event'),
        attempt({
          events:[{
            id:'e2e_uncommitted_event', title:'Uncommitted event',
            text:'This event must not merge.', trigger:{ never:true },
            options:[{ label:'Close', effects:{} }]
          }],
          deeds:[deed({ costs:{ gold:-1 } })]
        }, 'costs.gold must be a number from 0')
      ];
    });

    expect(result.every(function (entry) {
      return entry.rejected && entry.unchanged;
    })).toBe(true);
  });

test('milestone-four phase D adds deterministic declarative focuses and restores safely',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const setup = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const character = s.chars[p.charId];
      const originalRest = FB.focuses.filter(function (focus) {
        return focus.id === 'rest';
      })[0];
      p.profession = 'merchant';
      character.health = 5;
      delete p.flags.e2e_focus_visible;
      delete p.flags.e2e_focus_eligible;
      const rngBefore = FB.getRngState();
      FB.mods.apply({
        focuses:[
          {
            id:'e2e_declarative_study', handler:'declarative_focus',
            label:'Keep the charter books',
            desc:'Work through a safe, authored daily routine.',
            order:28, contexts:['home'], vocational:'farmer',
            requiresTech:'crop_rotation',
            visibility:{ flagsAll:['e2e_focus_visible'] },
            eligibility:{
              reason:'The charter books remain locked.',
              flagsAll:['e2e_focus_eligible']
            },
            seasonal:{ gold:9, prestige:3, piety:1.5 },
            dailyEffects:{ health:0.01 },
            skillChances:{ lea:1, dip:1 }
          },
          {
            id:'e2e_declarative_afield', handler:'declarative_focus',
            label:'Keep the field journal',
            desc:'A focus explicitly supported while afield.',
            order:29, contexts:['afield'], seasonal:{ piety:9 }
          }
        ]
      });

      const hidden = FB.focusStatus(s, 'e2e_declarative_study');
      p.flags.e2e_focus_visible = 1;
      const tech = FB.realmTechRecord(s);
      const completedIndex = tech.completed.indexOf('crop_rotation');
      if (completedIndex >= 0) tech.completed.splice(completedIndex, 1);
      const techBlocked = FB.focusStatus(s, 'e2e_declarative_study');
      tech.completed.push('crop_rotation');
      const eligibilityBlocked = FB.focusStatus(s, 'e2e_declarative_study');
      p.flags.e2e_focus_eligible = 1;
      const ready = FB.focusStatus(s, 'e2e_declarative_study');
      const ordinaryDefault = FB.defaultFocus(s);

      p.flags.polly_1 = 1;
      const afieldChoices = FB.listFocusChoices(s).map(function (status) {
        return status.action.id;
      });
      delete p.flags.polly_1;

      const revision = FB.actionCatalogRevision;
      let partialReplacementRejected = false;
      try {
        FB.mods.apply({ focuses:[{
          id:'e2e_declarative_study', label:'Incomplete replacement'
        }] });
      } catch (error) {
        partialReplacementRejected =
          error.message.indexOf('handler must be declarative_focus') >= 0 &&
          FB.actionCatalogRevision === revision;
      }
      const rest = FB.focuses.filter(function (focus) {
        return focus.id === 'rest';
      })[0];
      const rngPure = FB.getRngState() === rngBefore;
      FB.ui.refresh();
      return {
        count:FBDATA.focuses.length,
        hidden:{ shown:hidden.shown, can:hidden.can, preview:hidden.preview },
        techBlocked:{
          shown:techBlocked.shown, can:techBlocked.can,
          reason:techBlocked.reason
        },
        eligibilityBlocked:{
          shown:eligibilityBlocked.shown, can:eligibilityBlocked.can,
          reason:eligibilityBlocked.reason
        },
        ready:{
          shown:ready.shown, can:ready.can,
          declarative:ready.action.declarative,
          manualOnly:ready.action.manualOnly,
          supportsAfield:ready.action.supportsAfield,
          seasonal:ready.preview.seasonal,
          daily:ready.preview.daily,
          training:ready.preview.training.map(function (entry) {
            return entry.skill;
          })
        },
        ordinaryDefault:ordinaryDefault,
        afieldChoices:afieldChoices,
        homeMissingAfield:afieldChoices.indexOf('e2e_declarative_study') < 0,
        baselineHandlerStable:rest.tick === originalRest.tick,
        partialReplacementRejected:partialReplacementRejected,
        rngPure:rngPure
      };
    });

    expect(setup.count).toBe(30);
    expect(setup.hidden).toEqual({ shown:false, can:false, preview:null });
    expect(setup.techBlocked).toEqual({
      shown:true, can:false, reason:'Requires Two-Course Rotation.'
    });
    expect(setup.eligibilityBlocked).toEqual({
      shown:true, can:false, reason:'The charter books remain locked.'
    });
    expect(setup.ready).toEqual({
      shown:true, can:true, declarative:true, manualOnly:true,
      supportsAfield:false,
      seasonal:[
        { type:'gold', amount:9, reward:true },
        { type:'prestige', amount:3, reward:true },
        { type:'piety', amount:1.5, reward:true }
      ],
      daily:[{ type:'health', amount:0.01 }],
      training:['dip', 'lea']
    });
    expect(setup.ordinaryDefault).toBe('trade_run');
    expect(setup.afieldChoices).toContain('e2e_declarative_afield');
    expect(setup.homeMissingAfield).toBe(true);
    expect(setup.baselineHandlerStable).toBe(true);
    expect(setup.partialReplacementRejected).toBe(true);
    expect(setup.rngPure).toBe(true);

    await page.locator('#sidetabs [data-tab="actions"]').click();
    const focusToggle = page.locator('#daily-focus-list');
    if (await focusToggle.getAttribute('aria-expanded') === 'false') {
      await focusToggle.click();
    }
    const focusRow = page.locator(
      '[data-focus-id="e2e_declarative_study"]').locator('xpath=..');
    await expect(focusRow).toBeVisible();
    await expect(focusRow.locator('.deed-details')).toContainText(
      'Seasonal effects');
    await expect(focusRow.locator('.deed-details')).toContainText('Money');
    await expect(focusRow.locator('.deed-details')).toContainText(
      'Health +0.01 per day');
    await expect(focusRow.locator('.deed-details')).toContainText(
      'Seasonal training chances');
    await expect(focusRow.locator('.deed-details')).toContainText('Diplomacy');

    const execution = await page.evaluate(function () {
      let s = FB.state;
      let p = s.player;
      let character = s.chars[p.charId];
      character.skills.dip = 0;
      character.skills.lea = 0;
      FB.setFocus(s, 'e2e_declarative_study');
      const income = FB.focusIncome(s);
      const before = {
        gold:p.gold, prestige:p.prestige, piety:p.piety,
        health:character.health, rng:FB.getRngState()
      };
      FB.tickFocus(s);
      const actualRng = FB.getRngState();
      FB.setRngState(before.rng);
      FB.rng();
      FB.rng();
      const expectedRng = FB.getRngState();
      FB.setRngState(actualRng);
      const tick = {
        focus:p.focus,
        gold:p.gold - before.gold,
        prestige:p.prestige - before.prestige,
        piety:p.piety - before.piety,
        health:character.health - before.health,
        exactDrawCount:actualRng === expectedRng
      };

      const payload = JSON.parse(FB.save.serialize());
      FB.save.restore(payload);
      s = FB.state;
      p = s.player;
      character = s.chars[p.charId];
      const restored = {
        version:payload.v,
        focus:p.focus,
        label:FB.focusStatus(s, p.focus).action.label
      };

      p.focusBack = 'rest';
      p.cooldowns = p.cooldowns || {};
      p.cooldowns.e2e_unrelated_focus_marker = 42;
      FB.installActionData(FBDATA.focuses.filter(function (def) {
        return def.handler !== 'declarative_focus';
      }), FBDATA.deeds);
      FB.validateFocus(s);
      const fallbackStatus = FB.focusStatus(s, p.focus);
      return {
        income:income,
        tick:tick,
        restored:restored,
        fallback:{
          focus:p.focus,
          declarative:!!(fallbackStatus.action &&
            fallbackStatus.action.declarative),
          focusBack:p.focusBack,
          cooldown:p.cooldowns.e2e_unrelated_focus_marker,
          removed:FB.focusStatus(s, 'e2e_declarative_study').action
        }
      };
    });

    expect(execution.income).toEqual({ gold:9, prestige:3, piety:1.5 });
    expect(execution.tick.focus).toBe('e2e_declarative_study');
    expect(execution.tick.gold).toBeCloseTo(0.1, 10);
    expect(execution.tick.prestige).toBeCloseTo(3 / 90, 10);
    expect(execution.tick.piety).toBeCloseTo(1.5 / 90, 10);
    expect(execution.tick.health).toBeCloseTo(0.01, 10);
    expect(execution.tick.exactDrawCount).toBe(true);
    expect(execution.restored).toEqual({
      version:3, focus:'e2e_declarative_study',
      label:'Keep the charter books'
    });
    expect(execution.fallback).toEqual({
      focus:'trade_run', declarative:false, focusBack:'rest',
      cooldown:42, removed:null
    });
  });

test('milestone-four phase D rejects unsafe declarative focuses without mutation',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);

    const result = await page.evaluate(function () {
      function focus(patch) {
        return Object.assign({
          id:'e2e_unsafe_focus', handler:'declarative_focus',
          label:'Unsafe focus', desc:'A rejected declarative focus.',
          order:28, contexts:['home'], seasonal:{ gold:1 }
        }, patch || {});
      }
      function without(field) {
        const value = focus();
        delete value[field];
        return value;
      }
      function attempt(data, expected) {
        const before = JSON.stringify({
          focuses:FBDATA.focuses, deeds:FBDATA.deeds
        });
        const focusProjection = FB.focuses;
        const deedProjection = FB.instants;
        const revision = FB.actionCatalogRevision;
        let message = '';
        try {
          FB.mods.apply(data);
        } catch (error) {
          message = error.message;
        }
        return {
          rejected:message.indexOf(expected) >= 0,
          message:message,
          unchanged:before === JSON.stringify({
            focuses:FBDATA.focuses, deeds:FBDATA.deeds
          }) && focusProjection === FB.focuses &&
            deedProjection === FB.instants &&
            revision === FB.actionCatalogRevision
        };
      }
      return [
        attempt({ focuses:[{ id:'e2e_unsafe_focus', label:'Unsafe' }] },
          'cannot add unknown baseline id'),
        attempt({ focuses:[focus({ handler:'rest' })] },
          'handler is not recognized'),
        attempt({ focuses:[focus({ id:'constructor' })] },
          'must have one unique lowercase id'),
        attempt({ focuses:[focus({ tick:'custom' })] },
          'tick is not recognized'),
        attempt({ focuses:[focus({ gain:'custom' })] },
          'gain is not recognized'),
        attempt({ focuses:[focus({ show:'custom' })] },
          'show is not recognized'),
        attempt({ focuses:[focus({ manualOnly:false })] },
          'manualOnly is not recognized'),
        attempt({ focuses:[focus({ shortcutFamily:'unsafe' })] },
          'shortcutFamily is not recognized'),
        attempt({ focuses:[without('desc')] },
          'must have a description source'),
        attempt({ focuses:[without('contexts')] },
          'contexts must be a non-empty array'),
        attempt({ focuses:[focus({ contexts:['home','home'] })] },
          'contexts must contain unique home or afield values'),
        attempt({ focuses:[focus({ contexts:['travel'] })] },
          'contexts must contain unique home or afield values'),
        attempt({ focuses:[focus({ order:27 })] },
          'must not repeat order 27'),
        attempt({ focuses:[focus({ seasonal:{ gold:-1 } })] },
          'seasonal.gold must be a number from 0'),
        attempt({ focuses:[focus({ seasonal:{ influence:1 } })] },
          'seasonal.influence is not recognized'),
        attempt({ focuses:[focus({ seasonal:{ gold:0 } })] },
          'must contain at least one non-zero resource'),
        attempt({ focuses:[focus({ seasonal:undefined,
          dailyEffects:{ health:0.2 } })] },
          'dailyEffects.health must be a number from -0.1 to 0.1'),
        attempt({ focuses:[focus({ seasonal:undefined,
          dailyEffects:{ prestige:0.01 } })] },
          'dailyEffects.prestige is not recognized'),
        attempt({ focuses:[focus({ seasonal:undefined,
          skillChances:{ command:0.5 } })] },
          'skillChances.command is not recognized'),
        attempt({ focuses:[focus({ seasonal:undefined,
          skillChances:{ dip:2 } })] },
          'skillChances.dip must be a number from 0 to 1'),
        attempt({ focuses:[focus({ seasonal:undefined,
          skillChances:{ dip:0 } })] },
          'must contain at least one non-zero chance'),
        attempt({ focuses:[focus({ seasonal:undefined })] },
          'must declare seasonal, dailyEffects, or skillChances'),
        attempt({ focuses:[focus({ requiresTech:'missing_technology' })] },
          'unknown technology missing_technology'),
        attempt({ focuses:[focus({ vocational:'missing_career' })] },
          'unknown vocation missing_career'),
        attempt({ focuses:[focus({ vocational:[] })] },
          'vocation list must contain 1 to 64 ids'),
        attempt({ focuses:[focus({ vocational:['farmer','farmer'] })] },
          'must not repeat vocation farmer'),
        attempt({ focuses:[focus({ visibility:{
          reason:'Hidden.', flagsAll:['e2e_hidden']
        } })] }, 'visibility.reason is not recognized'),
        attempt({ focuses:[focus({ eligibility:{ flagsAll:['e2e_ready'] } })] },
          'reason must be a non-empty string')
      ];
    });

    expect(result.every(function (entry) {
      return entry.rejected && entry.unchanged;
    })).toBe(true);
  });

test('milestone-four phase E adds bounded choice deeds and scored focus fallbacks',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const setup = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      p.profession = 'merchant';
      p.gold = 10;
      p.piety = 5;
      p.flags.e2e_trade_allowed = 1;
      delete p.flags.e2e_high_fallback;
      const rngBefore = FB.getRngState();
      FB.mods.apply({
        events:[{
          id:'e2e_choice_followup', title:'A chosen audience',
          text:'The selected petition reaches the hall.',
          trigger:{ never:true },
          options:[{ label:'Attend', effects:{} }]
        }],
        focuses:[
          {
            id:'trade_run',
            eligibility:{
              reason:'The market road is closed.',
              flagsAll:['e2e_trade_allowed']
            }
          },
          {
            id:'e2e_fallback_first', handler:'declarative_focus',
            capability:'fallback_focus', fallbackScore:20,
            label:'Keep the fallback ledger',
            desc:'The first equally scored safe fallback.',
            order:28, contexts:['home'], seasonal:{ gold:1 }
          },
          {
            id:'e2e_fallback_second', handler:'declarative_focus',
            capability:'fallback_focus', fallbackScore:20,
            label:'Keep the second ledger',
            desc:'The later equally scored safe fallback.',
            order:29, contexts:['home'], seasonal:{ prestige:1 }
          },
          {
            id:'e2e_fallback_high', handler:'declarative_focus',
            capability:'fallback_focus', fallbackScore:30,
            label:'Keep the high-priority ledger',
            desc:'A higher score that remains statically gated.',
            order:30, contexts:['home'],
            eligibility:{
              reason:'The high ledger remains sealed.',
              flagsAll:['e2e_high_fallback']
            },
            seasonal:{ piety:1 }
          }
        ],
        deeds:[
          {
            id:'e2e_choice_deed', handler:'declarative_deed',
            capability:'resource_choice',
            label:'Choose a charter grant',
            desc:'Select one bounded grant to confirm.',
            order:80, group:'life', cooldownDays:15, spendsDay:false,
            choices:[
              {
                id:'hidden', label:'Hidden grant',
                visibility:{ flagsAll:['e2e_hidden_choice'] },
                effects:{ gold:1 }
              },
              {
                id:'locked', label:'Locked grant',
                desc:'This grant needs household assent.',
                eligibility:{
                  reason:'The household has not assented.',
                  flagsAll:['e2e_choice_assent']
                },
                effects:{ prestige:2 }
              },
              {
                id:'technical', label:'Technical grant',
                requiresTech:'crop_rotation', effects:{ piety:2 }
              },
              {
                id:'costly', label:'Costly grant',
                costs:{ gold:50 }, effects:{ prestige:3 }
              },
              {
                id:'endow', label:'Endow the grant',
                desc:'Exchange coin for a pious endowment.',
                costs:{ gold:5 }, effects:{ piety:4 }
              },
              {
                id:'audience', label:'Request an audience',
                costs:{ piety:1 }, queueEvent:'e2e_choice_followup'
              }
            ]
          },
          {
            id:'e2e_choice_day', handler:'declarative_deed',
            capability:'resource_choice',
            label:'Choose a day-long grant',
            desc:'Confirm one grant that occupies the day.',
            order:81, group:'life', cooldownDays:4, spendsDay:true,
            choices:[{
              id:'accept', label:'Accept the grant', effects:{ prestige:2 }
            }]
          }
        ]
      });

      const roleDefault = FB.defaultFocus(s);
      delete p.flags.e2e_trade_allowed;
      const tiedFallback = FB.defaultFocus(s);
      p.flags.e2e_high_fallback = 1;
      const highFallback = FB.defaultFocus(s);
      delete p.flags.e2e_high_fallback;

      const tech = FB.realmTechRecord(s);
      const completedIndex = tech.completed.indexOf('crop_rotation');
      if (completedIndex >= 0) tech.completed.splice(completedIndex, 1);
      const choices = FB.declarativeChoiceStatuses(s, 'e2e_choice_deed');
      const action = FB.instantStatus(s, 'e2e_choice_deed').action;
      const dayAction = FB.instantStatus(s, 'e2e_choice_day').action;
      const fallback = FB.focusStatus(s, 'e2e_fallback_first').action;
      FB.ui.refresh();
      return {
        counts:[FBDATA.focuses.length, FBDATA.deeds.length],
        defaults:[roleDefault, tiedFallback, highFallback],
        action:{
          flow:action.flow, opensChoices:action.opensChoices,
          manualOnly:action.manualOnly, noConsume:action.noConsume
        },
        dayAction:{ flow:dayAction.flow, noConsume:dayAction.noConsume },
        fallback:{
          manualOnly:fallback.manualOnly,
          capability:fallback.capability,
          score:fallback.fallbackScore
        },
        choices:choices.map(function (item) {
          return {
            id:item.choice.id, can:item.can, reason:item.reason,
            label:item.label, desc:item.desc, preview:item.preview
          };
        }),
        hiddenAbsent:choices.every(function (item) {
          return item.choice.id !== 'hidden';
        }),
        rngPure:rngBefore === FB.getRngState()
      };
    });

    expect(setup.counts).toEqual([31, 82]);
    expect(setup.defaults).toEqual([
      'trade_run', 'e2e_fallback_first', 'e2e_fallback_high'
    ]);
    expect(setup.action).toEqual({
      flow:'choices', opensChoices:true, manualOnly:true, noConsume:true
    });
    expect(setup.dayAction).toEqual({ flow:'choices', noConsume:false });
    expect(setup.fallback).toEqual({
      manualOnly:false, capability:'fallback_focus', score:20
    });
    expect(setup.hiddenAbsent).toBe(true);
    expect(setup.choices.map(function (item) { return item.id; })).toEqual([
      'locked', 'technical', 'costly', 'endow', 'audience'
    ]);
    expect(setup.choices[0].reason).toBe('The household has not assented.');
    expect(setup.choices[1].reason).toBe('Requires Two-Course Rotation.');
    expect(setup.choices[2].reason).toContain('Requires');
    expect(setup.choices[3]).toEqual({
      id:'endow', can:true, reason:'', label:'Endow the grant',
      desc:'Exchange coin for a pious endowment.',
      preview:{
        costs:[{ type:'gold', amount:-5, cost:true }],
        effects:[{ type:'piety', amount:4, reward:true }],
        queueEvent:null, spendsDay:false
      }
    });
    expect(setup.choices[4].preview).toEqual({
      costs:[{ type:'piety', amount:-1, cost:true }],
      effects:[{ type:'queue', eventId:'e2e_choice_followup' }],
      queueEvent:'e2e_choice_followup', spendsDay:false
    });
    expect(setup.rngPure).toBe(true);

    await page.locator('#sidetabs [data-tab="actions"]').click();
    await page.locator('[data-action-group="life"]').click();
    const beforeOpen = await page.evaluate(function () {
      const s = FB.state;
      s.player.flags.tutorial = 1;
      delete s.player.flags.tutorial_done;
      delete s.player.flags.tut_deed;
      return {
        turn:s.turn, gold:s.player.gold, prestige:s.player.prestige,
        piety:s.player.piety,
        cooldown:s.player.cooldowns.e2e_choice_deed,
        tutorial:s.player.flags.tut_deed,
        rng:FB.getRngState()
      };
    });
    await page.locator('[data-action-id="e2e_choice_deed"]').click();
    await expect(page.locator('#genmodal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#gm-title')).toHaveText('Choose a charter grant');
    await expect(page.locator('[data-declarative-choice="locked"]')).toBeDisabled();
    await expect(page.locator('[data-declarative-choice="technical"]')).toBeDisabled();
    await expect(page.locator('[data-declarative-choice="costly"]')).toBeDisabled();
    const lockedChoice = page.locator('[data-declarative-choice="locked"]');
    await expect(lockedChoice).toContainText('Unavailable');
    await lockedChoice.locator('..').hover();
    await expect(page.locator('#tooltip'))
      .toContainText('The household has not assented.');
    const endowChoice = page.locator('[data-declarative-choice="endow"]');
    const endowCard = endowChoice.locator('..');
    await expect(endowChoice).toContainText('Money');
    await expect(endowCard.locator(':scope > .event-impact-chips'))
      .toHaveCount(0);
    await endowCard.hover();
    await expect(page.locator('#tooltip')).toContainText('Piety +4');
    await expect(page.locator('#tooltip'))
      .toContainText('Exchange coin for a pious endowment.');

    const openState = await page.evaluate(function () {
      const s = FB.state;
      const payload = JSON.parse(FB.save.serialize());
      return {
        turn:s.turn, gold:s.player.gold, prestige:s.player.prestige,
        piety:s.player.piety,
        cooldown:s.player.cooldowns.e2e_choice_deed,
        tutorial:s.player.flags.tut_deed,
        rng:FB.getRngState(), version:payload.v,
        noPending:payload.state.player.pendingDeclarativeAction === undefined
      };
    });
    expect(openState).toEqual(Object.assign({}, beforeOpen, {
      version:3, noPending:true
    }));
    await page.locator('#declarative-choice-cancel').click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    const cancelled = await page.evaluate(function () {
      const s = FB.state;
      return {
        turn:s.turn, gold:s.player.gold, prestige:s.player.prestige,
        piety:s.player.piety,
        cooldown:s.player.cooldowns.e2e_choice_deed,
        tutorial:s.player.flags.tut_deed,
        rng:FB.getRngState()
      };
    });
    expect(cancelled).toEqual(beforeOpen);

    await page.locator('[data-action-id="e2e_choice_deed"]').click();
    await page.locator('[data-declarative-choice="endow"]').click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    const committed = await page.evaluate(function () {
      let s = FB.state;
      const after = {
        turn:s.turn, gold:s.player.gold, prestige:s.player.prestige,
        piety:s.player.piety,
        cooldown:s.player.cooldowns.e2e_choice_deed,
        tutorial:s.player.flags.tut_deed,
        rng:FB.getRngState()
      };
      const payload = JSON.parse(FB.save.serialize());
      FB.save.restore(payload);
      s = FB.state;
      after.restored = {
        version:payload.v,
        cooldown:s.player.cooldowns.e2e_choice_deed,
        gold:s.player.gold, prestige:s.player.prestige,
        piety:s.player.piety
      };
      return after;
    });
    expect(committed).toEqual({
      turn:beforeOpen.turn,
      gold:beforeOpen.gold - 5,
      prestige:beforeOpen.prestige,
      piety:beforeOpen.piety + 4,
      cooldown:beforeOpen.turn,
      tutorial:1,
      rng:beforeOpen.rng,
      restored:{
        version:3, cooldown:beforeOpen.turn,
        gold:beforeOpen.gold - 5, prestige:beforeOpen.prestige,
        piety:beforeOpen.piety + 4
      }
    });

    const dayCommit = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const forgedBefore = JSON.stringify({
        turn:s.turn, prestige:p.prestige,
        cooldown:p.cooldowns.e2e_choice_day
      });
      FB.runInstant(s, 'e2e_choice_day', { choiceId:'missing' });
      const forgedRejected = forgedBefore === JSON.stringify({
        turn:s.turn, prestige:p.prestige,
        cooldown:p.cooldowns.e2e_choice_day
      });
      delete p.flags.tut_deed;
      const before = { turn:s.turn, prestige:p.prestige };
      const originalPassDay = FB.game.passDay;
      let observed = null;
      FB.game.passDay = function (options) {
        observed = {
          skipFocus:!!(options && options.skipFocus),
          prestige:p.prestige,
          cooldown:p.cooldowns.e2e_choice_day,
          tutorial:p.flags.tut_deed
        };
        s.turn++;
      };
      try {
        FB.runInstant(s, 'e2e_choice_day', { choiceId:'accept' });
      } finally {
        FB.game.passDay = originalPassDay;
      }
      return {
        forgedRejected:forgedRejected,
        turn:s.turn - before.turn,
        prestige:p.prestige - before.prestige,
        observed:observed
      };
    });
    expect(dayCommit).toEqual({
      forgedRejected:true, turn:1, prestige:2,
      observed:{
        skipFocus:true,
        prestige:committed.prestige + 2,
        cooldown:committed.turn,
        tutorial:1
      }
    });
  });

test('milestone-four phase E rejects unregistered action capabilities atomically',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);

    const result = await page.evaluate(function () {
      function choice(patch) {
        return Object.assign({
          id:'accept', label:'Accept', effects:{ gold:1 }
        }, patch || {});
      }
      function deed(patch) {
        return Object.assign({
          id:'e2e_capability_deed', handler:'declarative_deed',
          capability:'resource_choice', label:'Capability deed',
          desc:'A bounded picker-backed deed.', order:80, group:'life',
          cooldownDays:1, spendsDay:false, choices:[choice()]
        }, patch || {});
      }
      function focus(patch) {
        return Object.assign({
          id:'e2e_capability_focus', handler:'declarative_focus',
          capability:'fallback_focus', fallbackScore:10,
          label:'Capability focus', desc:'A bounded fallback focus.',
          order:28, contexts:['home'], seasonal:{ gold:1 }
        }, patch || {});
      }
      function attempt(data, expected) {
        const before = JSON.stringify({
          focuses:FBDATA.focuses, deeds:FBDATA.deeds
        });
        const focusProjection = FB.focuses;
        const deedProjection = FB.instants;
        const revision = FB.actionCatalogRevision;
        let message = '';
        try {
          FB.mods.apply(data);
        } catch (error) {
          message = error.message;
        }
        return {
          rejected:message.indexOf(expected) >= 0,
          message:message,
          unchanged:before === JSON.stringify({
            focuses:FBDATA.focuses, deeds:FBDATA.deeds
          }) && focusProjection === FB.focuses &&
            deedProjection === FB.instants &&
            revision === FB.actionCatalogRevision
        };
      }
      const thirteen = [];
      for (let i = 0; i < 13; i++) thirteen.push(choice({ id:'choice_' + i }));
      return [
        attempt({ deeds:[deed({ capability:'custom_picker' })] },
          'capability is not a recognized declarative capability'),
        attempt({ deeds:[deed({ capability:'fallback_focus' })] },
          'fallback_focus is not available to a deed'),
        attempt({ focuses:[focus({ capability:'resource_choice' })] },
          'resource_choice is not available to a focus'),
        attempt({ deeds:[deed({ choices:[] })] },
          'must be an array of 1 to 12 choices'),
        attempt({ deeds:[deed({ choices:thirteen })] },
          'must be an array of 1 to 12 choices'),
        attempt({ deeds:[deed({ choices:[null] })] },
          'choices[0] must be an object'),
        attempt({ deeds:[deed({ choices:[choice(), choice()] })] },
          'must have one unique lowercase id'),
        attempt({ deeds:[deed({ choices:[choice({ run:'custom' })] })] },
          'choices[0].run is not recognized'),
        attempt({ deeds:[deed({ choices:[choice({ label:'' })] })] },
          'choices[0] must have a label'),
        attempt({ deeds:[deed({ choices:[choice({
          effects:undefined, queueEvent:undefined
        })] })] }, 'must declare exactly one of effects or queueEvent'),
        attempt({ deeds:[deed({ choices:[choice({ queueEvent:'missing_event',
          effects:undefined })] })] }, 'references unknown event missing_event'),
        attempt({ deeds:[deed({ choices:[choice({
          requiresTech:'missing_technology'
        })] })] }, 'references unknown technology missing_technology'),
        attempt({ deeds:[deed({ choices:[choice({ visibility:{
          reason:'Hidden.', flagsAll:['e2e_hidden']
        } })] })] }, 'visibility.reason is not recognized'),
        attempt({ deeds:[deed({ choices:[choice({ eligibility:{
          flagsAll:['e2e_ready']
        } })] })] }, 'reason must be a non-empty string'),
        attempt({ deeds:[deed({ effects:{ gold:1 } })] },
          'transactions must live on choices'),
        attempt({ deeds:[deed({ capability:undefined,
          effects:{ gold:1 } })] }, 'choices require the resource_choice capability'),
        attempt({ focuses:[focus({ fallbackScore:0 })] },
          'fallbackScore must be an integer from 1 to 1000000'),
        attempt({ focuses:[focus({ capability:undefined })] },
          'fallbackScore requires the fallback_focus capability'),
        attempt({ focuses:[focus({ automationScore:10 })] },
          'automationScore is not recognized'),
        attempt({ deeds:[deed({ picker:'custom' })] },
          'picker is not recognized')
      ];
    });

    expect(result.every(function (entry) {
      return entry.rejected && entry.unchanged;
    })).toBe(true);
  });
