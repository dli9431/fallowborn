/* =========================================================================
   Fallowborn — historical technology catalogue, 476–1300

   Technology is a prerequisite graph with soft historical timing. Definitions
   are expanded here from compact authored rows so every live entry exposes the
   same public data contract to the engine and runtime mods.
   ========================================================================= */
window.FBDATA = window.FBDATA || {};

(function () {
  'use strict';

  FBDATA.techDomains = {
    agriculture:{ name:'Agriculture and animal power', icon:'🌾', order:0 },
    crafts:{ name:'Crafts, materials, and industry', icon:'⚒', order:1 },
    commerce:{ name:'Commerce, transport, and infrastructure', icon:'⚖', order:2 },
    learning:{ name:'Learning, medicine, and natural knowledge', icon:'📚', order:3 },
    governance:{ name:'Governance, law, and institutions', icon:'📜', order:4 },
    warfare:{ name:'Warfare and fortification', icon:'⚔', order:5 },
    seafaring:{ name:'Seafaring and navigation', icon:'⛵', order:6 }
  };

  FBDATA.techTraditions = {
    latin:{
      name:'Latin West',
      cultures:[
        'frankish','german','norman','english','gaelic','brezhon',
        'iberian','italian','lombard','occitan','basque'
      ],
      religions:['catholic']
    },
    byzantine:{
      name:'Byzantine',
      cultures:['greek','syriac'],
      religions:['orthodox']
    },
    islamic:{
      name:'Islamic Mediterranean',
      cultures:['arabic','andalusi','berber'],
      religions:['sunni','shia']
    },
    persianate:{ name:'Persianate', cultures:['persian'], religions:[] },
    slavic:{ name:'Slavic', cultures:['slavic','rus'], religions:['slavic_pagan'] },
    nordic:{ name:'Nordic', cultures:['norse'], religions:['norse_pagan'] },
    steppe:{ name:'Steppe', cultures:['magyar','turkic','khazar'], religions:['tengri'] },
    baltic_finnic:{
      name:'Baltic-Finnic', cultures:['baltic','finnic','sami'],
      religions:['baltic_pagan']
    },
    caucasian:{ name:'Caucasian', cultures:['armenian','georgian'], religions:[] },
    northeast_african:{
      name:'Northeast African', cultures:['nubian','coptic'], religions:[]
    }
  };

  /* All accumulated scalar effects are clamped by the engine. Inherited
     foundations deliberately carry few scalar bonuses: they describe the
     ordinary 867 baseline instead of inflating it. */
  FBDATA.techCaps = {
    tax:0.35, levy:0.35, battle:0.15, devCap:4, health:0.03,
    research:5, domain:2, siege:0.35, movement:0.25, seaMovement:0.40,
    education:0.20, finance:0.30, trade:0.30, supply:0.25,
    populationCapacity:0.35, populationCrisisProtection:0.10, migrationAttraction:3,
    costFloor:{ build:0.55, enterprise:0.55, training:0.65 },
    units:{ levy:250, arch:200, cav:160, ret:160 },
    aiUnits:{ arch:0.20, cav:0.20, ret:0.20 }
  };

  /* Forward-only design ledger. The v1.127.1 audit is the baseline: older
     capabilities do not need a metadata backfill. Every independently
     gateable core capability added or materially expanded after that audit
     records one hard/soft/none decision here. This is authoring metadata;
     live eligibility remains on the owning definition's `requiresTech` or
     consumed technology effect. */
  FBDATA.techImpactReviews = {
    baselineVersion:'1.127.1',
    features:{
      serf_freedom_petition:{
        mode:'none',
        rationale:'A serf asking an existing lord for terms is a baseline social and legal action, not a capability unlocked by sovereign research.'
      },
      recurring_local_event_participants:{
        mode:'none',
        rationale:'Remembering the exact local people involved in customary burdens, village disputes, and testimony is baseline social continuity, not a capability unlocked by sovereign research.'
      },
      serf_freedom_advocacy:{
        mode:'none',
        rationale:'A known local officer or priest supporting a serf’s petition is a baseline personal and legal relationship, not an advanced capability unlocked by sovereign research.'
      },
      family_freedom_record:{
        mode:'none',
        rationale:'Remembering how a household first became free is family history and presentation, not a technology-gated capability.'
      },
      broad_family_succession:{
        mode:'none',
        rationale:'Choosing a living relative to continue the playable household and house is a baseline family and social decision, not a capability unlocked by sovereign research.'
      },
      individual_family_manumission:{
        mode:'none',
        rationale:'Redeeming a named bound relative from an existing lord is a baseline personal and legal recovery action, not a capability unlocked by sovereign research.'
      },
      negative_household_gold:{
        mode:'none',
        rationale:'Household cash shortfalls are a baseline consequence of losses, commitments, and incurred obligations, not an optional capability or a financial technique unlocked by sovereign research.'
      },
      persistent_serf_tenure:{
        mode:'none',
        rationale:'Household tenure, customary service, and awareness of local obligations are baseline social conditions, not capabilities unlocked by sovereign research.'
      },
      regional_serf_tenure:{
        mode:'none',
        rationale:'Formation-time household and home context changes the description of baseline serf work and obligations; it is not an optional capability unlocked by sovereign research.'
      },
      serf_tenure_authority_review:{
        mode:'none',
        rationale:'A household responding when its existing local or political authority changes is a baseline social and customary consequence, not a capability unlocked by sovereign research.'
      },
      minor_household_standard_reduction:{
        mode:'none',
        rationale:'A child household head or landed ruler giving up an inherited household standard within the floor allowed by their station is a baseline recovery control; no innovation credibly unlocks abandoning an expense.'
      },
      landed_household_standards:{
        mode:'none',
        rationale:'Ruler households maintaining the same living standards and work outfits as commoner households needs no separate innovation; every purchased level retains its existing authored technology requirement.'
      },
      ruler_household_establishments:{
        mode:'hard',
        tech:[
          'annual_fairs','bills_of_exchange','bureaucratic_offices','census_records',
          'double_entry_bookkeeping','mail_hauberks','martial_drill',
          'paved_causeways','professional_retinues','road_surveys','royal_chancery',
          'scholarly_networks','scriptoria','three_field','universities'
        ],
        fallback:'existing_household_standards',
        rationale:'The existing household catalogue remains available, while each optional ruler-grade living standard and guard, scholarly, or chancery establishment stays visible behind the specific practice needed to establish it and remains grandfathered once purchased.'
      },
      enterprise_hired_labor:{
        mode:'none',
        rationale:'Hiring a qualified local worker for an owned household enterprise is a baseline labor contract with recurring pay, not an advanced capability unlocked by national research. Work & Enterprises therefore remains available at every adult station, while individual enterprise requirements keep their authored technology gates.'
      },
      enterprise_upgrades:{
        mode:'hard',
        tech:[
          'annual_fairs','bills_of_exchange','double_entry_bookkeeping','dry_docks',
          'heavy_plough','improved_furnaces','improved_husbandry','letters_of_credit',
          'powered_mills','sternpost_rudder','three_field'
        ],
        fallback:'baseline_enterprise',
        rationale:'Each optional expansion represents a specific advanced practice or organization, remains visible with its exact requirement, preserves the working baseline enterprise, and grandfathers completed levels.'
      },
      county_population_demographics:{
        mode:'soft',
        tech:[
          'crop_rotation','manuring','irrigation_channels','seed_selection',
          'heavy_plough','open_field_system','three_field','water_meadows',
          'improved_husbandry','legume_rotation','herbals','hospitals',
          'medical_canons','road_surveys','paved_causeways'
        ],
        rationale:'Demographic capacity, attraction, and crisis resilience improve with agricultural, medical, and transport innovations, while baseline population functions without them.'
      },
      settlement_dynamic_rents:{
        mode:'soft',
        tech:[
          'undershot_watermill','urban_markets','harbor_works','stone_bridgebuilding',
          'standardized_coinage','tax_assessment','exchequer_accounts','scutage',
          'heavy_plough','three_field'
        ],
        rationale:'Baseline land rents and settlement values function universally, while agricultural innovations expand demographic carrying capacity, commerce tech unlocks advanced settlement buildings, and fiscal tech scales realm taxation.'
      },
      earned_starting_stations:{
        mode:'none',
        rationale:'Starting-station unlocks are browser-profile recognition of ranks earned in earlier lives, outside the simulated world; no historical innovation credibly governs them.'
      },
      estates_scutage:{
        mode:'hard', tech:['scutage'], fallback:'customary_service',
        rationale:'Advanced cash substitution for customary military service.'
      },
      formal_market_charters:{
        mode:'hard', tech:['urban_markets','authenticated_seals'],
        fallback:'ordinary_markets_and_toll_disputes',
        rationale:'Every source of a protected market charter requires both an urban market practice and an authenticated public seal.'
      },
      formal_confirmation_of_custom:{
        mode:'hard', tech:['customary_law'], fallback:'ordinary_custom_and_aid_redress',
        rationale:'Written confirmation is distinct from unwritten local custom and ordinary fiscal redress.'
      },
      consent_of_estates:{
        mode:'hard', tech:['representative_estates'], fallback:'ordinary_estates_motions',
        rationale:'Permanent assembly consent is an advanced representative rule, not a prerequisite for an Estates session.'
      },
      confirmation_of_great_offices:{
        mode:'hard', tech:['representative_estates'], fallback:'appointed_royal_council',
        rationale:'Confirmation votes formalize offices that otherwise remain crown appointments.'
      },
      direct_vassal_charter_of_liberties:{
        mode:'hard', tech:['customary_law','authenticated_seals'],
        fallback:'other_service_charters',
        rationale:'A durable liberties charter requires recorded law and an authenticated seal.'
      },
      family_land_grants:{
        mode:'none',
        rationale:'Enfeoffing an adult relative, adding demesne counties to an existing direct vassal, and recognizing a completed duchy at ducal rank are baseline dynastic and feudal patronage rather than advanced capabilities; optional service charters retain their own authored technology requirements.'
      },
      royal_religious_tolerance_policy:{
        mode:'none',
        rationale:'Tolerance and persecution are social and confessional prerogatives of the crown; no innovation credibly unlocks or improves proclaiming them.'
      },
      royal_settlement_policy:{
        mode:'none',
        rationale:'Closing or inviting settlement is a royal proclamation exercised through existing county modifiers, migration draw, and development; the baseline needs no research and no credible dependency belongs here.'
      },
      tournament_jousting:{
        mode:'hard', tech:['cavalry_lances'], fallback:'melee_attendance_patronage_or_wagers',
        rationale:'Formal couched-lance competition depends on the matching cavalry practice.'
      },
      guild_smith_path:{
        mode:'none',
        rationale:'Smith is the baseline Craft guild path and inherits the Craft career’s existing ironworking requirement.'
      },
      guild_weaver_path:{
        mode:'hard', tech:['horizontal_loom'], fallback:'smith_or_cooper_guild_path',
        rationale:'A permanent weaving specialty depends on the horizontal loom while other Craft paths remain available.'
      },
      guild_cooper_path:{
        mode:'hard', tech:['cooperage'], fallback:'smith_or_weaver_guild_path',
        rationale:'A permanent cooperage specialty depends on its barrel-making practice while other Craft paths remain available.'
      },
      guild_broker_path:{
        mode:'none',
        rationale:'Broker is the baseline Trade guild path and inherits the Trade career’s public weights-and-measures requirement.'
      },
      guild_caravan_factor_path:{
        mode:'hard', tech:['trade_houses'], fallback:'broker_or_maritime_guild_path',
        rationale:'A permanent caravan-factor specialty depends on organized trade houses while other Trade paths remain available.'
      },
      guild_maritime_factor_path:{
        mode:'hard', tech:['coastal_piloting'], fallback:'broker_or_caravan_guild_path',
        rationale:'A maritime-factor specialty depends on coastal piloting without tying the path to one culture’s ship type.'
      },
      bounded_market_auctions:{
        mode:'none',
        rationale:'Immediate household bidding is broad market play; individual lot families keep their own requirements.'
      },
      county_community_identity:{
        mode:'none',
        rationale:'Choosing an authored local culture and faith is baseline character identity, not a capability enabled by research.'
      },
      local_marriage_prospect_identity:{
        mode:'none',
        rationale:'Local courtship networks and mixed household identities are baseline social behavior with no credible technology dependency.'
      },
      descendant_betrothal_replacement:{
        mode:'none',
        rationale:'Arranging or revising a managed descendant’s pledge is baseline household and social authority, not a capability created by research.'
      },
      player_initiated_royal_family_matches:{
        mode:'none',
        rationale:'Negotiating a marriage between a managed descendant and an accessible royal family is baseline dynastic diplomacy, not a capability created by research.'
      },
      auction_item_lots:{
        mode:'none',
        rationale:'Fine and famed household goods need no additional innovation beyond access to the auction itself.'
      },
      auction_enterprise_lots:{
        mode:'none',
        rationale:'Enterprise lots inherit the selected enterprise’s existing technology requirement instead of adding an auction-wide gate.'
      },
      auction_title_rights:{
        mode:'hard', tech:['notarial_contracts'], fallback:'fabricate_claim_or_use_existing_war_rights',
        rationale:'Selling a county title right requires durable notarial transfer, while ordinary claims and other auction lots remain available.'
      },
      fort_construction:{
        mode:'hard', tech:['ringworks'], fallback:'unfortified_settlement',
        rationale:'A route-blocking local strongpoint requires the earth-and-timber ringwork tradition; ordinary settlements remain available without one.'
      },
      towered_stronghold_upgrade:{
        mode:'hard', tech:['castle_towers'], fallback:'ringwork',
        rationale:'Flanking towers create a separately stronger obstacle while an existing ringwork remains fully usable.'
      },
      stone_castle_upgrade:{
        mode:'hard', tech:['stone_castles'], fallback:'towered_stronghold',
        rationale:'Masonry fortification is an advanced upgrade; the previous towered stronghold remains active during and after any technology loss.'
      },
      concentric_fortress_upgrade:{
        mode:'hard', tech:['concentric_defenses','fortified_gates'],
        fallback:'stone_castle',
        rationale:'The final independently gateable tier requires both layered defenses and advanced gates while the stone castle remains the fallback.'
      },
      rare_auction_invitations:{
        mode:'none',
        rationale:'The rare invitation is an alternate route into the same cooldown-controlled auction, not a separate advanced market institution.'
      },
      county_goods_markets:{
        mode:'soft', tech:['urban_markets','trade_houses'],
        rationale:'Ordinary local exchange is universal; established markets and trade houses improve distribution capacity without blocking access.'
      },
      item_shop:{
        mode:'soft', tech:['urban_markets'],
        rationale:'The town and city gear stall is available without research; established urban markets widen its seasonal stock and shift its quality upward.'
      },
      legendary_artifacts:{
        mode:'none',
        rationale:'Faith- and culture-gated legendary objects draw on myth and religious provenance; no technology credibly unlocks or improves them.'
      },
      commodity_ventures:{
        mode:'none',
        rationale:'Selecting a commodity expands the existing venture and does not create a separately advanced form of exchange.'
      },
      chartered_trade_corridors:{
        mode:'hard', tech:['guild_charters'], fallback:'ordinary_commodity_ventures',
        rationale:'Exclusive route protection depends on formal guild charters while ordinary commodity ventures remain visible and available.'
      },
      trade_venture_return_cargo:{
        mode:'none',
        rationale:'Baseline return cargo is an ordinary merchant commodity purchase at destination markets available to any accompanied trade traveler.'
      },
      soldier_command_assignments:{
        mode:'none',
        rationale:'Scouting, rearguard, and peacetime drill stories extend the existing Soldiering career, which already inherits its own spear-and-drill technology requirement; leading a small party needs no separate innovation.'
      },
      physician_practice_stories:{
        mode:'none',
        rationale:'Outbreaks, bedside calls, and the Book of Remedies ride the existing Medicine career and Physician specialty, which carry their own Herbals and Physicians gates; the stories add no separately gateable capability.'
      },
      learned_master_works:{
        mode:'none',
        rationale:'The Star Tables and commissioned treatises are reachable only through master specialties that already carry Scriptoria and Astrolabe gates; the durable works themselves add no new research dependency.'
      },
      mercenary_contracts:{
        mode:'none',
        rationale:'A sustained paid-service contract with a warring realm is personal military service extended over seasons; no innovation credibly unlocks or improves selling a sword.'
      },
      adventuring_expeditions:{
        mode:'none',
        rationale:'Foreign expeditions reuse ordinary travel, whose transport standards already carry the technology interaction; seeing foreign lands needs no separate research gate.'
      },
      commoner_frontier_settlement:{
        mode:'none',
        rationale:'Withdrawing into an empty wasteland and proving a homestead is a core recovery and life-path choice for freeholders and gentry; it rides ordinary travel, holdings, and the shared wasteland materialization, and no innovation credibly unlocks walking onto empty land.'
      },
      gentry_freehold_expansion:{
        mode:'none',
        rationale:'Continuing to buy ordinary family plots after declaring a manor extends baseline property accumulation across adjacent commoner ranks; no innovation credibly gates buying land already offered in the local market.'
      },
      building_university:{
        mode:'hard', tech:['universities'], fallback:'library',
        rationale:'Corporate university centers require organized universities knowledge; ordinary libraries remain available.'
      },
      building_cathedral:{
        mode:'hard', tech:['ribbed_vaulting'], fallback:'temple',
        rationale:'Monumental Gothic cathedrals and great mosques require ribbed vaulting; ordinary great temples remain available.'
      },
      building_guildhall:{
        mode:'hard', tech:['guild_charters'], fallback:'market',
        rationale:'Civic guildhalls require formal guild charters; ordinary markets remain available.'
      },
      building_arsenal:{
        mode:'hard', tech:['dry_docks'], fallback:'harbor',
        rationale:'Naval arsenals require dry dock engineering; ordinary harbors remain available.'
      },
      building_foundry:{
        mode:'hard', tech:['blast_furnace'], fallback:'barracks',
        rationale:'Foundry works require blast furnace technology; ordinary barracks and smiths remain available.'
      },
      building_windmill:{
        mode:'soft', tech:['windmill'],
        rationale:'Windmills expand mechanical milling to ridge and plain settlements while watermills remain available.'
      },
      building_hospital:{
        mode:'soft', tech:['hospitals'],
        rationale:'Endowed hospital buildings expand crisis and epidemic protection.'
      },
      building_exchange:{
        mode:'hard', tech:['bills_of_exchange'], fallback:'market',
        rationale:'Merchant exchanges require bills of exchange and international credit; ordinary markets remain available.'
      },
      late_medieval_warfare_gear:{
        mode:'soft', tech:['plate_armor','gunpowder_artillery'],
        rationale:'Plate harness and early bombards enhance battlefield shock and siege capability without replacing the unit taxonomy.'
      },
      late_medieval_crafts_commerce:{
        mode:'soft', tech:['spinning_wheel','marine_insurance','deep_shaft_mining'],
        rationale:'Spinning wheels, marine insurance, and deep mining improve productivity and risk management across late-game economies.'
      },
      overseas_raiding:{
        mode:'hard', tech:['longships'], fallback:'coastal_and_border_raiding',
        rationale:'Trans-oceanic and upriver inland raiding requires specialized clinker longships, while baseline coastal and overland border reaving operates with basic transport.'
      },
      mounted_raiding:{
        mode:'soft', tech:['mounted_archery','cavalry_lances'],
        rationale:'Cavalry innovations expand overland raiding range, speed, and carry capacity.'
      },
      raiding_navigation:{
        mode:'soft', tech:['celestial_navigation','naval_logbooks','mariners_compass'],
        rationale:'Navigational arts extend maximum raid range across sea zones and reduce expedition hazards.'
      },
      raiding_party_scale:{
        mode:'soft', tech:['shield_walls','martial_drill','professional_retinues','logistics_magazines'],
        rationale:'Martial and logistics innovations improve raiding host discipline against garrisons and increase plunder capacity.'
      },
      faith_conversion:{
        mode:'none',
        rationale:'Deliberate conversion of self, household, or realm to another faith is a personal and political act; rulers and households converted throughout the period regardless of literacy or legal innovations, so no technology credibly gates or improves it.'
      },
      culture_adoption:{
        mode:'none',
        rationale:'Adopting another people’s language and customs is a personal and social act with no credible technology dependency; courts and households assimilated long before any researched practice.'
      },
      field_supply_attrition:{
        mode:'soft', tech:['pack_saddles','wheeled_carts','logistics_magazines'],
        rationale:'Every field host carries supply, refills it on friendly land, and starves abroad from the baseline; pack, cart, and magazine innovations stretch how long a campaign can range before attrition bites.'
      },
      terrain_combat_modifiers:{
        mode:'none',
        rationale:'Terrain battle factors, home-ground defense, and march costs apply to every host in every age; no credible period technology gates reading the ground, so no dependency is invented.'
      },
      new_unit_classes:{
        mode:'hard',
        tech:['crossbows','infantry_polearms','cataphract_armor'],
        fallback:'baseline_five_unit_classes',
        rationale:'Crossbow, pike, and cataphract companies join the muster only after their named innovations; every realm fields the baseline levy, archer, cavalry, retinue, and mercenary classes without them, and hosts already fielded keep their composition after any technology loss.'
      },
      culture_unit_classes:{
        mode:'none',
        rationale:'Horse-archer, huscarl, and camel-rider companies gate on the mustering realm’s culture alone; no period technology credibly blocks a people’s traditional arm, so no dependency is invented.'
      },
      war_justification_selection:{
        mode:'none',
        rationale:'Choosing among legal bases the ruler already holds is core declaration judgment; the rights retain their existing eligibility, and no technology credibly governs selecting which valid claim to press.'
      },
      host_splitting_encirclement:{
        mode:'none',
        rationale:'Splitting and merging field hosts, and the destruction of a host shattered while cut off, are core play available from the baseline; no credible period technology gates dividing an army or reading whether a road home remains, so no dependency is invented.'
      },
      unit_attack_defense_roles:{
        mode:'none',
        rationale:'Attack and defense values are intrinsic doctrine of each unit class in core battle resolution, available to every realm from the baseline; no period technology credibly blocks a class fighting differently on the attack than on the defense, so no dependency is invented.'
      },
      data_defined_deeds:{
        mode:'none',
        rationale:'The bounded mod-authoring facility, including its reviewed resource-choice picker, is not an in-world capability and has no credible technology dependency; individual declarative deeds and choices may retain their own explicit technology requirements.'
      },
      data_defined_focuses:{
        mode:'none',
        rationale:'The bounded mod-authoring facility, including explicit deterministic fallback selection, is not an in-world capability and has no credible technology dependency; individual declarative focuses may retain their own explicit technology requirements.'
      },
      professional_replacement_cohorts:{
        mode:'none',
        rationale:'Re-drilling slain professionals at a reinforcement premium is core war play owned by the realm; the unit classes themselves already carry their technology gates, so a second gate on replacing them would double-lock the same content.'
      }
    }
  };

  var TRADITIONS = [
    'latin','byzantine','islamic','persianate','slavic','nordic',
    'steppe','baltic_finnic','caucasian','northeast_african'
  ];
  var OFFSETS = {
    latin:20, byzantine:0, islamic:0, persianate:10, slavic:35,
    nordic:40, steppe:30, baltic_finnic:55, caucasian:25,
    northeast_african:35
  };
  var DOMAIN_SOURCE = {
    agriculture:['ASTILL','WHITE'],
    crafts:['GIES','SINGER'],
    commerce:['LOPEZ','SPUFFORD'],
    learning:['GRANT','LINDBERG'],
    governance:['BLOCH','BERMAN'],
    warfare:['DEVRIES','BACHRACH'],
    seafaring:['UNGER','PRYOR']
  };

  function spread(attestedFrom, emergence, widespread, leaders) {
    var adoption = {
      default:[
        Math.max(attestedFrom, emergence),
        Math.max(attestedFrom, widespread)
      ]
    };
    leaders = leaders || [];
    for (var i = 0; i < TRADITIONS.length; i++) {
      var id = TRADITIONS[i];
      var offset = OFFSETS[id] || 0;
      if (leaders.indexOf(id) >= 0) offset -= 70;
      var start = Math.max(attestedFrom, emergence + offset);
      adoption[id] = [start, Math.max(start, widespread + offset)];
    }
    return adoption;
  }

  function add(id, name, icon, domain, attested, adoption, req, desc, options) {
    options = options || {};
    var from = attested[0];
    var cost = options.cost;
    if (cost === undefined) {
      /* Completing the national catalogue should span several generations even
         for a wealthy realm that patronizes scholars continuously. Foundations
         stay cheapest, but every era contributes to the long campaign's pace. */
      cost = from < 476 ? 20 : from < 800 ? 50 :
        from < 1000 ? 100 : from < 1150 ? 150 : 200;
    }
    var def = {
      name:name,
      icon:icon,
      domain:domain,
      cost:cost,
      req:req ? (Array.isArray(req) ? req.slice() : [req]) : [],
      history:{
        attested:[attested[0],attested[1]],
        adoption:spread(attested[0], adoption[0], adoption[1], options.leaders)
      },
      desc:desc,
      confidence:options.confidence || 'high',
      sources:(options.sources || DOMAIN_SOURCE[domain]).slice(),
      unlocks:(options.unlocks || ['practice:' + id]).slice(),
      fx:options.fx || {}
    };
    if (options.reqAny) def.reqAny = options.reqAny.slice();
    if (options.cultures) def.cultures = options.cultures.slice();
    if (options.notCultures) def.notCultures = options.notCultures.slice();
    FBDATA.tech[id] = def;
  }

  FBDATA.tech = {};

  /* Agriculture and animal power — 26. */
  add('scratch_plough','Scratch Plough','🌱','agriculture',[-1000,400],[-500,250],[],
    'A light plough opens dry soils without turning a deep furrow.',
    { leaders:TRADITIONS, unlocks:['practice:light_tillage','career:farmer','enterprise:field_strip'] });
  add('ard_plough','Ard Plough','🌾','agriculture',[-500,500],[500,720],['scratch_plough'],
    'A framed ard gives draft animals a steadier cut through cultivated ground.',
    { leaders:TRADITIONS, unlocks:['practice:ard_tillage'], fx:{ tax:0.005 } });
  add('crop_rotation','Two-Course Rotation','🌿','agriculture',[-400,600],[-100,400],['scratch_plough'],
    'Alternating crop and fallow protects exhausted soil.',
    { leaders:TRADITIONS, unlocks:['practice:crop_rotation'], fx:{ tax:0.005, populationCapacity:0.01 } });
  add('fallowing','Managed Fallow','🌱','agriculture',[-500,500],[-150,350],[],
    'Grazed fallow returns manure and fertility to worked land.',
    { leaders:TRADITIONS, unlocks:['practice:managed_fallow'], fx:{ tax:0.005 } });
  add('manuring','Systematic Manuring','🐂','agriculture',[-300,600],[500,720],['fallowing'],
    'Dung is gathered and spread where its fertility is most useful.',
    { leaders:TRADITIONS, unlocks:['practice:manuring'], fx:{ tax:0.005, populationCapacity:0.01 } });
  add('irrigation_channels','Irrigation Channels','💧','agriculture',[-1000,600],[-500,350],[],
    'Maintained channels carry water beyond the riverbank.',
    { leaders:['islamic','persianate','byzantine','northeast_african'], unlocks:['practice:irrigation'], fx:{ tax:0.005, populationCapacity:0.02 } });
  add('olive_press','Lever Oil Press','🏺','agriculture',[-500,500],[500,680],[],
    'Lever and screw presses extract more oil from each harvest.',
    { leaders:['byzantine','islamic','latin','northeast_african'], unlocks:['enterprise:press_business'] });
  add('wine_press','Screw Wine Press','🍇','agriculture',[-200,500],[500,680],[],
    'A screw press applies steady force to grapes and fruit.',
    { leaders:['latin','byzantine','caucasian'], unlocks:['practice:wine_pressing'] });
  add('iron_sickles','Iron Harvest Blades','🌾','agriculture',[-400,500],[-100,400],[],
    'Durable iron sickles shorten the dangerous work of harvest.',
    { leaders:TRADITIONS, unlocks:['practice:iron_harvest_tools'] });
  add('ox_yokes','Improved Ox Yokes','🐂','agriculture',[-500,500],[-100,400],[],
    'Well-fitted yokes let teams pull without choking or galling.',
    { leaders:TRADITIONS, unlocks:['practice:ox_teams'], fx:{ tax:0.005 } });
  add('water_lifting_devices','Water-Lifting Devices','💧','agriculture',[-300,700],[520,760],['irrigation_channels'],
    'Wheels and bucket chains raise water to higher fields.',
    { leaders:['islamic','persianate','byzantine','northeast_african'], unlocks:['practice:water_lifting'] });
  add('terrace_farming','Terrace Farming','⛰','agriculture',[-500,700],[520,780],[],
    'Stone-faced terraces hold soil and water on steep slopes.',
    { leaders:['byzantine','caucasian','islamic','northeast_african'], unlocks:['practice:terracing'] });
  add('seed_selection','Seed Selection','🌱','agriculture',[500,900],[600,850],['crop_rotation'],
    'Households reserve seed from the healthiest and most reliable plants.',
    { leaders:['byzantine','islamic','persianate'], unlocks:['practice:seed_selection'], fx:{ tax:0.01, populationCapacity:0.02 } });
  add('haymaking','Stored Hay','🌿','agriculture',[550,900],[650,900],['iron_sickles'],
    'Cut and dried grass carries more animals through winter.',
    { leaders:['latin','slavic','nordic'], unlocks:['practice:haymaking'], fx:{ levy:0.01 } });
  add('heavy_plough','Heavy Plough','🌾','agriculture',[650,900],[760,1030],['ard_plough','iron_sickles'],
    'Iron shares and mouldboards turn the wet, deep clays of northern fields.',
    { leaders:['slavic','latin','nordic'], unlocks:['practice:heavy_tillage'], fx:{ tax:0.025, populationCapacity:0.02 } });
  add('open_field_system','Open-Field Organization','🧺','agriculture',[650,1000],[800,1080],['crop_rotation','heavy_plough'],
    'Scattered strips and common decisions coordinate ploughing and pasture.',
    { leaders:['latin','slavic'], unlocks:['practice:open_fields'], fx:{ tax:0.015, populationCapacity:0.02 } });
  add('horse_collar','Horse Collar','🐴','agriculture',[600,1000],[800,1080],['ox_yokes'],
    'A rigid collar lets a horse pull hard without pressure on its throat.',
    { leaders:['steppe','byzantine','latin'], unlocks:['rule:horse_draft'], fx:{ movement:0.02 } });
  add('three_field','Three-Field Rotation','🌱','agriculture',[750,1100],[900,1180],['crop_rotation','open_field_system'],
    'Winter crop, spring crop, and fallow distribute labor and risk.',
    { leaders:['latin','byzantine'], unlocks:['practice:three_field'], fx:{ tax:0.025, devCap:1, populationCapacity:0.03 } });
  add('water_meadows','Managed Water Meadows','💧','agriculture',[900,1200],[1010,1240],['irrigation_channels','haymaking'],
    'Controlled winter flooding brings early grass and heavier hay.',
    { leaders:['latin','byzantine'], unlocks:['practice:water_meadows'], fx:{ tax:0.015, populationCapacity:0.02 } });
  add('improved_husbandry','Improved Husbandry','🐂','agriculture',[900,1250],[1040,1280],['haymaking','seed_selection'],
    'Deliberate feeding, culling, and breeding make herds more dependable.',
    { leaders:['latin','byzantine','islamic'], unlocks:['practice:husbandry'], fx:{ tax:0.015, populationCapacity:0.02 } });
  add('selective_stockbreeding','Selective Stockbreeding','🐑','agriculture',[1050,1300],[1160,1340],['improved_husbandry'],
    'Breeders keep lines for wool, milk, traction, or hardiness.',
    { leaders:['latin','islamic'], unlocks:['practice:selective_breeding'], fx:{ tax:0.015 } });
  add('legume_rotation','Legume Rotation','🫘','agriculture',[950,1250],[1080,1300],['three_field'],
    'Beans and peas restore soil while feeding people and animals.',
    { leaders:['islamic','byzantine','latin'], unlocks:['practice:legume_rotation'], fx:{ tax:0.015, populationCapacity:0.02 } });
  add('grafting_manuals','Grafting Manuals','🌳','agriculture',[850,1200],[980,1240],['seed_selection'],
    'Written grafting practice preserves valued fruit varieties.',
    { leaders:['islamic','byzantine','persianate'], unlocks:['practice:grafting'] });
  add('dovecotes','Dovecotes','🕊','agriculture',[850,1200],[980,1230],['improved_husbandry'],
    'Managed pigeon houses provide meat and concentrated manure.',
    { leaders:['islamic','latin','byzantine'], unlocks:['practice:dovecotes'] });
  add('rabbit_warrens','Managed Warrens','🐇','agriculture',[1050,1300],[1160,1340],['improved_husbandry'],
    'Enclosed warrens turn introduced rabbits into a controlled resource.',
    { leaders:['latin'], unlocks:['practice:warrens'], confidence:'medium', sources:['ASTILL','HOFFMANN'] });
  add('marling','Marling','⛏','agriculture',[1050,1300],[1160,1340],['heavy_plough','manuring'],
    'Mineral-rich earth is dug and spread to improve tired fields.',
    { leaders:['latin'], unlocks:['practice:marling'], fx:{ tax:0.015 } });

  /* Crafts, materials, and industry — 30. */
  add('bloomery_iron','Bloomery Ironworking','⚒','crafts',[-1000,500],[-500,300],[],
    'Charcoal-fired bloomeries produce workable iron from local ores.',
    { leaders:TRADITIONS, unlocks:['practice:ironworking','career:craftsman'] });
  add('lime_mortar','Lime Mortar','🧱','crafts',[-700,500],[-300,350],[],
    'Burned lime binds rubble and dressed stone into lasting walls.',
    { leaders:TRADITIONS, unlocks:['practice:masonry','building:temple'] });
  add('wheel_thrown_pottery','Wheel-Thrown Pottery','🏺','crafts',[-1000,500],[-500,300],[],
    'The potter’s wheel makes vessels quickly and to regular shapes.',
    { leaders:TRADITIONS, unlocks:['practice:pottery'] });
  add('glassblowing','Glassblowing','🧪','crafts',[-100,500],[500,650],[],
    'Inflated glass permits thin vessels, lamps, and window pieces.',
    { leaders:['byzantine','islamic','northeast_african'], unlocks:['practice:glasswork'], fx:{ trade:0.005 } });
  add('tanning','Vegetable Tanning','🦬','crafts',[-500,500],[-100,350],[],
    'Bark liquors turn hides into durable leather.',
    { leaders:TRADITIONS, unlocks:['practice:tanning'] });
  add('spindle_whorl','Spindle and Distaff','🧶','crafts',[-1000,500],[-500,250],[],
    'Portable spinning tools turn prepared fiber into consistent thread.',
    { leaders:TRADITIONS, unlocks:['practice:spinning'], fx:{ trade:0.005 } });
  add('warp_weighted_loom','Warp-Weighted Loom','🧵','crafts',[-800,600],[500,700],['spindle_whorl'],
    'Weighted warp threads keep broad cloth under even tension.',
    { leaders:TRADITIONS, unlocks:['practice:weaving'] });
  add('cooperage','Cooperage','🛢','crafts',[-300,500],[-50,400],[],
    'Hooped wooden vessels store and move liquids, grain, and salted food.',
    { leaders:TRADITIONS, unlocks:['practice:cooperage'] });
  add('quern_stones','Rotary Querns','⚙','crafts',[-500,500],[480,620],[],
    'Rotary stones grind grain more steadily than saddle querns.',
    { leaders:TRADITIONS, unlocks:['practice:rotary_grinding'], fx:{ tax:0.005 } });
  add('lost_wax_casting','Lost-Wax Casting','🔔','crafts',[-1000,600],[500,720],[],
    'Disposable wax models permit complex cast metal forms.',
    { leaders:TRADITIONS, unlocks:['practice:lost_wax_casting'], fx:{ costs:{ build:-0.01 } } });
  add('pattern_welding','Pattern-Welded Blades','🗡','crafts',[200,800],[450,760],['bloomery_iron'],
    'Twisted iron and steel bars combine toughness with a hard edge.',
    { leaders:['nordic','latin','slavic'], unlocks:['rule:pattern_welded_arms'] });
  add('crucible_steel','Crucible Steel','⚒','crafts',[300,900],[550,880],['bloomery_iron'],
    'Sealed crucibles produce exceptionally homogeneous high-carbon steel.',
    { leaders:['persianate','islamic','steppe'], unlocks:['rule:crucible_arms'], confidence:'medium', sources:['SINGER','FEUERBACH'] });
  add('horizontal_loom','Horizontal Loom','🧵','crafts',[500,900],[650,900],['warp_weighted_loom'],
    'A horizontal frame suits finer cloth and specialized workshop labor.',
    { leaders:['byzantine','islamic','latin'], unlocks:['practice:horizontal_weaving','enterprise:workshop_business'] });
  add('water_power','Water-Power Gearing','⚙','crafts',[100,700],[400,760],['quern_stones'],
    'Shafts and gears turn flowing water into useful rotary motion.',
    { leaders:['byzantine','islamic','latin'], unlocks:['rule:water_power'], fx:{ costs:{ enterprise:-0.01 } } });
  add('undershot_watermill','Undershot Watermill','⚙','crafts',[100,700],[450,780],['water_power'],
    'A current striking low paddles drives millstones without a steep fall.',
    { leaders:['byzantine','latin','islamic'], unlocks:['building:mill'] });
  add('overshot_waterwheel','Overshot Waterwheel','⚙','crafts',[500,1000],[720,1020],['water_power'],
    'Water delivered above the wheel uses its weight as well as its speed.',
    { leaders:['islamic','byzantine','latin'], unlocks:['rule:overshot_power'], fx:{ costs:{ build:-0.025 } } });
  add('trip_hammer','Water-Powered Trip Hammer','🔨','crafts',[700,1100],[850,1110],['overshot_waterwheel','bloomery_iron'],
    'Cam-driven hammers deliver repeated heavy blows in forge and fullery.',
    { leaders:['islamic','byzantine','latin'], unlocks:['rule:trip_hammers'], fx:{ costs:{ enterprise:-0.025 } } });
  add('paper_making','Papermaking','📄','crafts',[650,950],[760,1010],[],
    'Pulped fibers formed in molds provide a cheaper writing surface.',
    { leaders:['islamic','persianate'], unlocks:['rule:paper_supply'], fx:{ research:0.1 }, sources:['BLOOM','SINGER'] });
  add('distillation','Alembic Distillation','⚗','crafts',[700,1050],[820,1080],['glassblowing'],
    'Controlled heating and condensation separate volatile substances.',
    { leaders:['islamic','persianate','byzantine'], unlocks:['practice:distillation'], fx:{ health:0.002 }, sources:['PORMANN','SINGER'] });
  add('soap_boiling','Hard Soap Boiling','🧼','crafts',[600,1000],[760,1020],['olive_press'],
    'Measured alkali and fats produce soap suited to trade and workshops.',
    { leaders:['islamic','byzantine','latin'], unlocks:['practice:soap_boiling'] });
  add('glazed_pottery','Glazed Pottery','🏺','crafts',[600,1050],[760,1080],['wheel_thrown_pottery','glassblowing'],
    'Vitrified glazes seal pottery and carry durable color.',
    { leaders:['islamic','persianate','byzantine'], unlocks:['practice:glazed_pottery'] });
  add('improved_furnaces','Improved Furnace Draft','🔥','crafts',[800,1150],[940,1170],['bloomery_iron'],
    'Taller stacks and stronger draft sustain hotter, more regular fires.',
    { leaders:['islamic','persianate','latin'], unlocks:['rule:high_heat_furnaces'] });
  add('bell_casting','Large Bell Casting','🔔','crafts',[750,1100],[900,1120],['lost_wax_casting','improved_furnaces'],
    'Purpose-built pits and molds allow great bronze bells to be cast.',
    { leaders:['latin','byzantine'], unlocks:['practice:large_bronze_casting'], fx:{ costs:{ build:-0.01 } } });
  add('stone_sawing','Water-Powered Stone Sawing','🪚','crafts',[600,1100],[820,1120],['water_power','lime_mortar'],
    'Reciprocating saws driven by water cut stone for major works.',
    { leaders:['byzantine','islamic'], unlocks:['rule:powered_stonework'], fx:{ costs:{ build:-0.025 } } });
  add('fulling_mill','Fulling Mill','🧵','crafts',[950,1200],[1050,1230],['trip_hammer','horizontal_loom'],
    'Water-driven stocks scour and thicken wool cloth at workshop scale.',
    { leaders:['latin','islamic'], unlocks:['rule:fulling_mill'], fx:{ trade:0.015 } });
  add('windmill','Post Windmill','🌬','crafts',[850,1200],[1030,1240],['water_power'],
    'A rotating mill body turns sails toward the wind.',
    { leaders:['persianate','islamic','latin'], unlocks:['rule:wind_power','building:windmill'], fx:{ costs:{ enterprise:-0.015 } }, confidence:'medium', sources:['GIES','HILL'] });
  add('powered_mills','Powered Mills','⚙','crafts',[700,1200],[980,1240],['overshot_waterwheel'],
    'Specialized gearing applies water and wind power beyond grain grinding.',
    { leaders:['islamic','byzantine','latin'], reqAny:['trip_hammer','windmill'], unlocks:['rule:powered_industry'], fx:{ costs:{ build:-0.04, enterprise:-0.04 }, devCap:1 } });
  add('treadle_loom','Treadle Loom','🧵','crafts',[1000,1250],[1120,1280],['horizontal_loom'],
    'Foot treadles free both hands and speed the control of complex sheds.',
    { leaders:['islamic','byzantine','latin'], unlocks:['rule:treadle_weaving'], fx:{ trade:0.015 } });
  add('blast_furnace','Early Blast Furnace','🔥','crafts',[1150,1350],[1260,1400],['improved_furnaces','water_power'],
    'Water-powered bellows sustain temperatures that produce liquid iron.',
    { leaders:['latin'], unlocks:['rule:cast_iron','building:foundry'], fx:{ costs:{ build:-0.01, training:-0.02 } }, confidence:'medium', sources:['SINGER','GIES'] });
  add('mechanical_clock','Mechanical Escapement','🕰','crafts',[1270,1330],[1300,1420],['bell_casting','improved_furnaces'],
    'Weight-driven mechanisms divide motion into regular measured beats.',
    { leaders:['latin'], unlocks:['rule:mechanical_timekeeping'], fx:{ research:0.25 }, confidence:'medium', sources:['CIPOLLA','LANDES'] });
  add('ribbed_vaulting','Ribbed Vaulting','🏛','crafts',[1080,1350],[1150,1350],['lime_mortar','geometry'],
    'Skeletal stone ribs concentrate vault loads, enabling taller walls and expansive stained glass.',
    { leaders:['latin','byzantine'], unlocks:['building:cathedral','rule:monumental_masonry'], fx:{ devCap:1, costs:{ build:-0.025 } }, sources:['GIES','SINGER'] });
  add('spinning_wheel','Spinning Wheel','🧶','crafts',[1000,1350],[1150,1350],['spindle_whorl','horizontal_loom'],
    'Continuous belt-driven spindles multiply yarn output for weaving workshops.',
    { leaders:['islamic','persianate','latin'], unlocks:['rule:spun_yarn_trade'], fx:{ trade:0.02, costs:{ enterprise:-0.02 } }, sources:['SINGER','GIES'] });
  add('deep_shaft_mining','Deep-Shaft Mining','⛏','crafts',[1100,1400],[1200,1400],['bloomery_iron','water_power'],
    'Timber-shored shafts, windlasses, and gravity drainage adits open deeper ore veins.',
    { leaders:['latin','persianate'], unlocks:['rule:deep_mining'], fx:{ tax:0.015, trade:0.01 }, sources:['GIES','SINGER'] });

  /* Commerce, transport, and infrastructure — 24. */
  add('road_surveys','Surveyed Roads','🛣','commerce',[-500,500],[500,720],[],
    'Measured grades, drainage, and chosen alignments make roads durable.',
    { leaders:TRADITIONS, unlocks:['rule:surveyed_roads'], fx:{ movement:0.005, migrationAttraction:0.5 } });
  add('stone_bridgebuilding','Stone Bridgebuilding','🌉','commerce',[-500,600],[520,760],['lime_mortar'],
    'Masonry piers and arches carry roads over dangerous crossings.',
    { leaders:TRADITIONS, unlocks:['building:bridge'] });
  add('standardized_coinage','Standardized Coinage','🪙','commerce',[-600,500],[-150,350],[],
    'Recognizable weights and types let coined metal circulate beyond one market.',
    { leaders:TRADITIONS, unlocks:['rule:coinage'] });
  add('weights_measures','Public Weights and Measures','⚖','commerce',[-500,500],[-100,350],[],
    'Public standards make bargains and dues easier to compare.',
    { leaders:TRADITIONS, unlocks:['rule:weights_measures','career:merchant'] });
  add('market_tolls','Regulated Market Tolls','🏪','commerce',[-300,600],[500,700],['weights_measures'],
    'Known tolls and protected market days regularize local exchange.',
    { leaders:TRADITIONS, unlocks:['rule:regulated_tolls'], fx:{ tax:0.005 } });
  add('pack_saddles','Pack Saddles','🐴','commerce',[-500,600],[-100,400],[],
    'Balanced frames let animals carry bulky loads over poor roads.',
    { leaders:TRADITIONS, unlocks:['rule:pack_transport'], fx:{ supply:0.05 } });
  add('wheeled_carts','Iron-Tired Carts','🛞','commerce',[-500,600],[500,700],['bloomery_iron'],
    'Iron fittings and durable wheels extend the useful life of carts.',
    { leaders:TRADITIONS, unlocks:['rule:wheeled_transport'], fx:{ supply:0.05 } });
  add('warehouses','Warehouses','🏚','commerce',[-300,600],[500,720],['cooperage'],
    'Dedicated stores gather goods safely between harvest, voyage, and sale.',
    { leaders:TRADITIONS, unlocks:['rule:warehousing','building:granary'] });
  add('river_landings','Improved River Landings','🛶','commerce',[500,900],[650,900],['warehouses'],
    'Quays, ramps, and storeyards connect river traffic to inland roads.',
    { leaders:['byzantine','islamic','slavic','latin'], unlocks:['rule:river_trade'], fx:{ trade:0.01 } });
  add('caravanserais','Caravanserais','🐫','commerce',[500,950],[650,930],['pack_saddles','warehouses'],
    'Walled roadside inns protect merchants, animals, and cargo.',
    { leaders:['persianate','islamic','caucasian'], unlocks:['rule:caravan_network'], fx:{ trade:0.015 } });
  add('urban_markets','Permanent Urban Markets','🏪','commerce',[600,1000],[760,1010],['market_tolls','warehouses'],
    'Permanent stalls and oversight concentrate exchange in growing towns.',
    { leaders:['islamic','byzantine','latin'], unlocks:['enterprise:market_stall_business','building:market'], fx:{ tax:0.01 } });
  add('merchant_guilds','Merchant Guilds','🤝','commerce',[750,1100],[880,1120],['urban_markets'],
    'Sworn merchant associations defend privileges and enforce trust.',
    { leaders:['byzantine','islamic','latin'], unlocks:['rule:merchant_guilds'], fx:{ trade:0.015 } });
  add('annual_fairs','Chartered Annual Fairs','🎪','commerce',[850,1150],[980,1170],['merchant_guilds'],
    'Protected fairs draw distant traders on a predictable calendar.',
    { leaders:['latin','islamic'], unlocks:['rule:annual_fairs'], fx:{ trade:0.015 } });
  add('commercial_arithmetic','Commercial Arithmetic','➗','commerce',[800,1100],[930,1130],['weights_measures','arithmetic'],
    'Practical calculation makes shares, exchange, and compound obligations manageable.',
    { leaders:['islamic','persianate','byzantine'], unlocks:['rule:commercial_arithmetic'], fx:{ finance:0.02 } });
  add('notarial_contracts','Notarial Contracts','✒','commerce',[800,1150],[950,1170],['diplomatic_correspondence','market_tolls'],
    'Authenticated written instruments let bargains outlive their witnesses.',
    { leaders:['byzantine','islamic','latin'], unlocks:['rule:notarial_contracts'], fx:{ finance:0.02 } });
  add('sea_loans','Maritime Loans','⚓','commerce',[750,1150],[930,1180],['notarial_contracts','warehouses'],
    'Risk-priced loans finance voyages whose loss may cancel repayment.',
    { leaders:['byzantine','islamic','latin'], unlocks:['rule:maritime_credit'], fx:{ finance:0.02 } });
  add('letters_of_credit','Letters of Credit','📨','commerce',[900,1200],[1040,1220],['notarial_contracts','merchant_guilds'],
    'Trusted correspondents settle obligations without moving every coin.',
    { leaders:['islamic','persianate','latin'], unlocks:['rule:letters_of_credit'], fx:{ finance:0.02 } });
  add('bills_of_exchange','Bills of Exchange','📃','commerce',[1100,1300],[1200,1330],['letters_of_credit','commercial_arithmetic'],
    'Transferable paper combines payment, exchange, and short-term credit.',
    { leaders:['latin','islamic'], unlocks:['rule:bills_of_exchange','building:exchange'], fx:{ finance:0.025 } });
  add('marine_insurance','Marine Insurance','📜','commerce',[1250,1450],[1300,1450],['sea_loans','notarial_contracts'],
    'Underwritten policies separate sea hazard risk from loan capital and merchant voyages.',
    { leaders:['latin','islamic'], unlocks:['rule:marine_insurance'], fx:{ finance:0.025 }, sources:['SPUFFORD','LOPEZ'] });
  add('mint_assay','Mint Assaying','🪙','commerce',[800,1150],[940,1170],['standardized_coinage','weights_measures'],
    'Touchstones, balances, and cupellation test the fineness of coin.',
    { leaders:['islamic','byzantine','latin'], unlocks:['rule:mint_assay'], fx:{ finance:0.015 } });
  add('paved_causeways','Paved Causeways','🛣','commerce',[850,1200],[1010,1230],['road_surveys','stone_bridgebuilding'],
    'Raised and drained roadbeds keep important routes usable in wet seasons.',
    { leaders:['byzantine','latin','islamic'], unlocks:['rule:paved_routes'], fx:{ movement:0.025, migrationAttraction:1.0 } });
  add('postal_relays','Mounted Relay Posts','📯','commerce',[700,1150],[900,1170],['pack_saddles','road_surveys'],
    'Fresh mounts and prepared stations carry official news rapidly.',
    { leaders:['steppe','persianate','islamic','byzantine'], unlocks:['rule:relay_posts'], fx:{ movement:0.02 } });
  add('toll_exemptions','Negotiated Toll Exemptions','📜','commerce',[950,1250],[1080,1280],['merchant_guilds','annual_fairs'],
    'Corporate privileges reduce repeated charges along established routes.',
    { leaders:['latin','byzantine','islamic'], unlocks:['rule:toll_exemptions'], fx:{ trade:0.02 } });
  add('trade_houses','Distant Trade Houses','🏛','commerce',[950,1250],[1090,1290],['letters_of_credit','merchant_guilds'],
    'Resident agents and permanent stores support business far from home.',
    { leaders:['islamic','byzantine','latin'], unlocks:['enterprise:trade_house_business','rule:trade_partnerships'], fx:{ trade:0.02 } });
  add('double_entry_bookkeeping','Double-Entry Bookkeeping','📒','commerce',[1250,1400],[1320,1450],['bills_of_exchange','commercial_arithmetic'],
    'Paired debit and credit entries expose errors across complex accounts.',
    { leaders:['latin'], unlocks:['rule:double_entry'], fx:{ finance:0.02 }, confidence:'medium', sources:['SPUFFORD','DE_ROOVER'] });

  /* Learning, medicine, and natural knowledge — 25. */
  add('manuscript_codex','Manuscript Codex','📕','learning',[100,500],[250,430],[],
    'Bound leaves permit indexing, annotation, and compact libraries.',
    { leaders:TRADITIONS, unlocks:['practice:codex_books','career:monk','career:scholar','schooling:charity'] });
  add('parchment_making','Parchment Making','📜','learning',[-200,500],[480,650],[],
    'Prepared skins provide a durable surface for books and records.',
    { leaders:TRADITIONS, unlocks:['practice:parchment'] });
  add('classical_grammar','Classical Grammar','✒','learning',[-500,600],[-100,430],[],
    'Formal grammar preserves learned languages across generations.',
    { leaders:TRADITIONS, unlocks:['practice:learned_literacy'], fx:{ education:0.005 } });
  add('arithmetic','Written Arithmetic','➗','learning',[-500,600],[-100,430],[],
    'Written procedures make calculation teachable and repeatable.',
    { leaders:TRADITIONS, unlocks:['practice:arithmetic','schooling:merchant'] });
  add('geometry','Practical Geometry','📐','learning',[-500,600],[500,700],['arithmetic'],
    'Rules of measure guide surveyors, builders, and astronomers.',
    { leaders:TRADITIONS, unlocks:['practice:geometry'], fx:{ research:0.1 } });
  add('herbals','Materia Medica','🌿','learning',[-400,600],[-50,430],[],
    'Catalogues of substances preserve recipes and warnings for healers.',
    { leaders:TRADITIONS, unlocks:['practice:herbal_medicine','career:physician'], fx:{ health:0.001, populationCrisisProtection:0.01 } });
  add('surgical_instruments','Surgical Instruments','🩺','learning',[-300,600],[520,740],['bloomery_iron'],
    'Purpose-made probes, knives, forceps, and cauteries support manual treatment.',
    { leaders:TRADITIONS, unlocks:['practice:surgery'] });
  add('astronomical_observation','Astronomical Observation','🌙','learning',[-500,600],[500,720],['geometry'],
    'Long observation links the movements of the sky to calendars and seasons.',
    { leaders:TRADITIONS, unlocks:['practice:astronomy'], fx:{ research:0.1 } });
  add('scriptoria',{ default:'Scriptoria', muslim:'Paper Workshops' },'📜','learning',[500,850],[570,850],['manuscript_codex'],
    'Organized copying communities preserve and multiply difficult texts.',
    { leaders:['byzantine','latin','islamic'], unlocks:['rule:scriptoria'], fx:{ research:0.25 } });
  add('translation_schools','Translation Schools','🌐','learning',[650,1050],[760,1070],['classical_grammar','scriptoria'],
    'Teams working across languages move knowledge between learned traditions.',
    { leaders:['islamic','persianate','byzantine'], unlocks:['rule:translations'], fx:{ research:0.25 } });
  add('paper_scholarship','Paper Scholarship','📄','learning',[750,1050],[830,1080],['paper_making','scriptoria'],
    'Abundant paper makes correspondence, drafts, and working libraries cheaper.',
    { leaders:['islamic','persianate'], unlocks:['building:library'], fx:{ research:0.25 } });
  add('algebra','Algebraic Methods','➗','learning',[800,1100],[850,1100],['arithmetic','translation_schools'],
    'General procedures solve classes of numerical and geometric problems.',
    { leaders:['islamic','persianate'], unlocks:['rule:algebra'], fx:{ research:0.15 }, sources:['GRANT','RASHED'] });
  add('astrolabe','Planispheric Astrolabe','🧭','learning',[600,1000],[760,1030],['geometry','astronomical_observation'],
    'A portable model of the sky answers problems of time, latitude, and observation.',
    { leaders:['islamic','byzantine','persianate'], unlocks:['rule:astrolabe'], fx:{ research:0.15 } });
  add('hospitals','Endowed Hospitals','🏥','learning',[650,1100],[800,1120],['herbals'],
    'Endowed institutions gather wards, practitioners, medicines, and teaching.',
    { leaders:['byzantine','islamic','persianate'], unlocks:['rule:hospitals','building:hospital'], fx:{ health:0.002, populationCrisisProtection:0.03 } });
  add('physicians','Court Physicians','🌿','learning',[700,1100],[850,1130],['herbals','scriptoria'],
    'Rulers retain learned practitioners for diagnosis, regimen, and treatment.',
    { leaders:['islamic','persianate','byzantine'], unlocks:['rule:court_physicians'], fx:{ health:0.003 } });
  add('medical_canons','Medical Canons','📚','learning',[850,1150],[980,1170],['translation_schools','physicians'],
    'Large synthetic medical works organize theory, substances, and practice.',
    { leaders:['islamic','persianate'], unlocks:['rule:medical_canons'], fx:{ health:0.003, populationCrisisProtection:0.02 }, sources:['PORMANN','GRANT'] });
  add('optics','Geometrical Optics','🔍','learning',[900,1200],[1020,1220],['geometry','translation_schools'],
    'Experiment and geometry explain reflection, refraction, and vision.',
    { leaders:['islamic','persianate'], unlocks:['rule:optics'], fx:{ research:0.15 }, sources:['LINDBERG','GRANT'] });
  add('scholarly_networks','Scholarly Networks','🤝','learning',[750,1150],[930,1160],['scriptoria'],
    'Correspondence, travel, and patronage connect learned communities across realms.',
    { leaders:['islamic','byzantine','latin'], unlocks:['research_slot:2','schooling:master'], fx:{ research:0.25 } });
  add('universities',{ default:'Universities', muslim:'Madrasas and Colleges' },'🎓','learning',[1000,1250],[1100,1270],['scholarly_networks','paper_scholarship'],
    'Corporate schools secure teachers, curricula, privileges, and durable communities.',
    { leaders:['islamic','latin'], unlocks:['research_slot:3','building:university'], fx:{ research:0.35, education:0.03 }, sources:['RASHDALL','MAKDISI'] });
  add('scholastic_method','Scholastic Method','❓','learning',[1050,1250],[1150,1280],['universities','translation_schools'],
    'Ordered questions and disputation expose contradictions and sharpen argument.',
    { leaders:['latin','islamic'], unlocks:['rule:scholastic_method'], fx:{ research:0.2, education:0.02 } });
  add('legal_studies','Professional Legal Studies','⚖','learning',[1000,1250],[1120,1280],['universities','written_law'],
    'Specialized teachers train practitioners to interpret large bodies of law.',
    { leaders:['latin','byzantine','islamic'], unlocks:['rule:legal_studies'], fx:{ education:0.015 } });
  add('anatomy_texts','Illustrated Anatomy Texts','🫀','learning',[1050,1300],[1180,1320],['medical_canons','paper_scholarship'],
    'Organized anatomical descriptions guide teaching and surgical memory.',
    { leaders:['islamic','persianate','latin'], unlocks:['rule:anatomy_texts'], fx:{ health:0.002 } });
  add('pharmacology','Compound Pharmacology','⚗','learning',[950,1250],[1080,1280],['medical_canons','distillation'],
    'Measured compounds and formularies expand the practiced materia medica.',
    { leaders:['islamic','persianate','byzantine'], unlocks:['rule:compound_medicines'], fx:{ health:0.002 } });
  add('zero_numeral','Positional Zero','0️⃣','learning',[600,1100],[820,1130],['arithmetic'],
    'A positional zero makes long calculation compact and systematic.',
    { leaders:['persianate','islamic'], unlocks:['rule:positional_numerals'], fx:{ finance:0.015 }, sources:['IFRA','RASHED'] });
  add('experimental_natural_philosophy','Experimental Natural Philosophy','🔬','learning',[1150,1350],[1260,1380],['optics','scholastic_method'],
    'Deliberate trials join reasoned argument to repeatable observation.',
    { leaders:['islamic','latin'], unlocks:['rule:experimental_inquiry'], fx:{ research:0.25 }, confidence:'medium', sources:['LINDBERG','GRANT'] });

  /* Governance, law, and institutions — 25. */
  add('written_law','Written Law Codes','⚖','governance',[-600,600],[-100,430],[],
    'Promulgated texts make some rules portable beyond a judge’s memory.',
    { leaders:TRADITIONS, unlocks:['practice:written_law'], fx:{ tax:0.005 } });
  add('census_records','Census Records','📋','governance',[-500,600],[500,700],['written_law'],
    'Enumerations connect households and land to public obligations.',
    { leaders:TRADITIONS, unlocks:['practice:census'], fx:{ tax:0.005 } });
  add('land_registers','Land Registers','📜','governance',[-500,600],[500,700],['written_law'],
    'Written surveys preserve boundaries, tenures, and assessed holdings.',
    { leaders:TRADITIONS, unlocks:['practice:land_records'], fx:{ tax:0.005 } });
  add('tax_assessment','Regular Tax Assessment','🪙','governance',[-500,600],[520,740],['census_records'],
    'Recorded categories and schedules make revenue less dependent on ad hoc taking.',
    { leaders:TRADITIONS, unlocks:['practice:tax_assessment'], fx:{ tax:0.01 } });
  add('diplomatic_correspondence','Diplomatic Correspondence','📨','governance',[-500,600],[-50,430],['classical_grammar'],
    'Formal letters preserve negotiation across distance and succession.',
    { leaders:TRADITIONS, unlocks:['practice:diplomatic_letters'], fx:{ research:0.1 } });
  add('bureaucratic_offices','Bureaucratic Offices','🏛','governance',[-400,600],[500,720],['written_law'],
    'Named offices divide recurring public work among accountable servants.',
    { leaders:TRADITIONS, unlocks:['practice:public_offices','career:administration'], fx:{ tax:0.005 } });
  add('capitularies','Royal Capitularies','📜','governance',[650,900],[760,920],['written_law','diplomatic_correspondence'],
    'Chaptered royal orders circulate policy among assemblies and local officers.',
    { leaders:['latin'], unlocks:['rule:capitularies'], fx:{ levy:0.01 } });
  add('diwan_administration','Diwan Administration','📋','governance',[600,950],[700,950],['tax_assessment','bureaucratic_offices'],
    'Specialized registers and departments organize pay, revenue, and correspondence.',
    { leaders:['islamic','persianate'], unlocks:['rule:diwan'], fx:{ tax:0.015 } });
  add('themata_administration','Thematic Administration','🛡','governance',[600,950],[720,960],['land_registers','bureaucratic_offices'],
    'Territorial commands link military obligation to provincial government.',
    { leaders:['byzantine'], unlocks:['rule:themata'], fx:{ levy:0.015 } });
  add('feudal_oaths','Feudal Oaths','🤝','governance',[700,1050],[850,1070],['written_law'],
    'Personal homage and sworn service articulate layered political obligations.',
    { leaders:['latin','caucasian'], unlocks:['rule:feudal_oaths'], fx:{ levy:0.01 } });
  add('manorial_courts','Manorial Courts','⚖','governance',[750,1100],[900,1110],['land_registers','feudal_oaths'],
    'Regular estate courts order local custom, labor, and minor disputes.',
    { leaders:['latin'], unlocks:['rule:manorial_courts'], fx:{ tax:0.01 } });
  add('customary_law','Recorded Customary Law','📖','governance',[800,1150],[950,1170],['written_law'],
    'Written statements stabilize customs once carried mainly by memory.',
    { leaders:['latin','slavic','nordic'], unlocks:['rule:recorded_custom'], fx:{ tax:0.005 } });
  add('royal_judges','Itinerant Royal Judges','⚖','governance',[900,1200],[1030,1220],['customary_law','diplomatic_correspondence'],
    'Delegated judges carry royal pleas and procedure into the provinces.',
    { leaders:['latin','byzantine'], unlocks:['rule:itinerant_justice'], fx:{ tax:0.01 } });
  add('guild_charters','Guild Charters','📯','governance',[900,1200],[1030,1220],['merchant_guilds','written_law'],
    'Public charters define corporate privileges and monopolies: guildmasters may petition a superior, while barons and greater rulers may grant one local Craft or Trade monopoly.',
    { leaders:['latin','byzantine','islamic'], unlocks:['rule:guild_charters','building:guildhall'], fx:{ costs:{ enterprise:-0.04, training:-0.03 } } });
  add('authenticated_seals','Authenticated Seals','🕯','governance',[750,1100],[900,1120],['diplomatic_correspondence'],
    'Recognized seals authenticate commands and agreements without the issuer present.',
    { leaders:['byzantine','islamic','latin'], unlocks:['rule:documentary_seals'], fx:{ finance:0.01 } });
  add('royal_catalogue','Royal Catalogue','📚','governance',[950,1200],[1080,1230],['authenticated_seals','land_registers'],
    'A central catalogue makes charters and obligations retrievable.',
    { leaders:['byzantine','latin','islamic'], unlocks:['rule:royal_archive'], fx:{ research:0.2 } });
  add('exchequer_accounts','Exchequer Accounts','🧮','governance',[1050,1250],[1140,1280],['tax_assessment','commercial_arithmetic'],
    'Audited central accounts compare what officers owe with what they deliver.',
    { leaders:['latin','islamic'], unlocks:['rule:exchequer'], fx:{ tax:0.015, finance:0.015 } });
  add('common_law','Royal Common Law','⚖','governance',[1050,1250],[1160,1290],['royal_judges','customary_law'],
    'Repeated central remedies begin to form a realm-wide body of precedent.',
    { leaders:['latin'], unlocks:['rule:common_law'], fx:{ tax:0.01 } });
  add('canon_law_collections','Systematic Canon Law','⛪','governance',[1000,1250],[1130,1280],['legal_studies','scriptoria'],
    'Concordances organize ecclesiastical rules for courts and schools.',
    { leaders:['latin','byzantine'], unlocks:['rule:canon_law'], fx:{ research:0.15 } });
  add('urban_communes','Urban Communes','🏙','governance',[1000,1250],[1120,1280],['guild_charters','urban_markets'],
    'Sworn towns negotiate collective jurisdiction and public responsibilities.',
    { leaders:['latin','byzantine'], unlocks:['rule:urban_communes'], fx:{ tax:0.01 } });
  add('scutage','Scutage','🪙','governance',[1100,1250],[1180,1300],['feudal_oaths','exchequer_accounts'],
    'Cash payments commute some personal military service into royal revenue.',
    { leaders:['latin'], unlocks:['rule:scutage'], fx:{ tax:0.01 } });
  add('cadastral_surveys','Cadastral Surveys','📐','governance',[1000,1300],[1150,1320],['land_registers','geometry'],
    'Systematic description of parcels and values supports taxation and judgment.',
    { leaders:['byzantine','latin','islamic'], unlocks:['rule:cadastral_surveys'], fx:{ tax:0.015 } });
  add('professional_bailiffs','Professional Bailiffs','🗝','governance',[1050,1300],[1170,1320],['manorial_courts','exchequer_accounts'],
    'Paid estate officers turn accounts, collection, and supervision into a career.',
    { leaders:['latin','islamic'], unlocks:['rule:professional_bailiffs'], fx:{ domain:1 } });
  add('representative_estates','Representative Estates','🏛','governance',[1150,1350],[1260,1380],['urban_communes','feudal_oaths'],
    'Clergy, nobles, and towns send authorized speakers to negotiate collective grants.',
    { leaders:['latin'], unlocks:['rule:representative_estates'], fx:{ tax:0.01 } });
  add('royal_chancery','Royal Chancery','📜','governance',[1000,1250],[1120,1280],['royal_catalogue','authenticated_seals'],
    'A permanent writing office carries the crown beyond one household.',
    { leaders:['byzantine','latin','islamic'], unlocks:['rule:royal_chancery'], fx:{ research:0.25, domain:1 } });

  /* Warfare and fortification — 33. */
  add('spear_shield_drill','Spear and Shield Drill','🛡','warfare',[-1000,500],[-500,300],[],
    'Repeated formation practice coordinates ordinary infantry.',
    { leaders:TRADITIONS, unlocks:['unit:levy','career:soldier'] });
  add('composite_bow','Composite Bow','🏹','warfare',[-1000,700],[-400,400],[],
    'Laminated horn, sinew, and wood store great power in a short bow.',
    { leaders:['steppe','persianate','islamic','byzantine'], unlocks:['unit:archers'], fx:{ units:{ arch:10 }, aiUnits:{ arch:0.01 } } });
  add('iron_weaponry','Iron Weaponry','⚔','warfare',[-1000,500],[-500,300],['bloomery_iron'],
    'Reliable iron spearheads, blades, and tools equip organized forces.',
    { leaders:TRADITIONS, unlocks:['rule:iron_arms'] });
  add('scale_lamellar','Scale and Lamellar Armor','🛡','warfare',[-800,700],[500,720],['iron_weaponry'],
    'Small overlapping plates protect warriors while preserving movement.',
    { leaders:['steppe','persianate','byzantine','islamic'], unlocks:['rule:lamellar_armor'] });
  add('torsion_artillery','Torsion Artillery','🎯','warfare',[-400,600],[520,760],['geometry'],
    'Twisted skeins drive engines that cast bolts or stones against troops and walls.',
    { leaders:['byzantine','islamic','latin'], unlocks:['rule:torsion_engines'], fx:{ siege:0.01 } });
  add('fortified_camps','Fortified Camps','⛺','warfare',[-500,600],[500,700],['spear_shield_drill'],
    'Ditches, banks, and ordered camp streets protect armies at rest.',
    { leaders:TRADITIONS, unlocks:['rule:fortified_camps'], fx:{ movement:0.005 } });
  add('cavalry_saddles','Framed Cavalry Saddles','🐎','warfare',[100,700],[350,650],[],
    'Rigid saddles stabilize mounted fighters and spread a rider’s weight.',
    { leaders:['steppe','persianate','byzantine'], unlocks:['unit:cavalry'], fx:{ units:{ cav:10 }, aiUnits:{ cav:0.01 } } });
  add('stirrups','Stirrup Cavalry','🐎','warfare',[400,800],[520,820],['cavalry_saddles'],
    'Paired stirrups improve mounted control, archery, and close combat.',
    { leaders:['steppe','persianate','byzantine'], notCultures:['greek'], unlocks:['rule:stirrup_cavalry'], fx:{ units:{ cav:20 }, aiUnits:{ cav:0.025 } } });
  add('tagmata','Tagmata','🐎','warfare',[750,950],[760,930],['cavalry_saddles','bureaucratic_offices'],
    'Permanent imperial regiments maintain a trained core of horse and foot.',
    { leaders:['byzantine'], cultures:['greek'], unlocks:['unit:retinue'], fx:{ units:{ cav:10, ret:15 }, aiUnits:{ cav:0.015, ret:0.02 } } });
  add('shield_walls','Shield-Wall Tactics','🛡','warfare',[450,900],[600,880],['spear_shield_drill'],
    'Overlapping shields and practiced cohesion strengthen close-order infantry.',
    { leaders:['nordic','latin','slavic','byzantine'], unlocks:['rule:shield_wall'], fx:{ battle:0.01 } });
  add('ringworks','Ringworks','🛡','warfare',[500,950],[700,960],['fortified_camps'],
    'Earth-and-timber circuits provide quickly raised local strongholds.',
    { leaders:['latin','slavic','nordic'], unlocks:['rule:ringworks'], fx:{ levy:0.015 } });
  add('mail_hauberks','Mail Hauberks','⛓','warfare',[300,1000],[620,980],['iron_weaponry'],
    'Long shirts of linked iron rings protect the professional warrior.',
    { leaders:['latin','nordic','byzantine','islamic'], unlocks:['rule:mail_armor'], fx:{ units:{ ret:15 }, aiUnits:{ ret:0.02 }, battle:0.01 } });
  add('mounted_archery','Mounted Archery','🏹','warfare',[200,900],[450,850],['composite_bow','cavalry_saddles'],
    'Riders train to maneuver and loose arrows as a coordinated arm.',
    { leaders:['steppe','persianate','islamic','byzantine'], unlocks:['rule:mounted_archery'], fx:{ units:{ cav:10, arch:10 }, aiUnits:{ cav:0.015, arch:0.01 } } });
  add('cavalry_lances','Couched Cavalry Lance','🐎','warfare',[850,1150],[980,1160],['stirrups','mail_hauberks'],
    'A braced lance focuses horse and rider into a disciplined shock charge.',
    { leaders:['latin','byzantine'], unlocks:['rule:lance_charge'], fx:{ battle:0.012 } });
  add('castle_towers','Flanking Castle Towers','🏰','warfare',[750,1100],[900,1120],['ringworks','lime_mortar'],
    'Projecting towers cover walls and gates with crossing fire.',
    { leaders:['byzantine','islamic','latin','caucasian'], unlocks:['rule:flanking_towers'], fx:{ battle:0.005 } });
  add('stone_castles','Stone Castles','🏰','warfare',[850,1150],[980,1170],['castle_towers','lime_mortar'],
    'Masonry keeps and curtains turn elite residences into durable fortresses.',
    { leaders:['byzantine','islamic','latin','caucasian'], unlocks:['building:keep'], fx:{ siege:0.03 } });
  add('crossbows','Military Crossbows','🏹','warfare',[500,1100],[850,1100],['iron_weaponry'],
    'Mechanical bows trade shooting speed for power and modest training demands.',
    { leaders:['byzantine','islamic','latin'], unlocks:['building:archery_butts','rule:crossbow_levies','unit:crossbow'], fx:{ units:{ arch:15 }, aiUnits:{ arch:0.02 } } });
  add('siege_engineering','Siege Engineering','🪨','warfare',[650,1100],[850,1120],['torsion_artillery','geometry'],
    'Specialists calculate engines, earthworks, approaches, and bombardment.',
    { leaders:['byzantine','islamic','persianate','latin'], unlocks:['rule:siege_engineers'], fx:{ siege:0.04 } });
  add('sapper_corps','Organized Sappers','⛏','warfare',[750,1150],[920,1160],['siege_engineering'],
    'Protected miners and labor gangs attack foundations and fill defenses.',
    { leaders:['byzantine','islamic','persianate'], unlocks:['rule:sappers'], fx:{ siege:0.03 } });
  add('martial_drill','Martial Drill','⚔','warfare',[750,1100],[900,1120],['shield_walls'],
    'Seasonal musters rehearse commands, formations, and weapon handling.',
    { leaders:['byzantine','islamic','latin','nordic'], unlocks:['building:barracks'], fx:{ battle:0.012, levy:0.01 } });
  add('longbow_tactics','Massed Longbow Tactics','🏹','warfare',[1050,1300],[1160,1330],['shield_walls'],
    'Strong self bows employed in mass reward practiced communal archery.',
    { leaders:['latin'], unlocks:['rule:massed_longbows'], fx:{ units:{ arch:20 }, aiUnits:{ arch:0.025 } }, confidence:'medium', sources:['DEVRIES','STRICKLAND'] });
  add('pavise_formations','Pavise Formations','🛡','warfare',[1050,1250],[1160,1280],['crossbows','martial_drill'],
    'Large portable shields shelter missile troops while they reload.',
    { leaders:['byzantine','latin','islamic'], unlocks:['rule:pavise_formations'], fx:{ battle:0.008 } });
  add('counterweight_trebuchet','Counterweight Trebuchet','🪨','warfare',[1050,1250],[1130,1280],['siege_engineering'],
    'Gravity-powered throwing arms hurl heavy stones with repeatable force.',
    { leaders:['byzantine','islamic','latin'], unlocks:['rule:counterweight_trebuchet'], fx:{ siege:0.07 }, confidence:'medium', sources:['DEVRIES','HILL'] });
  add('concentric_defenses','Concentric Defenses','🏰','warfare',[1050,1300],[1180,1320],['stone_castles','castle_towers'],
    'Layered curtains and controlled approaches force attackers through repeated killing grounds.',
    { leaders:['byzantine','islamic','latin'], unlocks:['rule:concentric_castles'], fx:{ siege:0.04 } });
  add('infantry_polearms','Infantry Polearms','🔱','warfare',[1050,1300],[1170,1320],['iron_weaponry','martial_drill'],
    'Long hafted weapons give ordered infantry reach against riders and armor.',
    { leaders:['latin','byzantine','slavic'], unlocks:['rule:polearm_blocks','unit:pike'], fx:{ battle:0.008 } });
  add('cataphract_armor','Cataphract Barding','♞','warfare',[400,950],[550,1000],['scale_lamellar','cavalry_saddles'],
    'Full armor for horse and rider creates a slow, near-untouchable shock cavalry.',
    { leaders:['byzantine','caucasian'], unlocks:['unit:cataphract'] });
  add('combined_arms','Combined Arms','⚔','warfare',[1050,1300],[1190,1330],['martial_drill'],
    'Bow, horse, and armored foot coordinate their different strengths.',
    { reqAny:['cavalry_lances','mounted_archery'], leaders:['byzantine','islamic','latin','steppe'], unlocks:['rule:combined_arms'], fx:{ battle:0.015, units:{ arch:10, cav:10 }, aiUnits:{ arch:0.01, cav:0.01 } } });
  add('professional_retinues','Professional Retinues','🛡','warfare',[950,1250],[1100,1280],['martial_drill','tax_assessment'],
    'Regular pay and household organization maintain troops beyond a short levy.',
    { leaders:['byzantine','islamic','latin'], unlocks:['unit:retinue'], fx:{ units:{ ret:25 }, aiUnits:{ ret:0.03 } } });
  add('naval_levies','Organized Naval Levies','⚓','warfare',[800,1200],[980,1230],['harbor_works'],
    'Ports assess ships, crews, and service for planned royal fleets.',
    { leaders:['byzantine','nordic','islamic','latin'], unlocks:['rule:naval_levies'], fx:{ levy:0.005, seaTransport:4000 } });
  add('incendiary_weapons','Incendiary Weapons','🔥','warfare',[600,1100],[780,1120],['distillation','siege_engineering'],
    'Prepared combustible mixtures attack ships, engines, and wooden defenses.',
    { leaders:['byzantine','islamic'], unlocks:['rule:incendiaries'], fx:{ siege:0.025 }, confidence:'medium', sources:['PRYOR','DEVRIES'] });
  add('fortified_gates','Advanced Gate Defenses','🚪','warfare',[850,1200],[1010,1230],['castle_towers'],
    'Bent entries, towers, portcullises, and murder holes reinforce the weakest wall.',
    { leaders:['byzantine','islamic','latin'], unlocks:['rule:fortified_gates'] });
  add('logistics_magazines','Military Magazines','📦','warfare',[900,1250],[1050,1280],['warehouses','tax_assessment'],
    'Designated stores and requisition records sustain forces away from harvest-time supply.',
    { leaders:['byzantine','islamic','persianate'], unlocks:['rule:military_magazines'], fx:{ movement:0.02, supply:0.1 } });
  add('gunpowder_knowledge','Gunpowder Knowledge','💥','warfare',[1200,1320],[1270,1380],['algebra','distillation'],
    'Recipes for saltpeter mixtures open a new field of incendiary and explosive experiment.',
    { leaders:['islamic','persianate'], unlocks:['rule:gunpowder_experiment'], confidence:'medium', sources:['NEEDHAM','DEVRIES'] });
  add('plate_armor','Plate Armor','🛡','warfare',[1250,1450],[1300,1450],['mail_hauberks','blast_furnace'],
    'Articulated steel plates provide formidable protection against lance, sword, and missile.',
    { leaders:['latin','byzantine'], unlocks:['rule:plate_harness'], fx:{ battle:0.02, units:{ ret:20 }, aiUnits:{ ret:0.02 } }, sources:['DEVRIES','BACHRACH'] });
  add('gunpowder_artillery','Gunpowder Artillery','💥','warfare',[1280,1450],[1320,1450],['gunpowder_knowledge','bell_casting'],
    'Cast bronze and wrought-iron bombards project heavy balls against fortifications.',
    { leaders:['islamic','persianate','latin'], unlocks:['rule:siege_bombards'], fx:{ siege:0.06 }, sources:['NEEDHAM','DEVRIES'] });

  /* Seafaring and navigation — 18. */
  add('mortise_tenon_shipbuilding','Mortise-and-Tenon Shipbuilding','⛵','seafaring',[-1000,600],[480,650],[],
    'Interlocking planks create strong shell-built hulls.',
    { leaders:TRADITIONS, unlocks:['practice:shell_built_hulls'], fx:{ trade:0.005 } });
  add('square_sail','Square Sails','⛵','seafaring',[-1000,600],[-400,350],[],
    'Broad square sails drive cargo and war craft efficiently before the wind.',
    { leaders:TRADITIONS, unlocks:['practice:square_sails'], fx:{ seaMovement:0.005, seaTransport:400 } });
  add('steering_oars','Quarter Steering Oars','🛶','seafaring',[-700,700],[480,680],[],
    'Large side-mounted oars give helmsmen leverage over substantial hulls.',
    { leaders:TRADITIONS, unlocks:['practice:steering_oars'] });
  add('coastal_piloting','Coastal Piloting','🗺','seafaring',[-1000,700],[480,650],[],
    'Remembered landmarks, winds, currents, and anchorages guide coastal voyages.',
    { leaders:TRADITIONS, unlocks:['practice:coastal_piloting'], fx:{ seaMovement:0.005, seaTransport:500 } });
  add('sounding_lead','Sounding Lead','⚓','seafaring',[-500,700],[520,700],['coastal_piloting'],
    'A weighted line measures depth and samples the seabed near hidden hazards.',
    { leaders:TRADITIONS, unlocks:['practice:soundings'] });
  add('harbor_works','Harbor Works','⚓','seafaring',[-500,700],[500,720],['lime_mortar'],
    'Quays, moles, slips, and beacons shelter vessels and speed their loading.',
    { leaders:TRADITIONS, unlocks:['building:harbor'], fx:{ seaTransport:750 } });
  add('clinker_shipbuilding','Clinker Shipbuilding','🛶','seafaring',[300,850],[500,850],['mortise_tenon_shipbuilding'],
    'Overlapping planks make light, flexible hulls suited to northern seas.',
    { leaders:['nordic','latin','slavic','baltic_finnic'], unlocks:['rule:clinker_hulls'], fx:{ trade:0.005, seaTransport:1000 } });
  add('lateen_sail','Lateen Sail','⛵','seafaring',[200,850],[500,850],['square_sail'],
    'A fore-and-aft triangular sail improves control across variable winds.',
    { leaders:['byzantine','islamic','northeast_african'], unlocks:['rule:lateen_rig'], fx:{ seaMovement:0.015, seaTransport:1000 } });
  add('dhow_construction','Dhow Construction','⛵','seafaring',[400,950],[600,940],['lateen_sail'],
    'Sewn and later fastened ocean-going hulls serve monsoon trade routes.',
    { leaders:['islamic','persianate','northeast_african'], unlocks:['rule:dhow_routes'], fx:{ trade:0.015, seaTransport:1500 } });
  add('longships','Longships','🛶','seafaring',[650,1000],[730,990],['clinker_shipbuilding','square_sail'],
    'Shallow, double-ended hulls combine oars, sail, speed, and beach landings.',
    { leaders:['nordic','baltic_finnic'], unlocks:['rule:longships'], fx:{ seaMovement:0.02, seaTransport:1500 } });
  add('knarrs','Ocean-Going Knarrs','⛵','seafaring',[750,1050],[830,1040],['clinker_shipbuilding','square_sail'],
    'Deep-bellied sailing ships carry cargo and livestock across northern oceans.',
    { leaders:['nordic','latin'], unlocks:['enterprise:fishing_boat_business','rule:knarr_trade'], fx:{ trade:0.015, seaTransport:1500 } });
  add('celestial_navigation','Celestial Navigation','🌟','seafaring',[700,1100],[850,1120],['astronomical_observation','coastal_piloting'],
    'Observed stars and solar height extend direction finding beyond sight of land.',
    { leaders:['islamic','nordic','byzantine'], unlocks:['rule:celestial_navigation'], fx:{ seaMovement:0.015 } });
  add('naval_logbooks','Sailing Directions','📖','seafaring',[850,1200],[1000,1230],['scriptoria','coastal_piloting'],
    'Written routes preserve distances, hazards, winds, and harbor approaches.',
    { leaders:['islamic','byzantine','latin'], unlocks:['rule:sailing_directions'], fx:{ seaMovement:0.01 } });
  add('convoy_systems','Merchant Convoys','🛡','seafaring',[850,1200],[1010,1230],['merchant_guilds','naval_levies'],
    'Scheduled group sailings share protection and information.',
    { leaders:['byzantine','islamic','latin'], unlocks:['rule:merchant_convoys'], fx:{ trade:0.015, seaTransport:8000 } });
  add('sternpost_rudder','Sternpost Rudder','⛵','seafaring',[1050,1250],[1150,1280],['clinker_shipbuilding'],
    'A centerline hinged rudder controls larger sailing ships from the stern.',
    { leaders:['latin','islamic'], unlocks:['rule:sternpost_rudder'], fx:{ seaMovement:0.02 } });
  add('mariners_compass','Mariner’s Compass','🧭','seafaring',[1050,1250],[1160,1280],['celestial_navigation'],
    'A magnetized direction indicator gives a heading in cloud or poor visibility.',
    { leaders:['islamic','latin'], unlocks:['rule:mariners_compass'], fx:{ seaMovement:0.02 }, confidence:'medium', sources:['UNGER','NEEDHAM'] });
  add('portolan_charts','Portolan Charts','🗺','seafaring',[1200,1320],[1270,1380],['naval_logbooks','mariners_compass'],
    'Coastline charts and rhumb networks turn accumulated sailing directions into a graphic tool.',
    { leaders:['latin','islamic'], unlocks:['rule:portolan_charts'], fx:{ seaMovement:0.02 }, confidence:'medium', sources:['UNGER','CAMPBELL'] });
  add('dry_docks','Graving Docks','⚓','seafaring',[900,1250],[1070,1280],['harbor_works','stone_bridgebuilding'],
    'Drainable basins expose hulls for inspection and major repair.',
    { leaders:['byzantine','islamic','latin'], unlocks:['rule:dry_docks','building:arsenal'], fx:{ seaMovement:0.01 } });
})();
