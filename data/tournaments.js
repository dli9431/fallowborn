/* Scheduled gatherings. Numeric terms are underlying gold, not display money. */
window.FBDATA = window.FBDATA || {};
FBDATA.tournaments = {
  duration:7, noticeMin:60, noticeMax:180, spacing:360, worldCap:64,
  summaryCap:32, contactCap:8, participantCap:48, servicePremium:2,
  scales:{
    local:{ name:'Local games', tier:3, minimum:500, multiplier:2, difficulty:3, prestige:8 },
    regional:{ name:'Regional games', tier:4, minimum:2500, multiplier:4, difficulty:5, prestige:18 },
    grand:{ name:'Grand games', tier:6, minimum:10000, multiplier:8, difficulty:7, prestige:35 }
  },
  programmes:{
    martial:{ name:'Martial games', headline:'melee' },
    mounted:{ name:'Mounted martial games', headline:'melee' },
    lists:{ name:'Tournament lists', headline:'joust', yearMin:1100, requiresTech:'cavalry_lances' }
  },
  tracks:{
    joust:{ name:'Jousting', contest:true, elite:true, male:true, skill:'mar', injury:0.12, severe:0.008 },
    melee:{ name:'Team melee', contest:true, elite:true, male:true, skill:'mar', injury:0.09, severe:0.005 },
    archery:{ name:'Open archery', contest:true, male:true, skill:'mar', injury:0.015, severe:0.001 },
    wrestling:{ name:'Open wrestling', contest:true, male:true, skill:'mar', injury:0.07, severe:0.003 },
    perform:{ name:'Performing', contest:true, skill:'dip', injury:0, severe:0 },
    trade:{ name:'Market trading', skill:'ste', career:'merchant' },
    carrying:{ name:'Carrying and setting tables', skill:'ste', wage:1.2 },
    kitchens:{ name:'Kitchen service', skill:'ste', wage:1.2 },
    stables:{ name:'Stable work', skill:'mar', wage:1.5 },
    repairs:{ name:'Repairs', skill:'ste', career:'craftsman', wage:1.8 },
    guarding:{ name:'Guard duty', skill:'mar', career:'soldier', male:true, wage:1.5 },
    treatment:{ name:'Treatment', skill:'lea', career:'physician', wage:1.5 },
    watch:{ name:'Spectating and company', skill:'dip' }
  },
  tactics:{
    conservative:{ name:'Conservative', power:-1, fatigue:1, risk:0.55 },
    balanced:{ name:'Balanced', power:0, fatigue:2, risk:1 },
    aggressive:{ name:'Aggressive', power:2, fatigue:4, risk:1.8 },
    assist:{ name:'Assist a teammate', power:-1, fatigue:2, risk:0.7 }
  }
};

/* Behaviour is separate from presentation so older complete content records
   and their fingerprints retain their meaning. New ids supply both records. */
FBDATA.tournamentRules = {
  legacyProgrammeCapability:'couched_lance', defaultTactic:'balanced', unattendedTactic:'conservative', defaultScale:'local', spectatorTrack:'watch',
  scales:{
    local:{ capacityBand:0, venueKinds:[], serviceCommission:0, aiPriority:0 },
    regional:{ capacityBand:1, venueKinds:['town','city'], serviceCommission:2, aiPriority:10 },
    grand:{ capacityBand:2, venueKinds:['city'], serviceCommission:4, aiPriority:20 }
  },
  programmes:{
    martial:{ contests:['melee','archery','wrestling','perform'], priority:10 },
    mounted:{ contests:['melee','archery','wrestling','perform'], priority:30,
      faithTraditions:['furusiyya'], cultureTraditions:['steppe'] },
    lists:{ contests:['joust','archery','wrestling','perform'], priority:20, capability:'couched_lance' }
  },
  tracks:{
    joust:{ resolution:'duel', prize:'headline', capability:'couched_lance', loseForfeit:true },
    melee:{ resolution:'team', prize:'headline' },
    archery:{ resolution:'score', prize:'archery', serf:true, openVictory:true },
    wrestling:{ resolution:'duel', prize:'wrestling', serf:true, openVictory:true },
    perform:{ resolution:'score', prize:'perform', averageSkills:['dip','lea'] },
    trade:{ stake:10 },
    carrying:{ serf:true }, kitchens:{ serf:true }, stables:{ serf:true },
    repairs:{ serf:true }, guarding:{ serf:true }, treatment:{ serf:true }, watch:{ serf:true }
  },
  tactics:{
    conservative:{}, balanced:{}, aggressive:{}, assist:{ resolutions:['team'], teamPower:2 }
  }
};
