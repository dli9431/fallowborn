/* Spring 476 prototype. The borrowed county grid is a geographic scaffold;
   only these connected Roman, federate, Gothic, Frankish and Vandal regions
   are inhabited in this bounded slice. All records are bookmark-local. */
window.FBDATA = window.FBDATA || {};
(function () {
  'use strict';
  var base = FBDATA.bookmarks['867'];
  var regions = {
    italy:'italy', papacy:'italy', benevento:'italy', venice:'italy',
    sardinia:'italy', croatia:'croatia', byzantium:'byzantium',
    aquitaine:'aquitaine', west_francia:'west_francia', burgundy:'burgundy',
    aghlabids:'aghlabids', pannonia:'pannonia'
  };
  var northernFranks = { bruges:1, ghent:1, boulogne:1, arras:1 };
  var realms = [
    { id:'italy', name:'Western Roman Court', color:'#9c5647', capital:'ravenna',
      aggression:0, rank:4, religion:'nicene', techTraditions:['latin'],
      ruler:{ name:'Romulus Augustulus', sex:'m', culture:'roman', born:461, mar:3, trait:'patient' } },
    { id:'croatia', name:'Dalmatian Roman Court', color:'#7b699b', capital:'split',
      aggression:0, rank:3, religion:'nicene', techTraditions:['latin','byzantine'],
      ruler:{ name:'Julius Nepos', sex:'m', culture:'roman', born:430, mar:9, trait:'proud' } },
    { id:'byzantium', name:'Eastern Roman Court', color:'#a04fb0', capital:'constantinople',
      aggression:0, rank:4, religion:'chalcedonian', techTraditions:['byzantine'],
      ruler:{ name:'Basiliscus', sex:'m', culture:'greek', born:430, mar:8, trait:'proud' } },
    { id:'west_francia', name:'Roman Domain in Gaul', color:'#758aa0', capital:'paris',
      aggression:0, rank:3, religion:'nicene', techTraditions:['latin'],
      ruler:{ name:'Syagrius', sex:'m', culture:'roman', born:430, mar:9, trait:'patient' } },
    { id:'franks_476', name:'Salian Franks', color:'#5e7b92', capital:'arras',
      aggression:1, rank:3, religion:'germanic_pagan',
      ruler:{ name:'Childeric', sex:'m', culture:'frankish', born:440, mar:10, trait:'ambitious' } },
    { id:'aquitaine', name:'Visigothic Kingdom', color:'#ba8655', capital:'toulouse',
      aggression:1, rank:3, religion:'homoian', techTraditions:['latin'],
      ruler:{ name:'Euric', sex:'m', culture:'gothic', born:425, mar:13, trait:'ambitious' } },
    { id:'burgundy', name:'Burgundian Court', color:'#8c9659', capital:'vienne',
      aggression:0, rank:3, religion:'homoian',
      ruler:{ name:'Gundobad', sex:'m', culture:'gothic', born:445, mar:9, trait:'patient' } },
    { id:'aghlabids', name:'Vandal Kingdom', color:'#b59b48', capital:'tunis',
      aggression:1, rank:3, religion:'homoian', techTraditions:['latin'],
      ruler:{ name:'Gaiseric', sex:'m', culture:'gothic', born:389, mar:12, trait:'ambitious' } },
    { id:'pannonia', name:'Ostrogothic Confederation', color:'#809b73', capital:'szekesfehervar',
      aggression:1, rank:3, religion:'homoian',
      ruler:{ name:'Theoderic the Amal', sex:'m', culture:'gothic', born:454, mar:12, trait:'ambitious' } },
    { id:'federates_476', name:'Federate Host in Italy', color:'#717d65', capital:'pavia',
      nonTerritorial:true, aggression:0, rank:1, religion:'homoian',
      ruler:{ name:'Odoacer', sex:'m', culture:'gothic', born:433, mar:12, trait:'ambitious' } }
  ];
  var provinces = base.provinces.map(function (source) {
    var p = Object.assign({}, source);
    if (!regions[source.realm] || source.wasteland) {
      return { id:source.id, name:source.name, x:source.x, y:source.y,
        terrain:source.terrain, wasteland:true };
    }
    p.realm = northernFranks[p.id] ? 'franks_476' : regions[source.realm];
    p.settlements = undefined;
    p.culture = p.realm === 'franks_476' ? 'frankish' :
      p.realm === 'pannonia' ? 'gothic' :
      p.realm === 'byzantium' ? 'greek' : 'roman';
    p.religion = p.realm === 'franks_476' ? 'germanic_pagan' :
      p.realm === 'pannonia' ? 'homoian' :
      p.realm === 'byzantium' ? 'chalcedonian' : 'nicene';
    p.communities = [{ culture:p.culture, religion:p.religion,
      populationShare0:10000 }];
    if (p.realm === 'aquitaine' || p.realm === 'burgundy' ||
        p.realm === 'aghlabids' || p.id === 'ravenna' || p.id === 'pavia') {
      p.communities = [
        { culture:'roman', religion:'nicene', populationShare0:8000 },
        { culture:'gothic', religion:'homoian', paired:true,
          populationShare0:2000 }
      ];
      p.culture = 'roman'; p.religion = 'nicene';
    }
    if (p.realm === 'croatia') {
      p.communities = [
        { culture:'roman', religion:'nicene', populationShare0:8000 },
        { culture:'slavic', religion:'slavic_pagan', paired:true,
          populationShare0:2000 }
      ];
    }
    if (p.id === 'constantinople') {
      p.communities = [
        { culture:'greek', religion:'chalcedonian', populationShare0:8500 },
        { culture:'greek', religion:'miaphysite', populationShare0:1500 }
      ];
    }
    if (p.id === 'ravenna') {
      p.settlements = [
        { site:'ravenna_476', name:'Ravenna', kind:'city' },
        { site:'classis_476', name:'Classis', kind:'town' }
      ];
      p.dev = 7;
    } else if (p.id === 'pavia') {
      p.settlements = [{ site:'pavia', name:'Ticinum', kind:'town' }];
      p.dev = 5;
    } else if (p.id === 'split') {
      p.name = 'Salona';
      p.settlements = [
        { site:'salona_476', name:'Salona', kind:'city' },
        { site:'split', name:'Spalatum', kind:'village' }
      ];
      p.dev = 6;
    } else if (p.id === 'tunis') {
      p.name = 'Carthage';
      p.settlements = [{ site:'carthage_476', name:'Carthage', kind:'city' }];
      p.dev = 7;
    } else if (p.id === 'kairouan') {
      p.name = 'Byzacena';
      p.settlements = [{ site:'sufetula_476', name:'Sufetula', kind:'town' }];
      p.dev = 3;
    } else if (p.id === 'constantinople') {
      p.settlements = [{ site:'constantinople', name:'Constantinople', kind:'city' }];
      p.dev = 9;
    } else if (p.id === 'toulouse' || p.id === 'arles' ||
               p.id === 'vienne' || p.id === 'arras' || p.id === 'paris' ||
               p.id === 'szekesfehervar') {
      p.settlements = [{ site:p.id + '_476', name:p.name, kind:'town' }];
    } else if (p.id === 'roma') {
      p.settlements = [{ site:'roma', name:'Rome', kind:'city' },
        { site:'ostia', name:'Ostia', kind:'town' }];
      p.dev = 8;
    }
    return p;
  });
  FBDATA.settlementSites.ravenna_476 = { x:12.201, y:44.418 };
  FBDATA.settlementSites.classis_476 = { x:12.24, y:44.38 };
  FBDATA.settlementSites.salona_476 = { x:16.483426, y:43.539561 };
  FBDATA.settlementSites.carthage_476 = { x:10.325, y:36.8528 };
  FBDATA.settlementSites.sufetula_476 = { x:9.12, y:35.24 };
  FBDATA.settlementSites.toulouse_476 = { x:1.44, y:43.6 };
  FBDATA.settlementSites.arles_476 = { x:4.63, y:43.68 };
  FBDATA.settlementSites.vienne_476 = { x:4.87, y:45.53 };
  FBDATA.settlementSites.arras_476 = { x:2.78, y:50.29 };
  FBDATA.settlementSites.paris_476 = { x:2.35, y:48.85 };
  FBDATA.settlementSites.szekesfehervar_476 = { x:18.41, y:47.19 };
  var settled = {}, keptStraits = [], crossingClasses = {};
  provinces.forEach(function (province) {
    if (!province.wasteland) settled[province.id] = true;
  });
  base.straits.forEach(function (pair) {
    if (!settled[pair[0]] || !settled[pair[1]]) return;
    keptStraits.push(pair.slice());
    var key = pair[0] < pair[1] ? pair[0] + '|' + pair[1] :
      pair[1] + '|' + pair[0];
    if (base.crossingClasses[key]) crossingClasses[key] = base.crossingClasses[key];
  });
  FBDATA.bookmarks['476'] = {
    id:'476', name:'The Last Western Court',
    desc:'An emperor sits at Ravenna while federate soldiers demand a settlement.',
    date:{ year:476, season:0, day:1 }, religiousHeads:{},
    greatHolyWars:false,
    provinces:provinces, realms:realms,
    duchies:Object.assign({}, base.duchies),
    kingdoms:Object.assign({}, base.kingdoms),
    empires:Object.assign({}, base.empires),
    straits:keptStraits, crossingClasses:crossingClasses, scripted:[]
  };
})();
