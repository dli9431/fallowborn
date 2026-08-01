'use strict';

const { test, expect } = require('../support/fixture');
const {
  openGame,
  startDeterministicGame,
  waitForUiRefresh
} = require('../support/game');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('portrait descriptor keys are normalized, deterministic, and state-pure',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      var s = FB.state, me = s.chars[s.player.charId];
      var stateBefore = JSON.stringify(s), rngBefore = FB.getRngState();
      function key(options) { return FB.characterVisualKey(s, me, options || {}); }
      function itemKind(kind, seed) {
        for (var id in FBDATA.items) {
          if (FBDATA.items[id].art && FBDATA.items[id].art.kind === kind) {
            return { ref:'fixture-' + kind, defId:id, visualSeed:seed || 17,
              quality:'well', motif:'fixture' };
          }
        }
        return null;
      }
      var base = key(), again = key();
      var original = {
        dyn:me.dyn,culture:me.culture,religion:me.religion,health:me.health,
        traits:me.traits.slice(),ails:me.ails && me.ails.slice()
      };
      var axes = {};
      me.dyn = 'Changed House'; axes.dynasty = key() !== base; me.dyn = original.dyn;
      me.culture = me.culture === 'nubian' ? 'norse' : 'nubian';
      axes.culture = key() !== base; me.culture = original.culture;
      var religions = Object.keys(FBDATA.religions);
      var otherFaith = religions.filter(function (id) {
        return FB.religionOf(id).group !== FB.religionOf(me.religion).group;
      })[0];
      if (otherFaith) { me.religion = otherFaith; axes.faith = key() !== base; }
      me.religion = original.religion;
      axes.age = key({ year:s.date.year + 1 }) !== base;
      axes.tier = key({ tier:7 }) !== key({ tier:0 });
      axes.profession = key({ profession:'monk' }) !== key({ profession:'soldier' });
      me.health = 3; axes.health = key() !== base; me.health = original.health;
      me.traits = []; var neutralTraitKey = key();
      me.traits = ['cruel']; axes.expression = key() !== neutralTraitKey;
      me.traits = ['diligent']; axes.unrelatedTrait = key() === neutralTraitKey;
      me.traits = ['scarred']; axes.scar = key() !== neutralTraitKey;
      me.traits = original.traits;
      delete me.ails; var unmarkedKey = key();
      me.ails = ['gash']; axes.ailment = key() !== unmarkedKey;
      if (original.ails) me.ails = original.ails; else delete me.ails;
      var boots = itemKind('boots',23), sword = itemKind('sword',29);
      var pendant = itemKind('pendant',37);
      var emptyBust = key({ loadout:{} });
      axes.bootsIgnoredByBust = key({ loadout:{ feet:boots } }) === emptyBust;
      axes.weaponIgnoredByBust = key({ loadout:{ rightHand:sword } }) === emptyBust;
      axes.neckIgnoredByBust = key({ loadout:{ neck:pendant } }) === emptyBust;
      var emptyFigure = key({ frame:'figure', loadout:{} });
      axes.bootsAffectFigure = key({ frame:'figure', loadout:{ feet:boots } }) !== emptyFigure;
      axes.weaponAffectsFigure = key({ frame:'figure', loadout:{ rightHand:sword } }) !== emptyFigure;
      axes.neckAffectsFigure = key({ frame:'figure', loadout:{ neck:pendant } }) !== emptyFigure;
      var canvas = document.createElement('canvas');canvas.width=128;canvas.height=144;
      FB.paintPortrait(canvas,me,s.date.year,{state:s,transparent:true});
      return { same:base === again, axes:axes,
        stateSame:stateBefore === JSON.stringify(s), rngSame:rngBefore === FB.getRngState() };
    })).toEqual({
      same:true,
      axes:{
        dynasty:true,culture:true,faith:true,age:true,tier:true,profession:true,
        health:true,expression:true,unrelatedTrait:true,scar:true,ailment:true,
        bootsIgnoredByBust:true,weaponIgnoredByBust:true,neckIgnoredByBust:true,
        bootsAffectFigure:true,weaponAffectsFigure:true,neckAffectsFigure:true
      },
      stateSame:true,
      rngSame:true
    });
  });

test('busts and figures are pixel-deterministic across appearance families',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      var s=FB.state,source=s.chars[s.player.charId],hashes={},faults=[];
      function pixelHash(canvas) {
        var data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        var hash=2166136261;
        for(var i=0;i<data.length;i+=4){
          hash^=data[i];hash=Math.imul(hash,16777619);
          hash^=data[i+1];hash=Math.imul(hash,16777619);
          hash^=data[i+2];hash=Math.imul(hash,16777619);
          hash^=data[i+3];hash=Math.imul(hash,16777619);
        }
        return hash>>>0;
      }
      function render(c,figure) {
        var canvas=document.createElement('canvas');
        canvas.width=figure?192:96;canvas.height=figure?360:108;
        if(figure)FB.paintPaperDoll(canvas,c,s,{loadout:{}});
        else FB.paintPortrait(canvas,c,s.date.year,{state:s,loadout:{}});
        return pixelHash(canvas);
      }
      var cultures=Object.keys(FBDATA.cultures);
      for(var i=0;i<cultures.length;i++){
        var c=JSON.parse(JSON.stringify(source));c.id='culture-'+cultures[i];
        c.name='Culture '+i;c.culture=cultures[i];
        try{hashes['culture-'+cultures[i]]=render(c,false);}catch(error){faults.push(cultures[i]+': '+error.message);}
      }
      var faithGroups={};
      Object.keys(FBDATA.religions).forEach(function(id){faithGroups[FB.religionOf(id).group]=id;});
      Object.keys(faithGroups).forEach(function(group){
        var c=JSON.parse(JSON.stringify(source));c.id='faith-'+group;c.name='Faith '+group;
        c.religion=faithGroups[group];
        try{hashes['faith-'+group]=render(c,false);}catch(error){faults.push(group+': '+error.message);}
      });
      var marked=JSON.parse(JSON.stringify(source));marked.id='marked';marked.name='Marked';
      marked.health=2;marked.traits=(marked.traits||[]).concat(['scarred','one_eyed']);
      marked.ails=['gash','bruises','head_wound'];
      var bustA=render(marked,false),bustB=render(marked,false);
      var figureA=render(marked,true),figureB=render(marked,true);
      return {faults:faults,allNonzero:Object.keys(hashes).every(function(key){return hashes[key]!==0;}),
        cultureCount:cultures.length,faithCount:Object.keys(faithGroups).length,
        bustSame:bustA===bustB,figureSame:figureA===figureB,bustDiffersFromFigure:bustA!==figureA};
    })).toEqual(expect.objectContaining({
      faults:[],allNonzero:true,bustSame:true,figureSame:true,bustDiffersFromFigure:true
    }));
  });

test('zoomed framing: bust head and figure body fill their frames',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      var s=FB.state,me=s.chars[s.player.charId];
      function alphaMetrics(canvas) {
        var data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        var top=-1,bottom=-1,x,y,rowHas;
        for(y=0;y<canvas.height;y++){
          rowHas=false;
          for(x=0;x<canvas.width;x++){
            if(data[(y*canvas.width+x)*4+3]>0){rowHas=true;break;}
          }
          if(rowHas){if(top<0)top=y;bottom=y;}
        }
        var midWidth=0;
        for(y=Math.floor(canvas.height*.4);y<canvas.height*.6;y++){
          var count=0;
          for(x=0;x<canvas.width;x++){
            if(data[(y*canvas.width+x)*4+3]>0)count++;
          }
          if(count>midWidth)midWidth=count;
        }
        return {top:top/canvas.height,bottom:bottom/canvas.height,
          span:(bottom-top)/canvas.height,midWidth:midWidth/canvas.width};
      }
      var bust=document.createElement('canvas');bust.width=96;bust.height=108;
      FB.paintPortrait(bust,me,s.date.year,{state:s,transparent:true,loadout:{}});
      var figure=document.createElement('canvas');figure.width=192;figure.height=360;
      FB.paintPaperDoll(figure,me,s,{transparent:true,loadout:{}});
      var b=alphaMetrics(bust),f=alphaMetrics(figure);
      return {bustHeadWide:b.midWidth>=0.42,bustFillsBottom:b.bottom>=0.95,
        figureStartsHigh:f.top<=0.11,figureFillsFrame:f.span>=0.83};
    })).toEqual({bustHeadWide:true,bustFillsBottom:true,
      figureStartsHigh:true,figureFillsFrame:true});
  });

test('every active sovereign ruler paints through the normalized v2 path',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      var s=FB.state,faults=[],painted=0;
      FB.clearPortraitCache();
      Object.keys(s.realms).sort().forEach(function(rid){
        var realm=s.realms[rid];
        if(!realm||!realm.alive||rid==='player')return;
        var ruler=FB.realmRulerCharacterSnapshot(s,rid);
        if(!ruler){faults.push(rid+': missing ruler');return;}
        var canvas=document.createElement('canvas');canvas.width=30;canvas.height=36;
        try{FB.paintPortrait(canvas,ruler,s.date.year,{state:s});painted++;}
        catch(error){faults.push(rid+': '+error.message);}
      });
      var entries=FB.portraitCacheStats().entries;
      return {faults:faults,enough:painted>15,bounded:entries<=64,
        exactUntilCapacity:entries===Math.min(64,painted)};
    })).toEqual({faults:[],enough:true,bounded:true,exactUntilCapacity:true});
  });

test('compact atlas distinguishes target hits, atlas hits, misses, LRU, and states',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      var s=FB.state,me=s.chars[s.player.charId];FB.clearPortraitCache();
      function canvas(){var c=document.createElement('canvas');c.width=72;c.height=82;return c;}
      var first=canvas();FB.paintPortrait(first,me,s.date.year,{state:s});
      var cold=FB.portraitCacheStats();
      FB.paintPortrait(first,me,s.date.year,{state:s});var target=FB.portraitCacheStats();
      var second=canvas();FB.paintPortrait(second,me,s.date.year,{state:s});var atlas=FB.portraitCacheStats();
      first.width=71;FB.paintPortrait(first,me,s.date.year,{state:s});var resized=FB.portraitCacheStats();
      for(var i=0;i<65;i++){
        var other=JSON.parse(JSON.stringify(me));other.id='atlas-'+i;other.name='Atlas '+i;
        FB.paintPortrait(canvas(),other,s.date.year,{state:s});
      }
      var full=FB.portraitCacheStats();
      FB.paintPortrait(canvas(),me,s.date.year,{state:s});
      var afterEvicted=FB.portraitCacheStats();
      var replacement=JSON.parse(JSON.stringify(s));
      var replacementMe=replacement.chars[replacement.player.charId];
      FB.paintPortrait(canvas(),replacementMe,replacement.date.year,{state:replacement});
      var reset=FB.portraitCacheStats();
      return {cold:cold,target:target,atlas:atlas,resized:resized,full:full,
        evicted:afterEvicted.entries===64&&afterEvicted.coldRenders===full.coldRenders+1,
        reset:reset};
    })).toEqual({
      cold:{entries:1,bytes:2654208,targetHits:0,atlasHits:0,coldRenders:1,queued:0},
      target:{entries:1,bytes:2654208,targetHits:1,atlasHits:0,coldRenders:1,queued:0},
      atlas:{entries:1,bytes:2654208,targetHits:1,atlasHits:1,coldRenders:1,queued:0},
      resized:{entries:1,bytes:2654208,targetHits:1,atlasHits:2,coldRenders:1,queued:0},
      full:expect.objectContaining({entries:64,bytes:2654208}),
      evicted:true,
      reset:{entries:1,bytes:2654208,targetHits:0,atlasHits:0,coldRenders:1,queued:0}
    });
  });

test('cold face bursts group keys, discard stale waiters, and support immediate mode',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      return new Promise(function (resolve) {
        var s=FB.state,ids=Object.keys(s.chars).filter(function(id){return !s.chars[id].dead;}).slice(0,8);
        var root=document.createElement('div');document.body.appendChild(root);
        function add(id){var c=document.createElement('canvas');c.className='pface';c.dataset.cid=id;
          c.width=72;c.height=82;root.appendChild(c);return c;}
        FB.clearPortraitCache();add(ids[0]);var staleA=add(ids[1]);add(ids[1]);var staleB=add(ids[2]);
        FB.paintFaces(root,s);var queued=FB.portraitCacheStats();
        s.chars[ids[1]].name+=' Changed';
        staleB.remove();
        requestAnimationFrame(function(){requestAnimationFrame(function(){
          var afterStale=FB.portraitCacheStats();root.innerHTML='';FB.clearPortraitCache();
          add(ids[0]);add(ids[1]);add(ids[2]);FB.paintFaces(root,s);
          var replacement=JSON.parse(JSON.stringify(s));
          var replacementCanvas=document.createElement('canvas');replacementCanvas.width=72;replacementCanvas.height=82;
          FB.paintPortrait(replacementCanvas,replacement.chars[replacement.player.charId],
            replacement.date.year,{state:replacement});
          var stateCancelled=FB.portraitCacheStats().queued===0;
          root.innerHTML='';FB.clearPortraitCache();
          for(var i=0;i<ids.length;i++)add(ids[i]);
          FB.paintFaces(root,s,{immediate:true});var immediate=FB.portraitCacheStats();
          root.remove();resolve({queued:queued,afterStale:afterStale,immediate:immediate,
            stateCancelled:stateCancelled,staleCanvasUnstamped:!staleA._fbPortraitStamp});
        });});
      });
    })).toEqual({
      queued:expect.objectContaining({entries:1,coldRenders:1,queued:2}),
      afterStale:expect.objectContaining({entries:1,coldRenders:1,queued:0}),
      immediate:expect.objectContaining({entries:8,coldRenders:8,queued:0}),
      stateCancelled:true,
      staleCanvasUnstamped:true
    });
  });

test('Self and Kin retain portrait nodes and repaint visual-only item changes',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      return new Promise(function (resolve) {
        var s=FB.state,me=s.chars[s.player.charId];
        var defId=Object.keys(FBDATA.items).filter(function(id){
          return FBDATA.items[id].art&&FBDATA.items[id].art.kind==='helm'&&
            FBDATA.items[id].unique===false;
        })[0];
        var ref=FB.grantItem(s,defId,{visualSeed:101,quality:'well'});
        FB.equipItem(s,me.id,'head',ref);FB.ui.showTab('family',{history:false});
        var familyBefore=document.querySelector('#tab-family canvas.pface');
        FB.ui.refresh();requestAnimationFrame(function(){requestAnimationFrame(function(){
          var familyAfter=document.querySelector('#tab-family canvas.pface');
          FB.ui.showTab('char',{history:false});
          var selfBefore=document.querySelector('#tab-char canvas.pface');
          var stampBefore=selfBefore&&selfBefore._fbPortraitStamp;
          s.itemInstances[ref].visualSeed=202;
          FB.ui.refresh();requestAnimationFrame(function(){requestAnimationFrame(function(){
            var selfAfter=document.querySelector('#tab-char canvas.pface');
            resolve({familyPresent:!!familyBefore,selfSame:selfBefore===selfAfter,
              familySame:familyBefore===familyAfter,
              selfRepainted:!!stampBefore&&selfAfter._fbPortraitStamp!==stampBefore});
          });});
        });});
      });
    })).toEqual({familyPresent:true,selfSame:true,familySame:true,selfRepainted:true});
  });

test('full figures wear their gear, inset hand objects, and freeze snapshots',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      var s=FB.state,me=s.chars[s.player.charId];
      var slots={crown:'head',helm:'head',jack:'body',boots:'feet',belt:'waist',
        pendant:'neck',relic:'neck',ring:'ring',sword:'rightHand',seax:'leftHand',
        spear:'rightHand',shield:'leftHand',book:'rightHand',picks:'rightHand',
        chest:'rightHand',generic:'rightHand'};
      function snapshot(kind,seed){
        for(var id in FBDATA.items)if((FBDATA.items[id].art&&FBDATA.items[id].art.kind||'generic')===kind)
          return {ref:'figure-'+kind,defId:id,visualSeed:seed,quality:'masterwork',motif:'fixture'};
        return null;
      }
      function hash(loadout){
        var canvas=document.createElement('canvas');canvas.width=192;canvas.height=360;
        FB.paintPaperDoll(canvas,me,s,{loadout:loadout});
        var data=canvas.getContext('2d').getImageData(0,0,192,360).data,h=2166136261;
        for(var i=0;i<data.length;i+=4){h^=data[i];h=Math.imul(h,16777619);
          h^=data[i+1];h=Math.imul(h,16777619);h^=data[i+2];h=Math.imul(h,16777619);}
        return h>>>0;
      }
      var fixtureGeneric='__portrait_v2_generic';
      FBDATA.items[fixtureGeneric]={name:'Fixture',slot:'hand',unique:true,value:0,fx:{},
        art:{kind:'generic',metals:['#abb2b3'],gems:['#c5a454']}};
      FB.clearPortraitCache();
      var base=hash({}),kinds={},missing=[];
      Object.keys(slots).forEach(function(kind){
        var snap=snapshot(kind,31+kind.length);if(!snap){missing.push(kind);return;}
        var loadout={};loadout[slots[kind]]=snap;
        kinds[kind]=hash(loadout)!==base;
      });
      /* a two-handed object in both hands draws once: the same single
         inset a lone right-hand grip shows */
      var spear2=snapshot('spear',88);
      var sharedOnce=!!spear2&&
        hash({leftHand:spear2,rightHand:spear2})===hash({rightHand:spear2});
      var frozen=snapshot('crown',909),loadout={head:frozen};
      var before=hash(loadout);s.player.loadouts[me.id]={head:snapshot('helm',1)};
      var after=hash(loadout);var stats=FB.portraitCacheStats();delete FBDATA.items[fixtureGeneric];
      return {missing:missing,
        allKindsDiffer:Object.keys(kinds).every(function(k){return kinds[k];}),
        sharedOnce:sharedOnce,
        frozen:before===after,figureEntries:stats.entries,queued:stats.queued};
    })).toEqual({missing:[],allKindsDiffer:true,sharedOnce:true,
      frozen:true,figureEntries:0,queued:0});
  });

test('new-game portrait work is bounded by visible UI, not world population',
  async function ({ page }) {
    await waitForUiRefresh(page);
    expect(await page.evaluate(function () {
      var stats=FB.portraitCacheStats();
      return {bounded:stats.coldRenders<Object.keys(FB.state.chars).length,
        entriesBounded:stats.entries<=64,queuedBounded:stats.queued<=128};
    })).toEqual({bounded:true,entriesBounded:true,queuedBounded:true});
  });

test('same-demographic identities stay visually distinct',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      var s=FB.state,source=s.chars[s.player.charId];
      function pixelHash(canvas) {
        var data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        var hash=2166136261;
        for(var i=0;i<data.length;i+=4){
          hash^=data[i];hash=Math.imul(hash,16777619);
          hash^=data[i+1];hash=Math.imul(hash,16777619);
          hash^=data[i+2];hash=Math.imul(hash,16777619);
          hash^=data[i+3];hash=Math.imul(hash,16777619);
        }
        return hash>>>0;
      }
      var muslimReligion=Object.keys(FBDATA.religions).filter(function(id){
        return FB.religionOf(id).group==='muslim';
      })[0];
      function pool(label,mutate) {
        var seen={},axes={beardCut:{},eyeShape:{},browKind:{},noseKind:{},
          hairStyle:{},headwearVariant:{}};
        var distinct=true,i;
        for(i=0;i<12;i++){
          var c=JSON.parse(JSON.stringify(source));
          c.id=label+'-'+i;c.name=label+' '+i;
          c.sex='m';c.born=s.date.year-34;c.dyn='One House';
          c.traits=[];delete c.ails;c.health=8;
          if(mutate)mutate(c);
          var canvas=document.createElement('canvas');canvas.width=96;canvas.height=108;
          FB.paintPortrait(canvas,c,s.date.year,{state:s,tier:4,loadout:{}});
          var hash=pixelHash(canvas);
          if(seen[hash])distinct=false;
          seen[hash]=true;
          var look=FB.characterLook(c,s.date.year,s,{tier:4,loadout:{}});
          axes.beardCut[look.beardCut]=true;axes.eyeShape[look.eyeShape]=true;
          axes.browKind[look.browKind]=true;axes.noseKind[look.noseKind]=true;
          axes.hairStyle[look.hairStyle]=true;
          axes.headwearVariant[look.headwearVariant]=true;
        }
        var varied=Object.keys(axes).filter(function(axis){
          return Object.keys(axes[axis]).length>1;
        });
        return {distinct:distinct,variedAxes:varied.length};
      }
      var base=pool('distinct',null);
      var court=pool('emir',function(c){
        c.culture='arabic';
        if(muslimReligion)c.religion=muslimReligion;
      });
      return {baseDistinct:base.distinct,baseVaried:base.variedAxes>=3,
        courtDistinct:court.distinct,courtVaried:court.variedAxes>=2};
    })).toEqual({baseDistinct:true,baseVaried:true,
      courtDistinct:true,courtVaried:true});
  });

test('face-framing headwear leaves the eyes readable',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      var s=FB.state,source=s.chars[s.player.charId];
      function findCovered() {
        for(var i=0;i<60;i++){
          var c=JSON.parse(JSON.stringify(source));
          c.id='veiled-'+i;c.name='Veiled '+i;
          c.sex='f';c.born=s.date.year-52;c.traits=[];delete c.ails;c.health=8;
          var look=FB.characterLook(c,s.date.year,s,{tier:2,loadout:{}});
          if(look.headwear==='wimple'||look.headwear==='veil'||
            look.headwear==='kerchief'){
            return {c:c,look:look};
          }
        }
        return null;
      }
      var found=findCovered();
      if(!found)return {found:false};
      var canvas=document.createElement('canvas');canvas.width=96;canvas.height=108;
      FB.paintPortrait(canvas,found.c,s.date.year,{state:s,tier:2,loadout:{}});
      var data=canvas.getContext('2d').getImageData(0,0,96,108).data;
      /* the iris, lashes, and nostrils guarantee dark ink inside the
         face box; an opaque linen blob over the face has none */
      var dark=0,x,y;
      for(y=42;y<72;y++){
        for(x=30;x<66;x++){
          var at=(y*96+x)*4;
          if(data[at]+data[at+1]+data[at+2]<210)dark++;
        }
      }
      return {found:true,covers:found.look.coversHair===true,
        eyesReadable:dark>0};
    })).toEqual({found:true,covers:true,eyesReadable:true});
  });

test('bandaged wounds dress over the hair and headwear pass',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      var s=FB.state,source=s.chars[s.player.charId];
      var c=JSON.parse(JSON.stringify(source));
      c.id='dressed';c.name='Dressed';c.sex='m';c.born=s.date.year-30;
      c.traits=[];c.health=8;c.ails=['head_wound'];
      var canvas=document.createElement('canvas');canvas.width=96;canvas.height=108;
      FB.paintPortrait(canvas,c,s.date.year,{state:s,tier:4,loadout:{}});
      var data=canvas.getContext('2d').getImageData(0,0,96,108).data;
      /* the linen strip or wrap sits in the upper face band */
      var linen=0,x,y;
      for(y=24;y<56;y++){
        for(x=22;x<74;x++){
          var at=(y*96+x)*4;
          if(data[at]>195&&data[at+1]>185&&data[at+2]>150&&
            data[at]-data[at+2]<62)linen++;
        }
      }
      return {dressed:linen>8};
    })).toEqual({dressed:true});
  });

test('equipped crowns and helms render through the wardrobe constructions',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      var s=FB.state,source=s.chars[s.player.charId];
      function itemKind(kind) {
        for(var id in FBDATA.items){
          if(FBDATA.items[id].art&&FBDATA.items[id].art.kind===kind){
            return {ref:'fixture-'+kind,defId:id,visualSeed:11,
              quality:'well',motif:''};
          }
        }
        return null;
      }
      var helm=itemKind('helm'),crown=itemKind('crown');
      if(!helm||!crown)return {present:false};
      var c=JSON.parse(JSON.stringify(source));
      c.id='helmed';c.name='Helmed';c.sex='m';c.born=s.date.year-30;
      c.traits=[];delete c.ails;c.health=8;
      function render(loadout) {
        var canvas=document.createElement('canvas');
        canvas.width=96;canvas.height=108;
        FB.paintPortrait(canvas,c,s.date.year,{state:s,tier:2,loadout:loadout});
        return canvas.getContext('2d').getImageData(0,0,96,108).data;
      }
      var helmed=render({head:helm});
      /* the helm construction seats on the skull and reaches the brow,
         so the scalp band reads as metal, not skin or a floating cap */
      var metal=0,x,y,at;
      for(y=36;y<46;y++){
        for(x=40;x<56;x++){
          at=(y*96+x)*4;
          if(Math.abs(helmed[at]-helmed[at+2])<32)metal++;
        }
      }
      var crowned=render({head:crown});
      /* the crown construction is a warm metal rim at the hairline */
      var gold=0;
      for(y=28;y<52;y++){
        for(x=26;x<70;x++){
          at=(y*96+x)*4;
          if(crowned[at]>190&&crowned[at]-crowned[at+2]>110)gold++;
        }
      }
      return {present:true,metalScalp:metal>120,goldRim:gold>12};
    })).toEqual({present:true,metalScalp:true,goldRim:true});
  });

test('long-headed busts keep their shoulders in frame',
  async function ({ page }) {
    expect(await page.evaluate(function () {
      var s=FB.state,source=s.chars[s.player.charId];
      var worst=null,i;
      /* the longest projected face in a deterministic pool is the one
         that used to push its chin and shoulders out of the frame */
      for(i=0;i<24;i++){
        var c=JSON.parse(JSON.stringify(source));
        c.id='long-'+i;c.name='Long '+i;c.sex='m';c.born=s.date.year-72;
        c.traits=[];delete c.ails;c.health=8;
        var look=FB.characterLook(c,s.date.year,s,{tier:2,loadout:{}});
        var length=look.faceWidth*(1+look.chin);
        if(!worst||length>worst.length)worst={c:c,length:length};
      }
      var canvas=document.createElement('canvas');
      canvas.width=96;canvas.height=108;
      FB.paintPortrait(canvas,worst.c,s.date.year,
        {state:s,tier:2,transparent:true,loadout:{}});
      var data=canvas.getContext('2d').getImageData(0,0,96,108).data;
      var count=0,x;
      for(x=0;x<96;x++){
        if(data[(103*96+x)*4+3]>0)count++;
      }
      return {shoulders:count/96>=.5};
    })).toEqual({shoulders:true});
  });
