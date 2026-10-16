/* Spring 476 regional completion. Political and settlement declarations use
   existing public contracts. District labels do not assert a later city's
   existence. Shares, development and unnamed officials are simulation choices.

   Every regional decision is declared in FBDATA.bookmarkWider476 and the
   date's FBDATA.communalRevisions table. The builder below and
   data/communal_revisions.js apply those tables to the retained opening and
   name no county, realm, faith or start. */
FBDATA.bookmarkWider476 = {
  bookmarkId:'476', revision:'wider_v2', layoutId:'476_wider_v2', geography:'europe_regional_2',
  /* District names apply from 375 to 649; later names are not inherited. */
  nameWindow:{ from:375, to:649 },
  customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}],
  /* A county's settlement kind follows its development unless a row names it. */
  settlementKinds:[{ minimumDevelopment:4, kind:'city' },{ minimumDevelopment:2, kind:'town' },{ minimumDevelopment:0, kind:'village' }],
  siteSuffix:'_wider_476',
  kingdoms:{ k_476_egypt:{ name:'Egypt', empire:'e_476_east' } },
  /* Administrative groupings have no generated feudal holder hierarchy. */
  duchies:{
    d_476_egypt:{ name:'Egyptian provinces', kingdom:'k_476_egypt' },
    d_476_crete:{ name:'Crete', kingdom:'k_476_macedonia' },
    d_476_cyprus:{ name:'Cyprus', kingdom:'k_476_oriens' },
    d_476_pontus:{ name:'Pontic coast', kingdom:'k_476_pontica' }
  },
  communityTemplates:{
    egypt:[
      {culture:'coptic',religion:'miaphysite',populationShare0:7000},
      {culture:'greek',religion:'chalcedonian',paired:true,populationShare0:2000},
      {culture:'greek',religion:'miaphysite',paired:true,populationShare0:1000}
    ]
  },
  /* Roman county rows: id, name, owner realm, culture, faith, development,
     climate zone, communities (a template name, a list or null), duchy,
     optional [x, y] site and optional settlement kind. */
  romanPhase:'roman',
  romanCounties:[
      ['candia','Gortyna','byzantium','greek','chalcedonian',3,'mediterranean',null,'d_476_crete',[24.95,35.06]],
      ['trebizond','Trapezus','byzantium','greek','chalcedonian',3,'mediterranean',null,'d_476_pontus'],
      ['nicosia','Tamassos','byzantium','greek','chalcedonian',2,'mediterranean',null,'d_476_cyprus',[33.24,35.03]],
      ['barqa','Barce district','byzantium','greek','chalcedonian',2,'mediterranean',null,'d_476_egypt'],
      ['alexandria','Alexandria','byzantium','greek','miaphysite',6,'mediterranean',[
      {culture:'greek',religion:'miaphysite',populationShare0:5000},
      {culture:'coptic',religion:'miaphysite',populationShare0:3000},
      {culture:'greek',religion:'chalcedonian',populationShare0:2000}],'d_476_egypt'],
      ['rosetta','Bolbitine mouth','byzantium','coptic','miaphysite',2,'mediterranean','egypt','d_476_egypt'],
      ['fustat','Babylon of Egypt','byzantium','coptic','miaphysite',4,'arid','egypt','d_476_egypt',[31.23,30.01]],
      ['fayyum','Arsinoe','byzantium','coptic','miaphysite',4,'arid','egypt','d_476_egypt'],
      ['asyut','Lycopolis','byzantium','coptic','miaphysite',3,'arid','egypt','d_476_egypt'],
      ['luxor','Theban communities','byzantium','coptic','miaphysite',3,'arid','egypt','d_476_egypt'],
      ['aswan','Syene','byzantium','coptic','miaphysite',2,'arid','egypt','d_476_egypt'],
      ['ras','Upper Ibar district','byzantium','roman','chalcedonian',1,'continental',null,'d_476_dardania'],
      ['bosna','Bosna valley communities','croatia','roman','nicene',1,'continental',null,'d_476_dalmatia']
  ],
  /* Generated civil delegates use existing appointment transactions. */
  civilDelegates:{
    counties:['candia','trebizond','nicosia','barqa','alexandria','rosetta','fustat','fayyum','asyut','luxor','aswan','ras','bosna'],
    actorSuffix:'_civil_delegate', officeId:'praeses',
    actor:{ sex:'m', born:435, station:3, role:'notable', skills:{ste:8,dip:8} }
  },
  /* Timothy retains the same institution and episcopal office; no second see is made. */
  movedInstitutions:{ alexandria_see:{ provinceId:'alexandria', site:'alexandria_wider_476' } },
  councils:{ counties:['alexandria','fustat','fayyum','trebizond','candia','nicosia'], suffix:'_council_476', kind:'council' },
  /* Lineage courts for new realms: a dead founder and a living collateral
     line, plus a ruler's son for the regional groups. Members without a
     home stay unhomed; home marks the realm capital or corridor county. */
  lineageCourts:{
    government:'lineage_kingship',
    group:{ founderId:'ancestor', rulerFatherId:'ancestor', members:[
      {id:'ancestor',generated:true,sex:'m',born:410,alive:false,died:470},
      {id:'collateral',generated:true,sex:'m',born:443,fatherId:'ancestor',home:true},
      {id:'offspring',generated:true,sex:'m',born:459,fatherId:'ruler',home:true}
    ]},
    corridor:{ founderId:'ancestor', rulerFatherId:'ancestor', members:[
      {id:'ancestor',generated:true,sex:'m',born:410,alive:false,died:470},
      {id:'collateral',generated:true,sex:'m',born:443,fatherId:'ancestor',home:true}
    ]}
  },
  /* New identities retain regional uncertainty; their name pools supply
     generated people and do not identify historical incumbents. An existing
     group extends a retained realm instead of declaring a new one. */
  groups:[
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
  ],
  /* Faith mixtures are reconstruction values, not census measurements. A mix
     names its counties, or a phase and culture; the first identity becomes the
     county's principal community. */
  mixes:[
    {phase:'islands',culture:'gaelic',identities:[['gaelic','insular_traditional_476',6500],['gaelic','nicene',3500]]},
    {counties:['mainz','worms','koblenz'],identities:[['gallo_roman','nicene',6500],['frankish','germanic_pagan',3500]]},
    {counties:['ulm','freiburg'],identities:[['alamannic','germanic_pagan',7000],['roman','nicene',3000]]},
    {counties:['gyula','cluj'],identities:[['gepid','homoian',6000],['roman','nicene',4000]]},
    {counties:['balkh','termez','kabul','bamiyan','ghazni','kandahar'],identities:[['bactrian_476','buddhist_476',6500],['bactrian_476','iranian_traditional_476',3500]]},
    {counties:['mansura','debal'],identities:[['indus_476','brahmanical_476',6000],['indus_476','buddhist_476',4000]]},
    {counties:['medina'],identities:[['arabian_476','jewish',5500],['arabian_476','arabian_traditional_476',4500]]},
    {counties:['qatif'],identities:[['arabian_476','east_syriac',5500],['arabian_476','arabian_traditional_476',4500]]},
    {counties:['sanaa','aden','shibam'],identities:[['south_arabian_476','jewish',6000],['south_arabian_476','arabian_traditional_476',3000],['south_arabian_476','miaphysite',1000]]},
    {counties:['sale'],identities:[['berber','berber_traditional',6500],['roman','nicene',3500]]},
    {counties:['axum'],identities:[['aksumite_476','aksumite_christian_476',7000],['aksumite_476','horn_traditional_476',3000]]}
  ],
  siteChanges:{ tbilisi_wider_476:{ x:44.72, y:41.84 } },
  /* Coastal links are named physical crossings, not a naval capability. */
  crossings:[['iona','glasgow','coastal'],['lewis','inverness','coastal'],
    ['man','whithorn','coastal'],['man','dublin','coastal'],['ulaid','dumbarton','coastal'],['cork','cornwall','open'],
    ['candia','athens','open'],['nicosia','adana','coastal']],
  /* Compact inhabited corridors split scenery through an additive base.
     The retained scenery is the off-route remnant, never a giant kingdom.
     Row: id, name, x, y, terrain, scenery anchor, culture, faith, government.
     A corridor joins the realm owners name; otherwise it declares its own
     local realm, colored from the palette by row position. */
  sceneryPrefix:'w_',
  corridors:{
    phase:'scenery', development:1, kind:'village', realmSuffix:'_local_476',
    climate:{ northOfLatitude:45, north:'continental', south:'arid' },
    owners:{ central_iran_oases:'sasanian_476', eastern_iran_oases:'sasanian_476', sarakhs_oasis:'sasanian_476',
      palmyra_district:'byzantium', shebar_valley:'kabul_476', nurata_foothills:'samarkand_court_476' },
    duchies:{ palmyra_district:'d_476_syria_prima' },
    palette:['#94836d','#81916b','#807e9b','#779d9a'],
    realm:{ rank:1, aggression:0, assemblyGovernment:'assembly_polity',
      assembly:{ constituency:'settlement_federation', representative:{sex:'m',born:440,skills:{dip:5,ste:5,mar:4}} },
      ruler:{ generated:true, sex:'m', born:440, mar:6, trait:'patient' } },
    rows:[["draa_oases","Draa oases",-6.1,29.9,"farmland","w_sahara_w","berber","berber_traditional","lineage_kingship"],["garama","Garama",13.06,26.54,"farmland","w_sahara_c","berber","berber_traditional","regnum"],["ghadames_oasis","Ghadames oasis",9.5,30.13,"farmland","w_sahara_c","berber","berber_traditional","regnum"],["awjila_oasis","Awjila oasis",21.29,29.11,"farmland","w_sahara_e","berber","berber_traditional","regnum"],["siwa_oasis","Siwa oasis",25.53,29.2,"farmland","w_sahara_e","berber","berber_traditional","regnum"],["jenne_district","Middle Niger settlements",-4.55,13.9,"farmland","w_sahel","sahelian_476","sahel_traditional_476","assembly_polity"],["gao_district","Niger bend communities",-0.04,16.26,"farmland","w_sahel","sahelian_476","sahel_traditional_476","assembly_polity"],["chad_lakeshore","Lake Chad communities",14,13.3,"marsh","w_sahel","sahelian_476","sahel_traditional_476","assembly_polity"],["qasr_ibrim","Primis",31.99,22.65,"hills","w_nubia","nubian","nile_traditional_476","regnum"],["najran_oasis","Najran",44.19,17.49,"farmland","w_arabia","arabian_476","miaphysite","regnum"],["tayma_oasis","Tayma",38.53,27.63,"farmland","w_nefud","arabian_476","arabian_traditional_476","assembly_polity"],["palmyra_district","Palmyra",38.27,34.55,"desert","w_syrian","syriac","miaphysite","roman_civic"],["central_iran_oases","Central Iranian oases",51.58,33.98,"farmland","w_kavir","persian","zoroastrian","aristocratic_monarchy"],["eastern_iran_oases","Eastern Iranian oases",56.92,33.61,"farmland","w_lut","persian","zoroastrian","aristocratic_monarchy"],["shebar_valley","Hindu Kush pass communities",68.18,35,"mountains","w_hindukush","bactrian_476","buddhist_476","regnum"],["gomal_valley","Gomal valley",69.4,32.1,"hills","w_sulaiman","indus_476","brahmanical_476","regnum"],["thar_margin","Western Thar communities",69.19,25.75,"desert","w_thar","indus_476","brahmanical_476","assembly_polity"],["sarakhs_oasis","Sarakhs district",61.16,36.54,"farmland","w_karakum","persian","zoroastrian","aristocratic_monarchy"],["nurata_foothills","Northern Sogdian foothills",65.69,40.56,"hills","w_kyzylkum","sogdian_476","sogdian_traditional_476","regnum"],["lower_syr_darya","Lower Syr Darya communities",62.54,45,"farmland","w_steppe_e","sogdian_476","sogdian_traditional_476","assembly_polity"],["sarysu_corridor","Sarysu seasonal communities",67.95,47.87,"steppe","w_steppe_e","central_steppe_476","steppe_traditional_476","assembly_polity"],["upper_kama","Upper Kama communities",56.25,58,"forest","w_ural","finnic","finnic_traditional_476","assembly_polity"],["vychegda_district","Vychegda communities",50.9,61.67,"forest","w_taiga","finnic","finnic_traditional_476","assembly_polity"],["onega_district","Onega communities",38.96,61.5,"forest","w_north","finnic","finnic_traditional_476","assembly_polity"],["torne_district","Northern Gulf river communities",24.14,65.84,"forest","w_lapland","sami","finnic_traditional_476","assembly_polity"]]
  },
  /* The existing following can bargain along the added corridors. These
     access locations do not make its nonterritorial court a county owner. */
  mobileProfiles:{
    pontic_wider_following:{ base:'pontic_following', regions:['cherson','tomis','constantinople','etelkoz','sarkel','atil','samandar'] }
  },
  /* Priscus, fr. 40 and 47: named displaced coalitions and their diplomatic
     activity. Camp anchors and numerical stocks are reconstructions, not
     county conquests. Local residents retain their own civil institutions. */
  followings:{
    base:'river_following', government:'mobile_confederation', color:'#a68b64', culture:'oghuric_476', religion:'steppe_traditional_476',
    rank:1, aggression:0, stocks:{ food:4800, fighters:80, treasury:60 },
    rows:[
      {id:'saragur_following_476',name:'Saragur Following',capital:'sarkel',
        patron:'lower_don_476',regions:['etelkoz','sarkel','tmutarakan','samandar','derbent']},
      {id:'oghur_following_476',name:'Oghur Following',capital:'atil',
        patron:'lower_volga_476',regions:['atil','samandar','sarkel','lower_syr_darya','sarysu_corridor']}
    ]
  },
  /* Local Christian interests remain distinct from imperial public service.
     These generated households do not claim a reconstructed genealogy; each
     takes its county's name as its house. */
  aristocracy:{
    id:'sasanian_wider_476', base:'sasanian_476',
    magnates:{
      counties:['van','dvin'], actorSuffix:'_magnate', heirSuffix:'_heir', interestSuffix:'_interest',
      sex:'m', culture:'armenian', religion:'caucasian_christian_476', role:'notable',
      actor:{ born:434, station:3, skills:{ste:8,mar:7} },
      heir:{ born:455, station:2, skills:{ste:6,mar:6} },
      interest:{ officeId:'hereditary_interest', weight:2, minimumMartial:0, maximumRevenue:0.75, maximumLevy:0.7 }
    }
  },
  /* Population evidence alone does not establish an accepted Buddhist house. */
  congregations:{
    counties:['dvin','axum','dongola','balkh','samarkand','sanaa','medina','qatif','merv','tara'],
    excludeReligions:['buddhist_476'], suffix:'_476', kind:'congregation', representative:{role:'priest'}
  },
  realmChanges:{
    sasanian_476:{ aristocraticProfileId:'sasanian_wider_476', religion:'zoroastrian_sasanian_476',
      governingIdentity:{ eliteFaithId:'zoroastrian_sasanian_476' } },
    pontic_following_476:{ mobile:{ profileId:'pontic_wider_following' } }
  },
  /* The existing king is one consumer whether played or simulated. Keep his
     retained beginning intact and bind a fresh copy to this revision. */
  startCopies:[{ from:'peroz_476', id:'peroz_sasanian_476', changes:{ startReligion:'zoroastrian_sasanian_476' } }],
  /* Each revision offers the date's starts that its world can host; a
     revision-bound copy is listed even when the bookmark's starts list
     predates it, and each revision leaves out the other's court. */
  startsAlwaysListed:['peroz_sasanian_476'],
  revisionStarts:{ baseline:{ exclude:['peroz_sasanian_476'] }, wider_v2:{ exclude:['peroz_476'] } },
  techImpactReviews:{
    period_476_wider_habitation:{mode:'none',
      rationale:'Established regional households, existing civil offices and local political relationships require no technological discovery. Existing travel, equipment and production requirements remain in force.'},
    bounded_overland_corridors:{mode:'none',
      rationale:'Physical district extents and longer dry journeys are geography. Movement pays declared travel units, ordinary provisions and destination terrain through existing household, courier and army rules.'}
  }
};

(function () {
  'use strict';
  var w = FBDATA.bookmarkWider476, b = FBDATA.bookmarks[w.bookmarkId];
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function plain(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  var region = { provinces:[], realms:[], institutions:{}, phases:{} };
  FBDATA.bookmarkRegions476.wider = region;
  var seeds = {}, additions = {}, climates = Object.assign({}, b.climate.provinces);
  FBDATA.geographies.europe_regional.provinces.forEach(function (p) { seeds[p.id] = p; });
  var layout = copy(FBDATA.settlementLayouts['476']);
  FBDATA.settlementLayouts[w.layoutId] = layout;
  var opening = copy(b.opening);
  var duchies = Object.assign({}, b.duchies);
  var kingdoms = Object.assign({}, b.kingdoms);
  Object.keys(w.kingdoms).forEach(function (id) { kingdoms[id] = w.kingdoms[id]; });
  Object.keys(w.duchies).forEach(function (id) { duchies[id] = w.duchies[id]; });

  function names(name) { return [{from:w.nameWindow.from,to:w.nameWindow.to,name:name}]; }
  function settlementKind(dev) {
    return w.settlementKinds.filter(function (k) { return dev >= k.minimumDevelopment; })[0].kind;
  }
  function county(phase, row) {
    var id = row[0], name = row[1], owner = row[2], culture = row[3], religion = row[4];
    var communities = typeof row[7] === 'string' ? w.communityTemplates[row[7]] : row[7];
    if (typeof row[7] === 'string' && !communities) throw new Error('Unknown community template: ' + row[7]);
    var p = { id:id, name:name, names:names(name), realm:owner,
      culture:culture, religion:religion, dev:row[5],
      customaryRights:copy(w.customaryRights),
      communities:communities || [{culture:culture,religion:religion,populationShare0:10000}] };
    if (row[8]) p.duchy = row[8];
    var site = id + w.siteSuffix, seed = seeds[id];
    if (!seed || additions[id]) throw new Error('Invalid regional county declaration: ' + id);
    var position = row[9] || [seed.x, seed.y];
    FBDATA.settlementSites[site] = { x:position[0], y:position[1], names:names(name) };
    layout[id] = [{site:site,name:name,kind:row[10] || settlementKind(p.dev)}];
    climates[id] = row[6];
    additions[id] = p;
    region.provinces.push(p);
    (region.phases[phase] || (region.phases[phase] = [])).push(id);
  }
  function lineageCourt(template, culture, religion, home) {
    return { founderId:template.founderId, rulerFatherId:template.rulerFatherId,
      members:template.members.map(function (t) {
        var m = { id:t.id, generated:t.generated, sex:t.sex, born:t.born, culture:culture, religion:religion };
        Object.keys(t).forEach(function (key) {
          if (['id','generated','sex','born','home'].indexOf(key) < 0) m[key] = t[key];
        });
        if (t.home) m.homeProvinceId = home;
        return m;
      }) };
  }
  function regionalCounty(id) {
    if (!additions[id]) throw new Error('Unknown regional county: ' + id);
    return additions[id];
  }

  w.romanCounties.forEach(function (row) { county(w.romanPhase, row); });
  w.civilDelegates.counties.forEach(function (id) {
    var p = regionalCounty(id), d = w.civilDelegates, actor = id + d.actorSuffix;
    opening.actors[actor] = { sex:d.actor.sex, culture:p.culture, religion:p.religion, born:d.actor.born,
      station:d.actor.station, role:d.actor.role, home:id, skills:copy(d.actor.skills) };
    opening.appointments[actor] = {officeId:d.officeId,actorId:actor,realmId:p.realm,scope:{kind:'county',id:id}};
  });
  Object.keys(w.movedInstitutions).forEach(function (id) {
    if (!b.localInstitutions[id]) throw new Error('Unknown moved institution: ' + id);
    region.institutions[id] = Object.assign({}, b.localInstitutions[id], w.movedInstitutions[id]);
  });
  w.councils.counties.forEach(function (id) {
    var p = regionalCounty(id);
    region.institutions[id + w.councils.suffix] = {city:p.name,kind:w.councils.kind,provinceId:id,
      site:id + w.siteSuffix,culture:p.culture,religion:p.religion};
  });

  var groups = w.groups;
  region.groups = groups;
  groups.forEach(function (g) {
    if (!g.existing) {
      var realm = g.realm;
      if (realm.government === w.lineageCourts.government)
        realm.royalCourt = lineageCourt(w.lineageCourts.group, g.culture, g.faith, realm.capital);
      region.realms.push(realm);
    }
    g.rows.forEach(function (r) {
      county(g.phase,[r[0],r[1],g.realm.id,g.culture,g.faith,Number(r[2]),g.zone]);
    });
  });
  w.mixes.forEach(function (m) {
    var ids = m.counties || (region.phases[m.phase] || []).filter(function (id) {
      return additions[id].culture === m.culture;
    });
    ids.forEach(function (id) {
      var p = regionalCounty(id);
      p.communities = m.identities.map(function (c) {
        return {culture:c[0],religion:c[1],populationShare0:c[2],paired:true};
      });
      p.culture = m.identities[0][0];
      p.religion = m.identities[0][1];
    });
  });
  Object.keys(w.siteChanges).forEach(function (site) {
    if (!FBDATA.settlementSites[site]) throw new Error('Unknown regional site: ' + site);
    Object.assign(FBDATA.settlementSites[site], w.siteChanges[site]);
  });
  var crossings = w.crossings.map(function (row) { return [row[0], row[1]]; });
  var crossingClasses = Object.assign({},b.crossingClasses);
  w.crossings.forEach(function (row) { crossingClasses[[row[0], row[1]].sort().join('|')] = row[2]; });

  FBDATA.geographies[w.geography].provinceAdditions.forEach(function (p) { seeds[p.id] = p; });
  region.scenery = {};
  b.provinces.filter(function (p) { return p.id.indexOf(w.sceneryPrefix) === 0; }).forEach(function (p) {
    region.scenery[p.id] = {disposition:'retained',inhabited:[]};
  });
  var corridor = w.corridors;
  corridor.rows.forEach(function (c, index) {
    var owner = corridor.owners[c[0]] || c[0] + corridor.realmSuffix;
    if (!corridor.owners[c[0]]) {
      var t = corridor.realm;
      var realm = {id:owner,name:c[1],capital:c[0],government:c[8],rank:t.rank,
        religion:c[7],aggression:t.aggression,color:corridor.palette[index % corridor.palette.length]};
      if (c[8] === t.assemblyGovernment) {
        realm.constituency = t.assembly.constituency;
        realm.representative = copy(t.assembly.representative);
      } else {
        realm.ruler = {generated:t.ruler.generated,sex:t.ruler.sex,culture:c[6],born:t.ruler.born,
          mar:t.ruler.mar,trait:t.ruler.trait};
        if (c[8] === w.lineageCourts.government) realm.royalCourt = lineageCourt(w.lineageCourts.corridor, c[6], c[7], c[0]);
      }
      region.realms.push(realm);
    }
    county(corridor.phase,[c[0],c[1],owner,c[6],c[7],corridor.development,
      c[3] > corridor.climate.northOfLatitude ? corridor.climate.north : corridor.climate.south,
      null,corridor.duchies[c[0]] || null,[c[2],c[3]],corridor.kind]);
    if (!region.scenery[c[5]]) throw new Error('Unknown scenery anchor: ' + c[5]);
    region.scenery[c[5]].disposition = 'split';
    region.scenery[c[5]].inhabited.push(c[0]);
  });

  Object.keys(w.mobileProfiles).forEach(function (id) {
    var d = w.mobileProfiles[id];
    FBDATA.mobileProfiles[id] = Object.assign({},FBDATA.mobileProfiles[d.base],{regions:d.regions});
  });
  var f = w.followings;
  f.rows.forEach(function (d) {
    FBDATA.mobileProfiles[d.id] = Object.assign({},FBDATA.mobileProfiles[f.base],{regions:d.regions});
    region.realms.push({id:d.id,name:d.name,color:f.color,capital:d.capital,
      nonTerritorial:true,government:f.government,culture:f.culture,
      religion:f.religion,rank:f.rank,aggression:f.aggression,
      mobile:{profileId:d.id,patronRealmId:d.patron,origin:d.capital,target:d.capital,
        food:f.stocks.food,fighters:f.stocks.fighters,treasury:f.stocks.treasury}});
  });

  var a = w.aristocracy, mg = a.magnates;
  var interests = FBDATA.aristocraticProfiles[a.base].interests.slice();
  mg.counties.forEach(function (id) {
    var p = regionalCounty(id), actor = id + mg.actorSuffix, dynasty = p.name;
    opening.actors[actor] = {sex:mg.sex,culture:mg.culture,religion:mg.religion,
      born:mg.actor.born,station:mg.actor.station,role:mg.role,dyn:dynasty,home:id,skills:copy(mg.actor.skills)};
    opening.actors[actor + mg.heirSuffix] = {sex:mg.sex,culture:mg.culture,religion:mg.religion,
      born:mg.heir.born,station:mg.heir.station,role:mg.role,dyn:dynasty,father:actor,home:id,skills:copy(mg.heir.skills)};
    interests.push({id:id + mg.interestSuffix,name:p.name,dynasty:dynasty,actorId:actor,
      provinceId:id,officeId:mg.interest.officeId,weight:mg.interest.weight,minimumMartial:mg.interest.minimumMartial,
      maximumRevenue:mg.interest.maximumRevenue,maximumLevy:mg.interest.maximumLevy});
  });
  FBDATA.aristocraticProfiles[a.id] = Object.assign({},FBDATA.aristocraticProfiles[a.base],{interests:interests});

  var cg = w.congregations;
  cg.counties.forEach(function (id) {
    var p = regionalCounty(id);
    p.communities.forEach(function (community,index) {
      if (cg.excludeReligions.indexOf(community.religion) >= 0) return;
      region.institutions[id + '_community_' + index + cg.suffix] = {city:p.name,kind:cg.kind,
        provinceId:id,site:id + w.siteSuffix,culture:community.culture,religion:community.religion,
        representative:copy(cg.representative)};
    });
  });

  Object.keys(w.realmChanges).forEach(function (id) {
    if (!b.realms.some(function (r) { return r.id === id; })) throw new Error('Unknown regional realm change: ' + id);
  });
  var expandedRealms = b.realms.map(function (r) {
    var change = w.realmChanges[r.id];
    if (!change) return r;
    var merged = {};
    Object.keys(change).forEach(function (key) {
      merged[key] = plain(change[key]) ? Object.assign({}, r[key], change[key]) : change[key];
    });
    return Object.assign({}, r, merged);
  }).concat(region.realms);
  var expanded = {
    geography:w.geography,
    provinces:b.provinces.map(function (p) { return additions[p.id] || p; }).concat(
      FBDATA.geographies[w.geography].provinceAdditions.map(function (seed) {
        /* Shared physical additions are scenery until this date authors
           inhabitants. No later opening supplies residents or rulers. */
        return additions[seed.id] || Object.assign({}, seed);
      })),
    realms:expandedRealms, duchies:duchies, kingdoms:kingdoms,
    localInstitutions:Object.assign({}, b.localInstitutions, region.institutions),
    settlementLayout:w.layoutId, climate:{zone:b.climate.zone,provinces:climates},
    opening:opening, openingRevision:w.revision,
    openingRevisions:{}, openingLegacyRevision:w.revision,
    straits:b.straits.concat(crossings),crossingClasses:crossingClasses
  };
  expanded.openingRevisions[w.revision] = opening;
  w.startCopies.forEach(function (d) {
    var from = FBDATA.startScenarios.filter(function (s) { return s.id === d.from; })[0];
    if (!from) throw new Error('Unknown copied start: ' + d.from);
    FBDATA.startScenarios.push(Object.assign(copy(from),{id:d.id},d.changes));
  });
  function startsFor(world, rule) {
    return FBDATA.startScenarios.filter(function (s) {
      return rule.exclude.indexOf(s.id) < 0 && (!s.bookmarkIds || s.bookmarkIds.indexOf(b.id) >= 0) &&
        (!s.eras || s.eras.indexOf(b.era) >= 0) && (!b.starts || b.starts.indexOf(s.id) >= 0 ||
          w.startsAlwaysListed.indexOf(s.id) >= 0) &&
        (!s.fixedProvinceId || world.provinces.some(function (p) {
          return p.id === s.fixedProvinceId && !p.wasteland;
        })) && (!s.rulerRealmId || world.realms.some(function (r) { return r.id === s.rulerRealmId; }));
    }).map(function (s) { return s.id; });
  }
  var retainedStarts = startsFor(b, w.revisionStarts.baseline);
  expanded.starts = startsFor(expanded, w.revisionStarts[w.revision]);
  /* Open roles declare where they begin with a typed birthplaces rule in
     data/starts.js, resolved against each revision's own declarations. */
  /* Root fields are the retained merged opening. Revisions replace whole
     fields; an unstamped supported save selects this baseline. */
  b.revision = w.revision;
  b.revisions = {baseline:{starts:retainedStarts}};
  b.revisions[w.revision] = expanded;
  Object.keys(w.techImpactReviews).forEach(function (id) {
    FBDATA.techImpactReviews.features[id] = w.techImpactReviews[id];
  });
})();

/* Early Babylonian and Sardis communities are separate reconstructions;
   Samaritan households imply no Gerizim route or priesthood.
   New minority weights are simulation quantities, never historical percentages.
   Retained revisions and the fresh default remain unchanged. */
FBDATA.communalRevisions = FBDATA.communalRevisions || {};
FBDATA.communalRevisions['476'] = {
  source:'wider_v2', revision:'jewish_samaritan_v3', layoutId:'476_jewish_samaritan_v3',
  minorities:[
    {county:'baghdad',religion:'jewish',culture:'syriac'},
    {county:'sardis',religion:'jewish',culture:'greek'},
    {county:'jerusalem',religion:'samaritan',culture:'syriac'}
  ],
  sites:[
    {id:'samaria_neapolis_w15',county:'jerusalem',name:'Neapolis',kind:'town'}
  ],
  institutions:[
    {id:'jewish_meso_study_circle_476',county:'baghdad',site:null,city:'Ctesiphon',kind:'school',
      religion:'jewish',culture:'syriac',profileId:'jewish_study_circle_early'},
    {id:'jewish_sardis_congregation_476',county:'sardis',site:null,city:'Sardis',kind:'congregation',
      religion:'jewish',culture:'greek',profileId:'jewish_sardis_congregation',abbeyId:'jewish_sardis_property_476'},
    {id:'nablus_samaritan_congregation_476',county:'jerusalem',site:'samaria_neapolis_w15',city:'Neapolis',kind:'congregation',
      religion:'samaritan',culture:'syriac',profileId:'samaritan_lay_congregation'}
  ]
};
