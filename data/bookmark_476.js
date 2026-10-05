/* Spring 476 regional bookmark. The borrowed county grid is a geographic
   scaffold, not a claim that later county borders existed in this period.
   Period county names come from the geography base's names by year
   (data/geographies.js); the period county heads are the 476 settlement
   layout in data/settlements.js. */
window.FBDATA = window.FBDATA || {};
(function () {
  'use strict';
  var base = FBDATA.bookmarks['867'];
  var regions = {
    italy:'italy', papacy:'italy', benevento:'italy', venice:'italy',
    sardinia:'italy', croatia:'croatia', byzantium:'byzantium',
    aquitaine:'aquitaine', west_francia:'west_francia', burgundy:'burgundy',
    aghlabids:'aghlabids', pannonia:'pannonia',
    brittany:'armorica_476', asturias:'aquitaine', navarra:'aquitaine',
    cordoba:'aquitaine', rustamids:'mauri_476',
    idrisids:'mauri_476', lotharingia:'west_francia',
    bulgaria:'byzantium', serbia:'croatia'
  };
  var northernFranks = { bruges:1, ghent:1, boulogne:1, arras:1,
    reims:1, amiens:1, st_quentin:1, laon:1 };
  var suebi = { coruna:1, santiago:1, ourense:1, lugo:1 };
  var easternMarch = { pliska:1, silistra:1, vidin:1, serdica:1,
    philippopolis:1, skopje:1, ohrid:1 };
  var dalmatianMarch = { kotor:1 };
  var romanGaul = { paris:1, chartres:1, sens:1, orleans:1,
    rouen:1, caen:1, evreux:1, bayeux:1, angers:1, tours:1,
    le_mans:1, blois:1, bourges:1, troyes:1, chalons:1,
    metz:1, verdun:1, nancy:1 };
  var alpineBurgundy = { strasbourg:1, basel:1, geneva:1 };
  var rhenishFranks = { aachen:1, trier:1, luxembourg:1,
    liege:1, cologne:1 };
  var realms = [
    { id:'italy', name:'Western Roman Court', color:'#9c5647', capital:'ravenna',
      aggression:0, rank:4, religion:'nicene', techTraditions:['latin'],
      government:'roman_civic',
      ruler:{ name:'Romulus Augustulus', sex:'m', culture:'roman', born:461, mar:3, trait:'patient' } },
    { id:'croatia', name:'Dalmatian Roman Court', color:'#7b699b', capital:'split',
      aggression:0, rank:3, religion:'nicene', techTraditions:['latin','byzantine'],
      government:'roman_civic',
      ruler:{ name:'Julius Nepos', sex:'m', culture:'roman', born:430, mar:9, trait:'proud' } },
    { id:'byzantium', name:'Eastern Roman Court', color:'#a04fb0', capital:'constantinople',
      aggression:0, rank:4, religion:'chalcedonian', techTraditions:['byzantine'],
      government:'roman_civic',
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
    { id:'suebi_476', name:'Suevic Kingdom', color:'#667b59', capital:'coruna',
      aggression:0, rank:3, religion:'homoian',
      ruler:{ name:'Suevic Court Delegate', sex:'m', culture:'gothic', born:440, mar:8, trait:'patient' } },
    { id:'armorica_476', name:'Armorican Communities', color:'#69908d', capital:'rennes',
      aggression:0, rank:2, religion:'nicene',
      ruler:{ name:'Armorican Delegate', sex:'m', culture:'brezhon', born:440, mar:5, trait:'patient' } },
    { id:'mauri_476', name:'Moorish Communities', color:'#a98255', capital:'constantine',
      aggression:0, rank:2, religion:'berber_traditional',
      ruler:{ name:'Moorish Delegate', sex:'m', culture:'berber', born:440, mar:6, trait:'patient' } },
    { id:'rhein_franks_476', name:'Rhenish Franks', color:'#708f9b', capital:'cologne',
      aggression:0, rank:2, religion:'germanic_pagan',
      ruler:{ name:'Rhenish Chieftain', sex:'m', culture:'frankish', born:440, mar:8, trait:'patient' } },
    { id:'federates_476', name:'Federate Host in Italy', color:'#717d65', capital:'pavia',
      nonTerritorial:true, aggression:0, rank:1, religion:'homoian',
      government:'federate_polity',
      ruler:{ name:'Odoacer', sex:'m', culture:'gothic', born:433, mar:12, trait:'ambitious' } }
  ];
  /* These are ruling institutions, distinct from the community seed below. */
  realms.forEach(function (r) {
    r.governingIdentity = { eliteCultureId:r.ruler.culture, eliteFaithId:r.religion,
      legalIdentityId:r.ruler.culture === 'gothic' ? 'gothic_custom' :
        r.ruler.culture === 'roman' || r.ruler.culture === 'greek' ? 'late_roman' : 'customary',
      tolerance:'preference', taxation:'equal', justicePolicy:'personal' };
  });
  var provincialCourts = { ravenna:1, roma:1, split:1, paris:1, toulouse:1, tunis:1,
    constantinople:1 };
  var provinces = base.provinces.map(function (source) {
    var p = Object.assign({}, source);
    if (!regions[source.realm] || source.wasteland) {
      return { id:source.id, name:source.name, x:source.x, y:source.y,
        terrain:source.terrain, wasteland:true };
    }
    p.realm = northernFranks[p.id] ? 'franks_476' :
      suebi[p.id] ? 'suebi_476' :
      romanGaul[p.id] ? 'west_francia' :
      alpineBurgundy[p.id] ? 'burgundy' :
      rhenishFranks[p.id] ? 'rhein_franks_476' :
      easternMarch[p.id] ? 'byzantium' :
      dalmatianMarch[p.id] ? 'croatia' :
      source.realm === 'west_francia' &&
        ['barcelona','girona','urgell'].indexOf(p.id) >= 0 ? 'aquitaine' :
      regions[source.realm];
    if (source.realm === 'bulgaria' && !easternMarch[p.id] ||
        source.realm === 'serbia' && !dalmatianMarch[p.id] ||
        source.realm === 'lotharingia' && !romanGaul[p.id] &&
          !alpineBurgundy[p.id] && !rhenishFranks[p.id]) {
      return { id:source.id, name:source.name, x:source.x, y:source.y,
        terrain:source.terrain, wasteland:true };
    }
    p.settlements = undefined;
    if (provincialCourts[p.id]) p.customaryRights = ['peace','revenue'].map(function (power) {
      return { power:power, basis:'tenure', basisRef:'provincial_court_476:' + p.id };
    });
    p.culture = p.realm === 'franks_476' ||
      p.realm === 'rhein_franks_476' ? 'frankish' :
      p.realm === 'pannonia' ? 'gothic' :
      p.realm === 'armorica_476' ? 'brezhon' :
      p.realm === 'mauri_476' ? 'berber' :
      p.realm === 'byzantium' ? 'greek' : 'roman';
    p.religion = p.realm === 'franks_476' ||
      p.realm === 'rhein_franks_476' ? 'germanic_pagan' :
      p.realm === 'mauri_476' ? 'berber_traditional' :
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
    if (p.realm === 'suebi_476') {
      p.communities = [
        { culture:'roman', religion:'nicene', populationShare0:7500 },
        { culture:'gothic', religion:'homoian', paired:true, populationShare0:2500 }
      ];
      p.culture = 'roman'; p.religion = 'nicene';
    }
    if (p.realm === 'mauri_476') {
      p.communities = [
        { culture:'berber', religion:'berber_traditional', populationShare0:7000 },
        { culture:'roman', religion:'nicene', paired:true, populationShare0:3000 }
      ];
    }
    if (p.realm === 'armorica_476') {
      p.communities = [
        { culture:'brezhon', religion:'nicene', populationShare0:7000 },
        { culture:'roman', religion:'nicene', paired:true, populationShare0:3000 }
      ];
    }
    if (p.realm === 'croatia') {
      p.communities = [
        { culture:'roman', religion:'nicene', populationShare0:8000 },
        { culture:'slavic', religion:'slavic_pagan', paired:true,
          populationShare0:2000 }
      ];
    }
    if (source.realm === 'cordoba' || source.realm === 'asturias' ||
        source.realm === 'navarra' ||
        ['barcelona','girona','urgell'].indexOf(p.id) >= 0) {
      if (p.realm !== 'suebi_476') {
        p.communities = [
          { culture:'iberian', religion:'nicene', populationShare0:8000 },
          { culture:'gothic', religion:'homoian', paired:true, populationShare0:2000 }
        ];
        p.culture = 'iberian'; p.religion = 'nicene';
      }
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
      p.settlements = [
        { site:'salona_476', name:'Salona', kind:'city' },
        { site:'split', name:'Spalatum', kind:'village' }
      ];
      p.dev = 6;
    } else if (p.id === 'tunis') {
      p.settlements = [{ site:'carthage_476', name:'Carthage', kind:'city' }];
      p.dev = 7;
    } else if (p.id === 'kairouan') {
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
  if (settled.siracusa && settled.tunis) {
    keptStraits.push(['siracusa','tunis']);
    crossingClasses['siracusa|tunis'] = 'open';
  }
  FBDATA.bookmarks['476'] = {
    id:'476', name:'The Last Western Court',
    desc:'An emperor sits at Ravenna while federate soldiers demand a settlement.',
    date:{ year:476, season:0, day:1 }, era:'late_antique',
    geography:'europe_regional',
    religiousHeads:{},
    systems:{ disable:['papacy','scutage','manorial_tenure','excommunication',
      'feudal_service','crown_bloc','tournaments','great_holy_wars'] },
    stories:['western_court_476'],
    provinces:provinces, realms:realms,
    duchies:Object.assign({}, base.duchies),
    kingdoms:Object.assign({}, base.kingdoms),
    empires:Object.assign({}, base.empires),
    straits:keptStraits, crossingClasses:crossingClasses, scripted:[]
  };
})();
