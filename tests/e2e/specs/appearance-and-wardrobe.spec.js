'use strict';
const fs = require('fs');
const path = require('path');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/portrait.js',
  'js/world.js',
  'js/station.js',
  'js/economy.js',
  'js/model.js',
  'data/cultures.js',
  'data/wardrobes.js',
  'data/eras.js',
  'data/political_institutions.js',
  'data/bookmarks.js',
  'data/bookmark_476.js',
  'data/bookmark_476_italy.js', 'data/bookmark_476_dalmatia_east.js',
  'data/bookmark_476_gaul_iberia.js', 'data/bookmark_476_africa.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { gameRoot, scanSource } = require('../support/source-literals');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
});

test('portrait code names no culture, faith or bookmark and keeps no garment table',
  async function ({ page }) {
    const ids = await page.evaluate(function () {
      return Object.keys(FBDATA.cultures).concat(Object.keys(FBDATA.religions),
        Object.keys(FBDATA.bookmarks));
    });
    const text = fs.readFileSync(path.join(gameRoot, 'js', 'portrait.js'), 'utf8');
    const scan = scanSource(text.replace(/\r\n/g, '\n'));
    const named = scan.literals.filter(function (row) {
      return ids.indexOf(row.value) >= 0;
    }).map(function (row) { return row.line + ': ' + row.value; });
    const code = scan.maskedLines.join('\n');
    expect(named).toEqual([]);
    expect(code).not.toMatch(/period476|start\.id|cultureIsA|byTier|byRole/);
    expect(code).not.toMatch(/\.faith\s*===|faith\s*===|\.culture\s*===/);
  });

test('base wardrobe, appearance and attire data validate',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      return { errors:FB.validateWardrobeData(), bookmark:FB.validateBookmark(FB.bookmark('867')) };
    })).toEqual({ errors:[], bookmark:[] });
  });

test('eras and government forms resolve the wardrobe and it reaches the cache key',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      function at(id, year, extra) {
        return Object.assign({ start:{ id:id }, date:{ year:year, season:0, day:1 } }, extra || {});
      }
      const c = { id:'wardrobe-subject', name:'Wardrobe Subject', sex:'m', born:840,
        culture:'frankish', religion:'catholic', dyn:'of Paris', health:8, traits:[],
        station:3, role:'none' };
      function look(state, year) {
        return FB.characterLook(c, year, state, { tier:3, profession:'none', loadout:{} });
      }
      function key(state, year) {
        return FB.characterVisualKey(state, c, { year:year, tier:3, profession:'none', loadout:{} });
      }
      const s867 = at('867', 867), s1066 = at('1066', 1066), s476 = at('476', 476);
      const stamped = at('867', 867, { start:{ id:'867', era:'late_antique' } });
      const out = {
        wardrobes:[look(s867, 867).wardrobe, look(s1066, 1066).wardrobe,
          look(s476, 867).wardrobe, look(stamped, 867).wardrobe],
        garments:[look(s867, 867).cloth.kind, look(s476, 867).cloth.kind],
        keyStable:key(s867, 867) === key(s867, 867),
        keyByWardrobe:key(s867, 867) !== key(s476, 867)
      };
      const form = FBDATA.governmentForms.territorial, saved = form.costume;
      form.costume = 'late_antique';
      try {
        out.formOverride = look(s867, 867).wardrobe;
        out.formGarment = look(s867, 867).cloth.kind;
      } finally {
        if (saved === undefined) delete form.costume; else form.costume = saved;
      }
      out.restored = look(s867, 867).wardrobe;
      return out;
    });
    expect(result).toEqual({
      wardrobes:['medieval', 'medieval', 'late_antique', 'late_antique'],
      garments:['cote', 'lateCivil'],
      keyStable:true, keyByWardrobe:true,
      formOverride:'late_antique', formGarment:'lateMantle',
      restored:'medieval'
    });
  });

test('wardrobes follow each subject government and invalidate cached portraits on a form change',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      const me = { id:'e2e_player', name:'Player', sex:'m', born:840, culture:'frankish',
        religion:'catholic', station:3, traits:[] };
      const local = Object.assign({}, me, { id:'e2e_local', homeProvinceId:'e2e_county' });
      const remote = Object.assign({}, me, { id:'e2e_remote', homeProvinceId:'e2e_remote_county' });
      const s = { start:{ era:'early_medieval', defaultGovernment:'territorial' },
        date:{ year:867 }, player:{ charId:me.id, tier:3, liege:'e2e_local_realm', provinceId:'e2e_county' },
        chars:{ e2e_player:me, e2e_local:local, e2e_remote:remote },
        realms:{ player:{ id:'player', alive:true, rank:1, liege:'e2e_local_realm' },
          e2e_local_realm:{ id:'e2e_local_realm', alive:true, rank:1 },
          e2e_remote_realm:{ id:'e2e_remote_realm', alive:true, rank:1 } },
        holder:{ e2e_county:'e2e_local_realm', e2e_remote_county:'e2e_remote_realm' },
        authority:{ governments:{ player:{ formId:'roman_civic' },
          e2e_local_realm:{ formId:'roman_civic' }, e2e_remote_realm:{ formId:'regnum' } } } };
      const civic = FBDATA.governmentForms.roman_civic, original = civic.costume;
      civic.costume = 'late_antique';
      const opts = { year:867, tier:3, profession:'none', loadout:{} };
      function wardrobe(c) { return FB.characterLook(c, 867, s, opts).wardrobe; }
      try {
        const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
        const firstKey = FB.characterVisualKey(s, me, opts);
        const first = [wardrobe(me), wardrobe(local), wardrobe(remote)];
        const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
        s.authority.governments.player.formId = 'regnum';
        const second = wardrobe(me), secondKey = FB.characterVisualKey(s, me, opts);
        s.realms.player.alive = false;
        const liege = wardrobe(me);
        return { first:first, pure:pure, second:second, cacheChanged:firstKey !== secondKey, liege:liege };
      } finally {
        if (original === undefined) delete civic.costume; else civic.costume = original;
      }
    });
    expect(result).toEqual({ first:['late_antique','late_antique','medieval'],
      pure:true, second:'medieval', cacheChanged:true, liege:'late_antique' });
  });

test('a test culture with a data profile renders its own palette',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = { start:{ id:'867' }, date:{ year:867, season:0, day:1 } };
      const added = ['palette_dark', 'palette_fair', 'palette_red', 'palette_bare', 'palette_child'];
      FBDATA.cultures.palette_dark = { name:'Palette Dark', tradition:'other', dyn:'of_place',
        appearance:{ tone:3.9, fair:0, red:0 }, male:['Dark'], female:['Dark'] };
      FBDATA.cultures.palette_fair = { name:'Palette Fair', tradition:'other', dyn:'of_place',
        appearance:{ tone:.1, fair:1, red:0, hair:{ style:'braids', sex:'m', above:-1 },
          tends:['furHat'] }, male:['Fair'], female:['Fair'] };
      FBDATA.cultures.palette_bare = { name:'Palette Bare', tradition:'other', dyn:'of_place',
        male:['Bare'], female:['Bare'] };
      FBDATA.cultures.palette_red = { name:'Palette Red', tradition:'other', dyn:'of_place',
        appearance:{ tone:1, fair:0, red:1 }, male:['Red'], female:['Red'] };
      FBDATA.cultures.palette_child = { name:'Palette Child', parent:'palette_dark',
        tradition:'other', dyn:'of_place', male:['Child'], female:['Child'] };
      FB.invalidateCultureData();
      try {
        function look(culture, name) {
          const c = { id:'palette-' + name, name:'Palette', sex:'m', born:837,
            culture:culture, religion:'catholic', dyn:'House', health:8, traits:[],
            station:0, role:'none' };
          return FB.characterLook(c, 867, state, { tier:0, profession:'none', loadout:{} });
        }
        const dark = look('palette_dark', 'same'), fair = look('palette_fair', 'same');
        const bare = look('palette_bare', 'same'), frankish = look('frankish', 'same');
        const inherited = look('palette_child', 'same');
        const fairFamilies = [[196,158,102], [148,138,120], [124,86,50]].map(function (rgb) {
          return rgb.join(',');
        });
        let fairCount = 0, redCount = 0;
        for (let i = 0; i < 20; i++) {
          if (fairFamilies.indexOf(look('palette_fair', 'hair-' + i).hair.base.join(',')) >= 0) {
            fairCount++;
          }
          if (look('palette_red', 'hair-' + i).hair.base.join(',') === '138,74,40') redCount++;
        }
        return {
          darkPigment:dark.pigment > 3.4, fairPigment:fair.pigment < .6,
          darkerSkin:dark.skin.base[0] < fair.skin.base[0],
          fairHair:fairCount >= 15, redHair:redCount >= 15,
          hairTendency:fair.hairStyle,
          borrowsEraCulture:bare.pigment === frankish.pigment &&
            bare.hair.base.join(',') === frankish.hair.base.join(','),
          inheritsParent:inherited.pigment === dark.pigment,
          tendsReachWardrobe:(function () {
            for (let i = 0; i < 400; i++) {
              const hat = look('palette_fair', 'hat-' + i);
              if (hat.headwear === 'furHat') return true;
            }
            return false;
          })(),
          valid:FB.validateWardrobeData()
        };
      } finally {
        added.forEach(function (id) { delete FBDATA.cultures[id]; });
        FB.invalidateCultureData();
      }
    });
    expect(result).toEqual({
      darkPigment:true, fairPigment:true, darkerSkin:true, fairHair:true, redHair:true,
      hairTendency:'braids', borrowsEraCulture:true, inheritsParent:true,
      tendsReachWardrobe:true, valid:[]
    });
  });

test('faith attire dresses the faith without naming it in the painter',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = { start:{ id:'867' }, date:{ year:867, season:0, day:1 } };
      const muslim = Object.keys(FBDATA.religions).filter(function (id) {
        return FB.religionOf(id).group === 'muslim';
      })[0];
      const labor = FB.roleCareer('labor'), cloister = FB.roleCareer('cloister');
      function look(religion, sex, profession, name) {
        const c = { id:'attire-' + name, name:'Attire ' + name, sex:sex, born:837,
          culture:'arabic', religion:religion, dyn:'House', health:8, traits:[],
          station:0, role:profession };
        return FB.characterLook(c, 867, state, { tier:0, profession:profession, loadout:{} });
      }
      const allowed = FBDATA.religions.muslim.properties.attire.beard.cuts;
      let cuts = true, beards = true;
      for (let i = 0; i < 40; i++) {
        const man = look(muslim, 'm', labor, 'beard-' + i);
        if (allowed.indexOf(man.beardCut) < 0) cuts = false;
        if (man.beardKind === 'none' || man.beardKind === 'stubble') beards = false;
      }
      const monk = look('catholic', 'm', cloister, 'monk');
      return {
        turban:look(muslim, 'm', labor, 'man').headwear,
        veil:look(muslim, 'f', labor, 'woman').headwear,
        robe:look(muslim, 'm', labor, 'man').cloth.kind,
        tunic:look('catholic', 'm', labor, 'man').cloth.kind,
        cuts:cuts, beards:beards,
        tonsure:monk.hairStyle === 'tonsure' || monk.hairStyle === 'receding' ||
          monk.hairStyle === 'bald'
      };
    });
    expect(result).toEqual({ turban:'turban', veil:'veil', robe:'robe', tunic:'tunic',
      cuts:true, beards:true, tonsure:true });
  });

test('a new wardrobe named by an era dresses that era with no portrait change',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const state = { start:{ id:'1066' }, date:{ year:1066, season:0, day:1 } };
      const era = FBDATA.eras.high_medieval, saved = era.costume;
      FBDATA.wardrobes.test_period = {
        garments:[{ garment:'robe', color:[10,20,30] }],
        headwear:[{ headwear:'cap' }],
        chain:[{ station:'isSerf' }]
      };
      era.costume = 'test_period';
      try {
        const c = { id:'period-subject', name:'Period Subject', sex:'f', born:1036,
          culture:'english', religion:'catholic', dyn:'House', health:8, traits:[],
          station:0, role:'none' };
        const look = FB.characterLook(c, 1066, state, { tier:0, profession:'none', loadout:{} });
        const broken = FBDATA.wardrobes.test_period.garments[0];
        broken.garment = 'toga';
        const errors = FB.validateWardrobeData();
        broken.garment = 'robe';
        return { wardrobe:look.wardrobe, garment:look.cloth.kind, raw:look.cloth.raw,
          headwear:look.headwear, chain:look.neckChain, pendant:look.pendant,
          errors:errors.length, valid:FB.validateWardrobeData() };
      } finally {
        era.costume = saved;
        delete FBDATA.wardrobes.test_period;
      }
    });
    expect(result.wardrobe).toBe('test_period');
    expect(result.garment).toBe('robe');
    expect(result.headwear).toBe('cap');
    expect(result.chain).toBe(true);
    expect(result.pendant).toBe('cross');
    expect(result.errors).toBe(1);
    expect(result.valid).toEqual([]);
    expect(result.raw.length).toBe(3);
  });
