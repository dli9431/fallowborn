Spring 476 bookmark: sources and editorial decisions

Colonate implementation record, 2026-10-06

The previously deferred colonus opening now uses a separate colonate system with Roman estate, Gallic Roman estate and African Roman estate duty packages. These are regional gameplay abstractions of land-bound cultivation, crop shares and rent accounts. A generated possessor represents the private estate independently of the county's public ruler. County conquest does not itself release a registered household or convey its fields. Cultivation and dwelling rights confer use, not ownership. Neither fictional household identities nor two annual dues claim a reconstructed estate register.

Codex Theodosianus 5.17.1 orders fugitive coloni returned to their original estate and addresses their capitation; 5.18 treats long prescription and descendants, and 5.19 restricts property disposal without the owner's knowledge. These support dependence, pursuit and the separation between lawful release and successful escape. The game's 55 percent flight chance, 360-day retry interval, health and Standing consequences, and household-wide coverage are editorial mechanics. A town provides no medieval year-and-a-day charter. Reference: https://droitromain.univ-grenoble-alpes.fr/Constitutiones/CTh05.html

Codex Theodosianus 16.2.32 restricts clerical admission for people under public or private obligations; 16.2.33 permits clerics associated with estates while retaining fiscal liabilities. The ordination route therefore requires the living possessor's consent and a local same-faith bishop. Its release of the playable household is an explicit negotiated game outcome, not a claim that ordination universally cancelled land attachment or tax obligations. Reference: https://droitromain.univ-grenoble-alpes.fr/Constitutiones/CTh16.html

Military release likewise represents a consented household agreement followed by ordinary soldier work, not a universal automatic exemption granted by enlistment. Martial, Learning, piety and Standing thresholds are game eligibility values. Paid charters and negotiated final service reuse the household freedom model with estate consent; their prices and family-share calculations are not attested Roman tariffs. The start grants no estate property, army command or episcopal office. All four colonate technology impact decisions are none because these are legal and social decisions; the soldier career retains its existing training gate. The earlier commoner-opening decision below records the original deferral, now superseded by this implementation request.

This note records the historical frame behind the 476 bookmark (data/bookmark_476.js) and the decisions later data authoring should follow. Like the 1066 note, the bookmark is an authored grand-strategy snapshot, not a claim that every border, office or population value can be reconstructed exactly. It closes the open questions listed in docs/plans/v2-476-phase-0/scenario.md and docs/plans/v2-476-phase-6.md (historical review gate).

Date: 2026-10-01. Status: research complete; owner decisions made 2026-10-01 (see OWNER DECISIONS).


CHOSEN INSTANT

Spring day 1, 476, on the game's 360-day calendar. Historical month dates are narrative anchors. At this instant:

- Romulus Augustulus is western emperor at Ravenna, installed by his father Orestes (magister militum and patrician) after Julius Nepos fled to Salona in August 475.
- Nepos holds Dalmatia from Salona and keeps his western imperial claim.
- Basiliscus holds Constantinople (since January 475); Zeno is a displaced claimant in Isauria. Zeno re-enters Constantinople in August 476.
- Odoacer is a leading officer among the soldiers in Italy; his acclamation as king (23 August 476) and Orestes' death at Placentia (28 August 476) have not happened.
- Gaiseric rules the Vandal kingdom (he dies in January 477; Huneric succeeds).
- Euric rules the Visigoths from Toulouse; the Code of Euric is usually dated to about 476.
- Childeric rules the Salian Franks from Tournai; Syagrius holds the Roman domain in northern Gaul from Soissons.
- The consuls of 476 are both eastern (Basiliscus, second consulship, and Armatus); the west names no consul.

Sources: Anonymus Valesianus, latter part 36-38 (https://penelope.uchicago.edu/thayer/e/roman/texts/excerpta_valesiana/2*.html); Procopius, Wars V.1 (https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Procopius/Wars/5A*.html); Hugh Elton, Zeno (https://roman-emperors.sites.luc.edu/zeno.htm); Ralph Mathisen, Julius Nepos (https://roman-emperors.sites.luc.edu/nepos.htm); J. R. Martindale, The Prosopography of the Later Roman Empire, vol. II (395-527), Cambridge 1980 (PLRE II), the standard reference for the cast below.


RESOLVED OPEN QUESTIONS

1. Burgundian partition and Gundobad's position.

Decision: at spring 476 the senior Burgundian king is Chilperic I, brother of the late Gundioc (died about 473), who reigns until about 480. Gundioc's son Gundobad co-rules as a junior king; he had been magister militum and patrician in Italy (472-474) and returned to Burgundy about 474. Gundioc's other sons Godegisel, Chilperic II and Godomar appear in later tradition as sub-kings (often placed at Geneva, Valence and Vienne); recent scholarship doubts that Chilperic II and Godomar outlived 476/477. Use one Burgundian realm ruled by Chilperic I at Lyon, with Gundobad as a living heir and co-ruler holding a court at Vienne, and Godegisel at Geneva. Do not author four simultaneous kingdoms.

Consequence for data: the current realm names Gundobad as sole ruler. Replace with Chilperic I as ruler and Gundobad as heir/co-ruler; Chilperic I's death around 480 can be an ordinary mortality outcome rather than a scripted date.

Sources: Ian Wood, The Merovingian Kingdoms 450-751 (1994), ch. 4; Justin Favrod, Histoire politique du royaume burgonde (1997); summary of the debate at https://en.wikipedia.org/wiki/Chilperic_I_of_Burgundy.

2. Gothic offices and the two Theoderics.

Decision: keep the two leaders separate.

- Theoderic Strabo (son of Triarius) leads the Thracian Goths settled in Thrace. Leo I had made him magister militum; Basiliscus, whom he helped to power, confirmed him as magister militum praesentalis. In spring 476 he is the eastern regime's Gothic ally.
- Theoderic the Amal (son of Thiudimir, leader since about 474) leads the Pannonian Goths, who left Pannonia in 473 and in spring 476 are settled in Macedonia (Jordanes, Getica 285-288, names Cyrrhus, Pella, Europus, Methone, Pydna, Beroea and Dium). After Zeno's return he is made magister militum praesentalis and patrician, and his people move to Moesia around Novae.

Consequence for data: the current data places Theoderic the Amal's confederation in Pannonia with its capital at the szekesfehervar county. In spring 476 the Amal Goths belong in Macedonia, as a federate polity inside the eastern sphere (around the thessaloniki and serres counties) with no hereditary county ownership. Strabo's Goths belong in Thrace (adrianople and philippopolis counties) as a second federate polity. Pannonia should not be an Ostrogothic realm; see composite actors for its 476 occupants.

Sources: Jordanes, Getica 270-288; Malchus fragments (in R. C. Blockley, The Fragmentary Classicising Historians, vol. II, 1983); Peter Heather, Goths and Romans 332-489 (1991), ch. 7-8; https://en.wikipedia.org/wiki/Theodoric_Strabo.

3. Zeno's displaced court.

Decision: Zeno withdrew from Constantinople in January 475 to his Isaurian homeland. Basiliscus sent the Isaurian brothers Illus and Trocundes against him; they defeated him in 476 and besieged him on a fortified hill locally called "Constantinople", then changed sides and marched with him on the capital (August 476). Represent Zeno as a living claimant with a court site in Isauria inside the ikonion county (the retained Anatolian county nearest Isauria), with a small household host and no county ownership. Illus and Trocundes are living characters attached to the eastern court, available to the Zeno story as the commanders whose defection makes his return possible.

Sources: Elton, Zeno (above); Candidus and Malchus fragments (Blockley); https://en.wikipedia.org/wiki/Flavius_Appalius_Illus_Trocundes.

4. Detachment commission terminology.

Decision: label the player's scoped command of a single unit "tribune" (tribunus), the ordinary late Roman title for the commander of a regiment (numerus). The federate soldiers in Italy (Heruli, Sciri, Turcilingi and Rugi, per Jordanes, Getica 242, and the Anonymus Valesianus) served under their own leaders inside Roman command structures; "tribune" is a reasonable abstraction for a commission issued by the army's recognized commander, and is labeled as such in the design doc. Odoacer holds no attested formal office at the spring start; display him as leader of the federate soldiers until acclamation.

Sources: A. H. M. Jones, The Later Roman Empire 284-602 (1964), ch. 17; Notitia Dignitatum (ed. Seeck, 1876).

5. Composite actors.

- Suevi (Gallaecia): Hydatius' chronicle, the main source, ends in 469; the last securely attested king is Remismund. Keep a generated Suevic king, labeled as generated, ruling from the Bracara or Lucus Augusti area; do not name Remismund as alive in 476.
- Armorica: Riothamus led Britons in Gaul about 469-470 (Jordanes, Getica 237-238; Sidonius, Ep. 3.9) and is not securely attested later. Keep a generated Armorican leader.
- Moorish kingdoms: the Arris inscription names Masties as dux and imperator in the Aures, but its date is disputed (estimates range from the 470s to about 516). Keep a generated Moorish ruler in the Aures and western Mauretania; Masties may be used only with an explicit "date uncertain" label.
- Rhenish Franks: no secure ruler is attested before Sigibert of Cologne (active about 507). Keep a generated chieftain at Colonia Agrippina.
- Pannonia: after the Goths left in 473, the region was contested by Gepids (who held Sirmium), Rugi north of the Danube and remnants of Roman communities. Keep a generated Gepid ruler at Sirmium.
- Noricum: Roman communities under Rugian pressure, with Severinus of Noricum active at Favianis until his death in 482 (Eugippius, Life of Severinus). Represent Noricum Ripense as Roman civic communities nominally under Italy, and the Rugian king Feletheus (Feva) north of the Danube if the map reaches that far.

Every generated ruler is labeled as generated in the data and design doc; no invented person receives a historical attestation.


PERIOD DATA

Title hierarchy

The late Roman administration had prefectures, dioceses and provinces. In 476 it still functions in Italy, Dalmatia and the East, but not in the barbarian kingdoms, whose kings rule by force, treaty and settlement.

Recommendation: author a Roman hierarchy only where Roman administration functions, and no hierarchy elsewhere (customary right answers claims there). Levels: province (county group), diocese, prefecture. Proposed Italian grouping using existing county ids (approximate; county cells are gameplay regions):

- Prefecture of Italy, diocese of Italia Annonaria: Liguria (milano, pavia, torino, genoa, aosta), Aemilia (parma, modena, bologna), Venetia et Histria (verona, brescia, padova, aquileia, friuli, venezia, trento), Flaminia et Picenum (ravenna, ancona), Raetia (augsburg, konstanz, zurich and the Alpine counties the map assigns).
- Diocese of Italia Suburbicaria: Tuscia et Umbria (firenze, pisa, lucca, siena, perugia, spoleto, viterbo), Campania (roma under the urban prefect, capua, salerno), Samnium (benevento), Apulia et Calabria (bari, foggia, taranto, brindisi), Lucania et Bruttii (cosenza, reggio), Sicilia (palermo, messina, siracusa), Sardinia (cagliari, sassari), Corsica (ajaccio).
- Dalmatia (split, zadar, knin, kotor and the inland counties) under Nepos, as a separate province attached to Italy in name.
- The East keeps its dioceses of Thrace, Macedonia, Dacia, Asiana and Pontica over the retained Balkan and Anatolian counties.

Sources: Notitia Dignitatum; Jones, Later Roman Empire, Appendix III (provinces and dioceses).

Ladder and stations

Lay ladder (low to high), with the engine's eight bands suggested in brackets:
0 colonus (tenant legally tied to the land under the colonate)
1 free commoner (plebeian, soldier, free tenant)
2 possessor (small landowner, veteran, guild member)
3 curialis or decurion (hereditary town councillor; liable for local taxes)
4 comes or senator of clarissimus rank (provincial governor, regimental or court office)
5 dux or magister militum (provincial or field-army command); senators of spectabilis and illustris rank
6 patrician or king (patricius, rex)
7 augustus (emperor)

The 476 rank titles currently on the faiths (Dependent, Free Citizen, Notable, Estate Holder, Comes, Dux, Rex, Augustus) fit this scale. Recommended refinements: "Colonus" for band 0, "Possessor" for band 2 and "Curialis" for band 3. Status was also legal: honestiores (higher-status persons) and humiliores (lower-status persons) faced different penalties.

Church ladder: lector, subdeacon, deacon, presbyter, bishop, metropolitan bishop, patriarch. Monastic: monk, abbot (hegumen). The bishop of Rome is a patriarchal see with special standing in the west, not the medieval papacy.

Sources: Jones, Later Roman Empire, ch. 12 (senatorial grades), ch. 19 (cities and curiales), ch. 20 (coloni), ch. 22 (clergy); Codex Theodosianus 12.1 (decurions) and 5.17-19 (coloni).

Offices

Offices to author, each with what it held:

- magister militum (praesentalis, per Gallias, per Illyricum, per Thracias, per Orientem): field army command (Ban); no civil jurisdiction.
- patricius: the highest honor, often held with the senior military command; carries legitimacy, not powers by itself.
- consul: an annual honor with ceremonial and naming significance; no powers.
- praetorian prefect of Italy: civil administration, taxation and justice (Revenue, Peace) across the prefecture.
- urban prefect of Rome: city government and courts of Rome (Peace, Consent through the senate).
- vicarius, and provincial governors (consularis, corrector, praeses): provincial justice and taxation.
- comes rei militaris and dux: regional military commands.
- tribune: command of one regiment (the player's commission).
- defensor civitatis: a town's protector of humbler citizens (Peace, local).
- comes sacrarum largitionum and comes rei privatae: treasury offices.

Sources: Notitia Dignitatum; Jones, Later Roman Empire, ch. 11-17.

Legal traditions

- Roman law for Roman provincials everywhere: the Codex Theodosianus (438) and later Novels; episcopal courts (episcopalis audientia) settled civil disputes by consent.
- Visigoths: the Code of Euric (about 476) for Goths in Euric's kingdom; Roman law continued for Romans (later the Breviary of Alaric, 506).
- Burgundians: custom in 476; codified only later (Liber Constitutionum, about 500-517).
- Vandals: Vandal custom for Vandals; Roman law for provincials, under an Arian royal church that could act against Nicene clergy.
- Franks: custom; the Salic law is later (about 507-511).

Penalties attested in Roman law of the period include fines, confiscation, exile (relegatio and deportatio), labor in mines, death and custody pending trial, with harsher forms for humiliores. Deposition by blinding is a later Byzantine practice and should not be available in the 476 tradition. Church penance applies to clergy and the faithful. Dual jurisdiction: in mixed cases between Goths and Romans, Gothic counts or royal officials typically heard the case, sometimes with a Roman legal assessor.

Sources: Jill Harries, Law and Empire in Late Antiquity (1999); P. D. King, "The barbarian kingdoms", in The Cambridge History of Medieval Political Thought (1988).

Religious institutions

Provincial council and public profession authoring

The Council of Agde in 506 supplies a later late antique example of Nicene bishops gathering with a Homoian ruler's permission, rather than requiring the king's conversion first. The provincial council mechanic abstracts that possibility; its participant minimum, fee, support reward and cooldown are game rules, and it does not reenact Agde in 476. Sources: https://presbytersproject.ihuw.pl/index.php?SourceID=900&id=6 and https://www.newadvent.org/cathen/03135b.htm.

Gregory of Tours, History of the Franks II.28-31, associates royal conversion with a spouse, a bishop and resistance among followers. His later narrative is evidence for those relationships, not a compulsory simulation outcome. The chronology remains debated: Danuta Shanzer's 1998 study re-examines Avitus's contemporary letter and argues for a later date than the traditional 496. The simulation therefore offers a generic contingent decision and no forced baptism date. Sources: https://sourcebooks.fordham.edu/source/gregory-clovisconv.asp and https://onlinelibrary.wiley.com/doi/abs/10.1111/1468-0254.00017.

- Rome: Pope Simplicius (468-483).
- Constantinople: Patriarch Acacius (472-489).
- Alexandria: Timothy Aelurus (miaphysite, restored by Basiliscus 475, died 477).
- Antioch: Peter the Fuller (miaphysite, restored by Basiliscus 476).
- Jerusalem: Anastasius (458-478).
- Ravenna: Bishop Exuperantius (473-477).
- Salona: Glycerius, the former western emperor, forcibly consecrated bishop of Salona by Nepos in 474.
- Carthage: the Nicene see has been vacant since the death of Deogratias (late 457 or early 458) under Vandal restrictions; Eugenius is elected only in 480/481.

Basiliscus' Encyclical (475) condemned the Council of Chalcedon and provoked opposition in Constantinople led by Acacius and the monks; he retracted it shortly before his fall. This is the live Chalcedonian and miaphysite dispute the 476 faith data represents. Alexandria and Antioch lie off-map; their patriarchs can act through off-map recognition only.

Sources: https://en.wikipedia.org/wiki/Pope_Simplicius; https://en.wikipedia.org/wiki/Acacius_of_Constantinople; https://en.wikipedia.org/wiki/Timothy_II_of_Alexandria; https://en.wikipedia.org/wiki/Peter_the_Fuller; https://en.wikipedia.org/wiki/Exuperantius; https://en.wikipedia.org/wiki/Glycerius; https://en.wikipedia.org/wiki/Eugenius_of_Carthage; W. H. C. Frend, The Rise of the Monophysite Movement (1972).

Currency

Gold solidus (72 to the Roman pound), with the tremissis (a third of a solidus); silver siliqua; bronze nummus. The Vandals issued their own silver and bronze. Recommended display: "solidi" with a gold-coin icon; internal gold value unchanged.

Source: Philip Grierson and Mark Blackburn, Medieval European Coinage, vol. 1 (1986).

Architecture (settlement emblems)

Basilica churches and baptisteries (Ravenna's cathedral and Orthodox Baptistery are fifth-century), city walls (Rome's Aurelian Walls, Constantinople's Theodosian Walls), villas and estate centers, fortified hilltops and military camps (castra). No castles or keeps: the engine's keep building should display as a fortified residence (praetorium). Mediterranean palettes: brick and stone, terracotta roofs, domes rare outside the East.

Dress (wardrobe)

Tunic and long-sleeved dalmatic for most people; the chlamys cloak fastened with a crossbow brooch (fibula) and an official belt (cingulum) mark office; the purple paludamentum and a pearl diadem mark the emperor; the consular trabea for consuls; soldiers wear trousers, tunic, cloak and the military belt, and Roman and federate gear look much alike; clergy wear everyday dress with the pallium for bishops (distinct liturgical vestments are later). References: the Missorium of Theodosius (388), consular ivory diptychs (for example Probus 406, Boethius 487), the Notitia Dignitatum insignia, and the Ravenna mosaics (later, used with care).

Emblems (instead of heraldry)

Heraldry does not exist before the twelfth century. Use period emblems: the chi-rho and labarum for the imperial courts; the shield patterns of Roman regiments as shown in the Notitia Dignitatum for units and Roman houses; royal monograms (as on Vandal and Gothic coins) for barbarian kings.

Names (fifth-century pools)

- Roman: Flavius as a status name; Aurelius, Julius, Valerius, Anicius, Decius, Symmachus, Boethius, Faustus, Venantius, Opilio, Severinus, Felix, Paulinus, Avitus, Ennodius; women: Galla, Placidia, Anicia, Proba, Juliana, Faltonia, Rusticiana.
- Ostrogothic: Theoderic, Thiudimir, Valamir, Vidimer, Triarius, Amalafrida, Ostrogotho, Thiudigotho, Erelieva.
- Visigothic: Euric, Alaric, Theoderic, Thorismund, Gesalic, Amalaric, Ragnahild.
- Vandal: Gaiseric, Huneric, Gento, Gunthamund, Thrasamund, Hilderic, Gelimer, Hoageis.
- Burgundian: Gundioc, Chilperic, Gundobad, Godegisel, Godomar, Sigismund, Caretene, Chrona, Clotilde.
- Frankish (Merovingian): Childeric, Clovis, Basina, Audofleda, Ragnachar, Chararic, Sigibert, Lanthechild.
- Suevic: Rechiar, Remismund, Frumar, Maldras.
- Greek (East): Zeno, Basiliscus, Illus, Trocundes, Armatus, Leontius, Marcian, Verina, Ariadne, Zenonis.

The current gothic culture list mixes Ostrogothic, Visigothic and Burgundian names; split it into group-specific pools or tag names by group.

Source: PLRE II.

Climate

The fifth century follows the end of the Roman Climate Optimum and precedes the Late Antique Little Ice Age (from 536). Recommendation: adopt regional zones. Mediterranean (Italy south of the Po, Provence, the Dalmatian and Greek coasts, eastern and southern Iberia, the African coast, western Anatolia): mild wet winters, dry summers, reduced winter attrition. Temperate (Po valley, northern Gaul, the Rhine and Danube, Pannonia): today's behavior. Continental (the Anatolian plateau): cold winters. Arid (Saharan margins, Tripolitania inland): no winter, a hot dry season.

Sources: Michael McCormick et al., "Climate Change during and after the Roman Empire", Journal of Interdisciplinary History 43 (2012); Ulf Büntgen et al., "Cooling and societal change during the Late Antique Little Ice Age", Nature Geoscience 9 (2016).

Ailments

No period ailment entries are needed for 476. The Plague of Justinian (from 541) and the volcanic cold of 536 matter only if a campaign runs that long; author them then as dated data.

Eastern depth

Full depth: Constantinople and the eastern court (cast, offices, patriarchate, Zeno's displaced court), as the 476.md slice requires eastern imperial diplomacy where the map permits. Regional depth: the Balkan counties (Thrace, Macedonia, the Illyrian provinces) and the retained central and western Anatolian counties (nicaea, dorylaion, ancyra, amorion, sardis, attaleia, ikonion, caesarea, sebasteia). Off-map pressure only: Syria, Egypt, Armenia and Persia; Antioch and Alexandria act through recognition and events, not counties. Isauria sits inside the ikonion county area for Zeno's court.


PLACE NAMES FOR 476

Period names for existing county ids in the slice (county cells are gameplay regions; where no period town stood at the modern seat, the nearest attested place or a regional name is used). Entries marked "verify" need a final check against the Barrington Atlas or Pleiades before authoring.

Italy and the Alps: torino Augusta Taurinorum; aosta Augusta Praetoria; genoa Genua; milano Mediolanum; pavia Ticinum; brescia Brixia; verona Verona; trento Tridentum; padova Patavium; venezia Altinum (no Venice yet); aquileia Aquileia; friuli Forum Iulii; parma Parma; modena Mutina; bologna Bononia; ravenna Ravenna (with Classis); firenze Florentia; pisa Pisae; siena Saena Iulia; lucca Luca; spoleto Spoletium; perugia Perusia; ancona Ancona; roma Roma (with Ostia and Portus); viterbo Volsinii (verify); benevento Beneventum; capua Capua; salerno Salernum; bari Barium; foggia Luceria (verify); taranto Tarentum; brindisi Brundisium; reggio Rhegium; cosenza Consentia; palermo Panormus; messina Messana; siracusa Syracusae; cagliari Carales; sassari Turris Libisonis; ajaccio Corsica (Aleria is the island's Roman center; verify); salzburg Iuvavum; linz Lentia; wien Vindobona; klagenfurt Virunum; graz Flavia Solva; augsburg Augusta Vindelicum; konstanz Constantia; zurich Turicum; basel Basilia; geneva Genava; besancon Vesontio; nice Cemenelum.

Gaul: bordeaux Burdigala; agen Aginnum; perigueux Vesunna; poitiers Pictavi; angouleme Iculisma; limoges Augustoritum; toulouse Tolosa; albi Albiga; cahors Divona; rodez Segodunum; clermont Arverni; le_puy Ruessio (verify); bayonne Lapurdum; auch Augusta Auscorum; narbonne Narbo; beziers Baeterrae; carcassonne Carcaso; lyon Lugdunum; macon Matisco; vienne Vienna; arles Arelate; marseille Massilia; avignon Avennio; chambery Lemincum; grenoble Gratianopolis; dijon Divio; auxerre Autessiodurum; paris Parisii (Lutetia); chartres Carnutes; sens Senones; orleans Aurelianum; rouen Rotomagus; bayeux Augustodurum; evreux Mediolanum Aulercorum; angers Andecavi; tours Turones; le_mans Cenomani; bourges Bituriges; reims Durocortorum; troyes Tricasses; chalons Durocatalaunum; amiens Ambiani; st_quentin Augusta Viromanduorum; laon Augusta Suessionum (Soissons, see corrections); boulogne Gesoriacum; arras Atrebates; rennes Condate; nantes Condevincum; vannes Darioritum; metz Divodurum; verdun Virodunum; nancy Tullum (verify); strasbourg Argentoratum; trier Augusta Treverorum; aachen Aquae Granni; cologne Colonia Agrippina; mainz Mogontiacum; worms Borbetomagus; koblenz Confluentes.

Iberia: barcelona Barcino; tarragona Tarraco; lerida Ilerda; tortosa Dertosa; zaragoza Caesaraugusta; huesca Osca; pamplona Pompaelo; valencia Valentia; murcia Carthago Nova; toledo Toletum; merida Emerita Augusta; sevilla Hispalis; cordoba Corduba; granada Iliberris; malaga Malaca; almeria Urci (verify); lisboa Olisipo; coimbra Conimbriga; leon Legio; astorga Asturica Augusta; lugo Lucus Augusti; coruna Brigantium; santiago Iria Flavia; mallorca Maiorica.

Balkans and Anatolia: sirmium Sirmium; osijek Mursa; szekesfehervar Gorsium (verify); zagreb Andautonia; sisak Siscia; zadar Iader; knin Burnum; split Salona (with Spalatum); kotor Acruvium; dyrrachion Dyrrachium; ohrid Lychnidus; skopje Scupi; serdica Serdica; philippopolis Philippopolis; vidin Bononia; silistra Durostorum; pliska Marcianopolis area (Abritus is already used; verify); thessaloniki Thessalonica; serres Serrhae; larissa Larissa; ioannina Nicopolis (Epirus; verify); adrianople Hadrianopolis; constantinople Constantinopolis; nicaea Nicaea; dorylaion Dorylaeum; ancyra Ancyra; amorion Amorium; sardis Sardis; attaleia Attalea; ikonion Iconium; caesarea Caesarea; sebasteia Sebastea.

Africa: tunis Carthago; kairouan Byzacena (with Hadrumetum on the coast and Sufetula inland); tripoli Oea; sirte Lepcis Magna area (verify); constantine Cirta (with Hippo Regius toward the coast); algiers Icosium; oran Portus Magnus (verify); tlemcen Pomaria; tahert Mauretanian highlands; fes Volubilis; tangier Tingis.

Sources: Richard J. A. Talbert (ed.), Barrington Atlas of the Greek and Roman World (2000); Pleiades gazetteer (https://pleiades.stoa.org).


CORRECTIONS TO THE CURRENT 476 DATA

Findings from this research that the 476 map and cast should apply when they are re-authored. None is applied by this note.

- Ostrogoths: the Amal confederation belongs in Macedonia in spring 476, not in Pannonia; Strabo's Thracian Goths are a separate polity in Thrace (question 2).
- Burgundians: Chilperic I is the senior king; Gundobad co-rules (question 1).
- Syagrius: his seat is Soissons (Augusta Suessionum), which lies in the laon county area, not Paris.
- Childeric: his seat is Tournai, between the arras and ghent counties; place a Tournai site in whichever county cell contains it.
- Arles and Marseille: the chronology is disputed. Some sources place Euric's capture in about 473, others in 476, and a treaty of about 477 confirmed Provence south of the Durance to the Visigoths. Recommendation: at spring 476 Arles and Marseille are under Visigothic control or contest, not Burgundian. The current data gives them to the Burgundian realm.
- Sicily: Vandal-controlled at spring 476; Gaiseric ceded most of it to Odoacer for tribute in autumn 476. Syracuse should not be eastern.
- Balearics, Sardinia and Corsica: Vandal-held. The mallorca county should be Vandal; Sardinia and Corsica should be checked against current ownership.
- Hispania: by 476 Euric holds most of Hispania (Tarraconensis was taken about 472-476); the Suevi are confined to Gallaecia.
- Theoderic the Amal is a federate leader in the eastern sphere, not a sovereign with hereditary counties.


OWNER DECISIONS (MADE 2026-10-01)

Slice boundary. Decision: keep the current map breadth but tier its depth. Full depth (named cast, institutions, rights, events) for Italy, Dalmatia, southern Gaul and Vandal Africa, which is the 476.md slice. Regional depth (researched rulers, communities, settlements, fewer institutions) for northern Gaul, the Rhine, Armorica, Iberia, the Balkans and Anatolia. Keep Britain, Scandinavia, the steppe and the Near East uninhabited, with off-map pressure only. Trimming the map would discard already-authored regions and the Clovis and Visigothic history without making the core slice better. Regional-depth areas are brought to full depth in a later content update; the uninhabited areas stay empty at release.

Commoner opening. Decision: keep the federate soldier as the primary start (already built and tested), add a curialis start as the second (the civic clerk route already exists and the curial class gives the civic chain a protagonist), and defer a colonus start to a later content update together with a colonate tenure (land-bound tenancy under Roman law), since it needs serf-like tenure mechanics that the late antique era otherwise does not enable.


DELIBERATE SIMPLIFICATIONS

- County cells are nearest-seed gameplay regions, not late Roman provinces or civitas territories.
- Federate polities without hereditary land are represented as nonterritorial realms with hosts, not as fabricated counties.
- Generated characters fill offices and courts where sources name no one; they are labeled as generated.
- Birth years of well-attested figures use the historical year; uncertain dates are rounded. Martial and other skills are gameplay characterizations, not source claims.
- Population shares are relative community weights, not demographic estimates.


MAP AUTHORING RECORD (2026-10-05)

The 476 snapshot is now composed from independent regional declarations on europe_regional. Ownership corrections applied: mainland southern Italy is western, Sicily and the western islands are Vandal, Arles and Marseille are Visigothic, and the Amal body is a nonterritorial host in Macedonia rather than a Pannonian landowner. Strabo has a separate nonterritorial Thracian body. Pannonian cells use a generated Gepid court at Sirmium, while the Norican cells remain nominally western and Feletheus represents Rugian pressure in the wien cell. These cells are territorial approximations, not a reconstruction of exact fifth-century borders.

Syagrius's seat and the later Frankish objective are Soissons in the laon cell. Childeric's seat is the Tournai site in ghent. Chilperic I sits at Lyon; Gundobad is the living co-ruler and designated heir at Vienne, and Godegisel is at Geneva. Suevic, Armorican, Moorish, Rhenish and Gepid ruler profiles are explicitly generated and use the seeded period culture name pools rather than fixed delegate names. Zeno's home and displaced-court record point to an approximate Isaurian site in ikonion; no claim is made that it identifies his siege fortress.

Roman province, diocese and prefecture groups replace the copied medieval tables in the Italian, Dalmatian and eastern cells. Other realms retain no hierarchy, with customary right as the existing legal fallback. Dalmatia's intermediate group is a gameplay container, not a historical diocesan claim. Mediterranean, temperate, continental and arid assignments are scoped to the bookmark; medieval starts retain their climate behavior. Names marked verify above remain unresolved identifications: the authored map uses regional labels for the Apulian interior, Pannonian interior, Corsica and Tripolitanian coast instead of asserting those uncertain site matches.

Soissons location and period name reference: https://pleiades.stoa.org/places/108772 (representative point 49.380839, 3.3258515). Tournai name reference: the Tabula Peutingeriana research record at https://www1.ku.de/ggf/ag/tabula_peutingeriana/trefferanzeige_es.php?id=3020, linked to Pleiades 109398. The new Tournai and Isaurian coordinates are approximate map anchors. The shared layout now owns all period settlement presentations, including the distinct sites named in the settlement discussion.

Administrative seat checks distinguish Hadrianopolis in Haemimontus, Philippopolis in Thracia and Scupi in Dardania. References: https://www.corpus-nummorum.eu/en/typology/13 (Hadrianopolis research catalogue); https://publications.naim.bg/index.php/BNAI/issue/download/36/30 (Roman and Late Antique Thrace, original archaeological research); https://cts.perseids.org/read/latinLit/stoa0149b/stoa002/opp-lat1/2.2.2.5.2-2.2.5.1.1 (council subscription naming Scupi in Dardania).


African regional authoring, 5 October 2026

Gaiseric remains the spring ruler. Procopius, Wars III.5 and III.7-8, describes privileged Vandal estates, the agreement with Zeno, Huneric's succession, and later Moorish warfare. The regional model represents estate privilege through discriminatory taxation and a separate Vandal legal identity; Roman defendants retain Roman personal law. These are bounded institutional abstractions, not literal confiscation of the household's property. The opening aggression is restrained; the later eastern campaign still requires surviving courts and an ordinary war. Source: https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Procopius/Wars/3B%2A.html and https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Procopius/Wars/3C%2A.html.

The Arris and Altava inscriptions support distinct Moorish and Roman political traditions. Their chronology does not securely identify a spring 476 ruler. Masuna is attested at Altava in 508; Masties's dates remain disputed. The opening therefore uses generated rulers for an Aures court, a western Mauro-Roman court anchored near Altava, and Tingitanian communities. Their Christian and traditional populations are mixed; Moorish culture does not imply universal paganism. Boundaries, opening faith shares, skills, dates of birth and development are simulation choices. The constantine cell includes Cirta and Hippo Regius as physical sites but stands for a much broader Numidian interior: its single ownership cannot reconstruct the Vandal coast and independent Aures separately. Tingitana is especially schematic. Sources: https://www.persee.fr/doc/antaf_0066-4871_1988_num_24_1_1149 and https://www.persee.fr/doc/crai_0065-0536_1944_num_88_1_77712.

Carthage's Nicene see remains vacant after Deogratias; Eugenius belongs to 480/481 rather than the opening. A separate generated Homoian representative serves the royal congregation. Sufetula, Hippo Regius and Altava have bounded civic representations, and Altava has a generated Nicene representative; these are institutional gameplay actors, not named attested holders in 476. The static vacancy records the restricted opening see but does not automatically stage a later election or Huneric's persecution. Source for the Carthage vacancy, election and subsequent exile: https://www.newadvent.org/cathen/05602c.htm.

Retained county ids remain spatial anchors. Africa's own dated names and site layouts present Carthage, Sufetula, Hadrumetum, Cirta, Hippo Regius, Pomaria, Altava, Icosium, Volubilis, Tingis, Oea and Lepcis Magna. Kairouan and Fez are not presented as fifth-century cities. Existing curated heads retain their slot positions; additions follow them. The Syracuse-Carthage open-water connection remains a gameplay route rather than a guarantee of expedition success. Its campaign targets the current sovereign, including a Moorish court that has acquired Carthage.

Named royal relatives remain a separate authoring limitation. The current realm profile does not accept a named heir or family; generated succession cannot establish Huneric as Gaiseric's adult son or reproduce agnatic seniority. The region leaves that behavior explicit rather than supplying ignored fields or a dated ruler replacement. Its court needs a generic family-data boundary before the researched Vandal succession can be fully authored.

DALMATIA AND EAST AUTHORING RECORD (2026-10-05)

The spring cast remains Nepos at Salona, Basiliscus at Constantinople and the displaced Zeno with Illus and Trocundes in the approximate Isaurian court anchor. The Amal and Thracian Gothic bodies remain distinct nonterritorial hosts under their own leaders, with service contracts rather than inherited Balkan counties. The existing return and Italian campaign opportunities continue to require living actors and actual political or military transactions. Research references: Hugh Elton, Zeno, https://roman-emperors.sites.luc.edu/zeno.htm; Ralph Mathisen, Julius Nepos, https://roman-emperors.sites.luc.edu/nepos.htm.

Salona's council and Glycerius's see and Constantinople's senate and Acacius's patriarchate now belong to the regional declaration. Glycerius's transition from imperial office to the Salona bishopric and Basiliscus's anti-Chalcedonian encyclical supply the historical background for copied petitions, church appeals and the early encyclical dispute. The events do not determine a living incumbent's allegiance or force a religious settlement. References: Mathisen, Julius Nepos, above; Hugh Elton, Basiliscus, https://roman-emperors.sites.luc.edu/basilis.htm. Additional sees at Thessalonica, Dyrrachium, Serdica, Nicaea, Ephesus and Caesarea use generated incumbents; no claim is made to the names or exact ages of their spring-476 officeholders.

The forty existing regional cells now carry authored settlement presentations and county names dated 400-649. Dalmatian labels include Acruvium, Burnum, Salona, Iader, Andautonia and Siscia. Balkan labels include Mursa, Sirmium, Hadrianopolis, Thessalonica, Serrhae, Durostorum, Bononia, Serdica, Scupi and Lychnidus. The retained Anatolian cells use their late antique city names, with separate Iconium and Isaurian-court sites. Physical points are approximate anchors for the existing grid, not surveyed county boundaries. Pannonian interior, Upper Pannonia and Epirus interior deliberately avoid the unresolved Gorsium, northern Pannonian and Nicopolis identifications. The existing Abritus anchor is retained for pliska; this does not resolve the earlier Marcianopolis-area question.

Andautonia is the Roman settlement near modern Scitarjevo, south of Zagreb, rather than a fifth-century city named Zagreb. Pleiades index reference: https://pleiades.stoa.org/indexes-old/settlement?b_start:int=1220, linking the place record https://pleiades.stoa.org/places/197113. Other place labels follow the earlier Barrington Atlas and Pleiades recommendations above. The small Andautonia and Burnum presentations and relative development assignments are conservative gameplay scales, not claims of measured fifth-century settlement populations or continuous urban prosperity. Abritus development is reduced; Siscia is weighted above the Zagreb-area anchor.

Community authoring distinguishes the Latin Roman interior and lower Danube from Greek coastal and southern communities. Dyrrachium, Lychnidus and the Epirus interior use Greek/Roman partitions; Abritus, Durostorum, Bononia, Serdica and Scupi use Roman/Greek partitions. Gothic Homoian communities around Macedonia and Thrace accompany the two host areas without transferring county control. Selected Anatolian counties have a Miaphysite minority alongside their Chalcedonian principal community. These distributions and shares are editorial abstractions guided by the regional religious and language frame above, not census estimates. Eastern court profession and local population faith remain separate.

Persian requests for contributions toward the Caucasian defenses provide off-map diplomatic pressure. The Sasanian dynasty reference describes Peroz seeking such subsidies from the Roman government; the Balash entry records the later embassy and Zeno's refusal. References: https://www.iranicaonline.org/articles/sasanian-dynasty/ and https://www.iranicaonline.org/articles/balas/viii-balas-sasanian-king-of-kings/. The dispatch abstracts this recurring diplomatic issue without fixing an embassy to spring 476, implementing Persia as a realm or making the Caucasian passes traversable. Syria, Egypt, Armenia and Persia remain outside territorial play; existing off-map religious institutions retain their original recognition role.

Full political depth remains concentrated at Salona, Constantinople and Zeno's displaced court. The other Balkan and Anatolian counties have regional settlement, community and selected see coverage. Additional named provincial courts, precise ecclesiastical jurisdictions and wider eastern territorial play remain outside this authoring record. Owner content review and requirement acceptance remain pending.

ITALIAN REGIONAL AUTHORING RECORD (2026-10-05)

Territory and courts. The spring opening retains Romulus's western administration, Orestes's military position, Odoacer's landless body and Feletheus's Rugian court. Sicily, Sardinia and Corsica remain Vandal-controlled; moving their six county declarations into the Italian content file changes no sovereignty. Northern Italy, Raetia and Noricum remain the map's nominal western territorial approximation, not proof of effective imperial control in every Alpine town. Feletheus's Rugian governing identity is now distinct from the Roman/Nicene majority of the wien cell. The existing cast still supplies Rome's senator and Ravenna's delegates, without assigning an attested family or estate to a composite representative. References: PLRE II and the territorial discussion above; Anonymus Valesianus, latter part, sections 36-38 and 45-48, https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Excerpta_Valesiana/2*.html.

Communities. Roman/Nicene residents dominate every Italian county. Small Gothic/Homoian weights distinguish the Po corridor and Alpine approaches; Ravenna and Ticinum retain the preceding 80/20 mixtures. Vandal/Homoian island minorities occupy 3-10 percent of the corresponding county weights. The wien cell uses 65 percent Roman/Nicene and 35 percent Rugian/Homoian. These are editorial gameplay weights, not population measurements or a census of military settlement. All pairs sum to 10,000. The shared settlement projection conserves the county cohorts across actual settlement populations; the declaration does not assert an independently researched census at every site. No dated exodus is forced. Eugippius describes Roman communities, Rugian rulers, religious difference and tribute across the Danube; it does not supply these percentages. Reference: Life of Severinus, especially chapters 8, 30-31, 40 and 44, https://www.tertullian.org/fathers/severinus_02_text.htm.

Place identities. The Italy and Alps list above supplies the names of all 48 authored head settlements. The new site records use the period name during 375-600 and rounded geographic anchors. Existing Rome, Ostia, Ravenna, Classis, Mediolanum, Ticinum, Augusta Taurinorum, Syracusae and Altinum site ids are retained. Roma, Ravenna, Mediolanum, Neapolis and Syracusae use city presentation; other authored head sites use towns, including diminished Aquileia and Altinum. Altinum's development falls to 2, Ticinum's to 4 and Luca's to 3. Development expresses relative gameplay capacity, not an archaeological population estimate. The existing Barrington Atlas and Pleiades references support the geographical vocabulary; Anonymus Valesianus 36-38 supports the distinct Placentia, Ticinum, Ravenna and Classis locations of the 476 conflict.

Three identifications previously marked verify are resolved as settlement anchors without claiming that their modern county cells match ancient jurisdictions: Luceria sits near modern Lucera in foggia, Volsinii uses Roman Bolsena in viterbo, and Aleria is a separate site in the Corsican ajaccio cell. Corsica remains the county label. Capua's site uses Santa Maria Capua Vetere rather than medieval Capua; Turris Libisonis uses Porto Torres rather than Sassari. Research records: Volsinii, https://www1.ku.de/ggf/ag/tabula_peutingeriana/trefferanzeige_en.php?id=247; Luceria, https://www.getty.edu/vow/TGNFullDisplay?english=Y&find=&nation=&place=&subjectid=7004118; Aleria's official archaeological account, https://aleria.fr/musee-et-site-antique/ and https://pop.culture.gouv.fr/notice/merimee/PA00099262. These supersede the earlier unresolved-label note for these three Italian anchors only.

Additional sites. Portus is a distinct Roman harbor beside Ostia, appended after Rome's existing two slots. Neapolis occupies a second slot in capua, Placentia a second in parma, Lauriacum a second in linz and Favianis a second in wien. Each uses its own physical site id rather than renaming the county head. Portus and Ostia were separate inhabited harbor places in late antiquity: https://ajaonline.org/field-report/1350/ and https://www.portusproject.org/topography/old-plans/. Neapolis is the ancient settlement underlying Naples, https://whc.unesco.org/document/162929. Eugippius's narrative names the Danube communities at Lauriacum and Favianis; their allocation to the retained map cells is a gameplay approximation.

Civic and church actors. Provincial civic seats now cover Ticinum, Aquileia, Verona, Capua, Neapolis, Syracusae, Panormus, Carales, Aleria, Lauriacum, Iuvavum and Favianis alongside Rome, Ravenna and Mediolanum. They model local Roman civic interlocutors, without claiming that every town retained an identical council constitution. Nicene sees are added at the first eight of those places and Lauriacum. Epiphanius is the named bishop at Ticinum, active during its 476 destruction and recovery; see Ennodius's Life of Epiphanius and the source record https://www.presbytersproject.ihuw.pl/index.php?SourceID=1498&id=6. Constantius is the named bishop at Lauriacum in Eugippius, chapter 30. The inherited Italian church framework is also supported by the episcopal subscriptions to the Roman synods of 499-502 in Theodor Mommsen (ed.), Cassiodori Senatoris Variae, MGH Auctores antiquissimi XII, Acta synhodorum habitarum Romae, https://www.dmgh.de/mgh_auct_ant_12/index.htm. These later subscriptions support institutional geography, not certainty about who occupied every see in spring 476. Unknown representatives are generated, and the existing historicalName seed still uses a synthetic age and traits. Iuvavum and Aleria have no invented 476 bishop; Severinus is not turned into the bishop of Favianis. The engine's generic civic and episcopal bargaining is a gameplay treatment of these relationships.

Names and families. The Roman late antique pool adds Decius, Caecina, Basilius, Venantius, Opilio, Paulinus, Boethius and Ennodius from the senatorial and clerical milieu described in PLRE II, Ennodius and the synodal acts. A generated character with one of these names is not the attested bearer and does not establish a Decian or Anician family. Rugian names Feletheus, Flaccitheus, Ferderuchus, Fredericus and Giso follow Eugippius. The culture inherits the existing Gothic presentation and naming framework as a bounded approximation, not a linguistic reconstruction.

Jurisdiction. Every Italian county explicitly seeds Peace and Revenue for its controlling realm. Ravenna, Rome, Mediolanum, Ticinum, Aquileia, Florentia, Capua, Beneventum, Barium, Consentia and Augusta Vindelicum use provincial-court tenure evidence; the other cells use possession. These are scoped public jurisdiction abstractions of late Roman administration and actual control. They are not surveyed estates or inherited senatorial title deeds. No federate one-third land demand is treated as an already accepted grant in spring 476. For the competing interpretations of military allocation, see the Procopius discussion above and Wars V.1, https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Procopius/Wars/5A*.html.

Conditional Danube campaign. Anonymus Valesianus 48 describes Odoacer's defeat of the Rugians in 487 and the subsequent expedition in 488. The authored opportunity therefore runs during 487-488 only if the living Odoacer holds Ravenna and the Rugian polity still holds the target cell. It uses an ordinary objective war, preserving inhabitants and resolving actual victory, failure or divergence. The wien objective stands for the Rugian frontier, not an assertion that the historic battle was at Vindobona. A separate conditional civilian opportunity follows an actual won outcome; neither the evacuation nor the captured royal family's fate is forced by a date.

Everyday events. Grain rolls, reconstruction of civic registers and food shared between religious communities express attested provisioning, legal administration and confessional coexistence as fictional household incidents. They are not reconstructions of a dated event in a named city. The existing late Roman administration discussion, Ennodius's account of Ticinum's recovery and Eugippius's provisioning narratives motivate those themes. Era, stable county selectors and live community gates restrict the Italian events to their authored region and exclude medieval starts and homogeneous counties from the inappropriate congregation incident.

Italy platform follow-ups, 2026-10-05. The bookmark now declares historical and generated court profiles, explicit scoped appointments, a private Decian family estate and an unaccepted one-third federate demand. Settlement community weights, civilian opening displacement, non-episcopal religious representation and regional county selectors have validated shared contracts. Independent tribute_cession and civilian_migration story types express bilateral agreements and conserved seasonal evacuation instead of treating either as an objective war. Restore retains their records without replaying initialization.

Court and estate evidence. Orestes's relation to Romulus and military command follow Anonymus Valesianus 36-38, https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Excerpta_Valesiana/2*.html. Sidonius, Letters I.9, describes Caecina Basilius among the leading Roman senators in 468, https://www.tertullian.org/fathers/sidonius_letters_01book1.htm. The Decian genealogy and later consulships inform the named sons Maximus Basilius and Venantius, https://www.treccani.it/enciclopedia/cecina-mavorzio-basilio-decio_%28Dizionario-Biografico%29/. Retaining the elder Basilius at the 476 opening is an editorial survival assumption; no spring-476 household census is asserted. The Roman senatorial delegate is a gameplay role, not a backdated claim that the younger Basilius already held his later offices. Their birthdays, skills, residence and the 1000/10000 Rome estate share are simulation values. The estate represents family property evidence, with inheritance but no modeled rent. The demanded third covers selected Italian centers and remains unaccepted.

Civilian and clerical evidence. Eugippius, Life of Severinus XXX-XXXI and XLIV, records Constantius, Severinus's monastery at Favianis, movement from Lauriacum into Rugian tributary towns, and the later evacuation ordered after the Rugian war, https://www.tertullian.org/fathers/severinus_02_text.htm. Severinus is represented as a monk, not a bishop. His 410 birth year and those of Exuperantius and Constantius are editorial working ages; Epiphanius retains the conventional approximate 438 date. A one-percent opening movement and later sixty-percent ceiling in batches of 1000 are tunings, not historical population measurements. The linz/wien/ravenna route and distinct Lentia/Lauriacum weights approximate regional settlement patterns on this map. The later opportunity runs 487-493 to allow conditional campaign resolution; it does not claim a six-year historical evacuation or replay Severinus's life after his ordinary death.

Sicilian agreement evidence. Victor of Vita, Historia persecutionis I.4, supplies the cession and annual tribute, https://www.documentacatholicaomnia.eu/02m/0430-0484,_Victor_Vitensis,_Historia_Persecutionis_Africae_Provinciae,_MLT.pdf. Bury, History of the Later Roman Empire XII.4, summarizes the agreement and identifies the retained foothold conjecturally with Lilybaeum, https://penelope.uchicago.edu/Thayer/E/Roman/Texts/secondary/BURLAT/12*.html. The current counties cannot isolate that fortress: messina and siracusa may be ceded while the whole palermo cell stays Vandal. The 20-gold annual amount, 270-day negotiation offset and 476-477 window are gameplay choices. Both current courts must agree after Ravenna is held, and a changed ruler closes this particular agreement. This does not imply that every historical succession cancelled an existing treaty. No transfer is forced by the historical date.

GAUL AND IBERIA CONTENT RECORD (2026-10-05)

The regional declaration now distinguishes Gallo-Roman and Hispano-Roman communities from successor elites. Community shares remain gameplay weights, not a fifth-century census. Development favors surviving administrative and commercial centers and removes later metropolitan advantages from Cordoba, Granada, Almeria, Aachen and Bruges. All 117 county heads have authored period presentations; regional labels stand in for uncertain or later-founded towns. Site coordinates are approximate physical anchors on the existing county raster, and a village under a regional label does not assert an ancient city at that point.

The established ruler choices remain Syagrius at Soissons, Childeric at Tournai, Euric at Toulouse and Chilperic I at Lyon, with the existing living Clovis, Gundobad and Godegisel cast. Burgundy remains one gameplay polity with co-rulers, rather than three unsupported county partitions. Suevic, Armorican and Rhenish incumbents stay generated. The additional strasbourg cell represents an Upper Rhine Alamannic polity with a generated ruler. Eugippius names Gibuld in the Alamannic episode of Life of Severinus XIX but does not securely establish that person's incumbency at the spring 476 start (https://www.tertullian.org/fathers/severinus_02_text.htm). Neither the selected cell nor its community weights claim exact Alamannic boundaries.

Councils and sees are concentrated in southern Gaul, with selected northern and Iberian seats. Sidonius, Letters VII.2 and VII.6, supports Graecus of Marseille and Leontius of Arles among active church negotiators; VII.6 describes Bordeaux and other Aquitanian sees without bishops and barriers to replacement. Bordeaux's opening vacancy extrapolates that account of about 475 into spring 476, rather than asserting an exact vacancy-end date. VII.7 informs the treaty and provincial uncertainty behind the court events. Vienne's representative is generated because Mamertus's death and succession around 475-476 make an exact opening incumbent uncertain. Reference: https://www.tertullian.org/fathers/sidonius_letters_07book7.htm

Patiens at Lyon and the Rhone relief event draw on Sidonius, Letters VI.12, which describes grain relief across Gallic towns after Gothic devastation. Reference: https://www.tertullian.org/fathers/sidonius_letters_06book6.htm

Remigius at Reims is independently addressed in Sidonius, Letters IX.7. His generated age and skills, like those of other named bishops, remain gameplay values. Reference: https://www.tertullian.org/fathers/sidonius_letters_09book9.htm

The ordinary Roman, Gothic and mixed-court model is retained, with complete local customary definitions for the other successor powers. Gothic custom represents Euric's court law as a gameplay abstraction; Isidore, History of the Goths 35, associates written Gothic law with Euric, but this declaration does not assert the code's precise date or territorial scope. Later Salic law, the Burgundian codes and Alaric's Breviary are not backdated into 476. Reference: https://readancienttexts.com/isidore_of_seville/historia_de_regibus_gothorum/1

Euric's opening gains in Provence, Auvergne and Iberia remain the researched opening conditions discussed above. No additional dated Visigothic conquest is fabricated to replay gains already in the snapshot. The Clovis-Syagrius instance retains the existing living-actor and actual-war conditions; moving its definition into the regional file does not force Childeric's death, Clovis's inheritance or a territorial award. Gregory, History of the Franks II.27-28, remains the narrative reference for Clovis, Syagrius and the Burgundian rulers: https://sourcebooks.fordham.edu/basis/gregory-hist.asp

Place-name checks include Burdigala (https://pleiades.stoa.org/places/138248) and Conimbriga's late antique occupation (https://pleiades.stoa.org/indexes-old/index-by-select-time-periods/late-antique/settlement?b_start%3Aint=1640). Iria Flavia and Carthago Nova use period sites near the modern Santiago and Murcia cells; Conimbriga uses its own approximate location rather than Coimbra's modern center. The disputed Abula identification is avoided in the avila cell, which uses Vettonian uplands. The conflict is discussed in the Instituto Cervantes toponymy study: https://cvc.cervantes.es/el_rinconete/anteriores/julio_04/26072004_01.htm

Southern Gaul has the denser institutional and event treatment in this initial regional pass. Northern Gaul, the Rhine and Armorica retain regional depth. The Iberian expansion recorded below broadens its councils, sees, community partitions and conditional campaigns. Unknown city and church representatives are generated, with no invented historical families. The initial eight local events provide ordinary household choices and do not enact territorial, institutional or demographic changes on a fixed date.

PLAYABLE RULER AUTHORING RECORD (2026-10-05)

The three review candidates reuse this bookmark's existing Julius Nepos in the Dalmatian court, Odoacer in the nonterritorial Italian federate host, and Syagrius in the northern Gallic Roman domain. Salona remains the split map cell; Ticinum remains pavia; Soissons remains laon. These are the same regional approximations documented above. The starts add no new claim about exact historical borders, wealth or troop totals.

Starting ages follow the existing authored birth years: Nepos and Syagrius 430, Odoacer 433. Fixed skills, court rank and purse amounts remain gameplay values. Existing seeded consorts and children are campaign fiction where the research supplies no named identity; adopting a court does not turn those generated relatives into attested historical figures.

The Nepos recognition/restoration path is a counterfactual player opportunity using current eastern recognition, Roman civic support and an ordinary Ravenna campaign. Its office outcome depends on actual possession and living authority. Odoacer's service bargain and civic government decision retain the established contract and institutional rules. Syagrius's response to a living Frankish challenge is explicit. Historical chronology opens opportunities without forcing their outcomes. The candidate definitions remain hidden until owner acceptance.

Royal family authoring, 2026-10-05

The Vandal court declaration uses Gaiseric as dynasty founder, Huneric as his living eldest son, Theoderic as another son, and Gento as the ancestor of Godagis, Gunthamund, Geilaris and Thrasamund. Hilderic belongs to Huneric and Eudocia. Procopius, Wars III.8-9, supplies the Gunthamund/Thrasamund succession, Hilderic's parentage, and Geilaris's place between Gento and Gelimer. His earlier account supplies the seniority rule, but this is a retrospective narrative rather than a surviving legal instrument. https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Procopius/Wars/3B*.html and https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Procopius/Wars/3C*.html

Andrew Merrills, The secret of my succession: dynasty and crisis in Vandal North Africa (2010), studies seniority as a dynastic innovation and the later challenges to it. The game models the eldest eligible adult male in Gaiseric's male line, then ordinary dynastic fallback, not an inevitable historical sequence. https://onlinelibrary.wiley.com/doi/10.1111/j.1468-0254.2010.00293.x

Robin Whelan, Missing Queens: Gender, Dynasty and Power in Vandal Africa (2022), discusses the restricted visibility of royal women, Huneric's younger brother Theoderic and nephew Godagis, and Eudocia's departure for Jerusalem and death in the early 470s. No current Eudocia-Huneric marriage is installed. Eudocia survives only as Hilderic's compact deceased mother. https://onlinelibrary.wiley.com/doi/10.1111/1468-0424.12528

Editorial uncertainty: Procopius says Gento was already dead when Huneric succeeded in 477; this does not establish his death before spring 476. The snapshot provisionally represents him as a deceased ancestor without an invented exact death year. This opening-status assumption requires owner review. The four sons' opening survival is reconstructed from later genealogy and appearances, not a spring-476 household roster. Godagis's exact age and Geilaris's birth are particularly uncertain; later testimony does not provide a complete list of children or their mothers.

Gameplay chronology: Gaiseric retains born 389. Huneric 415, Theoderic 425, Gento 420, Godagis 445, Gunthamund 450, Geilaris 452, Thrasamund 455, Hilderic 460, and Eudocia 439/died 472 are working ages or approximate conventional dates, not exact attested birthdays. Unknown mothers remain absent. Martial values are gameplay tuning; relatives without an authored trait or skill use the existing seeded character rules. All deaths after opening use ordinary mortality. No later crown, marriage, conversion or territory transfer is scheduled by these declarations.

Frankish and Burgundian parity: Clovis retains the prototype's born 466 and Childeric father link. Gundobad retains born 445 and Vienne residence; Godegisel retains born 450 and Geneva residence. Gundioc is a deceased compact father, provisionally born 410/died 473. His attested brother relationship with Chilperic I is explicit; their unknown parents remain absent. These gameplay ages and the opening political abstraction follow the earlier Burgundian decision in this note. The story consumes these data identities and continues to test the actual living ruler.

BALKAN AND ANATOLIAN PROVINCIAL CONTENT RECORD (2026-10-06)

The eastern regional declaration now contains 51 institutions, thirteen generated provincial civil incumbents, two generated Gothic unit captains, the existing two Gothic rulers as referenced actors, the existing Illus and Trocundes, and Longinus as an Isaurian magnate. Most provincial incumbents and bishops remain generated because this snapshot does not establish their spring-476 identities. Civic councils, public warrants, religious representation and private property are separate gameplay records; none implies hereditary county ownership.

Administrative evidence. The eastern Notitia Dignitatum supplies late Roman civil and military categories, including consular governors in Macedonia, Thrace, Dacia Mediterranea, Bithynia, Galatia, Lydia and Pamphylia, and praesides in the other represented jurisdictions. It is an earlier administrative witness, not a complete 476 appointment list. County-scoped consularis and praeses warrants approximate provincial seats on the existing raster rather than exact province boundaries or an exhaustive staff. Reference: https://thelatinlibrary.com/notitia2.html

Gothic evidence. Malchus fragments 11-19 describe the rival Gothic leaders and eastern negotiations in the later 470s; Evagrius III.25 recounts Strabo's challenge and death. The campaign windows 477-481 for a Thracian capital challenge and 479-483 for the Amal host in Epirus offer conditional ordinary war, not a replay of every march or a prediction of conquest. A Thracian successor may use the opportunity before it closes; Strabo's historical death is not forced. The hosts are not automatically merged. References: https://www.dfhg-project.org/DFHG/digger.php?onoffswitch=on&what%5B%5D=author%7CMALCHUS+PHILADELPHENSIS and https://www.tertullian.org/fathers/evagrius_3_book3.htm

Bury's narrative of the Gothic disputes and movement through the Balkans supports Dyrrachium as a regional objective and distinguishes the Amal leader from Strabo. The declaration retains the previously researched 488-493 Italian commission and original surviving Amal host. Victory in Epirus makes the court territorial there and therefore diverts that particular later landless commission. Failed war does not guarantee departure for Italy; the living ruler, host and eastern court must still satisfy its existing conditions. Reference: https://penelope.uchicago.edu/Thayer/E/Roman/Texts/secondary/BURLAT/12*.html

Isaurian evidence. Evagrius III.27 describes Illus and the later eastern conflict. Hugh Elton's account distinguishes Illus and Trocundes, Zeno's brother Longinus, the hostage dispute in 483 and the rebellion beginning in 484. The game retains Illus and Trocundes as the actual living story people and adds ordinary regional contacts and correspondence after the return. Longinus's private estate, 450 working birth year, skills, five-percent share and residence at the coarse Iconium/Isaurian anchor are gameplay choices, not attested property or genealogy. No sibling link, hostage plot, provincial revolt, execution or precisely identified Isaurian fortress is asserted. References: https://www.tertullian.org/fathers/evagrius_3_book3.htm and https://roman-emperors.sites.luc.edu/zeno.htm

Religious evidence. Evagrius III.4-9 describes the encyclical controversy and Paul at Ephesus. Paul represents a Miaphysite congregation through the existing non-episcopal workflow; the preserved generated Chalcedonian see is a competing institutional abstraction, not a claim that both opening representatives simultaneously held the same bishopric. His working birth year 430 and station are simulation values. The reconciliation-formula event uses copies circulated in 482-488, informed by Evagrius III.14 and Elton's account of the 482 Henotikon; it neither converts communities nor asserts an inevitable settlement. References: https://www.tertullian.org/fathers/evagrius_3_book3.htm and https://roman-emperors.sites.luc.edu/zeno.htm

Gepid and Isaurian culture ids distinguish governing elites and local communities while inheriting existing naming and appearance rules. Greek, Roman, Gothic, Gepid, Rugian, Isaurian, Chalcedonian, Nicene, Homoian and Miaphysite paired shares are editorial population weights, not a fifth-century census. Gepid customary law continues the existing Gothic-custom strategy as a gameplay approximation, not an asserted surviving Gepid legal code. Uncertain Pannonian and Epirus places retain regional labels. Novae's approximate physical anchor occupies an additional slot beside Abritus on the retained county grid; it does not locate the whole Amal court there on a historical date.

Service pay of 10 and 12 gold per season, one-year opening terms, fifteen-percent unaccepted settlement demands, estate share, generated ages, skills, army sizes and campaign durations are game scaling. The current eastern court can commission Strabo's exact host while bilateral service remains effective, independently of county jurisdiction. Neither host receives accepted settlement land at opening. The eight additional events offer household choices about registers, freight, service petitions, Isaurian correspondence and confession; they do not impose historical authority, conquest, religious change or demographic movement.

Content remains bounded to the retained Balkans, Danube and Anatolian counties. Persia, Syria, Egypt, Cyprus and the Caucasian frontier remain outside territorial play. The original core opening declaration is retained for unversioned setup records, and new openings stamp balkans_v1. Compatibility coverage constructs that predecessor declaration because no public 476 save corpus exists. Owner review is still needed for the editorial snapshot, balance and campaign behavior; authored acceptance specifications do not establish executed results.

IBERIAN CONTENT EXPANSION (2026-10-06)

The regional gaul_iberia declaration now supplies councils and Nicene sees at Tarraco, Emerita Augusta, Hispalis, Toletum, Corduba, Barcino, Caesaraugusta, Olisipo, Asturica Augusta and Lucus Augusti, plus a civic representative at Iria Flavia. The selected urban institutions stand for continuing local church networks and civic landowners; they are not an assertion that identical curiae survived everywhere. All opening incumbents are generated. Hilary's correspondence with Ascanius and the bishops of Tarraconensis documents provincial church organization and petitions from local possessors before 476: https://romanletters.org/letters/pope_hilary/23/. Cyprian's Epistle 67 supplies earlier church evidence for Legio, Asturica and Emerita: https://www.newadvent.org/fathers/050667.htm. The first Council of Toledo supplies earlier Toletan ecclesiastical evidence: https://www.filosofia.org/cod/c0397t01.htm. These sources support institutional geography, not a roster of living spring-476 bishops. Hilary's letter transmission, council dates and later see lists cannot settle every opening incumbency. The disputed location of the Spanish bishop Zeno is left unresolved rather than assigning him to Hispalis or Emerita.

The Visigothic and Suevic courts retain the shared regnum government and ordinary dynastic succession. Its existing office catalogue supplies civic defenders, local civil governors, estate-receipt officers and host-scoped military commands. Local representatives become ordinary candidates for these appointments. No fictional named royal official, royal family or private estate is added to the fixed opening household declaration. The offices preserve separate Peace, Revenue and Ban scopes; a commission does not make its holder owner of a county. This uses the existing authority abstraction rather than identifying every Roman office label with a securely attested office under Euric.

Written law. Isidore, History of the Goths 34-35, associates Euric with Iberian expansion and written Gothic laws: https://readancienttexts.com/isidore_of_seville/historia_de_regibus_gothorum/1. The dedicated euric_code_476 identity uses Code of Euric as its display name while retaining the established sentence and assessor machinery. Roman provincial cases retain late_roman; Gothic and mixed Roman-Gothic cases use the written Gothic identity. This personal-law split is a gameplay model, not a settled claim about the code's territorial application. The spring-476 availability is an editorial convention within the disputed dating around 475-476. The surviving text's Roman influence is substantial; it is not treated as purely Germanic custom. Alvaro d'Ors, El Codigo de Eurico, text and reconstruction, published in the BOE historical-law series: https://www.boe.es/biblioteca_juridica/abrir_pdf.php?id=PUB-LH-2014-1. Its chapters 276-277 inform the fictional boundary and settled-field incidents; the fragmentary evidence is not used to distribute a universal third of Iberian land.

Tenure and property. Municipal centers seed public Peace and Revenue with municipal_tenure_476 evidence, while autonomous northern communities use northern_community_custom_476 evidence. Other settled county rights remain. Civic petitions offer the existing guarantees for courts, protection, worship and taxation, allowing local landowner representation to matter under Gothic or Suevic elite identity. These are public jurisdiction and negotiation records, not household ownership deeds, reconstructed estate shares or a new rent system. The settled-field incident preserves both parties' claims in its narrative and affects only the player's household resources.

Gallaecian religion and rulers. Hydatius's closing entries describe Remismund, Ajax's royal-backed Homoian mission, local Roman communities and Gothic-Suevic rivalry around Lusitania and Asturica: https://www.thelatinlibrary.com/hydatiuschronicon.html. Isidore's Suevic History 87 and 90-91 records the earlier Nicene Rechiar and later confessional changes. The opening therefore retains a generated Homoian Suevic king and Hispano-Roman Nicene majority, with both Homoian and Nicene Suevic residents. No source securely supplies a spring-476 incumbent after Hydatius's chronicle ends, so Remismund is not assumed alive. The Lucus Augusti anchor remains a map abstraction for the court, not a claim that Bracara ceased to matter. Generated Homoian congregations at Lucus, Toletum and Tarraco model elite worship without inventing episcopal offices or naming Ajax as a living local bishop. The 7500/2000/500 Gallaecian shares and smaller Gothic southern minorities are simulation weights, not census results. No later royal conversion or replacement of the population's faith is scheduled.

The north. The oviedo and santander cells now represent autonomous Asturian/Cantabrian communities; alava represents an autonomous Basque community court. These rank-2 polities have generated leaders and do not claim later duchies, historic kings or precise borders. Pompaelo stays Visigothic because Isidore's Euric narrative already includes its conquest. Its residents and the Alavese uplands have Basque majorities, with Roman neighbors and a small Gothic Pompaelo contingent. Nicene affiliation is a coarse inherited Christian presentation, not a claim that every upland household had converted or that Basque pagan practice was Germanic. Generated northern names use the Roman period pool as an explicit Romanized fallback; the medieval Basque pools remain intact. Basque local custom is an ordinary unwritten-law abstraction without a fabricated surviving code. John of Biclar's Chronicle describes a Cantabrian campaign in 574 and occupation of part of Vasconia in 581: https://la.wikisource.org/wiki/Chronicon_(Iohannes_Biclarensis). Those later accounts motivate autonomous northern cells but do not provide a spring-476 political census. Amaya is not placed at Santander, and no Victoriacum foundation is backdated.

Campaigns. Suevic pressure on astorga during 476-490 is expressly a counterfactual continuation of the earlier frontier rivalry, not an attested new conquest after Hydatius. It requires the Suevic court to retain lugo and Gothic ownership of astorga. The Visigothic opportunities at santander, alava and lugo begin in 574, 581 and 585, following the Cantabrian, partial Vasconian and Suevic campaigns in John of Biclar. Each waits for compatible current control and peaceful living courts, then uses an ordinary bounded objective war. Santander stands for a broad Cantabrian frontier, Alava for partial upland expansion, and Lugo for the coarse Suevic seat. The opportunities neither manufacture Leovigild as Euric's inevitable successor nor force his historical victories. Securing Lugo does not award all Gallaecia, kill a Suevic king on a date or erase the surviving polity. The Balearics retain Vandal ownership.

Seven additional regional events cover civic assessment, written law, settled boundaries, church relief, confessional neighbors, Suevic envoys and northern common pasture. County selectors and live community requirements keep incidents local. They are fictional household situations motivated by legal and ecclesiastical evidence, not reconstructions of dated transactions. Costs, prestige, piety and work effort are gameplay values. Their ordinary effects transfer no county, grant no property, create no office and convert no community.
