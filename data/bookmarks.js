/* =========================================================================
   Fallowborn — AUTHORED START BOOKMARKS
   =========================================================================
   The top-level FBDATA world remains the public 867 mod API. Each bookmark is
   an atomic world definition; activation swaps one definition into those
   legacy top-level fields before the raster or political state is created.

   Coastline, inland seas, rivers, and projection bounds are shared. The 1066
   definition owns separate province, hierarchy, realm, strait, and scripted
   objects so activating or replacing it never mutates the 867 source.
   ========================================================================= */
window.FBDATA = window.FBDATA || {};

(function () {
  'use strict';

  function copyMap(source) {
    var out = {};
    for (var id in source) {
      if (!Object.prototype.hasOwnProperty.call(source, id)) continue;
      var item = source[id], copy = {};
      for (var key in item) {
        if (Object.prototype.hasOwnProperty.call(item, key)) copy[key] = item[key];
      }
      out[id] = copy;
    }
    return out;
  }

  function copyPairs(source) {
    return (source || []).map(function (pair) { return [pair[0], pair[1]]; });
  }

  function profile(name, culture, born, mar, trait, sex) {
    return {
      name:name, sex:sex || 'm', culture:culture, born:born, mar:mar, trait:trait
    };
  }

  /* Authored sovereign profiles are intentionally lightweight. Names are
     historical proper names and never enter the localization catalog. Where
     the record does not preserve a ruler for a tribal polity, the research
     note records the conventional or representative identification used. */
  var RULERS_867 = {
    west_francia:profile('Charles the Bald','frankish',823,8,'ambitious'),
    aquitaine:profile('Louis the Stammerer','frankish',846,5,'patient'),
    brittany:profile('Salomon','brezhon',810,9,'ambitious'),
    lotharingia:profile('Lothair II','german',835,7,'deceitful'),
    east_francia:profile('Louis the German','german',806,10,'patient'),
    italy:profile('Louis II','italian',825,11,'proud'),
    burgundy:profile('Boso','frankish',841,8,'ambitious'),
    papacy:profile('Nicholas I','italian',800,4,'zealous'),
    benevento:profile('Adelchis','italian',820,10,'patient'),
    venice:profile('Orso I Participazio','italian',820,7,'greedy'),
    sardinia:profile('Torchitorio of Cagliari','italian',822,6,'content'),
    asturias:profile('Alfonso III','iberian',848,10,'ambitious'),
    navarra:profile('García Íñiguez','iberian',810,8,'patient'),
    cordoba:profile('Muhammad I','andalusi',823,9,'patient'),
    wessex:profile('Æthelred I','english',847,11,'brave'),
    mercia:profile('Burgred','english',810,7,'patient'),
    east_anglia:profile('Edmund','english',841,8,'zealous'),
    northumbria:profile('Osberht','english',830,9,'proud'),
    york:profile('Halfdan Ragnarsson','norse',820,13,'ambitious'),
    gwynedd:profile('Rhodri ap Merfyn','brezhon',820,12,'brave'),
    alba:profile('Constantine mac Cináeda','gaelic',836,10,'patient'),
    strathclyde:profile('Artgal ap Dyfnwal','brezhon',825,7,'content'),
    isles:profile('Ketill Flatnose','norse',810,11,'ambitious'),
    ulaid:profile('Lethlobar mac Loingsig','gaelic',820,8,'patient'),
    connacht:profile('Conchobar mac Taidg','gaelic',825,8,'proud'),
    leinster:profile('Dúnlaing mac Muiredaig','gaelic',825,7,'content'),
    munster:profile('Cenn Fáelad hua Mugthigirn','gaelic',820,8,'patient'),
    dublin:profile('Amlaíb Conung','norse',820,12,'ambitious'),
    denmark:profile('Horik II','norse',820,10,'proud'),
    sweden:profile('Erik Anundsson','norse',820,9,'ambitious'),
    geats:profile('Ring of Götaland','norse',825,8,'proud'),
    vestfold:profile('Harald Fairhair','norse',850,13,'ambitious'),
    trondelag:profile('Håkon Grjotgardsson','norse',838,11,'ambitious'),
    moravia:profile('Rastislav','slavic',820,11,'patient'),
    bohemia:profile('Bořivoj','slavic',852,8,'zealous'),
    polans:profile('Siemowit','slavic',835,9,'ambitious'),
    vistulans:profile('Wysław','slavic',830,8,'proud'),
    pomerania:profile('Siemomysł of Pomerania','slavic',830,8,'content'),
    wends:profile('Dobromir','slavic',825,9,'patient'),
    pannonia:profile('Carloman of Bavaria','german',830,10,'ambitious'),
    prussia:profile('Widewuto of Sambia','baltic',820,9,'zealous'),
    lithuania:profile('Kukovaitis','baltic',825,9,'ambitious'),
    livonia:profile('Daugirutis','baltic',825,8,'content'),
    finland:profile('Kauko of Suomi','baltic',825,8,'patient'),
    karelia:profile('Väinö of Karelia','baltic',825,8,'content'),
    rus_novgorod:profile('Rurik','norse',830,12,'ambitious'),
    rus_kiev:profile('Askold','norse',820,11,'ambitious'),
    polotsk:profile('Rogvolod','slavic',830,9,'proud'),
    turov:profile('Tur of Turov','slavic',830,7,'content'),
    chernigov:profile('Oleg of Chernigov','slavic',830,10,'ambitious'),
    volhynia:profile('Volodar of Volhynia','slavic',830,8,'patient'),
    magyars:profile('Álmos','magyar',820,13,'ambitious'),
    bulgaria:profile('Boris I','slavic',826,11,'zealous'),
    serbia:profile('Mutimir','slavic',830,9,'patient'),
    croatia:profile('Domagoj','slavic',810,11,'wrathful'),
    georgia:profile('Bagrat I','georgian',822,9,'patient'),
    alania:profile('Saros of Alania','turkic',825,9,'proud'),
    byzantium:profile('Basil I','greek',811,14,'ambitious'),
    khazaria:profile('Benjamin','turkic',820,10,'patient'),
    volga_bulgaria:profile('Aydar','turkic',820,9,'ambitious'),
    abbasid:profile('al-Mu’tazz','arabic',847,7,'proud'),
    tahirids:profile('Muhammad ibn Tahir','persian',824,7,'content'),
    aghlabids:profile('Muhammad II ibn Ahmad','arabic',840,8,'greedy'),
    armenia:profile('Ashot Bagratuni','armenian',820,10,'patient'),
    saffarids:profile('Ya’qub ibn al-Layth','persian',840,14,'ambitious'),
    kabul_shahi:profile('Lagaturman','persian',820,9,'patient'),
    habbarids:profile('Umar ibn Abd al-Aziz','arabic',820,8,'content'),
    makran:profile('Isa ibn Ma’dan','persian',820,8,'patient'),
    tabaristan:profile('Hasan ibn Zayd','persian',830,10,'ambitious'),
    yemen:profile('Ibrahim ibn Muhammad','arabic',825,8,'content'),
    oman:profile('al-Salt ibn Malik','arabic',820,8,'patient'),
    idrisids:profile('Yahya ibn Muhammad','berber',830,8,'generous'),
    rustamids:profile('Aflah ibn Abd al-Wahhab','berber',820,8,'patient'),
    barghawata:profile('Yunus ibn Ilyas','berber',820,8,'zealous'),
    sijilmasa:profile('Maymun ibn Midrar','berber',825,7,'greedy'),
    makuria:profile('Georgios I','nubian',820,8,'zealous'),
    abyssinia:profile('Degna Djan','nubian',820,9,'zealous'),
    crete:profile('Shu’ayb I','arabic',820,10,'ambitious')
  };

  for (var realm867Index = 0; realm867Index < FBDATA.realms.length; realm867Index++) {
    var realm867 = FBDATA.realms[realm867Index];
    realm867.ruler = RULERS_867[realm867.id];
  }

  function ruler1066(name, culture, born, mar, trait, sex) {
    return profile(name, culture, born, mar, trait, sex);
  }

  function realm(id, name, color, capital, aggression, rank, ruler, liege) {
    var out = {
      id:id, name:name, color:color, capital:capital,
      aggression:aggression, rank:rank, ruler:ruler
    };
    if (liege) out.liege = liege;
    return out;
  }

  var REALMS_1066 = [
    /* Francia and the Empire */
    realm('france','Kingdom of France','#4f7fd0','paris',1,3,
      ruler1066('Philip I','frankish',1052,5,'patient')),
    realm('normandy','Duchy of Normandy','#6f91c8','rouen',2,2,
      ruler1066('William the Bastard','frankish',1028,14,'ambitious'),'france'),
    realm('aquitaine_1066','Duchy of Aquitaine','#4f9fd0','bordeaux',1,2,
      ruler1066('William VIII','frankish',1025,10,'proud'),'france'),
    realm('brittany_1066','Duchy of Brittany','#a8a8b8','rennes',0,2,
      ruler1066('Conan II','brezhon',1033,10,'proud')),
    realm('hre','Holy Roman Empire','#6f7d8c','frankfurt',1,4,
      ruler1066('Henry IV','german',1050,8,'proud')),
    realm('lorraine_1066','Duchy of Lower Lorraine','#8994a4','metz',1,2,
      ruler1066('Godfrey the Bearded','german',997,11,'wrathful'),'hre'),
    realm('saxony_1066','Duchy of Saxony','#84909c','magdeburg',1,2,
      ruler1066('Ordulf','german',1022,9,'patient'),'hre'),
    realm('bavaria_1066','Duchy of Bavaria','#788996','munich',1,2,
      ruler1066('Otto of Nordheim','german',1020,12,'ambitious'),'hre'),
    realm('bohemia_1066','Duchy of Bohemia','#af5f2f','praha',1,2,
      ruler1066('Vratislav II','slavic',1032,11,'ambitious'),'hre'),
    realm('tuscany_1066','March of Tuscany','#8daa62','firenze',0,2,
      ruler1066('Beatrice of Lorraine','italian',1017,7,'patient','f'),'hre'),
    realm('papacy_1066','The Papacy','#e8e0b0','roma',0,3,
      ruler1066('Alexander II','italian',1010,4,'zealous')),
    realm('venice_1066','Republic of Venice','#2f8f8f','venezia',0,2,
      ruler1066('Domenico Contarini','italian',985,6,'patient')),
    realm('benevento_1066','Principality of Benevento','#c98f4a','benevento',0,2,
      ruler1066('Landulf VI','italian',1030,8,'patient')),
    realm('apulia_1066','Duchy of Apulia','#b87945','foggia',2,2,
      ruler1066('Robert Guiscard','italian',1015,14,'ambitious')),
    realm('sicily_1066','Emirates of Sicily','#5f9f72','palermo',1,2,
      ruler1066('Ibn al-Hawas','arabic',1020,10,'proud')),
    realm('sardinia_1066','Judgedoms of Sardinia','#8fae7f','cagliari',0,2,
      ruler1066('Torchitorio I','italian',1010,8,'patient')),

    /* Iberia */
    realm('leon_1066','Kingdom of León','#d9dfea','leon',1,3,
      ruler1066('Alfonso VI','iberian',1040,11,'ambitious')),
    realm('castile_1066','Kingdom of Castile','#c58d45','burgos',2,3,
      ruler1066('Sancho II','iberian',1038,13,'ambitious')),
    realm('galicia_1066','Kingdom of Galicia','#9fbad5','santiago',1,3,
      ruler1066('García II','iberian',1042,8,'proud')),
    realm('navarre_1066','Kingdom of Pamplona','#c04070','pamplona',1,3,
      ruler1066('Sancho IV','iberian',1039,9,'patient')),
    realm('aragon_1066','Kingdom of Aragon','#be7650','aragon',1,3,
      ruler1066('Sancho Ramírez','iberian',1042,10,'ambitious')),
    realm('barcelona_1066','County of Barcelona','#ba8e4d','barcelona',1,2,
      ruler1066('Ramon Berenguer I','iberian',1023,10,'patient')),
    realm('zaragoza_1066','Taifa of Zaragoza','#4d9b63','zaragoza',1,2,
      ruler1066('al-Muqtadir','andalusi',1015,9,'ambitious')),
    realm('toledo_1066','Taifa of Toledo','#408e5b','toledo',1,2,
      ruler1066('al-Mamun','andalusi',1020,9,'deceitful')),
    realm('badajoz_1066','Taifa of Badajoz','#579e69','badajoz',1,2,
      ruler1066('al-Muzaffar','andalusi',1004,8,'patient')),
    realm('sevilla_1066','Taifa of Sevilla','#3f9f5f','sevilla',2,2,
      ruler1066('al-Mu’tadid','andalusi',1012,11,'ambitious')),
    realm('granada_1066','Taifa of Granada','#518c55','granada',1,2,
      ruler1066('Badis ibn Habus','berber',995,9,'proud')),
    realm('valencia_1066','Taifa of Valencia','#4a9668','valencia',1,2,
      ruler1066('Abd al-Malik al-Muzaffar','andalusi',1030,8,'content')),

    /* Britain, Ireland, and Scandinavia */
    realm('england_1066','Kingdom of England','#d0a03f','london',2,3,
      ruler1066('Harold Godwinson','english',1022,13,'brave')),
    realm('gwynedd_1066','Gwynedd and Powys','#cf6f4f','gwynedd',1,2,
      ruler1066('Bleddyn ap Cynfyn','brezhon',1025,11,'patient')),
    realm('deheubarth_1066','Deheubarth','#b6654e','carmarthen',1,2,
      ruler1066('Maredudd ab Owain','brezhon',1030,9,'ambitious')),
    realm('glamorgan_1066','Morgannwg','#a85d4f','cardiff',1,2,
      ruler1066('Caradog ap Gruffydd','brezhon',1030,10,'ambitious')),
    realm('scotland_1066','Kingdom of Scotland','#5f5fc0','scone',1,3,
      ruler1066('Malcolm III','gaelic',1031,12,'ambitious')),
    realm('isles_1066','Kingdom of the Isles','#4f7f9f','man',1,2,
      ruler1066('Godred Sitricsson','norse',1020,10,'proud')),
    realm('ulaid_1066','Ulaid','#d08f4f','ulaid',0,2,
      ruler1066('Donn Sléibe mac Echdacha','gaelic',1020,8,'patient')),
    realm('connacht_1066','Connacht','#9fbf4f','galway',0,2,
      ruler1066('Áed in Gai Bernaig','gaelic',1020,9,'proud')),
    realm('leinster_1066','Leinster','#5f9f6f','kilkenny',1,2,
      ruler1066('Diarmait mac Máel na mBó','gaelic',1000,11,'ambitious')),
    realm('munster_1066','Munster','#3f7f5f','cashel',1,2,
      ruler1066('Toirdelbach Ua Briain','gaelic',1009,11,'ambitious')),
    realm('dublin_1066','Dublin','#4fb0d0','dublin',1,2,
      ruler1066('Murchad mac Diarmata','gaelic',1025,10,'proud')),
    realm('denmark_1066','Kingdom of Denmark','#c03f5f','roskilde',1,3,
      ruler1066('Sweyn II','norse',1019,11,'ambitious')),
    realm('norway_1066','Kingdom of Norway','#668fc4','trondheim',2,3,
      ruler1066('Harald Hardrada','norse',1015,15,'ambitious')),
    realm('sweden_1066','Kingdom of Sweden','#e8d84f','uppsala',1,3,
      ruler1066('Stenkil','norse',1030,9,'patient')),

    /* Central and eastern Europe */
    realm('wends_1066','Obotrite Confederation','#7f4f6f','mecklenburg',1,2,
      ruler1066('Gottschalk','slavic',1000,11,'zealous')),
    realm('pomerania_1066','Pomerania','#b85f7f','gdansk',1,2,
      ruler1066('Siemomysł','slavic',1000,9,'patient')),
    realm('poland_1066','Kingdom of Poland','#d87f9f','krakow',1,3,
      ruler1066('Bolesław II','slavic',1042,12,'ambitious')),
    realm('hungary_1066','Kingdom of Hungary','#d05f3f','szekesfehervar',1,3,
      ruler1066('Solomon','magyar',1053,8,'proud')),
    realm('croatia_1066','Kingdom of Croatia','#4f9fbf','split',1,3,
      ruler1066('Petar Krešimir IV','slavic',1015,10,'ambitious')),
    realm('serbia_1066','Duklja and Serbia','#7f6fbf','kotor',1,2,
      ruler1066('Mihailo Vojislavljević','slavic',1020,10,'ambitious')),
    realm('byzantium_1066','Byzantine Empire','#a04fb0','constantinople',1,4,
      ruler1066('Constantine X Doukas','greek',1006,7,'patient')),
    realm('georgia_1066','Kingdom of Georgia','#cf4f8f','kutaisi',1,3,
      ruler1066('Bagrat IV','georgian',1018,11,'ambitious')),
    realm('alania_1066','Alania','#a08f5f','magas',0,2,
      ruler1066('Durgulel','turkic',1020,9,'proud')),
    realm('kiev_1066','Kiev Rus','#c05f1f','kiev',1,3,
      ruler1066('Iziaslav I','slavic',1024,10,'patient')),
    realm('novgorod_1066','Novgorod','#d06f2f','novgorod',1,2,
      ruler1066('Mstislav Izyaslavich','slavic',1043,8,'proud'),'kiev_1066'),
    realm('chernigov_1066','Chernigov','#b07f3f','chernigov',1,2,
      ruler1066('Sviatoslav II','slavic',1027,12,'ambitious'),'kiev_1066'),
    realm('pereyaslavl_1066','Pereyaslavl','#ad7650','pereyaslavl',1,2,
      ruler1066('Vsevolod I','slavic',1030,11,'patient'),'kiev_1066'),
    realm('polotsk_1066','Polotsk','#a06f4f','polotsk',1,2,
      ruler1066('Vseslav','slavic',1039,11,'ambitious')),
    realm('turov_1066','Turov and Volhynia','#907f5f','turov',0,2,
      ruler1066('Yaropolk Izyaslavich','slavic',1043,8,'patient'),'kiev_1066'),
    realm('prussia_1066','Old Prussians','#6f6f4f','sambia',0,2,
      ruler1066('Skomantas of Sambia','baltic',1020,9,'zealous')),
    realm('lithuania_1066','Lithuanians','#8f6f2f','vilnius',1,2,
      ruler1066('Živinbudas','baltic',1020,10,'ambitious')),
    realm('livonia_1066','Livonians','#7f5f3f','riga',0,2,
      ruler1066('Daugirutis','baltic',1020,8,'content')),
    realm('finland_1066','Suomi','#9fb8c8','turku',0,2,
      ruler1066('Kauko of Suomi','baltic',1020,8,'patient')),
    realm('karelia_1066','Karelians','#8fa8b8','kexholm',0,2,
      ruler1066('Väinö of Karelia','baltic',1020,8,'content')),
    realm('cumans_1066','Cuman Confederation','#9f8753','sarkel',2,3,
      ruler1066('Sharukan','turkic',1010,13,'ambitious')),
    realm('volga_bulgaria_1066','Volga Bulgaria','#7f6f3f','bolghar',1,2,
      ruler1066('Ibrahim ibn Muhammad','turkic',1010,10,'patient')),

    /* The Mediterranean, Islam, Africa, and the east */
    realm('seljuk_1066','Great Seljuk Empire','#8b7544','rayy',2,4,
      ruler1066('Alp Arslan','turkic',1029,15,'ambitious')),
    realm('abbasid_1066','Abbasid Caliphate','#4a4a52','baghdad',0,3,
      ruler1066('al-Qa’im','arabic',1001,4,'zealous'),'seljuk_1066'),
    realm('mosul_1066','Uqaylid Mosul','#67605b','mosul',1,2,
      ruler1066('Muslim ibn Quraysh','arabic',1035,10,'ambitious'),'seljuk_1066'),
    realm('aleppo_1066','Mirdasid Aleppo','#756a55','aleppo',1,2,
      ruler1066('Mahmud ibn Nasr','arabic',1030,10,'ambitious')),
    realm('fatimid_1066','Fatimid Caliphate','#6f9348','fustat',1,4,
      ruler1066('al-Mustansir Billah','arabic',1029,9,'patient')),
    realm('ghaznavid_1066','Ghaznavid Sultanate','#d0b03f','ghazni',1,3,
      ruler1066('Ibrahim of Ghazna','persian',1033,11,'patient')),
    realm('sindh_1066','Soomra Sindh','#6f8f3f','mansura',0,2,
      ruler1066('al-Khafif Soomro','persian',1020,8,'content')),
    realm('makran_1066','Emirate of Makran','#9f8f5f','tiz',0,2,
      ruler1066('Isa ibn Ma’dan','persian',1020,8,'patient')),
    realm('sistan_1066','Nasrid Sistan','#b99b45','zaranj',1,2,
      ruler1066('Abu al-Fadl Nasr','persian',1020,9,'patient'),'seljuk_1066'),
    realm('karakhanid_1066','Western Karakhanids','#9b8245','samarkand',1,3,
      ruler1066('Ibrahim Tamghach Khan','turkic',1000,11,'patient')),
    realm('yemen_1066','Sulayhid Yemen','#9f8f6f','sanaa',1,3,
      ruler1066('Ali al-Sulayhi','arabic',1000,11,'ambitious')),
    realm('oman_1066','Imamate of Oman','#6f9f8f','muscat',0,2,
      ruler1066('Rashid ibn Sa’id','arabic',1010,8,'patient')),
    realm('zirid_1066','Zirid Ifriqiya','#b8b04f','kairouan',1,3,
      ruler1066('Tamim ibn al-Mu’izz','berber',1000,10,'proud')),
    realm('hammadid_1066','Hammadid Emirate','#6fae8f','constantine',1,3,
      ruler1066('al-Nasir ibn Alnas','berber',1010,11,'ambitious')),
    realm('almoravid_1066','Almoravid Confederation','#2f6f4f','aghmat',2,3,
      ruler1066('Abu Bakr ibn Umar','berber',1010,13,'zealous')),
    realm('barghawata_1066','Barghawata','#8fae4f','sale',0,2,
      ruler1066('Abu Hafs Abdallah','berber',1010,8,'zealous')),
    realm('makuria_1066','Makuria','#6fcfcf','dongola',0,3,
      ruler1066('Georgios III','nubian',1010,8,'zealous')),
    realm('abyssinia_1066','Abyssinia','#4f9f9f','axum',0,3,
      ruler1066('Jan Seyum','nubian',1010,9,'zealous'))
  ];

  var DUCHY_OWNER = {};
  function assign(owner, ids) {
    for (var i = 0; i < ids.length; i++) DUCHY_OWNER[ids[i]] = owner;
  }

  assign('galicia_1066',['d_galicia']);
  assign('leon_1066',['d_asturias','d_salamanca']);
  assign('castile_1066',['d_castilla']);
  assign('navarre_1066',['d_navarra']);
  assign('sevilla_1066',['d_sevilla','d_algarve']);
  assign('granada_1066',['d_granada']);
  assign('toledo_1066',['d_toledo','d_lisboa']);
  assign('badajoz_1066',['d_badajoz']);
  assign('valencia_1066',['d_valencia']);
  assign('zaragoza_1066',['d_zaragoza','d_tortosa','d_baleares']);
  assign('barcelona_1066',['d_barcelona']);

  assign('france',['d_ile','d_anjou','d_blois','d_champagne','d_vermandois',
    'd_flanders','d_burgundy']);
  assign('normandy',['d_normandy']);
  assign('brittany_1066',['d_brittany','d_penthievre']);
  assign('aquitaine_1066',['d_aquitaine','d_poitou','d_toulouse','d_auvergne',
    'd_gascogne','d_narbonne']);
  assign('hre',['d_lyonnais','d_provence','d_savoy','d_alsace','d_luxembourg',
    'd_frisia','d_franconia','d_swabia','d_ostmark','d_carantania','d_thuringia',
    'd_rhineland','d_piedmont','d_lombardy','d_verona','d_friuli','d_emilia']);
  assign('lorraine_1066',['d_lorraine']);
  assign('saxony_1066',['d_saxony']);
  assign('bavaria_1066',['d_bavaria']);
  assign('tuscany_1066',['d_tuscany']);
  assign('venice_1066',['d_veneto']);
  assign('papacy_1066',['d_spoleto','d_roma']);
  assign('benevento_1066',['d_benevento']);
  assign('apulia_1066',['d_apulia']);
  assign('apulia_1066',['d_calabria']);
  assign('sicily_1066',['d_sicily']);
  assign('sardinia_1066',['d_sardinia','d_corsica']);

  assign('england_1066',['d_wessex','d_devon','d_kent','d_essex','d_sussex',
    'd_mercia','d_hwicce','d_east_anglia','d_lindsey','d_northampton','d_york',
    'd_northumbria','d_chester']);
  assign('gwynedd_1066',['d_gwynedd']);
  assign('deheubarth_1066',['d_deheubarth']);
  assign('glamorgan_1066',['d_glamorgan']);
  assign('scotland_1066',['d_alba','d_moray','d_lothian','d_strathclyde','d_galloway']);
  assign('isles_1066',['d_isles']);
  assign('ulaid_1066',['d_ulster']);
  assign('dublin_1066',['d_meath']);
  assign('leinster_1066',['d_leinster']);
  assign('connacht_1066',['d_connacht']);
  assign('munster_1066',['d_munster']);
  assign('norway_1066',['d_agder','d_vestland','d_oppland','d_trondelag']);
  assign('sweden_1066',['d_svealand','d_gotaland','d_smaland','d_gotland','d_norrland']);
  assign('denmark_1066',['d_jylland','d_sjaelland','d_scania']);

  assign('bohemia_1066',['d_bohemia']);
  assign('poland_1066',['d_moravia','d_slovakia','d_poland','d_mazovia','d_krakow','d_silesia']);
  assign('pomerania_1066',['d_pomerania']);
  assign('wends_1066',['d_wendland']);
  assign('hungary_1066',['d_transdanubia','d_syrmia','d_transylvania','d_etelkoz']);
  assign('novgorod_1066',['d_novgorod','d_rostov','d_beloozero','d_smolensk']);
  assign('kiev_1066',['d_kiev']);
  assign('chernigov_1066',['d_chernigov']);
  assign('polotsk_1066',['d_polotsk']);
  assign('turov_1066',['d_turov','d_volhynia']);
  assign('prussia_1066',['d_prussia']);
  assign('lithuania_1066',['d_samogitia','d_lithuania']);
  assign('livonia_1066',['d_latvia','d_estonia']);
  assign('finland_1066',['d_finland','d_savo']);
  assign('karelia_1066',['d_karelia']);
  assign('cumans_1066',['d_itel','d_sarkel','d_tmutarakan','d_samandar']);
  assign('byzantium_1066',['d_cherson']);
  assign('volga_bulgaria_1066',['d_bulgar']);

  assign('byzantium_1066',['d_thrace','d_macedonia','d_thessaly','d_hellas',
    'd_peloponnese','d_epirus','d_crete','d_bithynia','d_opsikion','d_thrakesion',
    'd_kibyrrhaiot','d_lykaonia','d_cappadocia','d_armeniac','d_chaldia',
    'd_paphlagonia','d_cilicia','d_cyprus','d_moesia','d_thrace_bulg','d_skopje']);
  assign('serbia_1066',['d_rascia','d_zeta','d_bosnia']);
  assign('croatia_1066',['d_croatia','d_slavonia']);
  assign('seljuk_1066',['d_vaspurakan','d_ani','d_ararat']);
  assign('georgia_1066',['d_kartli','d_abkhazia']);
  assign('alania_1066',['d_alania']);

  assign('zirid_1066',['d_tunis','d_tripoli']);
  assign('fatimid_1066',['d_barqa','d_delta','d_cairo','d_fayyum','d_upper_egypt',
    'd_damascus','d_jerusalem','d_jordan','d_hejaz']);
  assign('almoravid_1066',['d_fes','d_tlemcen','d_oran','d_morocco','d_sous','d_sijilmasa']);
  assign('hammadid_1066',['d_tahert','d_algiers']);
  assign('aleppo_1066',['d_aleppo','d_antioch']);
  assign('mosul_1066',['d_mosul','d_diyarbakir','d_edessa']);
  assign('abbasid_1066',['d_baghdad','d_kufa']);
  assign('seljuk_1066',['d_basra','d_najd','d_bahrain','d_rayy','d_hamadan','d_isfahan',
    'd_fars','d_kerman','d_nishapur','d_merv','d_herat','d_balkh','d_tabaristan','d_gilan']);
  assign('yemen_1066',['d_sanaa','d_aden','d_hadhramaut']);
  assign('oman_1066',['d_oman']);
  assign('makran_1066',['d_makran']);
  assign('sindh_1066',['d_sindh']);
  assign('seljuk_1066',['d_azerbaijan']);
  assign('sistan_1066',['d_sistan']);
  assign('karakhanid_1066',['d_transoxiana']);
  assign('ghaznavid_1066',['d_kabul','d_zabulistan']);
  assign('makuria_1066',['d_makuria','d_alodia']);
  assign('abyssinia_1066',['d_axum','d_amhara']);

  var PROVINCE_OWNER = {
    aragon:'aragon_1066', huesca:'aragon_1066',
    venezia:'venice_1066', siracusa:'sicily_1066',
    bari:'byzantium_1066', messina:'apulia_1066', sale:'barghawata_1066',
    pereyaslavl:'pereyaslavl_1066',
    dublin:'dublin_1066', meath:'dublin_1066',
    baghdad:'abbasid_1066', basra:'abbasid_1066'
  };

  var CATHOLIC_DUCHIES = {};
  var ORTHODOX_DUCHIES = {};
  function mark(target, ids) {
    for (var i = 0; i < ids.length; i++) target[ids[i]] = 1;
  }
  mark(CATHOLIC_DUCHIES,[
    'd_agder','d_vestland','d_oppland','d_trondelag','d_svealand','d_gotaland',
    'd_smaland','d_gotland','d_jylland','d_sjaelland','d_scania','d_moravia',
    'd_slovakia','d_bohemia','d_poland','d_mazovia','d_krakow','d_silesia',
    'd_pomerania','d_wendland','d_transdanubia','d_syrmia','d_transylvania'
  ]);
  mark(ORTHODOX_DUCHIES,[
    'd_novgorod','d_rostov','d_beloozero','d_smolensk','d_kiev','d_chernigov',
    'd_polotsk','d_turov','d_volhynia','d_moesia','d_thrace_bulg','d_skopje',
    'd_rascia','d_zeta','d_bosnia'
  ]);

  var DEV_1066 = {
    london:8, paris:7, rouen:6, constantinople:10, roma:8, venezia:8,
    cordoba:9, sevilla:8, toledo:7, granada:7, palermo:7, bari:6,
    kiev:6, novgorod:5, baghdad:10, fustat:10, alexandria:9, aleppo:7,
    damascus:8, jerusalem:6, mosul:7, nishapur:7, merv:7, rayy:7,
    kairouan:7, tunis:6, fes:6, ghazni:5
  };

  function province1066(source) {
    var out = {
      id:source.id, name:source.name, x:source.x, y:source.y,
      terrain:source.terrain
    };
    if (source.wasteland) {
      out.wasteland = true;
      return out;
    }
    out.duchy = source.duchy;
    out.realm = PROVINCE_OWNER[source.id] || DUCHY_OWNER[source.duchy];
    out.culture = source.culture;
    out.religion = source.religion;
    out.dev = DEV_1066[source.id] || Math.min(10, (source.dev || 1) + 1);

    if (CATHOLIC_DUCHIES[source.duchy]) out.religion = 'catholic';
    if (ORTHODOX_DUCHIES[source.duchy]) out.religion = 'orthodox';
    if (out.realm === 'kiev_1066' || out.realm === 'novgorod_1066' ||
        out.realm === 'chernigov_1066' || out.realm === 'pereyaslavl_1066' ||
        out.realm === 'polotsk_1066' || out.realm === 'turov_1066') {
      out.culture = 'slavic';
      out.religion = 'orthodox';
    }
    if (out.realm === 'hungary_1066') {
      out.culture = 'magyar';
      out.religion = 'catholic';
    }
    if (out.realm === 'england_1066') {
      out.culture = 'english';
      out.religion = 'catholic';
    }
    if (out.realm === 'norway_1066' || out.realm === 'sweden_1066' ||
        out.realm === 'denmark_1066' || out.realm === 'isles_1066') {
      out.culture = 'norse';
      out.religion = 'catholic';
    }
    if (out.realm === 'cumans_1066' || out.realm === 'volga_bulgaria_1066') {
      out.culture = 'turkic';
      out.religion = out.realm === 'volga_bulgaria_1066' ? 'sunni' : 'tengri';
    }
    if (out.realm === 'seljuk_1066' || out.realm === 'ghaznavid_1066') {
      if (source.x > 45) out.culture = 'persian';
      out.religion = 'sunni';
    }
    if (out.realm === 'fatimid_1066') out.religion = 'shia';
    if (out.realm === 'apulia_1066') {
      out.culture = 'italian';
      out.religion = 'catholic';
    }
    return out;
  }

  var empires1066 = copyMap(FBDATA.empires);
  var kingdoms1066 = copyMap(FBDATA.kingdoms);
  var duchies1066 = copyMap(FBDATA.duchies);
  kingdoms1066.k_asturias.name = 'León and Castile';
  kingdoms1066.k_west_francia.name = 'France';
  kingdoms1066.k_east_francia.name = 'Germany';
  kingdoms1066.k_pannonia.name = 'Hungary';
  kingdoms1066.k_rus.name = 'Kievan Rus';

  var bookmark867 = {
    id:'867',
    name:'The Viking Age',
    desc:'The old kingdoms stand divided while raiders, caliphs, and emperors contend.',
    date:{ year:867, season:0, day:1 },
    religiousHeads:{ catholic:'papacy', sunni:'abbasid' },
    provinces:FBDATA.provinces,
    realms:FBDATA.realms,
    duchies:FBDATA.duchies,
    kingdoms:FBDATA.kingdoms,
    empires:FBDATA.empires,
    straits:FBDATA.straits,
    scripted:FBDATA.scripted
  };

  var bookmark1066 = {
    id:'1066',
    name:'The Three Claimants',
    desc:'Harold wears England’s crown; Normandy and Norway have not yet crossed the sea.',
    date:{ year:1066, season:0, day:1 },
    religiousHeads:{ catholic:'papacy_1066', sunni:'abbasid_1066' },
    provinces:FBDATA.provinces.map(province1066),
    realms:REALMS_1066,
    duchies:duchies1066,
    kingdoms:kingdoms1066,
    empires:empires1066,
    straits:copyPairs(FBDATA.straits),
    scripted:[]
  };

  FBDATA.defaultBookmark = '867';
  FBDATA.bookmarks = {
    '867':bookmark867,
    '1066':bookmark1066
  };
})();
