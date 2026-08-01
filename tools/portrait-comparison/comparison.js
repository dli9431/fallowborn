(function () {
  'use strict';
  var cultures=Object.keys(FBDATA.cultures);
  var faiths=['catholic','sunni','rabbinic','norse_pagan'];
  var headwear=['none','turban','veil','imperial','crown','circlet','wimple','helm',
    'cap','coif','mitre','crespine','fillet','garland','furHat','kerchief','strawHat','chaperon'];

  function baseCase(index) {
    var age=[7,17,28,49,73][index%5];
    return {label:'matrix '+(index+1),character:{id:'matrix-'+index,name:'Case '+index,
      dyn:'House '+(index%7),sex:index%2?'f':'m',culture:cultures[index%cultures.length],
      religion:faiths[index%faiths.length],born:1000-age,station:index%8,health:8,
      traits:[],ails:[],career:{profession:['none','soldier','merchant','monk','priest'][index%5]}},
      figure:index<12};
  }
  function headwearRules(kind,index) {
    var entry=baseCase(index+30),c=entry.character;
    entry.label='headwear '+kind;entry.figure=false;c.id='headwear-'+kind+'-';c.name='Headwear';
    c.sex='m';c.born=970;c.station=2;c.religion='catholic';c.culture='frankish';c.career={profession:'none'};
    if(kind==='turban'){c.religion='sunni';}
    else if(kind==='veil'){c.religion='sunni';c.sex='f';}
    else if(kind==='imperial'){c.station=7;}
    else if(kind==='crown'){c.station=6;}
    else if(kind==='circlet'){c.station=4;}
    else if(kind==='wimple'){c.sex='f';c.born=940;}
    else if(kind==='helm'){c.career.profession='soldier';}
    else if(kind==='cap'){c.career.profession='merchant';}
    else if(kind==='coif'||kind==='strawHat'){c.station=0;}
    else if(kind==='mitre'){c.career.profession='priest';}
    else if(kind==='crespine'||kind==='fillet'||kind==='kerchief'){c.sex='f';}
    else if(kind==='garland'){c.sex='f';c.born=994;}
    else if(kind==='furHat'){c.culture='norse';}
    else if(kind==='chaperon'){c.station=2;}
    return entry;
  }
  function findHeadwear(kind,index) {
    var entry=headwearRules(kind,index),c=entry.character,state=stateFor(c,{}),look,i;
    for(i=0;i<5000;i++){
      c.id='headwear-'+kind+'-'+i;c.name='Headwear '+i;
      look=FB.characterLook(c,1000,state,{tier:c.station,profession:c.career.profession});
      if(look.headwear===kind)return entry;
    }
    entry.label+=' (seed search missed)';return entry;
  }
  function item(id,seed,quality){return {ref:id+'-'+seed,defId:id,visualSeed:seed,quality:quality||'plain'};}
  function equipmentCases() {
    var cases=[],sets=[
      {label:'empty loadout',loadout:{}},
      {label:'ordinary armor',loadout:{head:item('fixture_helm',1),body:item('fixture_jack',2),feet:item('fixture_boots',3)}},
      {label:'masterwork regalia',loadout:{head:item('fixture_crown',4,'masterwork'),neck:item('fixture_relic',5,'masterwork'),waist:item('fixture_belt',6,'masterwork'),ring:item('fixture_ring',7,'masterwork')}},
      {label:'one-handed loadout',loadout:{rightHand:item('fixture_sword',8,'well')}},
      {label:'two-handed loadout',loadout:(function(){var spear=item('fixture_spear',9,'masterwork');return {leftHand:spear,rightHand:spear};})()}
    ];
    sets.forEach(function(set,index){var entry=baseCase(70+index);entry.label=set.label;entry.figure=true;entry.loadout=set.loadout;cases.push(entry);});
    return cases;
  }
  function stateFor(c,loadout) {
    var state={date:{year:1000},player:{charId:c.id,tier:c.station,profession:c.career.profession,flags:{}},
      chars:{},loadouts:{},items:{}};state.chars[c.id]=c;state.loadouts[c.id]=loadout||{};return state;
  }
  function referenceOverrides(look) {
    var wound='none';
    var referenceCulture={baltic:'slavic',brezhon:'gaelic',magyar:'slavic',
      georgian:'armenian'}[look.culture]||look.culture;
    if(look.marks.length)wound=look.marks[0].mark==='bruise'?'bruise':
      look.marks[0].mark==='bandage'?'bandage':'cut';
    return {sex:look.sex,age:look.age,culture:referenceCulture,religion:look.faith,
      tier:look.tier,profession:look.profession,faceWidth:look.faceWidth,jaw:look.jaw,
      chin:look.chin,cheek:look.cheek,eyeSize:look.eyeSize,eyeSpacing:look.eyeSpacing,
      browWeight:look.browWeight,noseW:look.noseW,noseLen:look.noseLen,mouthW:look.mouthW,
      lipFull:look.lipFull,yaw:look.yaw,asymmetry:look.asymmetry,hairStyle:look.hairStyle,
      beard:look.beardAmount,expression:look.expression,health:look.health,wound:wound,
      scarred:look.scarred?'yes':'no',oneEyed:look.oneEyed?'yes':'no',
      headwear:look.headwear,earSize:look.earSize,keySide:look.lightSide,
      bgHue:look.bgHue,markSide:look.woundSide};
  }
  function canvas(width,height){var c=document.createElement('canvas');c.width=width;c.height=height;return c;}
  function pair(label,reference,shipping,className) {
    var wrap=document.createElement('div');wrap.className='pair '+(className||'');
    [[reference,'Reference'],[shipping,'Shipping']].forEach(function(value){
      var figure=document.createElement('figure');figure.appendChild(value[0]);
      var caption=document.createElement('figcaption');caption.textContent=value[1];figure.appendChild(caption);wrap.appendChild(figure);
    });return wrap;
  }
  function renderCase(entry,index) {
    var c=entry.character,loadout=entry.loadout||{};
    if(index===1)c.health=3;
    if(index===2)c.health=2;
    if(index===3)c.traits=['scarred','one_eyed'];
    if(index===4)c.ails=['gash','bruises','head_wound'];
    var state=stateFor(c,loadout),opts={state:state,tier:c.station,
      profession:c.career.profession,loadout:loadout};
    var look=FB.characterLook(c,1000,state,opts);
    var refSpec=FBCourtReference.makeSpec(c.id,referenceOverrides(look));
    var article=document.createElement('article'),title=document.createElement('h2');
    title.textContent=entry.label+' · '+look.sex+' · age '+look.age+' · '+look.culture+
      ' · '+look.faith+' · '+look.headwear;article.appendChild(title);
    var rp=canvas(256,288),sp=canvas(256,288);
    FBCourtReference.renderPortrait(rp,refSpec,{width:256,height:288});
    FB.paintPortrait(sp,c,1000,opts);article.appendChild(pair(entry.label,rp,sp));
    if(entry.figure){
      var rf=canvas(256,480),sf=canvas(192,360);
      FBCourtReference.renderFigure(rf,refSpec,{width:256,height:480});
      FB.paintPaperDoll(sf,c,state,{loadout:loadout});
      article.appendChild(pair(entry.label,rf,sf,'figure-pair'));
    }
    document.getElementById('matrix').appendChild(article);
  }
  var cases=[];
  for(var i=0;i<24;i++)cases.push(baseCase(i));
  headwear.forEach(function(kind,index){cases.push(findHeadwear(kind,index));});
  cases=cases.concat(equipmentCases());cases.forEach(renderCase);
  document.getElementById('summary').textContent=cases.length+' bust comparisons · '+
    cases.filter(function(entry){return entry.figure;}).length+
    ' figure comparisons · reference code remains outside the game runtime';
})();
