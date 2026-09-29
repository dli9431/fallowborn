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
    lists:{ name:'Tournament lists', headline:'joust', requiresTech:'cavalry_lances' }
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
