'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/economy.js',
  'js/actions.js',
  'js/events.js',
  'js/institutions.js',
  'js/mods.js',
  'data/economy.js',
  'data/actions.js',
  'data/political_institutions.js',
  'data/map_data.js',
  'data/events_common.js',
  'data/events_lifepaths.js',
  'data/events_paths.js',
  'data/events_peasant.js',
  'data/events_war.js',
  'data/events_world.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

/* Career ids before roles, with the role each now declares. The first
   career declared with a role is that role's default career. */
const SHIPPED_ROLES = {
  farmer:'labor', craftsman:'craft', merchant:'trading', civic_clerk:'civic',
  administration:'learned', physician:'learned', scholar:'learned',
  soldier:'arms', monk:'cloister', priest:'clergy', noble:'noble',
  colonus:'labor', curialis:'civic', decurion:'civic'
};
const ROLE_DEFAULTS = {
  clergy:'priest', cloister:'monk', labor:'farmer', craft:'craftsman',
  trading:'merchant', arms:'soldier', noble:'noble', learned:'administration',
  civic:'civic_clerk'
};

test('shipped careers declare known roles and each role keeps its former default career',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      function own(object, key) {
        return Object.prototype.hasOwnProperty.call(object, key);
      }
      function plain(value) {
        return !!value && Object.prototype.toString.call(value) === '[object Object]';
      }
      /* The content-id ratchet's view of FBDATA ids: record ids in arrays,
         keys of record tables, and tables nested two levels deep. */
      const contentIds = {};
      function walk(value, depth) {
        if (Array.isArray(value)) {
          value.forEach(function (row) {
            if (plain(row) && typeof row.id === 'string') contentIds[row.id] = 1;
          });
          return;
        }
        if (!plain(value)) return;
        const keys = Object.keys(value);
        if (keys.length && keys.every(function (key) { return plain(value[key]); })) {
          keys.forEach(function (key) { contentIds[key] = 1; });
          return;
        }
        if (depth >= 2) return;
        keys.forEach(function (key) { walk(value[key], depth + 1); });
      }
      Object.keys(FBDATA).forEach(function (key) {
        if (key !== 'balance' && key !== 'musicCatalog') walk(FBDATA[key], 0);
      });

      const roles = {};
      Object.keys(FBDATA.careers).forEach(function (id) {
        roles[id] = FBDATA.careers[id].role;
      });
      const defaults = {};
      Object.keys(FB.CAREER_ROLES).forEach(function (role) {
        defaults[role] = FB.roleCareer(role);
      });
      return {
        roles:roles,
        defaults:defaults,
        unknown:Object.keys(roles).filter(function (id) {
          return !own(FB.CAREER_ROLES, roles[id]);
        }),
        /* A role named like a content id would be counted as that id by
           the content-id ratchet wherever engine code checks the role. */
        namedLikeContent:Object.keys(FB.CAREER_ROLES).filter(function (role) {
          return own(contentIds, role);
        }),
        merchantHasTrading:FB.professionHasRole('merchant', 'trading'),
        merchantHasAny:FB.professionHasRole('merchant', ['craft', 'trading']),
        merchantHasCraft:FB.professionHasRole('merchant', 'craft'),
        unknownCareer:FB.professionRole('missing_career')
      };
    });

    expect(result.roles).toEqual(SHIPPED_ROLES);
    expect(result.defaults).toEqual(ROLE_DEFAULTS);
    expect(result.unknown).toEqual([]);
    /* noble names both the Estate service career and its role. */
    expect(result.namedLikeContent).toEqual(['noble']);
    expect(result.merchantHasTrading).toBe(true);
    expect(result.merchantHasAny).toBe(true);
    expect(result.merchantHasCraft).toBe(false);
    expect(result.unknownCareer).toBeNull();
  });

test('career gates in events and holdings name known roles; exact lists name learned careers',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      const unknownRoles = [];
      const exactLists = [];
      let roleGates = 0;
      function scan(where, gate) {
        if (!gate) return;
        if (gate.careerRoles) {
          roleGates++;
          gate.careerRoles.forEach(function (role) {
            if (!Object.prototype.hasOwnProperty.call(FB.CAREER_ROLES, role)) {
              unknownRoles.push(where + ': ' + role);
            }
          });
        }
        if (gate.professions) exactLists.push({ where:where, ids:gate.professions });
      }
      FBDATA.events.forEach(function (ev) {
        scan(ev.id, ev.trigger);
        (ev.options || []).forEach(function (option, index) {
          scan(ev.id + '.options[' + index + ']', option.require);
        });
      });
      Object.keys(FBDATA.holdings).forEach(function (id) {
        scan('holdings.' + id, FBDATA.holdings[id]);
      });
      return {
        roleGates:roleGates,
        unknownRoles:unknownRoles,
        /* A professions list stays exact only when it names a learned
           career, whose role it shares with other learned careers. */
        exactWithoutLearned:exactLists.filter(function (list) {
          return !list.ids.some(function (id) {
            return FB.professionHasRole(id, 'learned');
          });
        }).map(function (list) { return list.where; })
      };
    });

    expect(result.roleGates).toBeGreaterThan(50);
    expect(result.unknownRoles).toEqual([]);
    expect(result.exactWithoutLearned).toEqual([]);
  });

test('a test career with an existing role earns, qualifies and meets events like that role',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await page.evaluate(function () {
      FB.mods.apply({
        careers:{
          e2e_chapman:{
            role:'trading', name:'Chapman', icon:'🧺', skill:'ste',
            apprenticeAge:12, apprenticeCost:4, tierMin:1,
            wage:2, masterWage:3.5, guild:true,
            ranks:{ apprentice:'Chapman’s boy', journeyman:'Chapman', master:'Master chapman' },
            desc:'A test pedlar of small wares.'
          }
        }
      });
    });
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const gates = [];
      FBDATA.events.forEach(function (ev) {
        if (ev.trigger && ev.trigger.careerRoles) gates.push({ careerRoles:ev.trigger.careerRoles });
        (ev.options || []).forEach(function (option) {
          if (option.require && option.require.careerRoles) {
            gates.push({ careerRoles:option.require.careerRoles });
          }
        });
      });

      function practice(profession, guildRank) {
        me.career = {
          profession:profession, rank:'journeyman', experience:6,
          startedYear:s.date.year - 6, guildRank:guildRank,
          guildStanding:40, chosen:true
        };
        s.player.profession = profession;
        s.player.professionBack = null;
        if (guildRank === 'none') delete s.player.flags.guild_member;
        else s.player.flags.guild_member = 1;
      }

      function probe(profession) {
        practice(profession, 'master');
        const step = FB.guildAdvance(s, me);
        const defaultFocus = FB.defaultFocus(s);
        const previousFocus = s.player.focus;
        s.player.focus = defaultFocus;
        const income = FB.focusIncome(s);
        s.player.focus = previousFocus;
        const out = {
          role:FB.careerRole(s, me),
          hasRole:FB.careerHasRole(s, me, 'trading'),
          focuses:FB.listFocuses(s).map(function (focus) { return focus.id; }).sort(),
          defaultFocus:defaultFocus,
          income:income,
          merchantOutfitWorker:FB.householdStandardWorkerEligible(s, 'outfit_merchant'),
          doesMerchantWork:FB.professionDoesWork(profession, 'merchant'),
          doesPhysicianWork:FB.professionDoesWork(profession, 'physician'),
          holdings:FB.holdingAvailable(s).map(function (row) { return row.id; }).sort(),
          events:gates.map(function (gate) { return FB.checkTrigger(s, gate, {}); }),
          loans:FB.financeLoanOffers(s).map(function (offer) { return offer.kind; }).sort(),
          stakes:FB.tradeInvestmentStakes(s),
          guildStep:step ? { to:step.to, learning:step.learning || 0 } : null
        };
        practice(profession, 'guildmaster');
        out.monopoly = !!FB.guildMonopolyCareer(s);
        return out;
      }

      return {
        chapman:probe('e2e_chapman'),
        merchant:probe('merchant'),
        farmer:probe('farmer'),
        defaultTrading:FB.roleCareer('trading')
      };
    });

    expect(result.chapman).toEqual(result.merchant);
    expect(result.chapman.role).toBe('trading');
    expect(result.chapman.hasRole).toBe(true);
    expect(result.chapman.focuses).toContain('trade_run');
    expect(result.chapman.focuses).not.toContain('work_land');
    expect(result.chapman.merchantOutfitWorker).toBe(true);
    expect(result.chapman.doesMerchantWork).toBe(true);
    expect(result.chapman.doesPhysicianWork).toBe(false);
    expect(result.chapman.holdings).toContain('pack_mule');
    expect(result.chapman.events).toContain(true);
    expect(result.chapman.guildStep.learning).toBeGreaterThan(0);
    expect(result.chapman.monopoly).toBe(true);

    expect(result.farmer.role).toBe('labor');
    expect(result.farmer.hasRole).toBe(false);
    expect(result.farmer.focuses).not.toContain('trade_run');
    expect(result.farmer.holdings).not.toContain('pack_mule');
    expect(result.farmer.events).not.toEqual(result.merchant.events);
    expect(result.farmer.monopoly).toBe(false);
    /* An added career never displaces the shipped default of its role. */
    expect(result.defaultTrading).toBe('merchant');
  });

test('mod careers must declare a known role',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      function attempt(careers) {
        try {
          FB.mods.apply({ careers:careers });
          return '';
        } catch (error) {
          return String(error && error.message || error);
        }
      }
      const base = {
        name:'Test', icon:'🧪', skill:'ste', apprenticeAge:12, apprenticeCost:0,
        wage:1, masterWage:2,
        ranks:{ apprentice:'Pupil', journeyman:'Worker', master:'Master' },
        desc:'A test career.'
      };
      function career(extra) { return Object.assign({}, base, extra); }
      return {
        missingRole:attempt({ e2e_missing:career({}) }),
        unknownRole:attempt({ e2e_unknown:career({ role:'mystery' }) }),
        badSecondary:attempt({ e2e_secondary:career({ role:'craft', roles:['mystery'] }) }),
        rejectedTableUnchanged:!Object.prototype.hasOwnProperty.call(FBDATA.careers, 'e2e_missing') &&
          !Object.prototype.hasOwnProperty.call(FBDATA.careers, 'e2e_unknown') &&
          !Object.prototype.hasOwnProperty.call(FBDATA.careers, 'e2e_secondary'),
        accepted:attempt({ e2e_colonus:career({ role:'labor', roles:['craft'] }) }),
        acceptedRole:FB.professionRole('e2e_colonus'),
        acceptedSecondary:FB.professionHasRole('e2e_colonus', 'craft'),
        defaultLabor:FB.roleCareer('labor')
      };
    });

    expect(result.missingRole).toMatch(/careers\.e2e_missing\.role must be one of/);
    expect(result.unknownRole).toMatch(/careers\.e2e_unknown\.role must be one of/);
    expect(result.badSecondary).toMatch(/unknown id mystery/);
    expect(result.rejectedTableUnchanged).toBe(true);
    expect(result.accepted).toBe('');
    expect(result.acceptedRole).toBe('labor');
    expect(result.acceptedSecondary).toBe(true);
    expect(result.defaultLabor).toBe('farmer');
  });
