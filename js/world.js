/* Fallowborn — world generation (province raster) + realm simulation */
window.FB = window.FB || {};

(function () {
  'use strict';

  FB.world = null;
  FB.activeBookmark = null;
  FB.activeBookmarkId = null;

  var worldCache = {};
  var WORLD_FIELDS = [
    'provinces','realms','duchies','kingdoms','empires','straits',
    'crossingClasses','scripted'
  ];

  function bookmarkDefinition(id) {
    var bookmarks = FBDATA.bookmarks || {};
    return bookmarks[id] || null;
  }

  function defaultBookmarkId() {
    return FBDATA.defaultBookmark === undefined
      ? '867' : String(FBDATA.defaultBookmark);
  }

  FB.bookmark = function (id) {
    return bookmarkDefinition(id === undefined || id === null
      ? defaultBookmarkId() : String(id));
  };

  FB.bookmarks = function (includeHidden) {
    var out = [], bookmarks = FBDATA.bookmarks || {};
    for (var id in bookmarks) {
      if (!Object.prototype.hasOwnProperty.call(bookmarks, id)) continue;
      if (!bookmarks[id] || !bookmarks[id].id || !bookmarks[id].date) continue;
      if (!includeHidden && FB.mods && FB.mods.bookmarkAvailable &&
          !FB.mods.bookmarkAvailable(id)) continue;
      out.push(bookmarks[id]);
    }
    out.sort(function (a, b) {
      return (a.date.year - b.date.year) || (a.date.season - b.date.season) ||
        (a.date.day - b.date.day);
    });
    return out;
  };

  /* Every settled county has at least its principal culture/faith pair.
     Authored community arrays stay ordered and are copied into a normalized
     projection so UI callers never need to special-case the optional field. */
  FB.provinceCommunities = function (province) {
    if (!province || province.wasteland) return [];
    var source = Array.isArray(province.communities) && province.communities.length
      ? province.communities
      : [{ culture:province.culture, religion:province.religion }];
    return source.map(function (entry) {
      return { culture:entry.culture, religion:entry.religion };
    });
  };

  function topDefinitionRealm(realms, rid) {
    var cur = rid, seen = {};
    while (cur && realms[cur] && realms[cur].liege) {
      if (seen[cur]) return null;
      seen[cur] = 1;
      cur = realms[cur].liege;
    }
    return cur;
  }

  function validRulerProfile(ruler) {
    return !!ruler && !!ruler.name && (ruler.sex === 'm' || ruler.sex === 'f') &&
      !!FBDATA.cultures[ruler.culture] && isFinite(ruler.born) &&
      isFinite(ruler.mar) && !!FBDATA.traits[ruler.trait];
  }

  /* Activation is also the runtime schema gate for base and mod-provided
     bookmarks. Returning all faults together makes a broken atomic world much
     easier for a mod author to repair than failing at its first bad county. */
  FB.validateBookmark = function (definition) {
    var errors = [];
    var label = definition && definition.id ? definition.id : '?';
    function fault(text) { errors.push('Bookmark ' + label + ': ' + text); }
    if (!definition || typeof definition !== 'object') return ['Bookmark definition is missing.'];
    if (FB.validateTechnologyData) {
      var technologyErrors = FB.validateTechnologyData();
      for (var te = 0; te < technologyErrors.length; te++) errors.push(technologyErrors[te]);
    }
    if (FB.validateReligionData) {
      var religionErrors = FB.validateReligionData(null);
      for (var re = 0; re < religionErrors.length; re++) errors.push(religionErrors[re]);
    }
    if (!definition.id || !/^[a-z0-9_]+$/i.test(definition.id)) fault('invalid id.');
    var date = definition.date || {};
    if (!isFinite(date.year) || date.season < 0 || date.season > 3 ||
        date.day < 1 || date.day > 90) fault('invalid start date.');
    for (var wf = 0; wf < WORLD_FIELDS.length; wf++) {
      var worldField = WORLD_FIELDS[wf];
      if (worldField === 'crossingClasses') continue;
      if (definition[worldField] === undefined || definition[worldField] === null) {
        fault('missing ' + worldField + '.');
      }
    }

    var provinces = Array.isArray(definition.provinces) ? definition.provinces : [];
    var realmsList = Array.isArray(definition.realms) ? definition.realms : [];
    var duchies = definition.duchies || {}, kingdoms = definition.kingdoms || {};
    var empires = definition.empires || {}, provinceIds = {}, realms = {};
    for (var pi = 0; pi < provinces.length; pi++) {
      var province = provinces[pi];
      if (!province || !province.id) { fault('province at index ' + pi + ' has no id.'); continue; }
      if (provinceIds[province.id]) fault('duplicate province id ' + province.id + '.');
      provinceIds[province.id] = province;
      if (province.population0 !== undefined) {
        if (typeof province.population0 !== 'number' || !isFinite(province.population0) ||
            province.population0 <= 0 || Math.floor(province.population0) !== province.population0) {
          fault('province ' + province.id + ': population0 must be a positive integer.');
        }
      }
      if (province.populationCapacity0 !== undefined) {
        if (typeof province.populationCapacity0 !== 'number' || !isFinite(province.populationCapacity0) ||
            province.populationCapacity0 <= 0 || Math.floor(province.populationCapacity0) !== province.populationCapacity0) {
          fault('province ' + province.id + ': populationCapacity0 must be a positive integer.');
        }
      }
    }
    for (var ri = 0; ri < realmsList.length; ri++) {
      var realm = realmsList[ri];
      if (!realm || !realm.id) { fault('realm at index ' + ri + ' has no id.'); continue; }
      if (realms[realm.id]) fault('duplicate realm id ' + realm.id + '.');
      realms[realm.id] = realm;
    }

    for (var rid in realms) {
      if (!Object.prototype.hasOwnProperty.call(realms, rid)) continue;
      var realmDef = realms[rid];
      if (realmDef.liege && !realms[realmDef.liege]) {
        fault('realm ' + rid + ' has missing liege ' + realmDef.liege + '.');
      }
      if (topDefinitionRealm(realms, rid) === null) fault('realm ' + rid + ' has a liege cycle.');
      var capital = provinceIds[realmDef.capital];
      if (!capital || capital.wasteland) fault('realm ' + rid + ' has invalid capital ' + realmDef.capital + '.');
      if (capital && !capital.wasteland && capital.realm !== rid) {
        fault('realm ' + rid + ' does not own its capital.');
      }
      if (realmDef.ruler) {
        if (!validRulerProfile(realmDef.ruler)) {
          fault('realm ' + rid + ' has an invalid ruler profile.');
        }
      }
      if (realmDef.religion !== undefined &&
          (!FB.faithExists(realmDef.religion, null) ||
           !FB.faithAssignable(realmDef.religion, null))) {
        fault('realm ' + rid + ' has invalid or unassignable faith ' +
          realmDef.religion + '.');
      }
    }

    if (definition.religiousHeads !== undefined) {
      var religiousHeads = definition.religiousHeads;
      if (!religiousHeads || typeof religiousHeads !== 'object' ||
          Array.isArray(religiousHeads)) {
        fault('religiousHeads must be an object mapping faith ids to realm ids.');
      } else {
        for (var religionId in religiousHeads) {
          if (!Object.prototype.hasOwnProperty.call(religiousHeads, religionId)) continue;
          var mappedFaithId = FB.faithExists(religionId, null) ? religionId :
            (FB.religiousOfficeReligion &&
              FB.religiousOfficeReligion(null, religionId));
          var religion = mappedFaithId ? FB.religionOf(mappedFaithId, null) : null;
          var headRealmId = religiousHeads[religionId];
          if (!religion || !religion.head) {
            fault('religiousHeads has invalid faith or office ' + religionId + '.');
          } else if (typeof headRealmId !== 'string' || !headRealmId ||
              !realms[headRealmId]) {
            fault('religiousHeads.' + religionId + ' has invalid realm ' +
              headRealmId + '.');
          }
        }
      }
    }

    for (var pvi = 0; pvi < provinces.length; pvi++) {
      var pr = provinces[pvi];
      if (!pr || !pr.id) continue;
      if (pr.communities !== undefined && pr.communities !== null) {
        if (pr.wasteland) {
          fault('wasteland ' + pr.id + ' declares communities.');
        } else if (!Array.isArray(pr.communities) || !pr.communities.length) {
          fault('province ' + pr.id + ' communities must be a non-empty array.');
        } else {
          var seenCommunities = {};
          for (var pci = 0; pci < pr.communities.length; pci++) {
            var community = pr.communities[pci] || {};
            var where = 'province ' + pr.id + ' community ' + pci;
            if (!FBDATA.cultures[community.culture]) {
              fault(where + ' has invalid culture ' + community.culture + '.');
            }
            if (!FB.faithExists(community.religion, null) ||
                !FB.faithAssignable(community.religion, null)) {
              fault(where + ' has invalid or unassignable faith ' +
                community.religion + '.');
            }
            var communityKey = community.culture + '|' + community.religion;
            if (seenCommunities[communityKey]) {
              fault('province ' + pr.id + ' repeats community ' +
                community.culture + '/' + community.religion + '.');
            }
            seenCommunities[communityKey] = 1;
          }
          var principalCommunity = pr.communities[0] || {};
          if (principalCommunity.culture !== pr.culture ||
              principalCommunity.religion !== pr.religion) {
            fault('province ' + pr.id +
              ' principal community must match its culture and religion.');
          }
        }
      }
      if (pr.wasteland) continue;
      if (!realms[pr.realm]) fault('province ' + pr.id + ' has invalid realm ' + pr.realm + '.');
      if (!pr.duchy || !duchies[pr.duchy]) fault('province ' + pr.id + ' has invalid duchy ' + pr.duchy + '.');
      if (!FBDATA.cultures[pr.culture]) fault('province ' + pr.id + ' has invalid culture ' + pr.culture + '.');
      if (!FB.faithExists(pr.religion, null) ||
          !FB.faithAssignable(pr.religion, null)) {
        fault('province ' + pr.id + ' has invalid or unassignable faith ' +
          pr.religion + '.');
      }
      if (!isFinite(pr.dev) || pr.dev < 1 || pr.dev > 10) {
        fault('province ' + pr.id + ' has development outside 1–10.');
      }
    }
    for (var did in duchies) {
      if (!Object.prototype.hasOwnProperty.call(duchies, did)) continue;
      if (!duchies[did].kingdom || !kingdoms[duchies[did].kingdom]) {
        fault('duchy ' + did + ' has invalid kingdom ' + duchies[did].kingdom + '.');
      }
    }
    for (var kid in kingdoms) {
      if (!Object.prototype.hasOwnProperty.call(kingdoms, kid)) continue;
      if (!kingdoms[kid].empire || !empires[kingdoms[kid].empire]) {
        fault('kingdom ' + kid + ' has invalid empire ' + kingdoms[kid].empire + '.');
      }
    }

    /* Historical settlement sites. The shared physical table is validated
       here; county membership of each coordinate is a compilation concern
       because the simplified county boundary does not exist until the raster
       is built. A province without a `settlements` list is valid — it keeps
       deterministic generated settlements. */
    var siteSlug = /^[a-z0-9]+(_[a-z0-9]+)*$/;
    var siteTable = FBDATA.settlementSites;
    if (siteTable !== undefined) {
      if (!siteTable || typeof siteTable !== 'object' || Array.isArray(siteTable)) {
        fault('FBDATA.settlementSites must be an object keyed by site id.');
        siteTable = null;
      } else {
        for (var siteId in siteTable) {
          if (!Object.prototype.hasOwnProperty.call(siteTable, siteId)) continue;
          if (!siteSlug.test(siteId)) fault('invalid settlement site id ' + siteId + '.');
          var siteRec = siteTable[siteId] || {};
          if (!isFinite(siteRec.x) || siteRec.x < -180 || siteRec.x > 180 ||
              !isFinite(siteRec.y) || siteRec.y < -90 || siteRec.y > 90) {
            fault('settlement site ' + siteId + ' has invalid coordinates.');
          }
        }
      }
    }
    var supportedKinds = { village:1, town:1, city:1 };
    var siteCounty = {};
    for (var svi = 0; svi < provinces.length; svi++) {
      var sv = provinces[svi];
      if (!sv || !sv.id || sv.settlements === undefined || sv.settlements === null) continue;
      if (sv.wasteland) {
        fault('wasteland ' + sv.id + ' declares settlements.');
        continue;
      }
      var svList = sv.settlements;
      if (!Array.isArray(svList) || !svList.length || svList.length > 8) {
        fault('province ' + sv.id + ' settlements must be an array of 1–8 records.');
        continue;
      }
      var svSites = {}, svNames = {};
      for (var svi2 = 0; svi2 < svList.length; svi2++) {
        var svEntry = svList[svi2] || {};
        var svWhere = 'province ' + sv.id + ' settlement ' + svi2;
        if (typeof svEntry.site !== 'string' || !siteSlug.test(svEntry.site)) {
          fault(svWhere + ' has an invalid site id.');
        } else {
          if (siteTable && !siteTable[svEntry.site]) {
            fault(svWhere + ' references missing site ' + svEntry.site + '.');
          }
          if (svSites[svEntry.site]) {
            fault('province ' + sv.id + ' repeats site ' + svEntry.site + '.');
          }
          svSites[svEntry.site] = 1;
          if (siteCounty[svEntry.site] && siteCounty[svEntry.site] !== sv.id) {
            fault('site ' + svEntry.site + ' is assigned to both ' +
              siteCounty[svEntry.site] + ' and ' + sv.id + '.');
          }
          siteCounty[svEntry.site] = sv.id;
        }
        if (typeof svEntry.name !== 'string' || !svEntry.name) {
          fault(svWhere + ' has no name.');
        } else {
          if (svNames[svEntry.name]) {
            fault('province ' + sv.id + ' repeats settlement name ' + svEntry.name + '.');
          }
          svNames[svEntry.name] = 1;
        }
        if (!supportedKinds[svEntry.kind]) {
          fault(svWhere + ' has invalid kind ' + svEntry.kind + '.');
        }
      }
    }

    /* Great holy wars are optional head metadata. Their ids must resolve
       against this exact bookmark so a mod cannot install a campaign whose
       sacred counties or target kingdoms disappear at activation. */
    var ghwReligionIds = FB.religionIds ? FB.religionIds(null, false) :
      Object.keys(FBDATA.religions);
    for (var ghwReligionIndex = 0; ghwReligionIndex < ghwReligionIds.length;
        ghwReligionIndex++) {
      var ghwReligionId = ghwReligionIds[ghwReligionIndex];
      var ghwReligion = FB.religionOf(ghwReligionId, null);
      var ghw = ghwReligion && ghwReligion.head && ghwReligion.head.greatHolyWar;
      if (!ghw) continue;
      var ghwSource = FB.faithValue &&
        FB.faithValue(null, ghwReligionId, 'head.greatHolyWar').sourceId;
      if (ghwSource && ghwSource !== ghwReligionId) continue;
      if (typeof ghw !== 'object' || Array.isArray(ghw)) {
        fault('faith ' + ghwReligionId + ' greatHolyWar must be an object.');
        continue;
      }
      if (typeof ghw.name !== 'string' || !ghw.name) {
        fault('faith ' + ghwReligionId + ' greatHolyWar has no name.');
      }
      var ghwDate = ghw.minDate || {};
      if (!isFinite(ghwDate.year) || !isFinite(ghwDate.season) ||
          !isFinite(ghwDate.day) || ghwDate.season < 0 || ghwDate.season > 3 ||
          ghwDate.day < 1 || ghwDate.day > 90) {
        fault('faith ' + ghwReligionId + ' greatHolyWar has an invalid minDate.');
      }
      if (ghw.firstTarget && !kingdoms[ghw.firstTarget]) {
        fault('faith ' + ghwReligionId + ' greatHolyWar has invalid firstTarget ' +
          ghw.firstTarget + '.');
      }
      if (ghw.firstByYear !== undefined && !isFinite(ghw.firstByYear)) {
        fault('faith ' + ghwReligionId +
          ' greatHolyWar has invalid firstByYear.');
      }
      var ghwTargets = Array.isArray(ghw.sacredTargets) ? ghw.sacredTargets : [];
      if (!ghwTargets.length) {
        fault('faith ' + ghwReligionId + ' greatHolyWar needs sacredTargets.');
      }
      for (var ghwTargetIndex = 0; ghwTargetIndex < ghwTargets.length; ghwTargetIndex++) {
        var ghwTarget = ghwTargets[ghwTargetIndex] || {};
        if (!kingdoms[ghwTarget.kingdom]) {
          fault('faith ' + ghwReligionId + ' greatHolyWar has invalid sacred kingdom ' +
            ghwTarget.kingdom + '.');
        }
        var ghwCounties = Array.isArray(ghwTarget.counties) ? ghwTarget.counties : [];
        if (!ghwCounties.length) {
          fault('faith ' + ghwReligionId + ' greatHolyWar sacred target ' +
            ghwTarget.kingdom + ' has no counties.');
        }
        for (var ghwCountyIndex = 0; ghwCountyIndex < ghwCounties.length; ghwCountyIndex++) {
          var ghwCountyId = ghwCounties[ghwCountyIndex];
          var ghwCounty = provinceIds[ghwCountyId];
          var ghwDuchy = ghwCounty && duchies[ghwCounty.duchy];
          if (!ghwCounty || ghwCounty.wasteland ||
              !ghwDuchy || ghwDuchy.kingdom !== ghwTarget.kingdom) {
            fault('faith ' + ghwReligionId + ' greatHolyWar has invalid sacred county ' +
              ghwCountyId + ' for ' + ghwTarget.kingdom + '.');
          }
        }
      }
      if (ghw.firstTarget) {
        var ghwFirstSacred = false;
        for (var ghwFirstIndex = 0; ghwFirstIndex < ghwTargets.length; ghwFirstIndex++) {
          if (ghwTargets[ghwFirstIndex] &&
              ghwTargets[ghwFirstIndex].kingdom === ghw.firstTarget) {
            ghwFirstSacred = true;
            break;
          }
        }
        if (!ghwFirstSacred) {
          fault('faith ' + ghwReligionId +
            ' greatHolyWar firstTarget must appear in sacredTargets.');
        }
      }
      var ghwCrisis = Array.isArray(ghw.crisisKingdoms) ? ghw.crisisKingdoms : [];
      for (var ghwCrisisIndex = 0; ghwCrisisIndex < ghwCrisis.length; ghwCrisisIndex++) {
        if (!kingdoms[ghwCrisis[ghwCrisisIndex]]) {
          fault('faith ' + ghwReligionId + ' greatHolyWar has invalid crisis kingdom ' +
            ghwCrisis[ghwCrisisIndex] + '.');
        }
      }
      for (var ghwChanceIndex = 0; ghwChanceIndex < 2; ghwChanceIndex++) {
        var ghwChanceKey = ghwChanceIndex ? 'crisisChance' : 'yearlyChance';
        if (ghw[ghwChanceKey] !== undefined &&
            (!isFinite(ghw[ghwChanceKey]) || ghw[ghwChanceKey] < 0 ||
             ghw[ghwChanceKey] > 1)) {
          fault('faith ' + ghwReligionId + ' greatHolyWar has invalid ' +
            ghwChanceKey + '.');
        }
      }
      if (ghw.crisisShare !== undefined &&
          (!isFinite(ghw.crisisShare) || ghw.crisisShare < 0 ||
           ghw.crisisShare > 1)) {
        fault('faith ' + ghwReligionId +
          ' greatHolyWar has invalid crisisShare.');
      }
      if (ghw.lossGuaranteeYears !== undefined &&
          (!isFinite(ghw.lossGuaranteeYears) || ghw.lossGuaranteeYears < 1)) {
        fault('faith ' + ghwReligionId +
          ' greatHolyWar has invalid lossGuaranteeYears.');
      }
    }

    var straits = Array.isArray(definition.straits) ? definition.straits : [];
    var straitKeys = {};
    for (var si = 0; si < straits.length; si++) {
      var strait = straits[si];
      if (!Array.isArray(strait) || strait.length !== 2 ||
          !provinceIds[strait[0]] || !provinceIds[strait[1]] || strait[0] === strait[1]) {
        fault('broken strait at index ' + si + '.');
        continue;
      }
      if (provinceIds[strait[0]].wasteland || provinceIds[strait[1]].wasteland) {
        fault('strait at index ' + si + ' ends in wasteland.');
      }
      var skey = strait[0] < strait[1] ? strait[0] + '|' + strait[1] : strait[1] + '|' + strait[0];
      if (straitKeys[skey]) fault('duplicate strait ' + skey + '.');
      straitKeys[skey] = 1;
    }
    var crossingClasses = definition.crossingClasses || {};
    if (!crossingClasses || typeof crossingClasses !== 'object' ||
        Array.isArray(crossingClasses)) {
      fault('crossingClasses must be an object keyed by canonical strait pairs.');
    } else {
      var supportedCrossings = { narrow:1, coastal:1, open:1 };
      for (var crossingKey in crossingClasses) {
        if (!Object.prototype.hasOwnProperty.call(crossingClasses, crossingKey)) continue;
        var crossingParts = crossingKey.split('|');
        if (crossingParts.length !== 2 || !crossingParts[0] || !crossingParts[1] ||
            crossingParts[0] >= crossingParts[1]) {
          fault('crossing class key ' + crossingKey + ' is not canonical.');
        } else if (!provinceIds[crossingParts[0]] || !provinceIds[crossingParts[1]]) {
          fault('crossing class ' + crossingKey + ' references a missing province.');
        } else if (!straitKeys[crossingKey]) {
          fault('crossing class ' + crossingKey + ' does not reference a strait.');
        }
        if (!supportedCrossings[crossingClasses[crossingKey]]) {
          fault('crossing class ' + crossingKey + ' has invalid class ' +
            crossingClasses[crossingKey] + '.');
        }
      }
    }

    var scripts = Array.isArray(definition.scripted) ? definition.scripted : [];
    var scriptIds = {};
    for (var ei = 0; ei < scripts.length; ei++) {
      var event = scripts[ei] || {};
      var season = event.season === undefined ? 0 : event.season;
      var day = event.day === undefined ? 1 : event.day;
      if (!isFinite(event.year) || season < 0 || season > 3 || day < 1 || day > 90) {
        fault('scripted event at index ' + ei + ' has an invalid date.');
      }
      if ((event.season !== undefined || event.day !== undefined) && !event.id) {
        fault('precise scripted event at index ' + ei + ' requires a stable id.');
      }
      if (event.id) {
        if (!/^[a-z0-9_-]+$/i.test(event.id) || scriptIds[event.id]) {
          fault('invalid or duplicate scripted id ' + event.id + '.');
        }
        scriptIds[event.id] = 1;
      }
      if (event.realm && !realms[event.realm]) {
        fault('scripted event at index ' + ei + ' has invalid realm ' + event.realm + '.');
      }
      if (!event.newRealm && !event.realm) {
        fault('scripted event at index ' + ei + ' has no acting realm.');
      }
      if (event.newRealm) {
        if (!event.newRealm.id || !/^[a-z0-9_]+$/i.test(event.newRealm.id) ||
            realms[event.newRealm.id] || !provinceIds[event.newRealm.capital] ||
            provinceIds[event.newRealm.capital].wasteland ||
            (event.newRealm.liege && !realms[event.newRealm.liege]) ||
            (event.newRealm.religion &&
              (!FB.faithExists(event.newRealm.religion, null) ||
               !FB.faithAssignable(event.newRealm.religion, null))) ||
            (event.newRealm.ruler && !validRulerProfile(event.newRealm.ruler))) {
          fault('scripted event at index ' + ei + ' has an invalid new realm.');
        }
      }
      var targets = Array.isArray(event.targets) ? event.targets : [];
      if (!targets.length) fault('scripted event at index ' + ei + ' has no targets.');
      for (var ti = 0; ti < targets.length; ti++) {
        if (!provinceIds[targets[ti]]) {
          fault('scripted event at index ' + ei + ' targets missing province ' + targets[ti] + '.');
        }
      }
    }
    return errors;
  };

  function installDefinition(definition) {
    for (var i = 0; i < WORLD_FIELDS.length; i++) {
      FBDATA[WORLD_FIELDS[i]] = definition[WORLD_FIELDS[i]];
    }
    FB.activeBookmark = definition;
    FB.activeBookmarkId = definition.id;
    if (FB.resetWorldDataCaches) FB.resetWorldDataCaches();
    if (FB.invalidateRealmCache) FB.invalidateRealmCache();
    if (FB.indexEventMessages) FB.indexEventMessages();
  }

  function bindWorld(world) {
    FB.world = world;
    if (FB.map && FB.map.canvas && FB.map.useWorld) FB.map.useWorld();
  }

  /* ================= MAP GENERATION ================= */

  function fillPolyScanline(mask, W, H, pts, value) {
    // pts: projected [[x,y],...]; even-odd scanline fill
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
    const y0 = Math.max(0, Math.floor(minY)), y1 = Math.min(H - 1, Math.ceil(maxY));
    for (let y = y0; y <= y1; y++) {
      const yc = y + 0.5;
      const xs = [];
      for (let i = 0, n = pts.length; i < n; i++) {
        const a = pts[i], b = pts[(i + 1) % n];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) {
          xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
        }
      }
      xs.sort(function (p, q) { return p - q; });
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.max(0, Math.round(xs[k])), xb = Math.min(W - 1, Math.round(xs[k + 1]) - 1);
        for (let x = xa; x <= xb; x++) mask[y * W + x] = value;
      }
    }
  }

  function projectPoly(flat) {
    const out = [];
    for (let i = 0; i < flat.length; i += 2) out.push([FB.lonToX(flat[i]), FB.latToY(flat[i + 1])]);
    return out;
  }

  /* Async world build. progress(frac, msg), done(world) */
  function buildWorld(progress, done) {
    const gridW = 1100;
    FB.initProjection(gridW);
    const W = FB.proj.W, H = FB.proj.H;
    const land = new Uint8Array(W * H);
    const landmass = new Uint16Array(W * H); // 0 = sea, else FBDATA.land index+1
    const grid = new Uint16Array(W * H); // 0 = sea, else provinceIndex+1

    const provs = FBDATA.provinces.map(function (p, i) {
      return {
        idx: i, id: p.id, name: p.name, wasteland: !!p.wasteland,
        terrain: p.terrain || 'farmland', culture: p.culture, religion: p.religion,
        realm0: p.realm || null, dev0: p.dev || 1, duchy: p.duchy || null,
        settlements: p.settlements || null,
        legacySettlementPresentation:p._legacySettlementPresentation || null,
        communities: p.communities ? FB.provinceCommunities(p) : null,
        sx: Math.round(FB.lonToX(p.x)), sy: Math.round(FB.latToY(p.y)),
        cx: 0, cy: 0, area: 0, coastal: false
      };
    });
    let siteFaults = [];

    const steps = [];

    steps.push(function () {
      progress(0.1, 'Raising the continents…');
      for (let li = 0; li < FBDATA.land.length; li++) {
        const pts = projectPoly(FBDATA.land[li]);
        fillPolyScanline(land, W, H, pts, 1);
        fillPolyScanline(landmass, W, H, pts, li + 1);
      }
    });
    steps.push(function () {
      progress(0.25, 'Filling the seas…');
      for (const poly of FBDATA.seas) {
        const pts = projectPoly(poly);
        fillPolyScanline(land, W, H, pts, 0);
        fillPolyScanline(landmass, W, H, pts, 0);
      }
      // snap seeds that fell in water to nearest land pixel
      for (const pr of provs) {
        pr.sx = FB.clamp(pr.sx, 0, W - 1); pr.sy = FB.clamp(pr.sy, 0, H - 1);
        if (!land[pr.sy * W + pr.sx]) {
          let found = false;
          for (let r = 1; r < 50 && !found; r++) {
            for (let dy = -r; dy <= r && !found; dy++) {
              for (let dx = -r; dx <= r && !found; dx++) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                const nx = pr.sx + dx, ny = pr.sy + dy;
                if (nx >= 0 && ny >= 0 && nx < W && ny < H && land[ny * W + nx]) {
                  pr.sx = nx; pr.sy = ny; found = true;
                }
              }
            }
          }
        }
        pr.landmass = landmass[pr.sy * W + pr.sx];
      }
    });

    // Nearest-seed assignment in row bands. A seed competes only on its
    // authored land polygon, preventing island counties from acquiring
    // disconnected mainland fragments across water. An unseeded polygon
    // falls back to all seeds so mod-added scenery remains visible.
    // Seeds are sorted by x so each pixel only scans the x-window that can
    // beat its current best (ties still go to the lowest province index).
    const BAND = 80;
    let bandStart = 0;
    let sorted = null, sxArr = null, landmassSeeds = null;
    function assignBand() {
      if (!sorted) {
        sorted = provs.slice().sort(function (a, b) { return a.sx - b.sx; });
        sxArr = sorted.map(function (p) { return p.sx; });
        landmassSeeds = {};
        for (const pr of provs) {
          if (pr.landmass) landmassSeeds[pr.landmass] = (landmassSeeds[pr.landmass] || 0) + 1;
        }
      }
      const n = sorted.length;
      const yEnd = Math.min(H, bandStart + BAND);
      for (let y = bandStart; y < yEnd; y++) {
        for (let x = 0; x < W; x++) {
          if (!land[y * W + x]) continue;
          const lm = landmass[y * W + x];
          const restrictLandmass = landmassSeeds[lm] ? lm : 0;
          // binary search: first seed with sx >= x
          let lo = 0, hi = n;
          while (lo < hi) { const mid = (lo + hi) >> 1; if (sxArr[mid] < x) lo = mid + 1; else hi = mid; }
          let best = -1, bd = Infinity, bIdx = Infinity;
          for (let i = lo; i < n; i++) { // walk right
            const dx = sxArr[i] - x; if (dx * dx > bd) break;
            if (restrictLandmass && sorted[i].landmass !== restrictLandmass) continue;
            const dy = sorted[i].sy - y, d = dx * dx + dy * dy;
            if (d < bd || (d === bd && sorted[i].idx < bIdx)) { bd = d; best = i; bIdx = sorted[i].idx; }
          }
          for (let i = lo - 1; i >= 0; i--) { // walk left
            const dx = x - sxArr[i]; if (dx * dx > bd) break;
            if (restrictLandmass && sorted[i].landmass !== restrictLandmass) continue;
            const dy = sorted[i].sy - y, d = dx * dx + dy * dy;
            if (d < bd || (d === bd && sorted[i].idx < bIdx)) { bd = d; best = i; bIdx = sorted[i].idx; }
          }
          const pr = sorted[best];
          grid[y * W + x] = pr.idx + 1;
          pr.cx += x; pr.cy += y; pr.area++;
        }
      }
      bandStart = yEnd;
      return bandStart >= H;
    }
    // queue bands as steps
    const nBands = Math.ceil(1000 / BAND) + 20; // upper bound; loop breaks when done
    for (let b = 0; b < nBands; b++) {
      steps.push(function () {
        progress(0.3 + 0.55 * Math.min(1, bandStart / H), 'Carving provinces…');
        let finished = false;
        for (let k = 0; k < 1 && !finished; k++) finished = assignBand();
        return finished ? 'skiprest' : null;
      });
    }

    steps.push(function () {
      progress(0.9, 'Drawing borders…');
      /* Nearest-seed assignment on the single Afro-Eurasian land polygon lets
         a county win land across a carved sea wherever the far shore has no
         nearer seed (Tangier held the Gibraltar shore, Mecca the Nubian
         coast). No 867 county spanned such waters, so a fragment cut off
         from its seed on the same landmass passes to the neighboring county
         it actually borders. Fragments on another authored land polygon
         stay: that is the unseeded-polygon fallback that hands islands to
         their nearest county (Venice's lagoon islands). */
      const seedAt = {};
      for (const pr of provs) seedAt[pr.idx] = pr.sy * W + pr.sx;
      const seen = new Uint8Array(W * H);
      const orphan = new Uint8Array(W * H);
      const stack = [];
      for (let i = 0; i < W * H; i++) {
        const v = grid[i];
        if (!v || seen[i]) continue;
        const pidx = v - 1;
        let hasSeed = false;
        const comp = [];
        seen[i] = 1; stack.push(i);
        while (stack.length) {
          const c = stack.pop(); comp.push(c);
          if (c === seedAt[pidx]) hasSeed = true;
          const cx = c % W, cy = (c / W) | 0;
          if (cx > 0 && grid[c - 1] === v && !seen[c - 1]) { seen[c - 1] = 1; stack.push(c - 1); }
          if (cx < W - 1 && grid[c + 1] === v && !seen[c + 1]) { seen[c + 1] = 1; stack.push(c + 1); }
          if (cy > 0 && grid[c - W] === v && !seen[c - W]) { seen[c - W] = 1; stack.push(c - W); }
          if (cy < H - 1 && grid[c + W] === v && !seen[c + W]) { seen[c + W] = 1; stack.push(c + W); }
        }
        if (hasSeed) continue;
        const seedLm = provs[pidx].landmass;
        for (const c of comp) {
          if (landmass[c] === seedLm) orphan[c] = 1;
        }
      }
      /* Multi-source flood: an orphan cell adopts the keeper county it
         borders; the flood carries that county into the fragment's interior.
         Orphans ringed only by water or other orphans (an unseeded island)
         are unreachable and keep their assigned county. */
      const queue = [], qOwner = [];
      function adopt(c, owner) {
        const old = provs[grid[c] - 1], nw = provs[owner - 1];
        const x = c % W, y = (c / W) | 0;
        old.cx -= x; old.cy -= y; old.area--;
        nw.cx += x; nw.cy += y; nw.area++;
        orphan[c] = 0; grid[c] = owner;
        queue.push(c); qOwner.push(owner);
      }
      for (let i = 0; i < W * H; i++) {
        if (!orphan[i]) continue;
        const cx = i % W, cy = (i / W) | 0;
        const nb = [];
        if (cx > 0) nb.push(i - 1);
        if (cx < W - 1) nb.push(i + 1);
        if (cy > 0) nb.push(i - W);
        if (cy < H - 1) nb.push(i + W);
        for (const q of nb) {
          if (grid[q] && !orphan[q] && grid[q] !== grid[i]) { adopt(i, grid[q]); break; }
        }
      }
      for (let qh = 0; qh < queue.length; qh++) {
        const c = queue[qh], owner = qOwner[qh];
        const cx = c % W, cy = (c / W) | 0;
        if (cx > 0 && orphan[c - 1]) adopt(c - 1, owner);
        if (cx < W - 1 && orphan[c + 1]) adopt(c + 1, owner);
        if (cy > 0 && orphan[c - W]) adopt(c - W, owner);
        if (cy < H - 1 && orphan[c + W]) adopt(c + W, owner);
      }
      // centroids
      for (const pr of provs) {
        if (pr.area > 0) { pr.cx = Math.round(pr.cx / pr.area); pr.cy = Math.round(pr.cy / pr.area); }
        else { pr.cx = pr.sx; pr.cy = pr.sy; }
        // centroid may fall outside the province (concave); snap to seed if mismatched
        const at = grid[pr.cy * W + pr.cx];
        if (at !== pr.idx + 1) { pr.cx = pr.sx; pr.cy = pr.sy; }
      }
      // adjacency + coastal
      const adj = {}, waterAdj = {};
      for (const pr of provs) {
        adj[pr.id] = {};
        waterAdj[pr.id] = {};
      }
      for (let y = 0; y < H - 1; y++) {
        for (let x = 0; x < W - 1; x++) {
          const a = grid[y * W + x];
          const r = grid[y * W + x + 1], d = grid[(y + 1) * W + x];
          if (!a) continue;
          const pa = provs[a - 1];
          if (!r || !d) pa.coastal = true;
          if (r && r !== a) { adj[pa.id][provs[r - 1].id] = 1; adj[provs[r - 1].id][pa.id] = 1; }
          if (d && d !== a) { adj[pa.id][provs[d - 1].id] = 1; adj[provs[d - 1].id][pa.id] = 1; }
        }
      }
      for (const s of (FBDATA.straits || [])) {
        if (adj[s[0]] && adj[s[1]]) {
          const key = s[0] < s[1] ? s[0] + '|' + s[1] : s[1] + '|' + s[0];
          const crossingClass = (FBDATA.crossingClasses || {})[key] || 'narrow';
          adj[s[0]][s[1]] = 1; adj[s[1]][s[0]] = 1;
          waterAdj[s[0]][s[1]] = crossingClass;
          waterAdj[s[1]][s[0]] = crossingClass;
        }
      }
      const byId = {};
      for (const pr of provs) byId[pr.id] = pr;
      FB.world = {
        W: W, H: H, grid: grid, land: land, landmass: landmass, provs: provs, byId: byId,
        adj: adj, waterAdj: waterAdj
      };
      progress(0.97, 'Surveying settlements…');
      siteFaults = compileSites(FB.world);
    });

    let si = 0;
    function step() {
      while (si < steps.length) {
        const res = steps[si](); si++;
        if (res === 'skiprest') {
          // skip remaining band steps (they're all band fns until the final step)
          while (si < steps.length - 1) si++;
        }
        if (si < steps.length) { setTimeout(step, 0); return; }
      }
      progress(1, 'The world is made.');
      if (siteFaults.length) {
        done(new Error(siteFaults.join('\n')));
      } else {
        done(null, FB.world);
      }
     }
     setTimeout(step, 0);
  }

  /* The one callback-based switcher used by boot, new-game previews, and save
     restoration. Raster results are cached per atomic bookmark for the rest of
     the page session; map input remains wired to the same visible canvas. */
  FB.activateBookmark = function (id, progress, done) {
    var requestedId = id === undefined || id === null
      ? defaultBookmarkId() : String(id);
    var definition = bookmarkDefinition(requestedId);
    progress = progress || function () {};
    done = done || function () {};
    if (!definition) {
      setTimeout(function () { done(new Error('Unknown bookmark: ' + requestedId)); }, 0);
      return;
    }
    var errors = FB.validateBookmark(definition);
    if (errors.length) {
      setTimeout(function () { done(new Error(errors.join('\n'))); }, 0);
      return;
    }
    installDefinition(definition);
    if (worldCache[definition.id]) {
      bindWorld(worldCache[definition.id]);
      progress(1, 'The world is made.');
      setTimeout(function () { done(null, definition); }, 0);
      return;
    }
    buildWorld(progress, function (error, world) {
      if (error) { done(error); return; }
      worldCache[definition.id] = world;
      bindWorld(world);
      done(null, definition);
    });
  };

  /* Compatibility for old callers and mods: generate the public/default 867
     world. New core code calls FB.activateBookmark directly. */
  FB.generateWorld = function (progress, done) {
    FB.activateBookmark(defaultBookmarkId(), progress, function (error) {
      if (error) throw error;
      if (done) done();
    });
  };

  FB.provinceAtGrid = function (gx, gy) {
    const w = FB.world;
    if (!w || gx < 0 || gy < 0 || gx >= w.W || gy >= w.H) return null;
    const v = w.grid[Math.floor(gy) * w.W + Math.floor(gx)];
    return v ? w.provs[v - 1] : null;
  };

  FB.waterCrossing = function (fromPid, toPid) {
    var water = FB.world && FB.world.waterAdj;
    return water && water[fromPid] && water[fromPid][toPid] || null;
  };

  /* ================= settlement site compilation =================
     Compiled once per bookmark world, after province assignment and
     centroids exist. Every settled county owns an ordered list of site
     records up to SETTLEMENT_MAX_SLOTS: authored presentations first (array
     position is the saved compatibility contract — never renumbered), then
     deterministic generated records covering the remaining slots, so a
     development reveal never projects or searches during play. The compiled
     records are derived world data and are never written into a save. */
  var SETTLEMENT_MAX_SLOTS = 8;
  /* World-pixel snap ceiling for an authored coordinate. The 1100px raster
     spans roughly 12 px per degree of longitude, so 45 px is about 3–4
     degrees: a larger displacement means a wrong site-to-county assignment,
     not ordinary raster simplification. */
  var SETTLEMENT_SNAP_MAX = 45;

  function siteGridIndex(world, x, y) {
    var gx = Math.floor(x), gy = Math.floor(y);
    if (gx < 0 || gy < 0 || gx >= world.W || gy >= world.H) return -1;
    return gy * world.W + gx;
  }

  /* First non-empty expanding ring around (x, y); within that ring pick the
     nearest cell belonging to the province, ties broken by (dy, dx) so the
     result is fully deterministic. Mirrors the seed land-snap above. */
  function nearestCountyCell(world, pr, x, y) {
    var W = world.W, H = world.H, grid = world.grid;
    var cx = Math.round(x), cy = Math.round(y);
    for (var r = 1; r <= SETTLEMENT_SNAP_MAX; r++) {
      var found = false, bd = Infinity, bx = 0, by = 0;
      for (var dy = -r; dy <= r; dy++) {
        for (var dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          var nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          if (grid[ny * W + nx] !== pr.idx + 1) continue;
          var d = dx * dx + dy * dy;
          if (d < bd || (d === bd && (dy < by || (dy === by && dx < bx)))) {
            bd = d; found = true; bx = dx; by = dy;
          }
        }
      }
      if (found) return { x: cx + bx, y: cy + by };
    }
    return null;
  }

  /* Land margin (in raster cells) a site keeps from the sea. A site snapped
     onto a coastal-edge cell is legally inside its county, but the emblem is
     centered on that cell while the close-zoom backdrop smooths the
     coastline, so the art reads as floating offshore. */
  var SITE_SEA_MARGIN = 2;

  /* True when every cell within the emblem's visual radius is land. Cells
     outside the raster or painted as sea count as water; a neighboring
     county's land is fine — the backdrop paints it as land too. */
  function seaClearCell(world, x, y) {
    var W = world.W, H = world.H, grid = world.grid;
    for (var dy = -SITE_SEA_MARGIN; dy <= SITE_SEA_MARGIN; dy++) {
      for (var dx = -SITE_SEA_MARGIN; dx <= SITE_SEA_MARGIN; dx++) {
        var nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) return false;
        if (!grid[ny * W + nx]) return false;
      }
    }
    return true;
  }

  /* Pull a coastal-edge point inland: walk toward the county centroid and
     stop at the first in-county cell with a full land margin that does not
     crowd an already-placed site. The original cell stands when the walk
     finds nothing (islets, fjords, a one-cell coastal strip), and the walk
     never crosses open water — a centroid across a bay means the site lives
     on a separate fragment of its county (Venice's island), where it
     belongs. */
  function seaMarginSnap(world, pr, x, y, placed) {
    if (seaClearCell(world, x, y)) return { x: x, y: y };
    for (var i = 1; i <= 14; i++) {
      var nx = Math.round(x + (pr.cx - x) * i / 14);
      var ny = Math.round(y + (pr.cy - y) * i / 14);
      if (nx < 0 || ny < 0 || nx >= world.W || ny >= world.H) continue;
      if (!world.grid[ny * world.W + nx]) break;
      if (world.grid[ny * world.W + nx] !== pr.idx + 1) continue;
      if (!seaClearCell(world, nx, ny)) continue;
      var clash = false;
      for (var p = 0; p < placed.length; p++) {
        var ddx = nx - placed[p].x, ddy = ny - placed[p].y;
        if (ddx * ddx + ddy * ddy < 9) { clash = true; break; }
      }
      if (!clash) return { x: nx, y: ny };
    }
    /* Concave coasts and narrow peninsulas can leave the direct centroid ray
       outside this county even though the same land fragment has a clear
       inland cell nearby. Search that fragment only: the walk may never jump
       a sea gap or another county, which preserves deliberate islands such as
       Venice. Prefer an uncrowded point, but keeping the emblem on land wins
       over the small inter-site clearance when the fragment is constrained. */
    var radius = SETTLEMENT_SNAP_MAX;
    var width = radius * 2 + 1;
    var seen = new Uint8Array(width * width);
    var qx = [x], qy = [y], qd = [0], head = 0, crowded = null;
    seen[radius * width + radius] = 1;
    while (head < qx.length) {
      var cx = qx[head], cy = qy[head], distance = qd[head];
      head++;
      if (seaClearCell(world, cx, cy)) {
        var occupied = false;
        for (var ci = 0; ci < placed.length; ci++) {
          var cdx = cx - placed[ci].x, cdy = cy - placed[ci].y;
          if (cdx * cdx + cdy * cdy < 9) { occupied = true; break; }
        }
        if (!occupied) return { x:cx, y:cy };
        if (!crowded) crowded = { x:cx, y:cy };
      }
      if (distance >= radius) continue;
      for (var oy = -1; oy <= 1; oy++) {
        for (var ox = -1; ox <= 1; ox++) {
          if (!ox && !oy) continue;
          var tx = cx + ox, ty = cy + oy;
          var rx = tx - x, ry = ty - y;
          if (Math.abs(rx) > radius || Math.abs(ry) > radius ||
              tx < 0 || ty < 0 || tx >= world.W || ty >= world.H) continue;
          var seenIndex = (ry + radius) * width + rx + radius;
          if (seen[seenIndex] || world.grid[ty * world.W + tx] !== pr.idx + 1) continue;
          seen[seenIndex] = 1;
          qx.push(tx); qy.push(ty); qd.push(distance + 1);
        }
      }
    }
    if (crowded) return crowded;
    return { x: x, y: y };
  }

  /* Deterministic in-county point for a generated slot: the hash gives each
     slot its own angle and radius band scaled to the county, so slots spread
     across the county instead of stacking on its centroid. Candidates keep a
     few cells clear of every already-placed site where the county allows it,
     relaxing the clearance as the search widens; the guaranteed in-county
     centroid remains the last resort for a tiny or concave county. */
  function generatedSitePoint(world, pr, slot, placed) {
    var W = world.W, H = world.H, grid = world.grid;
    var h = strHash(pr.id + '@site@' + slot);
    var baseAngle = (h % 628) / 100;
    /* effective county radius from its raster area, floored so a small
       county still has room to spread */
    var estR = Math.max(6, Math.round(Math.sqrt((pr.area || 36) / 3.2)));
    function clearOf(x, y, minD2) {
      if (x < 0 || y < 0 || x >= W || y >= H) return false;
      if (grid[y * W + x] !== pr.idx + 1) return false;
      for (var i = 0; i < placed.length; i++) {
        var ddx = x - placed[i].x, ddy = y - placed[i].y;
        if (ddx * ddx + ddy * ddy < minD2) return false;
      }
      return true;
    }
    var clearances = [16, 9, 1];
    for (var pass = 0; pass < clearances.length; pass++) {
      var minD2 = clearances[pass];
      var baseR = Math.max(2, Math.round(estR * (0.3 + 0.1 * (h % 5))));
      for (var ring = 0; ring < 6; ring++) {
        var radius = Math.min(estR + 2, baseR + ring * 2);
        for (var k = 0; k < 8; k++) {
          var ang = baseAngle + k * Math.PI / 4;
          var x = Math.round(pr.cx + Math.cos(ang) * radius);
          var y = Math.round(pr.cy + Math.sin(ang) * radius);
          if (clearOf(x, y, minD2)) {
            placed.push({ x:x, y:y });
            return { x:x, y:y };
          }
        }
      }
      for (var r = 1; r <= SETTLEMENT_SNAP_MAX; r++) {
        for (var dy = -r; dy <= r; dy++) {
          for (var dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            var nx = pr.cx + dx, ny = pr.cy + dy;
            if (clearOf(nx, ny, minD2)) {
              placed.push({ x:nx, y:ny });
              return { x:nx, y:ny };
            }
          }
        }
      }
    }
    placed.push({ x:pr.cx, y:pr.cy });
    return { x:pr.cx, y:pr.cy };
  }

  function compileSites(world) {
    var faults = [];
    var siteTable = FBDATA.settlementSites || {};
    world.sites = [];
    world.sitesByProv = {};
    for (var pi = 0; pi < world.provs.length; pi++) {
      var pr = world.provs[pi];
      if (pr.wasteland) continue;
      var authored = pr.settlements || [];
      /* A legacy province replacement may deliberately omit site data. It
         still inherits the former slot labels, while all physical records are
         freshly generated and remain explicitly unauthored. */
      var legacyPresentation = pr.legacySettlementPresentation || [];
      var records = [];
      var placed = [], seenNames = {}, forcedCount = 0;
      for (var ai = 0; ai < authored.length; ai++) {
        var entry = authored[ai];
        /* fill: true presentations (data/settlements_real.js) replace a
           slot's generated name/location with a real place but, unlike a
           curated entry, do not force early visibility — development reveals
           them on the normal thresholds. */
        if (!entry.fill) forcedCount++;
        var geo = siteTable[entry.site];
        if (!geo) continue; // impossible after bookmark validation; defensive
        var wx = FB.lonToX(geo.x), wy = FB.latToY(geo.y);
        var sx = Math.round(wx), sy = Math.round(wy), snap = 0;
        var cell = siteGridIndex(world, sx, sy);
        if (cell < 0 || world.grid[cell] !== pr.idx + 1) {
          var snapped = nearestCountyCell(world, pr, wx, wy);
          if (!snapped) {
            faults.push('Bookmark ' + (FB.activeBookmarkId || '?') +
              ': settlement site ' + entry.site + ' is assigned to ' + pr.id +
              ' but lies more than ' + SETTLEMENT_SNAP_MAX +
              ' map units outside that county — fix its coordinates or its county assignment.');
            continue;
          }
          sx = snapped.x; sy = snapped.y;
          snap = Math.round(Math.hypot(sx - wx, sy - wy) * 10) / 10;
        }
        var adjusted = seaMarginSnap(world, pr, sx, sy, placed);
        sx = adjusted.x; sy = adjusted.y;
        placed.push({ x: sx, y: sy });
        seenNames[entry.name] = 1;
        records.push({
          pid: pr.id, pidx: pr.idx, index: ai, site: entry.site,
          name: entry.name, kind: entry.kind,
          x: sx, y: sy, authored: true, snap: snap
        });
      }
      for (var gi = authored.length; gi < SETTLEMENT_MAX_SLOTS; gi++) {
        var legacy = legacyPresentation[gi];
        var name = legacy && typeof legacy.name === 'string' && !seenNames[legacy.name]
          ? legacy.name : null;
        var kind = legacy && (legacy.kind === 'village' || legacy.kind === 'town' ||
          legacy.kind === 'city') ? legacy.kind : 'village';
        if (!name) {
          var h = strHash(pr.id + ':' + gi);
          name = FB.settlementName(pr.culture, h);
          while (seenNames[name]) {
            h = (h * 31 + 7) >>> 0;
            name = FB.settlementName(pr.culture, h);
          }
        }
        seenNames[name] = 1;
        var pt = generatedSitePoint(world, pr, gi, placed);
        /* generatedSitePoint already pushed its pick; swap it for the
           inland-adjusted point so coastal slots keep the same sea margin */
        placed.pop();
        pt = seaMarginSnap(world, pr, pt.x, pt.y, placed);
        placed.push(pt);
        records.push({
          pid: pr.id, pidx: pr.idx, index: gi,
          site: 'generated__' + pr.id + '__' + gi,
          name: name, kind: kind,
          x: pt.x, y: pt.y, authored: false, snap: 0
        });
      }
      world.sitesByProv[pr.id] = {
        list: records,
        authored: forcedCount,
        legacyBase: 2 + (strHash(pr.id) % 2)
      };
      for (var ri = 0; ri < records.length; ri++) world.sites.push(records[ri]);
    }
    /* Render/hit priority: head settlements first, then authored before
       generated, then stable province/index order. The renderer sweeps this
       list per live kind rank, so the effective priority is kind, then head
       status, then authored status, then province/index — one deterministic
       order shared by label collision and hit ties. */
    world.sitesRender = world.sites.slice().sort(function (a, b) {
      if ((a.index === 0) !== (b.index === 0)) return a.index === 0 ? -1 : 1;
      if (a.authored !== b.authored) return a.authored ? -1 : 1;
      if (a.pid !== b.pid) return a.pid < b.pid ? -1 : 1;
      return a.index - b.index;
    });
    return faults;
  }

  /* ================= POLITICAL STATE ================= */

  /* Realm hierarchy: every realm has a rank (1 count, 2 duke, 3 king,
     4 emperor) and a liege (realm id or null for sovereigns).
     state.owner[pid] = SOVEREIGN realm id (map color, war targeting);
     state.holder[pid] = the realm holding the county directly. */

  /* owner/holder-derived lists, rebuilt lazily once per turn or after
     any transfer (the AI loop consults them per realm per year) */
  let rc = { turn: -1, dirty: true, provs: null, strength: null, held: null };
  function rcEnsure(state) {
    if (rc.turn === state.turn && !rc.dirty) return;
    rc.turn = state.turn; rc.dirty = false;
    rc.provs = {}; rc.strength = {}; rc.held = {};
    for (const pid in state.owner) {
      const o = state.owner[pid];
      (rc.provs[o] = rc.provs[o] || []).push(pid);
      rc.strength[o] = (rc.strength[o] || 0) + (state.dev[pid] || 1);
      const h = (state.holder && state.holder[pid]) || o;
      (rc.held[h] = rc.held[h] || []).push(pid);
    }
  }
  FB.invalidateRealmCache = function () { rc.dirty = true; };

  FB.topRealm = function (state, rid) {
    let cur = rid, guard = 0;
    while (cur && state.realms[cur] && state.realms[cur].liege && guard++ < 20) cur = state.realms[cur].liege;
    return cur || rid;
  };

  /* [rid, its liege, ..., the sovereign] */
  FB.liegeChain = function (state, rid) {
    const out = [];
    let cur = rid, guard = 0;
    while (cur && state.realms[cur] && guard++ < 20) { out.push(cur); cur = state.realms[cur].liege; }
    return out;
  };

  /* A lord may raise one servant far; repeatedly enriching the same man in
     one lifetime is another matter. Every successful feudal grant compounds
     the odds of the next by balance.liegeGrantRepeatMult. Purchases, conquest,
     settlement, inheritance, and de jure promotions never call this helper. */
  FB.liegeGrantMultiplier = function (state) {
    const B = FBDATA.balance;
    const mult = B.liegeGrantRepeatMult !== undefined ? B.liegeGrantRepeatMult : 0.2;
    return Math.pow(mult, (state.player && state.player.liegeGrants) || 0);
  };
  FB.liegeGrantChance = function (state, chance) {
    return FB.clamp(chance, 0, 1) * FB.liegeGrantMultiplier(state);
  };
  FB.recordLiegeGrant = function (state) {
    state.player.liegeGrants = (state.player.liegeGrants || 0) + 1;
  };

  /* de jure ids of a county: {duchy, kingdom, empire} */
  FB.dejureOf = function (pid) {
    const pr = FB.world && FB.world.byId[pid];
    if (!pr || !pr.duchy) return {};
    const d = FBDATA.duchies[pr.duchy];
    const k = d && FBDATA.kingdoms[d.kingdom];
    return { duchy: pr.duchy, kingdom: d ? d.kingdom : null, empire: k ? k.empire : null };
  };

  /* static de jure county lists, built once */
  let dejureCounties = null;
  FB.duchyCounties = function (did) {
    if (!dejureCounties) {
      dejureCounties = {};
      for (const p of FBDATA.provinces) {
        if (p.wasteland || !p.duchy) continue;
        (dejureCounties[p.duchy] = dejureCounties[p.duchy] || []).push(p.id);
      }
    }
    return dejureCounties[did] || [];
  };
  let kingdomCountyLists = {}; // static like dejureCounties; rebuilt per kid on demand
  FB.kingdomCounties = function (kid) {
    if (!kingdomCountyLists[kid]) {
      const out = [];
      for (const did in FBDATA.duchies) {
        if (FBDATA.duchies[did].kingdom === kid) out.push.apply(out, FB.duchyCounties(did));
      }
      kingdomCountyLists[kid] = out;
    }
    return kingdomCountyLists[kid];
  };
  FB.empireKingdoms = function (eid) {
    const out = [];
    for (const kid in FBDATA.kingdoms) if (FBDATA.kingdoms[kid].empire === eid) out.push(kid);
    return out;
  };

  FB.resetWorldDataCaches = function () {
    dejureCounties = null;
    kingdomCountyLists = {};
    rc = { turn: -1, dirty: true, provs: null, strength: null, held: null };
    if (FB.ui && FB.ui.resetLocationSearchCache) FB.ui.resetLocationSearchCache();
  };

  FB.initPolitics = function (state) {
    state.owner = {}; state.dev = {}; state.realms = {}; state.holder = {};
    // authored realms (kings, emperors, independent dukes, authored vassals)
    for (const r of FBDATA.realms) {
      const cap = FB.world.byId[r.capital];
      state.realms[r.id] = {
        id: r.id, name: r.name, color: r.color, capital: r.capital,
        aggression: r.aggression !== undefined ? r.aggression : 1,
        rank: r.rank || 3, liege: r.liege || null,
        techTraditions:Array.isArray(r.techTraditions) ? r.techTraditions.slice() : null,
        techSeed:r.techSeed || null,
        religion: r.religion || (cap ? cap.religion : null),
        alive: true, ruler: makeRuler(cap ? cap.culture : 'frankish', r.ruler, state.date.year),
        war: null, op: 0
      };
    }
    // sovereignty (map color) = the top of each county's realm chain
    for (const pr of FB.world.provs) {
      if (pr.wasteland) continue;
      state.dev[pr.id] = pr.dev0;
      state.owner[pr.id] = FB.topRealm(state, pr.realm0);
    }
    // generate the dukes and counts inside each authored realm
    for (const r of FBDATA.realms) buildVassals(state, r.id);
    FB.invalidateRealmCache();
    FB.ensureReligiousHeads(state);
    FB.ensureDynasticState(state);
    if (FB.seedRealmTechnologies) FB.seedRealmTechnologies(state);
  };

  /* Group a realm's counties by duchy and hand out titles:
     - the capital duchy is the ruler's own demesne (held directly)
     - each other duchy with 2+ counties gets a duke; the duke holds the
       richest county directly, the rest go to counts under him
     - single-county duchies go to counts directly under the realm */
  function buildVassals(state, rid) {
    const realm = state.realms[rid];
    const byDuchy = {};
    for (const pr of FB.world.provs) {
      if (pr.wasteland || pr.realm0 !== rid) continue;
      (byDuchy[pr.duchy] = byDuchy[pr.duchy] || []).push(pr);
    }
    const capDuchy = (FB.world.byId[realm.capital] || {}).duchy;
    for (const did in byDuchy) {
      const counties = byDuchy[did];
      counties.sort(function (a, b) { return b.dev0 - a.dev0; }); // richest first = ducal seat
      if (did === capDuchy) {
        for (const pr of counties) state.holder[pr.id] = rid;
      } else if (counties.length >= 2) {
        const dname = (FBDATA.duchies[did] || {}).name || did;
        const dr = FB.makeVassalRealm(state, {
          id: did, name: 'Duchy of ' + dname, capital: counties[0].id,
          rank: 2, liege: rid, culture: counties[0].culture
        });
        state.holder[counties[0].id] = dr.id;
        for (let i = 1; i < counties.length; i++) {
          const cr = FB.makeVassalRealm(state, {
            id: 'c_' + counties[i].id, name: 'County of ' + counties[i].name,
            capital: counties[i].id, rank: 1, liege: dr.id, culture: counties[i].culture
          });
          state.holder[counties[i].id] = cr.id;
        }
      } else {
        const cr = FB.makeVassalRealm(state, {
          id: 'c_' + counties[0].id, name: 'County of ' + counties[0].name,
          capital: counties[0].id, rank: 1, liege: rid, culture: counties[0].culture
        });
        state.holder[counties[0].id] = cr.id;
      }
    }
  }

  /* spawn a sub-realm (generated duke/count, or a player-granted county) */
  FB.makeVassalRealm = function (state, opts) {
    const top = FB.topRealm(state, opts.liege);
    const r = {
      id: opts.id, name: opts.name,
      color: shade(state.realms[top] ? state.realms[top].color : '#888888', opts.id),
      capital: opts.capital, aggression: 0, rank: opts.rank || 1, liege: opts.liege,
      religion: opts.religion ||
        ((FB.world.byId[opts.capital] || {}).religion || null),
      alive: true, ruler: makeRuler(opts.culture || 'frankish', null,
        state.date && state.date.year), war: null,
      op: 0, generated: true, favor: FB.ri(-15, 15) // the house's standing at its liege's court
    };
    state.realms[r.id] = r;
    if (state.date) FB.ensureRealmSuccession(state, r.id);
    return r;
  };

  /* small deterministic color variation for generated vassals */
  function shade(hex, key) {
    const n = parseInt(hex.slice(1), 16);
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) & 0xffff;
    const f = 0.86 + (h % 5) * 0.07;
    const c = function (v) { return Math.max(0, Math.min(255, Math.round(v * f))); };
    return '#' + ((1 << 24) + (c((n >> 16) & 255) << 16) + (c((n >> 8) & 255) << 8) + c(n & 255)).toString(16).slice(1);
  }

  /* the tempers of generated rulers — a house's personality, read by the
     royal council (schemers, flatterers, loyal men) at king tier and up */
  FB.RULER_TRAITS = ['ambitious', 'content', 'greedy', 'generous', 'cruel', 'kind',
    'deceitful', 'honest', 'proud', 'humble', 'zealous', 'cynical', 'wrathful', 'patient'];

  function makeRuler(culture, authored, year) {
    if (authored) {
      return {
        name: authored.name,
        sex: authored.sex,
        culture: authored.culture,
        born: authored.born,
        age: Math.max(0, (year || (FB.activeBookmark && FB.activeBookmark.date.year) || 867) - authored.born),
        mar: authored.mar,
        trait: authored.trait,
        generation: 1
      };
    }
    const age = FB.ri(20, 55);
    return {
      name: FB.randomName(culture, 'm'),
      sex: 'm',
      culture: culture,
      born: year === undefined ? undefined : year - age,
      age: age,
      mar: FB.ri(2, 14),
      trait: FB.pick(FB.RULER_TRAITS),
      generation: 1
    };
  }

  /* ================= DYNASTIC REALMS & ALLIANCES =================
     Every realm keeps a compact family tree of lightweight members. The living
     court on top of that tree is materialized as ordinary characters so a
     realm opens on a face and a full card rather than a crest and one line;
     the member id remains the durable succession identity, and it is what
     survives a death. Eager for the living, compact for the dead: see
     docs/designs/characters.md. */

  /* How much of each court exists as a full character from world creation.
     'ruler'  - the ruler only (~450 records; the kin walk stays near today's)
     'court'  - ruler, adult consort and heirs (~2,500 records, map-bound rather than
                campaign-length-bound, and roughly 1.1-1.4 MB of save)
     Both settings show a real face and card for every living ruler; 'court'
     also keeps adult consorts and heirs persistent before a player opens them.
     Everything below reads this one constant, so re-tuning after profiling on
     a real device is a one-line change rather than a rewrite. */
  const COURT_EAGERNESS = 'court';

  /* charId -> realmId for reigning rulers. Derived, never serialized: it is
     rebuilt by FB.ensureDynasticState on a new game and on every load. Hanging
     it on state would write thousands of entries of pure derived data into
     every save, since S.serialize dumps state wholesale. It is a cache, not
     the truth - every hit is verified against the succession record before it
     is trusted, because a stale entry would let the player's mortality loop
     kill a ruler the realm simulation believes is alive. */
  let rulerIndex = Object.create(null);
  /* Which state the index was built for. Only a complete index may answer a
     miss without a scan, and completeness is a property of one world: a fresh
     game or a load hands over a different state object, and until that world
     has been indexed every lookup falls back to the scan it always did. */
  let rulerIndexState = null;

  function indexRuler(charId, rid) {
    if (charId && rid) rulerIndex[charId] = rid;
  }
  function dropRulerIndex(charId) {
    if (charId) delete rulerIndex[charId];
  }
  /* events.js closes the index entry from the one true death path. */
  FB.dropRulerIndexEntry = dropRulerIndex;

  FB.rebuildRulerIndex = function (state) {
    rulerIndex = Object.create(null);
    rulerIndexState = state || null;
    if (!state || !state.realms) return rulerIndex;
    for (const rid in state.realms) {
      const r = state.realms[rid];
      if (!r || !r.alive || rid === 'player') continue;
      const s = r.succession;
      const m = s && s.rulerMemberId && s.members && s.members[s.rulerMemberId];
      if (m && m.charId) rulerIndex[m.charId] = rid;
    }
    return rulerIndex;
  };

  function royalMemberSort(a, b) {
    if (a.sex !== b.sex) return a.sex === 'm' ? -1 : 1;
    return ((Number(a.born) || 0) - (Number(b.born) || 0)) ||
      String(a.id).localeCompare(String(b.id));
  }

  function realmsFaithCompatible(state, firstRealmId, secondRealmId) {
    const first = FB.realmReligionId(state, firstRealmId);
    const second = FB.realmReligionId(state, secondRealmId);
    if (!first || !second) return false;
    const firstView = FB.faithRelation(state, first, second);
    const secondView = FB.faithRelation(state, second, first);
    return firstView !== 'hostile' && firstView !== 'foreign' &&
      secondView !== 'hostile' && secondView !== 'foreign';
  }

  /* Compatibility facade for callers that still need the four historical
     visual/balance families; social rules use the relation graph above. */
  function realmFaithGroup(state, rid) {
    const religionId = FB.realmReligionId(state, rid);
    return religionId ? FB.faithGroup(religionId, state) : null;
  }
  FB.realmFaithGroup = realmFaithGroup;

  FB.religiousHeadBalance = function (key, fallback) {
    const value = FBDATA.balance[key];
    return value !== undefined ? value : fallback;
  };

  FB.realmReligionId = function (state, rid) {
    if (!state || !rid) return null;
    if (rid === 'player') {
      const playerRealm = state.realms && state.realms.player;
      if (playerRealm && playerRealm.religion) return playerRealm.religion;
      const c = state.chars && state.chars[state.player.charId];
      return c ? c.religion : null;
    }
    const r = state.realms[rid];
    if (r && r.religion) return r.religion;
    const pr = r && FB.world.byId[r.capital];
    return pr ? pr.religion : null;
  };

  FB.adjustReligionRealmOpinions = function (state, religionId, amount) {
    if (!state || !FB.adjustStanding) return;
    for (const rid in state.realms) {
      const realm = state.realms[rid];
      if (rid === 'player' || !realm || !realm.alive) continue;
      if (FB.faithInFold(state, FB.realmReligionId(state, rid), religionId)) {
        FB.adjustStanding(state, { kind:'realm', id:rid }, amount,
          'religion:realm_wide');
      }
    }
  };

  /* Return the active office's same-faith war policy when a target belongs
     to that office's temporal realm. An independent head protects its whole
     sovereign realm; a vassal head protects only its own subtree. */
  FB.sameFaithHeadWarPolicy = function (
      state, attackerReligionId, defenderRealmId, pid, readOnly) {
    const rel = FB.religionOf(attackerReligionId, state);
    const policy = rel && rel.head && rel.head.sameFaithWar;
    if (!policy || policy === 'ordinary') return null;
    const head = readOnly && FB.religiousHeadSnapshot
      ? FB.religiousHeadSnapshot(state, attackerReligionId)
      : FB.religiousHeadOf(state, attackerReligionId);
    if (!head || !defenderRealmId) return null;
    if (defenderRealmId === head.id) return policy;
    const defenderTop = FB.topRealm(state, defenderRealmId);
    const headTop = FB.topRealm(state, head.id);
    if (head.id === headTop && defenderTop === headTop) return policy;
    if (pid && defenderTop === headTop &&
        FB.realmTerritory(state, head.id).indexOf(pid) >= 0) {
      return policy;
    }
    return null;
  };

  FB.playerExcommunicated = function (state) {
    const c = state && state.chars && state.chars[state.player.charId];
    if (c && FB.faithHasSystem(c.religion, 'papacy', state) && state.papacy &&
        FB.playerExcommunicatedBy) {
      return !!FB.playerExcommunicatedBy(state);
    }
    return !!(c && c.traits &&
      c.traits.indexOf('excommunicated') >= 0);
  };

  FB.applySacrilegiousWarConsequences = function (state, religionId) {
    const B = FBDATA.balance;
    const c = state && state.chars && state.chars[state.player.charId];
    if (!state || !c) return false;
    state.player.piety = Math.max(0, state.player.piety *
      (B.religiousHeadWarPietyRetained !== undefined
        ? B.religiousHeadWarPietyRetained : 0));
    const opinionLoss = B.religiousHeadWarOpinion !== undefined
      ? B.religiousHeadWarOpinion : -40;
    const papalFaith = FB.faithHasSystem(religionId, 'papacy', state);
    if (papalFaith && FB.adjustPapalSupporterOpinions) {
      const recognized = FB.papalObedienceForCharacter &&
        FB.papalObedienceForCharacter(state, c);
      FB.adjustPapalSupporterOpinions(state, recognized, opinionLoss);
    } else {
      FB.adjustReligionRealmOpinions(state, religionId, opinionLoss);
    }
    if (papalFaith && FB.addPapalGround) {
      const obedienceId = FB.papalObedienceForCharacter &&
        FB.papalObedienceForCharacter(state, c);
      FB.addPapalGround(state, c, 'attack_pope', obedienceId);
    }
    FB.addTrait(c, 'excommunicated');
    if (papalFaith && FB.ensureLegacyPapalSentence) {
      FB.ensureLegacyPapalSentence(state);
    }
    FB.news(state, FB.msg('news.religion.sacrilegious_war',
      '⛓ The faithful condemn your attack upon {realm}. Your piety is forfeit, and you are excommunicated.', {
        realm:(FB.religiousHeadOf(state, religionId) || {}).name || ''
      }));
    return true;
  };

  FB.canSeekAbsolution = function (state) {
    if (FB.papalAbsolutionStatus) {
      return !!FB.papalAbsolutionStatus(
        state, state.player.charId
      ).ready;
    }
    if (!FB.playerExcommunicated(state) || state.player.war) return false;
    if (!FB.religiousHeadOf(state, 'catholic')) return false;
    if (state.player.gold < FB.religiousHeadBalance('religiousHeadAbsolutionGold', 100)) {
      return false;
    }
    if (state.player.piety < FB.religiousHeadBalance('religiousHeadAbsolutionPiety', 100)) {
      return false;
    }
    return true;
  };

  FB.seekAbsolution = function (state) {
    if (FB.papalAbsolve) return FB.papalAbsolve(state, state.player.charId);
    if (!FB.canSeekAbsolution(state)) return false;
    const c = state.chars[state.player.charId];
    const gold = FB.religiousHeadBalance('religiousHeadAbsolutionGold', 100);
    const piety = FB.religiousHeadBalance('religiousHeadAbsolutionPiety', 100);
    state.player.gold -= gold;
    state.player.piety -= piety;
    FB.removeTrait(c, 'excommunicated');
    FB.adjustReligionRealmOpinions(state, 'catholic',
      FB.religiousHeadBalance('religiousHeadAbsolutionOpinion', 20));
    FB.news(state, FB.msg('news.religion.absolution',
      '🕊 {title} grants you absolution. The sentence of excommunication is lifted.', {
        title:FB.dataParam('religion', 'catholic', 'head.title')
      }));
    return true;
  };

  function activeBookmarkRealmDefinition(state, rid) {
    var bookmark = state && state.start && FB.bookmark
      ? FB.bookmark(state.start.id) : FB.activeBookmark;
    var realms = bookmark && bookmark.realms || [];
    for (var i = 0; i < realms.length; i++) if (realms[i].id === rid) return realms[i];
    return null;
  }

  function realmControlsClaimCounties(state, rid, sets) {
    if (!Array.isArray(sets)) return false;
    var top = FB.topRealm(state, rid);
    for (var i = 0; i < sets.length; i++) {
      var set = sets[i];
      if (!Array.isArray(set) || !set.length) continue;
      var controls = true;
      for (var j = 0; j < set.length; j++) {
        if (!FB.world.byId[set[j]] || state.owner[set[j]] !== top) {
          controls = false;
          break;
        }
      }
      if (controls) return true;
    }
    return false;
  }

  FB.controlsReligiousHeadClaim = function (state, religionId, rid) {
    const rel = FB.religionOf(religionId, state);
    return !!(rel && rel.head &&
      realmControlsClaimCounties(state, rid, rel.head.claimCounties));
  };

  FB.canRestoreReligiousHead = function (state, religionId, controllerId) {
    const rel = FB.religionOf(religionId, state);
    const meta = rel && rel.head;
    const vacancy = FB.religiousHeadVacancy(state, religionId);
    if (!state || !meta || meta.recovery !== 'grant_seat' || !meta.seat || !vacancy) {
      return false;
    }
    const canonicalId = FB.religiousHeadDefaultRealm(state, religionId);
    const definition = canonicalId && activeBookmarkRealmDefinition(state, canonicalId);
    if (!definition || !FB.world.byId[meta.seat] ||
        (state.realms[canonicalId] && state.realms[canonicalId].alive)) {
      return false;
    }
    if (state.owner[meta.seat] !== FB.topRealm(state, controllerId)) return false;
    if (!FB.faithInFold(state, FB.realmReligionId(state, controllerId), religionId)) return false;
    if (controllerId === 'player') {
      return FB.isPlayerSovereign(state) &&
        state.holder[meta.seat] === 'player' &&
        state.player.provs.indexOf(meta.seat) >= 0 &&
        state.player.provs.length >= 2;
    }
    const controller = state.realms[controllerId];
    return !!(controller && controller.alive && !controller.liege &&
      FB.realmProvinces(state, controllerId).length >= 2);
  };

  FB.restoreReligiousHead = function (state, religionId, controllerId) {
    if (!FB.canRestoreReligiousHead(state, religionId, controllerId)) return false;
    const meta = FB.religionOf(religionId, state).head;
    const canonicalId = FB.religiousHeadDefaultRealm(state, religionId);
    const definition = activeBookmarkRealmDefinition(state, canonicalId);
    const seat = FB.world.byId[meta.seat];
    const controller = state.realms[controllerId];
    const controllerName = controller ? controller.name : controllerId;
    const controllerSovereign = FB.topRealm(state, controllerId);
    const restored = {
      id:canonicalId,
      name:definition.name,
      color:definition.color,
      capital:meta.seat,
      aggression:definition.aggression !== undefined ? definition.aggression : 0,
      rank:meta.restoredRank || 3,
      liege:null,
      techTraditions:Array.isArray(definition.techTraditions)
        ? definition.techTraditions.slice() : null,
      techSeed:definition.techSeed || null,
      religion:religionId,
      alive:true,
      ruler:makeRuler(seat.culture, null, state.date.year),
      war:null,
      op:0
    };
    state.realms[canonicalId] = restored;
    if (FB.mergeRealmTech && controllerSovereign) {
      FB.mergeRealmTech(state, canonicalId, controllerSovereign);
    }
    FB.ensureRealmSuccession(state, canonicalId);
    FB.transferProvince(state, meta.seat, canonicalId);
    if (!FB.assignReligiousHead(state, religionId, canonicalId)) return false;
    if (FB.papacyReligiousHeadRestored) {
      FB.papacyReligiousHeadRestored(state, religionId, canonicalId);
    }
    if (controllerId === 'player') {
      state.player.piety += FB.religiousHeadBalance('religiousHeadRestorePiety', 200);
      state.player.prestige += FB.religiousHeadBalance('religiousHeadRestorePrestige', 150);
      FB.adjustReligionRealmOpinions(state, religionId,
        FB.religiousHeadBalance('religiousHeadRestoreOpinion', 15));
      FB.removeTrait(state.chars[state.player.charId], 'excommunicated');
      FB.news(state, FB.msg('news.religion.head_restored_player',
        '⛪ You grant {seat} to the restored {realm}. {ruler} is chosen {title}.', {
          seat:seat.name,
          realm:restored.name,
          ruler:restored.ruler.name,
          title:FB.dataParam('religion', religionId, 'head.title')
        }));
    } else {
      FB.news(state, FB.msg('news.religion.head_restored_ai',
        '⛪ {controller} grants {seat} to the restored {realm}. {ruler} is chosen {title}.', {
          controller:controllerName,
          seat:seat.name,
          realm:restored.name,
          ruler:restored.ruler.name,
          title:FB.dataParam('religion', religionId, 'head.title')
        }));
    }
    return true;
  };

  FB.canClaimReligiousHead = function (state, religionId, rid) {
    const rel = FB.religionOf(religionId, state);
    const meta = rel && rel.head;
    const realm = state && state.realms && state.realms[rid];
    if (!meta || meta.recovery !== 'claim' ||
        !FB.religiousHeadVacancy(state, religionId) ||
        !realm || !realm.alive || realm.liege ||
        !(FB.religiousHeadHolderEligible &&
          FB.religiousHeadHolderEligible(state, religionId, rid)) ||
        !FB.faithInFold(state, FB.realmReligionId(state, rid), religionId) ||
        !FB.controlsReligiousHeadClaim(state, religionId, rid)) {
      return false;
    }
    if (rid !== 'player') {
      return realm.rank >= 3 &&
        FB.realmProvinces(state, rid).length >=
          FB.religiousHeadBalance('religiousHeadClaimMinRealm', 6);
    }
    return FB.isPlayerSovereign(state) && state.player.tier >= 6 &&
      state.player.prestige >= FB.religiousHeadBalance('religiousHeadClaimPrestige', 500) &&
      state.player.piety >= FB.religiousHeadBalance('religiousHeadClaimPiety', 300) &&
      (state.player.provs ? state.player.provs.length : 0) >=
        FB.religiousHeadBalance('religiousHeadClaimMinRealm', 6);
  };

  FB.claimReligiousHead = function (state, religionId, rid) {
    if (!FB.canClaimReligiousHead(state, religionId, rid)) return false;
    const realm = state.realms[rid];
    if (rid === 'player') {
      state.player.piety -= FB.religiousHeadBalance('religiousHeadClaimPiety', 300);
    }
    if (!FB.assignReligiousHead(state, religionId, rid)) return false;
    if (rid === 'player') {
      FB.news(state, FB.msg('news.religion.head_claimed_player',
        '☪ You claim the office of {title} for your realm.', {
          title:FB.dataParam('religion', religionId, 'head.title')
        }));
    } else {
      FB.news(state, FB.msg('news.religion.head_claimed_ai',
        '☪ {realm} claims the vacant office of {title}.', {
          realm:realm.name,
          title:FB.dataParam('religion', religionId, 'head.title')
        }));
    }
    return true;
  };

  /* Daily recovery begins only after the saved vacancy has lasted a full
     year. Player opportunities remain explicit deeds; AI choices are stable. */
  FB.religiousHeadRecoveryTick = function (state) {
    const wait = FB.religiousHeadBalance('religiousHeadVacancyDays', 360);
    FB.ensureReligiousHeads(state);
    const religionIds = FB.religionIds(state, false);
    for (let religionIndex = 0; religionIndex < religionIds.length; religionIndex++) {
      const religionId = religionIds[religionIndex];
      const source = FB.faithValue(state, religionId, 'head.officeId').sourceId;
      if (source && source !== religionId) continue;
      /* read the vacancy straight from the heads map: ensureReligiousHeads
         already ran above, and FB.religiousHeadVacancy would re-run the whole
         office-table repair once per religion per day */
      const officeId = FB.faithOfficeId(religionId, state);
      const vacancy = officeId && state.religiousHeads[officeId] === null
        ? (state.religiousHeadVacancies[officeId] || null) : null;
      const rel = FB.religionOf(religionId, state);
      const meta = rel && rel.head;
      if (!vacancy || !meta || state.turn - vacancy.turn < wait) continue;
      if (meta.recovery === 'grant_seat') {
        const controllerId = state.owner[meta.seat];
        if (controllerId && controllerId !== 'player' &&
            FB.canRestoreReligiousHead(state, religionId, controllerId)) {
          FB.restoreReligiousHead(state, religionId, controllerId);
        }
      } else if (meta.recovery === 'claim') {
        const candidates = [];
        for (const rid in state.realms) {
          if (rid !== 'player' && FB.canClaimReligiousHead(state, religionId, rid)) {
            candidates.push(rid);
          }
        }
        candidates.sort(function (a, b) {
          const ar = state.realms[a], br = state.realms[b];
          return (br.rank - ar.rank) ||
            (FB.realmStrength(state, b) - FB.realmStrength(state, a)) ||
            (a < b ? -1 : a > b ? 1 : 0);
        });
        if (candidates.length) FB.claimReligiousHead(state, religionId, candidates[0]);
      }
    }
  };

  /* Court generation runs on a private stream keyed by stored identifiers
     only - the world seed, the realm, the ruler generation, the member - so
     one world seed always produces the same courts and creating them never
     perturbs the shared world stream. Nothing about call order, wall time, or
     map-iteration position may enter this string: that is what makes a court
     the same whether it was built at world creation, at a player's first
     visit, or on the load of an older save. See docs/designs/seeds.md.

     The world seed and bookmark, not the whole start code: state.seed stores
     SEED-BOOKMARK-SCENARIO-PROVINCE-SEX-NAME, and two players who share a
     world seed are promised the same political world whatever scenario,
     province, sex or name they then pick - so a court must not vary with
     them. The world seed is normalized to A-Z0-9 and holds no dash. */
  function courtWorldKey(state) {
    const code = String((state && state.seed) || '');
    const bookmark = (state && state.start && state.start.id) || '867';
    return code.split('-')[0] + '|' + bookmark;
  }

  function courtScope(state, rid, key) {
    return 'court|' + courtWorldKey(state) + '|' + rid + '|' + key;
  }

  function isPapalTerritorialRealm(state, rid) {
    if (FB.papacyTerritorialRealm) {
      return FB.papacyTerritorialRealm(state, rid);
    }
    return !!(state && state.religiousHeads &&
      state.religiousHeads.catholic === rid);
  }

  /* A court character's id is derived from its succession member rather than
     drawn from FB.uid, so eager and on-demand materialization agree on one
     identity. Member ids always begin with 'royal_'; the 'ro_' prefix cannot
     collide with the 'c<n>' sequence FB.uid hands out. */
  function courtCharId(memberId) {
    const id = String(memberId || '');
    return 'ro_' + (id.indexOf('royal_') === 0 ? id.slice(6) : id);
  }
  FB.courtCharacterId = courtCharId;

  function courtMemberId(realm, key) {
    return 'royal_' + realm.id + '_' + String(key || 'member')
      .replace(/[^A-Za-z0-9_-]/g, '_');
  }

  /* Never overwrite a record that already holds the derived id, and never
     escape to FB.uid: the member-to-character identity is a save contract.
     A matching orphan can be reclaimed by the materializer; an unrelated
     collision leaves the malformed member unmaterialized for repair. */
  function freeCourtCharId(state, memberId) {
    const id = courtCharId(memberId);
    return state.chars[id] ? null : id;
  }

  function recoverCourtCharacter(state, rid, member) {
    const c = state.chars[courtCharId(member.id)];
    if (!c || c.dead || !c.royalLine ||
        c.royalLine.realmId !== rid ||
        c.royalLine.memberId !== member.id) return null;
    member.charId = c.id;
    return c;
  }

  /* Eager courts are built inside FB.initPolitics, before the protagonist
     exists, so the old fallback through the player's own faith is not
     reachable there. */
  function courtReligion(state, r, cap) {
    if (r.religion) return r.religion;
    if (cap && cap.religion) return cap.religion;
    const me = state.player && state.chars[state.player.charId];
    return me ? me.religion : null;
  }

  function newRoyalMember(state, realm, parentId, ageMax, opts) {
    opts = opts || {};
    const drawn = function () {
      const sex = opts.sex || (FB.chance(0.55) ? 'm' : 'f');
      const max = Math.max(0, ageMax === undefined ? 28 : ageMax);
      return {
        sex:sex,
        name:FB.randomName(realm.ruler.culture, sex),
        born:state.date.year - FB.ri(0, max)
      };
    };
    const person = opts.scope ? FB.withSeed(opts.scope, drawn) : drawn();
    /* Before eager courts, compact heirs consumed one uid. Keep that counter
       movement for non-court seed compatibility, but never put the result in
       a member identity. */
    FB.uid();
    return {
      id:courtMemberId(realm, opts.key),
      name: person.name,
      sex: person.sex,
      born: person.born,
      alive: true,
      parentId: parentId || null,
      childIds: [],
      charId: null,
      /* null means "child or collateral"; absent on saves written before
         consorts existed, which reads the same way and needs no migration */
      role: opts.role || null
    };
  }

  /* Is this person already wed? The stored spouseId is authoritative in one
     direction only - a wife's points at her husband while his holds only the
     first - so the reverse link is checked too. The bulk path deliberately
     skips that reverse walk: it runs at world creation, where every couple
     being made is new and nobody can already point at them, and the family
     index it consults is invalidated by each record the sweep creates, which
     would make the sweep quadratic in the size of the character map. */
  function alreadyWed(state, c, opts) {
    if (!c) return false;
    const direct = c.spouseId && state.chars[c.spouseId];
    if (direct && !direct.dead) return true;
    if (opts && opts.bulk) return false;
    return !!(FB.spousesSnapshot && FB.spousesSnapshot(state, c).length);
  }

  function alreadyBetrothed(state, c) {
    if (!c || !c.betrothedId) return false;
    const pledged = state.chars[c.betrothedId];
    return !!(pledged && !pledged.dead);
  }

  function alreadyCommitted(state, c, opts) {
    return alreadyWed(state, c, opts) || alreadyBetrothed(state, c);
  }

  function committedToOther(state, c, partner, opts) {
    if (!c) return false;
    const partnerId = partner && partner.id;
    const directSpouse = c.spouseId && state.chars[c.spouseId];
    if (directSpouse && !directSpouse.dead && directSpouse.id !== partnerId) {
      return true;
    }
    if (!(opts && opts.bulk) && FB.spousesSnapshot) {
      const spouses = FB.spousesSnapshot(state, c);
      for (const spouse of spouses) {
        if (spouse.id !== partnerId) return true;
      }
    }
    const pledged = c.betrothedId && state.chars[c.betrothedId];
    return !!(pledged && !pledged.dead && pledged.id !== partnerId);
  }

  function royalRulerAge(state, r, c) {
    return c ? FB.ageOf(c, state.date.year) :
      Math.max(0, Number(r && r.ruler && r.ruler.age) || 0);
  }

  function consortCommitmentSettled(state, r, ruler, consort) {
    if (!ruler || !consort || ruler.dead || consort.dead) return false;
    if (royalRulerAge(state, r, ruler) < 16 ||
        FB.ageOf(consort, state.date.year) < 16) return false;
    return ruler.spouseId === consort.id &&
      consort.spouseId === ruler.id &&
      ruler.betrothedId !== consort.id &&
      consort.betrothedId !== ruler.id;
  }

  /* Saves from before the commitment guard can contain a generated consort
     beside a ruler's real partner. Remove only the invented court role and
     its invented links; keep the ordinary character record so load repair
     never erases a person the player may already have met. */
  function retireInvalidConsort(state, succession, member, c, ruler) {
    if (!succession || !member) return;
    if (c && ruler) {
      if (c.spouseId === ruler.id) c.spouseId = null;
      if (ruler.spouseId === c.id) ruler.spouseId = null;
      if (c.betrothedId === ruler.id) c.betrothedId = null;
      if (ruler.betrothedId === c.id) ruler.betrothedId = null;
    }
    if (c && c.royalLine &&
        c.royalLine.realmId && c.royalLine.memberId === member.id) {
      delete c.royalLine;
    }
    delete succession.members[member.id];
    if (FB.touchFamily) FB.touchFamily();
  }

  /* The ruler's spouse of record. Seeded once per ruler generation, of the
     opposite sex and a plausible age, so an adult court reads as a household
     rather than a list of names. */
  function seedConsortMember(state, rid) {
    const r = state.realms[rid];
    const s = r && r.succession;
    if (!r || !s || !s.members || !r.ruler) return null;
    const generation = s.rulerGeneration === undefined ? 1 : s.rulerGeneration;
    if (FB.realmConsortMember(state, rid)) return null;
    /* A ruler who already has a spouse of record is never handed a second
       one. The case that matters is an heir the protagonist married taking
       the throne: generating a consort beside that marriage would put two
       spouses on one character no matter what the faith's doctrine allows.
       Whether anyone may hold more than one spouse belongs to the marriage
       system, and this path must not answer it by accident. */
    const sitting = FB.realmRulerCharacterSnapshot(state, rid);
    const rulerAge = royalRulerAge(state, r, sitting);
    /* A pledge is as exclusive here as an existing marriage. A child ruler
       receives only a same-age compact reservation; it is not materialized or
       linked until both are adults, so a real pledge can still supersede it. */
    if (alreadyCommitted(state, sitting)) return null;
    let ordinal = 0;
    let memberKey = 'g' + generation + '_consort';
    let memberId = courtMemberId(r, memberKey);
    /* A retired generated partner remains an ordinary character the player
       may have met. Leave that record intact, but do not let its derived id
       reserve this generation's consort slot forever if AI remarriage is
       added later. Initial courts retain the unsuffixed stable identity. */
    while (s.members[memberId] || state.chars[courtCharId(memberId)]) {
      ordinal++;
      memberKey = 'g' + generation + '_consort' + ordinal;
      memberId = courtMemberId(r, memberKey);
    }
    const person = FB.withSeed(
      courtScope(state, rid, 'g' + generation + ':consort' +
        (ordinal ? ordinal : '')), function () {
        const sex = (r.ruler.sex || 'm') === 'f' ? 'm' : 'f';
        return {
          sex:sex,
          name:FB.randomName(r.ruler.culture, sex),
          age:rulerAge < 16
            ? FB.clamp(rulerAge + FB.ri(-2, 2), 0, 15)
            : FB.clamp(rulerAge + FB.ri(-10, 6), 16, 74)
        };
      });
    /* The old generated member id consumed one uid. Preserve that unrelated
       counter movement while keeping the durable identity derived. */
    FB.uid();
    const m = {
      id:memberId,
      name:person.name,
      sex:person.sex,
      born:state.date.year - person.age,
      alive:true,
      parentId:null,
      childIds:[],
      charId:null,
      role:'consort',
      consortGen:generation
    };
    s.members[m.id] = m;
    return m;
  }

  /* The sitting consort. Consorts of past generations stay in the tree as
     dated tombstones and are never read as the current spouse; there is no AI
     remarriage, so a generation whose consort has died simply has none. */
  FB.realmConsortMember = function (state, rid) {
    const r = state && state.realms && state.realms[rid];
    const s = r && r.succession;
    if (!s || !s.members) return null;
    const generation = s.rulerGeneration === undefined ? 1 : s.rulerGeneration;
    for (const id in s.members) {
      const m = s.members[id];
      if (!m || m.role !== 'consort') continue;
      if ((m.consortGen === undefined ? 1 : m.consortGen) === generation) return m;
    }
    return null;
  };

  function orderedMemberIds(succession, parentId) {
    const list = [];
    for (const id in succession.members) {
      const m = succession.members[id];
      /* A consort is not an heir. Exclude by the explicit role and never by
         the parent grouping: a consort's parentId is legitimately null, which
         is exactly what this call matches when there is no ruler root yet. */
      if (!m || m.role === 'consort') continue;
      if ((m.parentId || null) === (parentId || null)) list.push(m);
    }
    list.sort(royalMemberSort);
    return list.map(function (m) { return m.id; });
  }

  function expandDeadBranch(succession, id, out, seen) {
    if (seen[id]) return;
    seen[id] = 1;
    const m = succession.members[id];
    if (!m) return;
    if (m.alive !== false) { out.push(id); return; }
    const kids = orderedMemberIds(succession, id);
    for (const kid of kids) expandDeadBranch(succession, kid, out, seen);
  }

  FB.refreshRealmSuccession = function (state, rid) {
    const r = state.realms[rid];
    if (!r || !r.alive) return null;
    const s = r.succession;
    if (!s || !s.members) return FB.ensureRealmSuccession(state, rid);
    if (s.papalElective) return s;
    const source = s.order && s.order.length ? s.order.slice() :
      orderedMemberIds(s, s.rulerMemberId || null);
    /* Keep the reigning-ruler index honest from the one place that already
       notices a linked character has gone. */
    const rulerMember = s.rulerMemberId && s.members[s.rulerMemberId];
    if (rulerMember && rulerMember.charId) {
      const rulerChar = state.chars && state.chars[rulerMember.charId];
      if (!rulerChar || rulerChar.dead) dropRulerIndex(rulerMember.charId);
      else indexRuler(rulerMember.charId, rid);
    }
    const out = [], seen = {};
    for (const id of source) {
      const m = s.members[id];
      if (m && m.charId) {
        const c = state.chars && state.chars[m.charId];
        /* A compacted member was already marked dead before its record was
           removed, so a missing character here is genuinely a death. */
        if (!c || c.dead) m.alive = false;
      }
      expandDeadBranch(s, id, out, seen);
    }
    s.order = out;
    s.heirId = out.length ? out[0] : null;
    // Every compact royal house exposes one designated successor. If an
    // entire lightweight line dies out, repair it with a young collateral
    // branch instead of leaving the UI and ruler transition heirless.
    if (!s.heirId) makeHeirIfEmpty(state, r, s);
    return s;
  };

  FB.ensureRealmSuccession = function (state, rid) {
    const r = state.realms[rid];
    if (!r || !r.alive || rid === 'player') return null;
    if (r.succession && r.succession.papalElective) return r.succession;
    if (!r.ruler) {
      const cap = FB.world.byId[r.capital];
      r.ruler = makeRuler(cap ? cap.culture : 'frankish', null, state.date && state.date.year);
    }
    if (r.ruler.generation === undefined) r.ruler.generation = 1;
    if (!r.succession || !r.succession.members) {
      const s = {
        rulerGeneration: r.ruler.generation,
        rulerMemberId: null,
        members: {},
        order: [],
        heirId: null
      };
      const possibleAge = Math.max(0, Math.min(28, r.ruler.age - 16));
      const generation = r.ruler.generation;
      const count = FB.ri(2, 4);
      const made = [];
      for (let i = 0; i < count; i++) {
        const m = newRoyalMember(state, r, null, possibleAge, {
          key:'g' + generation + '_child' + i,
          scope:courtScope(state, rid, 'g' + generation + ':child' + i)
        });
        s.members[m.id] = m;
        made.push(m);
      }
      made.sort(royalMemberSort);
      s.order = made.map(function (m) { return m.id; });
      s.heirId = s.order[0];
      r.succession = s;
      /* Only a freshly seeded house gains a consort here. An older save's
         realm is mid-generation, and inventing a spouse for a ruler who has
         reigned for twenty years reads worse than waiting: those courts gain
         one at their next succession. */
      seedConsortMember(state, rid);
    }
    return FB.refreshRealmSuccession(state, rid);
  };

  /* The initial Papal ruler consumes the same discarded count/id progression
     as the former dynastic setup, preserving fixed-seed non-court state, but
     never creates those members. It begins directly as one elective root.
     Existing saves are left for FB.ensurePapacy's relationship-aware repair. */
  function seedInitialPapalRuler(state, rid, opts) {
    const r = state.realms[rid];
    if (!r || r.succession) return false;
    if (!r.ruler) {
      const cap = FB.world.byId[r.capital];
      r.ruler = makeRuler(cap ? cap.culture : 'frankish', null,
        state.date && state.date.year);
    }
    if (r.ruler.generation === undefined) r.ruler.generation = 1;
    const generation = r.ruler.generation;
    /* ensureRealmSuccession formerly drew only the child count on the shared
       stream; each child's sheet and the consort sheet were already scoped.
       Discard the same uid slots without constructing a Papal dynasty. */
    const discardedChildren = FB.ri(2, 4);
    for (let i = 0; i < discardedChildren; i++) FB.uid();
    FB.uid(); // discarded consort member id
    FB.uid(); // discarded ruler-root member id
    const root = {
      id:courtMemberId(r, 'g' + generation + '_ruler'),
      name:r.ruler.name,
      sex:r.ruler.sex || 'm',
      born:r.ruler.born !== undefined
        ? r.ruler.born : state.date.year - Math.max(0, r.ruler.age || 0),
      alive:true,
      parentId:null,
      childIds:[],
      charId:null,
      role:null
    };
    r.succession = {
      rulerGeneration:generation,
      rulerMemberId:root.id,
      members:{},
      order:[],
      heirId:null,
      papalElective:true
    };
    r.succession.members[root.id] = root;
    const c = FB.materializeRealmRuler(state, rid, opts);
    if (!c) return false;
    c.royalLine = { realmId:rid, memberId:root.id };
    return true;
  }

  FB.ensureDynasticState = function (state) {
    state.alliances = state.alliances || [];
    let made = false;
    for (const rid in state.realms) {
      const r = state.realms[rid];
      if (!r || !r.alive) continue;
      if (rid === 'player') {
        if (r.ruler && r.ruler.generation === undefined) r.ruler.generation = 1;
        r.succession = r.succession || {
          playerDynasty: true,
          rulerGeneration: r.ruler ? r.ruler.generation : 1,
          heirCharId: null
        };
      } else if (isPapalTerritorialRealm(state, rid)) {
        if (seedInitialPapalRuler(state, rid, { bulk:true })) made = true;
      } else {
        FB.ensureRealmSuccession(state, rid);
        if (ensureCourtMaterialized(state, rid, { bulk:true })) made = true;
      }
    }
    /* One patronym pass for the whole eager sweep. Running it per record
       would make world creation quadratic in the size of the character map. */
    if (made && FB.ensureCharacterBynames) FB.ensureCharacterBynames(state);
    FB.rebuildRulerIndex(state);
    FB.repairAlliances(state);
  };

  /* Materialize the living court according to COURT_EAGERNESS, through the
     existing materialization paths and never a third one. Cheap to re-run:
     a member that already carries a character is skipped without touching the
     character map, which matters because FB.ensureDynasticState is on the
     yearly world tick as well as on new game and load. */
  function ensureCourtMaterialized(state, rid, opts, eagerness) {
    const r = state.realms[rid];
    if (!r || !r.alive || rid === 'player' || !r.succession) return false;
    const s = r.succession;
    eagerness = eagerness || COURT_EAGERNESS;
    /* The Roman realm's ruler is the sitting Pope, installed and replaced by
       the papacy's own elective path. It has no dynastic court to fill, and
       the saved marker plus bookmark head assignment identify it even before
       the Papacy's additive state has been installed. */
    if (s.papalElective || isPapalTerritorialRealm(state, rid)) return false;
    let made = false;
    let rulerMember = s.rulerMemberId && s.members[s.rulerMemberId];
    let rulerChar = rulerMember && rulerMember.charId &&
      state.chars[rulerMember.charId];
    /* A living realm never waits for a mortality roll to notice that its
       throne points at a corpse. This also makes retained and compacted dead
       rulers follow the same recovery path when a dormant realm is revived:
       both advance to a living, eagerly materialized successor. */
    if (rulerMember && (rulerMember.alive === false ||
        (rulerMember.charId && (!rulerChar || rulerChar.dead)))) {
      /* Rendering never repairs a save: a display fill leaves a dead root
         for the tick's ensureDynasticState pass and shows the compact
         ruler record instead. */
      if (opts && opts.displayOnly) return made;
      rulerMember.alive = false;
      if (!FB.advanceRealmSuccession(state, rid, { repair:true })) return made;
      made = true;
      if (!r.alive) return made;
      rulerMember = s.rulerMemberId && s.members[s.rulerMemberId];
      rulerChar = rulerMember && rulerMember.charId &&
        state.chars[rulerMember.charId];
    }
    if (!rulerMember || !rulerMember.charId || !rulerChar || rulerChar.dead) {
      if (!FB.materializeRealmRuler(state, rid, opts)) return made;
      made = true;
    }
    if (eagerness !== 'court') return made;
    const consort = FB.realmConsortMember(state, rid);
    if (consort && consort.alive !== false) {
      const before = consort.charId && state.chars[consort.charId];
      const sitting = FB.realmRulerCharacterSnapshot(state, rid);
      /* A display fill creates a missing consort record but never rewrites
         links on records that already exist: an unsettled or dangling
         marriage link is save damage, and repairs belong to the load and
         world-tick passes, not to opening a sheet. */
      if (!before || (!(opts && opts.displayOnly) &&
          (!consortCommitmentSettled(state, r, sitting, before) ||
           committedToOther(state, sitting, before, opts) ||
           committedToOther(state, before, sitting, opts)))) {
        const linked = FB.materializeRealmConsort(state, rid, opts);
        if (!before && linked) made = true;
        if (!s.members[consort.id]) made = true;
      }
    }
    /* This runs for every realm every world tick, so establish there is
       actually work before paying for the ordered walk below. */
    let pending = false;
    for (const id in s.members) {
      const m = s.members[id];
      if (m && m.alive !== false && m.role !== 'consort' &&
          id !== s.rulerMemberId && (!m.charId || !state.chars[m.charId])) {
        pending = true;
        break;
      }
    }
    if (!pending) return made;
    /* FB.realmFamily is the bounded court the realm sheet already shows, so
       eagerness and display agree on one set and neither grows without end. */
    for (const member of FB.realmFamily(state, rid)) {
      if (!member || member.alive === false || member.role === 'consort') continue;
      if (member.id === s.rulerMemberId) continue;
      if (member.charId && state.chars[member.charId]) continue;
      if (FB.materializeRoyalChild(state, rid, member.id, opts)) made = true;
    }
    return made;
  }

  /* A narrow eager-repair entry point for code that revives one dormant realm.
     It establishes the succession first, advances a dead root immediately,
     and returns only once the living ruler is a full character. */
  FB.ensureRealmCourt = function (state, rid, opts) {
    const r = state && state.realms && state.realms[rid];
    if (!r || !r.alive || rid === 'player' ||
        isPapalTerritorialRealm(state, rid)) return null;
    if (!FB.ensureRealmSuccession(state, rid)) return null;
    const made = ensureCourtMaterialized(state, rid, opts);
    if (made && FB.ensureCharacterBynames) FB.ensureCharacterBynames(state);
    return FB.realmRulerCharacterSnapshot(state, rid);
  };

  /* Opening a realm is the one on-demand boundary kept functional when the
     startup policy is tuned down to 'ruler'. It still uses the ordinary
     ruler, consort, and child materializers; the override only asks the
     coordinator to fill the same bounded household that 'court' fills at
     world creation. It creates missing records only — displayOnly keeps
     every repair (dead-root advance, marriage relinks) for the load and
     world-tick passes, so under the default policy opening a sheet writes
     nothing at all. */
  FB.ensureRealmCourtForDisplay = function (state, rid) {
    const r = state && state.realms && state.realms[rid];
    if (!r || !r.alive || rid === 'player' ||
        isPapalTerritorialRealm(state, rid)) return null;
    if (!FB.ensureRealmSuccession(state, rid)) return null;
    const made = ensureCourtMaterialized(state, rid,
      { displayOnly:true }, 'court');
    if (made && FB.ensureCharacterBynames) FB.ensureCharacterBynames(state);
    return FB.realmRulerCharacterSnapshot(state, rid);
  };

  function realmFamilyMembers(s) {
    if (!s || !s.members) return [];
    const parent = s.rulerMemberId || null;
    const ids = orderedMemberIds(s, parent).filter(function (id) {
      return s.members[id] && s.members[id].alive !== false;
    });
    for (const id of (s.order || [])) {
      const member = s.members[id];
      if (member && member.alive !== false && ids.indexOf(id) < 0) ids.push(id);
    }
    return ids.slice(0, 6).map(function (id) { return s.members[id]; });
  }

  /* Pure display snapshot: unlike FB.realmFamily, this never creates or
     repairs succession state. Both paths share one ordering and bound. */
  FB.realmFamilySnapshot = function (state, rid) {
    const r = state && state.realms && state.realms[rid];
    return realmFamilyMembers(r && r.succession);
  };

  FB.realmFamily = function (state, rid) {
    const r = state.realms[rid];
    const s = FB.ensureRealmSuccession(state, rid);
    if (!r || !s) return [];
    return realmFamilyMembers(s);
  };

  /* The yearly roll for everyone in a court but its ruler, whose own death is
     driven from FB.worldTick. This is the only place a court member ages and
     dies: the player's mortality pass leaves court characters alone unless the
     player has a tie to one, so nobody is rolled twice and nobody is immortal.
     A materialized member is rolled here exactly as a compact one is. */
  function tickRoyalFamily(state, rid, familyLinks) {
    const s = FB.ensureRealmSuccession(state, rid);
    if (!s) return;
    const kinById = familyLinks && familyLinks.kinById;
    const mortScale = (FBDATA.balance.mortalityBase || 0.012) / 0.012;
    for (const id in s.members) {
      const m = s.members[id];
      if (m.alive === false || id === s.rulerMemberId) continue;
      const c = m.charId && state.chars[m.charId];
      if (c && c.dead) continue;
      /* A royal descendant can retain their birth line while reigning
         elsewhere. The crown's realm owns that person's mortality and
         succession; this family's tick must leave them alone. */
      if (c && FB.isReigningRealmRuler(state, c)) continue;
      /* A court character the player can reach belongs to the player's own
         yearly pass, which is the one that reports the death. */
      const retained = c && FB.courtRecordRetained(state, c, kinById);
      if (retained) continue;
      const age = Math.max(0, state.date.year - m.born);
      const q = (age < 5 ? 0.03 : age < 16 ? 0.006 : age < 50 ? 0.008 :
        age < 65 ? 0.03 : age < 80 ? 0.1 : 0.25) * mortScale;
      if (!FB.chance(FB.clamp(q, 0, 1))) continue;
      m.alive = false;
      if (c) {
        FB.courtMemberDied(state, m, c, {
          retained:false,
          kinById:kinById,
          familyLinks:familyLinks
        });
      }
    }
    FB.refreshRealmSuccession(state, rid);
  }

  function linkMaterializedRoyalFamily(state, succession, member, c, opts) {
    if (!succession || !member || !c) return c;
    const parentMember = member.parentId &&
      succession.members[member.parentId];
    const parent = parentMember && parentMember.charId &&
      state.chars[parentMember.charId];
    if (parent) {
      if (parent.sex === 'f') {
        if (!c.motherId) c.motherId = parent.id;
      } else if (!c.fatherId) c.fatherId = parent.id;
      parent.childrenIds = parent.childrenIds || [];
      if (parent.childrenIds.indexOf(c.id) < 0) {
        parent.childrenIds.push(c.id);
      }
    }
    for (const childMemberId of (member.childIds || [])) {
      const childMember = succession.members[childMemberId];
      const child = childMember && childMember.charId &&
        state.chars[childMember.charId];
      if (!child) continue;
      if (c.sex === 'f') {
        if (!child.motherId) child.motherId = c.id;
      } else if (!child.fatherId) child.fatherId = c.id;
      c.childrenIds = c.childrenIds || [];
      if (c.childrenIds.indexOf(child.id) < 0) c.childrenIds.push(child.id);
    }
    /* A bulk sweep defers the patronym pass to one call at the end; it walks
       the whole character map and cannot run once per record. */
    if (!(opts && opts.bulk) && FB.ensureCharacterBynames) {
      FB.ensureCharacterBynames(state);
    }
    if (FB.touchFamily) FB.touchFamily();
    return c;
  }

  FB.materializeRoyalChild = function (state, rid, memberId, opts) {
    const r = state.realms[rid];
    const s = FB.ensureRealmSuccession(state, rid);
    const m = s && s.members[memberId];
    if (!r || !m || m.alive === false) return null;
    if (m.charId && state.chars[m.charId] && !state.chars[m.charId].dead) {
      return linkMaterializedRoyalFamily(state, s, m, state.chars[m.charId], opts);
    }
    const recovered = recoverCourtCharacter(state, rid, m);
    if (recovered) return linkMaterializedRoyalFamily(state, s, m, recovered, opts);
    const charId = freeCourtCharId(state, memberId);
    if (!charId) return null;
    const cap = FB.world.byId[r.capital];
    const c = FB.withSeed(courtScope(state, rid, memberId), function () {
      return FB.makeCharacter(state, {
        id:charId,
        name: m.name,
        sex: m.sex,
        culture: r.ruler.culture,
        religion: courtReligion(state, r, cap),
        born: m.born,
        dyn: 'of ' + r.name,
        station: r.rank <= 2 ? 3 : 4,
        quality: Math.max(2, r.rank + 1),
        opinion: FB.ri(-5, 20)
      });
    });
    c.health = 8;
    c.royalLine = { realmId: rid, memberId: memberId };
    m.charId = c.id;
    return linkMaterializedRoyalFamily(state, s, m, c, opts);
  };

  /* The consort as an ordinary character. A child ruler's compact reservation
     stays unmaterialized and unlinked; once both are adults this path creates
     the character and installs the marriage. */
  FB.materializeRealmConsort = function (state, rid, opts) {
    const r = state && state.realms && state.realms[rid];
    const s = r && r.alive && rid !== 'player'
      ? FB.ensureRealmSuccession(state, rid) : null;
    const m = s && FB.realmConsortMember(state, rid);
    if (!m || m.alive === false) return null;
    let c = m.charId && state.chars[m.charId];
    const ruler = FB.realmRulerCharacterSnapshot(state, rid);
    /* Repair an invalid old consort before materializing a brand-new record
       for them. Existing records are preserved as ordinary people. */
    if (ruler && (committedToOther(state, ruler, c, opts) ||
        (c && committedToOther(state, c, ruler, opts)))) {
      retireInvalidConsort(state, s, m, c, ruler);
      return null;
    }
    if (ruler && (royalRulerAge(state, r, ruler) < 16 ||
        Math.max(0, state.date.year - m.born) < 16)) {
      /* Repair the old eager representation too: a minor ruler must have
         neither a generated spouse nor a generated character betrothal. Keep
         the member as the future reservation, and reuse any already-written
         record after majority rather than deleting save-visible history. */
      let changed = false;
      if (c && !c.dead) {
        if (ruler.spouseId === c.id) { ruler.spouseId = null; changed = true; }
        if (c.spouseId === ruler.id) { c.spouseId = null; changed = true; }
        if (ruler.betrothedId === c.id) {
          ruler.betrothedId = null;
          changed = true;
        }
        if (c.betrothedId === ruler.id) {
          c.betrothedId = null;
          changed = true;
        }
      }
      if (changed && FB.touchFamily) FB.touchFamily();
      return null;
    }
    if (!c || c.dead) {
      c = recoverCourtCharacter(state, rid, m);
    }
    if (!c || c.dead) {
      const charId = freeCourtCharId(state, m.id);
      if (!charId) return null;
      const cap = FB.world.byId[r.capital];
      c = FB.withSeed(courtScope(state, rid, m.id), function () {
        return FB.makeCharacter(state, {
          id:charId,
          name:m.name,
          sex:m.sex,
          culture:r.ruler.culture,
          religion:courtReligion(state, r, cap),
          born:m.born,
          dyn:'of ' + r.name,
          station:r.rank <= 2 ? 3 : 4,
          quality:Math.max(2, r.rank + 1),
          opinion:FB.ri(-5, 20)
        });
      });
      c.health = 8;
      c.royalLine = { realmId:rid, memberId:m.id };
      m.charId = c.id;
    }
    linkMaterializedRoyalFamily(state, s, m, c, opts);
    if (ruler && !ruler.dead && !c.dead) {
      let changed = false;
      const captivityBlocksMarriage = FB.intrigueCaptivityOf &&
        (FB.intrigueCaptivityOf(state, ruler.id) ||
          FB.intrigueCaptivityOf(state, c.id));
      if (!captivityBlocksMarriage &&
          !committedToOther(state, ruler, c, opts) &&
          !committedToOther(state, c, ruler, opts)) {
        if (ruler.betrothedId === c.id) {
          ruler.betrothedId = null;
          changed = true;
        }
        if (c.betrothedId === ruler.id) {
          c.betrothedId = null;
          changed = true;
        }
        if (c.spouseId !== ruler.id) { c.spouseId = ruler.id; changed = true; }
        if (ruler.spouseId !== c.id) { ruler.spouseId = c.id; changed = true; }
      }
      if (changed && FB.touchFamily) FB.touchFamily();
    }
    return c;
  };

  /* The sitting consort as a character, if one exists and is materialized. */
  FB.realmConsortCharacter = function (state, rid) {
    const m = FB.realmConsortMember(state, rid);
    const c = m && m.alive !== false && m.charId && state.chars &&
      state.chars[m.charId];
    const ruler = c && FB.realmRulerCharacterSnapshot(state, rid);
    return c && !c.dead && ruler &&
      ruler.spouseId === c.id && c.spouseId === ruler.id ? c : null;
  };

  FB.materializeRoyalStepchildren = function (state, spouse) {
    const line = spouse && spouse.royalLine;
    const realm = line && state.realms[line.realmId];
    const succession = realm && FB.ensureRealmSuccession(state, line.realmId);
    const member = succession && succession.members[line.memberId];
    if (!member) return [];
    const ids = (member.childIds || []).slice();
    for (const id in succession.members) {
      if (succession.members[id].parentId === member.id &&
          ids.indexOf(id) < 0) ids.push(id);
    }
    const out = [];
    for (const id of ids) {
      const childMember = succession.members[id];
      if (!childMember || childMember.alive === false) continue;
      const child = FB.materializeRoyalChild(state, line.realmId, id);
      if (child && !child.dead) out.push(child);
    }
    return out;
  };

  function storedRealmStanding(state, rid) {
    const p = state.player;
    if (rid === p.liege) return p.liegeOp || 0;
    return (p.liegeOps && p.liegeOps[rid]) || 0;
  }

  function writeStoredRealmStanding(state, rid, value) {
    const p = state.player;
    value = FB.clamp(Number(value) || 0, -100, 100);
    if (rid === p.liege) p.liegeOp = value;
    else {
      p.liegeOps = p.liegeOps || {};
      p.liegeOps[rid] = value;
    }
    return value;
  }

  /* A compact founding ruler has no member record until play needs the
     person. Materialization installs that durable root without disturbing
     the existing ordered children, then creates one ordinary character for
     all personal relationship, marriage, and family behavior. */
  function ensureRealmRulerMember(state, rid) {
    const r = state.realms[rid];
    const s = FB.ensureRealmSuccession(state, rid);
    if (!r || !s || !r.ruler) return null;
    let m = s.rulerMemberId && s.members[s.rulerMemberId];
    if (!m) {
      const generation = s.rulerGeneration === undefined ? 1 : s.rulerGeneration;
      /* Initial eager ruler roots replaced uid-backed member ids. Burn the old
         id only during initial world construction so the protagonist and other
         non-court ids remain seed-compatible without reintroducing UI-order
         dependence for realms founded later. */
      if (state.turn === 0 && (!state.player || !state.player.charId)) FB.uid();
      m = {
        id:courtMemberId(r, 'g' + generation + '_ruler'),
        name:r.ruler.name,
        sex:r.ruler.sex || 'm',
        born:r.ruler.born !== undefined
          ? r.ruler.born : state.date.year - Math.max(0, r.ruler.age || 0),
        alive:true,
        parentId:null,
        childIds:[],
        charId:null,
        role:null
      };
      s.members[m.id] = m;
      s.rulerMemberId = m.id;
      for (const id in s.members) {
        const child = s.members[id];
        /* The consort is the ruler's spouse, never their child, and their
           parentId is legitimately null. */
        if (id === m.id || child.role === 'consort' ||
            (child.parentId || null) !== null) continue;
        child.parentId = m.id;
        m.childIds.push(id);
      }
    }
    m.name = r.ruler.name;
    m.sex = r.ruler.sex || m.sex || 'm';
    m.born = r.ruler.born !== undefined
      ? r.ruler.born : (m.born !== undefined
        ? m.born : state.date.year - Math.max(0, r.ruler.age || 0));
    m.alive = true;
    m.childIds = m.childIds || [];
    return m;
  }

  FB.realmRulerCharacterSnapshot = function (state, rid) {
    const r = state && state.realms && state.realms[rid];
    const s = r && r.succession;
    const m = s && s.rulerMemberId && s.members &&
      s.members[s.rulerMemberId];
    const c = m && m.charId && state.chars && state.chars[m.charId];
    if (!r || !r.alive || rid === 'player' || !c || c.dead) return null;
    return c;
  };

  function realmMartial(state, c) {
    return FB.skillSnapshot ? FB.skillSnapshot(state, c, 'mar') :
      FB.skillOf(c, 'mar');
  }

  FB.realmRulerCharacter = function (state, rid) {
    const r = state && state.realms && state.realms[rid];
    const c = FB.realmRulerCharacterSnapshot(state, rid);
    if (!c) return null;
    r.ruler.name = c.name;
    r.ruler.sex = c.sex;
    r.ruler.culture = c.culture;
    r.ruler.born = c.born;
    r.ruler.age = Math.max(0, FB.ageOf(c, state.date.year));
    r.ruler.mar = realmMartial(state, c);
    r.ruler.trait = c.traits && c.traits.length ? c.traits[0] : null;
    return c;
  };

  FB.realmIdForRulerCharacter = function (state, value) {
    const c = typeof value === 'string'
      ? state && state.chars && state.chars[value] : value;
    if (!state || !c || c.dead || !state.realms) return null;
    function rulesRealm(rid) {
      const r = state.realms[rid];
      const s = r && r.succession;
      const m = s && s.rulerMemberId && s.members &&
        s.members[s.rulerMemberId];
      return r && r.alive && rid !== 'player' && m && m.charId === c.id;
    }
    /* Prefer the character's inherited royal-line identity when it is also
       the crown they currently wear. A living abdication may put a character
       on a second throne without overwriting that existing descendant claim,
       so fall back to the compact ruler roots. */
    if (c.royalLine && rulesRealm(c.royalLine.realmId)) {
      return c.royalLine.realmId;
    }
    /* Verify the cached answer before trusting it. A stale entry becomes a
       miss rather than a lie: drop it and pay the scan once. The failure this
       guards against is quiet and expensive - a stale entry would let the
       player's mortality loop kill a ruler the realm simulation believes is
       alive, straight into the save. */
    const cached = rulerIndex[c.id];
    if (cached !== undefined) {
      if (rulesRealm(cached)) return cached;
      dropRulerIndex(c.id);
    } else if (rulerIndexState === state) {
      /* A complete index answers a miss without touching a realm. This is the
         whole point: without it the yearly pass pays a full realm scan for
         every record that is not a reigning ruler, which is the overwhelming
         majority of them, and the cost is O(records x realms) a year. */
      return null;
    }
    for (const rid in state.realms) {
      if (rulesRealm(rid)) {
        indexRuler(c.id, rid);
        return rid;
      }
    }
    return null;
  };

  FB.isReigningRealmRuler = function (state, value) {
    return !!FB.realmIdForRulerCharacter(state, value);
  };

  FB.materializeRealmRuler = function (state, rid, opts) {
    const r = state && state.realms && state.realms[rid];
    if (!r || !r.alive || !r.ruler || rid === 'player') return null;
    const m = ensureRealmRulerMember(state, rid);
    if (!m) return null;
    let c = m.charId && state.chars[m.charId];
    if (c && !c.dead) {
      indexRuler(c.id, rid);
      linkMaterializedRoyalFamily(state, r.succession, m, c, opts);
      return FB.realmRulerCharacter(state, rid);
    }
    c = recoverCourtCharacter(state, rid, m);
    if (c) {
      indexRuler(c.id, rid);
      linkMaterializedRoyalFamily(state, r.succession, m, c, opts);
      return FB.realmRulerCharacter(state, rid);
    }
    const charId = freeCourtCharId(state, m.id);
    if (!charId) return null;
    const cap = FB.world.byId[r.capital];
    const trait = r.ruler.trait && FBDATA.traits[r.ruler.trait]
      ? [r.ruler.trait] : [];
    const standing = storedRealmStanding(state, rid);
    c = FB.withSeed(courtScope(state, rid, m.id), function () {
      return FB.makeCharacter(state, {
        id:charId,
        name:r.ruler.name,
        sex:r.ruler.sex || 'm',
        culture:r.ruler.culture || (cap && cap.culture),
        religion:courtReligion(state, r, cap),
        born:m.born,
        dyn:'of ' + r.name,
        station:r.rank <= 2 ? 3 : 4,
        quality:Math.max(2, r.rank + 1),
        traits:trait,
        opinion:standing
      });
    });
    c.health = 8;
    /* r.ruler.mar is the effective war-strength projection. Reconstruct the
       base skill beneath this character's trait/equipment bonuses so eager
       loading or a later repair cannot add those bonuses twice. */
    const projectedMartial = Math.max(0, Number(r.ruler.mar) || 0);
    const generatedBaseMartial = Number(c.skills.mar) || 0;
    const martialBonus = realmMartial(state, c) - generatedBaseMartial;
    c.skills.mar = Math.max(0, projectedMartial - martialBonus);
    c.royalLine = { realmId:rid, memberId:m.id };
    c.realmStanding = standing;
    m.charId = c.id;
    indexRuler(c.id, rid);
    linkMaterializedRoyalFamily(state, r.succession, m, c, opts);
    return FB.realmRulerCharacter(state, rid) || c;
  };

  /* ---------- court records: eager for the living, compact for the dead ----
     The living court is map-bound and flat. Everything past that is dead
     accumulation, and the succession member already holds what the game needs
     about the dead: a name, dates, and parent/child links. */

  /* Is this record a living realm's court character rather than someone the
     player's own systems own? O(1) through the stored royal line. */
  FB.isCourtCharacter = function (state, c) {
    const line = c && c.royalLine;
    if (!state || !line || !state.realms) return false;
    const r = state.realms[line.realmId];
    const s = r && r.alive && r.succession;
    const m = s && s.members && s.members[line.memberId];
    return !!(m && m.charId === c.id);
  };

  /* Can the player still navigate to this character? Cultivation opinion
     alone deliberately does not count: standing lives in the realm-keyed
     store FB.syncRealmRulerStanding mirrors and survives compaction without
     the record. Everything that can put this person in front of the player
     again does count, and a missed reference class is the likeliest bug here,
     so the check errs toward keeping the record. */
  FB.courtRecordRetained = function (state, c, kinById) {
    if (!state || !c || !state.player) return false;
    const p = state.player;
    if (c.id === p.charId || p.courtingId === c.id) return true;
    if (c.items && c.items.length) return true;
    if (p.loadouts && p.loadouts[c.id]) return true;
    for (const role in state.roles) if (state.roles[role] === c.id) return true;
    /* Live attention on this exact person, as distinct from the standing it
       earns. The standing is realm-keyed and survives compaction on its own;
       an assignment, a journey under way to visit them, and the friend and
       rival contact clocks are all references the player's own UI resolves
       back through state.chars, and each would break on a missing record. */
    if (p.socialAttention && p.socialAttention[c.id]) return true;
    if (p.travel && p.travel.targetCharId === c.id) return true;
    if (p.friendContacts && p.friendContacts[c.id]) return true;
    if (p.rivalContacts && p.rivalContacts[c.id]) return true;
    const me = state.chars[p.charId];
    if (!me) return false; // no protagonist yet: nothing to navigate from
    if (me.spouseId === c.id || c.spouseId === me.id ||
        me.betrothedId === c.id || c.betrothedId === me.id ||
        (me.childrenIds || []).indexOf(c.id) >= 0) return true;
    /* A tie to anyone outside this court is a thread the player can follow.
       Court couples are married to each other and are not such a thread. */
    const partnerId = c.spouseId || c.betrothedId;
    const partner = partnerId && state.chars[partnerId];
    if (partner && !FB.isCourtCharacter(state, partner)) return true;
    const kin = kinById || FB.kinOf(state).byId;
    if (kin[c.id]) return true;
    /* A divorced generated spouse may no longer be the protagonist's kin,
       while still being a parent the living player-descendant tree resolves.
       Keep that parent record so compaction cannot null the child's lineage. */
    for (const childId of (c.childrenIds || [])) {
      const child = state.chars[childId];
      if (child && !child.dead &&
          FB.playerDescendantKind(state, child.id)) return true;
    }
    if (FB.isHouseholdCharacter && FB.isHouseholdCharacter(state, c.id)) return true;
    if (FB.retainerRecord && FB.retainerRecord(state, c.id)) return true;
    if (FB.papalOfficeOf && FB.papalOfficeOf(state, c)) return true;
    if (FB.isPapalClaimant && FB.isPapalClaimant(state, c)) return true;
    if (p.royalCompact && c.royalLine &&
        p.royalCompact.realmId === c.royalLine.realmId) return true;
    /* Court records are materialized from the succession tree and never join
       a province roster, but a mod or an odd save could have put one in the
       realm capital's; that is the only roster they could plausibly sit in. */
    const home = c.royalLine && state.realms[c.royalLine.realmId];
    const roster = home && state.provChars && state.provChars[home.capital];
    if (Array.isArray(roster) && roster.indexOf(c.id) >= 0) return true;
    return false;
  };

  /* Death of a court character. Retention is read before FB.killChar, because
     that path severs exactly the links the predicate consults. */
  FB.courtMemberDied = function (state, member, c, opts) {
    if (!member || !c) return false;
    opts = opts || {};
    const retained = opts.retained !== undefined
      ? opts.retained
      : FB.courtRecordRetained(state, c, opts.kinById);
    if (!c.dead && FB.killChar) {
      FB.killChar(state, c, { familyLinks:opts.familyLinks });
    }
    member.alive = false;
    if (retained) return false;
    return FB.compactCourtRecord(state, member, c, {
      retentionChecked:true,
      kinById:opts.kinById
    });
  };

  /* Compaction: the member entry becomes the tombstone and the full record
     goes. Ordering is the subtle part - the member is marked dead first, so
     FB.refreshRealmSuccession can never mistake a compacted member for a
     living one whose character merely went missing. Forward-only: this runs
     in the death path and never retroactively over a loaded save, where dead
     materialized royals the player once met are already present.

     The retention decision belongs to the caller, made before FB.killChar
     severed the links it reads. Direct callers keep a one-way defensive
     re-check; a yearly mortality caller marks its snapshot answer checked so
     each corpse does not rebuild the family index. */
  FB.compactCourtRecord = function (state, member, c, opts) {
    if (!state || !member || !c || member.charId !== c.id) return false;
    if (member.alive !== false) return false;
    opts = opts || {};
    if (!opts.retentionChecked &&
        FB.courtRecordRetained(state, c, opts.kinById)) return false;
    member.name = c.name;
    member.born = c.born;
    if (c.died !== undefined) member.died = c.died;
    member.charId = null;
    dropRulerIndex(c.id);
    detachCourtRecord(state, c);
    delete state.chars[c.id];
    if (FB.touchFamily) FB.touchFamily();
    return true;
  };

  /* A realm can die under its court - escheat, conquest, absorption. Those
     characters stop being court characters and fall back to the player's own
     yearly pass, so their deaths compact from there instead. Without this the
     record count would track how many realms had risen and fallen rather than
     how large the map is, which is the whole property this design buys.

     Callers decide retention before the death, not here: FB.killChar severs
     the links FB.courtRecordRetained reads, so a spouse or betrothed asked
     about afterwards would read as a stranger and lose their record. */
  FB.compactRoyalRecordOnDeath = function (state, c, opts) {
    if (!state || !c || !c.dead || !c.royalLine) return false;
    const r = state.realms && state.realms[c.royalLine.realmId];
    const s = r && r.succession;
    const m = s && s.members && s.members[c.royalLine.memberId];
    if (m && m.charId === c.id) {
      m.alive = false;
      return FB.compactCourtRecord(state, m, c, opts);
    }
    dropRulerIndex(c.id);
    detachCourtRecord(state, c);
    delete state.chars[c.id];
    if (FB.touchFamily) FB.touchFamily();
    return true;
  };

  /* Leave no link pointing at a record that is about to stop existing. The
     compact tree keeps the genealogy through member parentId/childIds, so
     nothing about the family is lost with the character fields. */
  function detachCourtRecord(state, c) {
    const parents = [c.fatherId && state.chars[c.fatherId],
      c.motherId && state.chars[c.motherId]];
    for (const parent of parents) {
      if (!parent || !Array.isArray(parent.childrenIds)) continue;
      const i = parent.childrenIds.indexOf(c.id);
      if (i >= 0) parent.childrenIds.splice(i, 1);
    }
    for (const id of (c.childrenIds || [])) {
      const child = state.chars[id];
      if (!child) continue;
      if (child.fatherId === c.id) child.fatherId = null;
      if (child.motherId === c.id) child.motherId = null;
      if (Array.isArray(child.stepParentIds)) {
        const i = child.stepParentIds.indexOf(c.id);
        if (i >= 0) child.stepParentIds.splice(i, 1);
      }
    }
  }

  function releaseRulerHouseholdAssignments(state, c) {
    const p = state.player || {};
    if (FB.unassignEnterpriseWorker) {
      FB.unassignEnterpriseWorker(state, c.id);
    } else {
      for (const enterprise of (p.enterprises || [])) {
        if (enterprise.workerId !== c.id) continue;
        enterprise.workerId = null;
        if (enterprise.workerLocked !== undefined) {
          delete enterprise.workerLocked;
        }
      }
    }
    if (p.familyOffices) {
      for (const office in p.familyOffices) {
        if (p.familyOffices[office] === c.id) delete p.familyOffices[office];
      }
    }
    if (Array.isArray(p.retainers)) {
      p.retainers = p.retainers.filter(function (record) {
        return !record || record.charId !== c.id;
      });
    }
    for (const id in state.chars) {
      const student = state.chars[id];
      if (!student || !student.edu || student.edu.tutorId !== c.id) continue;
      student.edu.tutorId = null;
      if (student.edu.school === 'master') student.edu.school = null;
    }
    if (state.agency && state.agency.familyAmbitions) {
      delete state.agency.familyAmbitions[c.id];
    }
    if (p.loadouts) delete p.loadouts[c.id];
    if (FB.setProtected) FB.setProtected(state, 'staffingWorker', c.id, false);
    if (c.role === 'retainer') c.role = null;
  }

  /* Install an existing ordinary character as the ruler of a generated
     realm. Settlement beneficiaries keep their personal parents, spouse,
     children, dynasty, career history, betrothal, and relationships. Work,
     household office, retainer, family-agency, tutoring, and armory
     assignments end because the new ruler now governs a separate household. */
  FB.assignRealmRulerCharacter = function (state, realmId, charId) {
    const realm = state && state.realms && state.realms[realmId];
    const c = state && state.chars && state.chars[charId];
    if (!realm || !realm.alive || !realm.generated || realmId === 'player' ||
        !c || c.dead || FB.isReigningRealmRuler(state, c)) return false;
    const personalStanding = FB.standingOf
      ? FB.standingOf(state, { kind:'character', id:c.id })
      : FB.clamp(Number(c.opinion) || 0, -100, 100);
    const generation = realm.ruler && realm.ruler.generation !== undefined
      ? realm.ruler.generation : 1;
    const rootId = 'royal_' + realmId + '_' + c.id;
    const root = {
      id:rootId, name:c.name, sex:c.sex, born:c.born, alive:true,
      parentId:null, childIds:[], charId:c.id, role:null
    };
    const succession = {
      rulerGeneration:generation,
      rulerMemberId:rootId,
      members:{},
      order:[],
      heirId:null
    };
    succession.members[rootId] = root;
    const children = FB.childrenOf ? FB.childrenOf(state, c).filter(function (child) {
      return child && !child.dead;
    }) : [];
    children.sort(function (a, b) {
      if (a.sex !== b.sex) return a.sex === 'm' ? -1 : 1;
      return a.born - b.born;
    });
    for (const child of children) {
      const memberId = 'royal_' + realmId + '_' + child.id;
      succession.members[memberId] = {
        id:memberId,
        name:child.name,
        sex:child.sex,
        born:child.born,
        alive:true,
        parentId:rootId,
        childIds:[],
        charId:child.id,
        role:null
      };
      root.childIds.push(memberId);
      succession.order.push(memberId);
      if (!child.royalLine) {
        child.royalLine = { realmId:realmId, memberId:memberId };
      }
    }
    succession.heirId = succession.order.length ? succession.order[0] : null;
    realm.succession = succession;
    realm.ruler = {
      name:c.name,
      sex:c.sex,
      culture:c.culture,
      born:c.born,
      age:FB.ageOf(c, state.date.year),
      mar:realmMartial(state, c),
      trait:c.traits && c.traits.length ? c.traits[0] : null,
      generation:generation
    };
    realm.religion = c.religion || realm.religion;
    realm.dynasty = c.dyn || c.name;
    c.station = Math.max(c.station || 0, realm.rank <= 2 ? 3 : 4);
    if (!c.royalLine) c.royalLine = { realmId:realmId, memberId:rootId };
    indexRuler(c.id, realmId);
    FB.refreshRealmSuccession(state, realmId);
    if (FB.setRealmRulerStanding) {
      FB.setRealmRulerStanding(state, realmId, personalStanding);
    } else {
      c.opinion = personalStanding;
    }
    releaseRulerHouseholdAssignments(state, c);
    return realm;
  };

  /* Personal and political Standing are two views of one score while this
     exact character reigns. The marker lets direct legacy writes on either
     side reconcile. If old code has changed both legacy fields since the last
     canonical sync, the exact materialized character is the authoritative
     compatibility view. */
  function reconciledRealmRulerStanding(state, rid, c) {
    const stored = storedRealmStanding(state, rid);
    if (!c) return stored;
    let marker = Number(c.realmStanding);
    if (!isFinite(marker)) marker = stored;
    const personal = FB.clamp(Number(c.opinion) || 0, -100, 100);
    let value;
    if (stored !== marker && personal === marker) value = stored;
    else if (personal !== marker && stored === marker) value = personal;
    else if (personal !== marker && stored !== marker) value = personal;
    else value = marker;
    return FB.clamp(Number(value) || 0, -100, 100);
  }

  FB.realmRulerStandingSnapshot = function (state, rid) {
    const stored = reconciledRealmRulerStanding(state, rid,
      FB.realmRulerCharacterSnapshot(state, rid));
    return FB.faithAdjustedRealmStanding
      ? FB.faithAdjustedRealmStanding(state, rid, stored) : stored;
  };

  FB.syncRealmRulerStanding = function (state, rid) {
    const c = FB.realmRulerCharacter(state, rid);
    let value = reconciledRealmRulerStanding(state, rid, c);
    value = writeStoredRealmStanding(state, rid, value);
    if (c) {
      c.opinion = value;
      c.realmStanding = value;
    }
    return FB.faithAdjustedRealmStanding
      ? FB.faithAdjustedRealmStanding(state, rid, value) : value;
  };

  FB.setRealmRulerStanding = function (state, rid, value) {
    value = writeStoredRealmStanding(state, rid, value);
    if (FB.markRealmStandingFaithBaseline) {
      FB.markRealmStandingFaithBaseline(state, rid);
    }
    const c = FB.realmRulerCharacter(state, rid);
    if (c) {
      c.opinion = value;
      c.realmStanding = value;
    }
    return value;
  };

  FB.syncMaterializedRealmRulers = function (state) {
    if (!state || !state.realms) return;
    for (const rid in state.realms) {
      if (FB.realmRulerCharacter(state, rid)) {
        FB.syncRealmRulerStanding(state, rid);
      }
    }
  };

  /* The compact tree still enforces the ordinary close-blood marriage bar.
     Sibling members share one parent (including a materialized ruler root);
     cousins remain eligible, matching the full-character kin rules. */
  function royalKinshipDegreeFromSuccession(a, b, succession) {
    const members = succession && succession.members;
    const ma = members && members[a.royalLine.memberId];
    const mb = members && members[b.royalLine.memberId];
    if (!ma || !mb) return 'unrelated';
    if (ma.id === mb.id) return 'self';
    if (ma.parentId === mb.id || mb.parentId === ma.id) return 'parent_child';
    function siblings(x, y) {
      return !!x && !!y && x.id !== y.id &&
        (x.parentId || null) === (y.parentId || null);
    }
    if (siblings(ma, mb)) return 'full_sibling';
    const pa = ma.parentId && members[ma.parentId];
    const pb = mb.parentId && members[mb.parentId];
    if ((pa && siblings(pa, mb)) || (pb && siblings(pb, ma))) return 'avuncular';
    if ((pa && pa.parentId === mb.id) || (pb && pb.parentId === ma.id)) {
      return 'grandparent';
    }
    if (pa && pb && siblings(pa, pb)) return 'cousin';
    return 'unrelated';
  }

  function royalCloseKinFromSuccession(a, b, succession) {
    const degree = royalKinshipDegreeFromSuccession(a, b, succession);
    return degree !== 'unrelated' && degree !== 'cousin';
  }

  FB.royalKinshipDegreeSnapshot = function (state, a, b) {
    if (!a || !b || !a.royalLine || !b.royalLine ||
        a.royalLine.realmId !== b.royalLine.realmId) return 'unrelated';
    const r = state.realms[a.royalLine.realmId];
    return r ? royalKinshipDegreeFromSuccession(a, b, r.succession) : 'unrelated';
  };

  FB.royalCloseKinSnapshot = function (state, a, b) {
    if (!a || !b || !a.royalLine || !b.royalLine ||
        a.royalLine.realmId !== b.royalLine.realmId) return false;
    const r = state.realms[a.royalLine.realmId];
    return !!(r && royalCloseKinFromSuccession(a, b, r.succession));
  };

  FB.royalCloseKin = function (state, a, b) {
    if (!a || !b || !a.royalLine || !b.royalLine ||
        a.royalLine.realmId !== b.royalLine.realmId) return false;
    const r = state.realms[a.royalLine.realmId];
    const succession = r && FB.ensureRealmSuccession(state, r.id);
    return !!(succession &&
      royalCloseKinFromSuccession(a, b, succession));
  };

  FB.registerRoyalBirth = function (state, child, father, mother) {
    const candidates = [];
    if (father && father.royalLine) candidates.push(father);
    if (mother && mother.royalLine) candidates.push(mother);
    const compact = state.player && state.player.royalCompact;
    let royal = null;
    if (compact) {
      for (const candidate of candidates) {
        if (candidate.royalLine.realmId === compact.realmId) {
          royal = candidate;
          break;
        }
      }
    }
    if (!royal) {
      for (const candidate of candidates) {
        const candidateRealm = state.realms[candidate.royalLine.realmId];
        if (candidateRealm && candidateRealm.alive) {
          royal = candidate;
          break;
        }
      }
    }
    if (!royal || !child) return;
    const line = royal.royalLine;
    const r = state.realms[line.realmId];
    const s = r && FB.ensureRealmSuccession(state, line.realmId);
    const parent = s && s.members[line.memberId];
    if (!r || !s || !parent) return;
    /* Match the pre-eager counter movement without letting it define the
       durable member identity. */
    FB.uid();
    const m = {
      id:courtMemberId(r, 'child_' + child.id),
      name: child.name,
      sex: child.sex,
      born: child.born,
      alive: !child.dead,
      parentId: parent.id,
      childIds: [],
      charId: child.id,
      role: null
    };
    s.members[m.id] = m;
    parent.childIds = parent.childIds || [];
    parent.childIds.push(m.id);
    child.royalLine = { realmId: r.id, memberId: m.id };
    if (s.rulerMemberId === parent.id) {
      const children = orderedMemberIds(s, parent.id);
      const rest = s.order.filter(function (id) { return children.indexOf(id) < 0; });
      s.order = children.concat(rest);
    }
    FB.refreshRealmSuccession(state, r.id);
  };

  function advanceRealmAfterRulerDeath(state, rid) {
    const appointedTenureEnds = FB.feudalTenureEndsAtDeath &&
      FB.feudalTenureEndsAtDeath(state, rid);
    const appointedTenure = appointedTenureEnds && FB.feudalContractOf
      ? FB.feudalContractOf(state, rid).tenure : null;
    const heir = FB.advanceRealmSuccession(state, rid);
    if (appointedTenureEnds && state.realms[rid] && state.realms[rid].alive &&
        FB.revertFeudalRealm) {
      FB.revertFeudalRealm(state, rid, appointedTenure);
    }
    return heir;
  }

  FB.royalCharDied = function (state, c, reigningRealmId) {
    if (!state || !state.realms || !c) return;
    const line = c.royalLine;
    const r = line && state.realms[line.realmId];
    const s = r && (r.alive
      ? FB.ensureRealmSuccession(state, line.realmId) : r.succession);
    const m = s && s.members[line.memberId];
    const advanced = {};
    if (m) {
      m.alive = false;
      if (s.rulerMemberId === m.id && r.alive) {
        advanceRealmAfterRulerDeath(state, r.id);
        advanced[r.id] = 1;
      } else if (r.alive) {
        FB.refreshRealmSuccession(state, r.id);
      }
    }
    /* royalLine is the person's birth claim, not necessarily the throne they
       currently wear. killChar captured the indexed crown before marking the
       character dead. An ordinary court death therefore stops here instead
       of scanning every realm; a real ruler still scans the roots so every
       corrupted legacy duplicate advances along with the legitimate crown. */
    if (!reigningRealmId) return;
    for (const rid in state.realms) {
      if (advanced[rid] || rid === 'player') continue;
      const realm = state.realms[rid];
      const succession = realm && realm.alive && realm.succession;
      const root = succession && succession.rulerMemberId &&
        succession.members && succession.members[succession.rulerMemberId];
      if (!root || root.charId !== c.id) continue;
      root.alive = false;
      advanceRealmAfterRulerDeath(state, rid);
      advanced[rid] = 1;
    }
  };

  function makeHeirIfEmpty(state, r, s) {
    if (s.order.length) return;
    const parentId = s.rulerMemberId || null;
    const generation = s.rulerGeneration === undefined ? 1 : s.rulerGeneration;
    let ordinal = 0;
    let key = 'g' + generation + '_heir' + ordinal;
    while (s.members[courtMemberId(r, key)]) {
      ordinal++;
      key = 'g' + generation + '_heir' + ordinal;
    }
    /* Scoped like every other court draw, so a line repaired during the yearly
       tick and the same line repaired while loading an old save agree. */
    const m = newRoyalMember(state, r, parentId,
      Math.max(0, Math.min(8, r.ruler.age - 16)), {
        key:key,
        scope:courtScope(state, r.id, key)
      });
    s.members[m.id] = m;
    if (parentId && s.members[parentId]) {
      s.members[parentId].childIds = s.members[parentId].childIds || [];
      s.members[parentId].childIds.push(m.id);
    }
    s.order = [m.id];
    s.heirId = m.id;
  }

  FB.advanceRealmSuccession = function (state, rid, opts) {
    opts = opts || {};
    const r = state.realms[rid];
    if (!r || isPapalTerritorialRealm(state, rid) ||
        (r.succession && r.succession.papalElective)) return null;
    const s = FB.ensureRealmSuccession(state, rid);
    if (!s) return null;
    const formerPlayerAlliance = rid !== 'player' &&
      FB.areAllied(state, 'player', rid);
    FB.refreshRealmSuccession(state, rid);
    makeHeirIfEmpty(state, r, s);
    const outgoing = s.rulerMemberId && s.members[s.rulerMemberId];
    let heirId = null;
    let heir = null;
    let c = null;
    /* Accession itself is an eager-loading boundary. A collateral beyond the
       displayed six can still inherit, so materialize that exact member on
       its scoped court stream before reading any ruler fields. A malformed
       save may have an unrelated record squatting on the heir's derived id.
       Preserve that record and retire only the unmaterializable compact
       candidate, then continue through the line instead of freezing the
       realm on a dead throne forever. The character map makes the repair
       loop finite: after at most one attempt per occupied id, a fresh
       collateral's derived id must be free. */
    const recoveryLimit = Object.keys(state.chars || {}).length + 1;
    let recoveryAttempts = 0;
    while (recoveryAttempts < recoveryLimit) {
      makeHeirIfEmpty(state, r, s);
      heirId = s.order[0];
      heir = heirId && s.members[heirId];
      if (!heir) {
        if (s.order.length) s.order.shift();
        recoveryAttempts++;
        continue;
      }
      c = heir.charId && state.chars[heir.charId];
      if (!c || c.dead) c = FB.materializeRoyalChild(state, rid, heirId);
      if (c && !c.dead) break;
      heir.alive = false;
      heir.died = state.date.year;
      FB.refreshRealmSuccession(state, rid);
      recoveryAttempts++;
    }
    if (!heir || !c || c.dead) return null;
    s.order.shift();
    /* Read the heir as a person before installing them as ruler. Once the
       crown pointer changes, the typed facade correctly resolves that same
       character through the realm store instead. */
    const heirStanding = c ? FB.standingOf(state, {
      kind:'character', id:c.id
    }) : 0;
    s.rulerMemberId = heirId;
    if (outgoing && outgoing.charId) dropRulerIndex(outgoing.charId);
    const children = orderedMemberIds(s, heirId);
    s.order = children.concat(s.order.filter(function (id) { return children.indexOf(id) < 0; }));
    r.ruler = {
      name:c.name,
      sex:c.sex,
      culture:c.culture,
      born:c.born,
      age:FB.ageOf(c, state.date.year),
      mar:realmMartial(state, c),
      trait:c.traits && c.traits.length ? c.traits[0] : null,
      generation: (s.rulerGeneration || 1) + 1
    };
    s.rulerGeneration = r.ruler.generation;
    c.realmStanding = writeStoredRealmStanding(state, rid, heirStanding);
    c.opinion = c.realmStanding;
    if (FB.markRealmStandingFaithBaseline) {
      FB.markRealmStandingFaithBaseline(state, rid);
    }
    indexRuler(c.id, rid);
    /* Continuity of person. The heir's own record takes the throne rather
       than a fresh stub with a newly rolled martial score and temper, so the
       sheet a player spent years cultivating is the sheet that reigns.
       FB.realmRulerCharacter stays the one place that pushes character fields
       back onto r.ruler, keeping the stub a projection and not a rival truth. */
    const playerCrowned = !!(c && c.id === state.player.charId);
    if (!playerCrowned) {
      const crowned = FB.materializeRealmRuler(state, rid);
      if (crowned) FB.realmRulerCharacter(state, rid);
      /* Each generation is seeded its own consort; past ones stay in the tree
         as dated tombstones. A protagonist who inherits a throne brings their
         own household and is never handed a generated spouse. */
      seedConsortMember(state, rid);
      if (COURT_EAGERNESS === 'court') FB.materializeRealmConsort(state, rid);
    }
    makeHeirIfEmpty(state, r, s);
    FB.refreshRealmSuccession(state, rid);
    /* A temporal crown can pass to a woman even when the realm also held a
       sex-gated central religious office. Revalidate immediately so the
       office becomes a vacancy instead of styling her as its holder. */
    if (FB.ensureReligiousHeads) FB.ensureReligiousHeads(state);
    FB.repairAlliances(state);
    if (!opts.repair && FB.noteDiplomaticSuccession &&
        !(c && c.id === state.player.charId)) {
      FB.noteDiplomaticSuccession(state, rid, {
        formerAlliance:formerPlayerAlliance
      });
    }
    if (!opts.repair && FB.reconcileHouseholdLoadouts) {
      FB.reconcileHouseholdLoadouts(state);
    }
    if (c && c.id === state.player.charId && FB.absorbRealm) FB.absorbRealm(state, rid, c);
    if (FB.intrigueRealmSuccession) FB.intrigueRealmSuccession(state, rid);
    return heir;
  };

  function pairIds(a, b) { return a < b ? [a, b] : [b, a]; }

  FB.realmRulerGeneration = function (state, rid) {
    const r = state.realms[rid];
    return r && r.ruler && r.ruler.generation !== undefined ? r.ruler.generation : 1;
  };

  FB.repairAlliances = function (state) {
    state.alliances = state.alliances || [];
    /* validate first without allocating: the common case is a clean list,
       which keeps its array identity (callers read state.alliances or the
       return value — the content is what matters, and it is unchanged) */
    const seen = {};
    let clean = true;
    for (const a of state.alliances) {
      if (!a || !a.a || !a.b || a.a === a.b || seen[a.a] || seen[a.b]) { clean = false; break; }
      const ra = state.realms[a.a], rb = state.realms[a.b];
      if (!ra || !rb || !ra.alive || !rb.alive) { clean = false; break; }
      if (a.aGen !== FB.realmRulerGeneration(state, a.a) ||
          a.bGen !== FB.realmRulerGeneration(state, a.b)) { clean = false; break; }
      seen[a.a] = seen[a.b] = 1;
    }
    if (clean) return state.alliances;
    const out = [], occupied = {};
    for (const a of state.alliances) {
      if (!a || !a.a || !a.b || a.a === a.b || occupied[a.a] || occupied[a.b]) continue;
      const ra = state.realms[a.a], rb = state.realms[a.b];
      if (!ra || !rb || !ra.alive || !rb.alive) continue;
      if (a.aGen !== FB.realmRulerGeneration(state, a.a) ||
          a.bGen !== FB.realmRulerGeneration(state, a.b)) continue;
      occupied[a.a] = occupied[a.b] = 1;
      out.push(a);
    }
    state.alliances = out;
    return out;
  };

  FB.allianceOf = function (state, rid) {
    FB.repairAlliances(state);
    for (const a of state.alliances) if (a.a === rid || a.b === rid) return a;
    return null;
  };

  FB.allianceSnapshot = function (state, rid) {
    const alliances = state && state.alliances;
    if (!Array.isArray(alliances)) return null;
    for (const a of alliances) {
      if (!a || (a.a !== rid && a.b !== rid)) continue;
      const ra = state.realms[a.a], rb = state.realms[a.b];
      if (!ra || !rb || !ra.alive || !rb.alive) continue;
      if (a.aGen !== FB.realmRulerGeneration(state, a.a) ||
          a.bGen !== FB.realmRulerGeneration(state, a.b)) continue;
      return a;
    }
    return null;
  };

  FB.areAlliedSnapshot = function (state, a, b) {
    const p = pairIds(a, b);
    const alliance = FB.allianceSnapshot(state, p[0]);
    return !!alliance && alliance.a === p[0] && alliance.b === p[1];
  };

  FB.alliedRealm = function (state, rid) {
    const a = FB.allianceOf(state, rid);
    return a ? (a.a === rid ? a.b : a.a) : null;
  };

  FB.areAllied = function (state, a, b) {
    const p = pairIds(a, b), al = FB.allianceOf(state, p[0]);
    return !!al && al.a === p[0] && al.b === p[1];
  };

  FB.formAlliance = function (state, a, b, source) {
    const p = pairIds(a, b);
    if (p[0] === p[1] || FB.allianceOf(state, p[0]) || FB.allianceOf(state, p[1])) return false;
    const ra = state.realms[p[0]], rb = state.realms[p[1]];
    if (!ra || !rb || !ra.alive || !rb.alive) return false;
    if (FB.isRealmAtWar && (FB.isRealmAtWar(state, p[0]) || FB.isRealmAtWar(state, p[1]))) {
      return false;
    }
    state.alliances.push({
      a: p[0], b: p[1], source: source || 'diplomacy',
      aGen: FB.realmRulerGeneration(state, p[0]),
      bGen: FB.realmRulerGeneration(state, p[1])
    });
    return true;
  };

  FB.breakAlliance = function (state, rid, partner) {
    state.alliances = (state.alliances || []).filter(function (a) {
      return !((a.a === rid && (!partner || a.b === partner)) ||
        (a.b === rid && (!partner || a.a === partner)));
    });
  };

  FB.aiBaseHost = function (state, rid) {
    const captivePenalty = FB.intrigueRealmRulerCaptive &&
      FB.intrigueRealmRulerCaptive(state, rid) ? 0.8 : 1;
    const base = Math.max(60, Math.round(FB.realmStrength(state, rid) *
      FBDATA.balance.levyPerDev * (FBDATA.balance.aiHostPerDev || 0.3) *
      (1 + (FB.techBonus ? FB.techBonus(state, 'levy', rid) : 0))));
    const burden = FB.fortGarrisonBurden
      ? FB.fortGarrisonBurden(state, rid) : 0;
    return Math.max(0, Math.round(base * captivePenalty) - burden);
  };

  FB.aiFieldHostRatio = function (state, rid) {
    const field = FB.aiBaseHost(state, rid);
    const burden = FB.fortGarrisonBurden
      ? FB.fortGarrisonBurden(state, rid) : 0;
    return field / Math.max(1, field + burden);
  };

  function alliedReinforcement(state, defenderId, readOnly) {
    const alliance = readOnly ? FB.allianceSnapshot(state, defenderId) : null;
    const allyId = readOnly
      ? (alliance
        ? (alliance.a === defenderId ? alliance.b : alliance.a) : null)
      : FB.alliedRealm(state, defenderId);
    if (!allyId || FB.isRealmAtWar(state, allyId)) return { ally: null, men: 0 };
    const defenderBase = defenderId === 'player' ? FB.playerLevy(state) : FB.aiBaseHost(state, defenderId);
    const allyBase = allyId === 'player' ? FB.playerLevy(state) : FB.aiBaseHost(state, allyId);
    return { ally: allyId, men: Math.max(0, Math.round(Math.min(allyBase * 0.25, defenderBase * 0.5))) };
  }

  FB.alliedReinforcement = function (state, defenderId) {
    return alliedReinforcement(state, defenderId, false);
  };

  FB.alliedReinforcementSnapshot = function (state, defenderId) {
    return alliedReinforcement(state, defenderId, true);
  };

  FB.realmDefensiveStrength = function (state, rid) {
    const base = rid === 'player' ? FB.playerLevy(state) : FB.aiBaseHost(state, rid);
    return base + FB.alliedReinforcement(state, rid).men;
  };

  FB.isPlayerSovereign = function (state) {
    const r = state.realms.player;
    return !!(r && r.alive && !r.liege);
  };

  /* ================= settlements =================
     Each settled county exposes 2-4 settlement slots through the compiled
     site records (see compilation above): authored presentations first, then
     deterministic generated records. The visible count still follows the
     legacy rule — 2 + a hash bit of the province id, plus one at development
     5 — raised to the authored count when more slots are authored. Names of
     generated slots come from a plain string hash (never the seeded RNG, so
     saves stay stable). Size follows CURRENT development, with an authored
     baseline kind as the floor: the head settlement grows village → town →
     city as the province flourishes, never below its authored baseline. */
  function strHash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return h;
  }

  FB.settlementName = function (cultureId, h) {
    const sets = FBDATA.settlementNames || {};
    const s = sets[cultureId] || sets.default || { pre: ['New'], suf: ['town'] };
    // unsigned shift: a signed >> on large hashes goes negative and indexes nothing
    return s.pre[h % s.pre.length] + s.suf[(h >>> 4) % s.suf.length];
  };

  /* One rank helper so UI, marker priority, and projection cannot disagree
     about village < town < city. */
  var SETTLEMENT_KIND_BY_RANK = ['village', 'town', 'city'];

  FB.settlementKindRank = function (kind) {
    return kind === 'city' ? 2 : (kind === 'town' ? 1 : 0);
  };

  /* Live promotions by slot, floored at the authored baseline: the head
     becomes at least a town at development 4 and a city at 7; the second
     slot becomes at least a town at 6. */
  function liveSettlementRank(baseRank, index, dev) {
    if (index === 0) {
      if (dev >= 7) return Math.max(baseRank, 2);
      if (dev >= 4) return Math.max(baseRank, 1);
    } else if (index === 1 && dev >= 6) {
      return Math.max(baseRank, 1);
    }
    return baseRank;
  }

  function settlementDev(state, pid) {
    const pr = FB.world && FB.world.byId ? FB.world.byId[pid] : null;
    return (state && state.dev && state.dev[pid]) || (pr ? pr.dev0 : 0) || 1;
  }

  /* Development-scaled village reveals: one additional settlement becomes
     visible at development 3, 5, 7, and 9. */
  function villageBonus(dev) {
    return (dev >= 3) + (dev >= 5) + (dev >= 7) + (dev >= 9);
  }

  /* Highest player-enterprise settlement floor per county, cached on the
     enterprise list's identity and length: a settlement assignment is fixed
     at founding, so only an append or a removal can move the floor. */
  let enterpriseAnchorCache = null;
  function enterpriseAnchors(state) {
    const list = state && state.player ? state.player.enterprises : null;
    if (!list || !list.length) {
      enterpriseAnchorCache = null;
      return null;
    }
    if (enterpriseAnchorCache && enterpriseAnchorCache.list === list &&
        enterpriseAnchorCache.length === list.length) {
      return enterpriseAnchorCache.map;
    }
    const map = {};
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e || !e.provinceId) continue;
      const floor = (e.settlement | 0) + 1;
      if (!map[e.provinceId] || map[e.provinceId] < floor) {
        map[e.provinceId] = floor;
      }
    }
    enterpriseAnchorCache = { list:list, length:list.length, map:map };
    return map;
  }

  FB.settlementVisibleCount = function (state, pid) {
    const info = FB.world && FB.world.sitesByProv ? FB.world.sitesByProv[pid] : null;
    if (!info) return 0;
    const dev = settlementDev(state, pid);
    let visible = Math.min(SETTLEMENT_MAX_SLOTS,
      Math.max(info.authored, info.legacyBase + villageBonus(dev)));
    /* A fort remains a map landmark even if later development decline would
       ordinarily conceal its settlement. The cached fort lookup keeps this
       allocation-free renderer seam constant-time. */
    if (state && FB.fortAt) {
      const fort = FB.fortAt(state, pid);
      if (fort && !fort.ruined) visible = Math.max(visible, (fort.s | 0) + 1);
    }
    /* Player investments anchor their settlement the same way: any standing
       building (only counties something was built in carry a list at all,
       so this scan never runs for ordinary AI land), any family enterprise,
       and the player's own home settlement. */
    if (state) {
      const built = state.buildings && state.buildings[pid];
      if (built) {
        for (let bi = 0; bi < built.length; bi++) {
          const b = built[bi];
          if (b && typeof b === 'object' && !b.ruined) {
            visible = Math.max(visible, (b.s | 0) + 1);
          }
        }
      }
      const anchors = enterpriseAnchors(state);
      if (anchors && anchors[pid]) visible = Math.max(visible, anchors[pid]);
      const p = state.player;
      if (p && pid === p.provinceId && typeof p.homeSettlement === 'number') {
        visible = Math.max(visible, (p.homeSettlement | 0) + 1);
      }
    }
    return Math.min(SETTLEMENT_MAX_SLOTS, visible);
  };

  /* Allocation-free seam for the map renderer: whether one compiled site is
     currently visible, and its live kind rank, without building arrays. */
  FB.siteVisible = function (state, site) {
    return site.index < FB.settlementVisibleCount(state, site.pid);
  };

  FB.siteKindRank = function (state, site) {
    return liveSettlementRank(FB.settlementKindRank(site.kind), site.index,
      settlementDev(state, site.pid));
  };

  /* The next settlement-growth threshold that will actually change something
     for this county: an authored baseline or list can satisfy a normal
     threshold ahead of time, and then that threshold is skipped rather than
     promised. */
  FB.settlementDevelopment = function (state, pid) {
    const pr = FB.world.byId[pid];
    if (!pr || pr.wasteland) return null;
    const development = settlementDev(state, pid);
    const info = FB.world.sitesByProv ? FB.world.sitesByProv[pid] : null;
    const authored = info ? info.authored : 0;
    const legacyBase = info ? info.legacyBase : 2 + (strHash(pid) % 2);
    const headBase = info && info.list[0]
      ? FB.settlementKindRank(info.list[0].kind) : 0;
    const secondBase = info && info.list[1]
      ? FB.settlementKindRank(info.list[1].kind) : 0;
    function visibleAt(d) {
      return Math.min(SETTLEMENT_MAX_SLOTS,
        Math.max(authored, legacyBase + villageBonus(d)));
    }
    const candidates = [];
    if (visibleAt(3) > visibleAt(2)) candidates.push({ t: 3, change: 'new_village' });
    if (headBase < 1) candidates.push({ t: 4, change: 'head_town' });
    if (visibleAt(5) > visibleAt(4)) candidates.push({ t: 5, change: 'new_village' });
    if (secondBase < 1) candidates.push({ t: 6, change: 'second_town' });
    if (headBase < 2) candidates.push({ t: 7, change: 'head_city' });
    if (visibleAt(7) > visibleAt(6)) candidates.push({ t: 7, change: 'new_village' });
    if (visibleAt(9) > visibleAt(8)) candidates.push({ t: 9, change: 'new_village' });
    let next = null, change = null;
    for (const candidate of candidates) {
      if (candidate.t > development) {
        next = candidate.t; change = candidate.change;
        break;
      }
    }
    return {
      development:development,
      bookmark:pr.dev0 || 1,
      next:next,
      change:change,
      remaining:next === null ? 0 : next - development
    };
  };

  /* Read-only projection for ordinary game systems. Records carry the stable
     site slug, bookmark name, live kind, compiled world point, and authored
     flag; callers reading only name and kind keep working unchanged. */
  FB.settlementsOf = function (state, pid) {
    const info = FB.world && FB.world.sitesByProv ? FB.world.sitesByProv[pid] : null;
    if (!info) return [];
    const dev = settlementDev(state, pid);
    const n = FB.settlementVisibleCount(state, pid);
    const out = [];
    for (let i = 0; i < n; i++) {
      const rec = info.list[i];
      out.push({
        site:rec.site,
        name:rec.name,
        kind:SETTLEMENT_KIND_BY_RANK[liveSettlementRank(
          FB.settlementKindRank(rec.kind), rec.index, dev)],
        x:rec.x,
        y:rec.y,
        authored:rec.authored
      });
    }
    return out;
  };

  FB.realmProvinces = function (state, realmId) {
    rcEnsure(state);
    const realm = state.realms[realmId];
    if (realm && realm.liege) return FB.realmTerritory(state, realmId);
    return rc.provs[realmId] || [];
  };

  FB.realmStrength = function (state, realmId) {
    rcEnsure(state);
    const realm = state.realms[realmId];
    let strength;
    if (realm && realm.liege) {
      strength = 0;
      for (const pid of FB.realmTerritory(state, realmId)) strength += state.dev[pid] || 1;
    } else {
      strength = rc.strength[realmId] || 0;
    }
    if (FB.papacyRealmStrengthMultiplier) {
      strength *= FB.papacyRealmStrengthMultiplier(state, realmId);
    }
    return strength;
  };

  /* counties a realm holds DIRECTLY (holder === realm id) */
  FB.realmHeldCounties = function (state, rid) {
    rcEnsure(state);
    return rc.held[rid] || [];
  };

  function capitalRelocationBalance(key, fallback) {
    var raw = FBDATA.balance && FBDATA.balance[key];
    var value = Number(raw);
    return isFinite(value) ? value : fallback;
  }

  function capitalRelocationVassals(state) {
    var out = [];
    for (var rid in (state.realms || {})) {
      if (!Object.prototype.hasOwnProperty.call(state.realms, rid) ||
          rid === 'player') continue;
      var realm = state.realms[rid];
      if (realm && realm.alive && realm.liege === 'player') {
        out.push({
          id:rid,
          name:realm.name || rid
        });
      }
    }
    out.sort(function (a, b) {
      var an = String(a.name).toLowerCase();
      var bn = String(b.name).toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
    });
    return out;
  }

  function capitalRelocationIncomingMonopoly(state, fromId) {
    var slots = state.player && state.player.guildMonopolies;
    var record = slots && slots.incoming;
    if (!record || record.scope !== 'province' ||
        record.scopeId !== fromId) return null;
    var endTurn = Number(record.endTurn);
    if (!isFinite(endTurn) || state.turn >= endTurn) return null;
    return record;
  }

  /* Read-only eligibility and consequence preview for moving the player
     realm's seat. Callers may safely use a rejected status to explain a
     disabled control without normalizing or otherwise mutating old saves. */
  FB.capitalRelocationStatus = function (state, destinationId) {
    var p = state && state.player;
    var realm = state && state.realms && state.realms.player;
    var me = p && state.chars && state.chars[p.charId];
    var cost = Math.max(0,
      capitalRelocationBalance('capitalRelocationPrestigeCost', 200));
    var popularOpinion = FB.clamp(
      capitalRelocationBalance('capitalRelocationPopularOpinion', -15),
      -100, 100);
    var vassalFavor = FB.clamp(
      capitalRelocationBalance('capitalRelocationVassalFavor', -15),
      -100, 100);
    var fromId = p && p.provinceId;
    var out = {
      ok:false,
      reason:'',
      fromId:fromId || null,
      destinationId:typeof destinationId === 'string' ? destinationId : null,
      prestigeCost:cost,
      popularOpinion:popularOpinion,
      vassalFavor:vassalFavor,
      vassals:state && state.realms ? capitalRelocationVassals(state) : [],
      incomingMonopoly:p && fromId
        ? capitalRelocationIncomingMonopoly(state, fromId) : null
    };
    out.vassalIds = out.vassals.map(function (vassal) { return vassal.id; });

    if (!p || !realm || !realm.alive || !me || me.dead ||
        p.dead || p.tier < 4 || (realm.rank || 0) < 1) {
      out.reason = FB.T('Only a living count or higher ruler may move a capital.');
      return out;
    }
    if (typeof destinationId !== 'string' ||
        !FB.world || !FB.world.byId[destinationId] ||
        FB.world.byId[destinationId].wasteland) {
      out.reason = FB.T('That county cannot become a capital.');
      return out;
    }
    if (destinationId === p.provinceId || destinationId === realm.capital) {
      out.reason = FB.T('This county is already your capital and home.');
      return out;
    }
    var holder = (state.holder && state.holder[destinationId]) ||
      (state.owner && state.owner[destinationId]);
    if (!p.provs || p.provs.indexOf(destinationId) < 0 ||
        holder !== 'player') {
      out.reason = FB.T(
        'You may move the capital only to a county held directly in your own hand.');
      return out;
    }
    var marker = p.capitalRelocation;
    if (marker && typeof marker === 'object' &&
        marker.charId === p.charId) {
      out.reason = FB.T('This ruler has already moved the capital once.');
      return out;
    }
    if ((Number(p.prestige) || 0) < cost) {
      out.reason = FB.T('Requires {prestige} prestige; currently {current}.', {
        prestige:cost,
        current:Math.floor(Number(p.prestige) || 0)
      });
      return out;
    }
    if (p.travel) {
      out.reason = FB.T('Finish the current journey before moving the capital.');
      return out;
    }
    if (FB.atWarPersonally && FB.atWarPersonally(state)) {
      out.reason = FB.T(
        'The capital cannot move while you are personally at war or serving in a campaign.');
      return out;
    }
    out.ok = true;
    return out;
  };

  function pinCapitalContact(state, cid, fallbackId) {
    var c = cid && state.chars && state.chars[cid];
    if (!c || c.dead || c.id === state.player.charId ||
        (FB.isHouseholdCharacter &&
          FB.isHouseholdCharacter(state, c.id))) return;
    var residence = FB.characterResidence
      ? FB.characterResidence(state, c) : fallbackId;
    if (residence && FB.world && FB.world.byId[residence]) {
      c.homeProvinceId = residence;
    }
  }

  function pinCapitalContacts(state, oldHomeId) {
    var p = state.player;
    var ids = {};
    function add(cid) {
      if (cid) ids[cid] = 1;
    }
    for (var role in (state.roles || {})) {
      if (role !== 'spouse') add(state.roles[role]);
    }
    for (var cid in (p.friendContacts || {})) add(cid);
    for (cid in (p.socialAttention || {})) add(cid);
    for (cid in (p.socialGiftTurns || {})) add(cid);
    for (cid in (p.rivalContacts || {})) add(cid);
    for (cid in (p.rivalPeace || {})) add(cid);
    add(p.courtingId);
    for (var i = 0; i < ((p.suitorIds || []).length); i++) {
      add(p.suitorIds[i]);
    }
    for (i = 0; i < ((p.giftDeliveries || []).length); i++) {
      var delivery = p.giftDeliveries[i];
      if (delivery && delivery.recipientKind === 'character') {
        add(delivery.recipientId);
      }
    }
    for (cid in ids) pinCapitalContact(state, cid, oldHomeId);
  }

  function syncPlayerCapitalHome(state, destinationId) {
    var p = state.player;
    var realm = state.realms && state.realms.player;
    var oldHomeId = p.provinceId;
    pinCapitalContacts(state, oldHomeId);
    p.provinceId = destinationId;
    if (realm && realm.alive) realm.capital = destinationId;

    /* Lord/steward/priest are local story roles, not personal relationships. Their
       former holders remain resident at the old seat; the new county receives
       a fresh local cast. */
    delete state.roles.lord;
    delete state.roles.steward;
    delete state.roles.priest;
    delete state.roles.notable;
    if (FB.getRole) {
      FB.getRole(state, 'lord', true);
      FB.getRole(state, 'steward', true);
      FB.getRole(state, 'priest', true);
    }

    if (FB.invalidateGuildMonopolies) FB.invalidateGuildMonopolies(state);
    if (FB.reconcileHouseholdLoadouts) FB.reconcileHouseholdLoadouts(state);
    if (FB.enterpriseList) FB.enterpriseList(state);
    if (FB.syncPlayerCareer) FB.syncPlayerCareer(state);
    if (FB.validateFocus) FB.validateFocus(state);
    if (FB.map) {
      FB.map.playerProv = destinationId;
      FB.map.request();
    }
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
    if (FB.ui && FB.ui.refresh) FB.ui.refresh();
  }

  /* Revalidate immediately before applying every consequence. This action
     spends no day and changes no political, title, county, or property state. */
  FB.relocatePlayerCapital = function (state, destinationId) {
    var status = FB.capitalRelocationStatus(state, destinationId);
    if (!status.ok) return false;
    var p = state.player;
    var from = FB.world.byId[status.fromId];
    var destination = FB.world.byId[destinationId];

    p.prestige -= status.prestigeCost;
    p.pop = FB.clamp((Number(p.pop) || 0) + status.popularOpinion,
      -100, 100);
    for (var i = 0; i < status.vassalIds.length; i++) {
      var rid = status.vassalIds[i];
      if (FB.adjustStanding) {
        FB.adjustStanding(state, { kind:'realm', id:rid },
          status.vassalFavor, 'realm:capital_relocation');
      } else {
        p.liegeOps = p.liegeOps || {};
        p.liegeOps[rid] = FB.clamp(
          (Number(p.liegeOps[rid]) || 0) + status.vassalFavor,
          -100, 100);
      }
    }
    p.capitalRelocation = {
      charId:p.charId,
      turn:state.turn,
      fromId:status.fromId,
      destinationId:destinationId
    };
    syncPlayerCapitalHome(state, destinationId);
    FB.news(state, FB.msg('news.world.capital_relocated',
      '🏰 The seat of {realm} moves from {from} to {destination}; the household follows.',
      {
        realm:state.realms.player.name,
        from:from ? from.name : status.fromId,
        destination:destination.name
      }));
    return true;
  };

  /* counties of a realm's whole vassal subtree: for sovereign realms this
     is exactly the owner bloc; for vassals, their own counties plus their
     vassals' (used for realm death and breakaways) */
  FB.realmTerritory = function (state, rid) {
    rcEnsure(state);
    const realm = state.realms[rid];
    if (!realm || !realm.liege) return rc.provs[rid] || [];
    const out = [];
    const stack = [rid];
    const seen = {};
    while (stack.length) {
      const cur = stack.pop();
      if (seen[cur]) continue;
      seen[cur] = 1;
      const held = rc.held[cur] || [];
      for (const pid of held) out.push(pid);
      for (const id in state.realms) if (state.realms[id].liege === cur) stack.push(id);
    }
    return out;
  };

  /* a realm left holding nothing at all dies; its orphaned vassals pass to
     its liege (mirrors the dissolution block of FB.transferProvince). Call
     AFTER invalidateRealmCache so realmTerritory reads fresh holdings */
  FB.realmBuryIfEmpty = function (state, rid) {
    const r = state.realms[rid];
    if (!r || !r.alive) return;
    if (FB.realmTerritory(state, rid).length) return;
    if (FB.mergeRealmTech) {
      const survivor = FB.playerRealmId ? FB.playerRealmId(state) :
        FB.topRealm(state, r.liege || 'player');
      FB.mergeRealmTech(state, survivor, rid);
    }
    FB.markRealmDead(state, rid);
    for (const vid in state.realms) if (state.realms[vid].liege === rid) state.realms[vid].liege = r.liege || null;
  };

  /* ---- crown recognition ---------------------------------------------------
     An anointed crown is sticky: an independent realm styled as a kingdom
     keeps the royal style while it holds even one county inside the de jure
     kingdom its name claims — rival kings of one kingdom may coexist for
     years. But a "king" with no land left in his kingdom is recognized by no
     one: the world restyles his house at its true dignity (duke of his best
     duchy majority, else count of his capital county). Conquest still never
     grants or transfers the defeated crown — see docs/designs/realms.md. */
  FB.realmKingdomClaim = function (state, rid) {
    const r = state.realms[rid];
    if (!r || !r.alive || rid === 'player' || r.rank !== 3 || r.liege) return null;
    for (const kid in FBDATA.kingdoms) {
      if (r.name === 'Kingdom of ' + FBDATA.kingdoms[kid].name) return kid;
    }
    return null;
  };

  FB.checkCrownRecognition = function (state, rid) {
    const r = state.realms[rid];
    const kid = FB.realmKingdomClaim(state, rid);
    if (!kid) return false;
    const terr = FB.realmTerritory(state, rid);
    if (!terr.length) return false; // the realm-death boundary handles this
    let recognized = false;
    for (const pid of terr) {
      if (FB.dejureOf(pid).kingdom === kid) { recognized = true; break; }
    }
    if (recognized) return false; // rival phase: he holds land in his kingdom
    // restyle at the true dignity: best duchy majority, else the capital county
    const byDuchy = {};
    for (const pid of terr) {
      const dj = FB.dejureOf(pid);
      if (dj.duchy) byDuchy[dj.duchy] = (byDuchy[dj.duchy] || 0) + 1;
    }
    const capDuchy = (FB.world.byId[r.capital] || {}).duchy;
    let bestDuchy = null, bestHave = 0;
    for (const did in byDuchy) {
      const cs = FB.duchyCounties(did);
      if (cs.length < 2) continue; // a duchy must span 2+ counties
      const have = byDuchy[did];
      if (have < Math.max(2, Math.ceil(cs.length / 2))) continue;
      if (!bestDuchy || have > bestHave || (have === bestHave && did === capDuchy)) {
        bestDuchy = did; bestHave = have;
      }
    }
    const oldName = r.name;
    let newRank;
    if (bestDuchy) {
      r.name = 'Duchy of ' + (FBDATA.duchies[bestDuchy].name || bestDuchy);
      newRank = 2;
    } else {
      r.name = 'County of ' + ((FB.world.byId[r.capital] || {}).name || r.capital);
      newRank = 1;
    }
    r.rank = newRank;
    /* peers cannot kneel to a peer: vassals of equal or greater rank reattach
       to the fallen crown's own liege, or stand independent (mirrors the
       player hollow-crown lapse). A vassal going independent takes his
       subtree's sovereignty with him, as in the breakaway path. */
    for (const vid in state.realms) {
      const v = state.realms[vid];
      if (!v.alive || v.liege !== rid || v.rank < newRank) continue;
      const vassalTerr = FB.realmTerritory(state, vid);
      v.liege = r.liege || null;
      if (!v.liege) {
        for (const pid of vassalTerr) state.owner[pid] = vid;
        FB.invalidateRealmCache();
      }
      FB.news(state, FB.msg('news.world.vassal_loosed',
        '🕊 {realm} no longer kneels to a house of equal dignity.',
        { realm: v.name }));
    }
    FB.news(state, FB.msg('news.world.crown_lapsed',
      '🥀 No land in {kingdom} remains to {realm} — the world ceases to recognize its crown. It is now the {style}.',
      { kingdom: FBDATA.kingdoms[kid].name, realm: oldName, style: r.name }));
    FB.invalidateRealmCache();
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
    return true;
  };

  FB.checkAllCrownRecognition = function (state) {
    for (const rid in state.realms) FB.checkCrownRecognition(state, rid);
  };

  FB.realmsAdjacent = function (state, r1, r2) {
    rcEnsure(state);
    for (const pid of (rc.provs[r1] || [])) {
      const adj = FB.world.adj[pid] || {};
      for (const nb in adj) if (state.owner[nb] === r2) return true;
    }
    return false;
  };

  FB.borderProvince = function (state, loserRealm, winnerRealm, allowed) {
    rcEnsure(state);
    const opts = [];
    for (const pid of (rc.provs[loserRealm] || [])) {
      const adj = FB.world.adj[pid] || {};
      for (const nb in adj) {
        if (state.owner[nb] === winnerRealm && (!allowed || allowed(pid))) {
          opts.push(pid);
          break;
        }
      }
    }
    if (!opts.length) return null;
    return FB.pick(opts);
  };

  FB.transferProvince = function (state, pid, toRealm) {
    const from = state.owner[pid];
    const oldHolder = (state.holder && state.holder[pid]) || from;
    let forcedPlayerCapital = null;
    state.owner[pid] = toRealm;
    if (state.holder) state.holder[pid] = toRealm; // conquerors hold their prizes directly
    FB.invalidateRealmCache();
    // relocate capitals; realms whose whole subtree is gone die — their
    // orphaned vassals (and a vassal player) reattach to the dead liege's liege
    for (const rid of [from, oldHolder]) {
      const fr = state.realms[rid];
      if (!fr || !fr.alive) continue;
      const terr = FB.realmTerritory(state, rid);
      if (!terr.length) {
        if (FB.mergeRealmTech) {
          FB.mergeRealmTech(state, FB.topRealm(state, toRealm), rid);
        }
        FB.markRealmDead(state, rid);
        for (const vid in state.realms) if (state.realms[vid].liege === rid) state.realms[vid].liege = fr.liege || null;
        if (state.player && state.player.liege === rid) {
          // a baron or personal Bishop is bound to the home county, not to
          // the dead lord's house: the office answers to whoever holds that
          // county now; landed vassals
          // reattach upward to the dead liege's own liege
          let nl = fr.liege || null;
          if (state.player.tier === 3) {
            const h = (state.holder && state.holder[state.player.provinceId]) || state.owner[state.player.provinceId];
            if (h && h !== 'player' && state.realms[h] && state.realms[h].alive) nl = h;
          }
          FB.changePlayerLiege(state, nl, 'realm:liege_destroyed');
        }
      } else if (fr.capital === pid) {
        const held = rid === 'player' ? FB.realmHeldCounties(state, 'player') : [];
        fr.capital = held.length ? held[0] : terr[0];
        if (rid === 'player' && held.length) forcedPlayerCapital = fr.capital;
      }
    }
    // a crown with no land left in its kingdom loses the world's recognition
    FB.checkCrownRecognition(state, from);
    if (oldHolder !== from) FB.checkCrownRecognition(state, oldHolder);
    // a tier-3 baron or Bishop is bound to the home county: if it changes
    // hands, the office answers to its new holder even while the old lord's
    // house survives elsewhere
    if (state.player && state.player.tier === 3 && state.player.provinceId === pid &&
        state.player.liege !== toRealm && toRealm !== 'player' &&
        state.realms[toRealm] && state.realms[toRealm].alive) {
      FB.changePlayerLiege(state, toRealm, 'realm:home_transfer');
    }
    // player consequences
    if (state.player && state.player.provs && state.player.provs.indexOf(pid) >= 0 && toRealm !== 'player') {
      state.player.provs.splice(state.player.provs.indexOf(pid), 1);
    }
    /* Losing the seat forces the same capital/home invariant onto a surviving
       directly held county. It is free and deliberately leaves the current
       ruler's voluntary lifetime marker unchanged. */
    if (forcedPlayerCapital && state.player.provinceId !== forcedPlayerCapital) {
      syncPlayerCapitalHome(state, forcedPlayerCapital);
    }
    if (state.player && FB.invalidateGuildMonopolies) {
      FB.invalidateGuildMonopolies(state);
    }
    if (state.player && FB.castellanyValidate) {
      FB.castellanyValidate(state, false);
    }
    if (FB.papacyProvinceTransferred) {
      FB.papacyProvinceTransferred(state, pid, from, toRealm);
    }
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
  };

  /* a petty count dies without an heir: the fief escheats to his liege —
     unless the player borders it, shares its sovereign, and has the standing
     to win the scramble at court. Returns true when the house was buried */
  FB.escheatRealm = function (state, rid, opts) {
    opts = opts || {};
    const r = state.realms[rid];
    if (!r || !r.alive) return false;
    const held = FB.realmHeldCounties(state, rid);
    if (!held.length) return false;
    const p = state.player;
    const liege = (r.liege && state.realms[r.liege] && state.realms[r.liege].alive) ? r.liege : FB.topRealm(state, rid);
    // orphaned vassals pass to the dead house's liege
    for (const vid in state.realms) if (state.realms[vid].liege === rid) state.realms[vid].liege = liege || null;
    for (const pid of held) {
      const pr = FB.world.byId[pid];
      let toPlayer = false;
      if (liege === 'player') {
        // your own man dies heirless: the fief returns to your hand
        toPlayer = true;
        if (!opts.silent) {
          FB.news(state, FB.msg('news.world.escheat_to_player',
            '🕯 The lord of {province} dies without an heir — the fief returns to your hand.',
            { province: pr.name }));
        }
      } else if (p.tier >= 4 && p.provs && liege && state.realms[liege] &&
                 FB.topRealm(state, rid) === FB.playerRealmId(state)) {
        // the scramble: you must border the empty fief and share its sovereign
        let borders = false;
        for (const my of p.provs) { if (FB.world.adj[my] && FB.world.adj[my][pid]) { borders = true; break; } }
        if (borders) {
          const c = FB.liegeGrantChance(state,
            FB.clamp(0.10 +
              FB.standingOf(state, { kind:'realm', id:liege }) / 250 +
              p.prestige / 2000 +
              (p.warService || 0) / 100, 0.05, 0.6));
          if (FB.chance(c)) {
            toPlayer = true;
            FB.recordLiegeGrant(state);
            if (!opts.silent) {
              FB.news(state, FB.msg('news.world.escheat_granted',
                '🕯 The lord of {province} dies without an heir — {liege} passes over every other suit and invests you with {province}.',
                { province: pr.name, liege: state.realms[liege].name }));
            }
          }
        }
      }
      if (toPlayer) {
        p.provs = p.provs || [];
        if (p.provs.indexOf(pid) < 0) p.provs.push(pid);
        state.holder[pid] = 'player';
      } else {
        state.holder[pid] = liege;
        if (!opts.silent && (FB.game.observe ||
            (FB.world.adj[p.provinceId] && FB.world.adj[p.provinceId][pid]))) {
          FB.news(state, FB.msg('news.world.escheat_observed', {
            forms: {
              select: 'value', param: 'holder', cases: {
                realm: '🕯 {province} escheats to {liege} — its lord died without an heir.',
                other: '🕯 {province} escheats to the crown — its lord died without an heir.'
              }
            }
          }, {
            holder: state.realms[liege] ? 'realm' : 'other',
            province: pr.name,
            liege: state.realms[liege] ? state.realms[liege].name : ''
          }));
        }
      }
    }
    if (FB.mergeRealmTech) {
      FB.mergeRealmTech(state, FB.topRealm(state, liege || 'player'), rid);
    }
    FB.markRealmDead(state, rid);
    FB.invalidateRealmCache();
    FB.checkTierPromotions(state);
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
    return true;
  };

  FB.playerRealmId = function (state) {
    // the SOVEREIGN realm the player answers to (liege's top, own realm, or home)
    if (!state) return null;
    if (state.realms && state.realms.player && state.realms.player.alive) return FB.topRealm(state, 'player');
    if (state.player && state.player.liege) return FB.topRealm(state, state.player.liege);
    return (state.owner && state.player && state.owner[state.player.provinceId]) || null;
  };

  /* found a new holding on empty land: a bordering wasteland becomes a true
     county of the player's demesne — the settlers' own culture and faith,
     outside every de jure duchy (a colony, not a duchy-maker) */
  FB.settleWaste = function (state, pid) {
    const p = state.player, pr = FB.world.byId[pid];
    if (!pr || !pr.wasteland) return;
    const me = state.chars[p.charId];
    pr.wasteland = false;
    pr.culture = me.culture;
    pr.religion = me.religion;
    state.dev[pid] = 1;
    state.holder[pid] = 'player';
    state.owner[pid] = FB.playerRealmId(state) || 'player';
    p.provs = p.provs || [];
    if (p.provs.indexOf(pid) < 0) p.provs.push(pid);
    FB.applyEffects(state, {
      gold: -FBDATA.balance.settleGold, prestige: -FBDATA.balance.settlePrestige
    });
    FB.news(state, FB.msg('news.world.wasteland_settlement_record',
      'Settled the empty land of {province}.', { province: pr.name }));
    FB.invalidateRealmCache();
    FB.checkTierPromotions(state);
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
    FB.news(state, FB.msg('news.world.wasteland_settled',
      '🌱 You settle the empty land of {province} — smoke rises where only the wind went before.',
      { province: pr.name }));
  };

  FB.isRealmAtWar = function (state, realmId) {
    if (FB.greatHolyWarCamp && FB.greatHolyWarCamp(state, realmId)) return true;
    realmId = FB.topRealm(state, realmId);
    if (FB.greatHolyWarCamp && FB.greatHolyWarCamp(state, realmId)) return true;
    const r = state.realms[realmId];
    if (r && r.war) return true;
    // player wars occupy both the sovereign the player answers for and the
    // enemy sovereign; neither may enter a second conflict
    const pw = state.player.war;
    if (pw) {
      const playerRealm = FB.playerRealmId(state);
      const enemyRealm = FB.topRealm(state, pw.enemy);
      if (realmId === 'player' || realmId === playerRealm || realmId === enemyRealm) return true;
    }
    for (const id in state.realms) {
      const rr = state.realms[id];
      if (rr.alive && rr.war && FB.topRealm(state, rr.war.enemy) === realmId) return true;
    }
    return false;
  };

  /* Read-only counterpart lookup for war notices. Ordinary wars have one
     opposing sovereign; a great holy war returns every valid sovereign in the
     other camp. Callers receive stable realm ids and own all presentation. */
  FB.warOpponents = function (state, realmId) {
    if (!state || !state.realms || !realmId) return [];
    const out = [];
    function add(id) {
      const sovereign = id && FB.topRealm(state, id);
      if (sovereign && out.indexOf(sovereign) < 0) out.push(sovereign);
    }
    if (FB.greatHolyWarEnemies) {
      const holyEnemies = FB.greatHolyWarEnemies(state, realmId) || [];
      for (let i = 0; i < holyEnemies.length; i++) add(holyEnemies[i]);
      if (out.length) return out;
    }
    const sovereign = realmId === 'player' && !state.realms.player
      ? FB.playerRealmId(state) : FB.topRealm(state, realmId);
    if (!sovereign) return out;
    const playerWar = state.player && state.player.war;
    if (playerWar) {
      const playerRealm = FB.playerRealmId(state);
      const enemyRealm = FB.topRealm(state, playerWar.enemy);
      if (sovereign === playerRealm || sovereign === 'player') add(enemyRealm);
      if (sovereign === enemyRealm) add(playerRealm);
    }
    const ownRealm = state.realms[sovereign];
    if (ownRealm && ownRealm.war) add(ownRealm.war.enemy);
    for (const id in state.realms) {
      const realm = state.realms[id];
      if (realm && realm.alive && realm.war &&
          FB.topRealm(state, realm.war.enemy) === sovereign) add(id);
    }
    return out;
  };

  /* War reaches the household through the sovereign realm the player answers
     to, whether or not the protagonist personally rides with its host. */
  FB.playerRealmAtWar = function (state) {
    if (!state || !state.player) return false;
    const realmId = FB.playerRealmId(state);
    return !!(realmId && FB.isRealmAtWar(state, realmId));
  };

  /* Old saves may contain wars created before the one-war-per-sovereign
     invariant. Keep the player's valid war first, then accept valid AI wars
     in stable realm-id order while no endpoint is already occupied. */
  FB.repairWars = function (state) {
    if (!state || !state.player || !state.realms) return;
    const used = {}, activeHosts = {};
    const pw = state.player.war;
    if (pw) {
      const enemy = state.realms[pw.enemy];
      const enemyRealm = enemy && FB.topRealm(state, pw.enemy);
      const playerRealm = FB.playerRealmId(state);
      if (!enemy || !enemy.alive || enemyRealm !== pw.enemy || pw.enemy === 'player') {
        state.player.war = null;
        if (FB.validateFocus) FB.validateFocus(state);
      } else {
        used.player = activeHosts.player = 1;
        used[enemyRealm] = activeHosts[enemyRealm] = 1;
        if (playerRealm) used[playerRealm] = 1;
        if (FB.ensurePlayerWarFeedback) FB.ensurePlayerWarFeedback(state);
      }
    }

    const ids = Object.keys(state.realms).sort();
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i], r = state.realms[id];
      if (id === 'player' || !r || !r.war) continue;
      const enemyId = r.war.enemy;
      const enemy = state.realms[enemyId];
      const valid = r.alive && !r.liege && enemy && enemy.alive && !enemy.liege &&
        enemyId !== 'player' && enemyId !== id;
      if (!valid || used[id] || used[enemyId]) {
        r.war = null;
        continue;
      }
      used[id] = used[enemyId] = 1;
      activeHosts[id] = activeHosts[enemyId] = 1;
    }

    const great = state.greatHolyWar;
    if (great && great.phase === 'active') {
      for (const campName of ['attackers', 'defenders']) {
        const camp = great.participants && great.participants[campName];
        if (!camp) continue;
        for (const participant of camp) {
          if (participant && participant.sovereign) {
            activeHosts[participant.realm] = 1;
          }
        }
      }
    }

    const armies = Array.isArray(state.armies) ? state.armies : [];
    const seenHosts = {};
    state.armies = armies.filter(function (army) {
      if (!army || !activeHosts[army.realm] || seenHosts[army.realm]) return false;
      seenHosts[army.realm] = 1;
      return true;
    });
  };

  /* ================= YEARLY WORLD TICK ================= */

  function dateNumber(date) {
    return date.year * 360 + date.season * 90 + (date.day - 1);
  }

  function scriptedFlag(event) {
    var subject = event.newRealm ? event.newRealm.id : event.realm;
    if (!event.id && event.season === undefined && event.day === undefined) {
      // Exact compatibility with the flags already present in old 867 saves.
      return 'scripted_' + event.year + '_' + subject;
    }
    return 'scripted_' + (FB.activeBookmarkId || '867') + '_' +
      (event.id || (event.year + '_' + subject));
  }

  /* Scripted history is checked after every calendar advance. Legacy entries
     mean Spring day 1 and retain their old flag/message identities; precise
     entries carry stable bookmark/event ids and may land on any campaign day. */
  FB.scriptedTick = function (state) {
    var scripted = FBDATA.scripted || [];
    for (var scriptedIndex = 0; scriptedIndex < scripted.length; scriptedIndex++) {
      var ev = scripted[scriptedIndex];
      var due = {
        year:ev.year,
        season:ev.season === undefined ? 0 : ev.season,
        day:ev.day === undefined ? 1 : ev.day
      };
      var flag = scriptedFlag(ev);
      if (dateNumber(state.date) < dateNumber(due) || state.flags[flag]) continue;
      state.flags[flag] = 1;
      var rid = ev.realm;
      if (ev.newRealm) {
        rid = ev.newRealm.id;
        var cap = FB.world.byId[ev.newRealm.capital];
        var formerSovereign = state.owner[ev.newRealm.capital];
        state.realms[rid] = {
          id: rid, name: ev.newRealm.name, color: ev.newRealm.color,
          capital: ev.newRealm.capital,
          aggression: ev.newRealm.aggression !== undefined ? ev.newRealm.aggression : 1,
          rank: ev.newRealm.rank || 3, liege: ev.newRealm.liege || null,
          techTraditions:Array.isArray(ev.newRealm.techTraditions)
            ? ev.newRealm.techTraditions.slice() : null,
          techSeed:ev.newRealm.techSeed || null,
          religion: ev.newRealm.religion || (cap ? cap.religion : null),
          alive: true, ruler: makeRuler(cap ? cap.culture : 'arabic',
            ev.newRealm.ruler, state.date.year), war: null, op: 0
        };
        FB.ensureRealmSuccession(state, rid);
        if (!ev.newRealm.liege && formerSovereign && formerSovereign !== rid &&
            FB.mergeRealmTech) {
          FB.mergeRealmTech(state, rid, formerSovereign);
        }
      }
      if (state.realms[rid] && state.realms[rid].alive) {
        for (var targetIndex = 0; targetIndex < ev.targets.length; targetIndex++) {
          var pid = ev.targets[targetIndex];
          if (state.owner[pid] !== undefined && state.owner[pid] !== 'player') FB.transferProvince(state, pid, rid);
        }
      }
      var scriptedKey = FB.scriptedMessageKey(ev);
      FB.registerMessage(scriptedKey, { text: '📜 ' + ev.news });
      FB.news(state, FB.message(scriptedKey, {}));
    }
  };

  function aggressionBalance(key, fallback) {
    const raw = FBDATA.balance && FBDATA.balance[key];
    const value = Number(raw);
    return isFinite(value) ? value : fallback;
  }

  /* Recent unjustified declarations belong to the current protagonist. The
     projection is read-only so opening a war or ruler sheet cannot repair a
     save, prune history, or consume RNG. The next declaration is the only
     writer and compacts the bounded window before appending its semantic
     record. */
  FB.aggressiveWarHistory = function (state) {
    const p = state && state.player;
    const rows = p && p.aggressiveWars;
    if (!Array.isArray(rows)) return [];
    const memory = Math.max(0,
      aggressionBalance('warAggressionMemoryDays', 2880));
    const earliest = (Number(state.turn) || 0) - memory;
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || typeof row !== 'object' || Array.isArray(row) ||
          !isFinite(Number(row.turn)) || Number(row.turn) > state.turn ||
          Number(row.turn) <= earliest ||
          typeof row.charId !== 'string' || row.charId !== p.charId ||
          typeof row.enemy !== 'string' || !row.enemy ||
          typeof row.target !== 'string' || !row.target) continue;
      out.push({
        turn:Number(row.turn),
        charId:row.charId,
        enemy:row.enemy,
        target:row.target
      });
    }
    out.sort(function (a, b) {
      const ae = String(a.enemy || ''), be = String(b.enemy || '');
      const at = String(a.target || ''), bt = String(b.target || '');
      return a.turn - b.turn ||
        (ae < be ? -1 : (ae > be ? 1 : 0)) ||
        (at < bt ? -1 : (at > bt ? 1 : 0));
    });
    return out;
  };

  FB.recordAggressiveWar = function (state, cause) {
    if (!state || !state.player || !cause ||
        cause.type !== 'aggression') return null;
    const rows = FB.aggressiveWarHistory(state);
    const record = {
      turn:state.turn,
      charId:state.player.charId,
      enemy:cause.enemy || state.owner[cause.target] || null,
      target:cause.target || null
    };
    rows.push(record);
    state.player.aggressiveWars = rows;
    return record;
  };

  FB.aggressiveWarBreakawayMultiplier = function (state, additionalWars) {
    const recent = FB.aggressiveWarHistory(state).length +
      Math.max(0, Math.floor(Number(additionalWars) || 0));
    const perRecent = Math.max(0,
      aggressionBalance('warAggressionBreakawayPerRecent', 0.5));
    return 1 + recent * perRecent;
  };

  /* This remains the existing seeded yearly breakaway check. Aggression only
     raises its chance for vassals beneath the player's crown; poor personal
     Standing compounds that pressure instead of creating an automatic
     rebellion or a second civil-war system. */
  FB.vassalBreakawayChance = function (state, rid) {
    const base = FB.clamp(
      aggressionBalance('breakawayChance', 0.015), 0, 1);
    const realm = state && state.realms && state.realms[rid];
    const support = FB.rebelSupportMultiplier
      ? FB.rebelSupportMultiplier(state, rid) : 1;
    if (!realm || !realm.alive || !realm.liege) return base;
    const charter = realm.liege === 'player' &&
      FB.feudalCharterBreakawayMultiplier
      ? FB.feudalCharterBreakawayMultiplier(state, rid) : 1;
    if (FB.topRealm(state, rid) !== 'player') {
      return FB.clamp(base * support * charter, 0, 1);
    }
    const aggression = FB.aggressiveWarBreakawayMultiplier(state);
    if (aggression <= 1) return FB.clamp(base * support * charter, 0, 1);
    const standing = FB.standingOf
      ? FB.standingOf(state, { kind:'realm', id:rid }) : 0;
    const discontent = 1 + Math.min(1,
      Math.max(0, -(Number(standing) || 0)) / 100);
    return FB.clamp(base * aggression * discontent * support * charter, 0, 1);
  };

  /* Automatic war prestige is cause-aware in every settlement path. Event
     choices and field deeds may still earn their authored personal renown,
     but an unjustified declaration, conquest, or tribute grants no ordinary
     offensive-war reward. */
  FB.warPrestigeReward = function (source, stage) {
    const casus = source && source.casus ? source.casus : source;
    if (casus && casus.type === 'aggression') return 0;
    if (stage === 'declaration') return 5;
    if (stage === 'tribute') return 20;
    if (stage === 'conquest') return 50;
    if (stage === 'slipped') return 20;
    return 0;
  };

  /* Development changes have one clamp and feedback boundary. Positive
     changes stop at the current technology-lifted cap; losses remove only
     their stated amount even if conquest has since lowered that cap. */
  let developmentChangeState = null;
  let developmentChangeTurn = -1;
  let developmentChanged = {};

  function developmentChangesFor(state) {
    if (developmentChangeState !== state || developmentChangeTurn !== state.turn) {
      developmentChangeState = state;
      developmentChangeTurn = state.turn;
      developmentChanged = {};
    }
    return developmentChanged;
  }

  FB.playerDirectlyHoldsCounty = function (state, pid) {
    const p = state && state.player;
    return !!(p && Array.isArray(p.provs) && p.provs.indexOf(pid) >= 0);
  };

  /* Saves from before player development became condition-driven retain only
     the result of their old random drift. Rebuild direct counties once from
     the bookmark plus standing development buildings, and freeze each old
     building's actual contribution for exact demolition later. */
  FB.migratePlayerDevelopment = function (state) {
    const p = state && state.player;
    if (!p || p.developmentBaselineMigration === 1) return false;
    p.developmentBaselineMigration = 1;
    if (!state.dev || !Array.isArray(p.provs)) return false;
    let changed = false;
    for (const pid of p.provs) {
      const pr = FB.world && FB.world.byId && FB.world.byId[pid];
      if (!pr) continue;
      const cap = Math.max(1, Number(FB.devCap(state, pid)) || 10);
      let target = Math.max(1, Number(pr.dev0) || 1);
      const list = state.buildings && state.buildings[pid];
      if (Array.isArray(list)) {
        for (let i = 0; i < list.length; i++) {
          let record = list[i];
          const id = typeof record === 'string' ? record : record && record.id;
          const def = id && FBDATA.buildings[id];
          const delta = def ? Number(def.dev) : 0;
          if (!def || !isFinite(delta) || !delta ||
              (typeof record !== 'string' && record.ruined)) continue;
          const before = target;
          if (delta > 0) {
            if (target < cap) target = Math.min(cap, target + delta);
          } else {
            target = Math.max(1, target + delta);
          }
          if (typeof record === 'string') {
            record = list[i] = { s:0, id:id };
          }
          record.devGranted = target - before;
        }
      }
      if (state.dev[pid] !== target) {
        state.dev[pid] = target;
        changed = true;
      }
    }
    if (changed) {
      FB.invalidateRealmCache();
      if (FB.map && FB.map.request) FB.map.request();
    }
    return changed;
  };

  FB.changeCountyDevelopment = function (state, pid, amount, cause) {
    if (!state || !state.dev || state.dev[pid] === undefined) return 0;
    const delta = Number(amount);
    if (!isFinite(delta) || !delta) return 0;
    const before = Number(state.dev[pid]);
    if (!isFinite(before)) return 0;
    let after = before;
    if (delta > 0) {
      const cap = Math.max(1, Number(FB.devCap(state, pid)) || 10);
      if (before < cap) after = Math.min(cap, before + delta);
    } else {
      after = Math.max(1, before + delta);
    }
    if (cause !== 'ai_drift') developmentChangesFor(state)[pid] = 1;
    if (after === before) return 0;
    state.dev[pid] = after;
    FB.invalidateRealmCache();
    if (FB.map && FB.map.request) FB.map.request();
    if (after >= before) return after - before;
    if (!FB.playerDirectlyHoldsCounty(state, pid) &&
        (!state.player || state.player.provinceId !== pid)) return after - before;
    const pr = FB.world.byId[pid];
    const params = {
      province:pr ? pr.name : pid,
      development:after
    };
    if (cause === 'siege') {
      FB.news(state, FB.msg('news.world.development_siege_damage',
        '⚔ War damage in {province} lowers development to {development}.', params));
    } else if (cause === 'demolition') {
      FB.news(state, FB.msg('news.world.development_infrastructure_lost',
        '🏚 Lost infrastructure in {province} lowers development to {development}.',
        params));
    } else {
      FB.news(state, FB.msg('news.world.development_declined',
        '📉 Hard times in {province} - development falls to {development}.',
        params));
    }
    return after - before;
  };

  FB.damageCountyDevelopment = function (state, pid) {
    return FB.changeCountyDevelopment(state, pid, -1, 'siege');
  };

  /* AI-governed counties construct tangible settlement buildings during peace.
     Prioritizes productive economic anchors (mills, markets, harbors, bridges)
     and civic resilience (granaries, temples, libraries). Direct player
     counties use the player's own construction deeds. */
  FB.aiBuildingsYear = function (state) {
    if (!state || !state.realms || !state.dev) return;
    const maxPerYear = (FBDATA.balance && FBDATA.balance.aiMaxBuildingsPerYear) || 1;
    const changed = developmentChangesFor(state);

    const contested = {};
    const armies = state.armies || [];
    for (let i = 0; i < armies.length; i++) {
      const armyPid = armies[i].at;
      const armyHolder = (state.holder && state.holder[armyPid]) || state.owner[armyPid];
      const armyController = !armyHolder ? null : armyHolder === 'player' ? 'player' :
        (FB.topRealm ? FB.topRealm(state, armyHolder) : armyHolder);
      if (armyController && FB.armiesHostile &&
          FB.armiesHostile(state, armies[i], { realm: armyController })) {
        contested[armyPid] = true;
      }
    }
    const campaign = state.greatHolyWar;
    const occupations = campaign && campaign.occupations || {};
    for (const opid in occupations) {
      if (occupations[opid] && (occupations[opid].progress || occupations[opid].occupied)) {
        contested[opid] = true;
      }
    }

    const buildingPriority = [
      'cathedral', // Cathedral / Great Mosque: +4 piety, +15 prestige, +1 dev, 15% crisis protection (dev 7+)
      'university',// University: +2 national research, +10 prestige (dev 7+)
      'guildhall', // Civic Guildhall: +4 tax, +1 dev, +15 retinue (dev 5+)
      'arsenal',   // Naval Arsenal: +5 tax, +1 dev, +20 retinue (coastal, dev 5+)
      'foundry',   // Foundry: +3 tax, +30 retinue (dev 6+)
      'exchange',  // Merchant Exchange: +6 tax, +1 dev, +3 attraction (dev 6+)
      'hospital',  // Endowed Hospital: +1 piety, 10% crisis protection (dev 5+)
      'mill',      // Watermill: +1 dev, +2 tax, +5% pop capacity
      'windmill',  // Post Windmill: +1 dev, +2 tax, +5% pop capacity
      'market',    // Market Square: +1 dev, +3 tax, +2 attraction
      'harbor',    // Harbor: +1 dev, +4 tax, +3% capacity, +2 attraction (coastal)
      'granary',   // Granary: 35% famine protection
      'bridge',    // Stone Bridge: +1 dev, +1 attraction
      'temple',    // Great Temple: +2 piety, 10% crisis protection
      'library',   // Library: +1 national research
      'keep',      // Stone Keep: +60 levy, +20 retinue (dev 5+)
      'barracks'   // Barracks: +40 retinue (dev 6+)
    ];

    const realmIds = Object.keys(state.realms);
    for (let ri = 0; ri < realmIds.length; ri++) {
      const rid = realmIds[ri];
      if (rid === 'player') continue;
      const realm = state.realms[rid];
      if (!realm || !realm.alive) continue;

      const held = FB.realmHeldCounties(state, rid);
      if (!held.length) continue;

      let builtThisYear = 0;
      const sortedCounties = held.slice().sort(function (a, b) {
        if (a === realm.capital) return -1;
        if (b === realm.capital) return 1;
        const devA = Number(state.dev[a]) || 1;
        const devB = Number(state.dev[b]) || 1;
        return devA - devB;
      });

      for (let ci = 0; ci < sortedCounties.length; ci++) {
        if (builtThisYear >= maxPerYear) break;
        const pid = sortedCounties[ci];
        if (contested[pid] || changed[pid]) continue;
        const pr = FB.world && FB.world.byId ? FB.world.byId[pid] : null;
        if (!pr || pr.wasteland) continue;

        const settlements = FB.settlementsOf ? FB.settlementsOf(state, pid) : [];
        if (!settlements.length) continue;

        let chosen = null;
        for (let bi = 0; bi < buildingPriority.length; bi++) {
          const bid = buildingPriority[bi];
          const bdef = FBDATA.buildings && FBDATA.buildings[bid];
          if (!bdef) continue;

          for (let sIdx = 0; sIdx < settlements.length; sIdx++) {
            if (FB.aiCanBuildAt && FB.aiCanBuildAt(state, rid, pid, sIdx, bid)) {
              chosen = { pid: pid, s: sIdx, id: bid, def: bdef };
              break;
            }
          }
          if (chosen) break;
        }

        if (chosen) {
          state.buildings = state.buildings || {};
          const list = state.buildings[chosen.pid] = state.buildings[chosen.pid] || [];
          const record = { s: chosen.s, id: chosen.id };
          list.push(record);
          if (chosen.def.dev) {
            record.devGranted = FB.changeCountyDevelopment(state, chosen.pid,
              chosen.def.dev, 'ai_construction');
          }
          builtThisYear++;
        }
      }
    }
  };

  FB.worldTick = function (state) {
    const B = FBDATA.balance;
    FB.ensureDynasticState(state);
    FB.checkAllCrownRecognition(state);
    if (FB.fortAIYear) FB.fortAIYear(state);
    if (FB.populationYear) FB.populationYear(state);
    if (FB.papacyYearly) FB.papacyYearly(state);
    if (FB.greatHolyWarYearly) FB.greatHolyWarYearly(state);
    /* Family deaths invalidate the live index. This read-only snapshot stays
       valid for retention and reverse-link cleanup for the rest of this
       mortality pass, avoiding one full character rebuild per corpse. */
    const familyLinks = FB.familyLinksSnapshot
      ? FB.familyLinksSnapshot(state) : null;

    // realm AI
    for (const id in state.realms) {
      const r = state.realms[id];
      if (!r.alive || id === 'player') continue;
      FB.ensureRealmSuccession(state, id);
      const papalTerritorialRealm = FB.papacyTerritorialRealm &&
        FB.papacyTerritorialRealm(state, id);
      const papalClaimantId = FB.papacyClaimantForRealm &&
        FB.papacyClaimantForRealm(state, id);
      if (!papalTerritorialRealm) tickRoyalFamily(state, id, familyLinks);
      // a vassal house's standing at its liege's court drifts with the years
      if (r.liege) r.favor = FB.clamp((r.favor || 0) + FB.ri(-9, 9), -100, 100);
      // ruler ages & dies
      r.ruler.age++;
      const q = Math.max(0, (r.ruler.age > 70 ? 0.18 : r.ruler.age > 55 ? 0.07 : 0.02) -
        (FB.techBonus ? FB.techBonus(state, 'health', id) : 0));
      if ((!papalTerritorialRealm || papalClaimantId) &&
          papalClaimantId !== state.player.charId && FB.chance(q)) {
        const appointedTenureEnds = FB.feudalTenureEndsAtDeath &&
          FB.feudalTenureEndsAtDeath(state, id);
        const appointedTenure = appointedTenureEnds && FB.feudalContractOf
          ? FB.feudalContractOf(state, id).tenure : null;
        const succession = papalClaimantId ? r.succession :
          FB.refreshRealmSuccession(state, id);
        // Escheat is now the last resort for a genuinely exhausted count line.
        if (!appointedTenureEnds && !papalClaimantId && r.liege && r.rank === 1 &&
            (!succession || !succession.heirId) &&
            FB.chance(B.escheatChance || 0) && FB.escheatRealm(state, id)) continue;
        const oldGeneration = r.ruler.generation;
        const rulerMember = succession && succession.members[succession.rulerMemberId];
        const rulerChar = papalClaimantId
          ? state.chars[papalClaimantId]
          : rulerMember && rulerMember.charId && state.chars[rulerMember.charId];
        if (rulerChar && !rulerChar.dead && FB.killChar) {
          const playerChar = state.chars[state.player.charId];
          const wasPlayerSpouse = playerChar &&
            (playerChar.spouseId === rulerChar.id ||
              rulerChar.spouseId === playerChar.id);
          /* Every reigning ruler is a full record now, and every reigning
             ruler eventually dies. Read retention before FB.killChar severs
             the links the predicate consults, then compact once the crown has
             moved on - otherwise a long campaign accumulates one dead ruler
             per realm per generation and stops being bound by the map. */
          const compactRuler = !papalClaimantId && rulerMember &&
            rulerMember.charId === rulerChar.id && FB.courtRecordRetained &&
            !FB.courtRecordRetained(state, rulerChar,
              familyLinks && familyLinks.kinById);
          // A courted royal remains a full character after taking the throne.
          // Use the normal death path so marriage and role links also close;
          // royalCharDied advances the realm exactly once.
          FB.killChar(state, rulerChar, { familyLinks:familyLinks });
          if (compactRuler && FB.compactCourtRecord) {
            rulerMember.alive = false;
            FB.compactCourtRecord(state, rulerMember, rulerChar, {
              retentionChecked:true,
              kinById:familyLinks && familyLinks.kinById
            });
          }
          if (wasPlayerSpouse) {
            FB.news(state, FB.msg('news.life.spouse_died',
              '🕯 Your spouse {name} has died. The house is quieter, and colder.',
              { name:rulerChar.name }));
            if (FB.spouseDied) FB.spouseDied(state, rulerChar);
            if (FB.promoteSpouse) FB.promoteSpouse(state);
          }
        } else {
          if (papalClaimantId && FB.startPapalElection) {
            FB.startPapalElection(state, null, 'death');
          } else {
            if (rulerMember) rulerMember.alive = false;
            FB.advanceRealmSuccession(state, id);
          }
        }
        // Defensive repair for malformed saves whose materialized ruler was
        // already dead but had not advanced the compact succession record.
        if (!papalClaimantId && r.alive && r.ruler.generation === oldGeneration) {
          FB.advanceRealmSuccession(state, id);
        }
        if (appointedTenureEnds && r.alive && FB.revertFeudalRealm &&
            FB.revertFeudalRealm(state, id, appointedTenure)) continue;
        if (!papalClaimantId &&
            (FB.game.observe || id === FB.playerRealmId(state) ||
              id === state.player.liege)) {
          FB.news(state, FB.msg('news.world.ruler_succeeds',
            '👑 The ruler of {realm} is dead. {ruler} rises in their place.',
            { realm: r.name, ruler: r.ruler.name }));
        }
        if (!r.alive) continue; // the new ruler was the protagonist and joined the realms
      }
      if (r.liege) continue; // vassals make no foreign policy of their own
      // war resolution
      if (r.war) {
        const war = r.war;
        const enemy = state.realms[war.enemy];
        if (!enemy || !enemy.alive) { r.war = null; continue; }
        const sa = FB.realmStrength(state, id) *
          (1 + (FB.techBonus ? FB.techBonus(state, 'levy', id) : 0)) *
          FB.aiFieldHostRatio(state, id) *
          (FB.aiHostQuality ? FB.aiHostQuality(state, id) : 1) *
          (1 + (FB.techBonus ? FB.techBonus(state, 'battle', id) : 0)) *
          (1 + r.ruler.mar / 30) * FB.rf(0.7, 1.3) *
          (1 + 0.12 * ((war.fw || 0) - (war.fl || 0))); // field wins tilt the war
        const enemyGarrisons = FB.fortGarrisonBurden
          ? FB.fortGarrisonBurden(state, war.enemy) : 0;
        const defenseRatio = FB.realmDefensiveStrength(state, war.enemy) /
          Math.max(1, FB.aiBaseHost(state, war.enemy) + enemyGarrisons);
        const sd = FB.realmStrength(state, war.enemy) *
          (1 + (FB.techBonus ? FB.techBonus(state, 'levy', war.enemy) : 0)) *
          defenseRatio *
          (FB.aiHostQuality ? FB.aiHostQuality(state, war.enemy) : 1) *
          (1 + (FB.techBonus ? FB.techBonus(state, 'battle', war.enemy) : 0)) *
          (1 + enemy.ruler.mar / 30) * FB.rf(0.7, 1.3) *
          (1 + 0.12 * ((war.fl || 0) - (war.fw || 0)));
        const winner = sa > sd ? id : war.enemy;
        const loser = winner === id ? war.enemy : id;
        const winnerReligion = FB.realmReligionId(state, winner);
        const winnerHost = FB.hostOf ? FB.hostOf(state, winner) : null;
        let taken = winnerHost && state.owner[winnerHost.at] === loser &&
          FB.fortBlocksArmy && FB.fortBlocksArmy(state, winnerHost.at, winnerHost)
          ? winnerHost.at : null;
        if (taken && FB.sameFaithHeadWarPolicy(
            state, winnerReligion, loser, taken)) taken = null;
        if (!taken) taken = FB.borderProvince(state, loser, winner, function (pid) {
          return !FB.sameFaithHeadWarPolicy(state, winnerReligion, loser, pid);
        });
        let fortDelay = 0;
        const takenFort = taken && FB.fortAt ? FB.fortAt(state, taken) : null;
        if (takenFort && (Number(takenFort.level) || 0) > 0) {
          const fortStatus = FB.advanceAIYearlyFortSiege
            ? FB.advanceAIYearlyFortSiege(state, war, taken, winner) : null;
          fortDelay = fortStatus ? fortStatus.delay : 0;
          if (!fortStatus || !fortStatus.breached) taken = null;
          if (FB.decayAIYearlyFortSieges) {
            FB.decayAIYearlyFortSieges(war, fortStatus ? fortStatus.pid : null);
          }
        } else if (FB.decayAIYearlyFortSieges) {
          FB.decayAIYearlyFortSieges(war, null);
        }
        if (war.fortSieges) for (const siegePid in war.fortSieges) {
          const siegeDef = FB.fortLevelDef
            ? FB.fortLevelDef(war.fortSieges[siegePid].fortLevel) : null;
          fortDelay = Math.max(fortDelay,
            siegeDef ? Number(siegeDef.siegeDelay) || 0 : 0);
        }
        if (taken) {
          if (FB.damageCountyDevelopment) FB.damageCountyDevelopment(state, taken);
          if (FB.damageCountyPopulation) FB.damageCountyPopulation(state, taken, 'ai_conquest');
          FB.transferProvince(state, taken, winner);
          war.captures = (war.captures || 0) + 1;
          const pv = FB.world.byId[taken];
          if (FB.game.observe) { // the watcher hears of every fall, far or near
            FB.news(state, FB.msg('news.world.province_falls',
              '⚔ {province} has fallen to {winner}.', {
                province: pv.name,
                winner: state.realms[winner] ? state.realms[winner].name : winner
              }));
          } else if (taken === state.player.provinceId) {
            FB.news(state, FB.msg('news.world.home_conquered',
              '⚔ {winner} has conquered {province} — your home! New masters rule here now.', {
                winner: state.realms[winner] ? state.realms[winner].name : winner,
                province: pv.name
              }));
          } else if (FB.world.adj[state.player.provinceId] && FB.world.adj[state.player.provinceId][taken]) {
            FB.news(state, FB.msg('news.world.province_falls',
              '⚔ {province} has fallen to {winner}.', {
                province: pv.name,
                winner: state.realms[winner] ? state.realms[winner].name : winner
              }));
          }
        }
        war.years++;
        if (!state.realms[loser].alive) {
          if (FB.papacyDecisiveWarLost) {
            FB.papacyDecisiveWarLost(state, loser);
          }
          r.war = null;
        }
        else if (war.years >= 3 + fortDelay || FB.chance(0.35) ||
                 (war.captures || 0) >= 2) {
          if (FB.papacyDecisiveWarLost) {
            FB.papacyDecisiveWarLost(state, loser);
          }
          r.war = null; // peace
        }
        if (!r.alive) continue;
      } else if (!FB.isRealmAtWar(state, id) &&
                 !(FB.intrigueRealmRulerCaptive &&
                   FB.intrigueRealmRulerCaptive(state, id)) &&
                 FB.chance(B.aiWarChance * (0.5 + 0.5 * r.aggression))) {
        // pick a neighboring realm to attack
        const targets = [];
        for (const id2 in state.realms) {
          if (id2 === id) continue;
          const r2 = state.realms[id2];
          if (!r2.alive || r2.liege || FB.isRealmAtWar(state, id2) ||
              FB.areAllied(state, id, id2)) continue; // peaceful sovereigns only
          if (id2 === 'player') continue; // wars vs player handled below
          if (FB.sameFaithHeadWarPolicy(state,
              FB.realmReligionId(state, id), id2, null)) continue;
          if (FB.realmsAdjacent(state, id, id2)) targets.push(id2);
        }
        if (targets.length) {
          // prefer weaker targets
          targets.sort(function (a, b) {
            return FB.realmDefensiveStrength(state, a) - FB.realmDefensiveStrength(state, b);
          });
          const t = targets[FB.chance(0.6) ? 0 : Math.floor(FB.rng() * targets.length)];
          r.war = { enemy: t, years: 0, captures: 0,
            casus: { type: 'border', label: 'Border war' } };
          const homeRealm = state.owner[state.player.provinceId];
          if (FB.game.observe || id === homeRealm || t === homeRealm) {
            FB.news(state, FB.msg('news.world.ai_war',
              '🔥 War! {attacker} marches against {defender}.',
              { attacker: r.name, defender: state.realms[t].name }));
          }
        }
      }
      // AI may attack an independent player realm — the cheap guards run
      // first: relationMult and deterrence (the player's full levy breakdown)
      // are only computed when a declaration is actually possible, and the
      // FB.chance roll still fires under exactly the same conditions
      if (FB.isPlayerSovereign(state) && !state.player.war &&
        !FB.isRealmAtWar(state, id) &&
        !(FB.intrigueRealmRulerCaptive &&
          FB.intrigueRealmRulerCaptive(state, id)) &&
        !(state.pacts && state.pacts[id] > state.turn) &&
        !FB.areAllied(state, id, 'player') &&
        !FB.sameFaithHeadWarPolicy(state, FB.realmReligionId(state, id), 'player', null)) {
        const relationMult = FB.clamp(
          1 - FB.standingOf(state, { kind:'realm', id:id }) / 100,
          B.foreignOpinionAttackMin,
          B.foreignOpinionAttackMax
        );
        const deterrence = FB.clamp(FB.aiBaseHost(state, id) /
          Math.max(1, FB.realmDefensiveStrength(state, 'player')), 0.25, 1.25);
        if (FB.chance(0.04 * r.aggression * relationMult * deterrence) &&
          FB.realmsAdjacent(state, id, 'player')) {
          state.player.war = { enemy: id, target: null, wins: 0, losses: 0, seasons: 0,
            defending: true, casus: { type: 'border', label: 'Border war' } };
          FB.news(state, FB.msg('news.world.war_declared_on_player',
            '🔥 {realm} declares war upon YOU!', { realm: r.name }));
          FB.warFooting(state);
          FB.queueEvent(state, 'war_defense_muster', {});
          if (FB.ui && FB.ui.maybeTip) {
            FB.ui.maybeTip('war-declared',
              '💡 War has come! The muster raises your host — follow the fighting on the map and keep the household safe.');
          }
        }
      }
    }

    // vassal breakaways: a strong duke or subject king may renounce his
    // liege and stand alone; the old sovereign marches to take him back
    for (const id in state.realms) {
      const r = state.realms[id];
      if (!r.alive || !r.liege || id === 'player') continue;
      if (FB.intrigueRealmRulerCaptive &&
          FB.intrigueRealmRulerCaptive(state, id)) continue;
      const top = FB.topRealm(state, id);
      if (top === id || FB.isRealmAtWar(state, top)) continue;
      // the 1.5% gate first: realmTerritory walks the whole realm table, and
      // ~98.5% of that work was thrown away when the roll failed
      if (!FB.chance(FB.vassalBreakawayChance(state, id))) continue;
      const terr = FB.realmTerritory(state, id);
      if (terr.length < 3) continue;
      if (FB.realmStrength(state, top) < 8) continue;
      r.liege = null;
      for (const pid of terr) state.owner[pid] = id;
      FB.invalidateRealmCache();
      if (FB.mergeRealmTech) FB.mergeRealmTech(state, id, top);
      const tr = state.realms[top];
      if (top === 'player') {
        // the player's own vassal rises: fought as a defensive war of the
        // player's, never as realms.player.war — the AI loop skips the
        // player, so a war parked there could neither resolve nor be fought
        if (tr && tr.alive && !state.player.war) {
          state.player.war = { enemy: id, target: null, wins: 0, losses: 0, seasons: 0,
            defending: true, casus: { type: 'independence' } };
          FB.warFooting(state);
          FB.queueEvent(state, 'war_defense_muster', {});
          if (FB.ui && FB.ui.maybeTip) {
            FB.ui.maybeTip('war-declared',
              '💡 War has come! The muster raises your host — follow the fighting on the map and keep the household safe.');
          }
        }
      } else if (tr && tr.alive && !tr.war) {
        tr.war = { enemy: id, years: 0, captures: 0,
          casus: { type: 'border', label: 'Breakaway war' } };
      }
      if (top === FB.playerRealmId(state) || id === state.player.liege || FB.game.observe) {
        FB.news(state, FB.msg('news.world.breakaway', {
          forms: {
            select: 'value', param: 'overlord', cases: {
              realm: '🔥 {realm} renounces the suzerainty of {liege}!',
              other: '🔥 {realm} renounces the suzerainty of the crown!'
            }
          }
        }, { overlord: tr ? 'realm' : 'other', realm: r.name, liege: tr ? tr.name : '' }));
      }
    }

    /* A rare yearly opening between neighboring, peaceful sovereign crowns.
       The compact is bilateral and defensive; no allied war is created. */
    const courted = {};
    for (const id in state.realms) {
      const r = state.realms[id];
      if (id === 'player' || !r.alive || r.liege || r.rank < 3 || FB.isRealmAtWar(state, id) ||
          courted[id] || FB.allianceOf(state, id) || !FB.chance(0.08)) continue;
      const choices = [];
      for (const id2 in state.realms) {
        const r2 = state.realms[id2];
        if (id2 === id || id2 === 'player' || !r2.alive || r2.liege || r2.rank < 3 ||
            FB.isRealmAtWar(state, id2) || courted[id2] || FB.allianceOf(state, id2)) continue;
        if (!FB.realmsAdjacent(state, id, id2)) continue;
        if (!realmsFaithCompatible(state, id, id2)) continue;
        choices.push(id2);
      }
      if (choices.length) {
        const partner = FB.pick(choices);
        if (FB.formAlliance(state, id, partner, 'dynastic')) {
          courted[id] = courted[partner] = 1;
          if (FB.game.observe || id === FB.playerRealmId(state) || partner === FB.playerRealmId(state)) {
            FB.news(state, FB.msg('news.world.alliance_formed',
              '🤝 {realm} and {ally} bind themselves in a defensive alliance.',
              { realm: r.name, ally: state.realms[partner].name }));
          }
        }
      }
    }

    if (FB.rulerAgencyYearly) FB.rulerAgencyYearly(state, familyLinks);

    FB.aiBuildingsYear(state);
  };

  /* ================= PLAYER WAR (seasonal) ================= */

  /* The player's host composition: the dev-driven muster is the levy (massed,
     untrained foot); buildings, national technology, positions, and a landed
     baron's household add archers, cavalry, and men-at-arms. */
  FB.playerCompositionBreakdown = function (state) {
    const B = FBDATA.balance;
    const p = state.player;
    const comp = { levy:0, arch:0, cav:0, ret:0 };
    const entries = [];
    function add(unit, kind, amount, data) {
      if (!amount) return;
      comp[unit] += amount;
      const entry = { unit:unit, kind:kind, amount:amount };
      if (data) for (const key in data) entry[key] = data[key];
      entries.push(entry);
    }
    function buildingEntries(key, unit) {
      const count = {};
      for (const pid of FB.demesne(state)) {
        for (const built of FB.builtIn(state, pid)) {
          const def = FBDATA.buildings[built.id];
          if (!built.ruined && def && def[key]) {
            count[built.id] = (count[built.id] || 0) + 1;
          }
        }
      }
      for (const id in count) {
        add(unit, 'building', FBDATA.buildings[id][key] * count[id], {
          buildingId:id, count:count[id]
        });
      }
    }

    if (p.provs && p.provs.length) {
      for (const pid of p.provs) {
        const countyLevy = (state.dev[pid] || 1) * B.levyPerDev;
        add('levy', 'county', countyLevy, { pid:pid });
        if (FB.countyModifierRecords) {
          for (const record of FB.countyModifierRecords(state, pid)) {
            const def = FBDATA.modifiers && FBDATA.modifiers[record.id];
            const rate = def && def.fx && Number(def.fx.levy);
            if (isFinite(rate) && rate) {
              add('levy', 'modifier', countyLevy * rate, {
                modifierId:record.id, pid:pid, rate:rate
              });
            }
          }
        }
      }
    } else if (p.tier >= 3 &&
        !(FB.hasBishopric && FB.hasBishopric(state, state.chars[p.charId]))) {
      const retinue = B.baronyRetinue || 120;
      add('ret', FB.castellanyOf && FB.castellanyOf(state)
        ? 'castellany_retinue' : 'barony_retinue', retinue);
      /* A baron holds no county, so the county-levy loop above never ran and
         a levy concession on their seat went unapplied. Itemize it against
         the household the baron actually raises, by the same ownership rule
         that charges them upkeep for that record. See FB.modifierCounties. */
      const seat = FB.modifierSeat ? FB.modifierSeat(state) : null;
      if (seat && FB.countyModifierRecords) {
        for (const record of FB.countyModifierRecords(state, seat)) {
          const def = FBDATA.modifiers && FBDATA.modifiers[record.id];
          const rate = def && def.fx && Number(def.fx.levy);
          if (isFinite(rate) && rate) {
            add('ret', 'modifier', retinue * rate, {
              modifierId:record.id, pid:seat, rate:rate
            });
          }
        }
      }
    }
    if (FB.hasBishopric && FB.hasBishopric(state, state.chars[p.charId])) {
      add('ret', 'episcopal_household',
        FB.bishopricRetinue ? FB.bishopricRetinue(state) : 120);
    }

    if (p.tier >= 3) {
      buildingEntries('levy', 'levy');
      buildingEntries('retinue', 'ret');
      buildingEntries('archers', 'arch');
      const techUnits = FB.techUnits ? FB.techUnits(state) :
        { levy:0, arch:FB.techBonus(state, 'archers'), cav:0,
          ret:FB.techBonus(state, 'retinue') };
      for (const unit of ['levy', 'arch', 'cav', 'ret']) {
        if (techUnits[unit]) add(unit, 'technology_flat', techUnits[unit], { key:unit });
      }

      /* Technology and Council percentages share one multiplier in the
         historical calculation. Itemizing both against the same base keeps
         that arithmetic exact. */
      const ownBase = comp.levy;
      const techRate = FB.techBonus(state, 'levy');
      const councilRate = FB.councilBonus ? FB.councilBonus(state, 'levy') : 0;
      if (techRate) add('levy', 'technology_rate', ownBase * techRate, { rate:techRate });
      if (councilRate) add('levy', 'council_rate', ownBase * councilRate, {
        rate:councilRate, seatId:'constable'
      });

      const me = state.chars[p.charId];
      for (const tid of (me ? me.traits : [])) {
        const trait = FBDATA.traits[tid];
        const traitRate = trait && trait.war && Number(trait.war.levy);
        if (isFinite(traitRate) && traitRate) {
          add('levy', 'trait_rate', ownBase * traitRate, {
            rate:traitRate, traitId:tid
          });
        }
      }
      const martialRate = (me ? FB.skillOf(me, 'mar') : 0) * (B.levyPerMartial || 0);
      if (martialRate) {
        const beforeMartial = comp.levy;
        add('levy', 'martial_rate', beforeMartial * martialRate, { rate:martialRate });
      }

      const domain = FB.domainPenalty(state);
      if (domain !== 1) {
        const beforeDomain = comp.levy;
        add('levy', 'domain_penalty', beforeDomain * (domain - 1), { rate:domain - 1 });
      }

      /* Vassal men arrive after own-domain modifiers. A called favor raises
         only that named vassal's contribution and stays visible here. */
      for (const vid of FB.playerVassals(state)) {
        const rate = FB.vassalLevyRate
          ? FB.vassalLevyRate(state, vid) : (B.vassalLevyRate || 0);
        const amount = FB.vassalLevyContribution
          ? FB.vassalLevyContribution(state, vid) : 0;
        add('levy', 'vassal', amount, {
          rid:vid, rate:rate,
          favored:!!(FB.vassalLevyFavor && FB.vassalLevyFavor(state, vid))
        });
      }

      /* Fort garrisons stay behind when the field host musters. They are a
         named negative levy source, clamped so a sparse domain never turns
         the deployable levy below zero. */
      const garrison = FB.fortGarrisonBurden
        ? Math.min(comp.levy, FB.fortGarrisonBurden(state, 'player')) : 0;
      if (garrison) add('levy', 'fort_garrison', -garrison);
    }

    /* Earned posts and paid household offices add named professionals. They
       are outside the levy percentages because they are already sworn. */
    if (FB.positionContributions) {
      for (const source of FB.positionContributions(state, 'retinue')) {
        add('ret', source.kind, source.amount, {
          positionId:source.id, charId:source.charId || null
        });
      }
    }

    for (const unit of ['levy', 'arch', 'cav', 'ret']) {
      const papalMultiplier = FB.papacyRealmStrengthMultiplier
        ? FB.papacyRealmStrengthMultiplier(state, 'player') : 1;
      if (papalMultiplier !== 1 && comp[unit]) {
        add(unit, 'papal_policy', comp[unit] * (papalMultiplier - 1), {
          rate:papalMultiplier - 1
        });
      }
      const rounded = Math.round(comp[unit]);
      const adjustment = rounded - comp[unit];
      if (Math.abs(adjustment) > 0.0001) {
        entries.push({ unit:unit, kind:'rounding', amount:adjustment });
      }
      comp[unit] = rounded;
    }
    return {
      units:comp,
      entries:entries,
      total:comp.levy + comp.arch + comp.cav + comp.ret
    };
  };

  FB.playerComposition = function (state) {
    const c = FB.playerCompositionBreakdown(state).units;
    return { levy:c.levy, arch:c.arch, cav:c.cav, ret:c.ret };
  };

  FB.playerLevy = function (state) {
    const c = FB.playerComposition(state);
    return c.levy + c.arch + c.cav + c.ret;
  };

  /* Is the player personally caught up in a war? While true, only events
     marked wartime:true fire on slot days — ordinary life is postponed. */
  FB.atWarPersonally = function (state) {
    const p = state.player;
    if (p.war) return true;
    if (FB.playerGreatHolyWarActive && FB.playerGreatHolyWarActive(state)) return true;
    if (FB.activeMilitaryCommand && FB.activeMilitaryCommand(state)) return true;
    if (p.flags.on_campaign) return true;
    if (p.flags.with_liege_host && p.liege && FB.isRealmAtWar(state, p.liege)) return true;
    if (p.profession === 'soldier' && FB.isRealmAtWar(state, state.owner[p.provinceId])) return true;
    return false;
  };

  /* Move the player onto a war footing: remember the peacetime focus and
     take command of the host. validateFocus restores the old focus at peace.
     The host musters the moment war begins (every war-start path comes
     through here) — the muster events that follow only decide whether it
     takes the field with hired companies or a great levy behind it. A host
     still inside its rearm window (armyDown) cannot rise yet; the muster
     event's war_raise retries once the window has passed. */
  FB.warFooting = function (state) {
    const p = state.player;
    if (p.focus !== 'lead_host') { p.focusBack = p.focus; p.focus = 'lead_host'; }
    if (FB.raisePlayerHost) FB.raisePlayerHost(state);
    if (FB.ensurePlayerWarFeedback) FB.ensurePlayerWarFeedback(state);
  };

  FB.endPlayerWar = function (state) {
    const p = state.player;
    if (p.flags && p.flags.in_prison) {
      delete p.flags.in_prison;
      FB.news(state, FB.msg('news.war.prison_released',
        '🕊 The peace opens your cell — you come home thinner, but free.', {}));
    }
    state.player.war = null;
    FB.validateFocus(state);
  };

  /* Each war season asks for orders instead of rolling a hidden battle. Host
     logistics are charged from the shared live-composition calculation at
     the season boundary; this tick advances exhaustion, lets the ENEMY make
     its move, and queues a war-council event. Its options act through the
     FB.fns.war_* handlers below. */
  function caliphateWarEnemyHoldsOffice(state, war) {
    const head = FB.religiousHeadOf(state, 'sunni');
    return !!(head && FB.topRealm(state, head.id) === war.enemy);
  }

  function caliphateWarClaimantEligible(state) {
    return !!(FB.caliphateWarClaimantEligible &&
      FB.caliphateWarClaimantEligible(state));
  }

  function endCaliphateWarForLostClaim(state) {
    FB.news(state, FB.msg('news.war.caliphate_claim_lost',
      '🕊 The succession war ends — your realm no longer has a lawful Sunni claimant to the office of {title}.', {
        title: FB.dataParam('religion', 'sunni', 'head.title')
      }));
    FB.endPlayerWar(state);
  }

  function endCaliphateWarForLostOffice(state) {
    FB.news(state, FB.msg('news.war.caliphate_lost',
      '🕊 The office of {title} has passed beyond the enemy’s reach — the succession war ends with nothing gained.', {
        title: FB.dataParam('religion', 'sunni', 'head.title')
      }));
    FB.endPlayerWar(state);
  }

  FB.playerWarTick = function (state) {
    const p = state.player;
    const w = p.war;
    if (!w) return;
    const enemy = state.realms[w.enemy];
    if (!enemy || !enemy.alive) {
      FB.news(state, FB.msg('news.war.enemy_gone',
        '🕊 The war ends — our enemy has ceased to exist.', {}));
      FB.endPlayerWar(state); return;
    }
    w.seasons++;
    /* A siege pressed every seasonal council does not decay between those
       councils. Once a full additional season passes without work, one step
       is lost per season. */
    if (!w.defending && (w.siege || 0) > 0) {
      if (w.lastSiegeTurn === undefined) w.lastSiegeTurn = state.turn - 90;
      if (state.turn - w.lastSiegeTurn > 90) {
        w.siege = Math.max(0, w.siege - 1);
        w.lastSiegeTurn += 90;
        if (!w.siege) delete w.siegeFortLevel;
      }
    }
    /* a contested office can slip away mid-war (the holder falls to a third
       party and the saved vacancy is claimed elsewhere): the war's object is
       gone — end it quietly rather than dragging to exhaustion */
    if (!w.defending && w.casus && w.casus.type === 'caliphate') {
      if (!caliphateWarClaimantEligible(state)) {
        endCaliphateWarForLostClaim(state); return;
      }
      if (!caliphateWarEnemyHoldsOffice(state, w)) {
        endCaliphateWarForLostOffice(state); return;
      }
    }
    if (!w.defending && w.casus &&
        (w.casus.type === 'restoration' || w.casus.type === 'caliphate') && enemy.capital) {
      w.target = enemy.capital; // the right follows the living seat of the contested crown
      w.casus.target = enemy.capital;
    }
    /* attacking a target that has slipped out of the enemy's hands (revolt
       settled elsewhere, province lost to a third party): the war has no
       object left — end it gracefully rather than dragging to exhaustion */
    if (!w.defending && w.target && state.owner[w.target] !== w.enemy) {
      FB.news(state, FB.msg('news.war.target_lost',
        '🕊 {province} is no longer the enemy’s to lose — the war ends with nothing gained.',
        { province: FB.world.byId[w.target] ? FB.world.byId[w.target].name : '' }));
      FB.endPlayerWar(state); return;
    }
    let exhaustionDelay = 0;
    if (!w.defending && w.target && FB.fortSiegeStatus) {
      exhaustionDelay = FB.fortSiegeStatus(state, w.target, {
        fortLevel:w.siegeFortLevel, progress:w.siege || 0
      }, 0).delay;
    } else if (w.defending && w.enemyTarget && FB.fortSiegeStatus) {
      exhaustionDelay = FB.fortSiegeStatus(state, w.enemyTarget, {
        fortLevel:w.enemySiegeFortLevel, progress:w.enemySiege || 0
      }, 0).delay;
    }
    if (w.seasons > 8 + exhaustionDelay) {
      FB.news(state, FB.msg('news.war.exhausted',
        '🕊 Exhaustion ends the war with nothing gained.', {}));
      FB.endPlayerWar(state); return;
    }
    if (w.defending) {
      // the enemy's advance is now literal: their host must stand in your
      // lands to tighten the noose — keep it out and nothing falls
      const invader = FB.enemyHostInPlayerLandsArmy
        ? FB.enemyHostInPlayerLandsArmy(state) : null;
      if (invader) {
        if (w.enemyTarget && w.enemyTarget !== invader.at && (w.enemySiege || 0) > 0) {
          w.enemySiege = Math.max(0, w.enemySiege - 1);
          if (!w.enemySiege) {
            w.enemyTarget = invader.at;
            delete w.enemySiegeFortLevel;
          }
        } else {
          w.enemyTarget = invader.at;
          const siegePreview = FB.enemySiegeStatus(state, invader);
          const status = FB.advanceFortSiegePulse
            ? FB.advanceFortSiegePulse(state, invader.at, w, {
              progressKey:'enemySiege', levelKey:'enemySiegeFortLevel',
              hosts:siegePreview.hosts, contested:siegePreview.contested,
              progressAmount:1 + (FB.techBonus
                ? FB.techBonus(state, 'siege', w.enemy) * 3 : 0)
            })
            : null;
          if (status && status.breached) {
            if (FB.warLoseProvince(state, invader.at, true)) return;
          }
          if (status && status.stalled === 'shortage') {
            FB.news(state, FB.msg('news.war.enemy_siege_stalled',
              '🏰 {enemy} lacks {shortage} men to press the fort at {province}.', {
                enemy:enemy.name, shortage:status.shortage,
                province:FB.world.byId[invader.at].name
              }));
          }
        }
        if ((w.enemySiege || 0) >= 2) {
          FB.news(state, FB.msg('news.war.enemy_advance',
            '⚠ {enemy} presses the siege in your lands; only a breach can take the county.',
            { enemy: enemy.name }));
        }
      } else if ((w.enemySiege || 0) > 0) {
        w.enemySiege = Math.max(0, w.enemySiege - 1);
        if (!w.enemySiege) {
          w.enemyTarget = null;
          delete w.enemySiegeFortLevel;
        }
      }
      FB.maybeOfferSubmission(state);
    }
    /* a prisoner leads from a cell: no war council while the in_prison flag
       stands — the war drifts without orders while health, authority, and
       fortune decide how long the captivity lasts (docs/designs/descent.md) */
    if (p.flags && p.flags.in_prison) {
      const me = state.chars[p.charId];
      if (me && !me.dead && FB.chance(0.3)) me.health = Math.max(1, me.health - 1);
      if (state.council && state.council.authority !== undefined) {
        state.council.authority = Math.max(0, state.council.authority - 2);
      }
      const relChance = Math.min(0.5,
        (FBDATA.balance.ransomSeasonReleaseChance || 0.2) +
        (me ? FB.skillOf(me, 'int') : 0) / 200);
      if (FB.chance(relChance)) {
        delete p.flags.in_prison;
        FB.news(state, FB.msg('news.war.prison_escaped',
          '⛓ A bribed gaoler, a moonless night, a swift horse — you are free of {enemy}.',
          { enemy: enemy ? enemy.name : '' }));
      }
      return;
    }
    FB.queueEvent(state, 'war_council', {});
  };

  /* Is a hostile field host standing in the player's own lands? Drives the
     defensive siege clock: an invader kept out of the demesne takes nothing. */
  FB.enemyHostInPlayerLands = function (state) {
    const p = state.player, w = p.war;
    if (!w) return false;
    if (!state.armies) return true; // no field data (old save): the old behavior
    for (const a of state.armies) {
      if (a.realm !== w.enemy) continue;
      if (a.at === p.provinceId || (p.provs && p.provs.indexOf(a.at) >= 0)) return true;
      if (state.holder && state.holder[a.at] === 'player') return true;
    }
    return false;
  };

  FB.enemyHostInPlayerLandsArmy = function (state) {
    const p = state.player, w = p.war;
    if (!w || !state.armies) return null;
    for (const army of state.armies) {
      if (army.realm !== w.enemy) continue;
      if (army.at === p.provinceId ||
          (p.provs && p.provs.indexOf(army.at) >= 0) ||
          (state.holder && state.holder[army.at] === 'player')) return army;
    }
    return null;
  };

  FB.enemySiegeStatus = function (state, invadingHost) {
    const w = state.player.war;
    const invader = invadingHost || FB.enemyHostInPlayerLandsArmy(state);
    if (!w || !w.defending || !invader) return null;
    const here = FB.armiesAt ? FB.armiesAt(state, invader.at) : [invader];
    const besiegers = [], contested = here.some(function (army) {
      if (army === invader || !FB.armiesHostile) return false;
      if (FB.armiesHostile(state, invader, army)) return true;
      if (army.realm === invader.realm ||
          (FB.areAllied && FB.areAllied(state, invader.realm, army.realm))) {
        besiegers.push(army);
      }
      return false;
    });
    besiegers.unshift(invader);
    const status = FB.fortSiegeStatus(state, invader.at, {
      fortLevel:w.enemySiegeFortLevel, progress:w.enemySiege || 0
    }, besiegers);
    status.host = invader;
    status.hosts = besiegers;
    status.contested = contested;
    status.canProgress = status.canProgress && !contested;
    return status;
  };

  /* ---- devastation & the protection bargain (docs/designs/descent.md) ----
     A hostile host standing in a commoner's HOME province burns the season's
     peace; after two burnings the local lord offers the old bargain — his
     wall and his men for the family's freedom. */
  FB.hostileHostAtHome = function (state) {
    const p = state.player;
    if (!state.armies || !p.provinceId) return false;
    const homeSovereign = state.owner[p.provinceId];
    if (!homeSovereign || homeSovereign === 'player') return false;
    const homeArmy = { realm: homeSovereign };
    for (const a of state.armies) {
      if (a.at !== p.provinceId) continue;
      if (a.realm === homeSovereign || a.realm === 'player') continue;
      if ((a.men || 0) < (FBDATA.balance.armyMinMen || 40)) continue;
      if (FB.armiesHostile(state, a, homeArmy)) return true;
    }
    return false;
  };
  FB.devastationSeason = function (state) {
    const p = state.player;
    if (p.tier > 2 || p.travel || !p.flags) return;
    if (p.flags.lord_protection) return;
    if (!FB.hostileHostAtHome(state)) {
      // the danger passes: the memory of burning fades one step at a time
      if (p.flags.home_burned2) delete p.flags.home_burned2;
      else if (p.flags.home_burned) delete p.flags.home_burned;
      return;
    }
    if (!FB.chance(FBDATA.balance.devastationChance || 0.4)) return;
    if (p.flags.home_burned) { delete p.flags.home_burned; p.flags.home_burned2 = 1; }
    else p.flags.home_burned = 1;
    FB.queueEvent(state, 'devastation_raiders', {});
    if (FB.ui && FB.ui.maybeTip) {
      FB.ui.maybeTip('home-burned',
        '💡 Raiders burn the land — devastation steals yields and holdings; a lord’s peace or a strong realm keeps them away.');
    }
    /* after the second burning the lord's steward makes his offer — but only
       a freeholder has a freedom left to sell */
    if (p.flags.home_burned2 && p.tier === 1) {
      FB.queueEvent(state, 'devastation_protection', {});
    }
  };
  FB.fns = FB.fns || {};
  FB.fns.devastation_lose_holding = function (state) {
    const p = state.player;
    const holdings = FB.holdingList ? FB.holdingList(state) : [];
    if (!holdings.length) {
      p.gold = Math.max(0, p.gold - 5); // nothing to burn but the crop and the door
      return;
    }
    const id = FB.pick(holdings);
    holdings.splice(holdings.indexOf(id), 1);
    FB.news(state, FB.msg('news.world.devastation_holding',
      '🔥 The raiders take {asset} and burn what they cannot carry.',
      { asset: FB.dataParam('holding', id) }));
  };
  FB.fns.devastation_commend = function (state) {
    const p = state.player;
    delete p.flags.home_burned;
    delete p.flags.home_burned2;
    p.flags.lord_protection = 1;
    if (p.tier === 1) {
      FB.setPlayerTier(state, 0);
      FB.news(state, FB.msg('news.world.commended',
        '🛡 The household goes inside the lord’s wall — his people now, protected and bound.', {}));
    }
  };

  /* Attacking victory: the besieged target falls to you. */
  FB.warCapture = function (state) {
    const p = state.player;
    const w = p.war;
    const pid = w && w.target;
    const targetFort = pid && FB.fortAt ? FB.fortAt(state, pid) : null;
    if (targetFort && (Number(targetFort.level) || 0) > 0) {
      const breach = FB.fortSiegeStatus(state, pid, {
        fortLevel:w.siegeFortLevel, progress:w.siege || 0
      }, 0);
      if (!breach.breached) return false;
    }
    if (w && w.casus && w.casus.type === 'caliphate') {
      const enemy = state.realms[w.enemy];
      if (!caliphateWarClaimantEligible(state)) {
        endCaliphateWarForLostClaim(state); return;
      }
      if (!enemy || !enemy.alive || !caliphateWarEnemyHoldsOffice(state, w)) {
        endCaliphateWarForLostOffice(state); return;
      }
      const claimantRealm = FB.playerRealmId(state);
      if (claimantRealm &&
          FB.assignReligiousHead(state, 'sunni', claimantRealm)) {
        FB.damageCountyDevelopment(state, pid);
        if (FB.damageCountyPopulation) FB.damageCountyPopulation(state, pid, 'conquest');
        p.prestige += FB.religiousHeadBalance('religiousHeadClaimWarPrestige', 100);
        FB.news(state, FB.msg('news.religion.head_seized',
          '☪ The office of {title} passes to your realm by right of conquest — {realm} keeps its lands, but not the Caliphate.', {
            title: FB.dataParam('religion', 'sunni', 'head.title'),
            realm: enemy.name
          }));
        FB.endPlayerWar(state);
        return true;
      }
      FB.news(state, FB.msg('news.war.caliphate_unresolved',
        '🕊 The succession war ends without the office of {title} changing hands.', {
          title: FB.dataParam('religion', 'sunni', 'head.title')
        }));
      FB.endPlayerWar(state);
      return;
    }
    if (w && w.casus && w.casus.type === 'restoration') {
      const enemy = state.realms[w.enemy];
      const me = state.chars[p.charId];
      if (enemy && enemy.alive && FB.absorbRealm(state, w.enemy, me)) {
        FB.damageCountyDevelopment(state, pid);
        if (FB.damageCountyPopulation) FB.damageCountyPopulation(state, pid, 'conquest');
        if (me && me.restorationRight && me.restorationRight.realmId === w.enemy) {
          delete me.restorationRight;
        }
        p.prestige += 100;
        FB.news(state, FB.msg('news.war.crown_restored',
          '👑 The usurper’s crown and vassals return intact to your rightful rule.', {}));
        FB.endPlayerWar(state);
        return true;
      }
    }
    if (pid && state.owner[pid] === w.enemy) {
      if (!(state.realms.player && state.realms.player.alive)) FB.foundPlayerRealm(state);
      FB.transferProvince(state, pid, FB.playerRealmId(state) || 'player');
      if (state.holder) state.holder[pid] = 'player'; // the player's own demesne
      FB.invalidateRealmCache(); // transferProvince rebuilt before the holder rewrite
      p.provs = p.provs || [];
      if (p.provs.indexOf(pid) < 0) p.provs.push(pid);
      if (w.casus && w.casus.type === 'fabricated') {
        const claim = p.fabricatedClaim;
        if (claim && (claim.pid || claim) === pid) p.fabricatedClaim = null;
      }
      if (w.casus && w.casus.type === 'aggression' && FB.addModifier) {
        FB.addModifier(state, 'conquered_without_right', pid);
      }
      FB.damageCountyDevelopment(state, pid);
      if (FB.damageCountyPopulation) FB.damageCountyPopulation(state, pid, 'conquest');
      FB.news(state, FB.msg('news.war.conquest',
        '🏰 {province} is yours by conquest!', { province: FB.world.byId[pid].name }));
      p.prestige += FB.warPrestigeReward(w, 'conquest');
      FB.endPlayerWar(state);
      FB.checkTierPromotions(state);
      return true;
    } else {
      p.prestige += FB.warPrestigeReward(w, 'slipped');
      p.gold += 25;
      FB.news(state, FB.msg('news.war.tribute_without_prize',
        '🕊 The prize has slipped away, but tribute is paid. The war ends in your favor.', {}));
      FB.endPlayerWar(state);
      return true;
    }
  };

  /* Defensive defeat: the enemy advance takes a border province — one of the
     player's OWN counties bordering the invader, as the siege warning
     promises. (Picking across the whole sovereign bloc made the loss land on
     a vassal's county and quietly degrade to the reparations branch.) */
  FB.warLoseProvince = function (state, forcedPid, breached) {
    const p = state.player;
    const w = p.war;
    let lost = null;
    if (forcedPid && p.provs && p.provs.indexOf(forcedPid) >= 0) {
      lost = forcedPid;
    } else if (p.provs && p.provs.length) {
      const opts = [];
      for (const pid of p.provs) {
        const adj = FB.world.adj[pid] || {};
        for (const nb in adj) {
          const fort = FB.fortAt ? FB.fortAt(state, pid) : null;
          if (state.owner[nb] === w.enemy &&
              !(fort && (Number(fort.level) || 0) > 0)) {
            opts.push(pid); break;
          }
        }
      }
      if (opts.length) lost = FB.pick(opts);
    }
    if (!lost && !forcedPid) {
      lost = FB.borderProvince(state, FB.playerRealmId(state), w.enemy,
        function (pid) {
          const fort = FB.fortAt ? FB.fortAt(state, pid) : null;
          return !(fort && (Number(fort.level) || 0) > 0);
        });
    }
    const lostFort = lost && FB.fortAt ? FB.fortAt(state, lost) : null;
    if (lostFort && (Number(lostFort.level) || 0) > 0) {
      const status = FB.fortSiegeStatus(state, lost, {
        fortLevel:w.enemySiegeFortLevel, progress:w.enemySiege || 0
      }, 0);
      if (!breached || !status.breached || w.enemyTarget !== lost) lost = null;
    }
    if (lost && p.provs && p.provs.indexOf(lost) >= 0) {
      FB.damageCountyDevelopment(state, lost);
      if (FB.damageCountyPopulation) FB.damageCountyPopulation(state, lost, 'war_loss');
      FB.transferProvince(state, lost, w.enemy);
      FB.news(state, FB.msg('news.war.province_lost',
        '🏚 {province} is torn from your grasp.', { province: FB.world.byId[lost].name }));
      if (!p.provs.length) {
        FB.setPlayerTier(state, 2);
        FB.changePlayerLiege(state, null, 'war:landless');
        if (FB.invalidateGuildMonopolies) FB.invalidateGuildMonopolies(state);
        if (state.realms.player) FB.markRealmDead(state, 'player');
        FB.news(state, FB.msg('news.war.landless',
          '⬇ Landless once more. The banners are folded away.', {}));
      }
      p.prestige = Math.max(0, p.prestige - 20);
      FB.endPlayerWar(state);
      return true;
    } else {
      if (FB.fortGarrisonBurden && FB.fortGarrisonBurden(state, 'player') > 0) {
        FB.news(state, FB.msg('news.war.fort_holds',
          '🏰 Field defeat cannot surrender an unbreached fortified county; the invasion continues.', {}));
        return false;
      }
      p.gold = Math.max(0, p.gold - 30);
      FB.news(state, FB.msg('news.war.reparations',
        '🕊 A humiliating peace. Reparations drain your coffers.', {}));
      p.prestige = Math.max(0, p.prestige - 20);
      FB.endPlayerWar(state);
      return true;
    }
  };

  /* The house falls: every acre lost, the family back to landless gentry.
     A sovereign's realm passes whole to a generated usurper (the realm
     stands — the house falls; its vassals kneel to the new master); a
     vassal's fiefs escheat to his liege; a baron simply loses his place.
     Reached only at the end of the downfall event chains (df_* in
     data/events_noble.js), each several unlucky or neglected stages deep. */
  FB.loseAllLand = function (state, opts) {
    opts = opts || {};
    const p = state.player;
    if (p.war) FB.endPlayerWar(state);
    // the slide is over, one way or another — none of it follows the heir
    for (const df of ['df_unrest', 'df_league', 'df_claim', 'df_claim2', 'df_marked', 'df_doom']) delete p.flags[df];
    if (p.provs && p.provs.length) {
      if (FB.isPlayerSovereign(state) || !p.liege) {
        const old = FB.isPlayerSovereign(state) ? state.realms.player : null;
        const cap = (old && old.capital) || p.provs[0];
        const pr = FB.world.byId[cap];
        const uid = 'usurper_' + state.turn;
        const u = FB.makeVassalRealm(state, {
          id: uid, name: old ? old.name : 'Realm of ' + (pr ? pr.name : 'the Usurper'),
          capital: cap, rank: old ? old.rank : Math.max(1, p.tier - 3), liege: null,
          culture: pr ? pr.culture : 'frankish'
        });
        u.color = old ? old.color : '#f0c840'; // the map barely ripples
        if (old) {
          if (FB.mergeRealmTech) FB.mergeRealmTech(state, uid, 'player');
          FB.markRealmDead(state, 'player');
          FB.breakAlliance(state, 'player');
          if (old.rank >= 3 && !opts.papalTransition) {
            const rightful = state.chars[p.charId];
            rightful.restorationRight = {
              realmId: uid,
              titleName: old.name,
              rank: old.rank,
              createdTurn: state.turn
            };
          }
        }
        for (const pid of p.provs) { state.owner[pid] = uid; state.holder[pid] = uid; }
        for (const vid in state.realms) {
          if (state.realms[vid].liege === 'player') state.realms[vid].liege = uid;
        }
        if (!opts.papalTransition) {
          FB.news(state, FB.msg('news.world.usurped',
            '🏴 {ruler} seizes the seat — the realm endures; your house does not.',
            { ruler: u.ruler.name }));
        }
      } else {
        // a vassal's fiefs escheat to his liege
        if (FB.mergeRealmTech) {
          FB.mergeRealmTech(state, FB.topRealm(state, p.liege), 'player');
        }
        for (const pid of p.provs) {
          state.owner[pid] = FB.topRealm(state, p.liege);
          state.holder[pid] = p.liege;
        }
        if (!opts.papalTransition) {
          FB.news(state, FB.msg('news.world.player_fiefs_escheat', {
            forms: {
              select: 'value', param: 'holder', cases: {
                realm: '📜 Your fiefs escheat to {liege}.',
                other: '📜 Your fiefs escheat to your liege.'
              }
            }
          }, {
            holder: state.realms[p.liege] ? 'realm' : 'other',
            liege: state.realms[p.liege] ? state.realms[p.liege].name : ''
          }));
        }
      }
      p.provs = [];
    }
    if (state.realms.player && state.realms.player.alive) {
      FB.markRealmDead(state, 'player');
      for (const vid in state.realms) {
        if (state.realms[vid].liege === 'player') state.realms[vid].liege = p.liege || null;
      }
    }
    FB.setPlayerTier(state, 2);
    FB.changePlayerLiege(state, null, 'realm:cast_down');
    if (FB.invalidateGuildMonopolies) FB.invalidateGuildMonopolies(state);
    if (!opts.papalTransition) {
      p.pop = 0;
      p.prestige = Math.round(p.prestige * (opts.flee ? 0.6 : 0.4));
    }
    FB.invalidateRealmCache();
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
    if (opts.flee) FB.movePlayerRandom(state);
    if (!opts.papalTransition) {
      FB.news(state, FB.msg('news.world.cast_down',
        '⬇ Cast down. The family keeps its coffers and its name — but not an acre.', {}));
    }
  };

  /* ---- the loser's homage (docs/designs/descent.md) ----------------------
     A defender outmatched by a greater lord may be offered submission once
     per war: kneel and keep every acre under a new banner, buy the peace at
     a conqueror's price, or fight on and lose the land province by province. */
  function playerWarStrength(state) {
    const p = state.player;
    if (state.realms.player && state.realms.player.alive) {
      return FB.realmStrength(state, 'player');
    }
    let s = 0;
    for (const pid of (p.provs || [])) s += state.dev[pid] || 1;
    return s;
  }
  FB.submissionOfferEligible = function (state) {
    const p = state.player, w = p.war;
    if (!w || !w.defending || w.submissionOffered) return false;
    if (p.tier < 4 || (p.flags && p.flags.in_prison)) return false;
    const enemy = state.realms[w.enemy];
    if (!enemy || !enemy.alive) return false;
    /* Submission changes political control of every directly held county.
       It therefore cannot bypass even one standing, untransferred fort. A
       successfully breached county is transferred immediately by the siege
       path, so no active fortified holding can remain when terms are valid. */
    if (FB.fortGarrisonBurden &&
        FB.fortGarrisonBurden(state, 'player') > 0) return false;
    if ((enemy.rank || 1) <= Math.max(1, p.tier - 3)) return false; // only a greater lord
    return FB.realmStrength(state, w.enemy) >=
      playerWarStrength(state) * (FBDATA.balance.submissionStrengthRatio || 1.5);
  };
  FB.maybeOfferSubmission = function (state) {
    const w = state.player.war;
    if (!FB.submissionOfferEligible(state)) return;
    const need = FBDATA.balance.warWinsToTakeProvince;
    if ((w.enemySiege || 0) < 2 && (w.losses || 0) < need - 1) return;
    w.submissionOffered = 1;
    FB.queueEvent(state, 'war_submission_offer', {});
  };

  /* ---- capture & ransom (docs/designs/descent.md) ------------------------
     A beaten tier-3+ leader may be taken in the rout: martial cuts a way
     out, intrigue slips the noose. The captor's price arrives by event; the
     war's end (or a dark night) opens the cell. */
  FB.maybeCapturePlayer = function (state) {
    const p = state.player, w = p.war;
    if (!w || p.tier < 3 || !p.flags || p.flags.in_prison) return;
    const me = state.chars[p.charId];
    const base = FBDATA.balance.captureChanceBase === undefined ? 0.35 : FBDATA.balance.captureChanceBase;
    const escape = Math.min(0.3,
      ((me ? FB.skillOf(me, 'mar') : 0) + (me ? FB.skillOf(me, 'int') : 0)) / 200);
    if (!FB.chance(Math.max(0.05, base - escape))) return;
    p.flags.in_prison = 1;
    FB.news(state, FB.msg('news.war.captured',
      '⛓ Taken in the rout! You are a prisoner of {enemy}.',
      { enemy: state.realms[w.enemy] ? state.realms[w.enemy].name : '' }));
    FB.queueEvent(state, 'prison_ransom', {});
  };
  function prisonRansom(state) {
    const table = FBDATA.balance.ransomByTier || [];
    return table[state.player.tier] || 30;
  }
  FB.fns.prison_still = function (state) {
    const p = state.player;
    return !!(p.flags && p.flags.in_prison && p.war &&
      state.realms[p.war.enemy] && state.realms[p.war.enemy].alive);
  };
  FB.fns.prison_can_pay = function (state) {
    return FB.fns.prison_still(state) && state.player.gold >= prisonRansom(state);
  };
  FB.fns.prison_pay = function (state) {
    const p = state.player;
    if (!FB.fns.prison_still(state)) return;
    p.gold = Math.max(0, p.gold - prisonRansom(state));
    delete p.flags.in_prison;
    FB.news(state, FB.msg('news.war.prison_ransomed',
      '⛓ The ransom is counted out — you ride home poorer, and free.', {}));
  };
  FB.fns.prison_can_cede = function (state) {
    const p = state.player;
    if (!FB.fns.prison_still(state)) return false;
    return (p.provs || []).some(function (pid) {
      const fort = FB.fortAt ? FB.fortAt(state, pid) : null;
      return !(fort && (Number(fort.level) || 0) > 0);
    });
  };
  FB.fns.prison_cede_land = function (state) {
    const p = state.player, w = p.war;
    if (!FB.fns.prison_still(state)) return;
    /* a border county signs the ransom roll — the captor takes what his
       host can already touch; an enclaved prisoner loses his first county */
    let ceded = null;
    const opts = [];
    for (const pid of (p.provs || [])) {
      const fort = FB.fortAt ? FB.fortAt(state, pid) : null;
      if (fort && (Number(fort.level) || 0) > 0) continue;
      const adj = FB.world.adj[pid] || {};
      for (const nb in adj) {
        if (state.owner[nb] === w.enemy) { opts.push(pid); break; }
      }
    }
    if (opts.length) ceded = FB.pick(opts);
    else if (p.provs && p.provs.length) {
      ceded = p.provs.find(function (pid) {
        const fort = FB.fortAt ? FB.fortAt(state, pid) : null;
        return !(fort && (Number(fort.level) || 0) > 0);
      });
    }
    if (!ceded) return;
    const cname = FB.world.byId[ceded] ? FB.world.byId[ceded].name : '';
    FB.transferProvince(state, ceded, w.enemy);
    delete p.flags.in_prison;
    FB.news(state, FB.msg('news.war.prison_ceded',
      '⛓ {province} signs the ransom roll — you ride home a county poorer, and free.',
      { province: cname }));
    if (!p.provs.length) {
      FB.setPlayerTier(state, 2);
      FB.changePlayerLiege(state, null, 'war:landless');
      if (FB.invalidateGuildMonopolies) FB.invalidateGuildMonopolies(state);
      if (state.realms.player) FB.markRealmDead(state, 'player');
      FB.news(state, FB.msg('news.war.landless',
        '⬇ Landless once more. The banners are folded away.', {}));
    }
  };

  /* Check whether accumulated victories or defeats settle the war.
     Attackers take the target only by SIEGE (war_siege below); enough field
     wins make the enemy sue for peace — the war_tribute_offer event then lets
     the player choose tribute now or pressing on for the prize. Enough
     defeats break the campaign. */
  FB.warOutcome = function (state) {
    const p = state.player;
    const w = p.war;
    if (!w) return;
    const enemy = state.realms[w.enemy];
    const NEED = FBDATA.balance.warWinsToTakeProvince;
    // defeats first: once the tribute offer can be declined, wins and losses
    // can BOTH pass the threshold — a broken campaign ends even so
    if (w.losses >= NEED) {
      if (w.defending) {
        if (FB.warLoseProvince(state)) {
          if (FB.papacyDecisiveWarLost) {
            FB.papacyDecisiveWarLost(state, 'player');
          }
        } else {
          /* Field defeat cannot teleport an enemy through an unbreached
             fortified border. Keep the war live just below the shortcut. */
          w.losses = Math.max(0, NEED - 1);
        }
      } else {
        if (FB.papacyDecisiveWarLost) {
          FB.papacyDecisiveWarLost(state, 'player');
        }
        p.prestige = Math.max(0, p.prestige - 15);
        FB.news(state, FB.msg('news.war.campaign_failed',
          '🕊 The campaign has failed. The host limps home.', {}));
        FB.endPlayerWar(state);
      }
    } else if (w.wins >= NEED) {
      if (w.defending) {
        FB.news(state, FB.msg('news.war.defensive_victory', {
          forms: {
            select: 'value', param: 'named', cases: {
              yes: '🕊 {enemy} sues for peace. Your lands are safe.',
              other: '🕊 The enemy sues for peace. Your lands are safe.'
            }
          }
        }, { named: enemy ? 'yes' : 'other', enemy: enemy ? enemy.name : '' }));
        p.prestige += 25;
        FB.endPlayerWar(state);
      } else {
        // the beaten defender sues for peace — but the choice is the
        // player's: tribute now, or press on for the prize. One offer waits
        // at a time; a stale one is dropped when the queue is drawn
        // (pickDailyEvents). Once declined (war_press_on), the envoys do
        // not return for the rest of this war.
        let queued = false;
        for (const q of state.eventQueue) {
          if (q.id === 'war_tribute_offer') { queued = true; break; }
        }
        if (!queued && !w.tributeDeclined) {
          FB.queueEvent(state, 'war_tribute_offer', {});
        }
      }
    }
    FB.maybeOfferSubmission(state);
  };

  /* ---- war-council handlers (called by event effects {custom:'war_*'}).
     Battle bonuses (led days, harrying, rest, mercenaries, mass levy) are
     read by the 'war_battle' named chance and spent when a battle is fought. */
  FB.fns = FB.fns || {};
  function afterBattle(w) { w.led = 0; w.harried = 0; w.rested = 0; }
  function warEffectSource(ev, fallback) {
    return ev && ev.id ? ev.id : fallback;
  }
  function abstractBattleRecord(state, outcome) {
    const host = FB.playerHost ? FB.playerHost(state) : null;
    return {
      turn:state.turn, outcome:outcome, mode:'abstract', pid:host && host.at,
      playerBefore:host ? host.men : 0, playerAfter:host ? host.men : 0,
      enemyBefore:0, enemyAfter:0
    };
  }
  FB.fns.war_win = function (state, ctx, ev) {
    const w = state.player.war; if (!w) return;
    w.wins++; afterBattle(w);
    const battle = ctx && ctx.battleRecord || abstractBattleRecord(state, 'win');
    if (FB.recordPlayerBattle) FB.recordPlayerBattle(state, battle);
    if (FB.adjustWarStrength) {
      FB.adjustWarStrength(state, -0.05, {
        source:warEffectSource(ev, battle.mode === 'field' ? 'field_battle' : 'war_council'),
        condition:'battle', troopLosses:battle.playerLosses
      });
    } else {
      w.strength = Math.max(0.5, (w.strength || 1) - 0.05);
    }
    if (w.defending && w.enemySiege) w.enemySiege = Math.max(0, w.enemySiege - 1);
    FB.news(state, FB.msg('news.war.field_victory',
      '⚔ Victory in the field! ({wins}/{needed})',
      { wins: w.wins, needed: FBDATA.balance.warWinsToTakeProvince }));
    if (FB.chance(0.3)) FB.lootItem(state, null, 'spoils');
    FB.warOutcome(state);
  };
  FB.fns.war_loss = function (state, ctx, ev) {
    const w = state.player.war; if (!w) return;
    w.losses++; afterBattle(w);
    const battle = ctx && ctx.battleRecord || abstractBattleRecord(state, 'loss');
    if (FB.recordPlayerBattle) FB.recordPlayerBattle(state, battle);
    w.lastDefeatTurn = state.turn;
    if (FB.adjustWarStrength) {
      FB.adjustWarStrength(state, -0.2, {
        source:warEffectSource(ev, battle.mode === 'field' ? 'field_battle' : 'war_council'),
        condition:'battle', troopLosses:battle.playerLosses
      });
    } else {
      w.strength = Math.max(0.5, (w.strength || 1) - 0.2);
    }
    FB.news(state, FB.msg('news.war.field_defeat', {
      forms: {
        select: 'plural', param: 'losses', cases: {
          one: '⚔ The host is bested… ({losses} defeat)',
          other: '⚔ The host is bested… ({losses} defeats)'
        }
      }
    }, { losses: w.losses }));
    FB.warOutcome(state);
    FB.maybeCapturePlayer(state);
  };
  FB.fns.war_harry = function (state) {
    const w = state.player.war; if (!w) return;
    w.harried = Math.min(2, (w.harried || 0) + 1);
    if (FB.chance(0.15)) FB.lootItem(state, null, 'raid');
  };
  FB.fns.war_hold = function (state, ctx, ev) {
    const w = state.player.war; if (!w) return;
    w.rested = 1;
    if (FB.adjustWarStrength) {
      FB.adjustWarStrength(state, 0.15, {
        source:warEffectSource(ev, 'war_hold'), condition:'supply'
      });
    } else {
      w.strength = Math.min(1.1, (w.strength || 1) + 0.15);
    }
    if (w.enemySiege) {
      w.enemySiege = Math.max(0, w.enemySiege - 1); // borders relieved
      if (!w.enemySiege) {
        w.enemyTarget = null;
        delete w.enemySiegeFortLevel;
      }
    }
  };
  /* press the siege of the war's target (attacking wars only): your host
     must stand in the target province to keep the works going */
  FB.fns.war_can_siege = function (state) {
    const w = state.player.war;
    if (!(w && !w.defending && w.target && state.owner[w.target] === w.enemy)) return false;
    const status = FB.playerSiegeStatus ? FB.playerSiegeStatus(state) : null;
    return !!status && status.canProgress && !status.contested;
  };
  FB.playerSiegeStatus = function (state) {
    const w = state.player.war;
    const host = w && FB.playerHost ? FB.playerHost(state) : null;
    if (!w || w.defending || !w.target || !host || host.at !== w.target) return null;
    const here = FB.armiesAt ? FB.armiesAt(state, w.target) : [host];
    const besiegers = [], contested = here.some(function (army) {
      if (army === host || !FB.armiesHostile) return false;
      if (FB.armiesHostile(state, host, army)) return true;
      if (army.realm === host.realm ||
          (FB.areAllied && FB.areAllied(state, host.realm, army.realm))) {
        besiegers.push(army);
      }
      return false;
    });
    besiegers.unshift(host);
    const status = FB.fortSiegeStatus(state, w.target, {
      fortLevel:w.siegeFortLevel, progress:w.siege || 0
    }, besiegers);
    status.hosts = besiegers;
    status.contested = contested;
    status.canProgress = status.canProgress && !contested;
    return status;
  };
  FB.fns.war_siege = function (state) {
    const w = state.player.war;
    const preview = w && FB.playerSiegeStatus(state);
    if (!w || !preview || !preview.canProgress) return;
    const tname = FB.world.byId[w.target].name;
    let status = FB.advanceFortSiegePulse(state, w.target, w, {
      progressKey:'siege', levelKey:'siegeFortLevel', hosts:preview.hosts,
      contested:preview.contested, playerCampaign:true,
      progressAmount:1 + FB.techBonus(state, 'siege') * 3
    });
    /* Unfortified places retain the old uncertain sortie. Fortified pulses
       already pay their exact garrison attrition instead. */
    if (!status.level && FB.chance(0.4)) {
      if (FB.chance(FB.namedChance(state, 'war_battle'))) {
        FB.news(state, FB.msg('news.war.sortie_repelled',
          '⚔ A sortie from {target} is thrown back. The siege holds.', { target: tname }));
      } else {
        w.siege = Math.max(0, w.siege - 1);
        if (FB.adjustWarStrength) {
          FB.adjustWarStrength(state, -0.1, {
            source:'war_siege_sortie', condition:'thin_ranks'
          });
        } else {
          w.strength = Math.max(0.5, (w.strength || 1) - 0.1);
        }
        state.player.gold = Math.max(0, state.player.gold - 2);
        FB.news(state, FB.msg('news.war.sortie_succeeds',
          '⚔ A night sortie burns your siege-works — the ring is set back.', {}));
        return;
      }
    }
    status = FB.fortSiegeStatus(state, w.target, {
      fortLevel:w.siegeFortLevel, progress:w.siege || 0
    }, preview.hosts);
    if (status.breached) {
      FB.news(state, FB.msg('news.war.walls_breached',
        '🏰 The walls of {target} are breached!', { target: tname }));
      FB.warCapture(state);
    } else {
      FB.news(state, FB.msg('news.war.siege_tightens',
        '⚔ The siege of {target} tightens. ({progress}/{required})',
        { target: tname, progress: w.siege, required:status.required }));
    }
  };
  FB.fns.war_mercs = function (state) {
    const w = state.player.war; if (!w) return;
    const cs = FBDATA.balance.mercCompanySize || 150;
    w.mercCos = (w.mercCos || 0) + 1;
    const host = FB.playerHost ? FB.playerHost(state) : null;
    if (host) {
      FB.hostUnits(host); // migrates hosts from before composition
      host.units.mercs += cs;
      host.men += cs;
      host.size = (host.size === undefined ? host.men : host.size + cs); // the company swells the muster
      if (FB.map) FB.map.request();
    }
    FB.news(state, FB.msg('news.war.mercenaries_join',
      '⚔ A mercenary company takes your coin — ~{men} spears join the host.', { men: cs }));
  };
  /* mustering: the host takes the field at your seat (js/armies.js) */
  FB.fns.war_raise = function (state) {
    if (FB.raisePlayerHost) FB.raisePlayerHost(state);
  };
  FB.fns.war_mass = function (state) {
    const w = state.player.war; if (!w) return;
    w.mass = 1;
    const host = FB.playerHost ? FB.playerHost(state) : null;
    if (host) { // already mustered: swell the levy now (the professionals stay as they are)
      const mult = FBDATA.balance.massLevyMult || 1.35;
      FB.hostUnits(host);
      const add = Math.round(host.units.levy * (mult - 1));
      host.units.levy += add;
      host.men += add;
      host.size = host.size === undefined ? host.men : host.size + add;
      if (FB.map) FB.map.request();
    } else if (FB.raisePlayerHost) FB.raisePlayerHost(state); // applies the great levy itself
  };
  /* the council's abstract pitched battle exists only while the enemy has
     no host in the field — a fielded enemy is fought on the map instead */
  FB.fns.war_no_enemy_host = function (state) {
    const w = state.player.war;
    if (!w) return false;
    return !(FB.hostOf && FB.hostOf(state, w.enemy));
  };
  FB.fns.war_can_hunt = function (state) {
    const w = state.player.war;
    return !!(w && FB.playerHost && FB.playerHost(state) && FB.hostOf && FB.hostOf(state, w.enemy));
  };
  FB.fns.war_hunt = function (state) {
    const w = state.player.war; if (!w) return;
    const host = FB.playerHost && FB.playerHost(state);
    const prey = FB.hostOf && FB.hostOf(state, w.enemy);
    if (!host || !prey) return;
    const ename = state.realms[w.enemy] ? state.realms[w.enemy].name : '';
    if (FB.orderArmy(state, host, prey.at)) {
      host.huntPrey = w.enemy; // track the prey: re-path onto it each day
      FB.news(state, FB.msg('news.war.hunt_enemy', {
        forms: {
          select: 'value', param: 'named', cases: {
            yes: '🚩 The host marches to bring {enemy} to battle.',
            other: '🚩 The host marches to bring the enemy to battle.'
          }
        }
      }, { named: ename ? 'yes' : 'other', enemy: ename }));
    } else {
      FB.news(state, FB.msg('news.war.no_road_to_enemy', {
        forms: {
          select: 'value', param: 'named', cases: {
            yes: '🚩 There is no road from here to the host of {enemy}.',
            other: '🚩 There is no road from here to the enemy host.'
          }
        }
      }, { named: ename ? 'yes' : 'other', enemy: ename }));
    }
  };
  /* small condition shifts for wartime flavor events */
  FB.fns.war_supply = function (state, ctx, ev) {
    const w = state.player.war; if (!w) return;
    if (FB.adjustWarStrength) {
      FB.adjustWarStrength(state, 0.1, {
        source:warEffectSource(ev, 'war_supply'), condition:'supply'
      });
    } else {
      w.strength = Math.min(1.1, (w.strength || 1) + 0.1);
    }
  };
  FB.fns.war_thin = function (state, ctx, ev) {
    const w = state.player.war; if (!w) return;
    if (FB.adjustWarStrength) {
      FB.adjustWarStrength(state, -0.1, {
        source:warEffectSource(ev, 'war_thin'), condition:'thin_ranks'
      });
    } else {
      w.strength = Math.max(0.5, (w.strength || 1) - 0.1);
    }
  };
  FB.fns.war_live_host = function (state) {
    const host = FB.playerHost ? FB.playerHost(state) : null;
    return !!(state.player.war && host && host.men > 0);
  };
  FB.fns.war_host_under_pressure = function (state) {
    const w = state.player.war;
    return FB.fns.war_live_host(state) &&
      ((w.strength || 1) < 0.95 || (w.losses || 0) > 0);
  };
  FB.fns.war_deserters_due = function (state) {
    return !!(FB.warDeserterStatus && FB.warDeserterStatus(state).eligible);
  };
  FB.fns.war_can_pay_deserters = function (state) {
    return !!(FB.warDeserterPayment &&
      state.player.gold >= FB.warDeserterPayment(state));
  };
  function markDeserterInterval(state) {
    const w = state.player.war;
    if (w) w.lastDeserterTurn = state.turn;
  }
  FB.fns.war_discipline_deserters = function (state, ctx, ev) {
    if (!state.player.war) return;
    markDeserterInterval(state);
    if (FB.adjustWarStrength) {
      FB.adjustWarStrength(state, 0.04, {
        source:warEffectSource(ev, 'war_deserters'), condition:'discipline'
      });
    }
  };
  FB.fns.war_pay_deserters = function (state, ctx, ev) {
    if (!state.player.war || !FB.warDeserterPayment) return;
    const payment = FB.warDeserterPayment(state);
    if (state.player.gold < payment) return;
    state.player.gold -= payment;
    markDeserterInterval(state);
    if (FB.adjustWarStrength) {
      FB.adjustWarStrength(state, 0.08, {
        source:warEffectSource(ev, 'war_deserters'), condition:'supply'
      });
    }
    FB.news(state, FB.msg('news.war.deserters_paid',
      '💰 {money:amount} clears the host’s arrears; the wavering ranks steady.', {
        amount:payment
      }));
  };
  FB.fns.war_desert = function (state, ctx, ev) {
    const w = state.player.war;
    const host = FB.playerHost ? FB.playerHost(state) : null;
    if (!w || !host || !FB.playerWarHostLoss) return;
    const min = FBDATA.balance.warDeserterLossMin === undefined
      ? 0.10 : FBDATA.balance.warDeserterLossMin;
    const max = FBDATA.balance.warDeserterLossMax === undefined
      ? 0.18 : FBDATA.balance.warDeserterLossMax;
    const rate = FB.rf(Math.min(min, max), Math.max(min, max));
    const lost = Math.max(1, Math.round(host.men * rate));
    markDeserterInterval(state);
    const losses = FB.playerWarHostLoss(state, lost, {
      source:warEffectSource(ev, 'war_deserters'),
      condition:'desertion', rate:rate
    });
    FB.news(state, FB.msg('news.war.deserters_leave',
      '🏳 {men} soldiers leave the live host ({percent}% of those who stood in the morning).', {
        men:losses ? losses.total : 0,
        percent:Math.round(rate * 100)
      }));
  };
  FB.fns.war_discipline = function (state, ctx, ev) {
    if (!state.player.war || !FB.adjustWarStrength) return;
    FB.adjustWarStrength(state, 0.06, {
      source:warEffectSource(ev, 'war_discipline'), condition:'discipline'
    });
  };
  FB.fns.war_disorder = function (state, ctx, ev) {
    if (!state.player.war || !FB.adjustWarStrength) return;
    FB.adjustWarStrength(state, -0.08, {
      source:warEffectSource(ev, 'war_disorder'), condition:'disorder'
    });
  };
  FB.fns.war_campaign_deep = function (state) {
    return !!(FB.fns.war_live_host(state) && state.player.war.seasons >= 2);
  };
  FB.fns.war_campaign_exhausted = function (state) {
    return !!(state.player.war && state.player.war.seasons >= 4);
  };
  FB.fns.war_objective_under_debate = function (state) {
    const w = state.player.war;
    return !!(w && !w.defending && w.target && w.seasons >= 2);
  };
  FB.fns.war_has_allied_host = function (state) {
    const w = state.player.war;
    const host = FB.playerHost ? FB.playerHost(state) : null;
    return !!(w && !w.alliedWithdrew && host && host.allied && host.allied.men > 0);
  };
  FB.fns.war_allied_withdrawal = function (state, ctx, ev) {
    const w = state.player.war;
    const host = FB.playerHost ? FB.playerHost(state) : null;
    if (!w || !host || !host.allied || !host.allied.men) return;
    const contribution = host.allied.men;
    const leaving = Math.min(contribution, host.men);
    const losses = FB.applyHostLosses ? FB.applyHostLosses(host, leaving) : null;
    if (losses && FB.notePlayerWarTroopLosses) {
      FB.notePlayerWarTroopLosses(state, losses);
    }
    host.size = Math.max(host.men, (host.size || host.men) - contribution);
    host.allied = null;
    w.alliedWithdrew = 1;
    if (FB.adjustWarStrength) {
      FB.adjustWarStrength(state, -0.06, {
        source:warEffectSource(ev, 'war_allied_withdrawal'),
        condition:'thin_ranks', troopLosses:losses
      });
    }
    if (host.men < (FBDATA.balance.armyMinMen || 40) && FB.disbandArmy) {
      state.armyDown.player = state.turn;
      FB.disbandArmy(state, host);
    }
    if (FB.map) FB.map.request();
  };
  FB.fns.war_host_abroad = function (state) {
    const w = state.player.war;
    const host = FB.playerHost ? FB.playerHost(state) : null;
    return !!(w && host && host.at && state.owner[host.at] === w.enemy);
  };
  FB.fns.war_enemy_offer_possible = function (state) {
    const w = state.player.war;
    return !!(w && w.seasons >= 2 &&
      (w.wins || 0) + (w.losses || 0) > 0);
  };
  FB.fns.war_active_occupation = function (state) {
    const w = state.player.war;
    return !!(w && !w.defending && w.target && (w.siege || 0) > 0);
  };
  FB.fns.war_negotiation_possible = function (state) {
    const w = state.player.war;
    return !!(w && w.seasons >= 3 &&
      ((w.losses || 0) > (w.wins || 0) || (w.strength || 1) < 0.85));
  };
  FB.fns.war_negotiated_withdrawal = function (state) {
    const w = state.player.war;
    if (!w) return;
    state.player.prestige = Math.max(0, state.player.prestige - 4);
    FB.news(state, FB.msg('news.war.negotiated_withdrawal',
      '🕊 Safe conduct is agreed; the surviving host withdraws and the war ends.', {}));
    FB.endPlayerWar(state);
  };
  /* the beaten defender's gold, taken: ends the war with tribute instead of
     pressing on to the siege (the war_tribute_offer event's other choice) */
  FB.fns.war_accept_tribute = function (state) {
    const p = state.player;
    const w = p.war; if (!w) return;
    p.prestige += FB.warPrestigeReward(w, 'tribute');
    p.gold += 25;
    FB.news(state, FB.msg('news.war.tribute',
      '🕊 Bled white in the field, the enemy buys peace with tribute.', {}));
    FB.endPlayerWar(state);
  };
  /* tribute refused: remember it for the rest of THIS war, so the envoys
     do not ride back under their white flag after every further battle
     (warOutcome checks w.tributeDeclined). Prestige and the log line stay
     declarative on the war_tribute_offer option itself. */
  FB.fns.war_press_on = function (state) {
    const w = state.player.war; if (!w) return;
    w.tributeDeclined = 1;
  };
  FB.fns.war_terms = function (state) {
    const p = state.player;
    const w = p.war; if (!w) return;
    const enemy = state.realms[w.enemy];
    if (w.defending) {
      const cost = 15 + 5 * (w.losses || 0);
      p.gold = Math.max(0, p.gold - cost);
      p.prestige = Math.max(0, p.prestige - 10);
      FB.news(state, FB.msg('news.war.peace_bought', {
        forms: {
          select: 'value', param: 'named', cases: {
            yes: '🕊 Peace is bought from {enemy} for {money:cost}.',
            other: '🕊 Peace is bought from the enemy for {money:cost}.'
          }
        }
      }, { named: enemy ? 'yes' : 'other', enemy: enemy ? enemy.name : '', cost: cost }));
    } else {
      p.prestige = Math.max(0, p.prestige - 8);
      FB.news(state, FB.msg('news.war.abandoned',
        '🕊 The campaign is abandoned. The banners come home.', {}));
    }
    FB.endPlayerWar(state);
  };

  /* submission resolutions: the war_submission_offer event ends here. The
     queued offer is valid only while the same defensive war still runs. */
  FB.fns.war_submission_valid = function (state) {
    const w = state.player.war;
    const enemy = w && state.realms[w.enemy];
    return !!(w && w.defending && enemy && enemy.alive &&
      !(FB.fortGarrisonBurden &&
        FB.fortGarrisonBurden(state, 'player') > 0));
  };
  function submissionTributePrice(state) {
    const w = state.player.war;
    const enemy = w && state.realms[w.enemy];
    return (FBDATA.balance.submissionTributePerRank || 25) * ((enemy && enemy.rank) || 1);
  }
  FB.fns.war_submission_tribute_affordable = function (state) {
    return FB.fns.war_submission_valid(state) &&
      state.player.gold >= submissionTributePrice(state);
  };
  /* kneel: the war dies here, the land stays in hand, the banner changes.
     A crowned head that kneels fails the independence its style rests on —
     the title-lapse machinery (checkTierPromotions) takes it from there. */
  FB.fns.war_submit = function (state) {
    const p = state.player, w = p.war;
    if (!w || !FB.fns.war_submission_valid(state)) return;
    const enemy = state.realms[w.enemy]; if (!enemy || !enemy.alive) return;
    const rid = w.enemy;
    FB.endPlayerWar(state);
    FB.changePlayerLiege(state, rid, 'war:submission');
    if (!state.realms.player || !state.realms.player.alive) FB.foundPlayerRealm(state);
    state.realms.player.liege = rid;
    const newTop = FB.topRealm(state, rid);
    for (const pid of (p.provs || [])) { state.owner[pid] = newTop; state.holder[pid] = 'player'; }
    for (const pid of FB.realmTerritory(state, 'player')) state.owner[pid] = newTop;
    FB.invalidateRealmCache();
    if (FB.adjustStanding) FB.adjustStanding(state, { kind:'realm', id:rid }, 10, 'war:submission');
    p.prestige = Math.max(0, p.prestige - 15);
    FB.news(state, FB.msg('news.war.submission',
      '🛡 You kneel to {enemy} and swear the oaths. The war is over; your lands remain — under a new banner.',
      { enemy: enemy.name }));
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
    FB.checkTierPromotions(state);
  };
  FB.fns.war_submission_tribute = function (state) {
    const p = state.player, w = p.war; if (!w) return;
    const enemy = state.realms[w.enemy];
    const price = submissionTributePrice(state);
    p.gold = Math.max(0, p.gold - price);
    FB.news(state, FB.msg('news.war.submission_tribute',
      '🕊 A conqueror’s tribute buys the peace — {money:price} to {enemy}.',
      { price: price, enemy: enemy ? enemy.name : '' }));
    FB.endPlayerWar(state);
  };

  /* downfall resolutions: the df_* event chains end here */
  FB.fns.df_fall = function (state) { FB.loseAllLand(state, {}); };
  FB.fns.df_fall_flee = function (state) { FB.loseAllLand(state, { flee: true }); };

  /* attainder resolutions (docs/designs/descent.md): the felony chains end
     here — mercy bought, the fief yielded, or the judgment denied by arms */
  FB.fns.attainder_risk = function (state) {
    const p = state.player;
    if (!p.liege || !state.realms[p.liege] || !state.realms[p.liege].alive) return false;
    return FB.standingOf(state, { kind:'realm', id:p.liege }) <=
      (FBDATA.balance.attainderStandingGate === undefined ? -30 : FBDATA.balance.attainderStandingGate);
  };
  function attainderFine(state) {
    const table = FBDATA.balance.attainderFineByTier || [];
    return table[state.player.tier] || 20;
  }
  FB.fns.attainder_can_pay = function (state) {
    return state.player.gold >= attainderFine(state);
  };
  FB.fns.attainder_pay = function (state) {
    const p = state.player;
    p.gold = Math.max(0, p.gold - attainderFine(state));
    delete p.flags.felony_mark;
    delete p.flags.felony_doom;
    if (FB.adjustStanding) FB.adjustStanding(state, { kind:'realm', id:p.liege }, 15, 'event:attainder_pay');
    FB.news(state, FB.msg('news.world.attainder_paid',
      '⚖ The fine is paid, the oaths renewed. The matter is buried.', {}));
  };
  FB.fns.attainder_yield = function (state) {
    const p = state.player;
    delete p.flags.felony_mark;
    delete p.flags.felony_doom;
    /* a vassal's fiefs escheat to his liege, a baron simply loses his place —
       loseAllLand's vassal branch is exactly the sentence of forfeiture */
    FB.loseAllLand(state, {});
  };
  FB.fns.attainder_resist = function (state) {
    const p = state.player;
    const oldTop = p.liege ? FB.topRealm(state, p.liege) : null;
    delete p.flags.felony_mark;
    delete p.flags.felony_doom;
    if (!oldTop || !state.realms[oldTop] || !state.realms[oldTop].alive || p.war) return;
    if (p.tier === 3 && (!p.provs || !p.provs.length)) {
      // a baron holds his tower against the lord: the home county is the stake
      p.provs = [p.provinceId];
      FB.setPlayerTier(state, 4, { attachLiege:false });
      FB.transferProvince(state, p.provinceId, 'player');
    }
    FB.changePlayerLiege(state, null, 'realm:attainder_resist');
    if (state.realms.player) state.realms.player.liege = null;
    FB.foundPlayerRealm(state);
    p.war = { enemy: oldTop, target: null, wins: 0, losses: 0, seasons: 0,
      defending: true, casus: { type: 'independence' } };
    FB.news(state, FB.msg('news.world.attainder_resist',
      '⚔ You deny the judgment and raise your banner — felony is answered with rebellion.', {}));
    FB.warFooting(state);
    FB.queueEvent(state, 'war_defense_muster', {});
    FB.checkTierPromotions(state);
    if (FB.invalidateGuildMonopolies) FB.invalidateGuildMonopolies(state);
  };

  FB.foundPlayerRealm = function (state) {
    const me = state.chars[state.player.charId];
    const p = state.player;
    const k = FB.playerKingdom(state), e = FB.playerEmpire(state);
    const nm = e ? 'Empire of ' + FBDATA.empires[e].name
             : k ? 'Kingdom of ' + FBDATA.kingdoms[k].name
             : 'Realm of ' + (me.dyn || me.name);
    const old = state.realms.player;
    const generation = old && old.ruler && old.ruler.generation !== undefined
      ? old.ruler.generation : 1;
    const r = old || { id: 'player', color: '#f0c840', aggression: 0, war: null, op: 0 };
    r.name = nm;
    r.capital = (p.provs && p.provs[0]) || p.provinceId;
    r.religion = me.religion;
    r.alive = true;
    r.rank = Math.max(1, p.tier - 3);
    r.liege = p.liege || null;
    r.ruler = {
      name: me.name, sex: me.sex, culture: me.culture,
      age: FB.ageOf(me, state.date.year), mar: realmMartial(state, me),
      generation: generation
    };
    const playerHeirs = FB.heirsOf ? FB.heirsOf(state) : [];
    r.succession = r.succession || { playerDynasty: true };
    r.succession.playerDynasty = true;
    r.succession.rulerGeneration = generation;
    r.succession.heirCharId = playerHeirs.length ? playerHeirs[0].id : null;
    state.realms.player = r;
    const sovereign = r.liege ? FB.topRealm(state, r.liege) : 'player';
    for (const pid of (p.provs || [])) {
      state.owner[pid] = sovereign;
      state.holder[pid] = 'player';
    }
    FB.invalidateRealmCache();
    for (const pid of FB.realmTerritory(state, 'player')) state.owner[pid] = sovereign;
    FB.invalidateRealmCache();
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
  };

  /* A count-or-higher protagonist may voluntarily leave an intact realm to
     the current lawful heir. Re-key the special player node into an ordinary
     AI realm in place: no realm dies, so offices, technology, vassals, and
     ownership survive without vacancy, usurpation, or restoration effects. */
  FB.abdicatePlayerRealmToHeir = function (state, heir) {
    const p = state && state.player;
    const realm = state && state.realms && state.realms.player;
    if (!p || !realm || !realm.alive || !heir || heir.dead ||
        !p.provs || !p.provs.length ||
        FB.isReigningRealmRuler(state, heir)) return null;

    let rid = 'abdicated_player_' + state.turn;
    let suffix = 2;
    while (state.realms[rid]) rid = 'abdicated_player_' + state.turn + '_' + suffix++;
    if (FB.breakAlliance) FB.breakAlliance(state, 'player');
    if (FB.ensureReligiousHeads) FB.ensureReligiousHeads(state);

    const generation = realm.ruler && realm.ruler.generation !== undefined
      ? realm.ruler.generation + 1 : 2;
    realm.id = rid;
    realm.ruler = {
      name:heir.name,
      sex:heir.sex,
      culture:heir.culture,
      born:heir.born,
      age:FB.ageOf(heir, state.date.year),
      mar:realmMartial(state, heir),
      trait:heir.traits && heir.traits.length ? heir.traits[0] : null,
      generation:generation
    };
    heir.role = null;

    const rootId = 'royal_' + rid + '_' + heir.id;
    const root = {
      id:rootId,
      name:heir.name,
      sex:heir.sex,
      born:heir.born,
      alive:true,
      parentId:null,
      childIds:[],
      charId:heir.id,
      role:null
    };
    const succession = {
      rulerGeneration:generation,
      rulerMemberId:rootId,
      members:{},
      order:[],
      heirId:null
    };
    succession.members[rootId] = root;
    const children = FB.childrenOf ? FB.childrenOf(state, heir).filter(function (c) {
      return c && !c.dead;
    }) : [];
    children.sort(function (a, b) {
      if (a.sex !== b.sex) return a.sex === 'm' ? -1 : 1;
      return a.born - b.born;
    });
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const memberId = 'royal_' + rid + '_' + child.id;
      succession.members[memberId] = {
        id:memberId,
        name:child.name,
        sex:child.sex,
        born:child.born,
        alive:true,
        parentId:rootId,
        childIds:[],
        charId:child.id,
        role:null
      };
      root.childIds.push(memberId);
      succession.order.push(memberId);
      if (!child.royalLine) {
        child.royalLine = { realmId:rid, memberId:memberId };
      }
    }
    succession.heirId = succession.order.length ? succession.order[0] : null;
    realm.succession = succession;
    if (!heir.royalLine) heir.royalLine = { realmId:rid, memberId:rootId };

    state.realms[rid] = realm;
    for (const pid in state.owner) {
      if (state.owner[pid] === 'player') state.owner[pid] = rid;
      if (state.holder && state.holder[pid] === 'player') state.holder[pid] = rid;
    }
    for (const otherId in state.realms) {
      const other = state.realms[otherId];
      if (!other || otherId === 'player') continue;
      if (other.liege === 'player') other.liege = rid;
      if (other.war && other.war.enemy === 'player') other.war.enemy = rid;
    }
    for (const officeId in (state.religiousHeads || {})) {
      if (state.religiousHeads[officeId] === 'player') {
        state.religiousHeads[officeId] = rid;
      }
    }
    if (state.realmTech &&
        Object.prototype.hasOwnProperty.call(state.realmTech, 'player')) {
      state.realmTech[rid] = state.realmTech.player;
      delete state.realmTech.player;
    }
    if (Array.isArray(state.armies)) {
      for (const army of state.armies) {
        if (army.realm === 'player') army.realm = rid;
      }
    }
    if (state.armyDown &&
        Object.prototype.hasOwnProperty.call(state.armyDown, 'player')) {
      state.armyDown[rid] = state.armyDown.player;
      delete state.armyDown.player;
    }
    delete state.realms.player;

    /* The realm has been re-keyed under a new id with a new ruler root,
       so rebuild the derived index rather than patch it - and only once
       state.realms holds the final shape, or the rebuild misses the very
       ruler it exists to record. */
    FB.rebuildRulerIndex(state);
    FB.ensureRealmSuccession(state, rid);
    FB.invalidateRealmCache();
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
    return realm;
  };

  /* Join an inherited realm to the protagonist's landed realm. The inherited
     title's demesne comes into hand, its vassals reattach intact, and outgoing
     wars end in white peace. Sovereign inheritance makes the joined realm
     sovereign; a vassal inheritance preserves the inherited liege. */
  FB.absorbRealm = function (state, rid, rulerChar) {
    const inherited = state.realms[rid];
    if (!inherited || !inherited.alive || rid === 'player') return false;
    const p = state.player;
    const sovereignTitle = !inherited.liege;
    const inheritedLiege = inherited.liege || null;
    if (!state.realms.player || !state.realms.player.alive) FB.foundPlayerRealm(state);
    const mine = state.realms.player;
    if (sovereignTitle) {
      FB.changePlayerLiege(state, null, 'realm:inherit_sovereign');
    } else if (mine.rank < inherited.rank || !mine.liege) {
      FB.changePlayerLiege(state, inheritedLiege, 'realm:inherit_vassal');
    }
    const demesne = FB.realmHeldCounties(state, rid).slice();
    p.provs = p.provs || [];
    for (const pid of demesne) {
      if (p.provs.indexOf(pid) < 0) p.provs.push(pid);
      state.holder[pid] = 'player';
    }
    for (const vid in state.realms) {
      if (vid !== 'player' && state.realms[vid].liege === rid) state.realms[vid].liege = 'player';
    }
    if (FB.mergeRealmTech) FB.mergeRealmTech(state, 'player', rid);
    inherited.war = null;
    for (const otherId in state.realms) {
      const other = state.realms[otherId];
      if (other && other.war && other.war.enemy === rid) other.war = null;
    }
    FB.markRealmDead(state, rid);
    /* The realm's temporal inheritance is separate from any religious office:
       markRealmDead leaves the latter explicitly vacant for recovery. */
    FB.breakAlliance(state, rid);
    const oldRank = mine.rank || Math.max(1, p.tier - 3);
    mine.rank = Math.max(oldRank, inherited.rank || 1);
    FB.setPlayerTier(state, Math.max(p.tier, mine.rank + 3), { attachLiege:false });
    if ((inherited.rank || 0) >= oldRank) {
      mine.name = inherited.name;
      mine.color = inherited.color || mine.color;
      mine.capital = inherited.capital || mine.capital;
    }
    mine.ruler = {
      name: rulerChar ? rulerChar.name : state.chars[p.charId].name,
      sex: rulerChar ? rulerChar.sex : state.chars[p.charId].sex,
      culture: rulerChar ? rulerChar.culture : state.chars[p.charId].culture,
      age: FB.ageOf(rulerChar || state.chars[p.charId], state.date.year),
      mar: realmMartial(state, rulerChar || state.chars[p.charId]),
      generation: (mine.ruler && mine.ruler.generation !== undefined ? mine.ruler.generation : 1)
    };
    mine.religion = (rulerChar || state.chars[p.charId]).religion || mine.religion;
    const top = mine.liege ? FB.topRealm(state, mine.liege) : 'player';
    for (const pid in state.owner) {
      const h = state.holder && state.holder[pid];
      if (h === 'player' || (h && underPlayer(state, h))) state.owner[pid] = top;
      else if (sovereignTitle && state.owner[pid] === rid) state.owner[pid] = 'player';
    }
    FB.invalidateRealmCache();
    FB.checkTierPromotions(state);
    if (FB.councilEnsure && p.tier >= 6) FB.councilEnsure(state);
    if (FB.ui && FB.ui.mapDirty) FB.ui.mapDirty();
    FB.news(state, FB.msg('news.world.realm_inherited',
      '👑 {realm} joins your rule by rightful succession.', { realm: inherited.name }));
    return true;
  };

  /* how many of the given counties the player personally holds */
  /* is a realm the player, or a vassal (at any depth) beneath the player? */
  function underPlayer(state, rid) {
    let cur = rid, guard = 0;
    while (cur && guard++ < 20) {
      if (cur === 'player') return true;
      const r = state.realms[cur];
      cur = r ? r.liege : null;
    }
    return false;
  }
  /* counties of a de jure title the player's REALM controls — held in his own
     hand OR by a vassal beneath him. Tier dignity reflects the whole bloc, so
     delegating land to vassals never costs progress toward a duchy/kingdom. */
  function playerShare(state, countyIds) {
    const prov = state.player.provs || [];
    let n = 0;
    for (const pid of countyIds) {
      if (prov.indexOf(pid) >= 0) { n++; continue; } // held directly
      const h = state.holder && state.holder[pid];
      if (h && h !== 'player' && underPlayer(state, h)) n++; // held by a vassal of the player
    }
    return n;
  }
  /* progress toward a de jure dignity: how many of its counties the player
     holds vs. what the title demands. One home for the promotion rules —
     checkTierPromotions and the map/panel readouts both speak these.
     A duchy must span 2+ counties and always demands at least 2 held; a
     kingdom the bare majority; an empire the majority of two of its kingdoms.
     Wastelands and colonies settled on them have no duchy, so they never
     appear in any of these counts. */
  FB.duchyProgress = function (state, did) {
    const cs = FB.duchyCounties(did);
    return { have: playerShare(state, cs), total: cs.length,
      need: Math.max(2, Math.ceil(cs.length / 2)), titled: cs.length >= 2 };
  };
  FB.kingdomProgress = function (state, kid) {
    const cs = FB.kingdomCounties(kid);
    return { have: playerShare(state, cs), total: cs.length, need: Math.ceil(cs.length / 2) };
  };
  FB.empireProgress = function (state, eid) {
    let have = 0, total = 0;
    for (const kid of FB.empireKingdoms(eid)) {
      const kp = FB.kingdomProgress(state, kid);
      if (!kp.total) continue;
      total++;
      if (kp.have >= kp.need) have++;
    }
    return { have: have, total: total, need: 2 };
  };
  /* all de jure duchies the player controls the majority of (min 2 counties) */
  FB.playerDuchies = function (state) {
    const out = [];
    for (const did in FBDATA.duchies) {
      const pr = FB.duchyProgress(state, did);
      if (pr.titled && pr.have >= pr.need) out.push(did);
    }
    return out;
  };
  /* all de jure kingdoms the player controls the majority of */
  FB.playerKingdoms = function (state) {
    const out = [];
    for (const kid in FBDATA.kingdoms) {
      const pr = FB.kingdomProgress(state, kid);
      if (pr.total && pr.have >= pr.need) out.push(kid);
    }
    return out;
  };
  /* all de jure empires where the player controls the majority of two kingdoms */
  FB.playerEmpires = function (state) {
    const out = [];
    for (const eid in FBDATA.empires) {
      if (FB.empireProgress(state, eid).have >= 2) out.push(eid);
    }
    return out;
  };
  FB.playerDuchy = function (state) { return FB.playerDuchies(state)[0] || null; };
  FB.playerKingdom = function (state) { return FB.playerKingdoms(state)[0] || null; };
  FB.playerEmpire = function (state) { return FB.playerEmpires(state)[0] || null; };

  /* every title the player holds, highest dignity first — for the Self tab.
     High titles carry a translatable dignity label plus locale-neutral title
     data; counties remain bare ids so the caller can render them compactly. */
  FB.playerTitles = function (state) {
    const p = state.player, out = [];
    const castellany = FB.castellanyOf && FB.castellanyOf(state);
    if (castellany) {
      const castleCounty = FB.world && FB.world.byId[castellany.provinceId];
      const castellanTitle = FB.rankTitleSnapshot(state, 3,
        castleCounty ? castleCounty.name : castellany.provinceId);
      castellanTitle.special = 'castellan';
      return { high:[{ d:'Appointed office', titleData:castellanTitle }],
        counties:[] };
    }
    const bishopric = FB.bishopricOf &&
      FB.bishopricOf(state, state.chars[p.charId]);
    let bishopEntry = null;
    if (bishopric) {
      const see = FB.world && FB.world.byId[bishopric.seeProvinceId];
      const bishopTitle = FB.rankTitleSnapshot(state, 3,
        see ? see.name : bishopric.seeProvinceId);
      bishopTitle.special = 'bishop';
      bishopEntry = { d:'Bishopric', titleData:bishopTitle };
    }
    if (p.tier === 3 && !bishopric) {
      const pr = FB.world && FB.world.byId[p.provinceId];
      out.push({
        d: 'Barony',
        titleData: FB.rankTitleSnapshot(state, 3, pr ? pr.name : '?')
      });
      return { high: out, counties: [] };
    }
    if (p.tier < 4) return {
      high:bishopEntry ? [bishopEntry] : out,
      counties:[]
    };
    /* list only styles actually held: a vassal can hold a dignity's substance
       without its style (a duke's man with a duchy majority stays a count) */
    if (p.tier >= 7) for (const eid of FB.playerEmpires(state)) {
      out.push({
        d: 'Empire',
        titleData: FB.rankTitleSnapshot(state, 7, FBDATA.empires[eid].name)
      });
    }
    if (p.tier >= 6) for (const kid of FB.playerKingdoms(state)) {
      out.push({
        d: 'Kingdom',
        titleData: FB.rankTitleSnapshot(state, 6, FBDATA.kingdoms[kid].name)
      });
    }
    if (p.tier >= 5) for (const did of FB.playerDuchies(state)) {
      out.push({
        d: 'Duchy',
        titleData: FB.rankTitleSnapshot(state, 5, FBDATA.duchies[did].name)
      });
    }
    if (bishopEntry) out.push(bishopEntry);
    return { high: out, counties: (p.provs || []).slice() };
  };

  FB.checkTierPromotions = function (state) {
    const p = state.player;
    // no one is his own vassal — repair saves where a flight into the
    // player's own demesne left p.liege pointing at the player's realm
    if (p.liege === 'player') {
      FB.changePlayerLiege(state, null, 'realm:repair_self_liege');
    }
    // a baron or personal Bishop is a status inside a county and answers to
    // whoever holds the home county. Reattach if the bond was lost (the
    // lord's house died, or
    // an older save) or went stale — the county changed hands under a living
    // lord, leaving the office sworn to a lord who no longer holds its home.
    // A tier-3 office is never "independent", nor a foreign lord's man.
    if (p.tier === 3) {
      const bh = (state.holder && state.holder[p.provinceId]) || state.owner[p.provinceId];
      if (bh && bh !== 'player' && state.realms[bh] &&
          state.realms[bh].alive && p.liege !== bh) {
        FB.changePlayerLiege(state, bh, 'realm:repair_home_liege');
      }
    }
    const n = p.provs ? p.provs.length : 0;
    if (n && p.tier >= 4 && (!state.realms.player || !state.realms.player.alive)) FB.foundPlayerRealm(state);
    if (state.realms.player && state.realms.player.alive) {
      state.realms.player.liege = p.liege || null;
    }
    const indep = FB.isPlayerSovereign(state);
    // a liege must outrank his man (a count answers to a duke, a duke to a
    // king): older grants could leave the player kneeling to a mere peer —
    // walk up the chain to the first lord of truly higher rank
    if (p.tier >= 4) {
      const pRank = Math.max(1, p.tier - 3);
      let guard = 0;
      let liege = p.liege;
      while (liege && state.realms[liege] &&
             state.realms[liege].rank <= pRank &&
             state.realms[liege].liege && guard++ < 10) {
        liege = state.realms[liege].liege;
      }
      if (liege !== p.liege) {
        FB.changePlayerLiege(state, liege, 'realm:repair_liege_rank');
      }
    }
    if (state.realms.player && state.realms.player.alive) {
      state.realms.player.liege = p.liege || null;
    }
    if (FB.invalidateGuildMonopolies) FB.invalidateGuildMonopolies(state);
    if (!n) return; // landless: playerShare is 0 everywhere, nothing can promote
    /* Only the crown can make a duke: a sworn vassal whose living liege is
       not at least a king keeps the land but waits for the style — the duchy
       stays a claim until he answers to a king, an emperor, or no one. */
    const duchyBlocked = !!(p.liege && state.realms[p.liege] &&
      state.realms[p.liege].alive && state.realms[p.liege].rank < 3);
    let newTier = p.tier;
    if (p.tier < 4) newTier = 4;
    if (FB.playerDuchy(state) && p.tier < 5 && !duchyBlocked) newTier = 5;
    if (indep && FB.playerKingdom(state) && p.tier < 6) newTier = 6;
    if (indep && FB.playerEmpire(state) && p.tier < 7) newTier = 7;
    if (newTier > p.tier) {
      FB.setPlayerTier(state, newTier, { attachLiege:false });
      const titleData = FB.titleSnapshot(state);
      FB.news(state, FB.msg('news.world.promoted',
        '👑 You are raised to {title}!', { title: { $title: titleData } }));
      if (state.peakTier === undefined || newTier > state.peakTier) {
        state.peakTier = newTier;
        state.peakTitleData = titleData;
      }
      p.prestige += 30 * newTier;
      FB.foundPlayerRealm(state); // restyle the landed realm at its new dignity
      if (newTier >= 6 && FB.councilEnsure) FB.councilEnsure(state); // the great officers gather
    }
    /* the claim, spoken aloud once per generation: the substance of a duchy
       without the style, while a mere duke sits above him */
    if (duchyBlocked && p.tier === 4 && !(p.flags && p.flags.duchy_claim_hint)) {
      const claimDid = FB.playerDuchy(state);
      if (claimDid) {
        p.flags = p.flags || {};
        p.flags.duchy_claim_hint = 1;
        FB.news(state, FB.msg('news.world.duchy_claim',
          '🏰 You hold the substance of {duchy}, but only the crown may style you duke.',
          { duchy: FBDATA.duchies[claimDid].name }));
      }
    }
    /* ---- the hollow crown: a dignity above count rests on substance ------
       A duke without his duchy's majority, a king without his kingdom's (or
       his independence), an emperor likewise: chanceries keep styling him
       for a while, then stop. Below the requirement we stamp a lapse; after
       titleLapseWarnDays a warning event (with escapes); after
       titleLapseDemoteDays the style falls ONE rung. Substance restored at
       any point clears the slide. Lower falls have their own paths
       (war, attainder, debt) — see docs/designs/descent.md. */
    if (p.tier >= 5) {
      const B = FBDATA.balance;
      let holds = true;
      if (p.tier === 7) holds = !!(indep && FB.playerEmpire(state));
      else if (p.tier === 6) holds = !!(indep && FB.playerKingdom(state));
      /* a duke kneeling to a mere duke keeps the land but not the style */
      else holds = !!FB.playerDuchy(state) && !duchyBlocked;
      if (holds) {
        if (p.titleLapse) delete p.titleLapse;
      } else {
        if (!p.titleLapse || p.titleLapse.tier !== p.tier) {
          p.titleLapse = { tier: p.tier, since: state.turn };
        } else {
          const lapsedDays = state.turn - p.titleLapse.since;
          if (lapsedDays >= (B.titleLapseDemoteDays || 540)) {
            const oldTitle = FB.titleSnapshot(state);
            const fallenTo = p.tier - 1;
            delete p.titleLapse;
            FB.setPlayerTier(state, fallenTo, { attachLiege:false });
            p.prestige = Math.max(0, p.prestige - (B.titleLapsePrestigeCost || 40));
            /* vassals of equal or greater rank cannot kneel to a peer:
               reattach them to the player's own liege, or loose them
               independent when the player bows to no one */
            const newRank = Math.max(1, fallenTo - 3);
            for (const vid of FB.playerVassals(state)) {
              const v = state.realms[vid];
              if (!v || !v.alive || v.rank < newRank) continue;
              v.liege = p.liege || null;
              FB.news(state, FB.msg('news.world.vassal_loosed',
                '🕊 {realm} no longer kneels to a house of equal dignity.',
                { realm: v.name }));
            }
            FB.foundPlayerRealm(state); // restyle at the lower dignity
            FB.news(state, FB.msg('news.world.title_lapsed',
              '⬇ The style of {title} rings hollow — the world now names you one rung lower.',
              { title: { $title: oldTitle } }));
            FB.invalidateRealmCache();
          } else if (lapsedDays >= (B.titleLapseWarnDays || 180) && !p.titleLapse.warned) {
            p.titleLapse.warned = 1;
            FB.queueEvent(state, 'hc_hollow_crown', {});
          }
        }
      }
    } else if (p.titleLapse) {
      delete p.titleLapse;
    }
    if (FB.syncPlayerCareer) FB.syncPlayerCareer(state);
  };

  /* the hollow crown's escapes: a show of silver or splendor buys the style
     a fresh window (the lapse stamp starts over) */
  FB.fns.hc_defy = function (state) {
    const p = state.player;
    if (p.titleLapse) {
      p.titleLapse.since = state.turn;
      delete p.titleLapse.warned;
    }
  };

})();
