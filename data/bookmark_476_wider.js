/* Spring 476 regional completion. Political and settlement declarations use
   existing public contracts. District labels do not assert a later city's
   existence. Shares, development and unnamed officials are simulation choices. */
(function () {
  'use strict';
  var b = FBDATA.bookmarks['476'];
  var region = { provinces:[], realms:[], institutions:{}, phases:{} };
  FBDATA.bookmarkRegions476.wider = region;
  var seeds = {}, additions = {}, climates = Object.assign({}, b.climate.provinces);
  FBDATA.geographies.europe_regional.provinces.forEach(function (p) { seeds[p.id] = p; });
  var layout = JSON.parse(JSON.stringify(FBDATA.settlementLayouts['476']));
  FBDATA.settlementLayouts['476_wider_v2'] = layout;
  var opening = JSON.parse(JSON.stringify(b.opening));
  var duchies = Object.assign({}, b.duchies);
  var kingdoms = Object.assign({}, b.kingdoms);
  kingdoms.k_476_egypt = { name:'Egypt', empire:'e_476_east' };
  /* Administrative groupings have no generated feudal holder hierarchy. */
  duchies.d_476_egypt = { name:'Egyptian provinces', kingdom:'k_476_egypt' };
  duchies.d_476_crete = { name:'Crete', kingdom:'k_476_macedonia' };
  duchies.d_476_cyprus = { name:'Cyprus', kingdom:'k_476_oriens' };
  duchies.d_476_pontus = { name:'Pontic coast', kingdom:'k_476_pontica' };

  function county(phase, row) {
    var id = row[0], name = row[1], owner = row[2], culture = row[3], religion = row[4];
    var p = { id:id, name:name, names:[{from:375,to:649,name:name}], realm:owner,
      culture:culture, religion:religion, dev:row[5],
      customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}],
      communities:row[7] || [{culture:culture,religion:religion,populationShare0:10000}] };
    if (row[8]) p.duchy = row[8];
    var site = id + '_wider_476', seed = seeds[id];
    if (!seed || additions[id]) throw new Error('Invalid regional county declaration: ' + id);
    var position = row[9] || [seed.x, seed.y];
    FBDATA.settlementSites[site] = { x:position[0], y:position[1], names:[{from:375,to:649,name:name}] };
    layout[id] = [{site:site,name:name,kind:row[10] || (p.dev >= 4 ? 'city' : p.dev >= 2 ? 'town' : 'village')}];
    climates[id] = row[6];
    additions[id] = p;
    region.provinces.push(p);
    (region.phases[phase] || (region.phases[phase] = [])).push(id);
  }
  var egypt = [
    {culture:'coptic',religion:'miaphysite',populationShare0:7000},
    {culture:'greek',religion:'chalcedonian',paired:true,populationShare0:2000},
    {culture:'greek',religion:'miaphysite',paired:true,populationShare0:1000}
  ];
  [
    ['candia','Gortyna','byzantium','greek','chalcedonian',3,'mediterranean',null,'d_476_crete',[24.95,35.06]],
    ['trebizond','Trapezus','byzantium','greek','chalcedonian',3,'mediterranean',null,'d_476_pontus'],
    ['nicosia','Tamassos','byzantium','greek','chalcedonian',2,'mediterranean',null,'d_476_cyprus',[33.24,35.03]],
    ['barqa','Barce district','byzantium','greek','chalcedonian',2,'mediterranean',null,'d_476_egypt'],
    ['alexandria','Alexandria','byzantium','greek','miaphysite',6,'mediterranean',[
      {culture:'greek',religion:'miaphysite',populationShare0:5000},
      {culture:'coptic',religion:'miaphysite',populationShare0:3000},
      {culture:'greek',religion:'chalcedonian',populationShare0:2000}],'d_476_egypt'],
    ['rosetta','Bolbitine mouth','byzantium','coptic','miaphysite',2,'mediterranean',egypt,'d_476_egypt'],
    ['fustat','Babylon of Egypt','byzantium','coptic','miaphysite',4,'arid',egypt,'d_476_egypt',[31.23,30.01]],
    ['fayyum','Arsinoe','byzantium','coptic','miaphysite',4,'arid',egypt,'d_476_egypt'],
    ['asyut','Lycopolis','byzantium','coptic','miaphysite',3,'arid',egypt,'d_476_egypt'],
    ['luxor','Theban communities','byzantium','coptic','miaphysite',3,'arid',egypt,'d_476_egypt'],
    ['aswan','Syene','byzantium','coptic','miaphysite',2,'arid',egypt,'d_476_egypt'],
    ['ras','Upper Ibar district','byzantium','roman','chalcedonian',1,'continental',null,'d_476_dardania'],
    ['bosna','Bosna valley communities','croatia','roman','nicene',1,'continental',null,'d_476_dalmatia']
  ].forEach(function (row) { county('roman', row); });

  /* Generated civil delegates use existing appointment transactions. Timothy
     retains the same institution and episcopal office; no second see is made. */
  ['candia','trebizond','nicosia','barqa','alexandria','rosetta','fustat','fayyum','asyut','luxor','aswan','ras','bosna'].forEach(function (id) {
    var p = additions[id], actor = id + '_civil_delegate';
    opening.actors[actor] = { sex:'m', culture:p.culture, religion:p.religion, born:435,
      station:3, role:'notable', home:id, skills:{ste:8,dip:8} };
    opening.appointments[actor] = {officeId:'praeses',actorId:actor,realmId:p.realm,scope:{kind:'county',id:id}};
  });
  region.institutions.alexandria_see = Object.assign({}, b.localInstitutions.alexandria_see,
    {provinceId:'alexandria',site:'alexandria_wider_476'});
  ['alexandria','fustat','fayyum','trebizond','candia','nicosia'].forEach(function (id) {
    var p = additions[id];
    region.institutions[id + '_council_476'] = {city:p.name,kind:'council',provinceId:id,
      site:id + '_wider_476',culture:p.culture,religion:p.religion};
  });

  /* New identities retain regional uncertainty; their name pools supply
     generated people and do not identify historical incumbents. */
  var groups = [
    {"phase":"caucasus","realm":{"id":"sasanian_476","name":"","capital":"","government":"aristocratic_monarchy","rank":1,"aggression":0,"religion":"caucasian_christian_476"},"culture":"armenian","faith":"caucasian_christian_476","zone":"continental","rows":[["van","Tushpa district","2"],["ani","Akhurian district","1"],["kars","Kars plateau","1"],["dvin","Dvin","3"]],"existing":true},
    {"phase":"caucasus","realm":{"id":"kartli_476","name":"Kartlian Court","capital":"tbilisi","government":"lineage_kingship","rank":1,"aggression":0,"religion":"caucasian_christian_476","color":"#748957","ruler":{"generated":true,"sex":"m","culture":"georgian","born":440,"mar":7,"trait":"patient"}},"culture":"georgian","faith":"caucasian_christian_476","zone":"continental","rows":[["tbilisi","Mtskheta district","2"]],"existing":false},
    {"phase":"caucasus","realm":{"id":"lazica_476","name":"Lazican Court","capital":"kutaisi","government":"regnum","rank":1,"aggression":0,"religion":"caucasian_christian_476","color":"#658e92","ruler":{"generated":true,"sex":"m","culture":"georgian","born":440,"mar":7,"trait":"patient"}},"culture":"georgian","faith":"caucasian_christian_476","zone":"mediterranean","rows":[["kutaisi","Kutais","2"]],"existing":false},
    {"phase":"caucasus","realm":{"id":"abazgia_476","name":"Abazgian Communities","capital":"sukhumi","government":"regnum","rank":1,"aggression":0,"religion":"caucasian_traditional_476","color":"#977f9c","ruler":{"generated":true,"sex":"m","culture":"georgian","born":440,"mar":7,"trait":"patient"}},"culture":"georgian","faith":"caucasian_traditional_476","zone":"mediterranean","rows":[["sukhumi","Sebastopolis district","2"]],"existing":false},
    {"phase":"caucasus","realm":{"id":"caucasus_passes_476","name":"Northern Caucasian Communities","capital":"magas","government":"lineage_kingship","rank":1,"aggression":0,"religion":"steppe_traditional_476","color":"#b09261","ruler":{"generated":true,"sex":"m","culture":"alan_476","born":440,"mar":7,"trait":"patient"}},"culture":"alan_476","faith":"steppe_traditional_476","zone":"continental","rows":[["magas","Northern Caucasian foothills","1"]],"existing":false},
    {"phase":"islands","realm":{"id":"tay_476","name":"Tay Communities","capital":"scone","government":"lineage_kingship","rank":1,"aggression":0,"religion":"insular_traditional_476","color":"#7386a1","ruler":{"generated":true,"sex":"m","culture":"pictish_476","born":440,"mar":7,"trait":"patient"}},"culture":"pictish_476","faith":"insular_traditional_476","zone":"northern_temperate","rows":[["scone","Tay valley","1"],["dundee","Tay estuary","1"]],"existing":false},
    {"phase":"islands","realm":{"id":"dee_476","name":"Dee Communities","capital":"aberdeen","government":"lineage_kingship","rank":1,"aggression":0,"religion":"insular_traditional_476","color":"#ad796c","ruler":{"generated":true,"sex":"m","culture":"pictish_476","born":440,"mar":7,"trait":"patient"}},"culture":"pictish_476","faith":"insular_traditional_476","zone":"northern_temperate","rows":[["aberdeen","Dee and Don districts","1"]],"existing":false},
    {"phase":"islands","realm":{"id":"moray_476","name":"Moray Communities","capital":"elgin","government":"lineage_kingship","rank":1,"aggression":0,"religion":"insular_traditional_476","color":"#81936c","ruler":{"generated":true,"sex":"m","culture":"pictish_476","born":440,"mar":7,"trait":"patient"}},"culture":"pictish_476","faith":"insular_traditional_476","zone":"northern_temperate","rows":[["elgin","Moray coast","1"],["inverness","Inner Moray Firth","1"]],"existing":false},
    {"phase":"islands","realm":{"id":"hebrides_476","name":"Hebridean Communities","capital":"lewis","government":"lineage_kingship","rank":1,"aggression":0,"religion":"insular_traditional_476","color":"#92745c","ruler":{"generated":true,"sex":"m","culture":"pictish_476","born":440,"mar":7,"trait":"patient"}},"culture":"pictish_476","faith":"insular_traditional_476","zone":"northern_temperate","rows":[["iona","Western island households","1"],["lewis","Outer island households","1"]],"existing":false},
    {"phase":"islands","realm":{"id":"man_476","name":"Manx Communities","capital":"man","government":"lineage_kingship","rank":1,"aggression":0,"religion":"nicene","color":"#748957","ruler":{"generated":true,"sex":"m","culture":"brittonic","born":440,"mar":7,"trait":"patient"}},"culture":"brittonic","faith":"nicene","zone":"northern_temperate","rows":[["man","Island of Man","1"]],"existing":false},
    {"phase":"islands","realm":{"id":"ulaid_local_476","name":"Eastern Ulster Communities","capital":"ulaid","government":"lineage_kingship","rank":1,"aggression":0,"religion":"insular_traditional_476","color":"#658e92","ruler":{"generated":true,"sex":"m","culture":"gaelic","born":440,"mar":7,"trait":"patient"}},"culture":"gaelic","faith":"insular_traditional_476","zone":"northern_temperate","rows":[["ulaid","Eastern Ulster","1"]],"existing":false},
    {"phase":"islands","realm":{"id":"tir_eoghain_local_476","name":"Northwestern Irish districts Communities","capital":"tir_eoghain","government":"lineage_kingship","rank":1,"aggression":0,"religion":"insular_traditional_476","color":"#977f9c","ruler":{"generated":true,"sex":"m","culture":"gaelic","born":440,"mar":7,"trait":"patient"}},"culture":"gaelic","faith":"insular_traditional_476","zone":"northern_temperate","rows":[["tir_eoghain","Northwestern Irish districts","1"]],"existing":false},
    {"phase":"islands","realm":{"id":"tara_local_476","name":"Tara district Communities","capital":"tara","government":"lineage_kingship","rank":1,"aggression":0,"religion":"insular_traditional_476","color":"#b09261","ruler":{"generated":true,"sex":"m","culture":"gaelic","born":440,"mar":7,"trait":"patient"}},"culture":"gaelic","faith":"insular_traditional_476","zone":"northern_temperate","rows":[["tara","Tara district","1"]],"existing":false},
    {"phase":"islands","realm":{"id":"dublin_local_476","name":"Lower Liffey Communities","capital":"dublin","government":"lineage_kingship","rank":1,"aggression":0,"religion":"insular_traditional_476","color":"#7386a1","ruler":{"generated":true,"sex":"m","culture":"gaelic","born":440,"mar":7,"trait":"patient"}},"culture":"gaelic","faith":"insular_traditional_476","zone":"northern_temperate","rows":[["dublin","Lower Liffey","1"]],"existing":false},
    {"phase":"islands","realm":{"id":"kilkenny_local_476","name":"Nore valley Communities","capital":"kilkenny","government":"lineage_kingship","rank":1,"aggression":0,"religion":"insular_traditional_476","color":"#ad796c","ruler":{"generated":true,"sex":"m","culture":"gaelic","born":440,"mar":7,"trait":"patient"}},"culture":"gaelic","faith":"insular_traditional_476","zone":"northern_temperate","rows":[["kilkenny","Nore valley","1"]],"existing":false},
    {"phase":"islands","realm":{"id":"wexford_local_476","name":"Southeastern Irish coast Communities","capital":"wexford","government":"lineage_kingship","rank":1,"aggression":0,"religion":"insular_traditional_476","color":"#81936c","ruler":{"generated":true,"sex":"m","culture":"gaelic","born":440,"mar":7,"trait":"patient"}},"culture":"gaelic","faith":"insular_traditional_476","zone":"northern_temperate","rows":[["wexford","Southeastern Irish coast","1"]],"existing":false},
    {"phase":"islands","realm":{"id":"galway_local_476","name":"Western Irish coast Communities","capital":"galway","government":"lineage_kingship","rank":1,"aggression":0,"religion":"insular_traditional_476","color":"#92745c","ruler":{"generated":true,"sex":"m","culture":"gaelic","born":440,"mar":7,"trait":"patient"}},"culture":"gaelic","faith":"insular_traditional_476","zone":"northern_temperate","rows":[["galway","Western Irish coast","1"]],"existing":false},
    {"phase":"islands","realm":{"id":"tuam_local_476","name":"Western inland districts Communities","capital":"tuam","government":"lineage_kingship","rank":1,"aggression":0,"religion":"insular_traditional_476","color":"#748957","ruler":{"generated":true,"sex":"m","culture":"gaelic","born":440,"mar":7,"trait":"patient"}},"culture":"gaelic","faith":"insular_traditional_476","zone":"northern_temperate","rows":[["tuam","Western inland districts","1"]],"existing":false},
    {"phase":"islands","realm":{"id":"roscommon_local_476","name":"Upper Shannon Communities","capital":"roscommon","government":"lineage_kingship","rank":1,"aggression":0,"religion":"insular_traditional_476","color":"#658e92","ruler":{"generated":true,"sex":"m","culture":"gaelic","born":440,"mar":7,"trait":"patient"}},"culture":"gaelic","faith":"insular_traditional_476","zone":"northern_temperate","rows":[["roscommon","Upper Shannon","1"]],"existing":false},
    {"phase":"islands","realm":{"id":"cork_local_476","name":"Southern Irish coast Communities","capital":"cork","government":"lineage_kingship","rank":1,"aggression":0,"religion":"insular_traditional_476","color":"#977f9c","ruler":{"generated":true,"sex":"m","culture":"gaelic","born":440,"mar":7,"trait":"patient"}},"culture":"gaelic","faith":"insular_traditional_476","zone":"northern_temperate","rows":[["cork","Southern Irish coast","1"]],"existing":false},
    {"phase":"islands","realm":{"id":"limerick_local_476","name":"Shannon estuary Communities","capital":"limerick","government":"lineage_kingship","rank":1,"aggression":0,"religion":"insular_traditional_476","color":"#b09261","ruler":{"generated":true,"sex":"m","culture":"gaelic","born":440,"mar":7,"trait":"patient"}},"culture":"gaelic","faith":"insular_traditional_476","zone":"northern_temperate","rows":[["limerick","Shannon estuary","1"]],"existing":false},
    {"phase":"north","realm":{"id":"halogaland_476","name":"Northern Coastal Households","capital":"halogaland","government":"lineage_kingship","rank":1,"aggression":0,"religion":"germanic_pagan","color":"#7386a1","ruler":{"generated":true,"sex":"m","culture":"north_germanic_476","born":440,"mar":7,"trait":"patient"}},"culture":"north_germanic_476","faith":"germanic_pagan","zone":"northern_temperate","rows":[["halogaland","Northern coastal settlements","1"]],"existing":false},
    {"phase":"north","realm":{"id":"norrland_476","name":"Northern Gulf Households","capital":"norrland","government":"lineage_kingship","rank":1,"aggression":0,"religion":"germanic_pagan","color":"#ad796c","ruler":{"generated":true,"sex":"m","culture":"north_germanic_476","born":440,"mar":7,"trait":"patient"}},"culture":"north_germanic_476","faith":"germanic_pagan","zone":"northern_temperate","rows":[["norrland","Northern gulf communities","1"]],"existing":false},
    {"phase":"north","realm":{"id":"sambia_communities_476","name":"Sambian coast Communities","capital":"sambia","government":"assembly_polity","rank":1,"aggression":0,"religion":"baltic_pagan","color":"#81936c","constituency":"coastal_households","representative":{"sex":"m","born":440,"skills":{"dip":5,"ste":5,"mar":4}}},"culture":"baltic","faith":"baltic_pagan","zone":"continental","rows":[["sambia","Sambian coast","1"]],"existing":false},
    {"phase":"north","realm":{"id":"natangia_communities_476","name":"Pregel district Communities","capital":"natangia","government":"assembly_polity","rank":1,"aggression":0,"religion":"baltic_pagan","color":"#92745c","constituency":"river_households_476","representative":{"sex":"m","born":440,"skills":{"dip":5,"ste":5,"mar":4}}},"culture":"baltic","faith":"baltic_pagan","zone":"continental","rows":[["natangia","Pregel district","1"]],"existing":false},
    {"phase":"north","realm":{"id":"samogitia_communities_476","name":"Lower Nemunas Communities","capital":"samogitia","government":"assembly_polity","rank":1,"aggression":0,"religion":"baltic_pagan","color":"#748957","constituency":"river_households_476","representative":{"sex":"m","born":440,"skills":{"dip":5,"ste":5,"mar":4}}},"culture":"baltic","faith":"baltic_pagan","zone":"continental","rows":[["samogitia","Lower Nemunas","1"]],"existing":false},
    {"phase":"north","realm":{"id":"vilnius_communities_476","name":"Neris district Communities","capital":"vilnius","government":"assembly_polity","rank":1,"aggression":0,"religion":"baltic_pagan","color":"#658e92","constituency":"river_households_476","representative":{"sex":"m","born":440,"skills":{"dip":5,"ste":5,"mar":4}}},"culture":"baltic","faith":"baltic_pagan","zone":"continental","rows":[["vilnius","Neris district","1"]],"existing":false},
    {"phase":"north","realm":{"id":"riga_communities_476","name":"Lower Daugava Communities","capital":"riga","government":"assembly_polity","rank":1,"aggression":0,"religion":"baltic_pagan","color":"#977f9c","constituency":"coastal_households","representative":{"sex":"m","born":440,"skills":{"dip":5,"ste":5,"mar":4}}},"culture":"baltic","faith":"baltic_pagan","zone":"continental","rows":[["riga","Lower Daugava","1"]],"existing":false},
    {"phase":"north","realm":{"id":"jersika_communities_476","name":"Middle Daugava Communities","capital":"jersika","government":"assembly_polity","rank":1,"aggression":0,"religion":"baltic_pagan","color":"#b09261","constituency":"river_households_476","representative":{"sex":"m","born":440,"skills":{"dip":5,"ste":5,"mar":4}}},"culture":"baltic","faith":"baltic_pagan","zone":"continental","rows":[["jersika","Middle Daugava","1"]],"existing":false},
    {"phase":"north","realm":{"id":"tartu_communities_476","name":"Emajogi communities","capital":"tartu","government":"assembly_polity","rank":1,"aggression":0,"religion":"finnic_traditional_476","color":"#7386a1","constituency":"river_households_476","representative":{"sex":"m","born":440,"skills":{"dip":5,"ste":5,"mar":4}}},"culture":"finnic","faith":"finnic_traditional_476","zone":"continental","rows":[["tartu","Emajogi communities","1"]],"existing":false},
    {"phase":"north","realm":{"id":"turku_communities_476","name":"Southwestern Finnish coast","capital":"turku","government":"assembly_polity","rank":1,"aggression":0,"religion":"finnic_traditional_476","color":"#ad796c","constituency":"coastal_households","representative":{"sex":"m","born":440,"skills":{"dip":5,"ste":5,"mar":4}}},"culture":"finnic","faith":"finnic_traditional_476","zone":"continental","rows":[["turku","Southwestern Finnish coast","1"]],"existing":false},
    {"phase":"north","realm":{"id":"hame_communities_476","name":"Inland Finnish lakes","capital":"hame","government":"assembly_polity","rank":1,"aggression":0,"religion":"finnic_traditional_476","color":"#81936c","constituency":"river_households_476","representative":{"sex":"m","born":440,"skills":{"dip":5,"ste":5,"mar":4}}},"culture":"finnic","faith":"finnic_traditional_476","zone":"continental","rows":[["hame","Inland Finnish lakes","1"]],"existing":false},
    {"phase":"north","realm":{"id":"savo_communities_476","name":"Eastern Finnish lakes","capital":"savo","government":"assembly_polity","rank":1,"aggression":0,"religion":"finnic_traditional_476","color":"#92745c","constituency":"river_households_476","representative":{"sex":"m","born":440,"skills":{"dip":5,"ste":5,"mar":4}}},"culture":"finnic","faith":"finnic_traditional_476","zone":"continental","rows":[["savo","Eastern Finnish lakes","1"]],"existing":false},
    {"phase":"north","realm":{"id":"kexholm_communities_476","name":"Western Ladoga shore","capital":"kexholm","government":"assembly_polity","rank":1,"aggression":0,"religion":"finnic_traditional_476","color":"#748957","constituency":"coastal_households","representative":{"sex":"m","born":440,"skills":{"dip":5,"ste":5,"mar":4}}},"culture":"finnic","faith":"finnic_traditional_476","zone":"continental","rows":[["kexholm","Western Ladoga shore","1"]],"existing":false},
    {"phase":"central","realm":{"id":"main_476","name":"Main Valley Communities","capital":"wurzburg","government":"lineage_kingship","rank":1,"aggression":0,"religion":"germanic_pagan","color":"#658e92","ruler":{"generated":true,"sex":"m","culture":"elbegermanic_476","born":440,"mar":7,"trait":"patient"}},"culture":"elbegermanic_476","faith":"germanic_pagan","zone":"continental","rows":[["wurzburg","Middle Main","1"],["nurnberg","Pegnitz district","1"],["bamberg","Regnitz district","1"],["frankfurt","Lower Main","1"]],"existing":false},
    {"phase":"central","realm":{"id":"middle_rhine_476","name":"Middle Rhine Communities","capital":"mainz","government":"regnum","rank":1,"aggression":0,"religion":"germanic_pagan","color":"#977f9c","ruler":{"generated":true,"sex":"m","culture":"frankish","born":440,"mar":7,"trait":"patient"}},"culture":"frankish","faith":"germanic_pagan","zone":"continental","rows":[["mainz","Mogontiacum","2"],["worms","Borbetomagus","2"],["koblenz","Confluentes","2"]],"existing":false},
    {"phase":"central","realm":{"id":"upper_alamannic_476","name":"Upper Alamannic Communities","capital":"ulm","government":"regnum","rank":1,"aggression":0,"religion":"germanic_pagan","color":"#b09261","ruler":{"generated":true,"sex":"m","culture":"alamannic","born":440,"mar":7,"trait":"patient"}},"culture":"alamannic","faith":"germanic_pagan","zone":"continental","rows":[["ulm","Upper Danube communities","1"],["freiburg","Breisgau communities","1"]],"existing":false},
    {"phase":"central","realm":{"id":"raetian_476","name":"Raetian Communities","capital":"regensburg","government":"roman_civic","rank":1,"aggression":0,"religion":"nicene","color":"#7386a1","ruler":{"generated":true,"sex":"m","culture":"roman","born":440,"mar":7,"trait":"patient"}},"culture":"roman","faith":"nicene","zone":"continental","rows":[["munich","Upper Isar communities","1"],["regensburg","Castra Regina","2"],["passau","Batavis","2"]],"existing":false},
    {"phase":"central","realm":{"id":"thuringian_districts_476","name":"Thuringian Districts","capital":"erfurt","government":"regnum","rank":1,"aggression":0,"religion":"germanic_pagan","color":"#ad796c","ruler":{"generated":true,"sex":"m","culture":"elbegermanic_476","born":440,"mar":7,"trait":"patient"}},"culture":"elbegermanic_476","faith":"germanic_pagan","zone":"continental","rows":[["magdeburg","Middle Elbe","1"],["erfurt","Thuringian basin","1"],["leipzig","Elster district","1"],["meissen","Upper Elbe valley","1"]],"existing":false},
    {"phase":"central","realm":{"id":"morava_476","name":"Morava Valley Communities","capital":"veligrad","government":"regnum","rank":1,"aggression":0,"religion":"germanic_pagan","color":"#81936c","ruler":{"generated":true,"sex":"m","culture":"elbegermanic_476","born":440,"mar":7,"trait":"patient"}},"culture":"elbegermanic_476","faith":"germanic_pagan","zone":"continental","rows":[["veligrad","Middle Morava","1"],["olomouc","Upper Morava","1"],["brno","Svratka district","1"]],"existing":false},
    {"phase":"central","realm":{"id":"middle_danube_476","name":"Northern Danubian Communities","capital":"bratislava","government":"regnum","rank":1,"aggression":0,"religion":"germanic_pagan","color":"#92745c","ruler":{"generated":true,"sex":"m","culture":"elbegermanic_476","born":440,"mar":7,"trait":"patient"}},"culture":"elbegermanic_476","faith":"germanic_pagan","zone":"continental","rows":[["nitra","Nitra valley","1"],["bratislava","Danubian confluence","1"]],"existing":false},
    {"phase":"central","realm":{"id":"bohemian_476","name":"Bohemian Basin Communities","capital":"praha","government":"regnum","rank":1,"aggression":0,"religion":"germanic_pagan","color":"#748957","ruler":{"generated":true,"sex":"m","culture":"elbegermanic_476","born":440,"mar":7,"trait":"patient"}},"culture":"elbegermanic_476","faith":"germanic_pagan","zone":"continental","rows":[["praha","Middle Vltava","1"],["plzen","Western Bohemian basin","1"],["budejovice","Upper Vltava","1"]],"existing":false},
    {"phase":"central","realm":{"id":"baltic_coast_476","name":"Western Baltic Coastal Communities","capital":"mecklenburg","government":"regnum","rank":1,"aggression":0,"religion":"germanic_pagan","color":"#658e92","ruler":{"generated":true,"sex":"m","culture":"elbegermanic_476","born":440,"mar":7,"trait":"patient"}},"culture":"elbegermanic_476","faith":"germanic_pagan","zone":"northern_temperate","rows":[["mecklenburg","Western Baltic coast","1"],["lubeck","Trave district","1"]],"existing":false},
    {"phase":"central","realm":{"id":"gepids_476","name":"","capital":"","government":"regnum","rank":1,"aggression":0,"religion":"homoian"},"culture":"gepid","faith":"homoian","zone":"continental","rows":[["gyula","Apulum district","2"],["cluj","Napoca district","1"]],"existing":true},
    {"phase":"forest","realm":{"id":"warta_476","name":"Warta Settlements","capital":"poznan","government":"assembly_polity","rank":1,"aggression":0,"religion":"germanic_pagan","color":"#b09261","constituency":"settlement_federation","representative":{"sex":"m","born":440,"skills":{"dip":5,"ste":5,"mar":4}}},"culture":"vistula_476","faith":"germanic_pagan","zone":"continental","rows":[["poznan","Warta settlements","1"],["gniezno","Eastern Warta lakes","1"]],"existing":false},
    {"phase":"forest","realm":{"id":"middle_vistula_476","name":"Middle Vistula Settlements","capital":"plock","government":"assembly_polity","rank":1,"aggression":0,"religion":"germanic_pagan","color":"#7386a1","constituency":"settlement_federation","representative":{"sex":"m","born":440,"skills":{"dip":5,"ste":5,"mar":4}}},"culture":"vistula_476","faith":"germanic_pagan","zone":"continental","rows":[["plock","Middle Vistula settlements","1"]],"existing":false},
    {"phase":"forest","realm":{"id":"upper_vistula_476","name":"Upper Vistula Settlements","capital":"krakow","government":"assembly_polity","rank":1,"aggression":0,"religion":"germanic_pagan","color":"#ad796c","constituency":"settlement_federation","representative":{"sex":"m","born":440,"skills":{"dip":5,"ste":5,"mar":4}}},"culture":"vistula_476","faith":"germanic_pagan","zone":"continental","rows":[["krakow","Upper Vistula communities","1"],["wroclaw","Upper Oder communities","1"]],"existing":false},
    {"phase":"forest","realm":{"id":"southern_baltic_476","name":"Southern Baltic Settlements","capital":"gdansk","government":"assembly_polity","rank":1,"aggression":0,"religion":"baltic_pagan","color":"#81936c","constituency":"settlement_federation","representative":{"sex":"m","born":440,"skills":{"dip":5,"ste":5,"mar":4}}},"culture":"vistula_476","faith":"baltic_pagan","zone":"northern_temperate","rows":[["gdansk","Vistula mouth","1"],["szczecin","Oder mouth","1"]],"existing":false},
    {"phase":"forest","realm":{"id":"ilmen_476","name":"Ilmen and Volkhov Communities","capital":"novgorod","government":"assembly_polity","rank":1,"aggression":0,"religion":"finnic_traditional_476","color":"#92745c","constituency":"settlement_federation","representative":{"sex":"m","born":440,"skills":{"dip":5,"ste":5,"mar":4}}},"culture":"finnic","faith":"finnic_traditional_476","zone":"continental","rows":[["novgorod","Ilmen basin","1"],["ladoga","Lower Volkhov","1"],["pskov","Velikaya district","1"]],"existing":false},
    {"phase":"forest","realm":{"id":"upper_volga_476","name":"Upper Volga Communities","capital":"rostov","government":"assembly_polity","rank":1,"aggression":0,"religion":"finnic_traditional_476","color":"#748957","constituency":"settlement_federation","representative":{"sex":"m","born":440,"skills":{"dip":5,"ste":5,"mar":4}}},"culture":"finnic","faith":"finnic_traditional_476","zone":"continental","rows":[["rostov","Nero lake","1"],["suzdal","Klyazma district","1"],["beloozero","White Lake communities","1"]],"existing":false},
    {"phase":"forest","realm":{"id":"upper_dnieper_476","name":"Upper Dnieper Communities","capital":"smolensk","government":"assembly_polity","rank":1,"aggression":0,"religion":"baltic_pagan","color":"#658e92","constituency":"settlement_federation","representative":{"sex":"m","born":440,"skills":{"dip":5,"ste":5,"mar":4}}},"culture":"baltic","faith":"baltic_pagan","zone":"continental","rows":[["smolensk","Upper Dnieper","1"],["polotsk","Upper Daugava","1"],["vitebsk","Daugava headwaters","1"],["minsk","Svislach district","1"]],"existing":false},
    {"phase":"forest","realm":{"id":"middle_dnieper_476","name":"Middle Dnieper Communities","capital":"kiev","government":"assembly_polity","rank":1,"aggression":0,"religion":"woodland_traditional_476","color":"#977f9c","constituency":"settlement_federation","representative":{"sex":"m","born":440,"skills":{"dip":5,"ste":5,"mar":4}}},"culture":"dnieper_476","faith":"woodland_traditional_476","zone":"continental","rows":[["kiev","Middle Dnieper hills","1"],["pereyaslavl","Trubizh district","1"],["chernigov","Desna communities","1"],["kursk","Seim communities","1"]],"existing":false},
    {"phase":"forest","realm":{"id":"pripet_476","name":"Pripet Communities","capital":"turov","government":"assembly_polity","rank":1,"aggression":0,"religion":"woodland_traditional_476","color":"#b09261","constituency":"settlement_federation","representative":{"sex":"m","born":440,"skills":{"dip":5,"ste":5,"mar":4}}},"culture":"dnieper_476","faith":"woodland_traditional_476","zone":"continental","rows":[["turov","Pripet communities","1"],["volodymyr","Western Bug district","1"],["lutsk","Styr district","1"]],"existing":false},
    {"phase":"corridors","realm":{"id":"lower_dnieper_476","name":"Lower Dnieper Communities","capital":"etelkoz","government":"assembly_polity","rank":1,"aggression":0,"religion":"steppe_traditional_476","color":"#7386a1","constituency":"settlement_federation","representative":{"sex":"m","born":440,"skills":{"dip":5,"ste":5,"mar":4}}},"culture":"alan_476","faith":"steppe_traditional_476","zone":"steppe","rows":[["etelkoz","Lower Dnieper crossings","1"]],"existing":false},
    {"phase":"corridors","realm":{"id":"lower_don_476","name":"Lower Don Communities","capital":"sarkel","government":"assembly_polity","rank":1,"aggression":0,"religion":"steppe_traditional_476","color":"#ad796c","constituency":"river_households_476","representative":{"sex":"m","born":440,"skills":{"dip":5,"ste":5,"mar":4}}},"culture":"oghuric_476","faith":"steppe_traditional_476","zone":"steppe","rows":[["sarkel","Lower Don crossings","1"]],"existing":false},
    {"phase":"corridors","realm":{"id":"lower_volga_476","name":"Lower Volga Communities","capital":"atil","government":"assembly_polity","rank":1,"aggression":0,"religion":"steppe_traditional_476","color":"#81936c","constituency":"river_households_476","representative":{"sex":"m","born":440,"skills":{"dip":5,"ste":5,"mar":4}}},"culture":"oghuric_476","faith":"steppe_traditional_476","zone":"steppe","rows":[["atil","Lower Volga channels","1"],["samandar","Western Caspian shore","1"]],"existing":false},
    {"phase":"corridors","realm":{"id":"sasanian_476","name":"","capital":"","government":"aristocratic_monarchy","rank":1,"aggression":0,"religion":"zoroastrian"},"culture":"persian","faith":"zoroastrian","zone":"continental","rows":[["derbent","Caspian Gates","2"]],"existing":true},
    {"phase":"corridors","realm":{"id":"middle_volga_476","name":"Middle Volga Settlements","capital":"bolghar","government":"assembly_polity","rank":1,"aggression":0,"religion":"finnic_traditional_476","color":"#748957","constituency":"settlement_federation","representative":{"sex":"m","born":440,"skills":{"dip":5,"ste":5,"mar":4}}},"culture":"finnic","faith":"finnic_traditional_476","zone":"continental","rows":[["bolghar","Middle Volga settlements","1"],["bilyar","Lower Kama communities","1"]],"existing":false},
    {"phase":"east","realm":{"id":"sasanian_476","name":"","capital":"","government":"aristocratic_monarchy","rank":1,"aggression":0,"religion":"zoroastrian"},"culture":"persian","faith":"zoroastrian","zone":"arid","rows":[["merv","Marw","3"],["nishapur","Nishapur district","2"],["herat","Herat","3"],["zaranj","Drangiana","2"],["bust","Helmand communities","2"]],"existing":true},
    {"phase":"east","realm":{"id":"hephthalite_bactria_476","name":"Hephthalite Bactrian Court","capital":"balkh","government":"regnum","rank":1,"aggression":0,"religion":"buddhist_476","color":"#977f9c","ruler":{"generated":true,"sex":"m","culture":"bactrian_476","born":440,"mar":7,"trait":"patient"}},"culture":"bactrian_476","faith":"buddhist_476","zone":"continental","rows":[["balkh","Balkh","4"],["termez","Termez","3"]],"existing":false},
    {"phase":"east","realm":{"id":"ghor_476","name":"Central Highland Communities","capital":"ghor","government":"lineage_kingship","rank":1,"aggression":0,"religion":"iranian_traditional_476","color":"#b09261","ruler":{"generated":true,"sex":"m","culture":"bactrian_476","born":440,"mar":7,"trait":"patient"}},"culture":"bactrian_476","faith":"iranian_traditional_476","zone":"continental","rows":[["ghor","Central Iranian highlands","1"]],"existing":false},
    {"phase":"east","realm":{"id":"arghandab_476","name":"Arghandab Court","capital":"kandahar","government":"regnum","rank":1,"aggression":0,"religion":"buddhist_476","color":"#7386a1","ruler":{"generated":true,"sex":"m","culture":"bactrian_476","born":440,"mar":7,"trait":"patient"}},"culture":"bactrian_476","faith":"buddhist_476","zone":"arid","rows":[["kandahar","Arghandab communities","2"],["ghazni","Ghazni district","2"]],"existing":false},
    {"phase":"east","realm":{"id":"kabul_476","name":"Kabul Valley Court","capital":"kabul","government":"regnum","rank":1,"aggression":0,"religion":"buddhist_476","color":"#ad796c","ruler":{"generated":true,"sex":"m","culture":"bactrian_476","born":440,"mar":7,"trait":"patient"}},"culture":"bactrian_476","faith":"buddhist_476","zone":"continental","rows":[["kabul","Kabul valley","3"],["bamiyan","Bamiyan valley","2"]],"existing":false},
    {"phase":"east","realm":{"id":"bukhara_court_476","name":"Bukhara oasis Court","capital":"bukhara","government":"regnum","rank":1,"aggression":0,"religion":"sogdian_traditional_476","color":"#81936c","ruler":{"generated":true,"sex":"m","culture":"sogdian_476","born":440,"mar":7,"trait":"patient"}},"culture":"sogdian_476","faith":"sogdian_traditional_476","zone":"continental","rows":[["bukhara","Bukhara oasis","3"]],"existing":false},
    {"phase":"east","realm":{"id":"samarkand_court_476","name":"Samarkand Court","capital":"samarkand","government":"regnum","rank":1,"aggression":0,"religion":"sogdian_traditional_476","color":"#92745c","ruler":{"generated":true,"sex":"m","culture":"sogdian_476","born":440,"mar":7,"trait":"patient"}},"culture":"sogdian_476","faith":"sogdian_traditional_476","zone":"continental","rows":[["samarkand","Samarkand","3"]],"existing":false},
    {"phase":"east","realm":{"id":"usrushana_court_476","name":"Ustrushana districts Court","capital":"usrushana","government":"regnum","rank":1,"aggression":0,"religion":"sogdian_traditional_476","color":"#748957","ruler":{"generated":true,"sex":"m","culture":"sogdian_476","born":440,"mar":7,"trait":"patient"}},"culture":"sogdian_476","faith":"sogdian_traditional_476","zone":"continental","rows":[["usrushana","Ustrushana districts","3"]],"existing":false},
    {"phase":"east","realm":{"id":"chach_court_476","name":"Chach oasis Court","capital":"chach","government":"regnum","rank":1,"aggression":0,"religion":"sogdian_traditional_476","color":"#658e92","ruler":{"generated":true,"sex":"m","culture":"sogdian_476","born":440,"mar":7,"trait":"patient"}},"culture":"sogdian_476","faith":"sogdian_traditional_476","zone":"continental","rows":[["chach","Chach oasis","3"]],"existing":false},
    {"phase":"east","realm":{"id":"makran_476","name":"Makran Communities","capital":"tiz","government":"regnum","rank":1,"aggression":0,"religion":"iranian_traditional_476","color":"#977f9c","ruler":{"generated":true,"sex":"m","culture":"makran_476","born":440,"mar":7,"trait":"patient"}},"culture":"makran_476","faith":"iranian_traditional_476","zone":"arid","rows":[["tiz","Makran coast","1"],["panjgur","Panjgur oasis","1"],["qusdar","Central Makran uplands","1"]],"existing":false},
    {"phase":"east","realm":{"id":"lower_indus_476","name":"Lower Indus Court","capital":"mansura","government":"regnum","rank":1,"aggression":0,"religion":"brahmanical_476","color":"#b09261","ruler":{"generated":true,"sex":"m","culture":"indus_476","born":440,"mar":7,"trait":"patient"}},"culture":"indus_476","faith":"brahmanical_476","zone":"arid","rows":[["mansura","Lower Indus settlements","2"],["debal","Indus delta communities","2"]],"existing":false},
    {"phase":"arabia","realm":{"id":"western_arabia_476","name":"Western Arabian Communities","capital":"mecca","government":"lineage_kingship","rank":1,"aggression":0,"religion":"arabian_traditional_476","color":"#7386a1","ruler":{"generated":true,"sex":"m","culture":"arabian_476","born":440,"mar":7,"trait":"patient"}},"culture":"arabian_476","faith":"arabian_traditional_476","zone":"arid","rows":[["mecca","Western Arabian sanctuary district","1"]],"existing":false},
    {"phase":"arabia","realm":{"id":"yathrib_476","name":"Yathrib Oasis Households","capital":"medina","government":"assembly_polity","rank":1,"aggression":0,"religion":"jewish","color":"#ad796c","constituency":"settlement_federation","representative":{"sex":"m","born":440,"skills":{"dip":5,"ste":5,"mar":4}}},"culture":"arabian_476","faith":"jewish","zone":"arid","rows":[["medina","Yathrib","2"]],"existing":false},
    {"phase":"arabia","realm":{"id":"yamama_476","name":"Yamama Communities","capital":"yamama","government":"lineage_kingship","rank":1,"aggression":0,"religion":"arabian_traditional_476","color":"#81936c","ruler":{"generated":true,"sex":"m","culture":"arabian_476","born":440,"mar":7,"trait":"patient"}},"culture":"arabian_476","faith":"arabian_traditional_476","zone":"arid","rows":[["yamama","Yamama oases","2"]],"existing":false},
    {"phase":"arabia","realm":{"id":"eastern_arabia_476","name":"Eastern Arabian Communities","capital":"qatif","government":"regnum","rank":1,"aggression":0,"religion":"east_syriac","color":"#92745c","ruler":{"generated":true,"sex":"m","culture":"arabian_476","born":440,"mar":7,"trait":"patient"},"liege":"sasanian_476"},"culture":"arabian_476","faith":"east_syriac","zone":"arid","rows":[["qatif","Eastern Arabian oases","2"]],"existing":false},
    {"phase":"arabia","realm":{"id":"himyar_476","name":"Himyarite Court","capital":"sanaa","government":"regnum","rank":1,"aggression":0,"religion":"jewish","color":"#748957","ruler":{"generated":true,"sex":"m","culture":"south_arabian_476","born":440,"mar":7,"trait":"patient"}},"culture":"south_arabian_476","faith":"jewish","zone":"arid","rows":[["sanaa","Sanaa district","3"],["aden","Aden","2"],["shibam","Hadramawt settlements","2"]],"existing":false},
    {"phase":"arabia","realm":{"id":"oman_coast_476","name":"Omani Coastal Communities","capital":"sohar","government":"regnum","rank":1,"aggression":0,"religion":"arabian_traditional_476","color":"#658e92","ruler":{"generated":true,"sex":"m","culture":"arabian_476","born":440,"mar":7,"trait":"patient"},"liege":"sasanian_476"},"culture":"arabian_476","faith":"arabian_traditional_476","zone":"arid","rows":[["muscat","Omani coastal settlements","1"],["sohar","Sohar district","2"]],"existing":false},
    {"phase":"arabia","realm":{"id":"oman_inland_476","name":"Omani Oasis Communities","capital":"nizwa","government":"lineage_kingship","rank":1,"aggression":0,"religion":"arabian_traditional_476","color":"#977f9c","ruler":{"generated":true,"sex":"m","culture":"arabian_476","born":440,"mar":7,"trait":"patient"}},"culture":"arabian_476","faith":"arabian_traditional_476","zone":"arid","rows":[["nizwa","Omani interior oases","1"]],"existing":false},
    {"phase":"africa","realm":{"id":"atlas_476","name":"High Atlas Communities","capital":"aghmat","government":"lineage_kingship","rank":1,"aggression":0,"religion":"berber_traditional","color":"#b09261","ruler":{"generated":true,"sex":"m","culture":"berber","born":440,"mar":7,"trait":"patient"}},"culture":"berber","faith":"berber_traditional","zone":"mediterranean","rows":[["aghmat","High Atlas foothills","1"]],"existing":false},
    {"phase":"africa","realm":{"id":"bouregreg_476","name":"Bou Regreg Communities","capital":"sale","government":"regnum","rank":1,"aggression":0,"religion":"berber_traditional","color":"#7386a1","ruler":{"generated":true,"sex":"m","culture":"berber","born":440,"mar":7,"trait":"patient"}},"culture":"berber","faith":"berber_traditional","zone":"mediterranean","rows":[["sale","Sala district","1"]],"existing":false},
    {"phase":"africa","realm":{"id":"tafilalt_476","name":"Tafilalt Oasis Communities","capital":"sijilmasa","government":"lineage_kingship","rank":1,"aggression":0,"religion":"berber_traditional","color":"#ad796c","ruler":{"generated":true,"sex":"m","culture":"berber","born":440,"mar":7,"trait":"patient"}},"culture":"berber","faith":"berber_traditional","zone":"arid","rows":[["sijilmasa","Tafilalt oases","1"]],"existing":false},
    {"phase":"africa","realm":{"id":"middle_nile_476","name":"Middle Nile Court","capital":"dongola","government":"regnum","rank":1,"aggression":0,"religion":"nile_traditional_476","color":"#81936c","ruler":{"generated":true,"sex":"m","culture":"nubian","born":440,"mar":7,"trait":"patient"}},"culture":"nubian","faith":"nile_traditional_476","zone":"arid","rows":[["dongola","Middle Nile communities","2"]],"existing":false},
    {"phase":"africa","realm":{"id":"blue_nile_476","name":"Blue Nile Court","capital":"soba","government":"regnum","rank":1,"aggression":0,"religion":"nile_traditional_476","color":"#92745c","ruler":{"generated":true,"sex":"m","culture":"nubian","born":440,"mar":7,"trait":"patient"}},"culture":"nubian","faith":"nile_traditional_476","zone":"arid","rows":[["soba","Blue Nile confluence","1"]],"existing":false},
    {"phase":"africa","realm":{"id":"aksum_476","name":"Aksumite Court","capital":"axum","government":"regnum","rank":1,"aggression":0,"religion":"aksumite_christian_476","color":"#748957","ruler":{"generated":true,"sex":"m","culture":"aksumite_476","born":440,"mar":7,"trait":"patient"}},"culture":"aksumite_476","faith":"aksumite_christian_476","zone":"arid","rows":[["axum","Aksum","4"]],"existing":false},
    {"phase":"africa","realm":{"id":"horn_highlands_476","name":"Southern Highland Communities","capital":"lalibela","government":"lineage_kingship","rank":1,"aggression":0,"religion":"horn_traditional_476","color":"#658e92","ruler":{"generated":true,"sex":"m","culture":"aksumite_476","born":440,"mar":7,"trait":"patient"}},"culture":"aksumite_476","faith":"horn_traditional_476","zone":"arid","rows":[["lalibela","Southern highland communities","1"]],"existing":false},
    {"phase":"africa","realm":{"id":"gulf_aden_476","name":"Gulf of Aden Communities","capital":"zeila","government":"assembly_polity","rank":1,"aggression":0,"religion":"horn_traditional_476","color":"#977f9c","constituency":"settlement_federation","representative":{"sex":"m","born":440,"skills":{"dip":5,"ste":5,"mar":4}}},"culture":"horn_coastal_476","faith":"horn_traditional_476","zone":"arid","rows":[["zeila","Gulf of Aden coast","1"]],"existing":false},
    {"phase":"corridors","realm":{"id":"taman_coast_476","name":"Taman Coastal Communities","capital":"tmutarakan","government":"regnum","rank":1,"aggression":0,"religion":"chalcedonian","color":"#7e929c","ruler":{"generated":true,"sex":"m","culture":"greek","born":440,"mar":6,"trait":"patient"}},"culture":"greek","faith":"chalcedonian","zone":"mediterranean","rows":[["tmutarakan","Hermonassa district","2"]],"existing":false}
  ];
  region.groups = groups;
  groups.forEach(function (g) {
    if (!g.existing) {
      var realm = g.realm;
      if (realm.government === 'lineage_kingship') realm.royalCourt = {
        founderId:'ancestor',rulerFatherId:'ancestor',members:[
          {id:'ancestor',generated:true,sex:'m',born:410,culture:g.culture,religion:g.faith,alive:false,died:470},
          {id:'collateral',generated:true,sex:'m',born:443,culture:g.culture,religion:g.faith,fatherId:'ancestor',homeProvinceId:realm.capital},
          {id:'offspring',generated:true,sex:'m',born:459,culture:g.culture,religion:g.faith,fatherId:'ruler',homeProvinceId:realm.capital}
        ]};
      region.realms.push(realm);
    }
    g.rows.forEach(function (r) {
      county(g.phase,[r[0],r[1],g.realm.id,g.culture,g.faith,Number(r[2]),g.zone]);
    });
  });
  /* Faith mixtures are reconstruction values, not census measurements. */
  function mix(id, identities) {
    additions[id].communities = identities.map(function (c) {
      return {culture:c[0],religion:c[1],populationShare0:c[2],paired:true};
    });
    additions[id].culture = identities[0][0];
    additions[id].religion = identities[0][1];
  }
  region.phases.islands.forEach(function (id) {
    if (additions[id].culture === 'gaelic') mix(id,[
      ['gaelic','insular_traditional_476',6500],['gaelic','nicene',3500]]);
  });
  ['mainz','worms','koblenz'].forEach(function (id) {
    mix(id,[['gallo_roman','nicene',6500],['frankish','germanic_pagan',3500]]);
  });
  ['ulm','freiburg'].forEach(function (id) {
    mix(id,[['alamannic','germanic_pagan',7000],['roman','nicene',3000]]);
  });
  ['gyula','cluj'].forEach(function (id) {
    mix(id,[['gepid','homoian',6000],['roman','nicene',4000]]);
  });
  ['balkh','termez','kabul','bamiyan','ghazni','kandahar'].forEach(function (id) {
    mix(id,[['bactrian_476','buddhist_476',6500],['bactrian_476','iranian_traditional_476',3500]]);
  });
  ['mansura','debal'].forEach(function (id) {
    mix(id,[['indus_476','brahmanical_476',6000],['indus_476','buddhist_476',4000]]);
  });
  mix('medina',[['arabian_476','jewish',5500],['arabian_476','arabian_traditional_476',4500]]);
  mix('qatif',[['arabian_476','east_syriac',5500],['arabian_476','arabian_traditional_476',4500]]);
  ['sanaa','aden','shibam'].forEach(function (id) {
    mix(id,[['south_arabian_476','jewish',6000],['south_arabian_476','arabian_traditional_476',3000],['south_arabian_476','miaphysite',1000]]);
  });
  mix('sale',[['berber','berber_traditional',6500],['roman','nicene',3500]]);
  mix('axum',[['aksumite_476','aksumite_christian_476',7000],['aksumite_476','horn_traditional_476',3000]]);
  FBDATA.settlementSites.tbilisi_wider_476.x = 44.72;
  FBDATA.settlementSites.tbilisi_wider_476.y = 41.84;
  /* Coastal links are named physical crossings, not a naval capability. */
  var crossings = [['iona','glasgow'],['lewis','inverness'],
    ['man','whithorn'],['man','dublin'],['ulaid','dumbarton'],['cork','cornwall'],
    ['candia','athens'],['nicosia','adana']];
  var crossingClasses = Object.assign({},b.crossingClasses);
  crossings.forEach(function (pair) { crossingClasses[pair.slice().sort().join('|')] = 'coastal'; });
  [['cork','cornwall'],['candia','athens']].forEach(function (pair) {
    crossingClasses[pair.slice().sort().join('|')] = 'open';
  });

  /* Compact inhabited corridors split scenery through an additive base.
     The retained scenery is the off-route remnant, never a giant kingdom. */
  var corridors = [["draa_oases","Draa oases",-6.1,29.9,"farmland","w_sahara_w","berber","berber_traditional","lineage_kingship"],["garama","Garama",13.06,26.54,"farmland","w_sahara_c","berber","berber_traditional","regnum"],["ghadames_oasis","Ghadames oasis",9.5,30.13,"farmland","w_sahara_c","berber","berber_traditional","regnum"],["awjila_oasis","Awjila oasis",21.29,29.11,"farmland","w_sahara_e","berber","berber_traditional","regnum"],["siwa_oasis","Siwa oasis",25.53,29.2,"farmland","w_sahara_e","berber","berber_traditional","regnum"],["jenne_district","Middle Niger settlements",-4.55,13.9,"farmland","w_sahel","sahelian_476","sahel_traditional_476","assembly_polity"],["gao_district","Niger bend communities",-0.04,16.26,"farmland","w_sahel","sahelian_476","sahel_traditional_476","assembly_polity"],["chad_lakeshore","Lake Chad communities",14,13.3,"marsh","w_sahel","sahelian_476","sahel_traditional_476","assembly_polity"],["qasr_ibrim","Primis",31.99,22.65,"hills","w_nubia","nubian","nile_traditional_476","regnum"],["najran_oasis","Najran",44.19,17.49,"farmland","w_arabia","arabian_476","miaphysite","regnum"],["tayma_oasis","Tayma",38.53,27.63,"farmland","w_nefud","arabian_476","arabian_traditional_476","assembly_polity"],["palmyra_district","Palmyra",38.27,34.55,"desert","w_syrian","syriac","miaphysite","roman_civic"],["central_iran_oases","Central Iranian oases",51.58,33.98,"farmland","w_kavir","persian","zoroastrian","aristocratic_monarchy"],["eastern_iran_oases","Eastern Iranian oases",56.92,33.61,"farmland","w_lut","persian","zoroastrian","aristocratic_monarchy"],["shebar_valley","Hindu Kush pass communities",68.18,35,"mountains","w_hindukush","bactrian_476","buddhist_476","regnum"],["gomal_valley","Gomal valley",69.4,32.1,"hills","w_sulaiman","indus_476","brahmanical_476","regnum"],["thar_margin","Western Thar communities",69.19,25.75,"desert","w_thar","indus_476","brahmanical_476","assembly_polity"],["sarakhs_oasis","Sarakhs district",61.16,36.54,"farmland","w_karakum","persian","zoroastrian","aristocratic_monarchy"],["nurata_foothills","Northern Sogdian foothills",65.69,40.56,"hills","w_kyzylkum","sogdian_476","sogdian_traditional_476","regnum"],["lower_syr_darya","Lower Syr Darya communities",62.54,45,"farmland","w_steppe_e","sogdian_476","sogdian_traditional_476","assembly_polity"],["sarysu_corridor","Sarysu seasonal communities",67.95,47.87,"steppe","w_steppe_e","central_steppe_476","steppe_traditional_476","assembly_polity"],["upper_kama","Upper Kama communities",56.25,58,"forest","w_ural","finnic","finnic_traditional_476","assembly_polity"],["vychegda_district","Vychegda communities",50.9,61.67,"forest","w_taiga","finnic","finnic_traditional_476","assembly_polity"],["onega_district","Onega communities",38.96,61.5,"forest","w_north","finnic","finnic_traditional_476","assembly_polity"],["torne_district","Northern Gulf river communities",24.14,65.84,"forest","w_lapland","sami","finnic_traditional_476","assembly_polity"]];
  FBDATA.geographies.europe_regional_2.provinceAdditions.forEach(function (p) { seeds[p.id] = p; });
  region.scenery = {};
  b.provinces.filter(function (p) { return p.id.indexOf('w_') === 0; }).forEach(function (p) {
    region.scenery[p.id] = {disposition:'retained',inhabited:[]};
  });
  corridors.forEach(function (c, index) {
    var owner = c[0] + '_local_476';
    if (c[8] === 'aristocratic_monarchy') owner = 'sasanian_476';
    else if (c[8] === 'roman_civic') owner = 'byzantium';
    else if (c[0] === 'shebar_valley') owner = 'kabul_476';
    else if (c[0] === 'nurata_foothills') owner = 'samarkand_court_476';
    else {
      var realm = {id:owner,name:c[1],capital:c[0],government:c[8],rank:1,
        religion:c[7],aggression:0,color:['#94836d','#81916b','#807e9b','#779d9a'][index % 4]};
      if (c[8] === 'assembly_polity') {
        realm.constituency = 'settlement_federation';
        realm.representative = {sex:'m',born:440,skills:{dip:5,ste:5,mar:4}};
      } else {
        realm.ruler = {generated:true,sex:'m',culture:c[6],born:440,mar:6,trait:'patient'};
        if (c[8] === 'lineage_kingship') realm.royalCourt = {
          founderId:'ancestor',rulerFatherId:'ancestor',members:[
            {id:'ancestor',generated:true,sex:'m',born:410,culture:c[6],religion:c[7],alive:false,died:470},
            {id:'collateral',generated:true,sex:'m',born:443,culture:c[6],religion:c[7],fatherId:'ancestor',homeProvinceId:c[0]}
          ]};
      }
      region.realms.push(realm);
    }
    county('scenery',[c[0],c[1],owner,c[6],c[7],1,c[3] > 45 ? 'continental' : 'arid',
      null,owner === 'byzantium' ? 'd_476_syria_prima' : null,[c[2],c[3]],'village']);
    region.scenery[c[5]].disposition = 'split';
    region.scenery[c[5]].inhabited.push(c[0]);
  });
  /* The existing following can bargain along the added corridors. These
     access locations do not make its nonterritorial court a county owner. */
  FBDATA.mobileProfiles.pontic_wider_following = Object.assign({},FBDATA.mobileProfiles.pontic_following,
    {regions:['cherson','tomis','constantinople','etelkoz','sarkel','atil','samandar']});
  /* Priscus, fr. 40 and 47: named displaced coalitions and their diplomatic
     activity. Camp anchors and numerical stocks are reconstructions, not
     county conquests. Local residents retain their own civil institutions. */
  [
    {id:'saragur_following_476',name:'Saragur Following',capital:'sarkel',
      patron:'lower_don_476',regions:['etelkoz','sarkel','tmutarakan','samandar','derbent']},
    {id:'oghur_following_476',name:'Oghur Following',capital:'atil',
      patron:'lower_volga_476',regions:['atil','samandar','sarkel','lower_syr_darya','sarysu_corridor']}
  ].forEach(function (d) {
    FBDATA.mobileProfiles[d.id] = Object.assign({},FBDATA.mobileProfiles.river_following,
      {regions:d.regions});
    region.realms.push({id:d.id,name:d.name,color:'#a68b64',capital:d.capital,
      nonTerritorial:true,government:'mobile_confederation',culture:'oghuric_476',
      religion:'steppe_traditional_476',rank:1,aggression:0,
      mobile:{profileId:d.id,patronRealmId:d.patron,origin:d.capital,target:d.capital,
        food:4800,fighters:80,treasury:60}});
  });
  /* Local Christian interests remain distinct from imperial public service.
     These generated households do not claim a reconstructed genealogy. */
  var interests = FBDATA.aristocraticProfiles.sasanian_476.interests.slice();
  ['van','dvin'].forEach(function (id) {
    var actor = id + '_magnate', dynasty = additions[id].name;
    opening.actors[actor] = {sex:'m',culture:'armenian',religion:'caucasian_christian_476',
      born:434,station:3,role:'notable',dyn:dynasty,home:id,skills:{ste:8,mar:7}};
    opening.actors[actor + '_heir'] = {sex:'m',culture:'armenian',religion:'caucasian_christian_476',
      born:455,station:2,role:'notable',dyn:dynasty,father:actor,home:id,skills:{ste:6,mar:6}};
    interests.push({id:id + '_interest',name:additions[id].name,dynasty:dynasty,actorId:actor,
      provinceId:id,officeId:'hereditary_interest',weight:2,minimumMartial:0,
      maximumRevenue:0.75,maximumLevy:0.7});
  });
  FBDATA.aristocraticProfiles.sasanian_wider_476 = Object.assign({},FBDATA.aristocraticProfiles.sasanian_476,
    {interests:interests});
  ['dvin','axum','dongola','balkh','samarkand','sanaa','medina','qatif','merv','tara'].forEach(function (id) {
    var p = additions[id];
    p.communities.forEach(function (community,index) {
      region.institutions[id + '_community_' + index + '_476'] = {city:p.name,kind:'congregation',
        provinceId:id,site:id + '_wider_476',culture:community.culture,religion:community.religion,
        representative:{role:'priest'}};
    });
  });
  var expandedRealms = b.realms.map(function (r) {
    if (r.id === 'sasanian_476') return Object.assign({},r,{aristocraticProfileId:'sasanian_wider_476'});
    return r.id === 'pontic_following_476' ? Object.assign({},r,{
      mobile:Object.assign({},r.mobile,{profileId:'pontic_wider_following'})
    }) : r;
  }).concat(region.realms);
  var expanded = {
    geography:'europe_regional_2',
    provinces:b.provinces.map(function (p) { return additions[p.id] || p; }).concat(
      corridors.map(function (c) { return additions[c[0]]; })),
    realms:expandedRealms, duchies:duchies, kingdoms:kingdoms,
    localInstitutions:Object.assign({}, b.localInstitutions, region.institutions),
    settlementLayout:'476_wider_v2', climate:{zone:b.climate.zone,provinces:climates},
    opening:opening, openingRevision:'wider_v2',
    openingRevisions:{wider_v2:opening},openingLegacyRevision:'wider_v2',
    straits:b.straits.concat(crossings),crossingClasses:crossingClasses
  };
  /* Estate tenure is positively scoped, not inferred from a bookmark-wide
     colonate switch. Regional imperial estates and the authored Gallic and
     African estate archetypes supply these opening locations. */
  expanded.startLocations = {colonus_476:expanded.provinces.filter(function (p) {
    return !p.wasteland && (['italy','croatia','byzantium'].indexOf(p.realm) >= 0 ||
      ['laon','paris','reims','orleans','lyon','arles','toulouse','bordeaux',
        'tunis','kairouan','tripoli','sirte'].indexOf(p.id) >= 0);
  }).map(function (p) { return p.id; })};
  /* Root fields are the retained merged opening. Revisions replace whole
     fields; an unstamped supported save selects this baseline. */
  b.revision = 'wider_v2';
  b.revisions = {baseline:{},wider_v2:expanded};
  FBDATA.techImpactReviews.features.period_476_wider_habitation = {mode:'none',
    rationale:'Established regional households, existing civil offices and local political relationships require no technological discovery. Existing travel, equipment and production requirements remain in force.'};
  FBDATA.techImpactReviews.features.bounded_overland_corridors = {mode:'none',
    rationale:'Physical district extents and longer dry journeys are geography. Movement pays declared travel units, ordinary provisions and destination terrain through existing household, courier and army rules.'};
})();
