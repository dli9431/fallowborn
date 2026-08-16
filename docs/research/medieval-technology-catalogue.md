# Medieval technology catalogue, 476–1300

This is the research ledger for the live technology graph in `data/technology.js`. It is
a selective gameplay catalogue, not a claim that medieval technologies—or the candidate
backlog below—are literally exhaustive. Technologies are practices and institutions as
well as artifacts; their dates describe attestation and regional adoption, not a single
moment of invention.

## How to read the tables

- Negative years are BCE; unmarked positive years are CE. An attested range records the
  broad evidence interval used by the soft-cost model.
- “Base adoption” is `[emergence…widespread]` for the default tradition. Regional
  windows apply these offsets: Latin +20 years, Byzantine +0, Islamic +0, Persianate
  +10, Slavic +35, Nordic +40, Steppe +30, Baltic-Finnic +55, Caucasian +25, and
  Northeast African +35. Traditions named as leaders subtract 70 years from their
  offset. No regional start precedes first attestation. This rule plus the base window
  and per-row leader list records every regional spread window used by the game.
- Prerequisites joined by commas are all required. `any(a/b)` means one listed entry is
  required in addition to the all-of prerequisites.
- The gameplay hook is the first discrete `unlocks` token. Definitions may also contain
  capped scalar effects; `data/technology.js` is authoritative for those numbers.
- Confidence is an editorial judgement about the breadth of the date range, not the
  historical importance of the entry. Entries marked medium cite at least two sources
  because their chronology, geographic origin, or category boundary is disputed.
- Source codes expand in the bibliography. Every live row cites at least one academic,
  archaeological, or primary-source-based work; most cite two.

## Live catalogue

### Agriculture and animal power (26)

| ID and name | Attested | Base adoption; leading traditions | Prerequisites | Gameplay hook | Confidence; sources |
|---|---:|---|---|---|---|
| `scratch_plough` — Scratch Plough | -1000…400 | -500…250; all traditions | — | `practice:light_tillage` | high; ASTILL/WHITE |
| `ard_plough` — Ard Plough | -500…500 | 500…720; all traditions | scratch_plough | `practice:ard_tillage` | high; ASTILL/WHITE |
| `crop_rotation` — Two-Course Rotation | -400…600 | -100…400; all traditions | scratch_plough | `practice:crop_rotation` | high; ASTILL/WHITE |
| `fallowing` — Managed Fallow | -500…500 | -150…350; all traditions | — | `practice:managed_fallow` | high; ASTILL/WHITE |
| `manuring` — Systematic Manuring | -300…600 | 500…720; all traditions | fallowing | `practice:manuring` | high; ASTILL/WHITE |
| `irrigation_channels` — Irrigation Channels | -1000…600 | -500…350; Islamic/Persianate/Byzantine/Northeast African | — | `practice:irrigation` | high; ASTILL/WHITE |
| `olive_press` — Lever Oil Press | -500…500 | 500…680; Byzantine/Islamic/Latin/Northeast African | — | `enterprise:press_business` | high; ASTILL/WHITE |
| `wine_press` — Screw Wine Press | -200…500 | 500…680; Latin/Byzantine/Caucasian | — | `practice:wine_pressing` | high; ASTILL/WHITE |
| `iron_sickles` — Iron Harvest Blades | -400…500 | -100…400; all traditions | — | `practice:iron_harvest_tools` | high; ASTILL/WHITE |
| `ox_yokes` — Improved Ox Yokes | -500…500 | -100…400; all traditions | — | `practice:ox_teams` | high; ASTILL/WHITE |
| `water_lifting_devices` — Water-Lifting Devices | -300…700 | 520…760; Islamic/Persianate/Byzantine/Northeast African | irrigation_channels | `practice:water_lifting` | high; ASTILL/WHITE |
| `terrace_farming` — Terrace Farming | -500…700 | 520…780; Byzantine/Caucasian/Islamic/Northeast African | — | `practice:terracing` | high; ASTILL/WHITE |
| `seed_selection` — Seed Selection | 500…900 | 600…850; Byzantine/Islamic/Persianate | crop_rotation | `practice:seed_selection` | high; ASTILL/WHITE |
| `haymaking` — Stored Hay | 550…900 | 650…900; Latin/Slavic/Nordic | iron_sickles | `practice:haymaking` | high; ASTILL/WHITE |
| `heavy_plough` — Heavy Plough | 650…900 | 760…1030; Slavic/Latin/Nordic | ard_plough, iron_sickles | `practice:heavy_tillage` | high; ASTILL/WHITE |
| `open_field_system` — Open-Field Organization | 650…1000 | 800…1080; Latin/Slavic | crop_rotation, heavy_plough | `practice:open_fields` | high; ASTILL/WHITE |
| `horse_collar` — Horse Collar | 600…1000 | 800…1080; Steppe/Byzantine/Latin | ox_yokes | `rule:horse_draft` | high; ASTILL/WHITE |
| `three_field` — Three-Field Rotation | 750…1100 | 900…1180; Latin/Byzantine | crop_rotation, open_field_system | `practice:three_field` | high; ASTILL/WHITE |
| `water_meadows` — Managed Water Meadows | 900…1200 | 1010…1240; Latin/Byzantine | irrigation_channels, haymaking | `practice:water_meadows` | high; ASTILL/WHITE |
| `improved_husbandry` — Improved Husbandry | 900…1250 | 1040…1280; Latin/Byzantine/Islamic | haymaking, seed_selection | `practice:husbandry` | high; ASTILL/WHITE |
| `selective_stockbreeding` — Selective Stockbreeding | 1050…1300 | 1160…1340; Latin/Islamic | improved_husbandry | `practice:selective_breeding` | high; ASTILL/WHITE |
| `legume_rotation` — Legume Rotation | 950…1250 | 1080…1300; Islamic/Byzantine/Latin | three_field | `practice:legume_rotation` | high; ASTILL/WHITE |
| `grafting_manuals` — Grafting Manuals | 850…1200 | 980…1240; Islamic/Byzantine/Persianate | seed_selection | `practice:grafting` | high; ASTILL/WHITE |
| `dovecotes` — Dovecotes | 850…1200 | 980…1230; Islamic/Latin/Byzantine | improved_husbandry | `practice:dovecotes` | high; ASTILL/WHITE |
| `rabbit_warrens` — Managed Warrens | 1050…1300 | 1160…1340; Latin | improved_husbandry | `practice:warrens` | medium; ASTILL/HOFFMANN |
| `marling` — Marling | 1050…1300 | 1160…1340; Latin | heavy_plough, manuring | `practice:marling` | high; ASTILL/WHITE |

### Crafts, materials, and industry (33)

| ID and name | Attested | Base adoption; leading traditions | Prerequisites | Gameplay hook | Confidence; sources |
|---|---:|---|---|---|---|
| `bloomery_iron` — Bloomery Ironworking | -1000…500 | -500…300; all traditions | — | `practice:ironworking` | high; GIES/SINGER |
| `lime_mortar` — Lime Mortar | -700…500 | -300…350; all traditions | — | `practice:masonry` | high; GIES/SINGER |
| `wheel_thrown_pottery` — Wheel-Thrown Pottery | -1000…500 | -500…300; all traditions | — | `practice:pottery` | high; GIES/SINGER |
| `glassblowing` — Glassblowing | -100…500 | 500…650; Byzantine/Islamic/Northeast African | — | `practice:glasswork` | high; GIES/SINGER |
| `tanning` — Vegetable Tanning | -500…500 | -100…350; all traditions | — | `practice:tanning` | high; GIES/SINGER |
| `spindle_whorl` — Spindle and Distaff | -1000…500 | -500…250; all traditions | — | `practice:spinning` | high; GIES/SINGER |
| `warp_weighted_loom` — Warp-Weighted Loom | -800…600 | 500…700; all traditions | spindle_whorl | `practice:weaving` | high; GIES/SINGER |
| `cooperage` — Cooperage | -300…500 | -50…400; all traditions | — | `practice:cooperage` | high; GIES/SINGER |
| `quern_stones` — Rotary Querns | -500…500 | 480…620; all traditions | — | `practice:rotary_grinding` | high; GIES/SINGER |
| `lost_wax_casting` — Lost-Wax Casting | -1000…600 | 500…720; all traditions | — | `practice:lost_wax_casting` | high; GIES/SINGER |
| `pattern_welding` — Pattern-Welded Blades | 200…800 | 450…760; Nordic/Latin/Slavic | bloomery_iron | `rule:pattern_welded_arms` | high; GIES/SINGER |
| `crucible_steel` — Crucible Steel | 300…900 | 550…880; Persianate/Islamic/Steppe | bloomery_iron | `rule:crucible_arms` | medium; SINGER/FEUERBACH |
| `horizontal_loom` — Horizontal Loom | 500…900 | 650…900; Byzantine/Islamic/Latin | warp_weighted_loom | `practice:horizontal_weaving` | high; GIES/SINGER |
| `water_power` — Water-Power Gearing | 100…700 | 400…760; Byzantine/Islamic/Latin | quern_stones | `rule:water_power` | high; GIES/SINGER |
| `undershot_watermill` — Undershot Watermill | 100…700 | 450…780; Byzantine/Latin/Islamic | water_power | `building:mill` | high; GIES/SINGER |
| `overshot_waterwheel` — Overshot Waterwheel | 500…1000 | 720…1020; Islamic/Byzantine/Latin | water_power | `rule:overshot_power` | high; GIES/SINGER |
| `trip_hammer` — Water-Powered Trip Hammer | 700…1100 | 850…1110; Islamic/Byzantine/Latin | overshot_waterwheel, bloomery_iron | `rule:trip_hammers` | high; GIES/SINGER |
| `paper_making` — Papermaking | 650…950 | 760…1010; Islamic/Persianate | — | `rule:paper_supply` | high; BLOOM/SINGER |
| `distillation` — Alembic Distillation | 700…1050 | 820…1080; Islamic/Persianate/Byzantine | glassblowing | `practice:distillation` | high; PORMANN/SINGER |
| `soap_boiling` — Hard Soap Boiling | 600…1000 | 760…1020; Islamic/Byzantine/Latin | olive_press | `practice:soap_boiling` | high; GIES/SINGER |
| `glazed_pottery` — Glazed Pottery | 600…1050 | 760…1080; Islamic/Persianate/Byzantine | wheel_thrown_pottery, glassblowing | `practice:glazed_pottery` | high; GIES/SINGER |
| `improved_furnaces` — Improved Furnace Draft | 800…1150 | 940…1170; Islamic/Persianate/Latin | bloomery_iron | `rule:high_heat_furnaces` | high; GIES/SINGER |
| `bell_casting` — Large Bell Casting | 750…1100 | 900…1120; Latin/Byzantine | lost_wax_casting, improved_furnaces | `practice:large_bronze_casting` | high; GIES/SINGER |
| `stone_sawing` — Water-Powered Stone Sawing | 600…1100 | 820…1120; Byzantine/Islamic | water_power, lime_mortar | `rule:powered_stonework` | high; GIES/SINGER |
| `fulling_mill` — Fulling Mill | 950…1200 | 1050…1230; Latin/Islamic | trip_hammer, horizontal_loom | `rule:fulling_mill` | high; GIES/SINGER |
| `windmill` — Post Windmill | 850…1200 | 1030…1240; Persianate/Islamic/Latin | water_power | `building:windmill` | medium; GIES/HILL |
| `powered_mills` — Powered Mills | 700…1200 | 980…1240; Islamic/Byzantine/Latin | overshot_waterwheel, any(trip_hammer/windmill) | `rule:powered_industry` | high; GIES/SINGER |
| `treadle_loom` — Treadle Loom | 1000…1250 | 1120…1280; Islamic/Byzantine/Latin | horizontal_loom | `rule:treadle_weaving` | high; GIES/SINGER |
| `blast_furnace` — Early Blast Furnace | 1150…1350 | 1260…1400; Latin | improved_furnaces, water_power | `building:foundry` | medium; SINGER/GIES |
| `mechanical_clock` — Mechanical Escapement | 1270…1330 | 1300…1420; Latin | bell_casting, improved_furnaces | `rule:mechanical_timekeeping` | medium; CIPOLLA/LANDES |
| `ribbed_vaulting` — Ribbed Vaulting | 1080…1350 | 1150…1350; Latin/Byzantine | lime_mortar, geometry | `building:cathedral` | high; GIES/SINGER |
| `spinning_wheel` — Spinning Wheel | 1000…1350 | 1150…1350; Islamic/Persianate/Latin | spindle_whorl, horizontal_loom | `rule:spun_yarn_trade` | high; SINGER/GIES |
| `deep_shaft_mining` — Deep-Shaft Mining | 1100…1400 | 1200…1400; Latin/Persianate | bloomery_iron, water_power | `rule:deep_mining` | high; GIES/SINGER |

### Commerce, transport, and infrastructure (25)

| ID and name | Attested | Base adoption; leading traditions | Prerequisites | Gameplay hook | Confidence; sources |
|---|---:|---|---|---|---|
| `road_surveys` — Surveyed Roads | -500…500 | 500…720; all traditions | — | `rule:surveyed_roads` | high; LOPEZ/SPUFFORD |
| `stone_bridgebuilding` — Stone Bridgebuilding | -500…600 | 520…760; all traditions | lime_mortar | `building:bridge` | high; LOPEZ/SPUFFORD |
| `standardized_coinage` — Standardized Coinage | -600…500 | -150…350; all traditions | — | `rule:coinage` | high; LOPEZ/SPUFFORD |
| `weights_measures` — Public Weights and Measures | -500…500 | -100…350; all traditions | — | `rule:weights_measures` | high; LOPEZ/SPUFFORD |
| `market_tolls` — Regulated Market Tolls | -300…600 | 500…700; all traditions | weights_measures | `rule:regulated_tolls` | high; LOPEZ/SPUFFORD |
| `pack_saddles` — Pack Saddles | -500…600 | -100…400; all traditions | — | `rule:pack_transport` | high; LOPEZ/SPUFFORD |
| `wheeled_carts` — Iron-Tired Carts | -500…600 | 500…700; all traditions | bloomery_iron | `rule:wheeled_transport` | high; LOPEZ/SPUFFORD |
| `warehouses` — Warehouses | -300…600 | 500…720; all traditions | cooperage | `rule:warehousing` | high; LOPEZ/SPUFFORD |
| `river_landings` — Improved River Landings | 500…900 | 650…900; Byzantine/Islamic/Slavic/Latin | warehouses | `rule:river_trade` | high; LOPEZ/SPUFFORD |
| `caravanserais` — Caravanserais | 500…950 | 650…930; Persianate/Islamic/Caucasian | pack_saddles, warehouses | `rule:caravan_network` | high; LOPEZ/SPUFFORD |
| `urban_markets` — Permanent Urban Markets | 600…1000 | 760…1010; Islamic/Byzantine/Latin | market_tolls, warehouses | `enterprise:market_stall_business` | high; LOPEZ/SPUFFORD |
| `merchant_guilds` — Merchant Guilds | 750…1100 | 880…1120; Byzantine/Islamic/Latin | urban_markets | `rule:merchant_guilds` | high; LOPEZ/SPUFFORD |
| `annual_fairs` — Chartered Annual Fairs | 850…1150 | 980…1170; Latin/Islamic | merchant_guilds | `rule:annual_fairs` | high; LOPEZ/SPUFFORD |
| `commercial_arithmetic` — Commercial Arithmetic | 800…1100 | 930…1130; Islamic/Persianate/Byzantine | weights_measures, arithmetic | `rule:commercial_arithmetic` | high; LOPEZ/SPUFFORD |
| `notarial_contracts` — Notarial Contracts | 800…1150 | 950…1170; Byzantine/Islamic/Latin | diplomatic_correspondence, market_tolls | `rule:notarial_contracts` | high; LOPEZ/SPUFFORD |
| `sea_loans` — Maritime Loans | 750…1150 | 930…1180; Byzantine/Islamic/Latin | notarial_contracts, warehouses | `rule:maritime_credit` | high; LOPEZ/SPUFFORD |
| `letters_of_credit` — Letters of Credit | 900…1200 | 1040…1220; Islamic/Persianate/Latin | notarial_contracts, merchant_guilds | `rule:letters_of_credit` | high; LOPEZ/SPUFFORD |
| `bills_of_exchange` — Bills of Exchange | 1100…1300 | 1200…1330; Latin/Islamic | letters_of_credit, commercial_arithmetic | `building:exchange` | high; LOPEZ/SPUFFORD |
| `marine_insurance` — Marine Insurance | 1250…1450 | 1300…1450; Latin/Islamic | sea_loans, notarial_contracts | `rule:marine_insurance` | high; SPUFFORD/LOPEZ |
| `mint_assay` — Mint Assaying | 800…1150 | 940…1170; Islamic/Byzantine/Latin | standardized_coinage, weights_measures | `rule:mint_assay` | high; LOPEZ/SPUFFORD |
| `paved_causeways` — Paved Causeways | 850…1200 | 1010…1230; Byzantine/Latin/Islamic | road_surveys, stone_bridgebuilding | `rule:paved_routes` | high; LOPEZ/SPUFFORD |
| `postal_relays` — Mounted Relay Posts | 700…1150 | 900…1170; Steppe/Persianate/Islamic/Byzantine | pack_saddles, road_surveys | `rule:relay_posts` | high; LOPEZ/SPUFFORD |
| `toll_exemptions` — Negotiated Toll Exemptions | 950…1250 | 1080…1280; Latin/Byzantine/Islamic | merchant_guilds, annual_fairs | `rule:toll_exemptions` | high; LOPEZ/SPUFFORD |
| `trade_houses` — Distant Trade Houses | 950…1250 | 1090…1290; Islamic/Byzantine/Latin | letters_of_credit, merchant_guilds | `enterprise:trade_house_business` | high; LOPEZ/SPUFFORD |
| `double_entry_bookkeeping` — Double-Entry Bookkeeping | 1250…1400 | 1320…1450; Latin | bills_of_exchange, commercial_arithmetic | `rule:double_entry` | medium; SPUFFORD/DE_ROOVER |

### Learning, medicine, and natural knowledge (25)

| ID and name | Attested | Base adoption; leading traditions | Prerequisites | Gameplay hook | Confidence; sources |
|---|---:|---|---|---|---|
| `manuscript_codex` — Manuscript Codex | 100…500 | 250…430; all traditions | — | `practice:codex_books` | high; GRANT/LINDBERG |
| `parchment_making` — Parchment Making | -200…500 | 480…650; all traditions | — | `practice:parchment` | high; GRANT/LINDBERG |
| `classical_grammar` — Classical Grammar | -500…600 | -100…430; all traditions | — | `practice:learned_literacy` | high; GRANT/LINDBERG |
| `arithmetic` — Written Arithmetic | -500…600 | -100…430; all traditions | — | `practice:arithmetic` | high; GRANT/LINDBERG |
| `geometry` — Practical Geometry | -500…600 | 500…700; all traditions | arithmetic | `practice:geometry` | high; GRANT/LINDBERG |
| `herbals` — Materia Medica | -400…600 | -50…430; all traditions | — | `practice:herbal_medicine` | high; GRANT/LINDBERG |
| `surgical_instruments` — Surgical Instruments | -300…600 | 520…740; all traditions | bloomery_iron | `practice:surgery` | high; GRANT/LINDBERG |
| `astronomical_observation` — Astronomical Observation | -500…600 | 500…720; all traditions | geometry | `practice:astronomy` | high; GRANT/LINDBERG |
| `scriptoria` — Scriptoria / Paper Workshops | 500…850 | 570…850; Byzantine/Latin/Islamic | manuscript_codex | `rule:scriptoria` | high; GRANT/LINDBERG |
| `translation_schools` — Translation Schools | 650…1050 | 760…1070; Islamic/Persianate/Byzantine | classical_grammar, scriptoria | `rule:translations` | high; GRANT/LINDBERG |
| `paper_scholarship` — Paper Scholarship | 750…1050 | 830…1080; Islamic/Persianate | paper_making, scriptoria | `building:library` | high; GRANT/LINDBERG |
| `algebra` — Algebraic Methods | 800…1100 | 850…1100; Islamic/Persianate | arithmetic, translation_schools | `rule:algebra` | high; GRANT/RASHED |
| `astrolabe` — Planispheric Astrolabe | 600…1000 | 760…1030; Islamic/Byzantine/Persianate | geometry, astronomical_observation | `rule:astrolabe` | high; GRANT/LINDBERG |
| `hospitals` — Endowed Hospitals | 650…1100 | 800…1120; Byzantine/Islamic/Persianate | herbals | `building:hospital` | high; GRANT/LINDBERG |
| `physicians` — Court Physicians | 700…1100 | 850…1130; Islamic/Persianate/Byzantine | herbals, scriptoria | `rule:court_physicians` | high; GRANT/LINDBERG |
| `medical_canons` — Medical Canons | 850…1150 | 980…1170; Islamic/Persianate | translation_schools, physicians | `rule:medical_canons` | high; PORMANN/GRANT |
| `optics` — Geometrical Optics | 900…1200 | 1020…1220; Islamic/Persianate | geometry, translation_schools | `rule:optics` | high; LINDBERG/GRANT |
| `scholarly_networks` — Scholarly Networks | 750…1150 | 930…1160; Islamic/Byzantine/Latin | scriptoria | `research_slot:2` | high; GRANT/LINDBERG |
| `universities` — Universities / Madrasas and Colleges | 1000…1250 | 1100…1270; Islamic/Latin | scholarly_networks, paper_scholarship | `building:university` | high; RASHDALL/MAKDISI |
| `scholastic_method` — Scholastic Method | 1050…1250 | 1150…1280; Latin/Islamic | universities, translation_schools | `rule:scholastic_method` | high; GRANT/LINDBERG |
| `legal_studies` — Professional Legal Studies | 1000…1250 | 1120…1280; Latin/Byzantine/Islamic | universities, written_law | `rule:legal_studies` | high; GRANT/LINDBERG |
| `anatomy_texts` — Illustrated Anatomy Texts | 1050…1300 | 1180…1320; Islamic/Persianate/Latin | medical_canons, paper_scholarship | `rule:anatomy_texts` | high; GRANT/LINDBERG |
| `pharmacology` — Compound Pharmacology | 950…1250 | 1080…1280; Islamic/Persianate/Byzantine | medical_canons, distillation | `rule:compound_medicines` | high; GRANT/LINDBERG |
| `zero_numeral` — Positional Zero | 600…1100 | 820…1130; Persianate/Islamic | arithmetic | `rule:positional_numerals` | high; IFRA/RASHED |
| `experimental_natural_philosophy` — Experimental Natural Philosophy | 1150…1350 | 1260…1380; Islamic/Latin | optics, scholastic_method | `rule:experimental_inquiry` | medium; LINDBERG/GRANT |

### Governance, law, and institutions (25)

| ID and name | Attested | Base adoption; leading traditions | Prerequisites | Gameplay hook | Confidence; sources |
|---|---:|---|---|---|---|
| `written_law` — Written Law Codes | -600…600 | -100…430; all traditions | — | `practice:written_law` | high; BLOCH/BERMAN |
| `census_records` — Census Records | -500…600 | 500…700; all traditions | written_law | `practice:census` | high; BLOCH/BERMAN |
| `land_registers` — Land Registers | -500…600 | 500…700; all traditions | written_law | `practice:land_records` | high; BLOCH/BERMAN |
| `tax_assessment` — Regular Tax Assessment | -500…600 | 520…740; all traditions | census_records | `practice:tax_assessment` | high; BLOCH/BERMAN |
| `diplomatic_correspondence` — Diplomatic Correspondence | -500…600 | -50…430; all traditions | classical_grammar | `practice:diplomatic_letters` | high; BLOCH/BERMAN |
| `bureaucratic_offices` — Bureaucratic Offices | -400…600 | 500…720; all traditions | written_law | `practice:public_offices` | high; BLOCH/BERMAN |
| `capitularies` — Royal Capitularies | 650…900 | 760…920; Latin | written_law, diplomatic_correspondence | `rule:capitularies` | high; BLOCH/BERMAN |
| `diwan_administration` — Diwan Administration | 600…950 | 700…950; Islamic/Persianate | tax_assessment, bureaucratic_offices | `rule:diwan` | high; BLOCH/BERMAN |
| `themata_administration` — Thematic Administration | 600…950 | 720…960; Byzantine | land_registers, bureaucratic_offices | `rule:themata` | high; BLOCH/BERMAN |
| `feudal_oaths` — Feudal Oaths | 700…1050 | 850…1070; Latin/Caucasian | written_law | `rule:feudal_oaths` | high; BLOCH/BERMAN |
| `manorial_courts` — Manorial Courts | 750…1100 | 900…1110; Latin | land_registers, feudal_oaths | `rule:manorial_courts` | high; BLOCH/BERMAN |
| `customary_law` — Recorded Customary Law | 800…1150 | 950…1170; Latin/Slavic/Nordic | written_law | `rule:recorded_custom` | high; BLOCH/BERMAN |
| `royal_judges` — Itinerant Royal Judges | 900…1200 | 1030…1220; Latin/Byzantine | customary_law, diplomatic_correspondence | `rule:itinerant_justice` | high; BLOCH/BERMAN |
| `guild_charters` — Guild Charters | 900…1200 | 1030…1220; Latin/Byzantine/Islamic | merchant_guilds, written_law | `building:guildhall` | high; BLOCH/BERMAN |
| `authenticated_seals` — Authenticated Seals | 750…1100 | 900…1120; Byzantine/Islamic/Latin | diplomatic_correspondence | `rule:documentary_seals` | high; BLOCH/BERMAN |
| `royal_catalogue` — Royal Catalogue | 950…1200 | 1080…1230; Byzantine/Latin/Islamic | authenticated_seals, land_registers | `rule:royal_archive` | high; BLOCH/BERMAN |
| `exchequer_accounts` — Exchequer Accounts | 1050…1250 | 1140…1280; Latin/Islamic | tax_assessment, commercial_arithmetic | `rule:exchequer` | high; BLOCH/BERMAN |
| `common_law` — Royal Common Law | 1050…1250 | 1160…1290; Latin | royal_judges, customary_law | `rule:common_law` | high; BLOCH/BERMAN |
| `canon_law_collections` — Systematic Canon Law | 1000…1250 | 1130…1280; Latin/Byzantine | legal_studies, scriptoria | `rule:canon_law` | high; BLOCH/BERMAN |
| `urban_communes` — Urban Communes | 1000…1250 | 1120…1280; Latin/Byzantine | guild_charters, urban_markets | `rule:urban_communes` | high; BLOCH/BERMAN |
| `scutage` — Scutage | 1100…1250 | 1180…1300; Latin | feudal_oaths, exchequer_accounts | `rule:scutage` | high; BLOCH/BERMAN |
| `cadastral_surveys` — Cadastral Surveys | 1000…1300 | 1150…1320; Byzantine/Latin/Islamic | land_registers, geometry | `rule:cadastral_surveys` | high; BLOCH/BERMAN |
| `professional_bailiffs` — Professional Bailiffs | 1050…1300 | 1170…1320; Latin/Islamic | manorial_courts, exchequer_accounts | `career:administration` | high; BLOCH/BERMAN |
| `representative_estates` — Representative Estates | 1150…1350 | 1260…1380; Latin | urban_communes, feudal_oaths | `rule:representative_estates` | high; BLOCH/BERMAN |
| `royal_chancery` — Royal Chancery | 1000…1250 | 1120…1280; Byzantine/Latin/Islamic | royal_catalogue, authenticated_seals | `career:administration` | high; BLOCH/BERMAN |

### Warfare and fortification (34)

| ID and name | Attested | Base adoption; leading traditions | Prerequisites | Gameplay hook | Confidence; sources |
|---|---:|---|---|---|---|
| `spear_shield_drill` — Spear and Shield Drill | -1000…500 | -500…300; all traditions | — | `unit:levy` | high; DEVRIES/BACHRACH |
| `composite_bow` — Composite Bow | -1000…700 | -400…400; Steppe/Persianate/Islamic/Byzantine | — | `unit:archers` | high; DEVRIES/BACHRACH |
| `iron_weaponry` — Iron Weaponry | -1000…500 | -500…300; all traditions | bloomery_iron | `rule:iron_arms` | high; DEVRIES/BACHRACH |
| `scale_lamellar` — Scale and Lamellar Armor | -800…700 | 500…720; Steppe/Persianate/Byzantine/Islamic | iron_weaponry | `rule:lamellar_armor` | high; DEVRIES/BACHRACH |
| `torsion_artillery` — Torsion Artillery | -400…600 | 520…760; Byzantine/Islamic/Latin | geometry | `rule:torsion_engines` | high; DEVRIES/BACHRACH |
| `fortified_camps` — Fortified Camps | -500…600 | 500…700; all traditions | spear_shield_drill | `rule:fortified_camps` | high; DEVRIES/BACHRACH |
| `cavalry_saddles` — Framed Cavalry Saddles | 100…700 | 350…650; Steppe/Persianate/Byzantine | — | `unit:cavalry` | high; DEVRIES/BACHRACH |
| `stirrups` — Stirrup Cavalry | 400…800 | 520…820; Steppe/Persianate/Byzantine | cavalry_saddles | `rule:stirrup_cavalry` | high; DEVRIES/BACHRACH |
| `tagmata` — Tagmata | 750…950 | 760…930; Byzantine | cavalry_saddles, bureaucratic_offices | `unit:retinue` | high; DEVRIES/BACHRACH |
| `shield_walls` — Shield-Wall Tactics | 450…900 | 600…880; Nordic/Latin/Slavic/Byzantine | spear_shield_drill | `rule:shield_wall` | high; DEVRIES/BACHRACH |
| `ringworks` — Ringworks | 500…950 | 700…960; Latin/Slavic/Nordic | fortified_camps | `rule:ringworks` | high; DEVRIES/BACHRACH |
| `mail_hauberks` — Mail Hauberks | 300…1000 | 620…980; Latin/Nordic/Byzantine/Islamic | iron_weaponry | `rule:mail_armor` | high; DEVRIES/BACHRACH |
| `mounted_archery` — Mounted Archery | 200…900 | 450…850; Steppe/Persianate/Islamic/Byzantine | composite_bow, cavalry_saddles | `rule:mounted_archery` | high; DEVRIES/BACHRACH |
| `cavalry_lances` — Couched Cavalry Lance | 850…1150 | 980…1160; Latin/Byzantine | stirrups, mail_hauberks | `rule:lance_charge` | high; DEVRIES/BACHRACH |
| `castle_towers` — Flanking Castle Towers | 750…1100 | 900…1120; Byzantine/Islamic/Latin/Caucasian | ringworks, lime_mortar | `rule:flanking_towers` | high; DEVRIES/BACHRACH |
| `stone_castles` — Stone Castles | 850…1150 | 980…1170; Byzantine/Islamic/Latin/Caucasian | castle_towers, lime_mortar | `building:keep` | high; DEVRIES/BACHRACH |
| `crossbows` — Military Crossbows | 500…1100 | 850…1100; Byzantine/Islamic/Latin | iron_weaponry | `building:archery_butts` | high; DEVRIES/BACHRACH |
| `siege_engineering` — Siege Engineering | 650…1100 | 850…1120; Byzantine/Islamic/Persianate/Latin | torsion_artillery, geometry | `rule:siege_engineers` | high; DEVRIES/BACHRACH |
| `sapper_corps` — Organized Sappers | 750…1150 | 920…1160; Byzantine/Islamic/Persianate | siege_engineering | `rule:sappers` | high; DEVRIES/BACHRACH |
| `martial_drill` — Martial Drill | 750…1100 | 900…1120; Byzantine/Islamic/Latin/Nordic | shield_walls | `building:barracks` | high; DEVRIES/BACHRACH |
| `longbow_tactics` — Massed Longbow Tactics | 1050…1300 | 1160…1330; Latin | shield_walls | `rule:massed_longbows` | medium; DEVRIES/STRICKLAND |
| `pavise_formations` — Pavise Formations | 1050…1250 | 1160…1280; Byzantine/Latin/Islamic | crossbows, martial_drill | `rule:pavise_formations` | high; DEVRIES/BACHRACH |
| `counterweight_trebuchet` — Counterweight Trebuchet | 1050…1250 | 1130…1280; Byzantine/Islamic/Latin | siege_engineering | `rule:counterweight_trebuchet` | medium; DEVRIES/HILL |
| `concentric_defenses` — Concentric Defenses | 1050…1300 | 1180…1320; Byzantine/Islamic/Latin | stone_castles, castle_towers | `rule:concentric_castles` | high; DEVRIES/BACHRACH |
| `infantry_polearms` — Infantry Polearms | 1050…1300 | 1170…1320; Latin/Byzantine/Slavic | iron_weaponry, martial_drill | `rule:polearm_blocks` | high; DEVRIES/BACHRACH |
| `combined_arms` — Combined Arms | 1050…1300 | 1190…1330; Byzantine/Islamic/Latin/Steppe | martial_drill, any(cavalry_lances/mounted_archery) | `rule:combined_arms` | high; DEVRIES/BACHRACH |
| `professional_retinues` — Professional Retinues | 950…1250 | 1100…1280; Byzantine/Islamic/Latin | martial_drill, tax_assessment | `unit:retinue` | high; DEVRIES/BACHRACH |
| `naval_levies` — Organized Naval Levies | 800…1200 | 980…1230; Byzantine/Nordic/Islamic/Latin | harbor_works | `rule:naval_levies` | high; DEVRIES/BACHRACH |
| `incendiary_weapons` — Incendiary Weapons | 600…1100 | 780…1120; Byzantine/Islamic | distillation, siege_engineering | `rule:incendiaries` | medium; PRYOR/DEVRIES |
| `fortified_gates` — Advanced Gate Defenses | 850…1200 | 1010…1230; Byzantine/Islamic/Latin | castle_towers | `rule:fortified_gates` | high; DEVRIES/BACHRACH |
| `logistics_magazines` — Military Magazines | 900…1250 | 1050…1280; Byzantine/Islamic/Persianate | warehouses, tax_assessment | `rule:military_magazines` | high; DEVRIES/BACHRACH |
| `gunpowder_knowledge` — Gunpowder Knowledge | 1200…1320 | 1270…1380; Islamic/Persianate | algebra, distillation | `rule:gunpowder_experiment` | medium; NEEDHAM/DEVRIES |
| `plate_armor` — Plate Armor | 1250…1450 | 1300…1450; Latin/Byzantine | mail_hauberks, blast_furnace | `rule:plate_harness` | high; DEVRIES/BACHRACH |
| `gunpowder_artillery` — Gunpowder Artillery | 1280…1450 | 1320…1450; Islamic/Persianate/Latin | gunpowder_knowledge, bell_casting | `rule:siege_bombards` | medium; NEEDHAM/DEVRIES |

### Seafaring and navigation (18)

| ID and name | Attested | Base adoption; leading traditions | Prerequisites | Gameplay hook | Confidence; sources |
|---|---:|---|---|---|---|
| `mortise_tenon_shipbuilding` — Mortise-and-Tenon Shipbuilding | -1000…600 | 480…650; all traditions | — | `practice:shell_built_hulls` | high; UNGER/PRYOR |
| `square_sail` — Square Sails | -1000…600 | -400…350; all traditions | — | `practice:square_sails` | high; UNGER/PRYOR |
| `steering_oars` — Quarter Steering Oars | -700…700 | 480…680; all traditions | — | `practice:steering_oars` | high; UNGER/PRYOR |
| `coastal_piloting` — Coastal Piloting | -1000…700 | 480…650; all traditions | — | `practice:coastal_piloting` | high; UNGER/PRYOR |
| `sounding_lead` — Sounding Lead | -500…700 | 520…700; all traditions | coastal_piloting | `practice:soundings` | high; UNGER/PRYOR |
| `harbor_works` — Harbor Works | -500…700 | 500…720; all traditions | lime_mortar | `building:harbor` | high; UNGER/PRYOR |
| `clinker_shipbuilding` — Clinker Shipbuilding | 300…850 | 500…850; Nordic/Latin/Slavic/Baltic-Finnic | mortise_tenon_shipbuilding | `rule:clinker_hulls` | high; UNGER/PRYOR |
| `lateen_sail` — Lateen Sail | 200…850 | 500…850; Byzantine/Islamic/Northeast African | square_sail | `rule:lateen_rig` | high; UNGER/PRYOR |
| `dhow_construction` — Dhow Construction | 400…950 | 600…940; Islamic/Persianate/Northeast African | lateen_sail | `rule:dhow_routes` | high; UNGER/PRYOR |
| `longships` — Longships | 650…1000 | 730…990; Nordic/Baltic-Finnic | clinker_shipbuilding, square_sail | `rule:longships` | high; UNGER/PRYOR |
| `knarrs` — Ocean-Going Knarrs | 750…1050 | 830…1040; Nordic/Latin | clinker_shipbuilding, square_sail | `enterprise:fishing_boat_business` | high; UNGER/PRYOR |
| `celestial_navigation` — Celestial Navigation | 700…1100 | 850…1120; Islamic/Nordic/Byzantine | astronomical_observation, coastal_piloting | `rule:celestial_navigation` | high; UNGER/PRYOR |
| `naval_logbooks` — Sailing Directions | 850…1200 | 1000…1230; Islamic/Byzantine/Latin | scriptoria, coastal_piloting | `rule:sailing_directions` | high; UNGER/PRYOR |
| `convoy_systems` — Merchant Convoys | 850…1200 | 1010…1230; Byzantine/Islamic/Latin | merchant_guilds, naval_levies | `rule:merchant_convoys` | high; UNGER/PRYOR |
| `sternpost_rudder` — Sternpost Rudder | 1050…1250 | 1150…1280; Latin/Islamic | clinker_shipbuilding | `rule:sternpost_rudder` | high; UNGER/PRYOR |
| `mariners_compass` — Mariner’s Compass | 1050…1250 | 1160…1280; Islamic/Latin | celestial_navigation | `rule:mariners_compass` | medium; UNGER/NEEDHAM |
| `portolan_charts` — Portolan Charts | 1200…1320 | 1270…1380; Latin/Islamic | naval_logbooks, mariners_compass | `rule:portolan_charts` | medium; UNGER/CAMPBELL |
| `dry_docks` — Graving Docks | 900…1250 | 1070…1280; Byzantine/Islamic/Latin | harbor_works, stone_bridgebuilding | `building:arsenal` | high; UNGER/PRYOR |

## Candidate backlog

These 27 researched candidates are not live. Their omission is a design/content decision,
not a claim that they were unimportant.

| Candidate | Region and period | Summary and likely dependencies | Why excluded for now | Sources |
|---|---|---|---|---|
| Horseshoeing | Eurasia, c. 500–1000 | Nailed shoes protect hooves; `iron_weaponry` + `horse_collar`. | Archaeological chronology is uneven and its current benefit overlaps horse draft. | WHITE/ASTILL |
| Treadwheel crane | Byzantine and Latin cities, c. 900–1300 | Human-powered lifting for large works; `geometry` + `cooperage`. | Needs a construction-capacity mechanic rather than another build discount. | SINGER/GIES |
| Flying buttress | Latin West, c. 1100–1250 | External supports enable taller masonry; `ribbed_vaulting`. | Depends on the omitted architecture branch and cathedral content. | GIES/SINGER |
| Sugar refining | Islamic Mediterranean, c. 700–1200 | Mills and boiling refine cane juice; `irrigation_channels` + `powered_mills`. | The economy lacks regional crop and luxury-processing chains. | HILL/SINGER |
| Silk reeling workshops | Byzantine/Islamic worlds, c. 500–1200 | Specialized reeling and weaving; `horizontal_loom`. | Silk supply and court-industry mechanics are not yet modeled. | SINGER/LOPEZ |
| Rag-paper mills | Islamic and Latin worlds, c. 1100–1300 | Water power mechanizes pulp preparation; `paper_making` + `water_power`. | `paper_scholarship` currently abstracts supply scale. | BLOOM/SINGER |
| Woodblock printing | East and Central Asia, c. 700–1200 | Reproducible carved pages; `paper_making`. | Origin lies outside the playable political map and requires a printing system. | NEEDHAM/BLOOM |
| Movable type | East Asia, c. 1040 onward | Reusable type sorts; `woodblock_printing` + `lost_wax_casting`. | Outside-map origin and weak period transmission to the playable regions. | NEEDHAM/BLOOM |
| Eyeglasses | Italy, c. 1280–1320 | Corrective lenses for readers; `optics` + `glassblowing`. | Late boundary candidate; needs scholar longevity/productivity content. | LINDBERG/GRANT |
| Wheelbarrow | East Asia and later Latin Europe, c. 200–1300 | One-wheel load transport; `wheeled_carts`. | Diffusion route and independent European development remain disputed. | NEEDHAM/GIES |
| Qanat surveying | Persianate/Islamic regions, ancient–1200 | Subterranean water galleries; `irrigation_channels` + `geometry`. | Folded into irrigation and water-lifting practices at current granularity. | HILL/SINGER |
| Noria complexes | Islamic/Byzantine regions, ancient–1200 | Large water wheels raise irrigation and urban water; `water_lifting_devices` + `water_power`. | Folded into the two prerequisites and lacks a dedicated settlement rule. | HILL/SINGER |
| Traction trebuchet | Byzantine/Islamic/Steppe worlds, c. 500–1100 | Crew-pulled beam artillery; `siege_engineering`. | Current siege engineering bridges torsion engines to counterweight trebuchets. | DEVRIES/HILL |
| Greek-fire apparatus | Byzantine Mediterranean, c. 670–1200 | Projectors deliver incendiary mixtures; `distillation` + `naval_levies`. | `incendiary_weapons` intentionally avoids claiming a recoverable secret recipe. | PRYOR/DEVRIES |
| Cog construction | North and Baltic seas, c. 900–1300 | Broad cargo hull with high sides; `clinker_shipbuilding` + `sternpost_rudder`. | No hull-class roster; `knarrs` and rudders cover the present trade hooks. | UNGER/PRYOR |
| Magnetic declination tables | Islamic/Latin navigation, c. 1200–1400 | Correct compass bearings against observed variation; `mariners_compass` + `naval_logbooks`. | Evidence and useful adoption are mostly beyond the core period. | CAMPBELL/UNGER |
| Paper currency | East/Central Asia, c. 900–1300 | State-backed paper instruments circulate value; `paper_making` + `tax_assessment`. | Outside-map institutional origin and incompatible with the current coin-price model. | NEEDHAM/SPUFFORD |
| Tide mills | Atlantic Europe, c. 600–1300 | Impounded tides drive horizontal waterwheels; `water_power` + `harbor_works`. | The single mill building does not distinguish river, tidal, or other power sites. | MCERLEAN/GIES |
| Organized salterns | European and Mediterranean coasts and brine districts, ancient–1300 | Evaporation ponds, brine hearths, and open pans produce salt at settlement scale; `wheel_thrown_pottery` + `cooperage`. | Salt is a historical provisions/flow endowment, but not a distinct commodity or producible enterprise. | SALTERNS/HOFFMANN |
| Stained-glass workshops | Latin and Byzantine worlds, c. 800–1300 | Colored sheet glass, vitreous paint, lead cames, and solder form monumental windows; `glassblowing` + `lime_mortar`. | Buildings have no decoration, fabric, or monument-prestige upgrade layer. | THEOPHILUS/GIES |
| Water clocks and court automata | Byzantine and Islamic worlds, c. 800–1200 | Floats, siphons, gears, and regulated water flows drive clocks and display mechanisms; `water_lifting_devices` + `geometry` + `astronomical_observation`. | The game has neither civic timekeeping nor a court commission and mechanical-display system. | HILL/SINGER |
| Birch-bark documents | Rus’, c. 1000–1300 | Prepared birch bark supports inexpensive letters, accounts, and ordinary written communication; `classical_grammar`. | Literacy is modeled through codices, parchment, and paper rather than regional everyday writing media. | FRANKLIN/GRANT |
| Hammams and heated public baths | Byzantine and Islamic cities, c. 500–1300 | Furnaces, heated rooms, piped water, and drainage sustain public bathing; `irrigation_channels` + `lime_mortar` + `soap_boiling`. | A bathhouse exists only as a modding example; the live game lacks urban public works and hygiene buildings. | PETERSEN/HILL |
| Malting kilns and commercial brewing | Europe, c. 500–1300 | Controlled germination and kiln drying prepare grain for dependable brewing; `quern_stones` + `cooperage`. | The broad provisions basket includes ordinary drink, but there is no brewery enterprise, distinct drink commodity, or grain-processing chain. | PATRICK/GIES |
| Mordant textile dyeing | Europe, North Africa, and the Middle East, ancient–1300 | Madder, weld, woad, alum, and controlled dye baths produce durable colored cloth; `horizontal_loom` + `commercial_arithmetic`. | Dyed cloth is a household standard, but dye crops, mordants, and workshop quality are not modeled. | CARDON/SINGER |
| Updraft pottery and tile kilns | Europe and the Mediterranean, c. 900–1300 | Reintroduced updraft firing supports specialized pottery, roof tile, and decorated floor-tile industries; `wheel_thrown_pottery` + `improved_furnaces`. | Existing pottery technologies abstract firing and the game has no ceramic or architectural-tile production chain. | MCCARTHY/SINGER |
| Wall fireplaces and chimneys | Latin Europe, c. 1100–1300 | Wall hearths, smoke hoods, and flues move smoke outside increasingly divided elite buildings; `lime_mortar`. | Adoption remains elite and late near the game boundary, while household architecture, comfort, and indoor-air quality are not modeled. | GIES/SINGER |

## Bibliography and source codes

- **ASTILL** — Grenville Astill and John Langdon, eds., *Medieval Farming and
  Technology: The Impact of Agricultural Change in Northwest Europe* (Brill, 1997).
- **BACHRACH** — Bernard S. Bachrach and David S. Bachrach,
  [*Warfare in Medieval Europe c.400–c.1453*](https://www.routledge.com/Warfare-in-Medieval-Europe-c400-c1453/Bachrach-Bachrach/p/book/9780367470197)
  (Routledge, 2021).
- **BERMAN** — Harold J. Berman, *Law and Revolution: The Formation of the Western
  Legal Tradition* (Harvard University Press, 1983).
- **BLOCH** — Marc Bloch, *Feudal Society*, trans. L. A. Manyon (Routledge, 1961).
- **BLOOM** — Jonathan M. Bloom, *Paper Before Print: The History and Impact of Paper
  in the Islamic World* (Yale University Press, 2001).
- **CAMPBELL** — Tony Campbell, “Portolan Charts from the Late Thirteenth Century to
  1500,” in J. B. Harley and David Woodward, eds., *The History of Cartography*, vol. 1
  (University of Chicago Press, 1987).
- **CARDON** — Dominique Cardon, *Natural Dyes: Sources, Tradition, Technology and
  Science* (Archetype Publications, 2007).
- **CIPOLLA** — Carlo M. Cipolla, *Clocks and Culture, 1300–1700* (Norton, 1978).
- **DE_ROOVER** — Raymond de Roover, *Money, Banking and Credit in Mediaeval Bruges*
  (Mediaeval Academy of America, 1948).
- **DEVRIES** — Kelly DeVries and Robert Douglas Smith, *Medieval Military Technology*,
  2nd ed. (University of Toronto Press, 2012).
- **FEUERBACH** — Ann Feuerbach, “Crucible Damascus Steel: A Fascination for Almost
  2,000 Years,” *JOM* 58, no. 5 (2006), 48–50.
- **FRANKLIN** — Simon Franklin, *Writing, Society and Culture in Early Rus,
  c. 950–1300* (Cambridge University Press, 2002).
- **GIES** — Frances and Joseph Gies, *Cathedral, Forge, and Waterwheel: Technology and
  Invention in the Middle Ages* (HarperCollins, 1994), used with the more technical
  SINGER synthesis.
- **GRANT** — Edward Grant, ed., *A Source Book in Medieval Science* (Harvard
  University Press, 1974).
- **HILL** — Donald R. Hill, *Islamic Science and Engineering* (Edinburgh University
  Press, 1993).
- **HOFFMANN** — Richard C. Hoffmann, *An Environmental History of Medieval Europe*
  (Cambridge University Press, 2014).
- **IFRA** — Georges Ifrah, *The Universal History of Numbers* (Wiley, 2000), used
  alongside RASHED for medieval mathematical transmission.
- **LANDES** — David S. Landes, *Revolution in Time: Clocks and the Making of the Modern
  World* (Harvard University Press, 1983).
- **LINDBERG** — David C. Lindberg,
  [*The Beginnings of Western Science*](https://press.uchicago.edu/ucp/books/book/chicago/B/bo5550077),
  2nd ed. (University of Chicago Press, 2007).
- **LOPEZ** — Robert S. Lopez,
  [*The Commercial Revolution of the Middle Ages, 950–1350*](https://www.cambridge.org/core/books/commercial-revolution-of-the-middle-ages-9501350/27C2AF7F2C913BADCDC29631B71EA7BF)
  (Cambridge University Press, 1976).
- **MAKDISI** — George Makdisi, *The Rise of Colleges: Institutions of Learning in
  Islam and the West* (Edinburgh University Press, 1981).
- **MCCARTHY** — Michael R. McCarthy and Catherine M. Brooks, *Medieval Pottery in
  Britain AD 900–1600* (Leicester University Press, 1988).
- **MCERLEAN** — Thomas McErlean and Norman Crothers, *Harnessing the Tides: The Early
  Medieval Tide Mills at Nendrum Monastery, Strangford Lough* (TSO Northern Ireland,
  2007).
- **NEEDHAM** — Joseph Needham et al., *Science and Civilisation in China*, especially
  vols. 4–5 (Cambridge University Press, 1965–1986).
- **PATRICK** — Amber Patrick, *The Buildings of the Malting Industry: The Production
  of Malt from Prehistory to the 21st Century* (Liverpool University Press and Historic
  England, 2023).
- **PETERSEN** — Andrew Petersen, *Dictionary of Islamic Architecture* (Routledge,
  1996).
- **PORMANN** — Peter E. Pormann and Emilie Savage-Smith, *Medieval Islamic Medicine*
  (Edinburgh University Press, 2007).
- **PRYOR** — John H. Pryor,
  [*Geography, Technology, and War: Studies in the Maritime History of the
  Mediterranean, 649–1571*](https://www.cambridge.org/core/product/identifier/CBO9780511562501A012/type/BOOK_PART)
  (Cambridge University Press, 1988).
- **RASHDALL** — Hastings Rashdall, *The Universities of Europe in the Middle Ages*,
  rev. F. M. Powicke and A. B. Emden (Oxford University Press, 1936).
- **RASHED** — Roshdi Rashed, *The Development of Arabic Mathematics: Between
  Arithmetic and Algebra* (Kluwer, 1994).
- **RAMMELSBERG** — UNESCO World Heritage Centre,
  [*Mines of Rammelsberg, Historic Town of Goslar and Upper Harz Water Management
  System*](https://whc.unesco.org/en/list/623/), consulted 2026.
- **SALTERNS** — Historic England,
  [*Pre-industrial Salterns: Introductions to Heritage Assets*](https://historicengland.org.uk/images-books/publications/iha-preindustrial-salterns/heag225-pre-industrial-salterns/),
  2025.
- **SINGER** — Charles Singer et al., eds., *A History of Technology*, vol. 2,
  *The Mediterranean Civilizations and the Middle Ages* (Oxford University Press, 1956).
- **SPUFFORD** — Peter Spufford, *Money and Its Use in Medieval Europe* (Cambridge
  University Press, 1988).
- **STRICKLAND** — Matthew Strickland and Robert Hardy, *The Great Warbow: From Hastings
  to the Mary Rose* (Sutton, 2005).
- **THEOPHILUS** — Theophilus, *On Divers Arts*, trans. John G. Hawthorne and Cyril
  Stanley Smith (University of Chicago Press, 1963).
- **UNGER** — Richard W. Unger, *The Ship in the Medieval Economy, 600–1600* (Croom
  Helm, 1980).
- **WHITE** — Lynn White Jr., *Medieval Technology and Social Change* (Oxford
  University Press, 1962), used as a historiographic starting point and paired with
  later archaeological scholarship where its diffusion theses are disputed.

For cross-domain chronology and terminology, the catalogue also uses the
[*Cambridge History of Science*, volume 2, Medieval Science](https://www.cambridge.org/core/books/cambridge-history-of-science/F9FB54BD248B3808FC86ABBBAEE34A39)
and the
[*Oxford Handbook of Engineering and Technology in the Classical
World*](https://academic.oup.com/edited-volume/28003) for inherited foundations.
