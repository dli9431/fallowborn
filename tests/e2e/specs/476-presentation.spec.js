'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'css/style.css', 'data/eras.js', 'data/wardrobes.js',
  'data/cultures.js', 'data/lexicons.js', 'data/map_data.js', 'data/units.js',
  'data/technology.js', 'data/starts.js', 'data/bookmark_476.js',
  'data/bookmark_476_africa.js', 'data/bookmark_476_gaul_iberia.js',
  'js/portrait.js', 'js/siteart.js', 'js/util.js', 'js/model.js', 'js/items.js',
  'js/localfolk.js', 'js/armies.js', 'js/world.js', 'js/mods.js', 'js/i18n.js',
  'js/lexicon.js', 'js/station.js', 'js/main.js', 'js/ui_topbar.js',
  'js/ui_misc.js', 'js/stories.js', 'js/story_western_court_476.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');

test('shipped late antique presentation validates and preserves medieval defaults',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      function state(id) { return { start:{ id:id, era:FB.bookmark(id).era } }; }
      const late = state('476'), before = JSON.stringify(late), rng = FB.getRngState();
      const era = FBDATA.eras.late_antique;
      const art = [0,1,2].map(function (rank) {
        const first = FB.siteArt(rank, 'ravenna_476', 'roman', late);
        return { cached:first === FB.siteArt(rank, 'ravenna_476', 'roman', late),
          different:first.toDataURL() !== FB.siteArt(rank, 'ravenna_476', 'roman', state('867')).toDataURL() };
      });
      return {
        errors:FB.validateBookmark(FB.bookmark('476')).concat(FB.validateWardrobeData(),
          FB.validateItemPresentation(), FB.validateUnitClassRoles(FBDATA.unitClasses, true)),
        presentation:[FB.architectureStyle('roman', late), era.emblem,
          FB.currencyLabel(late), FB.money(1, { state:late, style:'long' }),
          FB.money(2, { state:late, style:'long' }), FB.money(2, { state:late }),
          FB.money(0, { state:late, style:'icon' })],
        art:art, pure:before === JSON.stringify(late) && rng === FB.getRngState(),
        medieval:['867','1066'].map(function (id) {
          const s = state(id);
          return [FB.architectureStyle('roman', s), FBDATA.eras[s.start.era].emblem,
            FB.currencyLabel(s), FB.money(2, { state:s })];
        })
      };
    });
    expect(result.errors).toEqual([]);
    expect(result.presentation).toEqual(['late_antique','standard','Solidi',
      '1 solidus','2 solidi','2 s','🪙']);
    expect(result.art).toEqual(Array(3).fill({ cached:true, different:true }));
    expect(result.pure).toBe(true);
    expect(result.medieval).toEqual(Array(2).fill(['manuscript','heraldry','Gold','2 gold']));
  });

test('period portraits cover every culture, sex and rank without changing state or RNG',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      const s = { start:{ id:'476', era:'late_antique', defaultGovernment:'regnum' },
        date:{ year:476 }, chars:{}, realms:{}, holder:{} };
      const cultures = ['roman','gothic','vandal','frankish','burgundian','suevic','moorish','greek'];
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      let rows = 0, equal = true, finite = true;
      function canvas() { const c = document.createElement('canvas'); c.width=96; c.height=108; return c; }
      cultures.forEach(function (culture) {
        ['m','f'].forEach(function (sex) {
          for (let tier=0;tier<8;tier++) {
            const c = { id:'matrix-'+culture+'-'+sex+'-'+tier, name:'Subject', sex:sex,
              born:440, culture:culture, religion:culture==='moorish'?'berber_traditional':'nicene',
              station:tier, health:8, traits:[], dyn:'House' };
            const opts = { state:s, tier:tier, profession:'none', loadout:{} };
            const look = FB.characterLook(c,476,s,opts), first=canvas(), second=canvas();
            finite = finite && Number.isFinite(look.pigment) && look.wardrobe==='late_antique';
            FB.paintPortrait(first,c,476,opts); FB.paintPortrait(second,c,476,opts);
            equal = equal && first.toDataURL()===second.toDataURL(); rows++;
          }
        });
      });
      function dress(tier, profession, form) {
        const state = Object.assign({},s,{start:Object.assign({},s.start,{defaultGovernment:form})});
        return FB.characterLook({ id:'dress', name:'Subject', sex:'m', born:440,
          culture:'roman', religion:'nicene', station:tier, health:8, traits:[] },476,state,
        { tier:tier, profession:profession, loadout:{} });
      }
      const looks = [dress(7,'none','roman_civic'),dress(6,'none','roman_civic'),
        dress(4,'none','federate_polity'),dress(2,'curialis','roman_civic'),
        dress(1,'soldier','federate_polity'),dress(1,'priest','regnum'),dress(1,'monk','regnum')];
      return { rows:rows, equal:equal, finite:finite,
        pure:before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter(),
        garments:looks.map(function (look) { return look.cloth.kind; }),
        heads:looks.slice(0,2).map(function (look) { return look.headwear; }) };
    });
    expect(result).toEqual({ rows:128, equal:true, finite:true, pure:true,
      garments:['lateMantle','lateMantle','lateMantle','lateCivil','lateMilitary','lateVestment','lateVestment'],
      heads:['diadem','none'] });
  });

test('retained portrait keys change for live wardrobe and period appearance edits',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      const s={start:{id:'476',era:'late_antique'},date:{year:476},chars:{},realms:{}};
      const c={id:'cache',name:'Subject',sex:'m',born:440,culture:'roman',religion:'nicene',
        station:2,health:8,traits:[]};
      const opts={state:s,tier:2,profession:'curialis',loadout:{}};
      const rng=FB.getRngState(),before=JSON.stringify(s);
      const cv=document.createElement('canvas');cv.width=96;cv.height=108;
      function sample(){const key=FB.characterVisualKey(s,c,opts);FB.paintPortrait(cv,c,476,opts);
        return {key:key,pixels:cv.toDataURL()};}
      const original=sample();
      const cloth=FBDATA.wardrobes.late_antique.garments.find(function (r){return r.roles&&r.roles[0]==='civic';});
      cloth.color=[91,117,165];const recolored=sample();
      FBDATA.cultures.roman.appearanceEras.late_antique.tone=.8;
      FB.invalidateCultureData();const face=sample();
      FBDATA.wardrobes.late_antique.headwear.unshift({headwear:'diadem'});
      const head=sample();
      return {keys:new Set([original.key,recolored.key,face.key,head.key]).size,
        pixels:new Set([original.pixels,recolored.pixels,face.pixels,head.pixels]).size,
        pure:before===JSON.stringify(s)&&rng===FB.getRngState()};
    });
    expect(result).toEqual({keys:4,pixels:4,pure:true});
  });

test('names and political labels follow the stamped era without rewriting saved identities',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result=await page.evaluate(function () {
      const s={start:{id:'476',era:'late_antique'},date:{year:1100},
        cultures:{child:{parent:'frankish',name:'Child'}},chars:{saved:{id:'saved',name:'Louis',dyn:'Doukas'}}};
      const before=JSON.stringify(s),rng=FB.getRngState();
      const terms=Object.keys(FBDATA.lexicons.base.terms).map(function (id) {
        return [id,FB.term(s,id,{viewer:null})];
      });
      return { terms:terms,
        cultureNames:['roman','gothic','vandal','frankish','burgundian','suevic','moorish','greek']
          .map(function(id){return [FB.cultureNamePool(id,'m',s)[0],FB.cultureNamePool(id,'f',s)[0]];}),
        names:FB.cultureNamePool('frankish','m',s),child:FB.cultureNamePool('child','m',s),
        greekFamilies:FB.cultureNamePool('greek','family',s),
        medieval:FB.cultureNamePool('greek','family',{start:{id:'867',era:'early_medieval'}}),
        moorish:FB.lexicon.rank(s,4,{faith:'berber_traditional',viewer:null}).word,
        troops:FB.dataText(s,null,'unitClass','ret',FBDATA.unitClasses.ret,'name',{}),
        sword:FB.dataText(s,null,'item','broad_sword',FBDATA.items.broad_sword,'name',{}),
        pure:before===JSON.stringify(s)&&rng===FB.getRngState() };
    });
    expect(result.terms).toEqual([
      ['vassal','subordinate'],['liege','patron'],['fief','allotment'],['holding','estate'],
      ['levy','muster'],['crown_authority','public authority'],['council','council'],
      ['estates','assembly'],['manor','villa estate'],['serf','dependent'],
      ['knight','mounted retainer'],['baron','decurion'],['county','civitas'],
      ['duchy','district'],['kingdom','realm'],['empire','empire'],['duke','dux'],
      ['duchess','ducissa'],['king','rex'],['queen','regina'],['emperor','augustus'],['empress','augusta']
    ]);
    expect(result.cultureNames).toEqual([['Marcellus','Marcia'],['Theoderic','Amalasuntha'],
      ['Gaiseric','Gudeliva'],['Childeric','Basina'],['Gundobad','Clotild'],
      ['Hermeric','Giso'],['Masties','Monnica'],['Zenon','Ariadne']]);
    expect(result.names).toContain('Childeric');expect(result.names).not.toContain('Louis');
    expect(result.child).toEqual(result.names);
    expect(result.greekFamilies).toContain('Flavius');expect(result.greekFamilies).not.toContain('Doukas');
    expect(result.medieval).toContain('Doukas');
    expect(result.moorish).toBe('Comes');expect(result.troops).toBe('Bucellarii');
    expect(result.sword).toBe('Spatha');expect(result.pure).toBe(true);
  });

test('period stock and unit restrictions retain owned equipment and reject malformed declarations',
  async function ({ page }, testInfo) {
    await openGame(page,testInfo);
    const result=await page.evaluate(function () {
      const c={id:'me',name:'Subject',sex:'m',born:440,culture:'roman',religion:'nicene',health:8,traits:[]};
      const s={start:{id:'476',era:'late_antique'},date:{year:1100},player:{charId:'me',provinceId:'ravenna'},
        chars:{me:c},realms:{}};
      const before=JSON.stringify(s),rng=FB.getRngState();
      const late=FB.characterLook(c,1100,s,{tier:1,profession:'soldier',
        loadout:{head:{defId:'nasal_helm',ref:'old-head',visualSeed:42,quality:'plain'}}});
      const medieval={start:{id:'867',era:'early_medieval'}};
      const iconChanges=['nasal_helm','mail_hauberk'].map(function(id){
        const item={defId:id,ref:'same-item',visualSeed:42,quality:'plain'};
        const icon=document.createElement('canvas');icon.width=96;icon.height=96;
        FB.paintItem(icon,s,item);const latePixels=icon.toDataURL();
        FB.paintItem(icon,medieval,item);return icon.toDataURL()!==latePixels;
      });
      const cv=document.createElement('canvas');cv.width=200;cv.height=300;
      FB.paintPaperDoll(cv,c,s,{loadout:{head:{defId:'nasal_helm',ref:'old-head',visualSeed:42,quality:'plain'}}});
      function rejected(mod){try{FB.mods.apply(mod);return false;}catch(error){return true;}}
      const invalid=[rejected({items:{e2e_item:{eras:['unknown']}}}),
        rejected({items:{e2e_item:{artEras:{unknown:{kind:'helm'}}}}}),
        rejected({unitClasses:{crossbow:Object.assign({},FBDATA.unitClasses.crossbow,{eras:['unknown']})}})];
      return {stock:['falchion','kite_shield','dane_axe','kettle_helm'].map(function(id){
          return FB.itemAvailability(s,id).reason;}),
        units:['levy','arch','ret','cav','mercs','crossbow','huscarl','cataphract'].map(function(id){
          return FB.unitClassEraAllowed(s,id);}),
        medieval:FB.unitClassEraAllowed({start:{id:'867',era:'early_medieval'}},'crossbow'),
        existing:!!FB.resolveItemSnapshot({defId:'kite_shield',quality:'plain',ref:'old-shield'}),
        blockedMarker:!!FBDATA.items.e2e_item,invalid:invalid,wardrobe:late.wardrobe,
        iconChanges:iconChanges,
        pure:before===JSON.stringify(s)&&rng===FB.getRngState()};
    });
    expect(result).toEqual({stock:Array(4).fill('Not made in this era.'),
      units:[true,true,true,true,true,false,false,true],medieval:true,existing:true,
      blockedMarker:false,invalid:[true,true,true],wardrobe:'late_antique',iconChanges:[true,true],pure:true});
  });

for (const scenario of ['federate_476','curialis_476']) {
  test('476 '+scenario+' opening and purse fit the phone start flow',async function({page},testInfo){
    await page.setViewportSize({width:390,height:844});
    await openGame(page,testInfo);
    await expect(page.locator('#title .subtitle')).toContainText('late antiquity');
    await page.evaluate(function(){FB.game.uiPrefs.hideTips=true;FB.game.uiPrefs.hideBeginnerHints=true;});
    await page.getByRole('button',{name:'New Game',exact:true}).click();
    const bookmark=page.locator('#bookmarklist .scencard').filter({hasText:'476: The Last Western Court'});
    await expect(bookmark).toContainText('Roman cities');
    await bookmark.click();
    const start=page.locator('#scenariolist .scencard').filter({hasText:scenario==='federate_476'?'Federate Soldier':'Curialis'});
    await expect(page.locator('#scenariolist .scencard')).toHaveCount(3);
    await start.click();
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Your Story Begins',exact:true})).toBeVisible();
    await expect(page.locator('#gm-body')).toContainText(scenario==='federate_476'?
      'personal standing and a command are separate rewards':'standing from the powers of an appointment');
    await page.evaluate(function(){FB.game.setPaused(true);});
    await page.getByRole('button',{name:'Begin',exact:true}).click();
    await page.locator('[data-tab="actions"]').click();
    await expect(page.locator('[data-story-card]')).toHaveCount(2);
    const result=await page.evaluate(function(){
      const s=FB.state;
      return {era:FB.campaignEra(s),currency:FB.currencyLabel(s),
        banner:FBDATA.eras[FB.campaignEra(s)].emblem,
        overflow:document.documentElement.scrollWidth>window.innerWidth,
        rulerCulture:FB.realmRulerCharacterSnapshot(s,'aghlabids').culture,
        burgundy:s.chars[s.stories.western_court_476.gundobadId].culture,
        purse:document.getElementById('tb-gold').getAttribute('aria-label')};
    });
    expect(result).toMatchObject({era:'late_antique',currency:'Solidi',banner:'standard',
      overflow:false,rulerCulture:'vandal',burgundy:'burgundian'});
    expect(result.purse).toContain('Solidi');
  });
}
