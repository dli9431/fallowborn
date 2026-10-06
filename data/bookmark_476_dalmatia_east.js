/* 476 dalmatia east snapshot. Stable grid ids, authored politics.
   realm is both sovereign owner and direct holder under these governments.
   No later bookmark supplies owners, communities or title groups. */
window.FBDATA = window.FBDATA || {};
FBDATA.bookmarkRegions476 = FBDATA.bookmarkRegions476 || {};
FBDATA.bookmarkRegions476['dalmatia_east'] = {
  /* Regional identities inherit shared naming and appearance rules. Uncertain
     provincial incumbents are generated, never passed off as attested people. */
  cultures:{
    isaurian:{ name:'Isaurian', parent:'greek',
      nameEras:{ late_antique:{ male:['Tarasis','Illus','Trocundes','Longinus','Conon','Indacus'] } } },
    gepid:{ name:'Gepid', parent:'gothic',
      nameEras:{ late_antique:{ male:['Ardaric','Gunderit','Thraustila','Thrasaric','Mundo'] } } }
  },
  /* Civil appointments have county scope. The two Gothic captains command
     their polity's existing banner; neither is a second historical Theoderic.
     Births, skills, estate share and the unnamed offices are gameplay values. */
  opening:{
    actors:{
      amal_ruler:{ ref:{kind:'realm_ruler',realmId:'pannonia'} },
      thracian_ruler:{ ref:{kind:'realm_ruler',realmId:'thracian_goths_476'} },
      illus:{ ref:{kind:'story',storyId:'zeno_return_476',field:'illusId'} },
      trocundes:{ ref:{kind:'story',storyId:'zeno_return_476',field:'trocundesId'} },
      thessalonica_governor:{ sex:'m', culture:'greek', religion:'chalcedonian', born:431, station:3, role:'notable', home:'thessaloniki', skills:{ste:10,dip:8} },
      serdica_governor:{ sex:'m', culture:'roman', religion:'chalcedonian', born:432, station:3, role:'notable', home:'serdica', skills:{ste:9,lea:8} },
      thracia_governor:{ sex:'m', culture:'greek', religion:'chalcedonian', born:434, station:3, role:'notable', home:'philippopolis', skills:{ste:9,dip:8} },
      haemimontus_governor:{ sex:'m', culture:'greek', religion:'chalcedonian', born:433, station:3, role:'notable', home:'adrianople', skills:{ste:8,dip:8} },
      moesia_governor:{ sex:'m', culture:'roman', religion:'chalcedonian', born:430, station:3, role:'notable', home:'silistra', skills:{ste:9,lea:7} },
      dacia_governor:{ sex:'m', culture:'roman', religion:'chalcedonian', born:435, station:3, role:'notable', home:'vidin', skills:{ste:8,dip:7} },
      dardania_governor:{ sex:'m', culture:'roman', religion:'chalcedonian', born:431, station:3, role:'notable', home:'skopje', skills:{ste:8,lea:8} },
      epirus_governor:{ sex:'m', culture:'roman', religion:'chalcedonian', born:434, station:3, role:'notable', home:'dyrrachion', skills:{ste:9,dip:9} },
      bithynia_governor:{ sex:'m', culture:'greek', religion:'chalcedonian', born:430, station:3, role:'notable', home:'nicaea', skills:{ste:10,lea:9} },
      galatia_governor:{ sex:'m', culture:'greek', religion:'chalcedonian', born:432, station:3, role:'notable', home:'ancyra', skills:{ste:10,dip:8} },
      lydia_governor:{ sex:'m', culture:'greek', religion:'chalcedonian', born:434, station:3, role:'notable', home:'sardis', skills:{ste:9,lea:8} },
      pamphylia_governor:{ sex:'m', culture:'greek', religion:'chalcedonian', born:433, station:3, role:'notable', home:'attaleia', skills:{ste:9,dip:8} },
      cappadocia_governor:{ sex:'m', culture:'greek', religion:'chalcedonian', born:430, station:3, role:'notable', home:'caesarea', skills:{ste:9,lea:9} },
      isaurian_magnate:{ name:'Longinus', sex:'m', culture:'isaurian', religion:'chalcedonian', born:450, station:3, role:'notable', home:'ikonion', dyn:'Isaurian household', skills:{ste:8,dip:8} },
      amal_captain:{ sex:'m', culture:'gothic', religion:'homoian', born:441, station:3, role:'commander', home:'thessaloniki', skills:{mar:10,dip:7} },
      thracian_captain:{ sex:'m', culture:'gothic', religion:'homoian', born:436, station:3, role:'commander', home:'adrianople', skills:{mar:10,dip:8} }
    },
    appointments:{
      thracian_imperial_command:{ officeId:'magister_praesentalis', actorId:'thracian_ruler', realmId:'byzantium', scope:{kind:'host',id:'host_476_thracian'} },
      thessalonica_governor:{ officeId:'consularis', actorId:'thessalonica_governor', realmId:'byzantium', scope:{kind:'county',id:'thessaloniki'} },
      serdica_governor:{ officeId:'consularis', actorId:'serdica_governor', realmId:'byzantium', scope:{kind:'county',id:'serdica'} },
      thracia_governor:{ officeId:'consularis', actorId:'thracia_governor', realmId:'byzantium', scope:{kind:'county',id:'philippopolis'} },
      haemimontus_governor:{ officeId:'praeses', actorId:'haemimontus_governor', realmId:'byzantium', scope:{kind:'county',id:'adrianople'} },
      moesia_governor:{ officeId:'praeses', actorId:'moesia_governor', realmId:'byzantium', scope:{kind:'county',id:'silistra'} },
      dacia_governor:{ officeId:'praeses', actorId:'dacia_governor', realmId:'byzantium', scope:{kind:'county',id:'vidin'} },
      dardania_governor:{ officeId:'praeses', actorId:'dardania_governor', realmId:'byzantium', scope:{kind:'county',id:'skopje'} },
      epirus_governor:{ officeId:'praeses', actorId:'epirus_governor', realmId:'byzantium', scope:{kind:'county',id:'dyrrachion'} },
      bithynia_governor:{ officeId:'consularis', actorId:'bithynia_governor', realmId:'byzantium', scope:{kind:'county',id:'nicaea'} },
      galatia_governor:{ officeId:'consularis', actorId:'galatia_governor', realmId:'byzantium', scope:{kind:'county',id:'ancyra'} },
      lydia_governor:{ officeId:'consularis', actorId:'lydia_governor', realmId:'byzantium', scope:{kind:'county',id:'sardis'} },
      pamphylia_governor:{ officeId:'consularis', actorId:'pamphylia_governor', realmId:'byzantium', scope:{kind:'county',id:'attaleia'} },
      cappadocia_governor:{ officeId:'praeses', actorId:'cappadocia_governor', realmId:'byzantium', scope:{kind:'county',id:'caesarea'} },
      amal_unit_command:{ officeId:'tribunus', actorId:'amal_captain', realmId:'pannonia', scope:{kind:'host',id:'host_476_amal'} },
      thracian_unit_command:{ officeId:'tribunus', actorId:'thracian_captain', realmId:'thracian_goths_476', scope:{kind:'host',id:'host_476_thracian'} }
    },
    estates:[{ id:'isaurian_family_estate_476', actorId:'isaurian_magnate', provinceId:'ikonion', share0:500, basis:'tenure', evidence:'isaurian_magnate_property_476' }],
    claims:[
      { id:'amal_balkan_settlement_476', realmId:'pannonia', countyIds:['thessaloniki','serres','vidin'], share0:1500, evidence:'unaccepted_amal_settlement_terms_476' },
      { id:'thracian_settlement_476', realmId:'thracian_goths_476', countyIds:['adrianople','philippopolis'], share0:1500, evidence:'unaccepted_thracian_settlement_terms_476' }
    ], migrations:[]
  },
  storyActors:{
    illus:{ name:'Illus', culture:'isaurian', religion:'chalcedonian', age:40, station:4, role:'commander', home:'ikonion' },
    trocundes:{ name:'Trocundes', culture:'isaurian', religion:'chalcedonian', age:40, station:4, role:'commander', home:'ikonion' }
  },
  serviceStarts:[
    { templateId:'paid_service', patronRealmId:'byzantium', federateRealmId:'pannonia', hostId:'host_476_amal', payPerSeason:10, endTurn:360 },
    { templateId:'paid_service', patronRealmId:'byzantium', federateRealmId:'thracian_goths_476', hostId:'host_476_thracian', payPerSeason:12, endTurn:360 }
  ],
  migrations:{
    theoderic_italy:{ realmId:'pannonia', patronRealmId:'byzantium', hostId:'host_476_amal', origin:'thessaloniki', target:'ravenna', firstYear:488, lastYear:493, durationDays:2160, templateId:'commissioned_migration', settlementForm:'regnum', men:160, units:{levy:100,ret:60} }
  },
  storyIds:['thracian_pressure_476','amal_epirus_476'],
  campaigns:{
  theoderic_italy_476:{ id:'theoderic_italy_476', type:'campaign',
    requires:['western_court_476'], name:'The Amal Commission for Italy',
    desc:'Theoderic the Amal can receive Zeno’s commission and lead his existing host and court toward Ravenna. Theoderic Strabo’s Thracian host remains a separate body.',
    firstYear:488, lastYear:493, durationDays:2160,
    actor:{ realmId:'pannonia', character:{ storyId:'western_court_476', field:'theodericId' } },
    target:{ provinceId:'ravenna', ownerIds:['italy','federates_476'] },
    conditions:[
      { kind:'ruler', realmId:'byzantium', character:{ storyId:'western_court_476', field:'zenoId' } },
      { kind:'owner', provinceId:'constantinople', realmId:'byzantium' },
      { kind:'landless', realmId:'pannonia' },
      { kind:'host', hostId:'host_476_amal', realmId:'pannonia' }
    ],
    commission:{ source:'imperial_commission', issuerRealmId:'byzantium' },
    migrationId:'theoderic_italy',
    settlement:{ churchId:'rome_see', civicId:'ravenna_council',
      faithId:'nicene', minimumShare:0.5, governmentForm:'roman_civic' },
    news:{
      started:{ key:'news.476.theoderic_campaign', text:'⚔ The Amal court marches toward Ravenna under an eastern commission. War and settlement must secure its objective.' },
      won:{ key:'news.476.theoderic_outcome', text:'🏛 The Gothic court now holds Ravenna; local church and civic rights depend on the surviving delegates.' },
      failed:{ key:'news.476.theoderic_failed', text:'🏳 The Amal campaign ends without completing its Italian settlement.' },
      diverted:{ key:'news.476.theoderic_diverted', text:'📜 The Italian opportunity no longer fits the Amal and eastern courts.' },
      interrupted:{ key:'news.476.theoderic_interrupted', text:'📜 The host or living imperial mandate needed for the Amal campaign is lost.' }
    } },
    thracian_pressure_476:{ id:'thracian_pressure_476', type:'campaign', requires:['western_court_476','zeno_return_476'],
      name:'The Thracian Gothic Challenge', desc:'The Thracian host can contest Constantinople after Zeno’s return. Office and service disputes create an opportunity for ordinary war; the capital is never awarded by a date.',
      firstYear:477, lastYear:481, durationDays:720, settlementForm:'regnum',
      actor:{realmId:'thracian_goths_476'}, target:{provinceId:'constantinople',ownerIds:['byzantium'],character:{storyId:'western_court_476',field:'zenoId'}},
      conditions:[{kind:'ruler',realmId:'byzantium',character:{storyId:'western_court_476',field:'zenoId'}},
        {kind:'landless',realmId:'thracian_goths_476'},{kind:'host',realmId:'thracian_goths_476',hostId:'host_476_thracian'}],
      news:{
        started:{key:'news.476.thracian_pressure_started',text:'⚔ The Thracian Gothic host contests the eastern capital. An ordinary campaign must decide possession.'},
        won:{key:'news.476.thracian_pressure_won',text:'🏛 The Thracian Gothic court secures Constantinople through its campaign.'},
        failed:{key:'news.476.thracian_pressure_failed',text:'🏳 The Thracian challenge ends without securing the eastern capital.'},
        diverted:{key:'news.476.thracian_pressure_diverted',text:'📜 The eastern and Thracian courts have taken another course; the capital challenge closes.'},
        interrupted:{key:'news.476.thracian_pressure_interrupted',text:'📜 The living court or host needed for the Thracian challenge is lost.'}
      } },
    amal_epirus_476:{ id:'amal_epirus_476', type:'campaign', requires:['western_court_476','zeno_return_476'],
      name:'The Amal Host in Epirus', desc:'The Amal host may contest Dyrrachium during the Balkan disputes. A successful territorial settlement changes its later eligibility for the Italian commission.',
      firstYear:479, lastYear:483, durationDays:720, settlementForm:'regnum',
      actor:{realmId:'pannonia',character:{storyId:'western_court_476',field:'theodericId'}}, target:{provinceId:'dyrrachion',ownerIds:['byzantium']},
      conditions:[{kind:'ruler',realmId:'byzantium',character:{storyId:'western_court_476',field:'zenoId'}},
        {kind:'owner',realmId:'byzantium',provinceId:'constantinople'},
        {kind:'landless',realmId:'pannonia'},{kind:'host',realmId:'pannonia',hostId:'host_476_amal'}],
      news:{
        started:{key:'news.476.amal_epirus_started',text:'⚔ The Amal host contests Dyrrachium. The eastern court and an ordinary campaign must answer the challenge.'},
        won:{key:'news.476.amal_epirus_won',text:'🏛 The Amal court secures Dyrrachium through its campaign; the local communities remain.'},
        failed:{key:'news.476.amal_epirus_failed',text:'🏳 The Amal campaign in Epirus ends without securing Dyrrachium.'},
        diverted:{key:'news.476.amal_epirus_diverted',text:'📜 The Balkan courts have taken another course; the Epirus opportunity closes.'},
        interrupted:{key:'news.476.amal_epirus_interrupted',text:'📜 The living Amal host or eastern court needed for the Epirus campaign is lost.'}
      } }
  },
  institutions:{
    salona_council:{ city:'Salona', kind:'council', provinceId:'split', site:'salona_476', religion:'nicene', culture:'roman' },
    salona_see:{ city:'Salona', kind:'see', provinceId:'split', site:'salona_476', religion:'nicene', culture:'roman', officeId:'salona_bishop', historicalName:'Glycerius' },
    constantinople_senate:{ city:'Constantinople', kind:'senate', provinceId:'constantinople', site:'constantinople', religion:'chalcedonian', culture:'greek' },
    constantinople_see:{ city:'Constantinople', kind:'patriarchate', provinceId:'constantinople', site:'constantinople', religion:'chalcedonian', culture:'greek', officeId:'constantinople_patriarch', historicalName:'Acacius' },
    thessalonica_see:{ city:'Thessalonica', kind:'see', provinceId:'thessaloniki', site:'thessalonica_476', religion:'chalcedonian', culture:'greek', officeId:'thessalonica_bishop' },
    dyrrachium_see:{ city:'Dyrrachium', kind:'see', provinceId:'dyrrachion', site:'dyrrachium_476', religion:'chalcedonian', culture:'roman', officeId:'dyrrachium_bishop' },
    serdica_see:{ city:'Serdica', kind:'see', provinceId:'serdica', site:'serdica_476', religion:'chalcedonian', culture:'roman', officeId:'serdica_bishop' },
    nicaea_see:{ city:'Nicaea', kind:'see', provinceId:'nicaea', site:'nicaea_476', religion:'chalcedonian', culture:'greek', officeId:'nicaea_bishop' },
    ephesus_see:{ city:'Ephesus', kind:'see', provinceId:'ephesos', site:'ephesus_476', religion:'chalcedonian', culture:'greek', officeId:'ephesus_bishop' },
    caesarea_see:{ city:'Caesarea', kind:'see', provinceId:'caesarea', site:'caesarea_476', religion:'chalcedonian', culture:'greek', officeId:'caesarea_bishop' },
    thessalonica_council:{ city:'Thessalonica', kind:'council', provinceId:'thessaloniki', site:'thessalonica_476', religion:'chalcedonian', culture:'greek' },
    serdica_council:{ city:'Serdica', kind:'council', provinceId:'serdica', site:'serdica_476', religion:'chalcedonian', culture:'roman' },
    sirmium_council:{ city:'Sirmium', kind:'council', provinceId:'sirmium', site:'sirmium_476', religion:'nicene', culture:'roman' },
    sirmium_see:{ city:'Sirmium', kind:'see', provinceId:'sirmium', site:'sirmium_476', religion:'nicene', culture:'roman', officeId:'sirmium_bishop' },
    mursa_council:{ city:'Mursa', kind:'council', provinceId:'osijek', site:'mursa_476', religion:'nicene', culture:'roman' },
    mursa_see:{ city:'Mursa', kind:'see', provinceId:'osijek', site:'mursa_476', religion:'nicene', culture:'roman', officeId:'mursa_bishop' },
    hadrianopolis_council:{ city:'Hadrianopolis', kind:'council', provinceId:'adrianople', site:'hadrianopolis_476', religion:'chalcedonian', culture:'greek' },
    hadrianopolis_see:{ city:'Hadrianopolis', kind:'see', provinceId:'adrianople', site:'hadrianopolis_476', religion:'chalcedonian', culture:'greek', officeId:'hadrianopolis_bishop' },
    philippopolis_council:{ city:'Philippopolis', kind:'council', provinceId:'philippopolis', site:'philippopolis_476', religion:'chalcedonian', culture:'greek' },
    philippopolis_see:{ city:'Philippopolis', kind:'see', provinceId:'philippopolis', site:'philippopolis_476', religion:'chalcedonian', culture:'greek', officeId:'philippopolis_bishop' },
    durostorum_council:{ city:'Durostorum', kind:'council', provinceId:'silistra', site:'durostorum_476', religion:'chalcedonian', culture:'roman' },
    durostorum_see:{ city:'Durostorum', kind:'see', provinceId:'silistra', site:'durostorum_476', religion:'chalcedonian', culture:'roman', officeId:'durostorum_bishop' },
    bononia_danube_council:{ city:'Bononia', kind:'council', provinceId:'vidin', site:'bononia_danube_476', religion:'chalcedonian', culture:'roman' },
    bononia_danube_see:{ city:'Bononia', kind:'see', provinceId:'vidin', site:'bononia_danube_476', religion:'chalcedonian', culture:'roman', officeId:'bononia_danube_bishop' },
    scupi_council:{ city:'Scupi', kind:'council', provinceId:'skopje', site:'scupi_476', religion:'chalcedonian', culture:'roman' },
    scupi_see:{ city:'Scupi', kind:'see', provinceId:'skopje', site:'scupi_476', religion:'chalcedonian', culture:'roman', officeId:'scupi_bishop' },
    lychnidus_council:{ city:'Lychnidus', kind:'council', provinceId:'ohrid', site:'lychnidus_476', religion:'chalcedonian', culture:'greek' },
    lychnidus_see:{ city:'Lychnidus', kind:'see', provinceId:'ohrid', site:'lychnidus_476', religion:'chalcedonian', culture:'greek', officeId:'lychnidus_bishop' },
    dyrrachium_council:{ city:'Dyrrachium', kind:'council', provinceId:'dyrrachion', site:'dyrrachium_476', religion:'chalcedonian', culture:'roman' },
    corinth_council:{ city:'Corinth', kind:'council', provinceId:'korinth', site:'corinth_476', religion:'chalcedonian', culture:'greek' },
    corinth_see:{ city:'Corinth', kind:'see', provinceId:'korinth', site:'corinth_476', religion:'chalcedonian', culture:'greek', officeId:'corinth_bishop' },
    athens_council:{ city:'Athens', kind:'council', provinceId:'athens', site:'athens_476', religion:'chalcedonian', culture:'greek' },
    athens_see:{ city:'Athens', kind:'see', provinceId:'athens', site:'athens_476', religion:'chalcedonian', culture:'greek', officeId:'athens_bishop' },
    nicaea_council:{ city:'Nicaea', kind:'council', provinceId:'nicaea', site:'nicaea_476', religion:'chalcedonian', culture:'greek' },
    ancyra_council:{ city:'Ancyra', kind:'council', provinceId:'ancyra', site:'ancyra_476', religion:'chalcedonian', culture:'greek' },
    ancyra_see:{ city:'Ancyra', kind:'see', provinceId:'ancyra', site:'ancyra_476', religion:'chalcedonian', culture:'greek', officeId:'ancyra_bishop' },
    sardis_council:{ city:'Sardis', kind:'council', provinceId:'sardis', site:'sardis_476', religion:'chalcedonian', culture:'greek' },
    sardis_see:{ city:'Sardis', kind:'see', provinceId:'sardis', site:'sardis_476', religion:'chalcedonian', culture:'greek', officeId:'sardis_bishop' },
    ephesus_council:{ city:'Ephesus', kind:'council', provinceId:'ephesos', site:'ephesus_476', religion:'chalcedonian', culture:'greek' },
    attalea_council:{ city:'Attalea', kind:'council', provinceId:'attaleia', site:'attalea_476', religion:'chalcedonian', culture:'greek' },
    attalea_see:{ city:'Attalea', kind:'see', provinceId:'attaleia', site:'attalea_476', religion:'chalcedonian', culture:'greek', officeId:'attalea_bishop' },
    caesarea_council:{ city:'Caesarea', kind:'council', provinceId:'caesarea', site:'caesarea_476', religion:'chalcedonian', culture:'greek' },
    sebastea_council:{ city:'Sebastea', kind:'council', provinceId:'sebasteia', site:'sebastea_476', religion:'chalcedonian', culture:'greek' },
    sebastea_see:{ city:'Sebastea', kind:'see', provinceId:'sebasteia', site:'sebastea_476', religion:'chalcedonian', culture:'greek', officeId:'sebastea_bishop' },
    iconium_council:{ city:'Iconium', kind:'council', provinceId:'ikonion', site:'ikonion_476', religion:'chalcedonian', culture:'greek' },
    iconium_see:{ city:'Iconium', kind:'see', provinceId:'ikonion', site:'ikonion_476', religion:'chalcedonian', culture:'greek', officeId:'iconium_bishop' },
    sirmium_homoian_congregation:{ city:'Sirmium', kind:'congregation', provinceId:'sirmium', site:'sirmium_476', religion:'homoian', culture:'gepid' },
    thessalonica_homoian_congregation:{ city:'Thessalonica', kind:'congregation', provinceId:'thessaloniki', site:'thessalonica_476', religion:'homoian', culture:'gothic' },
    hadrianopolis_homoian_congregation:{ city:'Hadrianopolis', kind:'congregation', provinceId:'adrianople', site:'hadrianopolis_476', religion:'homoian', culture:'gothic' },
    isaurian_congregation:{ city:'Isauria', kind:'congregation', provinceId:'ikonion', site:'isauria_476', religion:'chalcedonian', culture:'isaurian' },
    ephesus_miaphysite_congregation:{ city:'Ephesus', kind:'congregation', provinceId:'ephesos', site:'ephesus_476', religion:'miaphysite', culture:'greek', representative:{name:'Paul',born:430,role:'priest',station:3} }
  },
  /* Physical anchors and dated proper names, not exact county boundaries.
     Existing Salona/Spalatum and Iconium/Isaurian-court slots stay in order. */
  sites:{
    sirmium_476:{ x:19.61, y:44.97, names:[{ from:400, to:649, name:'Sirmium' }] },
    mursa_476:{ x:18.70, y:45.56, names:[{ from:400, to:649, name:'Mursa' }] },
    pannonia_interior_476:{ x:18.41, y:47.19, names:[{ from:400, to:649, name:'Pannonian interior' }] },
    upper_pannonia_476:{ x:17.27, y:47.88, names:[{ from:400, to:649, name:'Upper Pannonian community' }] },
    hadrianopolis_476:{ x:26.56, y:41.68, names:[{ from:400, to:649, name:'Hadrianopolis' }] },
    thessalonica_476:{ x:22.94, y:40.64, names:[{ from:400, to:649, name:'Thessalonica' }] },
    serrhae_476:{ x:23.55, y:41.09, names:[{ from:400, to:649, name:'Serrhae' }] },
    larissa_476:{ x:22.42, y:39.64, names:[{ from:400, to:649, name:'Larissa' }] },
    athens_476:{ x:23.73, y:37.97, names:[{ from:400, to:649, name:'Athens' }] },
    thebes_476:{ x:23.32, y:38.32, names:[{ from:400, to:649, name:'Thebes' }] },
    corinth_476:{ x:22.88, y:37.91, names:[{ from:400, to:649, name:'Corinth' }] },
    sparta_476:{ x:22.43, y:37.08, names:[{ from:400, to:649, name:'Sparta' }] },
    epirus_interior_476:{ x:20.85, y:39.66, names:[{ from:400, to:649, name:'Epirus interior' }] },
    dyrrachium_476:{ x:19.45, y:41.31, names:[{ from:400, to:649, name:'Dyrrachium' }] },
    nicaea_476:{ x:29.72, y:40.43, names:[{ from:400, to:649, name:'Nicaea' }] },
    dorylaeum_476:{ x:30.52, y:39.78, names:[{ from:400, to:649, name:'Dorylaeum' }] },
    ancyra_476:{ x:32.86, y:39.93, names:[{ from:400, to:649, name:'Ancyra' }] },
    amorium_476:{ x:31.30, y:39.02, names:[{ from:400, to:649, name:'Amorium' }] },
    smyrna_476:{ x:27.14, y:38.42, names:[{ from:400, to:649, name:'Smyrna' }] },
    sardis_476:{ x:28.04, y:38.49, names:[{ from:400, to:649, name:'Sardis' }] },
    ephesus_476:{ x:27.34, y:37.94, names:[{ from:400, to:649, name:'Ephesus' }] },
    attalea_476:{ x:30.72, y:36.88, names:[{ from:400, to:649, name:'Attalea' }] },
    caesarea_476:{ x:35.48, y:38.72, names:[{ from:400, to:649, name:'Caesarea' }] },
    sebastea_476:{ x:37.02, y:39.75, names:[{ from:400, to:649, name:'Sebastea' }] },
    sinope_476:{ x:35.15, y:42.03, names:[{ from:400, to:649, name:'Sinope' }] },
    novae_476:{ x:25.35, y:43.61, names:[{ from:400, to:649, name:'Novae' }] },
    durostorum_476:{ x:27.26, y:44.12, names:[{ from:400, to:649, name:'Durostorum' }] },
    bononia_danube_476:{ x:22.87, y:43.99, names:[{ from:400, to:649, name:'Bononia' }] },
    serdica_476:{ x:23.32, y:42.70, names:[{ from:400, to:649, name:'Serdica' }] },
    philippopolis_476:{ x:24.75, y:42.15, names:[{ from:400, to:649, name:'Philippopolis' }] },
    scupi_476:{ x:21.39, y:42.02, names:[{ from:400, to:649, name:'Scupi' }] },
    lychnidus_476:{ x:20.80, y:41.12, names:[{ from:400, to:649, name:'Lychnidus' }] },
    acruvium_476:{ x:18.77, y:42.42, names:[{ from:400, to:649, name:'Acruvium' }] },
    burnum_476:{ x:16.04, y:44.02, names:[{ from:400, to:649, name:'Burnum' }] },
    iader_476:{ x:15.23, y:44.12, names:[{ from:400, to:649, name:'Iader' }] },
    andautonia_476:{ x:16.12, y:45.77, names:[{ from:400, to:649, name:'Andautonia' }] },
    siscia_476:{ x:16.37, y:45.49, names:[{ from:400, to:649, name:'Siscia' }] }
  },
  layouts:{
    szekesfehervar:[{ site:'pannonia_interior_476', name:'Pannonian interior', kind:'town' }],
    moson:[{ site:'upper_pannonia_476', name:'Upper Pannonian community', kind:'village' }],
    sirmium:[{ site:'sirmium_476', name:'Sirmium', kind:'town' }],
    osijek:[{ site:'mursa_476', name:'Mursa', kind:'town' }],
    constantinople:[{ site:'constantinople', name:'Constantinople', kind:'city' }],
    adrianople:[{ site:'hadrianopolis_476', name:'Hadrianopolis', kind:'town' }],
    thessaloniki:[{ site:'thessalonica_476', name:'Thessalonica', kind:'city' }],
    serres:[{ site:'serrhae_476', name:'Serrhae', kind:'town' }],
    larissa:[{ site:'larissa_476', name:'Larissa', kind:'town' }],
    athens:[{ site:'athens_476', name:'Athens', kind:'town' }],
    thebes:[{ site:'thebes_476', name:'Thebes', kind:'town' }],
    korinth:[{ site:'corinth_476', name:'Corinth', kind:'town' }],
    sparta:[{ site:'sparta_476', name:'Sparta', kind:'town' }],
    ioannina:[{ site:'epirus_interior_476', name:'Epirus interior', kind:'village' }],
    dyrrachion:[{ site:'dyrrachium_476', name:'Dyrrachium', kind:'town' }],
    nicaea:[{ site:'nicaea_476', name:'Nicaea', kind:'town' }],
    dorylaion:[{ site:'dorylaeum_476', name:'Dorylaeum', kind:'town' }],
    ancyra:[{ site:'ancyra_476', name:'Ancyra', kind:'town' }],
    amorion:[{ site:'amorium_476', name:'Amorium', kind:'town' }],
    smyrna:[{ site:'smyrna_476', name:'Smyrna', kind:'town' }],
    sardis:[{ site:'sardis_476', name:'Sardis', kind:'town' }],
    ephesos:[{ site:'ephesus_476', name:'Ephesus', kind:'town' }],
    attaleia:[{ site:'attalea_476', name:'Attalea', kind:'town' }],
    ikonion:[{ site:'ikonion_476', name:'Iconium', kind:'town', communities:[{culture:'greek',religion:'chalcedonian',populationShare0:8000},{culture:'isaurian',religion:'chalcedonian',populationShare0:1000},{culture:'greek',religion:'miaphysite',populationShare0:1000}] }, { site:'isauria_476', name:'Isaurian court', kind:'village', communities:[{culture:'greek',religion:'chalcedonian',populationShare0:3000},{culture:'isaurian',religion:'chalcedonian',populationShare0:6000},{culture:'greek',religion:'miaphysite',populationShare0:1000}] }],
    caesarea:[{ site:'caesarea_476', name:'Caesarea', kind:'town' }],
    sebasteia:[{ site:'sebastea_476', name:'Sebastea', kind:'town' }],
    sinope:[{ site:'sinope_476', name:'Sinope', kind:'town' }],
    pliska:[{ site:'pliska_476', name:'Abritus', kind:'town', communities:[{culture:'roman',religion:'chalcedonian',populationShare0:8000},{culture:'greek',religion:'chalcedonian',populationShare0:1800},{culture:'gothic',religion:'homoian',populationShare0:200}] }, { site:'novae_476', name:'Novae', kind:'town', communities:[{culture:'roman',religion:'chalcedonian',populationShare0:6000},{culture:'greek',religion:'chalcedonian',populationShare0:2000},{culture:'gothic',religion:'homoian',populationShare0:2000}] }],
    silistra:[{ site:'durostorum_476', name:'Durostorum', kind:'town' }],
    vidin:[{ site:'bononia_danube_476', name:'Bononia', kind:'town' }],
    serdica:[{ site:'serdica_476', name:'Serdica', kind:'town' }],
    philippopolis:[{ site:'philippopolis_476', name:'Philippopolis', kind:'town' }],
    skopje:[{ site:'scupi_476', name:'Scupi', kind:'town' }],
    ohrid:[{ site:'lychnidus_476', name:'Lychnidus', kind:'town' }],
    kotor:[{ site:'acruvium_476', name:'Acruvium', kind:'town' }],
    knin:[{ site:'burnum_476', name:'Burnum', kind:'village' }],
    split:[{ site:'salona_476', name:'Salona', kind:'city' }, { site:'split', name:'Spalatum', kind:'village' }],
    zadar:[{ site:'iader_476', name:'Iader', kind:'town' }],
    zagreb:[{ site:'andautonia_476', name:'Andautonia', kind:'village' }],
    sisak:[{ site:'siscia_476', name:'Siscia', kind:'town' }]
  },
  provinces:[
    { id:'szekesfehervar', name:'Pannonian interior', names:[{ from:400, to:649, name:'Pannonian interior' }], realm:'gepids_476', culture:'roman', religion:'nicene', dev:2, customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'roman', religion:'nicene', populationShare0:6000 }, { culture:'gepid', religion:'homoian', paired:true, populationShare0:2500 }, { culture:'rugian', religion:'homoian', paired:true, populationShare0:1000 }, { culture:'gothic', religion:'homoian', paired:true, populationShare0:500 }] },
    { id:'moson', name:'Upper Pannonia', names:[{ from:400, to:649, name:'Upper Pannonia' }], realm:'gepids_476', culture:'roman', religion:'nicene', dev:1, customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'roman', religion:'nicene', populationShare0:6000 }, { culture:'gepid', religion:'homoian', paired:true, populationShare0:2000 }, { culture:'rugian', religion:'homoian', paired:true, populationShare0:2000 }] },
    { id:'sirmium', name:'Sirmium', names:[{ from:400, to:649, name:'Sirmium' }], realm:'gepids_476', culture:'roman', religion:'nicene', dev:2, customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'roman', religion:'nicene', populationShare0:7000 }, { culture:'gepid', religion:'homoian', paired:true, populationShare0:2500 }, { culture:'gothic', religion:'homoian', paired:true, populationShare0:500 }] },
    { id:'osijek', name:'Mursa', names:[{ from:400, to:649, name:'Mursa' }], realm:'gepids_476', culture:'roman', religion:'nicene', dev:1, customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'roman', religion:'nicene', populationShare0:7500 }, { culture:'gepid', religion:'homoian', paired:true, populationShare0:2000 }, { culture:'gothic', religion:'homoian', paired:true, populationShare0:500 }] },
    { id:'constantinople', name:'Constantinople', names:[{ from:400, to:649, name:'Constantinople' }], realm:'byzantium', culture:'greek', religion:'chalcedonian', dev:9, duchy:'d_476_europa', customaryRights:[
      { power:'peace', basis:'tenure', basisRef:'provincial_court_476:constantinople' },
      { power:'revenue', basis:'tenure', basisRef:'provincial_court_476:constantinople' }
    ], communities:[{ culture:'greek', religion:'chalcedonian', populationShare0:8500 }, { culture:'greek', religion:'miaphysite', populationShare0:1500 }] },
    { id:'adrianople', name:'Hadrianopolis', names:[{ from:400, to:649, name:'Hadrianopolis' }], realm:'byzantium', culture:'greek', religion:'chalcedonian', dev:4, duchy:'d_476_haemimontus', customaryRights:[
      { power:'peace', basis:'tenure', basisRef:'provincial_court_476:adrianople' },
      { power:'revenue', basis:'tenure', basisRef:'provincial_court_476:adrianople' }
    ], communities:[{ culture:'greek', religion:'chalcedonian', populationShare0:8500 }, { culture:'gothic', religion:'homoian', paired:true, populationShare0:1500 }] },
    { id:'thessaloniki', name:'Thessalonica', names:[{ from:400, to:649, name:'Thessalonica' }], realm:'byzantium', culture:'greek', religion:'chalcedonian', dev:6, duchy:'d_476_macedonia_prima', customaryRights:[
      { power:'peace', basis:'tenure', basisRef:'provincial_court_476:thessaloniki' },
      { power:'revenue', basis:'tenure', basisRef:'provincial_court_476:thessaloniki' }
    ], communities:[{ culture:'greek', religion:'chalcedonian', populationShare0:8500 }, { culture:'gothic', religion:'homoian', paired:true, populationShare0:1500 }] },
    { id:'serres', name:'Serrhae', names:[{ from:400, to:649, name:'Serrhae' }], realm:'byzantium', culture:'greek', religion:'chalcedonian', dev:2, duchy:'d_476_macedonia_prima', customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'greek', religion:'chalcedonian', populationShare0:8500 }, { culture:'gothic', religion:'homoian', paired:true, populationShare0:1500 }] },
    { id:'larissa', name:'Larissa', names:[{ from:400, to:649, name:'Larissa' }], realm:'byzantium', culture:'greek', religion:'chalcedonian', dev:3, duchy:'d_476_thessalia', customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'greek', religion:'chalcedonian', populationShare0:10000 }] },
    { id:'athens', name:'Athens', names:[{ from:400, to:649, name:'Athens' }], realm:'byzantium', culture:'greek', religion:'chalcedonian', dev:3, duchy:'d_476_achaia', customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'greek', religion:'chalcedonian', populationShare0:10000 }] },
    { id:'thebes', name:'Thebes', names:[{ from:400, to:649, name:'Thebes' }], realm:'byzantium', culture:'greek', religion:'chalcedonian', dev:3, duchy:'d_476_achaia', customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'greek', religion:'chalcedonian', populationShare0:10000 }] },
    { id:'korinth', name:'Corinth', names:[{ from:400, to:649, name:'Corinth' }], realm:'byzantium', culture:'greek', religion:'chalcedonian', dev:3, duchy:'d_476_achaia', customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'greek', religion:'chalcedonian', populationShare0:10000 }] },
    { id:'sparta', name:'Sparta', names:[{ from:400, to:649, name:'Sparta' }], realm:'byzantium', culture:'greek', religion:'chalcedonian', dev:2, duchy:'d_476_achaia', customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'greek', religion:'chalcedonian', populationShare0:10000 }] },
    { id:'ioannina', name:'Epirus interior', names:[{ from:400, to:649, name:'Epirus interior' }], realm:'byzantium', culture:'greek', religion:'chalcedonian', dev:2, duchy:'d_476_epirus_vetus', customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'greek', religion:'chalcedonian', populationShare0:7000 }, { culture:'roman', religion:'chalcedonian', populationShare0:3000 }] },
    { id:'dyrrachion', name:'Dyrrachium', names:[{ from:400, to:649, name:'Dyrrachium' }], realm:'byzantium', culture:'greek', religion:'chalcedonian', dev:3, duchy:'d_476_epirus_nova', customaryRights:[
      { power:'peace', basis:'tenure', basisRef:'provincial_court_476:dyrrachion' },
      { power:'revenue', basis:'tenure', basisRef:'provincial_court_476:dyrrachion' }
    ], communities:[{ culture:'greek', religion:'chalcedonian', populationShare0:7000 }, { culture:'roman', religion:'chalcedonian', populationShare0:3000 }] },
    { id:'nicaea', name:'Nicaea', names:[{ from:400, to:649, name:'Nicaea' }], realm:'byzantium', culture:'greek', religion:'chalcedonian', dev:4, duchy:'d_476_bithynia', customaryRights:[
      { power:'peace', basis:'tenure', basisRef:'provincial_court_476:nicaea' },
      { power:'revenue', basis:'tenure', basisRef:'provincial_court_476:nicaea' }
    ], communities:[{ culture:'greek', religion:'chalcedonian', populationShare0:8500 }, { culture:'greek', religion:'miaphysite', populationShare0:1500 }] },
    { id:'dorylaion', name:'Dorylaeum', names:[{ from:400, to:649, name:'Dorylaeum' }], realm:'byzantium', culture:'greek', religion:'chalcedonian', dev:3, duchy:'d_476_bithynia', customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'greek', religion:'chalcedonian', populationShare0:10000 }] },
    { id:'ancyra', name:'Ancyra', names:[{ from:400, to:649, name:'Ancyra' }], realm:'byzantium', culture:'greek', religion:'chalcedonian', dev:4, duchy:'d_476_galatia', customaryRights:[
      { power:'peace', basis:'tenure', basisRef:'provincial_court_476:ancyra' },
      { power:'revenue', basis:'tenure', basisRef:'provincial_court_476:ancyra' }
    ], communities:[{ culture:'greek', religion:'chalcedonian', populationShare0:8500 }, { culture:'greek', religion:'miaphysite', populationShare0:1500 }] },
    { id:'amorion', name:'Amorium', names:[{ from:400, to:649, name:'Amorium' }], realm:'byzantium', culture:'greek', religion:'chalcedonian', dev:3, duchy:'d_476_phrygia', customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'greek', religion:'chalcedonian', populationShare0:10000 }] },
    { id:'smyrna', name:'Smyrna', names:[{ from:400, to:649, name:'Smyrna' }], realm:'byzantium', culture:'greek', religion:'chalcedonian', dev:4, duchy:'d_476_asia', customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'greek', religion:'chalcedonian', populationShare0:10000 }] },
    { id:'sardis', name:'Sardis', names:[{ from:400, to:649, name:'Sardis' }], realm:'byzantium', culture:'greek', religion:'chalcedonian', dev:3, duchy:'d_476_lydia', customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'greek', religion:'chalcedonian', populationShare0:10000 }] },
    { id:'ephesos', name:'Ephesus', names:[{ from:400, to:649, name:'Ephesus' }], realm:'byzantium', culture:'greek', religion:'chalcedonian', dev:3, duchy:'d_476_asia', customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'greek', religion:'chalcedonian', populationShare0:8500 }, { culture:'greek', religion:'miaphysite', populationShare0:1500 }] },
    { id:'attaleia', name:'Attalea', names:[{ from:400, to:649, name:'Attalea' }], realm:'byzantium', culture:'greek', religion:'chalcedonian', dev:3, duchy:'d_476_pamphylia', customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'greek', religion:'chalcedonian', populationShare0:10000 }] },
    { id:'ikonion', name:'Iconium', names:[{ from:400, to:649, name:'Iconium' }], realm:'byzantium', culture:'greek', religion:'chalcedonian', dev:3, duchy:'d_476_lycaonia', customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'greek', religion:'chalcedonian', populationShare0:7000 }, { culture:'isaurian', religion:'chalcedonian', populationShare0:2000 }, { culture:'greek', religion:'miaphysite', populationShare0:1000 }] },
    { id:'caesarea', name:'Caesarea', names:[{ from:400, to:649, name:'Caesarea' }], realm:'byzantium', culture:'greek', religion:'chalcedonian', dev:4, duchy:'d_476_cappadocia', customaryRights:[
      { power:'peace', basis:'tenure', basisRef:'provincial_court_476:caesarea' },
      { power:'revenue', basis:'tenure', basisRef:'provincial_court_476:caesarea' }
    ], communities:[{ culture:'greek', religion:'chalcedonian', populationShare0:8500 }, { culture:'greek', religion:'miaphysite', populationShare0:1500 }] },
    { id:'sebasteia', name:'Sebastea', names:[{ from:400, to:649, name:'Sebastea' }], realm:'byzantium', culture:'greek', religion:'chalcedonian', dev:3, duchy:'d_476_armenia_prima', customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'greek', religion:'chalcedonian', populationShare0:8500 }, { culture:'greek', religion:'miaphysite', populationShare0:1500 }] },
    { id:'sinope', name:'Sinope', names:[{ from:400, to:649, name:'Sinope' }], realm:'byzantium', culture:'greek', religion:'chalcedonian', dev:3, duchy:'d_476_paphlagonia', customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'greek', religion:'chalcedonian', populationShare0:10000 }] },
    { id:'pliska', name:'Abritus', names:[{ from:400, to:649, name:'Abritus' }], realm:'byzantium', culture:'roman', religion:'chalcedonian', dev:3, duchy:'d_476_moesia_secunda', customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'roman', religion:'chalcedonian', populationShare0:7000 }, { culture:'greek', religion:'chalcedonian', populationShare0:2000 }, { culture:'gothic', religion:'homoian', paired:true, populationShare0:1000 }] },
    { id:'silistra', name:'Durostorum', names:[{ from:400, to:649, name:'Durostorum' }], realm:'byzantium', culture:'roman', religion:'chalcedonian', dev:2, duchy:'d_476_moesia_secunda', customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'roman', religion:'chalcedonian', populationShare0:7000 }, { culture:'greek', religion:'chalcedonian', populationShare0:2000 }, { culture:'gothic', religion:'homoian', paired:true, populationShare0:1000 }] },
    { id:'vidin', name:'Bononia', names:[{ from:400, to:649, name:'Bononia' }], realm:'byzantium', culture:'roman', religion:'chalcedonian', dev:2, duchy:'d_476_dacia_ripensis', customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'roman', religion:'chalcedonian', populationShare0:7500 }, { culture:'greek', religion:'chalcedonian', populationShare0:1500 }, { culture:'gepid', religion:'homoian', paired:true, populationShare0:1000 }] },
    { id:'serdica', name:'Serdica', names:[{ from:400, to:649, name:'Serdica' }], realm:'byzantium', culture:'roman', religion:'chalcedonian', dev:3, duchy:'d_476_dacia_mediterranea', customaryRights:[
      { power:'peace', basis:'tenure', basisRef:'provincial_court_476:serdica' },
      { power:'revenue', basis:'tenure', basisRef:'provincial_court_476:serdica' }
    ], communities:[{ culture:'roman', religion:'chalcedonian', populationShare0:8000 }, { culture:'greek', religion:'chalcedonian', populationShare0:2000 }] },
    { id:'philippopolis', name:'Philippopolis', names:[{ from:400, to:649, name:'Philippopolis' }], realm:'byzantium', culture:'greek', religion:'chalcedonian', dev:3, duchy:'d_476_thracia', customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'greek', religion:'chalcedonian', populationShare0:8500 }, { culture:'gothic', religion:'homoian', paired:true, populationShare0:1500 }] },
    { id:'skopje', name:'Scupi', names:[{ from:400, to:649, name:'Scupi' }], realm:'byzantium', culture:'roman', religion:'chalcedonian', dev:2, duchy:'d_476_dardania', customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'roman', religion:'chalcedonian', populationShare0:8000 }, { culture:'greek', religion:'chalcedonian', populationShare0:2000 }] },
    { id:'ohrid', name:'Lychnidus', names:[{ from:400, to:649, name:'Lychnidus' }], realm:'byzantium', culture:'greek', religion:'chalcedonian', dev:2, duchy:'d_476_epirus_nova', customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'greek', religion:'chalcedonian', populationShare0:7000 }, { culture:'roman', religion:'chalcedonian', populationShare0:3000 }] },
    { id:'kotor', name:'Acruvium', names:[{ from:400, to:649, name:'Acruvium' }], realm:'croatia', culture:'roman', religion:'nicene', dev:2, duchy:'d_476_dalmatia', customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'roman', religion:'nicene', populationShare0:10000 }] },
    { id:'knin', name:'Burnum', names:[{ from:400, to:649, name:'Burnum' }], realm:'croatia', culture:'roman', religion:'nicene', dev:2, duchy:'d_476_dalmatia', customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'roman', religion:'nicene', populationShare0:10000 }] },
    { id:'split', name:'Salona', names:[{ from:400, to:649, name:'Salona' }], realm:'croatia', culture:'roman', religion:'nicene', dev:6, duchy:'d_476_dalmatia', customaryRights:[
      { power:'peace', basis:'tenure', basisRef:'provincial_court_476:split' },
      { power:'revenue', basis:'tenure', basisRef:'provincial_court_476:split' }
    ], communities:[{ culture:'roman', religion:'nicene', populationShare0:10000 }] },
    { id:'zadar', name:'Iader', names:[{ from:400, to:649, name:'Iader' }], realm:'croatia', culture:'roman', religion:'nicene', dev:3, duchy:'d_476_dalmatia', customaryRights:[
      { power:'peace', basis:'tenure', basisRef:'provincial_court_476:zadar' },
      { power:'revenue', basis:'tenure', basisRef:'provincial_court_476:zadar' }
    ], communities:[{ culture:'roman', religion:'nicene', populationShare0:10000 }] },
    { id:'zagreb', name:'Andautonia', names:[{ from:400, to:649, name:'Andautonia' }], realm:'croatia', culture:'roman', religion:'nicene', dev:1, duchy:'d_476_dalmatia', customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}], communities:[{ culture:'roman', religion:'nicene', populationShare0:10000 }] },
    { id:'sisak', name:'Siscia', names:[{ from:400, to:649, name:'Siscia' }], realm:'croatia', culture:'roman', religion:'nicene', dev:2, duchy:'d_476_dalmatia', customaryRights:[
      { power:'peace', basis:'tenure', basisRef:'provincial_court_476:sisak' },
      { power:'revenue', basis:'tenure', basisRef:'provincial_court_476:sisak' }
    ], communities:[{ culture:'roman', religion:'nicene', populationShare0:10000 }] }
  ],
  realms:[
    { id:'croatia', name:'Dalmatian Roman Court', color:'#7b699b', capital:'split',
      aggression:0, rank:3, religion:'nicene', techTraditions:['latin','byzantine'],
      government:'roman_civic',
      governingIdentity:{ eliteCultureId:'roman', eliteFaithId:'nicene', legalIdentityId:'late_roman',
        tolerance:'preference', taxation:'equal', justicePolicy:'personal' },
      ruler:{ name:'Julius Nepos', sex:'m', culture:'roman', born:430, mar:9, trait:'proud' } },
    { id:'byzantium', name:'Eastern Roman Court', color:'#a04fb0', capital:'constantinople',
      aggression:0, rank:4, religion:'chalcedonian', techTraditions:['byzantine'],
      government:'roman_civic',
      governingIdentity:{ eliteCultureId:'greek', eliteFaithId:'chalcedonian', legalIdentityId:'late_roman',
        tolerance:'preference', taxation:'equal', justicePolicy:'personal' },
      ruler:{ name:'Basiliscus', sex:'m', culture:'greek', born:430, mar:8, trait:'proud' } },
    { id:'pannonia', name:'Amal Gothic Host', color:'#809b73', capital:'thessaloniki', nonTerritorial:true, government:'federate_polity',
      aggression:1, rank:3, religion:'homoian',
      governingIdentity:{ eliteCultureId:'gothic', eliteFaithId:'homoian', legalIdentityId:'gothic_custom',
        tolerance:'preference', taxation:'equal', justicePolicy:'personal' },
      ruler:{ name:'Theoderic the Amal', sex:'m', culture:'gothic', born:454, mar:12, trait:'ambitious' } },
    { id:'gepids_476', name:'Gepid Kingdom', color:'#6c846c', capital:'sirmium', aggression:0, rank:2, religion:'homoian', techTraditions:['latin'],
      governingIdentity:{ eliteCultureId:'gepid', eliteFaithId:'homoian', legalIdentityId:'gothic_custom',
        tolerance:'preference', taxation:'equal', justicePolicy:'personal' },
      ruler:{ generated:true, sex:'m', culture:'gepid', born:440, mar:8, trait:'patient' } },
    { id:'thracian_goths_476', name:'Thracian Gothic Host', color:'#7b846f', capital:'adrianople', aggression:0, rank:3, religion:'homoian', techTraditions:['latin'], nonTerritorial:true, government:'federate_polity',
      governingIdentity:{ eliteCultureId:'gothic', eliteFaithId:'homoian', legalIdentityId:'gothic_custom',
        tolerance:'preference', taxation:'equal', justicePolicy:'personal' },
      ruler:{ name:'Theoderic Strabo', sex:'m', culture:'gothic', born:430, mar:8, trait:'patient' } }
  ],
  duchies:{
    'd_476_dalmatia':{ name:'Dalmatia', kingdom:'k_476_dalmatia' },
    'd_476_europa':{ name:'Europa', kingdom:'k_476_thrace' },
    'd_476_haemimontus':{ name:'Haemimontus', kingdom:'k_476_thrace' },
    'd_476_thracia':{ name:'Thracia', kingdom:'k_476_thrace' },
    'd_476_moesia_secunda':{ name:'Moesia Secunda', kingdom:'k_476_thrace' },
    'd_476_dacia_ripensis':{ name:'Dacia Ripensis', kingdom:'k_476_dacia' },
    'd_476_dacia_mediterranea':{ name:'Dacia Mediterranea', kingdom:'k_476_dacia' },
    'd_476_dardania':{ name:'Dardania', kingdom:'k_476_dacia' },
    'd_476_macedonia_prima':{ name:'Macedonia Prima', kingdom:'k_476_macedonia' },
    'd_476_thessalia':{ name:'Thessalia', kingdom:'k_476_macedonia' },
    'd_476_achaia':{ name:'Achaia', kingdom:'k_476_macedonia' },
    'd_476_epirus_vetus':{ name:'Epirus Vetus', kingdom:'k_476_macedonia' },
    'd_476_epirus_nova':{ name:'Epirus Nova', kingdom:'k_476_macedonia' },
    'd_476_bithynia':{ name:'Bithynia', kingdom:'k_476_pontica' },
    'd_476_galatia':{ name:'Galatia', kingdom:'k_476_pontica' },
    'd_476_cappadocia':{ name:'Cappadocia', kingdom:'k_476_pontica' },
    'd_476_armenia_prima':{ name:'Armenia Prima', kingdom:'k_476_pontica' },
    'd_476_paphlagonia':{ name:'Paphlagonia', kingdom:'k_476_pontica' },
    'd_476_phrygia':{ name:'Phrygia', kingdom:'k_476_asiana' },
    'd_476_lydia':{ name:'Lydia', kingdom:'k_476_asiana' },
    'd_476_asia':{ name:'Asia', kingdom:'k_476_asiana' },
    'd_476_pamphylia':{ name:'Pamphylia', kingdom:'k_476_asiana' },
    'd_476_lycaonia':{ name:'Lycaonia', kingdom:'k_476_oriens' }
  },
  kingdoms:{
    'k_476_dalmatia':{ name:'Dalmatian Administration', empire:'e_476_italy' },
    'k_476_thrace':{ name:'Thrace', empire:'e_476_east' },
    'k_476_dacia':{ name:'Dacia', empire:'e_476_illyricum' },
    'k_476_macedonia':{ name:'Macedonia', empire:'e_476_illyricum' },
    'k_476_asiana':{ name:'Asiana', empire:'e_476_east' },
    'k_476_pontica':{ name:'Pontica', empire:'e_476_east' },
    'k_476_oriens':{ name:'Oriens', empire:'e_476_east' }
  },
  empires:{
    'e_476_illyricum':{ name:'Illyricum' },
    'e_476_east':{ name:'the East' }
  },
  climate:{
    'szekesfehervar':'northern_temperate',
    'moson':'northern_temperate',
    'sirmium':'northern_temperate',
    'osijek':'northern_temperate',
    'constantinople':'mediterranean',
    'adrianople':'northern_temperate',
    'thessaloniki':'mediterranean',
    'serres':'northern_temperate',
    'larissa':'mediterranean',
    'athens':'mediterranean',
    'thebes':'mediterranean',
    'korinth':'mediterranean',
    'sparta':'mediterranean',
    'ioannina':'mediterranean',
    'dyrrachion':'mediterranean',
    'nicaea':'mediterranean',
    'dorylaion':'continental',
    'ancyra':'continental',
    'amorion':'continental',
    'smyrna':'mediterranean',
    'sardis':'mediterranean',
    'ephesos':'mediterranean',
    'attaleia':'mediterranean',
    'ikonion':'continental',
    'caesarea':'continental',
    'sebasteia':'continental',
    'sinope':'northern_temperate',
    'pliska':'northern_temperate',
    'silistra':'northern_temperate',
    'vidin':'northern_temperate',
    'serdica':'northern_temperate',
    'philippopolis':'mediterranean',
    'skopje':'northern_temperate',
    'ohrid':'northern_temperate',
    'kotor':'mediterranean',
    'knin':'northern_temperate',
    'split':'mediterranean',
    'zadar':'mediterranean',
    'zagreb':'northern_temperate',
    'sisak':'northern_temperate'
  }
};

/* The geography uses the shared physical-site table. Regional declarations
   extend it before any bookmark is activated, without borrowing a later layout. */
FBDATA.techImpactReviews.features.federate_host_commissions = { mode:'none', rationale:'A patron can commission the exact host named by effective bilateral service. Living consent and continued service supply the jurisdiction; army technology remains unchanged.' };
FBDATA.techImpactReviews.features.campaign_territorial_settlement = { mode:'none', rationale:'A landless court can adopt a declared territorial government only after ordinary war secures its objective. Actual possession, rather than research, constrains this political settlement.' };
Object.assign(FBDATA.cultures, FBDATA.bookmarkRegions476.dalmatia_east.cultures);
Object.assign(FBDATA.settlementSites, FBDATA.bookmarkRegions476.dalmatia_east.sites);
Object.assign(FBDATA.settlementLayouts['476'], FBDATA.bookmarkRegions476.dalmatia_east.layouts);

/* Dispatches can reach households outside the sending court. Local work
   follows the event county's live community, never a modern geographic label.
   These choices use existing household effects; they appoint no official,
   settle no host and create no off-map county or sovereign. */
FBDATA.eventPacks = FBDATA.eventPacks || {};
FBDATA.eventPacks.dalmatia_east_476 = { eras:['late_antique'], yearMin:476, yearMax:649 };
FBDATA.events = FBDATA.events || [];
FBDATA.events.push(
  { id:'dalmatian_petition_476', pack:'dalmatia_east_476', tags:['late_antique'],
    title:'A Petition from Salona',
    trigger:{ minAge:16, provinceCultures:['roman'], provinceReligionGroup:'nicene', chance:0.12 },
    weight:3, cooldown:12,
    text:'A courier brings a copy of a petition issued by the Dalmatian court at Salona. Its argument distinguishes possession of Ravenna from recognition of the imperial office. Your household is asked to help preserve and carry the letters.',
    options:[
      { label:'Pay for another copy and a reliable courier.', desc:'A carefully carried letter may outlast a shouted allegiance.',
        require:{ goldMin:5 }, effects:{ gold:-5, prestige:4, skills:{dip:1}, log:'Helped carry a Dalmatian petition between Roman cities.' } },
      { label:'Compare the letters with the public records.', desc:'Learn what an imperial claim actually rests on.',
        effects:{ skills:{lea:1}, log:'Studied the Dalmatian court’s imperial petition.' } },
      { label:'Keep the household outside the dispute.', desc:'The court can find another messenger.', effects:{} }
    ] },
  { id:'salona_episcopal_letters_476', pack:'dalmatia_east_476', tags:['late_antique'],
    title:'Letters from the Dalmatian Church',
    trigger:{ minAge:16, religionGroup:'nicene', provinceCultures:['roman'], chance:0.10 },
    weight:3, cooldown:12,
    text:'Letters from the see of Salona ask for aid to households crowded around the Adriatic ports. An older copy recalls Glycerius, removed from the imperial office and consecrated bishop there. The present appeal asks for bread and bedding, not a declaration for an emperor.',
    options:[
      { label:'Send bread and bedding.', desc:'Help the families behind the court’s great names.',
        require:{ goldMin:4 }, effects:{ gold:-4, piety:5, log:'Sent household relief to the Dalmatian church.' } },
      { label:'Copy the appeal for the neighboring households.', desc:'Letters can gather help beyond one purse.',
        effects:{ skills:{lea:1}, piety:2 } },
      { label:'Keep what the family needs.', desc:'Charity must wait for a better season.', effects:{} }
    ] },
  { id:'eastern_commission_forms_476', pack:'dalmatia_east_476', tags:['late_antique'],
    title:'The Seal and the Scope',
    trigger:{ minAge:16, provinceCultures:['greek'], careerRoles:['civic','learned'], chance:0.12 },
    weight:4, cooldown:12,
    text:'Two copies of a court commission disagree. One names the officer’s jurisdiction; the other promises more than the seal can grant. The local clerks ask you to compare them before a messenger sets out. A military command, a civil court and the right to collect public receipts need different warrants.',
    options:[
      { label:'Compare every jurisdiction and witness.', desc:'Make the limits as clear as the grant.', chance:'skill_lea',
        success:{ text:'The clerks find the missing clause. Your corrected copy distinguishes the civil mandate from the army commission.',
          effects:{ prestige:5, skills:{lea:1}, log:'Corrected an eastern commission’s jurisdiction.' } },
        failure:{ text:'The disputed clauses need an experienced assessor. You return the papers before anyone acts on them.', effects:{ prestige:-2 } } },
      { label:'Ask an experienced copyist to check it.', desc:'Pay for a careful second pair of eyes.',
        require:{ goldMin:4 }, effects:{ gold:-4, skills:{ste:1} } },
      { label:'Leave the warrants with the issuing office.', desc:'You will not turn a copied letter into a claim of your own.', effects:{} }
    ] },
  { id:'balkan_federate_receipts_476', pack:'dalmatia_east_476', tags:['late_antique'],
    title:'Soldiers and the Provision List',
    trigger:{ minAge:16, countyCommunityShare:{ kind:'faith', target:'homoian', min:0.10 }, chance:0.10 },
    weight:3, cooldown:12,
    text:'A provision merchant arrives with copies of Balkan service receipts. Gothic hosts have their own leaders, but grain and pay still need a named counterpart and an agreed term. Local suppliers want clear accounts before they extend any further credit.',
    options:[
      { label:'Help reconcile deliveries with the receipts.', desc:'A useful account serves soldiers and townspeople alike.', chance:'skill_ste',
        success:{ text:'Missing deliveries and duplicate claims are separated. The suppliers accept your account of the work.',
          effects:{ prestige:4, skills:{ste:1}, log:'Reconciled federate provision receipts.' } },
        failure:{ text:'The copies cannot establish who received the last cargo. You leave the disputed entries unpaid.', effects:{ prestige:-2 } } },
      { label:'Buy provisions for families waiting on their pay.', desc:'Relieve a few households without assuming the host’s contract.',
        require:{ goldMin:5 }, effects:{ gold:-5, popularOpinion:3 } },
      { label:'Leave service debts to the counterparties.', desc:'Your household will take on no commitment.', effects:{} }
    ] },
  { id:'danube_road_accounts_476', pack:'dalmatia_east_476', tags:['late_antique'],
    title:'Accounts from the Danube Road',
    trigger:{ minAge:16, provinceCultures:['roman'], countyCommunityMixed:{ kind:'culture', minCommunities:2, minorityShareMin:0.10 }, chance:0.10 },
    weight:3, cooldown:12,
    text:'Travelers from the Danube bring freight accounts kept in several hands. The copies record dues claimed by Roman communities, Gepid rulers and neighboring war bands. A local carrier asks you to distinguish an agreed payment from a demand made at spearpoint.',
    options:[
      { label:'Check the receipts against the carrier’s witnesses.', desc:'Custom is clearer when someone can say who agreed to it.',
        effects:{ skills:{ste:1}, prestige:2, log:'Compared freight dues on the Danube road.' } },
      { label:'Help the carrier replace a lost cargo.', desc:'Share the cost of a journey that went badly.',
        require:{ goldMin:6 }, effects:{ gold:-6, popularOpinion:4 } },
      { label:'Do not underwrite the journey.', desc:'The road’s claims are beyond your household’s means.', effects:{} }
    ] },
  { id:'constantinople_encyclical_memory_476', pack:'dalmatia_east_476', tags:['late_antique'],
    yearMax:477, once:true, title:'The Encyclical and the City',
    trigger:{ minAge:16, provinceCultures:['greek'], provinceReligionGroup:'chalcedonian', chance:0.12 },
    weight:4,
    text:'A copy of Basiliscus’s encyclical reaches the household with accounts of the opposition it raised in Constantinople. Clergy dispute its rejection of Chalcedon; neighbors ask whether a court’s religious declaration can decide what their own congregation believes. The argument survives changes at court.',
    options:[
      { label:'Read both the declaration and its objections.', desc:'Hear the disagreement before lending your voice.',
        effects:{ skills:{lea:1}, piety:2, log:'Read the eastern encyclical dispute.' } },
      { label:'Help keep the congregation’s meeting peaceful.', desc:'Disagreement need not become violence among neighbors.',
        effects:{ popularOpinion:3, prestige:2 } },
      { label:'Attend to the household’s own worship.', desc:'The great sees can pursue their arguments without you.', effects:{} }
    ] },
  { id:'isaurian_household_letters_476', pack:'dalmatia_east_476', tags:['late_antique'],
    yearMax:477, once:true, title:'Letters from Isauria',
    trigger:{ minAge:16, provinceCultures:['greek'], chance:0.10 }, weight:3,
    text:'Letters from Isauria describe the households scattered when Zeno withdrew from the capital. The writers need clothing, food and news of missing relatives. Their needs are immediate, whatever course the imperial dispute takes.',
    options:[
      { label:'Contribute supplies for the displaced families.', desc:'Relief need not wait for an imperial verdict.',
        require:{ goldMin:5 }, effects:{ gold:-5, piety:4, log:'Aided households displaced in Isauria.' } },
      { label:'Copy the names and inquiries.', desc:'Give scattered families another way to find one another.',
        effects:{ skills:{dip:1}, piety:1 } },
      { label:'Leave the letters with another household.', desc:'You have no spare provisions this season.', effects:{} }
    ] },
  { id:'provincial_registers_476', pack:'dalmatia_east_476', tags:['late_antique'],
    title:'The Provincial Register',
    trigger:{ minAge:16, countyIds:['thessaloniki','serdica','philippopolis','silistra','skopje','nicaea','ancyra','sardis','attaleia','caesarea'], careerRoles:['civic','learned'], chance:0.12 },
    weight:4, cooldown:12,
    text:'The provincial office and the city council keep separate copies of the public receipts. A clerk asks your household to compare a disputed entry. The governor’s civil warrant covers courts and receipts; it does not command the soldiers or settle a family’s private estate.',
    options:[
      { label:'Compare the entry with both registers.', desc:'Separate public dues from a private demand.', effects:{ skills:{ste:1}, prestige:3, log:'Compared a provincial register with the city’s copy.' } },
      { label:'Pay a copyist to preserve the witnesses’ account.', desc:'Keep the evidence available for a later hearing.', require:{goldMin:4}, effects:{gold:-4,skills:{lea:1},popularOpinion:2} },
      { label:'Leave the account with the issuing office.', desc:'The household will not guarantee a disputed entry.', effects:{} }
    ] },
  { id:'sirmium_mixed_court_476', pack:'dalmatia_east_476', tags:['late_antique'],
    title:'Two Customs at Sirmium',
    trigger:{ minAge:16, countyIds:['sirmium','osijek','szekesfehervar','moson'], countyCommunityShare:{kind:'culture',target:'gepid',min:0.10}, chance:0.10 },
    weight:3, cooldown:12,
    text:'A carrier and a Gepid household dispute a payment on the Danube road. Roman witnesses bring written receipts; the other party brings witnesses to an oral agreement. The local assessor needs both accounts before deciding whose customary obligation applies.',
    options:[
      { label:'Record both sets of witnesses.', desc:'Let each household’s evidence be heard.', effects:{skills:{dip:1},prestige:3,log:'Recorded Roman and Gepid witnesses to a freight agreement.'} },
      { label:'Help replace the disputed cargo.', desc:'Ease the families’ loss while their case is heard.', require:{goldMin:6}, effects:{gold:-6,popularOpinion:4} },
      { label:'Keep the household outside the case.', desc:'The assessor must settle the disagreement.', effects:{} }
    ] },
  { id:'novae_provision_accounts_476', pack:'dalmatia_east_476', tags:['late_antique'],
    title:'Supplies for the Lower Danube',
    trigger:{ minAge:16, countyIds:['pliska','silistra','vidin'], countyCommunityShare:{kind:'faith',target:'homoian',min:0.05}, chance:0.10 },
    weight:3, cooldown:12,
    text:'A supplier brings accounts from the communities around Novae. Grain issued for a host’s service is being confused with a grant of land to its families. The carrier asks you to keep deliveries, wages and proposed settlement terms on separate sheets.',
    options:[
      { label:'Separate service receipts from settlement proposals.', desc:'A paid delivery is evidence of service, not ownership.', effects:{skills:{ste:1},prestige:3,log:'Separated Danube service receipts from proposed settlement terms.'} },
      { label:'Buy grain for waiting households.', desc:'Relieve the delay without promising public land.', require:{goldMin:5}, effects:{gold:-5,popularOpinion:3} },
      { label:'Take on no part of the account.', desc:'The counterparties must agree on their obligations.', effects:{} }
    ] },
  { id:'gothic_office_petitions_476', pack:'dalmatia_east_476', tags:['late_antique'],
    yearMin:477, yearMax:483, title:'The Office and the Host',
    trigger:{ minAge:16, countyIds:['thessaloniki','serres','adrianople','philippopolis','constantinople'], chance:0.12 },
    weight:4, cooldown:8,
    text:'Copies of rival Gothic petitions arrive from the eastern court. One asks for an imperial field command, another for pay, and another for homes for the host’s families. The clerks warn that an honor, an army commission and a settlement agreement are different commitments.',
    options:[
      { label:'Copy each request under its own heading.', desc:'Make the obligations clear to both hosts and the court.', effects:{skills:{lea:1},prestige:3,log:'Distinguished Gothic office, pay and settlement petitions.'} },
      { label:'Help families waiting for an agreement.', desc:'Meet an immediate need without choosing a commander.', require:{goldMin:5}, effects:{gold:-5,popularOpinion:4} },
      { label:'Leave the petitions with the court.', desc:'The household cannot answer an imperial negotiation.', effects:{} }
    ] },
  { id:'gothic_meeting_accounts_476', pack:'dalmatia_east_476', tags:['late_antique'],
    yearMin:478, yearMax:479, once:true, title:'Accounts of the Two Hosts',
    trigger:{ minAge:16, countyIds:['thessaloniki','serres','adrianople','philippopolis','serdica'], chance:0.12 }, weight:4,
    text:'Travelers compare accounts of meetings between the Amal and Thracian Gothic hosts. Each tells a different story about promised reinforcements and supplies. A neighbor asks you to preserve what the witnesses actually saw, without treating a rumor as a treaty.',
    options:[
      { label:'Write down each witness’s account separately.', desc:'Keep a claim of alliance distinct from an agreed obligation.', effects:{skills:{lea:1},prestige:3,log:'Preserved separate accounts of the rival Gothic hosts.'} },
      { label:'Find provisions for travelers delayed by the dispute.', desc:'Help people caught between rival promises.', require:{goldMin:4}, effects:{gold:-4,piety:3} },
      { label:'Repeat no unverified account.', desc:'Let the court obtain its own witnesses.', effects:{} }
    ] },
  { id:'isaurian_retainer_accounts_476', pack:'dalmatia_east_476', tags:['late_antique'],
    title:'The Isaurian Household’s Account',
    trigger:{ minAge:16, countyIds:['ikonion','attaleia','caesarea'], countyCommunityShare:{kind:'culture',target:'isaurian',min:0.10}, chance:0.12 },
    weight:4, cooldown:12,
    text:'An Isaurian household asks for help comparing the cost of retainers, supplies and repairs to its estate. Court favor may bring an office, but a private family holding does not by itself grant public receipts or command over a provincial host.',
    options:[
      { label:'Put the private and public accounts on separate sheets.', desc:'Show what the household can meet from its own resources.', effects:{skills:{ste:1},prestige:3,log:'Reconciled an Isaurian household’s private accounts.'} },
      { label:'Contribute to repairs and provisions.', desc:'Help its dependents through the season.', require:{goldMin:5}, effects:{gold:-5,popularOpinion:3} },
      { label:'Decline to guarantee the household’s debts.', desc:'A court connection is no substitute for an agreed payment.', effects:{} }
    ] },
  { id:'isaurian_command_letters_476', pack:'dalmatia_east_476', tags:['late_antique'],
    yearMin:483, yearMax:488, title:'A Command from the East',
    trigger:{ minAge:16, countyIds:['ikonion','caesarea','ancyra','attaleia'], chance:0.10 }, weight:3, cooldown:12,
    text:'Letters recalling the careers of Illus and Trocundes circulate among Isaurian households. Their service in the imperial dispute has become an argument about distant field commands, court trust and family obligations. A carrier asks which parts of the letters can be checked against a surviving warrant.',
    options:[
      { label:'Check the warrants before carrying the letters.', desc:'Distinguish a living commission from a remembered service.', effects:{skills:{lea:1,dip:1},log:'Compared Isaurian command letters with their warrants.'} },
      { label:'Help families waiting for news from the east.', desc:'Keep correspondence moving without promising military aid.', require:{goldMin:4}, effects:{gold:-4,piety:3} },
      { label:'Take no message beyond its stated destination.', desc:'The household will make no political promise.', effects:{} }
    ] },
  { id:'provincial_reconciliation_formula_476', pack:'dalmatia_east_476', tags:['late_antique'],
    yearMin:482, yearMax:488, title:'A Formula for Reconciliation',
    trigger:{ minAge:16, countyIds:['nicaea','ancyra','ephesos','caesarea','sebasteia','ikonion'], countyCommunityShare:{kind:'faith',target:'miaphysite',min:0.05}, chance:0.12 }, weight:4, cooldown:12,
    text:'A proposed formula invokes the older councils while leaving the disputed language of Chalcedon aside. Chalcedonian and miaphysite neighbors disagree over whether this brings reconciliation or merely conceals their differences. The congregation needs help keeping its common relief work peaceful.',
    options:[
      { label:'Hear both congregations before copying the formula.', desc:'Learn the disagreement without professing for either household.', effects:{skills:{lea:1},piety:2,log:'Compared a provincial reconciliation formula with both congregations’ objections.'} },
      { label:'Supply the relief work shared by both congregations.', desc:'Give help without requiring agreement on the formula.', require:{goldMin:5}, effects:{gold:-5,popularOpinion:4,piety:2} },
      { label:'Keep the family’s own worship.', desc:'The formula changes no one’s profession on your behalf.', effects:{} }
    ] },
  { id:'persian_frontier_dispatch_476', pack:'dalmatia_east_476', tags:['late_antique'],
    title:'A Dispatch from Beyond the Eastern Frontier',
    trigger:{ minAge:16, provinceCultures:['greek'], chance:0.08 }, weight:2, cooldown:16,
    text:'An eastern dispatch reports Persian requests for money toward the defense of the Caucasian passes. Merchants fear new levies and delays on the long road. The contested frontier lies beyond the lands your household can reach, but its demands arrive in prices and letters.',
    options:[
      { label:'Pay a courier for reliable accounts of the road.', desc:'Good information may spare a household a costly mistake.',
        require:{ goldMin:4 }, effects:{ gold:-4, skills:{ste:1}, log:'Obtained news of the off-map Persian frontier.' } },
      { label:'Compare the report with the merchants’ letters.', desc:'Learn how distant demands reach local markets.',
        effects:{ skills:{lea:1} } },
      { label:'Keep the purse closed.', desc:'The imperial court must answer the frontier demand.', effects:{} }
    ] }
);
