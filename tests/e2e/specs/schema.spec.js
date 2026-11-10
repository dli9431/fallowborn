'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,openTitle,prepareGameContent} = require('../support/game/navigation');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {scanSource} = require('../support/source-literals');
const {quotedCounts} = require('../support/content-id-reviews');
const root = path.resolve(__dirname,'../../..');
const oracle = fs.readFileSync(path.resolve(__dirname,'../fixtures/schema/legacy-validators.js'),'utf8');
const matrix = fs.readFileSync(path.resolve(__dirname,'../fixtures/schema/definition-cases.js'),'utf8');
const iron = JSON.parse(JSON.stringify(require('../fixtures/authoring/production-iron.json')));
// Keep this scenario-local variant consistent with the current ruler profile.
Object.keys(iron.bookmarks).forEach(function(k){iron.bookmarks[k].realms.forEach(function(r){if(r.ruler)r.ruler.sex='m';});});
const laws = require('../fixtures/authoring/industry-law-assemblies.json');

dependsOnRuntime(__filename,['index.html','js/schema.js','js/industry_laws.js','js/production.js',
  'js/mods.js','js/world.js','js/bookmark_sources.js','js/site_resources.js','js/production_economy.js',
  'js/maritime_work.js','js/relay_services.js','data/industry_laws.js','data/production.js','data/technology.js']);

async function legacy(page) { await page.addScriptTag({content:oracle + '\n' + matrix}); }

test('industry laws, goods and recipes retain the frozen acceptance matrix and diagnostics',async function({page},info){
  await openGame(page,info); await legacy(page);
  const r = await page.evaluate(function(){
    const before=JSON.stringify(FBDATA),rng=FB.getRngState(),uid=FB.getUidCounter(),rows=schemaDefinitionCases().map(function(c){
      const input=c.make(),snapshot=JSON.stringify(input);
      const old=c.kind==='law'?legacyIndustryLaws.definitionFaults(input.table,input.data):legacyProduction.catalogFaults(input.data);
      const current=c.kind==='law'?FB.industryLaws.definitionFaults(input.table,input.data):FB.production.catalogFaults(input.data);
      return {name:c.kind+': '+c.name,expected:c.accept,old:old,current:current,pure:snapshot===JSON.stringify(input)};
    });
    return {rows:rows,pure:before===JSON.stringify(FBDATA)&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  });
  for(const row of r.rows){
    expect(row.old.length===0,row.name+' frozen baseline').toBe(row.expected);
    expect(row.current,row.name).toEqual(row.old);
    expect(row.pure,row.name+' candidate purity').toBe(true);
  }
  expect(r.pure).toBe(true);
  info.annotations.push({type:'acceptance fixtures',description:String(r.rows.length)+' catalogue/law cases, identical before and after'});
});

test('production sites retain physical, material, reference and bound acceptance',async function({page},info){
  await openGame(page,info); await legacy(page);
  const r=await page.evaluate(function(mod){
    FB.mods.apply(mod);
    const before=JSON.stringify(FBDATA),rng=FB.getRngState(),uid=FB.getUidCounter(),cases=[];
    function base(){return {provinces:[{id:'county',settlements:[{site:'physical'}]}],
      productionSites:[{id:'plant',countyId:'county',siteId:'physical',buildingId:'iron_works',recipeIds:['smelt_ore'],
        openingLots:[{goodId:'iron_ore_lot',quantity:4}]}],openingInfrastructure:{placements:[
          {countyId:'county',siteId:'physical',buildingId:'iron_works',condition:'standing'}]}};}
    function add(name,accept,edit){cases.push({name:name,accept:accept,make:function(){const b=base();if(edit)edit(b,b.productionSites[0]);return b;}});}
    add('complete site',true);
    add('absent sites',true,function(b){delete b.productionSites;});
    add('empty sites',true,function(b){b.productionSites=[];});
    add('empty opening lots',true,function(b,a){a.openingLots=[];delete b.openingInfrastructure;});
    ['id','countyId','siteId','buildingId','recipeIds','openingLots'].forEach(function(k){add('missing '+k,false,function(b,a){delete a[k];});});
    [['id','Bad'],['countyId','missing'],['siteId','missing'],['buildingId','missing'],['recipeIds',[]],['recipeIds',['missing']],
      ['recipeIds',['smelt_ore','smelt_ore']],['recipeIds',Array(17).fill('smelt_ore')],['openingLots',null],
      ['openingLots',[{goodId:'missing',quantity:1}]],['openingLots',[{goodId:'iron_ore_lot',quantity:0}]],
      ['openingLots',[{goodId:'iron_ore_lot',quantity:1},{goodId:'iron_ore_lot',quantity:2}]],['sourceId','unneeded'],['extra',1]
    ].forEach(function(pair){add('invalid '+pair[0]+' '+JSON.stringify(pair[1]),false,function(b,a){a[pair[0]]=pair[1];});});
    add('duplicate assignment id',false,function(b,a){b.productionSites.push(JSON.parse(JSON.stringify(a)));});
    add('duplicate physical assignment',false,function(b,a){const other=JSON.parse(JSON.stringify(a));other.id='another';b.productionSites.push(other);});
    add('duplicate physical site',false,function(b){b.provinces.push({id:'another',settlements:[{site:'physical'}]});});
    add('wasteland',false,function(b){b.provinces[0].wasteland=true;});
    add('missing opening asset',false,function(b){delete b.openingInfrastructure;});
    add('ruined opening asset',false,function(b){b.openingInfrastructure.placements[0].condition='ruined';});
    add('water without a source',false,function(b,a){a.recipeIds=['workshop_papermaking'];});
    add('fortification',false,function(b,a){a.buildingId=Object.keys(FBDATA.buildings).filter(function(k){return FB.isFortificationBuilding(k);})[0];});
    add('nonarray sites',false,function(b){b.productionSites={};});
    add('site bound 129',false,function(b,a){b.productionSites=Array(129).fill(a);});
    add('site bound 128',true,function(b,a){
      a.openingLots=[];b.productionSites=[];b.provinces=[];
      for(let i=0;i<128;i++){b.productionSites.push(Object.assign({},a,{id:'plant_'+i,countyId:'county_'+i,siteId:'physical_'+i}));
        b.provinces.push({id:'county_'+i,settlements:[{site:'physical_'+i}]});}
    });
    [64,65].forEach(function(n){add('global opening lots '+n*8,n===64,function(b,a){
      const goods=Object.keys(FBDATA.productionGoods).slice(0,8);
      b.productionSites=[];b.provinces=[];b.openingInfrastructure.placements=[];
      for(let i=0;i<n;i++){
        const site=Object.assign({},a,{id:'plant_'+i,countyId:'county_'+i,siteId:'physical_'+i,
          openingLots:goods.map(function(k){return {goodId:k,quantity:1};})});
        b.productionSites.push(site);b.provinces.push({id:site.countyId,settlements:[{site:site.siteId}]});
        b.openingInfrastructure.placements.push({countyId:site.countyId,siteId:site.siteId,buildingId:site.buildingId,condition:'standing'});
      }
    });});
    const rows=cases.map(function(c){const b=c.make(),snapshot=JSON.stringify(b),old=legacyProduction.compilePrepared(b),current=FB.production.compilePrepared(b);
      return {name:c.name,expected:c.accept,old:old.errors,current:current.errors,
        sites:JSON.stringify(old.sites)===JSON.stringify(current.sites),pure:snapshot===JSON.stringify(b)};});
    return {rows:rows,pure:before===JSON.stringify(FBDATA)&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  },iron);
  for(const row of r.rows){
    expect(row.old.length===0,row.name+' frozen baseline '+JSON.stringify(row.old)).toBe(row.expected);
    expect(row.current.length===0,row.name+' migrated '+JSON.stringify(row.current)).toBe(row.expected);
    expect(row.sites,row.name+' compiled sites').toBe(true);expect(row.pure,row.name+' purity').toBe(true);
    if(!row.expected)expect(row.current.join(' '),row.name+' diagnostic').toContain('productionSites');
  }
  expect(r.pure).toBe(true);
  info.annotations.push({type:'acceptance fixtures',description:String(r.rows.length)+' site cases, identical before and after'});
});

test('schema checks nested types, bounds, references, reserved keys and pure predicates with paths',async function({page},info){
  await openTitle(page,info);
  const r=await page.evaluate(function(){
    const S=FB.schema,data={goods:{grain:{}}},bookmark={provinces:[{id:'field'},{id:'waste',wasteland:true}]},
      context={data:data,bookmark:bookmark},before=JSON.stringify([data,bookmark,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter();
    const spec={type:'object',minProperties:1,maxProperties:3,keys:{type:'string',pattern:/^[a-z]+$/},values:{type:'object',fields:{
      quantity:{type:'integer',min:1,max:3},ratio:{type:'number',exclusiveMin:0,exclusiveMax:1},
      good:{type:'string',ref:{table:'goods'}},county:{ref:{provinces:true,inhabited:true}},
      tags:{type:'array',minItems:1,maxItems:2,unique:true,items:{enum:['raw','food']}},
      note:{type:'string',nonblank:true,maxLength:3,optional:true},
      flags:{type:'object',fields:{enabled:{type:'boolean'}},optional:'absent'}
    },test:function(v){return v.quantity*v.ratio<=2;}}};
    function base(){return {row:{quantity:2,ratio:0.5,good:'grain',county:'field',tags:['food']}};}
    const cases=[
      ['quantity',0],['quantity',4],['quantity',1.5],['quantity',Infinity],['quantity','2'],['ratio',0],['ratio',1],['ratio',NaN],
      ['good','unknown'],['county','waste'],['county','unknown'],['tags',[]],['tags',['food','food']],['tags',['food','raw','food']],
      ['tags',['unknown']],['tags',{}],['note',' '],['note','long'],['note',null],['flags',undefined],['flags',{enabled:1}],['extra',true]
    ].map(function(pair){const v=base();v.row[pair[0]]=pair[1];return {value:v,path:'catalog.row.'+pair[0]};});
    cases.push({value:{},path:'catalog'});
    const cross=base();cross.row.quantity=3;cross.row.ratio=0.9;cases.push({value:cross,path:'catalog.row'});
    cases.push({value:{Bad:base().row},path:'catalog.Bad'});
    cases.push({value:{a:base().row,b:base().row,c:base().row,d:base().row},path:'catalog'});
    ['__proto__','constructor','prototype'].forEach(function(k){const v=base();Object.defineProperty(v.row,k,{value:{polluted:true},enumerable:true});cases.push({value:v,path:'catalog.row.'+k});});
    const valid=base();valid.row.note=undefined;valid.row.flags={enabled:false};
    const failures=cases.map(function(c){return {path:c.path,errors:S.faults(c.value,spec,'catalog',context)};});
    const pattern=/^a$/g,repeat=[S.valid('a',{type:'string',pattern:pattern}),S.valid('a',{type:'string',pattern:pattern})];
    const nested={data:{nested:{goods:data.goods}}},ref={ref:{table:['nested','goods']}},
      nestedReferences=[S.valid('grain',ref,nested),S.valid('missing',ref,nested)];
    const deferredContext={data:{bookmarks:{'634':{id:'634'}}},root:{bookmarkId:'634'}},
      deferredReferences=[S.valid('missing',{ref:{bookmark:'bookmarkId',inhabited:true,deferUnreviewed:true}},deferredContext),
        S.valid('missing',{ref:{bookmark:'bookmarkId',inhabited:true}},deferredContext)];
    return {valid:S.faults(valid,spec,'catalog',context),failures:failures,repeat:repeat,lastIndex:pattern.lastIndex,
      nestedReferences:nestedReferences,deferredReferences:deferredReferences,
      pure:before===JSON.stringify([data,bookmark,FBDATA])&&rng===FB.getRngState()&&uid===FB.getUidCounter(),polluted:({}).polluted};
  });
  expect(r.valid).toEqual([]);expect(r.repeat).toEqual([true,true]);expect(r.lastIndex).toBe(0);expect(r.pure).toBe(true);expect(r.polluted).toBeUndefined();
  expect(r.nestedReferences).toEqual([true,false]);expect(r.deferredReferences).toEqual([true,false]);
  for(const row of r.failures)expect(row.errors.join(' '),row.path).toContain(row.path);
});

for(const item of [{name:'industry laws',mod:laws,root:'industryLaws',id:'river_market_hearing',field:'fee',bad:-1},
  {name:'production recipes',mod:iron,root:'productionRecipes',id:'smelt_ore',field:'workDays',bad:0}]){
  test(item.name+' ordinary JSON import accepts valid data and rejects malformed data atomically',async function({page},info){
    await openGame(page,info);
    const invalid=JSON.parse(JSON.stringify(item.mod));invalid[item.root][item.id][item.field]=item.bad;
    const before=await page.evaluate(function(){return {data:JSON.stringify(FBDATA),rng:FB.getRngState(),uid:FB.getUidCounter(),storage:JSON.stringify(localStorage)};});
    const rejected=await page.evaluate(function(mod){let error='';try{FB.mods.apply(mod);}catch(e){error=e.message;}return {validation:FB.mods.validate(mod),error:error};},invalid);
    expect(rejected.validation.join(' ')).toContain(item.id);expect(rejected.error).toContain(item.id);
    await page.evaluate(function(){FB.ui.showMods();});
    await page.locator('#modfile').setInputFiles({name:'invalid-definitions.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(invalid),'utf8')});
    await page.locator('#mod-apply').click();
    await expect(page.locator('#toasts .toast').filter({hasText:'Mod requirements failed:'})).toContainText(item.id);
    expect(await page.evaluate(function(){return {data:JSON.stringify(FBDATA),rng:FB.getRngState(),uid:FB.getUidCounter(),storage:JSON.stringify(localStorage)};})).toEqual(before);
    expect(await page.evaluate(function(mod){return FB.mods.validate(mod);},item.mod)).toEqual([]);
    await page.locator('#modfile').setInputFiles({name:'valid-definitions.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(item.mod),'utf8')});
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
    await prepareGameContent(page);
    expect(await page.evaluate(function(item){return FBDATA[item.root][item.id];},item)).toEqual(item.mod[item.root][item.id]);
  });
}

test('schema consumers keep exact reviewed content spelling counts',async function({page},info){
  await openGame(page,info);
  const ids=await page.evaluate(function(){
    const ids={};
    function object(v){return !!v && Object.prototype.toString.call(v)==='[object Object]';}
    function walk(v,depth){
      if(Array.isArray(v)){v.forEach(function(row){if(object(row)&&typeof row.id==='string')ids[row.id]=true;});return;}
      if(!object(v))return;
      const keys=Object.keys(v);
      if(keys.length&&keys.every(function(k){return object(v[k]);})){keys.forEach(function(k){ids[k]=true;});return;}
      if(depth<2)keys.forEach(function(k){walk(v[k],depth+1);});
    }
    Object.keys(FBDATA).forEach(function(k){walk(FBDATA[k],0);});return Object.keys(ids);
  });
  const files=['js/schema.js','js/industry_laws.js','js/production.js'];
  const sources=files.map(function(file){return {file:file,scan:scanSource(fs.readFileSync(path.join(root,file),'utf8'))};});
  const counts=quotedCounts(sources),allowlist=JSON.parse(fs.readFileSync(path.join(root,'tests/e2e/fixtures/engine-ids/content-id-allowlist.json'),'utf8'));
  for(const entry of allowlist.hooks)for(const file of files){
    const actual=counts.get(file+'\n'+entry.id)||0;
    expect(actual,file+' '+entry.id).toBe(entry.uses[file]||0);
  }
  const reviewed=new Set(allowlist.hooks.map(function(entry){return entry.id;}));
  const content=new Set(ids.filter(function(id){return id.length>=3;}));
  for(const source of sources)for(const literal of source.scan.literals){
    if(content.has(literal.value))expect(reviewed.has(literal.value),source.file+' new content spelling '+literal.value).toBe(true);
  }
});
