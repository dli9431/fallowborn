/* Fixed acceptance matrix for the frozen validators and their schema consumers. */
(function () {
  'use strict';
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  window.schemaDefinitionCases = function () {
    var cases = [];
    function lawData() {
      return {localCouncilMotions:{motion:{fx:{}}},bookmarks:{schema_world:{id:'schema_world',
        provinces:[{id:'capital'},{id:'wilderness',wasteland:true}]}},
        enterprises:{business:{profession:'merchant',cost:0,yield:1}},careers:{merchant:{guild:true}},
        positions:{councillor:{kind:'earned'}},positionRules:{councillor:{localCouncil:true}}};
    }
    function law() {
      return {schema:1,motionId:'motion',bookmarkId:'schema_world',provinceId:'capital',enterpriseType:'business',
        minYear:1,maxYear:3000,mode:'license',fee:10,permitDays:30,durationDays:360,transitionDays:0,
        exemptions:[{kind:'home_province',id:'capital',fee:0,permission:true},
          {kind:'guild',id:'merchant',fee:5,permission:false},{kind:'office',id:'councillor',fee:1,permission:true}],
        relief:{days:1,chance:0},offense:{id:'violation',penalty:'fine',amount:10,closure:false},
        voting:{town:{quorum:1,threshold:0.5,days:90,members:[{id:'traders',kind:'guild',weight:10},
          {id:'notables',kind:'notable',weight:1}]},estates:{quorum:0.01,threshold:0.9,days:1}}};
    }
    function industry(name,accept,edit) {
      cases.push({kind:'law',name:name,accept:accept,make:function () {
        var data=lawData(), table={rule:law()}; if(edit)edit(table.rule,data,table);return {data:data,table:table};
      }});
    }
    industry('complete law',true);
    industry('empty table',true,function(d,data,t){delete t.rule;});
    industry('minimal law',true,function(d){d.exemptions=[];delete d.offense;delete d.relief;delete d.voting;});
    ['schema','motionId','bookmarkId','provinceId','enterpriseType','minYear','maxYear','mode','fee','permitDays','durationDays','transitionDays','exemptions'].forEach(function(k){
      industry('missing '+k,false,function(d){delete d[k];});
    });
    [['schema',2],['motionId','missing'],['bookmarkId','missing'],['provinceId','wilderness'],['provinceId','missing'],
      ['minYear',0],['minYear',1.5],['maxYear',3001],['maxYear',0],['fee',-1],['fee',10001],['fee','1'],
      ['fee',Infinity],['fee',NaN],['mode','ban'],['permitDays',0],['permitDays',361],['durationDays',0],
      ['durationDays',3601],['transitionDays',-1],['transitionDays',361],['exemptions',null]].forEach(function(pair){
      industry('invalid '+pair[0]+' '+String(pair[1]),false,function(d){d[pair[0]]=pair[1];});
    });
    industry('prohibition zero fee',true,function(d){d.mode='prohibition';d.fee=0;d.exemptions=[];});
    industry('prohibition positive fee',false,function(d){d.mode='prohibition';});
    industry('maximum fee and terms',true,function(d){d.fee=10000;d.durationDays=3600;d.permitDays=3600;d.transitionDays=3600;d.relief={days:3600,chance:1};});
    industry('reverse years',false,function(d){d.minYear=20;d.maxYear=19;});
    industry('unknown field',false,function(d){d.extra=1;});
    industry('reserved field',false,function(d){Object.defineProperty(d,'__proto__',{value:{},enumerable:true});});
    industry('invalid definition id',false,function(d,data,t){t.Bad=d;delete t.rule;});
    industry('legacy constructor definition id',true,function(d,data,t){t.constructor=d;delete t.rule;});
    industry('duplicate motion',false,function(d,data,t){t.other=copy(d);});
    industry('motion effects',false,function(d,data){data.localCouncilMotions.motion.fx.gold=1;});
    industry('unsupported enterprise',false,function(d){d.enterpriseType='missing';});
    ['profession','cost','yield'].forEach(function(k){industry('missing enterprise '+k,false,function(d,data){delete data.enterprises.business[k];});});
    industry('zero enterprise yield',false,function(d,data){data.enterprises.business.yield=0;});
    industry('retained inhabited jurisdiction',true,function(d,data){data.bookmarks.schema_world.revisions={baseline:{provinces:[]},retained:{provinces:[{id:'capital'}]}};});
    ['kind','id','fee','permission'].forEach(function(k){industry('missing exemption '+k,false,function(d){delete d.exemptions[0][k];});});
    [['kind','unrecognized'],['id','missing'],['fee',11],['fee',-1],['permission',1]].forEach(function(pair){
      industry('invalid exemption '+pair[0],false,function(d){d.exemptions[0][pair[0]]=pair[1];});
    });
    industry('nonguild career',false,function(d,data){data.careers.merchant.guild=false;});
    industry('unsupported office',false,function(d,data){data.positions.councillor.kind='appointed';});
    industry('nonlocal office',false,function(d,data){data.positionRules.councillor.localCouncil=false;});
    industry('sixteen exemptions',true,function(d){d.exemptions=Array(16).fill(d.exemptions[0]);});
    industry('seventeen exemptions',false,function(d){d.exemptions=Array(17).fill(d.exemptions[0]);});
    [null,undefined,{days:0,chance:0},{days:361,chance:0},{days:1,chance:-0.1},{days:1,chance:1.1},
      {days:1,chance:Infinity},{days:1,chance:0,extra:true}].forEach(function(v,i){industry('invalid relief '+i,false,function(d){d.relief=v;});});
    [{id:'violation',penalty:'closure',amount:0},{id:'violation',penalty:'suspension',amount:0,days:360},
      {id:'violation',penalty:'fine',amount:10000}].forEach(function(v,i){industry('valid offense '+i,true,function(d){d.offense=v;});});
    [null,undefined,{id:'Bad',penalty:'fine',amount:0},{id:'violation',penalty:'death',amount:0},
      {id:'violation',penalty:'closure',amount:1},{id:'violation',penalty:'closure',amount:0,closure:false},
      {id:'violation',penalty:'fine',amount:1,days:1},{id:'violation',penalty:'fine',amount:1,closure:1},
      {id:'violation',penalty:'suspension',amount:0,days:0},{id:'violation',penalty:'suspension',amount:0,days:361}
    ].forEach(function(v,i){industry('invalid offense '+i,false,function(d){d.offense=v;});});
    industry('suspension beyond law',false,function(d){d.durationDays=30;d.offense={id:'violation',penalty:'suspension',amount:0,days:31};});
    industry('missing estates',false,function(d){delete d.voting.estates;});
    industry('unknown voting field',false,function(d){d.voting.extra={};});
    ['town','estates'].forEach(function(k){
      [['quorum',0],['quorum',1.01],['quorum',NaN],['threshold',0.49],['threshold',1],['days',0],['days',91],['days',1.5],['extra',1]].forEach(function(pair){
        industry('invalid '+k+' '+pair[0]+' '+String(pair[1]),false,function(d){d.voting[k][pair[0]]=pair[1];});
      });
    });
    industry('empty benches',false,function(d){d.voting.town.members=[];});
    industry('duplicate bench id',false,function(d){d.voting.town.members[1].id='traders';});
    industry('duplicate bench kind',false,function(d){d.voting.town.members[1].kind='guild';});
    industry('prototype bench id',false,function(d){d.voting.town.members[0].id='constructor';});
    industry('unsupported bench',false,function(d){d.voting.town.members[0].kind='priest';});
    industry('oversized bench weight',false,function(d){d.voting.town.members[0].weight=11;});
    industry('unknown bench field',false,function(d){d.voting.town.members[0].extra=1;});
    [64,65].forEach(function(n){industry('law table bound '+n,n===64,function(d,data,t){
      delete t.rule;for(var i=0;i<n;i++){var key='rule_'+i;t[key]=copy(d);t[key].motionId=key;data.localCouncilMotions[key]={fx:{}};}
    });});
    function catalog() {
      return {productionGoods:{raw:{name:'Raw',unit:'raw_unit',mass:2},made:{name:'Made',unit:'made_unit',mass:1}},
        productionRecipes:{process:{name:'Process',inputs:[{goodId:'raw',quantity:1}],outputs:[{goodId:'made',quantity:1}],
          workDays:1,workPrice:1,requiresTech:[],impactReviewId:'review'}},tech:{knowledge:{}},
        techImpactReviews:{features:{review:{mode:'none',rationale:'Baseline'}}},buildings:{}};
    }
    function production(name,accept,edit) {cases.push({kind:'catalog',name:name,accept:accept,make:function(){var data=catalog();if(edit)edit(data);return {data:data};}});}
    production('complete catalogue',true);
    production('empty catalogue',true,function(d){d.productionGoods={};d.productionRecipes={};});
    ['name','unit','mass'].forEach(function(k){production('missing good '+k,false,function(d){delete d.productionGoods.raw[k];});});
    [['name',' '],['name','a'.repeat(1001)],['unit','Bad'],['mass',0],['mass',1001],['mass',1.5],['desc',null],
      ['provisionUnits',0],['provisionUnits',1001],['provisionUnits',Infinity],['provisionUnits','1'],['extra',1]
    ].forEach(function(pair){production('invalid good '+pair[0]+' '+String(pair[1]).slice(0,20),false,function(d){d.productionGoods.raw[pair[0]]=pair[1];});});
    production('optional undefined good fields',true,function(d){d.productionGoods.raw.desc=undefined;d.productionGoods.raw.provisionUnits=undefined;});
    production('minimum provision units',true,function(d){d.productionGoods.raw.provisionUnits=0.001;});
    production('maximum good fields',true,function(d){d.productionGoods.raw.name='a'.repeat(1000);d.productionGoods.raw.mass=1000;d.productionGoods.raw.provisionUnits=1000;});
    production('legacy constructor good',true,function(d){d.productionGoods.constructor=copy(d.productionGoods.raw);});
    ['name','inputs','outputs','workDays','workPrice','requiresTech','impactReviewId'].forEach(function(k){
      production('missing recipe '+k,false,function(d){delete d.productionRecipes.process[k];});
    });
    [['name',''],['desc',null],['workDays',0],['workDays',31],['workDays',1.5],['workPrice',0],['workPrice',10001],
      ['water',0],['water',10001],['requiresSale',1],['impactReviewId','missing'],['fallback','Unexpected'],['extra',true]
    ].forEach(function(pair){production('invalid recipe '+pair[0]+' '+String(pair[1]),false,function(d){d.productionRecipes.process[pair[0]]=pair[1];});});
    production('maximum recipe fields',true,function(d){var r=d.productionRecipes.process;r.workDays=30;r.workPrice=10000;r.water=10000;r.requiresSale=true;});
    production('undefined optional recipe fields',true,function(d){var r=d.productionRecipes.process;r.desc=r.water=r.requiresSale=r.fallback=undefined;});
    production('hard technology review',true,function(d){var r=d.productionRecipes.process;r.requiresTech=['knowledge'];r.fallback='Manual';d.techImpactReviews.features.review={mode:'hard',tech:['knowledge'],fallback:'Manual',rationale:'Optional'};});
    production('unknown technology',false,function(d){d.productionRecipes.process.requiresTech=['unknown'];});
    production('duplicate technology',false,function(d){d.productionRecipes.process.requiresTech=['knowledge','knowledge'];});
    production('hard review mismatch',false,function(d){d.productionRecipes.process.requiresTech=['knowledge'];});
    production('empty review rationale',false,function(d){d.techImpactReviews.features.review.rationale=' ';});
    production('missing review',false,function(d){delete d.techImpactReviews;});
    ['inputs','outputs'].forEach(function(k){
      [[],null,[{goodId:'missing',quantity:1}],[{goodId:'raw',quantity:0}],[{goodId:'raw',quantity:10001}],
        [{goodId:'raw',quantity:1,extra:1}],[{goodId:'raw',quantity:1},{goodId:'raw',quantity:1}]
      ].forEach(function(v,i){production('invalid '+k+' '+i,false,function(d){d.productionRecipes.process[k]=v;});});
    });
    production('mass growth',false,function(d){d.productionRecipes.process.outputs[0].quantity=3;});
    production('reproduces input',false,function(d){d.productionRecipes.process.outputs[0].goodId='raw';});
    production('equal conservative mass',true,function(d){d.productionRecipes.process.outputs[0].quantity=2;});
    production('legacy boxed string reference',true,function(d){d.productionRecipes.process.inputs=[{goodId:new String('raw'),quantity:1}];});
    production('boxed string reference alias',false,function(d){d.productionRecipes.process.inputs=[{goodId:new String('raw'),quantity:1},{goodId:'raw',quantity:1}];});
    production('numeric and string reference alias',false,function(d){d.productionGoods['1']=copy(d.productionGoods.raw);d.productionRecipes.process.inputs=[{goodId:1,quantity:1},{goodId:'1',quantity:1}];});
    [8,9].forEach(function(n){production('amount row bound '+n,n===8,function(d){
      d.productionRecipes.process.inputs=[];
      for(var i=0;i<n;i++){d.productionGoods['raw_'+i]=copy(d.productionGoods.raw);d.productionRecipes.process.inputs.push({goodId:'raw_'+i,quantity:10000});}
    });});
    [8,9].forEach(function(n){production('technology bound '+n,n===8,function(d){
      var r=d.productionRecipes.process;r.requiresTech=[];r.fallback='Manual';
      for(var i=0;i<n;i++){d.tech['tech_'+i]={};r.requiresTech.push('tech_'+i);}
      d.techImpactReviews.features.review={mode:'hard',rationale:'Optional',fallback:'Manual',tech:r.requiresTech.slice().reverse()};
    });});
    production('hard review wrong fallback',false,function(d){var r=d.productionRecipes.process;r.requiresTech=['knowledge'];r.fallback='Wrong';
      d.techImpactReviews.features.review={mode:'hard',tech:['knowledge'],rationale:'Optional',fallback:'Manual'};});
    [16,17].forEach(function(n){production('building recipe bound '+n,n===16,function(d){
      var row=copy(d.productionRecipes.process),ids=[];
      for(var i=0;i<n;i++){var key='recipe_'+i;ids.push(key);d.productionRecipes[key]=copy(row);}
      d.buildings.plant={productionRecipeIds:ids};
    });});
    production('valid building recipes',true,function(d){d.buildings.plant={productionRecipeIds:['process']};});
    [[],['missing'],['process','process'],null].forEach(function(v,i){production('invalid building recipes '+i,false,function(d){d.buildings.plant={productionRecipeIds:v};});});
    ['fort','operationProfile','institutionProfile'].forEach(function(k){production('conflicting building '+k,false,function(d){d.buildings.plant={productionRecipeIds:['process']};d.buildings.plant[k]=true;});});
    ['productionGoods','productionRecipes'].forEach(function(k){
      production('array '+k,false,function(d){d[k]=[];});
      production('missing '+k,false,function(d){delete d[k];});
      [128,129].forEach(function(n){production(k+' table bound '+n,n===128,function(d){var row=copy(d[k][k==='productionGoods'?'raw':'process']);
        if(k==='productionGoods'){for(var i=2;i<n;i++)d[k]['good_'+i]=copy(row);}else{d[k]={};for(var j=0;j<n;j++)d[k]['recipe_'+j]=copy(row);}
      });});
    });
    return cases;
  };
})();
