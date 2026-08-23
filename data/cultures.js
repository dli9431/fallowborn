/* =========================================================================
   Fallowborn — CULTURES & RELIGIONS (moddable)
   Each culture: male/female name lists + a dynasty-name pattern.
   dyn patterns: 'of_place' -> "of <Province>", 'patronym' -> "<Father>sson/datter",
   'mac' -> "mac <Name>", 'ibn' -> "Banu <Name>", 'ov' -> "<Name>ovich",
   'ap'  -> "ap <Name>", 'plain' -> family name from list below.
   ========================================================================= */
window.FBDATA = window.FBDATA || {};

/* Cultural affinity is authored alongside culture definitions so mods can add
   new traditions without teaching engine or UI code about their ids. */
FBDATA.cultureTraditions = {
  west_european:{ name:'Western & Northern Europe', icon:'🏰', order:1 },
  celtic:{ name:'Celtic Traditions', icon:'☘', order:2 },
  romance:{ name:'Romance & Iberian', icon:'🏛', order:3 },
  byzantine_caucasian:{ name:'Byzantine & Caucasian', icon:'☦', order:4 },
  slavic_baltic:{ name:'Slavic & Baltic', icon:'🌲', order:5 },
  uralic:{ name:'Uralic & Sámi', icon:'🦌', order:6 },
  steppe:{ name:'Steppe & Nomad', icon:'🐎', order:7 },
  middle_eastern:{ name:'Middle Eastern & North African', icon:'🕌', order:8 },
  african:{ name:'African Traditions', icon:'☀️', order:9 },
  other:{ name:'Other Cultures', icon:'🌍', order:10 }
};

FBDATA.cultures = {
frankish: { name:'Frankish', tradition:'west_european', dyn:'of_place',
  male:['Charles','Louis','Lothair','Odo','Robert','Hugh','Baldwin','Fulk','Geoffrey','Arnulf','Bernard','Pepin','Gerard','Raoul','Carloman','Drogo','Wido','Adalard','Berengar','Childebrand','Einhard','Gozlin','Heribert','Ingelram','Milo','Nibelung','Otger','Raino','Theuderic','Warin','Adalhard','Angilbert','Boso','Ebles','Gauzlin','Giselbert','Hilduin','Hucbert','Lambert','Leuthard','Matfrid','Nithard','Odalric','Ratbod','Reginhard','Richar','Sigebert','Wala','Wibert','Wulfad'],
  female:['Adelaide','Ermentrude','Judith','Gisela','Bertha','Rothild','Emma','Adela','Hildegard','Richilde','Alpaid','Ansgarde','Aelis','Engelberga','Ermengarde','Fastrada','Gersvinda','Guntrude','Imma','Irmentrude','Madalgarde','Oda','Odila','Rotrude','Waldrada','Adalind','Aregund','Audovera','Basina','Beretrude','Burgundofara','Clothild','Deuteria','Engeltrude','Fara','Genovefa','Ghentrude','Gundlind','Himiltrude','Ingeltrude','Landrada','Marcovefa','Nanthild','Plectrude','Radegund','Rigunth','Rosamund','Teutberga','Ultrogothe','Wisigarde'] },
german: { name:'German', tradition:'west_european', dyn:'of_place',
  male:['Otto','Heinrich','Konrad','Ludwig','Arnulf','Karlmann','Dietrich','Gebhard','Welf','Eberhard','Rudolf','Hermann','Berthold','Burchard','Egino','Ekbert','Ernst','Friedrich','Gero','Gunther','Liudolf','Liutpold','Megingoz','Poppo','Reginar','Siegfried','Thankmar','Udo','Walther','Zwentibold','Adalbert','Arnold','Bernhard','Bruno','Dedo','Dietmar','Ekkehard','Giselher','Hartwig','Kuno','Lothar','Meginhard','Norbert','Odalrich','Ratold','Salomo','Saxo','Thietmar','Werner','Wichmann'],
  female:['Hedwig','Oda','Mathilde','Gerberga','Liutgard','Uta','Hadwig','Kunigunde','Ida','Gisela','Adelheid','Bertha','Bilitrude','Ermengarde','Frederuna','Gertrude','Hathui','Hildegard','Irmgard','Mechthild','Reginlind','Richgard','Swanhild','Wiburg','Willibirg','Adalgund','Albrun','Bilihild','Brunhild','Engelgard','Friderun','Gerhild','Hadeburg','Hathumoda','Helmburg','Hiltrud','Imma','Irmentrud','Judith','Lioba','Liutburg','Osterlind','Saxburg','Sigelind','Tecka','Theophanu','Walburg','Wiltrud','Windilmoda','Wulfhild'] },
norman: { name:'Norman', tradition:'west_european', dyn:'of_place',
  male:['William','Robert','Richard','Roger','Hugh','Ralph','Gilbert','Geoffrey','Odo','Baldwin','Rainulf','Drogo','Tancred','Serlo','Humphrey','Walter','Gerard','Arnulf','Fulbert','Herluin','Ivo','Nigel','Osbern','Reynold','Turstin','Waleran','Warin','Ansgot','Fulk','Grimbald','Mainard','Turold'],
  female:['Matilda','Emma','Adeliza','Gunnor','Hawise','Judith','Cecilia','Constance','Mabel','Muriel','Agnes','Alice','Avelina','Beatrice','Bertha','Emmeline','Ermengarde','Eremburga','Godehild','Heloise','Hildeburg','Isabel','Lescelina','Lucia','Margaret','Mathildis','Papia','Sibyl','Theodora','Adelina','Amicia','Gundred'] },
ashkenazi: { name:'Ashkenazi', tradition:'west_european', dyn:'of_place',
  male:['Gershom','Judah','Eliezer','Jacob','Solomon','Isaac','Moses','Abraham','Meir','Samuel','Joseph','Simhah','Kalonymos','Meshullam','Nathan','Ephraim','Baruch','Aaron','David','Benjamin','Mordecai','Menahem','Asher','Reuben','Eleazar','Samson','Amram','Azriel','Tobiah','Shemariah','Simeon','Levi'],
  female:['Sarah','Leah','Rebecca','Rachel','Miriam','Hannah','Deborah','Judith','Esther','Yocheved','Zipporah','Hadassah','Abigail','Bilhah','Dinah','Elisheva','Naomi','Tamar','Tirzah','Yael','Keziah','Serah','Shiphrah','Pua','Beruriah','Bona','Bella','Dolce','Freude','Jutta','Guta'] },
english: { name:'Anglo-Saxon', tradition:'west_european', dyn:'of_place',
  male:['Alfred','Edward','Aethelred','Aethelstan','Edmund','Eadric','Wulfric','Osric','Godwin','Leofric','Ceolwulf','Beorhtric','Aelfhelm','Aelfric','Aelfwine','Aethelbald','Aethelwulf','Beornwulf','Byrhtnoth','Ceolmund','Cuthred','Eadgar','Ealdred','Ecgbert','Leofsige','Offa','Oswulf','Sigewulf','Wiglaf','Wulfstan','Aethelwine','Aldhelm','Beorna','Brihthelm','Cenhelm','Ceolred','Coenred','Cynewulf','Dunstan','Eadwald','Ealhmund','Eanwulf','Ecgfrith','Herewulf','Leofwine','Osberht','Osmund','Peada','Sigeberht','Wigmund'],
  female:['Aethelflaed','Eadgifu','Wulfthryth','Aelfgifu','Edith','Osburh','Cyneburg','Leofgifu','Mildrith','Godgifu','Aebbe','Aelfflaed','Aelfthryth','Aethelgifu','Aethelhild','Beorhtgifu','Cynethryth','Eadburh','Ealhswith','Eanflaed','Frithugyth','Osyth','Seaxburh','Waerburh','Wulfwyn','Aethelburh','Aethelthryth','Aldgyth','Botild','Breguswith','Cneburg','Cuthburh','Cynewise','Eadflaed','Ealdgyth','Ealhflaed','Eanswith','Eormenhild','Frideswide','Hereswith','Hilda','Hildelith','Merewenna','Milburg','Ricula','Saethryth','Tetta','Tydgyth','Wihtburh','Wynflaed'] },
norse: { name:'Norse', tradition:'west_european', dyn:'patronym',
  male:['Ragnar','Bjorn','Ivar','Halfdan','Sigurd','Harald','Erik','Olaf','Gunnar','Leif','Sven','Knut','Ulf','Orm','Aki','Birger','Einar','Gorm','Grim','Hakon','Helgi','Ingvar','Kettil','Rorik','Sigtrygg','Snorri','Styrbjorn','Torgil','Tryggvi','Yngvar','Asbjorn','Bard','Egil','Eystein','Frodi','Geirr','Gisli','Grettir','Guthorm','Hasteinn','Heming','Ingjald','Naddod','Ottar','Ragnvald','Sigmund','Starkad','Thorfinn','Thorkell','Vagn'],
  female:['Astrid','Gunnhild','Freydis','Thora','Sigrid','Ingrid','Helga','Ragnhild','Aslaug','Thyra','Alfhild','Asa','Aud','Bergljot','Borghild','Estrid','Gudrid','Gyda','Hallgerd','Ingibjorg','Jorunn','Liv','Sigrun','Solveig','Svanhild','Tove','Arnfrid','Asny','Bera','Bodil','Disa','Eirny','Fastvi','Gudny','Gunnvor','Hallbera','Herdis','Hildr','Hrefna','Ingveldur','Kara','Katla','Oddny','Sigvor','Steinunn','Thorbjorg','Thordis','Thurid','Unn','Vigdis'] },
gaelic: { name:'Gaelic', tradition:'celtic', dyn:'mac',
  male:['Aed','Niall','Domnall','Cormac','Brian','Murchad','Flann','Cellach','Diarmait','Fergus','Cinaed','Conall','Ailill','Amalgaid','Cathal','Cerball','Colman','Conchobar','Congal','Donnchad','Eochaid','Faelan','Fiachna','Indrechtach','Loegaire','Lorcan','Maelruain','Muiredach','Ruarc','Tigernach','Aengus','Artri','Blathmac','Bresal','Cairpre','Cennfaelad','Colcu','Crimthann','Cumascach','Dubthach','Echtigern','Fergal','Finnian','Guaire','Maelduin','Muirchertach','Ronan','Sechnasach','Suibne','Tuathal'],
  female:['Gormlaith','Derbail','Mor','Eithne','Orlaith','Sadb','Bebinn','Lasairfhiona','Aoife','Uallach','Ailbe','Barrdub','Cacht','Ciarnait','Delbchaem','Emer','Fedelm','Liadan','Medb','Muirgel','Nessa','Ragnailt','Taileflaith','Tuathla','Una','Aignech','Aife','Bec','Blaith','Cairenn','Caillech','Caindelban','Coblaith','Creide','Derbforgaill','Dubchoblaig','Dunlaith','Eachtach','Echrad','Finnabair','Gelgeis','Gobnat','Ite','Mongfind','Mugain','Ornat','Sarnait','Sindech','Tailtiu','Uasal'] },
brezhon: { name:'Brythonic', tradition:'celtic', dyn:'ap',
  male:['Alan','Erispoe','Salomon','Judicael','Gurvand','Rhodri','Anarawd','Cadell','Hywel','Idwal','Morgan','Owain','Beli','Cadfan','Cadwallon','Conan','Cynan','Dyfnwal','Einion','Elisedd','Gradlon','Gruffydd','Hoel','Merfyn','Nominoe','Pascweten','Rhun','Tudwal','Alun','Arawn','Bleddyn','Brochfael','Cadfarch','Caradog','Ceredig','Cyngen','Dumnarth','Elffin','Gwgon','Gwrgi','Idnerth','Jestyn','Judhel','Maelgwn','Meilyr','Morcant','Rhiwallon','Tewdwr','Urbien','Yspeil'],
  female:['Prostlon','Aourken','Argantlowen','Nest','Angharad','Gwenllian','Rhiannon','Efa','Morvoren','Tangwystl','Alis','Branwen','Ceridwen','Creirwy','Elen','Essylt','Gwladys','Heledd','Luned','Melangell','Modron','Olwen','Sanant','Tegau','Alar','Argante','Banon','Ceindrech','Dwynwen','Eurgain','Ffluir','Goleuddydd','Gwenan','Gwenfrewi','Gwenfyl','Gwerful','Haf','Lleucu','Llonwen','Medefyl','Meleri','Morwenna','Non','Nwyvre','Rhain','Rhiain','Tydi','Wenn'] },
iberian: { name:'Iberian', tradition:'romance', dyn:'of_place',
  male:['Alfonso','Ordono','Garcia','Ramiro','Fruela','Sancho','Nuno','Gonzalo','Fernando','Bermudo','Inigo','Fortun','Arias','Aurelio','Aznar','Diego','Favila','Galindo','Gutierre','Hermenegildo','Lope','Mauregato','Munio','Nepociano','Pelayo','Rodrigo','Silo','Vela','Witiza','Abellar','Ansur','Aureolus','Castellano','Cixila','Flain','Gudesteo','Iban','Jimeno','Lupus','Mendo','Monnio','Nunnio','Osorio','Pedro','Sebastian','Sisnando','Suero','Teodosio','Vigila','Ximeno'],
  female:['Urraca','Jimena','Elvira','Munia','Sancha','Teresa','Leodegundia','Aldonza','Toda','Oneca','Adosinda','Ausenda','Berenguela','Cristina','Eilo','Esclaramunda','Ermesinda','Goto','Gontrodo','Ilduara','Mayor','Nuna','Paterna','Velasquita','Alba','Andregoto','Argilo','Aurita','Belasquita','Bertruda','Elisenda','Enderquina','Estefania','Galana','Gracia','Guiomar','Ildonza','Justa','Leocadia','Lupa','Melisenda','Munina','Orbita','Quixilo','Riquilda','Sendina','Ximena','Zaida'] },
basque: { name:'Basque', tradition:'romance', dyn:'of_place',
  male:['Eneko','Gartzia','Santxo','Ximeno','Antso','Fortun','Aznar','Lope','Galindo','Belasko','Semen','Munio','Oier','Andoni','Gorka','Mikel','Unai','Iker','Aitor','Jon','Koldo','Julen','Markel','Benat','Gaizka','Imanol','Asier','Endika','Kepa','Enaut','Joseba','Peru','Patxi','Gotzon','Urko','Bitor','Danel','Egoitz','Ekaitz','Haritz','Ibai','Iban','Inaki','Jagoba','Josu','Mattin','Oihan','Paul','Txomin','Zigor'],
  female:['Toda','Oneca','Urraca','Munia','Jimena','Auria','Sancha','Velasquita','Andregoto','Leodegundia','Teresa','Estefania','Amaya','Arantza','Begona','Edurne','Garbine','Itziar','Jaione','Leire','Miren','Nekane','Nerea','Oihana','Sorne','Uxue','Zurine','Agurtzane','Ainhoa','Alazne','Eneritz','Goiuri','Haizea','Igone','Irati','Izaro','Lorea','Maialen','Maite','Nahia','Saioa','Sarai','Ziortza','Elaia','Enara','Gaxuxa','Lur','Nagore','Olaia','Paule'] },
occitan: { name:'Occitan', tradition:'romance', dyn:'of_place',
  male:['Guilhem','Raimon','Pons','Bernat','Bertran','Peire','Arnaut','Folquet','Gaucelm','Aimeric','Ademar','Azemar','Bermon','Dalfin','Ebles','Eble','Ermengau','Gaston','Gausbert','Gausfred','Giraud','Guiraut','Jaufre','Jordan','Miron','Odon','Rostanh','Rudel','Sicard','Trencavel','Uc'],
  female:['Ermengarda','Almodis','Garsenda','Adalaiz','Beatriz','Ermessenda','Faidida','Guillelma','Azalaïs','Barrala','Bertranda','Brianda','Cecilia','Clarmonda','Dolça','Ermengart','Esclarmonda','Etiennette','Garsendis','Geralda','Guisla','India','Mabilia','Margarida','Petronilla','Philippa','Raimonda','Rixenda','Sancie','Tibors','Vierna','Azalais'] },
andalusi: { name:'Andalusi', tradition:'middle_eastern', dyn:'ibn',
  male:['Abd al-Rahman','Muhammad','Umar','Yusuf','Hisham','Sulayman','Tariq','Musa','Ziyad','Hakam','Mundhir','Abdallah','Abbas','Abd al-Malik','Abd al-Wahid','Amrus','Habib','Hayyan','Idris','Isa','Ishaq','Khalaf','Lubb','Maslama','Mufarrij','Qasim','Said','Ubayd','Walid','Zayyan','Abd al-Aziz','Abd al-Samad','Aslam','Ayyub','Badr','Bashir','Fath','Ghalib','Hamdan','Hashim','Hudhayl','Khayr','Mikhlaf','Mutarrif','Saif','Shabib','Shuayb','Talut','Uthman','Zubayr'],
  female:['Fatima','Aisha','Zaynab','Maryam','Lubna','Wallada','Halawa','Muzna','Rumaykiyya','Sara','Amal','Buthayna','Fahda','Hafsa','Hamida','Itimad','Jamila','Khadra','Mahbuba','Nafisa','Nazhun','Qamar','Rayhana','Tarub','Umayma','Huma','Abda','Alifa','Arwa','Aziza','Bahja','Bushra','Durr','Ghazala','Habiba','Izza','Jawhara','Khulud','Maisuna','Marjana','Nazha','Nudhar','Rabia','Salama','Sayyida','Shahida','Subh','Tahira','Warda','Zuhra'] },
italian: { name:'Italian', tradition:'romance', dyn:'of_place',
  male:['Guido','Lamberto','Berengario','Adalberto','Anscario','Bonifacio','Landolfo','Pandolfo','Marino','Docibile','Pietro','Giovanni','Adelferi','Ago','Alberico','Anastasio','Atenolfo','Azzo','Corrado','Gaidoaldo','Grimoaldo','Guaimar','Leone','Liutprando','Mauro','Orso','Radelchis','Suppo','Teobaldo','Walfredo','Adalardo','Aimone','Alahis','Albuino','Aripert','Astolfo','Atto','Bonizo','Cuniberto','Desiderio','Faroardo','Gisulf','Guinicardo','Hildeprand','Ilderico','Lupicino','Maginario','Rachis','Rotari','Zotto'],
  female:['Ageltrude','Bertila','Gisla','Rotruda','Ermengarda','Willa','Marozia','Teodora','Itta','Adelasia','Alberada','Amalasunta','Ansa','Aurona','Berta','Desiderata','Ermelinda','Gaitelgrima','Gemma','Griselda','Liutperga','Marcia','Radelgarda','Sichelgaita','Theodelinda','Adalgunda','Adalperga','Alderuda','Alveria','Ancilla','Ansflida','Ansperga','Appa','Cunegonda','Dauferada','Fara','Geltruda','Gundeperga','Guntelda','Hermelinda','Ingunda','Liuba','Matelda','Ota','Rania','Rodelinda','Romilda','Sicheltruda','Wigelinda','Wipperga'] },
lombard: { name:'Lombard', tradition:'romance', dyn:'of_place',
  male:['Arechis','Adelchis','Atenulf','Landulf','Pandulf','Guaimar','Gisulf','Siconulf','Radelchis','Sicard','Grimoald','Romuald','Alfanus','Aio','Audelais','Daufer','Erchempert','Guy','Lando','Manso','Poto','Radoald','Roffrit','Sergius','Sico','Tasselgard','Truppoald','Waifer','Zotto','Aldoin','Alferius','Atenolf'],
  female:['Sichelgaita','Gaitelgrima','Adeltrude','Adelperga','Ageltrude','Aloara','Gemma','Theodelinda','Radelgarda','Bertila','Ermengarda','Gisla','Liutperga','Rodelinda','Sicheltruda','Adalgunda','Alderuda','Altruda','Ansa','Aurona','Dauferada','Ermelinda','Gundeperga','Guntelda','Liuba','Romilda','Willa','Winiperga','Waldrada','Agneltruda','Maria','Teodora'] },
greek: { name:'Greek', tradition:'byzantine_caucasian', dyn:'plain',
  family:['Phokas','Doukas','Skleros','Argyros','Maleinos','Kourkouas','Melissenos','Lekapenos','Botaneiates','Dalassenos','Diogenes','Komnenos','Maniakes','Tzimiskes'],
  male:['Basileios','Leon','Konstantinos','Michael','Nikephoros','Ioannes','Theophilos','Romanos','Alexios','Andronikos','Christophoros','Petros','Anastasios','Bardas','Damianos','Demetrios','Eustathios','Georgios','Gregorios','Ignatios','Lazaros','Marianos','Methodios','Nikolaos','Prokopios','Sergios','Stefanos','Symeon','Theodoros','Zenon','Artabasdos','Bardanes','Eudokimos','Himerios','Isaac','Katakalon','Krinites','Ktenas','Leontios','Marinos','Mousikos','Niketas','Ooryphas','Orestes','Photeinos','Priskos','Sisinios','Staurakios','Theoktistos','Theophylaktos'],
  female:['Theodora','Zoe','Eudokia','Anna','Irene','Maria','Helena','Theophano','Pulcheria','Sophia','Agatha','Anastasia','Anthousa','Basilike','Euphemia','Euphrasia','Gregoria','Kale','Kassia','Martina','Paraskeve','Pelagia','Prokopia','Thekla','Thomais','Aikaterine','Anastaso','Antonina','Athanasia','Christina','Domnina','Elisavet','Epiphania','Eudoxia','Eugenia','Eupraxia','Georgia','Hilaria','Ioanna','Iouliane','Kallisto','Makrina','Myrto','Nikarete','Photeine','Platonis','Styliane','Theodote','Theoktiste','Xene'] },
slavic: { name:'Slavic', tradition:'slavic_baltic', dyn:'ov',
  male:['Vladimir','Sviatoslav','Boris','Mstislav','Rastislav','Bozidar','Milos','Dragan','Casimir','Mieszko','Vlastimir','Presian','Boleslav','Borivoj','Branimir','Budimir','Dobromir','Dragomir','Gorazd','Jaroslav','Mojmir','Mutimir','Pribina','Radoslav','Ratibor','Svatopluk','Trpimir','Vsevolod','Yaropolk','Zdeslav','Belimir','Bretislav','Budivoj','Chedomir','Chotimir','Dobroslav','Gostimir','Gradimir','Kocel','Krasimir','Kresimir','Lutomer','Miroslav','Muncimir','Pribislav','Radomir','Strojimir','Vladislav','Voin','Zvonimir'],
  female:['Olga','Ludmila','Dobrava','Milica','Zvonimira','Rada','Vesna','Mira','Slava','Bozena','Bogna','Dabrowka','Dragomira','Gorislava','Jarmila','Lada','Liubava','Malusha','Miloslava','Neda','Predslava','Rogneda','Sbislava','Stanislava','Sviatoslava','Zlata','Beloslava','Bogdana','Borislava','Bratislava','Dobronega','Dobroslava','Drahomira','Gostimira','Gradislava','Krasava','Ludomira','Miroslava','Mladena','Nadezda','Pribislava','Radmila','Sobeslava','Svatava','Tomislava','Venceslava','Vladislava','Voislava','Zdislava','Zivka'] },
rus: { name:'Rus', tradition:'slavic_baltic', dyn:'ov',
  male:['Vladimir','Sviatoslav','Yaroslav','Iziaslav','Vsevolod','Mstislav','Rostislav','Yaropolk','Oleg','Igor','Rurik','Askold','Dir','Boris','Gleb','Davyd','Roman','Viacheslav','Volodar','Rogvolod','Sviatopolk','Sudislav','Vseslav','Bryachislav','Gorislav','Dobrynia','Mal','Ratibor','Rognvald','Sveneld','Tur','Volodymyr'],
  female:['Olga','Anna','Anastasia','Maria','Irina','Predslava','Rogneda','Malusha','Dobronega','Eupraxia','Eudokia','Agafia','Agatha','Gytha','Ingigerd','Ksenia','Liubava','Miloslava','Sbyslava','Sviatoslava','Vseslava','Vysheslava','Yanka','Zvenislava','Dobroslava','Gorislava','Mstislava','Peredslava','Rostislava','Sofia','Vera','Yaroslava'] },
magyar: { name:'Magyar', tradition:'steppe', dyn:'of_place',
  male:['Arpad','Almos','Zoltan','Taksony','Geza','Bulcsu','Lehel','Tas','Huba','Kond','Bela','Bogat','Elod','Gyula','Horka','Jutas','Kende','Ketel','Lel','Ond','Ors','Szabolcs','Teto','Ugyek','Vajk','Velek','Zombor','Zuard','Abod','Agmund','Akos','Apor','Bedecs','Beke','Botond','Csak','Fajsz','Kallo','Kaplon','Karachon','Kusid','Levente','Lorand','Osbu','Som','Szalard','Teveli','Vatha','Yelku','Zerind'],
  female:['Emese','Reka','Sarolt','Karold','Iren','Zsofia','Piroska','Gyongyver','Csilla','Boglarka','Arany','Eniko','Erzsi','Hajnal','Ildiko','Ilka','Katalin','Margit','Orsika','Sarika','Tunde','Virag','Zsoka','Zsuzsa','Aniko','Berta','Brigitta','Cecilia','Dorottya','Edit','Etelka','Franciska','Gabriella','Gyongyi','Hanga','Ilona','Jolanka','Julianna','Kincso','Lujza','Malvin','Orsolya','Rozalia','Sari','Szilvia','Teodora','Valeria','Zita'] },
turkic: { name:'Turkic', tradition:'steppe', dyn:'of_place',
  male:['Bulan','Obadiah','Aaron','Joseph','Menashe','Baghatur','Kayghalagh','Tarkhan','Chichak','Almish','Alp','Arslan','Barsbek','Bek','Bektur','Bumin','Busir','Ilteber','Irkin','Istemi','Kabak','Kul','Kutlug','Ozmis','Sabriel','Tegin','Tung','Yabghu','Yilig','Ziebel','Ayaz','Barak','Bayan','Bekar','Bilig','Bogyu','Bugra','Chagri','Chorpan','Elci','Inal','Kapagan','Kilic','Kursat','Saru','Savac','Shad','Suluk','Toghril','Yagmur'],
  female:['Chichek','Serakh','Parsbit','Atil','Sara','Tamar','Khatun','Bihar','Esther','Rachel','Arzun','Begum','Biksu','Chaghri','Devorah','Eren','Gulnar','Konca','Selcan','Sultana','Umay','Yula','Altun','Ayse','Bilge','Burcu','Dilber','Ece','Gonca','Gulbahar','Guldeste','Ilknur','Kervan','Mihri','Nazli','Peri','Seher','Yildiz','Aycicek','Aylin','Elbike','Gunduz','Hadassah','Miriam','Yehudit','Ilbike'] },
khazar: { name:'Khazar', tradition:'steppe', dyn:'of_place',
  male:['Bulan','Obadiah','Benjamin','Aaron','Joseph','Menashe','Hanukkah','Isaac','Zebulun','Sabriel','Baghatur','Barsbek','Busir','Ibuzir','Tarkhan','Ilteber','Bihar','Chorpan','Kundajik','Pesakh','Yitzhak','Nisi','Romanos','Georgios','Kabar','Alp','Arslan','Bek','Kutlug','Tudun','Yabghu','Yilig'],
  female:['Serakh','Chichek','Parsbit','Atil','Sarah','Tamar','Esther','Rachel','Miriam','Deborah','Judith','Hadassah','Rebecca','Leah','Hannah','Zipporah','Bihar','Khatun','Altun','Umay','Yula','Arzun','Bilge','Elbike','Gulnar','Konca','Selcan','Sultana','Yildiz','Ayça','Ece','Peri'] },
arabic: { name:'Arab', tradition:'middle_eastern', dyn:'ibn',
  male:['Ahmad','Muhammad','Ali','Hasan','Husayn','Jafar','Harun','Ibrahim','Ismail','Khalid','Tahir','Yahya','Zayd','Marwan','Abdallah','Abu Bakr','al-Fadl','al-Mansur','Dawud','Hamza','Idris','Isa','Khuzayma','Mamun','Nasr','Qasim','Rashid','Salih','Ubaydallah','Walid','Abd al-Aziz','Abu Jafar','al-Amin','al-Hadi','al-Mahdi','al-Mutawakkil','Amr','Asad','Bishr','Hatim','Imran','Khaldun','Mujahid','Musab','Numan','Qutayba','Shabib','Sinan','Uthman','Yazid'],
  female:['Khadija','Fatima','Zubayda','Aisha','Zaynab','Ruqayya','Umm Kulthum','Safiyya','Hind','Layla','Amira','Asma','Buran','Farida','Hafsa','Halima','Jamila','Juwayriyya','Mariya','Maymuna','Nafisa','Ramlah','Salma','Sawda','Shaghab','Umm Salama','Ala','Arib','Atika','Badia','Banan','Baraka','Fakira','Ghada','Ghazal','Hababa','Hakima','Hawra','Inan','Jawza','Kaltham','Najma','Rayta','Ruhayma','Sabiha','Sukayna','Thuraiya','Widad','Zamrud','Zulaikha'] },
syriac: { name:'Syriac', tradition:'middle_eastern', dyn:'of_place',
  male:['Ephrem','Narsai','Isho','Barsauma','Babai','Hnanisho','Timothy','Thomas','George','Gabriel','Abraham','Isaac','Jacob','Joseph','Michael','Sergius','Theodore','Daniel','David','Elijah','Emmanuel','John','Lazarus','Moses','Paul','Peter','Sabrisho','Shlemun','Yahballaha','Yohannan','Zakha','Zakkai'],
  female:['Mariam','Shirin','Martha','Sarah','Rebecca','Rachel','Hannah','Elizabeth','Helena','Theodora','Sophia','Susanna','Anastasia','Anna','Barbara','Christina','Deborah','Dinah','Euphemia','Hadassah','Irene','Judith','Leah','Magdalena','Marina','Salome','Shamiram','Tamar','Thekla','Yaqut','Zaynab','Zipporah'] },
berber: { name:'Berber', tradition:'middle_eastern', dyn:'ibn',
  male:['Idris','Yahya','Ziri','Buluggin','Tariq','Kusayla','Aksil','Yusuf','Abd al-Wahhab','Aflah','Midrar','Ilyasa','Abd al-Rahman','Abdallah','Badis','Dawud','Hammad','Ibrahim','Isa','Juba','Masuna','Maysara','Muhammad','Musa','Salih','Suleiman','Tarif','Uqba','Walid','Yunus','Aghiles','Akenzir','Amastan','Amayas','Ayyur','Baddi','Bakir','Gaya','Iken','Ilmas','Lamaz','Masgaba','Massinissa','Mazigh','Narvas','Seksak','Tasga','Wattas','Yattuft','Yidir'],
  female:['Kahina','Tin Hinan','Fatima','Zaynab','Kenza','Tafsut','Damya','Chemci','Lalla','Tiziri','Aicha','Aldja','Amina','Fadhma','Illi','Sekkura','Tamaya','Tanit','Tassadit','Thilleli','Tuda','Zora','Alba','Dassin','Dihya','Fella','Ghita','Ghenima','Hennu','Kelthoum','Massina','Mimouna','Sasru','Siman','Tadla','Taghramt','Tajdit','Takama','Talwit','Tamaghra','Tamentit','Tanghit','Tihahya','Tinirim','Titrit','Yemma'] },
persian: { name:'Persian', tradition:'middle_eastern', dyn:'plain',
  family:['Samani','Buyid','Ziyarid','Firuzan','Bavandi','Kareni','Farighunid','Ilyasid','Justanid','Mamunid','Qarinvand','Sajid'],
  male:['Ismail','Nasr','Mardavij','Rustam','Bahram','Khusrau','Shirzad','Farrukh','Kaveh','Dara','Hormizd','Piruz','Anushirvan','Ardeshir','Babak','Baraz','Esfandiar','Farhad','Fariburz','Fereydun','Goshtasp','Jamshid','Manuchihr','Nuh','Qarin','Qubad','Shahriyar','Tahmuras','Wahsudan','Yaqub','Adhar','Arshak','Azad','Behzad','Bozorgmehr','Burzin','Darab','Hushang','Kiyumarth','Makan','Mardanshah','Mihr','Narseh','Parviz','Saman','Siyavash','Sukhra','Vardanes','Vistahm','Zarir'],
  female:['Shirin','Golnar','Roxana','Parisa','Banu','Azarmidokht','Purandokht','Gordiya','Mahin','Soraya','Anahita','Arus','Dilbar','Farah','Homa','Katayun','Khorshid','Laleh','Nahid','Nasrin','Roshanak','Sudaba','Turan','Yasaman','Zarin','Azadeh','Behafarid','Boran','Darya','Farima','Farkhunda','Gordafarid','Gulnaz','Homay','Iran','Jahan','Khumar','Mahnaz','Mihrduxt','Mina','Mozhgan','Nazanin','Negar','Nilufar','Parizad','Sepideh','Shahdokht','Shahla','Simin','Zari'] },
armenian: { name:'Armenian', tradition:'byzantine_caucasian', dyn:'plain',
  family:['Bagratuni','Artsruni','Mamikonian','Siwni','Rshtuni','Amatuni','Gnuni','Kamsarakan'],
  male:['Ashot','Smbat','Gagik','Abas','Mushegh','Vahan','Vardan','Grigor','Sahak','Levon','Adom','Arshavir','Artavazd','Atom','Bagarat','Davit','Derenik','Gurgen','Hmayeak','Koryun','Mashtots','Nerses','Shapuh','Tiran','Trdat','Vache','Vasak','Zarmayr','Arakel','Arsen','Artashes','Babgen','Gegham','Gor','Hampartsum','Hovnan','Isaac','Khoren','Khosrov','Mihran','Mkhitar','Nahabed','Nshan','Pap','Sargis','Senekerim','Tigran','Vahram','Yeghishe','Zakaria'],
  female:['Katranide','Hripsime','Shushan','Anush','Mariam','Seda','Nane','Astghik','Gayane','Zaruhi','Anahit','Araxi','Armenuhi','Azniv','Gohar','Heghine','Kohar','Lusine','Nazeli','Parandzem','Sanduxt','Sirun','Sose','Takush','Vartiter','Zabel','Arpine','Ashkhen','Aspram','Azatui','Chinar','Diruhi','Hasmik','Katarine','Khosroviduxt','Maral','Meline','Nvard','Satine','Shake','Siran','Siranush','Sona','Taguhi','Tsiran','Tsolak','Varduhi','Vartanush','Zarmanduxt','Zepyur'] },
georgian: { name:'Georgian', tradition:'byzantine_caucasian', dyn:'plain',
  family:['Bagrationi','Guaramid','Chosroid','Nersianid','Anchabadze'],
  male:['Adarnase','Bagrat','David','Guaram','Vakhtang','Giorgi','Levan','Sumbat','Kvirike','Demetre','Ashot','Archil','Bidzina','Dachi','Grigol','Guram','Gurgen','Ioane','Juansher','Khosro','Mirian','Nerse','Pharasman','Rev','Shalva','Svimon','Valeri','Varsken','Aternerseh','Bakur','Bardzim','Constantine','Goderdzi','Javakh','Kakhay','Leon','Liparit','Luarsab','Mamia','Mihirdat','Otia','Parsman','Pharnavaz','Rodi','Stepanoz','Teimuraz','Theodosius','Varaz-Bakur','Viroy','Zviad'],
  female:['Tamar','Nino','Ketevan','Rusudan','Mariam','Nana','Tinatin','Khvaramze','Dinara','Guranduxt','Darejan','Elene','Lali','Mzekhatun','Nestan','Rodam','Sagdukht','Shorena','Thea','Tuta','Vardo','Ana','Borena','Burduxan','Comita','Dedimedi','Duda','Elisabed','Gulshar','Gvantsa','Javakha','Kata','Kore','Kosana','Mzevinar','Natali','Nazi','Nini','Qeqe','Ratna','Sakdari','Samkhar','Thekla','Xatia','Zosime','Zurana'] },
baltic: { name:'Baltic', tradition:'slavic_baltic', dyn:'of_place',
  male:['Mindaugas','Treniota','Daumantas','Butigeidis','Vykintas','Zhivinbud','Kestas','Ruklys','Lengvenis','Tautvilas','Budrys','Daugirutis','Erdvilas','Gediminas','Kernius','Kukovaitis','Montvilas','Pukuveras','Rimantas','Skalmantas','Surminas','Traidenis','Vaibutas','Vismantas','Zvelgaitis','Algirdas','Aukstas','Bute','Daugirdas','Dausprungas','Gedvilas','Gilginas','Girdenis','Glintas','Jaunutis','Jogaila','Karijotas','Ligeikis','Mantautas','Margiris','Narimantas','Nedas','Patrimantas','Rudaminas','Skirgaila','Steksys','Survila','Vaisvilkas','Veliuona','Vytautas'],
  female:['Birute','Morta','Aldona','Gaudimante','Ramune','Egle','Ruta','Laima','Austeja','Milda','Aiste','Audrone','Danute','Dovile','Gabija','Giedre','Gintare','Jurate','Marija','Neringa','Saule','Ugne','Vaiva','Zivile','Aldute','Ase','Audra','Ausra','Dalia','Danguole','Deivile','Dzilda','Gema','Ginte','Jogile','Liene','Lina','Migle','Raimonda','Raminta','Ringaile','Rugile','Siga','Smilte','Vaiga','Vaida','Vilija','Zymante'] },
finnic: { name:'Finnic', tradition:'uralic', dyn:'of_place',
  male:['Kauko','Väinö','Ahti','Ilmari','Lemminkäinen','Untamo','Kullervo','Tapio','Antero','Heikki','Henrik','Ihalempi','Ihanti','Ikäheimo','Kaukamieli','Kauppi','Kokko','Lempi','Mielitty','Mielivalta','Mielus','Nousia','Päivä','Soini','Toivo','Tuure','Ukko','Viljami','Voitto','Yrjänä','Auvo','Keimo'],
  female:['Aino','Kyllikki','Mielikki','Tellervo','Annikki','Kerttu','Helmi','Ilta','Kaarina','Lempi','Louhi','Marjatta','Mielitty','Päivi','Rauni','Sanelma','Sinikka','Suoma','Tuulikki','Tyyni','Vellamo','Vieno','Aamu','Kaisa','Katri','Loviisa','Maire','Meri','Pilvi','Sirkka','Säde','Tuuli'] },
sami: { name:'Sámi', tradition:'uralic', dyn:'of_place',
  male:['Ánde','Biera','Máhtte','Niillas','Iŋggá','Jovnna','Aslak','Áilu','Biret','Deatnu','Gaup','Giera','Ivvár','Juhán','Lemet','Mihkkal','Oula','Piera','Rávdná','Sámmol','Sire','Vulle','Ánte','Čuovgga','Dierpmis','Juuso','Máret','Nils','Ovllá','Pieraš','Sáivu','Vuolab'],
  female:['Elle','Máret','Biret','Inga','Rávdná','Ánne','Elle-Risten','Gáren','Gunvor','Iŋgá','Kirste','Lemet','Liisá','Máhtte','Marjá','Risten','Sárá','Sire','Sunna','Áile','Ánne-Máret','Bávlos','Čáhces','Elle-Máret','Guri','Kátjá','Máddji','Nasti','Risten-Anna','Sáve','Ulla','Vuokko'] },
coptic: { name:'Coptic', tradition:'african', dyn:'of_place',
  male:['Shenoute','Beshoy','Mina','Kyrillos','Athanasius','Benjamin','Markos','Michael','Gabriel','Abraham','Isaac','Jacob','Joseph','Moses','Samuel','Theodore','Theophilus','Anba','Apollo','Basil','Chael','Dioscorus','Epiphanius','George','John','Macarius','Matthew','Mercurius','Pachomius','Paul','Peter','Simeon'],
  female:['Damiana','Mariam','Sarah','Rebecca','Rachel','Hannah','Theodora','Sophia','Helena','Anna','Anastasia','Barbara','Catherine','Christina','Deborah','Elizabeth','Euphemia','Irene','Joanna','Judith','Leah','Magdalena','Marina','Martha','Mary','Pelagia','Salome','Susanna','Tamar','Thekla','Verena','Zipporah'] },
nubian: { name:'Nubian', tradition:'african', dyn:'of_place',
  male:['Zacharias','Georgios','Kyriakos','Merkurios','Solomon','Basil','Rafael','Stephanos','Ioannes','Abraam','Chael','David','Elias','Ezekiel','Giyorgis','Ioustinos','Kaleb','Kosmas','Makarios','Markos','Menas','Mouses','Petros','Qalidurut','Simeon','Theophilos','Tokil','Aaron','Abratoye','Armenna','Doud','Epimachos','Iesou','Israel','Kollouthos','Masal','Mashshouda','Moukatra','Newaya','Onnoshkouda','Ordu','Ouasta','Ouesen','Paulos','Tamal','Tanta','Togoti','Ura','Yasan','Yosh'],
  female:['Martha','Maria','Theodora','Anna','Elisabet','Sara','Rebekka','Damiana','Eirene','Sophia','Anastasia','Eudokia','Helena','Joanna','Kandake','Mariakouda','Ngonnena','Pelagia','Ponngila','Susanna','Tapara','Thekla','Titta','Toungesi','Abrotona','Adaueta','Atirkouda','Dapausa','Dousa','Eiopa','Iesousigne','Kapia','Kojoka','Mikaela','Ngaddakouda','Ngollena','Pachnita','Sakina','Sauoka','Serena','Sia','Sitte','Souaein','Takomphit','Tasine','Tekram','Thatil','Tsia'] }
};

/* Settlement name parts per culture — combined pre+suf deterministically by
   FB.settlementsOf (no RNG draw, so saves stay stable). 'default' covers any
   culture without its own set. */
FBDATA.settlementNames = {
  default:  { pre:['Nor','Sud','Alt','Mid','Over','East','West','Kirk','Holm','Thorn'], suf:['wick','stead','mark','field','bridge','haven','ford','combe','shaw','gate'] },
  frankish: { pre:['Mont','Beau','Char','Fontaine','Clair','Vaux','Roche','Bel','Sauv','Ville','Auber','Cour','Neuf','Long','Champ','Fres'], suf:['court','mont','ville','bourg','neuf','ay','oy','illac','son','ruel','liers','mer','gny','lay'] },
  german:   { pre:['Alten','Rothen','Grun','Stein','Wald','Eber','Neu','Hoch','Kirch','Berg','Schwarz','Linden'], suf:['heim','dorf','burg','bach','feld','hausen','stadt','berg','bruck','hafen','ingen','wald'] },
  norman:   { pre:['Mont','Beau','Font','Clair','Val','Saint','Roche','Belle','Longue','Neuf','Grand','Bois'], suf:['ville','bourg','court','mesnil','mont','tot','bec','fleur','mare','hou','vast','ry'] },
  english:  { pre:['Ash','Stan','Wul','Har','Ox','Berk','El','Grim','Hean','Pad','Read','Wok'], suf:['ton','ham','ford','wick','bury','leigh','field','stead','minster','combe','worth','cester'] },
  norse:    { pre:['Hauk','Bjorn','Eyr','Sol','Ulf','Hval','Sig','Grim','Thor','Kald','Sand','Vad'], suf:['vik','stad','nes','by','fjord','heim','sey','holt','voll','dal','skog','strand'] },
  gaelic:   { pre:['Bally','Dun','Kil','Ros','Ard','Lis','Inis','Ach','Clon','Carrick','Glen','Magh'], suf:['more','glen','dara','kenny','carrig','shane','beg','dearg','ree','nal','ty','van'] },
  brezhon:  { pre:['Plou','Lan','Ker','Tre','Gwen','Pen','Roz','Loc','Bre','Mol','Penn','Ti'], suf:['gastel','meur','avel','dour','hir','goat','mab','nec','vihan','bras','guen','rys'] },
  iberian:  { pre:['Villa','Monte','Castro','Fuen','Sala','Torre','Vega','Val','Rio','Puente','Casa','Aldea'], suf:['nueva','mayor','frida','tes','manca','molinos','verde','real','vieja','clara','secas','luenga'] },
  basque:   { pre:['Etxa','Ur','Gorri','Mendi','Iri','Otsa','Zubi','Aitz','Larra','Bide','Eliz','Itsas'], suf:['barri','guren','eta','ondo','mendi','alde','bide','arte','aga','gorri','buru','pe'] },
  occitan:  { pre:['Mont','Castèl','Vila','Clar','Bèl','Val','Puèg','Sant','Ròc','Font','Aiga','Prat'], suf:['ac','an','enc','òlas','ièra','at','ona','et','òu','ier','argues','ans'] },
  andalusi: { pre:['Alcal','Medin','Benal','Alqas','Zahar','Almun','Qalat','Bir','Dar','Hisn'], suf:['ara','ejo','uz','ia','ena','ar','ola','aira','ute','hen'] },
  italian:  { pre:['Monte','Castel','Rocca','Borgo','Pieve','Torre','San','Casal','Villa','Ponte','Colle','Val'], suf:['bello','franco','vecchio','alto','fiore','sole','nuovo','grande','santo','longo','bosco','freddo'] },
  lombard:  { pre:['Monte','Castel','Rocca','Borgo','Pieve','Torre','San','Casal','Villa','Ponte','Colle','Val'], suf:['bello','franco','vecchio','alto','fiore','sole','nuovo','grande','santo','longo','bosco','freddo'] },
  greek:    { pre:['Neo','Palaio','Mono','Kalli','Petro','Stavro','Ano','Kato','Megalo','Xero'], suf:['polis','chora','kastro','vouni','pigi','limani','kambi','milo','pyrgo','spili'] },
  slavic:   { pre:['Novo','Staro','Bel','Cherni','Vysh','Dobro','Kamen','Zele','Bor','Svet','Mal','Veli'], suf:['grad','ovo','itsa','pole','gora','slav','nica','sk','vtsi','brod','dol','lice'] },
  rus:      { pre:['Novo','Staro','Belo','Cherno','Vysh','Dobro','Kamen','Zhele','Bor','Sviato','Malo','Veliko'], suf:['gorod','ovo','ichi','polye','gora','slavl','itsa','sk','vichi','brod','dol','ino'] },
  magyar:   { pre:['Nagy','Kis','Feher','Uj','Sar','Ko','Also','Felso','Szent','Piros','Hosszu','O'], suf:['falu','var','halom','hely','kert','fok','lak','domb','mezo','ret','csarda','hida'] },
  turkic:   { pre:['Kara','Ak','Sary','Tas','Kum','Bel','Boz','Kizil','Yeni','Eski','Ulu','Orta'], suf:['kent','bulak','tau','su','ordu','koy','tepe','kol','bazar','hisar','eli','oba'] },
  khazar:   { pre:['Kara','Ak','Sary','Tas','Atil','Bel','Boz','Kizil','Sarkel','Sam','Ulu','Orta'], suf:['kent','bulak','tau','su','ordu','koy','tepe','kol','bazar','hisar','el','oba'] },
  arabic:   { pre:['Qaryat ','Dayr ','Tell ','Ras ','Ain ','Bab ','Qalat ','Bir ','Dar ','Khan '], suf:['al-Nur','Hamra','Salam','Zaytun','Fajr','Karim','al-Bahr','Saffra','Ward','Saghir'] },
  syriac:   { pre:['Beth ','Dayr ','Tell ','Ain ','Qaryat ','Kafr ','Bar ','Mar ','Rish ','Tur '], suf:['Nahrin','Mardin','Shlama','Nisibin','Qardu','Abgar','Suryaya','Gawra','Zabda','Harran'] },
  berber:   { pre:['Tin','Agh','Taz','Sij','Ait ','Tam','Igh','Taf','Awr','Tisl'], suf:['mal','mat','ghir','ilma','oura','anet','nout','eft','walt','zit'] },
  persian:  { pre:['Now','Shahr','Deh','Gol','Mehr','Firuz','Ab','Qasr','Rostam','Gur'], suf:['abad','estan','rud','kuh','sar','gan','qand','var','maz','posht'] },
  armenian: { pre:['Arta','Vagharsh','Ashti','Noro','Garni','Oshak','Ara','Sis','Vana','Kars'], suf:['shat','apat','avan','aberd','adzor','akan','ert','kert','sar','van'] },
  georgian: { pre:['Akhal','Didi','Zeda','Vard','Bolni','Kvem','Sach','Ambrol','Tsager','On'], suf:['tsikhe','ubani','eti','isi','vari','naki','khevi','gora','didi','zkaro'] },
  baltic:   { pre:['Auk','Vil','Kern','Med','Siau','Pal','Nau','Sen','Roki','Skuod'], suf:['ava','uva','galis','onys','ute','ininkai','pole','rags','ninkai','laukis'] },
  finnic:   { pre:['Uusi','Vanha','Suur','Pieni','Kivi','Järvi','Koski','Metsä','Lahti','Saari'], suf:['la','lä','niemi','järvi','koski','mäki','joki','ranta','salo','vaara'] },
  sami:     { pre:['Áv','Báh','Čear','Guov','Joh','Leav','Luos','Máze','Ráis','Suol'], suf:['ži','čielgi','jávri','johka','oaivi','várri','vuotna','njárga','gáisá','vaggi'] },
  coptic:   { pre:['Dayr ','Kom ','Tell ','Minya ','Beni ','Ain ','Qasr ','Shubra ','Wadi ','Kafr '], suf:['Mina','Shenoute','Mariam','Pakhom','Makarios','Girgis','Bishoy','Damiana','Markos','Theodoros'] },
  nubian:   { pre:['Fara','Dong','Soba','Napa','Kerm','Atba','Mer','Abu','Wadi','Kass'], suf:['ola','ata','osha','ara','uba','eya','uri','gash','dab','rat'] }
};

FBDATA.religions = {
  christian: { name:'Christianity', assignable:false, icon:'✝',
    properties:{
      marriage:{
        spouseLimit:{ m:1, f:1 },
        divorce:{ kind:'annulment', direct:false, gold:15, piety:20,
          failurePiety:25, cooldownDays:360 },
        acceptedRelations:['same','in_fold']
      },
      rankTitles:{
        m:['Serf','Freeholder','Gentry','Baron','Count','Duke','King','Emperor'],
        f:['Serf','Freeholder','Gentlewoman','Baroness','Countess','Duchess','Queen','Empress']
      },
      words:{ deity:'God', cleric:'priest', temple:'church', landed:'Lord',
        partnership:'Commenda partnership' },
      roles:{ monasticM:'Monk', monasticF:'Nun', priestM:'Priest', priestF:'Priest',
        abbotM:'Abbot', abbotF:'Abbess' },
      clergyMarriage:false
    } },
  catholic: { name:'Latin Christianity', group:'christian',
    relationToParent:'schismatic', icon:'✝',
    properties:{
      systems:{ papacy:true },
      religiousPaths:{
        lay:'catholic_lay',
        professions:{ monk:'catholic_monastic', priest:'catholic_clerical' }
      },
      roles:{ bishop:'Bishop', cardinal:'Cardinal' },
      head:{
        officeId:'catholic', realm:'papacy', title:'Pope', holderSex:'m',
        recovery:'grant_seat', seat:'roma', restoredRank:3,
        sameFaithWar:'sacrilege',
        greatHolyWar:{
          name:'Crusade',
          minDate:{ year:1095, season:3, day:1 },
          firstTarget:'k_syria', firstByYear:1100,
          yearlyChance:0.25, crisisChance:0.75,
          crisisKingdoms:['k_armenia','k_anatolia'],
          crisisGroup:'muslim', crisisShare:0.25,
          sacredTargets:[
            { kingdom:'k_syria', counties:['jerusalem'] }
          ]
        }
      }
    } },
  orthodox: { name:'Greek Christianity', group:'christian',
    relationToParent:'schismatic', icon:'☦' },
  eastern: { name:'Eastern Christianity', group:'christian',
    relationToParent:'schismatic', icon:'☧' },
  muslim: { name:'Islam', assignable:false, icon:'☪',
    properties:{
      marriage:{
        spouseLimit:{ m:4, f:1 },
        divorce:{ kind:'talaq', direct:true, gold:'dowry', piety:0,
          prestige:0, cooldownDays:0 },
        acceptedRelations:['same','in_fold']
      },
      rankTitles:{
        m:['Fellah','Freeman','Sayyid','Sheikh','Emir','Grand Emir','Sultan','Great Sultan'],
        f:['Fellaha','Freewoman','Sayyida','Sheikha','Emira','Grand Emira','Sultana','Great Sultana']
      },
      words:{ deity:'Allah', cleric:'imam', temple:'mosque', landed:'Emir',
        partnership:'Qirad partnership' },
      roles:{ monasticM:'Scholar', monasticF:'Scholar', priestM:'Imam', priestF:'Imam',
        qadi:'Qadi', grandQadi:'Grand Qadi' },
      religiousPaths:{
        lay:'muslim_lay',
        professions:{ monk:'muslim_scholar', priest:'muslim_mosque' }
      },
      clergyMarriage:true
    } },
  sunni: { name:'Islam (Sunni)', group:'muslim',
    relationToParent:'schismatic', icon:'☪',
    properties:{
      head:{
        officeId:'sunni', realm:'abbasid', title:'Caliph', holderSex:'m', recovery:'claim',
        claimCounties:[['baghdad'],['mecca','medina']], sameFaithWar:'ordinary',
        greatHolyWar:{
          name:'Jihad',
          minDate:{ year:1105, season:0, day:1 },
          yearlyChance:0.35, lossGuaranteeYears:10,
          sacredTargets:[
            { kingdom:'k_syria', counties:['jerusalem'] },
            { kingdom:'k_iraq', counties:['baghdad'] },
            { kingdom:'k_arabia', counties:['mecca','medina'] }
          ]
        }
      }
    } },
  ashari: { name:'Ash’ari School', adjective:'Ash’ari', group:'sunni',
    relationToParent:'in_fold', icon:'☪' },
  maturidi: { name:'Maturidi School', adjective:'Maturidi', group:'sunni',
    relationToParent:'in_fold', icon:'☪' },
  shia: { name:'Islam (Shia)', group:'muslim',
    relationToParent:'schismatic', icon:'☪' },
  pagan: { name:'Paganism', assignable:false, icon:'☀',
    properties:{
      marriage:{
        spouseLimit:{ m:3, f:1 },
        divorce:{ kind:'sunder', direct:true, gold:0, piety:0,
          prestige:5, cooldownDays:0 },
        acceptedRelations:['same','in_fold']
      },
      rankTitles:{
        m:['Thrall','Karl','Huscarl','Hersir','Jarl','High Chief','King','High King'],
        f:['Thrall','Karl','Shieldmaiden','Lady','Jarl','High Chief','Queen','High Queen']
      },
      words:{ deity:'the gods', cleric:'godi', temple:'shrine', landed:'Chief',
        partnership:'Commenda partnership' },
      roles:{ monasticM:'Monk', monasticF:'Nun', priestM:'Godi', priestF:'Godi' },
      clergyMarriage:false
    } },
  norse_pagan: { name:'Norse Paganism', group:'pagan',
    relationToParent:'schismatic', icon:'ᚠ' },
  slavic_pagan: { name:'Slavic Paganism', group:'pagan',
    relationToParent:'schismatic', icon:'☀' },
  baltic_pagan: { name:'Baltic Paganism', group:'pagan',
    relationToParent:'schismatic', icon:'☽' },
  tengri: { name:'Tengrism', group:'pagan',
    relationToParent:'schismatic', icon:'⧙' },
  zoroastrian: { name:'Zoroastrianism', adjective:'Zoroastrian',
    collective:'Zoroastrians', icon:'🔥',
    properties:{
      marriage:{
        spouseLimit:{ m:1, f:1 },
        divorce:{ kind:'sunder', direct:true, gold:0, piety:15,
          prestige:5, cooldownDays:360 },
        acceptedRelations:['same','in_fold'],
        kinship:{ siblingRite:'xwedodah' }
      },
      rankTitles:{
        m:['Bondman','Freeman','Dehqan','Azat','Marzban','Satrap','Shah','Shahanshah'],
        f:['Bondwoman','Freewoman','Dehqan','Azat','Marzban','Satrap','Banbishn','Banbishnan Banbishn']
      },
      words:{ deity:'Ahura Mazda', cleric:'mobed', temple:'fire temple',
        landed:'Lord', partnership:'Trade partnership' },
      roles:{ monasticM:'Herbad', monasticF:'Herbad', priestM:'Mobed',
        priestF:'Mobed' },
      clergyMarriage:true
    } },
  jewish: { name:'Judaism', icon:'✡',
    properties:{
      marriage:{
        spouseLimit:{ m:1, f:1 },
        divorce:{ kind:'get', direct:true, gold:'dowry', piety:0,
          prestige:0, cooldownDays:0 },
        acceptedRelations:['same','in_fold']
      },
      rankTitles:{
        m:['Serf','Freeholder','Gentry','Elder','Bek','Great Bek','Khagan','Khagan'],
        f:['Serf','Freeholder','Gentlewoman','Elder','Begum','Great Begum','Khatun','Khatun']
      },
      words:{ deity:'the Lord', cleric:'rabbi', temple:'synagogue', landed:'Elder',
        partnership:'Trade partnership' },
      roles:{ monasticM:'Monk', monasticF:'Nun', priestM:'Rabbi', priestF:'Rabbi' },
      clergyMarriage:false
    } }
};
