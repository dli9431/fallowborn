/* Fallowborn: climate zones and local seasons.
   The calendar season (state.date.season, 0 Spring to 3 Winter) is global;
   what it means in a county depends on that county's climate zone. The
   active geography base assigns zones (geography.climate: a zone for every
   county plus per-county exceptions), each zone maps the four calendar
   seasons to season kinds (data/climate.js), and engine rules read a kind's
   properties (hardship, fairWeather) rather than the calendar index or a
   kind id. Everything here is derived from data; nothing is saved. */
window.FB = window.FB || {};

(function () {
  'use strict';

  function own(object, key) {
    return !!object && Object.prototype.hasOwnProperty.call(object, key);
  }
  function plain(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }
  function calendarIndex(season) {
    const n = Math.floor(Number(season)) || 0;
    return ((n % 4) + 4) % 4;
  }

  FB.seasonKind = function (id) {
    const kinds = FBDATA.seasonKinds || {};
    return typeof id === 'string' && own(kinds, id) && plain(kinds[id]) ? kinds[id] : null;
  };

  FB.climateZone = function (id) {
    const zones = FBDATA.climateZones || {};
    return typeof id === 'string' && own(zones, id) && plain(zones[id]) ? zones[id] : null;
  };

  /* Bookmark climate assignments precede those of the shared physical base.
     Each layer uses its county exception, then its zone; the final fallback
     is FBDATA.defaultClimateZone. No shared geography record is mutated. */
  FB.climateZoneOf = function (provinceId, definition) {
    const bookmark = definition || FB.activeBookmark;
    const local = bookmark && plain(bookmark.climate) ? bookmark.climate : null;
    const overrides = local && plain(local.provinces) ? local.provinces : null;
    if (overrides && typeof provinceId === 'string' && own(overrides, provinceId) &&
        FB.climateZone(overrides[provinceId])) return overrides[provinceId];
    if (local && FB.climateZone(local.zone)) return local.zone;
    const geography = definition ? FB.geography(FB.bookmarkGeography(definition)) : FB.activeGeography;
    const climate = geography && plain(geography.climate) ? geography.climate : null;
    const assigned = climate && plain(climate.provinces) ? climate.provinces : null;
    if (assigned && typeof provinceId === 'string' && own(assigned, provinceId) &&
        FB.climateZone(assigned[provinceId])) return assigned[provinceId];
    if (climate && FB.climateZone(climate.zone)) return climate.zone;
    return FB.climateZone(FBDATA.defaultClimateZone) ? FBDATA.defaultClimateZone : null;
  };

  /* The season kind a county has in a calendar season (0 to 3). */
  FB.seasonKindAt = function (provinceId, calendarSeason, definition) {
    const zone = FB.climateZone(FB.climateZoneOf(provinceId, definition));
    const kind = zone && Array.isArray(zone.seasons)
      ? zone.seasons[calendarIndex(calendarSeason)] : null;
    return FB.seasonKind(kind) ? kind : null;
  };

  /* The season kind a county has today. */
  FB.localSeason = function (state, provinceId) {
    return FB.seasonKindAt(provinceId, state && state.date ? state.date.season : 0);
  };

  /* Whether a county's season kind in a calendar season, or today, carries
     a property such as hardship or fairWeather. */
  FB.seasonKindHasAt = function (provinceId, calendarSeason, property) {
    const kind = FB.seasonKind(FB.seasonKindAt(provinceId, calendarSeason));
    return !!(kind && kind[property] === true);
  };
  FB.localSeasonHas = function (state, provinceId, property) {
    return FB.seasonKindHasAt(provinceId,
      state && state.date ? state.date.season : 0, property);
  };

  /* Display names. A kind or zone without a record falls back to the
     calendar name or the id. */
  FB.seasonKindName = function (state, id) {
    const def = FB.seasonKind(id);
    return def ? FB.dataText(state, null, 'seasonKind', id, def, 'name', {}) : String(id || '');
  };
  FB.climateZoneName = function (state, id) {
    const def = FB.climateZone(id);
    return def ? FB.dataText(state, null, 'climateZone', id, def, 'name', {}) : String(id || '');
  };
  FB.localSeasonName = function (state, provinceId) {
    const kind = FB.localSeason(state, provinceId);
    return kind ? FB.seasonKindName(state, kind)
      : FB.seasonName(state && state.date ? state.date.season : 0);
  };

  /* A province sheet's local season row: the kind with its climate zone. */
  FB.localSeasonText = function (state, provinceId) {
    const zone = FB.climateZoneOf(provinceId);
    const season = FB.localSeasonName(state, provinceId);
    return zone ? FB.T('{season} ({climate})', {
      season:season, climate:FB.climateZoneName(state, zone)
    }) : season;
  };

  const KIND_FLAGS ={ hardship:true, fairWeather:true };

  /* The schema gate for the season-kind and zone tables. Returns a list of
     faults; empty when valid. */
  FB.validateClimateData = function (kinds, zones, defaultZone) {
    const errors = [];
    kinds = kinds === undefined ? FBDATA.seasonKinds : kinds;
    zones = zones === undefined ? FBDATA.climateZones : zones;
    defaultZone = defaultZone === undefined ? FBDATA.defaultClimateZone : defaultZone;
    if (!plain(kinds) || !Object.keys(kinds).length) {
      return ['seasonKinds must be a non-empty object keyed by id.'];
    }
    if (!plain(zones) || !Object.keys(zones).length) {
      return ['climateZones must be a non-empty object keyed by id.'];
    }
    Object.keys(kinds).forEach(function (id) {
      const kind = kinds[id];
      if (!/^[a-z][a-z0-9_]*$/.test(id)) errors.push('season kind ' + id + ' needs a snake_case id.');
      if (!plain(kind) || typeof kind.name !== 'string' || !kind.name) {
        errors.push('season kind ' + id + ' needs a name.');
        return;
      }
      Object.keys(KIND_FLAGS).forEach(function (flag) {
        if (kind[flag] !== undefined && typeof kind[flag] !== 'boolean') {
          errors.push('season kind ' + id + ' ' + flag + ' must be true or false.');
        }
      });
    });
    Object.keys(zones).forEach(function (id) {
      const zone = zones[id];
      if (!/^[a-z][a-z0-9_]*$/.test(id)) errors.push('climate zone ' + id + ' needs a snake_case id.');
      if (!plain(zone) || typeof zone.name !== 'string' || !zone.name) {
        errors.push('climate zone ' + id + ' needs a name.');
        return;
      }
      if (!Array.isArray(zone.seasons) || zone.seasons.length !== 4 ||
          zone.seasons.some(function (kind) {
            return typeof kind !== 'string' || !own(kinds, kind);
          })) {
        errors.push('climate zone ' + id + ' needs four known season kinds, Spring to Winter.');
      }
    });
    if (typeof defaultZone !== 'string' || !own(zones, defaultZone)) {
      errors.push('defaultClimateZone must name a climate zone.');
    }
    return errors;
  };

  /* Faults of a geography base's climate assignment. seedIds, when given
     and non-empty, holds the base's county ids. */
  FB.climateAssignmentFaults = function (climate, seedIds) {
    const errors = [], zones = FBDATA.climateZones || {};
    if (!plain(climate)) return ['climate must be an object with a zone and provinces.'];
    if (climate.zone !== undefined && (typeof climate.zone !== 'string' || !own(zones, climate.zone))) {
      errors.push('climate names unknown zone ' + climate.zone + '.');
    }
    if (climate.provinces !== undefined && !plain(climate.provinces)) {
      errors.push('climate provinces must map county ids to zones.');
      return errors;
    }
    const assigned = climate.provinces || {};
    const checkSeeds = plain(seedIds) && Object.keys(seedIds).length > 0;
    Object.keys(assigned).forEach(function (pid) {
      if (typeof assigned[pid] !== 'string' || !own(zones, assigned[pid])) {
        errors.push('climate gives county ' + pid + ' unknown zone ' + assigned[pid] + '.');
      }
      if (checkSeeds && !own(seedIds, pid)) {
        errors.push('climate names unknown county ' + pid + '.');
      }
    });
    return errors;
  };

  /* The fault of one event's seasonKinds trigger, or null. kinds defaults
     to FBDATA.seasonKinds; a mod passes its composed table. */
  FB.seasonKindTriggerFault = function (trigger, kinds) {
    if (!plain(trigger) || trigger.seasonKinds === undefined) return null;
    kinds = kinds || FBDATA.seasonKinds || {};
    const list = trigger.seasonKinds;
    if (!Array.isArray(list) || !list.length) return 'seasonKinds must be a non-empty array.';
    for (let i = 0; i < list.length; i++) {
      if (typeof list[i] !== 'string' || !own(kinds, list[i])) {
        return 'seasonKinds names unknown season kind ' + list[i] + '.';
      }
    }
    return null;
  };
})();
