/* Frozen definition-validation oracle. Loaded only in a browser by schema.spec.js. */
/* Targeted operating laws: pure reviews, council approval and paid permissions. */
(function () {
  'use strict';
  const L = window.legacyIndustryLaws = {};
  const own = function (o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); };
  const plain = function (o) { return !!o && typeof o === 'object' && !Array.isArray(o); };
  const copy = function (o) { return JSON.parse(JSON.stringify(o)); };
  const same = function (a, b) { return FB.mods.fingerprint(a) === FB.mods.fingerprint(b); };
  function fields(o, keys) {
    return plain(o) && Object.keys(o).every(function (k) { return keys.indexOf(k) >= 0; });
  }
  function integer(n, min, max) { return Number.isSafeInteger(n) && n >= min && n <= max; }
  function money(n) { return typeof n === 'number' && isFinite(n) && n >= 0 && n <= 10000; }
  function ledger(s) { return s.industryLaws || {schema:1, laws:[], permits:[], choices:[]}; }
  function writable(s) {
    if (!s.industryLaws) s.industryLaws = {schema:1, laws:[], permits:[], choices:[]};
    return s.industryLaws;
  }
  function controller(s, pid) { return s.holder && s.holder[pid] || s.owner && s.owner[pid] || null; }
  function realm(s, rid) { return s.realms && s.realms[rid]; }
  function account(s, rid) {
    return FB.treasuryPublicAccountSnapshot(s, rid);
  }
  /* Windowed retention through the shared ledger-retention graph. Live laws,
     pending hearings, current permits and every record of a live law are roots;
     a living operator's unresolved or unpaid violation and a filed justice case
     stay live too.
     Each record needs the law its validator reads, deliberative laws and their
     passed hearings need each other, and a court closure choice needs its
     violation. Caps count this live closure. A season boundary folds unreached
     history settled before the window into per-law, per-hearing-body and
     per-enterprise totals. */
  const LAW_TOTALS = ['laws','repealed','permits','paid','petitions','granted','violations','fines','finesPaid','closures'];
  const ENTERPRISE_TOTALS = ['permits','paid','petitions','granted','violations','fines','finesPaid','closures'];
  const HEARING_TOTALS = ['passed','rejected','withdrawn','invalidated'];
  const AMOUNTS = ['paid','fines','finesPaid'];
  const LIMITS = {laws:256, permits:4096, choices:512, votes:64, petitions:512, violations:512};
  function list(v) { return Array.isArray(v) ? v : []; }
  function lawLive(s, r) { return r.repealedTurn === null && s.turn < r.endTurn; }
  function lawEnded(r) { return r.repealedTurn === null ? r.endTurn : Math.min(r.endTurn, r.repealedTurn); }
  function safeKey(k) { return typeof k === 'string' && !!k && !own(Object.prototype, k); }
  // These definitions all use acquireEnterprise and the shared staffing/yield owners.
  // No id whitelist: an imported ordinary enterprise has the same checked paths.
  function supportedEnterprise(data, id) {
    const d = own(data.enterprises, id) && data.enterprises[id];
    return !!(d && own(data.careers, d.profession) && typeof d.cost === 'number' &&
      isFinite(d.cost) && d.cost >= 0 && typeof d.yield === 'number' && isFinite(d.yield) && d.yield > 0);
  }
  function supportedOffice(data, id) {
    return own(data.positions, id) && data.positions[id].kind === 'earned' &&
      own(data.positionRules, id) && data.positionRules[id].localCouncil === true;
  }
  L.definitionFaults = function (table, data) {
    const errors = [];
    data = data || FBDATA;
    if (!plain(table) || Object.keys(table).length > 64) return ['industryLaws must be a table of at most 64 definitions.'];
    Object.keys(table).forEach(function (id) {
      const d = table[id];
      if (!/^[a-z][a-z0-9_]{0,79}$/.test(id) || !fields(d,
          ['schema','motionId','bookmarkId','provinceId','enterpriseType','minYear','maxYear','mode','fee','permitDays','durationDays','transitionDays','exemptions','offense','voting','relief']) ||
          d.schema !== 1 || !own(data.localCouncilMotions, d.motionId) ||
          !own(data.bookmarks, d.bookmarkId) ||
          !integer(d.minYear, 1, 3000) || !integer(d.maxYear, d.minYear, 3000) ||
          ['license','prohibition'].indexOf(d.mode) < 0 || !money(d.fee) ||
          d.mode === 'prohibition' && d.fee !== 0 ||
          !integer(d.durationDays, 1, 3600) || !integer(d.permitDays, 1, d.durationDays) ||
          !integer(d.transitionDays, 0, d.durationDays) ||
          !Array.isArray(d.exemptions) || d.exemptions.length > 16) {
        errors.push('Invalid industryLaws.' + id); return;
      }
      if (!supportedEnterprise(data, d.enterpriseType))
        errors.push('Unsupported industry-law enterprise type (ordinary acquisition, staffing and yield required): ' + id + ': ' + d.enterpriseType);
      const raw = data.bookmarks[d.bookmarkId];
      // A date whose sources are not loaded in this candidate is reviewed
      // with that date; its jurisdiction cannot apply to another campaign.
      const reviewable = !(FB.bookmarkSources && FB.bookmarkSources.unreviewedReference &&
        FB.bookmarkSources.unreviewedReference(raw));
      if (reviewable && !FB.bookmarkRevisions(d.bookmarkId, raw).some(function (world) {
        return (world.provinces || []).some(function (p) { return p.id === d.provinceId && !p.wasteland; });
      })) errors.push('Unknown industry-law jurisdiction: ' + id);
      if (Object.keys(table).some(function (other) { return other !== id && table[other] && table[other].motionId === d.motionId; }))
        errors.push('Duplicate industry-law motion: ' + id);
      d.exemptions.forEach(function (e) {
        if (!fields(e, ['kind','id','fee','permission']) ||
            ['home_province','guild','office'].indexOf(e.kind) < 0 || typeof e.id !== 'string' || !e.id ||
            !money(e.fee) || e.fee > d.fee || typeof e.permission !== 'boolean' ||
            e.kind === 'home_province' && reviewable && !FB.bookmarkRevisions(d.bookmarkId, raw).some(function (world) {
              return (world.provinces || []).some(function (p) { return p.id === e.id && !p.wasteland; });
            }) || e.kind === 'guild' && (!own(data.careers, e.id) || data.careers[e.id].guild !== true) ||
            e.kind === 'office' && !supportedOffice(data, e.id))
          errors.push('Invalid or unsupported industry-law exemption kind/reference: ' + id + ': ' + (e && e.kind));
      });
      if (own(d, 'relief') && (!fields(d.relief, ['days','chance']) || !integer(d.relief.days, 1, d.durationDays) ||
          typeof d.relief.chance !== 'number' || !isFinite(d.relief.chance) || d.relief.chance < 0 || d.relief.chance > 1)) errors.push('Invalid industry-law relief: ' + id);
      if (own(d, 'offense') && (!fields(d.offense, ['id','penalty','amount','closure','days']) ||
          typeof d.offense.id !== 'string' || !/^[a-z][a-z0-9_]{0,79}$/.test(d.offense.id) ||
          ['fine','closure','suspension'].indexOf(d.offense.penalty) < 0 || !money(d.offense.amount) ||
          own(d.offense, 'closure') && (d.offense.penalty !== 'fine' || typeof d.offense.closure !== 'boolean') ||
          d.offense.penalty !== 'fine' && d.offense.amount !== 0 ||
          (d.offense.penalty === 'suspension' ? !integer(d.offense.days, 1, Math.min(360, d.durationDays)) : own(d.offense, 'days'))))
        errors.push('Invalid industry-law offense: ' + id);
      const motion = data.localCouncilMotions[d.motionId];
      if (Object.keys(motion.fx || {}).length) errors.push('Industry-law motions cannot also grant ordinance effects: ' + id);
      if (own(d, 'voting') && (!fields(d.voting, ['town','estates']) || !d.voting.town || !d.voting.estates ||
          ['town','estates'].some(function (consumer) {
            const v = d.voting[consumer];
            return !fields(v, consumer === 'town' ? ['quorum','threshold','days','members'] : ['quorum','threshold','days']) ||
              typeof v.quorum !== 'number' || !(v.quorum > 0 && v.quorum <= 1) ||
              typeof v.threshold !== 'number' || !(v.threshold >= 0.5 && v.threshold < 1) ||
              !integer(v.days, 1, 90) || consumer === 'town' && (!Array.isArray(v.members) ||
                !v.members.length || v.members.length > 8 || v.members.some(function (m, i) {
                  return !fields(m, ['id','kind','weight']) || typeof m.id !== 'string' || own(Object.prototype, m.id) || !/^[a-z][a-z0-9_]{0,39}$/.test(m.id) ||
                    ['guild','notable'].indexOf(m.kind) < 0 || !integer(m.weight, 1, 10) ||
                    v.members.some(function (n, j) { return i !== j && (n.id === m.id || n.kind === m.kind); });
                }));
          }))) errors.push('Invalid industry-law voting rules: ' + id);
    });
    return errors;
  };
})();
/* Finite physical lots and paid batches. Declarations never select historical content. */
(function () {
  'use strict';
  var P = window.legacyProduction = {}, MAX = 1000000, LIMIT = 512;
  function own(v,k) { return !!v && Object.prototype.hasOwnProperty.call(v,k); }
  function object(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function keys(v,list) { return object(v) && Object.keys(v).every(function (k) { return list.indexOf(k) >= 0; }); }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function eq(a,b) { return JSON.stringify(a) === JSON.stringify(b); }
  function int(v,min,max) { return Number.isSafeInteger(v) && v >= min && v <= max; }
  function id(v) { return typeof v === 'string' && /^[a-z][a-z0-9_]{0,79}$/.test(v); }
  function actor(v) { return keys(v,['kind','id']) && ['realm','character'].indexOf(v.kind) >= 0 && typeof v.id === 'string' && !!v.id; }
  function text(v) { return typeof v === 'string' && v.trim() && v.length <= 1000; }
  function amountRows(rows,goods) {
    var seen = {};
    return Array.isArray(rows) && rows.length > 0 && rows.length <= 8 && rows.every(function (r) {
      if (!keys(r,['goodId','quantity']) || !own(goods,r.goodId) || seen[r.goodId] || !int(r.quantity,1,10000)) return false;
      seen[r.goodId] = true; return true;
    });
  }
  P.catalogFaults = function (data) {
    var goods = data.productionGoods, recipes = data.productionRecipes, faults = [];
    if (!object(goods) || Object.keys(goods).length > 128 || !object(recipes) || Object.keys(recipes).length > 128)
      return ['productionGoods/productionRecipes require bounded tables.'];
    Object.keys(goods).forEach(function (key) {
      var g = goods[key];
      if (!id(key) || !keys(g,['name','desc','unit','mass','provisionUnits']) || !text(g.name) || g.desc !== undefined && !text(g.desc) ||
          g.provisionUnits !== undefined && !(typeof g.provisionUnits==='number' && Number.isFinite(g.provisionUnits) && g.provisionUnits>=0.001 && g.provisionUnits<=1000) ||
          !id(g.unit) || !int(g.mass,1,1000)) faults.push('productionGoods.' + key + ': invalid unit or conservative mass.');
    });
    Object.keys(recipes).forEach(function (key) {
      var r = recipes[key], req = r && r.requiresTech;
      var t = r && data.techImpactReviews && data.techImpactReviews.features && data.techImpactReviews.features[r.impactReviewId];
      if (!id(key) || !keys(r,['name','desc','inputs','outputs','water','workDays','workPrice','requiresTech','impactReviewId','fallback','requiresSale']) ||
          r.requiresSale !== undefined && typeof r.requiresSale !== 'boolean' ||
          !text(r.name) || r.desc !== undefined && !text(r.desc) || !amountRows(r.inputs,goods) || !amountRows(r.outputs,goods) ||
          !int(r.workDays,1,30) || !int(r.workPrice,1,10000) || r.water !== undefined && !int(r.water,1,10000) ||
          !Array.isArray(req) || req.length > 8 || new Set(req).size !== req.length || req.some(function (k) { return !own(data.tech,k); }) ||
          !id(r.impactReviewId) || !t || !text(t.rationale) ||
          (req.length ? t.mode !== 'hard' || !Array.isArray(t.tech) || !eq(req.slice().sort(),t.tech.slice().sort()) || !text(r.fallback) ||
            r.fallback !== t.fallback : t.mode !== 'none' || r.fallback !== undefined)) {
        faults.push('productionRecipes.' + key + ': invalid finite recipe, work or technology review.'); return;
      }
      function mass(rows) { return rows.reduce(function (n,x) { return n + x.quantity * goods[x.goodId].mass; },0); }
      if (mass(r.outputs) > mass(r.inputs)) faults.push('productionRecipes.' + key + ': outputs exceed conservative input mass.');
      if (r.outputs.some(function (o) { return r.inputs.some(function (i) { return i.goodId === o.goodId; }); }))
        faults.push('productionRecipes.' + key + ': a batch cannot reproduce its own input kind.');
    });
    Object.keys(data.buildings || {}).forEach(function (key) {
      var b = data.buildings[key], list = b && b.productionRecipeIds;
      if (list === undefined) return;
      if (b.fort || b.operationProfile || b.institutionProfile || !Array.isArray(list) || !list.length || list.length > 16 ||
          new Set(list).size !== list.length || list.some(function (k) { return !own(recipes,k); }))
        faults.push('Building ' + key + ': invalid finite production recipe references.');
    });
    return faults;
  };
  P.compilePrepared = function (bm) {
    var errors = P.catalogFaults(FBDATA), rows = bm && bm.productionSites, out = {sites:[],errors:errors};
    if (rows === undefined || errors.length) {
      if (FB.productionEconomy) errors.push.apply(errors,FB.productionEconomy.compilePrepared(bm,[]).errors);
      if (FB.maritimeWork) errors.push.apply(errors,FB.maritimeWork.compilePrepared(bm,[]).errors);
      if (FB.relayServices) errors.push.apply(errors,FB.relayServices.compilePrepared(bm,[]).errors);
      return out;
    }
    function fault(v) { errors.push('productionSites: ' + v); }
    if (!Array.isArray(rows) || rows.length > 128) { fault('requires at most 128 sites.'); return out; }
    var seen = {}, physical = {}, resource = FB.siteResources.compilePrepared(bm);
    if (resource.errors.length) errors.push.apply(errors,resource.errors);
    rows.forEach(function (a) {
      if (!keys(a,['id','countyId','siteId','buildingId','recipeIds','sourceId','openingLots']) || !id(a.id) || seen[a.id] ||
          !id(a.countyId) || !id(a.siteId) || !own(FBDATA.buildings,a.buildingId) || FB.isFortificationBuilding(a.buildingId) ||
          !Array.isArray(a.recipeIds) || !a.recipeIds.length || a.recipeIds.length > 16 || new Set(a.recipeIds).size !== a.recipeIds.length ||
          a.recipeIds.some(function (key) { return !own(FBDATA.productionRecipes,key); }) ||
          !Array.isArray(a.openingLots) || a.openingLots.length > 8 || a.openingLots.length && !amountRows(a.openingLots,FBDATA.productionGoods)) {
        fault('invalid asset, recipe or opening lot reference.'); return;
      }
      seen[a.id] = true;
      var county = (bm.provinces || []).find(function (p) { return p.id === a.countyId && !p.wasteland; });
      var slot = county && (county.settlements || []).findIndex(function (e) { return e.site === a.siteId; });
      var occurrence = (bm.provinces || []).reduce(function (n,p) { return n + (p.settlements || []).filter(function (e) { return e.site === a.siteId; }).length; },0);
      var place = JSON.stringify([a.siteId,a.buildingId]);
      if (!county || slot < 0 || occurrence !== 1 || physical[place]) { fault(a.id + ': requires one unique inhabited physical asset.'); return; }
      physical[place] = true;
      var water = a.recipeIds.some(function (key) { return !!FBDATA.productionRecipes[key].water; });
      var source = resource.sources.find(function (r) { return r.id === a.sourceId; });
      if (water ? !source || source.profile.unit !== 'water' || source.countyId !== a.countyId || source.siteId !== a.siteId : a.sourceId !== undefined)
        fault(a.id + ': water requires an actual co-located lawful source.');
      if (a.openingLots.length) {
        var inventory = bm.openingInfrastructure;
        if (!inventory || !(inventory.placements || []).some(function (r) {
          return r.countyId === a.countyId && r.siteId === a.siteId && r.buildingId === a.buildingId && r.condition === 'standing';
        })) fault(a.id + ': explicit opening lots require an explicit standing opening asset.');
      }
      out.sites.push(Object.assign(copy(a),{slot:slot}));
    });
    if (out.sites.reduce(function (n,a) { return n+a.openingLots.length; },0) > LIMIT) fault('opening lots exceed the global bound.');
    if (FB.productionEconomy) errors.push.apply(errors,FB.productionEconomy.compilePrepared(bm,out.sites).errors);
    if (FB.maritimeWork) {
      var maritime=FB.maritimeWork.compilePrepared(bm,out.sites);
      errors.push.apply(errors,maritime.errors);out.maritime=maritime.assignments;
    }
    if (FB.relayServices) errors.push.apply(errors,FB.relayServices.compilePrepared(bm,out.sites).errors);
    if (errors.length) out.sites = [];
    return out;
  };
})();
