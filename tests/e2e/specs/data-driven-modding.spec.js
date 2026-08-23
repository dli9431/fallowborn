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
  'js/model.js',
  'js/i18n.js',
  'js/world.js',
  'js/items.js',
  'js/economy.js',
  'data/actions.js',
  'js/actions.js',
  'js/council.js',
  'js/intrigue.js',
  'js/save.js',
  'js/mods.js',
  'js/ui_misc.js',
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

    expect(result.counts).toEqual([28, 78]);
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
      function validateFocusSwap() {
        const first = FBDATA.focuses[0];
        const second = FBDATA.focuses[1];
        FBDATA.focuses[0] = Object.assign({}, second, { order:0 });
        FBDATA.focuses[1] = Object.assign({}, first, { order:1 });
        const message = FB.validateActionData().join(' ');
        FBDATA.focuses[0] = first;
        FBDATA.focuses[1] = second;
        return message;
      }
      const cases = [
        validatePatch('focus', 0, { order:99 }),
        validatePatch('focus', 0, { handler:'rest' }),
        validatePatch('focus', 0, { extra:true }),
        validatePatch('deed', 0, { flow:'choices' }),
        validatePatch('deed', 0, { requiresTech:'missing_technology' }),
        validatePatch('deed', 0, { cooldownDays:-1 }),
        validateFocusSwap(),
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
      const rejectedModKeys = ['focuses', 'deeds'].map(function (key) {
        const mod = {};
        mod[key] = [];
        try {
          FB.mods.apply(mod);
          return false;
        } catch (error) {
          return error.message === 'Mod data ' + key +
            ' is not a supported top-level mod key.';
        }
      });
      return {
        cases:cases,
        rebuildError:rebuildError,
        rebuildAtomic:rebuildAtomic,
        rejectedModKeys:rejectedModKeys,
        dataUnchanged:beforeData === JSON.stringify({
          focuses:FBDATA.focuses, deeds:FBDATA.deeds
        }),
        validAfter:FB.validateActionData()
      };
    });

    expect(result.cases[0]).toContain('order must remain 0');
    expect(result.cases[1]).toContain('must retain its baseline handler');
    expect(result.cases[2]).toContain('extra is not recognized');
    expect(result.cases[3]).toContain('flow must match its baseline handler');
    expect(result.cases[4]).toContain('unknown technology missing_technology');
    expect(result.cases[5]).toContain('invalid cooldown');
    expect(result.cases[6]).toContain('retain baseline id study at index 0');
    expect(result.cases[7]).toContain('unknown vocation missing_vocation');
    expect(result.rebuildError).toContain('Invalid action catalogue');
    expect(result.rebuildAtomic).toBe(true);
    expect(result.rejectedModKeys).toEqual([true, true]);
    expect(result.dataUnchanged).toBe(true);
    expect(result.validAfter).toEqual([]);
  });
