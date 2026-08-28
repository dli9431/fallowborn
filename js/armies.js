/* Fallowborn — field armies: mustered hosts that march the map and fight
   when they meet. A sovereign realm fields one main host while a war lasts
   and may split off detachments (levies with hired companies folded in).
   The player's
   host musters the moment war begins (FB.warFooting) and is ordered by
   tapping the map — or by the automated stances (G.auto.hosts: defensive /
   offensive), which steer only an idle host and always yield to a
   hand-tapped route. AI hosts hunt enemy hosts and otherwise march on the
   enemy's seat. Hosts resting on their sovereign's own land slowly refill
   toward their mustered strength. See docs/designs/war.md. */
window.FB = window.FB || {};

(function () {
  'use strict';

  /* ---------- state ----------
     state.armies: [{ id, realm ('player' or a sovereign realm id), men, size,
       units, at, from, moveLeft, path[], goal, broken, huntPrey, manual,
       holdManual }]
       A realm may field several hosts: the largest is the primary host
       (FB.hostOf) that rearm, muster, and de-muster rules key on; the rest
       are detachments (FB.hostsOf lists them all). Detachments are ordinary
       records here — no save-format change.
       `at` is the province the host stands in; `from` the one it left. While
       moveLeft > 0 the host is on the road toward path[0] and `at` advances
       only when the leg completes; the map marker stays on `at`. size is the
       mustered strength a resting host refills toward. huntPrey (player host
       only) is a realm id whose host is tracked and re-pathed onto each day.
       manual / holdManual (player-realm or commanded patron host) mark a
       hand-tapped route still
       playing out and a hand-given halt — the automated stances never touch
       either. automatedOrder / eventOrder distinguish routes created without
       a map tap, and autoResupply holds an automated host in friendly land
       until its supply is fit for campaigning again.
       units: { <classId>: men } — the host's composition, keyed by
       FBDATA.unitClasses (data/units.js); men is always the total. Each class
       fights at its own table attack/defense values (falling back to
       quality), battle casualties fall in the table's casualtyOrder (levy
       first, the heaviest professionals last), and a resting host refills
       with fresh levy plus any drilled cohort replacements — slain
       professionals rejoin only through the replacement ledger
       (state.armyCohorts below). Culture- and technology-gated classes
       (FB.unitClassUnlocked) convert a share of the mustered levy.
     state.armyDown: { realmId: turn } — a destroyed PRIMARY host may muster
       again only after balance.armyRearmDays.
     state.armyDetachmentDown: { realmId: turn } — a destroyed detachment
       (any host but the primary) re-forms after the shorter
       balance.detachmentRearmDays.
     state.armyDownSurvival: { realmId: { turn, frac } } — a costly raid's
       surviving strength fraction; rearmScale ramps from it (keyed to the
       down-turn) instead of the 0.15 shattered-host floor.
     state.player.war.musterPool: { <classId>: men } — the men a
       voluntary de-muster sent home; the war's next muster is capped at
       them, so a beaten player cannot re-raise a full levy.
     state.armyCohorts: { <realmId|'player'>: { <classId>: { batches:
       [{ n, readyTurn }], ready } } } — the professional replacement ledger
       (docs/designs/war.md). Battle, siege, starvation, and desertion losses
       of `professional` unit classes are owned by the realm, not the host:
       each loss queues a batch that finishes drilling at loss turn +
       replaceDays (per class, else balance.cohortReplaceDays), deterministically
       and without RNG. While a batch is pending the realm pays the
       reinforcement premium (its upkeepPer100 × balance.reinforcementPremiumMult,
       player only — the AI economy is abstract); once drilled, the ready men
       join a host resting on home land or the realm's next fresh muster, and
       the premium ends exactly when the last pending batch completes. The
       ledger survives host dismissal, de-muster, and peace untouched. */
  FB.armiesEnsure = function (state) {
    if (!state.armies) state.armies = [];
    if (!state.armyDown) state.armyDown = {};
    if (!state.armyDetachmentDown) state.armyDetachmentDown = {};
    /* drop orphaned or invalid host records: a realm that no longer exists,
       a host with no men left, or one standing on ground the world data
       does not know (additive repair, no save-version bump) */
    const byId = FB.world && FB.world.byId;
    const validHost = function (a) {
      if (!a || !a.realm) return false;
      if (a.realm !== 'player' &&
          !(state.realms && state.realms[a.realm])) return false;
      if (!isFinite(Number(a.men)) || a.men <= 0) return false;
      if (byId && !byId[a.at]) return false;
      return true;
    };
    let needsRepair = false;
    for (let i = 0; i < state.armies.length; i++) {
      if (!validHost(state.armies[i])) { needsRepair = true; break; }
    }
    /* Preserve the array identity on ordinary war days. Besides avoiding an
       allocation, this lets the pan renderer retain its layout until a host
       actually raises, moves, splits, or disappears. */
    if (needsRepair) state.armies = state.armies.filter(validHost);
    /* hosts from before supply lines carry no supply field: repair in place
       (additive, no save-version bump) */
    for (const a of state.armies) FB.hostSupply(a);
    /* the replacement-cohort ledger is additive: old saves have none, a dead
       realm's ledger is dropped, and malformed entries coerce to whole men */
    if (!state.armyCohorts || typeof state.armyCohorts !== 'object') {
      state.armyCohorts = {};
    }
    for (const cohortRealm in state.armyCohorts) {
      if (cohortRealm !== 'player' &&
          !(state.realms && state.realms[cohortRealm])) {
        delete state.armyCohorts[cohortRealm];
        continue;
      }
      const ledger = state.armyCohorts[cohortRealm];
      if (!ledger || typeof ledger !== 'object') {
        delete state.armyCohorts[cohortRealm];
        continue;
      }
      for (const classId in ledger) {
        const record = ledger[classId];
        if (!record || typeof record !== 'object') {
          delete ledger[classId];
          continue;
        }
        if (!Array.isArray(record.batches)) record.batches = [];
        record.batches = record.batches.filter(function (batch) {
          return batch && isFinite(Number(batch.n)) && Number(batch.n) > 0 &&
            isFinite(Number(batch.readyTurn));
        });
        for (const batch of record.batches) {
          batch.n = Math.max(1, Math.round(Number(batch.n)));
        }
        record.ready = Math.max(0, Math.round(Number(record.ready) || 0));
        if (!record.ready && !record.batches.length) delete ledger[classId];
      }
    }
  };

  /* ---------- the unit-class table ----------
     FBDATA.unitClasses (data/units.js) is the single source of truth for
     composition keys, battle quality, upkeep, casualty order, counters, and
     culture/technology gating. The five baseline classes remain the migration
     baseline: any class missing from a saved units record defaults to 0. */

  const FALLBACK_CLASSES = ['levy', 'arch', 'cav', 'ret', 'mercs'];

  function unitClassTable() {
    return (typeof FBDATA !== 'undefined' && FBDATA.unitClasses) || {};
  }

  FB.unitClassIds = function () {
    const ids = Object.keys(unitClassTable());
    return ids.length ? ids : FALLBACK_CLASSES.slice();
  };

  function unitClassDef(key) {
    return unitClassTable()[key] || null;
  }

  function unitClassQuality(key) {
    const def = unitClassDef(key);
    const value = def && Number(def.quality);
    return isFinite(value) && value > 0 ? value : 1;
  }

  /* attack/defense split (docs/designs/war.md): a class may declare separate
     per-man power for the attacking and defending side of a field battle;
     both fall back to quality, so legacy entries and mods keep working */
  function unitClassAttack(key) {
    const def = unitClassDef(key);
    const value = def && Number(def.attack);
    return isFinite(value) && value > 0 ? value : unitClassQuality(key);
  }

  function unitClassDefense(key) {
    const def = unitClassDef(key);
    const value = def && Number(def.defense);
    return isFinite(value) && value > 0 ? value : unitClassQuality(key);
  }

  /* classes a muster can field: everything but hired companies (mercs join
     by contract, never from the levy rolls) */
  function musteredClassIds() {
    const ids = [];
    for (const id of FB.unitClassIds()) {
      const def = unitClassDef(id);
      if (!def || !def.hired) ids.push(id);
    }
    return ids;
  }

  /* which classes a realm (undefined realmId = the player, keyed on the
     player character's own culture) may field: culture gates, then the
     technology requirement against the effective sovereign's knowledge */
  function realmUnitCulture(state, realmId) {
    if (realmId === undefined || realmId === null || realmId === 'player') {
      const me = state && state.player && state.chars &&
        state.chars[state.player.charId];
      return me ? me.culture : null;
    }
    const realm = state.realms && state.realms[realmId];
    if (realm && realm.ruler && realm.ruler.culture) return realm.ruler.culture;
    const capital = realm && FB.world && FB.world.byId &&
      FB.world.byId[realm.capital];
    return capital ? capital.culture : null;
  }

  FB.unitClassUnlocked = function (state, classId, realmId) {
    const def = unitClassDef(classId);
    if (!def) return false;
    if (def.cultures || def.notCultures) {
      const culture = realmUnitCulture(state, realmId);
      if (def.cultures && def.cultures.indexOf(culture) < 0) return false;
      if (def.notCultures && def.notCultures.indexOf(culture) >= 0) return false;
    }
    if (def.requiresTech) {
      if (!FB.techRequirementMet) return false;
      if (!FB.techRequirementMet(state, def.requiresTech, realmId)) return false;
    }
    return true;
  };

  /* a host's composition, migrating hosts from before levy tiers (their men
     were all levy but the hired companies); classes a save predates or a mod
     removed default to 0 */
  FB.hostUnits = function (army) {
    if (!army.units) {
      const mercs = army.mercs || 0;
      army.units = { levy: Math.max(0, army.men - mercs), mercs: mercs };
    }
    for (const key of FB.unitClassIds()) {
      if (!isFinite(Number(army.units[key])) || Number(army.units[key]) < 0) {
        army.units[key] = 0;
      }
    }
    return army.units;
  };

  /* a host's carried supply, 0–100; hosts from older saves and hand-built
     hosts default to a full 100 (see FB.armiesEnsure) */
  FB.hostSupply = function (army) {
    if (!army) return 100;
    if (!isFinite(Number(army.supply))) army.supply = 100;
    army.supply = FB.clamp(Number(army.supply), 0, 100);
    return army.supply;
  };

  function emptyUnitCounts() {
    const out = {};
    for (const key of FB.unitClassIds()) out[key] = 0;
    return out;
  }

  function copyUnitCounts(units) {
    const out = emptyUnitCounts();
    units = units || {};
    for (const key of FB.unitClassIds()) {
      out[key] = Math.max(0, Math.round(Number(units[key]) || 0));
    }
    return out;
  }

  function unitCountTotal(units) {
    let total = 0;
    units = units || {};
    for (const key in units) {
      if (key === 'total') continue; // applyHostLosses results carry one
      total += Math.max(0, Number(units[key]) || 0);
    }
    return total;
  }

  /* One casualty allocator owns battle and event losses. The number to lose
     may be seeded elsewhere, but class allocation is always deterministic:
     the table's casualtyOrder (levy first, the heaviest professionals last),
     ties broken by class id. */
  function casualtyOrderIds() {
    return FB.unitClassIds().sort(function (a, b) {
      const da = unitClassDef(a), db = unitClassDef(b);
      const oa = da && isFinite(Number(da.casualtyOrder))
        ? Number(da.casualtyOrder) : 100;
      const ob = db && isFinite(Number(db.casualtyOrder))
        ? Number(db.casualtyOrder) : 100;
      return oa - ob || (a < b ? -1 : a > b ? 1 : 0);
    });
  }

  FB.applyHostLosses = function (army, lost) {
    const result = emptyUnitCounts();
    result.total = 0;
    if (!army || army.men <= 0) return result;
    const units = FB.hostUnits(army);
    let remaining = Math.min(army.men,
      Math.max(0, Math.round(Number(lost) || 0)));
    const actual = remaining;
    for (const key of casualtyOrderIds()) {
      if (remaining <= 0) break;
      const amount = Math.min(units[key] || 0, remaining);
      units[key] -= amount;
      result[key] += amount;
      remaining -= amount;
    }
    /* a saved class the current table no longer defines (a removed mod)
       stands outside the casualty order: its men fall last, in id order, so
       the headcount and the units record never drift apart */
    if (remaining > 0) {
      const unknown = [];
      for (const key in units) {
        if (key === 'total' || unitClassDef(key)) continue;
        if (Math.max(0, Number(units[key]) || 0) > 0) unknown.push(key);
      }
      unknown.sort();
      for (const key of unknown) {
        if (remaining <= 0) break;
        const amount = Math.min(units[key], remaining);
        units[key] -= amount;
        result[key] = (result[key] || 0) + amount;
        remaining -= amount;
      }
    }
    army.men = Math.max(0, army.men - actual);
    result.total = actual;
    return result;
  };

  /* weighted battle quality of a composition: the average punch of one man */
  FB.compQuality = function (units, men) {
    if (!units || !men) return 1;
    let sum = 0;
    for (const key in units) {
      sum += Math.max(0, Number(units[key]) || 0) * unitClassQuality(key);
    }
    return sum / men;
  };

  /* the composition readout shared by the Land tab host card and the war
     ledger: one "{count} {class}" part per present class. The five baseline
     classes keep their long-standing plural-form lines; unlocked classes
     render their icon and table name; a saved class the table no longer
     defines (a removed mod) renders its raw id, in id order after the known
     classes. */
  FB.unitClassParts = function (state, units) {
    const legacyForms = {
      levy:['fx.warstate.comp_levy', { one:'{count} levyman', other:'{count} levy' }],
      arch:['fx.warstate.comp_archers', { one:'{count} archer', other:'{count} archers' }],
      cav:['fx.warstate.comp_cavalry', { one:'{count} cavalryman', other:'{count} cavalry' }],
      ret:['fx.warstate.comp_retinue', { one:'{count} man-at-arms', other:'{count} men-at-arms' }],
      mercs:['fx.warstate.comp_mercs', { one:'{count} mercenary', other:'{count} mercenaries' }]
    };
    const parts = [];
    for (const key of FB.unitClassIds()) {
      const count = Math.max(0, Math.round(Number(units && units[key]) || 0));
      if (!count) continue;
      const legacy = legacyForms[key];
      if (legacy) {
        parts.push(FB.renderKey(legacy[0], {
          forms:{ select:'plural', param:'count', cases:legacy[1] }
        }, { count:count }));
      } else {
        const def = unitClassDef(key);
        const name = def
          ? FB.dataText(state, null, 'unitClass', key, def, 'name', {}) : key;
        parts.push(FB.T('{count} {unit}', {
          count:count, unit:(def && def.icon ? def.icon + ' ' : '') + name
        }));
      }
    }
    const unknown = [];
    for (const key in (units || {})) {
      if (key === 'total' || unitClassDef(key)) continue;
      if (Math.max(0, Math.round(Number(units[key]) || 0)) > 0) unknown.push(key);
    }
    unknown.sort();
    for (const key of unknown) {
      parts.push(FB.T('{count} {unit}', {
        count:Math.round(Number(units[key]) || 0), unit:key
      }));
    }
    return parts;
  };

  /* one class's display stats for the host view: attack/defense (with the
     quality fallback applied), per-100 upkeep, and its counter edges */
  FB.unitClassBattleStats = function (classId) {
    const def = unitClassDef(classId);
    const counters = [];
    if (def && def.counters) {
      for (const enemyId of FB.unitClassIds()) {
        const mult = Number(def.counters[enemyId]);
        if (isFinite(mult) && mult > 1) counters.push({ id:enemyId, mult:mult });
      }
    }
    return {
      attack:unitClassAttack(classId),
      defense:unitClassDefense(classId),
      upkeepPer100:def && isFinite(Number(def.upkeepPer100))
        ? Number(def.upkeepPer100) : 0,
      professional:!!(def && def.professional),
      counters:counters
    };
  };

  /* ---------- terrain (docs/designs/war.md) ----------
     A province's terrain multiplies each unit class's battle quality
     (balance.terrainBattleFactors) and the day cost of marching into it
     (balance.terrainMarchMult). Unknown terrain and unknown classes read
     as 1, so modded or legacy data never breaks the quote. */

  function terrainOf(pid) {
    const pr = pid && FB.world && FB.world.byId ? FB.world.byId[pid] : null;
    return pr && typeof pr.terrain === 'string' ? pr.terrain : null;
  }

  function balanceTable(name) {
    const table = B()[name];
    return table && typeof table === 'object' ? table : {};
  }

  function terrainBattleFactor(terrain, key) {
    /* a class's own terrainFactors row wins over the shared balance table */
    const def = unitClassDef(key);
    const own = def && def.terrainFactors;
    if (own) {
      const ownValue = Number(own[terrain]);
      if (isFinite(ownValue)) return ownValue;
    }
    const row = balanceTable('terrainBattleFactors')[terrain];
    const value = row && Number(row[key]);
    return isFinite(value) ? value : 1;
  }

  function terrainMarchFactor(terrain) {
    const value = Number(balanceTable('terrainMarchMult')[terrain]);
    return isFinite(value) && value > 0 ? value : 1;
  }

  function terrainDrainFactor(terrain) {
    const value = Number(balanceTable('supplyDrainTerrain')[terrain]);
    return isFinite(value) && value > 0 ? value : 1;
  }

  /* weighted battle quality of a composition fighting on the given terrain;
     the terrain-neutral FB.compQuality remains the fallback for callers
     without a location */
  FB.compTerrainQuality = function (units, men, terrain) {
    if (!units || !men) return 1;
    if (!terrain) return FB.compQuality(units, men);
    let sum = 0;
    for (const key in units) {
      sum += Math.max(0, Number(units[key]) || 0) * unitClassQuality(key) *
        terrainBattleFactor(terrain, key);
    }
    return sum / men;
  };

  /* Weighted per-man power of a composition fighting one side of a field
     battle: 'defense' reads the classes' defense values, anything else reads
     their attack values, and both fall back to quality per class (so a class
     with attack === defense === quality reproduces the pre-split numbers
     exactly). Terrain multiplies both roles alike. */
  FB.compRoleQuality = function (units, men, terrain, role) {
    if (!units || !men) return 1;
    const classPower = role === 'defense' ? unitClassDefense : unitClassAttack;
    let sum = 0;
    for (const key in units) {
      const factor = terrain ? terrainBattleFactor(terrain, key) : 1;
      sum += Math.max(0, Number(units[key]) || 0) * classPower(key) * factor;
    }
    return sum / men;
  };

  /* the standing host's home-ground edge on defensive terrain */
  function terrainDefenseBonus(terrain) {
    const value = Number(balanceTable('terrainDefenseBonus')[terrain]);
    return isFinite(value) && value > 0 ? value : 0;
  }

  /* AI realms keep no buildings: their baseline professional core is joined
     by nation-specific military technology and by the culture/technology
     classes the realm qualifies for (keyed on capital culture and completed
     techs). Returns { classId: fraction of the muster }; levy is the
     remainder. */
  function aiFracs(state, rid) {
    const bal = B();
    const tech = FB.techAIUnits ? FB.techAIUnits(state, rid) : {};
    const fracs = {};
    fracs.ret = (bal.aiRetinueFrac || 0) + (tech.ret || 0);
    fracs.arch = (bal.aiArcherFrac || 0) + (tech.arch || 0);
    for (const id of musteredClassIds()) {
      if (id === 'levy') continue;
      if (tech[id]) fracs[id] = (fracs[id] || 0) + tech[id];
      const def = unitClassDef(id);
      const share = def && Number(def.share);
      if (share > 0 && !(fracs[id] > 0) &&
          FB.unitClassUnlocked(state, id, rid)) {
        fracs[id] = share;
      }
    }
    let professional = 0;
    for (const id in fracs) professional += fracs[id];
    if (professional > 0.9) {
      const scale = 0.9 / professional;
      for (const id in fracs) fracs[id] *= scale;
    }
    return fracs;
  }
  FB.aiHostQuality = function (state, rid) {
    const f = aiFracs(state, rid);
    let levyFrac = 1, sum = 0;
    for (const id in f) {
      levyFrac -= f[id];
      sum += f[id] * unitClassQuality(id);
    }
    return Math.max(0, levyFrac) * unitClassQuality('levy') + sum;
  };

  function B() { return FBDATA.balance; }
  FB.hostAutomationManual = function () {
    return !FB.game || !FB.game.auto ||
      (FB.game.auto.hosts || 'manual') === 'manual';
  };
  let armyRenderRevision = 0;
  function requestMap() {
    armyRenderRevision++;
    if (FB.map) FB.map.request();
  }
  const REINFORCEMENT_MAP_INTERVAL_DAYS = 5;

  function provName(pid) {
    const pr = FB.world.byId[pid];
    return pr ? pr.name : '?';
  }

  /* every live host of a realm, in stable army order */
  FB.hostsOf = function (state, rid) {
    FB.armiesEnsure(state);
    const out = [];
    for (const a of state.armies) if (a.realm === rid) out.push(a);
    return out;
  };

  /* The primary host is a realm's largest — the main body that rearm,
     muster, de-muster, and single-host legacy callers key on. A realm with
     no host in the field still reads null. */
  FB.hostOf = function (state, rid) {
    const hosts = FB.hostsOf(state, rid);
    let best = null;
    for (const a of hosts) if (!best || a.men > best.men) best = a;
    return best;
  };
  FB.playerHost = function (state) { return FB.hostOf(state, 'player'); };

  /* A newly gentle founder may earn one extraordinary personal elevation by
     commanding the local count-or-greater patron's contingent in the live
     sovereign host. The saved record contains only stable ids and the start
     turn; readiness and continued validity are always derived from the live
     hierarchy, war, host, and protagonist. */
  function militaryCommandPatron(state) {
    const p = state && state.player;
    if (!p) return null;
    const rid = (state.holder && state.holder[p.provinceId]) ||
      (state.owner && state.owner[p.provinceId]);
    const realm = rid && state.realms && state.realms[rid];
    if (!realm || !realm.alive || rid === 'player' || realm.rank < 1) return null;
    const sovereignId = FB.topRealm(state, rid);
    const sovereign = sovereignId && state.realms[sovereignId];
    if (!sovereign || !sovereign.alive || sovereignId === 'player') return null;
    return { patronRealmId:rid, sovereignRealmId:sovereignId };
  }

  FB.activeMilitaryCommand = function (state) {
    const p = state && state.player;
    const record = p && p.militaryCommand;
    if (!record || record.charId !== p.charId || p.tier !== 2) return null;
    const patron = record.patronRealmId && state.realms[record.patronRealmId];
    if (!patron || !patron.alive || patron.rank < 1 ||
        FB.topRealm(state, record.patronRealmId) !== record.sovereignRealmId ||
        !FB.isRealmAtWar(state, record.sovereignRealmId)) return null;
    let host = null;
    if (record.hostId) {
      for (const army of state.armies || []) {
        if (army.id === record.hostId &&
            army.realm === record.sovereignRealmId) {
          host = army;
          break;
        }
      }
    } else {
      /* Commands saved before hostId was recorded remain attached to the
         realm's primary banner until the next command begins. */
      host = FB.hostOf(state, record.sovereignRealmId);
    }
    if (!host) return null;
    return record;
  };

  /* A field-command host still belongs to its sovereign realm, but map
     interaction belongs to the protagonist for as long as that command is
     valid. Keep ownership and control separate: economy, muster, losses,
     diplomacy, and peace continue to key on the host's real realm. */
  FB.playerControlsHost = function (state, host) {
    if (!host) return false;
    if (host.realm === 'player') return true;
    const command = FB.activeMilitaryCommand(state);
    if (!command || host.realm !== command.sovereignRealmId) return false;
    if (command.hostId) return host.id === command.hostId;
    return FB.hostOf(state, command.sovereignRealmId) === host;
  };

  FB.militaryCommandStatus = function (state) {
    const p = state.player;
    const me = state.chars[p.charId];
    const active = FB.activeMilitaryCommand(state);
    const firstHead = p.houseFounderId
      ? p.charId === p.houseFounderId : state.generation === 1;
    const newlyGentle = p.tier === 2 && p.gentryGeneration !== undefined &&
      p.gentryGeneration !== null && FB.gentryEstablished &&
      !FB.gentryEstablished(state);
    const battlefieldRise = !!(p.flags && p.flags.seen_battle &&
      p.flags.lords_favor);
    const visible = firstHead && newlyGentle && battlefieldRise;
    const patron = militaryCommandPatron(state);
    const martial = me ? FB.skillOf(me, 'mar') : 0;
    const martialNeeded = B().militaryBaronyMartial === undefined
      ? 12 : B().militaryBaronyMartial;
    const prestigeNeeded = B().militaryBaronyPrestige === undefined
      ? 120 : B().militaryBaronyPrestige;
    let reason = '';
    if (active) {
      reason = FB.T('You are leading your ruler’s contingent in the field. Win a battle before the host disperses.');
    } else if (!visible) {
      reason = FB.T('Only the first head of a newly gentle house who has fought in battle and saved the lord may seek this command.');
    } else if (martial < martialNeeded) {
      reason = FB.T('You need Martial {needed} to be entrusted with an army (now {current}).', {
        needed:martialNeeded, current:Math.floor(martial)
      });
    } else if (p.prestige < prestigeNeeded) {
      reason = FB.T('You need at least {needed} prestige to be entrusted with an army (now {current}).', {
        needed:prestigeNeeded, current:Math.floor(p.prestige)
      });
    } else if (!patron) {
      reason = FB.T('Only a count or greater ruler can entrust you with a field command.');
    } else if (!FB.isRealmAtWar(state, patron.sovereignRealmId)) {
      reason = FB.T('Your ruler is not at war.');
    } else if (!FB.hostOf(state, patron.sovereignRealmId)) {
      reason = FB.T('Your ruler has no host in the field.');
    }
    return {
      visible:visible,
      active:!!active,
      ready:visible && !active && !reason,
      reason:reason,
      patronRealmId:patron && patron.patronRealmId,
      sovereignRealmId:patron && patron.sovereignRealmId,
      martial:martial,
      martialNeeded:martialNeeded,
      prestigeNeeded:prestigeNeeded
    };
  };

  FB.beginMilitaryCommand = function (state) {
    const status = FB.militaryCommandStatus(state);
    if (!status.ready) return false;
    const p = state.player;
    const host = FB.hostOf(state, status.sovereignRealmId);
    if (!host) return false;
    p.militaryCommand = {
      charId:p.charId,
      patronRealmId:status.patronRealmId,
      sovereignRealmId:status.sovereignRealmId,
      hostId:host.id,
      startedTurn:state.turn
    };
    /* Taking command is a real handoff. Do not let an AI route chosen on
       the preceding day carry the host away before the player can issue
       the first manual order. */
    host.path = [];
    host.goal = null;
    host.moveLeft = 0;
    host.huntPrey = null;
    host.manual = 0;
    host.holdManual = 1;
    requestMap();
    if (p.focus !== 'lead_host') {
      p.focusBack = p.focus;
      p.focus = 'lead_host';
    }
    const patron = state.realms[status.patronRealmId];
    FB.news(state, FB.msg('news.action.military_command_begins',
      '🚩 {ruler} entrusts you with a contingent of the field host. One true victory could win a banner of your own.', {
        ruler:patron.ruler && patron.ruler.name || patron.name
      }));
    return true;
  };

  FB.endMilitaryCommand = function (state) {
    if (!state.player.militaryCommand) return false;
    delete state.player.militaryCommand;
    if (FB.validateFocus) FB.validateFocus(state);
    FB.news(state, FB.msg('news.war.military_command_ends',
      '🏳 The field command ends without the victory that might have won you a barony.', {}));
    return true;
  };

  FB.noteMilitaryCommandVictory = function (state, winner, loser, pid) {
    const record = FB.activeMilitaryCommand(state);
    if (!record || !winner || !loser ||
        winner.realm !== record.sovereignRealmId ||
        !FB.armiesHostile(state, winner, loser)) return false;
    delete state.player.militaryCommand;
    if (FB.validateFocus) FB.validateFocus(state);
    FB.queueEvent(state, 'military_barony_victory', {
      pid:pid,
      realmId:record.patronRealmId,
      sovereignRealmId:record.sovereignRealmId,
      enemyId:loser && loser.realm || null
    });
    return true;
  };

  function hostUpkeepParts(units, mercenaryCompanies) {
    const bal = B();
    const base = bal.hostLogisticsBase === undefined ? 2 : bal.hostLogisticsBase;
    const byClass = {};
    let soldiers = 0;
    for (const key of FB.unitClassIds()) {
      const def = unitClassDef(key);
      const per100 = def && isFinite(Number(def.upkeepPer100))
        ? Number(def.upkeepPer100) : 0;
      byClass[key] = Math.max(0, Number(units[key]) || 0) / 100 * per100;
      soldiers += byClass[key];
    }
    const mercenaries = Math.max(0, Number(mercenaryCompanies) || 0) *
      (bal.hostLogisticsMercenaryCompany === undefined
        ? 4 : bal.hostLogisticsMercenaryCompany);
    return {
      base:base, levy:byClass.levy || 0, archers:byClass.arch || 0,
      cavalry:byClass.cav || 0, retinue:byClass.ret || 0,
      mercenaries:mercenaries, byClass:byClass,
      total:base + soldiers + mercenaries
    };
  }

  /* Current seasonal cost of the live player hosts. A missing (disbanded or
     shattered) host has no base logistics and therefore costs nothing; each
     fielded host — the main body and every detachment — pays its own camp
     base, while hired companies are contracted once for the whole war. The
     reinforcement premium is charged while replacement cohorts drill, host
     or no host — the drilling does not pause when the banners come down. */
  FB.playerHostUpkeepParts = function (state) {
    const reinforcement = reinforcementParts(state);
    const hosts = FB.hostsOf(state, 'player');
    const host = hosts.length ? FB.hostOf(state, 'player') : null;
    if (!host) {
      return {
        base:0, levy:0, archers:0, cavalry:0, retinue:0,
        mercenaries:0, byClass:{}, campaignModifier:0,
        reinforcement:reinforcement.total,
        reinforceByClass:reinforcement.byClass,
        total:reinforcement.total
      };
    }
    const units = emptyUnitCounts();
    for (const h of hosts) {
      const hu = FB.hostUnits(h);
      for (const key of FB.unitClassIds()) units[key] += hu[key] || 0;
    }
    const companySize = B().mercCompanySize || 150;
    const contracted = state.player.war && state.player.war.mercCos;
    const companies = contracted || Math.ceil((units.mercs || 0) / companySize);
    const parts = hostUpkeepParts(units, companies);
    parts.base *= hosts.length; // every banner keeps its own camp
    if (FB.marketCostQuote) {
      const pid = host.at || state.player.provinceId;
      parts.base = FB.marketCostQuote(state, parts.base,
        { provisions:0.55, materials:0.25, transport:0.20 }, pid);
      /* each class quotes its own provisions/materials/transport basket */
      for (const key of FB.unitClassIds()) {
        const def = unitClassDef(key);
        const basket = def && def.basket;
        if (!basket) continue;
        parts.byClass[key] = FB.marketCostQuote(state, parts.byClass[key],
          basket, pid);
      }
      parts.levy = parts.byClass.levy || 0;
      parts.archers = parts.byClass.arch || 0;
      parts.cavalry = parts.byClass.cav || 0;
      parts.retinue = parts.byClass.ret || 0;
      let soldiers = 0;
      for (const key in parts.byClass) soldiers += parts.byClass[key];
      parts.total = parts.base + soldiers + parts.mercenaries;
    }
    const rate = FB.campaignHostModBonus
      ? FB.campaignHostModBonus(state, 'supplyUse') : 0;
    parts.reinforcement = reinforcement.total;
    parts.reinforceByClass = reinforcement.byClass;
    parts.total += reinforcement.total;
    const nonContract = parts.total - parts.mercenaries;
    parts.campaignModifier = nonContract * rate;
    parts.total = Math.max(0, parts.total + parts.campaignModifier);
    return parts;
  };

  /* ---------- ordinary campaign feedback ----------
     The war object owns only compact, JSON-safe facts. UI text is derived,
     and old active wars acquire empty ledgers without a save-version bump. */
  FB.ensurePlayerWarFeedback = function (state) {
    const war = state && state.player && state.player.war;
    if (!war) return null;
    if (!Array.isArray(war.battles)) war.battles = [];
    if (!Array.isArray(war.effects)) war.effects = [];
    if (!war.lossesByClass || typeof war.lossesByClass !== 'object') {
      war.lossesByClass = emptyUnitCounts();
    } else {
      war.lossesByClass = copyUnitCounts(war.lossesByClass);
    }
    const host = FB.playerHost(state);
    if (!war.initialUnits && host) {
      war.initialUnits = copyUnitCounts(FB.hostUnits(host));
      war.initialMen = host.men;
    }
    return war;
  };

  FB.ensurePlayerWarHistory = function (state) {
    const war = state && state.player && state.player.war;
    if (!war || !FB.recordHostileEvent) return null;
    let report = war.hostileReportId && FB.hostileReport
      ? FB.hostileReport(state, war.hostileReportId) : null;
    if (report) return report;
    report = FB.recordHostileEvent(state, {
      kind:'war', status:'active', startedTurn:state.turn,
      enemyId:war.enemy || null, targetPid:war.target || null,
      defending:!!war.defending,
      causeType:war.casus && war.casus.type || null,
      causeTarget:war.casus && war.casus.target || null,
      titleKind:war.casus && war.casus.titleKind || null,
      titleId:war.casus && war.casus.titleId || null,
      wins:war.wins || 0, losses:war.losses || 0, seasons:war.seasons || 0
    });
    if (report) war.hostileReportId = report.id;
    return report;
  };

  FB.finishPlayerWarHistory = function (state, result) {
    const war = state && state.player && state.player.war;
    if (!war) return null;
    const report = FB.ensurePlayerWarHistory(state);
    if (!report || !FB.updateHostileEvent) return report;
    const need = FBDATA.balance.warWinsToTakeProvince || 3;
    let resolved = result;
    if (!resolved) {
      const playerRealm = FB.playerRealmId ? FB.playerRealmId(state) : 'player';
      const targetOwner = state.owner && state.owner[war.target];
      const targetHolder = state.holder && state.holder[war.target];
      if (!war.defending && war.target &&
          (targetOwner === 'player' || targetHolder === 'player' ||
            targetOwner === playerRealm)) {
        resolved = 'victory';
      } else if ((war.losses || 0) >= need) {
        resolved = 'defeat';
      } else if ((war.wins || 0) >= need ||
          (war.wins || 0) > (war.losses || 0)) {
        resolved = war.defending ? 'victory' : 'favorable_peace';
      } else if ((war.losses || 0) > (war.wins || 0)) {
        resolved = 'unfavorable_peace';
      } else {
        resolved = 'peace';
      }
    }
    return FB.updateHostileEvent(state, report.id, {
      status:'concluded', result:resolved, endedTurn:state.turn,
      endedY:state.date.year, endedS:state.date.season, endedD:state.date.day,
      wins:war.wins || 0, losses:war.losses || 0, seasons:war.seasons || 0,
      finalTargetPid:war.target || null
    });
  };

  FB.notePlayerWarTroopLosses = function (state, losses) {
    const war = FB.ensurePlayerWarFeedback(state);
    if (!war || !losses) return;
    for (const key of FB.unitClassIds()) {
      war.lossesByClass[key] += Math.max(0,
        Math.round(Number(losses[key]) || 0));
    }
  };

  FB.recordPlayerBattle = function (state, record) {
    const war = FB.ensurePlayerWarFeedback(state);
    if (!war || !record) return null;
    const saved = {
      turn:record.turn === undefined ? state.turn : record.turn,
      outcome:record.outcome === 'win' ? 'win' : 'loss',
      mode:record.mode === 'field' ? 'field' : 'abstract',
      primaryHostInvolved:record.primaryHostInvolved !== false,
      pid:record.pid || null,
      playerBefore:Math.max(0, Math.round(Number(record.playerBefore) || 0)),
      playerAfter:Math.max(0, Math.round(Number(record.playerAfter) || 0)),
      enemyBefore:Math.max(0, Math.round(Number(record.enemyBefore) || 0)),
      enemyAfter:Math.max(0, Math.round(Number(record.enemyAfter) || 0)),
      playerLosses:copyUnitCounts(record.playerLosses),
      enemyLosses:copyUnitCounts(record.enemyLosses)
    };
    const warReport = FB.ensurePlayerWarHistory(state);
    if (FB.recordHostileEvent) {
      const hostile = FB.recordHostileEvent(state, {
        kind:'battle', warReportId:warReport && warReport.id || null,
        enemyId:war.enemy || null, targetPid:war.target || null,
        defending:!!war.defending, turn:saved.turn,
        outcome:saved.outcome, mode:saved.mode, pid:saved.pid,
        primaryHostInvolved:saved.primaryHostInvolved,
        playerBefore:saved.playerBefore, playerAfter:saved.playerAfter,
        enemyBefore:saved.enemyBefore, enemyAfter:saved.enemyAfter,
        playerLosses:saved.playerLosses, enemyLosses:saved.enemyLosses
      });
      if (hostile) saved.hostileReportId = hostile.id;
    }
    war.battles.push(saved);
    if (war.battles.length > 8) war.battles.splice(0, war.battles.length - 8);
    FB.notePlayerWarTroopLosses(state, saved.playerLosses);
    if (saved.outcome === 'loss') war.lastDefeatTurn = saved.turn;
    return saved;
  };

  FB.recordWarEffect = function (state, spec) {
    const war = FB.ensurePlayerWarFeedback(state);
    if (!war || !spec) return null;
    const losses = copyUnitCounts(spec.troopLosses);
    const troopTotal = unitCountTotal(losses);
    const strengthDelta = Number(spec.strengthDelta) || 0;
    const target = strengthDelta && troopTotal ? 'both'
      : (troopTotal ? 'troops' : 'strength');
    const record = {
      turn:state.turn,
      source:spec.source || 'campaign',
      condition:spec.condition || 'campaign',
      target:target,
      strengthDelta:strengthDelta,
      troopLosses:losses,
      troopTotal:troopTotal
    };
    if (spec.rate !== undefined) record.rate = Number(spec.rate) || 0;
    war.effects.push(record);
    if (war.effects.length > 10) war.effects.splice(0, war.effects.length - 10);
    return record;
  };

  FB.adjustWarStrength = function (state, delta, spec) {
    const war = FB.ensurePlayerWarFeedback(state);
    if (!war) return 0;
    const before = war.strength || 1;
    const min = spec && spec.min !== undefined ? spec.min : 0.5;
    const max = spec && spec.max !== undefined ? spec.max : 1.1;
    war.strength = FB.clamp(before + delta, min, max);
    const actual = war.strength - before;
    spec = spec || {};
    spec.strengthDelta = actual;
    if (actual || unitCountTotal(spec.troopLosses)) {
      FB.recordWarEffect(state, spec);
    }
    return actual;
  };

  FB.playerWarHostLoss = function (state, lost, spec) {
    const host = FB.playerHost(state);
    if (!host) return null;
    const losses = FB.applyHostLosses(host, lost);
    FB.noteCohortLosses(state, host.realm, losses);
    FB.notePlayerWarTroopLosses(state, losses);
    spec = spec || {};
    spec.troopLosses = losses;
    FB.recordWarEffect(state, spec);
    requestMap();
    return losses;
  };

  FB.warBattleStreak = function (state) {
    const war = state && state.player && state.player.war;
    const battles = war && Array.isArray(war.battles) ? war.battles : [];
    if (!battles.length) return { outcome:null, count:0 };
    const outcome = battles[battles.length - 1].outcome;
    let count = 0;
    for (let i = battles.length - 1; i >= 0; i--) {
      if (battles[i].outcome !== outcome) break;
      count++;
    }
    return { outcome:outcome, count:count };
  };

  FB.warFeedback = function (state) {
    const war = state && state.player && state.player.war;
    if (!war) return null;
    const host = FB.playerHost(state);
    const losses = copyUnitCounts(war.lossesByClass);
    return {
      battles:Array.isArray(war.battles) ? war.battles.slice() : [],
      streak:FB.warBattleStreak(state),
      losses:losses,
      lossTotal:unitCountTotal(losses),
      effects:Array.isArray(war.effects) ? war.effects.slice() : [],
      upkeep:FB.playerHostUpkeepParts(state),
      host:host,
      units:host ? copyUnitCounts(FB.hostUnits(host)) : emptyUnitCounts(),
      strength:war.strength || 1
    };
  };

  FB.warDeserterPayment = function (state) {
    const bal = B();
    const upkeep = FB.playerHostUpkeepParts(state).total;
    const seasons = bal.warDeserterPayUpkeepSeasons === undefined
      ? 2 : bal.warDeserterPayUpkeepSeasons;
    const minimum = bal.warDeserterPayMin === undefined
      ? 6 : bal.warDeserterPayMin;
    return Math.max(minimum, Math.ceil(upkeep * seasons));
  };

  FB.warDeserterStatus = function (state) {
    const war = state && state.player && state.player.war;
    const host = war && FB.playerHost(state);
    const payment = FB.warDeserterPayment(state);
    const result = {
      eligible:false, payment:payment, hostMen:host ? host.men : 0,
      lossTotal:0, threshold:0, recentDefeat:false, intervalReady:false
    };
    if (!war || !host || host.men < (B().armyMinMen || 40)) return result;
    const losses = copyUnitCounts(war.lossesByClass);
    result.lossTotal = unitCountTotal(losses);
    if (!result.lossTotal && host.size !== undefined) {
      result.lossTotal = Math.max(0, host.size - host.men);
    }
    const initial = Math.max(1, Number(war.initialMen) || Number(host.size) || host.men);
    const minimumLosses = B().warDeserterMinCasualties === undefined
      ? 60 : B().warDeserterMinCasualties;
    const minimumRate = B().warDeserterMinCasualtyRate === undefined
      ? 0.08 : B().warDeserterMinCasualtyRate;
    result.threshold = Math.max(minimumLosses,
      Math.round(initial * minimumRate));
    const streak = FB.warBattleStreak(state);
    const windowDays = B().warDeserterDefeatWindowDays === undefined
      ? 180 : B().warDeserterDefeatWindowDays;
    result.recentDefeat = war.lastDefeatTurn !== undefined &&
      state.turn - war.lastDefeatTurn <= windowDays;
    if (!result.recentDefeat && streak.outcome === 'loss' && streak.count >= 2) {
      result.recentDefeat = true;
    }
    const interval = B().warDeserterIntervalDays === undefined
      ? 180 : B().warDeserterIntervalDays;
    result.intervalReady = war.lastDeserterTurn === undefined ||
      state.turn - war.lastDeserterTurn >= interval;
    result.eligible = result.recentDefeat && result.intervalReady &&
      result.lossTotal >= result.threshold;
    return result;
  };

  /* ---------- professional replacement cohorts (docs/designs/war.md) ----------
     Slain professionals (classes flagged `professional` in the unit table)
     are not gone for the war: their realm drills replacements. The cohort is
     owned by the realm (state.armyCohorts), not by any host, so it survives
     host dismissal, de-muster, save/load, and peace. Each loss queues a
     batch that completes at loss turn + the class's replaceDays — a fixed
     date, no RNG — and while any batch is pending the realm pays the
     reinforcement premium. Drilled men wait in `ready` and join a host
     resting on home land or the realm's next fresh muster (never a
     de-muster-capped one: those veterans already returned in the pool). */

  function cohortReplaceDays(classId) {
    const def = unitClassDef(classId);
    const own = def && Number(def.replaceDays);
    if (isFinite(own) && own > 0) return Math.max(1, Math.round(own));
    const shared = Number(B().cohortReplaceDays);
    return isFinite(shared) && shared > 0 ? Math.max(1, Math.round(shared)) : 120;
  }

  function cohortLedger(state, realmId) {
    if (!state.armyCohorts) state.armyCohorts = {};
    let ledger = state.armyCohorts[realmId];
    if (!ledger) ledger = state.armyCohorts[realmId] = {};
    return ledger;
  }

  function cohortPending(record) {
    let pending = 0;
    for (const batch of record.batches) pending += batch.n;
    return pending;
  }

  /* record slain professionals of one realm's hosts; every live loss path
     (battle, siege, starvation, desertion, campaign events) funnels here */
  FB.noteCohortLosses = function (state, realmId, losses) {
    if (!state || !realmId || !losses) return;
    const cap = Number(B().cohortMaxPerClass);
    const capPerClass = isFinite(cap) && cap > 0 ? Math.round(cap) : 600;
    const ledger = cohortLedger(state, realmId);
    for (const key in losses) {
      if (key === 'total') continue;
      const def = unitClassDef(key);
      if (!def || !def.professional) continue;
      const lost = Math.max(0, Math.round(Number(losses[key]) || 0));
      if (!lost) continue;
      const record = ledger[key] || (ledger[key] = { batches:[], ready:0 });
      const room = Math.max(0, capPerClass - record.ready - cohortPending(record));
      if (!room) continue;
      record.batches.push({
        n:Math.min(lost, room),
        readyTurn:state.turn + cohortReplaceDays(key)
      });
    }
  };

  /* mature due batches into ready; the player hears once per class whose
     drilling finishes today */
  function cohortTick(state) {
    const ledgers = state.armyCohorts;
    if (!ledgers) return;
    for (const realmId in ledgers) {
      const ledger = ledgers[realmId];
      if (!ledger) continue;
      for (const classId in ledger) {
        const record = ledger[classId];
        if (!record) continue;
        let drilled = 0;
        const pendingBatches = [];
        for (const batch of record.batches) {
          if (batch.readyTurn <= state.turn) drilled += batch.n;
          else pendingBatches.push(batch);
        }
        if (!drilled) continue;
        record.batches = pendingBatches;
        record.ready += drilled;
        if (realmId === 'player' && !pendingBatches.length) {
          const def = unitClassDef(classId);
          FB.news(state, FB.msg('news.army.cohort_replaced',
            '🛡 The replacement {unit} finish their drilling — {men} stand ready for the next muster.', {
              unit:def
                ? FB.dataText(state, null, 'unitClass', classId, def, 'name', {})
                : classId,
              men:record.ready
            }));
        }
      }
    }
  }

  /* the replacement ledger as the host view and the upkeep quote read it:
     per professional class the pending men, the exact turn the last batch
     completes, and the drilled men waiting */
  FB.cohortStatus = function (state, realmId) {
    const out = { classes:{}, pendingTotal:0, readyTotal:0 };
    const ledger = state && state.armyCohorts &&
      state.armyCohorts[realmId === undefined ? 'player' : realmId];
    if (!ledger) return out;
    for (const classId of FB.unitClassIds()) {
      const record = ledger[classId];
      if (!record) continue;
      const pending = cohortPending(record);
      const ready = Math.max(0, Number(record.ready) || 0);
      if (!pending && !ready) continue;
      let lastReadyTurn = null;
      for (const batch of record.batches) {
        if (lastReadyTurn === null || batch.readyTurn > lastReadyTurn) {
          lastReadyTurn = batch.readyTurn;
        }
      }
      out.classes[classId] = {
        pending:pending,
        ready:ready,
        daysLeft:lastReadyTurn === null
          ? 0 : Math.max(0, lastReadyTurn - state.turn)
      };
      out.pendingTotal += pending;
      out.readyTotal += ready;
    }
    return out;
  };

  /* the seasonal reinforcement premium: professionals still drilling cost
     their class upkeepPer100 × balance.reinforcementPremiumMult on top of the
     host's ordinary logistics, quoted against each class's market basket at
     the host's (or home) county. Charged while pending, gone the day the
     last batch completes. */
  function reinforcementParts(state) {
    const out = { byClass:{}, total:0 };
    const status = FB.cohortStatus(state, 'player');
    const mult = Number(B().reinforcementPremiumMult);
    const rate = isFinite(mult) && mult > 0 ? mult : 1;
    const host = FB.playerHost(state);
    const pid = (host && host.at) || state.player.provinceId;
    for (const classId in status.classes) {
      const pending = status.classes[classId].pending;
      if (!pending) continue;
      const def = unitClassDef(classId);
      const per100 = def && isFinite(Number(def.upkeepPer100))
        ? Number(def.upkeepPer100) : 0;
      if (!per100) continue;
      let amount = pending / 100 * per100 * rate;
      const basket = def && def.basket;
      if (basket && FB.marketCostQuote) {
        amount = FB.marketCostQuote(state, amount, basket, pid);
      }
      out.byClass[classId] = amount;
      out.total += amount;
    }
    return out;
  }

  /* pull drilled replacements into a host resting on home land, up to its
     mustered size; returns the men joined (runs before the levy refill, so
     professionals claim the room first) */
  function cohortJoinHost(state, host, room) {
    const ledger = state.armyCohorts && state.armyCohorts[host.realm];
    if (!ledger || room <= 0) return 0;
    let joined = 0;
    const units = FB.hostUnits(host);
    for (const classId of FB.unitClassIds()) {
      if (joined >= room) break;
      const record = ledger[classId];
      if (!record || !record.ready) continue;
      const take = Math.min(record.ready, room - joined);
      record.ready -= take;
      units[classId] = (units[classId] || 0) + take;
      host.men += take;
      joined += take;
      if (!record.ready && !record.batches.length) delete ledger[classId];
    }
    return joined;
  }

  /* fresh musters take every drilled replacement of the realm; returns the
     per-class amounts added so the caller can consume the ledger */
  function cohortMusterAdditions(state, realmId) {
    const out = {};
    const status = FB.cohortStatus(state, realmId);
    for (const classId in status.classes) {
      if (status.classes[classId].ready > 0) {
        out[classId] = status.classes[classId].ready;
      }
    }
    return out;
  }

  function cohortConsumeReady(state, realmId, used) {
    const ledger = state.armyCohorts && state.armyCohorts[realmId];
    if (!ledger) return;
    for (const classId in used) {
      const record = ledger[classId];
      if (!record) continue;
      record.ready = Math.max(0, record.ready - used[classId]);
      if (!record.ready && !record.batches.length) delete ledger[classId];
    }
  }

  /* Declaration preview: the present peacetime composition at an ordinary
     muster, before a great levy, mercenaries, or defensive allies join it. */
  FB.playerMusterUpkeepParts = function (state) {
    const comp = FB.playerComposition(state);
    const units = emptyUnitCounts();
    let men = 0;
    for (const key of musteredClassIds()) {
      units[key] = Math.max(0, Number(comp[key]) || 0);
      men += units[key];
    }
    const floor = B().armyMinMen || 40;
    if (men < floor) units.levy += floor - men;
    return hostUpkeepParts(units, 0);
  };

  FB.armiesAt = function (state, pid) {
    FB.armiesEnsure(state);
    return state.armies.filter(function (a) { return a.at === pid; });
  };

  /* are two armies from warring camps? (armies belong to sovereigns, so a
     plain realm-id comparison against the war objects is enough). Reads the
     live war objects, so it stays correct even mid-tick when a battle ends
     a war — the per-tick `warring` map below is only for the hot loops. */
  FB.armiesHostile = function (state, a, b) {
    if (a.realm === b.realm) return false;
    if (FB.greatHolyWarCamp) {
      const greatCampA = FB.greatHolyWarCamp(state, a.realm);
      const greatCampB = FB.greatHolyWarCamp(state, b.realm);
      if (greatCampA && greatCampB) return greatCampA !== greatCampB;
    }
    const w = state.player.war;
    if (a.realm === 'player') return !!(w && w.enemy === b.realm);
    if (b.realm === 'player') return !!(w && w.enemy === a.realm);
    const ra = state.realms[a.realm], rb = state.realms[b.realm];
    if (ra && ra.war && ra.war.enemy === b.realm) return true;
    if (rb && rb.war && rb.war.enemy === a.realm) return true;
    return false;
  };

  /* Vassals cannot own a foreign war or raise a sovereign host. Keep that
     derived subset until a realm death or hierarchy mutation advances the
     shared realm revision; a mature world has hundreds of vassal records but
     only dozens of sovereigns. */
  let sovereignIndexState = null;
  let sovereignIndexRevision = -1;
  let sovereignIndexIds = [];
  function sovereignRealmIds(state) {
    const revision = FB.realmStateRevision
      ? FB.realmStateRevision() : state.turn;
    if (sovereignIndexState === state &&
        sovereignIndexRevision === revision) return sovereignIndexIds;
    const ids = [];
    for (const id in state.realms) {
      const realm = state.realms[id];
      if (id !== 'player' && realm && realm.alive && !realm.liege) ids.push(id);
    }
    sovereignIndexState = state;
    sovereignIndexRevision = revision;
    sovereignIndexIds = ids;
    return ids;
  }

  /* who fights whom, built once per tick: realmId → enemyId, both directions,
     plus the player's personal war ('player' ↔ its enemy). Reading only the
     retained sovereign subset keeps the daily path O(sovereigns + armies)
     rather than revisiting every generated vassal. */
  function warringMap(state, sovereignIds) {
    const m = {};
    const pw = state.player.war;
    if (pw && pw.enemy) { m['player'] = pw.enemy; m[pw.enemy] = 'player'; }
    for (let sovereignIndex = 0; sovereignIndex < sovereignIds.length;
        sovereignIndex++) {
      const id = sovereignIds[sovereignIndex];
      const r = state.realms[id];
      if (!r.alive || !r.war) continue;
      const e = state.realms[r.war.enemy];
      if (!e || !e.alive) continue;
      m[id] = r.war.enemy; // a realm's own declaration wins
      if (!m[r.war.enemy]) m[r.war.enemy] = id;
    }
    if (state.greatHolyWar && state.greatHolyWar.phase === 'active' &&
        FB.greatHolyWarEnemies) {
      /* every participant of a camp shares the same first enemy — compute it
         once per camp instead of a full validated enemy list per realm */
      const firstEnemy = {};
      const enemyOf = function (camp) {
        if (!camp) return null;
        if (firstEnemy[camp] === undefined) {
          firstEnemy[camp] = FB.greatHolyWarFirstEnemy
            ? FB.greatHolyWarFirstEnemy(state, camp) : null;
        }
        return firstEnemy[camp];
      };
      for (const campName of ['attackers', 'defenders']) {
        const participants = state.greatHolyWar.participants[campName] || [];
        for (const participant of participants) {
          if (!participant.sovereign) continue;
          const enemy = enemyOf(FB.greatHolyWarCamp(state, participant.realm));
          m[participant.realm] = enemy || '__great_holy_war__';
        }
      }
      if (FB.playerGreatHolyWarHostActive && FB.playerGreatHolyWarHostActive(state)) {
        const playerEnemy = enemyOf(FB.greatHolyWarCamp(state, 'player'));
        m.player = playerEnemy || '__great_holy_war__';
      }
    }
    return m;
  }

  /* how far a shattered side has re-formed: 1 while unbloodied, ramping from
     a floor back to 1 across the rearm window. The war council's abstract
     battle reads this so a just-broken army fields only a remnant. */
  FB.rearmScale = function (state, rid) {
    FB.armiesEnsure(state);
    const down = state.armyDown[rid];
    if (down === undefined) return 1;
    /* a host depleted but intact (a costly raid) re-arms from its surviving
       strength; only a shattered army starts from the 0.15 floor. The
       survival record is keyed to the down-turn so a later shattering never
       inherits a stale floor. */
    const survival = (state.armyDownSurvival && state.armyDownSurvival[rid]) || null;
    const floor = (survival && survival.turn === down) ? Math.max(0.15, survival.frac) : 0.15;
    return FB.clamp((state.turn - down) / B().armyRearmDays, floor, 1);
  };

  function playerHome(state) {
    const p = state.player;
    return (state.realms.player && state.realms.player.alive && state.realms.player.capital) ||
      (p.provs && p.provs[0]) || p.provinceId;
  }

  /* ---------- raising & disbanding ---------- */

  /* One calculation feeds both the Deeds estimate and the actual host. A
     voluntary de-muster is a hard ceiling on the returning own troops: levy
     modifiers are applied before that ceiling, while hired companies and
     defensive allies still answer independently. The ordinary minimum muster
     may seed a fresh war, but never manufactures replacements after a
     voluntary de-muster. */
  function playerMusterPlan(state) {
    const p = state.player, w = p.war;
    const greatHost = FB.playerGreatHolyWarHostActive &&
      FB.playerGreatHolyWarHostActive(state);
    if (!w && !greatHost) return null;
    const cs = B().mercCompanySize || 150;
    const comp = FB.playerComposition(state);
    const units = emptyUnitCounts();
    for (const key of musteredClassIds()) {
      units[key] = Math.max(0, Math.round(Number(comp[key]) || 0));
    }
    units.mercs = (w && w.mercCos || 0) * cs;
    if (w && w.mass) units.levy = Math.round(units.levy * (B().massLevyMult || 1.35)); // the great levy
    /* a voluntary de-muster sent only part of the standing host home: the
       war's next muster fields no more of each own class than returned
       after campaign levy modifiers; hired companies and allied
       reinforcements are raised fresh unless that ally already withdrew */
    const limited = !!(w && w.musterPool);
    if (limited) {
      const pool = w.musterPool;
      for (const key of musteredClassIds()) {
        units[key] = Math.min(units[key], Math.max(0, Number(pool[key]) || 0));
      }
    }
    /* drilled replacement cohorts answer a fresh muster at no surcharge; a
       de-muster-capped muster leaves them waiting — those veterans already
       returned in the pool */
    const cohort = limited ? null : cohortMusterAdditions(state, 'player');
    if (cohort) {
      for (const key in cohort) units[key] = (units[key] || 0) + cohort[key];
    }
    const allied = w && w.defending && !w.alliedWithdrew && FB.alliedReinforcement
      ? FB.alliedReinforcement(state, 'player') : { ally: null, men: 0 };
    if (allied.men) units.levy += allied.men;
    let men = unitCountTotal(units);
    const floor = B().armyMinMen || 40;
    if (!limited && men < floor) { units.levy += floor - men; men = floor; }
    return {
      units:units, allied:allied, men:men, floor:floor,
      limited:limited, greatHost:greatHost, cohort:cohort
    };
  }

  FB.playerMusterPreview = function (state) {
    const plan = playerMusterPlan(state);
    if (!plan) return null;
    return {
      men:plan.men, minimum:plan.floor,
      canRaise:plan.men >= plan.floor, limited:plan.limited,
      units:copyUnitCounts(plan.units)
    };
  };

  FB.raisePlayerHost = function (state) {
    FB.armiesEnsure(state);
    const p = state.player, w = p.war;
    const existing = FB.playerHost(state);
    if (existing) return existing;
    const down = state.armyDown['player'];
    if (down !== undefined && state.turn - down < B().armyRearmDays) return null;
    const plan = playerMusterPlan(state);
    if (!plan || plan.men < plan.floor) return null;
    if (plan.limited) delete w.musterPool;
    if (plan.cohort) cohortConsumeReady(state, 'player', plan.cohort);
    const units = plan.units, allied = plan.allied, men = plan.men;
    const home = playerHome(state);
    const host = { id: FB.uid(), realm: 'player', men: men, size: men, units: units,
      at: home, from: home, moveLeft: 0, path: [], goal: null };
    if (allied.men) host.allied = allied;
    state.armies.push(host);
    if (w && FB.ensurePlayerWarFeedback) FB.ensurePlayerWarFeedback(state);
    if (plan.greatHost && FB.greatHolyWarMarkMuster) {
      FB.greatHolyWarMarkMuster(state, 'player');
    }
    FB.news(state, FB.msg('news.army.player_musters',
      '🚩 The host musters at {province} — {men} men take the field.',
      { province: provName(home), men: men }));
    if (!p.flags.hostHintShown) {
      p.flags.hostHintShown = 1; // once per save: the host waits for hand-tapped orders
      if (FB.ui) FB.ui.toast('🚩 Your host has mustered — tap it on the map, then tap a province to march.');
    }
    requestMap();
    return host;
  };

  function raiseAIHost(state, rid) {
    const r = state.realms[rid];
    if (!r || !r.alive) return null;
    let men = FB.aiBaseHost(state, rid);
    let defending = !!(state.player.war && !state.player.war.defending && state.player.war.enemy === rid);
    if (!defending) {
      for (const id in state.realms) {
        const attacker = state.realms[id];
        if (attacker && attacker.alive && attacker.war && attacker.war.enemy === rid) {
          defending = true; break;
        }
      }
    }
    const allied = !FB.greatHolyWarCamp(state, rid) && defending && FB.alliedReinforcement
      ? FB.alliedReinforcement(state, rid) : { ally: null, men: 0 };
    men += allied.men;
    const f = aiFracs(state, rid);
    const base = men - allied.men;
    const units = emptyUnitCounts();
    let professional = 0;
    for (const id in f) {
      units[id] = Math.round(base * f[id]);
      professional += units[id];
    }
    units.levy = base - professional + allied.men;
    /* drilled replacement cohorts answer the fresh muster too */
    const cohort = cohortMusterAdditions(state, rid);
    let cohortMen = 0;
    for (const classId in cohort) {
      units[classId] = (units[classId] || 0) + cohort[classId];
      cohortMen += cohort[classId];
    }
    if (cohortMen) {
      cohortConsumeReady(state, rid, cohort);
      men += cohortMen;
    }
    const host = { id: FB.uid(), realm: rid, men: men, size: men, units: units,
      at: r.capital, from: r.capital, moveLeft: 0, path: [], goal: null };
    if (allied.men) host.allied = allied;
    state.armies.push(host);
    if (FB.greatHolyWarMarkMuster) {
      FB.greatHolyWarMarkMuster(state, rid);
    }
    if (state.player.war && state.player.war.enemy === rid) {
      FB.news(state, FB.msg('news.army.enemy_musters',
        '🚩 {realm} takes the field — some {men} spears against you.',
        { realm: r.name, men: men }));
    }
    requestMap();
    return host;
  }

  function disband(state, army) {
    const i = state.armies.indexOf(army);
    if (i >= 0) state.armies.splice(i, 1);
    if (selId === army.id) selId = null;
    requestMap();
  }
  FB.disbandArmy = function (state, army) { disband(state, army); };

  /* ---------- voluntary de-muster ----------
     The player may send a standing host home mid-war. Only part of it
     returns to the muster rolls, by where it stands: everything on the
     player's own county, a share elsewhere in the player's sovereign
     realm, nothing on foreign soil (balance.armyDemusterKeepOwn/Realm/
     Other). The returned men are kept on the war as musterPool and cap
     the war's next muster (see FB.raisePlayerHost), and the de-muster
     starts the same rearm wait as a shattering — so a beaten player
     cannot de-muster and immediately re-raise a full levy. Great-holy-
     war hosts are vow-bound: the deed never offers this for them. */

  /* the kept share and a location label at the host's current province */
  function demusterTerms(state, host) {
    const p = state.player, bal = B(), at = host.at;
    const own = (p.provs && p.provs.indexOf(at) >= 0) ||
      (state.holder && state.holder[at] === 'player');
    if (own) {
      return { where: 'own',
        frac: bal.armyDemusterKeepOwn === undefined ? 1 : bal.armyDemusterKeepOwn };
    }
    const rid = FB.playerRealmId(state);
    if (rid && state.owner[at] === rid) {
      return { where: 'realm',
        frac: bal.armyDemusterKeepRealm === undefined ? 0.5 : bal.armyDemusterKeepRealm };
    }
    return { where: 'other',
      frac: bal.armyDemusterKeepOther === undefined ? 0 : bal.armyDemusterKeepOther };
  }

  /* the composition that would return home: own classes scaled by the
     kept share — allied spears and hired companies are not preserved */
  function demusterPool(host, frac) {
    const u = FB.hostUnits(host);
    const allied = (host.allied && host.allied.men) || 0;
    const pool = {};
    for (const key of musteredClassIds()) {
      pool[key] = Math.max(0, Math.round(
        (key === 'levy' ? u.levy - allied : u[key]) * frac));
    }
    return pool;
  }

  /* preview for the deed description: { where, frac, men } at the host's
     current location — null while no ordinary-war host stands */
  FB.demusterPreview = function (state) {
    if (!state.player.war) return null;
    const host = FB.playerHost(state);
    if (!host) return null;
    const t = demusterTerms(state, host);
    const pool = demusterPool(host, t.frac);
    return { where: t.where, frac: t.frac, men: unitCountTotal(pool) };
  };

  FB.demusterPlayerHost = function (state) {
    const w = state.player.war;
    const host = FB.playerHost(state);
    if (!w || !host) return false;
    const t = demusterTerms(state, host);
    const pool = demusterPool(host, t.frac);
    w.musterPool = pool;
    state.armyDown['player'] = state.turn; // the same rearm wait as a shattering
    const at = host.at;
    disband(state, host);
    FB.news(state, FB.msg('news.army.demusters',
      '🏳 The host de-musters at {province} — {men} men return to the muster rolls.',
      { province: provName(at), men: unitCountTotal(pool) }));
    return true;
  };

  /* ---------- splitting & merging (docs/designs/war.md) ----------
     A host standing still may divide: the detachment takes a men-share of
     every class (largest-remainder, deterministic) and of the carried
     supply, and stands beside the main body under its own orders. Two
     friendly hosts of one realm sharing a province may merge back into one.
     Splitting conserves men: nothing is mustered or sent home. */

  /* carve targetMen out of the host as a new detachment record; the caller
     checks the minimum-men rule first */
  function splitOffHost(state, host, targetMen) {
    const units = FB.hostUnits(host);
    const beforeMen = host.men;
    const beforeSize = host.size === undefined ? beforeMen : host.size;
    const ratio = targetMen / beforeMen;
    const part = emptyUnitCounts();
    let taken = 0;
    const remainders = [];
    for (const key of FB.unitClassIds()) {
      const exact = (units[key] || 0) * ratio;
      const base = Math.min(units[key] || 0, Math.floor(exact));
      part[key] = base;
      taken += base;
      remainders.push({ key:key, frac:exact - base });
    }
    remainders.sort(function (x, y) {
      return y.frac - x.frac || (x.key < y.key ? -1 : x.key > y.key ? 1 : 0);
    });
    let changed = true;
    while (taken < targetMen && changed) {
      changed = false;
      for (const entry of remainders) {
        if (taken >= targetMen) break;
        if (part[entry.key] < (units[entry.key] || 0)) {
          part[entry.key]++;
          taken++;
          changed = true;
        }
      }
    }
    for (const key of FB.unitClassIds()) units[key] -= part[key];
    const detachmentSize = Math.max(targetMen, Math.round(beforeSize * ratio));
    const detachmentSupply = Math.round(FB.hostSupply(host) * ratio);
    host.men = beforeMen - targetMen;
    host.size = Math.max(host.men, beforeSize - detachmentSize);
    host.supply = FB.clamp(FB.hostSupply(host) - detachmentSupply, 0, 100);
    const detachment = {
      id: FB.uid(), realm: host.realm, men: targetMen, size: detachmentSize,
      units: part, at: host.at, from: host.at, moveLeft: 0, path: [],
      goal: null, supply: detachmentSupply
    };
    /* allied spears and the enemy of a hunt stay with the main body */
    state.armies.push(detachment);
    requestMap();
    return detachment;
  }

  FB.splitHostStatus = function (state, host) {
    const min = B().armyMinMen || 40;
    const none = { ok:false, targetMen:0, reason:'' };
    if (!host || host.realm !== 'player') return none;
    if (host.moveLeft > 0 || (host.path && host.path.length)) {
      none.reason = FB.T('A host on the march must halt before it divides.');
      return none;
    }
    if (host.men < min * 2) {
      none.reason = FB.T('The host is too small to divide — each part must field at least {men} men.', {
        men: min
      });
      return none;
    }
    return { ok:true, targetMen:Math.round(host.men / 2), reason:'' };
  };

  /* the player order on the selected host card: split off half the host */
  FB.splitHost = function (state, host) {
    const status = FB.splitHostStatus(state, host);
    if (!status.ok) return null;
    const detachment = splitOffHost(state, host, status.targetMen);
    /* a fresh detachment stands until ordered — the automated stances never
       claim a host the player has not steered */
    detachment.holdManual = 1;
    FB.news(state, FB.msg('news.army.host_splits',
      '⚔ The host divides at {province} — {men} men under a second banner.',
      { province: provName(host.at), men: detachment.men }));
    return detachment;
  };

  /* the largest other host of the same realm standing with this one (both
     halted) — the merge partner the host card offers */
  FB.mergeableHost = function (state, host) {
    if (!host) return null;
    let best = null;
    for (const a of state.armies || []) {
      if (a === host || a.realm !== host.realm || a.at !== host.at) continue;
      if (a.moveLeft > 0 || (a.path && a.path.length)) continue;
      if (!best || a.men > best.men) best = a;
    }
    return best;
  };

  FB.mergeHosts = function (state, host, other) {
    if (!host || !other || host === other ||
        host.realm !== other.realm || host.at !== other.at) return null;
    const survivor = other.men > host.men ? other : host;
    const gone = survivor === host ? other : host;
    const survivorMen = survivor.men, goneMen = gone.men;
    const units = FB.hostUnits(survivor);
    const goneUnits = FB.hostUnits(gone);
    for (const key of FB.unitClassIds()) {
      units[key] = (units[key] || 0) + (goneUnits[key] || 0);
    }
    survivor.men = survivorMen + goneMen;
    survivor.size = Math.max(survivor.men,
      (survivor.size === undefined ? survivorMen : survivor.size) +
      (gone.size === undefined ? goneMen : gone.size));
    /* the carried supply stocks pool */
    survivor.supply = FB.clamp(Math.round(
      (FB.hostSupply(survivor) * survivorMen +
        FB.hostSupply(gone) * goneMen) / Math.max(1, survivor.men)), 0, 100);
    if (gone.allied && gone.allied.men) {
      if (survivor.allied && survivor.allied.ally === gone.allied.ally) {
        survivor.allied.men += gone.allied.men;
      } else if (!survivor.allied) {
        survivor.allied = gone.allied;
      }
    }
    disband(state, gone);
    if (selId === gone.id) selId = survivor.id;
    if (survivor.realm === 'player') {
      FB.news(state, FB.msg('news.army.hosts_merge',
        '⚔ The banners join at {province} — one host of {men} men.',
        { province: provName(survivor.at), men: survivor.men }));
    }
    requestMap();
    return survivor;
  };

  /* ---------- pathing (BFS over province adjacency) ----------
     Returns the route excluding the start, including the goal; null when
     unreachable. */
  FB.findPath = function (fromPid, toPid) {
    if (fromPid === toPid) return [];
    const adj = FB.world.adj;
    const prev = {}; prev[fromPid] = fromPid;
    const q = [fromPid];
    for (let qi = 0; qi < q.length; qi++) {
      const cur = q[qi];
      for (const nb in (adj[cur] || {})) {
        if (prev[nb] !== undefined) continue;
        prev[nb] = cur;
        if (nb === toPid) {
          const path = [toPid];
          let c = toPid;
          while (c !== fromPid) { c = prev[c]; if (c !== fromPid) path.unshift(c); }
          return path;
        }
        q.push(nb);
      }
    }
    return null;
  };

  function campaignMarchSpeed(state, realmId) {
    return realmId === 'player' && FB.campaignHostModBonus
      ? FB.campaignHostModBonus(state, 'marchSpeed') : 0;
  }

  FB.armyMarchDays = function (state, realmId) {
    const base = FB.techArmyMarchDays
      ? FB.techArmyMarchDays(state, realmId) : B().armyMarchDays;
    const speed = campaignMarchSpeed(state, realmId);
    return Math.max(1, Math.round(base / Math.max(0.05, 1 + speed)));
  };

  /* Future fleets can replace this seam without changing route or leg
     consumers. For now, national technology supplies transport capacity. */
  FB.armySeaTransportCapacity = function (state, realmId, fromPid, toPid) {
    return FB.techSeaTransportCapacity
      ? FB.techSeaTransportCapacity(state, realmId)
      : Math.max(1, Math.round(Number(B().armySeaTransportBase) || 250));
  };

  /* Leg-quote constants that stay fixed for a whole route search: march
     days, transport capacity and the sea/campaign speeds depend only on the
     realm's technology and modifiers, and the host's headcount cannot change
     mid-search either. A pathfind quotes thousands of edges, so these are
     computed once per search instead of once per edge (the fromPid/toPid
     seam of FB.armySeaTransportCapacity stays national — constant per
     route — until future fleets need it otherwise). */
  function legQuoteMemo(state, army) {
    return {
      crossings: B().armySeaCrossings || {},
      hostMen: Math.max(0, Math.round(Number(army && army.men) || 0)),
      landDays: FB.armyMarchDays(state, army.realm),
      nationalCapacity: Math.max(1, Math.round(Number(
        FB.armySeaTransportCapacity(state, army.realm, null, null)) || 1)),
      seaSpeed: FB.techBonus ? FB.techBonus(state, 'seaMovement', army.realm) : 0,
      campaignSpeed: campaignMarchSpeed(state, army.realm)
    };
  }

  function quoteFromMemo(memo, fromPid, toPid) {
    const crossingClass = FB.waterCrossing
      ? FB.waterCrossing(fromPid, toPid) : null;
    if (!crossingClass) {
      /* land legs pay the destination's terrain: the day-weighted route
         search then detours around mountains and mires on its own. Sea legs
         keep their crossing-class clock. */
      const landDays = Math.max(1, Math.round(memo.landDays *
        terrainMarchFactor(terrainOf(toPid))));
      return {
        water:false,
        crossingClass:null,
        hostMen:memo.hostMen,
        nationalCapacity:null,
        effectiveCapacity:null,
        cycles:1,
        cycleDays:landDays,
        totalDays:landDays
      };
    }
    const crossing = memo.crossings[crossingClass] || memo.crossings.narrow ||
      { cycleDays:2, capacityMult:2 };
    const effectiveCapacity = Math.max(1, Math.round(memo.nationalCapacity *
      Math.max(0.01, Number(crossing.capacityMult) || 1)));
    const cycles = Math.max(1, Math.ceil(memo.hostMen / effectiveCapacity));
    const cycleDays = Math.max(1, Math.round(
      Math.max(1, Number(crossing.cycleDays) || 1) *
      Math.max(0.05, 1 - memo.seaSpeed) /
      Math.max(0.05, 1 + memo.campaignSpeed)));
    return {
      water:true,
      crossingClass:crossingClass,
      hostMen:memo.hostMen,
      nationalCapacity:memo.nationalCapacity,
      effectiveCapacity:effectiveCapacity,
      cycles:cycles,
      cycleDays:cycleDays,
      totalDays:cycles * cycleDays
    };
  }

  FB.armyLegQuote = function (state, army, fromPid, toPid) {
    return quoteFromMemo(legQuoteMemo(state, army), fromPid, toPid);
  };

  function pathCompare(a, b) {
    const length = Math.min(a.length, b.length);
    for (let i = 0; i < length; i++) {
      if (a[i] < b[i]) return -1;
      if (a[i] > b[i]) return 1;
    }
    return a.length - b.length;
  }

  function routeCompare(a, b) {
    return a.totalDays - b.totalDays ||
      a.legs - b.legs ||
      pathCompare(a.path, b.path);
  }

  function frontierPush(frontier, item) {
    let index = frontier.length;
    frontier.push(item);
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (routeCompare(frontier[parent], item) <= 0) break;
      frontier[index] = frontier[parent];
      index = parent;
    }
    frontier[index] = item;
  }

  function frontierPop(frontier) {
    if (!frontier.length) return null;
    const first = frontier[0];
    const last = frontier.pop();
    if (!frontier.length) return first;
    let index = 0;
    while (true) {
      const left = index * 2 + 1, right = left + 1;
      if (left >= frontier.length) break;
      let child = left;
      if (right < frontier.length &&
          routeCompare(frontier[right], frontier[left]) < 0) child = right;
      if (routeCompare(last, frontier[child]) <= 0) break;
      frontier[index] = frontier[child];
      index = child;
    }
    frontier[index] = last;
    return first;
  }

  /* Per-world path caches: the adjacency graph never changes after world
     build, so the sorted neighbor lists the search walks and the
     reachability components that short-circuit impossible routes are built
     once and keyed on the world object itself (a new game replaces
     FB.world, which rebuilds both). */
  let pathCacheWorld = null;
  const pathCacheSorted = {};
  let pathCacheComp = null;
  function sortedNeighbors(adj, pid) {
    let list = pathCacheSorted[pid];
    if (!list) {
      list = Object.keys(adj[pid] || {}).sort();
      pathCacheSorted[pid] = list;
    }
    return list;
  }
  function pathComponents() {
    if (pathCacheWorld === FB.world && pathCacheComp) return pathCacheComp;
    pathCacheWorld = FB.world;
    for (const pid in pathCacheSorted) delete pathCacheSorted[pid];
    const adj = (FB.world && FB.world.adj) || {};
    /* Components over the symmetrized graph: no leg is ever blocked, so
       provinces in different components can never reach each other and the
       search below can be skipped outright (a same-component pair still
       runs the full search — the component map only ever vetoes). */
    const undirected = {};
    for (const pid in adj) {
      for (const nb in adj[pid]) {
        (undirected[pid] = undirected[pid] || {})[nb] = 1;
        (undirected[nb] = undirected[nb] || {})[pid] = 1;
      }
    }
    const comp = {};
    let label = 0;
    for (const pid in undirected) {
      if (comp[pid] !== undefined) continue;
      const stack = [pid];
      comp[pid] = label;
      while (stack.length) {
        const cur = stack.pop();
        for (const nb in undirected[cur]) {
          if (comp[nb] !== undefined) continue;
          comp[nb] = label;
          stack.push(nb);
        }
      }
      label++;
    }
    pathCacheComp = comp;
    return comp;
  }

  function findArmyPathFrom(state, army, fromPid, toPid, memo) {
    if (!FB.world || !FB.world.adj || !FB.world.adj[fromPid] ||
        !FB.world.adj[toPid]) return null;
    if (fromPid === toPid) return { path:[], totalDays:0, waterLegs:0 };
    const comp = pathComponents();
    if (comp[fromPid] !== comp[toPid]) return null;
    memo = memo || legQuoteMemo(state, army);
    const adj = FB.world.adj;
    const start = {
      pid:fromPid, path:[], totalDays:0, legs:0, waterLegs:0
    };
    const frontier = [], best = {}, blocked = [];
    best[fromPid] = start;
    frontierPush(frontier, start);
    while (frontier.length) {
      const current = frontierPop(frontier);
      if (best[current.pid] !== current) continue;
      if (current.pid === toPid) {
        const around = [];
        for (let blockedIndex = 0; blockedIndex < blocked.length; blockedIndex++) {
          const blockedPid = blocked[blockedIndex].blockedByFort;
          if (around.indexOf(blockedPid) < 0) around.push(blockedPid);
        }
        const reached = {
          path:current.path,
          totalDays:current.totalDays,
          waterLegs:current.waterLegs
        };
        if (FB.fortBlocksArmy && FB.fortBlocksArmy(state, toPid, army)) {
          reached.blockedByFort = toPid;
        } else if (around.length) {
          reached.routedAroundForts = around;
        }
        return reached;
      }
      const neighbors = sortedNeighbors(adj, current.pid);
      for (let i = 0; i < neighbors.length; i++) {
        const neighbor = neighbors[i];
        /* Wastelands are impassable scenery: never a route leg. The flag is
           read live so a county converted to real land during play (wasteland
           materialization) becomes passable without rebuilding the per-world
           path caches. */
        const neighborPr = FB.world.byId[neighbor];
        if (neighborPr && neighborPr.wasteland) continue;
        /* A host already pinned inside a hostile fortified county may leave
           only by its arrival edge or directly into friendly-controlled
           ground. Once clear, ordinary routing resumes. */
        if (current.pid === fromPid && FB.fortBlocksArmy &&
            FB.fortBlocksArmy(state, fromPid, army) &&
            neighbor !== army.from &&
            !(FB.armyFriendlyProvince &&
              FB.armyFriendlyProvince(state, army, neighbor))) continue;
        const quote = quoteFromMemo(memo, current.pid, neighbor);
        const candidate = {
          pid:neighbor,
          path:current.path.concat([neighbor]),
          totalDays:current.totalDays + quote.totalDays,
          legs:current.legs + 1,
          waterLegs:current.waterLegs + (quote.water ? 1 : 0)
        };
        /* A hostile fort is a legal destination but never an intermediate
           node. Remember the best encountered obstacle so a route with no
           bypass ends at the fort instead of pretending no march is
           possible. */
        if (neighbor !== toPid && FB.fortBlocksArmy &&
            FB.fortBlocksArmy(state, neighbor, army)) {
          candidate.blockedByFort = neighbor;
          blocked.push(candidate);
          continue;
        }
        if (!best[neighbor] || routeCompare(candidate, best[neighbor]) < 0) {
          best[neighbor] = candidate;
          frontierPush(frontier, candidate);
        }
      }
    }
    /* No legal bypass reached the requested province. Walk the unrestricted
       graph once to find the first fort on the shortest route to that actual
       destination; choosing the nearest encountered dead-end fort could send
       an order away from its intended road. The returned route still ends at
       the first strongpoint and never carries the host through it. */
    if (blocked.length) {
      const virtualStart = {
        pid:fromPid, path:[], totalDays:0, legs:0, waterLegs:0,
        firstFort:null, firstFortLength:0, firstFortDays:0,
        firstFortWaterLegs:0
      };
      const virtualFrontier = [], virtualBest = {};
      virtualBest[fromPid] = virtualStart;
      frontierPush(virtualFrontier, virtualStart);
      while (virtualFrontier.length) {
        const current = frontierPop(virtualFrontier);
        if (virtualBest[current.pid] !== current) continue;
        if (current.pid === toPid) {
          if (!current.firstFort) return null;
          return {
            path:current.path.slice(0, current.firstFortLength),
            totalDays:current.firstFortDays,
            waterLegs:current.firstFortWaterLegs,
            blockedByFort:current.firstFort
          };
        }
        const neighbors = sortedNeighbors(adj, current.pid);
        for (let i = 0; i < neighbors.length; i++) {
          const neighbor = neighbors[i];
          if (current.pid === fromPid && FB.fortBlocksArmy &&
              FB.fortBlocksArmy(state, fromPid, army) &&
              neighbor !== army.from &&
              !(FB.armyFriendlyProvince &&
                FB.armyFriendlyProvince(state, army, neighbor))) continue;
          const quote = quoteFromMemo(memo, current.pid, neighbor);
          const candidate = {
            pid:neighbor,
            path:current.path.concat([neighbor]),
            totalDays:current.totalDays + quote.totalDays,
            legs:current.legs + 1,
            waterLegs:current.waterLegs + (quote.water ? 1 : 0),
            firstFort:current.firstFort,
            firstFortLength:current.firstFortLength,
            firstFortDays:current.firstFortDays,
            firstFortWaterLegs:current.firstFortWaterLegs
          };
          if (!candidate.firstFort && FB.fortBlocksArmy &&
              FB.fortBlocksArmy(state, neighbor, army)) {
            candidate.firstFort = neighbor;
            candidate.firstFortLength = candidate.path.length;
            candidate.firstFortDays = candidate.totalDays;
            candidate.firstFortWaterLegs = candidate.waterLegs;
          }
          if (!virtualBest[neighbor] ||
              routeCompare(candidate, virtualBest[neighbor]) < 0) {
            virtualBest[neighbor] = candidate;
            frontierPush(virtualFrontier, candidate);
          }
        }
      }
    }
    return null;
  }

  FB.findArmyPath = function (state, army, toPid) {
    if (!army || !army.at || !toPid) return null;
    return findArmyPathFrom(state, army, army.at, toPid);
  };

  function routeCrossings(state, army, fromPid, path, memo) {
    const out = [];
    memo = memo || legQuoteMemo(state, army);
    let from = fromPid;
    for (let i = 0; i < path.length; i++) {
      const quote = quoteFromMemo(memo, from, path[i]);
      if (quote.water) {
        out.push({ from:from, to:path[i], routeIndex:i, quote:quote });
      }
      from = path[i];
    }
    return out;
  }

  function armyOrderPlan(state, army, destPid) {
    if (!destPid) return { ok:false, active:false, path:[] };
    if (destPid === army.at) {
      return {
        ok:true, halt:true, active:false, path:[], totalDays:0,
        waterLegs:0, crossings:[]
      };
    }
    /* one quote memo for the whole plan: the search, the fallback plan and
       the crossing report all describe the same unchanging host */
    const memo = legQuoteMemo(state, army);
    const route = findArmyPathFrom(state, army, army.at, destPid, memo);
    if (!route) return { ok:false, active:false, path:[] };

    return {
      ok:true,
      halt:false,
      active:false,
      path:route.path,
      goal:destPid,
      totalDays:route.totalDays,
      waterLegs:route.waterLegs,
      blockedByFort:route.blockedByFort || null,
      routedAroundForts:route.routedAroundForts || [],
      crossings:routeCrossings(state, army, army.at, route.path, memo)
    };
  }

  function beginArmyLeg(state, army) {
    if (!army.path || !army.path.length) return;
    army.from = army.at;
    army.moveLeft = FB.armyLegQuote(
      state, army, army.at, army.path[0]).totalDays;
  }

  /* A new movement order immediately overrides any previous destination and
     routes directly from the host's current position to the new goal. */
  FB.orderArmy = function (state, army, destPid, preparedPlan) {
    const plan = preparedPlan || armyOrderPlan(state, army, destPid);
    if (plan.halt) {
      army.path = []; army.goal = null; army.moveLeft = 0;
      requestMap();
      return true;
    }
    if (!plan.ok) {
      army.path = [];
      army.goal = null;
      army.moveLeft = 0;
      requestMap();
      return false;
    }
    army.path = plan.path.slice();
    army.goal = plan.goal;
    army.moveLeft = 0;
    beginArmyLeg(state, army);
    requestMap();
    return true;
  };

  /* ---------- the daily tick (called from G.passDay) ---------- */

  function march(state, army) {
    if (army.moveLeft > 0) {
      army.moveLeft--;
      if (army.moveLeft <= 0 && army.path && army.path.length) {
        // the leg completes: the host steps into the next province
        army.from = army.at;
        army.at = army.path.shift();
        if (FB.fortBlocksArmy && FB.fortBlocksArmy(state, army.at, army)) {
          /* Arrival is the moment the obstacle pins the host. A route saved
             before construction, conquest, or occupation cannot carry it
             through the strongpoint. */
          army.path = [];
          army.goal = null;
          army.moveLeft = 0;
        } else if (army.path.length) {
          beginArmyLeg(state, army);
        }
        requestMap();
      }
      return;
    }
    // standing with a route but no clock (old save): begin the next leg
    if (army.path && army.path.length) {
      beginArmyLeg(state, army);
    }
  }

  /* ---------- encirclement & retreat (docs/designs/war.md) ----------
     A host is cut off when no road home exists: every neighboring land
     county is hostile-held, enemy-occupied, or barred by a hostile
     unbreached fort, and every water crossing lies beyond one ferry cycle
     of the host's sea transport. A host shattered while cut off is
     destroyed outright and its leader stands a graver chance of capture
     (balance.captureChanceEncircled); a merely beaten one has nowhere to
     run and stands its ground. */

  function realmHostileTo(state, army, ownerId) {
    if (!ownerId) return false;
    const controller = ownerId === 'player' ? 'player'
      : (FB.topRealm ? FB.topRealm(state, ownerId) : ownerId);
    if (!controller || controller === army.realm) return false;
    return FB.armiesHostile(state, army, { realm: controller });
  }

  function enemyOccupied(state, army, pid) {
    const campaign = state.greatHolyWar;
    if (!campaign || campaign.phase !== 'active' ||
        !campaign.occupations || !FB.greatHolyWarCamp) return false;
    const occupation = campaign.occupations[pid];
    if (!occupation || !(occupation.progress || occupation.occupied)) return false;
    const camp = FB.greatHolyWarCamp(state, army.realm);
    const holdingCamp = occupation.occupied ? 'attackers' : occupation.progressCamp;
    return !!(camp && holdingCamp && camp !== holdingCamp);
  }

  FB.hostCutOff = function (state, army) {
    if (!army || !FB.world || !FB.world.adj) return false;
    const adj = FB.world.adj[army.at];
    if (!adj) return false;
    let sawNeighbor = false;
    let memo = null;
    for (const nb in adj) {
      sawNeighbor = true;
      if (FB.waterCrossing && FB.waterCrossing(army.at, nb)) {
        /* the sea is a road out only when one ferry cycle can carry the host */
        memo = memo || legQuoteMemo(state, army);
        const quote = quoteFromMemo(memo, army.at, nb);
        if (quote.effectiveCapacity >= Math.max(1, army.men)) return false;
        continue;
      }
      if (FB.armyFriendlyProvince &&
          FB.armyFriendlyProvince(state, army, nb)) return false;
      if (FB.fortBlocksArmy && FB.fortBlocksArmy(state, nb, army)) continue;
      if (realmHostileTo(state, army, state.owner && state.owner[nb])) continue;
      if (enemyOccupied(state, army, nb)) continue;
      return false; // neutral or unclaimed ground remains a road out
    }
    return sawNeighbor;
  };

  /* where a beaten host can actually run: home while the road is clear,
     else the nearest friendly county a legal march can reach (no hostile
     unbreached fort on the road), else null — it stands its ground */
  FB.armyRetreatGoal = function (state, army) {
    const home = army.realm === 'player' ? playerHome(state)
      : (state.realms[army.realm] ? state.realms[army.realm].capital : null);
    if (home === army.at) return army.at; // beaten on home ground: it stands
    if (home) {
      const direct = findArmyPathFrom(state, army, army.at, home);
      if (direct && !direct.blockedByFort) return home;
    }
    const adj = (FB.world && FB.world.adj) || {};
    if (!adj[army.at]) return null;
    const visited = {}; visited[army.at] = true;
    let frontier = sortedNeighbors(adj, army.at).slice();
    while (frontier.length) {
      for (const pid of frontier) {
        if (visited[pid]) continue;
        visited[pid] = true;
        if (!(FB.armyFriendlyProvince &&
              FB.armyFriendlyProvince(state, army, pid))) continue;
        if (FB.fortBlocksArmy && FB.fortBlocksArmy(state, pid, army)) continue;
        const route = findArmyPathFrom(state, army, army.at, pid);
        if (route && !route.blockedByFort) return pid;
      }
      const next = [];
      for (const pid of frontier) {
        for (const nb of sortedNeighbors(adj, pid)) {
          if (!visited[nb]) next.push(nb);
        }
      }
      frontier = next;
    }
    return null;
  };

  /* a host destroyed in the field: the primary host costs the realm its
     full rearm wait; a lost detachment re-forms after the shorter
     balance.detachmentRearmDays (tracked in state.armyDetachmentDown) */
  function noteHostDestroyed(state, host, wasPrimary) {
    /* Callers snapshot primary status before applying the fatal losses.
       FB.hostOf() repairs state.armies and therefore drops a zero-strength
       host; asking it afterwards would misclassify a wiped primary as a
       detachment and let the realm muster again on the following day. */
    if (wasPrimary) {
      state.armyDown[host.realm] = state.turn;
    } else {
      state.armyDetachmentDown = state.armyDetachmentDown || {};
      state.armyDetachmentDown[host.realm] = state.turn;
    }
  }

  /* what an AI host wants: run home when broken, hunt the nearest enemy
     host, else march on the enemy's seat. A detachment (any host but the
     realm's primary) leaves the hunting to the main body and makes for the
     enemy seat or the holy-war goal — screening and besieging while the
     main host fights. */
  function aiGoal(state, army, warring, primaryByRealm) {
    const r = state.realms[army.realm];
    if (!r) return army.at;
    if (army.broken !== undefined && state.turn - army.broken < 40) {
      return FB.armyRetreatGoal(state, army) || army.at;
    }
    if (FB.fortPinnedStatus && FB.fortPinnedStatus(state, army)) return army.at;
    const detachment = (primaryByRealm
      ? primaryByRealm[army.realm]
      : FB.hostOf(state, army.realm)) !== army;
    if (!detachment) {
      let best = null, bd = Infinity;
      const pa = FB.world.byId[army.at];
      for (const o of state.armies) {
        if (o === army || !FB.armiesHostile(state, army, o)) continue;
        const pb = FB.world.byId[o.at];
        if (!pa || !pb) continue;
        const d = (pa.cx - pb.cx) * (pa.cx - pb.cx) + (pa.cy - pb.cy) * (pa.cy - pb.cy);
        if (d < bd) { bd = d; best = o; }
      }
      if (best) return best.at;
    }
    if (FB.greatHolyWarCamp && FB.greatHolyWarCamp(state, army.realm) &&
        FB.greatHolyWarArmyGoal) {
      return FB.greatHolyWarArmyGoal(state, army.realm, army.at) || army.at;
    }
    const en = warring[army.realm];
    if (en === 'player') return playerHome(state);
    const er = en && state.realms[en];
    return er ? er.capital : army.at;
  }

  /* Manual host control is a hard boundary. It preserves a route issued by
     a map tap and a forced battlefield rout, but cancels council-event and
     automated routes, including unmarked routes saved by older versions. */
  FB.enforceManualHostControl = function (state) {
    if (!state || !FB.hostAutomationManual()) return;
    for (const host of state.armies || []) {
      if (host.realm !== 'player') continue;
      const forcedRetreat = host.broken !== undefined &&
        state.turn - host.broken < 40;
      const routeActive = host.moveLeft > 0 ||
        !!(host.path && host.path.length);
      const nonmanualRoute = host.eventOrder || host.automatedOrder ||
        (routeActive && !host.manual && !host.holdManual);
      host.huntPrey = null;
      delete host.autoResupply;
      if (nonmanualRoute && !forcedRetreat) {
        host.path = [];
        host.goal = null;
        host.moveLeft = 0;
        host.holdManual = 1;
        requestMap();
      }
      delete host.eventOrder;
      delete host.automatedOrder;
    }
  };

  function automatedResupplyGoal(state, host) {
    const auto = FB.game && FB.game.auto;
    if (!auto || auto.hostResupply === false) {
      delete host.autoResupply;
      return null;
    }
    const status = FB.hostSupplyStatus(state, host);
    const low = B().supplyLowThreshold === undefined
      ? 30 : B().supplyLowThreshold;
    if (host.autoResupply) {
      if (status.friendly) {
        if (status.supply >= low) {
          delete host.autoResupply;
          return null;
        }
        return host.at;
      }
      return FB.armyRetreatGoal(state, host) || host.at;
    }
    const weekLeft = status.daysToAttrition !== null &&
      status.daysToAttrition <= 7;
    if (!status.friendly && (status.supply <= 0 || weekLeft)) {
      host.autoResupply = 1;
      return FB.armyRetreatGoal(state, host) || host.at;
    }
    return null;
  }

  /* what an automated player host wants (G.auto.hosts, the ⚙ stances):
     limp home when broken; a defensive host stands at home unless an
     invader stands in the player's lands (the same ground the enemy-advance
     clock reads); an offensive host hunts the enemy host when it fancies
     the odds (the Prudent/Bold style sets how much of an edge it demands),
     marches on the war target when no host is fielded against it, and
     otherwise refits at home */
  function playerGoal(state, host, mode) {
    const p = state.player, w = p.war;
    const home = playerHome(state);
    if (host.broken !== undefined && state.turn - host.broken < 40) {
      return FB.armyRetreatGoal(state, host) || host.at;
    }
    const resupplyGoal = automatedResupplyGoal(state, host);
    if (resupplyGoal) return resupplyGoal;
    if (FB.fortPinnedStatus && FB.fortPinnedStatus(state, host)) return host.at;
    if (!w && FB.playerGreatHolyWarHostActive &&
        FB.playerGreatHolyWarHostActive(state) && FB.greatHolyWarArmyGoal) {
      return FB.greatHolyWarArmyGoal(state, 'player', host.at) || home;
    }
    if (!w) return host.at;
    const prey = FB.hostOf(state, w.enemy);
    if (mode === 'def') {
      if (prey && (prey.at === p.provinceId || (p.provs && p.provs.indexOf(prey.at) >= 0) ||
        (state.holder && state.holder[prey.at] === 'player'))) return prey.at;
      return home;
    }
    /* standing on the prize? Stay — the enemy comes to the siege, and
       leaving to chase him would stall the works (war_can_siege reads the
       ground the host stands on when the council meets) */
    if (!w.defending && w.target && state.owner[w.target] === w.enemy && host.at === w.target) {
      return w.target;
    }
    if (prey) {
      const style = FB.game.auto && FB.game.auto.style;
      const edge = style === 'bold' ? 0.85 : (style === 'safe' ? 1.3 : 1.1);
      return battlePower(state, host) >= battlePower(state, prey) * edge ? prey.at : home;
    }
    if (!w.defending && w.target && state.owner[w.target] === w.enemy) return w.target;
    return home;
  }

  /* role: 'defense' for the camp holding the ground, 'attack' otherwise
     (the default for neutral previews such as the automation odds check) */
  function battlePower(state, army, pid, role) {
    let pw;
    const bal = B();
    /* where the battle is joined, terrain multiplies each class
       (balance.terrainBattleFactors); callers without a location keep the
       terrain-neutral composition average */
    const terrain = pid ? terrainOf(pid) : null;
    const q = role
      ? FB.compRoleQuality(army.units, army.men, terrain, role)
      : (terrain
        ? FB.compTerrainQuality(army.units, army.men, terrain)
        : FB.compQuality(army.units, army.men)); // 1 for hosts from before levy tiers
    if (army.realm === 'player') {
      const me = state.chars[state.player.charId];
      pw = army.men * q * (1 + (me ? FB.skillOf(me, 'mar') : 5) / (B().battleMarPlayer || 14));
      // the standing edges — tech, holdings, items, the war blessing — carry onto the field
      pw *= 1 + FB.techBonus(state, 'battle') + FB.holdingBonus(state, 'battle') +
        FB.itemBonus(state, 'battle') +
        (FB.householdStandardEffect
          ? FB.householdStandardEffect(state, 'battle') : 0) +
        (state.player.flags.blessed_war ? 0.06 : 0);
      /* …and so does the campaign itself: condition (war.strength, fed by the
         wartime supply/discipline events), days spent leading the host, and a
         refit all tilt the real fight, matching the war card's estimate
         (namedChance 'war_battle'). war_win/war_loss spend led/rested. */
      const war = state.player.war;
      if (war) {
        pw *= war.strength || 1;
        pw *= 1 + Math.min(90, war.led || 0) / 90 * 0.1;
        if (war.rested) pw *= 1.05;
      }
      if (FB.campaignHostModBonus) {
        pw *= Math.max(0, 1 + FB.campaignHostModBonus(state, 'battleOdds'));
      }
    } else {
      const r = state.realms[army.realm];
      let martial = r && r.ruler ? r.ruler.mar : 5;
      const command = FB.activeMilitaryCommand(state);
      if (command && command.sovereignRealmId === army.realm) {
        const commander = state.chars[state.player.charId];
        martial = Math.max(martial, commander ? FB.skillOf(commander, 'mar') : 0);
      }
      pw = army.men * q * (1 + martial / (B().battleMarAI || 22));
      pw *= 1 + (FB.techBonus ? FB.techBonus(state, 'battle', army.realm) : 0);
    }
    if (pid && FB.fortBattleBonus) {
      pw *= 1 + FB.fortBattleBonus(state, pid, army);
    }
    /* a hungry host fights at a fraction of its strength */
    const supply = FB.hostSupply(army);
    const supplyLow = bal.supplyLowThreshold === undefined
      ? 30 : bal.supplyLowThreshold;
    if (supply <= 0) {
      pw *= bal.supplyStarvedPowerMult === undefined
        ? 0.75 : bal.supplyStarvedPowerMult;
    } else if (supply < supplyLow) {
      pw *= bal.supplyLowPowerMult === undefined
        ? 0.9 : bal.supplyLowPowerMult;
    }
    return pw;
  }

  /* Counter mechanics (docs/designs/war.md): each class's `counters` table
     fights it above its quality against the named enemy classes. A side's
     counter edge is the composition-weighted average of those multipliers
     against the enemy's composition shares, capped by
     balance.battleCounterMaxSwing so counters swing battles without
     overwhelming numbers and martial. */
  function battleCounterMultiplier(units, enemyUnits) {
    units = units || {};
    enemyUnits = enemyUnits || {};
    const swing = B().battleCounterMaxSwing === undefined
      ? 0.2 : B().battleCounterMaxSwing;
    let enemyTotal = 0;
    for (const key in enemyUnits) {
      enemyTotal += Math.max(0, Number(enemyUnits[key]) || 0);
    }
    if (enemyTotal <= 0) return 1;
    let bonus = 0, ownTotal = 0;
    for (const key in units) {
      const count = Math.max(0, Number(units[key]) || 0);
      if (!count) continue;
      ownTotal += count;
      const counters = (unitClassDef(key) || {}).counters || {};
      let per = 0;
      for (const enemyKey in counters) {
        const mult = Number(counters[enemyKey]);
        if (!isFinite(mult)) continue;
        per += (mult - 1) *
          (Math.max(0, Number(enemyUnits[enemyKey]) || 0) / enemyTotal);
      }
      bonus += count * per;
    }
    if (ownTotal <= 0 || !bonus) return 1;
    return 1 + FB.clamp(bonus / ownTotal, -Math.abs(swing), Math.abs(swing));
  }

  /* public surface for tests, tooling, and UI previews */
  FB.armyBattleCounterMultiplier = function (units, enemyUnits) {
    return battleCounterMultiplier(units, enemyUnits);
  };

  /* public surface for tests, tooling, and UI previews; role is 'defense'
     for the camp holding the ground, 'attack' (or omitted) otherwise */
  FB.armyBattlePower = function (state, army, pid, role) {
    return battlePower(state, army, pid, role);
  };

  /* a field win/loss in an AI-vs-AI war tilts that war's yearly resolution */
  function trackAIWar(state, winnerSov, loserSov) {
    const rw = state.realms[winnerSov];
    if (rw && rw.war && rw.war.enemy === loserSov) { rw.war.fw = (rw.war.fw || 0) + 1; return; }
    const rl = state.realms[loserSov];
    if (rl && rl.war && rl.war.enemy === winnerSov) rl.war.fl = (rl.war.fl || 0) + 1;
  }

  /* the largest host of a side speaks for it (realm attribution, command
     hooks, news names); ties break on id so the pick never depends on scan
     order beyond the deterministic army list */
  function leadHost(side) {
    let lead = side[0];
    for (let i = 1; i < side.length; i++) {
      if (side[i].men > lead.men) lead = side[i];
    }
    return lead;
  }

  function sideMen(side) {
    let men = 0;
    for (const host of side) men += host.men;
    return men;
  }

  function sideUnits(side) {
    const pooled = emptyUnitCounts();
    for (const host of side) {
      const units = FB.hostUnits(host);
      for (const key of FB.unitClassIds()) {
        pooled[key] += Math.max(0, Number(units[key]) || 0);
      }
    }
    return pooled;
  }

  function sideHasRealm(side, rid) {
    for (const host of side) if (host.realm === rid) return true;
    return false;
  }

  /* spread a side's casualties across its hosts in proportion to their men;
     the lead host absorbs the rounding drift. Returns the pooled per-class
     losses (with .total) for the war ledger. Slain professionals enter each
     host realm's replacement cohort. */
  function spreadLosses(state, side, total) {
    const aggregate = emptyUnitCounts();
    aggregate.total = 0;
    const men = sideMen(side);
    if (!men || total <= 0) return aggregate;
    let assigned = 0;
    for (let i = 0; i < side.length; i++) {
      const host = side[i];
      const share = i === side.length - 1
        ? total - assigned
        : Math.round(total * host.men / men);
      assigned += Math.max(0, share);
      const losses = FB.applyHostLosses(host, Math.max(0, share));
      FB.noteCohortLosses(state, host.realm, losses);
      for (const key of FB.unitClassIds()) aggregate[key] += losses[key] || 0;
      aggregate.total += losses.total;
    }
    return aggregate;
  }

  /* One clash per province per day between two camps (docs/designs/war.md):
     every unbroken host of each camp fights — side power is the sum of its
     hosts' terrain-aware battle power, counter edges read the pooled
     compositions, and losses spread across the side. The loser side's hosts
     rout singly toward a reachable friendly county; a host ground below
     balance.armyMinMen shatters, and one shattered while cut off
     (FB.hostCutOff) is destroyed outright. */
  function resolveBattle(state, pid, sideA, sideB) {
    /* Personal consequences follow the main banner, not every detachment.
       Snapshot it before casualties can change which surviving host is the
       realm's largest. */
    const primaryPlayerHost = FB.playerHost ? FB.playerHost(state) : null;
    /* the camp holding the ground — every host standing, no march in
       progress — defends it and gains the terrain's home-ground bonus
       (balance.terrainDefenseBonus); when both stand or both march, the
       saved coin picks the defender */
    const defense = terrainDefenseBonus(terrainOf(pid));
    let defender = null;
    if (defense > 0) {
      const aStanding = sideA.every(function (h) {
        return !(h.moveLeft > 0) && !(h.path && h.path.length);
      });
      const bStanding = sideB.every(function (h) {
        return !(h.moveLeft > 0) && !(h.path && h.path.length);
      });
      defender = aStanding !== bStanding ? (aStanding ? sideA : sideB)
        : (FB.rng() < 0.5 ? sideA : sideB);
    }
    const unitsA = sideUnits(sideA), unitsB = sideUnits(sideB);
    let powerA = 0, powerB = 0;
    /* the defender's classes read their defense values, the attacker's their
       attack values; a meeting engagement on open ground (no home-ground
       terrain bonus, no defender) reads attack for both camps */
    const roleA = defender === sideA ? 'defense' : 'attack';
    const roleB = defender === sideB ? 'defense' : 'attack';
    for (const h of sideA) powerA += battlePower(state, h, pid, roleA);
    for (const h of sideB) powerB += battlePower(state, h, pid, roleB);
    const sa = powerA * battleCounterMultiplier(unitsA, unitsB) *
      (defender === sideA ? 1 + defense : 1) * FB.rf(0.75, 1.25);
    const sb = powerB * battleCounterMultiplier(unitsB, unitsA) *
      (defender === sideB ? 1 + defense : 1) * FB.rf(0.75, 1.25);
    const winnerSide = sa >= sb ? sideA : sideB;
    const loserSide = sa >= sb ? sideB : sideA;
    /* Fatal losses may reduce a banner to zero, at which point hostOf()
       removes it during repair. Preserve each losing realm's primary before
       casualties so destruction starts the correct rearm clock. */
    const primaryBeforeLosses = {};
    for (const host of loserSide) {
      if (!Object.prototype.hasOwnProperty.call(primaryBeforeLosses,
          host.realm)) {
        primaryBeforeLosses[host.realm] = FB.hostOf(state, host.realm);
      }
    }
    const winner = leadHost(winnerSide), loser = leadHost(loserSide);
    const winnerBefore = sideMen(winnerSide), loserBefore = sideMen(loserSide);
    const sw = Math.max(sa, sb), sl = Math.min(sa, sb);
    const powerRatio = sw / Math.max(1, sl);
    const numRatio = winnerBefore / Math.max(1, loserBefore);
    const isStackWipe = powerRatio >= 2.0 || numRatio >= 2.5;

    let loserLoss;
    let winnerLoss;

    if (isStackWipe) {
      // Overrun / Stack Wipe
      loserLoss = loserBefore;
      const winRatio = Math.min(1, sl / sw);
      winnerLoss = Math.min(
        Math.round(winnerBefore * (B().battleWinLoss || 0.28) * Math.pow(winRatio, 2)),
        Math.max(1, Math.round(loserBefore * 0.12))
      );
    } else {
      const ratio = FB.clamp(sl / sw, 0.2, 1);
      const baseLoseLoss = B().battleLoseLoss || 0.62;
      const loserLossRate = FB.clamp(
        baseLoseLoss + 0.36 * Math.max(0, (powerRatio - 1.2) / 0.8),
        baseLoseLoss, 0.98
      );
      loserLoss = Math.round(loserBefore * loserLossRate);
      const rawWinnerLoss = Math.round(winnerBefore * (B().battleWinLoss || 0.28) * ratio);
      winnerLoss = Math.min(rawWinnerLoss, Math.max(1, Math.round(loserBefore * 0.45 * ratio)));
    }

    const winnerLosses = spreadLosses(state, winnerSide, winnerLoss);
    for (const h of winnerSide) if (h.men < 1) h.men = 1;
    const loserLosses = spreadLosses(state, loserSide, loserLoss);
    const pInvolved = sideHasRealm(winnerSide, 'player') ||
      sideHasRealm(loserSide, 'player');
    const playerWon = pInvolved && sideHasRealm(winnerSide, 'player');
    const playerSide = pInvolved ? (playerWon ? winnerSide : loserSide) : null;
    const enemySide = pInvolved ? (playerWon ? loserSide : winnerSide) : null;
    /* the war blessing's edge applied through battlePower above — a real
       battle roll spends it, as the event battle rolls always did */
    if (pInvolved && state.player.flags && state.player.flags.blessed_war) {
      delete state.player.flags.blessed_war;
    }
    const primaryHostInvolved = !!(primaryPlayerHost && playerSide &&
      playerSide.indexOf(primaryPlayerHost) >= 0);
    // the beaten camp routs for home — or disperses entirely
    const minMen = B().armyMinMen || 40;
    let primaryPlayerShatteredCutOff = false;
    for (const host of loserSide.slice()) {
      if (isStackWipe || host.men < minMen) {
        const cutOff = FB.hostCutOff(state, host);
        if (host === primaryPlayerHost && cutOff) {
          primaryPlayerShatteredCutOff = true;
        }
        const name = host.realm === 'player'
          ? null
          : (state.realms[host.realm] ? state.realms[host.realm].name : '');
        if (isStackWipe) {
          if (host.realm === 'player' ||
              (state.player.war && state.player.war.enemy === host.realm)) {
            FB.news(state, host.realm === 'player'
              ? FB.msg('news.army.host_wiped_out',
                '⚔ Overwhelmed and overrun — the host at {province} is shattered and destroyed completely.',
                { province: provName(host.at) })
              : FB.msg('news.army.enemy_wiped_out',
                '⚔ Overwhelmed and overrun — the host of {realm} at {province} is shattered and destroyed completely.',
                { realm: name, province: provName(host.at) }));
          }
        } else if (cutOff && (host.realm === 'player' ||
            (state.player.war && state.player.war.enemy === host.realm))) {
          FB.news(state, host.realm === 'player'
            ? FB.msg('news.army.host_destroyed_encircled',
              '⚔ Cut off with no road home — the host at {province} is destroyed to a man.',
              { province: provName(host.at) })
            : FB.msg('news.army.enemy_destroyed_encircled',
              '⚔ Cut off with no road home — the host of {realm} at {province} is destroyed to a man.',
              { realm: name, province: provName(host.at) }));
        }
        noteHostDestroyed(state, host,
          primaryBeforeLosses[host.realm] === host);
        disband(state, host);
      } else {
        // Rout attrition: panicked retreat loses baggage and supplies
        host.supply = Math.max(0, (FB.hostSupply(host) || 100) - 50);
        host.broken = state.turn;
        const retreat = FB.armyRetreatGoal(state, host);
        if (retreat && retreat !== host.at) {
          FB.orderArmy(state, host, retreat);
        } else {
          // Nowhere to retreat: cornered and unable to flee
          const cutOff = FB.hostCutOff(state, host);
          if (cutOff) {
            if (host === primaryPlayerHost) primaryPlayerShatteredCutOff = true;
            const name = host.realm === 'player'
              ? null
              : (state.realms[host.realm] ? state.realms[host.realm].name : '');
            FB.news(state, host.realm === 'player'
              ? FB.msg('news.army.host_destroyed_cornered',
                '⚔ Cornered with nowhere to retreat — the host at {province} is destroyed.',
                { province: provName(host.at) })
              : FB.msg('news.army.enemy_destroyed_cornered',
                '⚔ Cornered with nowhere to retreat — the host of {realm} at {province} is destroyed.',
                { realm: name, province: provName(host.at) }));
            noteHostDestroyed(state, host,
              primaryBeforeLosses[host.realm] === host);
            disband(state, host);
          } else {
            host.path = []; host.goal = null; host.moveLeft = 0;
          }
        }
      }
    }
    if (winner.realm !== 'player') {
      FB.noteMilitaryCommandVictory(state, winner, loser, pid);
    }
    const greatBattle = FB.greatHolyWarBattle &&
      FB.greatHolyWarBattle(state, pid, winner, loser,
        winnerLosses.total, loserLosses.total, {
          playerInvolved:pInvolved,
          primaryHostInvolved:primaryHostInvolved,
          won:playerWon,
          enemyId:enemySide ? leadHost(enemySide).realm : null
        });
    if (greatBattle) {
      /* Coalition resolve and contribution are owned by holywar.js. An
         ordinary bilateral war (if malformed legacy state supplied one)
         must not also resolve this battle. */
    } else if (pInvolved) {
      const steel = sideUnits(playerSide).ret > 0;
      /* Only the main banner produces a blocking, protagonist-facing report.
         Detached actions still score the war and enter the campaign ledger
         through war_win/war_loss below. */
      const enemyId = state.player.war && state.player.war.enemy ||
        leadHost(enemySide).realm;
      if (primaryHostInvolved) {
        /* The outcome handler may end the war immediately. Freeze the opposing
           realm on the historical report before that state disappears. */
        FB.queueEvent(state,
          (playerWon ? 'field_battle_won' : 'field_battle_lost') + (steel ? '_steel' : ''),
          { pid:pid, enemyId:enemyId });
      }
      const battleContext = { battleRecord:{
        turn:state.turn, outcome:playerWon ? 'win' : 'loss', mode:'field', pid:pid,
        primaryHostInvolved:primaryHostInvolved,
        playerBefore:playerWon ? winnerBefore : loserBefore,
        playerAfter:sideMen(playerSide),
        enemyBefore:playerWon ? loserBefore : winnerBefore,
        enemyAfter:sideMen(enemySide),
        playerLosses:playerWon ? winnerLosses : loserLosses,
        enemyLosses:playerWon ? loserLosses : winnerLosses,
        encircled:primaryPlayerShatteredCutOff
      }};
      if (playerWon) FB.fns.war_win(state, battleContext);
      else FB.fns.war_loss(state, battleContext);
    } else {
      trackAIWar(state, winner.realm, loser.realm);
      const p = state.player;
      const wname = state.realms[winner.realm] ? state.realms[winner.realm].name : winner.realm;
      const lname = state.realms[loser.realm] ? state.realms[loser.realm].name : loser.realm;
      if (FB.game.observe || pid === p.provinceId || (FB.world.adj[p.provinceId] || {})[pid]) {
        FB.news(state, FB.msg('news.army.ai_battle',
          '⚔ Battle at {province} — {winner} breaks the host of {loser}.',
          { province: provName(pid), winner: wname, loser: lname }));
      }
    }
    requestMap();
  }

  /* ---------- supply lines (docs/designs/war.md) ----------
     Every host carries 0–100 supply. On friendly ground — its own, its
     sovereign's, or allied land (FB.armyFriendlyProvince) — it refills at
     balance.supplyRecoverRate, faster beside a friendly fort and slower on
     a war-worn county. Abroad it drains at balance.supplyDrainBase scaled by
     the terrain crossed, winter, and the depth of the march past the
     friendly frontier (one reverse-BFS distance map per host realm, retained
     until its friendly origins change). At 0 supply the host starves:
     balance.supplyAttritionPerDay of
     its men melt away daily and it fights at balance.supplyStarvedPowerMult.
     A besieging host pinned on hostile ground simply drains at the foreign
     rate — the siege's own seasonal attrition is unchanged, never doubled.
     AI hosts follow the same rules through this one path. */

  /* Friendly supply origins change only with territorial/hierarchy mutations
     or alliances. Retain their reverse-BFS maps across ordinary days instead
     of rebuilding the same world-wide distance field for every host realm on
     every day of a fast-forward. */
  let supplyCacheState = null;
  let supplyCacheRealmRevision = -1;
  let supplyCacheAllianceSignature = '';
  let supplyCacheMaps = {};

  function supplyAllianceSignature(state) {
    if (FB.repairAlliances) FB.repairAlliances(state);
    const alliances = state && Array.isArray(state.alliances)
      ? state.alliances : [];
    const parts = [];
    for (let i = 0; i < alliances.length; i++) {
      const alliance = alliances[i];
      if (!alliance) continue;
      parts.push([
        alliance.a || '', alliance.b || '', alliance.aGen || 0,
        alliance.bGen || 0
      ].join(':'));
    }
    return parts.join('|');
  }

  function retainedSupplyDistanceMaps(state) {
    const realmRevision = FB.realmStateRevision
      ? FB.realmStateRevision() : state.turn;
    const allianceSignature = supplyAllianceSignature(state);
    if (supplyCacheState !== state ||
        supplyCacheRealmRevision !== realmRevision ||
        supplyCacheAllianceSignature !== allianceSignature) {
      supplyCacheState = state;
      supplyCacheRealmRevision = realmRevision;
      supplyCacheAllianceSignature = allianceSignature;
      supplyCacheMaps = {};
    }
    return supplyCacheMaps;
  }

  /* counties-from-friendly-land for the host's realm; one retained map per
     realm, shared by every same-realm host */
  function supplyDistanceMap(state, army, distCache) {
    const adj = (FB.world && FB.world.adj) || {};
    let map = distCache[army.realm];
    if (map) return map;
    map = distCache[army.realm] = {};
    const frontier = [];
    for (const pid in adj) {
      if (FB.armyFriendlyProvince && FB.armyFriendlyProvince(state, army, pid)) {
        map[pid] = 0;
        frontier.push(pid);
      }
    }
    for (let i = 0; i < frontier.length; i++) {
      const cur = frontier[i], next = map[cur] + 1;
      for (const nb in (adj[cur] || {})) {
        if (map[nb] === undefined) { map[nb] = next; frontier.push(nb); }
      }
    }
    return map;
  }

  function supplyDistance(state, army, distCache) {
    const adj = (FB.world && FB.world.adj) || {};
    if (!adj[army.at]) return 0;
    const d = supplyDistanceMap(state, army, distCache || {})[army.at];
    return d === undefined ? 0 : d;
  }

  /* the day's drain on neutral or hostile ground (0 on friendly land) */
  function supplyDrainPerDay(state, army, distCache) {
    if (FB.armyFriendlyProvince && FB.armyFriendlyProvince(state, army, army.at)) {
      return 0;
    }
    const bal = B();
    const base = bal.supplyDrainBase === undefined ? 1.2 : bal.supplyDrainBase;
    const winter = state.date && state.date.season === 3; // FB.SEASONS[3]
    const winterMult = winter
      ? (bal.supplyWinterDrainMult === undefined ? 1.5 : bal.supplyWinterDrainMult)
      : 1;
    const depth = bal.supplyDistanceDepth === undefined
      ? 0.25 : bal.supplyDistanceDepth;
    const tech = FB.techBonus ? FB.techBonus(state, 'supply', army.realm) : 0;
    return Math.max(0, base * terrainDrainFactor(terrainOf(army.at)) *
      winterMult * (1 + depth * supplyDistance(state, army, distCache)) *
      (1 - tech));
  }

  /* the day's refill on friendly ground */
  function supplyRecoverPerDay(state, army) {
    const bal = B();
    let rate = bal.supplyRecoverRate === undefined ? 3 : bal.supplyRecoverRate;
    if (FB.fortAt && FB.fortAt(state, army.at)) {
      rate *= bal.supplyFortRecoverMult === undefined
        ? 1.5 : bal.supplyFortRecoverMult;
    }
    /* a war-worn county (development beaten below its bookmark baseline)
       resupplies poorly, floored at supplyDevastatedRecoverFloor */
    const pr = FB.world && FB.world.byId ? FB.world.byId[army.at] : null;
    if (pr && pr.dev0 && state.dev && state.dev[army.at] !== undefined) {
      rate *= FB.clamp(state.dev[army.at] / pr.dev0,
        bal.supplyDevastatedRecoverFloor === undefined
          ? 0.4 : bal.supplyDevastatedRecoverFloor,
        1);
    }
    rate *= 1 + (FB.techBonus ? FB.techBonus(state, 'supply', army.realm) : 0);
    return rate;
  }

  /* one host's day of supply: refill on friendly land, drain and starve
     abroad. The player hears the news once, on the day the well runs dry. */
  function supplyTickHost(state, army, distCache) {
    const bal = B();
    const wasStarving = FB.hostSupply(army) <= 0;
    const drain = supplyDrainPerDay(state, army, distCache);
    if (drain <= 0) {
      army.supply = Math.min(100, army.supply + supplyRecoverPerDay(state, army));
      return;
    }
    army.supply = Math.max(0, army.supply - drain);
    if (army.supply > 0) return;
    if (army.men > 0) {
      const wasPrimary = FB.hostOf(state, army.realm) === army;
      const rate = bal.supplyAttritionPerDay === undefined
        ? 0.01 : bal.supplyAttritionPerDay;
      const losses = FB.applyHostLosses(army,
        Math.max(1, Math.round(army.men * Math.max(0, rate))));
      FB.noteCohortLosses(state, army.realm, losses);
      if (army.realm === 'player' && FB.notePlayerWarTroopLosses) {
        FB.notePlayerWarTroopLosses(state, losses);
      }
      requestMap();
      /* hunger finishes what battle would: a host ground below the minimum
         disperses — a shattered primary waits out the full rearm clock, a
         lost detachment the shorter detachmentRearmDays */
      if (army.men < (bal.armyMinMen || 40)) {
        noteHostDestroyed(state, army, wasPrimary);
        if (army.realm === 'player') {
          FB.news(state, FB.msg('news.army.host_scatters',
            '🥀 Hunger scatters the starving host at {province} — the survivors slip home.',
            { province: provName(army.at) }));
        }
        disband(state, army);
        return;
      }
    }
    if (army.realm === 'player' && !wasStarving) {
      FB.news(state, FB.msg('news.army.host_starving',
        '🥀 The host at {province} has exhausted its supplies — hunger thins its ranks daily until it reaches friendly land.',
        { province: provName(army.at) }));
    }
  }

  /* the Land tab / war status readout */
  FB.hostSupplyStatus = function (state, army) {
    if (!army) return null;
    const bal = B();
    const supply = FB.hostSupply(army);
    const low = bal.supplyLowThreshold === undefined ? 30 : bal.supplyLowThreshold;
    const friendly = !!(FB.armyFriendlyProvince &&
      FB.armyFriendlyProvince(state, army, army.at));
    let daysToAttrition = null;
    if (!friendly && supply > 0) {
      const drain = supplyDrainPerDay(state, army, {});
      if (drain > 0) daysToAttrition = Math.ceil(supply / drain);
    }
    return {
      supply: supply,
      status: supply <= 0 ? 'starving' : (supply < low ? 'low' : 'good'),
      friendly: friendly,
      daysToAttrition: daysToAttrition
    };
  };

  FB.armyTick = function (state) {
    FB.armiesEnsure(state);
    const p = state.player;
    let militaryCommand = null;
    if (p.militaryCommand) {
      militaryCommand = FB.activeMilitaryCommand(state);
      if (!militaryCommand) FB.endMilitaryCommand(state);
    }
    const sovereignIds = sovereignRealmIds(state);
    const warring = warringMap(state, sovereignIds);
    /* read once per tick: nothing in the raise/disband/order steps below
       mutates the pledge, the campaign, or the player's sovereignty */
    const playerGhwHost = !!(FB.playerGreatHolyWarHostActive &&
      FB.playerGreatHolyWarHostActive(state));
    let anyWar = false;
    for (const warringRealm in warring) {
      if (warring[warringRealm]) { anyWar = true; break; }
    }
    /* In peacetime there is no host to raise, order, supply, reinforce, or
       match for battle. Replacement cohorts still mature on their exact day,
       but the rest of the field-army pipeline is pure no-op work. */
    if (!state.armies.length && !anyWar && !playerGhwHost) {
      cohortTick(state);
      return;
    }
    const hostsByRealm = {};
    for (const a of state.armies) {
      (hostsByRealm[a.realm] = hostsByRealm[a.realm] || []).push(a);
      if (a.allied && a.allied.men) {
        const current = FB.alliedReinforcement
          ? FB.alliedReinforcement(state, a.realm) : { ally: null, men: 0 };
        if (current.ally !== a.allied.ally || !current.men) {
          FB.hostUnits(a);
          const gone = Math.min(a.allied.men, a.units.levy || 0, a.men);
          a.units.levy -= gone;
          a.men -= gone;
          a.size = Math.max(a.men, (a.size || a.men) - gone);
          a.allied = null;
          requestMap();
        }
      }
    }

    // sovereigns at war raise their host (the player musters by deed/event)
    for (let sovereignIndex = 0; sovereignIndex < sovereignIds.length;
        sovereignIndex++) {
      const id = sovereignIds[sovereignIndex];
      const r = state.realms[id];
      if (!warring[id] || (hostsByRealm[id] && hostsByRealm[id].length)) continue;
      const down = state.armyDown[id];
      if (down !== undefined && state.turn - down < B().armyRearmDays) continue;
      const raised = raiseAIHost(state, id);
      if (raised) hostsByRealm[id] = [raised];
    }

    /* strong aggressors divide their strength: a realm whose muster clears
       balance.aiMultiHostStrength splits off a detachment (capped by
       balance.aiMaxHosts) while it prosecutes an offensive war — the main
       host hunts, the second banner screens and besieges. A destroyed
       detachment re-forms only after balance.detachmentRearmDays. */
    const aiMaxHosts = B().aiMaxHosts === undefined ? 2 : B().aiMaxHosts;
    const multiStrength = B().aiMultiHostStrength === undefined
      ? Infinity : B().aiMultiHostStrength;
    const detachmentFrac = B().aiDetachmentFrac === undefined
      ? 0.35 : B().aiDetachmentFrac;
    const detachmentRearm = B().detachmentRearmDays === undefined
      ? 25 : B().detachmentRearmDays;
    const minMen = B().armyMinMen || 40;
    for (let sovereignIndex = 0; sovereignIndex < sovereignIds.length;
        sovereignIndex++) {
      const id = sovereignIds[sovereignIndex];
      const r = state.realms[id];
      const hosts = hostsByRealm[id];
      if (!warring[id] || !hosts || hosts.length !== 1 ||
          hosts.length >= aiMaxHosts ||
          (militaryCommand &&
            id === militaryCommand.sovereignRealmId)) continue;
      const offensive = !!(r.war && r.war.enemy) ||
        (FB.greatHolyWarCamp && FB.greatHolyWarCamp(state, id) === 'attackers');
      if (!offensive) continue;
      const detachDown = (state.armyDetachmentDown || {})[id];
      if (detachDown !== undefined &&
          state.turn - detachDown < detachmentRearm) continue;
      if (FB.aiBaseHost(state, id) < multiStrength) continue;
      const primary = hosts[0];
      if (primary.broken !== undefined) continue; // a routed host does not divide
      const target = Math.round(primary.men * detachmentFrac);
      if (target < minMen || primary.men - target < minMen) continue;
      const detachment = splitOffHost(state, primary, target);
      hosts.push(detachment);
      if (state.player.war && state.player.war.enemy === id) {
        FB.news(state, FB.msg('news.army.enemy_divides',
          '🚩 {realm} divides its strength — a second host takes the field.',
          { realm: r.name }));
      }
    }

    // peace: hosts go home — this one rule covers every way a war can end
    for (let i = state.armies.length - 1; i >= 0; i--) {
      const a = state.armies[i];
      if (a.realm === 'player') {
        if (!p.war && !playerGhwHost) {
          disband(state, a);
          FB.news(state, FB.msg('news.army.disbands',
            '🏳 The war is done — the host disbands to hearth and field.', {}));
        }
        continue;
      }
      const r = state.realms[a.realm];
      if (!r || !r.alive || !warring[a.realm]) disband(state, a);
    }

    // orders & marches
    const autoHosts = FB.game.auto && FB.game.auto.hosts;
    if (!autoHosts || autoHosts === 'manual') {
      FB.enforceManualHostControl(state);
    }
    // automated command re-raises a destroyed host once the rearm window passes
    if (autoHosts && autoHosts !== 'manual' &&
        (p.war || playerGhwHost) &&
        !(hostsByRealm['player'] && hostsByRealm['player'].length)) {
      FB.raisePlayerHost(state);
    }
    /* One primary lookup table replaces hostOf() per AI banner. hostOf()
       repairs and scans the complete army list, which made multi-host wars
       quadratic before the orders phase had even considered a route. */
    const primaryByRealm = {};
    for (const army of state.armies) {
      const primary = primaryByRealm[army.realm];
      if (!primary || army.men > primary.men) {
        primaryByRealm[army.realm] = army;
      }
    }
    /* Choose every host's order against the same start-of-day positions.
       Marching inside this loop made the result depend on array order: an AI
       banner processed after the player could see the county the player had
       just entered, retarget across one adjacent leg, and join a battle in
       that same tick. */
    for (const a of state.armies) {
      if (a.path && a.path.length && FB.fortBlocksArmy &&
          FB.fortBlocksArmy(state, a.at, a) &&
          a.path[0] !== a.from &&
          !(FB.armyFriendlyProvince &&
            FB.armyFriendlyProvince(state, a, a.path[0]))) {
        /* Save repair or a control change can make a once-valid onward leg
           stale while the host is already standing inside the fort. */
        a.path = [];
        a.goal = null;
        a.moveLeft = 0;
      }
      const commandedByPlayer = !!(militaryCommand &&
        a.realm === militaryCommand.sovereignRealmId &&
        (!militaryCommand.hostId || a.id === militaryCommand.hostId));
      if (a.realm !== 'player' && !commandedByPlayer) {
        const goal = aiGoal(state, a, warring, primaryByRealm);
        if (goal !== a.goal || ((!a.path || !a.path.length) && goal !== a.at && a.moveLeft <= 0)) {
          FB.orderArmy(state, a, goal);
        }
      } else if (a.realm === 'player' && autoHosts &&
          autoHosts !== 'manual') {
        /* automated command: the stance steers only an idle host — a route
           tapped by hand (a.manual) plays out untouched, a hand-halted host
           (a.holdManual) holds, and the council's hunt is superseded */
        a.huntPrey = null;
        if (a.manual && !(a.path && a.path.length) && a.moveLeft <= 0) a.manual = 0;
        if (!a.holdManual && !a.manual) {
          const pgoal = playerGoal(state, a, autoHosts);
          if (pgoal !== a.goal || ((!a.path || !a.path.length) && pgoal !== a.at && a.moveLeft <= 0)) {
            if (FB.orderArmy(state, a, pgoal)) a.automatedOrder = 1;
          }
        }
      } else if (a.huntPrey) {
        // a hunting host tracks its prey day by day, not where it was —
        // looked up live, since the disband loop above may have removed it
        const prey = FB.hostOf(state, a.huntPrey);
        if (!prey || !FB.armiesHostile(state, a, prey)) a.huntPrey = null;
        else if (prey.at !== a.goal) FB.orderArmy(state, a, prey.at);
      }
    }
    /* Only after all orders are fixed do hosts advance. The battle scan below
       therefore sees genuine end-of-day co-location; adjacency alone never
       creates contact. */
    for (const a of state.armies) march(state, a);

    /* Campaign desertion is expressed as a seasonal fraction but resolved
       daily. Fractional expected losses use the saved RNG stream. */
    const playerHost = FB.playerHost(state);
    const desertion = playerHost && FB.campaignHostModBonus
      ? Math.max(0, FB.campaignHostModBonus(state, 'desertion')) : 0;
    if (playerHost && playerHost.men > 0 && desertion) {
      const expected = playerHost.men * desertion / 90;
      let lost = Math.floor(expected);
      const fraction = expected - lost;
      if (fraction > 0 && FB.rng() < fraction) lost++;
      if (lost > 0) {
        const deserters = FB.applyHostLosses(playerHost,
          Math.min(playerHost.men, lost));
        FB.noteCohortLosses(state, 'player', deserters);
        requestMap();
      }
    }

    // levies trickle back while a host rests on its sovereign's own land —
    // fresh peasants from the fields; slain professionals return only as
    // drilled cohort replacements, which claim the room first
    cohortTick(state);
    let reinforcementChanged = false;
    let reinforcementCompleted = false;
    for (const a of state.armies) {
      if (a.size === undefined) a.size = a.men; // hosts from before ranks refilled
      FB.hostUnits(a); // hosts from before levy tiers
      if (a.men >= a.size || a.moveLeft > 0) continue;
      // a starving host eats before it fills its ranks
      if (FB.hostSupply(a) <= 0) continue;
      const own = FB.armyFriendlyProvince
        ? FB.armyFriendlyProvince(state, a, a.at)
        : (a.realm === 'player'
            ? ((p.provs && p.provs.indexOf(a.at) >= 0) || (state.holder && state.holder[a.at] === 'player'))
            : state.owner[a.at] === a.realm);
      if (own) {
        const beforeMen = a.men;
        cohortJoinHost(state, a, a.size - a.men);
        const room = a.size - a.men;
        if (room > 0) {
          const add = Math.min(room, Math.max(1, Math.round(a.size * (B().armyReinforceRate || 0.02))));
          a.units.levy += add;
          a.men += add;
        }
        if (a.men > beforeMen) {
          reinforcementChanged = true;
          if (a.men >= a.size) reinforcementCompleted = true;
        }
      }
    }
    /* Exact counts remain live in the daily panels. A stationary host's map
       label can wait a few days: one global cadence prevents many damaged,
       staggered hosts from collectively forcing a full canvas paint on every
       tick. Completion is immediate so the final strength never stays stale. */
    if (reinforcementChanged &&
        (reinforcementCompleted ||
         state.turn % REINFORCEMENT_MAP_INTERVAL_DAYS === 0)) {
      requestMap();
    }

    /* supply lines: refill on friendly land, drain and starve abroad. The
       phase runs after the day's march so the price is paid at the ground
       the host ends on, and after reinforcement so a host that limped home
       at 0 supply eats before it fills its ranks; battles below still read
       today's supply. One friendly-distance map per host realm is retained
       until borders, hierarchy, development, or alliances change.
       Starvation can disband a host, so the loop walks a snapshot. */
    const supplyDistances = retainedSupplyDistanceMaps(state);
    for (const a of state.armies.slice()) {
      supplyTickHost(state, a, supplyDistances);
    }

    /* battles: hostile camps sharing a province (one clash per province per
       day). Hosts that are not mutually hostile fight as one side — the
       same folding the allied reinforcement rule applies. */
    const byProv = {};
    for (const a of state.armies) (byProv[a.at] = byProv[a.at] || []).push(a);
    for (const pid in byProv) {
      const here = byProv[pid];
      if (here.length < 2) continue;
      const sides = [];
      for (const host of here) {
        /* rout grace: a freshly broken host is left to limp home — without
           this, a host beaten on its own capital cannot flee (orderArmy
           treats home as a halt) and the same battle re-fought daily */
        if (host.broken !== undefined &&
            state.turn - host.broken < B().armyRoutDays) continue;
        let placed = null;
        for (const side of sides) {
          if (!FB.armiesHostile(state, side[0], host)) { placed = side; break; }
        }
        if (placed) placed.push(host);
        else sides.push([host]);
      }
      if (sides.length < 2) continue;
      /* the two strongest camps meet; the rest stand clear of the fray.
         Ties break on the lead host's id so the pick is deterministic. */
      sides.sort(function (x, y) {
        const byStrength = sideMen(y) - sideMen(x);
        if (byStrength) return byStrength;
        const xid = leadHost(x).id, yid = leadHost(y).id;
        return xid < yid ? -1 : xid > yid ? 1 : 0;
      });
      resolveBattle(state, pid, sides[0], sides[1]);
    }

    /* Arrival establishes a siege before the next random event slot or
       seasonal pulse. Queue its one-per-war story only after today's battles
       have decided whether the ground is genuinely uncontested. */
    if (FB.maybeQueuePlayerSiegeEvent) {
      FB.maybeQueuePlayerSiegeEvent(state);
    }
  };

  /* ---------- selection & tap handling ---------- */

  let selId = null;
  FB.selectedArmy = function (state) {
    if (!selId) return null;
    /* Rendering asks this on every pan frame. Army repair belongs to load
       and the daily tick; selection only needs the already-live id lookup. */
    for (const a of state.armies || []) {
      if (a.id === selId && a.men > 0 &&
          FB.playerControlsHost(state, a)) return a;
    }
    selId = null;
    return null;
  };
  FB.selectArmy = function (id) { selId = id || null; };

  function hostProvinceIndex(state, army) {
    if (!state || !state.armies || !army) return { index: 0, total: 1 };
    let total = 0, index = 0;
    for (let i = 0; i < state.armies.length; i++) {
      const a = state.armies[i];
      if (a.at === army.at) {
        if (a === army || a.id === army.id) index = total;
        total++;
      }
    }
    return { index: index, total: total };
  }

  function provinceSettlementPoints(state, pid) {
    const list = (FB.world && FB.world.sitesByProv && FB.world.sitesByProv[pid])
      ? FB.world.sitesByProv[pid].list : null;
    if (list && list.length) {
      const out = [];
      const count = FB.settlementVisibleCount ? FB.settlementVisibleCount(state, pid) : list.length;
      for (let i = 0; i < count && i < list.length; i++) {
        out.push({ x: list[i].x, y: list[i].y });
      }
      if (out.length) return out;
    }
    const pa = FB.world && FB.world.byId ? FB.world.byId[pid] : null;
    return pa ? [{ x: pa.cx, y: pa.cy }] : [];
  }

  /* Symmetric non-overlapping distribution around the province centroid and
     clear of any settlement in the province. Roomy counties use the full
     authored fan; cramped borders fall back to the clearest valid point. */
  function hostWorldPosition(state, army, z, dpr, knownLoc, knownSites,
      knownHosts) {
    const pa = FB.world && FB.world.byId ? FB.world.byId[army.at] : null;
    if (!pa) return [0, 0];
    const loc = knownLoc || hostProvinceIndex(state, army);
    const total = loc.total;
    const index = loc.index;

    z = z || (FB.map && FB.map.zoom) || 1;
    dpr = dpr || (FB.map && FB.map.dpr) || 1;
    const u = Math.max(15, 14 + Math.min(8, z * 1.25)) * dpr;
    const uW = u / z;

    const sites = knownSites || provinceSettlementPoints(state, army.at);
    const s0 = sites[0] || { x: pa.cx, y: pa.cy };

    let baseAngle = -Math.PI / 2; // North of settlement
    const dcx = pa.cx - s0.x, dcy = pa.cy - s0.y;
    if (dcx * dcx + dcy * dcy > 0.01) {
      baseAngle = Math.atan2(dcy, dcx);
    }

    let ang = baseAngle;
    let dist = 2.4 * uW;

    if (total === 1) {
      ang = baseAngle;
      dist = 2.3 * uW;
    } else if (total === 2) {
      const spread = 1.2;
      ang = baseAngle + (index === 0 ? -spread / 2 : spread / 2);
      dist = 2.5 * uW;
    } else if (total === 3) {
      /* Three banners otherwise crowd together when the county edge pulls
         the outer rays inward. A wider fan keeps every marker directly
         tappable even after that boundary correction. */
      const spread = 2.2;
      ang = baseAngle + (index - 1) * (spread / 2);
      dist = (index === 1 ? 2.8 : 2.7) * uW;
    } else {
      const step = Math.min(Math.PI / 2, 2.6 / total);
      ang = baseAngle + (index - (total - 1) / 2) * step;
      dist = (2.5 + (index % 2) * 0.4) * uW;
    }

    let hx = s0.x + Math.cos(ang) * dist;
    let hy = s0.y + Math.sin(ang) * dist;

    for (let si = 1; si < sites.length; si++) {
      const st = sites[si];
      const sdx = hx - st.x, sdy = hy - st.y;
      const sd = Math.hypot(sdx, sdy);
      const minSd = 2.2 * uW;
      if (sd < minSd && sd > 0.001) {
        const push = (minSd - sd) / sd;
        hx += sdx * push;
        hy += sdy * push;
      }
    }

    // Ensure the host is NEVER placed outside its own county (never across borders into neighboring counties)
    if (FB.provinceAtGrid && FB.world && FB.world.grid) {
      let testPr = FB.provinceAtGrid(hx, hy);
      if (!testPr || testPr.id !== army.at) {
        // Step back along the ray toward s0 until inside the county. Fine
        // steps preserve useful marker clearance along narrow boundaries.
        for (let step = 0.95; step >= 0; step -= 0.05) {
          const tx = s0.x + (hx - s0.x) * step;
          const ty = s0.y + (hy - s0.y) * step;
          testPr = FB.provinceAtGrid(tx, ty);
          if (testPr && testPr.id === army.at) {
            hx = tx;
            hy = ty;
            break;
          }
        }
        if (!testPr || testPr.id !== army.at) {
          hx = s0.x;
          hy = s0.y;
        }
      }
    }

    /* A border clamp can pull an outer banner back onto the county seat even
       though another angle has ample room. Search a small deterministic ring
       only when the clamped point is crowded, maximizing its clearance from
       every visible settlement and banner already placed in this county. */
    const clearanceFrom = function (x, y) {
      let clear = Infinity;
      const occupied = (knownHosts || []).concat(sites);
      for (let i = 0; i < occupied.length; i++) {
        const dx = x - occupied[i].x, dy = y - occupied[i].y;
        clear = Math.min(clear, Math.hypot(dx, dy));
      }
      return clear;
    };
    const minimumClearance = 16 * dpr / z;
    let bestClearance = clearanceFrom(hx, hy);
    if (bestClearance < minimumClearance && FB.provinceAtGrid &&
        FB.world && FB.world.grid) {
      let bestX = hx, bestY = hy;
      const radii = [dist, 2.8 * uW, 2.4 * uW, 2 * uW,
        1.6 * uW, 1.2 * uW, 1.1 * uW, uW, 0.95 * uW];
      for (let ri = 0; ri < radii.length; ri++) {
        for (let ai = 0; ai < 32; ai++) {
          const candidateAngle = ang + ai * Math.PI / 16;
          const tx = s0.x + Math.cos(candidateAngle) * radii[ri];
          const ty = s0.y + Math.sin(candidateAngle) * radii[ri];
          const candidateProvince = FB.provinceAtGrid(tx, ty);
          if (!candidateProvince || candidateProvince.id !== army.at) continue;
          const candidateClearance = clearanceFrom(tx, ty);
          if (candidateClearance > bestClearance) {
            bestClearance = candidateClearance;
            bestX = tx;
            bestY = ty;
          }
        }
      }
      hx = bestX;
      hy = bestY;
    }

    return [hx, hy];
  }

  /* Marker placement depends on army state and zoom, never on the viewport.
     Keep it across the many render passes produced by one pan gesture and
     across quiet war days. A season key covers settlement-layout changes;
     requestMap's revision covers splits, merges, arrivals, and other visible
     army mutations. */
  let armyLayoutCache = null;
  function armyRenderLayout(state, z, dpr) {
    const count = state && state.armies ? state.armies.length : 0;
    const seasonKey = state.date
      ? state.date.year + '|' + state.date.season : '';
    if (armyLayoutCache && armyLayoutCache.state === state &&
        armyLayoutCache.world === FB.world &&
        armyLayoutCache.armies === state.armies &&
        armyLayoutCache.seasonKey === seasonKey &&
        armyLayoutCache.revision === armyRenderRevision &&
        armyLayoutCache.zoom === z && armyLayoutCache.dpr === dpr &&
        armyLayoutCache.count === count) {
      return armyLayoutCache;
    }
    const byProv = {};
    const positions = {};
    const stackCounts = {};
    for (const army of state.armies) {
      (byProv[army.at] = byProv[army.at] || []).push(army);
      const stackKey = army.at + '|' + army.realm;
      stackCounts[stackKey] = (stackCounts[stackKey] || 0) + 1;
    }
    for (const pid in byProv) {
      const hosts = byProv[pid];
      const sites = provinceSettlementPoints(state, pid);
      const placed = [];
      for (let i = 0; i < hosts.length; i++) {
        positions[hosts[i].id] = hostWorldPosition(
          state, hosts[i], z, dpr, { index:i, total:hosts.length }, sites,
          placed);
        placed.push({
          x:positions[hosts[i].id][0],
          y:positions[hosts[i].id][1]
        });
      }
    }
    armyLayoutCache = {
      state:state, world:FB.world, armies:state.armies, seasonKey:seasonKey,
      revision:armyRenderRevision, zoom:z, dpr:dpr, count:count,
      byProv:byProv, positions:positions, stackCounts:stackCounts,
      cutOff:{}, cutOffTurn:state.turn
    };
    return armyLayoutCache;
  }

  FB.armyWorldPos = function (state, army) {
    const z = (FB.map && FB.map.zoom) || 1;
    const dpr = (FB.map && FB.map.dpr) || 1;
    const layout = armyRenderLayout(state, z, dpr);
    return layout.positions[army.id] || hostWorldPosition(state, army, z, dpr);
  };

  FB.armyAtWorld = function (state, wx, wy, tol) {
    FB.armiesEnsure(state);
    const z = (FB.map && FB.map.zoom) || 1;
    const dpr = (FB.map && FB.map.dpr) || 1;
    const layout = armyRenderLayout(state, z, dpr);
    const command = state.player && state.player.militaryCommand &&
      FB.activeMilitaryCommand(state);
    let best = null, bd = tol * tol;
    for (const a of state.armies) {
      const pos = layout.positions[a.id] || hostWorldPosition(state, a, z, dpr);
      const d = (pos[0] - wx) * (pos[0] - wx) + (pos[1] - wy) * (pos[1] - wy);
      if (d > bd) continue;
      // on a tie or close distance, a host under your command wins the tap
      const controlled = a.realm === 'player' ||
        !!(command && a.realm === command.sovereignRealmId &&
          (!command.hostId || a.id === command.hostId));
      const bestControlled = best && (best.realm === 'player' ||
        !!(command && best.realm === command.sovereignRealmId &&
          (!command.hostId || best.id === command.hostId)));
      if (d < bd || !best || (controlled && !bestControlled)) {
        bd = d;
        best = a;
      }
    }
    return best;
  };

  /* A map tap arrives here first (from FB.map.onTap in ui.js). Returns true
     when the tap was army business: select your host, tap a province to
     march it (which lets go again), tap the selected host to halt. */
  FB.armyTap = function (state, pr, wx, wy) {
    const sel = FB.selectedArmy(state);
    let hit = null;
    if (wx !== undefined && FB.map && FB.map.zoom) {
      hit = FB.armyAtWorld(state, wx, wy, 24 * (FB.map.dpr || 1) / FB.map.zoom);
      /* A selected banner can overlap the center of a neighboring county at
         low zoom. A tap whose resolved province differs from the banner's
         province is a destination order, not a second tap that halts it. */
      if (sel && pr && pr.id !== sel.at && hit === sel) hit = null;
    } else if (pr) {
      // keyboard taps carry no pointer position: cycle or select in the tapped province
      const here = FB.armiesAt(state, pr.id);
      const stack = [];
      for (const a of here) {
        if (FB.playerControlsHost(state, a)) stack.push(a);
      }
      if (stack.length) {
        const selIndex = sel ? stack.indexOf(sel) : -1;
        if (selIndex >= 0 && selIndex < stack.length - 1) {
          const next = stack[selIndex + 1];
          FB.selectArmy(next.id);
          if (FB.ui) FB.ui.toast('🚩 Your other host — {men} men at {province}. Tap again for the next banner, or past the last to halt it.', {
            men: next.men, province: provName(next.at) });
          return false;
        } else if (selIndex >= 0 && selIndex === stack.length - 1) {
          const held = stack[selIndex];
          held.path = []; held.goal = null; held.moveLeft = 0; held.huntPrey = null;
          held.manual = 0; held.holdManual = 1;
          delete held.autoResupply;
          delete held.automatedOrder;
          delete held.eventOrder;
          FB.selectArmy(null);
          if (FB.ui) FB.ui.toast('🚩 The host holds at {province}.',
            { province: provName(held.at) });
          if (FB.map) FB.map.request();
          if (FB.ui && FB.ui.refresh) FB.ui.refresh();
          return true;
        } else {
          hit = stack[0];
        }
      }
    }
    if (hit && FB.playerControlsHost(state, hit)) {
      if (sel && sel === hit) {
        // tapping the already selected host halts it
        hit.path = []; hit.goal = null; hit.moveLeft = 0; hit.huntPrey = null;
        hit.manual = 0; hit.holdManual = 1; // a hand-halted host holds, automation or no
        delete hit.autoResupply;
        delete hit.automatedOrder;
        delete hit.eventOrder;
        FB.selectArmy(null);
        if (FB.ui) FB.ui.toast('🚩 The host holds at {province}.',
          { province: provName(hit.at) });
        if (FB.map) FB.map.request(); // drop the ring and route while paused
        if (FB.ui && FB.ui.refresh) FB.ui.refresh();
        return true;
      }
      /* tapping a different player host (or tapping with nothing selected)
         selects that specific host directly */
      FB.selectArmy(hit.id);
      if (FB.ui) FB.ui.toast('🚩 Your host — {men} men at {province}. Tap a province to march; tap the host again to halt.',
        { men: hit.men, province: provName(hit.at) });
      return false; // let the tap through so the Land tab shows where it stands
    }
    if (sel) {
      if (pr && !pr.wasteland) {
        const orderPlan = armyOrderPlan(state, sel, pr.id);
        if (FB.orderArmy(state, sel, pr.id, orderPlan)) {
          sel.huntPrey = null; // a hand-given order ends any hunt
          sel.manual = 1; sel.holdManual = 0; // and plays out before automation resumes
          delete sel.autoResupply;
          delete sel.automatedOrder;
          delete sel.eventOrder;
          FB.selectArmy(null); // and lets go, so further taps browse the map
          if (FB.ui && orderPlan.blockedByFort) {
            const blockedFort = FB.fortAt &&
              FB.fortAt(FB.state, orderPlan.blockedByFort);
            const blockedDef = blockedFort && FB.fortLevelDef
              ? FB.fortLevelDef(blockedFort.level) : null;
            const fortName = blockedDef ? FB.L(blockedDef.name) : FB.T('a fort');
            FB.ui.toast('🏰 The host marches to {province}, where {fort} will pin it. A siege needs at least {men} men and costs {attrition} casualties each active season.', {
              province:provName(orderPlan.blockedByFort),
              fort:blockedFort && FB.fortLevelName
                ? FB.fortLevelName(FB.state, blockedFort.level) : 'the fort',
              men:blockedDef ? blockedDef.garrison *
                (FBDATA.forts.garrisonStrengthRatio || 3) : 0,
              attrition:blockedDef ? Math.ceil(blockedDef.garrison *
                (FBDATA.forts.seasonalAttritionRate || 0.15)) : 0
            });
          } else if (FB.ui && orderPlan.routedAroundForts &&
              orderPlan.routedAroundForts.length) {
            FB.ui.toast('🚩 The host marches around the fortified road to {province} — about {days} days.', {
              province:pr.name, days:orderPlan.totalDays
            });
          } else if (FB.ui && orderPlan.waterLegs) {
            let limiting = null;
            for (let i = 0; i < orderPlan.crossings.length; i++) {
              const crossing = orderPlan.crossings[i];
              if (!limiting ||
                  crossing.quote.totalDays > limiting.quote.totalDays ||
                  crossing.quote.totalCoin > limiting.quote.totalCoin) {
                limiting = crossing;
              }
            }
            if (limiting) {
              const params = {
                province: pr.name,
                days: orderPlan.totalDays,
                crossings: orderPlan.waterLegs,
                from: provName(limiting.from),
                to: provName(limiting.to),
                capacity: limiting.quote.effectiveCapacity,
                cycles: limiting.quote.cycles
              };
              if (orderPlan.waterLegs === 1) {
                FB.ui.toast(params.cycles === 1
                  ? '🚩 The host marches on {province} — about {days} days, with {crossings} water crossing. The {from}–{to} crossing carries {capacity} men per cycle and needs {cycles} cycle.'
                  : '🚩 The host marches on {province} — about {days} days, with {crossings} water crossing. The {from}–{to} crossing carries {capacity} men per cycle and needs {cycles} cycles.',
                params);
              } else {
                FB.ui.toast(params.cycles === 1
                  ? '🚩 The host marches on {province} — about {days} days, with {crossings} water crossings. The limiting {from}–{to} crossing carries {capacity} men per cycle and needs {cycles} cycle.'
                  : '🚩 The host marches on {province} — about {days} days, with {crossings} water crossings. The limiting {from}–{to} crossing carries {capacity} men per cycle and needs {cycles} cycles.',
                params);
              }
            }
          } else if (FB.ui) {
            FB.ui.toast('🚩 The host marches to {province} — about {days} days.', {
              province: pr.name, days: orderPlan.totalDays
            });
          }
          if (FB.map) FB.map.request();
          if (FB.ui && FB.ui.refresh) FB.ui.refresh();
        } else if (FB.ui) {
          FB.ui.toast('🚫 No road nor crossing leads the host to {province}.',
            { province: pr.name });
        }
        return true;
      }
      FB.selectArmy(null);
      if (FB.map) FB.map.request(); // drop the ring while paused
      return true;
    }
    return false;
  };

  /* ---------- rendering (called from mapview's render pass) ---------- */

  let armyPreviewCache = null;
  function cachedArmyPreviewPlan(state, army, pid) {
    if (armyPreviewCache && armyPreviewCache.state === state &&
        armyPreviewCache.turn === state.turn &&
        armyPreviewCache.revision === armyRenderRevision &&
        armyPreviewCache.armyId === army.id &&
        armyPreviewCache.at === army.at &&
        armyPreviewCache.men === army.men &&
        armyPreviewCache.pid === pid) {
      return armyPreviewCache.plan;
    }
    const plan = armyOrderPlan(state, army, pid);
    armyPreviewCache = {
      state:state, turn:state.turn, revision:armyRenderRevision,
      armyId:army.id, at:army.at, men:army.men, pid:pid, plan:plan
    };
    return plan;
  }

  FB.renderArmies = function (ctx, toScreen, z, dpr) {
    const s = FB.state;
    if (!s || !s.armies || !s.armies.length) return;
    const sel = FB.selectedArmy(s);
    const command = s.player && s.player.militaryCommand &&
      FB.activeMilitaryCommand(s);
    const commandedRealm = command && command.sovereignRealmId;
    let commandedHost = null;
    if (commandedRealm) {
      for (const host of s.armies) {
        if (host.realm === commandedRealm &&
            (!command.hostId || host.id === command.hostId)) {
          commandedHost = host;
          break;
        }
      }
    }
    const commandedHostId = commandedHost && commandedHost.id;
    const layout = armyRenderLayout(s, z, dpr);

    // Helper to draw a host's planned movement route on the map
    function drawArmyRoute(host, path, routeKind) {
      if (!path || !path.length) return;
      const isPreview = routeKind === 'preview';
      const isEnemy = routeKind === 'enemy';
      const routeStroke = isPreview ? 'rgba(255, 235, 120, 0.98)'
        : (isEnemy ? 'rgba(220, 68, 54, 0.96)'
          : 'rgba(255, 215, 80, 0.92)');
      const routeFill = isPreview ? 'rgba(255, 235, 120, 0.28)'
        : (isEnemy ? 'rgba(200, 53, 43, 0.24)'
          : 'rgba(255, 215, 80, 0.22)');
      const startPos = layout.positions[host.id] ||
        hostWorldPosition(s, host, z, dpr);
      const p0 = toScreen(startPos[0], startPos[1]);

      // 1. Draw dashed route line
      ctx.strokeStyle = routeStroke;
      ctx.lineWidth = (isPreview ? 2.4 : 2.2) * dpr;
      ctx.setLineDash([5 * dpr, 4 * dpr]);
      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1]);
      for (let i = 0; i < path.length; i++) {
        const pr = FB.world.byId[path[i]];
        if (!pr) continue;
        const sp = toScreen(pr.cx, pr.cy);
        ctx.lineTo(sp[0], sp[1]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Draw intermediate waypoint nodes
      for (let i = 0; i < path.length - 1; i++) {
        const pr = FB.world.byId[path[i]];
        if (!pr) continue;
        const sp = toScreen(pr.cx, pr.cy);
        ctx.fillStyle = isPreview ? 'rgba(255, 235, 120, 0.9)'
          : (isEnemy ? 'rgba(220, 68, 54, 0.9)'
            : 'rgba(255, 215, 80, 0.85)');
        ctx.beginPath();
        ctx.arc(sp[0], sp[1], 3.2 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Draw destination target ring and marker
      const destPid = path[path.length - 1];
      const destPr = FB.world.byId[destPid];
      if (destPr) {
        const destPt = toScreen(destPr.cx, destPr.cy);
        const destR = (10 + Math.min(5, z)) * dpr;
        ctx.beginPath();
        ctx.arc(destPt[0], destPt[1], destR, 0, Math.PI * 2);
        ctx.strokeStyle = routeStroke;
        ctx.lineWidth = 2.4 * dpr;
        ctx.stroke();
        ctx.fillStyle = routeFill;
        ctx.fill();

        ctx.font = Math.round(12 * dpr) + 'px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isEnemy ? 'rgba(255, 190, 155, 0.98)' : routeStroke;
        ctx.fillText(isEnemy ? '➜' : '🚩', destPt[0], destPt[1]);
      }
    }

    // Show orders for controlled hosts and only the enemy in the player's active
    // ordinary war. Other AI movement remains private map noise.
    const drawnHosts = {};
    const activeWarEnemyRealm = s.player.war && s.player.war.enemy;
    for (let ai = 0; ai < s.armies.length; ai++) {
      const a = s.armies[ai];
      const activeWarEnemy = activeWarEnemyRealm === a.realm;
      if ((a.realm === 'player' || a.id === commandedHostId || a === sel ||
          activeWarEnemy) && a.path && a.path.length) {
        drawArmyRoute(a, a.path, activeWarEnemy ? 'enemy' : 'active');
        drawnHosts[a.id] = true;
      }
    }

    // If a host is selected and previewing/inspecting a destination county, draw preview line
    if (sel && !drawnHosts[sel.id] && FB.map && FB.map.selected && FB.map.selected !== sel.at) {
      const targetPr = FB.world.byId[FB.map.selected];
      if (targetPr && !targetPr.wasteland) {
        const plan = cachedArmyPreviewPlan(s, sel, FB.map.selected);
        if (plan && plan.ok && plan.path && plan.path.length) {
          drawArmyRoute(sel, plan.path, 'preview');
        }
      }
    }

    /* provinces where hostile hosts stand together: a battle is joined there
       today (they clash in the daily tick) — marked below so the fray reads */
    const byProv = layout.byProv;
    const battles = {};
    for (const pid in byProv) {
      const here = byProv[pid];
      for (let i = 0; i < here.length && !battles[pid]; i++) {
        for (let j = i + 1; j < here.length; j++) {
          if (FB.armiesHostile(s, here[i], here[j])) {
            battles[pid] = true;
            break;
          }
        }
      }
    }

    // when zoomed out, highlight the county borders of provinces containing troops
    if (z < 1.35 && FB.provinceOutline) {
      ctx.save();
      ctx.scale(z, z);
      const sx = (FB.map && FB.map.viewX) || 0;
      const sy = (FB.map && FB.map.viewY) || 0;
      const viewMaxX = sx + ctx.canvas.width / z;
      const viewMaxY = sy + ctx.canvas.height / z;
      const viewMargin = 8 / z;
      ctx.translate(-sx, -sy);
      for (const pid in byProv) {
        const bounds = FB.provinceBounds ? FB.provinceBounds(pid) : null;
        if (bounds && (bounds.maxX < sx - viewMargin ||
            bounds.minX > viewMaxX + viewMargin ||
            bounds.maxY < sy - viewMargin ||
            bounds.minY > viewMaxY + viewMargin)) continue;
        const path = FB.provinceOutline(pid);
        if (!path) continue;
        const hostsInProv = byProv[pid];
        let hasPlayer = false, hasHostile = false;
        let provColor = '#888888';
        for (let hi = 0; hi < hostsInProv.length; hi++) {
          const h = hostsInProv[hi];
          if (h.realm === 'player' || h.id === commandedHostId) {
            hasPlayer = true;
          } else if ((s.player.war && s.player.war.enemy === h.realm) ||
              (commandedHost && FB.armiesHostile(s, commandedHost, h))) {
            hasHostile = true;
          } else if (!hasPlayer && !hasHostile) {
            const r = s.realms[h.realm];
            if (r && r.color) provColor = r.color;
          }
        }
        const bColor = battles[pid] ? '#ffd75e' : (hasPlayer ? '#3fae4a' : (hasHostile ? '#c8352b' : provColor));
        ctx.lineCap = 'square';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(10,15,20,0.75)';
        ctx.lineWidth = 3.6 * dpr / z;
        ctx.stroke(path);
        ctx.strokeStyle = bColor;
        ctx.lineWidth = 2.0 * dpr / z;
        ctx.stroke(path);
      }
      ctx.restore();
    }

    const stackCounts = layout.stackCounts;
    /* Encirclement depends on simulation state, not the viewport. The layout
       cache retains it for the rest of this turn/revision instead of asking
       every visible host again on every drag frame. */
    if (layout.cutOffTurn !== s.turn) {
      layout.cutOff = {};
      layout.cutOffTurn = s.turn;
    }
    const cutOffMemo = layout.cutOff;
    const playerGreatCamp = FB.playerGreatHolyWarCamp
      ? FB.playerGreatHolyWarCamp(s) : null;
    const greatCampByRealm = {};
    for (const a of s.armies) {
      const pos = layout.positions[a.id] || hostWorldPosition(s, a, z, dpr);
      const sc = toScreen(pos[0], pos[1]);
      const u = Math.max(15, 14 + Math.min(8, z * 1.25)) * dpr;
      const x = sc[0];
      const y = sc[1];
      if (x < -40 || y < -40 || x > ctx.canvas.width + 40 || y > ctx.canvas.height + 40) continue;
      const mine = a.realm === 'player' || a.id === commandedHostId;
      const realm = mine ? null : s.realms[a.realm];
      if (greatCampByRealm[a.realm] === undefined) {
        greatCampByRealm[a.realm] = FB.greatHolyWarCamp
          ? (FB.greatHolyWarCamp(s, a.realm) || null) : null;
      }
      const armyGreatCamp = greatCampByRealm[a.realm];
      const hostileToMe = !mine &&
        ((playerGreatCamp && armyGreatCamp && playerGreatCamp !== armyGreatCamp) ||
         (s.player.war && s.player.war.enemy === a.realm) ||
         (commandedHost && FB.armiesHostile(s, commandedHost, a)));
      const friendlyToMe = !mine && playerGreatCamp &&
        armyGreatCamp === playerGreatCamp;
      // your side always marches in green, your war enemy in red; everyone
      // else keeps their realm's color
      const col = (mine || friendlyToMe ||
        (!playerGreatCamp && armyGreatCamp === 'attackers')) ? '#3fae4a'
        : ((hostileToMe || (!playerGreatCamp && armyGreatCamp === 'defenders'))
          ? '#c8352b' : (realm ? realm.color : '#888888'));

      // base disc in the host's color over a soft shadow: the side a host
      // fights for reads at a glance — two pennants alone did not
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(x, y + u * 0.34, u * 0.74, u * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(x, y + u * 0.3, u * 0.68, u * 0.24, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = Math.max(1, u * 0.05); ctx.stroke();
      // three spearmen: dark bodies, round heads, sloped spears
      ctx.strokeStyle = '#221d16'; ctx.lineWidth = Math.max(1, u * 0.09);
      ctx.fillStyle = '#2c2620';
      for (let k = -1; k <= 1; k++) {
        const sx = x + k * u * 0.34, sy = y + (k === 0 ? 0 : u * 0.1);
        ctx.beginPath(); ctx.arc(sx, sy - u * 0.34, u * 0.13, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(sx, sy - u * 0.22); ctx.lineTo(sx, sy + u * 0.26); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx + u * 0.12, sy + u * 0.1); ctx.lineTo(sx + u * 0.3, sy - u * 0.5); ctx.stroke();
      }
      // banner: pole + pennant in the host's color
      ctx.strokeStyle = '#1c1712'; ctx.lineWidth = Math.max(1, u * 0.08);
      ctx.beginPath(); ctx.moveTo(x + u * 0.52, y + u * 0.3); ctx.lineTo(x + u * 0.52, y - u * 0.95); ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x + u * 0.52, y - u * 0.95);
      ctx.lineTo(x + u * 1.05, y - u * 0.78);
      ctx.lineTo(x + u * 0.52, y - u * 0.58);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
      // gold ring for your selected host
      if (sel && sel.id === a.id) {
        ctx.strokeStyle = '#ffe28a'; ctx.lineWidth = 2 * dpr;
        ctx.beginPath(); ctx.arc(x, y - u * 0.15, u * 1.05, 0, Math.PI * 2); ctx.stroke();
      }
      // crossed swords over a host locked with an enemy in this province today
      if (battles[a.at]) {
        ctx.font = Math.round(u * 0.85) + 'px Georgia';
        ctx.textAlign = 'center';
        ctx.lineWidth = 2.5 * dpr; ctx.strokeStyle = 'rgba(20,16,10,0.85)';
        ctx.strokeText('⚔', x, y - u * 1.0);
        ctx.fillStyle = '#ffd75e';
        ctx.fillText('⚔', x, y - u * 1.0);
      }
      // ✂ over a cut-off host: no road home, no mercy in a shattering
      if (FB.hostCutOff) {
        if (cutOffMemo[a.id] === undefined) {
          cutOffMemo[a.id] = FB.hostCutOff(s, a);
        }
        if (cutOffMemo[a.id]) {
          ctx.font = Math.round(u * 0.8) + 'px Georgia';
          ctx.textAlign = 'center';
          ctx.lineWidth = 2.5 * dpr; ctx.strokeStyle = 'rgba(20,16,10,0.85)';
          ctx.strokeText('✂', x + u * 0.7, y - u * 1.0);
          ctx.fillStyle = '#ff9a7a';
          ctx.fillText('✂', x + u * 0.7, y - u * 1.0);
        }
      }
      // a stacked-count badge when banners of one realm share the province
      const stackCount = stackCounts[a.at + '|' + a.realm] || 0;
      if (stackCount > 1) {
        ctx.font = Math.round(9 * dpr) + 'px Georgia';
        ctx.textAlign = 'center';
        const badge = '×' + stackCount;
        const bx = x + u * 0.85, by = y + u * 0.75;
        ctx.lineWidth = 2.5 * dpr; ctx.strokeStyle = 'rgba(20,16,10,0.85)';
        ctx.strokeText(badge, bx, by);
        ctx.fillStyle = '#ffe28a';
        ctx.fillText(badge, bx, by);
      }
      // strength label
      if (z >= 1.3) {
        ctx.font = Math.round(10 * dpr) + 'px Georgia';
        ctx.textAlign = 'center';
        ctx.lineWidth = 2.5 * dpr; ctx.strokeStyle = 'rgba(20,16,10,0.8)';
        const lbl = a.men >= 1000 ? (Math.round(a.men / 100) / 10) + 'k' : String(a.men);
        ctx.strokeText(lbl, x, y + u * 0.75);
        ctx.fillStyle = mine ? '#ffe9a8' : 'rgba(255,250,235,0.9)';
        ctx.fillText(lbl, x, y + u * 0.75);
      }
    }
  };
})();
